# ADR 0181 — Cuțitul pe pânză și opțiunile tăierii

**Starea:** acceptat pe 08.11.2026 (propus în aceeași zi), pentru feliile 10.3↑f–10.3↑k, fără mașină, în worktree-ul
`taiere` (ramura `wip/10.3-taiere-conversie`). Cererea owner-ului, din 08.11, după linia ADR 0180 încheiată: „vreau sa mai
lucram la taiere, vreau mai multe optiuni de taiere, si vreau un 'cutit' mai versatil”. Răspunsurile lui: „ok, la toate
recomandarile” (1a, 2a, 3a, 4a), cu nota „vreau sa putem adauga un shape/vector existent ca cutit, de exemplu am facut un text
anume si vreau sa decupez cu el sau cu alte forme deja existente” (§1, felul Formă, în 10.3↑f). **Completează:** ADR 0180 (tăierea exactă, cuțitul-formă,
închiderea, unde ajung bucățile și rolul lor), ADR 0050 și ADR 0051 (lipirea, desenul prin tragere), ADR 0063 (gestul
Pen-ului), ADR 0037 §5 (offsetul unei căi deschise), ADR 0130 (gruparea). **Schimbă** (răspunsul 4a): ADR 0180 §13 și „Ce am
respins” (tăierea cu un clic pe bucată). **Documentul:** neschimbat (v20): cuțitul uneltei nu se salvează, iar
rezultatul e din tipurile de azi.

**Problema.** Cuțitul de azi stă doar în panoul Taie: linia verticală X = …, cea orizontală Y = …, un ghidaj sau ultima formă
aleasă, care trebuie desenată întâi cu altă unealtă și rămâne în desen. Nu se poate tăia cu o linie trasă direct pe pânză, la
orice unghi, cu o curbă sau cu mâna liberă; nici despărți o formă într-un punct ales; nici scoate cu un clic capătul unei
linii care trece de colț (un DXF cu liniile prelungite); nici lăsa un spațiu între bucăți (un „O” de șablon, tăiat cu o fâșie
de 3 mm, își ține mijlocul legat de foaie); nici face din tăietura dreaptă o îmbinare (o firmă de 2 400 × 1 000 pe o masă de
1 200 × 900, tăiată în panouri care se prind în dinți sau în puzzle).

## Ce am aflat (cercetarea din 08.11)

- **În cvs2 există deja** [citit]: cuțitul-formă (ADR 0180, felia 10.3↑b) taie cu orice cale, deschisă sau închisă, dată în
  mm ai foii, exact, cu fețele și închiderea lui: unealta trebuie doar să-i dea calea, fără s-o pună în document. Gestul
  Pen-ului (ADR 0063: clic = colț, tragere = curbă, Enter termină), linia cu Shift în pași de 15° (`pe15`) și lipirea de
  ghidaje, noduri și grilă (ADR 0050) sunt ale desenului; netezirea (10.3↑e) face dintr-o trasare de mână curbe sub toleranță;
  offsetul unei căi deschise (`offsetDeschis`, ADR 0037 §5) o mută paralel, exact, cu verificarea lui. Unealta Noduri nu
  desparte o cale. Tasta K e liberă (Ctrl+K e paleta).
- **CorelDRAW** (referință funcțională, ajutorul lui) [citit]: cuțitul are trei feluri, linia din două puncte, curba Bézier și
  mâna liberă; taie ce trece; între bucăți lasă nimic, un spațiu sau o suprapunere, cu lățimea dată; bucățile se închid sau
  rămân deschise.
- **Illustrator** [citit]: cuțitul (mâna liberă, prin formele închise), foarfeca (desparte o cale într-un punct) și „Divide
  Objects Below” (o formă taie ce e sub ea și dispare).
- **Vectric** (Aspire, VCarve) [citit]: tăierea interactivă: un clic pe bucata unei linii o scoate, până la cele mai apropiate
  locuri comune cu alte linii; e unealta lor obișnuită pentru curățatul desenelor.
- **Panourile unei firme mari, pe CNC** [citit, ghidurile atelierelor]: îmbinările în puzzle și în coadă de rândunică;
  colțurile dinăuntru nu pot fi mai ascuțite decât raza frezei, deci modelul are toate colțurile rotunjite cu cel puțin raza
  ei, ca bucățile să se prindă; între ele, un joc de zecimi de mm.
- **Pe hârtie** [calculat]: pătratul 100 × 100 tăiat cu linia de la (−10, 20) la (110, 60): tăieturile în (0; 23,3333) și
  (100; 56,6667), bucățile de 4 000 și 6 000 mm²; la X = 50 cu spațiul 6: două dreptunghiuri 47 × 100 (4 700 mm²), cu
  suprapunerea 6: 53 × 100 (5 300); cercul R50 la X = 0 cu spațiul 6: două segmente de 3 627,171 mm²; inelul R50 / R30 la
  Y = 0 cu spațiul 3: două „U”-uri de 2 453,259 mm² (fără spațiu, 2 513,274); linia prin (20, 50) la 30°: tăieturile în
  (0; 38,453) și (100; 96,188), bucățile de 6 732,051 și 3 267,949 mm².

