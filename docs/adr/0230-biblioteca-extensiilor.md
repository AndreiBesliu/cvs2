# ADR 0230 — Biblioteca extensiilor: Easy 3Draw instalat și actualizat dintr-un clic

**Starea:** propus pe 07.11.2026 pentru felia 3.Xg, a liniei gazdei extensiilor (după 3.Xa–3.Xf), în worktree-ul `biblioteca`
(ramura `wip/3.Xg-biblioteca`); **acceptat în aceeași zi, cu recomandările: „Da, 1a–7a”**. Cererea owner-ului: „Vreau ca
plugin-ul nostru sa fie disponibil printr-o librarie. Fa asta intr-un worktree”. **Continuă:** ADR 0127 (pachetul, instalarea,
cadrul izolat), ADR 0128 (permisiunile, arătate la instalare), ADR 0129 și 0167 (Easy 3Draw: construcția pachetului, id-ul
`trenulet`), ADR 0137 (plafonul). Nu schimbă nimic din ele: adaugă a patra cale de instalare, lângă fișier, adresă și link.
**Schița:** <https://claude.ai/artifact/GJgA4hRePmXFNPNNaQux3n> (șase planșe: meniul cu biblioteca, în cinci stări și în
ambele limbi; instalarea; actualizarea; drumul unei versiuni noi; încrederea și mărimea; întrebările, cu formularul, care scrie
în colecția `raspunsuri`, documentul `owner`).

## Problema

Azi, Easy 3Draw ajunge la om doar ca fișier: owner-ul îl construiește (`node scripts/construieste-trenulet.ts`), îl trimite
(`trenulet-18.7.1.zip`, 417 748 de octeți), iar omul îl instalează din fișier, de la o adresă HTTPS sau prin linkul
`#instaleaza=`. Lipsesc trei lucruri:
- **o adresă a noastră** de pe care să vină pachetul: instalarea de la o adresă cere o gazdă cu CORS, pe care n-o avem;
- **versiunea nouă, văzută:** omul nu află că a ieșit una, iar owner-ul o trimite din nou, de mână;
- **legătura cu ce s-a probat:** un fișier trimis poate veni din orice arbore, nu neapărat din commit-ul publicat pe test.

Decizia din 02.11 rămâne: Easy 3Draw nu face parte din aplicație („nu vreau sa fie prezent in softul vanilla, vreau sa fie
instalat din link. sau dintr-un zip”). Biblioteca e o listă din care omul îl instalează, când vrea; până atunci, aplicația
nu-l descarcă și nu-l rulează.

## Ce am aflat (cercetarea din 07.11)

- **Gazda de azi** (`src/extensii/`): `citestePachet` judecă un `.zip` (manifestul, căile, amprenta SHA-256 a fiecărui fișier,
  limitele); `Instalare.tsx` arată numele, versiunea, sursa, fișierele, permisiunile și versiunea înlocuită, apoi scrie în
  IndexedDB. Același id instalat din nou ia locul celui vechi și îi păstrează datele (ADR 0128 §B); o extensie deschisă se
  închide întâi fără pierderi (ADR 0164 §C). Sursa ținută e doar `fisier` sau `adresa`, iar versiunile nu se compară nicăieri.
- **Construcția e deja deterministă:** `construieste-trenulet.ts`, rulat de două ori, dă același `.zip` (măsurat: 417 748 de
  octeți, 15 fișiere, SHA-256 `7542bdac…`, ~0,9 s cu tot cu pornirea lui Node 26). Scriitorul ZIP nu pune date, iar deflate-ul
  e al lui Node, 26 și local, și în CI. Poarta `build-determinist` (273 de fișiere identice în două build-uri, la `8003cb2`)
  l-ar ține la fel în `dist/`.
- **Publicarea:** live primește doar un commit publicat întreg pe test (ADR 0044, `verifica-test.ts`). Cu build-ul
  determinist, ce ajunge pe live e octet cu octet ce s-a probat pe test.
