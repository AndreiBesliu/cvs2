import * as v from 'valibot';
import { PLAFON, SchemaDocument, VERSIUNE_SCHEMA, type Document } from './document.ts';
import { SchemaDocumentV1, type DocumentV1 } from './schemaV1.ts';

/**
 * Singura ușă de încărcare (T16): orice document, din fișier, din IndexedDB sau din cloud, intră doar pe aici.
 * 1. versiunea: una mai veche trece prin migrările pure, una mai nouă e refuzată (nu ghicim ce n-am scris);
 * 2. schema, cu plafoanele ei;
 * 3. rezultatul e documentul curent, sau un motiv scris.
 */
export type RezultatIncarcare = { readonly ok: true; readonly doc: Document } | { readonly ok: false; readonly motiv: string };

type Brut = Record<string, unknown>;
type Migrare = (doc: Brut) => { readonly ok: true; readonly doc: Brut } | { readonly ok: false; readonly motiv: string };

function motivSchema(issues: readonly v.BaseIssue<unknown>[]): string {
  const p = issues[0];
  const cale = p?.path?.map((x) => String(x.key)).join('.') ?? '';
  return `${cale ? ` la ${cale}` : ''}: ${p?.message ?? '?'}`;
}

/**
 * v1 → v2 (ADR 0024): fiecare element devine o piesă cu o singură instanță, ambele cu id-ul elementului. Translația
 * matricei trece pe instanță, restul rămâne pe element, deci matricea în lume e numeric aceeași (instanța are rotirea 0).
 * Câmpurile necunoscute rămân: ale elementului pe elementul-rădăcină, ale matricei pe matrice, ale foii pe `stoc`, cele
 * de sus pe document. Primește intrarea BRUTĂ, deja validată: ieșirea valibot ar fi scos tăcut cheile `__proto__`,
 * `constructor` și `prototype`.
 */
function v1v2(doc: DocumentV1): Brut {
  const { schema: _schema, rev, foaie, elemente, ...restDoc } = doc;
  const piese: Brut[] = [];
  const instante: Brut[] = [];
  for (const el of elemente) {
    const { id, nume, matrice, ...restEl } = el;
    piese.push({
      id,
      ...(nume === undefined ? {} : { nume }),
      radacina: { ...restEl, tip: 'element', id, matrice: { ...matrice, e: 0, f: 0 } },
    });
    instante.push({ id, piesa: id, x: matrice.e, y: matrice.f, rotire: 0 });
  }
  return { ...restDoc, schema: 2, rev, piese, foi: [{ id: 'f1', stoc: foaie, instante }] };
}

/**
 * v2 → v3 (ADR 0025): fiecare piesă primește câte o operație de profil pe fiecare element al ei, în preordine, cu exact
 * implicitele cu care aplicația v2 exporta. ÎNGHEȚATĂ: are propria copie a implicitelor (operația implicită a aplicației
 * poate evolua, migrarea nu). Lucrează defensiv pe orice formă: nu adaugă nimic din ce schema v3 n-ar refuza oricum, iar
 * v3 conține toate regulile v2, deci un v2 stricat rămâne stricat și e refuzat după migrare.
 */
function v2v3(doc: Brut): ReturnType<Migrare> {
  const piese = doc['piese'];
  if (!Array.isArray(piese)) return { ok: true, doc: { ...doc, schema: 3 } };
  const noi: unknown[] = [];
  for (const p of piese) {
    if (typeof p !== 'object' || p === null || Array.isArray(p)) {
      noi.push(p);
      continue;
    }
    const piesa = p as Brut;
    if (Object.hasOwn(piesa, 'operatii')) {
      return { ok: false, motiv: `piesa v2 ${String(piesa['id'])} are câmpul „operatii”, pe care v3 îl folosește: nu se poate migra fără să-l piardă` };
    }
    const operatii: Brut[] = [];
    const stiva: unknown[] = [piesa['radacina']];
    while (stiva.length > 0) {
      const nod = stiva.pop();
      if (typeof nod !== 'object' || nod === null) continue;
      const n = nod as Brut;
      if (n['tip'] === 'element') {
        const forma = n['forma'] as Brut | undefined;
        const scula = { numar: 1, nume: 'freza plata', diametru: 6 };
        if (forma?.['tip'] === 'cerc') {
          operatii.push({ id: n['id'], tip: 'profil', noduri: [n['id']], scula, latura: 'interior', adancime: 8, pas: 4 });
        } else if (forma?.['tip'] === 'dreptunghi') {
          operatii.push({ id: n['id'], tip: 'profil', noduri: [n['id']], scula, latura: 'exterior', adancime: 3, pas: 3 });
        }
      } else if (n['tip'] === 'grup' && Array.isArray(n['copii'])) {
        for (let k = n['copii'].length - 1; k >= 0; k--) stiva.push(n['copii'][k]);
      }
    }
    noi.push({ ...piesa, operatii });
  }
  return { ok: true, doc: { ...doc, schema: 3, piese: noi } };
}

