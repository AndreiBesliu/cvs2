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

## Starea pe 23.11.2026, seara (după a patra unire din cloud)

- **`main`, pe 23.11, din cloud:** 3.Tq (elicele, `0ae9c6c1`; pe test cu `8177ab81`); 11.3↑e (planșele, `d3ffcbf3`) și A.4
  (adminul, `ddaa7ead`; pe test cu `c010e3d1`); reparația probelor atelierului și 3.Tr (elicea de barcă, Easy 3Draw
  18.20.0), unite în `d262e57a` de sesiunea liniei, la cuvântul owner-ului; 25.8↑a (trasarea, `473f2e20`) și A.5
  (adminul, `1b46c955`), cu reparația probei extensiilor (`8287d66e`); 11.3↑f (planșele, `f4601938`), unită de sesiunea
  liniei, la cuvântul owner-ului.
- **Liniile** (vezi [indexul](README.md)):
  - **planșele:** 11.3↑f (urechile după reguli) unită în `main` (`f4601938`) de sesiunea liniei, la cuvântul owner-ului;
    nicio felie în lucru (tăierea plăcii 11, la owner; 11.5↑b după etapa 13);
  - **adminul:** A.6 (Roadmap, Documentație, Setări) în lucru; A.7, la cuvântul owner-ului;
  - **incrustațiile:** 12.1↑e-3 și 12.1↑e-4 în lucru, PR-ul încă ciornă;
  - **biblioteca extensiilor, interfața nouă** (3.Xh, `wip/3.Xh-biblioteca-ui`, ADR 0231 acceptat cu 1a–4a, canalul
    `biblioteca`): 3.Xh-1…3 gata pe ramură, PR-ul încă ciornă;
  - **elicele:** 3.Ts (ventilatorul cu carcasă), la cuvântul owner-ului. **Trasarea:** 25.8↑b, la cuvântul owner-ului;
  - **fără felie în lucru:** tăierea (după 10.3↑o: 10.3↑p–r), imprimanta (după 3.6v: 3.6w, camera), aranjamentele (28.1↑).
    Pornesc la cuvântul owner-ului, cu un brief scris de sesiunea principală și lipit de owner într-o sesiune cloud nouă;
  - **încheiate:** ancorele (6.V↑), raportările (15.B↑b), galeria (3.Tp, ADR 0281), probele instabile.
- **De urmărit:** pornirea cu ușa e la 113,0 / 115 kB (cu Atelierul, 113,3): o felie care mai adaugă în pornire cere întâi
  loc sau decizia owner-ului pe plafon. În panoul foii, la 1400 px, etichetele „Numele” și „Materialul” apar tăiate la o
  literă (văzut de linia trasării, și pe `220bd48e`: nu vine dintr-o felie de azi).
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
