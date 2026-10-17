import { useEffect, useRef, type ReactNode } from 'react';
import type { Bucata, Vedere } from './protocol.ts';

/** Starea stratului, pentru cipul aplicației: desenat, fără WebGL2, sau cu contextul pierdut (revine singur). */
export type StareStrat = 'ok' | 'fara-webgl' | 'context-pierdut';

type Props = {
  readonly bucati: readonly Bucata[];
  readonly vedere: Vedere;
  readonly marime: { readonly latime: number; readonly inaltime: number; readonly dpr: number };
  /** Traseul vechi (documentul s-a schimbat de la calcul): stins. */
  readonly stins: boolean;
  readonly onStare: (s: StareStrat) => void;
  /** Un cadru care a durat peste `CADRU_LENT_MS`, cu vârfurile desenate: aplicația înjumătățește bugetul. */
  readonly onLent: (segmente: number) => void;
};

/** Un cadru mai lung de atât (măsurat cu `finish`, o dată pe set de bucăți) cere un buget mai mic (ADR 0013, T13). */
export const CADRU_LENT_MS = 32;
/** Cât așteaptă stratul refacerea unui context pierdut, până să spună că WebGL2 e indisponibil (ms). */
export const ASTEPTARE_REFACERE = 5000;

const VS = `#version 300 es
in vec2 a_rel;
uniform vec2 u_off;
uniform float u_s;
uniform vec2 u_vp;
void main() {
  vec2 p = vec2(a_rel.x * u_s + u_off.x, u_off.y - a_rel.y * u_s);
  gl_Position = vec4(p.x / u_vp.x * 2.0 - 1.0, 1.0 - p.y / u_vp.y * 2.0, 0.0, 1.0);
}`;
const FS = `#version 300 es
precision mediump float;
uniform vec4 u_culoare;
out vec4 o;
void main() { o = u_culoare; }`;

type Gpu = {
  readonly gl: WebGL2RenderingContext;
  readonly prog: WebGLProgram;
  readonly u: { readonly off: WebGLUniformLocation | null; readonly s: WebGLUniformLocation | null; readonly vp: WebGLUniformLocation | null; readonly culoare: WebGLUniformLocation | null };
  incarcate: Array<{ readonly b: Bucata; readonly vao: WebGLVertexArrayObject; readonly vbo: WebGLBuffer; readonly ibo: WebGLBuffer }>;
  setul: readonly Bucata[] | null;
  masurat: boolean;
};

function compileaza(gl: WebGL2RenderingContext): Gpu | null {
  const sh = (tip: number, src: string): WebGLShader | null => {
    const s = gl.createShader(tip);
    if (!s) return null;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const v = sh(gl.VERTEX_SHADER, VS), f = sh(gl.FRAGMENT_SHADER, FS);
  const prog = gl.createProgram();
  if (!v || !f || !prog) return null;
  gl.attachShader(prog, v);
  gl.attachShader(prog, f);
  gl.bindAttribLocation(prog, 0, 'a_rel');
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  return {
    gl, prog,
    u: { off: gl.getUniformLocation(prog, 'u_off'), s: gl.getUniformLocation(prog, 'u_s'), vp: gl.getUniformLocation(prog, 'u_vp'), culoare: gl.getUniformLocation(prog, 'u_culoare') },
    incarcate: [], setul: null, masurat: false,
  };
}

function elibereaza(g: Gpu): void {
  for (const x of g.incarcate) {
    g.gl.deleteVertexArray(x.vao);
    g.gl.deleteBuffer(x.vbo);
    g.gl.deleteBuffer(x.ibo);
  }
  g.incarcate = [];
  g.setul = null;
}

function incarca(g: Gpu, bucati: readonly Bucata[]): void {
  const { gl } = g;
  elibereaza(g);
  for (const b of bucati) {
    const vao = gl.createVertexArray(), vbo = gl.createBuffer(), ibo = gl.createBuffer();
    if (!vao || !vbo || !ibo) continue;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, b.varfuri, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, b.indici, gl.STATIC_DRAW);
    g.incarcate.push({ b, vao, vbo, ibo });
  }
  gl.bindVertexArray(null);
  g.setul = bucati;
  g.masurat = false;
}

/** Culorile CSS deja citite (o culoare se citește printr-un canvas 2D o singură dată, nu la fiecare cadru al unui pan). */
const CULORI = new Map<string, readonly [number, number, number, number]>();

/** O culoare CSS ca RGBA în [0, 1], premultiplicată cu `alfa` (canvasul are alfa premultiplicat). */
function rgba(css: string, alfa: number): [number, number, number, number] {
  let d = CULORI.get(css);
  if (!d) {
    const c = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    if (!c) return [0, 0, 0, alfa];
    c.fillStyle = css;
    c.fillRect(0, 0, 1, 1);
    const p = c.getImageData(0, 0, 1, 1).data;
    d = [(p[0] ?? 0) / 255, (p[1] ?? 0) / 255, (p[2] ?? 0) / 255, (p[3] ?? 255) / 255];
    CULORI.set(css, d);
  }
  const a = d[3] * alfa;
  return [d[0] * a, d[1] * a, d[2] * a, a];
}

function culoriTraseu(stins: boolean): { readonly taiere: [number, number, number, number]; readonly rapid: [number, number, number, number] } {
  const s = getComputedStyle(document.documentElement);
  const v = (nume: string, implicit: string): string => s.getPropertyValue(nume).trim() || implicit;
  const alfa = stins ? 0.35 : 1;
  return { taiere: rgba(v('--traseu-taiere', '#0a7d53'), alfa), rapid: rgba(v('--traseu-rapid', '#8a8f98'), alfa * 0.8) };
}

