# ADR 0094: Strategia paralelă a buzunarului (raster), cu trecerea de profil

**Starea:** acceptat pe 27.10.2026. Felia 5.6↑, adusă din etapa 5 în etapa 3, fără mașină („Da, continuă cu strategia paralelă
(raster) a buzunarului, cu trecerea de profil; dacă pachetul nu mai încape, spune-mi întâi.”). **Rândul din prag:** „Buzunar
(curățare de suprafață), cu mai multe freze” (`ACOPERIRE-ARTCAM-DESKPROTO.md`): cu felia asta, criteriul din cercetare e
îndeplinit în întregime, deci rândul devine **făcut**, cu placa etapei 5; adaosul de finisare și adâncimea proprie pe freză din
ArtCAM nu sunt aici (la cerere). **Urmează:** `PLAN.md` (etapa 5: buzunarul), criteriul din cercetare (`CERCETARE-DETALIATA.json`,
grupa B: „Cu strategia paralelă, conturul buzunarului iese pe vector (± 0,02), datorită trecerii de profil”). **Documentul:** v18.

**Problema.** Buzunarul tăia doar în inele paralele cu conturul (ADR 0069). ArtCAM (2D Area Clearance) și DeskProto (Pocketing)
au și strategia paralelă (raster): linii drepte la un unghi, dus-întors, cu o trecere de profil pe margine, ca peretele să nu
rămână în trepte. Pe forme lungi și pe fibra lemnului, liniile sunt adesea mai bune.

## Decizia

**1. Documentul v18.** Câmpul opțional `strategie?: { fel: 'paralel', unghi }` pe operație (unghiul liniilor față de X, în grade,
în [0, 180)); lipsă = inelele (ca în v17). Potrivirea o judecă lucrarea: doar pe un buzunar; cu o coborâre în rampă, zigzag sau
elice, refuzată (liniile coboară prin plonjare). Migrarea v17 → v18 schimbă doar numărul; un document marcat v17 cu un câmp propriu
`strategie` pe o operație e refuzat. Oracolul documentului e mutat pe v18.

**2. Traseul** (`src/cam/paralel.ts`): zona centrului frezei Z = regiunea (cu insulele) decalată cu −R. Liniile: în reperul rotit
cu −unghiul, orizontale la y_min + k·s (s = pasul lateral, s ≤ R), tăiate par-impar cu marginea lui Z aplatizată (coardele arcelor,
cu săgeata cel mult 0,0005 mm, stau spre interior: liniile se opresc cel mult atât înainte, în partea sigură). Pe fiecare trecere:
liniile în zigzag — după un segment, freza trece la adâncime pe segmentul liniei vecine al cărui capăt e cel mai aproape, doar
dacă drumul de legătură rămâne în buzunar (`legaturaInBuzunar`, ADR 0069 §5); altfel se ridică și reia de la primul segment rămas;
apoi **trecerea de profil**: fiecare buclă a lui Z, în sensul operației (la urcare, regiunea în stânga), ca peretele să iasă pe
vector. **Acoperirea:** un punct la cel mult R de marginea lui Z îl atinge trecerea de profil; unul mai departe are tot discul de
rază R în Z, deci și segmentul spre linia de dedesubt (la sub s ≤ R), pe care freza trece. Rezultă aceeași deschidere ca la inele,
deci frezele de rest (ADR 0093) și insulele (ADR 0073) merg neschimbate. Liniile taie dus-întors: alternativ în urcare și în
opoziție; trecerea de profil urmează sensul operației.

**3. Fereastra exportului.** Sub un rând de buzunar, **Traseul**: inele (paralele cu conturul), implicit, sau linii paralele, cu
**Unghiul** (°); cu liniile, coborârea dispare. Un unghi în afara [0, 180) oprește exportul, cu motivul. Exportă scrie strategia
(îmbinată cu cea din document; pe inele, câmpul pleacă). Panoul o arată; manualul (ro + en) o descrie.

## Probele

- **criteriul din cercetare**, pe oracolul simulării: buzunarul 80 × 40 × 10 cu Ø12 (pasul 4,8), la 0° și la 30°: fundul la
  −10 ± 0,02 peste tot în afara colțurilor R6, nimic în afară; peretele la x = 20 ± 0,02 (pe o grilă de 0,002 mm, interpolat la
  −5), datorită trecerii de profil;
- pe hârtie: liniile la y = 26 + 4,8·k (30,8 … 50), apoi bucla zonei centrului [26, 94] × [26, 54], în sens trigonometric; la 30°,
  liniile la 30° față de X, la 4,8 mm pe normală; trecerile: totul la −5, apoi la −10;
- o insulă: fundul plat în jur, insula întreagă (legăturile o ocolesc); cu frezele de rest (Ø12 paralel, apoi Ø3): Ø3 doar în
  colțuri, colțurile R1,5;
- refuzurile (strategia pe alt fel, cu coborârea în rampă, pasul peste rază); ușa v18 și migrarea; ce scrie Exportă; e2e (Edge):
  alegerea în fereastră, motivul, oracolul pe octeții din browser, panoul, fereastra redeschisă;
- mutațiile țintite: în jurnalul feliei (`docs/etape/etapa-03.md`, 5.6↑).

## Limitele

- Liniile coboară prin plonjare dreaptă (cel mult un pas în material): rampa pe linie vine dacă o freză care nu taie în centru o cere.
- Doar dus-întors; liniile într-un singur sens (toate în urcare), adaosul de finisare și adâncimea proprie pe freză (ArtCAM) vin
  la cerere.
- Legătura merge doar spre linia vecină: pe o formă cu multe insule, freza se poate ridica des (drumul e corect, doar mai lung).
- Proba fizică (fundul, peretele pe vector) e a plăcii etapei 5.

## Respinse

- **Fără trecerea de profil** (doar liniile): peretele ar rămâne în trepte, iar criteriul cere conturul pe vector.
- **Intersecțiile exacte cu arcele marginii**: cod în plus în pachetul strâns (329,2 / 330 kB), pentru o diferență de cel mult
  0,0005 mm pe care trecerea de profil o acoperă oricum.
- **Liniile legate pe margine** (urmărind conturul între două linii): mai puține ridicări, dar o a doua cale de tăiere pe perete;
  trecerea de profil face peretele o singură dată.

## Se redeschide dacă

- placa etapei 5 arată fundul sau peretele în afara toleranței;
- owner-ul cere liniile într-un singur sens, rampa pe linie, adaosul de finisare sau adâncimea proprie pe freză.
