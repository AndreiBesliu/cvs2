# ADR 0304: Profilul desenat: silueta din linii în document, simularea, oracolul și CAM-ul (canelura, marginea profilată)

**Starea:** propus pe 27.11.2026, în sesiunea cloud a liniei frezelor (ramura `wip/16.A-freze-e`), după 16.A↑e-6, la cuvântul
owner-ului transmis de sesiunea principală: „zi-le sesiunilor sa continue cu recomandarile, acolo unde inca asteapta”, cu
„Apoi vin f (profilul desenat) și g (valorile pe material)”. Întrebările de la capăt merg la owner grupat; linia merge mai
departe cu recomandările, ca la ADR 0303. **Completează:** ADR 0300 §2 (silueta: „linii și arce de la (0, 0) la (Ø / 2, h),
cu h nedescrescător”) și §11 (felia 16.A↑f), ADR 0302 §2 și §7 (profilurile parametrice, „în curând în proiect” până aici).
Rândul din prag: „Freze de profil desenate de utilizator; roundover cu offset față de interior”.

## Ce e azi

- Biblioteca „Frezele mele” ține profilurile parametrice din 16.A↑h-5 (rotunjirea, ogee-ul, ogee-ul roman, panoul ridicat), cu
  silueta lor (`profilFreza`, `src/model/profilFreza.ts`: o linie frântă (r, h), arcele din bucăți). Sunt „în curând în
  proiect”: n-au formă în document (`FELURI_CU_CAM` are doar plata, V-ul, gravarea, bila și toroidala).
- Documentul (v31) știe plata (fără formă), V-ul (cu vârful plat), bila și toroidala. Nucleul simulării are patru siluete
  închise (`silueta`, `src/sim/nucleu.ts`); oracolul simulării (`test/oracles/simulare.ts`) are și scula `profil`, din puncte
  (r, h) cu r strict crescător și h nedescrescător, interpolată liniar.
- O siluetă monotonă (r crescător, h nedescrescător) e tot ce poate tăia un câmp de înălțimi: fără subtăieri. Toate
  profilurile parametrice de azi au o siluetă așa.

## Decizia

### 1. Forma în document (v32)

`scula.forma = { tip: 'profil', puncte: [[r, h], …] }`: linii între puncte, de la (0, 0) la (Ø / 2, h_max). La ușă: cel puțin
două puncte, primul (0, 0), r strict crescător, h nedescrescător, ultimul r = Ø / 2 (la 1e-9), toate finite, cel mult 200 de
puncte (întrebarea 1a). Câmpurile necunoscute ale formei rămân, nejudecate. Migrarea v31 → v32 schimbă doar numărul; un v31
cu o formă `profil` e o ciocnire. Numărul îl dă sesiunea principală.

Arcele profilurilor parametrice se scriu ca linii, cu abaterea de la arc sub 0,001 mm (ca biarcele, ADR 0033): ce se taie e
exact ce stă în document, iar oracolul îl citește la fel.

### 2. Simularea

În nucleu, felul nou de siluetă e linia frântă. Pe fiecare bucată [r_k, r_{k+1}], h = h_k + p_k·(r − r_k), cu p_k ≥ 0:

- plonjarea, arcul la Z constant și linia orizontală, ca la orice siluetă: h(distanța);
- linia înclinată: pe fiecare bucată, m·s + h_k + p_k·(√(s² + q²) − r_k) e convexă în s (rădăcina e convexă, p_k ≥ 0),
  deci minimul pe bucată e punctul ei staționar, tăiat la intervalele bucății (la implementare: în formă închisă, ca la conul
  V-ului, nu prin înjumătățire; vezi „Implementarea (16.A↑f-1)”); minimul pe celulă e cel mai mic dintre bucăți;
- elicea cu profilul: refuzată, cu motiv, ca elicea cu V-ul (`program.ts`), până la o felie a ei.

