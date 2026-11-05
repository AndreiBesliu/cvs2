# Sabotajele feliei 3.Xe, formele între cvs2 și extensii (ADR 0166), 05.11.2026: fiecare apărare (permisiunea `forme` și
# serviciul ei, trimiterea selecției: doar instanțele alese, aproximarea la 0,02 mm, plafoanele; fereastra Importă deschisă
# de extensie: „Propus de”, Proiectarea, refuzul „ocupat”; butonul doar cu o extensie care primește forme; planificatorul:
# ridicarea cu găuri, contururile deschise lăsate afară, grosimea, fila „Din cvs2”, „În desenul cvs2” la plăci), stricată o
# dată; proba care o apără trebuie să pice. Alese de autorul feliei: plasa autorului, nu runda independentă.
#
# Lăsate afară:
# - încărcătorul (`shared/cadruExtensie.ts`, `host.forme`): orice schimbare a textului lui schimbă amprenta, deci o prinde
#   `csp.extensii.test.ts` oricare ar fi; învelișul îl folosesc probele e2e cu extensia „Salut”;
# - garda permisiunii din `trimiteForme` (`cadru.ts`): a doua gardă, după cea din fereastra extensiilor (fără permisiune,
#   butonul nu apare, deci nimic nu ajunge la ea); prima are otrava ei (E12);
# - plafonul de 50 000 de puncte al atelierului: o probă cu atâtea puncte ar fi lentă; plafonul ține stocarea mică;
# - refuzul „doar-citire”: o filă care doar citește cere a doua filă deschisă pe același proiect; maparea lui e probată unitar.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


PAC = 'src/extensii/pachet.ts'
FOR = 'src/extensii/forme.ts'
SEL = 'src/extensii/formeSelectie.ts'
CAD = 'src/extensii/cadru.ts'
EXT = 'src/extensii/Extensii.tsx'
APP = 'src/app/App.tsx'
DIA = 'src/ui/DialogImport.tsx'
ARJ = 'src/ui/aranjament.ts'
LEG = 'extensii/trenulet/sursa/lego/lego.ts'
ATE = 'extensii/trenulet/sursa/planificator/atelier.ts'
PLA = 'extensii/trenulet/sursa/planificator/app.ts'
INT = 'extensii/trenulet/intrare.ts'
MAN = 'extensii/trenulet/extensie.json'

E2E = ['test/e2e/extensii.lucru.spec.ts', 'test/e2e/trenulet.spec.ts']

SETURI = {
    'forme': ['test/unit/extensii.forme.test.ts'],
    'pachet': ['test/unit/trenulet.test.ts', 'test/unit/extensii.pachet.test.ts'],
    'aranjament': ['test/unit/aranjament.test.ts'],
    'lego': ['test/unit/trenulet.forme.test.ts'],
    'adaptoare': ['test/unit/trenulet.adaptoare.test.ts'],
}

# permisiunea și serviciul
o('E01', PAC, "export const CATALOG_PERMISIUNI: readonly string[] = ['stocare', 'descarcari', 'masina', 'cont', 'forme'];",
  "export const CATALOG_PERMISIUNI: readonly string[] = ['stocare', 'descarcari', 'masina', 'cont'];", 'pachet',
  'permisiunea `forme` nu mai e în catalog: planificatorul nu se mai instalează')
o('E02', FOR, "  if (!permisiuni.includes('forme')) return refuz('permisiune');\n", '', 'forme',
  'o extensie fără permisiune propune forme pentru desen')
o('E03', FOR, ' || !TIPURI_FORME.includes(tip)) return refuz(', ') return refuz(', 'forme',
  'o extensie propune orice fel de fișier, nu doar SVG sau DXF')
o('E04', FOR, "  if (date.size > PLAFON_IMPORT.octeti) return refuz('prea-mare');\n", '', 'forme',
  'o propunere trece de plafonul importului')
o('E05', FOR, "  return r === null ? { ok: true, rezultat: 'deschis' } : refuz(r);", "  return { ok: true, rezultat: 'deschis' };", 'forme',
  'refuzul aplicației (alt import deschis, fila care doar citește) ajunge la extensie ca reușită')
# trimiterea selecției
o('E06', SEL, '    if (!alese.has(e.instanta)) continue;\n', '', 'forme',
  'pleacă spre extensie toată foaia, nu doar instanțele alese')
o('E07', SEL, '  const pas = raza <= tol ? Math.PI : 2 * Math.acos(1 - tol / raza);', '  const pas = raza <= tol ? Math.PI : 4 * Math.acos(1 - tol / raza);', 'forme',
  'arcele aproximate mai grosolan decât 0,02 mm')
o('E08', SEL, '  if (c.inchis && out.length > 1) out.pop();\n', '', 'forme',
  'un contur închis își repetă la sfârșit primul punct')
o('E09', SEL, '    if (contururi.length >= plafoane.contururi || puncte > plafoane.puncte)', '    if (contururi.length > plafoane.contururi || puncte > plafoane.puncte)', 'forme',
  'plafonul contururilor lasă să treacă unul în plus')
