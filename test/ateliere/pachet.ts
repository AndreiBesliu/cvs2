/**
 * Pachetul de atelier (ADR 0131, felia 4.6↑b): fișierele de probă T0–T7 ale fiecărui controler, după sonda s8 (Anexa B) și
 * placa 3 (`PLAN.md` §5.3), scrise de postul aplicației cu contractul controlerului, plus fișa atelierului: setările de
 * verificat, ce se măsoară, valorile pe hârtie și amprenta fiecărui fișier.
 *
 * Unde contractul e încă prudent, fișierul probează chiar controlerul, cu o variantă de probă a contractului, spusă în fișă:
 * raza de 1 200 mm (NcStudio, RichAuto: contractul ține 1 000), elicea (RichAuto), stilurile de comentariu, antetul maxim
 * (RichAuto), `X10` fără punct (Syntec), liniile de 79 și 80 de caractere (GRBL 1.1), WCS-ul G55. Rândurile brute, scrise
 * de mână, intră doar aici, în fișierele de probă: în aplicație, postul rămâne singurul care scrie G-code.
 */
import { createHash } from 'node:crypto';
import { crc32 } from 'node:zlib';
import { traseuGaurire } from '../../src/cam/gaurire.ts';
import { AXE_XYZ, type Miscare, type Program, type Scula } from '../../src/ir/ir.ts';
import type { Montaj } from '../../src/ir/montaj.ts';
import type { Contract, StrategieScula } from '../../src/post/contract.ts';
import { CONTRACTE, type IdContract } from '../../src/post/contracte/index.ts';
import { posteaza, posteazaPeScule } from '../../src/post/post.ts';

/** Foaia de MDF a pachetului: de rebut, cel puțin atât; originea în colțul stânga-jos, Z0 pe fața de sus. */
export const MONTAJ: Montaj = { foaie: { latime: 250, inaltime: 150, grosime: 18 }, origine: 'stanga-jos', z0: 'sus' };
export const T1: Scula = { numar: 1, nume: 'freza plata', diametru: 6 };
export const T2: Scula = { numar: 2, nume: 'freza plata', diametru: 3.175 };
/** Pauza după pornirea axului, în pachet: 2 s (s8 Anexa B, T2; placa 3), măsurată cu cronometrul. */
export const ASTEPTARE = 2;
const TURATIE = 18000;
const Z_SIGUR = 5;
const AVANS = 1000;
const PLONJARE = 300;

const program = (miscari: readonly Miscare[], scula: Scula = T1): Program => ({ axe: AXE_XYZ, scula, turatie: TURATIE, zSigur: Z_SIGUR, miscari });
const sus: Miscare = { tip: 'rapida', la: { Z: Z_SIGUR } };
/** Un contur închis „pe linie”, din puncte, la adâncimea dată. */
function poligon(puncte: readonly (readonly [number, number])[], z: number, avans = AVANS): Miscare[] {
  const [x0, y0] = puncte[0] ?? [0, 0];
  return [
    { tip: 'rapida', la: { X: x0, Y: y0 } }, { tip: 'taiere', la: { Z: z }, avans: PLONJARE },
    ...[...puncte.slice(1), [x0, y0] as const].map(([x, y]): Miscare => ({ tip: 'taiere', la: { X: x, Y: y }, avans })),
    sus,
  ];
}
const patrat = (x: number, y: number, latura: number, z: number, avans = AVANS): Miscare[] =>
  poligon([[x, y], [x + latura, y], [x + latura, y + latura], [x, y + latura]], z, avans);

// ——— Geometria fișierelor, cu valorile pe hârtie ———

/** T1: cercurile Ø50 (2 × 180° și 4 × 90°), la 100 mm între centre; canalul cu freza Ø6, adânc de 1 mm. */
export const T1_CERC = { raza: 25, a: { x: 40, y: 110 }, b: { x: 140, y: 110 }, adancime: 1 } as const;
/** T1: arcul cu raza de 1 200 mm și coarda de 80 (săgeata 0,667 mm), apoi arcul mic cu coarda de 0,05 (raza 1 000): G1. */
export const T1_ARC_MARE = { raza: 1200, start: { x: 150, y: 20 }, capat: { x: 230, y: 20 } } as const;
export const T1_ARC_MIC = { raza: 1000, coarda: 0.05 } as const;

