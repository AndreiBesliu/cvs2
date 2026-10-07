# DEVLOG — CNC Vector Studio, ediția a doua

Jurnal append-only. Regulile și faptele stabile stau în `CLAUDE.md`, nu aici.

## 2026-10-05 — Inițierea proiectului (Model: Claude Opus 5.5)

**Prompt:** `docs/PROMPT-START.md`, exact, cu motivul repornirii completat: progresul devenise prea greu, iar
procesul de dezvoltare părea haotic.

**Făcut:**
- Repo nou în `C:\dev\cncvs2` (în afara Google Drive), git local pe `main`, fără remote încă.
- `ACOPERIRE-ARTCAM-DESKPROTO.md` copiat din `PlanNou-CNC`. Am adăugat coloanele Stare și Commit pe toate
  cele 87 de rânduri de capabilitate (toate „de făcut”), adică exact cele 87 din `ref.capabilities` din JSON.
  Textul din afara tabelelor a rămas identic cu originalul, iar fișierul a trecut de la CRLF la LF.
- `CLAUDE.md` cu regulile de lucru din prompt și starea curentă.
- `docs/FAZA0-PLAN.md`: planul de lectură pentru LECTII.md, cu cifrele cartografierii, costul (~31 de agenți,
  ~8 M tokeni) și durata estimată (1,5–2 h).

**Nepornit:** Faza 0. Owner-ul a amânat-o pentru a doua zi; pornește cu acordul lui și cu cifrele din
panoul de utilizare.

## 2026-10-05 — Repo-ul mutat în `MyWork\Apps\cncvs2` (Model: Claude Opus 5.5)

**Prompt:** „totusi, o sa vreau sa lucram aici: C:\Users\besli\Desktop\MyWork\Apps”. Am întrebat ce înseamnă,
iar owner-ul a ales: proiectul se mută în `Apps\cncvs2`, deci în Google Drive.

**Făcut:** am mutat `C:\dev\cncvs2` cu tot cu `.git`, iar istoricul a rămas intact (`5933051`). Am șters
`C:\dev`, care rămăsese gol. În `CLAUDE.md`, regula „codul stă în afara Google Drive” a fost înlocuită de
decizia nouă și de plasa ei: git e sursa de adevăr, cu push pe GitHub după fiecare felie, de îndată ce
există remote.

## 2026-10-06 — Faza 0: LECTII.md (Model: Claude Opus 5.5)

**Prompt:** „neata! Go!”. Owner-ul a ales varianta completă (31 de agenți), rulată în două tranșe din cauza
utilizării (40–60 %), și a confirmat tranșa a doua după prima.

**Făcut:**
- `LECTII.md`, cu cele cinci părți cerute (inventar, defecte și cauze, ce merită păstrat, arhitectura altfel,
  planșele), plus §2.3 („de ce a devenit greu și haotic”), §6 (corecturile la JSON) și §7 (ce ajunge la
  interviu).
- Rapoartele cu surse sunt în `docs/faza0/`:
  - 00: metricile din git;
  - 01–13: modulele;
  - 14–15: planșele;
  - 21–28: cronologia completă a DEVLOG-ului;
  - 31–36: verificarea adversarială a `old.lessons`, `old.metrics` și `old.decisions`;
  - 40: toate corecturile la JSON;
  - 41–42: criticii ciornei.
- Metricile mele din git au fost corectate de cronologie: fișierul temporar din W24 și artefactul `git add -A`
  din W30.
- După fiecare tranșă am verificat proiectul vechi: neatins de fiecare dată (HEAD `d850c7b`, arbore curat).

**Măsurat** (pentru estimările viitoare):

| Tranșa | Agenți | Tokeni | Durată | Estimat |
|---|---:|---:|---:|---:|
| 1 (module + planșe) | 15 | 5,73 M | 27 min | 4,5 M |
| 2 (cronologie + verificare) | 14 | 3,96 M | 12 min | 5,2 M |
| critici | 2 | 0,61 M | 12 min | 0,6 M |
| **Total** | **31** | **10,3 M** | **~51 min de workflow** | **8 M inițial (7–10 M), 11,5 M revizuit după tranșa 1** |

