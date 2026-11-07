/**
 * G-code-ul pieselor plate pentru K1C (ADR 0191 §E): doar ce scrie OrcaSlicer pentru K1C (Klipper, E relativ): antetul
 * (`; HEADER_BLOCK_START`, numărul straturilor), miniaturile PNG, `EXCLUDE_OBJECT_DEFINE` pentru fiecare piesă, începutul
 * imprimantei (`START_PRINT` …), preambulul (`G90`, `G21`, `M83`, `G92 E0`), straturile (`;LAYER_CHANGE`, `;Z:`, `;HEIGHT:`,
 * `G92 E0`, retragerea, Z), `SET_VELOCITY_LIMIT` la schimbarea accelerației, `M106` pentru ventilatoare, `M104` / `M140` la
 * schimbarea temperaturilor, fiecare piesă între `EXCLUDE_OBJECT_START` și `EXCLUDE_OBJECT_END`, sfârșitul (`END_PRINT`),
 * apoi filamentul, timpul și configurația.
 *
 * Timpul: fiecare cale cu viteza ei, accelerația rolului și vitezele de joncțiune ale lui Klipper (colțul pătrat și limita
 * centripetă), cu o trecere înainte și una înapoi; deplasările și retragerile, la fel. Încetinirea pentru răcire: un strat mai
 * scurt decât `stratMinim` se rescrie cu vitezele de extrudare micșorate (nu sub `vitezaMinima`).
 */
import type { PiesaPlata } from './piese.ts';
import { ARIE_FILAMENT, K1C, material, sectiune, type SetariFeliere } from './profil.ts';
import type { Cale, FelStrat, Rol, SablonPiesa } from './straturi.ts';

export type Miniatura = { readonly latime: number; readonly inaltime: number; readonly png: string };

/** Un strat: Z-ul, grosimea și felul fiecărei piese care îl are. */
export type PlanStrat = { readonly z: number; readonly h: number; readonly piese: readonly { readonly i: number; readonly fel: FelStrat }[] };

/** Câte straturi are o piesă de înălțimea H: primul, de `strat1`, apoi de `strat`. */
export const numarStraturi = (H: number, s: SetariFeliere): number => Math.max(1, Math.round((H - s.strat1) / s.strat + 1e-9) + 1);

/** Felul stratului k (de la 1) al unei piese cu n straturi. */
export function felStrat(k: number, n: number, s: SetariFeliere): FelStrat {
  if (k === 1) return 'prim';
  const u = k % 2 === 0 ? '135' : '45';
  if (k === n) return `sus${u}`;
  const sus = Math.max(s.sus, Math.ceil(s.susMinim / s.strat - 1e-9));
  if (k <= s.jos || k > n - sus || s.umplere >= 0.999) return `plin${u}`;
  return 'rar';
}

export function planStraturi(inaltimi: readonly number[], s: SetariFeliere): PlanStrat[] {
  const n = inaltimi.map((H) => numarStraturi(H, s));
  const max = Math.max(0, ...n);
  const rez: PlanStrat[] = [];
  for (let k = 1; k <= max; k++) {
    rez.push({
      z: s.strat1 + (k - 1) * s.strat, h: k === 1 ? s.strat1 : s.strat,
      piese: n.flatMap((nk, i) => (k <= nk ? [{ i, fel: felStrat(k, nk, s) }] : [])),
    });
  }
  return rez;
}

