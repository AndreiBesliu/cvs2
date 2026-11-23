# Trasarea din imagine (25.x↑)

<!-- Adusă din memoria sesiunii principale pe 23.11.2026 (mutarea în cloud). De aici înainte o ține la zi linia, pe ramura ei, odată cu feliile. -->

_cncvs2, linia trasării din imagine (etapa 25): 25.1↑–25.3↑b UNITE în main pe 09.11 (`e277836`); 25.4↑ (scanările și pozele, ADR 0224) UNITĂ în main pe 09.11 (`0ebbd99`, de la `304ea37`; vârful `30448ea`); 25.5↑ (foaia pozată oblic, ADR 0225) UNITĂ în main (`07df71f`, de la `1ca446b`; main `0e3725c`); 25.4↑b (lumina pe culori, ADR 0226) UNITĂ în main pe 16.11 (la `94bf287`); 25.3↑c (liniile mediane pe culori, ADR 0227) UNITĂ în main pe 16.11 (`380c053`); 25.3↑d (punctele pierdute, corectura ADR 0222) UNITĂ în main pe 17.11 (`dd21a8a`); 25.3↑e (rezultatul pe fiecare culoare, ADR 0228) UNITĂ în main pe 17.11 (`a3e81f6d`); 25.6↑ (imaginile TIFF, ADR 0229) UNITĂ în main pe 18.11 (`fd63de8e`); 25.7↑ (PDF-urile scanate, ADR 0270) UNITĂ în main pe 18.11 (`9bf53378`); 25.4↑c (îndreptarea scanărilor, ADR 0271) UNITĂ în main pe 22.11 (`9071e62f`); 25.8↑a (imaginile pe foaie, ADR 0272 acceptat „Da, 1a–3a”) în PAUZĂ 22.11 seara: cod + otrăvuri 43/43 + main `88be9d6c` adus + canal `2ab74269dc29`, vârful `2ab74269` împins; rămân e2e-urile vecine și documentele (scripturile în `.tmp/documente-0272b.py`, `c`, valorile în `.tmp/valori-0272.json`; pașii în nota comună `trasare-worktree.md`); 758,4 / 800 kB; ADR 0270–0279 ale trasării (următorul liber 0273); e2e-ul worktree-ului pe portul 4183 (4179 e și al clonei `otravuri-taiere`); worktree-ul `cncvs2-lucru\trasare` (ramura `wip/25.1-trasare`) pe disc_

Pornită pe 07.11.2026 de sesiunea principală, după ce owner-ul a întrebat ce se mai poate face în paralel. Lângă ea: incrustațiile
([Incrustațiile (12.1↑)](incrustatii.md)), imprimanta ([Imprimanta 3D (K1C)](imprimanta.md)), planșele ([Planșele (etapa 11)](plansele.md)).

