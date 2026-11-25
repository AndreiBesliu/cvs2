# ADR 0330: Cotele pe desen și măsurarea

**Starea:** acceptat pe 24.11.2026, cu răspunsurile owner-ului din schiță: 1a–6a, plus nota „vreau cât mai multe opțiuni și
setări […] pentru sistemul de cote, dar nu le vreau în zona de design / proiectare; vreau o zonă de settings generale”
(secțiunea „Răspunsurile owner-ului”, la capăt: setările stau într-o fereastră nouă, „Setări”, §6). Propus în aceeași zi, în linia „cote” (ramura `wip/10.4-cote`, din `main` `41233474`, ADR-urile 0330–0339,
canalul `cote`), pornită de owner în aceeași zi („ce urmeaza in roadmap si nu a fost atins deloc si putem incepe”, apoi „ok,
scrie brief-ul pentru relief si pentru cote”). Felia 10.4↑, adusă din etapa 10, fără mașină. **Rândul din prag:** „Cote
(nici ArtCAM nu le are: doar rigle și măsurare)”, peste prag, v1 (decis pe 06.10; `ACOPERIRE-ARTCAM-DESKPROTO.md`, A).
**Completează:** ADR 0050 (ghidajele pe foaie, fără schemă nouă; lipirea), 0060 (linia de cotă a formelor ieșite din
foaie), 0088 și 0089 (exportul 2D), 0140 (Relief SingleLine), 0181 (felurile unei unelte în bara ei, ca la Cuțit), 0210
(foile, raportul foilor), 0272 (imaginile pe foaie, tot fără schemă nouă). **Schimbă:** glosarul planului (`PLAN.md`
§2, termenul 3, „element … sau cotă”): cota nu e un nod al piesei, ci stă pe foaie (§2); dacă owner-ul alege altfel
(întrebarea 1), rămâne cum scrie planul. **Schița**, cu machetele și întrebările (răspunsurile se salvează în pagină):
<https://claude.ai/artifact/BvsaqPKoKWsypCi1tphDvu>. **Codul:** felia 10.4↑a-1, pornită la răspunsuri.

## Ce e azi

- **Ce se poate măsura:** riglele foii, cu linia de cotă a formelor care ies din ea (`cotePeste` în
  `src/canvas/gradatii.ts`, ADR 0060); mărimea în mm cât se trage un mâner (ADR 0052 §4); coordonatele cursorului în bara de
  jos; raza, laturile și unghiurile formelor parametrice în panou (ADR 0053); mărimea pieselor în raportul foilor (ADR 0210
  §6). Nimic nu dă distanța dintre două puncte alese, unghiul dintre două laturi sau raza unui arc dintr-o cale, și nimic nu
  rămâne pe desen.
- **Lipirea** e pe axe (`src/geom/lipire.ts`): marginile și mijlocul cutiilor, capetele căilor deschise, ghidajele, foaia,
  grila. Lipirea pe un punct al formei (un vârf, mijlocul unei laturi, centrul unui arc) nu există.
- **Foaia ține deja ce nu se taie, fără schemă nouă:** ghidajele (ADR 0050 §1), imaginile (ADR 0272), eticheta materialului
  (ADR 0210 §1). O versiune care nu le știe le păstrează ca pe un câmp necunoscut. CAM-ul citește doar piesele și instanțele
  (`elementeFoaie`, `src/model/lume.ts`).
- **Exportul 2D** (ADR 0088, 0089): straturile sunt rolurile; tabelul DIMSTYLE are doar „Standard”, gol; nu se scrie text.
- **Relief SingleLine** e inclus (ADR 0140): un font de gravură, din trăsături deschise.
- **Uneltele:** 11 în bară, cu tastele V S N K B R O E L P X, plus T pentru traseu; D și M sunt libere. Bara de sus abia
  încape la 1280 px cu fontul lat (ADR 0181, felia 10.3↑j: butoanele doar cu iconiță au 8 px de fiecare parte).
- **Mărimea:** pornirea 114,7 / 120 kB (cu ușa și cu Atelierul), totalul 806,1 / 900 kB.

## Ce am aflat (cercetarea din 24.11)

Referință funcțională, fără cod, interfață sau texte copiate.