## Decizia

1. **Unealta Cuțit (K)**, în bara uneltelor, după Noduri. Cuțitul ei e o cale care trăiește doar cât gestul (nu intră în
   document); taie la capătul gestului (întrebarea 3), într-un singur pas de anulare, cu calculul în worker (cererea lui
   „Taie cu…” ultima formă, cu calea dată în locul formei). **Ce taie** (întrebarea 2): cu forme alese, doar pe ele; fără,
   tot ce trece, pe foaia de lucru. Bucățile ajung unde spune ADR 0180 §6 și își păstrează rolul (§7); refuzurile sunt cele
   de acolo (§12), spuse în bara uneltei. **Felurile**, butoane în bara uneltei (ca opțiunile celorlalte unelte):
   - **Linie** (implicit): din două puncte, cu o tragere sau cu clic și clic; Shift: pași de 15°, ca la Linie.
   - **Pen:** nod cu nod, ca Pen-ul (clic = colț, tragere = curbă); Enter sau dublu clic taie, Backspace scoate ultimul nod.
   - **Liber:** trasat cu mâna, netezit la ridicarea mausului (netezirea din 10.3↑e, la o jumătate de pixel a vederii: fină
     la zoom mare).
   - **Formă** (nota owner-ului): un clic pe o formă existentă (un text, un cerc, o piesă din mai multe contururi) taie cu
     ea; Shift + clic adaugă forme la cuțit, iar clicul fără Shift (sau Enter) taie cu toate. Contururile cuțitului se citesc
     împreună, par-impar, ca la o piesă cu mai multe contururi (un text: literele, cu găurile lor), deci un text taie dintr-o
     placă literele și placa cu golurile lor. Cuțitul rămâne (sau se șterge, cu opțiunea din §2); cu „Păstrează” înăuntru
     sau în afară, formele se decupează după el. Din panou, „Taie cu…” și „Decupează la” ultima formă aleasă primesc și azi
     un text.
   - **Foarfecă** (§4) și **Retează** (§5).

   Lipirea (de ghidaje, noduri și grilă; Alt o inversează) e cea a desenului; Esc renunță la gest. Cât tragi, se văd cuțitul
   și locurile unde taie (calculate de worker la fiecare cadru, cât ține pasul); cu „Păstrează” o parte, cea care pleacă e
   estompată.
2. **Opțiunile tăierii,** comune cuțitului și lui „Taie cu…” din panou, ținute în browser (ca „Închide bucățile”), arătate
   în bara uneltei și în panou:
   - **Închide bucățile** (ADR 0180 §3, neschimbată).
   - **Între bucăți:** nimic (implicit), **spațiu** w sau **suprapunere** w (lățimea totală, centrată pe cuțit): fiecare
     parte se taie cu cuțitul mutat paralel cu w / 2, spre ea la spațiu, spre cealaltă la suprapunere (la Linie, o linie
     paralelă; la Pen și Liber, offsetul căii deschise). Doar cu închidere: o bucată deschisă n-are o margine de mutat.
   - **Prelungește capetele:** nu (implicit); **până ies din formă** (un capăt oprit în regiunea unei forme merge mai departe
     pe tangenta lui, până iese din ea, ca tăietura să treacă); **linia întreagă** (la Linie: linia fără capete prin cele două
     puncte).
   - **Păstrează:** ambele părți (implicit), **stânga** sau **dreapta** cuțitului, față de sensul în care l-ai tras (la linia
     verticală din panou, x mai mic sau mai mare; la cea orizontală, deasupra sau dedesubt; la un cuțit închis, înăuntru sau
     în afară, ca la Decupează); partea cealaltă a formelor tăiate se șterge, în același pas, iar o formă pe care cuțitul
     n-o atinge rămâne.
   - **Cuțitul-formă din panou, după tăiere:** rămâne (implicit, ca azi) sau se șterge.
3. **Linia la orice unghi**, în „Taie cu…”: **linia prin X, Y la unghiul α** (0° = orizontală, 90° = verticală), exactă pe
   fiecare segment, ca X = … și Y = …, care rămân, ca scurtături.
4. **Foarfeca** (felul cuțitului): un clic pe conturul unei forme (lipit de nodurile din apropiere) o desparte acolo, exact pe
   segment (`adaugaNod`): o cale închisă se deschide în punctul acela, una deschisă devine două. Cercul și dreptunghiul devin
   căi (cercul deschis într-un loc: două semicercuri, ca la 10.3↑b). Rolul, ca la ADR 0180 §7. În unealta Noduri, butonul
   **Desparte** face același lucru pe nodul ales.
5. **Retează** (felul cuțitului; întrebarea 4): sub maus se arată bucata conturului dintre cele mai apropiate două locuri
   comune cu alte contururi (sau cu el însuși), iar clicul o scoate, într-un pas. Locurile comune sunt cele din „Taie la
   intersecții” (ADR 0180 §5), între formele alese sau, fără alegere, între toate formele foii. Un contur fără locuri comune e
   o singură bucată: pleacă tot (marcajul îl arată înainte). Ce rămâne dintr-un contur închis e o cale deschisă, cu rolul de la
   §7; bucățile rămase nu se unesc (unirea căilor e discuția din ADR 0124 §14). „Închide bucățile” nu se aplică.
