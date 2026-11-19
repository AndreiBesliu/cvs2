# ADR 0280: Roțile și șenila în atelierul Easy 3Draw: roata de vehicul, fulia, roțile la 90°, șenila

**Starea:** acceptat pe 19.11.2026 („Da, fără TPU”: 1a, 2b, 3a), cu feliile 3.Tj, 3.Tk, 3.Tl și 3.Tm implementate în aceeași zi; propus pe 18.11.2026, la cererea owner-ului: „Uite alte tipuri de roti si un tip de sina pe care vreau ca
pluginul sa le faca custom”, cu nouă poze ale pieselor lui LEGO. **Completează:** ADR 0169 (rotițele dințate: profilul,
jocul din calibrare, perechea), ADR 0168 (profilul imprimantei), ADR 0129 (Planificatorul ca extensie). Primul număr al
intervalului 0280–0289 al pluginului. Schița, cu desenele de principiu și întrebările:
<https://claude.ai/artifact/LDQXX4JQUW5S9kpVu4cWGK>.

**Ce e azi.** De la 3.Th, atelierul face roți dințate cu dinți drepți, oblici sau în V, pe axe paralele (ADR 0169). Nu
are roți de vehicul, fulii, roți care se prind la 90° și nici șenile.

## Ce e în poze

1. **Roata de vehicul** (pozele 1 și 4): janta cu spițe în Y și gaura de ax în cruce, anvelopa cu profil pe umeri.
2. **Janta mică** (poza 5): canale pe margine, care țin anvelopa; gaura de ax în cruce. Ca janta LEGO 55981 (18 × 14 mm),
   cu anvelopa 30,4 × 14.
3. **Fulia** (poza 3): roata cu canal pentru elastic sau curea. Ca LEGO 4185, Ø24.
4. **Roata conică** (poza 2): 20 de dinți, gaura rotundă. Ca LEGO 87407.
5. **Conicele duble** (poza 8): dinții teșiți pe ambele fețe; se prind pe axe paralele și la 90°. Ca LEGO 12 și 20 de
   dinți (din 1999).
6. **Roata coroană** (poza 9): 24 de dinți pe față; se prinde la 90° cu o roată dreaptă. Ca LEGO 3650.
7. **Șenila** („tipul de șină”, pozele 6 și 7): zale late cu două găuri de știft, legate între ele. Ca LEGO 57518, pe
   pinioanele 57519 (Ø40,4, 10 dinți) și 42529.

## Ce am cercetat

- Toate roțile dințate Technic au **modulul 1**, și conicele duble: raza pe divizare e 0,75 de știft (6 mm) la cea de 12 și
  1,25 (10 mm) la cea de 20. Deci perechile de la 3.Th rămân pe grila de 8 mm, iar la 90° se socotesc din aceleași raze.
- Mărimile nominale vin din numele pieselor (BrickLink): janta 55981 are 18 × 14 mm și ia anvelopa 30,4 × 14 (58090, plină;
  30391, cu banda de rulare); fulia 4185, Ø24; zala lată 57518 merge pe pinioanele 57519 și 42529.
- **Cotele fine** (pasul zalei, canalele jantei, profilul fuliei, teșitura conicelor duble) nu sunt publicate decât în
  fișierele bibliotecii LDraw (text; licența CC BY 2.0 sau 4.0, scrisă în fiecare fișier) sau se măsoară pe piesă.
- **Anvelopa** LEGO e din cauciuc. Tipărită din PLA nu se întinde pe jantă și nu prinde; din TPU (filament flexibil, pe care
  K1C îl tipărește) se pune ca originalul.

## Decizia (propusă)

