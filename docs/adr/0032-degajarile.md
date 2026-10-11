# ADR 0032 — Degajările colțurilor: dog-bone și T-bone (documentul v8)

**Starea:** acceptat pe 11.10.2026, în felia 2.6. **Intră în:** etapa 2. Nimic de aici nu se schimbă fără un ADR nou.

**Problema.** O freză rotundă nu intră într-un colț ascuțit al materialului păstrat. Într-o gaură dreptunghiulară, freza
Ø6 lasă în fiecare colț un rest cu raza de 3 mm, iar un cep cu colțuri drepte nu mai intră. Placa 2 cere gaura de
40,00 × 30,00 cu dog-bone, în care cepul 40 × 30 să intre fără forță.

**În ediția întâi,** degajarea era un cerc separat, de raza frezei, cu centrul la r dincolo de colț, pe bisectoare (pentru
dog-bone) sau perpendicular pe latura mai lungă (pentru T-bone). Cercul trebuia tăiat ca formă separată. Mai mult, el nu
atinge restul lăsat de freză: pe bisectoare, între cerc și traseu rămâne o așchie de ~0,29·r. Cepul nu intra nici așa.

**Decizia.** Operația de profil poate avea degajări: `Operatie.colturi = null | { tip: 'dog-bone' | 't-bone' }`. Pe
fiecare colț de degajat, traseul face un drum dus-întors, dintr-o singură linie: din colțul traseului Q până în punctul E
în care cercul frezei trece exact prin colțul V al piesei, apoi înapoi în Q. Este degajarea minimă. Scoate restul și
taie cât mai puțin din perete.

## Contractul

**1. Documentul v8** (`schema: 8`) = contractul v7 (ADR 0030, ADR 0031), plus `Operatie.colturi`, obligatoriu: `null`
(fără degajări) sau `{ tip }`, cu `tip` = `'dog-bone'` sau `'t-bone'`. Câmpurile necunoscute din `colturi` se păstrează.

**Migrarea v7 → v8** (pură, deterministă):
- fiecare operație primește `colturi: null`;
- o operație v7 care are deja un câmp necunoscut `colturi` e refuzată cu motiv (ciocnire de nume);
- lanțul v1 → … → v8 rămâne;
- o operație nouă (Adaugă) vine cu `colturi: null`;
- programul unui document fără degajări e **același, octet cu octet**, ca în v7.

**2. Colțurile de degajat**, pe o operație `exterior` sau `interior` cu `colturi` ≠ `null`. Un colț de degajat e un vârf V
al conturului elementului (desenul, nu traseul) care îndeplinește toate condițiile:
- tangenta se rupe în V, iar ambele laturi din V sunt **linii**. Colțurile cu un arc vin cu importul SVG (felia 2.7),
  pentru că acolo colțul exact se socotește altfel;
- **colțul e concav pentru materialul păstrat K**. Pe `interior` (o gaură), colțurile convexe ale găurii; pe `exterior`,
  colțurile intrânde ale piesei. Unghiul deșeului din V, notat α, e strict sub 180°;
- traseul are în dreptul lui un vârf ascuțit Q, la R de ambele laturi: Q = V + (R / sin(α/2))·u, cu u bisectoarea
  unitară din V spre deșeu. Dacă decalarea a mâncat colțul (laturi prea scurte), nu există Q, deci nici degajare;
- restul e cel puțin rezoluția declarată: R / sin(α/2) − R ≥ 0,01 mm.

Dreptunghiul cu colțuri ascuțite tăiat `interior` are 4 colțuri de degajat. Tăiat `exterior`, n-are niciunul. Cercul și
dreptunghiul cu colțuri rotunjite n-au colțuri de degajat.

**3. Punctul E**, centrul frezei la capătul drumului:
- **dog-bone:** E = V + R·u, pe bisectoare. Cercul frezei trece prin V. E stă la R·sin(α/2) de fiecare perete, deci
  degajarea intră în fiecare cu R − R·sin(α/2). La 90°, 0,29·R;
- **T-bone:** degajarea intră în **peretele mai lung** dintre cele două din V, ca la Vectric (Aspire) și în ediția întâi.
  E = V + R·m, cu m normala unitară spre deșeu a **celeilalte** laturi (cea mai scurtă). Cercul trece prin V și intră cu
  R în peretele lung (la 90°; nimic în cel scurt). E e pe dreapta traseului paralelă cu latura scurtă, la R / tan(α/2) de
  Q. La egalitate (diferență sub 1e-6 mm), peretele laturii de după V, în sensul de mers.

**4. Drumul de degajare.** Q → E → Q, două linii, la Z-ul curent, cu avansul de tăiere.
- Se face la **fiecare sosire** a traseului în Q, pe orice trecere: după segmentul care se termină în Q și înaintea
  celui care pleacă din Q.
- Sosirea în vârful 0 e la sfârșitul buclei (după ultimul segment). O parcurgere care **pornește** din Q nu face drumul
  la pornire: bucla ajunge în Q mai târziu.
- **Cu urechi:** Z-ul e cel al profilului în Q. Pe un palier, degajarea rămâne la −vârf. Pozițiile s nu numără drumul
  de degajare, deci urechile nu se mută.
- **Cu rampă (ADR 0029):** dacă rampa trece prin Q, drumul se face la Z-ul rampei din Q, iar tura îl reface la adâncime.
  Lungimea buclei P nu se schimbă.
- **Cu intrări (ADR 0030, 0031):** dacă p₀ e un colț de degajat, drumul se face la sfârșitul buclei, înaintea ieșirii.

