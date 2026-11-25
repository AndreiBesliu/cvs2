# ADR 0283: Piesele rotunde pe același ax în vederea „Modelul” (felia 3.Tu)

**Starea:** acceptat pe 25.11.2026 cu 1a, 2a, 3a („1a, 2a, 3a la 3.Tu, pornește”, scris de owner în sesiunea liniei
atelierului) și implementat în aceeași zi (Easy 3Draw 18.33.0; „Implementat”, la capăt). Propus pe 24.11 de linia elicelor, după observația lui („vad ca nu se pot aseza centrat carcasa si elicea
de acelasi diametru in model”, cu o captură a vederii „Modelul”); analiza și cifrele, predate liniei atelierului
(`docs/linii/elice.md`, „3.Tu, propusă”).
**Continuă:** ADR 0282 (elicele, ventilatorul cu carcasă), ADR 0280 (roțile). **Se leagă de:** ADR 0284, partea D
(Modelul ca asamblare): felia 3.Cf pleacă de la ce e hotărât aici.

## Problema

Vederea „Modelul” a atelierului Easy 3Draw (din sursele v18: `corpModel`, `arataModel`, `puneInModel`, `mutaM`, în
`extensii/trenulet/sursa/planificator/atelier.ts`) așază fiecare piesă pe grila de știfturi după **amprenta** ei
(`round((mărimea + 0,2) / 8)` știfturi pe fiecare axă), cu **mijlocul cutiei** în mijlocul amprentei. Locul se schimbă
câte un știft.

- Mijlocul cade pe centrul unui știft la o amprentă impară și pe linia dintre știfturi la una pară. Două piese rotunde
  cu amprente de paritate diferită (roțile de 16 și de 24 de dinți) nu ajung niciodată pe același ax.
- La o piesă rotundă nesimetrică (o elice cu 3, 5 sau 7 palete, o camă), axul nu e mijlocul cutiei (e la 4 mm de el la
  camă și la 8,3 mm la elicea cu 3 palete), deci nu cade nici pe un știft, nici pe o linie a grilei.
- „Pune în model”, cu o piesă aleasă, pune piesa nouă din același colț, deasupra ei.

În captura owner-ului: carcasa Ø48 cu 2 urechi (amprenta 9 × 7, axul la (36, 28) mm de colțul ei) și rotorul Ø48 cu 7
palete (amprenta 6 × 6, axul la (22,6, 23,2) mm de colțul cutiei lui). Orice mutare s-ar face, axele rămân la cel puțin
3,7 mm pe X și 4 mm pe Y.

## Decizia

**1a. Piesele rotunde stau cu axul în mijlocul unui știft**, ca găurile unei grinzi culcate.

- O piesă rotundă e una al cărei ax e originea ei în motor: roata dințată, conica, coroana, conica dublă, fulia, roata
  cu anvelopă, pinionul șenilei, șurubul melc, cama, elicea, elicea de barcă, rotorul și carcasa ventilatorului, roata
  cu palete. Piesa o spune ea, odată cu plasa (`construieste(def)`), nu o listă a atelierului.
- Amprenta unei piese rotunde e **impară** pe ambele axe (cea de până acum, cu un știft în plus când era pară), iar
  **pivotul** ei, punctul care stă în mijlocul amprentei, e axul. Deci axul stă mereu pe centrul unui știft, iar două
  piese rotunde ajung pe același ax cu mutările de azi (câte un știft).
- **Rotirea unei piese rotunde se face în jurul axului:** axul rămâne pe loc (colțul amprentei se mută cu el).
- Celelalte piese stau exact ca până acum: mijlocul cutiei (sau al plăcii, la piesele cu ceva ce iese din placă) în
  mijlocul amprentei.
- Ce e deja într-un model se mută la redeschidere cu cel mult o jumătate de știft (4 mm) din cauza amprentei, plus cât
  era axul pe lângă mijlocul cutiei. Nimic nu se rescrie în datele ținute: locul (x, y, z, rotirea) rămâne.

**2a. „Pune în model”, cu o piesă aleasă:** piesa nouă intră deasupra ei, cu pivotul cât mai aproape de al celei alese.
Două piese rotunde ajung exact pe același ax; două piese cu amprente de aceeași paritate, exact cu același mijloc; la
paritate diferită, piesa nouă stă cu o jumătate de știft spre colțul celei alese (acolo unde stătea până acum).

**3a. Rotorul pus cu carcasa lui aleasă intră în ea,** pe același ax, la același Z (nu deasupra).

## Ce am hotărât la implementare

- **Rotorul „încape”** când vârful paletelor lui e sub raza golului carcasei (`ventilatorCote`: Rt < Ø / 2). Un rotor mai
  mic intră și el într-o carcasă mai mare; unul mai mare stă deasupra, ca orice piesă.
- **Și invers:** carcasa pusă cu rotorul ei ales intră în jurul lui, la același Z. Altfel aceeași pereche ar fi ieșit
  diferit după ordinea în care e pusă.
- **„Înlocuiește în model”** (piesa schimbată în editor): o piesă rotundă înlocuită cu alta rotundă își ține axul (o
  roată de 24 schimbată cu una de 40 rămâne pe același ax); restul își țin colțul, ca până acum.
- **Ce se vede:** la o piesă rotundă, rândul ei din listă și rândul piesei alese spun știftul axului („axul pe știftul
  4, 3”), nu colțul amprentei: două piese pe același ax au aceleași numere, iar numerele nu se schimbă la rotire.
