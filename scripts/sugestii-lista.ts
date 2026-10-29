/**
 * Lista sugestiilor pentru asistent (ADR 0107 §7): documentele din `sugestii`, citite prin API-ul REST al Firestore (toate
 * paginile), devin aceleași rânduri ca în fila Sugestii (`sugestieDin`), apoi textul de citit la începutul unei sesiuni.
 * Pure față de client (injectat în teste).
 */
import { COLECTIE_SUGESTII, type StareSugestie } from '../shared/sugestii.ts';
import { ordoneaza, sugestieDin, type Sugestie } from '../src/admin/sugestii/date.ts';
import { dinFirestore } from './amprenta.ts';
import type { ClientApi } from './firebase-api.ts';

/** Câte documente cere o pagină; plafonul paginilor e o plasă, nu o limită a listei (ADR 0107, „Se redeschide dacă”). */
export const PAGINA = 300;
export const PAGINI_MAX = 20;

/** Ce citește asistentul: ce a acceptat owner-ul („de făcut”) și ce e în lucru. */
export const STARI_DE_FACUT: readonly StareSugestie[] = ['acceptata', 'in-lucru'];

/** Un câmp REST în forma rândurilor filei: o dată (`timestampValue`) primește `toDate()`, ca un `Timestamp`. */
function campDin(v: unknown): unknown {
  if (typeof v === 'object' && v !== null && 'timestampValue' in v) {
    const d = new Date(String((v as { timestampValue: unknown }).timestampValue));
    return { toDate: () => d };
  }
  return dinFirestore(v);
}

/** Un document REST (`name`, `fields`) ca rând; fără nume, null. */
export function sugestieDinRest(doc: unknown): Sugestie | null {
  if (typeof doc !== 'object' || doc === null) return null;
  const { name, fields } = doc as { name?: unknown; fields?: unknown };
  if (typeof name !== 'string' || name === '') return null;
  const campuri = typeof fields === 'object' && fields !== null ? Object.entries(fields) : [];
  return sugestieDin(name.slice(name.lastIndexOf('/') + 1), Object.fromEntries(campuri.map(([k, v]) => [k, campDin(v)])));
}

/** Toate sugestiile unui proiect, cele mai noi întâi; peste plafonul paginilor aruncă (nu întoarce o listă tăiată). */
export async function citesteSugestii(client: ClientApi, proiect: string): Promise<Sugestie[]> {
  const toate: Sugestie[] = [];
  let urmatoarea: string | undefined;
  for (let i = 0; i < PAGINI_MAX; i++) {
    const q = new URLSearchParams({ pageSize: String(PAGINA) });
    if (urmatoarea) q.set('pageToken', urmatoarea);
    const r = await client.get(`/projects/${proiect}/databases/(default)/documents/${COLECTIE_SUGESTII}`, { queryParams: q });
    const corp = (typeof r.body === 'object' && r.body !== null ? r.body : {}) as { documents?: unknown; nextPageToken?: unknown };
    for (const d of Array.isArray(corp.documents) ? corp.documents : []) {
      const s = sugestieDinRest(d);
      if (s) toate.push(s);
    }
    urmatoarea = typeof corp.nextPageToken === 'string' && corp.nextPageToken !== '' ? corp.nextPageToken : undefined;
    if (!urmatoarea) return ordoneaza(toate);
  }
  throw new Error(`mai mult de ${PAGINA * PAGINI_MAX} de sugestii: citirea cere altă formă (ADR 0107)`);
}

const zi = (d: Date | null): string => (d ? d.toISOString().slice(0, 10) : '?');

/** Textul pentru asistent: câte un paragraf pe sugestie (starea, titlul, tipul, zona, autorul, ziua, id-ul; textul; nota). */
export function textSugestii(lista: readonly Sugestie[], toate: boolean): string {
  const alese = toate ? lista : lista.filter((s) => s.stare !== null && STARI_DE_FACUT.includes(s.stare));
  if (alese.length === 0) return toate ? 'Nicio sugestie.' : 'Nicio sugestie acceptată sau în lucru.';
  return alese.map((s) => [
    `- [${s.stare ?? '?'}] ${s.titlu} (${s.tip ?? '?'}, ${s.zona ?? 'nespecificată'}; ${s.autorEmail ?? s.autor ?? '?'}, ${zi(s.creataLa)}; ${s.id})`,
    ...(s.descriere ? s.descriere.split('\n').map((r) => `    ${r}`) : []),
    ...(s.nota ? [`    Nota owner-ului: ${s.nota.split('\n').join(' / ')}`] : []),
  ].join('\n')).join('\n');
}
