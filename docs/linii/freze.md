# Frezele (16.A↑, ADR 0300–0309)

_cncvs2, biblioteca de freze („Frezele mele”), felia 16.A↑ adusă din etapa 16: ramura `wip/16.A-freze` (din `main`
`c8b235ab`), ADR-urile 0300–0309 (liber: 0305), canalul `freze`; ADR 0300 ACCEPTAT pe 23.11 („Da, 1a–6a”), ADR 0302 ACCEPTAT pe
24.11 („Da, 1a–5a”); 16.A↑a … 16.A↑h-5 și 16.A↑b-1 … 16.A↑b-7 UNITE în `main`; ADR 0303 PROPUS pe 26.11 (bila și toroidala în
proiect), ACCEPTAT pe 27.11 cu recomandările (1a–5a); 16.A↑e-1 (documentul v31, toroidala în simulare, refuzul lucrării) raportată gata de unit pe 26.11 (`7c3f166b`, cu
`main` `0df06eca` adus), UNITĂ în `main` pe 27.11 (`8b92246d`); 16.A↑e-2 (elicea cu bila și cu toroidala în nucleu) raportată
gata de unit pe 27.11 (`e5bdde83`, PR-ul #71), UNITĂ (`0d2a8c2c`); 16.A↑e-3 (canelura cu bila și cu toroidala) UNITĂ pe 27.11
(`db066160`); 16.A↑e-4 (bila și toroidala în proiect: fereastra exportului, Tăierea, biblioteca) UNITĂ pe 27.11 (`72263843`);
16.A↑e-5 (buzunarul cu bila și cu toroidala, cu creasta pe fund) raportată gata de unit pe 27.11 (`106b4a51`, PR-ul #74);
16.A↑e-6 (profilul pe o parte cu bila și cu toroidala, cu adâncimea cel puțin raza colțului) pe `wip/16.A-freze-e`, peste ea;
ADR 0304 PROPUS pe 27.11 (profilul desenat), mers cu recomandările; 16.A↑f-1 (documentul v32, nucleul) și 16.A↑f-2 (canelura) UNITE
în `main` pe 27.11 (`8906dedf`, din `36866d16`, PR-ul #74); 16.A↑f-3 (profilurile parametrice în proiect) raportată pe 27.11 (`0a1fd1a4`, PR-ul #78), unită de sesiunea principală din acel commit; 16.A↑f-4 (marginea profilată pe o parte) pe aceeași ramură, peste ea_

Pornită pe 23.11.2026, în sesiunea cloud a liniei, la cererea owner-ului: „Vreau sa pot crea freze l sau profiluri de freze in
aplicatie si sa le salvez in cont”. Rândurile din prag: „Bibliotecă de freze cu geometrie reală (dreaptă, bilă, toroidală, V,
gravare, profil, formă desenată)” și „Freze de profil desenate de utilizator; roundover cu offset față de interior”.

## Starea

- **23.11, seara:** ADR 0300 propus (`docs/adr/0300-biblioteca-de-freze.md`), cu rândul în indexul ADR și titlul tradus.
  Schița: <https://claude.ai/artifact/HntiSsxBQyPFmZoA8B39EP> (machetele pe ambele teme, la birou și la 390 / 360 / 320 px;
  editorul frezei se poate încerca; răspunsurile se salvează în pagină, în `raspunsuri/owner`, doar de owner, verificat cu
  un vizitator obișnuit, refuzat). Fără cod de produs.
- **Întrebările** (recomandarea în față, toate „a”): 1 ce e „profilul de freză” (amândouă: forma desenată și valorile de
  lucru), 2 conflictul pe două calculatoare (îmbinarea pe câmpuri), 3 diametrul măsurat (CAM-ul taie cu el), 4 proiectul
  când freza se schimbă (copia cu originea ei, v27), 5 salvarea în cont și planul (cere un plan activ; altfel doar citire),
  6 ordinea feliilor (browserul, alegerea în proiect, apoi contul).
- **23.11, seara: ADR 0300 acceptat**, cu toate recomandările („Da, 1a–6a”). Pornită felia 16.A↑a.
- **23.11, 22:20: 16.A↑a gata pe ramură** (`1e330fd2` fereastra, plus probele și documentele): biblioteca în browser
  (IndexedDB `cncvs2-freze`), fereastra „Frezele mele” din meniul contului și din paletă, frezele de pornire, fișierul JSON /
  CSV, manualul. Unitare 23 noi, e2e 9 noi; suita unitară 9 907 / 9 919; otrăvuri 46 / 46. Pornirea +0,2 kB (legătura),
  totalul +9,0 kB (779,9 / 800).
- **23.11, 23:10: `main` adus de două ori** (`f73f3f37`: 3.Xh, 12.1↑e-3, 12.1↑e-4; `ebfb1f82`: A.8a, A.8b, 25.9↑).
  Completul de pe `d4dce8df` căzuse la rândurile meniului contului din proba tichetelor de pe emulatoare (reparat în
  `218eed21`). Pe ramura cu `ebfb1f82`: pornirea 109,4 kB (cu ușa 113,9, cu Atelierul 114,2 / 115), **totalul 793,6 /
  800 kB: mai rămân 6,4 kB** (felia singură, tot +9,0).
- **23.11, 22:55: plafonul total 900 kB** (ADR 0301, „ok, ridica plafonul total la 900 kB”), pe ramură peste `2c3fd99b`;
  16.A↑a o unește sesiunea principală, în lotul ei (`unire-2311k`), iar ADR 0301 după el. Pornirea rămâne 115 kB: cu
  Atelierul, 114,2 / 115, deci 16.A↑b nu trebuie să pună nimic înaintea primei randări.
- **24.11, noaptea: 16.A↑a și ADR 0301 unite în `main`** (`b1797933`, a noua unire din cloud, de sesiunea principală, în
  lotul `unire-2311k`; PR-ul #12 închis ca unit). Completul liniei, verde pe `218eed21` și pe `2c3fd99b`. Ramura adusă la
  `main`; următoarea felie, 16.A↑b (alegerea în proiect, documentul v27), la cuvântul owner-ului.
- **24.11, dimineața: 16.A↑b-1 gata pe ramură** (la „continua” al owner-ului; `7fb16ec3` documentul v27, `f999c180`
  corpusul de aur, `c5be2f07` programul, plus documentele). Felia 16.A↑b s-a împărțit: **b-1** documentul v27 (`biblioteca`,
  `regim`, `tais` pe orice freză) și valorile frezei în program (turația, avansul, plonjarea, refuzul peste tăiș, turațiile pe
  același T), fără interfață; **b-2** lista „Freza” pe rândurile exportului și în Tăierea (după fereastra exportului refăcută,
  ADR 0290, dacă e unită); **b-3** nota schimbării din bibliotecă. Unitare noi 31; otrăvuri 34 / 34. Pornirea 109,5 kB (cu
  ușa 114,0, cu Atelierul 114,3 / 115: mai rămân 0,7 kB), totalul 800,5 / 900. **De acum, un câmp nou al documentului ia
  v28.**
- **24.11, 11:29: 16.A↑b-1 unită în `main`** (`112c32f6` în `32b33a42`, a paisprezecea unire din cloud, de sesiunea
  principală, în lot cu 3.Ts și A.11b–A.11e; vârful `main` `356db9bd`). Completul liniei, verde pe `112c32f6`; porțile
  lotului, verzi pe `32b33a42` (unit 10 111 / 0, e2e 655 / 655, funcțiile 126 / 126, paginile 53 / 53). Ramura adusă la
  `356db9bd` (`d751782a`; DEVLOG-ul luat din `main`, unde intrarea feliei era deja). PR-ul #16 rămâne deschis, pentru
  feliile următoare. **Pornirea, pe `main`: 114,7 / 115 kB cu ușa și cu Atelierul (mai sunt 0,3 kB):** lista „Freza” stă
  doar în bucățile la cerere (fereastra exportului, panoul Tăierea); dacă atinge pornirea, stop și cifra, la owner.
  Controalele cu nume cer `node scripts/catalog-controale.ts --scrie`. Întrebarea la owner: 16.A↑b-2 pe fereastra
  exportului de azi, sau întâi 16.A↑c (contul) cât PR-ul #11 (fereastra refăcută) așteaptă unirea.
- **24.11, 09:30–10:30: 16.A↑c gata pe ramură** (la „b, pornește 16.A↑c” al owner-ului; `95e1fe1a` serverul, `a4032473`
  clientul, `2c54281a` proba cap-coadă, `623d4d01` probele întărite și otrăvurile, plus documentele). Callable-ul `freze`,
  capabilitatea `cloud`, biblioteca contului în browser (`cont:<uid>`), îmbinarea pe câmpuri, conflictul, aducerea din
  browser la prima logare. Otrăvuri 47 / 47. Totalul 806,1 → 810,5 / 900, pornirea neschimbată, contul 30,3 / 32. **La
  publicare merge și serverul** (funcția `freze`, indexurile); sincronizarea se încearcă pe adresa principală de test.
  PR-ul #16 închis de sesiunea principală; 16.A↑c e PR-ul #20. Ramura adusă la `e3a9e512` (A.7; vârful `8552db16`).
- **24.11, ~12:55: forma bilei, stabilită cu linia reliefului** (18.1↑, `wip/18.1-relief`, ADR 0310 §13, `4f37762d`; owner-ul
  a răspuns „a” la întrebarea 3 din ADR 0310: bila vine cu relieful, în felia finisării, 18.1↑c): `scula.forma = { tip: 'bila' }`, fără câmpuri, ca IR-ul; lipsa
  formei rămâne plata. Toroidala (16.A↑e, la noi): `{ tip: 'toroidala', raza }`, 0 < raza < Ø / 2 strict; raza = Ø / 2 se
  scrie doar ca bilă (o singură scriere pe freză). Ce formă primește fiecare operație stă într-o singură funcție,
  `motivFormaPeOperatie(tip, latura, forma)` în `src/model/formaFrezei.ts`, scrisă de cine ajunge întâi în `main` (16.A↑b-2
  o citește pentru lista „Freza”; 16.A↑e doar lărgește tabelul). „Bilă” în bibliotecă imediat după relief, fără să aștepte
  16.A↑e. **Schema** (sesiunea principală, 13:08): cotele au rămas fără schemă nouă (ADR 0330, 1a), deci **v28 e al
  reliefului** (forma `relief` și bila, în 18.1↑c); următorul liber e v29. 16.A↑e și 16.A↑f cer fiecare numărul lor, de la
  sesiunea principală, când ajung la migrare. Pe 24.11, 13:13: linia reliefului are deja `motivFormaPeOperatie` pe ramura ei
  (doar V-ul); 16.A↑b-2 a scris-o în `src/model/formaFrezei.ts`, cu aceeași semnătură: cine unește a doua ia versiunea din
  `main` și își adaugă rândul.
- **24.11, 11:20–11:55: 16.A↑b-2 gata pe ramură** (la „continua cu 16.A↑b-2” al owner-ului): freza din bibliotecă în secțiunea
  Tăierea (`f02eb0e4` modelul, `7771b346` panoul, `f0895a1b` otrăvurile, `aa1b418d` proba R02). Fereastra exportului refăcută
  (PR-ul #11) nu e unită, deci **feliile s-au renumerotat:** b-2 = Tăierea (acum), **b-3 = rândurile exportului** (lista
  „Freza” pe freza operației, pe fundul plat, pe frezele de rest, ale dopului și ale benzii; pe fereastra refăcută, după
  unirea ei), **b-4 = nota „s-a schimbat în bibliotecă”** (fostă b-3). Generatorul roadmap-ului nu primește un id ca
  „16.A↑b-2a” (`RE_ID` din `scripts/documentatie.ts`: după `-N` nu vine literă). Identitatea frezei montate ține acum și
  turația (`aceeasiFreza`, și la roluri). Biblioteca (`frezeMele.ts`) stă acum într-o bucată comună panoului și ferestrei.
  Otrăvuri 22 / 22. Totalul 810,5 → 812,2 / 900, pornirea neschimbată (cu Atelierul 114,8 / 120). Nimic pe server.
- **24.11, 12:20–13:10: 16.A↑a-2 gata pe ramură** (la „sa ai in vedere ca biblioteca de freze trebuie sa fie populata cu freze
  default standard”): setul de pornire cu id-uri fixe (`ID_PORNIRE`), pus singur o dată în biblioteca fără cont (fereastra
  sau panoul) și în cont la prima sincronizare a unui cont care n-a avut niciodată freze; steagul `standard` în înregistrare
  (șterse, nu revin); întrebarea „Adaugi … din acest browser” nu mai numără frezele standard; în Atelier, rândul „Freza” nu
  apare (Tăierea n-are liste acolo). Otrăvuri 15 / 16 (E05, echivalentă). **Capcană:** cu setul pus de la prima pornire, orice
  probă e2e care deschide Tăierea vede acum rândul „Freza” (o probă care cere o bibliotecă goală folosește `bibliotecaGoala`
  din `test/e2e/ajutor-freze.ts`). PR-ul #22 are acum 16.A↑b-2 și 16.A↑a-2.
- **24.11, ~12:45: ADR 0302 propus, apoi acceptat** („Da, 1a–5a”), la cererea owner-ului cu fișierul ArtCAM `FREZE.tdb`
  („vreau ca frezele să fie o listă ca în ArtCAM … și doar dacă vrea userul … să comute pe configuratorul actual”). Fișierul
  e baza de scule ArtCAM, binară, nedocumentată, cu conținutul ArtCAM și al producătorilor: nu se citește și nu se copiază
  (`CLAUDE.md`); din el s-au luat doar felurile și ideea grupurilor. Feliile, despărțite la acceptare: **h-1** fereastra ca
  listă (fișa doar de citit, configuratorul la „Editează” / „Freză nouă”, comutatorul), **h-2** grupurile omului (`grup`),
  **h-3** catalogul propriu, **h-4** felurile noi „în curând”. Pornită 16.A↑h-1.
- **24.11, 12:57–13:20: 16.A↑h-1 gata pe ramură** (`d535f1cd`, `0acfc75b`, documentele): fereastra pornește ca listă, cu fișa
  frezei doar de citit (`data-freze="fisa"`, valorile cu `data-freze-valoare`), editorul la „Editează” / „Freză nouă” și
  comutatorul „Listă / Configurator” (`cncvs2.freze.vedere`). **Capcană:** o probă e2e care schimbă o freză trece acum prin
  fișă („Editează”), iar după „Salvează” editorul se închide (în „Listă”); valorile se citesc din fișă. Otrăvuri 16 / 16.
  `main` adus (`8cb76d64`). Urmează 16.A↑h-2 (grupurile).
- **24.11, 13:22–13:45: 16.A↑h-2 gata pe ramură** (`6cfa2231`, `04c02209`, `60e7f68e`, documentele): grupurile omului
  (`grup` pe freză, în fișier și în cont, fără schemă nouă), lista pe grupuri, „Grupul” din fișă, „✎” pe titlu, câmpul din
  editor. **Capcană:** un control care dispare după acțiune (câmpul redenumirii) lasă focusul în afara ferestrei, iar
  Escape (ascultat pe fereastră) nu mai ajunge; focusul se mută explicit (`deFocus`). Otrăvuri 23 / 24. PR-ul #22:
  `d0fa2dde` e în lotul 19 al sesiunii principale. Urmează 16.A↑h-3 (catalogul).
- **24.11, 14:42–15:05: 16.A↑h-3 gata pe ramură** (`ad5f11ab`, `c8ef39f1`, `32f494cd`, documentele): catalogul propriu (69 de
  freze, valorile de pornire, țolii), „Pune în frezele mele”. **Capcană:** depozitul (`frezeMele.ts`) e comun ferestrei și
  panoului Tăierea, deci ce importă el ajunge și în bucata panoului: punerea din catalog stă în `dinCatalog.ts`, fără datele
  catalogului. Otrăvuri 23 / 23. 16.A↑h-1 și h-2: în lotul 21 al sesiunii principale (`db43ed08`). Urmează 16.A↑h-4 (felurile
  noi „în curând”).
- **24.11, 15:08–15:55: 16.A↑h-4 gata pe ramură** (`64bc5769`, documentele): bila, toroidala, conica cu vârf rotund și
  burghiul în bibliotecă și în catalog (119), cu `raza`, capătul și silueta, „în curând în proiect”; Tăierea și copia pentru
  document doar pentru `FELURI_CU_CAM`. Serverul nu se schimbă: un client vechi ține felul necunoscut neatins. Profilurile
  parametrice au ieșit în 16.A↑h-5. **Capcană:** un arc desenat din puncte, cu capătul scris exact, poate trece de probe care
  verifică doar „pe cerc”; proba pașilor egali îl prinde. Otrăvuri 23 / 24.
- **24.11, 16:32–17:00: 16.A↑h-5 gata pe ramură** (`5018701c`, documentele): rotunjirea, ogee-ul, ogee-ul roman (`treapta`),
  panoul ridicat (fundul plat, teșitura față de fața plăcii, scobitura opțională); canelura e o bilă; catalogul 149. Geometria
  profilurilor e a noastră, din câțiva parametri: în 16.A↑f devine generatorul siluetei desenate. **Capcană:** la trecerea pe
  un profil, diametrul nu se suprascrie decât dacă cel scris nu cuprinde profilul (altfel omul își pierde diametrul). Otrăvuri
  29 / 29. Urmează, la cuvântul owner-ului: 16.A↑b-3 (după #11), b-4, d, e, f, g.
- **24.11, 17:05–17:55: 16.A↑b-3 gata pe `wip/16.A-freze-b3`** (`5b875a26`, `ef13a790`, documentele), la „Pe #11, acum”:
  ramura nouă are fereastra exportului refăcută (#11) adusă; lista „Din frezele mele” în grupul Freza al fișei, originea pe rând,
  scrisă de Exportă. **Capcane:** `src/ui` nu importă modelul, deci frezele potrivite le dă aplicația (`ExportConectat`), ca
  funcție a felului și laturii rândului; un câmp nou al fișei își cere grupul în `exportGrupuri.ts` (altfel cade
  `export.grupuri.test.ts`). Otrăvuri 16 / 16. Ramura se unește doar după #11 (sau odată cu ea). Urmează 16.A↑b-5 (fundul
  plat, frezele de rest, dopul, banda).
- **24.11, seara: 16.A↑h-5 și 16.A↑b-3 unite în `main`** (lotul 26, `52a0aaa1`; PR-urile #22 și #26 închise ca unite).
- **25.11, 09:35–: 16.A↑b-5 pe `wip/16.A-freze`** (adusă la `main` `f2678300`, cu relieful v28), la cuvântul owner-ului
  transmis de sesiunea principală („vreau sa pornesti si celelalte sub-sesiuni”): listele „Din frezele mele” pe frezele în
  plus ale rândului (fundul plat, frezele de rest, dopul drept, decuparea benzii), doar cu frezele plate (la o freză de rest,
  doar cele mai mici decât cea dinainte); originea pe fiecare, scrisă de Exportă cu regula frezei operației (`cuOrigine`);
  T-ul printre toate frezele ferestrei, fără cea înlocuită (`frezeRanduri`). **Capcane:** proba grupurilor citește doar
  `data-camp="…"` scris în sursă, deci o componentă care primește numele câmpului îl ia ca `data-camp="…"` (ca `Cartonase`),
  nu ca alt nume de proprietate; legarea rândurilor e doar între operațiile aceleiași piese (proba ei pornește din Scade,
  ca proba ordinii de mână). Tot aici, tabelul frezelor de rest (constatarea 9 a auditului exportului, dată liniei).
  Mărimea: pornirea neschimbată, totalul +1,0 kB (882,0 / 1 000). Urmează 16.A↑b-4 (nota „s-a schimbat în bibliotecă”).
- **25.11, 11:05–11:40: 16.A↑b-4 pe `wip/16.A-freze-b4`** (din vârful lui b-5, `b7660e94`, ca `wip/16.A-freze` să rămână neschimbată
  până la unire), la „continua cu 16.A↑b-4” al owner-ului: nota pe fiecare freză a rândului (schimbată în bibliotecă, cu „Ia
  valorile noi” pe rând și „Pe toate (N)”; ștearsă; recunoașterea celei scrise de mână ca „Scrisă de mână (ca „…”)”).
  „Pune-o înapoi în bibliotecă” a ieșit în 16.A↑b-6 (scrierea în bibliotecă din fereastra exportului, cu contul). **Capcane:**
  Edge scrie 1400 ca „1.400” în română (gruparea de la patru cifre); o probă care șterge o freză în „Frezele mele” așteaptă
  întâi să dispară din listă (ștergerea e asincronă: un Escape grăbit închidea doar întrebarea, nu fereastra; era o greșeală a ferestrei, reparată în
  16.A↑b-7).
- **25.11, 14:16–14:40: 16.A↑b-6 pe `wip/16.A-freze-b6`** (din vârful lui b-4, `48f27fcf`), la „ok, porneste 10.4↑c-2 si
  16.A↑b-6” al owner-ului, transmis de sesiunea principală: „Pune-o înapoi în bibliotecă” pe nota unei freze șterse, din copia
  de pe rând, cu id-ul ei de dinainte (în cont reînvie peste semnul ștergerii: nimic nou pe server) și un nume liber.
  **Capcane:** fișa „Frezele mele” scrie numerele fără gruparea miilor („18000 rot/min”), nu ca fereastra exportului; un
  `pkill -f 'vite preview'` dat cât rulează suita emulatoarelor îi oprește și serverul ei (probele paginilor cad cu
  `ERR_CONNECTION_REFUSED`, fără vină în cod); otrăvurile de pe emulatoare stau într-o listă a lor (`16.A-b6-emu.py`).
- **25.11, 18:44–: 16.A↑b-7 pe `wip/16.A-freze-b7`** (din `origin/unire-2511w`, cu b-6 și 10.4↑c-2), la cererea sesiunii
  principale: probele b-4 și b-6 cădeau din când în când pe Escape-ul lui `inBiblioteca` (linia exportului: 4 din 50; aici 2 din
  50). Cauza era în fereastră, nu în probă: Escape se asculta doar pe ea, iar butonul apăsat pleacă sau se oprește sub focus,
  deci tasta cădea pe `body`; o stare rămasă în urmă (întrebarea unei freze deja șterse) o oprea și cu focusul înăuntru. Acum
  Escape stă pe `document`, pe urcare, și închide stratul care se vede. `inBiblioteca` n-a fost atins. **Capcane:** o cursă de
  1–2 ms nu se prinde cu `--repeat-each`, ci cu un observator al mutațiilor care apasă tasta exact în clipa plecării
  (`escapeLaPlecare`, în `freze.spec.ts`); Chrome ia focusul de pe un buton oprit abia la desenarea următoare (o probă așteaptă
  `:focus` gol). Același tipar (Escape doar pe `.dialog`) îl au și Așază, Setări, Raportul foilor, Lucrarea primită, Aspectul și
  ferestrele extensiilor: spus sesiunii principale.
- **26.11, 20:16–: 16.A↑e-1 pe `wip/16.A-freze-e`** (din `main` `d1ab8ba5`), la cuvântul owner-ului transmis de sesiunea
  principală („Zi-le ca pot continua cu ce urmeaza la fiecare”; 16.A↑d cere placa 4 tăiată). ADR 0303 propus (bila și
  toroidala în proiect, sub-feliile e-1 … e-5, cinci întrebări). e-1: documentul v31 (`{ tip: 'toroidala', raza }`, v31 ținut
  de sesiunea principală pentru linie), IR-ul, nucleul simulării (felul 3; linia înclinată prin înjumătățirea derivatei) și
  oracolul cu h pe hârtie; lucrarea refuză toroidala pe orice operație, cu motiv; fereastra exportului nu-i face rând.
  **Capcane:** pe o mutare înclinată, minimul cu toroidala nu are formă închisă (rădăcina unei ecuații de gradul patru), deci
  înjumătățirea derivatei, cu un număr fix de pași (doar + − × ÷ √: aceeași amprentă în Node și în browser); proba nucleului
  față de oracol are martorul unei bile de același diametru, care trebuie să cadă; o freză pe care copia ferestrei exportului
  n-o poartă (bila, toroidala, o formă necunoscută) n-are rând, altfel Exportă scrie o plată în locul ei
  (`operatieCuRand`); la `ISTORIE`, v30 primește părintele commit-ului care urcă schema (aceiași octeți ca vechiul a3f8f8f).
- **27.11, 00:15–: 16.A↑e-2 pe `wip/16.A-freze-e`**, peste `7c3f166b` (e-1 raportată gata de unit, cu `main` `0df06eca`
  adus și completul verde). Elicea cu bila și cu toroidala în nucleu (`eliceaRotunda`): urcarea citită de la capăt, doar
  ultimele 2π, pe fiecare bucată a cercului minimul în distanța d (pragul G = |m| prin înjumătățire, maximul lui G prin
  secțiunea de aur). **Capcane:** cu raza elicei sub raza sculei (miezul), scula atinge celula de pe tot cercul, iar cel mai
  jos punct poate fi la capătul turei, departe de trecere: g(ψ) e convexă, apoi concavă, deci înjumătățirea singură greșește;
  pe toroidală structura e doar sondată, deci proba are 300 de elice la întâmplare față de o căutare densă, nu doar oracolul;
  câmpul ține Float32, deci o comparație cu o valoare exactă cere un ulp de toleranță; oracolul simulării eșantiona deja
  orice arc cu Z liniar în unghi, deci e-2 n-a avut nimic de schimbat acolo.
- **27.11, 02:20–: 16.A↑e-3 pe `wip/16.A-freze-e`**, peste `e5bdde83`. Felia e-3 de la propunere s-a împărțit: e-3 e CAM-ul
  canelurii (profilul pe linie primește bila și toroidala; drumul frezei plate de același Ø; `sculaIR` cu forma; raportul
  foilor o numește), e-4 e intrarea în proiect (biblioteca, Tăierea, rândurile exportului); buzunarul și profilul pe o parte
  s-au renumerotat e-5 și e-6. **Capcane:** id-urile feliilor primesc după cratimă doar cifre (`RE_ID`), deci „e-3a” oprește
  build-ul documentației; bila e între felurile cu CAM (de la relief), deci o regulă de formă lărgită o arată imediat în lista
  „Freza” din Tăierea și pe rândurile exportului: acolo intră și `formaPeRand` (copia rândului poartă doar plata și V-ul);
  `frezePeRanduri` judecă felul înaintea copiei (`sculaDinFreza` aruncă pe un fel fără CAM); lucrarea împarte adâncimea în
  treceri egale, nu în pași de mărimea pasului.
- **27.11, 03:55–: 16.A↑e-4 pe `wip/16.A-freze-e`**, peste `db066160` (e-3 unită). Bila și toroidala în proiect: copia rândului
  ferestrei exportului (`FormaRand` cu trei feluri, `razaColt` pe rând), identitatea pentru T cu felul și raza, nota și
  recunoașterea pe forma întreagă, Exportă cu numele după formă, lista formei doar pe linie, câmpul razei, desenul; toroidala
  cu CAM în bibliotecă. **Capcane:** fereastra citește freza din document în trei locuri din `ExportConectat` (`sculaRand`,
  `valori.scula`, `oferita`): o formă scăpată acolo ajunge plată pe rând, iar Exportă o scrie plată; `Rand` are un câmp nou, deci
  fiecare probă care construiește un rând întreg îl cere (`razaColt`); un câmp nou al ferestrei intră în `GRUP_CAMP`, în proba
  privirii și, dacă e o greșeală, în motivul de sus (`motiv.scula-invalida`) și în greșeala pe câmp; paza compilatorului din
  `exportFreze.bila.test.ts` a căzut exact cum spunea, deci s-a înlocuit cu proba felului readus.
- **27.11, 05:30–: 16.A↑e-5 pe `wip/16.A-freze-e`**, peste `72263843` (e-4 unită). Buzunarul cu bila și cu toroidala: drumul
  frezei plate de același Ø, creasta pe fund în fereastră (`creastaBuzunar`), refuzurile cu freze de rest și cu incrustație cu
  pereți drepți, oracolul buzunarului cu judecata a 7-a (fundul). **Capcane:**
  - formula din ADR (h(s / 2)) e doar creasta dintre două inele: pe colțurile inelelor și pe mijloc, un punct poate sta la
    aproape s de drum, deci fundul ajunge până la h(s). Măsurat pe dreptunghiul 100 × 60 cu bila Ø6, s = 2,4: 0,32 mm, față de
    0,25 între inele;
  - o judecată a oracolului care măsoară doar punctele deja „la cel mult s” nu poate cădea niciodată: distanța se caută până la
    R, iar perechea care pică e același program față de un pas lateral mai mic;
  - interfața nu importă modelul, deci regula formei rotunde stă de două ori (`motivFormaPeOperatie`, `rotundaPermisa`), cu o
    probă care le compară; creasta vine pe rândul „pe hârtie” (`hartieRand`), nu din formule în fișă.
- **27.11, 06:30–: 16.A↑e-6 pe `wip/16.A-freze-e`**, peste e-5. Profilul pe o parte cu bila și cu toroidala, cu adâncimea
  cel puțin raza colțului (2a): drumul frezei plate, peretele pe hârtie (`peretePeOParte`), refuzul `rotunda-adancime`, nota
  peretelui în fereastră. **Capcane:**
  - regula pe o parte cere adâncimea operației și diametrul frezei (la bilă, ρ = Ø / 2): `motivFormaPeOperatie` le primește
    în `o` și ca al cincilea argument; fără ele, refuză (o pază: un apelant nou care uită adâncimea nu lasă bila să treacă);
  - în Tăierea, diametrul e al frezei din bibliotecă, nu al frezei de acum a operației (`frezePotrivite`);
  - lista „Din frezele mele” a rândului din fereastră nu cere adâncimea (ca frezele de rest ale buzunarului): greșeala o spune
    rândul, iar lista nu se schimbă la fiecare tastă;
  - urechile se socotesc de la fundul plăcii: o probă cu urechi pe o parte taie cât foaia, altfel lucrarea le refuză.
- **27.11, 08:30–: 16.A↑f-1 pe `wip/16.A-freze-e`**, peste e-6. ADR 0304 propus (profilul desenat), cu cinci întrebări,
  mers cu recomandările. Forma `profil` în IR, în nucleu (felul 4, linia frântă) și în documentul v32 (numărul dat de
  sesiunea principală); lucrarea o refuză peste tot, cu motiv. **Capcane:**
  - **un v nou mută lanțurile din ajutoarele probelor** (`test/unit/ajutor-document-oracol.ts`: `PE_Vn`, uniunile,
    `taieturileOracolului`), nu doar probele `document.v*`: fără ele, sute de probe pică la „versiune necunoscută”;
  - **cazurile de refuz au prefixe unice în tot fișierul** (`document.cazuri.ts`): „RP” era deja al lui v24, deci v32 are
    „RD”;
  - **corpusul de aur cere întâi commit-ul codului:** rândul din `ISTORIE` ține hash-ul lui, apoi `--istorie` și ieșirile;
  - **oracolul simulării e scump:** proba nucleului pe celule de 0,05 mm, cu oracolul judecat de două ori pe caz, ținea 391 s;
    pe 0,1 mm, cu judecata refolosită, 35 s. O probă nouă pe oracol se socotește întâi;
  - un h negativ la ușă e refuzat oricum de „primul punct (0, 0) și h nedescrescător”: marginea de jos a lui h nu se poate
    otrăvi (F15, echivalentă).
- **27.11, 09:40–: 16.A↑f-2 pe `wip/16.A-freze-e`**, peste f-1. Canelura cu profilul desenat: regula (doar pe linie, ca freză a
  operației), silueta în IR, identitatea pe T (cheia ține toate punctele), raportul foilor. Sub-feliile de după, renumerotate:
  f-3 intrarea în proiect, f-4 marginea profilată, f-5 editorul. **Capcane:**
  - fundul canelurii simulate e la −d + h(0,005), nu la −d: celula cea mai apropiată de linie e la 0,005 mm, iar o siluetă
    care urcă de la axă (S-ul) e acolo deja cu 0,001 mm mai sus;
  - listele de otrăvuri mai vechi rămân legate de commit-ul lor (ancorele lui e-3, e-5 și f-1 s-au mutat cu feliile de după):
    `verifica` le arată VOID, fără să fie o greșeală.
- **27.11, 11:10–: 16.A↑f-3 pe `wip/16.A-freze-e`**, din `main` cu f-1 și f-2 unite (`8906dedf`, PR-ul #74 unit). Profilurile
  parametrice în proiect: punctele (`puncteProfil`), CAM-ul în bibliotecă, Tăierea, rândul ferestrei cu silueta doar de citit,
  identitatea pe T, nota bibliotecii, ce scrie Exportă. **Capcane:**
  - **`freza.ts` și `profilFreza.ts` nu se pot importa una pe alta** (regula `fara-cicluri`, și cu importuri doar de tipuri):
    `inaltimeCon` și silueta stau în `profilFreza.ts`, cu tipul `CampuriProfil`, iar `freza.ts` le reexportă;
  - **cu forma aleasă, oracolul simulării în e2e e scump** (cost ≈ celule × mutări × puncte): cu 2 001 de puncte pe o grilă de
    40 × 400, proba trecea de 30 s în procesul Playwright (pagina nu era blocată); cu 200 de pași și o fâșie de 10 × 400, 4 s;
  - un profil nu se pune înapoi în bibliotecă din copia de pe rând (copia ține punctele, nu felul parametric): `copieDeReadus`
    întoarce null, până la editorul siluetei desenate (f-5).
- **27.11, 11:45–: 16.A↑f-4 pe `wip/16.A-freze-e`**, din vârful ramurii (cu f-3 raportată, `0a1fd1a4`; sesiunea principală unește
  commit-ul acela, nu vârful, iar f-4 se raportează cu `main` adus întâi). Marginea profilată: centrul la r(0) de desen,
  adâncimea cel mult h_max, nota retragerii muchiei. **Capcane:**
  - **raza drumului nu mai e mereu Ø / 2:** pe o parte, cu profilul, e r(0) (`razaTraseu` în `src/cam/job.ts`), și pentru
    profilul tăieturii, și pentru verificarea invariantei 2; o rază mai mică în verificare doar o slăbește (otrava aceea scapă),
    iar raza frezei întregi refuză pe nedrept marginea;
  - **urechile, degajările și intrările** se calculează cu raza frezei (din `scula.diametru`), nu cu fundul siluetei: pe o
    margine profilată se refuză, până la o sub-felie a lor;
  - **regula ferestrei citește acum adâncimea și opțiunile rândului** (`motivProfilRand`): o probă care cerea „profilul doar
    pe linie” (`frezeTaiere.spec.ts`) numără acum și rotunjirile oferite pe exterior (10 din 11 la 3 mm, toate la 1 mm);
  - un `vite preview` rămas dintr-o rulare oprită a otrăvurilor ține portul 4173: otrăvurile e2e ies NEVALIDE până e oprit.
- **Feliile**, în ordine: 16.A↑a (biblioteca în browser, fereastra, fișierul), apoi b (alegerea în proiect, v27), c
  (contul), d (calibrarea), e (bila și toroidala), f (profilul desenat), g (valorile pe material).

## Ce am găsit în cod (23.11)

- **Copia frezei** stă pe fiecare operație (`scula: { numar, nume, diametru, forma? }`, `SchemaScula`), și la fundul plat,
  la frezele de rest, la dop și la bandă: o singură schemă le acoperă pe toate. Tabelul `scule[]` din `PLAN.md` §3.2 nu există.
- **Valorile de lucru erau fixe:** `REGIM_IMPLICIT` (`src/cam/job.ts`: 18 000 rot/min, 1 000 și 300 mm/min, Z sigur 5),
  pentru orice freză; fereastra exportului îl spune într-o notă (`export.regim`). Din 16.A↑b-1, `regimFrezei`
  (`src/cam/regimFreza.ts`) ia valorile frezei, iar fără ele întoarce chiar regimul lucrării (programele de azi, octet cu
  octet). Nota din fereastră rămâne de schimbat în 16.A↑b-2, odată cu alegerea frezei.
- **Formele:** CAM-ul, plata și V-ul (cu vârf); IR-ul și nucleul simulării, și bila (elicea cu bila, încă refuzată); oracolul
  simulării, și profilul ca puncte (r, h). Toroidala nu e nicăieri. (Din 16.A↑e-1, toroidala e în document, în IR și în
  simulare; din 16.A↑e-2, elicea cu bila și cu toroidala se simulează.)
- **Contul:** nicio dată a omului nu stă încă pe server; biblioteca ar fi prima. Callable-urile cer App Check, deci
  sincronizarea se încearcă doar pe adresa principală de test, după unire și publicarea serverului.
- **Mărimea:** rândul din meniul contului stă în bucata editării (`Editare.tsx` importă `meniuCont.ts`), nu în pornire;
  textele, ca date (ADR 0086). Bucata contului e la 29,6 / 32 kB: sincronizarea trebuie să rămână mică (~2 kB).

## Capcane

- **Proba de server a frezelor rulează doar cu emulatorul Firestore:** `firebase emulators:exec --only firestore --project
  demo-cncvs2 "node --test functions/test/freze.emulator.test.ts"`. Un emulator rămas pornit (după un `| head` care a
  tăiat ieșirea) ține portul 8085: `pkill -f cloud-firestore-emulator`. O eroare `internal` a callable-ului pe emulator se
  citește din `errorLogs` (jurnalul serverului), cu o sondă mică.
- **Un `set` fără `merge` nu primește `FieldValue.delete()`:** documentul se scrie întreg, deci câmpul lipsă pleacă singur.

- **Edge-ul din container pornește în engleză** (`navigator.languages` e `en-US`): fiecare spec își pune româna cu
  `test.use({ locale: 'ro-RO' })`, altfel textele românești nu se găsesc.
- **Un `import` din `src/io/csv.ts` scoate o bucată comună** (`csv-*.js`, 0,65 kB, împărțită cu fereastra «Din CSV…»): numele
  ei intră în harta importurilor din pornire. Măsurat: pornirea +0,2 kB cu toată legătura ferestrei.
- **Rândurile meniului contului se numără și pe emulatoare** (`test/e2e-emulator/tichete.emulator.spec.ts`, cu contul
  deschis): un rând nou intră și acolo, nu doar în `cont.spec.ts`. Completul de pe `d4dce8df` a căzut aici.
- **Otrăvurile e2e care scot un `if` dintr-un `if … else if` lasă codul fără sintaxă** (build eșuat, NEVALIDĂ): se
  schimbă condiția, nu se scoate rândul.

- **Intervalul ADR se verifică pe toate ramurile, nu doar în `main`.** Brief-ul a dat întâi 0290–0299, luate cu o oră înainte
  de linia exportului (`wip/28.8-export`, ADR 0290 propus pe ramura ei); `main` a corectat la 0300–0309. Înaintea unui ADR
  nou: `git fetch origin`, apoi `git ls-tree --name-only origin/<ramura> docs/adr/` pe fiecare `origin/wip/*`.
- **Fereastra exportului se desenează din nou pe altă linie** (ADR 0290, `wip/28.8-export`): felia 16.A↑b pune alegerea din
  bibliotecă în secțiunea „Freza” a fișei, dacă fereastra nouă e unită întâi; altfel pe rândul de azi.
- **Clona din container e superficială** (`git rev-parse --is-shallow-repository` dă `true`): `node scripts/corpus-documente.ts
  --istorie` cade la commit-urile vechi din `ISTORIE` („Not a valid object name”). Întâi `git fetch --unshallow origin`.
- **O versiune nouă a documentului mută probele versiunii curente** (lanțurile `PE_Vn ? ridicaPanaLaO(…, n)`, `migreazaVnVn+1O`,
  `SCHEMA_CURENTA_O`, „mai nouă” în cazurile v9 / v10, `schema: n }` în ieșirile migrate): pe 16.A↑b-1, după diff-ul lui
  `63a1eca0` (v26), cu un script pentru lanțuri; rămase, le găsește suita unitară. **Și o probă e2e ține versiunea:**
  `test/e2e/placute.spec.ts` (`expect(d1.schema).toBe(…)`); completul de pe `f5f1177b` a căzut doar acolo.
- **Mașina estimării (GRBL 1.1h din fabrică) are 500 mm/min pe axe:** un avans peste el nu scurtează timpul. O probă a
  estimării cu avansul frezei folosește un avans sub 500.
- **`node scripts/traduceri.ts --help` scrie fișierul** (nu cunoaște `--help`): adaugă textele noi cu `en` gol. Verificarea e
  `--verifica`.

Legat: [sesiunea principală](principala.md), [lecțiile comune](lectii.md), [„Toate opțiunile”](lectii.md#feedback-toate-optiunile),
[„UI convențional”](lectii.md#feedback-ui-conventional).