function t1(): Program {
  const { raza: r, a, b, adancime } = T1_CERC;
  const z = -adancime;
  const m: Miscare[] = [];
  // Cercul A: un singur arc plin, scris de post în două jumătăți (cel mult 180° pe bloc).
  m.push({ tip: 'rapida', la: { X: a.x - r, Y: a.y } }, { tip: 'taiere', la: { Z: z }, avans: PLONJARE });
  m.push({ tip: 'arc', la: { X: a.x - r, Y: a.y }, centru: a, sens: 'orar', avans: AVANS }, sus);
  // Cercul B: patru sferturi, în sens orar, din stânga.
  m.push({ tip: 'rapida', la: { X: b.x - r, Y: b.y } }, { tip: 'taiere', la: { Z: z }, avans: PLONJARE });
  for (const [x, y] of [[b.x, b.y + r], [b.x + r, b.y], [b.x, b.y - r], [b.x - r, b.y]] as const) {
    m.push({ tip: 'arc', la: { X: x, Y: y }, centru: b, sens: 'orar', avans: AVANS });
  }
  m.push(sus);
  // Dreptunghiul 100 × 60 (x 20–120, y 10–70) cu colțurile R5, în sens trigonometric.
  m.push({ tip: 'rapida', la: { X: 25, Y: 10 } }, { tip: 'taiere', la: { Z: z }, avans: PLONJARE });
  const colt = (x: number, y: number, cx: number, cy: number): Miscare => ({ tip: 'arc', la: { X: x, Y: y }, centru: { x: cx, y: cy }, sens: 'trigonometric', avans: AVANS });
  m.push(
    { tip: 'taiere', la: { X: 115, Y: 10 }, avans: AVANS }, colt(120, 15, 115, 15),
    { tip: 'taiere', la: { X: 120, Y: 65 }, avans: AVANS }, colt(115, 70, 115, 65),
    { tip: 'taiere', la: { X: 25, Y: 70 }, avans: AVANS }, colt(20, 65, 25, 65),
    { tip: 'taiere', la: { X: 20, Y: 15 }, avans: AVANS }, colt(25, 10, 25, 15), sus,
  );
  // Arcul mare (bombat în sus, centrul dedesubt), apoi arcul mic, în continuare.
  const { start, capat, raza } = T1_ARC_MARE;
  const cm = { x: (start.x + capat.x) / 2, y: start.y - Math.sqrt(raza ** 2 - ((capat.x - start.x) / 2) ** 2) };
  const mic = T1_ARC_MIC;
  const cMic = { x: capat.x + mic.coarda / 2, y: capat.y - Math.sqrt(mic.raza ** 2 - (mic.coarda / 2) ** 2) };
  m.push({ tip: 'rapida', la: { X: start.x, Y: start.y } }, { tip: 'taiere', la: { Z: z }, avans: PLONJARE });
  m.push({ tip: 'arc', la: { X: capat.x, Y: capat.y }, centru: cm, sens: 'orar', avans: AVANS });
  m.push({ tip: 'arc', la: { X: capat.x + mic.coarda, Y: capat.y }, centru: cMic, sens: 'orar', avans: AVANS }, sus);
  return program(m);
}

/** T2: linia de 200 mm la F1000 (12,0 s), apoi înapoi la F2000 (6,0 s), în aer. */
export const T2_LINIE = { y: 40, x0: 10, x1: 210, avansuri: [1000, 2000] } as const;
function t2(): Program {
  const { y, x0, x1, avansuri } = T2_LINIE;
  return program([
    { tip: 'rapida', la: { X: x0, Y: y } }, { tip: 'taiere', la: { Z: -1 }, avans: PLONJARE },
    { tip: 'taiere', la: { X: x1 }, avans: avansuri[0] }, { tip: 'taiere', la: { X: x0 }, avans: avansuri[1] }, sus,
  ]);
}

