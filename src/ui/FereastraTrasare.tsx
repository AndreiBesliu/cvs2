import { useEffect, useMemo, useRef, useState } from 'react';
import '../i18n/import.ts';
import { t } from '../i18n/t.ts';
import type { Posterizare } from '../jobs/calculTrasare.ts';
import type { CuloarePaleta } from '../trasare/culori.ts';
import type { CaiTrasate, ImagineRGBA } from '../trasare/trasare.ts';
import { colturiBune, type Colturi } from '../trasare/colturi.ts';
import { primele } from '../trasare/legaturi.ts';
import { formatDupaMarime, SUGESTIE_INEGALA } from '../io/imagine.ts';
import type { AlegeriTrasare, PrevizualizareImport, RaportImagine } from './actiuniImport.ts';
import { useLimba } from './useLimba.ts';

type Vedere = 'imagine' | 'vectori' | 'ambele';

/** O zonă (ADR 0224), în pixelii imaginii întregi, y în jos. */
type Zona = NonNullable<AlegeriTrasare['zona']>;
/** Ce apucă o tragere pe zonă: o latură sau un colț (după punctele cardinale), interiorul, sau nimic (o zonă nouă). */
type Apucare = 'noua' | 'muta' | 'n' | 's' | 'e' | 'v' | 'ne' | 'nv' | 'se' | 'sv';
type Tragere =
  | { readonly fel: 'vedere'; readonly x: number; readonly y: number; readonly cx: number; readonly cy: number }
  | { readonly fel: 'zona'; readonly ix: number; readonly iy: number; readonly z0: Zona | null; readonly mod: Apucare }
  | { readonly fel: 'colt'; readonly i: number; readonly c0: Colturi };

/** Ce apucă punctul (x, y) dintr-o zonă: o latură sau un colț la cel mult `tol` px de ele, interiorul, altfel nimic. */
function apuca(z: Zona, x: number, y: number, tol: number): Apucare {
  if (x < z.x - tol || x > z.x + z.w + tol || y < z.y - tol || y > z.y + z.h + tol) return 'noua';
  const n = Math.abs(y - z.y) <= tol, s = Math.abs(y - z.y - z.h) <= tol, v = Math.abs(x - z.x) <= tol, e = Math.abs(x - z.x - z.w) <= tol;
  const d = `${n ? 'n' : s ? 's' : ''}${e ? 'e' : v ? 'v' : ''}`;
  return d === 'n' || d === 's' || d === 'e' || d === 'v' || d === 'ne' || d === 'nv' || d === 'se' || d === 'sv' ? d : 'muta';
}

/** Zona după o tragere până în (x, y): nouă (din punctul apucat), mutată sau întinsă de o latură sau un colț; în imagine. */
function zonaTrasa(d: Extract<Tragere, { fel: 'zona' }>, x0: number, y0: number, W: number, H: number): Zona {
  const tai = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
  const x = tai(x0, 0, W), y = tai(y0, 0, H), z = d.z0;
  if (d.mod === 'noua' || !z) {
    const ax = tai(d.ix, 0, W), ay = tai(d.iy, 0, H);
    return { x: Math.min(ax, x), y: Math.min(ay, y), w: Math.abs(x - ax), h: Math.abs(y - ay) };
  }
  if (d.mod === 'muta') return { x: tai(z.x + x0 - d.ix, 0, W - z.w), y: tai(z.y + y0 - d.iy, 0, H - z.h), w: z.w, h: z.h };
  const xa = d.mod.endsWith('v') ? x : z.x, xb = d.mod.endsWith('e') ? x : z.x + z.w;
  const ya = d.mod.startsWith('n') ? y : z.y, yb = d.mod.startsWith('s') ? y : z.y + z.h;
  return { x: Math.min(xa, xb), y: Math.min(ya, yb), w: Math.abs(xb - xa), h: Math.abs(yb - ya) };
}

/** Zona în pixeli întregi (marginile ei rotunjite). */
const rotunjita = (z: Zona): Zona => {
  const x = Math.round(z.x), y = Math.round(z.y);
  return { x, y, w: Math.round(z.x + z.w) - x, h: Math.round(z.y + z.h) - y };
};

type Props = {
  readonly alegeri: AlegeriTrasare;
  /** O alegere schimbată: fereastra retrasează (după o pauză de 250 ms la câmpurile cu valori). */
  readonly onSchimba: (s: Partial<AlegeriTrasare>) => void;
  /** Octeții imaginii, pentru previzualizare (browserul o decodează și aici, doar ca s-o arate). */
  readonly octeti: Uint8Array | null;
  readonly stare: PrevizualizareImport | 'citire';
  readonly seRecitesc: boolean;
  /** Diametrul frezei foii, în mm, dacă foaia are una singură (ADR 0222 §5: raportul o compară cu grosimea trăsăturilor). */
  readonly freza?: number;
};

/** Raportul trasării din previzualizare (și dintr-un refuz după trasare, ca „prea multe contururi”), sau null. */
function raportDin(stare: PrevizualizareImport | 'citire'): RaportImagine | null {
  if (stare === 'citire') return null;
  if (stare.ok) return stare.format === 'imagine' ? stare.trasare : null;
  return stare.trasare ?? null;
}

/** Imaginea pictată în culorile paletei (ADR 0221 §7); cu o culoare evidențiată, celelalte se estompează. */
function pictura(p: Posterizare, paleta: readonly CuloarePaleta[], evidentiata: number | null): HTMLCanvasElement | null {
  const c = document.createElement('canvas');
  c.width = p.latime;
  c.height = p.inaltime;
  const g = c.getContext('2d');
  if (!g) return null;
  const d = g.createImageData(p.latime, p.inaltime);
  const rgb = paleta.map((x) => [parseInt(x.hex.slice(1, 3), 16), parseInt(x.hex.slice(3, 5), 16), parseInt(x.hex.slice(5, 7), 16)] as const);
  for (let i = 0; i < p.etichete.length; i++) {
    const l = p.etichete[i] ?? 255, c3 = rgb[l];
    if (!c3) continue;
    d.data[4 * i] = c3[0]; d.data[4 * i + 1] = c3[1]; d.data[4 * i + 2] = c3[2];
    d.data[4 * i + 3] = evidentiata === null || l === evidentiata ? 255 : 48;
  }
  g.putImageData(d, 0, 0);
  return c;
}

/** O pânză cu pixelii dați (foaia îndreptată, ADR 0225, pentru previzualizare). */
function panzaDin(img: ImagineRGBA): HTMLCanvasElement | null {
  const c = document.createElement('canvas');
  c.width = img.latime;
  c.height = img.inaltime;
  const g = c.getContext('2d');
  if (!g) return null;
  const d = g.createImageData(img.latime, img.inaltime);
  d.data.set(img.date);
  g.putImageData(d, 0, 0);
  return c;
}

