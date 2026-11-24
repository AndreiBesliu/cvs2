# Lista de otrăvuri a feliei 3.Cc (cremaliera din atelierul Easy 3Draw; ADR 0284), 24.11.2026, alese de autor: motorul
# (profilul dinților, câți încap și unde stau, înălțimea liniei de divizare după roata pereche, cele două prinderi, marginile
# și avertismentele) și atelierul (familia și desenul, numele, montajul scris, marginile câmpurilor, perechea din listă).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


LG = 'extensii/trenulet/sursa/lego/lego.ts'
AT = 'extensii/trenulet/sursa/planificator/atelier.ts'
EN = 'extensii/trenulet/sursa/planificator/texte.en.json'

# --- motorul: profilul dinților
DINTE = 'const L = P.pas * n - 0.2, t = Math.PI * m / 2 - 2 * e.jocDinti, cap = Math.min(m, (t / 2 - 0.1) / tg), wr = t + 2.5 * m * tg, p = Math.PI * m;'
o('C01', LG, DINTE, DINTE.replace('t = Math.PI * m / 2 - 2 * e.jocDinti', 't = Math.PI * m / 2 + 2 * e.jocDinti'), 'cremaliera',
  'dintele e mai gros decât golul roții: se pătrunde')
o('C02', LG, DINTE, DINTE.replace('t = Math.PI * m / 2 - 2 * e.jocDinti', 't = Math.PI * m / 2'), 'cremaliera',
  'dintele n-are jocul din calibrare')
o('C03', LG, 'tg = Math.tan(20 * Math.PI / 180);', 'tg = Math.tan(25 * Math.PI / 180);', 'cremaliera',
  'flancurile sunt la 25°, nu la 20°')
o('C04', LG, DINTE, DINTE.replace('cap = Math.min(m, (t / 2 - 0.1) / tg)', 'cap = Math.min(1.25 * m, (t / 2 - 0.1) / tg)'), 'cremaliera',
  'capul dintelui e mai înalt: atinge fundul golului roții')
o('C05', LG, DINTE, DINTE.replace('cap = Math.min(m, (t / 2 - 0.1) / tg)', 'cap = m'), 'cremaliera',
  'la modulul mic, capul nu mai e scurtat: dintele iese ascuțit')
o('C06', LG, DINTE, DINTE.replace('p = Math.PI * m;', 'p = 3.2 * m;'), 'cremaliera',
  'pasul dinților e pe grilă (3,2), nu π · m')
o('C07', LG, DINTE, DINTE.replace('wr = t + 2.5 * m * tg', 'wr = t + 2 * m * tg'), 'cremaliera',
  'piciorul dintelui e mai îngust decât flancurile lui')
o('C08', LG, 'zr: zp - 1.25 * m, za: zp + cap, axa: zp + m * z / 2,', 'zr: zp - m, za: zp + cap, axa: zp + m * z / 2,', 'cremaliera',
  'golul dintre dinți e mai puțin adânc: capul roții atinge fundul')
o('C09', LG, 'jr = q.wr / 2, jc = q.t / 2 - q.cap * q.tg;', 'jr = q.wr / 2, jc = q.t / 2;', 'cremaliera',
  'dintele e drept deasupra liniei de divizare')
o('C10', LG, 'jr = q.wr / 2, jc = q.t / 2 - q.cap * q.tg;', 'jr = q.t / 2, jc = q.t / 2 - q.cap * q.tg;', 'cremaliera',
  'dintele e drept sub linia de divizare')
# --- motorul: câți dinți și unde
o('C11', LG, 'const N = Math.floor((L - wr) / p + 1e-9) + 1;', 'const N = Math.floor(L / p);', 'cremaliera',
  'numărul dinților e socotit fără lățimea piciorului')
o('C12', LG, 'const N = Math.floor((L - wr) / p + 1e-9) + 1;', 'const N = Math.floor((L - wr) / p + 1e-9) + 2;', 'cremaliera',
  'un dinte în plus: nu mai încap întregi')
o('C13', LG, 'const xc = mij + (i - (q.N - 1) / 2) * q.p,', 'const xc = x0 + q.wr / 2 + i * q.p,', 'cremaliera',
  'dinții pornesc de la capăt, nu stau pe mijloc')
# --- motorul: înălțimea liniei de divizare
o('C14', LG, 'while (baza + treapta * k - m * z / 2 < minim - 1e-9) k++;', 'while (baza + treapta * k - m * z / 2 < minim - 1) k++;', 'cremaliera',
  'nivelul e mai jos cu o treaptă: sub dinți nu rămâne lemn')
