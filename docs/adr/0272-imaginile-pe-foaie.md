# ADR 0272 — Imaginile pe foaie (straturile bitmap)

**Starea:** acceptat pe 21.11.2026, la „Da, 1a–3a” (owner-ul, în sesiunea liniei trasării): toate recomandările de la
capăt. Propus în aceeași zi, la „Da, propunerea” (la întrebarea „Pregătesc propunerea pentru straturile bitmap (ADR 0272,
cu schiță)?”). Feliile 25.8↑a și 25.8↑b, fără mașină, în linia trasării (ramura `wip/25.1-trasare`). **25.8↑a
implementată** pe 23.11 (mai jos, „Implementarea”); **25.8↑b implementată** pe 24.11, la „pornește 25.8↑b” („Implementarea
(25.8↑b)”).
**Completează:** ADR 0220 (trasarea din imagine; întrebarea 1c, „imaginea pusă întâi pe foaie, ca strat … mai târziu”),
ADR 0210 §1 (foile), ADR 0050 (ghidajele). Rândul „Straturi bitmap ca suprafață de desen” din
`ACOPERIRE-ARTCAM-DESKPROTO.md` (v1, decis pe 06.10).
**Schița:** <https://claude.ai/artifact/Ctc63ZdA6ipkLPA8uGCJyb>. Pe ea sunt macheta (foaia cu imaginea sub desen, rândul ei din panoul foii,
opacitatea, lacătul, calibrarea și trasarea), piciorul ferestrei trasării și întrebările. Formularul scrie răspunsurile
în `raspunsuri/owner`, în baza paginii.

## Problema

Azi o imagine trece doar prin fereastra trasării: după „Importă” rămân vectorii, iar imaginea dispare. Patru lucruri
obișnuite la o mașină CNC nu se pot face:

- **Desenat peste o poză sau o scanare,** cu uneltele de desen, acolo unde trasarea automată nu ajunge (o schiță cu mâna,
  o poză cu contrast slab, o piesă fotografiată pe care vrei doar conturul ei).
- **Verificat vectorii trasați** peste imaginea din care au ieșit, după import.
- **Trasat pe bucăți** o imagine mare (fiecare parte cu reglajele ei), fără s-o importi din nou de fiecare dată.
- **Adusă la mărimea adevărată** o poză fără DPI, după o lungime cunoscută din ea (o riglă, o cotă).

## Ce am aflat (cercetarea din 21.11)

- **Vectric** (VCarve, Aspire): imaginea importată stă pe un strat al desenului, cu un glisor de estompare. „Trace Bitmap”
  trasează din ea, și doar dintr-o parte aleasă. Ajutorul lui spune să desenezi vectorii pe alt strat, iar stratul imaginii
  se poate ascunde.
- **ArtCAM / Carveco:** fiecare model are straturi bitmap (unul gol, implicit, plus câte vrei, din imagini), fiecare cu
  paleta lui de culori. „Bitmap to Vector” lucrează din stratul ales.
- **Fusion 360:** pânza atașată („attached canvas”), cu opacitatea ei și cu „Calibrate”: alegi două puncte, scrii
  distanța, iar imaginea se scalează. Scalarea e doar uniformă.
- **LightBurn, Inkscape:** imaginea e un obiect pe pânză, iar „Trace Image” / „Trace Bitmap” lucrează din cea aleasă.

## Decizia propusă

1. **Imaginile foii:** fiecare foaie poate ține imagini de referință, așezate în mm-ii ei (locul, lățimea, rotirea), sub
   desen și sub trasee, estompate. Nu se taie și nu se exportă: sunt un ajutor de desen. Foaia le ține în câmpul nou
   `imagini` (`{ id, sursa, nume, x, y, latime, inaltime, rotire, opacitate, vizibila, fixata }`). Câmpul nu schimbă ce se
   taie, deci intră fără schemă nouă, ca ghidajele: o versiune care nu-l știe îl păstrează necunoscut.
