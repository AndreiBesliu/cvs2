# ADR 0113: Instanțele fonturilor variabile (felia 7.4↑)

**Starea:** acceptat pe 31.10.2026, la felia 7.4↑ (adusă din etapa 7), după ADR 0108. **Completează:** ADR 0105 (textul și
fonturile), ADR 0106 (fonturile omului: id-urile, biblioteca, fonturile sistemului). **Schimbă:** ADR 0106 §1 (o instanță
alta decât cea implicită nu mai e refuzată; CFF2 se citește) și §2 (id-ul `f:` primește instanța; plafonul fețelor nu
numără instanțele).

**Problema.** Un font variabil se citea doar în instanța lui implicită (ADR 0106 §1), iar `CLAUDE.md` lăsa pentru etapa 7
„instanțele fonturilor variabile”. Sistemul dă instanțele numite ca fețe separate (Bahnschrift SemiBold, Segoe UI Variable
Display), cu fișierul fontului variabil întreg: panoul le refuza („deocamdată se citește doar instanța lui implicită”). Un
font variabil încărcat (Roboto Flex, familiile variabile ale Google Fonts luate ca fișier) dădea o singură față, cea
implicită, iar unul cu contururi CFF2 era refuzat.

## Decizia

1. **Coordonatele** (`src/text/variatii.ts`): cele ale omului, în unitățile axelor din `fvar` (o axă lipsă: valoarea ei
   implicită), se taie la marginile axei, se aduc la −1…0…1 față de implicit, trec prin harta `avar` (versiunea 1: liniar
   între perechi, mutate în afara lor) și se rotunjesc la F2Dot14 o singură dată, după hartă, ca instancer-ul lui fontTools.
   `avar` 2 (variațiile hărții) se refuză cu motiv (`variatii`), fontul implicit rămâne.
2. **Contururile, din `gvar`:** fiecare tuplu al glifei, cu vârful lui (comun sau din antet) și regiunea intermediară, dacă
   are; factorul lui e produsul factorilor axelor, ca în specificație (o axă cu vârful 0, cu regiunea greșită sau peste zero
   nu contează). Punctele tuplului: toate, cele comune ale glifei sau ale lui; deltele împachetate (zero, octeți, cuvinte, 32
   de biți). Punctele fără deltă ale unui contur se interpolează din vecinii cu deltă (IUP, ca `iup_delta`). La o glifă
   compusă, „punctele” sunt deplasările componentelor (deplasarea scalată, felul Apple, se scalează după delte), iar o
   componentă pusă pe puncte urmează punctele variate ale glifelor (deltele ei nu contează). După puncte vin cele 4 fantomă.
3. **Avansul:** din `HVAR` (cu harta indicilor, dacă are), cel implicit plus delta, rotunjit: sursa motoarelor de text
   (HarfBuzz, FreeType) și a lui `VarStoreInstancer`. Fără `HVAR`, din punctele fantomă, cu aritmetica instancer-ului
   (punctul din stânga la xMin − lsb, cel din dreapta cu avansul mai încolo, fiecare cu delta lui; distanța, rotunjită).
4. **Crenarea:** la o pereche cu dispozitiv (`XAdvDevice`), un tabel `VariationIndex` trimite în magazinul de variații din
   GDEF; delta, rotunjită, se adaugă la XAdvance, ca la fontTools. Offsetul dispozitivului e de la tabelul care ține perechea
   (setul ei, la formatul 1; subtabelul, la formatul 2). Dispozitivele de hinting (formatele 1–3) nu contează.
5. **Majuscula:** vârful lui H la instanță; fără H, `sCapHeight` plus `cpht` din `MVAR`. Rândurile (`hhea`) nu variază:
   `MVAR` n-are etichete pentru urcarea, coborârea și spațiul din `hhea` (`hasc` și celelalte sunt ale lui `OS/2`).
6. **CFF2 se citește** (`src/text/cff.ts`): antetul, Top DICT fără indexurile numelor și ale șirurilor, indexurile cu numărul
   pe 32 de biți, FDArray (FDSelect lipsă: primul dicționar; formatele 0, 3 și 4), magazinul de variații (`vstore`).
   Charstring-urile n-au lățime; `vsindex` (în Private sau în charstring) alege setul de date, iar `blend` adună fiecărei
   valori deltele ei înmulțite cu factorii regiunilor setului (ca `blend`-ul lui fontTools); la instanța implicită rămân
   valorile. Interpretorul Type 2 e comun lui CFF și CFF2.
