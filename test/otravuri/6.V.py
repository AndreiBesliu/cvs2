# Lista de otrăvuri a liniei 6.V (ancora și tastele transformării, ADR 0240: 6.V↑, 6.V↑b, 6.V↑c), 08.11.2026, alese de autor
# după §Proba din ADR: tastele la mânere și la desen (Shift ignorat, Ctrl ignorat, Alt cu mânerul opus, Shift + Ctrl dat lui
# Ctrl, tasta necitită la apăsare), cercul care devine elipsă (razele inversate, elipsa nerecunoscută), ancora (rotirea în
# jurul centrului, nepusă la loc, selecția nouă, oglindirea și înclinarea față de centru, lipirea ei), arcele și colțurile
# (toleranța fără scara cea mai mare sau a nodurilor, raza scalată la felul implicit, felurile ignorate, refuzul scos),
# eticheta (`formeScalate`, textul aldin) și lipirea (Alt care încă o inversează, Shift+L).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), din worktree (în afara Drive-ului), după commit; cele „e2e” cer
# build-ul (vite și Playwright prin `node`, cu `.tmp/pw.config.ts`).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


EC = 'src/app/editareCalcul.ts'
DC = 'src/app/desenCalcul.ts'
ED = 'src/app/Editare.tsx'
TR = 'src/model/transformare.ts'
BT = 'src/model/blocText.ts'

# 6.V↑: tastele la mânere.
o('V01', EC, "if (taste.shift || (m.length === 2 && !taste.ctrl)) {", "if (m.length === 2 && !taste.ctrl) {", 'manere',
  'Shift ignorat pe o latură')
o('V02', EC, "if (taste.shift || (m.length === 2 && !taste.ctrl)) {", "if (taste.shift || m.length === 2) {", 'manere',
  'Ctrl ignorat pe un colț')
o('V03', EC, "const a = taste.alt ? { x: ancora.x, y: ancora.y } : punctManer(c, OPUS[m]), h = punctManer(c, m);",
  "const a = punctManer(c, OPUS[m]), h = punctManer(c, m);", 'manere', 'Alt cu mânerul opus')
o('V04', EC, "if (taste.shift || (m.length === 2 && !taste.ctrl)) {",
  "if ((taste.shift && !taste.ctrl) || (m.length === 2 && !taste.ctrl)) {", 'manere', 'Shift + Ctrl dat lui Ctrl')
o('V05', EC, "const proportie = taste.shift || (colt && !taste.ctrl) ? 'proportional' : colt ? 'liber' : 'axa';",
  "const proportie = colt && !taste.ctrl ? 'proportional' : colt ? 'liber' : 'axa';", 'manere', 'eticheta nu spune Shift')
o('V06', EC, "({ shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey, alt: e.altKey });",
  "({ shift: e.shiftKey, ctrl: e.ctrlKey, alt: e.altKey });", 'manere', '⌘ nu e Ctrl pe Mac')
o('V07', EC, "const peLinie = (m !== 'n' && m !== 's' && h.x === ancora.x) || (m !== 'e' && m !== 'v' && h.y === ancora.y);",
  "const peLinie = false;", 'manere', 'eticheta nu spune ancora de pe latura trasă')
o('V08', EC, "return { proportie, fix: ancora.x === ctr.x && ancora.y === ctr.y ? 'centru' : 'ancora', peLinie };",
  "return { proportie, fix: 'centru', peLinie };", 'manere', 'eticheta spune centrul și cu ancora mutată')
o('V09', ED, "if (!g || !['Shift', 'Control', 'Meta', 'Alt'].includes(e.key)) return;", "if (true) return;", 'e2e',
  'mânerele: tasta apăsată cu mausul pe loc nu se citește')
o('V10', ED, "acum.current.lipire(false), acum.current.ancora);", "acum.current.lipire(taste.alt), acum.current.ancora);", 'e2e',
  'mânerele: Alt încă inversează lipirea')

# 6.V↑: tastele la desen și lipirea.
o('V11', DC, "const w = Math.abs(dx) * (taste.alt ? 2 : 1), h = Math.abs(dy) * (taste.alt ? 2 : 1);",
  "const w = Math.abs(dx), h = Math.abs(dy);", 'desen', 'dreptunghiul nu pornește din centru')
o('V12', DC, "const x = taste.alt ? a.x - Math.abs(dx) : Math.min(a.x, b.x), y = taste.alt ? a.y - Math.abs(dy) : Math.min(a.y, b.y);",
  "const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);", 'desen', 'dreptunghiul din centru pus din colț')
o('V13', DC, "export const cerculElipsa = (taste: TasteDesen): boolean => taste.ctrl && !taste.shift;",
  "export const cerculElipsa = (taste: TasteDesen): boolean => taste.ctrl;", 'desen', 'Shift + Ctrl la cerc dat lui Ctrl')
o('V14', DC, "const rx = Math.abs(dx) / (taste.alt ? 1 : 2), ry = Math.abs(dy) / (taste.alt ? 1 : 2);",
  "const rx = Math.abs(dx) / 2, ry = Math.abs(dy) / 2;", 'desen', 'elipsa nu pornește din centru')
