import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { CererePreferinte, RaspunsCitestePreferinte, RaspunsScriePreferinte } from '../../shared/preferinte.ts';
import { rezolvaCiocnireaSetarilor, treceSetarile, type DepPreferinte, type StarePreferinte } from '../../src/app/preferinteSincronizare.ts';

/**
 * Trecerea setărilor prin cont (ADR 0330, întrebarea 14a, felia 10.4↑g), pe un server și pe browsere închipuite: contul gol
 * și setările implicite nu scriu nimic; o schimbare de aici pleacă cu versiunea văzută; al doilea calculator primește ce e
 * în cont; schimbările pe câmpuri diferite se îmbină și pleacă; același câmp schimbat altfel e o ciocnire, fără nicio
 * scriere până la alegerea omului; fără `cloud` nu pleacă nimic, dar vine; contul schimbat între citire și scriere se
 * îmbină din nou; fără rețea, setările rămân; starea altui cont nu se folosește.
 */

const IMPLICIT = { v: 1, cifre: { unitate: 'mm', zecimale: 2 }, linii: { distanta: 10 } };
/** Normalizarea: cheile sortate (ca textul să nu depindă de ordinea câmpurilor). */
const canon = (x: unknown): unknown => (typeof x === 'object' && x !== null && !Array.isArray(x)
  ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, canon((x as Record<string, unknown>)[k])]))
  : x);
const text = (x: unknown): string => JSON.stringify(canon(x));

type Server = { versiune: number; json: string | null; poateScrie: boolean; cereri: CererePreferinte[]; inainteDeScriere?: (() => void) | undefined };
const server = (json: unknown = null, versiune = json === null ? 0 : 1): Server => ({ versiune, json: json === null ? null : JSON.stringify(json), poateScrie: true, cereri: [] });

function cheama(s: Server) {
  return async (c: CererePreferinte): Promise<RaspunsCitestePreferinte | RaspunsScriePreferinte> => {
    s.cereri.push(c);
    if (c.actiune === 'citeste') return { ok: true, versiune: s.versiune, json: s.json, poateScrie: s.poateScrie };
    s.inainteDeScriere?.();
    s.inainteDeScriere = undefined;
    if (!s.poateScrie) throw Object.assign(new Error('fără cloud'), { code: 'functions/permission-denied' });
    if (c.vazuta !== s.versiune) return { ok: true, stare: 'conflict', versiune: s.versiune, json: s.json };
    s.versiune++;
    s.json = c.json;
    return { ok: true, stare: 'scrisa', versiune: s.versiune };
  };
}

type Browser = { aici: string; stare: StarePreferinte | null; puse: number };
const browser = (aici: unknown = IMPLICIT, stare: StarePreferinte | null = null): Browser => ({ aici: text(aici), stare, puse: 0 });

function dep(s: Server, b: Browser, uid = 'ana'): DepPreferinte {
  return {
    uid, cheie: 'cote', cheama: cheama(s),
    aici: () => b.aici,
    pune: (t) => { b.aici = t; b.puse++; },
    normal: (j) => (j === null ? text(IMPLICIT) : text(JSON.parse(j))),
    stare: () => b.stare,
    tine: (x) => { b.stare = x; },
  };
}
const scrieri = (s: Server): number => s.cereri.filter((c) => c.actiune === 'scrie').length;
const cu = (o: Record<string, unknown>) => ({ ...IMPLICIT, ...o });

test('contul gol și setările implicite: la zi, fără nicio scriere și fără stare ținută', async () => {
  const s = server(), b = browser();
  assert.equal(await treceSetarile(dep(s, b)), 'la-zi');
  assert.equal(scrieri(s), 0);
  assert.equal(b.stare, null);
});

test('o schimbare de aici pleacă în contul gol (versiunea văzută 0); a doua trecere nu mai scrie', async () => {
  const s = server(), b = browser(cu({ cifre: { unitate: 'inch', zecimale: 2 } }));
  assert.equal(await treceSetarile(dep(s, b)), 'la-zi');
  assert.deepEqual(s.cereri.at(-1), { actiune: 'scrie', cheie: 'cote', vazuta: 0, json: b.aici });
  assert.equal(s.versiune, 1);
  assert.deepEqual(b.stare, { uid: 'ana', versiune: 1, baza: b.aici, ciocnire: null });
  assert.equal(await treceSetarile(dep(s, b)), 'la-zi');
  assert.equal(scrieri(s), 1);
});

