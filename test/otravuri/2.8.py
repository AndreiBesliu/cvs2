# Lista de otrăvuri a feliilor 2.8c (panoul editabil, câmpul numeric) și 2.8d (traseul pe WebGL2), sesiune independentă,
# 17.10.2026 (2.8e). Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
#
# Rezultatul (clona de la 946470c, cu oracolul stratului necomis; bazele verzi: unitare 12/41/8/201/9/61, e2e 25/25, e2e
# larg 98/98): 44 rulate, 0 VOID. 21 prinse de setul lor; 23 scăpate → a doua șansă: `doua` (setul „2”) 0 prinse;
# e2e larg (toată suita, OTRAVURI_E2E_LARG=1) prinde N07 (63 roșii) și T20 (5 roșii în oracol). Rămân 21 scăpate:
# 2 echivalente (C03, A08) și 19 găuri, fiecare cu testul care lipsește:
#   N11  textNumar(-2.5, true) === '-2,5' (doar dus-întors nu vede separatorul).
#   C04  rotirea 0, scrii 360 + Enter: câmpul arată 0 (nu 360), fără pas de anulare (la fel 450 pe 90).
#   C05  după „abc” + Enter (motiv), o tastă nouă scoate motivul și aria-invalid, înainte de Enter.
#   C07  foaie-latime „-5” / „+300” + Enter: motivul „valoare invalidă”, foaia neschimbată (dimensiunea n-are semn).
#   P01  forma A: „abc” în X + Enter (motiv); selectezi forma B: X arată colțul lui B, fără motiv.
#   P02  pozitie-y „5” + Enter: Y = 5, X neschimbat (Y nu e aplicat de niciun test).
#   P03  pozitie-x „-5” + Enter: primit, câmpul arată „-5” (coordonata are semn, §5).
#   P06  foaie-inaltime „150” + Enter: înălțimea 150, lățimea neschimbată (înălțimea nu e aplicată de niciun test).
#   A19  pozitie {y: NaN} → motiv.valoare-invalida (oglinda testului pe x; azi iese motiv.prea-departe).
#   A22  doar e1 ales, poziționat: instanța e2 rămâne identică (deepEqual înainte / după).
#   T03/T04  cercul întreg cu toleranța ≥ raza (și 0,9·r): cel puțin 4 coarde (un pătrat), nu o coardă de lungime 0.
#   T11  program cu exact `buget` segmente: rarit false, toleranța neschimbată.
#   T12  când rarit: toleranța întoarsă e cea mai fină care încape (la toleranta / 2, segmentele trec de buget).
#   T17  un șir de peste 65 536 de vârfuri în 64 mm: fiecare bucată are ≤ 65 536 de vârfuri, legate.
#   S02  traseul cu totul în afara vederii: data-varfuri = 0 (sau mai mic la 1 000 px/mm decât la foaia întreagă).
#   S06  după o schimbare (traseu vechi), alfa pixelilor ≈ 0,35 × alfa traseului la zi (azi doar data-stins).
#   S07  ORACOLUL: rapidele vs tăierile se compară pe RGB, nu și pe alfa (aceeași culoare cu alfa 0,8 trece ca „altă culoare”).
#   AP07 dpr 2 la capătul de sus al treptei (de ex. 16 px/mm): săgeata ≤ ½ px fizic (sau `data-treapta` = ⌈log2(scara·dpr)⌉).
# Prinse doar de e2e, deci goluri în unitare: N07 (textNumar(0) === '0'), T20 (cutia unei bucăți cu originea ≠ 0, în lume).
# Echivalente: C03 (motiv ≠ null ⇒ editez = true; revino pune editez = false, iar efectul [dinDocument, editez] șterge
# motivul în același ciclu; diferă cel mult un cadru); A08 (((r % 360) + 360) % 360 are deîmpărțitul > 0, deci n ∈ [0, 360)
# și n ≠ −0: garda `n >= 360 || n === 0` nu schimbă nimic; NaN rămâne NaN în ambele).
# Integrarea (sesiunea aplicației, 17.10, clona de la d6412b1, după reparațiile recenziei): P03 și T11 refăcute pe codul
# nou (textul lor se schimbase; A01, prinsă, rămâne VOID). Testele noi: test/unit/otravuri.28.test.ts (N07, N11, A19, A22,
# T03, T04, T11, T12, T17, T20) și test/e2e/otravuri-28.spec.ts (P01, P02, P03, P06, C04, C05, C07, S02, S06, AP07); S07 prin
# oracolul reparat (culorile pe RGB). Toate 21 prinse cu `tinte` / `e2e` (T12 abia după ce testul cere și șirurile toleranței).
import glob

