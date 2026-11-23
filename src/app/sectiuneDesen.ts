/**
 * Geometria desenului secțiunii „Împreună” (ADR 0179 §5; pereții drepți, felia 12.1↑e-3, punctul 6), pură: din secțiunea
 * măsurată (suprafața plăcii și fața de jos a dopului, câte o valoare pe celulă), căile desenului. Y-ul desenului e −Z.
 *
 * - Dopul în V: profilul trece prin centrele celulelor (pereții lui sunt înclinați), ca până acum.
 * - Pereții drepți: fiecare celulă e o treaptă cât ea, deci pereții ies verticali, la marginea celulei.
 * - Cleiul e doar în locaș, sub fața plăcii: de la suprafața plăcii până la fața de jos a dopului, dar cel mult până la fața
 *   plăcii (deasupra ei e spațiul dintre plăci, nu clei). La dopul decupat, locașul fără dop deasupra e jocul lateral.
 * - Gaura prin foaie (ADR 0175): placa e groasă cât foaia; sub gaură nu e lemn și nici contact.
 * - Dopul în trepte (felia 12.1↑e-4) se desenează ca pereții drepți: umărul e încă o treaptă a plăcii, iar cleiul din jurul tijei
 *   urcă până la flanșă (fața ei de jos e sub fața plăcii).
 */
import type { SectiunePotrivire } from '../sim/potrivire.ts';

/** Ce citește desenul din potrivirea măsurată (`Potrivire` i se potrivește). */
export type DateDesen =
  | {
    readonly fel: 'v'; readonly hartie: { readonly D: number; readonly H: number }; readonly asezare: number;
    readonly intre: { readonly med: number }; readonly sectiune: SectiunePotrivire;
  }
  | {
    readonly fel: 'drept'; readonly hartie: { readonly D: number; readonly decupat: boolean; readonly gaura: boolean };
    readonly asezare: number; readonly adancime: number; readonly inaltime: number; readonly sectiune: SectiunePotrivire;
  }
  | {
    readonly fel: 'trepte'; readonly hartie: { readonly D: number; readonly decupat: boolean; readonly gaura: boolean };
    readonly asezare: number; readonly inaltime: number; readonly sectiune: SectiunePotrivire;
  };

/** Căile și liniile desenului, gata de pus în SVG (numerele, cu cel mult trei zecimale). */
export type DesenSectiune = {
  /** `viewBox`: de la fața de sus a dopului până la fundul desenat al plăcii. */
  readonly cutie: string;
  readonly placa: string;
  readonly dop: string;
  /** Jocul cu clei (gol: fără). */
  readonly clei: string;
  /** Liniile de contact: punctele fiecăreia. */
  readonly contact: readonly string[];
  /** Tăietura cu fierăstrăul sau, la dopul decupat, fața plăcii până la care se rindeluiește. */
  readonly taiere: { readonly fel: 'fierastrau' | 'rindea'; readonly y: string };
  readonly x0: string; readonly x1: string; readonly ySus: string; readonly yJos: string;
  readonly marcaj: string | null;
};

/** Sub cât jocul dintre fața dopului și placă e contact, în desen (mm); peste, în locaș, e jocul cu clei. */
const CONTACT = 0.05;
/** Sub atât (mm) suprafața plăcii e fața ei, nu locașul. */
const FATA = 0.01;
/** Cât lemn se desenează sub fundul locașului (mm). */
const SUB_FUND = 1.5;

type Punct = readonly [number, number];

/** Rulările consecutive de indici pentru care `ok(i)` e adevărat. */
function rulari(n: number, ok: (i: number) => boolean): Array<readonly [number, number]> {
  const rez: Array<readonly [number, number]> = [];
  let start = -1;
  for (let i = 0; i <= n; i++) {
    if (i < n && ok(i)) { if (start < 0) start = i; } else if (start >= 0) { rez.push([start, i - 1]); start = -1; }
  }
  return rez;
}

const f = (v: number): string => (Math.round(v * 1000) / 1000).toString();
const linii = (p: readonly Punct[]): string => p.map(([x, z]) => `${f(x)} ${f(-z)}`).join(' L');

