# Lista de otrăvuri a feliei 10.4↑c-2 (cotele ca DIMENSION în DXF, cifrele ca text în DXF, SVG, PDF și EPS, setările „Cotele
# în DXF” și „Cifrele”; ADR 0330 §7), 25.11.2026, alese de autor: definițiile pure ale cotelor, Helvetica, scriitorii, intrarea
# exportului, setările (prinse de unitare), oracolul Python (setul „oracol”: corpusul scris din nou, Ghostscript și
# `export2d_cote.py`, prin `test/otravuri/oracol-cote.ts`), apoi panoul și fereastra Setări (prinse de e2e).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


X = 'src/io/coteExport.ts'
DX = 'src/io/dxfExport.ts'
SV = 'src/io/svgExport.ts'
PD = 'src/io/pdfExport.ts'
EP = 'src/io/epsExport.ts'
EV = 'src/io/exportVectori.ts'
HV = 'src/io/helvetica.ts'
S = 'src/app/setariCote.ts'
OR = 'test/oracles-py/export2d_cote.py'

# Definițiile DIMENSION.
o('K01', X, "  const baza = { element: c.id, steaguri: 32, text, mijloc };", "  const baza = { element: c.id, steaguri: 0, text, mijloc };", 'export',
  'blocul nu e spus doar al cotei (32)')
o('K02', X, "    return { ...baza, steaguri: 32 + 128, tip: c.fel === 'raza' ? 4 : 3, puncte, lider, masura: valoare };",
  "    return { ...baza, tip: c.fel === 'raza' ? 4 : 3, puncte, lider, masura: valoare };", 'export', 'cifra razei nespusă pusă de om (128)')
o('K03', X, "    return c.fel === 'aliniata' ? { ...baza, tip: 1, puncte, masura: valoare } :", "    return c.fel === 'aliniata' ? { ...baza, tip: 0, puncte, masura: valoare } :",
  'export', 'aliniata scrisă ca rotită')
o('K04', X, "    const puncte = { 13: a, 14: b, 10: dc.picioare[1] };", "    const puncte = { 13: a, 14: b, 10: dc.picioare[0] };", 'export',
  'piciorul lui a, nu al lui b')
o('K05', X, "unghi: c.fel === 'orizontala' ? 0 : 90, masura: valoare };", "unghi: c.fel === 'orizontala' ? 90 : 0, masura: valoare };", 'export',
  'orizontala rotită la 90°')
o('K06', X, "    const lider = Math.abs((dc.text.p.x - a.x) * u.x + (dc.text.p.y - a.y) * u.y - r);",
  "    const lider = Math.abs((dc.text.p.x - a.x) * u.x + (dc.text.p.y - a.y) * u.y);", 'export', 'liderul din centru, nu de la cerc')
o('K07', X, "{ 15: b, 10: { x: 2 * a.x - b.x, y: 2 * a.y - b.y } };", "{ 15: b, 10: a };", 'export', 'diametrul din centru, nu din punctul opus')
o('K08', X, "  const primaD1 = d1.x * d2.y - d1.y * d2.x >= 0;", "  const primaD1 = d1.x * d2.y - d1.y * d2.x < 0;", 'export',
  'unghiul în sensul invers arcului (măsura 360° − α)')
o('K09', X, "    const pe1 = plus(l.v, d1, Math.hypot(l.e1.x, l.e1.y)), pe2 = plus(l.v, d2, Math.hypot(l.e2.x, l.e2.y));",
  "    const pe1 = p[1]!, pe2 = p[2]!;", 'export', 'punctele laturilor, nu ale semidreptelor alese')
o('K10', X, "    return s === 1 ? [q0, q1] : [q1, q0];", "    return [q0, q1];", 'export', 'latura nu urmează semidreapta aleasă')
o('K11', X, "  const masura = (valoare * Math.PI) / 180;", "  const masura = valoare;", 'export', 'unghiul în grade la 42')
o('K12', X, "  const mijloc = plus(dc.text.p, sus(dc.text.unghi), dc.text.inaltime / 2);", "  const mijloc = dc.text.p;", 'export',
  'mijlocul textului pe bază')
o('K13', X, "  if (valoare === null || text.trim() === '') return null;", "  if (valoare === null) return null;", 'export',
  'o cotă fără text scrisă ca DIMENSION (textul gol ar fi măsurat)')
o('K14', X, "      cutie = uneste(cutie, cutieText(dc.text, text));\n", "", 'export', 'cutia fără textul cifrei')
o('K15', X, "  const colturi = [f({ x: -w / 2, y: -h / 4 }), f({ x: w / 2, y: -h / 4 }), f({ x: w / 2, y: h }), f({ x: -w / 2, y: h })];",
  "  const colturi = [f({ x: -w / 4, y: -h / 4 }), f({ x: w / 4, y: -h / 4 }), f({ x: w / 4, y: h }), f({ x: -w / 4, y: h })];", 'export',
  'cutia textului cât jumătate din el')
