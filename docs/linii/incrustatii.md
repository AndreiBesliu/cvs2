# Incrustațiile (12.1↑)

<!-- Adusă din memoria sesiunii principale pe 23.11.2026 (mutarea în cloud). De aici înainte o ține la zi linia, pe ramura ei, odată cu feliile. -->

_cncvs2, linia incrustațiilor (etapa 12): worktree `C:\\Users\\besli\\cncvs2-lucru\\incrustatii`, ramura `wip/12.1-incrustatii`; 12.1↑–12.1↑f-4 (v20–v25) UNITE în main (`70bc8169`); 12.1↑e (dopul în 3D, ADR 0178) UNITĂ în main 20.11 (`b3c3970f`); titlul dopului reparat 21.11 (`f9c45042`), UNIT în main 21.11 seara (`3d7e6214`, lotul `8e96ff13`, pe test); 12.1↑e-2 (secțiunea, ADR 0179) GATA 22.11, de unit la `082435b4` (FF peste main `88be9d6c`); 12.1↑e-3 (pereții drepți în secțiune) WIP `2b7f889b`, oprit la pauza din 22.11 23:02 (pașii de reluare în nota comună); bifa pe rând ar lua v27_

Pornită pe 06.11.2026 ca sesiune paralelă, la cererea owner-ului („vreau sa deschidem worktrees pentru alte etape sau
felii”, apoi „Inlays, stage 12”). Lângă ea: alte linii (tăierea vectorilor, planșele, trasarea, imprimanta, biblioteca) și
sesiunea principală (ține `main`, unește liniile doar la cuvântul owner-ului).

- **Locul:** worktree-ul `C:\Users\besli\cncvs2-lucru\incrustatii` (joncțiuni spre `node_modules` din checkout-ul principal),
  e2e pe 4174 cu `CNCVS2_E2E_RETEA=127.0.1`, previzualizarea build-ului pe 4184 (`cncvs2-incrustatii-dist` în
  `Apps/.claude/launch.json`), canalul `incrustatii`: <https://cncvectorstudio-test--incrustatii-pt5g8i2y.web.app> (până pe 20.12).
- **12.1↑ (V, v20):** răspunsurile „1a; 2 … 3 … 4a+b; 5a; 6 - si a si b” (banda și fața coborâtă ALESE LA EXPORT, banda în
  12.1↑c; fundul doar cu V în 12.1↑d). Încheiată 07.11, 13:01; UNITĂ în `main` (80cc176, „Yes, merge both”).
- **12.1↑b (pereții drepți, v21) încheiată 07.11, 18:50** (NEUNITĂ): „Da, toate trei” → dopul ridicat/decupat, sprijinul,
  frezele dopului, TOATE alese la export. Otrăvurile 54/54; `main` 1bf99c5 unit în ramură (`34e852e`).
- **12.1↑c (banda + decuparea V, v22) încheiată 07.11, 23:06** (`138e94d`, NEUNITĂ; ADR 0172 acceptat): răspunsul „ca de
  obicei, vreau cat mai multe optiuni pe care userul sa le poata alege” → lățimea, decuparea, placa, freza decupării, punțile,
  toate în fereastră, recomandarea = implicitul. Dopul în V mutat în `src/cam/dopV.ts` (fără ciclu cu `job.ts`). Decuparea
  PE LINIE pe reuniunea exterioarelor ⊕ (e + r), golurile reuniunii tăiate afară (rama din bare). Otrăvurile 66/67 → 69/69;
  e2e 363/363; totalul 528,1 / 550 kB pe ramură (+3,0; linia +12,9 față de 06.11, acceptat la întrebarea 6). Pe `main`,
  plafonul total e 600 kB din 07.11 (ADR 0143, „Yes, 600 kB”, `c73177f`; main la 535,0 / 600), pornirea tot 110: vine cu
  `main` adus în ramură (ramura nu atinge `build-determinist.ts`), iar bugetul liniei (~10 kB) se spune tot owner-ului la
  fiecare felie. La unire: v22 e a liniei,
  planșele iau v23; CLAUDE.md (proba v22, câmpul nou → v23) e al sesiunii principale.
