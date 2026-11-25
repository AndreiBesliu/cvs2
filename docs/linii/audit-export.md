# Auditul ferestrei „Exportă G-code” (ADR 0290), 25.11.2026

- **Cererea:** owner-ul, prin sesiunea principală, pe 25.11, înaintea arhivării liniei: „vreau sa le intrebi ce pot imbunatati
  in zona in care au lucrat? dar, defapt, pune-le sa faca un audit complet in acest sens”.
- **Baza:** `main` `a22547e5`, adus în `wip/28.8-export`. Include tot ce a intrat după linie: lista „Din frezele mele”
  (16.A↑b-3) și plafoanele din ADR 0146.
- **Metoda:** aplicația construită (`vite build`), parcursă cu Playwright, în Chromium, din scripturi care rămân doar local
  (`.tmp/audit-export/`, ignorat).
  - **Unde:** 1280 × 800, 1024 × 768, telefonul (390 × 844); română și engleză; fontul lat; densitatea mare; Atelierul
    („Trimite la mașină”).
  - **Ce operații:** profil, buzunar (ambele strategii, toate coborârile, frezele de rest), găurire, V-carve (cu fund plat
    și freze de rest), gravare în V, incrustația în V (fața și banda), cea cu pereți drepți (locaș, treaptă, dop ridicat
    și decupat).
  - **Restul ferestrei:** foaia și originea, mașina și fișierul, urechile, Rezultatul, „Toate foile”, ordinea „A mea”,
    greșelile și „Du-mă la …”.
  - **Ce s-a mai probat:** G-code-ul descărcat, citit față de desene; accesibilitatea cu axe-core 4.10.2 (instalat doar în
    scratchpad, nu în proiect); tastatura, cu Tab și săgețile; viteza, pe proiecte de 10, 40 și 150 de piese.
- **Doar audit:** nu s-a schimbat niciun rând de cod. Nicio felie nu pornește de aici fără cuvântul owner-ului.
- **Schița pentru owner** (capturile constatărilor 1, 2, 4, 5, 6, 8, 9, feliile și întrebările):
  <https://claude.ai/artifact/QYhaU4zsmM9Uiu1uprV7YK>.

## Pe scurt

1. **Două desene nu spun ce taie programul.** Programul e corect și sigur în amândouă cazurile; greșește doar ce arată
   fereastra. Ambele au fost spuse sesiunii principale imediat, pe 25.11 (constatările 1 și 2).
   - Cu supracursa prin foaie, desenul și nota spun alt număr de treceri decât programul.
   - Găurirea cu elice e desenată ca ciocănire.
2. **Cauza comună e de structură.** Interfața n-are voie să importe lucrarea (regula `interfata-prin-actiuni`), așa că
   fereastra își rescrie formulele. Testele compară formulele, nu și contextul în care le aplică lucrarea (constatarea 3).
3. **Viteza nu ține pe un proiect mare.** Cu 150 de piese, fereastra se deschide în 7,6–8,8 s, are 37 487 de noduri DOM, iar
   fiecare tastă ține 54–98 ms (constatarea 4).
4. **Câteva frecări se lovesc la fiecare export.**
   - Conflictul T la orice freză schimbată.
   - Avertismentul de viteză maximă la orice program, cu setările din fabrică.
   - Refuzurile din calcul cu id-uri interne („e2/c1 intră în piesa e3/c2”).
   - Capul listei suprapus în „A mea” (constatările 5–9).
5. **Față de prag și de ArtCAM / DeskProto (ca funcție)**, lipsesc:
   - avansul, turația și Z-ul sigur pe operație;
   - originea în centru;
   - numele fișierului;
   - adaosul și trecerea de finisare;
   - punctul de start.

   Toate cer decizia owner-ului (secțiunea „Ce lipsește”).

## Constatările, cele mai importante întâi

Felul fiecăreia: **greșeală** (fereastra spune altceva decât face), **frecare** (merge, dar costă omul), **lipsă** (o funcție
care nu există), **idee**. Costurile vin din duratele măsurate ale feliilor liniei: 28.8↑b–g au ținut între 20 de minute și
o oră fiecare (cu probele, otrăvurile și documentele), iar 28.8↑a, carcasa, 3 h 20 min (`docs/etape/etapa-03.md`). Mărimile
sunt măsurate cu `gzip -9` pe `dist/`; poarta build-ului numără puțin altfel.

### 1. Greșeală: cu supracursa prin foaie, desenul și nota trecerilor arată altă împărțire decât programul

