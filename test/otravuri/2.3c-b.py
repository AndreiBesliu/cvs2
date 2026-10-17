# Lista de otrăvuri a feliei 2.3c, segmentul 2b (sesiune independentă, 16.10.2026): ușa SVG, documentul v10,
# aplicația, desenul și interfața (e2e). 45 rulate: 36 prinse, 9 scăpate (+ M09 doar indirect), toate închise (4 teste în
# `test/unit/otravuri.23c.test.ts`, 6 în `test/e2e/otravuri-23c.spec.ts`; DEVLOG). Se rulează cu `scripts/otravuri.py`.
# Otrăvurile 2.3c-6, segmentul 2b: ușa SVG, documentul v10, aplicația, interfața, desenul.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


SVG = 'src/io/svg.ts'

# ---- S: ușa SVG ----
o('S01', SVG,
  "  if (varfuri.every((v) => v.s.tip === 'L') && peODreapta(varfuri)) return linie();",
  "  if (false && varfuri.every((v) => v.s.tip === 'L') && peODreapta(varfuri)) return linie();",
  'svg', 'pasul (2) scos: coliniarul exact închis nu mai e linie înaintea prafului')
o('S02', SVG,
  "(inchidere ? deschisa(varfuri.slice(0, -1), cur) : deschisa(varfuri, start))",
  "(inchidere ? deschisa(varfuri.slice(0, -1), cur) : deschisa(varfuri.slice(0, -1), cur))",
  'svg', 'închisă de autor: linia fără drumul înapoi până în start')
o('S03', SVG,
  "(inchidere ? deschisa(varfuri.slice(0, -1), cur) : deschisa(varfuri, start))",
  "(inchidere ? deschisa(varfuri, start) : deschisa(varfuri, start))",
  'svg', 'închisă de ușă / umplere: linia păstrează linia de închidere (dus-întors)')
o('S04', SVG,
  "peODreapta(varfuri, REZOLUTIE / 2)) return linie();",
  "peODreapta(varfuri, REZOLUTIE)) return linie();",
  'svg', 'pasul (4): toleranța dreptei REZOLUTIE în loc de REZOLUTIE / 2')
o('S05', SVG,
  "  if (praf(varfuri)) return 'praf';\n"
  "  // (4) După praf: fără arce, toate punctele, cu mânerele, la cel mult REZOLUTIE / 2 de o dreaptă (o linie scrisă cu C / Q,\n"
  "  // cu zgomotul rotunjirii): tot o linie (recenzia A: umplută, era închisă și dispărea la normalizare).\n"
  "  if (varfuri.every((v) => v.s.tip !== 'A') && peODreapta(varfuri, REZOLUTIE / 2)) return linie();\n",
  "  if (varfuri.every((v) => v.s.tip !== 'A') && peODreapta(varfuri, REZOLUTIE / 2)) return linie();\n"
  "  if (praf(varfuri)) return 'praf';\n",
  'svg', 'ordinea: pasul (4) înaintea prafului (aproape-coliniarul sub rezoluție devine linie, nu praf)')
o('S06', SVG,
  "const puncte = v.flatMap((x) => (x.s.tip === 'C' ? [x.p, x.s.c1, x.s.c2] : [x.p]));",
  "const puncte = v.flatMap((x) => [x.p]);",
  'svg', 'peODreapta fără mânerele cubicelor (o lentilă cu vârfurile pe o dreaptă devine linie)')
o('S07', SVG,
  "const a = toleranta > 0 ? departe(a0) : a0;",
  "const a = a0;",
  'svg', 'peODreapta: dreapta prin primul punct, nu prin cele mai depărtate două')
o('S08', SVG,
  "const c = cutieContur({ inchis: true, varfuri });",
  "const c = cutieContur({ inchis: true, varfuri: varfuri.map((v) => ({ p: v.p, s: LINIE })) });",
  'svg', 'praful pe cutia vârfurilor, nu pe cutia exactă (arcele fără extreme)')
o('S09', SVG,
  "if (!umplut && gol > REZOLUTIE) return deschisa(varfuri, cur);",
  "if (!umplut && gol > 0.1) return deschisa(varfuri, cur);",
  'svg', 'pragul golului închis la ușă: 0,1 mm în loc de 0,01')
o('S10', SVG,
  "peODreapta(varfuri, REZOLUTIE / 2)) return linie();",
  "peODreapta(varfuri, REZOLUTIE / 2)) { if (inchidere === 'umplere') n['inchise-de-umplere']++; return linie(); }",
  'svg', 'linia de la pasul (4) numărată și la inchise-de-umplere')
