# Lista de otrăvuri a feliei 3.6l (piesa „după CNC” și înălțimea fiecărei piese, ADR 0191), 08.11.2026, alese de autor: felul
# straturilor cu trepte (benzile, plinul de jos și de sus, cheile, Z-ul), booleanele cu cutia, capsulele frezei, benzile unei piese
# (unirea, vârful tăiat, filtrul), citirea „după CNC” (inelele prin tot, marginile, golurile, adâncimile, buzunarele cu insule,
# raza, oglindirea, freza în V), șablonul pe benzi (părțile unui strat, pereții și regiunile pe bandă, călcarea, ce nu iese,
# concentricul), deplasările pe conturul benzii, înălțimea în proiect (comanda, schema), plus dialogul (prin e2e).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


FE = 'src/cam/feliere/fel.ts'
TR = 'src/cam/feliere/trepte.ts'
DC = 'src/cam/feliere/dupaCnc.ts'
ST = 'src/cam/feliere/straturi.ts'
GC = 'src/cam/feliere/gcode.ts'
PI = 'src/cam/feliere/piese.ts'
IN = 'src/model/inaltimeImprimanta.ts'
SD = 'src/model/schemaDocument.ts'
DD = 'src/app/DialogDinDesen.tsx'
AP = 'src/app/App.tsx'
PA = 'src/app/PanouImprimanta.tsx'

# Felul straturilor cu trepte.
o('F01', FE, 'const b = banda(k), b1 = k >= n ? -1 : banda(k + 1);', 'const b = banda(k), b1 = k >= n ? -1 : banda(k);', 'trepte',
  'fața unei trepte nu se mai vede (stratul de deasupra luat din aceeași bandă)')
o('F02', FE, 'const bs = k <= s.jos || s.umplere >= 0.999 || k + sus > n ? -1 : banda(k + sus);',
  'const bs = s.umplere >= 0.999 || k + sus > n ? -1 : banda(k + sus);', 'trepte', 'plinul de jos uitat la piesele cu trepte')
o('F03', FE, 'k + sus > n ? -1 : banda(k + sus);', 'k + sus >= n ? -1 : banda(k + sus);', 'trepte', 'un strat plin de sus în plus')
o('F04', FE, "const zRar = areRar && DEPINDE_DE_Z.has(s.modelRar) ? zStrat(k, s).toFixed(4) : '';", "const zRar = '';", 'trepte',
  'modelele 3D fără Z în cheia straturilor cu trepte')
o('F05', FE, "const uPlin = arePlin || areRar ? String(unghiModel(s.modelPlin, k, s.unghiPlin)) : '';",
  "const uPlin = arePlin ? String(unghiModel(s.modelPlin, k, s.unghiPlin)) : '';", 'trepte',
  'insulele rare prea mici, fără unghiul plinului (cheia)')
o('F06', FE, "const tip: TipStrat = t.b1 === -1 ? 'sus' :", "const tip: TipStrat = t.b1 === -1 && t.b === 0 ? 'sus' :", 'trepte',
  'fața de sus a unei piese cu trepte citită ca strat amestecat')
# Booleanele și capsulele.
o('T01', TR, '  const m = 10 * k;\n  return iesire.filter', '  const m = 10 * k + 1;\n  return iesire.filter', 'trepte', 'cutia rămâne în rezultat')
o('T02', TR, '      for (const c of o) intrare.push(inverseaza(c));', '      for (const c of o) intrare.push(c);', 'trepte',
  'complementul fără contururile inversate')
o('T03', TR, 'return a[i]! % 2 === 0 ? t : inverseaza(t); });', 'return t; });', 'trepte', 'figura neorientată după adâncime (golurile umplute)')
o('T04', TR, "{ p: { x: b.x - nx, y: b.y - ny }, s: { tip: 'A', bulge: 1 } },", "{ p: { x: b.x - nx, y: b.y - ny }, s: { tip: 'A', bulge: -1 } },", 'trepte',
  'capătul capsulei unei linii întors înăuntru')
