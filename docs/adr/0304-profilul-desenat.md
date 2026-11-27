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
| f-2 | canelura cu profilul (pe linie) și intrarea în proiect: biblioteca (profilurile parametrice și cel desenat), Tăierea, rândurile exportului (silueta pe rând, doar de citit) | secțiunea canelurii simulate față de hârtie (oglinda siluetei); rândul poartă punctele, Exportă le scrie |
| f-3 | marginea profilată pe o parte: centrul la r(0) de desen, adâncimea cel mult h_max, nota în fișă | secțiunea marginii simulate față de hârtie, celulă cu celulă; nimic tăiat dincolo de profil; refuzul peste h_max |
| f-4 | editorul siluetei desenate în „Frezele mele” (tabelul, desenul, tragerea, „Pornește de la…”), CSV și JSON | marginile punctelor; dus-întors prin fișier; e2e pe editor |

### 7. Mărimea

f-1 adaugă silueta în nucleu (în workerele simulării și CAM) și forma în schema ușii: ținta e cel mult +0,3 kB în pornirea cu
ușa și +2 kB în total pe toată felia f; fiecare sub-felie își spune creșterea în raport.

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
  deja atinsă: nucleul se numără de două ori (workerul CAM și workerul simulării), iar schema ușii cu migrarea încă o dată. f-2…f-4
  își spun creșterea; o creștere peste plafon cere decizia owner-ului.
- **Neschimbate:** nimic pe server; programul fără profil, octet cu octet (corpusul CAM, aurul plăcilor și al atelierelor).

## Se redeschide dacă

- o placă arată că marginea profilată sau canelura cu profilul nu ies ca pe hârtie;
- o freză reală are o siluetă care nu e monotonă (o subtăiere, ca o freză în coadă de rândunică): cere alt model decât
  câmpul de înălțimi;
- plafonul pornirii nu mai lasă loc formei în schema ușii.
