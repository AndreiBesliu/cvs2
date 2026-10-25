# ADR 0069: Buzunarul

**Starea:** acceptat pe 25.10.2026. Felia 5.1↑, adusă din etapa 5 în etapa 3, fără mașină (plăcile netăiate, `PLAN.md` §4.6
p. 7), lucrată cât owner-ul face testul uneltelor de desen („in timp ce eu voi face testul, vreau sa poti lucra la ce
urmeaza”), publicată pe un canal de previzualizare, nu pe adresa de test. **Rândul din prag:** „Buzunar (curățare de
suprafață), cu mai multe freze” (`ACOPERIRE-ARTCAM-DESKPROTO.md`): aici, cu o singură freză; restul rămâne în rând.
**Schimbă:** ADR 0025 (operația are un fel), ADR 0026 (buzunarul nu e inel). **Documentul:** v11.

**Problema.** Până acum, o formă se putea doar decupa (profilul): pe exterior, pe interior, pe linie, pe o parte. Golirea unei
suprafețe până la o adâncime (un locaș, o adâncitură, fundul unei cutii) cerea profile trase de mână, cu material rămas între
ele.

## Decizia

**1. Operația are un fel** (documentul v11): `tip: 'profil'` (ce era) sau `tip: 'buzunar'`, cu `pasLateral` (mm), distanța
dintre inele, în (0, D / 2]. Pe un buzunar, latura e `interior` (freza stă înăuntru), iar urechile, rampa, intrările,
degajările sunt `null` și despărțirea lipsește. **Ușa** judecă doar felul și pasul (un număr în (0, 50], jumătatea
plafonului diametrului); **potrivirea** (pasul prezent și cel mult raza frezei, latura interior, nimic din profil) o
refuză lucrarea, cu motiv, ca latura unei căi deschise (ADR 0037 §2): proiectul se deschide, iar dialogul îl îndreaptă.
Pe un profil, pasul lateral nu schimbă nimic. Implicitul dialogului: 40 % din diametru, la 0,1 mm (Ø6 → 2,4).

**2. Migrarea v10 → v11 schimbă doar numărul.** Un document v10 e un v11 valid, cu același program. Un document marcat v10 cu
un buzunar sau cu un câmp propriu `pasLateral` pe o operație e refuzat („nu e un document v10 valid”). O versiune v10 refuză un
v11 („scris de o versiune mai nouă”): altfel ar tăia buzunarul ca profil interior, adică l-ar decupa prin foaie.

**3. Inelele.** Inelul k e bucla centrului frezei la d_k = R + k · s de contur (offsetul interior exact, `offsetInchis`, linii
și arce), până când freza nu mai încape. Inelele formează un arbore: fiecare inel stă în cel de la d_k − s care îl cuprinde
(offsetul interior al unei regiuni fără găuri n-are găuri), iar un gât mai îngust decât freza îl desparte în ramuri.
**Acoperirea:** fie x un punct cu R + k·s ≤ δ(x) < R + (k + 1)·s, unde δ e distanța la contur. Pe drumul cel mai scurt de la x
la contur, δ scade exact cu distanța, deci trece prin δ = d_k la mai puțin de s de x: inelul k e la mai puțin de s ≤ R de x,
iar discul frezei acoperă x. Ultimul inel e la mai puțin de s de cel mai adânc punct. Deci se scoate toată **deschiderea**
conturului (tot ce poate atinge un disc de rază R din interior); rămân doar colțurile convexe, cu raza frezei, și locurile mai
înguste decât freza. Cu s ≤ R, fără nicio presupunere despre formă.

**Pragul de topologie** (măsurat pe 25.10: dreptunghiul 40 × 30 cu Ø6 și s = 2,4 are inelul 6 exact la 15 mm, unde regiunea
e o linie, iar offsetul îl refuză): un inel al cărui offset cade, altfel decât „freza nu încape”, se ia puțin mai aproape de
contur (0,001; 0,01; 0,05 mm, cât rămâne sub s / 2); golul până la inelul dinainte scade, deci acoperirea rămâne, iar inelele
următoare pornesc de acolo. Peretele (k = 0) nu se mută: acolo freza ar intra în perete; acolo refuzul rămâne, ca la profil.

**4. Ordinea și sensul.** Pe fiecare trecere (`adancimiTreceri`, nicio trecere mai adâncă decât pasul), inelele dinăuntru în
afară: fiecare inel după toate inelele dinăuntrul lui (postordine), deci peretele la urmă, cu materialul de lângă el deja
scos. Inelele vin trigonometric, cu materialul de scos (și peretele) în dreapta mersului: urcarea (ADR 0027) le ia așa,
opoziția le întoarce. În lucrare, buzunarul e în clasa interioarelor (ADR 0037 §8): se taie cât piesa e încă prinsă.
**Buzunarul nu e inel al regiunii păstrate** (ADR 0026): scoate material doar până la adâncimea lui, deci nu desparte nimic
de foaie; regiunea păstrată nu se schimbă, iar invarianta 2 a celorlalte tăieturi rămâne cum era.