Probele: nucleul față de oracolul simulării, pe linii, înclinate, arce și plonjări la întâmplare, pe profiluri la
întâmplare și pe cele parametrice; o siluetă de două puncte (o linie) dă exact V-ul, iar una de două puncte orizontale,
plata.

### 3. Unde taie (întrebarea 4a)

- **Pe linie (canelura):** centrul pe linie, drumul frezei plate de același Ø, ca la bilă (16.A↑e-3).
- **Pe o parte (marginea profilată):** freza dă muchiei piesei forma siluetei, întoarsă (rotunjirea, ogee-ul, panoul pe
  margine).
- Buzunarul, găurirea, V-carve-ul și frezele în plus: refuzate, cu motiv.

### 4. Marginea profilată: unde e desenul (întrebarea 2a) și cât de adânc (întrebarea 3a)

Desenul e conturul piesei la baza profilului (cel mai mare). Cu r(z) raza siluetei la înălțimea z deasupra vârfului
(r(0) e raza fundului ei plat; 0 fără el), centrul frezei stă la r(0) de desen, spre deșeu, nu la R. Așa, la fund peretele
cade pe desen, iar spre față muchia se retrage după siluetă: rotunjirea „cu offset față de interior” din prag. Pe hârtie,
la adâncimea t sub față (t ≤ d), peretele stă la r(d − t) − r(0) în interiorul desenului (0 la fund, r(d) − r(0) la față).
Exemplu: rotunjirea de rază 6 pe o freză Ø19,05 are r(0) = 9,525 − 6 = 3,525; la d = 6, muchia de sus e retrasă cu 6 mm.

Adâncimea e cel mult înălțimea profilului (h_max): peste ea, cilindrul frezei ar tăia o treaptă în piesă. Mai mult se
refuză, cu motiv. Cu mai puțin, se taie doar partea de jos a siluetei (o rotunjire parțială), iar fișa o spune.

### 5. Biblioteca și editorul (întrebarea 5a)

- Felul nou `desenata` în „Frezele mele”: punctele siluetei, într-un tabel (r, h), cu desenul la scară alături. Punctele se
  trag pe desen, cu lipirea la 0,1 mm, iar „Pornește de la…” copiază silueta unui profil parametric.
- Profilurile parametrice (rotunjirea, ogee-ul, ogee-ul roman, panoul) trec în proiect cu silueta lor, ca linii (§1): ies din
  „în curând”, odată cu CAM-ul (întrebarea 4a).
- CSV-ul și JSON-ul poartă punctele.

### 6. Sub-feliile

| Sub-felia | Ce aduce | Probele |
| --- | --- | --- |
| f-1 | documentul v32 (forma `profil`), IR-ul, nucleul (linia frântă) și oracolul; lucrarea refuză profilul pe orice operație, cu motiv | nucleul față de oracol (plonjarea, liniile orizontale și înclinate, arcele), pe profiluri la întâmplare; ușa și oracolul documentului; corpusul de aur |
| f-2 | canelura cu profilul (pe linie), în lucrare: drumul frezei plate, silueta în IR, același T cu altă siluetă refuzat, raportul foilor | secțiunea canelurii simulate față de hârtie (oglinda siluetei), celulă cu celulă; drumul față de freza plată; refuzurile |
| f-3 | intrarea în proiect: biblioteca (profilurile parametrice ca linii, sub 0,001 mm, și cel desenat), Tăierea, rândurile exportului (silueta pe rând, doar de citit) | abaterea liniilor de la arce; rândul poartă punctele, Exportă le scrie; e2e pe programul scris, simulat de oracol |
| f-4 | marginea profilată pe o parte: centrul la r(0) de desen, adâncimea cel mult h_max, nota în fișă | secțiunea marginii simulate față de hârtie, celulă cu celulă; nimic tăiat dincolo de profil; refuzul peste h_max |
| f-5 | editorul siluetei desenate în „Frezele mele” (tabelul, desenul, tragerea, „Pornește de la…”), CSV și JSON | marginile punctelor; dus-întors prin fișier; e2e pe editor |

