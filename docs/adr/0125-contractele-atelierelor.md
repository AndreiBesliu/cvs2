# ADR 0125: Contractele atelierelor: NcStudio, RichAuto, Syntec, Mach3 și Mach4

**Starea:** acceptat pe 02.11.2026, la felia 4.6↑a: etapa 4, punctul 6 din `PLAN.md` §5.3 („Contractele NcStudio, RichAuto,
Syntec, Mach3 / Mach4 și pachetul de atelier”), la cuvântul owner-ului („Da”, la „Pornesc felia următoare de pe linia
principală, contractele controlerelor?”). **Continuă:** ADR 0009 (T9: un singur post, contracte de dialect ca date) și ADR
0083 (familia GRBL, cele 4 strategii de schimbare a sculei). **Sursa faptelor:** sonda s8
(`docs/faza2/sonde/s8-posturi/RAPORT.md`, §5 și Anexa A.4–A.8). **Documentul:** neschimbat. **Urmează:** 4.6↑b, pachetul de
atelier (fișierele T0–T7, fișele cu setările controlerului și valorile pe hârtie).

**Problema.** Postul avea doar familia GRBL. Planul (T9) cere 7 contracte în v1, adică 8 controlere, cu Mach3 și Mach4 separate.
Sonda s8 a arătat că ele diferă în 6 puncte care strică piesa: comentariul, codul unităților, punctul zecimal, modul I/J,
unitatea pauzei și schimbarea sculei. Contractul de până acum le presupunea pe toate prezente: comentarii, inch, o pauză, un WCS
și `T… M6` pe o linie.

## Decizia

1. **Cinci contracte noi, ca date** (`src/post/contracte/`), toate „documentate”, cu sursa fiecărui câmp din s8. În fereastra
   exportului, după familia GRBL:

   | Contract | Comentariu | Unitățile | Pauza | Schimbarea sculei (implicit) | Începutul și sfârșitul |
   |---|---|---|---|---|---|
   | NcStudio | `'` până la capătul liniei | G21 / G20 | `G4 P` în ms | fișiere separate (n-are M06); M0 | fără G94; `M30` |
   | RichAuto | niciunul | fără cuvânt, doar mm | niciuna (întârzierea controlerului) | fișiere separate | doar `G90`, fără WCS; `M30` |
   | Syntec | `( )` | G71 / G70 | `G4 P` în ms, întreg | `T… M6`, apoi `G43 H…` (și la pornire) | `%`, `O0001` … `M30`, `%` |
   | Mach3 | `( )` | G21 / G20 | `G4 P` în secunde | `T…`, apoi `M6` singur | `G91.1` pe linia lui; `M30` |
   | Mach4 | `( )` | G21 / G20 | `G4 P3.000` (secunde în ambele ediții) | `T…`, apoi `M6` singur | `G91.1`; `M30`, `%` |

2. **Contractul are câmpuri noi.** Familia GRBL le primește cu valori care nu-i schimbă programul cu niciun octet.
   - Pot lipsi (`null`): `comentariu`, `pauza`, `wcs` și `unitati.inch`.
   - `inceput`: liniile dinaintea comentariilor.
   - `scula.schimbare`, `scula.pornire`, `scula.compensare`: șabloane, cu `{n}` = numărul sculei. Pe Syntec, compensarea
     vine după antet și după WCS, fiindcă `G49` din antet ar anula-o.
   - `rapidaSeparata`, `setari`, `senderAplicatie`, `numeScurt`.
   - Setările sunt cele de care depinde înțelesul fișierului (s8 §5.10), cu numele lor de pe controler. Se scriu în antet, ca
     comentarii, și apar în fereastra exportului: NcStudio N4063, N4034, N4035; RichAuto F Read, AbsCntr și întârzierea axului;
     Mach3 unitatea lui G04 și oprirea la M6.
3. **Ce nu se poate scrie se refuză, cu motivul:**
   - inch pe RichAuto;
   - o ieșire din foaie confirmată, pe un contract fără comentarii: confirmarea stă în program (decizia din 07.10);
   - o pauză din program, pe un contract fără pauză.
4. **Arcele** au aceleași gărzi: coarda ≥ 10 rezoluții, unghiul ≥ 1e-4 rad, cel mult 180° pe bloc.
   - Raza maximă e de 1 000 mm pe NcStudio și RichAuto (postul Autodesk pentru NcStudio ține R între 0,01 și 1 000 mm) și de
     10 000 mm pe celelalte. Un arc mai mare iese în segmente G1, la cel mult 0,001 mm de el.
   - Pe RichAuto, elicea iese tot în segmente: nicio sursă n-o pomenește.
