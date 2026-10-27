# ADR 0093: Frezele de rest (buzunarul cu mai multe freze)

**Starea:** acceptat pe 27.10.2026. Felia 5.5↑, adusă din etapa 5 în etapa 3, fără mașină („Continua cu ce vrei”, după
gravarea inteligentă, ADR 0092). **Rândurile din prag:** „Buzunar (curățare de suprafață), cu mai multe freze”
(`ACOPERIRE-ARTCAM-DESKPROTO.md`): cu felia asta, buzunarul are frezele de rest, iar rândul rămâne **în lucru** pentru strategia
paralelă (raster) cu trecerea de profil și adaosul de finisare; „Gravare pe linie; gravare inteligentă”: lista de freze de golire
(ce lăsase ADR 0092) e gata, deci rândul devine **făcut**, cu placa etapei 8. **Urmează:** `PLAN.md` (etapa 5: „Buzunar cu mai
multe freze”) și criteriul de acceptare din cercetare (`CERCETARE-DETALIATA.json`, grupa B). **Documentul:** v17.

**Problema.** Un buzunar golit cu o singură freză lasă colțurile rotunjite cu raza ei și fâșiile mai înguste decât ea netăiate
(ADR 0069). La ArtCAM (2D Area Clearance cu mai multe freze), frezele mai mici vin după cea mare, de la mare la mică, „doar unde
cea mare n-a ajuns”. Același lucru îl cere fundul plat al gravării inteligente (ADR 0092, „Limitele”).

## Decizia

**1. Documentul v17.** Câmpul opțional `rest?: [{ scula, pasLateral }]` (1–8 freze, fiecare cu scula ca a operației și pasul
lateral în (0, 50]): pe operație (doar a unui buzunar) și pe fundul plat al unui V-carve (`fundPlat.rest`). Lipsă = o singură
freză (ca în v16). Potrivirea o judecă lucrarea: frezele de rest sunt plate, fiecare mai mică decât cea dinainte (prima, decât
freza operației, respectiv a fundului), cu pasul lateral cel mult raza ei; pe alt fel decât buzunarul (sau fundul plat), refuzate;
conflictul de freze (același T, alt diametru, ADR 0084) le cuprinde. Migrarea v16 → v17 schimbă doar numărul; un document marcat
v16 cu un câmp propriu `rest` pe o operație sau pe fundul ei plat e refuzat. Oracolul documentului e mutat pe v17.

**2. Nucleul** (`src/cam/rest.ts`): după o freză de rază R_a, freza de rest de rază R (pasul s ≤ R) merge pe inelele ei de
buzunar (`ineleBuzunar`), dar doar pe bucățile ale căror puncte q stau la peste R_a − R + ε (ε = 10⁻⁴ mm) de zona centrului
frezei mari Z_a (regiunea decalată cu −R_a): un q mai aproape are tot discul frezei mici în ce a scos cea mare. Inelele la cel
puțin R_a de margine stau în Z_a și se sar. **Acoperirea:** un punct p al regiunii neatins de freza mare (dist(p, Z_a) > R_a) are
pe un inel un punct q la |p − q| < s ≤ R (spre cel mai apropiat punct al marginii, distanța la margine scade cu 1 la 1 mm), iar
dist(q, Z_a) > R_a − R, deci q e pe o bucată păstrată și discul frezei mici îl acoperă pe p. Rămân colțurile cu raza ei și ce poate
scăpa eșantionarea inelului la h = 0,02 mm (distanța la Z_a e 1-Lipschitz: o fâșie de cel mult h/2 = 0,01 mm grosime și sub h
lungime). **Mai multe freze:** fiecare față de cea dinainte (deschiderea cu un disc mai mic o cuprinde pe cea cu unul mai mare).
Pe un perete drept, inelul de lângă perete al frezei mici e exact la R_a − R de Z_a: nu se taie (ε ține zgomotul numeric afară),
deci freza mică nu mai trece pe lângă pereții pe care cea mare i-a tăiat. Bucățile, în ordinea capătului cel mai apropiat, cu
ridicare între ele și plonjare dreaptă la fiecare nivel (`taieBucati`); pe fiecare nivel al trecerilor, toate bucățile, deci
fiecare trecere coboară cel mult un pas în material. Aici stau și uneltele pe care le folosea doar V-carve-ul (punctele unei
bucle, bucățile ei neatinse, offsetul reluat pe un prag de topologie), ca să nu facă un ciclu de importuri.

