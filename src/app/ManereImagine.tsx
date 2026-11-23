import { useEffect, useRef, useState, type ReactElement } from 'react';
import type { Vedere } from '../canvas/protocol.ts';
import { t } from '../i18n/t.ts';
import type { ImagineFoaie } from '../model/document.ts';
import type { RezultatActiune } from '../ui/actiuni.ts';
import { textNumar } from '../ui/numar.ts';
import {
  asezareDupaGest, coltImagine, COLTURI_IMAGINE, manerImagineLovit, peFoaie, punctRotireImagine, type Asezare, type ManerImagine, type Punct,
} from './manereImagine.ts';

/** Cursorul deasupra fiecărui mâner al unei imagini (pânza îl primește cât mausul stă pe el). */
const CURSOR: Readonly<Record<ManerImagine, string>> = {
  mutare: 'move', rotire: 'grab', sv: 'nesw-resize', ne: 'nesw-resize', se: 'nwse-resize', nv: 'nwse-resize',
};
/** O tragere mai scurtă de atât (pe ecran) nu schimbă imaginea. */
const MINIM_PX = 3;

/**
 * Mânerele imaginilor desfăcute ale foii (ADR 0272 §4): conturul punctat, cele patru colțuri (scalarea proporțională, cu
 * colțul opus pe loc) și rotirea deasupra (Shift: la 15°); interiorul se mută, în afara liniilor desenului (imaginea stă sub
 * desen: pe o linie, apăsarea e a formei). Sunt doar desen (`pointer-events: none`): lovitura o decide `manerImagineLovit`, într-un ascultător pus înaintea
 * pânzei, pentru butonul stâng fără Space, după mânerele formelor (`manerForma`). Cât se trage, conturul nou și mărimea (ori
 * unghiul); la eliberare, așezarea nouă, într-un pas de anulare; Escape renunță. Imaginea de deasupra (ultima) prinde întâi.
 */