o('K16', X, "      for (const x of text) if (x.trim()) lipsa.add(x);\n", "", 'export', 'fără fontul cifrelor: nimic spus lipsă')
# Helvetica.
o('H01', HV, "const ALTELE: Readonly<Record<string, readonly [number, number]>> = { '°': [0xb0, 400], '±': [0xb1, 584], '×': [0xd7, 584], 'Ø': [0xd8, 778] };",
  "const ALTELE: Readonly<Record<string, readonly [number, number]>> = { '°': [0xb0, 400], '±': [0xb1, 584], '×': [0xd7, 584], 'Ø': [0xd8, 722] };",
  'export', 'Ø mai îngust (PDF-ul îl centrează greșit)')
o('H02', HV, "  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,",
  "  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 722,", 'export', 'lățimea lui O (oarecare din tabel) greșită')
o('H03', HV, "k > 126 ? `\\\\${k.toString(8)}`", "k > 126 ? `\\\\${k.toString(10)}`", 'export', 'codurile din afara ASCII în zecimal, nu octal')
o('H04', HV, "export const MAJUSCULA_HELVETICA = 0.718;", "export const MAJUSCULA_HELVETICA = 0.75;", 'export', 'majuscula lui Helvetica greșită')
o('H05', HV, "const INLOCUITE: Readonly<Record<string, string>> = { '′': \"'\", '″': '\"' };", "const INLOCUITE: Readonly<Record<string, string>> = { '′': \"'\" };",
  'export', 'secunda nescrisă în Helvetica')
o('H06', HV, "(k === 0x5c || k === 0x28 || k === 0x29 ?", "(k === 0x5c ?", 'export', 'parantezele fără bară în șir')
# Scriitorii.
o('D01', DX, "g(2, x.nume); g(70, '1'); g(10, 0);", "g(2, x.nume); g(70, '0'); g(10, 0);", 'export', 'blocul cotei nu e anonim')
o('D02', DX, "    tabel('DIMSTYLE', H.dimstyle, dim ? 2 : 1, () => {", "    tabel('DIMSTYLE', H.dimstyle, 1, () => {", 'export',
  'tabelul stilurilor spune un singur stil')
o('D03', DX, "      for (const x of cote) {\n        inregistrare('BLOCK_RECORD', x.br, H.blockRecord, 'AcDbBlockTableRecord');\n        g(2, x.nume);\n      }\n", "",
  'export', 'blocurile cotelor fără înregistrare')
o('D04', DX, "    return k < 32 || k > 126 ?", "    return k < 32 ?", 'export', 'semnele din afara ASCII scrise direct')
o('D05', DX, "    if (c === '\\\\' || c === '{' || c === '}') return `\\\\${c}`;", "    if (c === '\\\\') return `\\\\${c}`;", 'export',
  'acoladele MTEXT-ului fără bară')
o('D06', DX, "  g(140, s.inaltime); g(142, s.capete === 'oblica' ? s.capat : 0); g(144, 1 / MM_PE_UNITATE[f.unitate]); g(147, 0.3 * s.inaltime);",
  "  g(140, s.inaltime); g(142, s.capete === 'oblica' ? s.capat : 0); g(144, MM_PE_UNITATE[f.unitate]); g(147, 0.3 * s.inaltime);", 'export',
  'scara unității inversată (inch × 25,4)')
o('D07', DX, "  g(271, String(f.unitate === 'fractii' ? Math.round(Math.log2(f.fractie)) : f.zecimale));",
  "  g(271, String(f.zecimale));", 'export', 'fracțiile cu zecimalele, nu cu numitorul')
o('D08', DX, "  if (d.tip === 3 || d.tip === 4) g(40, d.lider ?? 0);\n", "", 'export', 'liderul razei nescris')
o('D09', DX, "    g(10, e.p.x - (s * e.inaltime) / 2); g(20, e.p.y + (c * e.inaltime) / 2); g(30, 0); g(40, e.inaltime); g(41, 0);",
  "    g(10, e.p.x); g(20, e.p.y); g(30, 0); g(40, e.inaltime); g(41, 0);", 'export', 'MTEXT-ul pe bază, agățat de mijloc')
o('D10', DX, "    for (const { e, h } of entitati) if (blocul(e) === undefined) scrieEntitate(g, e, h, H.brModel, nume(e.strat));",
  "    for (const { e, h } of entitati) scrieEntitate(g, e, h, H.brModel, nume(e.strat));", 'export', 'desenul cotei și în ENTITIES, de două ori')
o('D11', DX, "  if (d.tip === 0) { g(50, d.unghi ?? 0); g(100, 'AcDbRotatedDimension'); }", "  if (d.tip === 0) g(100, 'AcDbRotatedDimension');", 'export',
  'unghiul rotitei nescris (verticala măsurată pe X)')
o('V01', SV, "  const rot = e.unghi === 0 ? '' : ` transform=\"rotate(${nr(-e.unghi)} ${x} ${y})\"`;", "  const rot = e.unghi === 0 ? '' : ` transform=\"rotate(${nr(e.unghi)} ${x} ${y})\"`;",
  'export', 'textul SVG rotit invers')
