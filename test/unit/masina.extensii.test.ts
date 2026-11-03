/**
 * Senderul pentru extensii (ADR 0199 §B), partea pură din fereastra Mașina, pe stări de sesiune scrise de mână:
 * - starea pe care o vede o extensie: legătura, faza, indicatorul (fără culoare și buton), programul cu numele lui; nimic din
 *   poziție, jurnal sau setări;
 * - pornirea: contul, legătura, programul, faza (aceeași judecată ca evenimentul `start` din flux);
 * - reluarea: din Hold, eliberarea; după o eroare, reluarea; o barieră (M0, M1, M6) și alarma rămân în fereastra Mașina;
 * - pauza: doar cât rulează (nu în Hold, nici la ușă);
 * - învelișul, peste o sesiune falsă cu fluxul adevărat: încărcarea ca „Fișier…”, pornirea și reluarea cu întrebarea omului,
 *   legată de programul și de starea arătate, o singură întrebare odată, anularea, pauza, oprirea.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fluxNou, pas, refuzStart, type Eveniment, type Faza, type StareFlux } from '../../src/machine/flux.ts';
import type { ProgramIncarcat } from '../../src/machine/program.ts';
import type { Raport, StareMasina } from '../../src/machine/raspunsuri.ts';
import type { CodControler, StareSesiune } from '../../src/machine/sesiune.ts';
import type { CerereConfirmare } from '../../src/app/ConfirmareMasina.tsx';
import { invelisMasina, pauzaPosibila, refuzPornire, reluarea, stareMasina, type FereastraInvelis, type SesiuneInvelis } from '../../src/app/masinaExtensii.ts';

const program = (n: number): ProgramIncarcat => ({ octeti: new Uint8Array(), sha256: 'ab'.repeat(32), linii: Array.from({ length: n }, (_, index) => ({ index, text: 'G1 X1', cost: 6, bariera: null })), wcs: 'G54' });
const raport = (stare: StareMasina): Raport => ({ stare, sub: null, pozitie: { cadru: 'masina', valori: [1, 2, 3] }, wco: null, buffer: null, avans: null, turatie: null, override: null });

function sesiune(flux: Partial<StareFlux>, alte: Partial<StareSesiune> = {}): StareSesiune {
  return {
    conexiune: 'conectat', transport: 'simulat', flux: { ...fluxNou(), ...flux }, jurnal: [{ fel: 'trimis', text: 'G0 X1' }], eroare: null,
    wcsActiv: 'G54', procedura: null, familie: null, cod: null, alarma: null, repornire: false, ...alte,
  };
}
const alarma = (cod: number): CodControler => ({ nr: 1, fel: 'alarma', cod, la: { tip: 'controler' } });
const lucrare = (faza: Faza, stare: StareMasina = 'Run', urm = 30): Partial<StareFlux> => ({ faza, program: program(100), urm, raport: raport(stare) });

test('starea pentru extensie: legătura, faza, indicatorul fără culoare și buton, programul cu numele; fără poziție și jurnal', () => {
  assert.deepEqual(stareMasina(sesiune({}, { conexiune: 'deconectat', transport: null }), null),
    { conectata: false, faza: 'liber', indicator: null, program: null });
  assert.deepEqual(stareMasina(sesiune(lucrare('trimite')), 'placa_1_T1.nc'), {
    conectata: true, faza: 'trimite', indicator: { fel: 'ruleaza', procent: 30, linie: null, cod: null },
    program: { nume: 'placa_1_T1.nc', sha256: 'ab'.repeat(32), linii: 100 },
  });
  assert.deepEqual(stareMasina(sesiune({ ...lucrare('bariera'), bariera: { linie: 41, m6: false, ultima: 41, ax: 'oprit' } }), null).indicator,
    { fel: 'oprita', procent: 30, linie: 42, cod: null });
  const cuAlarma = stareMasina(sesiune(lucrare('pregatit', 'Alarm'), { alarma: alarma(2) }), 'a.nc');
  assert.deepEqual(cuAlarma.indicator, { fel: 'alarma', procent: 30, linie: null, cod: 2 });
  // Doar câmpurile astea: poziția, jurnalul, WCS-ul, transportul nu ajung la extensie.
  assert.deepEqual(Object.keys(cuAlarma).sort(), ['conectata', 'faza', 'indicator', 'program']);
  assert.doesNotMatch(JSON.stringify(cuAlarma), /G0 X1|G54|simulat|valori/);
});

test('pornirea: contul, legătura, programul și faza, ca evenimentul start din flux', () => {
  const gata = sesiune({ faza: 'pregatit', program: program(10), raport: raport('Idle') });
  assert.equal(refuzPornire(gata, true), null);
  assert.equal(refuzPornire(gata, false), 'fara-capabilitate');
  assert.equal(refuzPornire({ ...gata, conexiune: 'deconectat' }, true), 'neconectat');
  assert.equal(refuzPornire(sesiune({ faza: 'liber' }), true), 'fara-program');
  for (const faza of ['terminat', 'pierdut'] as const) assert.equal(refuzPornire(sesiune({ faza, program: program(10) }), true), null, faza);
  for (const faza of ['trimite', 'golire', 'terminare', 'suspendat', 'bariera'] as const) {
    assert.equal(refuzPornire(sesiune({ faza, program: program(10) }), true), 'faza', faza);
  }
  assert.equal(refuzPornire(sesiune({ faza: 'pregatit', program: program(10), coada: [{ id: 'om-1', text: '$G' }] }), true), 'faza');
  // Aceeași judecată ca fluxul: unde refuzStart spune null, evenimentul start nu e refuzat (și trimiterea pleacă).
  for (const s of [gata.flux, sesiune({ faza: 'terminat', program: program(3) }).flux, sesiune({ faza: 'bariera', program: program(3) }).flux]) {
    const r = pas(s, { tip: 'start' });
    assert.equal(!r.actiuni.some((a) => a.tip === 'refuz'), refuzStart(s) === null, s.faza);
    assert.equal(r.stare.faza !== s.faza, refuzStart(s) === null, s.faza);
  }
});

test('reluarea: din Hold, eliberarea; după o eroare, reluarea; bariera și alarma rămân în fereastra Mașina', () => {
  assert.deepEqual(reluarea(sesiune(lucrare('trimite', 'Hold'))), { ok: true, eveniment: 'eliberare' });
  assert.deepEqual(reluarea(sesiune({ ...lucrare('suspendat', 'Idle') })), { ok: true, eveniment: 'reia' });
  assert.deepEqual(reluarea(sesiune({ ...lucrare('bariera', 'Idle'), bariera: { linie: 5, m6: true, ultima: 5, ax: 'oprit' } })), { ok: false, cod: 'bariera' });
  assert.deepEqual(reluarea(sesiune(lucrare('suspendat', 'Alarm'), { alarma: alarma(1) })), { ok: false, cod: 'alarma' });
  assert.deepEqual(reluarea(sesiune(lucrare('trimite'))), { ok: false, cod: 'nimic' });
  assert.deepEqual(reluarea(sesiune(lucrare('trimite', 'Door'))), { ok: false, cod: 'nimic' });
  assert.deepEqual(reluarea(sesiune(lucrare('trimite', 'Hold'), { conexiune: 'deconectat' })), { ok: false, cod: 'neconectat' });
});

test('pauza: doar cât rulează; în Hold, la ușă sau fără lucrare, nimic de pus pe pauză', () => {
  for (const faza of ['trimite', 'golire', 'terminare'] as const) assert.equal(pauzaPosibila(sesiune(lucrare(faza))), null, faza);
  assert.equal(pauzaPosibila(sesiune(lucrare('trimite', 'Hold'))), 'nimic');
  assert.equal(pauzaPosibila(sesiune(lucrare('trimite', 'Door'))), 'nimic');
  assert.equal(pauzaPosibila(sesiune({ faza: 'pregatit', program: program(3), raport: raport('Idle') })), 'nimic');
  assert.equal(pauzaPosibila(sesiune(lucrare('trimite'), { conexiune: 'deconectat' })), 'neconectat');
});

/** O sesiune falsă: fluxul adevărat (`pas`), fără port; felurile evenimentelor, ținute. */
function sesiuneFalsa(st0: StareSesiune) {
  let st = st0;
  const evenimente: string[] = [];
  const s: SesiuneInvelis = {
    stare: () => st,
    aboneaza: () => () => {},
    eveniment: (e: Eveniment) => { evenimente.push(e.tip); st = { ...st, flux: pas(st.flux, e).stare }; },
  };
  return { s, evenimente, pune: (x: Partial<StareSesiune>) => { st = { ...st, ...x }; } };
}
/** O fereastră falsă: numele, contul, confirmările arătate, programele încărcate, avertismentul WiFi. */
function fereastraFalsa() {
  const f = { nume: 'a.nc' as string | null, permis: true, confirmari: [] as (CerereConfirmare | null)[], incarcate: [] as string[][], avertizat: 0 };
  const fi: FereastraInvelis = {
    nume: () => f.nume,
    permis: () => f.permis,
    confirmare: (c) => { f.confirmari.push(c); },
    incarcat: (n, e) => { f.incarcate.push([n, e]); f.nume = n; },
    avertizat: () => { f.avertizat += 1; },
  };
  return { f, fi };
}
const octeti = (t: string): Uint8Array => new TextEncoder().encode(t);
/** Un răspuns care trebuie să vină pe loc: o întrebare arătată greșit (fără răspuns încă) pică proba într-o secundă. */
const peLoc = <T>(p: Promise<T>): Promise<T> => Promise.race([p, new Promise<never>((_, nu) => { setTimeout(() => { nu(new Error('fără răspuns: o întrebare așteaptă omul')); }, 1000); })]);
const ultima = (f: { readonly confirmari: readonly (CerereConfirmare | null)[] }): CerereConfirmare => {
  const c = f.confirmari.at(-1);
  assert.ok(c, 'o confirmare arătată');
  return c;
};

