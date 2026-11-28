# Lista de otrăvuri a feliei 16.A↑g (valorile frezei pe material și calculatorul avansului; ADR 0305), 28.11.2026, aleasă de
# autor: judecata seturilor (câte, numele gol, cu caractere oprite, lung, dublat după cuvinte, valorile și turația întreagă),
# cuvintele materialului (diacriticele, despărțirea), potrivirea cu eticheta foii (toate cuvintele, cel mai lung, la egalitate
# primul), valorile setului pe freză (toate cinci), ținerea lor (judecata în freză, lista goală, numele curățate),
# calculatorul (rotunjirea turației, tăișurile, întregi, marginile fz, Vc și avansului) și, în fereastră și în proiect,
# editorul (setul nou de la valorile de acum, plafonul, „✕”, greșeala pe set și câmp, golirea, fișa, încărcarea),
# Tăierea și fereastra exportului cu setul foii, nota setului, calculatorul (Vc, în set).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit (setul `e2e` cere `.tmp/pw.config.ts`).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


FZ = 'src/model/freza.ts'
CA = 'src/model/calculatorAvans.ts'
MF = 'src/app/MaterialeFreza.tsx'
FM = 'src/app/FrezeleMele.tsx'
PP = 'src/app/PanouProprietati.tsx'
EC = 'src/app/ExportConectat.tsx'
FO = 'src/ui/FisaOperatie.tsx'

# ── Judecata seturilor ───────────────────────────────────────────────────────────────────────────────────────────────
o('G01', FZ, "  if (m.length > MARGINI_FREZA.materiale) return", "  if (m.length > MARGINI_FREZA.materiale + 1) return", 'm', '17 seturi primite')
o('G02', FZ, "    if (typeof nume !== 'string' || cuvinteMaterial(nume).length === 0) return greseala('material-gol');",
  "    if (typeof nume !== 'string') return greseala('material-gol');", 'm', 'un material fără niciun cuvânt primit')
o('G03', FZ, "    if (/[\\u0000-\\u001f\\u007f-\\u009f]/u.test(nume)) return greseala('material-caractere');", "", 'm',
  'un material cu caractere de control primit')
o('G04', FZ, "    if ([...nume.normalize('NFC').trim()].length > MARGINI_FREZA.material) return greseala('material-lung');",
  "    if ([...nume.normalize('NFC').trim()].length > MARGINI_FREZA.material + 5) return greseala('material-lung');", 'm',
  'un material de 41 de caractere primit')
o('G05', FZ, "    if (vazute.has(k)) return greseala('material-folosit');\n", "", 'm', 'același material de două ori primit')
o('G06', FZ, "[...new Set(cuvinteMaterial(s))].sort().join(' ')", "cuvinteMaterial(s).join(' ')", 'm',
  'același material cu cuvintele în altă ordine nu e dublat')
o('G07', FZ, "      const motiv = interval(s[c], MARGINI_FREZA[c], c === 'turatie');", "      const motiv = interval(s[c], MARGINI_FREZA[c], false);", 'm',
  'turația unui set cu zecimale primită')
# ── Cuvintele și potrivirea ──────────────────────────────────────────────────────────────────────────────────────────
o('G08', FZ, "s.normalize('NFD').replace(/\\p{M}/gu, '')", "s.normalize('NFD')", 'm', 'diacriticele contează la potrivire')
o('G09', FZ, ".split(/[^\\p{L}\\p{N}]+/u)", ".split(/\\s+/u)", 'm', 'cuvintele despărțite doar de spații („MDF-alb” un cuvânt)')
o('G10', FZ, "    if (c.size > cate && [...c].every((x) => cuvinte.has(x))) { ales = s; cate = c.size; }",
  "    if (c.size >= cate && [...c].every((x) => cuvinte.has(x))) { ales = s; cate = c.size; }", 'm', 'la egalitate, ultimul set, nu primul')
o('G11', FZ, "    if (c.size > cate && [...c].every((x) => cuvinte.has(x))) { ales = s; cate = c.size; }",
  "    if (c.size > cate && [...c].some((x) => cuvinte.has(x))) { ales = s; cate = c.size; }", 'm', 'un singur cuvânt comun ajunge („lemn tare” pe „lemn moale”)')
o('G12', FZ, "plonjare: s.plonjare, pas: s.pas, pasLateral: s.pasLateral }, set: s.material };", "plonjare: s.plonjare }, set: s.material };", 'm',
  'pasul și pasul lateral nu vin din set')
# ── Ținerea ──────────────────────────────────────────────────────────────────────────────────────────────────────────
o('G13', FZ, "  if (f.materiale !== undefined) pune('materiale', problemaMateriale(f.materiale)?.motiv ?? null);\n", "", 'm', 'seturile nejudecate în freză')
o('G14', FZ, "    materiale: Array.isArray(f.materiale) && f.materiale.length > 0\n", "    materiale: Array.isArray(f.materiale)\n", 'm', 'lista goală ținută')
o('G15', FZ, "      ? f.materiale.map((x) => ({ ...x, material: x.material.normalize('NFC').trim().replace(/\\s+/gu, ' ') })) : undefined,",
  "      ? f.materiale : undefined,", 'm', 'numele seturilor ținute cu spațiile de la capete')