export function ManereImagine({ imagini, vedere: v, manerForma, formaLa, onAplica }: {
  readonly imagini: readonly ImagineFoaie[];
  readonly vedere: Vedere;
  /** În punctul (px ai pânzei) e un mâner al formelor alese ori ținta ancorei: apăsarea e a lor. */
  readonly manerForma: (px: number, py: number) => boolean;
  /** În punctul (px ai pânzei) trece linia unei forme: interiorul imaginii nu ia apăsarea (alegerea formei). */
  readonly formaLa: (px: number, py: number) => boolean;
  /** Așezarea nouă a unei imagini, într-un pas de anulare (`foaie.imagini`), cu rezultatul. */
  readonly onAplica: (id: string, a: Asezare) => RezultatActiune;
}): ReactElement {
  const [gest, setGest] = useState<{ readonly id: string; readonly m: ManerImagine; readonly a: Asezare } | null>(null);
  const [motiv, setMotiv] = useState<{ readonly id: string; readonly text: string } | null>(null);
  const radacina = useRef<HTMLDivElement | null>(null);
  const acum = useRef({ imagini, v, manerForma, formaLa, onAplica });
  acum.current = { imagini, v, manerForma, formaLa, onAplica };
  useEffect(() => {
    const el = radacina.current;
    const panza = el?.closest('.panza-cutie')?.querySelector<HTMLCanvasElement>('canvas.panza');
    if (!el || !panza) return undefined;
    let spatiu = false;
    let g: { readonly id: string; readonly m: ManerImagine; readonly a0: Asezare; readonly start: Punct; readonly ecran: Punct; readonly pointer: number } | null = null;
    const local = (e: { clientX: number; clientY: number }): Punct => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const laFoaie = (e: { clientX: number; clientY: number }): Punct => {
      const { v: w } = acum.current;
      const p = local(e);
      return { x: (p.x - w.tx) / w.scara, y: (w.ty - p.y) / w.scara };
    };
    /** Imaginea și mânerul de sub cursor (întâi cea de deasupra), dacă apăsarea e a lor. */
    const lovit = (p: Punct): { readonly im: ImagineFoaie; readonly m: ManerImagine } | null => {
      const { imagini: l, v: w, manerForma: mf, formaLa: fl } = acum.current;
      if (mf(p.x, p.y)) return null;
      for (let k = l.length - 1; k >= 0; k--) {
        const im = l[k];
        const m = im ? manerImagineLovit(im, w, p.x, p.y) : null;
        if (im && m) return m === 'mutare' && fl(p.x, p.y) ? null : { im, m };
      }
      return null;
    };
    const apasa = (e: PointerEvent): void => {
      if (e.target !== panza || e.button !== 0 || spatiu || e.defaultPrevented) return;
      const h = lovit(local(e));
      if (!h) return;
      // Apăsarea e a imaginii: pânza n-o mai primește (nici alegerea, nici cadrul, nici mutarea formelor).
      e.preventDefault();
      e.stopImmediatePropagation();
      panza.setPointerCapture(e.pointerId);
      const a0: Asezare = { x: h.im.x, y: h.im.y, latime: h.im.latime, inaltime: h.im.inaltime, rotire: h.im.rotire };
      g = { id: h.im.id, m: h.m, a0, start: laFoaie(e), ecran: { x: e.clientX, y: e.clientY }, pointer: e.pointerId };
      setMotiv(null);
      setGest({ id: h.im.id, m: h.m, a: a0 });
    };
    const misca = (e: PointerEvent): void => {
      if (g) {
        if (e.pointerId !== g.pointer) return;
        setGest({ id: g.id, m: g.m, a: asezareDupaGest(g.a0, g.m, g.start, laFoaie(e), e.shiftKey) });
        return;
      }
      if (e.target !== panza || spatiu || e.buttons !== 0) return;
      const h = lovit(local(e));
      // Cursorul: doar peste o imagine desfăcută; în rest rămâne al pânzei (ori al mânerelor formelor).
      if (h) panza.style.cursor = CURSOR[h.m];
      else if (Object.values(CURSOR).includes(panza.style.cursor)) panza.style.cursor = '';
    };
    const elibereaza = (e: PointerEvent): void => {
      if (!g || e.pointerId !== g.pointer) return;
      const s = g;
      g = null;
      setGest(null);
      // Un clic (sub 3 px de tragere) nu mută imaginea.
      if (Math.hypot(e.clientX - s.ecran.x, e.clientY - s.ecran.y) < MINIM_PX) return;
      const r = acum.current.onAplica(s.id, asezareDupaGest(s.a0, s.m, s.start, laFoaie(e), e.shiftKey));
      if (!r.ok) setMotiv({ id: s.id, text: t(r.motiv) });
    };
    const anuleaza = (): void => {
      g = null;
      setGest(null);
    };
    const tasta = (e: KeyboardEvent): void => {
      if (e.code === 'Space') spatiu = e.type === 'keydown';
      if (e.type === 'keydown' && e.key === 'Escape' && g) {
        e.preventDefault();
        e.stopImmediatePropagation();
        anuleaza();
      }
    };
    const uita = (): void => { spatiu = false; };
    window.addEventListener('pointerdown', apasa, true);
    window.addEventListener('pointermove', misca, true);
    window.addEventListener('pointerup', elibereaza, true);
    window.addEventListener('pointercancel', anuleaza, true);
    window.addEventListener('keydown', tasta, true);
    window.addEventListener('keyup', tasta, true);
    window.addEventListener('blur', uita);
    return () => {
      window.removeEventListener('pointerdown', apasa, true);
      window.removeEventListener('pointermove', misca, true);
      window.removeEventListener('pointerup', elibereaza, true);
      window.removeEventListener('pointercancel', anuleaza, true);
      window.removeEventListener('keydown', tasta, true);
      window.removeEventListener('keyup', tasta, true);
      window.removeEventListener('blur', uita);
      if (Object.values(CURSOR).includes(panza.style.cursor)) panza.style.cursor = '';
    };
  }, []);
  const ex = (x: number): number => v.tx + x * v.scara;
  const ey = (y: number): number => v.ty - y * v.scara;
  const asezare = (im: ImagineFoaie): Asezare => (gest?.id === im.id ? gest.a : im);
  const mm = (x: number): string => textNumar(Math.round(x * 100) / 100, true);
  // Eticheta gestului (ori motivul unui refuz), deasupra imaginii: mărimea ori unghiul.
  const deasupra = (id: string): { left: number; top: number } | null => {
    const im = imagini.find((i) => i.id === id);
    if (!im) return null;
    const a = asezare(im);
    const ys = [...COLTURI_IMAGINE.map((k) => coltImagine(a, k)), punctRotireImagine(a, v.scara)].map((q) => ey(q.y));
    return { left: ex(a.x), top: Math.max(4, Math.min(...ys) - 30) };
  };
  const locGest = gest ? deasupra(gest.id) : null;
  const locMotiv = motiv && !gest ? deasupra(motiv.id) : null;
  return (
    <div className="manere" ref={radacina} data-testid="manere-imagini">
      <svg className="rigle-desen" width="100%" height="100%" aria-hidden="true">
        {imagini.map((im) => {
          const a = asezare(im);
          const sus = peFoaie(a, 0, a.inaltime / 2), r = punctRotireImagine(a, v.scara);
          return (
            <g key={im.id} data-imagine={im.id}>
              <polygon className={gest?.id === im.id ? 'desen-previzualizare' : 'imagine-contur'}
                points={COLTURI_IMAGINE.map((k) => coltImagine(a, k)).map((q) => `${ex(q.x)},${ey(q.y)}`).join(' ')} />
              <line className="manere-tija" x1={ex(sus.x)} y1={ey(sus.y)} x2={ex(r.x)} y2={ey(r.y)} />
            </g>
          );
        })}
      </svg>
      {imagini.flatMap((im) => {
        const a = asezare(im);
        const r = punctRotireImagine(a, v.scara);
        return [
          ...COLTURI_IMAGINE.map((k) => {
            const q = coltImagine(a, k);
            return <div key={`${im.id}/${k}`} className="maner" style={{ left: ex(q.x) - 5, top: ey(q.y) - 5 }} data-maner-imagine={k} data-imagine={im.id} />;
          }),
          <div key={`${im.id}/rotire`} className="maner maner-rotire" style={{ left: ex(r.x) - 6, top: ey(r.y) - 6 }} data-maner-imagine="rotire" data-imagine={im.id} />,
        ];
      })}
      {gest && locGest ? (
        <span className="manere-eticheta" style={locGest} data-testid="manere-imagine-eticheta">
          {gest.m === 'rotire' ? `${textNumar(Math.round(gest.a.rotire * 10) / 10, true)}°` : `${mm(gest.a.latime)} × ${mm(gest.a.inaltime)} mm`}
        </span>
      ) : null}
      {motiv && locMotiv ? (
        <span className="manere-eticheta manere-motiv" role="status" style={locMotiv} data-testid="manere-imagine-motiv">{motiv.text}</span>
      ) : null}
    </div>
  );
}