o('C15', LG, 'while (baza + treapta * k - m * z / 2 < minim - 1e-9) k++;', 'while (baza + treapta * k - m * z / 2 < minim + 3) k++;', 'cremaliera',
  'nivelul e mai sus decât trebuie')
o('C16', LG, 'const baza = gauri ? P.grinda_groasa / 2 : P.technic_h, treapta = gauri ? P.pas : P.placa;', 'const baza = gauri ? P.technic_h : P.grinda_groasa / 2, treapta = gauri ? P.pas : P.placa;', 'cremaliera',
  'gaura cărămizii Technic și gaura grinzii sunt încurcate')
o('C17', LG, 'const baza = gauri ? P.grinda_groasa / 2 : P.technic_h, treapta = gauri ? P.pas : P.placa;', 'const baza = gauri ? P.grinda_groasa / 2 : P.technic_h, treapta = P.placa;', 'cremaliera',
  'la prinderea cu găuri, treapta e o placă, nu un pas')
o('C18', LG, 'const minim = (gauri ? P.grinda_groasa / 2 + e.lamajD / 2 + 0.8 : P.placa + 0.5) + 1.25 * m;', 'const minim = (gauri ? P.grinda_groasa / 2 + e.lamajD / 2 + 0.8 : P.placa + 1.5) + 1.25 * m;', 'cremaliera',
  'pe știfturi, lemnul cerut sub dinți e mai gros')
o('C19', LG, 'const minim = (gauri ? P.grinda_groasa / 2 + e.lamajD / 2 + 0.8 : P.placa + 0.5) + 1.25 * m;', 'const minim = (gauri ? P.grinda_groasa / 2 + e.gauraD / 2 : P.placa + 0.5) + 1.25 * m;', 'cremaliera',
  'cu găuri, dinții coboară până la lamajul găurii')
o('C20', LG, 'zr: zp - 1.25 * m, za: zp + cap, axa: zp + m * z / 2,', 'zr: zp - 1.25 * m, za: zp + cap, axa: zp + z / 2,', 'cremaliera',
  'axul roții e socotit fără modul')
# --- motorul: marginile
o('C21', LG, 'const n = Math.round(Math.min(24, Math.max(2, Number.isFinite(lungCerut) ? lungCerut : 4)));', 'const n = Math.round(Math.min(30, Math.max(2, Number.isFinite(lungCerut) ? lungCerut : 4)));', 'cremaliera',
  'cremaliera poate avea 30 de știfturi')
o('C22', LG, 'const n = Math.round(Math.min(24, Math.max(2, Number.isFinite(lungCerut) ? lungCerut : 4)));', 'const n = Math.round(Math.min(24, Math.max(1, Number.isFinite(lungCerut) ? lungCerut : 4)));', 'cremaliera',
  'cremaliera poate avea un singur știft')
o('C23', LG, 'const z = Math.round(Math.min(80, Math.max(8, Number.isFinite(zCerut) ? zCerut : 8)));', 'const z = Math.round(Math.min(80, Math.max(4, Number.isFinite(zCerut) ? zCerut : 8)));', 'cremaliera',
  'roata pereche poate avea 5 dinți')
o('C24', LG, 'const z = Math.round(Math.min(80, Math.max(8, Number.isFinite(zCerut) ? zCerut : 8)));', 'const z = Math.round(Math.min(80, Math.max(8, Number.isFinite(zCerut) ? zCerut : 16)));', 'cremaliera',
  'roata pereche implicită e cea de 16')
o('C25', LG, 'const m = Math.min(3, Math.max(0.5, Math.round((Number.isFinite(mCerut) ? mCerut : 1) * 10) / 10));', 'const m = Math.min(3, Math.max(0.5, Number.isFinite(mCerut) ? mCerut : 1));', 'cremaliera',
  'modulul nu mai e rotunjit la zecimi')
o('C26', LG, 'const m = Math.min(3, Math.max(0.5, Math.round((Number.isFinite(mCerut) ? mCerut : 1) * 10) / 10));', 'const m = Math.min(9, Math.max(0.5, Math.round((Number.isFinite(mCerut) ? mCerut : 1) * 10) / 10));', 'cremaliera',
  'modulul trece de 3')
o('C27', LG, 'if (q.lungRea) avert.push(', 'if (q.lungRea && q.n > 99) avert.push(', 'cremaliera',
  'lungimea îndreptată nu se mai spune')
o('C28', LG, 'if (q.roataRea) avert.push(', 'if (q.roataRea && q.n > 99) avert.push(', 'cremaliera',
  'roata îndreptată nu se mai spune')
