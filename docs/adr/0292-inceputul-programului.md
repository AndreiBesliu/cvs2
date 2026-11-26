# ADR 0292: Începutul programului, la vedere în fereastra „Exportă G-code”

**Starea:** propus pe 26.11.2026, cu recomandările aplicate (cuvântul owner-ului, adus de sesiunea principală: „Zi-le ca pot
continua cu ce urmeaza la fiecare”; o întrebare a owner-ului se pune grupată, cu recomandarea în față, iar linia merge mai
departe cu ea). Al treilea număr al intervalului 0290–0299, al liniei exportului (ramura `wip/28.8-export`, canalul
`export`). Completează ADR 0290 și ADR 0291; nu le schimbă.

**De unde vine:** canvas-ul aranjamentelor (<https://claude.ai/artifact/VuzcaEYQsLoTvRBxpnSak2>, tabla „B · Fereastra
exportului”) desenează, în panoul cu postul și fișierele, primele linii ale programului: comentariul de antet, linia modală,
WCS-ul, schimbarea sculei, pornirea axului, Z-ul sigur. ADR 0290 („Cu canvas-ul aranjamentelor”) le-a lăsat deoparte: „Nu aduce
ce desenează canvas-ul și nu există azi: Z sigur editabil și începutul G-code-ului la vedere (ar fi felii ale lor)”. Z-ul
sigur editabil a venit cu 28.8↑p. Rămâne începutul programului: felia 28.8↑r.

## Ce există azi

- După Exportă, Rezultatul spune, la Fișierele, numele fiecărui fișier, liniile și amprenta SHA-256. Textul programului nu se
  vede nicăieri în fereastră: cine vrea să știe ce primește controlerul întâi deschide fișierul descărcat într-un editor.
- Ce scrie postul la început depinde de alegerile ferestrei (postul, unitățile, originea și Z0, Z-ul sigur, schimbarea
  sculei) și de program: prima freză montată, turația ei, dacă programul schimbă freza, ieșirea din foaie confirmată.
- **Prima freză montată o hotărăște lucrarea**, nu fereastra: cu fundul plat al V-carve-ului, întâi freza dreaptă (ADR 0091);
  cu frezele de rest, întâi cea mare (ADR 0093); cu relieful, degroșarea și finisarea înaintea tăieturilor (ADR 0312, 0313);
  apoi gruparea pe freză (`grupeazaPeScula`) și ordinea omului (ADR 0133). Fereastra nu poate ști singură ce linie de sculă
  scrie postul fără să refacă lucrarea.

## Întrebările (recomandarea întâi)

1. **Când și unde se vede începutul?**
   - **a (recomandat):** după Exportă, în Rezultat, la Fișierele: începutul fiecărui fișier scris, adică chiar octeții
     descărcați. Exact prin construcție, fără niciun calcul în plus.
   - **b:** și înaintea exportului, în „Mașina și fișierul”, refăcut la fiecare schimbare, calculat de lucrare în worker,
     cu aceeași cerere ca exportul (exact, dar un calcul întreg la fiecare schimbare, ca traseul arătat pe pânză). Poate fi
     o felie a ei, după a.
   - **c:** înaintea exportului, din alegerile ferestrei, fără lucrare: **respins**, nu e exact (prima freză, turația ei, cu
     fundul plat, frezele de rest sau relieful). Ar fi o previzualizare care minte, lecția auditului (ADR 0291 §1).
2. **Câte linii?**
   - **a (recomandat):** până la prima mișcare de tăiere inclusiv (prima linie G1, G2 sau G3), cel mult 40. Dacă tăierea nu
     vine în 40 de linii, se văd primele 40 și „…”.
   - **b:** primele 10, oricât ar fi antetul.
   - **c:** tot fișierul, într-un cititor derulabil (mai târziu, dacă se cere: un fișier are până la 2 milioane de linii).
3. **Ce fișiere?**
   - **a (recomandat):** fiecare fișier scris (pe freză, ale dopurilor), fiecare în rândul lui, strâns; primul desfăcut. Cu
     „Toate foile”, fișierele foii active (cele care ajung în Mașina): arhiva nu e text.
   - **b:** doar primul fișier.

## Decizia (cu recomandările)

- **Unde:** în Rezultat › Fișierele, sub rândul fișierelor (în afara regiunii `role="status"`, ca un cititor de ecran să nu
  citească tot începutul la fiecare export), un bloc „Începutul programului”: câte un rând strâns (`<details>`) pe fișier, cu
  numele lui și câte linii arată, primul desfăcut. Liniile stau într-un `<pre>` cu font monospațiat, cu derulare proprie
  (pe orizontală, ca liniile lungi să rămână întregi; pe verticală peste ~16 rânduri), focusabil de la tastatură și cu
  nume accesibil. Nimic nu iese din fereastră la 390 px.
