# ADR 0076: Coborârea în buzunar

**Starea:** acceptat pe 25.10.2026. Felia 5.3↑, adusă din etapa 5 în etapa 3, fără mașină, la cererea owner-ului („coborarea
in buzunar pe rampa sau elice, si ar trebui sa fie configurabila de user, unghi, lungime, numar de rampe etc.”, „si eventual
sa poata fi si evitata”; „Da, pornește felia rampei / elicei în buzunar, configurabilă, cu varianta fără.”). **Rândul din
prag:** „Buzunar (curățare de suprafață), cu mai multe freze” (`ACOPERIRE-ARTCAM-DESKPROTO.md`): rampa la coborâre; cele
două freze rămân. **Schimbă:** ADR 0069 §5 (intrarea pe o buclă nu mai e doar plonjarea dreaptă). **Documentul:** v12.

**Problema.** Buzunarul (ADR 0069, 0073) intra în material drept în jos, la începutul primului inel al fiecărei treceri și
după fiecare ridicare. Cu o freză plată fără tăiș la centru, sau într-un lemn tare, plonjarea rupe freza ori arde lemnul; în
ArtCAM și în orice CAM de atelier, coborârea într-un buzunar se face pe rampă sau pe elice, cu unghiul ales de om.

## Decizia

**1. Felurile, pe operația de buzunar** (`Operatie.coborare`, lipsă = plonjarea):
- **`plonjare`**: drept în jos, cu avansul de plonjare, de la vârful 0 al buclei (ca până în v11). Nu se scrie în document:
  un buzunar fără schimbări rămâne octet cu octet ce era, cu același program.
- **`rampa`** (`unghi`): de-a lungul buclei, de la vârful ei 0, cu panta `unghi`, cât e nevoie (L = Δz / tan α, și peste o
  tură, pe o buclă scurtă), apoi o tură plină la adâncime, care trece peste tot ce a tăiat rampa mai sus.
- **`zigzag`** (`unghi`, `lungime`): dus-întors pe primii `lungime` mm ai buclei (pe toată, dacă e mai scurtă), în
  N = ⌈Δz / (L · tan α)⌉ rampe egale, cu panta cel mult `unghi`, apoi o tură plină la adâncime, de unde a rămas freza.
- **`elice`** (`unghi`, `raza`): pe un cerc de rază `raza`, cu panta `unghi`, apoi un cerc plin la adâncime, o legătură
  dreaptă, la adâncime, în punctul buclei cel mai apropiat de centru, și bucla de acolo.

Pragurile, într-un singur loc (`COBORARE_MINIME` în `model/document.ts`, folosite de lucrare și de dialog): unghiul în
[0,5°; 45°] (sub 0,5°, drumul de coborâre ajunge de sute de ori bucla; peste 45°, nu mai e o rampă), zigzagul de cel puțin
1 mm (ca rampa profilului, ADR 0029 §2), raza elicei de cel puțin 0,5 mm (mai mică, e o plonjare cu alt nume). Ușa le
refuză doar pe cele din afara schemei (unghiul în (0, 45], lungimea și raza pozitive, sub plafoanele lor); lucrarea refuză
restul, cu motivul.

**2. Unde se coboară.** Fiecare intrare (prima buclă a trecerii, sau după o ridicare) pornește de la Z-ul de siguranță: rapid
deasupra punctului de intrare, coborâre cu avansul de plonjare până la fundul trecerii de dinainte (−dp; la prima trecere,
fața de sus), apoi felul ales, de la −dp la −d. Între −dp și −d e material; deasupra lui −dp, fie aer, fie ce a scos trecerea
de dinainte, deci coborârea rapidă până acolo nu taie nimic. Toate drumurile stau în buzunar: bucla e un inel (la d ≥ R de
margine), cercul elicei stă în bucata lui (§3). Legăturile la adâncime dintre bucle rămân cele din ADR 0069 §5 / 0073 §5.

