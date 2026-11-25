# Auditul elicelor din Easy 3Draw (fila „Elice”, ADR 0282)

_Cerut de owner pe 25.11.2026, prin sesiunea principală: „vreau sa le intrebi ce pot imbunatati in zona in care au lucrat?
dar, defapt, pune-le sa faca un audit complet in acest sens”. Făcut de sesiunea liniei elicelor, pe `main` `a22547e5`
(Easy 3Draw 18.30.0), doar ca document: nicio linie de cod de produs, nicio versiune nouă a extensiei. Feliile propuse de
la capăt le-ar lucra linia atelierului (ADR 0285–0289, apoi 0340–0349), la cuvântul owner-ului._

## Cum am lucrat

- **Plasele, din motor** (`teste/incarca.js`, ca probele unitare): 110 piese pe o grilă a plajelor: elicea (paletele 2 și
  8, Ø20 și Ø200, pasul 0,3 și 1,5, lățimea 15 și 60, toate formele, paletele, profilurile, găurile, conul), elicea de
  barcă (3 și 5 palete, Ø20 și Ø120, pasul 0,5 și 1,6, lățimea 40 și 150, înclinarea 0 și 40°, spre pupa 0 și 15°, capacul,
  găurile), rotorul (3 și 12 palete, Ø24 și Ø120, pasul, lățimea, inelul) și carcasa (Ø24–120, 2 și 4 urechi), plus roata
  cu palete. Pentru fiecare: muchiile fără pereche, corpurile cu volum negativ, triunghiurile, timpul de generare, gramele,
  prinderile, axul și știftul potrivite, aria feței de pe masă, aria de dedesubt mai culcată de 30° și de 45°, aria
  primului strat (felia la 0,1 mm, din plasă).
- **Aplicația**, construită acum (`npm run build`), servită local, cu pachetul extensiei construit din surse și instalat
  din fișier, ca în probele e2e; parcursă cu Playwright (Chromium): fiecare piesă a filei, marginile câmpurilor, „Ca
  LEGO”, „Repede”, „Fă perechea”, „Fă ventilatorul”, „Se prinde cu”, STL-ul, „Pune în model” și Modelul, în română și în
  engleză, pe birou (1440 × 900), pe telefon (390 × 844, atingere) și cu tema întunecată. Capturile stau în
  `.tmp/audit-elice/` (ignorat de git).
- **Codul și probele:** motorul (`lego.ts`: `eliceCote`, `eliceBarcaCote`, `ventilatorCote`, `paleteElice`,
  `butucElice`, alături de `roataPalete`, `butucRoata`, `gauraRoata`), editorul (`atelier.ts`), probele unitare și e2e ale
  celor patru felii, listele de otrăvuri (`scripts/otravuri.py … verifica`), textele în engleză (`texte.en.json`).

## Ce e bine (de păstrat)

- **Toate cele 110 plase sunt închise:** nicio muchie fără pereche, niciun corp întors. Cea mai lentă se face în 154 ms
  (rotorul cu 12 palete, Ø120); cea mai grea are 19 312 triunghiuri (0,97 MB de STL). STL-ul descărcat are exact
  triunghiurile motorului (4 752 la elicea implicită).
- **Nicio eroare în consolă** în cele trei parcurgeri; tema întunecată și telefonul arată bine (pe telefon, editorul vine
  sub vedere, deci se derulează, cum e la toate piesele).
- **Prinderile sunt corecte:** gaura butucului (de ax, de știft sau de bară; oarbă sub con sau capac), găurile de știft
  ale urechilor carcasei, cu lamaj; axul propus are lungimea bună (de 3 la butucul de 8, de 3 și la cel orb de 11,5 al
  elicei de barcă cu capac).
- **Textele în engleză sunt complete**; doar o frază e stângace (constatarea 5).

## Constatările, cele mai importante întâi

### 1. „Se tipărește fără suport” se spune și unde nu mai e adevărat (risc la tipărire)

