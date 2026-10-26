/**
 * Dicționarul codurilor controlerului (ADR 0085): numerele fiecărei familii exact cât sursele firmware-ului (listele de aici
 * sunt scrise din fișierele citate, nu din tabel), alarmele critice cu repornirea, poziția pierdută acolo unde sursele o spun,
 * textele în ambele limbi, generatorul și fișierul citit de panou, căutarea codului, familia din banner.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esteDictionarCoduri, explicaCod, FAMILII_CODURI, type FamilieCoduri } from '../../shared/coduri.ts';
import { dictionarCoduri, genereazaCodurile } from '../../scripts/coduri.ts';
import { cuTitlu, deblocareCuConfirmare, explica, titluCod } from '../../src/app/explicaCod.ts';
import { TABELE } from '../../src/machine/coduri/tabel.ts';
import { textCoduriEn } from '../../src/machine/coduri/texte.en.ts';
import { textCoduriRo } from '../../src/machine/coduri/texte.ro.ts';
import { citesteRaspuns, familieDinLinie } from '../../src/machine/raspunsuri.ts';
import { ID_CONTRACTE } from '../../src/post/contracte/index.ts';

const de = (a: number, b: number): number[] => Array.from({ length: b - a + 1 }, (_, k) => a + k);
const chei = (t: Readonly<Record<number, unknown>>): number[] => Object.keys(t).map(Number).sort((a, b) => a - b);

/** Din surse: GRBL `doc/csv/*_codes_en_US.csv` (gnea/grbl @ bfb67f0); grblHAL `errors.h`, `alarms.h` (@ 4ec1ae4); FluidNC `Error.h`, `Alarm.h` (@ c82d217). */
const SURSE: Readonly<Record<FamilieCoduri, { readonly erori: readonly number[]; readonly alarme: readonly number[] }>> = {
  'grbl-11': { erori: [...de(1, 17), ...de(20, 38)], alarme: de(1, 10) },
  grblhal: { erori: [...de(1, 58), ...de(60, 66), ...de(70, 92), 253], alarme: de(1, 22) },
  fluidnc: {
    erori: [...de(1, 40), ...de(60, 70), ...de(80, 83), 90, 100, 101, ...de(110, 115), 120, 130, ...de(150, 152), ...de(160, 162), ...de(170, 182)],
    alarme: de(1, 18),
  },
};
/** Alarmele critice („Reset to continue”): GRBL `protocol.c`, grblHAL `alarm_is_critical`, FluidNC `protocol_do_alarm`. */
const CRITICE: Readonly<Record<FamilieCoduri, readonly number[]>> = { 'grbl-11': [1, 2], grblhal: [1, 2, 10, 17, 20], fluidnc: [1, 2, 13] };

test('familiile dicționarului sunt contractele postului', () => {
  assert.deepEqual([...FAMILII_CODURI].sort(), [...ID_CONTRACTE].sort());
});

for (const f of FAMILII_CODURI) {
  test(`${f}: exact numerele din sursele firmware-ului`, () => {
    assert.deepEqual(chei(TABELE[f].erori), SURSE[f].erori);
    assert.deepEqual(chei(TABELE[f].alarme), SURSE[f].alarme);
  });

  test(`${f}: toate alarmele opresc; repornirea e oferită exact la alarmele critice`, () => {
    for (const [n, a] of Object.entries(TABELE[f].alarme)) assert.equal(a.gravitate, 'oprit', `ALARM:${n}`);
    const cuRepornire = chei(TABELE[f].alarme).filter((n) => TABELE[f].alarme[n]?.actiuni?.includes('repornire'));
    assert.deepEqual(cuRepornire, CRITICE[f]);
  });
}

test('GRBL 1.1: error:18 și error:19 nu există; ALARM:10 e axa dublă, alt înțeles la grblHAL (urgența) și FluidNC (axul)', () => {
  assert.equal(TABELE['grbl-11'].erori[18], undefined);
  assert.equal(TABELE['grbl-11'].erori[19], undefined);
  assert.equal(TABELE['grbl-11'].alarme[10]?.text, 'a10');
  assert.equal(TABELE.grblhal.alarme[10]?.text, 'hal.a10');
  assert.equal(TABELE.fluidnc.alarme[10]?.text, 'fnc.a10');
  // Al doilea limitator al pătrării automate e la grblHAL alarma 15: același înțeles, același text.
  assert.equal(TABELE.grblhal.alarme[15]?.text, 'a10');
});

