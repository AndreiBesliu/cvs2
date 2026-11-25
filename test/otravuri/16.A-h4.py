# Lista de otrăvuri a feliei 16.A↑h-4 (felurile noi în bibliotecă și în catalog: bila, toroidala, conica cu vârf rotund,
# burghiul, „în curând în proiect”; ADR 0302 §2), aleasă de autor: felurile cu CAM, raza (felurile, marginile, curățarea),
# capătul pe hârtie, unghiul burghiului, copia pentru document, profilul siluetei, CSV-ul, geometria la punerea din catalog,
# catalogul și fereastra (valorile la schimbarea felului, câmpul razei, etichetele, motivul capătului, „în curând”).
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

# K01, întoarsă la 18.1↑c (25.11): bila are acum CAM prin decizie (ADR 0312, finisarea reliefului); otrava o scoate din
# felurile cu CAM, ca o regresie.
o('K01', F, "export const FELURI_CU_CAM = ['plata', 'v', 'gravare', 'bila'] as const;", "export const FELURI_CU_CAM = ['plata', 'v', 'gravare'] as const;",
  'model', 'bila fără CAM: „în curând” la bilă, scula refuzată în proiect')
o('K02', F, "export const areRaza = (fel: FelFreza): boolean => fel === 'toroidala' || fel === 'conica';",
  "export const areRaza = (fel: FelFreza): boolean => fel === 'toroidala';", 'model', 'conica fără raza vârfului')
o('K03', F, " || (!p.diametru && !(f.raza < f.diametru / 2))) p.raza = 'margini';", ") p.raza = 'margini';", 'model',
  'o rază de Ø / 2 (sau mai mare) trece')
o('K04', F, "    case 'bila': return R;", "    case 'bila': return R / 2;", 'model', 'capătul bilei, jumătate')
o('K05', F, '      return f.raza * (1 - Math.sin(a)) + (R - f.raza * Math.cos(a)) / Math.tan(a);', '      return (R - f.raza * Math.cos(a)) / Math.tan(a);',
  'model', 'capătul conicei fără arcul vârfului')
o('K06', F, '    ...(areRaza(f.fel) ? { raza: f.raza } : {}),', '    raza: f.raza,', 'model', 'raza rămâne pe o bilă')
o('K07', F, "  if (!areCam(f.fel)) throw new Error(`felul ${f.fel} n-are încă CAM: nu se copiază în proiect`);\n", '', 'model',
  'o bilă se copiază în proiect ca o freză plată')
o('K08', F, "export const areUnghi = (fel: FelFreza): boolean => fel === 'v' || fel === 'gravare' || fel === 'conica' || fel === 'burghiu';",
  "export const areUnghi = (fel: FelFreza): boolean => fel === 'v' || fel === 'gravare' || fel === 'conica';", 'model', 'burghiul fără unghi')
o('P01', P, "    case 'bila': return arc(0, R, R, -Math.PI / 2, 0)", "    case 'bila': return arc(0, R, R * 0.9, -Math.PI / 2, 0)", 'model',
  'bila desenată cu altă rază')
o('P02', P, '      const varf = arc(0, rv, rv, -Math.PI / 2, -a)', '      const varf = arc(0, rv, rv, -Math.PI / 2, -a / 2)', 'model',
  'arcul conicei se oprește în alt loc decât tangenta')
o('P03', P, "(i === 0 ? [R - rc, 0] : i === pasi ? [R, rc] : [r, h]))];", "(i === pasi ? [R, rc] : [r, h]))];", 'model',
  'toroidala fără fundul plat drept')
o('C01', C, " ball: 'bila',", '', 'fisier', '„ball” nu se citește')
o('C02', C, "      unghi: nr('unghi'), varf: nr('varf'), raza: nr('raza'),", "      unghi: nr('unghi'), varf: nr('varf'),", 'fisier', 'coloana raza nu se citește')
o('D01', D, "\n    && (!areRaza(a.fel) || egal(a.raza, b.raza));", ';', 'e2e', 'două toroidale cu raze diferite, socotite aceeași')
o('G01', G, "fel: 'burghiu', diametru: d, unghi: 118,", "fel: 'burghiu', diametru: d, unghi: 120,", 'model', 'burghiele catalogului, cu 120°')
o('G02', G, "grupCatalog: 'conica', fel: 'conica', diametru: 6.35,", "grupCatalog: 'conica', fel: 'conica', diametru: 6,", 'model',
  'conicele catalogului pe Ø6, nu pe 1/4"')
o('W01', W, "(f === 'burghiu' ? 118 : f === 'conica' ? 15 : UNGHI_V_IMPLICIT)", "(f === 'conica' ? 15 : UNGHI_V_IMPLICIT)", 'e2e',
  'burghiul nou pornește cu unghiul V-ului')
o('W02', W, "textNumar(x === 'toroidala' ? 1 : 0.5, ro)", "textNumar(0.5, ro)", 'e2e', 'toroidala nouă pornește cu raza 0,5')
o('W03', W, "{areRaza(fel) ? camp('raza', textRaza(fel), t('freze.unitate.mm')) : null}", '{null}', 'e2e', 'fără câmpul razei în editor')
o('W04', W, "{areCam(f.fel) ? null : <span className=\"freze-curand\"> · {t('freze.curand')}</span>}", '{null}', 'e2e',
  'lista nu spune „în curând”')
o('W05', W, "{!areCam(f.fel) ? <p className=\"freze-ajutor freze-curand-nota\" data-freze=\"curand\">{t('freze.curand.nota')}</p> : null}", '{null}',
  'e2e', 'fișa nu spune „în curând”')
o('W06', W, "{areCam(din[0]!.c.fel) ? null : <span className=\"freze-curand\">{t('freze.curand')}</span>}", '{null}', 'e2e',
  'grupul catalogului nu spune „în curând”')
o('W07', W, "t(fel === 'burghiu' ? 'freze.unghi.burghiu' : 'freze.unghi')", "t('freze.unghi')", 'e2e', 'burghiul cu „Unghiul inclus”')
o('W08', W, "t(freza!.fel === 'v' || freza!.fel === 'gravare' ? 'freze.motiv.con' : 'freze.motiv.capat',", "t('freze.motiv.con',", 'e2e',
  'la burghiu, motivul spune „conul”')

SETURI = {
    'model': ['test/unit/freza.test.ts', 'test/unit/profilFreza.test.ts', 'test/unit/catalogFreze.test.ts', 'test/unit/alegereFreza.test.ts'],
    'fisier': ['test/unit/frezeFisier.test.ts'],
}
E2E = ['test/e2e/freze.spec.ts', 'test/e2e/frezeTaiere.spec.ts']
