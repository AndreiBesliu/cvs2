# Prag minim obligatoriu: tot ce fac ArtCAM și DeskProto

> **Hotărârea owner-ului (04.10.2026):** aplicația nouă trebuie să acopere un mix între ArtCAM (până la ArtCAM
> Premium 2018) și DeskProto. Mixul NU e produsul final; e pragul minim, verificat punct cu punct, peste care
> construim restul planului. Carveco se ignoră.
>
> **Reverificat pe 04.10.2026** doar pe documentația ArtCAM și DeskProto. Definițiile exacte, parametrii și
> criteriile de acceptare sunt în prezentare (secțiunea „Pragul, definit”).
>
> **Cum se folosește:** fișierul se copiază în repo-ul nou și se ține la zi. Fiecare rând capătă o stare
> (de făcut / în lucru / făcut + commit). Nimic nu se șterge din listă fără decizia owner-ului.
>
> **Limita legală:** cele două programe sunt referință FUNCȚIONALĂ. Nu se copiază cod, interfață, texte sau
> biblioteci de clipart, și nu se face reverse engineering.

Sursa: **S** = ArtCAM · **D** = DeskProto · **S+D** = amândouă · **peste prag** = nu există în niciunul, e
îmbunătățirea noastră. Etapa e propunerea mea; se decide la interviu.

## A. Proiectare 2D
| Capabilitate | Sursă | Etapă | Stare | Commit |
|---|---|---|---|---|
| Vectori, noduri, boolean, offset, aliniere | S | v1 | de făcut | — |
| Text, text pe cale, fonturi | S | v1 | de făcut | — |
| Verificarea și repararea vectorilor: deschiși, duplicați, intersecții, bucle, noduri prea apropiate | S | v1 | de făcut | — |
| Import 2D: DXF, AI / EPS (S+D); SVG (D); PDF vectorial, DWG, WMF, DGK / PIC (S) | S+D | v1 (decis 07.10: DXF, SVG, PDF și AI compatibil PDF; EPS și AI ≤ 8 prin cititor propriu limitat, cu refuz explicit; WMF; DWG doar mesaj în v1, nativ de decis în v1.x; DGK / PIC scoase, vezi „Scoase la reverificare”) | de făcut | — |
| Export 2D cu vectori reali: DXF, SVG, PDF (EPS da, AI nu: decis 07.10), la scara exactă, cu cercuri, arce și curbe păstrate ca entități și cu straturile păstrate; deschis editabil în alte programe (rând nou, cerut de owner; `BRIEF.md` §16.2) | S | v1 (decis 07.10) | de făcut | — |
| Cote (nici ArtCAM nu le are: doar rigle și măsurare) | peste prag | v1 (decis 06.10; era v1.x) | de făcut | — |
| Deformare în anvelopă (între două curbe), pentru vectori și reliefuri | S | v1 (decis 06.10; era v1.x) | de făcut | — |
| Trasare din imagine (bitmap → vectori) | S | v1 (decis 06.10; era v1.x) | de făcut | — |
| Nesting (așezarea pieselor pe placă) | S | v2 (decis 06.10; era v1.x) | de făcut | — |
| Mai multe foi de material într-un proiect (Sheets) și plăcuțe cu date variabile din CSV (Multi-Plate) — legat de sistemul de planșe | S | v1 (decis 06.10) | de făcut | — |
| Vectori decorativi: guilloche, umbră vectorială din relief, chenar vectorial | S | v2 | de făcut | — |
| Bibliotecă de clipart vectorial (proprie) | S | v2 | de făcut | — |
| Transformare și copiere: mutare, scalare, rotire, înclinare, oglindire, copiere în rețea, circulară și de-a lungul unei curbe (rând nou) | S | v1 | de făcut | — |
| Tăierea și conversia vectorilor: tăiere cu o linie, decupare la un contur, arce în loc de curbe, netezire, conversie în cercuri / dreptunghiuri (rând nou) | S | v1 (decis 06.10; era v1.x) | de făcut | — |