Sinteza și corecturile le-am făcut în conversația principală, fără agenți.

**Următorul pas:** Faza 1, interviul. Pornește de la `LECTII.md` §7.

## 2026-10-06 — Faza 1: interviul (Model: Claude Opus 5.5)

**Prompt:** „acum”, după oferta de a porni interviul. Au fost șapte tranșe de întrebări, plus două formulare de
triaj; răspunsurile au venit pe rând.

**Făcut:**
- `BRIEF.md` completat cu toate deciziile:
  - produsul, felul de lucru, platforma, partea comercială;
  - infrastructura, mașinile, simularea, planșele;
  - triajul funcțiilor și ordinea pragului.
- `ACOPERIRE-ARTCAM-DESKPROTO.md`: etapele a 48 de rânduri schimbate prin decizia owner-ului, fiecare marcată
  „decis 06.10; era …”. v1 are acum 64 de rânduri, față de 22.
- `CLAUDE.md`: Faza 1 e încheiată și are un rezumat al deciziilor.
- Repo-ul public `AndreiBesliu/cvs2`: `docs/faza0` a fost scos din istorie înainte de primul push și e ignorat
  de git.
- Proiectul vechi: ramura goală `laterala` ștearsă, cu acordul owner-ului.

**Următorul pas:** Faza 2, arhitectura în plan mode, cu prototipul planșelor (A și D) înainte de aprobare.

## 2026-10-07 — Două cerințe adăugate după interviu (Model: Claude Opus 5.5)

**Prompt:** „mai am de mentionat 2 lucruri, o sa vreau si un admin, ca si acum, si il vreau in v1. dar decizi tu
cand este momentul pentru el. si vreau sa ne asiguram ca avem un sistem de desen care deseneaza si exporta
vectori reali”

**Făcut:**
- `BRIEF.md` §16:
  - 16.1, adminul în v1, cu momentul ales de asistent în planul pe etape;
  - 16.2, vectorii reali: ce înseamnă, cum se probează și de ce.

  §8 (gata la lansare) are două rânduri noi.
- `ACOPERIRE-ARTCAM-DESKPROTO.md`: rând nou la A, exportul 2D cu vectori reali, v1. Acum v1 are 65 de rânduri,
  iar totalul e 88.
- `CLAUDE.md`: rezumatul deciziilor are cele două adăugiri.

**Următorul pas:** Faza 2, tranșa 1 (sondele, inventarul adminului, prototipul planșelor).

## 2026-10-07 — Faza 2, tranșa 1: sondele (Model: Claude Opus 5.5)

**Prompt:** răspunsurile la formular. Tranșa 1: „Pornește acum (Recomandat)”. Programele-țintă pentru export:
ArtCAM, AutoCAD / Aspire / VCarve, Inkscape / Illustrator, CorelDRAW. Vectorii reali: „Da, exact asta”.

**Făcut:** 10 agenți în paralel, fiecare cu raportul lui în `docs/faza2/` și cu codul de probă în `cod/`.

