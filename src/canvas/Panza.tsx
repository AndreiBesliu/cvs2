import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
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
  /**
   * Zona pânzei pe care n-o acoperă barele și panourile care plutesc deasupra ei: foaia se potrivește în ea. Fără ea (sau
   * mai mică de 100 px), foaia se potrivește în toată pânza.
   */
  readonly zona?: RefObject<HTMLElement | null>;
  /** Crește la fiecare „arată toată foaia”: vederea se potrivește din nou. */
  readonly potrivire?: number;
  /** Cutia selecției, în mm: bara selecției (`children`) stă lângă ea, sub ea dacă încape, altfel deasupra. */
  readonly cutie?: { readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number } | null;
  readonly children?: ReactNode;
  /**
   * Cursorul deasupra pânzei, în mm ai foii (ca documentul: originea în colțul stânga-jos, Y în sus), la fiecare mișcare;
   * `null` când iese de pe pânză (și când trece peste o bară care plutește deasupra ei).
   */
  readonly onCursor?: (p: { readonly x: number; readonly y: number } | null) => void;
  /** Scara vederii (px CSS pe mm), la fiecare vedere nouă: zoom, deplasare, potrivire. */
  readonly onScara?: (scara: number) => void;
  /**
   * Fișierele lăsate pe pânză (trase din sistem), cu punctul lăsării în mm ai foii (felia 2.8b). Fără el, pânza nu primește
   * fișiere. `textLasare`: textul arătat cât se trag fișiere deasupra ei.
   */
  readonly onFisiere?: (fisiere: readonly File[], punct: { readonly x: number; readonly y: number } | null) => void;
  readonly textLasare?: string;
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

/** Vederea care așază foaia întreagă în pânză (sau în zona `z` a ei, în pixeli din colțul pânzei), cu o margine. */
export function vedereaPotrivita(
  lat: number, ina: number, foaie: { latime: number; inaltime: number }, z = { x: 0, y: 0, w: lat, h: ina },
): Vedere {
  const margine = 24;
  const scara = Math.min(SCARA_MAXIMA, Math.max(SCARA_MINIMA,
    Math.min((z.w - 2 * margine) / foaie.latime, (z.h - 2 * margine) / foaie.inaltime)));
  return { scara, tx: z.x + (z.w - foaie.latime * scara) / 2, ty: z.y + z.h - (z.h - foaie.inaltime * scara) / 2 };
}

/**
 * Pânza v0: vectorii exacți desenați de worker (`lucrator.ts`), afișați pe o pânză `bitmaprenderer`. Pânza nu știe de
 * document: primește formele gata descrise și trimite înapoi gesturile (clic, mutare), pe care aplicația le rulează
 * prin registrul de acțiuni.
 */
