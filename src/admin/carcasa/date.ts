/**
 * Carcasa paginii `/admin` (ADR 0260 §1, felia A.1), partea pură: bara laterală grupată și filele ei, părțile filei Azi pe
 * care le vede un rol, insigna instanței, punctul Diagnozei, întâmplările din audit și căutarea în ce s-a citit. Nimic de
 * aici nu citește: componentele aduc datele (prin aceleași reguli ca filele), iar aici se judecă.
 */
import { esteStare as esteStareSugestie, type StareSugestie } from '../../../shared/sugestii.ts';
import { esteStareTichet, type StareTichet } from '../../../shared/tichete.ts';
import type { Permisiune } from '../../../shared/personal.ts';
import type { Fila } from '../adresa.ts';
import type { Verificare } from '../diagnoza/verificari.ts';
import { dataDin, type Masura } from '../erori/date.ts';
import { fileVizibile } from '../personal/date.ts';

export type Grup = 'probleme' | 'produs' | 'clienti' | 'echipa';

/** Bara laterală: Azi sus, cele patru grupuri, Contul meu la capăt (ADR 0260 §1). */
export const BARA: readonly { readonly grup: Grup | null; readonly file: readonly Fila[] }[] = [
  { grup: null, file: ['azi'] },
  { grup: 'probleme', file: ['erori', 'tichete', 'diagnoza'] },
  { grup: 'produs', file: ['sugestii', 'roadmap', 'documentatie'] },
  { grup: 'clienti', file: ['utilizatori'] },
  { grup: 'echipa', file: ['personal', 'setari'] },
  { grup: null, file: ['cont'] },
];

/** Grupurile barei cu filele vizibile; un grup fără nicio filă vizibilă dispare. */
export function grupuriBarei(vizibile: readonly Fila[]): { readonly grup: Grup | null; readonly file: Fila[] }[] {
  return BARA.map((g) => ({ grup: g.grup, file: g.file.filter((f) => vizibile.includes(f)) })).filter((g) => g.file.length > 0);
}

/** Părțile filei Azi: cifrele (câte o filă), joburile de noapte, „Ce așteaptă de la tine”, ultimele întâmplări. */
export type ParteAzi = 'erori' | 'tichete' | 'sugestii' | 'conturi' | 'joburi' | 'asteapta' | 'intamplari';

/**
 * Ce parte din Azi vede rolul: o cifră doar dacă rolul vede fila ei (și citește tot ce numără: „fără decizie” numără toate
 * sugestiile, deci scrierea singură nu ajunge), joburile cu Diagnoza, „Ce așteaptă” doar owner-ul, întâmplările cu „Audit:
 * citește”.
 */
export function partiAzi(owner: boolean, permisiuni: ReadonlySet<Permisiune>): ReadonlySet<ParteAzi> {
  const are = (...p: Permisiune[]): boolean => owner || p.some((x) => permisiuni.has(x));
  const parti: [ParteAzi, boolean][] = [
    ['erori', are('erori.citeste')],
    ['tichete', are('tichete.citeste', 'tichete.raspunde')],
    ['sugestii', are('sugestii.citeste')],
    ['conturi', are('conturi.citeste', 'conturi.administreaza')],
    ['joburi', are('diagnoza.citeste')],
    ['asteapta', owner],
    ['intamplari', are('audit.citeste')],
  ];
  return new Set(parti.filter(([, da]) => da).map(([p]) => p));
}

/** Filele barei: Azi întâi (când rolul are ce urmări), apoi exact filele date de rol (`fileVizibile`). */
export function fileBarei(owner: boolean, permisiuni: ReadonlySet<Permisiune>): Fila[] {
  return [...(partiAzi(owner, permisiuni).size > 0 ? ['azi' as const] : []), ...fileVizibile(owner, permisiuni)];
}

/** Fila arătată: cea cerută, dacă rolul o vede; altfel prima filă a barei. */
export function filaAratata(ceruta: Fila, vizibile: readonly Fila[]): Fila {
  return vizibile.includes(ceruta) ? ceruta : vizibile[0] ?? 'cont';
}