- **Dovada:**
  - Pașii: dreptunghi, exterior, adâncimea 18 (cât foaia), pasul 6; la Foaia și originea, supracursa 0,3 și bifa „și
    tăieturile cât foaia”.
  - Fereastra: desenul adâncimii spune „3 treceri egale de 6 mm”, cu cota „18 mm”; nota de lângă pas, „3 treceri de 6 mm”.
  - G-code-ul descărcat taie la −4,575, −9,15, −13,725 și −18,3, adică 4 treceri de 4,575 mm. E corect după ADR 0177:
    `cuTaieturiPrinFoaie`, `src/cam/prinFoaie.ts` pune adâncimea la grosime plus supracursă.
  - Cauza: `DesenAdancime` (prin `src/ui/FisaOperatie.tsx:84–90`) și `treceri` (`src/ui/DialogExport.tsx:901`) împart
    adâncimea scrisă, nu pe cea tăiată.
- **Ce aș face:** adâncimea tăiată, calculată o dată, cu aceeași regulă ca lucrarea (vezi 3), apoi folosită de cotă, de
  treceri și de notă. Proba: desenul comparat cu programul workerului pe același caz.
  - **Costul:** ~1 h, sub 0,2 kB.
- **A cui:** a liniei exportului (greșeala ei, din 28.8↑b-1). Atinge `FisaOperatie.tsx`, unde lucrează acum linia frezelor
  (16.A↑b-5), deci nu înainte să termine ea.

### 2. Greșeală: găurirea cu elice e desenată ca ciocănire; cercul prea mare e refuzat abia după clic

- **Dovada:** cercul R15, „găurire”.
  - **Cu freza Ø16:** programul face elicea pe perete (2 ture de 4 mm, arce, fără ridicări; `src/cam/gaurire.ts:77–91`).
    Desenul „Cum găurește” arată însă ciocănirea („2 pași de 4 mm; se ridică 1 mm; iese din gaură după fiecare pas”), iar
    câmpul „Iese la fiecare al … pas” n-are efect pe elice.
  - **Cu freza Ø6:** cercul de Ø30 trece de 2·D. Butonul Exportă e totuși activ; după clic, jos: „Exportul n-a mers: e1/e1:
    cercul de Ø30 trece de două diametre ale frezei (Ø6): în centru ar rămâne un miez, deci e un buzunar”. Mesajul are
    id-ul intern și nu are „Du-mă la …”.
  - **Cauza:** `DesenGaurire` primește doar adâncimea, pasul și retragerea (`FisaOperatie.tsx:100`), nu diametrul
    cercurilor. Felul găuririi (cât freza, elice, refuz) se hotărăște doar în lucrare.
- **Ce aș face:** fișa primește diametrele cercurilor operației (cel mai mic, cel mai mare). Cu ele:
  - desenul arată ciocănirea sau elicea, după caz;
  - câmpul retragerii apare doar la ciocănire;
  - cercul peste 2·D devine o greșeală în fișă, înainte de clic, cu „Du-mă la …”.
  - **Costul:** ~1,5 h, ~0,4 kB.
- **A cui:** a liniei exportului.

### 3. Structură: fereastra își rescrie regulile lucrării, iar probele nu le prind contextul

- **Dovada:**
  - Regula `interfata-prin-actiuni` (`.dependency-cruiser.cjs:150`) oprește `src/ui` să importe din `src/cam` și
    `src/model`. De aceea, `src/ui/exportDeseneCalcul.ts` are 9 funcții care refac formulele lucrării: `treceriEgale`,
    `ciocanire` (cu `RIDICARE_CIOCANIRE = 1`, copia lui `RETRAGERE_PARTIALA`), `centreUrechiDesen`, `coborareDesen`,
    `vcarveDesen`, `incrustatieDesen`, `bandaDesen`, `dopDreptDesen`, `treceriLaterale`.
  - `src/ui/exportRand.ts` are și el implicitele și verificările (de pildă `razaEliceImplicita`, `adancimeRand` pentru gaura
    incrustației).
  - `test/unit/export.desene.test.ts` compară fiecare formulă cu lucrarea pe cazuri obișnuite. Nu prinde însă contextul în
    care lucrarea schimbă intrarea, cum sunt cazurile 1 și 2 (supracursa, felul găuririi).
- **Ce aș face:** stratul de acțiuni (care are voie la lucrare) dă fișei o „previzualizare pe hârtie” a fiecărei operații,
  calculată cu funcțiile lucrării: `adancimiTreceri` pe adâncimea tăiată, felul găuririi, centrele urechilor. Fișa o
  primește prin `ContextFisa` și doar o desenează. Copiile din `exportDeseneCalcul.ts` pleacă.
  - Proba devine una singură: pentru fiecare caz al corpusului, previzualizarea față de programul workerului.
  - **Costul:** ~½ zi, cu 1 și 2 incluse; kB ±0.
