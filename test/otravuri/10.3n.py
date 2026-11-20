# Lista de otrăvuri a feliei 10.3↑n (numărul panoului gravat pe el; ADR 0181 §7), 19.11.2026, alese de autor: locul cifrelor
# (jocul, înălțimile bune, regula „niciun contur întreg înăuntru”, materialul, depărtarea probelor, ordinea locurilor, grila fină
# de lângă colț), bucățile fiecărui panou din worker, acțiunea (numărul în grupul panoului, la locul dat) și legăturile din blocul
# panourilor (e2e: bifa ținută, calculul numerelor, trimiterea lor acțiunii).
# Nețintite, cu motivul: pasul probelor (la jocul cerut, pragul de 1,25 · joc acoperă și o probare mai rară), limita de 30 de
# pași a grilei fine (doar timpul), id-urile numerelor (după grupare pleacă în grup), cifrele „k + 1” (fontul nu se încarcă în
# probele unitare; e2e-ul le citește doar numărul).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


N = 'src/model/numarPanou.ts'
H = 'src/model/inaltimeNumar.ts'
M ='src/model/panouri.ts'
A = 'src/ui/actiuniDocumentCalcul.ts'
B = 'src/app/PanouriTaiere.tsx'
O_ = 'src/app/optiuniTaiere.ts'

# Locul cifrelor.
o('N01', N, "export const jocNumar = (inaltime: number): number => Math.max(2, inaltime / 4);", "export const jocNumar = (inaltime: number): number => inaltime / 4;",
  'numar', 'jocul fără minimul de 2 mm')
o('N02', H, "h >= INALTIME_NUMAR.minima && h <= INALTIME_NUMAR.maxima", "h > INALTIME_NUMAR.minima && h <= INALTIME_NUMAR.maxima", 'numar',
  'înălțimea cea mai mică refuzată')
o('N03', N, "    for (const c of cutii) if (inauntru(c, b)) return false;\n", "", 'numar', 'un contur întreg înăuntrul cutiei (o literă mică) trece')
o('N04', N, "      if (!inRegiune(q, inchise)) return false;\n", "", 'numar', 'cifrele în afara materialului (în decupătura unui L)')
o('N05', N, "const pas = joc / 2, departe = joc + pas / 2;", "const pas = joc / 2, departe = joc;", 'numar', 'probele cer doar jocul (fără jumătatea de pas)')
o('N06', N, "  locuri.sort((a, b) => a.d - b.d || a.y - b.y);\n", "", 'numar', 'locurile, rând cu rând, nu de la colț')
o('N07', N, "  grila(finX, finY, 30);\n", "", 'numar', 'fără grila fină de lângă colț')
# Workerul și acțiunea.
o('P01', M, "  return { ok: true, degrupate, ids, forme, scoase, sterse: [], grupuri, panouri: celule.length, perPanou };",
  "  return { ok: true, degrupate, ids, forme, scoase, sterse: [], grupuri, panouri: celule.length };", 'numar', 'workerul nu dă bucățile panourilor')
o('P02', A, "      if (g) g.ids.push(id);\n      else lista.push({ nume: n.nume, ids: [...n.ids, id] });",
  "      if (g) g.ids.push(id);", 'numar', 'un panou dintr-o bucată nu primește numărul în grup')
o('P03', A, "instanta: { id, piesa: id, x: n.x, y: n.y, rotire: 0 }", "instanta: { id, piesa: id, x: n.y, y: n.x, rotire: 0 }", 'numar',
  'numărul, la locul cu axele schimbate')
o('P04', A, "      if (g) g.ids.push(id);\n", "      if (false) g.ids.push(id);\n", 'numar', 'un panou din mai multe bucăți nu primește numărul în grup')
# Blocul panourilor (e2e).
o('U01', O_, "    if (o.numere !== undefined) localStorage.setItem(CHEI.numere, o.numere ? '1' : '0');\n", "", 'e2e', 'bifa nu se ține')
o('U02', B, "    const inaltimeNumar = optiuni.numere ? optiuni.inaltimeNumar : null;", "    const inaltimeNumar = null as number | null;", 'e2e',
  'cu bifa, numerele nu se calculează')
o('U03', B, "            ...(numere && numere !== 'font' && numere.numere.length > 0 ? { numere: numere.numere } : {}),\n", "", 'e2e',
  'numerele nu ajung la acțiune')
o('U04', B, "      {optiuni.numere ? (\n        <label className=\"rand-taiere\">", "      {true ? (\n        <label className=\"rand-taiere\">", 'e2e',
  'înălțimea cifrelor arătată și fără bifă')

SETURI = {
    'numar': ['test/unit/taiere.numar.test.ts'],
    'numar2': ['test/unit/taiere.numar.test.ts', 'test/unit/taiere.panouri.test.ts', 'test/unit/taiere.panouri.foi.test.ts'],
}
E2E = ['test/e2e/taiere.spec.ts']