- **Freza dopului drept (12.1↑b), bifată, pornește tot de la primul T liber** (`tMaxim` din `DialogExport`, comun cu freza
  decupării): „Da, repară-l”, `0fc2ea0`, otrava E16 a listei 12.1b; ramura împinsă la `1c4cd91`, canalul pe `0fc2ea0`.
- **Înaintea unirii (08.11, „1 si 2 acum 3-6 dupa”):** punțile dopurilor decupate pe fiecare buclă câte încap (`urechiCareIncap`
  în `cam/urechi.ts`, `puntiPeBucle` în `cam/incrustatie.ts`; un „i” cu punct refuza tot exportul), `main` adus în ramură
  (`1749acc`, apoi `4da55a1`), porțile pe rezultat (unit 8 715, e2e 381/381, 544,0 / 600 kB), otrăvurile 12.1c 75/75. Ramura
  se unește CURAT cu main; unirea, a sesiunii principale. După unire: lemnul din jurul dopului din panou, punțile dopului drept
  în fereastră (câmpul poate intra în v22 cât nu e unit), arborele și legăturile rândurilor, viteza benzii (~10 s / 24 litere).
- **12.1↑b–c UNITE în `main` pe 08.11** (`9692385`, fără conflicte, arborele lui `4da55a1`; „Da, așa” al owner-ului, în
  sesiunea planșelor: unirea întâi, planșele iau v23 peste ea; documentele `031e41a`, publicat pe test cu `031e41a`):
  documentul v22 în main; **v23 e a planșelor**, deci un câmp nou aici ia **v24**, după ce v23 intră în main. Încercările
  owner-ului (12.1↑, ↑b, ↑c) stau pe adresa principală de test, „când vrei”.
- **12.1↑c-2 (08.11, 14:05–15:59; punctele 3, 5, 6; id-ul cu cratimă: `RE_ID` din `scripts/documentatie.ts` nu primește
  „c2”):** `main` adus prin fast-forward; viteza benzii (indexul contururilor din `cam/axaMediala.ts`: cercul arcului ținut pe
  segment, segmentele benzii pe Y sărite după cutie, marja 1e-6; aceleași programe: amprentele a 12 exporturi; banda 9,6 →
  3,7 s), cheia rândurilor legate cu incrustația (`incrustatieVRand` în `DialogExport.tsx`), arborele „cu banda îngustă”,
  lemnul din jurul dopului ales din panou (`inc-jur` în Tăierea). Commit-uri: `050588e` (cod), `dbcd168` (proba arcelor de
  90°, pentru otrava V10), `3875510` (documente), `3afc575` (main `4eb34da` adus, doar DEVLOG); împinsă, se unește curat;
  Otrăvurile 16 / 16; canalul pe `dbcd168`. Owner-ul: „Da, unește” (08.11) → **UNITĂ în `main`** (`079d225`, arborele lui
  `3afc575`), publicată pe test cu `0d54112` (adresa principală servește `0d54112308de`). Pe linie rămâne doar punctul 4
  (punțile dopului drept alese în fereastră), cu **v24**, după ce v23 a planșelor intră în main. `main` a primit apoi și
  ancorele (`0c81ccf`, `8714306`): vin la următoarea aducere a lui `main` în ramură.
- **12.1↑d (13.11, de la 17:58; „Yes, start 12.1↑d”, transmis de sesiunea principală):** `main` adus prin fast-forward
  (`3afc575` → `2225a54`, 183 de commit-uri; plafonul total e acum 700 kB, ADR 0144). ADR 0173 acceptat din ADR 0170 §4:
  fundul doar cu freza V = coloana Fund plat goală, deci FĂRĂ câmp nou (v22). `traseuVcarve` primește `fundV: { creasta }`
  (inelele la wD + j·sv, sv = 2c·t, tăiate pe contur ca inelul peretelui; plafon 400 de inele), crestele în
  `valoriIncrustatie` (`creastaLocas` = g/2, `creastaDop` = H/2); `valoriBanda` merge fără freza fundului (`freza` poate fi
  null); refuzul nou: decuparea fără freza ei. Cod `5192da6`; e2e 459 / 459; totalul 654,4 → 654,9 / 700 kB. Otrava F18
  (scăpată) a arătat avertismentul inelelor dat de două ori (dopul trimitea deja toate avertismentele V-carve-ului): rândul
  scos (`18e8c60`), F18 retrasă; 12.1d 24 / 24. Documentele `9c510ea`, main `50f2595` adus (`f212a10`, doar DEVLOG în
  conflict); împinsă, se unește curat; canalul pe `18e8c60`, verificat fără export. Owner-ul: „Da, unește” (13.11) → **UNITĂ
  în `main`** (`0f4c22c`, din ramura la `2c9173c`, cod identic; `main` la `7cc9800`, totalul 658,0 / 700). Pe test, după
  reparația lui 3.6s (CI-ul complet de pe `main` era roșu din cauza benzii imprimantei, nu a feliei).