/**
 * v3 → v4 (ADR 0027): fiecare operație primește `sens: 'urcare'`, implicitul owner-ului. Defensivă, ca v2 → v3: o
 * operație care are deja un câmp `sens` e o ciocnire de nume și e refuzată; restul formelor le judecă schema v4.
 */
function v3v4(doc: Brut): ReturnType<Migrare> {
  const piese = doc['piese'];
  if (!Array.isArray(piese)) return { ok: true, doc: { ...doc, schema: 4 } };
  const noi: unknown[] = [];
  for (const p of piese) {
    if (typeof p !== 'object' || p === null || Array.isArray(p) || !Array.isArray((p as Brut)['operatii'])) {
      noi.push(p);
      continue;
    }
    const piesa = p as Brut;
    const operatii: unknown[] = [];
    for (const o of piesa['operatii'] as unknown[]) {
      if (typeof o !== 'object' || o === null || Array.isArray(o)) {
        operatii.push(o);
        continue;
      }
      if (Object.hasOwn(o, 'sens')) {
        return { ok: false, motiv: `operația v3 ${String((o as Brut)['id'])} din piesa ${String(piesa['id'])} are câmpul „sens”, pe care v4 îl folosește: nu se poate migra fără să-l piardă` };
      }
      operatii.push({ ...(o as Brut), sens: 'urcare' });
    }
    noi.push({ ...piesa, operatii });
  }
  return { ok: true, doc: { ...doc, schema: 4, piese: noi } };
}

/**
 * v4 → v5 (ADR 0028): fiecare operație primește `urechi: null`, adică fără urechi, deci programul rămâne același octet cu
 * octet. Defensivă, ca v3 → v4: o operație care are deja un câmp `urechi` e o ciocnire de nume și e refuzată.
 */
function v4v5(doc: Brut): ReturnType<Migrare> {
  const piese = doc['piese'];
  if (!Array.isArray(piese)) return { ok: true, doc: { ...doc, schema: 5 } };
  const noi: unknown[] = [];
  for (const p of piese) {
    if (typeof p !== 'object' || p === null || Array.isArray(p) || !Array.isArray((p as Brut)['operatii'])) {
      noi.push(p);
      continue;
    }
    const piesa = p as Brut;
    const operatii: unknown[] = [];
    for (const o of piesa['operatii'] as unknown[]) {
      if (typeof o !== 'object' || o === null || Array.isArray(o)) {
        operatii.push(o);
        continue;
      }
      if (Object.hasOwn(o, 'urechi')) {
        return { ok: false, motiv: `operația v4 ${String((o as Brut)['id'])} din piesa ${String(piesa['id'])} are câmpul „urechi”, pe care v5 îl folosește: nu se poate migra fără să-l piardă` };
      }
      operatii.push({ ...(o as Brut), urechi: null });
    }
    noi.push({ ...piesa, operatii });
  }
  return { ok: true, doc: { ...doc, schema: 5, piese: noi } };
}

/**
 * Migrările pure, vN → vN+1. Cheia e versiunea de PLECARE. Lista crește; o migrare scrisă nu se mai schimbă. Fiecare
 * lucrează doar pe forma pe care o promite: v1 → v2 își validează intrarea cu schema v1 înghețată; v2 → v3, v3 → v4 și
 * v4 → v5 lucrează defensiv, iar schema curentă (care conține toate regulile de dinainte) judecă rezultatul.
 */