o('V15', DC, "const k = taste.alt ? 2 : 1;", "const k = 1;", 'desen', 'linia nu pornește din mijloc')
o('V16', DC, "if (!taste.shift) return b;", "if (true) return b;", 'desen', 'Shift ignorat la desen')
o('V17', ED, "if (!s.a || !s.ultim || !['Shift', 'Control', 'Meta', 'Alt'].includes(e.key)) return;", "if (true) return;", 'e2e',
  'desenul: tasta apăsată cu mausul pe loc nu se citește')
o('V18', ED, "if (s.lipire) {", "if (s.lipire !== mod.alt) {", 'e2e', 'desenul: Alt încă inversează lipirea')
o('V19', ED, "if (e.shiftKey && !e.altKey && e.key.toLowerCase() === 'l') {", "if (false) {", 'e2e', 'Shift+L nu comută lipirea')

# 6.V↑: cercul devine elipsă.
o('V20', TR, "if (!u) return elipsa({ x: 0, y: 0 }, f.raza * Math.abs(sx), f.raza * Math.abs(sy));",
  "if (!u) return elipsa({ x: 0, y: 0 }, f.raza * Math.abs(sy), f.raza * Math.abs(sx));", 'transformare', 'razele elipsei inversate')
o('V21', TR, "if (!u) return elipsa({ x: 0, y: 0 }, f.raza * Math.abs(sx), f.raza * Math.abs(sy));",
  "if (!u) return scaleazaForma(arceInCubiceCale(caleDinForma(f), tolArce), sx, sy, colturi, sW);", 'transformare',
  'elipsa din arcInCubice (nerecunoscută) în locul generatorului')
o('V22', TR, "return elipsa({ x: z(el.centru.x * sx), y: z(el.centru.y * sy) }, rx, ry);",
  "return { ...f, varfuri: f.varfuri.map((v) => ({ ...v, p: { x: v.p.x * sx, y: v.p.y * sy }, s: v.s.tip === 'C' ? { ...v.s, c1: { x: v.s.c1.x * sx, y: v.s.c1.y * sy }, c2: { x: v.s.c2.x * sx, y: v.s.c2.y * sy } } : v.s })) };",
  'transformare', 'elipsa scalată punct cu punct, nu refăcută din generator')
o('V23', TR, "const z = (v: number): number => (Math.abs(v) <= 1e-9 * s ? 0 : v);", "const z = (v: number): number => v;",
  'transformare', 'zgomotul centrului rămâne: razele egale nu mai dau un cerc')

# 6.V↑b: ancora.
o('V24', EC, "const { x: cx, y: cy } = ancora;", "const { x: cx, y: cy } = centrul(c);", 'manere',
  'rotirea în jurul centrului cu ancora mutată')
o('V25', EC, "if (d <= d0) { d0 = d; cel = q; }", "if (false) { d0 = d; cel = q; }", 'manere',
  'ancora trasă nu se lipește de cele 9 puncte')
o('V26', EC, "return { u: w > 0 ? (p.x - c.minX) / w : 0.5, v: h > 0 ? (p.y - c.minY) / h : 0.5 };",
  "return { u: w > 0 ? (p.x - c.minX) / w : 0, v: h > 0 ? (p.y - c.minY) / h : 0 };", 'manere',
  'pe o linie fără lățime, ancora iese de pe linie')
o('V27', EC, "if (!lipire) return { punct: { x: rot(p.x), y: rot(p.y) }, linii: [] };", "if (!lipire) return { punct: p, linii: [] };",
  'manere', 'ancora fără lipire nerotunjită (pixelii mausului în geometrie)')
o('V28', EC, "<= LOVIRE_PX + 1;", "<= 1;", 'manere', 'ținta ancorei aproape imposibil de apucat')
o('V29', ED, "else if (tr.fel === 'rotire' || taste.alt) onTine(a);", "else if (taste.alt) onTine(a);", 'e2e',
  'ancora nepusă la loc după rotire')
o('V30', ED, "if (ruleaza('document.transforma', { transformare: () => tr }).ok) ancoraDeTinut.current = ancora;",
  "ruleaza('document.transforma', { transformare: () => tr });", 'e2e', 'ancora nepusă la loc după oglindire')
o('V31', ED, "useEffect(() => { setAncoraLibera(null); }, [cheieSelectie]);", "", 'e2e', 'o selecție nouă nu întoarce ancora')
o('V32', ED, "centru: ancora ?? { x: (cutie.minX + cutie.maxX) / 2, y: (cutie.minY + cutie.maxY) / 2 },",
  "centru: { x: (cutie.minX + cutie.maxX) / 2, y: (cutie.minY + cutie.maxY) / 2 },", 'e2e',
  'înclinarea față de centru cu ancora mutată')
o('V33', ED, "const tr: Transformare = { fel: 'oglindire', directie, centru: ancora };",
  "const tr: Transformare = { fel: 'oglindire', directie, centru: { x: (cutie.minX + cutie.maxX) / 2, y: (cutie.minY + cutie.maxY) / 2 } };",
  'e2e', 'oglindirea față de centru cu ancora mutată')

