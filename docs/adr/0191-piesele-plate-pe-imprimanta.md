# ADR 0191 — Piesele plate pe imprimanta 3D: felierea desenului, în cvs2

**Starea:** acceptat pe 07.11.2026 (propus în aceeași zi), cu răspunsul owner-ului la cele cinci întrebări: „ca de obicei,
vreau cat mai multe optiuni, asa ca, vreau sa le faci pe toate cele care pot functiona ca optiuni diferite si pot fi
disponibile in soft”. Deci toate variantele care pot sta împreună devin opțiuni, pe feliile 3.6j–3.6m (secțiunea „Feliile”);
3.6j întâi fără imprimantă, pe imprimanta falsă, apoi o placă de probă pe imprimanta owner-ului, în worktree-ul `imprimanta`
(ramura `wip/3.6g-imprimanta`). **Felia 3.6j** gata pe 07.11, fără imprimantă (secțiunea „Felia 3.6j”); placa de probă pe
K1C rămâne la owner. **Felia 3.6k** (modelele, cusătura, ștergerea, călcarea, fusta) gata pe 08.11 (secțiunea „Felia 3.6k”).
**Felia 3.6l** acceptată pe 08.11 („Da, recomandările”) și gata pe 08.11 (secțiunea „Felia 3.6l”): piesa „după CNC”, treptele, înălțimea fiecărei piese.
**Felia 3.6n** acceptată și gata pe 08.11 („Da, pereții treptelor”; secțiunea „Felia 3.6n”): grosimea verticală, cu plinul sub pereții treptelor. Cererea owner-ului, din 07.11: „cum pot sa
feliez cubul pentru k1c?, [...] cum pot sa fac eu slice-ul? putem face asta direct din cvs2, sau trebuie sa o fac in aplicatia
creality?”; la propunerea pieselor plate: „Da, piesele plate.” **Completează:** ADR 0190 (fereastra Imprimanta; trimiterea și
verificarea fișierului, 3.6h), ADR 0119 §13 („nu feliază modele 3D”: rămâne așa; o piesă plată din desen nu e un model 3D).
**Documentul:** neschimbat (v20); setările imprimării țin de atelier (ținute în browser), nu de proiect. **Direcția:** codul
nou e gata de mutat într-un modul (cererea owner-ului din 07.11: conectarea și pregătirea fișierelor pentru fiecare fel de
mașină, ca module activate după ce folosește fiecare client).

**Problema.** Pentru imprimantă, cvs2 trimite azi doar un `.gcode` feliat în alt program (Creality Print, OrcaSlicer). Multe
piese din atelier sunt însă plate: o placă, un distanțier, un șablon, o etichetă cu text, un cub de calibrare, adică un desen
închis, ridicat la o grosime. Pentru ele, drumul prin alt program (exportul desenului, extrudarea, felierea) e lung, iar
desenul e deja în cvs2.

## Ce am aflat (cercetarea din 07.11)

Semnele: [citit] în sursă, [calculat] pe hârtie, [nemăsurat] de aflat pe imprimanta owner-ului.

- **O piesă plată e o prismă** [citit]: secțiunea e aceeași pe toată înălțimea, deci n-are surplombe, punți sau suporturi.
  Straturile diferă doar prin rol: primul (linii mai late, mai încet, ventilatorul oprit), cele de jos (pline), cele din mijloc
  (umplere rară), cele de sus (pline). Geometria se calculează o dată pentru fiecare fel de strat (patru), nu pentru fiecare
  strat: o placă de 5 mm (25 de straturi) și un cub de 20 mm (100) costă aproape la fel. Estimarea: sub o secundă, pe firul
  principal, fără worker (se măsoară în felie).
- **Geometria există în cvs2** [citit]: `offsetRegiune` și `offsetFigura` (`src/geom/offset.ts`, pe contururi cu arce, nu doar
  pe poligoane) dau pereții, ca inele spre interior, la o lățime de linie unul de altul; `liniiParalele` (`src/cam/paralel.ts`)
  dă umplerea (linii la un unghi și un pas, tăiate de bucle, cu insulele); `booleanContururi` unește formele suprapuse;
  `elementeFoaie` (`src/model/lume.ts`) dă formele foii în coordonatele lumii, cu instanțele așezate și rotite. Textul e deja
  contur (căi), nu un fel aparte de formă.
- **Profilul K1C din OrcaSlicer** [citit; `resources/profiles/Creality`, la `9005b64`, 07.11.2026]:
  - imprimanta: patul 220 × 220 mm, înălțimea 250, duza 0,4, Klipper, E relativ (`M83`); retragerea 0,8 mm la 40 mm/s, peste
    deplasări de cel puțin 1 mm și la fiecare strat; ridicarea 0,4 mm, ștergerea 2 mm; miniaturile PNG 96×96 și 300×300;
    începutul `START_PRINT EXTRUDER_TEMP=… BED_TEMP=…`, `T0`, `M204 S2000`, `M109 S…`, `G1 Z3 F600`, `M83`, `G92 E0`,
    `G1 Z1 F600`; sfârșitul `END_PRINT`. Macro-urile imprimantei fac restul: încălzirea, aducerea la zero, nivelarea, linia de
    curățare, răcirea la sfârșit;
  - procesul „0.20mm Standard @Creality K1C”: stratul 0,2 (și primul 0,2); lățimea liniei 0,42 (primul strat 0,5; pereții
    interiori și umplerea rară 0,45); 2 pereți; 5 straturi pline sus (cel puțin 0,8 mm), 3 jos; umplerea rară 15 %, în grilă,
    la 45°; vitezele: peretele exterior 200 mm/s, cei interiori 250, plinul 250, suprafața de sus 200, umplerea rară 270,
    primul strat 60, deplasarea 500; accelerațiile: pereții 3 000 mm/s², sus 2 000, primul strat 1 000, restul 10 000;
    compensarea „piciorului de elefant” 0,15 mm, pe primul strat; brim-ul automat (5 mm); fără fustă (skirt). Mai sunt
    „0.12mm Fine” și „0.24mm Draft”, pentru aceeași duză;
  - filamentul „Generic PLA @Creality K1-all”: duza 220 °C, patul 55 °C; ventilatorul piesei 100 % de la stratul al doilea,
    cel auxiliar 70 %; debitul 0,98; cel mult 18 mm³/s; un strat durează cel puțin 8 s (viteza coboară până la 20 mm/s).
    PETG („Generic PETG @Creality K1-all”): 250 / 70 °C, ventilatorul 40–90 %, debitul 0,95, cel mult 9 mm³/s, stratul cel
    puțin 12 s.
