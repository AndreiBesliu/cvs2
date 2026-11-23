# Biblioteca extensiilor (3.Xg, 3.Xh)

## 3.Xh: interfața nouă a bibliotecii (în lucru, în cloud)

_Linia „biblioteca”, din 23.11.2026 într-o sesiune cloud: ramura `wip/3.Xh-biblioteca-ui` (din `main` `8f122eb6`, adusă la
`8177ab8` pe 23.11), ADR-urile 0231–0239, canalul `biblioteca`. Starea: **ADR 0231 ACCEPTAT („Da, 1a–4a”); 3.Xh-1 (datele)
GATA pe 23.11; urmează 3.Xh-2 (fereastra de confirmare, „Scoate” cu întrebarea). PR-ul liniei, ciornă până la capătul lui
3.Xh: `AndreiBesliu/cvs2#4`.**_

Cererea owner-ului (23.11): „poti sa pornesti un branch in care sa modificam libraria de plugin-uri? vreau ceva mai frumos
si cu un UI/UX mai bun si atragator”.

- **23.11, propunerea (fără cod de produs):** 87 de capturi ale bibliotecii de azi (11 stări; 1440, 1024 și 390 px; două
  teme; ro și en), cu zece lucruri găsite și măsurate (în ADR 0231, „Ce e azi”). ADR 0231 propus: trei direcții care se
  exclud (A meniul îmbunătățit, **B fereastra „Biblioteca extensiilor”, recomandată**, C pagina pe tot ecranul) și ce se face
  oricum (datele noi ale catalogului, semnul în pachet, o singură fereastră de confirmare, „Scoate” cu întrebarea, scheletul,
  paleta). Schița: <https://claude.ai/artifact/RVvJq3q2NPxtTPm2Y8Q8EV> (privată, a owner-ului), cu formularul în baza ei:
  colecția `raspunsuri`, documentul `owner` (`q1`–`q4`, notele `q1n`–`q4n`, `text`, `la`).
- **Întrebările** (recomandarea e „a” la toate): 1 unde stă biblioteca; 2 semnul lui Easy 3Draw; 3 „ce e nou” cerut de probă
  la fiecare versiune (o regulă pentru toate liniile care schimbă pluginul); 4 capturile din bibliotecă.
- **Feliile, după răspunsuri (pentru B):** 3.Xh-1 datele și semnul; 3.Xh-2 fereastra de confirmare și „Scoate”; 3.Xh-3
  fereastra bibliotecii, meniul scurtat, paleta; 3.Xh-4 telefonul, tastatura, manualul, otrăvurile.
- **23.11, răspunsurile owner-ului: „Da, 1a–4a”** (în sesiune și în formular, fără note): 1a fereastra „Biblioteca
  extensiilor”, deschisă din meniu; 2a semnul lui Easy 3Draw e cărămida; 3a „ce e nou” cerut de probă la fiecare versiune
  nouă; 4a trei capturi adevărate pe extensie, făcute de un script din repo.
- **23.11, 3.Xh-1 (datele), gata** (`76447fe`, apoi commit-ul documentelor): semnul în pachet (`pictograma` în
  `extensie.json`, un SVG de cel mult 8 kB) și în catalog; `despre`, `noutati`, `autor` și `capturi` în
  `extensii/biblioteca.json` și în catalog, citite tolerant (`sarite`); capturile comise în
  `extensii/<dosar>/biblioteca/`; poarta build-ului cu imaginile; semnul în meniul de azi și pe fila extensiei. Easy 3Draw
  18.20.0. Pornirea neschimbată, totalul 762,0 / 800 kB (+1,1). Otrăvurile: 45 / 45 (35 unitare, 10 prin e2e), în clonă; la prima rulare 45 / 46: scăpase ieșirea `faraNoutati` a construcției, citită doar de probă, scoasă cu otrava ei.
  **Fondul semnului e gri-albăstrui (`#dbe6ee`), nu cremul din schiță** (se pierdea pe fila aleasă): de arătat owner-ului.

**Regula nouă pentru toate liniile care schimbă o extensie din bibliotecă (răspunsul 3a):**
1. versiunea nouă în `extensii/<dosar>/extensie.json`;
2. rândul ei de „ce e nou”, **primul** din `noutati`, la extensia ei din `extensii/biblioteca.json`:
   `{ "versiune": "<versiunea>", "ro": "…", "en": "…" }` (cel mult 240 de caractere fiecare; versiunile, strict
   descrescător);
3. `node scripts/biblioteca.ts --scrie` (refuză fără rândul de la 2);
4. proba `test/unit/biblioteca.constructie.test.ts` cade până atunci, cu rândul de scris în mesaj.

