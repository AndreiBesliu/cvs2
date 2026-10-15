/**
 * Cazurile tăieturilor pe o parte în poartă (ADR 0037 §3, §5, §6, §7, §10, §13; felia 2.3c-5, sesiune independentă,
 * scrise doar din ADR), cu ZERO importuri din `src/`: documente v10 scrise de mână și programe scrise de mână (linie cu
 * linie, ca valorile de pe hârtie, sau din traseele socotite pe hârtie, prin scriitorul din `regiune.cazuri.ts`).
 *
 * Freza Ø6 (R = 3), pasul 3, Z sigur 5, F1000, plonjarea la F300, originea stânga-jos, Z0 sus, foaia 300 × 200 × 6
 * (contextul `ctxD` din `deschise.cazuri.ts`). Valorile de pe hârtie din ADR 0037, „Ce verifică oracolul”, mutate pe
 * foaie cu instanța (aceleași cote relative):
 * - 1, linia (10,50)→(110,50): stânga + urcare G0 X10 Y53 · G1 Z-3 · G1 X110 Y53; stânga + opoziție la Y53 de la X110 la
 *   X10; dreapta + urcare G0 X110 Y47 · G1 Z-3 · G1 X10 Y47; dreapta + opoziție la Y47 de la X10 la X110;
 * - 3, semicercul R50 (50,0)→(−50,0) cu bulge 1, pus în (100, 30): stânga + urcare G0 X147 Y30 · G3 X53 Y30 I-47 J0;
 *   dreapta + urcare G0 X47 Y30 · G2 X153 Y30 I53 J0;
 * - 4, L-ul (0,0)→(100,0)→(100,100), pus în (20, 10): dreapta + opoziție (20,7)→(120,7) · G3 X123 Y10 I0 J3 · →(123,110);
 *   stânga (+ urcare) (20,13)→(117,13)→(117,110);
 * - 9, oglindirea: matricea (a = −1, e = 150, f = 50), linia (0,0)→(100,0), stânga + urcare: G0 X50 Y53 · G1 Z-3 ·
 *   G1 X150 Y53;
 * - 10, 11, 12: regiunea (documente + programe), cu verdictele cerute;
 * - în plus (pozitive): 5, cârligul (o bucată până la x = 42,172); 6, U-ul de 5 mm pe dreapta (colțurile convexe ca arce
 *   R3); 7, V-ul de 10° cu scula înăuntru (centrul se oprește la R / sin 5° = 34,421 de vârf); „G”-ul, o cale cu două
 *   bucăți, dintre care una se închide pe ea însăși (precizarea 2.3c-4), la o trecere și la două.
 * Martorii negativi (poarta trebuie să iasă roșie pe fiecare) sunt în `martoriParte`, fiecare cu invarianta, linia și
 * mesajul care trebuie să-l prindă.
 */
import type { SensO } from './document.ts';
import type { DocV10O } from './document.v10.ts';
import { programDinTrasee, type Traseu } from './regiune.cazuri.ts';
import { arc, segment, pt, type Primitiva, type Pt } from './regiune.ts';
import {
  buclaProfil, ctxD, deschisa, docV10, inchisa, liniaLui, MONTAJ_D, programLinii, vA, vC, vL, type ElemD, type PiesaD,
} from './deschise.cazuri.ts';
import type { ContextPoarta } from './poarta.ts';

export { ctxD, liniaLui, programLinii };

const S5 = Math.sin((5 * Math.PI) / 180), C5 = Math.cos((5 * Math.PI) / 180);

// ---------------------------------------------------------------------------------------------------------------
// Documentele.

/** Un document cu un singur element pe o parte (`latura`, `sens`), în piesa `id` pusă în (x, y). */
const unu = (id: string, x: number, y: number, e: ElemD): DocV10O => docV10([{ id, x, y, elemente: [e] }]);

export const V1 = (latura: 'stanga' | 'dreapta', sens: SensO = 'urcare', adancime = 3, o: Partial<ElemD> = {}): DocV10O =>
  unu('a', 0, 0, { id: 'l', forma: deschisa([vL(10, 50), vL(110, 50)]), latura, adancime, sens, ...o });
export const V3 = (latura: 'stanga' | 'dreapta', sens: SensO = 'urcare'): DocV10O =>
  unu('c', 100, 30, { id: 's', forma: deschisa([vA(50, 0, 1), vL(-50, 0)]), latura, adancime: 3, sens });
/**
 * 3 sub oglindire: același semicerc cu matricea elementului (a = −1), pus în (100, 30). În lume merge orar, de la (50, 30)
 * la (150, 30), pe sus; stânga XOR (det < 0) = dreapta în lume, adică tot înăuntru (R47): peretele rămâne pe formă.
 */
export const V3o = (): DocV10O =>
  unu('c', 100, 30, { id: 's', forma: deschisa([vA(50, 0, 1), vL(-50, 0)]), matrice: { a: -1, b: 0, c: 0, d: 1, e: 0, f: 0 }, latura: 'stanga', adancime: 3, sens: 'urcare' });
/** O cubică deschisă blândă (raza de curbură ≥ ~50 mm, o inflexiune), pe stânga, în origine. */
export const CUBICA = { p0: pt(10, 40), c1: pt(50, 70), c2: pt(90, 10), p3: pt(130, 40) } as const;
export const VC = (): DocV10O =>
  unu('w', 0, 0, { id: 'c', forma: deschisa([vC(CUBICA.p0.x, CUBICA.p0.y, CUBICA.c1.x, CUBICA.c1.y, CUBICA.c2.x, CUBICA.c2.y), vL(CUBICA.p3.x, CUBICA.p3.y)]), latura: 'stanga', adancime: 3 });
/**
 * Precizarea 2.3c-4 („picioarele la egalitate”): un zig-zag dens, cu pasul 0,5 (văile la 1 mm, dinții de 5 mm), de la
 * (0,0) la (20,0), pus în (50, 100), tăiat pe dreapta (dedesubt). Offsetul ideal valid e înfășurătoarea cercurilor R3 din
 * jurul văilor interioare; bucata pornește în intersecția cercului din jurul startului căii cu cercul din jurul primei
 * văi, (0,5; −2,958), unde piciorul e „la egalitate” între capătul căii (judecat singur, punctul e în capac) și vârf.
 */
