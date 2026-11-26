# Lista de otrăvuri a feliei 10.4↑e-2 (lungimea laturii și a conturului; ADR 0330), 26.11.2026, alese de autor: lungimea citită din
# lume (latura, conturul, curba, legătura, urma), valoarea fără lume, urma la dezlegare, desenul etichetei (linia, umărul, săgeata,
# simbolul arcului, direcția), „L ” înaintea cifrei, alegerea cu clicul, ușa, punerea și exportul, prinse de unitare, apoi meniul,
# alegerea cotei noi, tragerea etichetei și „Dezleagă” (prinse de e2e).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


C = 'src/model/cote.ts'
D = 'src/model/desenCota.ts'
J = 'src/model/judecataCote.ts'
R = 'src/model/jurnalCote.ts'
P = 'src/model/coteLungime.ts'
X = 'src/io/coteExport.ts'
U = 'src/app/Cote.tsx'
E = 'src/app/Editare.tsx'

# Lungimea, din lume.
o('M01', C, "      if (c['pe'] === 'contur') return { l: lungimeCurba(contur), curba: false };\n", "", 'lungime', 'conturul măsurat ca latură')
o('M02', C, "curba: s.tip === 'C' || (s.tip === 'A' && Math.abs(s.bulge) > 1e-12) };", "curba: s.tip === 'A' && Math.abs(s.bulge) > 1e-12 };",
  'lungime', 'cubica fără simbolul arcului')
o('M03', C, "  if (l && l.loc.fel === 'mijloc' && punctAncora(a, lume).stare === 'legata') {", "  if (l && l.loc.fel === 'mijloc') {", 'lungime',
  'cu alte noduri, măsurată tot din formă')
o('M04', C, "      return { l: lungimeSegmentului(contur, l.loc.k), curba:", "      return { l: Math.hypot(1, 0) * lungimeSegmentului(contur, 0), curba:",
  'lungime', 'mereu prima latură')
o('M05', C, "  }\n  return urmaCota(c);\n}", "  }\n  return null;\n}", 'lungime', 'dezlegată, fără urmă')
o('M06', C, "  return typeof l === 'number' && Number.isFinite(l) && l >= 0 && typeof curba === 'boolean' ? { l, curba } : null;",
  "  return typeof l === 'number' && Number.isFinite(l) && typeof curba === 'boolean' ? { l, curba } : null;", 'lungime', 'o urmă negativă folosită')
o('M07', C, "    case 'lungime': return urmaCota(c)?.l ?? null;", "    case 'lungime': return null;", 'lungime', 'fără lume, nicio valoare')
o('M08', C, "  return c.fel === 'lungime' ? lungimeCota(c, lume)?.l ?? null : valoareCota(c, puncte.map((x) => x.p));",
  "  return valoareCota(c, puncte.map((x) => x.p));", 'lungime', 'masuraCota pe urma veche, nu pe lume')
o('M09', C, "  return m ? { ...structuredClone(c), urma: { l: m.l, curba: m.curba } } : c;", "  return m ? { ...structuredClone(c), urma: { l: m.l, curba: false } } : c;",
  'lungime', 'urma pierde simbolul arcului')
o('M10', R, "      return { ...cotaVazuta(c, lumeV), puncte };", "      return { ...c, puncte };", 'lungime', 'jurnalul nu scrie urma la dezlegare')
# Desenul etichetei.
o('D01', D, "  const e = plus(a, v, Math.max(d, s.capat + gol));", "  const e = plus(a, v, d);", 'lungime', 'linia mai scurtă decât săgeata')
o('D02', D, "  const spre = v.x >= -1e-12 ? 1 : -1;", "  const spre = 1;", 'lungime', 'umărul mereu spre dreapta')
o('D03', D, "  const f = { x: e.x + spre * (w + 2 * gol), y: e.y };", "  const f = { x: e.x + spre * (w + gol), y: e.y };", 'lungime', 'umărul fără un gol')
o('D04', D, "    const sag = 0.3 * h, jum = w / 2, yc = t.text.p.y + h + gol;", "    const sag = 0.25 * h, jum = w / 2, yc = t.text.p.y + h + gol;",
  'lungime', 'simbolul arcului mai plat')
o('D05', D, "    const sag = 0.3 * h, jum = w / 2, yc = t.text.p.y + h + gol;", "    const sag = 0.3 * h, jum = w / 2, yc = t.text.p.y + h;",
  'lungime', 'simbolul arcului lipit de cifră')
