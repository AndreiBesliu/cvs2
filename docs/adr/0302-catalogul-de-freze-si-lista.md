# ADR 0302: Catalogul de freze și biblioteca ca listă, cu configuratorul la cerere

**Starea:** acceptat pe 24.11.2026, cu toate recomandările („Da, 1a–5a”). Propus în aceeași zi, în sesiunea cloud a liniei
frezelor (ramura `wip/16.A-freze`), la cererea owner-ului: „vreau să adaugi lista completă cu toate configurațiile posibile,
de exemplu, am un fișier exportat din ArtCAM, cu toate frezele de acolo. Vreau ca frezele să fie o listă ca în ArtCAM, și doar
dacă vrea userul și i se pare mai ok, atunci să comute pe configuratorul actual, care să poată configura orice tip de freză,
inclusiv pe cele desenate de user sau adăugate custom”, cu fișierul `FREZE.tdb` atașat. **Completează:** ADR 0300 (§2
felurile, §3 fereastra, §8 fișierul, §9 formele noi); **schimbă** ADR 0300 §2 (felurile fără CAM apar în bibliotecă, §2 de mai
jos) și §3 (fereastra e întâi o listă, §3 de mai jos).

## Ce e azi

- Biblioteca „Frezele mele” (ADR 0300) ține frezele plate, în V și de gravare; din 16.A↑a-2 vine cu șase freze standard, puse
  singure. Fereastra are lista în stânga, grupată doar pe feluri (Plate, În V, Gravare), cu căutarea, și editorul („configuratorul”)
  mereu în dreapta, cu silueta la scară.
- Felurile apar doar când CAM-ul le poate tăia (ADR 0300 §2): bila și toroidala vin cu 16.A↑e, profilul desenat cu 16.A↑f,
  valorile pe material cu 16.A↑g.
- Fișierul unui alt program se citește doar dacă formatul lui e public, fără reverse engineering (ADR 0300 §8; `CLAUDE.md`:
  ArtCAM e referință funcțională, fără cod, interfață, texte sau clipart copiate).

## Ce e în `FREZE.tdb`

Am privit doar textele din fișier, fără să-i descifrez formatul. E baza de scule a ArtCAM: un fișier binar, scris de
serializarea MFC a programului, fără documentație publică. Conține:

- grupuri pe materiale (Inch Tools, Aluminum, Steel, Wood or Plastic, High Density Urethane, Jewellery Tools cu Copper, Silver,
  Wax), cu aceleași freze în mai multe grupuri, fiecare cu valorile ei;
- felurile ArtCAM: freza dreaptă (slot drill / end mill), bila, V-ul, conica cu vârf plat (gravarea), conica cu vârf rotunjit,
  ogee, roman ogee, roundover, cele trei de panou ridicat (cove, straight, ogee) și forma desenată;
- cataloage ale unor producători, cu codurile lor de produs (Legacy Woodworking: 2701–2707, 3917–3923, 7501–7508, 7571–7575…,
  iCarver 40-928, ModelMaster), și descrierile grupurilor, scrise de ArtCAM.

**Nu se poate copia:** lista, numele și descrierile sunt conținutul ArtCAM și al acelor producători, iar un cititor al
formatului ar fi reverse engineering. Amândouă le exclude regula din `CLAUDE.md`. Ce se poate lua, ca referință funcțională:
că o bibliotecă bună are aceste **feluri**, mărimi standard în milimetri și în țoli, și grupuri pe care omul le alege.

## Decizia

### 1. Catalogul, al nostru

Un **catalog** în aplicație, scris de noi: felurile de freze pentru lemn și mărimile lor standard, în milimetri și în țoli,
cu valorile de pornire ale aplicației. E doar de citit; din el, omul pune în „Frezele mele” ce are în atelier (una, un grup
sau tot), iar copia din bibliotecă e a lui (o schimbă, o șterge). Numele vin din fel și mărimi (ca azi, „Plată Ø6”, „V90
Ø12,7”), fără coduri de producători.

Conținutul propus (de completat la răspunsuri):