- **Ce scrie OrcaSlicer pentru Klipper** [citit; `src/libslic3r/GCode.cpp` și `GCodeWriter.cpp`, la `9005b64`]: antetul
  `; HEADER_BLOCK_START` … `; HEADER_BLOCK_END` (generatorul, numărul straturilor, miniaturile `; thumbnail begin 300x300 <n>`);
  pentru fiecare piesă `EXCLUDE_OBJECT_DEFINE NAME=… CENTER=x,y POLYGON=[[x,y],…]` (anvelopa convexă), apoi
  `EXCLUDE_OBJECT_START` / `EXCLUDE_OBJECT_END` în jurul ei, pe fiecare strat; schimbarea stratului `;LAYER_CHANGE`, `;Z:…`,
  `;HEIGHT:…`; accelerația `SET_VELOCITY_LIMIT ACCEL=… ACCEL_TO_DECEL=… MINIMUM_CRUISE_RATIO=…`; la sfârșit, filamentul folosit
  și timpul estimat, apoi configurația (`; CONFIG_BLOCK_START`). Obiectele definite așa sunt cele pe care K1C le trimite înapoi
  în `objects` (văzut în transcrierea din 07.11).
- **Debitul** [calculat]: secțiunea unei linii, în modelul OrcaSlicer (dreptunghi cu capete rotunde), e h · (w − h · (1 − π/4)):
  pentru w = 0,42 și h = 0,2, 0,075416 mm². Filamentul de 1,75 mm are 2,405282 mm², deci 0,031354 mm de filament pe mm de
  linie; cu debitul PLA (0,98), 0,030727. Pe primul strat (w = 0,5): 0,037247. Plafonul PLA (18 mm³/s) taie umplerea rară
  (0,45 × 0,2: 0,081416 mm²) la 221 mm/s, sub cei 270 din profil; plafonul PETG (9 mm³/s), la 110 mm/s.
- **Nemăsurat:** dacă ecranul K1C arată miniatura și „stratul x din N” pentru un fișier care nu vine din Creality Print (pe
  forumul Creality sunt ambele cazuri, după firmware); unde trage imprimanta linia de curățare (marginea de lăsat liberă).

## Decizia

### A. Ce e o piesă plată

1. O regiune închisă din desen, ridicată de pe pat la o înălțime H: formele închise ale pieselor, cu golurile după cuprindere
   (o formă cuprinsă întreagă în alta e gol, una cuprinsă într-un gol e insulă); formele care se suprapun doar în parte se
   unesc. Căile deschise nu se imprimă: se numără și se spun în dialog.
2. Pe fiecare strat, ca OrcaSlicer: întâi pereții interiori, apoi cel exterior, apoi umplerea; cusătura aliniată (fiecare inel
   începe în același loc, spre spatele patului). Umplerea: plină (linii la ±45°, alternând de la un strat la altul, cu 30 %
   suprapunere pe pereți) în primele 3 și ultimele 5 straturi, rară (grilă, 15 %) între ele. Primul strat, cu compensarea de
   0,15 mm.
3. Ce e mai îngust decât o linie nu se poate imprima: se arată cu roșu în previzualizare și se numără în dialog. Unde încape un
   singur perete, rămâne unul.

### B. Ce se imprimă (întrebarea 1)

4. **Recomandat:** piesele foii curente (sau doar cele selectate), așezate ca pe foaie, centrate pe pat ca un grup. Ce nu
   încape în 220 × 220 mm, cu 5 mm margine, e refuzat, cu mărimea spusă. Fiecare piesă e un obiect (`EXCLUDE_OBJECT`): dacă una
   se dezlipește, imprimanta o poate sări, iar celelalte merg mai departe.
   Alternativele: o singură piesă, aleasă în dialog; piesa „după CNC” (regiunea păstrată de tăieturi, cu buzunarele ca
   adâncituri), de la început.

### C. Înălțimea (întrebarea 2)

5. **Recomandat:** una pentru tot, în dialog, între 0,2 și 250 mm; implicit, grosimea foii (`stoc.grosime`), adică piesa pe care
   ar tăia-o CNC-ul. Documentul rămâne neschimbat.
   Alternativele: înălțimea fiecărei piese, ținută în proiect (schemă nouă, cu sesiunea principală); treptele luate din
   buzunarele CNC.

### D. Setările (întrebarea 3)

6. **Recomandat:** puține, cu restul din profilul K1C de mai sus: materialul (PLA sau PETG, cu temperaturile de schimbat),
   calitatea (fină 0,12 / standard 0,20 / rapidă 0,24 mm, profilele K1C ale OrcaSlicer), pereții (1–6), umplerea (0–100 %),
   brim-ul (automat / da / nu). Ultimele alese se țin în browser, ca alte alegeri ale ferestrei.
   Alternativa: toate setările, ca în OrcaSlicer (vitezele, accelerațiile, modelele de umplere).
   **Răspunsul (07.11): amândouă**, ca „Simplu” și „Avansat” în dialog. Materialele: toate filamentele generice K1 ale
   OrcaSlicer, cu moștenirile rezolvate (la `9005b64`): PLA, PLA High Speed, PLA Matte, PLA Silk (220 / 55 °C; debitul 0,98;
   cel mult 18, 23, 18 și 7,5 mm³/s), PLA-CF (220 / 60; 0,95; 12), PETG (250 / 70; 0,95; 9), ABS și ASA (260 / 105; 0,926;
   14 și 12), PC (270 primul strat, apoi 280 / 110; 0,94; 16), PA-CF (290 / 100; 1; 8), TPU (230 / 30; 1; 3,5; retragerea
   0,4 mm), fiecare cu ventilatoarele, încetinirea pentru răcire și densitatea lui.

### E. Fișierul

7. Doar ce scrie deja OrcaSlicer pentru K1C: același început și sfârșit (`START_PRINT`, `END_PRINT`: nivelarea, linia de
   curățare și răcirea rămân ale imprimantei), aceleași comenzi pe drum (`G0`, `G1`, `G92`, `M104`, `M109`, `M106`,
   `SET_VELOCITY_LIMIT`, `EXCLUDE_OBJECT_*`), același antet (miniaturile, numărul straturilor, filamentul, timpul), cu
   `; generated by CNC Vector Studio 2`. Nicio comandă nouă pentru imprimantă; proba o compară cu un fișier Creality Print
   (§Proba).
