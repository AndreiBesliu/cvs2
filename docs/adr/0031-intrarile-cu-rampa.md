# ADR 0031 — Intrările cu rampă (rampa pe intrare)

**Starea:** acceptat pe 10.10.2026, în felia 2.5c. Precizează ADR 0029 (§2, §5) și ADR 0030 (§5, §6, §7) pentru
operațiile care au și rampă, și intrări. **Documentul rămâne v7.** **Intră în:** etapa 2. Nimic de aici nu se schimbă fără
un ADR nou.

**Problema.** Până acum exportul refuza o operație cu rampă și cu intrări (ADR 0030 §6). Fișa etapei cerea compunerea „cu
bucla tăiată continuu”, ca la ADR 0029. Asta nu se poate fără a încălca invarianta 1 (nicio trecere nu scoate mai mult
decât pasul):
- Intrarea și ieșirea taie în deșeu, în material proaspăt. Ieșirea trebuie deci coborâtă cu câte un pas la fiecare
  trecere, iar freza trebuie să treacă prin deșeu la fiecare trecere.
- O ieșire doar la sfârșit, la adâncimea plină, ar scoate dintr-odată toată adâncimea, în deșeu (18 mm, cu pasul 3).
- O ieșire care urcă nu ajută. Discul intră în material proaspăt imediat după p₀, când freza e încă aproape de fund.
- Ca freza să revină pe buclă fără ridicare și tot tangent, singurul drum e cercul întreg al intrării, la fiecare trecere.
  Asta cere loc pentru tot cercul (2ρ în deșeu, nu ρ), deci mai multe intrări omise. Costă și 2πρ de tăiere în plus pe
  trecere, plus o tură aproape întreagă la sfârșit, ca ieșirea să plece din p₀.

**Decizia.** Pe o buclă cu intrare, rampa coboară pe sfertul intrării, la fiecare trecere: **rampa pe intrare**. Între
treceri, freza se ridică.
- ADR 0029 respingea ridicarea pentru urma lăsată pe perete de fiecare replonjare. Aici freza coboară în A, în deșeu, prin
  aer, până la fața de sus. Pe perete nu rămâne nicio urmă.
- Așa făcea și ediția întâi (`emitLeadInOutLoop`: rampa pe arcul intrării, de la fața de sus). Programele CAM de atelier
  au aceeași opțiune: când intrarea e pornită, rampa se mută pe intrare, iar distanța rampei nu se mai folosește.
- Buclele pe care intrarea se omite se taie cu rampa din ADR 0029, neschimbată.

## Contractul

**1. Domeniul.** Operațiile cu `rampa` ≠ `null` și `intrari` ≠ `null`.
- Refuzul pe linie rămâne (ADR 0030 §6: pe linie nu există parte de deșeu).
- Refuzul „intrările nu se compun încă cu rampa” dispare.
- Documentul nu se schimbă (v7).
- Programul unei operații care are doar una dintre ele, sau niciuna, e **același, octet cu octet**.

**2. Alegerea** se face ca la ADR 0030 §3: candidații, condițiile a, b, c și ordinea. O singură diferență: sub rampă se
încearcă doar razele al căror sfert de cerc are cel puțin `RAMPA_MINIMA` = 1 mm, adică πρ/2 ≥ 1 (ρ ≥ 2/π ≈ 0,637 mm).
- Sub acest prag, rampa pe intrare ar fi o plonjare cu alt nume (ADR 0029, precizarea din 10.10).
- Dacă raza cerută e sub prag, exportul refuză operația, cu motiv. Dacă doar jumătatea ei e sub prag, se încearcă numai
  raza cerută.
- Avertismentul intrării omise pomenește doar razele încercate.

**3. Programul**, buclă cu buclă: fiecare buclă, cu toate trecerile ei, înaintea buclei următoare (ADR 0029 §2).
- **O buclă cu intrare**, la fiecare trecere k (cu d₀ = 0):
  1. rapid la Z-ul de siguranță, apoi rapid deasupra lui A;
  2. `G1` până la fața de sus (Z = 0), cu avansul de plonjare, prin aer;
  3. intrarea, ca elice: de la (A, 0) la (p₀, −d_k), cu Z liniar în lungimea arcului. Avansul e plafonat ca la ADR 0029
     §3: F = min(avans, avansPlonjare·L₃ / |ΔZ|), cu L₃ lungimea elicei;
  4. bucla, de la p₀ înapoi la p₀, la profilul trecerii (urechile, dacă le are; pozițiile s se numără de la p₀, ADR 0030
     §4);
  5. ieșirea, la −d_k (ADR 0030 §2);
  6. rapid la Z-ul de siguranță.
- **O buclă fără intrare** (nu încape niciun candidat): programul din ADR 0029 §2, de la vârful 0 al buclei, plus
  avertismentul din ADR 0030 §3. Refuzul „rampa nu încape pe buclă” (Lr < 1 mm) privește doar aceste bucle.
- **`rampa.lungime`** nu se folosește pe buclele cu intrare: acolo rampa e sfertul intrării, de lungime πρ/2. Lungimea
  rămâne în document și se aplică buclelor fără intrare. Refuzul operației cu lungimea sub 1 mm rămâne (ADR 0029).

