
## 21.11: 11.3↑d (urechile la locuri alese, ADR 0211, varianta a; documentul v26) GATA DE UNIT la `SHA` (împins), peste `main` `a64adf63`
- Pornită la „Da, toate recomandările” (owner-ul, 19.11, în sesiunea liniei); reluată 21.11 la mesajul sesiunii principale
  („da si vreau sa pornesti si restul worktrees”). `main` `a64adf63` unit în `9655d3f2` (ciocnirea, doar în DEVLOG).
- Commit-urile: `b616e074` (ADR 0211 acceptat), `63a1eca0` (documentul v26), `e5e464c4` (corpusul de aur la v26),
  `f267c067` (lucrarea), `2ff0e0ac` (fereastra și modul pânzei), `c9b358f6` (probele țintite ale otrăvurilor scăpate),
  `76d5b0b3` (documentele). Canalul `plansele` publicat 22.11 pe `76d5b0b3` (verificat octet cu octet, până pe 22.12).
- **Pentru unire:** peste `main` `a64adf63`, doar 11.3↑d; față de `main` `40487c43`, pe uscat (`git merge-tree`), se ciocnește
  doar DEVLOG (intrările de la capăt); v26 e prima versiune liberă (pe `main`, 25). Conflicte posibile: DEVLOG (intrarea la capăt), `CLAUDE.md`
  (paragraful planșelor), `etapa-03.md` (rândul de după 11.3↑c), `otravuri.md`, `roadmap.en.json`, manualul (ro, en), ADR
  0211 / README, `export.*.ts` (mesaje noi), `carcasa.*.ts` (o cheie), `App.tsx`, `DialogExport.tsx`, `ExportConectat.tsx`,
  `valoriOperatii.ts`, `job.ts`, `urechi.ts`, `rigle.css`, `stil.css`, testele cu `schema: 26` / „aici 26”; o linie care urcă
  și ea schema (de pildă bifa pe rând la incrustații) ia v27 după unire.
- Porțile: PORTI
- Otrăvurile 11.3d: OTRAVURI
- Rămâne, la cuvântul owner-ului: 11.3↑e („unde ține”, la export) și 11.3↑f (regulile); tăierea plăcii.
