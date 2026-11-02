# ADR 0123: Aldinul și cursivul sintetic (felia 7.5↑)

**Starea:** acceptat pe 02.11.2026, la felia 7.5↑ (adusă din etapa 7), în worktree-ul `wip/7.5-text`, după ADR 0122.
**Completează:** ADR 0105 (textul și fonturile; T19: înălțimea textului e înălțimea majusculei, verificată pe H), ADR 0005 și
0073 (offsetul, prin fațada `src/geom/offset.ts`), ADR 0033 (biarcele) și ADR 0065 (înclinarea exactă în geometrie). **Schimbă:**
nimic din schema documentului (blocul textului primește două câmpuri păstrate, ADR 0105 §4).

**Problema.** Rândul de prag „Text, text pe cale, fonturi” mai avea patru bucăți: fonturile cu o singură linie, aldinul și
cursivul sintetic, textul vertical, încadrarea în casetă. Un font are adesea o singură față (Roboto și Droid Serif, incluse,
sunt doar Regular; multe fonturi ale omului la fel), iar un atelier vrea totuși litere mai groase (o freză mai mare, un V-carve
mai adânc) sau înclinate. Aldinul și cursivul nu cer nimic de la owner, deci vin primele.

## Decizia

1. **Cursivul** înclină fiecare literă față de linia de bază a rândului ei: x' = x + tan(unghi) · y, y' = y. E o transformare
   afină, deci liniile și cubicele rămân exacte (punctele de control se transformă), ca la înclinarea formelor (ADR 0065).
   Avansurile, crenarea și alinierea nu se schimbă (un text cursiv nu e mai lat); rândurile nu se mută unul față de altul.
   Unghiul e în grade, pozitiv spre dreapta, negativ spre stânga, cel mult 45° în valoare absolută; propus: 12°.
2. **Aldinul** `d` (mm pe fiecare parte) îngroașă literele fără să le crească înălțimea:
   - literele se așază la înălțimea **miezului**, h − 2d (contururile, avansurile, crenarea, la scara (h − 2d) / majuscula);
   - fiecare literă (înclinată, dacă e cursivă, și normalizată, ADR 0036) se îngroașă: cubicele devin biarce sub toleranța
     proiectului, 0,001 mm (ADR 0033: singura aproximare de pe drumul spre mașină, aici făcută mai devreme), figura literei
     crește cu d prin fațada offsetului (punctele aflate la cel mult d de ea), apoi se mută cu (d, d);
   - **H de h are tot h**: baza la 0, vârful la h − 2d + 2d. Marginea din stânga a literei stă unde stătea în miez, avansul
     crește cu 2d, deci spațiul dintre literele vecine e al miezului. Colțurile de afară se rotunjesc cu raza d, cele dinăuntru
     rămân ascuțite; golurile se strâng cu d (unul mai îngust de 2d se închide), iar bucățile mai apropiate de 2d se unesc
     (virgula lui ș, punctul lui i, la un aldin mare);
   - **rândurile** rămân la distanța înălțimii cerute; coborârea fontului (pentru textul pe curbă, „deasupra”) e a miezului,
     cât coboară literele îngroșate;
   - îngroșarea e de la 0,01 mm (rezoluția modelului) până la o cincime din înălțime (miezul are atunci 3/5 din ea); propusă:
     3 % din înălțime, la sutimea de mm (0,6 la 20 mm), cam cât adaugă fața Bold a unui font față de Regular;
   - contururile unei litere îngroșate sunt **linii și arce**, fără cubice: offsetul unei cubice nu e o cubică.
3. **Întâi înclinarea, apoi îngroșarea.** Așa, trăsăturile înclinate se îngroașă la fel în toate direcțiile (pe normala lor), iar
   înclinarea rămâne exactă (după îngroșare ar avea arce, pe care o înclinare nu le duce exact, ADR 0065 §2).
4. **Fațada offsetului primește `offsetFigura`**: contururi închise care nu se ating, citite par-impar (oricâte exterioare,
   cu golurile lor și cu insulele din goluri), în ambele sensuri, prin figura lui cavalier (`Shape`), ca `offsetRegiune` (ADR
   0073), cu aceleași gărzi, aceeași verificare a ieșirii (fiecare punct la |d| de cel mai apropiat contur, pe partea cerută;
   niciun contur atins; sensurile par-impar) și aceeași a doua încercare. În plus, spre exterior, figura nouă trebuie să
   cuprindă fiecare contur al celei vechi: o bucată pierdută e un refuz, nu o literă cu o parte lipsă. O literă refuzată de
   offset nu se desenează, se numără (`aldin-esuat`) și **oprește Adaugă / Aplică**: un text cu o literă lipsă nu se taie.
