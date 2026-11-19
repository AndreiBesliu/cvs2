# ADR 0280: Roțile și șenila în atelierul Easy 3Draw: roata de vehicul, fulia, roțile la 90°, șenila

**Starea:** acceptat pe 19.11.2026 („Da, fără TPU”: 1a, 2b, 3a); propus pe 18.11.2026, la cererea owner-ului: „Uite alte tipuri de roti si un tip de sina pe care vreau ca
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
