import { RESTART, treaptaZoom, type Bucata } from '../canvas/protocol.ts';
import { baleiajArc, type Miscare } from '../ir/ir.ts';

export { RESTART, type Bucata };

/**
 * Traseul unui program, pregătit pentru stratul WebGL2 al pânzei (ADR 0038 §1). Pur: din mișcările IR-ului (coordonatele
 * documentului, mm) ies șiruri continue, apoi bucăți cu vârfurile în float32 RELATIV la originea bucății.
 * - Rapidele (G0) și tăierile (G1, G2 / G3) sunt șiruri separate: se desenează în culori diferite.
 * - Z nu se vede (vederea e de sus): o mișcare doar pe Z nu adaugă nimic; o elice se desenează ca arcul ei.
 * - Arcele se aproximează cu coarde la cel mult `toleranta` mm de arc (săgeata), capetele exacte.
 * - O bucată se întinde cel mult `INTINDERE_BUCATA` mm de la originea ei (pe fiecare axă): la 1 000 px/mm, vârful relativ
 *   rămâne sub 64 000 px, unde pasul lui float32 e ~0,004 px; translația vederii se adună în double, pe procesor.
 */

export type Sir = { readonly rapid: boolean; readonly puncte: readonly number[] };

export const INTINDERE_BUCATA = 64;
/** Cel mult atâtea vârfuri într-o bucată (un buffer). */
const VARFURI_PE_BUCATA = 1 << 16;

/**
 * Toleranța aproximării arcelor la o scară (px / mm) și un raport de pixeli: ½ pixel fizic la capătul de sus al treptei
 * de zoom (trepte de ×2), deci cel mult ½ px oriunde în treaptă. Treapta, ca aproximarea să se refacă doar la schimbarea ei.
 */
export function tolerantaTreptei(scara: number, dpr: number): { readonly treapta: number; readonly toleranta: number } {
  const treapta = treaptaZoom(scara, dpr);
  return { treapta, toleranta: tolerantaDinTreapta(treapta) };
}

/** Toleranța arcelor pe o treaptă de zoom: ½ pixel fizic la capătul ei de sus. */
export function tolerantaDinTreapta(treapta: number): number {
  return 0.5 / 2 ** treapta;
}

/** Câte coarde cere un arc de rază r și baleiaj b, ca săgeata să fie cel mult `toleranta` (măcar una la 90°). */
function coarde(r: number, b: number, toleranta: number): number {
  const sfert = Math.ceil(Math.abs(b) / (Math.PI / 2));
  if (!(toleranta < r)) return Math.max(1, sfert);
  const pas = 2 * Math.acos(1 - toleranta / r);
  return Math.max(1, sfert, Math.ceil(Math.abs(b) / pas));
}

/**
 * Șirurile programului: un șir nou la fiecare trecere rapidă ↔ tăiere. Poziția e modală (doar axele care se mișcă); până
 * la primul X și Y cunoscute, nimic nu se desenează. Segmentele de lungime 0 se sar.
 */
export function siruriDinProgram(miscari: readonly Miscare[], toleranta: number): { readonly siruri: Sir[]; readonly segmente: number } {
  const siruri: Sir[] = [];
  let x = Number.NaN, y = Number.NaN;
  let curent: { rapid: boolean; puncte: number[] } | null = null;
  let segmente = 0;
  const adauga = (rapid: boolean, px: number, py: number): void => {
    if (curent === null || curent.rapid !== rapid) {
      curent = { rapid, puncte: [x, y] };
      siruri.push(curent);
    }
    curent.puncte.push(px, py);
    segmente++;
  };
  for (const m of miscari) {
    if (m.tip !== 'rapida' && m.tip !== 'taiere' && m.tip !== 'arc') continue;
    const nx = m.la.X ?? x, ny = m.la.Y ?? y;
    const cunoscut = Number.isFinite(x) && Number.isFinite(y);
    if (!cunoscut || !Number.isFinite(nx) || !Number.isFinite(ny)) {
      x = nx;
      y = ny;
      continue;
    }
    if (m.tip === 'arc') {
      const start = { x, y }, capat = { x: nx, y: ny };
      const b = baleiajArc(start, capat, m.centru, m.sens === 'trigonometric');
      const r = Math.hypot(x - m.centru.x, y - m.centru.y);
      const a0 = Math.atan2(y - m.centru.y, x - m.centru.x);
      const n = coarde(r, b, toleranta);
      for (let k = 1; k < n; k++) {
        const a = a0 + (b * k) / n;
        adauga(false, m.centru.x + r * Math.cos(a), m.centru.y + r * Math.sin(a));
      }
      adauga(false, nx, ny);
    } else if (nx !== x || ny !== y) {
      adauga(m.tip === 'rapida', nx, ny);
    }
    x = nx;
    y = ny;
  }
  return { siruri, segmente };
}

