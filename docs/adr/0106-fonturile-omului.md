# ADR 0106: Fonturile omului: încărcate, ale sistemului, din Google Fonts (felia 7.2↑)

**Starea:** acceptat pe 29.10.2026, la felia 7.2↑ (adusă din etapa 7), după ADR 0105. **Completează:** ADR 0105 (textul și
fonturile), T17 (ADR 0017: CSP-ul), ADR 0039 (funcțiile `cncvs2`), ADR 0043 (App Check). **Schimbă:** ADR 0105 §1
(înălțimea majusculei nu mai e o verificare a lui `sCapHeight`: e vârful lui H) și politica CSP (`connect-src` primește
`fonts.gstatic.com`).

**Problema.** Cererea owner-ului: „Fonturile mele, si vreau sa se foloseasca fonturile sistemului, dar si cu posibilitatea
de descarcare din google fonts”. Textul avea doar Roboto și Droid Serif. Sondajul fonturilor de pe mașina asta (566 de fețe)
arăta ce cer fonturile reale în plus față de cititorul din 7.1↑: 52 sunt CFF (OpenType `.otf`, 2 dintre ele CID, ca Source
Han), 15 sunt colecții TTC, 6 sunt variabile, 296 au tabelul `kern` vechi (180 fără `GPOS`), 81 au căutările de crenare ca
Extension, 296 n-au `sCapHeight` și 11 n-au o hartă Unicode. Cu regula din 7.1↑, 77 de fețe ar fi fost refuzate, fiindcă
`sCapHeight` diferă de vârful lui H (Candara: 1308 / 1302 unități; Gabriola: 2286 / 2307; HarmonyOS: 700 / 732).

## Decizia

1. **Cititorul crește pentru fonturile reale** (`src/text/font.ts`, `sfnt.ts`, `cff.ts`):
   - **CFF** (`cff.ts`): indexurile (offseturi pe 1–4 octeți), DICT-urile (și numerele reale), Top DICT și Private, fonturile
     CID (FDArray, FDSelect 0 și 3, subrutinele fiecărui FD) și interpretorul Type 2: mutările, liniile, toate cubicele
     scurte, cele patru flex-uri, subrutinele locale și globale cu decalajul după numărul lor (107, 1 131, 32 768),
     sugestiile sărite cu octeții măștii numărați, lățimea din fața primului operator care golește stiva, `endchar` cu
     accentul compus (`seac`, după StandardEncoding), `dotsection` ignorat; aritmetica (scoasă din specificație,
     neimplementată nici de fontTools) face glifa stricată. Cubicele trec în așezare cum sunt. Matricea fontului e scara
     1/unitsPerEm (Inter o scrie rotunjit, 0.00035511 pentru 1/2816: o abatere sub o miime e scara 1), altfel o scară
     curată aplicată; înclinată, refuzată;
   - **colecțiile TTC**: fiecare față, cu directorul ei; numele fețelor din `name` (familia și stilul tipografice, numele
     complet și cel PostScript);
   - **`cmap`**: formatele 4, 6 și 12, subtabelul ales în ordinea lui fontTools (3/10, 0/6, 0/4, 3/1, 0/3…); un font simbol
     (Windows 3/0, ca Wingdings) își caută caracterele și la U+F000 + cod, ca Windows;
   - **crenarea**: din `GPOS` și prin căutările Extension (tipul 9); fără crenare în `GPOS`, din tabelul `kern` vechi
     (subtabelele orizontale de formatul 0, cu antet Microsoft sau Apple, valorile adunate, „override” înlocuiește). Perechile
     se citesc într-o hartă, nu prin căutare binară: Elephant (Windows) le are ordonate după glifa din dreapta; lungimea unui
     subtabel de formatul 0 se calculează din numărul perechilor (cea pe 16 biți se rupe la tabelele mari);
   - **înălțimea majusculei = vârful lui H** (ce se taie); fără H, `sCapHeight`; fără niciuna, refuzul `majuscula`;
   - **fonturile variabile** se citesc în instanța implicită; instanțele numite (`fvar`: stilul, numele PostScript, dacă e
     la coordonatele implicite) se știu, ca un font al sistemului cerut într-o altă instanță să fie refuzat
     (`instanta-variabila`), nu desenat greșit. CFF2 e refuzat;
   - **WOFF 1.0** se despachetează (`woff.ts`, `DecompressionStream`, tabelele ordonate și aliniate); **WOFF2** e refuzat cu
     motiv (Brotli și tabelele transformate).
2. **Id-ul fontului din bloc spune cum se găsește din nou** (`src/text/iduriFont.ts`): `roboto` / `droid-serif` (incluse),
   `f:<amprenta>[.<fața>]` (încărcat: primele 16 cifre hex ale SHA-256 al fișierului, deci același fișier încărcat oriunde
   e același font), `g:<familia>:<varianta>` (Google Fonts: se descarcă din nou), `s:<numele PostScript>` (al sistemului: se
   caută după nume). Blocul primește și `numeFont` (cât să se poată spune „Fontul «X» nu e aici”); id-ul are până la 128 de
   caractere. Nu e o schemă nouă: blocul e un câmp păstrat (ADR 0105 §4).
