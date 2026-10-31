/**
 * Sugestia din editor (ADR 0111): poza planșei (`pozaPlansei`, ca la testul pas cu pas), micșorată sub plafonul serverului
 * și lăsată în browser (`pozaSugestiei.ts`), de unde fila Sugestii din `/admin` (deschisă de editor chiar în clic) o ia în
 * formularul sugestiei noi. Bucata e doar online, ca testul: butonul stă doar în afara instanței live, iar sugestia cere
 * oricum rețea.
 */
import { POZA_MAX_OCTETI } from '../../shared/sugestii.ts';
import { pozaPlansei } from './pozaPlansei.ts';
import { lasaPoza } from './pozaSugestiei.ts';

/** Încercările, pe rând: lățimea cea mai mare și calitatea JPEG, până când poza încape sub plafon. */
const INCERCARI = [[1600, 0.85], [1600, 0.7], [1280, 0.7], [1024, 0.6], [800, 0.55]] as const;

/** Poza planșei (PNG, în pixelii ecranului) ca JPEG sub plafon; aruncă dacă nici cea mai mică încercare nu încape. */
export async function micsoreaza(png: Blob, plafon: number = POZA_MAX_OCTETI): Promise<Blob> {
  const im = await createImageBitmap(png);
  try {
    for (const [latime, calitate] of INCERCARI) {
      const k = Math.min(1, latime / im.width);
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(im.width * k));
      c.height = Math.max(1, Math.round(im.height * k));
      const g = c.getContext('2d');
      if (!g) throw new Error('browserul nu desenează în 2D');
      // JPEG n-are transparență: sub planșă, alb.
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, c.width, c.height);
      g.drawImage(im, 0, 0, c.width, c.height);
      const b = await new Promise<Blob | null>((ok) => { c.toBlob(ok, 'image/jpeg', calitate); });
      if (b && b.size <= plafon) return b;
    }
  } finally {
    im.close();
  }
  throw new Error('poza planșei iese prea mare, chiar micșorată');
}

/** Poza planșei, micșorată și lăsată pentru fila Sugestii (care o primește și dacă e deja deschisă). */
export async function lasaPozaPlansei(): Promise<void> {
  await lasaPoza(await micsoreaza(await pozaPlansei()));
}
