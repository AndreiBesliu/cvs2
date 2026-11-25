# Frezele (16.A↑, ADR 0300–0309)

_cncvs2, biblioteca de freze („Frezele mele”), felia 16.A↑ adusă din etapa 16: ramura `wip/16.A-freze` (din `main`
`c8b235ab`), ADR-urile 0300–0309 (liber: 0303), canalul `freze`; ADR 0300 ACCEPTAT pe 23.11 („Da, 1a–6a”), ADR 0302 ACCEPTAT pe
24.11 („Da, 1a–5a”); 16.A↑a, ADR 0301, 16.A↑b-1 și 16.A↑c UNITE în `main`; 16.A↑b-2 și 16.A↑a-2 GATA pe ramură (PR-ul #22);
16.A↑h-1 și 16.A↑h-2 UNITE (lotul 21); 16.A↑h-3 și 16.A↑h-4 în lotul 23; 16.A↑h-5 și 16.A↑b-3 UNITE (lotul 26); 16.A↑b-5 în lucru pe `wip/16.A-freze`_

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
  simulării, și profilul ca puncte (r, h). Toroidala nu e nicăieri.
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
