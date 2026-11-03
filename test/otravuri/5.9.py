# Lista de otrăvuri a feliei 5.9↑ (ordinea de mână a operațiilor, ADR 0133), 03.11.2026, alese de autor: ordinea lucrării
# (rangurile ignorate, cele fără rang întâi, egalitățile inversate, rangul pierdut pe tăietură), locul piesei la rol, rolul
# personalizat, ușa v19 și migrarea, logica ferestrei (ordinea de la deschidere, mutarea, legăturile, riscurile, cuprinderea)
# și, prin e2e, legătura ferestrei cu documentul (rangurile scrise și scoase, ordinea automată, riscul, bifa, tragerea).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit; cele „e2e” cer
# build-ul (vite și Playwright prin `node`, cu `.tmp/pw.config.ts`).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


LU = 'src/model/lume.ts'
OR = 'src/model/ordine.ts'
RP = 'src/model/rolPersonal.ts'
MG = 'src/model/migrari.ts'
SD = 'src/model/schemaDocument.ts'
OE = 'src/ui/ordineExport.ts'
EC = 'src/app/ExportConectat.tsx'
DE = 'src/ui/DialogExport.tsx'

# Ordinea lucrării (ADR 0133 §2).
o('R01', LU, '  if (!automata.some((t) => t.rang !== undefined)) return automata;', '  if (true) return automata;', 'ordine',
  'rangurile ignorate: mereu ordinea automată')
o('R02', LU, 'const loc = (t: Taietura): number => t.rang ?? Number.POSITIVE_INFINITY;', 'const loc = (t: Taietura): number => t.rang ?? -1;',
  'ordine', 'operațiile fără rang vin întâi, nu la capăt')
o('R03', LU, '.sort((a, b) => (loc(a.t) === loc(b.t) ? a.i - b.i :', '.sort((a, b) => (loc(a.t) === loc(b.t) ? b.i - a.i :', 'ordine',
  'pe ranguri egale, ordinea automată inversată')
o('R04', LU, '          ...(o.rang !== undefined ? { rang: o.rang } : {}),\n', '', 'ordine', 'tăietura nu primește rangul operației')
# Locul piesei la rol (ADR 0133 §4) și rolul personalizat.
o('R05', OR, 'const minim = ranguri.reduce((a, b) => Math.min(a, b));', 'const minim = ranguri.reduce((a, b) => Math.max(a, b));', 'ordine',
  'operația nouă primește cel mai mare rang al piesei')
o('R06', OR, 'rang: dupaId.get(o.id) ?? minim', 'rang: minim', 'ordine', 'operația cu același id nu-și păstrează rangul')
o('R07', OR, 'if (ranguri.length === 0) return [...noi];', 'if (ranguri.length === 0) return noi.map((o) => ({ ...o, rang: 0 }));', 'ordine',
  'piesa fără rang primește ranguri (foaia trece pe ordinea de mână)')
o('R08', RP, '  const { despartire: _d, rang: _r, ...v } = o;', '  const { despartire: _d, ...v } = o;', 'ordine', 'rolul personalizat ține rangul')
# Ușa v19 și migrarea (ADR 0133 §1).
o('D01', MG, "if (typeof o === 'object' && o !== null && Object.hasOwn(o, 'rang')) {", 'if (false) {', 'document',
  'un v18 cu `rang` propriu trece de migrare')
o('D02', SD, 'v.minValue(0), v.maxValue(PLAFON.operatii))),', 'v.minValue(0))),', 'document', 'rangul fără plafon')
o('D03', SD, 'rang: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0),', 'rang: v.optional(v.pipe(v.number(), v.minValue(0),', 'document',
  'rangul neîntreg primit')
o('D04', SD, 'rang: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0),', 'rang: v.optional(v.pipe(v.number(), v.integer(), v.minValue(-1),',
  'document', 'rangul −1 primit')
# Logica ferestrei (ADR 0133 §3), pură.
o('X01', OE, '  return [...rez, ...chei.filter((c) => !puse.has(c))];', '  return rez;', 'ordine', 'rândurile fără tăieturi pe foaie dispar')
o('X02', OE, '  if (ranguri.size === 0) return null;', '  if (ranguri.size === 0) return [...automata];', 'ordine',
  'fără ranguri, fereastra pornește în ordinea de mână')
o('X03', OE, '  rez.splice(la, 0, x as string);', '  rez.splice(de, 0, x as string);', 'ordine', 'mutarea pune rândul înapoi pe locul lui')
o('X04', OE, '    const k = `${r.piesa}\\n${r.vcarve}`;', '    const k = r.vcarve;', 'ordine', 'V-carve-uri legate peste piese')
o('X05', OE, '    if (p === undefined) primul.set(k, i + 1);', '    if (p === undefined) primul.set(k, i);', 'ordine', '„cu N” cu locul greșit')
o('X06', OE, '    if (despartire !== null && !r.despartire && !despartireSpusa) {', '    if (false) {', 'ordine', 'despărțirea întâi nu e un risc')
o('X07', OE, '      if (!exterior.has(r.piesa)) exterior.set(r.piesa, loc);\n', '', 'ordine', 'exteriorul aceleiași piese nu e un risc')
o('X08', OE, '      for (const k of r.inauntru ?? []) cuprinsDe.set(k, [...(cuprinsDe.get(k) ?? []), { piesa: r.piesa, loc }]);\n', '', 'ordine',
  'exteriorul altei piese, care cuprinde rândul, nu e un risc')
