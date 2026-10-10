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

## 2026-10-07 — Etapa 1, felia 1.1: fișa etapei și proba de mediu în Drive (Model: Claude Opus 5.5)

**Prompt:** „Continua si testez putin mai incolo”. Etapa 1 pornește fără alegerea A / D: feliile care nu depind de
modelul de planșe merg înainte, iar documentul v0 așteaptă (`docs/etape/etapa-01.md`).

**Started:** ~14:50. **Completed:** 14:57. **Clasa:** R1 (I1). **Estimarea:** 1 felie. **Treceri:** 2.

**Făcut:**
- `docs/etape/etapa-01.md`: 9 felii, cu articolul și clasa fiecăreia, plus fișa plăcii 1 și jurnalul feliilor.
- Scheletul minim, cu versiunile fixate:
  - Vite 8.3.3, TypeScript 7.0.2 (compilatorul nativ), React 19.3;
  - `node --test` pe `.ts`, fără transpilare;
  - Playwright 1.63 pe Edge, peste `dist/` servit de `vite preview`.
- **Proba de mediu**, de două ori, de la `npm ci`:

  | Pasul | Durata |
  |---|---:|
  | `npm ci` | 8 s |
  | `tsc` | 2,8 s |
  | testele unitare | 2,8 s |
  | build | 2,9 s |
  | e2e în Edge | 8 s |

  `dist/` iese identic în ambele rulări, iar `git status` arată doar fișierele noi. Drive n-a readus nimic, deci nu e
  nevoie de joncțiune și nici de ADR-ul ei.
- **A doua trecere:** e2e-ul a prins un 404 pe `favicon.ico`. L-am reparat cu o iconiță, nu cu un filtru în test.

**Următorul pas:** felia 1.2, scheletul: `t()` en / ro cu paritate, ErrorBoundary + jurnalul local, configul de la
gazdă, CSP.

## 2026-10-07 — Etapa 1, felia 1.2: scheletul (Model: Claude Opus 5.5)

**Prompt:** „Continua si testez putin mai incolo” (continuare). **Started:** 14:57. **Completed:** 15:05.
**Clasa:** R1 (I1, I2). **Estimarea:** 1 felie. **Treceri:** 2.

**Făcut:**
- **`t()` en / ro** (`src/i18n/`):
  - `mesaje.en.ts` definește cheile, iar `mesaje.ro.ts` le satisface exact;
  - compilatorul refuză o cheie lipsă, o cheie în plus și un plural românesc fără `few`. Controalele sunt directive
    `@ts-expect-error` în `test/unit/i18n.test.ts`, probate și invers: fără directivă, `tsc` dă `TS2741`;
  - pluralele urmează CLDR: 0 erori, 1 eroare, 2–19 erori, 20 de erori, 101 erori.
- **ErrorBoundary și jurnalul local** (`src/app/`):
  - jurnalul păstrează ultimele 50 de intrări, cu mesajele și stivele tăiate;
  - un depozit care aruncă sau e stricat nu pierde eroarea: ea trece în memorie;
  - ecranul de eroare are „Copiază raportul”, „Reîncarcă” și raportul afișat;
  - erorile ferestrei și promisiunile respinse intră și ele în jurnal.
- **Configul de la gazdă:** `/config.json`, validat cu valibot. Un config lipsă sau greșit devine un motiv afișat,
  nu o aplicație oprită.
- **CSP-ul** stă o singură dată, în `shared/csp.ts`, și intră doar în build. Serverul de dezvoltare are nevoie de
  scripturile inline ale lui React.
- **E2e în Edge, 7 teste:**
  - sub CSP-ul din build, Edge refuză `eval`, iar martorul fără CSP îl execută;
  - aplicația nu raportează nicio încălcare;
  - limba pornește după browser și rămâne după reîncărcare;
  - diagnosticul `?diagnostic=eroare-de-randare` (oprit pe live) arată ecranul de eroare, raportul se copiază, iar
    jurnalul se păstrează după reîncărcare.
- 19 teste unitare.
- **A doua trecere:** tipul importului de CSS (`declare module '*.css'`).

**Următorul pas:** felia 1.3, CI-ul rapid și cârligul `git add -A`.

## 2026-10-07 — Etapa 1, felia 1.3: CI-ul rapid și cârligul împotriva adăugării totale (Model: Claude Opus 5.5)

**Prompt:** „Continua si testez putin mai incolo” (continuare). **Started:** 15:05. **Completed:** 15:15.
**Clasa:** R1 (I1, I6). **Estimarea:** 1 felie. **Treceri:** 3.

**Făcut:**
- **Regulile de import** (`.dependency-cruiser.cjs`, `PLAN.md` §3.3):
  - sunt 11 reguli, iar fiecare are o capcană în `test/capcane/`;
  - `scripts/verifica-importuri.ts` cere EXACT încălcările capcanelor;
  - controalele: o regulă cu calea stricată și un import interzis adăugat în cod real pică amândouă;
  - regula mașinii primește capcana în felia 1.4, când apare `src/geom`;
  - `dependency-cruiser` 18.5 nu suportă TypeScript 7 (vedea 0 module), deci citește prin swc.
- **Build-ul determinist:** două build-uri identice, octet cu octet. Bugetul: JS gzip 69,9 kB, cu plafonul de 100 kB.
- **Licențele:** dependențele de rulare se iau din lanțul lor din lockfile, nu din marcajul `dev`, fiindcă npm nu
  marchează ca `dev` binarele opționale ale lui TypeScript 7. Sunt 4 dependențe, toate MIT, plus testul listei albe.
- **Cârligul** `.claude/hooks/fara-add-all.ts`, înregistrat în `.claude/settings.json` pentru Bash și PowerShell:
  - refuză `git add -A` / `--all` / `-u` / `.` / `:/` și `git commit -a`, oriunde într-o comandă compusă;
  - nu se uită în corpul heredoc-urilor, deci un mesaj de commit care pomenește regula trece;
  - 15 comenzi refuzate și 11 permise sunt testate, plus scriptul rulat pe stdin, cum îl rulează Claude Code.
- **Workflow-urile:**
  - `rapid`, la fiecare push, cu excepția commit-urilor numai `.md`;
  - `complet`, noaptea și la cerere, cu nivelul rapid plus e2e în Edge pe `dist/`.
- **Treceri:**
  - ciclul e raportat o singură dată, nu de două ori;
  - binarul lui `dependency-cruiser` nu e în `exports`;
  - licențele se iau din lanțul de dependențe.

**Următorul pas:** CI-ul pe GitHub, verde și la prima rulare de noapte. Apoi felia 1.4, geometria v0.

## 2026-10-07 — Etapa 1, felia 1.4: geometria v0 și cavalier adus în repo (Model: Claude Opus 5.5)

