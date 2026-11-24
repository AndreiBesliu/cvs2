# Relieful (18.1↑, ADR 0310–0329)

_cncvs2, relieful 2.5D / 3D, felia 18.1↑ adusă din etapa 18 („Relieful 1: nucleul, relieful din imagine, prelucrarea 3D
din relief”): ramura `wip/18.1-relief` (din `main`, 24.11), ADR-urile 0310–0329, canalul `relief`; PORNITĂ pe 24.11, la
cuvântul owner-ului; întâi ADR 0310 propus, cu schița și întrebările, apoi codul_

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

- **Schema documentului:** e v27. Dacă relieful cere un câmp nou, numărul îl dă sesiunea principală (rezervat: v28
  pentru cote, v29 pentru relief; spune înainte să-l iei, ordinea se poate schimba).
- **Mărimea:** pornirea 114,7 / 120 kB (ADR 0145), totalul 806,1 / 900 kB (ADR 0301). Relieful vine la cerere, cu
  calculul în workere; în raportul fiecărei felii, cât adaugă în pornire și în total.
- **Liniile vecine:** frezele (`wip/16.A-freze`: fereastra exportului, Tăierea), exportul (`wip/28.8-export`:
  fereastra „Exportă G-code”), adminul. O operație 3D nouă atinge fereastra exportului: de vorbit cu sesiunea
  principală înaintea ei.
- **Definițiile pragului** („Pragul, definit”) stau într-o prezentare de pe calculatorul owner-ului, nu în repo: dacă
  un rând nu e destul de limpede din fișierul de acoperire, se cere owner-ului secțiunea.

## Starea

- **24.11:** linia pornită; ramura făcută din `main`; nicio felie începută.