6. **Îmbinarea** (pe tăieturile drepte: Linie, linia din panou, ghidajul; cere „Închide bucățile”): marginea nouă a
   bucăților urmează un model în locul liniei: **zigzag**, **val**, **dinți drepți**, **coadă de rândunică** sau **puzzle**,
   cu **pasul**, **înălțimea** și **raza colțurilor** (toate colțurile rotunjite, ca o freză cu raza aceea să taie ambele bucăți
   și ele să se prindă; implicit 3 mm), iar spațiul de la §2 e jocul dintre ele. Pasul rămâne cel scris: dinții întregi stau la
   mijlocul tăieturii, iar ce rămâne se împarte egal la capete, cel puțin o jumătate de pas fiecare, ca niciun dinte să nu fie
   tăiat de marginea formei.
7. **Taie în panouri** (un bloc nou al panoului Taie): formele alese (fără alegere, toate de pe foaie) se taie pe o grilă,
   cu mărimea panoului L × Î sau cu numărul de panouri pe lățime × înălțime. Panourile sunt **egale** (implicit: cel mai mic
   număr care încape, toate de aceeași mărime; firma de 2 400 × 1 000 pe 1 200 × 900 dă patru panouri de 1 200 × 500) sau
   **din colț** (panouri pline de la colțul din stânga-jos, plus restul: două de 1 200 × 900 și două de 1 200 × 100).
   Îmbinările dintre ele: drepte sau cu modelul de la §6, cu spațiul de la §2. Bucățile fiecărui panou devin un grup,
   „Panoul 1”, „Panoul 2” … (rând cu rând, de jos), și stau unde erau; așezarea lor pe foi e a planșelor (etapa 11). Cel mult
   100 de panouri.
8. **Refuzurile noi, cu motiv:** un cuțit de lungime zero; un clic de foarfecă sau de retezat care nu cade pe un contur; o
   îmbinare în care nu încape niciun dinte întreg; un spațiu care ar mânca o bucată întreagă (o fâșie mai îngustă decât el);
   un offset al cuțitului care se rupe în mai multe bucăți (o curbă prea strânsă pentru spațiul dat); panourile peste plafon.
9. **Ce nu face:** nu unește căile (ADR 0124 §14); îmbinarea nu merge pe tăieturile curbe; nu așază panourile pe foi (etapa
   11); nu împarte programul mașinii în bucăți (mutarea materialului sub mașină e altă discuție, a CAM-ului); nu schimbă schema
   documentului.
10. **Mărimea.** Pornirea crește doar cu butonul uneltei (iconița, tasta și eticheta, sub 0,5 kB); gestul, previzualizarea și
    bara uneltei vin în bucata tăierii, la prima alegere a cuțitului; calculul stă în worker. Linia a adăugat deja ~18,5 kB
    la total (peste ghidul de ~10 kB al liniei); feliile noi, estimat: f ~5, g ~3, h ~2, i ~2, j ~3, k ~2,5 kB, deci încă
    ~17,5 kB (totalul azi: 543,1 / 600). Fiecare felie își spune mărimea măsurată.

## Feliile

Ordinea din întrebarea 1, varianta recomandată:

- **10.3↑f:** unealta Cuțit (K), cu felurile Linie, Pen, Liber și Formă (§1), „Închide bucățile” în bara ei și
  previzualizarea.
- **10.3↑g:** Foarfeca și Retează (§4, §5), plus Desparte în unealta Noduri.
- **10.3↑h:** Prelungește capetele, Păstrează o parte, cuțitul-formă care se șterge (§2) și linia la orice unghi (§3).
- **10.3↑i:** spațiul și suprapunerea (§2).
- **10.3↑j:** îmbinarea (§6).
- **10.3↑k:** Taie în panouri (§7).

Fiecare felie: proba scrisă întâi (valorile pe hârtie, oracolul independent, documentul de după trecut prin ușă), manualul în
ambele limbi pentru fiecare buton, otrăvurile țintite în clona ramurii, porțile, publicarea pe canalul `taiere`; înaintea
primului commit de cod, `origin/main` unit în ramură.

**Felia 10.3↑f, la cod** (în cadrul deciziilor de mai sus, 08.11):
- **Cuțitul tras** e o cale în mm ai foii, dată cererii de tăiere (`cale`), care nu intră în document; mâna liberă vine
  netezită de netezirea din 10.3↑e, la jumătate de pixel al vederii, fără „Păstrează” (colțurile peste 60° rămân). **Formele
  existente** (`forme`) sunt instanțele date, cu toate contururile lor citite împreună, par-impar; cuțitul-formă din panou e
  același cuțit, cu o singură instanță. Formele-cuțit nu se taie și rămân.
