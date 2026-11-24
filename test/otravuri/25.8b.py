# Lista de otrăvuri a feliei 25.8↑b („Calibrează” și „Trasează…” din imaginea de pe foaie, ADR 0272 §6, §7, §10), 24.11.2026,
# alese de autor: partea pură (calibrarea în jurul primului punct, raportul distanțelor, refuzurile, Shift pe axa imaginii,
# zona în cadrul imaginii, tăiată la ea, în pixeli fără un pixel în plus și cu cel puțin unul, colțurile ei, locul vectorilor
# în pagină, numele fișierului), comanda importului peste imagine (rotirea, punctul), scara fixă în worker și cererea (fără
# îndreptări), raportul foii (numele imaginilor, din foile identice, o dată), modul pânzei (Shift, clicul în afara imaginii,
# câmpul distanței și Enter, Escape, tragerea scurtă, ieșirea când imaginea se ascunde, zona desenată), legăturile din aplicație
# (calibrarea scrisă, zona trimisă, editorul oprit cât ține modul: cadrul, Pen-ul, mânerele imaginii), butoanele din panou
# (oprite pe o imagine ascunsă), fereastra din imaginea foii (așezarea peste imagine, scara, zona, fără Mărime și fără
# îndreptări) și rândul raportului.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


MC = 'src/app/modImagineCalcul.ts'
DC = 'src/ui/actiuniDocumentCalcul.ts'
CT = 'src/jobs/calculTrasare.ts'
CA = 'src/ui/actiuniImportCalcul.ts'
RF = 'src/model/raportFoi.ts'
DR = 'src/app/DialogRaportFoi.tsx'
MO = 'src/app/ModImagine.tsx'
AP = 'src/app/App.tsx'
ED = 'src/app/Editare.tsx'
IF = 'src/app/ImaginiFoii.tsx'
IC = 'src/app/ImportConectat.tsx'
FT = 'src/ui/FereastraTrasare.tsx'

# ── Partea pură ─────────────────────────────────────────────────────────────────────────────────────────────────────
o('C01', MC, "x: p1.x + k * (a.x - p1.x), y: p1.y + k * (a.y - p1.y),", "x: a.x, y: a.y,", 'cal', 'calibrarea în jurul centrului, nu al primului punct')
o('C02', MC, "  const k = d / acum;", "  const k = acum / d;", 'cal', 'raportul distanțelor întors')
o('C03', MC, "  if (Math.min(a.latime, a.inaltime) * k < LATURA_MINIMA_IMAGINE) return { ok: false, motiv: 'mica' };",
  "  if (Math.min(a.latime, a.inaltime) * k <= LATURA_MINIMA_IMAGINE) return { ok: false, motiv: 'mica' };", 'cal',
  'exact 1 mm pe latură, refuzat')
o('C04', MC, "  if (!Number.isFinite(d) || !(d > 0)) return { ok: false, motiv: 'distanta' };",
  "  if (!Number.isFinite(d) || !(d >= 0)) return { ok: false, motiv: 'distanta' };", 'cal', 'distanța 0, primită')
o('C05', MC, "  return Math.abs(Q.u - P.u) >= Math.abs(Q.w - P.w) ? peFoaie(a, Q.u, P.w) : peFoaie(a, P.u, Q.w);",
  "  return Math.abs(Q.u - P.u) < Math.abs(Q.w - P.w) ? peFoaie(a, Q.u, P.w) : peFoaie(a, P.u, Q.w);", 'cal',
  'Shift pe axa cea mai depărtată')
o('C06', MC, "fy = (w: number): number => intre01(0.5 - w / a.inaltime);", "fy = (w: number): number => intre01(0.5 + w / a.inaltime);", 'cal',
  'zona cu Y de jos, nu de sus')
o('C07', MC, "const intre01 = (x: number): number => Math.min(1, Math.max(0, x));", "const intre01 = (x: number): number => x;", 'cal',
  'zona netăiată la imagine')
o('C08', MC, "Math.floor(z.x0 * W + 1e-6)", "Math.floor(z.x0 * W)", 'cal', 'un pixel în plus la o margine întreagă (0,3 · 800)')
o('C09', MC, "Math.max(x + 1, Math.ceil(z.x1 * W - 1e-6))", "Math.ceil(z.x1 * W - 1e-6)", 'cal', 'o zonă mai îngustă decât toleranța: 0 pixeli')
o('C10', MC, "  return [peFoaie(a, u(z.x0), w(z.y1)), peFoaie(a, u(z.x1), w(z.y1)),", "  return [peFoaie(a, u(z.x0), w(z.y0)), peFoaie(a, u(z.x1), w(z.y1)),", 'cal',
  'colțul sv al zonei, sus')
