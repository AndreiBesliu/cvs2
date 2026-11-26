# Lista de otrăvuri a feliei 10.4↑d-3 (cotele în raportul foilor; ADR 0330 §7), 26.11.2026, alese de autor: desenul foii cu
# cotele (mărirea, liniile, culoarea, pagina lărgită, desenul de dinainte fără cote) și setarea (implicitul, citirea), prinse
# de unitare, apoi bifa din raport și desenul pe tot rândul (prinse de e2e).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


R = 'src/io/raportCote.ts'
V = 'src/io/svgExport.ts'
S = 'src/app/setariCote.ts'
D = 'src/app/DialogRaportFoi.tsx'
C = 'src/app/stil.css'

# Desenul foii cu cotele, pur.
o('R01', R, "  return m <= 1 ? stil : {", "  return m <= 0.5 ? stil : {", 'raport', 'cifrele micșorate pe o foaie mică')
o('R02', R, "inaltime: stil.inaltime * m, capat: stil.capat * m,", "inaltime: stil.inaltime * m, capat: stil.capat,", 'raport',
  'săgețile rămân mici lângă cifrele mărite')
o('R03', R, "gol: stil.gol * m, depasire: stil.depasire * m };", "gol: stil.gol, depasire: stil.depasire * m };", 'raport',
  'golul extensiilor nemărit')
o('R04', R, "export const PARTE_CIFRE_RAPORT = 60;", "export const PARTE_CIFRE_RAPORT = 100;", 'raport', 'cifrele prea mici ca să se citească')
o('R05', R, "grosime: latura / (2 * PARTE_LINII_RAPORT) },", "grosime: latura / PARTE_LINII_RAPORT },", 'raport',
  'liniile cotelor cât ale pieselor')
o('R06', R, "stratCote: { nume: 'COTE', culoare: cote.culoare,", "stratCote: { nume: 'COTE', culoare: '#006d8f',", 'raport',
  'culoarea din setări ignorată')
o('R07', R, "  return scrieSvg(cuCote, latura / PARTE_LINII_RAPORT, uneste({ minX: 0, minY: 0, maxX: v.latime, maxY: v.inaltime }, ec.cutie));",
  "  return scrieSvg(cuCote, latura / PARTE_LINII_RAPORT);", 'raport', 'cotele din afara foii tăiate')
o('R08', R, "  const ec = cote ? entitatiCote(doc, k, { ...cote, stil: stilRaport(cote.stil, latura) }) : null;",
  "  const ec = cote ? entitatiCote(doc, k, cote) : null;", 'raport', 'cotele la mărimea adevărată')
o('R09', R, "  if (!cote || !ec?.cutie) return scrieSvg(v, latura / PARTE_LINII_RAPORT);",
  "  if (!cote || !ec?.cutie) return scrieSvg(v, latura / 100);", 'raport', 'desenul fără cote, altul decât cel de dinainte')
o('R10', V, "  const [x0, y0, w, h] = pagina ? [pagina.minX, H - pagina.maxY,", "  const [x0, y0, w, h] = pagina ? [pagina.minX, pagina.minY,",
  'raport', 'pagina lărgită, neîntoarsă pe Y')
o('R11', R, "  return s ? Math.max(s.latime, s.inaltime) : 0;", "  return s ? Math.min(s.latime, s.inaltime) : 0;", 'raport',
  'latura mică în loc de cea mare')
# Setarea.
o('S01', S, "    raport: { cuCote: bif(rp['cuCote'], I.raport.cuCote) },", "    raport: { cuCote: I.raport.cuCote },", 'setari',
  'setarea raportului nu se citește înapoi')
o('S02', S, "  raport: { cuCote: false },\n};", "  raport: { cuCote: true },\n};", 'setari', 'raportul pornește cu cotele')
o('S03', S, "'masurare', 'export', 'raport'] as const", "'masurare', 'export'] as const", 'setari', 'grupul fără „Înapoi la implicit”')
# Bifa din raport (e2e).
o('E01', D, "setCuCote((x) => x ?? m.setariCote().raport.cuCote)", "setCuCote((x) => x ?? false)", 'e2e', 'bifa nu pornește după Setări')
o('E02', D, "          {nCote > 0 ? (", "          {nCote >= 0 ? (", 'e2e', 'bifa și fără cote')
o('E03', D, "<img src={cuCoteF ?? imagini.get(f.k)}", "<img src={imagini.get(f.k)}", 'e2e', 'desenul nu arată cotele')
o('E04', D, "    setImaginiCote(null);\n", "", 'e2e', 'oprită, desenul rămâne cu cotele')
o('E05', C, ".raport-foaie[data-cu-cote] {\n  grid-template-columns: minmax(0, 1fr);\n}", ".raport-foaie[data-cu-cote] {\n}", 'e2e',
  'desenul cu cote rămâne în coloana îngustă')
o('E06', D, "{...(cuCoteF ? { 'data-cu-cote': '' } : {})}", "", 'e2e', 'foaia nu spune că are cote')

SETURI = {
    'raport': ['test/unit/cote.raport.test.ts'],
    'setari': ['test/unit/cote.setari.test.ts'],
}
E2E = ['test/e2e/cote.raport.spec.ts']