- **Hosting și CSP:** nicio rescriere generală (un fișier lipsă e 404, nu `index.html`); `connect-src 'self'` permite deja
  un catalog și pachete de pe aceeași origine, fără CORS și fără vreo schimbare a CSP-ului; workerul PWA lasă în rețea tot ce
  nu e în precache.
- **Precache-ul** (`shared/precache.ts`): un fel nou de fișier în `dist/` trebuie clasat acolo, altfel poarta pică.
- **GitHub Releases:** fișierul unei versiuni se descarcă printr-o redirecționare spre o gazdă care nu trimite
  `Access-Control-Allow-Origin`, deci browserul nu-l poate citi; ar trebui un releu (o funcție sau un proxy). API-ul GitHub
  are CORS, dar 60 de cereri pe oră pe adresă IP, fără cont.
- **Cifrele, măsurate aici, la `8003cb2`:** pornirea 101,5 (cu ușa 105,1 / 110 kB), totalul 519,5 / 550, `/admin` 105,4 /
  200; bucățile gazdei: `Extensii` 4,3 kB, `Instalare` 4,0 kB, `cadru` 4,7 kB (gzip 9).

## Decizia (acceptată: recomandările, 1a–7a)

### A. Locul: biblioteca stă lângă aplicație, construită din repo (întrebarea 1)

- `extensii/biblioteca.json` (în repo) spune ce intră în bibliotecă: pentru fiecare extensie, dosarul ei, descrierea scurtă
  în română și în engleză (cel mult 160 de caractere) și amprenta conținutului versiunii de acum (§B). Acum, doar Easy 3Draw;
  extensia de probă `salut` rămâne a probelor.
- La fiecare build, un plugin Vite (ca documentația, ADR 0048) construiește pachetele (Easy 3Draw cu `pachetTrenulet()`,
  altele cu `impacheteaza()`) și scrie în `dist/extensii/`:
  - `<id>-<versiune>-<primele 8 cifre ale amprentei>.zip`: numele se schimbă odată cu octeții, deci o adresă nu-și schimbă
    niciodată conținutul (nicio copie veche din cache sub același nume);
  - `catalog.json`: `{ format: "cvs2-biblioteca", schema: 1, extensii: [...] }`, câte un rând pe extensie: `id`, `nume`,
    `versiune`, `api`, `permisiuni` (luate din manifestul pachetului, nu scrise de mână), `descriere` (`ro`, `en`), `pachet`
    (numele fișierului), `octeti` și `sha256` (al `.zip`-ului).
- **Hosting:** `catalog.json` cu `Cache-Control: no-cache` (un 304 când nu s-a schimbat); pachetele cu `immutable`.
- **Precache:** `extensii/` e un motiv nou, `biblioteca`, în afara lui: pachetul ajunge doar la cine îl instalează (în
  IndexedDB, ca azi), nu pe discul fiecărui om.
- Codul aplicației tot nu importă nimic din `extensii/` (regula `cvs2-fara-extensii`): construcția stă în `scripts/` și în
  configurarea build-ului.

### B. O versiune nouă: din repo, prin publicare (întrebările 1 și 6)

- O versiune nouă a pluginului e un commit: sursele schimbate și `versiune` ridicată în `extensii/trenulet/extensie.json`,
  ca până acum. Biblioteca o arată pe instanța pe care se publică aplicația din commit-ul acela: întâi pe test (sau pe un
  canal), apoi pe live, cu aprobarea owner-ului: același commit, aceiași octeți.
- **Un conținut nou cere o versiune nouă**, cerută de o probă, nu ținută minte. Amprenta conținutului (SHA-256 al
  manifestului, care are amprenta fiecărui fișier, deci nu depinde de compresie) stă în `extensii/biblioteca.json`, lângă
  versiune. Un pachet cu alt conținut și aceeași versiune face proba să pice, cu pasul de urmat: versiunea ridicată, apoi
  `node scripts/biblioteca.ts --scrie`. Fără ea, omul cu versiunea veche ar vedea „Instalată” și n-ar primi schimbarea.