O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


NUMAR_F = 'src/ui/numar.ts'
CAMP = 'src/ui/CampNumeric.tsx'
PANOU_F = 'src/app/PanouProprietati.tsx'
# Calculul acțiunilor panoului stă, din 17.10 (loc în pachetul de pornire), în modulul adus cu ferestrele.
ACT = 'src/ui/actiuniDocumentCalcul.ts'
TR = 'src/app/traseuDesen.ts'
STRAT = 'src/canvas/StratTraseu.tsx'
APP = 'src/app/App.tsx'

# ---- N: citesteNumar / textNumar (set numar) ----
o('N01', NUMAR_F,
  "(m[1] !== '' && !semn)",
  "(m[1] === '-' && !semn)",
  'numar', 'fără `semn`, doar minusul ASCII e refuzat: „+1” și „−1” trec ca dimensiuni')
o('N02', NUMAR_F,
  "return (m[1] === '-' || m[1] === '−') && x !== 0 ? -x : x;",
  "return (m[1] === '-' || m[1] === '−') ? -x : x;",
  'numar', '„-0” devine −0 (Object.is): o coordonată −0 ajunge în document')
o('N07', NUMAR_F,
  "if (x < 0) return `-${textNumar(-x, virgula)}`;",
  "if (x <= 0) return `-${textNumar(-x, virgula)}`;",
  'numar', 'textNumar(0) intră în recursie fără capăt (rotirea 0 a oricărei forme)')
o('N08', NUMAR_F,
  "`0.${'0'.repeat(Number(m[3]) - 1)}${m[1]}",
  "`0.${'0'.repeat(Number(m[3]))}${m[1]}",
  'numar', 'forma fără exponent cu un zero în plus: 1e-7 se scrie 0,00000001 (de 10 ori mai mic)')
o('N11', NUMAR_F,
  "if (x < 0) return `-${textNumar(-x, virgula)}`;",
  "if (x < 0) return `-${textNumar(-x)}`;",
  'numar', 'negativul pierde virgula în română: „-12.5” în loc de „-12,5” (se citește înapoi la fel)')

# ---- C: CampNumeric (e2e) ----
o('C03', CAMP,
  "  const revino = (): void => {\n    setText(dinDocument);\n    setMotiv(null);\n    setEditez(false);\n  };",
  "  const revino = (): void => {\n    setText(dinDocument);\n    setEditez(false);\n  };",
  'e2e', 'Escape revine la text, dar motivul valorii greșite rămâne afișat')
o('C04', CAMP,
  "}, [dinDocument, editez]);",
  "}, [dinDocument]);",
  'e2e', 'efectul nu mai urmează ieșirea din editare: o valoare aplicată fără schimbare în document (rotirea 360 = 0) rămâne scrisă')
o('C05', CAMP,
  "          setText(e.target.value);\n          setMotiv(null);\n",
  "          setText(e.target.value);\n",
  'e2e', 'scrisul nu mai șterge motivul vechi: „Valoarea trebuie…” și aria-invalid rămân cât omul corectează')
o('C06', CAMP,
  "onBlur={aplica}",
  "onBlur={revino}",
  'e2e', 'ieșirea din câmp renunță în loc să aplice (ADR 0038 §5)')