o('T05', TR, '      if (R - r > 1e-6) {', '      if (R > 1e-6) {', 'trepte', 'un arc mai strâns decât freza, tot ca sector de inel')
o('T06', TR, "const [p, q, beta] = s.bulge > 0 ? [a, b, s.bulge] : [b, a, -s.bulge];", 'const [p, q, beta] = [a, b, Math.abs(s.bulge)];', 'trepte',
  'un arc orar luat ca trigonometric (alt arc)')
o('T07', TR, '    if (arieJos - a < ARIE_NEGLIJABILA) continue;\n', '', 'trepte', 'o treaptă fără efect face o bandă')
o('T08', TR, '    if (a < ARIE_NEGLIJABILA) return { regiuni, inceput, n: m };', '    if (a < ARIE_NEGLIJABILA) return { regiuni, inceput, n };', 'trepte',
  'o treaptă peste toată piesa n-o mai oprește')
o('T09', TR, '.filter((x) => x.n < n && x.t.contururi.length > 0);', '.filter((x) => x.n <= n && x.t.contururi.length > 0);', 'trepte',
  'o treaptă cât piesa de înaltă face o bandă')
o('T10', TR, 'const ARIE_NEGLIJABILA = 0.01;', 'const ARIE_NEGLIJABILA = 100;', 'trepte', 'treptele mici (o găurire) înghițite')
# Citirea „după CNC”.
o('D01', DC, 'const prinTot = (d: number): boolean => d >= G - EPS || H - d <= EPS;', 'const prinTot = (d: number): boolean => d >= G - EPS;', 'trepte',
  'mai adânc decât înălțimea (dar nu cât foaia), tot treaptă')
o('D02', DC, 'const prinTot = (d: number): boolean => d >= G - EPS ||', 'const prinTot = (d: number): boolean => d >= G + 2 ||', 'trepte',
  'o găurire prin tot (puțin peste foaie) luată ca treaptă')
o('D03', DC, "t.tip === 'profil' && (t.latura === 'exterior' || t.latura === 'interior') && t.adancime >= G - EPS && !t.scula.forma;",
  "t.tip === 'profil' && (t.latura === 'exterior' || t.latura === 'interior') && !t.scula.forma;", 'trepte',
  'un profil parțial pe exterior luat ca margine')
o('D04', DC, "const margini = inele.filter((x) => (x.rol === 'piesa') !== (x.parinte !== null && inele[x.parinte]?.rol === 'piesa'));",
  "const margini = inele.filter((x) => x.rol === 'piesa');", 'trepte', 'golurile din profilele interioare prin tot pierdute')
o('D05', DC, '  for (const [d, c] of buzunare) adauga(dupaAdancime(c), d);', '  for (const [d, c] of buzunare) adauga(c, d);', 'trepte',
  'insula unui buzunar coborâtă și ea')
o('D06', DC, 'capsule(c, t.scula.diametru / 2)', 'capsule(c, t.scula.diametru)', 'trepte', 'canelura de două ori mai lată')
o('D07', DC, "if (t.tip === 'vcarve' || t.scula.forma) { vcarve++; continue; }", "if (t.tip === 'vcarve') { vcarve++; continue; }", 'trepte',
  'o gravură cu freza în V luată ca treaptă')
o('D08', DC, 'oglindit: oglindeste(t.matrice),', 'oglindit: false,', 'trepte', 'pe o piesă oglindită, banda pe partea greșită')
o('D09', DC, '  if (gauri.length > 0) {', '  if (false) {', 'trepte', 'golurile prin tot nu se scad')
o('D10', DC, 'trepte.push({ contururi: c, inaltime: H - d });', 'trepte.push({ contururi: c, inaltime: G - d });', 'trepte',
  'adâncimile măsurate de la foaie, nu de sus (la altă înălțime)')