- **Instanța (răspunsul 6a):** Easy 3Draw ajunge pe live odată cu aplicația, când owner-ul o publică acolo; pe live, mașina
  rămâne oprită pentru extensii (ADR 0160). Un semn „doar pe test” în catalog nu se face acum: nicio extensie nu-l cere.
- Biblioteca are o singură versiune pe extensie, cea a commit-ului publicat. O versiune mai veche se întoarce publicând un
  commit mai vechi.

### C. Încrederea: amprenta, înaintea citirii; o singură sursă (întrebarea 5)

- Catalogul vine doar de la originea aplicației (`/extensii/catalog.json`); omul nu poate adăuga alte biblioteci.
- **„Instalează” și „Actualizează”:**
  1. descarcă pachetul de la `/extensii/<pachet>`, oprit peste `octeti` din catalog (nu doar peste 16 MB);
  2. SHA-256 pe octeții descărcați, egal cu `sha256` din catalog, **înainte de orice citire a `.zip`-ului**;
  3. judecata de azi (`citestePachet`: manifestul, amprenta fiecărui fișier, limitele);
  4. id-ul, numele, versiunea și permisiunile manifestului, egale cu ale rândului din catalog;
  5. abia apoi scrierea.

  Orice nepotrivire: refuzul, cu motivul (`amprenta-biblioteca`: „pachetul descărcat nu e cel din bibliotecă”;
  `biblioteca-nepotrivita`), fără nicio scriere, și o eroare în jurnal: e un defect al publicării, nu al omului.
- **Ce dovedește amprenta:** că pachetul e cel construit împreună cu catalogul, nu o descărcare ruptă, o copie veche sau alt
  fișier pus în locul lui pe drum. Nu apără de o gazdă compromisă: acolo stă și aplicația însăși, deci o semnătură n-ar adăuga
  nimic cât biblioteca e pe aceeași origine (ADR 0127, „Ce am respins”). Semnăturile se redeschid odată cu o bibliotecă de la
  altcineva.
- **Sursa ținută:** `{ fel: 'biblioteca', sha256 }`; gestionarea scrie „din biblioteca cvs2”.
- **Fișierul și adresa rămân** (decizia din 02.11), pentru un pachet de probă sau unul trimis de mână; fereastra lor spune
  „din afara bibliotecii”. **Linkul `#biblioteca=<id>`** (nou; de exemplu `…/#biblioteca=trenulet`) deschide fereastra
  rândului din bibliotecă, ca linkul de instalare de azi: nimic nu se descarcă fără clic.

### D. Interfața (întrebările 2, 3, 4 și 7)

- **Meniul Extensii** (piesa de puzzle de lângă marcă), sub cele instalate și deasupra rândurilor de instalare: secțiunea
  **Biblioteca**. Fiecare extensie: numele, versiunea, descrierea (în limba aplicației), ce cere pe scurt și mărimea, cu:
  - **Instalează** (neinstalată): fereastra instalării de azi, cu „din biblioteca cvs2, amprenta verificată” în locul sursei,
    mărimea și ce cere, pe larg; **Instalează** descarcă, verifică și scrie, iar fereastra se încheie cu **Deschide** (și
    **Închide**);
  - **Actualizează la 18.8.0** (instalată, mai veche): un clic, dacă versiunea nouă nu cere nimic în plus; altfel fereastra,
    cu ce cere în plus întâi („Versiunea nouă cere și: …”). Datele rămân (același id); o extensie deschisă se închide întâi
    fără pierderi;
  - **Instalată** (aceeași versiune), fără buton; o versiune instalată mai nouă decât a bibliotecii (un pachet de probă):
    „Instalată: 18.8.0”, fără buton. Biblioteca nu coboară versiunea: datele unei extensii merg înainte, nu înapoi;
  - un rând care cere ce nu știe fila de acum (o permisiune nouă, alt `api`: o filă rămasă pe o versiune veche a
    aplicației, cu un catalog nou): „Reîncarcă aplicația ca s-o instalezi”, fără buton.

  În lista de sus, o extensie instalată (din bibliotecă sau din fișier), cu o versiune mai nouă în bibliotecă, are lângă nume
  „actualizare: 18.8.0”.