**Prompt:** „Continua si testez putin mai incolo” (continuare). **Started:** 15:15. **Completed:** 15:28.
**Clasa:** R2 (I10a, I10c parțial). **Estimarea:** 1 felie. **Treceri:** 3.

**Făcut:**
- **`src/geom/contur.ts`**:
  - conturul L / A / C, cu `bulge` (T1);
  - aria cu semn, exactă: arcul prin coardă + segment de cerc, cubica prin Gauss–Legendre pe 3 noduri, exactă pentru
    gradul 5;
  - inversarea, dreptunghiul (cu sau fără colțuri rotunjite) și cercul ca două arce.
- **`src/geom/matrice.ts`**:
  - matricea afină, cu rotiri exacte la multipli de 90°;
  - arcele trec doar prin similitudini, iar matricea neuniformă e refuzată (T2);
  - oglindirea schimbă semnul bulge-ului.
- **`src/geom/offset.ts`:** fațada de offset peste cavalier. Conturul e adus întâi în sens trigonometric, iar orice
  eșec iese ca motiv: „scula nu încape…”.
- **`src/geom/cavalier/`**: `cavalier-contours-js` `v0.1.1` (`2e126aa`), adus din sursa TypeScript.
  - Importurile `.js` au trecut la `.ts`, plus 118 `!` doar pentru tipuri, pe 109 linii.
  - Comparația linie cu linie cu originalul nu arată nimic altceva.
  - Martorul `test/unit/cavalier.martor.test.ts` dă ieșiri identice, bit cu bit, cu pachetul npm, pe 100 de cazuri.
  - Proveniența și ce urmează (gărzile, testul „paralele”, reparațiile Rust) sunt în `PROVENIENTA.md`.
- **`src/cam/profil.ts`:** profilul exterior, interior sau pe linie, cu treceri egale, fiecare ≤ pasul (invarianta 1).
  8 mm cu pasul 4 dau [4, 8].
- **Valori pe hârtie:**
  - cercurile R ± d au aceeași rază, din 2 arce, cu același centru;
  - dreptunghiul 100 × 60 + 3 are aria 6 000 + 960 + 9π, cu arcele R3 centrate în colțuri;
  - dreptunghiul − 3 dă 94 × 54, cu vârfurile exacte.

  În total, 50 de teste.
- **Regulile de import:**
  - mașina are capcana ei, deci lista „fără capcană” e goală;
  - ciclurile interne ale lui cavalier (6) sunt scoase din regula ciclurilor;
  - regula nouă `cavalier-doar-prin-fatada` are capcana ei;
  - rezultatul: 12 reguli, 12 capcane.
- **CI-ul:** imaginea e fixată la `ubuntu-24.04`, fiindcă `ubuntu-latest` trece pe Ubuntu 26 chiar pe 19.10.
- **Treceri:**
  - reparatorul automat a pus `!` în partea stângă a unor atribuiri; le-am mutat de mână;
  - două importuri doar pentru efect aveau încă `.js`;
  - ciclurile din cavalier au fost găsite de regula lor; nu le-am ascuns, au primit regula fațadei.

**Următorul pas:** felia 1.5, IR-ul pe N axe, montajul (4 colțuri) și postul GRBL v0.

## 2026-10-07 — Etapa 1, felia 1.5: IR-ul, montajul și postul GRBL v0 (Model: Claude Opus 5.5)

**Prompt:** „Continua si testez putin mai incolo” (continuare). **Started:** 15:28. **Completed:** 15:37.
**Clasa:** R2 (I11, I20). **Estimarea:** 1 felie. **Treceri:** 3.

**Făcut:**
- **`src/ir/ir.ts`**: programul de mișcări, în coordonatele documentului (T8), pe o listă de axe (T22). Axa A există
  în tipuri, dar postul o refuză explicit în v1.
- **`src/ir/montaj.ts`**: cele 4 colțuri de origine, ca translații, plus Z0 sus sau jos, într-o singură
  transformare aplicată doar de post.
- **`src/cam/traseu.ts`**: trecerile profilului devin IR, iar arcele rămân arce.
- **`src/post/`**:
  - contractul ca date: `GRBL_11`, cu sursa și starea fiecărui câmp, din s8 A.1;
  - formatorul: 3 zecimale, punctul mereu, fără „-0.000”;
  - postul unic, cu antetul care setează tot ce e modal, I/J din startul rotunjit (strategia B), arcele împărțite la
    180° și garda de coardă / unghi;
  - plafonul de 70 de octeți și exportul cu SHA-256.
- **Pe hârtie:**
  - cele 4 colțuri pe foaia 140 × 100: (20, 20) → (20, 20), (−120, 20), (−120, −80), (20, −80);
  - Z0 jos: Z-3 → Z15;
  - gaura Ø30 cu Ø6 dă arce cu raza 12; insula 100 × 60 + R3 dă marginile 17 … 123 × 17 … 83.
- **Defecte prinse de teste:**
  1. `toFixed` scrie numerele uriașe ca „1e+60”. Acum o valoare peste 10⁹ e refuzată, ca motiv, nu ca excepție.
  2. Garda de rază punea o singură coardă G1 în locul unui arc cu raza peste 10 m: abatere de ~8 mm pe un arc de 1 m.
     Acum ies segmente G1 pe cercul exact, cu săgeata ≤ 0,001 mm, numărate ca aproximare declarată (T2).
  3. G0 spre poziția curentă: nu se mai scrie.
- 65 de teste unitare.

**Următorul pas:** felia 1.6, oracolul G-code din s4, cu poarta invariantelor 1, 3, 5, 6, 7 și 8.

## 2026-10-07 — Etapa 1, felia 1.6: oracolul G-code și poarta invariantelor (Model: Claude Opus 5.5)

**Prompt:** „Continua si testez putin mai incolo” (continuare). **Started:** 15:37. **Completed:** 15:43.
**Clasa:** R2 (I11, I12 parțial). **Estimarea:** 1 felie. **Treceri:** 2.

**Făcut:**
- **`test/oracles/gcode.ts`** (zero importuri din `src/`, cu regula de import și capcana ei):
  - parserul propriu al textului;
  - propria copie a codurilor GRBL 1.1 (s8 A.1);
  - regula de arc GRBL rescrisă în float32, cu `error:33` și cercul fals.
- **`test/oracles/poarta.ts`**: poarta invariantelor din etapa 1, pe un câmp de înălțimi al materialului, ca oracolul
  din s4:
  - **1**: pasul;
  - **3**: rapidele prin material;
  - **5**: sub fața de jos și în afara foii;
  - **6**: codurile, 70 de octeți, punctul zecimal, arcul după rotunjire, fără G91 / G20 / R;
  - **7**: axul pornit și pauza de pornire, înaintea oricărei tăieri;
  - **8**: cutia tăieturilor în document, pe hârtie.