2. **Octeții imaginii stau în afara documentului:** într-o bază IndexedDB a lor, după amprenta SHA-256. Documentul (scris
   întreg, ca JSON, la fiecare schimbare, cu ultimele 20 de versiuni) rămâne mic, iar versiunile împart aceeași imagine.
   Imaginea pe care n-o mai folosește nicio versiune păstrată se șterge.
   - **Ce se păstrează:** imaginea cum o arată fereastra trasării (cu foaia sau scanarea îndreptată, dacă le-ai bifat), cel
     mult 16 Mpx. O poză JPEG neprelucrată rămâne JPEG-ul ei; restul se păstrează ca PNG.
3. **De unde vine:** din „Importă…”, singurul loc al fișierelor (decizia din 28.10):
   - în fereastra trasării, lângă „Importă”, bifa **Păstrează imaginea pe foaie**: vectorii și imaginea vin împreună,
     una peste alta;
   - butonul **Doar imaginea**: imaginea, fără vectori (întrebarea 1).
4. **Pe foaie** (întrebarea 2), imaginea stă sub desen, cu opacitatea de 40 %:
   - **Fixată:** clicurile ajung la desen, iar uneltele desenează peste ea.
   - **Desfăcută:** se alege cu clicul și se mută, se scalează proporțional și se rotește cu mânerele formelor (ADR 0052,
     ADR 0240).
   - Mutarea, scalarea, calibrarea și ștergerea sunt pași de anulare, ca orice schimbare a documentului.
5. **Lista imaginilor** (întrebarea 3): în panoul foii, sub ghidaje. Fiecare imagine are un rând: miniatura, numele, ochiul
   (vizibilă), lacătul (fixată), opacitatea și meniul („Calibrează”, „Trasează…”, „Șterge”).
6. **Calibrează** (ca la Fusion 360): două clicuri pe imagine și distanța adevărată, în mm. Imaginea se scalează uniform, în
   jurul primului punct.
7. **Trasează…** din imagine: deschide fereastra trasării cu imaginea de pe foaie. Vectorii importați vin exact peste ea
   (locul, scara, rotirea ei). O zonă trasă pe foaie, peste imagine, trasează doar partea aceea.
8. **Pânza:** imaginile se desenează pe un strat al lor, sub vectori, redesenat doar la mutarea vederii, din trepte reduse
   ale imaginii (o imagine de 16 Mpx nu se scalează întreagă la fiecare cadru). Foile vecine nu-și arată imaginile.
9. **Telefonul** (ADR 0250 §7, „pe telefon nu mai lucrăm la desen”): imaginile se văd, dar nu se pun și nu se editează.
10. **Feliile:**
    - **25.8↑a:** punerea (bifa și butonul), baza imaginilor, stratul pânzei, lista din panoul foii (ochiul, lacătul,
      opacitatea, ștergerea), mutarea, scalarea și rotirea desfăcută, anularea, curățarea imaginilor nefolosite.
    - **25.8↑b:** „Calibrează”, „Trasează…” din imaginea de pe foaie (cu zona), numele imaginilor în raportul foii.

## Ce las pe dinafară

- **Formele ridicate din culori** (relieful din culorile unei imagini, ca „Shape Editor” din ArtCAM), din același rând al
  tabelului de acoperire: țin de reliefuri, o linie a lor, încă neîncepută.
- **Pictatul pe imagine** și paleta pe strat (ArtCAM): fereastra trasării are deja culorile, legăturile și pastilele.
- **Imaginile în exporturi** (SVG, PDF) și în G-code: imaginea e un ajutor de desen.
- **Un panou „Straturi”** cu imaginile și grupurile desenului împreună: întrebarea 3, b.

## Ce impune

