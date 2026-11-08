# Sabotajele feliei 3.Tg, înălțimile pieselor LEGO din profilul imprimantei (ADR 0168), 08.11.2026: implicitele (1,9 / 2,1),
# locașul din `locas_h` în fiecare din cele șase feluri de fund plin, regulile din `Lego.inaltimi` (zecimile, marginile,
# „urmează știftul”), plăcile de calibrare, atelierul (profilul, câmpurile, bifa, − / +, „Înapoi la implicite”) și
# înălțimile lui v18 fixate în referințe, stricate o dată; proba care le apără trebuie să pice. Alese de autorul feliei:
# plasa autorului, nu runda independentă.
#
# Lăsate afară:
# - textele noi (instrucțiunile calibrării, rândul înălțimilor din CITESTE, sfatul profilului): le apără proba englezei
#   (`trenulet.engleza.test.ts`), nu înțelesul lor; le-am citit pe pagină;
# - stilurile câmpurilor (`head.html`): fără probă de aspect; văzute în pagină.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


LEGO = 'extensii/trenulet/sursa/lego/lego.ts'
ATE = 'extensii/trenulet/sursa/planificator/atelier.ts'
REF = 'extensii/trenulet/sursa/teste/referinte.js'

E2E = ['test/e2e/trenulet.spec.ts']

SETURI = {
    'inaltimi': ['test/unit/trenulet.inaltimi.test.ts'],
    'referinte': ['test/unit/trenulet.referinte.test.ts'],
}

# motorul: implicitele și știftul
o('H01', LEGO, '    stift_h: 1.9, locas_h: 2.1,', '    stift_h: 1.8, locas_h: 2.1,', 'inaltimi',
  'știftul rămâne la 1,8 mm (implicitul de dinainte)')
o('H02', LEGO, '    stift_h: 1.9, locas_h: 2.1,', '    stift_h: 1.9, locas_h: 2.0,', 'inaltimi',
  'locașul rămâne la 2,0 mm')
o('H03', LEGO, 'z - 0.01, z + P.stift_h));', 'z - 0.01, z + 1.8));', 'inaltimi',
  'știfturile nu iau înălțimea din profil')
# locașul, în fiecare fel de fund plin: din nou după știft, ca până la 18.8.0
o('H04', LEGO, '      const ad = Math.min(P.locas_h, H - 0.8);\n      if (gauriSus.length) {',
  '      const ad = Math.min(P.stift_h + 0.2, H - 0.8);\n      if (gauriSus.length) {', 'inaltimi',
  'cărămida cu fund plin: locașul urmează știftul, nu adâncimea din profil')
o('H05', LEGO, 'let ad = Math.min(P.locas_h, z(c[1] - r) - 0.6);', 'let ad = Math.min(P.stift_h + 0.2, z(c[1] - r) - 0.6);', 'inaltimi',
  'panta: locașul urmează știftul')
o('H06', LEGO, '    const ad = Math.min(P.locas_h, H - 0.8);\n    for (const [i, j] of celule) {',
  '    const ad = Math.min(P.stift_h + 0.2, H - 0.8);\n    for (const [i, j] of celule) {', 'inaltimi',
  'panta inversă: locașul urmează știftul')
o('H07', LEGO, 'const ad = Math.min(P.locas_h, H - 0.8), rL =', 'const ad = Math.min(P.stift_h + 0.2, H - 0.8), rL =', 'inaltimi',
  'pana: locașul urmează știftul')
o('H08', LEGO, 'const ad = Math.min(P.locas_h, H - 0.8), N = 64,', 'const ad = Math.min(P.stift_h + 0.2, H - 0.8), N = 64,', 'inaltimi',
  'piesa rotundă: locașul urmează știftul')
o('H09', LEGO, 'c, 0, Math.min(P.locas_h, zj - 0.4)));', 'c, 0, Math.min(P.stift_h + 0.2, zj - 0.4)));', 'inaltimi',
  'cărămida Technic: inelul locașului urmează știftul (capacul rămâne la adâncimea din profil)')
# regulile din Lego.inaltimi
o('H10', LEGO, 'const zecime = (x: number): number => Math.round(x * 10) / 10;', 'const zecime = (x: number): number => Math.round(x);', 'inaltimi',
  'înălțimile se rotunjesc la milimetri întregi, nu la zecimi')
o('H11', LEGO, 'const locas_h = v?.locas_urmeaza !== false ?', 'const locas_h = true ?', 'inaltimi',
  'bifa oprită e ignorată: locașul urmează mereu știftul')
o('H12', LEGO, 'const locas_h = v?.locas_urmeaza !== false ?', 'const locas_h = v?.locas_urmeaza === true ?', 'inaltimi',
  'un profil vechi, fără bifă, nu mai leagă locașul de știft')