5. **Literele îngroșate se țin** (cel mult 512), după îngroșare și contururile miezului în sistemul literei (cheia e chiar
   textul lor, deci exactă): offsetul costă câteva ms pe literă (măsurat în Node: 70 de litere, 0,4–0,5 s fără memorie), iar
   panoul așază textul din nou la fiecare tastă. Ce se ține e exact ce ar ieși din calculul din nou, deci așezarea rămâne pură.
6. **Blocul** ține `aldin` (mm) și `cursiv` (grade), doar când sunt pornite. Nu e o schemă nouă: blocul e un câmp păstrat
   (ADR 0105 §4), iar ce se taie sunt contururile. Ușa blocului judecă marginile (inclusiv raportul față de înălțime); scalarea
   uniformă crește îngroșarea cu textul (cursivul e un unghi: rămâne), iar una care o duce sub 0,01 mm lasă doar vectorii.
   O versiune a aplicației de dinainte de 7.5↑ vede blocul fără ele: taie aceleași contururi, iar la o editare ar scrie
   textul drept și subțire.
7. **Interfața**: sub font, bifele **Aldin** și **Cursiv**; bifate, își arată câmpul (**Îngroșarea pe fiecare parte**,
   **Înclinarea**), cu valoarea propusă la prima bifare. Un text ales își aduce aldinul și cursivul în panou. Alegerile se țin
   în browser, ca restul panoului. Previzualizarea desenează și arcele.

## Cifrele (măsurate, gzip 9)

| | Înainte (3.R) | După (7.5↑) |
|---|---|---|
| Pornirea (cu ușa) | 98,5 (102,0) / 110 kB | 98,6 (102,2) / 110 kB |
| Totalul JavaScript | 441,2 / 500 kB | 444,6 / 500 kB |

Din cei 3,4 kB: ~1,3 kB sunt figura lui cavalier (`Shape`), adusă acum și pe firul principal (până la 7.5↑, `offsetRegiune` o
folosea doar CAM-ul, în worker); ~0,4 kB, bucata comună nouă a biarcelor (ieșită din cea a booleanului, cu numele ei în lista
de preîncărcare a pornirii, ADR 0099); restul, codul feliei (așezarea, blocul, panoul, fațada). Măsurat față de un build
curat al lui `042db20`, bucată cu bucată.

## Probele

- **Oracolul independent** (`aldin` în `test/oracles-py/text_corpus.py`, `test/fixtures/text/aldin.json`, fontTools 4.67 și
  numpy): oracolul nu construiește litera îngroșată. Așază miezul după regulile de mai sus, scrise din nou acolo (contururile
  din fontTools, la h − 2d, înclinate), apoi judecă punctele unei grile în jurul fiecărei litere: un punct e în figură dacă e
  în miez (numărul de înfășurare nenul, regula `nonzero` a fontului) sau la cel mult d de conturul lui (distanța la poligonul
  curbelor, la cel mult 1e-4 mm de ele), după mutarea cu (d, d); cele aflate la mai puțin de 0,003 mm de margine nu se judecă.
  Plus cutia fiecărei litere, exactă: a miezului lărgită cu d pe fiecare parte (cutia oricărei figuri crescute cu d), cu
  extremele cubicelor din fontTools. Cinci cazuri, 41 de litere, ~218 000 de puncte: H, O, T, E, L (Roboto, 20 mm, 0,6);
  diacriticele pe două rânduri centrate (bucățile care se unesc); golurile care se strâng și insulele (B 8 e @ % &, la dreapta,
  cu spațiere); aldinul peste cursiv pe Droid Serif; CFF (Inter), cu crenarea, spațierea negativă și cursivul spre stânga.
  Aplicația are aceleași clase în toate punctele judecate și cutiile sub 1,5e-3 mm; în probă, arcele se desfac din bulge după
  definiția DXF, nu cu codul aplicației.
- **Pe hârtie, în oracol și în probe:** H din Roboto (majuscula 1456; picioarele 169–361 și 1095–1288; bara 673–830; avansul
  1460) de 20 mm cu aldinul 0,6: miezul are 18,8 mm (s = 18,8 / 1456); baza la 0, vârful la 20; marginea din stânga la 169 s
  = 2,1821 mm, cea din dreapta la 1288 s + 1,2 = 17,8308; piciorul din stânga se termină la 361 s + 1,2 = 5,8613; bara între
  673 s = 8,6898 și 830 s + 1,2 = 11,9170; colțul dintre picior și bară, ascuțit, chiar în (5,8613, 8,6898); colțul de sus
  din stânga, rotunjit (arcul de rază 0,6 din (2,1821, 19,4) în (2,7821, 20)); O începe la 1460 s + 1,2 = 20,0516; golul lui
  O rămâne. Cursivul: H de 20 mm la 12° are colțul de sus din stânga în 169 · 20 / 1456 + 20 · tan 12° = 6,5726 mm, baza
  neschimbată.