export const VZ = (): DocV10O => {
  const vs = Array.from({ length: 41 }, (_, k) => vL(k * 0.5, k % 2 ? 5 : 0));
  return unu('z', 50, 100, { id: 'z', forma: deschisa(vs), latura: 'dreapta', adancime: 3, sens: 'opozitie' });
};
export const V4 = (latura: 'stanga' | 'dreapta', sens: SensO): DocV10O =>
  unu('e', 20, 10, { id: 'l', forma: deschisa([vL(0, 0), vL(100, 0), vL(100, 100)]), latura, adancime: 3, sens });
export const V9 = (): DocV10O =>
  unu('m', 0, 0, { id: 'l', forma: deschisa([vL(0, 0), vL(100, 0)]), matrice: { a: -1, b: 0, c: 0, d: 1, e: 150, f: 50 }, latura: 'stanga', adancime: 3, sens: 'urcare' });
/** 5, cârligul (0,0)→(50,0)→(50,2)→(45,2), pe stânga, pus în (50, 50). */
export const V5 = (): DocV10O => unu('h', 50, 50, { id: 'c', forma: deschisa([vL(0, 0), vL(50, 0), vL(50, 2), vL(45, 2)]), latura: 'stanga', adancime: 3 });
/** 6, U-ul de 5 mm (0,50)→(0,0)→(5,0)→(5,50), pus în (50, 50). */
export const V6 = (latura: 'stanga' | 'dreapta'): DocV10O =>
  unu('u', 50, 50, { id: 'u', forma: deschisa([vL(0, 50), vL(0, 0), vL(5, 0), vL(5, 50)]), latura, adancime: 3 });
/** 7, V-ul de 10° (vârful în origine, laturile de 100 mm la ±5° de verticală), cu scula înăuntru (stânga), pus în (150, 50). */
export const V7 = (): DocV10O =>
  unu('v', 150, 50, { id: 'v', forma: deschisa([vL(-100 * S5, 100 * C5), vL(0, 0), vL(100 * S5, 100 * C5)]), latura: 'stanga', adancime: 3 });
/**
 * „G”-ul: (0,0)→(100,0)→(100,20)→(50,20)→(50,2), pe stânga, pus în (50, 50). Offsetul ideal are două bucăți: A pe prima
 * latură, de la (0,3) la (47,3) (apoi peretele x = 50 e mai aproape de R); B, camera, de la (53,3) la (97,3), (97,17),
 * (53,17) și înapoi în (53,3): bucata care se închide pe ea însăși (precizarea 2.3c-4).
 */
export const VG = (adancime = 3): DocV10O =>
  unu('g', 50, 50, { id: 'g', forma: deschisa([vL(0, 0), vL(100, 0), vL(100, 20), vL(50, 20), vL(50, 2)]), latura: 'stanga', adancime });

/**
 * Canelura cât freza (§5: „la lățimea exact 2R, un traseu dus-întors pe aceeași linie se acceptă”): (−20,50)→(0,50)→(0,0)
 * →(6,0)→(6,50)→(26,50), pe stânga (scula intră în fanta de 6 mm), pusă în (100, 50).
 */
export const VN = (): DocV10O =>
  unu('n', 100, 50, { id: 'n', forma: deschisa([vL(-20, 50), vL(0, 50), vL(0, 0), vL(6, 0), vL(6, 50), vL(26, 50)]), latura: 'stanga', adancime: 3 });

/** Piesa P a valorilor 10 și 11: dreptunghiul 60 × 40 pus în (40, 40), exterior, 3 mm (urcare). */
const PIESA_P: PiesaD = { id: 'p', x: 40, y: 40, elemente: [{ id: 'r', forma: { tip: 'dreptunghi', latime: 60, inaltime: 40, razaColt: 0 }, latura: 'exterior', adancime: 3 }] };
/** 10: o linie paralelă cu latura de sus a piesei (y = 80), la `la` mm de ea, de la x = 30 la x = 110. */
export const V10 = (latura: 'stanga' | 'dreapta', la = 5): DocV10O =>
  docV10([{ id: 'k', x: 0, y: 0, elemente: [{ id: 'l', forma: deschisa([vL(30, 80 + la), vL(110, 80 + la)]), latura, adancime: 3 }] }, PIESA_P]);
/** 11: o linie perpendiculară pe latura de sus, de la (70, 140) în jos, oprită la 1 mm de piesă (y = 81), pe stânga. */
export const V11 = (): DocV10O =>
  docV10([{ id: 'k', x: 0, y: 0, elemente: [{ id: 'l', forma: deschisa([vL(70, 140), vL(70, 81)]), latura: 'stanga', adancime: 3 }] }, PIESA_P]);
/** 12: două linii separate, A și B, fiecare în piesa ei (instanța în origine). */
export const V12 = (fel: 'X' | 'convex' | 'concav'): DocV10O => {
  const l = (id: string, a: Pt, b: Pt, latura: 'stanga' | 'dreapta'): PiesaD => ({ id, x: 0, y: 0, elemente: [{ id: 'l', forma: deschisa([vL(a.x, a.y), vL(b.x, b.y)]), latura, adancime: 3 }] });
  if (fel === 'X') return docV10([l('A', pt(40, 40), pt(100, 100), 'stanga'), l('B', pt(40, 100), pt(100, 40), 'stanga')]);
  const latura = fel === 'convex' ? 'dreapta' : 'stanga';
  return docV10([l('A', pt(40, 40), pt(100, 40), latura), l('B', pt(100, 40), pt(100, 100), latura)]);
};

// ---------------------------------------------------------------------------------------------------------------
// Programele: o etichetă, apoi trecerile, fiecare pe toate bucățile, în ordine (§7), cu ridicare după fiecare bucată.