# 6.V↑c: arcele, colțurile, textul, eticheta.
o('V34', TR, "const tolArce = TOLERANTA_PROIECT / (sW * Math.max(Math.abs(sx), Math.abs(sy)));",
  "const tolArce = TOLERANTA_PROIECT / sW;", 'transformare', 'toleranța arcelor fără scara cea mai mare')
o('V35', TR, "const s = sW * Math.hypot(m.a, m.b);", "const s = sW;", 'transformare', 'toleranța arcelor fără scara nodurilor')
o('V36', TR, "const baza = u ? f : arceInCubiceCale(f, tolArce);", "const baza = f;", 'transformare',
  'arcele rămân arce la scalarea pe o axă (geometrie greșită)')
o('V37', TR, "const razaColt = u && colturi !== 'pastreaza' ? f.razaColt * Math.abs(sx) : f.razaColt;",
  "const razaColt = colturi !== 'pastreaza' ? f.razaColt * Math.abs(sx) : f.razaColt;", 'transformare',
  'raza colțului scalată la felul implicit')
o('V38', TR, "const razaColt = u && colturi !== 'pastreaza' ? f.razaColt * Math.abs(sx) : f.razaColt;",
  "const razaColt = u ? f.razaColt * Math.abs(sx) : f.razaColt;", 'transformare', 'felul „raza rămâne mereu” ignorat')
o('V39', TR, "if (!u && colturi === 'scaleaza') return scaleazaForma(", "if (false) return scaleazaForma(", 'transformare',
  'felul „se scalează mereu” ignorat')
o('V40', TR, "if (razaColt > Math.min(latime, inaltime) / 2) return 'colturi-nu-incap';", "", 'transformare',
  'colțul care nu mai încape trece')
o('V41', TR, "const scalata = scaleazaNod(piesa.radacina, lx, ly, t.colturi);",
  "const scalata = scaleazaNod(piesa.radacina, lx, ly, undefined);", 'transformare', 'felul colțurilor pierdut în model')
o('V42', TR, "if (b && !textNeuniformPosibil(b)) r.text = true;", "if (false) r.text = true;", 'transformare',
  'eticheta nu spune că textul devine vectori')
o('V43', TR, "return v !== undefined && v.s.tip === 'A' && v.s.bulge !== 0 && (c.inchis || k < c.varfuri.length - 1);",
  "return v !== undefined && v.s.tip === 'A' && v.s.bulge !== 0;", 'transformare',
  'arcul nedesenat al unei căi deschise numărat')
o('V44', TR, "else if (f.tip === 'dreptunghi') r.colturi ||= f.razaColt > 0;", "else if (f.tip === 'dreptunghi') r.colturi = true;",
  'transformare', 'colțurile drepte numărate ca rotunjite')
o('V45', BT, "export const textNeuniformPosibil = (b: BlocText): boolean => !b.curba && !((b.aldin ?? 0) > 0);",
  "export const textNeuniformPosibil = (b: BlocText): boolean => !b.curba;", 'transformare',
  'textul aldin rămâne text la scalarea pe o axă')
o('V46', ED, "const tr: Transformare = tm.fel === 'scalare' && fc ? { ...tm, colturi: fc } : tm;", "const tr: Transformare = tm;", 'e2e',
  'felul colțurilor netrimis transformării')
o('V47', ED, "scrieLocal(CHEIE_COLTURI, k);", "", 'e2e', 'felul colțurilor nețiut în browser')
o('V48', ED, "return FELURI_COLTURI.find((k) => k === v) ?? '';", "return '';", 'e2e', 'felul colțurilor necitit la pornire')
o('V49', ED, ": neuniform ? (felColturi === 'scaleaza' ? 'editare.mod.colturi.curbe' : 'editare.mod.colturi.raza')",
  ": neuniform ? 'editare.mod.colturi.raza'", 'e2e', 'eticheta nu spune că colțurile devin curbe')
o('V50', ED, "...(forme.arce && neuniform ? [t('editare.mod.arce')] : []),", "", 'e2e', 'eticheta nu spune arcele')


SETURI = {
    'manere': ['test/unit/editare.test.ts', 'test/unit/ancora.test.ts'],
    'manere2': ['test/unit/editare.test.ts', 'test/unit/ancora.test.ts', 'test/unit/actiuni.editare.test.ts'],
    'desen': ['test/unit/unelte-desen.test.ts'],
    'desen2': ['test/unit/unelte-desen.test.ts', 'test/unit/formeParametrice.test.ts', 'test/unit/editare.test.ts'],
    'transformare': ['test/unit/transformare.test.ts', 'test/unit/text.piesa.test.ts'],
    'transformare2': ['test/unit/transformare.test.ts', 'test/unit/text.piesa.test.ts', 'test/unit/inclinare.test.ts',
                      'test/unit/actiuni.editare.test.ts', 'test/unit/text.proportii.test.ts'],
}
E2E = ['test/e2e/ancore.spec.ts']
