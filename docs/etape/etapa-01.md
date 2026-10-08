# Etapa 1 — Un schelet care taie

**Ținta** (`PLAN.md` §5.3): un dreptunghi și un cerc desenate în aplicație ies într-un G-code pe care îl tai corect, cu
originea în oricare colț.

**Starea:** pornită pe 07.10.2026, fără alegerea A / D. Owner-ul: „Continua si testez putin mai incolo”.
- Feliile care nu depind de modelul de planșe merg înainte.
- Documentul v0 (felia 1.7) așteaptă alegerea, fiindcă arborele lui e cel al variantei alese (`BRIEF.md` §9).
- Instanța de test: până la exportul Firestore confirmat de owner, ce e de încercat merge pe un canal de
  previzualizare al proiectului `cncvectorstudio-test` (`CLAUDE.md`).

## Feliile

Bugetul unei felii e ~½ zi activă, până la prima măsurătoare (`PLAN.md` §5.1). Articolele și clasele vin din
`docs/faza2/arhitectura/estimare.md`.

| # | Felia | Articolul | Clasa | Depinde de |
|---|---|---|---|---|
| 1.1 | Fișa etapei și proba de mediu în Drive: instalarea, build-ul, nivelul rapid și Edge, de două ori, cu `git status` curat după | I1 | R1 | — |
| 1.2 | Scheletul: `t()` en / ro cu paritatea verificată de compilator, ErrorBoundary + jurnalul local de erori, configul citit de la gazdă, CSP fără `unsafe-eval` | I1, I2 | R1 | 1.1 |
| 1.3 | CI rapid: `tsc`, regulile de import cu capcana, testele, build-ul determinist, lista albă de licențe; cârligul `git add -A` | I1, I6 | R1 | 1.2 |
| 1.4 | Geometria v0: L / A / C cu bulge, transformările exacte, cavalier adus în repo, profilul exterior și interior pe dreptunghi și cerc, cu treceri pe adâncime | I10a, I10c | R2 | 1.3 |
| 1.5 | IR-ul v0 pe N axe, montajul (4 colțuri, Z0 sus sau jos, o singură matrice) și postul GRBL v0 (3 zecimale, I / J din startul rotunjit, gărzile, antetul, 70 de octeți, SHA-256) | I11, I20 | R2 | 1.4 |
| 1.6 | Oracolul G-code din s4 în `test/oracles/`, cu valorile pe hârtie pentru cele 4 colțuri, regula de arc GRBL și poarta invariantelor 1, 3, 5, 6, 7, 8 | I11, I12 | R2 | 1.5 |
| 1.7 | Documentul v0: schema valibot cu versiune și o singură ușă de încărcare, arborele variantei alese, jurnalul de comenzi, IndexedDB în tranzacție, registrul de acțiuni cu capabilitatea pe fiecare acțiune; plus lista de vectori, cu avertismentele cu roșu (`BRIEF.md` §16.3) | I3, I5, I6 | R1–R2 | alegerea A / D: **D**, pe 08.10 (ADR 0024) |
| 1.8 | Pânza v0: stratul de vectori în worker, pe pânză software; pan, zoom, selecție și mutare prin acțiuni; oracolul pânzei (marginea cercului) | I7 | R2 | 1.7 |
| 1.9 | Instanța de test (exportul Firestore confirmat de owner, apoi doar hosting) și fișa plăcii 1, cu programele A și B | I13 | R2 | 1.6, 1.8 |

| 1.10 | Ieșirea din foaie (cerința owner-ului de la încercarea prototipului, `BRIEF.md` §16.3): avertismentul în bara de jos, niciodată pe pânză; exportul cere confirmare când discul frezei trece de marginea foii, iar confirmarea se scrie în antet; oracolul independent refuză tăierea în afara foii fără declarație | I12, I20 | R2 | 1.9c |

Planul spune 8–9 felii pe etapă. Felia 1.10 a venit din încercarea owner-ului: exportul publicat pe canal tăia în
afara foii fără să întrebe.

