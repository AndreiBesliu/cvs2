# Relieful (18.1↑, ADR 0310–0329)

_cncvs2, relieful 2.5D / 3D, felia 18.1↑ adusă din etapa 18 („Relieful 1: nucleul, relieful din imagine, prelucrarea 3D
din relief”): ramura `wip/18.1-relief` (din `main`, 24.11), ADR-urile 0310–0329, canalul `relief`; PORNITĂ pe 24.11, la
cuvântul owner-ului; ADR 0310 ACCEPTAT pe 24.11 (1a–6a); felia 18.1↑a GATA și UNITĂ pe 24.11 (documentul v28); felia 18.1↑b
GATA pe 25.11, de unit_

Pornită pe 24.11.2026, la „ce urmeaza in roadmap si nu a fost atins deloc si putem incepe” și „ok, scrie brief-ul pentru
relief si pentru cote” ale owner-ului (în sesiunea principală). E primul lucru din blocul relief + 3D (etapele 18–24),
care ține 31 din cele 40 de rânduri v1 ale pragului încă nepornite.

## Ce închide etapa 18 (din `PLAN.md` §5.3)

Relief din imagine (gri → înălțime); alinierea pixelilor imaginii cu grila de calcul; litofania; combinarea reliefurilor
(adună, scade, păstrează înalt / jos, înlocuiește; Multiply între straturi); rezoluția de cel puțin 4000 × 4000;
straturile de relief (combinare, vizibilitate, ordine); relief ↔ imagine gri pe 16 biți. Degroșarea și finisarea 3D
pornesc aici, pe relief. Placa etapei: pana de gri, calota, litofania (o taie owner-ul, la capăt).

Rândurile sunt în `ACOPERIRE-ARTCAM-DESKPROTO.md`, secțiunea C (și D pentru degroșare și finisare). ArtCAM și DeskProto
sunt referință funcțională: fără cod, interfață, texte sau clipart copiate.

## Ce e deja hotărât (nu se redeschide fără ADR nou)

- **Reprezentarea** (`PLAN.md` §3, „Relieful”): straturi Float32 pe dale de 256 × 256, rare (o dală lipsă e o
  constantă); operațiile în bazinul de workere, pe benzi transferate; salvarea și undo-ul, Uint16 cu scară pe dală;
  relieful făcut din vectori rămâne o rețetă derivată. Modulul e `src/relief/`.
- **ADR 0010** (simularea pe CPU, câmpul pe dale), **ADR 0011** (fără calcul pe GPU în v1: placa video doar desenează),
  **ADR 0012** (CAM 3D doar pe câmpul conservativ, maximul modelului pe celulă, cu distanța la segment; drop-cutter-ul
  exact e oracolul), **ADR 0015** (workerele nu țin date între joburi).
- **Corectitudinea se demonstrează:** oracol independent (CL analitic pe plan, sferă, cilindru; creasta; volumul;
  `PLAN.md` §4, rândul „relieful și 3D-ul”), valori pe hârtie, otrăvuri. Invarianta 4 din `PLAN.md` intră odată cu
  primul relief tăiat.
- **Direcțiile de import:** `cam` importă `relief`; `relief` importă `geom` și tipurile din `model` (`PLAN.md` §3).

## De citit întâi

- `docs/faza2/sonde/s5-relief/RAPORT.md`: măsurătorile (reprezentarea, eroarea Uint16, câmpul conservativ față de
  eșantionarea în nod, timpii pe workere, bas-relieful) și codul sondei, în `cod/`.
- `docs/PORTARE.md`: candidații pentru etapele 18–20 (dilatarea gri, lema coardei, maximul glisant, transformata
  Danielsson) se judecă acum, înaintea etapei lor; verdictul se scrie acolo.
- Ce există și se refolosește: nucleul simulării (`src/sim/`: `camp.ts`, `nucleu.ts`, `banda.ts`; ADR 0047, 0057),
  vederea 3D (`src/app/Vedere3D.tsx`, relieful din benzi), bazinul CAM (`src/jobs/`, ADR 0109: un calcul greu nou e o
  cerere a protocolului, nu rulează pe firul principal), imaginile (`src/io/imagine.ts`, decodarea TIFF din
  `src/trasare/tiff.ts`, imaginile pe foaie din ADR 0272, cu octeții în IndexedDB), biblioteca de freze (bila și
  toroidala vin pe linia frezelor, `docs/linii/freze.md`).

## Prima livrare

**ADR 0310, propus**, cu schița (o pagină publicată, ca la celelalte linii) și întrebările pentru owner, cu recomandarea
în față. Fără cod de produs până la răspunsuri. De hotărât acolo, între altele: împărțirea în felii (nucleul și
persistența; relieful din imagine cu alinierea pixelilor; vederea; combinarea și straturile; litofania; 16 biți;
degroșarea și finisarea pe relief), unde stă relieful în document și unde stau octeții lui, cum arată în interfață
(unde se face, cum se vede lângă vectori), mărimea în pachet, ce se portează din sondă.

