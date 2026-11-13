# Lista de otrăvuri a feliei 10.3↑k (tăierea în panouri; ADR 0181 §7), 13.11.2026, alese de autor: grila (toleranța, numărul
# de panouri pe axă, plafonul, valorile, egale și din colț), tăierea pe linii (despărțirea, partea A / B, liniile care nu taie
# nimic, cutia), id-urile noi, numele și ordinea panourilor (pe foaie și în grilă, piesele împărțite, un singur panou), gruparea
# lor pe firul principal (`grupuriPanouri.ts`: locurile, numele, id-urile, V-carve-urile, alegerea de după), acțiunea
# `document.taie` și legăturile din interfață (e2e). M03 e echivalentă (vezi docs/otravuri.md); H10, echivalentă, a scos
# filtrul alegerii din blocul panourilor (aplicația dă deja doar alegerea care mai e pe foaie).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


G = 'src/model/grilaPanouri.ts'
M = 'src/model/panouri.ts'
T = 'src/model/taiere.ts'
A = 'src/ui/actiuniDocumentCalcul.ts'
R = 'src/model/grupuriPanouri.ts'
K = 'src/jobs/calculCam.ts'
B = 'src/app/PanouriTaiere.tsx'
P = 'src/app/PanouTaiere.tsx'

# Grila.
o('G01', G, "const TOLERANTA = 1e-6;", "const TOLERANTA = 1e-12;", 'panouri', 'zgomotul cutiei face un panou în plus')
o('G02', G, "Math.max(1, Math.ceil((w - TOLERANTA) / l))", "Math.ceil((w - TOLERANTA) / l)", 'panouri', 'o cutie fără lățime, zero panouri')
o('G03', G, "if (nx * ny > PLAFON_PANOURI) return 'panouri';", "if (nx * ny > PLAFON_PANOURI + 1) return 'panouri';", 'panouri', '101 panouri trec')
o('G04', G, "const colt = g.fel === 'marime' && g.colt;", "const colt = false;", 'panouri', '„din colț” face panouri egale')
o('G05', G, "(w * (i + 1)) / n", "(w * i) / n", 'panouri', 'liniile egale, mutate cu un panou spre colț')
o('G06', G, "!pozitiv(g.latime) || !pozitiv(g.inaltime)", "!pozitiv(g.latime)", 'panouri', 'înălțimea greșită nu se refuză ca valoare')
o('G07', G, "Number.isInteger(x) && x >= 1", "x >= 1", 'panouri', 'un număr de panouri neîntreg e primit')
o('G08', G, "ys: linii(k.minY, H, ny, colt ? g.inaltime : null)", "ys: linii(k.minY, H, ny, colt ? g.latime : null)", 'panouri',
  'din colț, rândurile cu lățimea panoului')
# Tăierea pe linii.
o('M01', M, "inchide: cerere.inchide, desparte: true,", "inchide: cerere.inchide, desparte: false,", 'panouri',
  'o formă cu contururi de ambele părți ale unei linii care nu le trece nu se desparte')
o('M02', M, "        let s = n;\n", "        let s = 1 - n;\n", 'panouri', 'partea A și B, inversate')
o('M03', M, "const peste = (b: Bucata): boolean => (x ? b.c : b.r)[0] < k && k <= (x ? b.c : b.r)[1];", "const peste = (b: Bucata): boolean => true;",
  'panouri', 'fiecare linie se încearcă pe toate bucățile (și pe cele care nu o încalecă)')
o('M04', M, "if (!r.ok && r.motiv !== 'nimic-taiat') return r;", "if (!r.ok) return r;", 'panouri', 'o linie care nu taie nimic refuză tot')
o('M05', M, "noua: b.noua || parti !== undefined,", "noua: b.noua,", 'panouri', 'bucățile noi își țin id-urile tăierii (fără id-uri noi)')
o('M06', M, "elementeInstanta(p.radacina, i, matriceInstanta(i)).reduce(", "elementeInstanta(p.radacina, i, matriceInstanta(i)).slice(0, 1).reduce(",
  'panouri', 'cutia unei piese, doar din primul ei contur')
o('M07', M, "s = (x ? q.minX + q.maxX : q.minY + q.maxY) / 2 < v ? 0 : 1;", "s = 0;", 'panouri',
  'o bucată netăiată e mereu de partea A')
# Panourile: id-urile, gruparea, numele, ordinea, locurile.
o('M08', M, "if (xs.length > 1) grupuri.push(", "if (xs.length > 99) grupuri.push(", 'panouri', 'bucățile unui panou nu se mai grupează')
o('M09', M, "const nume = `${cerere.nume} ${t + 1}`;", "const nume = `${cerere.nume} ${t}`;", 'panouri', 'numerele panourilor, de la 0')
o('M10', M, "const celule = [...pe.keys()].sort((a, b) => a - b);", "const celule = [...pe.keys()].sort((a, b) => b - a);", 'panouri',
  'panourile, numerotate de sus')
o('M11', M, "const k = b.r[0] * nx + b.c[0];\n    pe.set(", "const k = b.c[0] * ny + b.r[0];\n    pe.set(", 'panouri',
  'panourile, numerotate coloană cu coloană')
