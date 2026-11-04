# Lista de otrăvuri a feliei 7.6↑b (fonturile SVG cu o singură linie, ADR 0140 §7), 02.11.2026: ușa (recunoașterea după
# conținut, fața, fețele pentru Fonturile mele), cititorul (garda entităților, parserul, mărimile, căile cu Z și după Z,
# arcele, glifele și numele, crenarea), regula buclei păstrate și fereastra fonturilor. Alese de autor.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), din worktree-ul feliei (în afara Drive-ului), după commit; setul
# „e2e”, cu harnașul local pe portul worktree-ului (4174).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


SVG = 'src/text/fontSvg.ts'
FNT = 'src/text/font.ts'
OMU = 'src/text/fonturiOmului.ts'
LIN = 'src/text/linie.ts'
DIA = 'src/app/DialogFonturi.tsx'

# ---- Ușa ----
o('U01', FNT, "return esteFontSvg(octeti) ? 'svg' : 'necunoscut';", "return 'necunoscut';", 'svg', 'fontul SVG nu se mai recunoaște')
o('U02', FNT, 'if (fata !== 0 || typeof instanta === \'number\')', 'if (typeof instanta === \'number\')', 'svg', 'fața a doua a unui font SVG, citită ca prima')
o('U03', FNT, 'return r.ok ? [r.font.nume] : null;', 'return r.ok ? [] : null;', 'svg', 'fețele unui font SVG, pierdute')
o('U04', OMU, "if (fel !== 'font' && fel !== 'colectie' && fel !== 'svg') return null;", "if (fel !== 'font' && fel !== 'colectie') return null;", 'svg',
  'Fonturile mele refuză fontul SVG')
o('U05', SVG, "return t.startsWith('<') && /<(?:[A-Za-z_][\\w.-]*:)?font[\\s>/]/.test(t);", "return t.startsWith('<') && /<(?:[A-Za-z_][\\w.-]*:)?font/.test(t);",
  'svg', '<font-face> fără <font> ia un desen drept font')

# ---- Cititorul ----
o('R01', SVG, "if (entitati) return { ok: false, cod: 'stricat', detaliu: `entități: ${entitati}` };", 'if (false) return { ok: false, cod: \'stricat\' };',
  'svg', 'garda entităților sărită: parserul primește bomba')
o('R02', SVG, "if (doc.getElementsByTagName('parsererror').length > 0) return { ok: false, cod: 'stricat', detaliu: 'XML' };", '',
  'svg', 'documentul parțial al browserului (cu <parsererror>) citit ca font')
o('R03', SVG, 'if (!(unitsPerEm >= 16 && unitsPerEm <= 16384))', 'if (false)', 'svg', 'units-per-em fără plafon')
o('R04', SVG, 'if (u.x !== start.x || u.y !== start.y) cur.push({ ...start });', '', 'svg',
  'Z nu mai pune startul la capăt: bucla își pierde latura de închidere')
# R05 (comanda de după Z continuă bucla) a scăpat: echivalentă, fiindcă parserul pune singur M-ul după Z; ramura, moartă,
# a fost scoasă din cititor (și nu e alta în loc: parserul nu dă niciun desen înaintea unui M).
o('R06', SVG, "if (c.tip === 'A') return null;", "if (c.tip === 'A') continue;", 'svg', 'glifa cu arc nu mai e sărită')
o('R07', SVG, "else cur.push({ x: c.c1.x, y: c.c1.y, peCurba: false }, { x: c.c2.x, y: c.c2.y, peCurba: false },",
  "else cur.push({ x: c.c2.x, y: c.c2.y, peCurba: false }, { x: c.c1.x, y: c.c1.y, peCurba: false },", 'svg', 'punctele de control ale cubicei, inversate')
o('R08', SVG, 'if (coduri.length === 1 && !harta.has(coduri[0]!.codePointAt(0)!))', 'if (coduri.length === 1)', 'svg',
  'caracterul dublat: ultima glifă câștigă')
