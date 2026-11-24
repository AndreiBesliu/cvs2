# ADR 0232: Extensiile, stările de lângă drumul bun: pornirea eșuată, actualizarea cu extensia deschisă, refuzurile, lipsa internetului

**Starea:** propus pe 24.11.2026, pentru felia 3.Xi a liniei bibliotecii (ramura `wip/3.Xh-biblioteca-ui`, adusă la `main`
`df9ae53`). Cererea owner-ului, din 23.11: „vreau sa faci un audit si sa imi spui ce ai imbunatatie la UI/UX-ul functiei de
extensii”. La auditul cu 14 constatări și la oferta „fac din ele ADR 0232 propus, cu schița, împărțit pe felii”: „ok”.
**Continuă:** ADR 0231 (fereastra bibliotecii; de acolo vin două lucruri lăsate „la cuvântul owner-ului”: captura mărită și
„ce e nou” în confirmarea unei actualizări), ADR 0230 (marginile bibliotecii; întrebarea 1 atinge „nicio cerere la
pornire”), ADR 0160 (fereastra extensiei), ADR 0164 (lucrul nesalvat la închidere), ADR 0132 §3 (fereastra ținută minte),
ADR 0127 și 0128 (pachetul, permisiunile). **Schița**, cu capturile de azi, machetele propuse și formularul întrebărilor
(colecția `raspunsuri`, documentul `owner`): <https://claude.ai/artifact/31cWBjVheUbymkfErCmcSy>. Cod de produs nu s-a scris: pornește
la răspunsuri.

## Ce e azi (auditul din 23.11)

Build-ul lui `main` de după unirea lui 3.Xh (`f73f3f3`), parcurs cu Playwright (Chrome 153; Edge lipsește din container):
aproape 40 de capturi, la 1440 px și pe telefon (390 px), pe ambele teme, în română și în engleză, plus măsurători în
pagină. Stările grele au fost provocate anume: o extensie împachetată corect care aruncă la pornire, o versiune veche
instalată și deschisă, catalogul oprit și stricat, un fișier care nu e pachet, un `.zip` lăsat pe planșă, pagina
reîncărcată cu o extensie deschisă.

Drumul bun (cauți, instalezi, deschizi) e solid. Golurile sunt în stările de lângă el:

1. **O extensie care nu pornește lasă o pagină albă.** Jos, un singur rând: „Extensia n-a pornit: Cannot read properties
   of undefined (reading 'titlu')”, adică eroarea brută, în engleză. Niciun buton. Din cod: o pornire care nu se mai
   termină rămâne la „Pornesc extensia…” oricât, fără niciun termen.
2. **„Actualizează” din meniu, cu extensia deschisă, o închide.** Omul rămâne în Proiectare, cu meniul deschis pe
   „18.21.0 · actualizată”; extensia nu se redeschide.
3. **Reîncărcarea paginii pierde extensia deschisă.** Aplicația ține minte Proiectare, Mașina și Imprimanta (ADR 0132 §3),
   dar nu extensia: te întorci în Proiectare.
4. **Fraza izolării contrazice permisiunile de deasupra ei.** „Extensia rulează izolată: nu vede proiectele, contul sau
   portul mașinii.” stă chiar sub „Contul (nume, plan): vede dacă ești conectat…” și „Mașina: încarcă programe, le
   pornește…”. Cinci permisiuni au aceeași greutate, cu Mașina, cea mai sensibilă, la mijloc.
5. **Un fișier refuzat apare sub titlul „Instalezi o extensie?”**, cu un singur buton plin, „Renunță”. Motivele sunt de
   programator: „.zip-ul folosește ZIP64”, „un fișier e stricat (CRC)”, „cere altă versiune a lui HostApi”, „un fișier
   nu se potrivește cu amprenta lui (SHA-256)”.
6. **Filele „Toate · 1” și „Instalate · 3”.** „Toate” e catalogul, deci poate fi mai mic decât „Instalate” (extensiile
   din fișier nu sunt în el).
7. **Fără internet (sau cu un catalog stricat)**, stânga spune „Biblioteca are nevoie de internet.”, iar dreapta „Alege o
   extensie din listă.”, cu lista goală. Fila „Instalate” ar merge, dar fereastra nu trece pe ea.
8. **Capturile din pagina extensiei au 197 × 123 px** la birou (din 960 × 600) și nu se măresc: nu se citește nimic din
   ele. Pe telefon au 300 × 188.
9. **Un `.zip` de extensie lăsat pe planșă ajunge la Import**, care îl refuză cu lista formatelor de desen, fără un cuvânt
   despre extensii.