- **A cui:** a liniei exportului. Atinge și calculul acțiunilor exportului (`src/ui/actiuniExportCalcul.ts`).

### 4. Frecare mare: viteza pe un proiect mare

- **Dovada:** proiect importat din SVG și degrupat, cu dreptunghiuri și cercuri pe o grilă de 16 mm; Chromium headless în
  containerul cloud. Pe calculatorul owner-ului cifrele vor fi mai mici, dar raportul dintre ele rămâne.

  | Piese | Deschiderea (clic → fereastra) | Noduri DOM în fereastră | SVG | O tastă într-un câmp |
  |---|---|---|---|---|
  | 10 | 0,34 s | 2 627 | 184 | 11 ms |
  | 40 | 0,83 s | 10 097 | 724 | 36 ms |
  | 150 | 7,6–8,8 s | 37 487 | 2 704 | 90–112 ms (sarcini lungi de 54–98 ms la fiecare tastă) |

  - **Cauza:** fișele tuturor operațiilor stau randate una sub alta (`DialogExport.tsx:1188`, `ordine.map(… <FisaOperatie …>)`).
    `contextFisa` e un obiect nou la fiecare randare, iar `FisaOperatie` nu e memoizată. Orice tastă randează deci toate
    fișele, cu desenele lor.
  - **Exportul în sine e scurt:** pe 150 de piese, de la clic la descărcare au trecut sub 6 s, cu tot cu confirmarea
    ieșirii din foaie.
- **Ce aș face:** se randează doar fișa aleasă și vecinele ei. Celelalte, pe locul lor, ca înălțime rezervată, montate când
  intră în vedere (`IntersectionObserver`). `FisaOperatie` devine `memo`, cu `ContextFisa` stabil (funcțiile prin
  `useCallback`, datele pe rând).
  - **Proba de buget:** 150 de operații, deschiderea sub 1 s și o tastă sub 30 ms, pe runner.
  - **Costul:** ~½ zi, +0,3 kB.
- **A cui:** a liniei exportului.

### 5. Frecare: o freză schimbată blochează exportul cu „T1 are două freze”

- **Dovada:**
  - Pașii: dreptunghi + cerc (amândouă T1 Ø6); pe dreptunghi, „V-carve” și forma „în V”.
  - Exportul se oprește: „T1 are două freze (Ø6 mm V60°, Ø6 mm): fiecare freză cere numărul ei.” Omul trebuie să afle
    singur că trebuie să schimbe numărul T.
  - Se întâmplă la orice V-carve, gravare în V sau incrustație într-un proiect cu încă o operație pe T1. La fel la orice
    diametru schimbat (găurirea cu Ø20 sau Ø30 în proba pe cerc).
  - **În plus:** conflictul face roșii toate câmpurile de freză ale rândului: freza fundului plat, a benzii, a dopului
    (`FisaOperatie.tsx:185–190, 450–455, 551–556, 677–682`, `conflict !== undefined`). Pe V-carve-ul cu fund plat, T2
    Ø3,175 e roșu deși nu se ciocnește cu nimic.
- **Ce aș face:**
  - lângă greșeală, butonul „Dă-i T{n}”, cu primul număr liber (`numarPentruRand` din `src/ui/exportRand.ts` îl știe
    deja);
  - roșu doar pe câmpurile cu numărul ciocnit;
  - varianta automată (numărul nou pus singur la o freză schimbată) e întrebare pentru owner (Î2).
  - **Costul:** ~1 h, ~0,2 kB.
- **A cui:** a liniei exportului. Numerotarea din bibliotecă e a liniei frezelor (16.A↑b-2): butonul trebuie să urmeze
  regula ei („numărul bibliotecii cât e liber, altfel …”).

### 6. Frecare: avertismentul de viteză maximă apare la orice program, iar omul nu-l poate rezolva din fereastră

- **Dovada:** după orice export, Rezultatul spune cu portocaliu: „Pe 12 linii ale programului, avansul trece de viteza
  maximă a mașinii: controlerul îl încetinește, iar timpul ține cont de asta.”
  - **Cauza:** setările din fabrică GRBL 1.1h (500 mm/min) sunt sub avansul fix al programului (1 000 mm/min; „Axul, avansul
    și Z sigur sunt fixe deocamdată”, la Mașina și fișierul).
  - Avertismentul e adevărat, dar apare la toată lumea care n-a lipit `$$`. Iar în fereastră nimic nu schimbă avansul.