- **Locul:** worktree-ul `C:\Users\besli\cncvs2-lucru\trasare` (joncțiuni `node_modules`), e2e pe 4179 cu
  `CNCVS2_E2E_RETEA=127.0.6`, ADR-urile 0220–0229, canalul `trasare`
  (<https://cncvectorstudio-test--trasare-icw58h57.web.app>, până pe 08.12). Nota de predare: `trasare-worktree.md` în dosarul
  de note al grupului de sesiuni. Oracolul Python rulează din `.tmp/venv-trasare` (nu din `python`: lipsesc fontTools, skimage).
- **25.1↑ alb-negru** (ADR 0220, „Da, 1a–8a”): nucleul propriu `src/trasare/trasare.ts` (regula `trasare-izolat`), workerul
  lui, fereastra din „Importă…”, corpusul Python cu scikit-image, 69 de otrăvuri.
- **25.2↑ culorile** (ADR 0221, „Da, 1a–5a”): nucleul `src/trasare/culori.ts`, legăturile `src/trasare/legaturi.ts`, piesele
  aduse împreună prin `ImportPregatit.impreuna`. Paleta logoului owner-ului: gri (cu umbrirea), albastru, portocaliu.
- **25.3↑ linia mediană** (ADR 0222, „Da, 1a–5a”, 08.11; pașii `35fa4bf`, `a4048dd`, `c32be76`, `7115a1f`): nucleul
  `src/trasare/mediana.ts`; `campul` (cerneala, pragul, curățarea) comun cu `traseaza`; `CaiTrasate.deschisa`; buclele în
  operația căilor deschise. Corpusul `mediana.json` (24 de trăsături, martor `skeletonize`). Otrăvurile 57 / 57. +4,6 kB.
- **25.3↑ corectată după logoul owner-ului** (08.11, `ab336f1`, `ad11061`, `0430183`; ADR 0222 „Corectura”): centrarea după
  lățimea locală, colțurile refăcute, dreptele brațelor și ale colțurilor doar pe porțiunea dreaptă (`MEDIANA.drept` 0,5 px),
  curățarea brațelor până la (w/2)/tan(θ/2) (θ din dreptele unei prime treceri), perechile curbe ca o dreaptă prin primele
  puncte (`prelungire` 5°, fără vecini sub 45°). Corpusul 28 de trăsături; probele logoului (colțuri, „e”, capetele la urechi).
  Otrăvurile 77 / 77. Totalul 563,3 / 600.
- **UNITĂ în `main` pe 09.11** (sesiunea principală, la „Yes, merge trasarea”): `e277836` (de la `942bf62`), vârful `9773cd6`;
  conflictele doar în documentele comune; porțile pe unire verzi (8 857 unitare, e2e 406 / 406); pornirea 101,9 (cu ușa
  105,5 / 110), totalul 577,2 / 600. Publicarea pe test, după CI-ul complet; rândul „Încercarea trasării” se mută de pe canal
  pe adresa principală de test. Scoaterea worktree-ului `trasare` o face sesiunea principală (ca la celelalte unite).
- **25.3↑b GATA** (ADR 0223, „Da, 1a–3a”, 08.11; `d9340ff`, `942bf62`; `origin/main` unit întâi, `8dde2d2`): capetele în
  vârf, părțile late ca contururi (`src/trasare/partiLate.ts`: deschiderea, R0 + 0,5 px, resturile care o ating alipite) și
  semnalarea lor, buclele închise (încuibare); `CaiTrasate.peLinie`. Otrăvurile: 25.3b 36 / 36, 25.3 din nou 77 / 77. Schița
  <https://claude.ai/artifact/DzjN21HCFDDnZTZY8q38Pr> (formularul scrie `raspunsuri/owner` în baza paginii: citește-l cu
  ArtifactData când owner-ul spune „gata”); prototipul `.tmp/proto-253b.ts` (deschiderea morfologică, două EDT), datele
  schiței `.tmp/schita-0223-date.ts`, nucleul înghețat `.tmp/mut/mediana-c3.ts`.
- **25.4↑ GATA și UNITĂ în `main`** pe 09.11 (sesiunea principală, la „putem uni si trasarea din imagine.”: `0ebbd99`,
  fără conflicte, vârful `30448ea`; porțile pe unire verzi, e2e 417 / 417; încercarea trece pe adresa principală de test
  după CI-ul complet verde). Felia: („Da, 1a–2a”; ADR 0224 acceptat și implementat; `origin/main` unit întâi, `01f6673`, plafonul
  700 kB; codul `fe21e56`, `56d8138`, `3ecf19b`, documentele `b69c745`, vârful `304ea37`; pe canalul `trasare`, amprenta `3ecf19befdd7`):
  `src/trasare/lumina.ts` (fundalul neted: polinomul de gradul 3; fundalul local: închiderea, van Herk – Gil-Werman;
  raportul cu fundalul de cel puțin 1/4 din hârtia cea mai deschisă; creta întinsă după P99,5; polaritatea din mediana
  din jur), `OptiuniTrasare.lumina` / `margine`, `CerereTrasare.zona` (un decupaj; răspunsul are `intreg` și `zona`),
  fereastra (Lumina, bifa, butonul Zona, Shift, mutarea, întinderea). Otrăvurile 48 / 48 (`test/otravuri/25.4.py`).
  Totalul 582,5 / 700 kB. Schița: <https://claude.ai/artifact/U1jHQbsKGXNwopvJMBppCj>. Owner-ul n-a trimis încă o poză
  reală (rugat de două ori).