8. Liniile și arcele desenului ies ca segmente `G1`, la rezoluția profilului (0,012 mm): profilul K1C n-are arcele `G2` / `G3`
   pornite.
9. Viteza fiecărei linii e cea a rolului ei, tăiată de plafonul de debit al materialului; pe straturile mici, încetinită ca
   stratul să dureze cel puțin 8 s la PLA (12 la PETG), dar nu sub 20 mm/s (răcirea, ca în profil). Timpul estimat se
   calculează cu accelerațiile (trapez), ca în antetul OrcaSlicer.
10. Numele: `<foaia>_<material>_<timp>.gcode` (ca `filename_format` din OrcaSlicer), cu regulile trimiterii (3.6h: fără spații,
    fără suprascriere).

### F. Locul și previzualizarea (întrebarea 4)

11. **Recomandat:** în fereastra Imprimanta, sub lista fișierelor, butonul „Din desen…”, lângă „Trimite un fișier…”. Dialogul
    merge și fără imprimantă legată (atunci doar „Salvează .gcode”); cu ea, „Trimite la imprimantă” trece prin trimiterea și
    verificarea de la 3.6h (același dialog, aceeași bifă „Patul e gol” la pornire).
    Alternativa: în dialogul exportului, ca altă mașină, lângă CNC (odată cu sistemul de module).
12. Previzualizarea: patul văzut de sus, stratul ales cu un glisor, culorile pe rol (peretele exterior, cei interiori, plinul,
    umplerea rară; deplasările, la cerere); dedesubt, straturile, timpul și filamentul (metri, grame). Fără 3D în prima felie.

### G. Bugetul și modulul (întrebarea 5)

13. Codul stă în `src/cam/feliere/` (propus în `src/machine/imprimanta/feliere/`, dar regula importurilor
    `masina-fara-post-si-document` ține transportul fără document: felierea pleacă din document, deci e CAM), încărcat la
    deschiderea dialogului, într-o bucată a lui, fără niciun import din nucleu spre el: gata de mutat într-un modul. Folosește
    geometria pe care firul principal o are deja (offsetul, booleenele, în bucata lor comună); liniile umplerii le face singur.
14. **Recomandat:** bucata intră în precache și în totalul de 550 kB, ca orice fereastră: merge și fără internet, în atelier.
    Estimarea: +8 … 12 kB (felierea ~6, dialogul cu previzualizarea ~4), pornirea neschimbată (101,7 / 110). Pe ramură,
    totalul e 531,4 / 550; cu liniile care așteaptă unirea, plafonul se poate umple: atunci decide owner-ul, ca la ADR 0122 și
    ADR 0137.
    Alternativa: bucata adusă la prima folosire și ținută apoi pentru offline (o a treia categorie în precache, primul pas al
    modulelor), în afara totalului, cu plafonul ei; atinge workerul PWA, deci se face cu sesiunea principală.

### H. Siguranța

15. Fișierul făcut trece prin aceeași verificare ca orice fișier trimis (3.6h): antetul, temperaturile, mișcările față de pat.
16. Fișierul doar pleacă; pornirea rămâne clicul omului, cu bifa „Patul e gol” (ADR 0190 §E). Temperaturile se scriu doar în
    fișier; aplicația tot nu încălzește nimic din fereastră.

## Feliile

Răspunsul owner-ului (07.11): toate variantele care pot sta împreună devin opțiuni în aplicație.

- **3.6j** (§A–§H): motorul (pereții, plinul de jos și de sus, grila, primul strat cu compensarea lui, brim-ul, retragerea și
  ridicarea, ventilatoarele, încetinirea pentru răcire, plafonul de debit, obiectele, antetul cu miniaturile, timpul și
  filamentul), cu înălțimea fiecărei piese ținută de la început în motor; dialogul „Din desen…” din fereastra Imprimanta: ce se
  imprimă (piesele foii, selecția sau o singură piesă: 1a, 1b), o înălțime (2a), „Simplu” (materialul, calitatea, pereții,
  umplerea, brim-ul) și „Avansat” (lățimile liniilor, straturile de sus și de jos, vitezele, accelerațiile, retragerea,
  ridicarea, ventilatoarele, răcirea, compensarea primului strat, lățimea brim-ului) (3a, 3b); straturile văzute de sus;
  salvarea și trimiterea prin 3.6h (4a); bucata în precache, în totalul de 550 kB (5a). Proba pe imprimanta falsă; apoi, cu
  owner-ul, o placă de probă pe K1C.
- **3.6k** (3b, mai departe): alte modele de umplere (linii, triunghiuri, fagure, giroid, concentric) și ale suprafeței de sus,
  cusătura (aliniată, în spate, cea mai apropiată, aleatorie), ștergerea la retragere, călcarea suprafeței de sus, fusta.
- **3.6l** (1c, 2b, 2c): piesa „după CNC” (regiunea păstrată de tăieturi, cu buzunarele ca trepte și găurile găuririi) și
  înălțimea fiecărei piese ținută în proiect: un câmp opțional al piesei, fără schemă nouă (ca ghidajele, ADR 0050), cu
  sesiunea principală.
- **3.6m** (4b, 5b): intrarea din dialogul exportului (altă mașină, lângă CNC) și bucata felierii adusă la prima folosire, cu
  „Descarcă pentru lucru fără internet”: odată cu sistemul de module, cu sesiunea principală (atinge exportul, workerul PWA și
  precache-ul). 5a și 5b nu pot sta împreună pentru aceeași bucată: 3.6j merge pe 5a, iar 5b vine ca opțiune odată cu modulele.
- Mai târziu, fiecare cu decizia ei: așezarea automată pe pat (cu imbricarea din `src/io/imbricare.ts`), previzualizarea 3D.
  Modelele 3D (STL, 3MF) rămân în Creality Print sau OrcaSlicer (ADR 0119 §13).

## Proba

