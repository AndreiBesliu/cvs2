# Otrăvurile feliei 3.Au (imprimanta: starea lucrării e necunoscută până vine codul stării; 25.11.2026, după completul
# 45613398666, căzut la proba utilizării imprimantei cu un „pornită” în plus), alese de autor: condiția veche (toate trei
# necunoscute), codul lipsă cu fișierul sau cu progresul știut, autotestul judecat înaintea codului, lucrarea găsită în curs
# după o clipă necunoscută. Cele unitare se rulează cu `scripts/otravuri.py`; cea de pe emulatoare (E01), cu
# `scripts/otravuri-emulatoare.py`, în `firebase emulators:exec`, dintr-o clonă, după commit.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


CR = 'src/machine/imprimanta/creality.ts'
UI = 'src/app/utilizareImprimanta.ts'
COD = "  if (i.cod === null) return 'necunoscuta';"

o('S01', CR, COD, "  if (i.cod === null && i.fisier === null && i.progres === null) return 'necunoscuta';", 'u',
  'condiția veche: o bucată doar cu progresul face imprimanta „liberă”')
o('S02', CR, COD, "  if (i.cod === null && i.fisier === null) return 'necunoscuta';", 'u',
  'fără cod, dar cu fișierul știut, starea nu mai e necunoscută')
o('S03', CR, COD, "  if (i.cod === null && i.progres === null) return 'necunoscuta';", 'u',
  'fără cod, dar cu progresul știut, starea nu mai e necunoscută')
o('S04', CR, COD + "\n  if (i.autotest !== null && i.autotest >= 1 && i.autotest <= 99) return 'autotest';",
  "  if (i.autotest !== null && i.autotest >= 1 && i.autotest <= 99) return 'autotest';\n" + COD, 'u',
  'autotestul, judecat înaintea codului stării')
o('S05', CR, COD, "  if (i.cod === null) return 'libera';", 'u',
  'fără cod, imprimanta e spusă liberă')
o('U01', UI, "a.legatura === 'vie' && a.lucrare !== 'necunoscuta' && lucrareNoua(a, b)", "a.legatura === 'vie' && lucrareNoua(a, b)", 'u',
  'o lucrare găsită în curs după o clipă necunoscută e spusă „pornită”')
o('E01', CR, COD, "  if (i.cod === null && i.fisier === null && i.progres === null) return 'necunoscuta';", 'e2e',
  'în browser, cu bucata de progres sosită înaintea stării întregi: „pornită” în plus în utilizare')

SETURI = {'u': ['test/unit/imprimanta.creality.test.ts', 'test/unit/utilizare.dispozitive.test.ts']}
E2E = ['test/e2e-emulator/utilizare.emulator.spec.ts']
GREP = {'E01': 'imprimanta (felia A.8d)'}