- **Documentul:** `Foaie.imagini` (fără schemă nouă), plafoanele (imagini pe foaie, lungimea numelui), ușa care le judecă.
- **Baza:** `src/app/imaginiFoaie.ts` (IndexedDB după amprentă, curățarea).
- **Pânza:** stratul imaginilor, sub vectori.
- **Fereastra trasării:** bifa și butonul.
- **Panoul foii:** lista imaginilor.
- **Comenzile:** pune, mută, calibrează, șterge.
- **Restul:** textele (ro, en), manualul.
- **Mărimea, estimată:** ~+6–9 kB în total, încărcați doar pe o foaie cu imagini; pornirea, neschimbată.

## Implementarea (25.8↑a, 21–23.11)

- **Documentul** (`src/model/document.ts`, `schemaDocument.ts`): `Foaie.imagini?: ImagineFoaie[]`, cu `{ id, sursa, nume?, x,
  y, latime, inaltime, rotire, opacitate, vizibila, fixata }`: centrul în mm ai foii, rotirea în grade (trigonometric, ca la
  instanțe), opacitatea în (0, 1]. Plafonul, 100 de imagini pe foaie (`PLAFON.imagini`). Ușa cere amprenta (64 de cifre
  hexazecimale mici), centrul în plafonul pozițiilor, mărimea în plafonul laturii, rotirea în [0, 360) și id-uri unice pe
  foaie. Fără schemă nouă: o versiune care nu știe câmpul îl păstrează necunoscut.
- **Comanda și acțiunea:** `inlocuieste-imagini` (lista întreagă, cu anularea) și `foaie.imagini`, a cărei gardă
  (`imaginiBune`) spune ce spune ușa pe orice listă, și pe valorile care nu sunt numere (o probă le compară în ambele
  direcții).
- **Baza imaginilor** (`src/app/imaginiFoaie.ts`): `cncvs2-imagini`, după amprentă (`pastreaza`, `citeste`). Curățarea
  (`curataLaPornire`) rulează în fila care scrie, la 10 s după pornire. Șterge ce nu folosește nici documentul, nici vreo
  versiune păstrată (citite din textul lor, fără ușă), și a fost pus de cel puțin o zi: plasa celorlalte file. O bază care
  nu există nu se creează.
- **Ce se păstrează** (workerul trasării, `octetiImaginiiFoii`): imaginea din fereastră, cu aceleași prelucrări ca trasarea
  (orientarea paginii PDF, foaia, îndreptarea scanării, reducerea la 16 Mpx), întreagă: zona doar se spune.
  - Un JPEG, PNG sau WebP neprelucrat și nereducut rămâne fișierul lui.
  - Altfel se codează în worker: **JPEG (calitatea 0,92) dintr-un JPEG**, PNG din rest. *Abaterea de la §2* („restul se
    păstrează ca PNG”): o poză prelucrată, ca PNG, ținea de câteva ori mai mult, fără folos pentru un ajutor de desen.
- **Locul** (`asezareInPagina`): imaginea întreagă, așezată în pagina importului ca vectorii trasați din ea (originea e
  colțul stânga-jos al zonei trasate).
  - Cu desenul: în același pas (`comandaImport`, cu `imagineImport`), mutată cu el când e lăsat pe planșă.
  - Singură („Doar imaginea”): lăsată pe planșă, cu centrul în punctul lăsat.
  - Id-ul: `im1`, `im2` …, primul liber.
- **Fereastra:** bifa „Păstrează imaginea pe foaie” (oprită implicit, ținută minte până la reîncărcare), „Doar imaginea” (și
  după un refuz al trasării: o poză cu prea multe contururi se poate pune oricum), starea „Se pregătește imaginea…” și
  motivul unui eșec. Sub 40 rem (telefonul, §9), ascunse; la fel, lista din panou.
- **Pânza** (`src/canvas/lucrator.ts`):
  - Imaginile vizibile ale foii active vin într-un mesaj al lor (`CerereImagini`), cu octeții, doar când se schimbă.
  - Workerul le decodează o dată pe amprentă și le desenează peste foaie, sub vectori, pe un strat al lor. Stratul se
    redesenează doar la schimbarea vederii, a mărimii, a imaginilor sau la o decodare, din treapta redusă potrivită
    (jumătăți, făcute la cerere).
  - Fără octeți (lipsă, ori încă se citesc), locul imaginii, punctat.
