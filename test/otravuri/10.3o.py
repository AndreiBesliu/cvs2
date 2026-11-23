# Lista de otrăvuri a feliei 10.3↑o (legarea căilor; ADR 0182), 21.11.2026, alese de autor: lipirea (grupele de capete,
# T-urile, cine se leagă: piesele, operațiile, piesele puse de mai multe ori), lanțurile (golul dintre două lanțuri, cu
# întoarcerea lor, închiderea unei singure căi, „multe”), calea legată (sensul primei căi, nodul lipirii, mânerele cubicelor,
# arcele întoarse și oglindite, matricea neuniformă, aria), unde ajunge (instanțele șterse), rândul Verificării (doar lipirea),
# apoi legăturile interfeței (e2e: Ctrl+J, starea care rămâne după alegerea făcută de legare, opțiunile ținute, butonul
# „Leagă toate căile”).
# Nețintite, cu motivul: `limita` la egalitate (golul exact cât pragul: o valoare de margine fără înțeles practic), modul
# „toate” fără golurile dintre lanțuri (echivalent: acolo limita e 0), textele (e2e-ul le citește întregi).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


L = 'src/model/legareCai.ts'
E = 'src/app/Editare.tsx'
S = 'src/ui/scurtaturi.ts'
P = 'src/app/optiuniLegare.ts'
V = 'src/app/PanouVerificare.tsx'

# Lipirea și cine se leagă.
o('L01', L, "    if (m.length > 2) { nelegate.t++; for (const j of m) blocat[j] = 1; continue; }\n", "", 'legare', 'un T nu se numără și nu se blochează')
o('L02', L, "(a.grup !== b.grup ? 'piese'", "(false ? 'piese'", 'legare', 'o cale singură se leagă de una dintr-o piesă cu mai multe forme')
o('L03', L, "    : o.operatii === 'refuza' && !laFel(a.ops, b.ops) ? 'operatii' : null);", "    : null);", 'legare', 'operațiile diferite se leagă')
o('L04', L, "  if (s.tip === 'A') return { ...s, bulge: -s.bulge };", "  if (s.tip === 'A') return { ...s, bulge: s.bulge };", 'legare', 'arcul întors își păstrează semnul')
o('L05', L, "  if (s.tip === 'C') return { ...s, c1: s.c2, c2: s.c1 };", "  if (s.tip === 'C') return { ...s, c1: s.c1, c2: s.c2 };", 'legare', 'cubica întoarsă își păstrează mânerele')
o('L06', L, ": kStanga < kDreapta ? stanga : dreapta);", ": kStanga > kDreapta ? stanga : dreapta);", 'legare', 'nodul e capătul căii de mai târziu')
o('L07', L, "    ? { x: (stanga.x + dreapta.x) / 2, y: (stanga.y + dreapta.y) / 2 }", "    ? stanga", 'legare', 'la mijloc, tot capătul din stânga')
o('L08', L, "      const s = q0.s.tip === 'C' ? { ...q0.s, c1: mutat(q0.s.c1, dQ) } : q0.s;", "      const s = q0.s;", 'legare', 'mânerul cubicei nu vine cu capătul')
o('L09', L, "      if (best.a === a0) intoarce(A);\n", "", 'legare', 'primul lanț nu se întoarce spre gol')
o('L10', L, "  } else if (c.fel !== 'toate' && deschise.length === 1 && alese.length === 1) {", "  } else if (c.fel !== 'toate' && deschise.length === 1) {",
  'legare', 'o cale rămasă singură (alta, dintr-o piesă pusă de două ori) se închide')
o('L11', L, "    if (limita > 0) multe = true;", "    if (limita > 0) multe = false;", 'legare', 'trei lanțuri cu goluri: fără „multe”')
o('L12', L, "  if ((L.cai[p] as { inv: boolean }).inv) { intoarce(L); p = L.cai.length - 1 - p; }\n", "", 'legare', 'calea legată nu ia sensul primei')
o('L13', L, "  if (arce && !esteSimilitudine(T, TOLERANTA_SIMILITUDINE_LUME)) return null;\n", "", 'legare', 'arcele printr-o matrice neuniformă')
o('L14', L, "  const semn = determinantNormat(T) < 0 ? -1 : 1;", "  const semn = 1;", 'legare', 'oglindirea nu schimbă semnul arcului')
o('L15', L, "    if (!caleBuna(nou) || (nou.inchis && !areArie(nou, prima.e.matrice, tol))) { degenerate++; continue; }",
  "    if (!caleBuna(nou)) { degenerate++; continue; }", 'legare', 'o cale închisă fără arie trece')
o('L16', L, "      if (x.grup === 'solo') sterse.push(x.e.instanta);\n      else schimbarea", "      schimbarea", 'legare', 'instanța căii singure nu se șterge')
o('L17', L, "  const doarLipire = c.fel !== 'alese';", "  const doarLipire = false;", 'legare', 'rândul Verificării leagă și cu o linie')
o('L18', L, "    if (l.ori > 1) { impartite++; continue; }\n", "", 'legare', 'o piesă pusă de două ori se schimbă')
o('L19', L, "        const de = refuz(cai[a >> 1] as Cale, cai[b >> 1] as Cale);\n        if (de) { refuzuri ??= de; continue; }\n", "",
  'legare', 'golul se leagă peste piese sau operații diferite')
o('L20', L, "      if (best.b === b1) intoarce(B);\n", "", 'legare', 'al doilea lanț nu se întoarce spre gol')
# Interfața (e2e).
o('U01', S, "  ['Ctrl+J', 'document.leaga-caile'],\n", "", 'e2e', 'Ctrl+J nu leagă')
o('U02', E, "    if (pastreazaStareLegare.current) { pastreazaStareLegare.current = false; return; }\n", "", 'e2e',
  'rezultatul legării pleacă odată cu alegerea făcută de ea')
o('U03', P, "    localStorage.setItem(CHEIE, JSON.stringify(acum));\n", "", 'e2e', 'opțiunile legării nu se țin')
o('U04', V, "                      {capete > 0 ? (\n", "                      {capete > 1 ? (\n", 'e2e', '„Leagă toate căile” lipsește cu un singur rând')
o('U05', 'src/app/App.tsx', "    ...(legareEditare.current ? { legaCaile: legareEditare.current } : {}),\n", "", 'e2e', 'tasta și paleta nu ajung la legare')

SETURI = {
    'legare': ['test/unit/legare.test.ts'],
}
E2E = ['test/e2e/legare.spec.ts']
