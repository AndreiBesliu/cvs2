# Uneltele worktree-urilor locale (de dinainte de cloud)

<!-- Adusă din memoria sesiunii principale pe 23.11.2026 (mutarea în cloud). De aici înainte o ține la zi linia, pe ramura ei, odată cu feliile. -->

_cncvs2 într-un worktree paralel: setul e2e din scripts/otravuri.py cere npm + portul 4173 (harnaș local); mărimile bucăților se compară cu un build curat al commit-ului (git archive), nu cu dist/ al altei sesiuni; la scoatere, joncțiunile întâi (git le vede ca dosar), iar restul ReadOnly din .git/worktrees/ (Drive) se curăță de mână_

Găsite pe 02.11.2026, la felia 7.5↑ (aldinul și cursivul, worktree-ul `C:\Users\besli\cncvs2-lucru\text`, portul 4174):

- **Otrăvurile de interfață:** `scripts/otravuri.py … e2e` rula `npm run build` și `npx playwright test` cu configurația
  implicită (portul 4173); pe `main`, din `9179c30`, unealta rulează build-ul și e2e-ul cu `node` (verifică portul ei
  înainte de a o folosi dintr-un worktree). În Git Bash, npm e stricat pe mașina asta, iar 4173 e al sesiunii principale. Setul unitar merge
  cu unealta (`node --test`); pentru cel e2e, un harnaș local cu aceleași reguli: baza verde întâi, o otravă pe rând,
  `node node_modules/vite/bin/vite.js build`, `node node_modules/@playwright/test/cli.js test --config=.tmp/pw.config.ts
  <spec>`, restaurarea verificată cu sha256, la capăt fiecare fișier atins identic cu `HEAD` (`git hash-object`) și un
  build curat, fiindcă `dist/` rămâne al ultimei otrăvi.
- **Mărimea bucăților:** `dist/` din checkout-ul principal nu e o bază. Sesiunea principală îl construiește cu schimbările
  ei, inclusiv cele necomise, chiar dacă versiunea din `index.html` e un commit mai vechi. Baza curată:
  `cd <dosar gol> && git -C <worktree> archive <commit> | tar -x` (cu `cd`: `tar` din Git Bash nu primește căi cu `C:`),
  joncțiunea `node_modules`, `vite build`, apoi gzip 9 pe bucată.
- **Suita emulatoarelor dintr-un worktree** (06.11, `taiere`): `.tmp/emu.ts` cere și `.tmp/pw.emulator.config.ts` (copiat
  din checkout-ul principal), iar două probe au `http://localhost:4173` scris în ele (`raportor.emulator.spec.ts`,
  `tichete.emulator.spec.ts`): rulează doar cu 4173 liber, plus porturile emulatoarelor (9095, 8085, 5005), verificate cu
  `netstat -ano`; portul worktree-ului nu ajută aici. Suita e2e obișnuită ia portul din `.tmp/pw.config.ts` (comanda,
  `use.baseURL`, `webServer.url`) și rețeaua podului din `CNCVS2_E2E_RETEA`. **Copia `.tmp/emu.ts` îmbătrânește:** din
  15.B↑b, `scripts/test-emulator.ts` pornește și Storage (portul 9195) și dă fiecărei rulări un `TMP`/`TEMP` propriu
  (emulatorul Storage își șterge dosarul la oprire). Cu copia veche: 7 căderi Storage la funcții, care nu sunt ale feliei
  (08.11, `taiere`). După fiecare unire cu `main`, `diff` între copie și scriptul din repo.
- **E2e-urile simultane se calcă** (13.11, `imprimanta`, 3.6s): cât rula e2e-ul altui worktree (tăierea pe 4175, planșele
  pe 4178, câte 2 workeri), al meu a avut 9, apoi 10 căderi din timp, de fiecare dată altele: `page.goto` cu
  „ERR_ABORTED / frame was detached”, carcasa neredată în 5 s, elemente negăsite în 30 s; toate trec singure. Pornirea
  durează normal ~135 ms până la titlu, deci o cădere de 5 s cere procesorul la ~90 %. Înainte de e2e-ul complet:
  `Get-CimInstance Win32_Process` după `playwright/test/cli.js|workerProcessEntry`; pornește-l după un minut încheiat fără
  nicio altă rulare (scriptul `e2e-cand-e-liniste.sh` din scratchpad-ul sesiunii imprimantei). Fără căderea reproductibilă,
  nu „repara” proba.