## De ținut minte

- **Schema documentului:** relieful a luat **v28** (forma `relief`, felia 18.1↑a); cotele erau tot pe v27, deci un câmp nou
  al lor ia v29. Un câmp nou al reliefului (bila, în 18.1↑c) cere iar numărul de la sesiunea principală.
- **Mărimea:** pornirea 114,7 / 120 kB (ADR 0145), totalul 806,1 / 900 kB (ADR 0301). Relieful vine la cerere, cu
  calculul în workere; în raportul fiecărei felii, cât adaugă în pornire și în total.
- **Liniile vecine:** frezele (`wip/16.A-freze`: fereastra exportului, Tăierea), exportul (`wip/28.8-export`:
  fereastra „Exportă G-code”), adminul. O operație 3D nouă atinge fereastra exportului: de vorbit cu sesiunea
  principală înaintea ei.
- **Definițiile pragului** („Pragul, definit”) stau într-o prezentare de pe calculatorul owner-ului, nu în repo: dacă
  un rând nu e destul de limpede din fișierul de acoperire, se cere owner-ului secțiunea.

## Starea

- **24.11:** linia pornită; ramura făcută din `main`; nicio felie începută.
- **24.11, după-amiaza: ADR 0310 propus** (`docs/adr/0310-relieful-nucleul-imaginea-3d.md`), cu rândul în indexul ADR și
  titlul tradus, plus verdictele portării pentru etapa 18 (`docs/PORTARE.md` §4.1). Schița:
  <https://claude.ai/artifact/Kbh5T2HAi3aMuYTQ59qz6h> (fereastra „Relief din imagine” și litofania, care se pot încerca
  pe imagini generate în pagină; planșa cu panoul și straturile; vederea 3D „Modelul / Tăiat”, cu crestele bilei;
  alinierea pixelilor; rândurile exportului; feliile; formularul). Răspunsurile se salvează în pagină, în
  `raspunsuri/owner`, doar de owner (un vizitator obișnuit e refuzat, verificat). Fără cod de produs.
- **Ce propune ADR 0310, pe scurt:** relieful e un element al piesei (forma `relief`, v29), cu straturi în șase moduri;
  dalele de 256² în Uint16 cu scară pe dală, după amprentă, în IndexedDB `cncvs2-relief`, iar documentul ține doar
  amprenta hărții dalelor fiecărui strat; o operație se încheie cu cuantizarea (ce vezi = ce se salvează = ce se taie);
  workerul reliefului și CAM-ul 3D în workerul CAM, fără stare, doar + − × ÷ √ min max; modelul exact = triunghiurile
  prin centrele celulelor; câmpul conservativ pe 9 puncte pe celulă, aliniat la pixeli; finisarea pe capsula segmentului;
  degroșarea în trepte; invarianta 4 cu primul relief tăiat; feliile 18.1↑a–i.
- **Întrebările** (recomandarea întâi, toate „a”): 1 unde stă relieful (element al piesei), 2 ordinea feliilor (întâi ce
  se taie), 3 freza bilă în document (o aduce relieful, în v29), 4 plafonul (8192²), 5 oracolul (scris de linie
  înaintea nucleului, fără agent), 6 materialul litofaniei de pe placă (o placă albă translucidă de 6 mm).
