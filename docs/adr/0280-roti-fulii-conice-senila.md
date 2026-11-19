# ADR 0280: Roțile și șenila în atelierul Easy 3Draw: roata de vehicul, fulia, roțile la 90°, șenila

**Starea:** acceptat pe 19.11.2026 („Da, fără TPU”: 1a, 2b, 3a), cu felia 3.Tj implementată în aceeași zi; propus pe 18.11.2026, la cererea owner-ului: „Uite alte tipuri de roti si un tip de sina pe care vreau ca
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
