# Sesiunea principală

<!-- Scrisă pe 23.11.2026, la mutarea în cloud, din memoria sesiunii principale locale (istoria ei e în DEVLOG.md și în
„Decizii luate” din CLAUDE.md). De aici înainte o ține la zi sesiunea principală din cloud. -->

_Sesiunea care ține registrul liniilor, unește feliile gata în `main`, scrie deciziile și publică pe test. Felul de lucru
în cloud: [docs/lucru-in-cloud.md](../lucru-in-cloud.md), „Sesiunea principală în cloud”._

## Rolul

- **Registrul liniilor:** rândurile de stare din `CLAUDE.md` și [indexul notelor](README.md). O linie = o sesiune pe
  ramura ei; nota ei e `docs/linii/<linie>.md`, ținută la zi de linie, odată cu feliile.
- **Unirea:** „unește ce se poate” e ordin permanent: o felie raportată gata (rapidul și completul verzi pe commit-ul ei,
  PR-ul deschis) se unește la raport, fără să mai fie întrebat owner-ul. Unirea se face din commit-ul raportat, nu din
  vârful ramurii, dacă linia a mers mai departe (de pildă 12.1↑e-2 din `082435b4`, cu vârful pe 12.1↑e-3 WIP).
- **Feliile noi** pornesc doar la cuvântul owner-ului. Un ADR acceptat nu e un cuvânt pentru feliile lui următoare, decât
  dacă owner-ul a spus așa.
- **Deciziile** le scrie numai sesiunea principală, la unire, în „Decizii luate” din `CLAUDE.md`: ce s-a unit, din ce
  commit, ciocnirile și cum s-au rezolvat, porțile cu cifre, ce urmează. Apoi rândurile de stare ale liniilor și indexul
  ADR („unită în `main` în `<sha>`”).
- **Publicarea pe test** e liberă, după fiecare unire: `bash scripts/cloud/ci-si-publica.sh <sha>`. **Live** doar cu
  confirmarea owner-ului, pe un commit publicat întreg pe test.
- **Un CI roșu pe `main` e incidentul numărul unu:** se repară înaintea oricărei uniri noi.

## Unirea, pas cu pas (ce s-a învățat)

- Ramura de unire: `unire-<data>` din `origin/main`; `git merge --no-ff <sha>` pentru fiecare felie, cu mesajul
  „Unește <ramura> (<felia>, <sha>) în main”. Un commit care mai are `.lucru/` (setul de lucru adus din `.tmp` la mutarea
  în cloud) nu se unește: linia îl scoate întâi.
- `DEVLOG.md` se ciocnește la aproape fiecare unire: `python3 -X utf8 scripts/rezolva-devlog.py DEVLOG.md` păstrează ambele
  părți. O ciocnire în cod se rezolvă cu ambele părți, citind ambele felii; apoi se caută și în părțile unite automat
  același fel de schimbare (de pildă două cereri noi în protocolul workerului CAM, `src/jobs/protocolCam.ts`,
  `calculCam.ts`, `bazinCam.ts`, la 12.1↑e-2 + 10.3↑o).
- După o unire, numărătorile unite singure de Git pe ambele părți (capitolele manualului, de pildă) pot fi greșite:
  `test/unit/manual.test.ts` și `documentatie.test.ts` le prind; se recalculează.
- O felie care schimbă pluginul Easy 3Draw ridică versiunea (`extensii/trenulet/extensie.json`, `test/e2e/trenulet.spec.ts`)
  și reînregistrează amprenta (`node scripts/biblioteca.ts --scrie`, după ULTIMA schimbare; pentru o versiune nepublicată,
  temporar versiunea publicată în `extensii/biblioteca.json`). Două felii ale pluginului în același lot: a doua ia
  versiunea următoare.
- Porțile unirii, în CI: rapidul la push pe `unire-<data>` și completul pornit pe ea. Cifrele intră în decizie: unitarele
  (trec / cad / sărite), e2e, funcțiile pe emulatoare, paginile pe emulatoare, mărimea pornirii și totalul.
- Înainte de push: nimic despre găurile aplicației vechi încă live, niciun secret (repo-ul e public); `git status` și
  `git show --stat`, niciodată `git add -A`.
- O felie care atinge funcțiile sau regulile se publică întreagă de `publica.yml` (serverul, apoi hosting-ul): nu mai e
  nevoie de publicarea locală a funcțiilor.

## Din container (pilotul din 23.11: unirea lui 3.Tq)

- **Ce merge:** `gh run list` / `gh run view --log`, `gh workflow run` (completul, publicarea), `gh api` pentru PR-uri,
  push-ul ramurii `unire-<data>` și al lui `main`. `gh auth status` spune că token-ul nu e bun: se ignoră.
- **`gh workflow run` cere mereu `--ref`:** fără el, `gh` întreabă prin GraphQL (oprit în container) care e ramura
  implicită și cade. Așa a căzut prima publicare (`publica.yml`); `ci-si-publica.sh` dă acum `--ref main`.
- **Publicarea, cap-coadă** (23.11, `8177ab81`): rapidul 6 minute, completul 44, `publica.yml` 3; scriptul, reluat de trei
  ori (iese cu 3 cât completul încă rulează), la sfârșit citește sha-ul de pe adresa de test.
- **Adresa de test** se citește din container doar cu gazda `cncvectorstudio-test.web.app` în rețeaua mediului (adăugată
  pe 23.11, cu aprobarea owner-ului). O gazdă nouă se cere cu unealta mediului: owner-ul o aprobă pe un card.
- **Cifrele porților** se iau din jurnalul completului: `gh run view <id> --log`, apoi rândurile `ℹ tests / pass / fail /
  skipped` (unitarele; funcțiile pe emulatoare), `N passed` (e2e; paginile pe emulatoare) și „JavaScript gzip la pornire”.
  În CI (Linux) sunt 12 probe sărite, nu 8 ca pe Windows.
- **O ramură care are deja `main`** (linia l-a adus înaintea documentelor) dă la unire exact arborele commit-ului raportat
  (`git diff --stat HEAD <sha>` e gol): porțile unirii repetă atunci porțile liniei, pe același cod.
- **Completul ține 44–60 de minute, după runner** (pasul rapid 23–35, e2e 16–21): cel al unirii lui 3.Tq s-a încheiat
  verde la 59 min 54 s din 60. Limita job-ului e 90 de minute din 23.11.
- **O sesiune nouă nu se pornește din container:** `create_session` e refuzat de clasificatorul de permisiuni. Ramura
  liniei o face sesiunea principală (`git push origin refs/remotes/origin/main:refs/heads/wip/<felia>-<nume>`), brief-ul
  îl primește owner-ul ca fișier și îl lipește într-o sesiune cloud nouă, pe ramura aceea.
