# Lista de otrăvuri a feliei A.8d (calculele lungi, mașina și imprimanta în utilizarea aplicației; ADR 0262 §1, §2),
# 23.11.2026, alese de autor: contractul felurilor noi (treptele, câmpurile fiecărui fel, codul și felul legăturii doar unde
# au sens), treptele însele, înregistratorul (treptele făcute în client, codul din afara marginilor), bazinul și observatorul
# (anularea, formele, un document stricat, un ascultător care aruncă), mașina și imprimanta din stările la rând (pornită sau
# reluată, anulată, codurile, suspendarea, felul legăturii, legătura revenită, lucrarea găsită în curs, pauza din fișier) și
# cap-coadă, pe emulatoare (observatorul pus din pornire, importul, mașina simulată, imprimanta falsă, treptele din client).
# Unitarele se rulează cu `scripts/otravuri.py`; cele de pe emulatoare cu `scripts/otravuri-emulatoare.py` (docs/otravuri.md),
# dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


S = 'shared/utilizare.ts'
L = 'src/app/utilizareLot.ts'
B = 'src/jobs/bazinCam.ts'
OB = 'src/jobs/observatorCalcul.ts'
MA = 'src/app/utilizareMasina.ts'
IM = 'src/app/utilizareImprimanta.ts'
M = 'src/app/main.tsx'
IC = 'src/app/ImportConectat.tsx'
IL = 'src/app/IndicatorLucrare.tsx'
V = 'src/app/VestiriImprimanta.tsx'

# Contractul și treptele (unitare; serverul folosește aceeași funcție).
o('D01', S, '!treapta(TREPTE_MS, ms)', "typeof ms !== 'number'", 'contract', 'o durată exactă (nu o treaptă) trece')
o('D02', S, "if (forme !== undefined && (i === 'import' || !treapta(TREPTE_MARIME, forme))) return null;",
  'if (forme !== undefined && !treapta(TREPTE_MARIME, forme)) return null;', 'contract', 'importul vine și cu formele')
o('D03', S, "if (octeti !== undefined && (i !== 'import' || !treapta(TREPTE_MARIME, octeti))) return null;",
  'if (octeti !== undefined && !treapta(TREPTE_MARIME, octeti)) return null;', 'contract', 'un calcul CAM vine cu octeți')
o('D04', S, "if (format !== undefined && (i !== 'import' || !din(FORMATE_IMPORT, format))) return null;",
  'if (format !== undefined && !din(FORMATE_IMPORT, format)) return null;', 'contract', 'un calcul CAM vine cu un format de fișier')
o('D05', S, "if (cod !== undefined && ((i !== 'eroare' && i !== 'alarma') || !intreg(cod, 0, COD_MAX))) return null;",
  'if (cod !== undefined && !intreg(cod, 0, COD_MAX)) return null;', 'contract', 'un cod pe orice eveniment al mașinii')
o('D06', S, "if (cale !== undefined && (i !== 'legata' || !din(CAI_MASINA, cale))) return null;",
  'if (cale !== undefined && !din(CAI_MASINA, cale)) return null;', 'contract', 'felul legăturii pe orice eveniment al mașinii')
o('D07', S, "if (!cheiExact(o, ['fel', 't', 'id'], ['cod', 'cale'])) return null;", "if (!cheiExact(o, ['fel', 't', 'id'], ['cod', 'cale', 'adresa'])) return null;",
  'contract', 'adresa mașinii trece')
o('D08', S, "if (cod !== undefined && (i !== 'eroare' || !intreg(cod, 0, COD_MAX))) return null;",
  'if (cod !== undefined && !intreg(cod, 0, COD_MAX)) return null;', 'contract', 'un cod pe orice eveniment al imprimantei')
