# Etapa 2 — Profilul complet, pe geometrie exactă

**Ținta** (`PLAN.md` §5.3): decupezi o piesă reală, cu urechi, intrări și dog-bone, desenată sau importată din SVG.

**Starea:** pornită pe 08.10.2026, la cuvântul owner-ului („poți să continui”), înaintea plăcii 1. Etapa 1 se închide
cu placa 1, tăiată de owner. Pe 08.10 nu mai avea nicio felie care să nu depindă de el.
- **Instanța de test:** adresa principală (`cncvectorstudio-test`) primește aplicația abia după exportul Firestore pe
  proiectul de test. Până atunci, ce e de încercat merge pe canalul `etapa-01`.
- **Operațiile intră în document** (schema v3, cu migrare): profilul, cu urechile, intrările și dog-bone-ul, e o
  operație a piesei (glosarul din `PLAN.md` §2, rândul 11), nu un parametru al dialogului de export.

## Feliile

Bugetul unei felii e ~½ zi activă, până la prima măsurătoare (`PLAN.md` §5.1). Articolele și clasele vin din
`docs/faza2/arhitectura/estimare.md`.

| # | Felia | Articolul | Clasa | Depinde de |
|---|---|---|---|---|
| 2.1 | Gărzile offsetului (s1-V §5): intrarea curățată (vârfuri repetate, linii aproape coliniare, autointersecții refuzate cu motiv), ieșirea validată (buclă deschisă, gol, aria monotonă în distanță, segmente sub 1 µm), rezoluția declarată de 0,01 mm; corpusul din s1 / s1-V în CI | I10d | R2 | — |
| 2.2 | Operațiile în document (schema v3, cu migrarea v2 → v3): profilul ca operație a piesei, cu scula și parametrii; exportul le citește din document | I3, B1 | R2 | 2.1 |
| 2.3a | Regiunea păstrată (ADR 0026), cu oracolul întâi (invarianta 2 în poartă, sesiune independentă); exportul refuză tăietura care intră într-o piesă | B1 | R2 | 2.2 |
| 2.3b | Sensul de tăiere (urcare / opoziție), pe operație, cu implicitul ales de owner; schema v4 | B1 | R2 | 2.3a |
| 2.3c | Profilul pe orice contur: și pe cele deschise, pe o parte (stânga / dreapta), la nivelul CAM, pentru importul SVG (din 09.10, lângă 2.7: n-are contururi deschise până la import) | B1 | R2 | 2.3a |
| 2.4 | Urechile ca modificator Z(s), portate cu cele 88 de verificări pe hârtie; vârful urechii măsurat de la fundul materialului (`docs/PORTARE.md` §3.1) | B1 | R2 | 2.3a |
| 2.5a | Rampa (ADR 0029, documentul v6): bucla tăiată continuu, intrarea rotită, compusă cu urechile (portată, `docs/PORTARE.md` §3.2) | B1 | R2 | 2.4 |
| 2.5b | Intrările și ieșirile, alese față de regiunea păstrată (ADR 0030, documentul v7; portate, `docs/PORTARE.md` §3.2), fără rampă | B1 | R2 | 2.5a |
| 2.5c | Intrările compuse cu rampa: rampa pe sfertul intrării (ADR 0031; din 10.10, nu „bucla tăiată continuu”: invarianta 1 cere ieșirea coborâtă cu un pas la fiecare trecere) | B1 | R2 | 2.5b |
| 2.6 | Dog-bone și T-bone | B2 | R1 | 2.3a |
| 2.7 | Importul SVG: DOMParser inert, unități, viewBox, transformări, plafonul de mărime; biarcele (T6) cu bugetul de toleranță (`docs/PORTARE.md` §3.3); fațada PathKit minimă (reuniunea + R3) pentru normalizarea `nonzero` de la ușă | A4, I10b | R2 | 2.1 |
| 2.7a | Biarcele (ADR 0033): cubica devine arce sub toleranța proiectului (0,001 mm), cu abaterea în ambele sensuri, eșecuri explicite, bugetul de toleranță într-un singur loc; doar geometria, cu oracolul | I10b | R2 | 2.1 |
| 2.7b | Forma „cale” în document (v9): contururi închise din linii, arce și cubice; desenul pe pânză; CAM-ul prin biarce | A4 | R2 | 2.7a |
| 2.7c | Ușa SVG: DOMParser inert, unități, viewBox, transformări, elementele (path, rect, circle, ellipse, line, polyline, polygon), plafonul de mărime, avertismentele; butonul de import | A4 | R2 | 2.7b |
| 2.7d | Normalizarea `nonzero` la ușă (ADR 0036: aranjamentul exact în double, fără PathKit; înlocuiește fațada PathKit + R3 din plan), încărcată doar la import | A4 | R2 | 2.7c |
| 2.8a | Carcasa interfeței (aranjamentul, tokenurile temei, componentele), din prototipul ales de owner dintre trei (13.10, „da, pornește prototipurile”) | — | R1 | — |
| 2.8b | Fișierele lăsate pe planșă (cererea owner-ului, 13.10): unul sau mai multe SVG-uri trase pe pânză trec prin dialogul importului pe rând și cad cu centrul unde au fost lăsate | A4 | R1 | 2.7c, 2.8a |
| 2.8-0 | Loc în pachetul de pornire pentru 2.8 (99,9 → 96,1 kB din 100): ușa de încărcare a proiectului vine la cerere; pornirea fără `await` la nivelul modulului (altfel bucata adusă la cerere în timpul pornirii se bloca) | — | R1 | 2.8b |
| 2.8 | Stratul WebGL2 (traseul ca LINE_STRIP; foaia rămâne în workerul vectorilor până la etapa 4; ADR 0038) și panoul de proprietăți editabil, în carcasa din 2.8a; sub-feliile 2.8c–2.8e | I7, I19 | R2 | 2.2, 2.8a |
| 2.9 | Bancul vizual v1, cu martorii lui | I18 | R2 | 2.8 |
| 2.10 | Fișa plăcii 2, cu programele de aur | — | R2 | 2.4–2.7 |

