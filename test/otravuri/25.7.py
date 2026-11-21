# Lista de otrăvuri a feliei 25.7↑ (PDF-urile scanate, ADR 0270), 18.11.2026, alese de autor: ușa PDF (imaginile ținute
# minte, stratul oprit, cea mai mare imagine, orientarea și mărimea din așezare, DPI-ul, CCITT-ul împachetat: K, BlackIs1,
# alinierea, coloanele; eșantioanele brute: Decode, hârtia datelor scurte, paleta, ICCBased și rezerva lui; Exif-ul scos;
# refuzurile JBIG2 și Separation; filtrul de imagine care nu e ultimul), calculul (orientarea aplicată, mărimea din fișier
# întoarsă, poza pentru fereastră), ușa importului (trasarea singură, vectorii refuzați, paginile PDF-ului, DPI-ul și
# orientarea în cerere, refuzurile TIFF-ului ca ale imaginii paginii) și dialogul (butoanele, alegerea ținută la recitire).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


PD = 'src/io/pdf.ts'
PO = 'src/io/pdfObiecte.ts'
CT = 'src/jobs/calculTrasare.ts'
CA = 'src/ui/actiuniImportCalcul.ts'
DI = 'src/ui/DialogImport.tsx'
IC = 'src/app/ImportConectat.tsx'
AP = 'src/app/App.tsx'
AI = 'src/ui/actiuniImport.ts'

o('P01', PD, '      w.imagini.push({ flux: f, D });\n', '', 'scan', 'imaginile paginii nu se țin minte')
o('P02', PD, "    if (f.dict.has('OC')) {\n      const v = await vizibilitate(doc, w.straturi, f.dict.get('OC') ?? null);",
  "    if (sub === 'Form' && f.dict.has('OC')) {\n      const v = await vizibilitate(doc, w.straturi, f.dict.get('OC') ?? null);", 'scan',
  'o imagine pe un strat oprit se numără')
o('P03', PD, '    if (a > arie) { im = x; arie = a; }', '    if (arie === 0) { im = x; arie = a; }', 'scan', 'prima imagine, nu cea mai mare')
o('P04', PD, '  if (Math.abs(a) + Math.abs(d) >= Math.abs(b) + Math.abs(c)) return d >= 0 ? (a >= 0 ? 1 : 2) : a >= 0 ? 4 : 3;',
  '  if (Math.abs(a) + Math.abs(d) >= Math.abs(b) + Math.abs(c)) return d >= 0 ? (a >= 0 ? 1 : 4) : a >= 0 ? 2 : 3;', 'scan',
  'oglinditele, încurcate (2 cu 4)')
o('P05', PD, '  return c >= 0 ? (b <= 0 ? 6 : 7) : b <= 0 ? 5 : 8;', '  return c >= 0 ? (b <= 0 ? 8 : 7) : b <= 0 ? 5 : 6;', 'scan',
  'rotirile, în sens opus (6 cu 8)')
o('P06', PD, '  if (Math.abs(a) + Math.abs(d) >= Math.abs(b) + Math.abs(c)) return',
  '  if (Math.abs(a) + Math.abs(d) <= Math.abs(b) + Math.abs(c)) return', 'scan', 'transpunerea, judecată invers')
o('P07', PD, '  const latimeMm = t ? lv : lu, inaltimeMm = t ? lu : lv;', '  const latimeMm = lu, inaltimeMm = lv;', 'scan',
  'mărimea unei imagini rotite, neîntoarsă')
o('P08', PD, '    dpi: ((t ? f.inaltime : f.latime) * 25.4) / latimeMm,', '    dpi: (f.latime * 25.4) / latimeMm,', 'scan',
  'DPI-ul unei imagini rotite, pe latura greșită')
o('P09', PD, "  const foto = (await da('BlackIs1')) === inv ? 0 : 1;", '  const foto = inv ? 1 : 0;', 'scan', 'BlackIs1 nu se citește')
o('P10', PD, '  const compresie = K < 0 ? 4 : K === 0 && aliniat && !eol ? 2 : 3;', '  const compresie = K < 0 ? 4 : 3;', 'scan',
  'G3 1D pe octeți citit ca T.4 (rândurile nealiniate)')
