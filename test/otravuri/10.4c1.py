# Lista de otrăvuri a feliei 10.4↑c-1 (cotele în exportul vectorilor: stratul lor în DXF, SVG, PDF și EPS, cifrele ca
# trăsături, „Cu cotele” și grupul Exportul din Setări; ADR 0330 §6, §7), 25.11.2026, alese de autor: entitățile pure ale
# cotelor, scriitorii, intrarea exportului, setările noi (prinse de unitare), apoi panoul și fereastra Setări (prinse de e2e).
# Oracolul Python (test/oracles-py/export2d_cote.py) se probează separat, pe otrăvurile „P”, cu corpusul regenerat (DEVLOG).
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
DR = 'src/io/drumuri.ts'
S = 'src/app/setariCote.ts'
C = 'src/text/cifreCote.ts'

# Entitățile cotelor.
o('X01', X, "const INLOCUITE: Readonly<Record<string, string>> = { '′': \"'\", '″': '\"' };", "const INLOCUITE: Readonly<Record<string, string>> = { '′': \"'\" };",
  'export', 'secunda nescrisă')
o('X02', X, "  inchis: false, varfuri: [{ p: peArc(a, a.de), s: { tip: 'A', bulge: Math.tan(a.baleiaj / 4) } }, { p: peArc(a, a.de + a.baleiaj), s: LINIE }],",
  "  inchis: false, varfuri: [{ p: peArc(a, a.de), s: { tip: 'A', bulge: -Math.tan(a.baleiaj / 4) } }, { p: peArc(a, a.de + a.baleiaj), s: LINIE }],",
  'export', 'arcul unghiului orar (de partea cealaltă a coardei)')
o('X03', X, "  inchis: false, varfuri: [{ p: peArc(a, a.de), s: { tip: 'A', bulge: Math.tan(a.baleiaj / 4) } }, { p: peArc(a, a.de + a.baleiaj), s: LINIE }],",
  "  inchis: false, varfuri: [{ p: peArc(a, a.de), s: { tip: 'A', bulge: Math.tan(a.baleiaj / 2) } }, { p: peArc(a, a.de + a.baleiaj), s: LINIE }],",
  'export', 'bulge din jumătatea unghiului')
o('X04', X, '  const r = (unghi * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);', '  const r = (-unghi * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);',
  'export', 'cifrele rotite invers')
o('X05', X, "      e: [{ fel: 'polilinie', strat: 'COTE', element: id, inchis: true, latime: r, varfuri: [{ x: x - r / 2, y, bulge: 1 }, { x: x + r / 2, y, bulge: 1 }] }],",
  "      e: [{ fel: 'polilinie', strat: 'COTE', element: id, inchis: true, latime: r / 2, varfuri: [{ x: x - r / 2, y, bulge: 1 }, { x: x + r / 2, y, bulge: 1 }] }],",
  'export', 'punctul, un inel, nu un disc')
o('X06', X, "  if (c.plina) return { e: [{ fel: 'plin', strat: 'COTE', element: id, puncte: [a, b, d] }], cutie };",
  "  if (c.plina) return { e: [{ fel: 'polilinie', strat: 'COTE', element: id, inchis: true, varfuri: [a, b, d].map((p) => ({ x: p.x, y: p.y, bulge: 0 })) }], cutie };",
  'export', 'săgeata plină desenată goală')
o('X07', X, '    for (const [a, b] of dc.extensii) pune(linie(a, b));', '', 'export', 'fără extensii')
o('X08', X, '    for (const [a, b] of dc.bucati) pune(linie(a, b));', '    pune(linie(dc.linie[0], dc.linie[1]));', 'export',
  'linia întreagă, și peste golul cifrei în linie')
o('X09', X, '    if (!felCunoscut(c.fel) || !Array.isArray(c.puncte)) continue;', '    if (!Array.isArray(c.puncte)) continue;', 'export',
  'un fel necunoscut numărat')
o('X10', X, '    const p = c.puncte.map((a) => punctAncora(a, lume).p);', '    const p = c.puncte.map((a) => ({ x: a.x, y: a.y }));', 'export',
  'cota legată, din ultimul loc văzut, nu de pe formă')
o('X11', X, "  return { entitati, cutie: cote > 0 ? cutie : null, cote, lipsa: [...lipsa] };", "  return { entitati, cutie: cote > 0 ? cutie : null, cote, lipsa: [] };",
  'export', 'semnele lipsă nespuse')
