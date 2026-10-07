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
| 1.7 | Documentul v0: schema valibot cu versiune și o singură ușă de încărcare, arborele variantei alese, jurnalul de comenzi, IndexedDB în tranzacție, registrul de acțiuni cu capabilitatea pe fiecare acțiune | I3, I5, I6 | R1–R2 | **alegerea A / D** |
| 1.8 | Pânza v0: stratul de vectori în worker, pe pânză software; pan, zoom, selecție și mutare prin acțiuni; oracolul pânzei (marginea cercului) | I7 | R2 | 1.7 |
| 1.9 | Instanța de test (exportul Firestore confirmat de owner, apoi doar hosting) și fișa plăcii 1, cu programele A și B | I13 | R2 | 1.6, 1.8 |

Sunt 9 felii, cât spune planul pentru o etapă (8–9).

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
