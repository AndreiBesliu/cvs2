# ADR 0131: Pachetul de atelier: fișierele de probă T0–T7 și fișele lor

**Starea:** acceptat pe 02.11.2026, la felia 4.6↑b: etapa 4, punctul 6 din `PLAN.md` §5.3, partea a doua, la cuvântul
owner-ului („Da, pornește”, la „Pornesc 4.6↑b, pachetul de atelier T0–T7?”). **Continuă:** ADR 0125 (contractele
atelierelor), ADR 0083 (familia GRBL), ADR 0009 (T9). **Sursa:** sonda s8 (`docs/faza2/sonde/s8-posturi/RAPORT.md`, §5.10,
§5.11 și Anexa B) și placa 3 (`PLAN.md` §5.3). **Documentul și aplicația:** neschimbate.

**Problema.** Cele opt contracte sunt doar „documentate”. S8 cere ca proba să vină din ateliere: un pachet de fișiere mici,
generat de aplicație cu același post, cu valorile calculate pe hârtie, iar rezultatele să intre în repo ca teste legate de
fișierul trimis.

## Decizia

1. **Generatorul** stă în `test/ateliere/pachet.ts`; `node test/ateliere/genereaza.ts` scrie pachetele, iar `--verifica` le
   compară. Pentru fiecare controler scrie setul din s8 („Setul minim pe controler”) cu postul aplicației și contractul
   controlerului. Pachetele stau în repo, octet cu octet, ca plăcile: `test/ateliere/<controler>/` (fișierele de probă și
   `FISA.md`) și `test/ateliere/<controler>.zip`. Un pachet trimis rămâne exact cel din repo, iar amprenta lui e în fișă.
2. **Testele**, cu valorile pe hârtie (toleranțele plăcii 3, unde le are):

   | Test | Ce probează | Unde | Valoarea pe hârtie |
   |---|---|---|---|
   | T0 | antetul și comentariile se citesc | în aer | nicio eroare (sau linia ei) |
   | T1 | arcele: modul I/J, sensul, niciun cerc fals | MDF, 1 mm | canalul cercurilor Ø50 (2 × 180° și 4 × 90°) cu Ø6: Ø56,00 / Ø44,00 ±0,2; centrele la 100,00 ±0,2; dreptunghiul cu R5: 106,00 × 66,00; arcul R1200 (coarda 80), arcul mic (coarda 0,05) scris G1 |
   | T2 | avansul, pauza, punctul zecimal | în aer | 200 mm în 12,0 s la F1000 și în 6,0 s la F2000 (±0,5); pauza de 2,0 s (±0,3); pe Syntec, `X10` = 0,010 mm |
   | T3 | elicea | MDF | gaura Ø20 cu Ø6, 3 spire de 1 mm: adâncimea 3,0 ±0,1, Ø20,0 ±0,2 |
   | T4 | schimbarea sculei | MDF | pătratele adânci de 2 mm cu Ø6 și Ø3,175: diferența 0,0 ±0,1 |
   | T5 | WCS-ul | MDF | același pătrat în G54 și în G55, decalat cât pune omul |
   | T6 | limita liniei (GRBL 1.1) | în aer | 79 de caractere utile trec, 80 dau `error:11` |
   | T7 | găurirea în pași (GRBL 1.1) | MDF | 4 găuri Ø6, în pași de 2 mm: 10,0 ±0,1 |

3. **Variantele de probă există doar în pachet.** Unde contractul e încă prudent, fișierul probează chiar controlerul:
   - arcul R1200 e scris ca arc (pe NcStudio și RichAuto, contractul ține raza de 1 000 mm);
   - elicea e scrisă cu Z pe RichAuto;
   - T0 are stilurile de comentariu (A fără, B contractul sau `( )`, C alternativele câte unul pe linie, D antetul maxim pe
     RichAuto);
   - T5 scrie G54 și G55, și pe RichAuto, care altfel nu scrie WCS-ul;
   - pe Syntec, `X10` fără punct, cu `M0` ca ecranul să se poată citi;
   - pe GRBL 1.1, liniile de 79 și 80 de caractere.

   Rândurile brute, scrise de mână, stau doar în fișierele de probă. În aplicație, postul rămâne singurul care scrie G-code.
