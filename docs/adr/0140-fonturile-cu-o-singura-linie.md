# ADR 0140: Fonturile cu o singură linie (felia 7.6↑)

**Starea:** acceptat pe 02.11.2026, la felia 7.6↑ (adusă din etapa 7), în worktree-ul `wip/7.5-text`. Decizia owner-ului:
„Da, 1 + 2 cu Relief”, la recomandarea „1. cititorul pentru fonturile tale stick (TTF / OTF dus-întors și fonturile SVG),
fără descărcări; 2. un font liber inclus, descărcat o singură dată, cu licența lângă el: Relief SingleLine”. Numerele ADR
0140–0142 sunt ale liniei textului, tot de la owner („0140–0142”). **Completează:** ADR 0105 (textul; criteriul din cercetare
„un font cu o singură linie dă numai vectori deschiși”), ADR 0037 §11 (căile deschise: capetele, adâncimea), ADR 0092
(gravarea pe linie), ADR 0123 (aldinul). **Schimbă:** lista fonturilor incluse (al treilea, sub OFL 1.1) și cererea
textului (`CerereText` primește grosimea foii). **Completat** pe 02.11.2026 la felia 7.6↑b, la „Da, continuă”: fonturile
SVG (§7); garda entităților importului SVG s-a mutat, neschimbată, într-un modul al ei (`src/io/entitatiXml.ts`).

**Problema.** Un font de gravură n-are litere pline, ci trăsături: freza trece o dată pe fiecare linie, de obicei cu o
freză în V. TrueType și CFF închid însă orice contur, așa că un asemenea font își scrie trăsăturile după o convenție, iar
citit ca un font obișnuit, iese greșit: o linie devine un contur fără arie (sărit), o curbă deschisă se închide cu o
coardă, o trăsătură dus-întors se taie de două ori.

## Decizia

1. **Recunoașterea** (`src/text/linie.ts`, `Font.linie`), la citire, pentru orice font (inclus, încărcat, al sistemului,
   Google): un font obișnuit n-are contururi fără arie (toate punctele, cu cele de control, pe o dreaptă); unul cu o singură
   linie le are la literele drepte. Sondele: I, i, l, H, 1, L, T și cratima; fontul e cu o singură linie dacă cel puțin două
   dintre ele, și cel puțin jumătate din cele pe care le are, au un contur fără arie.
2. **Trăsătura unui contur**, după convenția scrisă în font:
   - **dus-întors** (fonturile „stick” de gravură): punctele conturului, ciclic, sunt un palindrom în jurul unui punct de pe
     curbă; trăsătura e jumătatea de la el la cealaltă întoarcere, deschisă;
   - **păstrată deschisă** (fonturile pentru CAD, ca Relief SingleLine CAD): ultimul punct e pe curbă; trăsătura merge din
     primul punct până în ultimul, fără segmentul de închidere al formatului; dacă ultimul e chiar primul, e o buclă;
   - altfel (ultimul punct în afara curbei), o **buclă**: segmentul de închidere e o curbă a desenului.
3. **Așezarea** (`asezare.ts`): trăsăturile deschise trec prin ușa căilor importului (ADR 0037 §11: un capăt la cel mult
   0,01 mm de start închide trăsătura, lipit sub 1e-6 mm, altfel cu linia golului; altfel rămâne deschisă), TrueType cu
   punctele de pe curbă subînțelese și pătraticele ridicate la cubice, CFF cu cubicele cum sunt; buclele, ca orice contur.
   **Nicio normalizare** (o trăsătură nu e o figură: o buclă care trece de două ori pe același loc rămâne de două ori) și
   **niciun aldin** (n-are figură de îngroșat; ignorat). Cursivul, avansurile, crenarea, rândurile, alinierea și textul pe
   curbă merg la fel.
4. **Piesa** (`piesaText.ts`): trăsăturile sunt forme „cale” deschise (buclele, închise), cu o singură operație, `deschise`,
   pe linie, la adâncimea liniilor importate: `adancimeDeschise(grosime)`, 1 mm și cel mult jumătate din grosimea foii, într-o
   trecere, cu freza foii. Grosimea vine din acțiunea textului (`CerereText`), care o știe. La editare, din operațiile vechi
   rămân doar profilele care merg pe o linie (pe linie, la stânga, la dreapta), mutate pe toate trăsăturile; altfel, gravura
   implicită. Un text trecut înapoi pe un font obișnuit își duce gravura pe linie pe toate contururile.
