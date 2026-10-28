import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import type { Vedere } from './protocol.ts';
import { animatie, parcursIntre, type Cronologie, type LinieParcursa } from '../ui/actiuniAnimatie.ts';

type Marime = { readonly latime: number; readonly inaltime: number; readonly dpr: number };

/** Raza minimă a cercului frezei pe ecran (px), ca o freză mică să se vadă și de departe. */
const RAZA_MINIMA = 4;
/** Săgeata arcelor drumului parcurs, în pixeli de ecran. */
const TOLERANTA_PX = 0.5;

/** Drumul deja desenat: pe ce cronologie, în ce vedere și până la ce moment. */
type Tampon = { readonly canvas: HTMLCanvasElement; cronologie: Cronologie | null; cheie: string; pana: number };

/** Liniile drumului parcurs, în mm, pe un context deja pus în coordonatele foii. */
function traseaza(g: CanvasRenderingContext2D, linii: readonly LinieParcursa[], scara: number, culoare: string): void {
  for (const l of linii) {
    const p = l.puncte;
    if (p.length < 4) continue;
    g.beginPath();
    g.moveTo(p[0] as number, p[1] as number);
    for (let i = 2; i + 1 < p.length; i += 2) g.lineTo(p[i] as number, p[i + 1] as number);
    g.strokeStyle = culoare;
    g.globalAlpha = l.rapid ? 0.6 : 1;
    g.lineWidth = (l.rapid ? 1 : 2) / scara;
    g.setLineDash(l.rapid ? [4 / scara, 4 / scara] : []);
    g.stroke();
  }
  g.globalAlpha = 1;
  g.setLineDash([]);
}

/**
 * Stratul animației traseului (ADR 0099), deasupra traseului: drumul parcurs până acum (tăierile pline, deplasările rapide
 * punctate) și freza, un cerc cât diametrul ei, plin cât e în material (Z sub fața de sus). Desenează doar cât playerul e
 * activ. Drumul se ține într-un tampon: fiecare cadru adaugă doar bucata nouă, iar o vedere schimbată sau un salt înapoi îl
 * redesenează de la început.
 */
export function StratAnimatie({ vedere, marime }: { readonly vedere: Vedere; readonly marime: Marime }): ReactNode {
  const s = useSyncExternalStore(animatie.asculta, animatie.citeste);
  const ref = useRef<HTMLCanvasElement>(null);
  const tampon = useRef<Tampon | null>(null);

  useEffect(() => {
    const c = ref.current;
    const a = s.acum;
    if (!c || !a || !s.cronologie) return;
    const w = Math.max(1, Math.round(marime.latime * marime.dpr)), h = Math.max(1, Math.round(marime.inaltime * marime.dpr));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const culoare = getComputedStyle(document.documentElement).getPropertyValue('--animatie').trim() || '#c2410c';
    // Coordonatele foii (mm, Y în sus) pe pixelii fizici ai canvasului.
    const f = marime.dpr;
    const foaie = [f * vedere.scara, 0, 0, -f * vedere.scara, f * vedere.tx, f * vedere.ty] as const;
    tampon.current ??= { canvas: document.createElement('canvas'), cronologie: null, cheie: '', pana: 0 };
    const tp = tampon.current;
    const cheie = `${vedere.scara} ${vedere.tx} ${vedere.ty} ${w} ${h}`;
    const gt = tp.canvas.getContext('2d');
    if (!gt) return;
    if (tp.cronologie !== s.cronologie || tp.cheie !== cheie || s.t < tp.pana) {
      tp.canvas.width = w;
      tp.canvas.height = h;
      tp.cronologie = s.cronologie;
      tp.cheie = cheie;
      tp.pana = 0;
    }
    if (s.t > tp.pana) {
      gt.setTransform(...foaie);
      traseaza(gt, parcursIntre(s.cronologie, tp.pana, s.t, TOLERANTA_PX / vedere.scara), vedere.scara, culoare);
      tp.pana = s.t;
    }
    const g = c.getContext('2d');
    if (!g) return;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, w, h);
    g.drawImage(tp.canvas, 0, 0);
    // Freza, în pixeli fizici.
    const x = f * (a.x * vedere.scara + vedere.tx), y = f * (vedere.ty - a.y * vedere.scara);
    const r = Math.max(RAZA_MINIMA * f, (a.scula.diametru / 2) * vedere.scara * f);
    g.beginPath();
    g.arc(x, y, r, 0, 2 * Math.PI);
    if (a.z < 0) {
      g.globalAlpha = 0.3;
      g.fillStyle = culoare;
      g.fill();
      g.globalAlpha = 1;
    }
    g.lineWidth = 2 * f;
    g.strokeStyle = culoare;
    g.stroke();
    g.beginPath();
    g.moveTo(x - r * 0.5, y);
    g.lineTo(x + r * 0.5, y);
    g.moveTo(x, y - r * 0.5);
    g.lineTo(x, y + r * 0.5);
    g.lineWidth = f;
    g.stroke();
  }, [s, vedere, marime]);

  if (!s.activa || !s.acum) return null;
  return (
    <canvas ref={ref} className="strat-animatie" data-testid="strat-animatie" aria-hidden="true"
      data-x={s.acum.x.toFixed(3)} data-y={s.acum.y.toFixed(3)} data-z={s.acum.z.toFixed(3)} data-pana={s.t.toFixed(3)} />
  );
}