test('al doilea calculator (fără stare, cu implicitele): primește setările din cont, fără să scrie', async () => {
  const cont = cu({ linii: { distanta: 14 } });
  const s = server(cont, 3), b = browser();
  assert.equal(await treceSetarile(dep(s, b)), 'la-zi');
  assert.equal(b.aici, text(cont));
  assert.equal(scrieri(s), 0);
  assert.deepEqual(b.stare, { uid: 'ana', versiune: 3, baza: text(cont), ciocnire: null });
});

test('schimbări pe câmpuri diferite, aici și în cont: se îmbină, aici și în cont, cu versiunea din cont', async () => {
  const baza = text(IMPLICIT);
  const s = server(cu({ linii: { distanta: 14 } }), 5);
  const b = browser(cu({ cifre: { unitate: 'cm', zecimale: 2 } }), { uid: 'ana', versiune: 4, baza, ciocnire: null });
  assert.equal(await treceSetarile(dep(s, b)), 'la-zi');
  const asteptat = text({ v: 1, cifre: { unitate: 'cm', zecimale: 2 }, linii: { distanta: 14 } });
  assert.equal(b.aici, asteptat);
  assert.deepEqual(s.cereri.at(-1), { actiune: 'scrie', cheie: 'cote', vazuta: 5, json: asteptat });
  assert.equal(s.json, asteptat);
  assert.deepEqual(b.stare, { uid: 'ana', versiune: 6, baza: asteptat, ciocnire: null });
});

test('ciocnirea: rămâne ca aici, câmpurile curate vin; nu pleacă nimic până la alegere; „Ia-le pe cele din cont”', async () => {
  const baza = text(IMPLICIT);
  const cont = cu({ cifre: { unitate: 'inch', zecimale: 2 }, linii: { distanta: 14 } });
  const s = server(cont, 5);
  const b = browser(cu({ cifre: { unitate: 'cm', zecimale: 2 } }), { uid: 'ana', versiune: 4, baza, ciocnire: null });
  assert.equal(await treceSetarile(dep(s, b)), 'ciocnire');
  assert.equal(b.aici, text({ v: 1, cifre: { unitate: 'cm', zecimale: 2 }, linii: { distanta: 14 } }));
  assert.deepEqual(b.stare?.ciocnire, { versiune: 5, json: text(cont), cai: [['cifre', 'unitate']] });
  assert.equal(b.stare?.versiune, 4, 'baza rămâne cea veche cât ciocnirea e neîmpăcată');
  assert.equal(await treceSetarile(dep(s, b)), 'ciocnire');
  assert.equal(scrieri(s), 0);
  // O altă schimbare de aici, cât ciocnirea e neîmpăcată, nu pleacă nici ea.
  b.aici = text({ v: 1, cifre: { unitate: 'cm', zecimale: 4 }, linii: { distanta: 14 } });
  assert.equal(await treceSetarile(dep(s, b)), 'ciocnire');
  assert.equal(scrieri(s), 0);
  b.aici = text({ v: 1, cifre: { unitate: 'cm', zecimale: 2 }, linii: { distanta: 14 } });
  assert.equal(rezolvaCiocnireaSetarilor(dep(s, b), 'cont'), true);
  assert.equal(b.aici, text(cont));
  assert.deepEqual(b.stare, { uid: 'ana', versiune: 5, baza: text(cont), ciocnire: null });
  assert.equal(await treceSetarile(dep(s, b)), 'la-zi');
  assert.equal(scrieri(s), 0, 'aici e acum ca în cont: nimic de trimis');
  assert.equal(rezolvaCiocnireaSetarilor(dep(s, b), 'cont'), false, 'fără ciocnire, nimic de ales');
});