Sub-felia f-2 de la propunere (canelura și intrarea în proiect) s-a împărțit pe 27.11, ca e-3 și e-4 la ADR 0303: întâi CAM-ul,
care mișcă mașina, apoi intrarea în proiect. Marginea profilată și editorul s-au mutat cu un număr (f-4, f-5).

### 7. Mărimea

f-1 adaugă silueta în nucleu (în workerele simulării și CAM) și forma în schema ușii: ținta era cel mult +0,3 kB în pornirea cu
ușa și +2 kB în total pe toată felia f; fiecare sub-felie își spune creșterea în raport (f-1 a luat singură +2,1 kB: vezi
„Implementarea (16.A↑f-1)”).

## Întrebările pentru owner (cu recomandarea întâi)

1. **Din ce e făcută silueta în document?**
   a. Doar din linii, cu arcele profilurilor parametrice scrise ca linii sub 0,001 mm (recomandat: simularea rămâne exactă pe
      bucăți convexe, iar oracolul o citește la fel).
   b. Din linii și arce (mai puține puncte; arcele concave, ca partea de sus a ogee-ului, cer altă căutare în nucleu).
2. **Marginea profilată: unde stă desenul?**
   a. Desenul e conturul piesei la baza profilului; centrul frezei stă la raza fundului plat al siluetei de desen
      (recomandat: piesa are mărimea desenată, iar muchia de sus se rotunjește spre interior).
   b. Desenul e conturul la față, cu centrul la Ø / 2, ca la freza plată (piesa iese mai mare la bază decât desenul).
3. **Marginea profilată mai adâncă decât profilul?**
   a. Refuzată, cu motiv: peste înălțimea profilului, cilindrul frezei ar tăia o treaptă în piesă (recomandat).
   b. Permisă, cu treapta spusă în fișă.
4. **Unde taie profilul?**
   a. Pe linie (canelura) și pe o parte (marginea profilată); buzunarul, găurirea și V-carve-ul, refuzate (recomandat).
   b. Doar pe linie.
5. **Editorul siluetei desenate:**
   a. Tabelul punctelor și desenul la scară, cu tragerea pe desen (lipirea la 0,1 mm) și „Pornește de la…” un profil
      parametric (recomandat).
   b. Doar tabelul.

## Implementarea (16.A↑f-1)

Pe 27.11, pe `wip/16.A-freze-e`, peste e-6, cu recomandările aplicate (întrebările de mai sus rămân la owner, grupat).
Numărul v32 l-a dat sesiunea principală.

- **IR-ul:** `FormaScula` primește `{ tip: 'profil', puncte }` (`src/ir/ir.ts`).
- **Nucleul** (`src/sim/nucleu.ts`): silueta de felul 4 ține punctele (`pr`, `ph`) și pantele bucăților (`pp`); ultimul r e
  pus exact pe R. Înălțimea la o distanță vine din bucata ei; raza efectivă la o adâncime, din bucata care o atinge
  (celulele de dincolo sunt sărite).
  - Plonjarea, arcul la Z constant și linia orizontală merg ca la orice siluetă.
  - Linia înclinată merge prin `minimProfil`, pe fiecare bucată, pe cele două intervale ale ei în s (în fața proiecției și
    în spatele ei): F(s) = m·s + h_k + p_k·(√(s² + p²) − r_k) e convexă, cu punctul staționar −m·p / √(p_k² − m²) când
    |m| < p_k. Altfel F e monotonă, deci minimul e la capătul spre care coboară. Punctul se taie la interval. E aceeași
    formulă ca la conul V-ului, fără pași de căutare, deci aceeași amprentă în Node și în browser.
  - Elicea cu profilul e refuzată de nucleu și de `program.ts`, cu motiv, ca elicea cu V-ul.
- **Simularea refuză** (`profilRefuzat`, `src/sim/program.ts`) un profil fără sens: sub două puncte, peste 200, primul care
  nu e (0, 0), r care nu crește strict, h care scade sau capătul care nu e la rază.