- **Pe hârtie** (`test/unit/imprimanta.feliere.test.ts`): straturile și Z-urile lor (0,2; 0,4; …; H); fiecare extrudare în
  piesă (cel mult w/2 în afara conturului); câți pereți; umplerea doar înăuntrul pereților; E pe mm, pe valorile de mai sus
  (0,030727 pentru 0,42 × 0,2, PLA); viteza tăiată de plafonul de debit (221 mm/s); retragerea la deplasările de peste 1 mm;
  ventilatorul oprit pe primul strat; antetul și sfârșitul; o piesă cu gol, una cu insulă, una prea subțire.
- **Aceeași verificare ca la trimitere:** fișierul nostru trece prin `analizeazaText` (3.6h): K1C, duza 0,4, materialul,
  temperaturile, întinderea în pat.
- **Fișierul de referință:** un `.gcode` din Creality Print al owner-ului (un cub de calibrare), anonimizat, în
  `test/fixtures/imprimanta/`: fișierul nostru nu folosește nicio comandă pe care referința n-o are; pentru același cub,
  straturile la fel, filamentul la ±5 %, timpul la ±25 %.
- **Imprimanta falsă** (e2e): „Din desen…”, previzualizarea, „Trimite la imprimantă”: fișierul ajuns are antetul,
  `START_PRINT` cu temperaturile și atâtea `;LAYER_CHANGE` câte straturi spune dialogul.
- **Otrăvurile:** `test/otravuri/3.6j.py`.
- **Pe imprimanta owner-ului:** o placă de 40 × 20 × 3 mm, cu o gaură de 10 mm și o fantă, trimisă și pornită din cvs2; cu
  șublerul: 40,0 și 20,0 (±0,2), 3,0 (±0,1), gaura puțin sub 10 (găurile ies mai mici); primul strat lipit, pereții închiși,
  fața de sus închisă. Și ce arată ecranul imprimantei: miniatura, „stratul x din N”.

## Felia 3.6j (07.11.2026): piesele plate, fără imprimantă

- **Codul** (`src/cam/feliere/`): `profil.ts` (imprimanta, cele 5 calități și cele 11 materiale K1, setările și limitele lor),
  `piese.ts` (piesele foii, ale selecției sau una singură; unirea pe componente: formele care se ating se adaugă pe rând la o
  regiune, una care atinge exteriorul se unește cu el, una care intră într-un gol îl micșorează; centrarea pe pat, cu marginea),
  `straturi.ts` (pereții prin `offsetFigura`, la pasul OrcaSlicer, cu compensarea primului strat și cusătura la spate;
  umplerea pe linii aliniate la pat, în lanțuri zigzag, grila; brim-ul; ce e mai îngust decât o linie), `gcode.ts` (fișierul,
  timpul cu joncțiunile lui Klipper, încetinirea pentru răcire, ventilatoarele, obiectele), `campuri.ts` („Avansat”),
  `index.ts` (`feliaza`). Dialogul: `src/app/DialogDinDesen.tsx`, adus la primul clic pe „Din desen…”, care stă în ambele
  vederi ale ferestrei (fără imprimantă, sub textul de început; cu ea, lângă „Trimite un fișier…”). Aplicația dă desenul ca o
  funcție (`desen`), citită la clic.
- **Măsurat:** placa de probă de 40 × 20 × 3 mm, cu gaura de 10 mm și fanta: 15 straturi, 1,75 g de PLA (pe hârtie, ~1,8),
  ~3 min 36 s (înainte de recenzie); E pe mm exact pe valorile
  de pe hârtie (0,030727, 0,033172 și 0,037247). Felierea: ~0,1 s pentru o placă mică, ~1 s pentru 180 × 180 × 20 mm la 0,20 și
  ~1,6 s la 0,08 (16 MB de G-code), pe firul principal. **Mărimea:** bucata dialogului are 14,2 kB gzip (dialogul 34 %,
  G-code-ul 25 %, straturile 13 %, profilul 11 %; fără geometrie dublată: offsetul stă în bucata lui comună), deci totalul
  549,6 / 550 (+14,7, peste estimarea de 8–12 de la §G), iar pornirea 101,8 (+0,1: `desen` din aplicație). Următoarele linii
  cer decizia owner-ului: plafonul, ca la ADR 0122 și 0137, sau modulele (5b).
- **Măsurat după recenzie** (`6720782`): placa de probă, cu fanta de 12 × 2 mm, la PLA 0,20: 15 straturi, 1,78 g, ~3 min
  45 s (fără încălzire); la 0,12: 25 de straturi, ~5 min; PETG: ~4 min 45 s. Bucata dialogului are 15,2 kB (+1,0, chiar
  reparațiile: brim-ul comun, primul strat de rezervă, verificarea patului pe tot, temperaturile din Simplu), iar
  `PanouImprimanta` +0,2: pe ramură, 550,8 / 550, peste vechiul plafon cu 0,8 kB. Între timp, owner-ul a ridicat plafonul la
  600 kB (ADR 0143, 07.11): cu `main` adus în ramură (`b29d6dc`), totalul e 550,8 / 600, iar pornirea 101,8 (cu ușa
  105,4 / 110).
- **Găsit pe drum:** (1) unirea pe perechi lăsa o formă care intră într-un gol apărut dintr-o unire drept gaură (și relua la
  nesfârșit diferența): acum pe componente; (2) încetinirea pentru răcire nu ajungea la timpul minim pe piesele mici (timpul nu
  scade liniar cu viteza, din cauza accelerațiilor): acum factorul se caută prin înjumătățire, până la viteza minimă; (3) poarta
  importurilor a mutat codul în `src/cam/feliere/` (punctul 13).
- **Proba:** `test/unit/imprimanta.feliere.test.ts` (18, pe valori de pe hârtie); manualul numește fiecare control al
  dialogului și fiecare setare din „Avansat” (proba lui le caută pe toate); e2e +2 (fără imprimantă, cu fișierul descărcat;
  cu imprimanta falsă, prin verificarea și trimiterea de la 3.6h); otrăvurile `test/otravuri/3.6j.py`.
