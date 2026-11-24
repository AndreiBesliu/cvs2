# Lista de otrăvuri a feliei 10.4↑a-2 (unealta Cote; ADR 0330 §3, §5, §6), 24.11.2026, alese de autor: lipirea pe puncte
# (ordinea la egalitate, toleranța, felurile oprite, conturul, grila, cadranele de pe arc, indexul cutiilor), desenul cotei
# (normala, mijlocul, golul și depășirea, capetele în afară, cifra citibilă, Automată), setările (marginile, Alt, Ctrl), dezlegarea
# în jurnal (pasul unic, punctul de dinainte, foaia copiată) și unealta pe pânză (prinsă de e2e: clicul oprit înaintea alegerii,
# vârful care bate cota, extensiile care nu aleg, Enter la Măsoară, Delete, tasta M).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


L = 'src/geom/lipirePuncte.ts'
P = 'src/model/puncteCote.ts'
D = 'src/model/desenCota.ts'
S = 'src/app/setariCote.ts'
J = 'src/model/jurnal.ts'
JC = 'src/model/jurnalCote.ts'
C = 'src/model/cote.ts'
U = 'src/app/Cote.tsx'

# Lipirea pe puncte.
o('L01', L, "export const ORDINEA: readonly FelPunct[] = ['centru', 'cadran', 'varf', 'mijloc', 'cutie', 'foaie', 'contur', 'grila'];",
  "export const ORDINEA: readonly FelPunct[] = ['cutie', 'centru', 'cadran', 'varf', 'mijloc', 'foaie', 'contur', 'grila'];", 'lipire',
  'cutia bate vârful la egalitate')
o('L02', L, '    if (d > tol) return;\n', '    if (d > 2 * tol) return;\n', 'lipire', 'toleranța dublă')
o('L03', L, '    if (!o.felurile.has(t.fel)) return;\n', '', 'lipire', 'felurile oprite lipesc')
o('L04', L, "  if (cel) return (cel as { readonly t: PunctTinta<T> }).t;\n  if (o.peContur) {",
  "  if (o.peContur) {", 'lipire', 'conturul bate un punct numit')
o('L05', L, '    const u = start + baleiaj * t;', '    const u = start + baleiaj * (1 - t);', 'lipire', 'punctul de pe arc, oglindit')
o('L06', L, "  if (o.grila !== null && o.grila > 0 && o.felurile.has('grila')) {", "  if (o.grila !== null && o.grila > 0) {", 'lipire',
  'grila debifată lipește')
o('L07', L, '    if (!inCutie(s.cutie, p, tol)) continue;\n', '', 'lipire', 'fără indexul cutiilor (o formă departe își face punctele)')
o('L08', P, '      const pe = rel <= Math.abs(baleiaj) + 1e-12 || rel >= 2 * Math.PI - 1e-12;', '      const pe = true;', 'lipire',
  'cadranele din partea goală a arcului')
o('L10', P, 'puncte: () => (puncte ??= puncteElement(e, c()))', 'puncte: () => puncteElement(e, c())', 'lipire',
  'punctele refăcute la fiecare mișcare')

# Desenul cotei.
o('D01', D, '  return { u, n: { x: -u.y, y: u.x } };', '  return { u, n: { x: u.y, y: -u.x } };', 'desen', 'normala întoarsă')
o('D02', D, '  const nivel = (scalar(a, n) + scalar(b, n)) / 2 + d;', '  const nivel = scalar(a, n) + d;', 'desen',
  'linia față de primul punct, nu față de mijloc')
o('D03', D, '    if (Math.abs(t) <= s.gol) continue;\n', '', 'desen', 'extensia unui punct de pe linie')
o('D04', D, '    extensii.push([plus(p, n, sg * s.gol), plus(p, n, t + sg * s.depasire)]);',
  '    extensii.push([plus(p, n, sg * s.gol), plus(p, n, t)]);', 'desen', 'fără depășire')
o('D05', D, '  const inauntru = lung >= 2 * s.capat;', '  const inauntru = true;', 'desen', 'capetele mereu înăuntru')
o('D06', D, '  if (unghi > 90 + 1e-9) unghi -= 180;\n', '', 'desen', 'cifra cu capul în jos')
o('D07', D, "  return ey >= ex ? 'orizontala' : 'verticala';", "  return ey > ex ? 'orizontala' : 'verticala';", 'desen',
  'Automată în colț, la egalitate')
o('D08', D, "  if (ex === 0 && ey === 0) return 'aliniata';\n", '', 'desen', 'Automată înăuntru: orizontala')
o('D09', D, "  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\\.$/, '');", "  s = s.replace(/0+$/, '').replace(/\\.$/, '');", 'desen',
  'zerourile întregului tăiate')