o('P11', PD, "    octeti: scrieTiffSimplu({ latime: W, inaltime: H, biti: 1, esantioane: 1, foto, compresie, ...(compresie === 3 ? { t4: K > 0 ? 1 : 0 } : {}), date }),",
  "    octeti: scrieTiffSimplu({ latime: W, inaltime: H, biti: 1, esantioane: 1, foto, compresie, ...(compresie === 3 ? { t4: 0 } : {}), date }),", 'scan',
  'G3 2D citit ca 1D')
o('P12', PD, '  if (aliniat && (K < 0 || (K > 0 && !eol))) return', '  if (aliniat && K > 0 && !eol) return', 'scan',
  'G4 pe octeți primit (și citit greșit)')
o('P13', PD, '  if (coloane !== W) return', '  if (coloane < W) return', 'scan', 'coloanele mai multe decât lățimea, primite')
o('P14', PD, "  const foto = sfel === null || sfel === 'gri' ? (inv ? 0 : 1) :", "  const foto = sfel === null || sfel === 'gri' ? 1 :", 'scan',
  'Decode inversat, ignorat la gri și la mască')
o('P15', PD, '    const o = new Uint8Array(total).fill(foto === 1 || foto === 2 ? 0xff : 0);', '    const o = new Uint8Array(total);', 'scan',
  'datele scurte, completate cu negru')
o('P16', PD, '    rgb.forEach((c, i) => { h[i * n + k] = (c ?? 0) * 257; });', '    rgb.forEach((c, i) => { h[3 * k + i] = (c ?? 0) * 257; });', 'scan',
  'paleta scrisă pe pixeli, nu pe canale')
o('P17', PD, '  for (let k = 0; k <= Math.min(p.hival, n - 1); k++) {', '  for (let k = 0; k < Math.min(p.hival, n - 1); k++) {', 'scan',
  'ultima culoare a paletei, pierdută')
o('P18', PD, '      if (n === 1 || n === 3 || n === 4) return', '      if (n === 1 || n === 3) return', 'scan', 'ICCBased cu 4 componente, refuzat')
o('P19', PD, '      return alt !== undefined && adanc < 4 ? spatiul(doc, alt, adanc + 1) : `ICCBased /N ${n}`;', '      return `ICCBased /N ${n}`;',
  'scan', 'fără spațiul de rezervă al lui ICCBased')
o('P20', PD, "    if (m === 0xe1 && latin1(j.subarray(p + 4, p + 10)) === 'Exif\\x00\\x00') scoase.push([p, z]);", '', 'scan',
  'orientarea Exif rămâne în JPEG (browserul ar întoarce imaginea)')
o('P21', PD, "  if (codec === 'JBIG2Decode') return { ok: false, cod: 'nesprijinit', detaliu: 'JBIG2Decode (JBIG2)' };\n", '', 'scan',
  'JBIG2 citit ca eșantioane brute')
o('P22', PD, "    default: return nume ?? '?';", "    default: return { fel: 'gri' };", 'scan', 'Separation citit ca gri')
o('P23', PO, '        if (i !== filtre.length - 1) throw new PdfStricat(`filtrul de imagine ${c} nu e ultimul`);\n', '', 'scan',
  'un filtru de imagine urmat de altul, primit')
o('P24', PO, '    if (r.codec !== null) throw new PdfStricat(`filtru necunoscut: ${r.codec}`);\n', '', 'scan',
  'decodarea obișnuită trece de un filtru de imagine')
o('K01', CT, '    img = orienteaza(img, c.orientare);\n', '', 'scan', 'orientarea așezării nu se aplică')
o('K02', CT, '    if (redusDin && c.orientare >= 5 && c.orientare <= 8) redusDin = { latime: redusDin.inaltime, inaltime: redusDin.latime };\n',
  '', 'scan', 'mărimea din fișier a unei imagini reduse și rotite, neîntoarsă')
o('K03', CT, '    poza = img;\n  }\n', '  }\n', 'scan', 'fără poza paginii pentru fereastră')
o('D01', CA, "  if ((r.imagini ?? 0) > 0 && (o.imagine === true || !vectori)) return",
  "  if ((r.imagini ?? 0) > 0 && o.imagine === true) return", 'scan', 'pagina scanată nu se trasează singură')