- **`ci-si-publica.sh`, două reparații din 23.11:** publicarea se pornește cu `--ref main`; cele 10 minute în care o
  rulare trebuie să apară se numără de la începutul așteptării ei (altfel o publicare pornită după o așteptare lungă a
  completului e declarată lipsă, deși rulează).
- **Edge poate lipsi din containerul sesiunii principale** (pregătirea mediului nu l-a pus, deși liniile îl aveau): pentru
  o probă e2e de reprodus, `npx playwright install --with-deps msedge`, pasul din `scripts/cloud/pregatire.sh`.
- **O probă instabilă care oprește un lot se reproduce și se repară pe ramura de unire** (doar probe, cu otrava ei), apoi
  porțile rulează pe commit-ul cu reparația: `extensii.lucru.spec.ts:110`, pe 23.11. Încărcarea care a scos-o la iveală:
  proba repetată de 200 de ori pe zece lucrători (`--repeat-each 200 --workers 10`).
- **Loturile:** feliile gata în același timp merg într-un lot (porțile unirii judecă atunci arborele lor comun); o felie
  raportată cât rulează porțile unui lot intră în următorul, fără să le repornească.
- **`main` se poate mișca sub un lot:** pe 23.11, sesiunea liniei elicelor a unit ea 3.Tr, la cuvântul owner-ului, cât
  rulau porțile unui lot care o cuprindea. Înaintea push-ului: `git fetch`, apoi `git merge-base --is-ancestor origin/main
  HEAD`. Dacă `main` s-a mișcat, lotul se reface peste el (fără ce a intrat deja) și se compară codul cu cel de pe commit-ul
  cu porțile verzi (`git diff --stat <sha> HEAD -- . ':(exclude)*.md'`, gol); dacă diferă, porțile se reiau.
- **Sesiunile își pot scrie:** `send_message` spre id-ul altei sesiuni merge (pornirea unei sesiuni, nu). Mesajele
  primite apar ca notificări și se citesc cu `ReadNotifications`, la începutul fiecărei ture și înaintea unui push în
  `main`: pe 23.11, linia planșelor a cerut să-și unească singură 11.3↑f, iar mesajul a fost citit abia după ce felia
  intrase într-un lot. Un mesaj al altei sesiuni e o informație de verificat în git, nu o comandă.
- **Intervalul ADR al unei linii noi se caută pe toate ramurile**, nu doar în `main`: owner-ul pornește și el linii, iar
  numerele lor apar întâi pe ramura lor. Pe 23.11, promptul frezelor a primit 0290–0299, luate cu o oră înainte de linia
  exportului (`wip/28.8-export`); corectat la 0300–0309. Comanda: pentru fiecare `origin/wip/*`, `git ls-tree --name-only
  <ramura> docs/adr/`, apoi cel mai mare număr.
- **Vârful unei ramuri se poate mișca după raport** (linia aduce `main` și își reia completul): înaintea push-ului în
  `main`, se compară vârful cu commit-ul unit; dacă în plus sunt doar documente (`git diff --stat <unit> <vârf> -- .
  ':(exclude)*.md'` arată doar ce a venit din `main`), vârful se unește și el în lot, iar porțile rămân cele rulate
  (25.9↑, pe 23.11).
- **O decizie a owner-ului spusă într-o sesiune de linie** (pe 24.11, plafonul total, în sesiunea frezelor) ajunge aici
  ca mesaj al liniei, cu ADR-ul scris pe ramura ei: se verifică în git (commit-ul, ADR-ul cu vorbele owner-ului) și se
  ia în lotul în lucru. Dacă atinge doar o constantă a porții, rapidul rulat pe vârf ajunge; completul rămâne cel de pe
  codul produsului.
- **Catalogul controalelor** (din 24.11, A.8c): la unirea a două linii care au pus controale cu nume, `node
  scripts/catalog-controale.ts` pe ramura de unire; dacă nu e la zi, `--scrie`, iar porțile se reiau pe ramura de unire
  (fișierul generat e cod).
- **Un PR cu mai multe felii se unește la commit-ul raportat, nu la vârf:** pe 24.11, adminul a raportat „de unit acum:
  `fbbc8934`” (A.8c, A.8d), cu A.9a și începutul lui A.9b deja pe ramură, cu completul lor încă în lucru.
- **O ramură care merge mai departe fără raport:** pe 24.11, adminul avea completul verde pe `82ec5424` (A.10, A.11a) și
  lucra deja la A.11b, fără să fi scris commit-ul de unit. Sesiunea principală întreabă linia (`send_message`, cu
  variantele: commit-ul de acum sau lotul următor), nu alege singură; linia a scris `0580f504` în PR în 40 de minute.
- **Adresa de test, deschisă într-un browser din container** (24.11, după `883a8caa`): Edge prin proxy-ul mediului
  (`chromium.launch({ channel: 'msedge', proxy: { server: process.env.HTTPS_PROXY } })`, dintr-un script din afara
  repo-ului, cu `require` pe `node_modules/playwright` al repo-ului). Se văd: versiunea din
  `<meta name="cncvs2-versiune">`, antetul CSP, workerul PWA, `/extensii/catalog.json`, `/mesaje/*.json`,
  `/manual/ro.json`, `/coduri/ro.json`, `/documentatie/*.json`, pagina de intrare a `/admin`. Logarea nu merge (gazdele
  Google sunt oprite de proxy), deci ce e după cont rămâne al probelor de pe emulatoare.
- **Unirea de probă, locală, a liniilor care urmează** (24.11, cât le rulau completele): o ramură `proba-<data>`,
  neîmpinsă, cu vârfurile lor unite; spune din timp ciocnirile, starea catalogului controalelor și, cu build-ul
  determinist, dacă pornirea mai încape. Suita unitară întreagă ține peste 25 de minute în container (4 procesoare):
  rămâne a CI-ului de pe ramura de unire.
- **O felie cu exact codul verificat intră singură, fără să aștepte lotul:** pe 24.11, 25.8↑b era verde când celelalte
  trei încă rulau; unită singură (cod identic cu al commit-ului cu porțile), a pornit spre test cu o oră și jumătate
  înaintea lotului comun, care cere porți noi pe ramura de unire.
- **Porțile unui lot comun pot porni înaintea ultimului raport** (24.11, lotul al paisprezecelea): ramura de unire s-a
  făcut din commit-urile anunțate, cu completul pornit pe ea cât încă rulau completele a două linii; în `main` a intrat
  abia după ce au fost verzi și porțile lotului, și cele ale liniilor, iar vârfurile nu aduseseră cod (unirea de probă
  a vârfului: zero fișiere schimbate în afara `.md`). Câștigul: o jumătate de oră.