/** Calea k a unor căi trasate, adăugată la `p` (pixelii imaginii); una deschisă (o linie mediană) se oprește în ultimul vârf. */
function adaugaCale(p: Path2D, c: CaiTrasate, k: number): number {
  const a = c.inceput[k] ?? 0, b = c.inceput[k + 1] ?? 0, x = c.xy, deschisa = c.deschisa?.[k] === 1;
  if (b <= a) return 0;
  p.moveTo(x[6 * a] ?? 0, x[6 * a + 1] ?? 0);
  for (let v = a; v < (deschisa ? b - 1 : b); v++) {
    const w = v + 1 < b ? v + 1 : a;
    if (c.tip[v] === 1) p.bezierCurveTo(x[6 * v + 2] ?? 0, x[6 * v + 3] ?? 0, x[6 * v + 4] ?? 0, x[6 * v + 5] ?? 0, x[6 * w] ?? 0, x[6 * w + 1] ?? 0);
    else p.lineTo(x[6 * w] ?? 0, x[6 * w + 1] ?? 0);
  }
  if (!deschisa) p.closePath();
  return b - a;
}

/** Contururile unor căi trasate (pixelii imaginii), ca o singură cale de desenat. */
function caleDin(c: CaiTrasate): Path2D {
  const p = new Path2D();
  for (let k = 0; k + 1 < c.inceput.length; k++) adaugaCale(p, c, k);
  return p;
}

/**
 * Panoul trasării din fereastra importului (ADR 0220 §10): în stânga sursa, pragul, Inversează, Netezimea, petele și golurile,
 * lățimea (cu DPI-ul și de unde vine); în dreapta previzualizarea (imaginea estompată, vectorii peste ea, mărirea cu rotița
 * sau butoanele, mutarea prin tragere), apoi raportul: abaterea măsurată, imaginea, curățarea. Pe culori (ADR 0221), în locul
 * pragului și al lui Inversează, culorile (`PanouCulori`), iar imaginea previzualizării e cea pictată în culorile ei.
 */