o('C11', MC, "cy: (zy + zh - inaltimePx / 2) * mmPePx", "cy: (zy - inaltimePx / 2) * mmPePx", 'cal', 'centrul în pagină fără înălțimea zonei')
o('C12', MC, "  const ext = tip === 'image/jpeg' ? 'jpg' : tip === 'image/webp' ? 'webp' : 'png';", "  const ext = 'png';", 'cal',
  'un JPEG numit .png')
o('C13', MC, "return Math.abs(u) <= a.latime / 2 + e && Math.abs(w) <= a.inaltime / 2 + e;", "return Math.abs(u) < a.latime / 2 && Math.abs(w) < a.inaltime / 2;", 'cal',
  'marginea imaginii, în afara ei')

# ── Comanda importului peste imagine ───────────────────────────────────────────────────────────────────────────────
o('D01', DC, "    return { x: pe.x + q.x, y: pe.y + q.y, rotire: pe.rotire };", "    return { x: pe.x + q.x, y: pe.y + q.y, rotire: 0 };", 'cal',
  'instanța nerotită cu imaginea')
o('D02', DC, "    const q = aplica(rotatie(pe.rotire), { x: x - pe.cx, y: y - pe.cy });", "    const q = { x: x - pe.cx, y: y - pe.cy };", 'cal',
  'locul nerotit în jurul centrului imaginii')
o('D03', DC, "  const pe = pregatit.peImagine;", "  const pe = undefined as typeof pregatit.peImagine;", 'cal', 'așezarea peste imagine, ignorată')

# ── Scara fixă (workerul) și cererea ───────────────────────────────────────────────────────────────────────────────
o('W01', CT, "  const mmPePx = peFoaie ? (c.latimeIntreaga ?? 0) / intreg.latime", "  const mmPePx = peFoaie ? (c.latimeIntreaga ?? 0) / img.latime", 'trs',
  'scara imaginii de pe foaie pe zonă, nu pe imaginea întreagă')
o('W02', CT, "  const scara = peFoaie ? 'imagine' :", "  const scara = peFoaie ? 'latime' :", 'trs', 'scara spusă „din lățime”')
o('W03', CT, "  const peFoaie = c.latimeIntreaga !== undefined && c.latimeIntreaga > 0;", "  const peFoaie = false;", 'trs', 'lățimea imaginii de pe foaie ignorată')
o('W04', CA, "    ...(a.latimeIntreaga !== undefined ? { latimeIntreaga: a.latimeIntreaga }", "    ...(false ? { latimeIntreaga: a.latimeIntreaga }", 'trs',
  'cererea fără lățimea imaginii de pe foaie')
o('W05', CA, "    ...(a.latimeIntreaga !== undefined ? { latimeIntreaga: a.latimeIntreaga }",
  "    ...(a.latimeIntreaga !== undefined ? { latimeIntreaga: a.latimeIntreaga, ...(a.foaie.indreapta ? { foaie: { colturi: a.foaie.colturi, format: formatFoaie(a.foaie) } } : {}) }",
  'trs', 'foaia îndreptată și din imaginea de pe foaie (vectorii n-ar mai veni peste ea)')

# ── Raportul foii ─────────────────────────────────────────────────────────────────────────────────────────────────────
o('R01', RF, "      grup.identice.push(k);\n      cuImaginile(grup.imagini, f);", "      grup.identice.push(k);", 'rap', 'imaginile foilor identice, pierdute')
o('R02', RF, "      if (!lista.includes(n)) lista.push(n);", "      lista.push(n);", 'rap', 'același nume de două ori')
o('R03', RF, "      const n = im.nume ?? im.id;", "      const n = im.id;", 'rap', 'id-ul în locul numelui')
o('R04', DR, "              {f.imagini.length > 0 && <p className=\"nota\" data-raport=\"imagini\">{t('export.raport.imagini', { lista: f.imagini.join(', ') })}</p>}\n", "", 'e2e',
  'raportul fără imaginile foii')

# ── Modul pânzei ─────────────────────────────────────────────────────────────────────────────────────────────────────
o('U01', MO, "      return shift && celalalt && im ? peAxa(im, celalalt, q) : q;", "      return q;", 'e2e', 'Shift nu duce capătul pe axa imaginii')
o('U02', MO, "      if (!peImagine(s.imagine, p)) {\n        setMotiv({ cod: 'afara' });", "      if (false) {\n        setMotiv({ cod: 'afara' });", 'e2e',
  'un capăt pus în afara imaginii')
