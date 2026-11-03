# ADR 0141: Textul vertical (felia 7.7↑)

**Starea:** acceptat pe 03.11.2026, la felia 7.7↑ (adusă din etapa 7), în worktree-ul `wip/7.5-text`, la răspunsul
owner-ului „Textul vertical (7.7↑)”. Numărul e al liniei textului (owner-ul, „0140–0142”). **Completează:** ADR 0105
(„textul vertical (litere una sub alta)” rămas pentru etapa 7), ADR 0123 (aldinul și cursivul), ADR 0140 (fonturile cu o
singură linie). Nu e „literele verticale” din ADR 0108 (o literă dreaptă pe o curbă). **Schimbă:** blocul textului (câmpul
opțional `vertical`) și panoul textului (bifa, alinierea Sus / Mijloc / Jos, „Distanța dintre coloane”).

**Problema.** O firmă verticală (HOTEL, BAR, FARMACIE pe o placă îngustă) cere literele una sub alta, drepte, nu textul
orizontal rotit cu 90°. Nici ADR 0105, nici fișa nu spun cum se așază: pasul dintre litere, centrarea, rândurile, alinierea.
Fonturile latine n-au metrici verticale (`vhea`, `vmtx`), iar specificația CSS a scrisului vertical (Writing Modes) cere
doar ca ele să fie sintetizate, fără să spună cum: fiecare motor își are euristica lui.

## Decizia

1. **Coloanele:** fiecare rând al textului e o coloană, de la stânga la dreapta (ordinea de citire), cu axa coloanei r la
   x = r × rândul fontului × „Distanța dintre rânduri” (aceeași distanță ca între rânduri; în panou, „Distanța dintre
   coloane”). Un rând gol e o coloană goală.
2. **Literele una sub alta, după cutia lor:** fiecare caracter e o celulă: litera desenată în sistemul ei (cu cursivul și
   aldinul), cu cutia ei exactă (`cutieContur`: liniile, arcele și extremele cubicelor). Cutia unei litere îngroșate e a
   miezului cu 2d în plus în sus și la dreapta (figura crește cu d pe fiecare parte și se mută cu (d, d), ADR 0123): exactă,
   fără să depindă de biarce. Fiecare cutie stă sub a celei de deasupra, la **gol = max(0, em − h) + spațierea** (em-ul
   fontului și înălțimea majusculei h, în mm): între două majuscule simple, pasul e chiar un em; o literă cu un semn deasupra
   (Ă, Â, Î) sau dedesubt (Ș, Ț, g) își primește locul, deci golul vizibil rămâne același, iar literele nu se ating.
3. **Spațiul și lipsurile:** un caracter fără contur (spațiul, tabul) ține locul unei majuscule, [0, h]; o glifă pe care
   fontul n-o poate da ține și ea locul, nedesenată; un caracter pe care fontul nu-l are nu ține loc (panoul îl spune, ca pe
   orizontală). Fără crenare: perechile `kern` și GPOS sunt orizontale.
4. **Centrarea:** fiecare literă stă centrată pe axa coloanei după cutia ei, nu după avans (o literă cu marginile laterale
   inegale, ca 1 sau J, ar ieși de pe axă).
5. **Alinierea față de ancoră:** pe verticală, butoanele devin **Sus** (vârful primei litere în ancoră, coloana coboară),
   **Mijloc** (coloana centrată pe ancoră) și **Jos** (baza ultimei litere în ancoră). În bloc, valorile rămân `stanga`,
   `centru`, `dreapta`.
6. **Blocul:** `vertical: true`, lipsă pentru textul orizontal. Un text vertical nu stă pe o curbă: ușa blocului refuză
   amândouă. Scalarea uniformă îl păstrează: așezarea verticală crește întocmai cu înălțimea (em-ul, golul, spațierea și
   rândul cresc toate cu ea), deci blocul scalat rămâne cel al geometriei.
7. **Panoul:** bifa „Vertical (literele una sub alta)”; pe verticală, alinierea Sus / Mijloc / Jos și „Distanța dintre
   coloane”. O ancoră pe o curbă nu se folosește: panoul spune „Textul vertical stă drept: nu urmează curba.”, iar cu bifa
   oprită curba revine. Aldinul, cursivul și fonturile cu o singură linie (ADR 0140) merg la fel; previzualizarea arată
   coloanele.
8. **Așezarea** (`asezare.ts`): desenul unei litere e acum o funcție (`contururiLitera`), comună rândurilor și coloanelor;
   rândurile au ieșit neschimbate (corpusul, aldinul, liniile simple, fonturile SVG, textul pe curbă, piesa).

## Cifrele (măsurate, gzip 9)