## B. Prelucrare 2D / 2.5D
| Capabilitate | Sursă | Etapă | Stare | Commit |
|---|---|---|---|---|
| Profil, cu urechi de susținere, intrări / ieșiri, direcție de tăiere | S+D | v1 | de făcut | — |
| Fileturi la colțuri interioare: dog-bone și T-bone | S+D | v1 | de făcut | — |
| Buzunar (curățare de suprafață), cu mai multe freze | S+D | v1 | de făcut | — |
| V-carve (inclusiv cu freză dreaptă pentru fund plat) | S+D | v1 | de făcut | — |
| Găurire | S+D | v1 | de făcut | — |
| Ordinea operațiilor și a vectorilor; câte un fișier separat pe sculă | S+D | v1 | de făcut | — |
| Gravare pe linie; gravare „inteligentă” cu colțuri ascuțite (smart engrave) | S+D | v1 (decis 06.10; era v1.x) | de făcut | — |
| Inlay în V (D) ȘI inlay cu pereți drepți, simplu sau în trepte (S), fiecare cu criteriul lui | S+D | v1 (decis 06.10; era v1.x) | de făcut | — |
| Caneluri (cu încrucișări împletite), teșire (bevel carving), Raised Round (adâncitură cu profil) | S | v1 (decis 06.10; era v1.x) | de făcut | — |
| Freze de profil desenate de utilizator; roundover cu offset față de interior | S | v1 (decis 06.10; era v1.x) | de făcut | — |
| Transformarea traseelor calculate: mutare, rotire, oglindire, copiere, unire | S | v1 (decis 06.10; era v1.x) | de făcut | — |
| Traseu de textură direct din forma frezei, fără relief | S | v1 (decis 06.10; era v2) | de făcut | — |
| Tăieri ghilotină (grilă de tăieturi drepte, nesting aliniat); găurire cu mai multe burghie simultan (drillbanks) | S | v1 (decis 06.10; era v2; 07.10: găurirea multiplă se acceptă pe simulare și pe octeții postului, fiindcă owner-ul n-are bancă de burghie) | de făcut | — |
| Laser: tăiere / gravare, plus laser 3D în felii pe Z | S+D | v1 (decis 06.10; era v2; 07.10: laserul owner-ului are controler Ruida, deci ieșirea e export vectorial pentru LightBurn / RDWorks, cu feliile pe Z ca straturi sau fișiere; G-code de laser pentru GRBL în v1.x) | de făcut | — |
| Asistent 2D pentru mobilier: CSV + DXF pe straturi → nesting, șabloane, rapoarte, etichete | S | v2 | de făcut | — |

## C. Modelare de relief 2.5D / 3D
| Capabilitate | Sursă | Etapă | Stare | Commit |
|---|---|---|---|---|
| Relief din imagine (gri → înălțime) | S+D | v1 | de făcut | — |
| Alinierea pixelilor imaginii cu grila de calcul (fără „riduri” moiré) | D | v1 | de făcut | — |
| Litofanie (relief din fotografie, pentru lumină) | D | v1 (decis 06.10; era v1.x) | de făcut | — |
| Editor de forme: din vector → cupolă, rotunjit, unghi, plan; înălțime, unghi, limită; Zero / Zero Rest | S | v1 (decis 06.10; era v1.x) | de făcut | — |
| Combinarea reliefurilor: adună, scade, păstrează înalt / jos, înlocuiește; Multiply între straturi | S | v1 (decis 06.10; era v1.x) | de făcut | — |
| Extrudare de-a lungul unei căi, cu profil | S | v1 (decis 06.10; era v1.x) | de făcut | — |
| Two Rail Sweep; Spin (profil rotit în plan, pe 360° sau între unghiuri); Turn (formă strunjită) | S | v1 (decis 06.10; era v1.x) | de făcut | — |
| Relief din text | S | v1 (decis 06.10; era v1.x) | de făcut | — |
| Operații: scalarea înălțimii, negativ (male / female), offset, netezire, limită, plan înclinat | S | v1 (decis 06.10; era v1.x) | de făcut | — |
| Estompare (liniară, radială, între contururi) și pante pe pereți (draft, cu unghi) | S | v1 (decis 06.10; era v1.x) | de făcut | — |
| Conturul vectorial al reliefului (pe interval de înălțime); tăiere după culoare; magic wand | S | v1 (decis 06.10; era v1.x) | de făcut | — |
| Export relief ca STL / OBJ (deschis sau închis cu bază plană), cu toleranță | S | v1 (decis 06.10; era v1.x) | de făcut | — |
| Rezoluție: cel puțin 4000 × 4000 de puncte (16 milioane), cu editare fluidă | S | v1 (decis 06.10; era v1.x) | de făcut | — |
| Îmbinări: contour blend, 3D blend, mirror-merge, relief lipit pe vector, cookie cutter | S | v1 (decis 06.10; era v2) | de făcut | — |
| Straturi bitmap ca suprafață de desen; forme ridicate direct din culori | S | v1 (decis 06.10; era v2) | de făcut | — |
| Sculptare: netezire locală, adăugare / scoatere material, ștergere, întindere (smudge) | S | v1 (decis 06.10; era v2) | de făcut | — |
| Straturi de relief: combinare, vizibilitate, ordine | S | v1 (decis 06.10; era v2) | de făcut | — |
| Relief pe două fețe (back relief) și prelucrare cu întoarcere (flip machining) | S | v1 (decis 06.10; era v2) | de făcut | — |
| Relief din model 3D (bas-relief din STL), siluetă | S | v1 (decis 06.10; era v2) | de făcut | — |
| Texturi pe relief, flux de textură, țesătură (weave) | S | v1 (decis 06.10; era v2) | de făcut | — |
| Analiza reliefului: hartă de înălțimi și hartă de pante (gradient) | S | v1 (decis 06.10; era v2) | de făcut | — |
| Relief ↔ imagine gri pe 16 biți; simularea salvată ca strat de relief | S+D | v1 (decis 06.10; era v2) | de făcut | — |
| Suprafața, volumul și greutatea reliefului (date pentru ofertă) | S | v1 (decis 06.10; era v2) | de făcut | — |
| Bibliotecă de clipart de relief (proprie) | S | v1 (decis 06.10; era v2) | de făcut | — |
| Relief de portret din fotografie de profil (Face Wizard) | S | mai | de făcut | — |