export function desenSectiune(p: DateDesen): DesenSectiune {
  const s = p.sectiune, n = s.placa.length, c = s.celula, drept = p.fel !== 'v';
  const gaura = p.fel !== 'v' && p.hartie.gaura, decupat = p.fel !== 'v' && p.hartie.decupat;
  const X0 = s.x0, X1 = s.x0 + n * c;
  const zJos = gaura ? -p.hartie.D : -(p.hartie.D + SUB_FUND), zSus = s.grosimeDop - p.asezare;
  const placa = (i: number): number => s.placa[i]!, dop = (i: number): number => s.dop[i]!;
  /**
   * Profilul celulelor a..b, de la stânga la dreapta: prin centre (V), sau în trepte, fiecare celulă cât ea, cu treptele de
   * aceeași înălțime unite (pereții drepți).
   */
  const profil = (a: number, b: number, z: (i: number) => number): Punct[] => {
    const rez: Array<[number, number]> = [];
    for (let i = a; i <= b; i++) {
      const zi = z(i), ultim = rez[rez.length - 1];
      if (!drept) rez.push([s.x0 + (i + 0.5) * c, zi]);
      else if (ultim && ultim[1] === zi) ultim[0] = s.x0 + (i + 1) * c;
      else rez.push([s.x0 + i * c, zi], [s.x0 + (i + 1) * c, zi]);
    }
    return rez;
  };
  const invers = (a: number, b: number, z: (i: number) => number): Punct[] => profil(a, b, z).reverse();
  const stanga = (a: number): number => (drept ? s.x0 + a * c : s.x0 + (a + 0.5) * c - c / 2);
  const dreapta = (b: number): number => (drept ? s.x0 + (b + 1) * c : s.x0 + (b + 0.5) * c + c / 2);

  const caleaPlacii = `M${linii([[X0, zJos], ...profil(0, n - 1, placa), [X1, zJos]])}Z`;
  const caleaDopului = rulari(n, (i) => Number.isFinite(dop(i)))
    .map(([a, b]) => `M${linii([[stanga(a), zSus], [dreapta(b), zSus], ...invers(a, b, dop)])}Z`).join(' ');

  // Fața de sus a jocului: fața de jos a dopului; la pereții drepți, cel mult fața plăcii, iar la dopul decupat și locașul
  // fără dop deasupra (jocul lateral: în jurul lui nu mai e lemn al dopului).
  const sus = (i: number): number => {
    const d = dop(i);
    if (!drept) return d;
    return Number.isFinite(d) ? Math.min(d, 0) : decupat ? 0 : Number.NaN;
  };
  const inLocas = (i: number): boolean => placa(i) < -FATA;
  const clei = rulari(n, (i) => inLocas(i) && sus(i) - placa(i) >= CONTACT)
    .map(([a, b]) => `M${linii([...profil(a, b, sus), ...invers(a, b, placa)])}Z`).join(' ');
  // Contactul: dopul pe suprafața locașului. Sub gaura prin foaie nu e fund: dopul stă acolo pe masă, nu pe placă.
  const prin = (i: number): boolean => gaura && placa(i) <= -p.hartie.D + FATA;
  const contact = rulari(n, (i) => inLocas(i) && Number.isFinite(dop(i)) && dop(i) - placa(i) < CONTACT && !prin(i))
    .map(([a, b]) => profil(a, b, placa).map(([x, z]) => `${f(x)},${f(-z)}`).join(' '));

  // Tăietura cu fierăstrăul: la mijlocul spațiului dintre plăci (mediana lui simulată; fără ea, H de pe hârtie). Dopul drept
  // pe față stă cu fața coborâtă pe placă: tăietura e la fața plăcii. Dopul decupat n-are a doua placă: ce iese peste placă se
  // rindeluiește până la fața ei (ADR 0171). Dopul în trepte întors stă cu fața coborâtă la h − h* peste placă.
  const zTaiere = p.fel === 'v' ? (Number.isFinite(p.intre.med) ? p.intre.med : p.hartie.H) / 2 : decupat ? 0
    : Math.max(0, p.inaltime - (p.fel === 'trepte' ? p.asezare : p.adancime)) / 2;
  return {
    cutie: `${f(X0)} ${f(-zSus)} ${f(X1 - X0)} ${f(zSus - zJos)}`,
    placa: caleaPlacii, dop: caleaDopului, clei, contact,
    taiere: { fel: decupat ? 'rindea' : 'fierastrau', y: f(-zTaiere) },
    x0: f(X0), x1: f(X1), ySus: f(-zSus), yJos: f(-zJos),
    marcaj: s.marcaj !== null ? f(s.marcaj) : null,
  };
}