10. **Meniul nu arată care extensie e deschisă.** Alegerea alteia o înlocuiește (o singură filă), fără niciun semn.
11. **× de pe fila extensiei are 24 × 24 px**, și pe telefon, unde restul țintelor au 44. Un nume lung dă o filă de 376 px,
    netăiată.
12. **Paleta (Ctrl+K) nu găsește extensiile instalate.** „Biblioteca extensiilor” da; „Salut”, nimic.
13. **La „Închizi „Salut”?”, butonul plin e cel care pierde lucrul** („Închide oricum”). Focusul e corect, pe „Rămân”.
    La „Scoate”, butonul periculos e roșu.
14. **Confirmarea unei actualizări nu spune ce aduce versiunea**, iar rândurile de „ce e nou” n-au dată.

Mărunte: „Amprenta se verifică la instalare.” e jargon chiar sub butonul Instalează; subtextele din meniu și din listă au
10,8 și 11,7 px; în tema întunecată capturile rămân pete luminoase; `role="menu"` are copii care nu sunt rânduri de meniu
(învelișul rândului, alerta); despre o versiune nouă afli doar când deschizi meniul.

Ce merge bine și rămâne: meniul scurt; pagina extensiei; confirmările („din afara bibliotecii”, „Scoate” cu ce se pierde,
permisiunea nouă scoasă în față); tastatura (săgețile, Escape, focusul întors pe buton, focusul ținut în fereastră);
țintele de 44 px pe telefon; contrastul (cel puțin 5,4 : 1 la textele măsurate, pe ambele teme); pornirea lui Easy 3Draw în
0,2 s.

## Decizia (propusă)

Trei felii, în ordinea în care omul rămâne blocat sau își pierde locul. Machetele sunt în schiță.

### A. Stările rupte (3.Xi-1)

1. **Extensia care nu pornește** primește o stare a ei, la mijlocul ferestrei: semnul și numele extensiei, „<Nume> n-a
   pornit”, o frază pe înțeles („S-a oprit la pornire. Desenul și proiectele tale nu sunt atinse.”) și trei butoane:
   **Încearcă din nou** (pornește din nou cadrul, cel mult o dată la 2 s, regula din `repornire.ts`), **Vezi în
   bibliotecă** (pagina ei, unde sunt „Actualizează” și „Scoate”) și **Închide**. Eroarea brută, versiunea și de unde a
   venit pachetul stau sub **Detalii**, pliate, cu „Copiază”. Eroarea ajunge în jurnal, ca azi. **O pornire care trece de
   10 s** arată aceleași butoane lângă „Pornește greu…”, fără s-o oprească.
2. **Actualizarea unei extensii deschise o redeschide.** Ordinea nouă: întâi salvările extensiei (cel mult 5 s, ADR 0164),
   apoi instalarea, apoi redeschiderea, la versiunea nouă. Dacă rămâne lucru nesalvat, întrebarea de azi („Închizi …?”)
   vine **înaintea** actualizării, iar „Rămân” o oprește: nu se instalează nimic. La fel din pagina extensiei
   („Actualizează la …”).
3. **Extensia deschisă se ține minte la reîncărcare** (întrebarea 3): id-ul ei, în browser (`cncvs2.extensie-deschisa`),
   scris abia când a pornit, șters la închidere și la o pornire eșuată. Gazda o redeschide la montare, fără nicio cerere
   de rețea. O adresă cu `#instaleaza=`, `#biblioteca=`, `#primeste-lucrare` sau `?test` are întâietate.
4. **Refuzul unui pachet** are fereastra lui: titlul „Pachetul nu se poate instala”, numele fișierului, motivul pe
   înțeles, cu termenul tehnic mic, în paranteză, și butoanele **Alege alt fișier…** și **Închide**. Motivele se rescriu
   toate, în ambele limbi (de pildă „Un fișier din arhivă e stricat. Descarc-o din nou. (CRC)”, „Extensia cere o
   versiune mai nouă de cvs2. (HostApi)”).
5. **La „Închizi …?”, „Rămân” e butonul principal**, iar „Închide oricum” ia stilul periculos (roșu, ca „Scoate”).

### B. Claritate și încredere (3.Xi-2)

6. **Fraza izolării**, rescrisă ca să nu contrazică permisiunile: „Rulează izolată: poate doar ce scrie mai sus. Nu-ți
   vede desenul, proiectele, adresa sau parola și nu ajunge singură la mașină.” Permisiunile se înșiră după cât de
   sensibile sunt: Mașina, Formele din desen, Contul, Descărcările, Datele în browser.