- **Buclele libere:** un cuțit închis care stă tot înăuntrul unei forme, fără să-i atingă vreun contur închis, o taie și el,
  cu închidere: bucla intră în ambele părți, ca margine înăuntru și ca gol în afară (mijlocul unui „O” ajunge, ca insulă, în
  placă). Bucla își păstrează forma (cercul cuțitului rămâne cerc), în coordonatele piesei tăiate. Pe o piesă fără rol, ia
  operațiile conturului în care stă, cu latura întoarsă când adâncimea ei în parte diferă de a lui ca paritate. Un cuțit
  care se încrucișează în regiune se refuză (`cutit`). Asta lipsea și lui „Taie cu…” și „Decupează la” ultima formă aleasă:
  un text pus pe o placă nu tăia nimic.
- **Ce taie:** formele alese, fără formele-cuțit; fără nimic ales, toate instanțele foii (2a). La capătul gestului (3a),
  prin workerul CAM și `document.taie`, un pas de anulare; noile forme rămân alese.
- **Cât tragi:** locurile unde taie sunt aproximate pe firul principal (formele de tăiat, ca polilinii la 0,05 mm, trecute
  segment cu segment; peste 200 000 de puncte, doar urma); cele exacte și refuzurile vin de la worker. Bazinul CAM pornește
  un worker pe calcul, deci un calcul pe cadru ar fi prea greu.
- **Felul Formă:** clicul alege ca Selecția (conturul la 4 px, altfel cea mai mică formă închisă care cuprinde punctul), deci
  un clic în mijlocul unei litere alege textul; Shift + clic adună forme (conturate pe pânză), clicul fără Shift sau Enter
  taie cu toate, Esc le lasă.
- **Interfața:** butonul, iconița și tasta uneltei stau în editare; bara (portal în bara de sus), urma și tăierea vin în
  bucata tăierii, la prima alegere. Pen-ul cuțitului e unealta Pen, cu culoarea cuțitului. Starea (ce s-a tăiat, refuzul)
  stă în cipul din colțul pânzei. Pornirea nu crește (101,8 kB); totalul crește cu 3,7 kB (546,8 / 600).

**Felia 10.3↑g, la cod** (08.11):
- **Foarfeca** taie conturul cel mai apropiat de clic (la 4 px), exact: un nod la toleranță e locul, iar un capăt de segment se
  lipește de nod. O cale închisă se deschide acolo (un cerc deschis: două semicercuri, ca drum); una deschisă devine două forme,
  ca la intersecții (celelalte contururi ale piesei rămân împreună). Capătul unei căi deschise se refuză (`capat`), iar un clic
  departe de orice contur (`departe`).
- **Retează** scoate bucata conturului de sub clic dintre cele mai apropiate două locuri comune cu celelalte contururi: ale
  formelor alese sau, fără alegere, ale tuturor formelor foii, și ale aceleiași piese. Locurile se calculează doar pentru
  conturul lovit (nu toate perechile). **Ce rămâne stă în piesă** (nu devine forme separate, ca la foarfecă), ca un DXF cu
  liniile prelungite să rămână, după curățat, o singură formă; o piesă rămasă fără nimic se șterge. Capetele unei căi deschise
  nu sunt locuri comune ale ei, nici un loc la sub 1e-9 din segment de ele (un „T”: verticala retezată pleacă toată, și când
  trece de orizontală cu zgomot de calcul, fără un fir rămas), iar locul în care un contur se trece singur nu e un
  loc comun (e treaba verificării, ca la „Taie la intersecții”); bucățile rămase nu se unesc.
- **Bucata de sub maus** se arată cu roșu, aproximată pe firul principal: contururile tuturor formelor foii ca polilinii (sub
  clic poate fi oricare, chiar nealeasă), cu locurile comune segment cu segment doar față de partenerii tăierii (formele alese,
  fără alegere toate, și aceeași formă), cel mult 4 000 000 de perechi de segmente cercetate; tăierea e a workerului, exactă.
- **Selecția rămâne cum era**, la toate felurile cuțitului: fără nimic ales, tot nimic (tăieturile și retezările următoare au
  tot toate formele foii, adică răspunsul 2a ține și după prima tăietură); o formă aleasă care se taie e înlocuită de bucățile
  ei. Schimbat față de 10.3↑f, unde bucățile noi deveneau alese, iar a doua tăietură ar fi tăiat doar printre ele.
- **Desparte**, în unealta Noduri: forma tăiată chiar în nodul ales, prin aceeași foarfecă (workerul); rămâne aleasă prima
  bucată, ca unealta să rămână pe ea. Căutarea punctului de pe contur (`apropiat`, `laturaLovita`) stă acum în
  `src/geom/apropiat.ts`, comună uneltei Noduri și cuțitului.
- **Mărimea:** pe aceeași bază (`6c79ff9`), pornirea nu crește (101,8 kB; cu ușa 105,3 / 110), iar totalul crește cu 2,8 kB (546,9 → 549,7), plus 0,1 cu previzualizarea pe toate formele (`a5ca66b`). După unirea incrustațiilor (`031e41a`): pornirea 101,9 (cu ușa 105,5 / 110), totalul 558,7 / 600.

