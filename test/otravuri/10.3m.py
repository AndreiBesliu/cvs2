# Lista de otrăvuri a feliei 10.3↑m (piesele puse de mai multe ori, la tăiere și la conversie; ADR 0180), 17.11.2026, alese de
# autor: refuzul fără alegere și „Taie piesa” în worker (cuțitele permise, plăcuțele, tăieturile diferite, amprenta), conversia
# (refuzul, o singură dată, plăcuțele), comenzile de pe firul principal (`taiereSurori.ts`: alesele cu surori, desprinderea
# doar a celor tăiate, bucățile pe toate foile, locurile, surorile netăiate), acțiunile (`document.taie`, `document.converteste`),
# calculul cu întrebarea (`actiuniExportCalcul.ts`), alegerea ținută (`intrebareSurori.ts`) și legăturile din interfață (e2e).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


T = 'src/model/taiere.ts'
C = 'src/model/conversie.ts'
S = 'src/model/taiereSurori.ts'
SU = 'src/model/surori.ts'
A = 'src/ui/actiuniDocumentCalcul.ts'
W = 'src/ui/actiuniExportCalcul.ts'
Q = 'src/ui/intrebareSurori.ts'
B = 'src/app/IntrebareSurori.tsx'
E = 'src/app/Editare.tsx'
P = 'src/app/PanouTaiere.tsx'
K = 'src/app/UnealtaCutit.tsx'
N = 'src/app/PanouriTaiere.tsx'
V = 'src/app/PanouConversie.tsx'
G = 'src/app/GrupuriTaiere.tsx'

# Workerul: refuzul fără alegere și «Taie piesa».
o('T01', T, "      if (!piesaIntreaga) return { ok: false, motiv: 'impartita' };\n", "", 'surori', 'fără alegere, piesa pusă de mai multe ori se taie')
o('T02', SU, "new Set(['x', 'y', 'unghi', 'ghidaj', 'forma', 'forme', 'cale', 'foarfeca'])", "new Set(['x', 'y', 'unghi', 'ghidaj', 'forma', 'forme', 'cale', 'foarfeca', 'intersectii'])",
  'surori', '«Taie piesa» și la intersecții')
o('T03', T, "const piesaIntreaga = cerere.surori === 'piesa' && CUTITE_PIESA.has(c.fel);", "const piesaIntreaga = cerere.surori === 'piesa';", 'surori',
  '«Taie piesa» la orice cuțit')
o('T04', T, "      if (cuLitere.has(p.id)) return { ok: false, motiv: 'placute' };\n", "", 'surori', 'șablonul plăcuțelor se taie ca piesă')
o('T05', T, "  for (const f of doc.foi) for (const i of f.instante) if (i.texte) cuLitere.add(i.piesa);\n  for (const inst of foaie.instante) {",
  "  for (const i of foaie.instante) if (i.texte) cuLitere.add(i.piesa);\n  for (const inst of foaie.instante) {", 'surori', 'plăcuțele, căutate doar pe foaia de lucru')
o('T06', T, "      else if (b !== a) return { ok: false, motiv: 'diferite' };\n", "", 'surori', 'tăieturile diferite trec')
o('T07', T, "piese.map(({ id: _id, ...rest }) => JSON.stringify(rest))", "piese.map((rest) => JSON.stringify(rest))", 'surori', 'amprenta cu id-urile pieselor noi (la fel = diferite)')
o('T09', T, "=> JSON.stringify(rest)).sort());", "=> JSON.stringify(rest)));", 'surori',
  'amprenta cu ordinea bucăților (o soră rotită cu 180° pare tăiată altfel)')
# Conversia.
o('C01', C, "    if (noi.size > 0 && impartita && c.surori !== 'piesa') return { ok: false, motiv: 'impartita' };\n", "", 'surori',
  'conversia unei piese puse de mai multe ori, fără alegere')
o('C02', C, "    if (vazute.has(p.id)) continue;\n", "", 'surori', 'piesa, convertită de două ori (cu două instanțe alese)')
o('C03', C, "    if (impartita && c.surori === 'piesa' && cuLitere.has(p.id)) {", "    if (false) {", 'surori', 'șablonul plăcuțelor, convertit ca piesă')
# Comenzile, pe firul principal.
o('S01', SU, "filter((i) => a.has(i.id) && (n.get(i.piesa) ?? 0) > 1)", "filter((i) => a.has(i.id) && (n.get(i.piesa) ?? 0) > 0)", 'surori',
  'alesele cu surori, și cele puse o dată')
o('S02', SU, "if (a.has(i.id)) m = Math.max(m, n.get(i.piesa) ?? 0);", "if (a.has(i.id)) m = n.get(i.piesa) ?? 0;", 'surori', 'de câte ori: ultima, nu cea mai folosită')
o('S03', S, "      return i && p ? { ...x, instanta: i, piesa: p } : x;", "      return x;", 'surori', 'degruparea nu arată spre piesele desprinse')
o('S04', S, "      comenzi.push({ tip: 'sterge', foaie: f.id, instanta: i, pozitie: k });\n", "", 'surori', 'instanțele de pe celelalte foi nu pleacă')
o('S05', S, "pozitie: x.k + m + j });", "pozitie: x.k + j });", 'surori', 'bucățile de pe celelalte foi, la locuri greșite')
o('S06', S, "    else if (piese) toate.push({ instanta: i,", "    else if (false) toate.push({ instanta: i,", 'surori', 'surorile netăiate de pe foaia de lucru rămân')
o('S07', S, "    else if (d && piese) toate.push(", "    else if (d && false) toate.push(", 'surori', 'instanțele tăiate își păstrează piesele lor (nu cele comune)')
o('S08', S, "  const ids = piese.flatMap((p) => { const i = aPiesei.get(p.id); return i === undefined ? [] : [i]; });",
  "  const ids = [...cuSurori];", 'surori', 'conversia desprinde toate alesele cu surori')
