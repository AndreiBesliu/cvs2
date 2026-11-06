# ADR 0138: Textul: mărimea în puncte și inch, lățimea și înălțimea în procente, spațierea literelor alese (feliile 7.9↑, 7.9↑b)

**Starea:** propus pe 06.11.2026, pentru feliile 7.9↑ și 7.9↑b (aduse din etapa 7), fără mașină, pe linia principală, cât
liniile paralele (incrustațiile, ADR 0170; tăierea vectorilor, ADR 0180) își așteaptă răspunsurile. Cererea owner-ului: „Ok,
o sa le raspund, aici poti sa continui”. **Completează:** ADR 0105 (textul: mărimea e înălțimea majusculei; blocul), ADR 0123
(aldinul și cursivul), ADR 0141 (textul vertical), ADR 0142 (caseta), ADR 0052 (mânerele de scalare). **Documentul:**
neschimbat (v19): câmpurile noi stau în blocul textului, care nu e o schemă a documentului (ADR 0105 §4); ce se taie rămân
contururile literelor.

**Problema.** Definiția pragului (planul, rândul „Text, text pe cale, fonturi”, în lucru) cere, pe lângă ce e gata: „mărimea
în puncte, mm sau inch; scalare în lățime și în înălțime (%) […]; spațiere între litere și între rânduri, kerning […];
spațiere manuală între literele selectate (Ctrl + tragere)”. Azi mărimea se scrie doar în mm, literele păstrează mereu
proporțiile fontului (un text îngust cere alt font), crenarea fontului nu se poate opri, iar spațierea e una singură, pe tot
textul: o pereche prea largă într-un font („AV”, „Te”) nu se strânge. Și o scalare neuniformă din mânere face textul vectori,
deci nu se mai poate edita.

## Ce am aflat (cercetarea din 06.11)

- **ArtCAM 2018** (ajutorul lui, referință funcțională): lângă mărime stă lista unităților (puncte, mm, inch), cu pasul de 3
  pt, 1 mm sau 0,04 inch la un clic; ajutorul nu spune ce măsoară punctele. În secțiunea Transform: lățimea și înălțimea în
  procente, apoi înclinarea și rotirea. Crenarea se pornește sau se oprește. Pe o curbă, Ctrl + tragere schimbă spațiul doar
  dintre literele alese; celelalte rămân cum erau.
- **Punctul tipografic** (Word, CorelDRAW, Illustrator): mărimea fontului e em-ul, 72 pt = 1 inch; majuscula depinde de font.
  Pe hârtie, cu Roboto, fontul inclus (2048 de unități pe em, vârful lui H la 1456): 72 pt dau majuscula de
  25,4 · 1456 / 2048 = 18,0578 mm, iar 20 mm de majusculă sunt 79,744 pt; cu Droid Serif (H la 1462), 18,1322 mm. Dacă
  punctele ar măsura majuscula, un text cerut „la 72 pt” ar ieși cu ~40 % mai mare decât la cel care l-a cerut.
- **Așezarea de azi** (`src/text/asezare.ts`): literele trec din unitățile fontului în mm printr-o singură hartă (`inMm`), cu
  cursivul ca o înclinare în ea; spațierea se adună în mm între două litere ale aceluiași rând (ale aceleiași coloane, la
  textul vertical); aldinul îngroașă miezul cu d. Lățimea și înălțimea în procente sunt doi factori ai hărții, iar spațierea
  literelor alese intră în aceeași adunare ca spațierea textului.
- **Mânerele** (`src/model/transformare.ts`, ADR 0052): o scalare neuniformă trece doar prin rotiri de 90° și azi îi scoate
  textului blocul (`blocScalat`). Un text drept, fără aldin, scalat neuniform e exact un text cu altă lățime în procente (și
  alt unghi al cursivului), deci blocul poate rămâne.
- **Restul listei din prag e gata:** fontul, aldinul și cursivul (înclinarea, ADR 0123), alinierea, textul vertical (ADR
  0141), caseta (ADR 0142), curba (ADR 0108), rotirea (panoul de proprietăți, ADR 0038). Cu feliile de aici, rândul se închide.

## Decizia propusă