**Felia 10.3↑h, la cod** (08.11):
- **Linia prin X, Y la unghiul α** (§3): linia de tăiere are normala și direcția ei (`n · p = v`), iar verticala și orizontala
  taie la bit ca înainte (înmulțiri cu 0 și 1). Normala liniei la unghi e cea din stânga direcției (cos α, sin α); la
  multiplii de 90°, direcția e exactă. În panou: rândul „Linia printr-un punct, la un unghi”, cu X, Y (din mijlocul formelor
  alese) și unghiul (implicit 45°) dedesubt; pe pânză, linia prin punct, la unghiul ei.
- **Păstrează** (§2): la linie, partea din stânga direcției (verticala: x mai mic; orizontala, ca linia spre dreapta:
  deasupra, deci în panou „deasupra / dedesubt”); la cuțitul închis, înăuntru (stânga) sau în afară (dreapta), oricum ar fi
  tras; la cel deschis, latura unei fețe o dă sensul corzilor din drumul ei (fața are regiunea în stânga: o coardă parcursă
  în sensul cuțitului o lasă în stânga lui), a unei bucăți deschise, direcția în care pleacă din cuțit la capetele ei tăiate,
  a unui contur netăiat, cel mai apropiat punct al cuțitului. Nehotărât (o spirală: corzi în ambele sensuri) rămâne. O formă
  pe care tăietura n-o atinge rămâne; una tăiată, fără nimic de partea păstrată, se șterge.
- **Prelungește capetele** (§2): doar căile deschise (cuțitul tras, cuțitul-formă deschis; în panou, doar la cuțitul-formă,
  fiindcă liniile sunt întregi), pe tangenta din capăt (latura; arcul: coarda rotită cu jumătate din baleiaj; cubica: mânerul
  din capăt). „Până ies din formă”: cât capătul stă în regiunea unei forme de tăiat, merge până la cea mai depărtată dintre
  primele ieșiri din regiunile în care stă, plus 1e-3 mm, apoi mai departe dacă acolo intră în alta. „Linia întreagă”:
  dincolo de cutia tuturor formelor de tăiat (1 mm peste).
- **Cuțitul-formă șters** (§2): `stergeCutitul` îl pune în `sterse`, doar dacă s-a tăiat ceva; din panou, bifa „și șterge-o
  după tăiere” de sub „Ultima formă aleasă”; din unealtă, „Șterge cuțitul” la felul Formă.
- **Opțiunile**, o singură setare în browser (`optiuniTaiere.ts`, cu cheia de dinainte a lui „Închide bucățile”), aceleași în
  panou și în bara Cuțitului, ținute la zi în amândouă (`useSyncExternalStore`); grupurile lor, o singură componentă
  (`GrupuriTaiere.tsx`). **Schimbat față de schiță:** în bara Cuțitului, „Prelungește” și „Păstrează” stau într-un panou sub
  butonul „Opțiunile tăierii” (ca panourile extensiei), nu pe rând: bara de sus n-are loc de ele la 1 280 px (butonul
  „Exportă G-code” ieșea din fereastră). Când o opțiune nu e cea implicită, butonul are un punct roșu, iar sfatul o spune.
- **Cât tragi** (Linie, Liber): capetele prelungite, punctate, iar cu „Păstrează”, partea care pleacă, estompată (culoarea
  foii, cu o nuanță slabă a cuțitului), decupată pe regiunile pe care cuțitul le trece de cel puțin două ori; aproximat pe
  firul principal, ca locurile. La Pen și la Formă, doar tăierea (exactă) le aplică.
- **Mărimea:** pe aceeași bază (`8303b68`), pornirea nu crește (101,9 kB; cu ușa 105,5 / 110), iar totalul crește cu 4,6 kB (559,0 → 563,6 / 600), peste estimarea de ~2 kB: panoul, panoul opțiunilor din bară, previzualizarea și depozitul opțiunilor.

**Felia 10.3↑i, la cod** (09.11):
- **Între bucăți** (§2): `intre = { fel: 'spatiu' | 'suprapunere', latime }` în cerere, doar cu închidere (`spatiu-inchide`),
  lățimea de la 0,01 mm (dublul celei mai mici distanțe a offsetului) la 1 000 (`intreBucati.ts`, comun cu interfața).
  Fiecare parte păstrată se taie cu cuțitul mutat cu w / 2: spre ea (spațiul) sau spre cealaltă (suprapunerea); doar formele
  pe care cuțitul nemutat le taie (una de lângă el rămâne, chiar dacă fâșia ar atinge-o).
- **Cuțitul mutat:** linia, cu paralela ei; calea trasă și cuțitul-formă deschis, cu offsetul căii (`offsetDeschis`, pe
  biarcele cuțitului), dintr-o singură bucată, altfel `spatiu-cutit`; o buclă închisă a unui cuțit deschis, cu offsetul
  conturului, în sensul ei; cuțitul închis, cu offsetul figurii (`offsetFigura`: înăuntru se strânge, în afară crește;
  strâns până dispare, înăuntru nu rămâne nimic, în afară tot). Capetele căilor mutate merg mai departe pe tangentă cât au
  rămas într-un contur închis pe care cuțitul nemutat îl taie: un cuțit care iese dintr-o formă pe sub un unghi mic, chiar
  după margine, ar lăsa altfel cuțitul mutat oprit înăuntru. Doar cuțitele mutate de care e nevoie: cu „Păstrează” o parte,
  cealaltă nu contează (nici refuzul ei).