- **Ce:** liniile date de funcția pură `inceputProgram(text)` (`src/post/inceput.ts`): de la prima linie, până la prima
  mișcare de tăiere inclusiv, cel mult 40. Mișcarea de tăiere e o linie al cărei cod (fără comentariile dialectului: între
  paranteze sau după `;`) începe cu `G1`, `G2` sau `G3` (și `G01`–`G03`), nu cu `G17`, `G21` sau `G20`.
- **Calculul:** pe firul principal, în bucata acțiunilor exportului (`src/ui/actiuniExportCalcul.ts`, la cerere), din textul
  fișierelor deja scrise: nimic în worker, nimic în pornire. `RezultatExport.inceput` → `StareExport.inceput`.
- **Programul nu se schimbă:** postul, fișierele și amprentele rămân octet cu octet. Fereastra doar arată un prefix al lor.

## Ce nu face

- Nu arată începutul înaintea exportului (1b): e o felie a ei, la cuvântul owner-ului, cu costul spus (un calcul întreg pe
  schimbare).
- Nu arată tot programul și nu are buton „Copiază”: textul din bloc se poate selecta și copia; tot fișierul e cel descărcat.
- Nu schimbă panoul Mașina, care își are lista lui.

## Probele

- `inceputProgram`, pe hârtie: un antet cu comentarii în ambele dialecte, `G21` și `G17` care nu sunt tăieri, `G01` care
  este, un program fără nicio tăiere (toate liniile, cel mult 40), plafonul.
- Pe corpusul CAM, pe toate posturile, în mm și în inch: începutul e un prefix al textului; ultima lui linie e prima mișcare
  de tăiere, iar înaintea ei nu e niciuna; conține pornirea axului și Z-ul sigur scris de post. Cu Z-ul sigur ales în
  fereastră, linia lui e cea aleasă.
- E2e: după Exportă, Rezultat › Fișierele arată începutul fișierului descărcat (liniile lui, întocmai), cu Z-ul sigur ales;
  cu fișiere pe freză, câte un rând pe fișier, primul desfăcut; nimic nu iese din fereastră (proba privirii).

## Implementarea 28.8↑r (26.11)

- `src/post/inceput.ts`: `inceputProgram(text, comentariu, maxim = INCEPUT_MAXIM)` (40), pură; codul fără comentariile
  contractului (perechi sau până la capătul rândului; un comentariu neînchis ține până la capăt); tăierea e un cuvânt `G1`,
  `G2`, `G3` (și `G01`–`G03`); `restul` nu numără linia goală de după ultimul capăt de linie.
- `src/ui/actiuniExportCalcul.ts`: `RezultatExport.inceput` (`InceputFisier`, în `actiuniExportTipuri.ts`), din fișierele
  foii și ale dopurilor, cu numele alese de om; cu „Toate foile”, din fișierele foii active, cu numele lor din arhivă (ale
  primei foi a grupului ei de foi identice: chiar octeții din arhivă).
- `App.tsx` îl trece în `StareExport.inceput`; `DialogExport.tsx` (`InceputFisiere`) îl arată în Rezultat › Fișierele, după
  „Deschide în Mașina”, în afara regiunii anunțate: un `<details>` pe fișier, primul desfăcut, cu semnul ▸ / ▾; `<pre>`
  focusabil, cu `aria-label`, derulat în locul lui (`overflow: auto`, cel mult 16 rânduri la vedere).
- Textele, în ambele limbi (`export.rezultat.inceput*`), cu pluralul; manualul, la Rezultat.
- **Probele:** `export.inceput.test.ts` (6: pe hârtie, comentariile în fiecare dialect, plafonul, linia goală; pe corpusul CAM,
  pe toate posturile, în mm și în inch, cu dopurile incrustațiilor, prefixul și prima mișcare de lucru văzute de cititorul
  dialectelor; Z-ul sigur ales și numele ales; „Toate foile”), `export.inceput.spec.ts` (2: începutul fișierului descărcat,
  întocmai, cu Z-ul sigur ales, în afara regiunii anunțate, focusabil și cu nume, plecat la un parametru schimbat; câte un rând
  pe fișier, cu fișiere pe freză), proba privirii (la 1280, 1024 și 390 px, cu fontul lat; ținta rândului cu densitatea mare).
- Programul, fișierele și amprentele rămân octet cu octet: fereastra arată doar un prefix al textului descărcat.
