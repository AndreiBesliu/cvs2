# Lista de otrăvuri a feliei 16.A↑e-3a (canelura cu bila și cu toroidala: profilul pe linie; ADR 0303 §4), 27.11.2026, aleasă
# de autor: regula formei pe operație, refuzurile lucrării (doar freza canelurii, doar pe linie), scula din IR cu forma și raza,
# același T cu altă rază a colțului, listele care pun o freză pe o operație cu rând în fereastra exportului (doar formele pe
# care rândul le poartă) și numele frezei în raportul foilor. Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o
# clonă, după commit. o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


FF = 'src/model/formaFrezei.ts'
JB = 'src/cam/job.ts'
AF = 'src/model/alegereFreza.ts'
RF = 'src/model/raportFoi.ts'

o('C01', FF, "  if ((forma?.tip === 'bila' || forma?.tip === 'toroidala') && tip === 'profil' && latura === 'pe-linie') return null;\n", '',
  'can', 'canelura cu bila și cu toroidala refuzată mai departe')
o('C02', FF, "  if ((forma?.tip === 'bila' || forma?.tip === 'toroidala') && tip === 'profil' && latura === 'pe-linie') return null;",
  "  if ((forma?.tip === 'bila' || forma?.tip === 'toroidala') && tip === 'profil') return null;", 'can',
  'formele rotunde primite pe o parte: peretele n-ar ieși unde e desenat')
o('C03', JB, "      const canelura = o.tip === 'profil' && o.latura === 'pe-linie';", "      const canelura = o.tip === 'profil';", 'can',
  'lucrarea taie toroidala și bila pe un profil exterior sau interior')
o('C04', JB, "          if (scula.forma?.tip === 'bila' && !(canelura && cale === 'scula')) {", "          if (scula.forma?.tip === 'bila') {", 'can',
  'canelura cu bila refuzată de lucrare')
o('C05', JB, "  ...(s.forma?.tip === 'toroidala' ? { forma: { tip: 'toroidala' as const, raza: s.forma.raza } } : {}),\n", '', 'can',
  'toroidala pierde forma în IR: simularea și raportul o văd plată')
o('C06', JB, "{ forma: { tip: 'toroidala' as const, raza: s.forma.raza } }", "{ forma: { tip: 'toroidala' as const, raza: s.forma.raza / 2 } }", 'can',
  'raza colțului înjumătățită în IR')
o('C07', JB, "    : s.forma?.tip === 'toroidala' ? `toroidală cu raza colțului ${s.forma.raza} mm` : felFrezei(s.forma));",
  "    : felFrezei(s.forma));", 'can', 'două toroidale cu raze diferite sub același T: aceeași freză (omul ar monta una singură)')
o('C08', AF, "    return formaPeRand(forma) && randuri.some((o) => motivFormaPeOperatie(o.tip, o.latura, forma) === null);",
  "    return randuri.some((o) => motivFormaPeOperatie(o.tip, o.latura, forma) === null);", 'lista',
  'bila pe rândurile exportului: copia ferestrei ar face din ea o plată')
o('C09', AF, "    return operatii.every((o) => motivFormaPeOperatie(o.tip, o.latura, forma) === null && (!cuRand(o) || formaPeRand(forma)));",
  "    return operatii.every((o) => motivFormaPeOperatie(o.tip, o.latura, forma) === null);", 'lista',
  'Tăierea oferă bila pe o canelură: operația ar rămâne fără rând în fereastra exportului')
o('C10', RF, "      ...(o.scula.forma?.tip === 'toroidala' ? { toroidala: o.scula.forma.raza } : {}),\n", '', 'can',
  'raportul foilor numește toroidala ca pe o plată de același Ø')

SETURI = {
    'can': ['test/unit/canelura.rotunda.test.ts', 'test/unit/toroidala.lucrare.test.ts', 'test/unit/finisare.bila.test.ts'],
    'lista': ['test/unit/alegereFreza.test.ts', 'test/unit/exportFreze.bila.test.ts'],
}

E2E = []
