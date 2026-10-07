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
