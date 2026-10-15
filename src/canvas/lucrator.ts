/**
 * Workerul de desen (T13, ADR 0013): vectorii exacți se desenează pe o pânză SOFTWARE (`willReadFrequently`) și se
 * predau ca ImageBitmap. Pe pânza accelerată, clicul aștepta redesenul (272–312 ms în s6-V); aici se vede în ~24 ms.
 *
 * Desenul e în coordonatele documentului (mm, Y în sus), printr-o singură transformare, iar arcele merg cu `arc()`,
 * exact. Linia are un pixel FIZIC: la 1 px CSS pe DPR 1,5, redesenul costa de 13 ori mai mult (s6-V, C3b).
 */
import type { CerereDesen, RaspunsDesen } from './protocol.ts';

const lucrator = self as unknown as {
  onmessage: ((e: MessageEvent<CerereDesen>) => void) | null;
  postMessage(m: RaspunsDesen, transfer: Transferable[]): void;
};

let ultima: CerereDesen | null = null;
let programat = false;
let panza: OffscreenCanvas | null = null;
let g: OffscreenCanvasRenderingContext2D | null = null;

function deseneaza(): void {
  programat = false;
  const c = ultima;
  ultima = null;
  if (!c) return;
  const w = Math.max(1, Math.round(c.latime * c.dpr));
  const h = Math.max(1, Math.round(c.inaltime * c.dpr));
  if (!panza || !g) {
    panza = new OffscreenCanvas(w, h);
    g = panza.getContext('2d', { willReadFrequently: true });
    if (!g) throw new Error('pânza software nu are context 2d');
  }
  if (panza.width !== w || panza.height !== h) {
    panza.width = w;
    panza.height = h;
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = c.culori.fundal;
  g.fillRect(0, 0, w, h);

  const s = c.vedere.scara * c.dpr;
  // mm → pixeli fizici: x′ = (x·scara + tx)·dpr, y′ = (−y·scara + ty)·dpr.
  g.setTransform(s, 0, 0, -s, c.vedere.tx * c.dpr, c.vedere.ty * c.dpr);
  g.fillStyle = c.culori.foaie;
  g.fillRect(0, 0, c.foaie.latime, c.foaie.inaltime);
  g.lineWidth = 1 / s;
  g.lineJoin = 'round';

  /** Lungimea săgeții de sens: ~8 px CSS la orice zoom (ADR 0037 §12), în mm. */
  const sageata = 8 / c.vedere.scara;
  let sageti = 0;
  for (const f of c.forme) {
    const selectat = c.selectie.includes(f.id);
    const cale = new Path2D();
    for (const k of f.cale) {
      if (k.t === 'M') cale.moveTo(k.x, k.y);
      else if (k.t === 'L') cale.lineTo(k.x, k.y);
      else if (k.t === 'A') cale.arc(k.cx, k.cy, k.r, k.a0, k.a1, !k.trigonometric);
      else if (k.t === 'C') cale.bezierCurveTo(k.x1, k.y1, k.x2, k.y2, k.x, k.y);
      else cale.closePath();
    }
    g.save();
    if (selectat) g.translate(c.deplasare.dx, c.deplasare.dy);
    g.strokeStyle = selectat ? c.culori.selectie : c.culori.linie;
    g.stroke(cale);
    // Săgeata de sens pe o cale deschisă din selecție: un triunghi plin cu baza în vârful 0, cu vârful spre mers.
    const s0 = f.sageata;
    if (selectat && s0) {
      const l = sageata, b = sageata * 0.4;
      g.beginPath();
      g.moveTo(s0.x + s0.ux * l, s0.y + s0.uy * l);
      g.lineTo(s0.x - s0.uy * b, s0.y + s0.ux * b);
      g.lineTo(s0.x + s0.uy * b, s0.y - s0.ux * b);
      g.closePath();
      g.fillStyle = c.culori.selectie;
      g.fill();
      // Liniuța pe partea frezei (ADR 0037 §12): perpendiculară pe mers, de la baza săgeții, cât săgeata.
      if (s0.parte) {
        const nx = -s0.uy * s0.parte, ny = s0.ux * s0.parte;
        g.beginPath();
        g.moveTo(s0.x + nx * b * 1.5, s0.y + ny * b * 1.5);
        g.lineTo(s0.x + nx * (b * 1.5 + l), s0.y + ny * (b * 1.5 + l));
        g.lineWidth = 2 / s;
        g.strokeStyle = c.culori.selectie;
        g.stroke();
      }
      sageti++;
    }
    g.restore();
  }
  const imagine = panza.transferToImageBitmap();
  lucrator.postMessage({ tip: 'imagine', cerere: c.cerere, imagine, sageti }, [imagine]);
}

lucrator.onmessage = (e) => {
  // Doar ultima cerere contează: dacă vin mai multe cât se desenează, cele intermediare se sar.
  ultima = e.data;
  if (!programat) {
    programat = true;
    setTimeout(deseneaza, 0);
  }
};
