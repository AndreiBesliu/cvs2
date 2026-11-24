/**
 * Workerul de desen (T13, ADR 0013): vectorii exacți se desenează pe o pânză SOFTWARE (`willReadFrequently`) și se
 * predau ca ImageBitmap. Pe pânza accelerată, clicul aștepta redesenul (272–312 ms în s6-V); aici se vede în ~24 ms.
 *
 * Desenul e în coordonatele documentului (mm, Y în sus), printr-o singură transformare, iar arcele merg cu `arc()`,
 * exact. Linia are un pixel FIZIC: la 1 px CSS pe DPR 1,5, redesenul costa de 13 ori mai mult (s6-V, C3b).
 *
 * Foile vecine (ADR 0210 §1, felia 11.1↑b) vin într-un mesaj al lor, doar când se schimbă: se desenează estompate, sub
 * foaia activă, la locul lor din rând, fiecare cu numele deasupra; cele din afara pânzei se sar. Foaia activă n-are nume
 * pe pânză: acolo stă rigla ei.
 *
 * Imaginile foii active (ADR 0272) vin tot într-un mesaj al lor, cu octeții: se decodează aici, o dată pe amprentă, și se
 * desenează sub vectori, peste foaie, estompate, pe un strat al lor (§8). Stratul se redesenează doar când se schimbă vederea,
 * mărimea, imaginile sau o decodare; altfel se copiază. Fiecare imagine se desenează din treapta ei redusă cea mai potrivită
 * (jumătăți, făcute la cerere): o imagine de 16 Mpx nu se scalează întreagă la fiecare cadru.
 */
import type { CerereDesen, CerereFoi, CerereImagini, FoaieVecina, FormaDesen, ImaginePeFoaie, RaspunsDesen } from './protocol.ts';

const lucrator = self as unknown as {
  onmessage: ((e: MessageEvent<CerereDesen | CerereFoi | CerereImagini>) => void) | null;
  postMessage(m: RaspunsDesen, transfer: Transferable[]): void;
};

/** Pânzele software (`willReadFrequently`): un strat accelerat copiat pe pânza software ar cere o citire înapoi la fiecare cadru. */
const software = { willReadFrequently: true } as const;

let imagini: readonly ImaginePeFoaie[] = [];
/** Imaginile decodate, după amprentă: treptele lor (întreaga, apoi jumătăți), ori starea decodării. */
type Trepte = { readonly trepte: Array<ImageBitmap | OffscreenCanvas> };
const decodate = new Map<string, Trepte | 'decodare' | 'eroare'>();
/** Crește la fiecare listă nouă de imagini și la fiecare decodare terminată: stratul se redesenează. */
let versiune = 0;
let strat: { readonly panza: OffscreenCanvas; readonly g: OffscreenCanvasRenderingContext2D; cheie: string } | null = null;
/** Ultima cerere desenată: o decodare terminată o desenează din nou, cu imaginea. */
let desenata: CerereDesen | null = null;

function decodeaza(sursa: string, octeti: Blob | NonNullable<ImaginePeFoaie['pixeli']>): void {
  decodate.set(sursa, 'decodare');
  // Un relief (ADR 0310 §7) vine cu pixelii umbriți, nu cu un fișier.
  const bitmap = octeti instanceof Blob ? createImageBitmap(octeti) : createImageBitmap(new ImageData(octeti.rgba, octeti.latime, octeti.inaltime));
  bitmap.then((bmp) => {
    if (decodate.get(sursa) !== 'decodare') {
      bmp.close();
      return;
    }
    decodate.set(sursa, { trepte: [bmp] });
    versiune++;
    redeseneaza();
  }, () => {
    if (decodate.get(sursa) === 'decodare') decodate.set(sursa, 'eroare');
    versiune++;
    redeseneaza();
  });
}

/** Imaginile noi: cele care nu mai sunt pe foaie se uită (cu treptele lor), cele noi se decodează. */
function primesteImagini(lista: readonly ImaginePeFoaie[]): void {
  imagini = lista;
  versiune++;
  const folosite = new Set(lista.map((i) => i.sursa));
  for (const [s, d] of decodate) {
    if (folosite.has(s)) continue;
    if (typeof d === 'object') for (const t of d.trepte) if (t instanceof ImageBitmap) t.close();
    decodate.delete(s);
  }
  for (const im of lista) {
    const date = im.octeti ?? im.pixeli;
    if (date && !decodate.has(im.sursa)) decodeaza(im.sursa, date);
  }
}