o('C29', LG, 'const gauri = d.prindere === "gauri", tg', 'const gauri = d.prindere !== "stifturi", tg', 'cremaliera',
  'o prindere necunoscută e cea cu găuri')
o('C30', LG, 'const numar = (v: unknown): number => (v === null || v === undefined || v === "" || typeof v === "boolean" ? NaN : +(v as number));', 'const numar = (v: unknown): number => +(v as number);', 'cremaliera',
  'o valoare lipsă e citită ca zero (și îndreptată cu avertisment)')
# --- motorul: corpul
o('C31', LG, 'tri.push(...caramida({ celule: randCelule(q.n), placi: 1, stifturi: false }).tri); jos = P.placa - 0.01; }', 'tri.push(...caramida({ celule: randCelule(q.n), placi: 1, stifturi: true }).tri); jos = P.placa - 0.01; }', 'cremaliera',
  'placa de dedesubt are știfturi, care ies printre dinți')
o('C32', LG, 'tri.push(...caramida({ celule: randCelule(q.n), placi: 1, stifturi: false }).tri); jos = P.placa - 0.01; }', 'tri.push(...caramida({ celule: randCelule(q.n), placi: 1, stifturi: false }).tri); jos = P.placa + 0.3; }', 'cremaliera',
  'între placă și dinți rămâne un gol')
o('C33', LG, 'tri.push(...caramida({ celule: randCelule(q.n), placi: 1, stifturi: false }).tri); jos = P.placa - 0.01; }', 'tri.push(...prisma(dreptunghi(x0, y0, x1, y1), 0, P.placa)); jos = P.placa - 0.01; }', 'cremaliera',
  'dedesubt e un bloc plin: nu se mai prinde pe știfturi')
GAURI = 'const corp = [...inel(ext, cerc(c[0], c[1], e.gauraD / 2), c, y0 + h - 0.01, y1 - h + 0.01), ...inel(ext, cerc(c[0], c[1], e.lamajD / 2), c, y0, y0 + h), ...inel(ext, cerc(c[0], c[1], e.lamajD / 2), c, y1 - h, y1)];'
o('C34', LG, GAURI, GAURI.replace('cerc(c[0], c[1], e.gauraD / 2), c, y0 + h - 0.01', 'cerc(c[0], c[1], e.lamajD / 2), c, y0 + h - 0.01'), 'cremaliera',
  'gaura de știft e cât lamajul, pe toată lățimea')
o('C35', LG, GAURI, GAURI.replace('...inel(ext, cerc(c[0], c[1], e.lamajD / 2), c, y1 - h, y1)]', '...inel(ext, cerc(c[0], c[1], e.gauraD / 2), c, y1 - h, y1)]'), 'cremaliera',
  'gaura n-are lamaj pe a doua față')
o('C36', LG, 'ext = dreptunghi(xa, 0, xb, jos), c: P2 = [s * k + s / 2, g / 2];', 'ext = dreptunghi(xa, 0, xb, jos), c: P2 = [s * k + s / 2, g / 2 + 1];', 'cremaliera',
  'găurile nu sunt la înălțimea găurilor unei grinzi')
o('C37', LG, 'ext = dreptunghi(xa, 0, xb, jos), c: P2 = [s * k + s / 2, g / 2];', 'ext = dreptunghi(xa, 0, xb, jos), c: P2 = [s * k + s / 2 + 1, g / 2];', 'cremaliera',
  'găurile nu sunt în mijlocul pasului')
o('C38', LG, '      jos = q.zr - 0.2;\n', '      jos = q.zr - 2.5;\n', 'cremaliera',
  'bara cu dinți coboară peste lamajul găurilor')
o('C39', LG, 'tri.push(...axe(prismaGauri(bara, [], y0, y1), ([u, v, w]) => [u, w, v], true));', 'tri.push(...axe(prismaGauri(bara, [], y0, y1), ([u, v, w]) => [u, w, v], false));', 'cremaliera',
  'bara cu dinți are plasa pe dos')
o('C40', LG, 'x0 = 0.1, x1 = s * q.n - 0.1, y0 = 0.1, y1 = s - 0.1, tri: Tri[] = [], avert: string[] = [];\n    if (q.lungRea)', 'x0 = 0.1, x1 = s * q.n - 0.1, y0 = 0.1, y1 = s, tri: Tri[] = [], avert: string[] = [];\n    if (q.lungRea)', 'cremaliera',
  'bara cu dinți e mai lată decât placa')
# --- motorul: montajul
MONT = 'dinti: q.N, k: q.k, divizare: q.zp, axa: q.axa, cursa: Math.PI * q.m * q.z, inaltime: q.za }; },'
o('C41', LG, MONT, MONT.replace('cursa: Math.PI * q.m * q.z', 'cursa: Math.PI * q.z'), 'cremaliera',
  'cursa pe o rotație e socotită fără modul')