- **Documentul v32:**
  - **Schema:** varianta `profil` a formei, cu perechi `[r, h]` stricte, finite, în [0, plafon], 2–200 de puncte
    (`PLAFON.puncteProfil`), plus `profilBun`: primul punct (0, 0), r strict crescător, h nedescrescător, ultimul r la
    1e-9 de Ø / 2.
  - **Migrarea** v31 → v32 (`v31v32`) schimbă doar numărul; un v31 cu o formă `profil` e refuzat, cu calea frezei.
  - **Oracolul documentului** (`test/oracles/document.ts`, secțiunea v32) și cazurile pe hârtie: `VALIDE_V32`, P01–P07, și
    `REFUZATE_V32`, R01 plus RD0–RD12. Proba ușii e `test/unit/document.v32.oracol.test.ts`. Probele care țin versiunea
    curentă s-au mutat pe v32, iar „versiunea mai nouă” e acum 33.
  - **Corpusul de aur:** pasul v32 pune o canelură cu freza „Rotunjire 8” (T11). Ieșirile așteptate s-au schimbat doar în
    `"schema": 32`.
- **Lucrarea** (`src/cam/job.ts`, `motivFormaPeOperatie` cu motivul `profil`) refuză profilul pe orice operație și pe orice
  freză în plus, cu forma, T-ul și calea. Fereastra exportului nu face rând unei operații cu profil (`operatieCuRand`).
  Panoul de proprietăți spune „T{n}, profilată Ø{d} mm”.
- **Probele:**
  - `test/unit/simulare.profil.test.ts`, scrisă întâi: nucleul față de oracolul simulării, pe trei profiluri (o rotunjire,
    un S, trepte) și opt feluri de mutări. Mutările sunt liniile la două adâncimi, linia oblică, rampele line și abrupte,
    arcele și cercul întreg, plonjările. Profilurile sunt și 12 la întâmplare, cu trei mutări fiecare.
    - Dinții probei: V-ul de același Ø și aceeași înălțime pică pe aceleași piese.
    - Pe hârtie: profilul de două puncte e V-ul sau plata, iar cel cu fund plat e V-ul cu vârf plat, celulă cu celulă.
      Secțiunea canelurii e silueta.
    - Refuzurile simulării. Ține ~35 s, pe celule de 0,1 mm.
  - `test/unit/profil.lucrare.test.ts`: regula formei, refuzul lucrării, fără rând în fereastră.
- **Otrăvurile:** `test/otravuri/16.A-f1.py`, 20 / 20 prinse; F15 (h ≥ 0 la ușă), practic echivalentă, scoasă cu motivul.
- **Mărimea:** pornirea +0,2 kB (cu ușa 117,3 / 125, +0,3), totalul +2,1 kB (940,4 / 1 000). Ținta de +2 kB pe toată felia f e
  deja atinsă: nucleul se numără de două ori (workerul CAM și workerul simulării), iar schema ușii cu migrarea încă o dată. f-2…f-5
  își spun creșterea; o creștere peste plafon cere decizia owner-ului.
- **Neschimbate:** nimic pe server; programul fără profil, octet cu octet (corpusul CAM, aurul plăcilor și al atelierelor).

## Implementarea (16.A↑f-2)

Pe 27.11, pe `wip/16.A-freze-e`, peste f-1 (întrebarea 4a aplicată, partea canelurii). Mișcă mașina, deci proba secțiunii
pe hârtie a fost scrisă întâi.

- **Regula** (`motivFormaPeOperatie`): profilul desenat merge pe linie, ca freză a operației. Pe o parte, în buzunar, la
  găurire, în V-carve și pe relief, `profil`. Pe orice freză în plus (de rest, a fundului plat, a dopului, a benzii), lucrarea îl
  refuză, cu forma, T-ul și calea: „taie deocamdată doar pe linie (canelura), ca freză a operației: marginea profilată vine pe
  o sub-felie”.
