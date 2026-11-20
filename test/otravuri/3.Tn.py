# Lista de otrăvuri a feliei 3.Tn (conica dublă în atelierul Easy 3Draw, ADR 0280), 20.11.2026, alese de autor: motorul (lățimea,
# banda dreaptă, piciorul adâncit, subțierea de la capete, dintele prins în disc, jocul dintre fața unei roți și discul celeilalte,
# scara spre vârful conului de 45°, straturile, capul dintelui, gaura care nu încape sau iese slabă, plaja dinților, montajul pe
# axe paralele și la 90°, perechea strânsă la 90°) și atelierul (numele cu gaura, dinții repede și din câmp, gaura, perechea doar
# a editorului, „Fă perechea”, montajul spus, perechea strânsă spusă, galeria) și traducerea.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit; setul „e2e” e
# `test/e2e/trenulet.dubla.spec.ts` (pagina de sine stătătoare a planificatorului, din aceleași surse).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


E = 'extensii/trenulet/sursa/lego/lego.ts'
A = 'extensii/trenulet/sursa/planificator/atelier.ts'
T = 'extensii/trenulet/sursa/planificator/texte.en.json'
K = 'const DUBLA = { lat: 8, banda: 2, picior: 2, subtiere: 0.3, inDisc: 0.3, liber: 0.2 };'

# Motorul (unitare).
o('U01', E, K, K.replace('lat: 8', 'lat: 7'), 'dubla', 'lățimea de 7·m, nu de 8 (montajul la 90° nu mai cade pe grilă)')
o('U02', E, K, K.replace('banda: 2', 'banda: 1'), 'dubla', 'banda dreaptă de ±1·m (dinții micșorați și unde trebuie să fie ai rotiței)')
o('U03', E, K, K.replace('picior: 2', 'picior: 1.25'), 'dubla', 'piciorul obișnuit (discul unei roți intră în dinții celeilalte, la 90°)')
o('U04', E, K, K.replace('subtiere: 0.3', 'subtiere: 0.1'), 'dubla',
  'subțierea de 0,1·m de la început (la jocul cel mai mic din calibrare, 12 cu 28 și 12 cu 36 se pătrund la 90°)')
o('U05', E, K, K.replace('inDisc: 0.3', 'inDisc: -0.5'), 'dubla', 'dinții nu mai pornesc din disc (rămân în aer, la 0,5 mm de el)')
o('U06', E, K, K.replace('liber: 0.2', 'liber: 0'), 'dubla', 'fața unei roți tangentă la discul celeilalte, la 90°')
o('U07', E, 'const sf = (ub + rp - w / 2) / rp,', 'const sf = 1,', 'dubla', 'dinții drepți până la fețe (la 90° se pătrund)')
o('U08', E, 'zs = [0, w / 2 - ub, w / 2 + ub, w]', 'zs = [0, w / 2 - ub / 2, w / 2 + ub / 2, w]', 'dubla', 'straturile benzii la ±1·m, nu la ±2·m')
o('U09', E, 'return [...dr, pol(R.ra, c), ...st.reverse()];', 'return [...dr, pol(R.ra - 0.3 * m, c), ...st.reverse()];', 'dubla',
  'mijlocul capului dintelui mai jos (capul retezat)')
o('U10', E, 'const d = DUBLA.subtiere * m * t, h = (i: number) => Math.max(jum[i]! - d / raze[i]!, jum[i]! / 4)',
  'const d = DUBLA.subtiere * m * t, h = (i: number) => Math.max(jum[i]! - d * raze[i]!, jum[i]! / 4)', 'dubla', 'subțierea socotită greșit (înmulțită cu raza)')
o('U11', E, 'if (G.lipseste) avert.push(tr`Gaura nu încape în conica asta dublă', 'if (false) avert.push(tr`Gaura nu încape în conica asta dublă', 'dubla',
  'gaura care nu încape, nespusă')
o('U12', E, 'else if (G.slaba) avert.push(tr`Între gaură și marginea discului', 'else if (false) avert.push(tr`Între gaură și marginea discului', 'dubla',
  'peretele subțire dintre gaură și disc, nespus')
o('U13', E, 'const z = Math.round(Math.min(60, Math.max(8, nr(dinti, 12))))', 'const z = Math.round(Math.min(80, Math.max(8, nr(dinti, 12))))', 'dubla',
  'plaja dinților până la 80')
o('U14', E, 'return { z: a.z, z2: b.z, m: a.m, paralel: a.rp + b.rp,', 'return { z: a.z, z2: b.z, m: a.m, paralel: a.rp + b.rp + a.m,', 'dubla',
  'axele paralele mai departe cu un modul')
