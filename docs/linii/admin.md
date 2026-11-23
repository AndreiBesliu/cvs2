# Adminul reproiectat (ADR 0260)

<!-- Adusă din memoria sesiunii principale pe 23.11.2026 (mutarea în cloud). De aici înainte o ține la zi linia, pe ramura ei, odată cu feliile. -->

_CNCVS2, ADR 0260: pagina /admin reproiectată; A.1–A.3 unite în main (A.3: 528ee187); A.4 (Sugestii ca tablă) GATA DE UNIT din 23.11, pe wip/A.1-admin, cu PR spre main; A.5–A.7 la cuvântul owner-ului_

Linia adminului din [sesiunea principală](principala.md): ADR 0260 (intervalul 0260–0269), acceptat pe 13.11.2026 cu ideile 51–62 de pe
tabla „Harta schițelor”. Owner-ul a cerut „vreau sa faci design si pentru admin”, iar la idei a răspuns „Da la toate”
(`5abe4da`). Pornită pe 17.11 („ok, ia-le la rand”, „Yes, start it then”, prin sesiunea principală).

- **Schițele:** rândul G al canvas-ului aranjamentelor (<https://claude.ai/artifact/VuzcaEYQsLoTvRBxpnSak2>, fișierele
  `project/Admin-*.dc.html`: Azi, Intrarea, Erori, Tichete…), în paleta Insulelor.