- **Otrăvurile:** câte una pentru fiecare invariantă, în programe scrise de mână. Toate pică pe invarianta lor, iar
  programul curat trece (`test/unit/oracol.test.ts`).
- **Lanțul întreg trece poarta:**
  - gaura Ø30 cu cutia 58 … 82 × 38 … 62;
  - insula cu cutia 17 … 123 × 17 … 83;
  - insula pe 4 colțuri × Z0 sus și jos.

  Programul de stânga-jos, judecat ca dreapta-sus, e prins de invarianta 8.
- **A doua trecere:** oracolul presupunea scula în (0, 0, 0) al mașinii la pornire. Cu Z0 jos, punctul acela e sub
  material, deci prima ridicare părea o rapidă prin el. Acum mișcarea cu startul necunoscut se judecă doar la capăt.
  Un control nou arată că un G0 care se termină în material e prins în continuare.
- 75 de teste.

**Următorul pas:** felia 1.7 (documentul v0) cere alegerea A / D. Fără ea merg cu ce nu depinde de arbore:
- instanța de test (canalul de previzualizare);
- fișa plăcii 1, cu programele A și B.

## 2026-10-07 — Etapa 1, felia 1.9a: fișa plăcii 1 și programele A / B (Model: Claude Opus 5.5)

**Prompt:** „Continua si testez putin mai incolo” (continuare). **Started:** 15:43. **Completed:** 15:46.
**Clasa:** R1. **Estimarea:** ½ felie. **Treceri:** 1.

**Făcut:**
- **`test/placi/placa-01/genereaza.ts`**: insula 100 × 60 (profil exterior, 3 mm) și gaura Ø30 în centrul ei (profil
  interior, 8 mm în două treceri de 4), pe MDF 18 cu freza Ø6.
  - Fișierul A are zero XY stânga-jos, fișierul B dreapta-sus. Insula stă la 20 mm de colțul de origine.
  - Fișierele de aur sunt `placa-01-A.nc` și `placa-01-B.nc`, câte 34 de linii, fiecare cu SHA-256.
- **`docs/etape/placa-01.md`**: fișa pentru owner.
  - ce îi trebuie: MDF de cel puțin 300 × 200 și freza Ø6;
  - cum fixează zero-ul și cum verifică hash-ul în PowerShell;
  - regimul;
  - cele 9 cote, cu toleranțele lor.
- **`test/unit/placa01.test.ts`**:
  - postul de acum produce exact octeții de aur;
  - fișa poartă hash-urile;
  - ambele fișiere trec poarta;
  - cotele de mașină sunt pe hârtie: (82, 50) la A și (−58, −50) la B.
- 79 de teste.

**Restul feliei 1.9:** hosting-ul pe instanța de test așteaptă exportul Firestore confirmat de owner. Până atunci se
folosește un canal de previzualizare.

## 2026-10-07 — Etapa 1, felia 1.7a: documentul v1, jurnalul și registrul de acțiuni, fără arbore (Model: Claude Opus 5.5)

**Prompt:** „Continua si testez putin mai incolo” (continuare). **Started:** 15:46. **Completed:** 15:51.
**Clasa:** R1–R2 (I3, I5, I6). **Estimarea:** 1 felie. **Treceri:** 2.

**Făcut:**
- **`shared/capabilitati.ts`**: catalogul unic, comun clientului și serverului: desen, cam, export-gcode,
  export-vectori, mașina.
- **`src/model/document.ts`**: schema v1 în valibot, cu foaia și elementele (dreptunghi și cerc parametrice, cu matrice).
  - Primul nivel e comun variantelor A și D. Arborele variantei alese vine ca migrare v1 → v2.
  - Plafoanele stau pe artefact, iar câmpurile necunoscute se păstrează.
- **`src/model/incarcare.ts`**: ușa unică de încărcare.
  - O versiune mai nouă e refuzată. Una mai veche trece prin migrările pure, cu „lipsește migrarea” dacă una lipsește.
  - Plus JSON canonic, cu cheile sortate și numerele nefinite refuzate.
- **`src/model/jurnal.ts`**: jurnalul de comenzi (adaugă / șterge / înlocuiește, cu valorile vechi și noi).
  Anularea și refacerea sunt pure, cu un plafon de 500.
- **`src/ui/actiuni.ts`** + **`actiuniDocument.ts`**: registrul de acțiuni.
  - Capabilitatea e obligatorie. `activa` dă adevărat sau cheia `t()` a motivului.
  - Acțiunile: adaugă dreptunghi / cerc, mută / șterge selecția, anulează / reface.
- **Regula nouă** `interfata-prin-actiuni`: `ui`, `canvas` și `admin` nu importă domeniul în afara registrului.
  Are capcana ei, deci sunt 13 reguli cu 13 capcane.
- **Testele:** 13 pentru model și jurnal, 6 pentru acțiuni. Fără capabilitate, acțiunea nu rulează și nu schimbă
  nimic. În total, 92 de teste.
- **Trecere:** `Omit` nu merge pe tipurile valibot cu semnătură de index, deci elementul nou are un tip explicit.

**Următorul pas:** felia 1.8, pânza v0. Persistența în IndexedDB și arborele vin după alegerea A / D.

## 2026-10-07 — Etapa 1, felia 1.8: pânza v0 (Model: Claude Opus 5.5)

**Prompt:** „Continua si testez putin mai incolo” (continuare). **Started:** 15:51. **Completed:** 16:02.
**Clasa:** R2 (I7 parțial). **Estimarea:** 1 felie. **Treceri:** 4.

**Făcut:**
- **`src/canvas/lucrator.ts`**: workerul de desen (T13).
  - desenează pe pânză software (`willReadFrequently`), în coordonatele documentului, cu Y în sus;
  - arcele sunt exacte (`arc()`), iar linia are un pixel fizic;
  - dintre cererile care vin una după alta, o desenează doar pe ultima;
  - predă imaginea ca ImageBitmap.
- **`src/canvas/Panza.tsx`**: pânza `bitmaprenderer`.
  - Potrivirea pe foaie se face la prima mărime reală.
  - Zoomul merge în jurul cursorului, între 0,01 și 1 000 px/mm. Pan-ul, cu butonul din mijloc sau cu Space + tragere.
  - Clicul și tragerea trimit gestul aplicației, care îl rulează prin registru.
- **`src/canvas/protocol.ts`**: protocolul pânzei, ca date. Pânza nu importă domeniul.
- **`src/geom/distanta.ts`**: distanța exactă la L / A și `inRegiune` evenodd cu arce exacte (ADR 0003).
  - raza ridicată cu ε ca să nu treacă prin vârfuri;
  - gaura orientată ca exteriorul rămâne gaură.