**2.8, traseul pe pânză și panoul de proprietăți: planul (16.10), contractul în ADR 0038 (acceptat pe 16.10, „ok” la implicit).**
Sub-feliile, fiecare cu commit, publicare pe test și raport:
- **2.8c, panoul editabil** (fără agenți, 2–3 segmente de ~1–2 % din săptămânal): câmpul numeric unic (semnul, virgula,
  Enter / Escape, motivul); acțiunile `instanta.pozitie`, `instanta.rotire`, `foaie.stoc`, fiecare un pas de anulare, cu
  refuzurile (fila care doar citește, plafoanele); testele pe acțiuni și e2e pe panou. Pornirea rămâne sub 100 kB (panoul
  e deja la cerere).
- **2.8d, traseul pe WebGL2** (fără agenți, 2–3 segmente): acțiunea „Arată traseul” (tasta T), traseul vechi stins cu cip,
  stratul la cerere, deasupra vectorilor, LINE_STRIP relativ la bucată, arcele la ½ px pe treapta de zoom, bugetul de
  segmente măsurat la pornire, refuzul fără WebGL2 și refacerea la contextul pierdut; testele aplicației (e2e cu pixelii
  citiți din canvas).
- **2.8e, probele independente** (cu agenți, după resetarea din 17.10; ~0,5–1 M fiecare): oracolul stratului (pixelii din
  textul G-code și vedere, fără importuri din `src/`), recenzia panoului și a stratului, otrăvurile.
*Gata când:* owner-ul vede traseul unui SVG importat pe instanța de test și mută / rotește o piesă din panou; oracolul
stratului trece, cu sabotajele prinse; CI-ul e verde.

**2.3c, contururile deschise: încheiată pe 16.10.** Contractul e ADR 0037, documentul v10. Sub-feliile, fiecare cu
commit, publicată pe instanța de test și cu CI verde:
- **2.3c-0** (`1a337e6`, `66f80fc`): pe linie, freza stă pe linie; un arc aproape nul se scrie linie; invarianta 14 (i) în
  poartă (sesiune independentă);
- **2.3c-1** (`812996a`): ușa SVG închide formele umplute fără Z (ca browserul) și sare praful;
- **2.3c-2** (`bfb92ce`): documentul v10 (marcajul `despartire`) și căile deschise tăiate pe linie, cu poarta și oracolul
  documentului amendate independent;
- **2.3c-3** (`e60d689`, `b91be31`): liniile deschise intră pe ușa SVG ca căi deschise, gravate pe linie; săgeata de sens
  doar pe căile tăiate pe o parte (decizia owner-ului);
- **2.3c-4** (`f20647e`, `38449cf`): offsetul deschis cu verificarea ieșirii și porțiunile neatinse; oracolul independent
  (120 de teste, 46 de sabotaje prinse);
- **2.3c-5** (`01c84ec`, `8ad09fc`, `0de24ad`): tăietura pe stânga / dreapta în CAM, pereții, dialogul, săgeata; poarta
  amendată independent (65 de teste, 38 de sabotaje prinse);
- **recenziile:** A (`b1640fb`: 13 din 15 constatări reparate, 2 trecute în ADR) și B (`2ef4c72`: 7 reparate);
- **2.3c-6** (`9dab66c`, `31317e0`, `10044cf`): ușa SVG după precizarea §11 (o închidere fără arie e o linie), cu oracolul
  amendat independent; otrăvurile, alese și rulate de sesiuni independente: 115 (70 pe offset / CAM, 45 pe ușă, document și
  interfață), 86 prinse din prima, cele 29 scăpate închise cu câte un test țintit (unitar sau e2e), în afară de 2
  echivalente cu dovadă.