- **Locul:** din 23.11, o sesiune cloud pe ramura `wip/A.1-admin` (linia continuă pe ea; felul de lucru:
  `docs/lucru-in-cloud.md`). Până atunci, worktree-ul local `admin`. Proba de pe emulatoare rulează cu UN lucrător (fiecare
  probă golește baza comună), pe 4173 și porturile emulatoarelor; în container sunt libere. Canalul `admin`
  (<https://cncvectorstudio-test--admin-pz7pkdut.web.app>, până pe 18.12) se publică din GitHub (`canal.yml`).
- **A.1 UNITĂ în main** (`5147f448`; `3.Aa`), **A.2 UNITĂ în main** (`ce5bd472`; `3.Ab`).
- **A.3 UNITĂ în main pe 22.11** (`528ee187`, din `3ab5b1b3`; `3.Ac`; predarea în notele
  comune, `admin-A3.md`): Tichete ca o conversație (lista + detaliul, „Răspunde și rezolvă”, ciornele pe pagină, erorile din sesiune
  spre Erori, grupul vechi adus) și **răspunsurile rapide, ADR 0261** (acceptat 21.11, „Da, toate recomandările”, 1a–5a):
  `shared/raspunsuriRapide.ts`, acțiunea `raspunsuriRapide` a callable-ului `tichete` (owner, versiunea văzută, audit),
  regula `setari/raspunsuriRapide` (cu `tichete.raspunde`), secțiunea din Setări, pastilele din Tichete (la unire s-au
  publicat și regulile Firestore, și funcția `tichete`). `/admin` 113,7 → 121,2 (linia +14,7 din +25). Otrăvurile 59 / 59.
- **A.4 (Sugestii ca tablă) GATA DE UNIT din 23.11** (`3.Ad`; pornită pe 22.11 la „Da, A.4”, oprită la pauza de seară,
  încheiată în cloud, cu `main` `8f122eb6` adus în `141fe90e`): tabla deciziilor (o coloană pe stare, Respinsele dedesubt),
  tragerea și „Mută în…” din tastatură, nota cerută la Respinsă și Amânată, mutarea arătată cât e în drum și ținută după
  răspuns fără recitire, detaliul ca fereastră, „Sugestie nouă”, „Ale mele” / „Toate”. Fără reguli, date sau funcții noi:
  **la unire se publică doar Hosting-ul.** `/admin` 121,2 → 124,1 / 200 kB (linia, +17,6 din +25). Otrăvurile 41 / 41 (14
  unitare, 27 pe emulatoare; E12 scoasă cu regula ei CSS, echivalentă în Edge). Raportul și porțile: PR-ul ramurii spre `main`.
- **Întrebarea la owner cu schiță** (ca linia planșelor): o pagină privată cu schițele de încercat și formularul, răspunsurile
  în baza ei (`raspunsuri`, scrise doar de owner); pentru 0261: <https://claude.ai/artifact/DhLTbJiBTWGdgjobiDcJb2>.
- **Feliile rămase:** A.5 Utilizatori și Personal; A.6 Roadmap, Documentație, Setări (istoricul din audit, și al
  răspunsurilor rapide); A.7 telefonul. Fiecare doar la cuvântul owner-ului.

**Why:** adminul e pagina personalului, nu ține de aranjamente (ADR 0250); de aceea are linia lui, nu feliile 28.x.

**How to apply:**
- rămân neschimbate (în afara unui ADR al liniei, ca 0261): permisiunile (`fileVizibile` nu știe de Azi), regulile, Firestore
  Lite (fără ascultători), fără indexuri compuse noi;
- pagina se deschide pe Azi: o probă nouă de pe emulatoare intră în filă din bară (`[data-fila=…]`, `aria-current`);
- **Firestore Lite citește un document prin `documents:batchGet` (POST, calea în CORP)**: o probă „nicio citire” caută în
  adresă și în `postData()`; rutele pe `:runQuery` au `?key=…` (funcție pe cale, nu glob, și probă că cererea e ținută);
- detaliul lipit sus (Erori, Tichete) ține cât spațiul de sub el (`useCatSpatiulDeJos` în `carcasa/stari.tsx`) cu
  `box-sizing: border-box` (fără ea, umplutura și bordura trec de plafon); flex-ul din Tichete cere selector dublu (grila din
  `admin.css` câștiga după ordinea foilor în bundle);
- un formular citit din Firestore pornește din nou la citirea SOSITĂ (`key={citiri}`), nu la cerere (`key={rev}`: se remonta
  din valorile vechi și le ținea);
- sub încărcare, sonda rece a funcțiilor (Diagnoza) și primul callable trec de 30 s: 60 s în probe;
- dicționarele adminului (ro și en) intră amândouă în bucata lui: fiecare text nou contează de două ori la mărime;
- o probă cu un text ales „la întâmplare” se ancorează pe hârtie (U04: tăietura cădea chiar la un spațiu);
- build-ul porților se face cu documentele traduse (fișa intră în `dist/documentatie/`);
- tabla (A.4): un mesaj pus deasupra ei la o mutare o împinge sub cursorul care trage, deci decizia se anunță doar pentru
  cititorul de ecran; un text lung `nowrap` dintr-un card lățește grila (și pagina): `minmax(0, 1fr)` + `min-width: 0`;
  `dragTo` din Playwright merge cu tragerea HTML5 în Edge; starea „în drum” se probează ținând callable-ul (portul 5005,
  calea `/sugestii`); sugestiile din `beforeEach`-ul bancului vizual au id-uri de 21 de caractere, refuzate de server.
- **în cloud, probele de pe emulatoare cer `apis.google.com` permis în mediu** (login-ul Google al emulatorului de Auth
  își încarcă scriptul de acolo; fără el, „Intră cu Google” dă `auth/internal-error` și fereastra nu se deschide). O probă
  în container, cu funcțiile compilate: `firebase emulators:exec --only auth,firestore,functions,storage --project
  demo-cncvs2 "npx playwright test -c playwright.emulator.config.ts sugestii.emulator"` (sub un minut);
- **otrăvurile de pe emulatoare:** `scripts/otravuri-emulatoare.py`, în clonă (`docs/otravuri.md`); titlurile din `GREP`
  sunt expresii regulate, deci fără paranteze; verdictul PRINSĂ se citește în `.tmp/otravuri-emu-<ID>.out`, pe aserțiunea
  căzută;
- **o probă „nicio citire” numără doar citirile zonei ei** (colecția e în corpul cererii): rezumatul de la intrare
  (cifrele barei, Diagnoza: marcajele, apoi `meta/deployment`) poate fi încă pe drum când fila a sosit, pe o mașină mai
  lentă; o verificare pusă doar la capătul probei lasă otrava să cadă pe o urmare, nu pe ea;
- **o probă de așezare măsoară acolo unde defectul se vede:** adresa lungă încăpea în cardul din banda Respinselor (416 px
  la 700 px); se măsoară în coloana cea mai îngustă, cu o aserțiune că textul chiar e tăiat (altfel proba nu spune nimic);
- în Edge, un buton oprit primește evenimentele tragerii (`dragenter`, `dragover`, `drop`) și le lasă să urce: nu cere
  `pointer-events: none` ca să primească un card;
- **bancul vizual al liniei** (capturile filelor, în ambele teme, la trei lățimi, cu datele lui pe emulatoare) și lanțurile
  locale n-au intrat în repo: se scot din istorie, `git show 137a08ac:.lucru/admin/vizual/vizual.spec.ts` (se pune într-un
  dosar din `.tmp/`, cu un config copiat din `playwright.emulator.config.ts`, cu `testDir` spre el, ținut în rădăcină:
  `testDir` e relativ la config).