- **Bucata mâncată** (`spatiu`, §8): fiecare contur al tăieturii fără spațiu, de partea păstrată, care nu e gaură (o față, o
  insulă netăiată, o bucată de cale, restul cuțitului deschis), trebuie să treacă de cuțitul mutat: la linie, cel mai mare
  s · (n · p − v) al lui (cutia lui în reperul liniei, exactă) peste w / 2 + 1e-6 mm; la cuțitul-formă, o trecere de-a
  binelea (conturul de o parte și de alta a lui, nu o atingere), un punct dincolo de el sau, la cel închis, o buclă a lui
  care stă în contur, în regiunea părții (insula din mijlocul unui „O”). O gaură (adâncime impară în parte) pleacă odată
  cu fâșia.
- **Părțile:** la linie, ca înainte (A, apoi B); la cuțitul-formă, întâi cele din stânga (înăuntru), apoi cele din dreapta,
  apoi restul cuțitului deschis, o singură dată (cu suprapunerea, păstrat de ambele părți); o parte nehotărâtă, cu ambele
  părți păstrate, se refuză (`spatiu-cutit`): ar intra în amândouă.
- **Interfața:** „Între bucăți: nimic / spațiu / suprapunere”, cu lățimea în mm (implicit 3), al treilea grup din
  `GrupuriTaiere`, deci în panou și în opțiunile Cuțitului, stins fără închidere; ținut în browser. Pe pânză, fâșia: în
  jurul liniei din panou, două paralele; cât tragi Linia sau Liber, urma mutată aproximativ de fiecare parte
  (`fasieAproximativa`). Sfatul Cuțitului spune spațiul activ.
- **Mărimea:** pe aceeași bază (`1ff4271`), pornirea nu crește (101,8 kB; cu ușa 105,5 / 110), iar totalul crește cu 2,1 kB (565,7 → 567,8 / 600), cât estima ADR-ul (~2 kB): grupul „Între bucăți”, fâșia de pe pânză, cuțitul mutat și verificarea bucăților mâncate (în worker). Cu `main` de pe 09.11 (`3797e17`, 578,8), o unire de probă dă 600,1 / 600: linia trece de plafon cu 0,1 kB (fără 10.3↑i, ~598,0); decizia e a owner-ului.

**Felia 10.3↑j, la cod** (09.11):
- **Îmbinarea** (§6): `imbinare = { model, pas, inaltime, raza }` în cerere, doar cu închidere (`imbinare-inchide`), pasul și
  înălțimea pozitive, raza cel puțin 0, toate cel mult 1 000 mm (`valoare`), doar pe tăieturile drepte: linia din panou (X, Y,
  la unghi, ghidajul) și calea trasă din două puncte, cu prelungirile ei pe aceeași dreaptă (`imbinare-dreapta` la felul
  Formă, la o cale frântă sau cu arce, la mâna liberă).
- **Modelele** (`imbinare.ts`, pur, comun workerului și previzualizării): pe o coardă de lungime l, n = ⌊l / pas − 1⌋ dinți
  întregi la mijloc, iar restul, egal la capete (cel puțin o jumătate de pas fiecare). Zigzagul, dinții drepți și coada de
  rândunică (laturile înclinate 1 : 6) sunt poligoane cu colțurile rotunjite tangent cu raza (o rotunjire care nu încape pe
  latura ei: `imbinare-raza`); valul, trei arce de aceeași rază, (p² / 16 + H² / 4) / (2H), pe fiecare cocoașă; puzzle-ul,
  capul de rază H / 4 și flancurile de raza dată, la √(H · r) de mijloc (capul mai lat decât gâtul și arcele cel puțin de raza
  dată, altfel `imbinare-raza`). Fiecare drum e simetric față de mijlocul coardei (rotit cu 180°): sensul dreptei nu contează,
  iar bucățile unei forme simetrice au aceeași arie.
- **Drumul** (`drumCuImbinare`): trecerile dreptei prin contururile închise ale instanței, împerecheate par-impar; pe fiecare
  coardă toată pe tăietură (la calea trasă, între capetele ei), modelul, fără capetele coardei (sunt pe marginea formei).
  Dinții care ar atinge un contur (o latură oblică, o gaură prea aproape): `imbinare-margine`; niciun dinte în toată
  tăietura: `imbinare`.
- **Tăierea:** drumul e un cuțit-formă deschis, iar spațiul și suprapunerea de la §2 sunt jocul dintre dinți (cuțitul mutat
  cu w / 2). La linia din panou, fețele se grupează pe laturi, ca la tăierea dreaptă (o parte de fiecare latură, A întâi;
  `grupat`); la calea trasă, fiecare față e o parte, ca la Cuțit.
- **Interfața:** „Îmbinarea: dreaptă / zigzag / val / dinți drepți / coadă de rândunică / puzzle”, cu pasul, înălțimea și
  raza (implicit 40, 20 și 3 mm), al patrulea grup din `GrupuriTaiere` (câmpurile, prin `CampMm`), stins fără închidere și pe
  tăieturile care nu sunt drepte; ținut în browser (`cncvs2.taiere-imbinare`). Pe pânză, dinții în locul fâșiei: pe coardele
  formelor alese, în jurul liniei din panou, și cât tragi Linia (`corziAproximative`, `dintiAproximativi`). Sfatul Cuțitului
  spune îmbinarea activă.
