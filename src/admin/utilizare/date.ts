import type { CatalogActiuni } from '../../../shared/documentatie.ts';
import {
  estimeaza, P_ACTIUNE, P_OAMENI, PASI_PALNIE, RE_ZI, schitaDin, schitaNoua, uneste, type Numere, type PasPalnie, type Schita, type SumaCalcul,
  type SumaDialog, type SumaSecventa,
} from '../../../shared/utilizareZi.ts';

/**
 * Fila Utilizare (ADR 0262 §6, felia A.9b), partea pură: sumele zilelor unei perioade, adunate (numerele) și unite (schițele
 * oamenilor, prin maximul pe registru), apoi ce arată fila: cifrele, acțiunile cele mai folosite (din butoane sau din taste
 * și paletă), ce nu se folosește (din catalogul generat la build: și ce n-a folosit nimeni), frecările (refuzurile cu
 * motivul, dialogurile părăsite) și duratele (mediana și cele mai lente 5 %, din treptele lor). Un document al zilei cu altă
 * formă se sare: fila citește ce poate, nu cade.
 */

export const PERIOADE = [7, 30, 90] as const;
export type Perioada = (typeof PERIOADE)[number];
export const ALEGERI_SEGMENT = ['clienti', 'personal', 'toti'] as const;
export type AlegereSegment = (typeof ALEGERI_SEGMENT)[number];

export interface ActiuneInPerioada { n: number; ok: number; de: Numere; motive: Numere; oameni: Schita }
export interface UnealtaInPerioada { n: number; de: Numere; oameni: Schita }

/** Sumele unei perioade, pe segmentul ales. */
export interface SumePerioada {
  zile: number;
  oameni: Schita;
  sesiuni: number;
  evenimente: number;
  aruncate: number;
  durataSesiune: Numere;
  actiuni: Map<string, ActiuneInPerioada>;
  unelte: Map<string, UnealtaInPerioada>;
  ferestre: Numere;
  dialoguri: Map<string, SumaDialog>;
  clicuri: Numere;
  calcule: Map<string, SumaCalcul>;
  masina: Numere;
  coduriMasina: Numere;
  imprimanta: Numere;
  coduriImprimanta: Numere;
  /** Secvențele (A.10), adunate pe zile: de câte ori și în câte sesiuni. */
  secvente: Map<string, SumaSecventa>;
  /** Pâlnia (A.10), pe pași: sesiunile adunate, oamenii uniți. */
  palnie: { sesiuni: number; oameni: Schita }[];
}

const obiect = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const numar = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : 0);
function adunaNumere(tinta: Numere, x: unknown): void {
  if (!obiect(x)) return;
  for (const [k, v] of Object.entries(x)) tinta[k] = (tinta[k] ?? 0) + numar(v);
}
function unesteIn(s: Schita, x: unknown, p: number): Schita {
  const alta = schitaDin(x, p);
  return alta ? uneste(s, alta) : s;
}

/** Ziua (`AAAA-LL-ZZ`) de cu `n` zile înainte, după calendar (perioada: ziua de ieri și cele n − 1 dinaintea ei). */
export function primaZi(azi: string, n: number): string {
  const [a, l, z] = azi.split('-').map(Number);
  return new Date(Date.UTC(a ?? 0, (l ?? 1) - 1, (z ?? 1) - n)).toISOString().slice(0, 10);
}

