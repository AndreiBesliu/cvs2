import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lotDin, SETARI_UTILIZARE_IMPLICITE, setariPublice, type ContextLot, type SetariPublice, type Sursa } from '../../shared/utilizare.ts';
import { preiaUtilizarea, sursaDin, utilizarea } from '../../src/app/utilizare.ts';
import {
  CHEIE_LOTURI_UTILIZARE, CHEIE_SETARI_UTILIZARE, contextDinMediu, creeazaInregistrator, creeazaPompa, EVENIMENTE_IN_ASTEPTARE,
  idSesiune, PAUZA_GEST_MS, type DepsInregistrator, type RezultatPompa,
} from '../../src/app/utilizareLot.ts';
import { trimiteCoada } from '../../src/app/utilizareTrimitere.ts';
import { creeazaRegistru, observaRularile, ruleaza } from '../../src/ui/actiuni.ts';

/**
 * Înregistratorul utilizării, partea din pornire (ADR 0262, felia A.8b): evenimentele cu sursa gestului, repetările numărate,
 * inelul pașilor dinaintea unei erori, lotul strâns doar cu colectarea pornită și cu un cont, loturile din browser cu contul
 * lor (cele mai vechi pleacă întâi peste plafon), setările aflate de la server, sursa unui gest, contextul în trepte și pompa
 * care trimite (pe rând, oprită pentru sesiune la un refuz).
 */

const CONTEXT: ContextLot = { versiune: 'ed4c30c777de', limba: 'ro', aranjament: 'modern', tema: 'deschisa', ecran: 'laptop', browser: 'edge', atingere: false, online: true };

function depozit(initial: Record<string, string> = {}) {
  const m = new Map(Object.entries(initial));
  return {
    m,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, v); },
    removeItem: (k: string) => { m.delete(k); },
  };
}

function mediu(extra: Partial<DepsInregistrator> & { setari?: Partial<SetariPublice> } = {}) {
  let ceas = 1_000;
  let sursa: Sursa = 'bara';
  let cont: string | null = 'ana';
  const d = depozit(extra.setari ? { [CHEIE_SETARI_UTILIZARE]: JSON.stringify({ ...setariPublice(SETARI_UTILIZARE_IMPLICITE), ...extra.setari }) } : {});
  let pline = 0;
  const ins = creeazaInregistrator({
    ceas: () => ceas, sesiune: 'k3j9x0a1b2c3d4e5', depozit: d, context: () => CONTEXT, cont: () => cont, sursa: () => sursa,
    laLotPlin: () => { pline++; }, ...extra,
  });
  return {
    ins, d,
    treci: (ms: number) => { ceas += ms; },
    sursa: (s: Sursa) => { sursa = s; },
    cont: (c: string | null) => { cont = c; },
    pline: () => pline,
  };
}

test('evenimentele: timpul sesiunii, sursa gestului; o acțiune repetată la rând se numără în aceeași, până la o pauză de 2 s', () => {
  const m = mediu();
  m.ins.actiune('document.roteste', 'ok');
  m.treci(500);
  m.ins.actiune('document.roteste', 'ok');
  m.treci(1_900);
  m.ins.actiune('document.roteste', 'ok');
  m.treci(2_001);
  m.ins.actiune('document.roteste', 'ok');
  m.sursa('tasta');
  m.ins.actiune('document.roteste', 'ok');
  m.ins.actiune('document.roteste', 'motiv.nimic-ales');
  m.ins.unealta('dreptunghi');
  m.ins.fereastra('masina');
  assert.deepEqual(m.ins.pasi(), [
    { fel: 'actiune', t: 1_000, id: 'document.roteste', de: 'bara', rez: 'ok', n: 3 },
    { fel: 'actiune', t: 5_401, id: 'document.roteste', de: 'bara', rez: 'ok' },
    { fel: 'actiune', t: 5_401, id: 'document.roteste', de: 'tasta', rez: 'ok' },
    { fel: 'actiune', t: 5_401, id: 'document.roteste', de: 'tasta', rez: 'motiv.nimic-ales' },
    { fel: 'unealta', t: 5_401, id: 'dreptunghi', de: 'tasta' },
    { fel: 'fereastra', t: 5_401, id: 'masina' },
  ]);
});