export type TaieturaParte = {
  readonly idLume: string; readonly latura: string; readonly adancime: number; readonly bucati: ReadonlyArray<readonly Primitiva[]>;
  readonly tip?: string; readonly treceri?: readonly number[];
};

/** Programul cu tăieturile date, în ordinea dată (antetul secțiunii). */
export function programParte(taieturi: readonly TaieturaParte[], extra: readonly string[] = []): string {
  const trasee: Traseu[] = [];
  for (const t of taieturi) {
    let prima = true;
    for (const d of t.treceri ?? [t.adancime]) {
      for (const b of t.bucati) {
        trasee.push({ eticheta: prima ? `${t.idLume}: ${t.tip ?? 'cale'}, ${t.latura}, ${t.adancime} mm` : null, primitive: b, adancime: d, treceri: [d] });
        prima = false;
      }
    }
  }
  return programDinTrasee(trasee, MONTAJ_D, extra);
}

const sg = (a: Pt, b: Pt): Primitiva => segment(a, b);
const lant = (...ps: Pt[]): Primitiva[] => ps.slice(1).map((p, k) => sg(ps[k]!, p));

/** Exteriorul piesei P (bucla de urcare, ca în `deschise.cazuri.ts`). */
const exteriorP = (doc: DocV10O): TaieturaParte => ({ idLume: 'p/r', tip: 'dreptunghi', latura: 'exterior', adancime: 3, bucati: [buclaProfil(doc, 'p/r', 'exterior')] });

/** Traseele de pe hârtie (antetul), ca bucăți, pe document. */
export const TRASEE = {
  v1: { stangaUrcare: [sg(pt(10, 53), pt(110, 53))], stangaOpozitie: [sg(pt(110, 53), pt(10, 53))], dreaptaUrcare: [sg(pt(110, 47), pt(10, 47))], dreaptaOpozitie: [sg(pt(10, 47), pt(110, 47))] },
  v4: {
    dreaptaOpozitie: [sg(pt(20, 7), pt(120, 7)), arc(pt(120, 10), 3, -Math.PI / 2, Math.PI / 2), sg(pt(123, 10), pt(123, 110))],
    stangaUrcare: lant(pt(20, 13), pt(117, 13), pt(117, 110)),
  },
  v9: [sg(pt(50, 53), pt(150, 53))],
  /** Cârligul: o bucată, (0,3)→(50 − 2√2 − 5 + … = 42,172; 3), în lume +(50, 50). */
  v5: [sg(pt(50, 53), pt(50 + 45 - Math.sqrt(8), 53))],
  /** U-ul pe dreapta, urcare (invers): x = 8 în jos, arcul R3 în jurul lui (5,0), y = −3, arcul în jurul lui (0,0), x = −3 în sus. */
  v6: [
    sg(pt(58, 100), pt(58, 50)), arc(pt(55, 50), 3, 0, -Math.PI / 2), sg(pt(55, 47), pt(50, 47)), arc(pt(50, 50), 3, -Math.PI / 2, -Math.PI / 2),
    sg(pt(47, 50), pt(47, 100)),
  ],
  /** V-ul: în jos pe offsetul laturii stângi până în (0, R / sin 5°), apoi în sus pe al celei drepte (în lume +(150, 50)). */
  v7: ((): Primitiva[] => {
    const n = pt(C5, S5); // normala spre sculă a laturii stângi (mersul în jos, spre dreapta)
    const A = pt(150 - 100 * S5 + 3 * n.x, 50 + 100 * C5 + 3 * n.y);
    const V = pt(150, 50 + 3 / S5);
    const B = pt(150 + 100 * S5 - 3 * C5, 50 + 100 * C5 + 3 * S5);
    return lant(A, V, B);
  })(),
  /** „G”-ul: A și B (camera), în lume +(50, 50). */
  vg: { A: [sg(pt(50, 53), pt(97, 53))], B: lant(pt(103, 53), pt(147, 53), pt(147, 67), pt(103, 67), pt(103, 53)) },
  /**
   * Cubica, pe stânga: offsetul EXACT al cubicei (punctul curbei plus R pe normala din derivata analitică), eșantionat în
   * 1000 de pași (~0,13 mm; săgeata coardei pe offset < 1e-4): o construcție independentă de polilinia oracolului.
   */
  vc: ((): Primitiva[] => {
    const { p0, c1, c2, p3 } = CUBICA;
    const B = (t: number): Pt => {
      const u = 1 - t;
      return pt(u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p3.x, u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p3.y);
    };
    const D = (t: number): Pt => {
      const u = 1 - t;
      return pt(3 * u * u * (c1.x - p0.x) + 6 * u * t * (c2.x - c1.x) + 3 * t * t * (p3.x - c2.x), 3 * u * u * (c1.y - p0.y) + 6 * u * t * (c2.y - c1.y) + 3 * t * t * (p3.y - c2.y));
    };
    const ps = Array.from({ length: 1001 }, (_, k) => {
      const t = k / 1000, b = B(t), d = D(t), L = Math.hypot(d.x, d.y);
      return pt(b.x - (3 * d.y) / L, b.y + (3 * d.x) / L);
    });
    return lant(...ps);
  })(),
  /** Canelura: (−20,53)→(0,53), arcul R3 în jurul lui (0,50), în jos pe x = 3 până în (3,3), înapoi în sus, arcul în jurul lui (6,50), (6,53)→(26,53). */
  vn: ((): Primitiva[] => {
    const o = (x: number, y: number): Pt => pt(100 + x, 50 + y);
    return [
      sg(o(-20, 53), o(0, 53)), arc(o(0, 50), 3, Math.PI / 2, -Math.PI / 2), sg(o(3, 50), o(3, 3)), sg(o(3, 3), o(3, 50)),
      arc(o(6, 50), 3, Math.PI, -Math.PI / 2), sg(o(6, 53), o(26, 53)),
    ];
  })(),
  /** Zig-zag-ul dens, pe dreapta (ca desenul, opoziție): arcele R3 din jurul văilor interioare, între intersecții. */
  vz: ((): Primitiva[] => {
    const h = Math.sqrt(9 - 0.25);
    return Array.from({ length: 19 }, (_, k) => {
      const c = pt(50 + k + 1, 100);
      const a0 = Math.atan2(-h, -0.5), a1 = Math.atan2(-h, 0.5);
      return arc(c, 3, a0, a1 - a0);
    });
  })(),
} as const;