- **Drumul** e al frezei plate de același Ø, mișcare cu mișcare, și cu urechile și rampa: centrul stă pe linie. Scula din IR
  își poartă silueta (`sculaIR` copiază punctele), iar simularea și traseul o citesc de acolo.
- **Secțiunea, pe hârtie:** la distanța x de linie, cât x ≤ R, z = min(0, −d + h(x)), cu h interpolată liniar între puncte;
  dincolo de R, neatins. Peste înălțimea profilului, peretele e vertical la R (cilindrul frezei).
- **Același T cu altă siluetă** (alte puncte, chiar doar în h) e altă freză: refuzat, cu „profilată și profilată cu altă
  siluetă”. Aceeași siluetă pe două caneluri e o singură freză.
- **Raportul foilor** numește freza „profilată” (`profilata` pe rândul operației), nu ca pe o plată de același Ø.
- **Fereastra exportului** nu face încă rând unei operații cu profil (`formaPeRand`): Exportă o lasă neschimbată, iar
  programul o taie. Rândul, cu silueta doar de citit, vine în f-3.
- **Probele:** `test/unit/canelura.profil.test.ts`, scrisă întâi:
  - regula pe toate locurile;
  - drumul față de freza plată (simplu, cu rampa, cu urechile) pe trei profiluri;
  - secțiunea simulată față de hârtie, celulă cu celulă, la 0,01 mm, sub, la și peste înălțimea profilului, cu fundul și
    lățimea la față ca dinți;
  - refuzurile, identitatea pe T, raportul.

  Proba lucrării din f-1 (`profil.lucrare.test.ts`) a fost întoarsă pe canelură.
- **Neschimbate:** nimic pe server; documentul rămâne v32; programul fără profil, octet cu octet. Elicea cu profilul rămâne
  refuzată de simulare (o rampă pe arce, cu profilul, nu se simulează, ca la V).

## Implementarea (16.A↑f-3)

Pe 27.11, pe `wip/16.A-freze-e`, din `main` cu f-1 și f-2 unite (`8906dedf`), cu întrebarea 5a aplicată, partea profilurilor
parametrice (editorul siluetei desenate e f-5).

- **Punctele** (`puncteProfil`, `src/model/profilFreza.ts`):
  - fiecare arc al siluetei (`profilFreza`, cu pașii acum după raza și unghiul arcului) e împărțit cât coarda lui să stea la cel
    mult 0,0009 mm de el (`ABATERE_PROFIL`, 0,001 mm, cu o margine de 10 %);
  - punctele dublate pleacă, iar h nu scade (zgomotul lui sin la capete e tăiat);
  - treapta verticală a ogee-ului roman primește 0,0001 mm pe r, ca r să crească strict (abaterea, sub 0,001);
  - capătul e pus exact la raza frezei.

  Rotunjirea R3 pe Ø12 are 35 de puncte. Cel mai mare profil, în marginile unei freze de Ø100 (ogee-ul roman cu raza 24,9), are
  190, sub plafonul de 200.
- **`inaltimeCon`** s-a mutat din `freza.ts` lângă siluetă, cu tipul `CampuriProfil` (câmpurile frezei, fără importul ei):
  `freza.ts` cere acum punctele de acolo, iar regula `fara-cicluri` oprea cele două importuri unul spre altul. `freza.ts`
  îl reexportă.
- **Biblioteca:** profilurile au CAM (`FELURI_CU_CAM`), iar `sculaDinFreza` le copiază în proiect cu punctele lor. Tăierea
  (`frezePotrivite`) și lista „Din frezele mele” le oferă pe canelură, nu pe o parte (regula din f-2). Conica și burghiul rămân
  „în curând în proiect”.