- **Ce aș face:** cu setările din fabrică (fără `$$` lipit), o notă „timpul e estimat cu setările GRBL din fabrică; lipește
  `$$` pentru timpul mașinii tale”, nu avertismentul. Avertismentul rămâne doar față de `$$`-ul lipit de om.
  - **Costul:** ~30 min.
- **A cui:** a liniei exportului (rezumatul). Hotărârea pe implicite e a owner-ului (Î4).

### 7. Frecare: refuzurile din calcul vorbesc cu id-uri interne și n-au „Du-mă la …”

- **Dovada:**
  - Găurirea (vezi 2): „e1/e1: cercul de Ø30 …”.
  - Pe proiectul de 150 de piese, cu piesele prea apropiate: „Exportul n-a mers: regiunea păstrată: tăietura lui e2/c1 intră
    în piesa e3/c2 cu 1.000 mm (lângă X 24.0, Y 195.0)”. „e2/c1” nu apare nicăieri pe ecran, iar „1.000 mm” e scris cu
    punct, în română.
  - Greșelile verificate în fereastră au „Du-mă la …”; cele din calcul, nu.
- **Ce aș face:** înainte de afișare, id-urile din motivele calculului se traduc în numele elementelor (`descriere`, ca în
  listă). Primul element numit primește „Du-mă la …”, iar pe pânză, la închidere, selecția lui. Numerele, cu virgula limbii.
  - **Costul:** ~2 h, ~0,3 kB.
- **A cui:** a liniei exportului (afișarea). Textele motivelor sunt ale lucrării (`src/cam/`, linia principală); traducerea
  id-urilor se poate face doar în fereastră.

### 8. Greșeală vizuală: cu „A mea”, capul listei se suprapune

- **Dovada:** la 1280 × 800, cu două operații și „A mea” pornită, rândurile listei din stânga se suprapun: „stânga-jos · Z0
  pe față” peste „Mașina și fișierul”, „GRBL 1.1 · mm” peste „Operațiile, în ordinea tăierii”. Captura e în schiță. Lista
  e o coloană flex care își micșorează elementele de sus când conținutul (mânerele, săgețile, „Înapoi la ordinea
  automată”) nu mai încape.
- **Ce aș face:** `flex-shrink: 0` pe capul listei, iar derularea doar pe partea operațiilor. Proba privirii primește și
  „A mea” cu trei operații, la 1280 × 720.
  - **Costul:** ~30 min.
- **A cui:** a liniei exportului (28.8↑a).

### 9. Frecare: frezele de rest stau pe un rând fără etichete

- **Dovada:**
  - La buzunar, la fundul plat și la dop, rândul unei freze de rest are trei câmpuri fără nume („2”, „3”, „1,2”: T, Ø,
    pasul lateral), plus un „×”.
  - „Adaugă o freză de rest” arată ca text, nu ca buton.
  - Titlul „Frezele de rest” apare de două ori: titlul grupului și eticheta rândului.
  - E singura parte a fișei care n-a trecut prin redesenare: `campuriRest`, `DialogExport.tsx:656`.
- **Ce aș face:** un mic tabel cu capul „T · Ø (mm) · Pasul lateral (mm)”, butonul cu aspect de buton, eticheta rândului
  scoasă.
  - **Costul:** ~1 h.
- **A cui:** **a liniei frezelor acum.** 16.A↑b-5 lucrează chiar pe frezele de rest din fișă, deci ar trebui făcută acolo
  sau imediat după.

### 10. Frecare: bifele cu eticheta dedesubt

- **Dovada:** la „Fundul plat”, „Același spațiu pentru clei și fierăstrău”, „Decupează dopul din placă, cu punți”, „Altă freză
  pentru decupare” și „Altă freză pentru dop”, căsuța stă pe un rând și eticheta sub ea. La Rampa, Intrările și Urechile,
  eticheta stă lângă căsuță. Câmpurile fundului plat stau și ele unul sub altul, nu în grila grupului Freza.
- **Ce aș face:** aceeași regulă CSS pentru toate etichetele cu bifă din fișă; câmpurile fundului plat în grilă.
  - **Costul:** ~1 h; proba privirii cere căsuța și eticheta pe același rând.
- **A cui:** a liniei exportului. Fundul plat e acum și în lucrul liniei frezelor (16.A↑b-5).

