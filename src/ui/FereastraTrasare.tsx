import { useEffect, useRef, useState } from 'react';
import '../i18n/import.ts';
import { t } from '../i18n/t.ts';
import type { AlegeriTrasare, PrevizualizareImport, RaportImagine } from './actiuniImport.ts';
import { useLimba } from './useLimba.ts';

type Vedere = 'imagine' | 'vectori' | 'ambele';

type Props = {
  readonly alegeri: AlegeriTrasare;
  /** O alegere schimbată: fereastra retrasează (după o pauză de 250 ms la câmpurile cu valori). */
  readonly onSchimba: (s: Partial<AlegeriTrasare>) => void;
  /** Octeții imaginii, pentru previzualizare (browserul o decodează și aici, doar ca s-o arate). */
  readonly octeti: Uint8Array | null;
  readonly stare: PrevizualizareImport | 'citire';
  readonly seRecitesc: boolean;
};

/** Raportul trasării din previzualizare (și dintr-un refuz după trasare, ca „prea multe contururi”), sau null. */
function raportDin(stare: PrevizualizareImport | 'citire'): RaportImagine | null {
  if (stare === 'citire') return null;
  if (stare.ok) return stare.format === 'imagine' ? stare.trasare : null;
  return stare.trasare ?? null;
}

/**
 * Panoul trasării din fereastra importului (ADR 0220 §10): în stânga sursa, pragul, Inversează, Netezimea, petele și golurile,
 * lățimea (cu DPI-ul și de unde vine); în dreapta previzualizarea (imaginea estompată, vectorii peste ea, mărirea cu rotița
 * sau butoanele, mutarea prin tragere), apoi raportul: abaterea măsurată, imaginea, curățarea.
 */