| | Înainte (7.6↑b) | După (7.7↑) |
|---|---|---|
| Pornirea (cu ușa) | 98,6 (102,2) / 110 kB | 98,6 (102,2) / 110 kB |
| Totalul JavaScript | 447,2 / 500 kB | 447,8 / 500 kB |
| Bucata textului (`calcul`) | 18,2 kB | 18,6 kB |
| Precache | 82 de fișiere, 628,1 kB | 82 de fișiere, 629,4 kB |

## Probele

- **Oracolul independent** (`fonturi_verticale` în `test/oracles-py/text_corpus.py`, `test/fixtures/text/vertical.json`):
  coloanele scrise din nou, cu cutiile exacte din fontTools (`calcCubicBounds`); șase cazuri: Roboto („HIT” pe două
  coloane; diacriticele care urcă și coboară, centrate, cu spațiere), Droid Serif (jos, cu spațierea negativă și un spațiu),
  Inter (CFF, cu cursiv), un caracter lipsă și un rând gol, Relief SingleLine (trăsăturile deschise); contur cu contur, sub
  1e-9 mm. Aldinul pe verticală e un caz al corpusului aldinului (`aldin-vertical`: cutia și 30 947 de puncte).
- **Pe hârtie** (Roboto: majuscula 1456, em-ul 2048, rândul 2146 + 555 = 2701 unități; la 20 mm, s = 20 / 1456): vârful lui H
  în ancoră, al lui I la −28,1319 (un em), al lui T la −56,2637; H pe ±559,5 s = ±7,6854; axa coloanei a doua la 2701 s =
  37,1016; între virgula lui Ț și căciula lui Ă, exact golul; coloanele centrate, simetrice; jos, baza ultimei litere în 0; un
  spațiu = o majusculă și două goluri; un caracter lipsă nu ține loc.
- **Probele țintite** (`test/unit/text.vertical.test.ts`): fiecare literă e chiar litera de pe un rând, mutată întreagă (și cu
  aldin și cursiv, cu Relief, cu Inter); golul dintre cutii la trei spațieri; spațiul și caracterul lipsă; alinierea și
  axele coloanelor; ușa blocului (doar `true`, nu pe curbă) și scalarea uniformă.
- **E2e** (`test/e2e/text.spec.ts`, Edge): „HIT” vertical (etichetele Sus / Mijloc / Jos și „Distanța dintre coloane”; vârful
  lui H în ancoră, pasul de un em, H centrat pe axă); după reîncărcare, textul ales vine vertical, iar Jos cu Aplică îl pune
  cu baza lui T în ancoră; pe conturul unui cerc, textul vertical stă drept (fără curbă în bloc), iar cu bifa oprită curba
  revine.
- **Mutațiile** (`test/otravuri/7.7.py`): 19, toate prinse din prima (14 pe probele unitare, 5 de interfață prin e2e, cu
  harnașul pe portul 4174). Două probe au fost scrise înainte, ca mutațiile să aibă ce prinde: un font cu em-ul sub
  majusculă (pragul de 0 al golului) și bifa luată din blocul textului ales, nu din alegerea salvată.

## Ce am respins

- **Pasul fix de un em** (literele în căsuțe egale, ca ideogramele): la Roboto, virgula lui Ț intră în căciula lui Ă
  („PIAȚĂ”). **Rândul fontului** ca pas: golul dintre majuscule ar ieși aproape cât ele (2701 față de 1456 de unități).
- **Centrarea după avans:** marginile laterale ale unei litere sunt făcute pentru vecinii de pe rând, nu pentru o axă.
- **Coloanele de la dreapta la stânga** (ordinea CJK): o firmă în română se citește de la stânga la dreapta.
- **Literele culcate** (textul rotit cu 90°): e textul orizontal rotit, cu unealta de rotire.
- **Metricile verticale ale fontului** (`vhea`, `vmtx`, `vkern`): le au doar fonturile CJK; aici, cutiile.
- **Textul vertical pe o curbă:** literele una sub alta n-au o poziție firească pe o curbă; pe curbă există literele
  drepte (ADR 0108).

## Limite și neprobat

- **Fonturile CJK pe verticală:** ideogramele stau după cutia lor, nu în pătratul de un em; formele verticale ale punctuației
  (GSUB `vert`) nu se folosesc.
- **Spațiul** ține o majusculă: două spații, două majuscule (și trei goluri).
- **O literă cu o coadă lungă** (Q, J la unele fonturi) se centrează cu tot cu coadă.
- **Placa etapei 7** rămâne de tăiat.

## Se redeschide dacă

- owner-ul vrea literele pe o grilă fixă (căsuțe egale) sau coloanele de la dreapta la stânga;
- un font real are semne atât de înalte încât ritmul coloanei se strică;
- se cere un text vertical pe o curbă.