### 11. Frecare: bifa „și tăieturile cât foaia” stă bifată și oprită cu supracursa 0

- **Dovada:** cu supracursa 0, bifa e bifată și cenușie. Cititorul de ecran spune „bifată, indisponibilă”. Pentru om,
  „e pornită sau nu?”.
- **Ce aș face:** cu supracursa 0, ascunsă sau nebifată, cu nota „la supracursă 0 nu se aplică”.
  - **Costul:** ~30 min.
- **A cui:** a liniei exportului.

### 12. Frecare: desenul Z0 arată „gaura incrustației” și într-un proiect fără incrustații

- **Dovada:** pe dreptunghi + cerc, desenul Z0 are două goluri albe etichetate „gaura incrustației” și „scrisă cât foaia”.
  Cine deschide fereastra prima dată nu știe de ce sunt acolo.
- **Ce aș face:** golul incrustației doar când foaia are o incrustație cu gaură prin foaie; cel „scris cât foaia”, doar cât
  e bifată tăierea prin foaie.
  - **Costul:** ~45 min.
- **A cui:** a liniei exportului.

### 13. Frecare: tastatura și cititorul de ecran

- **Dovada:**
  - **axe-core:** 0 reguli încălcate, la deschidere și pe un buzunar cu o incrustație cu pereți drepți și o greșeală.
  - **Enter pe un rând al listei** aduce fișa în vedere, dar focusul rămâne pe rând. Cu Tab, omul trece prin toate fișele
    de dinaintea ei: cu cerc și dreptunghi, de pe rândul dreptunghiului sunt 19 opriri până la primul lui câmp (foaia,
    mașina și toată fișa cercului).
  - **Explicația unui grup** e înaintea titlului în DOM, deci cititorul o spune înainte de titlu. Nu e legată de câmpuri
    (niciun `aria-describedby` în fereastră), iar greșelile grupului nu sunt legate de câmpul lor.
  - **Toate explicațiile au `aria-live="polite"`** și se schimbă cu mausul și cu focusul. Fiecare mutare de focus e anunțată
    încă o dată.
  - **Ce merge:** săgețile pe cartonașe merg (sunt radio native); dialogul are numele și titlurile la nivelul bun.
- **Ce aș face:**
  - la Enter sau clic pe rând, focusul pe titlul fișei (`tabindex="-1"`);
  - titlul grupului înaintea explicației în DOM (așezarea rămâne, prin CSS);
  - `aria-describedby` de la fiecare câmp spre explicația și greșeala grupului lui;
  - `aria-live` doar pe greșeli.
  - **Costul:** ~1,5 h.
- **A cui:** a liniei exportului.

### 14. Frecare: numele operațiilor, cu punct zecimal și pe trei rânduri

- **Dovada:** în listă și pe titlul fișei apare „dreptunghi 100.00 × 60.00 la X 20.00, Y 20.00”: punct în loc de virgulă în
  română, iar în lista îngustă trece pe trei rânduri. Vine din `toFixed(2)` în `src/app/descriereElement.ts`, comun cu bara
  de jos, avertismentele și vederea 3D.
- **Ce aș face:** numerele în formatul limbii. În listă, numele piesei când omul i-a dat unul (un import „logo-80mm”), iar
  locul în a doua linie, mai mic.
  - **Costul:** ~1 h.
- **A cui:** **a liniei principale** (`descriereElement` e comun). Partea din listă e a exportului.

### 15. Frecare: greșeala de valoare e o frază generală

- **Dovada:** cu pasul 0 pe dreptunghi și adâncimea goală pe cerc, sub câmp scrie „Valorile operațiilor trebuie să fie
  numere pozitive, cu punct sau cu virgulă: adâncimea și pasul până la 1000 mm, freza până la Ø100 mm.”, aceeași la
  orice câmp. Rândul cercului din listă devine „interior · T1 Ø6 · mm” (lipsește numărul).
- **Ce aș face:** greșeala pe câmp („Pasul: scrie un număr mai mare ca 0, cel mult 1000”); în listă, „—” în loc de „ mm”.
  - **Costul:** ~1 h.
- **A cui:** a liniei exportului.

### 16. Frecare: engleza titlurilor

- **Dovada:** „What cut” (Ce tăiere), „How it goes down” (Cum coboară), „How it clears” (Cum golește), „Rest bits” (Frezele
  de rest). Și româna „Ce tăiere” sună stângaci.
- **Ce aș face:** „Cut type” / „Tăietura”, „Plunge” / „Coborârea”, „Clearing” / „Golirea”, „Rest machining” / „Frezele de
  rest”. Ce rămâne în română, la owner.
  - **Costul:** ~20 min, cu manualul în ambele limbi.