**Ce e.** Paletele se tipăresc cu muchia de jos pe masă; fiecare strat iese peste cel de dedesubt cu
`0,2 / tan β` la vârf (consola, spusă în text). Textul spune „Se tipărește fără suport” oricât ar fi consola.

**Dovada** (consola la vârf, pe un strat de 0,2 mm, din `eliceCote`, `eliceBarcaCote`, `ventilatorCote`):

| Pasul (× Ø) | Elicea | Elicea de barcă | Rotorul |
|---|---|---|---|
| 0,3 | 2,09 mm (5,5°) | — | 2,01 mm (5,7°) |
| 0,5 | 1,26 mm (9,0°) | 1,26 mm (9,0°) | 1,21 mm (9,4°) |
| implicit | **0,90 mm** (0,7; 12,6°) | 0,63 mm (1; 17,7°) | 0,75 mm (0,8; 14,9°) |
| 1,5 / 1,6 | 0,42 mm | 0,39 mm | 0,40 mm |

O linie de duză e de ~0,42 mm: peste ~0,8 mm pe strat, peretele de dedesubt al paletei se tipărește în aer la fiecare
strat. Elicea implicită e deja la 0,90 mm, iar la pasul 0,3 ajunge la 2,1 mm, cu același text. Măsurat pe plasă: la
elicea implicită, 591 mm² din dedesubtul paletelor sunt mai culcate de 30° față de masă (pragul de suport obișnuit al
OrcaSlicer).

**Contactul cu masa e mic și nu se spune nimic despre margine (brim):** primul strat al elicei implicite are 55 mm²
(butucul și o fâșie de sub fiecare paletă); o elice Ø200 cu 2 palete, pasul 1,5 și lățimea 60 are paletele înalte de 52 mm
și 78 mm² pe masă.
Coada owner-ului din fișa etapei 3 cere deja brim, dar editorul nu-l pomenește.

**Ce aș face.** O funcție pură care judecă tipărirea după consolă și după contact, cu textul pe praguri: până la 0,5 mm,
„fără suport”; între 0,5 și 1 mm, „fără suport, dar dedesubtul vârfului iese aspru; ventilatorul la maxim”; peste 1 mm,
„cere suport sub vârfuri, sau un pas mai mare”; și „pune o margine (brim)” când primul strat e mic față de înălțime.
Proba: consola socotită pe plasă (treapta dintre straturi la dedesubtul paletei), egală cu cea din text. Piesele nu se
schimbă. **Cost: ~1 h** (ca 3.Tt: texte, engleza, probele, otrăvurile, documentele).

### 2. 22 de otrăvuri ale elicelor nu mai încearcă nimic (golul probelor)

**Ce e.** Pe `main`, `scripts/otravuri.py … verifica` dă 22 de otrăvuri VOID: 6 în `3.Tq.py`, 10 în `3.Tr.py`, 6 în
`3.Ts.py` (`3.Tt.py` și listele în engleză: toate bune). Ancorele lor s-au mutat cu feliile atelierului: 3.Ce
(`butucElice` întoarce și prinderile, deci `tri.push(...butucElice(…))` nu mai există) și 3.Cj (tipurile motorului și
galeria filei Elice au acum roata cu palete).

**Ce nu mai e încercat prin mutații:** găurile butucului (B06, B07 la elice, H07 la elicea de barcă, R05 la rotor),
butucul pe masă (B08), conul (B09) și capacul (H06), înălțimea și grosimea butucului elicei de barcă (H04, H05), sensul
(M02, R04), capetele paletei (M01), o paletă lipsă (M03), avertismentul carcasei (R03), tipurile (V04, V05, R08) și
galeria (E01 în toate trei, E02 în două). Probele există; doar dovada că le prind a căzut.

