# ADR 0026 — Regiunea păstrată și invarianta 2

**Starea:** acceptat pe 09.10.2026, în felia 2.3a. **Intră în:** etapa 2. Intrările și ieșirile (felia 2.5), urechile
(2.4), legăturile și sensul de tăiere (2.3b) o citesc; nimic de aici nu se schimbă fără un ADR nou.

**Problema.** În ediția întâi, intrarea în tăietură a mușcat 2,8–8,2 mm din piesă timp de 105 zile (`LECTII.md`,
D3), fiindcă nu exista noțiunea de „material păstrat”: latura se ghicea din centroidul vârfurilor. Azi, nimic nu
verifică nici că tăietura unei forme nu intră în altă piesă: două piese mai apropiate decât freza, o piesă desenată în
alta fără o gaură între ele, sau o formă pusă de două ori în același loc. `PLAN.md` §2 (termenul 15) și §4.2
(invarianta 2) cer regiunea păstrată ca obiect de prim rang, calculată din geometria de intrare.

**Decizia.** Regiunea păstrată K se calculează din tăieturile foii și din laturile declarate în operații
(`src/cam/regiune.ts`). Exportul refuză, cu motiv, orice program în care o tăietură de profil intră în K. Invarianta 2
intră în poarta oracolului, scrisă de o sesiune independentă, doar din acest ADR.

## Contractul

**1. Inelele.** Pe foaia exportată (foaia 0), fiecare element în lume (`<instanță>/<element>`) care are cel puțin o
operație de profil cu latura `exterior` sau `interior` dă un **inel**: conturul lui închis, în lume (instanța ∘ grupurile
∘ elementul, ADR 0024). Rolul inelului vine din latură:
- `exterior` → **piesă**: materialul dinăuntru se păstrează;
- `interior` → **gol**: dinăuntru e deșeu (o gaură).

Un element care are operații și pe `exterior`, și pe `interior` e refuzat cu motiv (nu se știe ce parte se păstrează).
Un element doar cu operații `pe-linie` nu e inel. Mai multe operații pe aceeași latură (de exemplu degroșare și
finisare) dau un singur inel.

**2. Inelele nu se ating.** Două inele la o distanță mai mică de 1e-6 mm (se ating, se intersectează sau coincid; de
exemplu aceeași formă pusă de două ori în același loc) sunt refuzate cu motiv: nu se știe ce material rămâne între ele.

**3. Includerea.** Inelele formează o pădure după includerea strictă: B e în A dacă un punct al lui B e în A (regula
`evenodd`, ADR 0003, cu arcele exacte). Părintele lui B e cel mai mic inel care îl conține.

**4. Regiunea păstrată K.** Un punct p care nu stă pe niciun inel e în K dacă și numai dacă **cel mai mic inel care îl
conține există și e piesă**. Deci:
- în afara oricărui inel: deșeu (scheletul foii nu e păstrat);
- într-o piesă, în afara golurilor ei: păstrat;
- într-un gol: deșeu; într-o piesă pusă într-un gol (o insulă): păstrat din nou.

Exemple: placa 1 (dreptunghi `exterior` cu cercul `interior` înăuntru) dă K = dreptunghiul fără disc. Un cerc
`interior` pus singur e o gaură în schelet, iar K e gol în jurul lui. O piesă desenată în altă piesă, fără un gol între
ele, are tăietura în K, deci exportul e refuzat.

**5. Partea proprie.** Fiecare inel C își are partea lui păstrată S(C): pentru piesă, interiorul lui C; pentru gol,
exteriorul lui C. S(C) contează doar pentru tăieturile lui C (o gaură pusă singură își protejează marginea, nu și
scheletul pentru alte tăieturi).