**Capturile unei extensii** (răspunsul 4a) se refac la cerere, când i se schimbă înfățișarea: `node
scripts/capturi-biblioteca.ts [dosar]` (serverul de dezvoltare, un browser fără fereastră; scenele sunt în script, `SCENE`),
apoi cele șase fișiere din `extensii/<dosar>/biblioteca/` se comit. O captură nouă = scena ei în script și rândul ei în
`capturi`, cu textul alternativ în ambele limbi (cel mult patru pe extensie, cel mult 150 kB una).

**Capcane găsite (23.11):**
- **În container lipsește Edge** (pe 23.11 nu era instalat, iar `npx playwright install msedge` n-a răspuns în 150 s).
  Probele e2e ale liniei rulează local cu Chrome (`chromium.launch({ channel: 'chrome' })`, sau o copie a configurației în
  `.tmp/` cu `channel: 'chrome'`); cu Edge rulează doar CI-ul complet.
- **Capturile se fac din `.tmp/`:** `.tmp/capturi-3xh/` (ignorat) are scriptul stărilor (`capturi.mjs`: catalogul ținut,
  oprit sau stricat cu `page.route`; o versiune veche instalată din fișier, făcută din pachetul de acum cu alt manifest, ca în
  `biblioteca.spec.ts`), măsurătorile și capturile cadrului extensiei (WebP prin `OffscreenCanvas`, ~30 kB la 960 px). 3D-ul
  extensiei merge în Chrome fără fereastră cu `--use-angle=swiftshader`.
- **Culorile calculate ale aplicației sunt `oklab(...)`** (jetoanele derivate cu `color-mix`): un contrast socotit din
  `getComputedStyle` cu o expresie pentru `rgb()` iese greșit (scriptul a dat 20,99 pe tema luminoasă și 1,33 pe cea întunecată, pentru aceleași elemente). Contrastul nu e măsurat încă:
  la cod, culoarea se trece întâi printr-o pânză (`fillStyle`, apoi `getImageData`).
- **`main` se mișcă repede:** 3.Tq a dus Easy 3Draw la 18.19.0 în ziua pornirii. Semnul din pachet (3.Xh-1) cere și el o
  versiune nouă: numărul se ia după `origin/main` adus, în ziua feliei.
- **„Scoate” șterge azi fără întrebare** extensia și datele ei (`Gestionare`, `scoateExtensia`): se repară în 3.Xh-2, în
  orice direcție.
- **Un `<button>` își pune conținutul la mijloc**, și cu `display: flex`: rândul unei extensii instalate, cu semnul lângă
  text, stătea în mijlocul meniului (93,8 px de margine) până la `justify-content: flex-start`. Probele treceau; s-a văzut
  doar pe captura mărită. Proba e2e măsoară acum unde începe rândul.
- **`data-extensii="…"` e un control pentru proba manualului** (`manual.test.ts` cere fiecare valoare într-un capitol). Un
  element care nu e control (semnul) are alt atribut: `data-semn`.
- **Fereastra de eroare a lui Vite acoperă pagina** în scriptul capturilor, la prima rulare: catalogul nu se poate construi
  cât capturile lipsesc, iar cererea lui cade. Scriptul pornește serverul cu `hmr: { overlay: false }`.
- **Un `vite preview` rămas pe 4173** face ca Playwright să nu scrie nimic (`reuseExistingServer: false`): `pkill -f "vite
  preview"` înaintea probelor e2e.
- **Otrăvurile vecine:** după felie, `verifica` pe 3.Xa–3.Xg dă aceleași VOID-uri ca pe `main` (3.Xa: E02–E07; 3.Xb: K01;
  3.Xc: K01, E01, E07, E08; 3.Xd: X18; 3.Xf: X03), deci felia n-a golit niciuna. Cele vechi sunt de dinaintea liniei.

## 3.Xg: biblioteca (încheiată, în `main` din 07.11)

<!-- Adusă din memoria sesiunii principale pe 23.11.2026 (mutarea în cloud). De aici înainte o ține la zi linia, pe ramura ei, odată cu feliile. -->

_cncvs2, biblioteca extensiilor (felia 3.Xg): worktree `cncvs2-lucru\\biblioteca`, ramura `wip/3.Xg-biblioteca`, e2e 4180 / 127.0.7, ADR 0230–0239; ADR 0230 ACCEPTAT („Da, 1a–7a”), felia GATA pe 07.11 (`2f01a82`), UNITĂ în main pe 07.11 („Da, unește”, `58e73c0`); pe live ajunge cu următoarea publicare a aplicației; o versiune nouă de plugin cere `node scripts/biblioteca.ts --scrie`_

