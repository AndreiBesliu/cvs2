# Biblioteca extensiilor (3.Xg, 3.Xh, 3.Xi)

## 3.Xi: stările de lângă drumul bun (gata, neunită, în cloud)

_Aceeași linie și aceeași ramură (`wip/3.Xh-biblioteca-ui`, adusă la `main` `df9ae53` pe 24.11, fără ciocniri: ramura era
toată în `main`). Starea: **ADR 0232 acceptat pe 24.11 („am raspuns”: 1a, 2a, 3a, 4a, 5a, fără note) și implementat în aceeași zi: 3.Xi-1 (stările
rupte), 3.Xi-2 (claritatea), 3.Xi-3 (descoperirea). PR-ul `AndreiBesliu/cvs2#17`, de unit de sesiunea principală, după
completul verde. Pachetele nu s-au schimbat: Easy 3Draw e 18.22.0 (din 3.Ts, venit cu `main`), deci următoarea versiune e 18.23.0.**_

Cererea owner-ului (23.11, după unirea lui 3.Xh): „vreau sa faci un audit si sa imi spui ce ai imbunatatie la UI/UX-ul
functiei de extensii”. La auditul cu 14 constatări și la oferta „fac din ele ADR 0232 propus, cu schița, împărțit pe
felii”: „ok” (24.11).

- **Auditul (23.11, fără cod de produs):** aplicația construită, parcursă cu Playwright: aproape 40 de capturi (birou,
  telefon, tema întunecată, engleză) și măsurători. Cele 14 constatări și ce merge bine sunt în ADR 0232, „Ce e azi”.
- **ADR 0232 propus (24.11):** trei felii: 3.Xi-1 stările rupte (starea „n-a pornit” cu trei ieșiri, actualizarea cu
  redeschidere, extensia ținută minte la reîncărcare, fereastra refuzului, „Rămân” principal); 3.Xi-2 claritate (fraza
  izolării și ordinea permisiunilor, filele, lipsa internetului, extensia deschisă în meniu, fila ei, măruntele); 3.Xi-3
  descoperire (captura mărită, `.zip`-ul pe planșă, paleta, „ce e nou” la actualizare cu data, punctul versiunii noi).
  Pornirea +0 (mai sunt 0,6 kB până la plafon), totalul estimat +5 kB din 900.
- **Schița:** <https://claude.ai/artifact/31cWBjVheUbymkfErCmcSy> (privată, a owner-ului): fiecare constatare cu
  captura de azi și macheta propusă; formularul în baza ei, colecția `raspunsuri`, documentul `owner` (`q1`–`q5`, notele
  `q1n`–`q5n`, `text`, `la`). La publicare, colecția era goală.
- **Întrebările** (recomandarea e „a” la toate): 1 vestea despre o versiune nouă (punctul din ce se știe deja, fără
  cerere la pornire); 2 câte extensii stau deschise deodată (una); 3 reîncărcarea paginii (redeschide extensia); 4 un
  `.zip` de extensie lăsat pe planșă (confirmarea instalării); 5 cât facem (toate trei feliile).
- **24.11: rapidul verde pe propunere** (`bc9da1c`, PR-ul ciornă `AndreiBesliu/cvs2#17`); apoi `main` adus (`fafb95e`:
  25.8↑b), la vestea de ciocnire de pe PR: doar DEVLOG-ul, rezolvat cu `scripts/rezolva-devlog.py`. Ramura n-are cod al ei:
  codul e al lui `main`.
- **24.11, răspunsurile owner-ului: „am raspuns”** (formularul: 1a, 2a, 3a, 4a, 5a, fără note): punctul versiunii noi din ce
  se știe deja; o singură extensie deschisă; extensia redeschisă la reîncărcare; `.zip`-ul pe planșă deschide confirmarea;
  toate cele trei felii, în ordine.
- **Uneltele auditului** stau în `.tmp/audit-extensii/` (ignorat): `audit.mjs` (grupele A–D: drumul întreg, actualizările,
  catalogul oprit sau stricat, telefonul, tema, engleza; `AUDIT_OUT`, `AUDIT_DOAR`, `AUDIT_SCARA`), `audit2.mjs`
  (contrastul prin pânză, tastatura, pornirea eșuată, țintele pe telefon), `audit3.mjs` (reîncărcarea, `.zip`-ul lăsat pe
  planșă, paleta). Rulează pe `vite preview` (4173), cu Chrome.