o('U15', E, 'acesta: b.rp + DUBLA.banda * a.m, perechea: a.rp + DUBLA.banda * a.m, strans };', 'acesta: a.rp + DUBLA.banda * a.m, perechea: a.rp + DUBLA.banda * a.m, strans };',
  'dubla', 'la 90°, planul de mijloc socotit cu raza roții de acum, nu a perechii')
o('U16', E, 'G = gauraRoata(disc, gaura);', 'G = gauraRoata(disc, "nu");', 'dubla', 'fără gaură, oricare ar fi cea aleasă')
# După recenzie (jocul perechilor la 90°, la marginile calibrării): subțierea de 0,3·m și perechea strânsă.
o('U17', E, K, K.replace('subtiere: 0.3', 'subtiere: 0'), 'dubla', 'fără subțierea de la fețe (12 cu 36 se pătrund la 90° și la jocul obișnuit)')
o('U18', E, 'strans = mic < 12 && Math.max(a.z, b.z) > 2.5 * mic;', 'strans = mic < 8 && Math.max(a.z, b.z) > 2.5 * mic;', 'dubla',
  'perechea strânsă nespusă niciodată')
o('U19', E, 'strans = mic < 12 && Math.max(a.z, b.z) > 2.5 * mic;', 'strans = mic < 12 && Math.max(a.z, b.z) > 3.5 * mic;', 'dubla',
  'perechea strânsă spusă prea târziu (8 cu 24 nespusă, deși se pătrunde)')
o('U20', E, 'strans = mic < 12 && Math.max(a.z, b.z) > 2.5 * mic;', 'strans = mic <= 12 && Math.max(a.z, b.z) > 2.5 * mic;', 'dubla',
  'perechea strânsă spusă și la 12 dinți (12 cu 36 are tot jocul)')

# Atelierul (e2e).
o('E01', A, 'return tr`Conică dublă ${d.dinti ?? 12}${g}', 'return tr`Conică dublă ${d.dinti ?? 12}', 'e2e', 'gaura nespusă în numele conicei duble')
o('E02', A, 'alege("#at-cd-repede", v => { p.dinti = +v; });', 'alege("#at-cd-repede", v => { p.dinti = 12; });', 'e2e', 'dinții repede nu schimbă nimic')
o('E03', A, 'if (v >= 8 && v <= 60) { p.pereche = v; editor(); } };', 'if (v >= 8 && v <= 60) { p.pereche = 12; editor(); } };', 'e2e',
  'dinții perechii: câmpul nu schimbă montajul')
o('E04', A, 'a: Def = { ...d, dinti: z2 }, m = Lego.dublaMontaj(d, z2);', 'a: Def = { ...d }, m = Lego.dublaMontaj(d, z2);', 'e2e',
  '„Fă perechea” pune aceeași roată de două ori')
o('E05', A, 'mm de axul perechii, ${textGrila(a.acesta)}; al perechii', 'mm de axul perechii, ${textGrila(a.perechea)}; al perechii', 'e2e',
  'grila spusă pentru planul perechii, nu al acesteia')
o('E06', A, '["conicaDubla", "Conică dublă"], ', '', 'e2e', 'conica dublă lipsește din galerie')
o('E07', A, 'camp("#at-cd-dinti", 8, 60, v => { p.dinti = Math.round(v); });', 'camp("#at-cd-dinti", 8, 60, v => { p.dinti = 12; });', 'e2e',
  'dinții: câmpul nu schimbă nimic')
o('E08', A, 'alege("#at-cd-gaura", v => { p.gaura = v; });', 'alege("#at-cd-gaura", v => { p.gaura = "x"; });', 'e2e', 'gaura: alegerea nu schimbă nimic')
o('E09', A, 'if (t === "conicaDubla") { delete p.pereche;', 'if (t === "conicaDubla") {', 'e2e',
  'perechea intră în piesă (aceeași roată, cu altă pereche, e altă piesă în listă)')
o('E10', A, 'strans = a.strans ? tr` La 90°, perechea asta se prinde strâns', 'strans = false ? tr` La 90°, perechea asta se prinde strâns', 'e2e',
  'perechea strânsă la 90°, nespusă în montaj')

# Traducerea (unitare).
o('T01', T, '"Conică dublă": "Double bevel gear",', '"Conică dublă": "",', 'engleza', 'numele conicei duble, netradus')

SETURI = {
    'dubla': ['test/unit/trenulet.dubla.test.ts'],
    'engleza': ['test/unit/trenulet.engleza.test.ts'],
}
E2E = ['test/e2e/trenulet.dubla.spec.ts']
for x in O:
    assert x['vechi'] != x['nou'], x['id']