/** Programele corecte (care trebuie să TREACĂ poarta), cu documentul lor. */
export type CazParte = { readonly nume: string; readonly doc: DocV10O; readonly text: string };

/** Programul unei tăieturi pe o parte, scris linie cu linie (corpul după etichetă), pentru valorile de pe hârtie. */
const peHartie = (eticheta: string, corp: readonly string[]): string => programLinii([eticheta, ...corp, 'G0 Z5.000']);

export function corecteParte(): CazParte[] {
  const rez: CazParte[] = [];
  // 1: linia, cele patru combinații, exact ca pe hârtie.
  rez.push({ nume: '1 linia, stânga + urcare', doc: V1('stanga', 'urcare'), text: peHartie('(a/l: cale, stanga, 3 mm)', ['G0 X10.000 Y53.000', 'G1 Z-3.000 F300.0', 'G1 X110.000 Y53.000 F1000.0']) });
  rez.push({ nume: '1 linia, stânga + opoziție', doc: V1('stanga', 'opozitie'), text: peHartie('(a/l: cale, stanga, 3 mm)', ['G0 X110.000 Y53.000', 'G1 Z-3.000 F300.0', 'G1 X10.000 Y53.000 F1000.0']) });
  rez.push({ nume: '1 linia, dreapta + urcare', doc: V1('dreapta', 'urcare'), text: peHartie('(a/l: cale, dreapta, 3 mm)', ['G0 X110.000 Y47.000', 'G1 Z-3.000 F300.0', 'G1 X10.000 Y47.000 F1000.0']) });
  rez.push({ nume: '1 linia, dreapta + opoziție', doc: V1('dreapta', 'opozitie'), text: peHartie('(a/l: cale, dreapta, 3 mm)', ['G0 X10.000 Y47.000', 'G1 Z-3.000 F300.0', 'G1 X110.000 Y47.000 F1000.0']) });
  // 3: semicercul, un singur bloc de 180°, ca pe hârtie.
  rez.push({ nume: '3 semicercul R50, stânga + urcare (G3 la R47)', doc: V3('stanga'), text: peHartie('(c/s: cale, stanga, 3 mm)', ['G0 X147.000 Y30.000', 'G1 Z-3.000 F300.0', 'G3 X53.000 Y30.000 I-47.000 J0.000 F1000.0']) });
  rez.push({ nume: '3 semicercul R50, dreapta + urcare (G2 la R53)', doc: V3('dreapta'), text: peHartie('(c/s: cale, dreapta, 3 mm)', ['G0 X47.000 Y30.000', 'G1 Z-3.000 F300.0', 'G2 X153.000 Y30.000 I53.000 J0.000 F1000.0']) });
  rez.push({ nume: '3 sub oglindire: stânga XOR det < 0 = tot înăuntru (G3 la R47)', doc: V3o(), text: peHartie('(c/s: cale, stanga, 3 mm)', ['G0 X147.000 Y30.000', 'G1 Z-3.000 F300.0', 'G3 X53.000 Y30.000 I-47.000 J0.000 F1000.0']) });
  // 4: L-ul.
  rez.push({
    nume: '4 L-ul, dreapta + opoziție (colțul convex: G3 R3)', doc: V4('dreapta', 'opozitie'),
    text: peHartie('(e/l: cale, dreapta, 3 mm)', ['G0 X20.000 Y7.000', 'G1 Z-3.000 F300.0', 'G1 X120.000 Y7.000 F1000.0', 'G3 X123.000 Y10.000 I0.000 J3.000 F1000.0', 'G1 X123.000 Y110.000 F1000.0']),
  });
  rez.push({
    nume: '4 L-ul, stânga + urcare (colțul concav, fără arc)', doc: V4('stanga', 'urcare'),
    text: peHartie('(e/l: cale, stanga, 3 mm)', ['G0 X20.000 Y13.000', 'G1 Z-3.000 F300.0', 'G1 X117.000 Y13.000 F1000.0', 'G1 X117.000 Y110.000 F1000.0']),
  });
  // 9: oglindirea, cu XOR-ul determinantului.
  rez.push({ nume: '9 oglindirea, stânga + urcare (în lume, scula la Y53)', doc: V9(), text: peHartie('(m/l: cale, stanga, 3 mm)', ['G0 X50.000 Y53.000', 'G1 Z-3.000 F300.0', 'G1 X150.000 Y53.000 F1000.0']) });
  // În plus: 5, 6, 7, „G”-ul.
  rez.push({ nume: '5 cârligul, stânga: o bucată până la x = 42,172', doc: V5(), text: programParte([{ idLume: 'h/c', latura: 'stanga', adancime: 3, bucati: [TRASEE.v5] }]) });
  rez.push({ nume: '6 U-ul de 5 mm, dreapta + urcare: colțurile convexe ca arce R3', doc: V6('dreapta'), text: programParte([{ idLume: 'u/u', latura: 'dreapta', adancime: 3, bucati: [TRASEE.v6] }]) });
  rez.push({ nume: '7 V-ul de 10°, scula înăuntru: centrul se oprește la R / sin 5° de vârf', doc: V7(), text: programParte([{ idLume: 'v/v', latura: 'stanga', adancime: 3, bucati: [TRASEE.v7] }]) });
  rez.push({ nume: 'cubica, stânga: offsetul exact al cubicei, eșantionat (peretele cu cubice, toleranța + 0,0011)', doc: VC(), text: programParte([{ idLume: 'w/c', latura: 'stanga', adancime: 3, bucati: [TRASEE.vc] }]) });
  rez.push({ nume: 'zig-zag-ul dens (precizarea 2.3c-4): arcele R3 ale văilor, startul la egalitate între capăt și vârf', doc: VZ(), text: programParte([{ idLume: 'z/z', latura: 'dreapta', adancime: 3, bucati: [TRASEE.vz] }]) });
  rez.push({ nume: 'canelura cât freza (§5): dus-întors pe linia din mijlocul fantei de 2R', doc: VN(), text: programParte([{ idLume: 'n/n', latura: 'stanga', adancime: 3, bucati: [TRASEE.vn] }]) });
  rez.push({ nume: 'G-ul: două bucăți, camera se închide pe ea însăși', doc: VG(), text: programParte([{ idLume: 'g/g', latura: 'stanga', adancime: 3, bucati: [TRASEE.vg.A, TRASEE.vg.B] }]) });
  rez.push({
    nume: 'G-ul la 6 mm: două treceri × două bucăți, fiecare bucată din același punct', doc: VG(6),
    text: programParte([{ idLume: 'g/g', latura: 'stanga', adancime: 6, treceri: [3, 6], bucati: [TRASEE.vg.A, TRASEE.vg.B] }]),
  });
  // 10 și 12, variantele acceptate.
  rez.push({
    nume: '10 linia la 10 mm de piesă, pe partea cealaltă (și exteriorul piesei departe de perete)', doc: V10('stanga', 10),
    text: programParte([{ idLume: 'k/l', latura: 'stanga', adancime: 3, bucati: [[sg(pt(30, 93), pt(110, 93))]] }, exteriorP(V10('stanga', 10))]),
  });
  rez.push({
    nume: '10 linia la 10 mm de piesă, pe partea dinspre piesă (7 mm până la piesă)', doc: V10('dreapta', 10),
    text: programParte([{ idLume: 'k/l', latura: 'dreapta', adancime: 3, bucati: [[sg(pt(110, 87), pt(30, 87))]] }, exteriorP(V10('dreapta', 10))]),
  });
  rez.push({
    nume: '12 lanțul convex, din două linii separate (capătul la exact R de vârful comun)', doc: V12('convex'),
    text: programParte([
      { idLume: 'A/l', latura: 'dreapta', adancime: 3, bucati: [[sg(pt(100, 37), pt(40, 37))]] },
      { idLume: 'B/l', latura: 'dreapta', adancime: 3, bucati: [[sg(pt(103, 100), pt(103, 40))]] },
    ]),
  });
  return rez;
}