- **A cui:** a liniei exportului.

### 17. Frecare mică: desenul frezei în V își suprapune etichetele

- **Dovada:** freza în V, Ø6: „T1” și „Ø 6 mm” se suprapun pe coada frezei (captura în schiță).
- **Ce aș face:** cota diametrului deasupra, ca la freza plată.
  - **Costul:** ~20 min.
- **A cui:** a liniei exportului.

### 18. Lipsă: cu „Toate foile”, lista arată doar foaia activă

- **Dovada:** două foi, „Toate foile (2)”: lista are doar operația foii active. Nota o spune („Rândurile de mai jos sunt ale
  foii active; celelalte foi își păstrează operațiile.”). Omul nu poate verifica sau schimba din fereastră operațiile foii
  1 înainte de arhiva cu ambele.
- **Ce aș face:** lista grupată pe foi, fiecare cu operațiile ei, editabile; Rezultatul pe foi.
  - **Costul:** ~1 zi; atinge `doarFoaia` și verificarea pe rânduri.
- **A cui:** a liniei exportului, cu planșele (ADR 0210 §5). Hotărârea e a owner-ului (Î7).

### 19. Lipsă: numele fișierului

- **Dovada:** fișierul descărcat e `cncvs2-stanga-jos.nc` (`src/post/export.ts:38`, `cncvs2-${origine}`), fără numele
  proiectului. Rezultatul spune liniile și amprenta, nu și numele. Arhiva foilor e `cncvs2-<origine>-foile.zip`.
- **Ce aș face:** numele din proiect și foaie (de pildă „raft-lateral-foaia-1.nc”), arătat în Fișierele și editabil
  înainte de Exportă. Numele scurte ale controlerelor (`numeScurt`) se păstrează.
  - **Costul:** ~2 h.
- **A cui:** a liniei exportului și a postului. Hotărârea e a owner-ului (Î5).

### 20. Idee: Atelierul primește fereastra întreagă

- **Dovada:** în Atelier, „Trimite la mașină” deschide aceeași fereastră, cu titlul „Exportă G-code (GRBL 1.1)”, cu toate
  grupurile. Doar butonul principal devine „Trimite la mașină”.
- **Ce aș face:** în Atelier, întâi un pas scurt: origine, Z0, frezele în ordine, timpul și Trimite, cu „Arată tot” pentru
  fereastra întreagă; titlul după acțiune.
  - **Costul:** ~½ zi.
- **A cui:** a aranjamentelor (28.1↑, ADR 0250). Hotărârea e a owner-ului (Î8).

### 21. Idee: textele lungi

- **Dovada:**
  - explicația „Treapta”: 11 rânduri;
  - nota ordinii automate: 6 rânduri, mereu la vedere;
  - nota „Dopul iese într-un fișier al lui …”: 4 rânduri.
- **Ce aș face:** prima propoziție la vedere, restul sub „Mai mult”.
  - **Costul:** ~45 min.
- **A cui:** a liniei exportului.

## Ce lipsește față de prag și față de ArtCAM / DeskProto (ca funcție)

**Rândurile pragului** (`ACOPERIRE-ARTCAM-DESKPROTO.md`, după numărul liniei din fișier) care trec prin fereastră:

| Rândurile | Starea în prag |
|---|---|
| 40 (profilul, urechile, intrările, sensul), 41 (dog-bone), 44 (găurirea), 47 (incrustațiile), 93 (timpul și rezumatul), 120 (simularea), 121 (biblioteca de freze), 124 (șabloanele de operații), 126 (Clasicul) | în lucru |
| 42 (buzunarul), 43 (V-carve), 45 (ordinea, fișierele pe sculă), 46 (gravarea) | făcut |
| 50 (transformarea traseelor), 52 (ghilotina, mai multe burghie), 125 (asistentul pas cu pas) | de făcut |

Nimic nu iese din listă.

**Ce fac cele două programe în același loc și aici nu există** (doar funcția; nimic copiat):

1. **Avansul, plonjarea și turația pe operație sau pe freză** (în ambele). Aici sunt fixe (18 000 rot/min, 1 000 / 300
   mm/min). Se pot schimba doar printr-o freză din bibliotecă cu valori de lucru (v27, 16.A↑b). Cu „Scrisă de mână”, nu.
   Atinge linia frezelor (Î3).