*Ce poate încerca owner-ul* (pe <https://cncvectorstudio-test.firebaseapp.com/>): un SVG cu linii (`<line>`, căi fără Z)
intră cu liniile deschise, gravate pe linie la min(1 mm, grosimea / 2); în dialogul exportului, o linie singură pe rând se
poate tăia pe stânga sau pe dreapta (săgeata arată sensul, liniuța partea frezei); o tăietură prin foaie care ajunge la
margine e refuzată nemarcată și trece cu „Despărțire” bifată, tăiată la urmă.

*Rămas deschis:* calculul offsetului pe căi foarte lungi (peste ~200 m de traseu verificat) e refuzat cu motiv până la
worker; intrările, urechile, rampa și degajările pe căile deschise sunt refuzate cu motiv („vin mai târziu”).

**2.3c-4, offsetul deschis: pregătit pe 15.10** (istoric; a pornit tot pe 15.10, fără să mai aștepte resetarea din 17.10). Contractul e ADR 0037
§5. Valorile pe hârtie 3–9 au fost refăcute de mână pe 15.10 și ies toate: semicercul (R47 / R53), L-ul (arcul R3,
1,93 mm² rămași în colț), cârligul (o bucată până la x = 42,172; neatins 14,828 mm), U-ul de 5 mm (refuz / 6 vârfuri),
V-ul de 10° (34,421 / 34,290 mm), oglindirea (Y53, de la X50 la X150). Cavalier e deja măsurat pe căile deschise (ADR 0037,
„Ce am măsurat”, punctul 3).

*Ce intră:* doar geometria: `offsetDeschis` în `src/geom/offset.ts`, cu verificarea ieșirii și `neatins`. Tăietura pe o
parte în CAM (traseul, sensul, pereții, refuzurile, dialogul, săgețile vizibile) e 2.3c-5. Nimic vizibil pentru owner.

*Două drumuri, în paralel:*
1. **Oracolul**, într-o sesiune independentă. Costul estimat: 0,5–0,9 M, după oracolele de la 2.1–2.7d. Promptul:
   > Ești o sesiune independentă: scrii oracolul offsetului deschis din ADR 0037 §5 (cu precizările 2.3c-4) și din „Ce
   > verifică oracolul” (al treilea punct). Din aplicație citești doar semnăturile `offsetDeschis` și
   > `verificaIesireDeschisa` (`src/geom/offset.ts`) și tipurile `Contur` / `Varf` (`src/geom/contur.ts`); nu citești
   > implementarea. (1) `test/oracles/offset-deschis.ts`: zero importuri din `src/`,
   > fără cavalier; offsetul deschis ideal pe linii și arce (c(t) + d·n(t) și evantaiele colțurilor convexe dinspre
   > sculă), păstrat unde distanța la toată calea e cel puțin |d|; distanța Hausdorff în ambele sensuri; `neatins` pe
   > hârtie. (2) `test/oracles/offset-deschis.cazuri.ts`: cazurile 1 și 3–9 de la „Valorile pe hârtie”, la nivel de
   > geometrie (fără G-code), plus un corpus: linii, arce, arce de peste 180°, L-uri și lanțuri cu colțuri convexe și
   > concave, cârlige, U-uri, V-uri înguste, zig-zag-uri, polilinii fine (L1·L2·sin θ < 1e-5 mm²), joncțiuni aproape
   > tangente de biarce, căi care se ating singure (refuz), capete în același punct (refuz), ambele părți, 3 raze.
   > (3) `test/unit/offset.deschis.oracol.test.ts`: legătura, cu `offsetDeschis` pe tot corpusul; acceptat = offsetul
   > corect sau un refuz, niciodată un traseu greșit; refuzurile numărate și raportate; „scula nu încape” doar unde
   > oracolul n-are niciun punct ideal valid. (4) Martorii negativi: partea inversată, o bucată scăpată, traseul
   > prelungit dincolo de normala capătului, traseul care ocolește capătul, ieșirea goală luată drept „nu încape”.
   > (5) Cel puțin 20 de sabotaje pe oracol, fiecare prins. Nu schimbi nimic în `src/`. Ce e ambiguu în contract
   > raportezi, nu ghicești.
2. **Aplicația**, în sesiunea principală:
   - **curățarea pe deschis:** `imparteArceMari`, `unesteVarfuri`, `scoateVarfuriPeLatura` și `seAtingeSingur` merg azi
     în cerc (`% n`). Primesc `inchis`: fără perechea ultim–prim; capetele nu se mută (un segment scurt de la capăt pierde
     vârful dinspre interior); vârfurile pe latură se scot doar din interior. Iertarea contactului fals între vecini (azi
     doar `c.inchis && n >= 3`) se aplică și pe deschis, fără perechea ultim–prim;
   - **`verificaIesireDeschisa`:**
     - forma bucăților și ordinea lor de-a lungul căii;
     - distanța: `distantaLaContur` și indexul știu deja căile deschise (`numarSegmente`);
     - partea: produsul vectorial; la un capăt, nici pe partea păstrată a tangentei, nici în capac;
     - atingerile, cu excepția dus-întors la 2R ± 1e-4;
     - acoperirea: eșantioane la cel mult 0,05 mm; un punct ideal e valid la cel puțin |d| − 1e-5 de cale; fiecare
       punct valid stă la cel mult 0,002 de traseu;
   - **reîncercarea** cu |d| + 1e-4, apoi refuzul. Cele două motive exacte: „scula nu încape pe partea cerută” doar fără
     niciun punct ideal valid; altfel „offsetul a eșuat lângă (x, y)”;
   - **`neatins`:** porțiunile cu punctele ideale invalide, cu lungimea și locul (cârligul: 14,828 mm);
   - **timpul:** acoperirea pe o cale de 10 m înseamnă 200 000 de eșantioane, prin indexul cutiilor. Se măsoară pe
     zig-zag-ul de 25 600 de segmente (ADR 0037, „Limitele”).

*Starea pe 15.10:* partea aplicației e gata (`offsetDeschis` și `verificaIesireDeschisa` în `src/geom/offset.ts`, 15 teste
ale autorului în `test/unit/geom.offset.deschis.test.ts`, 13 mutații ale verificării, toate prinse). Rămâne oracolul
independent. Precizările apărute la implementare sunt în ADR 0037 §5.

*2.3c-5 (15.10):* partea aplicației gata (tăietura pe stânga / dreapta în CAM, pereții, dialogul, săgeata), nepublicată
pe test până la poarta amendată (sesiunea independentă, în lucru) și recenzia B.

*Gata când:* testele de legătură ale oracolului sunt verzi, refuzurile sunt numărate (niciun „nu încape” fals pe cazul 8),
sabotajele oracolului sunt prinse și CI-ul e verde.

*După:* recenzia A (2.3c-0…3) poate rula în paralel cu oracolul. Urmează 2.3c-5 (cu recenzia B și amendarea porții) și
2.3c-6 (otrăvurile, alese de altă sesiune).

**Contractul gărzilor offsetului** (felia 2.1, din `docs/faza2/sonde/s1-geometrie/VERIFICARE.md` §5). Scris aici ca
fațada `offsetInchis` din `src/geom/offset.ts` și oracolul independent să-l implementeze separat. Versiunea 2, după
primul contact cu oracolul (08.10).
- **Ușa:** `offsetInchis(contur, distanta)` întoarce `{ ok: true, contururi }` sau `{ ok: false, motiv }`, niciodată o
  excepție. `distanta` > 0 înseamnă spre exterior, < 0 spre interior. Conturul e închis, din linii și arce (`bulge`); o
  cubică e refuzată cu motiv până la biarce (felia 2.7). **La distanța 0**, conturul trece prin aceleași gărzi de intrare
  (un contur autointersectat e refuzat), iar dacă trece, iese neschimbat (exact intrarea primită).
- **Rezoluția declarată e 0,01 mm.** O distanță cu 0 < |d| < 0,005 mm e refuzată cu motiv (sub rezoluție).
- **Toleranța de atingere e 1e-6 mm:** două puncte mai apropiate sunt unul; două segmente mai apropiate se ating.
- **Intrarea se curăță, fără să-și schimbe forma:**
  - un arc de peste 180° (|bulge| > 1) se împarte în două jumătăți pe același cerc, fiecare cu bulge-ul tan(atan(b) / 2);
  - un arc cu |bulge| < 1e-6 e o linie;
  - un segment mai scurt de 1e-6 mm, **măsurat pe curbă** (un arc aproape întreg are coarda mică, dar nu e scurt), se
    scoate: capetele lui devin un vârf (rămâne vârful cu indicele mai mic; la perechea ultim–prim rămâne primul);
  - un vârf între două linii se scoate dacă stă la mai puțin de 1e-6 mm de dreapta dintre vecinii lui și între ei (un
    vârf în plus pe o latură dreaptă), nu dacă ar întoarce drumul înapoi.
- **Intrarea care nu se poate decala e refuzată cu motiv:** mai puțin de 2 vârfuri distincte (cercul are 2, cu două
  arce de 180°), un contur mai mic decât rezoluția (diagonala cutiei vârfurilor sub 0,01 mm), sau un contur care se
  autointersectează (aria zero, de exemplu două vârfuri legate doar de linii, e un caz al lui): două
  segmente neînvecinate care se ating, două segmente vecine care se suprapun pe o lungime, sau două segmente vecine care
  se taie și în alt punct decât vârful lor comun. Aria și orientarea se calculează exact, cu arcele (nu pe coarde).
- **Ieșirea se verifică singură, nu doar ca formă:**
  - fiecare contur e închis, are cel puțin 2 vârfuri și numai coordonate finite; segmentele de lungime sub 1e-6 mm se
    scot, cele scurte, dar reale, rămân (postul scrie G1 acolo unde coarda e sub 10 rezoluții);
  - aria netă crește la exterior și scade la interior; un interior care dispare înseamnă „scula nu încape”, cu motiv;
    un exterior gol e un eșec;
  - **fiecare punct al traseului stă la |d| de conturul de intrare** (abaterea în ambele sensuri, Hausdorff, e cel mult
    0,002 mm), afară la exterior și înăuntru la interior;
  - **niciun contur nu se atinge pe el însuși, și nici două contururi între ele**: freza ar trece de două ori pe același
    loc;
  - **orientarea:** insulele merg în sens trigonometric, găurile în sens orar (adâncimea de includere pară = insulă).

  La o verificare picată se încearcă o dată cu |d| + 1e-4 mm, apoi se refuză cu motiv. Pasul trece de pragul de
  topologie pe care îl decide epsilon-ul lui cavalier (s1-V §5.4): la un gât lat exact cât 2d, cavalier dă un contur care
  se atinge singur, iar la 1e-4 mai încolo, cele două insule corecte (măsurat pe 08.10). 0,1 µm e sub rezoluția postului. **Niciodată un traseu tăcut greșit:**
  pentru orice intrare validă, aplicația dă fie offsetul corect, fie un refuz cu motiv.
- **Ce trebuie să reușească:** cercurile, dreptunghiurile (rotunjite sau nu, rotite), haltera și inelul cu fantă din
  s1, la scările 1–2 440 mm, adică formele cu care se lucrează azi și cele de pe placa 2.
- **Ce poate fi refuzat, cu motiv, până la reparațiile lui cavalier** (ADR 0005) **și la biarce** (felia 2.7):
  poligoanele oarecare din linii și arce și poliliniile dense. Măsurat pe 08.10: la un poligon de 600 de laturi pe raza
  1, cavalier se abate cu 0,017 mm; la un poligon de 13 vârfuri pe scara 1, offsetul interior de 0,0755 se taie singur
  într-un punct. Pentru ele, oracolul acceptă offsetul corect sau un refuz, niciodată un rezultat greșit, și numără
  refuzurile (cifra intră în fișă, ca dovadă pentru reparații).
- **Topologia** se judecă pe puncte: un punct e în rezultatul exterior dacă e în conturul de intrare sau la cel mult |d|
  de marginea lui; în rezultatul interior, dacă e în contur și la cel puțin |d| de margine. Punctele dintr-o bandă de
  max(2e-4 × diagonala, 0,003 mm) în jurul marginii așteptate nu se judecă. Interiorul rezultatului se citește cu regula
  `evenodd` (ADR 0003). Banda e grosieră la mărimea foii; abaterea în ambele sensuri (de mai sus) e verificarea fină.
- **Limita cunoscută:** un contur se decalează singur. Găurile unei litere sau ale unei piese se decalează împreună abia
  cu regiunea păstrată (felia 2.3).

## Placa 2

MDF 12, freză Ø6.

| Cota | Valoarea | Toleranța |
|---|---:|---:|
| piesa, cu colțuri R10 | 120,00 × 80,00 | ±0,2 |
| colțul (leră) | R10 | — |
| grosimea urechii | 2,0 | ±0,2 |
| lungimea urechii | 8,0 | ±0,5 |
| gaura cu dog-bone | 40,00 × 30,00 | ±0,2; cepul 40 × 30 intră fără forță |
| logoul SVG, cu lățimea declarată 80 mm | 80,00 | ±0,3 |
| urma de intrare în piesă | 0 | ≤ 0,1 |

Placa confirmă regiunea păstrată (defectul care a stat ascuns 105 zile în ediția întâi) și urechile pe hârtie.
**Live:** nu.

## Rândurile de prag

Se închide profilul (B1, B2). Importul SVG (A4) se închide pe partea lui de SVG.

## Jurnalul feliilor

| # | Started | Completed | Treceri | Nota |
|---|---|---|---:|---|
| 2.1 | 08.10 16:08 | 08.10 17:15 | 4 | Gărzile offsetului, după contractul din fișă (versiunea 2). Oracolul l-a scris o sesiune independentă, doar din contract: 83 de teste de legătură, 22 de sabotaje pe oracol și 12 stricăciuni ale aplicației, toate prinse. **La primul contact a găsit un offset greșit și tăcut:** la halteră, exteriorul de 1 mm ieșea la 0,15 mm de intrare (arcele de peste 180°, pe care cavalier nu le primește); plus inelul refuzat degeaba și poligoanele dese refuzate de toleranța implicită a lui cavalier (1e-5). Ieșirea se verifică acum singură: distanța fiecărui punct, partea, atingerile, orientarea. Refuzuri pe „corect sau refuzat”: 2 din 213 (cavalier se taie singur pe un poligon de scara 1; se abate cu 0,017 mm pe o polilinie densă). La un gât lat exact cât 2d, a doua încercare cu +1e-4 mm dă cele două insule corecte. 19 otrăvuri pe fațadă, 18 prinse (cea scăpată, coarda în loc de curbă, e echivalentă după împărțirea arcelor mari). **Treceri:** (1) gărzile; (2) oracolul: haltera, inelul, poligoanele dese, apoi contractul v2 (zece pericole ale lui); (3) curățarea ieșirii muta arcele, deci rămân segmentele scurte reale; (4) otrăvurile: verificările ieșirii n-aveau caz care să le declanșeze, deci au devenit testabile direct. 624 de teste unitare, 26 e2e. |
| 2.2 | 08.10 19:01 | 08.10 22:45 | 6 | Operațiile în document (ADR 0025, schema v3, migrarea v2 → v3): profilul, cu latura, adâncimea, pasul și freza, stă în piesă; se salvează, se anulează cu Ctrl+Z, iar exportul le citește din document. Placa 1 iese neschimbată după migrare (implicitele sunt cele de până acum). Oracolul v3 l-a scris o sesiune independentă: 752 de teste de legătură verzi pe aplicație, 38 de sabotaje pe oracol prinse. **Recenzia adversarială** (21 de agenți, 3,0 M, 100 min; anunțasem 1,5 M) a confirmat 15 din 17 constatări, cea mai gravă: în fila care citește, dialogul de export arăta valori vechi și, după preluarea scrierii, le scria înapoi peste munca celeilalte file. Plus virgula zecimală („2,5” era 25, salvat și tăiat), frezele amestecate, bucla pătratică, o filă care nu putea citi versiunea nouă și ținea blocarea. **Reverificarea** (un agent, 0,30 M): 7 din 7 reparate, 6 probleme noi mici, 5 reparate (colțul și Z0 nu se mai pierd la o versiune nouă, exportul în curs aruncat se spune, numerele se arată exact, fila „necitită” nu exportă versiunea veche, „aceeași sculă” = număr + diametru peste tot). **Otrăvuri:** 51 pe instantaneu și 33 pe codul final, într-un worktree în afara Drive-ului; toate prinse în afară de un mutant echivalent (garda din aplicație pentru o scriere pe care dialogul n-o permite); 5 goluri închise cu teste noi. **Treceri:** (1) implementarea, plus garda marginilor (Ø150 ar fi salvat un proiect care nu se mai deschide); (2) oracolul și elementul oglindit; (3) recenzia; (4) otrăvurile, cu 4 teste noi; (5) reverificarea; (6) runda finală de otrăvuri. 1022 de teste unitare, 35 e2e. |
| 2.3a | 09.10 07:36 | 09.10 09:15 | 4 | Regiunea păstrată (ADR 0026): inelele din laturile declarate (exterior = piesă, interior = gol), includerea, K și partea proprie, măsurate exact (distanța segment–segment pe linii și arce, `src/geom/apropiere.ts`); exportul refuză, cu motiv și loc, tăietura care intră într-o piesă, inelele care se ating și elementul cu ambele laturi. Oracolul (sesiune independentă, 0,49 M): acord în ambele sensuri pe 346 de documente (212 programe, 134 de refuzuri); 44 de sabotaje pe oracol, prinse. **Recenzia** (o lentilă + 3 verificatori, 0,62 M, 29 min): 3 constatări mici, reparate: rotunjirea postului intră în contract (pragul pe G-code e R − ε − 0,002), pragul nu coboară sub 1e-6 (freza Ø0,01), motivul spune marginea cea mai apropiată. **Plus:** un fals pozitiv vechi al porții (semicercul de 180,002° după rotunjire), reparat de sesiunea oracolului; fila care citește pierdea o versiune salvată între deschidere și abonare (test instabil, o dată din zece), reparat. **Otrăvuri:** 25, 22 prinse, 3 echivalente (o ramură redundantă, scoasă din cod). **Treceri:** (1) contractul și aplicația; (2) recenzia; (3) oracolul și falsul pozitiv al porții; (4) otrăvurile și abonarea filei care citește. 1068 de teste unitare, 36 e2e. |
| 2.3b | 09.10 19:05 | 09.10 21:15 | 4 | Sensul de tăiere pe operație (ADR 0027, documentul v4 cu migrarea v3 → v4), implicit urcare (decizia owner-ului); dialogul are coloana Sens; numerele cu virgulă în română; placa 1 regenerată. **Recenzia (0,48 M, 22 min) a prins o greșeală critică a contractului:** prima versiune a ADR-ului avea regula întoarsă (urcare = materialul în stânga), preluată din notițele ediției întâi; aplicația o urma întocmai, deci „urcare” tăia în opoziție, iar testele care copiau tabelul treceau. Reparat înainte de orice publicare: urcare = materialul păstrat în DREAPTA (G41 + M3); gaura rămâne în G3, insula trece în G2; convenția e ancorată într-un test fizic (modelul așchiei), care pică pe tabelul vechi. Oracolul (sesiune independentă, 0,62 M, 116 min, construit pe tabelul reparat și pe un model propriu al așchiei): documentul v4 și invarianta 9 în poartă; 370 de cazuri de lipire, 806 bucle judecate, fără încălcări; 40 de sabotaje, prinse. E2e-ul exportului dă porții documentul salvat (invariantele 2 și 9 pe programul din browser). Otrăvuri: 16 din 16 prinse. **Treceri:** (1) contractul și aplicația; (2) recenzia și tabelul reparat; (3) oracolul; (4) otrăvurile. 1434 de teste unitare, 37 e2e. |
| 2.4 | 09.10 21:57 | 10.10 09:20 | 5 | Urechile (ADR 0028, documentul v5 cu migrarea v4 → v5 și `urechi: null`): profilul Z(s) al ediției întâi, portat ca modificator peste trecerea din IR (liniile și arcele tăiate exact, flancul pe arc ca elice); vârful urechii de la fața de jos a foii, deci puntea are grosimea cerută și cu supracursă (parametru al exportului, implicit 0); lățimea care nu încape e refuzată, nu strânsă; coloana Urechi în dialog (implicitele plăcii 2: 4 × 8 × 2). Pe forma plăcii 2, cele 4 urechi cad pe laturile drepte. **Recenzia (1,16 M, 25 min, 6 constatări, toate reale) a prins o gaură a contractului:** pe axa tăieturii, puntea ține grosimea doar pe W − D, deci o ureche mai îngustă decât freza lăsa piesa liberă; acum e refuzată. Plus: bucățile de arc sub 1e-6 mm deveneau cercuri întregi (la W ~1e-11, 22 mm în piesă), flancul care coboară mergea pe verticală de până la 3,3 ori avansul de plonjare, un Exportă fără schimbare lăsa un pas de anulare fantomă după redeschidere; motivul și rândul urechilor din dialog. Oracolul (sesiune independentă, 0,67 M, 74 min): documentul v5, invarianta 9 amendată (Z-ul se schimbă sub fața de sus fără să rupă drumul), invarianta 10 (profilul pe fiecare buclă, refuzurile, viteza pe verticală), oracolul pe hârtie cu cele 6 cazuri vechi, gaura, placa 2 și supracursa; 36 de sabotaje prinse, 5 martori negativi. Otrăvuri: 37 din 37 prinse (una scăpase întâi; testul avansului pe flanc cere acum plafonul exact). Pauză 10.10 00:05–08:30. **Treceri:** (1) contractul; (2) aplicația; (3) recenzia și reparațiile; (4) oracolul; (5) otrăvurile. 1861 de teste unitare, 39 e2e. |
| 2.5a | 10.10 10:30 | 10.10 14:35 | 5 | Rampa (ADR 0029, documentul v6 cu migrarea v5 → v6 și `rampa: null`): bucla se taie continuu, fără ridicare între treceri; rampa pe Lr = min(lungime; P/2), Z = max(rampă, profil), tura plină care o re-acoperă și merge până la intrarea următoare, intrarea rotită și scoasă din zonele urechilor (fără coborârea verticală a ediției întâi). Parcurgerea buclei generalizată (`src/cam/parcurgere.ts`, desfășurată); urechile o folosesc neschimbat (396 de programe identice octet cu octet). Coloana Rampă în dialog (10 mm la bifă). **Recenzia (prima rulare moartă la limita săptămânală, 0,34 M; a doua, doar lentila CAM cu 2 verificatori, 0,60 M, 35 min) a prins o gaură a contractului:** rampa n-avea lungime minimă; la ≤ 1e-6 mm rămânea o pană de material pe primul segment al unei tăieturi prin foaie, iar sub rezoluția postului ieșea plonjare verticală. Acum: rampa minimă 1 mm, cu refuzuri, și toleranța declarată a invariantei 11 pentru bucata sub rezoluție. Oracolul (sesiune independentă, reluat după limită, 0,65 M): documentul v6, invariantele 9 și 10 amendate, invarianta 11, oracolul pe hârtie al rampei pe 8 cazuri × 8 montaje; 31 de sabotaje prinse; testele de legătură ale urechilor nu mai sunt sărite pe schema 6. Otrăvuri: 30 din 31 prinse; cea rămasă e echivalentă (IR identic pe 720 de bucle). **Treceri:** (1) contractul; (2) aplicația; (3) recenzia și reparațiile; (4) oracolul; (5) otrăvurile. 2386 de teste unitare (0 sărite), 40 e2e. |
| 2.5b | 10.10 15:27 | 10.10 19:10 | 5 | Intrările și ieșirile (ADR 0030, documentul v7 cu migrarea v6 → v7 și `intrari: null`): sferturi de cerc tangente pe partea deșeului (din regula sensului), alese din candidați (vârful 0, mijloacele celor mai lungi 12 segmente; raza, apoi jumătate) și verificate exact; bucla pornită din p₀ (urechile se mută cu ea); plonjarea în deșeu; intrarea omisă se spune la export (avertismentele, noi). Fără rampă: compunerea vine în 2.5c, până atunci refuz cu motiv. **Recenzia (o lentilă CAM + 3 verificatori, 0,74 M, 57 min) a prins două găuri ale contractului:** intrarea ignora marginea foii (la 7 mm de margine cerea confirmarea ieșirii, deși un alt candidat stătea în foaie: 384 din 1632 de așezări) și putea tăia legătura urechii unei piese vecine. Acum un semicerc încape doar dacă nu iese din foaie mai mult decât bucla și stă la cel puțin D + 1 mm de orice altă buclă cu urechi. O a treia constatare (ieșirea în miezul eliberat) a fost infirmată și trecută la limite. Oracolul (sesiune independentă, 0,69 M, 96 min): documentul v7, invariantele 9, 10, 11 amendate, 12 nouă, oracolul pe hârtie. Otrăvuri: 38 din 39 prinse; cea scăpată (dialogul care nu citește intrările din document) e acum prinsă: e2e-ul intrărilor redeschide dialogul, verificat cu otrava aplicată. Dialogul: câmpurile de număr mai înguste, ca opt coloane să încapă. **Treceri:** (1) contractul; (2) aplicația; (3) recenzia și reparațiile; (4) oracolul; (5) otrăvurile. |
| 2.5c | 10.10 19:53 | 11.10 01:10 | 6 | Intrările cu rampă (ADR 0031, documentul rămâne v7). Fișa cerea compunerea cu bucla tăiată continuu, dar invarianta 1 o interzice: ieșirea trebuie coborâtă cu un pas la fiecare trecere, deci freza trece prin deșeu la fiecare trecere. Pe o buclă cu intrare, fiecare trecere coboară prin aer în A până la fața de sus, apoi pe sfertul intrării, ca elice (avansul plafonat); bucla și ieșirea rămân cele din ADR 0030. Buclele fără intrare păstrează rampa din ADR 0029. Sub rampă, doar razele cu sfertul de cel puțin 1 mm (2/π mm), cerute și în dialog; nota din dialog. **Recenzia (o lentilă CAM + 1 verificator, 0,47 M, 41 min) a prins o gaură moștenită din 2.5b:** intrarea (ieșirea la −d_k și intrarea plată, fără rampă) putea tăia puntea unei urechi a buclei înseși. Pe o gaură R8 cu 2 urechi, intrările fără rampă nu lăsau nicio punte întreagă, iar poarta nu vedea. Acum semicercul stă la cel puțin D de coloana fiecărei urechi proprii (precizarea din ADR 0031; pe corpusul amprentelor se schimbă 8 programe de intrări cu urechi). Oracolul (sesiune independentă, 0,63 M, 126 min): invariantele 9, 11, 12 amendate, rampa pe intrare pe hârtie, punțile pe câmpul de înălțimi, 19 martori, 34 de sabotaje (33 prinse, unul imposibil structural). Otrăvuri: 27 din 30 prinse; cele 3 scăpate: două închise cu teste noi (coloana ultimei urechi pe o buclă nesimetrică față de p₀; bucata buclei care se termină în mijlocul unui arc), una echivalentă (lipirea capătului bucății, scoasă din cod). **CI:** testele unitare ajunseseră la 452 s din 600 pe un singur job; acum rulează în 3 felii paralele. **Treceri:** (1) contractul; (2) aplicația; (3) recenzia și reparațiile; (4) oracolul; (5) CI-ul feliat; (6) otrăvurile. |
| 2.6 | 11.10 08:59 | 11.10 13:52 | 6 | Degajările colțurilor (ADR 0032, documentul v8 cu migrarea v7 → v8 și `colturi: null`): pe fiecare colț concav pentru materialul păstrat, între două linii, traseul face drumul minim Q → E → Q, cu cercul frezei prin colțul piesei (dog-bone pe bisectoare, T-bone în peretele mai lung, ca la Vectric), la fiecare sosire în Q, și cu urechi, rampă și intrări. Ediția întâi punea un cerc separat cu centrul la r dincolo de colț: pe hârtie lăsa o așchie de ~0,29·r pe bisectoare. Condițiile: departe de buclele vecine (D + 1), de urechile buclei (D) și de marginea foii (1 mm); altfel, avertisment. Coloana Colțuri în dialog. **Recenzia (o lentilă CAM + 2 verificatori, 0,66 M, 38 min) a prins o gaură a contractului:** două găuri cu T-bone și un perete de 4–6 mm: fiecare crestătură trecea singură de condiție, dar se întâlneau și tăiau peretele, iar o bucată din piesă se desprindea fără avertisment. Acum candidatele se judecă și între ele (amândouă omise). Tot de la recenzie: marginea foii, conturul curățat ca la offset, avertismentul arcelor sub raza frezei, filtrul pe cutii (1600 de găuri: 1,3 s în loc de 13 s). Oracolul (sesiune independentă, 0,81 M, 96 min): documentul v8, invariantele 2, 9–12 amendate, 13 nouă, degajările pe hârtie, 15 martori, 37 de sabotaje (35 prinse, 2 echivalente). Otrăvuri: 35 din 36 prinse; cea scăpată e echivalentă (candidatele pe linie: o tăietură pe linie cu degajări e refuzată oricum de lucrare). **CI:** nivelul rapid în 4 felii. **Treceri:** (1) contractul; (2) aplicația și documentul v8; (3) recenzia și reparațiile; (4) oracolul; (5) CI-ul; (6) otrăvurile. |
| 2.7a | 11.10 15:08 | 11.10 17:40 | 5 | Biarcele (ADR 0033): cubica devine linii și arce sub 0,001 mm, cu bugetul de toleranță într-un singur loc (ținta 0,99, raza maximă a arcelor 9 900 mm, legată printr-un test de garda postului). Tăieturile: inflexiunile și vârfurile (din B′), regula liniei, extremele pe axe (bucăți monotone), înjumătățirea; abaterea în ambele sensuri, cu fiecare maxim local rafinat; refuzuri explicite. **Recenzia (o lentilă + 5 verificatori, 1,20 M, 67 min) a găsit abateri tăcute peste toleranță:** mânerul întors pe o cubică aproape dreaptă (18–414 × tol: întoarcerea cădea între eșantioane), vârfurile ratate din rotunjire (2,63 ×), vârful abaterii între eșantioane (1,13 ×), razele de până la 1e12 mm pe care postul le-ar fi aproximat a doua oară (2,05 ×). Toate reparate, cu cazurile în teste. Oracolul (sesiune independentă, 0,48 M, două treceri): 150 de cubice la 4 toleranțe, 229 de teste, 35 de sabotaje prinse. Otrăvuri: 13 din 26 la prima trecere; 4 au primit teste, 3 erau cod mort (scos), 5 sunt echivalente (căutare adversarială: 0,99000 × tol). Nimic vizibil pentru owner (cubicele intră cu 2.7b). **Treceri:** (1) contractul și fitter-ul; (2) oracolul și prima lui constatare; (3) recenzia și reparațiile; (4) oracolul pe contractul precizat; (5) otrăvurile. |
| 2.7b | 11.10 18:07 | 12.10 10:39 | 6 | Forma „cale” (ADR 0034, documentul v9): un contur închis din linii, arce și cubice; ușa (refuzurile, plafoanele de vârfuri, raza arcului ≤ 10 000 mm, matricea în lume), pânza exactă, clicul exact pe cubice, CAM-ul prin biarce o dată pe element. **Recenzia (2 lentile + 10 verificatori, 3,95 M) a găsit:** căile netede refuzate de offset (bucle de cavalier la liniile plate de lângă arce), contactele false ale arcelor mici tangente, arcul cu raza absurdă (un semicerc ascuns tăiat în piesă), matricile la limita similitudinii (pânza arunca la pornire), timpul O(n·m) (7 min → 2 s), atingerile scăpate, colțurile curbe tăcute; toate reparate. Oracolele (sesiuni independente): documentul / regiunea / poarta (~1,1 M) și cap-coadă pe G-code (~0,2 M, 0,99 × tol pe IR). Otrăvuri: 48, rulate din nou pe o clonă curată după pauză: 38 prinse; 4 au primit teste noi, probate pe otrava lor (refuzul biarcelor fără id-ul elementului, matricea în lume la ușă, Ctrl+D care copia formele, semnul din determinantul brut la oglindirea minusculă); 6 sunt echivalente, măsurat: regiunea care își recalculează conturul (aceleași biarce, deterministe; doar timpul), traversarea la capătul bucății (bisecția convergentă), rafinarea doar a minimului global (0 diferențe pe 200 000 de cubice), Newton fără secțiunea de aur și invers (cel mult 1,5e-12 mm, și pe 300 000 de cubice cu mânerul retras: fiecare ajunge singur). Nimic vizibil pentru owner (căile vin cu importul, 2.7c). **Treceri:** (1) contractul și codul; (2) oracolele; (3) recenzia și reparațiile; (4) oracolele pe contractul precizat; (5) C20; (6) otrăvurile. |
| 2.7c | 12.10 07:30 | 12.10 12:05 | 5 | Ușa SVG (ADR 0035): fișierul citit inert, unitățile și pagina (96 / 72 px, preselectat pentru Illustrator), transformările, cele șapte forme, gramatica căii; arcele rămân arce, elipsele devin cubice sub 1e-6 mm; latura din imbricare; piesa într-un pas de anulare; dialogul și butonul. **Oracolul (0,58 M)** a găsit centrul arcelor de 180° la √ε; **recenzia (2 lentile + 16 verificatori, 2,2 M)** 15 constatări, între ele imbricarea și perechile nonzero pătratice (334 s cu fila blocată), entitățile duble și ATTLIST, latura lipsă a paginii (×3,78), arcul aproape de 360°; toate reparate. Otrăvuri: 45 din 49; 3 cu teste noi, 1 cod mort scos. Pe test: „Importă SVG…”; logoul plăcii 2 tăiat la 80 + Ø6. Logourile de ecran (straturi suprapuse) se importă exact, dar exportul le refuză până la 2.8. **Treceri:** (1) contractul și ușa; (2) oracolul și constatările lui; (3) recenzia și reparațiile; (4) oracolul pe contractul precizat; (5) otrăvurile. |
| 2.7d | 12.10 12:15 | 13.10 09:55 | 6 | Regula `nonzero` la ușă (ADR 0036): **designul** (3 prototipuri + judecător, 1,71 M) a scos PathKit de la ușă (pierdea tăcut detalii de µm la scara foii și refuza textul real); aranjamentul exact în double, cu toleranța relativă la întindere, calea rapidă exactă, geometria ieșirii a sursei. **Recenzia (1,77 M)**: 8 constatări, între ele încrucișările la unghi mic ratate (lentila de înfășurare 2 ieșea gaură, tăcut) și clasele CSS Illustrator ignorate; toate reparate. **Oracolul (0,87 M)**: K1 (calea cu un vârf), K7 (forma sub τ). Logoul AS Roma de pe test: 2 refuzuri din mânerul retras rămas la 1 ulp după închidere, reparat la ușă. Otrăvuri: 45 din 54, plus 4 cu teste noi (2 goluri reale, tăcute: bucla cubicei pe calea rapidă, incluziunea pe bucăți monotone pe x), 5 echivalente. **Treceri:** (1) designul; (2) portarea; (3) recenzia și reparațiile; (4) oracolul, K1 și K7; (5) logoul AS Roma; (6) otrăvurile. |