o('U03', MO, "    requestAnimationFrame(() => { camp.current?.focus(); camp.current?.select(); });", "", 'e2e', 'câmpul distanței, fără focus')
o('U04', MO, "onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); aplica(); } }}", "", 'e2e', 'Enter în câmp nu aplică')
o('U05', MO, "        acum.current.onIesi();\n        return;\n      }\n      // Enter", "        return;\n      }\n      // Enter", 'e2e', 'Escape nu iese')
o('U06', MO, "      if (Math.hypot(e.clientX - x.x, e.clientY - x.y) < TRAGERE_PX) {", "      if (Math.hypot(e.clientX - x.x, e.clientY - x.y) < 0) {", 'e2e',
  'un clic luat drept zonă')
o('U07', MO, "  useEffect(() => { if (lipsa) onIesi(); }, [lipsa]);", "", 'e2e', 'modul rămâne pe o imagine ascunsă')
o('U08', MO, "        {zonaTrasa && <polygon className=\"zona-imagine\" data-testid=\"mod-imagine-zona\" points={poligon(colturiZonei(imagine, zonaTrasa))} />}\n", "", 'e2e',
  'zona nedesenată cât se trage')

# ── Legăturile din aplicație și editorul oprit ───────────────────────────────────────────────────────────────────────
o('A01', AP, "(i.id === modImagine.id ? { ...i, ...a } : i)", "(i.id === modImagine.id ? { ...i } : i)", 'e2e', 'calibrarea nescrisă')
o('A02', AP, "dinFoaie: { imagine: im, zona: z }", "dinFoaie: { imagine: im, zona: null }", 'e2e', 'zona trasă pe foaie, pierdută')
o('A03', AP, "activ={!acoperita && urechiAlese === null && modImagine === null}", "activ={!acoperita && urechiAlese === null}", 'e2e',
  'editorul activ cât ține modul (cadrul ia clicurile)')
o('A04', ED, "e.defaultPrevented || s.vedere3d || !s.activ || (s.unealta !== 'selectie'", "e.defaultPrevented || s.vedere3d || (s.unealta !== 'selectie'", 'e2e',
  'cadrul selecției ia clicurile modului')
o('A05', ED, "imaginiDesfacute.length > 0 && foaie && !p.doarCitire && !vedere3d && activ ? (", "imaginiDesfacute.length > 0 && foaie && !p.doarCitire && !vedere3d ? (", 'e2e',
  'mânerele imaginii desfăcute iau clicurile modului')
o('A06', ED, "      if (e.target !== panza || e.button !== 0 || spatiu || acum.current.oprit) return;", "      if (e.target !== panza || e.button !== 0 || spatiu) return;", 'e2e',
  'Pen-ul ia clicurile modului')
o('A07', IF, "const fara = doarCitire || !im.vizibila || !o;", "const fara = doarCitire;", 'e2e', 'butoanele merg pe o imagine ascunsă')

# ── Fereastra din imaginea foii ───────────────────────────────────────────────────────────────────────────────────────
o('F01', IC, "    return { ...ok.pregatit, peImagine: asezarePeImagine(dinFoaie.imagine, r.intreg.latimePx, r.intreg.inaltimePx, r.mmPePx, r.zona) };",
  "    return ok.pregatit;", 'e2e', 'vectorii la locul din pagină, nu peste imagine')
o('F02', IC, "zona, latimeIntreaga: d.imagine.latime } }", "zona } }", 'e2e', 'scara din DPI, nu a imaginii de pe foaie')
o('F03', IC, "      const zona = d.zona ? zonaInPixeli(d.zona, im.latimePx, im.inaltimePx) : null;", "      const zona = null;", 'e2e',
  'zona trasă pe foaie, ignorată în fereastră')
o('F04', IC, "      {...(dinFoaie ? { dinFoaie: true } : {", "      {...(false ? { dinFoaie: true } : {", 'e2e', 'fereastra ca la un fișier (Mărimea, „Doar imaginea”)')
o('F05', FT, "          {!dinFoaie && (\n            <GrupSetari id=\"marime\"", "          {(\n            <GrupSetari id=\"marime\"", 'e2e', 'Mărimea în fereastra din imaginea foii')
o('F06', FT, "{raport && !raport.transparenta && !dinFoaie && (", "{raport && !raport.transparenta && (", 'e2e', 'îndreptările în fereastra din imaginea foii')

SETURI = {
    'cal': ['test/unit/imagini.calibrare.test.ts'],
    'trs': ['test/unit/import.imagine.test.ts'],
    'rap': ['test/unit/raport.foi.test.ts'],
}
E2E = ['test/e2e/imagini-foaie.spec.ts']