- **Recenzia cu agenți** (07.11, după porțile verzi: 4 lentile, fiecare cu un verificator care a încercat s-o răstoarne; 8
  agenți, ~2,6 milioane de tokeni): 51 de constatări, 49 confirmate, toate reparate sau probate. Cele care puteau strica o
  imprimare: brim-ul nu intra în verificarea patului (ieșea din pat cu un brim lat), brim-ul fiecărei piese trecea prin
  piesele vecine, compensarea primului strat ștergea trăsăturile de 0,42–0,8 mm (imprimate apoi în aer, de la stratul 2),
  „Duza” și „Patul” din Simplu nu ajungeau pe primul strat, iar duza cobora la Z0.2 pe loc, după `START_PRINT`. Reparat: un
  brim pentru tot grupul (`brimGrup`, buclele grupate pe piese), verificarea patului pe tot ce se extrudează și pe Z-ul real al
  ultimului strat (cu ridicarea plafonată), primul strat fără compensare unde aceasta ar pierde arie, temperaturile din Simplu
  și pe primul strat (cu diferența profilului), prima deplasare la Z1 și coborârea la destinație (ca OrcaSlicer). Apoi: umplerea
  fiecărei insule de la adâncimea ei, grila rară fără legături, unirea fără dependență de ordine (golul acoperit, latura
  comună), ventilatorul oprit pe straturile mai lungi decât timpul de răcire (ca OrcaSlicer), patul K1C oricare ar fi
  imprimanta legată (cu avertisment), dialogul unic (nu dispare la o schimbare a legăturii, nu oprește o trimitere), desenul
  citit din nou la o schimbare, câmpurile fără refeliere inutilă, Escape și focusul, previzualizarea la o lățime nouă,
  deplasările la cerere. Probele noi: `imprimanta.feliere.recenzie.test.ts` (22), cu tabelele legate de profilele OrcaSlicer
  (`test/fixtures/imprimanta/orca-k1.json`), starea retragerii și Z-ul în tot fișierul, accelerațiile, debitul pe rol, grila,
  încetinirea, obiectele, piesele de înălțimi diferite, filamentul pe hârtie; e2e-ul, cu temperatura din Simplu în `START_PRINT`,
  desenul reîmprospătat și Escape. Rămâne: două forme care se ating într-un singur colț se refuză (cu motiv).
- **Nemăsurat încă:** placa de probă pe K1C; ce arată ecranul imprimantei (miniatura, „stratul x din N”); unde trage linia de
  curățare.

## Felia 3.6k (08.11.2026): setările avansate mai departe

La „Da, 3.6k”: răspunsul 3b mai departe, cu toate variantele OrcaSlicer care pot sta împreună, ca opțiuni în „Avansat”.

- **Cercetarea** [citit, la `9005b64`]: definițiile și implicitele din `src/libslic3r/PrintConfig.cpp` (`sparse_infill_pattern`,
  26 de modele; `top_surface_pattern`, `bottom_surface_pattern`, `internal_solid_infill_pattern`, câte 9; `seam_position`,
  `staggered_inner_seams`, `seam_gap`; `wipe*`, `retract_before_wipe`, `role_based_wipe_speed`; `ironing_*`; `skirt_*`,
  `draft_shield`, `min_skirt_length`); profilele K1C, rezolvate pe calitate: grila rară la toate, afară de 0,12 (hașura în
  cruce, fără cusăturile dinăuntru decalate, călcarea la 100 mm/s și 0°); sus „monotonic line”, jos și dinăuntru „monotonic”;
  cusătura aliniată, cu cele dinăuntru decalate; golul ei, 10 % din duză; ștergerea pornită de imprimantă (2 mm, 70 % din
  retragere înainte, viteza după rol); fără călcare (10 %, 8 % la 0,08; pasul 0,15; 30 mm/s; 90°); fără fustă (2 mm, un strat,
  50 mm/s). Algoritmii: `Fill/` (`FillRectilinear` cu familiile și fazele lor, `FillLine`, `FillHoneycomb`, `FillGyroid`,
  `FillCrossHatch`, `FillConcentric`, `FillPlanePath`), `GCode.cpp` (`Wipe::wipe`, `calculateWipeRetractionLengths`, fusta pe
  strat), `GCode/SeamPlacer.cpp` (penalizarea colțurilor, spatele, cea mai apropiată, aleatoarea, decalarea), `Fill/Fill.cpp`
  (`make_ironing`), `Print.cpp` (`_make_skirt`). „zig-zag” din profile e numele vechi al lui „rectilinear” (`handle_legacy`).
- **Ce intră** (implicitele, ale profilului): 14 modele rare (grila, dreptunghiular, aliniat, linii oscilante, triunghiuri,
  tri-hexagon, cubic, hașura în cruce, fagure, giroid, concentric, curba Hilbert, coardele lui Arhimede, spirala octogramă) și
  direcția lor; 8 modele pentru fiecare suprafață plină (sus, jos, dinăuntru) și direcția plinului; cele 5 locuri ale
  cusăturii, decalarea, golul; ștergerea (pornită, distanța, partea dinainte, viteza după rol sau din deplasare); călcarea (4
  feluri, 2 modele, debitul, pasul, viteza, marginea, unghiul); fusta (buclele, distanța, straturile, viteza, combinată sau pe
  piesă, lungimea minimă, scutul, începutul, o buclă după primul strat).
- **Ce nu intră încă** (fiecare cu felia ei, dacă owner-ul le vrea): modelele rare care cer straturile de deasupra sau o rețea
  3D în plus (adaptive / quarter / support cubic, lightning, 3D honeycomb, lateral honeycomb și lattice, TPMS-D și TPMS-FK, zig
  zag / cross zag / locked zag, noi în Orca), „spiral inset” la suprafețe; legăturile umplerii rare pe lângă pereți
  (`infill_anchor`, 400 %, cel mult 20 mm: la noi liniile rare rămân nelegate, cu deplasări, ca la 3.6j); ridicarea „Auto Lift”
  a profilului K1C (`z_hop_types`: la noi, ridicarea simplă, pe Z).
- **Codul:** `linii.ts` (liniile, mutate din `straturi.ts`; umplerea monotonă, pe regiuni în care fiecare interval are un
  singur vecin pe linia de dinainte și pe cea de după, de la prima linie spre ultima; tăierea unei polilinii de o regiune, cu o
  grilă a laturilor), `modele.ts` (generatoarele portate), `straturi.ts` (cheia fiecărui strat: rolul, unghiul, cu alternarea
  modelelor care o au, și Z-ul, la cele 3D; cusătura; călcarea; fusta), `gcode.ts` (ștergerea, cusătura aleasă la scriere,
  fusta, subsolul). **Reparat pe drum:** pasul grilei rare, din pasul liniei (`spacing`, ca `fill_surface_by_multilines`), nu
  din lățimea ei: umplerea ieșea cu ~10 % mai rară decât în OrcaSlicer.
