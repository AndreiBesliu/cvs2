# Lista de otrăvuri a feliei 25.8↑a (imaginile pe foaie, ADR 0272), 22.11.2026, alese de autor: ușa documentului (amprenta,
# opacitatea, rotirea, id-urile unice, plafonul, câmpurile cerute) și comanda din jurnal (aplicarea, inversa), acțiunea
# `foaie.imagini` (garda: valorile care nu sunt numere, amprenta, doar-citirea; aceeași listă), importul cu imaginea (mutată
# cu desenul, id-ul nou, comanda ținută, primul id liber, locul în pagină, tipurile păstrate cum sunt, ce se păstrează: o
# imagine prelucrată ori redusă se codează din nou, un JPEG tot JPEG), pânza (întoarcerea, opacitatea, stratul ținut,
# imaginile trimise workerului), fereastra (bifa oprită implicit, ținută minte, folosită de „Importă”; „Doar imaginea” după
# un refuz, în punctul lăsat), panoul (ochiul, procentele, lacătul), mânerele (sensul rotirii, Shift, colțul opus, latura
# minimă, coordonatele imaginii, alegerea de sub imagine), curățarea (vârsta, versiunile citite) și alegerea doar pe contur.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


SD = 'src/model/schemaDocument.ts'
JR = 'src/model/jurnal.ts'
DC = 'src/ui/actiuniDocumentCalcul.ts'
AD = 'src/ui/actiuniDocument.ts'
CA = 'src/ui/actiuniImportCalcul.ts'
CT = 'src/jobs/calculTrasare.ts'
LU = 'src/canvas/lucrator.ts'
PZ = 'src/canvas/Panza.tsx'
IC = 'src/app/ImportConectat.tsx'
DI = 'src/ui/DialogImport.tsx'
IF = 'src/app/ImaginiFoii.tsx'
MI = 'src/app/manereImagine.ts'
ED = 'src/app/Editare.tsx'
BZ = 'src/app/imaginiFoaie.ts'
AL = 'src/model/alegere.ts'

# ── Ușa și jurnalul ─────────────────────────────────────────────────────────────────────────────────────────────────
o('M01', SD, '  sursa: v.pipe(v.string(), v.regex(/^[0-9a-f]{64}$/)),', '  sursa: v.pipe(v.string(), v.regex(/^[0-9a-fA-F]{64}$/)),', 'mod',
  'amprenta cu majuscule, primită')
o('M02', SD, '  opacitate: v.pipe(v.number(), v.finite(), v.gtValue(0), v.maxValue(1)),',
  '  opacitate: v.pipe(v.number(), v.finite(), v.minValue(0), v.maxValue(1)),', 'mod', 'opacitatea 0 (o imagine invizibilă), primită')
o('M03', SD, '  rotire: v.pipe(v.number(), v.finite(), v.minValue(0), v.ltValue(360)),\n  opacitate:',
  '  rotire: v.pipe(v.number(), v.finite(), v.minValue(0), v.maxValue(360)),\n  opacitate:', 'mod', 'rotirea 360, primită')
o('M04', SD, '      if (imagini.has(im.id)) return `două imagini ale foii ${f.id} au id-ul ${im.id}`;\n', '', 'mod', 'id-uri duble, primite')
o('M05', SD, 'v.maxLength(PLAFON.imagini, `cel mult', 'v.maxLength(PLAFON.imagini + 1, `cel mult', 'mod', 'o imagine peste plafon, primită')
o('M06', SD, '  vizibila: v.boolean(),', '  vizibila: v.optional(v.boolean()),', 'mod', 'o imagine fără „vizibilă”, primită')
o('M07', JR, "    case 'inlocuieste-imagini': return { tip: c.tip, foaie: c.foaie, vechi: c.nou, nou: c.vechi };",
  "    case 'inlocuieste-imagini': return { tip: c.tip, foaie: c.foaie, vechi: c.vechi, nou: c.nou };", 'mod', 'anularea refă comanda')
o('M08', JR, ': { ...foaie, imagini: [...c.nou] };', ': { ...foaie, imagini: [...c.vechi] };', 'mod', 'comanda pune lista veche')

# ── Acțiunea foaie.imagini ──────────────────────────────────────────────────────────────────────────────────────────
o('A01', DC, '  const intre = (v: unknown, min: number, max: number): boolean => Number.isFinite(v) && (v as number) > min && (v as number) <= max;',
  '  const intre = (v: unknown, min: number, max: number): boolean => (v as number) > min && (v as number) <= max;', 'mod',
  'garda primește un șir („5”) unde ușa vrea un număr')