| Felul | Mărimile |
|---|---|
| Plată (dreaptă) | Ø 1, 1,5, 2, 2,5, 3, 3,175 (1/8"), 4, 5, 6, 6,35 (1/4"), 8, 9,525 (3/8"), 10, 12, 12,7 (1/2"), 16, 19,05 (3/4") |
| Planare (plată mare) | Ø 19,05, 25,4, 31,75, 38,1, 50,8 |
| Bilă | Ø 1, 1,5, 2, 3, 3,175, 4, 6, 6,35, 8, 10, 12, 12,7 |
| Toroidală (colț rotunjit) | Ø 6 R 0,5 / R 1, Ø 8 R 1, Ø 10 R 1 / R 2, Ø 12 R 2 |
| V | 30°, 45°, 60°, 90°, 120°, 150°, pe Ø 6, 12, 12,7, 25,4, 31,75 (doar combinațiile obișnuite) |
| Gravare (V cu vârf plat) | 10°, 15°, 20°, 30°, 45°, 60°, cu vârful 0,1, 0,2, 0,3, 0,5, pe Ø 3,175 și 6 |
| Conică cu vârf rotund | 10°, 15°, 20°, cu raza vârfului 0,25, 0,5, 1 |
| Burghiu | Ø 1–12, din 0,5 în 0,5 |
| Roundover, ogee, roman ogee, panou ridicat, canelură (veining) | mărimile obișnuite, ca profiluri (siluete) parametrice |
| Desenată | nimic în catalog: silueta omului (16.A↑f) |

Valorile de lucru ale catalogului sunt ale aplicației, după fel și diametru (turația, avansul, plonjarea, pașii), marcate „de
pornire, de verificat pe material”; calculatorul avansului (16.A↑g) le poate reface.

### 2. Felurile pe care CAM-ul încă nu le taie

Catalogul le arată pe toate, cu „în curând” la cele fără CAM (bila și toroidala până la 16.A↑e, profilurile și desenata până la
16.A↑f, burghiul până la găurirea cu burghiu). Se pot pune în bibliotecă și edita, dar lista „Freza” din proiect le oferă doar
când CAM-ul le poate tăia (`motivFormaPeOperatie`). **Schimbă** ADR 0300 §2 („felurile apar doar când CAM-ul le poate tăia”):
acum apar în bibliotecă, nu și în proiect.

### 3. Fereastra: lista întâi, configuratorul la cerere

- **Lista** e vederea de pornire: un arbore cu grupuri (biblioteca omului și, dedesubt, catalogul), ca o bază de scule; o
  freză aleasă își arată fișa (silueta, mărimile, valorile), doar de citit, cu „Editează”, „Duplică”, „Șterge” și, în catalog,
  „Pune în frezele mele”.
- **Configuratorul** e editorul de azi, pentru orice fel (și cele desenate sau custom): „Editează” sau „Freză nouă” îl deschid
  peste fișă. Comutatorul „Listă / Configurator” rămâne ales (în browser), pentru cine vrea editorul mereu deschis.

### 4. Grupurile

Grupurile bibliotecii sunt ale omului: le face, le redenumește, mută frezele între ele (o freză într-un singur grup; fără grup,
„Fără grup”). Implicit, frezele stau grupate pe feluri, ca azi. Catalogul are grupurile lui, pe feluri. Grupul e un câmp al
frezei (`grup`), deci merge cu exportul, cu fișierul și cu contul, fără schemă nouă a documentului.

### 5. Materialele

ArtCAM ține aceeași freză în mai multe grupuri de material, cu valori diferite. Aici, aceeași nevoie o acoperă 16.A↑g: o freză,
cu valorile ei pe fiecare material (eticheta materialului foii), nu copii ale frezei. Până atunci, grupurile omului pot fi și pe
materiale, dacă așa vrea.

### 6. Frezele din ArtCAM ale owner-ului

`.tdb` nu se citește (§ „Ce e în `FREZE.tdb`”). Frezele lui intră prin:
- **catalog:** majoritatea frezelor obișnuite din fișier (dreptele, bilele, V-urile, conicele în țoli) au corespondent în
  catalog, deci se pun dintr-un clic;
- **CSV** (importul de azi, ADR 0300 §8): un tabel cu coloanele bibliotecii, scris de mână sau din Excel; dacă ArtCAM le poate
  scoate ca text, același import le citește.

### 7. Feliile

| Felia | Ce aduce |
|---|---|
| 16.A↑h-1 | Fereastra ca listă: fișa frezei alese, doar de citit, cu „Editează”, „Duplică”, „Șterge”; configuratorul la „Editează” și „Freză nouă”; comutatorul „Listă / Configurator”, ținut în browser |
| 16.A↑h-2 | Grupurile omului (`grup` pe freză, în fișier și în cont): arborele, „Mută în”, grupul nou, redenumirea |
| 16.A↑h-3 | Catalogul: felurile de azi (plată, planare, V, gravare) cu mărimile lor; „Pune în frezele mele” (una, un grup, tot) |
| 16.A↑h-4 | Felurile noi în bibliotecă și în catalog, cu siluetele și editorul lor (bila, toroidala, conica cu vârf rotund, burghiul, profilurile parametrice), „în curând” până la CAM-ul lor (16.A↑e, f) |

Fereastra ca listă (§3) și grupurile (§4) erau o singură felie la propunere; s-au despărțit la acceptare, ca fiecare să încapă
în jumătatea de zi a unei felii (`PLAN.md` §4), în ordinea din răspunsul 5.

Mărimea: catalogul e date (JSON în precache, ca manualul), nu JavaScript; fereastra crește cu arborele și fișa.

## Ce am respins

- **Lista ArtCAM, copiată** (numele, grupurile, descrierile, cataloagele producătorilor): conținutul altor programe și firme,
  exclus de `CLAUDE.md`.
- **Un cititor al `.tdb`:** formatul e binar și nedocumentat; a-l citi ar însemna reverse engineering.
- **Catalogul pus întreg în biblioteca fiecăruia:** sute de freze pe care omul nu le are, amestecate cu ale lui; catalogul
  rămâne separat, iar biblioteca vine doar cu frezele standard (16.A↑a-2).

## Întrebările pentru owner, cu recomandarea în față (la propunere)

1. **Lista ArtCAM:** a) catalog propriu, cu felurile și mărimile standard, fără nimic copiat din ArtCAM (recomandat); b) o
   excepție scrisă de la regula din `CLAUDE.md`, pe riscul tău (nu o recomand).