# Acțiunile.
o('A01', A, "    if (t.surori?.mod === 'piesa') comenzi.push(...comenziTaiePiesa(baza, foaie, degrupate));\n    else if",
  "    if (false) comenzi.push(...comenziTaiePiesa(baza, foaie, degrupate));\n    else if", 'e2e', '«Taie piesa»: acțiunea nu pune bucățile pe toate instanțele')
o('A02', A, "    if (t.surori?.mod === 'desprinde' && t.surori.ids.length > 0) {", "    if (false) {", 'e2e', '«Desprinde și taie»: acțiunea nu desprinde')
o('A03', A, "  if (c.surori?.mod === 'desprinde') {", "  if (false) {", 'e2e', '«Desprinde și convertește»: acțiunea nu desprinde')
# Calculul, cu întrebarea.
o('W01', W, "  return { ...x, surori: { mod: 'desprinde', ids: s.ids.filter((id) => taiate.has(id)) } };", "  return { ...x, surori: { mod: 'desprinde', ids: s.ids } };", 'e2e',
  '«Desprinde și taie» desprinde și alesele netăiate')
o('W02', W, "  const s = await surori(doc, cerere.alese, indexFoaie, CUTITE_PIESA.has(cerere.cutit.fel), 'taie', semnal, laIntrebare);",
  "  const s = await surori(doc, cerere.alese, indexFoaie, true, 'taie', semnal, laIntrebare);", 'e2e', '«Taie piesa» oferită oriunde')
o('W03', W, "  return x.ok ? { ...x, surori: { mod: 'desprinde', ids: s.ids } } : x;\n}", "  return x;\n}", 'e2e', 'panourile nu desprind alesele')
# Alegerea ținută.
o('Q01', Q, "  if (t === 'desprinde' || (t === 'piesa' && i.piesa)) return Promise.resolve(t);", "  if (false) return Promise.resolve(t);", 'e2e',
  'alegerea ținută nu se folosește')
o('Q02', Q, "  if (t === 'desprinde' || (t === 'piesa' && i.piesa)) return Promise.resolve(t);", "  if (t !== null) return Promise.resolve(t);", 'e2e',
  '„toată piesa” ținută se folosește și unde nu are sens')
o('Q03', Q, "    if (a === null) stocare?.removeItem(CHEIE_SURORI);\n    else stocare?.setItem(CHEIE_SURORI, a);",
  "    if (a !== null) stocare?.setItem(CHEIE_SURORI, a);", 'e2e', '„întreabă” nu uită alegerea')
o('Q04', Q, "  if (a !== null && tine) tineAlegerea(a);", "  if (a !== null && false) tineAlegerea(a);", 'e2e', '„Ține minte alegerea” nu ține')
# Interfața.
o('U01', E, "  useEffect(() => { raspundeSurori(null); }, [selectie]);\n", "", 'e2e', 'o altă alegere a formelor nu închide întrebarea')
o('U02', B, "      {intrebare.piesa ? (", "      {true ? (", 'e2e', '«Taie piesa» arătată și unde nu are sens')
o('U03', B, "        onClick={() => { raspundeSurori('desprinde', tine); }}>", "        onClick={() => { raspundeSurori('piesa', tine); }}>", 'e2e',
  '«Desprinde și taie» face «Taie piesa»')
o('U04', P, "sterse: r.sterse, ...(r.surori ? { surori: r.surori } : {}) });", "sterse: r.sterse });", 'e2e', 'panoul Taie nu dă alegerea acțiunii')
o('U05', K, "sterse: r.sterse, ...(r.surori ? { surori: r.surori } : {}) });", "sterse: r.sterse });", 'e2e', 'Cuțitul nu dă alegerea acțiunii')
o('U06', N, "...(rez.surori ? { surori: rez.surori } : {}),", "", 'e2e', 'panourile nu dau alegerea acțiunii')
o('U07', V, "const v = onConverteste({ doc: laCerere, piese: r.piese, ...(r.surori ? { surori: r.surori } : {}) });", "const v = onConverteste({ doc: laCerere, piese: r.piese });",
  'e2e', 'conversia nu dă alegerea acțiunii')
o('U08', P, "s.signal, indexFoaie, () => { if (!s.signal.aborted) setStare({ fel: 'gata', text: t('editare.surori.astept'), rau: false }); }).then((r) => {",
  "s.signal, indexFoaie).then((r) => {", 'e2e', 'panoul Taie nu spune să alegi sus')
o('U09', G, "      <RandSurori date={date} />\n", "", 'e2e', 'opțiunile tăierii fără rândul alegerii')

SETURI = {
    'surori': ['test/unit/taiere.surori.test.ts', 'test/unit/conversie.test.ts'],
    'surori2': ['test/unit/taiere.surori.test.ts', 'test/unit/conversie.test.ts', 'test/unit/taiere.test.ts', 'test/unit/taiere.panouri.test.ts',
                'test/unit/conversie.oracol.test.ts'],
}
E2E = ['test/e2e/surori.spec.ts']