3. **„Fonturile mele”** (`src/text/biblioteca.ts`): o bază IndexedDB separată (`cncvs2-fonturi`), fișierul ținut o dată după
   amprentă, fiecare față o intrare (o colecție dă mai multe). Plafoanele: 40 MB pe fișier, 100 de fețe, 300 MB în total.
   Nimic nu pleacă din browser; merg și fără rețea. Un font șters lasă textele făcute cu el (contururile sunt în piesă), dar
   ele nu se mai editează aici până nu e încărcat din nou.
4. **Fonturile sistemului** (`src/text/sistem.ts`): Local Font Access (`queryLocalFonts`, Chrome și Edge pe calculator),
   cu permisiunea `local-fonts` cerută din clicul omului (în fereastra fonturilor). Nu se copiază nimic: la editare, fontul
   se caută din nou după numele PostScript (o colecție vine întreagă: fața se alege după nume). Pe alt calculator, unde
   fontul nu e instalat, textul nu se editează, dar se taie.
5. **Google Fonts, fără cheie API**: funcția `fonturiGoogle` (callable, App Check impus, `europe-central2`) citește
   catalogul din metadatele publice ale site-ului (`fonts.google.com/metadata/fonts`: familia, categoria, variantele,
   `latin-ext`, popularitatea; doar fonturile libere) și adresa fișierului din CSS API v2, cerut cu un agent vechi
   (`Mozilla/4.0`), care primește un singur TTF întreg pe variantă (static și pentru familiile variabile), pe
   `fonts.gstatic.com`. Browserul nu poate face asta singur: metadatele n-au CORS, iar CSS-ul îi dă WOFF2 tăiat pe
   alfabete. Fișierul îl descarcă browserul direct de pe gstatic (CORS deschis, `connect-src` în CSP), apoi intră în
   „Fonturile mele”; pe alt calculator, „Descarcă din nou”. Funcția ține catalogul 6 ore și adresele găsite; contractul
   (cererea, catalogul, adresele) e în `shared/fonturiGoogle.ts`, comun funcției și clientului.
6. **Interfața**: lista fonturilor din panou are trei grupuri (incluse, „Fonturile mele”, ale sistemului); sub câmpuri,
   **previzualizarea** textului cum se va tăia; **Fonturi…** deschide fereastra fonturilor (la cerere, cu filele „Fonturile
   mele”, Google Fonts și „Ale sistemului”); un font care lipsește se spune („nu e pe calculatorul ăsta”, „permite
   accesul”, „instanța unui font variabil”), iar unul Google se descarcă din nou dintr-un clic. Clientul Firebase al
   fonturilor Google (`src/cloud/apelFonturiGoogle.ts`) vine prin `import()`, ca raportorul.

## Cifrele (măsurate, gzip 9)

| | Înainte (7.1↑) | După (7.2↑) |
|---|---|---|
| Pornirea (cu ușa) | 97,4 (100,9) / 110 kB | 97,4 (100,9) / 110 kB |
| Totalul JavaScript | 358,6 / 400 kB | 370,5 / 400 kB |
| Precache | 80 de fișiere, 501,7 kB | 83 de fișiere, 517,7 kB |

## Probele

- **Fonturile reale** (local, fiindcă fonturile Windows nu se pot pune în repo; `.tmp/sonda_fonturi_sistem.py` +
  `.tmp/sonda-fonturi-sistem.ts`): din cele 566 de fețe de pe mașina asta, 557 se citesc și ies **identic cu fontTools**
  (52 CFF, dintre care 2 CID, și 505 TrueType): glifele unui text de 70 de caractere, avansurile, contururile brute (sub
  1e-9 unități), crenarea fiecărei perechi, majuscula. Restul: 3 refuzate la fel de amândouă (fonturi simbol fără H și fără
  `sCapHeight`), 1 Shift-JIS (fără hartă Unicode), 1 care nu e font; 5 pe care fontTools nu le poate citi (un `cmap` 4 cu
  un offset în afara tabelului), aplicația le citește. Găsite pe drum: perechile `kern` neordonate ale lui Elephant, cele 77
  de majuscule, matricea rotunjită a lui Inter.
- **Fonturile din Google**: catalogul real (1 959 de familii, 1 535 cu `latin-ext`) și TTF-uri reale (Roboto Bold Italic,
  Lobster, Open Sans Light) citite și așezate; instanțele statice ale familiilor variabile au contururi suprapuse,
  normalizate din `nonzero` (ADR 0036).
