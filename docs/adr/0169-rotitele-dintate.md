# ADR 0169: Rotițele dințate în atelierul Easy 3Draw: dinți drepți, oblici și în V

**Starea:** propus pe 18.11.2026, la felia 3.Th, la cererea owner-ului: „vreau sa facem ceva in plus la plugin-ul 3d. vreau
sa pot face si rotite zimtate, ori drepte ori oblice (la marginea zimtata)”. **Completează:** ADR 0129 (Planificatorul ca
extensie), ADR 0164 (pluginul ca parte din cvs2), ADR 0168 (înălțimile și profilul imprimantei). Ultimul număr din
intervalul liniei (0160–0169); feliile următoare ale pluginului iau 0280–0289.

**Ce e azi.** Atelierul (`extensii/trenulet/sursa/lego/lego.ts`, `planificator/atelier.ts`) face piese compatibile LEGO ca
corpuri închise (STL), gata așezate pentru printare: cărămizi, pante, pene, piese rotunde și familia Technic (grinda,
cărămida Technic, axul, știftul, bucșa), cu jocurile alese la calibrare (gaura de ax în cruce 5,0 × 2,0 și gaura rotundă
Ø 5,0, la varianta 3). Nu are nicio roată dințată.

## Ce am cercetat

- **Roțile Technic** au modulul 1 (diametrul de divizare, în mm, e numărul de dinți) și unghiul de presiune de 20°. De aceea
  perechile obișnuite cad pe grila de 8 mm: 8 + 24, 16 + 16 și 12 + 20 la 16 mm; 8 + 40, 24 + 24 și 12 + 36 la 24 mm;
  24 + 40 la 32 mm. Altele cad la jumătate de pas: 8 + 16 și 12 + 12 la 12 mm, 16 + 24 și 20 + 20 la 20 mm.
- **Dinții oblici (elicoidali)** au în secțiune același profil, răsucit pe grosime. Doi oblici pe axe paralele se prind doar
  cu același unghi și sensuri opuse (stânga cu dreapta); merg mai lin, dar împing roata în lungul axului, cu atât mai tare cu
  cât unghiul e mai mare. **În V** (jumătate stânga, jumătate dreapta), împingerile se anulează, iar roata se printează la fel
  de ușor, fără suport. Un oblic nu se prinde cu o roată cu dinți drepți.
- **Printarea (FDM):** dinții de modul 1 ies bine cu duza de 0,4 și straturi de 0,1–0,2 mm; ca la găuri și știfturi, roțile
  printate au nevoie de joc între flancuri (pornim de la 0,1 mm pe flanc).

## Prototipul

`C:\Users\besli\cncvs2-lucru\unelte\proto-rotite\proto-rotite.mts` (în afara repo-ului, fără legătură cu codul extensiei):

- **Profilul**, evolventic, generat de cremaliera de referință, ca la frezarea prin rulare: la puțini dinți (8), subtăierea
  de la piciorul dintelui iese singură, fără formule separate.
- **Angrenarea**, verificată numeric pe un pas întreg de dinte, la 13 perechi (de la 8 + 8 la 40 + 40): **zero pătrunderi**,
  iar jocul minim e 0,188 mm la toate, exact jocul normal ales (2 × 0,1 × cos 20°).
- **Plasa**, corp închis (zero muchii fără pereche) la toate trei felurile: drepți, oblici (20°) și în V. Gaura de ax rămâne
  dreaptă prin mijloc, iar volumul e același (1 674,0 mm³ la roata de 24, groasă de 4 mm).
- **Timpul**: profilul în 10–20 ms, plasa în 6–33 ms. Roata de 24 oblică are ~18 000 de triunghiuri la 20 de puncte pe flanc
  (0,1 mm între ele), ~0,9 MB de STL.

## Decizia (propusă)

1. **Un tip nou în atelier, „Roată dințată”, în familia Technic**, cu toate variantele care pot sta împreună:
   - **dinții**: numărul (8–80; scurtăturile 8, 12, 16, 20, 24, 36, 40) și felul: **Drepți**, **Oblici** sau **În V**;
   - la oblici și în V: **unghiul** (implicit 20°, între 10° și 35°) și **sensul** (stânga / dreapta);
   - **grosimea** (implicit 3,8 mm, cât grinda subțire; la zecimi);
   - **gaura**: **ax în cruce** (implicit, se învârte cu axul), **rotundă** (se învârte liber pe știft sau pe ax rotund) sau
     **fără**, cu jocurile de la calibrare, ca la grindă și la bucșă;
   - **modulul**: implicit 1, compatibil LEGO; la alegere 0,5–3, pentru roți care nu se prind cu LEGO.
2. **Motorul**: `rotita(...)` în `lego.ts`, cu profilul din cremalieră (ca prototipul) și plasa răsucită pe grosime
   (`prismaRasucita`, primitivă nouă: conturul roții se rotește strat cu strat, gaura nu), închisă și orientată ca restul
   pieselor. Jocul pe flanc vine din profilul imprimantei (întrebarea 2).
3. **Perechea**, sub parametri: „Se prinde cu…”, cu dinții celei de-a doua roți; arată distanța dintre axe și dacă cade pe
   grilă (pe pas sau la jumătate). Butonul **„Fă perechea”** pune a doua roată în listă, cu sensul opus la oblici și în V.
4. **Previzualizarea**: roata în 3D, ca orice piesă; STL-ul și așezarea pe pat, ca azi.
5. Textele în română și în engleză, manualul.

## Întrebările (recomandarea întâi)

1. **„Rotițe zimțate”**: am înțeles **roți dințate care se prind între ele** (angrenaj, ca la LEGO Technic). Dacă ai vrut și
   **rotițe moletate** (marginea zimțuită, de învârtit cu degetele, fără să se prindă cu altă roată), le fac într-o felie a lor
   (3.Ti), cu aceleași feluri de zimți: drepți sau oblici.
   - **1a.** Roți dințate de angrenaj (recomandat).
   - **1b.** Și rotițe moletate, după ele.
2. **Jocul dintre dinți**, pe imprimanta ta:
   - **2a.** O roată de probă nouă în setul de calibrare (5 jocuri, de la 0,05 la 0,25 mm pe flanc), aleasă ca celelalte
     variante și ținută în profilul imprimantei (recomandat: se reglează o dată, pentru toate roțile).
   - **2b.** Un câmp „Jocul” la fiecare roată (implicit 0,1 mm).

## Feliile

- **3.Th:** roata (drepți, oblici, în V), gaura, modulul, perechea, jocul (după răspunsul 2), textele, manualul.
- **3.Ti** (doar la 1b): rotițele moletate.

## Probele (la felie)

- **unitare**: profilul (simetria, cercurile de cap și de picior, subtăierea la 8 dinți), angrenarea perechilor LEGO (zero
  pătrunderi, jocul normal = 2 × joc × cos 20°), plasa închisă la toate felurile, volumul, gaura dreaptă, sensurile opuse la
  perechea oblică, refuzurile (dinți prea puțini, modul în afara marginilor);
- **e2e**: tipul în atelier, parametrii, „Se prinde cu…”, „Fă perechea”, previzualizarea și STL-ul descărcat (închis);
- **otrăvuri**, ca la celelalte felii ale pluginului.

## Mărimea

Totul în pachetul extensiei, nu în aplicație: motorul ~+3 kB (profilul și plasa răsucită), interfața ~+1 kB.

## Se redeschide dacă

Roțile printate nu se prind bine cu cele LEGO originale (atunci: profilul, cu o deplasare, sau jocul), ori owner-ul cere și
alte feluri (cremaliera, roțile conice, melcul).