/** T3: gaura Ø20 cu freza Ø6: elicea pe raza 7, 3 spire cu pasul 1 mm, apoi o tură plină la fund (în mijloc rămâne Ø8). */
export const T3_ELICE = { centru: { x: 40, y: 40 }, diametru: 20, spire: 3, pas: 1, avans: 800 } as const;
function t3(): Program {
  const { centru: c, diametru, spire, pas, avans } = T3_ELICE;
  const r = (diametru - T1.diametru) / 2;
  const la = (z?: number): Miscare => ({ tip: 'arc', la: { X: c.x + r, Y: c.y, ...(z === undefined ? {} : { Z: z }) }, centru: c, sens: 'trigonometric', avans });
  return program([
    { tip: 'rapida', la: { X: c.x + r, Y: c.y } }, { tip: 'taiere', la: { Z: 0 }, avans: PLONJARE },
    ...Array.from({ length: spire }, (_, k) => la(-(k + 1) * pas)), la(), sus,
  ]);
}

/** T4: pătratele 20 × 20 adânci de 2 mm, cu Ø6 și cu Ø3,175: diferența de adâncime 0,0 după schimbare. */
export const T4_PATRATE = { latura: 20, adancime: 2, a: { x: 20, y: 20 }, b: { x: 60, y: 20 } } as const;
function t4(): Program {
  const { latura, adancime, a, b } = T4_PATRATE;
  return program([
    ...patrat(a.x, a.y, latura, -adancime),
    { tip: 'schimba-scula', scula: T2, turatie: TURATIE },
    ...patrat(b.x, b.y, latura, -adancime, 600),
  ]);
}

/** T5: același pătrat de 10 mm, adânc de 0,5, o dată în G54 și o dată în G55. */
export const T5_PATRAT = { x: 10, y: 10, latura: 10, adancime: 0.5 } as const;
const t5 = (): Program => program(patrat(T5_PATRAT.x, T5_PATRAT.y, T5_PATRAT.latura, -T5_PATRAT.adancime));

/** T0: un pătrat de 20 mm la Z −1, în aer: probează doar citirea antetului și a comentariilor. */
const t0 = (): Program => program(patrat(10, 10, 20, -1));

/** T7: 4 găuri Ø6 cu freza Ø6, adânci de 10 mm, în pași de 2 (ciocănite, scrise în G0 / G1). */
export const T7_GAURI = { centre: [[100, 40], [120, 40], [140, 40], [160, 40]], adancime: 10, pas: 2 } as const;
function t7(): Program {
  const m: Miscare[] = [];
  for (const [x, y] of T7_GAURI.centre) {
    const r = traseuGaurire({
      centru: { x, y }, diametru: T1.diametru, diametruScula: T1.diametru, adancime: T7_GAURI.adancime, pas: T7_GAURI.pas,
      retragereCompleta: 1, trigonometric: true, avans: 600, avansPlonjare: PLONJARE, zSigur: Z_SIGUR,
    });
    if (!r.ok || r.fel !== 'ciocanire') throw new Error(`T7: găurirea refuzată: ${r.ok ? r.fel : r.motiv}`);
    m.push(...r.miscari);
  }
  return program(m);
}

// ——— Scrierea: postul, variantele de probă, rândurile brute ———

export type FisierAtelier = {
  readonly nume: string;
  readonly text: string;
  readonly test: 'T0' | 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7';
  /** Ce probează și ce se măsoară, cu valoarea pe hârtie (în fișă). */
  readonly ce: string;
  readonly unde: 'în aer' | 'pe MDF';
  readonly masoara: string;
};

