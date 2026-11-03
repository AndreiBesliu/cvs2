# Sursele planificatorului Trenuleț (v18)

Aici sunt sursele din care se construiește `planificator\planificator.html` (pagina de pe claude.ai și copia de pe PC),
cu probele lor. Sunt referința pentru mutarea sub cvs2 (`..\cvs2\HANDOFF_MUTARE.md`): portul trebuie să dea aceleași
ieșiri.

## Ce e unde

| Fișier | Ce face | Mărime |
|---|---|---|
| `planificator/app.js` | partea 2D: planul circuitului, catalogul Brio, piesele la comandă, verificarea podurilor, trenul animat, Export CNC (setări, mașini, plăci de sus / de dedesubt, deviz, arhiva), trimiterea la cvs2 (protocolul v1) | 170 kB |
| `planificator/atelier.js` | partea 3D: editoarele pieselor LEGO și ale legăturilor, găurile, previzualizarea (three.js), modelul, lista de printat, paturile, imprimantele | 115 kB |
| `planificator/cnc.js` | motorul căii: geometria pieselor (contururi Cavalier cu arce), șanțurile, cuplajele, limbile macazurilor, așezarea pe plăci, DXF / SVG, STL-urile pieselor printate, rampa 3D, zip | 83 kB |
| `planificator/gcode.js` | G-code direct: postul, contractele, CAM-ul (profil cu punți, șanțuri, găurire), timpul; portat de mână din cvs2 | 57 kB |
| `planificator/profiluri.js` | profilurile (mașini, imprimante), cu cel implicit | 6 kB |
| `planificator/head.html`, `body.html` | CSS-ul (variabile de temă, luminos / întunecat) și marcajul | 44 kB |
| `planificator/catalog.json` | catalogul pieselor de cale (se pune în `app.js` la build) | |
| `lego/lego.js` | motorul pieselor LEGO: corpuri închise (prisme, inele, corpuri rotite, sfere; fețele cu găuri prin earcut), toate piesele, calibrarea, STL, așezarea pe pat | 79 kB |
| `vendor/cavalier.min.js` | `cavalier-contours-js@0.1.1` (MIT / Apache-2.0), aceeași versiune cu `src/geom/cavalier` din cvs2 | |
| `vendor/earcut.min.js` | earcut 2.2.4 (ISC, `earcut.LICENSE`) | |
| `build.py` | lipește totul în `iesire/planificator.html` (conținutul paginii) și `iesire/preview.html` (documentul întreg) | |

Fiecare fișier `.js` e o funcție închisă care pune un singur nume pe `window` (`TrenCNC`, `TrenGCode`, `Lego`,
`Profiluri`, `Atelier3D`); `app.js` e script obișnuit. Nu sunt module ES și nu e TypeScript.

## Construirea

```
python3 build.py
```

`iesire/preview.html` e identic, octet cu octet, cu copia v18 din `Apps\Trenulet\planificator\planificator.html`.

## Probele

Din `teste/`, cu Node 20 sau mai nou:

| Comanda | Ce verifică | Durata |
|---|---|---|
| `node referinte.js --compara` | **ieșirile de referință v18**: amprenta SHA-256 a fiecărei piese LEGO (464, cu calibrarea, variantele și un pat de 220 × 220) și a fiecărui fișier din 7 circuite (DXF, SVG, G-code pe 5 controlere, STL-urile limbilor, rampei, pieselor printate), plus piesele printate ale unui circuit. Iese cu 1 dacă ceva diferă și spune ce | ~2 min |
| `node referinte.js` | rescrie `referinte_v18.json` (doar când o schimbare e voită și explicată) | ~2 min |
| `node legaturi.js [dosar]` | piesele de legătură și găurile: corp închis, fără volum negativ (cu un dosar, scrie și STL-urile) | 10 s |
| `node fuzz_legaturi.js` | 1206 piese aleatoare (cărămizi cu găuri, pene, grinzi, rotunde, conectori): toate închise | ~2 min |
| `node indoita.js [dosar]` | grinzile îndoite (8 cazuri + 120 aleatoare) | 5 s |

`incarca.js` încarcă motoarele în Node exact ca în pagină (cu data fixă) și dă verificarea plasei (`plasa`).

**Scenariile de interfață** (`teste/ui/`, Playwright cu Chromium, previzualizarea 3D prin swiftshader): fiecare trece
prin pagină ca un om și se termină cu „erori: niciuna” (sau `erori []`). Au nevoie de pagina construită și de three.js r128:

```
npm i playwright three@0.128.0
PAGINA=../../iesire/preview.html node comb_ui.js
```

| Scenariul | Ce acoperă |
|---|---|
| `comb_ui.js` | comutatorul 2D / 3D, lista de printat cu piesele circuitului, telefon, tema întunecată |
| `comb_macaz.js` | limbile macazurilor în lista din 3D, la una și la două fețe |
| `cale_ui.js`, `proba_ui.js` | piesele de cale printate și proba cuplajelor |
| `avion_ui.js` | pene, pante curbe și inverse, rotunde, arhiva |
| `model_ui.js`, `model_tel.js` | modelul (așezare, mutare, taste, reîncărcare), pe calculator și telefon |
| `leg_ui.js` | fila Legături, toate piesele de legătură, găurile, perechile, modelul, arhiva |
| `ind_ui.js` | grinzile îndoite și setul de calibrare (19 piese) |
| `jos_ui.js` | privit de dedesubt: vederea 3D și plăcile din Export CNC (una și două fețe) |
| `prof_ui.js` | mașinile și imprimantele: nouă, schimbată, implicită, redenumită, ștearsă; legătura cu cuplajele printate |
| `leg_fix.js` | tragerea pe grile, controalele care urmează forma, gaura de sub știftul din mijloc |

Capturile și descărcările merg în `IESIRE` (implicit `./capturi`). Proba cap la cap cu cvs2 (`cvs2_e2e`) nu e aici:
cere o imitație a lui cvs2; testele protocolului sunt în `..\cvs2\primireLucrare.test.ts`.