- **Măsurat:** densitatea, față de aria · d / sp: liniile și curbele 1,000; giroidul 0,90–0,93; fagurele 1,2–1,3 (ca în
  OrcaSlicer); hașura în cruce 0,93–1,07. Felierea unei plăci de 60 × 40 × 4 mm: 25–100 ms; cu Hilbert pe toate plinurile,
  0,3 s (și 28 min de imprimare, față de 9). Mărimea: totalul 558,4 / 600 kB (+7,6 față de 3.6j; bucata „Din desen…” 23,2 kB gzip, +8,0), pornirea 101,8 (cu ușa 105,4 / 110), neschimbată.
- **Proba:** `imprimanta.feliere.modele.test.ts` (16, pe hârtie: implicitele legate de fixtura OrcaSlicer, extinsă cu cheile
  3.6k pe fiecare calitate; pașii, fazele și alternarea modelelor; densitatea; modelele 3D pe Z; ordinea monotonă; cusătura;
  golul; ștergerea, cu cantitățile lui `calculateWipeRetractionLengths` și drumul ei; călcarea; fusta; subsolul; setările
  citite; tăierea polilinilor); e2e +1 (listele și bifele din „Avansat”, giroidul, călcarea, fusta pe pânză, ștergerea în
  fișier și oprită); otrăvurile `test/otravuri/3.6k.py` (58, toate prinse: la prima rulare (`887507f`), 49 din 53 unitare; M08 (aproape echivalentă: muta doar faza fagurelui) mutată pe latura scurtă, cu proba hexagoanelor regulate, iar N01, N03 (U-ul probei n-avea linii cu două intervale) și S04 (fusta după primul strat, probată doar în previzualizare), prinse după întărirea probelor (`9cf9d5a`); cele 5 e2e, prinse. Lista 3.6j, refăcută pe codul mutat: 50 / 50 (F09 mutată pe cusătura pereților; la R11, revenirile numărate)). Porțile: unit 8 717 (8 709 trecute, 0 căderi, 8 sărite); build-ul determinist (285 de fișiere identice); e2e 378 / 378 din prima (4 lucrători).

## Felia 3.6l (acceptată, 08.11.2026): piesa „după CNC” și înălțimea fiecărei piese

**Răspunsul owner-ului (08.11):** „Da, recomandările”: A a (V-carve-ul se ignoră, cu o notă în dialog) și B a (adâncimile
rămân aceleași, în mm, măsurate de sus). Schița: <https://claude.ai/artifact/7XG7M4A5imWUngG4VmtgZw>.

La „Da, 3.6l”: răspunsurile 1c, 2b și 2c. Cercetarea, în cod [citit]:

- **Tăieturile foii** (`taieturiFoaie`, `src/model/lume.ts`) dau, în lume, fiecare operație cu felul ei (profil, buzunar,
  găurire, V-carve), latura, adâncimea și freza; **regiunea păstrată** (`regiunePastrata`, ADR 0026, `src/cam/regiune.ts`, folosită
  de lucrare) spune deja ce rămâne după profilele prin tot material: marginea piesei și golurile ei.
- **Găurirea** (ADR 0087) scoate cercul documentului (cel puțin cât freza, cel mult de două ori), până la adâncime; **buzunarul**
  scoate aria dinăuntrul conturului (cu frezele de rest, până în colțuri); un **profil parțial** scoate o bandă de lățimea frezei,
  pe partea tăieturii; **V-carve-ul** sapă în V, cu adâncimea după lățime.
- **Piesa** din document are semnătura deschisă (`[cheie: string]: unknown`): un câmp opțional încape fără versiune nouă a
  documentului, ca ghidajele foii (ADR 0050).

**Propunerea:**

1. **„După CNC”**, o bifă în „Ce se imprimă”: fiecare piesă, cum o lasă freza. Marginea și golurile, din profilele prin tot
   (aceeași regulă ca regiunea păstrată); buzunarele, găuririle și profilele parțiale coboară zona lor la H − adâncime (H =
   grosimea foii); ce trece prin tot e gol. Urechile, rampele și intrările nu contează (sunt ale prinderii pe CNC).
2. **Treptele, în motor:** o piesă poate avea zone de înălțimi diferite. Pe fiecare strat, regiunea e unirea zonelor cel puțin
   atât de înalte; plinul de sus se pune la fiecare treaptă (unde zona de deasupra lipsește pe grosimea de sus), plinul de jos
   doar pe primele straturi; pereții urmează regiunea fiecărui strat.
3. **Înălțimea fiecărei piese**, ținută în proiect: câmpul opțional `inaltimeImprimanta` (mm) al piesei, scris din dialog (cu
   anularea obișnuită); în dialog, lângă „o înălțime pentru toate”, varianta „a fiecărei piese”, cu lista pieselor. Documentul
   rămâne la versiunea lui; sesiunea principală află câmpul (unirea lui în `main`).

**Întrebările** (doar ce se exclude; recomandarea întâi):

- **A. V-carve-ul la „după CNC”:** a) se ignoră, cu o notă în dialog (recomandat: o gravură în V nu are trepte drepte); b) o
  treaptă la adâncimea maximă, pe toată lățimea; c) terase, strat cu strat, după lățimea V-ului la fiecare înălțime (cel mai
  aproape de piesa CNC, cel mai mult cod). Pot sta împreună ca opțiuni (b și c), dacă le vrei pe toate.
- **B. Adâncimile, când înălțimea aleasă nu e grosimea foii:** a) rămân aceleași, în mm, măsurate de sus (recomandat: un buzunar de
  3 mm rămâne de 3 mm); b) se scalează cu înălțimea (piesa CNC, întinsă pe Z). Se exclud pentru aceeași piesă; pot fi o alegere.

**Implementarea (08.11):**

