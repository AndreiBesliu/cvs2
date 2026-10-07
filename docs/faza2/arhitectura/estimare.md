# Estimarea v1, din durate măsurate

**Faza 2, tranșa 2 · 07.10.2026 · estimatorul.** Estimarea e independentă de cele trei propuneri de arhitectură, pe
care nu le-am văzut. Regula proiectului (`CLAUDE.md`): „Estimări din durate măsurate. Dacă o felie depășește estimarea
cu peste 50 %, te oprești și mă întrebi.”

**Ce am citit:** `CLAUDE.md`, `BRIEF.md`, `LECTII.md`, `ACOPERIRE-ARTCAM-DESKPROTO.md`, `DEVLOG.md` (cncvs2), rapoartele
sondelor s1–s8, s11, s12, verificările s1, s3, s6, adminul și prototipul planșelor din `docs/faza2/`, plus
`docs/faza0/00`, `01`–`15` și cronologia `21`–`28`.

**Ce am rulat:** doar citire în git-ul proiectului vechi (`git log`, `git show --numstat`, la HEAD `d850c7b`) și un
calcul Monte Carlo unic, ținut în afara repo-ului (§6, cu toți parametrii, ca să se poată reface).

**Marcaje:** **[măsurat]** = cifră scoasă de mine din git sau din rularea mea; **[citit]** = cifră dintr-un raport sau
document, cu sursa; **[dedus]** = raționamentul meu, nemăsurat.

**Notă pentru repo-ul public:** documentul descrie ritmuri și volume. Nu descrie slăbiciuni ale aplicației vechi.

---

## 0. Pe scurt

1. **v1 are ~311 felii planificate** (suma medianelor, §4) [dedus]. Cu refacerile cerute de plăcile de probă, efortul
   total iese **~396 de felii la P50 și ~559 la P90** [dedus, §6].
2. **Durata, de la 07.10.2026: P50 ≈ 33 de săptămâni** (sfârșitul lui mai 2027), **P80 ≈ 50**, **P90 ≈ 64** (sfârșitul
   lui decembrie 2027) [dedus din măsurat, §6]. Săptămânile includ o etapă 0 (aprobarea planului, evaluarea portării,
   configurarea owner-ului). Nu includ porțile externe: atelierele pentru posturi, CAEN-ul, entitatea juridică (§6.4).
3. **Debitul folosit, scris explicit:** 5,4 zile active pe săptămână [măsurat], 2,5 felii pe zi activă [dedus din
   măsurat], minus o jumătate de zi pe etapă pentru placă și 1,5 felii de refacere pe placă [dedus]. Asta dă
   **~10,75 felii nete pe săptămână la P50**, adică o etapă tipică are **10–11 felii**. La debitul pesimist (P10) sunt
   ~5 felii pe săptămână.
4. **Ce mută rezultatul cu peste 20 %:** zilele active pe săptămână (5,4 → 4,0: +47 %), feliile pe zi (2,5 → 1,8: +45 %;
   2,5 → 3,3: −26 %), mărimea totală (× 1,3: +29 %) și articolele grele, dacă toate ies ca incrustația din ediția
   întâi (+21 %). Deciziile deschise (EPS, GPU, Rust, planșele A sau D) mută fiecare sub 3 % (§7).
5. **Recalibrarea:** după primele două etape, debitul și mărimile se înlocuiesc cu cele măsurate, după formula din §8.
   Primele două etape trebuie să conțină un articol greu (R3), unul mediu care se termină pe placă și prima placă.

---

## 1. Debitul ediției întâi, măsurat

### 1.1 Zile active pe săptămână

O zi activă = o zi cu cel puțin un commit pe `main` [măsurat: `git log` la `d850c7b`]:

| Săptămâna | W22 | W23 | W24 | W25 | W26 | W27 | W28 | W29 | W30 | W31 | W32 | W33 | W34 | W35 | W36 | W37 | W38 | W39 | W40 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Zile active | 2 | 7 | 7 | 5 | 3 | 7 | 6 | **0** | 2 | 5 | 4 | 7 | 6 | 6 | 7 | 7 | 7 | 7 | 2 |
| Commit-uri | 52 | 155 | 110 | 35 | 15 | 89 | 26 | 0 | 19 | 34 | 17 | 40 | 21 | 40 | 86 | 70 | 137 | 60 | 3 |

- **97 de zile active în 127 de zile calendaristice** (30.05–03.10), adică **5,35 pe săptămână** [măsurat; aceeași cifră
  în `docs/faza0/00`].
- Cel mai bun interval: W33–W39, **6,7 pe săptămână** [măsurat].
- Cel mai slab interval lung: W25–W32, **4,0 pe săptămână**, cu pauza de 12 zile din W29 inclusă [măsurat].
- Cifra îl include pe owner așa cum e: cu celelalte proiecte ale lui și cu pauzele. De aceea o folosesc direct.

### 1.2 Perioadele, cu cifrele lor

Feliile de produs sunt commit-urile care nu sunt doar de jurnal sau registru. Liniile adăugate sunt numărate cu
`--numstat`; fișierul temporar `.tmp-ops.cjs` e scos [măsurat]. Caracterul perioadelor vine din cronologie
(`docs/faza0/21`–`28`) [citit].

| Perioada | Cum a fost | Zile active | Commit-uri de produs | Pe zi activă | `src` pe zi | Teste / `src` | Jurnal / `src` |
|---|---|---:|---:|---:|---:|---:|---:|
| P1 · 30.05–12.06 | viteză fără plasă, deploy pe producție la fiecare sarcină | 14 | 287 | 20,5 | 2 552 | 0,10 | 0,09 |
| P2 · 13.06–12.07 | lățime: admin, credite, mobil, simulare refăcută de 6 ori | 23 | 185 | 8,0 | 814 | 0,36 | 0,07 |
| P3 · 25.07–13.08 | reluarea, primele porți (include artefactul `git add -A` din W30) | 15 | 77 | 5,1 | 2 524 | 0,98 | 0,13 |
| **P4 · 14.08–06.09** | **august: dovada adăugată după, recenzii adversariale** | **22** | **152** | **6,9** | **1 322** | **1,58** | 0,51 |
| P5 · 07.09–23.09 | „continua”: aproape numai corecturi | 17 | 170 | 10,0 | 544 | 2,54 | 1,30 |
| **P6 · 24–25.09** | **„o felie per defect”, cele mai ordonate zile** | **2** | **16** (17 cu manualul) | **8,0** | **1 041** | **2,18** | 0,96 |
| **P7 · 26.09–03.10** | **incrustația, cu oracolul înainte** | **4** | **6** | 1,5 | **1 039** | **1,67** | 0,16 |
| Tot proiectul | | 97 | 893 | 9,2 | 1 411 | 0,93 | 0,29 |

Ce spune tabelul:
- **Cu dovada făcută serios (P4, P6, P7), produsul a crescut cu 1 040–1 320 de linii pe zi activă**, iar testele cu
  1,6–2,2 linii la fiecare linie de produs [măsurat]. Trei perioade diferite cad în aceeași bandă.