/** Pură: sumele perioadei din documentele zilelor (oricâte, în orice ordine), pe segmentul ales. */
export function sumePerioada(zile: readonly unknown[], alegere: AlegereSegment): SumePerioada {
  const r: SumePerioada = {
    zile: 0, oameni: schitaNoua(P_OAMENI), sesiuni: 0, evenimente: 0, aruncate: 0, durataSesiune: {}, actiuni: new Map(), unelte: new Map(),
    ferestre: {}, dialoguri: new Map(), clicuri: {}, calcule: new Map(), masina: {}, coduriMasina: {}, imprimanta: {}, coduriImprimanta: {},
    secvente: new Map(), palnie: PASI_PALNIE.map(() => ({ sesiuni: 0, oameni: schitaNoua(P_OAMENI) })),
  };
  for (const d of zile) {
    if (!obiect(d) || typeof d['zi'] !== 'string' || !RE_ZI.test(d['zi']) || !obiect(d['segmente'])) continue;
    r.zile++;
    const segmente = d['segmente'];
    for (const nume of alegere === 'toti' ? ['clienti', 'personal'] : [alegere]) {
      const s = segmente[nume];
      if (!obiect(s)) continue;
      r.oameni = unesteIn(r.oameni, s['oameni'], P_OAMENI);
      r.sesiuni += numar(s['sesiuni']);
      r.evenimente += numar(s['evenimente']);
      r.aruncate += numar(s['aruncate']);
      adunaNumere(r.durataSesiune, s['durataSesiune']);
      if (obiect(s['actiuni'])) {
        for (const [id, a] of Object.entries(s['actiuni'])) {
          if (!obiect(a)) continue;
          const x = r.actiuni.get(id) ?? { n: 0, ok: 0, de: {}, motive: {}, oameni: schitaNoua(P_ACTIUNE) };
          x.n += numar(a['n']);
          x.ok += numar(a['ok']);
          adunaNumere(x.de, a['de']);
          adunaNumere(x.motive, a['motive']);
          x.oameni = unesteIn(x.oameni, a['oameni'], P_ACTIUNE);
          r.actiuni.set(id, x);
        }
      }
      if (obiect(s['unelte'])) {
        for (const [id, u] of Object.entries(s['unelte'])) {
          if (!obiect(u)) continue;
          const x = r.unelte.get(id) ?? { n: 0, de: {}, oameni: schitaNoua(P_ACTIUNE) };
          x.n += numar(u['n']);
          adunaNumere(x.de, u['de']);
          x.oameni = unesteIn(x.oameni, u['oameni'], P_ACTIUNE);
          r.unelte.set(id, x);
        }
      }
      if (obiect(s['dialoguri'])) {
        for (const [id, x] of Object.entries(s['dialoguri'])) {
          if (!obiect(x)) continue;
          const y = r.dialoguri.get(id) ?? { deschis: 0, gata: 0, renuntat: 0 };
          y.deschis += numar(x['deschis']);
          y.gata += numar(x['gata']);
          y.renuntat += numar(x['renuntat']);
          r.dialoguri.set(id, y);
        }
      }
      if (obiect(s['calcule'])) {
        for (const [id, x] of Object.entries(s['calcule'])) {
          if (!obiect(x)) continue;
          const y = r.calcule.get(id) ?? { ok: 0, eroare: 0, anulat: 0, ms: {} };
          y.ok += numar(x['ok']);
          y.eroare += numar(x['eroare']);
          y.anulat += numar(x['anulat']);
          adunaNumere(y.ms, x['ms']);
          r.calcule.set(id, y);
        }
      }
      adunaNumere(r.ferestre, s['ferestre']);
      adunaNumere(r.clicuri, s['clicuri']);
      adunaNumere(r.masina, s['masina']);
      adunaNumere(r.coduriMasina, s['coduriMasina']);
      adunaNumere(r.imprimanta, s['imprimanta']);
      adunaNumere(r.coduriImprimanta, s['coduriImprimanta']);
      if (obiect(s['secvente'])) {
        for (const [k, x] of Object.entries(s['secvente'])) {
          if (!obiect(x)) continue;
          const y = r.secvente.get(k) ?? { n: 0, s: 0 };
          y.n += numar(x['n']);
          y.s += numar(x['s']);
          r.secvente.set(k, y);
        }
      }
      if (obiect(s['palnie'])) {
        const palnie = s['palnie'];
        PASI_PALNIE.forEach((pas, i) => {
          const x = palnie[pas];
          const y = r.palnie[i];
          if (!obiect(x) || !y) return;
          y.sesiuni += numar(x['sesiuni']);
          y.oameni = unesteIn(y.oameni, x['oameni'], P_OAMENI);
        });
      }
    }
  }
  return r;
}

/** Câți oameni (aproximativ, rotunjit). */
export const oameni = (s: Schita): number => Math.round(estimeaza(s));

export interface Cifre {
  readonly oameni: number; readonly sesiuni: number; readonly durata: number | null; readonly exporturi: number; readonly refuzate: number;
}
/**
 * Cifrele de sus: oamenii activi, sesiunile, durata unei sesiuni (mediana, ca treaptă în minute), programele G-code exportate
 * (calculele de export reușite), acțiunile refuzate.
 */
export function cifre(p: SumePerioada): Cifre {
  let refuzate = 0;
  for (const a of p.actiuni.values()) refuzate += Math.max(0, a.n - a.ok);
  return {
    oameni: oameni(p.oameni), sesiuni: p.sesiuni, durata: cuantila(p.durataSesiune, 0.5), exporturi: p.calcule.get('export')?.ok ?? 0, refuzate,
  };
}

/** Sursele unui gest pornit din taste sau din paletă (scurtăturile); restul sunt butoanele (bara, panoul, meniul, pânza). */
const DIN_TASTE: readonly string[] = ['tasta', 'paleta'];

export interface RandFolosit { readonly id: string; readonly n: number; readonly oameni: number; readonly taste: number }
/** Acțiunile cele mai folosite: de câte ori, câți oameni, câte din taste sau din paletă. */
export function celeMaiFolosite(p: SumePerioada, k = 12): RandFolosit[] {
  return [...p.actiuni].map(([id, a]) => ({ id, n: a.n, oameni: oameni(a.oameni), taste: DIN_TASTE.reduce((s, d) => s + (a.de[d] ?? 0), 0) }))
    .sort((a, b) => b.n - a.n || (a.id < b.id ? -1 : 1)).slice(0, k);
}

export interface RandNefolosit { readonly id: string; readonly fel: 'actiune' | 'unealta'; readonly n: number; readonly oameni: number }
/**
 * Ce nu se folosește: acțiunile registrului și uneltele din catalog, după câți oameni le-au folosit (cei mai puțini întâi),
 * apoi după de câte ori; o acțiune fără niciun eveniment are 0. Ce nu e în catalog (o acțiune scoasă) nu apare.
 */
