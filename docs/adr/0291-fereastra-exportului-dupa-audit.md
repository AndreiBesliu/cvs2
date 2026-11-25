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
- **Otrăvurile:** `28.8h.py`, 21 / 21 (11 unitare, 10 e2e). Două din `12.1f-4.py` (F01, F02), care mutau regula din
  `cuTaieturiPrinFoaie`, țintesc acum `catFoaia`; prinse.
- **Mărimea:** pornirea +0 (111,2 kB), totalul +1,4 kB (891,7 / 1 000); bucata ferestrei +1,1 kB gzip (elicea desenată,
  greșeala găuririi, textele, modulele mici ale lucrării). Estimarea din tabel (kB ±0) nu socotise desenul elicei.