- **Bara de sus** (CLAUDE.md: încape la 1280 px și cu un font lat): unirea de probă a liniei în `main` a căzut pe proba ei
  (`ancore.spec.ts:512`): cu Cuțitul în bara uneltelor, bara Transformării, cu grila și cu fontul lat, ajungea la 1296 px, iar
  a Cuțitului, la 1340. „Închide bucățile” trece din bara Cuțitului în opțiunile lui (primul rând; debifată, punctul roșu și
  sfatul o spun; la Foarfecă și Retează nu se aplica), iar sub 95rem butoanele barei de sus doar cu iconiță au 8 px de fiecare
  parte, nu 12 (38 px, peste ținta de 36). Capetele, cu grila și fontul lat: Transformarea 1264 (en 1250), Cuțitul 1216 (en
  1211), Foarfeca 1197.
- **Mărimea:** pe aceeași bază (`33e65f9`), pornirea nu crește (102,0 kB; cu ușa 105,6 / 110), iar totalul crește cu 4,2 kB (600,1 → 604,3 / 700; plafonul e 700 din 09.11, ADR 0144), peste estimarea de mai sus (~3 kB): modelele, comune workerului și previzualizării, grupul „Îmbinarea”, dinții arătați, manualul și reparația barei. **Bara, mai departe:** owner-ul a cerut fișierele (Importă, Exportă vectorii, Exportă G-code) în bara de sus, lângă Imprimanta; schița, cu cinci întrebări: <https://claude.ai/artifact/94AHZeAD9KvEmZsBt6MQW6>. Schimbarea vine după răspunsuri și înlocuiește reparația de mai sus.

**Felia 10.3↑k, la cod** (13.11):
- **Grila** (`grilaPanouri.ts`, pur, comun workerului și previzualizării): liniile peste cutia exactă a formelor de tăiat,
  crescătoare, fără marginile ei. După mărime, egale (n = ⌈(w − 1e-6) / L⌉ pe fiecare axă, liniile la k · w / n) sau din colț
  (la k · L de colțul din stânga-jos, cât rămâne ceva); după număr, egale. Zgomotul cutiei (sub 1e-6 mm peste un multiplu) nu
  face un panou în plus. Peste 100 de celule, `panouri`, socotit înaintea liniilor; o mărime care nu e un număr pozitiv sau un
  număr de panouri care nu e întreg, cel puțin 1, `valoare`; un singur panou, `nimic-taiat`.
- **Tăierea** (`panouri.ts`, în worker): verticalele, apoi orizontalele, fiecare cu tăierea dreaptă a liniei din panou
  (închiderea, spațiul și îmbinarea opțiunilor), doar pe bucățile care o încalecă: fiecare bucată ține coloanele și rândurile
  între care poate fi, iar o tăietură dă partea A (stânga, dedesubt), apoi B. **Nou în `taie`:** `desparte` (doar la liniile din
  panou, cu ambele părți păstrate): o formă pe care linia n-o trece, dar care are contururi de ambele părți (un text, cu
  literele de o parte și de alta), se desparte pe laturi; o linie care doar desparte nu cere dinți.
- **Panourile:** celulele cu bucăți, rând cu rând de jos și de la stânga, sunt „Panoul 1” … (numele vine din interfață, în
  limba ei); o celulă goală nu primește număr. Una singură își ia numele (o formă întreagă își păstrează id-ul); mai multe devin
  un grup cu numele panoului. Pe foaie (deci și în programul mașinii), bucățile unei forme vin în ordinea panourilor.
- **Rezultatul,** un singur pas de anulare, prin acțiunea `document.taie`: degruparea compusă, din worker (fiecare formă
  schimbată, cu bucățile ei de la capăt, cu id-uri nefolosite în documentul vechi: un id eliberat de o tăietură nu ajunge pe o
  bucată nouă), apoi grupurile, pe firul principal (`grupuriPanouri.ts`, pe documentul de după degrupare: `grupDin`, comanda
  `regrupeaza` cu locurile părților; V-carve-urile care s-ar amesteca, ADR 0130, lasă panoul negrupat, cu numele lui pe fiecare
  bucată). **Schimbat față de prima variantă:** gruparea stătea în worker, dar ea citește blocurile de text cu schemele lor
  (valibot), deci aducea în worker ~4,5 kB. Refuzat și `impartita` pentru o formă netăiată cu piesa pusă și în altă parte (ar
  intra într-un grup, cu piesa ei).
- **Interfața:** blocul „Taie în panouri” din panoul Taie (`PanouriTaiere.tsx`), după butonul Taie: mărimea panoului (implicit,
  materialul foii), „egale / din colț”, numărul de panouri; câte ies, peste ce cutie; cât lucrezi în bloc, pânza arată grila
  (cutia punctată și liniile), iar înapoi în blocul de sus, linia.