export function Panza({ forme, foaie, selectie, onClic, onMutare, zona, potrivire, cutie, children, onCursor, onScara, onFisiere, textLasare }: Props) {
  const [trage, setTrage] = useState(false);
  const cuFisiere = (e: { readonly dataTransfer: DataTransfer }): boolean => [...e.dataTransfer.types].includes('Files');
  const panzaRef = useRef<HTMLCanvasElement | null>(null);
  const lucratorRef = useRef<Worker | null>(null);
  const cerereRef = useRef(0);
  const [marime, setMarime] = useState({ latime: 0, inaltime: 0, dpr: 1 });
  const [vedere, setVedere] = useState<Vedere | null>(null);
  const [deplasare, setDeplasare] = useState({ dx: 0, dy: 0 });
  const [afisata, setAfisata] = useState(0);
  const [sageti, setSageti] = useState(0);
  const [trimisa, setTrimisa] = useState(0);
  const gest = useRef<{ tip: 'pan' | 'mutare' | 'apasare'; x0: number; y0: number; v0: Vedere } | null>(null);
  const spatiu = useRef(false);
  // Culorile se citesc din CSS la fiecare desen: o temă schimbată (aleasă sau a sistemului) cere un desen nou.
  const [tema, setTema] = useState(0);
  useEffect(() => {
    const m = matchMedia('(prefers-color-scheme: dark)');
    const schimbata = (): void => { setTema((n) => n + 1); };
    const o = new MutationObserver(schimbata);
    o.observe(document.documentElement, { attributeFilter: ['data-tema'] });
    m.addEventListener('change', schimbata);
    return () => { o.disconnect(); m.removeEventListener('change', schimbata); };
  }, []);

  /** Zona liberă, în pixeli din colțul pânzei, dacă e destul de mare. */
  const zonaLibera = (): { x: number; y: number; w: number; h: number } | undefined => {
    const z = zona?.current?.getBoundingClientRect();
    const c = panzaRef.current?.getBoundingClientRect();
    return z && c && z.width > 100 && z.height > 100 ? { x: z.left - c.left, y: z.top - c.top, w: z.width, h: z.height } : undefined;
  };

  // Workerul: unul pe pânză, închis la demontare.
  useEffect(() => {
    const w = new Worker(new URL('./lucrator.ts', import.meta.url), { type: 'module' });
    lucratorRef.current = w;
    w.onmessage = (e: MessageEvent<RaspunsDesen>) => {
      const ctx = panzaRef.current?.getContext('bitmaprenderer');
      if (ctx) ctx.transferFromImageBitmap(e.data.imagine);
      else e.data.imagine.close();
      setAfisata(e.data.cerere);
      setSageti(e.data.sageti);
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
    if (!vedere && marime.latime > 100 && marime.inaltime > 100) setVedere(vedereaPotrivita(marime.latime, marime.inaltime, foaie, zonaLibera()));
  }, [marime, foaie, vedere]);

  // „Arată toată foaia”: aceeași potrivire, la cerere.
  useEffect(() => {
    if (potrivire && marime.latime > 100 && marime.inaltime > 100) setVedere(vedereaPotrivita(marime.latime, marime.inaltime, foaie, zonaLibera()));
  }, [potrivire]);

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
  }, [marime, vedere, foaie, forme, selectie, deplasare, tema]);

  // Scara, spusă afară o dată pe vedere nouă (zoomul din bara de jos).
  useEffect(() => { if (vedere) onScara?.(vedere.scara); }, [vedere]);

  const laDocument = useCallback((ev: { clientX: number; clientY: number }, v: Vedere) => {
    const r = panzaRef.current?.getBoundingClientRect();
    const sx = ev.clientX - (r?.left ?? 0), sy = ev.clientY - (r?.top ?? 0);
    return { x: (sx - v.tx) / v.scara, y: (v.ty - sy) / v.scara, sx, sy };
  }, []);

  useEffect(() => {
    const jos = (e: KeyboardEvent): void => { if (e.code === 'Space') spatiu.current = true; };
    const sus = (e: KeyboardEvent): void => { if (e.code === 'Space') spatiu.current = false; };
    // Fereastra pierde focusul cu Space ținut (alt-tab): keyup ajunge în altă parte, deci Space se uită aici (recenzia A).
    const uita = (): void => { spatiu.current = false; };
    window.addEventListener('keydown', jos);
    window.addEventListener('keyup', sus);
    window.addEventListener('blur', uita);
    document.addEventListener('visibilitychange', uita);
    return () => {
      window.removeEventListener('keydown', jos); window.removeEventListener('keyup', sus);
      window.removeEventListener('blur', uita); document.removeEventListener('visibilitychange', uita);
    };
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
    if (vedere && onCursor) {
      const p = laDocument(e, vedere);
      onCursor({ x: p.x, y: p.y });
    }
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
      data-sageti={sageti}
      data-cerere={trimisa}
      onPointerDown={apasa}
      onPointerMove={misca}
      onPointerUp={elibereaza}
      onPointerCancel={() => { gest.current = null; setDeplasare({ dx: 0, dy: 0 }); }}
      onPointerLeave={() => { onCursor?.(null); }}
      onContextMenu={(e) => { e.preventDefault(); }}
      onDragOver={(e) => {
        if (!onFisiere || !cuFisiere(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        if (!trage) setTrage(true);
      }}
      onDragLeave={() => { setTrage(false); }}
      onDrop={(e) => {
        setTrage(false);
        if (!onFisiere || !cuFisiere(e)) return;
        e.preventDefault();
        const p = vedere ? laDocument(e, vedere) : null;
        onFisiere([...e.dataTransfer.files], p ? { x: p.x, y: p.y } : null);
      }}
    />
    {trage && textLasare && <div className="lasa-aici" data-testid="lasa-aici">{textLasare}</div>}
    {/* Bara selecției: sub cutie dacă încape deasupra barei de jos, altfel deasupra cutiei; ascunsă cât se mută selecția. */}
    {children && cutie && vedere && deplasare.dx === 0 && deplasare.dy === 0 && (() => {
      const sub = vedere.ty - cutie.minY * vedere.scara + 12;
      const top = sub < marime.inaltime - 112 ? sub : vedere.ty - cutie.maxY * vedere.scara - 56;
      const left = vedere.tx + ((cutie.minX + cutie.maxX) / 2) * vedere.scara;
      return (
        <div className="bara-selectie" style={{ left: Math.min(Math.max(left, 96), marime.latime - 96), top: Math.min(Math.max(top, 72), marime.inaltime - 104) }}>
          {children}
        </div>
      );
    })()}
    </div>
  );
}