- **Când se cere catalogul:** la fiecare deschidere a meniului, fără să-l țină pe loc. Cele instalate apar imediat (din
  IndexedDB, ca la meniul contului, ADR 0120), iar biblioteca se completează când sosește catalogul („Se încarcă
  biblioteca…”). Nicio cerere la pornirea aplicației.
- **Fără rețea:** secțiunea spune „Biblioteca are nevoie de internet” și are **Reîncearcă**; extensiile instalate merg ca azi.
- **Versiunile** se compară pe numere (`18.10.0` e mai nouă decât `18.9.1`); una care nu e de forma asta e doar „alta”.
- **Engleza:** textele noi prin `t()` (carcasa, în ambele limbi), descrierea din catalog în limba aplicației, numele netradus
  (ADR 0167). **Manualul**, capitolul „Extensiile”, în ambele limbi: biblioteca, **Instalează**, **Actualizează**,
  **Deschide**, **Reîncearcă** și linkul `#biblioteca=`; proba controalelor `data-extensii` le cere pe toate.

### E. Mărimea

- **Pornirea:** neschimbată; biblioteca stă în bucata `Extensii` (adusă după prima randare) și în `Instalare` (la cerere).
- **JavaScript:** ~2–3 kB gzip în plus (catalogul și judecata lui, secțiunea din meniu, instalarea din bibliotecă cu
  amprenta): totalul ~519,5 → ~522 / 550 kB. Textele sunt date (`mesaje/carcasa.json`), în afara plafonului. (Măsurat la
  cod: +3,5 kB, §G.)
- **`dist/`** crește cu pachetul (~408 kB) și catalogul (sub 1 kB), în afara plafonului (ADR 0137: „la fel pachetele
  extensiilor”) și a precache-ului. Hosting-ul urcă pachetul doar când i se schimbă octeții.
- **Build-ul:** ~1 s în plus (construcția pachetului), de două ori în poarta determinismului.

### F. Felia

O singură felie, **3.Xg**, în trei treceri: (1) construcția (catalogul, pachetul cu amprenta în nume, proba versiunii,
precache-ul, anteturile); (2) gazda (catalogul judecat, instalarea și actualizarea din bibliotecă, secțiunea din meniu,
linkul, manualul); (3) probele e2e, otrăvurile, canalul `biblioteca`. Estimat ~4 h.

### G. Felia 3.Xg, la cod (07.11)

- **Unde stă:** `shared/biblioteca.ts` (forma catalogului, numele pachetului, comparația versiunilor: ce știu și construcția,
  și aplicația), `src/extensii/biblioteca.ts` (starea rândului, descărcarea, judecata, instalarea), `scripts/biblioteca.ts`
  (construcția și garda versiunilor, cu `--scrie`), pluginul `biblioteca()` din `vite.config.ts` (și în serverul de
  dezvoltare), `extensii/biblioteca.json` (Easy 3Draw 18.7.1, cu amprenta conținutului `4ab5f2ea…`).
- **O descărcare peste mărimea din catalog** se refuză tot cu `amprenta-biblioteca`: octeții n-au cum fi ai pachetului.
- **Linkul, pentru o extensie deja instalată** în aceeași versiune: „… e deja instalată”, cu **Deschide**; un id care nu e în
  bibliotecă: „Extensia „…” nu e în biblioteca acestei instanțe.”