test('clicurile fine: repetate la rând, numărate într-unul; derularea și zoom-ul, treptele unui gest adunate, până la o pauză', () => {
  const m = mediu();
  const clic = { fel: 'clic', id: 'testid.export-gcode', de: 'bara' } as const;
  m.ins.primeste({ ...clic, t: 1_000 });
  m.treci(1_500);
  m.ins.primeste({ ...clic, t: 2_500 });
  m.ins.primeste({ fel: 'zoom', t: 2_600, de: 'panza', n: 1 });
  m.treci(PAUZA_GEST_MS);
  m.ins.primeste({ fel: 'zoom', t: 3_100, de: 'panza', n: 2 });
  m.treci(PAUZA_GEST_MS + 1);
  m.ins.primeste({ fel: 'zoom', t: 3_800, de: 'panza', n: 1 });
  m.ins.primeste({ fel: 'derulare', t: 3_900, de: 'panou', n: 1 });
  m.ins.primeste({ ...clic, id: 'Buton Salvează', t: 4_000 });
  assert.deepEqual(m.ins.pasi(), [
    { ...clic, t: 1_000, n: 2 },
    { fel: 'zoom', t: 2_600, de: 'panza', n: 3 },
    { fel: 'zoom', t: 3_800, de: 'panza', n: 1 },
    { fel: 'derulare', t: 3_900, de: 'panou', n: 1 },
  ]);
});

test('clicurile fine oprite din Setări: clicurile, derularea și zoom-ul nu intră deloc; acțiunile și dialogurile, da', () => {
  const m = mediu({ setari: { clicuri: false } });
  m.ins.primeste({ fel: 'clic', t: 1, id: 'testid.export-gcode', de: 'bara' });
  m.ins.primeste({ fel: 'zoom', t: 2, de: 'panza', n: 1 });
  m.ins.primeste({ fel: 'derulare', t: 3, de: 'panou', n: 1 });
  m.ins.primeste({ fel: 'dialog', t: 4, id: 'eticheta.export-titlu', rez: 'deschis' });
  m.ins.actiune('document.roteste', 'ok');
  assert.deepEqual(m.ins.pasi().map((e) => e.fel), ['dialog', 'actiune']);
  assert.equal(m.ins.inLot(), 2);
});

test('acțiunile reușite se numără (și cele repetate, și cele de dinaintea contului); refuzurile, nu', () => {
  const m = mediu();
  m.cont(null);
  m.ins.actiune('document.roteste', 'ok');
  m.cont('ana');
  m.ins.actiune('document.roteste', 'ok');
  m.ins.actiune('document.roteste', 'motiv.nimic-ales');
  m.ins.actiune('export.gcode', 'ok');
  assert.equal(m.ins.reusite(), 3);
});

test('lista albă și în client: un id sau un motiv din afara ei nu intră (motivul ciudat devine „motiv.altul”)', () => {
  const m = mediu();
  m.ins.actiune('Document.Roteste', 'ok');
  m.ins.unealta('Unealta Mea');
  m.ins.actiune('document.roteste', 'Nu merge: ana@exemplu.ro');
  assert.deepEqual(m.ins.pasi(), [{ fel: 'actiune', t: 1_000, id: 'document.roteste', de: 'bara', rez: 'motiv.altul' }]);
});