test('poziția: pierdută la limita hard, la repornirea în mișcare și la homing; păstrată la limita soft și la palpare', () => {
  for (const f of FAMILII_CODURI) {
    const a = TABELE[f].alarme;
    for (const n of [1, 3, 6, 7, 8, 9]) assert.equal(a[n]?.pozitiePierduta, true, `${f} ALARM:${n}`);
    for (const n of [2, 4, 5]) assert.equal(a[n]?.pozitiePierduta, undefined, `${f} ALARM:${n}`);
  }
  // Erorile nu pierd poziția: linia n-a plecat.
  for (const f of FAMILII_CODURI) for (const e of Object.values(TABELE[f].erori)) assert.equal(e.pozitiePierduta, undefined);
});

test('erorile care blochează controlerul: GRBL 9 (alarmă / jog) și 13 (ușa); restul refuză doar linia', () => {
  const oprite = chei(TABELE['grbl-11'].erori).filter((n) => TABELE['grbl-11'].erori[n]?.gravitate === 'oprit');
  assert.deepEqual(oprite, [9, 13]);
});

test('FluidNC: $H fără homing e error:5, linia peste 127 de caractere e error:14 (alt înțeles decât la GRBL)', () => {
  assert.equal(TABELE.fluidnc.erori[5]?.text, 'homing-neconfigurat');
  assert.equal(TABELE.fluidnc.erori[14]?.text, 'e11');
  assert.equal(TABELE['grbl-11'].erori[14]?.text, 'e14');
});

test('textele: în ambele limbi, traduse (româna diferă de engleză), titluri scurte, fără locuri goale', () => {
  for (const [k, en] of Object.entries(textCoduriEn)) {
    const ro = textCoduriRo[k as keyof typeof textCoduriEn];
    for (const parte of ['titlu', 'ce', 'faci'] as const) {
      assert.ok(en[parte].trim().length > 0 && ro[parte].trim().length > 0, `${k}.${parte}`);
      assert.notEqual(ro[parte], en[parte], `${k}.${parte} netradus`);
      assert.doesNotMatch(`${en[parte]} ${ro[parte]}`, /\{[a-z]+\}/, `${k}.${parte}: un loc de parametru`);
    }
    assert.ok(en.titlu.length <= 48 && ro.titlu.length <= 48, `${k}: titlul are ${en.titlu.length} / ${ro.titlu.length} caractere`);
  }
});

test('generatorul: ambele limbi au aceleași tabele, forma citită de panou și doar textele folosite', () => {
  const ro = dictionarCoduri('ro'), en = dictionarCoduri('en');
  assert.ok(esteDictionarCoduri(ro) && esteDictionarCoduri(en));
  assert.deepEqual(ro.familii, en.familii);
  assert.deepEqual(Object.keys(ro.texte).sort(), Object.keys(textCoduriEn).sort());
  const fisiere = genereazaCodurile();
  assert.deepEqual([...fisiere.keys()], ['coduri/ro.json', 'coduri/en.json']);
  for (const [, text] of fisiere) assert.ok(esteDictionarCoduri(JSON.parse(text)));
});

test('generatorul refuză un text pe care nicio intrare nu-l folosește și o intrare fără text', () => {
  assert.throws(() => dictionarCoduri('ro', { ...textCoduriRo, 'e99': { titlu: 'x', ce: 'x', faci: 'x' } }), /nicio intrare nu le folosește: e99/);
  const { a1: _, ...faraA1 } = textCoduriRo;
  assert.throws(() => dictionarCoduri('ro', faraA1), /nu are forma/);
});

test('forma: un fișier trunchiat, o cheie de text lipsă, o acțiune necunoscută sau o familie lipsă nu trec', () => {
  const d = JSON.parse(JSON.stringify(dictionarCoduri('ro'))) as Record<string, unknown> & { familii: Record<string, { alarme: Record<string, Record<string, unknown>> }>; texte: Record<string, unknown> };
  const strica = (f: (x: typeof d) => void): boolean => { const x = JSON.parse(JSON.stringify(d)) as typeof d; f(x); return esteDictionarCoduri(x); };
  assert.equal(strica(() => undefined), true);
  assert.equal(strica((x) => { delete x.texte['a1']; }), false);
  assert.equal(strica((x) => { x.familii['grblhal']!.alarme['1']!['actiuni'] = ['homing']; }), false);
  assert.equal(strica((x) => { x.familii['grblhal']!.alarme['1']!['gravitate'] = 'grav'; }), false);
  assert.equal(strica((x) => { x.familii['fluidnc']!.alarme['0'] = { text: 'a1', gravitate: 'oprit' }; }), false);
  assert.equal(strica((x) => { delete x.familii['fluidnc']; }), false);
  assert.equal(strica((x) => { x['schema'] = 2; }), false);
  assert.equal(strica((x) => { delete x['blocare']; }), false);
});

