# Lista de otrăvuri a feliei 12.1↑f-2 (treptele incrustației cu pereți drepți, documentul v25, ADR 0175 §3–§6), 17.11.2026,
# alese de autor: valorile pe hârtie (tija și flanșa după sprijin, încotro), refuzurile (sprijinul, umărul, jocurile, deschiderea
# care dispare, marginea și flanșa dopului decupat), figura (nivelul de sus, deschiderea, avertismentele), lucrarea (cele două
# niveluri ale locașului), dopul (oglinda, buzunarul din jurul tijei, flanșa, semifabricatul spre exterior), scrierea (treapta
# a rândului, încotro), fereastra (treapta, sprijinul mutat odată cu ea, opțiunile, câmpurile, citirea înapoi) și panoul.
# Țintele din ADR 0175: un dop în trepte neoglindit, dopul pe fund fără g deasupra umărului, o deschidere care dispare primită,
# un umăr mai îngust decât jocul.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), din worktree-ul feliei (în afara Drive-ului), după commit, cu
# CNCVS2_E2E_RETEA=127.0.1 și configul local pe portul 4174 (`.tmp/pw.config.ts`).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


MOD = 'src/model/incrustatie.ts'
REF = 'src/cam/incrustatieDreapta.ts'
JOB = 'src/cam/job.ts'
DOP = 'src/cam/dopDrept.ts'
SCR = 'src/app/valoriOperatii.ts'
CON = 'src/app/ExportConectat.tsx'
DLG = 'src/ui/DialogExport.tsx'
PAN = 'src/app/PanouProprietati.tsx'

# ---- Valorile pe hârtie ----
o('T01', MOD, "i.sprijin === 'fund' ? [D - d + g, d - g + H] : [D - d - g, d + H];", "i.sprijin === 'fund' ? [D - d + g, d - g + H] : [D - d, d + H];", 'trepte',
  'pe umăr, tija fără jocul de sub ea')
o('T02', MOD, "i.sprijin === 'fund' ? [D - d + g, d - g + H] :", "i.sprijin === 'fund' ? [D - d, d + H] :", 'trepte',
  'pe fund, fără g deasupra umărului (scăparea din ADR)')
o('T03', MOD, '    const [tija, flansa] = gaura ? [D - d, d + H] :', '    const [tija, flansa] = gaura ? [D - d - g, d + H] :', 'trepte',
  'la gaură, tija scurtată cu jocul')
o('T04', MOD, "spre: i.treapta.spre ?? 'interior',", "spre: 'interior',", 'trepte', 'treapta mereu spre interior, pe hârtie')

# ---- Refuzurile ----
o('T05', REF, "    if (i.sprijin === 'fata') return `${unde}: cu treaptă", "    if (false) return `${unde}: cu treaptă", 'trepte', 'dopul în trepte pe față, primit')
o('T06', REF, "    if (gaura && i.sprijin === 'fund') return `${unde}: gaura n-are fund: dopul în trepte", "    if (false) return `${unde}: gaura n-are fund: dopul în trepte",
  'trepte', 'gaura în trepte, cu dopul pe fund, primită')
o('T07', REF, '    if (!(tr.adancime < D)) {', '    if (!(tr.adancime <= D)) {', 'trepte', 'umărul la fund, primit')
o('T08', REF, '    const D = gaura && grosimeFoaie !== undefined ? grosimeFoaie : op.adancime;', '    const D = op.adancime;', 'trepte',
  'la gaură, umărul judecat față de adâncimea scrisă, nu de foaie')
o('T09', REF, '    if (!(tr.latime > i.jocLateral)) {', '    if (!(tr.latime >= i.jocLateral)) {', 'trepte', 'umărul cât jocul lateral, primit')
o('T10', REF, '      if (!(i.joc >= JOC_INCRUSTATIE_MINIM)) return `${unde}: ${care}', '      if (!(i.joc >= 0)) return `${unde}: ${care}', 'trepte',
  'jocul g sub 0,1 primit în trepte')
o('T11', REF, "      if (i.sprijin === 'fund' && !(i.joc < tr.adancime)) {", "      if (i.sprijin === 'fund' && !(i.joc <= tr.adancime)) {", 'trepte',
  'pe fund, jocul cât umărul primit')
o('T12', REF, "      if (i.sprijin === 'umar' && !(i.joc < D - tr.adancime)) {", "      if (i.sprijin === 'umar' && !(i.joc <= D - tr.adancime)) {", 'trepte',
  'pe umăr, tija de lungime zero primită')
o('T13', REF, "  } else if (i.sprijin === 'umar') {", '  } else if (false) {', 'trepte', 'sprijinul pe umăr fără treaptă, primit')
o('T14', REF, '    if (!gaura) {\n      const care', '    if (true) {\n      const care', 'trepte', 'jocul g judecat și la gaură')