**Contractul declarației** (felia 1.10), scris aici ca postul și oracolul să-l implementeze independent:
- două comentarii în antet, după `(scula …)` și înaintea primei mișcări: `(CONFIRMAT: freza iese din foaie)` și
  `(iesire mm: st 5.000 dr 0.000 jos 0.000 sus 0.000)`;
- valorile spun cât trece discul frezei de fiecare latură a foii cât taie, în coordonatele documentului, cu 3 zecimale.
  Contează doar porțiunea de sub fața de sus a fiecărei mișcări G1, G2, G3; o rampă sau o elice care trece prin Z 0 se
  taie exact acolo;
- aplicația declară orice ieșire peste 0,0005 mm. Oracolul cere declarația peste 0,002 mm și acceptă diferențe de cel
  mult 0,005 mm între declarat și măsurat. Refuză declarația goală (toate laturile 0.000), pe cea incompletă, repetată
  sau venită după prima tăiere, și orice rapidă sub fața de sus în afara foii;
- fără ieșire, antetul nu se schimbă, deci fișierele de aur rămân octet cu octet.

## Placa 1

MDF 18, freză Ø6. Fișierul A are originea în stânga-jos, fișierul B în dreapta-sus.

| Cota | Valoarea | Toleranța |
|---|---:|---:|
| insula dreptunghiulară | 100,00 × 60,00 | ±0,2 |
| gaura | Ø30,00 | ±0,2 |
| A: marginile față de stânga și de jos | 20,00 | ±0,3 |
| B: marginile față de dreapta și de sus | 20,00 | ±0,3 |
| adâncimea, o trecere | 3,00 | ±0,1 |
| adâncimea, două treceri de 4 | 8,00 | ±0,1 |

Placa confirmă matricea originii, sensul arcelor și oracolul G-code. Se taie cu senderul de azi al owner-ului, iar
programul are hash. **Live:** nu.

## Rândurile de prag

Niciunul nu se închide încă. Etapa pornește profilul, care se închide în etapa 2.

## Jurnalul feliilor

Duratele reale se trec aici, din `Started` / `Completed` (DEVLOG). Din ele iese ziua activă măsurată.

