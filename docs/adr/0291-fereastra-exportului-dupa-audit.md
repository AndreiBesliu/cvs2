# ADR 0291: Fereastra „Exportă G-code” după audit: desenele din lucrare, viteza, greșelile pe înțeles și ce lipsea

**Starea:** acceptat pe 25.11.2026, cu toate recomandările („1a, 2a, 3a, 4a, 5a, 6a, 7a, 8a, 9a”), la cele nouă întrebări
ale auditului ferestrei. Al doilea număr al intervalului 0290–0299, al liniei exportului (ramura `wip/28.8-export`, canalul
`export`). Completează ADR 0290; nu-l schimbă.

**De unde vine:** owner-ul a cerut, prin sesiunea principală, pe 25.11, înaintea arhivării liniei: „vreau sa le intrebi ce
pot imbunatati in zona in care au lucrat? dar, defapt, pune-le sa faca un audit complet in acest sens”. Auditul
(`docs/linii/audit-export.md`, în `main` din `ee492406`; schița: <https://claude.ai/artifact/QYhaU4zsmM9Uiu1uprV7YK>) a
parcurs aplicația construită și a comparat desenele cu G-code-ul descărcat. Are 21 de constatări, feliile 28.8↑h–m și
nouă întrebări. Răspunsurile au venit în sesiunea liniei.

## Ce a găsit auditul, pe scurt

- **Două desene nu spun ce taie programul.** Programul e corect și sigur în amândouă cazurile:
  - cu supracursa prin foaie, desenul și nota spun 3 treceri de 6 mm, iar programul taie 4 treceri de 4,575 mm;
  - găurirea cu elice e desenată ca ciocănire.

  Cauza e una de structură: interfața nu importă lucrarea (regula `interfata-prin-actiuni`), deci fereastra își rescrie
  formulele (9 funcții în `src/ui/exportDeseneCalcul.ts`).
- **Viteza:** cu 150 de piese, fereastra se deschide în 7,6–8,8 s. Are 37 487 de noduri, iar o tastă ține 90–112 ms, fiindcă
  toate fișele sunt randate deodată.
- **Frecările de la fiecare export:**
  - „T1 are două freze” la orice freză schimbată;
  - avertismentul de viteză maximă la orice program;
  - id-urile interne în refuzurile din calcul;
  - capul listei suprapus în „A mea”.
- **Ce lipsea ca funcție:** avansul, turația și Z-ul sigur pe operație; originea în centru; numele fișierului; „Toate foile”
  cu operațiile tuturor foilor; adaosul și trecerea de finisare.

## Deciziile (răspunsurile owner-ului)

1. **Ordinea (1a):** întâi 28.8↑h (desenele adevărate), apoi 28.8↑i (viteza), apoi 28.8↑j–l. Toate pornesc după ce
   16.A↑b-5 (linia frezelor, care lucrează acum în fișa operației) e în `main`.
2. **Conflictul T la o freză schimbată (2a):** butonul „Dă-i T{n}” lângă greșeală.
   - Numărul îl dă regula de azi: cel al bibliotecii cât e liber, altfel cel al unei freze identice, altfel cel mai mic liber
     (`numarPentruRand`, ADR 0300 §4).
   - Roșu doar pe câmpurile cu numărul ciocnit.
3. **Avansul, turația, plonjarea, Z-ul sigur (3a):**
   - pe o freză din bibliotecă, valorile ei de lucru (v27, `regim`), ca azi;
   - pe „Scrisă de mână”, trei câmpuri în grupul Freza al fișei (turația, avansul, plonjarea), scrise în `regim` pe freza
     operației. Fără schemă nouă: documentul le are de la v27;
   - Z-ul sigur și locul de parcare de la final stau în „Mașina și fișierul”, ca setări ale aplicației, cum stă supracursa.

   Fără valori, programul de azi, octet cu octet.
4. **Avertismentul de viteză cu setările din fabrică (4a):**
   - până când omul își lipește `$$`-ul, Rezultatul spune o notă („timpul e estimat cu setările GRBL din fabrică; lipește
     `$$` pentru timpul mașinii tale”), nu avertismentul;
   - avertismentul rămâne doar față de `$$`-ul lipit.
5. **Numele fișierului (5a):** stă în „Mașina și fișierul” și se poate schimba înainte de Exportă; Rezultatul îl arată.
   - Documentul n-are încă un nume de proiect (proiectele multiple, cu fișierul `.cvs2`, sunt o linie a lor). Deci propunerea
     de azi pornește din numele foii, iar numele proiectului intră când există.
   - Cu foaia nenumită, numele de azi rămâne (`cncvs2-<colțul>`), deci aceiași octeți și aceleași nume în probe.
   - Contractele cu nume scurte (`numeScurt`, RichAuto) își păstrează regula de 8 caractere.
6. **Originea XY0 (6a):** centrul foii devine a cincea alegere, lângă cele patru colțuri; deplasarea, mai târziu.
   - Atinge contractul montajului (`src/ir/montaj.ts`, ADR 0008: o singură transformare, aplicată doar de post), antetul
     programului citit de sender (`(origine …, Z0 …)`, `src/machine/program.ts`) și desenul XY0.
   - Colțurile de azi rămân octet cu octet. Felia mișcă mașina, deci cere proba ei pe oracole (poarta, regiunea) și pe
     emulator.
7. **„Toate foile” (7a):** lista arată operațiile fiecărei foi, grupate pe foi, editabile; Rezultatul, pe foi.
   - Vine după 28.8↑i, fiindcă înmulțește fișele, deci are nevoie întâi de randarea doar a celor văzute.
   - Programul fiecărei foi rămâne cel al documentului doar cu ea (`doarFoaia`, ADR 0210 §5).
8. **„Trimite la mașină” în Atelier (8a):** un pas scurt (originea, Z0, frezele în ordine, timpul, Trimite), cu „Arată tot”
   pentru fereastra întreagă. E a liniei aranjamentelor (ADR 0250); fereastra îi dă bucățile (vezi 28.8↑m).
9. **Adaosul lateral, trecerea de finisare, punctul de start (9a):** o felie de CAM după placa 2.
   - Întâi adaosul și trecerea de finisare pe profil, apoi punctul de start.
   - Cer un document nou: v30 sau numărul liber de atunci, dat de sesiunea principală. Vin cu ușa, migrarea, oracolul
     documentului, corpusul de aur și oracolul fizic.
   - Linia care o face o stabilește sesiunea principală.

## Feliile

| # | Felia | Ce rezolvă (constatările auditului) | Depinde de | Costul |
|---|---|---|---|---|
| 28.8↑h | Previzualizarea pe hârtie: desenele și notele calculate de stratul de acțiuni cu funcțiile lucrării (adâncimea tăiată, felul găuririi, centrele urechilor); cercul peste 2·D, greșeală în fișă, înainte de clic | 1, 2, 3 | 16.A↑b-5 în `main` | ~½ zi |
| 28.8↑i | Viteza: doar fișa văzută și vecinele ei randate, `memo`, `ContextFisa` stabil, proba de buget (150 de operații) | 4 | 28.8↑h | ~½ zi, +0,3 kB |
| 28.8↑j | Greșelile pe înțeles: „Dă-i T{n}” (2a), roșu doar unde e conflictul, id-urile din calcul traduse și „Du-mă la …”, greșeala pe câmp, nota în locul avertismentului de viteză (4a) | 5, 6, 7, 15 | 28.8↑i | ~½ zi, +0,5 kB |
| 28.8↑k | Curățenia vizuală: capul listei în „A mea”, bifele, bifa prin foaie, desenul Z0, desenul frezei în V, engleza, textele lungi | 8, 10, 11, 12, 16, 17, 21 | 28.8↑j | ~½ zi |
| 28.8↑l | Tastatura și cititorul de ecran: focusul în fișă, titlul înaintea explicației, `aria-describedby` | 13 | 28.8↑k | ~1,5 h |
| 28.8↑m | Starea ca hook (`useStareExport`) și foaia, mașina și Rezultatul ca componente, pentru Clasic, Pas cu pas și pasul scurt din Atelier (8a) | „Cât e de gata” | 28.8↑l; la pornirea lui 28.2↑, 28.4↑ sau a pasului din Atelier | ~1 zi |
| 28.8↑n | Numele fișierului (5a) | 19 | nimic din fișă | ~½ zi |
| 28.8↑o | Centrul foii ca origine XY0 (6a), cu montajul, antetul și senderul | lipsa 3 | nimic din fișă | ~½–1 zi |
| 28.8↑p | Avansul, turația și plonjarea pe „Scrisă de mână”; Z-ul sigur și parcarea (3a) | lipsurile 1 și 2 | 28.8↑j; cu linia frezelor | ~½ zi |
| 28.8↑q | „Toate foile” cu operațiile fiecărei foi, grupate (7a) | 18 | 28.8↑i | ~1 zi |

Costurile vin din duratele măsurate ale feliilor 28.8↑b–g (20 de minute – o oră fiecare, cu probele și documentele) și ale
lui 28.8↑a (3 h 20 min, carcasa).

**Ordinea:**
- 28.8↑n și 28.8↑o nu ating fișa operației, deci pot merge cât 16.A↑b-5 e în lucru. Propunerea liniei, spusă owner-ului
  odată cu acest ADR: întâi n, apoi o.
- 28.8↑h–l urmează ordinea din 1a.
- 28.8↑p și 28.8↑q vin după feliile de care depind.
- Frezele de rest fără etichete (constatarea 9) le face linia frezelor, în 16.A↑b-5.
- Numele elementelor cu punct zecimal (constatarea 14) e al liniei principale (`src/app/descriereElement.ts`).

## Ce nu se schimbă

- **Programul, octet cu octet,** pentru tot ce există azi:
  - h, i, k, l nu ating lucrarea;
  - j schimbă doar textele și o notă;
  - n schimbă numele fișierului doar când omul îl schimbă sau foaia are un nume;
  - o adaugă o alegere, iar colțurile rămân;
  - p, fără valori scrise, lasă programul de azi.
- **Schema documentului nu se schimbă** până la felia de CAM din 9a: rămâne cea de azi (v28, a reliefului; v29 e dat liniei
  reliefului pentru 18.1↑c), iar 9a ia v30 sau numărul liber de atunci.
- **Regulile ferestrei** din ADR 0290 și din `docs/linii/export.md` rămân:
  - un câmp nou își cere grupul în `GRUP_CAMP`, explicația în ambele limbi și locul în proba privirii;
  - ce nu se aplică nu apare.

## Implementarea 28.8↑n (25.11)

- **Regula numelor** stă în `src/post/numeFisier.ts`, pură, fără importuri:
  - `bazaFisier(origine)`: baza de azi, `cncvs2-<colț>`. `numeFisier`, `numeInArhiva` și numele arhivei o iau de aici, deci
    nu mai sunt două scrieri ale ei.
  - `propunereNume(numeFoaie, origine)`: numele scris al foii, fără diacritice, cu litere mici, cu liniuțe, cel mult 60 de
    caractere; fără nume (sau din care nu rămâne nimic), baza de azi.
  - `motivNume(nume)`: refuză numele gol, cel de peste 80 de caractere, caracterele oprite de sistemele de fișiere
    (`< > : " / \ | ? *` și cele de control), spațiul sau punctul la capete și numele rezervate de Windows.
  - `cuBaza(nume, origine, baza)`: înlocuiește doar baza întreagă din fața unui nume (urmată de `-`, `.` sau nimic).
    Sufixele pe sculă, ale dopurilor și ale foilor rămân, iar numele scurte (`CNCVS2.NC`, `F2X3/CV1T2.NC`) n-au bază.
- **Numele se aplică după calcul, pe firul principal** (`cuNumele` în `src/ui/actiuniExportCalcul.ts`, la cerere): fișierele,
  dopurile, programul dus în Mașina, numele din arhiva „Toate foile” și arhiva. Workerul CAM nu-l vede (`numeFisier` din
  cerere e ignorat acolo), deci octeții sunt aceiași. Nimic nou în pachetul de pornire: `App.tsx` trimite doar numele foii.
- **Fereastra:** grupul nou `fisier` în „Mașina și fișierul”, după Unități (`GRUP_CAMP`: `nume-fisier`). Câmpul
  `data-camp="nume-fisier"` urmează propunerea cât omul nu scrie în el. Sub el, `data-nume-rezultat` spune ce se descarcă.
  Un nume greșit oprește Exportă, cu greșeala în grup, punctul pe „Mașina și fișierul” și „Du-mă la …”. Pe un contract cu
  `numeScurt` (RichAuto), câmpul e oprit, iar nota spune numele controlerului. Rezultatul unui singur fișier poartă
  `data-fisier`.
- **Neschimbat:** cu foaia nenumită și câmpul neatins, cererea nu trimite nimic, deci numele de azi, octet cu octet; numele
  ales nu intră în proiect (ca supracursa).
- **Probele:** `export.numeFisier.test.ts` (4) și unul nou în `export.foi.test.ts` (arhiva, numele din ea, Mașina, aceiași
  octeți); `export.nume.spec.ts` (2 e2e). Spec-urile e2e ale exportului, 289 / 289. **Otrăvurile:** `28.8n.py`, 16 / 16.
- **Mărimea:** pornirea +0,1 kB (111,2; cu ușa 116,2, cu Atelierul 116,5 / 125), totalul +1,0 kB (885,8 / 1 000).

## Implementarea 28.8↑o (25.11)

- **Montajul** (`src/ir/montaj.ts`): `OrigineXY` = colțurile și `centru`, cu lista `ORIGINI` (colțurile, apoi centrul).
  Centrul e tot o translație, cu jumătatea foii: e = −L/2, f = −H/2, iar Z0 jos ridică programul cu grosimea, ca la
  colțuri. Transformarea rămâne una, aplicată doar de post (ADR 0008). Colțurile nu s-au schimbat: corpusurile de aur și
  amprentele plăcilor trec neatinse.
- **Antetul** spune `(origine centru, Z0 …)`. Senderul îl citește (`montajDeclarat`), iar panoul Mașina scrie lângă zero
  „Originea XY a programului: centrul foii.”. Un dop exportat cu centrul se cheamă `cncvs2-centru-dop-N` (`numeFisierDop`
  recunoaște și baza fără liniuță). Raportul foilor spune „originea în centrul foii”.
- **Fereastra:** „Unde e XY0” (titlul grupului) are în listă și „centrul foii”. În desen, punctul din mijlocul foii se alege
  la clic, cu eticheta și nota lui („XY0 în centrul foii”).
- **I / J** vin din startul deja rotunjit (strategia B a postului). Cu centrul, pot diferi de cele ale unui colț cu o unitate
  a ultimei zecimale; arcul văzut de GRBL îl judecă poarta.
- **Probele** (`montaj.centru.oracol.test.ts`):
  - transformarea, pe hârtie;
  - corpusul CAM: rând cu rând, programul cu centrul e cel al colțului mutat cu jumătatea foii, cu Z, avansurile și
    comentariile neatinse;
  - poarta, pe căi: aceleași verdicte și aceeași abatere ca pe colțul cazului;
  - oracolul buzunarului fără probleme. Martorii: programele cu centrul, citite ca din stânga-jos, sunt prinse de amândouă
    oracolele;
  - antetul citit de sender, numele și rejucarea pe emulatorul GRBL (coordonatele negative trec, 0 pierderi);
  - `export.centru.spec.ts` (2 e2e).

  Oracolele porții și buzunarului citesc centrul pe hârtie (L/2, H/2). Spec-urile e2e care deschid exportul, 313 / 313;
  unitarele, 10 462 / 0. **Otrăvurile:** `28.8o.py`, 13 / 13.
- **Mărimea:** pornirea +0 (111,2 kB), totalul +0,1 kB (885,9 / 1 000).
- **Pe mașină:** zero-ul XY se pune în mijlocul foii. Proba pe mașina owner-ului (o placă cu centrul, privită în aer întâi)
  rămâne a owner-ului.


## Implementarea 28.8↑h (25.11)

- **Rândul „pe hârtie”** (`src/app/hartieExport.ts`, `hartieRand`): ce face lucrarea cu valorile scrise într-un rând, socotit de
  fereastra conectată cu funcțiile lucrării. Fișa îl primește prin `ContextFisa.hartie` și doar îl desenează. Contractul
  (`IntrareHartie`, `HartieRand`) stă în `src/ui/exportRand.ts`.
  - **Adâncimea tăiată** (`adancimeTaiata`, în `src/cam/prinFoaie.ts`): cu bifa „și tăieturile cât foaia”, o tăietură cât foaia
    trece cu supracursa (`catFoaia`, regula pe care o folosește și `cuTaieturiPrinFoaie`), iar gaura incrustației (ADR 0175) e
    grosimea foii plus supracursa, ca `cuGauriPrinFoaie`. Rândul primește supracursa și bifa ca cererea de la Exportă: supracursa
    doar cât e pozitivă și bună, bifa doar cu ea.
  - **Trecerile** (`adancimiTreceri`, mutată din `profil.ts` în `src/cam/treceri.ts`, fără importuri) pe adâncimea tăiată:
    desenul adâncimii, nota („4 treceri de 4,58 mm, până la 18,3 mm (prin foaie, cu supracursa)” când lucrarea taie mai adânc
    decât câmpul), rampa și coborârea.
  - **Găurirea** (`src/cam/gaurireFel.ts`, fără importuri, folosit și de `traseuGaurire`): felul fiecărui cerc
    (`felGaurire`: ciocănire, elice, mic, mare) și pașii ciocănirii (`pasiCiocanire`). Diametrele cercurilor rândului
    (`OperatieExport.diametre`) vin cu `diametruCerc`, formula lui `cercInLume` din lucrare.
- **Constatarea 1:** cu supracursa 0,3 și bifa, 18 mm cu pasul 6 se arată 4 treceri de 4,575 până la 18,3, ca programul.
- **Constatarea 2:** desenul găuririi are trei feluri (`data-gaurire`): ciocănirea, elicea (din lateral: o tură pe trecere, pe
  cercul de rază (Dc − D) / 2, apoi una la fund) și „nu merge”. Câmpul ieșirii lipsește când toate cercurile sunt pe elice (cu
  o valoare greșită rămâne la vedere). Un cerc pe care freza nu-l poate găuri e greșeală în grupul Freza, cu freza cea mai
  mică bună (Dc / 2), și oprește Exportă înainte de clic, cu „Du-mă la …”.
- **Ce rămâne în fereastră, cu proba lui față de lucrare** (`exportDeseneCalcul.ts`, `export.desene.test.ts`):
  - **locurile urechilor pe schiță:** lucrarea lor (`urechiPeLaturi`, cu `laturiBucla` și `geometrieUrechi`) ar aduce în
    bucata ferestrei 1,3 kB (măsurat), pentru un desen care nu e la scară și pe care nicio regulă a lucrării nu-l schimbă;
  - **pasul lateral și coborârea:** cer motorul de contururi, care stă doar în workerul CAM;
  - **V-carve-ul și incrustațiile:** cer o operație întreagă, pe care fereastra o face abia la Exportă; vin cu 28.8↑m, când
    starea ferestrei devine un hook.
- **Neschimbat:** programul, octet cu octet (aurul plăcilor 1, 2, 4, 11 și al atelierelor, corpusul CAM): mutările din lucrare
  păstrează aceleași calcule, în aceeași ordine. Documentul rămâne v28; nimic pe server.
- **Probele:**
  - `export.hartie.test.ts` (4): adâncimea tăiată față de documentul tăiat de lucrare, pe corpusul CAM și pe foaia cu toate
    felurile, cu supracursa 0 / 0,5 / 2 și bifa sau fără (martorul cere operații schimbate); constatarea 1 până la G-code;
    felul găuririi față de `traseuGaurire` pe o grilă de cercuri și freze, cu pașii ciocănirii = mișcările lui pe Z;
    constatarea 2 față de refuzul exportului;
  - `export.hartie.spec.ts` (2 e2e): cele două constatări în fereastră;
  - `export.desene.test.ts` și `gaurire.spec.ts`, aduse la zi (găurirea pe hârtie din rând; greșeala lângă freză în locul
    refuzului după clic). Spec-urile e2e care deschid exportul, 321 / 321.
- **Otrăvurile:** `28.8h.py`, 21 / 21 (11 unitare, 10 e2e). Patru vechi, îndreptate, prinse: F01 și F02 din `12.1f-4.py`
  (regula din `cuTaieturiPrinFoaie`) țintesc acum `catFoaia`; E07 din `28.8a.py` și D01 din `28.8b.py` (copia trecerilor)
  țintesc `treceri.ts`, cu un caz nou pe hârtie pentru D01 (19,05 cu pasul 1,5875: 12 treceri, nu 13).
- **Mărimea:** pornirea +0 (111,2 kB), totalul +1,4 kB (891,7 / 1 000); bucata ferestrei +1,1 kB gzip (elicea desenată,
  greșeala găuririi, textele, modulele mici ale lucrării). Estimarea din tabel (kB ±0) nu socotise desenul elicei.

## Implementarea 28.8↑h-2 (25.11)

Reparația lui „Du-mă la …”, cerută de sesiunea principală după unirea lui 28.8↑h peste 16.A↑b-4: completul unirii a căzut la
`export.hartie.spec.ts:51` (greșeala cercului, sub marginea panoului, după clic). Reprodusă la fiecare rulare: la 1280 × 720,
panoul 71..596, greșeala 651..696.

- **Cauza:** `du(cheie, true)` aducea doar capul fișei sus și punea focusul cu `preventScroll` pe primul câmp marcat greșit.
  O greșeală de sub prima înălțime a panoului rămânea ascunsă. Pe 28.8↑h, proba trecea la limită: cu vreo 4 px ai greșelii în
  panou. 16.A↑b-4 pune în lista frezei „Scrisă de mână (ca „…”)”, iar rândul se rupe pe două (118 px), deci greșeala iese de
  tot. În plus, pe un cerc care nu se găurește niciun câmp nu era marcat greșit, deci focusul rămânea pe buton.
- **Reparația** (`DialogExport.tsx`, `du`): după capul fișei, aduce în vedere prima greșeală a fișei, adică primul grup cu un
  câmp greșit sau cu un text de greșeală. Încearcă, în ordine, trei întinderi și o ia pe cea mai largă care încape în panou (cu
  8 px margine):
  1. de la titlul grupului până la textul greșelii;
  2. câmpul și textul;
  3. doar textul.

  Derulează cât mai puțin. Când nici textul nu încape, primul lui rând vine sus. Focusul trece pe câmpul greșit, fără altă
  derulare. Diametrul frezei e marcat greșit (`aria-invalid`) cât un cerc al rândului e prea mic sau prea mare pentru ea
  (`FisaOperatie.tsx`, `gauraRea`, din rândul pe hârtie, ca greșeala).
- **Probele** (`export.hartie.spec.ts`, scrise întâi și văzute căzând):
  - greșeala trebuie să fie întreagă în partea vizibilă a panoului, după dreptunghiuri (nu `toBeInViewport`, care se mulțumește
    cu un pixel), cu focusul pe diametru, la 1280 × 720;
  - aceeași probă la 1024 × 600 și 1280 × 560, cu fontul lat, și pe telefon, la 390 × 844 și 844 × 390. Pe fiecare, cu
    biblioteca de pornire („Scrisă de mână (ca „…”)” în listă) și cu panoul derulat întâi la capăt;
  - la 844 × 300, unde greșeala e mai înaltă decât panoul, primul ei rând stă sus;
  - cu nota bibliotecii desfăcută (16.A↑b-6: „nu mai e în bibliotecă”, cu „Pune-o înapoi în bibliotecă”), la 1280 × 720 și la
    844 × 390: freza „Plată Ø12” intră în proiect pe un cerc de R10, e ștearsă din bibliotecă, apoi cercul crește la R15.
- **Peste 16.A↑b-6:** ramura are `origin/unire-2511w` adus (b-6 și 3.Tu). Ciocnirile au fost doar în listele de proprietăți
  ale ferestrei (`hartie` și `inapoi`, amândouă păstrate).
- **Peste 18.1↑c** (`origin/unire-2511x`, `f7ca20b6`): relieful scosese finisarea din tăieturile cât foaia pe vechiul `prin`
  din `cuTaieturiPrinFoaie`, iar 28.8↑h mutase regula în `catFoaia`, comună lucrării și ferestrei. Finisarea intră în
  `catFoaia`, deci o finisare cât foaia rămâne la adâncimea scrisă, cu bifa și cu supracursa, și în lucrare, și pe hârtie;
  un profil cât foaia din același document coboară ca până acum. Proba: `export.hartie.test.ts` („cu 18.1↑c: …”), văzută
  căzând fără finisarea în `catFoaia`; partea lucrării pe program o ține și proba reliefului din `finisare.program.test.ts`.
  Rândul unei finisări nu ajunge la `hartie`: e doar de citit (`FisaFinisare.tsx`), iar `peRand` îl scoate din rândurile
  fișei operației.
- **Otrăvurile:** E11–E16 în `28.8h.py`, 6 / 6. E12 (capătul de sus scăpat când nu încape) scăpase întâi; proba de la
  844 × 300 o prinde. E01 din `28.8a.py` (derularea capului fișei) e tot prinsă.
- **Mărimea:** pornirea +0 (111,2 kB), totalul +0,2 kB (893,5 / 1 000). Programul, documentul și serverul: neschimbate.
- **Găsit pe drum, în afara reparației:** pe un telefon culcat îngust (640 × 360), banda listei lasă fișelor 9 px: fereastra
  nu se poate folosi acolo. E de judecat cu 28.8↑l (privirea) sau cu aranjamentele.

## Implementarea 28.8↑i (25.11)

Constatarea 4 a auditului: pe 150 de operații, toate fișele stăteau randate una sub alta. Măsurat aici înaintea feliei (1280 ×
720, aceeași probă): deschiderea 9,7 s, 37 800 de noduri în fereastră, 150 de fișe randate, o tastă 96 ms (mediana).

- **Doar fișele din jurul panoului se randează** (`DialogExport.tsx`, `PRAG_FISE`, `fereastra`, `randata`):
  - peste 12 fișe de operații, se randează cele care ating panoul sau stau la cel mult o înălțime de panou de el, cea curentă cu
    vecinele ei și cea cu focusul (golită când focusul pleacă din panou);
  - restul își țin locul: o secțiune cu titlul și înălțimea măsurată a fișei (`data-gol`), deci lista, derularea și „Du-mă la …”
    o găsesc;
  - „Du-mă la …” randează întâi fișa (`flushSync`), apoi derulează și caută greșeala în fișa adevărată;
  - până la 12 fișe, toate rămân randate, cum erau (căutarea în pagină, probele vechi). Pragul e 12, nu 20: cu 20 de fișe
    randate, o tastă ținea ~17 ms, prea aproape de buget pe un runner mai lent.
- **Rândurile listei** (`RandListaOp`, `memo`) primesc doar ce arată (datele rândului, locul, starea tragerii) și acțiunile
  printr-un obiect stabil (`ActiuniLista`, cu funcțiile de acum puse după fiecare randare). Pe 150 de operații, lista randată la
  fiecare tastă ținea cam jumătate din timpul ei (cu lista scoasă de probă: 6,3 ms în loc de 13); `memo` a câștigat ~2 ms.
- **Fără `content-visibility` pe rândurile listei.** Încercat în felie, a fost scos după primul complet (pe `da8ef7a5`): un
  rând departe de vedere avea înălțimea 0, nu cele 3,5 rem cerute (lista de 150 de rânduri măsura 1 969 px în loc de
  12 491), iar adus în vedere o primea pe a lui, 79 px. Rândurile se mutau sub clic: cu opt lucrători pe patru procesoare,
  clicul pe un rând de departe a căzut pe listă în 4 din 64 de rulări (fără proprietate, 0 din 48). Câștigul lui la o tastă
  era sub zgomotul măsurătorii (cea mai bună tastă, 5–7 ms cu el sau fără el).
- **Fișa operației nu e `memo`, iar `ContextFisa` rămâne cum e.** Măsurat: o fișă randată costă ~0,5 ms la o tastă, iar cu
  fereastra rămân 3–5 randate. Un context stabil ar fi cerut refacerea tuturor funcțiilor lui, pentru cel mult ~2 ms. Se
  redeschide dacă 28.8↑q („Toate foile”) sau o fișă mai grea mută iar costul în fișe.
- **După felie**, aceeași probă: prima deschidere ~0,45–0,5 s (cu ~170 ms așteptarea bucății ferestrei), următoarele
  ~0,14–0,18 s, 2 667 de noduri, 3 fișe randate, o tastă 8,6–11,7 ms (mediana; cea mai bună 5,6–7,8). Pe 60 de operații,
  ~7 ms; pe 10 (toate randate), ~9 ms (măsurate cu rândurile cu `content-visibility`).
- **Probele** (`test/e2e/export.viteza.spec.ts`, scrise întâi; primele două au căzut la deschidere, cu fereastra neapărută în
  5 s):
  - 150 de operații: deschiderea sub 1 s, cel mult 6 fișe randate, sub 6 000 de noduri, o tastă sub 30 ms. Timpii se măsoară
    în pagină (deschiderea, de la clic la cadrul desenat), iar proba ia cel mai bun: din cel mult trei deschideri și din 11
    taste. Primul complet a citit deschiderea cu `expect` din Playwright, care întreabă pagina la 0, 100, 350, 850 ms…: 1 159 ms
    pentru o deschidere de sub 850, deci roșu. Cu patru probe deodată pe patru procesoare, mediana unei taste a ieșit 9–31 ms,
    iar cea mai bună 6–17: zgomotul doar adaugă timp, iar fără fereastra fișelor o tastă ținea 90–112 ms. Fiecare tastă scrie
    altă valoare: una la fel cu cea din câmp nu randează nimic, iar cea mai bună ar fi tocmai ea;
  - un rând al listei are, departe de vedere, înălțimea pe care o are adus în vedere (rândurile 20, 75, 110, 149);
  - derulată până jos, din listă, cu focusul ținut cât omul derulează departe, cu „Du-mă la …” la o greșeală departe
    (focusul pe diametru); ce s-a scris rămâne după ce fișa iese din vedere;
  - până la 12 operații toate randate, peste nu;
  - la 1280 × 2400, fișele randate sunt exact cele cerute de regulă (din dreptunghiuri), iar marginea ajunge dincolo de vecine.
- **Otrăvurile:** `28.8i.py`, 10 / 10 (pragul în ambele sensuri, fișele din jurul panoului, vecinele, focusul și golirea lui,
  marginea, fereastra nesocotită, „Du-mă la …” fără randarea fișei, `content-visibility` pus la loc pe rânduri). `memo`
  schimbă doar timpul: îl judecă măsurătoarea, nu o otravă.
- **Mărimea:** pornirea +0 (111,4 kB), totalul +0,3 kB (909,4 / 1 000). Programul, documentul și serverul: neschimbate.
- **Pragurile la care felia se redeschide** (cerute de sesiunea principală după primul complet): judecata e pe ce se numără
  (cel mult 6 fișe randate la deschidere pe 150 de operații, sub 6 000 de noduri, regula ferestrei la 1280 × 2400); ceasul e
  plasa largă, la cea mai bună încercare măsurată în pagină: deschiderea sub 1 s (cea mai bună ~0,15 s) și o tastă sub 30 ms
  (cea mai bună ~6 ms). Peste ele, felia se redeschide. Completul a trecut de două ori la rând pe `8c309846`.

## Implementarea 28.8↑j (26.11)

Constatările 5, 6, 7 și 15 ale auditului, cu răspunsurile 2a și 4a. Programul rămâne octet cu octet: se schimbă doar ce spune
fereastra și un număr T, la clicul omului.

- **„Dă-i T{n}” (2a, constatarea 5).** Lângă greșeala „T{n} are două freze”, în grupul fiecărei freze cu numărul ciocnit (freza
  operației, fundul plat, dopul, banda, frezele de rest), un buton îi dă frezei alt număr (`numarDupaConflict`,
  `src/ui/exportRand.ts`):
  - regula rolurilor (`numarPentruRand`, ADR 0114 §5), fără numărul ciocnit: numărul aceleiași freze, cât pe el stau doar freze
    identice; altfel cel mai mic liber, printre toate frezele ferestrei și ale finisărilor reliefului;
  - identitatea e cea a conflictului (`cheieFreza`: diametrul, unghiul V cu vârful plat, bila), deci mutarea nu face alt
    conflict;
  - butonul apare pe fiecare freză cu numărul ciocnit, nu doar pe cea „în minoritate”: fiecare clic face un pas (mută freza pe
    numărul aceleiași freze sau pe unul liber), iar după el conflictul se socotește din nou;
  - roșii sunt doar câmpurile (T și Ø) frezelor cu numărul ciocnit, și la frezele de rest; azi, conflictul înroșea toate
    frezele rândului (pe V-carve-ul cu fund plat, și T2 Ø3,175).
- **Greșeala pe câmp (constatarea 15).** Numărul sculei, diametrul, unghiul V, adâncimea și pasul își spun fiecare greșeala, cu
  marginile lor („Pasul: scrie un număr mai mare ca 0, cel mult 1000 mm.”), fără gruparea miilor („1.000 mm” s-ar citi un
  milimetru); roșu e doar câmpul greșit (`campuriSculaGresite`). În listă, un număr lipsă e „—” („T— Ø6 · —”), nu „ mm”. Fraza
  generală rămâne doar lângă Exportă, unde o întoarce și registrul.
- **Nota vitezei (4a, constatarea 6).** Cu setările GRBL din fabrică, avansul peste viteza lor maximă se spune ca notă, cu „Lipește
  $$ pentru timpul mașinii tale”; avertismentul rămâne doar față de `$$`-ul lipit (`data-sursa` pe rândul rezumatului).
- **Refuzurile din calcul (constatarea 7).** Înainte de afișare, id-urile din lume („e2/c1”) devin numele elementelor, ca în
  listă, iar în română numerele lucrării primesc virgula („1,000 mm”, „X 24,0”) (`motivPeInteles`, `src/ui/motivCalcul.ts`,
  pur). Lângă refuz, „Du-mă la …” aduce fișa operației primului element numit; harta element → operație o face
  `ExportConectat.tsx` (`operatiiLume`, prima operație de pe rând, în orice instanță a piesei). Textele motivelor rămân ale
  lucrării (`src/cam/`); selecția elementului pe pânză, la închidere, nu e în felie.
- **Ce rămâne nepotrivit:** numele elementelor își scriu încă numerele cu punct („dreptunghi 100.00 × 60.00”), deci un refuz
  le are lângă numerele cu virgulă ale lucrării. E constatarea 14, a liniei principale (`src/app/descriereElement.ts`).
- **Probele:** `test/unit/export.conflictT.test.ts` (5: identitatea, numărul nou, freza identică cu numărul ei curat sau ciocnit,
  niciodată numărul ciocnit, scrierea pe rând), `test/unit/export.motivCalcul.test.ts` (3) și `test/e2e/export.greseli.spec.ts`
  (5: „Dă-i T3” pe ambele fișe, cu roșul doar pe T1 și un clic care repară; greșeala pe câmp la pas, adâncime, număr, diametru
  și unghi, cu „—” în listă; nota față de avertisment, cu `$$`-ul unei mașini lente; refuzul regiunii cu numele, virgula și
  „Du-mă la …”; engleza). Trei probe vechi aduse la zi: `rezumat.spec.ts` (nota), `export.spec.ts` și `incrustatie.spec.ts`
  (numele și virgula). E2e-ul care deschide exportul: 352 / 352.
- **Otrăvurile:** `28.8j.py`, 16 / 16 (numărul nou, scrierea pe rând, butonul și grupul lui, roșul, greșeala pe câmp, „—” în listă,
  marginile fără grupare, nota vitezei, refuzul cu numele, virgula, cheia și harta elementelor).
- **Mărimea:** pornirea +0 (111,4 kB), totalul +1,1 kB (910,5 / 1 000), peste estimarea de +0,5 kB: patru părți în loc de una
  (butonul, greșelile pe câmp, nota și refuzul pe înțeles). Programul, documentul și serverul: neschimbate.

## Implementarea 28.8↑k (26.11)

Constatările 8, 10, 11, 12, 16, 17 și 21 ale auditului. Programul rămâne octet cu octet: se schimbă doar cum arată fereastra.

- **Capul listei (constatarea 8).** Rândurile listei au `flex-shrink: 0`: `min-height: 32px` al butoanelor le înlocuia minimul
  automat al coloanei flex, deci, pe o fereastră joasă sau cu „A mea” pornită, „Foaia și originea” și „Mașina și fișierul” se
  strângeau la 32 px și treceau peste rândul următor (la 1280 × 720, și în ordinea automată). Pe telefon, banda le strânge pe
  lățime, ca înainte.
- **Bifele și fundul plat (constatarea 10).** Orice bifă a ferestrei are căsuța lângă etichetă (regula `.dialog label` e o
  grilă, pentru câmpurile cu eticheta deasupra; `:where`, ca să rămână confirmările de sub fișe cum sunt). Fundul plat are
  câmpurile pe rânduri, ca freza operației: lista „Din frezele mele” pe rândul ei (și la freza operației), apoi numărul,
  diametrul și pasul; câmpul T al fundului și al dopului e îngust, ca al frezei operației.
- **Bifa „și tăieturile cât foaia” (constatarea 11).** Se arată doar cu o supracursă bună, peste 0; la 0 nu schimbă nimic, iar
  „bifată și oprită” nu spunea dacă e pornită. Alegerea omului rămâne ținută de aplicație și reapare cu supracursa.
- **Desenul Z0 (constatarea 12).** Golul incrustației doar dacă foaia are o incrustație cu pereți drepți și gaură prin foaie;
  tăietura „scrisă cât foaia” doar cu supracursa peste 0 și bifa ei; cota supracursei lângă golul care se vede.
- **Freza în V (constatarea 17).** Diametrul sub vârf, ca la freza plată, cu liniile ajutătoare din marginile conului: pe coadă,
  „Ø 3,175 mm” trecea peste „T1”.
- **Titlurile în engleză (constatarea 16).** „Cut type”, „Clearing”, „Descent” (ca eticheta câmpului; „Plunge” e una dintre
  alegerile lui) și „Rest machining”. Titlurile în română („Ce tăiere”, „Cum golește”, „Cum coboară”) au rămas, cum spunea
  auditul, la owner; pe 26.11 a ales recomandarea („da, Tăietura, Golirea, Coborârea”), într-un commit separat, după 28.8↑q.
- **Textele lungi (constatarea 21).** Peste 160 de caractere, un text arată prima propoziție și „…” (`scurtat`, `textStrans`,
  `src/ui/exportRand.ts`; o propoziție se termină cu un punct urmat de spațiu și de o literă mare, o paranteză sau ghilimele):
  - în caseta explicației, „Mai mult” / „Mai puțin” e al grupului, nu al textului: deschis, arată întregi toate explicațiile
    grupului, și pe ale câmpurilor pe care treci apoi (drumul mausului spre buton trece de obicei peste alte câmpuri, care
    schimbă textul). Butonul se vede doar într-un grup cu un text lung (`data-lung`, pus de `rezervaExplicatii`), iar caseta își
    rezervă înălțimea textelor prescurtate cât e strâns: la treaptă, ~6 rânduri în loc de 11;
  - nota ordinii automate și notele dopului au „Mai mult” al lor (`TextScurt`, `src/ui/TextScurt.tsx`). Notele dopului spun acum
    întâi ce face varianta aleasă („Fără freză dreaptă, freza în V face tot…”, „Marginile semifabricatului rămân întregi…”):
    prima lor propoziție era fișierul dopului, aceeași la toate variantele, deci prescurtarea ar fi ascuns tocmai ce se schimbă.
- **Probele:** `test/e2e/export.privire.spec.ts` (bifele pe rândul etichetei, în `ceIese`, la fiecare tăietură; câmpurile
  fundului plat pe un rând; lista cu trei operații, în ordinea automată și în „A mea”, la 1280 × 720), `export.desene.spec.ts`
  (golurile Z0, bifa și cota supracursei; cotele frezei în V, cu trei diametre), `export.texte.spec.ts` (4: treapta cu „Mai
  mult” al grupului, supracursa, notele, engleza), `test/unit/export.textScurt.test.ts` (5, pe hârtie), `supracursa.spec.ts`
  (bifa ascunsă la 0); scrise întâi și văzute căzând. Două probe ale incrustației au prins nota dopului prescurtată greșit
  (`incrustatie.spec.ts`, `incrustatieBanda.spec.ts`), de unde ordinea nouă a notelor. E2e-ul care deschide exportul: 190 / 190.
- **Otrăvurile:** `28.8k.py`, 17 / 17 (lista, bifele, fundul plat, bifa la 0, golurile și cota Z0, freza în V, prescurtarea,
  caseta, „Mai mult” al grupului și al notelor). B02 din `12.1f-4.py`, mutată pe codul nou, scăpase: proba bifei ascunse din
  `supracursa.spec.ts` trecea înainte să apară fereastra (vine la cerere); acum așteaptă întâi câmpul supracursei, iar B02 e prinsă.
- **Mărimea:** pornirea +0 (111,6 kB), totalul +0,5 kB (919,2 / 1 000). Programul, documentul și serverul: neschimbate.

## Implementarea 28.8↑l (26.11)

Constatarea 13 a auditului. Programul rămâne octet cu octet: se schimbă doar focusul și ce aude un cititor de ecran.

- **Focusul adus de listă.** Un rând al listei (Enter sau clic) și „Du-mă la …” al unui refuz din calcul duc focusul pe titlul
  fișei (`<h3 tabindex="-1">`, nu o oprire a lui Tab), deci Tab merge apoi în câmpurile ei: de pe rândul dreptunghiului, un Tab,
  nu 19. „Du-mă la …” al greșelilor duce focusul pe câmpul greșit, ca înainte (28.8↑h-2); Rezultatul adus singur după export nu
  mută focusul (`du(cheie, cum)`, `cum` = `'titlu'`, `'repara'` sau nimic).
- **Ordinea grupului.** Titlul grupului (`h4`) e acum înaintea desenului și a explicației în DOM, deci cititorul îl spune întâi;
  așezarea rămâne a grilei (`grid-template-areas`: explicația în stânga, titlul și câmpurile în dreapta). Pe telefon, titlul stă
  deasupra explicației. Fișa doar de citit a finisării și a degroșării are aceeași ordine.
- **Descrierile.** Fiecare câmp al unui grup e descris (`aria-describedby`) de explicația întreagă a grupului (o copie
  ascunsă, `[data-descriere]`, și când pe ecran e prescurtată de 28.8↑k) și de greșelile grupului; legătura o pune pasul de după
  randare (`legaDescrierile`, `src/ui/exportRand.ts`, lângă `rezervaExplicatii`), fiindcă câmpurile stau în corpul scris de fișă.
  Id-urile vin din cheia grupului (`idDescriere`).
- **Anunțurile.** `aria-live` stă doar pe greșelile grupului (`[data-greseli]`, mereu prezent, ca o greșeală nouă să se anunțe),
  nu și pe explicații, care se schimbau la fiecare mutare a mausului și a focusului.
- **Telefonul culcat (găsit la 28.8↑h-2).** La 640 × 360, cu fontul lat, banda listei lăsa fișelor 80 px. Pe un ecran îngust și
  jos (`max-height: 30rem`), banda arată doar numele, pe un rând, tăiat cu „…” (fișa aleasă îl arată întreg în titlul ei), iar
  titlul ferestrei e mai strâns: fișelor le rămân 150 px.
- **Probele:** `test/e2e/export.tastatura.spec.ts` (2: Enter și clic pe rânduri, Tab în fișă, `tabindex`; ordinea titlului și locul
  lui deasupra câmpurilor, `aria-live`, descrierile cu explicația, cu greșeala pasului și cu explicația întreagă a treptei) și
  telefonul culcat în `export.privire.spec.ts`, scrise întâi și văzute căzând. E2e-ul care deschide exportul: 193 / 193.
- **Otrăvurile:** `28.8l.py`, 13 / 13 (focusul pe titlu de la listă, de la rânduri și de la mașină, `tabindex` lipsă, „Du-mă la …” pe
  titlu în loc de câmp, ordinea grupului, `aria-live` pe explicații și lipsă pe greșeli, descrierile lipsă, fără greșeli,
  prescurtate sau cu același id, numele benzii pe două rânduri). L06 (titlul mutat în coloana explicației) scăpase: ordinea din
  DOM rămânea bună, iar proba nu se uita la așezare; acum cere și titlul deasupra câmpurilor. E04 din `28.8b.py`, mutată pe
  efectul care leagă și descrierile, prinsă.
- **Mărimea:** pornirea +0 (111,6 kB), totalul +0,3 kB (919,5 / 1 000). Programul, documentul și serverul: neschimbate.

## Implementarea 28.8↑q (26.11)

Constatarea 18 a auditului, cu răspunsul 7a. Programul fiecărei foi rămâne cel al documentului doar cu ea (`doarFoaia`, ADR
0210 §5): fereastra schimbă doar ce arată și ce scrie în document la Exportă.

- **Grupele foilor** (`grupeFoi`, `src/model/foiExport.ts`, pură). Operațiile stau pe piesă, nu pe instanță: o piesă pusă pe
  mai multe foi (o copie legată a foii, plăcuțele din CSV) are aceleași operații pe toate. Rândurile ei stau deci o singură
  dată, la prima foaie pe care e pusă (în ordinea foilor, apoi a instanțelor), cu prima ei instanță de acolo; pe foile de
  după, piesa e „comună” cu foaia ei de început. O foaie fără nicio piesă e goală.
- **Rândurile tuturor foilor** (`ExportConectat.tsx`): construirea rândurilor unei foi e o funcție (`randuriFoii`), chemată
  pentru foaia activă, ca înainte, și pentru fiecare foaie, cu elementele ei în lume (`elementeFoaie`), descrierile ei, ordinea
  ei automată și grosimea ei. Cu mai multe foi, fereastra primește un getter (`toateFoile`) care le socotește abia când omul
  alege „Toate foile”, o singură dată pe document și pe limbă. Exportă scrie, cu „Toate foile”, operațiile tuturor pieselor
  puse pe foi; altfel, ale foii active, ca înainte.
- **Fereastra** (`DialogExport.tsx`): setul văzut e al alegerii. Cu „Foaia activă”, rândurile foii active, exact ca înainte.
  Cu „Toate foile”:
  - lista și fișele au capul fiecărei foi (`[data-foaie-lista]`, `[data-foaie-fise]`), cu nota pieselor comune („Și o operație
    a pieselor de pe Foaia 1 (o schimbi acolo)”; în „A mea”: „…se taie înaintea celor de aici”) și a foii fără piese;
  - rândurile celorlalte foi intră cu valorile din document; cele ale foii active își păstrează ce a scris omul (aceleași
    chei). Greșelile, „Pe toate (N)” și golul incrustației din desenul Z0 numără doar rândurile văzute: o greșeală pe altă
    foaie oprește doar „Toate foile”;
  - ordinea e foaie după foaie: rangurile pun în ordine fiecare foaie a ei (`ordineDinRanguriPeFoi`), numerele pornesc de la 1
    pe fiecare foaie, săgețile se opresc la marginea foii, iar o tragere pe altă foaie e refuzată (`mutaRand`). Rangurile se
    scriu pe toată lista, deci în ordinea fiecărui program. Rândurile legate și riscurile se socotesc pe foaie, cu numele ei în
    față („Foaia 1: Exteriorul din rândul 1…”);
  - fiecare rând își socotește „pe hârtie” cu grosimea foii lui (`OperatieExport.grosime`): o tăietură cât foaia de 18 a foii
    1 trece cu supracursa și când foaia activă are 12;
  - schimbarea alegerii scoate rezultatul de până atunci (era al celeilalte).
- **Rezultatul pe foi:** calculul „Toate foile” ține rezumatul (timpul pe operații și pe scule) al fiecărui program
  (`FoaieExportata.rezumat`) și însemnează foaia activă (`activa`). Sub Timpul, fiecare foaie are rezumatul ei, strâns sub
  numele ei (`[data-rezumat-foaie]`); al foii active, deschis. Simularea spune că e a foii active.
- **Pe telefon,** pe bandă, capul foii e doar numele ei, pe un rând; nota stă în capul din fișe.
- **Ce nu se judecă:** riscul unui exterior al unei piese comune (rândul ei e pe foaia de început) față de o piesă din
  interiorul lui pusă doar pe o foaie de după. Riscul e un avertisment, nu o regulă a programului.
- **Probele:** `test/unit/export.grupeFoi.test.ts` (3, pe hârtie), `ordineExport.test.ts` (+2: rangurile pe foi, despărțirea
  pe foi), `export.foi.test.ts` (rezumatul fiecărei foi = al foii exportate singure, foaia activă) și
  `test/e2e/export.toateFoile.spec.ts` (6: lista și fișele pe foi, cu piesa comună o dată și numerele pe foaie; o schimbare pe
  foaia 1 intră în document, iar arhiva are programul fiecărei foi exportate singure; rezultatul pe foi; greșeala pe altă foaie;
  „A mea” doar în foaie, cu săgețile, cu tragerea și cu riscul cu numele foii; banda de pe telefon; grosimea foii pe rând).
  Scrise după cod, deci probate cu otrăvurile. E2e-ul care deschide exportul: 377 / 377; unitarele, 10 734 / 0.
- **Otrăvurile:** `28.8q.py`, 17 / 17 (12 e2e, 5 unitare). Q12 (tragerea pe altă foaie) scăpase: pe o foaie cu un singur rând,
  rândul tras în ordinea întreagă se arăta tot pe foaia lui; pe o foaie cu două rânduri, tragerea celui de-al doilea i-ar fi
  schimbat ordinea. Proba trage acum al doilea rând al foii 2 pe foaia 1.
- **Mărimea:** pornirea +0 (111,6 kB), totalul +1,7 kB (921,1 / 1 000): bucata ferestrei (rândurile și capetele foilor,
  rezumatul pe foi) și `grupeFoi`. Programul, documentul (v30) și serverul: neschimbate.

## Implementarea 28.8↑p (26.11)

Lipsurile 1 și 2 ale auditului, cu răspunsul 3a. Mișcă mașina, deci s-a probat întâi pe oracole; fără valori, programul de
azi, octet cu octet.

- **Z-ul sigur** (`ParametriExport.zSigur`, mm deasupra feței de sus a foii): o setare a aplicației, ca supracursa, între 1 și
  100 mm, implicit 5 (`src/cam/regimExport.ts`, pur, citit și de fereastră). Exportul îl pune în regimul lucrării, al foii și al
  dopurilor (`dopurileFoii` primește regimul). Minimul de 1 mm: ciocănirea găuririi urcă rapid cu 1 mm peste fundul trecerii
  de dinainte (`RETRAGERE_PARTIALA`), deci un Z sigur mai mic ar strica ordinea mișcărilor. Traseul, timpul de lângă el și
  vederea 3D rămân la 5 mm, ca la supracursă.
- **Parcarea** (`ParametriExport.parcare`): un punct în coordonatele PROGRAMULUI (față de XY0, cum îl arată mașina), cel mult
  10 000 mm pe fiecare axă. Postul (`OptiuniPost.parcare`) o scrie ca `G0 X Y` după `M5`, înaintea liniilor de final ale
  contractului: freza e deja sus, la Z-ul sigur, iar axul se oprește înainte ca mașina să plece. Nu trece prin montaj (e deja
  în coordonatele programului), doar prin unitate și zecimale. Fiecare fișier o are: pe freză, ale dopurilor, ale foilor.
  Fereastra: „Rămâne sus” (implicit, fără linie), „La XY0” (punctul (0, 0)) și „Într-un punct” (X și Y, cu semn).
- **Valorile frezei scrise de mână** (`Rand.regimMana`, `SculaOperatie.regim`): pe „Scrisă de mână”, grupul Freza are turația,
  avansul și plonjarea. Un câmp gol ia valoarea lucrării (18 000, 1 000, 300); toate goale = fără `regim` (programul de azi);
  cu unul scris, Exportă le scrie pe toate trei în `scula.regim` (v27, fără schemă nouă), prin `cuOrigine`, la locul lor dacă
  documentul le avea. Marginile, ale ușii documentului: turația un întreg în [1, 100 000], avansul și plonjarea în
  (0, 100 000]. O freză din bibliotecă își păstrează valorile ei; câmpurile apar doar fără origine. Deschisă din nou, fereastra
  le citește din document (`ExportConectat`). Regula numerelor T (`frezeRanduri`) știe turația scrisă de mână.
  Câmpurile stau într-un rând strâns (`details`), chiar sub lista „Din frezele mele”, cu un rezumat al valorilor folosite („ale
  lucrării (18.000 rot/min, 1.000 și 300 mm/min)”, cele scrise, sau „o valoare e greșită”). La vedere, sub formă, depărtau
  diametrul de greșeala de sub el: pe telefonul culcat (844 × 390, coloana câmpurilor de 210 px), cele trei câmpuri țineau
  181 px, iar „Du-mă la …” nu mai putea aduce în panou (177 px) și câmpul, și greșeala (proba din 28.8↑h-2 a căzut). „Du-mă la
  …” desface rândul când câmpul greșit e în el. Recunoașterea „Scrisă de mână (ca „…”)” (`stareOrigine`, 16.A↑b-4) cere,
  cu valori scrise, aceleași valori și frezei din bibliotecă (una fără ele contează cu cele ale lucrării); fără valori scrise,
  ca înainte (semnalat de linia frezelor).
- **Fereastra:** grupul nou `aer` („Z-ul sigur și parcarea”), în „Mașina și fișierul”, între schimbarea frezei și setări, cu
  cartonașele parcării; câmpurile frezei în grupul ei. O valoare greșită oprește Exportă, cu greșeala în grupul ei și punctul
  pe rândul fișei. Nota `export.regim` nu mai spune Z-ul sigur.
- **Senderul și antetul:** antetul nu se schimbă (senderul citește din el doar originea și Z0); programul cu parcarea se
  încarcă și rulează pe emulatorul GRBL fără pierderi, oprindu-se în punctul de parcare, la Z-ul sigur.
- **Probele** (scrise înaintea codului): `test/unit/export.zSigur.oracol.test.ts` (8: fără valori, octet cu octet, pe tot
  corpusul; Z-ul sigur schimbă doar cuvântul lui, pe tot corpusul și pe toate cele opt posturi, în mm și în inch, cu Z0 sus și
  jos; parcarea, o linie după `M5`, în fiecare fișier și în dopuri; poarta, cu verdictele de azi și cu martorul unei parcări sub
  fața foii; oracolul simulării, aceeași suprafață tăiată, celulă cu celulă; senderul și emulatorul GRBL, oprit în punctul de
  parcare; marginile), `test/unit/export.regimMana.test.ts` (6) și `test/e2e/export.regimZ.spec.ts` (2), plus proba privirii.
  Rapidul, 10 765 / 0; e2e-ul exportului, 379 / 379. Primul complet al ramurii a căzut la proba vitezei (28.8↑i): la
  1280 × 2400, marginea ferestrei fișelor ajunge dincolo de vecine doar cât o fișă e mai scundă decât panoul, iar rândul
  valorilor scrise de mână (36 px) a dus fișa (~2 230 px) peste panou (2 243 px) pe Linux. Proba merge acum la 1280 × 3200,
  cu condiția spusă înaintea aserțiunii.
- **Otrăvurile:** `28.8p.py`, 29 / 29 (21 unitare, 8 e2e).
- **Mărimea:** pornirea +0 (111,6 kB), totalul +1,8 kB (922,9 / 1 000). Documentul (v30) și serverul: neschimbate.
- **Rămâne a owner-ului:** proba pe mașină, întâi în aer (un Z sigur nou, o parcare în afara foii).