export function PanouTrasare({ alegeri, onSchimba, octeti, stare, seRecitesc, freza }: Props) {
  const limba = useLimba();
  const nr = (x: number, z: number): string => new Intl.NumberFormat(limba === 'ro' ? 'ro-RO' : 'en-GB', { maximumFractionDigits: z, minimumFractionDigits: z }).format(x);
  /** O mărime de foaie, cu cel mult o zecimală (210, 215,9). */
  const mm1 = (x: number): string => new Intl.NumberFormat(limba === 'ro' ? 'ro-RO' : 'en-GB', { maximumFractionDigits: 1 }).format(x);
  /** Numele formatului foii trasate (după mărimea ei, nu după alegerea de acum, care poate aștepta altă trasare). */
  const numeFormat = (f: { readonly w: number; readonly h: number }): string => {
    const k = formatDupaMarime(f);
    return k === 'alt' ? t('import.trasare.format.scris') : t(`import.trasare.format.${k}`);
  };
  const raport = raportDin(stare);
  const peCulori = alegeri.sursa === 'culori';
  const [vedere, setVedere] = useState<Vedere>('ambele');
  // Culoarea de sub maus (pastila ei), evidențiată în previzualizare: indicele primei din legătura ei.
  const [evidentiata, setEvidentiata] = useState<number | null>(null);
  const culori = peCulori ? raport?.culori ?? null : null;
  const [pictata, setPictata] = useState<HTMLCanvasElement | null>(null);
  useEffect(() => {
    setPictata(culori?.posterizare ? pictura(culori.posterizare, culori.paleta, evidentiata) : null);
  }, [culori, evidentiata]);
  // Conturul piesei de sub maus, ținut cât e aceeași piesă (o trasare nouă aduce alte contururi pentru aceeași culoare).
  const conturEvidentiat = useRef<{ readonly contur: object; readonly p: Path2D } | null>(null);
  const [estompare, setEstompare] = useState(45);
  // Zona (ADR 0224): cu butonul ei apăsat (sau cu Shift), tragerea pe previzualizare desenează, mută sau întinde zona; cât
  // se trage, zona e o ciornă, trimisă la ridicarea mausului.
  const [modZona, setModZona] = useState(false);
  const [zonaCiorna, setZonaCiorna] = useState<Zona | null>(null);
  const ciornaZona = useRef<Zona | null>(null);
  // Foaia pozată oblic (ADR 0225): cu butonul Colțurile apăsat, previzualizarea arată poza, cu marginea foii și mânerele
  // colțurilor; cât se trage un mâner, colțurile sunt o ciornă (doar un patrulater convex), trimisă la ridicarea mausului.
  // Altfel, sub vectori, foaia îndreptată.
  const foaie = raport?.foaie ?? null, indreptata = foaie?.indreptata === true;
  const [modColturi, setModColturi] = useState(false);
  const [colturiCiorna, setColturiCiorna] = useState<Colturi | null>(null);
  const ciornaColturi = useRef<Colturi | null>(null);
  const peColturi = modColturi && indreptata;
  const colturiArata = colturiCiorna ?? alegeri.foaie.colturi ?? foaie?.colturi ?? null;
  const [foaieImg, setFoaieImg] = useState<HTMLCanvasElement | null>(null);
  useEffect(() => { setFoaieImg(foaie?.previzualizare ? panzaDin(foaie.previzualizare) : null); }, [foaie]);
  // Liniile mediane (ADR 0222 §8): banda grosimii, sub linii, la cerere.
  const [arataGrosimea, setArataGrosimea] = useState(false);
  const mediane = raport?.mediane ?? null;
  // Opțiunile liniei mediane (ADR 0223) și contururile părților late, colorate în previzualizare cât e bifată semnalarea.
  const om = alegeri.mediane;
  const late = stare !== 'citire' && stare.ok && stare.format === 'imagine' ? stare.late ?? null : null;
  const caleLate = useMemo(() => (late ? caleDin(late) : null), [late]);
  const arataLate = alegeri.rezultat === 'mediane' && om.semnaleaza && caleLate !== null;
  // Câmpurile cu valori: ciorna lor, trimisă după 250 ms fără altă schimbare.
  const [ciorna, setCiorna] = useState(() => ({
    prag: alegeri.prag ?? 128, pete: String(alegeri.peteMm), gauri: String(alegeri.gauriMm), latime: alegeri.latimeMm === null ? '' : String(alegeri.latimeMm),
    lat: om.pragLatMm === null ? '' : String(om.pragLatMm),
    altL: String(alegeri.foaie.alt.w), altI: String(alegeri.foaie.alt.h),
  }));
  const trimise = useRef(alegeri);
  trimise.current = alegeri;
  useEffect(() => {
    const id = setTimeout(() => {
      const numar = (s: string): number | null => { const v = Number(s.replace(',', '.')); return s.trim() !== '' && Number.isFinite(v) && v >= 0 ? v : null; };
      const a = trimise.current;
      const s: { -readonly [K in keyof AlegeriTrasare]?: AlegeriTrasare[K] } = {};
      if (a.prag !== null && ciorna.prag !== a.prag) s.prag = ciorna.prag;
      const pete = numar(ciorna.pete), gauri = numar(ciorna.gauri), latime = numar(ciorna.latime);
      if (pete !== null && pete !== a.peteMm) s.peteMm = pete;
      if (gauri !== null && gauri !== a.gauriMm) s.gauriMm = gauri;
      const lat = latime !== null && latime > 0 ? latime : null;
      if (lat !== a.latimeMm && (lat !== null || ciorna.latime.trim() === '')) s.latimeMm = lat;
      // Pragul părților late, scris (cu „Automat” debifat): doar o valoare pozitivă.
      const pragLat = numar(ciorna.lat);
      if (a.mediane.pragLatMm !== null && pragLat !== null && pragLat > 0 && pragLat !== a.mediane.pragLatMm) s.mediane = { ...a.mediane, pragLatMm: pragLat };
      // „Alt format” (ADR 0225): lățimea și înălțimea foii, pozitive; o foaie de altă mărime scoate zona.
      const altL = numar(ciorna.altL), altI = numar(ciorna.altI);
      if (a.foaie.format === 'alt' && altL !== null && altI !== null && altL > 0 && altI > 0 && (altL !== a.foaie.alt.w || altI !== a.foaie.alt.h)) {
        s.foaie = { ...a.foaie, alt: { w: altL, h: altI } };
        s.zona = null;
      }
      if (Object.keys(s).length > 0) onSchimba(s);
    }, 250);
    return () => { clearTimeout(id); };
  }, [ciorna]);

  // Imaginea, decodată și aici, doar pentru previzualizare.
  const [bmp, setBmp] = useState<ImageBitmap | null>(null);
  useEffect(() => {
    if (!octeti) return undefined;
    let viu = true, b: ImageBitmap | null = null;
    createImageBitmap(new Blob([new Uint8Array(octeti)])).then((x) => { if (viu) { b = x; setBmp(x); } else x.close(); }, () => undefined);
    return () => { viu = false; b?.close(); };
  }, [octeti]);

  // Vectorii previzualizării, direct din căile workerului, în pixelii imaginii, construiți pe bucăți de ~8 000 de vârfuri, câte
  // una pe sarcină: pe o poză cu sute de mii de vârfuri, o singură construcție ținea firul principal 0,3 s.
  const [cai, setCai] = useState<readonly Path2D[]>([]);
  useEffect(() => {
    setCai([]);
    if (stare === 'citire' || !stare.ok || stare.format !== 'imagine') return undefined;
    const c = stare.contur, gata: Path2D[] = [];
    let k = 0, viu = true;
    const pas = (): void => {
      if (!viu) return;
      const p = new Path2D();
      for (let n = 0; k + 1 < c.inceput.length && n < 8000; k++) n += adaugaCale(p, c, k);
      gata.push(p);
      if (k + 1 < c.inceput.length) setTimeout(pas, 0);
      else setCai(gata);
    };
    pas();
    return () => { viu = false; };
  }, [stare]);

  // Vederea: mărirea față de încadrare și centrul, în pixelii imaginii.
  const panza = useRef<HTMLCanvasElement>(null);
  const [vizor, setVizor] = useState<{ readonly k: number; readonly cx: number | null; readonly cy: number | null }>({ k: 1, cx: null, cy: null });
  const [marime, setMarime] = useState({ w: 640, h: 384 });
  useEffect(() => {
    const c = panza.current;
    if (!c) return undefined;
    const ro = new ResizeObserver(() => { setMarime({ w: c.clientWidth, h: c.clientHeight }); });
    ro.observe(c);
    return () => { ro.disconnect(); };
  }, []);
  // Previzualizarea arată toată imaginea (cu foaia îndreptată, foaia; cu Colțurile, poza); căile unei zone (un decupaj, ADR
  // 0224) se desenează la locul zonei lor.
  const W = peColturi ? foaie?.poza.latime ?? 1 : raport?.intreg.latimePx ?? bmp?.width ?? 1;
  const H = peColturi ? foaie?.poza.inaltime ?? 1 : raport?.intreg.inaltimePx ?? bmp?.height ?? 1;
  const baza = indreptata && !peColturi ? foaieImg : bmp;
  const zonaTrasata = raport?.zona ?? null, zonaArata = zonaCiorna ?? alegeri.zona;
  const zx = zonaTrasata?.x ?? 0, zy = zonaTrasata?.y ?? 0;
  const incadrare = Math.min(marime.w / W, marime.h / H) * 0.95;
  const s = incadrare * vizor.k, cx = vizor.cx ?? W / 2, cy = vizor.cy ?? H / 2;
  useEffect(() => {
    const c = panza.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(marime.w * dpr);
    c.height = Math.round(marime.h * dpr);
    const g = c.getContext('2d');
    if (!g) return;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, c.width, c.height);
    g.setTransform(s * dpr, 0, 0, s * dpr, (marime.w / 2 - cx * s) * dpr, (marime.h / 2 - cy * s) * dpr);
    if (peColturi) {
      // Colțurile (ADR 0225): poza, umbrită în afara foii, cu marginea ei și cele patru mânere.
      if (bmp) {
        g.imageSmoothingEnabled = s < 4;
        g.drawImage(bmp, 0, 0, W, H);
      }
      if (colturiArata) {
        const q = new Path2D();
        colturiArata.forEach(([x, y], i) => { if (i === 0) q.moveTo(x, y); else q.lineTo(x, y); });
        q.closePath();
        const umbra = new Path2D();
        umbra.rect(0, 0, W, H);
        umbra.addPath(q);
        g.fillStyle = 'rgba(0, 0, 0, 0.45)';
        g.fill(umbra, 'evenodd');
        g.strokeStyle = getComputedStyle(c).getPropertyValue('--a').trim() || '#0a5bd3';
        g.lineWidth = 2 / s;
        g.stroke(q);
        g.fillStyle = '#ffffff';
        for (const [x, y] of colturiArata) {
          g.beginPath();
          g.arc(x, y, 7 / s, 0, 2 * Math.PI);
          g.fill();
          g.stroke();
        }
      }
      return;
    }
    if (vedere !== 'vectori') {
      const alfa = vedere === 'ambele' ? 1 - estompare / 100 : 1;
      // Pe culori, imaginea pictată e a zonei trasate; în jurul ei, imaginea, estompată de două ori.
      if (pictata && zonaTrasata && baza) {
        g.globalAlpha = alfa / 2;
        g.imageSmoothingEnabled = s < 4;
        g.drawImage(baza, 0, 0, W, H);
      }
      const fundal = pictata ?? baza;
      if (fundal) {
        g.globalAlpha = alfa;
        g.imageSmoothingEnabled = !pictata && s < 4;
        if (pictata && raport) g.drawImage(pictata, zx, zy, raport.latimePx, raport.inaltimePx);
        else g.drawImage(fundal, 0, 0, W, H);
      }
      g.globalAlpha = 1;
    }
    // În afara zonei alese (ADR 0224), umbrit.
    if (zonaArata) {
      g.fillStyle = 'rgba(0, 0, 0, 0.45)';
      g.beginPath();
      g.rect(0, 0, W, H);
      g.rect(zonaArata.x, zonaArata.y, zonaArata.w, zonaArata.h);
      g.fill('evenodd');
    }
    g.translate(zx, zy);
    // Părțile late (ADR 0223), colorate sub linii, cu accentul aplicației.
    if (caleLate && arataLate && vedere !== 'imagine') {
      g.fillStyle = getComputedStyle(c).getPropertyValue('--a').trim() || '#a64d00';
      g.globalAlpha = 0.3;
      g.fill(caleLate, 'evenodd');
      g.globalAlpha = 1;
    }
    // Banda grosimii: unde ar tăia o freză cât trăsătura (lățimea măsurată), sub linii.
    if (cai.length > 0 && vedere !== 'imagine' && arataGrosimea && mediane && mediane.grosimePx > 0) {
      g.strokeStyle = getComputedStyle(c).getPropertyValue('--traseu-taiere').trim() || '#0a7d53';
      g.globalAlpha = 0.3;
      g.lineWidth = mediane.grosimePx;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      for (const p of cai) g.stroke(p);
      g.globalAlpha = 1;
      g.lineCap = 'butt';
    }
    if (cai.length > 0 && vedere !== 'imagine') {
      g.strokeStyle = getComputedStyle(c).getPropertyValue('--traseu-taiere').trim() || '#0a7d53';
      g.lineWidth = 1.5 / s;
      g.lineJoin = 'round';
      for (const p of cai) g.stroke(p);
    }
    // Piesa culorii de sub maus: conturul ei, mai gros.
    const piesa = evidentiata === null ? undefined : culori?.piese.find((x) => x.culoare === evidentiata);
    if (piesa && vedere !== 'imagine') {
      if (conturEvidentiat.current?.contur !== piesa.contur) conturEvidentiat.current = { contur: piesa.contur, p: caleDin(piesa.contur) };
      g.strokeStyle = getComputedStyle(c).getPropertyValue('--a').trim() || '#0a5bd3';
      g.lineWidth = 3 / s;
      g.stroke(conturEvidentiat.current.p);
    }
    g.translate(-zx, -zy);
    // Conturul zonei, cu mânerele lui cât e apăsat butonul zonei (sau cât se trage).
    if (zonaArata) {
      g.strokeStyle = getComputedStyle(c).getPropertyValue('--a').trim() || '#0a5bd3';
      g.lineWidth = 1.5 / s;
      g.setLineDash([6 / s, 4 / s]);
      g.strokeRect(zonaArata.x, zonaArata.y, zonaArata.w, zonaArata.h);
      g.setLineDash([]);
      if (modZona || zonaCiorna) {
        const m = 7 / s;
        g.fillStyle = '#ffffff';
        for (const fx of [0, 0.5, 1]) {
          for (const fy of [0, 0.5, 1]) {
            if (fx === 0.5 && fy === 0.5) continue;
            const px = zonaArata.x + fx * zonaArata.w - m / 2, py = zonaArata.y + fy * zonaArata.h - m / 2;
            g.fillRect(px, py, m, m);
            g.strokeRect(px, py, m, m);
          }
        }
      }
    }
  }, [bmp, baza, pictata, cai, vedere, estompare, s, cx, cy, marime, W, H, evidentiata, culori, arataGrosimea, mediane, caleLate, arataLate, zonaArata, zonaTrasata, zx, zy, modZona, zonaCiorna, raport, peColturi, colturiArata]);
  const mareste = (f: number, px?: number, py?: number): void => {
    // Punctul de sub maus rămâne pe loc (fără maus: centrul).
    const ox = px ?? marime.w / 2, oy = py ?? marime.h / 2;
    const ix = cx + (ox - marime.w / 2) / s, iy = cy + (oy - marime.h / 2) / s;
    // Cu Colțurile, până la jumătate din încadrare: un colț al foii poate fi tras și în afara pozei.
    const k = Math.max(peColturi ? 0.5 : 1, Math.min(64, vizor.k * f)), ns = incadrare * k;
    setVizor({ k, cx: ix - (ox - marime.w / 2) / ns, cy: iy - (oy - marime.h / 2) / ns });
  };
  useEffect(() => {
    const c = panza.current;
    if (!c) return undefined;
    const roata = (e: WheelEvent): void => {
      e.preventDefault();
      const r = c.getBoundingClientRect();
      mareste(e.deltaY < 0 ? 1.25 : 0.8, e.clientX - r.left, e.clientY - r.top);
    };
    c.addEventListener('wheel', roata, { passive: false });
    return () => { c.removeEventListener('wheel', roata); };
  });
  const tras = useRef<Tragere | null>(null);
  /** Punctul de sub maus, în pixelii imaginii întregi. */
  const laImagine = (e: { readonly clientX: number; readonly clientY: number; readonly currentTarget: Element }): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    return [cx + (e.clientX - r.left - marime.w / 2) / s, cy + (e.clientY - r.top - marime.h / 2) / s];
  };

  const aleasa = raport && raport.sursa !== 'culori' ? t(raport.sursa === 'alfa' ? 'import.trasare.aleasa.alfa' : 'import.trasare.aleasa.lum') : '';
  const px = (mm: string): string => {
    const v = Number(mm.replace(',', '.'));
    return raport && Number.isFinite(v) && v > 0 ? t('import.trasare.px', { px: nr(v / raport.mmPePx, 1) }) : '';
  };
  const automat = alegeri.prag === null;
  return (
    <div className="trasare-corp" data-testid="trasare-panou">
      <div className="trasare-comenzi">
        <label>
          {t('import.trasare.sursa')}
          <select value={alegeri.sursa} data-camp="trasare-sursa" onChange={(e) => {
            const v = e.target.value;
            setEvidentiata(null);
            onSchimba({ sursa: v === 'alfa' || v === 'lum' || v === 'culori' ? v : 'auto' });
          }}>
            <option value="auto">{t('import.trasare.sursa.auto')}</option>
            <option value="alfa">{t('import.trasare.sursa.alfa')}</option>
            <option value="lum">{t('import.trasare.sursa.lum')}</option>
            <option value="culori">{t('import.trasare.sursa.culori')}</option>
          </select>
        </label>
        {!peCulori && (
          <label>
            {t('import.trasare.rezultat')}
            <select value={alegeri.rezultat} data-camp="trasare-rezultat" onChange={(e) => { onSchimba({ rezultat: e.target.value === 'mediane' ? 'mediane' : 'contururi' }); }}>
              <option value="contururi">{t('import.trasare.rezultat.contururi')}</option>
              <option value="mediane">{t('import.trasare.rezultat.mediane')}</option>
            </select>
          </label>
        )}
        {!peCulori && alegeri.rezultat === 'mediane' && <p className="mic">{t('import.trasare.rezultat.sfat')}</p>}
        {!peCulori && alegeri.rezultat === 'mediane' && (
          <OptiuniMediane om={om} onSchimba={(m) => { onSchimba({ mediane: m }); }} lat={ciorna.lat}
            onLat={(v) => { setCiorna({ ...ciorna, lat: v }); }}
            automatMm={mediane?.parti && raport ? mediane.parti.pragPx * raport.mmPePx : mediane && raport ? 2 * mediane.grosimePx * raport.mmPePx : null} nr={nr} />
        )}
        {peCulori && <PanouCulori alegeri={alegeri} paleta={culori?.paleta ?? null} onSchimba={onSchimba} onEvidentiaza={setEvidentiata} nr={nr} />}
        {raport && !peCulori && <p className="mic" data-testid="trasare-sursa-aleasa">{aleasa}</p>}
        {!peCulori && <div className="trasare-prag">
          <span id="trasare-prag-eticheta">{t('import.trasare.prag')}</span>
          <label className="rand">
            <input type="checkbox" checked={automat} data-camp="trasare-prag-auto" onChange={(e) => {
              const p = raport?.prag ?? 128;
              setCiorna({ ...ciorna, prag: p });
              onSchimba({ prag: e.target.checked ? null : p });
            }} />
            {t('import.trasare.prag-automat')}
          </label>
          <input type="range" min={1} max={254} value={automat ? raport?.prag ?? 128 : ciorna.prag} disabled={automat}
            aria-labelledby="trasare-prag-eticheta" data-camp="trasare-prag"
            onChange={(e) => { setCiorna({ ...ciorna, prag: Number(e.target.value) }); }} />
          <output data-testid="trasare-prag-valoare">{automat ? raport?.prag ?? '—' : ciorna.prag}</output>
          {raport && <Histograma h={raport.histograma} prag={automat ? raport.prag : ciorna.prag} />}
        </div>}
        {!peCulori && (
          <label className="rand">
            <input type="checkbox" checked={alegeri.inverseaza} data-camp="trasare-inverseaza" onChange={(e) => { onSchimba({ inverseaza: e.target.checked }); }} />
            {t('import.trasare.inverseaza')}
          </label>
        )}
        {!peCulori && (raport ? raport.sursa === 'lum' : alegeri.sursa === 'lum') && (
          <div className="trasare-lumina">
            <label>
              {t('import.trasare.lumina')}
              <select value={alegeri.lumina} data-camp="trasare-lumina" onChange={(e) => {
                const v = e.target.value;
                onSchimba({ lumina: v === 'neuniforma' || v === 'umbre' ? v : 'uniforma' });
              }}>
                <option value="uniforma">{t('import.trasare.lumina.uniforma')}</option>
                <option value="neuniforma">{t('import.trasare.lumina.neuniforma')}</option>
                <option value="umbre">{t('import.trasare.lumina.umbre')}</option>
              </select>
            </label>
            <p className="mic" data-testid="trasare-lumina-sfat">{t(`import.trasare.lumina.sfat.${alegeri.lumina}`)}</p>
          </div>
        )}
        <label>
          {t('import.trasare.netezime')}
          <select value={alegeri.netezime} data-camp="trasare-netezime" onChange={(e) => {
            const v = e.target.value;
            onSchimba({ netezime: v === 'fidel' || v === 'neted' ? v : 'echilibrat' });
          }}>
            <option value="fidel">{t('import.trasare.netezime.fidel')}</option>
            <option value="echilibrat">{t('import.trasare.netezime.echilibrat')}</option>
            <option value="neted">{t('import.trasare.netezime.neted')}</option>
          </select>
        </label>
        <label>
          {t('import.trasare.pete')}
          <input type="text" inputMode="decimal" value={ciorna.pete} data-camp="trasare-pete" onChange={(e) => { setCiorna({ ...ciorna, pete: e.target.value }); }} />
          <span className="mic">{px(ciorna.pete)}</span>
        </label>
        <label>
          {t('import.trasare.gauri')}
          <input type="text" inputMode="decimal" value={ciorna.gauri} data-camp="trasare-gauri" onChange={(e) => { setCiorna({ ...ciorna, gauri: e.target.value }); }} />
          <span className="mic">{px(ciorna.gauri)}</span>
        </label>
        <label className="rand">
          <input type="checkbox" checked={alegeri.margine} data-camp="trasare-margine" onChange={(e) => { onSchimba({ margine: e.target.checked }); }} />
          {t('import.trasare.margine')}
        </label>
        {raport && !raport.transparenta && (
          <div className="trasare-foaie" role="group" aria-label={t('import.trasare.foaie.grup')} data-testid="trasare-grup-foaie">
            <label className="rand">
              <input type="checkbox" checked={alegeri.foaie.indreapta} data-camp="trasare-foaie" onChange={(e) => {
                if (!e.target.checked) setModColturi(false);
                onSchimba({ foaie: { ...alegeri.foaie, indreapta: e.target.checked }, zona: null });
              }} />
              {t('import.trasare.foaie')}
            </label>
            {alegeri.foaie.indreapta ? (
              <label>
                {t('import.trasare.format')}
                <select value={alegeri.foaie.format} data-camp="trasare-format" onChange={(e) => {
                  const v = e.target.value;
                  const format = v === 'a5' || v === 'a3' || v === 'letter' || v === 'alt' || v === 'poza' ? v : 'a4';
                  onSchimba({ foaie: { ...alegeri.foaie, format }, zona: null });
                }}>
                  {(['a4', 'a5', 'a3', 'letter', 'alt', 'poza'] as const).map((f) => <option key={f} value={f}>{t(`import.trasare.format.${f}`)}</option>)}
                </select>
              </label>
            ) : <p className="mic">{t('import.trasare.foaie.sfat')}</p>}
            {alegeri.foaie.indreapta && alegeri.foaie.format === 'alt' && (
              <span className="trasare-format-alt">
                <label>
                  {t('import.trasare.format.latime')}
                  <input type="text" inputMode="decimal" value={ciorna.altL} data-camp="trasare-format-l" onChange={(e) => { setCiorna({ ...ciorna, altL: e.target.value }); }} />
                </label>
                <label>
                  {t('import.trasare.format.inaltime')}
                  <input type="text" inputMode="decimal" value={ciorna.altI} data-camp="trasare-format-i" onChange={(e) => { setCiorna({ ...ciorna, altI: e.target.value }); }} />
                </label>
              </span>
            )}
          </div>
        )}
        <label>
          {t('import.trasare.latime')}
          <input type="text" inputMode="decimal" value={ciorna.latime} placeholder={raport ? nr(raport.latimeMm, 1) : ''} data-camp="trasare-latime"
            onChange={(e) => { setCiorna({ ...ciorna, latime: e.target.value }); }} />
        </label>
        {raport && (
          <p className="mic" data-testid="trasare-scara">
            {t('import.trasare.scara', {
              inaltime: nr(raport.inaltimeMm, 1), mm: nr(raport.mmPePx, 3), dpi: nr(raport.dpi, 0),
              sursa: t(`import.trasare.scara.${raport.scara}`),
            })}
          </p>
        )}
      </div>
      <div className="trasare-previz">
        <div className="trasare-bara">
          <div className="segmentat" role="radiogroup" aria-label={t('import.trasare.vedere')}>
            {(['imagine', 'vectori', 'ambele'] as const).map((v) => (
              <label key={v}>
                <input type="radio" name="trasare-vedere" value={v} checked={vedere === v} data-camp={`trasare-vedere-${v}`} onChange={() => { setVedere(v); }} />
                {t(`import.trasare.vedere.${v}`)}
              </label>
            ))}
          </div>
          <label className="rand mic">
            {t('import.trasare.estompare')}
            <input type="range" min={0} max={90} value={estompare} data-camp="trasare-estompare" onChange={(e) => { setEstompare(Number(e.target.value)); }} />
          </label>
          {mediane && (
            <label className="rand mic">
              <input type="checkbox" checked={arataGrosimea} data-camp="trasare-arata-grosimea" onChange={(e) => { setArataGrosimea(e.target.checked); }} />
              {t('import.trasare.arata-grosimea')}
            </label>
          )}
          <span className="trasare-zoom">
            <button type="button" data-buton="trasare-micsoreaza" title={t('import.trasare.micsoreaza')} onClick={() => { mareste(0.8); }}>−</button>
            <button type="button" data-buton="trasare-mareste" title={t('import.trasare.mareste')} onClick={() => { mareste(1.25); }}>+</button>
            <button type="button" data-buton="trasare-incadreaza" onClick={() => { setVizor({ k: 1, cx: null, cy: null }); }}>{t('import.trasare.incadreaza')}</button>
          </span>
          <span className="trasare-zoom">
            <button type="button" data-buton="trasare-zona" aria-pressed={modZona} title={t('import.trasare.zona.titlu')}
              onClick={() => {
                setModZona(!modZona);
                if (modColturi) { setModColturi(false); setVizor({ k: 1, cx: null, cy: null }); }
              }}>{t('import.trasare.zona')}</button>
            <button type="button" data-buton="trasare-toata" disabled={!alegeri.zona}
              onClick={() => { setZonaCiorna(null); onSchimba({ zona: null }); }}>{t('import.trasare.toata')}</button>
          </span>
          {indreptata && (
            <span className="trasare-zoom">
              <button type="button" data-buton="trasare-colturi" aria-pressed={peColturi} title={t('import.trasare.colturi.titlu')}
                onClick={() => { setModColturi(!modColturi); setModZona(false); setVizor({ k: 1, cx: null, cy: null }); }}>{t('import.trasare.colturi')}</button>
              <button type="button" data-buton="trasare-colturi-singur" disabled={!alegeri.foaie.colturi}
                onClick={() => { onSchimba({ foaie: { ...alegeri.foaie, colturi: null }, zona: null }); }}>{t('import.trasare.colturi.singur')}</button>
            </span>
          )}
        </div>
        <canvas ref={panza} className={peColturi ? 'trasare-panza colturi' : modZona ? 'trasare-panza zona' : 'trasare-panza'} data-testid="trasare-previzualizare"
          aria-label={t('import.trasare.previzualizare')}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            if (peColturi) {
              // Mânerul cel mai apropiat, la cel mult 12 px pe ecran; altfel, tragerea mută vederea.
              const [ix, iy] = laImagine(e);
              let i = -1, d = 12 / s;
              colturiArata?.forEach(([x, y], k) => { const dk = Math.hypot(x - ix, y - iy); if (dk <= d) { d = dk; i = k; } });
              tras.current = i >= 0 && colturiArata ? { fel: 'colt', i, c0: colturiArata } : { fel: 'vedere', x: e.clientX, y: e.clientY, cx, cy };
            } else if (modZona || e.shiftKey) {
              const [ix, iy] = laImagine(e), z0 = alegeri.zona;
              tras.current = { fel: 'zona', ix, iy, z0, mod: z0 ? apuca(z0, ix, iy, 7 / s) : 'noua' };
            } else tras.current = { fel: 'vedere', x: e.clientX, y: e.clientY, cx, cy };
          }}
          onPointerMove={(e) => {
            const d = tras.current;
            if (!d) return;
            if (d.fel === 'vedere') { setVizor({ k: vizor.k, cx: d.cx - (e.clientX - d.x) / s, cy: d.cy - (e.clientY - d.y) / s }); return; }
            const [ix, iy] = laImagine(e);
            if (d.fel === 'colt') {
              const p: readonly [number, number] = [Math.max(-W / 2, Math.min(1.5 * W, ix)), Math.max(-H / 2, Math.min(1.5 * H, iy))];
              const n = d.c0.map((q, k) => (k === d.i ? p : q)) as unknown as Colturi;
              if (colturiBune(n)) { ciornaColturi.current = n; setColturiCiorna(n); }
              return;
            }
            ciornaZona.current = zonaTrasa(d, ix, iy, W, H);
            setZonaCiorna(ciornaZona.current);
          }}
          onPointerUp={() => {
            const d = tras.current, z = ciornaZona.current, c = ciornaColturi.current;
            tras.current = null;
            ciornaZona.current = null;
            ciornaColturi.current = null;
            if (d?.fel === 'colt') {
              // Colțurile mutate: foaia se îndreaptă din nou, iar zona (în pixelii foii vechi) se scoate.
              setColturiCiorna(null);
              if (c) onSchimba({ foaie: { ...alegeri.foaie, colturi: c }, zona: null });
              return;
            }
            if (d?.fel !== 'zona') return;
            setZonaCiorna(null);
            // Un clic fără tragere (sau un dreptunghi de sub 4 px) nu face o zonă.
            if (z && z.w >= 4 && z.h >= 4) onSchimba({ zona: rotunjita(z) });
          }} />
        <div className="trasare-raport" data-testid="trasare-raport" aria-live="polite">
          {(stare === 'citire' || seRecitesc) && <p role="status" data-testid="trasare-trasez">{t('import.trasare.trasez')}</p>}
          {raport && (
            <>
              {stare !== 'citire' && stare.ok && (
                <p data-testid="trasare-abatere">
                  {t(mediane ? 'import.trasare.abatere-mediane' : 'import.trasare.abatere', { mm: nr(raport.abaterePx * raport.mmPePx, 3), px: nr(raport.abaterePx, 2) })}
                </p>
              )}
              {raport.zona && (
                <p data-testid="trasare-zona">
                  {t('import.trasare.zona-raport', {
                    latime: raport.zona.w, inaltime: raport.zona.h, mmL: nr(raport.latimeMm, 1), mmI: nr(raport.inaltimeMm, 1),
                    latime0: raport.intreg.latimePx, inaltime0: raport.intreg.inaltimePx,
                  })}
                </p>
              )}
              {foaie?.indreptata && (
                <p data-testid="trasare-foaie">
                  {foaie.format
                    ? t('import.trasare.foaie-raport', {
                      format: numeFormat(foaie.format),
                      latime: mm1(foaie.format.w), inaltime: mm1(foaie.format.h), colturi: t(`import.trasare.colturi.${foaie.sursa}`),
                      p: nr(foaie.proportii.raport, 3), f: nr(foaie.format.w / foaie.format.h, 3),
                    })
                    : t('import.trasare.foaie-raport-poza', { p: nr(foaie.proportii.raport, 3), colturi: t(`import.trasare.colturi.${foaie.sursa}`) })}
                </p>
              )}
              {foaie?.indreptata && foaie.sursa === 'implicite' && <p className="avertisment" data-testid="trasare-foaie-negasita">{t('import.trasare.foaie-negasita')}</p>}
              {foaie?.indreptata && foaie.sursa !== 'implicite' && foaie.potrivit === false && foaie.format && (
                <p className="avertisment" data-testid="trasare-foaie-nu-pare">
                  {t('import.trasare.foaie-nu-pare', {
                    p: nr(foaie.proportii.raport, 3), f: nr(foaie.format.w / foaie.format.h, 3),
                    format: numeFormat(foaie.format),
                  })}
                </p>
              )}
              {foaie?.indreptata && !foaie.format && foaie.proportii.nesigure && (
                <p className="avertisment" data-testid="trasare-foaie-nesigure">
                  {t('import.trasare.foaie-nesigure', { min: nr(foaie.proportii.min, 3), max: nr(foaie.proportii.max, 3) })}
                </p>
              )}
              {foaie && !foaie.indreptata && foaie.sugestie && <p className="avertisment" data-testid="trasare-sugestie-foaie">{t('import.trasare.sugestie-foaie')}</p>}
              {raport.sursa === 'lum' && raport.lumina === 'uniforma' && raport.inegala !== null && raport.inegala > SUGESTIE_INEGALA && (
                <p className="avertisment" data-testid="trasare-sugestie">{t('import.trasare.sugestie', { procent: nr(100 * raport.inegala, 0) })}</p>
              )}
              {mediane && mediane.grosimePx > 0 && <RaportGrosime grosimeMm={mediane.grosimePx * raport.mmPePx} grosimePx={mediane.grosimePx} freza={freza} nr={nr} />}
              {mediane && mediane.puncte > 0 && <p data-testid="trasare-puncte">{t('import.trasare.puncte', { n: mediane.puncte })}</p>}
              {mediane?.parti && (
                <p data-testid="trasare-parti">
                  {mediane.parti.numar > 0
                    ? t('import.trasare.parti', { n: mediane.parti.numar, procent: nr(100 * mediane.parti.arie, 0), mm: nr(mediane.parti.pragPx * raport.mmPePx, 2) })
                    : t('import.trasare.parti-niciuna', { mm: nr(mediane.parti.pragPx * raport.mmPePx, 2) })}
                </p>
              )}
              <p data-testid="trasare-imagine">
                {raport.redusDin
                  ? t('import.trasare.redusa', { latime: raport.intreg.latimePx, inaltime: raport.intreg.inaltimePx, latime0: raport.redusDin.latime, inaltime0: raport.redusDin.inaltime })
                  : t('import.trasare.imagine', { latime: foaie?.indreptata ? foaie.poza.latime : raport.intreg.latimePx, inaltime: foaie?.indreptata ? foaie.poza.inaltime : raport.intreg.inaltimePx })}
              </p>
              {(raport.pete > 0 || raport.gauri > 0) && <p data-testid="trasare-curatare">{t('import.trasare.curatare', { pete: t('import.trasare.pete-sterse', { n: raport.pete }), gauri: t('import.trasare.goluri-umplute', { n: raport.gauri }) })}</p>}
              {raport.margine > 0 && <p data-testid="trasare-margine">{t('import.trasare.margine-sterse', { n: raport.margine })}</p>}
              {raport.margini === 'dure' && <p className="mic" data-testid="trasare-dure">{t('import.trasare.dure')}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Opțiunile liniei mediane (ADR 0223, răspunsurile 1a–3a): sub „Rezultatul”, doar la „Linii mediane”: capetele (în centrul
 * capătului rotund sau în vârf), părțile late (linii mediane sau contururi) cu pragul lor („Automat”: de două ori grosimea
 * obișnuită; altfel, în mm), „Arată părțile late” (pornită implicit) și buclele (pe linie sau vectori închiși). Pragul are
 * efect doar cu contururi sau cu semnalarea.
 */
function OptiuniMediane({ om, onSchimba, lat, onLat, automatMm, nr }: {
  readonly om: AlegeriTrasare['mediane']; readonly onSchimba: (m: AlegeriTrasare['mediane']) => void;
  readonly lat: string; readonly onLat: (v: string) => void; readonly automatMm: number | null; readonly nr: (x: number, z: number) => string;
}) {
  const automat = om.pragLatMm === null;
  const conteazaPragul = om.late === 'contur' || om.semnaleaza;
  return (
    <div className="trasare-mediane" role="group" aria-label={t('import.trasare.mediane.optiuni')} data-testid="trasare-optiuni-mediane">
      <label>
        {t('import.trasare.capete')}
        <select value={om.capete} data-camp="trasare-capete" onChange={(e) => { onSchimba({ ...om, capete: e.target.value === 'varf' ? 'varf' : 'centru' }); }}>
          <option value="centru">{t('import.trasare.capete.centru')}</option>
          <option value="varf">{t('import.trasare.capete.varf')}</option>
        </select>
      </label>
      <label>
        {t('import.trasare.late')}
        <select value={om.late} data-camp="trasare-late" onChange={(e) => { onSchimba({ ...om, late: e.target.value === 'contur' ? 'contur' : 'mediane' }); }}>
          <option value="mediane">{t('import.trasare.late.mediane')}</option>
          <option value="contur">{t('import.trasare.late.contur')}</option>
        </select>
      </label>
      <div className="trasare-prag-lat">
        <span id="trasare-lat-eticheta">{t('import.trasare.lat')}</span>
        <label className="rand">
          <input type="checkbox" checked={automat} disabled={!conteazaPragul} data-camp="trasare-lat-auto" onChange={(e) => {
            const v = automatMm !== null && automatMm > 0 ? Number(automatMm.toFixed(2)) : 1;
            onLat(String(v));
            onSchimba({ ...om, pragLatMm: e.target.checked ? null : v });
          }} />
          {t('import.trasare.lat-automat')}
        </label>
        <input type="text" inputMode="decimal" aria-labelledby="trasare-lat-eticheta" data-camp="trasare-lat"
          value={automat ? (automatMm !== null ? nr(automatMm, 2) : '') : lat} disabled={automat || !conteazaPragul}
          onChange={(e) => { onLat(e.target.value); }} />
      </div>
      <label className="rand">
        <input type="checkbox" checked={om.semnaleaza} data-camp="trasare-arata-late" onChange={(e) => { onSchimba({ ...om, semnaleaza: e.target.checked }); }} />
        {t('import.trasare.arata-late')}
      </label>
      <label>
        {t('import.trasare.bucle')}
        <select value={om.bucle} data-camp="trasare-bucle" onChange={(e) => { onSchimba({ ...om, bucle: e.target.value === 'inchise' ? 'inchise' : 'linie' }); }}>
          <option value="linie">{t('import.trasare.bucle.linie')}</option>
          <option value="inchise">{t('import.trasare.bucle.inchise')}</option>
        </select>
      </label>
    </div>
  );
}

/**
 * Grosimea obișnuită a trăsăturilor (ADR 0222 §5) și, dacă foaia are o singură freză, cum stă ea față de trăsătură: cât ea
 * (cel mult 10 % sau 0,05 mm diferență), mai lată (gravura ar mânca din jur) sau mai îngustă (ar ieși mai subțire).
 */
function RaportGrosime({ grosimeMm, grosimePx, freza, nr }: {
  readonly grosimeMm: number; readonly grosimePx: number; readonly freza: number | undefined; readonly nr: (x: number, z: number) => string;
}) {
  const fel = freza === undefined ? null : Math.abs(freza - grosimeMm) <= Math.max(0.05, 0.1 * grosimeMm) ? 'potrivita' : freza > grosimeMm ? 'lata' : 'ingusta';
  return (
    <>
      <p data-testid="trasare-grosime">{t('import.trasare.grosime', { mm: nr(grosimeMm, 2), px: nr(grosimePx, 1) })}</p>
      {fel && freza !== undefined && <p data-testid="trasare-freza" data-fel={fel}>{t(`import.trasare.freza-${fel}`, { d: nr(freza, 2) })}</p>}
    </>
  );
}

/** Tipul datelor unei pastile trase (indicele culorii), ca să nu se lege nimic din altă tragere. */
const TRAGERE_CULOARE = 'application/x-cncvs2-culoare';

/**
 * Culorile (ADR 0221 §2–§3): numărul (automat, sau din glisor, 2–16; un număr nou șterge legăturile și bifele, ca în ArtCAM),
 * apoi pastilele: culoarea, ponderea ei în desen (la fundal, „fundalul”) și bifa „Se trasează”. O pastilă trasă peste alta se
 * leagă de ea (devin o singură culoare); „Leagă de…” face același lucru de la tastatură, iar pastila legată are „Dezleagă”.
 * Mausul (sau focusul) pe o pastilă îi evidențiază regiunea în previzualizare.
 */
function PanouCulori({ alegeri, paleta, onSchimba, onEvidentiaza, nr }: {
  readonly alegeri: AlegeriTrasare; readonly paleta: readonly CuloarePaleta[] | null;
  readonly onSchimba: (s: Partial<AlegeriTrasare>) => void; readonly onEvidentiaza: (k: number | null) => void;
  readonly nr: (x: number, z: number) => string;
}) {
  const c = alegeri.culori;
  const automat = c.numar === null;
  const [numar, setNumar] = useState(c.numar ?? 3);
  useEffect(() => {
    if (automat || numar === c.numar) return undefined;
    const id = setTimeout(() => { onSchimba({ culori: { numar, legaturi: [], bifate: null } }); }, 250);
    return () => { clearTimeout(id); };
  }, [numar]);
  const lista = paleta ?? [];
  // Legăturile și bifele din alegeri (schimbate pe loc), nu din raport (abia după trasarea nouă).
  const prime = primele(c.legaturi, lista.length);
  const leaga = (a: number, b: number): void => {
    const l = lista.map((_, k) => c.legaturi[k] ?? -1);
    l[a] = b;
    onEvidentiaza(null);
    onSchimba({ culori: { ...c, legaturi: l } });
  };
  const bifeaza = (k: number, v: boolean): void => {
    const b = lista.map((x, j) => c.bifate?.[j] ?? !x.fundal);
    b[k] = v;
    onSchimba({ culori: { ...c, bifate: b } });
  };
  const radacini = lista.map((_, k) => (prime[k] === k ? k : -1)).filter((k) => k >= 0);
  return (
    <div className="trasare-culori" data-testid="trasare-culori">
      <span id="trasare-numar-eticheta">{t('import.trasare.culori.numar')}</span>
      <label className="rand">
        <input type="checkbox" checked={automat} data-camp="trasare-culori-automat" onChange={(e) => {
          const n = lista.length >= 2 ? lista.length : 3;
          setNumar(n);
          onSchimba({ culori: { numar: e.target.checked ? null : n, legaturi: [], bifate: null } });
        }} />
        {t('import.trasare.culori.automat')}
      </label>
      <input type="range" min={2} max={16} value={automat ? Math.max(2, lista.length) : numar} disabled={automat}
        aria-labelledby="trasare-numar-eticheta" data-camp="trasare-culori-numar"
        onChange={(e) => { setNumar(Number(e.target.value)); }} />
      <output data-testid="trasare-culori-valoare">{automat ? lista.length || '—' : numar}</output>
      {lista.length > 0 && <p className="mic">{t('import.trasare.culori.sfat')}</p>}
      <ul className="trasare-pastile" data-testid="trasare-pastile">
        {lista.map((x, k) => {
          const p = prime[k] ?? k, legata = p !== k;
          return (
            <li key={k} className="trasare-pastila" data-culoare={k} data-hex={x.hex} data-legata={legata ? p : undefined}
              draggable={!legata}
              onDragStart={(e) => { e.dataTransfer.setData(TRAGERE_CULOARE, String(k)); e.dataTransfer.effectAllowed = 'link'; }}
              onDragOver={(e) => { if (e.dataTransfer.types.includes(TRAGERE_CULOARE)) { e.preventDefault(); e.dataTransfer.dropEffect = 'link'; } }}
              onDrop={(e) => {
                const a = Number(e.dataTransfer.getData(TRAGERE_CULOARE));
                e.preventDefault();
                if (Number.isInteger(a) && a !== k && a !== p) leaga(a, p);
              }}
              onPointerEnter={() => { onEvidentiaza(p); }} onPointerLeave={() => { onEvidentiaza(null); }}
              onFocus={() => { onEvidentiaza(p); }} onBlur={() => { onEvidentiaza(null); }}>
              <span className="trasare-pastila-culoare" style={{ background: x.hex }} aria-hidden="true" />
              <span className="trasare-pastila-text">
                <span>{x.hex}</span>
                <span className="mic">{x.fundal ? t('import.trasare.culori.fundal') : t('import.trasare.culori.pondere', { p: nr(100 * x.pondere, 1) })}</span>
              </span>
              {legata ? (
                <span className="trasare-pastila-legatura">
                  <span className="mic" data-testid="trasare-legata">{t('import.trasare.culori.legata', { culoare: lista[p]?.hex ?? '' })}</span>
                  <button type="button" data-buton="trasare-dezleaga" onClick={() => { leaga(k, -1); }}>{t('import.trasare.culori.dezleaga')}</button>
                </span>
              ) : (
                <span className="trasare-pastila-legatura">
                  <label className="rand mic">
                    <input type="checkbox" checked={c.bifate ? c.bifate[k] === true : x.bifata} data-camp="trasare-culoare-bifata" onChange={(e) => { bifeaza(k, e.target.checked); }} />
                    {t('import.trasare.culori.bifa')}
                  </label>
                  <select value="" aria-label={t('import.trasare.culori.leaga-de', { culoare: x.hex })} data-camp="trasare-leaga"
                    onChange={(e) => { if (e.target.value !== '') leaga(k, Number(e.target.value)); }}>
                    <option value="">{t('import.trasare.culori.leaga')}</option>
                    {radacini.filter((j) => j !== k).map((j) => <option key={j} value={j}>{lista[j]?.hex}</option>)}
                  </select>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Histograma cernelii sub glisorul pragului (ADR 0220 §3): înălțimile pe scară logaritmică (fundalul și desenul ar strivi
 * altfel nuanțele dintre ele), iar linia arată pragul, chiar cât se mută glisorul. Doar de privit: glisorul e controlul.
 */
function Histograma({ h, prag }: { readonly h: readonly number[]; readonly prag: number }) {
  const max = Math.log1p(Math.max(1, ...h));
  let d = 'M0 32';
  for (let i = 0; i < h.length; i++) d += `L${i} ${(32 - (32 * Math.log1p(h[i] ?? 0)) / max).toFixed(1)}L${i + 1} ${(32 - (32 * Math.log1p(h[i] ?? 0)) / max).toFixed(1)}`;
  d += `L${h.length} 32Z`;
  return (
    <svg className="trasare-histograma" viewBox="0 0 256 32" preserveAspectRatio="none" aria-hidden="true" data-testid="trasare-histograma">
      <path d={d} />
      <line x1={prag - 0.5} x2={prag - 0.5} y1={0} y2={32} />
    </svg>
  );
}