**3. Centrul elicei** (`centruElice`): în bucata în care se intră (bucla exterioară, în afara buclelor insulelor), un punct la
cel puțin `raza` de toate buclele bucății, după ce i se adună ce are bucata în plus față de raza frezei (d − R): în bucata de
la d, distanța la margine a unui punct e d plus distanța lui la buclele bucății, deci tot cercul elicei stă la cel puțin R
de margine. Candidații: centrul de greutate al vârfurilor buclei exterioare și o grilă de 9 × 9 în cutia ei; câștigă cel cu
cel mai mult loc. Elicea se termină pe raza spre punctul buclei cel mai apropiat de centru, ca legătura să fie cea mai
scurtă; sensul elicei e al buclelor (trigonometric la urcare, cu materialul în dreapta mersului, ADR 0027).

**4. Elicea care nu încape** (niciun candidat cu loc, sau legătura spre buclă iese din buzunar) nu e o greșeală: în bucata
aceea, freza coboară pe rampa pe inel, cu același unghi, iar lucrarea spune asta o dată pe fiecare distanță de contur, în avertismentele
exportului („elicea de rază 3 mm nu încape în bucata de la 3.000 mm de contur: acolo coboară pe inel, cu 3°”). Alternativa,
refuzul, ar fi oprit tot exportul pentru un buzunar îngust lângă unul lat.

**5. Dialogul.** Sub rândul unui buzunar, lângă pasul lateral: **Coborârea** (Plonjare (fără rampă) / Rampă pe inel / Zigzag /
Elice), apoi doar câmpurile felului: unghiul (implicit 3°), lungimea zigzagului (implicit 20 mm) și, lângă ea, câte rampe
face pe o trecere (din unghi, lungime și pasul rândului), raza elicei (implicit jumătate din diametrul frezei). Valorile
tuturor felurilor rămân scrise la o schimbare de fel. Un câmp în afara marginilor oprește exportul, cu motivul. Pe același
fel, coborârea scrisă se îmbină cu cea din document (un câmp necunoscut rămâne, ADR 0016). Panoul de proprietăți o arată
(„Elice, 3°, raza 3.00 mm”). Un profil n-are coborâre (câmpul pleacă, ca pasul lateral).

**6. Avansul** unei bucăți care coboară e cel al rampei profilului (ADR 0029 §3): F = min(avans, avansPlonjare · L₃ / |ΔZ|),
deci viteza pe verticală nu trece de cea a plonjării (poarta, invarianta 10, o verifică pe programul exportat).

**7. Documentul v12** (`VERSIUNE_SCHEMA = 12`): câmpul opțional `coborare` pe operație, cu felul și parametrii lui (obiecte
deschise: un câmp necunoscut trece). Migrarea v11 → v12 schimbă doar numărul; un document marcat v11 care are deja un câmp
`coborare` pe o operație e refuzat („nu e un document v11 valid”), ca la v9 → v10 și v10 → v11.

## Probele

- pe hârtie, dreptunghiul 100 × 60 cu buzunar de 6 mm, Ø6, pasul 3, unghiul atan 0,1 (0,1 mm pe mm): rampa pe inel = 30 mm
  pe trecere, de la 0 la −3 și de la −3 la −6, pe inelul cel mai adânc (41,2 × 1,2 la d = 29,4); zigzagul de 20 mm = 2 rampe
  de 1,5 mm, dus și întors pe aceeași bucată (10 mm = 3, 30 mm = 1); elicea de rază 3 = 30 mm de elice pe trecere pe cercul
  din (90, 70), apoi legătura din (90, 67) în (90, 69,4); nicio coborâre verticală în material;
- elicea care nu încape (100 × 9, Ø6): un avertisment, rampa pe inel de 30 mm; refuzurile (0,3°, zigzagul de 0,5 mm, raza
  0,2 mm), cu motivul; plonjarea scrisă dă exact programul fără câmp;
