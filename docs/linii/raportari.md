# Raportările (15.B↑b)

<!-- Adusă din memoria sesiunii principale pe 23.11.2026 (mutarea în cloud). De aici înainte o ține la zi linia, pe ramura ei, odată cu feliile. -->

_CNCVS2: raportările, partea a doua (15.B↑b, ADR 0116 §12, §16): UNITĂ în main pe 07.11 (`b501571`) și publicată pe test cu `e9cf6ee` (serverul înaintea site-ului, ținta `stocare` fără rol WIF în plus); proiectul atașat prin callable (Storage, nimic din client), jobul `pastrareTichete`; rămâne proba owner-ului, apoi 14.D↑ doar la cuvântul lui_

Linia raportărilor din cncvs2, pornită pe 07.11.2026 de sesiunea principală, la întrebarea owner-ului despre ce se mai poate
face în paralel (15.B↑b fusese notată pe 02.11 „pentru mai târziu”).

- **Unde:** worktree-ul `C:\Users\besli\cncvs2-lucru\raportari`, ramura `wip/15.B-raportari` din `main` `80cc176`; commit-urile
  `d2b5974` (codul), `b741241`, `58a4748` (fișa, DEVLOG), `1421c38` (canalul), `b1c61ad`; apoi `main` (`1bf99c5`) unit în
  ramură (merge `c4e1e4c`, la cererea sesiunii principale), porțile reluate pe rezultat, `319d4c2`, `64495e6`; push-uit, CI
  rapid verde. Totalul pachetului după unire: 519,5 / 550 (neschimbat de felie). e2e pe 4177 și
  `127.0.4`; emulatorul Storage pe 9195. Clona otrăvurilor: `C:\Users\besli\cncvs2-lucru\otravuri-15bb` (cu joncțiuni:
  la scoatere, `rmdir` pe ele întâi).
- **Canal:** <https://cncvectorstudio-test--raportari-uffzv6xn.web.app> (până pe 07.12): doar bifa și mărimea, fiindcă
  funcțiile de pe test sunt din `main`.
- **Decizia de mecanism (nu redeschide fără motiv):** proiectul urcă și coboară prin callable-ul `tichete`; `storage.rules`
  refuză tot. Regulile cross-service ar fi cerut rolul IAM acordat doar interactiv, CORS pe bucket și cel mult 2 documente
  pe evaluare (vezi „Firebase: publicare”).
- **Proba owner-ului (lista dată pe 07.11):** se face doar după unire și publicarea serverului. Pe canal nu merge: serverul
  vechi aruncă tăcut proiectul atașat, iar canalele n-au App Check. De aceea **funcțiile se publică înaintea hosting-ului**.
- **Unită și publicată (07.11):** la „Da, transmite” (owner-ul, în sesiunea liniei), sesiunea principală a unit-o în `main`
  peste biblioteca extensiilor (`b501571`), apoi imprimanta (`6e61bee`); CI-ul complet verde pe `e9cf6ee`, publicat pe test
  (rularea `42412022925`): întâi serverul (regulile Storage eliberate, fără vreun rol în plus pentru contul WIF; cele 12
  funcții, `pastrareTichete` creată), apoi site-ul. Regulile Storage le-au înlocuit pe ale aplicației vechi pe bucket-ul de
  test. Tichetele rezolvate înainte de 15.B↑b n-au `rezolvatLa` (jobul nu le vede).
- **Găsit, neatins (în afara feliei):** `admin.emulator.spec.ts` („fila Erori … Diagnoza după”) cade local și pe baza curată:
  Diagnoza așteaptă 5 s, iar pornirea la rece a lui `logClientError` trece de ele pe mașina asta; CI-ul (Linux) e verde.
- **Felia următoare a liniei:** 14.D↑ (fila Utilizatori completă, exportul și ștergerea datelor, acum și cu Storage-ul,
  registrul probei), doar după cuvântul owner-ului.

Legat: [sesiunea principală](principala.md), [Uneltele worktree-urilor locale (de dinainte de cloud)](unelte-worktree.md), „Storage emulator: TEMP comun”.

**Worktree-ul scos (08.11)**, la „dupa ce verifici care worktree a terminat si a fost integrat in maine, vreau sa inchizi tu acel worktree si sa il arhivezi”: `cncvs2-lucru\raportari` (joncțiunile întâi), ramura locală ștearsă, sesiunea arhivată. Pe `origin` rămâne `wip/15.B-raportari`, în lista de șters a owner-ului. Proba owner-ului (lista din 07.11) se face pe adresa principală de test; 14.D↑, dacă vine, pornește dintr-un worktree nou, din `main`.