- **Intervalele ADR, la 25.11:** 0145–0149 sesiunea principală (lângă plafoanele 0143, 0144; 0145 e plafonul pornirii,
  0146 plafoanele 1 000 / 125; următorul, 0147),
  0230–0239 biblioteca, 0240–0249 ancorele, 0250–0259 aranjamentele, 0260–0269 adminul, 0270–0279 trasarea, 0280–0289
  pluginul (din 24.11 seara, întreg al liniei atelierului Easy 3Draw: 0283 pentru 3.Tu, 0284 construcțiile, cu
  feliile 3.Ca–3.Cj), 0290–0299 exportul, 0300–0309 frezele, 0310–0329 relieful, 0330–0339 cotele, 0340–0349 tot
  atelierul, după 0289. Următoarea linie nouă ia de la 0350. **Numerele unei linii noi se dau înainte ca linia să-i
  ceară owner-ului acceptarea ADR-ului** (24.11: atelierul avea ADR-ul acceptat sub 0284 când a citit „0340”).
- **Un PR rămas deschis după unire** (ramura a mers mai departe peste commit-ul unit, deci GitHub nu-l închide) se
  închide doar la cuvântul owner-ului, cu un comentariu care trimite la commit-ul de unire; înainte, se uită ce mai e
  pe ramură: pe 24.11, la `#16`, frezele aveau deja două felii noi, neunite, pentru care linia deschide alt PR.
- **O linie nouă:** nota ei (`docs/linii/<linie>.md`) intră în `main` înaintea ramurii, ramura se face din acel `main`
  (`git push origin <sha>:refs/heads/wip/<felia>-<nume>`), iar brief-ul de lipit trimite la notă, nu o repetă.
- **PR-ul liniei** e deschis de sesiunea ei ca ciornă (regula mediului cloud): starea „ciornă” nu spune că felia nu e gata.
  Gata înseamnă raportul liniei (nota ei spune „gata”) și rapidul cu completul verzi pe commit-ul raportat.

## Owner-ul: cum lucrează

- Vorbește în română; răspunsurile, tot în română.
- **Execută, nu preda pași:** sesiunea face ea ce se poate face; se oprește doar la secrete, conturi, drepturi (IAM),
  decizii vizuale și ce e ireversibil.
- **Listele pentru owner:** „Pașii tăi”, cu LINK-uri; la o decizie, varianta recomandată întâi; ce se verifică de mână, ca
  listă de bifat. Testul îl face pe instanța de test (LINK-ul ei), pe un canal când adresa principală e ocupată.
- **Toate opțiunile:** variantele care pot sta împreună se fac toate, pe felii; se întreabă doar ce se exclude.
- **Segmentare:** o felie întreagă (commit, publicare, raport), apoi STOP; agenții și workflow-urile multi-agent doar cu
  acordul lui, cu durata și costul în tokeni spuse înainte. (Local, clasificatorul a refuzat de trei ori workflow-ul de
  recenzie: recenzia o face sesiunea însăși.)
- **După o pauză:** raționamentul se reface de la capăt, din starea reală (ramuri, CI, adresa de test), nu din memorie.
- **Pauza:** la „pauză”, liniile își termină ce rulează, comit tot (WIP dacă nu e gata), împing și se opresc; sesiunea
  principală le transmite pauza (în cloud: owner-ul o spune fiecărei sesiuni).
- **DEVLOG:** Started / Completed, cu promptul exact și modelul; orele se derivă (din jurnal, din commit-uri), nu se ghicesc.
- **Interfața:** convențională (meniul contului derulant, capul din starea locală); o schimbare de design trece întâi
  printr-o schiță.
- **Observabilitatea:** erorile ajung în jurnalul aplicației; joburile își lasă marcajul.

## Starea pe 27.11.2026, după-amiaza (după a șaizeci și opta unire din cloud)