# Șablonul pe benzi.
o('S01', ST, "    if (b1 !== b) parti.push({ rol: 'sus',", "    if (false) parti.push({ rol: 'sus',", 'trepte', 'fața treptei lipsește')
o('S02', ST, "cheie: `s${b1}`, termeni: [{ c: R(b1) }] });", 'cheie: `s${b1}`, termeni: [] });', 'trepte', 'fața treptei peste tot stratul')
o('S03', ST, 'termeni: [{ c: R(b1), compl: true }, ...(bs >= 0 ? [{ c: R(bs) }] : [])],', 'termeni: [{ c: R(b1), compl: true }],', 'trepte',
  'plinul de sub fața treptei peste toată banda')
o('S04', ST, "cheie: `r${bs}`, termeni: [{ c: R(bs), compl: true }] });", 'cheie: `r${bs}`, termeni: [] });', 'trepte', 'umplerea rară și în treaptă')
o('S05', ST, '    const { b, b1, bs } = t;\n    const pr = pereti(b, h, false);', '    const { b, b1, bs } = t;\n    const pr = pereti(0, h, false);', 'trepte',
  'un strat amestecat de sus, cu pereții primei benzi')
o('S06', ST, '      const r = regiuniLa(b, pr.adanc[i]! - suprapunere * w);', '      const r = regiuniLa(0, pr.adanc[i]! - suprapunere * w);', 'trepte',
  'umplerea unei benzi de sus, cu regiunea primei benzi')
o('S07', ST, 'const k = `${b}:${d.toFixed(6)}`;', 'const k = `${d.toFixed(6)}`;', 'trepte', 'regiunile benzilor amestecate în memorie')
o('S08', ST, 'const k = `${b}:${prim}`;', 'const k = `${prim}`;', 'trepte', 'pereții benzilor amestecați în memorie')
o('S09', ST, "if (s.calcare === 'sus') return t.b1 !== t.b ? t.b1 : null;", "if (s.calcare === 'sus') return t.b1 !== t.b ? -1 : null;", 'trepte',
  'călcarea feței treptei peste tot stratul')
o('S10', ST, "if (s.calcare === 'ultima') return t.b1 === -1 ? -1 : null;", "if (s.calcare === 'ultima') return t.b1 !== t.b ? -1 : null;", 'trepte',
  '„doar cea mai de sus” calcă și treptele')
o('S11', ST, "if (s.calcare === 'plin') return t.bs === -1 ? -1 : t.bs !== t.b ? t.bs : null;", "if (s.calcare === 'plin') return t.bs === -1 ? -1 : null;",
  'trepte', '„toate straturile pline” uită plinul de sub o treaptă')
o('S12', ST, '  benzi.forEach((bc, b) => {\n    const total', '  benzi.slice(0, 1).forEach((bc, b) => {\n    const total', 'trepte',
  'ce nu iese, judecat doar pe prima bandă')
o('S13', ST, 'concentriceFigura(gc, sp / 2, sp / d, rc, wc);', 'concentriceFigura(gc, 0, sp / d, rc, wc);', 'trepte',
  'fața concentrică a treptei pornește peste pereți')
# Deplasările, piesele, înălțimea în proiect.
o('G01', GC, 'iesePeste(w.x, w.y, x, y, sab.benzi[bandaFel(fel)] ?? sab.contur)', 'iesePeste(w.x, w.y, x, y, sab.contur)', 'trepte',
  'deplasările peste golul unei trepte, fără retragere')
o('G02', GC, "piese: ordini.flatMap((o, i) => (k <= o.length ? [{ i, fel: o[k - 1]! }] : [])),",
  "piese: ordini.flatMap((o, i) => (k <= o.length ? [{ i, fel: o[0]! }] : [])),", 'trepte', 'planul cu felul primului strat peste tot')