| Sonda | Ce a decis | Cifra-cheie |
|---|---|---|
| s1 geometria | calea = linie, arc, cubică; boolean cu Skia PathOps (PathKit); offset cu cavalier_contours; biarce proprii | cercul decalat rămâne 2 arce; litera B: 131 de linii G-code față de 467 aplatizate |
| s2 export / import | DXF „exact” R2007 + „compatibil” R12; SVG, PDF, EPS; import DXF / SVG / PDF | 108/108 la export, 65/65 la import, cu cititori independenți; pachet de probă pentru owner |
| s3 V-carve | axa medială din Voronoi pe puncte dese (delaunator + legalizare robustă) | plăcuța de 6 mm: 8 222 de linii față de 161 842 |
| s4 simularea | nucleu CPU în TypeScript, dale rare, workere; GPU doar desenează | identic bit cu bit Node = Edge; 0 celule greșite pe 16 piese pe hârtie |
| s5 relieful | Float32 pe dale; câmp conservativ pentru CAM 3D; WebGPU pentru operațiile globale | 0 scobituri pe corpus; finisare 2,67 M de puncte în 90 ms pe GPU |
| s6 pânza | hibrid: WebGL2 pentru trasee și simulare, Canvas2D exact pentru vectori | 0 cadre pierdute la 60 Hz cu 50 k vectori + 5 M segmente |
| s7 datele | valibot; OPFS + IndexedDB; zip determinist; undo ca jurnal; PWA cu actualizare oferită | salvarea supraviețuiește căderii; zip identic octet cu octet |
| s8 posturile | un post condus de contracte de dialect ca date, cu sursă pe câmp | 3 zecimale în mm ajung pentru regula de arc a GRBL (200 000 de arce) |
| admin | 12 file (nu 13), 5 tranșe legate de drum, 12–17 felii | cauza lui 401 pe test: App Check, nu contul |
| prototipul planșelor | A și D pe 8 scenarii, 122 de verificări, 6 sabotaje prinse | D: 6 gesturi față de 26 (scen. 5), 9 față de 39 (scen. 7) |

**Măsurat:**
- Tranșa: 10 agenți, **4,19 M tokeni**, **80 min**. Estimarea fusese ~6 M și 60–75 min.
- **Re-măsurat de mine, serial, pe mașina liberă** (comanda `masoara` a fiecărei sonde, 09:46–09:56): **toate
  cele 10 s-au reprodus.**
  - s1: tabelele T1–T8 identice, ordinea bibliotecilor neschimbată; cavalier 1 000 de offseturi în 11 ms.
  - s2: 108/108 la export, 65/65 la import. Prima rulare picase din cauza mediului: din venv-ul din Temp
    dispăruse `python.exe` (refăcut cu `venv --upgrade`).
  - s3: plăcuța 8 222 de linii, abatere sub ideal 0,0131 mm, peste ideal 0,0016 mm; flo-mat tot 4 excepții + o
    agățare.
  - s4: amprentele Node = Edge identice; jobul 2D la 0,25 mm în 563 ms; WASM / JS = 1,00.
  - s5: 0 scobituri cu câmpul conservativ; blur WebGPU 32 ms față de 92 ms pe 16 workere.
  - s6: hibridul 8,8 ms pe cadru (median); redesenul exact pe 50 k forme în 66 ms.
    - Martorul pozitiv de procesor din proba la 60 Hz **nu mai pică** pe mașina liberă: 10 k forme se
      redesenează exact sub un cadru. Martorul de GPU pică în continuare.
    - Concluzia rămâne, dar bugetul real de redesen e mai bun decât cel din raport, măsurat sub încărcare.
  - s7: PWA 9/9 cu martorul picat.
  - s8: tabelul de arce identic.
  - s9: 63/63 de celule, 0 nepotriviri.
  - s10: 122/122.

**Următorul pas:** tranșa 1b, adică verificatorii adversariali și două sonde mici. Owner-ul încearcă
prototipul planșelor și pachetul de export.

## 2026-10-07 — Faza 2, tranșa 1b: verificatori adversariali + două sonde mici (Model: Claude Opus 5.5)

**Prompt:** continuarea Fazei 2, din planul prezentat owner-ului: tranșa 1, apoi verificatorii țintiți
(~2 M), apoi arhitectura (~2,5 M). Ultracode activ.

**Făcut:** 5 agenți în paralel.