- **Fereastra exportului:**
  - `FormaRand` are profilul cu punctele, iar rândul le ține (`Rand.profil`, opțional);
  - forma se arată „profilată (din „Frezele mele”)”, ca opțiune doar cât rândul o are; altă formă aleasă o scoate;
  - diametrul e doar de citit (e al siluetei), iar desenul frezei arată silueta, în oglindă, la scara corpului;
  - pe o parte, în buzunar și la găurire, verdictul formei (`profilPermis`, comparat cu modelul) oprește exportul, cu
    `motiv.profil`;
  - două siluete sunt două freze pe T (`formeEgale`, cheia din fereastră);
  - nota bibliotecii spune „înălțimea siluetei” când silueta s-a schimbat acolo;
  - Exportă scrie profilul, cu numele „freza profilata” când se schimbă (fără schimbare, aceeași freză, la octet);
  - „Pune-o înapoi în bibliotecă” nu se oferă pentru un profil: copia ține punctele, nu felul și valorile profilului
    parametric.
- **Probele:**
  - `test/unit/profil.document.test.ts`, scrisă întâi:
    - invariantele punctelor, pe 11 profiluri, de la R0,5 la cele mai mari de pe Ø100;
    - abaterea în ambele sensuri față de silueta din arce foarte dese;
    - felurile fără puncte;
    - ușa și lucrarea pe fiecare.
  - `test/unit/export.profil.test.ts`: forma pe rând, regula față de model, identitatea pe T, alegerea din bibliotecă, nota,
    copia de readus, ce scrie Exportă și programul, listele.
  - `test/e2e/export.profil.spec.ts`:
    - o rotunjire R3 Ø12 din „Frezele mele”, pe canelura dreptunghiului;
    - programul descărcat, judecat de oracolul simulării cu silueta pe hârtie (h(x) = √(9 − (6 − x)²)): secțiunea la 0,001 mm,
      lățimea la față 2·(6 − √5), nimic tăiat dincolo de 6 mm;
    - refuzul pe exterior.

  Probele vechi care știau profilurile „în curând” au fost întoarse (catalogul, Tăierea pe canelură cu cele 11 rotunjiri).
- **Neschimbate:** nimic pe server; documentul rămâne v32; programul fără profil, octet cu octet.

## Implementarea (16.A↑f-4)

Pe 27.11, pe `wip/16.A-freze-e`, peste f-3 (întrebările 2a și 3a aplicate, partea marginii). Mișcă mașina, deci proba secțiunii
pe hârtie a fost scrisă întâi.

- **Pe hârtie** (`src/model/profilMargine.ts`, pur): `fundProfil` (r(0), cel mai mare r cu h = 0), `inaltimeProfil` (h la
  capăt) și `retragereMuchie` (r(d) − r(0), cu r(d) cel mai mic r cu h ≥ d, interpolat pe linia siluetei).
- **Regula** (`motivFormaPeOperatie`): pe o parte, profilul merge cu fund plat (altfel `profil-fund`: centrul n-ar avea unde
  sta de desen) și cu adâncimea cel mult înălțimea profilului (altfel `profil-adancime`, și când adâncimea lipsește). Pe linie,
  ca în f-2; în buzunar, la găurire, în V-carve și pe relief, `profil`.
- **Drumul** e al frezei plate de 2·r(0), mișcare cu mișcare (`razaTraseu` în `src/cam/job.ts`, dat profilului ca diametru),
  pe exterior, interior, stânga și dreapta, cu rampa. Invarianta 2 se judecă tot cu raza drumului: deasupra fundului, freza
  taie silueta în piesă, cum cere §4.
- **Refuzurile lucrării**, cu T-ul frezei: fără fund plat; peste înălțimea profilului (cu înălțimea și adâncimea în motiv);
  cu urechi, degajări, intrări sau despărțirea foii (le calculează lucrarea cu raza frezei, nu cu fundul siluetei: vin, dacă
  e nevoie, pe o sub-felie a lor). Pe o freză în plus, profilul rămâne refuzat („taie doar ca profil”).
