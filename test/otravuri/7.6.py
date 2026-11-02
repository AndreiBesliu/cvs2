# Lista de otrăvuri a feliei 7.6↑ (fonturile cu o singură linie, ADR 0140), 02.11.2026: recunoașterea fontului, trăsătura
# unui contur (dus-întors, păstrată deschisă, bucla cu ultimul punct în afara curbei), așezarea trăsăturilor (TrueType și CFF,
# capetele după regulile ușilor, fără normalizare, fără aldin), piesa (formele deschise, gravura pe linie, adâncimea după
# grosimea foii, operațiile păstrate la editare), previzualizarea (liniile, buclele) și panoul (Aldin oprit). Alese de autor.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), din worktree-ul feliei (în afara Drive-ului), după commit; setul
# „e2e”, cu harnașul local pe portul worktree-ului (4174).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


LIN = 'src/text/linie.ts'
FNT = 'src/text/font.ts'
ASE = 'src/text/asezare.ts'
PIE = 'src/text/piesaText.ts'
CAL = 'src/app/caleText.ts'
PAN = 'src/app/PanouText.tsx'
DOC = 'src/ui/actiuniDocumentCalcul.ts'

# ---- Recunoașterea și trăsătura ----
o('L01', LIN, 'return c.every((q) => (q.x - o.x) * dy - (q.y - o.y) * dx === 0);', 'return true;', 'linie', 'orice contur pare fără arie')
o('L02', LIN, 'return cu >= 2 && 2 * cu >= are;', 'return cu >= 2 && cu >= are;', 'linie', 'toate sondele trebuie să fie fără arie')
o('L03', LIN, 'palindrom = acelasi(c[(t + i) % n]!, c[(t - i + n) % n]!);', 'palindrom = acelasi(c[(t + i) % n]!, c[(t + i) % n]!);', 'linie',
  'orice contur par pare dus-întors')
o('L04', LIN, 'Array.from({ length: n / 2 + 1 }', 'Array.from({ length: n / 2 }', 'linie', 'jumătatea dus-întorsului pierde capătul')
o('L05', LIN, '  return { puncte: c, inchis: true };\n}', '  return { puncte: c, inchis: false };\n}', 'linie', 'bucla cu ultimul punct în afara curbei, citită deschisă')
o('N01', FNT, 'font: { ...font, linie: cuOLinie(font) }', 'font: { ...font, linie: false }', 'linie', 'cititorul nu mai recunoaște fontul')

# ---- Așezarea ----
o('E01', ASE, 'const d = font.linie ? 0 : p.aldin ?? 0;', 'const d = p.aldin ?? 0;', 'linie', 'aldinul se aplică și trăsăturilor')
o('E02', ASE, 'const t = font.linie ? traseu(c) : { puncte: c, inchis: true };', 'const t = { puncte: c, inchis: true };', 'linie',
  'trăsăturile citite ca figuri închise')
o('E03', ASE, 'const r = incheieSubcalea(v.varfuri, v.capat, v.start, false, false);', 'const r = incheieSubcalea(v.varfuri, v.capat, v.start, false, true);',
  'linie', 'trăsăturile deschise închise ca o umplere')
o('E04', ASE, 'if (b && !a.peCurba && !b.peCurba) extinse.push(', 'if (b && !a.peCurba) extinse.push(', 'linie',
  'punctele de pe curbă subînțelese, puse și lângă cele de pe curbă')
o('E05', ASE, "        varfuri.push({ p: harta(cur), s: { tip: 'C', c1: harta(q), c2: harta(c2) } });\n      }\n      cur = capat;\n      k += 3;\n    }\n    return { varfuri, start: harta(start), capat: harta(cur) };",
  "        varfuri.push({ p: harta(cur), s: { tip: 'C', c1: harta(c2), c2: harta(q) } });\n      }\n      cur = capat;\n      k += 3;\n    }\n    return { varfuri, start: harta(start), capat: harta(cur) };",
  'linie', 'cubicele unei trăsături CFF cu punctele de control inversate')
o('E06', ASE, 'const normalizate = font.linie ? cai : normalizeazaForma(cai, true, buget, raport);', 'const normalizate = normalizeazaForma(cai, true, buget, raport);',
  'linie', 'trăsăturile normalizate ca figuri')

# ---- Piesa ----
o('G01', PIE, "forma: { tip: 'cale', inchis: c.inchis,", "forma: { tip: 'cale', inchis: true,", 'linie', 'trăsăturile deschise devin forme închise')
o('G02', PIE, 'if (asezat.linie) {', 'if (false) {', 'linie', 'trăsăturile primesc profilele din imbricare')
o('G03', PIE, '.filter(peTrasatura)', '.filter(() => true)', 'linie', 'la editare, profilele pe contur rămân pe trăsături')
o('G04', PIE, 'const adancime = adancimeDeschise(grosime);', 'const adancime = adancimeDeschise();', 'linie', 'gravura nu ține cont de grosimea foii')
o('G05', PIE, "o.tip === 'profil' && o.latura !== 'exterior' && o.latura !== 'interior';", "o.tip === 'profil' && o.latura !== 'exterior';", 'linie',
  'profilul pe interior rămâne pe trăsături')

# ---- Previzualizarea ----
o('K01', CAL, 'if (a.linie || !c.inchis) linii += s;', 'if (!c.inchis) linii += s;', 'linie', 'buclele unui font cu o linie, umplute')
o('K02', CAL, 'v.slice(0, c.inchis ? v.length : v.length - 1)', 'v.slice(0, v.length)', 'linie', 'trăsătura deschisă desenată înapoi până în start')

# ---- Panoul și acțiunea (e2e) ----
o('P01', PAN, 'const linieFont = rezFont?.ok === true && rezFont.font.linie;', 'const linieFont = false;', 'e2e', 'Aldin rămâne pornit pe un font cu o linie')
o('P02', PAN, 'const gros = f.aldin && !linie;', 'const gros = f.aldin;', 'e2e', 'blocul unui text cu o linie primește aldinul')
o('P03', PAN, 'checked={form.aldin && !linieFont}', 'checked={form.aldin}', 'e2e', 'bifa Aldin rămâne bifată, deși oprită')
o('D01', DOC, 'const r = c.piesa(id, sculaFoii(doc), foaie.stoc.grosime);', 'const r = c.piesa(id, sculaFoii(doc));', 'e2e',
  'grosimea foii nu ajunge la piesă')

SETURI = {
    'linie': ['test/unit/text.linie.test.ts', 'test/unit/text.corpus.test.ts', 'test/unit/text.aldin.test.ts'],
    'linie2': ['test/unit/text.linie.test.ts', 'test/unit/text.corpus.test.ts', 'test/unit/text.aldin.test.ts', 'test/unit/text.piesa.test.ts',
               'test/unit/text.actiune.test.ts', 'test/unit/text.curba.test.ts', 'test/unit/text.font.test.ts'],
}
E2E = ['test/e2e/text.spec.ts']