- **Viteza din iunie (20,5 commit-uri pe zi) nu e un reper.** Fiecare sarcină era mică și mergea direct pe producție.
  Fundațiile puse atunci au devenit în august un program de 32 + 112 constatări (`docs/faza0/21` §6) [citit].
- **P5 arată cum arată procesul degradat:** 544 de linii pe zi, iar jurnalul a depășit produsul (1,30). Singura
  capabilitate nouă vizibilă din 07–14.09 a fost un panou (`docs/faza0/26` §1) [citit].

### 1.3 Cât a durat o felie făcută cu probă

**P6, 24–25.09 (o felie per defect, fiecare cu proba pe hârtie și commit-ul ei)** [măsurat]:
- 17 felii (16 de cod și actualizarea manualului): 10 pe 24.09 între 15:58 și 22:04, apoi 7 pe 25.09 între 08:41 și
  11:50. În medie **~35 de minute pe felie**.
- Mărimea unei felii: mediana **114 linii de produs și 243 de linii de teste**.
- Dar diagnosticul era deja făcut: auditul din 16.09, reverificat pe 24.09 cu 20 de agenți și 4,7 M tokeni
  (`docs/faza0/28` §2.13) [citit]. Ritmul ăsta e plafonul pentru reparații mici, nu pentru funcții noi.

**P4, august (funcții noi, dovada după):**
- 14–19.08: 31 de intrări în jurnal, dintre care **12 re-treceri** (respingere, reparație, corectură). Deci **1,63 treceri
  pe felie** (`docs/faza0/23` §1) [citit].
- 20–26.08: ~35 de intrări, **8 verdicte REJECT**, 23 de verificări independente (`docs/faza0/24` §1) [citit].
- Lanțul de relief din 24–26.08: **7 commit-uri, 5 respinse** la prima trecere (`docs/faza0/24` §2) [citit].
- Socoteala mea: 152 de commit-uri de produs ÷ 1,63 = **~93 de felii la prima trecere în 22 de zile active, 4,2 pe
  zi**, de ~312 linii de produs fiecare, cu refacerea lor [dedus din măsurat].

**P7, incrustația (funcție fizică grea, cu oracolul înainte):**
- 4 runde de recenzie în 4 zile active. Fiecare rundă a găsit **11, 10, 17, apoi 15 defecte reale**; otrăvurile au
  urcat de la 35 la 147 (`docs/faza0/28` §2.21) [citit].
- Felia **n-a convers**: decuparea dopului a rămas pe o ramură WIP, „neterminat, poarta nerulată” [măsurat: `f4732ff`].
- Commit-urile de produs au avut 850–1 110 linii de `src` și 920–1 850 de linii de teste fiecare [măsurat].

**Ce a costat aceeași funcție în ediția întâi** (reperele folosite la mărimi, §4) [citit, `docs/faza0/01`–`15`]:

| Zona | Ce a cerut în ediția întâi |
|---|---|
| Pânza | `PixiCanvas` de 4 123 de linii, 134 de commit-uri; redesen la 60 Hz timp de 78 de zile (02) |
| Nucleul geometric | planul spunea 10–14 săptămâni; pașii 0–4 în 3 zile, urmați de 32 + 112 constatări (01, 21) |
| Textul | 1 din 5 felii ale planului livrată; „20 mm” dădea 14,61 mm timp de 3,5 luni (02) |
| Importul | parserii 2 272 de linii; stratul defensiv 781 de linii + 2 490 de teste (08) |
| Trasarea | 3 043 de linii; 7 runde în 3 zile ca să meargă pe fișierul owner-ului (08) |
| CAM 2D | funcțiile din iunie în commit-uri de 109–226 de linii; reparațiile din septembrie de 390–2 912 linii fiecare (03) |
| Relieful | intrat cu 174 de linii; ~4 000 de linii în 14–19.08; apoi lanțul cu 5 din 7 respinse (04, 23, 24) |
| Exportul și postul | 7 839 de linii, 5 emitenți de G-code, 1 dialect din 12 cu sursă (06) |
| Mașina | 12 536 de linii + ~9 570 de teste; prima rulare pe fier după 8 săptămâni (07) |
| Persistența | 6 720 de linii; sincronizarea bibliotecii: 12 commit-uri în 18 zile (09) |
| Interfața și i18n | 117 componente, 26 870 de linii, 18 reorganizări; i18n retrofitat în ziua 6 (12, 21) |
| Planșele | 99 de commit-uri, 9 653 de linii, 4 migrări de schemă în 9 săptămâni (14) |
| Porțile | bancul ~7 100 de linii și 49 de commit-uri; publicarea ~3 000 de linii, retrofitată (11, 12) |
| Adminul | ~3 500 de linii, 36 de commit-uri (`docs/faza2/admin` §5.2) |

### 1.4 Multiplicatorul dovezii

- Teste la o linie de produs [măsurat, tabelul 1.2]: iunie 0,10 → august 1,58 → septembrie 2,54. În perioadele cu
  dovada înainte: 2,18 (P6) și 1,67 (P7).
- Ieșirea totală pe zi activă (produs + teste + jurnal) a stat la **3 000–4 700 de linii** [măsurat: P4 4 248, P6 4 659,
  P7 3 043, P5 2 792]. Ce s-a schimbat între perioade a fost **cât din ea era produs**: 31 % în P4, 22 % în P6, 19 % în
  P5.
- În ediția a doua jurnalul trebuie să fie scurt (`LECTII.md` §4.13). Cu teste ~2,0 × și jurnal ~0,1 ×, aceeași ieșire
  totală ar lăsa ~1 270 de linii de produs pe zi [dedus]. Adică tot banda de mai sus: cifra nu se schimbă mult.

### 1.5 Ce nu era debit

- Rescrierea în `src` a fost de 12–19 % pe săptămână; 33 % din `src` erau comentarii (`docs/faza0/00`, `12`) [citit].
- 35 din 97 de commit-uri din 14–19.09 au fost numai de jurnal (`docs/faza0/27` §1) [citit].
- Funcțiile construite în iunie, în commit-uri de 109–226 de linii, au fost reparate în septembrie cu commit-uri de
  390–2 912 linii fiecare [citit, 03].

---

## 2. Debitul procesului nou (Fazele 0–2), măsurat

Din `DEVLOG.md` al cncvs2 [citit]:

| Tranșa | Agenți | Tokeni (estimat) | Durată (estimat) | Abaterea duratei |
|---|---:|---|---|---|
| Faza 0 (module, planșe, cronologie, critici) | 31 | 10,3 M (8 M) | ~51 min de workflow (1,5–2 h) | mai repede; sinteza nu e inclusă |
| Faza 2, tranșa 1 (10 sonde) | 10 | 4,19 M (~6 M) | 80 min (60–75) | **+7 %** peste capătul de sus |
| Faza 2, tranșa 1b (3 verificări + 2 sonde) | 5 | 2,18 M (2,2 M) | 87 min (45–60) | **+45 %** peste capătul de sus |