## D. Prelucrare 3D a modelelor
| Capabilitate | Sursă | Etapă | Stare | Commit |
|---|---|---|---|---|
| Import 3D din rețele de triunghiuri: STL, OBJ, 3MF, 3DS, VRML, DXF 3D; poziționare, scalare, oglindire, rotire, alegerea feței | S+D | v1 | de făcut | — |
| Import de modele cu suprafețe exacte: IGES, STEP, 3DM, Parasolid, SolidWorks, Inventor și altele (rând nou) | S | mai | de făcut | — |
| Degroșare 3D (în trepte Z) | S+D | v1 | de făcut | — |
| Finisare paralelă (la orice unghi) | S+D | v1 | de făcut | — |
| Animația traseului: freza care se mișcă pe traseu, pas cu pas, cu viteză reglabilă și glisor | S+D | v1 | de făcut | — |
| Timpul estimat, afișat imediat după fiecare calcul, și rezumatul jobului | S+D | v1 | de făcut | — |
| Finisare: încrucișată, spirală, spirală în cutie, circulară, radială, bloc, offset 3D (start din interior sau din exterior), Z constant (waterline), doar contur; legături pe suprafață | S+D | v1.x | de făcut | — |
| Pas lateral din înălțimea crestei (scallop), cu freză bilă / dreaptă / V / toroidală | peste prag | v1.x | de făcut | — |
| Rest machining 3D | S | v1.x | de făcut | — |
| Zone: limitate (dreptunghi sau vector), libere, imbricate (cu găuri), contur automat al modelului, sărirea zonei din jur | S+D | v1 (decis 06.10; era v1.x) | de făcut | — |
| Punți de susținere în 3D | S+D | v1.x | de făcut | — |
| Avans adaptat: redus automat la tăiere cu toată lățimea și optimizat pentru volum constant de material scos (Optifeed) | S+D | v1.x | de făcut | — |
| Detectarea coliziunii cu mandrina (collet) și cu motorul | D | v1 (decis 06.10; era v1.x) | de făcut | — |
| Vizualizarea zonelor inaccesibile (undercut) | D | v1 (decis 06.10; era v1.x) | de făcut | — |
| Decupare 3D: profil cu Z absolut în jurul piesei sculptate, cu punți și intrări / ieșiri | S | v1 (decis 06.10; era v1.x) | de făcut | — |
| Piese mari segmentate pe dale (toolpath panelling) | S | v1.x | de făcut | — |
| Frezare inversă: din pozitiv în matriță negativă (ArtCAM pentru reliefuri, DeskProto pentru modele STL) | S+D | v2 | de făcut | — |
| Model mai înalt decât freza sau decât placa: construit din felii (după grosime sau după numărul de felii) | S+D | v1 (decis 06.10; era v2) | de făcut | — |
| Proiectarea curbelor 2D, a traseelor și a imaginilor pe o suprafață 3D (gravură pe relief) | S+D | v2 | de făcut | — |

## E. Axa a 4-a și mai multe fețe
| Capabilitate | Sursă | Etapă | Stare | Commit |
|---|---|---|---|---|
| Rotativ continuu: trasee înfășurate pe cilindru ȘI trasee reale în jurul modelului 3D, testate separat | S+D | v1.x (decis 06.10; era v2) | de făcut | — |
| Axa a 4-a indexată: prelucrare pe fețe la unghiuri fixe, într-un singur fișier | S+D | v1.x (decis 06.10; era v2) | de făcut | — |
| Prelucrare pe două fețe / mai multe fețe, cu știfturi de aliniere | S+D | v1.x (decis 06.10; era v2) | de făcut | — |
| Post-procesoare cu axa A / B | S+D | v1.x (decis 06.10; era v2) | de făcut | — |
| 5 axe indexat (3+2), pe mașini cu ambele rotații în piesă | D | mai | de făcut | — |