- **Panoul foii:** „Imaginile foii” (`src/app/ImaginiFoii.tsx`), sub câmpurile foii: miniatura, numele, ochiul, lacătul,
  coșul și opacitatea, în procente. Octeții lipsă se spun.
- **Mânerele** (`src/app/ManereImagine.tsx`; socoteala, pură, în `manereImagine.ts`), pe o imagine desfăcută, cu unealta
  Selecție sau Transformare:
  - interiorul o mută; colțurile o scalează proporțional (colțul opus pe loc, cel puțin 1 mm); mânerul de deasupra o
    rotește (Shift: 15°);
  - cât se trage, conturul nou și mărimea (ori unghiul); la eliberare, un pas de anulare;
  - *Precizarea la §4:* imaginea stă sub desen, deci pe o linie a desenului apăsarea e a formei, iar înăuntrul formelor, a
    imaginii (`instantaLa` cu `doarContur`). Altfel, conturul trasat al unui chenar ar fi acoperit toată imaginea.
- **Mărimea:** totalul 767,9 / 800 kB pe arborele unit cu `main` `8f122eb6` (acolo, 760,9: felia
  +7,0; estimarea: +6–9), pornirea 108,4 / 115, cu ușa 112,9 (+0,5 față de `main`:
  legătura pânzei cu imaginile, curățarea la pornire și textul acțiunii; estimarea spunea „neschimbată”).
- **Probele:**
  - **Unitare** (`imagini.document`, `imagini.import`, `imagini.manere`, `imagini.foaie`, plus `import.rotire`, `desen`,
    `actiuni.calcul`, `foi.actiuni`): ușa (câmpurile bune și rele, fiecare câmp cerut lipsă, plafonul), jurnalul, acțiunea,
    paritatea gardă / ușă, importul cu imaginea (un pas, mutată cu desenul, comanda ținută fără imagine, plafonul), locul în
    pagină (un pixel cade pe vârful trasat din el, cu zonă și fără), tipurile păstrate, mânerele, curățarea, alegerea doar
    pe contur.
  - **4 e2e** (`imagini-foaie.spec.ts`):
    - importul cu bifa: imaginea sub vectori (roșul estompat, citit din pânză), Ctrl+Z și Ctrl+Shift+Z, bifa ținută minte,
      reîncărcarea, miniatura;
    - „Doar imaginea” după un refuz, lăsată pe planșă; ochiul, opacitatea, lacătul; mutarea, rotirea cu Shift, scalarea,
      fiecare cu anularea ei; ștergerea;
    - o scanare îndreptată, păstrată îndreptată (JPEG, octeții cu mărimea spusă);
    - o poză de 16,8 Mpx, păstrată redusă.
- **Otrăvurile** (`test/otravuri/25.8a.py`): 43 / 43 (27 unitare, 16 prin e2e), și din nou 43 / 43 pe arborele unit cu
  `main` `8f122eb6`, pe Linux. La prima rulare, M06 („vizibilă” făcută opțională) a scăpat: probele refuzau „vizibilă”
  scrisă ca șir, nu și lipsa ei. Acum, fiecare câmp cerut, lipsă.
- **Porțile** (pe `980dd920`, arborele unit): în CI, rapidul verde și completul verde (unitare 9 816 / 0 căzute, e2e 596
  / 596, emulatoarele 104 / 104 și 34 / 34; prima rulare a completului, 595 / 596: `extensii.lucru.spec.ts:110`, clicul
  pe „Închide” din cadrul extensiei nu s-a mai întors, ca la `extensii.spec.ts:43` din 18.11, în afara feliei; în
  container, fișierul 9 / 9 și proba repetată 15 / 15); în container, unitare 9 816 (9 804 trecute, 12 sărite, niciuna
  căzută), iar e2e-urile vecine feliei 132 / 132 (19 fișiere: trasarea, importul, imaginile foii, panoul, editarea,
  selecția, proiectul, pânza, foile, rigla, bucățile la cerere, CSP-ul, pornirea, manualul).