- **La egalitate** (pivotul la o jumătate de știft între două locuri), piesa nouă ia locul cu numărul mai mic.

## Marginile

- Vederea rămâne „privirea de ansamblu”: nu verifică prinderea și nu oprește două piese care intră una în alta. Asta e
  felia 3.Cg (ADR 0284, partea D).
- Z rămâne în plăci (3,2 mm). Rotorul (8 mm) stă pe aceeași bază cu carcasa lui (10 mm la Ø48), nu la mijlocul ei.
- Mutările rămân de un știft; pozițiile la jumătate de pas sunt ale feliei 3.Cf.
- „Fă ventilatorul” pune perechea în lista de printat, nu și în model (propunerea din auditul elicelor, nepornită).
- Doar pachetul extensiei se schimbă: nimic în aplicație, nimic pe server, documentul neatins.

## Se redeschide dacă

- o piesă nouă a motorului e rotundă, dar nu-și are axul în origine (atunci își spune axul altfel);
- owner-ul vrea pași de jumătate de știft pentru toate piesele (varianta 1b), odată cu 3.Cf;
- mutarea de cel mult o jumătate de știft a unui model vechi strică o construcție ținută de cineva.

## Implementat (3.Tu, 25.11.2026)

Easy 3Draw 18.33.0, pe ramura `wip/3.Xh-biblioteca-ui`, în sesiunea cloud a liniei atelierului.

- **Motorul** (`extensii/trenulet/sursa/lego/lego.ts`): `construieste(def)` întoarce și `ax` (locul axului în plasa mutată
  în origine; `null` la piesele care nu sunt rotunde). Așezarea e pură și e a motorului: `asezareModel` (amprenta și
  pivotul), `pivotModel` (locul pivotului pentru piesa pusă la x, y, rotită), `langaPivot` (locul la care pivotul ajunge
  cel mai aproape de o țintă) și `impreunaInModel` (rotorul și carcasa în care încape). Tabelul pieselor așezate după
  placa lor (știfturile pe lateral, suportul, clema, mânerul, bila, cupa) s-a mutat din atelier în `asezareModel`,
  neschimbat.
- **Atelierul** (`planificator/atelier.ts`): `corpModel` ia amprenta și pivotul de la motor; scena pune plasa cu pivotul
  în locul lui (`arataModel`); rotirea unei piese rotunde îi mută colțul, ca axul să rămână pe loc (`mutaM`); „Pune în
  model” și „Înlocuiește în model” folosesc `langaPivot`; rândul unei piese rotunde spune știftul axului.
- **Cifrele, pe piesele din captura owner-ului:** carcasa Ø48 cu 2 urechi (amprenta 9 × 7) la 0, 0 are axul la (36, 28),
  pe știftul 4, 3; rotorul Ø48 (amprenta 7 × 7, era 6 × 6), pus cu ea aleasă, intră la 1, 0, cu axul tot la (36, 28), la
  același Z. Modelul celor două e cât carcasa: 71,2 × 52 × 10 mm. Din locurile capturii (rotorul la 2, 1, 3), rotorul
  ajunge acolo cu un știft la stânga, unul în jos și trei plăci mai jos.
- **Ce se mută într-un model ținut de dinainte:** piesele rotunde cu amprenta pară (roțile de 12 și 16 dinți, conica
  dublă, roata cu anvelopă, roata cu palete, melcul Ø16, rotorul Ø48, carcasa Ø40) cu 4 mm pe axa aceea; cele
  nesimetrice (elicea cu 3 palete, cama, elicea de barcă), cu cât era axul pe lângă mijlocul cutiei. Datele ținute
  (x, y, z, rotirea) rămân aceleași.
- **Probele.** Unitară, scrisă întâi (`test/unit/trenulet.model.test.ts`, 8 teste): axul spus e cel de pe plasă (gaura
  din mijloc, golul carcasei); tabelul pe hârtie al celor 27 de piese rotunde (amprenta, locul axului); piesele care nu
  sunt rotunde, față de formula v18 scrisă din nou în probă; locul de lângă o țintă, cu egalitățile și zgomotul de
  virgulă mobilă; rotorul chiar încape în golul carcasei, pe plase (vârful la 23,2 mm, golul la 24). E2e
  (`test/e2e/trenulet.model.spec.ts`, 5 teste): captura owner-ului dintr-un model ținut, cele trei răspunsuri,
  înlocuirea, piesele așezate după placă; scena e judecată prin mărimea modelului (cutia tuturor pieselor), cu valorile
  pe hârtie. Proba în engleză din cvs2 (`trenulet.spec.ts`) pune o roată în model („axis on stud 1, 1”).
- **Otrăvurile:** `test/otravuri/3.Tu.py`, 111 (motorul 64 / 64, atelierul 43 / 43 (40 la prima rulare; cele trei scăpate, prinse după întărirea probei), textele 4 / 4); `3.Tu-en.py`, 6 / 6 (5 la prima rulare).
- **Mărimea:** pachetul Easy 3Draw, 516,3 kB (era 514,4); aplicația, neschimbată.
- **Felia următoare:** 3.Cf (Modelul: orientarea pe trei axe și alipirea la prinderi; ADR 0284, partea D). Prima ei
  parte, 3.Cf-1 (alipirea), făcută tot pe 25.11 (Easy 3Draw 18.34.0).
