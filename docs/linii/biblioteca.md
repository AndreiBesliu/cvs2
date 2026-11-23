# Biblioteca extensiilor (3.Xg)

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