/**
 * Șirurile programului sub un buget de segmente (măsurat la pornire, ADR 0013): peste el, toleranța arcelor se dublează
 * până încape (`rarit`). Liniile nu se pot rări; dacă doar ele trec de buget, se desenează toate (`pesteBuget`).
 */
export function siruriInBuget(miscari: readonly Miscare[], toleranta: number, buget: number): {
  readonly siruri: Sir[]; readonly segmente: number; readonly toleranta: number; readonly rarit: boolean; readonly pesteBuget: boolean;
} {
  let tol = toleranta;
  let r = siruriDinProgram(miscari, tol);
  let rarit = false;
  // 60 de dublări duc toleranța de la 1e-9 mm peste orice foaie: fiecare arc ajunge la o coardă pe sfert.
  for (let i = 0; i < 60 && r.segmente > buget; i++) {
    const urm = siruriDinProgram(miscari, tol * 2);
    if (urm.segmente >= r.segmente) break;
    tol *= 2;
    r = urm;
    rarit = true;
  }
  return { ...r, toleranta: tol, rarit, pesteBuget: r.segmente > buget };
}

/**
 * Bucățile pentru GPU: șirurile de același fel, puse împreună cât încap (întinderea, vârfurile). Un segment mai lung decât
 * întinderea se împarte; un șir care iese din bucată continuă în următoarea din ultimul lui punct (fără gol).
 */
export function bucatiDinSiruri(siruri: readonly Sir[]): Bucata[] {
  const rez: Bucata[] = [];
  for (const rapid of [false, true]) {
    let ox = 0, oy = 0;
    // Ultimul vârf pus, în double (nu reconstruit din float32): de aici pornește bucata următoare a aceluiași șir.
    let ux = 0, uy = 0;
    let v: number[] = [];
    let ind: number[] = [];
    let k = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    const inchide = (): void => {
      if (v.length > 0) {
        rez.push({ rapid, origine: { x: ox, y: oy }, varfuri: Float32Array.from(v), indici: Uint32Array.from(ind), cutie: k });
      }
      v = [];
      ind = [];
      k = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    };
    const varf = (px: number, py: number): void => {
      if (v.length === 0) { ox = px; oy = py; }
      ux = px;
      uy = py;
      ind.push(v.length / 2);
      v.push(px - ox, py - oy);
      k = { minX: Math.min(k.minX, px), minY: Math.min(k.minY, py), maxX: Math.max(k.maxX, px), maxY: Math.max(k.maxY, py) };
    };
    const incape = (px: number, py: number): boolean =>
      v.length === 0 || (Math.abs(px - ox) <= INTINDERE_BUCATA && Math.abs(py - oy) <= INTINDERE_BUCATA && v.length / 2 < VARFURI_PE_BUCATA);
    for (const s of siruri) {
      if (s.rapid !== rapid || s.puncte.length < 4) continue;
      let px = s.puncte[0] as number, py = s.puncte[1] as number;
      // Un șir nou în aceeași bucată începe după un RESTART.
      if (!incape(px, py)) inchide();
      if (v.length > 0) ind.push(RESTART);
      varf(px, py);
      for (let i = 2; i + 1 < s.puncte.length; i += 2) {
        const qx = s.puncte[i] as number, qy = s.puncte[i + 1] as number;
        // Segmentul, în pași de cel mult jumătate din întindere: fiecare pas încape într-o bucată pornită din capătul lui.
        const n = Math.max(1, Math.ceil(Math.max(Math.abs(qx - px), Math.abs(qy - py)) / (INTINDERE_BUCATA / 2)));
        for (let j = 1; j <= n; j++) {
          const tx = j === n ? qx : px + ((qx - px) * j) / n;
          const ty = j === n ? qy : py + ((qy - py) * j) / n;
          if (!incape(tx, ty)) {
            // Bucata se închide; următoarea pornește din punctul dinainte, ca șirul să rămână legat.
            const ax = ux, ay = uy;
            inchide();
            varf(ax, ay);
          }
          varf(tx, ty);
        }
        px = qx;
        py = qy;
      }
    }
    inchide();
  }
  return rez;
}
