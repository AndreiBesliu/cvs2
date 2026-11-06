# ADR 0166: formele între cvs2 și extensii

**Starea:** acceptat pe 05.11.2026 pentru felia 3.Xe, a liniei Trenuleț (worktree-ul `wip/trenulet`). Owner-ul: „B, schimbul
de forme” (la „Care felie urmează?”, după 3.Te), apoi „Da, fă-o”, la schița celor cinci locuri noi.

## Contextul

Pluginul devine un atelier de forme 3D pentru printare (direcția din 04.11), iar întâi vine „comunicarea perfectă” cu cvs2.
Până acum, între desenul lui cvs2 și o extensie nu trecea nicio formă: extensia putea descărca fișiere și trimite lucrări
G-code spre fereastra Mașina (ADR 0160), dar nu putea lua o formă din desen și nici pune una în el. Felia B, propusă pe 04.11:
„conturul unei piese din plugin ajunge în desenul cvs2, iar o selecție din cvs2 ajunge în plugin (de exemplu, ca s-o ridici
în 3D)”.

## Decizia

### A. Permisiunea `forme`

O permisiune nouă în catalog (`src/extensii/pachet.ts`), arătată la instalare: „să primească formele pe care i le trimiți din
desen și să-ți propună forme pentru desen (le adaugi tu, din Importă)”. Fără ea, nimic din ce urmează.

### B. Din desen spre extensie: doar ce trimite omul

Extensia nu citește desenul singură. Omul alege forme și apasă „Trimite la <extensie>”, o acțiune nouă
(`extensii.trimite-selectia`), în bara selecției și în paleta de comenzi, care se arată doar cât e deschisă o extensie cu
permisiunea `forme`. cvs2 îi trimite contururile instanțelor alese, apoi îi arată fereastra.

Forma datelor (`FormeCvs2`, în `extensii/api.ts`), versiunea 1:
- contururile, în mm, în coordonatele foii (originea în colțul stânga-jos, Y în sus), fiecare cu `inchis` și punctele lui;
- arcele, cercurile și cubicele, aproximate prin segmente, la cel mult 0,02 mm de forma exactă (din aceiași vectori ca exportul
  2D, ADR 0088);
- cutia lor;
- peste 10 000 de contururi sau 200 000 de puncte, ori fără nicio formă, extensia primește refuzul (`prea-mare`, `nimic`), ca
  să-l spună omului în fereastra ei.

### C. Din extensie spre desen: prin fereastra Importă

Extensia propune un fișier (`host.forme.propune(nume, text)`: SVG sau DXF, cât un import obișnuit, ADR 0035). cvs2 trece la
Proiectare și deschide fereastra Importă cu fișierul, ca pe unul ales de om, cu „Propus de <extensie>”; nimic nu intră în
desen fără „Importă” (și se poate anula, ca orice import). Refuzurile: `forme:permisiune`, `:nume`, `:date`, `:prea-mare`,
`:ocupat` (alt import e deschis), `:doar-citire` (fila doar citește).

Încărcătorul (`shared/cadruExtensie.ts`) primește `host.forme` (`propune`, `laPrimire`), deci amprenta lui din CSP e nouă, pe
mecanismul din ADR 0127; politica CSP e aceeași. `HostApi` rămâne v1 (membri adăugați).

### D. Planificatorul

- **„Din cvs2”**, o filă nouă a atelierului 3D, arătată doar în cvs2: forma primită, ridicată la o grosime (0,4–50 mm,
  implicit 3,2, cât o placă LEGO), cu găurile după cum stau contururile unele în altele (un contur cuprins de un număr impar de
  altele e o gaură a celui care îl cuprinde direct); contururile deschise se spun și se lasă afară. Piesa intră în lista de
  printat ca oricare alta. Cel mult 50 000 de puncte. Știfturile LEGO pe o formă liberă vin într-o felie viitoare.
- **„În desenul cvs2”**, în exportul CNC, la fiecare placă (la două fețe, la fiecare față): DXF-ul ei (piesele, șanțurile,
  marcajele, pe straturile lor), prin fereastra Importă.

## Ce am respins

- **Extensia citește selecția când vrea** (`host.forme.selectia()`): ar vedea desenul omului fără ca el să știe; trimiterea
  e un gest al omului.
- **Extensia adaugă direct în desen** (`document.importa` fără dialog): o extensie greșită sau rea ar umple desenul; fereastra
  Importă arată ce intră și cere „Importă”, iar ușa ei (plafoanele, formatele) e deja probată pentru fișiere străine.
- **Un format nou de geometrie spre cvs2:** SVG și DXF sunt deja citite de import, cu straturile; planificatorul scrie DXF.
- **Forma exactă (arce, cubice) spre extensie:** pentru ridicarea în 3D ajung segmentele; o versiune viitoare a lui
  `FormeCvs2` le poate adăuga.

## Limite

- O selecție peste plafon se refuză întreagă; nu se trimite pe bucăți.
- Grosimea e una pe toată forma; o formă care se atinge cu ea însăși (contururi care se intersectează) iese cum iese.
