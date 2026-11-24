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
- **Intervalele ADR, la 24.11:** 0145–0149 sesiunea principală (lângă plafoanele 0143, 0144; 0145 e plafonul pornirii),
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

## Starea pe 24.11.2026, noaptea (după a douăzeci și cincea unire din cloud)

- **Pe test:** `62569bb2` (tot până la lotul 22: frezele din Tăierea și setul de pornire, „Frezele mele” ca listă, cu
  grupuri, unealta Cote, căutarea și rafturile din biblioteca extensiilor, oracolul rampelor împărțit; publicat pe
  24.11 la 20:32, fără server; proba de fum, bună). Publicarea loturilor 19–21 singure căzuse la o probă instabilă a
  extensiilor (`extensii.spec.ts:135`), reparată în lotul 25. În drum: loturile 23–27, într-o singură publicare,
  pornită după unirea reliefului (lotul 27).
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
  16.A↑b-3 (`fdde5947`); 18.1↑a, relieful, cu documentul v28 (`c5b79526`).
- **Liniile** (vezi [indexul](README.md)):
  - **în lucru, pe ramuri:** frezele (16.A↑b-5: fundul plat, frezele de rest, dopul și banda; apoi b-4), cotele
    (10.4↑a-4, panoul cotei, și 10.4↑b: raza, diametrul, unghiul, inch în fracții; un singur raport, după `main`
    cu relieful), relieful (18.1↑b), atelierul (3.Ca, cu porțile în lucru); se unesc la raportul liniei;
  - **la owner:** 3.Tu (unde stă axul pieselor rotunde în vederea „Modelul” din Easy 3Draw; trei întrebări, cu
    recomandările 1a, 2a, 3a, în `docs/linii/elice.md`; ADR 0283): din 24.11 seara, a liniei atelierului;
  - **pornită pe 24.11, cu ADR-ul propus întâi:** atelierul Easy 3Draw (piese și configuratoare noi, compatibile în
    construcții; cererea owner-ului, în sesiunea liniei bibliotecii, pe ramura ei; ADR 0284, acceptat cu 1a–4a,
    feliile 3.Ca–3.Cj; 3.Ca, conectorul perpendicular, gata pe ramură, cu porțile în lucru;
    ia și lucrul liniei elicelor, predat pe 24.11 seara la cererea owner-ului: 3.Tu, la răspunsurile lui);
  - **la cuvântul owner-ului:** următoarea felie a bibliotecii extensiilor, a incrustațiilor și a trasării, 11.5↑b
    (după etapa 13);
  - **fără felie în lucru:** planșele (tăierea plăcii 11, la owner), incrustațiile, trasarea, tăierea (după
    10.3↑o: 10.3↑p–r),
    imprimanta (după 3.6v: 3.6w, camera), aranjamentele (28.1↑). Pornesc la cuvântul
    owner-ului, cu un brief scris de sesiunea principală și lipit de owner într-o sesiune cloud nouă;
  - **încheiate:** ancorele (6.V↑), raportările (15.B↑b), galeria (3.Tp, ADR 0281), probele instabile, adminul
    (ADR 0260 și 0262: A.1–A.11, cu A.7 unită pe 24.11), fereastra exportului (ADR 0290: 28.8↑a–g, unite pe 24.11;
    sesiunea se poate arhiva), biblioteca extensiilor (3.Xh–3.Xk; ce urmează, la cuvântul owner-ului), elicele
    (3.Tq–3.Tt; linia predată atelierului, sesiunea ei se poate arhiva după lotul 25).
- **La owner:**
  - „cine unește în `main`” (recomandarea: doar sesiunea principală; pe 23–24.11, biblioteca și frezele au scris întâi
    aici, iar felia era deja în lot: unirea a rămas aici);
  - arhivarea sesiunii exportului (se poate, din 24.11) și ștergerea ramurii ei de pe `origin`;
  - cele trei întrebări ale lui 3.Tu (axul pieselor rotunde în „Modelul”), acum la linia atelierului;
  - plafonul total: 873,5 / 900 kB după relief, deci rămân 26,5 kB (cotele a-4 și b cer ~4,2); pornirea cu ușa și
    cu Atelierul, 116,2 / 120 (rămân 3,8 kB);
  - verificarea juridică (GDPR) a utilizării aplicației, înaintea live-ului (ADR 0262 §3); pe test, colectarea merge
    din 24.11;
  - fondul semnului lui Easy 3Draw (gri-albăstrui, nu crem) și rândul de „ce e nou” al lui 18.20.0;
  - ce face sesiunea principală între loturi (întrebarea lui din 24.11, „tu ce poti sa faci intre timp?”): publicarea
    mai scurtă (fără al doilea complet pe `main` când codul e identic cu cel verificat; schimbă o regulă a porților),
    lista „ce e nou pe test, de încercat”, rezumatul pentru verificarea juridică, lista ramurilor unite de șters.
    Fără răspuns, niciuna nu pornește.
- **Plafoanele:** totalul e 873,5 / 900 kB după lotul 27 (ADR 0301, decizia owner-ului din noaptea de 23 spre 24.11;
  fereastra exportului a adus 16,3 kB, relieful 13,4). **Pornirea e 120 kB din 24.11** (ADR 0145, „ok, ridica plafonul pornirii la
  120 kB”, spus în sesiunea principală): 110,9, cu ușa 115,9, cu Atelierul 116,2, deci mai sunt 3,8 kB. Regula feliilor rămâne: ce nu trebuie înaintea primei randări stă la
  cerere, iar felia își spune în raport cât adaugă în pornire.
- **Documentul e v28** (relieful: forma `relief`, 18.1↑a, în `main` din 24.11; v27, frezele, 16.A↑b-1). Cotele nu cer
  schemă; următorul liber e v29 (operațiile pe relief cu freza bilă; toroidala și profilul desenat ale frezelor): numărul se
  dă când felia ajunge la migrare, iar unirile cu schemă intră în `main` în ordinea numerelor. O probă care citește documentul salvat cere versiunea
  curentă (`placute.spec.ts` a căzut cu `schema: 26` în completul liniei frezelor).
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