/** Insigna din antet: TEST (albastră), LIVE (roșie), altceva (local) neutră. */
export function insigna(instanta: string): 'test' | 'live' | 'alta' {
  return instanta === 'test' || instanta === 'live' ? instanta : 'alta';
}

/** Punctul de lângă Diagnoză: roșu la un Eșec, galben la o Atenție. */
export function punctDiagnoza(v: readonly Verificare[] | null): 'esec' | 'atentie' | null {
  if (v === null) return null;
  return v.some((x) => x.stare === 'esec') ? 'esec' : v.some((x) => x.stare === 'atentie') ? 'atentie' : null;
}

export const joburiDin = (v: readonly Verificare[]): Verificare[] => v.filter((x) => x.id.startsWith('job:'));

/** Problemele Diagnozei în afara joburilor (Atenție sau Eșec). */
export const problemeDiagnoza = (v: readonly Verificare[]): Verificare[] =>
  v.filter((x) => !x.id.startsWith('job:') && (x.stare === 'atentie' || x.stare === 'esec'));

/** Numărul de lângă filă: o cifră citită, mai mare ca 0; una necitită nu se arată (niciodată ca 0). */
export const numarBara = (m: Masura<number> | undefined): number | null => (m?.ok === true && m.valoare > 0 ? m.valoare : null);

/* ── Ultimele întâmplări, din audit (ADR 0040 §4) ─────────────────────────────────────────────────────────────────── */

const FILA_COLECTIEI: ReadonlyMap<string, Fila> = new Map<string, Fila>([
  ['errorLogs', 'erori'], ['tichete', 'tichete'], ['sugestii', 'sugestii'], ['conturi', 'utilizatori'], ['staff', 'personal'],
  ['roluri', 'personal'], ['invitatiiPersonal', 'personal'], ['setari', 'setari'],
]);

/** Fila țintei unui rând de audit (`colectie/id`); o colecție necunoscută nu duce nicăieri. */
export const filaTintei = (tinta: string): Fila | null => FILA_COLECTIEI.get(tinta.split('/')[0] ?? '') ?? null;

export interface Intamplare {
  readonly id: string;
  readonly cand: Date | null;
  readonly actiune: string;
  readonly fila: Fila | null;
  /** Tu, un job programat, un client (fără rol de personal) sau altcineva din personal. */
  readonly cine: 'eu' | 'job' | 'client' | 'personal';
  readonly dupa: Readonly<Record<string, unknown>> | null;
}

export function intamplareDin(id: string, d: Readonly<Record<string, unknown>>, eu: string): Intamplare {
  const cine = typeof d['cine'] === 'string' ? d['cine'] : '';
  const dupa = d['dupa'];
  return {
    id, cand: dataDin(d['cand']), actiune: typeof d['actiune'] === 'string' ? d['actiune'] : '',
    fila: typeof d['tinta'] === 'string' ? filaTintei(d['tinta']) : null,
    cine: cine === eu ? 'eu' : cine.startsWith('job:') ? 'job' : d['rol'] === null || d['rol'] === undefined ? 'client' : 'personal',
    dupa: typeof dupa === 'object' && dupa !== null && !Array.isArray(dupa) ? dupa as Record<string, unknown> : null,
  };
}

export type CheieIntamplare =
  | { readonly cheie: 'admin.azi.ev.eroare-rezolvata' | 'admin.azi.ev.eroare-redeschisa' | 'admin.azi.ev.tichet-nou' | 'admin.azi.ev.tichet-raspuns'
    | 'admin.azi.ev.tichet-sters' | 'admin.azi.ev.cont-nou' | 'admin.azi.ev.cont-nume' | 'admin.azi.ev.cont-plan' | 'admin.azi.ev.personal'
    | 'admin.azi.ev.setari' | 'admin.azi.ev.alta' }
  | { readonly cheie: 'admin.azi.ev.tichet-stare'; readonly stare: StareTichet | null }
  | { readonly cheie: 'admin.azi.ev.sugestie-noua' | 'admin.azi.ev.sugestie-editata'; readonly titlu: string }
  | { readonly cheie: 'admin.azi.ev.sugestie-decisa'; readonly stare: StareSugestie | null };