o('C42', LG, MONT, MONT.replace('inaltime: q.za', 'inaltime: q.zp'), 'cremaliera',
  'înălțimea din montaj e a liniei de divizare')
o('C43', LG, 'prindere: q.gauri ? "gauri" : "stifturi", dinti: q.N,', 'prindere: q.gauri ? "stifturi" : "gauri", dinti: q.N,', 'cremaliera',
  'montajul spune prinderea pe dos')

# --- tabelele atelierului
o('T01', AT, '[["rotita", "Roată dințată"], ["cremaliera", "Cremalieră"], ["conica", "Roată conică"]', '[["rotita", "Roată dințată"], ["conica", "Roată conică"]', 'tabele',
  'piesa nu e în nicio familie')
o('T02', AT, '    cremaliera: `<path d="M2.5 18.5h19v-5.5', '    cremalieraVeche: `<path d="M2.5 18.5h19v-5.5', 'tabele',
  'piesa n-are desenul ei')
o('T03', EN, ' "Prinderea:": "Mount:",\n', ' "Prinderea:": "",\n', 'tabele',
  'un text al configuratorului n-are traducere')

# --- atelierul: configuratorul
o('E01', AT, 'cremaliera: { lung: 4, modul: 1, prindere: "stifturi", roata: 8 },', 'cremaliera: { lung: 5, modul: 1, prindere: "stifturi", roata: 8 },', 'e2e',
  'piesa implicită din atelier are 5 știfturi')
o('E02', AT, 'cremaliera: { lung: 4, modul: 1, prindere: "stifturi", roata: 8 },', 'cremaliera: { lung: 4, modul: 1, prindere: "gauri", roata: 8 },', 'e2e',
  'piesa implicită din atelier e cea cu găuri')
NUME = 'return tr`Cremalieră 1×${q.lung}, roata de ${q.z}` + (q.prindere === "gauri" ? tr(", cu găuri") : "") + (q.m === 1 ? "" : tr`, modul ${fmt(q.m)}`);'
o('E03', AT, NUME, NUME.replace('tr`Cremalieră 1×${q.lung}, roata de ${q.z}`', 'tr`Cremalieră 1×${q.z}, roata de ${q.lung}`'), 'e2e',
  'numele încurcă lungimea cu roata')
o('E04', AT, NUME, NUME.replace('(q.prindere === "gauri" ? tr(", cu găuri") : "")', '(q.prindere === "stifturi" ? tr(", cu găuri") : "")'), 'e2e',
  'numele spune „cu găuri” la cea pe știfturi')
o('E05', AT, NUME, NUME.replace('(q.m === 1 ? "" : tr`, modul ${fmt(q.m)}`)', '""'), 'e2e',
  'numele nu-și spune modulul (două piese diferite, același nume și același fișier)')
o('E06', AT, '${q.k === 1 ? tr("pas") : tr("pași")} (${fmt(8 * q.k)} mm)', '${q.k === 2 ? tr("pas") : tr("pași")} (${fmt(8 * q.k)} mm)', 'e2e',
  'montajul spune „2 pas” și „1 pași”')
o('E07', AT, '${q.k === 1 ? tr("pas") : tr("pași")} (${fmt(8 * q.k)} mm)', '${q.k === 1 ? tr("pas") : tr("pași")} (${fmt(8 * q.k + 8)} mm)', 'e2e',
  'montajul spune alți milimetri decât pașii')
o('E08', AT, ': q.k === 1 ? tr("într-o cărămidă Technic ridicată cu o placă față de cremalieră") : tr`într-o cărămidă Technic ridicată cu ${q.k} plăci față de cremalieră`;',
  ': q.k === 3 ? tr("într-o cărămidă Technic ridicată cu o placă față de cremalieră") : tr`într-o cărămidă Technic ridicată cu ${q.k} plăci față de cremalieră`;', 'e2e',
  'montajul spune „o placă” la trei plăci')
MONTAJ = '${tr`${q.dinti} dinți. Axul roții de ${q.z} stă la ${fmt(q.axa)} mm deasupra feței de jos a cremalierei: ${unde}. La o rotație a roții, cremaliera înaintează ${fmt(q.cursa)} mm.`}'
o('E09', AT, MONTAJ, MONTAJ.replace('${q.dinti} dinți.', '${q.k} dinți.'), 'e2e',
  'montajul numără altceva decât dinții')