- **25.5↑ GATA** (13.11, „Da la 1-3a”: oprită implicit + sugestia, A4, previzualizarea foii + butonul Colțurile; ramura
  adusă la `origin/main` `29b69c0`; felia `906b518`, `8b972c5`, vârful `1ca446b`; NEUNITĂ, pe canalul `trasare`):
  `src/trasare/foaia.ts` (găsirea, rafinarea, Zhang și He cu INTERVAL, îndreptarea) + `src/trasare/colturi.ts` (geometria,
  FĂRĂ importuri: fereastra o folosește fără să tragă `trasare.ts` în bucata dialogului); `CerereTrasare.foaie`
  (îndreptarea ÎNAINTEA zonei; zona în pixelii foii; scara „foaie”); `AlegeriTrasare.foaie` (`src/io/imagine.ts`, tipul
  colțurilor scris STRUCTURAL: io-doar-model-geom interzice și un `import type` din `src/trasare`); fereastra: grupul
  Foaia, Colțurile cu mânerele (ciorna doar convexă, micșorarea la 0,5 doar în modul lor), „Găsește singur”. Otrăvurile:
  61 / 61 pe codul final (prima rulare: 42 / 47 unitare; K01, P05 → probe noi; G09, G10, G13 echivalente → cod scos) (`test/otravuri/25.5.py`). Totalul 660,2 / 700 kB (+5,8). Owner-ul n-a trimis încă o poză reală.
- **25.4↑b GATA** (13.11, „Da la 1-2a”; ramura adusă la `origin/main` `f663a5b`, cu PLANȘELE; felia `e6550b2`, vârful
  `94bf287`; NEUNITĂ, pe canalul `trasare`): `culoriLuminate` în `src/trasare/culori.ts` (NU în `lumina.ts`: pragul Otsu
  pe canal e `pragAutomat` din `trasare.ts`, iar `lumina.ts` nu-l poate importa — cerc, și lista 25.1 îl țintește acolo);
  fiecare canal raportat la fundalul lui; pe hârtie balansul de alb (culorile adevărate), pe tablă nivelul mediu.
  Lumina pe Culorile stă ÎNAINTEA numărului culorilor. Otrăvurile 17 / 17 (`test/otravuri/25.4b.py`). Schița:
  <https://claude.ai/artifact/D39edbszdytPh1zohWXZpd>. **Mărimea: ramura 696,1 / 700 kB** (`main` cu planșele 690,0):
  sub plafon mai încap 3,9 kB — următoarea felie care adaugă cod trebuie să-l măsoare întâi. Umbra tare pe formele
  pline: felie a ei, după o poză reală (răspunsul 2a). Owner-ul n-a trimis încă poze reale.
- **25.3↑c GATA** (16.11; oprită de pauza din 14.11 la `444bbe4`, reluată pe 16.11; vârful `86a1aef`, împins; canalul
  `trasare` la `63521531d5a9`, până pe 16.12). Răspunsurile: „Da la 1-2a” (13.11). Codul `405c2d1`: `src/trasare/medianeCulori.ts`
  (`traseazaCulori(..., doarEtichete)` fără plasă; masca fiecărei culori bifate ca ALFA, fără polaritate, la cutia ei +2 px;
  întâi `liniiMediane` pe toate, grosimea desenului = mediana TUTUROR lățimilor, pragul automat 2 × ea; apoi
  `traseazaMediana(img, o, om, cu)` cu liniile gata și cârligul `cu.leaga`, după părțile late și ÎNAINTEA curbelor:
  legarea pe liniile în pixeli, nu pe căi gata cum propunea ADR-ul → curbele trec peste legătură, un lanț închis e buclă).
  Gărzile legării, fiecare cu proba ei: față în față 25° (V la 10°/30°), ≤ 3 grosimi (banda de 20 px), niciun eșantion pe
  fundal (golul cu o linie de 2 px), măcar unul pe altă culoare (pata lată ca contur). `main` (`0e3725c`) adus în
  `78901a2`; porțile: 9 364 unitare (2 căzute din timp cât rulau alături e2e-urile planșelor; singure trec), e2e 50 / 50,
  698,3 / 800 kB, pornirea 105,7 / 115; 12 Mpx: 3,7 s. Otrăvurile 27 / 27; F06 scăpa din cauza unei probe din CURSĂ
  (refuzul vechi, de la alb-negru, avea același text), reparată în `6352153`. Unirea de probă cu `main` `bfdf2ed`: ciocnire
  doar în DEVLOG; adus apoi în ramură (`e34b93d`), porțile din nou (9 387 unitare: 2 căzute doar sub sarcină — sonda GRBL
  cu fereastra de 40 ms și viteza luminii —, liniștit 20 / 20; e2e 50 / 50; 698,6 / 800 kB), vârful `2cb1d81`. Urmare
  găsită: nucleul alb-negru pierde un disc mic centrat pe un colț de pixel (nici linie, nici punct).
