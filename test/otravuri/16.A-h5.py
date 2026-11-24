# Lista de otrăvuri a feliei 16.A↑h-5 (profilurile parametrice în bibliotecă și în catalog: rotunjirea, ogee-ul, ogee-ul roman,
# panoul ridicat; ADR 0302 §1, §7), aleasă de autor: felurile cu rază, vârf și treaptă, marginile razei (rotunjirea, ogee-ul,
# scobitura panoului), ale treptei și ale unghiului panoului, capătul pe hârtie, curățarea, citirea, silueta (arcele, treptele,
# scobitura), CSV-ul, geometria la punerea din catalog, mărimile catalogului, numele propus și fereastra (diametrul păstrat,
# raza goală a panoului, câmpul treptei, etichetele, motivele, fișa).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit. o(id, fis, vechi, nou, set, ce):
# `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


F = 'src/model/freza.ts'
P = 'src/model/profilFreza.ts'
C = 'src/io/frezeFisier.ts'
D = 'src/model/dinCatalog.ts'
G = 'src/model/catalogFreze.ts'
W = 'src/app/FrezeleMele.tsx'
S = 'src/app/frezeStandard.ts'

o('F01', F, "export const areRaza = (fel: FelFreza): boolean => fel === 'toroidala' || fel === 'conica' || fel === 'rotunjire' || fel === 'ogee'",
  "export const areRaza = (fel: FelFreza): boolean => fel === 'toroidala' || fel === 'conica' || fel === 'ogee'", 'model',
  'rotunjirea fără rază: nu se judecă și nu se ține')
o('F02', F, "(f.fel === 'ogee' || f.fel === 'ogee-roman' ? R / 2 : R)", 'R', 'model', 'ogee-ul cu raza până la Ø / 2')
o('F03', F, '!(2 * f.raza! + f.treapta < f.diametru / 2)', '!(f.raza! + f.treapta < f.diametru / 2)', 'model', 'treapta judecată cu un singur arc')
o('F04', F, "const max = f.fel === 'panou' ? MARGINI_FREZA.unghiPanou : MARGINI_FREZA.unghiMaxim;", 'const max = MARGINI_FREZA.unghiMaxim;', 'model',
  'teșitura panoului până la 179°')
o('F05', F, 'f.raza * Math.sin((f.unghi! * Math.PI) / 180) < R', 'f.raza * Math.cos((f.unghi! * Math.PI) / 180) < R', 'model',
  'scobitura judecată cu cosinusul')
o('F06', F, "    case 'ogee': return finit(f.raza) ? 2 * f.raza : 0;", "    case 'ogee': return finit(f.raza) ? f.raza : 0;", 'model',
  'capătul ogee-ului, un singur arc')
o('F07', F, '2 * f.raza + f.treapta : 0;', '2 * f.raza : 0;', 'model', 'capătul ogee-ului roman fără treaptă')
o('F08', F, 'return r * (1 - Math.cos(b)) + (R - a - r * Math.sin(b)) * Math.tan(b);', 'return r * (1 - Math.cos(b)) + (R - a) * Math.tan(b);',
  'model', 'capătul panoului cu scobitură, fără bucata arcului')
o('F09', F, '    ...(areTreapta(f.fel) ? { treapta: f.treapta } : {}),', '    treapta: f.treapta,', 'model', 'treapta rămâne pe orice fel')
o('F10', F, "export const areVarf = (fel: FelFreza): boolean => fel === 'gravare' || fel === 'panou';",
  "export const areVarf = (fel: FelFreza): boolean => fel === 'gravare';", 'model', 'panoul fără fundul plat')
o('F11', F, "['unghi', 'varf', 'raza', 'treapta', 'tais', 'taisuri']", "['unghi', 'varf', 'raza', 'tais', 'taisuri']", 'model',
  'o treaptă care nu e număr trece la citire')
o('P01', P, 'exact(arc(R, 0, r, Math.PI, Math.PI / 2), [R - r, 0], [R, r])', 'exact(arc(R, 0, r, Math.PI, Math.PI / 3), [R - r, 0], [R, r])',
  'model', 'arcul rotunjirii oprit mai devreme')
