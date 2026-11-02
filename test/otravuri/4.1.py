# Lista de otrăvuri a feliei 4.1↑ (corpusul de aur al documentului, ADR 0121), 02.11.2026, alese de autor: migrările
# (translația mutată pe instanță, coordonatele instanței, implicitele înghețate ale operațiilor, sensul implicit, un câmp pus
# în plus, o migrare care își atinge intrarea), JSON-ul canonic (cheile nesortate) și ușa documentului curent (o versiune
# curentă trimisă la migrări). Fiecare trebuie prinsă de proba corpusului SINGURĂ (setul „aur”), nu doar de oracole.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


MG = 'src/model/migrari.ts'
JC = 'src/model/jsonCanonic.ts'
UC = 'src/model/usaCurenta.ts'

o('M01', MG, "      radacina: { ...restEl, tip: 'element', id, matrice: { ...matrice, e: 0, f: 0 } },",
  "      radacina: { ...restEl, tip: 'element', id, matrice: { ...matrice } },", 'aur', 'v1 → v2: translația rămâne și pe element (piesa mutată de două ori)')
o('M02', MG, '    instante.push({ id, piesa: id, x: matrice.e, y: matrice.f, rotire: 0 });',
  '    instante.push({ id, piesa: id, x: matrice.e, y: matrice.e, rotire: 0 });', 'aur', 'v1 → v2: y-ul instanței luat din x')
o('M03', MG, "operatii.push({ id: n['id'], tip: 'profil', noduri: [n['id']], scula, latura: 'exterior', adancime: 3, pas: 3 });",
  "operatii.push({ id: n['id'], tip: 'profil', noduri: [n['id']], scula, latura: 'exterior', adancime: 3, pas: 1.5 });", 'aur',
  'v2 → v3: implicitul înghețat al pasului, schimbat')
o('M04', MG, "      operatii.push({ ...(o as Brut), sens: 'urcare' });", "      operatii.push({ ...(o as Brut), sens: 'opozitie' });", 'aur',
  'v3 → v4: sensul implicit, inversat')
o('M05', MG, '  return { ok: true, doc: { ...doc, schema: 9 } };', '  return { ok: true, doc: { ...doc, schema: 9, rev: 0 } };', 'aur',
  'v8 → v9 (doar numărul): pune și un câmp în plus')
o('M06', MG, '  return { ok: true, doc: { ...doc, schema: 18 } };', "  doc['schema'] = 18;\n  return { ok: true, doc };", 'aur',
  'v17 → v18: își scrie intrarea (nu mai e pură)')
o('C01', JC, ".filter((k) => o[k] !== undefined).sort().map(", ".filter((k) => o[k] !== undefined).map(", 'aur', 'JSON-ul canonic cu cheile în ordinea lor')
o('U01', UC, '  return typeof s === \'number\' && Number.isInteger(s) && s >= 1 && s < VERSIUNE_SCHEMA ? null : incarcaCu(brut, {});',
  '  return typeof s === \'number\' && Number.isInteger(s) && s >= 1 && s <= VERSIUNE_SCHEMA ? null : incarcaCu(brut, {});', 'aur',
  'ușa documentului curent trimite și versiunea curentă la migrări')


# ---- Seturile ----
SETURI = {
    'aur': ['test/unit/documente.aur.test.ts'],
    'aur2': ['test/unit/documente.aur.test.ts', 'test/unit/document.v18.oracol.test.ts', 'test/unit/usaCurenta.test.ts'],
}
