import { useEffect, useRef, useState, type ReactElement } from 'react';
import type { Zona } from '../canvas/Rigle.tsx';
import '../i18n/editare.ts';
import { t } from '../i18n/t.ts';
import type { Document } from '../model/document.ts';
import type { ProgramSimulare, ReliefSimulat } from '../ui/actiuniExportTipuri.ts';
import { textNumar } from '../ui/numar.ts';
import { useLimba } from '../ui/useLimba.ts';
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
uniform int u_mod;
uniform mat4 u_pv;
out vec3 v_p;
float h(int i, int j) { return max(texelFetch(u_z, ivec2(i, j), 0).r, u_fund); }
float coord(int k, int n, float a, float b, float pas) { return k <= 0 ? a : k >= n - 1 ? b : a + (float(k) + 0.5) * pas; }
void main() {
  int i; int j; float z;
  if (u_mod == 0) {
    i = gl_VertexID >> 1;
    j = gl_InstanceID + (gl_VertexID & 1);
    z = h(i, j);
  } else {
    int k = gl_VertexID >> 1;
    if (u_mod == 1) { i = k; j = 0; }
    else if (u_mod == 2) { i = k; j = u_n.y - 1; }
    else if (u_mod == 3) { i = 0; j = k; }
    else { i = u_n.x - 1; j = k; }
    z = (gl_VertexID & 1) == 1 ? h(i, j) : u_fund;
  }
  v_p = vec3(coord(i, u_n.x, u_cutie.x, u_cutie.z, u_pas.x), coord(j, u_n.y, u_cutie.y, u_cutie.w, u_pas.y), z);
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

const UNIFORME = ['z', 'n', 'cutie', 'pas', 'fund', 'mod', 'pv', 'sus', 'gaura', 'ochi', 'lemn', 'taiat', 'prin', 'perete'] as const;

type Gpu = {
  readonly gl: WebGL2RenderingContext;
  readonly prog: WebGLProgram;
  readonly vao: WebGLVertexArrayObject;
  readonly u: Record<(typeof UNIFORME)[number], WebGLUniformLocation | null>;
  readonly maxim: number;
  placa: WebGLTexture | null;
  fin: WebGLTexture | null;
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
  return { gl, prog, vao, u, maxim: Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) || 0, placa: null, fin: null };
}