- **12.1↑b-2 (13.11 22:12 – 14.11 00:20; punctul 4 al listei din 08.11, deblocat de v23 în `main` la `d62e6b8`):** documentul
  **v24** (`punti` opțional pe incrustația dreaptă; ciocnirea la v23 → v24 pe orice fel), `PUNTI_DOP_DREPT` în model (ale benzii
  = aceleași), câmpurile ferestrei doar la decupat; implicitele NU se scriu peste un dop fără ele (fără comandă la un Exportă
  neschimbat). Commit-uri `9185658` (cod), `919b80c` (corpusul v24), `7ee2ca2`, `0aac269`, `9a73aa6` (documente); împinsă,
  canalul pe `0aac269` (până pe 14.12), verificat fără export. Otrăvurile 12.1b-2 26 / 26; 12.1b P06, P11 reorientate. La
  unire: CLAUDE.md al sesiunii principale (următorul câmp nou ia **v25**).
- **PAUZĂ (14.11, după 00:20; „pauza peste tot” al owner-ului, transmis de sesiunea principală):** linia oprită CURAT, la
  `9a73aa6` (local = `origin`, arbore curat, nimic pornit). Felia 12.1↑b-2 e ÎNCHEIATĂ (nu în lucru), doar NEUNITĂ: nicio cerere
  de unire trimisă în pauză. La reluare: întâi cuvântul owner-ului pentru unire (o face sesiunea principală; `main` era la
  `0e3725c`, v23, plafoanele 115 / 800 kB, deci la unire numerele mărimii se recitesc pe codul unit, iar DEVLOG-ul se ciocnește
  la capăt); apoi, doar la cuvântul lui, 12.1↑f (gaura și treptele) sau 12.1↑e (dopul în 3D).
- **Reluarea (16.11, „poti sa continui … sau poti sa unesti ce se poate”):** sesiunea principală unește 12.1↑b-2 (`9a73aa6`;
  porțile le rulează ea; conflict doar în DEVLOG) și mi-a dat 12.1↑f. **ADR 0175 PROPUS** (`2fef1ae`, împins): gaura (prin foaie,
  adâncimea = grosimea + supracursa; dopul decupat la nivel cu fața de jos sau ridicat pe față), treptele (spre interior / exterior,
  umărul d, s; dopul în trepte mereu OGLINDIT, cu tija în sus), documentul **v25** (`locas`, `treapta`, sprijinul `'umar'`);
  schița <https://claude.ai/artifact/L9buqcaGfDVW4oajmuCxZR>; trei întrebări (cum știe că e gaură, cum se taie gaura, ordinea).
- **12.1↑f GATA (16.11 18:18 – 17.11 10:03; „Da, cu recomandările” = 1a, 2a, 3a):** documentul **v25** (`locas`, `treapta`,
  sprijinul `'umar'`; treapta și umărul REFUZATE de lucrare până la 12.1↑f-2), gaura prin foaie (`cuGauriPrinFoaie` în
  `programDinDocument`: adâncimea = grosimea foii + supracursa; dopul din grosimea foii). Commit-uri `31c04e1` (cod),
  `5ce26ef` (corpusul v25; ISTORIE v24 → `79a0966`), `28ce8ee` (`main` `22ab3de`, cu 12.1↑b-2 unită, adus), `2af883d` (e2e
  din otrava H20), `ca0fd4a` (documente); împinsă. Porțile pe ramura unită verzi (o cădere de încărcare a fonturilor, verde
  singură); otrăvurile 12.1f 27 / 27; canalul pe `2af883d` (până pe 17.12). Mărimea: felia +0,8 kB; ramura unită 709,0 / 800,
  cu ușa 110,3 / 115. Supracursa NU e în fereastra exportului (0). Peste `main` `021dcc6`: conflict doar în DEVLOG. La unire:
  CLAUDE.md, următorul câmp nou ia **v26**. **UNITĂ în `main` pe 17.11** (`d2ef229`, exact `ca0fd4a`; `main` la `4b52fc3`).