Și două fapte de calitate:
- **Toate cele 10 sonde s-au reprodus** când le-am rulat serial, pe mașina liberă [citit, DEVLOG 07.10].
- **Toate cele 3 sonde verificate adversarial au avut cel puțin o afirmație decisivă infirmată** [citit]:
  - s1: robustețea offsetului (47/240 eșecuri pe polilinii dense) și remediul pentru PathKit;
  - s3: pasul `h = 0,05` (cifrele-titlu erau la 0,02), scalarea legalizării, incrustația fără adâncime de start;
  - s6: metoda măsura rasterul software.

**Ce se transferă la feliile de produs:**
- mărimea erorii mele de estimare: ±30–45 % pe unități de lucru noi;
- rata de corecturi la prima trecere: mare. Se potrivește cu cele 1,63 treceri pe felie din august.

**Ce nu se transferă:** viteza. Sondele sunt cod aruncabil, fără interfață, i18n, CI, persistență, încercarea
owner-ului sau placă. Au rulat în paralel, câte 10. Feliile de produs merg aproape în serie pe același arbore: în
ediția întâi, sesiunile paralele pe același arbore au produs pagube (`docs/faza0/23` §2) [citit].

---

## 3. Unitatea: felia, și ritmul ei

**Felia** = ceva ce owner-ul poate încerca, cu commit-ul ei și cu proba ei: oracolul înaintea funcției, valori pe
hârtie, invariantele fixe, otrăvuri țintite pe modulele critice, textele în en + ro. **Ca mărime, e o felie de produs
din august: ~300 de linii de produs cu refacerea ei, plus 1,6–2,2 linii de teste pe linie** [dedus din §1.3].

**Ritmul la P50: 2,5 felii pe zi activă** [dedus din măsurat]. Cum l-am ales:
- În august s-au făcut ~93 de felii la prima trecere în 22 de zile active, adică 4,2 pe zi. Dar septembrie (17 zile
  active) s-a dus aproape tot pe repararea lor. **Cu reparația socotită: 93 ÷ 39 = 2,4 felii pe zi** [dedus din
  măsurat].
- Perioadele cu dovada înainte (P6, P7) au avut 1 040 de linii de produs pe zi, adică ~3,3 felii de mărimea din august.
  Dar P6 avea diagnosticul gata, iar P7 n-a convers.
- Iau **2,5**, între 2,4 și 3,3. Pesimist (P10): **1,8**, la jumătatea drumului (geometric) spre ritmul degradat din
  septembrie (~1,3).

**Zilele active pe săptămână:** P50 **5,4** [măsurat, §1.1]. Pesimist (P10): **4,0**, media din W25–W32 [măsurat].

**Costul fix al etapei**, care în ediția întâi nu exista [dedus]:
- **0,5 zile active pe etapă** pentru placă: cotele date dinainte, valorile pe hârtie, transcrierea de pe mașină trecută
  în teste;
- **1,5 felii de refacere pe placă** (P90: 3). Reperul: singura sesiune pe fier din ediția întâi (08.08) a scos cel puțin
  5 defecte de mașină (`docs/faza0/22` §2) [citit], iar auditul din 16.09 a găsit 4 defecte fizice din 10 constatări
  (`LECTII.md` §0) [citit].

**Clasele de risc, cu multiplicatorul lor la P90** [dedus, ancorat în măsurat]:

| Clasa | Ce e | P90 / P50 | Ancora |
|---|---|---:|---|
| **R1** | algoritm cunoscut, măsurat de sondă, bibliotecă aleasă | **× 1,3** | P6: felii fără re-treceri; eroarea mea de durată, +7 % în tranșa 1 |
| **R2** | măsurat parțial, sau partea care era parțială sau defectă în ediția întâi | **× 1,6** | 1,63 treceri pe felie în august |
| **R3** | neprobat, multe cazuri-limită sau fizică grea | **× 2,2** | lanțul de relief: 5 din 7 respinse; incrustația: 4 runde, neterminată; plus +45 % eroarea mea de durată |

---

## 4. Mărimea v1, articol cu articol

Coloana **Placă**: „da” = funcția mișcă mașina și se probează pe placa etapei ei (`BRIEF.md` §6). Sursele scurte:
`s1-V` = `sonde/s1-geometrie/VERIFICARE.md`; `03` = `docs/faza0/03-…`; „ed. 1” = ediția întâi.

### 4.1 Infrastructura și fundația (64 de felii)