| Agentul | Verdictul | Ce schimbă |
|---|---|---|
| v1 geometria (`s1-geometrie/VERIFICARE.md`) | se păstrează, cu gărzi | Offsetul cavalier:<br>- cade pe polilinii dense (47/240 la 5 000 de segmente);<br>- un epsilon greșit dă semicercuri;<br>- formele sub 0,005 mm dispar;<br>- portul JS nu are reparațiile din Rust 0.8/0.9.<br><br>PathKit (înghețat din 2022, nu din 2025) derivă în lanț; re-ancorarea R3 după fiecare operație o aduce la 3,3e-13 mm |
| v2 V-carve (`s3-vcarve/VERIFICARE.md`) | se păstrează, cu gărzi | Cifrele-titlu ale s3 erau la h = 0,02, nu 0,05: la 0,05, plăcuța iese cu 0,0163 mm sub ideal.<br>- Legalizarea pe treceri se oprește tăcut la plafon; Lawson pe stivă: 0,08 s față de 16–19 s.<br>- Muchiile „aproape comune” cer vindecarea intrării.<br>- Incrustația cere adâncime de start |
| v3 pânza pe iGPU (`s6-panza/VERIFICARE.md`) | hibridul rămâne, schimbat | Vectorii exacți se desenează într-un worker, pe pânză software, și se predau ca ImageBitmap (clicul se vede în 24 ms).<br>- Pe iGPU, traseele dense merg ca LINE_STRIP.<br>- Metoda s6 măsura rasterul software, din cauza citirii de 1 pixel |
| s11 izolarea | fără izolare cross-origin în v1 | COOP + COEP strică login-ul Google (popup și redirect).<br>- Transferul costă × 1,10–1,23 la blur și × 0,97 la finisare.<br>- Dacă va trebui SAB: Document-Isolation-Policy |
| s12 formatele | tabel de decizie pentru owner | EPS printr-un interpretor propriu limitat (Illustrator CS6 citit exact, 0,0048 pt).<br>- DWG doar ca mesaj în v1 (ODA costă 7 500 $ primul an).<br>- WMF / EMF printr-un cititor propriu.<br>- DGK / PIC fără specificație publică |

**Măsurat:** 5 agenți, **2,18 M tokeni** (estimat 2,2 M), **87 min** (estimat 45–60, deci +45 % față de capătul de sus).

**Următorul pas:** tranșa 2, arhitectura: 3 propuneri independente și estimatorul.

## 2026-10-07 — Faza 2, tranșa 2: propunerile de arhitectură, estimarea și ciorna planului (Model: Claude Opus 5.5)

**Prompt:** continuarea Fazei 2, din planul prezentat owner-ului.

**Făcut:**
- 4 agenți în paralel, în `docs/faza2/arhitectura/`:
  - **trei propuneri independente:** „corectitudine” (26 de etape, 212 felii), „valoare” (31 de etape, 218,5 felii),
    „simplitate” (30 de etape + 3 tampoane, 254 de felii);
  - **estimatorul**, din ritmul măsurat al ediției întâi: P50 ~33 de săptămâni (~28.05.2027), P80 ~50, P90 ~64
    (~27.12.2027).
- Toate trei propunerile au convers pe deciziile mari:
  - fără calcul pe GPU în v1;
  - fără izolare cross-origin;
  - `evenodd` cu normalizare la intrare;
  - elipsa ca formă exactă, nu ca primitivă;
  - V-carve fără Clipper;
  - pânza cu worker software;
  - D ca ipoteză;
  - EPS cu interpretor propriu, după decizia owner-ului.
- `PLAN.md`, ciorna mea:
  - scheletul pe etape e din „simplitate”, spina de dovadă din „corectitudine”, deciziile cu implicit din
    „valoare”;
  - 21 de decizii tehnice, fiecare cu dovada și condiția de redeschidere;
  - 22 de decizii ale owner-ului.

**Măsurat:** 4 agenți, **2,35 M tokeni** (estimat 1,8 M, deci +31 %), **37 min** (estimat 45–60).

**Totalul Fazei 2 până aici:** 4,19 + 2,18 + 2,35 = **8,72 M tokeni** în agenți, fără conversația principală.

**Următorul pas:** 3 critici pe ciornă (~0,9 M), corecturile, apoi aprobarea owner-ului în plan mode.