**5. Legăturile.** Primul inel al trecerii pornește din vârful lui 0, cu coborârea cu avansul de plonjare (ca profilul);
fiecare inel următor pornește din punctul lui cel mai apropiat de freză. Drumul drept până acolo rămâne la adâncime dacă discul
nu iese din buzunar (segmentul stă la cel puțin R − 0,005 mm de contur, `EPS_LEGATURA`, ca la regiunea păstrată); altfel freza
se ridică la Z-ul de siguranță și coboară din nou. O legătură la adâncime taie cel mult un pas de material, ca o trecere.
Traseul stă în buzunar prin construcție: inelele sunt offseturi verificate (fiecare punct la d ≥ R de contur), legăturile
sunt judecate.

**6. Ce refuză lucrarea, cu motiv:** buzunarul nepotrivit (§1; fără pas: „n-are pasul lateral”); pe o cale deschisă;
într-o operație cu mai multe contururi în aceeași instanță, două contururi care se ating sau se intersectează („unește-le
întâi”) și un contur în altul (insula vine mai târziu: acum l-ar scoate cu tot cu insulă); conturul prea îngust pentru
freză; pasul lateral peste raza frezei; peste 20 000 de inele. Contururile disjuncte ale aceleiași operații sunt buzunare
separate.

**7. Interfața.** În fereastra exportului, „buzunar” e încă o alegere a tăieturii rândului (coloana se cheamă acum
„Tăietura”), doar pe un rând cu contururi închise; pasul lateral apare sub rând, judecat față de raza frezei din dialog;
urechile, rampa, intrările și degajările sunt oprite, cu motivul în titlu. Panoul de proprietăți arată felul și pasul. Nicio
acțiune nouă: `document.aplica-operatii` scrie și buzunarul (felul operației e acum o valoare pe care dialogul o poate
schimba; înainte, un `tip` diferit era refuzat ca altă structură). Modelul e în bucata exportului; în pornire intră doar
felul pe tăietură (`lume.ts`). Ușa a trebuit despărțită ca să încapă: ADR 0070.

## Probele

- pe hârtie: dreptunghiul 100 × 60 cu Ø6 și s = 2,4 dă 12 inele (3 … 29,4), ultimul 41,2 × 1,2; cercul R20 cu s = 3 dă
  cercurile 2, 5, …, 17; pragul de topologie (40 × 30) dă inelul la 14,999 mm, gros de 0,002 mm;
- oracolul simulării (independent, `test/oracles/simulare.ts`), pe G-code-ul exportat: dreptunghiul, L-ul cu s = R în
  opoziție și cercul sunt scoși la adâncime în toată deschiderea și neatinși în afara conturului, pe o grilă de 0,25 mm;
  poarta (fără regiune) e curată: pasul pe trecere, rapidele, cutia centrului de pe hârtie;
- e2e: dialogul, pasul invalid, programul descărcat simulat, operația păstrată la redeschidere;
- mutațiile țintite (inelele, legăturile, sensul, ordinea, pragul de topologie, regiunea, insula, migrarea, potrivirea, ușa
  curentă): 14 / 14 prinse.

## Limitele

- **Oracolul documentului v11 e scris de aceeași sesiune** care a scris aplicația (agenții erau opriți), din textul de aici;
  de reluat de o sesiune independentă, ca la v10. **Poarta nu judecă încă buzunarul față de regiunea păstrată** (invariantele
  2 și 9 cu `regiune`): pe un document cu buzunare, regiunea oracolului îl lasă afară, iar traseul lui îl judecă oracolul
  simulării.
- Nicio rampă la coborâre (plonjarea e cea a profilului), nicio insulă, o singură freză (degroșare + finisare cu două freze
  vine cu schimbarea sculei), niciun avertisment pentru materialul rămas în locurile mai înguste decât freza (se vede în 3D).
- Inelele paralele cu conturul, nu zig-zag: un buzunar lung și îngust are mai multe treceri scurte decât ar avea un zig-zag.

## Respinse

- **Zig-zag (raster)**: lasă un perete în trepte, care cere oricum o trecere pe contur; inelele dau peretele din prima.
- **Pasul lateral în procente**: o valoare care se schimbă singură când se schimbă freza; mm e ce măsoară omul.
- **Inelele din offsetul inelului dinainte** (−s de fiecare dată): erorile se adună; fiecare inel e offsetul conturului.
- **Buzunarul ca latură nouă** (`latura: 'buzunar'`): latura spune unde stă freza față de linie, nu ce scoate; iar o
  aplicație v10 ar fi citit-o greșit.

## Se redeschide dacă

- se cer insulele (un buzunar care ocolește conturul dinăuntru), rampa la coborâre sau două freze;
- pe o placă, plonjarea în buzunar se dovedește prea dură pentru lemnul de lucru.