o('C07', CAMP,
  "const x = citesteNumar(text, semn);",
  "const x = citesteNumar(text, true);",
  'e2e', 'semnul primit și pe dimensiuni: „-5” la lățimea foii ajunge la acțiune (alt motiv) în loc de „valoare invalidă”')
o('C08', CAMP,
  "      setMotiv(t(r.motiv));",
  "      setMotiv(null);",
  'e2e', 'refuzul acțiunii e tăcut: valoarea rămâne în câmp fără motiv')

# ---- P: panoul (e2e) ----
o('P01', PANOU_F,
  "<CampNumeric key={`${cheie}/${numeCamp}`}",
  "<CampNumeric key={numeCamp}",
  'e2e', 'cheia fără selecție: textul neaplicat al unei forme trece la forma selectată apoi')
o('P02', PANOU_F,
  "(y) => onPozitie({ y })",
  "(y) => onPozitie({ x: y })",
  'e2e', 'câmpul Y mută forma pe X')
o('P03', PANOU_F,
  "'pozitie-x', valoareDerivata(cutie.minX), 'mm', true,",
  "'pozitie-x', valoareDerivata(cutie.minX), 'mm', false,",
  'e2e', 'colțul X refuză valorile negative (o coordonată are semn, ADR 0038 §5)')
o('P06', PANOU_F,
  "(x) => onStoc({ inaltime: x })",
  "(x) => onStoc({ latime: x })",
  'e2e', 'câmpul înălțimii foii schimbă lățimea')

# ---- A: acțiunile panoului (set panou) ----
o('A01', ACT,
  "return { dx: prag(p.x === undefined ? 0 : p.x - k.minX),",
  "return { dx: prag(p.x === undefined ? 0 : p.x - k.maxX),",
  'panou', 'poziția X e marginea dreaptă a cutiei, nu colțul stânga-jos')
o('A03', ACT,
  "if (typeof d === 'string' || (d.dx === 0 && d.dy === 0) || alesePreaDeparte(ctx, d.dx, d.dy)) return;",
  "if (typeof d === 'string' || alesePreaDeparte(ctx, d.dx, d.dy)) return;",
  'panou', 'aceeași poziție scrie un pas de anulare gol')
o('A08', ACT,
  "return n >= 360 || n === 0 ? 0 : n;",
  "return n;",
  'panou', 'unghiul rotunjit la 360 (−1e-300) și −0 nu se mai normalizează la 0')
o('A17', 'src/model/jurnal.ts',
  "case 'inlocuieste-stoc': return { tip: c.tip, foaie: c.foaie, vechi: c.nou, nou: c.vechi };",
  "case 'inlocuieste-stoc': return c;",
  'panou', 'anularea materialului foii îl aplică din nou în loc să-l întoarcă')
o('A19', ACT,
  "if ((p.x !== undefined && !Number.isFinite(p.x)) || (p.y !== undefined && !Number.isFinite(p.y))) return 'motiv.valoare-invalida';",
  "if (p.x !== undefined && !Number.isFinite(p.x)) return 'motiv.valoare-invalida';",
  'panou', 'Y infinit / NaN nu e refuzat (citesteNumar întoarce Infinity pentru 400 de cifre)')
o('A21', ACT,
  "    if (!alese.has(e.instanta)) continue;\n    const c = cutieElement(e);\n    k = k ? uneste(k, c) : c;\n  }\n  return k;",
  "    const c = cutieElement(e);\n    k = k ? uneste(k, c) : c;\n  }\n  return k;",
  'panou', 'cutia selecției ia toate formele foii, nu doar pe cele alese')
o('A22', ACT,
  "      const c = pas(foaie.instante\n        .filter((i) => alese.has(i.id))",
  "      const c = pas(foaie.instante\n        .filter(() => true)",
  'panou', 'poziționarea mută și formele neselectate, cu aceeași deplasare')

# ---- T: traseuDesen (set traseu; cele scăpate trec și prin e2e) ----
o('T03', TR,
  "const sfert = Math.ceil(Math.abs(b) / (Math.PI / 2));",
  "const sfert = 1;",
  'traseu', 'fără minimul de o coardă pe sfert: un cerc întreg la toleranță mare devine o coardă de lungime 0')