| # | Articolul | Felii P50 | Clasa | Placă | De ce |
|---|---|---:|---|---|---|
| I1 | Scheletul, CI verde pe fiecare push (și pe `scripts/`), build determinist, configul citit de la gazdă, `.gitattributes`, cârligul împotriva `git add -A`, CSP fără `unsafe-eval` | 2 | R1 | — | ieftine doar din ziua 1; retrofitate, au costat ~3 000 de linii și 18 commit-uri (`LECTII.md` §6) |
| I2 | i18n en + ro prin `t()`, cu paritatea verificată de compilator, pluralele, ErrorBoundary | 1 | R1 | — | ed. 1: retrofitat în ziua 6, 11 intrări, „COMPLETE” fals (21 §2) |
| I3 | Schema în valibot, ușa unică de încărcare, migrări pure, JSON canonic | 2 | R1 | — | s7: 10/10 defecte prinse, 3,3 KB gzip |
| I4 | Persistența: IndexedDB + OPFS cu resurse după hash, scriitor unic, `.cncvs` ca zip determinist, curățenia | 3 | R2 | — | s7 măsurat; două file și cota sunt neprobate (s7 §6) |
| I5 | Undo ca jurnal de comenzi | 1 | R1 | — | s7: ~190 de octeți pe comandă |
| I6 | Stratul de acțiuni + plasa de importuri | 2 | R2 | — | n-a existat în ed. 1 (`LECTII.md` §2.2, clasa 3) |
| I7 | Pânza hibridă: vectorii exacți desenați în worker pe pânză software și predați ca ImageBitmap; traseele în WebGL2 (instanțiate sau LINE_STRIP); stratul de interacțiune; vederea unică; DPR; Pointer Events; flatbush; evenodd | 4 | R2 | — | s6 + VERIFICARE măsurate; laptopul slab nemăsurat; ed. 1: 4 123 de linii, 134 de commit-uri (02) |
| I8 | Uneltele ca mașini de stare pure (selecție, transformare, noduri), cu script de pointer | 3 | R2 | — | ed. 1: 14 unelte într-o singură clasă (02 §1) |
| I9 | Pool de workere: transfer pe benzi cu halo, anulare, worker de geometrie cu WASM | 2 | R1 | — | s11: identic bit cu bit, × 1,10–1,23 |
| I10a | Nucleul geometric: model L/A/C cu bulge, transformări exacte, biarce, biblioteca de oracole | 4 | R2 | — | s1, s1-V |
| I10b | Adaptorul PathKit cu re-ancorarea R3 după fiecare operație și reunirea arcelor co-circulare | 2 | R2 | — | R3 măsurat: 3,3e-13 mm după 100 de operații (s1-V §4.6) |
| I10c | cavalier adus în repo, cu reparațiile din Rust 0.8/0.9, testul „paralele” reparat și suita de verificare în CI | 3 | **R3** | — | „2–4 zile” [dedus în s1-V §5.1]; 47/240 eșecuri pe polilinii dense |
| I10d | Gărzile: curățarea intrării, validarea de structură a ieșirii, rezoluția declarată de 0,01 mm | 2 | R2 | — | propuse, neprobate (s1-V §6) |
| I11 | IR-ul traseului + postul unic cu contracte de dialect ca date + formatorul de numere + garda de arc + cititorul de G-code ca oracol | 3 | R2 | prin B | s8; ed. 1: 5 emitenți, 1 dialect din 12 cu sursă (06) |
| I12 | Nucleul de simulare pe CPU (atlas de dale, determinism, profil pe rampă, elice exactă) + oracolul cu zero importuri + corpusul pe hârtie + otrăvurile + poarta invariantelor pe orice program | 5 | R2 | — | s4 a măsurat nucleul; atlasul, rampa și elicea cu bilă / V nu (s4 §6); ed. 1: 4 motoare, niciunul oracol (05) |
| I13 | Firebase: exportul Firestore, lista funcțiilor de șters arătată owner-ului, pipeline-ul spre test, App Check egal peste tot, token de debug doar pe test | 2 | R2 | — | admin §5.3; ed. 1: configurarea App Check a cerut mai multe zile de diagnostic (22, 25) |
| I14 | Conturi + sistemul de capabilități din ziua 1 + dreptul de acces calculat pe server + proba de 14 zile | 3 | R2 | — | `BRIEF.md` §4; registrul probei e candidat la portare |
| I15 | Stripe în modul test: catalog unic, prețuri pe listă albă pe server, webhook, checkout, portal, plăți eșuate | 3 | R2 | — | ed. 1: prețurile în 4 copii (`LECTII.md` §1) |
| I16 | Cloud: proiecte și biblioteci partajate, blocate pe server (**de confirmat**: nu e rând de prag) | 3 | R2 | — | `BRIEF.md` §4 le numește ca blocate pe server; ed. 1: sincronizarea, 12 commit-uri în 18 zile (09) |
| I17 | Site-ul, Termenii, confidențialitatea, e-mailul tranzacțional | 2 | R1 | — | `BRIEF.md` §7–§8 |
| I18 | Bancul vizual (poza + cifra) + unealta de mutații, comisă | 3 | R2 | — | ed. 1: bancul a raportat verde pe sabotaje de 3 ori (12) |
| I19 | Învelișul interfeței: panouri, un singur câmp numeric, proprietăți, proiecte, setări, temă | 5 | R2 | — | ed. 1: 18 reorganizări în 4 luni, 7 câmpuri numerice |
| I20 | Montajul: materialul, originea ca obiect, o singură matrice document → mașină | 2 | R2 | da | ed. 1: originea oglindită 112 zile (03, 06) |
| I21 | Pre-flight + plafoane pe artefact (document și program) | 2 | R1 | — | metoda din ed. 1 a mers (`LECTII.md` §3.1) |

### 4.2 A. Proiectare 2D: 11 rânduri, 60 de felii

| Rândul | Felii P50 | Clasa | Placă | De ce |
|---|---:|---|---|---|
| A1 Vectori, noduri, boolean, offset, aliniere (uneltele de desen, editarea nodurilor pe L/A/C, UI-ul de boolean și offset cu îmbinări miter / teșite, alinierea, acroșajul) | 8 | R2 | — | nucleul e în I10; tragerea nodului pe arc și îmbinările miter sunt neprobate (s1 §6); ed. 1: pasul 5 a avut 9 felii (02) |
| A2 Text, text pe cale, fonturi (înălțimea = majuscula, rânduri, text pe cale editabil, fonturi single-line, reuniunea glifelor suprapuse) | 5 | R2 | — | s2: înălțimea măsurată exact; s3: Roboto v3 are 41/65 de glife suprapuse; ed. 1: 1 din 5 felii ale planului |
| A3 Verificarea și repararea vectorilor | 3 | R2 | — | același modul cu gărzile s1-V și vindecarea din s3-V |
| A4 Import: DXF 2 (R1), SVG 1 (R1), PDF / AI compatibil PDF 1 (R1), stratul defensiv + dialogul 3 (R1), **EPS 6 (R3)**, AI ≤ 8 1 (R3), WMF / EMF 2 (R2); DWG doar mesaj | 16 | mixt | — | s2: 65/65; s12: EPS „2–3 săptămâni” [dedus], poarta ≥ 80 % din corpusul owner-ului; ed. 1: stratul defensiv 781 + 2 490 de linii (08) |
| A5 Export cu vectori reali: DXF R2007 exact + R12 compatibil, SVG, PDF cu straturi, EPS; oracolul Python în CI; pachetul pentru owner | 5 | R1 | — | s2: 108/108 cu cititori independenți |
| A6 Cote | 3 | R2 | — | nici sondă, nici precedent în ed. 1 |
| A7 Deformare în anvelopă (vectori și relief) | 3 | **R3** | — | neprobat; ieșirea trebuie să rămână curbe sub o toleranță declarată |
| A8 Trasare din imagine | 3 | R2 | — | algoritm „bun” în ed. 1, candidat la portare; 7 runde pe fișierul owner-ului; dependența AGPL de înlocuit (08) |
| A10 Foi + Multi-Plate (modelul D): piese, instanțe, așezarea pe rânduri cu surplusul pe foaia următoare, mutarea între foi, câmpuri CSV pe instanță, fața de jos cu știfturi, rama cu inele și ancore | 8 | R2 | — | prototipul: 122 de verificări, 6 sabotaje; ed. 1: 99 de commit-uri, 4 migrări (14) |
| A13 Transformare și copiere (inclusiv înclinarea, rețelele, copierea de-a lungul unei curbe) | 3 | R1 | — | transformările exacte, măsurate în s1 |
| A14 Tăiere și conversie (taie cu o linie, decupare la contur, arce din curbe, netezire, conversie în cerc / dreptunghi) | 3 | R2 | — | ed. 1: Divide ștergea 37,9 %, netezirea deforma 7,53 % (01, 23) |

### 4.3 B. Prelucrare 2D / 2.5D: 14 rânduri, 50 de felii