o('V02', SV, "c.codePointAt(0)! > 126 ? `&#${c.codePointAt(0)};` : c", "c", 'export', 'SVG-ul cu semnele din afara ASCII directe')
o('V03', PD, "${nr(e.p.x - (c * w) / 2)} ${nr(e.p.y - (s * w) / 2)} Tm", "${nr(e.p.x - (c * w) / 2)} ${nr(e.p.y)} Tm", 'export',
  'textul PDF rotit, necentrat pe Y')
o('V04', PD, "  const font = cuText ? ` /Font << /F1 ${5 + folosite.length} 0 R >>` : '';", "  const font = cuText ? ` /Font << /F1 ${4 + folosite.length} 0 R >>` : '';",
  'export', 'fontul PDF trimis la alt obiect')
o('V05', EP, "    ...(cuText ? ['%%DocumentNeededResources: font Helvetica'] : []),\n", "", 'export', 'EPS-ul nu spune fontul cerut')
o('V06', EP, "  '/Encoding ISOLatin1Encoding def',", "  '/Encoding StandardEncoding def',", 'export', 'EPS-ul fără codarea în care ° și Ø există')
o('V07', EV, "    if (format === 'dxf' && cote.dxf === 'dimension' && ec.definitii.length > 0)", "    if (format === 'dxf' && ec.definitii.length > 0)", 'export',
  '„Linii și cifre” ignorat: tot DIMENSION')
o('V08', EV, "    if (format === 'pdf' || format === 'eps') for (const e of ec.entitati) if (e.fel === 'text') for (const x of inHelvetica(e.text).lipsa) lipsa.add(x);\n",
  "", 'export', 'semnele fără Helvetica nespuse')
# Setările.
o('S01', S, "  export: { cuCote: false, strat: 'COTE', culoare: '#006d8f', grosime: 0.1, dxf: 'dimension', cifre: 'trasaturi' },",
  "  export: { cuCote: false, strat: 'COTE', culoare: '#006d8f', grosime: 0.1, dxf: 'linii', cifre: 'trasaturi' },", 'setari',
  'implicit „Linii și cifre”, nu cotele (răspunsul 5a)')
o('S02', S, "      cifre: unul(ex['cifre'], ['trasaturi', 'text'], I.export.cifre),", "      cifre: I.export.cifre,", 'setari', 'cifrele ca text necitite')
# Oracolul Python, pe corpusul scris din nou.
o('P01', DX, "  g(77, s.loc === 'deasupra' ? '1' : '0');", "  g(77, '0');", 'oracol', 'cifra deasupra nespusă în stil (DIMTAD)')
o('P02', DX, "g(42, d.masura); g(1, textDxf(d.text));", "g(42, d.masura); g(1, '');", 'oracol', 'textul cotei lăsat de măsurat')
o('P03', X, "    return { ...baza, tip: 5, puncte: { 15: l.v, 13: x13, 14: x14, 10: peArc }, masura };",
  "    return { ...baza, tip: 5, puncte: { 15: l.v, 13: x13, 14: x14, 10: l.v }, masura };", 'oracol', 'arcul unghiului din trei puncte, în vârf')
o('P04', SV, ' font-size="${nr(marimeHelvetica(e.inaltime))}"', ' font-size="${nr(e.inaltime)}"', 'oracol', 'textul SVG cât majuscula, nu cât fontul')
o('P05', EP, "show grestore`;", "show grestore`.replace('-2 div', '-1 div');", 'oracol', 'textul EPS mutat cu toată lățimea')
o('P06', DX, "    antet('MTEXT', 'AcDbMText');", "    antet('MTEXT', 'AcDbMText'); g(1, '');", 'oracol', 'un MTEXT cu două texte')
# Panoul și fereastra Setări (e2e).
o('E01', 'src/app/Editare.tsx', "        if (s.export.cifre === 'text') return baza;", "        if (s.export.cifre !== 'text') return baza;", 'e2e',
  'cifrele ca trăsături fără font, ca text cu el')
o('E02', 'src/app/Editare.tsx', "          dxf: s.export.dxf, ca: s.export.cifre,", "          dxf: 'dimension', ca: s.export.cifre,", 'e2e',
  '„Linii și cifre” din Setări neaplicat')
o('E03', 'src/app/Editare.tsx', "              {format === 'dxf' ? ` ${t(`editare.vectori.cote.nota.${felCote.dxf}`)}` : null}", "", 'e2e',
  'fraza nu spune felul cotelor în DXF')
o('E04', 'src/app/Setari.tsx', "valori={v('setari.cote.export.cifre', ['trasaturi', 'text'] as const)} la={(x) => { exp({ cifre: x }); }} />",
  "valori={v('setari.cote.export.cifre', ['trasaturi', 'text'] as const)} la={() => undefined} />", 'e2e', 'cifrele din Setări nescrise')

SETURI = {
    'export': ['test/unit/cote.export.test.ts'],
    'setari': ['test/unit/cote.setari.test.ts'],
    'oracol': ['test/otravuri/oracol-cote.ts'],
}
E2E = ['test/e2e/cote.export.spec.ts']