5. **Relief SingleLine** e inclus (`public/fonturi/relief-singleline.ttf`, grupul „Incluse”): Relief SingleLine CAD Regular,
   din depozitul `isdat-type/Relief-SingleLine` (commit `01dfc57`), sub SIL Open Font License 1.1, fără nume rezervat,
   descărcat cu acordul owner-ului; subset făcut cu fontTools (același set de caractere ca Roboto, cu ș ț ă â î, crenarea din
   GPOS, fără hinting): 26,9 kB, cu licența (`LICENTA-OFL-1.1.txt`) și mențiunile (`CITESTE.txt`) alături, în precache. Buclele
   lui (O, o, 0, 8, punctul) își suprapun capetele cu 2 unități (0,06 mm la 20 mm), deci rămân deschise peste ~3,4 mm; I-ul
   are și o trăsătură de 2 unități în vârf. Se păstrează cum sunt desenate.
6. **Interfața:** Aldin e oprit pentru un font cu o singură linie, cu motivul; previzualizarea (și proba din fereastra
   fonturilor) desenează trăsăturile cu linia, fără umplere.
7. **Fonturile SVG** (felia 7.6↑b, `src/text/fontSvg.ts`): formatul fonturilor de gravură Hershey și EMS (și al fontului
   SVG al lui Relief), în care o trăsătură e o subcale fără Z. Se încarcă în Fonturile mele (fereastra primește și `.svg`);
   `felFisier` le recunoaște după conținut (text XML cu un element `<font>`; un desen SVG nu e un font), iar `citesteFont` le
   dă același `Font` ca unui TTF, cu o singură față:
   - **ușa:** garda entităților importului SVG (ADR 0035 §1), mutată neschimbată în `src/io/entitatiXml.ts`, ca textul s-o
     ia fără ușa SVG întreagă; apoi `DOMParser`, inert. Fără `<font>`: `nu-e-font`; XML stricat sau o entitate refuzată:
     `stricat`;
   - **mărimile, după SVG 1.1:** `units-per-em` (implicit 1000; între 16 și 16384, ca la TTF), `ascent` (implicit em-ul),
     `descent` sub linie oricum i-ar fi scris semnul; avansul glifei, altfel al fontului; majuscula e vârful lui H, altfel
     `cap-height`, altfel refuzul `majuscula`; familia din `font-family`, stilul din `font-weight` și `font-style` (implicit
     Regular), numele PostScript din `id`;
   - **glifele:** cele cu un singur caracter în `unicode` (prima câștigă; ligaturile se sar, cum textul n-are GSUB); căile
     citite cu parserul importului SVG (`citesteDateCale`: comenzile relative făcute absolute, pătraticele ridicate exact la
     cubice), ca puncte în convenția CFF: o subcale cu Z își are ultimul punct în start (o buclă, ca la punctul 2), una fără
     Z se oprește în capătul ei (o trăsătură deschisă), iar o comandă de după Z pornește din start. O glifă cu un arc se
     sare, numărată ca o glifă stricată;
   - **crenarea:** `hkern`, cu `u1` / `u2` (caractere, liste și intervale `U+…`, cu `?`) și `g1` / `g2` (nume); prima
     pereche care prinde două glife câștigă; `k` strânge literele, deci crenarea e −k;
   - **recunoașterea** e cea de la punctul 1: un font SVG cu glife pline (închise cu Z, fără contururi fără arie) e un font
     obișnuit, cu normalizarea și aldinul lui.

   Regula buclei (punctul 2) își păstrează acum punctul final, chiar când e primul: o cubică (CFF, SVG) care se termină în
   start are nevoie de el; segmentul de lungime zero de după el se sare la așezare. Pe fonturile TTF și CFF ale corpusului
   nu se schimbă nimic (fixturile oracolului au rămas aceleași).

## Cifrele (măsurate, gzip 9)

| | Înainte (7.5↑) | După (7.6↑) | După (7.6↑b) |
|---|---|---|---|
| Pornirea (cu ușa) | 98,6 (102,2) / 110 kB | 98,6 (102,2) / 110 kB | 98,6 (102,2) / 110 kB |
| Totalul JavaScript | 444,6 / 500 kB | 445,6 / 500 kB | 447,2 / 500 kB |
| Bucata textului (`calcul`) | — | 16,8 kB | 18,2 kB (cititorul SVG și garda entităților) |
| Precache | 80 de fișiere, 610,3 kB | 82 de fișiere, 626,3 kB (fontul și licența) | 82 de fișiere, 628,1 kB |

