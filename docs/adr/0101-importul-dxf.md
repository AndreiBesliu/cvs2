# ADR 0101: Importul DXF

**Starea:** acceptat pe 28.10.2026, la felia 9.3↑ (adusă din etapa 9), după ADR 0100 („Ridică plafonul”, apoi felia
următoare). **Completează:** T18 (ADR 0018: câte o ușă pe format, spre același model), ușa SVG (ADR 0035, ADR 0037 §11) și
exportul 2D (ADR 0088). **Schimbă:** dialogul importului (ADR 0035 §9: formatul după nume, unitățile, refuzul de tip) și
piesa importului (`pozitie: 'fisier'`).

**Problema.** Rândul de prag „Import 2D” (v1, decis 07.10: DXF, SVG, PDF și AI compatibil PDF) avea doar SVG-ul. DXF-ul e
formatul în care vin desenele din CAD (AutoCAD, Fusion, SolidWorks, LibreCAD) și din alte programe CAM. Sonda s2 a probat
semantica (importul recitit 65 / 65) cu pachetul `dxf`, care aduce lodash, iar semantica era oricum a sondei.

## Decizia

1. **Cititorul e propriu** (`src/io/dxf.ts`): perechile cod / valoare ale DXF-ului ASCII. Un DXF binar e refuzat (`binar`).
   Perechile rupte se refuză cu linia lor (`dxf`), iar un fișier care nu începe cu o secțiune nu e DXF (`tip`). Textul e
   UTF-8 de la R2007 (AC1021), iar mai vechi după pagina de cod din antet ($DWGCODEPAGE); `\U+XXXX` din nume se citește.
2. **Unitățile:** $INSUNITS după tabelul AutoCAD (țol 25,4, picior 304,8, cm, m, dm, mil, yard, unitățile US survey).
   Lipsă, 0 sau un cod fără loc în tabel: mm, cu avertismentul. Dialogul lasă atunci omul să aleagă mm, cm, m, țol sau
   picior, iar mărimea desenului se schimbă pe loc. $MEASUREMENT nu se folosește: nu spune unitatea desenului.
3. **Entitățile:**
   - LINE, ARC (grade, trigonometric de la start la sfârșit), CIRCLE, ELLIPSE (axa mică = normala × axa mare × raportul);
   - LWPOLYLINE și POLYLINE 2D, cu bulge, închise de steag;
   - POLYLINE 3D, proiectată pe XY;
   - POLYLINE din spline sau din curbă: doar vârfurile curbei, fără cadrul de control (16);
   - SPLINE (§6).
   OCS-ul: extrudarea (0, 0, 1) e identitatea, (0, 0, −1) oglinda pe x (algoritmul axei arbitrare). Altă normală înseamnă
   o entitate înclinată, sărită.
4. **Blocurile:**
   - INSERT = T(punct) · R(rotire) · S(scara) · T(−baza), în OCS-ul lui. MINSERT: celula (c, r) cu distanțele rotite odată
     cu inserarea, verificat față de ezdxf;
   - stratul 0 dintr-un bloc ia stratul INSERT-ului;
   - imbricarea are cel mult 16 niveluri (un bloc care se inserează pe sine se oprește acolo);
   - se sar, numărate: blocul lipsă, xref-ul, scara 0. Atributele (ATTRIB) sunt text.
5. **Ce nu se importă, numărat:**
   - straturile oprite (culoarea negativă) sau înghețate (pe un strat înghețat, INSERT-ul se ascunde cu tot ce are, ca în
     AutoCAD), entitățile invizibile și spațiul hârtiei (67 = 1);
   - textul, hașurile, cotele, punctele, entitățile 3D, imaginile și restul.
6. **Geometria e exactă unde se poate:**
   - **arcul** trece exact printr-o similitudine (bulge-ul din fișier se păstrează). Sub o scară neuniformă devine arc
     eliptic, în cubice sub `TOLERANTA_IMPORT`; peste latura documentului, la fel (arcul plat, ca la ușa SVG);
   - **spline-ul** se desface în bucăți Bézier exacte prin forma polară (de Boor cu alt parametru pe fiecare nivel), și pe
     nodurile neprinse (spline-ul periodic). Gradele 1–3 dau linii și cubice exacte;
   - **conica rațională circulară** e un arc exact;
   - **restul** (raționale, grad peste 3) se aproximează sub toleranță împărțită la cât lungește matricea, cu numărul spus.
7. **Bucățile deschise de pe același strat se leagă capăt la capăt:** două capete la cel mult `REZOLUTIE`, și doar două (în
   T nu se leagă).
   - Un gol peste `TOLERANTA_IMPORT` se închide cu o linie, numărată; sub, capetele se lipesc.
   - Un lanț care se întoarce în el însuși e un contur închis: patru linii fac un dreptunghi, iar polilinia nemarcată, cu
     ultimul vârf peste primul, se închide.
   - Straturile se compară fără majuscule, ca în AutoCAD.
8. **Calea finală:**
   - arcele vecine pe același cerc, în același sens, devin unul;
   - un cerc întreg devine cele două semicercuri ale lui `conturCerc`, deci cercul NURBS, două semicercuri și cercul
     oglindit ies la fel;
   - apoi verificările ușii SVG (plafonul căii, bucla dintr-o cubică, calea fără arie, praful), mutate neschimbate în
     `src/io/caleImport.ts`;
   - la sfârșit, marginile documentului și plafonul total.