**3. Buzunarul și fundul plat.** Buzunarul (`src/cam/job.ts`): după freza operației (cu insulele ei, ADR 0073), fiecare freză de
rest în aceeași regiune, pe aceleași treceri, cu schimbarea de sculă înainte; una fără nicio bucată nu se montează (avertisment).
Fundul plat al V-carve-ului (`src/cam/vcarve.ts`): pe fiecare nivel, după freza dreaptă, frezele de rest în regiunea nivelului;
programul: freza dreaptă (toate nivelurile), fiecare freză de rest, apoi freza în V, cu axa și inelele colțurilor față de cea mai
mică freză dreaptă (până la ea, frezele drepte au scos deschiderea fundului cu discul ei).

**4. Fereastra exportului.** Sub un rând de buzunar și sub freza fundului plat: **Frezele de rest**, câte un rând (T, Ø, pasul
lateral, ×), și **Adaugă o freză de rest** (T-ul următor liber, jumătate din diametrul celei dinainte, pasul 40 %), cel mult 8.
O listă greșită (diametrul nu scade, pasul peste raza, T-ul în afara marginilor) oprește exportul, cu motivul. Exportă scrie lista
(îmbinată pe poziție cu cea din document; goală, câmpul pleacă). Panoul o arată; manualul (ro + en) o descrie.

## Probele

- **criteriul din cercetare**, pe oracolul simulării (programul tăiat la `T… M6`, fiecare bucată cu freza ei): buzunarul
  80 × 40 × 10 cu Ø12 (pasul 4,8), apoi Ø3 (1,2): fundul la −10 ± 0,02 peste tot în afara colțurilor; colțurile cu raza 1,485
  (cu Ø3; doar Ø12: 5,992); Ø3 scoate 2 912 celule, toate în afara deschiderii cu Ø12 (pe hârtie); traseul lui Ø3 stă la peste
  R_a − R de zona lui Ø12 (nu trece pe lângă pereți); inelele Ø12 la 6, 10,8, 15,6 mm; trecerile lui Ø3: −5, apoi −10;
- o fâșie mai îngustă decât Ø12 (canalul de 8 mm), golită de Ø3; o insulă cu fâșii de 6 mm de o parte și de alta; trei freze
  (Ø12, Ø6, Ø3), fiecare doar unde cea dinainte n-a ajuns; un cerc golit întreg de Ø12 (Ø3 nu se montează, avertisment);
- fundul plat cu Ø6, Ø2 și freza de gravare (ADR 0092): nimic mai adânc decât −min(D, d·cot), frezele drepte la 0,00765 mm
  deasupra pereților, Ø2 doar în afara deschiderii fundului cu Ø6 (pe hârtie, pe fiecare nivel), în colț materialul lăsat față de
  anvelopa frezei de gravare 0,0004 mm;
- refuzurile (freza de rest cât cea dinainte, în V, pasul peste raza ei, pe alt fel, același T); ușa v17 și migrarea; ce scrie
  Exportă; e2e (Edge): lista din fereastră, motivul, oracolul pe octeții din browser, panoul, fereastra redeschisă;
- mutațiile țintite: în jurnalul feliei (`docs/etape/etapa-03.md`, 5.5↑).

## Limitele

- **Strategia paralelă (raster)**, cu unghiul ei și trecerea de profil de la urmă, și **adaosul de finisare** (lăsat de frezele
  mari pentru cea mică) nu sunt aici: rândul buzunarului rămâne în lucru pentru ele.
- Frezele de rest coboară prin plonjare dreaptă (cel mult un pas în material), oricare ar fi coborârea buzunarului (ADR 0076);
  rampa sau elicea pentru ele vin dacă o freză care nu taie în centru o cere.
- Adâncimea finală proprie pe freză (ArtCAM) nu e aici: toate merg până la adâncimea operației.
- Proba fizică (fundul și colțurile pe lemn) e a plăcii etapei 5.

## Respinse

- **Freza mică pe tot buzunarul** (cum ar face o a doua operație): trece prin aer peste tot ce a scos cea mare; criteriul cere
  „doar unde cea mare n-a ajuns”.
- **Zona rămasă calculată din simulare** (ca la rest machining 3D): bună pentru reliefuri; în 2D, deschiderea cu discul frezei
  mari e exactă și se calculează din geometrie, fără grilă.
- **Pragul R_a − R − h** (o margine pentru eșantionare): păstra tot inelul de lângă perete al frezei mici (exact la prag), deci
  ea făcea tot conturul prin aer; pragul R_a − R + ε, cu eșantionarea mai deasă, nu.

## Se redeschide dacă

- placa etapei 5 arată fundul sau colțurile în afara toleranței;
- owner-ul cere strategia paralelă, adaosul de finisare, adâncimea proprie pe freză sau coborârea în rampă a frezelor de rest.