function scrie(p: Program, k: Contract, optiuni: { readonly strategieScula?: StrategieScula } = {}): string {
  const r = posteaza(p, MONTAJ, k, { asteptareAx: ASTEPTARE, ...optiuni });
  if (!r.ok) throw new Error(`${k.nume}: ${r.motiv}`);
  return r.text;
}
/** Rândurile brute ale unei probe, puse după prima apariție a liniei `dupa`. */
function cuRanduri(text: string, dupa: string, randuri: readonly string[]): string {
  const linii = text.split('\n');
  const k = linii.indexOf(dupa);
  if (k < 0) throw new Error(`rândul „${dupa}” lipsește`);
  linii.splice(k + 1, 0, ...randuri);
  return linii.join('\n');
}
/** Rândurile brute puse înaintea ultimei opriri a axului (`M5`): după lucrul programului, cu axul încă pornit. */
function inainteDeFinal(text: string, randuri: readonly string[]): string {
  const linii = text.split('\n');
  const k = linii.lastIndexOf('M5');
  if (k < 0) throw new Error('programul n-are M5');
  linii.splice(k, 0, ...randuri);
  return linii.join('\n');
}

/** Stilurile de comentariu (s8 A.0): ce probează T0 pe fiecare controler, în afara stilului din contract. */
const STILURI: Readonly<Record<string, (text: string) => string>> = {
  paranteze: (t) => `(${t})`, 'punct-virgula': (t) => `; ${t}`, apostrof: (t) => `' ${t}`, slash: (t) => `// ${t}`,
};

const ext = (k: Contract): string => k.extensie.toUpperCase();
const fara = (k: Contract): Contract => ({ ...k, comentariu: null, setari: [] });

function fisiereT0(id: IdContract, k: Contract): FisierAtelier[] {
  const f = (nume: string, text: string, ce: string): FisierAtelier => ({
    nume: `${nume}.${ext(k)}`, text, test: 'T0', ce, unde: 'în aer', masoara: 'o eroare (da / nu) și linia la care apare: nicio eroare',
  });
  const alternative = (stiluri: readonly string[]): string => cuRanduri(scrie(t0(), fara(k)), fara(k).antet[0]?.replace('{unitati}', k.unitati.mm) ?? '',
    stiluri.map((s) => STILURI[s]?.(`proba comentariului: ${s}`) ?? ''));
  switch (id) {
    case 'ncstudio':
      return [
        f('T0AFARA', scrie(t0(), fara(k)), 'antetul fără comentarii'),
        f('T0BAPOS', scrie(t0(), k), 'comentariul contractului (apostroful)'),
        f('T0CALT', alternative(['paranteze', 'punct-virgula']), 'stilurile alternative: ( ) și ;, câte unul pe linie'),
      ];
    case 'richauto':
      return [
        f('T0AFARA', scrie(t0(), k), 'antetul contractului, fără comentarii'),
        f('T0BPAR', scrie(t0(), { ...k, comentariu: { deschidere: '(', inchidere: ')' } }), 'comentariile ( )'),
        f('T0CALT', alternative(['punct-virgula', 'apostrof', 'slash']), 'stilurile alternative: ;, apostroful și //, câte unul pe linie'),
        f('T0DANTET', scrie(t0(), { ...k, unitati: { mm: 'G21', inch: null }, antet: ['G90 G17 {unitati} G94', 'G40 G49 G80'], wcs: 'G54' }),
          'antetul maxim: G17, G21, G94, G40, G49, G80 și G54'),
      ];
    case 'syntec':
      return [
        f('T0CITIRE', scrie(t0(), k), 'antetul (%, O0001, G71) și comentariile ( )'),
        f('T0CALT', alternative(['slash']), 'comentariul // al exemplelor din manual'),
      ];
    default:
      return [f('T0CITIRE', scrie(t0(), k), 'antetul și comentariile contractului')];
  }
}

/** Strategia schimbării sculei la T4 (s8 Anexa B): ce probează fiecare controler. */
const STRATEGIE_T4: Readonly<Record<IdContract, StrategieScula>> = {
  'grbl-11': 'bariera-sender', grblhal: 'm6-controler', fluidnc: 'm6-controler',
  ncstudio: 'fisiere-separate', richauto: 'fisiere-separate', syntec: 'm6-controler', mach3: 'm6-controler', mach4: 'm6-controler',
};

