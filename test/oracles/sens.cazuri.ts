/**
 * Cazurile oracolului sensului de tăiere (ADR 0027, invarianta 9), cu ZERO importuri din `src/`:
 * - placa 1 pe hârtie, programele A (stânga-jos) și B (dreapta-sus), cu documentul lor (foaia 140 × 100 × 18) și cu
 *   etichetele ADR 0026 §7 puse în locul comentariilor de atunci:
 *   - VECHE: fișierele de dinainte de 09.10 (commit-ul 7a40696, neschimbate până la 463ed60): totul trigonometric
 *     (gaura G3 = urcare, insula G3 = opoziție, după tabelul amendat);
 *   - INTOARSA: regenerarea din 18cf16d, făcută pe tabelul inversat din prima redactare (gaura G2, insula G3): ambele
 *     în opoziție;
 *   - NOUA: ce cere ADR 0027 §7 amendat, scrisă de mână: gaura rămâne G3, insula trece în G2, parcursă invers din
 *     ACELAȘI vârf 0 (§4), cu aceleași cote și același număr de linii;
 * - un scriitor de trasee „cum cere contractul”: traseul ideal al fiecărui inel, întors după latura și sensul
 *   operației, cu orientarea citită dintr-o arie EȘANTIONATĂ (altă metodă decât formula exactă din `sens.ts`), cu
 *   trecerile din adâncime și pas.
 */
import { taieturiV4O, type DocV4O, type LaturaO, type SensO } from './document.ts';
import { lungime, punctLa, regiuneDinDocument, type Primitiva } from './regiune.ts';
import { cerc, drept, inverseaza, simple, type Stoc, type Traseu } from './regiune.cazuri.ts';

// ---------------------------------------------------------------------------------------------------------------
// Placa 1 (fișa din `docs/etape/placa-01.md`): dreptunghiul 100 × 60 la (20, 20), exterior, 3 mm; cercul R15 la
// (70, 50), interior, 8 mm în două treceri de 4; freza Ø6; foaia 140 × 100 × 18.

export const STOC_PLACA: Stoc = { latime: 140, inaltime: 100, grosime: 18 };

export const docPlaca1 = (sens: { readonly rama?: SensO; readonly gaura?: SensO } = {}): DocV4O => simple(STOC_PLACA, [
  { id: 'e1', forma: drept(100, 60), x: 20, y: 20, laturi: ['exterior'], sensuri: [sens.rama ?? 'urcare'] },
  { id: 'e2', forma: cerc(15), x: 70, y: 50, laturi: ['interior'], adancime: 8, sensuri: [sens.gaura ?? 'urcare'] },
], { diametru: 6, pas: 4 });

const ANTET = (origine: string): string[] => [
  '(CNC Vector Studio)',
  '(post GRBL 1.1)',
  `(origine ${origine}, Z0 sus, foaia 140.000 x 100.000 x 18.000 mm)`,
  '(scula T1 freza plata D6.000)',
  'G90 G17 G21 G94',
  'G40 G49 G80',
  'G54',
  'G0 Z5.000',
  'M3 S18000',
  'G4 P3.000',
];

/**
 * Insula, parcursă invers din același vârf 0, pe hârtie (A: documentul = mașina). Vârfurile, în sens trigonometric:
 * (20, 17) → (120, 17) → arcul cu centrul (120, 20) → (123, 20) → (123, 80) → arcul (120, 80) → (120, 83) → (20, 83)
 * → arcul (20, 80) → (17, 80) → (17, 20) → arcul (20, 20) → (20, 17). Invers, I / J din startul fiecărui arc.
 */