/**
 * Treapta din care se desenează o imagine care acoperă `latimeEcran` pixeli fizici: cea mai mică încă cel puțin atât de lată
 * (sub 64 px nu se mai reduce). Jumătățile se fac la cerere și se țin.
 */
function treapta(t: Trepte, latimeEcran: number): ImageBitmap | OffscreenCanvas {
  for (let k = 0; ; k++) {
    const cur = t.trepte[k];
    if (!cur) throw new Error('treaptă lipsă');
    if (cur.width / 2 < latimeEcran || cur.width < 128 || cur.height < 128) return cur;
    if (!t.trepte[k + 1]) {
      const w = Math.floor(cur.width / 2), h = Math.floor(cur.height / 2);
      const jum = new OffscreenCanvas(w, h);
      const j = jum.getContext('2d', software);
      if (!j) return cur;
      j.imageSmoothingQuality = 'high';
      j.drawImage(cur, 0, 0, w, h);
      t.trepte.push(jum);
    }
  }
}

/** Stratul imaginilor pentru cererea `c`, pe pânza de `w` × `h` pixeli fizici, cu `s` pixeli fizici pe mm. */
function stratImagini(c: CerereDesen, w: number, h: number, s: number): OffscreenCanvas | null {
  // Un relief ales se mută cu selecția cât e trasă (ADR 0310 §7): atunci deplasarea intră în cheie.
  const trase = imagini.some((im) => im.cuSelectia === true && c.selectie.includes(im.id));
  const cheie = `${w}x${h}|${c.vedere.scara}|${c.vedere.tx}|${c.vedere.ty}|${c.dpr}|${c.culori.linie}|${versiune}${trase ? `|${c.deplasare.dx},${c.deplasare.dy}|${c.selectie.join(',')}` : ''}`;
  if (strat?.cheie === cheie) return strat.panza;
  if (!strat) {
    const panza = new OffscreenCanvas(w, h);
    const sg = panza.getContext('2d', software);
    if (!sg) return null;
    strat = { panza, g: sg, cheie: '' };
  }
  const { panza, g: x } = strat;
  if (panza.width !== w || panza.height !== h) {
    panza.width = w;
    panza.height = h;
  }
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.clearRect(0, 0, w, h);
  for (const im of imagini) {
    // Cele din afara pânzei se sar (cercul care le cuprinde, rotite oricum).
    const cx = (im.x * c.vedere.scara + c.vedere.tx) * c.dpr, cy = (c.vedere.ty - im.y * c.vedere.scara) * c.dpr;
    const r = (Math.hypot(im.latime, im.inaltime) / 2) * s;
    if (cx + r < 0 || cx - r > w || cy + r < 0 || cy - r > h) continue;
    x.setTransform(s, 0, 0, -s, c.vedere.tx * c.dpr, c.vedere.ty * c.dpr);
    if (im.cuSelectia === true && c.selectie.includes(im.id)) x.translate(c.deplasare.dx, c.deplasare.dy);
    x.translate(im.x, im.y);
    x.rotate((im.rotire * Math.PI) / 180);
    if (im.oglindita === true) x.scale(-1, 1);
    const d = decodate.get(im.sursa);
    if (typeof d === 'object') {
      // Rândul de sus al imaginii, sus pe foaie: în sistemul foii (Y în sus), imaginea se întoarce.
      x.scale(1, -1);
      x.globalAlpha = im.opacitate;
      x.imageSmoothingEnabled = true;
      x.imageSmoothingQuality = 'medium';
      x.drawImage(treapta(d, im.latime * s), -im.latime / 2, -im.inaltime / 2, im.latime, im.inaltime);
      x.globalAlpha = 1;
    } else {
      // Fără octeți (lipsă, ori încă se citesc): doar locul ei, punctat.
      x.lineWidth = 1 / s;
      x.setLineDash([4 / s, 4 / s]);
      x.strokeStyle = c.culori.linie;
      x.globalAlpha = 0.6;
      x.strokeRect(-im.latime / 2, -im.inaltime / 2, im.latime, im.inaltime);
      x.globalAlpha = 1;
      x.setLineDash([]);
    }
  }
  strat.cheie = cheie;
  return panza;
}