**6. Invarianta 2.** Pentru fiecare mișcare de tăiere care aparține unei operații de profil `exterior` sau `interior`
pe inelul C, **discul sculei** (raza R = diametrul / 2) nu intră în K ∪ S(C). Pentru fiecare punct p al mișcării:
p ∉ K ∪ S(C) și distanța de la p la marginea lui K ∪ S(C) e cel puțin R − ε, cu **ε = 0,005 mm**, măsurat pe
**traseul exact** (traseul aplicației, respectiv offsetul ideal al oracolului).
- **Pe textul G-code**, poarta adaugă rotunjirea postului, ca la invariantele 1, 3 și 5: **0,002 mm** (coordonatele la
  3 zecimale, iar centrul arcului e scris din startul rotunjit, cu I / J rotunjite). Pragul pe G-code e deci
  R − ε − 0,002. *Precizare din recenzia feliei (09.10):* fără ea, o așezare la R − ε pe traseul exact putea ieși, după
  rotunjire, cu 0,0005 mm sub prag în G-code, iar cele două sensuri ale acordului de la §9 nu se puteau ține amândouă.
- **Pragul nu coboară sub 1e-6 mm:** la R = ε (freza Ø0,01, cea mai mică primită de offset), R − ε = 0, iar o
  traversare a marginii (distanța 0) trebuie să rămână încălcare.
- **Mișcarea de tăiere** e o mișcare G1 / G2 / G3 care are cel puțin un punct sub fața de sus (Z < 0 în coordonatele
  documentului, cu Z0 sus); o plonjare pe verticală se judecă în punctul ei XY.
- Rapidele (G0), mișcările din aer și operațiile `pe-linie` nu se judecă: `pe-linie` taie chiar linia, intenționat
  (gravura și canalul intră în piesă prin definiție).

**7. Ce mișcare cui aparține.** Postul scrie, înaintea mișcărilor fiecărui element, comentariul
`(<idLume>: <tip>, <latura>, <adâncime> mm)` (de exemplu `(e2/e2: cerc, interior, 8 mm)`); mișcările de după el,
până la următorul, sunt ale lui. O mișcare de tăiere de dinaintea primului comentariu încalcă invarianta 2.

**8. Refuzul în aplicație.** Motivul începe cu `regiunea păstrată:`, ca să poată fi recunoscut de teste, și numește
elementele (de exemplu „regiunea păstrată: tăietura lui e2/e2 intră în e1/e1 (cu 1,2 mm, lângă X 40,0, Y 20,0)”).
Motivele din CAM sunt încă doar în română (golul din 1.9c).

**9. Ce primește oracolul.** Documentul (formele parametrice și matricile, ADR 0024; operațiile, ADR 0025) și textul
G-code, plus montajul (originea, Z0, foaia). Își construiește singur contururile exacte (dreptunghiul cu colțuri
rotunjite și cercul, sub orice similitudine) și regiunea; nu importă nimic din `src/`. Pentru dreptunghi și cerc,
offsetul ideal e analitic (dreptunghiul rotunjit cu raza + R; cercul cu raza ± R), deci oracolul poate spune singur, din
geometrie, dacă un document trebuie refuzat.

**Ce trebuie să țină, în ambele sensuri:** orice program pe care îl scrie aplicația trece invarianta 2 în poartă; orice
document pe care oracolul îl găsește în încălcare (pe offsetul ideal) e refuzat de aplicație cu motivul
`regiunea păstrată:`, iar orice refuz al aplicației cu acest motiv are încălcarea găsită de oracol.

## Limitele

- Doar foaia 0 (singura exportată azi).
- `pe-linie` nu se judecă; o gravură care trebuie să rămână într-o adâncime dată vine cu operațiile ei.
- Distanța dintre o tăietură și inelele din jur se calculează exact (linie–linie, linie–arc, arc–arc); prețul e
  pătratic în numărul de segmente apropiate, cu tăierea pe cutii. Un plafon pe produs vine cu primul document mare.

## Ce am respins

- **K din paritatea tuturor inelelor, fără laturi:** un cerc `interior` pus singur (o gaură într-o placă deja
  debitată) ar deveni o piesă, iar tăietura lui ar fi refuzată degeaba.
- **K doar din latura fiecărui inel, fără includere:** două piese și o gaură între ele n-ar mai ști care material e al
  cui, iar scheletul ar deveni „păstrat” pentru toate tăieturile.
- **Verificarea pe eșantioane în aplicație:** aplicația măsoară exact; doar oracolul eșantionează, cu toleranța lui
  declarată.

**Se redeschide dacă:** vin piese care se ating intenționat (tăietura comună, „common line cutting”), sau operații care
lasă material pe o parte a unui contur deschis (felia 2.3c).