const INSULA_ORAR_A = [
  'G2 X17.000 Y20.000 I0.000 J3.000 F1000.0',
  'G1 X17.000 Y80.000',
  'G2 X20.000 Y83.000 I3.000 J0.000',
  'G1 X120.000 Y83.000',
  'G2 X123.000 Y80.000 I0.000 J-3.000',
  'G1 X123.000 Y20.000',
  'G2 X120.000 Y17.000 I-3.000 J0.000',
  'G1 X20.000 Y17.000',
];
const INSULA_TRIG_A = [
  'G1 X120.000 Y17.000 F1000.0',
  'G3 X123.000 Y20.000 I0.000 J3.000',
  'G1 X123.000 Y80.000',
  'G3 X120.000 Y83.000 I-3.000 J0.000',
  'G1 X20.000 Y83.000',
  'G3 X17.000 Y80.000 I0.000 J-3.000',
  'G1 X17.000 Y20.000',
  'G3 X20.000 Y17.000 I3.000 J0.000',
];
/** B: mașina = documentul − (140, 100); aceleași mișcări, aceleași I / J. */
const INSULA_ORAR_B = [
  'G2 X-123.000 Y-80.000 I0.000 J3.000 F1000.0',
  'G1 X-123.000 Y-20.000',
  'G2 X-120.000 Y-17.000 I3.000 J0.000',
  'G1 X-20.000 Y-17.000',
  'G2 X-17.000 Y-20.000 I0.000 J-3.000',
  'G1 X-17.000 Y-80.000',
  'G2 X-20.000 Y-83.000 I-3.000 J0.000',
  'G1 X-120.000 Y-83.000',
];
const INSULA_TRIG_B = [
  'G1 X-20.000 Y-83.000 F1000.0',
  'G3 X-17.000 Y-80.000 I0.000 J3.000',
  'G1 X-17.000 Y-20.000',
  'G3 X-20.000 Y-17.000 I-3.000 J0.000',
  'G1 X-120.000 Y-17.000',
  'G3 X-123.000 Y-20.000 I0.000 J-3.000',
  'G1 X-123.000 Y-80.000',
  'G3 X-120.000 Y-83.000 I3.000 J0.000',
];

/** Fișierul A (zero în colțul stânga-jos); `gaura` = codul arcelor găurii, `insula` = sensul insulei. */
const placaA = (gaura: 'G2' | 'G3', insula: 'G2' | 'G3'): string => `${[
  ...ANTET('stanga-jos'),
  '(gaura D30, 8 mm in doua treceri)',
  'G0 X82.000 Y50.000',
  'G1 Z-4.000 F300.0',
  `${gaura} X58.000 Y50.000 I-12.000 J0.000 F1000.0`,
  `${gaura} X82.000 Y50.000 I12.000 J0.000`,
  'G0 Z5.000',
  'G1 Z-8.000 F300.0',
  `${gaura} X58.000 Y50.000 I-12.000 J0.000 F1000.0`,
  `${gaura} X82.000 Y50.000 I12.000 J0.000`,
  'G0 Z5.000',
  '(insula 100 x 60, 3 mm)',
  'G0 X20.000 Y17.000',
  'G1 Z-3.000 F300.0',
  ...(insula === 'G3' ? INSULA_TRIG_A : INSULA_ORAR_A),
  'G0 Z5.000',
  'M5',
  'M30',
].join('\n')}\n`;

/** Fișierul B (zero în colțul dreapta-sus: mașina = documentul − (140, 100)). */
const placaB = (gaura: 'G2' | 'G3', insula: 'G2' | 'G3'): string => `${[
  ...ANTET('dreapta-sus'),
  '(gaura D30, 8 mm in doua treceri)',
  'G0 X-58.000 Y-50.000',
  'G1 Z-4.000 F300.0',
  `${gaura} X-82.000 Y-50.000 I-12.000 J0.000 F1000.0`,
  `${gaura} X-58.000 Y-50.000 I12.000 J0.000`,
  'G0 Z5.000',
  'G1 Z-8.000 F300.0',
  `${gaura} X-82.000 Y-50.000 I-12.000 J0.000 F1000.0`,
  `${gaura} X-58.000 Y-50.000 I12.000 J0.000`,
  'G0 Z5.000',
  '(insula 100 x 60, 3 mm)',
  'G0 X-120.000 Y-83.000',
  'G1 Z-3.000 F300.0',
  ...(insula === 'G3' ? INSULA_TRIG_B : INSULA_ORAR_B),
  'G0 Z5.000',
  'M5',
  'M30',
].join('\n')}\n`;

/** Fișierele de aur de dinainte de 09.10 (totul în G3), regenerarea întoarsă din 18cf16d și ce cere §7 amendat. */
export const PLACA_1_VECHE = { A: placaA('G3', 'G3'), B: placaB('G3', 'G3') } as const;
export const PLACA_1_INTOARSA = { A: placaA('G2', 'G3'), B: placaB('G2', 'G3') } as const;
export const PLACA_1_NOUA = { A: placaA('G3', 'G2'), B: placaB('G3', 'G2') } as const;

