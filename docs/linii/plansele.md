# Planșele (etapa 11)

<!-- Adusă din memoria sesiunii principale pe 23.11.2026 (mutarea în cloud). De aici înainte o ține la zi linia, pe ramura ei, odată cu feliile. -->

_cncvs2, linia planșelor (etapa 11): din 23.11 în cloud, pe ramura `wip/11.1-plansele` (până atunci, worktree-ul local `plansele`, e2e 4178 / 127.0.5); ADR 0210–0219; canalul `plansele`; 11.1↑–11.7↑, 11.3↑b și 11.3↑c ÎN MAIN; 11.3↑d ÎN MAIN (`44046e5d`, 22.11); 11.3↑e (urechile „unde ține”, ADR 0211 b, tot v26) ÎN MAIN (`d3ffcbf3`, 23.11); 11.3↑f (regulile pe laturi, ADR 0211 c, tot v26) ÎN MAIN (`f4601938`, 23.11): ADR 0211 are toate cele trei variante făcute; tăierea plăcii 11 e a owner-ului; 11.5↑b după etapa 13_

Pornită pe 07.11.2026 de sesiunea principală (owner-ul a întrebat ce se mai poate face în paralel), ca linie lângă
incrustații (12.1↑), tăierea vectorilor (10.3↑) și imprimanta (3.6g).