1. **Șase tipuri noi** în galeria atelierului, toate cu gaura Technic (cruce, rotundă sau fără, cu jocurile de la
   calibrare) și cu toate variantele care pot sta împreună:
   - **Roata de vehicul** (3.Tj): janta (diametrul, lățimea, spițele: disc plin, 3–12 drepte, în Y, cu găuri; canalele
     pentru anvelopă) și anvelopa (diametrul exterior, lățimea, profilul: netedă, nervuri, blocuri pe umeri), în trei feluri:
     anvelopă separată din TPU, roată dintr-o bucată, doar janta (pentru o anvelopă LEGO). Potrivirea anvelopei pe jantă
     vine din calibrare (cinci inele de probă), ca jocul roților dințate.
   - **Fulia** (3.Tk): canalul în V (elasticul LEGO), rotund (inel O) sau plat cu margini (curea); diametrul, lățimea,
     spițele. „Cureaua”: pentru două fulii la o distanță, lungimea curelei, pe grilă sau nu.
   - **Roata conică** (3.Tl): perechea la 90° (dinții fiecăreia), unghiurile conurilor din raportul lor, dinții care se
     subțiază spre vârful conului; distanțele de montaj pe grila LEGO.
   - **Roata coroană** (3.Tm): dinții pe față, pentru o roată dreaptă de la 3.Th, la 90°.
   - **Conicele duble** (3.Tn): roata dreaptă de la 3.Th, cu dinții teșiți pe ambele fețe; se prind paralel (pe grilă) și la
     90°; 12, 20, 28, 36 de dinți, ca la LEGO, sau oricâți.
   - **Șenila** (3.To): zala (lățimea, pasul, găurile pentru știft, bolțurile), pinionul potrivit pasului, întinzătorul,
     lungimea șenilei între două roți; la alegere, lanțul tipărit dintr-o bucată, cu zalele deja legate.
2. **Motorul** (`lego.ts`), pe primitivele de la 3.Th:
   - plasa pe straturi primește o hartă a punctelor pe strat (azi doar rotirea, la `prismaRasucita`): micșorarea spre
     vârful conului (roata conică) și raza tăiată spre fețe (teșitura conicelor duble), cu același număr de puncte pe strat,
     deci corpul rămâne închis;
   - corpul rotit, pentru profilul jantei, al anvelopei și al fuliei;
   - corpuri închise care se suprapun, ca știfturile cărămizilor: dinții coroanei, blocurile anvelopei, ochiurile zalei.
3. **Calibrarea:** anvelopa pe jantă și zala pe bolț, câte cinci variante, în profilul imprimantei, lângă celelalte.
4. Previzualizarea 3D și STL-ul, ca azi; textele în română și în engleză.

## Întrebările (recomandarea întâi)

1. **Cu ce începem?**
   - **1a.** Roata de vehicul și fulia, apoi roțile la 90° (conica, coroana, conicele duble), apoi șenila (recomandat: roțile
     sunt în cele mai multe poze și merg la orice vehicul).
   - **1b.** Roțile la 90° întâi.
   - **1c.** Șenila întâi.
2. **Ai filament TPU (flexibil) pentru anvelope?**
   - **2a.** Da: implicit, anvelopa separată, din TPU, pe jantă.
   - **2b.** Nu încă: implicit, roata dintr-o bucată, din PLA; anvelopa din TPU rămâne la alegere.
3. **Cotele pieselor LEGO, ca cele tipărite să se prindă cu ale lui:**
   - **3a.** Din fișierele LDraw ale pieselor din poze, descărcate (text, câțiva kB fiecare, licența verificată pe fiecare);
     alegerea e și acordul pentru descărcare (recomandat).
   - **3b.** Le măsoară owner-ul cu șublerul, după lista cotelor, cu desenul fiecărei piese.
   - **3c.** Doar din numele pieselor (diametrul × lățimea) și din calibrare, fără potrivirea exactă.

## Răspunsurile

- **1a:** roata de vehicul și fulia întâi (3.Tj, 3.Tk), apoi roțile la 90° (3.Tl, 3.Tm, 3.Tn), apoi șenila (3.To).
- **2b:** owner-ul n-are încă TPU: implicit, roata dintr-o bucată, din PLA; anvelopa separată, din TPU, rămâne la alegere.
- **3a:** cotele din fișierele LDraw ale pieselor din poze, descărcate cu acordul owner-ului (alegerea 3a). Fișierele stau în
  afara repo-ului (`C:\Users\besli\cncvs2-lucru\ldraw`); din ele se iau doar cotele, cu sursa și licența fiecăruia scrise
  aici, la felia care le folosește.