// ---------------------------------------------------------------------------------------------------------------
// Regiunea: valorile 10, 11, 12, cu verdictele cerute.

export type CazRegiune = {
  readonly nume: string; readonly doc: DocV10O; readonly text: string;
  /** Încălcările invariantei 2 cerute (linia = prima linie de după eticheta dată, a mișcării care taie). */
  readonly cere: ReadonlyArray<{ readonly eticheta: string; readonly tipar: RegExp }>;
  /** Etichetele sub care NU trebuie nicio încălcare a invariantei 2. */
  readonly curate: readonly string[];
};

export function cazuriRegiune(): CazRegiune[] {
  const rez: CazRegiune[] = [];
  {
    const doc = V10('dreapta');
    rez.push({
      nume: '10 linia la 5 mm, pe partea dinspre piesă: refuz („intră în piesa … cu 1,000 mm”)', doc,
      text: programParte([{ idLume: 'k/l', latura: 'dreapta', adancime: 3, bucati: [[sg(pt(110, 82), pt(30, 82))]] }, exteriorP(doc)]),
      cere: [{ eticheta: '(k/l: cale, dreapta, 3 mm)', tipar: /^regiunea păstrată: tăietura lui k\/l intră în p\/r \(cu 1\.000 mm/ }],
      curate: [],
    });
  }
  {
    // ADR-ul: „cu freza pe partea cealaltă: trece”. Tăietura liniei trece; exteriorul piesei (la 3 mm de ea) atinge însă
    // peretele (la 5 mm) cu 1 mm: §10 / §13 adaugă pereții la marginile exteriorului (ambiguitatea e în raport).
    const doc = V10('stanga');
    rez.push({
      nume: '10 linia la 5 mm, pe partea cealaltă: tăietura liniei trece; exteriorul piesei atinge peretele (§10)', doc,
      text: programParte([{ idLume: 'k/l', latura: 'stanga', adancime: 3, bucati: [[sg(pt(30, 88), pt(110, 88))]] }, exteriorP(doc)]),
      cere: [{ eticheta: '(p/r: dreptunghi, exterior, 3 mm)', tipar: /^regiunea păstrată: tăietura lui p\/r atinge peretele lui k\/l \(cu 1\.000 mm/ }],
      curate: ['(k/l: cale, stanga, 3 mm)'],
    });
  }
  {
    const doc = V11();
    rez.push({
      nume: '11 linia oprită la 1 mm de piesă: refuz, discul de la capăt intră 2,000 mm', doc,
      text: programParte([{ idLume: 'k/l', latura: 'stanga', adancime: 3, bucati: [[sg(pt(73, 140), pt(73, 81))]] }, exteriorP(doc)]),
      cere: [
        { eticheta: '(k/l: cale, stanga, 3 mm)', tipar: /^regiunea păstrată: tăietura lui k\/l intră în p\/r \(cu 2\.000 mm/ },
        { eticheta: '(p/r: dreptunghi, exterior, 3 mm)', tipar: /^regiunea păstrată: tăietura lui p\/r atinge peretele lui k\/l/ },
      ],
      curate: [],
    });
  }
  {
    const doc = V12('X');
    const d = 3 / Math.SQRT2;
    rez.push({
      nume: '12 două linii pe o parte, în X: refuz', doc,
      text: programParte([
        { idLume: 'A/l', latura: 'stanga', adancime: 3, bucati: [[sg(pt(40 - d, 40 + d), pt(100 - d, 100 + d))]] },
        { idLume: 'B/l', latura: 'stanga', adancime: 3, bucati: [[sg(pt(40 + d, 100 + d), pt(100 + d, 40 + d))]] },
      ]),
      cere: [
        // Pătrunderea e R în punctul încrucișării; eșantionarea din interiorul încălcării o dă la ±0,005 (ca la `verificaMutarea`).
        { eticheta: '(A/l: cale, stanga, 3 mm)', tipar: /^regiunea păstrată: tăietura lui A\/l atinge peretele lui B\/l \(cu (2\.99\d|3\.000) mm/ },
        { eticheta: '(B/l: cale, stanga, 3 mm)', tipar: /^regiunea păstrată: tăietura lui B\/l atinge peretele lui A\/l \(cu (2\.99\d|3\.000) mm/ },
      ],
      curate: [],
    });
  }
  {
    const doc = V12('concav');
    rez.push({
      nume: '12 lanțul concav, din două linii separate: refuz, cu R', doc,
      text: programParte([
        { idLume: 'A/l', latura: 'stanga', adancime: 3, bucati: [[sg(pt(40, 43), pt(100, 43))]] },
        { idLume: 'B/l', latura: 'stanga', adancime: 3, bucati: [[sg(pt(97, 40), pt(97, 100))]] },
      ]),
      cere: [
        { eticheta: '(A/l: cale, stanga, 3 mm)', tipar: /^regiunea păstrată: tăietura lui A\/l atinge peretele lui B\/l \(cu 3\.000 mm/ },
        { eticheta: '(B/l: cale, stanga, 3 mm)', tipar: /^regiunea păstrată: tăietura lui B\/l atinge peretele lui A\/l \(cu 3\.000 mm/ },
      ],
      curate: [],
    });
  }
  return rez;
}

// ---------------------------------------------------------------------------------------------------------------
// Martorii negativi.

export type MartorParte = {
  readonly nume: string; readonly doc: DocV10O; readonly text: string;
  /** Încălcările care TREBUIE să apară: invarianta, linia (0 = pe document) și un tipar al mesajului. */
  readonly cere: ReadonlyArray<{ readonly invarianta: number; readonly linia: number; readonly tipar: RegExp }>;
};

export function martoriParte(): MartorParte[] {
  const rez: MartorParte[] = [];
  const E1 = '(a/l: cale, stanga, 3 mm)';
  // P1: partea inversată (Y47 în loc de Y53).
  {
    const text = peHartie(E1, ['G0 X10.000 Y47.000', 'G1 Z-3.000 F300.0', 'G1 X110.000 Y47.000 F1000.0']);
    const m = liniaLui(text, 'G1 X110.000 Y47.000 F1000.0');
    rez.push({
      nume: 'P1 partea inversată (Y47 în loc de Y53)', doc: V1('stanga'), text,
      cere: [
        { invarianta: 2, linia: m, tipar: /^regiunea păstrată: tăietura lui a\/l \(stanga\) trece pe partea păstrată a peretelui ei/ },
        { invarianta: 9, linia: m, tipar: /^sensul de tăiere \(pe o parte\): a\/l \(stanga\), urcare: .* τ × v < 0/ },
        { invarianta: 14, linia: liniaLui(text, E1), tipar: /^pe o parte \(14 ii\): trecerea lui a\/l \(stanga\) .* nu acoperă offsetul ideal: punctul ideal valid \(\d+\.\d{3}, 53\.000\)/ },
      ],
    });
  }
  // P2: mersul invers la urcare.
  {
    const text = peHartie(E1, ['G0 X110.000 Y53.000', 'G1 Z-3.000 F300.0', 'G1 X10.000 Y53.000 F1000.0']);
    rez.push({
      nume: 'P2 mersul invers la urcare (de la X110 la X10, la Y53)', doc: V1('stanga', 'urcare'), text,
      cere: [{ invarianta: 9, linia: liniaLui(text, 'G1 X10.000 Y53.000 F1000.0'), tipar: /^sensul de tăiere \(pe o parte\): a\/l \(stanga\), urcare: .*materialul păstrat e în stanga mersului; modelul așchiei cere dreapta pentru urcare/ }],
    });
  }
  // P3: traseul prelungit dincolo de normala capătului (la start și la capăt).
  {
    const text = peHartie(E1, ['G0 X9.000 Y53.000', 'G1 Z-3.000 F300.0', 'G1 X110.000 Y53.000 F1000.0']);
    rez.push({
      nume: 'P3 traseul prelungit cu 1 mm dincolo de normala capătului de start', doc: V1('stanga'), text,
      cere: [
        { invarianta: 2, linia: liniaLui(text, 'G1 Z-3.000 F300.0'), tipar: /ocolește capătul peretelui ei: trece cu 1\.000 mm de normala capătului/ },
        { invarianta: 14, linia: liniaLui(text, E1), tipar: /n-are niciun capăt pe normala capătului de start al căii \(punctul ideal \(10\.000, 53\.000\)/ },
      ],
    });
  }
  {
    const text = peHartie(E1, ['G0 X10.000 Y53.000', 'G1 Z-3.000 F300.0', 'G1 X110.500 Y53.000 F1000.0']);
    rez.push({
      nume: 'P3b traseul prelungit cu 0,5 mm dincolo de normala capătului final', doc: V1('stanga'), text,
      cere: [
        { invarianta: 2, linia: liniaLui(text, 'G1 X110.500 Y53.000 F1000.0'), tipar: /ocolește capătul peretelui ei: trece cu 0\.500 mm de normala capătului/ },
        { invarianta: 14, linia: liniaLui(text, E1), tipar: /n-are niciun capăt pe normala capătului de final al căii \(punctul ideal \(110\.000, 53\.000\)/ },
      ],
    });
  }
  // P4: traseul care ocolește capătul (din Y47, pe partea păstrată, în jurul lui (10, 50), până în Y53).
  {
    const text = peHartie(E1, ['G0 X10.000 Y47.000', 'G1 Z-3.000 F300.0', 'G2 X10.000 Y53.000 I0.000 J3.000 F1000.0', 'G1 X110.000 Y53.000 F1000.0']);
    const a = liniaLui(text, 'G2 X10.000 Y53.000 I0.000 J3.000 F1000.0');
    rez.push({
      nume: 'P4 traseul care ocolește capătul (semicercul în jurul vârfului 0)', doc: V1('stanga'), text,
      cere: [
        { invarianta: 2, linia: a, tipar: /ocolește capătul peretelui ei: trece cu 3\.000 mm de normala capătului/ },
        { invarianta: 2, linia: liniaLui(text, 'G1 Z-3.000 F300.0'), tipar: /trece pe partea păstrată a peretelui ei/ },
      ],
    });
  }
  // P5: oglindirea fără XOR (partea luată în lume, fără determinant): Y47, de la X150 la X50.
  {
    const text = peHartie('(m/l: cale, stanga, 3 mm)', ['G0 X150.000 Y47.000', 'G1 Z-3.000 F300.0', 'G1 X50.000 Y47.000 F1000.0']);
    const m = liniaLui(text, 'G1 X50.000 Y47.000 F1000.0');
    rez.push({
      nume: 'P5 oglindirea fără XOR (Y47, de la X150 la X50)', doc: V9(), text,
      cere: [
        { invarianta: 2, linia: m, tipar: /^regiunea păstrată: tăietura lui m\/l \(stanga\) trece pe partea păstrată a peretelui ei \(scula pe dreapta în lume/ },
        { invarianta: 14, linia: liniaLui(text, '(m/l: cale, stanga, 3 mm)'), tipar: /nu acoperă offsetul ideal/ },
      ],
    });
  }
  // P5b: oglindirea fără XOR, pe semicerc: scula în afară (R53), orar, ca desenul în lume.
  {
    const text = peHartie('(c/s: cale, stanga, 3 mm)', ['G0 X47.000 Y30.000', 'G1 Z-3.000 F300.0', 'G2 X153.000 Y30.000 I53.000 J0.000 F1000.0']);
    rez.push({
      nume: 'P5b oglindirea fără XOR pe semicerc (R53 în loc de R47)', doc: V3o(), text,
      cere: [{ invarianta: 2, linia: liniaLui(text, 'G2 X153.000 Y30.000 I53.000 J0.000 F1000.0'), tipar: /^regiunea păstrată: tăietura lui c\/s \(stanga\) trece pe partea păstrată a peretelui ei \(scula pe dreapta în lume/ }],
    });
  }
  // P6: zig-zag-ul la a doua trecere (dus la −3, coborârea la −6 la capăt, întors la −6).
  {
    const E = '(a/l: cale, stanga, 6 mm)';
    const text = peHartie(E, ['G0 X10.000 Y53.000', 'G1 Z-3.000 F300.0', 'G1 X110.000 Y53.000 F1000.0', 'G1 Z-6.000 F300.0', 'G1 X10.000 Y53.000 F1000.0']);
    rez.push({
      nume: 'P6 zig-zag-ul la a doua trecere', doc: V1('stanga', 'urcare', 6), text,
      cere: [
        { invarianta: 11, linia: liniaLui(text, 'G1 Z-6.000 F300.0'), tipar: /coboară pe verticală de la -3\.000 la -6\.000 fără ridicare/ },
        { invarianta: 9, linia: liniaLui(text, 'G1 X10.000 Y53.000 F1000.0'), tipar: /^sensul de tăiere \(pe o parte\): a\/l \(stanga\), urcare/ },
      ],
    });
  }
  // P7–P9: colțul concav al unui lanț de linii separate, linia oprită la 1 mm de o piesă, X-ul (din `cazuriRegiune`).
  for (const c of cazuriRegiune().filter((x) => /concav|oprită|în X/.test(x.nume))) {
    // Linia mișcării care taie (după etichetă: rapida, plonjarea, apoi mișcarea); doar tăieturile liniilor.
    rez.push({
      nume: `P${/concav/.test(c.nume) ? 7 : /oprită/.test(c.nume) ? 8 : 9} ${c.nume}`, doc: c.doc, text: c.text,
      cere: c.cere.filter((x) => !x.eticheta.startsWith('(p/r')).map((x) => ({ invarianta: 2, linia: liniaLui(c.text, x.eticheta) + 3, tipar: x.tipar })),
    });
  }
  // P10: o bucată scăpată („G”-ul fără bucata A).
  {
    const text = programParte([{ idLume: 'g/g', latura: 'stanga', adancime: 3, bucati: [TRASEE.vg.B] }]);
    const e = liniaLui(text, '(g/g: cale, stanga, 3 mm)');
    rez.push({
      nume: 'P10 o bucată scăpată (G-ul fără bucata A)', doc: VG(), text,
      cere: [
        { invarianta: 14, linia: e, tipar: /nu acoperă offsetul ideal: punctul ideal valid \(\d+\.\d{3}, 53\.000\) \(primitiva 0\)/ },
        { invarianta: 14, linia: e, tipar: /n-are niciun capăt pe normala capătului de start al căii \(punctul ideal \(50\.000, 53\.000\)/ },
      ],
    });
  }
  // P11: bucla închisă în jurul liniei (calea tratată ca închisă): sub o etichetă pe o parte.
  {
    const text = programParte([{
      idLume: 'a/l', latura: 'stanga', adancime: 3,
      bucati: [[sg(pt(10, 53), pt(110, 53)), arc(pt(110, 50), 3, Math.PI / 2, -Math.PI), sg(pt(110, 47), pt(10, 47)), arc(pt(10, 50), 3, -Math.PI / 2, -Math.PI)]],
    }]);
    rez.push({
      nume: 'P11 bucla închisă în jurul liniei (calea luată drept închisă)', doc: V1('stanga'), text,
      cere: [
        { invarianta: 9, linia: liniaLui(text, 'G1 X110.000 Y53.000 F1000.0'), tipar: /^sensul de tăiere \(pe o parte\): sub eticheta deschisă a lui a\/l \(stanga\), o buclă închisă/ },
        { invarianta: 2, linia: liniaLui(text, 'G1 X10.000 Y47.000 F1000.0'), tipar: /trece pe partea păstrată a peretelui ei/ },
      ],
    });
  }
  // P12: eticheta fără nicio mișcare (ieșirea goală, luată drept „nu încape” acolo unde scula încape).
  {
    const text = programLinii([E1, 'G0 X10.000 Y53.000']);
    rez.push({
      nume: 'P12 eticheta pe o parte fără nicio mișcare de tăiere (scula încape)', doc: V1('stanga'), text,
      cere: [{ invarianta: 14, linia: liniaLui(text, E1), tipar: /^pe o parte \(14 ii\): eticheta lui a\/l \(stanga\) n-are nicio mișcare de tăiere, dar offsetul ideal are porțiuni valide/ }],
    });
  }
  // P13: U-ul de 5 mm cu scula înăuntru: nu încape nicăieri, exportul trebuia refuzat (§6).
  {
    const text = programLinii(['(u/u: cale, stanga, 3 mm)', 'G0 X52.500 Y100.000']);
    rez.push({
      nume: 'P13 U-ul de 5 mm, stânga: scula nu încape nicăieri (§6: exportul trebuia refuzat)', doc: V6('stanga'), text,
      cere: [{ invarianta: 14, linia: 0, tipar: /^pe o parte \(§6\): scula nu încape nicăieri pe partea cerută a lui u\/u/ }],
    });
  }
  // P14: o bucată tăiată în două (o plonjare la mijlocul peretelui).
  {
    const text = programParte([{ idLume: 'a/l', latura: 'stanga', adancime: 3, bucati: [[sg(pt(10, 53), pt(60, 53))], [sg(pt(60, 53), pt(110, 53))]] }]);
    rez.push({
      nume: 'P14 bucata tăiată în două lanțuri (plonjare la mijlocul peretelui)', doc: V1('stanga'), text,
      cere: [{ invarianta: 14, linia: liniaLui(text, 'G1 Z-3.000 F300.0'), tipar: /^pe o parte \(14 ii\): în trecerea lui a\/l \(stanga\).* atinge bucata care începe la linia/ }],
    });
  }
  // P15: G-ul la 6 mm, cu bucata B pornită la a doua trecere din alt punct (aceeași cameră, alt start).
  {
    const B2 = lant(pt(147, 53), pt(147, 67), pt(103, 67), pt(103, 53), pt(147, 53));
    const text = programDinTrasee([
      { eticheta: 'g/g: cale, stanga, 6 mm', primitive: TRASEE.vg.A, adancime: 3 }, { eticheta: null, primitive: TRASEE.vg.B, adancime: 3 },
      { eticheta: null, primitive: TRASEE.vg.A, adancime: 6 }, { eticheta: null, primitive: B2, adancime: 6 },
    ], MONTAJ_D);
    const plonjari = text.split('\n').flatMap((l, k) => (l === 'G1 Z-6.000 F300.0' ? [k + 1] : []));
    rez.push({
      nume: 'P15 a doua trecere a bucății B pornește din alt punct', doc: VG(6), text,
      cere: [{ invarianta: 11, linia: plonjari[1]!, tipar: /^trecerea pe calea deschisă \(§13\): bucata 2 a lui g\/g \(stanga, cale deschisă\) plonjează în \(147\.000, 53\.000\); la prima trecere, în \(103\.000, 53\.000\)/ }],
    });
  }
  // P17: colțul convex sărit: L-ul pe dreapta tăiat în două lanțuri, fără arcul R3 în jurul vârfului (evantaiul neatins).
  {
    const text = programParte([{ idLume: 'e/l', latura: 'dreapta', adancime: 3, bucati: [[sg(pt(20, 7), pt(120, 7))], [sg(pt(123, 10), pt(123, 110))]] }]);
    rez.push({
      nume: 'P17 colțul convex sărit (fără arcul R3 al evantaiului, două lanțuri)', doc: V4('dreapta', 'opozitie'), text,
      cere: [{ invarianta: 14, linia: liniaLui(text, '(e/l: cale, dreapta, 3 mm)'), tipar: /nu acoperă offsetul ideal: punctul ideal valid \(\d+\.\d{3}, \d+\.\d{3}\) \(evantaiul vârfului 1\)/ }],
    });
  }
  // P16: refuzurile, luate ca încălcări: stânga pe un contur închis; urechi, rampă, intrări, degajări pe o operație cu un
  // nod deschis tăiat pe o parte.
  {
    const doc = unu('q', 100, 100, { id: 'k', forma: inchisa([vL(0, 0), vL(20, 0), vL(20, 20), vL(0, 20)]), latura: 'stanga', adancime: 3 });
    const text = programParte([{ idLume: 'q/k', latura: 'stanga', adancime: 3, bucati: [lant(pt(100, 103), pt(117, 103), pt(117, 117), pt(103, 117), pt(103, 103))] }]);
    rez.push({ nume: 'P16 stânga pe un contur închis', doc, text, cere: [{ invarianta: 2, linia: 0, tipar: /^căile deschise \(§9\): q\/k e un contur închis cu latura stanga/ }] });
  }
  for (const [nume, inv, peste] of [
    ['urechi', 10, { urechi: { numar: 2, latime: 8, grosime: 2 } }], ['rampă', 11, { rampa: { lungime: 10 } }], ['intrări', 12, { intrari: { raza: 3 } }],
    ['degajări', 13, { colturi: { tip: 'dog-bone' } }],
  ] as const) {
    const doc = V1('stanga', 'urcare', 3, peste as Partial<ElemD>);
    rez.push({
      nume: `P16 ${nume} pe o operație cu un nod deschis tăiat pe stânga`, doc, text: programParte([{ idLume: 'a/l', latura: 'stanga', adancime: 3, bucati: [TRASEE.v1.stangaUrcare] }]),
      cere: [{ invarianta: inv, linia: 0, tipar: new RegExp(`^căile deschise \\(§9\\): operația a/op1 are cel puțin un nod deschis și ${nume}`) }],
    });
  }
  return rez;
}

/** Contextul porții pentru un document de aici (`ctxD`). */
export const ctxP = (doc: DocV10O): ContextPoarta => ctxD(doc);