test('lotul: închis cu sesiunea, numărul, ceasul și contextul, cu contul lui; trece de lista albă a serverului; gol nu se face', () => {
  const m = mediu();
  m.ins.inchideLotul();
  assert.deepEqual(m.ins.loturi(), []);
  m.ins.actiune('document.roteste', 'ok');
  m.treci(60_000);
  m.ins.inchideLotul();
  m.ins.unealta('cerc');
  m.ins.inchideLotul();
  const [a, b, ...rest] = m.ins.loturi();
  assert.equal(rest.length, 0);
  assert.deepEqual(a, { uid: 'ana', lot: { sesiune: 'k3j9x0a1b2c3d4e5', nr: 1, acum: 61_000, context: CONTEXT, evenimente: [{ fel: 'actiune', t: 1_000, id: 'document.roteste', de: 'bara', rez: 'ok' }] } });
  assert.equal(b?.lot.nr, 2);
  assert.deepEqual(lotDin(a?.lot)?.aruncate, 0);
  // Ținute în browser, cu contul lor: o filă nouă (sau sesiunea următoare) le găsește.
  assert.deepEqual(JSON.parse(m.d.m.get(CHEIE_LOTURI_UTILIZARE) ?? 'null'), { v: 1, loturi: [a, b] });
  // O repetare imediat după închiderea lotului e un eveniment nou, în lotul următor: lotul închis rămâne cum a plecat.
  const ROTESTE = { fel: 'actiune', t: 61_000, id: 'document.roteste', de: 'bara', rez: 'ok' };
  m.ins.actiune('document.roteste', 'ok');
  m.ins.inchideLotul();
  m.ins.actiune('document.roteste', 'ok');
  m.ins.inchideLotul();
  assert.deepEqual(m.ins.loturi().slice(2).map((x) => x.lot.evenimente), [[ROTESTE], [ROTESTE]]);
});

test('fără cont sau cu colectarea oprită: evenimentele intră doar în pașii erorilor, nu în lot', () => {
  const m = mediu();
  m.cont(null);
  m.ins.actiune('document.roteste', 'ok');
  m.cont('ana');
  m.ins.primesteSetari({ ...setariPublice(SETARI_UTILIZARE_IMPLICITE), colectare: false });
  m.ins.actiune('document.oglindeste', 'ok');
  m.ins.inchideLotul();
  assert.deepEqual(m.ins.loturi(), []);
  assert.equal(m.ins.pasi().length, 2);
});

test('un eveniment de dinaintea intrării în cont nu intră în lotul de după ea', () => {
  const m = mediu();
  m.cont(null);
  m.ins.actiune('document.roteste', 'ok');
  m.cont('ana');
  m.ins.actiune('document.oglindeste', 'ok');
  m.ins.inchideLotul();
  assert.deepEqual(m.ins.loturi().map((x) => x.lot.evenimente.map((e) => ('id' in e ? e.id : e.fel))), [['document.oglindeste']]);
});

test('lotul plin (200) se închide singur și cere trimiterea', () => {
  const m = mediu();
  for (let i = 0; i < 200; i++) m.ins.actiune(i % 2 === 0 ? 'document.roteste' : 'document.oglindeste', 'ok');
  assert.equal(m.pline(), 1);
  assert.equal(m.ins.loturi()[0]?.lot.evenimente.length, 200);
  assert.equal(m.ins.inLot(), 0);
});

test('pașii erorilor: ultimele N (din setări); 0 nu ține nimic', () => {
  const m = mediu({ setari: { pasiEroare: 3 } });
  for (const id of ['a.unu', 'a.doi', 'a.trei', 'a.patru']) m.ins.actiune(id, 'ok');
  assert.deepEqual(m.ins.pasi().map((e) => ('id' in e ? e.id : e.fel)), ['a.doi', 'a.trei', 'a.patru']);
  const z = mediu({ setari: { pasiEroare: 0 } });
  z.ins.actiune('a.unu', 'ok');
  assert.deepEqual(z.ins.pasi(), []);
  assert.equal(z.ins.inLot(), 1, 'lotul strânge oricum');
});