## Felia 3.Tj, implementată: roata cu anvelopă (pachetul 18.10.0)

- **Cotele LEGO**, măsurate din biblioteca LDraw (<https://www.ldraw.org>, fișierele descărcate pe 19.11.2026, licența
  CC BY 4.0, scrisă în fiecare): `55982.dat` (Wheel Rim 14 x 18 with Axlehole) și `58090.dat` (Tyre 14/ 50 x 17 VR), cu
  profilul radial pe felii de 0,4 mm (`C:\Users\besli\cncvs2-lucru\unelte\ldraw\plat.py`). Janta are scaunul anvelopei
  la r 8,4 (Ø16,8, nu 18 cum spune numele BrickLink) pe 13,6 mm, cu un canal la mijloc; anvelopa are 30,4 × 13,6, alezajul
  la r 8,24–8,40, nervura lată (3,2 mm la bază, flancurile abrupte până la ±1,25 mm, apoi fundul aproape plat, până la
  r 7,45; profilul fin, pe felii de 0,1 mm), umerii teșiți drept de la r 15,15 la 14,0 pe 1,8 mm și trei canale de 0,4 mm
  pe bandă. Din fișiere s-au luat doar cotele; fișierele nu intră în repo.
- **Motorul** (`lego.ts`, `roata`): culcată pe pat, cu fața spre pat; dintr-o bucată (implicit, la 2b), doar janta (pentru
  o anvelopă LEGO sau din TPU) sau doar anvelopa (din TPU, cu nervura ca LEGO, deci se pune și pe janta LEGO). Janta:
  banda cu scaunul și canalul nervurii (de la −1,7 la +1,25 mm față de mijloc, cu fundul la r 7,35, deci 0,1 mm sub
  nervura LEGO, apoi teșit la 45° până la scaun, ca să se tipărească fără suport), peretele de sub canal 0,04·D (cel puțin
  0,85); fața (0,3 din lățime, 2–6 mm) plină, cu spițe drepte, în Y sau cu găuri (lățimea spiței 0,07·D, 1,8–4,5 mm),
  spițele doar dacă între butuc și bandă rămân 3,5 mm (de la janta de Ø20,4 cu gaura de ax; altfel fața plină, cu
  avertisment); butucul cu gaura Technic. Anvelopa: nervura și umerii ca LEGO, banda cu nervuri, netedă sau cu blocuri
  alternate pe umeri (unul la ~3,2 mm). Corpuri închise care se suprapun, ca știfturile cărămizilor.
  Varianta jantei (calibrarea) mută scaunul cu 0,1 mm pe diametru; setul de calibrare are cinci jante LEGO, Ø16,6 … 17,0.
- **Atelierul**: „Roată cu anvelopă” în galeria pieselor de legătură, felul, „Ca LEGO 30,4 × 14”, diametrele, lățimea,
  banda, fața (sub diametrul de la care încap spițele, fața plină spusă ca atare, iar numele nu le pomenește), gaura,
  „Pune janta și anvelopa”; varianta jantei în profilul imprimantei, în fila Calibrare (pasul nou, „opt numere”) și în
  README-ul arhivei; 40 de texte în engleză. Pachetul 18.10.0, cu descrierea „… roți dințate sau cu anvelopă …”.
- **Privirea pe roata reală** (capturile 3D ale variantelor, înaintea raportului): la roțile mari, butucul înalt cât roata
  stătea pe spițe de 2 mm, iar janta de Ø16,8 se numea „6 spițe în Y” deși ieșea plină. Acum fața e 0,3 din lățime, spițele
  și peretele benzii cresc cu diametrul, iar numele spune ce iese. Probele au mai găsit două: pragul spițelor cădea pe
  rotunjire (20,5 în loc de 20,4) și cercul cu număr impar de segmente scurta cutia (20,78 în loc de 20,8).