o('T04', TR,
  "if (!(toleranta < r)) return Math.max(1, sfert);",
  "if (!(toleranta < r)) return 1;",
  'traseu', 'toleranța ≥ raza: arcul are o singură coardă (cercul întreg dispare)')
o('T11', TR,
  "for (let i = 0; i < 60 && v > buget; i++) {",
  "for (let i = 0; i < 60 && v >= buget; i++) {",
  'traseu', 'bugetul atins exact se rărește (marginea: ≤ buget încape)')
o('T12', TR,
  "const urm = siruriDinProgram(miscari, tol * 2);",
  "const urm = siruriDinProgram(miscari, tol * 4);",
  'traseu', 'rărirea sare câte ×4: toleranța nu mai e cea mai fină care încape')
o('T14', 'src/canvas/protocol.ts',
  "return Math.ceil(Math.log2(Math.max(scara * dpr, 1e-9)));",
  "return Math.round(Math.log2(Math.max(scara * dpr, 1e-9)));",
  'traseu', 'treapta rotunjită, nu în sus: toleranța poate trece de ½ px în treaptă')
o('T15', TR,
  "if (v.length > 0) ind.push(RESTART);",
  "",
  'traseu', 'fără RESTART: șirurile din aceeași bucată se leagă cu o linie falsă')
o('T17', TR,
  " && v.length / 2 < VARFURI_PE_BUCATA);",
  ");",
  'traseu', 'plafonul de vârfuri pe bucată scos: un șir dens sub 64 mm dă un buffer oricât de mare')
o('T18', TR,
  "            const ax = ux, ay = uy;\n            inchide();\n            varf(ax, ay);",
  "            inchide();",
  'traseu', 'bucata următoare nu repornește din ultimul vârf: gol între bucăți')
o('T20', TR,
  "k = { minX: Math.min(k.minX, px), minY: Math.min(k.minY, py), maxX: Math.max(k.maxX, px), maxY: Math.max(k.maxY, py) };",
  "k = { minX: Math.min(k.minX, px - ox), minY: Math.min(k.minY, py - oy), maxX: Math.max(k.maxX, px - ox), maxY: Math.max(k.maxY, py - oy) };",
  'traseu', 'cutia bucății relativă la origine, nu în lume: stratul sare bucăți vizibile')
o('T26', TR,
  "    curent.puncte.push(px, py);\n    segmente++;",
  "    curent.puncte.push(px, py);\n    if (!rapid) segmente++;",
  'traseu', 'rapidele nu intră în buget (se desenează, dar nu se numără)')
o('T28', TR,
  "v.push(px - ox, py - oy);",
  "v.push(Math.fround(px) - Math.fround(ox), Math.fround(py) - Math.fround(oy));",
  'traseu', 'vârful relativ calculat din coordonate float32 absolute (precizia pierdută departe de origine)')

# ---- S: StratTraseu (e2e) ----
o('S01', STRAT,
  "y0 = (v.ty - m.inaltime) / v.scara, y1 = v.ty / v.scara;",
  "y0 = -v.ty / v.scara, y1 = (m.inaltime - v.ty) / v.scara;",
  'e2e', 'lumea vizibilă pe Y calculată ca pe X (fără întoarcerea axei): bucăți vizibile sărite')
o('S02', STRAT,
  "if (k.maxX < x0 || k.minX > x1 || k.maxY < y0 || k.minY > y1) continue;",
  "if (false) continue;",
  'e2e', 'fără sărirea bucăților din afara vederii (doar cost; `data-varfuri` le numără pe toate)')
o('S03', STRAT,
  "gl.uniform1f(g.u.s, v.scara * m.dpr);",
  "gl.uniform1f(g.u.s, v.scara);",
  'e2e', 'scara vârfurilor fără dpr: la dpr 2, traseul e pe jumătate')