test('învelișul: încărcarea ca „Fișier…”; refuzată cât o lucrare e pornită sau o confirmare așteaptă', async () => {
  const { s, evenimente, pune } = sesiuneFalsa(sesiune({ faza: 'liber', raport: raport('Idle') }));
  const { f, fi } = fereastraFalsa();
  const m = invelisMasina(s, fi);
  assert.deepEqual(await m.incarca('rau.nc', octeti('G0 X1\n'), 'Proba'), { ok: false, cod: 'program:fara-wcs:1' });
  assert.deepEqual(await m.incarca('m6.nc', octeti('G54\nT2 M6\nG0 X1\n'), 'Proba'), { ok: false, cod: 'program:m6-strain:2' });
  assert.deepEqual(evenimente, []);
  const r = await m.incarca('bun.nc', octeti('G21\nG54\nG0 X1\nM2\n'), 'Proba');
  assert.ok(r.ok);
  assert.equal((r.rezultat as { readonly linii: number }).linii, 4);
  assert.deepEqual([evenimente, f.incarcate, s.stare().flux.faza], [['incarca'], [['bun.nc', 'Proba']], 'pregatit']);
  assert.equal(m.stare().program?.nume, 'bun.nc');
  pune({ flux: { ...s.stare().flux, faza: 'trimite' } });
  assert.deepEqual(await m.incarca('alt.nc', octeti('G54\nG0 X1\n'), 'Proba'), { ok: false, cod: 'in-lucru' });
  pune({ flux: { ...s.stare().flux, faza: 'pregatit' } });
  const p = m.porneste('Proba');
  assert.deepEqual(await m.incarca('alt.nc', octeti('G54\nG0 X1\n'), 'Proba'), { ok: false, cod: 'ocupat' });
  ultima(f).raspunde(false);
  assert.deepEqual(await p, { ok: false, cod: 'renuntat' });
  assert.equal(f.incarcate.length, 1);
});