- **Nervura, la recenzia proprie:** secțiunea mărită a jantei peste profilul fin al nervurii LEGO a arătat că nervura e
  lată și cu fundul plat, iar teșitura canalului de atunci (pornită de la +0,55 mm) ar fi intrat în ea până la 0,46 mm
  pe rază (la +1,25 mm). Canalul ține acum nervura până la +1,25 mm și abia apoi se teșește; nervura anvelopei tipărite
  are forma celei LEGO; jocul minim dintre janta tipărită și nervura LEGO e 0,104 mm.
- **Probele:** unitare 8 (`trenulet.roata.test.ts`: corpul închis la 108 combinații, cotele LEGO cu janta tipărită sub
  punctele măsurate ale nervurii LEGO și nervura tipărită pe ele, varianta jantei, fața și spițele, găurile butucului,
  banda, marginile, setul de calibrare), e2e 3 (`trenulet.roata.spec.ts`). Otrăvurile (`test/otravuri/3.Tj.py`):
  34 / 34 (25 pe motor, 9 prin e2e), toate prinse.
- **Recenzia:** workflow-ul de recenzie cu agenți a fost refuzat de clasificatorul modului automat (nu l-am ocolit);
  recenzia proprie: 648 de combinații extreme, toate corpuri închise, și secțiunea mărită a jantei peste nervura LEGO, care
  a găsit teșitura canalului în nervură (reparată).

## Felia 3.Tk, implementată: fulia (pachetul 18.11.0)

- **Cotele LEGO**, din biblioteca LDraw (aceleași fișiere, descărcate pe 19.11.2026, licența CC BY 4.0): `4185a.dat`
  (Technic Wedge Belt Wheel - Not Reinforced) și `4185b.dat` (… - Reinforced), cu secțiunea r–z pe unghiuri
  (`C:\Users\besli\cncvs2-lucru\unelte\ldraw\sectiune.py`) și felia z = 0 (`felie.py`): Ø24, obada de 3,5 mm, butucul de
  4 mm (r 3,25; 3,75 la cel întărit), discul de 2,4 mm la mijloc, cu șase găuri de știft (Ø4,75 la r 8, de la 30°, din
  60 în 60 de grade), peretele de 0,5 mm sub canal; canalul în V (4185a) de la r 12 la ±1,3 mm de mijloc până la r 11 la
  ±0,65 mm, cu fundul plat; cel rotund (4185b), aproape un semicerc de r 1 (fundul la r 10,99).
- **Motorul** (`lego.ts`, `fulie`, `fulieCote`): culcată pe pat, cu fața jos. Obada are canalul la mijloc: în V (ca
  4185a, la scară cu lățimea cerută), rotund (semicercul cu raza cât jumătate din lățime, ca 4185b) sau plat, pentru o
  curea (scaunul cu marginile teșite la 45°, fără suport); obada se lărgește cât să cuprindă canalul, cu 0,4 mm de o
  parte și de alta; peretele de sub canal are 0,5 mm (ca LEGO) sau 0,02·D. Butucul, cu gaura Technic, are aceeași rază
  la toate găurile (cât cere crucea, cel puțin 3,75) și e cu 0,5 mm mai înalt decât obada (spre sus). Fața, de 2,4 mm
  (sau 0,3 din lățime, cel mult 6): plină, cu găurile de știft pe cercurile grilei (6·k pe cercul de 8·k mm, doar unde
  știftul trece de bandă cu 0,1 mm și gaura stă la 0,4 mm de butuc: de la Ø24) sau cu spițe drepte ori în Y (de la
  Ø17,8). Butucul și fața sunt acum funcții comune cu roata (`butucRoata`, `fataRoata`); ieșirile roții au rămas
  aceleași pe 1 351 de combinații (amprentele, înainte și după).
- **Cureaua** (`cureaua`): pentru două fulii cu axele la distanța C, lungimea curelei deschise pe fundul canalelor,
  2·√(C² − d²) + π(r1 + r2) + 2d·asin(d / C); fuliile se ating sub R1 + R2 + 0,5 mm.