- **Nerulat:** curățarea fără documentul de acum (cere IndexedDB și ceasul: o zi).

## Implementarea (25.8↑b, 24.11)

- **Rândul imaginii** (`src/app/ImaginiFoii.tsx`): sub opacitate, butoanele **Calibrează** și **Trasează…** (ca în schiță;
  coșul a rămas iconița lui, de la 25.8↑a). Merg doar pe o imagine vizibilă, cu octeții citiți; ascunsă, sfatul spune de ce.
- **Modul pânzei** (`src/app/ModImagine.tsx`, la cerere; partea pură în `src/app/modImagineCalcul.ts`), pornit din rând: o
  bandă sus, pe mijlocul zonei libere, ca la urechile alese, iar clicul stâng e al modului (spațiul și rotița rămân ale
  pânzei). *Precizarea la §6 și la schiță:* câmpul distanței stă în bandă, lângă linia măsurată, nu în panou (ochii sunt pe
  pânză, iar Enter aplică din câmp).
  - **Calibrează:** primul clic pe imagine, apoi al doilea (Shift: pe orizontala sau verticala imaginii prin primul);
    capetele se trag apoi unde trebuie; lângă linie și în bandă, distanța de acum. Câmpul **Distanța adevărată (mm)** vine
    cu ea, ales; **Aplică** (ori Enter) scalează imaginea uniform în jurul primului capăt (`calibrata`), într-un pas de
    anulare, prin `foaie.imagini` (ușa judecă plafonul laturii). Refuzurile: un clic în afara imaginii, capetele unul peste
    altul, o distanță care nu e un număr pozitiv, o latură sub 1 mm (ca la mânere).
  - **Trasează…:** o zonă trasă peste imagine (`zonaDinTragere`: dreptunghiul din cadrul imaginii, deci rotit cu ea, tăiat la
    ea, în fracțiuni) sau **Toată imaginea** (ori Enter). Un clic fără tragere nu e o zonă.
  - Escape și **Renunță** ies fără nimic schimbat; modul se închide singur dacă imaginea nu mai e pe foaia activă ori se
    ascunde.
  - **Editorul oprit cât ține un mod al pânzei** (`Editare.activ`): cadrul selecției, textul, Pen-ul (desenul în lucru
    rămâne) și mânerele, ale formelor și ale imaginilor, nu mai iau clicurile. Ascultau pe `window`, la captură, deci înaintea
    modului; tot de asta beneficiază și modul urechilor alese.
- **Fereastra trasării din imaginea de pe foaie** (`ImportConectat` cu `dinFoaie`): octeții din baza imaginilor, cu numele
  tipului lor (`numeFisierImagine`: „scan.pdf” devine „scan.jpg”, ca ușa s-o citească drept imagine), zona în pixelii ei
  (`zonaInPixeli`: fără un pixel în plus la o margine întreagă, cel puțin unul pe latură). Zona se poate schimba și în
  fereastră.
  - **Scara e a imaginii de pe foaie:** `AlegeriTrasare.latimeIntreaga` și `CerereTrasare.latimeIntreaga`, lățimea imaginii
    întregi pe foaie; workerul ia `mmPePx` din ea, pe imaginea întreagă (înaintea zonei), peste lățimea scrisă și DPI, iar
    raportul spune scara „din imaginea de pe foaie”.
  - **Fără Mărime și fără îndreptări:** grupul Mărimea, „Îndreaptă foaia”, „Îndreaptă scanarea” și sugestiile lor lipsesc, iar
    cererea nu le mai poartă (vectorii n-ar mai cădea peste imagine); nota de sus spune de ce și ce faci pentru o imagine
    îndreptată. Nici „Păstrează imaginea pe foaie” și „Doar imaginea”: imaginea e deja acolo.
  - **„Importă” pune vectorii exact peste imagine:** `ImportPregatit.peImagine` (`asezarePeImagine`: centrul imaginii în
    pagina importului, din raportul trasării, cade în centrul ei de pe foaie, rotit cu ea); comanda importului dă instanței
    rotirea imaginii și locul rotit (`rotatie`, exactă la multiplii de 90°), pentru toate piesele aduse împreună (culorile).
