import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SCARA_MAXIMA, SCARA_MINIMA, type CerereDesen, type FormaDesen, type RaspunsDesen, type Vedere,
} from './protocol.ts';

type Props = {
  readonly forme: readonly FormaDesen[];
  readonly foaie: { readonly latime: number; readonly inaltime: number };
  readonly selectie: readonly string[];
  /** Clicul, în mm, cu toleranța de 4 pixeli convertită în mm. */
  readonly onClic: (x: number, y: number, toleranta: number) => void;
  /** O mutare terminată a selecției, în mm. */
  readonly onMutare: (dx: number, dy: number) => void;
};

/** Pixelii de toleranță ai clicului și pragul de la care o apăsare devine tragere. */
const TOLERANTA_PX = 4;
const PRAG_TRAGERE_PX = 3;

function culori(): CerereDesen['culori'] {
  const s = getComputedStyle(document.documentElement);
  const v = (nume: string, implicit: string): string => s.getPropertyValue(nume).trim() || implicit;
  return {
    fundal: v('--panza-fundal', '#e9e6df'),
    foaie: v('--panza-foaie', '#fbfaf7'),
    linie: v('--panza-linie', '#1d232b'),
    selectie: v('--panza-selectie', '#c25e00'),
  };
}

/** Vederea care așază foaia întreagă în pânză, cu o margine. */
export function vedereaPotrivita(lat: number, ina: number, foaie: { latime: number; inaltime: number }): Vedere {
  const margine = 24;
  const scara = Math.min(SCARA_MAXIMA, Math.max(SCARA_MINIMA,
    Math.min((lat - 2 * margine) / foaie.latime, (ina - 2 * margine) / foaie.inaltime)));
  return { scara, tx: (lat - foaie.latime * scara) / 2, ty: ina - (ina - foaie.inaltime * scara) / 2 };
}

/**
 * Pânza v0: vectorii exacți desenați de worker (`lucrator.ts`), afișați pe o pânză `bitmaprenderer`. Pânza nu știe de
 * document: primește formele gata descrise și trimite înapoi gesturile (clic, mutare), pe care aplicația le rulează
 * prin registrul de acțiuni.
 */
