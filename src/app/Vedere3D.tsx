import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import type { Zona } from '../canvas/Rigle.tsx';
import '../i18n/editare.ts';
import { t } from '../i18n/t.ts';
import type { Matrice } from '../geom/matrice.ts';
import { ReliefAnulat } from '../jobs/bazinRelief.ts';
import type { Document, FormaRelief } from '../model/document.ts';
import { elementeFoaie } from '../model/lume.ts';
import type { DopSimulat, Potrivire, ProgramSimulare, ReliefSimulat } from '../ui/actiuniExportTipuri.ts';
import { textNumar } from '../ui/numar.ts';
import { useLimba } from '../ui/useLimba.ts';
import { descriere } from './descriereElement.ts';
import { incarcaModel, type DalaModel, type ModelIncarcat, type StocareModel } from './modelRelief.ts';
import { citesteDale, citesteHarta } from './reliefStocare.ts';
import { Sectiune3D } from './Sectiune3D.tsx';
import { apropie, cuprinde, fereastraFina, incadreaza, matrici, panorameaza, rgb, roteste, subCursor, type Camera, type ZonaNdc } from './vedere3dCalcul.ts';
import './vedere3d.css';
import { mesajeGata } from '../i18n/laCerere.ts';

/** Mesajele modulului, ca date (ADR 0086): cine îl încarcă le așteaptă (`cuMesaje`); un refuz îl vede tot el. */
export const mesaje = mesajeGata();
mesaje.catch(() => undefined);

/**
 * Vederea 3D a plăcii tăiate (ADR 0057), la cerere din modulul editării: la deschidere, programul documentului de acum
 * (CAM-ul, fără export) se simulează pe toată placa, în bazinul de workere; relieful (celulele nucleului, sau cel mai jos Z
 * pe bloc pe o placă mare) urcă într-o textură R32F și se desenează ca o suprafață luminată, cu pereții marginilor. Cu
 * mausul: tragerea rotește, butonul drept (sau Shift) mută, rotița apropie spre cursor. Apropiată destul, zona din jurul
 * centrului se simulează din nou la 0,1 mm și se desenează peste placă; restul rămâne la celula plăcii. Afișarea nu
 * recalculează nimic (ADR 0010): citește doar relieful.
 *
 * Pe o foaie cu reliefuri (ADR 0310 §7, felia 18.1↑b), comutatorul „Modelul / Tăiat”: modelul arată reliefurile din dalele
 * lor, fără simulare, fiecare cu vârful la fața plăcii (implicitul din §6), în golul lui din placă. Suprafața e modelul exact
 * (§4: triunghiurile prin centrele celulelor, cu un rând de margine), redusă cu k doar peste textura plăcii video. Fiecare
 * relief are textura lui, urcată pe dale: o schimbare a documentului urcă doar dalele cu altă cheie (`modelRelief.ts`), iar o
 * mutare sau o rotire nu urcă nimic. Vederea urmează documentul cât stă deschisă.
 */

type Props = {
  readonly doc: Document;
  readonly marime: { readonly latime: number; readonly inaltime: number };
  /** Zona liberă a pânzei (pixeli din colțul ei): placa se încadrează în ea, starea stă în colțul ei. */
  readonly zona: Zona;
  readonly onInchide: () => void;
};

type Stare =
  | { readonly fel: 'calcul' }
  | { readonly fel: 'simulare'; readonly celula: number }
  | { readonly fel: 'gata' }
  | { readonly fel: 'refuz'; readonly motiv: string }
  | { readonly fel: 'eroare'; readonly motiv: string };

type Fin =
  | { readonly fel: 'nimic' }
  | { readonly fel: 'calcul' }
  | { readonly fel: 'gata'; readonly latime: number; readonly inaltime: number }
  | { readonly fel: 'refuz'; readonly motiv: string };

type StareGpu = 'ok' | 'fara-webgl' | 'context-pierdut' | 'prea-mare';
type Relief = Extract<ReliefSimulat, { ok: true }>;
type Calcul = typeof import('../ui/actiuniExportCalcul.ts');

/** Un relief al foii, de desenat ca model: textura lui (după piesă și nod: instanțele o împart) și matricea instanței. */
type ReliefModel = { readonly slot: string; readonly forma: FormaRelief; readonly matrice: Matrice };
/**
 * Textura modelului unui relief, cu valorile ei ținute pe procesor (o placă video pierdută le reface): factorul, cheile
 * dalelor, mărimea, Z-ul fiecărei dale (vârful e cel mai mare); `lipsa`: straturile nu sunt în acest browser.
 */
type SlotModel = {
  forma: FormaRelief; lipsa: boolean; k: number; chei: readonly string[]; w: number; h: number; tx: number;
  z: Float32Array; min: Float32Array; max: Float32Array; varf: number; adanc: number; tex: WebGLTexture | null;
};
type StareModel = { readonly fel: 'calcul' | 'gata' | 'lipsa' } | { readonly fel: 'eroare'; readonly motiv: string };

const STOCARE: StocareModel = { harta: (a) => citesteHarta(a), dale: (a) => citesteDale(a) };
const IDENTITATE: Matrice = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

/** Reliefurile foii 0 a documentului (cel al foii active), în ordinea elementelor. */
function reliefuriModel(doc: Document): ReliefModel[] {
  return elementeFoaie(doc, 0).flatMap((e) => (e.forma.tip === 'relief' ? [{ slot: `${e.piesa}/${e.nod}`, forma: e.forma, matrice: e.matrice }] : []));
}

/** Cât așteaptă vederea refacerea unui context pierdut, până să spună că WebGL2 e indisponibil (ca stratul traseului). */
const ASTEPTARE_REFACERE = 5000;
/** Cât se odihnește camera înainte ca fereastra fină să fie judecată din nou (ms). */
const ODIHNA_FIN = 250;

