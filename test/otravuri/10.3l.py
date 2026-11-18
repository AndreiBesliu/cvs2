# Lista de otrăvuri a feliei 10.3↑l (panourile pe foi; ADR 0181 §7), 17.11.2026, alese de autor: ce iese peste linie (dinții,
# spațiul, suprapunerea, pragul de 0), locul pe foaie (marginile, raza frezei, axele), mărimea implicită, cel mai mare panou
# (laturile tăiate ale fâșiilor), încăperea (toleranța, rotirea), opririle dinților la încrucișările grilei (reparația lui
# 10.3↑k) și legăturile din blocul panourilor (e2e: mărimea implicită, marginile ținute, avertismentul, „Cât încape pe foaie”,
# „Așază pe foi…”).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


F = 'src/model/panouriPeFoaie.ts'
T = 'src/model/taiere.ts'
M = 'src/model/panouri.ts'
B = 'src/app/PanouriTaiere.tsx'
P = 'src/app/PanouTaiere.tsx'
E = 'src/app/Editare.tsx'

# Ieșirea peste linie.
o('F01', F, "const dinti = imbinare ? imbinare.inaltime / 2 : 0;", "const dinti = imbinare ? imbinare.inaltime : 0;", 'foi',
  'dinții ies cu toată înălțimea lor, nu cu jumătate')
o('F02', F, "(intre.fel === 'suprapunere' ? intre.latime / 2 : -intre.latime / 2)", "(intre.fel === 'suprapunere' ? -intre.latime / 2 : -intre.latime / 2)",
  'foi', 'suprapunerea micșorează ieșirea, ca spațiul')
o('F03', F, "(intre.fel === 'suprapunere' ? intre.latime / 2 : -intre.latime / 2)", "(intre.fel === 'suprapunere' ? intre.latime / 2 : intre.latime / 2)",
  'foi', 'spațiul mărește ieșirea, ca suprapunerea')
o('F04', F, "return Math.max(0, dinti + joc);", "return dinti + joc;", 'foi', 'o linie dreaptă cu spațiu „iese” negativ (panoul implicit crește)')
# Locul pe foaie.
o('F05', F, "stoc.latime - 2 * Math.max(margini.margineX, r)", "stoc.latime - 2 * margini.margineX", 'foi',
  'pe lățime, o margine sub raza frezei nu urcă la ea')
o('F06', F, "stoc.inaltime - 2 * Math.max(margini.margineY, r)", "stoc.inaltime - Math.max(margini.margineY, r)", 'foi',
  'pe înălțime, o singură margine')
o('F07', F, "stoc.inaltime - 2 * Math.max(margini.margineY, r)", "stoc.inaltime - 2 * Math.max(margini.margineX, r)", 'foi',
  'înălțimea, cu marginea lățimii')
o('F08', F, "const r = freza / 2;", "const r = freza;", 'foi', 'diametrul frezei în locul razei')
# Mărimea implicită.
o('F09', F, "const latime = loc.latime - 2 * iesire, inaltime = loc.inaltime - 2 * iesire;", "const latime = loc.latime - iesire, inaltime = loc.inaltime - iesire;",
  'foi', 'mărimea implicită scade ieșirea doar de pe o latură')
o('F10', F, "return latime > 0 && inaltime > 0 ? { latime, inaltime } : null;", "return latime > 0 ? { latime, inaltime } : null;", 'foi',
  'o înălțime negativă trece drept mărime')
# Cel mai mare panou.
o('F11', F, "const taiate = (j > 1 ? 1 : 0) + (j < t.length - 1 ? 1 : 0);", "const taiate = (j < t.length - 1 ? 1 : 0);", 'foi',
  'o fâșie din mijloc, cu o singură latură tăiată')
o('F12', F, "const taiate = (j > 1 ? 1 : 0) + (j < t.length - 1 ? 1 : 0);", "const taiate = 2;", 'foi',
  'marginile cutiei, socotite tăiate (o fâșie singură „iese”)')
o('F13', F, "return { latime: fasieMaxima(k.minX, k.maxX, xs, iesire), inaltime: fasieMaxima(k.minY, k.maxY, ys, iesire) };",
  "return { latime: fasieMaxima(0, k.maxX, xs, iesire), inaltime: fasieMaxima(0, k.maxY, ys, iesire) };", 'foi',
  'fâșiile măsurate de la 0, nu de la marginea cutiei')