În 7.6↑b, parserul căilor SVG (`svgDate.ts`, 1,8 kB) a trecut din bucata importului în cea comună, fiindcă îl folosesc
amândouă; garda entităților, mutată într-un modul al ei, nu trage după ea ușa SVG întreagă (cu ea din `svg.ts`, bucata
comună creștea cu 17 kB).

## Probele

**Felia 7.6↑:**

- **Oracolul independent** (`linie` în `test/oracles-py/text_corpus.py`, `test/fixtures/text/linie.json`, fontTools 4.67):
  recunoașterea și trăsăturile scrise din nou acolo, pe punctele citite de fontTools; recunoașterea pe toate fonturile
  corpusului (Roboto, Droid Serif, Inter: nu; Relief și variantele lui: da); șapte cazuri, contur cu contur, cu starea
  fiecărei trăsături, sub 1e-9 mm: Relief (cu diacriticele, cursivul, crenarea, spațierea negativă, rândurile centrate și
  la dreapta), varianta lui **dus-întors** (aceleași trăsături ca Relief), varianta cu **bucle** (O cu ultimul punct în
  primul, o cu ultimul punct în afara curbei) și varianta **CFF** (scrisă de fontTools cu `T2CharStringPen`).
- **Pe hârtie:** H de 20 mm din Relief, la s = 20 / 680 mm pe unitate: trei linii deschise, x = 140 s = 4,1176 și 566 s =
  16,6471, bara la 365 s = 10,7353; O începe la 706 s = 20,7647, din (357, 680) în (359, 680), deschis (golul 0,0588 mm).
- **Probele țintite** (`test/unit/text.linie.test.ts`): regulile trăsăturii pe contururi scrise de mână; o buclă care trece
  de două ori pe același loc (rămâne dublă); aldinul ignorat, cursivul aplicat; piesa (forme deschise, gravura pe linie, 1
  mm pe o foaie de 18 mm, 0,6 pe una de 1,2); editarea în ambele sensuri; previzualizarea (calea lui H, pe hârtie; buclele
  desenate cu linia).
- **E2e** (`test/e2e/text.spec.ts`, Edge): Relief ales, Aldin oprit cu motivul, previzualizarea cu linia, piesa pe o foaie de
  1,2 mm: H din trei linii deschise, de la 0 la 20 mm, gravate pe linie la 0,6 mm, fără aldin în bloc.
- **Mutațiile** (`test/otravuri/7.6.py`): 23; 22 prinse din prima (18 pe probele unitare, 4 de interfață, prin e2e) și una
  scăpată, normalizarea trăsăturilor (pe corpus, normalizarea nu schimba nimic: bucla dublă a venit atunci, ca probă nouă, și
  o prinde).

**Felia 7.6↑b (fonturile SVG):**

- **Oracolul independent** (`fonturi_svg` în `test/oracles-py/text_corpus.py`, `test/fixtures/text/svg.json`): fontul citit
  cu `xml.etree`, căile cu `parse_path` din fontTools (cu `RecordingPen`), crenarea `hkern` scrisă din nou; cinci cazuri:
  fontul SVG original al lui Relief (HOTEL; rândurile cu diacriticele și cursivul; crenarea, cu spațierea negativă), un font
  de probă cu trăsături (comenzile L, H, V, C, S, Q, T, buclele cu Z, o trăsătură de după Z, un arc, o ligatură, crenarea pe
  nume, pe caractere și pe intervale) și unul plin (nerecunoscut cu o linie); contur cu contur, sub 1e-9 mm, plus
  caracterele lipsă și glifele sărite.
- **Pe hârtie:** majusculele (Relief 680; fontul de probă 1400, vârful lui H, nu `cap-height` 1500; cel plin 700); H-ul
  fontului SVG al lui Relief e chiar H-ul TTF-ului; la 14 mm (0,01 mm pe unitate): A la 13 (avansul fontului), L la 25, cu
  trăsătura (27, 14) → (27, 0) → (34, 0), O la 36,4 (L–O: k = 60), iar H–O cu 0,8 mai larg (k = −80); D: bucla și
  trăsătura de după Z, din (x + 2, baza) în (x + 9, baza + 3).
