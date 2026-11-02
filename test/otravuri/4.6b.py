# Lista de otrăvuri a feliei 4.6↑b (pachetul de atelier T0–T7, ADR 0131), 02.11.2026, alese de autor: geometria testelor
# (raza cercului, cercul B în sferturi, colțurile, avansurile și pauza de la T2, pasul elicei, adâncimea celei de-a doua
# freze, pasul găuririi, liniile lungi), variantele de probă (arcul R1200 scris ca arc, elicea pe RichAuto), strategia
# schimbării probată, proba punctului zecimal pe Syntec și fișa (amprentele, setările). Fiecare trebuie prinsă de probele
# pe hârtie SINGURE (setul „pachet”), nu de proba de aur, care cade la orice schimbare a pachetului.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


PA = 'test/ateliere/pachet.ts'

o('G01', PA, "export const T1_CERC = { raza: 25, a: { x: 40, y: 110 }, b: { x: 140, y: 110 }, adancime: 1 } as const;",
  "export const T1_CERC = { raza: 25, a: { x: 40, y: 110 }, b: { x: 140, y: 110 }, adancime: 1 } as const;\nconst RAZA_GRESITA = 25.5;", 'pachet',
  'VOID-ul controlat: o constantă nefolosită (nu schimbă nimic, trebuie să scape)')
o('G02', PA, "  m.push({ tip: 'arc', la: { X: a.x - r, Y: a.y }, centru: a, sens: 'orar', avans: AVANS }, sus);",
  "  m.push({ tip: 'arc', la: { X: a.x + r, Y: a.y }, centru: a, sens: 'orar', avans: AVANS }, sus);", 'pachet',
  'cercul A, doar o jumătate (capătul pe partea cealaltă)')
o('G03', PA, "  for (const [x, y] of [[b.x, b.y + r], [b.x + r, b.y], [b.x, b.y - r], [b.x - r, b.y]] as const) {",
  "  for (const [x, y] of [[b.x + r, b.y], [b.x - r, b.y]] as const) {", 'pachet', 'cercul B în două jumătăți, nu în patru sferturi')
o('G04', PA, "    { tip: 'taiere', la: { X: 120, Y: 65 }, avans: AVANS }, colt(115, 70, 115, 65),",
  "    { tip: 'taiere', la: { X: 120, Y: 70 }, avans: AVANS },", 'pachet', 'un colț R5 lipsă (colțul ascuțit)')
o('G05', PA, "export const T2_LINIE = { y: 40, x0: 10, x1: 210, avansuri: [1000, 2000] } as const;",
  "export const T2_LINIE = { y: 40, x0: 10, x1: 210, avansuri: [1000, 1500] } as const;", 'pachet', 'avansul al doilea, 1 500 în loc de 2 000')
o('G06', PA, 'export const ASTEPTARE = 2;', 'export const ASTEPTARE = 3;', 'pachet', 'pauza de 3 s în loc de 2')
o('G07', PA, "  const la = (z?: number): Miscare => ({ tip: 'arc', la: { X: c.x + r, Y: c.y, ...(z === undefined ? {} : { Z: z }) }, centru: c, sens: 'trigonometric', avans });",
  "  const la = (z?: number): Miscare => ({ tip: 'arc', la: { X: c.x + r, Y: c.y, ...(z === undefined ? {} : { Z: z * 1.5 }) }, centru: c, sens: 'trigonometric', avans });",
  'pachet', 'elicea cu pasul de 1,5 mm (gaura la 4,5 mm)')
o('G08', PA, '    ...patrat(b.x, b.y, latura, -adancime, 600),', '    ...patrat(b.x, b.y, latura, -adancime + 0.5, 600),', 'pachet',
  'a doua freză la 1,5 mm (diferența de adâncime falsă)')
o('G09', PA, "export const T7_GAURI = { centre: [[100, 40], [120, 40], [140, 40], [160, 40]], adancime: 10, pas: 2 } as const;",
  "export const T7_GAURI = { centre: [[100, 40], [120, 40], [140, 40], [160, 40]], adancime: 10, pas: 2.5 } as const;", 'pachet',
  'găurirea în pași de 2,5')
o('G10', PA, "const lunga = (n: number): string => `G1X1.${'0'.repeat(n - 5)}`;", "const lunga = (n: number): string => `G1X1.${'0'.repeat(n - 6)}`;",
  'pachet', 'liniile T6 cu un caracter mai scurte (78 și 79)')
o('G11', PA, "const pentruArce = (k: Contract): Contract => ({ ...k, arc: { ...k.arc, razaMaxima: Math.max(k.arc.razaMaxima, 1e4) }, elice: true });",
  "const pentruArce = (k: Contract): Contract => ({ ...k, elice: true });", 'pachet',
  'fără varianta de probă a razei: pe NcStudio și RichAuto, arcul R1200 iese segmente')
o('G12', PA, "const pentruArce = (k: Contract): Contract => ({ ...k, arc: { ...k.arc, razaMaxima: Math.max(k.arc.razaMaxima, 1e4) }, elice: true });",
  "const pentruArce = (k: Contract): Contract => ({ ...k, arc: { ...k.arc, razaMaxima: Math.max(k.arc.razaMaxima, 1e4) } });", 'pachet',
  'fără varianta de probă a elicei: pe RichAuto, T3 iese segmente')
o('G13', PA, "  ncstudio: 'fisiere-separate', richauto: 'fisiere-separate', syntec: 'm6-controler', mach3: 'm6-controler', mach4: 'm6-controler',",
  "  ncstudio: 'm0-comentariu', richauto: 'fisiere-separate', syntec: 'm6-controler', mach3: 'm6-controler', mach4: 'm6-controler',", 'pachet',
  'NcStudio probat cu M0, nu cu un fișier pe freză')
o('G14', PA, "'G1 X10 F1000.', 'M0', 'G1 X10.'", "'G1 X10. F1000.', 'M0', 'G1 X10.'", 'pachet', 'proba punctului zecimal fără linia fără punct')
o('G15', PA, "    ...fisiere.map((f) => `| ${f.nume} | \\`${sha256(f.text)}\\` |`),", "    ...fisiere.map((f) => `| ${f.nume} | \\`${sha256(f.text + ' ')}\\` |`),",
  'pachet', 'amprenta din fișă, a altui text')
o('G16', PA, '    ...k.setari,\n', '', 'pachet', 'setările contractului lipsă din fișă')


# ---- Seturile ----
SETURI = {
    'pachet': ['test/unit/ateliere.test.ts'],
    'pachet2': ['test/unit/ateliere.test.ts', 'test/unit/ateliere.aur.test.ts'],
}