test('învelișul: pornirea întreabă omul; „Nu”, „Da”, alt program între timp, contul, WiFi, o singură întrebare', async () => {
  const { s, evenimente, pune } = sesiuneFalsa(sesiune({ faza: 'pregatit', program: program(10), raport: raport('Idle') }));
  const { f, fi } = fereastraFalsa();
  const m = invelisMasina(s, fi);
  // Judecățile butonului vin întâi: fără legătură, nicio întrebare.
  pune({ conexiune: 'deconectat' });
  assert.deepEqual(await peLoc(m.porneste('Proba')), { ok: false, cod: 'neconectat' });
  assert.deepEqual(f.confirmari, []);
  pune({ conexiune: 'conectat' });

  const nu = m.porneste('Proba');
  const c = ultima(f);
  assert.deepEqual([c.fel, c.extensie, c.nume, c.eveniment, c.program === s.stare().flux.program, c.wifi], ['porneste', 'Proba', 'a.nc', 'start', true, false]);
  assert.deepEqual(await peLoc(m.porneste('Proba')), { ok: false, cod: 'ocupat' });
  c.raspunde(false);
  // Un al doilea răspuns la aceeași întrebare nu mai face nimic.
  c.raspunde(true);
  assert.deepEqual(await nu, { ok: false, cod: 'renuntat' });
  assert.equal(f.confirmari.at(-1), null);
  assert.deepEqual(evenimente, []);

  // Alt program încărcat cât așteaptă: confirmarea nu-l pornește.
  const schimbat = m.porneste('Proba');
  pune({ flux: { ...s.stare().flux, program: program(10) } });
  ultima(f).raspunde(true);
  assert.deepEqual(await schimbat, { ok: false, cod: 'schimbat' });
  // Contul care nu mai permite pornirea, între întrebare și răspuns.
  const cont = m.porneste('Proba');
  f.permis = false;
  ultima(f).raspunde(true);
  assert.deepEqual(await cont, { ok: false, cod: 'fara-capabilitate' });
  f.permis = true;
  assert.deepEqual(evenimente, []);

  pune({ transport: 'retea' });
  const da = m.porneste('Proba');
  assert.equal(ultima(f).wifi, true);
  ultima(f).raspunde(true);
  assert.deepEqual(await da, { ok: true, rezultat: null });
  assert.deepEqual([evenimente, f.avertizat], [['start'], 1]);
  assert.ok(['trimite', 'golire', 'terminare'].includes(s.stare().flux.faza));
});