| Rândul | Felii P50 | Clasa | Placă | De ce |
|---|---:|---|---|---|
| B1 Profil, urechi Z(s), lead față de regiunea păstrată, sensul, rampele | 5 | R2 | da | candidați la portare (88 de verificări pe hârtie, 594 de variante); ed. 1: 113–114 zile de defect ascuns (03) |
| B2 Dog-bone / T-bone | 2 | R1 | da | geometrie simplă peste offset |
| B3 Buzunar cu mai multe freze (offset pe `Shape`, legare, intrare pe rampă sau elice, rest) | 5 | R2 | da | s1-V: 32/32 de buzunare pe glife; ed. 1: doar concentric, fără rest (03) |
| B4 V-carve pe axa medială (fund plat, vindecarea intrării, `h` adaptiv, legalizare pe stivă, potrivire de arce) | 6 | R2 | da | s3 + s3-V; ed. 1: stivă de inele, 161 842 de linii pe plăcuța de 6 mm |
| B5 Găurire (inclusiv elicoidală) | 2 | R1 | da | s4: elicea plată exactă |
| B6 Ordinea operațiilor, un fișier pe sculă | 2 | R1 | — | s8: contractul de schimbare a sculei |
| B7 Gravare pe linie + smart engrave | 3 | R2 | da | smart engrave doar descris în s3 |
| B8 Incrustație în V + cu pereți drepți (simplă / în trepte) | 6 | **R3** | da (2) | s3-V: lipsea adâncimea de start; ed. 1: 4 runde, neterminată (28) |
| B9 Caneluri împletite, bevel carving, Raised Round | 5 | **R3** | da | nimic probat |
| B10 Freze de profil desenate + roundover | 3 | R2 | da | `BitProfile` din ed. 1: martor bit-exact, 186 de siluete |
| B11 Transformarea traseelor calculate | 2 | R1 | — | transformări pe IR |
| B12 Textură din forma frezei | 2 | R2 | da | neprobat, geometrie simplă |
| B13 Ghilotină + găurire cu mai multe burghie | 3 | R2 | da (ghilotina) | owner-ul n-are drillbank: se probează în simulare și în post |
| B14 Laser: tăiere / gravare + laser 3D în felii pe Z | 4 | **R3** | ? | nimic probat; **întrebare**: are owner-ul un laser pentru placa etapei? |

### 4.4 C. Relief: 24 de rânduri, 48 de felii

| Rândul | Felii P50 | Clasa | Placă | De ce |
|---|---:|---|---|---|
| C0 Stratul de relief: Float32 pe dale de 256², rar, stocare Uint16, undo cu copiere la scriere, oglinda pe GPU, LOD pentru 3D (fundația rândurilor C) | 3 | R2 | — | s5: dalele „neconstruite”, Uint16 măsurat |
| C1 Relief din imagine · C2 alinierea pixelilor · C3 litofanie | 1 + 1 + 1 | R1 | C3 da | operații locale, ieftine (s5) |
| C4 Editorul de forme | 3 | R2 | — | din curbele exacte (s5 §5.8) |
| C5 Combinarea reliefurilor | 1 | R1 | — | s5: 13–15 ms pe tot relieful |
| C6 Extrudare pe cale | 2 | **R3** | — | riscul nr. 2 din s5 |
| C7 Two Rail Sweep, Spin, Turn | 3 | **R3** | — | riscul nr. 2 din s5 |
| C8 Relief din text | 1 | R1 | — | A2 + C4 |
| C9 Operații (scalare, negativ, offset, netezire, limită, plan înclinat) | 2 | R1 | — | riscul mic din s5 |
| C10 Estompare și pante | 2 | R2 | — | riscul mic din s5 |
| C11 Conturul vectorial al reliefului, tăiere după culoare, baghetă | 2 | R2 | — | raster → vector cu toleranță declarată |
| C12 Export STL / OBJ cu toleranță | 2 | **R3** | — | s5: 4000² dă 1,6 GB, deci cere decimare |
| C13 Rezoluția 4000², fluidă | 1 | R2 | — | iGPU nemăsurat (s5 §6) |
| C14 Îmbinări (contour blend, 3D blend, mirror-merge, relief pe vector, cookie cutter) | 3 | R2 | — | neprobat |
| C15 Straturi bitmap, forme ridicate din culori | 2 | R2 | — | neprobat |
| C16 Sculptare | 3 | **R3** | — | riscul nr. 4 din s5: undo-ul pe dale |
| C17 Straturile de relief | 1 | R1 | — | peste C0 |
| C18 Relief pe două fețe + întoarcere | 3 | R2 | da | fața de jos e a foii în modelul D (prototipul §5) |
| C19 Bas-relief din STL, siluetă | 3 | **R3** | — | s5: 6,8 s, dar judecata artistică e a owner-ului |
| C20 Texturi, flux, țesătură | 3 | **R3** | — | neprobat |
| C21 Analiză · C22 imagine gri pe 16 biți, simularea ca strat · C23 suprafață, volum, greutate | 1 + 1 + 1 | R1 | — | operații directe pe dale |
| C24 Biblioteca de clipart de relief | 2 | R2 | — | mecanica; **conținutul e o întrebare** (cine îl face?) |

### 4.5 D. Prelucrare 3D: 10 rânduri, 24 de felii

| Rândul | Felii P50 | Clasa | Placă | De ce |
|---|---:|---|---|---|
| D1 Import 3D (STL, OBJ, 3MF, 3DS, VRML, DXF 3D) + poziționare | 4 | R2 | — | ed. 1: un STL cu exponent negativ importa alt model (25 §3) |
| D3 Degroșare 3D | 3 | R2 | da | s5: câmpul conservativ, 0 scobituri; ed. 1: tăia sub model în 87/120 de configurații |
| D4 Finisare paralelă | 3 | R2 | da | s5: distanța la segment; pe CPU, 2,2 s pe 16 workere |
| D5 Animația traseului | 2 | R1 | — | s4 + s6 |
| D6 Timpul estimat + rezumatul jobului | 2 | R2 | — | ed. 1: autoconsistent, niciodată comparat cu cronometrul; placa dă timpul real |
| D10 Zone | 3 | R2 | — | neprobat |
| D13 Coliziunea cu mandrina și cu motorul | 2 | R2 | — | s5: al doilea profil peste același câmp [dedus] |
| D14 Zone inaccesibile | 1 | R1 | — | — |
| D15 Decupare 3D | 2 | R2 | da | — |
| D18 Model înalt, din felii | 2 | R2 | da | — |

### 4.6 F. Producție și interfață: 6 rânduri, 22 de felii

| Rândul | Felii P50 | Clasa | Placă | De ce |
|---|---:|---|---|---|
| F1 Simularea 3D (afișare, fereastră fină, comparația cu modelul) | 3 | R2 | — | nucleul e în I12 |
| F2 Biblioteca de freze + `.tdb` + materiale și avansuri | 4 | R2 | — | `.tdb` „bun pe corpusul owner-ului”; tabelul de avansuri fără sursă (`LECTII.md` §1) |
| F3 Senderul GRBL: sesiune cu tranzacții, flux cu numărare de caractere, plafonul de 70 de octeți, bariera M6, jog, WCS, `$$`, homing, palpare Z, reluare, octeții exacți cu hash | 8 | **R3** | da | ed. 1: 4 defecte critice în reluare și în măsurarea cursei, după 21 de commit-uri pe live într-o zi (07, 25) |
| F4 Calcul pe mai multe fire (rândul însuși) | 1 | R1 | — | infrastructura e în I9 |
| F5 Șabloane de operații + calcul în lot | 2 | R2 | — | — |
| F6 Două interfețe: asistentul pas cu pas + interfața completă | 4 | R2 | — | neprobat; munca de interfață e cea mai reorganizată în ed. 1 |