| # | Started | Completed | Treceri | Nota |
|---|---|---|---:|---|
| 1.1 | 07.10 ~14:50 | 07.10 14:57 | 2 | Proba de mediu trece de două ori de la `npm ci`: ci 8 s, `tsc` 2,8 s, unitățile 2,8 s, build 2,9 s, e2e în Edge 8 s. `dist/` identic între rulări, nimic readus de Drive, deci fără joncțiune. A doua trecere: un 404 pe `favicon.ico`, prins de e2e și reparat cu iconița. |
| 1.2 | 07.10 14:57 | 07.10 15:05 | 2 | `t()` en / ro: compilatorul refuză cheia lipsă, cheia în plus și pluralul românesc fără `few` (controale `@ts-expect-error`, probate și invers). ErrorBoundary + jurnalul local (50 de intrări, depozitul care aruncă trece în memorie) + „Copiază raportul”. Configul de la gazdă (`/config.json`, valibot). CSP fără `unsafe-eval` / `unsafe-inline`, doar în build: Edge refuză `eval` sub el, iar martorul fără CSP îl execută. 19 teste unitare, 7 e2e. A doua trecere: tipul importului CSS. |
| 1.3 | 07.10 15:05 | 07.10 15:15 | 3 | Nivelul rapid local în 12 s: `tsc`, regulile de import (11 reguli, 10 capcane, 48 de module; controalele: o regulă stricată și o încălcare reală pică), 26 de teste, build determinist (69,9 kB gzip, plafon 100), licențele (4 dependențe de rulare, MIT). `dependency-cruiser` nu suportă TypeScript 7, deci citește prin swc. Cârligul `git add -A` în `.claude/`. Workflow-urile `rapid` (push) și `complet` (noaptea, e2e în Edge). Treceri: ciclul raportat o dată, binarul nedeclarat în `exports`, licențele din lanțul de dependențe, nu din marcajul `dev`. |
| 1.4 | 07.10 15:15 | 07.10 15:28 | 3 | Contur L / A / C cu bulge; aria exactă pe toate trei primitivele (cercul = πr² exact, cubica prin Gauss pe 3 noduri); matricea cu rotiri exacte la 90°; offsetul peste cavalier, cu eșecul spus. Cavalier adus din `v0.1.1`: 118 `!` doar pentru tipuri, probat linie cu linie și cu martorul npm (100 de cazuri, bit cu bit). Profilul exterior / interior / pe linie, cu treceri egale. 50 de teste, valori pe hârtie. Treceri: `!` pus greșit în partea stângă de reparatorul automat; două importuri de efect cu `.js`; ciclurile interne cavalier → regula fațadei. |
| 1.5 | 07.10 15:28 | 07.10 15:37 | 3 | IR-ul pe N axe (axa A refuzată explicit în v1), montajul cu 4 colțuri ca translații și Z0 sus / jos, traseul de profil în IR, postul condus de contractul GRBL 1.1 (sursa fiecărui câmp, din s8). Pe hârtie: cele 4 colțuri, Z0 sus / jos, I / J din startul rotunjit, împărțirea la 180°, garda de coardă. Exportul cu SHA-256 verificat de `node:crypto`. Defecte prinse de teste: `toFixed` scria „1e+60” (acum refuzat peste 10⁹); garda de rază punea o coardă în loc de arc (acum segmente sub 0,001 mm, declarate); G0-urile fără efect. 65 de teste. |
| 1.6 | 07.10 15:37 | 07.10 15:43 | 2 | Oracolul G-code în `test/oracles/` (zero importuri din `src/`): parserul propriu, codurile GRBL și regula de arc în float32, din s8 A.1. Poarta invariantelor 1, 3, 5, 6, 7, 8 pe un câmp de înălțimi (ca s4). Fiecare invariantă are otrava ei, scrisă de mână, și un program curat ca martor. Lanțul întreg trece poarta: gaura, insula, și insula pe 4 colțuri × Z0 sus / jos, cu cutia pe hârtie. A doua trecere: oracolul presupunea scula în (0, 0, 0) la pornire, deci cu Z0 jos vedea o rapidă prin material; acum startul necunoscut se judecă doar la capăt. 75 de teste. |
| 1.9a | 07.10 15:43 | 07.10 15:46 | 1 | Fișa plăcii 1 (`docs/etape/placa-01.md`) și programele A (stânga-jos) și B (dreapta-sus), ca fișiere de aur în `test/placi/placa-01/`, cu SHA-256. Testul cere bytes identici cu ce generează postul acum, hash-urile în fișă și poarta trecută pe ambele. Hosting-ul pe test (restul feliei 1.9) așteaptă exportul Firestore confirmat de owner. |
| 1.7a | 07.10 15:46 | 07.10 15:51 | 2 | Partea documentului care nu depinde de A / D: catalogul de capabilități (`shared/`), schema v1 (foaia + elementele, comune ambelor variante) cu plafoane, câmpurile necunoscute păstrate, ușa unică de încărcare cu migrări pure, JSON canonic, jurnalul de comenzi (anulează / reface, 500), registrul de acțiuni cu capabilitatea obligatorie și motivele pe chei `t()`, regula „interfața doar prin acțiuni” cu capcana ei. Arborele variantei alese vine ca migrare v1 → v2. 92 de teste. Trecere: `Omit` pe tipul valibot cu index. |
| 1.8 | 07.10 15:51 | 07.10 16:02 | 4 | Pânza v0: workerul desenează vectorii exacți pe pânză software (arcele cu `arc()`, linia de 1 px fizic, doar ultima cerere), firul principal afișează ImageBitmap-ul. Zoomul în jurul cursorului (0,01…1 000 px/mm), pan cu butonul din mijloc / Space, clic → acțiunea de selecție (distanța exactă + evenodd cu arce, în `src/geom`), tragere → acțiunea de mutare, Ctrl+Z / Ctrl+Y / Delete. Oracolul pânzei: centrul liniei pe 720 de normale la ≤ 0,5 px de cercul de pe hârtie, fără goluri; controalele (raza × 1,01, centrul + 1 px) pică. Treceri: „ResizeObserver loop” prins de jurnal (pânza scoasă din layout), rândul de grilă care lăsa pânza cu înălțimea 0, decupajul testului în afara pânzei, pragul de cerneală prea brutal pentru linia antialiasată. 98 de teste unitare, 11 e2e. |
| 1.9b | 07.10 16:02 | 07.10 16:08 | 1 | `firebase.json` generat din `shared/csp.ts` (CSP-ul și ca antet, cu `frame-ancestors`; `no-cache` pe `/`, `/index.html`, `/config.json`), `.firebaserc` doar cu `test`, `scripts/publica-canal.ts`. Aplicația pe canalul `etapa-01`: https://cncvectorstudio-test--etapa-01-bfzodaf1.web.app (expiră 06.11); verificat în browser: instanța „test” citită de la gazdă, formele adăugate și desenate, consola fără erori. Adresa principală rămâne neatinsă. |
| 1.9c | 07.10 16:08 | 07.10 16:12 | 3 | Exportul G-code din aplicație: dialogul (colțul de origine, Z0, freza, profilul fiecărui element; implicitele plăcii 1), acțiunea `export.gcode` (capabilitatea „export-gcode”), interioarele tăiate primele, descărcarea cu SHA-256 afișat. Proba: exportul din aplicație, stânga-jos, dă exact liniile de G-code ale fișierului de aur A; dreapta-sus pe foaia 300 × 200 dă cotele de pe hârtie și trece poarta. **Ținta etapei e atinsă în aplicație.** Treceri: bugetul la 99,9 / 100 kB (calculul exportului mutat la cerere: pornirea 78,4 kB), ciclul de tipuri prins de regula lui, `\` pierdut iar de heredoc. 103 teste unitare, 13 e2e. |
| 1.10 | 07.10 21:59 | 07.10 23:24 | 3 | Ieșirea din foaie, din notițele owner-ului de la prototipul planșelor. Avertismentul stă în bara de jos, pe un rând, niciodată pe pânză. Exportul cere confirmare când discul frezei trece de marginea foii cât taie. Măsurarea e exactă: arcele prin punctele de pe axe, iar rampele și elicele se taie la Z 0. Pragul e jumătate din rezoluția de 0,001 mm. Confirmarea e legată de traseul arătat (obiectul cererii + amprentă) și se scrie în antet. Oracolul l-a scris o sesiune independentă, în 2 commit-uri: 46 de sabotaje, toate prinse. **Treceri:** (1) implementarea, cu `
`-uri pierdute de heredoc; (2) recenzia adversarială cu 10 agenți (~1,45 M tokeni) a găsit 17 probleme. Cele importante erau ocoliri ale confirmării: bifa boolean, Ctrl+Z sub dialog, un rezultat întârziat. Au fost reparate, iar oracolul a primit margini exacte și rapidele în afara foii; (3) reverificarea n-a găsit nicio ocolire, dar a scos la iveală Shift+Tab spre bară, Space dublu, o adâncime peste foaie (din 1.9c) și un pas absurd. Reparate: aplicația e inertă sub dialog, acțiunile de document trec printr-o singură ușă, adâncimea e plafonată la grosimea foii, iar trecerile la 1 000. 23 de otrăvuri pe aplicație, toate prinse. 147 de teste unitare, 17 e2e. **Durata:** fără estimare spusă dinainte; 85 de minute cu recenzia și reverificarea, față de 3–11 minute pentru celelalte felii ale etapei. |
