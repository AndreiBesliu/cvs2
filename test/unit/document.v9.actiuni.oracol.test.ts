/**
 * ADR 0034 §2 (felia 2.7b, sesiune independentă): plafoanele de ansamblu ale căilor, „numărate o dată pentru ușă și
 * pentru acțiuni”, judecate după Ctrl+D (`document.duplica-selectia`, prin registrul acțiunilor, ca din interfață).
 * Ctrl+D face o copie SEPARATĂ a piesei fiecărei instanțe alese (piesă nouă, același arbore, o instanță nouă), deci
 * adaugă vârfurile căilor piesei la ambele numărători: suma pe piese (≤ 200 000) și lumea (≤ 1 000 000). Oracolul
 * prezice numerele de după copie din document (`varfuriDeCale`, `varfuriInLume`, scrise aici din ADR); dacă ar trece de
 * un plafon, acțiunea trebuie să fie inactivă (cu motiv) și documentul neschimbat; altfel activă, cu exact numerele
 * prezise, iar documentul rezultat trece ușa oracolului (`verificaV9`; felia 2.3c-2: pe schema aplicației,
 * `verificaSchemaApp`, deci `verificaV10` pe 10) și pe a aplicației (se poate redeschide).
 * ALEGERE: un cerc nou nu adaugă vârfuri de cale, deci „Adaugă cerc” rămâne activ și la plafonul lumii.
 *
 * Precizarea recenziei (11.10, ADR 0034 §2): o instanță mutată sau copiată (Ctrl+D) peste 10⁷ mm de origine
 * (`PLAFON.translatie`, pe |x| sau |y|): acțiunea e inactivă, cu motivul ei („prea departe”), iar ușa folosește același
 * prag. Copia stă la +20 / −20 mm de original (`actiuni.test.ts`); mutarea, cu deplasarea dată.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import { istoricNou, type Istoric } from '../../src/model/jurnal.ts';
import { creeazaRegistru, ruleaza, stare } from '../../src/ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, type ContextDocument } from '../../src/ui/actiuniDocument.ts';
import { PLAFOANE_O, verificaV9, type Liber } from '../oracles/document.ts';
import { docPieseCale, varfuriDeCale } from '../oracles/document.v9.cazuri.ts';
import { accepta, DOAR_V9, verificaSchemaApp, type DocApp } from './ajutor-document-oracol.ts';

/** Vârfurile căilor fiecărei piese (după id). */
function varfuriPePiesa(d: unknown): Map<string, number> {
  const rez = new Map<string, number>();
  for (const p of (d as Liber)['piese'] as Liber[]) rez.set(p['id'] as string, varfuriDeCale({ piese: [p] }));
  return rez;
}

/** ADR 0034 §2: vârfurile în lume = instanțele înmulțite cu vârfurile căilor piesei lor (toate foile). */
function varfuriInLume(d: unknown): number {
  const pe = varfuriPePiesa(d);
  let n = 0;
  for (const f of (d as Liber)['foi'] as Liber[]) for (const i of f['instante'] as Liber[]) n += pe.get(i['piesa'] as string) ?? 0;
  return n;
}

function context(doc: DocApp): ContextDocument & { readonly h: () => Istoric } {
  let h = istoricNou(doc);
  let sel: readonly string[] = [];
  return { istoric: () => h, scrie: (nou) => { h = nou; }, selectie: () => sel, selecteaza: (ids) => { sel = ids; }, h: () => h };
}

const registru = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);

type Caz = {
  readonly nume: string; readonly varfuri: readonly number[]; readonly instante?: readonly number[]; readonly alese: readonly string[];
  /** Ce trebuie să iasă (verificat și din predicția oracolului, mai jos). */
  readonly activa: boolean;
  /** Și redeschiderea documentului rezultat prin ușa aplicației (costă ~1 s pe documentele mari). */
  readonly redeschide?: boolean;
  readonly cerc?: boolean;
};