2. **Z-ul sigur și locul de parcare la final** (în ambele). Aici, Z sigur e fix (5 mm), fără parcare. Pe canvas era „Z sigur
   editabil” (ADR 0290, „Cu canvas-ul aranjamentelor”), lăsat pentru o felie a lui. Costul: ~2 h, în postul comun (Î3).
3. **Originea XY0 în centru sau cu o deplasare** (în ambele). Aici sunt doar cele patru colțuri (`COLTURI`,
   `src/ui/exportRand.ts:249`). Costul: centrul ~2 h, deplasarea ~½ zi (Î6).
4. **Adaosul lateral și trecerea de finisare separată pe profil** (ArtCAM). Nu există; ar fi câmpuri noi în document, deci
   v29+, cu ușa, migrarea, oracolul și corpusul de aur. Costul: ~1 zi pe fiecare (Î9).
5. **Punctul de start al buclei, ales de om, și suprapunerea la închidere** (ArtCAM). Pornirea e acum în cel mai lung gol
   dintre urechi sau acolo unde o pune lucrarea. Tot schemă nouă (Î9).
6. **Fișa de lucru tipărită** (ArtCAM: rezumatul traseelor): frezele în ordine, Z0, originea, timpul, o imagine. Acum,
   Raportul foilor are lista de tăiere, iar Rezultatul, rezumatul jobului, separat. Idee: „Tipărește fișa” în Rezultat,
   din cele două. ~½ zi.
7. **Numele fișierului** ales de om (ArtCAM): constatarea 19.

## Sănătatea codului

- **Mărimea fișierelor:**

  | Fișierul | Rânduri |
  |---|---|
  | `src/ui/DialogExport.tsx` | 1 316 |
  | `src/ui/FisaOperatie.tsx` | 706 |
  | `src/ui/exportDesene.tsx` | 720 |
  | `src/ui/exportRand.ts` | 487 |
  | `src/ui/exportDeseneCalcul.ts` | 170 |
  | `src/ui/exportGrupuri.ts` | 114 |
  | `src/ui/exportPoze.tsx` | 113 |
  | **Total** | **3 626** |

  `DialogExport.tsx` are 30 de hook-uri React.
- **Bucata ferestrei:** `ExportConectat` are 36,6 kB gzip (147 kB brut). Pe 23.11, înaintea liniei, avea 18,9 kB, deci
  desenele, pozele și fișa au adăugat ~17,7 kB, la cerere, nu în pornire. Textele ferestrei: `mesaje/export.json`, 25,8 kB
  gzip, în precache.
- **Ce se repetă:** regulile lucrării, rescrise în interfață (constatarea 3).
- **Ce n-are probă:**
  - desenul față de program în contextul lucrării (supracursa prin foaie, felul găuririi);
  - așezarea listei în „A mea” cu trei operații;
  - un buget de viteză (deschiderea și tasta pe multe operații);
  - textele în engleză ale titlurilor (doar paritatea cheilor).
- **Selectorii fragili:**
  - **După loc:** 55 de selectări ale unei operații după loc (`[data-fisa="op"]` cu `.first()`, `.nth()` sau `.last()`),
    în 12 fișiere e2e (`incrustatieDreapta.spec.ts` are 18). Depind de ordinea automată a tăierii, care se schimbă cu
    tăietura. De trecut pe `[data-operatie="…"]`.
  - **După clase de stil:** 36 de folosiri ale claselor de stil `.dx-*` (`.dx-card > span`, `.dx-meta`, `.dx-poza`) în 8
    fișiere. De trecut pe
    atribute `data-*`.
- **Frezele de rest** se randează încă în `DialogExport.tsx` (`campuriRest`), date fișei printr-o funcție din context. Sunt
  singura parte a fișei care nu stă în `FisaOperatie.tsx`.

## Cât e de gata fișa pentru Clasic (28.2↑) și Pas cu pas (28.4↑)

- **Randarea e de sine stătătoare:** `FisaOperatie` primește totul prin `ContextFisa` (~21 de câmpuri).
- **Starea nu e:** rândurile, verificarea pe rând (`randBun`), greșelile, conflictul frezelor, trecerile, ordinea și
  supracursa stau în `DialogExport.tsx`. Un Clasic care ar lua doar fișa ar trebui să le refacă.
- **Foaia și originea, Mașina și fișierul și Rezultatul** sunt scrise direct în fereastră, nu ca componente. Pas cu pas
  are nevoie de ele separat (pasul 5).
- **Ce aș face, când pornește 28.2↑ sau 28.4↑, nu înainte:**
  - un hook `useStareExport` (starea, verificările, `ContextFisa`), scos din fereastră;
  - componentele `FisaFoaie`, `FisaMasina` și `Rezultatul`;
  - fereastra de azi devine un singur aranjament al lor.
  - **Costul:** ~1 zi; kB ±0.