2. **Felurile fără CAM încă:** a) în catalog și în bibliotecă, cu „în curând”, dar nu în proiect până la CAM-ul lor
   (recomandat); b) doar cu felia lor de CAM (ADR 0300 §2, ca azi).
3. **Fereastra:** a) lista întâi, cu fișa doar de citit și configuratorul la „Editează” / „Freză nouă”, plus comutatorul
   „Listă / Configurator” (recomandat); b) configuratorul mereu deschis, ca azi, cu arborele în stânga.
4. **Grupurile:** a) ale omului, libere, implicit pe feluri (recomandat); b) doar pe feluri, fixe.
5. **Ordinea:** a) întâi fereastra ca listă (16.A↑h-1), apoi catalogul (h-2), apoi felurile noi (h-3) (recomandat); b) întâi
   catalogul.

## Răspunsurile owner-ului

Pe 24.11.2026, exact: „Da, 1a–5a”. Deci:

1. **a:** catalogul e al nostru, cu felurile și mărimile standard; nimic copiat din ArtCAM, iar `FREZE.tdb` nu se citește.
2. **a:** felurile fără CAM apar în catalog și în bibliotecă, cu „în curând”; lista „Freza” din proiect le oferă abia cu
   CAM-ul lor.
3. **a:** fereastra pornește ca listă, cu fișa doar de citit; configuratorul vine la „Editează” și la „Freză nouă”, iar
   comutatorul „Listă / Configurator” îl ține mereu deschis, pentru cine vrea.
4. **a:** grupurile sunt ale omului, libere; implicit, frezele stau pe feluri.
5. **a:** întâi fereastra ca listă, apoi grupurile (despărțite la acceptare, §7), apoi catalogul, apoi felurile noi.
