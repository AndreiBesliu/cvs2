# ADR 0105: Textul și fonturile (felia 7.1↑)

**Starea:** acceptat pe 29.10.2026, la felia 7.1↑ (adusă din etapa 7), după ADR 0104. **Completează:** T19 (ADR 0019:
înălțimea textului e înălțimea majusculei, verificată pe H), T3 (ADR 0003, ADR 0036: fonturile `nonzero` se normalizează o
dată, la intrare), T1 (ADR 0001: pătraticele devin cubice exact) și uneltele de desen (ADR 0051–0053). **Schimbă:** lista
uneltelor (Text, tasta X) și politica precache-ului (`fonturi/`).

**Problema.** Rândul de prag „Text, text pe cale, fonturi” (v1) era „de făcut”. Criteriul din cercetare: textul „LEMN” de
20 mm are majusculele de 20,00 mm (± 0,05); ă â î ș ț (ș și ț cu virgulă) apar corect; după salvare și redeschidere, blocul se
editează (text, font, mărime) fără pierderi; pe un cerc R50, textul ocupă 314,16 mm de arc; un font cu o singură linie dă
numai vectori deschiși. Ediția întâi lua „20 mm” drept corpul em (literele ieșeau de 14,61 mm) și pierdea fonturile încărcate
la reîncărcare.

## Decizia

1. **Cititorul de fonturi e propriu** (`src/text/font.ts`): TrueType (`glyf`), cu `head`, `maxp`, `hhea`, `hmtx`, `cmap`
   formatul 4, `loca` scurt și lung, glifele simple și compuse (transformarea fiecărei componente: scara, scara pe X și Y,
   2 × 2; deplasarea după transformare, ca fontTools, sau înainte, cu SCALED_COMPONENT_OFFSET; componenta pusă pe puncte),
   `OS/2` și crenarea din `GPOS` (perechile caracteristicii `kern`, formatele 1 și 2; în fiecare căutare, primul subtabel
   care potrivește perechea). opentype.js (ales de sonda s2) are ~170 kB și aduce scrierea fonturilor și modelarea completă,
   iar totalul aplicației mai avea ~50 kB. Literele se pun una după alta, fără `GSUB` (ADR 0019: rezerva literă cu literă).
   Un fișier greșit e un refuz cu cod (`nu-e-font`, `cff`, `tabel-lipsa`, `fara-unicode`, `stricat`, `majuscula`), nu o
   excepție; o glifă stricată (o compusă care se conține pe sine, un offset afară) se sare și se numără.
2. **Așezarea** (`src/text/asezare.ts`): o unitate a fontului face `inaltime / majuscula` mm (înmulțit întâi, împărțit la
   urmă: H și N ies exact). Linia de bază a primului rând trece prin ancoră; rândurile coboară cu `interlinie` × înălțimea
   rândului fontului (`hhea`: urcarea − coborârea + spațiul dintre rânduri). Între două litere ale aceluiași rând: avansul,
   crenarea și `spatiere` mm. Alinierea: rândul începe în ancoră, are mijlocul în ea sau se termină în ea. Pătratica
   (p0, q, p2) devine cubica (p0 + 2/3 (q − p0), p2 + 2/3 (q − p2)); punctele de pe curbă subînțelese, la mijloc; regulile
   căii sunt ale ușilor importului; fiecare glifă se normalizează din `nonzero` (ADR 0036), o dată. Un caracter pe care
   fontul nu-l are nu se desenează (o cutie `.notdef` s-ar tăia) și se spune.
3. **Parametrii** blocului (`LIMITE_TEXT`): conținutul (1–1 000 de caractere, rândurile despărțite de Enter), fontul,
   înălțimea majusculei (0,1–1 000 mm), spațierea (± 1 000 mm), distanța dintre rânduri (0,5–5 × rândul fontului),
   alinierea (stânga, centru, dreapta).
4. **Piesa textului** (`src/text/piesaText.ts`): câte un grup pe literă (litera cu golurile ei rămâne întreagă la degrupare,
   ADR 0103), contururile ca forme „cale” închise, originea în ancoră. Operațiile unui text nou sunt ale unui import: din
   imbricarea tuturor contururilor, profilul pe exterior și pe interior. **Blocul de text** (`src/model/blocText.ts`) stă pe
   grupul rădăcină, cu amprenta contururilor (FNV-1a, mutată din `cam/iesire.ts` în `src/model/amprenta.ts`):
   - nu e o schemă nouă a documentului: ce se taie sunt contururile, scrise în piesă, iar un câmp fără sens pentru tăiere se
     păstrează și de o versiune care nu-l cunoaște (ADR 0024), care taie la fel;
   - amprenta îl leagă de geometrie: dacă contururile se schimbă pe altă cale (o editare de noduri, o înclinare, o scalare
     neuniformă, o versiune veche), blocul nu mai e valid și piesa rămâne vectori obișnuiți;
   - scalarea uniformă îl ține la zi (înălțimea și spațierea cresc cu ea, amprenta se recalculează); oglindirea stă în matricea
     rădăcinii, pe care editarea o păstrează; mutarea și rotirea sunt ale instanței.
5. **Unealta Text** (tasta X; T rămâne „Arată traseul”): un clic pe foaie pune ancora (o cruce), un clic pe un text cu bloc
   valid îl alege. Panoul: textul, fontul, înălțimea, spațierea, rândurile, alinierea; „Adaugă” face un text nou în ancoră,
   „Aplică” înlocuiește textul ales. Acțiunea `document.text` (registrul documentului, și din paletă): un text nou e o piesă
   cu instanța ei (`adauga`); unul editat înlocuiește piesa (`inlocuieste-piesa`, același id), într-un singur pas de
   anulare, cu operațiile vechi mutate pe contururile noi de același fel (profilul pe exterior pe cele de afară, cel pe
   interior pe goluri, restul pe toate; găurirea se scoate). Refuzurile: o piesă care nu mai e text, una folosită de mai
   multe instanțe, un text fără litere, ancora prea departe, plafonul.