- **Publicarea pe canal din worktree:** `PATH="/c/Users/besli/AppData/Roaming/npm:$PATH" node scripts/publica-canal.ts
  <canal>`. CLI-ul `firebase` nu e în PATH-ul din Git Bash (la fel pentru `.tmp/emu.ts`: fără prefix, „'firebase' is not
  recognized”, 07.11). **Scriptul publică `dist/` așa cum e, fără build** (07.11, 10.3↑d): canalul a servit `7f1d815`, al
  build-ului emulatoarelor, nu HEAD-ul cu documentele. Întâi `vite build` pe HEAD, apoi publicarea, apoi
  `curl -s <canal> | grep -o 'cncvs2-versiune[^>]*'` = HEAD.
- **`dist/` vechi după o unire** (18.11, 25.7↑): poarta mărimii (`scripts/build-determinist.ts`) construiește în `.tmp`, nu
  în `dist/`; e2e-ul de după unire a rulat specurile aduse din `main` pe `dist/` de dinainte (amprenta lui = commit-ul
  vechi) și a căzut în surori și conversie. După orice unire și după otrăvurile e2e (lasă `dist/` construit cu ultima
  otravă): `vite build`, apoi `grep -o 'versiune" content="[^"]*"' dist/index.html` = HEAD, apoi e2e / publicarea.
- **Scoaterea worktree-ului** (03.11, `sender-ecran`): `git status --ignored` arată joncțiunea ca `node_modules/`, cu bară,
  deci git o vede ca dosar și `git worktree remove` ar coborî în ea, golind `node_modules` din checkout-ul principal. Ordinea:
  `cmd /c rmdir <joncțiune>` (fără `/s`: scoate doar legătura) pe `node_modules` și `functions\node_modules`; o plimbare care
  nu urmează legăturile, ca poartă (Node `readdirSync(d, {withFileTypes: true})`: pe Windows joncțiunea iese
  `isSymbolicLink()`); abia apoi `git -C <checkout principal> worktree remove <cale>` (fără `--force`, dacă `status` are doar
  `!!`). În Drive, dosarele `logs/` și `refs/` din `.git/worktrees/<nume>` au atributul ReadOnly: git scoate worktree-ul,
  dar cade cu „failed to delete … Permission denied” și lasă dosarele plus `ORIG_HEAD`. Se curăță scoțând atributul și
  ștergând nerecursiv (`DirectoryInfo.Delete()`), doar resturile tale: `git worktree prune` le-ar lua și pe ale altor sesiuni.

- **O probă e2e roșie după unire, ce vină are felia** (07.11, 3.Xg): cu alte sesiuni pe mașină (CPU ~80 %), căderile locale
  nu dovedesc nimic (aceeași probă: 2 din 9 sub încărcare, 0 din 76 fără). Comparația care decide: clona de otrăvuri pusă pe
  `main` dinaintea unirii, același spec (local, în `.tmp/`), ALTERNAT cu worktree-ul, la încărcare egală (`--workers` 1, 4,
  8). Starea paginii la blocaj o dă un spec de diagnostic cu `page.evaluate` (inert, rAF, dialogurile, ce e `hidden`).
- **Clicul în cadrul extensiei imediat după ce fereastra ei reapare** (fila, după altă fereastră) se pierde uneori pe Linux
  (CI), niciodată pe Windows (0 / 480): cadrul e alt proces. Ajutorul `clicDupaReaparitie` din `test/e2e/ajutor-extensii.ts`
  repetă doar clicul care n-a ajuns. Un tipar ca ăsta se caută după PASUL care îl pornește (clicul pe filă) și fiecare
  interacțiune de după el, nu după numele unui ajutor: căutând `cadru(page)` am găsit un loc din patru.