# ── Calculatorul ─────────────────────────────────────────────────────────────────────────────────────────────────────
o('G16', CA, "    n = Math.round((c.vc * 1000) / (Math.PI * c.diametru) / 10) * 10;", "    n = Math.round((c.vc * 1000) / (Math.PI * c.diametru));", 'm',
  'turația nerotunjită la 10 rot/min')
o('G17', CA, "  const f = Math.round(n * c.taisuri * c.fz);", "  const f = Math.round(n * c.fz);", 'm', 'avansul fără tăișuri')
o('G18', CA, "  if (!finit(c.taisuri) || !Number.isInteger(c.taisuri) || c.taisuri < 1", "  if (!finit(c.taisuri) || c.taisuri < 1", 'm', 'tăișuri cu zecimale primite')
o('G19', CA, "  if (!(f > 0) || f > MARGINI_FREZA.avans) return { ok: false, motiv: 'margini-avans' };",
  "  if (f > MARGINI_FREZA.avans) return { ok: false, motiv: 'margini-avans' };", 'm', 'un avans rotunjit la 0 scris')
o('G20', CA, "    if (!finit(c.vc) || !(c.vc > 0) || c.vc > MARGINI_VC) return", "    if (!finit(c.vc) || !(c.vc > 0)) return", 'm', 'Vc peste 2000 m/min primită')
o('G21', CA, "  if (!finit(c.fz) || !(c.fz > 0) || c.fz > MARGINI_FZ) return", "  if (!finit(c.fz) || !(c.fz > 0)) return", 'm', 'fz peste 2 mm primit')
o('G22', CA, "  if (!(n > 0) || n > MARGINI_FREZA.turatie) return { ok: false, motiv: 'margini-turatie' };", "", 'm', 'o turație peste plafon scrisă')
# ── Editorul (e2e) ───────────────────────────────────────────────────────────────────────────────────────────────────
o('G23', MF, "    onSeturi([...seturi, { material: '', brut: null, ...implicit }]);",
  "    onSeturi([...seturi, { material: '', brut: null, turatie: '', avans: '', plonjare: '', pas: '', pasLateral: '' }]);", 'e2e',
  'setul nou pornește gol, nu de la valorile de acum')
o('G24', MF, 'disabled={dezactivat || plin} onClick={adauga}', 'disabled={dezactivat} onClick={adauga}', 'e2e', '„Un set pe material” lăsat după al 16-lea')
o('G25', MF, "    onSeturi(seturi.filter((_, j) => j !== i));", "    onSeturi(seturi.slice(0, -1));", 'e2e', '„✕” scoate ultimul set, nu pe cel ales')
o('G26', MF, "(problema.camp === c || problema.camp === null)", "false", 'e2e', 'greșeala nemarcată pe câmpul ei')
o('G27', FM, "  v['materiale'] = c.materiale.length > 0 ? seturiNumere(c.materiale) : undefined;",
  "  if (c.materiale.length > 0) v['materiale'] = seturiNumere(c.materiale);", 'e2e', 'ultimul set scos rămâne pe freza salvată')
o('G28', FM, "        {f.materiale && f.materiale.length > 0 ? <MaterialeFisa", "        {false ? <MaterialeFisa", 'e2e', 'fișa fără tabelul seturilor')
o('G29', FM, "t('freze.motiv.set', { n: set + 1, text: mic(text) })", "t('freze.motiv.set', { n: set, text: mic(text) })", 'e2e',
  'greșeala spune alt set (numărat de la 0)')
o('G30', FM, "    materiale: seturiText(f.materiale, ro),", "    materiale: [],", 'e2e', 'editorul nu încarcă seturile frezei salvate')
# ── În proiect (e2e) ─────────────────────────────────────────────────────────────────────────────────────────────────
o('G31', PP, "valoriPeMaterial(f, foaie ? materialFoaie(foaie) : null)", "valoriPeMaterial(f, null)", 'e2e', 'Tăierea fără setul foii')
o('G32', EC, "      const r = valoriPeMaterial(f, eticheta);", "      const r = valoriPeMaterial(f, null);", 'e2e', 'fereastra exportului fără setul foii')
o('G33', PP, "      {frezaAleasa && setAles !== null && <p", "      {false && setAles !== null && <p", 'e2e', 'Tăierea fără nota setului')
o('G34', FO, "    const set = st?.fel === 'la-zi' && origine ?", "    const set = origine ?", 'e2e', 'nota setului și pe o copie rămasă în urmă')
o('G35', MF, "vc: vc.trim() === '' ? null : numar(vc)", "vc: null", 'e2e', 'calculatorul ignoră Vc')
o('G36', MF, "onScrie={(n, f) => { onSeturi(seturi.map((x, j) => (j === i ? { ...x, turatie: n, avans: f } : x))); }}",
  "onScrie={() => { onSeturi(seturi); }}", 'e2e', 'calculatorul setului nu scrie în set')

SETURI = {
    'm': ['test/unit/freza.materiale.test.ts', 'test/unit/calculatorAvans.test.ts', 'test/unit/freza.test.ts', 'test/unit/frezeFisier.test.ts',
          'test/unit/freza.desenata.test.ts'],
}
E2E = ['test/e2e/freze.materiale.spec.ts', 'test/e2e/freze.material.proiect.spec.ts', 'test/e2e/freze.calculator.spec.ts']