o('S11', SVG,
  "if (!umplut && gol > REZOLUTIE) return deschisa(varfuri, cur);",
  "if (gol > REZOLUTIE) return deschisa(varfuri, cur);",
  'svg', 'umplerea ignorată: o formă umplută fără Z rămâne deschisă')
o('S12', SVG,
  "  if (v.length > PLAFON.varfuriCale) return 'prea-mare';\n  const p0 = capat;",
  "  if (varfuri.length > PLAFON.varfuriCale) return 'prea-mare';\n  const p0 = capat;",
  'svg', 'plafonul căii deschise fără vârful final')
o('S13', SVG,
  "    } else l += lungimeCubica(a.p, a.s.c1, a.s.c2, b, REZOLUTIE - l, 0);",
  "    } else l += coarda;",
  'svg', 'lungimea cubicei pe coardă, nu pe curbă (degenerata judecată greșit)')
o('S14', SVG,
  "departe = cai.some((c) => c.varfuri.some((v) => [v.p, ...(v.s.tip === 'C' ? [v.s.c1, v.s.c2] : [])]",
  "departe = cai.some((c) => c.varfuri.some((v) => [v.p]",
  'svg', '`departe` pe coordonatele piesei fără mânerele cubicelor')
o('S15', SVG,
  "        if (r.cai.length === 0) n.degenerate++;\n",
  "        // golită: nenumărată\n",
  'svg', 'forma nonzero golită de normalizare nu mai e numărată la degenerate')
o('S16', SVG,
  "          if (!praf(v)) return true;",
  "          return true;",
  'svg', 'praful pe ieșirea normalizării nonzero păstrat')
o('S17', SVG,
  "        if (v === 'degenerata') {\n          n.degenerate++;",
  "        if (v === 'degenerata') {\n          n.degenerate++;\n          n.deschise++;",
  'svg', 'degeneratele sărite numărate și la `deschise`')
o('S18', SVG,
  "  if (cai.length === 0) return { ok: false, cod: 'gol', avertismente: n };",
  "  if (!cai.some((c) => c.inchis)) return { ok: false, cod: 'gol', avertismente: n };",
  'svg', '`gol` = nicio cale ÎNCHISĂ (un fișier doar din linii refuzat)')
o('S19', SVG,
  "finale = [...iesire.map((varfuri) => ({ varfuri, inchis: true })), ...f.cai.filter((c) => !c.inchis)];",
  "finale = iesire.map((varfuri) => ({ varfuri, inchis: true }));",
  'svg', 'forma nonzero schimbată pierde căile ei deschise')
o('S20', 'src/io/imbricare.ts',
  "      if (!c.inchis) return 'pe-linie';\n",
  "",
  'svg', 'imbricarea dă exterior / interior și căilor deschise')
o('S21', 'src/io/piesa.ts',
  "      tip: 'cale',\n      inchis: caleInchisa(c),",
  "      tip: 'cale',\n      inchis: true,",
  'svg', 'piesa importului scrie inchis: true pe orice cale')
o('S22', 'src/io/piesa.ts',
  "return grosime === undefined ? 1 : Math.min(1, grosime / 2);",
  "return grosime === undefined ? 1 : Math.min(1, grosime);",
  'svg', 'adâncimea căilor deschise min(1, grosimea) în loc de min(1, grosimea / 2)')

# ---- M: documentul v10 ----
# Schemele documentului stau, din 17.10 (loc în pachetul de pornire), în modulul lor, mutate neschimbate.
DOC = 'src/model/schemaDocument.ts'
INC = 'src/model/incarcare.ts'
o('M01', DOC,
  "v.check((f) => f.inchis || f.varfuri[f.varfuri.length - 1]?.s.tip === 'L',",
  "v.check((f) => true || f.varfuri[f.varfuri.length - 1]?.s.tip === 'L',",
  'doc', 'regula „ultimul segment L” al căii deschise scoasă')
o('M02', DOC,
  "    inchis: v.boolean(),\n",
  "    inchis: v.optional(v.boolean()),\n",
  'doc', '`inchis` opțional (lipsa lui trece de ușă)')
o('M03', DOC,
  "  despartire: v.optional(v.boolean()),",
  "  despartire: v.optional(v.unknown()),",
  'doc', '`despartire` de orice tip trece de ușă')
o('M04', INC,
  "(forma as Brut)['tip'] === 'cale' && (forma as Brut)['inchis'] !== true) {",
  "(forma as Brut)['tip'] === 'cale' && false) {",
  'doc', 'migrarea v9 → v10 primește o cale deschisă')
