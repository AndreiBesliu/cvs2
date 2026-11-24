# Lista de otrăvuri a feliei 10.4↑a-1 (modelul cotelor și proba G-code-ului; ADR 0330 §2, §3, §8), 24.11.2026, alese de autor:
# punctele ancorelor (cutia, nodurile, vârful, mijlocul arcului, cadranul, centrul pe o linie, forma lipsă), valorile (verticala,
# diametrul, semidreptele unghiului, laturile paralele, a doua latură), judecata ușii (id-urile, plafonul, punctele, x, legătura,
# felul necunoscut, s1, textul, k, q), legătura ei cu ușa (lista goală, apelul, privirea de la pornire, judecata neîncărcată),
# comanda jurnalului (lista goală, inversa) și două scurgeri ale cotelor în lume și în CAM, prinse de proba invariantului.
# Încărcarea judecății la pornire (`src/app/proiectLocal.ts`) n-are probă unitară: o prinde e2e-ul reîncărcării cu cote (10.4↑a-2).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


M = 'src/model/cote.ts'
J = 'src/model/judecataCote.ts'
S = 'src/model/schemaDocument.ts'
U = 'src/model/usaCurenta.ts'
JR = 'src/model/jurnal.ts'

# Modelul (punctele și valorile).
o('M01', M, 'const col = loc.i % 3, rand = Math.floor(loc.i / 3);', 'const rand = loc.i % 3, col = Math.floor(loc.i / 3);', 'model',
  'cutia citită pe coloane în loc de rânduri')
o('M02', M, "  if (m !== n) return 'noduri';\n", '', 'model', 'o formă cu alte noduri rămâne legată (vârful k e altul)')
o('M03', M, "if (loc.fel === 'varf') return c.varfuri[loc.k]?.p ?? 'noduri';", "if (loc.fel === 'varf') return c.varfuri[loc.k + 1]?.p ?? 'noduri';", 'model',
  'vârful următor')
o('M04', M, 'cerc.start + cerc.baleiaj / 2', 'cerc.start + cerc.baleiaj', 'model', 'mijlocul arcului e capătul lui')
o('M05', M, 'Math.atan2(M.b * u + M.d * v, M.a * u + M.c * v)', 'Math.atan2(v, u)', 'model', 'cadranul nu se rotește cu forma')
o('M06', M, "  if (s.tip !== 'A') return 'noduri';\n", '', 'model', 'centrul unei linii')
o('M07', M, "if (!e) return { p, stare: 'dezlegata', motiv: 'forma' };", "if (!e) return { p, stare: 'libera' };", 'model',
  'o cotă fără formă pare liberă, nu dezlegată')
o('M08', M, "case 'verticala': return Math.abs(b.y - a.y);", "case 'verticala': return Math.abs(b.x - a.x);", 'model', 'verticala măsoară pe X')
o('M09', M, "case 'diametru': return 2 * Math.hypot", "case 'diametru': return Math.hypot", 'model', 'diametrul e raza')
o('M10', M, 'const s1 = c.linie?.s1 === -1 ? -1 : 1', 'const s1 = 1', 'model', 'prima semidreaptă nu se poate întoarce (suplementul lipsește)')
o('M11', M, '      if (y && Math.abs(d1.x * d2.y - d1.y * d2.x) <= 1e-12 * Math.hypot(d1.x, d1.y) * Math.hypot(d2.x, d2.y)) return null;\n', '', 'model',
  'două laturi paralele au „unghi”')
o('M12', M, '{ x: s2 * (y.x - x.x), y: s2 * (y.y - x.y) }', '{ x: s2 * (y.x - a.x), y: s2 * (y.y - a.y) }', 'model',
  'a doua latură măsurată din primul punct')

# Judecata ușii și legătura ei.
o('U01', J, '      if (ids.has(id as string)) return `foaia ${f.id} are două cote cu id-ul ${id as string}`;\n', '', 'usa', 'două cote cu același id')
o('U02', J, 'if (cote.length > PLAFON.cote)', 'if (cote.length > PLAFON.cote * 2)', 'usa', 'plafonul cotelor dublat')
o('U03', J, "  if (!n.includes(puncte.length)) return `o cotă ${fel} are ${n.join(' sau ')} puncte, nu ${puncte.length}`;\n", '', 'usa',
  'orice număr de puncte')