- **Atelierul**: „Fulie” în galeria pieselor de legătură, „Ca LEGO Ø24”, canalul (în V, rotund, plat), diametrul,
  lățimea, lățimea canalului (sau a curelei), fața (doar ce încape, cu diametrul de la care încap găurile de știft),
  gaura; cureaua spre a doua fulie (diametrul ei, distanța dintre axe, butoanele grilei de 2 … 10 pași), cu textul
  grilei comun cu roțile dințate; „Fă perechea”; 30 de texte în engleză. Pachetul 18.11.0, cu descrierea „… roți dințate
  sau cu anvelopă, fulii …”.
- **Privirea pe fulia reală** (capturile 3D și secțiunea mărită peste 4185a și 4185b): obada și canalele cad peste cele
  LEGO; diferențele sunt cele alese pentru tipărire: fața stă jos (la LEGO, la mijloc), iar butucul iese 0,5 mm doar în
  sus (la LEGO, câte 0,25 mm de fiecare parte). Tot privind: câmpurile curelei, așezate întâi pe toată lățimea, au
  trecut în grila câmpurilor, iar textul curelei a rămas fără paranteze una în alta. Probele au mai găsit că raza
  butucului depindea de gaură (o gaură schimba și forma fuliei): acum e aceeași.
- **Probele:** unitare 8 (`trenulet.fulie.test.ts`: corpul închis la 180 de combinații, cotele LEGO 4185a punct cu
  punct, prin numărul de înfășurare pe o rază, pentru corpurile suprapuse; canalele rotund și plat; fața și pragurile
  ei; butucul; marginile; cureaua pe hârtie; calibrările extreme), e2e 3 (`trenulet.fulie.spec.ts`). Otrăvurile
  (`test/otravuri/3.Tk.py`): 37 / 37 (25 pe motor, 12 prin e2e), toate prinse din prima. La mutarea feței roții,
  otrăvurile 3.Tj U10 și U14 au trecut pe codul nou, iar 3.Th E06, rămasă VOID de la 3.Tj (lista câmpurilor de
  calibrare), a fost mutată și ea.
- **Recenzia:** fără agenți (recenzia cu agenți fusese refuzată de clasificator la 3.Tj, iar owner-ul a ales „Da,
  pornește 3.Tk”); recenzia proprie: corpurile închise pe 576 de combinații în proba de lucru (180 în proba unitară),
  secțiunea mărită peste 4185a și 4185b, amprentele roții (1 351, neschimbate) și VOID-urile tuturor listelor de
  otrăvuri ale pluginului (două noi, mutate; plus 3.Th E06, rămasă de la 3.Tj).

## Felia 3.Tl, implementată: roata conică (pachetul 18.12.0)

- **Cotele LEGO**, din biblioteca LDraw (aceleași fișiere, licența CC BY 4.0): `87407.dat` (Technic Gear 20 Tooth Bevel
  with Peghole), `32198a.dat` (… with Two Axlehole Slots) și `32269.dat` (20 Tooth Double Bevel). 87407 are Ø20,8 și 8
  mm înălțime (manșonul cu gaura de știft, r 3,6), gulerul din spate de r 4,4, dinții între 1,2 și 4,0 mm sub guler, iar
  conul din spate trece prin r 6,9 la 1,8 mm. Dinții din LDraw sunt stilizați (pene cu creasta la ~34°), deci profilul
  lor nu e unul de angrenare: din fișiere s-au luat butucul, gaura, conturul și reperul montajului, iar dinții sunt după
  teorie.
- **Montajul**: vârful conului lui 87407 e la 12 mm de gulerul din spate (1,5 pași), cu planul de divizare la 2 mm sub
  guler. Picioarele dinților la spate (r 9,1) cad la 1,1 mm de guler, cât banda dinților din LDraw (1,2), iar conul din
  spate, la 45°, trece prin r 6,9 la 1,8 mm, cât în LDraw. Regula, la orice pereche: planul de divizare la 2·m de fața
  din spate, deci vârful la m·(2 + z2 / 2) de ea, pe grila de jumătate de pas exact când perechea are 12, 20, 28, 36 …
  de dinți (mărimile LEGO; la 12 + 12, 8 mm, un pas).