o('H13', LEGO, 'const MARGINI_INALTIMI = { stift_h: [1, 3], locas_h: [1, 4] } as const;',
  'const MARGINI_INALTIMI = { stift_h: [0, 9], locas_h: [0, 9] } as const;', 'inaltimi',
  'fără margini: un știft de 0,2 mm sau un locaș de 9 mm trec')
o('H14', LEGO, 'efective: ef, inaltimi, construieste,', 'efective: ef, construieste,', 'inaltimi',
  'motorul nu mai dă regulile înălțimilor (atelierul cade)')
# plăcile de calibrare
o('H15', LEGO, 'const h = zecime(IMPLICIT.stift_h + (v - 3) / 10);', 'const h = zecime(IMPLICIT.stift_h);', 'inaltimi',
  'cele cinci plăci de calibrare au același știft')
o('H16', LEGO, 'const h = zecime(IMPLICIT.stift_h + (v - 3) / 10);', 'const h = zecime(salvat.stift_h + (v - 3) / 10);', 'inaltimi',
  'plăcile de calibrare urmează profilul, deci numerele lor nu mai înseamnă aceleași înălțimi')
o('H17', LEGO, 'P = { ...salvat, stift_h: h, locas_h: zecime(h + 0.2) };', 'P = { ...salvat, stift_h: h };', 'inaltimi',
  'plăcile de calibrare au locașul din profil, nu cu 0,2 sub știftul lor')
# atelierul: profilul, câmpurile, bifa, pașii, implicitele
o('A01', ATE, 'stift_h: 1.9, locas_h: 2.1, locas_urmeaza: true,', 'stift_h: 1.8, locas_h: 2.1, locas_urmeaza: true,', 'inaltimi',
  'atelierul pornește cu alt știft decât motorul')
o('A02', ATE, '"varianta_cupa", "stift_h", "locas_h", "locas_urmeaza"];', '"varianta_cupa"];', 'inaltimi',
  'profilul imprimantei nu ține înălțimile')
o('A03', ATE, 'pat_distanta: setari.pat_distanta, ...Lego.inaltimi(setari) });', 'pat_distanta: setari.pat_distanta });', 'e2e',
  'motorul nu primește înălțimile din atelier: piesa nu crește')
o('A04', ATE, '    // un profil de dinainte de 18.8.0 n-are inaltimile: ia implicitele motorului\n    puneInaltimi(v);\n', '', 'e2e',
  'o imprimantă aleasă nu-și aduce înălțimile')
o('A05', ATE, 'if (String(el.value).trim() !== "" && Number.isFinite(n)) setari[k] = n;',
  'if (String(el.value).trim() !== "" && Number.isFinite(n)) setari[k] = Math.round(n);', 'e2e',
  'o înălțime scrisă se rotunjește la milimetri întregi')
o('A06', ATE, 'if (String(el.value).trim() !== "" && Number.isFinite(n)) setari[k] = n;', 'if (Number.isFinite(n)) setari[k] = n;', 'e2e',
  'un câmp golit devine 0 (adică 1,0 mm, la margine), nu valoarea de acum')
o('A07', ATE, 'x.value = String(setari.locas_h); x.disabled = u; });', 'x.value = String(setari.locas_h); x.disabled = false; });', 'e2e',
  'cu bifa pornită, adâncimea locașului rămâne de scris (și e suprascrisă)')
o('A08', ATE, "if (t.matches('[data-bifa=\"locas_urmeaza\"]')) { setari.locas_urmeaza = (t as HTMLInputElement).checked; inaltimiSchimbate(); return; }\n",
  '', 'e2e', 'bifa „Urmează știftul” nu schimbă nimic')
o('A09', ATE, 'setari[k] = Lego.inaltimi(setari)[k] + Number(b.dataset.d) / 10;', 'setari[k] = Lego.inaltimi(setari)[k] + Number(b.dataset.d) / 100;', 'e2e',
  '− / + mută cu 0,01 mm, deci la zecimi nu se mișcă')
o('A10', ATE, 'setari.locas_h = Lego.IMPLICIT.locas_h; setari.locas_urmeaza = true;', 'setari.locas_h = Lego.IMPLICIT.locas_h; setari.locas_urmeaza = false;', 'e2e',
  '„Înapoi la implicite” lasă locașul dezlegat de știft')
# referințele v18
o('R01', REF, 'const V18 = { stift_h: 1.8, locas_h: 1.8 + 0.2 };', 'const V18 = {};', 'referinte',
  'referințele v18 rulează cu implicitele noi: amprentele nu mai spun dacă restul geometriei a rămas aceeași')