o('M05', INC,
  "(forma as Brut)['tip'] === 'cale' && (forma as Brut)['inchis'] !== true) {",
  "(forma as Brut)['tip'] === 'cale' && (forma as Brut)['inchis'] === false) {",
  'doc', 'migrarea v9 → v10 refuză doar inchis === false (nu și lipsa / altă valoare)')
o('M06', INC,
  "if (op['latura'] === 'stanga' || op['latura'] === 'dreapta') {",
  "if (op['latura'] === 'stanga') {",
  'doc', 'migrarea v9 → v10 primește latura dreapta')
o('M07', INC,
  "if (Object.hasOwn(op, 'despartire')) {",
  "if (op['despartire'] === true) {",
  'doc', 'migrarea v9 → v10 primește despartire: false')
o('M08', INC,
  "      if (n['tip'] === 'grup' && Array.isArray(n['copii'])) for (const c of n['copii']) stiva.push(c);\n    }\n    for (const o of",
  "    }\n    for (const o of",
  'doc', 'migrarea v9 → v10 nu coboară în grupuri (calea deschisă dintr-un grup trece)')
o('M09', 'src/model/lume.ts',
  "stanga: 1, dreapta: 1, exterior: 2 };",
  "stanga: 1, dreapta: 2, exterior: 2 };",
  'lume', 'ordinea: tăieturile pe dreapta nemarcate în clasa exterioarelor')
o('M10', 'src/model/forme.ts',
  ": { inchis: f.inchis, varfuri: f.varfuri.map(",
  ": { inchis: true, varfuri: f.varfuri.map(",
  'forme', 'conturElement închide orice cale')
o('M11', 'src/model/jsonCanonic.ts',
  "Object.keys(o).filter((k) => o[k] !== undefined).sort()",
  "Object.keys(o).sort()",
  'json', 'JSON-ul canonic scrie și cheile cu valoarea undefined')

# ---- A: aplicația (unitar) ----
VO = 'src/app/valoriOperatii.ts'
o('A01', VO,
  "const despartire = v?.despartire ?? o.despartire;",
  "const despartire = v?.despartire || o.despartire;",
  'app', 'despărțirea debifată în dialog nu scoate marcajul din document')
o('A02', VO,
  "const { despartire: _vechi, ...rest } = {",
  "const _vechi = undefined, rest = {",
  'app', 'despărțirea nebifată rămâne ca despartire: false (câmpul nu pleacă)')
o('A03', 'src/app/config.ts',
  "{ cache: 'no-store', signal: AbortSignal.timeout(TERMEN_CONFIG_MS) }",
  "{ cache: 'no-store' }",
  'app', 'config.json fără termen (cererea agățată ține pornirea)')

# ---- W: desenul ----
o('W01', 'src/app/desen.ts',
  "const d = !c.inchis && p && parte ? directiaDeStart(c) : null;",
  "const d = p && parte ? directiaDeStart(c) : null;",
  'desen', 'săgeata apare și pe un contur închis cu latura stânga / dreapta')
o('W02', 'src/app/desen.ts',
  "if ((t.latura === 'stanga' || t.latura === 'dreapta') && !parti.has(t.idLume)) {",
  "if (t.latura !== 'exterior' && t.latura !== 'interior' && !parti.has(t.idLume)) {",
  'desen', 'săgeata apare și pe linie')

# ---- E: doar e2e (interfața și pornirea) ----
APP = 'src/app/App.tsx'
# Rândurile dialogului de export stau, din 17.10 (loc în pachetul de pornire), în dialogul legat de document.
EXP = 'src/app/ExportConectat.tsx'
PL = 'src/app/proiectLocal.ts'
o('E01', PL,
  "    return { mod: 'necitit-acum', motiv: `ușa de încărcare nu s-a putut aduce",
  "    return { mod: 'fara-memorie', motiv: `ușa de încărcare nu s-a putut aduce",
  'e2e', 'ușa care nu vine la deschidere: „fără memorie” în loc de „necitit acum”')
o('E02', PL,
  "        try {\n          const v = await citeste(db);\n          const r = await documentDin(v, usaLaCerere);\n          return r.ok ? { ok: true, v, doc: r.doc } : r;\n        } catch (e) {",
  "        try {\n          const v = await citeste(db);\n          const r = await documentDin(v, usaLaCerere);\n          return r.ok ? { ok: true, v, doc: r.doc } : r;\n        } finally { /* fără prindere */ }\n        try { /* */ } catch (e) {",
  'e2e', '`reciteste` nu mai prinde eroarea ușii (fila care citește tace)')