- **Cursivul, exact:** trei cazuri noi în corpusul comun (`asteptat.json`: Roboto 12°, Droid Serif −20° pe două rânduri la
  dreapta, Inter CFF 30° centrat, cu diacriticele), contur cu contur, sub 1e-9 mm.
- **Probele țintite** (`test/unit/text.aldin.test.ts`): fără aldin și cursiv, așezarea e cea de dinainte; rândurile și
  coborârea miezului; blocul (marginile, raportul față de înălțime, scalarea, sub 0,01 mm doar vectori); pe curbă, literele
  îngroșate se mută întregi (arcele cu același bulge, laturile la fel de lungi).
- **E2e** (`test/e2e/text.spec.ts`, Edge): bifele cu valorile propuse, refuzurile (îngroșarea peste o cincime, înclinarea
  peste 45°), H de exact 20 mm din linii și arce, blocul cu aldinul și cursivul, după reîncărcare panoul le are, oprite și
  aplicate, textul drept și subțire.
- **Mutațiile** (`test/otravuri/7.5.py`): 38 / 38 prinse din prima (32 pe probele unitare: cursivul, miezul, avansul,
  mutarea literei, rândurile, coborârea, cheia memoriei, literele refuzate, sensurile din `offsetFigura`, garda bucății
  pierdute, distanța, marginile blocului, scalarea, arcele previzualizării; 6 de interfață, prin e2e: valorile propuse,
  refuzurile din panou, blocul încărcat și scris).

## Ce am respins

- **Aldinul care crește și înălțimea** (offsetul simplu: H de h + 2d): „20 mm” n-ar mai fi 20 mm (ADR 0019), iar o față Bold
  adevărată își păstrează majusculele.
- **Îngroșarea doar pe orizontală** (trăsăturile verticale mai groase, barele la fel, ca la unele fețe Bold): nu e un offset,
  ci suma cu un segment, care cere unirea a două copii ale fiecărei litere; offsetul există, e verificat și are o fațadă.
- **Cursivul față de linia de bază a primului rând** (tot blocul înclinat ca o formă): rândurile de jos s-ar muta spre stânga.
- **Îngroșarea înaintea înclinării:** după offset, litera are arce, pe care înclinarea nu le duce exact; iar trăsăturile
  s-ar îngroșa altfel pe orizontală decât pe verticală.
- **Litera îngroșată din cubice** (offsetul aproximat direct cu cubice, ca să rămână netedă în desen): o aproximare nouă, a
  doua, cu verificarea ei; biarcele sunt deja aproximarea proiectului, iar CAM-ul le face oricum.

## Limite și neprobat

- **Literele care se ating între ele** nu se unesc (ca în ADR 0105): fiecare literă se îngroașă singură, iar spațiul dintre
  litere e al miezului, deci o crenare strânsă sau o spațiere negativă le poate apropia.
- **Garda bucății pierdute și a doua încercare** din `offsetFigura` n-au un caz care să le declanșeze: pe corpus și pe
  probele fațadei, cavalier n-a pierdut nicio bucată și n-a cerut o a doua încercare. Garda e probată doar în sensul în care
  nu trebuie să lucreze (offsetul spre interior).
- **Fața Bold / Italic adevărată** a unui font rămâne de ales din lista fonturilor (o față a colecției, o instanță a unui font
  variabil, ADR 0113); aldinul și cursivul sintetic merg peste orice față.
- **Textul vertical, încadrarea în casetă și fonturile cu o singură linie** rămân în etapa 7; un font cu o singură linie nu va
  primi aldinul (n-are figură de îngroșat).
- **Placa etapei 7** („20 mm” = 20,00 mm tăiat, diacriticele, textul pe arc) rămâne de tăiat; aldinul se poate pune pe ea.

## Se redeschide dacă

- owner-ul vrea aldinul ca în alte programe, cu înălțimea crescută, sau doar pe orizontală;
- un text îngroșat cere literele unite unde se ating;
- o literă reală e refuzată de offset (`aldin-esuat`) pe un font obișnuit.