**Ce s-a făcut (24.11), pe scurt** (amănuntele, în ADR 0232, „Implementat”):
- **3.Xi-1** (`db4e087` … `b4a283d`): starea „n-a pornit” / „pornește greu” (`StarePornire.tsx`), versiunea nouă peste
  extensia deschisă (`inainteDeInlocuire`, `dupaInlocuire`), extensia ținută minte (`tinuta.ts`), fereastra refuzului
  (`motivText.ts`), „Rămân” principal. Otrăvurile 55 / 56.
- **3.Xi-2** (`8ab8dfb`, `e7eac72`): ordinea permisiunilor (`dupaSensibilitate`), filele, biblioteca fără catalog, meniul
  cu extensia deschisă, fila ei, focusul și Escape în fereastra bibliotecii. Otrăvurile 41 / 43.
- **3.Xi-3** (`690f4da`): captura mărită (`CapturaMarita.tsx`), `.zip`-ul lăsat pe planșă, paleta și punctul
  (`descoperire.ts`, `noi.ts`), `data` în „ce e nou”, „Scoate” lângă „Actualizează la …”. Otrăvurile 60 / 60 (`8b36ba8`; la prima rulare, 54 din 62).
- **Mărimea:** pornirea neschimbată, totalul +3,8 kB (804,7 → 808,5). După aducerea lui `main` (`f536a4c`, cu plafonul
  pornirii 120 kB, ADR 0145): pornirea 109,9 kB (cu ușa 114,4; cu Atelierul 114,7 / 120), totalul 809,9 / 900.
- **`main` adus pe 24.11** (`98a76e7`): ciocnirea, doar în catalogul controalelor (scris din nou); rândul 18.22.0 al lui
  Easy 3Draw a primit `data`.

**Reguli rămase de la 3.Xi:**
- **Un buton care dispare după clic lasă focusul pe pagină** (`body`): o fereastră cu astfel de
  butoane („Instalează” devine „Deschide”, „Reîncearcă” dispare, „Actualizează” din rândul meniului) își întoarce singură
  focusul și își închide Escape și de pe pagină. Proba: după clic, `toBeFocused()` pe ce urmează, apoi Escape.
- **O permisiune nouă a catalogului își cere locul** în `ORDINE_SENSIBILITATE` (`src/extensii/pachet.ts`):
  `extensii.permisiuni.test.ts` cade până atunci.
- **Paleta și gazda extensiilor nu se importă una pe alta** (doar tipul cererii, `import type`): vorbesc prin evenimentul
  `cncvs2-extensii` de pe `window`, cu numele scris în amândouă. Un import adevărat ar lega bucățile și ar atinge pornirea.
- **O probă care așteaptă o stare după o cerere de rețea oprită numără cererile** (`expect.poll` pe contor), apoi se uită:
  altfel judecă starea de dinaintea răspunsului (otrava B04).
- **O probă veche care înșiră gesturile unei pagini le fixează:** `['Actualizează la …', 'Deschide']` ținea ascuns că
  lipsea „Scoate”. Când o listă pare scurtă, întreabă de ce.
- **În container, e2e-ul merge și pe al doilea port**, cât o rulare de otrăvuri ține 4173: `.tmp/pw2.config.ts` (copia lui
  `pw.config.ts` cu 4174 și `npx vite preview --port 4174 --strictPort`). Cu patru procesoare, două rulări deodată țin.
- **`data` din „ce e nou”** e la alegere; rândul nou al unei versiuni (regula din 3.Xh) o poate primi, ca `"data":
  "2026-11-24"`.

**Capcane găsite la audit:**
- **O extensie „stricată” se face împachetând un dosar al ei** (`impacheteaza(<dosar>)`, cu o intrare care aruncă în
  `deschide`): un pachet bun cu un fișier schimbat de mână e refuzat la instalare de amprenta SHA-256 a fișierului, deci
  nu ajunge niciodată la pornire.
- **Contrastul se măsoară pictând culoarea pe o pânză** (`fillStyle`, apoi `getImageData`), cu alfa amestecat peste
  fondul adevărat: jetoanele sunt `oklab(...)`. Măsurat așa: subtextele 6,1 : 1, linkurile 5,4 : 1, butonul principal
  5,7 : 1 (tema luminoasă); 6,1, 7,2 și 8,9 (cea întunecată).
- **Un traseu ținut cu `page.route` trebuie eliberat înaintea lui `unroute`** (`route.continue().catch(() => {})`),
  altfel scriptul cade cu „Route is already handled”.