- **Poarta build-ului** citește catalogul din `dist/` ca aplicația, cere ca în `dist/extensii/` să stea exact el și pachetele
  lui, fiecare cu mărimea și amprenta din catalog, și ține biblioteca în afara precache-ului și printr-o a doua plasă, în
  afara predicatului.
- **Mărimea, măsurată:** pornirea neschimbată (101,5, cu ușa 105,1 / 110 kB); totalul 519,5 → 523,0 / 550 kB (+3,5 kB, peste
  estimarea de 2–3 kB): bucata `Extensii` 4,3 → 8,5 kB, fiindcă biblioteca trage după ea și cititorul de pachete, care pleacă
  din `Instalare` (4,0 → 3,4 kB). `Extensii` vine după prima randare, din precache, deci pornirea nu plătește nimic.
  `dist/extensii/`: pachetul 408,0 kB și catalogul 0,8 kB, în afara plafonului și a precache-ului.

## Ce am respins

- **Biblioteca în Storage și Firestore, încărcată din `/admin` (1b):** o versiune nouă ar ieși fără publicarea aplicației,
  dar costă regulile și CORS-ul bucket-ului, o funcție care judecă pachetul pe server, un panou nou în `/admin` (în plafonul
  lui) și câte o încărcare pe fiecare instanță (test și live sunt proiecte separate). Iar pachetul nu mai e legat de
  commit-ul probat: pe live poate ajunge un fișier care n-a trecut pe test.
- **GitHub Releases (1c):** browserul nu poate citi fișierele lor (fără CORS după redirecționare), deci un releu (o funcție
  sau un proxy), plus API-ul cu 60 de cereri pe oră; o versiune ar ieși public înaintea probei pe test.
- **Pachetul în precache:** ~408 kB pe discul fiecărui om, și al celor care nu-l folosesc.
- **Actualizarea fără clic (3c):** o versiune nouă ar intra cât omul lucrează în extensie, fără să vadă ce se schimbă.
- **O verificare la fiecare pornire (4b):** o cerere pentru toți, și pentru cei fără extensii.
- **Mai multe versiuni în bibliotecă, coborârea la una veche:** datele unei extensii merg înainte, nu înapoi.
- **Semnăturile:** vezi §C.

## Limite

- Biblioteca cere internet. Fiecare instanță o are pe a ei (test, live, fiecare canal): un pachet apare doar unde s-a publicat
  aplicația din commit-ul lui.
- O extensie instalată din fișier, cu aceeași versiune ca biblioteca, e „Instalată”, chiar dacă fișierul avea alt conținut (un
  pachet de probă cu numărul refolosit).
- Fără iconițe: rândul are numele și descrierea; semnul lui Easy 3Draw e altă decizie (ADR 0167, „Limite”).

## Se redeschide dacă

- vine o extensie de la altcineva decât owner-ul sau o bibliotecă de pe altă origine (atunci: semnăturile, ADR 0127);
- o versiune a pluginului trebuie să iasă fără publicarea aplicației (atunci: 1b);
- biblioteca are atâtea extensii încât secțiunea din meniu nu le mai cuprinde (atunci: 7b).

## Probele (scrise întâi, la cod)

- **Unitare** (`test/unit/extensii.biblioteca.test.ts`): catalogul judecat (forma, câmpurile, plafoanele, o permisiune
  necunoscută, alt `api`); versiunile; starea rândului (Instalează, Actualizează, Instalată, mai nouă, reîncarcă); ce cere în
  plus; amprenta greșită refuzată înaintea citirii (cititorul ZIP nu e chemat); manifestul nepotrivit cu rândul; plafonul de
  octeți. Construcția: catalogul din `dist/` are amprenta și mărimea `.zip`-ului de lângă el, câmpurile manifestului și numele
  cu amprenta; un conținut schimbat fără versiune nouă pică; `motivPrecache('extensii/…')`.