- **Corpusul independent** (`test/oracles-py/text_corpus.py`, fontTools 4.67), lărgit: 20 de așezări (+10: Inter CFF cu
  subrutine și sugestii, CFF-ul scris de mână, `kern` Microsoft neordonat cu override, `kern` Apple, Extension, `cmap` 12
  peste un 3/1 care minte, `cmap` 6, simbolul), 84 de glife brute (Inter, Source Han CID, cel scris de mână: `seac`, cele
  patru flex-uri, toate cubicele scurte, sugestiile cu mască pe doi octeți, `dotsection`, lățimile, subrutinele cu toate
  cele trei decalaje și offseturi pe 3 octeți, punctele izolate), crenarea fiecărei perechi în 9 fonturi și variante
  (și `kern` lângă GPOS, și o lungime `kern` ruptă). Subseturile Inter și Source Han (OFL) sunt făcute din fonturile de pe
  mașina asta, fără descărcări; fixturile ies la fel la fiecare generare (fără marca de timp).
- **Probele țintite** (`test/unit/text.font.test.ts`, `text.surse.test.ts`): refuzurile (CFF2, WOFF, WOFF2, fața lipsă,
  tabelele lipsă, CFF tăiat), majuscula din H, colecția, `cmap`, instanțele, WOFF despachetat ca TTF-ul lui (ordonat,
  aliniat), id-urile dus-întors, fețele unui fișier, fața după nume, plafoanele, amprenta (SHA-256 al lui „abc”).
- **Google** (`test/unit/fonturiGoogle.test.ts`): contractul (cererea, catalogul din metadate, adresele), funcția (memoria
  de 6 ore, catalogul vechi la o eroare, agentul vechi, adresele ținute, motivele), clientul (doar gstatic, plafonul).
- **E2e** (`test/e2e/fonturi.spec.ts`, Edge): o colecție TTC încărcată (două fețe), textul cu fața a doua (id-ul, numele),
  după reîncărcare tot editabil, apoi fontul șters (textul rămâne, panoul spune că lipsește); fonturile sistemului printr-un
  `queryLocalFonts` de probă (permisiunea din clic, lista în panou, instanța Bold a unui font variabil refuzată);
  refuzurile (WOFF2, un PNG), WOFF primit, același font de două ori, Google Fonts fără server.
- **Mutațiile:** 74 / 74 (65 pe probele unitare, 9 pe e2e, controlul verde înainte și după); 6 au trecut întâi: FDSelect în formatul 3 (fixtura CID avea formatul 0), octeții de după un `cmap` 6 (erau zero), subtabelele `kern` cross-stream și „minimum” (aveau doar perechi acoperite de override), un WOFF cu directorul neordonat, un font încărcat a doua oară spus „adăugat”: probe noi; a șasea, o verificare redundantă a feței (`< 1024` după trei cifre), scoasă.

## Ce am respins

- **Developer API cu o cheie:** cere o cheie (în client, publică în repo, sau ca secret al funcției, pusă de owner);
  măsurat: fără cheie, „unregistered callers”, iar contul CLI-ului nu e primit ca identitate. Metadatele publice și CSS API
  merg fără nimic; dacă metadatele își schimbă forma, catalogul se refuză curat și se trece pe cheie.
- **Fontsource** (oglinda Google Fonts pe jsDelivr): fișierele sunt tăiate pe alfabete (latin, latin-ext), deci crenarea
  dintre „T” și „ă” s-ar pierde.
- **WOFF2 acum:** Brotli (dicționarul are ~120 kB) și tabelele transformate; se cere TTF / OTF.
- **Fontul pus în proiect:** licențele (unele fonturi interzic includerea în documente) și mărimea proiectului; contururile
  sunt oricum în piesă.
- **Instanțele fonturilor variabile acum** (`gvar`, `avar`, `HVAR`, `MVAR`, crenarea variabilă): o felie a lor; pe mașina
  asta, 6 fonturi (Bahnschrift, Segoe UI Variable, Cascadia, Sitka).

## Limite și neprobat

- **Instanțele fonturilor variabile** (alta decât cea implicită) se refuză; WOFF2, CFF2, `cmap` 0, 2, 13, 14, fonturile doar
  Mac Roman sau Shift-JIS, la fel.
- **Fonturile sistemului** merg doar în Chrome și Edge, pe calculator; în Firefox și Safari se încarcă fișierul.
- **Biblioteca e a browserului**, nu a contului: pe alt calculator se încarcă din nou (sau se descarcă din nou, din Google).
  Un font al sistemului, de altă versiune pe alt calculator, poate da contururi puțin altfel la o editare.
- **Catalogul Google** vine dintr-o adresă nedocumentată a site-ului; funcția a fost probată pe Google adevărat local și
  pe instanța de test.
- **`GSUB`** (ligaturile, formele contextuale) tot nu se aplică (ADR 0019).

## Se redeschide dacă

- metadatele Google Fonts își schimbă forma (catalogul se refuză): Developer API, cu o cheie ținută de funcție;
- un font real iese altfel decât în programul care l-a scris;
- owner-ul cere stilurile unui font variabil al sistemului (felia instanțelor);
- „Fonturile mele” trebuie să meargă cu contul, pe orice calculator.