o('S06', STRAT,
  "const alfa = stins ? 0.35 : 1;",
  "const alfa = 1;",
  'e2e', 'traseul vechi nu se mai stinge în pixeli (doar atributul data-stins)')
o('S07', STRAT,
  "rapid: rgba(v('--traseu-rapid', '#8a8f98'), alfa * 0.8)",
  "rapid: rgba(v('--traseu-taiere', '#0a7d53'), alfa * 0.8)",
  'e2e', 'rapidele în culoarea tăierilor (diferă doar alfa)')
o('S09', STRAT,
  "if (g.setul !== b) incarca(g, b);",
  "if (g.setul === null) incarca(g, b);",
  'e2e', 'bucățile noi (alt calcul, altă treaptă) nu se mai încarcă: rămâne desenat setul vechi')
o('S11', STRAT,
  "      e.preventDefault();\n      if (gpu.current) gpu.current.incarcate = [];",
  "      if (gpu.current) gpu.current.incarcate = [];",
  'e2e', 'fără preventDefault la webglcontextlost: contextul nu se mai reface')
o('S15', STRAT,
  "antialias: false",
  "antialias: true",
  'e2e', 'antialiasing pornit: linii de mai mult de 1 px fizic, culori amestecate')

# ---- AP: aplicația, partea traseului (e2e) ----
o('AP03', APP,
  "        if (traseuArat.current) calculeazaTraseu();\n",
  "",
  'e2e', 'după export, traseul arătat nu se reface (rămâne vechi)')
o('AP07', APP,
  "return s === null ? null : treaptaZoom(s, window.devicePixelRatio || 1);",
  "return s === null ? null : treaptaZoom(s, 1);",
  'e2e', 'treapta de zoom fără dpr: la dpr 2, săgeata coardelor ajunge la 1 px fizic')
o('AP09', APP,
  "}, [miscariTraseu, treapta, bugetTraseu]);",
  "}, [miscariTraseu, bugetTraseu]);",
  'e2e', 'coardele nu se refac la schimbarea treptei de zoom (arcele grosiere la 1 000 px/mm)')


# ---- Seturile ----
def u(*nume):
    return ['test/unit/%s.test.ts' % n for n in nume]


NUMAR = u('numar', 'actiuni.panou')
NUMAR2 = sorted(set(NUMAR + u('actiuni', 'actiuni.export', 'export.calcul')))
PANOU = u('actiuni.panou')
PANOU2 = sorted(set(PANOU + u('actiuni', 'model', 'document.oracol', 'actiuni.export', 'cale.recenzie', 'document.v9.actiuni.oracol',
                             'import.actiuni', 'import.deschise')))
TRASEU = u('traseu.desen')
TRASEU2 = sorted(set(TRASEU + u('aranjament', 'lant', 'post.grbl', 'cam.cale', 'cam.deschise')))
SETURI = {'numar': NUMAR, 'numar2': NUMAR2, 'panou': PANOU, 'panou2': PANOU2, 'traseu': TRASEU, 'traseu2': TRASEU2}
E2E = ['test/e2e/panou.spec.ts', 'test/e2e/traseu.spec.ts', 'test/e2e/traseu.oracol.spec.ts']
# A doua șansă a otrăvurilor e2e (și a celor unitare scăpate și din setul „2”): toată suita e2e, cu
# `OTRAVURI_E2E_LARG=1 python scripts/otravuri.py test/otravuri/2.8.py e2e ID ...` (baza la fel, cu `baza e2e`).
if __import__('os').environ.get('OTRAVURI_E2E_LARG') == '1':
    E2E = sorted(f.replace('\\', '/') for f in glob.glob('test/e2e/*.spec.ts'))
# Un singur spec, pentru testele noi ale celor scăpate (2.8e): `OTRAVURI_E2E_TINTE=<spec> … e2e ID ...`.
if __import__('os').environ.get('OTRAVURI_E2E_TINTE'):
    E2E = [__import__('os').environ['OTRAVURI_E2E_TINTE']]