1. **Mărimea în mm, pt sau in** (felia 7.9↑; întrebarea 1). Lângă câmpul mărimii, lista unităților: mm (implicit), pt, in.
   **mm și in măsoară majuscula** (regula din ADR 0105: 20 mm dau H de 20,00 mm; 1 in, H de 25,4 mm). **pt e mărimea fontului,
   ca în programele de birou și de grafică:** em-ul are pt · 25,4 / 72 mm, iar majuscula care rezultă din font se arată sub
   câmp („majuscula 18,06 mm”). Blocul ține unitatea (`unitate`: `pt` sau `in`; lipsă: mm), iar mărimea rămâne, ca azi,
   majuscula în mm (`inaltime`): tăierea, caseta și scalarea nu se schimbă. Cu pt, un alt font păstrează punctele (majuscula se
   schimbă cu fontul), ca în Word; cu mm și in, păstrează majuscula. Punctele se arată la sutime, țolii la zecimea de miime.
   Celelalte câmpuri rămân în mm: unitatea pe toată aplicația vine cu setările omului (planul: mm sau inch), nu aici.
2. **Lățimea și înălțimea, în procente** (7.9↑; întrebarea 2). Două câmpuri, 100 % implicit, între 10 și 1 000 %: literele se
   scalează pe orizontală și pe verticală înaintea oricărui alt pas, ca în ArtCAM. Mărimea e majuscula la 100 %; la altă
   înălțime, panoul arată majuscula tăiată („majuscula tăiată 30,00 mm”). Cu factorii cresc avansurile și crenarea (lățimea),
   distanța rândurilor (înălțimea), golul dintre literele unei coloane (înălțimea) și distanța coloanelor (lățimea), la textul
   vertical. Rămân în mm: spațierea, spațierile literelor alese, aldinul (aceeași îngroșare pe toate laturile) și distanța
   față de curbă. Cursivul înclină litera deja scalată, deci unghiul rămâne cel scris. Caseta (ADR 0142) încadrează literele
   scalate: cutiile lor rămân afine în mărime, deci căutarea din ADR 0142 §3 rămâne aceeași.
3. **Crenarea fontului, pornită sau oprită** (7.9↑). O bifă, pornită implicit (ca azi); oprită, literele stau la avansurile
   fontului, fără perechile lui (`crenare: false` în bloc). La textul vertical crenarea nu se folosește, ca azi.
4. **Mânerele pe un text** (7.9↑; întrebarea 3). O scalare neuniformă (lx, ly, în axele piesei) a unui text drept, fără aldin,
   îl păstrează text: mărimea × ly, lățimea × lx / ly, spațierea și spațierile literelor alese × lx (la textul vertical, × ly),
   cursivul cu unghiul atan(tan θ · lx / ly), caseta × (lx, ly), iar amprenta e a contururilor scalate (ca la scalarea uniformă,
   ADR 0105 §4). Un text cu aldin, pe o curbă sau care ar ieși din margini (procentele, cursivul peste 45°) devine vectori, ca
   azi: îngroșarea scalată neuniform nu mai e d pe toate laturile, iar literele de pe o curbă scalată nu sunt literele
   scalate.
5. **Spațierea literelor alese** (felia 7.9↑b; întrebările 4 și 5). În câmpul textului, omul alege literele (cu mausul sau cu
   Shift + săgeți). Rândul „Între literele alese” arată spațiul adăugat între ele (gol, dacă diferă) și îl schimbă pe toate
   deodată: câmpul (mm), butoanele − / + și Alt + ← / → (0,1 mm, ca în programele de grafică), cu cursorul între două litere
   doar pentru perechea lor. „Fără spațieri (N)” le scoate pe toate. Blocul ține, sortat, spațiul de după fiecare caracter care
   are unul (`spatieri`: indicele caracterului în text și mm-ul, fără zerouri), adunat la spațierea textului, doar între două
   litere ale aceluiași rând (sau ale aceleiași coloane); pe o curbă, de-a lungul ei. O editare a textului păstrează
   spațierile literelor neatinse (prefixul și sufixul comune), iar ale celor șterse pleacă. Previzualizarea arată spațierea pe
   loc; „Aplică” o pune într-un singur pas (anularea o scoate).
6. **Marginile:** procentele între 10 și 1 000; un spațiu al literelor alese între −1 000 și 1 000 mm, ca spațierea, cel mult
   unul pe caracter; mărimea, ca azi, între 0,1 și 1 000 mm de majusculă, oricare ar fi unitatea.
7. **Ce nu se schimbă:** documentul (v19); un text făcut înainte (fără câmpurile noi) se așază și se taie ca azi, octet cu octet
   în G-code; textul pe curbă și cel vertical doar primesc factorii; un font cu o singură linie (ADR 0140) se scalează la fel,
   fără aldin.

## Feliile propuse