# ---- Figura ----
o('T15', REF, '      const larg = offset(s, tr.latime);', '      const larg = offset(s, tr.latime / 2);', 'trepte', 'spre exterior, nivelul de sus lărgit cu s/2')
o('T16', REF, '      const ingust = offset(s, -tr.latime);', '      const ingust = offset(s, -tr.latime / 2);', 'trepte', 'deschiderea micșorată cu s/2')
o('T17', REF, "      const n = nivelDreapta(ingust.regiuni, raze, 'deschiderea de sub umăr: ');", "      const n = nivelDreapta(s, raze, 'deschiderea de sub umăr: ');",
  'trepte', 'deschiderea cât desenul (fără umăr)')
o('T18', REF, '      if (!are) return { ok: false, motiv: dispare };', '      if (!are) continue;', 'trepte',
  'o parte fără deschidere sub umăr, primită')
# T19 retrasă după prima rulare (`18210e4`: scăpată): „deschiderea dispărută cu totul” lua din condiție
# `ingust.regiuni.length === 0`, dar offsetul care golește tot întoarce deja `ok: false` („offsetul interior dispare”), deci
# condiția era moartă; scoasă din cod. Deschiderea dispărută cu totul (s = 16) și doar într-o parte (T18) rămân probate.
o('T20', REF, '  const contururiTaiate = contururiRegiuni(alDesenului.nivel.taiat);', '  const contururiTaiate = contururiRegiuni(sus.taiat);', 'trepte',
  'avertismentul colțurilor de pe nivelul de sus, și spre exterior')

# ---- Lucrarea: cele două niveluri ----
o('T21', JOB, '        const sus = jos && d !== undefined ? adancimiTreceri(d, t.pas) : undefined;', '        const sus = undefined;', 'trepte',
  'nivelul de sus tăiat până la fund')
o('T22', JOB, "          const treceri = typeof sub === 'string' ? sub : sub.map((x) => d + x);", "          const treceri = typeof sub === 'string' ? sub : sub;", 'trepte',
  'deschiderea tăiată de la față, cât D − d')
o('T23', JOB, '          for (const r of jos.locas) {', '          for (const r of [] as typeof jos.locas) {', 'trepte', 'deschiderea netăiată')

# ---- Dopul în trepte ----
o('T24', DOP, '  const oglinda = { a: -1, b: 0, c: 0, d: 1, e: k.x1 + k.m, f: k.m - k.y0 };',
  '  const oglinda = { a: 1, b: 0, c: 0, d: 1, e: k.latime - k.m - k.x1, f: k.m - k.y0 };', 'trepte', 'dopul în trepte neoglindit')
o('T25', DOP, '  const w = prima.scula.diametru + TRECERE;', '  const w = prima.scula.diametru / 2 + TRECERE;', 'trepte',
  'buzunarul din jurul tijei îngust cât freza (canalul de s + R + 0,5)')
o('T26', DOP, "    id: 'tija', tip: 'buzunar', noduri: [...nodFata, ...nodTija].map((n) => n.id), latura: 'interior', adancime: k.tija,",
  "    id: 'tija', tip: 'buzunar', noduri: [...nodFata, ...nodTija].map((n) => n.id), latura: 'interior', adancime: k.tija + 0.2,", 'trepte',
  'tija mai lungă cu 0,2')
o('T27', DOP, "          { id: 'flansa', tip: 'buzunar', noduri: ['rama', ...flansa.map((n) => n.id)], latura: 'interior', adancime: k.h,",
  "          { id: 'flansa', tip: 'buzunar', noduri: ['rama', ...flansa.map((n) => n.id)], latura: 'interior', adancime: k.h - 0.3,", 'trepte',
  'fața coborâtă mai sus cu 0,3 (flanșa mai subțire)')
o('T28', DOP, '  if (k.m < w - 1e-9) {', '  if (false) {', 'trepte', 'marginea dopului decupat în trepte, nejudecată')
o('T29', DOP, '  if (!(k.flansa > grosimePunti)) {', '  if (false) {', 'trepte', 'flanșa cât punțile, primită')
o('T30', DOP, '    avertismente: [`dopul ${id}: e în trepte, oglindit, cu tija în sus: după decupare, întoarce-l în locaș`, ...d.avertismente],',
  '    avertismente: [...d.avertismente],', 'trepte', 'dopul decupat în trepte fără avertismentul întoarcerii')
# T31 retrasă înainte de rulare: flanșa se decupează cu `decupareCuPunti`, comună cu dopul decupat simplu, deci „cu prima freză, nu
# cu cea mai mică” e chiar 12.1b P07 (reorientată pe funcția comună).
o('T32', DOP, "    const lat = inc.treapta?.spre === 'exterior' ? inc.treapta.latime : 0;", '    const lat = 0;', 'trepte',
  'spre exterior, semifabricatul cât desenul')
o('T33', DOP, '    if (treapta && jos) {', '    if (false) {', 'trepte', 'dopul fără treaptă, la o incrustație în trepte')
o('T34', DOP, '  const nodTija = contururiRegiuni(jos.dop).map(', '  const nodTija = contururiRegiuni(sus.dop).map(', 'trepte', 'tija cât flanșa')

