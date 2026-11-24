# Adminul reproiectat (ADR 0260)

<!-- Adusă din memoria sesiunii principale pe 23.11.2026 (mutarea în cloud). De aici înainte o ține la zi linia, pe ramura ei, odată cu feliile. -->

_CNCVS2, ADR 0260 și ADR 0262: linia ÎNCHEIATĂ pe 24.11. A.1–A.7 (ADR 0260) și A.8–A.11 (ADR 0262) unite în main; ultima, A.7 (telefonul), în 458befb9 (a cincisprezecea unire, din c08a24bc; PR-ul AndreiBesliu/cvs2#13, închis). O felie nouă pornește doar la cuvântul owner-ului. Înaintea live-ului: verificarea juridică (GDPR) a utilizării legate de cont (ADR 0262 §3)_

Linia adminului din [sesiunea principală](principala.md): ADR 0260 (intervalul 0260–0269), acceptat pe 13.11.2026 cu ideile 51–62 de pe
tabla „Harta schițelor”. Owner-ul a cerut „vreau sa faci design si pentru admin”, iar la idei a răspuns „Da la toate”
(`5abe4da`). Pornită pe 17.11 („ok, ia-le la rand”, „Yes, start it then”, prin sesiunea principală).

- **Schițele:** rândul G al canvas-ului aranjamentelor (<https://claude.ai/artifact/VuzcaEYQsLoTvRBxpnSak2>, fișierele
  `project/Admin-*.dc.html`: Azi, Intrarea, Erori, Tichete…), în paleta Insulelor.
- **Locul:** din 23.11, o sesiune cloud pe ramura `wip/A.1-admin` (linia continuă pe ea; felul de lucru:
  `docs/lucru-in-cloud.md`). Până atunci, worktree-ul local `admin`. Proba de pe emulatoare rulează cu UN lucrător (fiecare
  probă golește baza comună), pe 4173 și porturile emulatoarelor; în container sunt libere. Canalul `admin`
  (<https://cncvectorstudio-test--admin-pz7pkdut.web.app>, cu A.4 din 23.11, până pe 23.12) se publică din GitHub
  (`canal.yml`, pentru o ramură cu rapidul verde).
- **A.1 UNITĂ în main** (`5147f448`; `3.Aa`), **A.2 UNITĂ în main** (`ce5bd472`; `3.Ab`).
- **A.3 UNITĂ în main pe 22.11** (`528ee187`, din `3ab5b1b3`; `3.Ac`; predarea în notele
  comune, `admin-A3.md`): Tichete ca o conversație (lista + detaliul, „Răspunde și rezolvă”, ciornele pe pagină, erorile din sesiune
  spre Erori, grupul vechi adus) și **răspunsurile rapide, ADR 0261** (acceptat 21.11, „Da, toate recomandările”, 1a–5a):
  `shared/raspunsuriRapide.ts`, acțiunea `raspunsuriRapide` a callable-ului `tichete` (owner, versiunea văzută, audit),
  regula `setari/raspunsuriRapide` (cu `tichete.raspunde`), secțiunea din Setări, pastilele din Tichete (la unire s-au
  publicat și regulile Firestore, și funcția `tichete`). `/admin` 113,7 → 121,2 (linia +14,7 din +25). Otrăvurile 59 / 59.
- **A.4 UNITĂ în main pe 23.11** (`ddaa7ead`, din `20fb65de`; `3.Ad`; PR-ul AndreiBesliu/cvs2#3): Sugestii ca tablă a
  deciziilor (o coloană pe stare, tragerea și „Mută în…”, nota cerută la Respinsă și Amânată, mutarea ținută după răspuns
  fără recitire). `/admin` 121,2 → 124,1. Otrăvurile 41 / 41 (E12 scoasă cu regula ei CSS, echivalentă în Edge).
- **A.5 UNITĂ în main pe 23.11** (`1b46c955`, din `fe026f9f`; `3.Ae`; pornită la „Da, pornește A.5”, din `main` `c010e3d1`):
  Utilizatori cu tabelul, filtrele pe plan (cu numere), căutarea, contul ales alături (formularul planului, istoricul din
  audit doar cu „Audit: citește”); Personal cu felul intrării sub nume, invitațiile în lista oamenilor și matricea
  rol × permisiune (un rol editat pe coloana lui). Fără reguli, date sau funcții noi: **la unire se publică doar
  Hosting-ul.** `/admin` 124,1 → 125,6 / 200 kB (linia, +19,1 din +25: pentru A.6 și A.7 rămân ~5,9 kB din țintă).
  Otrăvurile 61 / 61.
- **A.6 (Roadmap, Documentație, Setări) UNITĂ în main pe 23.11** (`4497d639`, din `df098dad`; `3.Af`; pornită la „porneste”, peste A.5, încă neunită):
  „Ce așteaptă de la tine” lipit alături de etape peste 1 400 px; pista cronologiei pe un rând doar cât are loc (container,
  42rem), cu semnele etapelor pe două rânduri pe o pistă îngustă; cuprinsul documentului (alături peste 1 400 px, deasupra mai
  îngust) cu secțiunea de acum; starea ADR-ului sub titlu; istoricul fiecărei setări sub butonul ei, din audit. Fără reguli,
  date sau funcții noi: doar Hosting-ul. `/admin` 125,6 → 127,5 / 200 kB (linia, +21,0 din +25: pentru A.7 rămân ~4 kB).
  Otrăvurile 54 / 54. Raportul și porțile: PR-ul AndreiBesliu/cvs2#8 (de unit din `df098dad`).
- **A.8a (utilizarea: contractul, callable-ul `utilizare`, setările din admin) GATA pe ramură din 23.11** (`bcc654f8`; `3.Ag`):
  lista albă în `shared/utilizare.ts`, callable-ul cu loturile și setările, regulile, TTL-ul, secțiunea din Setări. **La unire
  se publică și serverul:** funcția nouă `utilizare`, regulile Firestore, indexurile (TTL pe `utilizare` și `limiteUtilizare`).
  `/admin` 127,5 → 129,9 / 200 kB. Otrăvurile 48 / 48.
- **A.8b (înregistratorul din editor, trimiterea în loturi) GATA pe ramură din 23.11** (`63b5d444`, `588edb3d`; `3.Ah`): în
  pornire doar sursa gestului și un tampon; înregistratorul în bucata lui (precache); trimiterea pusă de editare, prin bucata
  contului (**un `import('./PanouCont.tsx')` din pornire scoate o bucată nouă comună; nu-l adăuga**). Coada în
  `localStorage`. Pornirea 109,2 kB (cu ușa 113,7, cu Atelierul 114,0 / 115: **sub 1 kB liber**). Otrăvurile 40 / 40.
  **Regula `fara-cicluri` numără și importurile doar de tipuri:** după ce împarți un modul, `npm run importuri` (sau tot
  `npm run rapid`) înainte de push; tipurile comune ale utilizării stau în `utilizareTipuri.ts`.
- **A.8c (dialogurile, clicurile fine, derularea, zoom-ul) GATA pe ramură din 23.11** (`27bbd878`, `544adce5`, `2a2f1f96`;
  `3.Ai`): ce se prinde din pagină în `utilizareDom.ts` (bucata înregistratorului); numele unui control doar din catalogul scos
  din sursă (**un atribut de nume nou, scris de mână pe un control, cere `node scripts/catalog-controale.ts --scrie`**, altfel
  cade `utilizare.catalog.test.ts`; la o unire cu ciocnire în `catalogControale.ts`, se scrie din nou, nu se rezolvă de mână);
  un clic pe un buton al registrului sau pe o unealtă nu pleacă (acțiunea și unealta lui au deja evenimentul). Calculele lungi,
  mașina și imprimanta: A.8d. Pornirea neschimbată; totalul 774,3 → 778,2 / 800. Otrăvurile 32 / 33 (E11 echivalentă).
- **A.8d (calculele lungi, mașina, imprimanta) GATA pe ramură din 23.11** (`8b31c5b6`, `31a94dd5`; `3.Aj`): felurile `calcul`,
  `masina`, `imprimanta`, cu durata și mărimile în trepte; observatorul bazinului (`src/jobs/observatorCalcul.ts`, pus din
  `main.tsx`: **bazinul nu importă interfața**); mașina și imprimanta din stările la rând (`utilizareMasina.ts`,
  `utilizareImprimanta.ts`), câte un modul pe bucată (**un modul comun celor două ferestre ar scoate o bucată nouă**). Utilizarea
  nu schimbă un calcul (`formele` prinde un document stricat). Otrăvurile 36 / 36. Totalul 793,8 → 799,6 / 900 cu A.8c.
- **A.9a (sumele zilei, jobul de noapte) GATA pe ramură din 24.11** (`5668d6d6`, `4c9e191f`, `d25a0557`; `3.Ak`): sumele
  pure în `shared/utilizareZi.ts` (`SumatorZi`, comun jobului și filei), oamenii într-o schiță HyperLogLog (**fără conturi în
  sume**; unirea pe zile = maximul pe registru), jobul `agregaUtilizarea` în `JOBURI` (**un job nou se numără și în proba
  Azi de pe emulatoare**, și în Diagnoza, cu eticheta `admin.diag.job.*`), permisiunea `utilizare.citeste` (**o permisiune
  nouă se numără în matricea din `personal.emulator.spec.ts`**, nu doar în `personal.test.ts`). Otrăvurile 27 / 27.
- **A.9b (fila Utilizare) GATA pe ramură din 24.11** (`c549a600`, `c85a44c8`, `c70c52df`, `9641df20`; `3.Al`): fila citește
  doar `utilizareZi` (o cerere pe perioadă), partea pură în `src/admin/utilizare/date.ts`; numele din **catalogul acțiunilor
  generat la build** (`scripts/catalogActiuni.ts` → `documentatie/actiuni.json`, adus prin `aducere.ts`). Bucata
  `FilaUtilizare` e doar online (**`DOAR_ONLINE` în `shared/precache.ts` și lista din `precache.test.ts`**) și e în
  `CU_FIREBASE` din `scripts/build-determinist.ts` (importă din `PaginaAdmin` legătura Firestore). **O filă nouă în bară se
  numără în `azi.emulator.spec.ts` și `utilizatori.emulator.spec.ts`**, nu doar în unitare. Otrăvurile 26 / 26.
- **A.10 (fluxurile) GATA pe ramură din 24.11** (`94fede7d`, `b1ce3a3c`; `3.Am`): secvențele și pâlnia în sumele zilei
  (`fluxuri` din `shared/utilizareZi.ts`; **pâlnia după pasul cel mai departe, nu în ordine**: un proiect salvat exportat
  trece de desen și rol), adunate în `date.ts`. **Barele filei stau pe o grilă comună** (`.uz-bare` cu `subgrid`): o grilă pe
  rând face barele rândurilor cu text lung mai scurte. Otrăvurile 23 / 23.
- **A.11a (pașii dinaintea unei erori) GATA pe ramură din 24.11** (`82ec5424`, `8c050fb0`; `3.An`): **pașii se iau în clipa
  erorii** (`pasiAcum` în `raportorPornire.ts`, la intrarea în coadă), nu la trimitere; **verificarea lor stă în
  `shared/pasiEroareVerificare.ts`**, nu în `pasiEroare.ts`: altfel bucata raportorului aduce tot contractul utilizării. Un
  set „server” de otrăvuri cu un callable în probe cere și emulatorul de funcții (`--only auth,firestore,functions,storage`),
  altfel linia de bază cade. Otrăvurile 29 / 29.
- **A.11b (pașii la raportare) GATA pe ramură din 24.11** (`60025fb7`, `be22afe8`, `26a18b7b`; `3.Ao`): pașii se iau la
  deschiderea ferestrei raportării și pleacă doar cu bifa; **un atribut `data-camp` nou într-o fereastră a contului cere și
  el catalogul controalelor scris din nou**. Lista pașilor e comună Erori și Tichete (`src/admin/pasi/Pasi.tsx`). Otrăvurile
  10 / 10 (E06 după o a doua raportare, fără bifă, în proba cap-coadă).
- **A.11c (cronologia unui om) GATA pe ramură din 24.11** (`40148488`, `36e8a3a5`, `dfea17ea`; `3.Ap`): **regulile rămân
  închise pe `utilizare`**: cronologia trece prin callable (acțiunea `cronologie`, cu auditul), nu printr-o regulă de citire.
  **O permisiune nouă se numără în matricea din `personal.emulator.spec.ts`** (rândul și numărul de bife) și în grupele din
  `admin.personal.test.ts`. Encoder-ul REST al probelor știe acum și valori booleene (`utilizatori.emulator.spec.ts`).
  Otrăvurile 19 / 19.
- **A.11d (sesiunea raportării) GATA pe ramură din 24.11** (`1ae86894`, `8878b345`, `65bc77a1`, `ca631347`; `3.Aq`): **loturile
  se strâng doar cu contul deschis**, deci sesiunea raportării are doar ce a venit după intrare. **Proba e2e a Tichetelor
  compară versiunea cu commit-ul: `npm run build` după fiecare commit**, înaintea suitei pe emulatoare. Otrăvurile 11 / 11.
- **A.11e (disocierea) GATA pe ramură din 24.11** (`2e023ac1`, `a07c0a34`, `70617d54`; `3.Ar`): **legătura cont →
  pseudonim stă doar în `utilizareDisociate/{uid}`**, fără regulă (refuzată oricui din client); contul are doar
  `disociatLa`, auditul fără pseudonim. Cu ea, A.11 e încheiată (A.11a–A.11e). Otrăvurile 12 / 12.
- **A.7 (telefonul) UNITĂ în main pe 24.11** (`ee526edf`, `2a71cc02`, `2f1347d7`; `3.As`): sub 640 px, bara de jos
  (`FILE_JOS`, după drepturi) și ☰; bara laterală e un sertar (`data-deschis`). **Un element nou al carcasei care trebuie
  să fie la vedere pe telefon se probează la 390 px și față de bara de jos** (`conversatia.emulator.spec.ts`, „pe telefon”).
  Cu A.7, ADR 0260 are toate feliile. Otrăvurile 9 / 9.
- **După unirea PR-ului** (A.8a–A.8b, de owner, pe 23.11, cât lucram la A.8c): `main` adus în ramură printr-o unire obișnuită
  (**un push forțat al unei ramuri refăcute e refuzat de permisiuni**; ciocnirile doar în tabele), apoi catalogul controalelor
  scris din nou și **funcțiile compilate din nou** (`npm --prefix functions run compileaza`: probele pe emulatoare folosesc `functions/lib`, iar un contract nou în
  `shared/` fără compilare face serverul să arunce felurile noi).
- **Întrebarea la owner cu schiță** (ca linia planșelor): o pagină privată cu schițele de încercat și formularul, răspunsurile
  în baza ei (`raspunsuri`, scrise doar de owner); pentru 0261: <https://claude.ai/artifact/DhLTbJiBTWGdgjobiDcJb2>.
- **Unirile de pe 24.11:** A.8c–A.8d în `80d3eb70`, A.9a–A.9b în `95dddbe0`, A.10–A.11a în `7f6f4069`, A.11b–A.11e în
  `8ccb66e8` (din `c3f80a74`), A.7 în `458befb9` (din `c08a24bc`). **Sesiunea principală unește din commit-ul raportat, nu
  din vârf:** o felie împinsă după raport așteaptă lotul următor, iar completul ei pornește abia după ce lotul nu mai ține
  runnerele. Când `main` aduce doar o constantă sau documente, completul de pe commit-ul de dinainte rămâne bun, cu rapidul
  pe vârf (A.7: completul pe `b064e954`, rapidul pe `c08a24bc`, cu plafonul pornirii de 120 kB, ADR 0145).
- **Linia e încheiată.** `/admin` 138,2 / 200 kB (linia a pornit de la 106,5). Rămân deschise, la owner: verificarea
  juridică (GDPR) a colectării legate de cont, înaintea live-ului; cine poate disocia (azi „Conturi: administrează”) și dacă
  legătura cont → pseudonim se rupe (azi rămâne pe server, ADR 0262 §3).
- **ADR 0262 acceptat pe 23.11** (utilizarea aplicației), la cererea owner-ului de a vedea în admin ce unelte folosesc
  oamenii, fluxurile cele mai dese, ce nu se folosește și pașii dinaintea unei erori. Schița și formularul:
  <https://claude.ai/artifact/Y75BvkeR7kZmBpadwoFyya> (răspunsurile în baza ei, `raspunsuri`). Răspunsurile: colectarea
  pornită pentru toți cei cu cont, fără întrebare și fără buton în meniul contului, spusă doar în nota de confidențialitate;
  disocierea doar la cerere, prin tichet (A.11); 2a (pașii în raportul erorii), 3b (și clicurile fine, derularea, zoom-ul:
  A.8c), 4a, 5a, 6a, 7a (A.8–A.11 întâi, apoi A.7), cu nota „vreau sa pot configura eu din admin cat mai multe setari”
  (`setari/utilizare`, ADR 0262 §8). **Juridic:** legate de cont, evenimentele sunt date personale (GDPR); de verificat
  înaintea live-ului, spus owner-ului o dată, odată cu acceptarea. Feliile: A.8a (contractul, callable-ul, setările), A.8b
  (înregistratorul din client), A.8c (clicurile fine, dialogurile), A.8d (calculele lungi, mașina, imprimanta), A.9 (jobul și
  fila), A.10 (fluxurile), A.11 (troubleshooting).
- **Alegeri față de schițe (rămase așa după A.7):** schimbarea planului a rămas un formular cu „Salvează planul” (nu butoane
  cu un clic); felul intrării unui om vine din `sursa` documentului (metodele legate mai târziu din fila Cont ar cere o
  citire din Auth, pe server, deci un ADR al liniei).

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
  calea `/sugestii`); sugestiile din `beforeEach`-ul bancului vizual au id-uri de 21 de caractere, refuzate de server;
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
  `testDir` e relativ la config).;
- **un rând de audit se caută cu egalitate pe un singur câmp** (`tinta`), fără `orderBy`: indexul simplu ajunge, ordinea se
  face în pagină (istoricul Setărilor, în A.6, la fel);
- o invitație pusă direct în bază într-o probă cere id-ul serverului (sha256 al adresei), altfel anularea e refuzată; iar
  ordinea oamenilor depinde de uid-ul owner-ului probei (fără adresă în document): rândul lui se caută după insigna fixă;
- **capturile unei file se fac înaintea otrăvurilor:** așezarea (pragurile de lățime, textele tăiate) se vede doar acolo, iar
  reparațiile ei cer probe și otrăvuri de așezare;
- un `select` controlat a cărui valoare nu mai e între opțiuni arată prima opțiune, dar starea rămâne cea veche: formularul
  unui rând care își schimbă opțiunile pornește din nou cu `key` pe ce le hotărăște.
- **o regulă de așezare pentru „îngust” se alege după lățimea secțiunii (container), măsurată pe mai multe lățimi**, nu după
  ecran: lângă o coloană lipită, aceeași pistă e mai îngustă la 1 440 px decât fără ea la 1 024 px. Lățimea dintr-un
  `@container` e a conținutului (fără umplutură): la 1 024 px, secțiunea cronologiei are 716 px înăuntru;
- o probă a unui panou lipit (`sticky`) cere înălțimea lui cel mult cât ecranul și locul lui după derulare, nu capătul de jos
  la începutul paginii (panoul începe sub cifre);
- în baza otrăvurilor de pe emulatoare, prima probă a unei rulări Playwright poate pierde focusul (`toBeFocused`: „inactive”)
  imediat după fereastra de login; reluată, trece. Nu e a feliei: se reia baza, nu se schimbă proba.