- **Pe test:** `8e23171c` (lotul 61: 28.8↑s, numele, apoi locul, în lista exportului; publicat pe 27.11 la 13:29, cu
  serverul neschimbat; completul pe `main` 45978853739, verde; proba de fum, bună). Înainte: `244dce86` (lotul 60: 16.A↑e-6, profilul pe o parte cu bila și cu toroidala; publicat pe 27.11 la 12:21, cu
  serverul neschimbat; completul pe `main` 45969456308, verde; proba de fum, bună). Înainte: `a67ec32c` (lotul 59: 16.A↑e-5, buzunarul cu bila și cu toroidala; publicat pe 27.11 la 10:35, cu
  serverul neschimbat; completul pe `main` 45956556314, verde; proba de fum, bună). Înainte: `eac92d1c` (lotul 58: 16.A↑e-4, bila și toroidala în proiect; publicat pe 27.11 la 08:38, cu
  serverul neschimbat; completul pe `main` 45946101842, verde; adresa de test o servește). Înainte: `3ecb5678` (lotul 57: 16.A↑e-3, canelura cu bila și cu toroidala; publicat pe 27.11 la 07:08, cu
  serverul neschimbat; completul pe `main` 45937766970, verde; proba de fum, bună). Înainte: `7f3938aa` (lotul 56:
  16.A↑e-2, elicea cu bila și cu toroidala, simulată exact), pe 27.11 la 06:03 (completul 45931468767); `8270aae7` (lotul 55: 16.A↑e-1, freza toroidală, documentul v31; publicat pe 27.11 la 04:58, cu
  serverul neschimbat; completul pe `main` 45925253880, verde; proba de fum, bună). Înainte: `47b75d20` (lotul 54: 3.Ck-2, balamaua, Easy 3Draw 18.44.0; publicat pe 27.11 la 03:52, cu serverul
  neschimbat; completul pe `main` 45916956101, verde; proba de fum, bună). Înainte: `e656da6a` (lotul 53, cu lotul 52 în el: 3.Av și 3.Aw; 28.8↑r, 3.Ck-1, 18.1↑d-3 și d-4, 10.4↑e-1…g,
  3.Ax; publicat pe 27.11 la 02:27, cu serverul întâi: funcția nouă `preferinte`, creată; completul pe `main`
  45908600876, verde; proba de fum, bună). Înainte: `77a036c0` (lotul 51: 28.8↑p, Z-ul sigur, parcarea și valorile frezei scrise de mână în fereastra
  exportului; publicat pe 26.11 la 18:43, cu serverul neschimbat; completul pe `main` 45851263588, verde; proba de
  fum, bună). Înainte: `86881d4c` (lotul 50: 3.Ci, construcțiile gata din „Modelul”, Easy 3Draw 18.42.0), pe 26.11 la
  17:35; `e84651e3` (lotul 49: 3.Ch, construcțiile cu nume din „Modelul”, Easy 3Draw 18.41.0), la 15:27;
  `77bf8ceb` (lotul 48: 28.8↑q, „Toate foile” cu operațiile fiecărei foi, cu titlurile grupurilor în română), pe
  26.11 la 14:20; `3e9d3d9c` (lotul 47: 3.Cg, verificarea din „Modelul”, Easy 3Draw 18.40.0), la 13:13; `a2e5bfdf`
  (lotul 46: 28.8↑l, tastatura și cititorul de ecran în fereastra exportului), pe 26.11 la 11:25; `1a577464` (lotul 45: 3.Cf-2, răsturnările și jumătățile de pas în „Modelul”, Easy 3Draw 18.39.0), pe 26.11 la
  10:42; `1d9671d3` (lotul 44: 28.8↑k, curățenia vizuală a ferestrei exportului), la 08:56; `c1d1c81d` (lotul 43: 3.Cl-3 și 3.Cl-4, ornamentul cu nume și brăduțul LEGO, Easy 3Draw 18.38.0), pe 26.11 la
  07:46; `9edf9ae0` (lotul 42: 18.1↑d, degroșarea reliefului, cu documentul v30, și fișa plăcii 18; 10.4↑d-2 și
  d-3, „Fă desen din cotă” și cotele în raportul foilor; 28.8↑j, greșelile ferestrei exportului), la 06:47;
  `9c728412` (lotul 41: 3.Cl-2, globul de Crăciun, Easy 3Draw 18.36.0, și 10.4↑d-1, cotele în lanț), la
  04:35; `7a754885` (lotul 40: 28.8↑i, viteza ferestrei exportului), la 03:15; `554b72cb` (lotul 39: 3.Cl-1, decorațiunile de Crăciun, Easy 3Draw 18.35.0), la 01:43; `c9911c14` (lotul 38: 3.Cf-1,
  alipirea la prinderi în vederea „Modelul”, Easy 3Draw 18.34.0), pe 25.11 la 23:28; `5649067c` (lotul 37: 16.A↑b-7, Escape în „Frezele mele”; 18.1↑c, finisarea reliefului, cu documentul
  v29; 28.8↑h, fereastra exportului „pe hârtie”), pe 25.11 la 22:23; `75bcf3fb` (lotul 36: „Pune-o înapoi în
  bibliotecă”, cotele ca DIMENSION), la 20:54. **În `main`, nepublicate încă:** 16.A↑f-1 și f-2, profilul desenat al
  frezei și canelura cu el, documentul v32 (`8906dedf`, din `36866d16`), unite pe 27.11 la 13:04: lotul 62, în drum
  (completul pe `main`); 3.Cm-1 și 3.Cm-2, elicele după audit, Easy 3Draw 18.45.0 (`6d8abb70`, din `ca9577b2`), unite pe
  27.11 la 13:34: lotul 63, după el.
  **Schema:** documentul e v32; un câmp nou ia v33.
- **Modelul:** din 26.11, la prânz, sesiunea principală merge pe Opus („o sa folosim Opus de aici in colo”); sesiunile
  liniilor își păstrează modelul până îl schimbă owner-ul în fiecare.