**Ce aș face.** Ancorele aduse pe codul de azi și cele 22 rulate (`lot`), cu rândurile din `docs/otravuri.md` la zi.
Doar liste. **Cost: ~45 min.** Regula care ar fi oprit golul e deja în nota liniei („verifica pe toate listele `3.T*.py`
după fiecare mutare de cod”): pentru linia atelierului, care mută acum codul elicelor, ar merita în nota ei.

### 3. Carcasa ventilatorului nu-și spune grinda, iar rotorul nu stă nicăieri pe ax (frecare la montaj)

**Ce e.** Textul piesei spune: „pe o grindă prinsă de urechi cu știfturi, axul trece prin gaura din mijloc”. Dar „Se
prinde cu”, la carcasă, propune doar „Știft” și „Ax” (găurile de știft se potrivesc doar cu tije), nu grinda: cea de
2k + 1 găuri (7 la Ø40, 9 la Ø48), cu axul prin mijloc. Rotițele au exact rândul acesta („Cu perechea… pe o grindă de N”,
„Pune grinda în listă”), deci tiparul există.

Nici textul, nici „Fă ventilatorul” nu spun cum stă rotorul pe lungimea axului: cu grinda sub urechi, rotorul cade pe ea
și se freacă de ea; cu o jumătate de bucșă dedesubt, paletele stau tot în tub (la Ø40, butucul de 8 și tubul de 9).

**Ce aș face.** În „Se prinde cu” al carcasei, rândul grinzii: „Pe o grindă de N găuri, cu axul prin gaura din mijloc”
și „Pune grinda în listă”. La „Fă ventilatorul”, la bifă: grinda, axul de lungimea bună și o jumătate de bucșă, cu o
frază despre așezare (grinda, bucșa, rotorul). **Cost: ~1,5 h.** Se leagă de 3.Tu (mai jos).

### 4. În „Modelul”, carcasa și rotorul nu pot sta pe același ax (3.Tu, deja analizată)

Constatarea de pe 24.11 rămâne: axul unei piese rotunde cade pe centrul unui știft sau pe linia dintre știfturi, după
paritatea amprentei, deci carcasa Ø48 (9 × 7) și rotorul Ø48 (6 × 6) rămân la cel puțin 3,7 mm pe X și 4 mm pe Y.
Analiza, cifrele pe piese și cele trei întrebări sunt în [elice.md](elice.md), „3.Tu, propusă”. Felia e a liniei
atelierului. Parcurgerea de azi a arătat și ce face „Pune în model” cu carcasa aleasă: rotorul intră la z 3, peste ea, nu
în ea (întrebarea 3 din 3.Tu). Odată cu 3.Tu, „Fă ventilatorul” ar putea pune perechea și în model, coaxial.

### 5. Editorul nu spune ce să alegi (claritate)

- **Sensul:** „Dreapta / Stânga”, fără nicio vorbă despre motor. Un om care deschide fila prima dată nu știe pe care să o
  aleagă pentru motorul lui. Definiția stă doar în comentariul motorului: privită din spate (dinspre motor), „dreapta” se
  rotește în sensul acelor de ceasornic. Aș pune o frază sub butoane, la toate trei piesele.
- **Pasul și lățimea** sunt cerute ca „× diametrul” și „% din rază”, fără un desen: nu spun ce schimbă (cât avansează
  elicea la o tură, cât de lată e paleta). Fereastra exportului (ADR 0290) are desenul fiecărei întrebări; un desen mic al
  paletei, cu pasul și unghiul, ar ajuta aici.
- **Fraza elicei de barcă se contrazice:** „Se tipărește cu partea dinspre barcă pe masă, fără suport (cu paletele
  înclinate spre pupa, cu suport sub ele)”; la fel în engleză („without supports (with the blades raked aft, with supports
  under them)”). Aș scrie: „…fără suport; înclinată spre pupa, cere suport sub palete.”