- **12.1↑f-2 GATA (17.11, 11:16 – 22:17; cererea sesiunii principale după unirea lui 12.1↑f, `main` `4b52fc3` adus prin
  fast-forward):** treptele (spre interior, spre exterior) și dopul în trepte, mereu oglindit, cu tija în sus. Dopul ridicat:
  fața coborâtă în jurul flanșei plus buzunarul din jurul tijei. Dopul decupat: buzunarul din jurul tijei plus `decupareCuPunti`,
  acum comună cu dopul decupat simplu. Sprijinul pe umăr. Fără document nou (v25).
  - ADR 0175, precizarea din 17.11: pe fund, tija D − d + g și flanșa d − g + H. ADR-ul scria „D − d”, care n-ar fi lăsat g
    deasupra umărului.
  - Implicitele umărului: jumătate din locaș, 3 mm.
  - Commit-uri: `18210e4` (cod, probe, liste), `f01833f` (condiția moartă scoasă, din otrava T19), `8384d56` (documente);
    împinsă.
  - Porțile: unit 9 464 / 1, căderea fiind o probă de timp SVG, singură 29 / 29. E2e 498: 37 căzute sau nerulate din timp,
    cu mașina la 91 % CPU, reluate cu un lucrător 142 / 142.
  - Otrăvurile 12.1f-2: 49 / 50, T19 scăpată pe cod mort și retrasă. 20 reorientate în 12.1, 12.1b, 12.1b-2, 12.1c, 12.1f, toate
    prinse; H14 și H15 retrase.
  - Canalul pe `f01833f` (până pe 17.12), verificat fără export.
  - Mărimea: +2,4 kB (709,5 → 711,9 / 800); pornirea și ușa neschimbate.
  - Reluată pe 18.11 (procesul oprit pe 17.11 la 22:17, în timp ce scria documentele; găsite întregi). `main` `ae5a13c`
    unit în `d48ad64`, cu conflicte doar de adăugare, în documente (DEVLOG, registrul otrăvurilor, `roadmap.en.json`).
    Porțile pe ramura unită: unit 9 495 / 1 (probă de timp a raportorului, singură 51 / 51); e2e 498 / 509, iar cele 11
    căzute din timp au trecut la reluarea cu un lucrător (99 / 99); totalul 719,1 / 800, pornirea cu ușa 110,6 / 115.
    Documentele în `aa9f325`, împinsă; canalul pe `d48ad64` (până pe 18.12). Unirea în `main` e fast-forward. 7 VOID-uri
    venite cu `main`, în listele altor linii (10.3j, 25.2, 25.3b, 25.3c, 3.6o), spuse sesiunii principale.
  - UNITĂ în `main` de sesiunea principală (`89083cb`, exact `aa9f325`; decizia în CLAUDE.md, `e88dbc1`).
- **12.1↑f-3 GATA (18.11, 12:06 – 16:05; owner-ul, aici: „Da, pune-o” la întrebarea din 17.11 despre supracursă):** `main`
  `c302d73` unit întâi (`97a69f0`, conflicte doar în documente). ADR 0176: câmpul „Supracursa (mm)” lângă Z0 (0–2, implicit 0,
  ținut în `App.tsx` ca `$$`, fără document nou); pe foaie, ADR 0028 §2 neschimbat (voie, nu adaos; gaura T + s); NOU, decupările
  dopurilor (drept simplu, în trepte, banda în V) trec cu s, punțile își păstrează grosimea. Cod `0e3b8e7`, documente `938a3bc`,
  împinsă. Unit 9 517 / 0, e2e 528 / 528 din prima, 723,8 / 800 (+62 B JS), otrăvurile `12.1f-3.py` 21 / 21 (+ C12 reorientată).
  Canalul pe `0e3b8e7` (până pe 18.12). Propus, NEcerut: tăieturile „prin foaie” ținute la zi cu foaia (câmp în document, v26).