7. **Filele** se numesc „Din bibliotecă” și „Instalate”.
8. **Fără internet sau cu un catalog stricat**, fereastra trece singură pe „Instalate” (dacă e ceva instalat), cu o bandă
   deasupra listei: „Biblioteca are nevoie de internet. Extensiile instalate merg și fără.” și „Reîncearcă”. Dreapta nu
   mai spune „Alege o extensie din listă” lângă o listă goală: arată pagina primei extensii instalate sau, fără niciuna,
   cele două drumuri „din afara bibliotecii”.
9. **Meniul marchează extensia deschisă** (un punct și „deschisă”, `aria-current`); un clic pe rândul ei doar te duce în
   fereastra ei. Câte extensii pot sta deschise: întrebarea 2.
10. **Fila extensiei:** × de 28 px la birou și cât `--tinta` la atingere; numele tăiat cu „…” la 22 de caractere, întreg
    în `title`.
11. **Măruntele:** subtextele la 12 px; „Verificată de cvs2 la instalare.” în locul „amprentei”; un chenar subțire pe
    capturi în tema întunecată; rândurile meniului direct sub `role="menu"`, alerta în afara lui.

### C. Descoperire (3.Xi-3)

12. **Captura mărită:** clic (sau Enter) pe o captură o deschide la mărimea ei peste fereastră, cu ← și →, „2 / 3”,
    textul ei alternativ ca legendă și Escape; focusul se întoarce pe captură. Pe telefon, capturile rămân cum sunt.
13. **Un `.zip` de extensie lăsat pe planșă** (întrebarea 4): recunoscut după `extensie.json` din rădăcina arhivei, deschide
    confirmarea instalării, cu avertismentul „din afara bibliotecii”. Orice alt `.zip` rămâne la Import, al cărui refuz
    primește o frază: „O extensie se instalează din meniul Extensii.”
14. **Extensiile instalate în paletă:** „Deschide <nume>”, în grupul „Extensii”.
15. **„Ce e nou” în confirmarea actualizării** (rândurile dintre versiunea omului și cea nouă) și **data lângă versiune**:
    câmpul `data` (`"2026-11-23"`), la alegere, în rândurile `noutati` din `extensii/biblioteca.json` și din catalog. Un
    rând fără dată arată doar versiunea; regula liniilor (ADR 0231, răspunsul 3a) nu primește o poartă nouă.
16. **Vestea despre o versiune nouă** (întrebarea 1): un punct pe butonul Extensii, din ce se știe deja. Catalogul se cere
    tot doar la deschiderea meniului sau a bibliotecii; ce a găsit se ține în browser (`cncvs2.extensii-noi`) până la
    actualizare sau la scoatere, deci punctul rămâne și după reîncărcare.

### D. Marginile păstrate

- Izolarea, CSP-ul, `HostApi` v1 și catalogul permisiunilor nu se schimbă. Nicio permisiune nouă.
- **Nicio cerere de rețea la pornire** (ADR 0230), afară de cazul în care owner-ul alege 1b.
- Pachetele nu se schimbă: Easy 3Draw rămâne la versiunea lui (`data` e un câmp al listei bibliotecii, nu al pachetului).
- Codul nou stă în bucățile la cerere ale extensiilor (gazda, fereastra bibliotecii). Textele sunt date (`mesaje/`).

### E. Mărimea (estimată; măsurătorile, la implementare)

- **Pornirea: +0.** Are 109,6 kB din 115 (cu ușa 114,1; cu Atelierul 114,4): mai sunt 0,6 kB. Singurul punct care o poate
  atinge e paleta (14): dacă lista extensiilor nu ajunge la paletă în cel mult 0,1 kB, punctul rămâne pe dinafară, cu
  motivul scris.
- **Totalul: ~+5 kB** din 900 (acum 800,1): 3.Xi-1 ~1,5, 3.Xi-2 ~1, 3.Xi-3 ~2,5.

### F. Feliile, fiecare cu ceva de încercat pe canalul `biblioteca`

| Felia | Ce aduce | Întrebarea de care ține |
| --- | --- | --- |
| 3.Xi-1 | Stările rupte: pornirea eșuată sau grea, actualizarea cu redeschidere, extensia ținută minte, refuzul unui pachet, „Rămân” principal | 3 |
| 3.Xi-2 | Claritate: fraza izolării și ordinea permisiunilor, filele, lipsa internetului, extensia deschisă în meniu, fila ei, măruntele | 2 |
| 3.Xi-3 | Descoperire: captura mărită, `.zip`-ul pe planșă, paleta, „ce e nou” la actualizare și data, punctul versiunii noi | 1, 4 |

## Întrebările (recomandarea întâi)