- **Valorile din afara plajei:** câmpul ignoră în tăcere o valoare greșită (Ø250 la elice: piesa rămâne cum era, fără
  niciun mesaj), ca la celelalte piese ale atelierului. Iar motorul elicei strânge pasul și lățimea fără avertisment
  (spune doar paletele și diametrul), pe când roata cu palete le spune pe toate (`camp` din `roataPaleteCote`). Aș folosi
  același `camp` și la elice.
- **„Repede”** există la elicea de barcă și la ventilator (diametrele pe grila de știfturi), dar nu și la elice (doar
  „Ca LEGO”).

**Cost: ~1 h** (texte, engleza, un rând de sfat, avertismentele; desenul pasului, încă ~1 h, separat).

### 6. Grosimea paletelor nu crește cu elicea (risc la margini)

**Ce e.** La elice și la rotor, paleta e groasă de 1,2 mm la rădăcină și 0,8 la vârf oricare ar fi diametrul (`ELICE.tRad`,
`VENT.tRad`); la elicea de barcă, 4 % din diametru, între 1,6 și 3 mm. O elice Ø200 cu 2 palete, pasul 1,5 și lățimea
60 are paletele înalte de 52 mm, de 0,8 mm la vârf, pe un butuc de Ø8 × 8 și cu 78 mm² pe masă: o placă subțire și înaltă, care
tremură la tipărire. Rezistența la rotație nu e problema (la 1 000 rot/min, ~0,3 MPa la rădăcină, față de ~50 MPa la
PLA); tipărirea și rigiditatea sunt.

**Ce aș face.** Grosimea după diametru, ca la elicea de barcă, doar peste un prag (de exemplu Ø80), ca piesele de azi de
sub prag să rămână aceleași la octet (amprenta, ca la 3.Tt). Schimbă piese existente, deci e o decizie a owner-ului
(întrebarea 2). **Cost: ~1,5 h.**

### 7. Ce se repetă în motor (curățenie)

- **Trei generatoare de secțiuni aproape la fel:** `eliceCote`, `eliceBarcaCote` și `ventilatorCote` fac fiecare
  aceeași buclă (coarda strânsă la 85 % din pasul dintre palete, rotirea cu β, punctul de jos pe masă), cu un singur lucru
  inexplicabil diferit: strângerea coardei se oprește după 8 încercări la elice și după 40 la celelalte două.
- **`nr`**, cititorul unui număr cu implicit, e scris de trei ori (pe lângă `numarCerut` al atelierului).
- **`laturiFine`** (roata cu palete, 3.Cj) e chiar **`laturiCerc`** (ventilatorul, 3.Ts): aceeași formulă, săgeata de
  0,02 mm, multiplu de 8.
- **Două butucuri:** `butucElice` (Ø8, peretele găurii verificat prin `gauraRoata`, cu gaura de bară) și `butucRoata`
  (Ø9,6 la roți și la roata cu palete, fără verificarea peretelui, fără bară). Prinderile lor sunt deja comune
  (`prinderiButuc`). Diametrele pot rămâne diferite (butucul elicelor LEGO e Ø8); funcția poate fi una.
- `paleteElice` e bine folosită: o singură funcție pentru toate trei elicele. Roata cu palete n-o repetă (paletele ei sunt
  prisme drepte, altă geometrie).

**Ce aș face.** O funcție a secțiunilor și una a butucului, cu amprenta tuturor pieselor la octet înainte și după (ca la
3.Tr: 3 456 de combinații). **Cost: ~2 h.** Atinge codul pe care linia atelierului lucrează zilnic, deci doar singură,
când linia nu are altă felie deschisă.

### 8. Ce lipsește ca funcție (idei, în ordinea folosului)

- **Duza Kort** (elicea de barcă într-un tub, ca la remorchere): carcasa ventilatorului există, elicea de barcă există; e
  mai mult o potrivire a lor decât o piesă nouă. **~2 h.**
- **Urechi de aderență:** discuri subțiri (0,4 mm) sub vârfurile paletelor, pe masă, care se rup după tipărire; răspunsul
  la contactul mic de la constatarea 1. **~1,5 h.**