export function PanouTrasare({ alegeri, onSchimba, octeti, stare, seRecitesc }: Props) {
  const limba = useLimba();
  const nr = (x: number, z: number): string => new Intl.NumberFormat(limba === 'ro' ? 'ro-RO' : 'en-GB', { maximumFractionDigits: z, minimumFractionDigits: z }).format(x);
  const raport = raportDin(stare);
  const [vedere, setVedere] = useState<Vedere>('ambele');
  const [estompare, setEstompare] = useState(45);
  // Câmpurile cu valori: ciorna lor, trimisă după 250 ms fără altă schimbare.
  const [ciorna, setCiorna] = useState(() => ({
    prag: alegeri.prag ?? 128, pete: String(alegeri.peteMm), gauri: String(alegeri.gauriMm), latime: alegeri.latimeMm === null ? '' : String(alegeri.latimeMm),
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
    const c = stare.contur, x = c.xy, gata: Path2D[] = [];
    let k = 0, viu = true;
    const pas = (): void => {
      if (!viu) return;
      const p = new Path2D();
      for (let n = 0; k + 1 < c.inceput.length && n < 8000; k++) {
        const a = c.inceput[k] ?? 0, b = c.inceput[k + 1] ?? 0;
        if (b <= a) continue;
        n += b - a;
        p.moveTo(x[6 * a] ?? 0, x[6 * a + 1] ?? 0);
        for (let v = a; v < b; v++) {
          const w = v + 1 < b ? v + 1 : a;
          if (c.tip[v] === 1) p.bezierCurveTo(x[6 * v + 2] ?? 0, x[6 * v + 3] ?? 0, x[6 * v + 4] ?? 0, x[6 * v + 5] ?? 0, x[6 * w] ?? 0, x[6 * w + 1] ?? 0);
          else p.lineTo(x[6 * w] ?? 0, x[6 * w + 1] ?? 0);
        }
        p.closePath();
      }
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
  const W = raport?.latimePx ?? bmp?.width ?? 1, H = raport?.inaltimePx ?? bmp?.height ?? 1;
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
    if (bmp && vedere !== 'vectori') {
      g.globalAlpha = vedere === 'ambele' ? 1 - estompare / 100 : 1;
      g.imageSmoothingEnabled = s < 4;
      g.drawImage(bmp, 0, 0, W, H);
      g.globalAlpha = 1;
    }
    if (cai.length > 0 && vedere !== 'imagine') {
      g.strokeStyle = getComputedStyle(c).getPropertyValue('--traseu-taiere').trim() || '#0a7d53';
      g.lineWidth = 1.5 / s;
      g.lineJoin = 'round';
      for (const p of cai) g.stroke(p);
    }
  }, [bmp, cai, vedere, estompare, s, cx, cy, marime, W, H]);
  const mareste = (f: number, px?: number, py?: number): void => {
    // Punctul de sub maus rămâne pe loc (fără maus: centrul).
    const ox = px ?? marime.w / 2, oy = py ?? marime.h / 2;
    const ix = cx + (ox - marime.w / 2) / s, iy = cy + (oy - marime.h / 2) / s;
    const k = Math.max(1, Math.min(64, vizor.k * f)), ns = incadrare * k;
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
  const tras = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);

  const aleasa = raport ? t(raport.sursa === 'alfa' ? 'import.trasare.aleasa.alfa' : 'import.trasare.aleasa.lum') : '';
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
            onSchimba({ sursa: v === 'alfa' || v === 'lum' ? v : 'auto' });
          }}>
            <option value="auto">{t('import.trasare.sursa.auto')}</option>
            <option value="alfa">{t('import.trasare.sursa.alfa')}</option>
            <option value="lum">{t('import.trasare.sursa.lum')}</option>
          </select>
        </label>
        {raport && <p className="mic" data-testid="trasare-sursa-aleasa">{aleasa}</p>}
        <div className="trasare-prag">
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
        </div>
        <label className="rand">
          <input type="checkbox" checked={alegeri.inverseaza} data-camp="trasare-inverseaza" onChange={(e) => { onSchimba({ inverseaza: e.target.checked }); }} />
          {t('import.trasare.inverseaza')}
        </label>
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
        <label>
          {t('import.trasare.latime')}
          <input type="text" inputMode="decimal" value={ciorna.latime} placeholder={raport ? nr(raport.latimeMm, 1) : ''} data-camp="trasare-latime"
            onChange={(e) => { setCiorna({ ...ciorna, latime: e.target.value }); }} />
        </label>
        {raport && (
          <p className="mic" data-testid="trasare-scara">
            {t('import.trasare.scara', {
              inaltime: nr(raport.inaltimeMm, 1), mm: nr(raport.mmPePx, 3), dpi: nr(raport.dpi, 0),
              sursa: t(raport.scara === 'fisier' ? 'import.trasare.scara.fisier' : raport.scara === 'latime' ? 'import.trasare.scara.latime' : 'import.trasare.scara.presupus'),
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
          <span className="trasare-zoom">
            <button type="button" data-buton="trasare-micsoreaza" title={t('import.trasare.micsoreaza')} onClick={() => { mareste(0.8); }}>−</button>
            <button type="button" data-buton="trasare-mareste" title={t('import.trasare.mareste')} onClick={() => { mareste(1.25); }}>+</button>
            <button type="button" data-buton="trasare-incadreaza" onClick={() => { setVizor({ k: 1, cx: null, cy: null }); }}>{t('import.trasare.incadreaza')}</button>
          </span>
        </div>
        <canvas ref={panza} className="trasare-panza" data-testid="trasare-previzualizare" aria-label={t('import.trasare.previzualizare')}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); tras.current = { x: e.clientX, y: e.clientY, cx, cy }; }}
          onPointerMove={(e) => {
            const d = tras.current;
            if (d) setVizor({ k: vizor.k, cx: d.cx - (e.clientX - d.x) / s, cy: d.cy - (e.clientY - d.y) / s });
          }}
          onPointerUp={() => { tras.current = null; }} />
        <div className="trasare-raport" data-testid="trasare-raport" aria-live="polite">
          {(stare === 'citire' || seRecitesc) && <p role="status" data-testid="trasare-trasez">{t('import.trasare.trasez')}</p>}
          {raport && (
            <>
              {stare !== 'citire' && stare.ok && <p data-testid="trasare-abatere">{t('import.trasare.abatere', { mm: nr(raport.abaterePx * raport.mmPePx, 3), px: nr(raport.abaterePx, 2) })}</p>}
              <p data-testid="trasare-imagine">
                {raport.redusDin
                  ? t('import.trasare.redusa', { latime: raport.latimePx, inaltime: raport.inaltimePx, latime0: raport.redusDin.latime, inaltime0: raport.redusDin.inaltime })
                  : t('import.trasare.imagine', { latime: raport.latimePx, inaltime: raport.inaltimePx })}
              </p>
              {(raport.pete > 0 || raport.gauri > 0) && <p data-testid="trasare-curatare">{t('import.trasare.curatare', { pete: t('import.trasare.pete-sterse', { n: raport.pete }), gauri: t('import.trasare.goluri-umplute', { n: raport.gauri }) })}</p>}
              {raport.margini === 'dure' && <p className="mic" data-testid="trasare-dure">{t('import.trasare.dure')}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