### 4.7 Cele 8 funcții din `BRIEF.md` §10: 14 felii

| Funcția | Felii P50 | Clasa | Placă |
|---|---:|---|---|
| Lista de tăiere pe mai multe plăci | 2 | R1 | — |
| Fișa de lucru tipărită, cu setările controlerului (s8 §5.10) | 2 | R1 | — |
| Senzorul de lungime la schimbarea frezei, cu M6 ca barieră | 2 | R2 | da |
| Găsirea colțului XY prin palpare | 2 | R2 | da |
| Override de avans și turație + jurnalul de rulare | 2 | R2 | da |
| Planarea plăcii de sacrificiu (algoritm „bun” în ed. 1) | 1 | R1 | da |
| Găurire în pași, desfăcută în G0 / G1 (s8 §5.9) | 1 | R1 | da |
| Ghidul la prima pornire | 2 | R2 | — |

### 4.8 Adminul (`BRIEF.md` §16.1): 15 felii

P0 erorile și diagnoza (3) · P1 publicarea cu aprobare și backup-ul cu alarmă (1–2) · P2 utilizatorii, rolurile,
auditul (3–4) · P2+ tichetele, configurarea, panoul de publicare (2–3) · P3 veniturile (1–2) · P4 analiza, CAM-ul și
trecerea fiecărei file pe test (2–3). Total **12–17** [dedus în `docs/faza2/admin` §5.2]; iau **15**, clasa R2.

### 4.9 Lansarea (`BRIEF.md` §8): 14 felii

| Ce | Felii P50 | Clasa | Placă |
|---|---:|---|---|
| Pachetul de probă pentru ateliere (s8, Anexa B) + rundele NcStudio, RichAuto / Syntec (2 runde), Mach3 / Mach4 + transcrierile trecute în teste | 6 | R2 | atelier |
| Testul cu un străin dintr-un atelier, plus reparațiile lui | 3 | **R3** | — |
| Stripe live, după CAEN | 1 | R1 | — |
| Auditul final en + ro și partea juridică | 1 | R1 | — |
| Întărirea: laptopul slab, memoria, actualizarea PWA cât mașina taie, două file | 3 | R2 | — |

### 4.10 Totalul

| Grupa | Felii P50 | Suma P90 pe articole |
|---|---:|---:|
| Infrastructura și fundația | 64 | 101 |
| A. Proiectare 2D | 60 | 98 |
| B. Prelucrare 2D / 2.5D | 50 | 87 |
| C. Relief | 48 | 83 |
| D. Prelucrare 3D | 24 | 38 |
| F. Producție și interfață | 22 | 40 |
| Funcțiile din §10 | 14 | 21 |
| Adminul | 15 | 24 |
| Lansarea | 14 | 24 |
| **Total** | **311** | **513** |

- Pe clase: R1 = 58, R2 = 198, R3 = 55 de felii.
- „Suma P90 pe articole” presupune că toate articolele ies prost deodată. P90 al sumei, din simulare, e **446** (§6).
- **Cu placă: 78 de felii** (74 fără laser), pe ~25 de funcții care mișcă mașina. O placă cu 5–10 cote poate proba 2–4 funcții, deci
  minimum ~8–9 plăci. Etapele sunt mai multe (§6), deci cadența plăcilor nu e restricția. Restricția e ordinea: fiecare
  etapă care atinge o funcție de mașină se termină cu o placă ce o conține.
- Comparația cu planul din PDF: 93–138 de felii pentru v1-ul inițial și 188–273 pentru tot drumul (`BRIEF.md` §1,
  §11) [citit]. Noul v1 trece de cifra pentru tot drumul, cum anticipa `BRIEF.md` §11.

---

## 5. Cele nouă puncte deschise: poziția mea și efectul pe estimare

| # | Punctul | Poziția (cu dovada) | Efectul |
|---|---|---|---|
| 1 | Regula de umplere | **evenodd pentru document, decisă o dată** (ecran, clic, sculă), fiindcă orientarea din DXF / SVG e arbitrară: cu nonzero, 757 din 4 000 de puncte diferă (s6). **Fonturile se normalizează la intrare:** reuniune nonzero pe fiecare glifă, apoi contururi simple. Altfel cele 41 de glife suprapuse din 65 (Roboto v3, s3) ar ieși cu găuri. SVG-ul cu `fill-rule` declarat se convertește la import. Nu e întrebare pentru owner | inclus în A2 și A4 (+1) |
| 2 | Arcul eliptic | **s1 câștigă**: calea are L / A / C. Elipsa și arcul de elipsă de sine stătătoare devin formă parametrică, exportată exact ca ELLIPSE (cum vrea s2). Arcul eliptic din interiorul unei căi devine cubice sub toleranță: 8 la 0,001 mm până la r = 50, 16 până la r = 1 220 (s1 T5). Ca primitivă a patra ar trece prin offset, boolean, biarce, hit-test și acroșaj, iar CNC-ul n-are mișcare eliptică. **Efect vizibil:** un arc eliptic din mijlocul unei căi iese SPLINE, nu ELLIPSE. Îl spun owner-ului ca informație | +1 (forma parametrică); ca primitivă: +6–10 |
| 3 | GPU compute în v1 | **Nu.** Tot ce devine traseu se calculează pe CPU: determinism între Node și Edge, CI fără GPU, diferențe de până la 0,18 µm (s4). Finisarea pe 16 workere ia 2,2 s pentru 2,67 M de puncte (s5): se poate aștepta. Blur-ul ia 83 ms pe 16 workere: e interactiv. WebGPU doar pentru afișare. Calculul pe GPU intră în v1.x, cu probă față de CPU | 0; dacă devine obligatoriu: +5 (kernele, pierderea dispozitivului, poarta locală pe GPU) |
| 4 | Workerele | **Adopt s11:** fără izolare cross-origin în v1 (COOP + COEP strică login-ul Google, măsurat), datele grele stau în workere și se transferă cu halo (× 1,10–1,23 la blur, × 0,97 la finisare), iar Document-Isolation-Policy rămâne pentru mai târziu. Recomandarea SAB din s5 venea înaintea măsurătorii și cerea ea însăși probă | inclus în I9 |
| 5 | Normalizarea regiunii la V-carve | **Fără Clipper ca purtător:** regiunea se normalizează cu booleanul proiectului (PathKit + R3), cum cere chiar s3 (§5.4: „aceeași funcție ca la desen”). Peste el vin vindecarea cu toleranță declarată, `h ≤ 0,02` pe trăsăturile fine (sau adaptiv), legalizarea pe stivă (0,08 s față de 16–19 s) și adâncimea de start la incrustație (s3-V). Combinația PathKit + eșantionare e neprobată, de aceea B4 e R2 | inclus în B4 și B8 |
| 6 | Pânza | **Adopt s6-V:** vectorii exacți în worker, pe pânză software, ca ImageBitmap (clicul apare în 24 ms); traseele dense ca LINE_STRIP pe iGPU; planul B nepromovat. Rămâne neprobat procesorul unui laptop slab | inclus în I7 + L (întărirea) |
| 7 | Formatele cu licență grea | **Întrebări pentru owner, cu recomandarea din s12:** EPS printr-un interpretor propriu limitat (plus o ofertă Artifex, în paralel); AI ≤ 8 în același cititor; DWG doar mesaj în v1 (ODA costă 7 500 $ în primul an); WMF / EMF cu cititor propriu; DGK / PIC scoase, fiindcă n-au specificație publică. Nimic nu iese din prag fără decizia lui | EPS minimal: −7; ODA pentru DWG: +2–3 și 7 500 $ |
| 8 | Planșele | **Ipoteza de lucru e D** (prototipul: 6 gesturi față de 26 la scenariul 5, 9 față de 39 la scenariul 7). **Dacă owner-ul alege A:** fără piese și instanțe (−2), CSV-ul face copii (−1), exportul fără BLOCK / INSERT (−1), dar plafoanele trebuie să țină copiile (60 de noduri în loc de 2, +1–2) și spatele trebuie legat de față la C18 (+1). Net: **−1…−3 felii**, sub 1 % din durată. Ce contează e momentul: **schema planșelor se îngheață după alegere.** Arborele și gesturile comune (scenariile 1–3) pot începe înainte | ±0,3 săptămâni |
| 9 | Maturitatea nucleului geometric | **Recomand portul reparațiilor Rust 0.8/0.9 în copia JS din repo** (2–4 zile [dedus în s1-V]), fiindcă nu aduce un toolchain nou: frecarea de mediu a fost cauza 8 în ediția întâi. Epsilonul „paralele” trebuie reparat oricum, e și în Rust. **Întrebare pentru owner**, doar dacă vrea: o zi de măsurătoare cu Rust 0.9 compilat în WASM, pe aceeași suită, care cere Rust pe mașina lui și în CI. PathKit 1.0 rămâne, cu R3 și cu corpusul în CI; CanvasKit (3,3 MB) e rezerva. Gărzile (curățarea intrării, validarea ieșirii, rezoluția de 0,01 mm) sunt obligatorii | inclus în I10c (R3); Rust: +2; trecerea pe CanvasKit: +2 |