- **După CNC** (`src/cam/feliere/dupaCnc.ts`): fiecare instanță, din tăieturile ei (`taieturiFoaie`). Marginea și golurile:
  inelele prin tot (profil exterior / interior, adâncimea cel puțin cât grosimea foii G, fără freză în V), cu
  `regiunePastrata`; contururile sunt inelele de margine (piesa de o parte, altceva de cealaltă), citite par-impar. Fără niciun
  inel de piesă, refuz („fără margine”); un refuz al regiunii păstrate (inele care se ating), cu motivul ei. Treptele: buzunarele
  (pe adâncimi, par-impar, ca lucrarea: un contur într-altul de aceeași adâncime e insulă), găuririle (cercul desenului),
  profilele parțiale și cele pe căi deschise (ce scoate freza purtată pe traseul centrului ei, din `profil()`: capsulele
  segmentelor, la raza frezei; pe o parte, cu oglindirea). Prin tot (adâncimea cel puțin G, intenția de pe CNC, sau cel puțin
  înălțimea H aleasă): gaură. Înălțimea treptei: H minus adâncimea (B a). Urechile, rampele, intrările și degajările nu
  contează; V-carve-ul și orice tăietură cu freza în V se numără, pentru notă (A a). O formă fără operație nu e gaură.
- **Booleanele** (`trepte.ts`): `normalizeaza` din ușa importului (nonzero → par-impar: muchiile comune, tangențele și arcele
  exacte), cu o cutie: A minus U = B minus (compl(A) ∪ U), intersecția la fel; un singur apel pe combinație. Probat pe hârtie (un
  buzunar care atinge două margini, un cerc, o treaptă care iese din piesă) și pe capsule (puncte la cel mult r de cale).
- **Motorul:** benzile (`benziPiesa`): înălțimile treptelor, ca număr de straturi; banda b are regiunea benzii de dedesubt minus
  treptele care se termină sub ea; cu aceeași arie, se unesc; goală, taie vârful piesei. Felul stratului (`fel.ts`): la o piesă
  cu trepte, de la stratul 2, cheia `t:b:b1:bs:…` (banda lui, a stratului de deasupra, a celui cu `sus` straturi mai sus);
  părțile: suprafața de sus în R_b minus R_b1, plinul în R_b1 minus R_bs, umplerea rară în R_bs, fiecare cu modelul, lățimea și
  suprapunerea ei; pereții, ai benzii. Primul strat rămâne suprafața de jos peste toată piesa (ca OrcaSlicer, unde jos și sus se
  suprapun). Călcarea: „toate suprafețele de sus” și fața fiecărei trepte; „doar cea mai de sus”, doar vârful; „toate
  straturile pline”, și plinul de sub o treaptă. Deplasările se judecă pe conturul benzii (retragerea peste golul unei trepte).
  Ce nu iese (mai îngust decât o linie), pe fiecare bandă. **O piesă fără trepte merge pe drumul de până acum:** 171 de variante
  (modelele, cusăturile, călcarea, fusta, brim-ul; trei piese) dau aceleași fișiere, octet cu octet, ca înainte.
- **Înălțimea în proiect:** `inaltimeImprimanta` (mm) în piesă (tipul și schema: opțională, pozitivă, ca ghidajele foii, fără
  versiune nouă); scrisă de `comandaInaltimi` (`src/model/inaltimeImprimanta.ts`), o comandă obișnuită (un pas, cu anularea),
  prin App → fereastra Imprimanta → dialog; în doar-citire, lista nu se schimbă.
- **Dialogul:** bifa „După CNC: buzunarele, găuririle și profilele parțiale ca trepte” (cu ajutorul și nota V-carve-ului),
  „Înălțimea”: „Una pentru toate” sau „A fiecărei piese, ținută în proiect” (lista pieselor alese); alegerile, în browser;
  stratul cu treaptă își spune părțile („cu o treaptă: …”). Manualul, în ambele limbi.
- **Nu acum:** grosimea verticală sub pereții treptelor (`ensure_vertical_shell_thickness` din OrcaSlicer: plinul sub pereții
  unei benzi de sus); la noi, pereții de deasupra unei trepte stau pe umplerea rară. De propus ca felie (o opțiune), după proba
  plăcii.
- **Măsurat și probat:** felierea plăcii de 18 mm cu buzunar, găurire și canelură, ~0,2 s (booleanul unei benzi, ~10 ms). Mărimea: totalul 566,2 / 600 kB (+7,8; bucata „Din desen…” 26,9 kB gzip), pornirea 102,0 (+0,2: scrierea înălțimii în App și câmpul din schemă; cu ușa 105,6 / 110). Proba: `imprimanta.feliere.trepte.test.ts` (12, pe hârtie), e2e +1, manualul (4 controale); otrăvurile `test/otravuri/3.6l.py`: 58, toate prinse (la prima rulare, 48 din 50 unitare; D02 și S04 prinse după întărirea probelor, `3607398`; cele 8 e2e, de proba 3.6l). Porțile: unit 8 728 (0 căderi, 8 sărite), build-ul determinist (287 de fișiere identice), e2e 379 / 379 din prima.

## Felia 3.6n (acceptată, 08.11.2026): grosimea verticală sub pereții treptelor

La întrebarea de după 3.6l („Fac și opțiunea cu plin sub pereții treptelor cât aștepți proba plăcii?”), owner-ul: „Da, pereții
treptelor”. La 3.6l, pereții de deasupra unei trepte stăteau pe umplerea rară.

- **Cercetarea** [citit, la `9005b64`]: `ensure_vertical_shell_thickness` (`src/libslic3r/PrintConfig.cpp`): `none`,
  `ensure_critical_only`, `ensure_moderate`, `ensure_all`, implicit `ensure_all` (vechiul „1” = all, „0” = moderate). Profilele
  K1C: 0,08, 0,16, 0,20 și 0,24 scriu `ensure_all`, 0,12 moștenește implicitul: toate, „toată”. `PrintObject.cpp`:
  - `discover_vertical_shells` (doar la „toată”): pe stratul k, plinul = internul ∩ regularizat((proiecțiile fețelor de sus ale
    straturilor k+1 … k+nt−1) ∪ (internul minus intersecția zonelor de umplere ale straturilor din raza aceea)). Regularizarea:
    deschiderea cu r1 = 0,325 · ms, închiderea cu r2 = 0,6 · ms, lărgirea cu r3 = 0,2 · ms (ms = 1,05 · pasul plinului), apoi
    bucățile sub 1,5 · ms mm² (sau sub 8 · ms, dacă nu acoperă o regiune a internului) scoase.
  - `discover_horizontal_shells` (celelalte moduri): proiecția fețelor de sus; regiunile mai înguste decât 2 · 0,5 (fără), 2 · 0,2
    (doar critic) lățimi de perete exterior scoase (fără umplere rară, 2 · 1); cele prea înguste pentru plin (sub 2 · 3 lățimi de
    plin, la „fără” 2 · 1) lățite cu atât, cât încap în intern.