const CAZURI: readonly Caz[] = [
  { nume: 'A1 trei căi de 50 000 (150 000 în piese): copia uneia ajunge exact la 200 000 în piese și în lume', varfuri: [50_000, 50_000, 50_000], alese: ['i0x0'], activa: true, redeschide: true },
  { nume: 'A2 patru căi de 50 000 (200 000 în piese): copia ar face 250 000', varfuri: [50_000, 50_000, 50_000, 50_000], alese: ['i0x0'], activa: false },
  { nume: 'A3 o cale de 50 000 pusă de 19 ori (950 000 în lume): copia ajunge exact la 1 000 000 în lume', varfuri: [50_000], instante: [19], alese: ['i0x0'], activa: true, redeschide: true },
  { nume: 'A4 o cale de 50 000 pusă de 20 de ori (1 000 000 în lume): copia ar face 1 050 000; un cerc nou încape', varfuri: [50_000], instante: [20], alese: ['i0x0'], activa: false, cerc: true },
  { nume: 'A5 o piesă mică (20 de vârfuri) lângă una de 10 pusă de două ori: copia adaugă 20 în piese și 20 în lume', varfuri: [10, 20], instante: [2, 1], alese: ['i1x0'], activa: true },
  { nume: 'A6 două instanțe alese, din trei căi de 50 000: fiecare copie ar încăpea singură, împreună fac 250 000', varfuri: [50_000, 50_000, 50_000], alese: ['i0x0', 'i1x0'], activa: false },
  { nume: 'A7 două căi de 50 000, ambele alese: copiile fac exact 200 000 în piese', varfuri: [50_000, 50_000], alese: ['i0x0', 'i1x0'], activa: true },
  { nume: 'A8 doar lumea: o cale de 50 000 pusă de 19 ori și una de 10 (950 010 în lume); copia celei mari ar face 1 000 010, piesele doar 100 010', varfuri: [50_000, 10], instante: [19, 1], alese: ['i0x0'], activa: false },
];

type CazDeparte = { readonly nume: string; readonly x: number; readonly y: number; readonly actiune: 'document.duplica-selectia' | 'document.muta-selectia'; readonly dx?: number; readonly dy?: number };
const DEPARTE: readonly CazDeparte[] = [
  { nume: 'B1 Ctrl+D la x = 10⁷ − 10: copia ar sta la 10⁷ + 10', x: 1e7 - 10, y: 100, actiune: 'document.duplica-selectia' },
  { nume: 'B2 Ctrl+D la x = 10⁷ − 20: copia stă exact la 10⁷', x: 1e7 - 20, y: 100, actiune: 'document.duplica-selectia' },
  { nume: 'B3 Ctrl+D la y = −10⁷ + 10: copia ar sta la −10⁷ − 10', x: 100, y: -1e7 + 10, actiune: 'document.duplica-selectia' },
  { nume: 'B4 mutarea cu 15 mm de la x = 10⁷ − 10: ar ajunge la 10⁷ + 5', x: 1e7 - 10, y: 100, actiune: 'document.muta-selectia', dx: 15, dy: 0 },
  { nume: 'B5 mutarea cu 10 mm de la x = 10⁷ − 10: ajunge exact la 10⁷', x: 1e7 - 10, y: 100, actiune: 'document.muta-selectia', dx: 10, dy: 0 },
  { nume: 'B6 mutarea cu −30 mm pe y de la y = −10⁷ + 20: ar ajunge la −10⁷ − 10', x: 100, y: -1e7 + 20, actiune: 'document.muta-selectia', dx: 0, dy: -30 },
];

for (const c of DEPARTE) {
  test(`(p9) instanța peste 10⁷ mm (prea departe): ${c.nume}`, { skip: DOAR_V9 }, () => {
    const brut = docPieseCale([4]);
    const inst = (brut.foi[0]!.instante as Array<{ x: number; y: number }>)[0]!;
    inst.x = c.x;
    inst.y = c.y;
    assert.deepEqual(verificaV9(brut), [], 'oracolul: documentul de pornire e valid');
    const h0 = accepta(brut);
    let h = istoricNou(h0);
    let sel: readonly string[] = ['i0x0'];
    const ctx: ContextDocument = {
      istoric: () => h, scrie: (nou) => { h = nou; }, selectie: () => sel, selecteaza: (ids) => { sel = ids; },
      ...(c.actiune === 'document.muta-selectia' ? { deplasare: () => ({ dx: c.dx!, dy: c.dy! }) } : {}),
    };
    // Predicția oracolului: noua poziție (copia la +20 / −20, mutarea cu deplasarea) față de `PLAFON.translatie`.
    const nou = c.actiune === 'document.duplica-selectia' ? { x: c.x + 20, y: c.y - 20 } : { x: c.x + c.dx!, y: c.y + c.dy! };
    const incape = Math.abs(nou.x) <= PLAFOANE_O.translatie && Math.abs(nou.y) <= PLAFOANE_O.translatie;
    const doc0 = h.doc;
    const s = stare(registru, c.actiune, ctx);
    const r = ruleaza(registru, c.actiune, ctx);
    if (!incape) {
      assert.ok(!s.ok && String(s.motiv ?? '').length > 0, `acțiunea e activă, deși instanța ar ajunge la (${nou.x}, ${nou.y})`);
      assert.match(String(!s.ok ? s.motiv : ''), /departe/, 'motivul nu e „prea departe”');
      assert.equal(r.ok, false);
      assert.equal(h.doc, doc0, 'documentul s-a schimbat');
      return;
    }
    assert.deepEqual(s, { ok: true }, `acțiunea e inactivă, deși instanța ajunge doar la (${nou.x}, ${nou.y})`);
    assert.deepEqual(r, { ok: true });
    const pozitii = ((h.doc as unknown as Liber)['foi'] as Liber[]).flatMap((f) => (f['instante'] as Liber[]).map((i) => [i['x'], i['y']]));
    assert.ok(pozitii.some(([x, y]) => x === nou.x && y === nou.y), `nicio instanță la (${nou.x}, ${nou.y}): ${JSON.stringify(pozitii)}`);
    // Felia 2.3c-2: documentul de după acțiune e pe schema aplicației (10, ADR 0037), judecat de ușa oracolului pentru ea.
    assert.deepEqual(verificaSchemaApp(h.doc), [], 'ușa oracolului refuză documentul de după acțiune');
  });
}