/** Timpul în formatul OrcaSlicer (`get_time_dhms`): „1h 2m 3s”, „3m 2s”, „45s”. */
export function timpText(t: number): string {
  let x = Math.max(0, Math.round(t));
  const d = Math.floor(x / 86400); x -= d * 86400;
  const h = Math.floor(x / 3600); x -= h * 3600;
  const m = Math.floor(x / 60); const sec = x - m * 60;
  return d > 0 ? `${d}d ${h}h ${m}m ${sec}s` : h > 0 ? `${h}h ${m}m ${sec}s` : m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

/** Numerele, ca în OrcaSlicer: X / Y / Z cu cel mult 3 zecimale, E cu 5, fără zerourile de la coadă și fără „0” înainte de virgulă. */
const nr = (v: number, z: number): string => {
  let t = v.toFixed(z);
  if (t.includes('.')) t = t.replace(/0+$/, '').replace(/\.$/, '');
  if (t === '-0') t = '0';
  return t.replace(/^(-?)0\./, '$1.');
};
const n3 = (v: number): string => nr(v, 3);
const n5 = (v: number): string => nr(v, 5);
/** Înălțimile din comentariile straturilor, ca `%g` în OrcaSlicer: „0.2”, „1.6”, „3”. */
const g3 = (v: number): string => String(Number(v.toFixed(3)));

/** Timpul unei bucăți drepte (trapez), cu vitezele de intrare și de ieșire date. */
export function timpBucata(L: number, v: number, a: number, v0: number, v1: number): number {
  if (L <= 0) return 0;
  const vp2 = (2 * a * L + v0 * v0 + v1 * v1) / 2;
  if (vp2 <= v * v) { const vp = Math.sqrt(vp2); return Math.max(0, (2 * vp - v0 - v1) / a); }
  const da = (v * v - v0 * v0) / (2 * a), dd = (v * v - v1 * v1) / (2 * a);
  return (v - v0) / a + (v - v1) / a + (L - da - dd) / v;
}

/** Viteza de joncțiune² a lui Klipper între două bucăți (unitare d1, d2, lungimile l1, l2), cu colțul pătrat și limita centripetă. */
function jonctiune2(d1x: number, d1y: number, d2x: number, d2y: number, l1: number, l2: number, a: number): number {
  const cos = -(d1x * d2x + d1y * d2y);
  if (cos > 0.999999) return 0;
  const sin2 = Math.sqrt(Math.max(0, 0.5 * (1 - cos))), cos2 = Math.sqrt(Math.max(0, 0.5 * (1 + cos)));
  if (cos2 < 1e-9) return Infinity;
  const r = sin2 / (1 - sin2);
  const jd = (K1C.colt * K1C.colt * (Math.SQRT2 - 1)) / a;
  const tan = sin2 / cos2;
  return Math.min(r * jd * a, 0.5 * l1 * tan * a, 0.5 * l2 * tan * a);
}

/** Timpul unei polilinii (puncte x, y …) parcurse cu viteza v și accelerația a, pornind și oprind din repaus. */
export function timpPolilinie(p: ArrayLike<number>, v: number, a: number): number {
  const n = p.length / 2 - 1;
  if (n < 1) return 0;
  const L: number[] = [], dx: number[] = [], dy: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = p[2 * i + 2]! - p[2 * i]!, y = p[2 * i + 3]! - p[2 * i + 1]!, l = Math.hypot(x, y);
    L.push(l); dx.push(l > 0 ? x / l : 0); dy.push(l > 0 ? y / l : 0);
  }
  const vj = new Array<number>(n + 1).fill(0);
  for (let i = 1; i < n; i++) vj[i] = Math.min(v * v, jonctiune2(dx[i - 1]!, dy[i - 1]!, dx[i]!, dy[i]!, L[i - 1]!, L[i]!, a));
  for (let i = 0; i < n; i++) vj[i + 1] = Math.min(vj[i + 1]!, vj[i]! + 2 * a * L[i]!);
  for (let i = n - 1; i >= 0; i--) vj[i] = Math.min(vj[i]!, vj[i + 1]! + 2 * a * L[i]!);
  let t = 0;
  for (let i = 0; i < n; i++) t += timpBucata(L[i]!, v, a, Math.sqrt(vj[i]!), Math.sqrt(vj[i + 1]!));
  return t;
}