o('P01', PI, '    const H = opt.inaltimi?.get(inst.piesa) ?? inaltime;', '    const H = inaltime;', 'trepte', 'înălțimea fiecărei piese ignorată')
o('P02', PI, 'contururi: t.contururi.map((c) => muta(c, dx, dy)) }', 'contururi: t.contururi }', 'trepte', 'treptele necentrate odată cu piesa')
o('P03', PI, '...(f.detaliu === undefined ? {} : { detaliu: f.detaliu })', '...({})', 'trepte', 'refuzul „după CNC” fără motiv')
o('P04', PI, '      vcarve += f.vcarve;\n', '', 'trepte', 'V-carve-ul nenumărat')
o('H01', IN, '    if ((vechi.inaltimeImprimanta ?? null) === h) continue;\n', '', 'trepte', 'o comandă fără nimic de schimbat')
o('H02', IN, 'if (!vechi || (h !== null && !(Number.isFinite(h) && h > 0))) continue;', 'if (!vechi || (h !== null && !Number.isFinite(h))) continue;',
  'trepte', 'o înălțime negativă scrisă în proiect')
o('H03', IN, '      nou = rest;', '      nou = { ...vechi };', 'trepte', 'înălțimea nu se scoate')
o('H04', IN, "return comenzi.length === 1 ? comenzi[0]! : { tip: 'lot', comenzi };", 'return comenzi[0]!;', 'trepte', 'doar prima piesă scrisă')
o('K01', SD, ', inaltimeImprimanta: v.optional(pozitiv(PLAFON.grosime)),', ',', 'trepte', 'schema primește orice înălțime')
# Dialogul (prin e2e).
o('E01', DD, '    dupaCnc: alegeri.dupaCnc,', '    dupaCnc: false,', 'e2e', 'bifa „După CNC” fără efect')
o('E02', DD, "...(alegeri.inaltimi === 'piese' ? { inaltimi: new Map(pieseAlese.map((p) => [p.id, p.h ?? inaltime])) } : {}),", '...({}),', 'e2e',
  'înălțimea fiecărei piese, nefolosită')
o('E03', DD, 'scrieInaltimi?.(new Map([[p.id, Math.min(K1C.pat[2], Math.max(0.2, v))]]));', 'scrieInaltimi?.(new Map());', 'e2e',
  'rândul unei piese nu scrie în proiect')
o('E04', DD, '  useEffect(() => { scrieAlegeri(alegeri); }, [alegeri]);\n', '', 'e2e', 'alegerile dialogului uitate la redeschidere')
o('E05', DD, '...(tr && tr.uSus !== null ? [textSus(tr.uSus)] : []),', '...([]),', 'e2e', 'stratul cu treaptă nu-și spune fața')
o('E06', AP, 'const scrieInaltimiImprimanta = doarCiteste(mod) ? null :', 'const scrieInaltimiImprimanta = true ? null :', 'e2e',
  'înălțimea nu se poate scrie niciodată')
o('E07', PA, '            scrieInaltimi={scrieInaltimi ?? null}', '            scrieInaltimi={null}', 'e2e', 'fereastra nu dă scrierea dialogului')
o('E08', DD, "const hCerut = alegeri.inaltimi === 'piese' && alese.piese.length > 0 ? Math.max(...alese.piese.map((p) => p.inaltime)) : inaltime;",
  'const hCerut = inaltime;', 'e2e', 'nota „Piesa iese de … mm” față de înălțimea pentru toate')

SETURI = {
    'trepte': ['test/unit/imprimanta.feliere.trepte.test.ts'],
    'trepte2': ['test/unit/imprimanta.feliere.trepte.test.ts', 'test/unit/imprimanta.feliere.test.ts', 'test/unit/imprimanta.feliere.recenzie.test.ts',
                'test/unit/imprimanta.feliere.modele.test.ts'],
}
E2E = ['test/e2e/imprimanta.spec.ts']