/** O decodare terminată: ultima cerere se desenează din nou (dacă nu așteaptă deja alta). */
function redeseneaza(): void {
  if (!ultima) ultima = desenata;
  if (ultima && !programat) {
    programat = true;
    setTimeout(deseneaza, 0);
  }
}

let ultima: CerereDesen | null = null;
let programat = false;
let panza: OffscreenCanvas | null = null;
let g: OffscreenCanvasRenderingContext2D | null = null;
let vecine: readonly FoaieVecina[] = [];

/** Calea unei forme, în coordonatele ei (mm). */
function caleDin(f: FormaDesen): Path2D {
  const cale = new Path2D();
  for (const k of f.cale) {
    if (k.t === 'M') cale.moveTo(k.x, k.y);
    else if (k.t === 'L') cale.lineTo(k.x, k.y);
    else if (k.t === 'A') cale.arc(k.cx, k.cy, k.r, k.a0, k.a1, !k.trigonometric);
    else if (k.t === 'C') cale.bezierCurveTo(k.x1, k.y1, k.x2, k.y2, k.x, k.y);
    else cale.closePath();
  }
  return cale;
}

function deseneaza(): void {
  programat = false;
  const c = ultima;
  ultima = null;
  if (!c) return;
  desenata = c;
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
  g.lineWidth = 1 / s;
  g.lineJoin = 'round';
  // Foile vecine, estompate, la locul lor; cele care nu ating pânza se sar (cu sute de foi, deplasarea rămâne ușoară).
  const peEcran = (v: { readonly x: number; readonly y: number; readonly latime: number; readonly inaltime: number }): boolean => {
    const x0 = v.x * c.vedere.scara + c.vedere.tx, y1 = c.vedere.ty - v.y * c.vedere.scara;
    return x0 < c.latime && x0 + v.latime * c.vedere.scara > 0 && y1 > 0 && y1 - v.inaltime * c.vedere.scara < c.inaltime;
  };
  for (const v of vecine) {
    if (!peEcran(v)) continue;
    g.save();
    g.translate(v.x, v.y);
    g.globalAlpha = 0.5;
    g.fillStyle = c.culori.foaie;
    g.fillRect(0, 0, v.latime, v.inaltime);
    g.globalAlpha = 0.35;
    g.strokeStyle = c.culori.linie;
    for (const f of v.forme) g.stroke(caleDin(f));
    g.restore();
  }
  g.fillStyle = c.culori.foaie;
  g.fillRect(0, 0, c.foaie.latime, c.foaie.inaltime);
  // Imaginile foii (ADR 0272): peste foaie, sub vectori, din stratul lor.
  const si = imagini.length > 0 ? stratImagini(c, w, h, s) : null;
  if (si) {
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(si, 0, 0);
    g.restore();
  }

  /** Lungimea săgeții de sens: ~8 px CSS la orice zoom (ADR 0037 §12), în mm. */
  const sageata = 8 / c.vedere.scara;
  let sageti = 0;
  for (const f of c.forme) {
    const selectat = c.selectie.includes(f.id);
    const cale = caleDin(f);
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
  // Numele foilor vecine, deasupra colțului stânga-sus al fiecăreia, în pixeli, estompat.
  if (vecine.length > 0) {
    g.setTransform(c.dpr, 0, 0, c.dpr, 0, 0);
    g.textBaseline = 'bottom';
    g.fillStyle = c.culori.linie;
    g.globalAlpha = 0.6;
    g.font = '12px system-ui, sans-serif';
    for (const v of vecine) if (peEcran(v)) g.fillText(v.nume, v.x * c.vedere.scara + c.vedere.tx, c.vedere.ty - (v.y + v.inaltime) * c.vedere.scara - 4);
    g.globalAlpha = 1;
  }
  const imagine = panza.transferToImageBitmap();
  lucrator.postMessage({ tip: 'imagine', cerere: c.cerere, imagine, sageti }, [imagine]);
}

lucrator.onmessage = (e) => {
  // Foile vecine se țin până la mesajul următor; desenul pornește cu cererea care vine după ele.
  if (e.data.tip === 'foi') {
    vecine = e.data.foi;
    return;
  }
  if (e.data.tip === 'imagini') {
    primesteImagini(e.data.imagini);
    return;
  }
  // Doar ultima cerere contează: dacă vin mai multe cât se desenează, cele intermediare se sar.
  ultima = e.data;
  if (!programat) {
    programat = true;
    setTimeout(deseneaza, 0);
  }
};