7. **Instanțele numite sunt fețe separate:**
   - **încărcate:** id-ul e `f:<amprenta>[.<fața>]@<indicele din fvar>` (fișierul e fixat de amprentă, deci indicele ajunge;
     fără `@`: fața, adică instanța implicită). Fiecare instanță numită, afară de cele la coordonatele implicite (sunt fața
     însăși), e o intrare a „Fonturilor mele”, cel mult 64 pe față, nenumărate printre cele 100 de fețe. Ștearsă, pleacă doar
     ea (fișierul rămâne cât îl folosește o intrare); fișierul încărcat din nou adaugă instanțele care lipsesc;
   - **ale sistemului:** sistemul le dă ca fețe separate, cu fișierul întreg; `s:<numele PostScript>` se citește la instanța
     găsită după numele PostScript sau cel complet (un nume nerecunoscut: fontul, ca în ADR 0106 §1);
   - **Google Fonts** dă fiecare variantă ca font fix (CSS API v2, ADR 0106 §5): neschimbat.
   Blocul textului ține id-ul și numele („Roboto Flex Bold”), deci textul se redeschide editabil, la aceeași instanță.
8. **Interfața:** nimic nou de apăsat. În fereastra fonturilor, rândul unei instanțe spune „stil al fontului variabil” în loc
   de mărimea fișierului; mesajul refuzului instanțelor și cel al CFF2 pleacă; unul nou pentru `avar` 2. Manualul (ro, en)
   spune instanțele.

## Cifrele (măsurate, gzip 9)

| | Înainte (`4307ea0`) | După (7.4↑) |
|---|---|---|
| Pornirea (cu ușa) | 97,6 (101,1) / 110 kB | 97,6 (101,1) / 110 kB |
| Totalul JavaScript | 414,8 / 450 kB | 418,5 / 450 kB |
| Precache | 79 de fișiere, 566,0 kB | 79 de fișiere, 569,6 kB |

Totul în modulul textului, la cerere. `CLAUDE.md` scria pentru 5.8↑ pornirea 97,5 (101,0) și totalul 414,4, măsurate pe
ramura ei; pe `main` (cu 14.B↑b unit), baza e cea din tabel.

## Probele

- **Oracolul Python** (`test/oracles-py/text_corpus.py`, fontTools 4.67), cu fonturi libere de pe mașina asta, din
  fonturile de previzualizare ale lui Android Studio:
  - **Roboto Flex** (OFL, 13 axe, 20 de instanțe numite fără nume PostScript, `avar`, `gvar`, `HVAR`, `MVAR`, crenarea
    variabilă), subsetat, și trei variante: fără `HVAR` și fără H, cu o deltă pe punctul fantomă din stânga al lui A; cu
    căciula lui Ă pusă pe puncte (și delte mari pe ea, care nu contează), cu cea a lui Â 2 × 2 și deplasarea scalată, cu delte
    noi, și `gvar` cu offseturi lungi;
  - **Noto Sans CJK JP** (OFL, CFF2 variabil, `avar`, patru FD-uri), subsetat, și un **CFF2 scris de mână** (`blend` cu două
    valori pe două regiuni, `vsindex` în Private și în charstring, subrutine locale diferite în două FD-uri, FDSelect 4);
  - **50 de locuri:** toate instanțele numite (20, 6 și una), colțurile (fiecare axă la margini, apoi toate odată), `avar`
    (opsz 30; opsz 36 cu wght 650; Medium al CJK), regiunile intermediare dincolo de vârf (opsz 72, wght 850), un amestec;
  - **valorile:** instancer-ul (`instantiateVariableFont`, toate axele fixate, fontul ținut în memorie, deci contururile
    nerotunjite; crenarea, metricile), avansul din `HVAR` cu `VarStoreInstancer`, contururile CFF2 din pen-ul lui fontTools
    la aceleași coordonate normalizate (`blend`-urile evaluate de el);
  - **pe hârtie, acolo:** la implicit, fontul neschimbat; opsz 30 pe harta `avar` (și altfel fără ea); Bold = wght 0,5;
    regiunea intermediară dincolo de vârf; H mai lat cu grosimea; „AV” anulat la Thin; căciula pe vârful lui A; deplasarea
    scalată; punctul fantomă din stânga; punctele amestecate ale CFF2-ului de mână; variantele au ce promit, citite din
    octeții lui `gvar` (vârfurile comune și din antet, regiunile intermediare, punctele comune și proprii, toate sau unele,
    deltele pe octet, pe cuvânt și zero, offseturile lungi).
- **Probele unitare** (`test/unit/text.variabil.test.ts`): la fiecare loc, contururile brute sub 1e-9 unități, avansurile,
  crenarea fiecărei perechi a setului și metricile exact, coordonatele normalizate exact; axele și instanțele; instanța
  implicită = fontul fără instanță; marginile axelor; refuzurile (o instanță care nu există, `avar` 2, `gvar` cu alt număr de
  axe); un dispozitiv de hinting; așezarea la o instanță; pe octeți scriși de mână: punctele și deltele împachetate, factorul
  regiunilor, IUP, magazinul de variații (și cu deltele lungi), harta indicilor, normalizarea cu `avar`. În
  `text.surse.test.ts`: id-urile cu instanța, dus-întors; instanța cerută de un nume al sistemului; instanțele ca fețe;
  plafonul. În `text.font.test.ts`: Inter convertit în CFF2 dă glifele lui Inter; `fvar` fără `gvar` lasă contururile.