function textura(g: Gpu, r: Relief): WebGLTexture | null {
  const { gl } = g, tx = gl.createTexture();
  if (!tx) return null;
  gl.bindTexture(gl.TEXTURE_2D, tx);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, r.latime, r.inaltime, 0, gl.RED, gl.FLOAT, r.z);
  return tx;
}

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

  const deseneaza = (): void => {
    const g = gpu.current, c = canvas.current, s = sim.current, k = cam.current;
    if (!g || !c || !s.placa || !g.placa || !k || g.gl.isContextLost()) return;
    const { gl, u } = g;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(c.clientWidth * dpr)), h = Math.max(1, Math.round(c.clientHeight * dpr));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const col = culori();
    gl.viewport(0, 0, w, h);
    gl.clearColor(col.fundal[0], col.fundal[1], col.fundal[2], 1);
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(g.prog);
    gl.bindVertexArray(g.vao);
    const m = matrici(k, w / h, centru());
    gl.uniformMatrix4fv(u.pv, false, Float32Array.from(m.pv));
    gl.uniform3f(u.ochi, m.ochi.x, m.ochi.y, m.ochi.z);
    gl.uniform1f(u.sus, s.placa.sus);
    gl.uniform1f(u.fund, s.placa.fund);
    gl.uniform3fv(u.lemn, col.lemn);
    gl.uniform3fv(u.taiat, col.taiat);
    gl.uniform3fv(u.prin, col.prin);
    gl.uniform3fv(u.perete, col.perete);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(u.z, 0);
    const relief = (tx: WebGLTexture, r: Relief, gaura: Relief['fereastra'] | null, pereti: boolean): void => {
      const f = r.fereastra, pas = r.bloc * f.celula;
      gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.uniform2i(u.n, r.latime, r.inaltime);
      gl.uniform4f(u.cutie, f.x0, f.y0, f.x0 + f.latime, f.y0 + f.inaltime);
      gl.uniform2f(u.pas, pas, pas);
      if (gaura) gl.uniform4f(u.gaura, gaura.x0, gaura.y0, gaura.x0 + gaura.latime, gaura.y0 + gaura.inaltime);
      else gl.uniform4f(u.gaura, 1, 1, 0, 0);
      gl.uniform1i(u.mod, 0);
      if (r.latime >= 2 && r.inaltime >= 2) gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 2 * r.latime, r.inaltime - 1);
      if (!pereti) return;
      for (let p = 1; p <= 4; p++) {
        gl.uniform1i(u.mod, p);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 2 * (p <= 2 ? r.latime : r.inaltime));
      }
    };
    const fine = s.fin && g.fin ? s.fin : null;
    relief(g.placa, s.placa, fine?.fereastra ?? null, true);
    if (fine && g.fin) relief(g.fin, fine, null, false);
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
    if (!s.calc || !s.program || !s.placa || !k) return;
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
        g.fin = textura(g, r);
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
   * sau vederea închisă le anulează pe amândouă (`ctl`).
   */
  const simuleaza = (): void => {
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
            g.placa = textura(g, r);
            g.fin = null;
          }
          // Camera rămâne cum a lăsat-o omul la o simulare din nou; prima oară, încadrează placa.
          if (!cam.current) cam.current = incadreaza(p.foaie, aspect(), zonaNdc());
          setStare({ fel: 'gata' });
          cere();
          odihneste();
        });
      };
      calc.programSimulare(d, ctl.signal).then(cuProgram, (e: unknown) => {
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
      const gl = c.getContext('webgl2', { alpha: false, antialias: true, depth: true, preserveDrawingBuffer: true });
      const g = gl ? compileaza(gl) : null;
      gpu.current = g;
      if (!g) {
        setStareGpu('fara-webgl');
        return false;
      }
      const s = sim.current;
      if (s.placa) g.placa = textura(g, s.placa);
      if (s.fin) g.fin = textura(g, s.fin);
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
    // Fără WebGL2 nu se simulează nimic: n-ar avea unde să se vadă.
    if (porneste()) simuleaza();
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
      tema.disconnect();
      sistem.removeEventListener('change', cere);
      c.removeEventListener('webglcontextlost', pierdut);
      c.removeEventListener('webglcontextrestored', refacut);
      c.removeEventListener('wheel', roata);
      const g = gpu.current;
      if (g) for (const tx of [g.placa, g.fin]) if (tx) g.gl.deleteTexture(tx);
      gpu.current = null;
    };
    // Vederea se montează o dată pe deschidere; documentul de după se simulează doar la cererea omului („din nou”).
  }, []);

  useEffect(cere, [marime.latime, marime.inaltime, zona.x, zona.y, zona.w, zona.h]);

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
    const p = sim.current.program;
    if (p) schimbaCamera(incadreaza(p.foaie, aspect(), zonaNdc()));
  };

  const s = sim.current;
  const vechi = stare.fel === 'gata' && s.doc !== doc;
  const nr = (v: number): string => textNumar(Math.round(v * 1000) / 1000, limba === 'ro');
  const textStare = stareGpu === 'fara-webgl' ? t('editare.3d.fara-webgl')
    : stareGpu === 'context-pierdut' ? t('editare.3d.context')
      : stareGpu === 'prea-mare' ? t('editare.3d.prea-mare')
        : stare.fel === 'calcul' ? t('editare.3d.calcul')
          : stare.fel === 'simulare' ? t('editare.3d.simulare', { celula: nr(stare.celula) })
            : stare.fel === 'refuz' ? t('editare.3d.refuz', { motiv: stare.motiv })
              : stare.fel === 'eroare' ? t('editare.3d.eroare', { motiv: stare.motiv })
                : s.placa && s.placa.bloc > 1 ? t('editare.3d.gata-blocuri', { celula: nr(s.placa.fereastra.celula), pas: nr(s.placa.bloc * s.placa.fereastra.celula) })
                  : t('editare.3d.gata', { celula: nr(s.placa?.fereastra.celula ?? 0) });
  const clasaStare = stareGpu !== 'ok' || stare.fel === 'eroare' ? 'cip cip-rosu' : stare.fel === 'refuz' ? 'cip cip-rosu' : 'cip';
  const textFin = stare.fel !== 'gata' || stareGpu !== 'ok' ? null
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
        data-stare={stareGpu === 'ok' ? stare.fel : stareGpu}
        data-fin={fin.fel}
        data-relief={s.placa && stare.fel === 'gata' ? `${s.placa.latime}x${s.placa.inaltime}` : undefined}
        data-bloc={s.placa && stare.fel === 'gata' ? s.placa.bloc : undefined}
        data-celula={s.placa && stare.fel === 'gata' ? s.placa.fereastra.celula : undefined}
        data-fereastra={fin.fel === 'gata' && s.fin ? [s.fin.fereastra.x0, s.fin.fereastra.y0, s.fin.fereastra.latime, s.fin.fereastra.inaltime].map((v) => Math.round(v * 1000) / 1000).join(',') : undefined}
        data-adancime={s.placa && stare.fel === 'gata' ? Math.round(s.placa.adancimeMax * 1000) / 1000 : undefined}
        data-vechi={vechi}
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
      <div className="insula stare-3d" style={{ left: zona.x + 8, top: zona.y + 8 }} data-testid="stare-3d">
        <span className={clasaStare} role="status" data-testid="stare-3d-text" title={textStare}>{textStare}</span>
        {textFin ? <span className={fin.fel === 'refuz' ? 'cip cip-rosu' : 'cip'} data-testid="stare-3d-fin">{textFin}</span> : null}
        {vechi ? (
          <span className="cip cip-atentie" data-testid="stare-3d-vechi">
            {t('editare.3d.vechi')}{' '}
            <button type="button" data-3d="din-nou" onClick={simuleaza}>{t('editare.3d.din-nou')}</button>
          </span>
        ) : null}
        {stare.fel === 'gata' && stareGpu === 'ok' ? (
          <span className="randul-3d">
            <button type="button" data-3d="incadreaza" onClick={reincadreaza}>{t('editare.3d.incadreaza')}</button>
            <span className="sfat-3d">{t('editare.3d.sfat')}</span>
          </span>
        ) : null}
      </div>
    </div>
  );
}