# cadrul, fereastra extensiilor, aplicația
o('E10', CAD, "          : serviciu === 'forme'\n          ? Promise.resolve(servesteFormele(ext.manifest.permisiuni, ext.manifest.nume, metoda, argumente, forme.propune))\n", '', 'e2e',
  'cvs2 nu mai ascultă propunerile de forme ale extensiilor')
o('E11', EXT, "      forme: deschisa.manifest.permisiuni.includes('forme') ? (f) => { pornit.current?.trimiteForme(f); } : null,",
  "      forme: (f) => { pornit.current?.trimiteForme(f); },", 'e2e',
  'butonul „Trimite la <extensie>” apare și pentru o extensie fără permisiunea `forme`')
o('E12', APP, "    if (id === 'extensii.trimite-selectia') return extensie?.forme ? buton(id, atribut, extra, t('actiune.trimite-la', { nume: extensie.nume })) : null;\n",
  "    if (id === 'extensii.trimite-selectia') return buton(id, atribut, extra, t('actiune.trimite-la', { nume: extensie?.nume ?? '' }));\n", 'e2e',
  'butonul „Trimite la” stă în bara selecției și fără nicio extensie deschisă')
o('E13', APP, "    if (coadaImport !== null || dialogDeschis.current) return 'ocupat';\n", '', 'e2e',
  'o propunere a extensiei înlocuiește fișierul ales de om în fereastra Importă deschisă')
o('E14', APP, "    deschideFereastra('proiectare');\n    pornesteImport([f], null, de);\n", "    pornesteImport([f], null, de);\n", 'e2e',
  'fereastra Importă se deschide fără să treacă la Proiectare')
o('E15', APP, "        deschideFereastra(FEREASTRA_EXTENSIE);\n", '', 'e2e',
  'după trimitere, fereastra extensiei nu se arată')
o('E16', DIA, '        {de !== undefined && <p className="mic" data-testid="import-de">{t(\'import.propus-de\', { nume: de })}</p>}\n', '', 'e2e',
  'fereastra Importă nu mai spune ce extensie a propus fișierul')
o('E17', ARJ, "          { actiune: 'extensii.trimite-selectia', aspect: 'eticheta' },\n", '', 'aranjament',
  'butonul „Trimite la <extensie>” nu mai e în bara selecției')
# planificatorul
o('E18', LEG, '    poli.forEach((q, i) => { if (adanc(i) % 2 === 0) tri.push(', '    poli.forEach((q, i) => { if (true) tri.push(', 'lego',
  'găurile formei din cvs2 se ridică și ele, ca niște corpuri')
o('E19', LEG, '(m < 0 || arii[j]! < arii[m]!)', '(m < 0 || arii[j]! > arii[m]!)', 'lego',
  'o insulă dintr-o gaură se socotește gaura conturului din afară, nu a celui care o cuprinde direct')
o('E20', LEG, 'Number.isFinite(g) ? Math.min(50, Math.max(0.4, g)) : 3.2', 'Number.isFinite(g) ? g : 3.2', 'lego',
  'grosimea formei nu mai e ținută între 0,4 și 50 mm')
o('E21', ATE, '      const inchise = f.contururi.filter(c => c.inchis && c.puncte.length >= 3);', '      const inchise = f.contururi.filter(c => c.puncte.length >= 3);', 'e2e',
  'contururile deschise intră și ele în forma de ridicat')
o('E22', ATE, '    if (filaForme) filaForme.hidden = !cuForme;\n', '', 'e2e',
  'fila „Din cvs2” rămâne ascunsă și în cvs2')
o('E23', PLA, '  if (window.cvs2 && window.cvs2.forme) window.cvs2.forme.laPrimire(f => {', '  if (false) window.cvs2!.forme!.laPrimire(f => {', 'e2e',
  'planificatorul nu mai primește formele trimise din desen')
o('E24', PLA, '  const f = (rezCNC.fisiere || []).find(x => x.nume === b.dataset.inDesen);', '  const f = (rezCNC.fisiere || []).find(x => x.nume.endsWith(".dxf"));', 'e2e',
  '„În desenul cvs2” trimite alt DXF decât al plăcii alese')
o('E25', INT, "    forme: typeof host.forme === 'object' && host.forme !== null ? Object.freeze({", '    forme: false ? Object.freeze({', 'adaptoare',
  'pagina nu mai vede formele lui cvs2')
o('E26', MAN, '"permisiuni": ["stocare", "descarcari", "masina", "cont", "forme"]', '"permisiuni": ["stocare", "descarcari", "masina", "cont"]', 'pachet',
  'planificatorul nu mai cere permisiunea `forme`')
o('E27', PLA, '  if (!window.cvs2 || !window.cvs2.forme) return "";\n', '', 'e2e',
  '„În desenul cvs2” apare și pe pagina de sine stătătoare, fără cvs2')
