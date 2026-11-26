# Lista de otrăvuri a feliei 10.4↑d-1 (lanțul, linia de bază și „Cotează selecția”; ADR 0330 §4), 26.11.2026, alese de
# autor: seria pură (lanțul, baza, pasul, partea, cota de zero, id-ul), cotele selecției (colțurile, liniile, piesele din mai
# multe elemente, cotele de zero, legarea, id-urile), prinse de unitare, apoi unealta și meniul de clic dreapta (prinse de e2e).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


S = 'src/model/serieCote.ts'
C = 'src/model/coteSelectie.ts'
U = 'src/app/Cote.tsx'
E = 'src/app/Editare.tsx'

# Seria, pură.
o('S01', S, "  return { mod, fel, din: mod === 'lant' ? b : a, pe, d, semn: d < 0 ? -1 : 1, k: 0 };",
  "  return { mod, fel, din: b, pe, d, semn: d < 0 ? -1 : 1, k: 0 };", 'serie', 'linia de bază pleacă din al doilea punct')
o('S02', S, "  return { mod, fel, din: mod === 'lant' ? b : a, pe, d, semn: d < 0 ? -1 : 1, k: 0 };",
  "  return { mod, fel, din: mod === 'lant' ? b : a, pe, d, semn: 1, k: 0 };", 'serie', 'liniile de bază urcă și sub formă')
o('S03', S, "    const d = s.fel === 'aliniata' ? s.d : distantaDinCursor(s.fel, a, c, s.pe);",
  "    const d = distantaDinCursor(s.fel, a, c, s.pe);", 'serie', 'lanțul aliniat nu ține distanța primei')
o('S04', S, "  if (!(masura(s.fel, a, c) > 1e-9)) return null;\n", "", 'serie', 'o cotă de zero pusă')
o('S05', S, "  const k = s.k + 1, dd = s.semn * k * pas;", "  const k = s.k + 1, dd = s.semn * pas;", 'serie',
  'toate liniile de bază la un singur pas')
o('S06', S, "  if (s.fel === 'aliniata') return { d: s.d + dd, stare: { ...s, k } };", "  if (s.fel === 'aliniata') return { d: s.d, stare: { ...s, k } };",
  'serie', 'baza aliniată fără pas')
o('S07', S, "    return { d, stare: { ...s, din: c, pe, d } };", "    return { d, stare: { ...s, pe, d } };", 'serie',
  'lanțul pleacă mereu din primul capăt')
o('S08', S, "  if (fel === 'orizontala') return Math.abs(b.x - a.x);", "  if (fel === 'orizontala') return Math.abs(b.y - a.y);", 'serie',
  'zero-ul orizontalei judecat pe Y')
o('S09', S, "  return dir ? { x: (a.x + b.x) / 2 + dir.n.x * d, y: (a.y + b.y) / 2 + dir.n.y * d } : null;",
  "  return dir ? { x: (a.x + b.x) / 2 - dir.n.x * d, y: (a.y + b.y) / 2 - dir.n.y * d } : null;", 'serie',
  'linia de referință de partea cealaltă')
o('S10', S, "  return `c${n + 1}`;", "  return `c${n}`;", 'serie', 'id-ul nou repetă ultimul')
# Cotele selecției, pure.
o('C01', C, "capat(st, 0, legate), capat(dr, 2, legate)", "capat(st, 0, legate), capat(dr, 0, legate)", 'selectie',
  'lățimea până la colțul stâng al ultimului element')
o('C02', C, "capat(jos, 2, legate), capat(sus, 8, legate)", "capat(jos, 2, legate), capat(sus, 2, legate)", 'selectie',
  'înălțimea până la colțul de jos al celui de sus')
o('C03', C, "{ x: x0, y: y0 - distanta }", "{ x: x0, y: y0 + distanta }", 'selectie', 'lățimea deasupra marginii de jos')
o('C04', C, "{ x: x1 + distanta, y: y0 }", "{ x: x1 - distanta, y: y0 }", 'selectie', 'înălțimea înăuntrul piesei')
o('C05', C, "    if (y1 - y0 > 1e-9) pune(", "    if (y1 - y0 >= 0) pune(", 'selectie', 'înălțimea de zero a unei linii pusă')
o('C06', C, "dr = extrem(el, maxX, true)", "dr = el[0]!", 'selectie', 'marginea dreaptă a primului element, nu a piesei')
o('C07', C, "  return { p, a: legate ? { x: p.x", "  return { p, a: !legate ? { x: p.x", 'selectie', 'legarea pe dos')
o('C08', C, "id: idCotaNou([...cote, ...noi])", "id: idCotaNou(cote)", 'selectie', 'aceleași id-uri pentru toate cotele noi')
o('C09', C, "    const el = toate.filter((e) => e.instanta === id);", "    const el = toate;", 'selectie', 'cutia întregii foi, nu a piesei')
# Unealta și meniul (e2e).
o('E01', U, "setSerie({ s: r.stare, din: s.serie.s.mod === 'lant' ? c : s.serie.din })", "setSerie({ s: r.stare, din: s.serie.din })", 'e2e',
  'capătul legat al lanțului rămâne la prima cotă')
o('E02', U, "          if (st) setSerie({ s: st, din: s.fel === 'lant' ? b : a });", "", 'e2e', 'prima cotă nu pornește seria')
o('E03', U, "          setSerie(null);\n          setMotiv(null);\n          if (s.setari.comportament.dupa === 'selectie') s.onUnealta('selectie');",
  "          setMotiv(null);\n          if (s.setari.comportament.dupa === 'selectie') s.onUnealta('selectie');", 'e2e', 'Esc nu încheie seria')
o('E04', U, "const pasBaza = (stil: StilCota): number => 2 * stil.inaltime;", "const pasBaza = (stil: StilCota): number => stil.inaltime;", 'e2e',
  'pasul liniilor de bază, o singură înălțime')
o('E05', U, "    const capatDin = f === 'lant' ? { a: b, p: pb } : { a, p: pa };", "    const capatDin = f === 'lant' ? { a, p: pa } : { a: b, p: pb };", 'e2e',
  'lanțul din cota aleasă pleacă din primul ei capăt')
o('E06', U, "    if (cerere.mod !== 's' || CERERI_FACUTE.has(cerere)) return;", "    if (cerere.mod !== 'd' || CERERI_FACUTE.has(cerere)) return;", 'e2e',
  '„Cotează selecția” cerut, dar nefăcut')
o('E07', E, "activ: selectiePeFoaie && poate, ruleaza: () => { facut(null); pornesteCote('s'); } },",
  "activ: poate, ruleaza: () => { facut(null); pornesteCote('s'); } },", 'e2e', 'rândul activ și fără piese alese')
o('E08', U, "  const f: FelCota = p.fix ?? (fel === 'automata' || esteSerie(fel) ? (shift ? 'aliniata' : felAutomat(a.p, b.p, w)) : fel);",
  "  const f: FelCota = p.fix ?? (fel === 'automata' ? (shift ? 'aliniata' : felAutomat(a.p, b.p, w)) : fel as FelCota);", 'e2e',
  'prima cotă a seriei cu felul „lant”')

SETURI = {
    'serie': ['test/unit/cote.serie.test.ts'],
    'selectie': ['test/unit/cote.selectie.test.ts'],
}
E2E = ['test/e2e/cote.serie.spec.ts']