- **E2e** (`test/e2e/biblioteca.spec.ts`, în Edge): instalarea din bibliotecă (meniul, fereastra, **Deschide**, rândul
  „Instalată”); amprenta greșită (catalogul servit de Playwright, cu `sha256` schimbat): refuzul, nimic scris; actualizarea (un
  pachet ca 18.6.0, cu un circuit salvat, apoi biblioteca: **Actualizează**, un clic, circuitul rămas; o versiune care cere
  ceva nou: fereastra, cu ce cere întâi); fără rețea (secțiunea, **Reîncearcă**); linkul `#biblioteca=trenulet`; engleza.
- **Otrăvurile țintite:** `test/otravuri/3.Xg.py`, rulate dintr-o clonă din afara Drive-ului.

## Întrebările (recomandarea întâi) și răspunsurile

Owner-ul, pe 07.11, în sesiunea liniei: **„Da, 1a–7a”**: toate recomandările.

1. **Unde stă biblioteca?**
   - **a)** lângă aplicație: catalogul și pachetele construite din repo la fiecare build (`/extensii/catalog.json`), cu
     amprenta fiecărui pachet; o versiune nouă ajunge cu publicarea aplicației, întâi pe test, apoi pe live (o felie);
   - b) în Storage și Firestore, încărcată din `/admin`: o versiune nouă fără publicarea aplicației, dar reguli, o funcție care
     judecă pachetul, un panou în `/admin`, câte o încărcare pe instanță, iar pe live poate ajunge un pachet neprobat pe test
     (două felii);
   - c) în GitHub Releases: browserul nu le poate citi fișierele, deci încă un releu (o funcție), iar o versiune iese public
     înaintea probei.
2. **„Instalează” din bibliotecă:**
   - **a)** deschide fereastra de azi (descrierea, mărimea, ce cere extensia, pe larg), iar acolo **Instalează**: două
     clicuri, ca în magazinele de extensii ale browserelor;
   - b) instalează direct, dintr-un clic; ce cere extensia stă scris pe scurt în rândul din bibliotecă.
3. **„Actualizează”:**
   - **a)** dintr-un clic, când versiunea nouă nu cere nimic în plus; fereastra apare doar când cere ceva nou, cu ce cere
     întâi;
   - b) mereu prin fereastră;
   - c) singură, fără clic, când nu cere nimic în plus (ca extensiile din Chrome).
4. **Cum afli că a ieșit o versiune nouă?**
   - **a)** când deschizi meniul Extensii (pe acolo deschizi oricum extensia): rândul ei arată „actualizare: 18.8.0”;
     aplicația nu întreabă nimic la pornire;
   - b) și o dată pe zi, după pornire, doar dacă ai extensii din bibliotecă: un punct pe butonul Extensii.
5. **Instalarea din fișier și de la o adresă:**
   - **a)** rămân, cum ai hotărât pe 02.11, cu „din afara bibliotecii” scris în fereastra lor; plus un link nou, pentru
     Easy 3Draw, `…/#biblioteca=trenulet`, care deschide fereastra lui din bibliotecă;
   - b) rămân ca azi, fără link nou;
   - c) rămân doar biblioteca și fișierul (`.zip`); adresa și linkul `#instaleaza=` ies.
6. **Easy 3Draw pe live:**
   - **a)** odată cu aplicația, când o publici pe live (acolo, mașina rămâne oprită pentru extensii, ca azi);
   - b) doar pe test (și pe canale), până spui tu (`doarTest`).
7. **Unde stă biblioteca în interfață?**
   - **a)** o secțiune „Biblioteca” în meniul Extensii, sub cele instalate;
   - b) o fereastră „Biblioteca extensiilor…”, deschisă din meniu, cu loc pentru descrieri mai lungi și, mai târziu, mai
     multe extensii.