- **`src/app/desen.ts`**: documentul devine lista de desen. **`src/model/forme.ts`**: conturul elementului.
- **Acțiunea `selectie.la-punct`**: cel mai de sus element, pe contur în toleranță sau înăuntru.
- **Aplicația:** bara de acțiuni din registru (cu motivul ca titlu pe butoanele inactive), pânza, linia de stare cu
  selecția și scurtăturile Delete, Ctrl+Z și Ctrl+Y.
- **Oracolul pânzei** (`test/oracles/panza.ts`, din s6):
  - pe 720 de normale la cerc, centrul ponderat al liniei stă la ≤ 0,5 px de cercul de pe hârtie, fără goluri;
  - controalele pică: raza × 1,01 și centrul mutat cu 1 px.
- **E2e în Edge:** oracolul, clicul (cel de deasupra câștigă), tragerea cu poziția exactă în linia de stare, anularea și
  refacerea, pan-ul, limita de zoom și motivul pe butonul inactiv. 11 teste e2e, 98 unitare.
- **Treceri:**
  1. „ResizeObserver loop” ajungea în jurnalul de erori. Pânza a ieșit din layout (poziționare absolută), iar lucrul se
     face în cadrul următor.
  2. Grila de 5 rânduri lăsa pânza cu înălțimea 0 când lipsea avertismentul. Acum layout-ul e o coloană flex.
  3. Decupajul testului ieșea din pânză, iar negrul transparent părea cerneală. Acum decupajul e limitat și verificat.
  4. Un prag fix de cerneală e prea brutal pentru linia antialiasată. Acum se ia centrul ponderat pe normală, ca în s6.

**Următorul pas:** canalul de previzualizare pe instanța de test, ca owner-ul să poată încerca desenul.

## 2026-10-07 — Etapa 1, felia 1.9b: publicarea pe canalul de previzualizare (Model: Claude Opus 5.5)

**Prompt:** „Continua si testez putin mai incolo” (continuare). **Started:** 16:02. **Completed:** 16:08.
**Clasa:** R1 (I13 parțial). **Estimarea:** ½ felie. **Treceri:** 1.

**Făcut:**
- **`firebase.json`**, generat de `scripts/firebase-json.ts` din sursa unică `shared/csp.ts`:
  - CSP-ul merge și ca antet HTTP, cu `frame-ancestors 'none'`;
  - `no-cache` pe `/`, `/index.html` și `/config.json`, ca trei căi separate, fiindcă antetele se potrivesc pe calea
    cererii;
  - cache-ul imuabil e pe `/assets/**`.

  Un test cere ca fișierul din repo să fie exact cel generat.
- **`.firebaserc`** are doar aliasul `test`. Un `firebase deploy` fără `--project` n-are deci țintă implicită.
- **`scripts/publica-canal.ts`**: copiază `dist/` în `.tmp/publicare/` și pune `config.json` cu instanța „test”.
  Publică doar pe canal, cu `--project test`, iar build-ul nu se schimbă.
- **Canalul `etapa-01`**: <https://cncvectorstudio-test--etapa-01-bfzodaf1.web.app>, valabil până pe 06.11.2026.
  Verificat în browser:
  - apare „Instance: test”, deci configul e citit de la gazdă;
  - dreptunghiul și cercul se adaugă și se desenează;
  - selecția apare în linia de stare;
  - consola n-are erori.
- `CLAUDE.md`: starea etapei 1 și comanda de publicare pe canal.

**Rămân din etapa 1:** arborele variantei alese (după A / D) și hosting-ul pe adresa principală de test (după exportul
Firestore confirmat de owner).

## 2026-10-07 — Etapa 1, felia 1.9c: exportul G-code din aplicație (Model: Claude Opus 5.5)

**Prompt:** „Continua si testez putin mai incolo” (continuare). **Started:** 16:08. **Completed:** 16:12.
**Clasa:** R1–R2. **Estimarea:** ½ felie. **Treceri:** 3.

**Făcut:**
- **`src/cam/job.ts`**: lucrarea v0. Elementele documentului, fiecare cu profilul lui, devin un program în IR.
  - Interioarele se taie primele, apoi cele pe linie, la urmă exterioarele, ca piesa să nu se miște.
  - Implicitele sunt cele ale plăcii 1: cercul ca gaură pe interior, 8 mm în pași de 4; dreptunghiul ca insulă pe
    exterior, 3 mm.
  - Operațiile ca obiecte ale documentului vin cu arborele, după alegerea A / D.
- **Acțiunea `export.gcode`** (capabilitatea „export-gcode”). Calculul ei (cavalier, CAM, post) se încarcă la cerere:
  pachetul de pornire are 78,4 kB gzip, iar totalul 101 kB. Bugetul se măsoară acum pe ce cere `index.html`.
- **`src/ui/DialogExport.tsx`**: colțul de origine, Z0, freza și profilul fiecărui element. Descărcarea dă octeții
  exacți, cu SHA-256 afișat și un mesaj la plural corect: „34 de linii”.
- **Proba (unitar și e2e în Edge):**
  - exportul din aplicație, cu originea stânga-jos, dă exact liniile de G-code ale fișierului de aur `placa-01-A.nc`;
  - hash-ul afișat e al fișierului descărcat;
  - cu originea dreapta-sus pe foaia de 300 × 200, gaura pornește din X-218.000 Y-150.000, pe hârtie, iar programul
    trece poarta.
- **Ținta etapei 1 e atinsă în aplicație:** un dreptunghi și un cerc desenate ies într-un G-code, cu originea în oricare
  colț. Placa 1 o confirmă la mașină.