5. **O deplasare rapidă cu XY și Z** se scrie pe aceste cinci în două linii: la urcare întâi Z, la coborâre întâi XY. Pe Syntec,
   G00 poate merge în „L” (parametrul #411); pe celelalte, nu știm. Familia GRBL rămâne cu o linie, fiindcă la ea G0 e o linie
   dreaptă.
6. **Senderul vorbește doar familia GRBL.**
   - Exportul cu un post al atelierelor doar se descarcă și nu ajunge în panoul mașinii: acolo, un `G4 P3000` ar fi o pauză de
     50 de minute.
   - `bariera-sender` e acceptată doar unde e senderul.
   - Dicționarul codurilor controlerului (ADR 0085) rămâne al familiei GRBL.
7. **Numele fișierelor** le dă exportul (`numeFisier`), cum erau până acum. Pe RichAuto, care citește de pe un stick FAT, au cel
   mult 8 caractere ASCII, cu majuscule: `CNCVS2.NC` și `CV<ordinea>T<n>.NC`.
8. **Fereastra exportului:**
   - lista are cele opt posturi;
   - inch dispare pe RichAuto;
   - două note noi: „doar se descarcă” și „Verifică pe controler, înainte de pornire: …”;
   - eticheta unităților nu mai numește G21 / G20, fiindcă Syntec scrie G71 / G70.

## Probele

- **Pe hârtie** (`test/unit/post.contracte.ateliere.test.ts`): programul întreg al fiecărui contract nou, cu o schimbare de
  sculă. NcStudio e probat și cu M0, și cu fișiere separate; Syntec, și în inch (G70, X0.78740).
- **Contractele ca date:**
  - plafonul de 70, zecimalele, strategiile;
  - `bariera-sender` doar cu senderul, `m0-comentariu` doar cu comentarii, M6 doar cu M6 la controler;
  - sursele pe 16 câmpuri;
  - codurile fiecăruia, toate în codurile documentate ale controlerului (lista din s8, pe hârtie; M30 al RichAuto e marcat de
    probat).
- **Pe corpusul CAM.** Un cititor al dialectelor (`test/unit/ajutor-dialecte.ts`), scris doar după s8, citește programele celor
  opt contracte, în mm și în inch, cu fiecare grupă de strategii.
  - Mișcările, avansurile, pauzele, turațiile și sculele sunt aceleași ca la GRBL 1.1.
  - Unde un arc iese în segmente G1 (raza peste 1 000 mm, elicea pe RichAuto), fiecare capăt de segment stă pe arc la cel
    mult 0,003 mm.
- **Fiecare cuvânt scris e în contract:**
  - X, Y, Z, I, J și F au mereu punctul zecimal (pe Syntec, `X10` ar însemna 0,010 mm);
  - P e întreg pe contractele în ms și are punct pe cele în secunde;
  - pauza e de 3 s pe toate.
- **Restul, pe hârtie:** refuzurile RichAuto, deplasarea rapidă despărțită (Syntec) și nedespărțită (GRBL 1.1), numele
  fișierelor.
- **Familia GRBL:** aceleași programe, octet cu octet (probele ei, corpusul CAM prin bazin, plăcile).
- **E2e:**
  - NcStudio: notele, antetul cu apostrof și setările, `G4 P3000`, fără G94;
  - RichAuto: fără inch, `CNCVS2.NC`, fără comentarii;
  - panoul mașinii: butonul exportului e oprit după un export NcStudio și pornit după unul GRBL 1.1.
- **Otrăvurile:** lista `test/otravuri/4.6a.py`, 18 mutații.

## Limitele

- **Nimic din cele cinci nu e probat pe fier.** Pachetul de atelier (4.6↑b) aduce fișierele T0–T7 și fișele. Contractele trec
  din „documentat” în „probat” cu rezultatele atelierelor (s8, Anexa B).
- **RichAuto e cel mai neclar:** comentariile, M30, G21 / G17, M6 și elicea nu apar în manual. S8 socotește două runde de probă.
- **`G43 H` pe Syntec** cere tabela de scule, sau 0 la fiecare sculă, dacă Z se face pe fiecare.
- **Pe Mach3, unitatea pauzei** e o setare a profilului: antetul și fereastra o spun, iar T2 o probează.

## Respinse

- **Câte un post scris de mână pe controler:** e drumul ediției întâi (s8 §3.2).
- **O pauză G4 pe RichAuto cu o unitate ghicită.** În secunde, ar ieși 2 ms dacă unitatea e de fapt ms, iar freza ar tăia
  înainte de turație. În ms, ar ieși 50 de minute dacă unitatea e de fapt secunde. Întârzierea din controler e documentată.
- **Comentariile pe RichAuto înainte de probă:** pot opri citirea fișierului.
- **Exportul atelierelor în panoul mașinii:** senderul vorbește doar familia GRBL.