- **25.3↑d GATA** (16–17.11, „Yes, all three”; felia `dbc7431`, probele `7d9ca29`/`16ccf3c`, vârful `366baf9`; canalul la
  `8335052fa1b5`). Cauza punctelor pierdute: Zhang–Suen (cu Lü–Wang) ȘTERGE TOT un bloc 2 × 2 și resturile scurte de 2 px
  grosime (dispăreau și capsula 9 × 6, și discul de 12 px), iar `retrage` nu rulează pe lanțuri de 2–3 px (rămânea
  liniuță). Reparația NU e în subțiere: după `linii`, `bucati` (8-vecinătate) ține regula ADR 0222 §5 pe fiecare bucată:
  (b − a) între centrele pixelilor < g + 0,5 → punct (căile scoase); lungă fără cale → dreapta axei între centrele
  capetelor; g = min(lățimea pe normală, 2·raza + 1) — +1 MĂSURAT (discul de 7 px dă 2·raza 5,66); plafonul ține „o”/„+”
  mici ca linii. CAPETELE ÎN VÂRF: nicio bucată nu e punct (dreapta de la vârf la vârf) — proba logoului din 25.3↑b o
  cerea și a picat prima formă. Calea se leagă de bucată prin pixelul primului punct SAU vecinii (vârful stă pe margine).
  Pătratul plin (lung = lat) e acum punct (pe culori, fără piesă). Pe praf necurățat: 7 198 de căi → 4 + 7 194 de puncte.
  Otrăvurile 12 / 12 (D09, D10, D11 au cerut probe noi). Totalul 708,7 / 800 pe arborele unit (felia +0,6). UNITĂ în
  `main` pe 17.11 (`dd21a8a`, sesiunea principală; CLAUDE.md `021dcc6`).
- **25.3↑e PROPUS** (17.11, „dacă vrei, pregătește propunerea, fără cod”, sesiunea principală; ramura adusă la
  `origin/main` `021dcc6`; `408f2c0`, împins): ADR 0228, lista „Rezultatul culorii” în fiecare pastilă (Ca Rezultatul /
  Contururi / Linii mediane); reducerea culorilor o dată; pragul părților late doar din culorile pe linii; legarea și peste
  culorile pe contururi; câte o piesă pe culoare. Prototipul `.tmp/proto-0228.ts` (doar nucleele de azi: amestecul dă
  exact desenul; pe 12 Mpx ~3 s cu reducerea o dată, ~4,8 s separat); datele schiței `.tmp/schita-0228-date.ts` (desenul
  din schița 0227), pagina din `.tmp/schita-0228-pagina.py`, privită local cu `.tmp/vede-0228.mjs` (Edge, fără rețea).
  Schița: <https://claude.ai/artifact/DatxQZJuRxdiL32WAxVoh6> (formularul scrie `raspunsuri/owner`: citește-l cu
  ArtifactData la „gata”). Întrebările: 1a „Ca Rezultatul” implicit, 2a lista în pastilă. Codul doar după răspunsuri.
- **25.3↑e GATA** (17.11, „Da, 1a–2a” de la owner, direct în sesiune; felia `c4b2abc8`, probele `fd58810d`): `OptiuniCulori.peLinii`
  (contururile doar ale culorilor rămase pe contururi, curbele doar pe granițele lor; fără niciuna, doar etichetele);
  `traseazaCuloriMediane(img, oc, om, cu)` cheamă nucleul O DATĂ cu `peLinii` (`cu.culori` = seam pentru spion), liniile
  doar ale culorilor alese, piesele sortate după paletă, numărătorile tuturor; calculul: `culori.rezultate` → `peLinii`
  de 16 (CULORI_MAXIM), „ca” = Rezultatul de sus (toate „ca” = exact răspunsul vechi); ușa: `laolalta` cu `peLinie` 0
  la contururi; fereastra: lista sub „Se trasează”, ștearsă la număr nou ȘI la legare. Pe 12 Mpx amestecul ~3 s.
  Otrăvurile 24 / 24 (E02 și F02 au cerut probe noi). Lecții: (1) un `<select>` în centrul pastilei a stricat tragerea
  ei din centru (e2e-ul legării): bifa pe rândul ei; (2) `expect.poll(pânza).not.toBe(înainte)` a trecut pe o stare de
  tranziție ȘI pe o scenă fără efect (galbenul singur pe linii NU e lat: pragul vine din el): compară stări liniștite,
  pe o scenă care are efectul („Semnal ≠ măsurătoare”).