- **Motorul** (`conica`, `conicaCote`, `prismaStraturi`): dinți drepți pe conul de divizare, tan δ = z / z2 (perechea la
  90°, axele întâlnite în vârful comun); profilul Tredgold: roata dreaptă cu z / cos δ dinți pe conul din spate (aceeași
  cremalieră și același joc din calibrare ca la rotițe), adus din desfășurare pe con și proiectat din vârf pe planul de
  divizare. Straturile, din spate spre vârf, micșorează conturul (dinții se subțiază spre vârful conului) și îl taie pe
  rază la conul din spate (harta punctelor pe strat), din 0,1·m în 0,1·m între picioarele și capetele dinților. Sub
  picioare, corpul coboară drept pe pat (cilindrul cercului de picior din spate), nu pe conul din spate: la un pinion (δ
  mic) conul acela ar sta aproape culcat, în consolă. Pe flanc, jumătatea dintelui scade spre cap cu cel puțin 0,0001
  rad (la subtăiere crește cu cel mult 0,0002), ca tăierea pe rază să nu plieze conturul. Lățimea dinților R / 4;
  butucul (r 3,89, același la toate găurile) cu alezajul, scurt (până la capătul dinților) sau lung, ca 87407 (până la
  4,3 mm de vârf: manșoanele unei perechi nu se ating); corpul dinților se oprește la un cerc cu 0,05 mm peste alezaj,
  acoperit de butuc.
- **Atelierul**: „Roată conică” în galeria pieselor de legătură, „Ca LEGO 20 (87407)”, „Ca LEGO 12”, dinții ei și ai
  perechii, modulul, gaura, butucul; montajul pe grilă (cât e fața din spate a fiecăreia de axa celeilalte), „Fă
  perechea” (roata și perechea ei, cu dinții schimbați între ele); 15 texte în engleză. Pachetul 18.12.0.
- **Privirea pe conica reală** (capturile 3D și secțiunea în planul axelor, cu perechea montată și peste 87407):
  conurile de divizare se întâlnesc în vârful comun, dintele unei roți intră în golul celeilalte, iar montajul cade
  peste cel LEGO (fața din spate la 12 mm de vârf, manșonul până la ~8 mm). Tot privind, pinionul (12 pentru 36) ar fi
  avut spatele în consolă (conul din spate la 18° de orizontală): acum corpul coboară drept sub picioarele dinților.
  Diferența aleasă pentru tipărire: spatele e plin până la r 9,1 (la LEGO doar gulerul de r 4,4 atinge grinda): între
  roată și grindă, o bucșă ½.
- **Probele:** unitare 6 (`trenulet.conica.test.ts`: corpul închis la 42 de combinații, montajul la cinci perechi,
  cotele LEGO 20 punct cu punct (dintele pe cercul de divizare, conul din spate, cilindrul, capul, butucul, gaura),
  perechea la 90° fără pătrundere în trei faze și prinsă (0,2 mm în plus n-o atinge, 0,9 mm da), găurile ca diferențe de
  volum, marginile), e2e 2 (`trenulet.conica.spec.ts`). Otrăvurile (`test/otravuri/3.Tl.py`): 25 / 25 (17 pe motor, 8
  prin e2e), toate prinse din prima.
- **Recenzia:** fără agenți; recenzia proprie: corpurile închise pe 300 de combinații în proba de lucru (42 în proba
  unitară), perechea montată la 90° pe roțile întregi (fără pătrundere, prinsă, la cinci perechi), secțiunea în planul
  axelor peste 87407 și VOID-urile tuturor listelor de otrăvuri ale pluginului (niciunul nou).

## Felia 3.Tm, implementată: roata coroană (pachetul 18.13.0)