o('X12', X, '      cutie: { minX: x - r, minY: y - r, maxX: x + r, maxY: y + r },', '      cutie: { minX: x - r / 2, minY: y - r / 2, maxX: x + r / 2, maxY: y + r / 2 },',
  'export', 'cutia discului fără lățimea lui')
o('X13', C, "    const t = aseazaText(font, { continut: text, inaltime, spatiere: 0, interlinie: 1, aliniere: 'centru' });",
  "    const t = aseazaText(font, { continut: text, inaltime, spatiere: 0, interlinie: 1, aliniere: 'stanga' });", 'export',
  'cifrele aliniate la stânga, nu centrate')
# Scriitorii.
o('W01', DX, "    antet('SOLID', 'AcDbTrace');", "    antet('SOLID', 'AcDbSolid');", 'export', 'subclasa SOLID greșită (ezdxf o repară)')
o('W02', DX, '  if (d < 48) return [max < 96 || max >= 232 ? 7 : max < 168 ? 8 : 9, n];', '  if (d < 0) return [7, n];', 'export',
  'griul primește o nuanță')
o('W03', DX, '          g(2, n); g(70, \'0\'); g(62, String(aci)); g(420, String(exacta)); g(6, \'Continuous\'); g(370, \'-3\');',
  '          g(2, n); g(70, \'0\'); g(62, String(aci)); g(6, \'Continuous\'); g(370, \'-3\');', 'export', 'fără culoarea exactă (420)')
o('W04', DX, "  const nume = (s: Strat): string => (s === 'COTE' ? v.stratCote?.nume ?? 'COTE' : s);", "  const nume = (s: Strat): string => s;", 'export',
  'numele stratului din setări ignorat')
o('W05', DX, "    g(90, String(e.varfuri.length)); g(70, e.inchis ? '1' : '0'); g(43, e.latime ?? 0);",
  "    g(90, String(e.varfuri.length)); g(70, e.inchis ? '1' : '0'); g(43, 0);", 'export', 'discul DXF fără lățime')
o('W06', SV, "    linii.push(`<g id=\"${nume}\" inkscape:groupmode=\"layer\" inkscape:label=\"${nume}\" fill=\"none\" stroke=\"${culoare}\" stroke-width=\"${nr(cote?.grosime ?? grosime)}\">`);",
  "    linii.push(`<g id=\"${nume}\" inkscape:groupmode=\"layer\" inkscape:label=\"${nume}\" fill=\"none\" stroke=\"${culoare}\" stroke-width=\"${nr(grosime)}\">`);",
  'export', 'SVG: grosimea cotelor ignorată')
o('W07', SV, "        : e.fel === 'plin' ? `<path d=\"${cale(e, H)}\" fill=\"${culoare}\" stroke=\"none\"/>`",
  "        : e.fel === 'plin' ? `<path d=\"${cale(e, H)}\"/>`", 'export', 'SVG: săgeata plină neumplută')
o('W08', PD, "    if (cote) continut.push('q', `${culoare} rg`, `${nr(cote.grosime)} w`);", "    if (cote) continut.push('q', `${culoare} rg`);", 'export',
  'PDF: grosimea cotelor ignorată')
o('W09', PD, "    ...folosite.map((s) => `<< /Type /OCG /Name (${s === 'COTE' ? v.stratCote?.nume ?? s : s}) >>`),",
  "    ...folosite.map((s) => `<< /Type /OCG /Name (${s}) >>`),", 'export', 'PDF: stratul OCG cu numele implicit')
o('W10', EP, "    if (cote) linii.push('gsave', `${nr(cote.grosime)} setlinewidth`);", "    if (cote) linii.push('gsave');", 'export',
  'EPS: grosimea cotelor ignorată')
o('W11', DR, "    return [{ op: 'm', x: p0!.x, y: p0!.y }, ...rest.map((p) => ({ op: 'l' as const, x: p.x, y: p.y })), { op: 'h' }];",
  "    return [{ op: 'm', x: p0!.x, y: p0!.y }, ...rest.map((p) => ({ op: 'l' as const, x: p.x, y: p.y }))];", 'export',
  'PDF / EPS: triunghiul neînchis')
# Intrarea exportului.
o('V01', EV, '  if (cote && ec?.cutie) v = { ...v, entitati: [...v.entitati, ...ec.entitati], cutie: uneste(v.cutie, ec.cutie), stratCote: cote.strat };',
  '  if (cote && ec?.cutie) v = { ...v, entitati: [...v.entitati, ...ec.entitati], stratCote: cote.strat };', 'export',
  'pagina nu se lărgește cât ies cotele')