- **25.6↑ GATA** (17–18.11, la „vreau să mergi înainte și testez la final”: ADR-urile se iau cu recomandările ca implicite, fără schiță, cu întrebările în ADR pentru încercarea de la final): `src/trasare/tiff.ts` + `ccitt.ts` (pure), în workerul trasării; fixturile scrise de WIC / GDI+ din PowerShell (`test/fixtures/trasare/tiff/genereaza.ps1`: codor ȘI decodor independent, pixelii de referință citiți de WIC) — oracolul cel mai bun pentru un format; WIC și GDI+ scriu „Rle” ca PackBits. Lecții: (1) Node, în modul fără tipuri, NU acceptă proprietățile din parametrii constructorului (`constructor(private readonly x)`); (2) o previzualizare care decodează cu browserul pierde ce nu știe browserul (TIFF): `poza` de la worker; (3) `.tif` cade sub `* text=auto`: `*.tif binary` în `.gitattributes`. Otrăvurile 41 / 41.
- **25.7↑ GATA** (18.11, tot la „mergi înainte”; ADR 0270): ușa PDF ține minte imaginile vizibile; `imagineaPaginiiPdf`
  scoate cea mai mare ca JPEG (fără Exif) sau ca TIFF de o pagină (`src/io/tiffScrie.ts`: CCITT împachetat, eșantioane
  brute), cu orientarea (1–8) și DPI-ul din așezare; workerul o întoarce (`orientare`) și dă `poza`; o pagină fără vectori
  se trasează singură, una cu vectori la „Trasează imaginea paginii”. Otrăvurile 39 / 39. Lecții: (1) o probă CCITT pe
  8 px poate ascunde o citire greșită: umplerea plus codul următor fac albul 29 (`00000010`), care umple oricum un rând
  alb: rândurile probei au negru; (2) un JPEG pus neschimbat în PDF (img2pdf) poate avea Exif cu orientare, pe care
  cititorul PDF o ignoră, dar `createImageBitmap` o aplică: Exif-ul iese; (3) după o unire, `dist/` e vechi (vezi
  [Uneltele worktree-urilor locale (de dinainte de cloud)](unelte-worktree.md)).
- **25.4↑c GATA** (18–21.11, la „Da, pornește”, tot sub „mergi înainte”; ADR 0271; oprită de pauza din 18.11, reluată pe
  21.11 la mesajul sesiunii principale): `src/trasare/rotire.ts` (unghiul din cerneală: scorul lui Postl pe rânduri ȘI
  coloane, ±10°, încrederea = vârful pe cel mai bun scor de la 1°, prag 1,25; rotirea pe pânza mărită, fondul = mediana
  marginii, cu „Ignoră ce atinge marginea” marginea prelungită, reducerea cu k), după foaie și înaintea zonei; bifa
  „Îndreaptă scanarea” în grupul „Îndreptarea”. Otrăvurile 44 / 44. Lecții: (1) un scor de proiecții pe pixeli favorizează
  0° din grila pixelilor (textul cu zgomot la 0,15° ieșea 0,004°): punctele mutate cu o fracțiune de pixel (R2); (2)
  încrederea Leptonica (max / min) nu desparte o schiță de un logo, vârful față de scorul de la 1° da; (3) fixturile
  rotite de GDI+ din PowerShell sunt oracolul independent al unghiului; (4) o otravă echivalentă (verificarea capătului
  baleiajului) a arătat cod redundant și chiar greșit lângă 10°: scos.
- **25.8↑ PROPUS** (21.11, la „Da, propunerea”; ADR 0272, `78a44def`, împins): imaginile pe foaie (straturile bitmap):
  imaginea sub desen, estompată, fixată / desfăcută, nici tăiată, nici exportată; octeții în IndexedDB după amprentă
  (documentul se scrie întreg, cu 20 de versiuni); punerea din fereastra trasării; lista în panoul foii; 25.8↑b =
  „Calibrează” (două puncte + distanța) și „Trasează…” din ea. Schița: <https://claude.ai/artifact/Ctc63ZdA6ipkLPA8uGCJyb>
  (formularul scrie `raspunsuri/owner` în baza paginii: citește-l cu ArtifactData la „gata”). Codul doar după răspunsuri.