- **Mărimea:** pe aceeași bază (`main` `44c47fa`, cu imprimanta 3.6s), pornirea nu crește (102,4 kB; cu ușa 106,1 / 110), iar
  totalul crește cu 4,7 kB (657,5 → 662,2 / 700), peste estimarea de mai sus (~2,5 kB): workerul +2,7 (grila, tăierea pe linii,
  `desparte`, jurnalul pentru tăierile pe rând), panoul +1,6 (blocul, grila pe pânză, textele), gruparea pe firul principal +0,4
  (măsurate pe `c85cc18`). Prima variantă, cu gruparea în worker, dădea +9,1 kB.

## Proba

- **Pe hârtie:** valorile de mai sus; foarfeca pe cercul R50 în (50, 0): o cale deschisă de 314,159 mm, cu capetele în
  (50, 0); retezatul pe liniile (0, 0)–(100, 0) și (80, −20)–(80, 20): clicul în (90, 0) lasă (0, 0)–(80, 0), cel în (80, 10)
  lasă (80, −20)–(80, 0); îmbinarea în zigzag pe pătratul 100 × 100 la X = 50 (pasul 20, înălțimea 10): patru dinți, câte 10 mm
  drepți la capete, bucățile de câte 5 000 mm², cu jocul 0 lipite exact (reuniunea lor e pătratul, partea comună fără arie), cu
  jocul 0,2 la 0,2 una de alta peste tot; panourile firmei de 2 400 × 1 000 la 1 200 × 900: egale, patru de 1 200 × 500; din
  colț, două de 1 200 × 900 și două de 1 200 × 100, cu suma 2 400 000 mm².
- **Oracolul independent** (`test/oracles/taiere.ts`, extins): spațiul, ca distanța dintre bucăți (w) și până la cuțit
  (w / 2); suprapunerea, ca lățimea părții comune; îmbinarea, ca reuniunea bucăților egală cu forma (ariile) și distanța dintre
  ele egală cu jocul; foarfeca și retezatul, ca bucățile care refac conturul (cu bucata scoasă, ale cărei capete stau în locuri
  comune); panourile, fiecare bucată în celula ei.
- **E2e:** fiecare fel al cuțitului, pe un DXF importat, cu anularea; tasta K; previzualizarea.
- **Otrăvurile țintite** (`test/otravuri/10.3f.py`, …), rulate în clona ramurii, în afara Drive-ului.

## Întrebările pentru owner și răspunsurile lui

Formularul lor, cu desenele înainte / după, e pagina „Cuțitul și opțiunile tăierii” (privată, a owner-ului). **Răspunsurile,
din 08.11:** 1a, 2a, 3a, 4a, adică recomandările, cu nota de la §1 (felul Formă). Recomandarea e prima variantă. Restul opțiunilor (§2–§7) pot sta toate împreună, deci nu sunt întrebări: vin pe rând, în felii, iar implicitul
e cel scris.

1. **Ordinea feliilor:** a) întâi unealta Cuțit (Linie, Pen, Liber), apoi Foarfeca și Retează, opțiunile mici, spațiul,
   îmbinarea, la urmă panourile (recomandat: e cuțitul cerut, iar restul se sprijină pe el); b) întâi spațiul, îmbinarea și
   panourile (o firmă mare, acum), apoi cuțitul; c) întâi Foarfeca și Retează (curățatul desenelor), apoi restul cuțitului.
2. **Ce taie cuțitul fără forme alese:** a) tot ce trece, pe foaia de lucru (recomandat: un singur gest, iar Ctrl+Z îl
   întoarce); b) nimic: cere întâi formele alese.
3. **Când taie:** a) la capătul gestului (ridicarea mausului; la Pen, Enter), cu locurile de tăiere arătate cât tragi
   (recomandat); b) tăietura rămâne arătată, iar Enter (sau un buton) o aplică.
4. **Retezatul cu un clic, respins în ADR 0180** („Taie la intersecții” plus ștergerea dau același lucru): a) vine înapoi, ca
   fel al cuțitului (recomandat: un clic în loc de trei pași, cu bucata arătată înainte); b) rămâne respins.

## Ce am respins

- **Cuțitul ca formă în document, desenată întâi:** există (Taie cu… ultima formă); unealta nu-l mai lasă în desen, ca să nu
  fie de șters după.
- **Îmbinarea pe curbe, acum:** modelul mutat pe o curbă strânsă se încrucișează; întâi tăieturile drepte.
- **Suprapunerea cu buzunarele îmbinării făcute singure** (lap joint): trece de tăierea vectorilor (adâncimi, operații).
- **Retezatul care unește ce rămâne:** unirea căilor e discuția din ADR 0124 §14.
- **Împărțirea programului mașinii pe bucăți** (materialul mutat sub mașină): altă unealtă, a CAM-ului, nu a desenului.

## Se redeschide dacă

- owner-ul răspunde altfel la întrebări;
- încercările pe desene reale cer altceva (ca la ADR 0180);
- se discută unirea căilor (ADR 0124 §14): Retează ar putea închide ce rămâne;
- vin planșele (etapa 11): panourile se așază pe foi;
- trebuie îmbinarea și pe tăieturile curbe.