- **Treceri:**
  1. Bugetul ajunsese la 99,9 din 100 kB. Calculul exportului s-a mutat la cerere, nu s-a ridicat plafonul.
  2. Încărcarea la cerere a creat un ciclu de tipuri, prins de regula ciclurilor. Tipurile au acum modulul lor.
  3. Heredoc-ul a pierdut iarăși un `\` într-o expresie regulată. Am reparat cu Edit.
- 103 teste unitare, 13 e2e.

## 2026-10-07 — Etapa 1, felia 1.10: ieșirea din foaie (Model: Claude Opus 5.5)

**Prompt:** „am incercat sa fac testul tau” + notițele din prototipul planșelor (întocmai în
`docs/faza2/prototip-planse/notite-owner-2026-10-07.md`). **Started:** 21:59. **Completed:** 23:24.
**Clasa:** R2 (mișcă mașina: exportul). **Estimarea:** nespusă dinainte. **Treceri:** 3.

**Din notițe** (`BRIEF.md` §9, §16.3):
- A / D: spre D (scenariul 5 „da e clar”, scenariul 7 „ori D, ori legate în oglindă în A”); cuvântul explicit e încă
  deschis.
- Trei cerințe: selecția doar prin culoare (pânza o face deja); formele pot ieși din foaie, cu confirmare la export;
  avertismentele nu pe pânză, ci în bara de jos și, cu roșu, în lista de vectori (aceasta vine cu arborele).

**Făcut:**
- **`src/geom/cutie.ts`**: cutia exactă (arcul prin punctele de pe axe, cubica prin extremele ei) și depășirea față de
  foaie.
- **`src/model/avertismente.ts`**: o singură funcție de avertismente, care nu scrie nimic în document; bara de jos arată
  un rând („N forme ies din foaie”, cu lista în titlu).
- **`src/cam/iesire.ts`**: cât trece discul frezei de foaie cât taie, doar pe porțiunea de sub fața de sus (rampele și
  elicele se taie exact la Z 0), cu pragul de jumătate din rezoluția postului și amprenta traseului.
- **Exportul** (`actiuniExportCalcul.ts`, `DialogExport.tsx`): refuză până când omul bifează exact cererea arătată;
  confirmarea e legată de obiectul cererii și de amprentă; antetul primește `(CONFIRMAT: freza iese din foaie)` și
  `(iesire mm: st … dr … jos … sus …)`. Fără ieșire, octeții nu se schimbă (fișierele de aur rămân).
- **Sub dialog**, aplicația e `inert`, iar acțiunile de document trec printr-o singură ușă, oprită cât e dialogul deschis.
  Rezultatele întârziate ale exportului se aruncă.
- **Baleiajul arcelor** se calculează o dată, pe coordonatele documentului (`baleiajArc` în `src/ir/ir.ts`), pentru CAM
  și post.
- **Două gărzi găsite de reverificare, mai vechi decât felia:** adâncimea peste grosimea foii e refuzată (până la
  supracursa din etapa 2); peste 1 000 de treceri pe o formă e refuzat (pasul de 0,0002 mm dădea stiva depășită).
- **Oracolul** (sesiune independentă, commit-urile `018f218` și `75bddb9`): invarianta 5 cere declarația exactă,
  măsoară cu margini exacte, refuză declarația goală, incompletă, repetată sau târzie și orice rapidă sub fața de sus în
  afara foii. 46 de sabotaje, toate prinse.

**Proba:**
- grila de acord aplicație ↔ oracol (192 de cazuri, în ambele sensuri);
- e2e în Edge: confirmarea, Ctrl+Z și Delete sub dialog, Shift+Tab, Space dublu, rezultatul întârziat, al doilea export,
  rezumatul din bară;
- 23 de otrăvuri pe aplicație, toate prinse, cu controlul verde înainte;
- recenzia adversarială (4 lentile + 6 verificatori, ~1,45 M tokeni, 15 min): 17 constatări, reparate;
- reverificarea (1 agent, ~0,25 M): nicio ocolire a confirmării, 4 constatări mai mici, reparate.
- 147 de teste unitare, 17 e2e; pornirea are 80,2 kB gzip.

**Treceri:**
1. Implementarea; heredoc-ul a pierdut iarăși `\n`-uri în teste (reparat cu Edit).
2. Recenzia a găsit ocolirile confirmării: bifa boolean, documentul schimbat sub dialog, rezultatul întârziat. Le-a
   găsit și în oracol: arcele mici eșantionate doar la capete, rapidele în afara foii, declarația goală.
3. Reverificarea: Shift+Tab spre bară, Space dublu pe bifă, adâncimea peste foaie, pasul absurd.

**Rămâne deschis:** cuvântul A / D (plus cele trei alegeri din D); felia 1.7 după el; hosting-ul pe adresa principală
de test, după exportul Firestore confirmat; placa 1. Motivele exportului care vin din CAM sunt încă doar în română
(gol mai vechi, din 1.9c).

## 2026-10-08 — Etapa 1, felia 1.7: documentul v2, varianta D (Model: Claude Opus 5.5)

**Prompt:** „D, ok la toate” (răspunsul la alegerea A / D, cu cele trei alegeri din D și implicitele de la 1.10).
**Started:** 13:34. **Clasa:** R1–R2 (documentul; exportul îl citește). **Estimarea:** ~1 zi activă (2 felii de plan),
plus oracolul independent și recenzia adversarială.

**Ce intră:** ADR 0024 (decizia și contractul v2); schema v2 cu migrarea pură v1 → v2; elementele în lume (o singură
funcție, citită de pânză, CAM și avertismente); comenzile pe instanțe și piese (Ctrl+D = copie separată, ștergerea
ultimei instanțe ia și piesa); IndexedDB în tranzacție, cu un singur scriitor între file; lista de vectori, cu
avertismentele cu roșu (`BRIEF.md` §16.3).

**Completed:** 15:10. **Treceri:** 4.

**Făcut:**
- **ADR 0024:** decizia owner-ului (D, cu cele trei alegeri din prototip) și contractul documentului v2, cu 10 precizări
  scrise în aceeași felie, după întrebările oracolului și ale recenziei (adâncimea, compunerea, lumea mărginită, formele
  cu arce doar sub similitudini, ciocnirile din migrare, cheile `__proto__`, imbricarea JSON).
- **Modelul:** schema v2 (`document.ts`), schema v1 înghețată ca intrare a migrării (`schemaV1.ts`), ușa cu migrarea
  exactă (`incarcare.ts`), elementele în lume (`lume.ts`), jurnalul pe instanțe și piese, cu `lot`.
- **Acțiunile:** selecția ține instanțe; Ctrl+D = copie separată la +20 / −20; ștergerea ultimei instanțe ia piesa;
  Adaugă și Ctrl+D inactive peste plafoane; anularea curăță selecția.
- **Salvarea** (`proiectLocal.ts`): IndexedDB `cncvs2-proiecte`, versiunile `[proiect, rev]` (ultimele 20), scriitor unic
  cu Web Locks, revizia comparată la scriere (fără Web Locks, a doua filă trece în conflict, nu acoperă), fila care
  citește ținută la zi prin BroadcastChannel și promovată când scriitorul se închide; un proiect care nu se deschide nu se
  acoperă.
- **Lista de vectori** (`ListaVectori.tsx`), cu roșu pentru formele care ies din foaie; pe telefon, lista cedează prima.

**Proba:**
- oracolul independent (`test/oracles/document.ts`, scris doar din ADR): 371 de teste de legătură, verzi; 51 de sabotaje
  pe oracol, 50 prinse;
- recenzia adversarială: 15 constatări confirmate, reparate; 2 infirmate;
- 32 de otrăvuri pe aplicație (unitare și e2e), 31 prinse, cu controlul verde înainte și restaurarea verificată prin hash;
  cea scăpată (verificarea iterativă a arborelui) era redundantă după plafonul de imbricare și a fost scoasă;
- 530 de teste unitare, 26 e2e în Edge (salvarea la reîncărcare, a doua filă ținută la zi și promovată, conflictul fără
  Web Locks, proiectul care nu se deschide, migrarea unui v1 salvat, lista cu roșu, Ctrl+D, telefonul, tăierea la 20 de
  versiuni); pornirea are 88,2 kB gzip.

**Rămâne deschis:** hosting-ul pe adresa principală de test, după exportul Firestore confirmat; placa 1. Motivele
exportului care vin din CAM sunt încă doar în română (gol mai vechi, din 1.9c).

## 2026-10-08 — Etapa 2, felia 2.1: gărzile offsetului (Model: Claude Opus 5.5)

**Prompt:** „confirm deploy pe firebase test si poti sa continui”. **Started:** 16:08.
**Clasa:** R2 (offsetul e drumul sculei). **Estimarea:** ~½ zi activă, plus oracolul independent.

**Etapa 2 pornită** la cuvântul owner-ului, înaintea plăcii 1 (fișa: `docs/etape/etapa-02.md`). **Deploy-ul pe adresa
principală de test** așteaptă exportul Firestore: `gcloud` e instalat fără cont autentificat, iar backup-ul săptămânal
de pe test n-are bucket (`BACKUP_BUCKET not set`). Variantele i-au fost puse owner-ului.

**Completed:** 17:15. **Treceri:** 4.

**Făcut:**
- **Fișa etapei 2** (`docs/etape/etapa-02.md`): 10 felii, placa 2 și contractul gărzilor offsetului.
- **Gărzile** (`src/geom/offset.ts`): rezoluția de 0,01 mm; intrarea curățată fără să-și schimbe forma (arcele de peste
  180° împărțite pe același cerc, arcele plate devin linii, segmentele sub 1e-6 mm scoase, vârfurile în plus pe o latură
  dreaptă scoase); refuz cu motiv pentru conturul autointersectat (toleranța 1e-6), mai mic decât rezoluția sau cu
  cubice, și la d = 0; ieșirea verificată singură (`verificaIesire`): fiecare punct la |d| de intrare, pe partea cerută,
  fără atingeri, insulele trigonometric și găurile orar; a doua încercare la |d| + 1e-4 mm, apoi refuz.

**Proba:**
- oracolul independent (`test/oracles/offset.ts`, din contract): 83/83 pe aplicație, cu abaterea în ambele sensuri
  ≤ 0,002 mm; la primul contact a prins un offset greșit și tăcut (haltera);
- 19 otrăvuri pe fațadă, 18 prinse; cea scăpată e un mutant echivalent (coarda în loc de curbă, după împărțirea arcelor);
- 624 de teste unitare, 26 e2e; fișierele de aur ale plăcii 1 neschimbate.

**Rămâne deschis:** reparațiile lui cavalier (ADR 0005) și biarcele (felia 2.7) pentru cele 2 refuzuri din 213 pe
poligoane oarecare; exportul Firestore pe test (la owner) înaintea deploy-ului pe adresa principală.

## 2026-10-08 — Etapa 1, felia 1.9: hosting pe adresa principală de test (Model: Claude Opus 5.5)

**Prompt:** „gata” (exportul Firestore terminat de owner). **Started:** 18:20. **Completed:** 18:45.

- **Exportul Firestore** de pe `cncvectorstudio-test`: făcut de owner din consolă, în bucket-ul nou
  `cncvectorstudio-test-backup` (`us-central1`), dosarul `2026-10-08-inainte-de-cncvs2`. Primul export a fost refuzat:
  baza e în `nam5`, iar bucket-ul aplicației în `europe-central2`.
- **`public/sw.js`**, opritorul workerului aplicației vechi (înregistrat de ea la `/sw.js`, cu cache-urile `cncvs-`):
  se instalează imediat, șterge cache-urile vechi, se dezînregistrează, fără să reîncarce vreo filă. Servit `no-cache`.
- **`scripts/publica-test.ts`** (doar hosting, proiectul numit explicit), cu pregătirea comună cu canalul.
- **Publicat și verificat:** https://cncvectorstudio-test.firebaseapp.com/ servește aplicația nouă, instanța „test”,
  consola curată. Funcțiile aplicației vechi rulează încă pe test (deploy-ul a fost doar de hosting).

## 2026-10-08 — Etapa 2, felia 2.2: operațiile în document (Model: Claude Opus 5.5)

**Prompt:** „ok, continua”. **Started:** 19:01. **Clasa:** R2 (exportul citește operațiile). **Estimarea:** ~½–1 zi activă,
plus oracolul independent și recenzia.

**Ce intră:** ADR 0025 (documentul v3, cu migrarea v2 → v3); operațiile de profil în piesă; exportul le citește din
document; dialogul de export le arată și le scrie la Exportă, ca o singură comandă.

**Completed:** 22:45. **Treceri:** 6.

**Făcut:**
- **Documentul v3** (`src/model/document.ts`, ADR 0025): `Piesa.operatii` (profil: noduri, sculă, latură, adâncime, pas),
  cu plafoanele de 100 000 de operații și 100 000 de tăieturi; un singur adevăr pentru plafoane (`plafonDepasit`), folosit
  și de ușă, și de Adaugă / Ctrl+D.
- **Migrarea v2 → v3** (`src/model/incarcare.ts`): o operație pe element, în preordine, cu implicitele de până acum
  (cercul interior 8/4, dreptunghiul exterior 3/3, T1 Ø6); o piesă v2 cu un câmp `operatii` e refuzată cu motiv.
- **Tăieturile** (`taieturiFoaie`): latura, apoi instanța, operația, nodul. **Exportul** (`src/cam/job.ts`) le citește
  din document; o singură sculă pe program (număr + diametru), adâncimea cel mult grosimea foii.
- **Dialogul de export:** câte un rând pe operație; valorile se scriu în document la Exportă, ca o singură comandă;
  numere cu punct sau virgulă (`src/ui/numar.ts`), cu motivul spus când nu se poate exporta; frezele amestecate spuse pe
  față și aduse la una singură. Fila care citește urmează scriitorul (valorile operațiilor, nu montajul); o versiune pe
  care n-o poate deschide o trece în `necitita` (nu scrie, nu exportă, lasă blocarea).
- O formă nouă primește freza foii.

**Proba:**
- oracolul v3, scris de o sesiune independentă doar din ADR (`test/oracles/document*.ts`, `document.oracol.test.ts`):
  752 de teste de legătură verzi; 38 de sabotaje pe oracol, toate prinse (0,45 M tokeni, 70 min);
- recenzia adversarială: 4 lentile care reproduc în Edge + 17 verificatori, **3,0 M tokeni, 100 min** (anunțasem ~1,5 M
  și 15–25 min, sub propriul tabel de costuri: am greșit estimarea); 15 constatări confirmate, toate reparate;
- reverificarea remedierilor (1 agent, 0,30 M, 36 min): 7 / 7 reparate; 6 probleme noi mici, 5 reparate;
- otrăvuri: 51 pe instantaneu + 33 pe codul final, cu controlul verde înainte, în worktree în afara Drive-ului, arborele
  curat la final; toate prinse în afară de un mutant echivalent; 5 goluri închise cu teste noi;
- 1022 de teste unitare, 35 e2e în Edge; pornirea are 91,0 kB gzip; fișierele de aur ale plăcii 1 neschimbate.

**Rămâne deschis:** motivele refuzurilor din CAM (acum și „altă sculă”) sunt doar în română (gol mai vechi, din 1.9c);
schimbarea sculei (etapa 3); placa 1, la owner.

## 2026-10-09 — Etapa 2, felia 2.3a: regiunea păstrată și invarianta 2 (Model: Claude Opus 5.5)

**Prompt:** capturile testului owner-ului pe adresa de test și fișierul descărcat (`cncvs2-stanga-jos (1).nc`), după
„dacă nu spui altfel, continui cu 2.3”. **Started:** 07:36. **Clasa:** R2. **Estimarea:** ~½ zi activă, plus oracolul
independent (~0,6 M tokeni, 60–90 min).

**Verificat întâi:** fișierul owner-ului trece poarta oracolului, cu cadrul pe hârtie (gaura R15 → traseul R12 în jurul
(161,238; 55,007); exteriorul 17…123 × 17…83; patru treceri de 2 mm la pasul „2,5”).

**Felia 2.3 împărțită** (ca 1.7a, 1.9a–c): 2.3a regiunea păstrată; 2.3b sensul de tăiere, după răspunsul owner-ului
(implicitul urcare / opoziție; placa 1 regenerată sau nu); 2.3c profilul pe contururi deschise.

**Ce intră în 2.3a:** ADR 0026 (inelele din laturile declarate, includerea, K, partea proprie, invarianta 2 cu
ε = 0,005 mm); `src/cam/regiune.ts`; distanța exactă segment–segment în `src/geom/distanta.ts`; exportul refuză cu
motivul `regiunea păstrată:`; oracolul independent cu invarianta 2 în poartă.

**Completed:** 09:15. **Treceri:** 4.

**Făcut:**
- **ADR 0026** (contractul): inelele din laturile declarate, includerea, K, partea proprie, invarianta 2 cu ε = 0,005 mm
  pe traseul exact și cu rotunjirea postului (0,002 mm) pe G-code; pragul nu coboară sub 1e-6.
- `src/geom/apropiere.ts`: distanța exactă segment–segment (linie și arc) și contur–contur, cu punctele care o dau;
  separat de `distanta.ts`, ca să nu intre în pachetul de pornire (91,0 kB).
- `src/cam/regiune.ts` + `job.ts`: exportul refuză, cu motivul `regiunea păstrată:` și locul, tăietura care intră într-o
  piesă, inelele care se ating și elementul cu ambele laturi.
- Fila care citește citește o dată ultima versiune la abonare (`proiectLocal.ts`): o versiune salvată între deschidere și
  abonare se pierdea (test instabil, o dată din zece, găsit în controlul otrăvurilor).

**Proba:**
- oracolul independent (`test/oracles/regiune*.ts`, invarianta 2 în `poarta.ts`): acord în ambele sensuri pe 346 de
  documente; 44 de sabotaje pe oracol, prinse (0,49 M tokeni, 67 min, cu repararea falsului pozitiv al porții la arcele
  de 180,002°);
- recenzia adversarială: o lentilă + 3 verificatori, 0,62 M tokeni, 29 min (anunțat ~1,1 M); 3 constatări mici,
  reparate;
- 25 de otrăvuri în worktree în afara Drive-ului: 22 prinse, 3 echivalente; controlul a prins întâi testul instabil;
- 1068 de teste unitare, 36 e2e; fișierul owner-ului din 09.10 trece poarta, cu cadrul pe hârtie.

**Rămâne deschis:** `pe-linie` nu se judecă (ADR 0026); poarta crede etichetele (nu verifică că mișcările urmează
conturul etichetat); coardele cu care GRBL face arcele ($12 = 0,002 mm) nu sunt în buget (cel mult ~0,009 mm spre
piesă, pe colțurile exterioare); 2.3b așteaptă implicitul sensului de tăiere și decizia pe placa 1.

## 2026-10-09 — Etapa 2, felia 2.3b: sensul de tăiere (Model: Claude Opus 5.5)

**Prompt:** „ok” (la recomandările: urcare implicit, pe operație; placa 1 regenerată). **Started:** 19:05. **Clasa:** R2
(sensul mișcă mașina). **Estimarea:** ~½ zi activă, plus oracolul independent (~0,6 M tokeni, 60–90 min: documentul v4
și invarianta 9).

**Ce intră:** ADR 0027 (urcare = materialul păstrat în stânga, cu M3; documentul v4 cu `Operatie.sens`, migrarea
v3 → v4 cu `urcare`); profilul inversează buclele după latură și sens; dialogul arată sensul pe rând; placa 1
regenerată (gaura în G2); numerele cu virgulă în română (din 2.2, amânat aici).

**Completed:** 21:15. **Treceri:** 4.

**Făcut:**
- ADR 0027 + documentul v4: `Operatie.sens` (`urcare` / `opozitie`), migrarea v3 → v4 cu `urcare`, ciocnirea refuzată.
- `src/cam/profil.ts`: buclele se inversează după latură și sens; pe-linie neschimbat; pornirea rămâne vârful 0.
- Dialogul de export: coloana Sens (oprită pe linie și în fila care citește); numerele cu virgulă în română.
- Placa 1 regenerată: gaura în G3 (neschimbată față de 1.9), insula în G2; fișa are hash-urile noi.

**Greșeala, prinsă înainte de publicare:** prima versiune a ADR 0027 spunea „urcare = materialul păstrat în stânga”, luată
din notițele ediției întâi și din raționamentul meu, neverificate pe cinematica așchiei. Aplicația, testele și placa
regenerată o urmau, deci totul era verde, iar „urcare” tăia în opoziție. Recenzia a dovedit-o (simulare de așchie, regula
G41 + M3); am oprit și oracolul, care construia invarianta 9 pe tabelul greșit. Reparat în contract, cod, texte, teste și
placă, cu un test fizic care pică pe tabelul vechi. Nimic nu fusese împins sau publicat.

**Proba:**
- recenzia adversarială: o lentilă + 2 verificatori, 0,48 M tokeni, 22 min; 1 constatare critică (tabelul), reparată;
  1 infirmată (zecimalele cu punct din descrierea formelor, mai veche decât felia);
- oracolul independent: documentul v4 și invarianta 9 (aria cu semn a fiecărei bucle, partea păstrată derivată dintr-un
  model al așchiei); 370 de cazuri de lipire, fără încălcări; 40 de sabotaje, prinse; 0,62 M tokeni, 116 min (estimat
  60–90);
- 16 otrăvuri, 16 prinse, în worktree în afara Drive-ului; e2e-ul exportului judecă acum și invariantele 2 și 9;
- 1434 de teste unitare, 37 e2e; pornirea are 91,5 kB gzip.

**Rămâne deschis:** eticheta din G-code nu poartă sensul sau id-ul operației (două operații pe același element și aceeași
adâncime se leagă după ordine; de pus în etichetă înainte de degroșare / finisare); bucla deschisă e încălcare a
invariantei 9 (de precizat în contract la urechi și intrări, 2.4–2.5); axul M4 vine cu profilul mașinii; zecimalele din
descrierea formelor sunt încă cu punct în română.

## 2026-10-09 — Etapa 2, felia 2.4: urechile (Model: Claude Opus 5.5)

**Prompt:** „continua”. **Started:** 21:57. **Clasa:** R2 (urechile mișcă mașina). **Estimarea:** ~½ zi activă, plus
oracolul independent (~0,8 M tokeni, 90–120 min: documentul v5, invarianta 9 amendată, invarianta 10 și oracolul pe
hârtie). 2.3c (contururile deschise) trece lângă 2.7: n-are încă de unde primi un contur deschis.

**Ce intră:** ADR 0028 (documentul v5 cu `Operatie.urechi`, migrarea v4 → v5 cu `null`); profilul Z(s) portat din
ediția întâi, cu refuz în loc de palierul strâns; emitentul ca modificator peste trecerea din IR (liniile și arcele
tăiate exact, flancul pe arc ca elice); vârful urechii de la fața de jos a foii; coloana Urechi în dialogul de export.

**Pauză:** 10.10 00:05, la cererea owner-ului („o să facem pauză când se poate”). Gata și comis: contractul (ADR 0028, cu
precizarea de după recenzie), aplicația, recenzia (6 constatări, toate reparate), oracolul independent, e2e-ul prin poartă;
1861 de teste unitare și 39 e2e, verzi. Otrăvurile: 20 din 37 rulate, 19 prinse; cea scăpată (avansul pe flanc socotit cu
lungimea în plan) e acum prinsă de testul strâns. Rămân: otrăvurile 21–37 și reluarea celei scăpate, documentele feliei,
push pe `main`, publicarea pe test. Ramura `wip/2.4-urechi` ține tot, împinsă.

**Reluat:** 10.10 08:30, la „continua”: otrăvurile rămase, documentele, push, publicarea.

**Completed:** 10.10 09:20. **Treceri:** 5.

**Făcut:**
- ADR 0028 + documentul v5: `Operatie.urechi` (`null` sau `{ numar, latime, grosime }`), migrarea v4 → v5 cu `null`, ciocnirea
  refuzată. Programul unui document fără urechi e același, octet cu octet (placa 1 neschimbată).
- `src/cam/urechi.ts`: profilul ediției întâi (palierul W, flancul min(W/2; 0,45·(S − W)), centrele la (k + ½)·S), cu refuz
  la W > 0,9·S; segmentele tăiate exact în rupturi, flancul pe arc ca elice, bucățile sub 1e-6 mm ca linii; flancul care
  coboară, cu viteza pe verticală plafonată la avansul de plonjare.
- Lucrarea: vârful urechii = grosimea foii − grosimea punții; refuzurile (puntea cât foaia, tăietura care nu ajunge la
  vârf, urechea mai scurtă decât freza); supracursa ca parametru al exportului (0–2 mm, implicit 0, fără interfață).
- Dialogul: coloana Urechi, cu câmpurile pe rândul de sub operație; motivul spune ce e greșit; câmpul greșit e roșu; cutia
  încape pe telefon. Exportă îmbină urechile (câmpurile necunoscute rămân), iar comparația operațiilor e canonică.

**Greșeala contractului, prinsă înainte de publicare:** ADR-ul spunea „puntea are grosimea g”, adevărat doar pe peretele
piesei. Pe axa tăieturii, un punct e tăiat de toate pozițiile frezei aflate la cel mult R de el, deci puntea ține g doar
pe W − D; cu W ≤ D/2 nu există deloc. Recenzia a măsurat-o pe un câmp de înălțimi (Ø6 cu W = 3: piesa liberă pe ultima
trecere). Acum W < D e refuzată, iar W rămâne măsurată pe traseu, ca placa 2 să se măsoare pe perete.

**Proba:**
- recenzia adversarială: 2 lentile + 5 verificatori, 1,16 M tokeni, 25 min (estimat ~1,2 M, 60–90 min); 6 constatări, toate
  confirmate și reparate (1 mare, 4 medii, 1 mică);
- oracolul independent: documentul v5, invarianta 9 amendată, invarianta 10, oracolul pe hârtie; 36 de sabotaje prinse,
  5 martori negativi; 0,67 M tokeni, 74 min (estimat ~0,8 M, 90–120 min). Nota de proces: sesiunea a citit o dată, cu
  `git show`, diff-ul lui `src/cam/urechi.ts`, după ce oracolul era scris și rulat; nimic n-a fost schimbat după;
- poarta: invarianta 1 măsoară scoaterea în R − 0,004 (fals pozitiv la marginea benzii, cu I/J rotunjite diferit pe
  treceri), cu regresia ei (o depășire reală de 2,61 mm e prinsă);
- 37 din 37 otrăvuri prinse, în worktree în afara Drive-ului, în două tranșe (pauza a tăiat rularea după 20).
  A 11-a (avansul pe flanc socotit cu lungimea în plan) scăpase întâi: testul cerea doar „cel mult avansul de plonjare”;
  acum cere plafonul exact, iar la reluare e prinsă;
- 1861 de teste unitare, 39 e2e; e2e-ul exportului cu urechi trece prin poartă (1, 2, 9, 10 și viteza pe verticală).

**Rămâne deschis:**
- palierul măsurat pe traseul centrului: pe un arc exterior, ciotul de pe perete e mai scurt (R10 cu Ø6: 8 → 6,15 mm);
  pozițiile sunt automate; așezarea de mână vine cu panoul de proprietăți;
- o punte aproape cât foaia (g în 0,0005 de grosime) dă palierul la `Z0.000`: poarta îl pică zgomotos; de refuzat în contract;
- oracolul nu verifică, pe corpusul aleator, că bucățile de arc rămân pe cercul lor (doar cazurile pe hârtie);
- rampa și intrările (2.5) se compun cu urechile prin Z-ul cel mai puțin adânc; supracursa intră în interfață cu profilul
  mașinii; restul de la 2.3b (eticheta fără sens, M4, zecimalele cu punct în descrierea formelor).