9. **Dialogul** e același:
   - titlul „Importă: …”, iar butonul „Importă SVG / DXF…”;
   - formatul se alege după nume (`src/io/formatImport.ts`);
   - unitățile se arată spuse de fișier, sau se aleg;
   - raportul DXF are 30 de coduri, în ambele limbi;
   - refuzurile noi: `binar` și `dxf`.
10. **Piesa** e cea de la SVG (`piesaDinImport`), cu numele stratului pe fiecare element. Originea DXF-ului e originea foii,
    deci desenul stă unde e în fișier (`pozitie: 'fisier'`). Același desen ajunge pe foaie în același loc din DXF și din
    SVG-ul lui cu pagină. Lăsat pe planșă, centrul cade în punctul lăsat.
11. **Pachetul de pornire** nu primește nimic din ușă:
    - ușa stă în bucata calculului importului;
    - listele DXF și `formatImport` stau doar în modulele la cerere;
    - pornirea crește cu numele noii bucăți comune (dialogul și ușa).

## Cifrele (măsurate, gzip 9)

| | Înainte (5.7↑) | După (9.3↑) |
|---|---|---|
| Pornirea (cu ușa) | 96,4 (99,9) / 100 kB | 96,5 (100,0) / 110 kB |
| Totalul JavaScript | 330,3 / 400 kB | 338,3 / 400 kB |

Prima măsurătoare a dat pornirea 97,0: `formatImport` și listele DXF ajunseseră în bucata de pornire prin modulul acțiunilor
importului. Mutate în module proprii, aduse doar de dialog și de ușă, au lăsat pornirea cu +0,1 kB.

## Probele

- **Corpusul independent** (`test/oracles-py/dxf_import_corpus.py`, ezdxf 1.4.4): patru DXF-uri (R2018 în mm, R2000 în țoli,
  R12 fără unități, „atelierul”). Valorile pe hârtie sunt verificate în generator față de entitățile exacte ale lui ezdxf, cu
  blocurile, matricile și OCS-ul desfăcute de ezdxf. Spline-urile au 201 puncte evaluate de ezdxf (`test/unit/dxf.corpus.test.ts`).
  „Atelierul” are dreptunghiul din 4 linii, canalul din 2 linii și 2 arce, T-ul, polilinia neînchisă, straturile ascunse,
  spațiul hârtiei, OCS-ul oglindit pe polilinie, elipsă și bloc, MINSERT-ul, polilinia 3D, spline-ul periodic și arcul
  dintr-un bloc scalat neuniform.
- **Fișierele de mână** (`test/unit/dxf.test.ts`, 29 de probe):
  - refuzurile, perechile, unitățile;
  - fiecare entitate, spline-urile (de Boor scris în probă), blocurile;
  - ce se ascunde și ce se sare;
  - legarea, cercurile din bucăți, arcul plat;
  - codificările, plafoanele (o bombă de un milion de linii se oprește în sub 1 s).
- **Pachetul owner-ului din sonda s2** (`test/unit/dxf.referinta.test.ts`): R2007 și R12, cu valorile din `CITESTE.md`:
  - cercul Ø100 în (70; 227);
  - dreptunghiul cu caseta 215,88 × 179,28;
  - elipsa;
  - curba S cu 34,64;
  - litera N, de 20,00.
  La R12, elipsa are 112 arce, dar două perechi vecine stau pe același cerc (verificat și cu ezdxf), deci se unesc în 110.
  Tot acolo, dus-întors cu scriitorul nostru DXF: conturul amestecat, scris ca spline plus polilinie, se leagă la loc.
- **Fluxul** (`test/unit/import.dxf.test.ts`): formatul, previzualizarea, piesa unde e în fișier, unitatea aleasă, acțiunea.
- **E2e** (`test/e2e/import.spec.ts`, Edge): dreptunghiul din 4 linii închis, gaura, unitățile spuse, locul piesei și
  straturile salvate în proiect. Un DXF fără unități (țolul de 25,4 ori), refuzurile `binar` și `dxf`.

## Ce am respins

- **Pachetul `dxf`:** aduce lodash, iar semantica (unitățile, OCS-ul, blocurile, spline-urile) era oricum a noastră.
- **Desenul în colțul foii** (ca un SVG fără pagină): același desen ar ajunge altundeva decât din SVG-ul lui, iar în CAD
  piesele se așază față de origine.
- **Legarea peste straturi:** stratul e intenția omului; un contur din straturi diferite e neobișnuit.
- **Hașurile ca contururi:** conturul unei hașuri e de obicei desenat separat, iar dublura s-ar tăia de două ori.
- **DXF-ul binar:** rar, și orice program îl salvează ASCII.

## Limite și neprobat

- **Cercul importat e o cale din două arce** (ADR 0034, ADR 0035), deci găurirea (ADR 0087, doar pe forma `cerc`) nu-l ia încă.
- **Textul** (TEXT, MTEXT) nu se importă: se transformă în curbe în programul care l-a scris.
- **Spline-urile doar cu puncte de trecere** se sar, ca și cele periodice scrise fără punctele repetate (nodurile = n + 1, forma
  din memoria AutoCAD). Forma standard (n + p + 1 noduri) merge.
- **DXF-urile reale ale atelierelor:** probate pe corpusul ezdxf și pe pachetul sondei. Rămân fișierele owner-ului, din
  programele lui.
- **DWG:** doar mesajul „salvează ca DXF” (decizia din 07.10), într-o felie viitoare.

## Se redeschide dacă

- un DXF real iese altfel decât în programul care l-a scris;
- găurirea cere cercurile importate (cercul ca formă `cerc`, cu un ADR nou);
- textul DXF trebuie importat (fonturile SHX / TTF).