- **25.8↑a PAUZĂ 22.11 seara** (ADR 0272 acceptat pe 21.11, „Da, 1a–3a”; vârful `2ab74269`, împins; canalul
  `2ab74269dc29`): `Foaie.imagini` (fără schemă nouă), baza `cncvs2-imagini` (`src/app/imaginiFoaie.ts`), importul (bifa,
  „Doar imaginea”, `octetiImaginiiFoii` codează în workerul trasării), pânza (`CerereImagini`, stratul în `lucrator.ts`),
  panoul (`ImaginiFoii.tsx`), mânerele (`ManereImagine.tsx`). Rămân: e2e-urile vecine (după un minut de liniște) și
  documentele (scripturi gata în `.tmp`). Lecții: (1) o imagine „sub desen” cere regula de alegere: pe linie, forma;
  înăuntru, imaginea (`instantaLa` cu `doarContur`), altfel chenarul trasat acoperă toată imaginea; (2) un gest e2e pe
  pânză verifică întâi cu `elementFromPoint` că punctul e pe pânză (rigla și barele plutesc deasupra); (3) `dispatchEvent`
  cu coordonate fracționare: browserul le taie, deci punctul se socotește din valorile rotunjite; (4) o scriere de
  fișiere întreruptă de pauză poate să nu se fi aplicat deloc: verifică arborele, nu memoria.
- **Why (25.5↑):** (1) pe poza cea mai obișnuită (telefonul înclinat doar înainte) laturile de sus și de jos rămân
  paralele: focala NU se poate afla, raportul iese cu ~4 % pe lângă; de aceea proporțiile au interval (colțurile ±1 px,
  focala 0,5–1,5 diagonale) și „nesigure”; nu promite proporții „Din poză” fără interval. (2) Un colț ieșit din cadru:
  latura de pe margine a învelitorii REDUSE se înlocuiește cu intersecția vecinelor, cu reperul cel mai depărtat de pe
  aceeași dreaptă (vârful de alături dă direcția din zgomot: 47 px). (3) Lista dialogului are `max-width: 9rem`:
  opțiunile lungi se taie; uită-te la fereastra reală.
- **Why (25.4↑):** (1) polaritatea propusă (închiderea/deschiderea, pixelii sub mijloc) mergea pe desenul sintetic doar
  fiindcă era DES; e2e-ul pe un desen rar (canvas) a întors-o: o regulă de polaritate se probează și pe desene rare, și pe
  dese. (2) Pragul automat (mijlocul mediilor) cade la acoperirea ~0,47 pe trăsături subțiri; prototipul cu acoperirea
  cuantizată la 1/16 o ascundea: probele numără doar greșelile clare (acoperirea < 0,4 sau ≥ 0,6). (3) Pe 12 Mpx,
  `Float32Array.from(f, fn)` și `for…of` pe un tablou tipizat costă sute de ms: bucle cu index.
- **Why:** pe 25.3, trei lucruri pe care prototipul nu le arăta au ieșit doar din corpus și din otrăvuri: Zhang–Suen singur
  șterge o trăsătură la 45° (îndreptarea lui Lü și Wang, B ≥ 3); garda de distanță a joncțiunii strica furcile înguste (scoasă);
  capetele drepte oblice ieșeau cu 0,7 px într-o parte (recentrare de-a curmezișul). Măsurătorile prototipului nu se copiază
  („Autoconsistența”).
- **Why (corectura):** după 25.3↑, logoul privit mărit a arătat defecte pe care toate probele le ratau, în trei runde
  ([„Ieșirea reală, privită mărită”](lectii.md#feedback-iesirea-reala-privita-marita)).
- **How to apply:** fiecare felie a liniei pornește doar la cuvântul owner-ului; e2e-ul worktree-ului pe 4183 (verifică
  `netstat -ano | grep :4183` înainte); porțile nucleului rămân corpusul (alb-negru, culori, linii mediane), proba pe zgomot,
  furcile 20–45°, capetele drepte, proba logoului; fiecare schimbare a nucleului: logoul randat mărit pe plăci
  (`.tmp/logo-tot.ts`) și comparația cu codul vechi pe configurații întâmplătoare (`.tmp/compara-calitate.ts`). Unirea în `main` e decizia owner-ului; la unire, fișierele
  comune sunt în nota de predare. Așteaptă poze reale ale owner-ului (umbra tare pe culori, ADR 0226 2a).

Legat: [sesiunea principală](principala.md), [Uneltele worktree-urilor locale (de dinainte de cloud)](unelte-worktree.md), „Shell: capcane”, „Mutații: disciplina”.