## 2026-10-07 — Faza 2: criticii pe ciorna planului și `PLAN.md` v2 (Model: Claude Opus 5.5)

**Prompt:** continuarea Fazei 2 (criticii erau anunțați owner-ului înainte de prezentarea planului).

**Criticii:** 3 agenți, **1,44 M tokeni** (estimat 0,9 M, deci +60 %), **30 min**. Rapoartele sunt în
`docs/faza2/arhitectura/critica-{acoperire,cifre,proces}.md`. Au găsit 3 probleme blocante și ~30 importante, toate
de ordine și de text, niciuna de arhitectură.

**Ce s-a schimbat în `PLAN.md` v2:**
- **Blocantele:**
  - întrebarea „beta sau v1 complet” (`BRIEF.md` §15) e pusă acum, la §8.1, iar riscul principal e în §7;
  - A / D se decide la aprobare (`BRIEF.md` §9);
  - o singură unitate, felia de plan: ~½ zi activă ≈ 1,17 felii ale estimatorului. Formula de recalibrare e scrisă
    întreagă, fără să scadă de două ori placa. Prima recalibrare vine după etapa 3, care are un articol R3.
- **Cerințe ale owner-ului care lipseau:**
  - N axe din prima zi (T22);
  - registrul de acțiuni cu capabilitățile, din etapa 1;
  - cele 7 contracte de post, cu cine le probează;
  - calibrarea pe lemn aliniată la `BRIEF.md` §13;
  - inventarul adminului pe 12 file, în plan;
  - configurarea din `BRIEF.md` §7, pornită în săptămânile 1–2.
- **Fezabilitatea:**
  - etapa 1 a fost tăiată la drumul minim până la placă, iar stratul WebGL2 a trecut în etapa 2;
  - proba de mediu în Drive e prima felie;
  - plăcile 1–2 se taie cu senderul de azi;
  - în etapa 3 intră felia de comutare, cu aplicația veche, PITR și repo-ul vechi;
  - regulile pentru plăcile picate sau întârziate;
  - coada owner-ului are cel mult 5 rânduri deschise, cu stare.
- **Dovada:**
  - invariantele intră pe etape, iar 1, 3 și 5–8 sunt din etapa 1;
  - bancul vizual intră în etapa 2, unealta de otrăvuri în etapa 4;
  - sesiunile independente au calendar și buget;
  - semantica roșului pe niveluri de CI;
  - registrul de defecte are gravitate.
- **Cifrele:** etichetele [măsurat] / [citit] corectate; T2 declară toate cazurile de aproximare; calendarul (lansarea
  ~20.06.2027 la ritmul nominal) e lângă P50; rândul R3 × 2,2 adăugat la sensibilitate.
- **Detaliul etapelor 1–4** stă în plan (§5.3). Pentru 5–30, plecăm de la tabelul §5.4 și de la amendamentele §5.5.
  Propunerile rămân doar istoric.

**Totalul Fazei 2 în agenți:** 10,16 M tokeni.

**Următorul pas:** plan mode și aprobarea owner-ului, cu răspunsurile de la §8.1.

## 2026-10-07 — Planul aprobat (Faza 2 încheiată) (Model: Claude Opus 5.5)

**Prompt:** aprobarea în plan mode, cu răspunsurile owner-ului la întrebările de la `PLAN.md` §8.1:
- A / D: „Încerc întâi prototipul”, apoi „Aprob restul; A / D înainte de etapa 1”;
- beta: „Probă închisă după etapa 14 (Recomandat)”;
- importul: toate patru recomandările;
- fără placă: „1 si am deja masina separat cu laser in atelierul meu”;
- laserul: „Ruida (CO2), RDWorks / LightBurn”.