- **Scheletul bibliotecii și „Pornesc extensia…” nu se prind pe captură** fără întârziere pusă anume: catalogul vine pe
  loc, iar Easy 3Draw pornește în 0,2 s.

## 3.Xh: interfața nouă a bibliotecii (în lucru, în cloud)

_Linia „biblioteca”, din 23.11.2026 într-o sesiune cloud: ramura `wip/3.Xh-biblioteca-ui` (din `main` `8f122eb6`, adusă la
`8177ab8` pe 23.11), ADR-urile 0231–0239, canalul `biblioteca`
(<https://cncvectorstudio-test--biblioteca-gw7dr9bc.web.app>; gazda lui e permisă în mediul „CNC VS 2” din 23.11). Starea:
**ADR 0231 ACCEPTAT („Da, 1a–4a”) și IMPLEMENTAT; 3.Xh, cu cele patru felii ale ei, GATA pe 23.11, de unit de sesiunea
principală: PR-ul `AndreiBesliu/cvs2#4`.**_

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
- **23.11, 3.Xh-2 (ferestrele), gata** (`5578eaa`, apoi commit-ul documentelor): o singură fereastră de confirmare
  (semnul și numele extensiei în cap, de unde vine, „Ce poate face” ca listă, ce cere în plus întâi), 34rem pentru toate
  ferestrele extensiilor; „Scoate” întreabă întâi și spune ce se pierde; mesajele pe înțeles (catalogul stricat,
  descărcarea, mărimile prin `src/extensii/marime.ts`); țintele cât `--tinta` la atingere și la densitatea mare; o
  fereastră înaltă rămâne sus, cu butoanele lipite jos. Totalul 762,7 / 800 kB (+0,7). Otrăvurile: 40 / 40 (12 unitare, 28 prin e2e), în clonă; la prima rulare 38 / 42: două probe întărite (regexul lui „să …”, roșul butonului citit cu mausul peste el), o derulare pusă la zero, de prisos lângă butoanele lipite jos, scoasă cu otrava ei, și o otravă a manualului pe care proba lui n-o poate vedea, scoasă.
  Completul din CI pe 3.Xh-1 (`8b608bb`): verde.
- **23.11, 3.Xh-3 (fereastra bibliotecii), gata** (`5831218`, `7628b50`, `b864e6c`, apoi commit-ul documentelor):
  `src/extensii/Biblioteca.tsx` (lista „Toate” / „Instalate”, pagina extensiei cu capturile, descrierea, „Ce poate face”,
  „Ce e nou” și gestul ei), `src/extensii/parti.tsx` (cutia unei ferestre, „Ce poate face”, întrebarea de la „Scoate”);
  meniul scurtat, cu „Actualizează” în rândul extensiei și lățimea fixă; linkul `#biblioteca=<id>` pe pagina extensiei;
  `extensii.biblioteca` în paletă și grupul „Extensii” al paletei. Fereastra „Extensiile tale” a plecat. Pornirea +0,1 kB
  (acțiunea paletei), totalul 764,4 / 800 kB (+1,7). Otrăvurile: 57 / 57 (4 unitare, 53 prin e2e), în clonă; la prima rulare 55 / 57: „meniul nu sare” s-a dovedit prea blândă (cu un nume lung de extensie, meniul creștea cu 19 px când apărea „Actualizează”: proba făcută mai aspră, numele ținut pe un rând) și un cod de prisos, scos cu otrava lui.
- **Unde stau acum lucrurile** (pentru o linie care atinge extensiile): fereastra bibliotecii și confirmările sunt în aceeași
  bucată la cerere (`Instalare.tsx` le alege după `cerere.fel`); catalogul îl cere gazda (`Extensii.tsx`,
  `incarcaBiblioteca`), la deschiderea meniului sau a ferestrei, și îl dă ferestrei; ajutoarele probelor e2e sunt în
  `test/e2e/ajutor-biblioteca.ts` (`deschideBiblioteca`, `paginaDinCatalog`, `paginaInstalatei`).
- **23.11, 3.Xh-4 (tastatura), gata** (`19f180f`, apoi commit-ul documentelor): focusul pe fila aleasă la deschidere, ← și →
  între file, ↑ și ↓ între rândurile listei, Enter deschide pagina; doar fila aleasă și rândul arătat în ordinea lui Tab;
  la 1024 și 1280 px, cu fontul lat, meniul și fereastra încap. Totalul 764,6 / 800 kB (+0,2). Otrăvurile: 10 / 10.
- **Toată felia 3.Xh:** pornirea +0,1 kB, totalul 760,9 → 764,6 / 800 kB; otrăvurile, 152 / 152 (45, 40, 57, 10). **De
  spus la unire** (în `CLAUDE.md` scrie sesiunea principală): regula lui „ce e nou” de mai jos; fondul semnului lui Easy
  3Draw, gri-albăstrui în loc de crem, încă de hotărât de owner; proba cu Edge e doar în CI.
- **`main` adus în ramură la încheiere** (`c010e3d`: 11.3↑e și A.4): o singură ciocnire, în DEVLOG, rezolvată cu
  `scripts/rezolva-devlog.py`. Pe arborele unit: pornirea 108,0 kB (cu ușa 112,4 / 115), totalul 766,9 / 800 kB, `/admin`
  124,1 / 200; e2e-ul extensiilor, 61 / 61.
- **23.11, seara: `main` adus a doua oară** (`6f85243`, cu 3.Tr și reparația probelor atelierului), fiindcă PR-ul avea
  ciocniri: cât rula completul, linia elicelor luase pentru elicea de barcă tot 18.20.0. Partea bibliotecii e acum
  **Easy 3Draw 18.21.0** (semnul în pachet); 18.20.0 are rândul ei de „ce e nou”. Ciocnirile: `extensie.json`,
  `extensii/biblioteca.json`, `trenulet.spec.ts` (confirmarea nouă, cu versiunea nouă), jurnalul fișei și registrul
  otrăvurilor (rândurile ambelor părți, după cheie). Capturile din bibliotecă nu s-au schimbat (nu arată fila Elice).
- **23.11, seara: `main` adus a treia oară** (`d6fd5d6`: 25.8↑a, A.5 și reparația probelor extensiilor,
  `clicCareInchideCadrul`). Ciocnirile: importurile din `extensii.spec.ts` (ambele părți) și numărul ușilor din
  `manual.test.ts` (**113**: fiecare parte adusese câte una peste 111). Pe arborele unit: pornirea 108,6 kB (cu ușa
  113,1 / 115), totalul 773,8 / 800 kB, `/admin` 125,6 / 200; e2e-ul extensiilor și al pluginului, 105 / 105. **Cât PR-ul
  așteaptă unirea, `main` se aduce la fiecare veste de ciocnire** (vestea vine pe PR), iar completul se pornește din nou.
- **23.11, seara: `main` adus a patra oară** (`c8b235a`: 11.3↑f), ciocnirea doar în DEVLOG. Pe arborele unit: pornirea
  108,6 kB (cu ușa 113,1 / 115), totalul 774,6 / 800 kB. **O ciocnire doar în DEVLOG, venită cât rulează completul
  capătului, așteaptă sfârșitul lui** (completul ține un ceas, iar `main` primește o unire cam la jumătate de oră); una
  în cod sau în probe se aduce pe loc.
- **23.11, seara: completul cu Edge, verde pe capăt** (`18c4941`, și pe `8b443ac`, `79fbef5` și pe fiecare sub-felie).
  Apoi `main` adus a cincea oară (`ee4f629`: A.6, doar `src/admin/`; ciocnirea doar în DEVLOG, așteptată până la sfârșitul
  completului). Pe arborele unit: pornirea 108,6 kB (cu ușa 113,1 / 115), totalul 774,7 / 800 kB, `/admin` 127,5 / 200.
  **PR-ul `AndreiBesliu/cvs2#4` e „gata de unit”**; o ciocnire nouă în DEVLOG, până la unire, se rezolvă la unire cu
  `scripts/rezolva-devlog.py` (sau o aduc eu, la veste).
- **Ce n-a intrat** (la cuvântul owner-ului): căutarea și categoriile (la peste ~20 de extensii), o captură mărită la clic,
  „ce e nou” în fereastra de confirmare a unei actualizări.

**Regula nouă pentru toate liniile care schimbă o extensie din bibliotecă (răspunsul 3a):**
1. versiunea nouă în `extensii/<dosar>/extensie.json`;
2. rândul ei de „ce e nou”, **primul** din `noutati`, la extensia ei din `extensii/biblioteca.json`:
   `{ "versiune": "<versiunea>", "ro": "…", "en": "…" }` (cel mult 240 de caractere fiecare; versiunile, strict
   descrescător);
3. `node scripts/biblioteca.ts --scrie` (refuză fără rândul de la 2);
4. proba `test/unit/biblioteca.constructie.test.ts` cade până atunci, cu rândul de scris în mesaj.
5. **dacă `main` aduce între timp aceeași versiune de la altă linie** (pe 23.11: 3.Tr luase 18.20.0, ca 3.Xh-1), linia
   unită a doua își ia versiunea următoare la aducerea lui `main`: versiunea din `extensie.json`, rândul ei de „ce e nou”
   deasupra celui venit din `main` (care rămâne, cu textul lui), numele pachetului din probele e2e
   (`trenulet.spec.ts`: `ZIP`, cele două rânduri „din fișierul…”), apoi `node scripts/biblioteca.ts --scrie`. Lista din
   `extensii/biblioteca.json` poate avea mai mult de cinci rânduri: în catalog ajung ultimele cinci.

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
- **`autoFocus` pe butonul de jos derulează o fereastră înaltă la capăt:** pe un telefon, confirmarea se deschidea cu numele
  extensiei și avertismentul ascunse sus. Butoanele sunt acum `position: sticky`, lipite jos: un buton deja la vedere nu mai
  derulează nimic la focus. (O derulare pusă la zero după montare, scrisă întâi, s-a dovedit de prisos: otrava ei a scăpat
  și a plecat cu codul.) S-a văzut doar pe captura de 320 px; proba cere acum titlul și butonul pe ecran.
- **Culoarea unui buton se citește cu mausul dat la o parte:** după un clic, mausul rămâne pe loc, iar butonul apărut sub
  el e în starea „hover” (alt fond). Proba roșului de la „Scoate” compara două butoane și trecea din întâmplare; acum mută
  mausul și compară cu `var(--rosu)` calculat pe un element martor.
- **`\b` nu vede marginea de după „ă”** (fără `u`, `\w` e doar ASCII): `/^(să|to)\b/` nu prindea „să încarce”. Otrava T01 a
  scăpat din cauza asta; proba folosește `\s`.
- **Proba manualului caută numele unui control fără majuscule, în tot capitolul:** un nume ca „Păstrează” trece și dacă
  rândul lui a dispărut, fiindcă „păstrează” apare în altă frază. Otrava care îl scotea din manual a scăpat și a fost scoasă
  din listă; controlul rămâne păzit de lista din probă (`CONTROALE_EXTENSII`).
- **Un meniu rămas deschis acoperă fereastra, în probă:** un fișier pus direct în câmpul lui (`setInputFiles`) nu închide
  meniul, cum îl închide alegerea din el. Probele îl închid întâi cu Escape.
- **Paleta arată doar acțiunile grupurilor ei** (`GRUPURI` din `src/ui/Paleta.tsx`, după prefixul id-ului): o acțiune cu
  un prefix nou nu apare deloc, fără nicio eroare. Așa lipsea din paletă „Trimite la extensie” (ADR 0166), deși registrul o
  avea. Un prefix nou cere grupul lui.
- **Focusul dat unui buton din aplicație cât ea e inertă nu se prinde:** la închiderea unei ferestre, întâi `onModal(false)`
  (în aceeași randare), apoi focusul, într-un `setTimeout` (ca la „Rămân”).
- **O regulă de bază scrisă mai jos în foaie o bate pe cea de la atingere** scrisă mai sus, la aceeași specificitate: filele
  bibliotecii rămâneau de 36 px pe telefon până când regula de la atingere a primit `.dialog-biblioteca` în față.
- **Proba de încăpere judecă zonele care se derulează în fereastră**, nu doar cutia ei: un nume lung de fișier împingea
  pagina extensiei în lateral (zona paginii se derula, cutia nu), iar proba veche nu vedea. Un text tăiat anume cu „…” nu
  e o derulare.
- **Probele de mutație prin e2e și capturile folosesc același port (4173):** capturile se fac după ce clona a terminat.
- **Otrăvurile vecine:** după 3.Xh-3, cele al căror cod s-a mutat în fereastra nouă au urmașe în `3.Xh-3.py` și au plecat
  din listele lor (3.Xb E03–E04; 3.Xg E01–E03, E06, E10, E12; 3.Xh-1 U03–U05; 3.Xh-2, 17). După 3.Xh-2, trei s-au golit și au fost mutate pe codul nou (3.Xb E03 și E04, 3.Xh-1 N01). După felie, `verifica` pe 3.Xa–3.Xg dă aceleași VOID-uri ca pe `main` (3.Xa: E02–E07; 3.Xb: K01;
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