for (const c of CAZURI) {
  test(`(p9) Ctrl+D și plafoanele căilor: ${c.nume}`, { skip: DOAR_V9 }, () => {
    const brut = docPieseCale(c.varfuri, c.instante ?? []);
    assert.deepEqual(verificaV9(brut), [], 'oracolul: documentul de pornire e valid');
    const ctx = context(accepta(brut));
    ctx.selecteaza(c.alese);
    const doc0 = ctx.h().doc;
    const pe = varfuriPePiesa(doc0);
    const piesaDe = new Map<string, string>();
    for (const f of (doc0 as unknown as Liber)['foi'] as Liber[]) for (const i of f['instante'] as Liber[]) piesaDe.set(i['id'] as string, i['piesa'] as string);
    // Predicția oracolului: fiecare instanță aleasă își copiază piesa (piesă nouă + instanță nouă).
    const adaos = c.alese.reduce((s, id) => s + (pe.get(piesaDe.get(id)!) ?? 0), 0);
    const inainte = { piese: varfuriDeCale(doc0), lume: varfuriInLume(doc0) };
    const prezis = { piese: inainte.piese + adaos, lume: inainte.lume + adaos };
    const incape = prezis.piese <= PLAFOANE_O.varfuri && prezis.lume <= PLAFOANE_O.varfuriLume;
    assert.equal(incape, c.activa, `predicția oracolului (${JSON.stringify(prezis)}) nu e cea a cazului`);
    const s = stare(registru, 'document.duplica-selectia', ctx);
    const r = ruleaza(registru, 'document.duplica-selectia', ctx);
    if (!incape) {
      assert.equal(s.ok, false, `Ctrl+D e activă, deși copia ar duce la ${JSON.stringify(prezis)}`);
      assert.ok(!s.ok && String(s.motiv ?? '').length > 0, 'starea inactivă n-are motiv');
      assert.equal(r.ok, false, 'Ctrl+D a rulat');
      assert.equal(ctx.h().doc, doc0, 'documentul s-a schimbat');
    } else {
      assert.deepEqual(s, { ok: true }, `Ctrl+D e inactivă, deși copia duce doar la ${JSON.stringify(prezis)}`);
      assert.deepEqual(r, { ok: true });
      const d1 = ctx.h().doc;
      assert.deepEqual({ piese: varfuriDeCale(d1), lume: varfuriInLume(d1) }, prezis, 'numărătorile de după copie');
      assert.equal(((d1 as unknown as Liber)['piese'] as unknown[]).length, ((doc0 as unknown as Liber)['piese'] as unknown[]).length + c.alese.length, 'câte o piesă nouă pe copie');
      assert.deepEqual(verificaSchemaApp(d1), [], 'ușa oracolului refuză documentul de după Ctrl+D');
      if (c.redeschide) {
        const re = incarca(JSON.parse(JSON.stringify(d1)));
        assert.ok(re.ok, `documentul de după Ctrl+D nu se mai deschide: ${re.ok ? '' : String(re.motiv)}`);
      }
    }
    if (c.cerc) assert.deepEqual(stare(registru, 'document.adauga-cerc', ctx), { ok: true }, 'un cerc nu adaugă vârfuri de cale');
  });
}