o('D09', S, 'TREPTE_MS.find((x) => ms < x)', 'TREPTE_MS.find((x) => ms <= x)', 'contract', 'o durată pe margine cade în treapta de dedesubt')
o('D10', S, 'TREPTE_MARIME.find((x) => n < x) ?? TREPTE_MARIME[TREPTE_MARIME.length - 1] ?? 0', 'TREPTE_MARIME.find((x) => n < x) ?? 0',
  'contract', 'o mărime peste ultima treaptă devine 0')

# Înregistratorul, bazinul, observatorul, mașina și imprimanta (unitare).
o('R01', L, '...(ev.forme === undefined ? {} : { forme: treaptaMarime(ev.forme) }),', '...(ev.forme === undefined ? {} : { forme: ev.forme }),', 'disp',
  'formele pleacă exacte, nu în trepte')
o('R02', L, '&& ev.cod >= 0 && ev.cod <= COD_MAX)', '&& ev.cod >= 0)', 'disp', 'un cod uriaș rămâne: serverul aruncă tot evenimentul')
o('B01', B, "    spune(e instanceof CalculAnulat ? 'anulat' : 'eroare');", "    spune('eroare');", 'disp', 'un calcul anulat e numărat ca eroare')
o('B02', B, '    spuneCalculul({ fel: cerere.fel, ms: performance.now() - pornit, rez, ...(forme === undefined ? {} : { forme }) });',
  '    spuneCalculul({ fel: cerere.fel, ms: performance.now() - pornit, rez });', 'disp', 'formele documentului nu se spun')
o('B03', B, '  try {\n    return numara(d).elementeLume;\n  } catch {\n    return undefined;\n  }', '  return numara(d).elementeLume;', 'disp',
  'un document stricat oprește calculul în numărare, înaintea workerului')
o('B04', B, "    spune('ok');\n    return r;", '    return r;', 'disp', 'un calcul reușit nu se spune')
o('B05', OB, '  try {\n    observator?.(c);\n  } catch {', '  {\n    observator?.(c);\n  } if (0) {', 'disp',
  'un ascultător care aruncă strică un calcul reușit')
o('M01', MA, "r.push({ id: IN_LUCRARE.has(ia) ? 'reluata' : 'pornita' });", "r.push({ id: 'pornita' });", 'disp',
  'reluarea după o pauză e numărată ca o lucrare nouă')
o('M02', MA, "else if (ib === 'conectata' && IN_LUCRARE.has(ia)) r.push({ id: 'anulata' });", "else if (ib === 'conectata') r.push({ id: 'anulata' });",
  'disp', 'legarea și finalul par anulări')
o('M03', MA, 'if (b.cod !== null && b.cod.nr !== a?.cod?.nr)', 'if (b.cod !== null)', 'disp', 'același cod se spune la fiecare stare')
o('M04', MA, "b.cod.fel === 'blocare' ? { id: 'blocare' } : { id: b.cod.fel, cod: b.cod.cod }", '{ id: b.cod.fel, cod: b.cod.cod }', 'disp',
  'blocarea vine cu un cod 0, pe care contractul îl refuză: se pierde')
o('M05', MA, "else if (ib === 'pauza' || ib === 'suspendata')", "else if (ib === 'pauza')", 'disp', 'suspendarea nu e o pauză')
o('M06', MA, "r.push(b.transport === null ? { id: 'legata' } : { id: 'legata', cale: b.transport });", "r.push({ id: 'legata' });", 'disp',
  'felul legăturii (USB, WiFi, simulată) se pierde')
o('M07', MA, "  if (legataA && !legataB) r.push({ id: 'deconectata' });\n", '', 'disp', 'deconectarea nu se spune')
# Lucrarea scurtă (reparația din 24.11, după completul de noapte căzut pe emulatoare: „pornita” lipsea).
o('M08', MA, "    if (LIBERA.has(ia) && DUPA_PORNIRE.has(ib)) r.push({ id: 'pornita' });\n", '', 'disp',
  'o lucrare terminată între două stări văzute nu e socotită pornită')
o('M09', MA, "new Set<FelIndicator | null>(['conectata', 'gata']);", "new Set<FelIndicator | null>(['conectata']);", 'disp',
  'a doua lucrare, scurtă, după una terminată nu e socotită pornită')