## Feliile propuse, în ordinea recomandată

| # | Felia | Ce rezolvă | Costul |
|---|---|---|---|
| 1 | **28.8↑h, previzualizarea pe hârtie.** Desenele și notele, calculate de stratul de acțiuni cu funcțiile lucrării; adâncimea tăiată; felul găuririi și cercul prea mare, înainte de clic | 1, 2, 3 | ~½ zi, kB ±0 |
| 2 | **28.8↑i, viteza.** Doar fișa văzută randată, `memo`, context stabil, proba de buget | 4 | ~½ zi, +0,3 kB |
| 3 | **28.8↑j, greșelile pe înțeles.** „Dă-i T{n}”, roșu doar unde e conflictul, id-urile din calcul traduse și „Du-mă la …”, greșeala pe câmp, avertismentul vitezei maxime doar față de `$$`-ul omului | 5, 6, 7, 15 | ~½ zi, +0,5 kB |
| 4 | **28.8↑k, curățenia vizuală.** Capul listei în „A mea”, bifele, bifa prin foaie, desenul Z0, desenul frezei în V, engleza, textele lungi | 8, 10, 11, 12, 16, 17, 21 | ~½ zi |
| 5 | **28.8↑l, tastatura și cititorul de ecran** | 13 | ~1,5 h |
| 6 | **28.8↑m, starea ca hook.** Pentru Clasic și Pas cu pas, la pornirea lor | „Cât e de gata” | ~1 zi |

**Ordinea și liniile vecine:**
- Feliile 1, 3 și 4 ating `FisaOperatie.tsx`, unde lucrează linia frezelor (16.A↑b-5). Pornesc după ce ea se unește în
  `main`.
- Frezele de rest (9) le face chiar linia frezelor, în 16.A↑b-5.
- Numele operațiilor (14) e al liniei principale.
- Lipsurile (avansul, Z-ul sigur, originea, numele fișierului, adaosul, punctul de start, „Toate foile”, Atelierul) așteaptă
  întrebările de mai jos.

## Întrebările pentru owner (grupate, cu recomandarea în față)

**Ordinea**
1. **Ce pornește întâi?**
   - a (recomandat): 28.8↑h (desenele adevărate), apoi 28.8↑i (viteza), apoi j–l, după unirea lui 16.A↑b-5.
   - b: toate deodată, într-o linie nouă.
   - c: doar h, restul mai târziu.

**Frezele și programul**

2. **Conflictul T la o freză schimbată:**
   - a (recomandat): butonul „Dă-i T{n}” lângă greșeală.
   - b: numărul nou pus singur când freza se schimbă și numărul e luat.
   - c: cum e.
3. **Avansul, turația, plonjarea și Z-ul sigur:**
   - a (recomandat): din freza din bibliotecă (16.A↑b). Pe „Scrisă de mână”, trei câmpuri în grupul Freza; Z-ul sigur și
     parcarea, în Mașina și fișierul.
   - b: doar din bibliotecă.
   - c: cum e (fixe).
4. **Avertismentul vitezei maxime cu setările din fabrică:**
   - a (recomandat): doar o notă până când omul lipește `$$`.
   - b: implicitele GRBL mai rapide.
   - c: cum e.

**Fișierul și originea**

5. **Numele fișierului:**
   - a (recomandat): din proiect și foaie, arătat în Fișierele și editabil înainte de Exportă.
   - b: doar arătat.
   - c: cum e.
6. **Originea XY0:**
   - a (recomandat): centrul foii, ca a cincea alegere; deplasarea, mai târziu.
   - b: și deplasarea acum.
   - c: cum e.

**Foile și aranjamentele**

7. **„Toate foile”:**
   - a (recomandat): lista grupată pe foi, cu operațiile fiecăreia, editabile.
   - b: cum e, cu nota.
8. **„Trimite la mașină” în Atelier:**
   - a (recomandat): un pas scurt (origine, Z0, frezele, timpul), cu „Arată tot”.
   - b: fereastra întreagă, ca azi.

**Funcții noi de CAM (schemă nouă)**

9. **Adaosul lateral, trecerea de finisare pe profil, punctul de start:**
   - a (recomandat): o felie CAM după placa 2: adaosul și trecerea de finisare (documentul nou, cu ușa și oracolul), apoi
     punctul de start.
   - b: mai târziu, după etapa 5.
   - c: nu.
