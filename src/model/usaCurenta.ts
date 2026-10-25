import * as v from 'valibot';
import { esteSimilitudine, TOLERANTA_SIMILITUDINE_LUME } from '../geom/matrice.ts';
import { areArce, noduriPiesa, PLAFON, VERSIUNE_SCHEMA, type Document } from './document.ts';
import { SchemaDocument } from './schemaDocument.ts';
import { elementeInstanta, matriceInstanta } from './lume.ts';

/**
 * Ușa documentului curent (ADR 0070): verificările ușii unice (T16, `incarcare.ts`), cu migrările date de apelant.
 * Pornirea aduce doar modulul acesta pentru un proiect salvat de versiunea curentă (cazul obișnuit); migrările
 * (`migrari.ts`) vin abia pentru un document mai vechi (`incarcaCurent` întoarce null).
 */
export type RezultatIncarcare = { readonly ok: true; readonly doc: Document } | { readonly ok: false; readonly motiv: string };

export type Brut = Record<string, unknown>;
export type Migrare = (doc: Brut) => { readonly ok: true; readonly doc: Brut } | { readonly ok: false; readonly motiv: string };

export function motivSchema(issues: readonly v.BaseIssue<unknown>[]): string {
  const p = issues[0];
  const cale = p?.path?.map((x) => String(x.key)).join('.') ?? '';
  return `${cale ? ` la ${cale}` : ''}: ${p?.message ?? '?'}`;
}

/**
 * Un element cu arce sub o matrice în lume care nu e similitudine (ADR 0034 §2, recenzia 2.7b), sau null. Ușa judecă
 * matricea din piesă la 1e-12, dar lumea compune altfel (de la instanță în jos, cu rotirea ei), iar un grup neuniform
 * compensat de element rotunjește diferit: pânza și CAM-ul ar arunca la fiecare pornire. Aici se judecă matricile pe care
 * le vor folosi consumatorii, cu aceeași funcție și aceeași toleranță; partea liniară depinde doar de piesă și de rotire.
 */
function arceNeuniformeInLume(d: Document): string | null {
  const cuArce = new Map(d.piese
    .filter((p) => noduriPiesa(p.radacina).some(({ nod }) => nod.tip === 'element' && areArce(nod.forma)))
    .map((p) => [p.id, p]));
  const judecate = new Set<string>();
  for (const f of d.foi) {
    for (const i of f.instante) {
      const p = cuArce.get(i.piesa);
      const cheie = `${i.piesa} ${i.rotire}`;
      if (!p || judecate.has(cheie)) continue;
      judecate.add(cheie);
      for (const e of elementeInstanta(p.radacina, i, matriceInstanta(i))) {
        if (areArce(e.forma) && !esteSimilitudine(e.matrice, TOLERANTA_SIMILITUDINE_LUME)) {
          return `instanța ${i.id}: ${e.nod} are arce sub o matrice neuniformă în lume`;
        }
      }
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

/** Ușa, cu migrările date (cheia = versiunea de plecare). `incarcare.ts` îi dă toate migrările. */
export function incarcaCu(brut: unknown, migrari: Readonly<Record<number, Migrare>>): RezultatIncarcare {
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
    const migrare = migrari[n];
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
  const lume = arceNeuniformeInLume(doc as Document);
  if (lume) return { ok: false, motiv: `documentul nu respectă schema: ${lume}` };
  // Documentul întors e o copie a intrării validate, nu ieșirea valibot: aceea scoate tăcut cheile `__proto__`,
  // `constructor` și `prototype`, iar contractul păstrează câmpurile necunoscute. Copia le ține ca date simple.
  return { ok: true, doc: structuredClone(doc) as Document };
}


/**
 * Ușa unui document al versiunii curente (sau al uneia mai noi, ori fără versiune: refuzul nu cere migrări); null =
 * documentul e mai vechi, deci îi trebuie migrările (`incarca` din `incarcare.ts`).
 */
export function incarcaCurent(brut: unknown): RezultatIncarcare | null {
  const s = typeof brut === 'object' && brut !== null ? (brut as Brut)['schema'] : undefined;
  return typeof s === 'number' && s >= 1 && s < VERSIUNE_SCHEMA ? null : incarcaCu(brut, {});
}
