# ADR 0303: Bila și toroidala în proiect: documentul v31, simularea, oracolul și CAM-ul

**Starea:** propus pe 26.11.2026, în sesiunea cloud a liniei frezelor (ramura `wip/16.A-freze-e`), la cuvântul owner-ului
transmis de sesiunea principală: „Zi-le ca pot continua cu ce urmeaza la fiecare” (16.A↑d cere placa 4 tăiată, deci urmează
16.A↑e). Întrebările de la capăt merg la owner grupat; linia merge mai departe cu recomandările. **Completează:** ADR 0300 §9
(formele noi, ordinea: întâi simularea și oracolul, apoi CAM-ul), ADR 0302 §2 (felurile „în curând în proiect”), ADR 0312 §1
(bila, documentul v29, doar la finisarea reliefului).

## Ce e azi

- Biblioteca „Frezele mele” ține bila și toroidala din 16.A↑h-4 (ADR 0302 §2), cu raza colțului (`raza`, 0 < r < Ø / 2) și
  silueta lor. Toroidala e „în curând în proiect”: nu are formă în document, deci nu ajunge pe o operație.
- Bila are formă în document din v29 (`{ tip: 'bila' }`, ADR 0312 §1), dar lucrarea o primește doar la finisarea reliefului
  (`motivFormaPeOperatie`, `src/model/formaFrezei.ts`); pe orice altă operație e refuzată, cu motiv.
- Nucleul simulării (`src/sim/nucleu.ts`) știe plata, bila și V-ul (cu vârful plat); elicea doar cu freza plată. Oracolul
  simulării (`test/oracles/simulare.ts`) știe plata, bila, V-ul și profilul ca puncte (r, h).
- Forma toroidalei a fost stabilită cu linia reliefului pe 24.11 (nota liniei, `docs/linii/freze.md`): `{ tip: 'toroidala',
  raza }`, cu 0 < raza < Ø / 2 strict; raza = Ø / 2 se scrie doar ca bilă (o singură scriere pe freză).

## Decizia

### 1. Forma toroidalei în document (v31)

`scula.forma = { tip: 'toroidala', raza }`, pe orice freză a unei operații (ca bila, la ușă); `raza` e raza colțului, în mm,
cu 0 < raza < diametru / 2 **la ușă** (o freză cu raza cât jumătatea diametrului e o bilă și se scrie așa; una cu raza peste
nu există). Câmpurile necunoscute ale formei rămân, nejudecate. Unde se poate folosi o judecă lucrarea
(`motivFormaPeOperatie`), ca la bilă. Migrarea v30 → v31 schimbă doar numărul; un v30 cu o freză toroidală nu e un v30
valid, deci migrarea îl refuză (ca un v28 cu bila, ADR 0312 §3).

### 2. Silueta și simularea

Toroidala e discul plat de rază a = R − ρ (R = Ø / 2, ρ = raza colțului) cu sfertul de cerc de rază ρ în jurul lui:
h(d) = 0 pe d ≤ a și ρ − √(ρ² − (d − a)²) pe a < d ≤ R. E o bilă cu „vârful plat” a, cum V-ul de gravare e un V cu vârf
plat (ADR 0092). În nucleu:

- plonjarea, arcul la Z constant și linia orizontală au formă închisă (ca la orice siluetă: h(distanța), cu distanța cea mai
  mică pe bucata de drum care acoperă celula);
- linia înclinată (rampa, intrările cu rampă, zigzagul): pe celulă, minimul lui m·s + h(√(s² + p²)) pe intervalul în care
  scula acoperă celula (s de-a lungul mutării, p distanța celulei la ea, m panta); funcția e convexă (h convexă și
  nedescrescătoare, distanța convexă), dar punctul staționar e rădăcina unei ecuații de gradul patru, deci se găsește prin
  înjumătățirea derivatei (monotonă), cu un număr fix de pași, doar cu + − × ÷ √ (ADR 0047 §6: aceeași amprentă în Node și
  în browser);
- elicea cu bila și cu toroidala rămâne refuzată în e-1, cu motiv (ca azi la bilă); vine în e-2.

### 3. Oracolul simulării