**Făcut:**
- `PLAN.md`: starea „aprobat, fără A / D”. Actualizate:
  - §0, §8.1 (cu răspunsurile) și §8.3;
  - T18 (exportul pentru laser);
  - etapele 14, 17, 24–26;
  - amendamentele 14 (proba închisă) și 15 (laserul);
  - §6 (+~18 felii pentru proba închisă, deci ~283 de felii de plan).
- `BRIEF.md`:
  - §2: G-code-ul de laser GRBL și DWG nativ trec în v1.x;
  - §4: proba închisă;
  - §9: aprobarea fără A / D;
  - §12: laserul Ruida și găurirea multiplă pe simulare;
  - §15: estimarea și reacția owner-ului.
- `ACOPERIRE-ARTCAM-DESKPROTO.md`:
  - rândurile A4 (importul decis), A5 (EPS da, AI nu), B13 (găurirea multiplă pe simulare) și B14 (laserul ca export
    pentru LightBurn / RDWorks);
  - DGK / PIC trecute la „Scoase la reverificare”, cu motivul;
  - nota GPU din „Ce înseamnă pentru arhitectură”, aliniată la T11.
- `CLAUDE.md`: starea (Faza 2 încheiată, pasul 0 următor) și regulile de proces pe scurt; decizia din 07.10 la
  „Decizii luate”.

**Următorul pas:** pasul 0. Întâi `docs/PORTARE.md` pentru candidații etapelor 1–3, apoi ADR-urile. Etapa 1 pornește
după alegerea A / D.

## 2026-10-07 — Pasul 0: `docs/PORTARE.md` pentru etapele 1–3 (Model: Claude Opus 5.5)

**Prompt:** cererea owner-ului din 06.10, exact: „vreau ca dupa interviu, si dupa ce avem planul, sa imi spui atunci daca
ceva din codul vechi se poate integra eficient si bine in codul nou”. Pasul 0 din `PLAN.md` §5.2.

**Făcut:**
- `docs/PORTARE.md`: verdictele pentru candidații etapelor 1–3, citiți în codul vechi la `d850c7b`, fără ca el să fie
  atins. Pentru restul candidaților din `LECTII.md` §3.2, doar ce se vede de acum.
  - **adaptat:** urechile (profilul), alegerea intrărilor și rampa, ajutoarele GRBL, dicționarul de coduri;
  - **rescris, cu vechiul ca martor:** biarcele, bugetul de toleranță, fluxul GRBL cu bariera;
  - **portat aproape neschimbat:** registrul probei, fiindcă hash-ul trebuie să rămână identic bit cu bit.
- Găsite pe drum:
  - biarcele și bugetul lipseau din lista etapei 2, deși importul SVG le cere;
  - în vechi, puntea urechii ieșea subțiată de supracursă; aici se măsoară de la fundul materialului;
  - textele codurilor GRBL din vechi parafrazează documentația GRBL (GPL-3.0), deci se scriu din nou;
  - la comutarea din etapa 3, secretul și colecția registrului probei trebuie păstrate;
  - cititorul `.tdb` vine din reverse engineering, ca DGK / PIC. Implicit: lăsat, iar biblioteca owner-ului trece o
    singură dată, prin CSV.
- `PLAN.md`: §5.3 (etapele 2 și 3) și §8.3, cu trimiteri la `docs/PORTARE.md`.

**Următorul pas:** ADR-urile din T1–T23, în `docs/adr/`.

## 2026-10-07 — Pasul 0: ADR-urile din T1–T23 (Model: Claude Opus 5.5)

**Prompt:** pasul 0 din `PLAN.md` §5.2 și §9: „ADR-urile, din tabelul de la §3.5”.

**Făcut:**
- `docs/adr/`: ADR 0001–0023 (unul pe decizie, T1–T23) și indexul `README.md`, cu regulile:
  - un ADR acceptat nu se editează;
  - o decizie se schimbă printr-un ADR nou, care îl înlocuiește pe cel vechi;
  - numerotarea continuă de la 0024.
