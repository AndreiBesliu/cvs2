/**
 * Poza planșei (ADR 0072): ce se vede pe pânză, în pixelii ei, compus local, fără server și fără nicio permisiune: pânza
 * desenată de worker, straturile ei canvas (traseul, vederea 3D), straturile SVG de deasupra (riglele, ghidajele, nodurile,
 * cadrul, previzualizările), cu stilul calculat al fiecărui element copiat în SVG, ca imaginea să arate ca pe ecran, și
 * mânerele transformării (elemente HTML), din fondul, marginea și rotunjirea lor. Barele și panourile (insulele) nu intră.
 */

/** Ce se copiază din stilul calculat al fiecărui element SVG (culorile vin din tokenurile temei, prin CSS). */
const STILURI = [
  'fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-opacity', 'fill-opacity', 'opacity', 'font-size', 'font-family',
  'font-weight', 'text-anchor', 'dominant-baseline', 'visibility', 'display',
] as const;

function imagineSvg(svg: SVGSVGElement, latime: number, inaltime: number): Promise<HTMLImageElement> {
  const copie = svg.cloneNode(true) as SVGSVGElement;
  const din = [svg, ...svg.querySelectorAll('*')];
  const spre = [copie, ...copie.querySelectorAll('*')];
  din.forEach((el, i) => {
    const s = getComputedStyle(el);
    const d = spre[i] as SVGElement | undefined;
    for (const p of STILURI) d?.style.setProperty(p, s.getPropertyValue(p));
  });
  copie.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  copie.setAttribute('width', String(latime));
  copie.setAttribute('height', String(inaltime));
  const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(copie))}`;
  return new Promise((ok, eroare) => {
    const im = new Image();
    im.onload = () => { ok(im); };
    im.onerror = () => { eroare(new Error('un strat al planșei nu s-a putut desena')); };
    im.src = src;
  });
}

/** Poza planșei, PNG, la rezoluția pânzei (pixelii ecranului). Aruncă, cu motiv, dacă pânza nu e pe ecran. */
export async function pozaPlansei(): Promise<Blob> {
  const panza = document.querySelector('canvas[data-testid="panza"]');
  const cutie = panza?.closest('.panza-cutie');
  if (!(panza instanceof HTMLCanvasElement) || !cutie || panza.width === 0) throw new Error('planșa nu e pe ecran');
  const r = panza.getBoundingClientRect();
  const k = panza.width / r.width;
  const c = document.createElement('canvas');
  c.width = panza.width;
  c.height = panza.height;
  const g = c.getContext('2d');
  if (!g) throw new Error('browserul nu desenează în 2D');
  for (const el of cutie.querySelectorAll('canvas, svg')) {
    // Barele (insulele) nu sunt planșa; un SVG din alt SVG vine cu părintele lui.
    if (el.closest('.insula') || el.parentElement?.closest('svg')) continue;
    const q = el.getBoundingClientRect();
    if (q.width < 1 || q.height < 1) continue;
    const x = (q.left - r.left) * k, y = (q.top - r.top) * k, w = q.width * k, h = q.height * k;
    if (el instanceof HTMLCanvasElement) g.drawImage(el, x, y, w, h);
    else if (el instanceof SVGSVGElement) g.drawImage(await imagineSvg(el, q.width, q.height), x, y, w, h);
  }
  for (const el of cutie.querySelectorAll<HTMLElement>('.maner')) {
    const s = getComputedStyle(el);
    const q = el.getBoundingClientRect();
    if (el.closest('.insula') || s.visibility === 'hidden' || q.width < 1) continue;
    const x = (q.left - r.left) * k, y = (q.top - r.top) * k, w = q.width * k, h = q.height * k;
    g.beginPath();
    g.roundRect(x, y, w, h, Math.min(parseFloat(s.borderTopLeftRadius) * k || 0, w / 2));
    g.fillStyle = s.backgroundColor;
    g.fill();
    const m = parseFloat(s.borderTopWidth) * k;
    if (m > 0) {
      g.lineWidth = m;
      g.strokeStyle = s.borderTopColor;
      g.stroke();
    }
  }
  return new Promise((ok, eroare) => {
    c.toBlob((b) => { if (b) ok(b); else eroare(new Error('imaginea n-a ieșit')); }, 'image/png');
  });
}