**5. Condițiile.** O degajare se face doar dacă:
- **a. buclele vecine:** drumul [Q, E] stă la cel puțin D + 1 mm (`MARJA_SCHELET`) de traseul oricărei **alte** bucle de
  pe foaie (alte tăieturi și celelalte bucle ale aceleiași tăieturi). Între crestătură și fanta vecină rămâne măcar 1 mm
  de material;
- **b. urechile buclei înseși:** drumul [Q, E] stă la cel puțin D de coloana fiecărei urechi a buclei, numărată de la
  pornirea buclei (ADR 0031, precizarea din 10.10).

Altfel, colțul rămâne fără degajare. Exportul întoarce un avertisment, „degajarea omisă pe <idLume>, colțul (x, y)”, pe
care dialogul îl arată.

Pentru foaie nu e nevoie de o condiție nouă: drumul intră în K, iar ieșirea din foaie (invarianta 5 și confirmarea) se
socotește pe toate mișcările programului, deci și pe el.

**6. Refuzuri, cu motiv:** degajări pe o operație `pe-linie` (nu există parte de deșeu). Dialogul oprește alegerea pe
`pe-linie`.

**7. Invariantele.**
- **1:** pe trecerea k, drumul taie degajarea de la −d_{k−1} (trecerea de dinainte) la −d_k, deci scoate cel mult pasul.
- **2, amendată.** Discul frezei poate intra în K doar pe un drum de degajare care e exact cel de la §3–§4 al unui colț
  de degajat al tăieturii (V, Q și E socotite pe hârtie). Orice altă intrare în K rămâne încălcare.
- **9, amendată.** Un drum dus-întors din Q, două linii pe aceeași dreaptă, nu e o porțiune deschisă greșită. Buclele se
  judecă fără el.
- **10, 11 și 12, amendate.** Pozițiile s nu numără drumurile de degajare.
- **13 (degajările), nouă.** Rulează în poartă cu documentul.
  - Pe o operație cu `colturi`, fiecare colț de degajat (§2) care îndeplinește condițiile de la §5 are drumul lui la
    **fiecare** sosire în Q, pe fiecare trecere, cu E de la §3. Un colț care nu le îndeplinește n-are niciun drum.
  - Nicăieri altundeva nu există drumuri de degajare.
  - Pe o operație fără `colturi`, niciun drum.

**8. Ce verifică oracolul** (sesiune independentă, din acest ADR):
- documentul v8;
- invariantele 2, 9, 10, 11 și 12 amendate și invarianta 13;
- un oracol pe hârtie care citește G-code-ul și măsoară pe fiecare colț Q, E și lungimea drumului. Pe un câmp de
  înălțimi, el verifică:
  - colțul V tăiat la adâncime (restul ≤ 0,005 mm);
  - cât intră degajarea în pereți (dog-bone: R − R·sin(α/2) în fiecare; T-bone la 90°: R în peretele lung, 0 în
    celălalt);
  - nicio mișcare nu scoate mai mult decât pasul.

**Cazurile pe hârtie:**
- gaura 40 × 30, Ø6, cu dog-bone, în urcare și în opoziție: E la (R/√2, R/√2) de fiecare colț, spre interior;
- aceeași gaură cu T-bone: crestăturile în pereții de 40;
- gaura pătrată 30 × 30 cu T-bone (egalitate: peretele laturii de după V);
- dreptunghiul tăiat `exterior` cu `colturi`: niciun drum;
- cu urechi: drumul la Z-ul profilului, urechile pe aceleași poziții;
- cu rampă și cu intrări;
- două găuri la 3 mm una de alta: degajarea care s-ar apropia de vecina se omite, cu avertisment;
- placa 2: gaura 40 × 30 cu dog-bone.

**Martorii negativi**, care trebuie să înroșească oracolul:
- E pus la r dincolo de V (cercul ediției întâi): colțul rămâne netăiat;
- drumul doar la prima trecere;
- T-bone în peretele scurt;
- degajarea pe colțul unei piese tăiate `exterior` (convex pentru K);
- degajarea păstrată deși atinge bucla vecină.

**9. Interfața.** În dialogul de export, fiecare rând are o coloană **Colțuri**, cu alegerea „—”, „dog-bone” sau „T-bone”:
- e oprită pe `pe-linie` și în fila care doar citește;
- valoarea intră în document ca urechile, rampa și intrările.

Avertismentele (degajarea omisă) se arată sub rezultat, ca la intrări.

## Limitele

- Colțurile cu un arc nu primesc degajare: vin cu importul SVG (2.7).
- Pe un dreptunghi cu colțuri rotunjite sub raza frezei, freza lasă raza ei, iar colțul nu primește degajare: desenul
  are colțuri rotunjite, nu ascuțite.
- Direcția T-bone-ului se alege după lungimea pereților. Alegerea de mână vine cu panoul de proprietăți.
- Degajarea e minimă: cercul trece prin V. Un joc în plus (un cep cu toleranță strânsă) se dă din desen.

## Ce am respins

- **Cercul separat al ediției întâi**, cu centrul la r dincolo de V: lasă o așchie pe bisectoare și cere o tăietură în plus.
- **Degajarea ca formă în desen** (colțul înlocuit cu un arc): schimbă desenul, iar până la editorul de vectori (etapa 6)
  n-are unde să trăiască. Ca operație, desenul rămâne exact.
- **Vârfuri în buclă** (drumul ca două segmente lipite în contur): schimbă lungimea buclei. Atunci se mută urechile și
  rampa, iar mijloacele „segmentelor” noi ar deveni candidați de intrare.

**Se redeschide dacă:** placa 2 arată că cepul nu intră, atelierele cer un joc sau o altă formă de degajare, sau importul
SVG aduce colțuri cu arce.