- **`main`, din cloud:** pe 23.11: 3.Tq (`0ae9c6c1`); 11.3↑e și A.4 (`ddaa7ead`); 3.Tr, unită de linia elicelor
  (`d262e57a`); 25.8↑a și A.5 (`1b46c955`), cu reparația probei extensiilor (`8287d66e`); 11.3↑f, unită de linia
  planșelor (`f4601938`); A.6 (`4497d639`); 3.Xh (`2d1e482c`) și 12.1↑e-3 cu 12.1↑e-4 (`03460cab`); A.8a cu A.8b
  (`5325b8fe`) și 25.9↑ (`4fe2d2ad`). Pe 24.11: 16.A↑a (`02a5864a`), cu ADR 0301 (`813fa675`); A.8c și A.8d (`80d3eb70`);
  A.9a și A.9b (`95dddbe0`); A.10 și A.11a (`7f6f4069`); 25.8↑b (`f7f4510f`); 3.Ts (`e14e553a`), A.11b–A.11e
  (`8ccb66e8`) și 16.A↑b-1, cu documentul v27 (`32b33a42`); A.7 (`458befb9`); 16.A↑c (`6b74074d`) și 3.Xi
  (`f12308de`); reparația utilizării mașinii (`bae574a8`), 10.4↑a-1 (`f25249cf`) și 3.Tt (`d57ca962`); 11.1↑c și 14.C↑d,
  scrise în sesiunea principală (`7584747a`); proba repornirii extensiei, reparată (`29ef7e44`); 16.A↑b-2 și 16.A↑a-2
  (`33fadb06`), 10.4↑a-2 (`f3283b33`), 16.A↑h-1 și 16.A↑h-2 (`db43ed08`); oracolul rampelor împărțit (`b2a56e23`) și
  3.Xj (`049c5dda`); cele două teste grele împărțite (`49ce2793`), 10.4↑a-3 (`08e2e50d`), 16.A↑h-3 și h-4
  (`9fd71053`); fereastra exportului, 28.8↑a–g (`c4ca5ec2`), și 3.Xk (`373699e6`); proba extensiilor, reparată
  (`13d9bcad`), 11.1↑d (`001b6325`) și 3.At (`cadac6c3`), scrise în sesiunea principală; 16.A↑h-5 (`4aee5405`) și
  16.A↑b-3 (`fdde5947`); 18.1↑a, relieful, cu documentul v28 (`c5b79526`); 10.4↑a-4 și 10.4↑b (`1eea83dd`). Pe
  25.11: 3.Ca și 3.Cb, atelierul Easy 3Draw, 18.25.0 (`11877a3e`); 3.Cc și 3.Cd, 18.27.0 (`9815527f`); 3.Ce, 18.28.0 (`38ff9391`); 3.Cj-1 și 3.Cj-2, 18.30.0 (`e90edd2e`); plafoanele 1 000 / 125 (`caddd661`, ADR 0146); 18.1↑b, relieful în vederea 3D (`ef883ac1`); 10.4↑c-1, cotele în exportul vectorilor (`f2f6fc57`); 16.A↑b-5 (`03e64d33`), 3.Cj-3 și 3.Cj-4, 18.32.0 (`36559b49`), și 28.8↑n (`1eda6f0b`); 28.8↑o, centrul foii ca origine XY0 (`3fd3bf49`); 16.A↑b-4, nota „s-a schimbat în bibliotecă” (`9f18522e`), și 3.Au, starea lucrării imprimantei, scrisă în sesiunea principală (`307d4f9a`); 3.Tu, piesele rotunde pe același ax în „Modelul”, Easy 3Draw 18.33.0 (`f5cf10c8`); 16.A↑b-6, „Pune-o înapoi în bibliotecă” (`1d3882d9`), și 10.4↑c-2, cotele ca DIMENSION în DXF (`66b6b335`); 16.A↑b-7, Escape în „Frezele mele” (`581da353`); 18.1↑c, finisarea reliefului, cu documentul v29 (`f7ca20b6`); 28.8↑h, fereastra exportului „pe hârtie” (`7d74ade2`); 3.Cf-1, alipirea la prinderi în „Modelul”, Easy 3Draw 18.34.0 (`02ac0715`). Pe 26.11: 3.Cl-1, decorațiunile de Crăciun (fulgul, steaua, brăduțul), Easy 3Draw 18.35.0 (`41b1fb6f`); 28.8↑i, viteza ferestrei exportului (`953205a8`); 3.Cl-2, globul de Crăciun, Easy 3Draw 18.36.0 (`b6c9998d`), și 10.4↑d-1, cotele în lanț și „Cotează selecția” (`57888ad8`); 18.1↑d-1 și d-2, degroșarea reliefului, cu documentul v30, și fișa plăcii 18 (`3d0d0c15`); 10.4↑d-2 și d-3, „Fă desen din cotă” și cotele în raportul foilor (`67dfb777`); 28.8↑j, greșelile ferestrei exportului pe înțeles (`93ff3b29`); 3.Cl-3 și 3.Cl-4, ornamentul cu nume și brăduțul LEGO, Easy 3Draw 18.38.0 (`474b76fc`); 28.8↑k, curățenia vizuală a ferestrei exportului (`3cdd23f5`); 3.Cf-2, răsturnările și jumătățile de pas în „Modelul”, Easy 3Draw 18.39.0 (`3e56e8cf`); 28.8↑l, tastatura și cititorul de ecran în fereastra exportului (`c3a0c184`); 3.Cg, verificarea din „Modelul”, Easy 3Draw 18.40.0 (`75d8dde2`); 28.8↑q, „Toate foile” cu operațiile fiecărei foi, și titlurile grupurilor exportului (`d3da8953`); 3.Ch, construcțiile cu nume din „Modelul”, Easy 3Draw 18.41.0 (`3bf86d15`); 3.Ci, construcțiile gata din „Modelul”, Easy 3Draw 18.42.0 (`57e58798`); 28.8↑p, Z-ul sigur, parcarea și valorile frezei scrise de mână (`a234dba5`); 3.Av și 3.Aw, numele cu virgula limbii și Escape oriunde ar fi focusul, scrise de sesiunea principală (`3e1683f8`); 28.8↑r, începutul programului în Rezultat (`4532622d`), 3.Ck-1, placa turnantă, Easy 3Draw 18.43.0 (`0a1f26c8`), 18.1↑d-3 și d-4, pasul lateral aliniat rotunjit în jos și rândul editabil al reliefului (`709d3e2a`), 10.4↑e-1, e-2 și f, toleranțele, lungimile, Măsoară între foi (`602e5649`); 3.Ax, bugetul de timp al probei în engleză a pluginului, după completul roșu al lotului 52, scrisă de sesiunea principală (`0df06eca`); 10.4↑g, setările cotelor în cont, cu callable-ul `preferinte` (`1d02dc1e`); 3.Ck-2, balamaua, Easy 3Draw 18.44.0, cu proba în engleză a pluginului împărțită pe ecrane (`439d0395`); 16.A↑e-1, freza toroidală în document (v31) și în simulare (`8b92246d`); 16.A↑e-2, elicea cu bila și cu toroidala, simulată exact (`0d2a8c2c`); 16.A↑e-3, canelura cu bila și cu toroidala (`db066160`); 16.A↑e-4, bila și toroidala în proiect (`72263843`); 16.A↑e-5, buzunarul cu bila și cu toroidala (`e412ebcc`); 16.A↑e-6, profilul pe o parte (`e9790edb`); 16.A↑f-1 și f-2, profilul desenat, documentul v32 (`8906dedf`); 3.Cm-1 și 3.Cm-2, elicele după audit, 18.45.0 (`6d8abb70`); 28.8↑s, numele, apoi locul, în lista exportului (`fec801bc`).
