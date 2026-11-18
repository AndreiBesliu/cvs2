# ADR 0169: Rotițele dințate în atelierul Easy 3Draw: dinți drepți, oblici și în V

**Starea:** acceptat pe 18.11.2026 („Da, cu recomandările”: 1a, 2a) și implementat la felia 3.Th; propus în aceeași zi,
la cererea owner-ului: „vreau sa facem ceva in plus la plugin-ul 3d. vreau
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

## Răspunsurile

- **1a:** roți dințate care se prind între ele; fără rotițe moletate (3.Ti nu se face).
- **2a:** jocul dintre dinți vine din calibrare: cinci roți de probă de 16 dinți, cu 0,05 … 0,25 mm pe flanc, iar varianta aleasă
  stă în profilul imprimantei, lângă celelalte (implicit 3 = 0,15 mm).

## Implementarea (felia 3.Th, pachetul 18.9.1)

- **Motorul** (`extensii/trenulet/sursa/lego/lego.ts`): `profilRoata` (cremaliera rulată pe cercul de divizare, 600 de poziții,
  21 de raze pe flanc, ținut în memorie pe dinți, modul și joc), `conturRoata` (cu mijlocul capului pe cercul de cap: altfel
  coarda dintre capetele arcului scurta diametrul), `prismaRasucita` (exteriorul rotit strat cu strat, cel mult 0,8° pe
  strat; gaura dreaptă; capacele prin earcut pe aceleași puncte, deci corpul rămâne închis) și tipul `rotita`: dinții 8–80,
  felul (drepți, oblici, în V), unghiul 10–35°, sensul (dreapta = elicea urcă în sens trigonometric), grosimea 1–20 mm, gaura
  (ax în cruce, rotundă, fără), modulul 0,5–3. Peretele dintre gaură și dinți se socotește pe contur (colțurile crucii și
  coarda golului, nu doar razele): sub 0,8 mm, crucea se rotește pe sfertul ei unde peretele iese cel mai gros (la roata de 8,
  brațele spre goluri: 0,23 mm), cu un avertisment care spune peretele adevărat; sub 0,1 mm, roata iese fără gaură și o spune
  (modulul 0,5 cu 8 sau 12 dinți). Jocul: `joc_dinti` 0,15, `varianta_dinti` 3, `pas_dinti` 0,05. Setul de calibrare are cinci
  roți de probă (`calibrare_rotita_1` … `5`), cu numărul lor în cubulețe pe fața de sus. `distantaRoti(z1, z2, m)` pentru atelier.
- **Atelierul** (`planificator/atelier.ts`): „Roată dințată” în galeria pieselor de legătură, cu dinții (și scurtăturile 8, 12,
  16, 20, 24, 36, 40), felul, unghiul și sensul la oblici și în V, grosimea, gaura, modulul; „Se prinde cu…” arată distanța
  dintre axe și dacă e pe grilă, la jumătate de pas sau în afara ei; „Fă perechea” pune în listă ambele roți, a doua cu sensul
  opus (la oblici și la V: perechea se prinde doar așa). Varianta roților în profilul imprimantei, în fila Calibrare (pasul
  nou; „șapte numere”) și în README-ul arhivei. Textele, în engleză (35).
- **Pachetul:** 18.9.1, înregistrat în bibliotecă (versiunea și amprenta conținutului), cu descrierea „… roți dințate …”;
  18.9.0 a stat doar pe canalul `rotite`, iar conținutul nou de după privirea pe roata reală a cerut o versiune nouă.
- **Manualul:** cel al lui cvs2 descrie extensia doar ca fereastră (biblioteca, contul, limba, lucrările trimise), nu piesele
  atelierului, deci n-a primit rânduri; roata se explică în atelier (câmpurile, „Se prinde cu…”, avertismentul peretelui) și în
  fila Calibrare.

## Privirea pe roata reală (18.11)

Înaintea raportului, roțile au fost privite pe pagina planificatorului (din aceleași surse): în 3D, roata de 24 cu dinți
drepți, oblici și în V, roata de 8 cu gaură de ax, cea de 40 cu gaură rotundă și cea de 12 oblică; în plan, mărite la locul
de contact, perechile 8 + 24, 12 + 20 și 16 + 16, la patru faze pe un pas. Angrenarea: fără pătrunderi, cu distanța minimă
dintre roți de 0,257–0,283 mm (teoria: 0,282 pe flanc, 0,25 la picior). Două defecte, amândouă ale găurii:

- **Roata de 8 cu gaură de ax:** colțurile crucii (la 2,69 mm de centru) cădeau chiar sub goluri (piciorul, la 2,75 mm):
  **0,036 mm** de perete, iar avertismentul spunea 0,25 (din raze, fără colțuri și fără coarda golului). Acum crucea are
  brațele spre goluri: 0,23 mm, spus cum e.
- **Modulul 0,5 cu 8 sau 12 dinți:** gaura de 5 mm ieșea din roată, iar STL-ul era deschis (24–148 de muchii fără pereche),
  cu „0 mm” în avertisment. Acum roata iese fără gaură, închisă, și o spune.

Fiecare defect a devenit probă (căzută întâi pe codul vechi: 0,036 mm), cu trei otrăvuri noi (U19–U21).

## Feliile

- **3.Th:** roata (drepți, oblici, în V), gaura, modulul, perechea, jocul (după răspunsul 2), textele, manualul.
- **3.Ti** (doar la 1b): rotițele moletate.

## Probele

- **unitare** (`test/unit/trenulet.rotite.test.ts`, 9): jocul din calibrare; profilul (cercurile, grosimea pe divizare,
  conturul); perechile LEGO pe grilă (zero pătrunderi; jocul minim al flancului, 0,188 la 0,10, sau al piciorului, 0,25 la
  0,15); corpul închis la toate felurile și găurile, cu aceeași cutie și același volum; găurile (diferența de volum = aria ×
  h); răsucirea în sensul ales, V-ul sus ca jos, gaura dreaptă; marginile și avertismentul; peretele dintre gaură și dinți
  (măsurat pe corpul construit, spus cum e, gaura care nu încape lipsește); setul de calibrare.
- **e2e** (`test/e2e/trenulet.rotite.spec.ts`, 3): tipul în galerie, felurile, perechea pe grilă, „Fă perechea” cu sensul
  opus, STL-ul descărcat închis; roata de 8 și avertismentul ei (0,23 mm), modulul 0,5 cu gaura care nu încape, „fără gaură”,
  fila Calibrare; varianta 5 dă dinți mai subțiri.
- **otrăvuri** (`test/otravuri/3.Th.py`): 30 / 30 prinse (21 pe motor, 9 pe atelier), toate pe codul de după privirea pe
  roata reală, pe setul curat verde, în clona din afara Drive-ului.

## Probele cerute la propunere

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