| Programul | Cotele | Legate de formă | Măsurarea fără urmă |
|---|---|---|---|
| ArtCAM (până la 2018) | nu are | — | riglele și măsurarea [citit, pragul] |
| Vectric Aspire / VCarve | lungimea (aliniată), orizontală / verticală, unghiul, arcul; înălțimea textului, fontul, zecimalele; se lipesc de vectori, ghidaje, colțurile și mijloacele foii | în Aspire-ul nou, o piesă redimensionată își schimbă cotele; capetele se trag pe alt punct [citit, ajutorul și „What's new” Vectric] | unealta Measure, care dă și raza unui arc [citit] |
| CorelDRAW | orizontală / verticală, paralelă, unghiulară, segmentul (distanța dintre capetele unei laturi), plus un callout cu text scris de om [citit, ajutorul Corel] | între noduri | — |
| Inkscape 1.x | doar din unealta de măsurare: „Mark dimension” lasă linia și valoarea, fără liniile de extensie [citit, forum și ghiduri] | nu | unealta Măsoară (M) [citit] |
| Onshape și CAD-urile de piese | tasta D pentru cote [citit, ajutorul Onshape]; cota „inteligentă”, după ce alegi: o latură, un cerc, două linii [știut, nerecitit azi] | da | — |
| AutoCAD / LibreCAD (DXF) | entitatea DIMENSION, cu blocul anonim `*Dn` care ține desenul ei: un program care o știe o recalculează, unul care știe doar blocurile o desenează din bloc [știut, referința DXF] | da, în CAD | DIST / MEASUREGEOM |

**Sonda ezdxf** (24.11, ezdxf 1.4.4, în `.tmp/venv-export2d`) [măsurat]: un DXF R2007 cu o cotă orizontală (0,0 → 120,0),
una aliniată (0,0 → 30,40), o rază (R25), un diametru (Ø50) și un unghi din trei puncte (90°) se recitește cu `recover`, cu
0 erori și 0 reparații; `get_measurement()`, calculată de ezdxf din punctele de definiție, dă 120, 50, 25, 50 și 90, iar
fiecare cotă are blocul ei (`*D1`…`*D5`: linii, capete, text). Deci exportul unei cote se poate proba cu valoarea pe hârtie,
de un cititor independent, fără să-i citim textul.

## Decizia (propusă)

### 1. Cota și măsurarea

- **Cota** e un desen de lucru, păstrat pe foaie, care arată o mărime a desenului: o distanță, o rază, un diametru, un unghi.
  **Nu se taie niciodată** (§8).
- **Măsurarea** e un fel al aceleiași unelte (§5): arată mărimea cât tragi (distanța, Δx, Δy, unghiul față de orizontală),
  lângă cursor și în bara de jos, și nu lasă nimic pe desen. Enter (sau „Păstrează”) o face cotă aliniată; Esc o șterge.

### 2. Unde stă: pe foaie, fără schemă nouă (întrebarea 1)

- `foaie.cote?: Cota[]`, lângă ghidaje și imagini, în mm ai foii (originea în colțul stânga-jos, Y în sus), ca ghidajele:
  - `{ id, fel, puncte, linie, text? }`; stilul nu e al cotei, ci al setărilor (§6);
  - `puncte`: 2 sau 3 ancore, după fel; `linie`: unde stă linia de cotă (distanța ei față de puncte, partea, locul cifrei);
  - ancora: `{ x, y, legatura? }`, iar legătura e `{ instanta, nod, loc, n }`. `loc` e un vârf k, mijlocul segmentului k,
    centrul (cercului sau al arcului k), un cadran al cercului ori un colț sau un mijloc al cutiei elementului; `n` e numărul
    segmentelor formei la legare (§3).
- **Fără v28:** cota nu schimbă nimic din ce se taie (regula din `src/model/document.ts` și cele trei precedente: ghidajele,
  imaginile, materialul). O versiune care nu știe cotele le păstrează ca pe un câmp necunoscut, fără să le deseneze, iar
  proiectul se deschide și în aplicația de azi. Numărul v28, rezervat pe 24.11 pentru cote, rămâne liber pentru altă linie.
- **Ușa:** cel mult 2 000 de cote pe foaie, id-uri unice, numere finite în ±`PLAFON.translatie`, felurile și locurile
  cunoscute. O cotă cu un fel necunoscut (a unei versiuni mai noi) se păstrează neatinsă și nedesenată, iar lista o numără.
  Judecata stă într-un modul adus doar pentru un document cu cote (ca a plăcuțelor, ADR 0210 §7): pornirea primește doar
  privirea „are cote?” și apelul.
- **Jurnalul:** o comandă nouă, `inlocuieste-cote` (foaia, lista veche, lista nouă), ca `inlocuieste-ghidaje`: orice
  schimbare a cotelor e un pas de anulare, cu inversa exactă.
- **Foile:** o cotă e a foii pe care a fost desenată. Pe pânza cu toate foile (ADR 0210 §1), foile vecine își arată cotele
  estompate.

### 3. Legată de formă (întrebarea 2)

- **Implicit, legată:** fiecare capăt ține locul lui de pe formă. La desenare, punctul se citește din lume, deci cota se
  mută și își schimbă cifra odată cu forma: la mutare, rotire, scalare, oglindire, înclinare, editarea din panou. Pe o piesă
  pusă de mai multe ori, cota e a instanței pe care a fost pusă.
- **Liberă, la cerere:** setarea „Cotele noi sunt legate” (Setări › Cotele, §6) și „Dezleagă” din panou. O cotă liberă e un
  desen fix.
- **Dezlegarea, cinstită:** un capăt se dezleagă singur când forma nu mai e pe foaia cotei (ștearsă, mutată pe altă foaie,
  desprinsă) sau când numărul segmentelor ei s-a schimbat (un nod adăugat sau scos: vârful k n-ar mai fi același). Capătul
  rămâne în ultimul punct văzut, scris în același pas de anulare cu comanda care l-a dezlegat (o comandă a cotelor pusă în
  lot dintr-un singur loc, aplicarea comenzilor, `executa` din `src/model/jurnal.ts`, înregistrată de modulul cotelor, ca
  jurnalul foilor). Cota dezlegată se desenează punctată, în roșul avertismentelor, iar panoul spune de ce; „Leagă din
  nou”: tragi capătul pe un punct.

### 4. Felurile

| Felul | Cum se pune | Felia |
|---|---|---|
| **Automată** (implicit) | după ce alegi: o latură dreaptă dă lungimea ei, un cerc diametrul, un arc raza, două laturi neparalele unghiul, două laturi paralele distanța dintre ele; două puncte dau o cotă orizontală, verticală sau aliniată, după unde duci linia de cotă (Shift: aliniată) | a (latura, două puncte), b (cercul, arcul, unghiul) |
| Orizontală, Verticală, Aliniată | două puncte, apoi locul liniei | a |
| Rază, Diametru | un cerc sau un arc; pe o elipsă sau pe o cubică, refuzat, cu motivul | b |
| Unghi | două laturi, sau trei puncte (vârful, apoi câte unul pe fiecare latură); unghiul din cele patru, după unde duci arcul | b |
| Lanț, Linie de bază | din capătul ultimei cote, în aceeași direcție / toate din același prim punct | d |
| Măsoară | două puncte, fără urmă (§1) | a |
| „Cotează selecția” (buton) | lățimea și înălțimea cutiei fiecărei piese alese, legate de colțurile cutiei | d |

### 5. Unealta (întrebările 3 și 4)

- **O singură unealtă, „Cote”**, tasta **D**, în bara uneltelor după Text (și unde stau uneltele în celelalte aranjamente,
  ADR 0250). **M** deschide aceeași unealtă pe „Măsoară”. Bara ei, ca a Cuțitului (ADR 0181): doar felurile, ca butoane cu
  iconiță (numele la trecerea mausului), și ⚙, care deschide Setări › Cotele. Nicio setare în Proiectare (nota owner-ului).
- **Pusul:** clic pe primul punct, clic pe al doilea, apoi mausul alege locul liniei de cotă; al treilea clic o pune. La
  Automată, un clic pe o latură, un cerc sau un arc (fără punct lipit sub cursor) alege forma. Esc renunță la cota începută.
- **Lipirea pe puncte, nouă** (pură, `src/geom/lipirePuncte.ts`): vârfurile, mijloacele laturilor, centrele cercurilor și
  arcelor, cadranele cercurilor, colțurile și mijloacele cutiei, colțurile și mijloacele foii, grila pornită; cu Ctrl, cel
  mai apropiat punct de pe contur. Un semn mic lângă cursor spune felul punctului (pătrat: vârf, triunghi: mijloc, cerc:
  centru, romb: cadran). Toleranța 8 px; doar formele de lângă cursor (indexul cutiilor), ca un import cu zeci de mii de
  vârfuri să rămână repede. Alt inversează lipirea, ca peste tot.
- **Alegerea și editarea:** cu unealta Cote, un clic pe o cotă o alege; mânerele ei sunt capetele, linia de cotă și cifra.
  Delete o șterge, săgețile mută linia de cotă, un capăt tras pe alt punct o leagă din nou. **Cu Selecția și cu celelalte
  unelte, cotele nu se aleg:** clicul trece la forma de sub ele, deci o cotă nu încurcă alegerea, mutarea sau transformarea
  formelor. Dublu clic pe o cotă, cu orice unealtă, trece la Cote, cu ea aleasă.
- **Panoul de proprietăți**, cu o cotă aleasă, doar ce e al ei: felul; valoarea, exactă, cu toate cifrele, și „Copiază”;
  legătura (legată sau dezlegată, cu motivul; „Dezleagă”); textul ei, cu `<>` pentru valoare (un prefix și un sufix:
  „4× Ø<>”, „<> pe ambele părți”); distanța liniei de cotă, în mm; Șterge. Stilul e în Setări (§6).
- **Lista** (arborele proiectului): sub foaia activă, rândul „Cote (N)”, cu ochiul (ascunde cotele foii pe pânză, nu le
  șterge) și cotele ei (valoarea, felul, „dezlegată”); un clic trece la Cote, cu cota aleasă.
- **Vederea:** „Arată cotele” (`vedere.cote`, în paletă, ținută în browser), pornită implicit.
- **Pe pânză:** în stratul de deasupra pânzei, ca riglele și ghidajele. Cifrele au mărimea lor în mm pe foaie, deci ce vezi
  e ce se exportă; sub 6 px pe ecran, cifrele se ascund (rămân liniile), iar valoarea apare la trecerea mausului. Culoarea
  cotelor e un token nou al temei (`--cota`), alta decât a formelor, a selecției, a ghidajelor și a traseului; cele
  dezlegate, punctate, în roșu.
- **Bara de sus la 1280 px**, cu fontul lat, în ambele limbi: butonul nou se măsoară la felia a-2. Dacă nu încape, unealta
  trece în extensia barei, lângă Taie și Convertește, cu aceeași tastă.

### 6. Setările cotelor, în fereastra „Setări” (nota owner-ului)

- **O fereastră nouă, „Setări”**, a setărilor generale ale aplicației: din meniul contului („Setări…”, după „Aspectul…”),
  din paletă (`vedere.setari`) și cu Ctrl+, (ca în alte programe); din ⚙ al uneltei Cote, deschisă direct la secțiunea
  Cotele. Secțiunile stau în stânga (pe telefon, o listă, apoi secțiunea pe tot ecranul); acum una singură, **Cotele**.
  Alte preferințe de azi (lipirea, grila, colțurile, ancora) se pot muta acolo mai târziu, la cuvântul owner-ului;
  „Aspectul…” rămâne fereastra lui. Fereastra vine la cerere, ca „Aspectul”.
- **Setările sunt ale aplicației, nu ale cotei:** se aplică pe loc tuturor cotelor, din toate proiectele, și se țin în
  browser (`cncvs2.cote`, JSON cu versiune), ca celelalte preferințe. În cont, sincronizate, mai târziu, la cuvântul
  owner-ului (ca frezele, ADR 0300 §7). Pe alt calculator, cotele arată după setările lui; exportul scrie stilul de atunci.
- **Fiecare grup are „Înapoi la implicit”**, iar fiecare setare o frază scurtă despre ce face, cu un mic desen viu (cota de
  probă, desenată cu setările de acum).
- **Ce se poate seta** (cât mai mult, după notă), fiecare în felia care îl folosește:

| Grupul | Setarea | Valorile | Implicit | Felia |
|---|---|---|---|---|
| Cifrele | Unitatea | mm, cm, inch, inch în fracții (1/2 … 1/64) | mm | a-3 (fracțiile: b) |
| | Zecimalele | 0–6 | 2 (inch: 3) | a-3 |
| | Zerourile de la coadă | tăiate („120”, „120,5”), păstrate („120,00”) | tăiate | a-3 |
| | Rotunjirea | la zecimale, sau la un pas (0,5; 0,25; 0,1…) | la zecimale | a-3 |
| | Separatorul zecimal | după limba aplicației, virgula, punctul | după limbă | a-3 |
| | Unitatea scrisă după cifră | fără, cu („120 mm”) | fără | a-3 |
| | Înălțimea cifrelor | 1–20 mm pe foaie | 3,5 mm | a-3 |
| | Locul cifrei | deasupra liniei, în linie (linia întreruptă), mereu orizontală | deasupra | a-3 |
| Liniile și capetele | Capetele | săgeată plină, săgeată deschisă, bară oblică, punct, fără | săgeată plină | a-3 |
| | Mărimea capetelor | 1–10 mm | 2,5 mm | a-3 |
| | Liniile de extensie | arătate, ascunse; golul față de formă (0–5 mm) și depășirea liniei de cotă (0–5 mm) | arătate; 1 și 2 mm | a-3 |
| | Distanța liniei de cotă față de formă, la punere | 2–100 mm | 10 mm | a-3 |
| Raza, diametrul, unghiul | Prefixele | „R”, „Ø” (de scris) | R, Ø | b |
| | Unghiurile | grade zecimale, grade-minute-secunde; zecimalele 0–4 | zecimale, 2 | b |
| | Linia razei | din centru, din afară, după loc | după loc | b |
| Comportamentul | Cotele noi sunt legate | da, nu | da | a-2 |
| | Unealta pornește cu | Automată, ultimul fel folosit | Automată | a-2 |
| | După o cotă | rămâne unealta Cote, înapoi la Selecție | rămâne | a-2 |
| | Cotele pe pânză | arătate, ascunse (ca „Arată cotele”) | arătate | a-3 |
| | Cotele foilor vecine | estompate, ascunse | estompate | a-4 |
| | Cifrele se ascund sub | 0–12 px pe ecran | 6 px | a-3 |
| | Culoarea pe pânză | a temei, aleasă | a temei | a-3 |
| Lipirea | Punctele | vârfurile, mijloacele, centrele, cadranele, cutia, foaia, grila (fiecare bifat) | toate | a-2 |
| | Toleranța | 4–20 px | 8 px | a-2 |
| | Punctul cel mai apropiat de pe contur | cu Ctrl, mereu, niciodată | cu Ctrl | a-2 |
| Măsurarea | Ce arată | distanța, Δx și Δy, unghiul (bife) | toate | a-2 |
| | Unde | lângă cursor, în bara de jos (bife) | amândouă | a-2 |
| Exportul | Cu cotele (implicitul bifei din „Exportă vectori”) | da, nu | nu | c |
| | Cotele în DXF | Cote (DIMENSION), Linii și cifre | DIMENSION | c |
| | Cifrele | trăsături, text | trăsături | c |
| | Stratul | numele (ASCII) și culoarea | COTE | c |
| | Grosimea liniilor în PDF și SVG | 0,05–1 mm | 0,1 mm | c |
| Raportul foilor | Cu cotele (implicitul bifei) | da, nu | nu | d |

**Cifrele** sunt trăsăturile lui Relief SingleLine (ADR 0140, OFL), extrase la build pentru semnele unei cote (cifrele, virgula,
punctul, minus, plus, R, Ø, °, ′, ″, ×, ±, /, spațiul), într-un tabel mic: aceleași pe pânză, în export și în „Fă desen din
cotă”, fără să încarce fontul. Un text al omului cu alte litere aduce fontul întreg, prin cititorul textului, la cerere.

### 7. Exportul (întrebarea 5; felia c)

- **„Exportă vectori”** primește bifa **„Cu cotele”**, oprită implicit (vectorii pentru laser sau pentru alt CAM rămân cum
  sunt azi; implicitul e în Setări). Sub ea, un rând spune felul ales în Setări („DIMENSION, cifrele ca trăsături”), cu
  legătura spre ele. Cotele intră pe un strat al lor, **COTE** (numele și culoarea, din Setări).
- **DXF**, după setarea „Cotele în DXF”:
  - **„Cote (DIMENSION)”**, implicit: entitatea DIMENSION, cu felul ei (rotită pentru orizontală și verticală, aliniată,
    unghiulară din două linii sau din trei puncte, rază, diametru), punctele de definiție exacte, valoarea scrisă, stilul
    `CNCVS2` (înălțimea, capetele, zecimalele, separatorul, zerourile) și blocul anonim `*Dn` cu desenul cotei. AutoCAD și
    LibreCAD o citesc ca cotă (o mută, o recalculează); un program care știe doar blocurile o desenează din bloc;
  - **„Linii și cifre”:** același desen, direct în ENTITIES, pentru programele care nu știu DIMENSION.
- **SVG** (grupul stratului, ca un strat Inkscape), **PDF** (stratul OCG „COTE”) și **EPS** (culoarea și comentariul): liniile,
  capetele și cifrele ca vectori.
- **Cifrele** ies implicit ca trăsături (identice oriunde, fără fonturi); după setare, **ca text** (MTEXT în DXF, `<text>` în
  SVG, Helvetica din cele 14 fonturi standard în PDF și EPS), editabil în alt program, dar desenat cu fontul lui.
- **Raportul foilor** (ADR 0210 §6): bifa „Cu cotele” la desenul fiecărei foi (felia d).

### 8. Cotele nu se taie (întrebarea 6)

- **Niciodată în program:** CAM-ul, postul, traseul, timpul, simularea, vederea 3D, verificarea, tăierea și conversia
  vectorilor, booleanul, legarea căilor și „Așază pe foi” nu le văd: stau pe foaie, nu în piese, iar o regulă de import
  (`dependency-cruiser`) oprește `src/cam`, `src/post`, `src/sim` și `src/jobs` să importe modulele cotelor.
- **Proba asta se scrie prima** (felia a, înaintea uneltei): pe corpusul CAM și pe plăcile 1, 2, 4 și 11, fiecare foaie cu
  cote de fiecare fel (legate, dezlegate, una cu fel necunoscut), G-code-ul exportat e octet cu octet cel fără cote (aceeași
  amprentă SHA-256); la fel traseul, timpul, verificarea vectorilor și raportul foilor fără bifă.
- **Gravarea, la cerere, prin desen:** „Fă desen din cotă” (felia d) face din cotă o piesă obișnuită pe foaie: liniile și
  cifrele ca trăsături deschise, capetele pline ca mici contururi închise, fără operație. Omul îi dă un rol (gravura pe
  linie, de exemplu), iar de acolo totul merge ca la orice formă. Cota rămâne, sau pleacă, cu bifa „Șterge cota”.

### 9. Mărimea

Unealta, lipirea pe puncte, desenul cotelor, panoul și judecata vin într-o bucată la cerere: la prima apăsare pe D sau M,
sau după prima randare a unui document cu cote. În pornire intră doar acțiunile din registru (unealta, „Arată cotele”),
tastele, privirea „are cote?” a ușii și comanda jurnalului: estimat +0,3 kB (114,7 → ~115,0 / 120). Bucata cotelor ~8 kB,
fereastra Setări ~3 kB (la cerere, ca „Aspectul”), exportul ~3–4 kB în bucata lui, deci totalul ~806 → ~821 / 900 kB.
Fiecare felie spune în raport cifrele măsurate.

### 10. Feliile

| Felia | Ce aduce | Se încearcă |
|---|---|---|
| 10.4↑a-1 | Proba G-code-ului (prima); modelul (cota, ancora, punctele și valorile pe hârtie, ușa cu judecata la cerere, comanda jurnalului); regula de import; fără interfață | unitarele |
| 10.4↑a-2 | Lipirea pe puncte; unealta Cote (D) cu Automată (latura, două puncte), Orizontală, Verticală, Aliniată și Măsoară (M), pe pânză; legată, dezlegarea în același pas de anulare; alegerea, mânerele, Delete; setările comportamentului, ale lipirii și ale măsurării (citite, încă fără fereastră) | canalul `cote` |
| 10.4↑a-3 | Fereastra Setări, cu secțiunea Cotele: cifrele, liniile și capetele, comportamentul (și pânza: arătate, pragul cifrelor, culoarea), lipirea, măsurarea, cu efectul lor pe desen; cota de probă; deschiderile (meniul contului, paleta, Ctrl+, și ⚙); manualul „Setările” și Ctrl+, | canalul `cote` |
| 10.4↑a-4 | Panoul cotei; rândul „Cote (N)” în listă, cu ochiul; „Arată cotele”; cotele foilor vecine, estompate sau ascunse (cu setarea lor) | canalul `cote` |
| 10.4↑b | Raza, diametrul, unghiul (și în Automată), cu setările lor; inch în fracții | canalul `cote` |
| 10.4↑c-1 | Exportul: „Cu cotele”, stratul COTE (numele, culoarea și grosimea, din Setări), DXF ca linii și cifre, SVG, PDF, EPS, cifrele ca trăsături; oracolul pe corpus | canalul `cote` |
| 10.4↑c-2 | DXF ca DIMENSION (implicit, cu blocul `*Dn` și stilul `CNCVS2`), cifrele ca text (MTEXT, `<text>`, Helvetica), cu setările lor („Cotele în DXF”, „Cifrele”) | canalul `cote` |
| 10.4↑d | Lanțul, linia de bază, „Cotează selecția”, „Fă desen din cotă”, cotele în raportul foilor, cu setarea lui | canalul `cote` |

Mai târziu, la cuvântul owner-ului: toleranțele scrise pe cotă (±0,1), lungimea unui arc sau a unui contur întreg, cota între
două foi.

## Probele (pe felii)

- **Prima:** G-code-ul cu și fără cote, octet cu octet (§8), plus regula de import. Verificată întâi că pică pe o otravă care
  trece cotele în lume.
- **Pe hârtie:** valorile (diagonala unui dreptunghi rotit 30°, raza unui arc cu bulge dat, diametrul unui cerc scalat 2,5,
  unghiul dintre două laturi date prin vârfuri); lipirea pe puncte (fiecare fel, toleranța, ținta cea mai apropiată, Alt,
  Ctrl); legătura după mutare, rotire, scalare, oglindire și înclinare; dezlegarea (ștergerea, altă foaie, nodurile
  schimbate) și punctul ei rămas, cu anularea; numerele (zecimalele, zerourile, virgula și punctul, inch); trăsăturile
  cifrelor față de Relief citit cu fontTools.
- **Ușa:** plafonul, id-urile, numerele, felurile necunoscute păstrate; un document fără cote neschimbat (corpusul de aur
  neatins: schema nu se schimbă); documentul cu cote trecut prin ușa de azi (`main`) le păstrează ca necunoscute.
- **Exportul** (oracolul independent, Python, nimic din `src/`): ezdxf citește fișierul cu 0 erori și 0 reparații; fiecare
  DIMENSION are felul și blocul ei, iar `get_measurement()` e valoarea pe hârtie; „Linii și cifre”: entitățile pe stratul
  COTE; PDF-ul prin PyMuPDF (stratul OCG „COTE”, căile lui); SVG-ul măsurat de Edge; EPS-ul prin Ghostscript.
- **Setările:** fiecare setare citită înapoi din browser, cu valorile din afara marginilor aduse la implicit; o setare
  schimbată redesenează cotele pe loc; „Înapoi la implicit”.
- **E2e (Edge):** D și M, fiecare fel, legarea (forma mutată, cifra nouă), dezlegarea, Delete, anularea, reîncărcarea, lista
  și ochiul, Selecția care trece prin cote, fereastra Setări (din meniul contului, din paletă, cu Ctrl+, și din ⚙); la
  1280 px cu fontul lat, în ambele limbi; pe telefon. **Un rând nou în meniul contului** se numără în `cont.spec.ts` și în
  proba tichetelor de pe emulatoare (`test/e2e-emulator/tichete.emulator.spec.ts`).
- **Otrăvurile** fiecărei felii, în clonă (`test/otravuri/10.4-*.py`).

## Ce am respins

- **Cota ca element al piesei** (`PLAN.md` §2, glosarul), cu v28: ar merge cu piesa (copiile, instanțele, plăcuțele),
  dar fiecare cititor al elementelor (CAM, verificarea, tăierea, booleanul, exportul, selecția) ar trebui s-o sară, iar o versiune
  veche ar refuza proiectul. Pe foaie, „nu se taie” e adevărat prin construcție (întrebarea 1, b).
- **O bifă „Gravează” pe cotă:** cota ar intra în CAM, deci în schemă (v28) și în toate probele de tăiere; „Fă desen din
  cotă” dă același rezultat cu formele de azi (întrebarea 6, b).
- **Cifrele dintr-un font al sistemului:** ar arăta altfel pe fiecare calculator și în fiecare export.
- **Doar măsurarea, fără cote păstrate** (ca ArtCAM): pragul cere cote.
- **Lipirea de fiecare vârf al tuturor formelor:** zeci de mii de ținte la un import mare; doar formele de lângă cursor.
- **Cotele cu mărime fixă pe ecran** (ca riglele): exportul și tiparul ar arăta altfel decât pânza.

## Întrebările pentru owner (doar ce se exclude), cu recomandarea în față (răspunse: 1a–6a, la capăt)

1. **Unde stă cota:**
   - **a (recomandat):** pe foaie, lângă ghidaje și imagini, fără schemă nouă; v28 rămâne liber;
   - b: în piesă, ca un fel nou de element (v28): merge cu piesa în copii și instanțe, dar o versiune veche refuză
     proiectul, iar fiecare cititor al elementelor trebuie s-o sară.
2. **Cota nouă, legată sau liberă** (amândouă există; aici e doar implicitul):
   - **a (recomandat):** legată: urmează forma, iar când nu mai poate, rămâne pe loc, dezlegată, punctată, în roșu;
   - b: liberă: un desen fix, legată doar la cerere.
3. **Cotele și unealta Selecție:**
   - **a (recomandat):** se aleg doar cu unealta Cote; cu Selecția, clicul trece la forma de dedesubt; dublu clic pe o cotă
     trece la Cote;
   - b: se aleg și cu Selecția, ca formele (în selecții amestecate, mutarea le ia cu ele, transformările le sar).
4. **Măsurarea:**
   - **a (recomandat):** în aceeași unealtă (D), felul „Măsoară”, cu M ca tastă directă: un singur buton nou în bară;
   - b: două unelte, Cote (D) și Măsoară (M), cu două butoane.
5. **Cotele în DXF** (amândouă există; aici e doar implicitul; „Cu cotele” rămâne oprită implicit):
   - **a (recomandat):** „Cote (DIMENSION)”: în AutoCAD și LibreCAD rămân cote;
   - b: „Linii și cifre”: le desenează orice program, dar în CAD nu mai sunt cote.
6. **Gravarea unei cote:**
   - **a (recomandat):** cotele nu se taie niciodată; „Fă desen din cotă” le face forme obișnuite, gravate cu un rol;
   - b: o bifă „Gravează” pe cotă, care o duce în program (v28, CAM-ul o vede).

Ordinea feliilor e cea din §10; dacă vrei exportul înaintea razei și unghiului, spune.

## Se redeschide dacă

- owner-ul vrea cotele să meargă cu piesa (pe fiecare instanță, în plăcuțe, în copii): atunci întrebarea 1, b;
- un program al owner-ului citește greșit DIMENSION sau stratul COTE;
- bara de sus nu mai încape la 1280 px cu fontul lat (§5: unealta trece în extensie);
- se cer cote 3D (pe relief, pe vederea 3D) sau toleranțe;
- owner-ul vrea stilul cotelor ținut în proiect sau în cont, nu doar în browser.

## Implementarea (10.4↑a-1)

24.11, pe ramura `wip/10.4-cote` (`472e6107`), fără interfață:
- **Proba scrisă prima** (`test/unit/cote.neatinse.test.ts`): pe tot corpusul CAM (`ajutor-corpus-cam.ts`, plăcile 1 și 2 și
  fiecare fel de lucrare, cu fiecare post, unitate și strategie) și pe placa 11 („Toate foile”), fiecare foaie primește nouă
  cote (orizontală, verticală și aliniată legate de vârf, cutie și mijloc; raza legată de centru și de cadran; diametrul;
  unghiul din trei puncte și dintre două laturi; una dezlegată; una cu un fel necunoscut). Exportul (octeții, SHA-256,
  avertismentele, fișierele), traseul, verificarea vectorilor și raportul foilor ies exact ca fără cote.
- **Modelul:** tipurile în `document.ts` (`Foaie.cote`, `Cota`, `AncoraCota`, `LegaturaCota`, `LocCota`, `LinieCota`;
  `PLAFON.cote` = 2 000); `src/model/cote.ts`, pur: `indexLume`, `punctAncora` (liberă; legată, din conturul în lume, cu
  cadranul pe axele elementului; dezlegată la forma lipsă sau la alt număr de segmente ori la un loc care nu mai e pe formă),
  `valoareCota` (fiecare fel, exactă; null pentru un fel necunoscut, laturi paralele sau de lungime zero).
- **Ușa:** `judecataCote.ts` (pe documentul brut; o legătură spre o formă care nu mai e rămâne bună), înregistrată în
  `schemaDocument.ts` (`problemaCote`; o listă goală nu cere judecata), chemată de `usaCurenta.ts` după urechi; ușa întreagă o
  aduce mereu, iar pornirea doar pentru un document cu cote (`cuCote`, în `proiectLocal.ts`, lângă plăcuțe).
- **Jurnalul:** `inlocuieste-cote`, cu inversa exactă; lista goală scoate câmpul (un proiect fără cote rămâne cum era).
- **Regula de import** `cam-fara-cote`: `src/cam`, `src/post`, `src/sim` și `src/jobs` nu importă `cote.ts` și
  `judecataCote.ts` (capcana: `test/capcane/jobs/importa-cote.ts`).
- **Cifrele:** unitare noi 18; unitarele ușii, documentului, foilor și jurnalului 3 546 / 3 546; regulile de import 21 / 21;
  otrăvuri 30 / 30 (`test/otravuri/10.4a1.py`). Pornirea 110,0 kB (+0,1; cu ușa 114,6, cu Atelierul 114,9 / 120), totalul
  807,6 / 900 kB (+1,5, judecata la cerere).
- **De ținut minte pentru a-2:** „Duplică foaia” copiază și cotele, cu legăturile spre instanțele foii vechi, deci pe foaia
  nouă ies dezlegate; la fel o cotă a cărei piesă se mută pe altă foaie. A-2 hotărăște dacă le leagă din nou.

## Implementarea (10.4↑a-2)

24.11, pe ramura `wip/10.4-cote`, la „continuă” al owner-ului:
- **Lipirea pe puncte** (`src/geom/lipirePuncte.ts`, pură, fără document): punctele numite (centrul, cadranul, vârful,
  mijlocul, cutia, foaia: la aceeași distanță, în ordinea asta), apoi punctul cel mai apropiat de pe contur (Ctrl, după
  setare), apoi grila. Doar formele cu cutia lângă cursor își fac punctele, o singură dată (`src/model/puncteCote.ts`, prin
  `punctLoc` din `cote.ts`, deci un capăt lipit e exact punctul citit de cotă după aceea; conturul se face o dată pe formă).
  Cadranele unui arc, doar cele de pe arc. Un punct de pe contur (Ctrl) e liber: `LocCota` n-are un loc „pe contur”.
- **Desenul cotei liniare** (`src/model/desenCota.ts`, pur, pentru pânză acum și pentru export în felia c): linia de cotă
  la `d` mm pe normală față de **mijlocul** celor două puncte (nu față de primul: schimbate între ele, cu `d` invers, dau
  același desen), extensiile cu golul de 1 mm și depășirea de 2 mm (niciuna pentru un punct chiar pe linie), capetele de
  2,5 mm (în afară sub două capete), cifra de 3,5 mm deasupra liniei, citibilă. Valorile din tabelul §6, ca implicite, până
  la fereastra Setări (a-3). Cifrele se scriu deocamdată cu fontul aplicației; trăsăturile lui Relief vin cu exportul (c).
- **Setările citite** (`src/app/setariCote.ts`, `cncvs2.cote`, câmp cu câmp, cu marginile aduse la implicit):
  comportamentul (legate, felul de pornire, după o cotă), lipirea (felurile, toleranța în px, conturul), măsurarea (ce și
  unde). Fereastra care le scrie vine în a-3.
- **Dezlegarea în același pas** (§3): `executa` din `jurnal.ts` cheamă funcția înregistrată de `src/model/jurnalCote.ts`
  (care vine cu judecata cotelor, deci cu orice document care are cote, și cu unealta); un capăt legat înainte și dezlegat
  după își scrie ultimul punct văzut, iar comanda și scrierea sunt un singur `lot`. O foaie cu aceleași instanțe și aceleași
  piese nu se mai judecă. **„Duplică foaia”** (cu piese noi sau legate) **leagă cotele copiei de instanțele ei**
  (`coteCopiate`); întrebarea rămasă de la a-1 e închisă așa.
- **Unealta** (`src/app/Cote.tsx`, cu `cote.css`, o bucată la cerere): desenul cotelor foii active (dezlegate punctate, în
  roșu; sub 6 px, cifrele se ascund), felurile în bara de sus, pusul în trei clicuri, Automată pe o latură (o latură dreaptă
  sub cursor, fără punct numit), Măsoară cu „Păstrează” / Enter (o cotă aliniată la 10 mm), alegerea cu clicul pe linia de
  cotă sau pe cifră (nu pe extensii: ele pleacă chiar de lângă vârfuri), capetele trase (legate din nou), linia trasă sau
  mutată cu săgețile, Delete, dublu clic din orice unealtă (afară de Pen și Cuțit). **Un punct numit al unei forme bate cota
  de sub el:** un clic pe un vârf începe o cotă nouă, chiar dacă vârful e pe linia altei cote. Mânerul cifrei e linia: un
  loc al cifrei pe linie (`linie.t`) nu e încă în model.
- **Bara de sus la 1280 px:** cu butonul Cote printre unelte, bara cu Transformarea ieșea din fereastră cu 16 px (fontul lat,
  română); butonul stă deci **în extensia barei, după Convertește** (§5), cu tasta D în colț. Felurile uneltei stau în bara
  de sus, doar cu ea aleasă, și încap (proba, în ambele limbi).
- **Acțiunea** `foaie.cote` (la cerere, ca ghidajele): lista nouă, judecată ca la ușă (`problemaCote`), un pas de anulare.
- **Manualul:** capitolul „Cotele și măsurarea” (ro, en) și tastele D și M în capitolul scurtăturilor.
- **Cifrele:** unitare noi 33 (lipirea 11, desenul 11, setările 4, dezlegarea 7); e2e noi 7 (`cote.spec.ts`), plus probele vechi potrivite (registrul și paritatea calculului cu `foaie.cote`, manualul cu 116 uși și 42 de capitole); otrăvuri 35 / 35 (`test/otravuri/10.4a2.py`: 29 unitare, 6 e2e; șapte au scăpat întâi și sunt prinse după probele întărite). Pornirea 110,0 → 110,1 kB (cu ușa 114,6 → 114,8, cu Atelierul 115,0 → 115,1 / 120: în pornire stau doar tastele, acțiunea `foaie.cote` și textul ei), totalul 815,9 → 825,5 / 900 kB (bucata cotelor 8,0 kB, cu stilurile ei 0,4).

## Implementarea (10.4↑a-3)

24.11, pe ramura `wip/10.4-cote`, la „continua” al owner-ului. Felia a-3 a păstrat fereastra Setări, cu toate setările
de până aici și efectul lor; panoul cotei, lista, „Arată cotele” și cotele foilor vecine (cu setarea lor, care n-are ce
arăta fără foile vecine desenate) trec în felia nouă **a-4**. (Id-urile feliilor din fișe au doar cifre după cratimă, deci
nu „a-3a” și „a-3b”, cum le-a numit întâi sesiunea.)
- **Setările** (`src/app/setariCote.ts`): grupurile din tabelul §6 pentru a-3, fiecare câmp citit cu marginile lui (un
  câmp greșit ia implicitul, celelalte rămân): **cifrele** (unitatea mm / cm / inch, zecimalele 0–6 sau automat — 2, în
  inch 3 —, zerourile, rotunjirea la un pas 0,001–100 în unitatea aleasă, separatorul după limbă / virgula / punctul,
  unitatea scrisă, înălțimea 1–20 mm, locul cifrei), **liniile** (capetele, mărimea 1–10 mm, extensiile, golul și depășirea
  0–5 mm, distanța la punere 2–100 mm) și, în **comportament**, pânza (arătate, pragul cifrelor 0–12 px, culoarea, `#rrggbb`
  sau a temei). Implicitele setărilor sunt chiar stilul implicit al desenului (proba). `grupImplicit` și `eImplicit`, pe
  fiecare din cele cinci grupuri.
- **Desenul** (`src/model/desenCota.ts`): stilul are felul capetelor (săgeata plină sau deschisă, bara oblică la 45° în sens
  trigonometric față de linie, centrată pe picior, punctul cu raza cât un sfert din mărime, fără), extensiile arătate sau
  nu și locul cifrei: deasupra; **în linie** (cifra centrată pe linie, linia întreruptă cât cifra și 0,3·h de fiecare
  parte, deci `bucati` are două bucăți); **mereu orizontală** (cutia cifrei lângă mijlocul liniei, de partea normalei care
  urcă sau, la o linie verticală, la stânga). `scrieCifra` scrie cifra după format (unitatea, zecimalele, pasul cu
  zecimalele lui, zerourile, separatorul, unitatea scrisă, fără „-0”). Lățimea cifrei e aproximată (0,6·h pe semn) până la
  trăsăturile lui Relief (felia c).
- **Pe pânză** (`src/app/Cote.tsx`): desenul și cifrele după setări, pe loc (React le citește din aceeași stare);
  ascunse, cotele nu se desenează și nu se aleg, afară de unealta Cote aleasă; culoarea aleasă înlocuiește tokenul
  `--cota` pe stratul cotelor; „Păstrează” din Măsoară pune cota la distanța din setări; distanța din Măsoară își scrie
  mereu unitatea (măsura nu e o cotă).
- **Fereastra** (`src/app/Setari.tsx`, `setari.css`, la cerere, cu mesajele editării): secțiunile în stânga (acum
  Cotele; pe telefon, deasupra), cota de probă (120,5 × 40 mm, cu o orizontală și o verticală, desenate cu aceeași geometrie)
  ținută la vedere la derulare, grupurile cu „Înapoi la implicit” (oprit cât grupul are implicitele). Fiecare schimbare se
  aplică pe loc și se ține; un număr se scrie cu virgulă sau punct, iar unul în afara marginilor rămâne în câmp, spus în
  roșu, și nu se ține. Doar Închide și Escape: nu e nimic de anulat. Se deschide din meniul contului („Setări…”, după
  „Aspectul…”, cu `Ctrl+,` scris pe rând), din paletă (`vedere.setari`, și din fereastra Mașina), cu `Ctrl+,` și din ⚙ al
  uneltei Cote; F1 în ea duce la capitolul ei. Cât e deschisă, tastele desenului nu ating Proiectarea.
- **Manualul:** capitolul „Setările” (ro, en), o frază spre el în „Cotele și măsurarea”, `Ctrl+,` în scurtături.
- **Cifrele:** unitare noi 7 (desenul 4, setările 3) și potrivite cele vechi (desenul, setările, manualul cu 118 uși,
  meniul contului); e2e noi 7 (`setari.spec.ts`, cu telefonul și engleza) și ⚙ în proba barei la 1280 px; rândul nou al
  meniului în `cont.spec.ts`, `tutorial.spec.ts` și proba tichetelor de pe emulatoare. Pornirea 110,1 → 110,4 kB (cu ușa
  115,1, cu Atelierul 115,4 / 120: în pornire stau acțiunea `vedere.setari`, tasta și încărcarea ferestrei), totalul
  825,4 → 832,3 / 900 kB (fereastra 3,6 kB și stilurile ei 0,8; setările și desenul cotelor, o bucată comună a uneltei
  și a ferestrei, 3,2 kB, din care 1,0 au plecat din bucata uneltei).

## Implementarea (10.4↑a-4)

24.11, pe ramura `wip/10.4-cote`, la „continuă cu 10.4↑a-4” al owner-ului.
- **Depozitul cotelor văzute în afara uneltei** (`src/ui/coteVedere.ts`, fără niciun import din model): unealta Cote (bucata
  ei, la cerere) publică acolo cota aleasă (felul, valoarea exactă, cifra, textul, legătura, distanța și ce poate schimba) și
  rândurile foii active; panoul de proprietăți și lista le citesc de acolo, deci nu trag codul cotelor în bucata lor. Cota
  aleasă stă tot acolo (lista o poate alege), iar cererea listei („treci la Cote cu cota asta”) o ascultă editorul fără să se
  redeseneze la fiecare publicare (`laCerereaListei`).
- **Panoul cotei** (`src/app/PanouCota.tsx`, în bucata panoului): cu o cotă aleasă, doar ce e al ei: felul; valoarea exactă
  (`textNumar`, mm sau °) și **Copiază**; legătura (legată, liberă, dezlegată cu motivul: forma lipsă sau alte noduri) și
  **Dezleagă**; textul, cu `<>`; distanța liniei de cotă; **Șterge**. Schimbările trec prin acțiunea `foaie.cote` a uneltei,
  deci fiecare e un pas de anulare. Funcțiile pure, în `src/model/cote.ts`: `cotaDezlegata` (fiecare capăt legat își scrie
  punctul citit acum și pierde legătura), `cotaCuText` (gol, doar spații sau doar „<>” scoate câmpul), `cotaCuDistanta`,
  `stareCota`.
- **Lista** (`src/ui/ListaCote.tsx`, la cerere, doar pentru o foaie cu cote): sub piesele foii active, **Cote (N)**, închis la
  început (o cotă aleasă îl deschide); deschis, cotele foii (cifra, felul, „dezlegată”); un clic pe una trece la unealta Cote,
  cu ea aleasă. **Ochiul** ascunde cotele foii pe pânză, nu le șterge; ținut în browser (`cncvs2.cote-ascunse`, id-urile
  foilor), nu în proiect. Cu unealta Cote, cotele se văd oricum.
- **„Arată cotele”** (`vedere.cote`, în paletă) comută aceeași setare ca „Cotele pe pânză” din Setări (`comutaPePanza`); bucata
  setărilor vine la cerere, deci pornirea nu o aduce.
- **Cotele foilor vecine:** cu „Toate foile pe pânză”, unealta le desenează lângă foile lor (`locuriFoi`), estompate
  (opacitatea 0,45), doar de văzut: nu se aleg și nu se lipesc. Setarea **„Cotele foilor vecine”** (estompate sau ascunse) e în
  Setări › Cotele › Comportamentul; ochiul unei foi și „Cotele pe pânză” le ascund și pe ele.
- **Manualul:** „Cotele și măsurarea” spune panoul, lista, ochiul, „Arată cotele” și foile vecine; „Setările”, rândul nou.
- **Cifrele:** unitare noi 6 (panoul 5, „Arată cotele” 1) și setările potrivite; e2e noi 4 (`cote.panou.spec.ts`); otrăvuri
  25 / 25 din prima (`test/otravuri/10.4a4.py`: 10 unitare, 15 e2e). Pornirea 110,4 → 110,6 kB (cu ușa 115,3, cu Atelierul 115,6 / 120: în pornire stau
  încărcarea rândului din listă, acțiunea `vedere.cote` și eticheta ei), totalul 837,8 → 841,6 / 900 kB (panoul cotei, în
  bucata panoului; rândul listei, 1,3 kB la cerere, cu stilurile lui; depozitul, o bucată comună de 0,7 kB; restul, în bucata
  uneltei).

## Implementarea (10.4↑b)

24.11, pe ramura `wip/10.4-cote`, la „10.4↑b” al owner-ului.
- **Desenul** (`src/model/desenCota.ts`, pur, comun pânzei, ferestrei Setări și exportului din felia c):
  - **Raza** (`desenRadial`): centrul și punctul de pe cerc; `linie.d` e locul cifrei față de cerc, pe direcția razei (pozitiv
    afară). „Linia razei”: din centru (linia c → p, săgeata cu vârful pe cerc, spre afară), din afară (linia de dincolo de
    cerc, săgeata spre centru) sau după loc (cifra înăuntru: din centru; afară: din afară). Cifra afară stă la cel puțin un
    gol (din afară, și un capăt) de cerc; înăuntru, între centru și săgeată; linia trece pe sub toată cifra.
  - **Diametrul**: linia prin centru, de la punctul opus la cel ales, cu câte o săgeată spre afară; cifra înăuntru, pe linie
    (oprită înaintea săgeților), sau afară, pe prelungirea de dincolo de punctul ales.
  - **Unghiul** (`desenUnghi`, `laturiUnghi`): trei puncte (vârful și câte unul pe fiecare latură) sau patru (două laturi;
    vârful, la încrucișarea dreptelor lor; paralele: fără desen). `linie.d` e raza arcului, `s1` și `s2` aleg semidreptele,
    deci sectorul; arcul merge în sens trigonometric prin el. Extensiile: pe semidreapta unei laturi care nu ajunge la arc, de
    după capătul ei (sau de după vârf) până la depășire; la o latură care începe dincolo de arc, de la arc până înaintea ei.
    Săgețile stau pe coarda de un capăt a arcului, iar pe un arc mai scurt decât două capete, în afară, cu arcul prelungit.
    Cifra, la mijlocul arcului, citibilă după tangentă: deasupra (toată în afara arcului; când „sus”-ul ei e spre vârf, baza
    ei urcă cu o înălțime), în linie (arcul întrerupt cât ea) sau orizontală (afară, lângă mijloc).
  - Locul cifrei din cursor (`distantaRadiala`, `linieUnghiDinCursor`: cursorul = α·e1 + β·e2, deci s1 = semnul lui α, s2 al lui
    β), alegerea pe arc (`distantaLaDesen`, la arc, nu la coardă), calea SVG a arcului (`caleArc`; pe ecranul cu Y în jos,
    sensul trigonometric al foii e sweep-flag 0: proba mijlocului căii a prins arcul oglindit față de coardă), `desenCota` după
    fel. Cifra pe o linie dreaptă (`textPeLinie`) e comună cotelor liniare și razelor; desenul liniarelor a rămas același.
- **Cifrele:** `cifraCota`: raza și diametrul cu prefixul lor, unghiul cu `scrieUnghi` (grade zecimale; sau grade, minute,
  secunde, numărate în unități întregi de secundă, ca rotunjirea să nu dea „60″”; zecimalele, ale secundelor), restul cu
  `scrieCifra`, care știe acum **inch în fracții** (întregul și fracția simplificată, la cel mult 1/numitor, fără „-0”).
  `<>` din textul cotei e cifra cu prefixul ei („4× <>” dă „4× Ø10”).
- **Setările** (Setări › Cotele): grupul nou **„Raza, diametrul, unghiul”**: prefixele (cel mult 8 semne, numărate ca semne;
  gol: fără), unghiurile (zecimale sau grade-minute-secunde), zecimalele unghiului (0–4, implicit 2), linia razei (implicit
  după loc); unitatea **„inch în fracții”**, cu **fracția cea mai mică** (1/2 … 1/64, implicit 1/16): cu ea, zecimalele și
  rotunjirea nu se arată (fracția e rotunjirea), iar zerourile și separatorul rămân (țin și de unghiuri). Cota de probă are și
  un cerc cu raza lui și un unghi de 25°; verticala ei stă acum la dreapta dreptunghiului (în a-3, d = 14 o ducea înăuntru).
- **Unealta:** **Rază**, **Diametru** și **Unghi** în bară (opt feluri și ⚙; bara de sus tot încape la 1280 px cu fontul lat,
  în ambele limbi).
  - Rază și Diametru: un clic oriunde pe un cerc sau pe un arc îl alege (centrul, legat de centrul arcului); punctul de pe cerc
    e cel numit (vârf, mijloc, cadran) cel mai apropiat ca unghi de cursor, legat, deci cota urmează cercul la scalare. Cu
    cotele libere (setarea), punctul din direcția cursorului. Pe o linie, o elipsă sau o curbă: refuzat, cu motivul.
  - Automată: un cerc întreg (închis, doar arce ale aceluiași cerc, 360°) dă diametrul, un arc raza; o latură dreaptă dă
    lungimea, iar un clic pe altă latură, înainte de locul liniei, face unghiul dintre ele; la două laturi paralele, distanța:
    verticală între orizontale, orizontală între verticale (legate), aliniată între oblice, liberă (piciorul pe a doua latură
    nu e un punct al formei, deci o cotă legată ar arăta o valoare greșită după o mutare). Un clic chiar pe un vârf sau pe
    mijlocul unei laturi începe, ca în a-2, o cotă din două puncte.
  - Unghi: o latură, apoi a doua (aceeași latură, a doua oară, nu face nimic; paralele: refuzat, cu motivul), sau trei puncte
    (vârful, apoi câte unul pe fiecare latură); apoi arcul, în sectorul cursorului.
  - Tragerea liniei unei cote alese e a felului ei (locul cifrei, raza și sectorul arcului); săgețile: la rază, diametru și
    unghi, sus și dreapta duc cifra (arcul) mai departe, jos și stânga mai aproape. Esc renunță și la cercul ales.
- **Panoul:** „Locul cifrei (de la cerc)” la rază și diametru, „Raza arcului” la unghi (pozitivă, cel puțin 0,1 mm); exemplul
  textului e „4× <>”.
- **Manualul:** „Cotele și măsurarea” (felurile noi, Automată, săgețile, panoul) și „Setările” (grupul nou, fracțiile).
- **Cifrele:** unitare noi 16 (desenul și cifrele 15, setările 1) și cele potrivite; e2e noi 5 (`cote.cerc.spec.ts`), plus
  probele Setărilor potrivite (șase grupuri, patru cote de probă); otrăvuri 49 / 49 (`test/otravuri/10.4b.py`: 31 unitare, 18 e2e), 44 din prima; cinci au scăpat întâi și sunt prinse după
  probele noi (diametrul cu cifra înăuntru, cifra arcului cu „sus”-ul spre vârf, unghiul din patru puncte în `desenCota`,
  minutele rotunjite, arcul cotei de probă din Setări în alt sector). Pornirea
  110,6 kB, neschimbată (cu ușa 115,3, cu Atelierul 115,6 / 120: felurile noi, setările și desenul stau în bucățile uneltei și
  ale ferestrei Setări, la cerere), totalul 860,6 → 864,8 / 900 kB (după lotul 24 adus).

## Implementarea (10.4↑c-1)

25.11, pe ramura `wip/10.4-cote`, la „Pornește 10.4↑c” (owner-ul, prin sesiunea principală: „vreau sa pornesti si celelalte
sub-sesiuni”). Felia c s-a împărțit în c-1 (exportul cotelor, desenate ca vectori) și c-2 (DIMENSION și cifrele ca text).
- **Entitățile cotelor** (`src/io/coteExport.ts`, pur): desenul fiecărei cote (`desenCota`, același cu al pânzei) ca entități
  ale exportului, pe stratul **COTE** (al nouălea din `STRATURI`), cu id-ul cotei ca element: liniile de cotă și de extensie
  (bucăți de polilinie), arcul unghiului (o polilinie cu bulge = tan(baleiaj / 4), deci exact în DXF și SVG), capetele
  (săgeata plină, un triunghi umplut: entitatea nouă `plin`; cea deschisă, conturul lui; bara oblică, o bucată; punctul, un
  disc: polilinia din două semicercuri de rază r / 2, cu lățimea r, câmpul nou `latime`) și cifrele. Ancorele se citesc din
  lume ca pe pânză (o cotă legată e unde e forma); un fel necunoscut sau o cotă fără desen nu se exportă. Cutia cotelor
  lărgește pagina PDF / EPS și întinderea DXF-ului cât ies din foaie; **SVG-ul rămâne cât foaia** (ca pentru forme, ADR
  0088), deci o cotă din afara foii iese din pagina lui.
- **Cifrele, ca trăsături.** Față de §6 (un tabel al trăsăturilor, scos la build): fontul inclus cu o singură linie (Relief
  SingleLine) se citește la export, prin modulul textului, adus la cerere, ca la numerele panourilor (10.3↑n); așezarea e a
  textului (`aseazaText`, centrat, cu baza în cifră), dată de apelant (`cifreDinFont`, `src/text/cifreCote.ts`): `src/io`
  importă doar modelul și geometria (regula `io-doar-model-geom`). Semnele pe care fontul nu le are (minutul ′ și secunda ″)
  se scriu cu apostroful și ghilimelele drepte; altele, nedesenate, se spun după export. Tabelul de la build rămâne de făcut
  când pânza și „Fă desen din cotă” (d) au nevoie de cifrele fără font.
- **Scriitorii:** DXF-ul scrie stratul cu numele din setări, culoarea exactă în codul 420 și, în 62, culoarea AutoCAD de bază
  cea mai apropiată **după nuanță** (roșu, galben, verde, cyan, albastru, magenta), iar una aproape gri după luminozitate (7,
  8, 9): distanța în RGB dădea gri albastrului închis implicit (#006d8f); capetele pline sunt SOLID (AcDbTrace, al patrulea
  colț cât al treilea), discurile, LWPOLYLINE cu lățimea constantă (43). SVG: grupul stratului (strat Inkscape) cu numele,
  culoarea și grosimea din setări, triunghiurile umplute, discurile cu `stroke-width` cât lățimea. PDF: stratul OCG cu numele
  din setări, culoarea liniilor și a umpluturii, grosimea; EPS: comentariul cu numele, culoarea, grosimea, `fill`. **Fără cote,
  sau fără bifă, fiecare fișier e octet cu octet cel de dinainte** (stratul COTE se scrie doar cu entități).
- **Intrarea** (`exportaVectori`, `src/io/exportVectori.ts`): primește cotele cerute (stilul și cifrele din setări, așezarea
  cifrelor, stratul) și spune câte cote au intrat și ce semne lipsesc.
- **Setările** (Setări › Cotele, grupul nou **Exportul**): „Cu cotele, în «Exportă vectori»” (implicitul bifei, oprit),
  numele stratului (litere ASCII, cifre, „_” și „-”, cel mult 31, nu numele altui strat al exportului sau 0, fără să țină
  seama de literele mari: DXF-ul nu le deosebește; altfel spus lângă câmp și neținut), culoarea lui (implicit #006d8f) și
  grosimea liniilor cotelor în PDF și SVG (0,05–1 mm, implicit 0,1). „Cotele în DXF” și „Cifrele” vin cu c-2.
- **Panoul „Exportă vectori”:** pe o foaie cu cote, bifa **„Cu cotele (N)”**, pornită după Setări; bifată, fraza „Pe stratul
  …” și legătura **Setările cotelor**. La Exportă vin, la cerere, setările și fontul; un font care nu se încarcă oprește
  exportul, cu motivul. Starea spune și câte cote au intrat.
- **Oracolul** (`test/oracles-py/export2d_cote.py`, în jobul `oracol-export2d`): corpusul cotelor (scris de
  `scripts/export2d-corpus.ts` prin intrarea aplicației: patru cote, o orizontală, o verticală, un unghi și un diametru, pe
  stratul `DIM_1`, portocaliu, cu liniile de 0,25 mm), recitit de ezdxf (0 erori, 0 reparații; fiecare segment, exact cel de
  pe hârtie, 181, cu cifrele așezate de fontTools prin `text_corpus.aseaza`), PyMuPDF (PDF-ul și EPS-ul prin Ghostscript),
  un cititor mic al SVG-ului și al EPS-ului; abaterile măsurate: PDF 0,0001 mm, SVG 0,000001 mm, EPS 0,0001 mm, prin
  Ghostscript 0,0003 mm.
- **Manualul:** „Exportul vectorilor” (bifa) și „Setările” (grupul Exportul), în ambele limbi.
- **Cifrele:** unitare noi 15 (`cote.export.test.ts`) și 2 în `cote.setari.test.ts`; e2e noi 3 (`cote.export.spec.ts`, cu
  SVG-ul cotei măsurat de browser), plus probele Setărilor potrivite (șapte grupuri); otrăvurile, în raport. Pornirea 111,1 →
  111,2 kB (cu ușa 116,2, cu Atelierul 116,5 / 125), totalul 884,8 → 888,1 / 1 000 kB (după `main` adus, cu relieful
  18.1↑b și plafoanele noi, ADR 0146). Unită în `main` pe 25.11 (`f2f6fc57`).

## Implementarea (10.4↑c-2)

25.11, pe ramura `wip/10.4-cote`, la „ok, porneste 10.4↑c-2 si 16.A↑b-6” al owner-ului (transmis de sesiunea principală),
peste c-1. Documentul rămâne v28: nimic nou în schemă.
- **Setările** (Setări › Cotele › Exportul): **Cotele în DXF**, „Cote (DIMENSION)” (implicit, răspunsul 5a) sau „Linii și
  cifre” (felul din c-1); **Cifrele**, „Trăsături” (implicit) sau „Text”. O setare ținută de c-1, fără ele, le ia implicite.
  Fraza de sub „Cu cotele (N)” spune stratul, felul cifrelor și, la DXF, felul cotelor.
- **Definiția fiecărei cote** (`definitieCota`, `src/io/coteExport.ts`, pură), din punctele citite și din desenul ei:
  orizontala și verticala, rotite la 0° și 90° (felul 0, cu unghiul în 50); aliniata (1); punctele măsurate (13, 14) și piciorul
  celui de-al doilea pe linia de cotă (10). Raza (4): centrul (10) și punctul de pe cerc (15); diametrul (3): punctul de pe cerc
  (15) și cel opus (10); liderul (40), cât stă mijlocul cifrei, proiectat pe linie, dincolo de cerc; cifra spusă pusă de om
  (128). Unghiul, în sensul arcului (de unde pleacă, unde ajunge, ca măsura să fie unghiul desenat, nu 360° minus el): din trei
  puncte (5), vârful (15) și câte un punct pe semidreapta aleasă, la depărtarea punctului laturii (13, 14), plus mijlocul arcului
  (10); din patru (2), laturile, fiecare în sensul semidreptei ei (13 → 14, 15 → 10), plus mijlocul arcului (16). Steagul 32
  (blocul e doar al ei) pe toate; măsura în 42 (unghiul în radiani); mijlocul textului (11) la jumătate de majusculă deasupra
  mijlocului bazei, agățat de mijloc (71 = 5). O cotă fără valoare sau fără text rămâne desenată ca linii.
- **DXF-ul cu cotele ca cote:** stilul `CNCVS2` în tabelul DIMSTYLE, din setări: DIMTXT, DIMASZ, DIMEXO, DIMEXE, DIMGAP (0,3 ×
  înălțimea), locul cifrei (DIMTAD, DIMTIH, DIMTOH), extensiile ascunse (DIMSE1 / DIMSE2), bara oblică (DIMTSZ), zecimalele
  (DIMDEC; în fracții, puterea lui 2 a numitorului, cu DIMLUNIT 5 și DIMFRAC 2), separatorul (DIMDSEP), zerourile (DIMZIN 8),
  unitatea (DIMLFAC, DIMPOST), unghiurile (DIMAUNIT, DIMADEC; în grade-minute-secunde, 4 + zecimalele secundelor), fontul
  (DIMTXSTY, Standard). Fiecare cotă are blocul ei anonim `*Dn` (70 = 1, cu înregistrarea lui în BLOCK_RECORD), cu desenul ei
  din c-1 (liniile, arcul, capetele, cifrele), iar în ENTITIES stă doar entitatea DIMENSION.
- **Textul unei cote DIMENSION e cifra noastră, scrisă în ea** (decizia sesiunii, întrebarea 7, mai jos): arată la fel în orice
  program, iar stilul `CNCVS2` contează doar când un program o desenează din nou. Capetele deschise, punctele și „fără” nu au
  un echivalent fără blocuri de săgeți în fișier: un program care redesenează cota le face săgeți pline (desenul din bloc e
  cel bun).
- **Cifrele ca text:** o entitate nouă a exportului (`text`: mijlocul bazei, unghiul, majuscula), scrisă de fiecare format: în
  DXF ca MTEXT (în blocul cotei sau, cu „Linii și cifre”, în ENTITIES), agățat de mijloc, cu direcția cifrei; în SVG ca
  `<text>` cu Helvetica (sau fontul fără serife al programului), centrat (`text-anchor`), cât majuscula / 0,718, rotit în
  jurul bazei; în PDF cu Helvetica, una din cele 14 fonturi standard (fără font în fișier, WinAnsi), centrată după lățimile ei
  din AFM (`src/io/helvetica.ts`); în EPS cu Helvetica recodată în ISOLatin1, centrată de interpretor (`stringwidth`). Semnele
  din afara ASCII: în DXF ca `\U+XXXX`, în SVG ca referințe numerice, deci fișierele rămân ASCII. Minutul și secunda se scriu
  ' și " în PDF și EPS; un alt semn pe care Helvetica nu-l are (ș, ț, ă) se scrie „?” și se spune după export. Fontul nu se
  mai încarcă la export cu cifrele ca text. Locul cifrei e cel al trăsăturilor (0,6 × înălțimea pe semn), iar Helvetica e cu
  vreo 30 % mai lată: o cifră în linie atinge mai ușor capetele liniei. Cutia paginii ține lățimea Helvetica a textului.
- **Felul de dinainte rămâne octet cu octet:** cu „Linii și cifre” și „Trăsături”, fișierele `cote.*` ale corpusului au
  amprentele de la c-1 (proba unitară le ține); fără text, PDF-ul și EPS-ul nu primesc nici fontul, nici prologul.
- **Oracolul** (`export2d_cote.py`, cu corpusul scris de `scripts/export2d-corpus.ts`): pe lângă `cote.*` din c-1, corpusul al
  doilea, cu toate felurile (cele patru, plus o aliniată, o rază și un unghi din două laturi, cu textul „2x<>”), exportat ca
  `cote-dim.dxf` (cotele ca DIMENSION) și `cote-text.dxf`, `.svg`, `.pdf`, `.eps` (și cifrele ca text). Recitit de ezdxf (0 erori,
  0 reparații): fiecare DIMENSION are felul și steagurile, punctele de definiție, `get_measurement()` (la aliniată, distanța
  13–14: ezdxf o măsoară după unghiul 50, pe care felul 1 nu-l are), măsura scrisă, textul, mijlocul lui și stilul `CNCVS2`
  de pe hârtie, iar blocul ei are exact segmentele de pe hârtie (cu cifra ca trăsături sau ca MTEXT, cu locul, înălțimea și
  direcția lui). Textul în PDF, prin PyMuPDF (fontul Helvetica, culoarea, mijlocul bazei cu lățimile lui `Font('helv')`;
  `get_text_length` greșește un text care începe cu un semn din afara ASCII), în SVG (atributele), în EPS (direct și prin
  Ghostscript, care pune Nimbus Sans, cu aceleași lățimi). Un al treilea document, `cote-ascii.pdf`, are un text cu toate
  semnele ASCII și ° ± × Ø: centrarea lui probează fiecare lățime din tabel.
- **Cifrele:** unitare noi 11 (`cote.export.test.ts`: octeții c-1, definițiile pe hârtie, blocurile și handle-urile, MTEXT-ul,
  stilul după setări, Helvetica, textul în SVG / PDF / EPS), iar proba setărilor exportului (`cote.setari.test.ts`), întărită; e2e noi 2 (`cote.export.spec.ts`:
  DIMENSION implicit, cifrele ca text în DXF și SVG, măsurate de browser; „Linii și cifre”). Pornirea 111,2 kB (neschimbată),
  totalul +3,0 kB (pe unirea cu `main` `65eecdc6`: 891,8 → 894,8 / 1 000 kB; măsurat întâi pe baza de atunci, 890,1 → 893,2).

### Întrebarea 7 (c-2), cu recomandarea pe care s-a mers

Textul unei cote DIMENSION în DXF:
- **a (recomandat, implementat):** cifra noastră, scrisă în cotă: aceeași în orice program, cum o arată aplicația; dacă muți
  punctele în alt program, cifra nu se schimbă singură (acolo se poate scrie `<>`, ca s-o măsoare el);
- b: lăsată de măsurat programului (text gol), după stilul `CNCVS2`: se schimbă cu punctele, dar fiecare program o scrie în
  felul lui (zecimalele, fracțiile, prefixele razei și diametrului pot ieși altfel decât în aplicație).

## Răspunsurile owner-ului (24.11.2026)

Salvate în schiță (`raspunsuri/owner`, 12:52), apoi „am raspuns” în chat: **1a, 2a, 3a, 4a, 5a, 6a**, cu nota, exactă:
„vreau cat mai multe optiuni si setari pe care un user le poate selecta si configura pentru sistemul de cote. dar nu le
vreau in zona de design/proiectare. vreau o zona de settings generale si acolo sa se poata seta toate astea”.

Ce a schimbat nota față de propunere:
- „Opțiunile cotelor ▾” din bara uneltei și stilul din panou au plecat: toate setările stau în fereastra nouă „Setări”,
  secțiunea Cotele (§6), mult mai multe decât în propunere (unitatea cu fracțiile de inch, rotunjirea la pas, zerourile,
  unitatea scrisă, liniile de extensie, capetele și mărimea lor, unghiurile, comportamentul, lipirea, măsurarea, exportul).
- Bara uneltei are doar felurile și ⚙; comutatorul „Legată” a devenit setarea „Cotele noi sunt legate”.
- O cotă nu mai ține stil: setările sunt ale aplicației și se aplică tuturor cotelor, pe loc (§6). Felia 10.4↑a s-a
  împărțit în a-1 (modelul și proba), a-2 (unealta), a-3 (Setări, panoul, lista, manualul).
- Ținute în browser, nu în proiect: asta e alegerea sesiunii, din „setări generale”; se redeschide dacă owner-ul vrea
  stilul ținut în proiect (atunci o setare „pentru proiectul acesta”) sau în cont.

## Implementarea (10.4↑d-1)

26.11, pe ramura `wip/10.4-cote`, la „ok, porneste 10.4↑d si 18.1↑d” al owner-ului (transmis de sesiunea principală). Felia d
s-a împărțit: d-1 (lanțul, linia de bază, „Cotează selecția”), d-2 („Fă desen din cotă”), d-3 (cotele în raportul foilor).
Documentul rămâne v29: cotele stau tot pe foaie, iar fiecare cotă nouă e o orizontală, o verticală sau o aliniată obișnuită.
- **Seria, pură** (`src/model/serieCote.ts`): după o cotă liniară (felul, capetele, distanța liniei), **lanțul** pleacă din al
  doilea capăt al ultimei cote, cu linia pe dreapta liniei celei dinainte (la orizontală și verticală; la aliniată, drumul se
  schimbă, deci se păstrează distanța primei); **linia de bază** pleacă mereu din primul capăt al primei cote, iar linia
  fiecărei cote noi stă mai departe de formă cu un pas, de partea primei linii (la d = 0, ca normala: în sus, spre stânga). O
  cotă care ar măsura zero (același X la orizontală, același Y la verticală, același punct la aliniată) nu se pune.
- **Pasul liniilor de bază:** două înălțimi de cifră (7 mm la cifrele implicite de 3,5 mm), fără o setare nouă (întrebarea 8).
- **Unealta:** felurile **Lanț** și **Linie de bază** în bară, după Aliniată. Prima cotă se pune ca la Automată din două puncte
  (orizontală, verticală sau aliniată, după unde duci linia; Shift: aliniată), fără alegerea unei laturi; apoi fiecare clic pe
  un punct (lipit, legat după setare) pune cota următoare, un pas de anulare fiecare, cu cota următoare desenată sub maus.
  **Esc** încheie seria (abia atunci se aplică „După o cotă: înapoi la Selecție”). Cu o cotă liniară aleasă, alegerea felului
  pornește seria din ea (lanțul din al doilea capăt, baza din primul, cu legătura lor).
- **„Cotează selecția”, pură** (`src/model/coteSelectie.ts`): pentru fiecare piesă aleasă de pe foaie, lățimea și înălțimea
  cutiei ei în lume, ca o orizontală și o verticală noi, legate de colțurile cutiei elementelor de la margini (lățimea: colțul
  stânga-jos al elementului cel mai din stânga și dreapta-jos al celui mai din dreapta; înălțimea: dreapta-jos al celui mai de
  jos și dreapta-sus al celui mai de sus), cu liniile la distanța liniei de cotă din Setări, sub piesă și la dreapta ei. O
  dimensiune zero (o linie dreaptă) nu se cotează. Toate cotele noi, un singur pas de anulare.
- **Unde stă „Cotează selecția”:** în meniul de clic dreapta, după Șterge (întrebarea 9). Pus în bara uneltei, lângă ⚙, împingea
  bara de sus cu 14 px afară la 1280 px cu fontul lat; pus în extensia barei, lângă Cote, împingea butonul 3D afară. Rândul
  pornește unealta Cote (bucata ei vine la cerere), iar cererea se face o singură dată (`CERERI_FACUTE`), și după o montare din
  nou a stratului.
- **Cifrele:** unitare noi 15 (`cote.serie.test.ts` 9, `cote.selectie.test.ts` 6, pe hârtie), e2e noi 4 (`cote.serie.spec.ts`:
  lanțul, cu refuzul de zero, Esc și anularea; linia de bază, cu pasul de 7 mm; lanțul pornit din cota aleasă; „Cotează
  selecția” din meniu, oprit fără selecție, cu un singur pas de anulare); bara de sus tot la 1280 px cu fontul lat, în ambele
  limbi; otrăvurile 27 / 27. Pornirea 111,4 kB (neschimbată), totalul 909,1 → 910,4 / 1 000 kB.

### Întrebările 8 și 9 (d-1), cu recomandările pe care s-a mers

8. Pasul liniilor de bază:
   - **a (recomandat, implementat):** două înălțimi de cifră (7 mm la 3,5 mm), fără setare: cifra încape între linii oricât de
     mare o alegi;
   - b: o setare nouă în Setări › Cotele („Pasul liniilor de bază”, 2–30 mm).
9. „Cotează selecția”:
   - **a (recomandat, implementat):** în meniul de clic dreapta al pieselor alese (bara de sus și extensia ei nu mai au loc la
     1280 px cu fontul lat);
   - b: și în **Caută o comandă**, ca acțiune a registrului (aproximativ +0,1 kB în pornire).

## Implementarea (10.4↑d-2)

26.11, pe ramura `wip/10.4-cote`, după d-1. Documentul rămâne v29: desenul e o piesă obișnuită, iar cota rămâne pe foaie.
- **Desenul cotei, ca forme** (`geometrieCota`, `src/io/coteExport.ts`, pur): același desen cu al pânzei și al exportului, în
  mm ai foii, ca forme: liniile de extensie, linia de cotă (sau bucățile ei), arcul unghiului, ca trăsături deschise; capetele
  (săgeata plină sau deschisă, un triunghi închis; punctul, un cerc închis din două semicercuri; bara oblică, o trăsătură); apoi
  cifrele, ca trăsăturile lui Relief SingleLine (`cifreDinFont`, adus la cerere, ca la export). Exportul nu s-a schimbat
  (`entitatiCote` e neatins; amprentele `cote.*` rămân).
- **Comanda** (`comandaDesenCota`, acțiunea nouă `foaie.desen-din-cota`, `laCerere`): o piesă nouă, din forme (un element,
  sau un grup cu câte un element pe formă), cu instanța în colțul foii, nerotită, deci formele stau exact unde era cota;
  **fără operații**: nu se taie până nu primește un rol. Cu „Șterge cota”, `inlocuieste-cote` cu lista fără ea, în același pas.
  Refuzată: nicio formă, plafoanele, documentul de după peste schemele documentului.
- **Panoul cotei:** butonul **Fă desen din cotă** și bifa **Șterge cota** (nebifată), cu nota „Desenul e o piesă obișnuită, fără
  tăiere”. După desen, unealta trece la Selecție, cu piesa nouă aleasă: panoul arată secțiunea Tăierea, de unde primește un rol.
  Fără fontul cifrelor (rețeaua), nimic nu se face, cu motivul spus.
- **Proba programului** (`cote.fadesen.test.ts`, pe placa 1 a corpusului CAM): cota nu ajunge în program; desenul ei fără rol
  nici el (aceiași octeți); cu o operație pe linie pe toate formele desenului, programul se schimbă și taie linia cotei (Y = 10,
  de la X = 20 la X = 120).
- **Cifrele:** unitare noi 4 (desenul pe hârtie, punctul și bara, comanda cu anularea, programul), e2e noi 2
  (`cote.fadesen.spec.ts`); acțiunea nouă e o ușă a manualului (120) și intră în cele două liste ale registrului
  (`actiuni.calcul.test.ts`, `actiuni.calcul.paritate.test.ts`); otrăvurile 16 / 16. Pornirea 111,4 → 111,5 kB, totalul
  910,4 → 912,5 / 1 000 kB (+2,1).

## Implementarea (10.4↑d-3)

26.11, pe ramura `wip/10.4-cote`, după d-2: ultima parte a feliei d. Documentul rămâne v29; raportul (`raportFoi`) și CSV-ul
nu s-au schimbat (`cote.neatinse.test.ts`, neatins, le cere tot aceleași cu și fără cote).
- **Desenul foii cu cotele, pur** (`svgFoaieRaport`, `src/io/raportCote.ts`, adus la cerere): fără cote cerute (sau pe o foaie
  fără cote), desenul de până acum, octet cu octet (SVG-ul exportului de vectori, cu foaia, liniile la a 150-a parte din latura
  mare a foii). Cu ele, cotele pe stratul COTE, cu culoarea și cifrele din Setări › Cotele › Exportul (trăsăturile fontului cu o
  singură linie, sau text; fără font, ca text), liniile lor la jumătate din ale pieselor.
- **Cotele se citesc pe desen** (întrebarea 10): cifrele cresc până la cel puțin a 60-a parte din latura mare a foii, iar
  capetele, golul și depășirea cresc la fel (`stilRaport`); linia fiecărei cote rămâne unde a pus-o omul. Pe o foaie de 210 mm
  sau mai mică (la cifrele de 3,5), desenul e chiar cel al exportului. O cotă care iese din foaie lărgește pagina desenului
  (`scrieSvg` primește pagina, opțional; exportul o lasă cât foaia, ca până acum).
- **Raportul:** bifa **„Cu cotele (N)”** pe rândul comenzilor, doar când o foaie a raportului are cote; pornește după setarea
  nouă **Setări › Cotele › Raportul foilor › „Cu cotele, în raportul foilor”** (oprită implicit; al optulea grup, cu
  „Înapoi la implicit”). Bifată, desenul fiecărei foi cu cote ia tot rândul, deasupra datelor ei (cel mult 70 % din înălțimea
  ecranului; la tipar, 180 mm). Foile identice (aceleași piese, aceleași operații) arată cotele primei: cotele nu despart
  foile, cum nu le despart nici imaginile (ADR 0272 §10). **Tipărește** ia desenele cum le vezi.
- **Cifrele:** unitare noi 5 (`cote.raport.test.ts` 4: desenul de dinainte pe tot corpusul CAM, stilul pe hârtie, stratul și
  cifrele, pagina lărgită; `cote.setari.test.ts` 1), e2e noi 2 (`cote.raport.spec.ts`), plus grupul nou numărat în
  `setari.spec.ts`; otrăvurile 20 / 20 (19 din prima; culoarea, după ce proba a luat alta decât cea implicită). Pornirea
  111,5 → 111,6 kB (cu ușa 116,7, cu Atelierul 117,0 / 125), totalul 912,5 → 915,5 / 1 000 kB (+3,0).

### Întrebarea 10 (d-3), cu recomandarea pe care s-a mers

10. Cotele pe desenul raportului:
    - **a (recomandat, implementat):** mărite cât să se citească (cifrele cel puțin a 60-a parte din latura mare a foii), cu
      desenul pe tot rândul: la mărimea adevărată, pe o foaie de 2 440 mm, cifrele de 3,5 mm ar avea sub un pixel;
    - b: la mărimea adevărată, ca în fișierul exportat, în coloana îngustă de azi.