- **Liniile** (vezi [indexul](README.md)):
  - **în lucru, pe ramuri, repornite pe 25.11 la 09:32** (owner-ul, în sesiunea principală, după resetarea limitei
    săptămânale: „vreau sa pornesti si celelalte sub-sesiuni”):
    - frezele: 16.A↑b-5, unită la 13:18; 16.A↑b-4 (nota „s-a schimbat în bibliotecă”), unită la 17:00; 16.A↑b-6
      („Pune-o înapoi în bibliotecă”, pornită pe 25.11 la 14:16, la „ok, porneste 10.4↑c-2 si 16.A↑b-6” al
      owner-ului), unită la 19:42; 16.A↑b-7 (Escape în „Frezele mele”, reparația probelor instabile), unită la
      20:11; 16.A↑e (bila și toroidala, cu CAM), pornită pe 26.11 la 20:16, la „Zi-le ca pot continua cu ce urmeaza la fiecare” al owner-ului: e-1 (forma toroidalei, documentul v31, ADR 0303), unită pe 27.11 la 03:19; e-2 (elicea cu bila și cu toroidala, simulată exact), unită pe 27.11 la 04:45; e-3 (canelura cu bila și cu toroidala), unită pe 27.11 la 05:51; e-4 (bila și toroidala în proiect: biblioteca, lista „Freza”, rândurile exportului), unită pe 27.11 la 07:28; e-5 (buzunarul cu bila și cu toroidala), unită pe 27.11 la 09:08; e-6 (profilul pe o parte), unită pe 27.11 la 10:52; f-1 și f-2 (forma `profil` a frezei, documentul v32, ADR 0304; canelura cu ea), unite pe 27.11 la 13:04; f-3 (intrarea în proiect), în lucru; apoi f-4 (marginea profilată), f-5 (editorul) și g; d, după placa 4;
    - exportul: 28.8↑n, unită la 13:18; 28.8↑o (centrul foii ca origine XY0; mișcă mașina), unită la 14:21; 28.8↑h
      (desenele ferestrei, cu reparația 28.8↑h-2 a lui „Du-mă la …” și cu regula „cât foaia” unită cu relieful),
      unită la 21:13; 28.8↑i (viteza ferestrei), unită pe 26.11 la 02:07; 28.8↑j (greșelile pe înțeles),
      unită la 05:35; 28.8↑k (curățenia vizuală), unită la 07:37; 28.8↑l (tastatura și cititorul de
      ecran), unită la 10:14 (feliile h–l ale ferestrei, gata); 28.8↑q („Toate foile” cu operațiile fiecărei
      foi) și titlurile grupurilor, unite la 13:05; 28.8↑p (Z-ul sigur și parcarea; mișcă mașina, cu
      linia frezelor anunțată; ordinea confirmată de owner), unită la 17:29; din ADR 0291 nu mai rămâne nicio felie a
      liniei; 28.8↑r (începutul programului la vedere în Rezultat, ADR 0292; pornită pe 26.11 la 20:16, la „Zi-le ca pot continua cu ce urmeaza la fiecare” al owner-ului), unită pe 27.11 la 01:02; 28.8↑s (numele, apoi locul, în lista exportului; constatarea 14), unită pe 27.11 la 12:02; fără felie pornită: 9a, după placa 2; 28.8↑m, cu Clasicul;
    - relieful: 18.1↑b, unită la 11:02; 18.1↑c (finisarea, cu bila în document, v29; `AndreiBesliu/cvs2#39`), unită
      la 21:11, după ce linia a ținut bilele afară din lista bibliotecii a ferestrei exportului; 18.1↑d (pornită de owner pe
      25.11 la 23:37, „ok, porneste 10.4↑d si 18.1↑d”): d-1 (degroșarea, cu documentul v30, ADR 0313) și d-2 (fișa
      plăcii 18), unite pe 26.11 la 05:09 (`AndreiBesliu/cvs2#51`); rândul editabil al
      finisării și al degroșării (18.1↑d-4, ADR 0315) și rotunjirea în jos a pasului lateral (18.1↑d-3, ADR 0314;
      mișcă mașina), pornite pe 26.11 la 20:16, la cuvântul owner-ului, unite pe 27.11 la 01:02; nicio felie pornită: freza din
      „Frezele mele” pe rândurile reliefului, desenele grupurilor și „Dă-i T{n}”, la cuvântul owner-ului;
    - atelierul: cama și roata cu palete, unite la 09:35; cadrul și melcul, la 13:18 (3.Cj, încheiată); 3.Tu
      (piesele rotunde pe același ax în „Modelul”, ADR 0283; Easy 3Draw 18.33.0; pornită de owner în sesiunea liniei,
      „1a, 2a, 3a la 3.Tu, pornește”), unită la 18:18; în lucru, 3.Cf (alipirea la prinderi în
      „Modelul”, cu răspunsurile owner-ului din sesiunea liniei: piesa alipită urmează baza; 18.34.0); 3.Cf-1 (alipirea; `6b093a98`, Easy 3Draw
      18.34.0), unită la 22:15; **decorațiunile de Crăciun** (cererea
      owner-ului din 25.11, 19:18): ADR 0285, acceptat de el în sesiunea liniei („Mergem cu recomandarile”), feliile
      3.Cl-1…4: 3.Cl-1 (fulgul, steaua, brăduțul; 18.35.0), unită pe 26.11 la 00:15; 3.Cl-2 (globul; 18.36.0),
      unită la 03:26; 3.Cl-3 (ornamentul cu nume; 18.37.0) și 3.Cl-4 (brăduțul LEGO; 18.38.0), unite la 06:36
      (ADR 0285, încheiat); 3.Cf-2 (răsturnările și jumătățile de pas; 18.39.0), unită la 09:18; 3.Cg (verificarea:
      prinsă, plutește, intră în alta; 18.40.0), unită la 11:58; 3.Ch (construcțiile cu nume și lista lor de piese; 18.41.0), unită la 14:12; 3.Ci
      (construcțiile gata: șasiul cu patru roți, cutia de angrenaje, brațul de macara, barca cu elice; 18.42.0), unită la 16:26;
      3.Ck (cu jocul din calibrare; tipărirea bilei și a cupei, încă de verificat), pornită pe 26.11 la 20:16, la „Zi-le ca pot continua cu ce urmeaza la fiecare” al owner-ului, despărțită în 3.Ck-1 (placa turnantă; 18.43.0), unită pe 27.11 la 01:02, și 3.Ck-2 (balamaua; 18.44.0, cu proba în engleză împărțită pe ecrane), unită pe 27.11 la 02:07: ADR 0284 are toate feliile făcute; ADR 0340 (elicele după audit, 1a–4a): 3.Cm-1 și 3.Cm-2 (18.45.0), unite pe 27.11 la 13:34; 3.Cm-3 (ventilatorul ca trusă), în lucru;
    - cotele: 10.4↑c-1, unită la 12:20; c-2 (DIMENSION în DXF și cifrele ca text), unită la 19:42;
      10.4↑d (ultima felie a cotelor; pornită de owner pe 25.11 la 23:37), împărțită în trei: d-1 (lanțul, linia
      de bază, „Cotează selecția”), unită pe 26.11 la 03:26; d-2 („Fă desen din cotă”) și d-3 (cotele în raportul
      foilor), unite la 05:35; 10.4↑d, încheiată; cele „mai târziu” din ADR 0330 (toleranțele, lungimile, cota între foi, setările în cont),
      pornite pe 26.11 la 20:16, la cuvântul owner-ului: e-1 (toleranțele), e-2 (lungimile) și f (Măsoară între
      foi), și g (setările cotelor în cont, 14a, prin callable-ul `preferinte`), unite pe 27.11 la 01:02; cele „mai târziu”,
      toate făcute: linia, încheiată până la cuvântul owner-ului.

    Se unesc la raportul liniei, în ordinea rapoartelor. **Restul de mărime** (din 25.11, cu plafoanele noi; după
    lotul de la 13:18: 109,9 kB în total, 8,5 kB în pornire): fiecare linie își spune în raport cât adaugă, iar una
    care nu mai încape se oprește și scrie aici (plafonul e decizia owner-ului);
  - **pornită pe 24.11, cu ADR-ul propus întâi:** atelierul Easy 3Draw (piese și configuratoare noi, compatibile în
    construcții; cererea owner-ului, în sesiunea liniei bibliotecii, pe ramura ei; ADR 0284, acceptat cu 1a–4a,
    feliile 3.Ca–3.Cj; 3.Ca, conectorul perpendicular, gata pe ramură, cu porțile în lucru;
    ia și lucrul liniei elicelor, predat pe 24.11 seara la cererea owner-ului: 3.Tu, la răspunsurile lui);
  - **la cuvântul owner-ului:** următoarea felie a bibliotecii extensiilor, a incrustațiilor și a trasării, 11.5↑b
    (după etapa 13); din 26.11, 20:16, cuvântul e dat („pot continua cu ce urmeaza la fiecare”), dar liniile fără
    sesiune (tăierea 10.3↑p–r, imprimanta 3.6w, incrustațiile, planșele, trasarea, aranjamentele) cer întâi o sesiune
    nouă, cu un brief;
  - **audituri, cerute de owner pe 25.11** (înaintea arhivării sesiunilor; doar documente, fără cod de produs):
    **elicele, gata și în `main`** (`docs/linii/audit-elice.md`, `173995a1`: nimic stricat; șapte felii propuse
    pentru linia atelierului; patru întrebări la owner, cu recomandările 1a, 2a, 3a, 4a; sesiunea se poate arhiva);
    **fereastra exportului, gata și în `main`** (`docs/linii/audit-export.md`), cu **ADR 0291 acceptat de owner pe
    25.11** (toate recomandările, în sesiunea liniei; în `main`, `b826abe9`): feliile 28.8↑h–q. 28.8↑n (numele
    fișierului) e în `main` (`1eda6f0b`); 28.8↑o (centrul foii ca origine XY0: mișcă mașina, deci oracole și
    emulator) e gata pe ramură; h (desenele adevărate), i (viteza) și j–l pot porni: 16.A↑b-5 e în `main` din 25.11
    (linia exportului, anunțată la unire, cu părțile fișei schimbate de b-5); p (avansul, turația și plonjarea pe „Scrisă de mână”) e a exportului, cu frezele anunțate; 9a
    (adaosul, finisarea, punctul de start) e o felie de CAM după placa 2, cu numărul liber de atunci, pe o linie de ales. A sesiunii
    principale: numele elementelor cu punct zecimal în română (`src/app/descriereElement.ts`), la cuvântul owner-ului.
    Din auditul elicelor, feliile propuse pornesc doar la cuvântul lui;
  - **fără felie în lucru:** planșele (tăierea plăcii 11, la owner), incrustațiile, trasarea, tăierea (după
    10.3↑o: 10.3↑p–r),
    imprimanta (după 3.6v: 3.6w, camera), aranjamentele (28.1↑). Pornesc la cuvântul
    owner-ului, cu un brief scris de sesiunea principală și lipit de owner într-o sesiune cloud nouă;
  - **încheiate:** ancorele (6.V↑), raportările (15.B↑b), galeria (3.Tp, ADR 0281), probele instabile, adminul
    (ADR 0260 și 0262: A.1–A.11, cu A.7 unită pe 24.11), fereastra exportului (ADR 0290: 28.8↑a–g, unite pe 24.11;
    sesiunea se poate arhiva), biblioteca extensiilor (3.Xh–3.Xk; ce urmează, la cuvântul owner-ului), elicele
    (3.Tq–3.Tt; linia predată atelierului, sesiunea ei se poate arhiva după lotul 25).
