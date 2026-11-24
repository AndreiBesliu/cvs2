# ADR 0330: Cotele pe desen și măsurarea

**Starea:** propus pe 24.11.2026, în linia „cote” (ramura `wip/10.4-cote`, din `main` `41233474`, ADR-urile 0330–0339,
canalul `cote`), pornită de owner în aceeași zi („ce urmeaza in roadmap si nu a fost atins deloc si putem incepe”, apoi „ok,
scrie brief-ul pentru relief si pentru cote”). Felia 10.4↑, adusă din etapa 10, fără mașină. **Rândul din prag:** „Cote
(nici ArtCAM nu le are: doar rigle și măsurare)”, peste prag, v1 (decis pe 06.10; `ACOPERIRE-ARTCAM-DESKPROTO.md`, A).
**Completează:** ADR 0050 (ghidajele pe foaie, fără schemă nouă; lipirea), 0060 (linia de cotă a formelor ieșite din
foaie), 0088 și 0089 (exportul 2D), 0140 (Relief SingleLine), 0181 (felurile unei unelte în bara ei, ca la Cuțit), 0210
(foile, raportul foilor), 0272 (imaginile pe foaie, tot fără schemă nouă). **Schimbă:** glosarul planului (`PLAN.md`
§2, termenul 3, „element … sau cotă”): cota nu e un nod al piesei, ci stă pe foaie (§2); dacă owner-ul alege altfel
(întrebarea 1), rămâne cum scrie planul. **Schița**, cu machetele și întrebările (răspunsurile se salvează în pagină):
<https://claude.ai/artifact/BvsaqPKoKWsypCi1tphDvu>. **Codul:** la răspunsuri.

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
  - `{ id, fel, puncte, linie, stil?, text? }`;
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
- **Liberă, la cerere:** comutatorul „Legată” din bara uneltei (pentru cotele noi) și „Dezleagă” din panou. O cotă liberă e
  un desen fix.
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
  ADR 0250). **M** deschide aceeași unealtă pe „Măsoară”. Bara ei, ca a Cuțitului (ADR 0181): felurile, ca butoane cu
  iconiță; comutatorul „Legată”; „Opțiunile cotelor ▾”, un panou sub buton (§6).
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
- **Panoul de proprietăți**, cu o cotă aleasă: felul; valoarea, exactă, cu toate cifrele, și „Copiază”; legătura (legată
  sau dezlegată, cu motivul; „Dezleagă”); textul (§6); stilul; distanța liniei de cotă, în mm; Șterge.
- **Lista** (arborele proiectului): sub foaia activă, rândul „Cote (N)”, cu ochiul (ascunde cotele foii pe pânză, nu le
  șterge) și cotele ei (valoarea, felul, „dezlegată”); un clic trece la Cote, cu cota aleasă.
- **Vederea:** „Arată cotele” (`vedere.cote`, în paletă, ținută în browser), pornită implicit.
- **Pe pânză:** în stratul de deasupra pânzei, ca riglele și ghidajele. Cifrele au mărimea lor în mm pe foaie, deci ce vezi
  e ce se exportă; sub 6 px pe ecran, cifrele se ascund (rămân liniile), iar valoarea apare la trecerea mausului. Culoarea
  cotelor e un token nou al temei (`--cota`), alta decât a formelor, a selecției, a ghidajelor și a traseului; cele
  dezlegate, punctate, în roșu.
- **Bara de sus la 1280 px**, cu fontul lat, în ambele limbi: butonul nou se măsoară la felia a. Dacă nu încape, unealta
  trece în extensia barei, lângă Taie și Convertește, cu aceeași tastă.

### 6. Cum arată

Fiecare valoare e o opțiune. Implicitul vine din „Opțiunile cotelor”, ținute în browser (`cncvs2.cote`), și se copiază pe
fiecare cotă nouă, deci desenul arată la fel pe alt calculator; cota aleasă își schimbă stilul din panou.