4. **Schimbarea sculei la T4** e cea pe care o probează fiecare controler: bariera senderului (GRBL 1.1), M6 la controler
   (grblHAL cu `$341`, FluidNC cu ATC, Syntec, Mach3, Mach4), câte un fișier pe freză (NcStudio, RichAuto).
5. **Fișa** (`FISA.md`, în română) are:
   - versiunea controlerului și setările de verificat (cele din contract, plus `$341` sau ATC unde e cazul);
   - materialul (MDF de rebut, cel puțin 250 × 150 × 12, frezele Ø6 și Ø3,175) și zero-ul;
   - prima rulare în aer, cu Z0 la 20 mm deasupra materialului;
   - tabelul: ce probează fiecare fișier, unde, ce se măsoară cu valoarea pe hârtie și coloana „Măsurat”;
   - ce se trimite înapoi și amprentele SHA-256.
6. **Arhiva** e un ZIP fără comprimare, cu data fixă (1980-01-01), deci aceiași octeți la fiecare generare.
7. **Pentru GRBL 1.1, pachetul e chiar setul plăcii 3.** Felia 3.9 rămâne cu mașina: comutarea pe live, fișa plăcii 3,
   recalibrarea.
8. **Cum se închide proba** (s8, Anexa B): rezultatele atelierului (cotele, versiunea, setările, pozele) intră în repo ca un
   test legat de amprenta fișierului. Câmpurile contractului trec atunci din „documentat” în „probat”, cu data, versiunea
   controlerului și fișierul. Asta vine cu primele rezultate.

## Probele

- **Pe hârtie** (`test/unit/ateliere.test.ts`), cu cititorul dialectelor scris după s8:
  - setul și numele fiecărui controler (ASCII, cel mult 8 caractere, sub 300 de linii);
  - T1: cercul A în 2 arce de 180°, cercul B în 4 de 90°, raza 25, centrele la 100, cele 4 colțuri R5, arcul R1200 scris ca
    arc și scurt, arcul mic ca G1, totul la Z −1;
  - T2: timpii 12 și 6 s din lungimi și avansuri, pauza de 2 s unde contractul o scrie, proba punctului zecimal pe Syntec;
  - T3: elicea pe raza 7, Z-urile −0,5 … −3, 4 ture;
  - T4: Z −2 cu ambele freze și forma schimbării pe fiecare controler; T5: G54 și G55;
  - T6: 79 și 80 de caractere utile; T7: pașii −2 … −10 la fiecare gaură;
  - fișa: fiecare fișier, cu amprenta lui și cu setările contractului.
- **De aur** (`test/unit/ateliere.aur.test.ts`): pachetele comise sunt exact cele generate (fișierele, fișa, arhiva), fără
  nimic în plus. Arhivele trec și prin cititorul zip al lui Python (CRC-urile, conținutul).
- **Otrăvurile:** lista `test/otravuri/4.6b.py`, cu o otravă-martor care trebuie să scape.

## Limitele

- Fișa e în română, fiindcă atelierele probei sunt în România. Engleza vine când pachetul pleacă în afară.
- Pachetul e unealta probei. Nimic nu e probat pe fier de la el.
- Pachetul nu e în aplicație. Îl trimite owner-ul (fișierul din repo sau arhiva lui). Un „probează-ți controlerul” pentru
  utilizatori ar fi o felie a lui.
- T6 e doar pe GRBL 1.1, după setul minim. Fișierul Mach3 demo (600 de linii) și cel pentru DSP-uri (200 000 de linii) se
  fac la cerere.

## Respinse

- **Pachetul generat la build și publicat la `/ateliere/`:** ar cere pagini noi sub CSP, scoaterea lor din precache și un
  plafon nou, pentru un document pe care îl trimite owner-ul. Repo-ul ține și amprentele.
- **Rânduri brute în post** (o ușă pentru orice text în G-code): stau doar în generatorul probei.
- **Freza Ø3 din s8 în loc de Ø3,175:** placa 3 a owner-ului cere Ø3,175, iar diferența de adâncime nu ține de diametru.