export const MIGRARI: Readonly<Record<number, Migrare>> = {
  1: (brut) => {
    const r = v.safeParse(SchemaDocumentV1, brut);
    if (!r.success) return { ok: false, motiv: `documentul v1 nu respectă schema${motivSchema(r.issues)}` };
    // Un câmp necunoscut cu numele unui câmp din v2 s-ar pierde în migrare: refuzat, cu motiv, nu acoperit (ADR 0024).
    for (const k of ['piese', 'foi'] as const) {
      if (Object.hasOwn(brut, k)) return { ok: false, motiv: `documentul v1 are câmpul „${k}”, pe care v2 îl folosește: nu se poate migra fără să-l piardă` };
    }
    const elemente = (brut as unknown as DocumentV1).elemente;
    const ciocnire = elemente.find((e) => Object.hasOwn(e, 'tip'));
    if (ciocnire) return { ok: false, motiv: `elementul v1 ${ciocnire.id} are câmpul „tip”, pe care v2 îl folosește: nu se poate migra fără să-l piardă` };
    return { ok: true, doc: v1v2(brut as unknown as DocumentV1) };
  },
  2: v2v3,
  3: v3v4,
  4: v4v5,
};

/** Câte niveluri de imbricare are o valoare JSON (documentul însuși e nivelul 1). Iterativ, oprit la `max + 1`. */
function imbricare(x: unknown, max: number): number {
  let cel = 0;
  const stiva: Array<{ readonly v: unknown; readonly n: number }> = [{ v: x, n: 1 }];
  while (stiva.length > 0) {
    const e = stiva.pop();
    if (!e || typeof e.v !== 'object' || e.v === null) continue;
    cel = Math.max(cel, e.n);
    if (cel > max) return cel;
    for (const c of Object.values(e.v)) if (typeof c === 'object' && c !== null) stiva.push({ v: c, n: e.n + 1 });
  }
  return cel;
}

export function incarca(brut: unknown): RezultatIncarcare {
  if (typeof brut !== 'object' || brut === null || Array.isArray(brut)) return { ok: false, motiv: 'documentul nu e un obiect' };
  // Un câmp necunoscut foarte adânc ar trece de schemă (care nu coboară în el) și ar umple stiva la JSON-ul canonic.
  if (imbricare(brut, PLAFON.imbricareJson) > PLAFON.imbricareJson) {
    return { ok: false, motiv: `documentul are peste ${PLAFON.imbricareJson} de niveluri de imbricare` };
  }
  let doc = brut as Brut;
  const versiune = doc['schema'];
  if (typeof versiune !== 'number' || !Number.isInteger(versiune) || versiune < 1) {
    return { ok: false, motiv: 'documentul n-are o versiune de schemă validă' };
  }
  if (versiune > VERSIUNE_SCHEMA) {
    return { ok: false, motiv: `documentul e scris de o versiune mai nouă (schema ${versiune}, aici ${VERSIUNE_SCHEMA}): actualizează aplicația` };
  }
  for (let n = versiune; n < VERSIUNE_SCHEMA; n++) {
    const migrare = MIGRARI[n];
    if (!migrare) return { ok: false, motiv: `lipsește migrarea ${n} → ${n + 1}` };
    const r = migrare(doc);
    if (!r.ok) return r;
    doc = r.doc;
  }
  // Migrarea poate adânci documentul (un câmp al foii v1 ajunge pe `foi[0].stoc`): imbricarea se judecă și pe rezultat,
  // altfel ușa ar primi acum un document pe care nu l-ar mai redeschide după salvare.
  if (versiune < VERSIUNE_SCHEMA && imbricare(doc, PLAFON.imbricareJson) > PLAFON.imbricareJson) {
    return { ok: false, motiv: `documentul migrat are peste ${PLAFON.imbricareJson} de niveluri de imbricare` };
  }
  const r = v.safeParse(SchemaDocument, doc);
  if (!r.success) return { ok: false, motiv: `documentul nu respectă schema${motivSchema(r.issues)}` };
  // Documentul întors e o copie a intrării validate, nu ieșirea valibot: aceea scoate tăcut cheile `__proto__`,
  // `constructor` și `prototype`, iar contractul păstrează câmpurile necunoscute. Copia le ține ca date simple.
  return { ok: true, doc: structuredClone(doc) as Document };
}

/** JSON canonic: cheile sortate la fiecare nivel, deci același document dă aceiași octeți (și același hash). */
export function jsonCanonic(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(jsonCanonic).join(',')}]`;
  if (x !== null && typeof x === 'object') {
    const o = x as Record<string, unknown>;
    return `{${Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${jsonCanonic(o[k])}`).join(',')}}`;
  }
  if (typeof x === 'number' && !Number.isFinite(x)) throw new RangeError(`un număr nefinit (${x}) nu intră în document`);
  return JSON.stringify(x);
}