# ---- Scrierea ----
o('T35', SCR, "...(treaptaNoua.spre === 'exterior' ? { spre: 'exterior' as const } : {}) };", '};', 'scriere', 'spre exterior, nescris')
o('T36', SCR, '    const { spre: _spre, ...baza } = treaptaVeche ?? {};\n    void _spre;\n', '    const baza = treaptaVeche ?? {};\n', 'scriere',
  'înapoi spre interior, „spre” vechi rămâne')
o('T37', SCR, ', ...(treapta ? { treapta } : {}) };\n}', ' };\n}', 'scriere', 'treapta rândului, nescrisă')

# ---- Fereastra și panoul ----
o('T38', DLG, "                              : (p.treaptaInc === 'fara' || p.sprijinInc === 'fata' ? 'umar' : p.sprijinInc);",
  '                              : p.sprijinInc;', 'e2e', 'treapta aleasă lasă sprijinul pe fund')
o('T39', DLG, "                              ? (p.sprijinInc === 'umar' ? (p.locasInc === 'gaura' ? 'fata' : 'fund') : p.sprijinInc)",
  '                              ? p.sprijinInc', 'e2e', 'fără treaptă, sprijinul rămâne pe umăr')
o('T40', DLG, "                          {p.treaptaInc === 'fara' && <option value=\"fata\">", "                          {<option value=\"fata\">", 'e2e',
  '„pe față” oferit la treaptă')
o('T41', DLG, "                          {p.treaptaInc !== 'fara' && <option value=\"umar\">", "                          {false && <option value=\"umar\">", 'e2e',
  '„pe umăr” lipsă la treaptă')
o('T42', DLG, "          ...(prinFoaie ? { locas: 'gaura' as const } : {}), ...(treapta ? { treapta } : {}),", "          ...(prinFoaie ? { locas: 'gaura' as const } : {}),",
  'e2e', 'Exportă nu scrie treapta')
o('T43', DLG, "          treapta = { adancime: adancimeUmar, latime: latimeUmar, ...(p.treaptaInc === 'exterior' ? { spre: 'exterior' as const } : {}) };",
  '          treapta = { adancime: adancimeUmar, latime: latimeUmar };', 'e2e', 'Exportă scrie mereu spre interior')
o('T44', DLG, "const jocFolosit = (p: RandSprijin): boolean => p.locasInc !== 'gaura' && (p.treaptaInc !== 'fara' || sprijinitPeFata(p));",
  "const jocFolosit = (p: RandSprijin): boolean => p.locasInc !== 'gaura' && sprijinitPeFata(p);", 'e2e', 'jocul de sub tijă ascuns la treaptă')
o('T45', DLG, "      && (p.treaptaInc === 'fara' || (inMargini(p.adancimeTreapta, MARGINI_OPERATIE.adancime) && inMargini(p.latimeTreapta, MARGINI_OPERATIE.latimeUmar)))\n",
  '', 'e2e', 'umărul greșit nu oprește exportul')
o('T46', DLG, "      treaptaInc: dr?.treapta ? (dr.treapta.spre === 'exterior' ? 'exterior' : 'interior') : 'fara',", "      treaptaInc: 'fara',", 'e2e',
  'rândul nu citește treapta din proiect')
o('T47', DLG, "? { sprijinInc: p.treaptaInc === 'fara' ? 'fata' : 'umar' } : {}) });", "? { sprijinInc: 'fata' } : {}) });", 'e2e',
  'gaura în trepte mută sprijinul pe față')
o('T48', CON, "              ...(o.incrustatie.treapta ? {\n", "              ...(false ? {\n", 'e2e', 'fereastra nu primește treapta din proiect')
o('T49', PAN, '                {hartieDreapta.treapta ? (<>', '                {false ? (<>', 'e2e', 'panoul fără treaptă, pe hârtie')
o('T50', PAN, "        {o.tip === 'buzunar' && o.incrustatie?.fel === 'drept' && o.incrustatie.treapta && rand(t('prop.inc.treapta'),",
  "        {false && o.incrustatie?.fel === 'drept' && o.incrustatie.treapta && rand(t('prop.inc.treapta'),", 'e2e', 'Tăierea fără treaptă')
o('T51', PAN, "            : o.incrustatie.sprijin === 'umar' ? 'prop.inc.dop.ridicat-umar' : 'prop.inc.dop.ridicat-fund'),",
  "            : 'prop.inc.dop.ridicat-fund'),", 'e2e', 'Tăierea spune „pe fund” la dopul pe umăr')

SETURI = {
    'trepte': ['test/unit/incrustatieDreapta.trepte.test.ts'],
    'trepte2': ['test/unit/incrustatieDreapta.trepte.test.ts', 'test/unit/incrustatieDreapta.gaura.test.ts', 'test/unit/incrustatieDreapta.potrivire.test.ts',
                'test/unit/incrustatieDreapta.dop.test.ts', 'test/unit/incrustatieDreapta.punti.test.ts', 'test/unit/incrustatieDreapta.refuzuri.test.ts'],
    'scriere': ['test/unit/incrustatieDreapta.scriere.test.ts'],
    'scriere2': ['test/unit/incrustatieDreapta.scriere.test.ts', 'test/unit/incrustatie.scriere.test.ts'],
}
E2E = ['test/e2e/incrustatieDreapta.spec.ts']