test('ciocnirea împăcată de mână (aici, aceeași valoare ca în cont): trecerea următoare o uită, fără nicio scriere', async () => {
  const cont = cu({ cifre: { unitate: 'inch', zecimale: 2 } });
  const s = server(cont, 5);
  const b = browser(cu({ cifre: { unitate: 'cm', zecimale: 2 } }), { uid: 'ana', versiune: 4, baza: text(IMPLICIT), ciocnire: null });
  assert.equal(await treceSetarile(dep(s, b)), 'ciocnire');
  b.aici = text(cont);
  assert.equal(await treceSetarile(dep(s, b)), 'la-zi');
  assert.deepEqual(b.stare, { uid: 'ana', versiune: 5, baza: text(cont), ciocnire: null });
  assert.equal(scrieri(s), 0);
});

test('„Păstrează-le pe ale mele”: setările de aici pleacă, cu versiunea contului de la ciocnire', async () => {
  const cont = cu({ cifre: { unitate: 'inch', zecimale: 2 } });
  const s = server(cont, 5);
  const b = browser(cu({ cifre: { unitate: 'cm', zecimale: 2 } }), { uid: 'ana', versiune: 4, baza: text(IMPLICIT), ciocnire: null });
  assert.equal(await treceSetarile(dep(s, b)), 'ciocnire');
  const aici = b.aici;
  assert.equal(rezolvaCiocnireaSetarilor(dep(s, b), 'aici'), true);
  assert.equal(b.aici, aici);
  assert.equal(await treceSetarile(dep(s, b)), 'la-zi');
  assert.deepEqual(s.cereri.at(-1), { actiune: 'scrie', cheie: 'cote', vazuta: 5, json: aici });
  assert.equal(s.json, aici);
});

test('fără `cloud`: nu pleacă nimic (doar citire), dar setările din cont vin; ce s-a schimbat aici rămâne', async () => {
  const s = server(cu({ linii: { distanta: 14 } }), 2);
  s.poateScrie = false;
  const b = browser(cu({ cifre: { unitate: 'cm', zecimale: 2 } }), { uid: 'ana', versiune: 1, baza: text(IMPLICIT), ciocnire: null });
  assert.equal(await treceSetarile(dep(s, b)), 'citire');
  assert.equal(b.aici, text({ v: 1, cifre: { unitate: 'cm', zecimale: 2 }, linii: { distanta: 14 } }));
  assert.equal(scrieri(s), 0);
});

test('contul schimbat între citire și scriere: ciocnirea serverului se îmbină din nou și pleacă, cu versiunea nouă', async () => {
  const s = server(IMPLICIT, 1);
  const b = browser(cu({ cifre: { unitate: 'cm', zecimale: 2 } }), { uid: 'ana', versiune: 1, baza: text(IMPLICIT), ciocnire: null });
  s.inainteDeScriere = () => { s.versiune = 2; s.json = JSON.stringify(cu({ linii: { distanta: 20 } })); };
  assert.equal(await treceSetarile(dep(s, b)), 'la-zi');
  const asteptat = text({ v: 1, cifre: { unitate: 'cm', zecimale: 2 }, linii: { distanta: 20 } });
  assert.equal(s.json, asteptat);
  assert.equal(s.versiune, 3);
  assert.equal(b.aici, asteptat);
});

test('fără rețea, cu alt cont logat: setările rămân aici; starea altui cont nu e bază', async () => {
  const b = browser(cu({ cifre: { unitate: 'cm', zecimale: 2 } }));
  const fara = { ...dep(server(), b), cheama: async () => { throw Object.assign(new Error('jos'), { code: 'functions/unavailable' }); } };
  assert.equal(await treceSetarile(fara), 'fara-retea');
  const altul = { ...dep(server(), b), cheama: async () => { throw Object.assign(new Error('alt'), { code: 'cont/altul' }); } };
  assert.equal(await treceSetarile(altul), 'cont');
  assert.equal(b.aici, text(cu({ cifre: { unitate: 'cm', zecimale: 2 } })));
  // Starea lui „bob”, la versiunea 1 (aceeași cu a contului „ana”), nu oprește îmbinarea: baza e implicitul.
  const s = server(cu({ linii: { distanta: 14 } }), 1);
  b.stare = { uid: 'bob', versiune: 1, baza: text(cu({ linii: { distanta: 14 } })), ciocnire: null };
  assert.equal(await treceSetarile(dep(s, b)), 'la-zi');
  assert.equal(s.json, text({ v: 1, cifre: { unitate: 'cm', zecimale: 2 }, linii: { distanta: 14 } }));
});
