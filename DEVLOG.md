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

## 2026-10-10 — Etapa 2, felia 2.5a: rampa (Model: Claude Opus 5.5)

**Prompt:** „continua” (10.10 08:30), apoi „Planul neschimbat” (la întrebarea despre uneltele de desen). **Started:**
10:30. **Clasa:** R2 (rampa mișcă mașina). **Estimarea:** ~½ zi activă, plus oracolul independent (~0,8 M tokeni, 75–120
min: documentul v6, invarianta 9 amendată, 10 amendată, 11 nouă, oracolul pe hârtie al rampei).

**Felia 2.5 împărțită** (ca 2.3): 2.5a rampa, 2.5b intrările și ieșirile. Rampa e un modificator Z(s), ca urechile, și se
compune cu ele; intrările se aleg apoi față de regiunea păstrată, pe bucla cu rampă.

**Ce intră:** ADR 0029 (documentul v6 cu `Operatie.rampa`, migrarea v5 → v6 cu `null`); bucla cu rampă tăiată continuu
(rampa pe Lr = min(lungime; P/2), tura plină care o re-acoperă, intrarea rotită și scoasă din zonele urechilor, fără
ridicare între treceri); coloana Rampă în dialog.

**Completed:** 10.10 14:35. **Treceri:** 5.

**Făcut:**
- ADR 0029 + documentul v6: `Operatie.rampa` (`null` sau `{ lungime }`), migrarea v5 → v6 cu `null`, ciocnirea refuzată.
  Programul unui document fără rampă e același, octet cu octet (o excepție scrisă în ADR: pe linie, cu urechi, o buclă
  care pornește cu un segment de lungime zero).
- `src/cam/parcurgere.ts`: parcurgerea generală a buclei, desfășurată (pornește și se oprește oriunde, trece peste vârful
  0); urechile o folosesc neschimbat: 396 de programe identice octet cu octet, cu și fără urechi.
- `src/cam/rampa.ts`: intrările e₁ = 0, e_(k+1) = scoate(e_k + Lr); rampa Z = max(zR, zP), cu frântura unde se întâlnesc;
  tura până la intrarea următoare; rampa minimă 1 mm (`src/cam/rampaMinima.ts`, ca dialogul s-o citească fără CAM).
- Dialogul: coloana Rampă, lungimea pe rândul de detalii comun cu urechile; motivul cu marginile (1 – 10 000 mm).

**Greșeala contractului, prinsă înainte de publicare:** ADR-ul nu dădea rampei o lungime minimă. La o rampă ≤ 1e-6 mm,
capătul ei se pierdea la emitere, coborârea se întindea pe tot primul segment, iar tura finală nu-l mai tăia la adâncime:
pe o tăietură prin foaie rămânea o pană de până la 4 mm, fără motiv. Sub rezoluția postului, rampa ieșea plonjare
verticală. Acum: minimul de 1 mm, refuzurile, toleranța declarată a invariantei 11.

**Proba:**
- recenzia: prima rulare (2 lentile) a murit la limita săptămânală, după 0,34 M; a doua, doar lentila CAM (modelul și
  dialogul copiau tiparul urechilor, recenzat ieri; le-am verificat eu, în browser) + 2 verificatori, 0,60 M, 35 min; 2
  constatări (1 medie, 1 mică), reale, reparate;
- oracolul independent, reluat cu `SendMessage` după limită: 0,65 M; documentul v6, invariantele 9, 10 amendate și 11,
  oracolul pe hârtie; 31 de sabotaje prinse; a găsit că testele de legătură ale urechilor erau sărite pe tăcute din
  momentul trecerii la v6 (condiționate de schema 5), și le-a repornit;
- 30 din 31 otrăvuri prinse, în worktree în afara Drive-ului. Cea rămasă e echivalentă, dovedit: fără
  deduplicarea nodurilor la capătul turei, IR-ul iese identic pe 720 de bucle (dublurile cad pe vârful 0, iar parcurgerea
  le lipește de el); deduplicarea rămâne ca apărare;
- 2386 de teste unitare (0 sărite), 40 e2e; e2e-ul exportului cu rampă trece prin poartă (1, 2, 9, 10, 11 și viteza pe
  verticală).

**Rămâne deschis:**
- banda de toleranță a oracolului crește cu unghiul arcelor din tot lanțul (~0,55 mm la 18 treceri pe colțuri rotunjite);
  oracolul pe hârtie e mai strâns (~0,08 mm), dar doar pe 8 cazuri de 3 treceri;
- împărțirea pe treceri nu e fixată de contract (oricare cu pasul ≤ cel cerut trece);
- avansul orizontal pe rampă și al coborârii prin aer nu sunt verificate;
- rampa e oprită implicit (placa 1 neschimbată): pornirea ei din fabrică, ca în ediția întâi, e decizia owner-ului;
- intrările și ieșirile (2.5b) aduc freza la e_k din afara piesei.

## 2026-10-10 — Etapa 2, felia 2.5b: intrările și ieșirile (Model: Claude Opus 5.5)

**Prompt:** „Continua”. **Started:** 15:27. **Clasa:** R2 (intrările mișcă mașina). **Estimarea:** ~½ zi activă, plus
oracolul independent (~0,7 M tokeni) și recenzia (o lentilă CAM, ~0,6 M).

**Scopul tăiat:** intrările fără rampă. Rampa taie bucla fără ridicare între treceri, deci compunerea cere un contract al
ei: felia 2.5c. Până atunci, exportul refuză cu motiv o operație cu amândouă. Placa 2 cere urechile și urma de intrare, nu
rampa.

**Ce intră:** ADR 0030 (documentul v7 cu `Operatie.intrari`, migrarea v6 → v7 cu `null`); semicercul intrării pe partea
deșeului, ales din candidați (vârful 0, mijloacele celor mai lungi 12 segmente; raza, apoi jumătate) și verificat exact
pe regiunea păstrată; bucla pornită din p₀ (urechile se mută cu ea); plonjarea în deșeu; avertismentul la export când
intrarea nu încape; coloana Intrări în dialog.

**Completed:** 10.10 19:10. **Treceri:** 5.

**Făcut:**
- ADR 0030 + documentul v7: `Operatie.intrari` (`null` sau `{ raza }`), migrarea v6 → v7 cu `null`, ciocnirea refuzată.
  Programul unui document fără intrări e același, octet cu octet (396 de programe identice).
- `src/cam/intrari.ts`: partea deșeului din regula sensului (opusă piesei), cercul C = p₀ + ρn, A = p₀ + ρ(n − t),
  B = p₀ + ρ(n + t); candidații și razele; `src/cam/parcurgere.ts`: punctul și tangenta la s, bucla pornită din s (linia
  în linii, arcul în arce pe același cerc).
- Lucrarea: alegerea pe fiecare buclă cu trei condiții (regiunea păstrată, foaia, urechile altor bucle); refuzurile (pe
  linie, cu rampă, raza sub 0,5 mm); avertismentul intrării omise, purtat până în dialog.
- Dialogul: coloana Intrări, raza 3 mm la bifă, oprită pe linie; avertismentele sub rezultat; câmpurile de număr din
  tabel mai înguste (cu opt coloane, coloana Intrări ieșea tăiată pe desktop).

**Golurile contractului, prinse înainte de publicare:** ADR-ul judeca intrarea doar față de regiunea păstrată.
- La o piesă aproape de marginea foii, intrarea din vârful 0 ieșea din foaie, iar exportul cerea confirmarea, deși un
  alt candidat stătea în foaie.
- Intrarea unei piese putea tăia legătura urechii unei vecine, fără niciun cuvânt.

Acum un semicerc încape doar dacă nu iese din foaie mai mult decât bucla și stă la cel puțin D + 1 mm de orice altă buclă
cu urechi.

**Proba:**
- recenzia: o lentilă CAM (dialogul repetă tiparul recenzat; l-am verificat eu în browser, ro și en) + 3 verificatori,
  0,74 M tokeni, 57 min; 2 constatări medii, reale, reparate; 1 infirmată (ieșirea în miezul eliberat: e deșeu, iar fără
  ieșire freza ar urca pe peretele piesei), trecută la limite; 2 mici triate de mână și reparate;
- oracolul independent (0,69 M, 96 min): documentul v7, invariantele 9, 10, 11 amendate, 12 nouă, oracolul pe hârtie;
  36 de sabotaje prinse, 18 martori negativi; a închis o condiție pe schemă care sărea pe tăcute testele rampei. Nota
  de proces: a văzut prin grep o linie din `src` (`VERSIUNE_SCHEMA = 7`) și una din testul aplicației; valorile pe
  hârtie le-a calculat singură;
- 38 din 39 otrăvuri prinse; cea scăpată (dialogul care nu citește intrările din document) e acum prinsă: e2e-ul intrărilor redeschide dialogul, verificat cu otrava aplicată.

**Rămâne deschis:**
- intrările cu rampă (2.5c);
- textele CAM (refuzuri, avertismente) sunt doar în română, și în interfața engleză;
- intrarea e doar un sfert de cerc; alegerea de mână vine cu panoul de proprietăți;
- cu ρ > D, ieșirea ultimei treceri poate împinge un miez liber (limită scrisă în ADR).

## 2026-10-10 — Etapa 2, felia 2.5c: intrările cu rampă (Model: Claude Opus 5.5)

**Prompt:** „Ok”. **Started:** 19:53. **Clasa:** R2 (mișcă mașina). **Estimarea:** ~½ zi activă, plus oracolul
independent (~0,7 M tokeni) și recenzia (o lentilă CAM, ~0,7 M).

**„Ok” la raportul feliei 2.5b:** rampa rămâne oprită implicit pe formele noi până la placa 1 (recomandarea), iar felia
2.5c pornește.

**Forma, schimbată față de fișă:** fișa cerea compunerea „cu bucla tăiată continuu”. Nu se poate fără a încălca
invarianta 1: intrarea și ieșirea taie în deșeu, în material proaspăt, deci ieșirea trebuie coborâtă cu un pas la fiecare
trecere. Freza trece prin deșeu la fiecare trecere, iar singurul drum tangent înapoi pe buclă, fără ridicare, e cercul
întreg al intrării. ADR 0031: pe o buclă cu intrare, rampa coboară pe sfertul intrării, de la fața de sus, la fiecare
trecere (ca în ediția întâi); buclele fără intrare păstrează rampa din ADR 0029.

**Ce intră:** ADR 0031 (documentul rămâne v7); refuzul combinației scos; razele sub rampă doar cu sfertul de cel puțin
1 mm; elicea intrării cu avansul plafonat; nota din dialog; programele fără combinație, aceleași octet cu octet.

**Completed:** 11.10 01:10. **Treceri:** 6.

**Făcut:**
- ADR 0031 (documentul rămâne v7): pe o buclă cu intrare, rampa coboară pe sfertul intrării, de la fața de sus, la fiecare
  trecere; între treceri freza se ridică. Invarianta 1 pe hârtie: intrarea trecerii k e același arc ca la k−1, cu cel mult
  (d_k − d_{k−1})·t mai jos.
- `src/cam/traseu.ts`: bucla la o trecere scrisă o dată (`taieBucla`, folosită și fără rampă: aceleași programe); ramura
  rampei cu intrare. `src/cam/intrari.ts`: razele sub rampă (pragul 2/π mm, `intrariMinima.ts`), elicea cu avansul
  plafonat (`avansCoborare`, scos din parcurgere). Refuzul rampei sub 1 mm și când toate buclele au intrare.
- Dialogul: nota rampei pe intrare, raza minimă sub rampă cu motivul ei.

**Gaura găsită de recenzie, moștenită din 2.5b:** condiția c (ADR 0030 §3) judeca doar urechile altor bucle. Pe bucla
însăși, ieșirea la −d_k (și intrarea plată, fără rampă) putea tăia puntea unei urechi: pe o gaură R8 cu 2 urechi, intrările
fără rampă nu lăsau nicio punte întreagă, iar poarta nu vedea (invarianta 10 judecă doar Z-ul traseului). Acum semicercul
stă la cel puțin D de coloana fiecărei urechi proprii (`bucataBuclei`: bucata exactă de traseu, de la candidatul p₀).

**Proba:**
- recenzia: o lentilă CAM + 1 verificator, 0,47 M tokeni, 41 min; o constatare reală (de mai sus), reparată; una mică
  (dialogul primea raza sub pragul rampei), reparată. Curat: 5400 de programe identice octet cu octet față de 6c4d131,
  invarianta 1 pe câmpul de înălțimi, avansul elicei după rotunjirea postului, elicea în același XY cu semicercul verificat;
- oracolul independent (0,63 M, 126 min): invariantele 9, 11, 12 amendate (și 10 pe trecerile cu intrare), oracolul pe
  hârtie al rampei pe intrare, punțile urechilor pe câmpul de înălțimi, octeții fără combinație față de 6c4d131, 19 martori
  negativi, 34 de sabotaje (33 prinse; cel scăpat nu se poate declanșa structural);
- 27 din 30 otrăvuri prinse; cele 3 scăpate: două închise cu teste noi (coloana ultimei urechi pe o buclă nesimetrică față de p₀; bucata buclei care se termină în mijlocul unui arc), una echivalentă (lipirea capătului bucății, scoasă din cod).

**CI:** pe un singur job, testele unitare ajunseseră la 452 s din cele 600 permise (felia 2.5b, față de „≤ 5 min” din
`PLAN.md` §4.4), iar oracolul acestei felii le-ar fi dus peste. Acum nivelul rapid le rulează în 3 felii paralele
(`--test-shard`, care trebuie să stea înaintea fișierelor: după ele, Node îl ignoră pe tăcute). Fișierul nou al oracolului,
510 s singur, e împărțit mecanic în trei (253 s în paralel). Nivelul complet (nefeliat) are acum 30 de minute.

**Rămâne deschis:**
- panta rampei pe intrare se dă prin rază (la pasul 3 și ρ = 3, ~32°), nu prin lungimea rampei;
- pe buclele cu intrare, freza se ridică între treceri (~1 s în aer pe trecere);
- textele CAM (refuzuri, avertismente) sunt doar în română, și în interfața engleză;
- pe găurile mici, flancurile urechilor mușcă ~0,1 mm din tubul punții pe partea concavă și fără intrări (oracolul judecă
  puntea garantată; de reluat cu placa 2);
- decizia rampei implicite e luată: oprită până la placa 1.

## 2026-10-11 — Etapa 2, felia 2.6: degajările (dog-bone, T-bone) (Model: Claude Opus 5.5)

**Prompt:** „continua”. **Started:** 08:59. **Clasa:** R2 (mișcă mașina; fișa o socotea R1, dar compunerea cu urechile,
rampa și intrările și invarianta 2 amendată o fac R2). **Estimarea:** ~½ zi activă, plus oracolul independent (~0,7 M
tokeni) și recenzia (o lentilă CAM, ~0,6 M).

**Ce intră:** ADR 0032 (documentul v8 cu `Operatie.colturi`, migrarea v7 → v8 cu `null`). Degajarea minimă: pe fiecare
colț concav pentru materialul păstrat, între două linii, un drum Q → E → Q, cu cercul frezei prin colțul V (dog-bone pe
bisectoare, T-bone în peretele mai lung), la fiecare sosire în Q. Condițiile: departe de buclele vecine, departe de
urechile buclei. Altfel, avertisment. Coloana Colțuri în dialog. Ediția întâi punea un cerc separat cu centrul la r
dincolo de colț: nu atingea restul lăsat de freză.

**Completed:** 11.10 13:52. **Treceri:** 6.

**Făcut:**
- ADR 0032 + documentul v8: `Operatie.colturi` (`null` sau `{ tip }`), migrarea v7 → v8 cu `null`, ciocnirea refuzată.
  Programul unui document fără degajări e același, octet cu octet (1728 de cazuri; oracolul: corpusul, cazurile, placa 1).
- `src/cam/degajari.ts`: colțurile de degajat pe conturul elementului, curățat ca la offset și parcurs în sensul de mers
  (concave pentru K, între două linii, cu restul de cel puțin 0,01 mm); Q, E pentru dog-bone și T-bone (peretele mai lung,
  la egalitate cel de după V); drumul la fiecare sosire în Q, în `parcurge` (urechi, rampă) și pe bucla simplă.
- Lucrarea: profilele o dată; candidatele judecate față de traseele celorlalte bucle și între ele; urechile buclei tăiate
  (ajutorul `departeDeUrechi`, folosit și de intrări); marginea foii; avertismentele; arcele sub raza frezei.
- Dialogul: coloana Colțuri („—”, dog-bone, T-bone), oprită pe linie și în fila care citește.

**Gaura găsită de recenzie:** condiția a judeca drumul doar față de traseele celorlalte bucle. Două găuri cu T-bone și un
perete de 4–6 mm între ele: fiecare crestătură trecea singură, dar se întâlneau, tăiau peretele de tot și desprindeau o
bucată din piesă, fără niciun avertisment. Acum candidatele se judecă și între ele; două în conflict se omit amândouă.

**Proba:**
- recenzia: o lentilă CAM + 2 verificatori, 0,66 M tokeni, 38 min; o constatare reală (de mai sus), reparată; una medie
  coborâtă la mică (degajarea pe flancul unei urechi rămâne la Z-ul flancului: precizată în ADR); patru mici reparate
  (marginea foii, arcele sub raza frezei și conturul curățat, textul avertismentului, timpul pătratic);
- oracolul independent (0,81 M, 96 min): documentul v8, invariantele 2, 9–12 amendate, 13 nouă, oracolul pe hârtie cu
  câmpul de înălțimi (colțul tăiat, cât intră în pereți), cazurile D01–D26, 110 documente, 15 martori, 37 de sabotaje (35
  prinse, 2 echivalente);
- 35 din 36 otrăvuri prinse; cea scăpată e echivalentă (candidatele pe linie: o tăietură pe linie cu degajări e refuzată oricum de lucrare).

**CI:** nivelul rapid în 4 felii (suma testelor a trecut de la 1453 la 1675 s local).

**Rămâne deschis:**
- colțurile cu arce (degajarea pe arce) și degajările aceleiași bucle judecate între ele vin cu importul SVG (2.7);
- pachetul de pornire are 94,9 kB din plafonul de 100 kB;
- toleranța invariantelor 10 și 11 pe rampele cu coordonate neîntregi (Ø3,175) e cu 0,002 mm prea strânsă în oracol
  (găsită de oracol, de dinainte de felie; raportată, nu picată);
- un index spațial pentru condiția a, la foile mari (etapa 12);
- textele CAM (refuzuri, avertismente) sunt doar în română, și în interfața engleză.

## 2026-10-11 — Etapa 2, felia 2.7a: biarcele (Model: Claude Opus 5.5)

**Prompt:** „continua”. **Started:** 15:08. **Clasa:** R2 (singura aproximare de pe drumul spre mașină, ADR 0006).
**Estimarea:** ~½ zi activă, plus oracolul independent (~0,6 M tokeni) și recenzia (~0,5 M).

**Felia 2.7 împărțită** (fișa o socotea o felie; cere biarcele, o formă nouă în document, cititorul SVG, PathKit și
contururile deschise): 2.7a biarcele, 2.7b forma „cale” (documentul v9) cu CAM-ul prin biarce, 2.7c ușa SVG și importul,
2.7d normalizarea `nonzero` cu PathKit; 2.3c (contururile deschise) după ele.

**Ce intră:** ADR 0033; `src/geom/toleranta.ts` (bugetul, un singur loc: toleranța proiectului 0,001 mm, ținta 0,99);
`src/geom/biarce.ts` (cubica → linii și arce, tăiată la inflexiuni și vârfuri, abaterea măsurată în ambele sensuri,
refuzurile și plafonul de bucăți explicite). Nimic nou pentru owner: nicio formă nu are încă cubice (vin cu 2.7b–c).

**Completed:** 11.10 17:40. **Treceri:** 5.

**Făcut:**
- ADR 0033 (cu precizarea recenziei): bugetul de toleranță într-un singur loc (`toleranta.ts`: 0,001 mm, ținta 0,99,
  raza maximă a arcelor 9 900 mm); ușa `cubicaInArce` / `conturFaraCubice`, cu refuzuri explicite (toleranța, punctele
  neterminate, plafonul de 4 096 de bucăți, rezoluția numerică).
- Ordinea tăieturilor: inflexiunile și vârfurile (vârfurile din B′, nu din cross: rotunjirea pierdea jumătate din ele),
  regula liniei, apoi extremele pe axe pentru bucățile care nu sunt plate (monotone pe x și y), apoi înjumătățirea.
- Măsurătoarea: 32 de puncte pe fiecare sens, apoi fiecare maxim local rafinat prin secțiunea de aur.
- Un test leagă raza maximă de garda fiecărui contract de post și toleranța postului de cea a proiectului.

**Ce a găsit recenzia** (o lentilă de geometrie + 5 verificatori, 1,20 M tokeni, 67 min; toate reproduse cu măsuri
independente):
- mânerul întors pe o cubică aproape dreaptă: întoarcerea din primul 1/32 al bucății nu cădea pe niciun eșantion, iar
  lanțul era coarda goală. 18–35 × tol, până la 414 × pe 2,4 m, tăcut;
- vârfurile cu coordonate oarecare, ratate din rotunjire: până la 2,63 × tol;
- vârful abaterii între eșantioane: 1,13 × tol pe un singur biarc;
- razele de 1e6–1e12 mm: postul le-ar fi scris ca segmente G1, a doua aproximare peste prima (2,05 × tol prin postul
  real);
- bucățile nule, începutul la 1e-9 mm de a, motivul greșit al refuzului de sub rezoluție.

**Proba:**
- oracolul independent (0,48 M în total, două treceri): distanța exactă la cubică și la arc, Hausdorff în ambele sensuri,
  ordinea tăieturilor de la §4 cu rădăcinile exacte (aritmetică întreagă) și o marjă care ține seama de condiționare;
  150 de cubice la 4 toleranțe (229 de teste), martorii, controalele negative, 35 de sabotaje ale oracolului (toate
  prinse). Prima lui constatare (dreapta care se întoarce n-avea tăieturi) s-a reparat înaintea recenziei. Pe aplicația
  de dinaintea recenziei prinde 18 din cele 20 de cazuri ale ei;
- otrăvurile, două treceri: la prima, 13 din 26 prinse. Din cele scăpate:
  - 4 au primit teste noi: ținta de 0,99 măsurată de oracol pe cazuri căutate adversarial, pragul regulii liniei,
    arcele de lângă vârf;
  - 3 erau cod mort, scos: dublurile tăieturilor și ambele gărzi de bucăți nule (fără ele, nicio bucată nulă în 7 500 de
    cubice);
  - 5 sunt echivalente: cele două sensuri luate singure, 8 eșantioane și rafinarea doar a maximului global (căutarea
    adversarială, 1 500 de cubice + 3 000 de pași de urcare, rămâne la 0,99000 × tol), rădăcinile cu anulare
    (1,4e-11 mm). Primele patru rămân, fiindcă le cere contractul.
  La a doua trecere, pe codul final: 6 din 11 prinse, iar restul de 5 sunt cele echivalente.

**Rămâne deschis:**
- marja de 100 mm sub garda postului presupune o freză cu raza ≤ 100 mm la offsetul spre exterior. Lucrarea din 2.7b
  trebuie să verifice raza arcelor după offset;
- un oracol de la cap la coadă (cubica → biarce → offset → post → G-code, abaterea față de cubică) vine cu 2.7b, când
  cubicele intră în CAM;
- numărul bucăților a crescut de ~1,3–1,8 ori (curbele blânde ies din linii măsurate);
- garanția rămâne euristică (§6): o cocoașă mai îngustă de 1/32 dintr-o bucată monotonă, fără maxim eșantionat lângă ea.

## 2026-10-11 — Etapa 2, felia 2.7b: forma „cale” (Model: Claude Opus 5.5)

**Prompt:** „Continua”. **Started:** 18:07. **Clasa:** R2 (cubicele ajung la mașină prin CAM). **Estimarea:** ~½ zi
activă, plus oracolul independent (~0,6 M tokeni) și recenzia (~1 M). Săptămâna era la 43 % (citit cu `get_usage`).

**Ce intră:** ADR 0034 și documentul v9: o formă nouă, „cale”, un contur închis din linii, arce și cubice, în
coordonatele elementului. Migrarea v8 → v9 schimbă doar numărul. Pânza o desenează exact (cubicele ca Bézier), iar clicul
o măsoară exact. CAM-ul o taie prin biarce (ADR 0033 §7), o singură dată pe element, înaintea regiunii păstrate, a
offsetului și a degajărilor. Nimic nou de încercat pentru owner: căile intră în aplicație cu importul SVG (2.7c).

**Pauză** (11.10, la cererea owner-ului „o sa facem pauza cand se poate”): codul, oracolele și reparațiile recenziei
sunt împinse (`7199f63`). Rămân otrăvurile (48, în curs într-o clonă din afara Drive) și încheierea feliei.

**Completed:** 12.10 10:39 (după pauză; otrăvurile au rulat din nou, de la capăt, pe o clonă curată). **Treceri:** 6.

**Făcut:**
- ADR 0034 + documentul v9: forma „cale” (un contur închis L / A / C), ușa (refuzurile, plafoanele de vârfuri pe cale, pe
  piese și în lume, raza arcului ≤ 10 000 mm, matricea în lume a elementelor cu arce), migrarea v8 → v9 (un v8 cu o cale e
  refuzat); pânza o desenează exact; clicul măsoară cubicele direct (includerea prin bisecție, distanța prin secțiunea de
  aur și Newton); lista: „cale L × H, n segmente” (cu pluralul românesc).
- CAM-ul: conturul de tăiat al fiecărui element, o dată, în lume, cu cubicele ca biarce (`src/cam/contur.ts`, încărcat
  doar la export), pentru regiune, profil, degajări și avertismente.

**Ce a găsit recenzia** (două lentile + 10 verificatori, **3,95 M tokeni**, de ~3 ori peste estimare; toate reproduse):
- căile netede refuzate de offset (înaltă): la o linie plată lângă un arc al biarcelor, cavalier lăsa o buclă de
  5e-4 … 0,03 mm (32 de cubice: un sfert refuzate; 128: patru din cinci). Buclele locale sub 0,1 mm se scot acum;
- contactele false dintre două arce mici tangente (înaltă: până la 90 % din florile mici refuzate): ignorate lângă vârf;
- arcul cu raza absurdă (critică, dintr-un document fabricat: un semicerc ascuns tăiat în piesă): raza ≤ 10 000 mm;
- matricile la limita similitudinii (pânza arunca la fiecare pornire): ușa judecă și matricea în lume, la 2e-12;
- timpul O(n·m) al verificărilor offsetului (35 000 de vârfuri: 7 minute): un index de cutii, ~2 s, aceleași verdicte;
- două căi care se ating exact (scăpau jumătate): banda biarcelor la atingere; colțurile curbe fără degajare (tăcute):
  avertisment; o curbă strânsă: un avertisment, nu unul pe fiecare arc al biarcelor;
- distanța clicului (până la 29 mm); muta / Ctrl+D peste 10⁷ mm (din etapa 1); Ctrl+D copia o cale întreagă în istoric.
- Reparația la cauză, în cavalier (îmbinarea aproape tangentă), a dat aserțiuni noi peste scoaterea buclelor: amânată
  la 2.7c, pe fonturi și SVG-uri reale (ADR 0034, limitele).

**Proba:**
- oracolul documentului, al regiunii și al porții (sesiune independentă, ~1,1 M, două treceri): documentul v9 și cele 33
  de otrăvuri ale căii, plafoanele și după acțiuni, regiunea pe căi, poarta pe 22 de cazuri pe 8 montaje, 1 912 programe
  fără căi identice cu cele de dinainte; a găsit două defecte ale aplicației (un v8 cu o cale primit ca v9; colțul curb
  ascuns de un vârf dublat), reparați;
- oracolul cap-coadă (sesiune independentă, ~0,2 M): G-code-ul citit înapoi, la R de cubica exactă: 0,99 × tol pe IR,
  1,48 × tol pe G-code (bugetele 1,001 și 3,001), pe 59 de documente; a găsit distanța clicului de lângă capete;
- otrăvurile: 48, rulate din nou pe o clonă curată după pauză: 38 prinse.
  - 4 au primit teste noi, probate pe otrava lor: refuzul biarcelor fără id-ul elementului, matricea în lume la ușă
    (un caz care trece în piesă la 1e-12 și pică în lume la 2e-12), Ctrl+D care copia formele, semnul din determinantul
    brut la oglindirea minusculă;
  - 6 sunt echivalente, măsurat: regiunea care își recalculează conturul (aceleași biarce, deterministe; doar timpul),
    traversarea la capătul bucății (bisecția convergentă), rafinarea doar a minimului global (0 diferențe pe 200 000 de
    cubice), Newton fără secțiunea de aur și invers (cel mult 1,5e-12 mm, și pe 300 000 de cubice cu mânerul retras:
    fiecare ajunge singur).

**Rămâne deschis:**
- reparația cavalier la cauză (2.7c); cavalier dă uneori un contur deschis pe colțurile de 0,5 mm (de dinainte);
- degajarea pe colțurile cu arce și cubice cere un ADR nou (acum: avertisment);
- timpul biarcelor (~1–3 ms pe cubică, pe firul principal): măsurat în 2.7c pe fișiere reale;
- pachetul de pornire: 97,0 kB din 100.

## 2026-10-12 — Etapa 2, felia 2.7c: ușa SVG și importul (Model: Claude Opus 5.5)

**Prompt:** „continua” (după pauză). **Started:** 07:30. **Clasa:** R2 (desenul importat ajunge la mașină). **Estimarea:**
~½ zi activă, plus oracolul independent (~0,6 M tokeni) și recenzia (~1 M). Săptămâna era la 54 % (citit cu `get_usage`).

**Ce intră:** ADR 0035, ușa SVG. Octeții (16 MiB) și entitățile se judecă înaintea parserului; `DOMParser` inert, fără
nimic atașat. Unitățile și pagina (cu alegerea 96 / 72 px pe țol, preselectată pentru Illustrator), transformările, cele
șapte forme, gramatica datelor căii. Arcele de cerc rămân arce; cele eliptice și cele plate devin cubice sub 1e-6 mm.
Subcăile închise devin căi (ADR 0034), cele deschise se numără (vin cu 2.3c). Latura vine din imbricare. Piesa și instanța
intră într-un singur pas de anulare. Dialogul arată mărimea, contururile și raportul. Butonul „Importă SVG…”. Ușa,
dialogurile (și cel de export) și mesajele lor se încarcă la cerere: pachetul de pornire are 98,4 kB din 100.

**Stare** (12.10, la împingere): codul, oracolul (sesiune independentă) și reparațiile recenziei sunt împinse; otrăvurile
(49, scrise de o sesiune independentă) rulează pe o clonă din afara Drive. Încheierea feliei vine după ele.

**Completed:** 12.10 12:05. **Treceri:** 5.

**Făcut:**
- ADR 0035 și ușa: `src/io/svg.ts` (parcurgerea, pagina, formele, arcele), `svgDate.ts` (gramaticile: datele căii,
  `points`, `transform`, lungimile, `style`), `piesa.ts` (piesa importului), `imbricare.ts` (latura), `src/geom/elipsa.ts`
  (arcul eliptic în cubice, cu abaterea pe hârtie: 1,82e-5 · φ⁶ · σ); `TOLERANTA_IMPORT` = 1e-6 mm.
- Acțiunea `document.importa` (un pas de anulare, plafoanele, ușa documentului întreagă), butonul, dialogul (lazy, cu
  rezerva la o publicare nouă), dicționarul `import.*` încărcat cu dialogul; regula de import `io-doar-model-geom`.
- Logoul plăcii 2 (`test/placi/placa-02/logo-80mm.svg`): e2e-ul îl importă (80,00 × 40,00) și îl exportă cu centrul
  frezei Ø6 exact de la X −3 la X 83.

**Ce a găsit oracolul** (sesiune independentă, ~0,58 M, două treceri): arcele de 180° cu centrul la √ε de mijlocul
coardei (un semicerc ieșea împărțit în două; până la 8e-6 mm, peste bugetul de 1e-6), elementele sărite sub `visibility`
(precizat apoi invers, la recenzie), `M … Z` nedegenerat. Pe contractul final: 189 de cazuri pe hârtie, 240 de SVG-uri
aleatoare (strict), plafoanele; 45 din 48 de sabotaje ale oracolului prinse (3 redundante).

**Ce a găsit recenzia** (2 lentile + 16 verificatori, **2,2 M**, de ~2 ori peste estimare; 15 constatări reproduse, toate
reparate):
- imbricarea și perechile `nonzero` pătratice (50 000 de dreptunghiuri identice: 334 s cu fila blocată; 80 000 de
  triunghiuri: 281 s): un buget de includeri (2·10⁷), peste el refuz;
- entitățile: declarația dublă (XML ia prima) și valorile implicite din `ATTLIST` (80 MiB din 16); motivul ca cod tradus;
- pagina cu o singură latură absolută (de 3,78 ori prea mică); arcul aproape de 360° (raza 58 în loc de 50);
  contururile fără arie (CAM-ul refuza toată piesa); bucla dintr-o singură cubică; plafonul căii înaintea liniei de
  închidere; similitudinea sub scara 1; `rx` / `ry` și `switch` ca în Edge;
- dialogul: focusul pierdut după alegerea px-ului, Escape; partea ușii care nu se poate aduce după o publicare nouă.
- Verificatorii au corectat două reparații propuse (`rx="auto"` e 0 în Edge, nu „lipsă”; `visibility` nu scoate
  elementele sărite din raport, un `tspan` vizibil reapare).

**Pe fișiere reale** (două embleme de club de pe Wikipedia, logoul Presto, iconițe): ușa ≤ 9 ms, CAM-ul ~0,5 s pe 1 316
cubice; contururile suprapuse peste randarea originalului se potrivesc. Exportul le refuză (regiunea): sunt straturi
pictate unul peste altul. Alegerea a ce se taie, pe contur, vine cu panoul de proprietăți (2.8).

**Proba:**
- paritatea parserelor: Edge (`DOMParser`) și xmldom dau același rezultat pe 18 cazuri; xmldom nu expandează entitățile
  DTD, deci cazurile pozitive cu entități (Illustrator) sunt în e2e;
- otrăvurile (49, scrise de o sesiune independentă, ~0,24 M): **45 prinse**. 3 scăpate au primit teste, probate pe
  otrava lor (mărimea desenului, nu a paginii, în previzualizare; Escape cu focusul pe pagină; ușa adusă în fundal); a
  patra era cod mort (garda dublu-clicului: React închide dialogul înaintea celui de-al doilea clic), scoasă.

**Rămâne deschis:**
- regula `nonzero` (2.7d, PathKit); contururile deschise (2.3c); alegerea pe contur (2.8);
- reparația cavalier la cauză, nereevaluată: logourile reale se opresc la regiune, înaintea offsetului;
- `use` și `svg` imbricat (se pot adăuga fără alt contract); rezoluțiile px în afară de 96 / 72;
- pachetul de pornire: 98,4 kB din 100 (dialogurile au trecut la cerere; următoarea interfață la pornire cere loc).

## 2026-10-12 — Etapa 2, felia 2.7d: regula `nonzero` la ușa SVG (Model: Claude Opus 5.5)

**Prompt:** „continua” (după încheierea lui 2.7c). **Started:** 12:15. **Clasa:** R2 (geometria importată ajunge la
mașină). **Estimarea:** design cu prototipuri (~1,5 M), portarea, oracolul (~0,6 M), recenzia (~2 M). Săptămâna era la
61 % (`get_usage`).

**Ce intră:** ADR 0036. Workflow-ul de design (3 prototipuri independente + un judecător cu instrumentul lui, 1,71 M, 3,8 h)
a infirmat mecanismul din ADR 0003 / 0004 pentru ușă: PathKit + R3 pierdea tăcut detalii de µm la scara foii și refuza
textul real. Câștigă aranjamentul exact în double, fără PathKit, cu toleranța relativă la întinderea desenului: 0 erori de
regiune pe 16,4 M de puncte, abaterea ≤ 1e-9 mm, „supa” de 10 212 vârfuri din fonturi reale în ~1 s. Ușa normalizează
fiecare formă `nonzero`; la refuz importă ca în 2.7c, numărat.

**Pauză** (12.10, la cererea owner-ului „poti sa te opresti cand poti”): portarea cu reparațiile recenziei, ușa (clasele
CSS simple, `fill: none`, bugetele pe fișier), oracolul independent și testele sunt împinse. Rămân: otrăvurile (54, scrise
de o sesiune independentă, verificate că se aplică și compilează; nepornite), publicarea pe test și încheierea feliei.

**Reluat:** 13.10 07:17, la „continua, o sa vreau sa facem partea de UI putin mai devreme, dar termina feliile pana la 3.0
intai, sau crezi ca se poate face acum, fara sa afectam planul?”. Owner-ul a importat pe test logoul AS Roma (Illustrator,
95 de forme): 2 forme refuzate de normalizare (autoverificarea). Cauza era în ușă: la închidere, capătul se lipea de primul
vârf, dar mânerul retras (`s… -1-1-1-1z`) rămânea la 1 ulp de el, cu o tangentă din zgomot. Reparat (ADR 0035 §7), cu
testul pe cele două forme reale: 0 refuzuri, 3 forme normalizate.

**Completed:** 13.10 09:55. **Treceri:** 6 (designul; portarea; recenzia și reparațiile; oracolul, cu K1 și K7; logoul
AS Roma; otrăvurile, cu golurile închise).

**Făcut:**
- ADR 0036 și `src/geom/nonzero.ts`: regula `nonzero` normalizată printr-un aranjament exact în double, fără PathKit
  (mecanismul lui ADR 0003 înlocuit; PathKit rămâne pentru booleenele editorului, etapa 6, ADR 0004); calea rapidă
  exactă (forma deja `evenodd` = același obiect), geometria ieșirii a sursei, refuzurile cu cod, bugetul pe apel și pe
  fișier;
- ușa (ADR 0035): regulile CSS simple din `<style>` (cu bugetul potrivirilor), `fill: none` nenormalizat, plafonul pe
  intrare înaintea normalizării, mânerul retras lipit la închidere (logoul AS Roma).

**Ce a găsit recenzia** (2 lentile + verificatori, 1,77 M; 8 confirmate, toate reparate): încrucișările la unghi mic
ratate (critică: o lentilă de înfășurare 2 ieșea gaură, tăcut), comasarea nodurilor pătratică, ordinea ieșirilor la
tangente, coincidența la 16τ, clasele CSS ale Illustrator ignorate, desenele `fill: none` normalizate, bugetul pe formă,
plafonul după normalizare.

**Ce a găsit oracolul** (sesiune independentă, 0,87 M, 168 + 972 de teste, 34 de sabotaje prinse): K1 (o cale cu un
singur vârf trecea „neschimbată”: acum refuz `intrare`); K7 (un triunghi mai subțire decât τ iese gol: ADR 0036 §6
precizat, „deja evenodd” la precizia τ).

**Otrăvurile** (54, scrise de o sesiune independentă, 0,29 M; rulate pe o clonă la `ed5cd65`, reluate după închiderea
sesiunii): **45 prinse**, 9 scăpate.
- 4 au primit teste, fiecare probat pe otrava lui. **Două erau goluri reale, cu regiunea greșită, tăcut:** o cubică cu
  buclă luată drept simplă pe calea rapidă (bucla de înfășurare 2 rămânea gaură) și incluziunea numărată pe bucăți
  monotone pe x (un pătrat în același sens, sub un arc, rămânea gaură). Celelalte două: calea rapidă pe un desen de
  20 m, arcul întreg întors cu −bulge bit cu bit.
- 5 sunt echivalente sau plase de siguranță: coincidența cubicelor la 16τ și ordinea după curbură la tangente egale
  (măsurate de portare), raza de control și verificarea de la mijloc (plasele a doua, care transformă o ratare în refuz),
  muchia parțial în spatele originii (0 diferențe pe 6 000 de forme aleatoare și pe cazul țintit).

**Costul în agenți:** ~5,3 M (designul 1,71, portarea 0,68, recenzia 1,77, oracolul 0,87, otrăvurile 0,29).

**Rămâne deschis:**
- booleenele editorului (etapa 6): același aranjament, cu alt predicat, se reevaluează atunci față de PathKit;
- textul (etapa 7) folosește aceeași funcție; ADR 0036 se redeschide la refuzuri pe glife reale;
- praful din ieșirea normalizării (VfB): regula vine cu 2.3c-1 (ADR 0037 §11).

## 2026-10-13 — Etapa 2, felia 2.3c: profilul pe contururile deschise (Model: Claude Opus 5.5)

**Prompt:** același „continua, …” (13.10 07:17), după reparația logoului AS Roma. **Started:** 07:50, cât rulează
otrăvurile 2.7d pe o clonă. **Clasa:** R2 (tăietura pe un contur deschis ajunge la mașină). **Estimarea:** mai mult de o
felie (documentul v10, ușa SVG, pânza, CAM-ul pe deschis, poarta): designul întâi, cu 3 propuneri independente, o sondă
cu cod a offsetului deschis și un judecător (~1,5 M, 1–1,5 h), apoi împărțirea în sub-felii. Săptămâna era la 73 %
(`get_usage`, reset 17.10).

**Designul** (`wf_7ef65ba5-613`, 3 propuneri + sonda + judecătorul, 0,40 M; reluat după închiderea sesiunii): ciorna ADR
0037, 5 întrebări pentru owner, 6 sub-felii (~3–3,5 zile, ~4,5–5 M). A găsit un defect pe `main`: pe `pe-linie`, un arc
aproape nul (coarda 1e-11 mm, bulge 1e-13) ieșea din post un cerc Ø50 tăiat prin piesă (`baleiajArc` ia un baleiaj sub
1e-12 rad drept cercul întreg, iar traseul scria conturul necurățat). **2.3c-0:** `taieBucla` scrie linie orice arc cu
|bulge| < 1e-6 sau mai scurt de 1e-6 mm, ca la curățarea offsetului; testul pe tot lanțul (până la G-code) pică înainte
și trece după; corpusul amprentelor rămâne identic. Garda din poartă (invarianta 14 (i)) o scrie o sesiune independentă.

**Deciziile owner-ului** (13.10, „ok, dar, taietura care desparte foaia ar trebui pusa intentionat de utilizator, nu
automat”): ADR 0037 acceptat cu cele cinci implicite, iar despărțirea foii devine un marcaj al utilizatorului
(`despartire: true`), nu o clasificare automată; o tăietură deschisă prin foaie, nemarcată, care ajunge la marginea foii
se refuză (de confirmat înaintea lui 2.3c-5).

**2.3c-1 (ușa SVG: umplerea și praful, ADR 0037 §11):** o formă umplută fără Z se închide cu o linie, ca în browser
(`inchise-de-umplere`); una trasă doar cu linie, doar cu golul ≤ 0,01 mm (`inchise-la-usa`); praful (cutia exactă sub
0,01 mm, după verificarea degenerării) se sare, numărat (`sub-rezolutie`), și pe contururile ieșite din normalizare (VfB:
2 bucle de închidere de ~6e-5 mm, care făceau CAM-ul să refuze exportul). Căile deschise rămân sărite până la 2.3c-3.
Pe fișierele reale: VfB 8 forme închise prin umplere, Presto 2, valul din CNC-referinta rămâne deschis, AS Roma și placa 2
neschimbate. `REZOLUTIE` stă acum în `toleranta.ts` (un singur loc). Un test vechi (elipsa sub scara 1e-13, ajunsă praf)
a fost întărit: prinde acum defectul similitudinii judecate absolut, probat cu defectul pus înapoi. Oracolul SVG amendat
de o sesiune independentă (0,64 M, două treceri): 27 de cazuri noi pe hârtie (U1–U27), fișierele reale, 23 de sabotaje
prinse; a precizat ordinea (praful după degenerare) și a cerut decizia pentru praful din normalizare.

**2.3c-2 (documentul v10 și tăierea pe linie a căilor deschise, ADR 0037 §2, §4, §7–§10):** implementarea de un agent
într-o clonă (0,61 M): schema 10 (`inchis`, ultimul segment L, arcele pe n − 1 segmente, laturile stânga / dreapta,
`despartire`), migrarea v9 → v10, `inchis` citit real în cele patru locuri (fără coarda de închidere), CAM-ul pe linie pe
deschise (plonjare la vârful 0 la fiecare trecere), refuzurile §9 (stânga / dreapta: „vine în 2.3c-5”), ordinea §8 cu
despărțirea marcată, avertismentele §10; 29 de teste cu valori pe hârtie. Poarta și oracolul documentului v10, de o
sesiune independentă (0,61 M): eticheta deschisă, invarianta 11 pe deschise, 14 (i) fără coardă, 14 (iii), refuzurile ca
încălcări, 16 martori, 27 de sabotaje prinse. La integrare: clasa 3 ține doar tăieturile DESCHISE marcate (aplicația
punea și un nod închis al unei operații marcate; reparat după oracol). Pornirea: 99,6 kB din 100 (schema v10 și
migrarea stau la pornire); 2.3c-3 va muta piesa importului la cerere.

**2.3c-3 (importul căilor deschise și interfața, ADR 0037 §11 partea a doua, §12)** — „ok” al owner-ului: acum, fără
recenzie; recenzia A și 2.3c-4–6 după resetarea săptămânală (17.10). Implementarea (agent, 0,47 M): `line`, subcăile
`fill: none` cu golul peste 0,01 mm și polilinile deschise devin căi deschise (cu vârful final); degenerată sub 2 vârfuri
distincte sau sub 0,01 mm pe curbă; nici imbricare, nici normalizare; `gol` = nicio cale; operația `deschise` a piesei:
pe linie, min(1 mm, grosimea / 2), o trecere; săgeata de sens pe pânză pentru căile deschise selectate; „cale deschisă”
în listă; dialogul numără căile deschise și spune că grosimea liniei din fișier nu contează. Piesa importului se face
acum în modulul previzualizării (la cerere): pornirea 99,6 → 99,2 kB. Oracolul SVG (sesiune independentă, 0,47 M):
secțiunea L (17 cazuri), cazurile vechi aduse la contract, 10 001 linii, plafonul cu vârful final, sabotajele prinse.
La integrare: doar forma apelului `piesaDinImport(date, id, scula, grosime)` adaptată în testul de legătură. Valul din
CNC-referinta se importă ca o cale deschisă și se taie pe linie, prin poartă (e2e). 6 048 de teste unitare; e2e 57 / 57
(o rulare a avut o dată pagina neîncărcată în 30 s; două rulări complete după, curate).

## 2026-10-13 — Etapa 2, felia 2.8a: carcasa interfeței (Model: Claude Opus 5.5)

**Prompt:** „ai dreptate, B arata cel mai bine. dar, vreau sa avem doua template-uri. B, care va fi cel modern, si voi vrea
sa avem si unul clasic, care arata mai aproape de Artcam sau chiar si CNCVS 1. Ma gandesc sa facem UI-ul customizabil.
unde userul poate aseza unelte in UI si il poate salva. ok, nu lasa asta sa incurce planul. Doar tine minte si decizi tu
cand este cel mai bine sa te apuci de asta”. **Started:** 08:45. **Completed:** 09:55. **Clasa:** R1 (interfața; nimic
nu mișcă mașina).

**Făcut** (integrarea, de un agent într-o clonă, ~0,43 M; prototipurile: A ~0,4 M, B ~0,36 M + prima jumătate, C ~0,4 M):
- carcasa B pe `main`: pânza pe tot ecranul, insulele plutitoare, paleta Ctrl+K peste registrul de acțiuni, bara selecției
  (cu garda de 0,3 s contra dublu-clicului), panourile care se strâng, temele (după sistem, luminoasă, întunecată);
- **aranjamentul din date** (`src/ui/aranjament.ts`): zonele, grupurile, intrările după id-urile din registru, docurile;
  `ARANJAMENT_MODERN` e B, iar `verificaAranjament` refuză id-urile necunoscute și dublurile (test, cu controale). Un
  șablon clasic sau un aranjament salvat de om vor fi alte date, trecute prin aceeași verificare (decizia owner-ului de
  mai sus: momentul îl alege asistentul);
- din prototipul A: arborele proiectului (foaia → instanțele → piesa → operațiile) și cipurile cursorului (mm) și ale
  zoomului;
- pornirea: 99,0 kB din 100 (mesajele dialogului de export și 4 motive ale lui vin cu dialogul).

**Proba:** 5 572 de teste unitare; e2e în Edge 56 / 56 (6 noi: paleta, tema ținută minte, panourile, garda barei
selecției, arborele, cursorul); niciun selector folosit de e2e schimbat.

## 2026-10-13 — Etapa 2, felia 2.8b: fișierele lăsate pe planșă (Model: Claude Opus 5.5)

**Prompt:** „vreau sa pot 'arunca' direct in plansa unul sau mai multe fisiere vectoriale, cum ar fi un svg”.
**Started:** 13:10. **Completed:** 13:55. **Clasa:** R1 (interfața importului; ușa SVG neschimbată). Făcută în sesiunea
principală, fără agenți (bugetul săptămânii).

**Făcut:** pânza primește fișierele trase din sistem și spune punctul în mm ai foii; fereastra prinde și fișierele lăsate
în afara pânzei (browserul nu mai deschide SVG-ul în locul aplicației); coada trece fișierele prin dialogul existent, pe
rând („(2 din 3)”, „Sari peste”, „Renunță la toate”); lăsat pe pânză, centrul desenului cade în punctul lăsat, iar
fiecare fișier următor cu 10 mm la dreapta și în jos; un fișier care nu e SVG e refuzat cu motiv; butonul „Importă SVG…”
primește acum și mai multe fișiere deodată. Un contur punctat cu textul „Lasă fișierele SVG aici” cât se trag fișierele.

**Proba:** testul unitar al locului (centrul cutiei în punctul lăsat; fără loc, ca la buton); 2 e2e noi cu lăsarea reală
(DataTransfer): două fișiere pe rând, la locul lor; un DXF refuzat, „Sari peste”, „Renunță la toate”. 6 049 de teste
unitare, e2e 59 / 59. **Pornirea: 99,9 kB din 100**: următoarea interfață la pornire cere întâi loc (o mutare la cerere).

**Săgețile de sens** (13.10, „Sagetile de directie ar trebui sa apara totusi doar cand sunt relevante. In principiu cand
se selecteaza partea pe care se face frezarea. Cand se face pe.linie este irelevant”): săgeata apare acum doar pe o cale
deschisă tăiată pe o parte (stânga / dreapta); pe linie, nu (ADR 0037 §12 precizat). Până la 2.3c-5, când vine alegerea
părții, nu se vede nicio săgeată. Testul unitar o probează în ambele sensuri (pe linie: 0; pe stânga: 1, în vârful 0);
e2e-ul valului: 0 și cu valul ales. 6 049 de teste unitare, e2e 59 / 59.

## 2026-10-15 — Etapa 2: loc în pachetul de pornire (Model: Claude Opus 5.5)

**Prompt:** „continua” (la recomandarea „fac 1 și 2, ~4–5 %, și mă opresc oricum la 92 %”, după „ce mai poti face cu
usage-ul ramas?”). **Started:** 07:30. **Clasa:** R1 (aceeași ușă de încărcare, adusă la cerere). Fără agenți (bugetul
săptămânii, 85 % folosit).
**Completed:** 07:50.

**Făcut:** pornirea a scăzut de la 99,9 la **96,1 kB** din 100, fără să ridice plafonul.
- Ușa de încărcare (`incarca`, cu migrările v1 → v10) vine la cerere: deschiderea proiectului o cere odată cu baza
  IndexedDB, iar importul o primește odată cu piesa (`ImportPregatit.treceDeUsa`). `jsonCanonic` are modulul lui
  (salvarea îl folosește la pornire). 99,9 → 98,1 kB.
- **E2e-ul a prins un blocaj:** pornirea aștepta deschiderea cu `await` la nivelul modulului, iar bucata ușii importa
  pachetul de intrare; deci fiecare îl aștepta pe celălalt, până la termenul de 4 s, iar proiectul salvat se deschidea
  „fără memorie” (doar 42 din 59 de e2e treceau). Reparat structural: pornirea e o funcție, fără `await` sus. Rollup nu mai desparte
  modulele comune în bucăți separate (o făcea din cauza `await`-ului de sus), deci pornirea are 2 fișiere în loc de 8:
  98,1 → 96,1 kB. Verificat: închiderea statică a intrării = exact fișierele cerute de `index.html`.
- Următoarea mutare, dacă va fi nevoie: schema documentului (valibot), dar garda exportului (`operatieInMargini`)
  trebuie atunci să vină cu dialogul.

**Proba:** 6 049 de teste unitare; e2e 59 / 59 (după reparație; înainte, 42 / 59, cele roșii pe redeschiderea proiectului).

**Apoi, 2.3c-4 pregătit** (aceeași cerere, punctul 2): planul de pornire e în fișă (`docs/etape/etapa-02.md`, „2.3c-4,
offsetul deschis”): promptul oracolului independent, gata de dat, și lista aplicației (curățarea pe deschis: cele patru
funcții care azi merg în cerc; `verificaIesireDeschisa`; reîncercarea; motivele; `neatins`; timpul). Valorile pe hârtie 3–9
din ADR 0037 refăcute de mână: toate ies (cârligul 14,828 mm; V-ul de 10°: 34,421 / 34,290 mm; arcul de 300°: 34,03 mm).
Fără cod, fără agenți. **Completed:** 07:52.

## 2026-10-15 — Etapa 2, felia 2.3c-4: offsetul deschis, partea aplicației (Model: Claude Opus 5.5)

**Prompt:** „continua” (la recomandarea „încep acum, fără agenți, partea aplicației din 2.3c-4: întâi testele cu valorile
pe hârtie, apoi codul; oracolul independent și recenzia rămân pentru vineri”). **Started:** 09:00. **Clasa:** R2
(geometria tăieturii pe o parte). Fără agenți; oracolul independent vine după 17.10, din promptul din fișă.
**Completed:** 09:20.

**Făcut:** `offsetDeschis(contur, distanta)` și `verificaIesireDeschisa` în `src/geom/offset.ts` (ADR 0037 §5): curățarea
pe deschis (cele patru funcții care mergeau în cerc primesc `inchis`), verificarea ieșirii (forma, distanța, partea,
atingerile, acoperirea la 0,05 mm), reîncercarea, cele două motive, `neatins` cu marginile înjumătățite.
- Cavalier dă exact valorile pe hârtie (linia, semicercul, L-ul, cârligul 42,1716, U-ul, V-ul 34,4211, canelura cât freza).
- **Două găuri ale contractului, găsite la implementare, scrise ca precizări în ADR 0037 §5:** (1) canalul cu strangulare dă
  o bucată cu capătul în start (camera ocolită): regula „nicio bucată nu se atinge singură” ar fi refuzat-o; (2) pe
  zig-zag-ul de sub sculă, startul bucății e la egalitate între capătul căii și primul vârf: judecat doar față de capăt,
  cădea în capac (refuz fals la R3, prins de măsurătoarea timpului).
- De hotărât la 2.3c-5: colțurile concave intră în `neatins` (câte R pe fiecare latură la 90°); pe un zig-zag dau o
  porțiune la fiecare dinte, deci avertismentul trebuie să le grupeze.
- Timpul: zig-zag-ul de 25 600 de segmente, R3: 2,4–4,9 s cu toate verificările.

**Proba:** 15 teste noi (valorile pe hârtie, refuzurile, verificarea ieșirii pe ieșiri greșite construite de mână);
13 mutații ale verificării (partea întoarsă, bucata scăpată, ieșirea goală luată drept „nu încape”, acoperirea, partea,
capacul, evantaiul, atingerile, bucla, dus-întorsul, egalitatea picioarelor, înjumătățirea), toate prinse. 6 064 de teste
unitare; pornirea 96,1 kB (offsetul e în bucata exportului). Nimic vizibil (vine cu 2.3c-5). Rămâne oracolul independent.

## 2026-10-15 — După resetarea săptămânală: oracolul 2.3c-4, poarta 2.3c-5, recenzia A; felia 2.3c-5 (Model: Claude Opus 5.5)

**Prompt:** „vad ca s-a resetat limita saptamanala poti  sa incepi in forta”. **Started:** 12:27. **Clasa:** R2.
Workflow-ul `wf_0f6db36e-3fc` (8 agenți, în clone din scratchpad, în afara Drive; estimat 3–4,5 M): oracolul independent
al offsetului deschis (2.3c-4), poarta pentru tăieturile pe o parte (independentă, din ADR 0037 §13) și recenzia A (3
lentile + un verificator pe lentilă: CAM și documentul; ușa SVG; interfața și pornirea). În paralel, în repo: partea
aplicației din 2.3c-5 (tăietura pe stânga / dreapta).
**2.3c-5, partea aplicației (12:27–12:41):** tăietura pe stânga / dreapta în CAM: profilul prin `offsetDeschis` cu R, pe
partea din lume (XOR cu determinantul), bucățile întoarse după tabelul sensului (§6); pereții ca margini protejate în
regiune (pentru profile, intrări și celelalte tăieturi pe o parte, §10); despărțirea judecată pe bucăți, marginea foii pe
capetele căii; avertismentul peretelui neatins, unul pe tăietură, doar peste D (precizarea 2.3c-5); dialogul oferă stânga /
dreapta pe un rând cu o singură cale deschisă, cu Sens activ; săgeata de sens apare pe planșă. Precizare în ADR: hârtia
10 („pe partea cealaltă trece”) cere ca și profilul piesei să stea departe de perete (la 5 mm îl atinge). 11 teste noi pe
hârtie (`cam.parte.test.ts`: hârtiile 1, 3, 4, 9–12, cârligul, U-ul, despărțirea, sensul pe modelul așchiei), un e2e
nou (linia pe stânga: G-code-ul la Y53 și săgeata). 6 075 de teste unitare, e2e 60 / 60, pornirea 96,2 kB. **Nepublicat
pe test** până la poarta amendată (ADR 0037, „Ordinea lucrului”).
**Recenzia B (2.3c-4 și 2.3c-5; 2 lentile + 2 verificatori, 1,12 M, 64 min):** 7 constatări confirmate, toate reparate,
fiecare cu testul ei: (1) frângerile de zgomot (~1e-12 rad) la joncțiunile tangente ale biarcelor erau luate drept colțuri:
o curbă S din SVG, departe de origine (X 2500), era refuzată fals cu „partea greșită” până la 48 % din cazuri; acum sub 1e-6
rad e mers drept, iar partea vine din normala medie; (2) o codiță de 1e-6…1e-5 mm la capăt (rotunjirea unui SVG): curățarea
pe deschis unește acum la toleranța lui cavalier (1e-5); (3) acoperirea eșantionează arcele pe lungimea idealului (pe un arc
R0,05 cu d = 12,5 trecea un gol de 9 mm); (4) sensul bucăților se verifică (o bucată întoarsă s-ar fi tăiat în sensul
opus); (5) poliliniile fine nu mai sunt refuzate cu „se atinge singură” (suprapunerea raportată de cavalier între vecini
care merg înainte); (6) plafonul verificării (~200 m de traseu), cu refuz explicit; (7) liniuța pe partea frezei, lângă
săgeată (ADR 0037 §12), din aceeași funcție ca CAM-ul (`src/model/parte.ts`), corectă sub oglindire. 2 constatări
infirmate de verificator (comportamente cerute de contract). 6 082 de teste unitare.
**Integrarea oracolului 2.3c-4 și a porții 2.3c-5 (sesiuni independente, 2,56 M cu recenzia A, 89 min):** oracolul (120 de
teste, 46 de sabotaje prinse, 516 offseturi fără niciun traseu greșit) a prins o abatere: verificarea primea dus-întorsul
până la 2R + 0,004 (contractul: ± 1e-4); reparată (banda |d| ± 5e-5). Poarta (65 de teste, 38 de sabotaje prinse) a
reparat singură un fals pozitiv vechi (canelura cât freza luată drept drum dog-bone). Legătura aplicație–poartă
(`parte.aplicatie.oracol.test.ts`): 24 din 26 la primul contact; cele 2: un fals pozitiv al porții (invarianta 9 pe bucata
de închidere de 0,28 µm a unui arc GRBL; reparat la integrare: primitive de cel puțin 0,001 mm) și un defect al aplicației
(canelura din mijlocul unei căi, refuzată cu „se atinge singură” în punctul de întoarcere; reparat). Acum 26 / 26, plus
acordul pe regiune (10, 11, 12), iar e2e-ul liniei pe stânga trece prin poartă. Alegerile oracolului și ale porții, scrise
în ADR 0037 §13 („Precizările integrării”). 6 293 de teste unitare, e2e 60 / 60.
**Recenzia A (2.3c-0…3 și feliile de interfață; 3 lentile + 3 verificatori):** 15 constatări, toate confirmate. Reparate
13, fiecare cu testul ei:
- **CAM și document (5):** o tăietură prin foaie care atinge marginile la MIJLOC desparte foaia fără refuz: acum
  contează orice punct al drumului, nu doar capetele; „bucata liberă” vede și vecinii care se mai taie o dată (arcul de
  340° cu linia) și coada oprită sub D de tulpină (canalele se ating); arcul cu |bulge| uriaș avea centrul NaN, deci postul
  omitea tăcut cercul (`cerculArcului` fără depășire, aceiași biți pe arcele obișnuite); marcajul „despărțire” se pune
  acum din dialog (coloana nouă, doar pe rândurile cu căi deschise; exportul îl cerea, dar interfața nu avea unde).
- **Ușa SVG (2 din 4):** praful judecat la fel la ușă și în CAM (cutia exactă; un cerc de Ø0,009 trecea de import și
  refuza apoi tot exportul); `departe` și pe coordonatele piesei. Celelalte 2 (linia umplută scrisă cu C / Q dispare;
  dus-întorsul închis cu Z e sărit) schimbă contractul pe care îl codifică oracolul independent al ușii: aplicarea le-a
  făcut roșii pe 240 de semințe aleatoare, deci au fost scoase și trecute în ADR 0037 §11 ca propuneri, pentru 2.3c-6.
- **Interfața și pornirea (6):** fila care citește, cu ușa căzută, spune „necitit” și lasă blocarea (nu mai ține toate
  filele în „doar citire”); dublu-clicul pe „Importă” din coadă nu mai importă și fișierul următor nevăzut; lăsarea pe
  planșă în fila care doar citește nu mai deschide un dialog agățat; ușa care nu vine la pornire spune „n-a putut fi citit
  acum”, nu „browserul nu permite memoria locală” (un mod nou, `necitit-acum`); Space nu mai rămâne „apăsat” după alt-tab;
  config.json agățat nu mai ține pagina albă (termen de 4 s).

**Proba:** 6 300 de teste unitare, e2e 64 / 64 (4 noi: despărțirea din dialog, ușa căzută la reîncărcare, dublu-clicul în
coadă, config.json fără răspuns); pornirea 96,6 kB.

## 2026-10-15 — 2.3c-6, segmentul 1: ușa SVG, închiderea fără arie (Model: Claude Opus 5.5)

**Prompt:** „poti sa continui” (după „deocamdata folosim un plan cu usage mai mic, asa ca vreau sa segmentezi mai mult
taskurile deocamdata”). **Started:** acum. **Clasa:** R2 (contract nou la ușă). Un singur agent: sesiunea independentă care
amendează oracolul ușii din ADR 0037 §11 („Precizarea 2.3c-6”); în paralel, aplicația.
**Completed (segmentul 1):** ușa SVG urmează precizarea 2.3c-6 (ADR 0037 §11): o închidere fără arie e o linie (o linie
dreaptă umplută scrisă cu `c` / `q` sau cu zgomotul rotunjirii se importă ca aceeași linie scrisă cu `l`; `M L Z` și
dus-întorsul până în start devin o linie, nu o cale „fără lungime” sărită); forma golită de normalizare se numără sărită.
Oracolul ușii amendat de o sesiune independentă (0,45 M, 31 min): 102 teste noi, 18 sabotaje prinse, generatorul aleator
cu forme fără arie; aplicația îl trece din prima (1 378 / 1 378). Textul meu din ADR avea o contradicție (ordinea punea
degenerarea exactă înaintea regulii noi), corectată înainte ca oracolul să se sprijine pe ea; exemplul „triunghi sub τ”
corectat la integrare. 6 403 de teste unitare, e2e 64 / 64.

## 2026-10-15 — 2.3c-6, segmentul 2a: otrăvurile pe offsetul deschis, tăietura pe o parte și CAM (Model: Claude Opus 5.5)

**Prompt:** „ok, continua” (la „2a ~1–1½ h: offsetul deschis, tăietura pe o parte și CAM-ul”). **Started:** acum. Un singur
agent: sesiunea independentă alege, aplică și rulează otrăvurile (ADR 0037, „Otrăvurile care contează”), în clonă; cele
scăpate le tratează sesiunea aplicației (test nou sau echivalența măsurată).
**Starea la 22:10 (sesiunea s-a închis cu agentul în lucru):** agentul a rulat toate cele 70 de otrăvuri (clona
`scratchpad/clona-otravuri-23c-a`, jurnalul `.tmp/otravuri.log`, fiecare restaurată cu sha256): **50 prinse, 20 scăpate**.
A doua șansă cu toată suita a pornit-o în 3 copii PARALELE: sub încărcare pică testele de timp și fără otravă (bazele kA–kC
roșii), deci cele 3 „prinse” acolo (O02, O43, J07) nu se iau în seamă: se refac serial. Triajul celor 20 (de făcut, fără
agenți; limita săptămânală a sărit la 88 % după schimbarea planului):
- **găuri, cu testul planificat:** O11 (banda dus-întorsului ×10: U de 6,0004, abaterea 2e-4); O15 (distanța ±0,05: a doua
  bucată la 3,01, izolată); O19 (capacul capătului FINAL: ocolul la capăt); O37 (evantaiele scoase: L-ul pe dreapta fără
  arcul de colț, două bucăți); P02 (rotirea de 90° luată drept oglindire: instanța rotită cu o tăietură pe stânga); F03
  (ordinea bucăților la inversare: strangularea pe stânga + opoziție); R04 (p₀ în K: o linie pe o parte în mijlocul unei
  piese); R06 (pragul pereților R − 2ε: două linii la 5,993); J04 (neatins peste 2D: colțul concav de 60°, 10,39 mm); J07 și
  D18 (marginea foii pe cale: o tăietură pe o parte prin foaie, calea la 5 mm de margine, scula spre ea); D21 (lasoul cu
  startul lângă cale); T01 / T02 (pe linie: arcul plat cu coarda lungă, arcul scurt nelaț, în IR, câte unul);
- **de măsurat:** O02 (ultimul segment nefortat L: sens.oracol pică în copia paralelă — de refăcut serial), O32 (fără
  reîncercare: un caz care trece doar la |d| + 1e-4, din pieptenele oracolului), O36 (lungimea idealului cu semnul invers:
  densitatea pe arcele cu r ≈ |d|, factor ≤ 2), L02 (nodurile închise marcate: exportul le refuză oricum);
- **probabil echivalente, de argumentat:** O43 (mijloacele: redundante cu acoperirea pe porțiunile valide), J05 (propriul
  perete: redundant cu distanța ± 0,002 a offsetului).
**Completed (segmentul 2a, 15.10 seara, fără agenți):** cele 20 de otrăvuri scăpate sunt închise: **18 prinse acum de câte
un test țintit** (`test/unit/otravuri.23c.test.ts`, 17 teste; fiecare verificat în clonă: verde pe codul curat, roșu cu
otrava lui aplicată, restaurat cu sha256), **2 echivalente, cu dovadă**:
- teste noi pe golurile din triaj: O11, O15, O19, O37, P02, F03, R04, R06, J04, J07 + D18 (un test), D21, T01, T02;
- măsurate și transformate în teste: O32 (căutare pe 736 de căi: 18 trec doar prin reîncercarea la |d| + 1e-4, de exemplu
  pieptenele cu golurile la 5,9999 și d = 3, unde prima încercare a lui cavalier dă un punct pe partea greșită; testul ia
  două dintre ele), O36 (semicercul R3 cu scula la 3 dinspre convex: idealul R6; cu otrava pasul cade la π / 189 și un gol
  de 0,08 mm centrat în vârf trece), L02 (un nod închis dintr-o operație marcată despărțire rămâne în clasa laturii lui:
  contractul `taieturiFoaie`, chiar dacă exportul îl refuză);
- O43 nu era echivalentă, cum credeam: un cocoloș de 0,04 mm spre perete (săgeata 0,01), între două eșantioane ale
  acoperirii (pasul 0,05), trece cu toate vârfurile la exact 3 mm; doar mijlocul arcului îl prinde;
- **O02 echivalentă:** cu otrava aplicată, offsetul a 4 căi cu 6 arce diferite pe ultimul vârf (inclusiv bulge 1e6), la
  3 distanțe, e identic octet cu octet cu cel fără arc (72 / 72): cavalier nu citește segmentul ultimului vârf al unei
  polilinii deschise, iar curățarea (`imparteArceMari`, `unesteVarfuri`, `scoateVarfuriPeLatura`, `segmenteCale`) nu-l mută
  pe alt vârf. Forțarea rămâne, ca apărare. Rulată serial, `sens.oracol` trece cu otrava (29 / 29): picătura din copia
  paralelă era „out of memory”;
- **J05 echivalentă, prin construcție:** traseul pe o parte iese din autoverificarea offsetului la |distanța − R| ≤ 0,002 de
  propria cale, iar peretele se atinge doar sub R − ε, cu ε = 0,005; propriul perete nu poate fi atins de bucățile
  offsetului (alte trasee, precum intrările, sunt refuzate pe căile deschise până la 2.5 pe deschise).
Nivelul rapid: în prima rulare 7 picături, toate „out of memory” (`Fatal process out of memory`, `DataCloneError`, cu bash
fără procese libere în același timp), nu de cod; fișierele lor rerulate serial: 634 / 634; tsc, importurile, determinismul
(pornirea 96,7 / 100 kB) și licențele verzi.

## 2026-10-16 — 2.3c-6, segmentul 2b: otrăvurile pe ușa SVG, documentul v10 și interfață (Model: Claude Opus 5.5)

**Prompt:** „continua” (la „2b: otrăvurile pe ușa SVG, documentul v10 și interfață, cu un agent, ~0,5–1 M”). **Started:**
dimineața, săptămânalul la 88 %. Un singur agent (sesiunea independentă): alege, aplică și rulează otrăvurile în clona nouă
`scratchpad/clona-otravuri-23c-b` (clona 2a avea depozitul git stricat: arbori lipsă), SERIAL, cu a doua șansă pe zona
modulului, nu pe toată suita (în 2a, copiile paralele au picat din lipsă de memorie). Cele scăpate le tratează sesiunea
aplicației.
**Completed (segmentul 2b):** agentul a ales și a rulat **45 de otrăvuri** pe ușa SVG (22), document / model (11), aplicație
(3), desen (2) și interfață (7, prin e2e), serial, fiecare restaurată cu sha256; sursele clonei identice cu HEAD la final.
**36 prinse, 9 scăpate** (S13, M11, W01 la unitare; E02–E07 în e2e), plus M09 prinsă doar la a doua șansă, indirect.
Costul agentului: ~343 k tokeni, ~80 min (săptămânalul 88 → 89 %). Sesiunea aplicației le-a închis pe toate 10, fiecare cu
un test verificat în clonă (verde pe codul curat, roșu cu otrava lui, restaurat cu sha256):
- unitare, în `test/unit/otravuri.23c.test.ts`: S13 (cubica „ac” închisă de ușă și apoi linie: lungimea pe curbă, nu pe
  coardă), M11 (`jsonCanonic` sare `undefined`: altfel proiectul salvat nu se redeschide), W01 (fără săgeată pe un contur
  închis cu latura stânga), M09 (o tăietură deschisă pe dreapta, nemarcată, înaintea exterioarelor);
- e2e, în `test/e2e/otravuri-23c.spec.ts` (6): E02 (fila care doar citește și nu-și poate aduce ușa spune „nu s-a putut citi
  acum”), E03 (lăsarea pe planșă în fila care doar citește nu face aplicația inertă nici pentru un cadru: dialogul se
  încarcă la cerere și nu apucă să apară, dar `inert` se vede), E04 (rândul amestecat, un contur închis și o linie, nu
  oferă stânga / dreapta; proiectul pus direct în IndexedDB), E05 (bifa despărțirii rămâne bifată la redeschidere), E06
  (bifa inactivă pe un rând doar cu închise), E07 (un clic cu `detail = 2` pe „Importă” nu importă; `dblclick`-ul vechi nu
  prindea otrava).
Testul instabil semnalat de agent, `import.spec.ts` (lăsarea pe planșă, 2.8b, ~1 din 4): vederea pânzei se citea după
lăsare, uneori înainte de prima măsurare (`NaN`); acum se așteaptă `data-scara` și se citește înainte de lăsare: 16 / 16 la
`--repeat-each=8`. Echivalențele notate de agent la alegere (nerulate): ramura `umplut === 'linie'` din ușă, `inchidere ?`
de la linia 543 (cod mort), `!alt.inchis` în imbricare, `cutieCai` cu `inchis: true` în piesă.

## 2026-10-16 — 2.3c, segmentul 3: închiderea feliei (Model: Claude Opus 5.5)

**Prompt:** „continua” (după 2b; la „3: închiderea lui 2.3c: fișa, ACOPERIRE, raportul, fără agenți, ~1 %”). **Started:**
dimineața. **Completed:** fișa etapei 2 are blocul „2.3c, încheiată pe 16.10” (sub-feliile 2.3c-0…6 cu commit-urile,
recenziile A și B, otrăvurile: 115 rulate, 86 prinse din prima, 27 închise cu teste, 2 echivalente; ce poate încerca
owner-ul pe instanța de test; ce rămâne deschis: căile peste ~200 m de traseu verificat așteaptă worker-ul, iar urechile,
rampa, intrările și degajările pe căile deschise sunt refuzate cu motiv). `ACOPERIRE`: rândul importului 2D (contururile
deschise gata) și rândul profilului (profilul pe căile deschise). `CLAUDE.md`: starea etapei 2, urmează 2.8. Aplicația
nu s-a schimbat de la `9dab66c`, deja pe instanța de test.

## 2026-10-16 — 2.8, segmentul 1: contractul (ADR 0038, propus) și planul sub-feliilor (Model: Claude Opus 5.5)

**Prompt:** „continua” (la „Urmează 2.8 […] 1. contractul 2.8: ADR-ul și planul în fișă, fără agenți, ~1–2 %”).
**Started:** dimineața. **Completed:** ADR 0038 propus: traseul ultimului program calculat, pe un canvas WebGL2 deasupra
vectorilor (LINE_STRIP pe șiruri continue, float32 relativ la bucată, arcele la ½ px pe treapta de zoom, bugetul de
segmente), la cerere („Arată traseul”, tasta T; stins cu cip când documentul se schimbă), încărcat la cerere, fără WebGL2
doar cipul; panoul de proprietăți editabil (poziția, rotirea, foaia) cu câmpul numeric unic; oracolul stratului din textul
G-code, independent. Trei alegeri la owner (recalculul la cerere, straturile, ce se editează în panou), cu implicitul
recomandat. Fișa: sub-feliile 2.8c (panoul), 2.8d (traseul), 2.8e (probele independente, după 17.10).

## 2026-10-16 — 2.8c, segmentul 1: ADR 0038 acceptat; acțiunile panoului și numărul cu semn (Model: Claude Opus 5.5)

**Prompt:** „ok” (la ADR 0038 propus: implicitul recomandat la toate trei alegerile). **Started:** dimineața.
**Completed:** ADR 0038 acceptat, cu două precizări la acceptare: poziția din panou e colțul stânga-jos al cutiei
selecției (la un cerc, originea instanței e centrul), iar rotirea ține pe loc centrul cutiei piesei. Decizia, în
`CLAUDE.md`. Codul, fără interfață încă (panoul se leagă în segmentul 2, nepublicat):
- `document.pozitioneaza` (una sau mai multe instanțe, aceeași deplasare, un pas), `document.roteste` (o singură
  instanță, unghiul normalizat în [0, 360), centrul pe loc), `foaie.stoc` (doar mărimile scrise, în plafoanele schemei);
  fiecare refuzată cu motiv (fila care doar citește, selecția, valoarea, plafonul, prea departe), iar aceeași valoare nu
  e o comandă;
- jurnalul: comanda `inlocuieste-stoc`, cu inversa ei;
- `citesteNumar(s, semn)`: semnul („-”, „−”, „+”) doar unde e cerut, „-0” e 0; `textNumar` scrie și valorile negative
  fără exponent, citite înapoi exact;
- `test/unit/actiuni.panou.test.ts`: 8 teste (poziția pe un cerc și pe mai multe forme, refuzurile, rotirea cu centrul pe
  loc la 90° și la 33,3°, normalizarea, foaia cu anularea / refacerea și redeschiderea, refuzurile foii, numărul cu semn).

## 2026-10-16 — 2.8c, segmentul 2: panoul de proprietăți editabil (Model: Claude Opus 5.5)

**Prompt:** „continuq” (la „2.8c, segmentul 2: panoul editabil […] cu e2e și publicarea pe test”). **Started:** dimineața.
**Completed:** `src/ui/CampNumeric.tsx`, câmpul numeric unic (ADR 0038 §5): Enter sau ieșirea din câmp aplică, Escape
revine; o valoare greșită sau refuzată rămâne în câmp, cu motivul sub el (`aria-invalid`); câmpul urmează documentul cât
omul n-a scris nimic neaplicat (doar focusul nu ține textul vechi, deci ieșirea dintr-un câmp neatins nu aplică nimic).
Panoul: fără selecție, lățimea / înălțimea / grosimea foii; cu selecție, colțul stânga-jos X / Y și, la o singură formă,
rotirea; „Editează în Exportă G-code” deschide dialogul; în fila care doar citește, câmpurile sunt oprite, cu motivul în
titlu. Paleta arată cele trei acțiuni ca „Din panoul de proprietăți”. `test/e2e/panou.spec.ts`: 6 teste. Văzut în
browser: eticheta lungă a colțului se rupea pe trei rânduri în panoul îngust → titlu de grup „Colțul stânga-jos”, rândurile
X și Y.

## 2026-10-16 — 2.8d, segmentul 1: traseul pregătit pentru WebGL2 (Model: Claude Opus 5.5)

**Prompt:** „continua” (la „2.8d, traseul pe WebGL2 (2–3 segmente)”). **Started:** după 2.8c. **Completed:**
`src/app/traseuDesen.ts`, pur (în `app`, nu în `canvas`: regula „interfata-prin-actiuni” oprește pânza să citească IR-ul;
pânza va primi doar bucățile, ca la vectori): șirurile programului (rapide / tăieri, poziția modală, Z ignorat, elicea ca
arcul ei), arcele în coarde cu săgeata ≤ toleranță și capetele exacte, bugetul (toleranța dublată până încape: „rărit”;
liniile singure peste buget: „peste buget”), toleranța treptei de zoom (½ px fizic la capătul de sus al treptei de ×2) și
bucățile pentru GPU: vârfurile float32 relative la originea bucății, cel mult 64 mm de ea, șirurile apropiate în aceeași
bucată cu RESTART (primitive restart), segmentele lungi împărțite, bucățile legate prin ultimul vârf ținut în double.
`test/unit/traseu.desen.test.ts`: 9 teste pe hârtie (dreptunghiul, sfertul de arc R10 la 0,001 mm = 56 de coarde, arcul
orar, cercul întreg și elicea, bugetul, treptele, linia de 2 440 × 1 220 mm în bucăți legate, precizia de 10 ori mai bună
decât float32 în lume, RESTART). Nimic vizibil încă.

## 2026-10-16 — 2.8d, segmentele 2–3: traseul pe pânză, pe WebGL2 (Model: Claude Opus 5.5)

**Prompt:** „vad ca usage-ul nu se consuma periculos de repede. poti sa faci mai multe  lucruri in acest pas. continua”.
**Started:** după 2.8d-1. **Completed** (un pas mai mare, la cererea owner-ului):
- `src/canvas/StratTraseu.tsx` (la cerere, 2 kB gzip): canvas WebGL2 deasupra vectorilor, fără evenimente; LINE_STRIP cu
  primitive restart, vârfurile relative la bucată și `u_off` calculat în double; bucățile din afara vederii sărite; culorile
  din temă (`--traseu-taiere`, `--traseu-rapid`), stins la 35 % când e vechi; fără WebGL2 → `fara-webgl`; contextul pierdut
  → `context-pierdut`, refăcut la `webglcontextrestored`; primul cadru al fiecărui set măsurat cu `finish`: peste 32 ms,
  bugetul (2 M de vârfuri) se înjumătățește, până la 50 k;
- `App.tsx`: „Arată traseul” (`vedere.traseu`, tasta T): calculează programul documentului de acum (CAM-ul și dicționarul
  traseului vin la cerere), îl arată; la zi, îl ascunde; vechi (altă revizie) → stins, cu cipul „Traseul e vechi: T îl
  calculează din nou”; refuzul CAM-ului → cipul cu motivul; după un export reușit, traseul arătat se reface; treapta de zoom
  (×2) re-randează carcasa doar la schimbare; `Panza` primește un `strat` deasupra vectorilor;
- tipurile comune (`Bucata`, `RESTART`, `treaptaZoom`) în `canvas/protocol.ts`; mesajele cipului într-un dicționar la cerere
  (`i18n/traseu.*.ts`), ca pornirea să nu crească: 98,6 / 100 kB (de la 97,7);
- butonul în bara de jos: în bara de sus lățea insula uneltelor peste „Exportă” (8 e2e expirate la 30 s, prinse de poartă);
- `test/e2e/traseu.spec.ts`: 6 teste (pixelii ramei la 3 mm de dreptunghi, nu pe contur, nu înăuntru; vechi → T → la zi
  → ascuns; refuzul; fără WebGL2; contextul pierdut și refăcut; refacerea după export). Văzut în browser: rama, cercul
  interior și rapidele.

## 2026-10-16 — 2.10: fișa plăcii 2, cu fișierul de aur (Model: Claude Opus 5.5)

**Prompt:** „continua” (la „până atunci, fără agenți: fișa plăcii 2 (2.10), cu programele de referință”). **Started:** după
2.8d. **Completed:** `test/placi/placa-02/genereaza.ts` face documentul plăcii (v10, trece de ușă): piesa 120 × 80 R10 cu 4
urechi 8 × 2 și gaura 40 × 30 cu dog-bone, cepul 40 × 30 cu 2 urechi, logoul de 80 mm prin ușa SVG și imbricarea aplicației
(2 urechi pe contur), totul prin MDF 12 în 3 treceri de 4, în urcare, cu intrări R3; G-code-ul iese din `calculeazaExport`,
aceeași funcție ca butonul Exportă: `placa-02.nc`, 587 de linii, SHA-256 `c33a5a42…fa302`. `test/unit/placa02.test.ts`
(6): octet cu octet și hash-ul în fișă; poarta cu regiunea păstrată a documentului (nicio intrare în piese); ordinea
(interioarele întâi); dog-bone-ul pe hârtie (centrul la 3 / √2 de fiecare colț, la fiecare trecere); urechile la Z −10 (8);
lățimile pe centrul frezei (80 + 6, 120 + 6, 40 + 6). Fișa: `docs/etape/placa-02.md` (ce probează, ce îți trebuie, cum
tai, ce măsori). Aplicația nu s-a schimbat.

## 2026-10-16 — 2.9: bancul vizual v1 și unealta de otrăvuri, comisă (Model: Claude Opus 5.5)

**Prompt:** „continua” (la „2.9, bancul vizual v1: îl pot planifica fără agenți”). **Started:** după 2.10. **Completed:**
- `npm run banc` (`playwright.banc.config.ts`, `test/banc/`): aplicația din `dist/` deschide 3 documente de referință
  (placa 1; o linie pe stânga; placa 2), arată traseul (T), fotografiază foaia și fereastra greșelii mărită cu rotița (la
  densitatea 3, cu barele ascunse prin CSSOM: CSP-ul nu primește stiluri inline), sondează pixelii traseului și exportă
  G-code-ul ca omul; cifra lui (traseul insulei 106 × 66; Y 53; dog-bone 12 treceri și logoul 86) stă lângă valoarea de
  pe hârtie. Fiecare caz are martorul lui negativ (insula pe interior; linia pe dreapta; gaura fără dog-bone), care trebuie
  să arate greșit și în cifră, și în poză. Bancul pică dacă o cifră nu e cea de pe hârtie, dacă traseul nu cade pe
  punctele de pe hârtie, sau dacă un martor arată bine. Pagina: `dist/banc/index.html`, publicată la `/banc/`.
  Văzut: la zoomul foii întregi, martorul plăcii 2 arăta ca originalul (1,24 mm); de aici detaliul mărit;
- `scripts/otravuri.py`: unealta generală (verifica, baza, lot, doua, plin, tinte, e2e), cu restaurarea verificată pe
  sha256 și la capăt față de HEAD (`git hash-object`), refuzul în dosarul din Drive (probat în ambele sensuri: refuză în
  repo, merge în clonă; prima variantă refuza și clona din scratchpad, a doua, scrisă prin heredoc, nu mai prindea `\`);
  listele 2.3c în `test/otravuri/` (70 + 45, toate se aplică); probată cap-coadă în clonă (S13, M11 prinse de testele lor).
  `docs/otravuri.md`: unealta, regulile, listele.

## 2026-10-16 — Etapa 3, felia 3.1: jurnalul de erori pe server (Model: Claude Opus 5.5)

**Prompt:** „Continuăm CNC Vector Studio 2 (Apps\cncvs2). Citește CLAUDE.md, ultimele intrări din DEVLOG.md (16.10) și
fișa docs/etape/etapa-02.md. Starea: etapa 2 are toate feliile gata, în afară de 2.8e, verificarea independentă a
panoului de proprietăți și a traseului pe WebGL2, care pornește după resetarea săptămânală din 17.10. Plăcile 1 și 2 sunt
la mine pentru tăiere. Lucrăm în pași mari, cu commit, publicare pe test și raport la fiecare. Agenții doar cu acordul
meu și cu costul spus înainte.” **Started:** 16.10 18:25, săptămânalul la 91 %. Clasa R2, estimarea 1 felie (P0 are 3).
**Alegerea:** etapa 2 nu mai are nimic fără agenți. Cu plăcile 1 și 2 netăiate, `PLAN.md` §4.6 (punctul 7) cere felii fără
mașină, deci etapa 3 pornește cu observabilitatea (P0), nu cu senderul. Golul găsit în etapa 2 (alegerea pe contur din ADR
0035, neluată de ADR 0038) cere selecția în piesă, deci e propus pentru etapa 6.
**Completed:**
- fișa `docs/etape/etapa-03.md` (feliile 3.1–3.9, coloana „Mașina”, ordinea cu plăcile netăiate, coada owner-ului);
  ADR 0039 (contractul deciziilor deja aprobate, fără alegeri noi);
- `shared/erori.ts`: contractul comun (tipurile, plafoanele, validarea raportului, descrierea valorilor aruncate,
  normalizarea și cheia amprentei, IP-ul ultim din `X-Forwarded-For`, fereastra pe oră); jurnalul local îl folosește acum
  pentru tipuri, plafoane și tăietură (comportamentul neschimbat; pornirea rămâne 98,7 / 100 kB). 9 teste unitare;
- `functions/` (codebase-ul `cncvs2`, Node 24, `firebase-functions` 7.4.0, `firebase-admin` 14.5.0, compilat cu tsc-ul
  repo-ului în `lib/`): `errorLogs/{amprenta}` cu `aparitii`, într-o tranzacție (contoarele plafonului, grupul creat sau
  numărat și redeschis, apariția); `logServerError` care nu aruncă și cere `uid`; `logClientError` în `europe-central2`, cu
  App Check impus, plafon 40 / oră pe IP (hash) și 2 000 / oră global, răspuns `{ ok }`;
- `firestore.rules`: totul refuzat implicit, jurnalul citit doar de personal (`staff/{uid}`), scris de nimeni din client;
  probat pe emulator, **nepublicat** (pe test rămân regulile vechi, care refuză deja `errorLogs`; regulile noi pleacă cu
  fila Erori, 3.3, ca repetiția comutării să pornească tot de la build-ul vechi cu regulile lui);
- `npm run test:emulator` (Firestore + Functions pe `demo-cncvs2`, Java din JBR-ul Android Studio când `java` e 1.8): 12
  teste (gruparea și redeschiderea, oamenii până la 50, plafonul pe IP cu IP-ul ultim, plafonul global, raportul nevalid,
  instanța pusă de server, `logServerError` cu `null`, context circular și Firestore căzut, callable-ul 401 / 200, regulile
  pe roluri, scrierea refuzată tuturor, `staff`, colecțiile vechi). **12 sabotaje, câte unul pe test, toate prinse.**
  Instrumentul a mințit întâi: cu un filtru de nume care nu prindea niciun test din fișierul regulilor, `after` rula fără
  `before` și număra un eșec fals la fiecare sabotaj; martorul (fără sabotaj) a picat și el, de aici reparația;
- licențele: și `functions/package-lock.json` (247 de pachete de rulare); `limiter` (MIT în forma veche, `licenses`) se
  citește din `package.json`-ul instalat. Regulile de import citesc și `functions/` (o încălcare pusă de probă e prinsă);
- CI: în nivelul rapid, dependențele și tipurile funcțiilor; în cel complet, Java 21, Firebase CLI 15.18.0 fixat și
  testele pe emulatoare.
- **publicat pe test** (`npm run publica:functii`, doar `functions:cncvs2`; cele 32 de funcții vechi neatinse). Trei
  treceri: (1) construcția din cloud n-a găsit `lib/functions/src/index.js`: în `firebase.json`, `src` (semantica
  `.gitignore`) prindea și `lib/functions/src`; acum `/src`, `/test`, cu testul `functii.pachet.test.ts` (pică pe modelele
  vechi), pe `ignore` declarat explicit; (2) funcția a răspuns 403 de la frontul Google: firebase-tools pune invocarea
  publică a unui callable doar la creare (codul lui, `fabricator.js`), iar crearea picase la construcție; (3) ștearsă și
  creată din nou. **Măsurat:** `logClientError` întoarce 401 fără App Check și 401 cu un token nesemnat (pe care
  emulatorul l-ar fi primit). 200 cu un token adevărat se măsoară în 3.2, cu cheia reCAPTCHA a domeniului de test.
  Suita unitară: 6 456 de teste (cele 6 447 din CI + 9), 0 picate; cele 8 sărite sunt amânările „aplicația nu taie încă”.
  **Completed:** 16.10 19:50 (orele corectate după ceasul mașinii), ~1,5 h, săptămânalul 91 → 92 %. Treceri: 4 (contractul, codul cu testele și sabotajele, CI-ul,
  publicarea).

## 2026-10-16 — Etapa 3, felia 3.3: personalul, fila Erori și Diagnoza (Model: Claude Opus 5.5)

**Prompt:** „Da, continuă cu 3.3.” (la „Continui cu felia 3.3 (personalul și fila Erori)?”); pe parcurs: „nu imi mai cere
permisiune si continua cu ce ai nevoie”. **Started:** 16.10 20:15. Clasa R2, estimarea 1–2 felii.
**Completed:**
- ADR 0040: ruta `/admin` la cerere, înaintea deschiderii proiectului; login Google cu configurația instanței de la gazdă;
  rolul din `staff/{uid}`; fila Erori; Diagnoza minimă; TTL-ul; CSP-ul; probele pe emulatoare. Două abateri de la plan,
  spuse: primul owner se scrie din consolă (fără credențiale Admin locale), amprenta `meta/deployment` vine cu pipeline-ul
  (3.4);
- server: `marcheazaEroarea` (rolul citit din `staff` în tranzacție, auditul `audit/{id}` cu valoarea dinainte, aceeași
  valoare nu scrie, refuzurile cu motiv, căderea în jurnal), regula auditului (admin / owner), indexul compus și TTL-ul pe
  `expiraLa` (`firestore.indexes.json`); `shared/personal.ts` (scara rolurilor);
- client: `src/cloud/conexiune.ts` (Firebase din `config.json`, emulatoarele și furnizorul App Check de probă doar pe
  gazda locală), `src/admin/` (pagina, fila Erori cu filtrul, detaliul, aparițiile și „Rezolvat”; Diagnoza cu 7
  verificări, între ele apelul fără App Check la `logClientError`, care trebuie să dea 401), mesajele en / ro la cerere;
  CSP-ul cu originile Firebase ale celor două proiecte (fără `*`), rescrierea `/admin` pe hosting; `config.json` de pe test
  primește configurația web la publicare, din `apps:sdkconfig` (nu stă în repo);
- poarta de mărime: bucata `/admin` (164 kB gzip, cu Firebase) are plafonul ei (200 kB) și nu intră în totalul aplicației,
  fiindcă aplicația n-o descarcă; poarta cere ca adminul să fie exact o bucată separată. Pornirea: 98,7 → 99,0 / 100 kB;
- teste: 17 pe emulator (3 noi de marcare și unul de audit), 3 e2e pe emulatoare (login-ul emulatorului de Auth, contul
  fără rol cu uid-ul, rolul, filtrul, detaliul, „Rezolvat” cu auditul, Diagnoza), 3 e2e fără configurație (unul cu
  martorul lui: adminul nu ia blocarea proiectului), 13 unitare. **7 sabotaje** (orice cont ca personal, filtrul gol, fără
  App Check de probă, proba Diagnozei cu App Check, adminul care ia blocarea, auditul lipsă, rolul neverificat): toate
  prinse. Martorul unui test e2e a picat întâi: primul apel al callable-ului după pornirea emulatorului de funcții trece de
  5 s, deci și un sabotaj fusese „prins” din motivul greșit; termen de 30 s pe acel pas, apoi sabotajul prins unde
  trebuie. Încă o capcană a instrumentului: `| head` după `npm run rapid` tăia rularea și dădea ieșirea 0 a lui `head`;
  rulat din nou cu codul real: 6 469 de teste, 0 picate, aceleași 8 sărite. E2e-ul întreg: 85 / 85;
- **publicat pe test:** funcțiile (`marcheazaEroarea` creată, deci publică), regulile noi (cele vechi înlocuite, cum cere
  planul), indecșii (cei 3 vechi și suprascrierea veche neatinși, fără `--force`), hosting-ul. În browser, pe test:
  `/admin` arată butonul Google; la clic, scripturile `apis.google.com` și cadrul `/__/auth/iframe` se încarcă sub CSP,
  fereastra o blochează doar panoul browserului meu, fără nicio eroare în consolă. Login-ul și primul owner sunt ale
  owner-ului.
**Completed:** 16.10 20:55.

## 2026-10-16 — Etapa 3, felia 3.4a: backup-ul zilnic și marcajele de rulare (Model: Claude Opus 5.5)

**Prompt:** „Da, pregătește 3.4 (backup-ul și marcajele).” **Started:** 16.10 21:35, săptămânalul la 93 %. Clasa R2.
**Completed:**
- ADR 0041: `backupZilnic` (03:00, ora României) pornește exportul întregii baze în `BUCKET_BACKUP/firestore/<ora>` și
  notează operația; `verificaBackup` (05:00) o cere terminată, fără eroare, și de azi. `BUCKET_BACKUP` e parametru pe
  proiect (`functions/.env.cncvectorstudio-test`); lipsă sau greșit = eșec cu motivul. 3.4 împărțită: 3.4b (publicarea
  pe live, WIF, `meta/deployment`, contul de serviciu dedicat) cere conturile owner-ului;
- marcajul de rulare `marcaje/{job}` (`cuMarcaj`): pornirea înainte de lucru, reușita (contorul 0, `detaliu` înlocuit)
  sau eșecul (contorul la rând, eroarea, rândul `job:<nume>` în fila Erori, adică alarma); nu aruncă;
- judecata pură (`shared/joburi.ts`): niciodată / rulează / pornit fără final / eșecuri la rând / fără succes / vechi
  (1,1 × intervalul + 2 h, rotunjit: în double ieșea 28,400000000000002) / un eșec / bine; un câmp de timp de alt tip face
  marcajul nevalid. Diagnoza judecă fiecare job din `JOBURI`, deci și pe cel fără marcaj;
- regula `marcaje` (personalul citește, nimeni nu scrie din client);
- teste: 23 pe emulator (5 noi pe joburi, cu un client de export fals; unul pe regula marcajelor), 3 e2e pe emulatoare
  (Diagnoza: un job cu succes, unul fără marcaj), 7 unitare pe judecată și unul în Diagnoză. **10 sabotaje**, fiecare prins
  de exact testul lui, martorii trecuți. Emulatorul a prins un defect pe care tipurile nu-l vedeau: `import { v1 } from
  '@google-cloud/firestore'` cădea la rulare în ESM (pachetul CommonJS nu exportă `v1` numit); acum prin `require`, la
  prima rulare. Nivelul rapid: 6 476 de teste, 0 picate; `/admin` 165,7 / 200 kB;
- **publicat pe test:** cele două joburi create (36 de funcții pe proiect: 32 vechi, 4 noi), regulile, hosting-ul. Prima
  rulare reală: 17.10 la 03:00 și 05:00; dacă contul de serviciu implicit n-are dreptul de export, apare în fila Erori și
  în Diagnoză.
**Completed:** 16.10 22:20.

## 2026-10-17 — Etapa 2, felia 2.8e: probele independente ale panoului și ale traseului (Model: Claude Opus 5.5)

**Prompt:** „Da, pornește 2.8e mâine după resetare, cu costul spus.” (16.10 seara; pornită de programarea din sesiune, la
17.10 11:07). **Started:** 17.10 11:10, săptămânalul la 1 % (resetat), fereastra de 5 ore la 14 %. Bugetul anunțat:
1,5–3 M în total.
**Primul backup pe test (ADR 0041), citit înainte de agenți:** ambele joburi au pornit la oră (`backupZilnic` 03:00,
`verificaBackup` 05:00), dar exportul n-a pornit: `backupZilnic` → `7 PERMISSION_DENIED: The caller does not have
permission` (contul de serviciu implicit, `210091034164-compute@developer.gserviceaccount.com`, n-are `Cloud Datastore
Import Export Admin`); `verificaBackup` → „niciun export pornit de backupZilnic”. Ambele eșecuri sunt în marcaje
(`esecuriLaRand: 1`) și în `errorLogs` (`job:backupZilnic`, `job:verificaBackup`): alarma a funcționat cum scrie în ADR.
`firestore:operations:list` confirmă: singurul export e cel din 08.10. Pasul de IAM e al owner-ului. (Citirea marcajelor:
GET prin clientul API al firebase-tools, cu identitatea CLI-ului; `functions:log` nu arată eșecul, fiindcă jobul nu aruncă.)
**Agenții (pornite la 11:55):** A (oracolul stratului) în repo, pe portul 4173; B (recenzia) într-o clonă în afara Drive-ului, pe portul
4174; C (otrăvurile) după A, în clona lui (serial, cum cer regulile), ca build-urile și Edge-ul să nu se calce.
**Pasul de IAM (owner, 17.10 ~12:00):** rolul `Cloud Datastore Import Export Admin` adăugat contului de serviciu implicit;
verificat în politica IAM a proiectului (citire). Contul avea deja `roles/editor`: „Editor” singur NU dă dreptul de export
(de aici `PERMISSION_DENIED`). Pornirea manuală a jobului din sesiune a fost refuzată de clasificatorul de permisiuni
(credențialele CLI-ului folosite programatic), deci prima rulare cu rolul e mâine la 03:00 (sau „Force run” din consolă,
de owner).
**B, recenzia (terminată 17.10 ~12:15, ~0,27 M):** 7 constatări, fiecare cu un test care pică pe codul de azi, în clona
`scratchpad/clona-28e-b` (`test/unit/recenzie28.test.ts`: R1, R1b, R2; `test/e2e/recenzie28.spec.ts`: C1, C2, C2b, C3,
C4, C7): F1 (gravă) valoarea scrisă se pierde la ieșirea din câmp printr-un clic pe pânză (câmpul se demontează la
schimbarea selecției înainte de blur); F2 colțul X nu ajunge exact (3,577 → 3,576999999999998; reconfirmarea face o comandă
de 1,8e-15 mm); F3 refuzul CAM-ului rămâne pe ecran după reparare și traseul nu se mai poate opri; F4 contextul WebGL pierdut
și nerefăcut → nimic desenat, niciun cip; F5 cipul „Se calculează” nu apare (CAM-ul pornește înaintea randării), iar sub el
traseul vechi nu e stins; F6 culorile vechi după schimbarea temei; F7 bugetul numără segmentele, nu vârfurile din GPU. Respinse
cu dovadă: numărul, plafoanele, rotirea, fila care citește, precizia float32 (≤ 0,006 px), scurgerile. De verificat pe cod și
reparat după A, fiecare cu testul lui.
**A, oracolul stratului (terminat ~12:50, ~0,31 M):** `test/oracles/strat-traseu.ts` (zero importuri; G-code → pixeli, cele
4 origini, săgeata arcelor ≤ ½ px) și `test/e2e/traseu.oracol.spec.ts` (13 teste: 7 pe hârtie, 6 în Edge pe programul
exportat): ±1 px, fără goluri (1,5 px) și abaterea medie ≤ ½ px pe primitivă (adăugată: fără ea, decalajul de 1 px trecea).
Măsurat: dreptunghiul 0,725 px max / 0,244 medie; cercul la 2 440 mm, 1 000 px/mm, 0,979 / 0,305; linia pe linie 0. Martorii
negativi (±1 px, raza × 1,01, rapidele ca tăieri, arcul întors) pică pe pixelii reali; 32 de sabotaje pe oracol, toate
prinse (lista: `test/otravuri/strat-traseu.oracol.sabotaje.ts`). Limita spusă: precizia relativă la bucată nu se dovedește
doar cu ±1 px (rămâne probată numeric de recenzie: ≤ 0,006 px).
**Integrarea B (cele 7 constatări, fiecare cu testul ei, care pica și trece acum):** F1 câmpul aplică în faza de captură a
apăsării (înaintea pânzei); F2 colțul e o mărime derivată (`x + t`): afișat rotunjit la 1e-9 mm (`valoareDerivata`), iar o
deplasare sub 1e-9 mm nu e o comandă (încercarea de a ateriza exact, căutând originea pe ulp, a mers la 0°, dar la 30° valoarea
exactă adesea nu există: grila lui `x` e mai rară decât a colțului); F3 refuzul se ascunde ca traseul și devine „vechi” după o
schimbare; F4 T montează un strat nou când stratul nu e „ok”, iar contextul nerefăcut în 5 s devine „WebGL2 indisponibil”
(C3 adaptat la intenția scrisă de recenzent: „ori desenează, ori un cip”; probat că pică pe codul vechi); F5 calculul după
cadrul următor, traseul vechi stins sub „se calculează”; F6 stratul redesenează la schimbarea temei; F7 bugetul pe vârfurile
din GPU (oprirea rărit rămâne pe segmente: vârfurile nu scad monoton). Precizările, în ADR 0038. Nivelul rapid: 6 479 de
teste, 0 picate; e2e 104 / 104. **Pornirea: 99,1 / 100 kB** (strâmt).
**C, otrăvurile (terminat ~14:00, ~0,26 M):** 44 rulate, 0 VOID: 23 prinse, 21 scăpate (2 echivalente cu dovadă, C03 și A08;
19 găuri). Integrarea: 18 teste noi (`test/unit/otravuri.28.test.ts`: N07, N11, A19, A22, T03, T04, T11, T12, T17, T20;
`test/e2e/otravuri-28.spec.ts`: P01, P02, P03, P06, C04, C05, C07, S02, S06, AP07) și oracolul reparat pentru S07 (rapidele
vs tăierile pe RGB, nu și pe alfa). P03 și T11 refăcute pe codul de după reparații. Fiecare test probat pe otrava lui într-o
clonă de la `d6412b1` (`tinte` / `e2e`, restaurare pe sha): 21 / 21 prinse. T12 a scăpat întâi de două ori (paritatea
dublărilor, apoi otrava schimba doar argumentul): testul cere acum și ca șirurile întoarse să fie ale toleranței întoarse.
S02: zoomul trebuie făcut într-un punct al pânzei calculat din vedere (colțul ferestrei cădea peste bare).
**Completed:** 17.10 14:45. Costul 2.8e: agenții ~0,86 M (A 0,31, B 0,27, C 0,26), plus integrarea; săptămânalul 1 → ~24 %.
Nivelul rapid: 6 487 de teste, 0 picate; e2e 112 / 112; pornirea 99,1 / 100 kB.

## 2026-10-17 — Interfață: loc în pachetul de pornire (Model: Claude Opus 5.5)

**Prompt:** „atunci tu continua” (după raportul 2.8e; ultracode pornit). **Started:** 17.10 ~14:55, săptămânalul ~24 %.
Felie fără mașină (`PLAN.md` §4.6, punctul 7): pornirea e la 99,1 / 100 kB, deci orice funcție nouă de interfață s-ar
lovi de plafon. Ținta: sub ~90 kB, fără schimbare de comportament. Workflow: măsurătoarea, 3 propuneri independente,
judecătorul, implementarea, 3 verificatori adversariali (estimat 2–3 M).
**Workflow (terminat ~18:00, ~2,59 M):** măsurătoarea, 3 propuneri independente, judecătorul, implementarea, 4
verificatori. Pornirea 99,1 → 92,1 kB: o singură bucată la pornire (`codeSplitting.groups`), ferestrele exportului,
importului și panoului cu calculul lor (`actiuniDocumentCalcul.ts`, înregistrat la evaluare), schemele documentului în
`schemaDocument.ts`, dicționarul limbii active și alegerea cu clicul la cerere, orientarea conturului separată
(`conturBaza.ts`). ADR 0042.
**Integrarea (cele 9 constatări ale verificatorilor):** remediate 7, fiecare cu proba ei, care pică pe sabotajul
remedierii (4 sabotaje în e2e, plus ușa: un import al offsetului în `incarcare.ts` duce poarta la 1): limba aleasă nu se
mai abandonează după 4 s (prima venită pornește aplicația, cea aleasă o înlocuiește când sosește; termenul total 30 s);
ultimul clic de limbă câștigă; pagina „fără texte” cu `lang` pe fiecare jumătate și focusul pe Reîncarcă; otrava C01
repusă pe `conturBaza.ts` (devenise VOID); ușa unui proiect salvat plafonată la 8 kB, pornirea cu ușa la 100. Rămân, scrise
în ADR 0042 §6: o tragere terminată și o tastă dată înaintea sosirii alegerii (~1 s pe Fast 3G). Capcana zilei: e2e-ul
servește `dist/`, iar `npm run rapid` nu-l reface (poarta construiește în altă parte): prima rulare verde era pe un build
de dinaintea remedierii, refăcută.
**Completed:** 17.10 19:00. Costul: workflow-ul ~2,59 M plus integrarea; săptămânalul ~24 → 29 %. Nivelul rapid: 6 504 de
teste, 0 picate (8 sărite); e2e 125 / 125; emulatorul 23 + 3; pornirea **92,3 / 100 kB**, cu ușa 96,9.

## 2026-10-17 — 3.2: raportorul de erori din client (Model: Claude Opus 5.5)

**Prompt:** „continua” (după raportul despre cheia reCAPTCHA; ultracode pornit). **Started:** 17.10 ~20:45, săptămânalul
~29 %. Pe test, API-ul reCAPTCHA Enterprise e pornit și cheia „App Check cncvs2 (test)” creată (17.10); înregistrarea ei
în App Check a refuzat-o clasificatorul de două ori, deci rămâne pasul owner-ului: până atunci, pe test raportorul
primește 401 (măsurarea „200 cu token” vine după înregistrare și o republicare). Workflow: implementarea, apoi 4
verificatori adversariali (corectitudinea, securitatea și CSP-ul, pachetul, probele); estimat 1,5–2 M.
**Pauză:** 17.10 ~23:45, la cererea owner-ului („o sa facem pauza cand se poate safe”), pe ramura `wip/3.2-raportor`.
Starea: implementarea (workflow 1, ~1,05 M, cu 4 verificatori: 25 de constatări) și cele 13 remedieri (workflow 2,
agentul de remediere) sunt în arbore, cu porțile verzi raportate de agent (rapid 6 571 / 0 picate, e2e 134, emulatorul
23 + 6), dar nereluate de integrator. Reverificarea „remedieri” a găsit 6 constatări (una mare: marcajul „doar local” pe
dicționar e prea larg, deci o publicare cu bucățile `mesaje.*` lipsă ar trece nevăzută; „fara-memorie” prinde orice
excepție; cheia locală nu grupează id-urile; inactivitatea probată doar 3,5 s; carantina ocolibilă pe adresa contului;
curățarea scapă `HTTPS://`, `wss://`, paranteze). Reverificarea „otrăvuri” a fost oprită la pauză. **De reluat:**
constatările reverificării (journal: `wf_42e7cb55-de1`), otrăvurile din nou, porțile, ADR 0043, publicarea pe test și
măsurarea „200 cu token” (App Check e înregistrat pe test de owner, 17.10).
**Reluare:** 18.10 ~08:20, la „continua” (sesiune nouă, după pauză; raționamentul refăcut din DEVLOG și din jurnalul
workflow-ului). Backup-ul de noapte a mers: `backupZilnic` 03:00 succes, `verificaBackup` 05:00 a găsit exportul terminat.
**Reverificarea, remediată (integratorul):** marcajul „doar local” îngustat la mediul omului (`eroareDeMediu`: date blocate,
fereastra privată, discul plin, profilul stricat; IndexedDB lipsă; termenul), deci dicționarele și ușa care nu vin,
`VersionError` și excepțiile codului pleacă la server; cheia locală grupează id-urile (cuvintele cu cifre sau cu forma unui
id devin `#`), liniar; curățarea pe orice protocol, cu parantezele, `%40` și poziția din stivă păstrată; carantina
emulatoarelor pe adresele întregi (backslash-ul din adresa contului ocolea `new URL`); inactivitatea probată cu ceasul fals.
3 e2e noi și 6 unitare noi, toate picate întâi pe codul vechi; 12 sabotaje, toate prinse (unul abia după întărirea probei:
eșecul total al dicționarelor). Partea raportorului din pornire trecuse la 1,52 kB (peste 1,5): construirea și curățarea
raportului s-au mutat în bucata la cerere → 1,20 kB. **A doua rundă de otrăvuri** (`test/otravuri/3.2.py`, clonă în afara
Drive-ului): 31 (11 scăpate în prima rundă, reaplicate; 20 noi pe remedieri), 30 prinse; N11 (reîmprospătarea App Check)
a primit o plasă pe sursă: 31 / 31. Agentul de otrăvuri oprit la pauză n-a fost reluat (lista am scris-o eu, pe remedierile
agentului, nu pe ale mele, care au avut sabotajele lor).
**Pe test (măsurat în browser, 18.10 ~08:55):** publicarea pune cheia în `config.json`; fără eroare, nimic adus; la o eroare
provocată: bucățile raportorului, `enterprise.js`, schimbul App Check 200, `logClientError` **200**, grupul în `errorLogs`;
fără App Check (curl): **401**. Consola: doar eroarea provocată, nicio încălcare de CSP.
**Completed:** 18.10 09:05. Commit-ul feliei pe `main`: squash din `wip/3.2-raportor`. Costul: workflow-ul 1 ~1,05 M, workflow-ul 2
(remedierile + o reverificare + o reverificare oprită) nemăsurat separat; săptămânalul 29 → 44 % (cu bucla principală și cu
sesiunile paralele). Nivelul rapid: 6 577 de teste, 0 picate (8 sărite); e2e 137 / 137; emulatoarele 23 + 6; pornirea
**93,5 / 100 kB** (cu ușa 98,1, strâmt), partea raportorului 1,20 kB, la prima eroare 17,9 kB + reCAPTCHA.

## 2026-10-18 — 3.4b: publicarea pe live, partea fără conturi (Model: Claude Opus 5.5)

**Prompt:** „Continua” (după raportul 3.2; la întrebarea „Ce urmează în etapa 3?”, recomandarea era 3.4b). **Started:** 18.10
~09:15, săptămânalul 44 %. Partea care nu cere conturile owner-ului: amprenta `meta/deployment` pe ținte (scrisă de scriptul
de publicare, citită de Diagnoză), un singur script de publicare pentru ambele instanțe (live doar din workflow, în mediul
GitHub `live`), workflow-ul `publica` cu sha fixat (pe `main`, nivelul rapid verde, iar pe live același sha ca pe test),
contul dedicat al backup-ului (opțional, din `.env`), scriptul de Cloud Shell pentru WIF / conturi / PITR. Fără agenți.
**Făcut:** amprenta `meta/deployment` pe ținte (`shared/publicare.ts`; scrisă prin REST cu masca țintelor publicate,
`scripts/amprenta.ts`; regula: citire pentru personal, nicio scriere), verificarea „Publicarea” din Diagnoză (după build:
alt proiect, alt build, server din alt commit, necomis = eșec pe live), `scripts/publica.ts` pentru ambele instanțe (live
doar din workflow, în mediul `live`, cu sha-ul cerut și checkout-ul curat; hosting-ul doar cu `dist/` al commit-ului),
`publica-test.ts` / `publica-functii.ts` peste el, workflow-ul `publica` (sha pe `main`, rapid verde, pe live același sha
publicat întreg pe test; WIF, `google-github-actions/auth` v3.0.0 și firebase-tools 15.18.0 fixate), versiunea din build din
checkout (nu din `GITHUB_SHA`, care la `workflow_dispatch` e capul lui `main`), `SA_BACKUP` opțional, scriptul de Cloud Shell
(`scripts/wif/pregateste-proiect.sh`). ADR 0044. 10 sabotaje, toate prinse.
**Pe test (măsurat):** serverul și hosting-ul publicate cu scriptul nou; garda a refuzat întâi un `dist/` construit înaintea
commit-ului; amprenta citită înapoi: toate cele 4 ținte din `ee1357454fb0`, din arborele curat; `verifica-test.ts` trece pe
acest sha și refuză altul. GitHub a citit workflow-ul (`publica`, activ). Nerulat: workflow-ul însuși (cere WIF și mediile).
**Completed:** 18.10 11:35. Fără agenți. Nivelul rapid: 6 598 de teste, 0 picate (8 sărite); e2e 137 / 137; emulatoarele
24 + 6; pornirea 93,5 / 100 kB (neschimbată), `/admin` 168,0 kB.
**Pașii owner-ului pe test (18.10 ~12:30):** scriptul de Cloud Shell rulat (WIF, `publicare-cncvs2`, `backup-cncvs2` cu
drepturile pe bucket, verificate prin GET), mediul GitHub `test` cu variabilele (două erau inversate; schimbate de asistent,
la cererea owner-ului). **Prima rulare a workflow-ului `publica` pe test:** WIF a mers din prima; a căzut la verificarea Blaze
a firebase-tools (cu un cont de serviciu, API-ul Cloud Billing trebuie pornit în proiect): pornit pe test, adăugat în
scriptul de Cloud Shell, reluată → verde, amprenta a workflow-ului. Tot ea a arătat că `SA_BACKUP` din `process.env` nu
ajunge la analiza funcțiilor (joburile rămăseseră pe contul implicit): acum e parametru (`defineString`), emulatoarele au
`SA_BACKUP=` explicit (o valoare implicită goală = „nicio valoare”: emulatorul o cerea la tastatură și se agăța).
**A doua rulare (`1fe4dcc`, rulare 39120923857):** verde; joburile de backup rulează cu `backup-cncvs2`, callable-urile cu
contul implicit; amprenta: toate țintele din `1fe4dcc`, arborele curat, `github:AndreiBesliu`. Prima rulare a backup-ului
cu contul nou: 19.10, 03:00 / 05:00 (de verificat dimineața, în marcaje).

## 2026-10-18 — PWA: aplicația pornește fără rețea (etapa 4, punctul 7; Model: Claude Opus 5.5)

**Prompt:** „Pwa offline” (la propunerea feliilor fără mașină, cu plăcile netăiate: `PLAN.md` §4.6, punctul 7). **Started:**
18.10 ~14:20, săptămânalul 50 %. Workerul la `/sw.js` (ia locul opritorului de azi, șterge cache-urile `cncvs-`), toată
aplicația în cache în afară de Firebase (raportorul, `/admin`), `config.json` din rețea cu cache de rezervă, actualizarea
oferită, nu impusă (blocarea în timpul jobului vine cu senderul), înregistrarea la cerere (pornirea rămâne 98,1 / 100 cu
ușa). Workflow: implementarea, apoi 2 verificatori (offline și actualizarea; pachetul, securitatea și otrăvurile); estimat
~1,1 M.
**Workflow 1 (~0,79 M):** implementarea (vite-plugin-pwa 2.0.0, `injectManifest`, `src/sw.ts`, workbox 7.4.1 fixate;
`public/sw.js` scos, workerul nou la aceeași adresă) și 2 verificatori: 12 constatări, una mare (găsită de ambii): ruta
navigărilor dădea aplicația pentru `/__/auth/handler`, deci login-ul Google de pe `/admin` (authDomain pe aceeași origine)
ar fi primit aplicația în popup; medii: `/admin` blocat după o publicare, `config.json` lipsă offline după o singură vizită,
raportorul stins după o publicare. **Workflow 2 (~0,49 M):** remedierile (navigările pe listă albă: doar `/` și
`/index.html`; copia `config.json` la instalare; raportorul în precache, afară doar pagina `/admin`; mesajul `/admin` fără
rețea; golurile din probe) și o reverificare: scenariile nu se mai reproduc; 5 constatări scăzute, integrate de mine
(termen de 10 s pentru copia de la instalare, majusculele în probă, titlul ADR-ului, legătura din `main.tsx` scrisă ca gol
cunoscut). ADR 0045 acceptat.
**Pe test (măsurat în browser, 18.10 ~21:45):** workflow-ul `publica` (rularea 39154648776, reluată o dată după o cădere de
rețea la API-ul indecșilor) a pus `f28a156`; prima încărcare: workerul activ la `/sw.js` (opritorul înlocuit), precache 32
de fișiere, copia `config.json`, pagina necontrolată (fără `clients.claim`); a doua: controlată, pagina și cele 22 de
bucăți din cache, 0 octeți din rețea; `/__/auth/handler` vine de la Firebase (scripturile lui), `/admin` din rețea, cu
login-ul. Offline adevărat nu se poate comuta în panoul browserului: probat în e2e (`edge-pwa`).
**Completed:** 18.10 21:50. Costul: workflow-urile ~1,28 M plus integrarea (estimat ~1,1 M). Nivelul rapid: 6 648 de
teste, 0 picate (8 sărite); e2e 148 / 148 (o rulare intermediară: un `EBUSY` al lui Drive pe un fișier descărcat, trecut la
reluare); emulatoarele 24 + 6; pornirea 93,9 / 100 kB, cu ușa 98,5 (strâmt).

## 2026-10-18 — Estimarea timpului jobului (etapa 4, punctul 5; Model: Claude Opus 5.5)

**Prompt:** „Pornește estimarea timpului jobului (etapa 4, punctul 5), la costul spus, într-o sesiune nouă.” **Started:**
18.10 ~21:55, săptămânalul 56 %. Clasa R2 (`estimare.md`, D6), adusă din etapa 4 (plăcile netăiate: `PLAN.md` §4.6, punctul
7). Modelul planificatorului GRBL 1.1h pe G-code-ul exportat (nu pe IR: GRBL planifică ce primește), profilul mașinii ca
date (implicitele 1.1h, înlocuibile cu `$$`), rezumatul în dialogul exportului, calculat în bucata lui la cerere. Probele
pe hârtie înaintea funcției; oracolul independent îl scrie un agent fără acces la `src/` (deși felia e R2: ediția întâi
avea un estimator autoconsistent, niciodată comparat). Estimat ~1–1,5 M (oracolul, un verificator).
**Făcut:** probele pe hârtie întâi (`test/unit/timp.test.ts`: T2 = 12,1667 s cu a = 100, 24,8333 s pe implicite; trapezul,
triunghiul, diagonala limitată pe axe, colțul de 90°, fereastra de 15 blocuri: 2,407036 s, cu 16: 2,362988; arcul: 78 de
segmente; pauza în pași de 50 ms), apoi modelul (`src/sim/timp.ts`, din sursa GRBL 1.1h descărcată), profilul ca date
(`src/ir/masina.ts`, `src/ir/masini/grbl11h.ts`, `$$`), secțiunile postului (eticheta IR cu `operatie`; octeții neschimbați),
rezumatul în dialog (timpul, pe operație, pe sculă, câmpul `$$`), în bucata calculului exportului. ADR 0046.
**Oracolul (agent, ~0,36 M):** `test/oracles/timp.ts` cu 16 cazuri pe hârtie și controale negative; a derivat singur fereastra
de 15 blocuri. Aplicația trece cazurile lui; pe corpus (plăcile pe două mașini, 300 de programe aleatoare pe profile aleatoare)
abaterea cea mai mare e ~10⁻¹⁴. Diferențele de refuz (M7 oprit din fabrică, G1 fără F scris explicit, grupurile modale, G80 cu
axe, plafoanele T / N / P): oracolul avea dreptate, aplicația le refuză acum la fel.
**Recenzia (un verificator, ~0,38 M):** niciun defect mare; remediate cu proba lor: M3 → M4 golește bufferul, M2 / M30
resetează modurile, o probă pe hârtie cu două operații (o rotire a timpilor între operații trecea), linia peste 79 de caractere
și valorile negative refuzate, `/` și paranteza ca în `protocol.c`, liniile limitate numărate pe linii (nu pe segmente),
plafonul de 10 M blocuri, motivul structurat, tabelele accesibile; scrise în ADR: legătura serială, `$1`, M1 (refuzat ales).
**Sabotajele** (`test/otravuri/timp.py`, clonă în afara Drive-ului): prima rundă 37 / 38 (A06, G2 cu startul în capăt: proba
cercului orar; A05 prins doar de termen, o buclă fără sfârșit: plafonul de 65 535 de segmente); pe codul final 48 / 48.
**Mediul:** `npm test` cu 31 de procese a căzut de două ori pe memorie (`VirtualAlloc failed`; memoria angajată 50,6 / 63,3 GB,
un joc deschis ține 17,5 GB): aceleași teste cu `--test-concurrency=8` au trecut; restul nivelului rapid, separat, verde.
**Completed:** 18.10 23:40. Costul: agenții ~0,74 M (oracolul 0,36, verificatorul 0,38), plus bucla principală; săptămânalul
56 → 59 %. Nivelul rapid: tipurile, importurile (14 / 14), 6 771 de teste unitare, 0 picate (8 sărite), build-ul determinist,
licențele; e2e 152 / 152 în Edge; emulatoarele 24 + 6; pornirea 93,9 / 100 kB (cu ușa 98,5, neschimbată), totalul 224,7 kB.

## 2026-10-19 — Timpul lângă traseu (estimarea, a doua parte; Model: Claude Opus 5.5)

**Prompt:** „continua” (în sesiunea estimării, după raportul ei). **Started:** 19.10 ~07:55, săptămânalul 59 %. Ce a rămas
fără mașină din rândul pragului („Timpul estimat, afișat imediat după fiecare calcul”): timpul în cipul traseului, după
fiecare calcul (tasta T), cu aceeași estimare ca rezumatul exportului; câmpul `$$` urcă din dialog în aplicație, ca
traseul și exportul să folosească același profil. Fără agenți.
**Făcut:** probele întâi (`test/unit/durata.test.ts`, pragurile 59,95 s și 3 599,5 s; `rezumat.test.ts`: `timpProgram` pe
programul de hârtie dă 11,394662 s, exact rezumatul exportului; e2e: cipul după T egal cu rezumatul, `$$` lipit îl schimbă,
documentul schimbat îl stinge, `$$` greșit îl face să spună linia). Apoi `timpProgram` (postul pe stânga-jos, Z0 sus, apoi
`rezumatJob`), cipul la cerere (`src/ui/CipTimpTraseu.tsx`; prima variantă, în `App.tsx`, urca pornirea cu 0,6 kB, la 99,1 cu
ușa), durata într-un singur loc (`src/ui/durata.ts`, textele în dicționarul traseului), `$$` urcat în aplicație. ADR 0046 §8
(amendează ADR 0038 §2: traseul la zi are acum cipul timpului). Capcana zilei: al treilea dreptunghi al probei cădea peste
primul, deci traseul era refuzat de regiunea păstrată (proba, nu codul): Ctrl+Z înainte de T.
**Completed:** 19.10 10:10. Fără agenți; săptămânalul 59 → 68 %, dar comun: în paralel rula sesiunea simulării, cu agenții ei
(65 % la pornirea ei, 08:05); contextul acestei sesiuni a ajuns la ~0,68 M, deci felia următoare, într-o sesiune nouă. Pe
GitHub, `main` primise între timp simularea (`e0bb1d4`, `80180d4`): unite printr-un merge, doar DEVLOG-ul în conflict. `npm run rapid` întreg verde (6 776 de
teste, 0 picate, 8 sărite); e2e 154 / 154; emulatoarele 24 + 6; sabotajele 55 / 55; pornirea 94,2 / 100 kB, cu ușa 98,8.

## 2026-10-19 — Simularea: nucleul CPU, felia 1 din 2 (etapa 4, punctul 2; Model: Claude Opus 5.5)

**Prompt:** „Pornește simularea, nucleul CPU, felia 1 (etapa 4, punctul 2), cu oracolul din sonda s4, la costul spus, într-o
sesiune nouă.” **Started:** 19.10 ~08:05, săptămânalul 65 %. Adusă din etapa 4 (plăcile netăiate: `PLAN.md` §4.6, punctul 7),
rândul „4.2↑”. Nucleul din ADR 0010 în `src/sim/` (câmp rar pe dale mici într-un atlas, dalele uniforme ca un singur număr,
calcul exact pe celulă, rândurile de dale intercalate pe bazinul de workere fără stare, ADR 0015), freza plată, bilă și V;
amprenta Node = Edge, la 1 fir și la mai multe, poartă în e2e; o previzualizare 2D a adâncimilor în dialogul exportului.
Oracolul îl portează din s4 un agent care nu vede nucleul (o clonă fără el), și intră în CI înaintea lui. Lucrul stă într-o
clonă în afara Drive-ului: în repo-ul din Drive scrie, în paralel, sesiunea timpului lângă traseu. Estimat ~1,5–2 M pentru
agenți (oracolul, 1–2 verificatori).
**Făcut:** oracolul întâi (`e0bb1d4`, agentul fără nucleu, ~0,40 M): `test/oracles/simulare.ts` (textul G-code, grila densă
Float64, celula / 8 pe arcul adevărat, „nucleul nu e niciodată mai sus cu peste 10 nm”, marja derivată), 18 piese pe hârtie,
cele 7 otrăvuri din s4 ca martori. Apoi probele nucleului pe corpusul lui și nucleul (`80180d4`): `src/sim/camp.ts` (dale de
16 × 16 în atlas, uniformele ca număr), `nucleu.ts` (portat din s4, exact pe celulă), `unghi.ts` (trigonometria doar cu + − ×
÷ √), `program.ts` (IR-ul, cu refuzurile), `banda.ts` (r mod N, amprenta pe rânduri), bazinul `src/jobs/`, regula
`bazinul-doar-simularea`; măsurat: dale de 16 → 612 ms / 37,6 MB, de 32 → 626 ms / 60,7 MB (jobul 2D al sondei, un fir).
Harta adâncimilor, materialul scos, cea mai adâncă tăietură în dialogul exportului (`f93d10b`); poarta Node = Edge în e2e prin
workerul construit, pe 1 și 4 fire. ADR 0047.
**Recenzia (doi verificatori, ~0,37 + 0,31 M):** nucleul fără material lăsat pe 32 900 de programe aleatoare și 779 din CAM;
remediate „prin foaie” în Float32 (12,7 / 19,05 mm), arcul ambiguu lângă pragul cercului întreg, amprenta (a doua jumătate
nu vedea 7 biți), raza capetelor, elicea (`3d297d7`); descărcarea care aștepta simularea (până la 9,8 s), workerul tăcut
refolosit, eșecurile în afara jurnalului, poarta e2e fără pixeli, marcajele căutate doar în pornire (`bad8474`).
**Otrăvurile** (`test/otravuri/simulare.py`, clone în afara Drive-ului): prima rundă 47 / 49 (P06, D03 → probe); a doua, pe
codul final, 60 / 61, D05 → proba workerelor oprite la închidere: 61 / 61.
**Mediul:** sesiunea timpului lângă traseu a scris în paralel în repo-ul din Drive și a publicat `f93d10b` pe test; munca de
aici s-a refăcut peste merge-ul ei (`564f1f5`), cu un singur conflict de importuri în `actiuniExportCalcul.ts`. Testele
unitare cu `--test-concurrency=8` (otrăvurile rulau în paralel); transpilerul Playwright strică clasele cavalier, deci partea
de Node a porții din dialog rulează într-un proces Node (`test/e2e/simulare-node.ts`).
**Completed:** 19.10 14:05. Costul: agenții ~1,08 M (oracolul 0,40, nucleul 0,37, integrarea 0,31), în estimarea de 1,5–2 M;
săptămânalul 65 → 74 % (comun cu sesiunea timpului). Tipurile (și ale funcțiilor), importurile (15 / 15), 7 001 teste unitare,
0 picate (8 sărite), build-ul determinist, licențele; e2e 161 / 161 în Edge; emulatoarele 24 + 6; pornirea 94,3 / 100 kB,
cu ușa 99,0 (strâmt), totalul 238,4 kB.

## 2026-10-19 — PWA: verificarea orară a versiunii noi (ADR 0045 §5; Model: Claude Opus 5.5)

**Prompt:** „Acum doar felia mică PWA (verificarea orară a versiunii noi), într-o sesiune nouă; simularea 3D după resetarea
din 24.10.” **Started:** 19.10 20:20, săptămânalul 81 % (bugetul feliei: ~1–2 %, fără agenți). Rândul „4.7↑b”: întrebarea
deschisă din ADR 0045 („Se redeschide dacă”, sesiunile lăsate deschise zile întregi), cu alegerea owner-ului:
`registration.update()` la fiecare oră, în bucata înregistrării (pornirea nu crește). Oferta rămâne cea de azi (anunțul din
bara de jos, reîncărcarea doar la clic); un eșec al verificării (offline) nu intră în jurnal. Probele întâi: unitare cu ceasul
fals, e2e în `edge-pwa` cu ceasul Playwright și o publicare simulată.
**Făcut:** `src/pwa/inregistrare.ts`: `update()` la fiecare oră (`INTERVAL_VERIFICARE_MS`) și când fila redevine vizibilă
după cel puțin o oră (fila înghețată de Edge, calculatorul adormit; ora pe `Date.now()`); ce găsește trece prin aceeași
ofertă; eșecul nu intră în jurnal, ora se scrie înaintea încercării (fără buclă). 6 probe unitare pe ceasul fals, 1 e2e
(publicarea simulată cu fila deschisă: 3 s fără ofertă, `fastForward` de o oră, oferta fără navigare); ambele văzute
picând înainte de funcție. ADR 0045 §5 (și Probele, Respinse, Neprobat, „Se redeschide dacă”).
**Sabotajele:** 8 / 8 (7 unitare, 1 e2e: intervalul implicit oprit), sursa restaurată, `cmp` identic. La prima rulare,
„ascunderea care verifică” a scăpat: proba ascundea fila înainte de prag; corectată, rerulate toate cele 7 unitare.
**Mediul:** ceasul fals al lui Playwright golește și `performance` (intrările de resurse), deci semnalul „înregistrarea a
rulat” e răspunsul bucății, văzut de Playwright (`fromServiceWorker`).
**Completed:** 19.10 20:50. Fără agenți; săptămânalul 81 → 81 % (sub 1 %). Tipurile (și ale funcțiilor), importurile,
7 012 teste unitare, 0 picate (8 sărite), build-ul determinist, licențele (`npm run rapid`, RC 0); e2e 162 / 162 în Edge;
emulatoarele 24 + 6. Pornirea 94,4 / 100 kB, cu ușa 99,0, ca pe HEAD (aceeași mărime brută a bucății de pornire); bucata
înregistrării 0,5 → 0,66 kB.

## 2026-10-19 — Documentația admin: roadmap-ul vizual și ghidurile, generate din repo (Model: Claude Opus 5.5)

**Prompt:** „vreau altceva, daca tot avem admin, sa avem acolo o sectiune cu un roadmap, un roadmap cu detalii, dar focusat
pe vizual.” + „si sa fie updatat constant” + „totodata vreau sa mentinem ideea de documentatie, una live si una admin, pe
care o aveam la vechiul cncvs”. **Started:** 19.10 ~21:00, săptămânalul ~76 %. Felia aceasta: în `/admin`, fila Roadmap
(etapele 1–30, feliile cu starea lor, plăcile, live-urile, ce așteaptă de la owner) și fila Documentație admin (ADR-urile,
fișele, pașii owner-ului), generate la build din `PLAN.md`, `docs/etape/`, `docs/adr/`, cu o poartă care pică dacă un tabel
nu se mai poate citi. Documentația live (manualul utilizatorului, en + ro, cu poarta de acoperire a acțiunilor) e felia
următoare, după resetarea din 24.10. Ca în ediția întâi (`DocsView` + fila Operare): un singur cititor de markdown. Workflow:
implementarea, 2 verificatori; estimat ~1,1 M.
**Pauză:** 19.10 ~22:45, la cererea owner-ului („sa faci pauza cand poti”), pe ramura `wip/documentatia-admin`. Starea:
implementarea gata, cu porțile verzi raportate de agent (rapid 7 062 / 0 picate, e2e 162 / 162, emulatoarele 24 + 9;
pornirea cu ușa 99,0 / 100, `/admin` 178,6 / 200 kB; documentația generată 59 de fișiere, 339 kB gzip, în afara
precache-ului). Verificatorii (corectitudinea și securitatea; aspectul) au fost opriți înainte să ruleze. **De reluat:** cele
2 lentile (journal `wf_182e563b-461`; `resumeFromRunId` merge doar în aceeași sesiune, deci verificatorii se pornesc din nou),
integrarea, merge pe main, publicarea pe test, capturile filei Roadmap pentru owner.
**Reluare:** 20.10 08:20 („neata”, apoi „Verifica tu”: owner-ul a ales verificarea fără agenți, în locul celor 2 verificatori
estimați la 4–6 % din săptămânal). Recenzia: codul feliei (generatorul și poarta, cititorul de markdown și linkurile, filele,
adresa din `#`, aducerea, poarta de pachet), apoi capturile în română (luminos, întunecat, telefon; cronologia mărită).
**7 reparații:** cronologia avea bare de 22 px, prea mici pentru o filă „vizuală”, acum coloane de 48 px (36 pe telefon)
umplute de jos; coloanele cu un număr dintr-o cifră ieșeau mai înguste (stilul global al butoanelor, `justify-content:
center`, lăsa coloana interioară cât textul; prima reparație, lățimea butonului, n-a schimbat nimic, văzut pe captura mărită); „ACUM” era mai
lat decât coloana și trecea peste chenarul etapei alese; mostra „viitoare” din legendă avea altă culoare decât barele; un
document nou se deschidea de la mijloc când erai derulat adânc în cel vechi (navigatorul e lipit sus; `scrollIntoView`
`nearest` nu mișcă un element care depășește ecranul în ambele capete), cu probă e2e; poarta nu prindea aceeași felie adusă
(`↑`) în jurnalele a două fișe, cu test; `X-Robots-Tag: noindex` pe `/documentatie/**` (documentele repo-ului public nu sunt
pagini ale produsului). **Date:** cererea „primul login” scoasă din fișa etapei 3 (făcută pe 19.10); testele pe lista owner-ului
(unitar și e2e) legate de fișă, nu de numărul 6, fiindcă lista se schimbă des. ADR 0048 acceptat; rândul 3.D în jurnalul etapei 3.
**Completed:** 20.10 08:58. Fără agenți la reluare; săptămânalul 82 → 83 %. `npm run rapid` RC 0 (7 062 de teste unitare, 0
picate, 8 sărite; build-ul determinist; licențele); e2e 162 / 162 în Edge; emulatoarele 24 + 9. Pornirea 94,3 / 100 kB (cu ușa
99,0), `/admin` 178,6 / 200 kB; documentația 59 de fișiere, 339 kB gzip, în afara precache-ului. Ultima reparație (lățimea
coloanelor, doar CSS) e probată pe emulatoare (24 + 9) și pe captură; rapid-ul o reia pe CI înaintea publicării.
**Publicat pe test:** 20.10, workflow-ul `publica` pe `c413d10` (după rapid-ul verde pe CI): versiunea `c413d10c14fd` în pachet,
`/documentatie/roadmap.json` servit cu `no-cache` și `X-Robots-Tag: noindex` (33 de rânduri de etape, 5 cereri ale owner-ului,
3.D în etapa 3). Capturile filelor (română; luminos, întunecat, telefon; Documentație) trimise owner-ului.

## 2026-10-20 — Personalul: roluri custom, invitații, conturi create de owner, un cont pe e-mail (Model: Claude Opus 5.5)

**Prompt:** „defapt, vreau sa pot crea conturi, sau ca userii sa poata crea conturi, si sa pot atribui roluri. Sau, sa creez
roluri custom si sa le atribui.” Deciziile owner-ului la întrebări: „Personalul /admin”, „Invitație pe e-mail” + „Cont cu
parolă creat de tine”, „Bife dintr-un catalog”, „Acum, fără agenți”. În timpul lucrului: „o sa vreau ca, in general, si pe
viitor, cand un user creeaza cont cu google, sa poata adauga si parola la cont. ca metoda de evitat dublarea contului la
crearea si cu google si cu user/password”. **Started:** 20.10 09:50, săptămânalul 83 %. Felia 14.A↑ (fila Admini din etapa
14, adusă în etapa 3, fără mașină; ADR 0049): catalogul de permisiuni, rolurile custom, invitațiile, conturile cu link de
parolă, fila Personal și fila Cont (metodele legate la același cont). Citit pe 20.10: furnizorul e-mail / parolă și „un
cont pe e-mail” sunt pornite pe test și pe live. Fără agenți; estimat 4–6 % din săptămânal.
**Ce s-a făcut:** catalogul de permisiuni (`shared/personal.ts`: erori.citeste, erori.rezolva, diagnoza.citeste,
audit.citeste, documentatie.citeste), `owner` fix; regulile citesc rolul din `staff/{uid}` și `roluri/{id}` la fiecare cerere
(fără copii de ținut la zi); `administreazaPersonalul` (8 acțiuni, doar owner-ul, auditul în tranzacție, ultimul owner păzit)
și `acceptaInvitatia` (doar pe adresa verificată din token); contul creat de owner fără parolă, cu linkul Firebase de setare
(o oră) și „Link nou”; `marcheazaEroarea` cere acum `erori.rezolva`. În `/admin`: filele după permisiuni, fila Personal,
fila Cont (metodele legate la același cont), intrarea cu parola și „Am uitat parola”. **Treceri:** (1) contractul, serverul,
probele; (2) probele aveau aceeași oră pe toate acțiunile (ordinea auditului la întâmplare) și „nicio invitație” ieșea ca
404 în consola paginii (acum un răspuns `{ ok: false }`); (3) emulatorul de Auth refuză `linkWithCredential` pe propria
adresă a contului (`EMAIL_EXISTS` în `signUp`, citit în sursa firebase-tools): parola se pune atunci cu `updatePassword` pe
contul deschis, verificată după `reload()`. Calea Google reală (fără rezervă) rămâne de probat pe test, cu contul owner-ului
(rând nou în „Ce îi trebuie owner-ului”). Butoanele din grilele filei Personal se întindeau pe tot rândul (văzut pe captură).
La recitirea de securitate: formularul „Adaugă un om” pornea cu `owner` ales când nu exista niciun rol custom (un clic
grăbit făcea pe cineva owner); acum rolul se alege explicit, cu proba e2e.
Probele scoase din numere fixe: lista owner-ului și feliile aduse (cresc cu fiecare felie).
**Completed:** 20.10 11:22. Fără agenți; săptămânalul 83 → 83 % (contorul nu s-a mișcat). `npm run rapid` RC 0 (7 072 de
teste unitare, 0 picate, 8 sărite; build-ul determinist; licențele); e2e 162 / 162 în Edge; emulatoarele 36 + 12 (3 noi:
personalul cap-coadă). Pornirea 94,3 / 100 kB (cu ușa 99,0); `/admin` 178,6 → 189,0 / 200 kB (intrarea cu parola, filele
Personal și Cont): mai e loc de ~11 kB.
**Publicat pe test:** 20.10, workflow-ul `publica` pe `3637cb2` (după rapid-ul verde pe CI): regulile noi publicate,
`administreazaPersonalul` și `acceptaInvitatia` create (fără App Check răspund 401, deci invocarea publică e pusă),
versiunea `3637cb21e052` în pachet. Capturile filelor Personal (luminos, întunecat) și Cont trimise owner-ului.
**Proba owner-ului pe test:** „Am încercat pe test: în fila Cont mi-am adăugat o parolă la contul Google, apoi am ieșit și
am intrat cu adresa și parola. Pare ca a functionat.” Citit în Auth (doar citire): un singur cont, furnizorii `google.com`
și `password`, parola pusă la 10:29 UTC; adresa apare acum neverificată (notat în ADR 0049 §6, pentru etapa 14). Rândul
scos din „Ce îi trebuie owner-ului”.

## 2026-10-20 — Riglele, ghidajele, lipirea și alinierea (Model: Claude Opus 5.5)

**Prompt:** „hmm, se poate sa aducem mai in fata niste lucruri. putem face mai multe unelte de desen acum? ruler si guides?”
+ „snapping system, aligning etc.?”. Deciziile owner-ului la întrebări: „Întâi rigle+lipire”, ghidajele „Da, în proiect”,
lipirea de „Ghidaje și foaie”, „Punctele formelor” și „Grilă”, „Fără agenți”. **Started:** 20.10 13:40, săptămânalul
83 %. Felia 6.A↑ (ADR 0050). Abatere de la ce i-am spus owner-ului la întrebare (v11): ghidajele intră în v10, fiindcă nu
schimbă tăierea, iar v11 ar fi făcut o filă rămasă pe versiunea veche să refuze proiectul. Pornirea e la 99,0 / 100 kB
cu ușa: totul vine la cerere.
**Ce s-a făcut:** ghidajele pe foaie (tipul, ușa: plafonul 1 000, id-urile, poziția; comanda `inlocuieste-ghidaje`), lipirea
și alinierea pure în `src/geom/`, acțiunile `foaie.ghidaje` și `document.muta-instantele` (în registru doar id-ul și garda,
calculul la cerere), cârligele pânzei (stratul de deasupra, lipirea mutării, Alt), modulul `Editare` la cerere (riglele,
ghidajele cu dublu clic pentru poziția exactă, grila, liniile de aliniere, bara lipirii și a alinierii, săgețile) și
dicționarul lui. **Treceri:** (1) codul și probele; (2) e2e: banda ghidajului tras se scotea din pagină cât era trasă
(`setPointerCapture` pe un element scos: gestul și dublul clic se pierdeau), iar lipirea arăta doar una din țintele atinse
deodată (acum toate); (3) e2e-ul vechi: săgețile mutau forma și din arborele proiectului, iar o probă căuta „EN” după un nume
parțial (găsea și „Aliniază centrele”); după un clic pe „Aliniază”, săgețile nu mai mergeau. Două probe care fixau lista
acțiunilor la cerere (cinci) au primit cele două noi.
**Completed:** 20.10 14:20. Fără agenți; săptămânalul 83 → 84 %. `npm run rapid` RC 0 (7 091 de teste unitare, 0 picate, 8
sărite; build-ul determinist; licențele); e2e 164 / 164 în Edge (2 noi). Pornirea 94,3 → 94,7 / 100 kB, cu ușa 99,0 → 99,4
(rămân ~0,6 kB: următoarea felie care atinge pornirea trebuie să elibereze loc întâi).
**Publicat pe test:** 20.10, workflow-ul `publica` pe `38f4da5` (după rapid-ul verde pe CI): versiunea `38f4da5a5892` în pachet.

## 2026-10-20 — Uneltele de desen prin tragere (Model: Claude Opus 5.5)

**Prompt:** „Da, fă acum uneltele de desen prin tragere (dreptunghi, cerc, elipsă, linie, poligon), cu lipirea, fără agenți.”
**Started:** 20.10 14:50, săptămânalul 84 %. Felia 6.B↑ (ADR 0051), în modulul editării, la cerere; pornirea are ~0,6 kB liberi.
**Ce s-a făcut:** `src/app/desenCalcul.ts` (forma exactă a fiecărei unelte, Shift), acțiunea `document.deseneaza` (garda în
registru, calculul la cerere: piesa nouă cu operația implicită, documentul de după prin ușă), cârligul gestului în pânză
(apăsarea stângă desenează cu o unealtă aleasă; zoomul și deplasarea rămân), uneltele în bara editării, cu tastele,
previzualizarea și lipirea capetelor. **Treceri:** (1) codul și probele, e2e verde din prima; (2) captura: pictograma
dreptunghiului dispăruse (regula `rect { stroke: none }` a pictogramelor de aliniere), iar colțurile nelipite purtau
zecimalele pixelilor (60,000002661): rotunjite la 0,001 mm. Am suprascris din greșeală `test/unit/desen.test.ts` (al listei
de pe pânză) cu probele uneltelor: readus din git, probele mele în `unelte-desen.test.ts`.
(3) porțile: `adancimeDeschise`, luată din `io/piesa.ts`, aducea ușa întreagă în calculul acțiunilor, iar schemele se lipeau de
ușă într-o singură bucată (probele „schemele care nu vin” din la-cerere și raportor cădeau): funcția e acum în
`io/adancime.ts`, fără dependențe, iar forma desenată se judecă cu `SchemaDocument`, nu cu ușa. Un e2e a rulat pe un `dist/`
vechi (ReferenceError), reluat după build.
**Completed:** 20.10 15:50. Fără agenți; săptămânalul 84 → 86 %. `npm run rapid` RC 0 (7 098 de teste unitare, 0 picate,
8 sărite); e2e 165 / 165 în Edge. Pornirea 94,7 → 95,0 / 100 kB, cu ușa 99,4 → 99,7 (rămân ~0,3 kB: următoarea felie care
atinge pornirea trebuie să elibereze loc întâi). Owner-ul a cerut în timpul feliei și „controls ca scale rotate etc.”:
felia următoare (6.C↑).
**Publicat pe test:** 20.10, workflow-ul `publica` pe `4f20826` (după rapid-ul verde pe CI).
**De făcut (cererea owner-ului, 20.10):** „in situatia in care snap este dezactivat, atunci 'alt' sa activeze temporar snap”: Alt
inversează lipirea pe durata gestului (oprită → pornită, pornită → oprită); intră în felia 6.C↑, cu transformările.

## 2026-10-20 — Transformările, Alt inversat, uneltele în bara de sus (Model: Claude Opus 5.5)

**Prompt:** „Da, fă acum transformările (mânerele de scalare și rotire pe selecție), împreună cu Alt care inversează lipirea,
fără agenți. am incercat uneltele, acum par OKish, cercul, ar trebui sa aiba raza, cum hexagonul are numar de fete, si vreau
sa poata fi editat si post placement. si, acum am cerc si rectangle in doua locuri. pe UI-ul asta, vreau ca toate uneltele
astea sa fie in bara de sus, cu snap si grid, iar align/distribute options intr-o subbara, ca un submeniu”.
**Started:** 20.10 16:10, săptămânalul 86 %. Împărțit în două felii (pornirea are ~0,3 kB liberi): **6.C↑** (ADR 0052):
Alt inversează lipirea; uneltele, Lipire și Grilă în bara de sus, în locul butoanelor „Adaugă dreptunghi / cerc” (rămân în
paleta de comenzi; e2e-ul le rulează de acolo); alinierea și distribuirea într-un submeniu; raza la unealta cercului (un
clic fără tragere pune un cerc cu ea); mânerele de scalare (colțuri proporțional, Shift liber; laturi pe o axă) și de
rotire (Shift: 15°) pe cutia selecției, cu acțiunea `document.transforma` (scalarea schimbă geometria piesei, exact;
refuzată cu motiv unde n-ar mai fi exactă: scalare neuniformă pe un cerc, pe arce, pe o rotire care nu e multiplu de 90°).
**6.D↑**: editarea după plasare în panoul de proprietăți (raza cercului, laturile și raza poligonului, razele elipsei,
laturile dreptunghiului).
**Treceri:** (1) modelul (`src/model/transformare.ts`), acțiunea, mânerele, probele; (2) captura: la 1280 / 1366 / 1440 px
căutarea acoperea „Exportă G-code” (62 / 19 / 7 px): sub 95rem rămâne doar cu pictograma, cu proba nouă a barei de sus
(control: cade pe CSS-ul vechi la 1280 px); o captură cu selecția veche venea din ajutorul e2e `vedere()`, care compara
perechea cerere / afișare înaintea efectului ce trimite cererea nouă (acum așteaptă două cadre); (3) e2e-ul complet a prins
două defecte ale mânerelor: un clic simplu pe mâner scala forma (scara din poziția absolută a cursorului; acum din
deplasarea față de apăsare, cu prag de 3 px) și mânerele prindeau orice apăsare, deci panoramarea cu butonul din mijloc
pornită de pe un mâner nu mai mergea (oracolele traseului la 1 000 px/mm): mânerele sunt acum doar desen, lovitura e
geometrică (`manerLovit`), într-un ascultător pus înaintea pânzei, doar pentru butonul stâng fără Space; (4) pragul de
24 px pe axă (o formă mică rămâne de mutat), ascunderea mânerelor cât se mută forma, probele lor.
**Completed:** 20.10 17:40. Fără agenți; săptămânalul 86 → 89 %. `npm run rapid` RC 0 (7 106 teste unitare, 0 picate,
8 sărite); e2e 167 / 167 în Edge. Pornirea neschimbată: 95,0 kB (cu ușa 99,7 / 100). Rămâne 6.D↑ (editarea după
plasare), apoi unirea / separarea vectorilor („in curand”, cererea owner-ului).
**Publicat pe test:** 20.10, workflow-ul `publica` pe `67561b0` (după rapid-ul verde pe CI, 4 / 4 felii).

## 2026-10-20 — Unealta Transformare, extensia barei, editarea formelor după plasare (Model: Claude Opus 5.5)

**Prompt:** „NODURILE de control trebuie sa apara doar cand selectam unealta de transformare, cea care urmeaza sa fie
dezvoltata. bara de aliniere ar trebui sa fie o extensie, nu un popup, si vreau sa fie mereu vizibila, dar sa fie
colapsabila spre stanga. ideea este ca vor mai fi acolo elemente. deci colapsabil este meniul de aliniere, nu bara in
sine. pune asta in felia 6.D” (după „Pornesc 6.D↑?”).
**Started:** 20.10 18:56, săptămânalul 89 %. Felia **6.D↑** (ADR 0053), fără agenți: (1) unealta Transformare (tasta S) în
bara de sus; mânerele apar doar cu ea, nu cu Selecția; (2) extensia barei de sus: un rând lipit sub bara uneltelor, mereu
vizibil (locul rezervat de la pornire, ca foaia să nu sară), în care secțiunea Aliniere se strânge spre stânga (starea în
browser); acolo vor intra și alte secțiuni; (3) editarea după plasare în panoul de proprietăți: dreptunghiul (laturile,
raza colțurilor), cercul (raza), poligonul (laturile, raza) și elipsa (razele), recunoscute din geometrie (fără schemă nouă:
poligonul regulat și elipsa generatorului comun cu unealta de desen), cu acțiunea `document.forma`.
**Treceri:** (1) generatorii poligonului și elipsei mutați în `src/model/formeParametrice.ts` (comuni cu uneltele de desen), cu
recunoașterea pe forma salvată; acțiunea `document.forma` (motivul refuzului din dicționarul panoului, ca pornirea să nu
crească); câmpurile panoului; unealta Transformare; extensia barei (`#loc-extensie`, locul rezervat de la pornire); probele;
(2) captura: colțul Y al elipsei în panou ieșea 119,999999663 (cutia din cubicele unei singure bucăți de 2π, cu extremele între
vârfuri): elipsa generatorului e acum tăiată pe sferturi, iar elipsele vechi rămân recunoscute; o probă cerea poligonul refăcut
„identic” (diferă cu ~1e-15): acum sub 1e-9; (3) e2e-ul complet verde din prima.
**Completed:** 20.10 19:30. Fără agenți; săptămânalul 89 → 90 %. `npm run rapid` RC 0 (7 111 teste unitare, 0 picate,
8 sărite); e2e 168 / 168 în Edge. Pornirea 95,0 → 95,1 kB (cu ușa 99,7 → 99,8 / 100): rămân ~0,2 kB, deci următoarea felie
care atinge pornirea eliberează loc întâi. Rămâne unirea / separarea vectorilor („in curand”).
**Publicat pe test:** 20.10, workflow-ul `publica` pe `fde4a04` (după rapid-ul verde pe CI, 4 / 4 felii).

## 2026-10-20 — Oglindirea selecției (Model: Claude Opus 5.5)

**Prompt:** „Da, fă acum unirea și separarea vectorilor, fără agenți.”, apoi, la întrebarea despre sensul unirii: „M-am
razgandit, nu vreau asta acum. As face ceva mai mic.”, și din feliile mici propuse: „Oglindirea (Recomandat)”.
**Started:** 20.10 20:38, săptămânalul 90 %. Felia **6.E↑** (ADR 0054), fără agenți: butoanele Oglindește orizontal /
vertical (Shift+H / Shift+V) în extensia barei, pe selecție, în jurul centrului cutiei ei. Exactă: reflexia intră în matricea
rădăcinii piesei (o similitudine, deci arcele rămân arce, cu semnul schimbat), locul instanței se oglindește, rotirea rămâne;
CAM-ul inversează deja partea frezei pe căile deschise sub o matrice care oglindește (ADR 0037 §3). Prin acțiunea existentă
`document.transforma` (fără nimic nou în pornire). Proba: programul documentului oglindit = oglinda programului inițial.
**Treceri:** (1) modelul (`fel: 'oglindire'` în `src/model/transformare.ts`, reflexia L = R(−rotire)·S·R(rotire) în matricea
rădăcinii) și probele; proba programului de tăiere compara întâi și coborârile / ridicările frezei, care cad la celălalt capăt al
buclei după oglindire (oglinda întoarce sensul de rotire, iar urcarea cere parcurgerea inversă): acum compară tăieturile în plan,
cu sensul arcelor (același), plus martorul pe partea liniei; (2) secțiunea Oglindire din extensie, Shift+H / Shift+V, e2e-ul pe
G-code-ul exportat; captura: despărțitorul dintre secțiunile extensiei nu avea stil; (3) rularea completă verde din prima.
Întrebarea owner-ului din timpul feliei (de pe ce adresă vine invitația pe e-mail): răspuns în chat, aplicația nu trimite încă
e-mailul invitației (ADR 0049); recomandarea, `noreply@cncvectorstudio.com` cu Reply-To pe o adresă reală, cere un serviciu de
e-mail (decizia owner-ului).
**Completed:** 20.10 20:55. Fără agenți (cererea owner-ului, deși ultracode e pornit); săptămânalul 90 → 91 %. `npm run rapid`
RC 0 (7 115 teste unitare, 0 picate, 8 sărite); e2e 169 / 169 în Edge. Pornirea neschimbată: 95,1 kB (cu ușa 99,8 / 100).
**Publicat pe test:** 20.10, workflow-ul `publica` pe `464fad4` (după rapid-ul verde pe CI, 4 / 4 felii).

## 2026-10-20 — Lipirea mânerelor (Model: Claude Opus 5.5)

**Prompt:** „Fă acum lipirea mânerelor de ghidaje, grilă și forme, fără agenți.”
**Started:** 20.10 21:10, săptămânalul 91 %. Felia **6.F↑** (ADR 0055), fără agenți: mânerul de scalare tras se lipește, ca
punct, de ghidaje, foaie, cutiile celorlalte forme și grilă (aceleași ținte și aceeași toleranță ca mutarea, ADR 0050), cu
liniile de aliniere; Alt inversează lipirea (ADR 0052). Pe axa lipită scara nu se mai rotunjește, ca marginea să ajungă exact
pe țintă; la colțul proporțional decide axa care s-a schimbat mai mult. Rotirea rămâne cu Shift (15°).
**Treceri:** (1) calculul pur (`transformareManerLipita` și ținta exactă dată lui `transformareManer`), legătura în mânere
(aceleași ținte și toleranță ca mutarea, liniile prin rigle, Alt), probele unitare și e2e, verzi din prima; controlul negativ:
proba e2e cade pe codul fără lipire (linia ghidajului lipsește); (2) rularea completă verde.
**Completed:** 20.10 21:25. Fără agenți; săptămânalul 91 → 92 %. `npm run rapid` RC 0 (7 116 teste unitare, 0 picate,
8 sărite); e2e 170 / 170 în Edge. Pornirea neschimbată: 95,1 kB (cu ușa 99,8 / 100).
**Publicat pe test:** 20.10, workflow-ul `publica` pe `844902c` (după rapid-ul verde pe CI, 4 / 4 felii).
**De făcut (cererea owner-ului, 20.10):** „O sa vrea roadmap si in engleza, dar dupa asta”: fila Roadmap din `/admin` (ADR 0048)
și în engleză (azi se generează din fișele etapelor, scrise în română), după felia care urmează.

## 2026-10-24 — Nivelul complet roșu din 21.10, apoi locul în pornire (Model: Claude Opus 5.5)

**Prompt:** „continua” (după „Încep acum «Loc în pornire», apoi roadmap-ul în engleză?”).
**Started:** 24.10, ~11:15, săptămânalul resetat (24.10 08:00). La verificarea de început: rularea de noapte roșie din 21.10,
trei căderi, toate în e2e și toate trecute local: (1) bara de sus la 1280 px, marca peste bara de acțiuni pe fonturile de
Linux (297 față de 282; butonul Transformare din 6.D↑ îngustase coloana); (2) exportul din fila care citește, o cursă: paleta
din fila A (folosită de 6.C↑) trecea pe CI de cele 2 s fixe; (3) bucata alegerii care nu vine: Edge 156 pe Linux reîncearcă
un `import()` eșuat (3 cereri), cel de pe Windows nu (1). Reparate în `8554e5e` (marca cu `max-width`, proba barei cu literele
lățite, cu control; calculul exportului ținut până la salvare; proba alegerii acceptă ambele browsere). Rularea pornită de
mână a avut e2e-ul verde, dar a fost oprită la plafonul de 30 de minute al job-ului (nivelul rapid nefeliat ia 14–24 min;
rularea verde din 20.10 luase 29,3): plafonul ridicat la 60 în `9a4f3a4`, rularea reluată.
**Locul în pornire:** compoziția măsurată (pornirea 92,9 kB gzip + dicționarul 2,2; React DOM e partea grea). Mutările ieftine
aduc sub 1 kB; pârghiile mari (config fără valibot, React → Preact) sunt deciziile scrise în ADR 0042. Owner-ul a întrebat
„De ce este necesar facem asta?”: răspuns, nu e urgent; a ales „Fa oricum roadmapul in eng”. Plafonul rămâne.
**Completed:** 24.10 12:00, fără cod de produs în afara reparațiilor de CI.

## 2026-10-24 — Roadmap-ul în engleză (Model: Claude Opus 5.5)

**Prompt:** „Fa oricum roadmapul in eng”.
**Started:** 24.10 12:00. Felia **3.E** (ADR 0056), fără agenți: fișele rămân singurul adevăr, în română; traducerea, într-un
dicționar din repo cu cheia pe amprenta textului român; build-ul scrie și `roadmap.en.json`; fila alege după limbă, cu RO / EN
în antetul `/admin`; o probă din nivelul rapid cere zero texte netraduse (traducerea vine cu fișa, `npm run traduceri`).
**Treceri:** (1) generatorul (`scripts/traducere.ts`, legat în `scripts/documentatie.ts`), contractul (`limba`, `netraduse`,
`roadmap.en.json`), aducerea și fila după limbă, comutatorul RO / EN din antetul `/admin`, poarta build-ului, probele; (2) cele
327 de texte traduse (325, plus rândul feliei și titlul ADR-ului), controlul negativ al porții. Pe emulatoare: proba nouă a
prins întâi „1 text netradus” (build-ul pornise cât scriam rândul ADR-ului: o cursă a mea, nu a codului) și o cădere veche din
6.C↑: `raportor.emulator.spec` căuta butonul „Adaugă dreptunghi”, scos din bară (nopțile roșii nu ajunseseră la emulatoare);
reparată.
**Completed:** 24.10 12:50. Fără agenți (regula proiectului: acordul și costul spuse înainte). `npm run rapid` RC 0 (7 121 de
teste unitare, 0 picate, 8 sărite); e2e 170 / 170 în Edge; emulatoarele: 36 de probe ale funcțiilor, 13 e2e. Pornirea
neschimbată (95,1 kB; cu ușa 99,8 / 100); `/admin` 189,1 → 189,4 / 200 kB; roadmap-ul în engleză 29,7 kB gzip, 0 netraduse.
**Publicat pe test:** 24.10, workflow-ul `publica` pe `fb0ef10` (după rapid-ul verde pe CI, 4 / 4 felii); `documentatie/roadmap.en.json` servit, 0 texte netraduse.

## 2026-10-24 — Simularea, felia 2: vederea 3D (Model: Claude Opus 5.5)

**Prompt:** „Vreau sa continui”; la întrebări: „Vedere 3D separată (Recomandat)”, „La deschiderea 3D (Recomandat)”, „Automat la
zoom (Recomandat)”.
**Started:** 24.10, ~13:30. Felia **4.3↑** (PLAN §5.3, etapa 4 p. 3), fără agenți: un comutator 2D / 3D; în 3D, placa tăiată,
luminată, rotită și apropiată cu mouse-ul, din celulele nucleului (ADR 0010: afișarea nu recalculează); la deschidere, programul
documentului curent se calculează și se simulează (fără export); la o apropiere destulă, fereastra vizibilă se resimulează la
0,1 mm, restul rămâne la 0,25 mm. Totul la cerere (pornirea e la 99,8 / 100 cu ușa).
**Treceri:** (1) relieful în benzi (`reliefPentru`, blocul putere a lui 2, deci fiecare rând de pixeli e al unei singure
benzi), calculul prin bucata exportului (`programSimulare`, `simuleazaRelief`), calculul camerei (`vedere3dCalcul.ts`),
vederea (`Vedere3D.tsx`, la cerere din modulul editării), probele unitare și e2e, cu controale negative (relieful stricat cu o
celulă, apropierea fără omotetie, fereastra în afara grilei cad); (2) încadrarea pe cele 8 colțuri (prima punea placa sub
panouri), plasa din build pentru bucata vederii (controlul negativ: marcajul pus în bucata editării o face să cadă; primul
control, cu un export nefolosit, fusese scos de build și nu dovedea nimic), garda reliefului în bandă. Plasa veche a nucleului
a prins un `Math.log2` (poate diferi între motoare): înlocuit cu `31 - Math.clz32`. Proba documentației fixa lista feliilor
aduse din etapa 4: acum cu 4.3↑, legată de punctul 3 și de ADR 0057.
**Măsurat (local):** placa implicită 300 × 200 la blocul 1 (1200 × 800, chiar celulele); foaia de 2440 × 1220 simulată în
0,9 s, pe blocuri de 1 mm; fereastra fină (2048 × 2048 de celule) în 1,2 s.
**Completed:** 24.10 15:00. Fără agenți (regula proiectului: acordul și costul spuse înainte). `npm run rapid`: 7 133 de teste
unitare, una picată (lista fixată din proba documentației), reparată și rulată din nou; determinismul, licențele verzi. E2e
176 / 176 în Edge (6 noi); emulatoarele: 36 de probe ale funcțiilor, 13 e2e. Pornirea neschimbată (95,1 kB; cu ușa
99,8 / 100); totalul 264,9 → 265,4 / 300 kB; bucata `Vedere3D` 6,7 kB gzip, la primul clic.
**Publicat pe test:** 24.10, workflow-ul `publica` pe `fde0a05` (după rapid-ul verde pe CI, 4 / 4 felii). Verificat în Edge pe
instanța de test: bucata `Vedere3D` cerută abia la clic; placa 300 × 200 simulată la 0,25 mm, blocul 1, adâncimea 3.

## 2026-10-24 — Documentația live: manualul utilizatorului (Model: Claude Opus 5.5)

**Prompt:** „Trecem mai departe” (după „Vrei o recenzie independentă a feliei cu agenți, cam 1 M tokeni? Sau trecem mai
departe fără ea?”).
**Started:** 24.10, ~15:25. Felia următoare din fișe: **3.F, documentația live** (cererea din 19.10, „vreau sa mentinem ideea de
documentatie, una live si una admin”; ADR 0048, „Felia următoare”), fără agenți: manualul utilizatorului în română și în
engleză, în repo (`docs/manual/`), generat la build și ținut și offline, deschis din aplicație (butonul „?” și F1, la capitolul
de acum), cu poarta de acoperire: fiecare acțiune din registru, fiecare unealtă și control al editării și fiecare scurtătură au
un capitol care le numește cu eticheta din interfață, în ambele limbi.
**Treceri:** (1) contractul (`shared/manual.ts`), generatorul și poarta lui (`scripts/manual.ts`, din generarea documentației;
în precache), fereastra (`src/app/Manual.tsx`), butonul „?” și F1 în modulul editării, textul celor două limbi (14 capitole),
poarta de acoperire (`test/unit/manual.test.ts`), probele e2e; (2) ce au prins porțile și controalele: poarta a găsit două
texte care nu numeau butonul („vederea 3D” față de „Vedere 3D”; „applies the operations” față de „Apply the operations”);
proba tastelor din manual era oarbă (Delete și Ctrl+Z se anulau: controlul negativ trecea), refăcută cu fiecare tastă pe rând;
controlul plasei de precache s-a aplicat întâi nul (sed-ul nu se potrivea), refăcut cu un script, apoi a căzut cum trebuie;
regula de import „docs-izolat” a cerut fereastra în afara lui `src/docs/` (mutată în `src/app/`); proba PWA „după o publicare”
a căzut: simularea publicării redenumea doar câteva bucăți, dar rescria conținutul tuturor, deci bucata nouă a cititorului de
markdown (comună cu `/admin`) păstra numele cu alt conținut, iar workerul servea copia veche (React de două ori). Verificat că
un build adevărat redenumește bucata (o schimbare a pornirii: `Markdown-DNScKQQI` → `Markdown-D5T4IiLM`); simularea
redenumește acum și bucățile care pomenesc un nume schimbat. Aspectul (capturi luminos / întunecat / telefon): cuprinsul lua
stilul global al lui `nav` (bara segmentată), iar pe telefon căutarea era strivită; reparate.
**Completed:** 24.10 16:50. Fără agenți (regula proiectului: acordul și costul spuse înainte). `npm run rapid` RC 0 (7 142 de
teste unitare, 0 picate, 8 sărite); e2e 181 / 181 în Edge (5 noi și manualul offline în proba PWA); emulatoarele: 36 de probe
ale funcțiilor, 13 e2e. Pornirea neschimbată (95,1 kB; cu ușa 99,8 / 100); totalul 265,4 → 271,6 / 300 kB (fereastra 1,8 kB,
cititorul de markdown ieșit din `/admin` într-o bucată comună 3,9 kB); precache 50 de fișiere, cu manualul (RO 6,8, EN 6,6 kB gzip).
**Publicat pe test:** 24.10, workflow-ul `publica` pe `3b44dd5` (după rapid-ul verde pe CI, 4 / 4 felii). Verificat în Edge pe
instanța de test: F1 cu unealta Cerc deschide „Desenul”; 14 capitole; `manual/ro.json` cerut abia la deschidere și prezent în
manifestul de precache al lui `sw.js`.

## 2026-10-24 — Selecția cu dreptunghi, ca în CAD (Model: Claude Opus 5.5)

**Prompt:** „Este ok, doar ca, vreau ca selectia sa functioneze ca inainte. De le stanga la dreapta trebuie sa selectezi toata
forma, de la dreapta la stanga se selecteaza toate formele/vectorii atinsi de selectie” (după „Fac acum selecția multiplă
(Shift+clic și dreptunghi de selecție), ca alinierea între forme să devină folosibilă? Sau preferi altă felie?”).
**Started:** 24.10, ~17:00. Felia **3.G**, fără agenți: cadrul de selecție trasă de la stânga la dreapta alege doar formele
cuprinse în întregime (fereastra), trasă de la dreapta la stânga alege tot ce atinge conturul (intersecția); Shift+clic adaugă
sau scoate o formă, Shift+cadru adaugă; un clic pe o formă deja aleasă păstrează selecția multiplă (s-o poți muta trăgând).
Gestul în modulul editării (nimic nou la pornire, în afară de clic), calculul exact și pe arce și pe curbe.
**Treceri:** (1) geometria (`src/geom/cadru.ts`: linii prin Liang–Barsky, arce pe baleiaj, cubice prin subdivizare) cu un
oracol independent prin eșantionare pe 2 000 de contururi aleatoare și controlul negativ (arcul fără baleiaj cade), alegerea
pură (`aleseInCadru`), gestul în modulul editării (captură înaintea pânzei; mânerele și apăsarea pe o formă rămân ale lor),
clicul care păstrează selecția multiplă, manualul (Selecția, Alinierea, Scurtăturile), probele e2e; (2) ce au prins probele:
două date greșite în proba unitară (o linie care chiar tăia dreptunghiul, o bandă care chiar atingea cercul), mutarea din
pixelii mausului comparată cu toleranță; proba „bucata alegerii care nu vine” (`la-cerere.spec`) a numărat 4 cereri în loc de
1: modulul editării importa bucata alegerii, deci fără ea nu mai venea nici editarea. Calculul formei de sub punct s-a mutat în
`src/model/alegere.ts`, comun; bucata alegerii a rămas o trimitere spre el.
**Completed:** 24.10 18:20. Fără agenți. `npm run rapid` RC 0 (7 149 de teste unitare, 0 picate, 8 sărite); e2e 185 / 185 în
Edge (4 noi); emulatoarele: 36 de probe ale funcțiilor, 13 e2e (pe codul de dinaintea mutării lui `instantaLa`, care nu le
atinge). Pornirea 95,1 kB, cu ușa 99,8 / 100 (clicul: câteva zeci de octeți); totalul 271,6 → 273,2 / 300 kB.
**Publicat pe test:** 24.10, workflow-ul `publica` pe `07fb822` (după rapid-ul verde pe CI, 4 / 4 felii). Verificat în Edge pe
instanța de test: fereastra (spre dreapta) alege doar dreptunghiul cuprins; intersecția (spre stânga) și cercul atins.

## 2026-10-24 — Rigla pe marginea foii, cu linia de cotă (Model: Claude Opus 5.5)

**Prompt:** „Si, vreau sa modificam rigla, trebuie sa stea pe marginea planselor. Acum se suprapun lucruri care ar trebui mai
clar delimitate”; la întrebarea despre formă: „Vreau ca rigla sa tina cat foaia de lucru, dar, daca avem piese care depasesc,
sa se extinda o linie cu cota de lungime”.
**Started:** 24.10, ~18:35. Felia **3.H**, fără agenți: rigla de sus lipită de marginea de sus a foii și cea din stânga de
marginea din stânga, lungi cât foaia, mutate odată cu ea la deplasare și zoom; când marginea foii iese din zona liberă, rigla
rămâne pe marginea zonei (nu mai trece pe sub panouri și bare). Formele care ies din foaie: o linie de cotă care continuă rigla,
cu cât ies (mm), pe fiecare parte.
**Treceri:** (1) poziția riglelor și cotele, pure (`pozitiaRiglelor`, `cotePeste` în `src/canvas/gradatii.ts`; `cutieFormelor`),
cu probele lor; rigla nouă (lipită de foaie, oprită pe marginea zonei, gradațiile doar pe foaie, ștergerea ghidajului doar în
banda riglei) și liniile de cotă; manualul (Pânza, Foaia); probele e2e; (2) capturile: pe o cotă scurtă (10 mm la zoomul de
pornire), eticheta se călca peste linie: mutată după capătul dinspre forme.
**Completed:** 24.10 19:15. Fără agenți. `npm run rapid` RC 0 (7 153 de teste unitare, 0 picate, 8 sărite); e2e 187 / 187 în
Edge (2 noi); emulatoarele: 36 de probe ale funcțiilor, 13 e2e. Pornirea neschimbată (95,1 kB; cu ușa 99,8 / 100); totalul
273,2 → 274,1 / 300 kB.
**Publicat pe test:** 24.10, workflow-ul `publica` pe `09f135b` (după rapid-ul verde pe CI, 4 / 4 felii).
**Corectura owner-ului:** „Rigla trebuie sa urmeze foaia chiar si pe sub meniu” (venit cât se publica). Rigla nu se mai oprește
pe marginea zonei libere: rămâne lipită de foaie oriunde, și pe sub bare și panouri (care o acoperă, ca pe foaie), tăiată doar
la marginile pânzei; la fel liniile de cotă. Probele unitare și e2e schimbate pe regula nouă (rigla sub panou, iar panoul
deasupra ei, cu `elementFromPoint`); ADR 0060 §2, manualul (Pânza) și fișa la zi.
**Publicat pe test (corectura):** 24.10, workflow-ul `publica` pe `80b0624` (după rapid-ul verde pe CI). Verificat în Edge pe
instanța de test: foaia trasă sub bara de sus și sub panoul din stânga, iar riglele rămân lipite de marginile ei.

## 2026-10-24 — Copierea în rețea și pe cerc (Model: Claude Opus 5.5)

**Prompt:** „continua” (după selecția cu dreptunghi și rigla foii).
**Started:** 24.10, ~19:55. Felia **6.G↑**, adusă din etapa 6 („Transformare și copiere”: mutarea, scalarea, rotirea și
oglindirea sunt gata; rămân copierea în rețea și cea circulară), fără agenți: o secțiune Copiere în extensia barei, cu panoul
„Copiază în rețea”: rânduri × coloane cu spațiul dintre copii, sau pe cerc (câte, centrul, unghiul, cu sau fără rotirea
copiilor); previzualizarea copiilor pe pânză; copiile sunt piese independente (ca la Duplică), într-un singur pas de anulare.
**Treceri:** (1) modulul pur (`src/model/retea.ts`: copiile, mișcarea rigidă, rotirea exactă la 90°, valorile), acțiunea
`document.copiaza-in-retea` (o intrare în registru, calculul la cerere, verdictul `motivCopiereRetea` comun panoului), panoul
din extensia barei (formularul ținut în browser), previzualizarea cutiilor copiilor, manualul, probele; (2) ce au prins
probele: cazul „prea departe” din proba unitară verifica doar cazuri bune (refăcut cu o instanță aproape de plafonul
translației, 10 km); Esc nu închidea panoul cu focusul pe butonul lui (acum Esc din extensia barei îl închide întâi); două
probe fixau lista acțiunilor registrului și a calculelor la cerere (acțiunea nouă adăugată pe locul ei).
**Completed:** 24.10 21:40. Fără agenți. `npm run rapid`: 7 160 de teste unitare, 2 picate (listele fixate), reparate și rulate
din nou; determinismul, licențele verzi. E2e 189 / 189 în Edge (2 noi); emulatoarele: 36 de probe ale funcțiilor, 13 e2e.
Pornirea 95,1 → 95,2 kB (intrarea acțiunii și eticheta); cu ușa 99,8 / 100, deci mai e ~0,1 kB; totalul 274,2 → 276,8 / 300 kB.
**Publicat pe test:** 24.10, workflow-ul `publica` pe `f0a0ca9` (după rapid-ul verde pe CI, 4 / 4 felii). Verificat în Edge pe
instanța de test: rețeaua 2 × 2 a dreptunghiului dă 3 copii previzualizate, 4 forme, ultima copie la (130, 90).

## 2026-10-24 — Editarea nodurilor (Model: Claude Opus 5.5)

**Prompt:** „ok, continua” (după copierea în rețea și pe cerc).
**Started:** 24.10, ~22:00. Felia **6.H↑**, adusă din etapa 6 („Vectori, noduri…”), fără agenți: unealta Noduri (N) arată
vârfurile căii formei alese singure (o piesă cu un singur contur, doar a ei); tragerea mută un nod (cu lipirea, cu punctele de
control ale curbelor vecine mutate odată cu el), dublu clic pe o latură adaugă un nod exact (linia, arcul și curba împărțite fără
aproximare), Delete scoate nodul ales dintre două linii. Dreptunghiul și cercul devin căi exacte la prima editare. Prin acțiunea
existentă `document.forma`: nimic nou la pornire (mai e ~0,1 kB).
**Treceri:** (1) modulul pur (`src/model/noduri.ts`: calea exactă a dreptunghiului și a cercului, mutarea cu punctele de control
vecine, nodul nou pe linie, arc și cubică, scoaterea cu motiv), partea pură a unealtei (`src/app/noduriCalcul.ts`: ce formă se
poate edita, nodul și latura lovite, drumul SVG), unealta în modulul editării (tasta N, sfatul de jos), manualul (capitolul
„Nodurile”, tasta N la scurtături), probele; (2) ce au prins probele: cercul are doar două noduri, deci refuzul „prea puține” vine
înaintea celui „lângă arce” (proba e2e adaugă întâi două noduri); nodul ales se pierdea după fiecare schimbare, fiindcă efectul
depindea de formă (acum doar de selecție); erorile de tipuri (iconița lipsă, tipul lipirii) prinse de compilator.
**Completed:** 24.10 22:25. Fără agenți. `npm run rapid` RC 0 (7 166 de teste unitare, 6 noi, 0 picate, 8 sărite); determinismul,
licențele verzi. E2e 192 / 192 în Edge (3 noi); emulatoarele: 36 de probe ale funcțiilor, 13 e2e. Pornirea neschimbată (95,2 kB;
cu ușa 99,9 / 100); totalul 276,8 → 280,1 / 300 kB; manualul are 15 capitole.
**Publicat pe test:** 24.10, workflow-ul `publica` pe `7d5c0c0` (după rapid-ul verde pe CI, 4 / 4 felii). Verificat în Edge pe
instanța de test (fereastra lată: uneltele apar în bara de sus): dreptunghiul are 4 noduri; dublu clic pe latura de jos dă 5,
cu nodul nou ales, și o cale; colțul tras dă calea 126,15 × 80; Delete pe nodul nou îl scoate (forma rămâne); trei anulări
readuc dreptunghiul 100 × 60; 0 erori în jurnal.

## 2026-10-24 — Unealta Pen și tipurile nodurilor (Model: Claude Opus 5.5)

**Prompt:** „unealta de noduri va trebui sa imprumute de la unealta Pen, care inca nu exista. nodurile vor avea ori colturi ori
vor crea curbe, ori in ambele parti ori doar intr-o singura parte”
**Started:** 24.10, ~22:40. Felia **6.I↑**, adusă din etapa 6, fără agenți: un model comun de nod (colț, curbă pe ambele părți,
curbă pe o parte), dedus din mânere, fără schemă nouă; unealta Pen (B) care pune nodurile pe rând (clic, tragere, Shift +
tragere), prin `document.deseneaza`; în unealta Noduri, mânerele nodului ales și trei butoane care îi schimbă tipul. Arcele nu
primesc mâner (refuz cu motiv), ca forma să nu se schimbe în tăcere.
**Treceri:** (1) modelul comun (`src/model/noduri.ts`: `manereNod`, `tipNod`, `schimbaTipNod`, `mutaManer`, `caleDinNoduri`),
partea pură a Pen-ului (`src/app/penCalcul.ts`), unealta Pen și mânerele / butoanele din Noduri în modulul editării, manualul
(capitolul „Unealta Pen”, tipurile în „Nodurile”, tastele B, Enter, Backspace), probele; 7 unitare și 5 e2e noi, verzi din prima,
deci patru mutații ca să le văd dinții (Shift ignorat la Pen și mânerele mereu despărțite, în interfață: 2 e2e picate; rotirea
mânerului opus și direcția curbei pe o parte, în model: 2 unitare picate), toate restaurate; (2) capturile au arătat sfaturile
lungi tăiate cu „…” în cipul de jos: scurtate, detaliile rămân în manual și în titlul uneltei.
**Completed:** 24.10 23:15. Fără agenți. `npm run rapid` RC 0 (7 173 de teste unitare, 7 noi, 0 picate, 8 sărite); determinismul,
licențele verzi. E2e 197 / 197 în Edge (5 noi); emulatoarele: 36 de probe ale funcțiilor, 13 e2e. Pornirea neschimbată (95,2 kB;
cu ușa 99,9 / 100); totalul 280,1 → 283,8 / 300 kB; manualul are 16 capitole.
**Publicat pe test:** 24.10, workflow-ul `publica` pe `1ebd1ea` (după rapid-ul verde pe CI, 4 / 4 felii). Verificat în Edge pe
instanța de test (după oferta de actualizare a PWA-ului): Pen-ul e în bară; un colț, un nod tras și încă un colț, apoi Enter,
dau o cale deschisă de 2 segmente, aleasă, tăiată pe linie; în Noduri, nodul tras e „ambele”, cu 2 mânere și butonul lui apăsat;
„pe o parte” dă înainte, din nou înapoi; „colț”, apoi „ambele” (mânerele pe linie); 0 erori în jurnal; anulările au readus
documentul.

## 2026-10-25 — Offsetul formelor în desen (Model: Claude Opus 5.5)

**Prompt:** „neata, continua”
**Started:** 25.10, ~08:15 (la pornire: `main` curat, rapid verde pe `1ebd1ea`, rularea de noapte în lucru). Felia **6.J↑**,
adusă din etapa 6, fără agenți: din rândul „Vectori, noduri, boolean, offset” lipsea offsetul (booleanul e amânat de owner);
decizia 16 din `PLAN.md` cere același motor ca CAM-ul. Panoul din extensia barei (spre exterior / interior, distanța,
previzualizarea, Aplică), formele noi prin `document.deseneaza` generalizat la o listă (nimic nou la pornire), motorul adus la
cerere.
**Treceri:** (1) acțiunea cu lista (`comandaDesen` cu `lot`, `motivDesen` comun panoului), calculul pur (`src/app/offsetCalcul.ts`:
fiecare contur închis în lume prin `offsetInchis`, formele deschise sărite, nimic pe jumătate), panoul cu previzualizarea,
manualul, probele pe hârtie (dreptunghiul 100 × 60 → 110 × 70 cu 4 arce de rază 5 și aria 6000 + 1600 + 25π, spre interior
90 × 50 cu linii, cercul R20, aria neschimbată la rotire, forma în L: 5 arce spre exterior, 1 spre interior); e2e verzi din prima,
deci o mutație în panou (sensul ignorat), prinsă (1 e2e picat), restaurată; fraza din manual despre colțuri era inexactă
(spre interior se rotunjesc colțurile intrânde, nu niciunul): corectată, cu proba formei în L; (2) verificarea pe test (după
`edccc09`, publicat): offsetul merge (calea 110 × 70, 8 segmente, aleasă; anularea; 0 erori), dar la fereastra îngustă a
panoului browserului (711 px) panoul Offset ieșea cu 180 px din fereastră, la fel cel al rețelei: `useInFereastra` le mută
spre stânga cât ies; proba la 720 px cade fără reparație (marginea dreaptă la 890 px).
Tot atunci, e2e-ul complet a prins o cursă veche în `pornire.spec.ts`: `getByRole('button', { name: 'EN' })` caută
un subșir, deci prinde și „Pen…”, „Cerc… centru”, „Aliniază centrele” când modulul editării apucă să se încarce înaintea
clicului; făcut exact (`exact: true`), și în `la-cerere.spec.ts` (3 × la rând, 42 / 42).
**Completed:** 25.10 09:15 (prima trecere: 08:45). Fără agenți. `npm run rapid` RC 0 (7 179 de teste unitare, 6 noi, 0 picate, 8 sărite);
determinismul, licențele verzi. E2e 200 / 200 în Edge (3 noi); emulatoarele: 36 de probe ale funcțiilor, 13 e2e. Pornirea
neschimbată (95,2 kB; cu ușa 99,8 / 100); totalul 283,8 → 285,8 / 300 kB (motorul offsetului într-o bucată la cerere, comună cu
CAM-ul: ~85 kB brut); manualul are tot 16 capitole.
A doua trecere: rapid 7 171 / 0, e2e 201 / 201 (după locatorii exacți), emulatoarele 36 + 13; pornirea cu ușa 99,9 / 100.
**Publicat pe test:** 25.10, workflow-ul `publica` pe `edccc09`, apoi pe `9bcd26e` (după rapid-ul verde pe CI, 4 / 4 felii, de
fiecare dată). Rularea de noapte din 25.10 (06:15 UTC) verde, 31 min. Verificat în Edge pe instanța de test (după oferta de
actualizare a PWA-ului): dreptunghiul 100 × 60, panoul Offset cu 5 mm spre exterior, previzualizarea (1 contur), Aplică dă
calea 110 × 70 cu 8 segmente, la (15, 15), aleasă; anularea o scoate; la 711 px, panoul stă în fereastră (399–703 px); 0 erori.

## 2026-10-25 — Înclinarea (Model: Claude Opus 5.5)

**Prompt:** „Continua, la un moment dat, o sa vreau sa imi faci un test pe care sa il urmez eu si sa iti spun ce a iesit bine si
ce nu. Dar, asta dupa ce terminam cu uneltele de desen”
**Started:** 25.10, ~09:20. Cererea testului pentru owner, notată (în memorie): vine după ce se închid uneltele de desen. Felia
**6.K↑**, adusă din etapa 6, fără agenți: din „Transformare și copiere” rămăseseră înclinarea și copierea de-a lungul unei curbe
(plus booleanul, amânat de owner pe 20.10). Înclinarea: `fel: 'inclinare'` prin `document.transforma`, exactă în geometrie,
arcele refuzate; panoul din secțiunea Oglindire.
**Treceri:** (1) modelul (`matriceInclinare` cu H = Hy·Hx, determinantul 1; fiecare element primește A = W⁻¹·H·W în geometrie,
matricele rămân; dreptunghiul devine cale prin `caleDinForma`; arcele, piesa împărțită și unghiul peste 75° se refuză), inversa
afină mutată din `noduriCalcul` într-un modul al ei (`geom/inversa.ts`; întâi în `geom/matrice.ts`, dar acela e în pornire:
95,2 → 95,3 kB, deci scoasă de acolo), panoul (o singură stare pentru panourile extensiei), previzualizarea
cutiei, manualul; probele pe hârtie și în lume (instanță rotită cu 30°, o piesă-grup scalată și rotită, cubice: fiecare punct
în H·p), verzi din prima, deci o mutație în conjugarea cu W⁻¹: prinsă (2 probe picate), restaurată.
**Completed:** 25.10 10:15. Fără agenți. `npm run rapid` RC 0 (7 184 de teste unitare, 5 noi, 0 picate, 8 sărite); determinismul,
licențele verzi. E2e 201 / 203 în Edge, iar cele 2 picate (`import`, `rezumat`) au căzut pe `EBUSY` la citirea fișierului
descărcat din `test-results` (Drive-ul îl ținea): rerulate de 3 ori, 48 / 48; cele 2 noi, verzi. Emulatoarele: 36 de probe ale
funcțiilor, 13 e2e. Pornirea neschimbată (95,2 kB; cu ușa 99,9 / 100); totalul 285,9 → 287,3 / 300 kB.
**Publicat pe test:** 25.10, workflow-ul `publica` pe `a5e9d87` (după rapid-ul verde pe CI, 4 / 4 felii). Verificat în Edge pe
instanța de test (după oferta de actualizare a PWA-ului): dreptunghiul 100 × 60 din (20, 20), Înclină cu 45° pe orizontală,
previzualizarea, fără motiv; rezultatul, calea 160 × 60 cu 4 segmente, la X −10, Y 20 (paralelogramul de pe hârtie); anularea
readuce dreptunghiul; panoul în fereastră (399–703 din 711 px); 0 erori.

## 2026-10-25 — Copierea de-a lungul unei curbe (Model: Claude Opus 5.5)

**Prompt:** „Da” (la întrebarea: „Includem booleanul (unire, scădere, intersecție) în uneltele de desen, înainte de test?”, cu
varianta „Da: întâi copierea de-a lungul unei curbe, apoi booleanul, apoi testul”).
**Started:** 25.10, ~10:20. Decizia owner-ului scrisă în `CLAUDE.md` (Decizii luate) și în memorie. Felia **6.L↑**, adusă din
etapa 6, fără agenți: al treilea fel al rețelei, Pe curbă (curba = ultima formă aleasă, copiile la distanțe egale pe lungime,
cu sau fără rotirea după tangentă), prin `document.copiaza-in-retea`.
**Treceri:** (1) calculul pur (`src/model/curba.ts`: lungimea exactă pe linii și arce, Gauss–Legendre pe 32 de bucăți și Newton pe
cubice; locurile cu tangenta segmentului care pleacă din vârf; copiile cu centrul cutiei formelor în loc), felul `curba` în
rețea (motivele `copii`, `curba`), în `copiiPentru` (curba nu se copiază, nu e aleasă după), formularul (`copiiCurba`), panoul
(nota despre curbă, motivele curbei înaintea verdictului acțiunii), previzualizarea, manualul; probele pe hârtie (linia: 0, 25,
50, 75, 100; semicercul de rază 10: (10, 0) / 90°, (0, 10) / 180°, (−10, 0) / 270°; dreptunghiul 100 × 60: pas de 80, tangenta în
vârf; cercul: coarda unui sfert 10√2; cubica: locurile față de o linie frântă de 200 000 de bucăți, sub 1e-3 mm), verzi din
prima, deci trei mutații: vârful cu tangenta celui care ajunge, lungimea cubicei pe coarde, curba = prima formă aleasă (în
panou): toate prinse, restaurate.
**Completed:** 25.10 10:50. Fără agenți. `npm run rapid` RC 0 (7 190 de teste unitare, 6 noi, 0 picate, 8 sărite); determinismul,
licențele verzi. E2e 205 / 205 în Edge (2 noi); emulatoarele: 36 de probe ale funcțiilor, 13 e2e. Pornirea neschimbată (95,2 kB;
cu ușa 99,9 / 100); totalul 287,3 → 288,9 / 300 kB.
**Publicat pe test:** 25.10, workflow-ul `publica` pe `dcfa572` (după rapid-ul verde pe CI, 4 / 4 felii). Verificat în Edge pe
instanța de test (după oferta de actualizare a PWA-ului): cercul R15 ales, apoi dreptunghiul 100 × 60 cu Shift + clic (curba,
închisă), Pe curbă, 4 copii: previzualizarea (4), fără motiv; copiile cu centrul la (20, 20), (100, 20), (120, 80), (40, 80), adică
la pas de 80 pe perimetrul de 320, alese cu originalul, fără dreptunghi; anularea le scoate; 0 erori.

## 2026-10-25 — Booleanul (Model: Claude Opus 5.5)

**Prompt:** „Ok” (după copierea de-a lungul unei curbe; decizia owner-ului din 25.10: booleanul înaintea testului lui).
**Started:** 25.10, ~11:00. Felia **6.M↑**, adusă din etapa 6, fără agenți: Unește, Scade, Intersectează pe exact două forme
închise (în ordinea alegerii), prin booleanul cavalier expus în fațada `geom/offset.ts`; rezultatul înlocuiește formele într-un
pas, cu găurile în aceeași piesă.
**Treceri:** (1) `booleanContururi` în fațadă (curățare, sens trigonometric, găurile puse în exteriorul care le cuprinde, prin
numărul de înfășurare), modelul pur (`src/model/boolean.ts`: contururile tăiate, cubicele ca biarce la 0,001 mm, refuzurile),
acțiunea (`FormaNoua.gauri`, `ContextDocument.sterge`, ștergerea mutată într-o singură funcție, `comenziStergere`, folosită și
de „Șterge selecția”), secțiunea Boolean (calculul adus la primul clic), manualul (capitolul „Booleanul”, 17 capitole), probele
pe hârtie; două date greșite în probe (un pătrat „cuprins” care ieșea din celălalt; aria bombăturii cubice: −20,4, nu −12),
corectate după calculul refăcut, codul avea dreptate (195,40006 față de 195,4); e2e: Shift + clic în listă nu adaugă la
selecție (pe pânză da), documentul rămâne salvat între reîncărcări (o probă pe test, nu două), săgețile n-au mers cu focusul
pe un buton al barei (cercul pus cu unealta Cerc); proba Scade număra doar rândurile (o unire ar fi trecut): acum cere și
gaura („+1”); două mutații (operanzii scăderii inversați, butonul Scade legat la unire): prinse, restaurate; fraza din manual
„un sfert de arc” era greșită (trei sferturi rămân în afară): reformulată.
**Completed:** 25.10 11:40. Fără agenți. `npm run rapid` RC 0 (7 196 de teste unitare, 6 noi, 0 picate, 8 sărite); determinismul,
licențele verzi. E2e 209 / 209 în Edge (4 noi); emulatoarele: 36 de probe ale funcțiilor, 13 e2e. Pornirea neschimbată (95,2 kB;
cu ușa 99,9 / 100); totalul 288,9 → 291,5 / 300 kB (mai sunt ~8,5 kB: o felie mare de interfață va cere loc); manualul are 17
capitole.
**Publicat pe test:** 25.10, workflow-ul `publica` pe `4f95f7e` (după rapid-ul verde pe CI, 4 / 4 felii). Verificat în Edge pe
instanța de test (după oferta de actualizare a PWA-ului): dreptunghiul 100 × 60 ales, cercul R15 din mijloc cu Shift + clic,
Scade: o singură piesă, „cale 100 × 60, 4 segmente (+1)”, cu 2 forme, profil exterior pe contur și interior pe gaură; anularea
readuce ambele; 0 erori.

## 2026-10-25 — Orice nod își schimbă tipul (Model: Claude Opus 5.5)

**Prompt:** „Ok, dar, vreau inca un lucru inainte, vreau ca orice nod creata de orice unealta sa poata activa curbele sau schimba
tipul de inflexiune”
**Started:** 25.10, ~11:50. Felia **6.N↑**, fără agenți: două goluri ale uneltei Noduri, pe care cererea le închide: nodurile de
lângă arce (refuz „arcul ar trebui aproximat”, ADR 0063) și piesele cu mai multe contururi (refuzate cu totul). Arcele devin
cubice la cerere, sub toleranța proiectului; unealta editează fiecare contur. Schimbă ADR 0063 (punctul respins), la cererea
explicită a owner-ului.
**Treceri:** (1) modelul (`arcInCubice`: n cel mai mic, cel puțin o bucată la 90°, cu abaterea r·2·sin⁶(φ/4)/(27·cos²(φ/4)) sub
0,001 mm; `arceInCubice`: întâi segmentul de după nod, apoi cel dinainte, cu indexul nodului mutat; `tipNod` cu arcele ca părți
cu curbă; `manereAfisate`: mânerul de după conversie; `schimbaTipNod` întoarce și indexul, fără refuzul arcelor), `formaNoduri`
cu toate elementele, `document.forma` cu `nodEditat`, unealta Noduri rescrisă pe contururi (nodul ales = contur + nod; mânerul de
pe arc convertește la apăsare, iar o apăsare fără tragere pune nodul ales la loc), manualul; probele vechi adaptate (semnătura
nouă, refuzul arcelor înlocuit); probele noi (abaterea pe patru arce, semicercul R15 în 3 cubice, cercul neted după „ambele”,
colțul rotunjit, indexul pe o cale închisă, un contur dintr-un grup; documentul de probă trebuia să aibă operațiile pe `c1` / `c2`);
două mutații: criteriul de abatere scos (prinsă), conversia sărită la mânerul de pe arc (A SUPRAVIEȚUIT: proba e2e cerea doar
„cale” în rând, iar cercul salvat neschimbat ca o cale trecea; întărită cu 6 noduri și altă cutie, apoi prinsă).
Numărul de cubice din ADR, măsurat (nu calculat din cap): semicercul R15 = 3, R100 = 4 (scrisesem 5), R500 = 5.
**Completed:** 25.10 12:25. Fără agenți. `npm run rapid` RC 0 (7 201 de teste unitare, 5 noi, 0 picate, 8 sărite); determinismul,
licențele verzi. E2e 210 / 210 în Edge (2 noi, unul vechi scos: refuzul de lângă arc); emulatoarele: 36 de probe ale funcțiilor,
13 e2e. Pornirea neschimbată (95,2 kB; cu ușa 99,9 / 100); totalul 291,5 → 292,4 / 300 kB.
**Publicat pe test:** 25.10, workflow-ul `publica` pe `25052da` (după rapid-ul verde pe CI, 4 / 4 felii). Verificat în Edge pe
instanța de test (după oferta de actualizare a PWA-ului): nodurile cercului, rotunde; nodul din dreapta „ambele”, cu 2 mânere și
butonul apăsat; Colț, fără refuz: 6 noduri (semicercurile în câte 3 curbe), nodul colț; anularea readuce cercul; Scade (dreptunghiul
minus cercul), apoi Noduri: 2 contururi, 6 noduri, fără refuz; anularea; 0 erori.

## 2026-10-25 — Testul owner-ului pentru uneltele de desen (Model: Claude Opus 5.5)

**Prompt:** „Ok, dar, in timp ce eu voi face testul, vreau sa poti lucra la ce urmeaza”
**Started / Completed:** 25.10, ~12:35 / ~12:50. Pagina testului (artifact privat, cu baza ei de rezultate): 31 de pași pe
unelte, fiecare cu ce faci / ce trebuie să vezi, Bine / Nu / Sărit și o notă; rezultatele se citesc cu `ArtifactData` (colecția
`rezultate`, un document pe pas). Verificat: citirea colecției (goală). Rândul în „Ce îi trebuie owner-ului” din fișă. Cât
testează owner-ul, adresa de test nu se schimbă: feliile următoare se publică pe un canal de previzualizare.

## 2026-10-25 — Buzunarul (Model: Claude Opus 5.5)

**Prompt:** „Ok, dar, in timp ce eu voi face testul, vreau sa poti lucra la ce urmeaza”
**Started:** 25.10, ~12:55. Felia **5.1↑**, fără agenți, cât owner-ul face testul uneltelor de desen: buzunarul (etapa 5), ales
pentru că nu cere o decizie a owner-ului (textul, din etapa 7, cere un parser de fonturi de ~45 kB, iar totalul e la
292,4 / 300) și se probează pe simulare. Publicat pe un canal de previzualizare: adresa de test rămâne cea a testului.
**Treceri:** (1) documentul v11 (`tip: 'buzunar'`, `pasLateral` ≤ D / 2, latura interior și nimic din profil, cerute de ușă;
migrarea v10 → v11 doar cu numărul, un v10 cu buzunar sau cu `pasLateral` refuzat); inelele (`src/cam/buzunar.ts`: offsetul
interior la R + k·s, arborele, postordinea, legătura dreaptă la adâncime cât rămâne la R − 0,005 mm de contur), lucrarea
(refuzurile: calea deschisă, insula, contururile care se ating; buzunarul nu e inel al regiunii păstrate), dialogul („buzunar”
în selectul tăieturii, pasul lateral sub rând, ce e al profilului oprit), panoul de proprietăți, manualul. Probele: pe hârtie
(12 inele la 100 × 60, cercurile 2…17 la R20), oracolul simulării pe G-code-ul exportat (dreptunghiul, L-ul cu s = R în
opoziție, cercul: scoși întregi în deschidere, neatinși în afară), poarta fără regiune, e2e. Prima probă a sensului a găsit un
prag de topologie: dreptunghiul 40 × 30 cu s = 2,4 are inelul 6 exact la 15 mm (o linie), refuzat de offset, deci tot buzunarul
cădea; inelul se ia acum puțin mai aproape de contur (14,999 mm). Al doilea: `document.aplica-operatii` refuza schimbarea
felului operației (`tip` egal cerut), deci dialogul n-ar fi putut scrie buzunarul; felul e acum o valoare. Schema nouă a cerut
oracolul documentului pe v11 și lipirea lui cu aplicația (~24 de fișiere de probe: lanțurile `migreazaVkV11O`, `PE_V11`,
otrăvurile „schema mai nouă” de la 11 la 12, câmpul `tip` al tăieturii): 2 351 de teste picate la primul pas, toate din
versiune, niciunul din conținut. **Oracolul v11 e scris de aceeași sesiune, nu independent** (agenții erau opriți): de reluat.
(2) Plafonul: pornirea cu ușa ajunsese la 100,2 / 100 kB (măsurat pe un build al lui `HEAD`: 93,02 + 2,21 + 4,69 = 99,91; cu
buzunarul, ușa 4,79). Variantele măsurate: verificarea potrivirii buzunarului mutată din ușă în lucrare (−0,13 kB; și mai bine
pentru om: proiectul se deschide, exportul spune motivul), migrarea fără verificare (99,96, dar ar fi lăsat să treacă un v4 … v10
cu un buzunar), migrarea „compactă” cu un singur motiv (mai mare: textele lui v9 → v10 se comprimau împreună). Soluția (ADR
0070): ușa despărțită în `usaCurenta.ts` / `migrari.ts` / `incarcare.ts`; la pornire vin doar verificările, migrările (1,85 kB)
doar pentru un document mai vechi; pornirea cu ușa 98,6 / 100. Pasul `determinism` picase la prima rulare, dar ieșirea lui
era ascunsă de un `| tail` (codul de ieșire al lanțului era al ultimei comenzi): porțile se rulează de acum cu `&&`.
Mutațiile țintite: 14 / 14 prinse (pasul dublu, legătura mereu la adâncime, sensul, pragul de topologie, preordinea, pasul
peste rază, buzunarul ca inel, insula, cele două verificări ale migrării, buzunarul cu urechi, fără pas, ușa curentă care nu
cere migrările, pasul nejudecat de ușă).
Între timp, owner-ul: „vreau ca testarea asta sa fie ca un tutorial direct in app. vreau si un buton cu care sa pot face
snapshot la plansa. aceasta imagine se ataseaza automat la raportul pe care ti-l voi da la final. deci nu ar trebui sa fie
incarcata in server. dar, termina ce task ai inceput acum. si, noteaza ca vreau ca fiecare unealta sa aiba tasta de shortcut
in coltul dreapta jos al butonului, langa iconita ei, fara sa o deranjeze cumva”: notat în `CLAUDE.md` (decizii), urmează după
buzunar.
**Completed:** 25.10 14:50. Fără agenți. Nivelul rapid local, cu fiecare cod de ieșire păstrat: tipurile, importurile (579 de
module, 0 încălcări), 7 215 teste unitare (0 picate, 8 sărite; plus cele 3 noi ale ușii curente, rulate separat),
determinismul (141 de fișiere identice), licențele. E2e 211 / 211 în Edge (cel nou al buzunarului; două probe ale ușii care nu
vine, mutate pe bucata `usaCurenta`; un EBUSY al descărcărilor din Drive, verde la reluare); emulatoarele: 36 de probe ale
funcțiilor, 13 e2e. Pornirea 95,3 kB; cu ușa 99,9 → 98,6 / 100; totalul 292,4 → 295,1 / 300 kB.
**Publicat pe canal:** 25.10, `node scripts/publica-canal.ts buzunar` pe `07d8bca` (după rapid-ul verde pe CI, 4 / 4 felii):
<https://cncvectorstudio-test--buzunar-x95ick77.web.app> (30 de zile; adresa principală de test rămâne cea a testului owner-ului).
Verificat în browserul aplicației: dreptunghiul 100 × 60, rândul trecut pe „pocket”, pasul 2.4, urechile oprite cu motivul;
Export (descărcarea oprită în pagină, doar pentru verificare): 86 de linii, 5 min 40 s, simularea: dreptunghiul scos la 3,00 mm,
18,0 cm³ (pe hârtie: (6 000 − 4·(9 − 9π/4))·3 = 17 977 mm³); după reîncărcare, proiectul v11 se deschide prin ușa curentă
(`usaCurenta` + `schemaDocument` la 186 ms, înaintea primei randări; `incarcare` vine abia la ~1,2 s, cu bucățile aduse în gol),
rândul e tot buzunar; 0 erori în consolă.

## 2026-10-25 — Owner-ul fix în /admin (Model: Claude Opus 5.5)

**Prompt:** „in admin, contul meu nu ar trebui sa poata fi removed. nu din admin. si nici rolul nu ar trebui sa poata fi schimbat”
(cu captura filei Personal: rândul lui, cu rolul de ales și „Remove”).
**Started:** 25.10, ~15:00. Felia **14.A↑b**, fără agenți, după buzunar. Serverul refuza doar ultimul owner; cu un al doilea
owner (dat din /admin), oricare îl putea scoate pe celălalt. ADR 0071: un owner nu se scoate și nu-și schimbă rolul din /admin,
oricine ar cere-o; rolul owner se dă doar din consolă (alegerea mea, ca un owner dat de aici să nu rămână fără cale de
întoarcere); rândul owner-ului e doar de citit și arată adresa contului logat (înainte, uid-ul).
**Treceri:** (1) callable-ul, pagina, probele pe emulatoare; e2e-ul invitației cerea un owner (trecut pe un rol custom) și
număra doi oameni, deși `intraCaOwner` face de fiecare dată un cont nou (trei: doi owneri ficși și invitata).
**Completed:** 25.10 15:21. Emulatoarele: 36 de probe ale funcțiilor, 13 e2e; nivelul rapid local cu codurile păstrate: 7 218
teste unitare (0 picate, 8 sărite), determinismul (142 de fișiere identice), /admin 189,8 / 200 kB.
**Publicat:** 25.10, după rapid-ul verde pe CI (4 / 4 felii) pe `d367a1d`: serverul pe test (`npm run publica:functii`: cele 6
funcții `cncvs2`, regulile neschimbate, indecșii; amprenta în `meta/deployment`), deci refuzul e activ de acum și pe adresa
principală; pagina, pe canalul buzunar (<https://cncvectorstudio-test--buzunar-x95ick77.web.app/admin>: se deschide la intrare,
0 erori; intrarea ca owner nu se poate verifica de aici). Pe adresa principală de test, pagina vine după testul owner-ului.

## 2026-10-25 — Testul pas cu pas, în aplicație (Model: Claude Opus 5.5)

**Prompt:** „vreau ca testarea asta sa fie ca un tutorial direct in app. vreau si un buton cu care sa pot face snapshot la
plansa. aceasta imagine se ataseaza automat la raportul pe care ti-l voi da la final. deci nu ar trebui sa fie incarcata in
server. dar, termina ce task ai inceput acum. […]”, apoi „Da, pornește tutorialul de test în aplicație, cu butonul de snapshot
al planșei.”
**Started:** 25.10, ~15:40. Felia **3.I**, fără agenți (ADR 0072). Pagina din artifact n-avea niciun rezultat scris, deci a
fost înlocuită fără pierderi. Bugetul total era la 295,1 / 300 kB: bucata testului (5,7 kB gzip) n-ar fi încăput, așa că e a
doua parte doar online, cu plafonul ei, ca `/admin` (testul există doar pe instanța de test; nimeni altcineva n-o descarcă).
**Treceri:** (1) pașii ca document (`docs/tutorial/unelte-desen.md`, cu generatorul și poarta lui; tastele ca cod inline,
fiindcă cititorul de markdown nu știe `<kbd>`), panoul (pașii, Bine / Nu / Sărit, nota, lista pașilor, focusul dat înapoi
paginii după fiecare clic), stocarea în IndexedDB, poza planșei, raportul HTML, butonul (doar în afara live), manualul,
probele (generatorul, raportul cu o notă care încearcă `</script>`, e2e cap-coadă și „pe live, fără buton”). Prima poză,
privită cu ochii: foaia, riglele, formele și linia mânerului de rotire, dar fără mânere: cele ale transformării sunt
elemente HTML, nu SVG; desenate acum din stilul lor, iar a doua poză arată ca ecranul.
**Completed:** 25.10 16:15. Fără agenți. Nivelul rapid local, cu codurile păstrate: 7 223 de teste unitare (0 picate, 8 sărite;
două probe aduse la zi: copia arborelui documentației cere și `docs/tutorial/`, lista părților doar online are și testul),
determinismul (146 de fișiere identice), licențele; e2e 213 / 213 în Edge (2 noi; manualul are acum 18 capitole);
emulatoarele: 36 de probe ale funcțiilor, 13 e2e. Pornirea 95,3 kB, cu ușa 98,6 / 100; totalul 295,3 / 300; testul pas cu pas
5,8 / 12 kB, doar online (în afara precache-ului: bucata, stilul și pașii).
**Publicat pe canal:** 25.10, după rapid-ul verde pe CI (4 / 4 felii) pe `c0d2806`: <https://cncvectorstudio-test--buzunar-x95ick77.web.app>.
Verificat în browserul aplicației: workerul PWA a servit întâi versiunea dinainte, apoi a oferit „Reîncarcă”; după el, butonul
Test (în fereastra de 1 280 px; în panoul îngust al browserului, de 595 px, extensia barei iese din ecran, cu „?” cu tot),
panoul cu pasul 1, pașii aduși din `tutorial/unelte-desen.json` (doar online), OK apăsat, poza salvată, focusul înapoi
pe pagină; 0 erori în consolă. Raportul (descărcarea) e probat în e2e, nu aici.

## 2026-10-25 — Publicarea pe adresa principală de test (Model: Claude Opus 5.5)

**Prompt:** „Pe pagina principala de test. Ma gandesc sa folosim acest test/tutorial si pe viitor, in aplicatia live, exact ca un
turorial. Ceva care sa ajute userii sa lucreze cu aplicatia. Asa ca, nu trebuie sa pierdem codul asta. Va fi repurposed”
**Started:** 25.10, ~16:40. Testul din artifact nu începuse (niciun rezultat), deci adresa principală nu mai trebuia ținută pe
loc: se publică tot ce era pe canal (buzunarul, documentul v11, ușa curentă, pagina personalului, testul). Decizia owner-ului e
în `CLAUDE.md` și în ADR 0072 („Mai departe”): codul testului rămâne, pentru tutorialul utilizatorilor de pe live.
**Completed / publicat:** 25.10, workflow-ul `publica` (instanța test) pe `40582a6`, după rapid-ul verde pe CI (rularea
40204222756: „Commit-ul cerut” și „Publicarea” reușite). Verificat în browserul aplicației pe
<https://cncvectorstudio-test.firebaseapp.com/>: workerul PWA a oferit „Reîncarcă”; după el, versiunea nouă, proiectul vechi al
browserului (v10, 2 forme) redeschis prin migrare (ușa curentă, apoi `incarcare` cu migrările, cum cere un document vechi),
exportul cu „buzunar” între tăieturi, butonul Test, panoul la pasul 1 cu pașii de pe server (200); 0 erori în consolă.

## 2026-10-25 — Tasta fiecărei unelte, pe butonul ei (Model: Claude Opus 5.5)

**Prompt:** „poti sa continui cu altceva intre timp” (cererea notată pe 25.10: „vreau ca fiecare unealta sa aiba tasta de
shortcut in coltul dreapta jos al butonului, langa iconita ei, fara sa o deranjeze cumva”).
**Started:** 25.10, ~17:00. Felia **6.O↑**, fără agenți: o literă pe fiecare buton de unealtă, din aceeași hartă ca
scurtăturile (`TASTA_UNELTEI` = inversul lui `TASTE_UNELTE`). Proba din Edge cere, pe fiecare buton: litera în sfertul
dreapta-jos, cutia ei fără nicio atingere cu cutia iconiței, clicul pe literă ajunge la buton, iar tasta scrisă chiar alege
unealta. **Treceri:** (1) la 9 px și 3 px de margini, cutia literei atingea cutia iconiței (16 px, de la 9 la 25 px) cu 1–2 px:
măsurat pe fiecare buton, apoi 8 px, lipită de jos; privită la 2×, în ambele teme.
**Completed:** 25.10 17:05. Nivelul rapid local: 7 224 de teste unitare (0 picate), determinismul (146 de fișiere identice),
licențele; e2e 214 / 214 în Edge (1 nou); emulatoarele: 36 de probe ale funcțiilor, 13 e2e. Pornirea neschimbată (95,3 kB).
**Publicat pe canal:** 25.10, `buzunar` (<https://cncvectorstudio-test--buzunar-x95ick77.web.app>), după rapid-ul verde pe CI
pe `99f0059` (rularea 40206238874). Verificat în browserul aplicației, la 1 280 px: după „Reîncarcă” (workerul nou), cele 9
litere (V S N B R O E L P) pe butoanele uneltelor. Adresa principală rămâne pe `40582a6` cât owner-ul face testul.

## 2026-10-25 — Insulele buzunarului (Model: Claude Opus 5.5)

**Prompt:** „poti sa continui cu altceva intre timp” (și „continua” după întreruperea contextului; „Try again” după o comandă
ruptă).
**Started:** 25.10, ~17:10. Felia **5.2↑**, fără agenți (ADR 0073): buzunarele de pe foaie cu aceeași adâncime sunt unul
singur, citit par-impar, peste piese și operații (insula, apoi iar buzunar în golul ei); cu altă adâncime, treaptă; cele care
se ating, refuzate. În planul spus owner-ului, insula era „orice formă a piesei din buzunar”; am schimbat-o înainte de cod:
formele desenate sunt piese separate și importul SVG împarte contururile în operații după imbricare, deci regula pe piesă n-ar
fi prins nici dreptunghiul cu un cerc desenat în el, nici rama cu text (ADR 0073, „Respinse”). Offsetul unei regiuni
(`offsetRegiune`, figura lui cavalier, aceleași gărzi; `verificaIesire` primește și o listă), inelele pe bucăți, legăturile
departe și de insule, buclele unei bucăți de la cea mai apropiată. **Treceri:** (1) proba de arie la 10 mm cădea exact pe un
prag (golul de 20 mm = 2d; a lucrat a doua încercare, cu 0,013 mm² mai puțin): mutată la 12 mm, iar pragul și-a primit proba;
două heredoc-uri rupte în shell (scrise apoi cu editorul).
**Completed:** 25.10 17:58. Nivelul rapid local: 7 237 de teste unitare (0 picate; 24 ale buzunarului, 3 ale regiunii),
determinismul (147 de fișiere), licențele, importurile; e2e 214 / 214 în Edge. Pornirea neschimbată (95,3 kB); totalul
295,4 → 297,5 / 300 kB (figura lui cavalier intră în bucata exportului). Mutațiile țintite: 18 / 18 prinse. Viteza (măsurată):
240 de insule, 691 de bucle, inelele în 0,23 s, traseul în 0,07 s, dar 620 de ridicări pe două treceri (limita din ADR).
**Publicat pe canal:** 25.10, `buzunar` (<https://cncvectorstudio-test--buzunar-x95ick77.web.app>), după rapid-ul verde pe CI
pe `e295276` (rularea 40209524518). Verificat în browserul aplicației: un cerc R12 pus în dreptunghiul 100 × 60 (din panoul de
proprietăți), amândouă buzunare de 3 mm în fereastra exportului: exportul trece, rezumatul are o singură operație (a
dreptunghiului), harta simulării arată insula albă în buzunar, iar materialul scos e 16,6 cm³ (pe hârtie: (6 000 − 7,73 colțurile
− 452,4 insula) × 3 = 16,62 cm³; fără insulă ar fi 17,98). Adresa principală rămâne pe `40582a6` cât owner-ul face testul.

## 2026-10-25 — Remedierile din testul uneltelor de desen (Model: Claude Opus 5.5)

**Prompt:** „mai tarziu. deocamdata uite raportul testului:” (cu raportul HTML al testului pas cu pas, programul exportat la
pasul x-export și captura rezumatului lui); între timp, despre buzunar: „coborarea in buzunar pe rampa sau elice, si ar trebui
sa fie configurabila de user, unghi, lungime, numar de rampe etc.” și „si eventual sa poata fi si evitata” (felia următoare).
**Started:** 25.10, ~18:25. Raportul citit din fișier (datele JSON și cele 30 de poze, scoase local): 29 de pași bine, 0 nu,
2 nemarcați (Shift + clic, fără notă: codul comută selecția, proba e2e trece; offsetul exterior, cu notă), note pe 8 pași.
Avertismentul portocaliu din captura exportului („avansul trece de viteza maximă a mașinii”) e al profilului GRBL din fabrică
(500 mm/min) față de avansul de 1 000: dispare cu `$$` lipit (ADR 0046). Felia **6.P↑**, fără agenți (ADR 0074): clicul,
colțurile offsetului, poziția față de curbă, Pen-ul (dublu clic, închiderea, anularea, redeschiderea), mânerele, cronologia
roadmap-ului (cererea de după test). Înainte, `e295276` (insulele, tastele) publicat pe adresa principală de test (rularea
40211865906). **Treceri:** (1) pe hârtie: colțul unui contur rămas cu trei vârfuri nu se prelungea (indexul de după arc nu
trecea peste capăt), capătul unui braț lat cât 2d nu se racorda întreg (un segment consumat exact era refuzat); o valoare a probei
era greșită (colțul intrând al L-ului adaugă arie la offsetul exact); trei heredoc-uri rupte în shell (scrise apoi din fișier).
**Completed:** 25.10 19:37. Porțile întâi au picat pe totalul JS: 302,1 kB peste plafonul de 300 (colțurile, ~2,4 kB gzip, nu
dublau nimic; măsurat pe bucata offsetului): **ADR 0075**, plafonul total 330 kB, totul rămâne în precache (altfel importul,
vederea 3D și simularea n-ar merge offline până la prima folosire). Apoi: 7 249 de teste unitare (0 picate), determinismul
(150 de fișiere), licențele, importurile; e2e 218 / 218 în Edge (proba pânzei rescrisă: clicul pe marginea cercului dintr-un
dreptunghi de deasupra alege acum cercul, ADR 0074 §1); emulatoarele: 13 e2e. Pornirea neschimbată (95,3 kB). Mutațiile
țintite: 18 / 20 prinse; cele două rămase sunt o gardă dublă (direcția și cea mai apropiată intersecție), prinsă ca pereche;
distanța la original și atingerea au primit câte o probă care le ocolește pe celelalte.
**Publicat pe adresa principală de test:** 25.10, workflow-ul `publica` pe `1d5a69d` (rularea 40218100027), după rapid-ul verde
(40217419646). Verificat în browserul aplicației pe <https://cncvectorstudio-test.firebaseapp.com/>, după „Reîncarcă”: tastele pe
butoane; offsetul spre exterior implicit „Ca originalul” (calea 110 × 70, 4 segmente); clicul în dreptunghi alege dreptunghiul,
între contururi calea nouă, pe marginea cercului cercul.

## 2026-10-25 — Coborârea în buzunar (Model: Claude Opus 5.5)

**Prompt:** „Da, pornește felia rampei / elicei în buzunar, configurabilă, cu varianta fără.” (cererea de dinainte: „coborarea in
buzunar pe rampa sau elice, si ar trebui sa fie configurabila de user, unghi, lungime, numar de rampe etc.”, „si eventual sa poata
fi si evitata”); între timp, puse la coadă: înclinarea cu arcele făcute curbe („ar trebui sa am optiunea de a transforma cerul in
elipsa, sau colturile”), chenarul întrerupt al uneltei Transformare („initial si default sa fie un border dashed”) și cronologia
roadmap-ului („si tot nu vad in acest timeline ce progres avem deja facut”).
**Started:** 25.10, ~19:50. Felia **5.3↑**, fără agenți (ADR 0076): documentul v12 (`Operatie.coborare`), felurile în
`src/cam/coborare.ts` (plonjare, rampă pe inel, zigzag, elice), centrul elicei ales în bucată (`centruElice`), căderea pe inel cu
avertisment, dialogul și panoul. Cele ~116 probe legate de numărul schemei mutate pe v12. O probă cu insula presupunea greșit că
elicea nu încape. Heredoc-ul a mâncat un `\n` din scriptul mutațiilor (scris apoi cu Edit).
**Completed:** 25.10 21:08. Porțile: 7 256 de teste unitare (0 picate), determinismul, licențele, importurile; e2e 219 / 219 în
Edge; emulatoarele 13 / 13. Pornirea 95,3 / 100 kB, totalul 305,1 / 330, `/admin` 189,9 / 200. Mutațiile țintite: 24 / 31 la prima rulare; după probele noi (centrul elicei, direct; tura
plină de la adâncime; bucla după elice; zigzagul mai lung decât bucla), 29 / 30 directe, garda legăturii elicei (a doua plasă)
prinsă în pereche, una echivalentă (un 2π în unghiul de pornire al elicei) scoasă din cod. Porțile au picat o dată pe regula
de import (dialogul lua tipul `Coborare` direct din model; acum prin `actiuniExportTipuri`).
**Publicat pe adresa principală de test:** 25.10, workflow-ul `publica` pe `2d8467d` (rularea 40225274835), după rapid-ul verde
(40224561619). Verificat în browserul aplicației pe <https://cncvectorstudio-test.firebaseapp.com/>, după actualizarea workerului:
cercul R15 trecut pe buzunar are Descent (Plunge implicit); Zigzag: 3°, 20 mm, „4 ramps per pass” (pasul de 4 mm); Helix: raza 3;
unghiul de 60° marchează câmpul și dă motivul. Fără export acolo (descărcarea și programul sunt probate în e2e).

## 2026-10-25 — Progresul etapelor viitoare în cronologie (Model: Claude Opus 5.5)

**Prompt:** „si tot nu vad in acest timeline ce progres avem deja facut” (cu două capturi ale cronologiei din `/admin`: etapele
5, 6 și 14 gri, doar cu „↑2”, „↑16”, „↑2”), venit cât felia coborârii era la porți.
**Started:** 25.10, ~21:10. Felia **3.J**, fără agenți (ADR 0077). Cauza: bara unei etape fără fișă se umplea doar din punctele
ei din `PLAN.md` §5.3 (descrise doar pentru primele etape), iar umplerea unei etape viitoare n-avea culoare. Acum: rândurile de
prag din coloana „Închide”, cu starea din `ACOPERIRE`; legătura punct → rând măsurată întâi pe tot planul (prefixul prinde
jumătate, cuvintele încă o parte; adminul și §10 rămân nemăsurate).
**Completed:** 25.10 21:26. Porțile: 7 259 de teste unitare (0 picate), e2e 219 / 219 în Edge, emulatoarele 36 + 13 (proba nouă:
bara etapei 6 plină și colorată, a etapei 5 la ⅛); `/admin` 190,2 / 200 kB. Mutațiile: 7 / 7 prinse, una echivalentă (o
verificare de prisos în `randulPragului`, scoasă).
**Publicat pe adresa principală de test:** 25.10, workflow-ul `publica` pe `d637757` (rularea 40227687800), după rapid-ul verde
(40226995385). `/admin` cere login (nu-l fac eu): verificat `documentatie/roadmap.json` publicat: etapa 6 are 2 / 2 rânduri de prag
făcute, etapa 5 unul în lucru din 4 (și un punct nemăsurat), etapa 14 doar punctul adminului, nemăsurat; desenul barei, probat pe
emulatoare (captura `.tmp/roadmap.png`, trimisă owner-ului).

## 2026-10-25 — Înclinarea formelor cu arce (Model: Claude Opus 5.5)

**Prompt:** „Da, pornește înclinarea cu arcele făcute curbe.” (cererea de dinainte, cu captura panoului care refuza un cerc: „ar
trebui sa am optiunea de a transforma cerul in elipsa, sau colturile”); între timp: „iar dupa, vreau sa continuam cu ce a ramas
din etapa 3”.
**Started:** 25.10, ~21:35. Felia **6.Q↑**, fără agenți (ADR 0078), pe calea scrisă în ADR 0065 („Se redeschide dacă”): bifa în
panou, arcele făcute cubice (ADR 0068) cu toleranța împărțită la scara elementului și la întinderea înclinării, ca abaterea să
rămână sub 0,001 mm după înclinare, în lume.
**Completed:** 25.10 22:14. Porțile: 7 264 de teste unitare (0 picate), e2e 220 / 220 în Edge, emulatoarele 36 + 13; pornirea
95,3 / 100 kB, totalul 305,6 / 330. Mutațiile: 7 / 8 la prima rulare (scara elementului scăpa: la scara 2, numărul de cubice
avea rezervă), apoi cazul cu scara 50: 8 / 8.
**Publicat pe adresa principală de test:** 25.10, workflow-ul `publica` pe `8ec91b7` (rularea 40230471038), după rapid-ul verde
(40229790668; publicarea pornită doar după concluzia „success”). Verificat în browserul aplicației, după actualizarea workerului
(o versiune nouă aștepta): cercul R15 → bifa apare nebifată, motivul trimite la ea; bifată, 35° → „path 36.62 × 30.00, 6
segments” (30 · √(1 + tan² 35°) = 36,62 pe hârtie), elipsa pe pânză; anularea readuce cercul.

## 2026-10-25 — Emulatorul GRBL, fără placă (Model: Claude Opus 5.5)

**Prompt:** „Lasă chenarul pentru mai târziu; continuă direct cu ce a rămas din etapa 3, începând cu emulatorul GRBL.” (cererea de
dinainte: „iar dupa, vreau sa continuam cu ce a ramas din etapa 3”).
**Started:** 25.10, ~22:20. Felia **3.5a**, fără agenți (ADR 0079): 3.5 despărțită în 3.5a (emulatorul, acum) și 3.5b
(transcrierile reale, după placă). Cifrele verificate în sursele GRBL 1.1 (serial.h / serial.c, protocol.h / protocol.c,
planner.h, gcode.c, report.h), citite pentru comportament, nu copiate. Constatări: octeții peste 0x7F nu intră în buffer (deci
martorul UTF-16 din PORTARE nu pierde octeți), dar „ș” / „ț” sunt override-uri ale axului; `$#` și setările dau `error:8` în
mișcare; avansul e plafonat de viteza axelor (500 mm/min implicit), deci probele cu F600 au coborât la F300.
**Completed:** 25.10 23:06. Porțile: 7 287 de teste unitare (0 picate; două probe ale documentației citeau încă felia 3.5,
actualizate), e2e 220 / 220 în Edge (o primă rulare a picat pe `EBUSY` la un fișier descărcat din `test-results`, în Drive,
la o probă de export neatinsă de felie; a doua, curată). Mutațiile: 28 / 30, apoi 30 / 30.
**Publicat pe adresa principală de test:** 25.10, workflow-ul `publica` pe `031cd83` (rularea 40234510313), după rapid-ul verde
(40233828008). Verificat `documentatie/roadmap.json` publicat: 3.5a gata (ADR 0079), 3.5b de făcut. Owner-ul: „continuam maine”
(pauză; următoarea felie propusă: 3.6, fluxul senderului pe emulator; chenarul Transformării, amânat).

## 2026-10-26 — Fluxul senderului, fără mașină (Model: Claude Opus 5.5)

**Prompt:** „continua” (după pauza de aseară; propunerea rămasă: 3.6, fluxul senderului, probat pe emulator).
**Started:** 26.10, ~07:05. Începutul sesiunii: `main` curat, rapid verde pe `031cd83`, noaptea verde (25.10 06:15 UTC, sub
26 h). Felia 3.6 despărțită în **3.6a** (fluxul, acum, fără mașină) și **3.6b** (sesiunea Web Serial și panoul). Fără agenți
(ADR 0080): `src/machine/program.ts`, `raspunsuri.ts`, `flux.ts`; probele pe emulatorul din 3.5a, cu ajutorul
`test/unit/ajutor-sender.ts` (acțiunile ajung la emulator, liniile lui se întorc ca evenimente, ceasul cere rapoarte).
**Completed:** 26.10 07:32. Porțile: 7 310 teste unitare (0 picate; proba documentației citea încă felia 3.6, actualizată),
e2e 220 / 220 în Edge; pornirea neschimbată (95,3 kB; senderul încă nu e legat de interfață). Mutațiile: 32 / 33, cea rămasă
echivalentă (scoasă din cod), cu o probă nouă pentru eroarea din fața unei bariere.

## 2026-10-26 — Panoul mașinii, cu mașina simulată (Model: Claude Opus 5.5)

**Prompt:** „Da, pornește 3.6b: portul Web Serial și panoul mașinii, cu o mașină simulată (emulatorul) pe instanța de test, ca
să-l pot încerca fără CNC.”
**Started:** 26.10, ~07:45. Felia **3.6b**, fără agenți (ADR 0081): sesiunea (`src/machine/sesiune.ts`), portul Web Serial
(`serial.ts`), mașina simulată (`MasinaSimulata.ts`, emulatorul mutat cu `git mv` din `test/emulator/` în
`src/machine/emulator.ts`, cu `laNemodelat: 'eroare'` în aplicație), panoul (`src/app/PanouMasina.tsx`, la cerere, în docul din
dreapta), dicționarul `masina.*`, capitolul din manual, bucata doar online cu plafonul ei. Fluxul a primit evenimentul
`deconectat` (regula 4).
**Completed:** 26.10 08:30. Porțile: 7 320 de teste unitare (0 picate; probele-paznic ale aranjamentului, ale listei doar
online și ale numărului de uși au cerut panoul nou), e2e 224 / 224 în Edge (manualul are acum 19 capitole), emulatoarele
36 + 13. Pornirea 95,5 / 100 kB (cu ușa 98,9), totalul 314,2 / 330, mașina simulată 5,1 / 8 (doar online). Mutațiile: 12 / 13,
apoi 13 / 13. **Lecție:** proba `/admin` de pe emulatoare citește roadmap-ul real: despărțirea lui 3.5 (felia 3.5a) a stricat-o,
iar la 3.5a și 3.6a n-am rulat `test:emulator` (rularea de noapte de pe `4a016ea` o va arăta roșie); reparată aici. O schimbare
în tabelul feliilor cere și `npm run test:emulator`.
**Publicat pe adresa principală de test:** 26.10, `publica` pe `7ff5a3c` (rularea 40282496339), după rapid-ul verde
(40281719278). Verificat în browserul aplicației: panoul „Machine” în dreapta, Mașina simulată conectată, starea Idle, poziția
0 / 0 / 0. **Găsit la verificare:** liniile sesiunii din jurnal erau scrise în română în cod (și în interfața engleză) → coduri
traduse de panou (`CodJurnal`, `masina.jurnal.*`, `masina.motiv.*`), mesajul emulatorului pentru ce nu e simulat în engleză (ca
mesajele GRBL), o probă e2e în engleză; porțile: 7 320 / 225 / 36 + 13. Nivelul complet, pornit din nou pe `7ff5a3c` după noaptea
roșie (proba `/admin`, 3.5).

## 2026-10-26 — Jog, zero și palparea Z, pe mașina simulată (Model: Claude Opus 5.5)

**Prompt:** „Da, pornește 3.7: jog, zero XY / Z, palparea Z cu placa de contact și G54–G59, întâi pe mașina simulată.”
**Started:** 26.10, ~09:40. Felia **3.7a**, fără agenți (ADR 0082): 3.7 despărțită în 3.7a (pe mașina simulată, acum) și 3.7b
(pe mașină, cu placa de contact); blocul de după `M6` trece la post (3.8). Emulatorul întâi (jog-ul `$J=`, 0x85, palparea
`G38.2` / `G38.3` pe o placă simulată, G-code-ul refuzat în Jog, `WCO:` în rapoarte), apoi procedurile pure
(`src/machine/proceduri.ts`), legarea în sesiune (WCS-ul citit singur, G-code-ul procedurii doar pe un Idle proaspăt, starea
modală pusă la loc după palpare), panoul (secțiunea Poziționare) și probele pe hârtie și pe emulator.
**Completed:** 26.10 11:25. Porțile: 7 356 de teste unitare (0 picate, 8 sărite), e2e 228 / 228 în Edge, emulatoarele 36 + 13.
Pornirea 95,5 / 100 kB (cu ușa 98,9), totalul 319,9 / 330, `/admin` 190,2 / 200, mașina simulată 5,9 / 8 (doar online).
**Găsit pe drum:** (1) prima palpare pe emulator a picat cu `error:9`: `ok`-ul jog-ului de retragere vine la planificare, iar
atingerea fină pleca cât jog-ul încă mergea (GRBL 1.1 refuză G-code-ul în Jog, modelat acum și în emulator) → G-code-ul
procedurilor pleacă doar pe un Idle proaspăt; (2) emulatorul nu trimitea `WCO:`, deci panoul arăta doar poziția mașinii și un
zero nu se vedea → `WCO:` ca GRBL (primul raport, după o schimbare, la 10 / 30 de rapoarte); (3) pe pagina servită local,
workerul PWA ținea CSS-ul vechi (butoanele jog-ului fără margine): verificarea s-a făcut după ștergerea cache-ului.
Mutațiile: 55 / 59; două echivalente scoase din cod (citirile interne oprite și în timpul unei proceduri; refuzul fluxului pentru
o comandă a procedurii, de neatins), două prinse de probe noi (repornirea cât un zero așteaptă Idle-ul; portul fără banner);
pe panou, 4 / 4 prinse de e2e. Manualul are o poartă nouă: fiecare control `data-masina` e numit în capitolul „Mașina”.
**Publicat pe adresa principală de test:** 26.10, `publica` pe `3299b59` (rularea 40299960682), după rapid-ul verde
(40298814404). Verificat în browserul aplicației, în engleză, pe mașina simulată: WCS-ul G54 citit, 10 butoane de jog; Zero XY
dezactivat cât mașina era în Jog (corect); **Probe Z (G54)**: „Z0 written in G54: the plate touched at machine Z -25.000,
thickness 20 mm.”, poziția de lucru Z 25.000, apoi `G0 G21 G90` în jurnal; **Zero XY (G54)**: „Zero XY written in G54.”,
poziția de lucru X 0 Y 0; 0 erori în jurnalul local. (Workerul PWA ținea versiunea veche: verificarea după ștergerea cache-ului.)

## 2026-10-26 — Postul familiei GRBL, cu schimbarea sculei (Model: Claude Opus 5.5)

**Prompt:** „Da, pornește 3.8: postul, cu contractele grblHAL și FluidNC și schimbarea sculei (blocul de după M6), probat pe
emulator.”
**Started:** 26.10, ~11:45. Felia **3.8a**, fără agenți (ADR 0083): 3.8 despărțită în 3.8a (postul întreg, probat pe hârtie și
pe emulator) și 3.8b (joburile cu mai multe scule din document: CAM-ul cu diametrul fiecărei tăieturi, freza pe operație în
dialog, simularea și estimarea peste schimbări, fișierele separate în interfață). Contractele grblHAL și FluidNC ca date (s8,
A.2 / A.3), câmpurile noi ale contractului (inch, elicea, strategiile), evenimentul `schimba-scula` în IR, postul cu cele 4
strategii și blocul de după, fereastra exportului cu Postul și Unitățile.
**Completed:** 26.10 12:26. Porțile: 7 371 de teste unitare (0 picate, 8 sărite), e2e 229 / 229 în Edge, emulatoarele 36 + 13.
Pornirea 95,6 / 100 kB, totalul 322,2 / 330 (contractele intră în bucata dialogului și a calculului exportului).
**Găsit pe drum:** (1) palparea noii scule la oprire a dat ALARM:4: la Z sigur (5 mm peste material), freza e sub fața unei plăci
de 20 mm, deci omul trebuie să ridice freza cu jog înainte de palpare (corect; proba o face); (2) proba `/admin` de pe emulatoare
citește pragul real: rândul „Ordinea + un fișier pe sculă” trecut în lucru a mutat bara etapei 5 de la 0,125 la 0,25 (prins de
`test:emulator`, rulat după lecția din 26.10). Mutațiile: 30 / 31 (F ținut minte peste schimbare → probă nouă), apoi 31 / 31; pe
fereastra exportului, 4 / 4 prinse de e2e. Programul în mm a rămas octet cu octet (fișierele de aur ale plăcilor).
**Publicat pe adresa principală de test:** 26.10, `publica` pe `3b978db` (rularea 40308563472), după rapid-ul verde
(40307495608). Verificat în browserul aplicației, fără descărcare: fereastra exportului are **Post** (GRBL 1.1, grblHAL, FluidNC)
și **Units** (mm, inch), iar nota postului neprobat se schimbă cu postul ales. **Găsit la verificare:** titlul ferestrei spunea
tot „Export G-code (GRBL 1.1)” cu grblHAL ales → titlul numește postul ales (`export.titlu` cu `{post}`), cu proba lui în e2e;
porțile: 7 371 / 229 (o cădere `EBUSY` a Drive-ului în `test-results`, trecută la rularea din nou).
**Publicat din nou pe test:** `publica` pe `c3f5894` (rularea 40311488776), după rapid-ul verde (40310337105); verificat: cu FluidNC
ales, titlul e „Export G-code (FluidNC)”, iar nota numește FluidNC.

## 2026-10-26 — Joburile cu mai multe freze (Model: Claude Opus 5.5)

**Prompt:** „Da, pornește 3.8b: joburile cu mai multe freze din document (freza pe operație, jobul CAM, simularea și estimarea
peste schimbări, fișierele separate), ca să pot încerca schimbarea sculei pe mașina simulată.”
**Started:** 26.10, ~12:55. Felia **3.8b**, fără agenți (ADR 0084): jobul CAM cu diametrul fiecărei tăieturi și schimbările,
ordinea grupată pe freză, simularea în grupuri, estimarea cu opririle senderului, rezumatul pe freze, freza pe rând în fereastra
exportului, strategia și fișierele separate, panoul mașinii cu lista fișierelor și freza de montat la oprire.
**Completed:** 26.10 14:40. Porțile: 7 381 de teste unitare (0 picate, 8 sărite), e2e 231 / 231 în Edge, emulatoarele 36 + 13;
pornirea 95,9 / 100 kB, totalul 324,5 / 330 (strâmt: ~5,5 kB). **Găsit pe drum:** (1) gruparea pe freză pusă în `taieturiFoaie` schimba
contractul ordinii documentului (ADR 0025 / 0037), judecat de oracolul documentului (54 de probe roșii): gruparea e acum a
programului (`grupeazaPeScula`), lista documentului rămâne; (2) placa 2 cu o piesă pe T2 dă T2, T1, T2 (clasele nu se amestecă),
deci fișierele separate au ordinea în nume (`-1-T2`, `-2-T1`, `-3-T2`); (3) **Drive-ul a readus o mutație deja restaurată**
(`if (false)` în `export.ts`, după rularea de mutații): prinsă de proba fișierelor separate, apoi fiecare fișier mutat verificat
față de textul original (`verifica-mutatii.py`), inclusiv rulările 3.7a și 3.8a (curate). Mutațiile: 23 / 28, apoi 26 / 26 pe
codul final (două echivalente scoase); pe interfață, 5 / 5 prinse de e2e.
**Publicat pe adresa principală de test:** `publica` pe `6137acf` (rularea 40323431019), după rapid-ul verde (40322263620).
Verificat în browserul aplicației (fără descărcare): fiecare rând are T și Ø; cu T2 pe cerc apare „Tool change” (cele trei
strategii ale GRBL 1.1), cu T1 Ø3 pe cerc „T1 has two diameters (6, 3 mm): each bit needs its own number.” și Export oprit.
**Găsit la verificare:** câmpurile T și Ø stăteau unul sub altul, la fel de late → alăturate, T îngust (CSS); porțile din nou:
7 381 / 231. Fluxul pe mașina simulată (export, oprirea, palparea, Continuă) e probat în e2e: pe test, exportul ar cere o
descărcare.
**Publicat din nou pe test:** `publica` pe `3c72702` (rularea 40326096761), după rapid-ul verde (40325257548); verificat: T și Ø
alăturate pe rând (T îngust, 52 px).

## 2026-10-26 — Dicționarul codurilor controlerului (Model: Claude Opus 5.5)

**Prompt:** „Da, pornește dicționarul codurilor GRBL: error:N și ALARM:N cu explicații și ce faci, în panoul mașinii.”
**Started:** 26.10, ~15:10. Felia **3.6c**, fără agenți (ADR 0085): un tabel pe familie (GRBL 1.1, grblHAL, FluidNC), cu
numerele citite din sursele firmware-ului, textele noastre în ambele limbi, generate ca date în precache; familia din banner și
`$I`; ultimul cod cu locul lui și alarma care ține mașina, în sesiune; cardul din panou și confirmarea deblocării.
**Completed:** 26.10 16:30. Porțile: 7 409 teste unitare (0 picate, 8 sărite), e2e 237 / 237 în Edge, emulatoarele; pornirea
95,9 / 100 kB, totalul 328,1 / 330 (+3,7 kB: cardul, textele lui în ambele limbi, încărcarea dicționarului; mai sunt ~1,9 kB);
dicționarul, date în precache: 8,9 kB (ro) și 8,5 kB (en) gzip. **Găsit pe drum:** (1) bannerul grblHAL („GrblHAL 1.1f”) nu era
recunoscut ca repornire (fluxul nu se golea, WCS-ul nu se recitea); (2) la FluidNC, `$H` fără homing dă `error:5`, iar o linie
lungă `error:14`, deci tabelele sunt pe familie; `ALARM:10` are trei înțelesuri; (3) un text al `error:8` spunea „doar în
Idle”, deși GRBL primește comenzile `$` și în Alarm. Mutațiile: 29 / 31 la prima rulare (o resetare echivalentă scoasă din
`conecteaza`, o probă nouă pentru blocare: 31 / 31); pe interfață 10 / 10 prin e2e (una, căzută întâi la build, refăcută ca
să se construiască); fișierele verificate după rulări (`verifica-mutatii.py`): curate.
**CI:** rularea 40337287129 „cancelled”: felia 4 a testelor unitare a trecut de 10 minute, fiindcă `--test-shard` împarte
fișierele după poziție și cele trei fișiere noi au mutat acolo teste grele. CI rapid în 6 felii (`3b15484`), verde
(40339240275, cea mai lentă 8 min 21 s).
**Publicat pe adresa principală de test:** `publica` pe `3b15484` (rularea 40340505948). Verificat în browserul aplicației, cu
mașina simulată: `G1 X10` → cardul „error:22 — No feed rate given”, „At the command “G1 X10”.”, ce faci, tabelul GRBL 1.1;
un program la 1×, Oprește în mișcare → „ALARM:3 — Reset during a move”, Deblochează → confirmarea în card, apoi Deblochează
oricum → `$X`, Idle; în română, același card („Repornit în timpul unei mișcări”) și titlul în jurnal. **Găsit la verificare:**
faza întreruptă spunea „interrupted (oprit)”: motivul era codul intern al fluxului, netradus → „ai apăsat Oprește” / „Stop
pressed” (și „portul s-a închis”, „controlerul a repornit”), cu proba în e2e; porțile din nou: 7 409 / 237, totalul 328,2.
**Publicat din nou pe test:** `publica` pe `7caf466` (rularea 40344444299), după rapid-ul verde (40343404729, cea mai lentă felie
6 min 14 s); verificat după „Versiune nouă → Reîncarcă”: Oprește în mișcare dă „întreruptă (ai apăsat Oprește): se pornește din
nou de la început” și cardul „ALARM:3 — Repornit în timpul unei mișcări”; deblocat cu confirmarea, Idle, 0 erori în jurnal.

## 2026-10-26 — Loc în bugetul JavaScript (Model: Claude Opus 5.5)

**Prompt:** „Fă loc în bugetul JavaScript: mută la cerere ce se poate (de exemplu panoul mașinii sau textele lui), fără să
ridici plafonul, și spune-mi cât s-a câștigat.”
**Started:** 26.10, ~17:35. Felia **3.K**, fără agenți (ADR 0086). Măsurătoarea întâi (hărțile de surse, bucată cu bucată):
totalul numără toate bucățile, fiindcă toate stau în precache, deci „la cerere” scade doar pornirea, nu totalul; panoul
mașinii era deja la cerere. Textele modulelor la cerere: ~24 kB gzip, cu ambele limbi în fiecare bucată.
**Completed:** 26.10 19:10. Textele celor șapte module sunt date (`mesaje/<modul>.json`, în precache). **Totalul JavaScript
328,2 → 304,3 / 330 kB (−23,9)**, pornirea 95,9 → 96,0 / 100 (cu ușa 99,3), precache-ul întreg 380,1 → 381,5 kB; plafonul
neschimbat. Porțile: 7 414 teste unitare (0 picate, 8 sărite), e2e 237 / 237 (o cădere `EBUSY` a Drive-ului în `test-results`,
trecută la rularea din nou), emulatoarele 13. **Găsit pe drum:** (1) primul încărcător stătea în pornire (+0,3 kB): fiecare modul
își exportă acum promisiunea mesajelor; (2) o cerere căzută era uitată imediat (proba a prins-o: textele căzute înaintea
codului ar fi dat ecranul de eroare); (3) un fișier pe limbă: 29,4 kB în 14 fișiere, unul pe modul: 25,6 în 7; (4) proba
booleanului (Shift + clic imediat după încărcare) a prins fereastra în care editarea nu e montată, lungită de textele ei: acum
vin în paralel cu bucata. **npm lipsește din instalarea Node** (`C:\Program Files\nodejs\node_modules\npm` golit la 17:11,
în afara proiectului): porțile au rulat direct cu `node` (Playwright și emulatoarele printr-o configurare locală în `.tmp/`,
cu serverul pornit fără `npm run preview`); CI-ul are npm-ul lui.
**Publicat pe adresa principală de test:** `publica` pe `5fc443e` (rularea 40368863005), după rapid-ul verde (40367523590, cea
mai lentă felie 8 min 17 s). Verificat după „Versiune nouă → Reîncarcă”: pagina cere cele 7 fișiere `mesaje/*.json`; editarea
(bara), panoul mașinii, paleta, arborele și fereastra exportului își arată textele, iar după EN fereastra deschisă trece pe
engleză („Export G-code (GRBL 1.1)”); 0 erori în jurnal; dreptunghiul de probă anulat.

## 2026-10-26 — Găurirea (Model: Claude Opus 5.5)

**Prompt:** „1” (la „Ce urmeaza?”: „Găurirea (recomandarea mea pentru acum)…”).
**Started:** 26.10, 19:56. Felia **5.4↑**, adusă din etapa 5, fără mașină și fără agenți (ADR 0087, documentul v13): găurile
din cercurile desenului, ciocănite în centru sau în elice pe perete, scrise doar cu G0–G3.
**Completed:** 26.10 20:55. Pe un rând numai cu cercuri, fereastra exportului are „găurire”: cercul cât freza (± 0,02 mm) se
ciocănește în centru (pașii pe trecere, 1 mm de retragere între ei, ieșirea la Z sigur la fiecare al N-lea pas, „Iese la
fiecare al … pas”, 1–100), unul până la două diametre se face în elice pe perete, cu o tură la fund; restul e refuzat, cu
motiv. Doar G0–G3. Documentul v13. Porțile: 7 427 de teste unitare (o cădere: proba pragului real al etapei 5, care număra 2
rânduri în lucru, acum 3 cu găurirea; actualizată, la fel în e2e-ul de emulator), build-ul determinist, pornirea 96,0 / 100
(cu ușa 99,3), totalul 305,3 / 330 (+1,0), `/admin` 190,2; e2e 237 / 239 (două descărcări anulate la 30 s sub încărcare, în
`export.spec` și `rezumat.spec`, trecute la rularea din nou, 22 / 22); emulatoarele 36 + 13. Mutațiile: 36 / 44 la prima
rulare, 43 / 43 cu probele noi; verificarea elipsei din lucrare era cod mort (ușa și conturul o refuză înainte), scoasă; pe
interfață, 9 / 9. **Găsit pe drum:** în manual, fraza despre o singură freză pe foaie era veche din 3.8b (ADR 0084), la zi
acum; în intrarea 3.K a DEVLOG-ului, calea npm stricată de un heredoc (fiecare `\n` din ea devenise rând nou), scrisă din nou. **Proba fizică**
(găurile ciocănite și în elice, cotele măsurate) e a plăcii etapei 5; decizia din 07.10 („pe simulare și pe octeții postului”)
privea doar găurirea multiplă (drillbanks), nu pe aceasta. **npm lipsește încă** din instalarea Node: porțile au rulat cu `node`.
**Trecerea 2 (21:12), găsită la verificarea pe test:** arborele proiectului descria orice operație ca „Profil {latura}”, deci
buzunarul (din 5.1↑) și găurirea apăreau „Profil interior”. Acum le numește („Buzunar pe 1 contur: …”, „Găurire pe 1 cerc: … în
pași de …”), cu proba în e2e-ul fiecăruia și 2 / 2 mutații (felul pierdut, felurile încurcate).
**Publicat pe adresa principală de test:** `publica` pe `720e888` (rularea 40383237286), după rapid-ul verde (40381952913, cea
mai lentă felie 7 min 34 s), apoi pe `b8b5113` (40385633377), după rapid-ul verde (40384618062, cea mai lentă 6 min 10 s).
Verificat după „Versiune nouă → Reîncarcă”: pe dreptunghi „găurire” lipsește, pe cerc apare; rândul arată „Iese la fiecare al …
pas” (1), cu urechile, rampa și intrările oprite; 0 oprește exportul, cu motivul; cu freza Ø6, cercul de Ø30 e refuzat („trece de
două diametre ale frezei (Ø6): în centru ar rămâne un miez”), fără descărcare; arborele: „Găurire pe 1 cerc: 8 mm în pași de 4
mm, T1 Ø6”; la redeschidere, găurirea și 2; 0 erori în consolă. Exportul refuzat a scris totuși operația în proiect
(comportamentul ferestrei: aplică operațiile, apoi calculează), iar istoricul se pierde la reîncărcare: în proiectul de probă al
browserului, cercul a rămas cu găurire. Programul descărcat (ciocănirea, elicea) e probat de e2e pe același build, nu în panoul
browserului (fără descărcări acolo).

## 2026-10-26 — Exportul 2D: DXF și SVG (Model: Claude Opus 5.5)

**Prompt:** „cel care se face mai repede” (la „Ce felie pornesc acum?”: V-carve sau exportul 2D).
**Started:** 26.10, 21:27. Felia **9.1↑**, adusă din etapa 9, fără mașină și fără agenți (ADR 0088). Exportul 2D e cel mai
rapid: V-carve-ul cere axa mediană și adâncimea pe freza în V (un algoritm CAM nou, cu oracolele lui), exportul scrie geometria
pe care documentul o are deja exactă. Din rând, felia ia DXF R2007 și SVG; PDF și EPS rămân pentru una următoare (biblioteca
PDF din s2 n-ar încăpea în plafonul total, iar npm lipsește, deci nici biblioteca DXF nu se poate adăuga: scriitorii sunt ai
noștri, cu ezdxf ca oracol independent, într-un venv în `.tmp`).
**Completed:** 26.10 22:16. „Exportă vectori” (extensia barei) scrie foaia în mm, la 1:1, ca DXF R2007 (implicit) sau SVG:
cercul CIRCLE, liniile și arcele o LWPOLYLINE cu bulge, curbele SPLINE (Bézier în lanț, exacte); straturile = rolurile, cu
culori; conturul foii la cerere. Scriitorii, în `src/io/`, la cerere: 3,9 kB gzip, totalul 305,3 → 309,9 / 330, pornirea 96,0
(cu ușa 99,3). **Oracolul independent nou**, în Python: `test/oracles-py/export2d.py` (ezdxf 1.4.4) pe corpusul din
`scripts/export2d-corpus.ts`, 0 erori și 0 reparații, totul cât pe hârtie; rulat în CI (felia 2). Porțile: 7 434 de teste
unitare (0 picate), build-ul determinist, e2e 240 / 241 (o descărcare anulată sub încărcare în `editare.spec`, oglindirea,
trecută rulată singură), emulatoarele 36 + 13. Mutațiile: 36 / 40 la prima rulare (două „prinderi” erau căderi ale mediului,
numărate ca supraviețuitoare), 40 / 40 cu probele noi; opt le prinde doar oracolul. **Găsit pe drum:** (1) scriptul corpusului
scria `test/corpus.*` când îl importa Playwright (șterse; acum scrie doar pornit direct); (2) extensia barei (991 px) era mai
lată decât bara (718 px) și lărgea coloana din mijloc a rândului de sus, iar titlul ajungea la 0 px la 1280 px (îl avea ~20 și
înainte): extensia se întinde acum pe toate coloanele, centrată, iar titlul are 124 px la orice lățime.
**Publicat pe adresa principală de test:** `publica` pe `8cd80ea` (rularea 40395209013), după rapid-ul verde (40393958354, cea
mai lentă felie 7 min 38 s; pasul nou „Oracolul exportului 2D (ezdxf)”, pe felia 2: 13 entități, toate cât pe hârtie, 0 erori,
0 reparații). Verificat după „Versiune nouă → Reîncarcă”: butonul din extensia barei deschide panoul (DXF (R2007) ales, SVG,
Cu conturul foii, Exportă, Închide), titlul și extensia la locul lor, 0 erori în consolă; fără descărcare în panoul browserului
(fișierele le verifică e2e-ul și oracolul). La verificare, nota panoului spunea „Un strat pe operație”, iar straturile sunt pe
rol: textul (și eticheta butonului) corectat la 22:28 și publicat din nou.

## 2026-10-27 — Exportul 2D: PDF și EPS (Model: Claude Opus 5.5)

**Prompt:** „continua”.
**Started:** 27.10, 07:10. Felia **9.2↑**, adusă din etapa 9, fără mașină și fără agenți (ADR 0089): restul rândului de export,
PDF-ul cu straturi și EPS-ul, după DXF și SVG. La început: `main` verde (rapid-ul pe `46bf3b3`); rularea de noapte din 27.10
încă nepornită de GitHub la 05:11 UTC (cron 01:23, întârziat ieri până la 06:23), deci sub pragul de 26 h; cea programată din
26.10 picase, cea pornită de mână la 06:57 trecuse.
**Completed:** 27.10 07:42. „Exportă vectori” scrie acum și **PDF** (1.5, un strat PDF pe rol, conținutul în mm, pagina cât foaia)
și **EPS** (EPSF-3.0, rolul în culoare); arcele și cercurile, din cubice sub 0,001 mm (cercul R50 din 7, ca în s2), iar panoul o
spune. Bucata la cerere 3,9 → 5,5 kB gzip, totalul 309,9 → 311,6 / 330, pornirea 96,0 (cu ușa 99,3). Oracolul: PyMuPDF pe PDF,
un cititor Python direct pe EPS și Ghostscript (în CI din Ubuntu; local, `@jspawn/ghostscript-wasm` despachetat în `.tmp`,
doar pentru test). Porțile: 7 441 de teste unitare (0 picate), build-ul determinist, e2e 241 / 241, emulatoarele 36 + 13.
Mutațiile: 28 / 30 la prima rulare, 30 / 30 cu probele noi. **Găsit pe drum:** (1) Ghostscript mută desenul cu ~0,002 mm, deci
exactitatea EPS-ului o probează cititorul direct; (2) oracolul căuta distanța la o cubică pe 200 de puncte (eroare ~0,4 mm)
și nu verifica acoperirea (o bucată lipsă trecea): ambele reparate înaintea mutațiilor; (3) comanda `firebase` lipsea din
PATH-ul sesiunii (CLI-ul e în `AppData\Roaming\npm`): emulatoarele au rulat cu el adăugat doar pentru comandă.
**CI, întâi pe ramura `export-pdf-eps`** (ca `main` să nu se înroșească dacă Ghostscript-ul din Ubuntu se poartă altfel decât
cel local): felia 2 oprită la 10 minute; unitarele ei au urcat la 6 min 48 s (fișierul de test nou a mutat teste grele în
ea), iar `apt-get install ghostscript` a așteptat 2 min 44 s pachete pe care indexul imaginii nu le mai găsea. Oracolul are
acum jobul lui (`oracol-export2d`, cu `apt-get update` întâi). Pe ramură, apoi verde: oracolul în 53 s, Ghostscript 10.02.1 din
Ubuntu cu aceeași abatere ca local (0,002474 mm), felia 2 în 5 min 30 s; ramura adusă în `main` (fast-forward) și ștearsă.
**Publicat pe adresa principală de test:** `publica` pe `d83ce38` (rularea 40459583903), după rapid-ul verde pe `main`
(40458720217). Verificat la 1440 px (panoul browserului, îngust, ascunde extensia barei): patru formate în panou (DXF (R2007),
SVG, PDF, EPS), nota despre curbe la PDF, foaia goală dă „Nimic de exportat”, fără descărcare, titlul întreg (123,5 px), 0 erori
în consolă; fișierele descărcate le verifică e2e-ul și oracolul.

## 2026-10-27 — V-carve-ul (Model: Claude Opus 5.5)

**Prompt:** „continua cu ce era in ordine”.
**Started:** 27.10, 08:33. Felia **8.1↑**, adusă din etapa 8, fără mașină și fără agenți (ADR 0090): următoarea din ordinea dată
de owner (găurirea, V-carve-ul, exportul 2D; exportul 2D a trecut înainte, fiind mai repede). Planul: freza cu forma ei în
document (v14), axa medială după T7 / s3 (candidatul (a): Delaunay pe eșantioane, legalizarea pe stivă, raza exactă), traseul
cu adâncimea maximă și trecerile, rândul din fereastra exportului, probele pe hârtie și pe oracolul simulării cu conul V.

**Completed:** 27.10 10:45. Freza are acum o formă în document (v14): plată sau în V, cu unghiul inclus (1–179°, implicit 60°),
aleasă pe rândul ferestrei de export; operația nouă **V-carve** sapă înăuntrul contururilor închise ale rândului, ca o singură
regiune par-impar, la z = −min(D, r·cot(θ/2)), pe axa medială (Delaunay pe eșantioane la 0,02 mm, delaunator 5.1.0, legalizată
pe stivă cu robust-predicates 3.0.3, raza recalculată exact); unde forma e mai lată decât freza la D, pereții pe inelul decalat,
iar fundul plat rămâne, cu avertisment (freza dreaptă e 8.2↑). Totalul 311,6 → 322,7 / 330 kB, pornirea 96,0 (cu ușa 99,4).
Oracolul simulării cu conul V, față de suprafața ideală pe hârtie, pe cinci forme: mai adânc ≤ 0,0011 mm, material lăsat
≤ 0,0054 mm. Porțile: 7 453 de teste unitare (0 picate, 8 sărite: logourile externe), build-ul determinist, e2e 243 / 243 pe
codul final (la prima rulare 241: `proiect.spec` cerea textul vechi al conflictului, iar `rezumat.spec` a picat pe `EBUSY` la
artefactul descărcării), emulatoarele 36 + 13. Mutațiile: 66 / 66, plus
3 / 3 pe verificarea formei din lucrare. **Găsit pe drum:** (1) titlul panoului de proprietăți spunea „profil” la orice
operație; (2) o cale deschisă pe un V-carve primea textul profilului; (3) la porți, lucrarea compara doar diametrele sub același
T: T1 Ø6 plată și T1 Ø6 V90° dintr-un document salvat ar fi trecut cu o singură freză montată (schimbarea se decide după număr);
acum refuzat, cu motivul; (4) textul conflictului din fereastră pierduse „mm”; (5) două teste vechi cereau schema 13.

## 2026-10-27 — Fundul plat al V-carve-ului (Model: Claude Opus 5.5)

**Prompt:** „continua”.
**Started:** 27.10, 11:03. Felia **8.2↑**, adusă din etapa 8, fără mașină și fără agenți (ADR 0091): fundul plat dintre pereții
V-carve-ului, cu freza dreaptă, după s3 §4 și §6. Planul: `fundPlat` pe operație (documentul v15), freza dreaptă întâi
(buzunarul existent, pe fiecare nivel, în zona {d ≥ L·tan(θ/2) + m}), apoi V-ul cu axa tăiată unde ajunge freza dreaptă și inele
dese în colțurile pe care ea nu le atinge; bifa în fereastra exportului; probele pe oracol, judecat pe sculă.

**Completed:** 27.10 12:26. Operația V-carve are acum, opțional, freza dreaptă a fundului plat (documentul v15, `fundPlat`),
aleasă cu o bifă sub rândul din fereastra exportului. Întâi freza dreaptă scoate fundul nivel cu nivel (buzunarul existent, în
zona {d ≥ L·tan(θ/2) + 0,002}), apoi freza V face pereții, axa doar unde freza dreaptă n-a ajuns și inele dese (creasta cel mult
0,05 mm) în colțurile pe care ea nu le atinge; programul începe cu prima freză montată. Oracolul simulării, judecat pe sculă:
dreptunghiul 40 × 20 la V90 cu Ø3, nimic mai adânc și nimic lăsat departe de colțuri, creasta 0,025 în colțuri; V60, fundul lat
de 16,536 mm; haltera cu canalul îngust, creasta 0,0503; fiecare trecere a fiecărei freze ≤ pasul. Totalul 322,7 → 324,5 / 330,
pornirea 96,0 (cu ușa 99,4). Porțile: 7 464 de teste unitare (0 picate, 8 sărite: logourile externe), build-ul determinist, e2e
244 / 244, emulatoarele 36 + 13. Mutațiile: 46 / 47 prinse; a 47-a e echivalentă (o mutare de 0,00005–0,00025 mm, sub rotunjire),
iar „prinderea” ei pe toată suita era testul traducerilor, încă necompletate. **Găsit pe drum:** (1) un offset pe un prag de
topologie (inelul colțurilor exact cât jumătatea lățimii) refuza toată lucrarea: acum se reia puțin mai departe de contur;
(2) pragul R − s_v tăia un inel V inutil pe fiecare perete (acum R − s_v/2, cu demonstrația în ADR); (3) panoul arăta Ø3.17
pentru o freză de 3,175; (4) motivul conflictului scria zecimalele cu punct în română; (5) indexul ADR avea 0090 înaintea lui
0089.

**Corectură (27.10, 13:33), la felia 8.1↑:** mutațiile V-carve-ului erau **58 / 66**, nu 66 / 66. Opt „prinderi” ale plasei a doua
(toate unitarele) erau testul traducerilor, roșu cât traducerea se completa în timpul rulării. Reluate cu traducerile complete,
supraviețuiesc: tăierea ramurilor cu toleranța ×25, Douglas–Peucker fără r, punctele absorbite trunchiate la unul, grupa îngustă
care refuză tot, muchiile eșantioanelor vecine păstrate, vecinii peste capătul buclei, colțurile convexe nelegate, liniile
eșantionate de 10 ori mai rar. Probele lor sunt de făcut; rândul 8.1↑ din fișă e corectat. (Felia 8.2↑ a tradus înaintea
verificării: 46 / 47, a 47-a echivalentă.)

**Probele supraviețuitoarelor 8.1↑ (27.10, 14:54)**, la cererea owner-ului („Da, scrie acum probele pentru cele 8 mutații din 8.1
care supraviețuiesc.”), fără agenți. Un banc de explorare (forme candidate pe oracol, cu și fără fiecare mutație) a ales formele;
probele noi, în `test/unit/vcarve.test.ts`: elipsa ca poligon cu 720 de laturi în oracol (prinde Douglas–Peucker fără r și
ramurile tăiate ×25), eșantioanele pe hârtie, colțurile convexe atinse, două grupe dintre care una fără fund plat, muchiile axei pe
două dreptunghiuri la 0,004 mm. **64 / 66**; două echivalente la toleranța contractului (punctele absorbite trunchiate, vecinii
peste capătul buclei), cu motivul în fișă. Găsit pe drum: un perete mai subțire decât h (0,01 față de 0,02) rămâne netăiat,
eșantioanele decalate punând centrele pe contur; adâncimea lui ideală e 0,005 mm, în contract (s3: „detaliile sub pasul h”).

## 2026-10-27 — Gravarea pe linie cu freza în V și gravarea inteligentă (Model: Claude Opus 5.5)

**Prompt:** „continua”.
**Started:** 27.10, 17:17. Felia **8.3↑**, adusă din etapa 8 (ultimul rând al ei, `PLAN.md`: „Gravare pe linie + smart engrave”),
fără mașină și fără agenți (ADR 0092). Planul: freza în V cu vârf plat (documentul v16: `forma.varf`), în simulare și în CAM;
gravarea pe linie cu freza în V (canalul t + 2·d·tan(θ/2), centrul pe vector) și sensul ei (ca desenul, invers, cel mai scurt
drum; `directie`); gravarea inteligentă = V-carve-ul cu fundul plat și o freză de gravare (con cu vârf plat), probată pe criteriul
din cercetare (pătratul 20 × 20, D = 2, Ø2 + vârful 0,25 la 15° pe flanc: colțurile ≤ 0,15 mm, pereții 15° ± 0,5°, Ø2 nu atinge
pereții). Găsit înainte de lucru: fereastra lasă freza în V pe orice rând, iar pe un profil exterior / interior, un buzunar sau
o găurire lucrarea o decala cu Ø/2, ca pe una plată (V90 Ø6, 1 mm, pe un pătrat de 20: traseul la 3 mm de contur, piesa cu
2 mm mai mare pe fiecare parte, fără niciun mesaj); de refuzat cu motiv.

**Completed:** 27.10 18:52. Freza în V are acum, opțional, un vârf plat (documentul v16, `forma.varf`: freza de gravare), în
simulare (conul trunchiat, exact pe segment) și în CAM: V-carve-ul coboară pe axă la −min(D, (r − a)·cot(θ/2)), doar unde r > a,
cu inelul peretelui la a + D·tan(θ/2) și inelele colțurilor la t + 2c·tan(θ/2). Pe linie, freza în V merge cu centrul pe vector
(canalul t + 2·d·tan(θ/2)), cu **Direcția** alături de sens (ca desenul, invers, cel mai scurt drum; `directie`). Gravarea
inteligentă = V-carve-ul cu fundul plat și freza de gravare. Freza în V pe o parte, într-un buzunar sau la găurire e refuzată,
cu motiv (defectul găsit la început; teșirea e a etapei 16). Probele, pe oracolul simulării (freza dată ca sculă de profil,
independent de formula nucleului): nucleul pe 6 piese (aceleași pică fără vârf); pe linie, V90 la 1 mm, canalul de 2,00 mm cu
centrul pe vector, pe o linie și pe un cerc; criteriul gravării inteligente din cercetare (pătratul 20 × 20, D = 2, Ø2 + vârful
0,25 la 15° pe flanc): peretele la 15,0000°, colțurile la suprafață cu raza 0,128 mm (martorul cu Ø2: 0,999), freza dreaptă la
0,00765 mm deasupra pereților, în colț 0,0008 mm față de anvelopa frezei calculată pe hârtie. Totalul 324,5 → 325,9 / 330, pornirea
96,0 (cu ușa 99,4). Porțile: 7 493 de teste unitare (0 picate, 8 sărite: logourile externe), build-ul determinist, e2e 245 / 245,
emulatoarele 36 + 13. Mutațiile: 34 / 36 din prima, traducerile completate înainte de rulare (controlul verde); cele două scăpate
(vârful nejudecat de V-carve chemat fără lucrare; „cel mai scurt drum” care întorcea și o buclă închisă după altă tăietură) au
probe noi, verificate cu mutația aplicată: **36 / 36**. Rândul din prag: „în lucru” (rămân lista de freze de golire, cu buzunarul
cu mai multe freze, și placa etapei 8). **Găsit pe drum:** trei teste vechi foloseau chiar `varf` ca exemplu de câmp necunoscut al
formei (o coincidență din 8.1, mutate pe `cod`); în engleză, „Direction” era deja numele sensului de tăiere, deci câmpul nou e „Line
direction”; o tăiere a axei la r > a din V-carve era redundantă (prima trecere taie deja doar sub 0), scoasă.

**Publicat pe test (27.10, 19:15)**, din workflow (run 40546474097, `5c6d143`), cu CI-ul rapid verde (6 felii + oracolul exportului
2D). Verificat în browser la 1440 px, după „Reîncarcă”: pe un dreptunghi, freza în V pe exterior oprește exportul cu motivul nou;
pe linie apar Vârful (0 implicit) și Direcția (ca desenul / invers / cel mai scurt drum); vârful cât diametrul oprește exportul;
cu V30, vârful 0,25 și Ø3,175, exportul e permis; fără erori în consolă. De notat, nu din felia asta: tabelul ferestrei derulează
pe orizontală și fără ea (1 156 px într-o cutie de 894 la 1440); câmpurile noi adaugă cel mult 200 px, doar pe un rând V pe linie.

## 2026-10-27 — Buzunarul cu mai multe freze (Model: Claude Opus 5.5)

**Prompt:** „Continua cu ce vrei”.
**Started:** 27.10, 19:12. Felia **5.5↑**, adusă din etapa 5 (rândul din prag „Buzunar (curățare de suprafață), cu mai multe
freze”), fără mașină și fără agenți (ADR 0093). Planul: frezele de rest (documentul v17: `rest`, o listă de freze plate cu pasul
lor, de la mare la mică), pe buzunar și pe fundul plat al V-carve-ului (lista de freze de golire a gravării inteligente, rămasă
din 8.3↑). Nucleul: inelele frezei mici, păstrate doar unde discul ei poate atinge material lăsat de freza dinainte (deschiderea
regiunii cu raza ei), pe aceleași treceri. Probele pe oracolul simulării, cu criteriul din cercetare (buzunarul 80 × 40 × 10 cu
Ø12, apoi Ø3, pasul 40 %: fundul la −10,00 ± 0,02 fără insule peste 0,05, colțurile cu raza 1,5, Ø3 doar în colțuri și fâșii
înguste, inelele Ø12 la 4,8 mm).

**Completed:** 27.10 20:36. Buzunarul are frezele de rest (documentul v17, `rest`): după freza rândului, fiecare mai mică doar unde
cea dinainte n-a ajuns (colțurile, fâșiile înguste), pe aceleași treceri, cu schimbarea de sculă; aceeași mașinărie dă fundului
plat al V-carve-ului mai multe freze drepte (lista de freze de golire a gravării inteligente). Nucleul în `src/cam/rest.ts`: inelele
frezei mici, păstrate unde stau la peste R_a − R de zona centrului celei dinainte. În fereastra exportului, Frezele de rest (T, Ø,
pasul, ×) și Adaugă o freză de rest. Criteriul din cercetare (80 × 40 × 10, Ø12 apoi Ø3), pe oracolul simulării judecat pe sculă:
fundul la −10 ± 0,02 în afara colțurilor, colțurile cu raza 1,485 (doar Ø12: 5,992), Ø3 doar în afara deschiderii cu Ø12 (2 912
celule), traseul ei nu trece pe lângă pereți; inelele Ø12 la 6, 10,8, 15,6. Totalul 325,9 → 328,0 / 330 kB (rămân 2 kB), pornirea
96,0 (cu ușa 99,5). Porțile: 7 509 unitare (0 picate, 8 sărite), build-ul determinist, e2e 246 / 246, emulatoarele 36 + 13.
Mutațiile: 26 / 29 din prima (traducerile complete, controlul verde); cele trei scăpate au probe noi, verificate cu mutația
aplicată: **29 / 29**. **Găsit pe drum:** pragul cu marjă (R_a − R − h) păstra tot inelul de lângă perete al frezei mici (exact la
prag), deci ea făcea tot conturul prin aer: acum R_a − R + 10⁻⁴, cu eșantionarea la 0,02; bucățile inversate pentru drumul cel mai
scurt ar fi schimbat sensul de tăiere: acum se păstrează; o freză de rest a fundului fără nimic de scos se monta degeaba: acum
avertisment, ca la buzunar. Rândul gravării inteligente din prag: „făcut” (rămâne placa etapei 8); al buzunarului: „în lucru”
(strategia paralelă și adaosul de finisare).

**Publicat pe test (27.10, 21:05)**, din workflow (run 40562936401, `0e7d7d6`), cu CI-ul rapid verde (6 felii + oracolul exportului
2D). Verificat în browser la 1440 px, după „Reîncarcă”: pe dreptunghiul 100 × 60, rândul pus pe buzunar cu Ø12; „Adaugă o freză de
rest” pune T2, Ø6, pasul 2,4; una cât freza rândului oprește exportul cu motivul; cu Ø3 și pasul încă 2,4 (peste raza ei), tot
oprit; cu pasul 1,2, permis; lățimea tabelului neschimbată (1 156 px); fără erori în consolă.

## 2026-10-27 — Strategia paralelă a buzunarului (Model: Claude Opus 5.5)

**Prompt:** „Da, continuă cu strategia paralelă (raster) a buzunarului, cu trecerea de profil; dacă pachetul nu mai încape, spune-mi
întâi.”
**Started:** 27.10, 21:16 (intrarea scrisă la încheiere: am uitat-o la pornire). Felia **5.6↑**, adusă din etapa 5, fără mașină și fără
agenți (ADR 0094). Planul: liniile paralele la un unghi, în zona centrului frezei, legate în zigzag prin buzunar, apoi trecerea de
profil pe margine; documentul v18 (`strategie`); pachetul măsurat întâi (328,0 / 330 kB).

**Completed:** 27.10 21:57. Sub rândul unui buzunar, Traseul: inele sau linii paralele, la Unghiul dat față de X (`src/cam/paralel.ts`);
pe fiecare trecere, liniile în zigzag (legate doar cu linia vecină și doar prin buzunar), apoi trecerea de profil, ca peretele să
iasă pe vector; liniile coboară prin plonjare. Aceeași acoperire ca la inele, deci insulele și frezele de rest merg neschimbate. Pe
criteriul din cercetare (80 × 40 × 10 cu Ø12, pasul 4,8), pe oracolul simulării: fundul la −10 ± 0,02 în afara colțurilor R6, la 0°
și la 30°; peretele la x = 20 ± 0,02; liniile la 4,8 mm (pe hârtie). **Pachetul a încăput:** nucleul și lucrarea au adăugat 0,8 kB,
fereastra 0,4: totalul 328,0 → 329,2 / 330 (rămân 0,8 kB), pornirea 96,0 (cu ușa 99,5); marginea zonei e aplatizată (coardele, cu
săgeata cel mult 0,0005 mm, spre interior) în loc de intersecțiile exacte cu arcele. Porțile: 7 521 unitare (0 picate, 8 sărite),
build-ul determinist, e2e 247 / 247, emulatoarele 36 + 13. Mutațiile: 22 / 22 din prima. Rândul buzunarului din prag: „făcut”
(rămâne placa etapei 5). **Găsit pe drum:** cheia `export.strategie` exista (schimbarea frezei), deci câmpul nou e „Traseul”
(`export.paralel.*`); testele care fixau starea reală a etapei 5 (pragul, umplerea barei în cronologie, 0,375 → 0,5) urmează schimbarea;
o primă rulare a build-ului determinist a dat `sw.js` diferit între două build-uri, iar următoarele trei au fost identice (de urmărit
dacă reapare); scriptul de trecere a testelor la o versiune nouă de document (de acum generic) punea o paranteză în plus pe două linii.

**Publicat pe test (27.10, 22:20)**, din workflow (run 40575021475, `9f1bdf3`), cu CI-ul rapid verde (6 felii + oracolul exportului
2D). Verificat în browser la 1440 px, după „Reîncarcă” (oferta a apărut abia după închiderea ferestrei exportului): pe rândul pus pe
buzunar, Traseul are „inele (paralele cu conturul)” și „linii paralele”; cu liniile, coborârea dispare și Unghiul pornește de la 0;
180° oprește exportul cu motivul, 30° îl permite; lățimea tabelului neschimbată (1 156 px); fără erori în consolă.

## 2026-10-28 — Loc în pachet: dicționarele de bază ca date (Model: Claude Opus 5.5)

**Prompt:** „continua”
**Started:** 28.10, 07:15. Felia **3.L**, fără mașină și fără agenți. Totalul JavaScript e 329,2 / 330 kB, deci o felie nouă cu cod nu
mai încape; aleg să fac loc, nu să ridic plafonul (plafonul e decizia owner-ului). Măsurat pe hărțile de surse: react-dom ~62,5 kB,
`src/geom` ~51, `src/app` ~50; textele rămase în JavaScript sunt mai ales dicționarele de bază (~4,4 kB, ambele limbi). Planul: ele
devin date (`mesaje/ro.json`, `mesaje/en.json`, în precache), ca mesajele modulelor (ADR 0086), cu aceeași pornire, același ecran
„fără texte” și același raport; `/mesaje/**` primește `no-cache` (pe test e `max-age=3600`: la o adresă fixă, un dicționar vechi ar
putea veni o oră după o publicare).

**Completed:** 28.10 07:51. Dicționarele de bază sunt date: `mesaje/ro.json` și `mesaje/en.json`, câte unul pe limbă, în
precache, generate din aceleași surse TypeScript; `incarcaLimba` le aduce cu `fetch` (un HTTP căzut sau altă formă respinge, cu calea
în motiv), iar pornirea din `main.tsx` e neschimbată (rezerva la 4 s, ecranul „fără texte”, raportul). `/mesaje/**` e fără cache pe
Hosting. **Totalul 329,2 → 325,0 / 330 kB (−4,2)**; pornirea 96,0 → 96,2 (cu ușa 99,5 → 99,7), fiindcă aducerea și verificarea
formei stau în pornire, care numără mai departe dicționarul. Porțile: 7 523 unitare (0 picate, 8 sărite), build-ul determinist, e2e
247 / 247, emulatoarele 36 + 13. Mutațiile: 11 / 11 din prima (9 pe probele unitare, 2 în fereastră, pe e2e). **Găsit pe drum:**
`shared/mesaje.ts` ajungea întreg în pornire (+0,32 kB), deci adresa și forma dicționarului stau acum în `shared/dictionar.ts` (+0,24);
un minificator mai bun (terser peste Oxc) ar fi scos doar ~1,3 kB. Pârghiile mai mari rămân decizii ale owner-ului: workerul PWA
fără Workbox (~4 kB din cei 7,2 ai lui `sw.js`) și Preact în locul lui React (react-dom ~62,5 kB). Poarta build-ului nu are mutații
proprii (o probă a ei cere un build stricat): a trecut pe build-ul real.

**Publicat pe test (28.10, 08:44)**, din workflow (run 40644177102, `080bd48`), cu CI-ul rapid verde (6 felii + oracolul
exportului 2D). Pe test, `/mesaje/ro.json` și `/mesaje/en.json` răspund 200 cu `Cache-Control: no-cache` (și mesajele modulelor,
de exemplu `carcasa.json`, înainte `max-age=3600`). Verificat în browser la 1440 px: la prima vizită (fără worker), pornirea a cerut
`/mesaje/en.json` (limba browserului), apoi `ro.json` în fundal, nicio bucată `mesaje.*.js`; RO din bară schimbă interfața; după
reîncărcare, sub workerul nou, pornirea cere întâi `ro.json` (limba aleasă), iar ambele dicționare sunt în precache; jurnalul cu 0
erori, consola fără erori.

## 2026-10-28 — Plafonul total 400 kB și progresul actualizării (Model: Claude Opus 5.5)

**Prompt:** „Și progresul” (la întrebarea „Ridic plafonul total la 400 kB, cu ADR?”, după „sunt ok cu marirea plafonului, ma
gandesc ca putem prioritiza si ordinea in care se descarca lucruri si putem avea unele care se fac in fundal. eventual sa avem si o
zona sau un popup care arata progresul actualizarii in curs.”)
**Started:** 28.10, 10:59. Felia **3.M**, fără mașină și fără agenți. Două decizii, câte un ADR: plafonul total 330 → 400 kB
(owner-ul e de acord cu mărirea; pornirea rămâne la 100 kB, ușa la 8) și progresul descărcării în bara de jos, în locul cipului
„Versiune nouă gata” cât workerul nou se instalează (și la prima vizită: „Pregătesc lucrul offline”). Workbox aduce precache-ul
câte un fișier, în ordine: un plugin numără octeții gata din mărimile scrise în manifest la build și trimite procentul filelor
deschise; pagina îl arată doar cât workerul e în `installing`. Pornirea are 0,3 kB liberi: codul nou stă în bucata înregistrării,
în pornire doar cipul.

**Completed:** 28.10 11:50. Plafonul total e 400 kB (ADR 0096, decizia owner-ului; pornirea rămâne la 100 kB, ușa la 8). Cât
workerul nou se instalează, bara de jos arată „Se descarcă versiunea nouă: N %” cu o bară, apoi oferta „Versiune nouă gata”, ca
până acum; la prima vizită, „Pregătesc lucrul offline: N %” (ADR 0097). Procentul = octeții gata din total, după mărimile scrise
în manifest la build (`marime`, cerute de poarta build-ului), adunate de un plugin pe strategia precache-ului Workbox
(`src/pwa/progres.ts`), trimise tuturor filelor. **Găsit pe drum:** în e2e, actualizarea nu arăta nimic: navigarea însăși găsește
workerul nou, iar `register()` stă în coada de joburi până la sfârșitul instalării ei, deci fila asculta prea târziu. Acum
ascultă înaintea lui `register()`, ia înregistrarea cu `getRegistration()` și întreabă workerul de progresul de până atunci. Tot
în e2e: o actualizare aduce din `/assets/` doar bucățile redenumite. **Totalul 325,0 → 326,1 / 400 kB** (`sw.js` 7,2 → 7,9);
pornirea 96,2 → 96,3 (cu ușa 99,8 / 100). Porțile: 7 537 unitare (0 picate, 8 sărite), build-ul determinist, e2e 250 / 250,
emulatoarele 36 + 13. Mutațiile: 23 / 23 (17 pe probele unitare, 4 în fereastră, pe e2e, 2 pe poarta build-ului); 7 au cerut a
doua rulare, fiindcă tiparele lor se terminau în LF, iar fișierele au CRLF, deci nu se aplicaseră (VOID, nu supraviețuitoare).

**Publicat pe test (28.10, 12:14)**, din workflow (run 40670152062, `b74dbab`), cu CI-ul rapid verde (run 40669226779, 6 felii +
oracolul exportului 2D). Verificat în browser la 1440 px: fila rămasă pe versiunea 3.L (fără codul progresului) a primit oferta
„Versiune nouă gata”, iar după „Reîncarcă” rulează versiunea nouă; `sw.js` de pe test are mărimile în manifest (71 de intrări) și
pluginul progresului; jurnalul cu 0 erori. Progresul unei actualizări se vede abia de la publicarea următoare (fila trebuie să aibă
deja codul lui): commit-ul ăsta, publicat și el pe test, e acea actualizare.

**Progresul, văzut pe test (28.10, 13:40):** `8b536e1` publicat (run 40681022393; doar `.md`, deci fără nivel rapid propriu: publicarea
acceptă strămoșul verde `b74dbab`). În fila rămasă pe `b74dbab`, cu un înregistrator al cipurilor, verificarea versiunii (`update()`,
ca la verificarea orară) a dat „Se descarcă versiunea nouă” de la 0 la 100 % în ~9 s (35 de mesaje), apoi „Versiune nouă gata”;
după „Reîncarcă”, precache-ul are 71 de intrări (cele vechi șterse), jurnalul 0 erori, consola curată. **Găsit:** o publicare fără
cod re-aduce 38 din 71 de fișiere, 941 din 1 314 kB necomprimați (~72 %): bucata de pornire conține versiunea și numele bucăților
la cerere, iar aproape toate bucățile o importă, deci toate se redenumesc. Scris în ADR 0096 (Limite) și în rândul 3.M. Tot acum,
din lista owner-ului: scos „Testul uneltelor de desen, pas cu pas, în aplicație” (făcut pe 25.10, remedierile în 6.P↑).

## 2026-10-28 — Harta importurilor: o publicare aduce doar ce s-a schimbat (Model: Claude Opus 5.5)

**Prompt:** „Da, repar-o” (la întrebarea „Repar cascada, ca o actualizare să aducă doar ce s-a schimbat?”)
**Started:** 28.10, 13:55. Felia **3.N**, fără mașină și fără agenți. Măsurat pe test (3.M): o publicare fără cod re-aducea 38 din
71 de fișiere (~72 % din octeți), fiindcă fiecare bucată poartă numele celor pe care le importă, bucata de pornire le poartă pe
toate (și versiunea), iar aproape toate o importă. Planul: `build.chunkImportMap` (Vite 8.3.3 / Rolldown, experimental): bucățile se
importă după nume stabile, traduse de o hartă din `index.html`; harta e un script inline, deci amprenta ei exactă intră în CSP (meta
și antetul de pe Hosting), fără `unsafe-inline`; versiunea iese din JavaScript în antetul paginii. Proba, scrisă întâi: un al
treilea build, cu altă versiune, poate schimba doar `index.html` și `sw.js` (azi: 78 de fișiere).

**Completed:** 28.10 15:05. Bucățile se importă după nume stabile (`build.chunkImportMap`), traduse de harta din `index.html`;
amprenta exactă a hărții intră în CSP (meta-ul paginii, scris în `generateBundle`, și antetul scris de publicare), tot fără
`unsafe-inline`: orice alt script inline e refuzat (probat în Edge). Versiunea stă în `<meta name="cncvs2-versiune">`, citită de
aplicație și de verificarea publicării. **Proba din poartă:** un al treilea build, cu altă versiune, schimbă doar `index.html` și
`sw.js` (înainte: 78 de fișiere). **Găsit pe drum:** Vite pune harta după transformările `post` ale paginii, deci amprenta se
scrie pe pagina finală; cu CSP-ul mai lung, codarea paginii ajunsese la octetul 996 din 1 024 (meta-urile stau acum după `<meta
charset>`, la octetul 46; poarta o verifică); poarta citea importurile după numele reale, deci traduce acum numele stabile prin
hartă. Pornirea și totalul neschimbate: 96,3 (cu ușa 99,8) / 100 și 326,1 / 400 kB. Porțile: 7 544 unitare (0 picate, 8 sărite),
build-ul determinist (cu proba cascadei), e2e 251 / 251, emulatoarele 36 + 13. Mutațiile: 16 / 16 din prima (9 pe probele unitare,
5 pe poarta build-ului, 2 în fereastră, pe e2e).

**Publicat pe test (28.10, 15:35)**, din workflow (run 40694614506, `7eac37d`), cu CI-ul rapid verde (run 40693448278). Pe test:
antetul CSP are amprenta hărții, egală cu amprenta recalculată (Python) din harta servită, la fel meta-ul, fără `unsafe-inline`;
`<meta charset>` la octetul 46, versiunea `7eac37de22e6` în antet. Verificat în browser la 1440 px: fila rămasă pe versiunea
dinainte a primit oferta, iar după „Reîncarcă” versiunea nouă pornește controlată de worker, cu harta (59 de intrări), bara
editării și manualul (adus prin hartă), 0 încălcări CSP, jurnalul cu 0 erori, consola curată. Prima actualizare spre versiunea asta
re-aduce aproape tot o singură dată (numele stabile sunt noi); măsurătoarea care contează e publicarea commit-ului ăstuia, fără cod.

**Măsurat pe test (28.10, 15:25):** `3c6ff0a` (doar DEVLOG) publicat (run 40695336518). În fila de pe `7eac37d`, verificarea versiunii a
adus o singură intrare nouă în precache, `index.html`: 5 335 din 1 318 400 de octeți (0,40 %), în 0,8 s (la 3.M: 38 de fișiere, ~72 %,
~9 s). După „Reîncarcă”: versiunea `3c6ff0a96f7c`, precache-ul cu 71 de intrări, bara editării cu toate controalele, jurnalul cu 0
erori, consola curată. (Bara editării apare abia când pagina se desenează: cu panoul browserului ascuns, modulul așteaptă; nu ține
de hartă.) Scris în ADR 0098.

## 2026-10-28 — Animația traseului (Model: Claude Opus 5.5)

**Prompt:** „continua”
**Started:** 28.10, 15:26. Felia **5.7↑**, fără mașină și fără agenți. Etapa 3 nu mai are felii fără mașină (3.5b, 3.7b cer plăcile,
3.9 live-ul); după `PLAN.md`, rândul de prag din cea mai devreme etapă care mai are ceva fără mașină e „Animația traseului: freza
care se mișcă pe traseu, pas cu pas, cu viteză reglabilă și glisor” (etapa 5, v1). Planul: timpul fiecărei mișcări din estimarea
planificatorului (postul spune linia fiecărei mișcări), modelul pur (cronologia, poziția, pașii, drumul parcurs), un player,
panoul lângă timpul jobului și freza pe pânză, totul la cerere (pornirea are 0,2 kB liberi).

**Completed:** 28.10 16:25. „Animează”, lângă timpul jobului, deschide animația traseului: freza merge pe traseu în timpul mașinii
(estimarea planificatorului, împărțită la liniile la care începe fiecare mișcare în post: suma e exact timpul jobului din cip), cu
rulează / pauză, pasul anterior și următor, viteza (1× … 500×, implicit cam un minut pentru toată animația), glisorul și citirile
(timpul, pasul, mișcarea cu avansul și lucrarea, X Y Z, freza); pe pânză, freza (cât diametrul ei, plină în material) și drumul
parcurs. **Găsit pe drum:** „Pasul următor” arăta începutul pasului de după (capătul unui pas e acum al lui); cu un final fără timp
(programul se termină la Z sigur), la capăt se arăta ultima mișcare în locul finalului; ramura cu timpi simpli, fără estimare, era
de neatins din interfață (scoasă); plasa nucleului simulării (trigonometria lui `Math`, importurile de valori din IR) prindea și
modelul animației, care doar afișează: scos din ea, ca estimarea timpului. Pornirea 96,3 → 96,4 (cu ușa 99,8 → 99,9 / 100: un
nume nou în lista de preîncărcare, nimic din animație); totalul 326,1 → 330,3 / 400 kB. Porțile: 7 570 unitare (0 picate, 8
sărite), build-ul determinist, e2e 256 / 256, emulatoarele 36 + 13. Mutațiile: 28 / 28 (24 pe probele unitare, 4 în fereastră, pe
e2e); una a cerut întâi o probă e2e mai strictă (pixelii frezei treceau singuri de prag).

**Publicat pe test (28.10, 16:49)**, din workflow (run 40709255415, `a56ee45`), cu CI-ul rapid verde (run 40708011351, 6 felii +
oracolul exportului 2D). Verificat în browser la 1440 px: fila de pe `3c6ff0a` a primit oferta, iar după „Reîncarcă” rulează
`a56ee45e12fb`, controlată de worker. Pe o foaie goală: un dreptunghi din paletă, `T`, apoi cipul „Timpul jobului: 52,6 s” cu
„Animează”; panoul (viteza implicită 1×, fiindcă jobul ține sub un minut) arată, după nouă pași, „38,5 s din 52,6 s · Pasul 9 din
12”, „Arc, F 1000 · e1/e1: dreptunghi, exterior, 3 mm” și „X 120,000 Y 17,000 Z -3,000 · Freza T1, Ø6,000 mm”, iar pe pânză drumul
parcurs e colorat și freza stă în colțul dreptunghiului; Escape închide panoul și stratul frezei; jurnalul cu 0 erori, consola
curată. Pragul: rândul animației poartă commit-ul `a56ee45`.

## 2026-10-28 — Importul DXF și plafonul pornirii 110 kB (Model: Claude Opus 5.5)

**Prompt:** „Ridică plafonul” (la întrebarea „Next slice: raise the startup cap, or make room in it first?”, butonul „Ridică
plafonul pornirii, cu ADR, și continuă cu felia următoare.”)
**Started:** 28.10, 17:00. Două lucruri, fără mașină și fără agenți. **Plafonul pornirii 100 → 110 kB** (ADR 0100), cu pornirea
măsurată în Edge înainte. Apoi felia **9.3↑, importul DXF, adus din etapa 9** (ADR 0101): rândul de prag „Import 2D” are SVG-ul
gata, iar DXF-ul e primul format din lista lui. Planul: corpusul cu valorile pe hârtie, scris cu ezdxf
(`test/oracles-py/dxf_import_corpus.py`: R2018 în mm, R2000 în inch, R12 fără unități); cititorul propriu (`src/io/dxf.ts`,
fără pachetul `dxf`, care aduce lodash): unitățile, OCS-ul, blocurile imbricate, bulge-ul, NURBS-ul în Bézier, elipsele, legarea
capetelor; ușa DXF în dialogul importului, cu aceleași căi ca SVG-ul.

**Completed:** 28.10 19:10. **Plafonul pornirii 110 kB** (ADR 0100), cu pornirea măsurată în Edge pe build-ul 5.7↑. A doua
pornire, din worker, fără rețea: 42 ms cu procesorul ×1, 102 ms cu ×4. Prima vizită, pe 750 kbit/s cu 150 ms latență: 1,8 s, cu
99,4 kB transferați și 62 ms după ultimul octet. 10 kB în plus ≈ 0,11 s la prima vizită. **Importul DXF** (ADR 0101): „Importă SVG
/ DXF…” citește DXF-ul ASCII (R12 … R2018) cu un cititor propriu: unitățile din $INSUNITS (lipsă: mm, cu alegerea omului în
dialog), liniile, arcele, cercurile, elipsele, poliliniile cu arce, spline-urile (Bézier exact prin forma polară, și cele
periodice), blocurile (INSERT, MINSERT, stratul 0 moștenit), OCS-ul oglindit; bucățile deschise de pe același strat se leagă capăt
la capăt (4 linii fac un dreptunghi închis; în T nu); ce e ascuns sau nu e desen se sare, numărat. Desenul stă unde e în fișier, cu
stratul ca nume pe fiecare formă. Verificările căii (praful, linia fără arie, plafonul) sunt acum comune cu ușa SVG
(`src/io/caleImport.ts`, mutate neschimbate). **Găsit pe drum:** o formulă greșită în valorile pe hârtie ale blocului imbricat
(corectată; generatorul verifică acum fiecare valoare față de entitățile exacte ale lui ezdxf, nu față de desenul lui, unde arcele
sunt cubice aproximate); R12-ul sondei își scrie numerele cu 9 zecimale (proba ia precizia fișierului); elipsa lui din 112 arce
are două perechi vecine pe același cerc (unite: 110, verificat cu ezdxf); `formatImport` și listele DXF ajunseseră în bucata de
pornire prin modulul acțiunilor (+0,6 kB), mutate în module la cerere (+0,1). Pornirea 96,4 → 96,5 (cu ușa 99,9 / 100 → 100,0 /
110); totalul 330,3 → 338,3 / 400 kB. Porțile: 7 648 unitare (0 picate, 8 sărite), build-ul determinist, e2e 258 / 258, emulatoarele 36 + 13. Mutațiile: 55 / 55 (51 pe probele unitare, 4 în fereastră, pe e2e); 6 au
trecut întâi și au cerut probe noi (un nod în plus la spline, arcul NURBS de 120° și sensul lui, dus-întorsul pe același cerc, R2007
cu UTF-8, perechile fără secțiune).

**Publicat pe test (28.10, 19:24)**, din workflow (run 40734978544, `179051e`), cu CI-ul rapid verde (run 40733428433, 6 felii +
oracolul exportului 2D). Verificat în browser la 1440 px: fila de pe `a56ee45` a primit oferta; după „Reîncarcă” a trecut întâi pe
`b1083b3` (workerul care aștepta de la publicarea de după 5.7), apoi, la a doua ofertă, pe `179051e7184f`, controlată de worker.
Fereastra de fișiere acceptă `.dxf`, butonul e „Importă SVG / DXF…”. Un DXF dat ferestrei (dreptunghiul 60 × 40 din 4 linii, în
(100, 50), cu o gaură R5 și o linie de gravat, pe straturi): „Importă: Raft lateral.dxf”, „Desenul: 60.00 × 40.00 mm”, „2 contururi
închise: 1 tăiate pe exterior, 1 pe interior (din imbricare)”, calea deschisă, „Unitățile fișierului: un milimetru (mm).” și „4
bucăți deschise legate capăt la capăt”; după „Importă”, piesa „Raft lateral” (3 forme: profil exterior, interior și pe linie) stă la
X 100, Y 50, cu cutia 60 × 40 mm; jurnalul cu 0 erori, consola curată. Pragul: rândul „Import 2D” poartă commit-ul `179051e`.

**Prompt (28.10, 19:20):** „In fisierele de test am vazut ca z se duce la -4 apoi iar la 5. Vreau ca asta sa fie optional. Userul
poate ar vrea sa nu se mai ridice freza si sa coboare direct la -8mm. Noteaza pentru viitor.” (cu pozele programului A al plăcii 1).
Notat în CLAUDE.md („Decizii luate”) și în rândul de prag „Profil”: coborârea directă între treceri, fără ridicare, ca a treia
alegere lângă ridicarea de acum și rampa (ADR 0029); cel mai devreme odată cu rampa pornită implicit, după placa 1.

## 2026-10-28 — Importul PDF și AI, cu spațiul fișierelor (Model: Claude Opus 5.5)

**Prompt:** „4. Si vreau ca toate butoanele care tin de import si export sa fie comasate intr-un spatiu dedicat si unificat. Ele isi
au locul impreuna. Si o sa vreau sa setam rolurile de taiere inainte sa intru la export g code si sa sefaca update si la toolpath.”
(la „Pe care o iau: calculul în workere, sau alta din listă?”, „4.” = importul PDF și AI)
**Started:** 28.10, 19:45. Felia **9.4↑**, fără mașină și fără agenți: importul PDF și AI (compatibil PDF), adus din etapa 9 (rândul
de prag „Import 2D”), cu un cititor propriu (pdf.js, din sonda s2, are ~300 kB), și butoanele de import și export strânse într-un
spațiu al lor. Rolurile de tăiere alese înaintea exportului, cu traseul la zi, sunt notate în CLAUDE.md pentru după: cer întâi
calculul CAM în workere (ADR 0038).

## 2026-10-28 — Scalarea unei piese importate cu arce plate (Model: Claude Opus 5.5)

**Prompt:** „Am importat un dxf cu succes, dar nu il pot scala”, apoi „Ce-i drept, era un fisier complex” (cu pozele: dialogul
importului pentru 6o33pjon.dxf, 25,04 × 39,25 mm, 247 de contururi, fără unități, 6 arce plate; piesa cu mânerele Transformării).
**Started:** 28.10, 20:00. Felia **9.3↑b**, între felii (9.4↑ așteaptă): de ce o piesă importată nu se mărește.
**Completed:** 28.10, 20:55. Cauza: un arc aproape drept are raza mare, (c / 4) · (β + 1/β); mărit, trece de latura
documentului (10 000 mm), pe care schema o cere pe fiecare arc. Scalarea pură trecea, dar acțiunea refuza documentul la schemă,
iar mânerele nu spuneau nimic. Reparat (ADR 0102): la scalarea uniformă a unei căi, arcul care ar trece de 9 990 mm devine
cubicele aceluiași cerc, sub 0,000001 mm (`arcInCubice` cu `TOLERANTA_IMPORT`, ca arcul plat la import); mânerele citesc
rezultatul acțiunii și arată refuzul ușii (`motiv.transformare-inexacta`); eticheta rămâne în banda vizibilă (`susEticheta`:
deasupra rotirii, sub cutie, sau chiar sub bare la o piesă mai mare decât ecranul). Probele: arcul plat și unul larg (exact 3
cubice, pe hârtie), banda etichetei, un DXF mărit din colț până sub bare (e2e) și un dreptunghi de 8 m mărit peste 10 m (e2e:
motivul ușii). Mutațiile: 7 / 7; 2 au trecut întâi (toleranța proiectului, pe un arc care încăpea oricum într-o cubică;
eticheta, pe o piesă care nu urca până la bare), prinse de probele noi.

**Publicat pe test (28.10, 21:04)**, din workflow (run 40750584928, `4c91f98`), cu CI-ul rapid verde (run 40749163335, 6 felii +
oracolul exportului 2D). Verificat în browser la 1440 px: după „Reîncarcă”, pagina e pe `4c91f98b1f3f`, controlată de worker. Un
DXF dat ferestrei (pătratul de 40 mm cu latura de jos un arc de bulge 1/400, R ≈ 4 000 mm, și un cerc R5): „Desenul: 40.00 × 40.05
mm”; cu Transformarea, colțul ne tras până sub bare: cutia 207.69 × 207.95 mm, fără refuz (înainte, raza de ~20 770 mm o
refuza tăcut). Trasă pe latură: „O cale cu arce se scalează doar proporțional (arcele ar deveni elipse).”, sub cutie, între
bare. **Găsit:** motivul cădea pe jumătate sub insula selecției (Duplică, Șterge, proprietățile): reparat în felia următoare
(6.R↑), cu proba lui.

## 2026-10-28 — Degruparea vectorilor (Model: Claude Opus 5.5)

**Prompt:** „Si vreau cat mai devreme sa avem functie de ungroup vectors. Pe click dreapta, dar, si in meniu, langa booleans”
(în timpul reparației scalării; cardul de sesiune nouă nu s-a putut arăta de pe telefon, deci aici, după reparație). Apoi, în
timpul feliei: „Notite: 1. Sistem de history pentru modificari, unde, daca vrem sa revenim la o stare, dar, vrem sa pastram unele
modificari care sa se pastreze, ce dificultati ar implica? 2. Buton de centrare un plansa, nu doar centrare orizontala si apoi
verticala. 3. Avem situatia unde degrupam niste vectori importati si duplicam si dupa aliniem. Ei se suprapun, si devine super
complicat sa pastram structura aia, daca nu ne dam seama imediat ca avem zeci chiar sute de vectori degrupati si asezati in alte
foste grupari de vectori. Ar trebui ca alinierea sa detecteze situatii de genul asta si sa creeze grupari automat si sa
functioneze in paralel si cu sistemul de history unde poti pune exceptii la unele modificari cand dai restore.” (cu poza
panoului ornamental): notate în CLAUDE.md, răspunsul la 1 în raport.
**Started:** 28.10, 20:55. Felia **6.R↑**, fără mașină și fără agenți: degruparea, înaintea reluării lui 9.4↑ (PDF / AI).
**Completed:** 28.10, 21:47. ADR 0103: o piesă-grup se desface, un nivel, în câte o piesă pe copil (`src/model/degrupare.ts`,
`partiDegrupare`), la bit în lume (cu matricea grupului compusă, dacă are una), cu operațiile ei pe nodurile ei; G-code-ul
GRBL, fără comentarii, iese același (probat). Comanda `degrupeaza` / `regrupeaza` în jurnal, liniară (măsurat: 20 000 de părți,
aplicarea 3 ms, anularea 4 ms; calea veche, ~3 s fiecare). Refuzurile, cu motiv: V-carve-ul peste părți, piesa împărțită,
plafonul operațiilor (o operație pe N contururi devine N). Ușile: `document.degrupeaza` (registru, paletă, Ctrl+Shift+G, garda
„Editarea se încarcă încă” înaintea modulului), butonul de lângă boolean, meniul de clic dreapta (`MeniuContext`: Degrupează,
booleanul, Duplică, Șterge, cu tastele; săgețile, Escape, altă tastă îl închide). Și: banda etichetei mânerelor ocolește insula
selecției. Manualul: „Degruparea”, „Meniul de clic dreapta”, tasta. Mutațiile: 28 / 28; prima rundă din editare refăcută,
fiindcă îi căzuse controlul (un pas nou al probei pica pe codul bun: React scotea meniul din pagină înaintea tastei, care nu
mai schimba unealta; acum meniul se închide după ce tasta își face drumul).

**Publicat pe test (28.10, 21:59)**, din workflow (run 40758784810, `622e4cc`), cu CI-ul rapid verde (run 40757544852, 6 felii +
oracolul exportului 2D). Verificat în browser la 1440 px: după „Reîncarcă”, pagina e pe `622e4cc0e134`, controlată de worker;
butonul Degrupează stă în secțiunea Boolean. Un DXF cu trei contururi dat ferestrei („Desenul: 63.00 × 73.00 mm”, „3 contururi
închise: 2 tăiate pe exterior, 1 pe interior”); clic dreapta pe latura de jos a dreptunghiului: meniul, cu Degrupează activ și
focalizat (Ctrl+Shift+G), booleanul inactiv, Duplică (Ctrl+D) și Șterge selecția (Delete); Degrupează: trei rânduri
„trei-contururi”, toate alese, meniul închis; Ctrl+Z: unul singur. **Găsit:** meniul deschis lângă panoul de proprietăți intra
sub el (tasta se vedea tăiată): mărginit acum la zona liberă a pânzei (`.zona-libera`), cu probă e2e și mutație (29 / 29), în
commit-ul următor.

**Publicat pe test (28.10, 22:28)**, din workflow (run 40763130405, `7a5b07e`), cu CI-ul rapid verde (run 40761904082). Verificat
în browser la 1440 px: pagina e pe `7a5b07ea1f96`, controlată de worker; clic dreapta lângă marginea din dreapta a pânzei: meniul
stă între x 961 și 1164, în zona liberă (marginea ei: 1168), înaintea panoului de proprietăți (1180), cu toate tastele întregi.

**Pauză (28.10, 22:56)**, la „sa faci pauza cand se poate”: felia 9.4↑ stă pe ramura `wip/9.4-pdf` (`80afa4b`), nu pe `main`. Gata acolo:
cititorul obiectelor (`src/io/pdfObiecte.ts`: xref clasic și flux, /Prev, fluxurile de obiecte, reconstruirea, filtrele) și ușa
(`src/io/pdf.ts`: paginile, CropBox, UserUnit, rotirile, straturile, operatorii, Form XObject-urile); regulile comune ușilor
(`incheieSubcalea`, `normalizeazaForma`, `preaDeparte`) mutate în `caleImport.ts`; corpusul PyMuPDF (6 fișiere, 10 seturi) citit
11 / 11; ușile SVG, DXF, PDF și importul: 1 711 teste, 0 picate. Rămân: probele țintite, dialogul (.pdf / .ai, pagina, raportul),
spațiul fișierelor, manualul, e2e-ul, mutațiile, ADR 0104, fișa, porțile, publicarea.

**Reluat (29.10, 07:59)**, la „continua”: ramura `wip/9.4-pdf` adusă pe `main` (squash), apoi restul feliei.
**Completed:** 29.10, 10:00. ADR 0104. Probele țintite ale cititorului (`test/unit/pdf.obiecte.test.ts`, 12): lexerul,
filtrele cu vectorii lor (ASCII85 din Python, LZW din specificație), predictorii pe hârtie, Flate trunchiat și bomba sub
plafon, xref ca flux cu flux de obiecte scrise de mână, ciclurile, OCMD-urile, imaginea inline, refuzurile, decupajul
pictat; găsit: `--5` se citea +5 (acum −5, ca în Adobe Reader). Dialogul: `.pdf` și `.ai` (și după tipul MIME), lista
**Pagina** (și după un refuz: coperta doar cu text, cu numărul paginilor în refuz; cât se recitește, refuzul și focusul
rămân), straturile numite, raportul cu 17 coduri și refuzurile noi în ambele limbi; o eroare a cititorului nu mai spune
„nu e un SVG” la un DXF sau PDF; un AI fără conținut PDF își primește sfatul. Spațiul fișierelor: „Exportă vectori” stă
între import și „Exportă G-code”, în bara de sus (controlul `vectori` al aranjamentului, umplut de editare), cu iconița
și sfatul vecinilor. Găsit la verificarea locală (1280 și 1440 px): panoul vectorilor se deschidea sub extensie, iar
sfaturile barei de sus stăteau sub ea de la ADR 0053; acum bara urcă peste extensie cât coboară un sfat sau un panou al
ei, iar sfatul unui buton cu panoul deschis nu se mai arată. Manualul: „Importul SVG, DXF, PDF și AI”, ecranul, exportul
vectorilor. Mutațiile: 28 / 28 (17 pe probele unitare, 11 pe e2e, controlul verde înainte și după); una a trecut întâi: decupajul pictat (`W … S`) nenumărat, fiindcă probele aveau doar `W n`: probă nouă. Pornirea 97,1 → 97,2 (cu ușa 100,7 / 110 kB); totalul 341,0 → 349,7 / 400.

**Publicat pe test (29.10, 10:44)**, din workflow (run 40843947972, `40d2cb0`), cu CI-ul rapid verde (run 40843153660, 6
felii + oracolul exportului 2D). Porțile locale: compilatorul (aplicația și funcțiile), importurile, licențele, suita unitară
(7 687 de teste, 0 picate; 8 sărite: logourile owner-ului, lipsă local), build-ul determinist, e2e-ul (265; un `EBUSY` al lui
Drive pe o descărcare, reluat singur: verde), emulatoarele (36 + 13). Verificat în browser la 1440 px, în română: pagina e pe
`40d2cb042ea8`; bara de sus are la capăt importul („Importă SVG / DXF / PDF / AI…”), „Exportă vectori…” și „Exportă G-code”,
fără să atingă marca sau insula din dreapta. Un PDF de două pagini lăsat pe pânză: coperta refuzată („Pagina n-are nicio cale
de importat…”, cu blocul de text numărat) și lista **Pagina (din 2)**; pagina 2: „Desenul: 70.00 × 60.00 mm”, conturul pe
exterior, linia deschisă, „1 strat, păstrat ca numele formelor: DECUPARE”, forma de pe stratul oprit sărită, focusul rămas pe
listă; „Importă” a pus piesa „Planse” cu cele două profiluri. Panoul vectorilor s-a deschis sub buton, peste extensie și peste
proprietăți (la lovire, cele patru colțuri sunt ale panoului).

## 2026-10-29 — Etapa 7: textul (Model: Claude Opus 5.5)

**Prompt:** „poti sa lucrezi si la etapa 7 in paralel?”, apoi „Da, etapa 7” (la „Încep etapa 7 (textul) aici, acum?”: o
sesiune paralelă nu se poate porni cât owner-ul lucrează prin Remote Control).
**Started:** 29.10, 11:05. Felia **7.1↑**, fără mașină și fără agenți: textul, adus din etapa 7 (rândul de prag „Text, text
pe cale, fonturi”). Un cititor TrueType propriu (contururile, cmap, avansurile, crenarea), înălțimea textului = înălțimea
majusculei verificată pe H (ADR 0019), cuadraticele ridicate exact la cubice, glifele normalizate nonzero la intrare
(ADR 0036), diacriticele ș ț cu virgulă, blocul de text editabil în document (v19), unealta Text, fonturile incluse
(Roboto 2.001, Apache 2.0, de pe mașina asta, fără descărcări). Textul pe curbă, fonturile omului (și CFF), fonturile cu o
singură linie și restul parametrilor vin în feliile următoare ale etapei.
**Completed:** 29.10, 12:08. ADR 0105. Cititorul TrueType propriu (`src/text/font.ts`): glifele simple și compuse (cu
transformările, deplasarea scalată sau nu și componentele puse pe puncte), `cmap` 4, `loca` scurt și lung, majuscula verificată
pe H, crenarea din `GPOS` (formatele 1 și 2). Așezarea (`src/text/asezare.ts`): mm din majusculă, crenarea și spațierea doar
între litere, rândurile, alinierea, cubicele exacte, normalizarea nonzero. Piesa: un grup pe literă, blocul pe rădăcină cu
amprenta contururilor (nu o schemă nouă; o editare de noduri îl face vectori, scalarea uniformă îl crește), operațiile mutate pe
contururile noi la editare. Unealta Text (X), panoul, acțiunea `document.text`, fonturile Roboto și Droid Serif (subseturi,
Apache 2.0, în precache), manualul („Textul”, tasta), regula de import a lui `src/text` (cu capcana). Corpusul fontTools: 10
așezări, glifele compuse brute, crenarea tuturor perechilor. Găsit pe drum: varianta cu accentele peste literă se normalizează
(corect), deci componentele se probează brute; la e2e, ancora cădea pe panou. Mutațiile: 39 / 39 (33 pe probele unitare, 6 pe e2e, controlul verde înainte și după); 4 au trecut întâi: crenarea pe clase (perechile corpusului nu atingeau subtabelul pe clase), primul subtabel care câștigă și acoperirea pe intervale (fonturile livrate nu le pot arăta), „Adaugă” fără ancoră (proba verifica butonul înaintea textului): probe noi (crenarea tuturor perechilor față de fontTools, o variantă cu clasa 0 / 0 la 777, acoperirea pe octeți scriși de mână, textul scris înaintea ancorei). Pornirea 97,2 → 97,4 (cu ușa
100,9 / 110 kB); totalul 349,7 → 358,6 / 400.

**Publicat pe test (29.10, 12:32)**, din workflow (run 40857939520, `56945d1`), cu CI-ul rapid verde (run 40856852065, 6
felii + oracolul exportului 2D). Porțile locale: compilatorul (aplicația și funcțiile), importurile, licențele, traducerile,
suita unitară (7 716 teste; 2 picate întâi: listele fixate ale acțiunilor la cerere, fără `document.text`: puse, verzi; 8
sărite: logourile owner-ului, lipsă local), build-ul determinist, e2e-ul (267; testul tastelor fixa 9 unelte: acum 10,
reluat singur: verde), emulatoarele (36 + 13). Verificat în browser la 1440 px, în română: pagina e pe `56945d109971`, cu
Textul a zecea unealtă (X). Un clic pe foaie a pus ancora, iar „LEMN Șțăâî” cu „Adaugă” a pus piesa: 16 forme, profilul
exterior pe 14 contururi și cel interior pe 2 (ochiurile lui ă și â), aleasă și gata de editat („Editezi textul ales…”).
Droid Serif la 30 mm, cu „Aplică”, a înlocuit-o (cutia 231,05 × 41,49 mm): Ș și ț cu virgula dedesubt, ă, â, î cu semnele
lor. Mutată din câmpul X la 20 mm, a rămas text editabil, iar „14 forme ies din foaie” a dispărut; un „H” aplicat peste ea:
cutia 30,12 × 30,00 mm (majuscula de exact 30 mm), apoi textul pus înapoi. 0 erori în jurnal și în consolă.

## 2026-10-29 — Etapa 7: fonturile omului (Model: Claude Opus 5.5)

**Prompt:** „Fonturile mele, si vreau sa se foloseasca fonturile sistemului, dar si cu posibilitatea de descarcare din google
fonts” (la „Ce felie din etapa 7 urmează?”, după 7.1↑).
**Started:** 29.10, 12:56. Felia **7.2↑**, fără mașină și fără agenți: fonturile omului, din trei surse. (1) Încărcate de el
(`.ttf`, `.otf`, `.ttc`, `.woff`), ținute în browser („Fonturile mele”); (2) ale sistemului, prin Local Font Access
(`queryLocalFonts`, Chrome / Edge pe desktop, cu permisiunea omului); (3) din Google Fonts: catalogul și adresa fișierului
TTF al fiecărei variante vin printr-o funcție a proiectului (fără cheie API: catalogul public și CSS API v2), fontul se
descarcă din `fonts.gstatic.com` și rămâne în „Fonturile mele”. Cititorul crește pentru fonturile reale: contururile CFF
(OpenType `.otf`, și cele CID, ca Source Han), colecțiile TTC, `cmap` 12 și fonturile simbol, tabelul `kern` vechi,
căutările Extension din `GPOS`. Sondajul fonturilor de pe mașina asta (566 de fețe): 52 CFF (2 CID), 15 colecții, 6
variabile, 296 cu `kern` (180 fără `GPOS`), 81 cu căutări Extension, 296 fără `sCapHeight`, 11 fără `cmap` Unicode.
Fonturile variabile se citesc în instanța lor implicită; celelalte instanțe vin într-o felie următoare.
**Completed:** 29.10, 19:03. ADR 0106. Cititorul pentru fonturile reale: CFF (`src/text/cff.ts`: indexurile, DICT-urile, CID cu FDSelect, interpretorul Type 2 cu cele patru flex-uri, subrutinele cu toate decalajele, sugestiile, `seac`), TTC, `cmap` 4 / 6 / 12 și simbolul Windows, tabelul `kern` vechi (Microsoft și Apple, perechile într-o hartă), căutările Extension, WOFF 1.0 (`woff.ts`); majuscula = vârful lui H. „Fonturile mele” (`biblioteca.ts`, IndexedDB), fonturile sistemului (`sistem.ts`, Local Font Access), id-urile din bloc (`iduriFont.ts`) și numele fontului în bloc; Google Fonts prin funcția `fonturiGoogle` (contractul în `shared/fonturiGoogle.ts`, fără cheie API), clientul la cerere (`src/cloud/apelFonturiGoogle.ts`); panoul cu lista în trei grupuri și previzualizarea, fereastra **Fonturi…** (la cerere), manualul. Sondajul fonturilor reale: 557 din 566 de fețe identice cu fontTools (52 CFF, 505 TrueType). Corpusul fontTools: 20 de așezări, 84 de glife brute, crenarea în 9 fonturi (Inter și Source Han subsetate de pe mașina asta, OFL; un CFF scris de mână). Găsite pe drum: Elephant cu perechile `kern` neordonate, 77 de fețe cu `sCapHeight` diferit de H, matricea rotunjită a lui Inter, panoul textului peste fereastra fonturilor (la e2e). Funcțiile publicate pe test, din workflow, cu felia. Mutațiile: 74 / 74 (65 pe probele unitare, 9 pe e2e, controlul verde înainte și după); 6 au trecut întâi: FDSelect în formatul 3 (fixtura CID avea formatul 0), octeții de după un `cmap` 6 (erau zero), subtabelele `kern` cross-stream și „minimum” (aveau doar perechi acoperite de override), un WOFF cu directorul neordonat, un font încărcat a doua oară spus „adăugat”: probe noi; a șasea, o verificare redundantă a feței (`< 1024` după trei cifre), scoasă. Pornirea 97,4 neschimbată (cu ușa 100,9 / 110 kB); totalul 358,6 → 370,5 / 400.

**Publicat pe test (29.10, 19:43)**, din workflow (run 40923407698, `bddd84c`: hosting, funcțiile cu `fonturiGoogle` creată,
regulile, indecșii), cu CI-ul rapid verde (run 40922146978, 6 felii + oracolul exportului 2D). Porțile locale: compilatorul
(aplicația și funcțiile), importurile, licențele, traducerile, suita unitară (7 742 de teste, 0 picate; 8 sărite: logourile
owner-ului, lipsă local), build-ul determinist (209 fișiere), e2e-ul (270), emulatoarele (36 + 13; `fonturiGoogle` se
încarcă). Verificat în browser la 1440 px, în română: pagina e pe `bddd84c9572e`; unealta Text are lista fonturilor în grupuri,
previzualizarea și **Fonturi…**. Google Fonts adevărat, prin funcția publicată (App Check): catalogul în 3,3 s (pornirea la
rece), 1 535 de familii cu diacriticele românești; „Lobster” descărcat în 0,6 s, „Adăugat în Fonturile mele: Lobster
Regular”, ales în panou; „Lemn de stejar” de 25 mm cu el: piesa cu 20 de forme (13 pe exterior, 7 pe interior), blocul cu
`font: g:Lobster:400`, `numeFont: Lobster Regular`. Încărcarea (Droid Serif, ca fișier): „Adăugat în Fonturile mele: Droid
Serif”, `f:58a99f6327be17b5`, lista cu sursa și mărimea. Fonturile sistemului: în browserul aplicației permisiunea
`local-fonts` e refuzată din oficiu, iar fila spune cum se permite; butonul „Permite accesul” rămâne de încercat în Chrome / Edge.
0 erori în jurnal și în consolă.

## 2026-10-29 — Sugestiile personalului în /admin (Model: Claude Opus 5.5)

**Prompt:** „Vreau sa cream si sistemul de account pentru useri, inclusiv admini, scopul acum imediat este pentru admini, si, sa
avem un sistem de feedback unde ei pot nota sugestii, iar eu sa pot decide ce sa implementam” (28.10, în timpul feliei 6.R↑;
planul, în raportul ei; ordinea, „Întâi PDF-ul”), apoi, pe 29.10, „acum poti sa deschizi subtask/session?”: sesiunea principală
a pornit o sesiune paralelă cu brief-ul feliei (fila Sugestii, o permisiune nouă din catalog, decizia owner-ului cu o notă,
regulile probate pe emulator, auditul ca la personal, ro + en, ADR 0107; doar pe ramura ei, fără publicare).
**Started:** 29.10, 19:35. Felia **14.B↑**, fără mașină și fără agenți, într-un worktree în afara Drive-ului
(`C:\Users\besli\cncvs2-lucru\sugestii`, ramura `wip/14.B-sugestii`, din `bddd84c`), cât sesiunea principală publica 7.2↑. Planul
din 6.R↑ („toți văd lista”; stările acceptată, amânată, respinsă, în lucru, făcută; tipul) și brief-ul („își vede sugestiile”;
„de făcut / mai târziu / respinsă”; zona) nu lăsau o întrebare care să oprească lucrul: vizibilitatea o aleg bifele owner-ului pe
fiecare rol (două permisiuni), stările sunt cele din plan, iar tipul și zona intră amândouă.
**Completed:** 29.10, 21:35. ADR 0107. Catalogul: `sugestii.scrie` și `sugestii.citeste`; decizia, doar a owner-ului. Callable-ul
`sugestii` (`functions/src/sugestii/actiuni.ts`): scrie, editeaza, decide, cu drepturile și auditul în tranzacție, pe versiunea
văzută, cel mult 20 pe om pe zi UTC (`limiteSugestii/{uid}`); câmpurile curățate de aceleași funcții ca în pagină
(`shared/sugestii.ts`). Regulile: doar citirea (toate, sau doar ale autorului), fără index compus (lista autorului se ordonează în
pagină). Fila Sugestii (`src/admin/sugestii/`): formularul (tipul ales de om, fără implicit), filtrele pe stare cu numărul lor,
„Doar ale mele”, decizia cu nota; „Editează” și „Decide” deschid formularul pe versiunea de atunci. Scriptul asistentului:
`node scripts/sugestii.ts` (REST, cu identitatea `firebase login`); `clientFirebaseTools` ia `firebase-tools` din dosarul global
al lui npm (`%APPDATA%`) când npm lipsește din instalarea Node, ca pe mașina asta. Citit pe test, doar citire: „0 în total”
(colecția vine cu publicarea). Găsit pe drum: e2e-ul a prins formularul deciziei rămas deschis pe versiunea veche după
„Reîncarcă”; acum se închide, iar eroarea veche nu mai trece în formularul nou. Mutațiile: **39 / 39** (21 pe emulatoare, pe
reguli și pe server; 15 pe probele unitare; 3 pe e2e, tot pe emulatoare), cu restaurarea verificată și arborele identic cu HEAD
la final; una a trecut întâi: editarea care schimbă doar zona (probă nouă: fiecare câmp schimbat singur e o schimbare). Porțile
locale: compilatorul (aplicația și funcțiile), importurile, licențele, traducerile (0 lipsă), suita unitară (7 752 de teste, 0
picate, 8 sărite: logourile owner-ului), build-ul determinist, e2e-ul în Edge (270; `rest.spec.ts` a picat întâi cu `EBUSY` la
citirea unei descărcări și a trecut la reluare), emulatoarele (funcțiile și regulile 46, e2e-ul `/admin` 15). Cât portul 4173 l-a
ținut altă sesiune, e2e-ul a rulat pe 4183 (unde pică doar probele raportorului, care cer `http://localhost:4173/`); rularea
finală e pe 4173. Emulatoarele, împărțite cu sesiunea textului pe curbă: rulările s-au anunțat una alteia, pe rând. Pornirea
neschimbată (97,4; cu ușa 100,9 / 110 kB), totalul 370,5 / 400; `/admin` 190,2 → 194,2 / 200 kB (strâmt: ~5,8 kB).
Nepublicată: fuziunea în `main` și publicarea le decide owner-ul.

## 2026-10-29 — Etapa 7: textul pe curbă (Model: Claude Opus 5.5)

**Prompt:** „Continua tu ce aveai la rand” (după raportul feliei 7.2↑, care recomanda textul pe curbă).
**Started:** 29.10, 19:56. Felia **7.3↑**, fără mașină și fără agenți: textul pe curbă (criteriul din cercetare: întins pe
un cerc R50, textul ocupă 314,16 mm de arc, ±1 %). Cu unealta Text, un clic pe un contur (care nu e text) pune ancora pe el,
în punctul cel mai apropiat; literele urmează curba (deschisă sau închisă; peste capetele unei curbe deschise, pe tangentă),
câte una, rotită după tangentă sau verticală; poziția față de curbă (deasupra, pe linia de bază, centrat, dedesubt, la o
distanță), partea cealaltă, întins pe toată curba, mai multe rânduri. Curba intră în blocul textului (editabil după salvare).
Oracolul: așezarea scrisă din nou în Python (fontTools pentru glife și lungimile cubicelor).
**Prompturi pe parcurs:** „cum fac sa adaug fonturi” (cu o captură a panoului Text) și „vreau sa se poata face preview la un
font, de oriunde este el, mai ales din google fonts, inainte sa descarci fontul” (intrate în aceeași felie).
**Completed:** 29.10, 21:15. ADR 0108. Textul pe curbă: `parcurgere` și `pozitiePeCurba` în `src/model/curba.ts` (dincolo de capete, reluată sau pe tangentă; ancora din zeroul derivatei distanței, sub 1e-9 mm), `src/text/peCurba.ts` (literele întregi, rotite sau verticale; deasupra, pe linia de bază, centrat, dedesubt, cu distanța; sensul: o curbă închisă parcursă în sensul acelor, partea cealaltă; întins pe toată curba, cu golurile egale), curba în blocul textului (`SchemaCurbaText`, scalată cu el); clicul lângă un contur în `Editare.tsx`, secțiunea **Pe curbă** în panou (care se derulează acum în zona liberă). Proba fonturilor în fereastra **Adaugă fonturi…** (butonul redenumit, cu chenar): **Textul de probă**, contururile aplicației pentru fonturile mele și ale sistemului (`aduceFont`, fără să le țină; lista sistemului cu căutarea și **Folosește**), fețele de afișare Google înainte de descărcare (`src/app/previzualizareFont.ts`, CSS API v2 din browser; CSP-ul primește `fonts.googleapis.com` și `fonts.gstatic.com`). Oracolul Python: 16 cazuri pe curbă, aplicația sub 2e-11 mm; a prins alinierea textului întins pe o curbă închisă (număra golul de după ultima literă). Proba țintită a prins precizia ancorei (~5e-7 mm din minimul singur), e2e-ul panoul care trecea sub bara de jos, proba Google un `unicode-range` stricat primit cu tot intervalul. Mutațiile: 47 / 47 (37 pe probele unitare, 10 pe e2e, controlul verde înainte și după); una a trecut întâi: segmentele fără lungime nesărite (doar la capetele unei curbe deschise): probă nouă. Pornirea 97,4 neschimbată (cu ușa 100,9 / 110 kB); totalul 370,5 → 374,4 / 400.

**Publicat pe test (29.10, 21:49)**, din workflow (run 40939484104, `17cc058`; apoi run 40942837161, `320529d`, a doua
trecere), cu CI-ul rapid verde (run 40938278284 și 40941298454: 6 felii + oracolul exportului 2D). Porțile locale:
compilatorul (aplicația și funcțiile), importurile, licențele, traducerile, suita unitară (7 769 de teste, 0 picate; 8
sărite: logourile owner-ului, lipsă local), build-ul determinist (209 fișiere), e2e-ul (271, înainte și după a doua
trecere), emulatoarele (36 + 13). Verificat în browser la 1440 px, în română, pe `320529d74a9d`: un cerc R50 desenat, apoi,
cu unealta Text, un clic sus pe el: „Pe curbă (314,16 mm)”; „CNC VECTOR STUDIO” în Lobster, 12 mm, centrat, adăugat:
arcuit deasupra cercului, pe dinafară, citit de la stânga la dreapta (piesa cu 15 forme, profilul pe exterior). Fereastra
**Adaugă fonturi…**: Google Fonts, catalogul în 2,8 s, fiecare familie scrisă cu ea însăși înainte de descărcare (Pacifico;
Roboto Slab, Regular → Bold, cu fețele lui); textul de probă cu diacritice („Ușă de stejar țâșnită”) aduce și alfabetul
latin-ext, chirilicele nu; Fonturile mele (Droid Serif, Lobster) desenate din contururi. Prima publicare avea
previzualizarea din panoul textului strânsă la o dungă: a doua trecere a reparat-o (64 px, fără bară laterală, panoul se
derulează). 0 erori în jurnal și în consolă.

## 2026-10-29 — Unirea sugestiilor în main (Model: Claude Opus 5.5)

**Prompt:** „Da, unește” (la întrebarea: unesc ramura `wip/14.B-sugestii` în `main`, cu cele 3 conflicte de documente
rezolvate păstrând ambele rânduri, cu porțile și publicarea pe test?).
**Started:** 29.10, 21:53. **Completed:** 29.10, 22:27. Commit-ul de unire `7d0ea40`: ramura 14.B↑ (80be4b0, f4f3a14,
ebfa9e6), lucrată de sesiunea paralelă în worktree-ul ei (`C:\Users\besli\cncvs2-lucru\sugestii`), fără să atingă `main`.
Conflictele, doar în documente (DEVLOG, indexul ADR, jurnalul fișei etapei 3), rezolvate cu ambele părți, în ordinea
pornirii (14.B↑ la 19:35, 7.3↑ la 19:56). Citite înainte: regulile noi (o sugestie se citește cu `sugestii.citeste` sau, cu
`sugestii.scrie`, doar de autorul ei; nicio scriere din client), callable-ul `sugestii` (App Check, drepturile și auditul în
tranzacție), scripturile pentru asistent (doar citire); în diff nicio cheie reală (doar cele false ale emulatorului). Porțile
pe rezultat: compilatorul (aplicația și funcțiile), importurile, licențele, traducerile (467, 0 lipsă), suita unitară (7 779
de teste, 0 picate; 8 sărite), build-ul determinist (211 fișiere; pornirea 97,4 / 110 kB, totalul 374,4 / 400, `/admin` 194,2
/ 200), e2e-ul (271), emulatoarele (funcțiile 46, `/admin` 15). CI-ul rapid verde (run 40947228894).
**Publicat pe test (29.10, 22:25)**, din workflow (run 40948486818, `7d0ea40`): regulile, funcția `sugestii` creată, celelalte
actualizate. Verificat: `sugestii` răspunde fără App Check cu 401 JSON („Unauthenticated”), ca `fonturiGoogle` (publică la
gazdă, refuzul e al ei); `/admin` pe `7d0ea4033da8`, fără erori în consolă. Fila Sugestii însăși n-am văzut-o pe test: cere
logarea owner-ului, pe care asistentul n-o face; e probată pe emulatoare (e2e-ul `/admin`).

## 2026-10-29 — Etapa 4: calculul CAM în bazinul de workere (Model: Claude Opus 5.5)

**Prompt:** „vreau o subsesiune care sa lucreze la inca ceva la care poate sa lucreze fara sa afecteze celelalte sesiuni”.
Sesiunea părinte a ales calculul CAM în workere: rândul de prag „Calcul pe mai multe fire”, primul pas al deciziei din 28.10
(rolurile de tăiere în panou, cu traseul la zi).
**Started:** 29.10, 21:40. Felia **4.A↑**, fără mașină, în worktree-ul `wip/4.A-cam-workere`. Programul CAM al exportului, al
traseului și al vederii 3D se calculează în bazinul `src/jobs/`, cu anulare și cu rezultatul transferat. G-code-ul rămâne
același, octet cu octet.
**Oprită:** 29.10, 22:05, înainte de cod, la poarta mărimii. Regula din brief: dacă workerul dublează codul CAM și totalul
trece de 400 kB, mă opresc și spun, fără să ridic plafonul.
- **Măsurat cu `node scripts/build-determinist.ts`, pe experimente refăcute după măsurare:**
  - workerul CAM construit are 70,2 kB gzip;
  - cu CAM-ul doar în worker, totalul e 410,8 / 400 kB;
  - pragul de jos, cu postul, estimarea și pregătirea simulării scoase și ele din firul principal, e 401,9 / 400 kB;
  - pornirea, 97,2 / 110.
- **Cauza:** Vite construiește workerul separat, iar harta importurilor (ADR 0098) nu se aplică în workere. Workerul își ia
  deci propria copie din cavalier (25,5 kB, folosit pe firul principal și de offsetul din desen, de boolean și de import) și
  din geometria din bucata de pornire.
- **Timpii de azi, pe firul principal** (Node 26): pe 2 304 forme (78 336 de mișcări), CAM-ul ia 0,47–0,50 s, iar exportul
  întreg 1,53 s.
- **Decizia e a owner-ului:**
  - plafonul 450 kB, cu un ADR nou (recomandat);
  - sau cavalier doar în worker, ~380 kB, cu o felie mai mare;
  - sau amânarea.

**Reluată:** 29.10, 22:10, la „1” al owner-ului: plafonul total 400 → 450 kB, cu un ADR nou (0109), iar felia merge cum e
scrisă.
**Pauză:** 29.10, 22:51, la „facem pauza”. Totul e pe `wip/4.A-cam-workere`, ca WIP; arborele nu se compilează încă.
- **Scrise:**
  - codecul IR, `src/jobs/impachetare.ts`: programul în tablouri tipizate, transferate;
  - rezumatul jobului și timpii traseului, mutați neschimbați în `src/jobs/rezumat.ts`;
  - protocolul, calculul, workerul și bazinul CAM: `src/jobs/protocolCam.ts`, `calculCam.ts`, `lucratorCam.ts`,
    `bazinCam.ts`. În Node, calculul rulează în proces, prin `structuredClone`;
  - `src/ui/actiuniExportCalcul.ts`, legat de bazin;
  - `define` `__CNCVS2_CONSTRUIT__` în `vite.config.ts`.
- **Rămân:**
  - `actiuniExportTipuri.ts`: `ParametriExport` și `RezumatJob` vin din `src/jobs/` (doar tipuri);
  - `actiuniExport.ts`: semnalul de anulare;
  - `App.tsx`: traseul și cipul timpului prin bazin, anularea la un document schimbat;
  - `Vedere3D.tsx`: `programSimulare` devine asincron;
  - `actiuniAnimatie.ts`: `secundePeMiscare` vine din `src/jobs/rezumat.ts`;
  - importurile testelor;
  - regula `bazinul-doar-simularea`, extinsă (`.dependency-cruiser.cjs`, `scripts/verifica-importuri.ts`);
  - poarta: plafonul 450, workerul `lucratorCam` în reguli, CAM-ul doar în worker; apoi proba că ramura din proces dispare
    la build;
  - probele: unit și e2e pe 4193, octet cu octet;
  - timpii în Edge;
  - ADR 0109, CLAUDE.md, jurnalul, traducerile.

**Reluată:** 30.10, 07:14, la „continua”. Raționamentul refăcut de la capăt și `main` adus pe ramură (fuziunea sugestiilor).
O schimbare față de pauză: traseul nu mai așteaptă timpul din cip. Workerul trimite întâi programul, iar timpul e o cerere
separată.

**Completed:** 30.10, 08:54. ADR 0109; commit-urile `2d0af31` (codul și probele), `e970c85` (probele noi după otrăvuri) și
documentele.
- **Workerul CAM** (`src/jobs/lucratorCam.ts`; bazinul `src/jobs/bazinCam.ts`; protocolul `protocolCam.ts`):
  - calculul e cel de dinainte, mutat neschimbat în `calculCam.ts` și `rezumat.ts`;
  - codecul IR e `impachetare.ts`;
  - în worker rulează exportul, traseul, timpul și vederea 3D.
- **Legăturile:** `actiuniExportCalcul.ts` cheamă bazinul. `App.tsx` aduce traseul și cipul timpului prin bazin și anulează
  calculul la un document schimbat. `Vedere3D.tsx` primește programul asincron, iar `actiuniExport.ts` primește semnalul.
- **Regula de import** `bazinul-fara-interfata`.
- **Poarta:** plafonul 450 kB și CAM-ul doar în worker, după marcaje; `lucratorCam` e obligatoriu în precache.
- **Probele:**
  - `test/unit/cam.bazin.test.ts`, cu corpusul `ajutor-corpus-cam.ts` (14 documente);
  - `test/e2e/cam-bazin.spec.ts`, cu partea de Node `cam-node.ts`.
- **Otrăvurile:** `test/otravuri/4.A.py`, 27 / 27; cele mutate din `timp.py` și `simulare.py` au fost îndreptate.
- **Porțile, pe ramură:**
  - compilatorul;
  - importurile: 17 reguli, 17 capcane;
  - suita unitară: 7 789 de teste. Ultima rulare a dat 7 780 trecute și 8 sărite (logourile owner-ului, lipsă local), plus
    1 picat: proba roadmap-ului (`documentatie.test.ts`) ținea lista feliilor etapei 4 fără 4.A↑. Lista a fost întinsă, iar
    testul trece acum;
  - build-ul determinist: 206 fișiere; pornirea 97,3 (cu ușa 100,8 / 110), totalul 411,8 / 450;
  - e2e-ul, pe portul 4193: 275 de teste, 273 trecute. Cele două picate nu țin de felie:
    - `raportor.spec.ts:101` cere adresa de pe 4173;
    - `tutorial.spec.ts` e instabil și pe `main` (3 din 5 rulări pe bază, 4 din 5 pe ramură);
  - traducerile: 0 lipsă.
- **Timpii** (Edge 156, 2 304 de forme):
  - la T, golul cel mai lung al pânzei: 633–683 ms → ≤ 233 ms;
  - la export, calculul: ~1,2 s de pânză oprită → 1,07 s în worker, fără goluri.
  - Rezultatele vin cu 0,25–0,5 s mai târziu (cifrele, în ADR).
- **Găsit:** Edge 156 și Node 26 diferă pe ultimul bit al funcțiilor matematice. Dublele CAM-ului diferă cu cel mult
  4,65e-7 mm, iar G-code-ul rămâne identic.
- **Nepublicat:** owner-ul decide unirea.

## 2026-10-30 — Centrarea pe foaie (Model: Claude Opus 5.5)

**Prompt:** „continua” (după pauză; felia aleasă din notițele owner-ului din 28.10, notița 2: „Buton de centrare un plansa, nu
doar centrare orizontala si apoi verticala.”; `node scripts/sugestii.ts`: nicio sugestie pe test).
**Started:** 30.10, 07:14. Felia **6.S↑**, fără mașină și fără agenți: „Centrează pe foaie” în secțiunea Aliniere, centrul
cutiei comune a selecției în centrul foii, pe ambele axe, într-un clic; mai multe forme ca un bloc (aceeași deplasare).
**Completed:** 30.10, 08:05. ADR 0110. `centru-foaie` în `src/geom/aliniere.ts` (blocul: aceeași deplasare pentru toate,
referința mereu foaia), butonul în secțiunea Aliniere a extensiei, cu iconița lui (foaia cu blocul în mijloc), eticheta în
ro / en, capitolul din manual. Probele întâi: valorile pe hârtie (o formă, două ca un bloc, blocul deja centrat, o axă, ieșită
din foaie, o foaie care nu pleacă din origine), e2e-ul (o formă într-un clic; două ca un bloc, cu Ctrl+Z). Mutațiile: 7 / 7.
Porțile: compilatorul, importurile, licențele, traducerile (469, 0 lipsă), suita unitară (7 780, 0 picate; 8 sărite), build-ul
determinist (212 fișiere), e2e-ul (272; unul reluat singur după un `EBUSY` al Drive-ului pe artefactele Playwright),
emulatoarele (46 + 15). Pornirea 97,4 neschimbată (cu ușa 100,9 / 110 kB); totalul 374,4 → 374,5 / 400.

**Publicat pe test (30.10, 08:39)**, din workflow (run 41013367751, `1e4cdd0`), cu CI-ul rapid verde (run 41012604097).
Verificat în browser la 1440 px, în română, pe `1e4cdd09e48b`: secțiunea Aliniere are 9 butoane, „Centrează pe foaie” cu
eticheta și iconița lui (foaia cu blocul în mijloc); un dreptunghi 40,06 × 33,28 din X 109,94, Y 73,34 a ajuns, într-un clic,
în X 129,97, Y 83,36 (centrul exact în 150, 100). Două forme deodată n-am putut alege în browserul aplicației (clicurile cu
Shift pe pânză nu se înregistrau în panoul ascuns); blocul e probat de e2e pe același build.

## 2026-10-30 — Unirea calculului CAM în main (Model: Claude Opus 5.5)

**Prompt:** „Da, unește” (la întrebarea: unesc ramura `wip/4.A-cam-workere` în `main`, cu conflictele din documente rezolvate
păstrând ambele părți, cu porțile, emulatoarele și publicarea pe test?); pe parcurs: „sa imi spui cand pot sa arhivez acea
ramura de la CAM”.
**Started:** 30.10, 09:33. **Completed:** 30.10, 10:04. Commit-ul de unire `711fa51`: ramura 4.A↑ (`bc2ead8`), lucrată de
sesiunea paralelă în worktree-ul ei (`C:\Users\besli\cncvs2-lucru\cam-workere`). Citite înainte: porțile schimbate (plafonul
total 400 → 450 kB, decizia owner-ului „1”, ADR 0109; regula de import a bazinului lărgită doar spre domeniu: CAM, post, IR,
model; plasa nouă din build: CAM-ul doar în workerul lui). Conflictele, doar în documente (`CLAUDE.md`, DEVLOG, indexul ADR,
jurnalul fișei), rezolvate cu ambele părți, în ordinea pornirii (4.A↑ la 29.10 21:40, 6.S↑ la 30.10 07:14). Porțile pe
rezultat: compilatorul (aplicația și funcțiile), importurile, licențele, traducerile (472, 0 lipsă), suita unitară (7 790 de
teste, 0 picate; 8 sărite), build-ul determinist (208 fișiere; pornirea 97,3 / 110 kB, totalul 411,9 / 450, `/admin` 194,1 /
200), e2e-ul (276), emulatoarele (funcțiile 46, `/admin` 15; anunțate sesiunii sugestiilor). CI-ul rapid verde (run
41022510087).
**Publicat pe test (30.10, 10:00)**, din workflow (run 41023351532, `711fa51`). Verificat în browser la 1440 px, în română, pe
`711fa51cc6c3`: fereastra „Exportă G-code” se deschide (butonul Exportă nu l-am apăsat: ar fi descărcat un fișier); „Arată
traseul” aduce `lucratorCam` și arată „Timpul jobului: 1 min 12 s” în 0,5 s; vederea 3D, din programul workerului: „Placa
simulată la 0,25 mm” în 0,5 s. 0 erori în jurnal și în consolă.

## 2026-10-30 — Sugestia din editor, cu poza planșei (Model: Claude Opus 5.5)

**Prompt:** „Continua” (30.10, 07:29, în sesiunea paralelă a sugestiilor, după raportul de reluare: felia 14.B↑ încheiată, în
`main`, publicată pe test, nicio sugestie pe test). Pasul următor al sugestiilor, din planul feliei 6.R↑: butonul „Sugestie”
din editor, cu poza planșei atașată. Apoi „continua” (31.10, 10:00): sesiunea se întrerupsese chiar înaintea commit-ului
documentelor.
**Started:** 30.10, 07:30. Felia **14.B↑b**, fără mașină și fără agenți, în același worktree
(`C:\Users\besli\cncvs2-lucru\sugestii`), pe o ramură nouă, `wip/14.B-b-sugestie-editor`, din `e5538a0`. Fără întrebări, cu
implicitele: butonul stă lângă Test, doar în afara live (ca Test); poza e opțională și se poate scoate din formular; o ține un
document lângă sugestie (sub 400 kB, fără Storage); editorul nu încarcă Firebase (sugestia pleacă tot din fila `/admin`).
**Completed:** 31.10, 10:10 (porțile, gata pe 30.10 la 10:39; apoi doar commit-ul documentelor, după reluare). ADR 0111 (0110
a luat-o, în paralel, centrarea pe foaie). Contractul (`shared/sugestii.ts`): `poza`, opțională la scriere, base64 strict, cel
mult 400 kB, cu tipul citit din semnătură (JPEG, PNG, WEBP). Callable-ul `sugestii`: poza în `sugestii/{id}/poze/plansa`, în
aceeași tranzacție cu sugestia; pe sugestie și în audit, doar tipul și mărimea. Regulile: documentul pozei se citește câte unul
(`get`), de cine poate citi sugestia; nimeni nu-l scrie din client. Editorul: butonul **Sugestie** (ușa 67 din manual) deschide
`/admin#sugestii` întâi, în clic, apoi face poza planșei (`pozaPlansei`, ca la testul pas cu pas), o micșorează ca JPEG sub
plafon (`src/app/SugestieDinEditor.ts`) și o lasă în IndexedDB, cu un anunț pe BroadcastChannel (`src/app/pozaSugestiei.ts`,
valabilă 24 h); o filă blocată de browser primește un link. Fila Sugestii o ia în formularul sugestiei noi (și când e deja
deschisă: canalul, plus revenirea în filă), o arată cu ora și cu „Scoate poza”; pe rând, „Poza planșei” o aduce la cerere.
Bucățile din editor (`SugestieDinEditor`, `pozaPlansei`, `pozaSugestiei`) sunt doar online, cu plafonul lor (8 kB; 2,4
măsurat), în afara totalului. Găsite pe drum, în e2e: un mesaj BroadcastChannel trimis chiar înaintea lui `window.open`, în
aceeași sarcină, nu ajungea la nicio altă filă (fila deja deschisă rămânea cu poza veche; acum fila se deschide întâi, iar poza
și anunțul vin după); poza scoasă revenea la o reîncărcare imediată (acum iese din formular abia după ștergere). Mutațiile:
**19 / 19** (contractul, serverul, regulile, editorul și fila), cu restaurarea verificată față de HEAD; una a trecut întâi:
semnătura JPEG pe doi octeți (`FF D8` fără al treilea `FF`; probă nouă). `main` unit de două ori în ramură: `c7e62a6` (6.S↑;
conflictul doar în indexul ADR) și `1e9d568` (4.A↑, fără conflicte: plafonul total 450 kB stă lângă plafonul sugestiei). Porțile
pe arborele unit cu 4.A↑: compilatorul (aplicația și funcțiile), importurile (17 reguli), licențele, traducerile (475, 0 lipsă),
suita unitară (7 795 de teste, 0 picate; 8 sărite: logourile owner-ului), build-ul determinist (212 fișiere; pornirea 97,3, cu ușa 100,8 / 110 kB; totalul 412,3 / 450;
`/admin` 195,9 / 200, strâmt), e2e-ul în Edge (276) și emulatoarele (funcțiile și regulile 49, e2e-ul `/admin` 16), toate pe 4173, după ce sesiunea principală le-a eliberat. Nepublicată: unirea în `main` și publicarea le decide owner-ul. La publicare intră
regulile (documentul pozei) și funcția `sugestii`, actualizată.

## 2026-10-31 — Rularea de noapte roșie (Model: Claude Opus 5.5)

**Prompt:** „continua” (la începutul sesiunii: rularea de noapte `complet` căzută pe 30.10 și pe 31.10, cu CI-ul rapid verde;
incidentul numărul unu, înaintea oricărei felii).
**Started:** 31.10, 10:02. **Completed:** 31.10, 10:30. Trei cauze, toate în e2e-ul de pe Linux:
- **Bara de sus la 1280 px** (`editare.spec.ts`, ambele nopți): bara a crescut pe 29.10 (unealta Text, grupul fișierelor
  mutat în bară), iar la 1280 px, cu grila pornită, coloanele laterale ajunseseră exact cât uneltele (local rămânea doar
  intervalul de 12 px); cu fontul mai lat de pe Linux, bara intra 4,8 px peste unelte. Reparația, în `src/app/stil.css`:
  coloana uneltelor nu scade sub ele (`minmax(max-content, 1fr)`); când locul e strâmt, se strânge marca (cu „…”), iar bara se
  mută spre stânga. Proba primește o trecere cu literele lățite cu 5 px, care cade și local pe grila veche (1 104,7 față de
  1 091,5). Primul diagnostic (extensia care ar umfla coloana barei, cu butonul centrării) era greșit: sondele alternau grila
  pornită și oprită, iar diferența de 50 px era câmpul pasului grilei.
- **Testele bazinului CAM** (`cam-bazin.spec.ts`, 31.10): deschiderea proiectului aștepta doar lista, vizibilă și goală, iar
  tasta T apuca documentul gol („nicio formă n-are o operație de tăiere”, sau nimic). Acum se așteaptă primul rând al listei.
  Reprodus local cu procesorul încetinit de 8 ori: cu așteptarea veche, T fără efect în 60 s; cu cea nouă, „traseu.calcul” în
  3,7 s.
- **Testul pas cu pas** (`tutorial.spec.ts`, 30.10): reîncărcarea venea imediat după „Nu”, înaintea scrierii asincrone în
  IndexedDB; acum se așteaptă scrierea.
Porțile locale: compilatorul, build-ul determinist (208 fișiere, mărimile neschimbate), e2e-ul (276).
**Publicat pe adresa principală de test:** 31.10, `publica` pe `6c2a7c3` (rularea 41185505358), după rapid-ul verde
(41184915214); verificat în browserul aplicației la 1440 și 1280 px, cu grila: la 1280 px și litere lățite cu 5 px, bara se
mută spre stânga și rămân 12 px până la unelte.
**Corecție:** rularea de noapte pornită de mână pe `6c2a7c3` (41185040683) a trecut bara de sus și testul pas cu pas, dar a
căzut din nou pe cele două teste CAM, chiar la așteptarea nouă. Cauza de dimineață era greșită: proiectul se deschide înaintea
primei randări, deci lista nu apare înaintea lui (încetinirea procesorului arătase alt fenomen). Diagnosticul pus în test
(`8323875`, rularea 41189647578) a arătat în bază 146 176 de caractere din 449 186: `test/e2e/cam-node.ts` scria documentul
pe stdout și ieșea imediat (`process.exit(0)`); pe Linux, scrierea într-un pipe e asincronă, iar ieșirea o taie (în WSL:
65 536 din 449 000; fără ieșirea imediată, 449 000; pe Windows, 449 000 în ambele cazuri). Aplicația refuza corect textul
(„nu e JSON”) și pornea un proiect gol, pe care T calcula refuzul. Reparat: ramurile lasă procesul să se termine singur;
`deschide` cere întâi textul JSON întreg (plasa probată cu textul tăiat la 146 176: cade pe loc, cu mărimea lui); diagnosticul
rămâne.
**Confirmat pe Linux:** rularea de noapte pornită de mână pe `3a702c5` (41193300599) e verde (e2e-ul și emulatoarele).

## 2026-10-31 — Fără butonul Test în bară (Model: Claude Opus 5.5)

**Prompt:** „putem elimina si butonul de test din meniu” (în timpul feliei 5.8↑, după arhivarea sesiunii CAM).
**Started:** 31.10, 12:45. **Completed:** 31.10, 13:07. Butonul **Test** iese din extensia barei; codul testului pas cu pas
rămâne întreg (decizia owner-ului din 25.10: devine tutorialul utilizatorilor pe live). Testul se deschide la pornire, la
adresa cu `?test`, tot doar în afara instanței live (precizarea din ADR 0072). Manualul spune adresa (capitolul nu mai acoperă
o ușă: 65 de uși), e2e-ul parcurge testul de la `/?test` (și după reîncărcare), iar proba negativă verifică, cu martorul ei,
că fără `?test` sau pe live bucata panoului nici nu e cerută. Porțile: 7 790 de teste unitare (0 picate), build-ul
determinist, e2e 276 / 276 (pe un build proaspăt: `build-determinist` nu rescrie `dist/`, iar primul e2e a servit build-ul
de dimineață, cu butonul încă în el).
**Publicat pe adresa principală de test:** 31.10, `publica` pe `515a8af` (rularea 41196176380), după rapid-ul verde
(41195559134). Verificat în browserul aplicației la 1440 px: ajutorul din extensie are doar „?”; `/?test` deschide panoul
„Step-by-step test” la pasul 1 / 31, la ~0,6 s după încărcare, fără nicio interacțiune (prima încărcare după actualizare a
durat mai mult: bucățile noi veneau din rețea).

## 2026-10-31 — Rolul de tăiere din panou și traseul la zi (felia 5.8↑) (Model: Claude Opus 5.5)

**Prompt:** „continua cu altceva” (cât rula rularea de noapte a incidentului; felia următoare din plan, cererea owner-ului din
28.10: „o sa vreau sa setam rolurile de taiere inainte sa intru la export g code si sa se faca update si la toolpath”).
**Started:** 31.10, 11:40. **Completed:** 31.10, 14:08. Felia **5.8↑** (ADR 0112), fără agenți, întreruptă de arhivarea
sesiunii CAM și de butonul Test. Panoul de proprietăți are secțiunea **Tăierea**: rolul, adâncimea și pasul, pentru oricâte
forme alese. Rolul e al piesei întregi (`document.rol`): pe o literă cu goluri, exteriorul taie conturul pe afară și golurile pe
dinăuntru, V-carve-ul și buzunarul într-o singură operație (din rândurile exportului rămâneau împărțite: V-carve-ul săpa
literele fără goluri). Freza în V merge doar pe linie și în V-carve (V60 sau plată, cu același diametru, cu numărul unei freze
identice sau cel mai mic liber). Cât e arătat, traseul se calculează din nou singur, după 300 ms fără altă schimbare. Imbricarea
importului e acum o singură judecată, fără biblioteca indexului (`src/geom/imbricare.ts`), ca panoul să nu aducă cavalier.
Porțile: compilatorul (și al funcțiilor), importurile, testele unitare, build-ul determinist (pornirea 97,5, cu ușa 101,0
/ 110 kB; totalul 414,4 / 450; /admin 194,2 / 200), licențele, e2e-ul întreg, emulatoarele. Mutația: fără calculul
pornit de întârziere, trei probe e2e cad. Cinci probe e2e vechi presupuneau traseul „vechi” până la `T`: rescrise.
**Unită peste sugestia din editor** (`116597c`, adusă în `main` de sesiunea sugestiilor cât lucram): conflicte doar în
indexul ADR și în fișă (ambele rânduri păstrate) și numărul ușilor din manual (67, nu 66: ambele părți adăugaseră câte una).
Porțile din nou, pe arborele unit: 7 805 teste unitare, build-ul determinist (pornirea 97,6, cu ușa 101,1 / 110 kB; totalul
414,8 / 450; /admin 196,0 / 200), e2e 282 / 282, emulatoarele (funcțiile și regulile 49, `/admin` 16; fără npm, stricat pe
mașină: `firebase-tools` global, prin node, cu JBR 25).
**Publicat pe adresa principală de test:** 31.10, `publica` pe `4307ea0` (rularea 41203932024), după rapid-ul verde
(41203259410). Verificat în browserul aplicației la 1440 px: un dreptunghi nou are în panou secțiunea **Cutting** (rolul
„outside”, adâncimea 3, pasul 3); cu traseul arătat, rolul „inside” a mutat traseul singur, fără `T` (stins sub „se
calculează”, apoi la zi în ~0,3 s; timpul jobului 52,6 → 50,1 s; în pixelii stratului, rama la 3 mm înăuntru, iar cea de
afară dispărută); anulat la loc, fără erori în consolă.

## 2026-10-31 — V-carve-ul unei piese, o singură regiune (felia 5.8↑b) (Model: Claude Opus 5.5)

**Prompt:** „continua cu altceva” (după „Nu acum” la unirea notei din DEVLOG a sesiunii sugestiilor; patru subsesiuni în
lucru: sugestiile, fonturile variabile, oracolul buzunarului, importul EPS).
**Started:** 31.10, 15:10. **Completed:** 31.10, 15:33. Limita scrisă în ADR 0112 dădea un rezultat greșit: un text cu
operațiile importului (exteriorul, golurile), trecute pe V-carve rând cu rând în fereastra exportului, se săpa în două regiuni
(„O” ca un disc plin). Acum, în lucrare (`src/cam/job.ts`), regiunea V-carve-ului e a contururilor unei piese dintr-o instanță
cu aceleași valori (freza, adâncimea, pasul, sensul, fundul plat), ca buzunarele de aceeași adâncime (ADR 0073); cu valori
diferite, regiunile rămân ale lor (precizarea din ADR 0112, schimbă ADR 0090). Proba a venit întâi și a căzut înainte: inelul
R10 / R6 pe două operații dă exact mișcările unei singure operații. Porțile: compilatorul, importurile, 7 806 teste unitare
(corpusul CAM neschimbat: n-avea V-carve-uri împărțite), build-ul determinist (pornirea 97,6, cu ușa 101,1 / 110 kB; totalul
414,8 → 415,0 / 450), e2e 280 + 2 (două căderi sub încărcarea celor patru sesiuni, trecute rulate singure: 24 / 24),
emulatoarele (49 + 16).
**Publicat pe adresa principală de test:** 31.10, `publica` pe `774afc0` (rularea 41206670061), după rapid-ul verde
(41206099548). Verificat în browserul aplicației la 1440 px: un cerc nou (gaura de 8 mm) trecut pe V-carve din panou
primește freza T2 V60 Ø6, iar traseul calculat singur spune de ce nu se poate („regiunea cere 8.000 mm, iar conul frezei în V
(Ø6, 60°) are 5.196 mm”); cu adâncimea 5 din panou, traseul V-carve vine singur (51 de vârfuri, 54,0 s), fără erori. **Găsit
la verificare:** adâncimea păstrată la schimbarea rolului (ADR 0112 §4) poate trece de conul frezei V60 puse automat; refuzul
e corect și spune ce e de făcut, dar rolul ar putea limita singur adâncimea la con: decizia, la owner.

## 2026-10-31 — Adâncimea V-carve-ului din panou, cel mult conul frezei (felia 5.8↑c) (Model: Claude Opus 5.5)

**Prompt:** „Limitarea” (la întrebarea „Cu ce încep: limitarea adâncimii la V-carve sau reordonarea de mână a operațiilor?”).
**Started:** 31.10, 16:40. **Completed:** 31.10, 17:06. Găsit la verificarea pe test a feliei 5.8↑b: un cerc nou (gaura de 8 mm)
trecut pe V-carve primea freza V60 Ø6, își păstra adâncimea, iar lucrarea îl refuza (conul are 5,196 mm). Acum rolul V-carve
pune adâncimea cel mult cât conul frezei, rotunjită în jos la 0,001 mm (precizarea din ADR 0112, schimbă §4); formula e una
singură, aceeași în lucrare și în rol (`inaltimeConV` în `src/model/document.ts`). Proba a venit întâi și a căzut înainte:
cercul de 8 mm primește 5,196, iar lucrarea îl primește; sub con, adâncimea rămâne; cu vârful plat, conul lui (2,75 la V90 Ø6,
vârful 0,5). Porțile: compilatorul, importurile, 7 807 teste unitare, build-ul determinist (pornirea 97,6, cu ușa 101,1 / 110
kB; totalul 415,3 / 450), e2e 282 / 282, emulatoarele (49 + 16).
**Publicat pe adresa principală de test:** 31.10, `publica` pe `6b84352` (rularea 41213775280), după rapid-ul verde
(41213237840). Verificat în browserul aplicației la 1440 px: cercul nou (gaura de 8 mm), cu traseul arătat, trecut pe V-carve
din panou, primește freza T2 V60 Ø6 și adâncimea 5,196; traseul se calculează singur, fără refuz (54,0 s); anulat la loc, fără
erori în consolă.

## 2026-10-31 — Oracolul independent al buzunarului (felia 5.1↑b) (Model: Claude Opus 5.5)

**Prompt:** brief-ul sesiunii principale, pentru o sesiune paralelă: „Felia **5.1↑b — oracolul independent al buzunarului**, în
CNC Vector Studio 2 (`cncvs2`). `CLAUDE.md` notează o datorie: „Oracolul documentului v11 e scris de sesiunea aplicației, nu
independent: de reluat”. Tu o închizi: ești o sesiune nouă, deci independentă prin construcție.” (urmat de regulile
independenței, proprietățile de judecat, cazurile, ce înseamnă „gata”, porțile și regulile lucrului în paralel).
**Started:** 31.10, 15:05. **Completed:** 31.10, 16:20. Felia **5.1↑b**, fără agenți și fără ADR (nicio decizie schimbată), în
worktree-ul `C:\Users\besli\cncvs2-lucru\oracol-buzunar`, pe `wip/5.1b-oracol-buzunar`. Oracolul `test/oracles/buzunar.ts`,
scris doar din ADR-urile buzunarului, din tipurile documentului și din G-code-ul exportat (fără `src/cam/` și fără probele
vechi), judecă fiecare bucată: pasul pe trecere (un câmp de înălțimi tăiat de tot programul), peretele și insulele (garanția
exactă, prin bisecția pe distanța 1-Lipschitz), acoperirea deschiderii și pasul lateral (inelele la R + k·s, liniile la unghi și
la s), sensul, coborârea, frezele de rest. Proba `test/unit/buzunar.oracol.test.ts`: corpusul CAM (16 bucăți), 13 cazuri pe
hârtie (`test/oracles/buzunar.cazuri.ts`), 4 refuzuri prezise și refuzate de aplicație, 4 sabotaje pe o copie a ieșirii și 14
perechi (fiecare verificare pică pe perechea ei). **Niciun defect al aplicației**; o greșeală a hârtiei mele (δ maxim al L-ului
e la îmbinare, 32(2 − √2), nu 16). Porțile: compilatorul, importurile (17 / 17 capcane, 0 încălcări), 7 810 teste unitare (0
picate, 8 sărite, ca pe `main`), build-ul determinist (214 fișiere identice în două build-uri; totalul 414,9 / 450 față de
414,8 pe `main`, dar bucățile JavaScript sunt identice octet cu octet cu ale lui `main`, construit alături, după ce le scot
numele cu hash: diferă doar numele, deci compresia lor). Fără e2e (nimic din interfață). Nepublicat și neunit: unirea e a
sesiunii principale. Rămâne de reluat partea de ușă a documentului v11–v18 (`test/oracles/document.ts`).

## 2026-10-31 — Importul EPS și AI ≤ 8, cu cititor propriu (felia 9.5↑) (Model: Claude Opus 5.5)

**Prompt:** de la sesiunea principală, într-o subsesiune: „Felia **9.5↑ — importul EPS și AI vechi (≤ 8), cu cititor propriu**,
în CNC Vector Studio 2 (`cncvs2`). Decizia owner-ului din 07.10 (`CLAUDE.md`, „Decizii luate”): „EPS și AI ≤ 8 prin cititor
propriu, limitat”.” Brief-ul: cititorul limitat în `src/io/` (căile, starea grafică, pictarea, operatorii și straturile AI;
buclele și procedurile complicate refuzate cu motiv; textul și imaginile sărite), proba înaintea funcției (corpusul Python,
verificat cu Ghostscript și PyMuPDF), ADR 0115, porțile prin `node`, e2e-ul pe portul 4175, în worktree, fără `main`, fără npm,
fără agenți.
**Started:** 31.10, 15:15. **Completed:** 31.10, 17:27. Felia **9.5↑** (ADR 0115), fără mașină, în worktree-ul
`C:\Users\besli\cncvs2-lucru\import-eps`, ramura `wip/9.5-import-eps`.
- **Ce face:** „Importă SVG / DXF / PDF / AI / EPS…” citește EPS-ul (și cel binar DOS) și AI-ul de dinainte de Illustrator 9.
  Ușa o alege antetul (`formatDupaAntet`): un `.ai` de la Illustrator 9 rămâne la ușa PDF. Cititorul (`src/io/eps.ts`, lexicul
  în `src/io/psLexic.ts`) execută PostScript scris pas cu pas; buclele și condițiile, operatorii lipsă și EPS-urile de la
  Illustrator 9 se refuză cu motivul în fereastră. Un AI ≤ 8 se citește după nume (prologul sărit, operatorii AI, calea
  compusă, straturile ca nume). Desenul stă unde e în fișier, ca la DXF. Refuzul „e PostScript” al ușii PDF a dispărut.
- **Proba întâi:** `test/oracles-py/eps_import_corpus.py` scrie 7 fișiere, le trece prin Ghostscript (local, wasm) și cere ca
  PDF-ul citit cu PyMuPDF să aibă exact subcăile de pe hârtie. CI-ul (jobul `oracol-export2d`) îl rulează din nou, cu `gs` din
  `apt`, și cere fișierele comise, octet cu octet.
- **Găsite de probele țintite** (reparate): `push(...)` cu sute de mii de elemente depășea stiva JavaScript; o sursă de imagine
  necunoscută trecea drept „fără date” (`?? 'nu'` pe `null`); `CS6` cădea în regula „Illustrator 88 e vechi”.
- **Porțile** (prin `node`, fără npm):
  - compilatoarele (`tsconfig.json` și `functions/tsconfig.verificare.json`, cu joncțiunea `functions/node_modules`);
  - `verifica-importuri` (17 reguli, 0 încălcări);
  - testele unitare: 7 840, din care 7 832 trecute, 0 picate, 8 sărite (cu `--test-concurrency=8`; fără el, oracolele grele cad pe memorie, pe mașina asta);
  - build-ul determinist: 215 fișiere identice; pornirea 97,6 (cu ușa 101,1 / 110 kB), totalul 425,0 / 450, /admin 196,0 / 200;
  - licențele;
  - un `vite build` proaspăt și tot e2e-ul pe portul 4175: 283 / 284. Singura căzută e `raportor.spec.ts:101`, care cere
    adresa `http://localhost:4173/` (doar portul).
  - CI-ul ramurii pe `466b288` (rularea 41213957798): verde, cu pasul nou al corpusului EPS pe Ghostscript-ul din `apt`.
- **Mutațiile** (`test/otravuri/9.5.py`): 62 / 62, adică 59 pe probele unitare și 3 prin e2e, pe portul 4175 (straturile AI
  în dialog, operatorul din refuz, `.eps` în fereastra de fișiere). Una a trecut întâi: prologul AI executat (I01),
  echivalentă pe corpus, fiindcă `%%BeginProlog` și `%%BeginProcSet` erau deja secțiuni sărite; proba nouă e un AI 3 cu cod
  în prolog, în afara blocurilor de proceduri. Șapte probe au fost scrise înaintea rundei, din listă.
- **Nepublicat și neunit** (decizia sesiunii principale, cu owner-ul). La unire: conflicte doar de adăugare în `DEVLOG.md`,
  `docs/adr/README.md`, `docs/etape/etapa-03.md`, `CLAUDE.md` și `docs/traduceri/roadmap.en.json` (apoi
  `node scripts/traduceri.ts --verifica`).