# Încăperea.
o('F14', F, "const EPS = 1e-9;", "const EPS = 0;", 'foi', 'un panou cât locul, cu zgomotul calculului, nu încape')
o('F15', F, "return drept || (roteste && panou.inaltime", "return drept || (true && panou.inaltime", 'foi', 'culcat, chiar fără rotire')
o('F16', F, "(roteste && panou.inaltime <= loc.latime + EPS && panou.latime <= loc.inaltime + EPS)",
  "(roteste && panou.latime <= loc.latime + EPS && panou.inaltime <= loc.inaltime + EPS)", 'foi', 'rotirea nu culcă panoul')
# Opririle dinților (reparația lui 10.3↑k).
o('T01', T, "const ts = opriri.map((q) => dealungul(L, q)).sort((a, b) => a - b);", "const ts: number[] = [];", 'foi',
  'opririle nu se mai iau: dinții pe toată coarda (refuzul pe-linie, dinți tăiați)')
o('T02', T, "const dinti0 = d.slice(1, -1).map((x) => vf(a + x.t, x.s, x.b));", "const dinti0 = d.slice(1, -1).map((x) => vf(a0 + x.t, x.s, x.b));",
  'foi', 'dinții fiecărei bucăți de coardă, puși de la capătul coardei întregi')
o('T03', T, "u: L.u, ...(cerere.opriri ? { opriri: cerere.opriri } : {}) };", "u: L.u };", 'foi', 'linia din panou nu primește opririle')
o('T04', M, "opriri: x ? grila.ys.map((y) => ({ x: v, y })) : grila.xs.map((q) => ({ x: q, y: v }))",
  "opriri: x ? grila.xs.map((y) => ({ x: v, y })) : grila.ys.map((q) => ({ x: q, y: v }))", 'foi', 'opririle, de pe axa greșită')
# Blocul panourilor (e2e).
o('H01', B, "const implicita = (loc ? marimeImplicita(loc, iesire) : null) ?? stoc ?? null;", "const implicita = stoc ?? null;", 'e2e',
  'mărimea implicită e iar materialul foii')
o('H02', B, "const freza = useMemo(() => (foaie ? distantaMinima(doc, alese, foaie.id) : 0), [doc, alese, foaie]);", "const freza = 0;", 'e2e',
  'blocul nu ține seama de freza profilului exterior')
o('H03', B, "const tinute = optiuniTinute();", "const tinute = { margineX: 10, margineY: 10, rotirea: 'fara' as const };", 'e2e',
  'blocul nu citește alegerile ținute ale așezării')
o('H04', B, "!incapePeFoaie(mare, loc, tinute.rotirea === '90')", "!incapePeFoaie(mare, loc, false)", 'e2e', 'avertismentul ignoră rotirea ținută')
o('H05', B, "const iesire = iesirePesteLinie(imbinareDin(optiuni, true), intreDin(optiuni));", "const iesire = 0;", 'e2e',
  'mărimea implicită și avertismentul fără dinți')
o('H06', B, "      {!motiv && iese ? (", "      {false ? (", 'e2e', 'avertismentul nu se arată')
o('H07', B, "onClick={() => { setTextL(null); setTextI(null); setFel('marime'); }}>", "onClick={() => { setTextL(null); setFel('marime'); }}>", 'e2e',
  '„Cât încape pe foaie” pune la loc doar lățimea')
o('H08', B, "const valL = textL ?? (implicita ? mm(implicita.latime, virgula) : '');", "const valL = implicita ? mm(implicita.latime, virgula) : '';", 'e2e',
  'lățimea scrisă nu se ia în seamă')
o('H09', B, "disabled={(foaie?.instante.length ?? 0) === 0 || stare?.fel === 'calcul'} onClick={onAseaza}>",
  "disabled={(foaie?.instante.length ?? 0) === 0 || stare?.fel === 'calcul'} onClick={() => {}}>", 'e2e', '„Așază pe foi…” din bloc nu deschide nimic')
o('H10', E, "{...(p.onAseaza ? { onAseaza: p.onAseaza } : {})} onInchide={() => { setPanou(null); }} />", "onInchide={() => { setPanou(null); }} />", 'e2e',
  'panoul Taie nu primește „Așază pe foi”: blocul fără buton')
o('H11', P, "        {...(onAseaza ? { onAseaza } : {})} />", " />", 'e2e', 'blocul panourilor nu primește „Așază pe foi”')

SETURI = {
    'foi': ['test/unit/taiere.panouri.foi.test.ts', 'test/unit/taiere.panouri.test.ts', 'test/unit/taiere.panouri.oracol.test.ts'],
    'foi2': ['test/unit/taiere.panouri.foi.test.ts', 'test/unit/taiere.panouri.test.ts', 'test/unit/taiere.panouri.oracol.test.ts',
             'test/unit/taiere.test.ts', 'test/unit/taiere.imbinare.test.ts'],
}
E2E = ['test/e2e/taiere.spec.ts']
