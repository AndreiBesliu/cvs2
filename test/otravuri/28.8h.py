# Lista de otrăvuri a feliei 28.8↑h (rândul „pe hârtie” al ferestrei exportului, ADR 0291 §1), 25.11.2026, alese de autor:
# regula adâncimii tăiate (gaura, bifa), trecerile și felul găuririi socotite de aplicație, pașii ciocănirii; în fereastră, ce
# primește rândul (supracursa, bifa), desenul adâncimii și nota, desenul elicei, câmpul ieșirii, greșeala cercului care nu se
# găurește și oprirea lui Exportă, diametrele cercurilor; „Du-mă la …” (28.8↑h-2): derularea până la greșeală, întinderile care
# încap, focusul pe câmpul greșit, diametrul marcat greșit, grupul primei greșeli; peste 18.1↑c, finisarea scoasă din „cât foaia”.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă a ramurii, după commit; cele „e2e” cer build-ul.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


PF = 'src/cam/prinFoaie.ts'
GF = 'src/cam/gaurireFel.ts'
HA = 'src/app/hartieExport.ts'
EC = 'src/app/ExportConectat.tsx'
DE = 'src/ui/DialogExport.tsx'
FO = 'src/ui/FisaOperatie.tsx'
DS = 'src/ui/exportDesene.tsx'

# Regula adâncimii tăiate și rândul „pe hârtie” (probele unitare).
o('U01', PF, "  if (o.incrustatie === 'gaura') return grosime + supracursa;", "  if (o.incrustatie === 'gaura') return grosime;", 'hartie',
  'gaura incrustației fără supracursă')
o('U02', PF, "  return prinFoaie && supracursa > 0 && catFoaia(o, grosime) ? grosime + supracursa : o.adancime;",
  "  return supracursa > 0 && catFoaia(o, grosime) ? grosime + supracursa : o.adancime;", 'hartie', 'tăietura cât foaia trece și fără bifă')
o('U03', HA, "  else adancime = i.grosime === undefined ? i.adancime : adancimeTaiata(", "  else adancime = i.grosime !== undefined ? i.adancime : adancimeTaiata(",
  'hartie', 'rândul ia adâncimea scrisă, nu pe cea tăiată')
o('U04', HA, "  const t = adancime !== null && i.pas !== null ? adancimiTreceri(adancime, i.pas) : null;",
  "  const t = i.adancime !== null && i.pas !== null ? adancimiTreceri(i.adancime, i.pas) : null;", 'hartie', 'trecerile pe adâncimea scrisă')
o('U05', HA, "r !== null && Number.isInteger(r) && r >= 1 &&", "r !== null && r >= 0 &&", 'hartie', 'ciocănirea și cu o ieșire greșită (0, 1,5)')
o('U06', HA, "cercuri.some((c) => c.fel === 'ciocanire') ? pasiCiocanire(treceri, r) : null;", "true ? pasiCiocanire(treceri, r) : null;", 'hartie',
  'pașii ciocănirii și pe un cerc găurit în elice')
o('U07', HA, "fel: D === null ? 'gresit' as const : felGaurire(d, D)", "fel: D === null ? 'gresit' as const : felGaurire(d, 2 * D)", 'hartie',
  'felul socotit cu altă freză decât cea scrisă')
o('U08', GF, "  if (Dc > 2 * D) return 'mare';", "  if (Dc > 2 * D + 1) return 'mare';", 'hartie', 'cercul cu puțin peste două diametre trece')
o('U09', GF, "  return Dc - D <= TOLERANTA_GAURA ? 'ciocanire' : 'elice';", "  return Dc - D <= 2 * TOLERANTA_GAURA ? 'ciocanire' : 'elice';", 'hartie',
  'toleranța găurii cât freza, dublă')
o('U10', GF, "      if (k % retragere === 0) {", "      if (k % retragere === 1) {", 'hartie', 'iese din gaură la alt pas')
o('U11', GF, "        m.push({ z: -fund + RETRAGERE_PARTIALA, taie: false });", "        m.push({ z: -fund - RETRAGERE_PARTIALA, taie: false });", 'hartie',
  'ridicarea dintre pași coboară')
# U12 mutată pe codul din 18.1↑d (26.11): `catFoaia` lasă și degroșarea reliefului cum e scrisă (`o.tip !== 'degrosare'`); aceeași greșeală.
o('U12', PF, "  o.tip !== 'vcarve' && o.tip !== 'finisare' && o.tip !== 'degrosare' && o.incrustatie === 'fara' && Math.abs",
  "  o.tip !== 'vcarve' && o.tip !== 'degrosare' && o.incrustatie === 'fara' && Math.abs", 'hartie', 'finisarea cât foaia (18.1↑c) primește supracursa, în lucrare și pe hârtie')

