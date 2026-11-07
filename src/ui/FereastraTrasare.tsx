import { useEffect, useRef, useState } from 'react';
import '../i18n/import.ts';
import { t } from '../i18n/t.ts';
import type { Posterizare } from '../jobs/calculTrasare.ts';
import type { CuloarePaleta } from '../trasare/culori.ts';
import { primele } from '../trasare/legaturi.ts';
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

/** Contururile unor căi trasate (pixelii imaginii), ca o singură cale de desenat. */
function caleDin(c: { readonly inceput: Uint32Array; readonly tip: Uint8Array; readonly xy: Float64Array }): Path2D {
  const p = new Path2D(), x = c.xy;
  for (let k = 0; k + 1 < c.inceput.length; k++) {
    const a = c.inceput[k] ?? 0, b = c.inceput[k + 1] ?? 0;
    if (b <= a) continue;
    p.moveTo(x[6 * a] ?? 0, x[6 * a + 1] ?? 0);
    for (let v = a; v < b; v++) {
      const w = v + 1 < b ? v + 1 : a;
      if (c.tip[v] === 1) p.bezierCurveTo(x[6 * v + 2] ?? 0, x[6 * v + 3] ?? 0, x[6 * v + 4] ?? 0, x[6 * v + 5] ?? 0, x[6 * w] ?? 0, x[6 * w + 1] ?? 0);
      else p.lineTo(x[6 * w] ?? 0, x[6 * w + 1] ?? 0);
    }
    p.closePath();
  }
  return p;
}

/**
 * Panoul trasării din fereastra importului (ADR 0220 §10): în stânga sursa, pragul, Inversează, Netezimea, petele și golurile,
 * lățimea (cu DPI-ul și de unde vine); în dreapta previzualizarea (imaginea estompată, vectorii peste ea, mărirea cu rotița
 * sau butoanele, mutarea prin tragere), apoi raportul: abaterea măsurată, imaginea, curățarea. Pe culori (ADR 0221), în locul
 * pragului și al lui Inversează, culorile (`PanouCulori`), iar imaginea previzualizării e cea pictată în culorile ei.
 */
export function PanouTrasare({ alegeri, onSchimba, octeti, stare, seRecitesc }: Props) {
  const limba = useLimba();
  const nr = (x: number, z: number): string => new Intl.NumberFormat(limba === 'ro' ? 'ro-RO' : 'en-GB', { maximumFractionDigits: z, minimumFractionDigits: z }).format(x);
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
    const fundal = pictata ?? bmp;
    if (fundal && vedere !== 'vectori') {
      g.globalAlpha = vedere === 'ambele' ? 1 - estompare / 100 : 1;
      g.imageSmoothingEnabled = !pictata && s < 4;
      g.drawImage(fundal, 0, 0, W, H);
      g.globalAlpha = 1;
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
  }, [bmp, pictata, cai, vedere, estompare, s, cx, cy, marime, W, H, evidentiata, culori]);
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
