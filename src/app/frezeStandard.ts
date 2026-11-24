/**
 * Frezele standard ale bibliotecii (ADR 0300 §3, precizarea owner-ului din 24.11: „biblioteca de freze trebuie să fie
 * populată cu freze default standard”): setul `FREZE_PORNIRE`, cu id-urile fixe (`ID_PORNIRE`) și cu numele propuse în
 * limba de acum. Biblioteca fără cont le primește singură, o dată, la prima citire (din fereastră sau din panou); cea a
 * contului, la prima sincronizare a unui cont fără freze (`frezeSincronizare.ts`).
 *
 * Numele vin din mesajele ferestrei (`mesaje/freze.json`), aduse la cerere: panoul le cere doar când pune setul.
 */
import { cereMesaje } from '../i18n/laCerere.ts';
import { limba, t } from '../i18n/t.ts';
import { FREZE_PORNIRE, ID_PORNIRE, type Freza, type FrezaStandard } from '../model/freza.ts';
import { textNumar } from '../ui/numar.ts';
import { CHEIE_LOCALA, frezeMele } from './frezeMele.ts';

/** Numele propus din fel și diametru (ADR 0300 §2), în limba de acum; „?” unde valoarea încă nu e un număr. */
export function numePropus(f: Pick<Freza, 'fel' | 'diametru' | 'unghi' | 'varf' | 'raza'>, ro: boolean): string {
  const n = (x: number | undefined): string => (x !== undefined && Number.isFinite(x) ? textNumar(x, ro) : '?');
  switch (f.fel) {
    case 'plata': return t('freze.propus.plata', { d: n(f.diametru) });
    case 'v': return t('freze.propus.v', { u: n(f.unghi), d: n(f.diametru) });
    case 'gravare': return t('freze.propus.gravare', { u: n(f.unghi), varf: n(f.varf), d: n(f.diametru) });
    case 'bila': return t('freze.propus.bila', { d: n(f.diametru) });
    case 'toroidala': return t('freze.propus.toroidala', { d: n(f.diametru), r: n(f.raza) });
    case 'conica': return t('freze.propus.conica', { u: n(f.unghi), r: n(f.raza), d: n(f.diametru) });
    case 'burghiu': return t('freze.propus.burghiu', { d: n(f.diametru) });
  }
}

/** Frezele standard, cu id-urile lor fixe și numele în limba dată. */
export function frezeleStandard(ro: boolean): FrezaStandard[] {
  return FREZE_PORNIRE.map((f, k) => ({ ...f, id: ID_PORNIRE[k]!, nume: numePropus(f, ro) }));
}

/**
 * Biblioteca fără cont, cu frezele standard puse o dată (prima ei citire în acest browser): o bibliotecă cu freze sau care
 * le-a primit deja nu se schimbă. Nicio eroare nu iese de aici: fără mesaje (fără rețea, înainte de precache), setul vine la
 * citirea următoare.
 */
export async function cuFrezeleStandard(): Promise<void> {
  try {
    const b = frezeMele(CHEIE_LOCALA);
    if (!b.stare().incarcata) await b.incarca();
    if (b.stare().standard) return;
    // Mesajele ferestrei (numele propuse), cerute doar acum: panoul nu le aduce altfel.
    await cereMesaje('freze');
    await b.puneStandard(frezeleStandard(limba() === 'ro'), true);
  } catch {
    // Se încearcă din nou la următoarea deschidere.
  }
}