# Fereastra (e2e).
o('E01', DE, "prinFoaie: cuSupracursa && prinFoaie,", "prinFoaie: false,", 'e2e', 'rândul nu vede bifa „și tăieturile cât foaia”')
o('E02', DE, "grosime: grosimeFoaie, supracursa: cuSupracursa && supracursaCitita !== null ? supracursaCitita : 0,", "grosime: grosimeFoaie, supracursa: 0,",
  'e2e', 'rândul nu vede supracursa')
o('E03', FO, "<DesenAdancime c={c} adancime={h.adancime} treceri={h.treceri}", "<DesenAdancime c={c} adancime={adancimeRand} treceri={h.treceri}",
  'e2e', 'cota adâncimii spune adâncimea scrisă')
o('E04', FO, "<span className=\"nota-camp\" data-treceri>{h.adancime === adancimeRand", "<span className=\"nota-camp\" data-treceri>{true",
  'e2e', 'nota nu spune că lucrarea taie mai adânc')
o('E05', DS, "  const ciocanire = g?.ciocanire ?? null, elice = feluri.has('elice');", "  const ciocanire = g?.ciocanire ?? null, elice = false;",
  'e2e', 'elicea nu se desenează')
o('E06', FO, "  const cuCiocanire = !h.gaurire || !h.gaurire.cercuri.every((c) => c.fel === 'elice') ||",
  "  const cuCiocanire = !h.gaurire || true ||", 'e2e', 'câmpul ieșirii și pe elice')
o('E07', DE, "    && supracursaBuna && numeBun && gauriBune;", "    && supracursaBuna && numeBun;", 'e2e', 'Exportă pornit cu un cerc care nu se găurește')
o('E08', DE, "    for (const m of motiveGaura(cheie, p)) pune(m, 'freza');", "    for (const m of motiveGaura(cheie, p)) pune(m, 'gaurire');", 'e2e',
  'greșeala cercului nu stă lângă freză')
o('E09', DE, "minim: fmtFreza.format(mare / 2)", "minim: fmtFreza.format(mare)", 'e2e', 'freza cea mai mică spusă greșit')
o('E10', EC, "[diametruCerc(e.forma.raza, e.matrice)]", "[e.forma.raza]", 'e2e', 'raza cercului luată drept diametru')

# „Du-mă la …” aduce greșeala întreagă în vedere (28.8↑h-2, după unirea cu 16.A↑b-4).
o('E11', DE, "      p.scrollTop += d;\n", "      void d;\n", 'e2e', '„Du-mă la …” aduce doar capul fișei sus, ca înainte')
o('E12', DE, "      if (a - d < v.top + m) d = a - (v.top + m);", "      if (a - d < v.top - 1000) d = a - (v.top + m);", 'e2e',
  'întinderea mai înaltă decât panoul: capătul ei de sus iese')
o('E13', DE, "    const [a, b] = intinderi.find(([x, y]) => Number.isFinite(x) && Number.isFinite(y) && y - x <= loc) ?? intinderi[2] ?? [NaN, NaN];",
  "    const [a, b] = intinderi[0] ?? [NaN, NaN];", 'e2e', 'mereu tot grupul, și când nu încape')
o('E14', DE, "    camp?.focus({ preventScroll: true });\n  };", "  };", 'e2e', 'focusul nu trece pe câmpul greșit')
o('E15', FO, "aria-invalid={!b.scula || conflict !== undefined || gauraRea}", "aria-invalid={!b.scula || conflict !== undefined}", 'e2e',
  'diametrul frezei nu e marcat greșit când un cerc nu se găurește')
o('E16', DE, "    const g = [...f.querySelectorAll<HTMLElement>('[data-grup]')].find((x) => x.querySelector(`[data-greseala], ${RAU}`) !== null);",
  "    const g = [...f.querySelectorAll<HTMLElement>('[data-grup]')].find((x) => x.querySelector('[data-greseala]') === null);", 'e2e',
  'alt grup decât cel al primei greșeli')

SETURI = {
    'hartie': ['test/unit/export.hartie.test.ts', 'test/unit/export.desene.test.ts', 'test/unit/gaurire.test.ts'],
}
E2E = ['test/e2e/export.hartie.spec.ts', 'test/e2e/gaurire.spec.ts']