**4. Invarianta 1, pe hârtie.**
- **Intrarea.** La trecerea k, intrarea e același arc ca la k−1. Z-ul ei merge de la 0 la −d_k, nu de la 0 la −d_{k−1}.
  Un punct de sub disc, atins la fracțiunea t a arcului, a fost atins și la trecerea k−1, la aceeași fracțiune. Deci
  fundul lui e cel mult −d_{k−1}·t, iar trecerea k scoate cel mult (d_k − d_{k−1})·t, adică cel mult pasul.
- **Ieșirea.** Merge la −d_k peste ieșirea de la −d_{k−1}, deci scoate pasul.
- **Pantele.** Panta în material e (d_k − d_{k−1}) / (πρ/2): la pasul 3 și ρ = 3, ~32°. Drumul frezei e mai abrupt (d_k pe
  πρ/2), dar coboară deasupra fundului lăsat de trecerea de dinainte.

**5. Invariantele:**
- **1 și 2** rămân neschimbate. Invarianta 2 judecă deja semicercul.
- **9, amendată** (pe lângă ADR 0030 §7). Porțiunea deschisă de la începutul unei treceri poate coborî, fiindcă intrarea
  e o elice. Ea rămâne tangentă în p₀, de cel mult 90°, cu o rază dintre cele încercate (§2), pe partea deșeului, în
  proiecția XY.
- **10** rămâne ca la ADR 0030: pozițiile s se numără de la p₀. Pe o buclă cu intrare, fiecare trecere e o tură întreagă,
  la profilul ei. Deci trece și judecata pe fundul tăieturii (ADR 0029 §5).
- **11, amendată.** Pe o operație cu rampă:
  - o buclă cu intrare are, la fiecare trecere, forma de la §3:
    - singura mișcare verticală care coboară e cea până la Z = 0, în A;
    - intrarea coboară liniar, de la 0 la −d_k;
    - bucla e la profilul trecerii;
    - ieșirea e la −d_k;
    - urmează ridicarea;
  - o buclă fără intrare are forma din ADR 0029 §2.
- **12, amendată.** Pe o operație cu rampă și intrări, intrarea coboară de la 0, în A, la −d_k, în p₀. Razele permise
  sunt cele de la §2. Restul e ca la ADR 0030 §7.

**6. Ce verifică oracolul** (sesiune independentă, din acest ADR):
- invariantele 9, 11 și 12 amendate;
- un oracol pe hârtie, citit din G-code. Pe fiecare buclă și la fiecare trecere, el măsoară:
  - A, p₀ și raza;
  - Z-ul la capetele intrării;
  - fundul lăsat, pe un câmp de înălțimi: nicio mișcare nu scoate mai mult decât pasul.

**Cazurile pe hârtie:**
- un dreptunghi pe exterior, cu 3 treceri, rampa de 10 mm și intrările de 3 mm: elicea merge de la (A, 0) la (p₀, −d_k);
- o gaură circulară mică, unde raza se înjumătățește (3 → 1,5);
- o gaură și mai mică, unde intrarea se omite: rampa din ADR 0029, de la vârful 0, plus avertismentul;
- cu urechi, cu pozițiile numărate de la p₀;
- raza 0,6 cu rampă: refuzată (sfertul are 0,94 mm);
- raza 1 cu rampă: se încearcă doar 1, fiindcă 0,5 are sfertul de 0,785 mm.

**Martorii negativi**, care trebuie să înroșească oracolul:
- intrarea plată la −d_k, cu plonjarea în A (forma din ADR 0030 §5, sub rampă);
- intrarea care pornește de la −d_{k−1} în A: o coborâre pe verticală în material;
- intrarea care coboară doar până la −d_{k−1} (o treaptă în p₀);
- rampa continuă din ADR 0029 pe o buclă care are intrare (intrarea ignorată);
- raza 0,5 încercată sub rampă.

**7. Interfața.** Coloanele rămân aceleași. Pe un rând cu rampă și intrări, lângă lungimea rampei apare o notă: „cu
intrări, rampa coboară pe sfertul intrării; lungimea se folosește doar unde intrarea se omite”.

## Limitele

- **Ridicarea între treceri,** pe buclele cu intrare: timp în aer. Freza urcă la Z-ul de siguranță și coboară prin aer
  până la fața de sus, cu avansul de plonjare.
- **Panta rampei pe intrare** se dă prin rază, nu prin lungime. O rampă întinsă și pe buclă ar cere ieșirea în alt punct
  decât intrarea, deci alt contract de alegere.
- **Ieșirea care urcă în Z** (promisă la ADR 0030, „Limitele”) e respinsă.
  - O ieșire care urcă de la fund încalcă invarianta 1: discul intră în material proaspăt imediat după p₀.
  - Una care urcă doar până la −d_{k−1} tot atinge stratul de jos al unui miez liber.
  - Miezurile mici se țin cu urechi sau cu vacuum (ADR 0030).

## Ce am respins

- **Bucla tăiată continuu, cu cercul întreg al intrării la fiecare trecere:** cere loc dublu în deșeu și adaugă 2πρ pe
  trecere, plus tura finală aproape întreagă.
- **Ieșirea doar la sfârșit:** scoate dintr-odată toată adâncimea în deșeu (invarianta 1).
- **Intrarea plată, cu plonjarea în A** (ADR 0030 §5): e o plonjare în material, exact ce rampa scoate.
- **Rampa care pornește din A de la −d_{k−1}:** A nu e curățat la acea adâncime (intrarea de dinainte pornea tot de la fața
  de sus), deci ar fi o plonjare de d_{k−1}.

**Se redeschide dacă:** atelierele cer o pantă mai mică decât cea dată de rază, sau placa 2 arată o urmă în A.