`test/oracles/simulare.ts` primește felul `toroidala` (diametrul și raza colțului), cu h scris altfel decât nucleul:
h(r) = ρ·(1 − cos(asin((r − a) / ρ))) pe r > a, 0 în rest; panta lui crește spre margine fără limită (la r = R e
verticală), deci e o sculă „neblândă”, ca bila (pereții se judecă pe hârtie, nu prin marja de eșantionare).

### 4. Lucrarea, pe sub-felii

Programul de azi rămâne octet cu octet: nicio operație fără bilă sau toroidală nu se schimbă. Fiecare sub-felie are proba ei
întâi, cu invariantele: niciodată mai adânc decât pasul pe trecere, freza nu intră greșit în piesă.

| Sub-felia | Ce aduce | Probele |
| --- | --- | --- |
| e-1 | documentul v31, IR-ul, nucleul și oracolul cu toroidala; lucrarea refuză toroidala pe orice operație, cu motiv | nucleul față de oracol (plonjarea, liniile orizontale și înclinate, arcele), secțiunea canelurii pe hârtie, ușa și oracolul documentului |
| e-2 | elicea cu bila și cu toroidala, în nucleu și în oracol | nucleul față de oracol pe elice |
| e-3 | CAM-ul pe linie (canelura) cu bila și cu toroidala: lucrarea, scula din IR cu forma, raportul foilor | secțiunea canelurii simulate față de hârtie: lățimea la față 2·(a + √(ρ² − (ρ − d)²)) pentru d < ρ, Ø pentru d ≥ ρ |
| e-4 | intrarea în proiect: biblioteca (toroidala pleacă din „în curând”), lista „Freza” din Tăierea, rândurile exportului (copia ferestrei cu formele rotunde) | rândul poartă forma și raza; Exportă scrie freza rotundă, nu o plată; lista oferă freza doar unde lucrarea o primește |
| e-5 | buzunarul cu bila și cu toroidala: fundul și pereții | creasta dintre treceri pe hârtie, h = ρ − √(ρ² − ((s − 2a) / 2)²) pentru pasul lateral s > 2a (0 pentru s ≤ 2a; la bilă a = 0); pereții nu trec de desen; oracolul buzunarului judecă fundul cu creasta |
| e-6 | profilul pe o parte, doar cât peretele iese vertical | peretele de la față până la adâncimea − ρ e pe desen, racordarea de rază ρ la fund; refuzul cu motiv sub adâncimea ρ |

Frezele de rest, fundul plat al V-carve-ului, dopurile și banda rămân doar cu freza plată (refuzul de azi, cu motiv).

### 5. Mărimea

e-1 adaugă silueta în nucleu (în workerele simulării și CAM) și forma în schema ușii (în pornire, cu ușa): ținta e cel mult
+0,2 kB în pornirea cu ușa și +1 kB în total; fiecare sub-felie își spune creșterea în raport.

## Întrebările pentru owner (cu recomandarea întâi)

1. **Buzunarul cu bila sau cu toroidala: cum se alege pasul lateral?**
   a. Pasul lateral rămâne câmpul de azi, iar creasta rezultată se spune lângă el, pe hârtie (recomandat: aceeași fișă
      pentru orice freză; creasta e o consecință vizibilă).
   b. Se scrie creasta dorită, iar pasul lateral se calculează din ea.
2. **Profilul pe o parte cu bila sau cu toroidala:**
   a. Permis când adâncimea e cel puțin raza colțului: peretele iese vertical de la față în jos, cu racordarea de rază ρ la
      fund, spusă în fișă (recomandat).
   b. Doar la tăieturile prin foaie, cu adâncimea cel puțin grosimea plus raza colțului (racordarea rămâne în placa de
      sacrificiu).
   c. Deloc (doar pe linie și în buzunar).
3. **Elicea (coborârea în buzunar, găurirea) cu bila sau cu toroidala:**
   a. Simulată exact (e-2) și permisă (recomandat).
   b. Refuzată, cu motiv (coborârea se alege plonjare, rampă sau zigzag).
4. **Finisarea reliefului cu toroidala:**
   a. A liniei reliefului, după e-1 (forma există în document; o felie a ei) (recomandat).
   b. În linia frezelor, după e-6.
5. **Bila și toroidala ca freze de rest, de fund plat sau ale dopului:**
   a. Refuzate, cu motiv (recomandat: geometria lor e a frezei plate).
   b. Permise, cu fundul socotit ca la buzunar.

