# Sabotajele feliei 3.Td, three.js în pachetul extensiei (ADR 0163), 04.11.2026: fiecare apărare (fișierul în pachet, octet
# cu octet cel de pe cdnjs, cu licența lângă el; intrarea care îl aduce la cerere, o singură dată; atelierul care îl cere în
# cvs2; pagina de sine stătătoare fără el), stricată o dată; proba care o apără trebuie să pice. Alese de autorul feliei:
# plasa autorului, nu runda independentă.
#
# Lăsate afară:
# - eșecul încărcării scriptului (null, cu eroarea raportată): în probele unitare, scriptul nu se poate încărca fără
#   document, iar în cadru three.js vine mereu din pachet;
# - textul pentru pachetul fără three.js („pachetul extensiei n-are three.js”): un pachet construit din aceste surse îl are.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


CON = 'scripts/construieste-trenulet.ts'
INT = 'extensii/trenulet/intrare.ts'
ATE = 'extensii/trenulet/sursa/planificator/atelier.ts'
THREE = 'extensii/trenulet/sursa/vendor/three.min.js'

E2E = ['test/e2e/trenulet.spec.ts']

SETURI = {
    'constructie': ['test/unit/trenulet.test.ts'],
    'adaptoare': ['test/unit/trenulet.adaptoare.test.ts'],
}

o('D01', CON, "    ['js/three.js', new Uint8Array(readFileSync(join(SURSA, 'vendor', 'three.min.js')))],\n", '', 'constructie',
  'three.js lipsește din pachet')
o('D02', CON, "    ['licente/three.txt', octeti(citeste('vendor', 'three.LICENSE'))],\n", '', 'constructie',
  'licența MIT nu mai stă lângă three.js')
o('D03', THREE, ' * @license\n', ' * @licence\n', 'constructie',
  'three.js nu mai e octet cu octet cel de pe cdnjs')
o('D04', INT, "const SCRIPTURI = ['cavalier.js', 'cnc.js', 'gcode.js', 'earcut.js', 'lego.js', 'profiluri.js', 'atelier.js', 'app.js'];",
  "const SCRIPTURI = ['cavalier.js', 'cnc.js', 'gcode.js', 'earcut.js', 'lego.js', 'profiluri.js', 'atelier.js', 'app.js', 'three.js'];", 'constructie',
  'three.js se încarcă odată cu pagina, nu la prima intrare în 3D')
o('D05', INT, '  return () => (gata ??= (async () => {', '  return () => ((async () => {', 'adaptoare',
  'fiecare cerere aduce three.js din nou')
o('D06', INT, "    const f = host.fisier('js/three.js');", "    const f = host.fisier('three.js');", 'adaptoare',
  'intrarea caută three.js în alt loc din pachet')
o('D07', INT, "  const cvs2 = { gazda: 'cvs2', masina: cuMasina ? host.masina : null, three: threePeste(host, w) };",
  "  const cvs2 = { gazda: 'cvs2', masina: cuMasina ? host.masina : null };", 'adaptoare',
  'pagina nu primește `three` de la gazdă')
o('D08', ATE, '      if (!promisiuneThree) promisiuneThree = window.cvs2.three().then(T => {',
  '      if (!promisiuneThree) promisiuneThree = Promise.resolve(null).then(T => {', 'e2e',
  'atelierul nu mai cere three.js de la gazdă: vederea 3D lipsește în cvs2')