- **Raportul foilor** (`raportFoi`, `DialogRaportFoi`): sub operațiile fiecărei foi, „Imaginile foii (ajutoare de desen, nu se
  taie): …”, numele fiecăreia o dată, din toate foile identice (imaginile nu despart foile). *Precizarea la §10:* CSV-ul e
  lista de tăiere, deci rămâne fără ele.
- **Probele:**
  - **Unitare:** `imagini.calibrare` (calibrarea, Shift, zona dreaptă și rotită, colțurile ei, pixelii, centrul în pagină ca
    `asezareInPagina`, numele; importul peste o imagine rotită cu 30°, scalată, cu zonă: fiecare vârf trasat cade pe pixelul
    lui), scara fixă în worker și cererea fără îndreptări (`import.imagine`), raportul (`raport.foi`).
  - **3 e2e** (`imagini-foaie.spec.ts`): calibrarea (Escape, clicul în afara imaginii, Shift, câmpul cu focus și Enter, 400 mm
    din 158,75, primul punct pe loc, Ctrl+Z; ascunsă cât ține modul, îl închide; desfăcută, mânerele nu-i iau clicurile);
    trasarea din imaginea micșorată și rotită cu 90° (fereastra fără Mărime și îndreptări, chenarul trasat peste chenarul
    imaginii, la 0,5 mm); zona trasă pe foaie, cu Pen-ul ales (doar discul, fiecare vârf pe cercul lui) și raportul foii.
- **Mărimea:** totalul 804,3 / 900 kB (`main` `883a8caa`: 799,6; felia +4,7: modul pânzei și partea lui pură, la cerere, plus
  ce poartă fereastra și raportul), pornirea 109,7 / 115 (+0,3: starea modului și legăturile lui din `App.tsx`), cu ușa
  114,2, cu Atelierul 114,5 / 115. Cu 25.8↑a, ADR-ul a costat ~11,7 kB în total, peste estimarea de 6–9.
- **Catalogul controalelor** (ADR 0262): numele butoanelor noi stau scrise ca atribute, ca scriptul să le găsească
  (`node scripts/catalog-controale.ts --scrie`, 602 nume).
- **Otrăvurile** (`test/otravuri/25.8b.py`): 46 / 46 (24 unitare, 22 prin e2e). La prima rulare, C08 și C09 (pixelii zonei)
  au scăpat: 0,3 · 800 e exact 240 în virgulă mobilă, iar zona îngustă de probă nu atingea toleranța; probele au acum 0,57 ·
  100 și o zonă de 1e-12.

## Întrebările (răspunsurile: „Da, 1a–3a”)

1. **„Păstrează imaginea pe foaie” la import:**
   - **a)** oprită implicit, ca azi; o bifezi când vrei, iar alegerea se ține minte cât lucrezi (luat);
   - b) pornită implicit: fiecare trasare lasă și imaginea pe foaie.
2. **Imaginea pusă pe foaie:**
   - **a)** fixată: clicurile ajung la desen; o desfaci din lacătul ei ca s-o muți (luat);
   - b) ca o formă: se alege cu clicul, se mută și se rotește direct.
3. **Lista imaginilor:**
   - **a)** în panoul foii, sub ghidaje: fiecare foaie, imaginile ei (luat);
   - b) un panou nou, „Straturi”, cu imaginile și grupurile desenului.