- **Cotele LEGO**, din biblioteca LDraw (aceleași fișiere; licența CC BY 2.0 și CC BY 4.0): `3650a.dat`, `3650b.dat`,
  `3650c.dat` (Technic Gear 24 Tooth Crown). Fața de jos e la 3,2 mm sub originea piesei, planul de divizare la 0,8
  deasupra ei (deci la 4 mm de fața de jos), dinții până la r 13,19, butucul până la 8 mm, cu gaura de ax. Dinții din
  LDraw sunt drepți (3650 merge și ca roată dreaptă), deci profilul lor nu e cel tăiat de pinion: din fișiere s-au luat
  fața de jos, planul de divizare, raza dinafară și butucul.
- **Montajul**: planul de divizare la 4·m de fața de jos, deci axul pinionului la m·(4 + z1 / 2) deasupra ei: 8, 12, 16
  mm la pinioanele LEGO de 8, 16, 24 (pe grilă, la jumătate de pas, pe grilă). Axele se întâlnesc la 90°, deci unul se
  oprește înaintea celuilalt; butucul lung urcă până la 8·m, iar axul pinionului de 8 (și de 12) se oprește înaintea
  lui.
- **Motorul** (`coroana`, `coroanaCote`, `coroanaDinte`, `coroanaRaze`): pe fiecare rază r, dintele coroanei e ce rămâne
  după ce dintele pinionului (roata dreaptă de la rotițe, cu profilul ei, îngroșată cu jocul din calibrare pe fiecare
  flanc) trece prin gol. Pinionul se rotește cu φ, coroana cu φ·z1 / z2, iar un punct al secțiunii pinionului, la y de
  planul axelor, cade pe cilindrul de rază r la s = r·asin(y / r) − r·φ·z1 / z2 în lungul cercului; golul, la fiecare
  înălțime, e cât îl acoperă dintele în toate pozițiile lui. Baleiajul ține cât stă dintele sub capetele coroanei: un
  punct al lui la raza ρ și la unghiul δ de axa dintelui iese deasupra la φ = acos((r1 − m) / ρ) + |δ|. Jocul de la
  fundul golului: capul pinionului, prelungit cu 0,25·m, taie doar sub cel mai de jos punct al capului real, iar golul
  de acolo nu e mai larg decât la prima înălțime prin care trece capul (fără crestătură în flanc, deci fără consolă).
  Razele dinților: de la cea la care dintele iese mai subțire de 0,15·m (subtăierea, înăuntru) până la cea la care s-ar
  ascuți (afară), cel mult 2,5·m înăuntru și 2·m în afară; dinții mai scurți de un modul în lungul razei se spun. LEGO
  24 / 8: dinții de la 10,5 la 12,9 mm (la 3650, până la 13,19), 25,8 × 25,8 × 8.
- **Pe drum** (găsite cu proba 3D a perechii și cu secțiunile mărite): cu punctul secțiunii pus pe cilindru ca în plan
  (s = y − r·φ·z1 / z2), jocul scădea de la 0,3 la 0,19 mm la 24 / 16 și la 0,17 la 24 / 24; cu baleiajul de ±2,6 pași,
  pinionul de 40 ieșea pe la jumătate din zona dinților (capătul dinăuntru, cu o felie mai jos decât trebuie);
  prelungirea capului, rotită cu pinionul, tăia flancul coroanei unde pinionul real nu ajunge (0,04 mm din fiecare flanc
  pe planul de divizare, la 24 / 8, și mult mai mult jos). Acum dintele are pe planul de divizare, la raza de
  rostogolire, exact grosimea de pe hârtie (golul cremalierei pinionului), iar jocul e 0,3 mm la toate perechile
  încercate (24 / 8 … 80 / 40). Otrava înălțimilor (16 → 4) a scăpat întâi: proba nouă „plasa e înfășurătoarea” compară
  flancul plasei, la mijlocul dintre înălțimile tăierii, cu golul calculat direct din definiție (cel mult 0,024 mm; cu 4
  înălțimi, 0,10). Noul nume a făcut ambiguă otrava E01 a conicei (aceeași primă linie): redirecționată, prinsă din nou.