o('V02', EV, '  if (cote && ec?.cutie) v = { ...v, entitati: [...v.entitati, ...ec.entitati], cutie: uneste(v.cutie, ec.cutie), stratCote: cote.strat };',
  '  if (cote) v = { ...v, entitati: [...v.entitati, ...(ec?.entitati ?? [])], cutie: uneste(v.cutie, ec?.cutie ?? v.cutie), stratCote: cote.strat };',
  'export', 'foaia fără cote, cu bifa: fișierul se schimbă (stratCote pus degeaba)')
# Setările.
o('S01', S, "  export: { cuCote: false, strat: 'COTE', culoare: '#006d8f', grosime: 0.1 },", "  export: { cuCote: true, strat: 'COTE', culoare: '#006d8f', grosime: 0.1 },",
  'setari', 'bifa pornită implicit')
o('S02', S, "  grosime: [0.05, 1],", "  grosime: [0.01, 1],", 'setari', 'grosimea sub 0,05 mm')
o('S03', S, '  new RegExp(`^[A-Za-z0-9_-]{1,${STRAT_MAXIM}}$`).test(n) && !(STRATURI_REZERVATE as readonly string[]).includes(n.toUpperCase());',
  '  new RegExp(`^[A-Za-z0-9_-]{1,${STRAT_MAXIM}}$`).test(n) && !(STRATURI_REZERVATE as readonly string[]).includes(n);', 'setari',
  '„foaie” cu litere mici trece (DXF-ul nu deosebește literele)')
o('S04', S, "      culoare: typeof ex['culoare'] === 'string' && CULOARE.test(ex['culoare']) ? ex['culoare'] : I.export.culoare,",
  "      culoare: typeof ex['culoare'] === 'string' ? ex['culoare'] : I.export.culoare,", 'setari', 'orice text e culoare')
o('S05', S, "export const GRUPURI_COTE = ['cifre', 'linii', 'raza', 'comportament', 'lipire', 'masurare', 'export'] as const",
  "export const GRUPURI_COTE = ['cifre', 'linii', 'raza', 'comportament', 'lipire', 'masurare'] as const", 'setari',
  'grupul Exportul lipsă din fereastră și din „Înapoi la implicit”')
# Panoul și fereastra Setări (e2e).
o('E01', 'src/app/Editare.tsx', '      setCuCote((x) => x ?? s.cuCote);', '      setCuCote((x) => x ?? false);', 'e2e', 'bifa nu pornește după Setări')
o('E02', 'src/app/Editare.tsx', '    const cote = nCote > 0 && cuCote === true;', '    const cote = nCote > 0;', 'e2e', 'cotele exportate și fără bifă')
o('E03', 'src/app/Editare.tsx', "        return { stil: sc.stilCote(s), format: sc.formatCote(s, limba() === 'ro'), cifre: tx.cifreDinFont(f.font), strat: { nume: s.export.strat, culoare: s.export.culoare, grosime: s.export.grosime } };",
  "        return { stil: sc.stilCote(s), format: sc.formatCote(s, limba() === 'ro'), cifre: tx.cifreDinFont(f.font), strat: { nume: 'COTE', culoare: s.export.culoare, grosime: s.export.grosime } };",
  'e2e', 'numele stratului din Setări neaplicat la export')
o('E04', 'src/app/Editare.tsx', '      {nCote > 0 ? (\n        <>', '      {nCote > 1 ? (\n        <>', 'e2e', 'bifa doar de la două cote')
o('E05', 'src/app/Setari.tsx', '        onChange={(e) => { const v = e.currentTarget.value; setText(v); if (numeStratBun(v) && v !== valoare) la(v); }}',
  '        onChange={(e) => { const v = e.currentTarget.value; setText(v); if (v !== valoare) la(v); }}', 'e2e',
  'numele rezervat trimis setărilor (citit înapoi ca implicit)')
o('E06', 'src/app/Setari.tsx', "        {nr('grosime', 'export.grosime', 'setari.cote.export.grosime', s.export.grosime, MARGINI.grosime, (x) => { exp({ grosime: x }); }, 'setari.cote.export.grosime.nota')}",
  "        {nr('grosime', 'export.grosime', 'setari.cote.export.grosime', s.export.grosime, MARGINI.grosime, () => undefined, 'setari.cote.export.grosime.nota')}",
  'e2e', 'grosimea nu se scrie')

SETURI = {
    'export': ['test/unit/cote.export.test.ts'],
    'setari': ['test/unit/cote.setari.test.ts'],
}
E2E = ['test/e2e/cote.export.spec.ts']