/** O deplasare taie conturul unei piese (iese din material) dacă bucata ei taie o latură a vreunui poligon al conturului. */
export function iesePeste(x0: number, y0: number, x1: number, y1: number, contur: readonly ArrayLike<number>[]): boolean {
  const mnx = Math.min(x0, x1), mxx = Math.max(x0, x1), mny = Math.min(y0, y1), mxy = Math.max(y0, y1);
  const ox = x1 - x0, oy = y1 - y0;
  for (const p of contur) {
    for (let i = 0, n = p.length; i < n; i += 2) {
      const j = (i + 2) % n, ax = p[i]!, ay = p[i + 1]!, bx = p[j]!, by = p[j + 1]!;
      if (Math.max(ax, bx) < mnx || Math.min(ax, bx) > mxx || Math.max(ay, by) < mny || Math.min(ay, by) > mxy) continue;
      const ex = bx - ax, ey = by - ay, d = ox * ey - oy * ex;
      if (Math.abs(d) < 1e-12) continue;
      const t = ((ax - x0) * ey - (ay - y0) * ex) / d, u = ((ax - x0) * oy - (ay - y0) * ox) / d;
      if (t > 1e-9 && t < 1 - 1e-9 && u >= 0 && u <= 1) return true;
    }
  }
  return false;
}

/** Câmpurile pe care scrierea le cere de la fiecare rol: viteza, accelerația. */
function rol(r: Rol, prim: boolean, s: SetariFeliere): { v: number; a: number } {
  if (prim) return { v: r === 'exterior' || r === 'interior' || r === 'brim' ? s.vPrim : s.vPrimInfill, a: s.aPrim };
  switch (r) {
    case 'exterior': return { v: s.vExterior, a: s.aPereti };
    case 'interior': return { v: s.vInterior, a: s.aPereti };
    case 'sus': return { v: s.vSus, a: s.aSus };
    case 'plin': return { v: s.vPlin, a: s.aImplicit };
    case 'rar': return { v: s.vRar, a: s.aImplicit };
    default: return { v: s.vPrim, a: s.aPrim };
  }
}

/** Golul cusăturii: bucla se oprește cu atât înaintea începutului ei (10 % din duză, ca în profil). */
const GOL_CUSATURA = 0.1 * K1C.duza;