Legat: „Mutații: disciplina”, „Măsoară, reproductibil”, [sesiunea principală](principala.md).

- **Scoaterea, 08.11 (`biblioteca`, `raportari`, `trenulet`):** poarta cu legăturile (`legaturi.mjs`: Node, `readdirSync` cu `withFileTypes`, fără să coboare) a prins că `cmd //c "rmdir …"` dintr-o buclă nu găsise calea (scrisă în ghilimele duble, cu `$w`): legăturile erau tot acolo. Cu calea literală între apostrofuri a mers. Numără înainte și după intrările din `node_modules` al checkout-ului principal (302 / 198 rămase). La `trenulet`, și dosarul `.git/worktrees/trenulet` însuși era ReadOnly, nu doar `logs/` și `refs/`.
- **Publicarea unui commit doar cu `.md`:** rapidul de pe `main` sare peste un push doar cu `.md`, deci un DEVLOG pus de altă sesiune n-are rulare pe `main` (rularea apare pe ramura ei). Ajutorul `ci-publica-15a.sh` caută rapidul pe sha-ul exact și așteaptă degeaba 10 minute; `publica.yml` direct îl acceptă (strămoșul verde, doar `.md` între ele).
- **Un job din fundal moare la repornirea sesiunii** (07–08.11: ieșirea 4, nicio linie în jurnal): la „continua”, întâi starea (`main`, rulările, versiunea de pe test), nu așteptarea jobului vechi.
- **Nu comite cât rulează porțile lente** (08.11, unirea incrustațiilor): `raportor.emulator.spec.ts:57` și `tichete.emulator.spec.ts:109` compară versiunea din `dist/` cu `git rev-parse --short=12 HEAD` din clipa probei. Un commit doar cu documente, făcut cât mergeau, le-a dat roșu („Expected 031e41abb70b, Received 9692385e86d5”), fără nicio vină în cod. Documentele se comit după porți, sau emulatoarele se reiau cu build-ul pe HEAD-ul nou (fără `EMU_FARA_BUILD`). Editarea documentelor e sigură doar după build și determinism (documentația intră în `dist/`).
- **`.git/worktrees/<nume>` rămâne ReadOnly la fiecare scoatere** (trenulet 08.11, ancore 09.11): `git worktree remove` scoate dosarul worktree-ului, dar cade cu „Permission denied” pe metadate (dosarul însuși, `logs/`, `refs/`, toate ReadOnly; `ORIG_HEAD` rămas). În PowerShell: atributul ReadOnly scos doar pe cele trei dosare (`$i.Attributes -band (-bnot [IO.FileAttributes]::ReadOnly)`), apoi `Remove-Item` pe fiecare intrare, fără `-Recurse`; apoi `git worktree prune -v` și `git branch -d`.
- **Unirile sesiunii principale, din worktree-ul `unire`** (13.11, 3.6s): sesiunea designului comite documente în `main` din checkout-ul principal (de mai multe ori pe zi, și cât rulau porțile), deci unirea și porțile se fac în `C:\Users\besli\cncvs2-lucru\unire` (ramura `unire/<felia>` din `main`; joncțiunile `node_modules` și `functions\node_modules`; `.tmp/pw.config.ts`, `.tmp/pw.emulator.config.ts`, `.tmp/emu.ts` copiate), cu `porti-rapide-d.sh` / `porti-lente-d.sh` (`D=<dosar>`) din scratchpad-ul sesiunii principale. După porți: `git fetch`, `main` adus în ramură dacă s-a mișcat (doar documente: fără porți noi, doar `traduceri --verifica` și probele documentelor), decizia în CLAUDE.md, apoi `git merge --ff-only` în checkout-ul principal (curat) și push. Unirea de probă fără fișiere atinse: `git merge-tree --write-tree --name-only A B` (plus `commit-tree` pentru o combinație de două ramuri). O cădere `page.goto … ERR_ABORTED / frame was detached` la prima navigare a unei probe, sub 70 % CPU, trece singură: e încărcarea, nu felia.
- **Porțile lente din `unire`: rețeaua proprie și reluarea pe fișiere întregi** (13.11, 12.1↑d): `imprimanta.spec.ts` e în mod serial, deci o cădere (acolo, `EBUSY` pe un artefact Playwright) a lăsat 9 probe „did not run”, iar reluarea doar a probei căzute nu le-a acoperit (printre ele, ale lui 3.6s). Rulat singur cu rețeaua implicită (`127.0.0`), fișierul a picat iar, altfel („imprimanta-stare” goală după legare): imprimanta falsă de pe `127.0.0.5:9999` se călca cu alt worktree care rula aceeași probă. Cu `CNCVS2_E2E_RETEA=127.0.9`: 23 / 23. `porti-lente-d.sh` exportă acum `127.0.42` (`127.0.9` e al worktree-ului `aranjamente`) și reia fișierele întregi ale căzutelor.
- **Uneltele sesiunii principale stau în `C:\Users\besli\cncvs2-lucru\unelte`** (17.11): scratchpad-ul sesiunii se golește de fișierele vechi de câteva zile (au dispărut `publica-direct.sh`, `ambele_parti.py`, jurnalele publicărilor, iar publicarea lui `4b52fc3` a căzut cu „No such file”). Acolo: `porti-rapide-d.sh`, `porti-lente-d.sh` (`D=<dosar>`), `publica-direct.sh <sha>`, `ci-si-publica-SABLON.sh` (sha-ul înlocuit cu `sed`), `rezolva_devlog_doua_parti.py`, `ambele_parti.py`, `sarcina.mjs` (N procese cu bucle goale), `repeta-sub-sarcina.sh` / `e2e-sub-sarcina.sh` (o probă de K ori sub sarcină).
- **Probele instabile, cauzele găsite pe 17.11** (`912fece`): (1) un `setTimeout(0)` pus abia într-un alt `setTimeout(0)` pierde cursa cu o fereastră de 40 ms când primul întârzie; un singur hop o câștigă mereu (Node rulează ceasurile expirate în ordinea expirării) → al doilea hop, microtask. (2) Pauzele reale din probe → `t.mock.timers`. (3) `page.addInitScript` rulează în FIECARE cadru, și în cel sandbox al unei extensii, unde `localStorage` aruncă; sub încărcare Playwright îl pune în cadru după ce raportorul ascultă → `if (window !== window.top) return`. (4) Un drum e2e lung → `test.slow()`. Reproducerea: procesorul mașinii încărcat (32 de procese pe 32 de nuclee) sau al paginii, prin CDP (`Emulation.setCPUThrottlingRate`); cadrul extensiei, în alt proces, nu simte încetinirea paginii.
- **Porturile e2e se pot ciocni între worktree-uri** (17.11, `trasare`): clona `otravuri-taiere` are 4179, ca
  `trasare`; e2e-ul trasării a picat cu „http://localhost:4179 is already used” cât rulau otrăvurile tăierii. Invers,
  un server al meu pe portul lor le-ar fi oprit e2e-ul unei otrăvi la pornire, adică o „prindere” falsă. Înainte de
  e2e: `netstat -ano | grep :<port>` și porturile tuturor (`grep -o "localhost:[0-9]*" */.tmp/pw.config.ts`); trasarea
  e acum pe 4183.
- **Felia care atinge meniul contului sau ce vede `/admin` rulează și emulatoarele** (17.11, regula sesiunii principale,
  după ce 28.1↑b a rupt `tichete.emulator.spec.ts:109`, care listează rândurile meniului): `.tmp/emu.ts`, cu 4173 și
  porturile emulatoarelor libere (verifică întâi: alt `emulators:exec` pe `demo-cncvs2` le ține ocupate) și
  `FUNCTIONS_DISCOVERY_TIMEOUT=30`. Rândurile meniului se caută în `test/e2e` ȘI în `test/e2e-emulator`. La UNIRE,
  emulatoarele le rulează sesiunea principală (17.11: „rămân la mine; nu le rula tu”); porturile ocupate sunt de obicei
  ale porților ei de unire: nu porni a doua rulare peste ele.