o('U04', J, "  if (!inPlafon(a['x'])) return", "  if (false && !inPlafon(a['x'])) return", 'usa', 'x neverificat')
o('U05', J, "  const p = problemaLoc(l['loc']);\n  return p ? `legătura.${p}` : null;", '  return null;', 'usa', 'locul legăturii neverificat')
o('U06', J, '  if (!felCunoscut(fel)) return null;', "  if (!felCunoscut(fel)) return 'fel necunoscut';", 'usa',
  'o cotă dintr-o versiune mai nouă refuză proiectul')
o('U07', J, "    if (Object.hasOwn(linie, s) && linie[s] !== 1 && linie[s] !== -1) return `linie.${s} e 1 sau −1`;\n", '', 'usa', 's1, s2 neverificate')
o('U08', J, "c['text'].length > PLAFON.numeLungime", "c['text'].length > PLAFON.campLungime", 'usa', 'textul cotei până la 10 000 de caractere')
o('U09', J, "if (!intreg(loc['k'], 0, PLAFON.noduri - 1))", "if (!intreg(loc['k'], -1, PLAFON.noduri - 1))", 'usa', 'k negativ')
o('U10', J, "intreg(loc['q'], 0, 3)", "intreg(loc['q'], 0, 4)", 'usa', 'al cincilea cadran')
o('U11', S, "!(Array.isArray(f['cote']) && f['cote'].length === 0)", "Array.isArray(f['cote']) && f['cote'].length > 0", 'usa',
  'o valoare care nu e listă trece nejudecată')
o('U12', U, "  if (c) return { ok: false, motiv: `documentul nu respectă schema: ${c}` };\n", '', 'usa', 'ușa nu mai cere judecata cotelor')
o('U13', U, '    return !(Array.isArray(c) && c.length === 0);', '    return Array.isArray(c) && c.length > 0;', 'usa',
  'la pornire, o valoare stricată nu aduce judecata (deci trece)')
o('U14', S, "return judecataCote ? judecataCote(d) : 'documentul are cote, iar judecata lor nu e încărcată';", 'return judecataCote ? judecataCote(d) : null;', 'usa',
  'fără judecata adusă, cotele trec nejudecate')
o('U15', JR, '    foi[fi] = c.nou.length > 0 ? { ...fara, cote: [...c.nou] } : fara;', '    foi[fi] = { ...fara, cote: [...c.nou] };', 'usa',
  'lista goală lasă `cote: []` în proiect')
o('U16', JR, "    case 'inlocuieste-cote': return { tip: c.tip, foaie: c.foaie, vechi: c.nou, nou: c.vechi };",
  "    case 'inlocuieste-cote': return { tip: c.tip, foaie: c.foaie, vechi: c.vechi, nou: c.nou };", 'usa', 'anularea cotelor nu anulează nimic')

# Scurgerile cotelor (proba invariantului).
o('N01', 'src/cam/job.ts', '  const grosime = foaie.stoc.grosime;\n', '  const grosime = foaie.stoc.grosime + ((foaie.cote?.length ?? 0) > 0 ? 0.001 : 0);\n',
  'neatinse', 'cotele schimbă grosimea foii în CAM')
o('N02', 'src/model/lume.ts', '  return rez;\n}\n\n/**\n * O tăietură în lume',
  "  for (const c of foaie.cote ?? []) rez.push({ idLume: `${c.id}/c`, instanta: c.id, piesa: c.id, nod: 'c', forma: { tip: 'cerc', raza: 1 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } });\n  return rez;\n}\n\n/**\n * O tăietură în lume",
  'neatinse', 'cotele intră în lume ca forme (verificarea, raportul)')

SETURI = {
    'model': ['test/unit/cote.model.test.ts'],
    'usa': ['test/unit/cote.usa.test.ts'],
    'neatinse': ['test/unit/cote.neatinse.test.ts'],
}