- **Decizia:** toate patru valorile, ca opțiuni, în „Avansat” → „Straturile”: „Grosimea verticală a pereților” (Toată (și sub
  pereții treptelor), implicit; Moderată; Doar ce e critic; Fără), cu rândul `ensure_vertical_shell_thickness` în subsolul
  fișierului. Nicio întrebare: valorile se exclud doar pentru aceeași feliere, deci stau împreună ca listă.
- **La noi** (prisme pe benzi, fundul doar pe pat): raza de jos nu schimbă nimic (benzile se strâng în sus), iar zonele de umplere
  ale straturilor din raza de sus se intersectează în umplerea benzii celei mai de sus, bt = banda stratului min(k + sus − 1, n).
  Cheia stratului o ține (`:bt`, doar la „toată” și bt ≠ b). Pe un strat amestecat, plinul fiecărei insule e S = internul minus
  (R_bs ∩ umplerea lui R_bt), lucrat după mod; umplerea rară = internul minus S (ce scoate filtrul îngust redevine rar, ca la
  OrcaSlicer). Călcarea „toate straturile pline” calcă și inelul. Lățirea, la celelalte moduri, ia regiunile întregi care dispar
  la strângere, nu și gâturile înguste ale unei regiuni mari: offsetul nostru rotunjește colțurile convexe (OrcaSlicer le ține
  drepte, cu îmbinarea în unghi), iar fiecare colț ar fi părut îngust (văzut în probă: colțurile unui buzunar de 40 × 30 se
  lățeau cu 1,26 mm). O piesă fără trepte nu se schimbă (afară de rândul din subsol): 171 de variante, aceleași drumuri.
- **Măsurat și probat:** inelul ajunge la 0,906 mm de marginea buzunarului (0,827, marginea pereților, plus 0,079, lărgirea),
  exact pe hârtie. Mărimea: totalul 567,3 / 600 kB (+1,1), pornirea 102,0. Proba: 4 noi în
  `imprimanta.feliere.trepte.test.ts` (inelul, regiunile înguste, uneltele, găurirea mică), cele 3.6l pe modul „fără”, e2e
  (lista, eticheta stratului); otrăvurile `test/otravuri/3.6n.py`: 28 / 28 din prima. Porțile: unit 8 733 (0 căderi), build-ul
  determinist, e2e 379 / 379. Reparat pe drum: listele lungi din „Avansat” se strâng la lățimea coloanei.

## Întrebările (owner)

**Răspunsul, din 07.11:** „vreau sa le faci pe toate cele care pot functiona ca optiuni diferite si pot fi disponibile in
soft”: 1a, 1b și 1c; 2a, 2b și 2c; 3a și 3b; 4a și 4b; la 5, 5a acum, 5b cu modulele (secțiunea „Feliile”). Fișierul de
referință: încă nu.

1. **Ce se imprimă:** a) piesele foii (sau cele selectate), așezate ca pe foaie, centrate pe pat (recomandat); b) o singură
   piesă, aleasă în dialog; c) piesa „după CNC”, cu buzunarele ca trepte, de la început.
2. **Înălțimea:** a) una pentru tot, implicit grosimea foii (recomandat); b) a fiecărei piese, ținută în proiect; c) treptele
   din buzunare.
3. **Setările:** a) puține: materialul, calitatea, pereții, umplerea, brim-ul; restul din profilul K1C (recomandat); b) toate,
   ca în OrcaSlicer.
4. **Locul:** a) în fereastra Imprimanta, „Din desen…” (recomandat); b) în dialogul exportului, ca altă mașină.
5. **Bugetul:** a) în precache, în totalul de 550 kB (recomandat); b) adus la prima folosire, apoi ținut pentru offline (primul
   pas al modulelor).

Și, dacă e la îndemână: un cub de calibrare feliat în Creality Print, salvat ca `.gcode` pe calculator (fișierul de referință
al probei; tot cu el se poate face pasul 3 din 3.6i, „Trimite un fișier…”).

## Ce am respins

- **Modelele 3D (STL, 3MF) feliate în cvs2:** un feliator întreg (surplombe, suporturi, punți, plase închise), sute de kB, pe
  care Creality Print și OrcaSlicer îl au deja (ADR 0119 §13).
- **Un feliator gata făcut, rulat în browser** (OrcaSlicer sau CuraEngine compilat în WebAssembly): zeci de MB, cu mult peste
  buget, pentru piese care nu-i folosesc nimic din ce are în plus.
- **Exportul STL al piesei plate, feliat apoi în Creality Print:** ieftin, dar lasă drumul lung prin două programe; poate veni,
  la cerere, ca rezervă, într-o felie mică.
- **Arcele `G2` / `G3`:** profilul K1C nu le folosește; segmentele `G1` sunt ce primește imprimanta de la OrcaSlicer.

## Se redeschide dacă

- K1C refuză sau tratează altfel o comandă din fișierul nostru (fișierul de referință sau placa de probă o arată);
- owner-ul vrea și modele 3D în cvs2;
- vine altă imprimantă (alt pat, alte macro-uri, alt profil).

## Sursele

- OrcaSlicer, profilele Creality, la `9005b64` (07.11.2026): `resources/profiles/Creality/machine/Creality K1C 0.4 nozzle.json`,
  `process/0.20mm Standard @Creality K1C 0.4 nozzle.json` (moștenește `fdm_process_creality_common.json`),
  `filament/Generic PLA @Creality K1-all.json` și `filament/Generic PETG @Creality K1-all.json` (cu moștenirile, până la
  `fdm_filament_common.json`): <https://github.com/SoftFever/OrcaSlicer/tree/main/resources/profiles/Creality>.
- OrcaSlicer, ce scrie pentru Klipper, la `9005b64`: `src/libslic3r/GCode.cpp` (antetul, `EXCLUDE_OBJECT_DEFINE`, schimbarea
  stratului) și `src/libslic3r/GCodeWriter.cpp` (`SET_VELOCITY_LIMIT`).
- Forumul Creality, miniaturile pe K1C: <https://forum.creality.com/t/k1c-thumbnails-missing/51837>,
  <https://forum.creality.com/t/k1c-screen-diplays-file-logo-instead-of-part-image/15302>.