o('D06', D, "  if (arc && w > 0) {", "  if (w > 0) {", 'lungime', 'simbolul arcului și pe o latură dreaptă')
o('D07', D, "capete: capete(capatIn(a, v, s)), text: t.text };", "capete: capete(capatIn(e, { x: -v.x, y: -v.y }, s)), text: t.text };", 'lungime',
  'săgeata în cot, nu pe latură')
o('D08', D, "desenLungime(a, c.linie.d, typeof c.linie.u === 'number' ? c.linie.u : 45, s, text, arc)", "desenLungime(a, c.linie.d, 45, s, text, arc)",
  'lungime', 'direcția etichetei ignorată')
o('D09', D, "  const prefix = c.fel === 'lungime' && c['pe'] === 'contur' ? 'L ' : '';", "  const prefix = '';", 'lungime', 'conturul fără „L ”')
o('D10', D, "  for (const e of [...dc.extensii, ...dc.bucati]) d = Math.min(d, laBucata(p, e));", "  for (const e of dc.extensii) d = Math.min(d, laBucata(p, e));",
  'lungime', 'umărul nu se alege cu clicul')
# Ușa.
o('J01', J, "  if (obiect(l) && obiect(l['loc']) && l['loc']['fel'] !== 'mijloc') return", "  if (obiect(l) && obiect(l['loc']) && l['loc']['fel'] === 'nicaieri') return",
  'lungime', 'ușa lasă o lungime legată de un vârf')
o('J02', J, "  if (typeof u !== 'number' || !Number.isFinite(u) || Math.abs(u) > 360) return", "  if (typeof u === 'string') return", 'lungime',
  'ușa nu judecă direcția etichetei')
o('J03', J, "  if (Object.hasOwn(c, 'pe') && c['pe'] !== 'contur') return", "  if (Object.hasOwn(c, 'pe') && c['pe'] === 0) return", 'lungime',
  'ușa lasă orice `pe`')
o('J04', J, "    if (!obiect(m) || !inPlafon(m['l']) || (m['l'] as number) < 0 || typeof m['curba'] !== 'boolean') {",
  "    if (!obiect(m)) {", 'lungime', 'ușa nu judecă urma')
# Punerea și exportul.
o('P01', P, "    ...(pe === 'contur' ? { pe: 'contur' } : {}),\n", "", 'lungime', 'conturul pus ca latură')
o('P02', P, "      if (d <= tol && (!cel || d < cel.d)) cel = { e, k, n, d };", "      if (!cel || d < cel.d) cel = { e, k, n, d };", 'lungime',
  'pusă și departe de orice contur')
o('X01', X, "  return { p, valoare, text, dc: desenCota(c, p, o.stil, text, lungimeCota(c, lume)?.curba ?? false) };",
  "  return { p, valoare, text, dc: desenCota(c, p, o.stil, text) };", 'lungime', 'exportul fără simbolul arcului')
# Meniul și unealta (e2e).
o('E01', E, "if (laMeniu) pornesteCote('l', laMeniu); } },", "if (laMeniu) pornesteCote('c', laMeniu); } },", 'e2e', 'latura cerută dă conturul')
o('E02', U, "    if (r.ok) setAleasa(c.id);\n  };", "  };", 'e2e', 'cota nouă nu e aleasă')
o('E03', U, "  if (fel === 'lungime') return a ? linieLungimeDin(a, w, veche) : null;\n", "", 'e2e', 'eticheta nu se trage')
o('E04', U, "dezleaga: () => scrie((c) => cotaDezlegata(cotaVazuta(c, indexLume(acum.current.doc, acum.current.indexFoaie)), d.puncte)),",
  "dezleaga: () => scrie((c) => cotaDezlegata(c, d.puncte)),", 'e2e', '„Dezleagă” rămâne la lungimea de la punere')
o('E05', U, "      setMotiv(t('editare.cote.motiv.latura'));\n      return;", "      return;", 'e2e', 'departe de contur, fără motiv')
o('E06', U, "  lungimea.current = (p, tol, pe): void => {\n    const c = cotaLungimeLa(doc, indexFoaie, p, tol, pe, idCotaNou(cote));",
  "  lungimea.current = (p, tol, pe): void => {\n    const c = cotaLungimeLa(doc, indexFoaie, p, tol / 100, pe, idCotaNou(cote));", 'e2e',
  'toleranța clicului dreapta prea mică')

SETURI = {
    'lungime': ['test/unit/cote.lungime.test.ts'],
}
E2E = ['test/e2e/cote.lungime.spec.ts']