- **12.1↑f-4 GATA (18.11; owner-ul: „vreau sa fie optiune la alegerea userului”):** bifa „și tăieturile cât foaia” lângă
  supracursă (ADR 0177); cod `416d04a8`, documente `2861e718` (otrăvurile 18 / 18). La oprire rula doar o PROBĂ de unire cu
  `main` `c2483e2` (`merge-tree`: ciocniri în `DialogExport.tsx`, `ExportConectat.tsx`, DEVLOG); worktree-ul a rămas curat,
  fără nicio unire începută (verificat 19.11). Implicitul bifei e PUSĂ (titlul câmpului: „cât coboară tăieturile prin placă”);
  în cererea de export lipsa ei = nu, deci exporturile vechi și probele API nu se schimbă.
  - **12.1↑f-3 și f-4 UNITE în `main` de sesiunea principală pe 19.11** (`70bc8169`, exact `2861e718`). Ciocnirile, doar în
    listele de proprietăți (`trimite`, din 28.1↑d, lângă `supracursa` și `prinFoaie`), rezolvate la unire.
  - Porțile pe unire sunt verzi; `main` e la `2cc431ff`.
  - La reluare, `main` se aduce în ramură prin fast-forward.
- **12.1↑e GATA (19.11 21:16 – 20.11 10:53; owner-ul: „12.1↑e, dopul 3D”):** `main` `4b7539a7` prin fast-forward. ADR 0178:
  în vederea 3D „Foaia / Dopul N” (doar cu dopuri), dopul simulat pe semifabricatul lui; `dopurileFoii` = o funcție, a
  exportului și a vederii; un dop refuzat nu oprește foaia (`motivDopuri`). Cod `2491fdc`, documente `c576138a`, împinsă;
  UNITĂ în `main` pe 20.11 de sesiunea principală, în lotul cu 3.Tp (`b3c3970f`; nu fast-forward, `main` primise 3.Tn;
  ciocnirea doar în DEVLOG, ambele părți păstrate; porțile lotului verzi: unit 9 644 / 0, e2e 570 / 570). Unit
  9 631 / 0, e2e 562 / 562, 739,4 / 800 (+626 B JS), otrăvurile `12.1e.py` 21 / 21 + 9 reorientate. Canalul pe `2491fdc`
  (până pe 20.12), verificat. Văzut pe canal: titlul butonului „Dopul N” arată id-ul intern al incrustației („e1/e1”), de
  înlocuit într-o felie mică. Rămân: 12.1↑e-2 („Împreună (secțiunea)” + potrivirea simulată), bifa „prin foaie” pe rând (v26).
  În 4.A, K03, K04, M02, M04, M05 sunt VOID și pe `main` (alte linii), spuse sesiunii principale.
- **Titlul dopului GATA (21.11 17:54 – 19:41; owner-ul: „Titlul dopului”, la „Ce fac mai departe pe linia incrustațiilor?”):**
  `main` `a64adf63` prin fast-forward. `descriere` (forma, mărimea, locul) mutată din `App.tsx` în
  `src/app/descriereElement.ts`; titlul „Incrustația: … . Semifabricatul dopului: …” (ADR 0178, precizarea din 21.11). Cod
  `75e304d0`, documente `f9c45042`, împinsă, NEUNITĂ (unirea e fast-forward). Unit 9 643 / 1 (proba pe ceas DXF sub
  încărcare, singură 0,55 s din 5), e2e 568 / 570 (2 căderi din timp în `taiere.spec.ts`, reluate 16 / 16), 739,5 / 800
  (+110 B JS), otrăvurile V10–V16 7 / 7, niciun VOID nou. Canalul pe `75e304d0` (până pe 21.12), verificat. Procesul s-a oprit
  la jumătatea feliei (codul 3221226505): reluată din `git status` (doar proba modificată).
