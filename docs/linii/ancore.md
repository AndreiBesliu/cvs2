# Ancora și tastele (6.V↑)

<!-- Adusă din memoria sesiunii principale pe 23.11.2026 (mutarea în cloud). De aici înainte o ține la zi linia, pe ramura ei, odată cu feliile. -->

_cncvs2, linia ancorelor și a tastelor transformării (ADR 0240): ÎNCHISĂ — toată în main și pe test (09.11, `3797e17`; reparația fontului lat `4246279`); worktree `ancore` încă pe disc_

Pe 08.11.2026 owner-ul a cerut o linie pentru „origin/anchor points pentru vectori”, cu unealta Transformare ținând cont de
ele și cu tastele: Shift = proporția „orice ar fi”, Ctrl = fără proporție „orice ar fi”, Alt = păstrează centrul, combinabil,
și la desen. Sesiunea principală a deschis linia în `C:\Users\besli\cncvs2-lucru\ancore` (ramura `wip/6.V-ancore`, e2e 4181,
rețeaua `127.0.8`, ADR-urile 0240–0249, canalul `ancore`).

- **08.11:** ADR 0240 acceptat („Ok la toate” = 1a–4a: ancora nu se ține în proiect; la mânere și la desen lipirea urmează
  butonul Lipire + Shift+L; Shift câștigă peste Ctrl). Schița: <https://claude.ai/artifact/6YMwTjXNiQDTcME6BjFNgv>.
- **08.11:** 6.V↑ (`e8c4f90`), 6.V↑b (`ae84182`), 6.V↑c (`4b82bdb`) gata; „Da, unește” → unite în `main` (`0c81ccf`),
  publicate pe test cu `8714306`; încercarea owner-ului pe adresa principală de test (`/?test`, pașii 3–5, 10, 11, 12).
- **08.11 → 09.11:** „Da, 6.V↑d acum” → 6.V↑d gata pe ramură (codul `95556bc`, otrăvurile 29 / 29, ultimul `7dcb7a2`), pe
  canalul `ancore` cu `8b9c08541170` (<https://cncvectorstudio-test--ancore-vy17zado.web.app>, până pe 09.12): „Ce ține fix
  Alt”, cercul din colț, poligonul întins, rândul tastelor în bara de jos, X / Y ale ancorei în panou, formele rotite oblic
  prin geometrie. Totalul 546,4 → 547,9 / 600 kB.
- **09.11:** „Da, unește” → 6.V↑d unită în `main` de sesiunea principală (`e481e55`, peste trasare; conflicte doar în fișă,
  DEVLOG și traduceri), porțile verzi pe unire (unit 8 861, e2e 411 / 411); cu trasarea: pornirea 101,9 (cu ușa 105,6 / 110),
  totalul 578,8 / 600. Încercarea owner-ului: adresa principală de test, pașii 6, 11, 12, 13, 14 ai testului `/?test`.
  Linia ADR 0240 e ÎNCHISĂ; worktree-ul `ancore` mai e pe disc (îl scoate sesiunea principală, la cererea owner-ului).
- **09.11, după:** CI-ul complet pe `main` (`cbdaf64`) a picat pe Linux: bara de sus, cu fontul lat (DejaVu), trecea de
  1280 px. Reparat pe ramură (`4246279`: proba cu fontul lat în ro și en, textele listei colțurilor scurtate), unit prin
  `df19f8c`; CI-ul complet verde pe `3797e17`, publicat pe test (amprenta `3797e17ed2e1`). Regula a intrat în CLAUDE.md.
- **Lecții:** la 1280 px, bara de sus a Transformării a ieșit din fereastră cu două liste lungi → texte scurte în listă,
  explicația în titlu, și o probă e2e a lățimii, cu fontul LAT pus înainte (vezi „Porți și CI”); ancora „apucată” pe un mâner = mânerul câștigă (proba trebuie să apuce în
  afara mânerelor); o sesiune întreruptă = suita unitară reluată de la capăt (un log parțial nu e o probă); un pas nou în
  testul din aplicație mută numerele pașilor citați în coada owner-ului (vezi [Tutorial + snapshot + taste + roadmap](tutorial.md)).
- **Why:** Shift în cvs2 făcea colțul liber, invers decât ArtCAM (programul owner-ului); de aici cererea.
- **How to apply:** după „unește” pe 6.V↑d, linia e închisă; nota de predare: `side-session-notes/.../ancore-worktree.md`.
  Vezi [sesiunea principală](principala.md) și [„Toate opțiunile”](lectii.md#feedback-toate-optiunile).

- **Worktree-ul scos pe 09.11** („Yes, remove it”): linia e încheiată (6.V↑–6.V↑d în `main`, cu reparația barei de sus `4246279` / `df19f8c`); ramura locală ștearsă, sesiunea arhivată; `wip/6.V-ancore` pe `origin` e în lista de șters a owner-ului (18).