## F. Producție și interfață
| Capabilitate | Sursă | Etapă | Stare | Commit |
|---|---|---|---|---|
| Simulare 3D a materialului: 3 axe în v1, apoi rotativ | S+D | v1 | de făcut | — |
| Bibliotecă de freze cu geometrie reală (dreaptă, bilă, toroidală, V, gravare, profil, formă desenată) | S+D | v1 | de făcut | — |
| Trimiterea directă la mașină (senderul) | D | v1 | de făcut | — |
| Calcul pe mai multe fire (workers) | D | v1 | de făcut | — |
| Șabloane de operații (aceleași setări pe alt desen) și calcul în lot | S | v1 (decis 06.10; era v1.x) | de făcut | — |
| Două interfețe: asistent pas cu pas pentru începători + interfața completă | D | v1 (decis 06.10; era v1.x) | de făcut | — |
| Scripting / macro-uri și asistenți proprii | D | v2 | de făcut | — |

## G. De decis de owner
| Capabilitate | Sursă | Etapă | Stare | Commit |
|---|---|---|---|---|
| Inele și bijuterii: verighete standard, model rotativ de inel, braț din profil pe două șine, închiderea capetelor, pietre și setări pavé, mașinarea inelelor (înlocuiește rândul «nișe») | S | mai | de făcut | — |
| Imagini latente în relief: un desen care se schimbă după unghiul din care privești (înlocuiește rândul «nișe») | S | v2 | de făcut | — |
| Pregătire pentru imprimare 3D: export STL al reliefului sau al ansamblului, platformă cu suporturi și puncte de contact (rând nou) | S | v2 (decis 06.10; era mai) | de făcut | — |

## Scoase la reverificare (nu există în ArtCAM sau DeskProto)
| Capabilitate | De ce |
|---|---|
| Relief generat cu AI, din text sau din imagine | Nu apare nici în documentația ArtCAM (help-ul ArtCAM 2018, manualul ArtCAM 2012), nici la DeskProto (tabelul de ediții, noutățile pe versiuni). Venea dintr-o sursă care nu mai e referință pentru prag. Cel mai apropiat lucru din ArtCAM e Face Wizard (relief de portret din fotografie de profil, automat, fără AI), pe care l-am adăugat ca rând separat. Dacă owner-ul vrea totuși relief generat cu AI, rândul se poate pune înapoi ca «peste prag». |
| Import DGK și PIC (formatele Delcam / ArtCAM, din rândul «Import 2D») | Decis de owner pe 07.10. N-au specificație publică (sonda `docs/faza2/sonde/s12-formate`), iar regula „fără reverse engineering” le exclude. În atelierele de lemn practic nu circulă. |
| Import EMF ca vectori (parte din rândul «Import 2D») | ArtCAM 2018 citește EMF doar ca imagine, la importul de relief; ca vectori citește WMF, nu EMF. DeskProto nu citește EMF. Rândul de import rămâne, fără EMF. |
| Felii după vector sau desenate manual (variantă din rândul «Model mai înalt decât freza: construit din felii») | Nu apare nici în ArtCAM 2018, nici în DeskProto: Slice Reliefs din ArtCAM taie relieful doar după grosimea feliei sau după numărul de felii, iar DeskProto face feliile din limitele pe Z ale fiecărui «part». Rândul rămâne, fără această variantă. |
| Formularea veche a rândului «Nișe: inele și bijuterii, imagini latente» (atribuită altui program) | Nu se scoate capabilitatea, ci doar formularea: ArtCAM 2018 are și uneltele pentru inele și pietre, și imaginile latente (documentate în ajutorul lui). Rândul e înlocuit de două rânduri cu dovezi ArtCAM, «Inele și bijuterii» și «Imagini latente în relief», tot în grupa G, unde owner-ul decide etapa sau le scoate explicit. |

## Ce înseamnă pentru arhitectură, din prima zi
- **Modelul de date** are de la început, pe lângă vectori, **reliefuri** (hărți de înălțime), **modele 3D** (mesh-uri)
  și **montaje de prelucrare** (fața, axa, originea, știfturile).
- **Nucleul** știe operații pe hărți de înălțime și transformă mesh-urile în hărți de înălțime și invers. *(Planul
  aprobat pe 07.10, decizia T11: în v1 calculul rulează pe procesor, în workere; GPU-ul doar desenează. Calculul pe GPU
  e candidat în v1.x.)*
- **Motorul CAM** are strategii 2D, 2.5D și 3D, pe 3 axe, apoi pe axa a 4-a. Lucrează cu freze cu geometrie reală.
- **Simularea** e pe hartă de înălțime pentru 3 axe și pe cilindru pentru rotativ, cu montaje multiple.
- **Post-procesoarele** suportă axele A / B și indexarea.
- **Testele:** oracolele fizice se extind la 3D: creasta, nicio scobitură în model, suprafața față de model.