- **Atelierul**: „Roată coroană” în galeria pieselor de legătură, „Ca LEGO 24 (3650)”, dinții ei și ai pinionului (și
  repede: 8, 16, 24), modulul, gaura, butucul lung sau scurt; unde stă pinionul (axul, pe grilă; în dreptul dinților,
  cât de gros; butucul, dacă e în calea axului); „Fă perechea” (coroana și roata dreaptă a pinionului, cât de groasă o
  cer dinții coroanei, cu aceeași gaură); perechea care nu se prinde se spune și nu intră în listă; 14 texte în engleză.
  Pachetul 18.13.0.
- **Privirea pe coroana reală** (capturile 3D și secțiunile mărite: planul axelor peste 3650c și desfășuratele
  cilindrului la trei raze, cu pinionul montat, la 24 / 8, 24 / 24, 40 / 40): nicio suprapunere; dinții, trapeze la raza
  de rostogolire și afară, cu gât îngust înăuntru (urma capului pinionului). Pinionul de 8 cu gaură (de la 3.Th) are
  0,23 mm între gaură și piciorul dinților, ca la LEGO: motorul o spune.
- **Probele:** unitare 9 (`trenulet.coroana.test.ts`: corpul închis la 42 de combinații și refuzul perechilor care nu se
  prind, montajul, cotele LEGO 24 punct cu punct (dintele la raza de rostogolire pe planul de divizare, cu grosimea de
  pe hârtie, dinții de la rIn la rOut, discul, capetele, butucul, gaura), dinții fără consolă, plasa e înfășurătoarea,
  modulul 2, perechea la 90° fără pătrundere în opt faze și prinsă (0,25 mm în plus n-o atinge, 0,4 mm da, la 24 / 8, 24
  / 24, 40 / 40), găurile ca diferențe de volum, marginile), e2e 3 (`trenulet.coroana.spec.ts`). Otrăvurile
  (`test/otravuri/3.Tm.py`): 40 / 41 (U08 practic echivalentă).
- **Recenzia:** fără agenți: workflow-ul de recenzie (cinci găsitori pe dimensiuni, verificatori adversariali) a fost
  refuzat de clasificator („Undermining Oversight”), cu ultracode pornit. Recenzia proprie: corpurile închise pe 96 de
  combinații noi (jocurile 0,05 și 0,25, modulele 0,7 / 1,3 / 2), perechea 3D la jocurile extreme și la modulele 2 și
  1,3 (liberă sub 2·joc, prinsă peste), intrările ciudate, timpul (sub 0,8 s la 80 / 40, modulul 3), secțiunile mărite
  (24 / 8, 24 / 24, 40 / 40) și VOID-urile tuturor listelor pluginului (unul nou, 3.Tl E01, redirecționat).

## Feliile

- **3.Tj:** roata de vehicul (janta, anvelopa, cele trei feluri, calibrarea anvelopei).
- **3.Tk:** fulia (canalele, cureaua).
- **3.Tl:** roata conică (perechea la 90°).
- **3.Tm:** roata coroană.
- **3.Tn:** conicele duble.
- **3.To:** șenila (zala, pinionul, lanțul dintr-o bucată, calibrarea zalei).

O felie care cere o decizie nouă își ia ADR-ul din 0281–0289; altfel rămâne în acesta. 3.Ti (rotițele moletate, ADR 0169)
nu se face.

## Probele (la fiecare felie)

- **unitare:** corpul închis la toate felurile, cutia și volumul pe hârtie; potrivirile (anvelopa pe jantă, perechile la 90°
  fără pătrunderi, zala pe pinion); marginile;
- **e2e:** tipul în galerie, câmpurile, STL-ul descărcat închis;
- **otrăvuri**, ca la 3.Th;
- **privirea pe piesa reală**, mărită, înaintea raportului: la 3.Th așa s-a găsit peretele de 0,036 mm al roții de 8.

## Mărimea

Totul în pachetul extensiei (motorul și atelierul), nu în aplicație.

## Se redeschide dacă

O piesă tipărită nu se prinde cu cea LEGO (atunci: cotele, din LDraw sau măsurate), ori owner-ul cere alte piese (melcul,
cremaliera, diferențialul).