Pornită pe 07.11.2026 de sesiunea principală, la cererea owner-ului: „Vreau ca plugin-ul nostru sa fie disponibil printr-o
librarie. Fa asta intr-un worktree”. Easy 3Draw (id `trenulet`, [Trenuleț ca extensie](trenulet.md)) se instalează și se actualizează
dintr-o listă servită lângă aplicație.

- **Locul:** worktree-ul `C:\Users\besli\cncvs2-lucru\biblioteca` (joncțiuni `node_modules`), e2e pe 4180 cu
  `CNCVS2_E2E_RETEA=127.0.7`, ADR-urile 0230–0239, canalul `biblioteca` (<https://cncvectorstudio-test--biblioteca-gw7dr9bc.web.app>,
  până pe 07.12). Clona otrăvurilor: `C:\Users\besli\cncvs2-lucru\otravuri-biblioteca`. Nota de predare: `biblioteca-worktree.md`
  în dosarul de note al grupului de sesiuni.
- **07.11:** ADR 0230 propus (`2a2bf19`, schița <https://claude.ai/artifact/GJgA4hRePmXFNPNNaQux3n>), apoi „Da, 1a–7a” și felia
  (`2f01a82`): la build, `scripts/biblioteca.ts` face din `extensii/biblioteca.json` pachetul și `dist/extensii/catalog.json`
  (numele pachetului cu amprenta; în afara precache-ului și a plafonului); în meniul Extensii, secțiunea Biblioteca (Instalează
  cu fereastra, Actualizează dintr-un clic, Instalată), linkul `#biblioteca=<id>`; amprenta SHA-256 înaintea cititorului.
  Otrăvurile 37 / 37; totalul 519,5 → 523,0 / 550 kB, pornirea neschimbată.
- **07.11, seara: unită în `main`** („Da, unește”): `58e73c0` (părinții `1bf99c5` = main, `93192bb` = ramura), făcut din
  worktree cu `git commit-tree` pe arborele ramurii (main era deja în ea), apoi `git merge --ff-only` pe ramură și
  `git push origin HEAD:refs/heads/main HEAD:refs/heads/wip/3.Xg-biblioteca`; checkout-ul principal NEATINS (main-ul lui
  local rămâne în urmă până la `git pull` al sesiunii principale). `CLAUDE.md` după unire: `63d6af5`, publicat pe test
  (verificat acolo), DEVLOG `392bc4b`. Easy 3Draw pe live odată cu următoarea publicare a aplicației (6a).
- **Proba instabilă `extensii.lucru.spec.ts:277`** (a doua formă propusă de extensie, după ce fila ei reapare): a picat o
  dată în CI-ul complet pe `63d6af5`, verde la reluare; local cade doar sub încărcarea altor sesiuni, 0 / 76 alternat cu
  `main` dinainte la încărcare egală. Nu e a bibliotecii. Urma CI-ului (artefactul `probe-cazute`, descărcat cu acordul
  owner-ului): clicul dat la ~60 ms după ce fereastra extensiei reapare nu ajunge la buton (doar pe Linux). Întărită în
  `cd100d5` (`clicDupaReaparitie`: repetă doar clicul care n-a ajuns; la capăt, exact două răspunsuri), unită în `main` pe
  07.11 („Da, unește”, `4698385`, după `main` `b818601` adus în ramură).
- **Why:** pachetul se trimitea de mână, omul nu afla de o versiune nouă, iar nimic nu lega fișierul de commit-ul probat.
  Decizia din 02.11 („nu vreau sa fie prezent in softul vanilla”) rămâne: biblioteca nu pune pluginul în aplicație.
- **How to apply:** o schimbare a surselor lui Easy 3Draw cere versiunea ridicată în `extensii/trenulet/extensie.json` și
  `node scripts/biblioteca.ts --scrie` (proba `biblioteca.constructie.test.ts` cade până atunci); o extensie nouă în bibliotecă
  = un rând în `extensii/biblioteca.json` (descrierea ro/en ≤ 160). Baza e2e a otrăvurilor se rulează pe mașina liniștită: sub
  o publicare paralelă, proba instalării a căzut o dată fără otravă.

Legat: [sesiunea principală](principala.md), [Uneltele worktree-urilor locale (de dinainte de cloud)](unelte-worktree.md), [„Segmentează (plan mic)”](lectii.md#feedback-segmentare-plan-mic).

**Worktree-ul scos (08.11)**, la „dupa ce verifici care worktree a terminat si a fost integrat in maine, vreau sa inchizi tu acel worktree si sa il arhivezi”: `cncvs2-lucru\biblioteca` (joncțiunile întâi), ramura locală ștearsă, sesiunea arhivată. Pe `origin` rămâne `wip/3.Xg-biblioteca`, în lista de șters a owner-ului. O felie nouă a liniei pornește dintr-un worktree nou, din `main`.
