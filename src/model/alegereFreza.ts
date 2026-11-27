/**
 * Alegerea unei freze din biblioteca „Frezele mele” pentru operațiile din proiect (ADR 0300 §4, felia 16.A↑b-2): ce freze se
 * oferă (forma lor merge pe toate operațiile alese, `motivFormaPeOperatie`), copia pe care o primește documentul (originea,
 * valorile de lucru, tăișul: documentul v27, ADR 0300 §5) și numărul T, după regula rolurilor personalizate (ADR 0114 §5):
 * al bibliotecii cât e liber, altfel al unei freze identice (aceeași turație), altfel cel mai mic liber.
 *
 * Alegerea schimbă freza principală a operațiilor și pașii lor (pasul pe trecere; la buzunar și pe relief, pasul lateral din
 * procentul frezei); adâncimea, frezele de rest, fundul plat, dopurile și restul rămân. Pur: secțiunea Tăierea dă rezultatul acțiunii
 * `document.aplica-operatii`, într-un pas de anulare.
 */
import type { Document, Operatie, Scula } from './document.ts';
import { areCam, sculaDinFreza, type Freza, type FrezaSalvata } from './freza.ts';
import { formaPeRand, motivFormaPeOperatie, type RestulOperatiei } from './formaFrezei.ts';
import { numarPrintre, sculeProiect } from './rol.ts';

/** Copia frezei din bibliotecă, cu numărul dat: forma, originea (id, versiunea), valorile de lucru și tăișul, dacă îl are. */
export function sculaDinBiblioteca(f: FrezaSalvata, numar: number): Scula {
  return {
    ...sculaDinFreza(f, numar),
    biblioteca: { id: f.id, rev: f.rev },
    regim: { turatie: f.turatie, avans: f.avans, plonjare: f.plonjare },
    ...(f.tais !== undefined && Number.isFinite(f.tais) ? { tais: f.tais } : {}),
  };
}

/**
 * Frezele care pot sta pe un rând al ferestrei exportului (ADR 0312 §7): cele cu CAM, a căror formă o poartă copia rândului
 * (`formaPeRand`: plata și V-ul) și o primește măcar un fel de rând (profilul, buzunarul, găurirea, V-carve-ul). Bila (a
 * finisării reliefului, cu rândul doar de citit, și a canelurii din 16.A↑e-3) rămâne afară, ca nota bibliotecii și
 * recunoașterea să n-o vadă: copia ferestrei, care știe doar forma în V, ar face din ea o plată.
 */
export function frezePeRanduri<F extends FrezaSalvata>(lista: readonly F[]): F[] {
  const randuri: ReadonlyArray<Pick<Operatie, 'tip' | 'latura'>> = [
    { tip: 'profil', latura: 'pe-linie' }, { tip: 'profil', latura: 'exterior' }, { tip: 'buzunar', latura: 'interior' },
    { tip: 'gaurire', latura: 'interior' }, { tip: 'vcarve', latura: 'interior' },
  ];
  return lista.filter((f) => {
    // Întâi felul: o freză fără CAM n-are copie pentru document (`sculaDinFreza` aruncă).
    if (!areCam(f.fel)) return false;
    const forma = sculaDinFreza(f).forma;
    return formaPeRand(forma) && randuri.some((o) => motivFormaPeOperatie(o.tip, o.latura, forma) === null);
  });
}

/**
 * Frezele care merg pe toate operațiile date (felul și latura fiecăreia; frezele de rest și incrustația, unde se știu: o freză
 * rotundă nu merge pe un buzunar cu ele), în ordinea listei; nimic fără operații.
 */
export function frezePotrivite<F extends Freza>(lista: readonly F[], operatii: ReadonlyArray<Pick<Operatie, 'tip' | 'latura'> & RestulOperatiei>): F[] {
  if (operatii.length === 0) return [];
  return lista.filter((f) => {
    // Felurile fără CAM încă (ADR 0302 §2) nu se oferă: n-au copie pentru document.
    if (!areCam(f.fel)) return false;
    const forma = sculaDinFreza(f).forma;
    // O operație cu rând editabil în fereastra exportului primește doar o freză pe care rândul o poartă (`formaPeRand`):
    // altfel operația n-ar avea rând (bila pe canelură, până la 16.A↑e-4). Relieful își are rândul lui, doar de citit.
    const cuRand = (o: Pick<Operatie, 'tip'>): boolean => o.tip !== 'finisare' && o.tip !== 'degrosare';
    return operatii.every((o) => motivFormaPeOperatie(o.tip, o.latura, forma, o) === null && (!cuRand(o) || formaPeRand(forma)));
  });
}

/** Freza din bibliotecă a operațiilor (id-ul originii), dacă toate au freza principală copiată din aceeași; altfel null. */
export function frezaBibliotecii(operatii: ReadonlyArray<Pick<Operatie, 'scula'>>): string | null {
  const id = operatii[0]?.scula.biblioteca?.id;
  return id !== undefined && operatii.every((o) => o.scula.biblioteca?.id === id) ? id : null;
}

/**
 * Numărul T al frezei `s` pusă pe operațiile pieselor date: frezele principale ale acestor operații pleacă, deci nu se numără;
 * restul frezelor proiectului (și frezele de rest, fundul plat, dopurile pieselor alese) rămân.
 */
export function numarPentruAlegere(doc: Document, piese: readonly string[], s: Scula): number {
  const alese = new Set(piese);
  return numarPrintre(sculeProiect(doc, new Set(), (p) => alese.has(p.id)), s);
}

/** Pasul lateral al buzunarului: procentul frezei din diametru, în jos la 0,001 mm (deci cel mult raza, la cel mult 50 %). */
export function pasLateralDin(f: Freza): number {
  const x = (f.pasLateral * f.diametru) / 100;
  const jos = Math.floor(x * 1000) / 1000;
  return jos > 0 ? jos : x;
}

/**
 * Operațiile cu pas lateral, care îl primesc de la freza aleasă: buzunarul și, din felia 18.1↑d-5 (ADR 0316), finisarea și
 * degroșarea reliefului (o bilă de finisare își are pasul ei mic, ca la rândul din fereastra exportului).
 */
const cuPasLateral = (o: Pick<Operatie, 'tip'>): boolean => o.tip === 'buzunar' || o.tip === 'finisare' || o.tip === 'degrosare';

/**
 * Operațiile pieselor date cu freza aleasă, pe piesă; null dacă nu e nicio piesă de-a documentului sau dacă freza nu merge pe
 * una dintre operațiile lor.
 */
export function operatiiCuFreza(doc: Document, piese: readonly string[], f: FrezaSalvata): ReadonlyMap<string, Operatie[]> | null {
  const gasite = doc.piese.filter((p) => piese.includes(p.id));
  const operatii = gasite.flatMap((p) => p.operatii);
  if (operatii.length === 0 || frezePotrivite([f], operatii).length === 0) return null;
  const scula = sculaDinBiblioteca(f, numarPentruAlegere(doc, gasite.map((p) => p.id), sculaDinBiblioteca(f, f.numar)));
  return new Map(gasite.map((p) => [p.id, p.operatii.map((o): Operatie => ({
    ...structuredClone(o), scula: structuredClone(scula), pas: f.pas, ...(cuPasLateral(o) ? { pasLateral: pasLateralDin(f) } : {}),
  }))]));
}