/** Setul fiecărui controler (s8 Anexa B, „Setul minim pe controler”). */
export const SETURI: Readonly<Record<IdContract, readonly FisierAtelier['test'][]>> = {
  'grbl-11': ['T0', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
  grblhal: ['T0', 'T1', 'T2', 'T4'],
  fluidnc: ['T0', 'T1', 'T2', 'T4'],
  ncstudio: ['T0', 'T1', 'T2', 'T3', 'T4', 'T5'],
  richauto: ['T0', 'T1', 'T2', 'T3', 'T4', 'T5'],
  syntec: ['T0', 'T1', 'T2', 'T3', 'T4', 'T5'],
  mach3: ['T0', 'T1', 'T2', 'T3', 'T4', 'T5'],
  mach4: ['T0', 'T1', 'T2', 'T3', 'T4', 'T5'],
};

/** Varianta de probă pentru arce: raza mare scrisă ca arc și elicea, ca proba să vadă controlerul, nu prudența contractului. */
const pentruArce = (k: Contract): Contract => ({ ...k, arc: { ...k.arc, razaMaxima: Math.max(k.arc.razaMaxima, 1e4) }, elice: true });

export function fisiereAtelier(id: IdContract): FisierAtelier[] {
  const k: Contract = CONTRACTE[id];
  const e = ext(k);
  const out: FisierAtelier[] = [];
  for (const test of SETURI[id]) {
    switch (test) {
      case 'T0':
        out.push(...fisiereT0(id, k));
        break;
      case 'T1':
        out.push({
          nume: `T1ARCE.${e}`, text: scrie(t1(), pentruArce(k)), test, unde: 'pe MDF',
          ce: 'arcele: modul I/J, sensul, niciun cerc fals; arcul R1200 e scris ca arc (G2), ca să probeze controlerul',
          masoara: 'canalul cercurilor A (2 × 180°) și B (4 × 90°): exterior Ø56,00 și interior Ø44,00 (±0,2); distanța dintre centre 100,00 (±0,2); dreptunghiul cu colțurile R5: exterior 106,00 × 66,00 (±0,2); arcul R1200: o curbă lină, bombată 0,67 mm, nu un cerc; arcul mic: o linie de 0,05 mm, nu un cerc',
        });
        break;
      case 'T2': {
        let text = scrie(t2(), k);
        if (id === 'syntec') {
          // Punctul zecimal (s8 A.6): `X10` fără punct = 0,010 mm; `X10.` = 10 mm. Oprire (M0) între ele, ca să se citească ecranul.
          text = inainteDeFinal(text, ['(PUNCTUL ZECIMAL: X10 = 0.010 mm, X10. = 10 mm)', 'G0 X0. Y60.', 'G1 Z-1. F300.', 'G1 X10 F1000.', 'M0', 'G1 X10.', 'G0 Z5.']);
        }
        out.push({
          nume: `T2AVANS.${e}`, text, test, unde: 'în aer',
          ce: k.pauza === null ? 'avansul din fișier; așteptarea axului e a controlerului' : 'avansul din fișier și unitatea pauzei G4',
          masoara: `linia de 200 mm: 12,0 s la F1000 și 6,0 s la F2000 (±0,5 s, cu accelerațiile); ${k.pauza === null
            ? 'după M3, controlerul așteaptă cât spune setarea lui (Spindle delay): pe cronometru, aceeași valoare (±0,3 s)'
            : 'pauza de după M3: 2,0 s (±0,3), pe cronometru'}${id === 'syntec' ? '; la oprirea M0, X arată 0,010; după pornire, linia are 10,00 mm' : ''}`,
        });
        break;
      }
      case 'T3':
        out.push({
          nume: `T3ELICE.${e}`, text: scrie(t3(), pentruArce(k)), test, unde: 'pe MDF',
          ce: 'elicea (G2 / G3 cu Z), 3 spire cu pasul de 1 mm',
          masoara: 'gaura: adâncimea 3,0 (±0,1) în inel, diametrul 20,0 (±0,2); în mijloc rămâne un miez de Ø8',
        });
        break;
      case 'T4': {
        const strategie = STRATEGIE_T4[id];
        const ce = `schimbarea sculei: ${strategie === 'fisiere-separate' ? 'un fișier pe freză' : strategie === 'bariera-sender' ? 'oprirea în senderul aplicației' : 'M6 la controler'}`;
        const masoara = 'adâncimea celor două pătrate: diferența 0,0 (±0,1) după zero Z pe noua freză; la oprire, axul oprit și freza sus (da / nu); reluarea continuă de unde trebuie (da / nu)';
        if (strategie === 'fisiere-separate') {
          const r = posteazaPeScule(t4(), MONTAJ, k, { asteptareAx: ASTEPTARE });
          if (!r.ok) throw new Error(`${k.nume}: ${r.motiv}`);
          r.fisiere.forEach((f, i) => out.push({ nume: `T4SCULA${i + 1}.${e}`, text: f.text, test, unde: 'pe MDF', ce, masoara }));
        } else {
          out.push({ nume: `T4SCULA.${e}`, text: scrie(t4(), k, { strategieScula: strategie }), test, unde: 'pe MDF', ce, masoara });
        }
        break;
      }
      case 'T5':
        for (const wcs of ['G54', 'G55'] as const) {
          out.push({
            nume: `T5${wcs}.${e}`, text: scrie(t5(), { ...k, wcs }), test, unde: 'pe MDF',
            ce: `WCS-ul scris (${wcs}) e respectat; ce rămâne activ după sfârșit`,
            masoara: 'pătratul din G55 stă față de cel din G54 exact cu decalajul pus între ele pe controler (de exemplu 50,00 pe X, ±0,2); după M30, ce WCS e activ',
          });
        }
        break;
      case 'T6': {
        // GRBL: 79 de caractere utile trec, 80 dau error:11 (senderul aplicației le refuză la încărcare, cu numărul liniei).
        const lunga = (n: number): string => `G1X1.${'0'.repeat(n - 5)}`;
        const text = cuRanduri(scrie(t0(), k), 'G1 Z-1.000 F300.0', ['(79 de caractere utile: trece)', lunga(79), '(80 de caractere utile: error:11)', lunga(80)]);
        out.push({
          nume: `T6LINII.${e}`, text, test, unde: 'în aer', ce: 'limita liniei',
          masoara: 'cu alt sender: linia de 79 de caractere trece, cea de 80 dă error:11; senderul aplicației refuză fișierul la încărcare, la prima linie de peste 70 de caractere, cu numărul ei',
        });
        break;
      }
      case 'T7':
        out.push({
          nume: `T7GAURI.${e}`, text: scrie(t7(), k), test, unde: 'pe MDF', ce: 'găurirea în pași, scrisă în G0 / G1',
          masoara: 'cele 4 găuri Ø6: adâncimea 10,0 (±0,1)',
        });
        break;
    }
  }
  return out;
}

// ——— Fișa și arhiva ———

const sha256 = (text: string): string => createHash('sha256').update(text, 'ascii').digest('hex');

export function fisa(id: IdContract, fisiere: readonly FisierAtelier[]): string {
  const k = CONTRACTE[id];
  const setari = [
    ...k.setari,
    ...(STRATEGIE_T4[id] === 'm6-controler' && id === 'grblhal' ? ['$341 între 0 și 3 (M6 la controler)'] : []),
    ...(STRATEGIE_T4[id] === 'm6-controler' && id === 'fluidnc' ? ['ATC sau m6_macro declarat (altfel M6 trece fără pauză)'] : []),
  ];
  const randuri = fisiere.map((f) => `| ${f.nume} | ${f.ce} | ${f.unde} | ${f.masoara} | |`);
  return [
    `# Pachetul de probă pentru ${k.nume}`,
    '',
    `Generat de CNC Vector Studio cu postul aplicației și contractul „${k.nume}” (ADR 0125, 0131). Contractul e scris după`,
    'documentația controlerului și nu e încă probat pe o mașină: rezultatele de aici îl fac „probat”. Fișierele sunt exact cele',
    'de mai jos (amprentele SHA-256 la final): un fișier schimbat nu mai e proba.',
    '',
    '## Înainte de pornire',
    '',
    '- Versiunea controlerului (de pe ecran sau din meniul „Despre”): ____________________',
    ...(setari.length > 0 ? [`- Setările de verificat pe controler: ${setari.join('; ')}.`] : ['- Nicio setare a controlerului nu schimbă înțelesul fișierelor.']),
    `- Materialul: MDF de rebut, cel puțin ${MONTAJ.foaie.latime} × ${MONTAJ.foaie.inaltime} × 12 mm; freza plată Ø6 (T1)${fisiere.some((f) => f.test === 'T4') ? ' și Ø3,175 (T2, doar la T4)' : ''}.`,
    '- Zero-ul: X0 Y0 în colțul stânga-jos al plăcii, Z0 pe fața de sus.',
    '- **Prima rulare a fiecărui fișier, în aer:** zero Z la 20 mm deasupra materialului. Cele „pe MDF” se rulează apoi a doua',
    '  oară, cu Z0 pe material.',
    '- Fotografiați orice eroare: mesajul și linia la care apare.',
    '',
    '## Fișierele',
    '',
    '| Fișier | Ce probează | Unde | Ce se măsoară (valoarea pe hârtie) | Măsurat |',
    '|---|---|---|---|---|',
    ...randuri,
    '',
    '## Ce trimiteți înapoi',
    '',
    'Versiunea controlerului, setările de mai sus (cum erau), tabelul completat (cel mult 10 cote) și pozele erorilor.',
    '',
    '## Amprentele fișierelor (SHA-256)',
    '',
    '| Fișier | SHA-256 |',
    '|---|---|',
    ...fisiere.map((f) => `| ${f.nume} | \`${sha256(f.text)}\` |`),
    '',
  ].join('\n');
}

/** O arhivă ZIP fără comprimare, cu data fixă (1980-01-01): aceiași octeți la fiecare generare. */
export function zip(intrari: readonly { readonly nume: string; readonly octeti: Uint8Array }[]): Uint8Array {
  const parti: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let pozitie = 0;
  const DATA = (0 << 9) | (1 << 5) | 1;
  for (const { nume, octeti } of intrari) {
    const n = new TextEncoder().encode(nume);
    const crc = crc32(octeti);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true); local.setUint16(4, 10, true); local.setUint16(12, DATA, true);
    local.setUint32(14, crc, true); local.setUint32(18, octeti.length, true); local.setUint32(22, octeti.length, true);
    local.setUint16(26, n.length, true);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 10, true); c.setUint16(14, DATA, true);
    c.setUint32(16, crc, true); c.setUint32(20, octeti.length, true); c.setUint32(24, octeti.length, true);
    c.setUint16(28, n.length, true); c.setUint32(42, pozitie, true);
    parti.push(new Uint8Array(local.buffer), n, octeti);
    central.push(new Uint8Array(c.buffer), n);
    pozitie += 30 + n.length + octeti.length;
  }
  const marime = central.reduce((s, p) => s + p.length, 0);
  const sfarsit = new DataView(new ArrayBuffer(22));
  sfarsit.setUint32(0, 0x06054b50, true); sfarsit.setUint16(8, intrari.length, true); sfarsit.setUint16(10, intrari.length, true);
  sfarsit.setUint32(12, marime, true); sfarsit.setUint32(16, pozitie, true);
  const tot = [...parti, ...central, new Uint8Array(sfarsit.buffer)];
  const out = new Uint8Array(tot.reduce((s, p) => s + p.length, 0));
  let k = 0;
  for (const p of tot) { out.set(p, k); k += p.length; }
  return out;
}

/** Pachetul unui controler: fișierele, fișa (`FISA.md`) și arhiva lor, pe căile din `test/ateliere/`. */
export function pachet(id: IdContract): Map<string, Uint8Array> {
  const fisiere = fisiereAtelier(id);
  const cod = (t: string): Uint8Array => new TextEncoder().encode(t);
  const intrari = [{ nume: 'FISA.md', octeti: cod(fisa(id, fisiere)) }, ...fisiere.map((f) => ({ nume: f.nume, octeti: cod(f.text) }))];
  const out = new Map<string, Uint8Array>(intrari.map((x) => [`${id}/${x.nume}`, x.octeti]));
  out.set(`${id}.zip`, zip(intrari.map((x) => ({ nume: `${id}/${x.nume}`, octeti: x.octeti }))));
  return out;
}