class Scriitor {
  readonly l: string[] = [];
  x = 0; y = 0; z = 0; f = 0; a = 0; retras = false; t = 0; e = 0;
  readonly s: SetariFeliere;
  constructor(s: SetariFeliere) { this.s = s; }
  scrie(x: string): void { this.l.push(x); }
  acc(a: number): void {
    if (a === this.a) return;
    this.a = a;
    this.scrie(`SET_VELOCITY_LIMIT ACCEL=${a} ACCEL_TO_DECEL=${a} MINIMUM_CRUISE_RATIO=0`);
  }
  retrage(): void {
    if (this.retras || this.s.retragere <= 0) return;
    this.scrie(`G1 E-${n5(this.s.retragere)} F${Math.round(this.s.vitezaRetragere * 60)}`);
    this.retras = true; this.f = Math.round(this.s.vitezaRetragere * 60); this.t += this.s.retragere / this.s.vitezaRetragere;
  }
  deretrage(): void {
    if (!this.retras) return;
    this.scrie(`G1 E${n5(this.s.retragere)} F${Math.round(this.s.vitezaRetragere * 60)}`);
    this.retras = false; this.f = Math.round(this.s.vitezaRetragere * 60); this.t += this.s.retragere / this.s.vitezaRetragere;
  }
  zLa(z: number): void {
    if (Math.abs(z - this.z) < 1e-9) return;
    this.scrie(`G1 Z${n3(z)} F${K1C.vitezaZ * 60}`);
    this.t += Math.abs(z - this.z) / K1C.vitezaZ; this.z = z; this.f = K1C.vitezaZ * 60;
  }
  /** Deplasarea la (x, y); cu retragere (și ridicare) dacă `retragere`. */
  /**
   * Deplasarea la (x, y), apoi coborârea la Z-ul stratului: cu retragere (și ridicare, cel mult până la înălțimea patului,
   * doar sub `ridicareSub`) dacă `retragere`. Duza care stă deja mai sus (după începutul imprimantei, la Z1) se mută întâi în
   * XY și coboară abia la destinație, ca OrcaSlicer: nu atinge capătul liniei de curățare.
   */
  mergi(x: number, y: number, retragere: boolean, zStrat: number): void {
    const L = Math.hypot(x - this.x, y - this.y);
    if (L < 1e-6 && Math.abs(this.z - zStrat) < 1e-9) return;
    const hop = Math.min(this.s.ridicare, K1C.pat[2] - zStrat);
    if (retragere) this.retrage();
    if (retragere && hop > 1e-9 && zStrat < K1C.ridicareSub && this.z < zStrat + hop - 1e-9) this.zLa(zStrat + hop);
    if (L >= 1e-6) {
      this.acc(this.s.aDeplasare);
      const f = Math.round(this.s.vDeplasare * 60);
      this.scrie(`G1 X${n3(x)} Y${n3(y)}${f === this.f ? '' : ` F${f}`}`);
      this.f = f; this.x = x; this.y = y;
      this.t += timpBucata(L, this.s.vDeplasare, this.s.aDeplasare, 0, 0);
    }
    this.zLa(zStrat);
  }
  /** Extrudarea unei căi, cu viteza dată (mm/s): E pe fiecare bucată, din secțiunea liniei. */
  extrudeaza(c: Cale, h: number, v: number, a: number): void {
    this.deretrage();
    this.acc(a);
    const k = (sectiune(c.w, h) / ARIE_FILAMENT) * this.s.debit;
    const p = c.p, n = p.length / 2;
    const pts: number[] = [p[0]!, p[1]!];
    for (let i = 1; i < n; i++) pts.push(p[2 * i]!, p[2 * i + 1]!);
    if (c.inchisa) {
      // Înapoi la început, fără ultimii GOL_CUSATURA mm.
      let total = 0;
      for (let i = 0; i < n; i++) { const j = (i + 1) % n; total += Math.hypot(p[2 * j]! - p[2 * i]!, p[2 * j + 1]! - p[2 * i + 1]!); }
      const ultima = Math.hypot(p[0]! - p[2 * n - 2]!, p[1]! - p[2 * n - 1]!);
      if (total > 4 * GOL_CUSATURA && ultima > GOL_CUSATURA) {
        const r = (ultima - GOL_CUSATURA) / ultima;
        pts.push(p[2 * n - 2]! + (p[0]! - p[2 * n - 2]!) * r, p[2 * n - 1]! + (p[1]! - p[2 * n - 1]!) * r);
      } else pts.push(p[0]!, p[1]!);
    }
    const f = Math.round(v * 60);
    for (let i = 2; i < pts.length; i += 2) {
      const L = Math.hypot(pts[i]! - pts[i - 2]!, pts[i + 1]! - pts[i - 1]!);
      if (L < 1e-6) continue;
      const e = L * k;
      this.e += e;
      this.scrie(`G1 X${n3(pts[i]!)} Y${n3(pts[i + 1]!)} E${n5(e)}${f === this.f ? '' : ` F${f}`}`);
      this.f = f;
    }
    this.x = pts[pts.length - 2]!; this.y = pts[pts.length - 1]!;
    this.t += timpPolilinie(pts, v, a);
  }
}

export type IntrareGcode = {
  readonly piese: readonly PiesaPlata[];
  readonly sabloane: readonly SablonPiesa[];
  /** Brim-ul grupului (`brimGrup`), pe primul strat. */
  readonly brim: readonly Cale[];
  readonly setari: SetariFeliere;
  readonly miniaturi?: readonly Miniatura[];
  /** Data din antet, deja scrisă („2026-11-07 at 19:41:00”), ca ieșirea să nu depindă de ceas. */
  readonly data: string;
};

export type IesireGcode = {
  readonly text: string; readonly straturi: number; readonly timp: number; readonly timpPrim: number;
  readonly filamentMm: number; readonly filamentG: number; readonly plan: readonly PlanStrat[];
};

/** Viteza unei căi: a rolului, tăiată de plafonul de debit al materialului. */
const viteza = (c: Cale, h: number, prim: boolean, s: SetariFeliere): number => Math.min(rol(c.rol, prim, s).v, s.volumMax / sectiune(c.w, h));

/** Ventilatorul piesei pe un strat (%), după timpul lui, ca OrcaSlicer (între minim și maxim). */
function ventilator(k: number, timp: number, s: SetariFeliere, ventSubTimp: number): number {
  if (k <= s.ventOprit) return 0;
  if (timp < s.stratMinim) return s.ventMax;
  if (timp < ventSubTimp) return s.ventMax - ((s.ventMax - s.ventMin) * (timp - s.stratMinim)) / (ventSubTimp - s.stratMinim);
  // Un strat mai lung decât `fan_cooling_layer_time`: OrcaSlicer oprește ventilatorul (`reduce_fan_stop_start_freq` = 0 în
  // profilele K1).
  return 0;
}