o('M10', MA, "new Set<FelIndicator | null>(['pauza', 'suspendata', 'oprita', 'oprita-m6', 'gata', 'intrerupta']);",
  "new Set<FelIndicator | null>(['gata']);", 'disp', 'pornirea se ghicește doar la capăt, nu și la pauză, oprire sau întrerupere')
o('M11', MA, "    if (LIBERA.has(ia) && DUPA_PORNIRE.has(ib)) r.push({ id: 'pornita' });\n", "    if (DUPA_PORNIRE.has(ib)) r.push({ id: 'pornita' });\n", 'disp',
  'pornirea se spune la fiecare pauză și la capăt, și când lucrarea era văzută')
o('I01', IM, "(a === null || a.legatura === 'alta')", "(a === null || a.legatura !== 'vie')", 'disp', 'o legătură pierdută care revine e o legare nouă')
o('I02', IM, "if (a !== null && a.legatura === 'vie' && a.lucrare !== 'necunoscuta' && lucrareNoua(a, b))", 'if (lucrareNoua(a, b))', 'disp',
  'o lucrare găsită în curs la legare e numărată ca pornită aici')
o('I03', IM, "e.fel === 'eroare' && e.cheie !== null ? { id: 'eroare', cod: e.cheie } : { id: ID[e.fel] }", '{ id: ID[e.fel] }', 'disp',
  'eroarea imprimantei vine fără cheia ei')
o('I04', IM, "pauzaFisier: 'pauza-fisier'", "pauzaFisier: 'pauza'", 'disp', 'pauza din fișier nu se deosebește de cea a omului')
o('I05', IM, "  if (a !== null && a.legatura !== 'alta' && b.legatura === 'alta') r.push({ id: 'deconectata' });\n", '', 'disp',
  'deconectarea imprimantei nu se spune')

# Cap-coadă, pe emulatoare.
o('E01', M, "  observaCalculele(({ fel, ms, rez, forme }) => {\n", "  void (({ fel, ms, rez, forme }) => {\n", 'e2e',
  'pornirea nu pune observatorul: calculele bazinului nu se înregistrează')
o('E02', IC, "      spune(r.ok ? 'ok' : 'eroare');\n      setDialog", '      setDialog', 'e2e', 'importul citit nu se înregistrează')
o('E03', IC, 'octeti: f.octeti.length,', 'octeti: f.nume.length * 1000,', 'e2e', 'octeții importului nu sunt ai fișierului')
o('E04', IL, "    for (const e of evenimenteMasina(inainte.current, st)) utilizarea.eveniment({ fel: 'masina', ...e });\n", '', 'e2e',
  'mașina nu se înregistrează')
o('E05', IL, '    inainte.current = st;\n', '', 'e2e', 'fiecare stare a mașinii e comparată cu nimic: legarea se repetă')
o('E06', V, "    for (const e of evenimenteImprimanta(a, clipa)) utilizarea.eveniment({ fel: 'imprimanta', ...e });\n", '', 'e2e',
  'imprimanta nu se înregistrează')
o('E07', L, '      const x = evenimentDin(inTrepte(ev), Number.MAX_SAFE_INTEGER);', '      const x = evenimentDin(ev, Number.MAX_SAFE_INTEGER);', 'e2e',
  'înregistratorul nu face treptele: calculele, cu valorile exacte, nu trec de lista albă')

SETURI = {
    'contract': ['test/unit/utilizare.contract.test.ts'],
    'disp': ['test/unit/utilizare.dispozitive.test.ts'],
}
E2E = ['test/e2e-emulator/utilizare.emulator.spec.ts']
CALC = (E2E[0], 'calculele și mașina')
IMPR = (E2E[0], 'pauza și reluarea, deconectarea')
GREP = {'E01': CALC, 'E02': CALC, 'E03': CALC, 'E04': CALC, 'E05': CALC, 'E06': IMPR, 'E07': CALC}