test('învelișul: reluarea întreabă și ea; o stare schimbată între timp, refuzată; bariera fără întrebare; anularea', async () => {
  const { s, evenimente, pune } = sesiuneFalsa(sesiune(lucrare('trimite', 'Hold')));
  const { f, fi } = fereastraFalsa();
  const m = invelisMasina(s, fi);
  const hold = m.reia('Proba');
  assert.deepEqual([ultima(f).fel, ultima(f).eveniment], ['reia', 'eliberare']);
  ultima(f).raspunde(true);
  assert.deepEqual([await hold, evenimente], [{ ok: true, rezultat: null }, ['eliberare']]);

  // Din pauză în eroare, cât aștepta: reluarea arătată nu mai e cea de acum.
  const schimbata = m.reia('Proba');
  pune({ flux: { ...s.stare().flux, faza: 'suspendat', raport: raport('Idle') } });
  ultima(f).raspunde(true);
  assert.deepEqual(await schimbata, { ok: false, cod: 'schimbat' });
  const eroare = m.reia('Proba');
  // Linia de la care continuă: prima netrimisă (eliberarea de mai sus a mai trimis linii, cât a încăput în buffer).
  assert.deepEqual([ultima(f).eveniment, ultima(f).linie], ['reia', s.stare().flux.urm + 1]);
  assert.ok(s.stare().flux.urm > 30);
  ultima(f).raspunde(true);
  assert.deepEqual([await eroare, evenimente.at(-1)], [{ ok: true, rezultat: null }, 'reia']);

  pune({ flux: { ...s.stare().flux, faza: 'bariera', bariera: { linie: 5, m6: false, ultima: 5, ax: 'oprit' }, raport: raport('Idle') } });
  const n = f.confirmari.length;
  assert.deepEqual(await peLoc(m.reia('Proba')), { ok: false, cod: 'bariera' });
  assert.equal(f.confirmari.length, n);

  // Anularea: doar a extensiei care a cerut; fără nume, oricare (fereastra Mașina se demontează).
  pune({ flux: { ...s.stare().flux, faza: 'trimite', bariera: null, raport: raport('Hold') } });
  const a = m.reia('Proba');
  m.anuleaza('Alta');
  assert.notEqual(f.confirmari.at(-1), null);
  m.anuleaza('Proba');
  assert.deepEqual(await a, { ok: false, cod: 'renuntat' });
  const b = m.reia('Proba');
  m.anuleaza();
  assert.deepEqual(await b, { ok: false, cod: 'renuntat' });
});

test('învelișul: pauza doar cât rulează, oprirea cât e conectată, direct', () => {
  const { s, evenimente, pune } = sesiuneFalsa(sesiune(lucrare('trimite')));
  const { fi } = fereastraFalsa();
  const m = invelisMasina(s, fi);
  assert.deepEqual(m.pauza(), { ok: true, rezultat: null });
  pune({ flux: { ...s.stare().flux, raport: raport('Hold') } });
  assert.deepEqual(m.pauza(), { ok: false, cod: 'nimic' });
  assert.deepEqual(m.opreste(), { ok: true, rezultat: null });
  pune({ conexiune: 'deconectat' });
  assert.deepEqual(m.opreste(), { ok: false, cod: 'neconectat' });
  assert.deepEqual(evenimente, ['hold', 'opreste']);
});