---

## 6. Săptămânile: P50 și P90

### 6.1 Modelul

```
săptămâni = 1 (etapa 0) + S / ((D − 0,5) · r − f)
```

| Mărimea | P50 | Coada pesimistă | Sursa |
|---|---|---|---|
| S = feliile planificate | suma de la §4 (311), fiecare articol lognormal cu P90 = P50 × multiplicatorul clasei; peste toate, un factor comun cu P90 = 1,3 | — | §3, §4; factorul comun din eroarea mea de durată (+7 % / +45 %, §2) |
| D = zile active pe săptămână | 5,4 | P10 = 4,0 | §1.1 [măsurat] |
| r = felii pe zi activă | 2,5 | P10 = 1,8 | §3 [dedus din măsurat] |
| 0,5 = zile pe etapă pentru placă | fix | — | §3 [dedus] |
| f = felii de refacere pe placă | 1,5 | P90 = 3 | §3 [dedus] |

Calculul: 200 000 de rulări, cu semințe fixe. Scriptul a fost unic, în afara repo-ului; tabelul de mai sus și cel de la
§4 îl refac complet.

### 6.2 Rezultatul

| | P10 | **P50** | P80 | **P90** |
|---|---:|---:|---:|---:|
| Săptămâni, de la 07.10.2026 | 18,7 | **33,2** | 50,0 | **63,7** |
| Data orientativă | — | **28.05.2027** | 22.09.2027 | **27.12.2027** |
| Felii planificate (fără refacerile de pe plăci) | — | 340 | — | 446 |
| Felii totale (cu refacerile de pe plăci) | — | **396** | 489 | **559** |

- La medianele exacte, fără împrăștiere, ies 29,9 săptămâni. Simularea dă 33,2 fiindcă erorile de mărime au coadă în
  sus: mediana unei sume e mai mare decât suma medianelor.
- **Capacitatea unei etape la P50: ~10,75 felii planificate, plus 1,5 de refacere.** La debitul pesimist: ~4,8. Un plan
  de etape care pune mai mult de ~11 felii într-o săptămână contrazice debitul măsurat.

### 6.3 Verificarea din altă parte

- **Ritmul celor mai bune perioade:** august, cu 6,4 zile active pe săptămână și ~3,2 felii pe zi, ar da ~19
  săptămâni. E cam P10-ul simulării (18,7) [dedus].
- **Ritmul mediu al întregii ediții întâi:** în 97 de zile active, ediția întâi a dus la „bun” sau „parțial” cam
  25–30 de rânduri-echivalent din noul v1 (`LECTII.md` §1; judecata mea, [dedus]). Adică ~0,28 pe zi activă. Noul v1
  are ~90 de rânduri-echivalent (65 + 8 funcții + admin + infrastructură + lansare), deci ~320 de zile active, adică
  ~59 de săptămâni la 5,4 pe săptămână. E aproape de P90-ul simulării (64): **P90 înseamnă „procesul nou cade înapoi la
  media ediției întâi”.**

### 6.4 Ce nu e în săptămânile astea: porțile externe

Sunt pași ai owner-ului, cu dată necunoscută. Pot amâna lansarea după ce v1 e gata:
- **Atelierele pentru posturi** (NcStudio, RichAuto / Syntec, Mach3 / Mach4). RichAuto cere probabil două runde (s8).
  **Pachetul trebuie să plece la sfârșitul etapei în care intră postul, cel târziu în etapa 3.** La P50 rămân atunci
  peste 25 de săptămâni de rezervă.
- **CAEN-ul pentru Stripe live**, fără dată. Dacă întârzie, owner-ul decide lansarea fără încasare (`BRIEF.md` §8).
- **Entitatea juridică, adresa de firmă, Termenii; DNS-ul pentru e-mail** (`BRIEF.md` §7).
- **Străinul pentru testul de lansare:** se programează cu 1–2 săptămâni înainte de final.

---

## 7. Sensibilitatea: ce schimbă rezultatul cu peste 20 %

Câte un factor mutat, restul la mediană; mărimile la P50. Baza e 29,9 săptămâni [dedus]:

| Ce se schimbă | Săptămâni | Efectul |
|---|---:|---:|
| **Zile active pe săptămână: 5,4 → 4,0** (cum a fost în W25–W32) | 43,9 | **+47 %** |
| **Felii pe zi activă: 2,5 → 1,8** | 43,5 | **+45 %** |
| **Mărimea totală × 1,3** (eroarea mea de estimare) | 38,6 | **+29 %** |
| **Toate articolele R3 ies × 2,2** (ca incrustația din ediția întâi) | 36,1 | **+21 %** |
| **Felii pe zi activă: 2,5 → 3,3** (ritmul pe linii din P6–P7) | 22,2 | **−26 %** |
| Zile active pe săptămână: 5,4 → 6,4 (ritmul din august) | 24,5 | −18 % |
| Refacerile de pe plăci: 1,5 → 3 pe placă | 34,6 | +16 % |
| GPU compute în v1 (+5 felii) | 30,4 | +2 % |
| EPS în varianta minimă (−7 felii) | 29,3 | −2 % |
| Rust → WASM în locul portului JS (+2) | 30,1 | +1 % |
| Planșele A în loc de D (−2) | 29,7 | −1 % |

Concluzia:
- **Durata o decid ritmul și continuitatea, nu deciziile tehnice deschise.** Primele trei rânduri sunt exact ce
  măsoară regula de recalibrare (§8).
- **Pârghiile owner-ului, dacă estimarea iese prea lungă** (`BRIEF.md` §15 îi lasă reconsiderarea beta-ului sau a lui
  v1): relieful (C, 48 de felii, ~15 %), relieful + 3D (C + D, 72, ~23 %), laserul și canelurile (B9 + B14, 9).
  Nimic nu iese din prag fără decizia lui.
- **Evaluarea portării** (`docs/PORTARE.md`, după plan) poate scădea câteva procente în zonele cu algoritmi verificați:
  urechile, lead-ul, profilul frezei, `.tdb`, planarea, trasarea, fluxul GRBL. Proba nouă se face oricum, deci câștigul
  e la proiectare, nu la dovadă [dedus]. N-am scăzut nimic pentru asta.

---

## 8. Regula de recalibrare

### 8.1 Ce se măsoară din prima zi (în DEVLOG și în git, fără unelte noi)

**Pe fiecare felie:**
- `Started` / `Completed`, după regula DEVLOG a owner-ului;
- clasa (R1 / R2 / R3) și estimarea în felii;
- câte treceri a avut: respingeri ale recenziei, roșul de pe CI, refaceri;
- liniile de produs și de teste;
- dacă a ajuns pe o placă.

**Pe fiecare etapă:**
- zilele active (zile cu commit, din git);
- feliile acceptate: commit verde, cu proba lui, cu rândul de prag bifat; o refacere nu se numără ca felie nouă;
- feliile de refacere venite din placă;
- dacă placa a trecut, cu cotele măsurate față de cele date dinainte;
- timpul de așteptare după deciziile owner-ului.

### 8.2 Ce trebuie să conțină primele două etape, ca măsurătoarea să valoreze ceva

- cel puțin **un articol R3**: de exemplu I10c, reparațiile cavalier;
- cel puțin **un articol R2 care se termină pe placă**: de exemplu B1 (profil cu urechi) peste I11 (IR și post);
- articole **R1 de infrastructură**: I1–I3;
- **prima placă de probă.** Fără ea, `f` rămâne ghicit.

### 8.3 Cum se actualizează (după etapa 2, apoi după fiecare etapă)

1. **Ritmul:**
   - `r_obs` = felii acceptate ÷ zile active;
   - `r_nou` = (10 · 2,5 + z · r_obs) ÷ (10 + z), unde z = zilele active observate. Prior-ul valorează 10 zile active,
     adică ~2 etape. După 4 etape contează aproape doar măsurătoarea.
2. **Zilele pe săptămână:** la fel, cu prior-ul de 2 săptămâni.
3. **Mărimile:**
   - pe fiecare clasă, `k_c` = felii consumate ÷ felii estimate, pe articolele închise;
   - toate articolele rămase din clasa c se înmulțesc cu `k_c`;
   - cu mai puțin de 5 articole închise într-o clasă, se folosește `k` global.
4. **Placa:** `f_nou` = media refacerilor pe placă din etapele observate.
5. **P50 și P90 se recalculează** cu modelul de la §6, cu valorile noi.

### 8.4 Când mă opresc și întreb

- **O felie trece de 1,5 × estimarea ei** (regula din `CLAUDE.md`). Până la prima măsurătoare, o felie standard are un
  buget de **0,4 zile active**. În etapa 1 se măsoară câte ore are o zi activă (din `Started` / `Completed`). De acolo,
  bugetul se dă în ore.
- **P50-ul recalculat se mută cu peste 20 %** față de cel aprobat. Atunci owner-ul primește noua estimare cu pârghiile
  de la §7: ce poate trece din v1 în v1.x și dacă reconsideră beta-ul.
- **După 3 etape, `r_obs` < 1,8** (pragul pesimist de la §3). Înseamnă că procesul se apropie de media ediției întâi și
  cere o discuție de proces, nu doar o estimare nouă.

---

## 9. Riscurile estimării și ce n-am putut măsura

- **Mărimile pe articole sunt [dedus]**, ancorate în sonde și în ediția întâi, nu măsurate. De aceea regula de la §8
  le înlocuiește după primele etape.
- **Modelul AI s-a schimbat.** August a mers pe Opus 5; acum lucrează Opus 5.5. Diferența de ritm nu se poate măsura
  din istoric.
- **Ritmul ediției întâi includea pagube** pe care procesul nou le evită: sesiuni paralele pe același arbore, CRLF, CI
  mort. Dar includea și lipsa plăcilor, pe care procesul nou le adaugă. Am presupus că se compensează [dedus].
- **Adminul are 12–17 felii, tot [dedus]**, în raportul lui.
- **Cloud-ul și bibliotecile partajate (I16) nu sunt rând de prag.** Le-am pus fiindcă `BRIEF.md` §4 le numește ca
  ce se blochează pe server. Dacă owner-ul le scoate: −3 felii.
- **Conținutul bibliotecii de clipart (C24)** și **laserul pentru placă (B14)** sunt întrebări deschise; n-am estimat
  crearea conținutului.
- **Etapa 0** (aprobarea planului, `docs/PORTARE.md`, configurarea din prima săptămână): o săptămână fixă [dedus].

---

## 10. Cum se reproduce

**Ritmul ediției întâi** (doar citire, în `C:\Users\besli\Desktop\MyWork\Apps\CNCVectorStudio`, la `d850c7b`):
- zilele active: `git log --date=format:'%G-W%V %Y-%m-%d' --format='%ad' main`, apoi numărarea zilelor distincte pe
  săptămână;
- perioadele: `git log --numstat --since=… --until=… main`, pe zonele `src/`, `scripts/` + `testkit/`, `DEVLOG.md`,
  `functions/` + `*.rules`, `*.md`. `scripts/.tmp-ops.cjs` se scoate. Un commit e „doar de jurnal” când subiectul
  începe cu `devlog`, `jurnal`, `registru` sau `docs:`;
- feliile din 24–25.09: `git log --since='2026-09-23 12:00' --until='2026-09-26 06:00' main` și `git show --numstat`
  pe fiecare.

**Săptămânile:** formula de la §6.1, cu mărimile de la §4 și parametrii din tabelul de la §6.1. Clasele: R1 × 1,3,
R2 × 1,6, R3 × 2,2.