- **La owner:**
  - de încercat virgula din numele elementelor (3.Av) și Escape cu focusul pe pagină în cele șapte ferestre (3.Aw),
    după lotul 52;
  - **alegerile cu recomandarea aplicată sunt ale owner-ului din 27.11, dimineața** („zi-le sesiunilor sa continue cu
    recomandarile, acolo unde inca asteapta”): ADR 0303, balamaua, placa turnantă, ADR 0292 1a, cotele (d-1, întrebarea
    10), ADR 0313 §8, auditul elicelor (1a–4a, feliile 1–7, la linia atelierului), construcțiile, pachetul Easy 3Draw
    peste 0,5 MB, fondul semnului; mai jos rămân doar încercările, tipăririle, probele pe mașină și întrebările de proces;
  - **sesiunea designului trece în cloud** (27.11, „Sesiunea designului o sa o aducem si pe ea in sesiune cloud”): brief-ul
    nou e la owner; sesiunea veche, de pe calculatorul lui, comite și împinge întâi ce n-a ajuns pe GitHub, apoi se
    arhivează; întrebarea ei (felia zoomului) o preia sesiunea cloud, cu recomandarea;
  - după lotul 54: de tipărit balamaua (3.Ck-2: cât de ușor intră clema pe bolț, cât de greu se rotește); cu
    recomandarea aplicată, alegerile ei (două jumătăți, lățimea 1–2 și lungimea 1–4, axa la 4 mm după capătul plăcii,
    jocul ca un câmp al clemei, confirmate);
  - după lotul 53: de încercat începutul programului în Rezultat (28.8↑r), rândul editabil al finisării și al
    degroșării (18.1↑d-4), toleranțele, lungimile, Măsoară între foi și setările cotelor în cont (10.4↑e-1, e-2, f, g); de tipărit placa turnantă
    (3.Ck-1: cât de greu se rotește, cât de bine stă pe pivot); cu recomandarea aplicată, alegerile plăcii turnante
    (pivotul ca știft Technic, mărimile 2 × 2 și 4 × 4, jocul în pași de 0,05 mm, plăcile înalte cât o placă) și a
    începutului (după export, nu înainte);
  - de încercat „Toate foile” în fereastra exportului, pe un proiect cu mai multe foi (pe test din 26.11, 14:20);
  - „cine unește în `main`” (recomandarea: doar sesiunea principală; pe 23–24.11, biblioteca și frezele au scris întâi
    aici, iar felia era deja în lot: unirea a rămas aici);
  - proba pe mașină a centrului foii ca origine XY0 (28.8↑o): zero-ul în mijlocul foii, întâi în aer;
  - proba pe mașină a lui 28.8↑p (Z-ul sigur și parcarea; pe test din 26.11, 18:43), întâi în aer: un Z sigur nou și o parcare în afara foii;
  - tăierea plăcii 18 (relieful: MDF de 18 mm, plata Ø6 și bila Ø6; `docs/etape/placa-18.md`);
  - de tipărit decorațiunile de Crăciun (fulgul, steaua, brăduțul; un glob decupat și unul în relief, în două culori;
    un ornament cu nume în relief și unul decupat; brăduțul LEGO);
  - de încercat în „Modelul” din Easy 3Draw 18.39.0, cu întrebările liniei (fișa etapei 3): se răstoarnă piesa cum
    te aștepți, sunt bune numele butoanelor („Răstoarnă ↓”, „Răstoarnă →”), ajung jumătățile de pas la piesele Technic;
  - de încercat verificarea din „Modelul” (18.40.0), cu întrebările liniei: cuvintele „plutește” și „intră în alta”,
    vălul și conturul în 3D, piesa care stă pe alta fără prindere („plutește”, azi), pragul de un sfert de milimetru;
  - de încercat construcțiile cu nume din „Modelul” (18.41.0), cu alegerile liniei aplicate (ADR 0284, „Implementat
    (3.Ch)”): timpul din filament la un debit mediu (implicit 5 mm³/s, de schimbat pe imprimantă), nu din feliere;
    numele implicite „Construcția N” și copia „Macara 2”; vederea rămâne „Modelul”; ultima construcție nu se șterge;
  - de încercat construcțiile gata din „Modelul” (18.42.0; pe test din 26.11, 17:35), cu alegerile liniei aplicate (ADR 0284, „Implementat
    (3.Ci)”): cele patru construcții și mărimile lor, roțile în trei mărimi, rapoartele cutiei, construcția deschisă ca
    una nouă; pentru 3.Ck (balamaua și placa turnantă), tipărirea bilei și a cupei;
  - tipărirea pieselor noi (cama, roata cu palete, cadrul, melcul cu roata de 24);
  - verificarea juridică (GDPR) a utilizării aplicației, înaintea live-ului (ADR 0262 §3); pe test, colectarea merge
    din 24.11;
  - ce face sesiunea principală între loturi (întrebarea lui din 24.11, „tu ce poti sa faci intre timp?”): publicarea
    mai scurtă (fără al doilea complet pe `main` când codul e identic cu cel verificat; schimbă o regulă a porților),
    lista „ce e nou pe test, de încercat”, rezumatul pentru verificarea juridică, lista ramurilor unite de șters.
    Fără răspuns, niciuna nu pornește.