- **Elicea pliantă** (paletele pe știfturi Technic, se închid când motorul se oprește, ca la planoare): o piesă nouă, cu
  articulația și opritoarele. **~4 h.**
- **Echilibrarea:** nimic nu spune omului că o elice cu 2 palete tipărită strâmb vibrează; o frază ajunge.
- Ce nu recomand acum: perechile contrarotative coaxiale (cer axe concentrice, pe care LEGO nu le are), pasul variabil
  (nimeni nu l-a cerut), timpul de tipărire pe K1C (lipsește în tot atelierul; e al lui, nu al elicelor).

### 9. Mărunte, ale atelierului întreg (le-am văzut pe elice)

- „Se prinde cu”, la elicea de barcă cu gaura de bară, propune și **Șenila**: bolțul zalei e o „bară”, deci se potrivește
  după regulă, dar o elice pe o zală n-are sens. Un filtru în `randeazaPrinde`.
- Câmpurile numerice arată valoarea cu punct („0.7”), iar textele cu virgulă („0,7”), în română.
- Mesajul „Fișierul e salvat.” acoperă, cât stă pe ecran, rândul cu mărimea piesei.

## Feliile propuse, în ordinea recomandată

Le-ar lucra linia atelierului, la cuvântul owner-ului. Costurile vin din duratele măsurate ale feliilor elicelor (3.Tt:
51 min cu texte, probe, otrăvuri și documente; 3.Tr și 3.Ts: ~1 h 35 min fiecare, cu o piesă nouă).

| # | Felia | Ce schimbă | Cost | Decizia |
|---|---|---|---|---|
| 1 | Otrăvurile elicelor, aduse pe codul de azi | doar listele de otrăvuri | ~45 min | niciuna |
| 2 | Tipărirea spusă cinstit (consola pe praguri, brim) | textele, o funcție pură, o probă pe plasă | ~1 h | întrebarea 1 |
| 3 | Ventilatorul ca trusă (grinda în „Se prinde cu”, „Fă ventilatorul” cu grinda, axul, bucșa) | atelierul | ~1,5 h | întrebarea 3 |
| 4 | Claritatea editorului (sensul, fraza bărcii, avertismentele, „Repede” la elice) | textele, editorul | ~1 h | niciuna |
| 5 | Grosimea după diametru | motorul (piesele de peste prag) | ~1,5 h | întrebarea 2 |
| 6 | Curățenia motorului (secțiunile, butucul, `nr`, `laturiFine`) | motorul, la octet | ~2 h | niciuna; singură |
| 7 | Duza Kort | o piesă nouă din două existente | ~2 h | întrebarea 4 |

3.Tu (axul pieselor rotunde în Modelul) e deja propusă, cu întrebările ei; felia 3 merge bine imediat după ea.

## Întrebările pentru owner (cu recomandarea întâi)

1. **Paletele care ies mult peste strat (pasul mic):**
   - a (recomandat): textul spune pe praguri cât de bine iese și când cere suport sau margine (brim); piesele nu se schimbă;
   - b: în plus, urechile de aderență, la alegere;
   - c: plaja pasului strânsă (cel mai mic, 0,5), ca să nu se mai poată cere o paletă netipăribilă.
2. **Grosimea paletelor la elicele mari:**
   - a (recomandat): crește cu diametrul doar peste un prag (Ø80), deci piesele de azi de sub prag rămân aceleași;
   - b: un câmp „Grosimea paletei”, lăsat omului;
   - c: rămâne cum e.
3. **Ventilatorul ca trusă:**
   - a (recomandat): rândul grinzii în „Se prinde cu” și, la bifă, „Fă ventilatorul” cu grinda, axul și o jumătate de
     bucșă;
   - b: doar rândul grinzii.
4. **Ce funcție nouă întâi:**
   - a (recomandat): duza Kort;
   - b: elicea pliantă;
   - c: niciuna acum.