o('E03', APP,
  "if (!fisiere[0] || doarCiteste(mod)) return;",
  "if (!fisiere[0]) return;",
  'e2e', 'garda doar-citire scoasă din pornesteImport (lăsarea pe planșă deschide dialogul)')
o('E04', EXP,
  "        noduri: o.noduri.length,\n",
  "        noduri: 1,\n",
  'e2e', 'rândul dialogului crede că are un singur nod: stânga / dreapta oferite pe mai multe căi')
o('E05', EXP,
  "          ...(o.despartire ? { despartire: true } : {}),\n",
  "",
  'e2e', 'marcajul despărțirii din document nu ajunge în dialog (Exportă îl scoate)')
o('E06', 'src/ui/DialogExport.tsx',
  "data-camp=\"despartire\" disabled={doarCitire || !deschis}",
  "data-camp=\"despartire\" disabled={doarCitire}",
  'e2e', 'bifa despărțirii activă și pe rândurile închise')
o('E07', 'src/ui/DialogImport.tsx',
  "onClick={(e) => { if (e.detail <= 1) onImporta(); }}",
  "onClick={() => { onImporta(); }}",
  'e2e', 'dublu-clicul pe Importă importă două fișiere din coadă')


# ---- Seturile (din harnașul segmentului 2b) ----
import glob  # noqa: E402


def u(*nume):
    return ['test/unit/%s.test.ts' % n for n in nume]

# Seturile segmentului 2b (zona: ușa SVG, documentul v10, aplicația, desenul). „X2” = a doua șansă, mai largă.
SVG = u('svg', 'svg.oracol', 'svg.constatari.oracol', 'import.deschise', 'import.actiuni')
SVG2 = sorted(set(SVG + u('svg.aleator.oracol', 'svg.buget.oracol', 'svg.mari.oracol', 'svg.reale.oracol', 'nonzero.oracol',
                          'geom.nonzero', 'document.v10', 'document.v10.oracol', 'deschise.aplicatie.oracol')))
DOC = u('document.v10', 'document.v10.oracol', 'document.v9.oracol', 'document.v9.actiuni.oracol', 'document.oracol', 'model',
        'cale', 'cale.recenzie')
DOC2 = sorted(set(DOC + glob.glob('test/unit/document.*.test.ts') + u('actiuni', 'svg', 'import.deschise', 'svg.oracol',
                  'svg.mari.oracol', 'deschise.aplicatie.oracol', 'parte.aplicatie.oracol', 'cale.cam.oracol', 'job', 'cam.deschise')))
LUME = u('cam.deschise', 'job', 'otravuri.23c', 'document.v10', 'document.v10.oracol', 'cam.regiune', 'actiuni.export',
         'export.calcul')
LUME2 = sorted(set(LUME + glob.glob('test/unit/document.*.test.ts') + u('actiuni', 'model', 'import.actiuni', 'cam.parte',
                   'deschise.aplicatie.oracol', 'deschise.oracol', 'parte.aplicatie.oracol', 'parte.oracol', 'poarta-cale.oracol',
                   'regiune.oracol', 'sens.oracol')))
FORME = u('desen', 'import.deschise', 'cam.deschise', 'job', 'document.v10', 'cale', 'cam.cale', 'cam.parte')
JSON_ = u('model', 'actiuni', 'document.oracol', 'document.v10.oracol', 'cale.recenzie', 'document.lipire.oracol')
JSON2 = sorted(set(JSON_ + glob.glob('test/unit/document.*.test.ts')))
APP = u('actiuni', 'config', 'actiuni.export')
APP2 = sorted(set(APP + u('import.actiuni', 'export.calcul', 'cam.deschise', 'mediu')))
DESEN = u('desen', 'import.deschise', 'cale', 'cale.recenzie')
SETURI = {'svg': SVG, 'svg2': SVG2, 'doc': DOC, 'doc2': DOC2, 'lume': LUME, 'lume2': LUME2, 'forme': FORME, 'forme2': LUME2,
          'json': JSON_, 'json2': JSON2, 'app': APP, 'app2': APP2, 'desen': DESEN, 'desen2': sorted(set(DESEN + SVG2))}
E2E = ['test/e2e/recenzia-a.spec.ts', 'test/e2e/import.spec.ts', 'test/e2e/proiect.spec.ts', 'test/e2e/export.spec.ts',
       'test/e2e/otravuri-23c.spec.ts']