1. **Vestea despre o versiune nouă.**
   - **a)** Un punct pe butonul Extensii, din ce se știe deja: catalogul se cere tot doar când deschizi meniul sau
     biblioteca, iar ce a găsit se ține minte în browser. Nicio cerere la pornire. **Recomandat.**
   - b) În plus, o verificare în fundal, cel mult o dată pe zi, după pornire. Schimbă „nicio cerere la pornire” din ADR
     0230.
   - c) Ca azi: afli doar în meniu.
2. **Câte extensii stau deschise deodată.**
   - **a)** Una, ca azi. Meniul arată care e deschisă; trecerea la alta o închide pe prima, cu salvările ei.
     **Recomandat.**
   - b) Mai multe, fiecare cu fila ei. E o linie a ei: fiecare cadru rămâne viu (memorie), iar senderul și „Trimite la…”
     trebuie să știe cărei extensii îi vorbesc.
3. **La reîncărcarea paginii.**
   - **a)** cvs2 redeschide extensia în care erai, ca fereastra Mașina; nu și una care n-a pornit data trecută.
     **Recomandat.**
   - b) Pornește mereu în Proiectare, ca azi.
4. **Un `.zip` de extensie lăsat pe planșă.**
   - **a)** cvs2 îl recunoaște și deschide confirmarea instalării. **Recomandat.**
   - b) Doar refuzul Importului spune unde se instalează extensiile.
5. **Cât facem.**
   - **a)** Toate cele trei felii, în ordinea de mai sus. **Recomandat.**
   - b) Doar 3.Xi-1 (stările rupte); restul, la cuvântul owner-ului.

## Ce am respins

- **Actualizarea singură, fără clic:** o extensie cu permisiunea Mașina nu-și schimbă codul fără ca omul s-o ceară.
- **Un sistem nou de mesaje plutitoare** pentru „actualizată”: zona de mesaje a aranjamentelor (ADR 0250) vine cu linia
  ei; până atunci, starea se vede în meniu și pe pagină.
- **Căutarea și categoriile în bibliotecă:** rămân pentru peste ~20 de extensii (ADR 0231).
- **Note, stele, numărul de instalări:** cer server și conturi; biblioteca rămâne o listă servită lângă aplicație.
- **Semnul pe buton cu o cerere la pornire, ca implicit:** e varianta 1b; schimbă o margine hotărâtă de owner.

## Limite

- La reîncărcare, extensia apare după ce vine bucata gazdei: o clipă se vede Proiectarea.
- Punctul versiunii noi poate fi vechi (o versiune și mai nouă, apărută între timp): se îndreaptă la primul meniu deschis.
- Un `.zip` e socotit extensie doar dacă are `extensie.json` în rădăcină; un pachet stricat de tot ajunge la Import.
- „Încearcă din nou” repornește același cod: ajută la o pornire căzută din întâmplare, nu la un pachet greșit; de aceea
  stă lângă „Vezi în bibliotecă”.
- Starea „Pornește greu…” nu poate ști dacă extensia s-a blocat sau doar lucrează: doar oferă ieșirile.

## Probele (scrise întâi, la cod)

- **e2e**, pe fiecare stare: extensia care aruncă la pornire (cele trei butoane, „Detalii”, „Încearcă din nou” după un
  pachet reparat); actualizarea din meniu și din pagină cu extensia deschisă (redeschisă la versiunea nouă; cu lucru
  nesalvat, „Rămân” lasă versiunea veche instalată); reîncărcarea (redeschisă; nu și după o pornire eșuată; adresa cu
  `#biblioteca=` are întâietate); refuzul fiecărui motiv; lipsa internetului cu și fără extensii instalate; captura
  mărită cu tastatura; `.zip`-ul lăsat pe planșă (extensie și ne-extensie); paleta; punctul după reîncărcare, fără nicio
  cerere a catalogului la pornire (cererile paginii, numărate).
- **Încăperea**, cu fontul lat, la 1024, 1280 și 390 px: fila cu nume lung, starea „n-a pornit”, fereastra refuzului.
- **Unitare:** ordinea permisiunilor, rândurile de „ce e nou” dintre două versiuni, citirea tolerantă a lui `data`,
  recunoașterea unui pachet după `extensie.json`.
- **Manualul**, în ambele limbi, pentru fiecare control nou (`%% acopera:`); traducerile roadmap-ului.
- **Otrăvurile**, în clonă, pe fiecare felie.
- **Mărimea:** pornirea neschimbată, măsurată pe fiecare felie.

## Se redeschide dacă

- owner-ul vrea mai multe extensii deschise deodată (2b) sau verificarea în fundal (1b);
- biblioteca trece de ~20 de extensii (căutarea, categoriile);
- o extensie cere să pornească singură la deschiderea aplicației, fără ca omul s-o fi lăsat deschisă;
- redeschiderea la reîncărcare încurcă un flux (primirea unei lucrări, testul pas cu pas).