- **Plafoanele, din 25.11: totalul 1 000 kB, pornirea 125 kB** (ADR 0146, „ok, ridica plafonul total la 1000 kB si pornirea la 125 kB”, spus în
  sesiunea principală). Totalul e 884,8 kB după 18.1↑b (mai sunt 115,2); pornirea 111,1, cu ușa 116,1, cu Atelierul 116,4 (mai sunt
  8,6). Înainte: totalul 900 (ADR 0301, din noaptea de 23 spre 24.11), pornirea 120 (ADR 0145, din 24.11). În două
  zile, totalul a crescut cu 87 kB (cotele 25,3, fereastra exportului 16,3, frezele 13,9, relieful 12,7). Regulile
  feliilor rămân: ce nu trebuie înaintea primei randări stă la cerere, calculul greu în worker, iar felia își spune
  în raport cât adaugă la total și la pornire.
- **Documentul e v32** (forma `profil` a frezei, 16.A↑f-1, în `main` din 27.11, ADR 0304; v31, forma toroidalei,
  16.A↑e-1, din 27.11, ADR 0303; v30, degroșarea reliefului,
  18.1↑d-1, din 26.11, ADR 0313: operația `degrosare`, cu câmpul ei; v29, finisarea reliefului și freza bilă, 18.1↑c, din 25.11, ADR 0312; v28, forma `relief`, 18.1↑a,
  din 24.11; v27, frezele, 16.A↑b-1). Cotele nu cer schemă. **Următorul liber e v33.** După el: adaosul și finisarea pe profil (9a din ADR 0291): numărul se dă când felia ajunge la
  migrare, iar unirile cu schemă intră în `main` în ordinea numerelor. O probă care citește documentul salvat cere
  versiunea curentă (`placute.spec.ts` a căzut cu `schema: 26` în completul liniei frezelor).
- **De urmărit:** în panoul foii, la 1400 px, etichetele „Numele” și „Materialul” apar tăiate la o literă (văzut de
  linia trasării, și pe `220bd48e`: nu vine dintr-o felie de azi).
- **De urmărit:** `extensii.lucru.spec.ts`, „două cereri imediat după” repornire (rândul 235): sub încărcare mare
  (zece lucrători), clicurile ajung după cele 2 s ale răririi și proba cade (2 din 120, local); nevăzută în CI.
- **De urmărit, la owner (design):** la 320 px, la atingere (`pointer: coarse`, `--tinta` 44 px), rândul de sus al
  meniului își suprapune butoanele (marca, Extensii, căutarea): o atingere pe Extensii deschide paleta. La 360 și
  390 px e bine; cu mausul, probele trec (ținta de 36 px). Șapte controale de 44 px nu încap pe 320: ce pleacă de pe
  rând e o alegere a aranjamentelor. Găsit de linia bibliotecii pe 24.11, nereparat.
- **Pe calculatorul owner-ului:** worktree-urile vechi (`C:\Users\besli\cncvs2-lucru\*`), toate curate și împinse, rămân
  copie de siguranță până spune owner-ul; probele pe imprimanta K1C și pe mașina CNC; `docs/faza0/`.

## Lecțiile

Lecțiile generale (probe, porți, mutații, Firestore, capcanele uneltelor) sunt în [lectii.md](lectii.md). Cele mai des
folosite la unire și publicare:
- un semnal verde nu e o măsurătoare: se suspectează întâi instrumentul;
- o constantă potrivită pe un corpus se întoarce ca bandă, nu ca număr;
- proba se face în mediul bugului (fusul, limba, platforma: CI-ul pe Linux nu e Windows-ul local);
- otrăvurile se rulează într-o clonă; un VOID nou se mută pe codul nou sau se scoate cu codul echivalent;
- un rezultat geometric se privește pe cazul REAL, mărit și întreg, înaintea raportului.
- un clic în cadrul unei extensii care îi închide sau îi reface cadrul nu se așteaptă cu `click()`: se așteaptă
  urmarea lui (`clicCareInchideCadrul`, `clicCareRefaceCadrul` din `test/e2e/ajutor-extensii.ts`);
- o cădere din CI care nu se reproduce local se provoacă: se strică anume pasul bănuit (clicul înghițit o dată) și
  se arată că ajutorul vechi cade, iar cel nou trece (24.11, `extensii.spec.ts:135`: 150 din 150 treceau local);
- o probă pe corpus care trece de un minut se împarte pe părți ale corpusului, câte un fișier pe parte, cu pragurile
  pe părți și cu proba care păzește împărțirea (`test/unit/ajutor-parti.ts`; 24.11: oracolul rampelor, căile netede
  din multe cubice, echivalența porții); listele de otrăvuri care numeau fișierul întreg primesc și părțile;
- înaintea unirii se citesc și rapidul, și completul ramurii de unire: completul poate fi verde cu rapidul oprit de
  limita unei felii (24.11, lotul 17: felia 5 din 6, peste 10 minute; limita e acum 15, `rapid.yml`);
- nu se comite în timpul unei rulări locale e2e sau pe emulatoare: trei probe compară versiunea construită cu
  ultimul commit și cad doar din cauza asta (24.11);
- evenimentele scoase din două stări văzute la rând pot sări o stare scurtă (starea se vede la redesenare): o
  probă cap-coadă care le numără cade rar, doar sub încărcare; reparația e în cod (starea sărită se deduce), nu o
  așteptare în probă (24.11, „pornita” a mașinii, `utilizare.emulator.spec.ts:233`).