test('setările aflate: ținute în browser; colectarea oprită golește lotul și coada; stricate, implicitele', () => {
  const m = mediu();
  m.ins.actiune('document.roteste', 'ok');
  m.ins.inchideLotul();
  m.ins.actiune('document.roteste', 'ok');
  const oprite = { ...setariPublice(SETARI_UTILIZARE_IMPLICITE), colectare: false, lotMinute: 15 };
  m.ins.primesteSetari(oprite);
  assert.deepEqual(m.ins.setari(), oprite);
  assert.deepEqual(m.ins.loturi(), []);
  assert.equal(m.ins.inLot(), 0);
  assert.deepEqual(JSON.parse(m.d.m.get(CHEIE_SETARI_UTILIZARE) ?? 'null'), oprite);
  assert.deepEqual(mediu({ setari: { lotMinute: 999 } }).ins.setari(), setariPublice(SETARI_UTILIZARE_IMPLICITE));
});

test('întrebarea setărilor: un lot gol, cu contul de acum', () => {
  const m = mediu();
  m.ins.intreabaSetarile();
  assert.deepEqual(m.ins.loturi().map((x) => [x.uid, x.lot.nr, x.lot.evenimente.length]), [['ana', 1, 0]]);
});

test('coada din browser: peste 2 000 de evenimente, loturile cele mai vechi pleacă; scoaterea unui lot; golirea', () => {
  const m = mediu();
  for (let i = 0; i < 11; i++) {
    for (let k = 0; k < 200; k++) m.ins.actiune(k % 2 === 0 ? 'a.unu' : 'a.doi', 'ok');
  }
  const nr = m.ins.loturi().map((x) => x.lot.nr);
  assert.deepEqual(nr, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  assert.equal(EVENIMENTE_IN_ASTEPTARE, 2_000);
  m.ins.scoate('k3j9x0a1b2c3d4e5', 2);
  assert.equal(m.ins.loturi()[0]?.lot.nr, 3);
  m.ins.golesteTot();
  assert.deepEqual(m.ins.loturi(), []);
  assert.deepEqual(JSON.parse(m.d.m.get(CHEIE_LOTURI_UTILIZARE) ?? 'null'), { v: 1, loturi: [] });
});

test('loturile altei sesiuni (o filă închisă, sesiunea de ieri) rămân în coadă; o coadă stricată e goală', () => {
  const ieri = { uid: 'ana', lot: { sesiune: 'aaaaaaaaaaaaaaaa', nr: 4, acum: 5, context: CONTEXT, evenimente: [] } };
  const d = depozit({ [CHEIE_LOTURI_UTILIZARE]: JSON.stringify({ v: 1, loturi: [ieri] }) });
  const ins = creeazaInregistrator({ ceas: () => 0, sesiune: 'k3j9x0a1b2c3d4e5', depozit: d, context: () => CONTEXT, cont: () => 'ana', sursa: () => 'alt' });
  assert.deepEqual(ins.loturi(), [ieri]);
  const stricat = creeazaInregistrator({
    ceas: () => 0, sesiune: 'k3j9x0a1b2c3d4e5', depozit: depozit({ [CHEIE_LOTURI_UTILIZARE]: '{"v":1,"loturi":7' }), context: () => CONTEXT, cont: () => 'ana', sursa: () => 'alt',
  });
  assert.deepEqual(stricat.loturi(), []);
});

test('sursa unui gest: paleta, tasta, meniul, panoul (și ferestrele), bara, pânza, altceva', () => {
  const el = (...potriviri: string[]) => ({ closest: (s: string) => (s.split(',').some((x) => potriviri.includes(x.trim())) ? {} : null) });
  assert.equal(sursaDin(el('.paleta', 'input'), true), 'paleta');
  assert.equal(sursaDin(el('.paleta'), false), 'paleta');
  assert.equal(sursaDin(el(), true), 'tasta');
  assert.equal(sursaDin(el('[role="toolbar"]'), true), 'tasta', 'o scurtătură cu focusul pe bară e tot o tastă');
  assert.equal(sursaDin(el('[data-panou]', 'input'), true), 'panou', 'Enter într-un câmp al panoului');
  assert.equal(sursaDin(el('.meniu-context'), false), 'meniu');
  assert.equal(sursaDin(el('[role="menu"]'), false), 'meniu');
  assert.equal(sursaDin(el('[data-panou]'), false), 'panou');
  assert.equal(sursaDin(el('[role="dialog"]'), false), 'panou');
  assert.equal(sursaDin(el('[role="toolbar"]'), false), 'bara');
  assert.equal(sursaDin(el('.meniu-global'), false), 'bara');
  assert.equal(sursaDin(el('canvas'), false), 'panza');
  assert.equal(sursaDin(el('.panza-cutie'), false), 'panza', 'straturile de deasupra pânzei (mânerele, traseul)');
  assert.equal(sursaDin(el('div'), false), 'alt');
  assert.equal(sursaDin(null, false), 'alt');
  assert.equal(sursaDin(null, true), 'tasta');
});

test('contextul: în trepte și din liste; versiunea sau aranjamentul ciudate, numite așa', () => {
  const m = { versiune: 'ed4c30c777de', limba: 'ro', aranjament: 'modern', tema: 'auto', intunecat: false, latime: 1280, ua: 'Mozilla/5.0 Chrome/147 Safari/537 Edg/147', atingere: false, online: true };
  assert.deepEqual(contextDinMediu(m), CONTEXT);
  assert.equal(contextDinMediu({ ...m, versiune: 'necunoscută' }).versiune, 'necunoscuta');
  assert.equal(contextDinMediu({ ...m, aranjament: undefined }).aranjament, 'necunoscut');
  assert.equal(contextDinMediu({ ...m, limba: 'de' }).limba, 'ro');
  assert.equal(contextDinMediu({ ...m, tema: 'auto', intunecat: true }).tema, 'inchisa');
  assert.equal(contextDinMediu({ ...m, tema: 'luminoasa', intunecat: true }).tema, 'deschisa');
  assert.equal(contextDinMediu({ ...m, tema: 'intunecata', intunecat: false }).tema, 'inchisa');
  assert.deepEqual([599, 600, 1023, 1024, 1599, 1600].map((latime) => contextDinMediu({ ...m, latime }).ecran), ['telefon', 'tableta', 'tableta', 'laptop', 'laptop', 'mare']);
  const ua = (s: string) => contextDinMediu({ ...m, ua: s }).browser;
  assert.deepEqual([
    ua('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/147.0 Safari/537.36'),
    ua('Mozilla/5.0 (X11; Linux) Gecko/20100101 Firefox/140.0'),
    ua('Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Version/18 Safari/605.1.15'),
    ua('curl/8'),
  ], ['chrome', 'firefox', 'safari', 'altul']);
  for (const c of [contextDinMediu(m), contextDinMediu({ ...m, versiune: '?', aranjament: 'X' })]) {
    assert.ok(lotDin({ sesiune: 'k3j9x0a1b2c3d4e5', nr: 1, acum: 0, context: c, evenimente: [] }), 'contextul trece de lista albă');
  }
});

test('id-ul sesiunii: 16 litere mici și cifre, altul la fiecare încărcare', () => {
  const a = idSesiune();
  assert.match(a, /^[a-z0-9]{16}$/);
  assert.notEqual(a, idSesiune());
});

test('registrul spune fiecare rulare cerută, cu rezultatul ei', () => {
  const vazute: string[] = [];
  const r = creeazaRegistru([
    { id: 'a.merge', eticheta: 'motiv.nimic-ales', capabilitate: 'desen', activa: () => true, ruleaza: () => undefined },
    { id: 'a.nu', eticheta: 'motiv.nimic-ales', capabilitate: 'desen', activa: () => 'motiv.nimic-ales', ruleaza: () => undefined },
  ], () => true);
  observaRularile((id, s) => { vazute.push(`${id}:${s.ok ? 'ok' : s.motiv}`); });
  ruleaza(r, 'a.merge', {});
  ruleaza(r, 'a.nu', {});
  ruleaza(r, 'a.lipsa', {});
  observaRularile(null);
  ruleaza(r, 'a.merge', {});
  assert.deepEqual(vazute, ['a.merge:ok', 'a.nu:motiv.nimic-ales', 'a.lipsa:motiv.actiune-necunoscuta']);
});

/** Pompa, cu un ceas de mână: `amana` ține funcțiile, `pas()` le rulează pe cele scadente. */
function pompaDeProba(raspunsuri: RezultatPompa[], extra: { cont?: () => string | null } = {}) {
  const m = mediu();
  const amanate: Array<{ f: () => void; ms: number }> = [];
  let trimiteri = 0;
  let curent: ((r: RezultatPompa) => void) | null = null;
  const p = creeazaPompa({
    ins: m.ins,
    cont: extra.cont ?? (() => 'ana'),
    trimite: () => { trimiteri++; return new Promise<RezultatPompa>((ok) => { curent = ok; }); },
    amana: (f, ms) => { amanate.push({ f, ms }); },
  });
  const raspunde = async () => {
    const r = raspunsuri.shift();
    if (r && curent) curent(r);
    curent = null;
    await new Promise((ok) => { setTimeout(ok, 0); });
  };
  return { m, p, amanate, trimiteri: () => trimiteri, raspunde };
}

test('pompa: pornită, programează lotul după minutele din setări; o singură trimitere odată; „stins” oprește sesiunea', async () => {
  const x = pompaDeProba(['gata', 'stins']);
  x.p.porneste();
  assert.deepEqual(x.amanate.map((a) => a.ms), [5 * 60_000]);
  assert.equal(x.trimiteri(), 0, 'nimic de trimis');
  x.m.ins.actiune('document.roteste', 'ok');
  x.amanate[0]?.f();
  assert.equal(x.trimiteri(), 1, 'lotul închis de ceas pleacă');
  assert.equal(x.amanate.length, 2, 'ceasul se programează din nou');
  x.m.ins.actiune('document.roteste', 'ok');
  x.m.ins.inchideLotul();
  x.p.impinge();
  assert.equal(x.trimiteri(), 1, 'cât una e pe drum, nu pleacă alta');
  await x.raspunde();
  x.p.impinge();
  assert.equal(x.trimiteri(), 2);
  await x.raspunde();
  x.m.ins.actiune('document.roteste', 'ok');
  x.m.ins.inchideLotul();
  x.p.impinge();
  assert.equal(x.trimiteri(), 2, 'după „stins”, nimic nu mai pleacă în sesiunea asta');
});

test('pompa: fără cont nu trimite; cu colectarea oprită, întreabă setările o dată, la pornire', () => {
  const fara = pompaDeProba([], { cont: () => null });
  fara.m.ins.actiune('document.roteste', 'ok');
  fara.p.porneste();
  fara.p.impinge();
  assert.equal(fara.trimiteri(), 0);
  const oprita = pompaDeProba(['gata']);
  oprita.m.ins.primesteSetari({ ...setariPublice(SETARI_UTILIZARE_IMPLICITE), colectare: false });
  oprita.p.porneste();
  assert.equal(oprita.trimiteri(), 1);
  assert.equal(oprita.m.ins.loturi()[0]?.lot.evenimente.length, 0);
});

test('trimiterea cozii: pe rând, doar ale contului deschis; setările din răspuns; un lot greșit se scoate; refuzurile', async () => {
  const PORNITE = setariPublice(SETARI_UTILIZARE_IMPLICITE);
  const cu = (coduri: Array<string | null>, uid: string | null = 'ana') => {
    const m = mediu();
    m.ins.actiune('a.unu', 'ok');
    m.ins.inchideLotul();
    m.cont('ion');
    m.ins.actiune('a.doi', 'ok');
    m.ins.inchideLotul();
    m.cont('ana');
    m.ins.actiune('a.trei', 'ok');
    m.ins.inchideLotul();
    const trimise: number[] = [];
    const r = trimiteCoada(m.ins, {
      uid,
      trimite: async (lot) => {
        const c = coduri.shift();
        if (c) throw Object.assign(new Error(c), { code: c });
        trimise.push(lot.nr);
        return { ok: true, scris: true, setari: PORNITE };
      },
      cod: (e) => String((e as { code?: unknown }).code ?? ''),
    });
    return { m, r, trimise };
  };
  // Lotul lui Ion (alt cont, în același browser) nu pleacă în numele Anei: se scoate.
  const toate = cu([null, null]);
  assert.equal(await toate.r, 'gata');
  assert.deepEqual(toate.trimise, [1, 3]);
  assert.deepEqual(toate.m.ins.loturi(), []);
  // Greșit (lista albă a serverului): scos, restul pleacă.
  const gresit = cu(['functions/invalid-argument', null]);
  assert.equal(await gresit.r, 'gata');
  assert.deepEqual(gresit.trimise, [3]);
  // Rețeaua sau plafonul pe oră: lotul rămâne, trimiterea se oprește aici (cel de după, și al lui Ion, așteaptă și ele).
  for (const c of ['functions/unavailable', 'functions/resource-exhausted', 'functions/internal', 'altceva']) {
    const x = cu([c]);
    assert.equal(await x.r, 'retea', c);
    assert.deepEqual(x.m.ins.loturi().map((l) => l.lot.nr), [1, 2, 3], c);
  }
  // Contul nu mai e deschis pe server: coada se golește; fără token: așteaptă sesiunea următoare.
  const fara = cu(['functions/permission-denied']);
  assert.equal(await fara.r, 'stins');
  assert.deepEqual(fara.m.ins.loturi(), []);
  const token = cu(['functions/unauthenticated']);
  assert.equal(await token.r, 'stins');
  assert.equal(token.m.ins.loturi().length, 3);
  // Nimeni logat în browser: nimic nu pleacă, coada rămâne.
  const nimeni = cu([], null);
  assert.equal(await nimeni.r, 'stins');
  assert.equal(nimeni.m.ins.loturi().length, 3);
});

test('trimiterea cozii: colectarea oprită în răspuns oprește trimiterea și golește coada', async () => {
  const m = mediu();
  for (const id of ['a.unu', 'a.doi']) {
    m.ins.actiune(id, 'ok');
    m.ins.inchideLotul();
  }
  let trimise = 0;
  const r = await trimiteCoada(m.ins, {
    uid: 'ana',
    trimite: async () => { trimise++; return { ok: true, scris: false, setari: { ...setariPublice(SETARI_UTILIZARE_IMPLICITE), colectare: false } }; },
    cod: () => '',
  });
  assert.equal(r, 'gata');
  assert.equal(trimise, 1);
  assert.deepEqual(m.ins.loturi(), []);
  assert.equal(m.ins.setari().colectare, false);
});

test('pornirea: evenimentele de dinaintea înregistratorului așteaptă în tampon, cu timpul și sursa lor; apoi trec direct', () => {
  utilizarea.unealta('cerc');
  utilizarea.fereastra('masina');
  const primite: string[] = [];
  preiaUtilizarea((e) => { primite.push(`${e.fel}:${'id' in e ? e.id : '-'}:${'de' in e ? e.de : '-'}:${typeof e.t}`); });
  utilizarea.actiune('document.roteste', 'ok');
  assert.deepEqual(primite, ['unealta:cerc:alt:number', 'fereastra:masina:-:number', 'actiune:document.roteste:alt:number']);
});