o('A02', DC, "    if (typeof x.sursa !== 'string' || !/^[0-9a-f]{64}$/.test(x.sursa)) return false;", "    if (typeof x.sursa !== 'string') return false;",
  'mod', 'garda nu judecă amprenta')
o('A03', DC, '      if (!nou || !imaginiBune(nou) || jsonCanonic(nou) === jsonCanonic(vechi)) return;', '      if (!nou || !imaginiBune(nou)) return;',
  'mod', 'aceeași listă e un pas de anulare')
o('A04', DC, "      const s = scrie(ctx);\n      if (s !== true) return s;\n      return imaginiBune(im) ?", '      return imaginiBune(im) ?', 'mod',
  'fila care doar citește schimbă imaginile')

# ── Importul cu imaginea ────────────────────────────────────────────────────────────────────────────────────────────
o('I01', DC, 'x: imagine.x + dx, y: imagine.y + dy }] });', 'x: imagine.x, y: imagine.y }] });', 'imp',
  'lăsat pe planșă: desenul se mută, imaginea rămâne în locul din pagină')
o('I02', DC, 'id: idImagineNoua(vechi), x: imagine.x', 'id: imagine.id, x: imagine.x', 'imp', 'id-ul imaginii, nu unul nou (al doilea import, refuzat)')
o('I03', DC, '    && ultimulImport.foaie === idFoaie && ultimulImport.imagine === imagine) return ultimulImport.rez;',
  '    && ultimulImport.foaie === idFoaie) return ultimulImport.rez;', 'imp', 'comanda ținută de starea butonului, fără imagine')
o('I04', AD, '  let k = 1;\n  while (ocupate.has(`im${k}`)) k++;', '  let k = imagini.length + 1;\n  while (ocupate.has(`im${k}`)) k++;', 'imp',
  'id-ul nou nu e primul liber')
o('I05', CA, 'x: (latimePx / 2 - zx) * mmPePx', 'x: (latimePx / 2 + zx) * mmPePx', 'imp', 'zona mută imaginea în partea greșită')
o('I06', CA, 'y: (zy + zh - inaltimePx / 2) * mmPePx', 'y: (inaltimePx / 2 - zy) * mmPePx', 'imp', 'Y-ul zonei citit în jos (ca X-ul)')
o('I07', CT, "  return riff && b(8) === 0x57 && b(9) === 0x45 && b(10) === 0x42 && b(11) === 0x50 ? 'image/webp' : null;",
  "  return riff ? 'image/webp' : null;", 'imp', 'orice RIFF (un WAV) e WebP')
o('I08', CT, '  const originala = tip !== null && redusDin === null && intreaga === decodata ? tip : null;',
  '  const originala = tip !== null && intreaga === decodata ? tip : null;', 'e2e', 'o poză redusă se păstrează întreagă (fișierul)')
o('I09', CT, '  const originala = tip !== null && redusDin === null && intreaga === decodata ? tip : null;',
  '  const originala = tip !== null && redusDin === null ? tip : null;', 'e2e', 'o scanare îndreptată se păstrează strâmbă (fișierul)')
o('I10', CT, "  return { img, intreaga, sc, originala, jpeg: tip === 'image/jpeg' };", '  return { img, intreaga, sc, originala, jpeg: false };', 'e2e',
  'un JPEG prelucrat se păstrează PNG')

# ── Pânza ───────────────────────────────────────────────────────────────────────────────────────────────────────────
o('P01', LU, '      x.scale(1, -1);\n      x.globalAlpha = im.opacitate;', '      x.globalAlpha = im.opacitate;', 'e2e', 'imaginea, cu susul în jos')
o('P02', LU, '      x.globalAlpha = im.opacitate;', '      x.globalAlpha = 1;', 'e2e', 'opacitatea, ignorată')
o('P03', LU, '|${c.culori.linie}|${versiune}`;', '|${c.culori.linie}`;', 'e2e', 'stratul ținut și după decodare (doar locul punctat)')
o('P04', PZ, '    if (imaginiTrimise.current !== imagini) {', '    if (imaginiTrimise.current === null) {', 'e2e',
  'imaginile trimise workerului doar o dată (lista goală de la pornire)')

# ── Fereastra importului ────────────────────────────────────────────────────────────────────────────────────────────
o('U01', IC, 'let pastreazaImaginea = false;', 'let pastreazaImaginea = true;', 'e2e', 'bifa pornită implicit')
o('U02', IC, 'onPastreaza: (b) => { pastreazaImaginea = b; setPastreazaBifat(b); },', 'onPastreaza: (b) => { setPastreazaBifat(b); },', 'e2e',
  'bifa nu se ține minte')