/** Comentariile fișierelor de aur înlocuite cu etichetele ADR 0026 §7 (fișierele plăcii 1 au fost scrise înaintea lor). */
export function cuEtichete(text: string): string {
  return text
    .replace('(gaura D30, 8 mm in doua treceri)', '(e2/e2: cerc, interior, 8 mm)')
    .replace('(insula 100 x 60, 3 mm)', '(e1/e1: dreptunghi, exterior, 3 mm)');
}

// ---------------------------------------------------------------------------------------------------------------
// Aria eșantionată: a doua metodă (shoelace pe puncte dese de-a lungul primitivelor), fără formula din `sens.ts`.

export function ariaEsantionata(ps: readonly Primitiva[], n = 64): number {
  const pts: Array<{ x: number; y: number }> = [];
  for (const p of ps) {
    if (p.tip === 'punct') continue;
    const L = lungime(p);
    for (let k = 0; k < n; k++) pts.push(punctLa(p, (L * k) / n));
  }
  let A = 0;
  for (let k = 0; k < pts.length; k++) {
    const a = pts[k]!, b = pts[(k + 1) % pts.length]!;
    A += a.x * b.y - b.x * a.y;
  }
  return A / 2;
}

/**
 * ADR 0027 §1 amendat, scris a doua oară (pentru scriitorul de trasee, din tabelul ADR-ului, nu din `sens.ts`):
 * trigonometric = true. Exterior: urcare orar, opoziție trigonometric; interior: urcare trigonometric, opoziție orar.
 */
export const trigonometric = (latura: Exclude<LaturaO, 'pe-linie'>, sens: SensO): boolean => (latura === 'exterior') === (sens === 'opozitie');

/** Un drum întors (dacă e nevoie) ca să fie parcurs trigonometric (`true`) sau orar. */
export function orientat(ps: readonly Primitiva[], trig: boolean): Primitiva[] {
  return (ariaEsantionata(ps) > 0) === trig ? [...ps] : inverseaza(ps);
}

/** Trecerile unei operații: din pas în pas până la adâncime (8 cu pasul 4: 4, 8). */
export function treceri(adancime: number, pas: number): number[] {
  const n = Math.max(1, Math.ceil(adancime / pas - 1e-9));
  return Array.from({ length: n }, (_, k) => (k === n - 1 ? adancime : ((k + 1) * adancime) / n));
}

/**
 * Traseele pe care contractul le cere pentru un document v4, pe foaia 0: pentru fiecare inel (ADR 0026) și fiecare
 * operație a lui pe latura inelului, traseul ideal (offsetul cu R), în sensul din ADR 0027 §1, cu trecerile ei și cu
 * eticheta ADR 0026 §7. `intoarse` întoarce, pentru teste, sensul unor inele (după id-ul în lume). Adâncimile și
 * sensurile vin direct din operațiile documentului (tăieturile oracolului documentului), nu din regiune: scriitorul nu
 * împarte cu poarta drumul pe care sensul ajunge la invarianta 9.
 */
export function traseeCerute(doc: DocV4O, D: number, o: { readonly intre?: 'coboara' | 'ridica'; readonly intoarse?: ReadonlySet<string> } = {}): Traseu[] {
  const reg = regiuneDinDocument(doc);
  return reg.inele.flatMap((inel) => {
    const latura = inel.rol === 'piesa' ? 'exterior' : 'interior';
    const drum = inel.contur.drumIdeal(D / 2, latura);
    if (!drum) return [];
    const ale = taieturiV4O(doc, 0).filter((t) => t.idLume === inel.idLume && t.latura === latura);
    return ale.map(({ adancime, pas, sens, forma }): Traseu => {
      const trig = trigonometric(latura, sens) !== (o.intoarse?.has(inel.idLume) ?? false);
      return {
        eticheta: `${inel.idLume}: ${String((forma as { tip: unknown }).tip)}, ${latura}, ${adancime} mm`,
        primitive: orientat(drum, trig),
        adancime,
        treceri: treceri(adancime, pas),
        ...(o.intre ? { intre: o.intre } : {}),
      };
    });
  });
}