- ușa v12: felurile și marginile, un v11 cu `coborare` refuzat, un v11 fără el intră doar cu numărul; oracolul documentului
  (încă al aceleiași sesiuni, ADR 0069) mutat pe v12 cu aceleași probe;
- oracolul simulării (independent), pe G-code-ul exportat: cu rampa, zigzagul și elicea, dreptunghiul e scos la 6 mm în
  toată deschiderea, în afară nimic, poarta curată (pasul pe trecere, rapidele, viteza pe verticală); cu o insulă 20 × 20 și
  elicea de rază 4, câte o elice în fiecare ramură, insula rămâne;
- e2e (Edge): felul și câmpurile în fereastră, „3 rampe pe trecere” (⌈3 / (20 · tan 3°)⌉), unghiul de 60° oprește exportul,
  elicea iese în program (G3 cu Z), oracolul simulării și poarta pe octeții din browser, coborârea rămâne în proiect și apare
  în panou;
- centrul elicei, direct: în coroana dintre 100 × 100 și insula 60 × 60, la cel puțin raza de ambele bucle; cu insula de
  80 × 80, în coroană, nu în insulă (unde ar fi mai mult loc); null unde nu încape; d − R adunat (o buclă 2 × 2 la d = 10:
  8 încape, 8,01 nu); tura plină se închide în capătul coborârii (rampa, zigzagul impar, elicea), iar bucla de după elice
  pornește și se închide în punctul legăturii;
- mutațiile țintite (praguri, rampele în jos, coborârea dreaptă cu avansul de tăiere sau sub −dp, rampa de la fața de sus,
  fără tura plină, zigzagul impar din vârful 0, doar dus, mai lung decât bucla, elicea inversă, arcele în sensul greșit,
  locul fără d − R sau doar față de exterior, centrul în afara bucății, elicea fără loc, fără legătură, bucla de la vârful 0,
  zigzagul ca rampă, fiecare trecere de sus, avertismentele, coborârea nepasată, ușa, îmbinarea în dialog): 29 / 30 prinse
  direct; garda legăturii elicei e a doua plasă (cu centrul ales cu loc, segmentul spre cel mai apropiat punct al buclelor nu
  trece nicio buclă, deci legătura e mereu liberă), prinsă în pereche cu „elicea fără loc”. O mutație era echivalentă (un
  2π în unghiul de pornire al elicei) și s-a scos din cod. Dialogul e probat de e2e.

## Limitele

- Rampa și zigzagul pornesc de la vârful 0 al buclei (sau de la punctul în care se intră după o ridicare), nu din locul cel mai
  potrivit al ei; pe o buclă foarte scurtă, rampa face mai multe ture.
- Numărul de rampe din fereastră e socotit pe lungimea scrisă; pe o buclă mai scurtă decât ea, lucrarea face mai multe.
- Centrul elicei e ales dintr-o grilă (9 × 9): într-o bucată foarte îngustă și strâmbă, un loc care ar încăpea poate scăpa,
  iar freza coboară atunci pe inel (cu avertisment, nu greșit).
- Profilul are rampa lui (ADR 0029); coborârea e doar a buzunarului.

## Respinse

- **Numărul de rampe ca parametru al omului**, în locul lungimii: cu unghiul fix, numărul și lungimea se determină una pe
  alta, iar lungimea e cea care trebuie să încapă în buzunar; fereastra arată numărul.
- **Centrul elicei ales de om**: încă un clic pe planșă pentru fiecare bucată; centrul automat, cu căderea pe inel, acoperă
  cazul obișnuit.
- **Refuzul elicei care nu încape**: ar opri exportul pentru o bucată îngustă (§4).

## Se redeschide dacă

- prima placă tăiată cu coborâre arată urme pe pereți sau pe fund la intrare;
- owner-ul cere ca rampa să pornească dintr-un loc ales sau ca centrul elicei să se poată muta.