- **Răspunsul sesiunii principale (24.11, 12:52):** (1) v29 rămâne rezervat, dar numărul se fixează la commit-ul
  migrării: îi scriu chiar înainte; dacă cotele n-au luat v28 până atunci, relieful îl ia pe acela (fără versiuni lipsă;
  unirile cu schemă intră în ordinea numerelor). (2) Bila o aduce relieful, dacă owner-ul răspunde „a” la întrebarea 3,
  cu forma câmpului stabilită cu linia frezelor (sesiunea `session_01QcxiUZGaEoi6ADRcuJvDGp`): propunerea,
  `scula.forma = { tip: 'bila' }`, e în ADR 0310 §13 și i-a fost trimisă. **Linia frezelor, de acord (24.11, 12:53)**,
  cu precizările trecute în §13: toroidala `{ tip: 'toroidala', raza }` cu raza < Ø / 2 strict; locurile care presupun
  azi că orice formă e V; funcția comună `motivFormaPeOperatie` în `src/model/formaFrezei.ts`, scrisă de cine ajunge
  întâi în `main`; „Bilă” în bibliotecă după relief; bila în oracolul documentului și în corpusul de aur.
  (3) Rândurile degroșării și finisării în fereastra exportului: după ce fereastra refăcută (28.8, PR-ul #11) e în
  `main`; îi scriu întâi sesiunii principale. ADR-ul propus îl ia în `main` la cererea mea (doar documente) sau cu
  prima felie.
- **De ținut minte:** în codul vederii 3D, „relieful” (`ReliefSimulat`, `reliefPentru`) e câmpul simulării, nu modelul
  de aici; numele noi din `src/relief/` trebuie să nu se încurce cu ele. Codul vechi (ediția întâi) nu e în container:
  verdictele portării se sprijină pe `LECTII.md` §3.2 și pe s5.
- **24.11, 12:55: ADR 0310 acceptat**, cu toate recomandările (formularul schiței: 1a, 2a, 3a, 4a, 5a, 6a; fără note):
  relieful e element al piesei, pe planșa Proiectare; întâi ce se taie (a, b, c, d, apoi e–i); bila o aduce relieful, în
  aceeași versiune cu forma `relief`; plafonul 8192 × 8192 celule; oracolul îl scrie linia, înaintea nucleului, fără
  agent; litofania de pe placă pe o placă albă translucidă de 6 mm (grosimea 0,8–3,0 mm, bila Ø1,5–Ø3). Anunțate
  sesiunea principală și linia frezelor. Pornită felia 18.1↑a.
- **24.11, după-amiaza: felia 18.1↑a gata** (ADR 0310, „Implementarea (18.1↑a)”): oracolul întâi, nucleul `src/relief/`,
  documentul **v28** (nu v29: cotele erau pe v27; anunțată sesiunea principală), workerul reliefului (pixelii exacți printr-o
  textură WebGL2), baza `cncvs2-relief`, alegerea Vectori / Relief în fereastra unei imagini, fereastra reliefului, desenul
  umbrit pe planșă (prin stratul imaginilor al pânzei, adus la cerere), secțiunea Relieful din panou, manualul. Pornirea
  +0,5 kB (cu ușa +0,9), totalul +12,7 kB. Otrăvurile 43 / 43. Bila rămâne pentru 18.1↑c (§13, precizarea din 24.11).
- **24.11, seara: 18.1↑a unită în `main`** (lotul 27, `893e45bb`, unirea în `c5b79526`, din `feb7bee1`).
- **25.11, dimineața: felia 18.1↑b gata** (ADR 0310, „Implementarea (18.1↑b)”), pornită la cuvântul owner-ului transmis de
  sesiunea principală (după resetarea limitei săptămânale): modelul reliefului în vederea 3D, comutatorul „Modelul / Tăiat”;
  cererea `model` a workerului (dalele cerute, compuse și reduse), cheile dalelor și încărcarea doar a celor schimbate, texturile
  pe dale, relieful în golul lui din placă (stencil), cu vârful la fața plăcii. Plus cazul reliefului în lipirea cotelor.
  Pornirea +0, totalul +3,9 kB (884,8 / 900).
- **De ținut minte:** o felie care schimbă ce arată vederea 3D trece și prin `vedere3d.spec.ts` și `incrustatie3d.spec.ts`
  (shaderul e comun); `vedere` din `Vedere3D.tsx` e ținută și în `acum` (ascultătorii montați o dată o citesc de acolo).
- **25.11: 18.1↑c pornită** (finisarea paralelă pe relief; ADR 0310 §4–§6, §13), la mesajul sesiunii principale („Poți aduce
  `main` și porni 18.1↑c”; v29 e al reliefului, fără să-l împartă). Forma bilei, trimisă liniei frezelor: `{ tip: 'bila' }`.
  Planul, pe bucăți (fiecare cu commit, proba înaintea funcției):
  - **c-0, oracolul 3D** (`test/oracles/relief3d.ts`, zero importuri din `src/`): triunghiurile modelului exact (§4), drop-cutter-ul
    exact pe ele (vârfuri, muchii, fețe, muchia discului; bila, plata, V-ul), CL-ul pe hârtie pe plan, sferă și cilindru,
    simulatorul crestei; controalele negative (eșantionul în nod, fără muchii, fără fețe) trebuie să pice.
  - **c-1, documentul v29**: `scula.forma = { tip: 'bila' }` și operația de relief (finisarea: freza, pasul lateral în celule,
    unghiul, aliniată, pasul pe trecere, marginea); migrarea, ușa, oracolul documentului, corpusul de aur; `motivFormaPeOperatie`.
  - **c-2, CAM-ul finisării** în workerul CAM (`src/cam/relief*.ts`): câmpul conservativ (maximul pe 9 puncte pe celulă), CL-ul
    pe capsula segmentului, liniile la unghi, trecerile pe Z (niciodată mai adânc decât pasul), marginea; IR-ul; invarianta 4
    judecată de oracol pe tot ce iese.
  - **c-3, interfața**: rândurile finisării în fereastra exportului (vorbit întâi cu sesiunea principală), alegerea din Tăierea;
    simularea arată rezultatul („Tăiat”), manualul.