- **12.1↑e-2 GATA (21.11 19:52 – 22.11 21:35; owner-ul: „12.1↑e-2, secțiunea”, cu implicitele: calcul nou + V întâi):**
  ADR 0179. „Împreună (secțiunea)” lângă dopuri (doar dopul în V): `potrivireaV` (`src/sim/potrivire.ts`; grilele de 0,1 mm prin
  oglindă, desenul rasterizat + transformarea distanței Felzenszwalb, benzile contractului, rândurile, secțiunea), descriptorul
  `DopCalculat.potrivire` (`dopV.ts`), cererea `potrivire` în lucrător, `Sectiune3D.tsx`. Cod `9870f7ce` (+ `a11d855e`,
  proba refuzurilor), `main` `40487c43` unit în `ec14bc4a`, documente `d91c4ed1`, împinsă, NEUNITĂ (nu fast-forward peste
  `88be9d6c`: ciocnire doar în DEVLOG). Unit 9 670 / 0, e2e 580 / 580, 745,4 / 800 (+3,6 kB JS), otrăvurile `12.1e-2.py`
  38 / 38 (+ 12.1e D03, D06, D07). Canalul pe `a11d855e` (până pe 22.12), verificat cu Playwright. Procesul s-a oprit aseară
  înainte de commit (porțile trecuseră): reluată azi. Rămân: pereții drepți și treptele în secțiune (12.1↑e-3); bifa pe rând
  (acum v27: v26 e a urechilor la locuri alese, 11.3↑d).
- **12.1↑e-3 WIP (22.11 21:52 – 23:02; owner-ul: „12.1↑e-3, pereții drepți”; treptele → 12.1↑e-4):** oprit la pauza
  owner-ului („cand termina background tasks, vreau sa facem pauza”, transmisă de sesiunea principală). Comis WIP `2b7f889b`
  și împins, arborele curat. Codul și probele sunt gata: `potrivireDreapta.ts`, `taiereExacta.ts` (jocul exact pe mutări),
  descriptorul din `dopDrept.ts`, dispecerul, tabelul cu cinci rânduri, lista `12.1e-3.py` (46). Nerulate: e2e-ul 3D după
  reparația testului decupatului, porțile lente, otrăvurile, documentele, canalul. Pașii exacți sunt în nota comună
  `incrustatii-worktree.md`, iar scripturile în `.tmp/unelte-12.1e-3/`. 12.1↑e-2 se unește din `082435b4`, nu din vârful
  ramurii. La reluare: întâi `git status` și `git log -1` (așteptat `2b7f889b`, curat).
- **Lecții (12.1↑e-3):**
  - În `src/sim/` (afară de `timp.ts` și `animatie.ts`), `Math.hypot`, `atan2`, `sin`, `cos`, `pow` și `**` sunt interzise
    (`simulare.unghi.test.ts`): se folosesc √ și funcțiile din `unghi.ts`. Prinde și cod care nu scrie celule.
  - Un rând „pe hârtie” trebuie derivat din contract, nu copiat din câmp: la gaură, cu dopul ridicat pe față, g e 0, nu
    `inc.joc`. Proba pe gaură a arătat-o.
  - Dopul decupat cere marginea cel puțin cât freza lui. Un e2e cu Ø6 și marginea 5 e refuzat la export, deci bifează
    „Altă freză pentru dop” (Ø3).
  - Un rând redundant (cercul întreg, cuprins oricum de unghiul normalizat) se vede gândind mutantul: se scoate.
- **Lecții (12.1↑e-2):**
  - O măsurare cu benzile alese după suprafețele simulate (fără desen) nu vede un fund prea puțin adânc: iese din bandă, nu e
    roșu. Benzile se aleg după geometria contractului (aici, desenul rasterizat + transformarea distanței).
  - Cod care nu se poate atinge (rama benzii, mereu în afara ferestrei) se scoate înainte de porți: altfel otrava lui scapă.
  - Un mutant echivalent (J02: `sus` doar filtrează mișcările în aer) se mută pe ceva neprobat (refuzul dopului drept), cu proba lui.
  - O rulare e2e a unei otrăvi poate atârna 30 min și lăsa `vite preview` pe portul worktree-ului: următoarele ies „NEVALIDE”.
    Oprește procesul rămas (după port, părintele mort) și reia-le.
  - Scratchpad-ul se poate goli între zile: scripturile de care depinde felia se refac (aici `void_noi.py`).
  - Privirea pe UI cu panoul browserului ascuns: Playwright cu profil curat pe build sau pe canal (captura, apoi `Read`).