const VS = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
uniform sampler2D u_z;
uniform ivec2 u_n;
uniform vec4 u_cutie;
uniform vec2 u_pas;
uniform float u_fund;
uniform float u_baza;
uniform float u_dz;
uniform int u_mod;
uniform int u_exact;
uniform mat3 u_m;
uniform mat4 u_pv;
out vec3 v_p;
float h(int i, int j) { return max(texelFetch(u_z, ivec2(i, j), 0).r + u_dz, u_fund); }
// Simularea: vârfurile în centrele pixelilor, cele de pe margine trase la marginea plăcii (ADR 0057 §3). Modelul (u_exact):
// vârfurile în centrele celulelor plus un rând pe fiecare margine, cu valoarea celulei de margine (ADR 0310 §4).
int cel(int k, int n) { return u_exact == 1 ? clamp(k - 1, 0, n - 1) : k; }
float coord(int k, int n, float a, float b, float pas) {
  if (u_exact == 1) return k <= 0 ? a : k >= n + 1 ? b : min(a + (float(k) - 0.5) * pas, b);
  return k <= 0 ? a : k >= n - 1 ? b : a + (float(k) + 0.5) * pas;
}
void main() {
  ivec2 nv = u_n + 2 * u_exact;
  int i; int j; float z;
  if (u_mod == 0) {
    i = gl_VertexID >> 1;
    j = gl_InstanceID + (gl_VertexID & 1);
    z = h(cel(i, u_n.x), cel(j, u_n.y));
  } else {
    int k = gl_VertexID >> 1;
    if (u_mod == 1) { i = k; j = 0; }
    else if (u_mod == 2) { i = k; j = nv.y - 1; }
    else if (u_mod == 3) { i = 0; j = k; }
    else { i = nv.x - 1; j = k; }
    z = (gl_VertexID & 1) == 1 ? h(cel(i, u_n.x), cel(j, u_n.y)) : u_baza;
  }
  vec2 xy = vec2(coord(i, u_n.x, u_cutie.x, u_cutie.z, u_pas.x), coord(j, u_n.y, u_cutie.y, u_cutie.w, u_pas.y));
  v_p = vec3((u_m * vec3(xy, 1.0)).xy, z);
  gl_Position = u_pv * vec4(v_p, 1.0);
}`;

const FS = `#version 300 es
precision highp float;
precision highp int;
in vec3 v_p;
uniform int u_mod;
uniform float u_sus;
uniform float u_fund;
uniform vec4 u_gaura;
uniform vec3 u_ochi;
uniform vec3 u_lemn;
uniform vec3 u_taiat;
uniform vec3 u_prin;
uniform vec3 u_perete;
out vec4 o;
void main() {
  if (u_mod == 0 && v_p.x > u_gaura.x && v_p.x < u_gaura.z && v_p.y > u_gaura.y && v_p.y < u_gaura.w) discard;
  vec3 n = normalize(cross(dFdx(v_p), dFdy(v_p)));
  if (dot(n, u_ochi - v_p) < 0.0) n = -n;
  vec3 baza;
  if (u_mod != 0) baza = u_perete;
  else if (v_p.z <= u_fund + 1e-4) baza = u_prin;
  else if (v_p.z >= u_sus - 1e-4) baza = u_lemn;
  else baza = mix(u_taiat, u_taiat * 0.6, clamp((u_sus - v_p.z) / max(u_sus - u_fund, 1e-6), 0.0, 1.0));
  float d = max(dot(n, normalize(vec3(-0.35, -0.55, 0.76))), 0.0);
  o = vec4(baza * (0.4 + 0.6 * d), 1.0);
}`;

const UNIFORME = ['z', 'n', 'cutie', 'pas', 'fund', 'baza', 'dz', 'mod', 'exact', 'm', 'pv', 'sus', 'gaura', 'ochi', 'lemn', 'taiat', 'prin', 'perete'] as const;

type Gpu = {
  readonly gl: WebGL2RenderingContext;
  readonly prog: WebGLProgram;
  readonly vao: WebGLVertexArrayObject;
  readonly u: Record<(typeof UNIFORME)[number], WebGLUniformLocation | null>;
  readonly maxim: number;
  placa: WebGLTexture | null;
  fin: WebGLTexture | null;
  /** Un plan (1 × 1, zero): fața plăcii și chenarele reliefurilor, în vederea modelului. */
  plan: WebGLTexture | null;
};

function compileaza(gl: WebGL2RenderingContext): Gpu | null {
  const sh = (tip: number, src: string): WebGLShader | null => {
    const s = gl.createShader(tip);
    if (!s) return null;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const v = sh(gl.VERTEX_SHADER, VS), f = sh(gl.FRAGMENT_SHADER, FS), prog = gl.createProgram(), vao = gl.createVertexArray();
  if (!v || !f || !prog || !vao) return null;
  gl.attachShader(prog, v);
  gl.attachShader(prog, f);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  const u = Object.fromEntries(UNIFORME.map((n) => [n, gl.getUniformLocation(prog, `u_${n}`)])) as Gpu['u'];
  const g: Gpu = { gl, prog, vao, u, maxim: Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) || 0, placa: null, fin: null, plan: null };
  g.plan = textura(g, 1, 1, new Float32Array(1));
  return g;
}

/** O textură R32F de `latime` × `inaltime` (fără valori: doar locul, umplut apoi pe dale). */
function textura(g: Gpu, latime: number, inaltime: number, z: Float32Array | null): WebGLTexture | null {
  const { gl } = g, tx = gl.createTexture();
  if (!tx) return null;
  gl.bindTexture(gl.TEXTURE_2D, tx);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, latime, inaltime, 0, gl.RED, gl.FLOAT, z);
  return tx;
}

/** Dala `d` a modelului, pusă în valorile ținute ale texturii și urcată (doar ea) pe placa video. */
function punDala(g: Gpu | null, s: SlotModel, d: DalaModel): void {
  const pe = 256 / s.k, ti = d.index % s.tx, x = ti * pe, y = ((d.index - ti) / s.tx) * pe;
  for (let b = 0; b < d.inaltime; b++) s.z.set(d.z.subarray(b * d.latime, (b + 1) * d.latime), (y + b) * s.w + x);
  s.min[d.index] = d.min;
  s.max[d.index] = d.max;
  if (!g || !s.tex) return;
  g.gl.bindTexture(g.gl.TEXTURE_2D, s.tex);
  g.gl.pixelStorei(g.gl.UNPACK_ALIGNMENT, 1);
  g.gl.texSubImage2D(g.gl.TEXTURE_2D, 0, x, y, d.latime, d.inaltime, g.gl.RED, g.gl.FLOAT, d.z);
}

/** Matricea `m` (asemănarea elementului) pentru shader: 3 × 3, pe coloane. */
const mat3 = (m: Matrice): Float32Array => Float32Array.of(m.a, m.b, 0, m.c, m.d, 0, m.e, m.f, 1);

function culori(): Record<'fundal' | 'lemn' | 'taiat' | 'prin' | 'perete', readonly [number, number, number]> {
  const s = getComputedStyle(document.documentElement);
  const v = (n: string, implicit: readonly [number, number, number]) => rgb(s.getPropertyValue(n), implicit);
  return {
    fundal: v('--panza-fundal', [0.89, 0.88, 0.86]), lemn: v('--sim-lemn', [0.85, 0.73, 0.55]), taiat: v('--sim-taiat', [0.72, 0.53, 0.35]),
    prin: v('--sim-prin', [0.36, 0.42, 0.48]), perete: v('--sim-perete', [0.75, 0.6, 0.42]),
  };
}

export function Vedere3D({ doc, marime, zona, onInchide }: Props): ReactElement {
  const limba = useLimba();
  const canvas = useRef<HTMLCanvasElement>(null);
  const gpu = useRef<Gpu | null>(null);
  const [stareGpu, setStareGpu] = useState<StareGpu>('ok');
  const [stare, setStare] = useState<Stare>({ fel: 'calcul' });
  const [fin, setFin] = useState<Fin>({ fel: 'nimic' });
  // Ce arată vederea (ADR 0178): foaia, sau dopul cu numărul dat (de la 0); dopurile foii vin cu fiecare simulare.
  const [alegere, setAlegere] = useState<'foaie' | number>('foaie');
  const [dopuri, setDopuri] = useState<{ readonly lista: readonly DopSimulat[]; readonly motiv?: string }>({ lista: [] });
  // Elementele foii după id-ul lor în lume, ca titlul fiecărui dop să-și numească incrustația (ADR 0178, precizarea din
  // 21.11); doar cât foaia are dopuri.
  const lume = useMemo(() => (dopuri.lista.length > 0 ? new Map(elementeFoaie(doc, 0).map((e) => [e.idLume, e])) : null), [doc, dopuri.lista]);
  // „Împreună (secțiunea)” (ADR 0179): pe dopul ales; potrivirea lui, măsurată în workerul CAM.
  const [impreuna, setImpreuna] = useState(false);
  const [potrivire, setPotrivire] = useState<
    { readonly fel: 'nimic' | 'calcul' } | { readonly fel: 'gata'; readonly p: Potrivire } | { readonly fel: 'refuz'; readonly motiv: string }
  >({ fel: 'nimic' });
  const jobPotrivire = useRef<AbortController | null>(null);
  // Ce s-a simulat (documentul, programul, relieful plăcii și al ferestrei fine) și camera: ținute aici, nu în stare
  // (un cadru nou nu re-randează componenta).
  const sim = useRef<{ doc: Document | null; calc: Calcul | null; program: Extract<ProgramSimulare, { ok: true }> | null; placa: Relief | null; fin: Relief | null }>(
    { doc: null, calc: null, program: null, placa: null, fin: null });
  const cam = useRef<Camera | null>(null);
  const job = useRef<AbortController | null>(null);
  const jobFin = useRef<{ readonly ctl: AbortController; readonly f: Relief['fereastra'] } | null>(null);
  const cadru = useRef(0);
  const odihna = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ultim = useRef({ marime, zona, onInchide });
  ultim.current = { marime, zona, onInchide };
  // Modelul reliefurilor (ADR 0310 §7): pe o foaie cu reliefuri, vederea pornește pe el; texturile, după piesă și nod.
  const reliefuri = useMemo(() => reliefuriModel(doc), [doc]);
  const [vedere, setVedere] = useState<'model' | 'taiat'>(() => (reliefuri.length > 0 ? 'model' : 'taiat'));
  const [stareModel, setStareModel] = useState<StareModel>({ fel: 'calcul' });
  const modele = useRef(new Map<string, SlotModel>());
  const urcate = useRef(0);
  const acum = useRef({ vedere, reliefuri, doc });
  acum.current = { vedere, reliefuri, doc };

  const aspect = (): number => {
    const c = canvas.current;
    return c && c.clientHeight > 0 ? c.clientWidth / c.clientHeight : ultim.current.marime.latime / Math.max(1, ultim.current.marime.inaltime);
  };
  /** Zona liberă în coordonatele normalizate ale imaginii; centrul ei e centrul încadrării (o lentilă deplasată). */
  const zonaNdc = (): ZonaNdc => {
    const { marime: m, zona: z } = ultim.current;
    if (!(m.latime > 0 && m.inaltime > 0 && z.w > 0 && z.h > 0)) return { x0: -1, y0: -1, x1: 1, y1: 1 };
    return { x0: (z.x / m.latime) * 2 - 1, x1: ((z.x + z.w) / m.latime) * 2 - 1, y0: 1 - ((z.y + z.h) / m.inaltime) * 2, y1: 1 - (z.y / m.inaltime) * 2 };
  };
  const centru = (): { readonly x: number; readonly y: number } => {
    const z = zonaNdc();
    return { x: (z.x0 + z.x1) / 2, y: (z.y0 + z.y1) / 2 };
  };

  /** Placa de încadrat: a programului simulat (foaia sau dopul ales), iar în vederea modelului, foaia documentului. */
  const placaVazuta = (): { readonly latime: number; readonly inaltime: number; readonly grosime: number } | null => {
    if (acum.current.vedere === 'taiat') return sim.current.program?.foaie ?? null;
    return acum.current.doc.foi[0]?.stoc ?? null;
  };

  const deseneaza = (): void => {
    const g = gpu.current, c = canvas.current, s = sim.current, model = acum.current.vedere === 'model';
    if (!g || !c || g.gl.isContextLost()) return;
    if (!model && (!s.placa || !g.placa)) return;
    const foaie = placaVazuta();
    if (model && foaie && !cam.current) cam.current = incadreaza(foaie, aspect(), zonaNdc());
    const k = cam.current;
    if (!k || !foaie) return;
    const { gl, u } = g;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(c.clientWidth * dpr)), h = Math.max(1, Math.round(c.clientHeight * dpr));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const col = culori();
    gl.viewport(0, 0, w, h);
    gl.clearColor(col.fundal[0], col.fundal[1], col.fundal[2], 1);
    gl.enable(gl.DEPTH_TEST);
    gl.clearStencil(0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
    gl.useProgram(g.prog);
    gl.bindVertexArray(g.vao);
    const m = matrici(k, w / h, centru());
    const sus = model ? 0 : (s.placa?.sus ?? 0), fund = model ? -foaie.grosime : (s.placa?.fund ?? 0);
    gl.uniformMatrix4fv(u.pv, false, Float32Array.from(m.pv));
    gl.uniform3f(u.ochi, m.ochi.x, m.ochi.y, m.ochi.z);
    gl.uniform1f(u.sus, sus);
    gl.uniform1f(u.fund, fund);
    gl.uniform3fv(u.lemn, col.lemn);
    gl.uniform3fv(u.taiat, col.taiat);
    gl.uniform3fv(u.prin, col.prin);
    gl.uniform3fv(u.perete, col.perete);
    gl.uniform4f(u.gaura, 1, 1, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(u.z, 0);
    /**
     * O grilă de înălțimi: `n` celule (pixeli), în dreptunghiul `cutie` al sistemului `mt`, cu pasul `pas`; Z-ul e valoarea plus
     * `dz` (cel puțin fundul), pereții coboară până la `baza`. `exact`: modelul reliefului (ADR 0310 §4); altfel simularea.
     */
    const grila = (tx: WebGLTexture, n: readonly [number, number], cutie: readonly [number, number, number, number], pas: number,
      o: { readonly mt?: Matrice; readonly dz?: number; readonly baza?: number; readonly exact?: boolean; readonly suprafata?: boolean; readonly pereti?: boolean }): void => {
      const e = o.exact === true ? 1 : 0, vx = n[0] + 2 * e, vy = n[1] + 2 * e;
      gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.uniform2i(u.n, n[0], n[1]);
      gl.uniform4f(u.cutie, cutie[0], cutie[1], cutie[2], cutie[3]);
      gl.uniform2f(u.pas, e === 1 && n[0] === 1 ? cutie[2] - cutie[0] : pas, e === 1 && n[1] === 1 ? cutie[3] - cutie[1] : pas);
      gl.uniformMatrix3fv(u.m, false, mat3(o.mt ?? IDENTITATE));
      gl.uniform1f(u.dz, o.dz ?? 0);
      gl.uniform1f(u.baza, o.baza ?? fund);
      gl.uniform1i(u.exact, e);
      gl.uniform1i(u.mod, 0);
      if (o.suprafata !== false && vx >= 2 && vy >= 2) gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 2 * vx, vy - 1);
      if (o.pereti !== true) return;
      for (let p = 1; p <= 4; p++) {
        gl.uniform1i(u.mod, p);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 2 * (p <= 2 ? vx : vy));
      }
    };
    if (model) {
      // Modelul (ADR 0310 §7): întâi chenarele reliefurilor, doar în stencil; fața plăcii se desenează doar în afara lor, ca
      // golul fiecărui relief să se vadă; apoi pereții plăcii și reliefurile, cu pereții golului de la față la margine.
      const plan = g.plan, lista = acum.current.reliefuri.flatMap((r) => {
        const sm = modele.current.get(r.slot);
        return sm && !sm.lipsa && sm.tex ? [{ r, sm }] : [];
      });
      if (!plan) return;
      gl.enable(gl.STENCIL_TEST);
      gl.stencilFunc(gl.ALWAYS, 1, 0xff);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
      gl.colorMask(false, false, false, false);
      gl.depthMask(false);
      for (const { r } of lista) grila(plan, [1, 1], [0, 0, r.forma.nx * r.forma.celula, r.forma.ny * r.forma.celula], 0, { mt: r.matrice, exact: true });
      gl.colorMask(true, true, true, true);
      gl.depthMask(true);
      gl.stencilFunc(gl.EQUAL, 0, 0xff);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
      grila(plan, [1, 1], [0, 0, foaie.latime, foaie.inaltime], 0, { exact: true });
      gl.disable(gl.STENCIL_TEST);
      grila(plan, [1, 1], [0, 0, foaie.latime, foaie.inaltime], 0, { exact: true, suprafata: false, pereti: true });
      for (const { r, sm } of lista) {
        const f = r.forma;
        grila(sm.tex!, [sm.w, sm.h], [0, 0, f.nx * f.celula, f.ny * f.celula], sm.k * f.celula, { mt: r.matrice, dz: sus - sm.varf, baza: sus, exact: true, pereti: true });
      }
      c.dataset.modelDale = String(urcate.current);
      c.dataset.modelK = String(Math.max(0, ...lista.map((x) => x.sm.k)));
    } else if (s.placa && g.placa) {
      const relief = (tx: WebGLTexture, r: Relief, gaura: Relief['fereastra'] | null, pereti: boolean): void => {
        const f = r.fereastra;
        if (gaura) gl.uniform4f(u.gaura, gaura.x0, gaura.y0, gaura.x0 + gaura.latime, gaura.y0 + gaura.inaltime);
        else gl.uniform4f(u.gaura, 1, 1, 0, 0);
        grila(tx, [r.latime, r.inaltime], [f.x0, f.y0, f.x0 + f.latime, f.y0 + f.inaltime], r.bloc * f.celula, { pereti });
      };
      const fine = s.fin && g.fin ? s.fin : null;
      relief(g.placa, s.placa, fine?.fereastra ?? null, true);
      if (fine && g.fin) relief(g.fin, fine, null, false);
    }
    gl.bindVertexArray(null);
    // Pentru probe: matricea cadrului (un punct al lumii → pixelul lui) și câte cadre s-au desenat.
    c.dataset.pv = Array.from(m.pv).join(',');
    c.dataset.cadre = String(Number(c.dataset.cadre ?? 0) + 1);
    c.dataset.distanta = String(Math.round(k.distanta * 1000) / 1000);
    c.dataset.tinta = `${Math.round(k.tinta.x * 1000) / 1000},${Math.round(k.tinta.y * 1000) / 1000}`;
  };
  const cere = (): void => {
    cancelAnimationFrame(cadru.current);
    cadru.current = requestAnimationFrame(deseneaza);
  };

  /** Fereastra fină (ADR 0057 §4): judecată după ce camera se odihnește; una singură, cea nouă o anulează pe cea veche. */
  const judecaFin = (): void => {
    const s = sim.current, k = cam.current;
    if (acum.current.vedere !== 'taiat' || !s.calc || !s.program || !s.placa || !k) return;
    const a = aspect(), foaie = s.program.foaie;
    const f = fereastraFina(k, a, foaie, s.placa.fereastra.celula);
    if (!f) return;
    if (s.fin && cuprinde(s.fin.fereastra, k, a, foaie)) return;
    if (jobFin.current && cuprinde(jobFin.current.f, k, a, foaie)) return;
    jobFin.current?.ctl.abort();
    const ctl = new AbortController();
    jobFin.current = { ctl, f };
    setFin({ fel: 'calcul' });
    void s.calc.simuleazaRelief(s.program, f, ctl.signal).then((r) => {
      if (jobFin.current?.ctl !== ctl) return;
      jobFin.current = null;
      if (!r.ok) {
        if (r.anulata) return;
        if (r.eroare) reportError(new Error(`vederea 3D, fereastra fină: ${r.motiv}`));
        setFin({ fel: 'refuz', motiv: r.motiv });
        return;
      }
      const g = gpu.current;
      if (g) {
        if (g.fin) g.gl.deleteTexture(g.fin);
        g.fin = textura(g, r.latime, r.inaltime, r.z);
      }
      s.fin = r;
      setFin({ fel: 'gata', latime: r.fereastra.latime, inaltime: r.fereastra.inaltime });
      cere();
    });
  };
  const odihneste = (): void => {
    clearTimeout(odihna.current);
    odihna.current = setTimeout(judecaFin, ODIHNA_FIN);
  };
  const schimbaCamera = (k: Camera): void => {
    cam.current = k;
    cere();
    odihneste();
  };

  /**
   * Simularea documentului de acum: CAM-ul în workerul lui (ADR 0109), apoi bazinul. O simulare nouă, un document schimbat
   * sau vederea închisă le anulează pe amândouă (`ctl`). `ce`: foaia, sau dopul cu numărul dat (ADR 0178).
   */
  const simuleaza = (ce: 'foaie' | number = alegere): void => {
    job.current?.abort();
    jobFin.current?.ctl.abort();
    jobFin.current = null;
    const ctl = new AbortController();
    job.current = ctl;
    const d = doc, s = sim.current;
    s.doc = d;
    setStare({ fel: 'calcul' });
    setFin({ fel: 'nimic' });
    import('../ui/actiuniExportCalcul.ts').then((calc) => {
      if (ctl.signal.aborted) return;
      const cuProgram = (p: ProgramSimulare): void => {
        if (ctl.signal.aborted) return;
        if (!p.ok) {
          setStare({ fel: 'refuz', motiv: p.motiv });
          return;
        }
        setDopuri({ lista: p.dopuri, ...(p.motivDopuri !== undefined ? { motiv: p.motivDopuri } : {}) });
        const fereastra = calc.fereastraFoii(p.foaie);
        setStare({ fel: 'simulare', celula: fereastra.celula });
        void calc.simuleazaRelief(p, fereastra, ctl.signal).then((r) => {
          if (ctl.signal.aborted) return;
          if (!r.ok) {
            if (r.anulata) return;
            if (r.eroare) reportError(new Error(`vederea 3D: ${r.motiv}`));
            setStare(r.eroare ? { fel: 'eroare', motiv: r.motiv } : { fel: 'refuz', motiv: r.motiv });
            return;
          }
          const g = gpu.current;
          if (g && (r.latime > g.maxim || r.inaltime > g.maxim)) {
            setStareGpu('prea-mare');
            return;
          }
          Object.assign(s, { calc, program: p, placa: r, fin: null });
          if (g) {
            for (const tx of [g.placa, g.fin]) if (tx) g.gl.deleteTexture(tx);
            g.placa = textura(g, r.latime, r.inaltime, r.z);
            g.fin = null;
          }
          // Camera rămâne cum a lăsat-o omul la o simulare din nou; prima oară, încadrează placa.
          if (!cam.current) cam.current = incadreaza(p.foaie, aspect(), zonaNdc());
          setStare({ fel: 'gata' });
          cere();
          odihneste();
        });
      };
      calc.programSimulare(d, ctl.signal, ce === 'foaie' ? undefined : ce).then(cuProgram, (e: unknown) => {
        if (ctl.signal.aborted || e instanceof calc.CalculAnulat) return;
        // Un worker căzut e o defecțiune (jurnalul, ca la simulare); o excepție a CAM-ului rămâne motivul, ca până acum.
        if (e instanceof calc.LucratorCazut) {
          reportError(new Error(`vederea 3D: ${e.message}`));
          setStare({ fel: 'eroare', motiv: e.message });
          return;
        }
        cuProgram({ ok: false, motiv: e instanceof Error ? e.message : String(e) });
      });
    }, (e: unknown) => {
      if (!ctl.signal.aborted) setStare({ fel: 'eroare', motiv: e instanceof Error ? e.message : String(e) });
    });
  };

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const porneste = (): boolean => {
      // Stencilul: golurile reliefurilor din fața plăcii, în vederea modelului.
      const gl = c.getContext('webgl2', { alpha: false, antialias: true, depth: true, stencil: true, preserveDrawingBuffer: true });
      const g = gl ? compileaza(gl) : null;
      gpu.current = g;
      if (!g) {
        setStareGpu('fara-webgl');
        return false;
      }
      const s = sim.current;
      if (s.placa) g.placa = textura(g, s.placa.latime, s.placa.inaltime, s.placa.z);
      if (s.fin) g.fin = textura(g, s.fin.latime, s.fin.inaltime, s.fin.z);
      for (const m of modele.current.values()) if (!m.lipsa) m.tex = textura(g, m.w, m.h, m.z);
      setStareGpu('ok');
      cere();
      return true;
    };
    let asteapta: ReturnType<typeof setTimeout> | undefined;
    const pierdut = (e: Event): void => {
      e.preventDefault();
      gpu.current = null;
      setStareGpu('context-pierdut');
      clearTimeout(asteapta);
      asteapta = setTimeout(() => { if (!gpu.current) setStareGpu('fara-webgl'); }, ASTEPTARE_REFACERE);
    };
    const refacut = (): void => {
      clearTimeout(asteapta);
      porneste();
    };
    c.addEventListener('webglcontextlost', pierdut);
    c.addEventListener('webglcontextrestored', refacut);
    // Fără WebGL2 nu se simulează nimic: n-ar avea unde să se vadă. Pe o foaie cu reliefuri, vederea pornește pe model:
    // simularea așteaptă „Tăiat”.
    if (porneste() && acum.current.vedere === 'taiat') simuleaza();
    // Rotița: nepasivă, ca pagina să nu se deruleze; apropie spre punctul de sub cursor.
    const roata = (e: WheelEvent): void => {
      e.preventDefault();
      e.stopPropagation();
      const k = cam.current;
      if (!k) return;
      schimbaCamera(apropie(k, subCursorEv(e, k), Math.exp(e.deltaY * 0.0015)));
    };
    c.addEventListener('wheel', roata, { passive: false });
    c.focus({ preventScroll: true });
    const tema = new MutationObserver(cere);
    tema.observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] });
    const sistem = window.matchMedia('(prefers-color-scheme: dark)');
    sistem.addEventListener('change', cere);
    return () => {
      clearTimeout(asteapta);
      clearTimeout(odihna.current);
      cancelAnimationFrame(cadru.current);
      job.current?.abort();
      jobFin.current?.ctl.abort();
      jobPotrivire.current?.abort();
      tema.disconnect();
      sistem.removeEventListener('change', cere);
      c.removeEventListener('webglcontextlost', pierdut);
      c.removeEventListener('webglcontextrestored', refacut);
      c.removeEventListener('wheel', roata);
      const g = gpu.current;
      if (g) for (const tx of [g.placa, g.fin, g.plan, ...[...modele.current.values()].map((m) => m.tex)]) if (tx) g.gl.deleteTexture(tx);
      gpu.current = null;
    };
    // Vederea se montează o dată pe deschidere; documentul de după se simulează doar la cererea omului („din nou”).
  }, []);

  useEffect(cere, [marime.latime, marime.inaltime, zona.x, zona.y, zona.w, zona.h]);

  /**
   * Modelul reliefurilor foii (ADR 0310 §7), cât e arătat: un relief nou sau schimbat se încarcă, doar cu dalele lui cu altă
   * cheie; unul plecat de pe foaie își lasă textura. O mutare sau o rotire nu încarcă nimic (aceeași formă): doar desenează.
   */
  useEffect(() => {
    if (vedere !== 'model') return undefined;
    const ms = modele.current, forme = new Map<string, FormaRelief>();
    for (const r of reliefuri) if (!forme.has(r.slot)) forme.set(r.slot, r.forma);
    for (const [k, m] of ms) {
      if (forme.has(k)) continue;
      if (m.tex) gpu.current?.gl.deleteTexture(m.tex);
      ms.delete(k);
    }
    const deFacut = [...forme].filter(([k, f]) => ms.get(k)?.forma !== f);
    const stareDin = (): StareModel => ({ fel: [...ms.values()].some((m) => m.lipsa) ? 'lipsa' : 'gata' });
    if (deFacut.length === 0) {
      setStareModel(stareDin());
      cere();
      return undefined;
    }
    const ctl = new AbortController();
    setStareModel({ fel: 'calcul' });
    void (async () => {
      for (const [k, f] of deFacut) {
        const v = ms.get(k), vechi = v && !v.lipsa && v.forma.nx === f.nx && v.forma.ny === f.ny ? v : null;
        const r = await incarcaModel(f, vechi, gpu.current?.maxim || 4096, STOCARE, ctl.signal);
        if (ctl.signal.aborted) return;
        aplicaModel(k, f, r, vechi);
      }
      setStareModel(stareDin());
      cere();
    })().catch((e: unknown) => {
      if (ctl.signal.aborted || e instanceof ReliefAnulat) return;
      reportError(new Error(`vederea 3D, modelul: ${e instanceof Error ? e.message : String(e)}`));
      setStareModel({ fel: 'eroare', motiv: e instanceof Error ? e.message : String(e) });
    });
    return () => { ctl.abort(); };
  }, [vedere, reliefuri]);

  /** Un model încărcat, pus în textura lui: refăcută întreagă (alt factor, altă grilă, prima dată) sau doar dalele lui noi. */
  function aplicaModel(slot: string, f: FormaRelief, r: ModelIncarcat | 'lipsa', vechi: SlotModel | null): void {
    const g = gpu.current, ms = modele.current, v = ms.get(slot);
    if (r === 'lipsa') {
      if (v?.tex) g?.gl.deleteTexture(v.tex);
      const gol = new Float32Array(0);
      ms.set(slot, { forma: f, lipsa: true, k: 1, chei: [], w: 0, h: 0, tx: 0, z: gol, min: gol, max: gol, varf: 0, adanc: 0, tex: null });
      return;
    }
    let m = vechi;
    if (r.tot || !m) {
      if (v?.tex) g?.gl.deleteTexture(v.tex);
      const w = Math.ceil(f.nx / r.k), h = Math.ceil(f.ny / r.k), tx = Math.ceil(f.nx / 256);
      m = {
        forma: f, lipsa: false, k: r.k, chei: r.chei, w, h, tx, z: new Float32Array(w * h), min: new Float32Array(r.chei.length),
        max: new Float32Array(r.chei.length), varf: 0, adanc: 0, tex: null,
      };
      m.tex = g ? textura(g, w, h, null) : null;
    }
    for (const d of r.dale) punDala(g, m, d);
    urcate.current += r.dale.length;
    m.forma = f;
    m.chei = r.chei;
    m.varf = m.max.reduce((a, b) => Math.max(a, b), -Infinity);
    m.adanc = m.varf - m.min.reduce((a, b) => Math.min(a, b), Infinity);
    ms.set(slot, m);
  }

  /** „Modelul / Tăiat” (ADR 0310 §7): „Tăiat” simulează placa prima dată când e ales; camera rămâne. */
  const alegeVedere = (v: 'model' | 'taiat'): void => {
    if (v === vedere) return;
    acum.current = { ...acum.current, vedere: v };
    setVedere(v);
    if (v === 'taiat' && sim.current.doc === null) simuleaza();
    cere();
  };
  // Un relief scos de pe foaie cât e arătat modelul: vederea trece pe „Tăiat” (comutatorul nu mai are rost).
  useEffect(() => { if (vedere === 'model' && reliefuri.length === 0) alegeVedere('taiat'); }, [reliefuri.length]);

  /** Punctul feței plăcii de sub cursor, pentru camera `k`. */
  function subCursorEv(e: { readonly clientX: number; readonly clientY: number }, k: Camera) {
    const c = canvas.current;
    if (!c) return null;
    const r = c.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) return null;
    const { pv } = matrici(k, r.width / r.height, centru());
    return subCursor(pv, ((e.clientX - r.left) / r.width) * 2 - 1, 1 - ((e.clientY - r.top) / r.height) * 2);
  }

  const gest = useRef<{ readonly fel: 'roteste' | 'muta'; x: number; y: number } | null>(null);
  const reincadreaza = (): void => {
    const p = placaVazuta();
    if (p) schimbaCamera(incadreaza(p, aspect(), zonaNdc()));
  };
  /**
   * Potrivirea dopului cu numărul `k` (ADR 0179), în workerul CAM. O alegere nouă, „Împreună” oprită sau vederea închisă o
   * anulează; un worker căzut e o defecțiune (jurnalul), un refuz al calculului e motivul.
   */
  const masoara = (k: number): void => {
    jobPotrivire.current?.abort();
    const ctl = new AbortController();
    jobPotrivire.current = ctl;
    const d = doc;
    setPotrivire({ fel: 'calcul' });
    const cade = (e: unknown): void => {
      if (ctl.signal.aborted) return;
      setPotrivire({ fel: 'refuz', motiv: e instanceof Error ? e.message : String(e) });
    };
    import('../ui/actiuniExportCalcul.ts').then((calc) => {
      if (ctl.signal.aborted) return;
      calc.potrivireSimulata(d, k, ctl.signal).then((r) => {
        if (ctl.signal.aborted) return;
        setPotrivire(r.ok ? { fel: 'gata', p: r.potrivire } : { fel: 'refuz', motiv: r.motiv });
      }, (e: unknown) => {
        if (e instanceof calc.CalculAnulat) return;
        if (e instanceof calc.LucratorCazut) reportError(new Error(`vederea 3D, potrivirea: ${e.message}`));
        cade(e);
      });
    }, cade);
  };
  const opresteImpreuna = (): void => {
    jobPotrivire.current?.abort();
    jobPotrivire.current = null;
    setImpreuna(false);
    setPotrivire({ fel: 'nimic' });
  };
  /** Foaia sau un dop (ADR 0178): altă alegere se simulează, iar camera încadrează ce s-a ales; „Împreună” se oprește. */
  const alege = (ce: 'foaie' | number): void => {
    if (ce === alegere) return;
    opresteImpreuna();
    setAlegere(ce);
    cam.current = null;
    simuleaza(ce);
  };

  const s = sim.current;
  const vechi = stare.fel === 'gata' && s.doc !== doc;
  const nr = (v: number): string => textNumar(Math.round(v * 1000) / 1000, limba === 'ro');
  // Dopul arătat (ADR 0178), numărat de la 1, ca fișierul lui; null pe foaie.
  const dop = alegere === 'foaie' ? null : alegere + 1;
  // „Împreună (secțiunea)” (ADR 0179 §1): pe orice dop ales (în V, cu pereți drepți sau, din felia 12.1↑e-4, în trepte); pe
  // foaie, oprită, cu motivul pe titlu (rămâne în tab, ca să-l spună).
  const poateImpreuna = alegere !== 'foaie' && dopuri.lista[alegere] !== undefined;
  const titluImpreuna = poateImpreuna ? t('editare.3d.impreuna.titlu') : t('editare.3d.impreuna.alege');
  const comutaImpreuna = (): void => {
    if (!poateImpreuna) return;
    if (impreuna) {
      opresteImpreuna();
      return;
    }
    setImpreuna(true);
    masoara(alegere);
  };
  /**
   * Titlul unui dop (ADR 0178 §2, precizarea din 21.11): incrustația lui, numită ca în bara de jos, apoi semifabricatul. Un
   * element pe care foaia nu-l mai are (o listă de dinaintea unei editări, până la simularea nouă) lasă doar semifabricatul.
   */
  const titluDop = (d: DopSimulat): string => {
    const semifabricat = t('editare.3d.dopul.semifabricat', {
      latime: nr(d.semifabricat.latime), inaltime: nr(d.semifabricat.inaltime), grosime: nr(d.semifabricat.grosimeMinima),
    });
    const e = lume?.get(d.element);
    return e ? `${t('editare.3d.dopul.incrustatia', { descriere: descriere(e) })} ${semifabricat}` : semifabricat;
  };
  const textStare = stareGpu === 'fara-webgl' ? t('editare.3d.fara-webgl')
    : stareGpu === 'context-pierdut' ? t('editare.3d.context')
      : stareGpu === 'prea-mare' ? t('editare.3d.prea-mare')
        : stare.fel === 'calcul' ? t('editare.3d.calcul')
          : stare.fel === 'simulare' ? (dop === null ? t('editare.3d.simulare', { celula: nr(stare.celula) }) : t('editare.3d.simulare-dop', { n: dop, celula: nr(stare.celula) }))
            : stare.fel === 'refuz' ? (dop === null ? t('editare.3d.refuz', { motiv: stare.motiv }) : t('editare.3d.refuz-dop', { n: dop, motiv: stare.motiv }))
              : stare.fel === 'eroare' ? t('editare.3d.eroare', { motiv: stare.motiv })
                : dop !== null && s.program && s.placa ? t('editare.3d.gata-dop', {
                  n: dop, celula: nr(s.placa.fereastra.celula), latime: nr(s.program.foaie.latime), inaltime: nr(s.program.foaie.inaltime), grosime: nr(s.program.foaie.grosime),
                })
                  : s.placa && s.placa.bloc > 1 ? t('editare.3d.gata-blocuri', { celula: nr(s.placa.fereastra.celula), pas: nr(s.placa.bloc * s.placa.fereastra.celula) })
                    : t('editare.3d.gata', { celula: nr(s.placa?.fereastra.celula ?? 0) });
  const taiat = vedere === 'taiat';
  // Vederea modelului (ADR 0310 §7): cât de adânc e cel mai adânc relief sub fața plăcii și, dacă e redus, pasul desenului.
  const incarcate = [...modele.current.values()].filter((m) => !m.lipsa && m.chei.length > 0);
  const kModel = Math.max(1, ...incarcate.map((m) => m.k));
  const pasModel = Math.max(0, ...incarcate.filter((m) => m.k === kModel).map((m) => m.k * m.forma.celula));
  const textModel = stareModel.fel === 'calcul' ? t('editare.3d.model.calcul')
    : stareModel.fel === 'lipsa' ? t('editare.3d.model.lipsa')
      : stareModel.fel === 'eroare' ? t('editare.3d.model.eroare', { motiv: stareModel.motiv })
        : t(kModel > 1 ? 'editare.3d.model.redus' : 'editare.3d.model.gata', {
          adancime: nr(Math.max(0, ...incarcate.map((m) => m.adanc))), pas: nr(pasModel), k: kModel,
        });
  const textAcum = taiat || stareGpu !== 'ok' ? textStare : textModel;
  const clasaStare = stareGpu !== 'ok' || (taiat ? stare.fel === 'eroare' || stare.fel === 'refuz' : stareModel.fel === 'eroare' || stareModel.fel === 'lipsa')
    ? 'cip cip-rosu' : 'cip';
  const textFin = !taiat || stare.fel !== 'gata' || stareGpu !== 'ok' ? null
    : fin.fel === 'calcul' ? t('editare.3d.fin.calcul')
      : fin.fel === 'gata' ? t('editare.3d.fin.gata', { latime: nr(fin.latime), inaltime: nr(fin.inaltime) })
        : fin.fel === 'refuz' ? t('editare.3d.fin.refuz', { motiv: fin.motiv })
          : s.placa && s.placa.fereastra.celula > 0.1 ? t('editare.3d.fin.sfat') : null;

  return (
    <div className="vedere-3d" data-testid="vedere-3d">
      <canvas
        ref={canvas}
        tabIndex={0}
        aria-label={t('editare.3d.panza')}
        data-testid="panza-3d"
        data-stare={stareGpu !== 'ok' ? stareGpu : taiat ? stare.fel : stareModel.fel}
        data-vedere={vedere}
        data-fin={fin.fel}
        data-relief={taiat && s.placa && stare.fel === 'gata' ? `${s.placa.latime}x${s.placa.inaltime}` : undefined}
        data-bloc={taiat && s.placa && stare.fel === 'gata' ? s.placa.bloc : undefined}
        data-celula={taiat && s.placa && stare.fel === 'gata' ? s.placa.fereastra.celula : undefined}
        data-fereastra={fin.fel === 'gata' && s.fin ? [s.fin.fereastra.x0, s.fin.fereastra.y0, s.fin.fereastra.latime, s.fin.fereastra.inaltime].map((v) => Math.round(v * 1000) / 1000).join(',') : undefined}
        data-adancime={taiat && s.placa && stare.fel === 'gata' ? Math.round(s.placa.adancimeMax * 1000) / 1000 : undefined}
        data-alegere={dop === null ? 'foaie' : `dop-${dop}`}
        data-vechi={taiat && vechi}
        onPointerDown={(e) => {
          e.stopPropagation();
          const muta = e.button === 2 || e.button === 1 || (e.button === 0 && e.shiftKey);
          if (e.button !== 0 && !muta) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          gest.current = { fel: muta ? 'muta' : 'roteste', x: e.clientX, y: e.clientY };
          e.currentTarget.dataset.gest = gest.current.fel;
        }}
        onPointerMove={(e) => {
          const g = gest.current, k = cam.current;
          if (!g || !k) return;
          if (g.fel === 'roteste') schimbaCamera(roteste(k, e.clientX - g.x, e.clientY - g.y));
          else {
            const de = subCursorEv({ clientX: g.x, clientY: g.y }, k), la = subCursorEv(e, k);
            if (de && la) schimbaCamera(panorameaza(k, de, la));
          }
          g.x = e.clientX;
          g.y = e.clientY;
        }}
        onPointerUp={(e) => { gest.current = null; delete e.currentTarget.dataset.gest; }}
        onPointerCancel={(e) => { gest.current = null; delete e.currentTarget.dataset.gest; }}
        onContextMenu={(e) => { e.preventDefault(); }}
        onDoubleClick={reincadreaza}
        onKeyDown={(e) => {
          const k = cam.current;
          if (e.key === 'Escape') {
            e.preventDefault();
            ultim.current.onInchide();
            return;
          }
          if (!k || e.ctrlKey || e.metaKey) return;
          const pas = e.shiftKey ? 4 : 1;
          const nou = e.key === 'ArrowLeft' ? roteste(k, -20 * pas, 0) : e.key === 'ArrowRight' ? roteste(k, 20 * pas, 0)
            : e.key === 'ArrowUp' ? roteste(k, 0, -10 * pas) : e.key === 'ArrowDown' ? roteste(k, 0, 10 * pas)
              : e.key === '+' || e.key === '=' ? apropie(k, null, 0.8) : e.key === '-' ? apropie(k, null, 1.25) : null;
          if (e.key === '0' || e.key === 'Home') {
            e.preventDefault();
            reincadreaza();
            return;
          }
          if (!nou) return;
          e.preventDefault();
          schimbaCamera(nou);
        }}
      />
      {/*
        Insula rămâne în zona liberă: cel mult cât lățimea ei (pe un ecran îngust, altfel intră sub panoul de proprietăți) și,
        cu secțiunea, cât înălțimea ei (o gaură prin foaia de 18): atunci secțiunea se derulează.
      */}
      <div
        className={impreuna ? 'insula stare-3d cu-sectiune' : 'insula stare-3d'} data-testid="stare-3d"
        style={{
          left: zona.x + 8, top: zona.y + 8, ['--zona-latime' as string]: `${Math.max(160, zona.w - 16)}px`,
          ...(impreuna ? { maxHeight: Math.max(160, zona.h - 16) } : {}),
        }}
      >
        {/* „Modelul / Tăiat” (ADR 0310 §7): doar pe o foaie cu reliefuri. */}
        {reliefuri.length > 0 ? (
          <span className="alegere-3d" role="group" aria-label={t('editare.3d.vedere')} data-testid="vedere-3d-alegere">
            <button type="button" aria-pressed={!taiat} data-3d-vedere="model" title={t('editare.3d.model.titlu')} onClick={() => { alegeVedere('model'); }}>
              {t('editare.3d.model')}
            </button>
            <button type="button" aria-pressed={taiat} data-3d-vedere="taiat" title={t('editare.3d.taiat.titlu')} onClick={() => { alegeVedere('taiat'); }}>
              {t('editare.3d.taiat')}
            </button>
          </span>
        ) : null}
        {/* Foaia sau un dop (ADR 0178): butoanele apar doar când foaia are dopuri (sau unul e încă ales). */}
        {taiat && (dopuri.lista.length > 0 || dop !== null) ? (
          <span className="alegere-3d" role="group" aria-label={t('editare.3d.alegere')} data-testid="alegere-3d">
            <button type="button" aria-pressed={dop === null} data-3d-alege="foaie" onClick={() => { alege('foaie'); }}>{t('editare.3d.foaia')}</button>
            {dopuri.lista.map((d, k) => (
              <button
                key={`${k}-${d.element}`}
                type="button"
                aria-pressed={alegere === k}
                data-3d-alege={`dop-${k + 1}`}
                title={titluDop(d)}
                onClick={() => { alege(k); }}
              >
                {t('editare.3d.dopul', { n: k + 1 })}
              </button>
            ))}
            <button type="button" data-3d="impreuna" aria-pressed={impreuna} aria-disabled={!poateImpreuna} title={titluImpreuna} onClick={comutaImpreuna}>
              {t('editare.3d.impreuna')}
            </button>
          </span>
        ) : null}
        <span className={clasaStare} role="status" data-testid="stare-3d-text" title={textAcum}>{textAcum}</span>
        {taiat && dopuri.motiv !== undefined ? (
          <span className="cip cip-rosu" data-testid="stare-3d-dopuri">{t('editare.3d.dopuri-refuz', { motiv: dopuri.motiv })}</span>
        ) : null}
        {textFin ? <span className={fin.fel === 'refuz' ? 'cip cip-rosu' : 'cip'} data-testid="stare-3d-fin">{textFin}</span> : null}
        {taiat && vechi ? (
          <span className="cip cip-atentie" data-testid="stare-3d-vechi">
            {t('editare.3d.vechi')}{' '}
            <button type="button" data-3d="din-nou" onClick={() => { simuleaza(); if (impreuna && alegere !== 'foaie') masoara(alegere); }}>{t('editare.3d.din-nou')}</button>
          </span>
        ) : null}
        {(taiat ? stare.fel === 'gata' : stareModel.fel !== 'calcul') && stareGpu === 'ok' ? (
          <span className="randul-3d">
            <button type="button" data-3d="incadreaza" onClick={reincadreaza}>{t(dop === null ? 'editare.3d.incadreaza' : 'editare.3d.incadreaza-dop')}</button>
            <span className="sfat-3d">{t('editare.3d.sfat')}</span>
          </span>
        ) : null}
        {taiat && impreuna && dop !== null ? (
          <section className="sectiune-3d" data-testid="sectiune-3d" aria-label={t('editare.3d.sectiune.eticheta', { n: dop })}>
            {potrivire.fel === 'calcul' ? <span className="cip" role="status">{t('editare.3d.sectiune.calcul', { n: dop })}</span> : null}
            {potrivire.fel === 'refuz' ? (
              <span className="cip cip-rosu" role="status">{t('editare.3d.sectiune.refuz', { n: dop, motiv: potrivire.motiv })}</span>
            ) : null}
            {potrivire.fel === 'gata' ? <Sectiune3D p={potrivire.p} n={dop} /> : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}