- **Probele țintite** (`test/unit/text.svg.test.ts`): recunoașterea după conținut (un desen SVG, și unul cu `<font-face>`,
  nu e un font), refuzurile (fără caractere, fără H și fără `cap-height`, XML stricat, bomba de entități refuzată înaintea
  parserului, documentul parțial al browserului cu `<parsererror>`, `units-per-em` greșit, fața a doua), mărimile
  implicite, dublurile (prima câștigă), intervalele cu „?”, fețele pentru Fonturile mele, glifa cu arc sărită, crenarea
  (prima pereche, intervalul) și avansurile.
- **E2e** (`test/e2e/fonturi.spec.ts`, Edge): fontul SVG al lui Relief încărcat în Fonturile mele e recunoscut cu o singură
  linie (Aldin oprit, previzualizarea cu linia); H din trei linii deschise, de la 0 la 20 mm, gravate pe linie; după
  reîncărcare, textul se editează cu el.
- **Mutațiile** (`test/otravuri/7.6b.py`): 27; 25 prinse din prima (24 pe probele unitare și F01, `accept`-ul ferestrei, prin
  e2e) și două scăpate: U05 (un desen SVG cu `<font-face>`, fără `<font>`, luat drept font: proba lipsea, adăugată) și R05
  (comanda de după Z continuă bucla: echivalentă, fiindcă parserul pune singur M-ul în start; ramura moartă a cititorului s-a
  scos, cu mutația ei). Pe codul final, 26 din 26.

## Ce am respins

- **Fontul SVG al lui Relief** ca font inclus: TTF-ul inclus are aceleași trăsături (H-ul e același, pe corpus); fontul
  SVG rămâne fixtura probelor (176,6 kB, fără subset).
- **Arcele în glifele SVG**: fonturile de gravură scriu linii și curbe Bézier (Hershey, EMS, Relief); o glifă cu un arc se
  sare, numărată, fără să strice restul fontului.
- **`<missing-glyph>`, `horiz-origin-x`, `vkern`, glifele verticale**: un caracter lipsă se sare (fără glifa lipsă), iar
  restul nu-l folosesc fonturile de gravură; textul vertical (7.7↑) își judecă singur metricile.
- **OpenType-SVG** (tabelul `SVG ` al lui Relief OTF-SVG): o pagină SVG pe glifă, cu transformările ei; nu e nevoie de el.
- **Închiderea buclelor cu suprapunere** (O-ul de 2 unități): ar schimba desenul autorului; regula golului e a importurilor.
- **O bifă „font cu o singură linie”** la încărcare: recunoașterea e sigură pe fonturile corpusului și pe cele ale mașinii;
  se redeschide dacă un font real o păcălește.
- **Aldinul pe linii** (un contur în jurul fiecărei trăsături, prin offsetul deschis, ADR 0037 §5): ar face din font un font
  plin, rotunjit; o altă decizie, a owner-ului.

## Limite și neprobat

- **Fonturile SVG:** doar primul `<font>` dintr-un fișier; `font-face-src` (fonturi externe) nu se urmează (ușa e
  inertă). Un punct scris ca trăsătură de lungime zero (`M x y Z`, `M x y L x y`) se sare, ca o cale degenerată a
  importului, fără să-l spună panoul; o trăsătură închisă cu Z dus-întors (`M A L B Z`) rămâne o buclă, gravată dus-întors.
- **Un font cu o singură linie fără litere drepte** (doar de mână, script) n-ar fi recunoscut; **un font obișnuit cu
  contururi fără arie la cel puțin două litere drepte** ar fi luat drept unul cu o linie. Niciunul nu e pe mașina asta.
- **Crenarea lui Relief** inclus e cea din GPOS-ul TTF-ului; fontul SVG al lui își citește perechile `hkern` (658).
- **Placa etapei 7** rămâne de tăiat; o gravură pe linie cu Relief se poate pune pe ea.

## Se redeschide dacă

- recunoașterea greșește pe un font real (unul cu o linie neluat drept atare sau invers);
- owner-ul vrea aldinul și pe fonturile cu o linie;
- un font real își scrie trăsăturile după altă convenție (de exemplu, un font SVG cu arce sau cu trăsăturile închise cu Z).
