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
| e-3 | CAM-ul pe linie (canelura) cu bila și cu toroidala; intrarea în proiect: biblioteca (toroidala pleacă din „în curând”), lista „Freza” din Tăierea, rândurile exportului | secțiunea canelurii simulate față de hârtie: lățimea la față 2·(a + √(ρ² − (ρ − d)²)) pentru d < ρ, Ø pentru d ≥ ρ |
| e-4 | buzunarul cu bila și cu toroidala: fundul și pereții | creasta dintre treceri pe hârtie, h = ρ − √(ρ² − ((s − 2a) / 2)²) pentru pasul lateral s > 2a (0 pentru s ≤ 2a; la bilă a = 0); pereții nu trec de desen; oracolul buzunarului judecă fundul cu creasta |
| e-5 | profilul pe o parte, doar cât peretele iese vertical | peretele de la față până la adâncimea − ρ e pe desen, racordarea de rază ρ la fund; refuzul cu motiv sub adâncimea ρ |

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
   b. În linia frezelor, după e-5.
5. **Bila și toroidala ca freze de rest, de fund plat sau ale dopului:**
   a. Refuzate, cu motiv (recomandat: geometria lor e a frezei plate).
   b. Permise, cu fundul socotit ca la buzunar.

## Se redeschide dacă

- placa 4 (sau o placă a bilei) arată că secțiunea canelurii sau creasta din buzunar nu ies ca pe hârtie;
- owner-ul cere toroidala la finisarea reliefului înaintea liniei reliefului;
- plafonul pornirii nu mai lasă loc formei în schema ușii.
