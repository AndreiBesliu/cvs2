/**
 * Textul pe curbă (ADR 0108): literele textului așezat drept (`asezare.ts`) duse, fiecare întreagă, pe o curbă. Mijlocul
 * liniei de bază a fiecărei litere stă pe curbă la distanța pe curbă a lui (ancora, plus poziția lui pe rând), litera rotită
 * după tangentă (sau verticală) și mutată pe normală după poziția cerută; o mișcare rigidă, deci contururile literei rămân
 * exacte (liniile și cubicele trec prin rotație și translație fără aproximare) și normalizate.
 *
 * - **Sensul:** curba e parcursă cum a fost desenată; una închisă, în sens orar, ca textul să stea în afara ei și să se
 *   citească sus (cercul e desenat trigonometric); „partea cealaltă” o parcurge invers (textul trece de partea cealaltă).
 *   „Sus”-ul literelor e normala din stânga mersului.
 * - **Poziția** față de curbă, pentru tot blocul de rânduri: `deasupra` (coborârea ultimului rând pe curbă), `baza` (linia de
 *   bază a primului rând), `centru` (mijlocul dintre vârful majusculelor primului rând și linia de bază a ultimului),
 *   `dedesubt` (vârful majusculelor primului rând pe curbă); plus `distanta` mm în sus. Rândurile următoare stau mai jos, pe
 *   normală, cu locurile literelor măsurate pe aceeași curbă.
 * - **Întinsă:** spațiul dintre caractere crește (sau scade) cât textul să acopere toată curba: una deschisă de la capăt la
 *   capăt (ancora nu mai contează), una închisă tot ocolul, cu același spațiu și între ultimul caracter și primul (pe un cerc
 *   R50, textul ocupă exact 314,16 mm, criteriul din cercetare). Pe cea închisă se aliniază față de ancoră literele, de la
 *   începutul primei la sfârșitul ultimei (fără golul de după ea): centrat, textul vizibil are mijlocul în ancoră.
 * - **Dincolo de capete:** un text mai lung decât o curbă deschisă continuă pe tangenta capătului; pe una închisă se reia.
 */
import { arieCuSemn, inverseaza } from '../geom/contur.ts';
import type { Contur, Punct, Varf } from '../geom/conturBaza.ts';
import { ORIENTARI_PE_CURBA, POZITII_PE_CURBA } from '../model/blocText.ts';
import { parcurgere } from '../model/curba.ts';
import type { AliniereText, GlifaAsezata, TextAsezat } from './asezare.ts';

export { ORIENTARI_PE_CURBA, POZITII_PE_CURBA };
export type PozitiePeCurba = (typeof POZITII_PE_CURBA)[number];
export type OrientarePeCurba = (typeof ORIENTARI_PE_CURBA)[number];

/** Curba unui text și cum stă textul pe ea; coordonatele, în sistemul piesei (originea e ancora, un punct al curbei). */
export type TextPeCurba = {
  readonly contur: Contur;
  /** Distanța pe curbă (mm, în sensul în care e scrisă) a ancorei. */
  readonly s: number;
  readonly pozitie: PozitiePeCurba;
  /** Mm în plus, în sus (pe normala textului); negativ: spre curbă și dincolo de ea. */
  readonly distanta: number;
  /** Partea cealaltă: curba parcursă invers. */
  readonly invers: boolean;
  readonly orientare: OrientarePeCurba;
  readonly intinsa: boolean;
};

/** Curba în sensul în care o parcurge textul și distanța ancorei pe ea (ADR 0108 §1). */
export function conturOrientat(c: TextPeCurba): { readonly contur: Contur; readonly s: number; readonly inversat: boolean } {
  const trigonometric = c.contur.inchis && arieCuSemn(c.contur) > 0;
  const inversat = trigonometric !== c.invers;
  if (!inversat) return { contur: c.contur, s: c.s, inversat };
  const contur = inverseaza(c.contur);
  const par = parcurgere(contur);
  const l = par?.lungime ?? 0;
  return { contur, s: c.contur.inchis ? (l - c.s) % (l || 1) : l - c.s, inversat };
}

const aliniat = (a: AliniereText, latime: number): number => (a === 'stanga' ? 0 : a === 'centru' ? -latime / 2 : -latime);

/**
 * Textul așezat drept, dus pe curbă (ADR 0108): aceleași glife, cu contururile mutate rigid; `inaltime` e înălțimea
 * majusculei (mm), `aliniere` cea a textului. Null: curba n-are lungime.
 */
export function aseazaPeCurba(a: TextAsezat, c: TextPeCurba, inaltime: number, aliniere: AliniereText): TextAsezat | null {
  const o = conturOrientat(c);
  const par = parcurgere(o.contur);
  if (!par) return null;
  const L = par.lungime, n = a.linii.length, rand = a.metrici.rand;
  const dy = (c.pozitie === 'baza' ? 0
    : c.pozitie === 'deasupra' ? (n - 1) * rand - a.metrici.coborare
      : c.pozitie === 'centru' ? -(inaltime - (n - 1) * rand) / 2 : -inaltime) + c.distanta;
  const glife = a.glife.map((g): GlifaAsezata => {
    const r = a.linii[g.rand]!;
    // Locul mijlocului liniei de bază a glifei pe curbă.
    let s: number;
    if (c.intinsa && r.caractere > 0) {
      const goluri = o.contur.inchis ? r.caractere : r.caractere - 1;
      const extra = goluri > 0 ? (L - r.latime) / goluri : 0;
      const pePand = g.x - r.dx + g.indice * extra + g.avans / 2;
      s = o.contur.inchis ? o.s + aliniat(aliniere, L - extra) + pePand : pePand;
    } else {
      s = o.s + g.x + g.avans / 2;
    }
    const loc = par.la(s);
    const u = (loc.unghi * Math.PI) / 180;
    const cos = Math.cos(u), sin = Math.sin(u);
    const baza = -g.rand * rand;
    const xc = g.x + g.avans / 2;
    // Rotită: (x − xc, y + dy) rotit cu tangenta, din punctul curbei. Verticală: punctul de pe normală, litera nerotită.
    const muta = c.orientare === 'rotita'
      ? (q: Punct): Punct => {
        const px = q.x - xc, py = q.y + dy;
        return { x: loc.p.x + px * cos - py * sin, y: loc.p.y + px * sin + py * cos };
      }
      : (q: Punct): Punct => ({ x: loc.p.x - sin * (baza + dy) + (q.x - xc), y: loc.p.y + cos * (baza + dy) + (q.y - baza) });
    const cai = g.cai.map((cale) => ({
      inchis: cale.inchis,
      varfuri: cale.varfuri.map((v): Varf => ({
        p: muta(v.p),
        s: v.s.tip === 'C' ? { tip: 'C', c1: muta(v.s.c1), c2: muta(v.s.c2) } : v.s,
      })),
    }));
    return { ...g, cai };
  });
  return { ...a, glife };
}
