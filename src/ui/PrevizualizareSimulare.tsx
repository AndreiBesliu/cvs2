import { useEffect, useRef } from 'react';
import '../i18n/simulare.ts';
import { t } from '../i18n/t.ts';
import type { SimulareExport } from './actiuniExportTipuri.ts';

/**
 * Simularea în dialogul exportului (ADR 0047 §5), până la afișarea pe WebGL2: harta adâncimilor pe toată foaia, în tonuri
 * de gri (alb = fața, mai închis = mai adânc, până la cea mai adâncă tăietură; negru = la fața de jos sau sub ea), văzută
 * de sus, cu Y în sus ca pe pânză,
 * plus volumul scos, cea mai adâncă tăietură și grila. Pixelii vin gata calculați din nucleu (cel mai jos Z pe bloc).
 */
type Props = { readonly s: SimulareExport; readonly limba: string };

/**
 * Nivelul de gri al unei celule: 235 la față, 60 la cea mai adâncă tăietură care nu trece prin foaie (`scala`, ca o
 * gravură de 1 mm într-o foaie de 18 să se vadă), 0 la fața de jos a foii sau sub ea.
 */
function gri(z: number, scala: number, grosime: number): number {
  if (!(z < 0)) return 235;
  if (-z >= grosime) return 0;
  return Math.round(235 - 175 * Math.min(1, -z / scala));
}

/** Adâncimea care primește gri-ul cel mai închis: cea mai adâncă tăietură, cel mult grosimea foii. */
const scalaGri = (adancimeMax: number, grosime: number): number => Math.max(1e-6, Math.min(adancimeMax, grosime));

export function PrevizualizareSimulare({ s, limba }: Props) {
  const panza = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = panza.current;
    if (!c || !s.ok) return;
    const { latime: W, inaltime: H, z } = s.previzualizare;
    const scala = scalaGri(s.adancimeMax, s.grosime);
    const g = c.getContext('2d');
    if (!g) return;
    const img = g.createImageData(W, H);
    for (let py = 0; py < H; py++) {
      // Rândul 0 al previzualizării e marginea de jos a foii; al imaginii, marginea de sus.
      const rand = (H - 1 - py) * W;
      for (let px = 0; px < W; px++) {
        const v = gri(z[rand + px]!, scala, s.grosime), k = 4 * (py * W + px);
        img.data[k] = v;
        img.data[k + 1] = v;
        img.data[k + 2] = v;
        img.data[k + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  }, [s]);

  if (!s.ok) {
    return <p role="status" className="avertisment" data-testid="export-simulare">{t('simulare.eroare', { motiv: s.motiv })}</p>;
  }
  const f = (zecimale: number) => new Intl.NumberFormat(limba === 'ro' ? 'ro-RO' : 'en-GB', { minimumFractionDigits: zecimale, maximumFractionDigits: zecimale });
  const nr = new Intl.NumberFormat(limba === 'ro' ? 'ro-RO' : 'en-GB', { maximumFractionDigits: 0 });
  return (
    <section
      className="simulare" data-testid="export-simulare" aria-labelledby="simulare-titlu"
      data-amprenta={s.amprenta} data-fire={s.fire} data-volum={s.volum} data-adancime={s.adancimeMax}
    >
      <h3 id="simulare-titlu">{t('simulare.titlu')}</h3>
      <canvas
        ref={panza} width={s.previzualizare.latime} height={s.previzualizare.inaltime}
        role="img" aria-label={t('simulare.harta')} data-simulare="harta"
      />
      <p className="nota" data-simulare="legenda">{t('simulare.legenda', { adancime: f(2).format(scalaGri(s.adancimeMax, s.grosime)) })}</p>
      <p data-simulare="volum"><strong>{t('simulare.volum', { cm3: f(1).format(s.volum / 1000) })}</strong></p>
      <p data-simulare="adancime">{t('simulare.adancime', { mm: f(2).format(s.adancimeMax) })}</p>
      {s.prinFoaie && <p className="nota" data-simulare="prin-foaie">{t('simulare.prin-foaie', { grosime: f(1).format(s.grosime) })}</p>}
      <p className="nota" data-simulare="grila">
        {t('simulare.grila', { n: s.fire, celula: f(2).format(s.celula), nx: nr.format(s.celule[0]), ny: nr.format(s.celule[1]), ms: nr.format(s.ms) })}
      </p>
      <p className="nota" data-simulare="amprenta">{t('simulare.amprenta', { amprenta: s.amprenta })}</p>
    </section>
  );
}
