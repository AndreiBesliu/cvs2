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
 * Migrările pure, vN → vN+1. Cheia e versiunea de PLECARE. Lista crește; o migrare scrisă nu se mai schimbă. Fiecare
 * își validează intrarea cu schema înghețată a versiunii ei, ca să lucreze doar pe forma pe care o promite.
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
};

/**
 * Plafoanele arborelui, verificate iterativ ÎNAINTE de schemă: parserul e recursiv, iar un document cu 100 000 de
 * niveluri i-ar umple stiva. Un ciclu (posibil doar din cod) se oprește și el la plafonul de adâncime.
 */
function arboreInMargini(doc: Brut): string | null {
  const piese = doc['piese'];
  if (!Array.isArray(piese)) return null;
  let noduri = 0;
  for (const p of piese) {
    const radacina = typeof p === 'object' && p !== null ? (p as Brut)['radacina'] : undefined;
    const stiva: Array<{ nod: unknown; adancime: number }> = [{ nod: radacina, adancime: 1 }];
    while (stiva.length > 0) {
      const x = stiva.pop();
      if (!x || typeof x.nod !== 'object' || x.nod === null) continue;
      if (x.adancime > PLAFON.adancime) return `o piesă trece de ${PLAFON.adancime} de niveluri`;
      if (++noduri > PLAFON.noduri) return `documentul trece de ${PLAFON.noduri} de noduri`;
      // Doar grupurile au copii: un câmp necunoscut `copii` pe un element nu e arbore.
      const copii = (x.nod as Brut)['tip'] === 'grup' ? (x.nod as Brut)['copii'] : undefined;
      if (Array.isArray(copii)) for (const c of copii) stiva.push({ nod: c, adancime: x.adancime + 1 });
    }
  }
  return null;
}

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
  const margini = arboreInMargini(doc);
  if (margini) return { ok: false, motiv: `documentul nu respectă schema: ${margini}` };
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