- **Lecții (titlul dopului):**
  - Publicarea canalului din Git Bash cere `PATH="/c/Users/besli/AppData/Roaming/npm:$PATH"` (`firebase` e în npm-ul global;
    nici PowerShell nu-l găsea).
  - Garda unui script de documente verifică TITLUL intrării noi, nu o frază care poate apărea și în intrările vechi.
  - Probele pe ceas (bomba DXF, < 5 s) cad cu mașina încărcată de e2e-urile altor sesiuni: reia-le singure, cea mai bună
    din 3.
  - Baza pentru mărime: joncțiunea `node_modules` scoasă cu `cmd //c rmdir`, cu gardă înainte de `rm -rf` (altfel `rm`
    poate goli `node_modules` din checkout-ul principal).
- **Lecții (12.1↑e):**
  - O listă de otrăvuri se verifică pe codul reviziei ei: lista din HEAD (cu ținte reorientate) pusă peste codul lui `main`
    arată VOID-uri false.
  - Porțile lente pornite seara se pot opri peste noapte (e2e la 555 / 562, jurnalul tăiat): reia-le întregi dimineața.
  - Așteptarea „un minut de liniște” (cel mult 20 min) poate să nu-l găsească: cu alte sesiuni la e2e pornește la capăt.
  - În browserul aplicației, `find` n-a găsit butoanele din insula vederii 3D: coordonatele din `getBoundingClientRect`,
    scalate la cadrul capturii (800 × 600).
- **Lecții (12.1↑f-4):**
  - Oracolul unei opțiuni de export „ca și cum ai fi scris X”: ECHIVALENȚA octet cu octet cu documentul scris de mână
    (prinde felurile excluse, toleranța, dublarea), plus o adâncime deja peste foaie, ca să prindă „≥” în loc de „=”.
  - Titlul scurt (`titluScurt`, `scripts/documentatie.ts`) se taie la prima virgulă care lasă ≥ 3 cuvinte: titlul ADR-ului
    și rândul din index se aleg cu prima parte, fără virgulă, care spune tot.
  - Git poate alinia două intrări DEVLOG diferite (12.1↑f-2 cu A.1) în mai multe blocuri: când `main` are deja intrările
    comune, ia fișierul lui întreg și adaugă doar intrările ramurii care lipsesc (verificat pe titlu + text).
- **Lecții (12.1↑f-3):**
  - Postul taie comentariile G-code lungi: un text adăugat la eticheta unei operații iese trunchiat (și mănâncă finalul ei).
    Eticheta operației din `job.ts` arată deja adâncimea.
  - Oracolul `masoaraPotrivireaDreapta` dă la dopul decupat ȘANȚUL cel mai adânc, nu dopul: cu supracursă, placa + s; dopul e
    placa (`semifabricat.grosimeMinima`, `exacta`).
  - Worktree-urile au aceleași ref-uri: fetch-ul altei sesiuni mută `origin/main` sub tine. Verifică „fast-forward” chiar
    înainte de raport (`merge-tree --write-tree --name-only HEAD origin/main`).
  - Fila canalului pornește pe build-ul vechi din cache-ul PWA: după încărcare, citește `meta[name=cncvs2-versiune]`; la
    banda „Reload” (lucrătorul nou în așteptare), apasă-l, apoi verifică din nou.
  - O probă e2e a feliei în fișierul ei: otrăvurile ferestrei rulează ~25 s fiecare (build + spec), nu tot spec-ul liniei.
- **Lecții (12.1↑f-2):**
  - Buzunarul din jurul unei insule, cu marginea exterioară la offset = raza frezei, lasă la un umăr îngust un canal cât freza
    (s + R + 0,5 = Ø). Oracolul l-a văzut (jocul 0,078, interferență); marginea se ia cu diametrul.
  - O comparație de VOID-uri pe un `git archive` PARȚIAL e falsă: listele cu fișiere în afara dosarelor scoase crapă fără
    „VOID”. Compară otravă cu otravă, cu `git show HEAD:fis`.
  - Codul dublat (decuparea cu punți, scrisă de două ori) dublează și țintele otrăvurilor („apare de 2 ori”): scoate funcția
    comună.
  - `pgrep` nu există în Git Bash.
  - Cu alte worktree-uri pornite, e2e-ul întreg cade din timp, pe pornirea aplicației (5 s); reia fișierele căzute cu
    `--workers=1`.