- **Fereastra exportului:** aceeași regulă, pe rând (`motivProfilRand`, comparată cu modelul de o probă), cu motivul ei
  (fundul, adâncimea cu înălțimea, opțiunile); sub **Adâncimea**, nota „La fund, peretele cade pe desen; muchia de sus se
  retrage cu … mm, după silueta frezei” (`HartieRand.margine`, din `retragereMuchie`). Tăierea și lista „Din frezele mele”
  oferă pe o parte doar profilurile destul de înalte pentru adâncimea scrisă (la 3 mm pe exterior, 10 din cele 11 rotunjiri
  ale catalogului; r2 are profilul de 2 mm).
- **Probele:**
  - `test/unit/profil.margine.test.ts`, scrisă întâi: valorile pe hârtie; regula; drumul față de freza plată de 2·r(0)
    (exterior, interior, rampa, stânga și dreapta pe o cale deschisă); secțiunea marginii simulate față de hârtie, celulă
    cu celulă, la 0,01 mm (z = min(0, −d + h(ρ)), ρ fiind distanța de la centrul frezei), cu dinți pe retragerea muchiei și
    nimic tăiat dincolo de ea; refuzurile.
  - `test/unit/export.profil.test.ts`: regula ferestrei față de model, la 2, 3 și 3,5 mm; rândul „pe hârtie” (3 − √5 la
    rotunjirea R3 Ø12, la 2 mm); listele pe o parte.
  - `test/e2e/export.profil.spec.ts`: aceeași rotunjire pe exterior, la 2 mm: nota (0,764 mm), programul descărcat judecat
    de oracolul simulării cu silueta pe hârtie (abaterea ≤ 0,001 mm, nimic tăiat în piesă dincolo de muchie); la 3,5 mm,
    refuzul cu înălțimea.

  Probele f-2 și f-3 care cereau profilul refuzat pe o parte cer acum `profil-adancime` peste înălțime;
  `frezeTaiere.spec.ts` numără rotunjirile oferite pe exterior.
- **Neschimbate:** nimic pe server; documentul rămâne v32; programul fără profil pe o parte, octet cu octet.

## Implementarea (16.A↑f-5)

Pe 28.11, pe `wip/16.A-freze-f5`, din `main` `09689d36`, cu întrebarea 5a aplicată (editorul siluetei desenate), la cuvântul
owner-ului transmis de sesiunea principală („Porneste sesiunile, pune-le sa continue cu ce aveau la rand”). Documentul rămâne
v32: forma `profil` era deja acolo.

- **Felul nou `desenata`** (`src/model/freza.ts`), cu CAM, la capătul listei felurilor, și câmpul `puncte` al frezei: (r, h)
  în mm, de la (0, 0) la (Ø / 2, capătul), r strict crescător, h nedescrescător, 2–200 de puncte, în marginile ușii (r până la
  Ø-ul maxim, h până la adâncimea maximă). `problemaPuncte` dă prima greșeală, cu punctul ei: `lipsa`, `puncte-putine`,
  `puncte-multe`, `puncte-numar`, `puncte-inceput`, `puncte-r`, `puncte-h`, `puncte-capat`. Capătul (`inaltimeCon`) e h-ul
  ultimului punct, iar silueta (`profilFreza`), chiar punctele.
- **Punctele se țin rotunjite la 0,0001 mm** (`PAS_PUNCT`, `puncteRotunjite`), afară de raza capătului (jumătatea
  diametrului, cu oricâte zecimale): cea mai mare freză desenată (200 de puncte, toate câmpurile la margine) încape în cont
  (`OCTETI_FREZA`, 8 kB; cu dublele întregi, un profil mare trecea de 7 kB doar cu punctele). Rotunjirea aduce cel mult
  0,00007 mm. Judecata se face pe punctele rotunjite: ce se judecă e ce se ține.
- **Copia în proiect** (`sculaDinFreza`): forma `profil`, cu o copie a punctelor și capătul pus exact pe rază. Unde merge,
  judecă regula de azi (`motivFormaPeOperatie`): pe linie și pe o parte (cu fund plat, cât de înaltă cere adâncimea), nu în
  buzunar.