o('D10', D, '  if (v < 0 && r !== 0) s = `-${s}`;', '  if (v < 0) s = `-${s}`;', 'desen', '„-0”')
o('D11', D, '  const ex = Math.max(0, Math.abs(lx) - hw), ey = Math.max(0, -ly, ly - dc.text.inaltime);',
  '  const ex = Math.max(0, Math.abs(lx) - hw), ey = Math.max(0, Math.abs(ly) - dc.text.inaltime);', 'desen', 'cutia cifrei și sub linie')

# Setările.
o('S01', S, '&& tol >= TOLERANTA_MINIMA && tol <= TOLERANTA_MAXIMA ? tol', '&& tol >= TOLERANTA_MINIMA ? tol', 'setari', 'toleranța fără margine sus')
o('S02', S, '  if (lipire === taste.alt) return null;', '  if (!lipire) return null;', 'setari', 'Alt nu mai inversează')
o('S03', S, "(s.lipire.contur === 'ctrl' && taste.ctrl)", "(s.lipire.contur === 'ctrl')", 'setari', 'conturul fără Ctrl')
o('S04', S, '  return { toleranta: s.lipire.toleranta / scara, felurile, grila, peContur };',
  '  return { toleranta: s.lipire.toleranta, felurile, grila, peContur };', 'setari', 'toleranța în mm, nu în pixeli')

# Dezlegarea în jurnal.
o('J01', J, "      pas = { tip: 'lot', comenzi: [c, ...extra] };", '      pas = c;', 'dezlegare', 'dezlegarea în afara pasului de anulare')
o('J02', JC, '        return { ...a, x: v.p.x, y: v.p.y };', '        return a;', 'dezlegare', 'fără ultimul punct văzut')
o('J03', JC, "        if (v.stare !== 'legata' || punctAncora(a, lumeN).stare === 'legata') return a;",
  "        if (punctAncora(a, lumeN).stare === 'legata') return a;", 'dezlegare', 'un capăt deja dezlegat se scrie din nou')
o('J04', JC, '    if (!vechea || (vechea.instante === f.instante && inainte.piese === dupa.piese)) continue;',
  '    if (!vechea || vechea.instante === f.instante) continue;', 'dezlegare', 'nodurile schimbate (aceleași instanțe) nu dezleagă')
o('J05', C, '        const nou = a.legatura ? harta.get(a.legatura.instanta) : undefined;', '        const nou = undefined;', 'dezlegare',
  'cotele foii copiate rămân pe instanțele vechi')

# Unealta pe pânză (e2e).
o('E01', U, '      e.preventDefault();\n      e.stopPropagation();\n      panza.setPointerCapture(e.pointerId);\n      const w = inLume(e);',
  '      panza.setPointerCapture(e.pointerId);\n      const w = inLume(e);', 'e2e', 'clicul uneltei ajunge și la alegerea pânzei')
o('E02', U, '      const sub = numit ? null : cotaLa(w);', '      const sub = cotaLa(w);', 'e2e', 'vârful de pe extensia altei cote o alege')
o('E03', U, '        const dist = distantaLaDesen({ ...d.desen, extensii: [] }, d.text, w);', '        const dist = distantaLaDesen(d.desen, d.text, w);', 'e2e',
  'extensiile aleg (cu E02 înlăturată, tot vârful ar bate)')
o('E04', U, "      if (e.key === 'Enter' && s.masura?.b) {", "      if (e.key === 'Enter' && s.masura?.b && false) {", 'e2e', 'Enter nu păstrează măsura')
o('E05', U, "      if (e.key === 'Delete' || e.key === 'Backspace') {\n        ia();", "      if (e.key === 'Delete' || e.key === 'Backspace') {", 'e2e',
  'Delete pe o cotă șterge și forma aleasă')
o('E06', 'src/app/Editare.tsx', "      if (!e.altKey && !e.shiftKey && e.key.toLowerCase() === 'm') {", "      if (!e.altKey && !e.shiftKey && e.key.toLowerCase() === 'µ') {", 'e2e',
  'tasta M nu pornește Măsoară')

SETURI = {
    'lipire': ['test/unit/cote.lipire.test.ts'],
    'desen': ['test/unit/cote.desen.test.ts'],
    'setari': ['test/unit/cote.setari.test.ts'],
    'dezlegare': ['test/unit/cote.dezlegare.test.ts'],
}
E2E = ['test/e2e/cote.spec.ts']