## Implementarea (16.A↑e-1)

Pe 26.11, pe `wip/16.A-freze-e` (din `main` `d1ab8ba5`), cu v31 ținut de sesiunea principală pentru linie.

- **Documentul v31** (`src/model/document.ts`, `schemaDocument.ts`, `migrari.ts`): `FormaToroidala = { tip: 'toroidala',
  raza }` în `FormaSculaDoc`; la ușă, `raza` pozitivă și sub jumătatea diametrului (judecată pe scula întreagă, cu calea
  `forma.raza`); `v30v31` schimbă doar numărul și refuză un v30 cu o toroidală pe orice freză a unei operații
  (`frezeOperatieBrute`). Oracolul documentului are secțiunea v31 (`SCHEMA_V31_O`, `problemeRazaToroidalaO`), cu cazurile pe
  hârtie T01–T07 și RT0–RT10; corpusul de aur are canelura cu o toroidală Ø6 r1 (T10) în v31.
- **IR-ul și simularea:** `FormaScula` primește toroidala; nucleul are felul 3 al siluetei (`a = R − ρ`, `rho`), cu `H` și
  raza la o adâncime în formă închisă, iar linia înclinată ia minimul lui m·s + h(√(s² + p²)) prin înjumătățirea derivatei,
  în 64 de pași (`minimToroidala`); pe orizontală, s = 0 tăiat la interval. `program.ts` refuză raza în afara (0, Ø / 2) și
  elicea cu toroidala (e-2).
- **Oracolul simulării** (`test/oracles/simulare.ts`): felul `toroidala`, cu h(r) = ρ·(1 − cos(asin((r − a) / ρ))), panta
  utilă și refuzul razei. Proba (`test/unit/simulare.toroidala.test.ts`): nucleul față de oracol pe plonjări, linii orizontale
  și înclinate, arce, cu martorul unei bile de același diametru (cade); h pe hârtie; secțiunea canelurii la −1 (Ø6 r1,5:
  2·(a + √(ρ² − (ρ − d)²)) = 5,828 mm); axa rampei pe hârtie.
- **Lucrarea** (`src/cam/job.ts`, `src/model/formaFrezei.ts`): toroidala e refuzată pe orice operație și pe orice freză a ei
  (scula, rest, fundul plat, dopul, banda, finisarea, degroșarea), cu motivul „freza toroidală (T…, cale) nu se taie încă”;
  `motivFormaPeOperatie` dă `toroidala`, deci biblioteca n-o oferă (nici `FELURI_CU_CAM` nu o are încă). Fereastra exportului
  face rând doar operațiilor cu freze plate și în V (`operatieCuRand`, `formaPeRand`): altfel copia ferestrei, care știe doar
  V-ul, ar scrie la Exportă o plată în locul toroidalei. Panoul numește freza toroidală (`prop.freza.valoare-toroidala`).
- **Rămâne pentru e-3 și e-4** (renumerotate la e-3): `sculaIR` trece toroidala în IR, raportul foilor o numește, lista „Freza” și rândurile exportului o
  poartă (cu raza), biblioteca o scoate din „în curând”.

## Implementarea (16.A↑e-2)

Pe 27.11, pe `wip/16.A-freze-e` (peste `7c3f166b`, cu `main` `0df06eca` adus).