export function nefolosite(c: CatalogActiuni, p: SumePerioada, k = 15): RandNefolosit[] {
  const randuri: RandNefolosit[] = [
    ...c.actiuni.map((a) => {
      const x = p.actiuni.get(a.id);
      return { id: a.id, fel: 'actiune' as const, n: x?.n ?? 0, oameni: x ? oameni(x.oameni) : 0 };
    }),
    ...c.unelte.map((u) => {
      const x = p.unelte.get(u.id);
      return { id: u.id, fel: 'unealta' as const, n: x?.n ?? 0, oameni: x ? oameni(x.oameni) : 0 };
    }),
  ];
  return randuri.sort((a, b) => a.oameni - b.oameni || a.n - b.n || (a.id < b.id ? -1 : 1)).slice(0, k);
}

export interface RandRefuz { readonly id: string; readonly motiv: string; readonly n: number }
/** Frecările: refuzurile, pe acțiune și pe motiv, cele mai dese întâi. */
export function refuzuri(p: SumePerioada, k = 10): RandRefuz[] {
  const r: RandRefuz[] = [];
  for (const [id, a] of p.actiuni) for (const [motiv, n] of Object.entries(a.motive)) if (n > 0) r.push({ id, motiv, n });
  return r.sort((a, b) => b.n - a.n || (a.id < b.id ? -1 : a.id > b.id ? 1 : a.motiv < b.motiv ? -1 : 1)).slice(0, k);
}

export interface RandDialog { readonly id: string; readonly deschis: number; readonly renuntat: number; readonly gata: number }
/** Dialogurile părăsite: cele închise fără rezultat, cele mai dese întâi. */
export function dialoguriParasite(p: SumePerioada, k = 6): RandDialog[] {
  return [...p.dialoguri].filter(([, d]) => d.renuntat > 0).map(([id, d]) => ({ id, ...d }))
    .sort((a, b) => b.renuntat - a.renuntat || (a.id < b.id ? -1 : 1)).slice(0, k);
}

/** Pură: treapta în care cade cuantila `q` a unei histograme pe trepte (cheile: marginile de sus); null fără valori. */
export function cuantila(h: Numere, q: number): number | null {
  const trepte = Object.entries(h).map(([k, n]) => [Number(k), n] as const).filter(([k, n]) => Number.isFinite(k) && n > 0).sort((a, b) => a[0] - b[0]);
  const total = trepte.reduce((s, [, n]) => s + n, 0);
  if (total === 0) return null;
  let cum = 0;
  for (const [k, n] of trepte) {
    cum += n;
    if (cum >= q * total) return k;
  }
  return trepte[trepte.length - 1]?.[0] ?? null;
}

export interface RandDurata {
  readonly id: string; readonly n: number; readonly mediana: number | null; readonly lente: number | null; readonly erori: number; readonly anulate: number;
}
/** Duratele calculelor: câte, mediana și cele mai lente 5 % (ca trepte), erorile și anulările; cele mai dese întâi. */
export function durate(p: SumePerioada): RandDurata[] {
  return [...p.calcule].map(([id, c]) => ({
    id, n: c.ok + c.eroare + c.anulat, mediana: cuantila(c.ms, 0.5), lente: cuantila(c.ms, 0.95), erori: c.eroare, anulate: c.anulat,
  })).filter((r) => r.n > 0).sort((a, b) => b.n - a.n || (a.id < b.id ? -1 : 1));
}

export interface RandSecventa { readonly pasi: readonly string[]; readonly n: number; readonly s: number }
/** Fluxurile: secvențele de `lungime` acțiuni din cele mai multe sesiuni, apoi cele mai dese. */
export function secventeleDese(p: SumePerioada, lungime: number, k = 8): RandSecventa[] {
  return [...p.secvente].map(([cheie, x]) => ({ cheie, pasi: cheie.split('>'), ...x })).filter((r) => r.pasi.length === lungime)
    .sort((a, b) => b.s - a.s || b.n - a.n || (a.cheie < b.cheie ? -1 : 1)).slice(0, k).map(({ pasi, n, s }) => ({ pasi, n, s }));
}

export interface RandPas { readonly pas: PasPalnie; readonly sesiuni: number; readonly oameni: number; readonly seOpresc: number | null }
/**
 * Pâlnia: câte sesiuni ajung la fiecare pas (și câți oameni) și câte se opresc acolo (ajung la pas, dar nu la următorul; la
 * ultimul pas, nimic). Pe sume adunate din zile, o sesiune care trece de miezul nopții se numără în fiecare zi a ei.
 */
export function palnie(p: SumePerioada): RandPas[] {
  return PASI_PALNIE.map((pas, i) => {
    const x = p.palnie[i];
    const urm = p.palnie[i + 1];
    const sesiuni = x?.sesiuni ?? 0;
    return { pas, sesiuni, oameni: x ? oameni(x.oameni) : 0, seOpresc: urm ? Math.max(0, sesiuni - urm.sesiuni) : null };
  });
}