o('R09', SVG, 'if (coduri.length === 1 && !harta.has', 'if (coduri.length >= 1 && !harta.has', 'svg', 'ligatura dă glifa primului ei caracter')
o('R10', SVG, "if (n !== null && n !== '' && !nume.has(n)) nume.set(n, i);", "if (n !== null && n !== '') nume.set(n, i);", 'svg',
  'numele dublat: ultima glifă câștigă')
o('R11', SVG, 'if (!crenari.has(a * 0x10000 + j)) crenari.set(a * 0x10000 + j, 0 - valoare);', 'crenari.set(a * 0x10000 + j, 0 - valoare);', 'svg',
  'perechea crenată de două ori: ultima câștigă')
o('R12', SVG, 'crenari.set(a * 0x10000 + j, 0 - valoare);', 'crenari.set(a * 0x10000 + j, valoare);', 'svg', 'semnul crenării')
o('R13', SVG, "parseInt(m[1]!.replace(/\\?/g, 'F'), 16)", "parseInt(m[1]!.replace(/\\?/g, '0'), 16)", 'svg', 'intervalul cu „?” se strânge la un caracter')
o('R14', SVG, 'hi = m[2] ? parseInt(m[2], 16)', 'hi = m[2] ? parseInt(m[1]!, 16)', 'svg', 'intervalul U+a-b se oprește la a')
o('R15', SVG, "const majuscula = varfH > 0 ? varfH : numar(ff, 'cap-height') ?? 0;", "const majuscula = numar(ff, 'cap-height') ?? varfH;", 'svg',
  'cap-height înaintea vârfului lui H')
o('R16', SVG, "coborare: 0 - Math.abs(numar(ff, 'descent') ?? 0),", "coborare: numar(ff, 'descent') ?? 0,", 'svg', 'descent pozitiv urcă deasupra liniei')
o('R17', SVG, "urcare: numar(ff, 'ascent') ?? unitsPerEm,", "urcare: numar(ff, 'ascent') ?? 0,", 'svg', 'fără ascent: urcarea zero')
o('R18', SVG, "avansuri.push(numar(g, 'horiz-adv-x') ?? avansFont);", "avansuri.push(numar(g, 'horiz-adv-x') ?? 0);", 'svg',
  'glifa fără avans nu-l ia pe al fontului')
o('R19', SVG, "return [greutate, inclinare].filter((x) => x !== '').join(' ') || 'Regular';", "return [greutate, inclinare].filter((x) => x !== '').join(' ');",
  'svg', 'stilul implicit gol')
o('R20', SVG, "postscript: font.getAttribute('id')?.trim() || familie.replace(/\\s+/g, '')", "postscript: familie.replace(/\\s+/g, '')", 'svg',
  'numele PostScript din familie, nu din id')

# ---- Regula buclei (ADR 0140 §7) ----
o('T01', LIN, 'if (n > 2 && prim.x === ultim.x && prim.y === ultim.y) return { puncte: c, inchis: true };',
  'if (n > 2 && prim.x === ultim.x && prim.y === ultim.y) return { puncte: c.slice(0, -1), inchis: true };', 'svg',
  'bucla își pierde punctul final (cubica de închidere)')

# ---- Fereastra fonturilor (e2e) ----
o('F01', DIA, 'accept=".ttf,.otf,.ttc,.otc,.woff,.woff2,.svg,font/ttf', 'accept=".ttf,.otf,.ttc,.otc,.woff,.woff2,font/ttf', 'e2e',
  'fereastra fișierelor nu arată fonturile SVG')

SETURI = {
    'svg': ['test/unit/text.svg.test.ts', 'test/unit/text.linie.test.ts', 'test/unit/text.corpus.test.ts'],
    'svg2': ['test/unit/text.svg.test.ts', 'test/unit/text.linie.test.ts', 'test/unit/text.corpus.test.ts', 'test/unit/text.font.test.ts',
             'test/unit/text.piesa.test.ts', 'test/unit/text.actiune.test.ts', 'test/unit/text.aldin.test.ts', 'test/unit/svg.test.ts'],
}
E2E = ['test/e2e/fonturi.spec.ts']