o('D02', CA, "  const vectori = r.ok || r.cod !== 'gol';", '  const vectori = r.ok;', 'scan', 'vectorii refuzați (departe) lasă locul imaginii')
o('D03', CA, '  if (p.ok) return p.format === \'imagine\' ? { ...p, trasare: { ...p.trasare, pagini: im.pagini }, vectoriPdf } : p;',
  '  if (p.ok) return p.format === \'imagine\' ? { ...p, vectoriPdf } : p;', 'scan', 'paginile TIFF-ului, nu ale PDF-ului')
o('D04', CA, '    peteMm: a.peteMm, gauriMm: a.gauriMm, latimeMm: a.latimeMm, dpi: pdf ? pdf.dpi : dpiImagine(f.octeti),',
  '    peteMm: a.peteMm, gauriMm: a.gauriMm, latimeMm: a.latimeMm, dpi: dpiImagine(f.octeti),', 'scan', 'DPI-ul așezării nu ajunge la calcul')
o('D05', CA, '    ...(pdf ? { orientare: pdf.orientare } : {}),\n', '', 'scan', 'orientarea așezării nu ajunge la calcul')
o('D06', CA, "  if (p.cod === 'tiff' || p.cod === 'tiff-stricat') {", "  if (p.cod === 'tiff') {", 'scan',
  'un G4 stricat spus „TIFF stricat”')
o('D07', CA, "      : previzualizarePdf(f, o.pagina, { imagine: o.imaginePdf === true, trasare: o.trasare, semnal: o.semnal });",
  "      : previzualizarePdf(f, o.pagina, { trasare: o.trasare, semnal: o.semnal });", 'e2e', 'cererea imaginii nu ajunge la ușă')
o('U01', DI, "    : !imaginePdf && stare.format === 'pdf' && (stare.imagini ?? 0) > 0 ? 'imagine'",
  "    : !imaginePdf && stare.format === 'pdf' && (stare.imagini ?? 0) > 1 ? 'imagine'", 'e2e', 'fără butonul „Trasează imaginea paginii”')
o('U02', DI, "      : imaginePdf && 'vectoriPdf' in stare && stare.vectoriPdf === true ? 'vectori' : null;", '      : null;', 'e2e',
  'fără butonul „Vectorii paginii”')
o('U03', IC, '      trasare: dialog.trasare ?? TRASARE_IMPLICITA, ...(dialog.imaginePdf ? { imaginePdf: true } : {}), ...schimbare,',
  '      trasare: dialog.trasare ?? TRASARE_IMPLICITA, ...schimbare,', 'e2e', 'o alegere a trasării uită imaginea paginii')
o('U04', AP, '    imaginePdf: () => a.imaginePdf === true,\n', '', 'e2e', 'contextul ușii fără alegerea imaginii')
o('U05', AI, '        ...(unitate ? { unitate } : {}), ...(pagina ? { pagina } : {}), ...(imaginePdf ? { imaginePdf } : {}),',
  '        ...(unitate ? { unitate } : {}), ...(pagina ? { pagina } : {}),', 'e2e', 'acțiunea nu trece alegerea imaginii')

SETURI = {
    'scan': ['test/unit/import.pdf.scanat.test.ts'],
    'scan2': ['test/unit/import.pdf.scanat.test.ts', 'test/unit/import.pdf.test.ts', 'test/unit/pdf.obiecte.test.ts', 'test/unit/import.imagine.test.ts'],
    'pdf': ['test/unit/pdf.obiecte.test.ts', 'test/unit/import.pdf.test.ts'],
    'pdf2': ['test/unit/pdf.obiecte.test.ts', 'test/unit/import.pdf.test.ts', 'test/unit/pdf.corpus.test.ts', 'test/unit/import.pdf.scanat.test.ts'],
}
# Doar proba PDF-urilor scanate din spec (celelalte nu ating codul otrăvit, iar sub încărcare pică din timp).
E2E = ['test/e2e/trasare.spec.ts', '--grep=PDF scanat']