o('M12', M, ".sort((a, b) => nrPanou(a) - nrPanou(b) || a - b).map(", ".map(", 'panouri', 'pe foaie, bucățile în ordinea tăierii, nu a panourilor')
o('M13', R, "    if (typeof r === 'string') {", "    if (r === 'doua') {", 'panouri', 'V-carve-urile care s-ar amesteca: panoul se grupează oricum')
o('M14', M, "    else numite.set(xs[0] as number, nume);\n", "", 'panouri', 'o bucată singură în panoul ei nu primește numele panoului')
o('M15', M, "  if (initiale.some((i) => (folosiri.get(i.piesa) ?? 0) > 1)) return refuz('impartita');\n", "", 'panouri',
  'o piesă pusă de mai multe ori (netăiată) intră într-un grup')
o('M16', M, "  if (nx * ny === 1) return refuz('nimic-taiat');\n", "", 'panouri', 'un singur panou nu se mai refuză')
o('M17', R, "      locuri.instante.push(k);", "      locuri.instante.push(k + 1);", 'panouri', 'locurile părților unui grup, greșite (anularea nu le-ar pune înapoi)')
o('M18', M, "if (parti.length === 1 && p0?.instanta === i && p0.piesa === piesa(i)) continue;", "if (parti.length === 1) continue;", 'panouri',
  'o formă întreagă, singură în panoul ei, nu se redenumește')
# Despărțirea, în tăiere.
o('T01', T, "    if (cerere.desparte === true && pastreaza === 'ambele') {", "    if (false) {", 'panouri', '`desparte` nu mai desparte')
o('T02', T, "return r.taiate === 0 && parti.every((x) => x.length > 0) ?", "return r.taiate === 0 && parti.some((x) => x.length > 0) ?", 'panouri',
  'o formă toată de o parte se „desparte” într-o parte goală')
o('T03', T, "(forme > 0 || cerere.desparte !== true)", "(forme > 0 || true)", 'panouri', 'o linie care doar desparte cere dinți')
# Acțiunea.
o('A01', A, "    comenzi.push(...g.comenzi);\n", "", 'panouri', 'acțiunea nu mai grupează panourile')
o('A03', A, "      ctx.selecteaza(r.ids ?? t.ids);", "      ctx.selecteaza(t.ids);", 'panouri', 'după tăiere, alese rămân bucățile, nu panourile')
o('R01', R, "      return g === undefined ? [x] : g === '' ? [] : [g];", "      return [x];", 'panouri', 'alegerea de după: bucățile, nu grupurile')
o('R02', R, "piesa: { ...r.piesa, nume: g.nume }", "piesa: r.piesa", 'panouri', 'grupul nu primește numele panoului')
o('R03', R, "nou: { ...x.piesa, nume: g.nume }", "nou: { ...x.piesa }", 'panouri', 'panoul negrupat (V-carve-urile) nu-și numește bucățile')
o('R04', R, "    while (ocupate.has(`e${n}`)) n++;\n", "", 'panouri', 'id-ul grupului poate fi al unei instanțe din document')
o('A02', A, "t.degrupate.length === 0 && sterse.length === 0 && grupuri.length === 0)", "t.degrupate.length === 0 && sterse.length === 0)", 'panouri',
  'fără nicio tăietură (doar grupuri), acțiunea refuză')
# Interfața (e2e).
o('H01', B, "const alese = useMemo(() => (selectie.length > 0 ? selectie : (doc.foi[0]?.instante ?? []).map((i) => i.id)), [doc, selectie]);",
  "const alese = useMemo(() => selectie, [doc, selectie]);", 'e2e', 'fără nimic ales, blocul nu ia formele foii')
o('H02', B, "onGrila(xs ? { axa: 'grila', cutie, xs, ys } : null)", "onGrila(null)", 'e2e', 'grila nu se arată pe pânză')
o('H03', B, "disabled={fel !== 'marime'}", "disabled={false}", 'e2e', '„egale / din colț” nu se stinge după număr')
o('H04', P, "const laLinie = (): void => { setGrila(false); };", "const laLinie = (): void => {};", 'e2e', 'înapoi în blocul de sus, pânza ține grila')
o('H05', P, "onActiv={() => { setGrila(true); }}", "onActiv={() => {}}", 'e2e', 'blocul panourilor nu arată grila')
o('H06', B, "nume: t('editare.taiere.panouri.nume')", "nume: 'Panou'", 'e2e', 'numele panourilor nu vine din texte')
o('H07', B, "...(rez.grupuri ? { grupuri: rez.grupuri } : {})", "", 'e2e', 'panoul nu trimite grupurile acțiunii')
o('H08', K, "      return { raspuns: taieInPanouri(c.document, c.cerere), transfer: [] };", "      return { raspuns: { ok: false, motiv: 'nimic-ales' }, transfer: [] };",
  'e2e', 'workerul nu taie în panouri')
o('H09', B, "        : c * r === 1 ? t('editare.taiere.panouri.unul') : null;", "        : null;", 'e2e', 'un singur panou nu stinge butonul')
o('R05', R, "new Set([doc, inainte].flatMap(", "new Set([doc].flatMap(", 'panouri', 'grupul poate lua id-ul formei tăiate (eliberat de degrupare)')

SETURI = {
    'panouri': ['test/unit/taiere.panouri.test.ts', 'test/unit/taiere.panouri.oracol.test.ts'],
    'panouri2': ['test/unit/taiere.panouri.test.ts', 'test/unit/taiere.panouri.oracol.test.ts', 'test/unit/taiere.test.ts', 'test/unit/taiere.imbinare.test.ts'],
}
E2E = ['test/e2e/taiere.spec.ts']