- Fiecare ADR are aceleași secțiuni: problema, decizia, dovada cu sursa, ce am respins, ce impune, când se redeschide.
  Conținutul vine doar din `PLAN.md` (§3.1–§3.6, §4.1, §5.3) și din rapoartele sondelor; nimic nou decis.
- `PLAN.md` §3.5 trimite la ADR-uri. `CLAUDE.md`: pasul 0 încheiat, iar la surse apar ADR-urile și `docs/PORTARE.md`.

**Următorul pas:** etapa 1, după alegerea A / D. Până atunci, nimic nu se scrie în `src/`.

## 2026-10-07 — Pasul 0: verificarea lui PORTARE.md și a ADR-urilor (Model: Claude Opus 5.5)

**Prompt:** „cum verific?”

**Făcut:**
- Codul vechi a rulat pe o copie a lui `d850c7b` (`git archive` + joncțiune spre `node_modules`), cu runner-ul lui. Repo-ul
  vechi a rămas neatins.
  - Suitele vechi: urechile 88 / 88, intrările 77 / 77 (594 de variante), bariera 23 + 20, reluarea 76, registrul probei
    100. Toate verzi.
  - Sonda pentru supracursă confirmă defectul vechi: cu urechi de 2 mm, puntea iese de 1,7 mm la supracursa implicită
    de 0,3 mm și de 1,5 mm la 0,5 mm.
- **Corectat în `docs/PORTARE.md`**, după măsurători:
  - reluarea are 76 de verificări, nu 51 (cifra din Faza 0 era mai veche);
  - bariera are 43, nu 42;
  - din textele GRBL, doar 3 din 46 sunt aproape copiate din CSV-ul GPL (err1, err20, err22). Se rescriu doar ele;
    restul trec. Verdictul anterior, „textele nu trec”, era prea larg;
  - partea a 7-a a testului registrului citește textul surselor, deci nu trece (`PLAN.md` §3.3).
- `docs/PORTARE.md` §6, „Cum am verificat”, iar uneltele sunt în `docs/pasul0/verificare/`:
  - `verifica_documente.py`: trimiterile la codul vechi, numerele din ADR-uri, legăturile. Iese 0 probleme. Controlul
    negativ, cu 4 greșeli puse intenționat, le prinde pe toate;
  - `compara_grbl.py`: textele GRBL. CSV-urile GPL nu intră în repo;
  - `test-zz-sonda-supracursa.ts`: sonda, doar pentru copia veche.

**Următorul pas:** etapa 1, după alegerea A / D.

## 2026-10-07 — Prototipul A / D pe instanța de test (Model: Claude Opus 5.5)

**Prompt:** „Aveam impresia ca o sa testam pe instanta de test din firebase. Aici:
https://cncvectorstudio-test.firebaseapp.com/”

**Făcut:**
- Adresa principală de test servește încă aplicația veche (publicată pe 25.09). Planul o înlocuiește în etapa 1, după
  exportul Firestore confirmat de owner. Ca s-o las neatinsă, prototipul a mers pe un **canal de previzualizare** al
  proiectului `cncvectorstudio-test`.
  - Comanda: `firebase hosting:channel:deploy planse-ad --project test --expires 30d`, rulată dintr-un dosar temporar
    care conține doar prototipul (`docs/faza2/prototip-planse/index.html`, identic, cu același SHA-256);
  - antetele: `no-cache` și `noindex`.
- Adresa: <https://cncvectorstudio-test--planse-ad-m9ycx3rc.web.app>. Expiră pe 06.11.2026.
- Verificat:
  - adresa principală are același Etag și aceeași dată ca înainte, deci aplicația veche e neatinsă;
  - în browser, pagina se încarcă fără erori în consolă, iar comutarea pe D și scenariul 4 merg;
  - o notiță rămâne după reîncărcare (apoi am șters-o).
- `PLAN.md` §8.3: adresa trece în rândul A / D. `CLAUDE.md`: regula „owner-ul testează pe instanța de test, după un
  link”.

**Următorul pas:** alegerea A / D a owner-ului, apoi etapa 1.