o('E10', AT, MONTAJ, MONTAJ.replace('stă la ${fmt(q.axa)} mm', 'stă la ${fmt(q.divizare)} mm'), 'e2e',
  'montajul dă înălțimea liniei de divizare drept a axului')
o('E11', AT, MONTAJ, MONTAJ.replace('înaintează ${fmt(q.cursa)} mm', 'înaintează ${fmt(q.axa)} mm'), 'e2e',
  'montajul dă altă cursă pe rotație')
o('E12', AT, 'q = Lego.cremalieraMontaj(p);\n      const unde = q.prindere === "gauri" ?', 'q = Lego.cremalieraMontaj(p);\n      const unde = q.prindere !== "gauri" ?', 'e2e',
  'montajul descrie cealaltă prindere')
o('E13', AT, 'camp("#at-cr-lung", 2, 24, v => { p.lung = Math.round(v); });', 'camp("#at-cr-lung", 2, 40, v => { p.lung = Math.round(v); });', 'e2e',
  'lungimea 30 e primită (și tăiată de motor, cu avertisment)')
o('E14', AT, 'camp("#at-cr-lung", 2, 24, v => { p.lung = Math.round(v); });', 'camp("#at-cr-lung", 0, 24, v => { p.lung = Math.round(v); });', 'e2e',
  'lungimea 1 și câmpul golit sunt primite')
o('E15', AT, 'camp("#at-cr-roata", 8, 80, v => { p.roata = Math.round(v); });', 'camp("#at-cr-roata", 2, 80, v => { p.roata = Math.round(v); });', 'e2e',
  'roata de 5 dinți e primită (și îndreptată de motor, cu avertisment)')
o('E16', AT, 'camp("#at-cr-roata", 8, 80, v => { p.roata = Math.round(v); });', 'camp("#at-cr-roata", 8, 99, v => { p.roata = Math.round(v); });', 'e2e',
  'roata de 90 de dinți e primită')
o('E17', AT, 'camp("#at-cr-modul", 0.5, 3, v => { p.modul = Math.round(v * 10) / 10; });', 'camp("#at-cr-modul", 0.5, 9, v => { p.modul = Math.round(v * 10) / 10; });', 'e2e',
  'modulul 4 e primit')
o('E18', AT, '$("#at-cr-prindere").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; p.prindere = b.dataset.v!; editor(); schimbat(); };',
  '$("#at-cr-prindere").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; p.prindere = "gauri"; editor(); schimbat(); };', 'e2e',
  'prinderea rămâne cea cu găuri, orice s-ar alege')
o('E19', AT, 'camp("#at-cr-roata", 8, 80, v => { p.roata = Math.round(v); });', 'camp("#at-cr-roata", 8, 80, v => { p.lung = Math.round(v); });', 'e2e',
  'roata pereche scrisă schimbă lungimea')
# --- atelierul: perechea
PER = 'roata: Def = { tip: "rotita", dinti: q.z, fel: "drepti", grosime: 3.8, gaura: "x" };'
o('E20', AT, PER, PER.replace('dinti: q.z', 'dinti: 24'), 'e2e',
  'roata din pereche are alți dinți decât cea cerută')
o('E21', AT, PER, PER.replace('grosime: 3.8', 'grosime: 4'), 'e2e',
  'roata din pereche nu e cea din editorul roților (nu se adună cu ea)')
o('E22', AT, 'if (q.m !== 1) roata.modul = q.m;', 'if (q.m === 9) roata.modul = q.m;', 'e2e',
  'roata din pereche n-are modulul cremalierei: nu se prind')
o('E23', AT, 'pune(d, n); pune(roata, n);', 'pune(d, n);', 'e2e',
  '„Fă perechea” pune doar cremaliera')
o('E24', AT, 'în listă (axul roții la ${fmt(q.axa)} mm deasupra feței de jos).`);', 'în listă (axul roții la ${fmt(q.divizare)} mm deasupra feței de jos).`);', 'e2e',
  'mesajul perechii dă altă înălțime a axului')
o('E25', AT, '$("#at-cr-fa-pereche").onclick = adaugaPerecheCremaliera;', '$("#at-cr-fa-pereche").onclick = adaugaPerecheRoti;', 'e2e',
  '„Fă perechea” e legat de perechea roților')

SETURI = {
    'cremaliera': ['test/unit/trenulet.cremaliera.test.ts'],
    'tabele': ['test/unit/trenulet.familii.test.ts', 'test/unit/trenulet.pictograme.test.ts', 'test/unit/trenulet.engleza.test.ts', 'test/unit/trenulet.tipuri.test.ts'],
}
E2E = ['test/e2e/trenulet.cremaliera.spec.ts']