- **E2e** (`test/e2e/fonturi.spec.ts`, Edge): Roboto Flex încărcat dă 20 de fețe, în ordinea din font, cu id-urile lor;
  proba lui Bold e alta decât a feței; textul scris cu „Roboto Flex Bold” are H lat cât la fontTools (sub 1e-6 mm), iar
  după reîncărcare se editează (înălțimea 25) tot la Bold; fonturile sistemului printr-un `queryLocalFonts` de probă:
  Regular și Bold ca fețe separate, cu fișierul întreg, iar Bold se citește la instanța lui (H, ca la fontTools).
- **Mutațiile:** 50, pe probele unitare: 46 prinse. Întâi au trecut 12. Opt cereau date noi (locuri și fonturi noi):
  regiunea intermediară dincolo de vârf, un dispozitiv de hinting, delta punctului fantomă din stânga, iar în CFF2 `blend`
  cu mai multe valori și regiuni, `vsindex` (în Private și în charstring), dicționarele cu subrutine diferite și FDSelect 4.
  Una e VOID (IUP pe punctele fantomă, cod mort, scos); trei sunt echivalente: un punct în afara glifei (scrierea în afara
  tabloului e ignorată oricum), lățimea în CFF2 (un CFF2 valid n-o are) și valorile amestecate dintr-un DICT (nu se citesc).

## Ce am găsit pe drum

- **`HVAR` și punctele fantomă diferă** cu 1 unitate în Roboto Flex, la 4 din 1 672 de perechi glifă × loc (O și R la opsz 36
  cu wght 650; rotunjirile fontului). Instancer-ul ia punctele fantomă; aplicația, ca motoarele de text, `HVAR`.
- **Dispozitivul unei perechi anume** (PairPos 1) e de la setul ei, nu de la subtabel: prima citire lua alt tabel (7, 0 în
  loc de 46, 4) și crenarea nu varia. Proba pe fontTools a prins-o.
- **Instancer-ul lui fontTools cade** pe o glifă CFF2 al cărei Private alege setul de date 1 (eroare în specializator);
  pen-ul ei o desenează corect. Pentru fontul de mână, oracolul ia contururile din pen și metricile fontului neinstanțiat
  (n-are `HVAR`, `MVAR`, GPOS).
- **Normalizarea lui fontTools** rotunjește la F2Dot14 doar după `avar` (specificația și înainte), iar instancer-ul aruncă
  tuplurile cu regiunea greșită (specificația ignoră axa); aplicația urmează fontTools la prima, specificația la a doua (niciun
  font real n-are așa regiuni).
- **Componentele lui Roboto Flex** sunt deplasate, nu puse pe puncte: fontTools păstrează în `GlyphComponent.flags` doar
  steagurile fără înțeles structural (prima sondă le citea greșit).
- În Roboto Flex, crenarea „AV” dispare la Thin și ExtraBlack: delta ei (+87) anulează valoarea implicită.

## Ce am respins

- **Coordonatele în id** (`@wght=700,…`): cele 13 axe ale lui Roboto Flex trec de 128 de caractere; amprenta fixează
  fișierul, deci indicele instanței ajunge. Cititorul primește și coordonate oarecare (probele le folosesc): un stil ales din
  glisoare e o felie a lui.
- **Contururile rotunjite** la unități întregi (ca o instanță fixă salvată): rămân nerotunjite, ca la rasterizatoare;
  avansurile și crenarea se rotunjesc, ca la fontTools.
- **Avansul din punctele fantomă și când fontul are `HVAR`** (ca instancer-ul): motoarele de text iau `HVAR`.
- **Instanțele sistemului desfăcute de aplicație:** sistemul le dă deja; ca să le găsească singură, aplicația ar citi fiecare
  font instalat.
- **O singură intrare pe față, cu instanțele calculate la listare:** ștergerea unei instanțe și reîncărcarea fișierului merg
  mai simplu cu intrări separate.

## Limite și neprobat

- **Variațiile caracteristicilor din GSUB** (`rvrn`, ca dolarul lui Roboto Flex la grosimile mari) nu se aplică: GSUB nu se
  aplică deloc (ADR 0019).
- **`avar` 2** se refuză; din `MVAR` contează doar `cpht`; `VVAR` și metricile verticale, nu; `cvar` (hinting-ul), ignorat.
- **Numele instanțelor** vin din `fvar` (`subfamilyNameID`), nu din `STAT`.
- **Doar instanțele numite** se aleg în interfață; coordonatele oarecare, doar în cod.
- **Fonturile sistemului** cer ca sistemul să-și listeze instanțele (Windows o face); un nume nerecunoscut dă fontul (fața
  implicită), ca în ADR 0106.
- **Fonturile variabile încărcate înainte de 7.4↑** au doar fața; încărcate din nou, își primesc instanțele.
- **Cel mult 64 de instanțe numite** pe față.

## Se redeschide dacă

- owner-ul cere un stil oarecare al unui font variabil (de exemplu wght 650, din glisoare): id-ul cu coordonate;
- apare un font cu `avar` 2 sau cu variațiile caracteristicilor de care textul are nevoie;
- un font variabil real iese altfel decât în programul care l-a scris.