- **Locul:** worktree-ul `C:\Users\besli\cncvs2-lucru\plansele` (joncțiuni spre `node_modules` din checkout-ul principal), e2e
  pe 4178 cu `CNCVS2_E2E_RETEA=127.0.5`, ADR-urile 0210–0219, canalul `plansele`
  (<https://cncvectorstudio-test--plansele-xafrblmh.web.app>, până pe 08.12; fiecare publicare o mută la +30 de zile).
- **ADR 0210 acceptat** pe 07.11 („Da, toate”, la „Le fac pe toate opțiuni, cu recomandarea ca implicit?”): fiecare variantă
  rămâne opțiune, cu recomandarea implicită; plafonul total e acum 600 kB (ADR 0143, în `main`); programul unic pentru toate
  foile e 11.5↑b, după etapa 13. Schița: <https://claude.ai/artifact/Fe7LSU7Lo8pQg4qxGA5JYZ>.
- **11.1↑ gata** (`87a7537`, `f99967e`): foaia activă (a ferestrei, `cncvs2.foaia`), lista cu foile, mutarea între foi,
  exportul foii active. Otrăvurile 42 / 42.
- **11.1↑b gata** (`235ed5d`, `0f12bab`): toate foile pe pânză, dublu-clic, comutatorul `vedere.toate-foile`. Otrăvurile 19 / 19.
- **11.2↑ gata** pe 08.11 (`cb7efec` codul, `9f91d24` documentele, `1f8d6e3` unirea cu `main` `b56f0e1`; împinse; otrăvurile 32 / 32): «Încă…» / «+1» (`planCopii`, `src/model/pieseLegate.ts`),
  lista „(k din N)”, banda violet (jos, la mijlocul zonei libere: sus, riglele urmează foaia), «Desprinde», gruparea cu surori
  (întrebarea sus, sub bare; „Ține minte” în `cncvs2.grupare-surori`; rândurile din meniu), „Duplică foaia cu aceleași
  piese”. Editarea legată: refuzurile vechi au ieșit și din `comandaForma` (forma din panou ȘI nodurile, ADR 0068). Pornirea
  104,9 (cu ușa 108,5 / 110), totalul 544,4 / 600.
- **11.3↑ gata** pe 08.11 (`ab85477`, `87f3aee`, `978315b`, unită cu `main` în `fd8ef89`; împinse; otrăvurile 32 / 32 pe
  codul final, A09 scăpată la prima rulare): „Așază pe foi” (`DialogAsezare.tsx`, `src/model/asezare.ts`, `foaie.aseaza`) și
  „Mută și așază la capăt” (`selectie.muta-si-aseaza`). Distanța minimă = freza profilului exterior: scrisă mai jos, refuz;
  unde omul n-a scris, urcă singură. Pornirea 105,3 (cu ușa **108,9 / 110**), totalul 548,7 / 600.
- **De ținut minte:** `material` e liber în schemă (o variantă strictă a picat 86 de probe ale oracolului). Comenzile foilor
  se aplică din `jurnalFoi.ts`, înregistrat când vine `foiComenzi.ts`. Paleta grupează doar prefixele `import`, `export`,
  `document`, `istoric`, `selectie`, `vedere`: acțiunile `foaie.*` și `piesa.*` nu apar în ea. O otravă care face o buclă
  fără capăt (rândurile care urcă, piesa prea mare) iese „PRINSĂ(termen)” după 300 s: în liste, preferă otrăvuri care cad
  repede. Singura schemă nouă rămâne a plăcuțelor (11.4↑): v21 dacă ajunge în `main` înaintea lui 12.1↑b, altfel v22.
- **Why:** owner-ul a cerut în ediția întâi „mai multe plăci reale, văzute împreună” (LECTII §5.3); D (ADR 0024) promitea
  instanțele legate și «Desprinde» în etapa 11.
- **How to apply:** felia următoare e 11.4↑ (plăcuțele: schema nouă, deci și ușa crește; oracolul documentului printr-un
  agent, doar cu acordul owner-ului și costul spus întâi); înainte, `git merge origin/main` dacă `main` s-a mișcat. E2e-ul complet cade sub suitele altor
  sesiuni: rulează căzutele singure înainte de a le crede. Nota de predare: `plansele-worktree.md`, în dosarul comun al
  sesiunilor. O felie nouă măsoară întâi ce adaugă la pornire și la ușă (au rămas 1,1 kB sub 110, cu ușa). Otrăvurile: și saltul care
  nu înaintează face buclă (A05 din 11.3); un mod nou de „variantă mai bună” cere o probă unde varianta e mai proastă.


- **11.4↑ gata** pe 08.11 (`4c0f0d7` v23 + oracolul agentului 26 / 26, `1f250a7` corpusul, `c2784f2` aplicația, `ca7c0b6`
  otrăvurile, `3d67b0e` documentele; împinse; otrăvurile 40 / 40): `Instanta.texte` (literele fiecărei plăcuțe), „Pe această
  plăcuță” în panou (prin acțiunea textului, cererea `placuta`), editarea șablonului reface plăcuțele, «Desprinde» coace.
  **Ușa judecă plăcuțele pe documentul BRUT** (`problemaTexte`, după schemă): `v.record` sare `__proto__` / `constructor` /
  `prototype`, care sunt date (ADR 0024 §9); deci `is(SchemaDocument)` singur nu judecă plăcuțele, acțiunile folosesc
  `motivDupa`. Pornirea cu ușa **109,9 / 110** (sub 0,1 kB liberi), totalul 563,0 / 600.
- **Înainte de 11.4↑b:** `main` a primit linia ancorelor (6.V↑–6.V↑c) și 12.1↑c-2, care ating `transformare.ts` (scalarea
  plăcuțelor e acolo), `Editare.tsx`, `PanouProprietati.tsx`, dicționarele: unirea cere porțile din nou. v23 rămâne a
  planșelor (`main` e v22).

- **11.4↑b gata** pe 09.11 (`3cdb96a` unirea lui `main` cu ancorele și 12.1↑c-2; `4bd0c40` felia; `0895c94` otrăvurile;
  `53a5613` documentele; `4b63c9e` butoanele; împinse; otrăvurile 34 / 34): «Din CSV…» (`DialogCsv.tsx`, din panou),
  `src/io/csv.ts`, `src/model/valoriCsv.ts`, `sablonCuContinut` (și pe un șablon grupat), cererile `sablon` și `placute` ale
  acțiunii textului. Totalul 571,7 / 600.
- **Plafonul:** owner-ul l-a ridicat la **700 kB** pe 09.11 (ADR 0144, în `main`, adus în ramură); unirea planșelor nu mai
  e oprită de mărime, ci doar de decizia owner-ului.
- **11.4↑c gata** pe 09.11 (`bb13a6e`, `dbf2cbf` unirea lui `main` cu trasarea și 6.V↑d; `9d9b677` felia; `06ca803` lista
  și proba cu două fonturi; `1c4b000` proba I05; `8737cd5` documentele; `7c22a09` unirea de la capăt: ADR 0144 și 25.4↑; `f13e3b9` lista lărgită; `f7d5435` cifrele, împinsă și pe canal;
  otrăvurile 36 / 36): `src/model/placuteIesire.ts` (plăcuța = conturul închis cel mai mare din afara textelor; adus de
  `App.tsx` doar când documentul are plăcuțe; avertismentele prin cârligul `inregistreazaPlacute`), roșu în listă, bara de
  jos, nota din panou; în «Din CSV…» avertismentul sau și confirmarea la export (`cncvs2.placute.iesire`); unealta Text pe
  o ramă: `src/app/texteGrupate.ts`, `sablonCuAsezat`, cererea `editat` cu `grup`. **Locul la pornire:** cele 14 motive ale
  planșelor (date doar de calcul) stau în `editare.*.ts`; calculul le cere la evaluare. Un motiv nou al planșelor intră
  acolo, nu în dicționarul de bază. Pornirea cu ușa 109,9 / 110, totalul 611,0 / 700.
- **De ținut minte (e2e):** panoul uneltei Text acoperă stânga pânzei (un clic acolo nu ajunge la ea); selecția cu
  dreptunghi se trage de sus-stânga spre jos-dreapta; Escape nu închide fereastra exportului (butonul Închide).

**Schema 11.4↑ (08.11):** owner-ul a ales „Da, așa”: întâi incrustațiile în `main` (unite `9692385`, `main` la v22, semnul trimis cu `031e41a`), apoi planșele aduc `main` și iau **v23** (`Instanta.texte`, literele plăcuțelor); oracolul părții noi îl scrie un agent separat, doar din ADR-uri (~0,7 M tokeni, aprobat). Pornirea cu ușa: `main` 105,5 / 110, ramura 108,9 înainte de aducerea lui `main` (incrustațiile mai pun ~0,1 kB la ușă).

- **11.5↑ în lucru (pauză, 09.11 21:35, `c8b9358`, împins; canalul încă pe 11.4↑c):** „Toate foile” în fereastra exportului,
  arhiva stocată (`src/io/scrieZip.ts`), foile identice = programele egale fără comentarii (o copie legată diferă doar în
  id-ul instanței din comentarii). La reluare: e2e întreg, otrăvurile `11.5.py`, documentele, canalul. Etichetele a 12
  acțiuni ale planșelor stau în `editare.*.ts` (pornirea cu ușa 109,8 / 110).
- **12.11, a doua pauză (`0f1aee4`, împins; canalul tot pe 11.4↑c):** `main` unit în `3aaf5dc` (99 de commit-uri: tăierea
  10.3↑f–j, imprimanta 3.6j–3.6r); codul venit trimite `indexFoaie` (conversia, Cuțitul, tăierea), desenul imprimantei ia
  foaia activă. Unitare 9 289 / 0; **pornirea cu ușa 110,1 / 110**, deci build-determinist cade: de tăiat întâi la reluare.
  E2e nerulat după unire. Nota de predare: secțiunea din 12.11 a lui `plansele-worktree.md`.
- **11.5↑ GATA pe 13.11** (`8e8c755`, împins; canalul `plansele` la `ac679b1`, verificat 98 / 98 bucăți; otrăvurile 61 / 61
  la prima rulare): pornirea sub plafon cu încă 11 motive ale lui `main` (date doar de calcul) mutate în `editare.*.ts`
  (110,1 → 109,6 / 110). **Regula, lărgită:** orice motiv dat DOAR de `actiuniDocumentCalcul.ts` stă în mesajele editorului
  (ferestrele care aduc calculul își așteaptă mesajele); cele folosite și de `CampNumeric` / `DialogExport` rămân în bază.
  Gata de unit (decizia owner-ului, prin sesiunea principală); unirea deblochează și v24 a incrustațiilor. Rezervă pentru
  a doua unire cu imprimanta: `comandaInaltimi` poate pleca din pornire. Procesul sesiunii a căzut o dată (0xC0000409):
  rularea din fundal a otrăvurilor se reia din jurnalul clonei (`.tmp/otravuri.log`); `python -I` ignoră
  PYTHONDONTWRITEBYTECODE, deci `-B`.
- **13.11: 11.1↑–11.5↑ unite în `main`** de sesiunea principală (`fecce54`, la `8e8c755`; „Da, cere-i”). **11.6↑ GATA**
  pe ramură (`ae589ee`, împins; canalul la `13b1f57`, 100 / 100 bucăți; otrăvurile 55 / 55): fereastra
  `src/app/DialogRaportFoi.tsx` (din export și din paletă, `export.raport`), calculul pur `src/model/raportFoi.ts`, CSV-ul
  `src/app/raportCsv.ts`, tipărirea printr-un portal sub `body` + `@media print`. **De ținut minte:** ferestrele care
  importă modelul stau în `src/app` (regula `interfata-prin-actiuni` oprește `src/ui`); la tipar `vw` e al paginii, iar
  `body:has(.aplicatie)` are `overflow: hidden` (de anulat la tipar); SVG-ul exportului are linii de 0,1 mm (`scrieSvg`
  primește grosimea). O acțiune nouă în registru = ușă nouă în `manual.test.ts` (107) și capitol cu `%% acopera`.
- **14.11, PAUZĂ („pauza peste tot”)** la `92f0849`, împins: după 11.6↑ (probată pe `9c668fd`), `main` `0e3725c` (trasarea
  25.5↑, plafoanele 115 / 800) unit în `f8a19a9`; pe el, porțile rapide și build-ul determinist trecute (109,9 / 115, 700,2 /
  800), suita unitară și e2e-ul întreg OPRITE de pauză. La reluare: fetch și unire dacă `main` s-a mișcat, cele două suite,
  canalul, apoi „gata de unit”. Nota: secțiunea din 14.11 a lui `plansele-worktree.md`.
- **16.11: reluat, 11.6↑ GATA DE UNIT la `d6a8618`** (împins): `main` `bfdf2ed` (12.1↑b-2 cu v24, 25.4↑b, 3.6q) unit în
  `cfd195d`; porțile întregi trecute (e2e 487 / 487 din prima, unitare 9 377 / 0, determinist 109,9 / 115 și 700,9 / 800);
  canalul republicat. Owner-ul: „unește ce se poate”, deci sesiunea principală o unește la raport. După ea rămân 11.5↑b
  (după etapa 13) și 11.7 (pe mașină). E2e-ul întreg se pornește după un minut fără altă rulare Playwright pe mașină.

Legat: [sesiunea principală](principala.md), [Incrustațiile (12.1↑)](incrustatii.md), [Uneltele worktree-urilor locale (de dinainte de cloud)](unelte-worktree.md), [„Segmentează (plan mic)”](lectii.md#feedback-segmentare-plan-mic).

- **11.1↑–11.5↑ UNITE în `main` pe 13.11** (exact `8e8c755`, prin unirea `fecce54`; `main` la `d62e6b8`): „Da, cere-i” al owner-ului în sesiunea designului (verificat în transcriere), după ce schițele aranjamentelor au fost declarate gata. Conflicte: DEVLOG, un import în `App.tsx` (lângă al lui 3.6s), `PanouProprietati.tsx` (`fundV` al lui 12.1↑d lângă blocul piesei). Porțile: unit 9 313 / 0, e2e 479 / 479, emulatoarele verzi; pornirea cu ușa 109,7 / 110, totalul 690,0 / 700. Documentul e v23 în `main`, deci un câmp nou ia v24. Lucrul necomis al liniei (raportul foilor: `raportFoi.ts`, `DialogRaportFoi.tsx`, `raportCsv.ts`) a rămas în worktree, neunit.

- **17.11: 11.7↑ (fișa plăcii 11) GATA DE UNIT la `609dfd8`** (împins; pornită pe 16.11, oprită peste noapte cu procesul, reluată la „neata! da drumul celorlalte worktrees”): `main` `22ab3de` adus prin avans direct; `docs/etape/placa-11.md`, `test/placi/placa-11/` (generatorul pe drumul «Din CSV…», fișierele de aur), `placa11.test.ts` (pe hârtie, pe exportul PROASPĂT, ca otrăvurile din generator să fie judecate de cote, nu de octeți) și `placa11.aur.test.ts`; otrăvurile `11.7.py` 17 / 17 + martorul. **De ținut minte:** distanța minimă din freză ține piesele întregi, NU și urechile: sub 2 × freza tăieturile vecine se unesc, iar urechile (la 1/4 și 3/4 din drum) nu stau față în față; proba urechilor = rasterul fundului foii la 0,1 mm, umplut din margine, cu controlul fără urechi. Un CSV cu CRLF devine LF la commit (`* text=auto eol=lf`): scrie-l cu LF. Fișierele de aur trebuie regenerate după fiecare unire a lui `main` care atinge CAM-ul sau exportul (`node test/placi/placa-11/genereaza.ts`; fișa poartă amprentele).
- **17.11: 11.7↑ UNITĂ în `main`** (`b4d5641`, exact `609dfd8`; `main` `4b52fc3`, cu 12.1↑f și v25 sub ea; porțile sesiunii principale: unitare 9 451 / 0, determinist, 709,5 / 800). Felia următoare a liniei pornește la cuvântul owner-ului; propusă: 11.3↑b (avertismentul urechilor, varianta a, cu 2 × freza + 3 mm), apoi b (proba la export), c mai târziu.
- **17.11: 11.3↑b GATA DE UNIT la `65f404b`** (împins; „Da, 11.3↑b”): `src/model/distantaPiese.ts` (regula: cu urechi pe un profil exterior, 2 × freza + 3, rotunjită în sus; `frezaExterioara` mutată aici, ca așezarea și copiile s-o împartă fără ciclu), avertismentul în «Așază pe foi» și «Din CSV…», urcarea singură la «Încă…», «+1», „Mută și așază”. Otrăvurile 21 / 21. **De ținut minte:** `lot 0 N` e EXCLUSIV (cu 21 de otrăvuri, `lot 0 20` o sare pe ultima); în e2e, textul unei plăcuțe are implicit un profil EXTERIOR pe litere: exportul unui șablon cu ramă cere literele săpate în V, altfel tăietura lor „stă în piesa” ramei.
- **18.11: 11.3↑c GATA DE UNIT la `35be1a6`** (împins; „Da, 11.3↑c”): proba urechilor la export, pe programul fiecărei foi (nucleul simulării pe mutările care ajung la fund, umplerea din margine); avertismentul, cu `t`, printre avertismentele exportului. Otrăvurile 25 / 25. **De ținut minte:** regulile de import cer proba pe straturi (`jobs` nu ia din `geom`, `sim` doar din `ir`, `cam` nu ia din `sim`); avertismentele CAM vin din worker în română, deci un text nou pentru om se face pe firul principal, cu mesajele exportului cerute la nevoie (`cereMesaje`); o probă de text într-un proces fără mesaje se scrie separat (`urechi.mesaje.test.ts`). Exportul refuză piesele mai apropiate decât freza („regiunea păstrată”): scenariile de probă stau între freză și 2 × freza.
- **19.11: 11.3↑d pornită** (`f41571e`, împins; „Da, ADR și schița”): ADR 0211 propus și schița, fără cod. Răspunsurile owner-ului: în chat sau în baza schiței (`ArtifactData` list pe colecția `raspunsuri`, documentele q1–q7, `{alegere, nota, cand}`). **De ținut minte:** locurile alese se țin pe piesă (plăcuțele le împart), dar „unde ține” se calculează pe instanță: într-o rețea strânsă, copiile din colț și cele din mijloc au vecini diferiți.
- **21.11: 11.3↑d GATA DE UNIT la `76d5b0b3`** (împins; „Da, toate recomandările”, reluată la mesajul sesiunii principale): documentul v26 (`urechi.mod`, `urechi.locuri`; ușa pe documentul brut), `cuNoduri` pe toate drumurile care schimbă nodurile, lucrarea (proiecția, flancul din gol, pornirea în cel mai lung gol), fereastra („Locurile”, „Alege pe desen…” cu fereastra ASCUNSĂ, nu închisă) și modul pânzei (`ModUrechi.tsx`). Otrăvurile: 46 / 48 la capăt (43 unitare, 3 prin e2e; C15, C16, C17 prinse după probele țintite; M07 și M08, la tăiere, echivalente). **De ținut minte:** (1) un strat al pânzei își socotește punctele de sub maus dintr-un `div` cât pânza (nu dintr-un `span` gol); (2) pânza stă și sub meniu și sub bare: ce plutește pe ea se așază în zona liberă (`zona`); (3) cutia unui `path` SVG cu linie groasă e mai lată decât linia: în e2e, locurile se iau din semnele desenate; (4) pluralul românesc pentru 0 e „few” („0 urechi”); (5) o otravă pe o oglindire scapă cu una sau două urechi (pornirea în mijlocul golului e axă de simetrie): proba cere trei, cu goluri inegale; (6) manualul primește linkuri doar spre capitole (`%% capitol`), nu spre ancore.
- **22.11: 11.3↑e ÎN LUCRU, pauză la `39d801fc`** (împins; „Da, 11.3↑e”): lucrarea în două treceri (`programFoii`), alegerea în `src/cam/urechiLemn.ts`, fereastra și butonul; probele noi verzi (placa 11 la 5 mm: 3 + 1). Ce rămâne și ordinea: în nota comună (`plansele-worktree.md`). **De ținut minte:** (1) „un minut de liniște” poate să nu vină 20 de minute cât alte linii rulează: verifică procesele (`Get-CimInstance Win32_Process`), nu doar procesorul; (2) o joncțiune `node_modules` dintr-o clonă se scoate cu `rmdir` (fără /s) ÎNAINTEA clonei.
- **23.11: 11.3↑e GATA DE UNIT** (reluată în cloud, la brief-ul sesiunii principale; `main` `8f122eb6` adus în `2081f07`): e2e-ul feliei și al vecinilor 3 + 110, din prima; otrăvurile `11.3e.py` 42 / 42 la capăt (38 / 41 la prima rulare: F01, L06, C09 scăpate, cu probe țintite; F03 adăugată); din 11.3c și 11.3d, șase VOID-uri noi mutate pe codul feliei și prinse din nou; porțile întregi în CI. Ce rămâne: 11.3↑f (regulile), la cuvântul owner-ului; tăierea plăcii 11; 11.5↑b după etapa 13; 13 VOID-uri vechi în listele 11.1b, 11.2, 11.4, 11.4b, 11.4c, 11.6 și 11.7 (dinaintea feliei, aceleași pe `main`), de refăcut când se lucrează în zonele lor. **De ținut minte:** (1) **un calcul nou care cere programul foii îl ia din `programFoii`** (`src/jobs/calculCam.ts`), nu din `programDinDocument`, care refuză „unde ține” fără fundul foii: la unirea lui `main`, potrivirea dopului (12.1↑e-2) a venit cu apelul vechi, fără nicio ciocnire de text acolo; după fiecare unire, caută `programDinDocument(` în `src/jobs`; (2) o probă poate da întâmplător același rezultat cu otrava (L06: aceleași două locuri pe cerc și cu palierul dus spre centru): proba părții cere un fund la care partea schimbă tot rezultatul (toate locurile sau niciunul); (3) o gardă de rotunjire (rezerva golului minim) se probează exact pe limită, cu valori întregi pe grila mostrelor (W = 9, 10 mm între capete); (4) umplerea din margine are patru direcții, fiecare cu forma ei de probă („[”, „]”, urechea de sus, urechea de jos); (5) în timpul unei uniri, `git checkout-index` nu reface un fișier încă nerezolvat (UU): o schimbare de probă pusă de mână se scoate de mână; (6) în cloud: clona otrăvurilor cu `npm ci` (~10 s), e2e-ul cu configul repo-ului pe 4173, loturi de cel mult ~14 otrăvuri unitare (o comandă ține 30 de minute; `urechi.lemn.test.ts` ia ~55 s), `python3 -B` (altfel rămâne `test/otravuri/__pycache__`); canalul, din `canal.yml`.
- **23.11: 11.3↑e UNITĂ în `main`** (`d3ffcbf3`, exact `83b690a5`, PR-ul `AndreiBesliu/cvs2#2`), de sesiunea principală din cloud.
- **23.11: 11.3↑f GATA DE UNIT** („Da, 11.3↑f”, în sesiunea liniei; din `main` `c010e3d1`, prin avans direct): `src/cam/urechiLaturi.ts` (laturile drumului frezei, cele trei reguli, împărțirea numărului), legat în `job.ts` pe drumul locurilor alese; fereastra, panoul, raportul, semnele, manualul. Otrăvurile `11.3f.py` 54 / 54 din prima; din 11.3d și 11.3e, nouă VOID noi (șapte mutate, C12 și J08 scoase cu refuzul „felie următoare”). Pe placa 11 la 5 mm, cu oricare regulă nu se mai desprinde nicio plăcuță. Ce rămâne pe linie: tăierea plăcii 11 (owner-ul), 11.5↑b după etapa 13, cele 13 VOID-uri vechi. **De ținut minte:** (1) urechile puse la mijlocul laturilor cad **față în față** cu ale pieselor vecine dintr-o rețea: acolo amândouă frezele se ridică, deci puntea ține piesele una de alta și când tăieturile vecine se unesc (la distanțe egale, urechile de sus și de jos nu se nimeresc); proba urechilor trece prin piese, deci o vede; (2) regula „W ≤ 0,9 · L” cu rezerva de rotunjire scoate o latură de la limita exactă (0,9 · 80 / 6 = 12 urechi devin 11): cifrele de pe hârtie se scriu cu rezerva; (3) o regulă care alege „cele mai lungi” are nevoie de o toleranță (1 %): laturile unui import nu sunt egale la bit; (4) restul unei împărțiri se răspândește (⌊j · k / e⌋), altfel două urechi pe un pătrat ajung pe laturi vecine; (5) două bucle dintr-un singur contur, una cu laturi și una fără, se obțin cu un dreptunghi și un disc legate printr-un gât sub diametrul frezei, tăiate pe dinăuntru (`HALTERA`, în `urechi.laturi.test.ts`); (6) palierul unei urechi pe un arc e o mișcare `arc`, nu `taiere`: probele care numără palierele drepte nu le văd (se numără arcele la Z = −vârf); sub rampă, palierele apar și pe bucăți; (7) raportul deschis din fereastra exportului o închide; panoul scrie milimetrii cu două zecimale („6.00 mm”); (8) un `require('playwright')` din afara repo-ului nu se găsește cu Node 26: capturile de lucru iau `@playwright/test` din `node_modules`-ul repo-ului, cu `channel: 'msedge'`, iar fontul lat se pune prin CSSOM (CSP-ul refuză un `<style>` adăugat).
- **23.11: 11.3↑f UNITĂ în `main`** (`f4601938`, exact `527a95f3`, PR-ul `AndreiBesliu/cvs2#9`), de sesiunea liniei, la „ok, cand se poate fa unirea” al owner-ului. Unirea a fost pregătită întâi peste lotul sesiunii principale, încă în porți (`unire-2311d`, porțile pe `2ee60a88`); lotul a intrat în `main` refăcut (fără 3.Tr, unită între timp de linia elicelor), deci unirea a fost refăcută peste `d6fd5d68`, cu același cod. **De ținut minte:** o unire făcută de linie se anunță sesiunii principale (`send_message`) și se împinge doar peste `main`-ul împins, cu `git diff` gol în afara `.md` față de commit-ul pe care au trecut porțile; o ramură de unire încă în porți se poate reface.