o('P02', P, 'exact(arc(p0 + r, t + 2 * r, r, -Math.PI / 2, 0)', 'exact(arc(p0 + r, t + r, r, -Math.PI / 2, 0)', 'model',
  'arcul de sus al ogee-ului cu alt centru')
o('P03', P, 'return t > 0 ? [[0, 0], [p0, 0], ...jos', 'return t > 0 ? [[0, 0], ...jos', 'model', 'ogee-ul roman fără fundul de sub treaptă')
o('P04', P, 'exact(arc(a, r, r, -Math.PI / 2, -Math.PI / 2 + b)', 'exact(arc(a, r, r, -Math.PI / 2, -Math.PI / 2 + b / 2)', 'model',
  'scobitura oprită la jumătatea teșiturii')
o('C01', C, " 'roman ogee': 'ogee-roman',", '', 'fisier', '„roman ogee” nu se citește')
o('C02', C, " treapta: nr('treapta'),", '', 'fisier', 'coloana treapta nu se citește')
o('D01', D, ' && (!areTreapta(a.fel) || egal(a.treapta, b.treapta))', '', 'model', 'două ogee roman cu trepte diferite, socotite aceeași')
o('D02', D, '(!areVarf(a.fel) || egal(a.varf, b.varf))', "(a.fel !== 'gravare' || egal(a.varf, b.varf))", 'model',
  'două panouri cu funduri diferite, socotite aceeași')
o('G01', G, 'const d = mm(4 * r + 2 * t + 6);', 'const d = mm(4 * r + t + 6);', 'model', 'ogee-ul roman al catalogului, cu o singură treaptă în diametru')
o('G02', G, 'panou(d, 15), panou(d, 12, 6.35)', 'panou(d, 15), panou(d, 12, 3.175)', 'model', 'scobitura panourilor catalogului, de 1/8"')
o('S01', S, "    case 'panou': return f.raza === undefined", "    case 'panou': return true", 'e2e', 'numele panoului fără scobitură')
o('W01', W, '  return incape(c.diametru) ? n : { ...n, diametru: textNumar(p.d, ro) };', '  return { ...n, diametru: textNumar(p.d, ro) };',
  'e2e', 'diametrul scris se pierde la trecerea pe un profil')
o('W02', W, "  const razaFel = p ? p.raza : x === 'toroidala' ? 1 : 0.5;", "  const razaFel = p ? p.raza ?? 3 : x === 'toroidala' ? 1 : 0.5;", 'e2e',
  'panoul nou pornește cu scobitură')
o('W03', W, "{areTreapta(fel) ? camp('treapta', t('freze.treapta'), t('freze.unitate.mm')) : null}", '{null}', 'e2e', 'fără câmpul treptei')
o('W04', W, "t(fel === 'panou' ? 'freze.varf.panou' : 'freze.varf')", "t('freze.varf')", 'e2e', 'panoul cu „Vârful plat”')
o('W05', W, "fel === 'ogee' || fel === 'ogee-roman' ? 'freze.motiv.raza.ogee'", "fel === 'ogee-roman' ? 'freze.motiv.raza.ogee'", 'e2e',
  'ogee-ul cu motivul „sub jumătatea diametrului”')
o('W06', W, "max: freza!.fel === 'panou' ? MARGINI_FREZA.unghiPanou : MARGINI_FREZA.unghiMaxim", 'max: MARGINI_FREZA.unghiMaxim', 'e2e',
  'motivul unghiului panoului spune 179°')
o('W07', W, "if (areVarf(f.fel) && f.varf !== undefined) geometria.push(", "if (f.fel === 'gravare' && f.varf !== undefined) geometria.push(", 'e2e',
  'fișa panoului fără fundul plat')

SETURI = {
    'model': ['test/unit/freza.test.ts', 'test/unit/profilFreza.test.ts', 'test/unit/catalogFreze.test.ts'],
    'fisier': ['test/unit/frezeFisier.test.ts'],
}
E2E = ['test/e2e/freze.spec.ts', 'test/e2e/frezeTaiere.spec.ts']