| Felia | Ce | Mașina |
|---|---|---|
| 7.9↑ | Mărimea în mm / pt / in, lățimea și înălțimea în procente, crenarea pornită sau oprită, mânerele care păstrează textul | nu |
| 7.9↑b | Spațierea literelor alese: rândul din panou, butoanele − / +, Alt + săgeți, „Fără spațieri” | nu |

## Proba

- **Pe hârtie:** 72 pt cu Roboto dau majuscula de 18,0578 mm, cu Droid Serif 18,1322 mm; 1 in, 25,4 mm; „LEMN” la 20 mm și
  lățimea 50 %: majuscula rămâne 20,00 mm, iar fiecare avans și fiecare cutie au exact jumătate din lățimea de la 100 % (din
  font, pe hârtie).
- **Corpusul textului (Python, fontTools):** cazuri noi în `test/oracles-py/text_corpus.py` (lățimea și înălțimea, cu cursiv,
  vertical, în casetă și pe curbă; crenarea oprită; spațierile literelor alese), cu fixturile regenerate și comise: oracolul
  așază literele din fontTools, fără cititorul aplicației.
- **Mânerele:** scalarea neuniformă a unui text drept dă aceleași contururi (sub 1e-9 mm) ca textul așezat din nou cu blocul
  nou; cu aldin sau pe o curbă, vectori.
- **Ușa:** un bloc cu câmpurile noi, salvat și redeschis, se editează fără pierderi; un bloc vechi dă textul de azi, octet cu
  octet (G-code-ul).
- **E2e:** unitatea, procentele, crenarea, spațierea literelor alese, previzualizarea, „Aplică” și redeschiderea; Alt + săgeți
  fără ca pagina să meargă înapoi în istoric.
- **Otrăvurile** (`test/otravuri/7.9.py`): factorul pus pe o singură axă, unitatea inversată, crenarea ignorată, spațiul
  manual pe rândul următor, editarea care mută spațierile pe alte litere.

## Întrebările (owner)

1. **Ce înseamnă pt:** a) mărimea fontului, ca în Word sau CorelDRAW (72 pt = em-ul de 1 inch), cu majuscula care rezultă
   arătată sub câmp; mm și inch rămân majuscula (recomandat: un text cerut „la 72 pt” iese cum îl știe cine l-a cerut); b)
   majuscula în puncte, ca mm și inch (72 pt = H de 25,4 mm).
2. **Lățimea și înălțimea:** a) ambele în procente, ca în ArtCAM; mărimea e majuscula la 100 %, iar majuscula tăiată se arată
   când înălțimea nu e 100 % (recomandat); b) doar lățimea în procente: înălțimea e mereu mărimea.
3. **Mânerele pe un text:** a) o scalare neuniformă păstrează textul editabil (se schimbă mărimea și lățimea), afară de aldin și
   curbă, care devin vectori ca azi (recomandat); b) ca azi: orice scalare neuniformă face textul vectori.
4. **Spațierea literelor alese, de unde:** a) din panou: literele alese în câmpul textului, apoi rândul „Între literele alese”
   (câmpul, − / +, Alt + săgeți) (recomandat); b) și Ctrl + tragere pe foaie, ca în ArtCAM, într-o felie după 7.9↑b; c) doar
   pe foaie.
5. **Spațiul literelor alese, în ce:** a) mm, ca spațierea textului (recomandat: se măsoară pe placă și crește cu textul la
   scalarea din mânere); b) miimi de em: rămâne pe măsura literelor și când schimbi mărimea din panou.

## Ce am respins

- **Toate câmpurile panoului în inch:** unitatea pe toată aplicația ține de setările omului (planul), nu de un câmp; aici doar
  mărimea, ca în ArtCAM.
- **Scalarea neuniformă cu aldin, păstrată:** îngroșarea scalată nu mai e aceeași pe toate laturile, deci textul așezat din nou
  ar ieși altfel decât cel scalat.
- **Spațierea literelor alese ca o mutare după așezare:** caseta, curba și alinierea n-ar mai vedea-o; ea intră în aceeași
  adunare ca spațierea textului.
- **Spațierile ținute după locul de pe foaie:** o editare a textului le-ar muta pe alte litere.
- **Alt + Shift + săgeți pentru pasul mare:** Alt + Shift schimbă limba tastaturii în Windows; pasul mare se scrie în câmp.

## Se redeschide dacă

- owner-ul răspunde altfel la întrebări;
- vin setările omului cu mm sau inch pe toată aplicația (atunci și celelalte câmpuri ale panoului);
- e nevoie de Ctrl + tragere pe foaie (întrebarea 4, b sau c).