| Opțiunea | Valorile | Implicit |
|---|---|---|
| Unitatea | mm, inch (cu ″) | mm |
| Zecimalele | 0–4, fără zerourile de la coadă („120”, „120,5”, „120,25”) | 2 (la inch, 3) |
| Separatorul | după limba aplicației (virgula în română, punctul în engleză), ca riglele | — |
| Înălțimea cifrelor | 1–20 mm pe foaie | 3,5 mm |
| Capetele | săgeată plină, săgeată deschisă, bară oblică, punct | săgeată plină |
| Locul cifrei | deasupra liniei, în linie (linia întreruptă) | deasupra |
| Textul | valoarea, cu un prefix și un sufix („4× Ø<>”, „<> pe ambele părți”); `<>` e valoarea | valoarea |

**Cifrele** sunt trăsăturile lui Relief SingleLine (ADR 0140, OFL), extrase la build pentru semnele unei cote (cifrele, virgula,
punctul, minus, plus, R, Ø, °, ″, ×, ±, spațiul), într-un tabel mic: aceleași pe pânză, în export și în „Fă desen din cotă”,
fără să încarce fontul. Un text al omului cu alte litere aduce fontul întreg, prin cititorul textului, la cerere.

### 7. Exportul (întrebarea 5; felia c)

- **„Exportă vectori”** primește bifa **„Cu cotele”**, oprită implicit (vectorii pentru laser sau pentru alt CAM rămân cum
  sunt azi), ținută în browser. Cotele intră pe un strat al lor, **COTE** (ASCII, cu culoarea lui).
- **DXF**, cu lista „Cotele în DXF”:
  - **„Cote (DIMENSION)”**, implicit: entitatea DIMENSION, cu felul ei (rotită pentru orizontală și verticală, aliniată,
    unghiulară din două linii sau din trei puncte, rază, diametru), punctele de definiție exacte, valoarea scrisă, stilul
    `CNCVS2` (înălțimea, capetele, zecimalele, separatorul, zerourile) și blocul anonim `*Dn` cu desenul cotei. AutoCAD și
    LibreCAD o citesc ca cotă (o mută, o recalculează); un program care știe doar blocurile o desenează din bloc;
  - **„Linii și cifre”:** același desen, direct în ENTITIES, pentru programele care nu știu DIMENSION.
- **SVG** (grupul stratului, ca un strat Inkscape), **PDF** (stratul OCG „COTE”) și **EPS** (culoarea și comentariul): liniile,
  capetele și cifrele ca vectori.
- **Cifrele** ies implicit ca trăsături (identice oriunde, fără fonturi); la alegere, **ca text** (MTEXT în DXF, `<text>` în
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
exportul ~3–4 kB în bucata lui, deci totalul ~806 → ~818 / 900 kB. Fiecare felie spune în raport cifrele măsurate.

### 10. Feliile

| Felia | Ce aduce | Se încearcă |
|---|---|---|
| 10.4↑a | Proba G-code-ului (prima); modelul (cota, ancora, ușa, judecata la cerere, jurnalul, dezlegarea); lipirea pe puncte; unealta Cote (D) cu Automată (latura, două puncte), Orizontală, Verticală, Aliniată și Măsoară (M); legată și liberă; pe pânză; alegerea, mânerele, Delete; panoul; lista; „Arată cotele”; stilul implicit; manualul (ro, en) | canalul `cote` |
| 10.4↑b | Raza, diametrul, unghiul (și în Automată); „Opțiunile cotelor” (§6) | canalul `cote` |
| 10.4↑c | Exportul: „Cu cotele”, stratul COTE, DXF ca DIMENSION sau ca linii și cifre, SVG, PDF, EPS, cifrele ca trăsături sau ca text; oracolul pe corpus | canalul `cote` |
| 10.4↑d | Lanțul, linia de bază, „Cotează selecția”, „Fă desen din cotă”, cotele în raportul foilor | canalul `cote` |

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
- **E2e (Edge):** D și M, fiecare fel, legarea (forma mutată, cifra nouă), dezlegarea, Delete, anularea, reîncărcarea, lista
  și ochiul, Selecția care trece prin cote; la 1280 px cu fontul lat, în ambele limbi; pe telefon.
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

## Întrebările pentru owner (doar ce se exclude), cu recomandarea în față

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
- se cer cote 3D (pe relief, pe vederea 3D) sau toleranțe.