o('U03', IC, "        if (pastreazaBifat && ok.format === 'imagine') {", "        if (pastreazaBifat && ok.format === 'svg') {", 'e2e',
  '„Importă” nu ține seama de bifă')
o('U04', DI, "(stare.ok ? stare.format === 'imagine' : stare.trasare !== undefined)", "(stare.ok ? stare.format === 'imagine' : false)", 'e2e',
  '„Doar imaginea” lipsește după un refuz al trasării')
o('U05', IC, 'puneImaginea(loc ? { ...imagine, x: loc.x, y: loc.y } : imagine)', 'puneImaginea(imagine)', 'e2e',
  '„Doar imaginea” lăsată pe planșă cade în locul din pagină')

# ── Panoul foii ─────────────────────────────────────────────────────────────────────────────────────────────────────
o('F01', IF, 'vizibila: !x.vizibila', 'vizibila: x.vizibila', 'e2e', 'ochiul nu ascunde')
o('F02', IF, 'opacitate: x / 100', 'opacitate: x', 'e2e', 'opacitatea în procente, scrisă ca fracție')
o('F03', IF, 'fixata: !x.fixata', 'fixata: x.fixata', 'e2e', 'lacătul nu desface')

# ── Mânerele ────────────────────────────────────────────────────────────────────────────────────────────────────────
o('H01', MI, '    const d = ((Math.atan2(q.y - a.y, q.x - a.x) - Math.atan2(start.y - a.y, start.x - a.x)) * 180) / Math.PI;',
  '    const d = ((Math.atan2(start.y - a.y, start.x - a.x) - Math.atan2(q.y - a.y, q.x - a.x)) * 180) / Math.PI;', 'man',
  'rotirea în sensul invers cursorului')
o('H02', MI, 'rotireNormala(shift ? Math.round(r / 15) * 15 : r)', 'rotireNormala(r)', 'man', 'Shift nu prinde pașii de 15°')
o('H03', MI, '  const c = peFoaie(a, fix.u + (su * latime) / 2, fix.w + (sw * inaltime) / 2);', '  const c = { x: a.x, y: a.y };', 'man',
  'scalarea în jurul centrului, nu a colțului opus')
o('H04', MI, '  const k = Math.max(((p.u - fix.u) * du + (p.w - fix.w) * dw) / (du * du + dw * dw), LATURA_MINIMA_IMAGINE / Math.min(a.latime, a.inaltime));',
  '  const k = ((p.u - fix.u) * du + (p.w - fix.w) * dw) / (du * du + dw * dw);', 'man', 'dincolo de colțul opus, imaginea se întoarce')
o('H05', MI, '  return { u: c * dx + s * dy, w: -s * dx + c * dy };', '  return { u: c * dx - s * dy, w: s * dx + c * dy };', 'man',
  'coordonatele imaginii rotite cu unghiul întors')
o('H06', ED, '      if (!s.doarCitire && s.imaginiDesfacute.some((im) => {', '      if (false && s.imaginiDesfacute.some((im) => {', 'e2e',
  'cadrul de selecție ia apăsarea de pe o imagine desfăcută')
o('H07', AL, '    } else if (!doarContur && !peContur && c.inchis', '    } else if (!peContur && c.inchis', 'ale',
  'o imagine desfăcută nu se apucă dinăuntrul unei forme')

# ── Curățarea ───────────────────────────────────────────────────────────────────────────────────────────────────────
o('B01', BZ, '  for (const x of inregistrari) if (x.la < pana && !folosite.has(x.sursa)) r.push(x.sursa);',
  '  for (const x of inregistrari) if (!folosite.has(x.sursa)) r.push(x.sursa);', 'baza', 'se șterge și imaginea pusă azi (altă filă)')
o('B02', BZ, '    const foi = (d as { foi?: unknown } | null)?.foi;', '    const foi = (d as { piese?: unknown } | null)?.piese;', 'baza',
  'versiunile păstrate nu se citesc (imaginile lor se șterg)')
# Nerulată: `curataLaPornire` fără documentul de acum (cere IndexedDB și ceasul: e2e-ul n-o poate atinge într-o zi).

SETURI = {
    'mod': ['test/unit/imagini.document.test.ts'],
    'imp': ['test/unit/imagini.import.test.ts', 'test/unit/import.rotire.test.ts'],
    'man': ['test/unit/imagini.manere.test.ts'],
    'baza': ['test/unit/imagini.foaie.test.ts'],
    'ale': ['test/unit/desen.test.ts'],
}
E2E = ['test/e2e/imagini-foaie.spec.ts']