const centru = (p: ArrayLike<number>): [number, number] => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < p.length; i += 2) { x0 = Math.min(x0, p[i]!); x1 = Math.max(x1, p[i]!); y0 = Math.min(y0, p[i + 1]!); y1 = Math.max(y1, p[i + 1]!); }
  return [(x0 + x1) / 2, (y0 + y1) / 2];
};

/** Anvelopa convexă a punctelor (lanțul monoton al lui Andrew), pentru `POLYGON` din `EXCLUDE_OBJECT_DEFINE`. */
export function anvelopa(p: readonly ArrayLike<number>[]): [number, number][] {
  const pts: [number, number][] = [];
  for (const q of p) for (let i = 0; i < q.length; i += 2) pts.push([q[i]!, q[i + 1]!]);
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const x = (o: [number, number], a: [number, number], b: [number, number]): number => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const jos: [number, number][] = [], sus: [number, number][] = [];
  for (const q of pts) { while (jos.length >= 2 && x(jos[jos.length - 2]!, jos[jos.length - 1]!, q) <= 0) jos.pop(); jos.push(q); }
  for (let i = pts.length - 1; i >= 0; i--) { const q = pts[i]!; while (sus.length >= 2 && x(sus[sus.length - 2]!, sus[sus.length - 1]!, q) <= 0) sus.pop(); sus.push(q); }
  return [...jos.slice(0, -1), ...sus.slice(0, -1)];
}

/** Scrie un strat (căile, deplasările, retragerile) în scriitorul dat, cu factorul de viteză al încetinirii pentru răcire. */
function scrieStrat(w: Scriitor, st: PlanStrat, k: number, intr: IntrareGcode, factor: number): void {
  const s = intr.setari, prim = k === 1;
  const vf = (c: Cale): number => Math.max(Math.min(s.vitezaMinima, viteza(c, st.h, prim, s)), viteza(c, st.h, prim, s) * factor);
  if (prim) {
    // Brim-ul grupului, de la bucla cea mai depărtată spre piese: între bucle alăturate (~0,46 mm), fără retragere.
    intr.brim.forEach((c, j) => {
      const L = Math.hypot(c.p[0]! - w.x, c.p[1]! - w.y);
      w.mergi(c.p[0]!, c.p[1]!, j === 0 || L >= K1C.deplasareFaraRetragere, st.z);
      w.extrudeaza(c, st.h, vf(c), rol('brim', true, s).a);
    });
  }
  // Piesele, cea mai apropiată întâi.
  const rest = [...st.piese];
  while (rest.length > 0) {
    let best = 0, bd = Infinity;
    rest.forEach((x, j) => {
      const c = intr.sabloane[x.i]!.fel.get(x.fel)?.[0];
      if (!c) return;
      const d = (c.p[0]! - w.x) ** 2 + (c.p[1]! - w.y) ** 2;
      if (d < bd) { bd = d; best = j; }
    });
    const { i, fel } = rest.splice(best, 1)[0]!;
    const sab = intr.sabloane[i]!, nume = intr.piese[i]!.nume;
    const cai = sab.fel.get(fel) ?? [];
    if (cai.length === 0) continue;
    w.scrie(`; printing object ${nume}`);
    w.scrie(`EXCLUDE_OBJECT_START NAME=${nume}`);
    let prima = true;
    for (const c of cai) {
      const x = c.p[0]!, y = c.p[1]!;
      const L = Math.hypot(x - w.x, y - w.y);
      const retrage = L >= K1C.deplasareFaraRetragere && (prima || iesePeste(w.x, w.y, x, y, sab.contur));
      w.mergi(x, y, retrage, st.z);
      prima = false;
      w.extrudeaza(c, st.h, vf(c), rol(c.rol, prim, s).a);
    }
    w.scrie(`EXCLUDE_OBJECT_END NAME=${nume}`);
    w.scrie(`; stop printing object ${nume}`);
  }
}