6. **Fonturile incluse** (`public/fonturi/`, în precache, ca textul să meargă fără rețea): Roboto 2.001 și Droid Serif 1.00,
   ambele Apache 2.0, luate de pe mașina asta (fără descărcări) și subsetate cu fontTools (literele latine, Ș ș Ț ț,
   punctuația; fără hinting; din `GPOS` rămâne crenarea): 24 și 37 kB. Licența și mențiunile, alături
   (`LICENTA-Apache-2.0.txt`, `CITESTE.txt`). Codul textului vine la cerere, cu panoul; fontul, la prima folosire.

## Cifrele (măsurate, gzip 9)

| | Înainte (9.4↑) | După (7.1↑) |
|---|---|---|
| Pornirea (cu ușa) | 97,2 (100,7) / 110 kB | 97,4 (100,9) / 110 kB |
| Totalul JavaScript | 349,7 / 400 kB | 358,6 / 400 kB |

## Probele

- **Corpusul independent** (`test/oracles-py/text_corpus.py`, fontTools 4.67): zece așezări în cele două fonturi și în
  variantele lor (loca lungă), comparate glifă cu glifă și contur cu contur, sub 1e-9 mm: „LEMN” de 20 mm (pe hârtie, în
  generator: fiecare literă de la 0 la 20), diacriticele, crenarea, spațierea, rândurile centrate și la dreapta, caracterele
  lipsă, serif-ul. Contururile le citește fontTools (`getCoordinates`, cu glifele compuse asamblate de el), pătraticele le
  desface funcția lui (`decomposeQuadraticSegment`), crenarea e citită din obiectele tabelelor lui; regulile așezării sunt
  scrise din nou, în Python. Plus crenarea fiecărei perechi dintre literele, cifrele, semnele și diacriticele, în ambele fonturi.
- **Glifele compuse, brute** (`test/fixtures/text/glife.json`): varianta cu componenta pusă pe puncte, deplasarea scalată,
  2 × 2, scara pe X și Y și o compusă din altă compusă, punct cu punct față de fontTools.
- **Probele țintite** (`test/unit/text.font.test.ts`): refuzurile (CFF: un subset Inter de 2 kB, OFL; majuscula mincinoasă;
  tabelele lipsă; fișierul tăiat), glifa care se conține pe sine, spațiul, tab-ul, caracterele de control, normalizarea
  glifelor care se suprapun.
- **Piesa și blocul** (`test/unit/text.piesa.test.ts`): grupurile, operațiile, ușa documentului (blocul păstrat după
  salvare), amprenta, scalarea, oglindirea, degruparea, operațiile mutate la editare; **acțiunea**
  (`test/unit/text.actiune.test.ts`), cu refuzurile.
- **E2e** (`test/e2e/text.spec.ts`, Edge): ancora, „LEMN Șțăâî” cu N de exact 20 mm, Aplică (alt font, 30 mm), Ctrl+Z,
  editarea după reîncărcare, degruparea; caracterele lipsă, înălțimea greșită, Escape.
- **Mutațiile:** 39 / 39 (33 pe probele unitare, 6 pe e2e, controlul verde înainte și după); 4 au trecut întâi: crenarea pe clase (perechile corpusului nu atingeau subtabelul pe clase), primul subtabel care câștigă și acoperirea pe intervale (fonturile livrate nu le pot arăta), „Adaugă” fără ancoră (proba verifica butonul înaintea textului): probe noi (crenarea tuturor perechilor față de fontTools, o variantă cu clasa 0 / 0 la 777, acoperirea pe octeți scriși de mână, textul scris înaintea ancorei).

## Ce am respins

- **opentype.js:** ~170 kB pentru o parte mică din el; ~50 kB rămași din totalul de 400.
- **O schemă nouă a documentului pentru bloc:** nu schimbă ce se taie; amprenta îl leagă de geometrie mai sigur decât o
  regulă în fiecare comandă care schimbă contururi.
- **Textul ca formă parametrică desenată din font la fiecare afișare:** pânza, CAM-ul și exportul ar avea nevoie de font;
  contururile scrise în piesă merg și fără el, oriunde.
- **Cutia `.notdef` pentru un caracter lipsă:** s-ar tăia o cutie.

## Limite și neprobat

- **Textul pe curbă** (criteriul R50), **fonturile omului** (încărcate, salvate în proiect; și CFF / `.otf`, `cmap`
  formatul 12, căutările de tip Extension, tabelul `kern` vechi) și **fonturile cu o singură linie** vin în feliile
  următoare ale etapei; la fel aldinul și cursivul, textul vertical, încadrarea în casetă.
- **Literele care se ating între ele** (o crenare strânsă) nu se unesc: fiecare glifă se normalizează singură.
- **Previzualizarea** în panou: textul se vede după „Adaugă” (și se schimbă cu „Aplică”).
- **Placa etapei 7** („20 mm” = 20,00 mm tăiat, diacriticele, textul pe arc) rămâne de tăiat.

## Se redeschide dacă

- un font real iese altfel decât în programul care l-a scris (o compusă, o crenare);
- textul trebuie să rămână editabil și după o editare de noduri (blocul ar ține atunci și editările);
- literele unui text trebuie unite unde se ating.