test('căutarea: familia necunoscută = GRBL 1.1 presupus; un cod din afara tabelului n-are explicație', () => {
  const d = dictionarCoduri('ro');
  const p = explicaCod(d, null, 'alarma', 10);
  assert.equal(p.familie, 'grbl-11');
  assert.equal(p.presupus, true);
  assert.equal(p.text?.titlu, textCoduriRo.a10.titlu);
  assert.equal(explicaCod(d, 'grblhal', 'alarma', 10).text?.titlu, textCoduriRo['hal.a10'].titlu);
  const necunoscut = explicaCod(d, 'grbl-11', 'eroare', 18);
  assert.equal(necunoscut.intrare, null);
  assert.equal(necunoscut.text, null);
  assert.equal(explicaCod(d, 'grbl-11', 'eroare', 0).intrare, null);
  // Un nume de proprietate a obiectului nu e un cod.
  assert.equal(explicaCod(d, 'grbl-11', 'eroare', Number('toString')).intrare, null);
});

test('jurnalul și lista: titlul după cod; textul neschimbat fără dicționar sau pentru un cod necunoscut', () => {
  const d = dictionarCoduri('en');
  const st = { familie: null, alarma: null };
  assert.equal(cuTitlu('error:9', d, st), `error:9 — ${textCoduriEn.e9.titlu}`);
  assert.equal(cuTitlu('ALARM:1', d, st), `ALARM:1 — ${textCoduriEn.a1.titlu}`);
  assert.equal(cuTitlu('error:19', d, st), 'error:19');
  assert.equal(cuTitlu('error:19', d, { familie: 'grblhal', alarma: null }), `error:19 — ${textCoduriEn['hal.e19'].titlu}`);
  assert.equal(cuTitlu('ok', d, st), 'ok');
  assert.equal(cuTitlu('error:9', 'lipsa', st), 'error:9');
  assert.equal(titluCod('incarca', st, 'eroare', 9), null);
});

test('blocarea fără cod: intrarea ei, cu Deblochează și poziția nesigură, textul ei și tabelul familiei', () => {
  const d = dictionarCoduri('ro');
  const e = explica(d, { familie: 'fluidnc', alarma: null }, { fel: 'blocare', cod: 0 });
  assert.deepEqual(e.intrare?.actiuni, ['deblocare']);
  assert.equal(e.intrare?.pozitiePierduta, true);
  assert.equal(e.text?.titlu, textCoduriRo.blocare.titlu);
  assert.equal(e.nume, 'FluidNC');
  assert.equal(e.presupus, false);
  assert.equal(explica(d, { familie: null, alarma: null }, { fel: 'blocare', cod: 0 }).presupus, true);
});

test('deblocarea cere confirmarea după o alarmă cu poziția pierdută, după blocare și fără dicționar; nu după palpare', () => {
  const d = dictionarCoduri('ro');
  const cu = (fel: 'alarma' | 'blocare', cod: number, familie: FamilieCoduri | null = null) =>
    deblocareCuConfirmare(d, { familie, alarma: { nr: 1, fel, cod, la: { tip: 'controler' } } });
  assert.equal(deblocareCuConfirmare(d, { familie: null, alarma: null }), false);
  assert.equal(cu('alarma', 1), true);
  assert.equal(cu('alarma', 3), true);
  assert.equal(cu('alarma', 2), false);
  assert.equal(cu('alarma', 4), false);
  assert.equal(cu('alarma', 5), false);
  assert.equal(cu('blocare', 0), true);
  // Un cod necunoscut (fără explicație) e tratat ca pierdut.
  assert.equal(cu('alarma', 99), true);
  assert.equal(deblocareCuConfirmare('lipsa', { familie: null, alarma: { nr: 1, fel: 'alarma', cod: 5, la: { tip: 'controler' } } }), true);
});

test('familia din banner și din $I; bannerul grblHAL e un banner (repornirea se vede)', () => {
  assert.equal(familieDinLinie("Grbl 1.1h ['$' for help]"), 'grbl-11');
  assert.equal(familieDinLinie("GrblHAL 1.1f ['$' or '$HELP' for help]"), 'grblhal');
  assert.equal(familieDinLinie("Grbl 3.9 [FluidNC v3.9.1 (esp32-wifi) '$' for help]"), 'fluidnc');
  assert.equal(familieDinLinie('[VER:3.9 FluidNC v3.9.1 (esp32-wifi) :]'), 'fluidnc');
  assert.equal(familieDinLinie('[FIRMWARE:grblHAL]'), 'grblhal');
  assert.equal(familieDinLinie('[VER:1.1h.20190825:]'), null);
  assert.equal(familieDinLinie('ok'), null);
  assert.equal(citesteRaspuns("GrblHAL 1.1f ['$' or '$HELP' for help]").tip, 'banner');
  assert.equal(citesteRaspuns("Grbl 3.9 [FluidNC v3.9.1 (esp32-wifi) '$' for help]").tip, 'banner');
  assert.equal(citesteRaspuns('GrblHALx 1').tip, 'necunoscut');
});