export function Panza({ forme, foaie, selectie, onClic, onMutare }: Props) {
  const panzaRef = useRef<HTMLCanvasElement | null>(null);
  const lucratorRef = useRef<Worker | null>(null);
  const cerereRef = useRef(0);
  const [marime, setMarime] = useState({ latime: 0, inaltime: 0, dpr: 1 });
  const [vedere, setVedere] = useState<Vedere | null>(null);
  const [deplasare, setDeplasare] = useState({ dx: 0, dy: 0 });
  const [afisata, setAfisata] = useState(0);
  const [trimisa, setTrimisa] = useState(0);
  const gest = useRef<{ tip: 'pan' | 'mutare' | 'apasare'; x0: number; y0: number; v0: Vedere } | null>(null);
  const spatiu = useRef(false);

  // Workerul: unul pe pânză, închis la demontare.
  useEffect(() => {
    const w = new Worker(new URL('./lucrator.ts', import.meta.url), { type: 'module' });
    lucratorRef.current = w;
    w.onmessage = (e: MessageEvent<RaspunsDesen>) => {
      const ctx = panzaRef.current?.getContext('bitmaprenderer');
      if (ctx) ctx.transferFromImageBitmap(e.data.imagine);
      else e.data.imagine.close();
      setAfisata(e.data.cerere);
    };
    return () => { w.terminate(); };
  }, []);

  // Mărimea pânzei urmărește cutia ei din pagină.
  useEffect(() => {
    const el = panzaRef.current;
    if (!el) return;
    let cadru = 0;
    // Pânza e poziționată absolut în cutia ei, deci mărimea ei nu schimbă layout-ul; lucrul se face în cadrul următor,
    // ca observatorul să nu raporteze „ResizeObserver loop” (o eroare de fereastră, prinsă de jurnal).
    const ro = new ResizeObserver(() => { cancelAnimationFrame(cadru); cadru = requestAnimationFrame(masoara); });
    const masoara = (): void => {
      const r = el.getBoundingClientRect();
      const m = { latime: Math.max(1, Math.round(r.width)), inaltime: Math.max(1, Math.round(r.height)), dpr: window.devicePixelRatio || 1 };
      // Dimensiunile pânzei se schimbă doar aici: altfel fiecare redesen ar goli-o până vine imaginea nouă.
      el.width = Math.round(m.latime * m.dpr);
      el.height = Math.round(m.inaltime * m.dpr);
      setMarime(m);
    };
    ro.observe(el);
    return () => { ro.disconnect(); cancelAnimationFrame(cadru); };
  }, []);

  // La prima mărime reală, foaia întreagă în vedere. O cutie încă nemăsurată (0 px) ar da scara minimă.
  useEffect(() => {
    if (!vedere && marime.latime > 100 && marime.inaltime > 100) setVedere(vedereaPotrivita(marime.latime, marime.inaltime, foaie));
  }, [marime, foaie, vedere]);

  // Orice schimbare → o cerere nouă către worker.
  useEffect(() => {
    const w = lucratorRef.current;
    if (!w || !vedere) return;
    cerereRef.current += 1;
    setTrimisa(cerereRef.current);
    const cerere: CerereDesen = {
      tip: 'deseneaza', cerere: cerereRef.current, latime: marime.latime, inaltime: marime.inaltime, dpr: marime.dpr,
      vedere, foaie, forme, selectie, deplasare, culori: culori(),
    };
    w.postMessage(cerere);
  }, [marime, vedere, foaie, forme, selectie, deplasare]);

  const laDocument = useCallback((ev: { clientX: number; clientY: number }, v: Vedere) => {
    const r = panzaRef.current?.getBoundingClientRect();
    const sx = ev.clientX - (r?.left ?? 0), sy = ev.clientY - (r?.top ?? 0);
    return { x: (sx - v.tx) / v.scara, y: (v.ty - sy) / v.scara, sx, sy };
  }, []);

  useEffect(() => {
    const jos = (e: KeyboardEvent): void => { if (e.code === 'Space') spatiu.current = true; };
    const sus = (e: KeyboardEvent): void => { if (e.code === 'Space') spatiu.current = false; };
    window.addEventListener('keydown', jos);
    window.addEventListener('keyup', sus);
    return () => { window.removeEventListener('keydown', jos); window.removeEventListener('keyup', sus); };
  }, []);

  // Rotița: zoom în jurul cursorului. Ascultătorul e pasiv=false, ca pagina să nu se deruleze.
  useEffect(() => {
    const el = panzaRef.current;
    if (!el) return;
    const roata = (e: WheelEvent): void => {
      e.preventDefault();
      setVedere((v) => {
        if (!v) return v;
        const p = laDocument(e, v);
        const scara = Math.min(SCARA_MAXIMA, Math.max(SCARA_MINIMA, v.scara * Math.exp(-e.deltaY * 0.0015)));
        return { scara, tx: p.sx - p.x * scara, ty: p.sy + p.y * scara };
      });
    };
    el.addEventListener('wheel', roata, { passive: false });
    return () => { el.removeEventListener('wheel', roata); };
  }, [laDocument]);

  const apasa = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    if (!vedere) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (e.button === 1 || (e.button === 0 && spatiu.current)) {
      gest.current = { tip: 'pan', x0: e.clientX, y0: e.clientY, v0: vedere };
      return;
    }
    if (e.button !== 0) return;
    const p = laDocument(e, vedere);
    onClic(p.x, p.y, TOLERANTA_PX / vedere.scara);
    gest.current = { tip: 'apasare', x0: e.clientX, y0: e.clientY, v0: vedere };
  };

  const misca = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    const g = gest.current;
    if (!g) return;
    const dx = e.clientX - g.x0, dy = e.clientY - g.y0;
    if (g.tip === 'pan') {
      setVedere({ ...g.v0, tx: g.v0.tx + dx, ty: g.v0.ty + dy });
    } else if (g.tip === 'apasare' && Math.hypot(dx, dy) >= PRAG_TRAGERE_PX && selectie.length > 0) {
      gest.current = { ...g, tip: 'mutare' };
    }
    if (gest.current?.tip === 'mutare') setDeplasare({ dx: dx / g.v0.scara, dy: -dy / g.v0.scara });
  };

  const elibereaza = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    const g = gest.current;
    gest.current = null;
    if (g?.tip === 'mutare') {
      const dx = (e.clientX - g.x0) / g.v0.scara, dy = -(e.clientY - g.y0) / g.v0.scara;
      setDeplasare({ dx: 0, dy: 0 });
      onMutare(dx, dy);
    }
  };

  return (
    <div className="panza-cutie">
    <canvas
      ref={panzaRef}
      className="panza"
      data-testid="panza"
      data-scara={vedere?.scara}
      data-tx={vedere?.tx}
      data-ty={vedere?.ty}
      data-dpr={marime.dpr}
      data-afisata={afisata}
      data-cerere={trimisa}
      onPointerDown={apasa}
      onPointerMove={misca}
      onPointerUp={elibereaza}
      onPointerCancel={() => { gest.current = null; setDeplasare({ dx: 0, dy: 0 }); }}
      onContextMenu={(e) => { e.preventDefault(); }}
    />
    </div>
  );
}
