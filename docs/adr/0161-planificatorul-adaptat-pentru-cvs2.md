# ADR 0161: Planificatorul Trenuleț adaptat pentru cvs2

**Starea:** acceptat pe 03.11.2026 pentru felia 3.Tb, a liniei Trenuleț (worktree-ul `wip/trenulet`). Owner-ul: „Da, pornește
3.Tb” (sursele planificatorului adaptate pentru cvs2: textul despre sincronizare, stilurile, butoanele pentru mașină).
Continuă ADR 0129 (sursele în repo, construcția fără Python) și ADR 0160 (senderul prin `HostApi`).

## Contextul

De la 3.Ta, sursele v18 ale planificatorului stau în repo, neschimbate. Din ele se construiesc pagina pentru claude.ai, copia
de pe calculator și pachetul extensiei. În cvs2, pagina avea trei probleme:
- spunea că circuitele se văd „pe telefon, tabletă sau calculator”, adevărat doar pe claude.ai;
- avea atribute `style` în marcaj și în șabloane, pe care CSP-ul moștenit de cadru le refuză. Un adaptor le copia prin CSSOM,
  dar consola arăta fiecare refuz de două ori;
- nu putea folosi senderul pe care i-l dă cvs2 din 3.Xc.

## Decizia

### A. Gazda se recunoaște

Intrarea extensiei pune `window.cvs2`: `{ gazda: 'cvs2', masina }`, înghețată și nescriibilă. `masina` e `host.masina` doar
când senderul e deschis extensiei (permisiunea `masina`, în afara live), altfel null. Sursele rămân aceleași pentru toate
locurile. Pe claude.ai și în copia de pe calculator, `window.cvs2` lipsește, deci pagina face ce făcea.

### B. Textele, după gazdă

- **Circuitele**, în cvs2: „Circuitele se salvează singure, în browserul acesta (prin cvs2): pe alt calculator sau în alt
  browser nu apar.” Pe claude.ai rămâne textul cu sincronizarea, iar în copia de pe calculator, „doar pe acest dispozitiv”.
  Planificatorul n-are un import de circuite din `.json`, deci textul nu promite mutarea lor.
- **„Trimite la cvs2”**, cu senderul: paragrafele despre fila nouă și despre `PROTOCOL_CVS2.md` nu se mai arată. Un paragraf
  spune că lucrarea ajunge în „Lucrarea primită” din fereastra Mașina.
- **Previzualizarea 3D**, în cvs2: three.js nu se mai cere de pe cdnjs (CSP-ul cadrului l-ar refuza). Vederea spune că
  lipsește deocamdată, iar piesa și STL-ul merg.

### C. Stilurile

Marcajul și șabloanele paginii nu mai au atribute `style`:
- cele fixe sunt clase în foaia paginii (`head.html`): `.at-rand.intre`, `.rand-butoane`, `.coloana`, `.camp-70`,
  `.camp-80`, `.num.centru`, `.num.pas-n`;
- confirmarea ștergerii unui circuit e clasa `.btn.pericol`;
- culorile venite din date (mostrele atelierului, punctele modelului) stau în `data-fundal` și se pun prin CSSOM, după
  desenare.

Adaptorul care copia atributele prin CSSOM a plecat. În cadru nu mai apare niciun refuz CSP, nici pentru stiluri, nici pentru
scripturi. O probă unitară oprește atributele `style` în surse: `style=` în marcaj și în șabloane, `setAttribute('style')` în
scripturi.

### D. Butoanele mașinii

În foaia exportului CNC, secțiunea „Pe mașină, prin cvs2” apare doar cu `window.cvs2.masina`:
- **starea**, la fiecare schimbare: „Mașina: neconectată…”, „conectată”, „rulează N %”, „în pauză N %”, „oprită…”,
  „în alarmă”, „lucrarea s-a întrerupt”, „lucrarea e gata”, cu programul încărcat (numele și liniile);
- **fișierul exportului**, ales din lista lui, în ordinea tăierii, și **Încarcă pe mașină**;
- **Pornește**, **Pauză**, **Reia** și **Oprește**: fiecare activ doar când are sens în starea de acum, iar cât o cerere
  așteaptă răspunsul (și pe al omului), restul stau oprite;
- **refuzul** unei cereri, sub butoane, în limba omului.

Pornirea și reluarea trec prin confirmarea din cvs2 (ADR 0160 §B). Conectarea, zero-ul, jog-ul și continuarea după M0 sau M6
rămân în fereastra Mașina.

### E. Dovada

Pagina de sine stătătoare nu mai e v18 octet cu octet. Dovada aceea a lui 3.Ta rămâne a ei, pe `754319b`, cu amprenta
`26ca1839…`. De acum:
- testele de referință ale motoarelor (`referinte.js --compara`: piesele, circuitele și fișierele CNC ale setului fix, 622 de
  ieșiri, 0 diferențe) intră în poarta unitară (`trenulet.referinte.test.ts`);
- construcția e probată pe structură (marcajul, foaia, scripturile în ordinea paginii) și e aceeași la fiecare rulare;
- pagina fără cvs2 e probată în Edge: textele de până acum, fără secțiunea mașinii, fără erori.

Pachetul trece la 18.2.0.

## Ce am respins

- **O copie a surselor pentru cvs2:** două variante de întreținut, care s-ar fi despărțit la prima schimbare a motoarelor.
- **`'unsafe-inline'` în `style-src`:** CSP-ul cadrului e moștenit de la aplicație, deci s-ar fi deschis stilurile inline în
  toată aplicația și pentru orice extensie. Clasele ajung.
- **Butoanele mașinii pe fiecare placă din previzualizare:** lista fișierelor din export e deja în ordinea tăierii, iar o
  singură secțiune ține starea, programul și refuzurile la un loc.
- **TypeScript pentru surse acum:** cere conversia a ~1 MB de scripturi clasice, cu propriile probe. Vine într-o felie a ei,
  cu `referinte.js --compara` ca plasă.

## Limite

- Previzualizarea 3D lipsește în cvs2 până intră three.js în pachet (descărcarea cere acordul owner-ului).
- Fonturile paginii, tema și engleza lui cvs2 nu sunt încă în planificator.
- Planificatorul vede numele programului încărcat. Dacă omul încarcă altul din fereastra Mașina, starea îl arată pe acela.

## Probele

- unitare:
  - construcția pe structură și fără atribute `style` (`trenulet.test.ts`);
  - motoarele, 622 de ieșiri, 0 diferențe (`trenulet.referinte.test.ts`);
  - `window.cvs2` cu și fără sender (`trenulet.adaptoare.test.ts`);
- e2e:
  - textul circuitelor, niciun refuz CSP în cadru (ascultat prin `securitypolicyviolation`: consola nu-l arată probelor),
    culorile și confirmarea ștergerii, motivul previzualizării 3D;
  - „Pe mașină, prin cvs2”, cu mașina simulată: starea, încărcarea, pornirea cu confirmarea lui cvs2, „Nu”, pauza, reluarea,
    oprirea;
  - pagina fără cvs2 (`trenulet.spec.ts`);
- otrăvurile țintite: `test/otravuri/3.Tb.py`.