- **„Pornește de la…”** (`puncteDesenate`, în `src/model/profilFreza.ts`): silueta oricărei freze ca puncte bune: arcele ca
  linii sub 0,001 mm (aceeași împărțire ca `puncteProfil`, scoasă în `liniiSilueta`), rotunjite; un punct care nu mai crește pe
  r după rotunjire pleacă. Pe tot catalogul și pe frezele de pornire, la cel mult 0,001 mm de silueta din arce dese
  (Hausdorff pe vârfuri).
- **Fișierul:** JSON-ul poartă punctele dus-întors. CSV-ul are coloana `puncte` („0 0 | 2 0 | 3 1,5 | 6 4”: perechi
  despărțite de „|”, r și h de spații, cu virgula zecimală cum o ia separatorul), doar pe felul `desenata`; diametrul nescris
  vine din ultimul punct.
- **Editorul** (`src/app/SiluetaDesenata.tsx`): în editorul frezei, „Silueta desenată” are:
  - desenul la scară, cu un mâner pe fiecare punct (afară de vârf). Tras, punctul se lipește la 0,1 mm și rămâne între vecini
    (r la cel puțin 0,1 mm de ei, h între h-urile lor), deci silueta rămâne bună; cât ține tragerea, scara rămâne cea de la
    început. Cu săgețile, 0,1 mm; cu Shift, 1 mm. Mânerele dese se micșorează, ca să nu se suprapună;
  - „Pornește de la…”, cu frezele bibliotecii și profilurile catalogului;
  - diametrul, dat de ultimul punct (câmpul lui nu se arată la felul desenat);
  - tabelul punctelor: primul fix în (0, 0), „+” (la mijloc între două puncte; după ultimul, cu 1 mm mai departe) și „✕”; cu
    multe puncte, tabelul se derulează în locul lui;
  - greșeala sub tabel, cu numărul punctului, și câmpul ei marcat; un diametru peste 100 mm are mesajul lui.

  Trecută pe „Desenată”, freza pornește de la silueta ei de până atunci (o plată Ø6 dă (0, 0), (3, 0)). Fișa arată
  înălțimea siluetei și punctele (strânse peste 12).
- **Probele:**
  - `test/unit/freza.desenata.test.ts`, scrisă întâi: judecata (fiecare motiv și punctul lui), rotunjirea, copia și ușa
    documentului, mărimea în cont, „Pornește de la…” pe tot catalogul, alegerea, datele, fișierul;
  - `test/e2e/freze.desenata.spec.ts`: editorul (tabelul, greșelile, tastele, tragerea cu lipirea și vecinii), fișa și
    reîncărcarea, „Pornește de la…” cu exportul și importul JSON, alegerea pe canelură în Tăierea, editorul la 1280, 390, 360
    și 320 px cu fontul lat. La 320 px, proba a prins tabelul ieșit cu 26 px din fereastră: coloanele au acum lățimi fixe, iar
    pe ecranul îngust „+” și „✕” stau unul sub altul.
- **Otrăvurile:** `test/otravuri/16.A-f5.py`, 36 / 36 prinse (22 pe model, 14 e2e); D14 scăpase la prima rulare și e prinsă
  de proba nouă.
- **Mărimea:** pornirea neschimbată, 112,0 kB (cu ușa și cu Atelierul 117,8 / 125); totalul 945,6 → 949,2 / 1 000 (+3,6 kB:
  editorul stă în bucata ferestrei „Frezele mele”, la cerere).
- **Neschimbate:** nimic pe server (frezele stau în cont ca text JSON, fără judecata felului); documentul rămâne v32;
  programul, octet cu octet.

## Se redeschide dacă

- o placă arată că marginea profilată sau canelura cu profilul nu ies ca pe hârtie;
- o freză reală are o siluetă care nu e monotonă (o subtăiere, ca o freză în coadă de rândunică): cere alt model decât
  câmpul de înălțimi;
- plafonul pornirii nu mai lasă loc formei în schema ușii.