- **Oprirea de peste noapte (16 → 17.11):** procesul sesiunii a murit în timpul lotului de otrăvuri; `.tmp/otravuri.log`
  arăta lotul terminat (fiecare „restaurat sha ok”) și `git status` curat. La o oprire: întâi jurnalul și `git diff` pe
  `src`/`test` (o otravă rămasă aplicată), apoi reiei.
- **Lecții de aici:** la urcarea versiunii documentului, caută în e2e și forma `.schema).toBe(N)` (`placute.spec.ts` a scăpat
  căutării după `schema: N`). Oracolul `functieTaiere` ia doar mutările aflate TOATE sub z: flancurile unei punți (și bucata
  de jos a unui flanc tăiat la colț) schimbă bucata netăiată, deci lățimea unei punți se măsoară pe toată linia de mijloc a
  șanțului (și colțurile), chiar deasupra fundului (z = −fund + 0,01), cu valoarea de pe hârtie W + 2ℓ − Ø
  (`geometrieUrechi`); un prag „≥ lățimea” trecea pentru orice lățime (otrava B07). Axa medială nu converge pe un dreptunghi de 200 × 100 (laturi lungi, 30 000 de eșantioane): o probă
  „mare” se face pe un cerc. `node --test ""` (un argument gol) rulează toată suita. Un rând nou în indexul ADR intră în
  roadmap (titlul lui cere traducerea, `scripts/traduceri.ts`), iar build-ul cade dacă ADR-ul nu are rândul în index.
  Felia care scoate un refuz scoate și otrăvurile lui: retrase cu notă, cu țintele noi numite. Toate cazurile oracolului erau
  simetrice față de verticală, deci un dop NEOGLINDIT trecea (cazul L);
  `String.replace(text, text)` mănâncă `$$` („Shell: capcane”); un câmp NOU în `ValoriOperatie` se scoate explicit
  în `operatieDinDialog`. Un profil pe fiecare buclă taie în piesa buclei vecine: tăietura pe linie pe reuniune. O otravă
  scăpată (banda pe jumătate) a arătat o proprietate a ADR-ului netestată (tăietura pe fundul plat), nu un instrument greșit.
  Un T implicit „altă freză + 1” ciocnește în proiecte reale: implicitul e primul T liber. O probă e2e cu oracol pe octeți
  are nevoie de timpul ei (cu trei lucrători trece de 30 s). Lucrarea pune un număr FIX de urechi pe buclă: pe bucle mici (punctul
  unui „i”) refuză tot exportul, deci punțile dopurilor se potrivesc pe fiecare buclă. După un merge, numărătorile (capitolele
  manualului) unite singure de Git pe ambele părți sunt greșite: recalculează-le. Heredoc-ul din Git Bash strică `\\n` → scripturile prin `Write`;
  `importlib` pe o listă de otrăvuri lasă `__pycache__` (→ `python -B`). O optimizare se dovedește cu amprentele ieșirilor
  (SHA-256 al programelor, înainte și după, pe cazuri cu arce și litere reale), nu cu porțile verzi; profilul V8
  (`--cpu-prof` + rezumatul propriu/cumulat) arată locul înainte de cod. Otrăvurile e2e lasă în `dist/` build-ul ULTIMEI
  otrăvi: refă build-ul înainte de publicare. O mutare de cod (o funcție scoasă) face VOID otrăvurile vechi care o țintesc:
  `verifica` pe toate listele liniei, apoi reorientează-le.
- **De ce contează:** în ediția întâi, dopul a fost 3,5 luni a doua cavitate (testul judeca structura); aici proba e
  potrivirea simulată, cu valori pe hârtie.

Legat: [sesiunea principală](principala.md), [Uneltele worktree-urilor locale (de dinainte de cloud)](unelte-worktree.md), [„Segmentează (plan mic)”](lectii.md#feedback-segmentare-plan-mic).