/**
 * Stratul traseului (ADR 0038 §1, §3): un canvas WebGL2 deasupra vectorilor, transparent, fără evenimente. Vârfurile urcă
 * relativ la originea bucății; translația vederii se calculează aici în double (`u_off`), deci precizia nu depinde de cât
 * de departe de origine e bucata. Bucățile din afara vederii se sar. Fără WebGL2 (sau contextul pierdut) spune prin
 * `onStare`; la `webglcontextrestored`, bufferele se refac.
 */
export function StratTraseu({ bucati, vedere, marime, stins, onStare, onLent }: Props): ReactNode {
  const ref = useRef<HTMLCanvasElement>(null);
  const gpu = useRef<Gpu | null>(null);
  const cadru = useRef(0);
  const ultim = useRef({ bucati, vedere, marime, stins, onStare, onLent });
  ultim.current = { bucati, vedere, marime, stins, onStare, onLent };

  const deseneaza = (): void => {
    const g = gpu.current;
    const c = ref.current;
    if (!g || !c || g.gl.isContextLost()) return;
    const { bucati: b, vedere: v, marime: m, stins: st } = ultim.current;
    const { gl } = g;
    const w = Math.max(1, Math.round(m.latime * m.dpr)), h = Math.max(1, Math.round(m.inaltime * m.dpr));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    if (g.setul !== b) incarca(g, b);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(g.prog);
    gl.uniform1f(g.u.s, v.scara * m.dpr);
    gl.uniform2f(g.u.vp, w, h);
    const culori = culoriTraseu(st);
    // Lumea vizibilă, în mm: bucățile care n-o ating nu se desenează.
    const x0 = -v.tx / v.scara, x1 = (m.latime - v.tx) / v.scara, y0 = (v.ty - m.inaltime) / v.scara, y1 = v.ty / v.scara;
    const t0 = g.masurat ? 0 : performance.now();
    let varfuri = 0;
    for (const rapid of [true, false]) {
      gl.uniform4fv(g.u.culoare, rapid ? culori.rapid : culori.taiere);
      for (const x of g.incarcate) {
        if (x.b.rapid !== rapid) continue;
        const k = x.b.cutie;
        if (k.maxX < x0 || k.minX > x1 || k.maxY < y0 || k.minY > y1) continue;
        // În double, pe procesor: originea bucății în pixeli fizici (ADR 0038 §1, precizia).
        gl.uniform2f(g.u.off, (x.b.origine.x * v.scara + v.tx) * m.dpr, (v.ty - x.b.origine.y * v.scara) * m.dpr);
        gl.bindVertexArray(x.vao);
        gl.drawElements(gl.LINE_STRIP, x.b.indici.length, gl.UNSIGNED_INT, 0);
        varfuri += x.b.varfuri.length / 2;
      }
    }
    gl.bindVertexArray(null);
    c.dataset.varfuri = String(varfuri);
    if (!g.masurat) {
      gl.finish();
      g.masurat = true;
      const ms = performance.now() - t0;
      if (ms > CADRU_LENT_MS) ultim.current.onLent(varfuri);
    }
  };
  const cere = (): void => {
    cancelAnimationFrame(cadru.current);
    cadru.current = requestAnimationFrame(deseneaza);
  };

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const porneste = (): void => {
      const gl = c.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: true });
      const g = gl ? compileaza(gl) : null;
      gpu.current = g;
      ultim.current.onStare(g ? 'ok' : 'fara-webgl');
      if (g) cere();
    };
    // Un context nerefăcut în `ASTEPTARE_REFACERE` nu mai „revine singur”: cipul spune că WebGL2 e indisponibil (ADR 0038
    // §3), iar T montează un strat nou (recenzia 2.8e, F4).
    let asteapta: ReturnType<typeof setTimeout> | undefined;
    const pierdut = (e: Event): void => {
      e.preventDefault();
      if (gpu.current) gpu.current.incarcate = [];
      gpu.current = null;
      ultim.current.onStare('context-pierdut');
      clearTimeout(asteapta);
      asteapta = setTimeout(() => { if (!gpu.current) ultim.current.onStare('fara-webgl'); }, ASTEPTARE_REFACERE);
    };
    const refacut = (): void => {
      clearTimeout(asteapta);
      porneste();
    };
    c.addEventListener('webglcontextlost', pierdut);
    c.addEventListener('webglcontextrestored', refacut);
    porneste();
    // Culorile se citesc din temă la fiecare desen: o temă schimbată (aleasă sau a sistemului) redesenează (F6).
    const tema = new MutationObserver(cere);
    tema.observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] });
    const sistem = window.matchMedia('(prefers-color-scheme: dark)');
    sistem.addEventListener('change', cere);
    return () => {
      clearTimeout(asteapta);
      tema.disconnect();
      sistem.removeEventListener('change', cere);
      cancelAnimationFrame(cadru.current);
      c.removeEventListener('webglcontextlost', pierdut);
      c.removeEventListener('webglcontextrestored', refacut);
      if (gpu.current) elibereaza(gpu.current);
      gpu.current = null;
    };
  }, []);

  useEffect(cere, [bucati, vedere, marime, stins]);

  return <canvas ref={ref} className="strat-traseu" data-testid="strat-traseu" data-stins={stins} aria-hidden="true" />;
}