o('X09', OE, '      if (spuse.has(s.piesa)) continue;\n', '', 'ordine', 'mai multe riscuri pe aceeași piesă')
o('X10', OR, 'if (x.piesa === r.piesa || gasite.has(x.cheie)', 'if (gasite.has(x.cheie)', 'ordine', 'cuprinderea numără și aceeași piesă')
o('X11', OR, '        if (inRegiune(x.p, [c])) gasite.add(x.cheie);', '        if (inRegiune(x.p, r.contururi)) gasite.add(x.cheie);', 'ordine',
  'cuprinderea par-impar: ce stă într-o gaură nu e cuprins')
o('X12', OR, '        if (!x || x.p.x > k.maxX) break;', '        if (!x || x.p.x > k.minX) break;', 'ordine', 'fâșia cutiei tăiată la stânga')
o('X13', OR, '        if (ramas < 0) return rez;\n', '', 'ordine', 'bugetul cuprinderii ignorat')
# Legătura ferestrei cu documentul, prin e2e.
o('E01', EC, '        return r !== undefined ? { ...faraRang, rang: r } : faraRang;', '        return faraRang;', 'e2e', 'Exportă nu scrie rangurile')
o('E02', EC, 'const loc = c.ordine ? new Map(c.ordine.map((k, i) => [k, i])) : null;',
  'const loc = c.ordine ? new Map([...c.ordine].reverse().map((k, i) => [k, i])) : null;', 'e2e', 'rangurile scrise în ordinea inversă')
o('E03', EC, '        const { rang: _rang, ...faraRang } = operatieDinDialog(o, v, v?.scula ?? o.scula);\n        void _rang;\n',
  '        const faraRang = operatieDinDialog(o, v, v?.scula ?? o.scula);\n', 'e2e', 'Automată nu scoate rangurile vechi')
o('E04', EC, 'automata: [...new Set(grupeazaPeScula(taieturiFoaie(doc, 0)).map((x) => `${x.piesa}/${x.operatie}`))],', 'automata: [],', 'e2e',
  'ordinea automată arătată e cea a listei, nu a lucrării')
o('E05', EC, '        ...(cuprinseOp ? { inauntru: cuprinseOp } : {}),\n', '', 'e2e', 'cuprinderea nu ajunge în fereastră')
o('E06', DE, '    setRiscAcceptat(false);\n    setOrdineMea(muta(ordineMea, de, la));', '    setOrdineMea(muta(ordineMea, de, la));', 'e2e',
  'mutarea nu șterge bifa riscului')
o('E07', DE, ' || (riscuriOrdine.length > 0 && !riscAcceptat)} data-buton="exporta"', '} data-buton="exporta"', 'e2e',
  'Exportă nu cere bifa riscului')
o('E08', DE, "latura: profil ? p.latura : 'interior'", 'latura: p.latura', 'e2e', 'V-carve-ul pe un rând de exterior rămâne exterior')
o('E09', DE, 'mutaRand(ordine.indexOf(tras), loc); setTras(null);', 'setTras(null);', 'e2e', 'lăsarea rândului tras nu mută nimic')
o('E10', DE, 'const [ordineMea, setOrdineMea] = useState<string[] | null>(dinRanguri);', 'const [ordineMea, setOrdineMea] = useState<string[] | null>(null);',
  'e2e', 'fereastra redeschisă nu arată ordinea scrisă')
o('E11', DE, 'setOrdineMea(aMea ? [...automata] : null);', 'setOrdineMea(aMea ? [...automata].reverse() : null);', 'e2e',
  '„A mea” nu pornește din ordinea automată')
o('E12', DE, 'const legate = legaturi(ordine, randuriOrdine);', 'const legate = new Map<string, number>();', 'e2e', '„cu N” lipsește')


SETURI = {
    'ordine': ['test/unit/ordine.test.ts', 'test/unit/ordineExport.test.ts'],
    'ordine2': ['test/unit/ordine.test.ts', 'test/unit/ordineExport.test.ts', 'test/unit/rol.test.ts', 'test/unit/rolPersonal.test.ts'],
    'document': ['test/unit/document.v19.oracol.test.ts'],
    'document2': ['test/unit/document.v19.oracol.test.ts', 'test/unit/documente.aur.test.ts', 'test/unit/document.oracol.test.ts'],
}
E2E = ['test/e2e/export.spec.ts']