- **Nucleul** (`src/sim/nucleu.ts`, `eliceaRotunda`): bila e toroidala cu discul plat a = 0 și raza colțului ρ = R. Pe celula
  de la distanța p de centrul elicei (raza r), cu scula la unghiul ψ față de ea, distanța e d(ψ) = √(p² + r² − 2pr·cos ψ), iar
  cel mai jos punct e z(u) + h(d(ψ)). Urcarea se citește de la capăt (u' = S − u, unghiul celulei S − v), deci Z-ul scade
  mereu. O celulă atinsă pe o tură e atinsă la fel și pe tura următoare, mai jos, deci se caută doar în ultimele 2π ale
  elicei. Pe fiecare bucată a cercului în care scula acoperă celula (|ψ| ≤ α), latura de dinaintea trecerii doar coboară
  (minimul la capătul ei). Pe latura de după trecere, F(d) = h(d) + m·ψ(d), iar semnul lui F' e semnul lui G(d) − |m|, cu
  G(d) = h'(d)·√((d² − (p − r)²)((p + r)² − d²)) / (2d), fără trigonometrie.
- **Structura lui G:** G crește când scula acoperă celula doar pe o bucată din cerc; când o acoperă de pe tot cercul (miezul,
  p + r ≤ R), întâi crește, apoi scade. Pe bilă, pe hârtie: numărătorul lui g''(ψ) e c² + κc + 1 (c = cos ψ, κ = (R² − p² −
  r²) / (pr)), cu vârful exact la marginea domeniului, deci g e convexă cât acoperirea e parțială și are o singură inflexiune
  când e totală. Pe toroidală, structura e sondată: pe 200 000 de cazuri la întâmplare, cel mult o inflexiune, mereu din convex
  în concav, și doar cu acoperirea totală.
- **Minimul:** mulțimea {G ≥ |m|} e un interval [d1, d2], deci minimul lui F e în d1 sau la capătul bucății. Pragul d1 vine
  prin înjumătățire (64 de pași). Când G e sub |m| la ambele capete (miezul), maximul lui G vine prin secțiunea de aur (64 de
  pași). Pe fiecare candidat se fac un `acosD` și un `cosD`, iar în rest doar + − × ÷ √ (ADR 0047 §6). Celulele pe care
  capătul elicei, cu scula cât mai aproape, nu le-ar coborî se sar.
- **Programul** (`src/sim/program.ts`): elicea cu bila și cu toroidala nu mai e refuzată; cea cu V-ul, da, cu motiv.
- **Probele** (`test/unit/simulare.elice.test.ts`):
  - nucleul față de oracol pe șapte piese: miezul și inelul; coborârea și urcarea; o tură, o bucată de tură și două ture la
    rând; panta mică și mare. Pe fiecare, martorul celeilalte forme rotunde cade;
  - centrul unei ture întregi, pe hârtie: z_capăt + h(r);
  - aceeași amprentă pe 1, 2, 3 și 5 benzi;
  - 300 de elice la întâmplare (sămânță fixă, 19 200 de celule): fiecare celulă e minimul global al unei căutări dense pe
    elice, scrisă în probă cu h din oracol, la un ulp de Float32. Proba ar prinde un minim doar local, unde structura e doar
    sondată.
- **Neschimbate:** elicea cu freza plată (`eliceaPlata`), arcele la Z constant, liniile; programul (CAM-ul), octet cu octet.
  Lucrarea refuză mai departe toroidala pe orice operație și bila în afara finisării reliefului: elicea lor din buzunar și din
  găurire ajunge în program abia cu CAM-ul lor (e-5).

## Implementarea (16.A↑e-3)

Pe 27.11, pe `wip/16.A-freze-e`, peste e-2 (`e5bdde83`). Felia e-3 de la propunere s-a împărțit în două, iar sub-feliile de
după s-au renumerotat (tabelul de mai sus e la zi; id-urile feliilor primesc după cratimă doar cifre): **e-3** e CAM-ul
canelurii și raportul, **e-4** e
intrarea în proiect (biblioteca, lista „Freza” din Tăierea, rândurile exportului, care cer copia ferestrei cu
formele rotunde).

- **Regula formei** (`motivFormaPeOperatie`): bila și toroidala merg pe profilul pe linie. Pe o parte, în buzunar, la găurire și
  în V-carve rămân refuzate (`bila`, `toroidala`). Pe relief rămân cum erau: finisarea cu bila merge, toroidala e a liniei
  reliefului.
- **Lucrarea** (`refuzFinisareSiBila`, `src/cam/job.ts`): o formă rotundă e primită doar ca freză a canelurii (calea `scula` a
  unui profil pe linie), iar pe orice freză în plus rămâne refuzată, cu motiv. Centrul frezei merge pe linie, deci drumul e al
  frezei plate de același Ø, mișcare cu mișcare, cu treceri egale cel mult cât pasul. `sculaIR` trece toroidala în IR, cu raza
  colțului, iar simularea o taie cu forma ei. Același T cu două raze ale colțului (sau o bilă și o toroidală) înseamnă două
  freze, deci e refuzat, cu forma fiecăreia în motiv.
- **Raportul foilor** numește freza canelurii („T1 toroidală r1,5 Ø6”, ca „bilă” la bilă), ca operatorul să nu monteze o plată.
- **Listele care pun o freză pe o operație cu rând în fereastra exportului** (`frezePotrivite`, adică lista „Freza” din Tăierea,
  și `frezePeRanduri`) oferă doar formele pe care copia rândului le poartă (`formaPeRand`: plata și V-ul). Bila e de la
  relief între felurile cu CAM, deci altfel ar fi apărut pe canelură și pe rândurile exportului, iar Exportă ar fi scris o
  plată în locul ei. Le deschide e-4, odată cu copia ferestrei. Buzunarul e acum e-5, iar profilul pe o parte e-6.
- **Probele** (`test/unit/canelura.rotunda.test.ts`):
  - tabelul formei pe operație;
  - drumul canelurii cu bila și cu toroidala (r1, r2,5), identic cu al frezei plate, cu forma în IR;
  - refuzurile rămase;
  - același T;
  - secțiunea canelurii simulate pe hârtie: lățimea la față 2·(a + √(ρ² − (ρ − d)²)) sub raza colțului, Ø peste ea, fundul
    plat 2·a, pe bila Ø6 și pe toroidala Ø6 r1 și r2,5, la șase adâncimi;
  - raportul.

  Probele vechi care cereau refuzul pe linie (`finisare.bila`, `toroidala.lucrare`) au fost întoarse.
- **Programul de azi**, fără forme rotunde, iese octet cu octet.

## Implementarea (16.A↑e-4)

Pe 27.11, pe `wip/16.A-freze-e`, peste e-3 (unită în `main` prin `db066160`).

- **Copia rândului** din fereastra exportului (`exportRand.ts`) poartă bila și toroidala: `FormaRand` are trei feluri (V, bilă,
  toroidală cu raza colțului), iar rândul are `formaScula` cu patru valori și `razaColt`, cu `formaDinRand` și `campuriForma`
  dus-întors. Identitatea frezei pentru T (`formeEgale`, `numarPentruRand`, `cheieFreza`) ține felul și raza: o bilă, o toroidală
  cu altă rază și o plată de același Ø sunt trei freze. Nota bibliotecii (`diferenteFreza`) vede felul (`forma`) și raza;
  recunoașterea cere forma întreagă; copia de readus (`CopieRand`, `CopieProiect`) ține forma rotundă, iar `frezaDinCopie` îi dă
  felul ei, nu o plată (paza compilatorului din 16.A↑b-6 a căzut, cum spunea că va cădea). Marginile: raza colțului în (0, Ø / 2)
  (`campuriSculaGresite`, câmpul `raza`, cu greșeala pe câmp).
- **Exportă** (`sculaScrisa`, `src/app/valoriOperatii.ts`) scrie forma rotundă, cu numele după formă („freza bila”, „freza
  toroidala r1.5”) doar când ea se schimbă; pe același fel, forma din document se îmbină (un câmp necunoscut rămâne), deci un
  Exportă fără schimbare scrie aceeași freză, la octet. `ExportConectat` citește forma întreagă din document și din bibliotecă.
- **Fișa** (`FisaOperatie.tsx`): lista formei arată bila și toroidala doar pe linie (sau cât rândul le are deja), câmpul **Raza
  colțului (mm)** apare la toroidală (în grupul Freza, cu explicația și greșeala lui), iar desenul frezei are capătul rotund, cu
  raza cotată. Pe altă latură, forma rotundă oprește exportul cu motivul ei (`rotunda`, „taie deocamdată doar pe linie”).
- **Rândul operației** (`operatieCuRand`): freza operației poate fi rotundă; frezele în plus (de rest, ale fundului plat, ale
  dopului, a benzii) rămân plate sau în V, fiindcă rândul nu le poartă forma.
- **Biblioteca:** `FELURI_CU_CAM` are toroidala, deci nu mai e „în curând în proiect” în „Frezele mele” și în catalog;
  `sculaDinFreza` îi dă forma cu raza. Lista „Freza” din Tăierea (`frezePotrivite`) și listele de pe rândurile exportului
  (`frezePeRanduri`) oferă bila și toroidala doar unde lucrarea le primește (pe linie).
- **Probele:** `test/unit/export.rotunda.test.ts` (scrisă întâi: forma pe rând, identitatea pentru T, alegerea și valorile noi,
  nota și recunoașterea, copia de readus, marginile, ce scrie Exportă și forma din IR a programului, listele) și
  `test/e2e/export.rotunda.spec.ts` (canelura cu toroidala și cu bila în fereastră: lista formelor pe latură, raza judecată,
  Exportă scrie forma, cu numele în comentariul sculei, fereastra redeschisă o arată, exteriorul o oprește); proba privirii are
  câmpul razei; probele vechi care cereau toroidala „în curând” sau bila fără rând au fost întoarse.
- **Neschimbate:** nimic pe server; documentul rămâne v31; programul fără forme rotunde, octet cu octet.

## Implementarea (16.A↑e-5)

Pe 27.11, pe `wip/16.A-freze-e`, peste e-4 (unită în `main` prin `72263843`).

- **Drumul:** buzunarul cu bila și cu toroidala ia inelele și liniile frezei plate de același Ø, mișcare cu mișcare: centrul
  stă la R de perete, iar inelele la R + k·s. Pereții nu trec de desen, fiindcă raza siluetei e cel mult R la orice înălțime.
  La fund rămâne racordarea de rază ρ a frezei: la δ < R de perete, h(R − δ). Coborârea e plonjarea, rampa, zigzagul sau elicea
  (simulată exact din e-2, întrebarea 3a). Scula din IR își poartă forma.
- **Creasta, precizată față de tabelul de mai sus:** ADR-ul dă h(s / 2) = ρ − √(ρ² − ((s − 2a) / 2)²), care e creasta dintre
  două inele drepte, la mijlocul lor. Un punct al fundului poate sta însă la aproape s de drum (ADR 0069 §3 garantează doar
  „mai puțin de s”):
  - pe colțurile inelelor unui dreptunghi, la √2·s / (1 + √2) ≈ 0,586·s;
  - pe mijlocul buzunarului, după ultimul inel, până la s.

  Deci fundul stă cel mult la h(s). Fișa le spune pe amândouă, sub pasul lateral (întrebarea 1a): „Creasta pe fund: h(s/2) mm
  între inele, cel mult h(s) mm”. Pentru o creastă de pe tot fundul cât cea dintre inele, ar trebui o trecere în plus pe axa
  medială, lucru pe care drumul de azi nu-l face. Regula e `creastaBuzunar` (`src/model/creasta.ts`, cu silueta în
  `inaltimeFreza`). Tot pe ea trece acum și `creastaPePlan` a reliefului, care dădea 0 pentru toroidală.
- **Refuzurile** (`motivFormaPeOperatie`, cu restul operației; lucrarea și listele):
  - după o freză rotundă, nicio freză de rest (`rotunda-rest`, întrebarea 5a: geometria lor e a frezei plate);
  - nicio incrustație cu pereți drepți (`rotunda-incrustatie`: pereții și fundul dopului cer fundul plat);
  - o freză de rest rotundă, refuzată ca până acum.

  Tăierea (`frezePotrivite`) nu oferă bila și toroidala pe un buzunar care are freze de rest sau o incrustație cu pereți drepți.
- **Fereastra exportului:**
  - lista formei arată bila și toroidala și pe buzunar;
  - regula rândului e `rotundaPermisa` (`exportRand.ts`), scrisă în interfață fiindcă aceasta nu importă modelul; o probă o
    compară cu modelul;
  - creasta vine pe rândul „pe hârtie” (`hartieRand`, câmpul `creasta`), socotită de aplicație;
  - motivul `rotunda` spune unde merg formele rotunde și ce le oprește.
- **Oracolul buzunarului** (`test/oracles/buzunar.ts`, extins de linie din ADR-uri):
  - silueta bilei și a toroidalei pe câmpul trecerilor;
  - refuzurile rotunde;
  - judecata a 7-a, fundul: în zona centrului, h(d), cu d distanța exactă la drumul de la adâncimea finală, căutată până la R, cel
    mult h(s). Cazurile pe hârtie au bila pe dreptunghiul 100 × 60 (cele mai înalte puncte pe colțurile inelelor) și toroidala
    pe cercul R20 (vârful în centru), iar perechea care pică e programul judecat față de un pas lateral mai mic.
- **Probele:**
  - `test/unit/buzunar.rotunda.test.ts`, scrisă întâi: regula formei, drumul frezei plate (inelele, liniile, elicea),
    refuzurile, creasta pe hârtie, buzunarul simulat (creasta dintre inele, racordarea, peretele netrecut, cel mai înalt punct
    pe colțurile inelelor), regula ferestrei față de model;
  - `test/e2e/export.rotunda.spec.ts`: buzunarul cu bila din fereastră, cu nota crestei, refuzul cu o freză de rest și fundul
    simulat de oracol, pe octeții din browser;
  - probele vechi care cereau refuzul pe buzunar au fost întoarse.
- **Neschimbate:** nimic pe server; documentul rămâne v31; programul fără forme rotunde, octet cu octet.

## Implementarea (16.A↑e-6)

Pe 27.11, pe `wip/16.A-freze-e`, peste e-5, cu întrebarea 2a aplicată.

- **Drumul:** profilul pe o parte (exterior, interior, stânga, dreapta) cu bila și cu toroidala e al frezei plate de același
  Ø, mișcare cu mișcare, și cu urechile, rampa, intrările și degajările: centrul stă la R de desen. Silueta are raza cel mult R
  la orice înălțime, deci nimic nu intră în piesă: invariantele frezei plate rămân, cu o margine în plus.
- **Peretele, pe hârtie:** la δ de desen, spre deșeu, adâncimea e d − h(|R − δ|). Pe desen (δ = 0), silueta are raza R abia la ρ
  deasupra vârfului, deci peretele e vertical de la față până la d − ρ, iar la fund rămâne racordarea de rază ρ. Prin foaie
  (d ≥ grosimea g), cât d − ρ < g, racordarea rămâne pe muchia de jos a piesei, pe g − (d − ρ) mm. Regula e `peretePeOParte`
  (`src/model/creasta.ts`, cu raza colțului în `razaColtului`: bila Ø / 2, toroidala ρ).
- **Refuzul** (`motivFormaPeOperatie`, care primește acum adâncimea operației și diametrul frezei): pe o parte, sub raza
  colțului, `rotunda-adancime` (peretele n-ar ajunge la desen). Fără adâncime știută sau, la bilă, fără diametru, refuzat.
  Lucrarea spune freza, raza colțului și adâncimea; Tăierea (`frezePotrivite`) oferă bila și toroidala pe o parte doar cu
  adâncimea operațiilor alese cel puțin raza colțului frezei din bibliotecă. Găurirea, V-carve-ul și frezele în plus rămân
  refuzate.
- **Fereastra exportului:**
  - lista formei arată bila și toroidala pe orice profil;
  - regula rândului (`rotundaPermisa`) cere adâncimea cel puțin raza colțului (`razaColtRand`), iar greșeala, în grupul Freza,
    spune raza (`motiv.rotunda-adancime`); un număr de necitit își are greșeala pe câmpul lui;
  - sub adâncime, nota peretelui (`hartieRand`, câmpul `perete`): „Peretele e vertical de la față până la … mm; la fund rămâne
    racordarea de rază … mm”, cu marginea de jos prin foaie, când e;
  - lista „Din frezele mele” a rândului nu cere adâncimea (ca frezele de rest ale buzunarului): greșeala o spune rândul.
- **Probele:**
  - `test/unit/profil.rotunda.test.ts`, scrisă întâi: regula formei cu adâncimea, drumul frezei plate (exterior, interior, cu
    urechi, rampă, intrări, degajări, stânga, dreapta), refuzul sub ρ, secțiunea peretelui simulat față de hârtie (celulă cu
    celulă, la 0,01 mm: nimic tăiat în piesă, totul tăiat cel puțin d − ρ între desen și centru), `peretePeOParte`, regula
    ferestrei față de model;
  - `test/e2e/export.rotunda.spec.ts`: nota peretelui pe exterior, cu bila și cu toroidala, și programul cu bila simulat de
    oracol, pe octeții din browser;
  - probele vechi care cereau refuzul pe o parte au fost întoarse.
- **Neschimbate:** nimic pe server; documentul rămâne v31; programul fără forme rotunde, octet cu octet. Cu e-6, ADR-ul are
  toate sub-feliile făcute.

## Se redeschide dacă

- placa 4 (sau o placă a bilei) arată că secțiunea canelurii, creasta din buzunar sau peretele pe o parte nu ies ca pe hârtie;
- owner-ul cere toroidala la finisarea reliefului înaintea liniei reliefului;
- plafonul pornirii nu mai lasă loc formei în schema ușii.