/** Fișierul întreg: antetul, începutul, straturile (cu încetinirea pentru răcire și ventilatoarele), sfârșitul, statisticile. */
export function scrieGcode(intr: IntrareGcode): IesireGcode {
  const s = intr.setari, mt = material(s.material);
  const plan = planStraturi(intr.piese.map((p) => p.inaltime), s);
  const w = new Scriitor(s);
  const antet: string[] = [
    '; HEADER_BLOCK_START', `; generated by CNC Vector Studio 2 on ${intr.data}`, `; total layer number: ${plan.length}`, '; HEADER_BLOCK_END', '',
  ];
  if (intr.miniaturi && intr.miniaturi.length > 0) {
    antet.push('; THUMBNAIL_BLOCK_START');
    for (const m of intr.miniaturi) {
      antet.push(';', `; thumbnail begin ${m.latime}x${m.inaltime} ${m.png.length}`);
      for (let i = 0; i < m.png.length; i += 78) antet.push(`; ${m.png.slice(i, i + 78)}`);
      antet.push('; thumbnail end', ';');
    }
    antet.push('; THUMBNAIL_BLOCK_END', '');
  }
  antet.push('; EXECUTABLE_BLOCK_START');
  intr.piese.forEach((p, i) => {
    const h = anvelopa(intr.sabloane[i]!.contur);
    const [cx, cy] = centru(h.flat());
    w.scrie(`EXCLUDE_OBJECT_DEFINE NAME=${p.nume} CENTER=${n3(cx)},${n3(cy)} POLYGON=[${h.map(([x, y]) => `[${n3(x)},${n3(y)}]`).join(',')}]`);
  });
  // Începutul imprimantei (profilul K1C), apoi preambulul OrcaSlicer.
  w.scrie(`START_PRINT EXTRUDER_TEMP=${s.duza1} BED_TEMP=${s.pat1}`);
  w.scrie('T0');
  w.scrie('M204 S2000');
  w.scrie(`M109 S${s.duza1}`);
  w.scrie('G1 Z3 F600');
  w.scrie('M83');
  w.scrie('G92 E0');
  w.scrie('G1 Z1 F600');
  w.scrie('G90');
  w.scrie('G21');
  w.scrie('M83 ; use relative distances for extrusion');
  w.scrie('G92 E0');
  // După începutul imprimantei: duza la Z1 (ultima linie a începutului), accelerația 2000 (`M204 S2000`); locul pe pat îl
  // lasă linia de curățare a imprimantei, deci prima deplasare se scrie oricum (de la colțul patului, pentru timp).
  w.z = 1; w.a = 2000; w.x = 0; w.y = 0;
  let vent = -1, aux = -1, timpPrim = 0;
  plan.forEach((st, idx) => {
    const k = idx + 1;
    w.scrie(';LAYER_CHANGE');
    w.scrie(`;Z:${g3(st.z)}`);
    w.scrie(`;HEIGHT:${g3(st.h)}`);
    w.scrie(';BEFORE_LAYER_CHANGE');
    w.scrie(`;${g3(st.z)}`);
    w.scrie('G92 E0');
    // Pe primul strat, Z-ul se pune la prima deplasare, după mutarea în XY (de la Z1, al începutului imprimantei).
    if (k > 1) { w.retrage(); w.zLa(st.z); }
    w.scrie(';AFTER_LAYER_CHANGE');
    w.scrie(`;${g3(st.z)}`);
    if (k === 2) {
      if (s.duza !== s.duza1) w.scrie(`M104 S${s.duza}`);
      if (s.pat !== s.pat1) w.scrie(`M140 S${s.pat}`);
    }
    // Stratul, întâi la viteza plină (o probă, nescrisă); dacă e mai scurt decât `stratMinim`, din nou, încetinit.
    const timpLa = (factor: number): number => {
      const proba = new Scriitor(s);
      Object.assign(proba, { x: w.x, y: w.y, z: w.z, f: w.f, a: w.a, retras: w.retras });
      scrieStrat(proba, st, k, intr, factor);
      return proba.t;
    };
    const tStrat = timpLa(1);
    const vNou = ventilator(k, tStrat, s, mt.ventSubTimp);
    if (Math.round(vNou) !== vent) { vent = Math.round(vNou); w.scrie(`M106 S${Math.floor((255.5 * vent) / 100)}`); }
    const vAux = k <= s.ventOprit ? 0 : s.ventAux;
    if (vAux !== aux && (aux !== -1 || vAux > 0)) { aux = vAux; w.scrie(`M106 P2 S${Math.floor((255 * vAux) / 100)}`); }
    // Încetinirea pentru răcire (nu pe primul strat, care are vitezele lui): cel mai mare factor al vitezelor de extrudare cu
    // care stratul ține cel puțin `stratMinim`, căutat prin înjumătățire (timpul nu scade liniar: accelerațiile); 0 = toate la
    // viteza minimă, când nici așa stratul nu ajunge la timp (ca OrcaSlicer: fără așteptări).
    let factor = 1;
    if (k > 1 && s.stratMinim > 0 && tStrat > 0 && tStrat < s.stratMinim) {
      let lo = 0, hi = 1;
      for (let it = 0; it < 10; it++) { const mij = (lo + hi) / 2; if (timpLa(mij) >= s.stratMinim) lo = mij; else hi = mij; }
      factor = lo;
    }
    scrieStrat(w, st, k, intr, factor);
    if (k === 1) timpPrim = w.t;
  });
  w.retrage();
  w.scrie('M106 S0');
  if (aux > 0) w.scrie('M106 P2 S0');
  w.scrie('END_PRINT');
  w.scrie('; EXECUTABLE_BLOCK_END');
  w.scrie('');
  const cm3 = (w.e * ARIE_FILAMENT) / 1000, g = cm3 * mt.densitate;
  const subsol = [
    `; filament used [mm] = ${w.e.toFixed(2)}`, `; filament used [cm3] = ${cm3.toFixed(2)}`, `; filament used [g] = ${g.toFixed(2)}`,
    `; total filament used [g] = ${g.toFixed(2)}`, `; total layers count = ${plan.length}`,
    `; estimated printing time (normal mode) = ${timpText(w.t)}`, `; estimated first layer printing time (normal mode) = ${timpText(timpPrim)}`, '',
    '; CONFIG_BLOCK_START',
    `; printer_model = ${K1C.model}`, `; printer_settings_id = ${K1C.setari}`, `; nozzle_diameter = ${K1C.duza}`,
    `; filament_type = ${mt.tip}`, `; filament_settings_id = "Generic ${mt.nume} @Creality K1-all"`, `; filament_diameter = ${K1C.filament}`,
    `; filament_density = ${mt.densitate}`, `; filament_flow_ratio = ${s.debit}`, `; filament_max_volumetric_speed = ${s.volumMax}`,
    `; layer_height = ${s.strat}`, `; initial_layer_print_height = ${s.strat1}`, `; wall_loops = ${s.pereti}`,
    `; top_shell_layers = ${s.sus}`, `; top_shell_thickness = ${s.susMinim}`, `; bottom_shell_layers = ${s.jos}`,
    `; sparse_infill_density = ${Math.round(s.umplere * 100)}%`, '; sparse_infill_pattern = grid',
    `; nozzle_temperature_initial_layer = ${s.duza1}`, `; nozzle_temperature = ${s.duza}`,
    `; hot_plate_temp_initial_layer = ${s.pat1}`, `; hot_plate_temp = ${s.pat}`,
    `; brim_type = ${s.brim === 'nu' ? 'no_brim' : s.brim === 'da' ? 'outer_only' : 'auto_brim'}`, `; brim_width = ${s.latimeBrim}`,
    `; elefant_foot_compensation = ${s.piciorElefant}`, `; retraction_length = ${s.retragere}`, `; z_hop = ${s.ridicare}`,
    '; CONFIG_BLOCK_END', '',
  ];
  return {
    text: `${[...antet, ...w.l, ...subsol].join('\n')}`,
    straturi: plan.length, timp: w.t, timpPrim, filamentMm: w.e, filamentG: g, plan,
  };
}