/** Textul unei întâmplări: acțiunile cunoscute, cu valoarea de după; una necunoscută se spune cu numele ei. */
export function cheieIntamplare(i: Intamplare): CheieIntamplare {
  const d = i.dupa ?? {};
  const titlu = typeof d['titlu'] === 'string' ? d['titlu'] : '';
  switch (i.actiune) {
    case 'erori.marcheaza': return { cheie: d['rezolvat'] === true ? 'admin.azi.ev.eroare-rezolvata' : 'admin.azi.ev.eroare-redeschisa' };
    case 'tichete.raporteaza': return { cheie: 'admin.azi.ev.tichet-nou' };
    case 'tichete.raspunde': return { cheie: 'admin.azi.ev.tichet-raspuns' };
    case 'tichete.stare': return { cheie: 'admin.azi.ev.tichet-stare', stare: esteStareTichet(d['stare']) ? d['stare'] : null };
    case 'tichete.sterge': return { cheie: 'admin.azi.ev.tichet-sters' };
    case 'sugestii.scrie': return { cheie: 'admin.azi.ev.sugestie-noua', titlu };
    case 'sugestii.editeaza': return { cheie: 'admin.azi.ev.sugestie-editata', titlu };
    case 'sugestii.decide': return { cheie: 'admin.azi.ev.sugestie-decisa', stare: esteStareSugestie(d['stare']) ? d['stare'] : null };
    case 'conturi.creeaza': return { cheie: 'admin.azi.ev.cont-nou' };
    case 'conturi.nume': return { cheie: 'admin.azi.ev.cont-nume' };
    default:
      if (i.actiune.startsWith('conturi.')) return { cheie: 'admin.azi.ev.cont-plan' };
      if (i.actiune.startsWith('personal.')) return { cheie: 'admin.azi.ev.personal' };
      if (i.actiune.startsWith('setari.')) return { cheie: 'admin.azi.ev.setari' };
      return { cheie: 'admin.azi.ev.alta' };
  }
}

/* ── Căutarea din antet, în ce s-a citit (ADR 0260 §1; căutarea pe server rămâne mai târziu, ADR 0116) ────────────── */

export type FelGasit = 'erori' | 'tichete' | 'conturi';
export const FELURI_GASITE: readonly FelGasit[] = ['erori', 'tichete', 'conturi'];
export const FILA_FELULUI: Readonly<Record<FelGasit, Fila>> = { erori: 'erori', tichete: 'tichete', conturi: 'utilizatori' };

/** Un rând citit de o filă, cum îl caută antetul: id-ul (și ținta), textul, detaliul. */
export interface Gasibil {
  readonly id: string;
  readonly text: string;
  readonly detaliu: string;
  /** La erori: grupul e rezolvat (fila îl deschide cu filtrul „Toate”). */
  readonly rezolvat?: boolean;
}

/** Textul de comparat: fără diacritice, cu litere mici. */
export const simplu = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Rândurile găsite, pe feluri, cel mult `max` pe fel; sub 2 litere, nimic. Un fel necitit nu dă rânduri. */
export function cauta(q: string, surse: ReadonlyMap<FelGasit, readonly Gasibil[]>, max = 5): { readonly fel: FelGasit; readonly randuri: readonly Gasibil[] }[] {
  const c = simplu(q.trim());
  if (c.length < 2) return [];
  return FELURI_GASITE.flatMap((fel) => {
    const randuri = (surse.get(fel) ?? []).filter((g) => simplu(`${g.id} ${g.text} ${g.detaliu}`).includes(c)).slice(0, max);
    return randuri.length > 0 ? [{ fel, randuri }] : [];
  });
}

/* ── Ultima rezolvare, pentru lista goală (ideea 76) ─────────────────────────────────────────────────────────────── */

export function ceaMaiRecenta(date: readonly (Date | null)[]): Date | null {
  let m: Date | null = null;
  for (const d of date) if (d !== null && (m === null || d.getTime() > m.getTime())) m = d;
  return m;
}

/** Un grup de erori dă data marcării (`marcatLa`) doar dacă e rezolvat. */
export const rezolvareDin = (d: Readonly<Record<string, unknown>>): Date | null => (d['rezolvat'] === true ? dataDin(d['marcatLa']) : null);
