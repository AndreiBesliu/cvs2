# ADR 0048: Documentația admin: roadmap-ul și documentele generate la build din repo, cu poarta pe tabele; cititorul de markdown comun

**Starea:** acceptat pe 20.10.2026 (propus pe 19.10), odată cu felia „documentația admin” (cererea owner-ului: „daca tot avem admin, sa avem
acolo o sectiune cu un roadmap, un roadmap cu detalii, dar focusat pe vizual” + „si sa fie updatat constant” + „vreau sa
mentinem ideea de documentatie, una live si una admin, pe care o aveam la vechiul cncvs”). **Continuă:** ADR 0040 (pagina
`/admin`, personalul), ADR 0045 (precache-ul: `/admin` doar online), ADR 0042 (pornirea nu crește). Ediția întâi avea
`DocsView` (manualul) și fila admin „Operare” (ghidurile din `docs/*.md`, importate cu `?raw`), cu un singur cititor de
markdown: ideea se păstrează, forma nu.

**Problema.** Starea proiectului stă în fișele etapelor (`docs/etape/`), în `PLAN.md` și în ADR-uri: corectă, dar
citibilă doar ca text, în repo. Owner-ul vrea o imagine (unde suntem pe cele 30 de etape, ce e gata, ce așteaptă de la el)
care să nu rămână în urmă. O listă ținută de mână alături de fișe ar deriva tăcut (ediția întâi a plătit asta de trei ori
într-o zi). Iar documentele trebuie citite în `/admin` fără să umfle pachetul sau precache-ul.

## Decizia

**1. Generate la build, din repo, un singur adevăr.** Pluginul `cncvs2-documentatie` (`vite.config.ts`) cheamă
`scripts/documentatie.ts` la fiecare build (deci la fiecare publicare) și scrie în `dist/documentatie/`:
`roadmap.json` (etapele, feliile, cererile owner-ului, cifrele), `catalog.json` (documentele pe categorii) și
`doc/<calea din repo>` (textul fiecărui document, cu LF). Sursele sunt o listă albă: `PLAN.md`, `CLAUDE.md`, `DEVLOG.md`,
`docs/etape/*.md`, `docs/adr/*.md` (nimic din `docs/faza0/` sau din altă parte; repo-ul e public, deci documentele sunt
deja publice). Determinist: fără ore, în ordinea căilor, CRLF → LF. În dezvoltare, middleware-ul generează la fiecare
cerere. Contractul fișierelor e `shared/documentatie.ts`, comun generatorului și paginii.

**2. Starea se deduce, nu se scrie.**
- O felie e **gata** dacă rândul ei din „Jurnalul feliilor” are `Completed`, **în lucru** dacă are doar `Started` (`—`
  la `Completed`), **de făcut** fără rând. O felie împărțită fără rând propriu (`2.7`) ia starea din sub-felii (`2.7a`–`d`).
- Un rând `N.k↑` din jurnalul etapei M < N e o felie a etapei N **adusă înainte**: stă la etapa N, legată de punctul k din
  `PLAN.md` §5.3, cu jurnalul etapei M.
- O etapă cu fișă e **gata** când toate feliile sunt gata și placa ei e tăiată, altfel **în lucru** (cu „așteaptă placa”
  când doar placa lipsește). Etapa **curentă** e cea mai mare cu fișă; cea de după ea în plan e **următoarea**; restul,
  **viitoare**. O placă e tăiată când fișa ei (`placa-NN.md`) are rândul `**Tăiată:** zz.ll.aaaa` (scris când vin cotele).
- „Ce așteaptă de la tine” = tabelul „Ce îi trebuie owner-ului” din fișele etapelor neîncheiate.

**3. Poarta.** Generarea aruncă `EroareDocumentatie` (fișierul și motivul), iar build-ul pică (deci și nivelul rapid, prin
`scripts/build-determinist.ts`), dacă: lipsește sau nu se citește tabelul din §5.4 (antetul, etapele 1…N în ordine,
tampoanele T1…, săptămânile consecutive) sau §5.3; o fișă n-are titlul „Etapa N — …”, secțiunea „Feliile” (antetul `# |
Felia | …`) sau „Jurnalul feliilor” (antetul exact `# | Started | Completed | Treceri | Nota`); un rând de tabel nu
începe și nu se termină cu `|` (un rând rupt) sau stă în afara unui tabel (un rând gol în mijloc); un id nu are forma unei
felii, se repetă (și o felie adusă, `↑`, în jurnalele a două fișe), e al altei etape fără `↑`; lipsește `Started`; `Treceri` nu e un număr; indexul ADR (`ADR | Rândul |
Decizia | Intră în`) și fișierele `docs/adr/NNNN-*.md` nu se acoperă **în ambele sensuri**; un ADR n-are titlul cu numărul
lui sau rândul `**Starea:**`; un fișier necunoscut stă în `docs/etape/`. Tabelele se citesc cu funcțiile cititorului
(`citesteTabel`, `celule`), deci ce vede poarta e ce vede omul. Poarta a prins, la prima rulare, două defecte reale din
fișa etapei 1 (rândul 1.10 rupt de un heredoc, un rând gol în tabelul feliilor), reparate; jurnalul etapei 2 a primit
rândurile lipsă (2.3c, 2.8a, 2.8b, 2.8-0, 2.8, 2.9, 2.10), din DEVLOG.

**4. Cititorul de markdown, comun (`src/docs/`).** `markdown.ts` (pur: textul → arbore) și `Markdown.tsx` (arborele →
React). Subsetul documentelor reale: titlurile, paragrafele (rândul nou cu două spații, `\` sau `<br>`), listele
(imbricate, ordonate cu start, de bifat), citatele, tabelele GFM cu alinierea, blocurile de cod cu liniile exacte (citite
linie cu linie: un rând gol nu rupe blocul), regula, codul inline, accentul, linkurile. **Fără HTML brut**: React scrie
doar text, nimic `dangerouslySetInnerHTML`; un link e extern doar pe `http(s)` (filă nouă, `noopener noreferrer`), intern
doar relativ sau `#ancoră`; restul (`javascript:`, `data:`, `//gazdă`) pierde linkul. Cine îl folosește spune ce e un link
intern (`legaturi`). Regula de import `docs-izolat` (cu capcana ei) îl ține fără dependențe din aplicație.

**5. Filele din `/admin`.** **Roadmap**: cifrele (etapa curentă, feliile, ADR-urile, plăcile), „Ce așteaptă de la tine”
sus, cronologia celor 33 de săptămâni (o bară pe etapă, colorată după stare și umplută după feliile gata; „acum” pe
etapa curentă; cercul plăcii, triunghiul live-ului, rombul reperelor ca „primul”, „lansarea”), panoul etapei alese
(ținta, ce închide, placa și fișa ei, live, fișa etapei, punctele din §5.3 cu feliile aduse, feliile cu starea, datele,
trecerile, ADR-urile ca linkuri și nota). CSS și tokenurile temei, fără bibliotecă de grafice; tastatura (săgețile,
Home / End) pe cronologie și pe file. **Documentație**: navigatorul pe categorii (starea, planul, fișele, plăcile, ADR-urile;
filtrul fără diacritice) și documentul ales; linkurile relative și codul inline care numește un document navighează în
filă. Fila și documentul stau în `#` (`#documentatie/docs/adr/0048-documentatia-admin.md`), ca un link să se poată trimite.

**6. Pachetul și PWA-ul.** Fișierele se cer la deschiderea filei (`fetch`, `no-cache`; pe hosting tot `no-cache`, fiindcă
numele sunt fixe, și `X-Robots-Tag: noindex`: documentele nu sunt pagini ale produsului), nu sunt în bucata `/admin` (poarta caută textul documentelor în toate bucățile) și nici în precache
(`shared/precache.ts`: motivul `documentatie`; poarta le cere în afara manifestului). Codul filelor stă în bucata `/admin`
(plafonul ei de 200 kB, cu ce aduce); pornirea nu se schimbă.

**7. Probele**, scrise înaintea funcției: `test/unit/markdown.test.ts` (fiecare construct, linkurile interzise, HTML-ul
brut, documentele reale, plasa pe sursă fără `dangerouslySetInnerHTML`), `test/unit/documentatie.test.ts` (parserele pe
documentele reale: 30 de etape și 3 tampoane, rândurile ↑, felia 3.4a cu datele ei, lista owner-ului; fixturile; poarta,
câte un defect pe caz; determinismul), `test/unit/admin.documentatie.test.ts` (adresa, aducerea, cronologia),
`test/e2e-emulator/documentatie.emulator.spec.ts` (filele pe build-ul real, cu login-ul emulatorului; telefonul fără
derulare orizontală). **Sabotajele: 28, toate prinse** (două scăpate la prima rulare: verificarea schemei fără probă,
acum cu probă; un sabotaj slab, `String(text).length` pliat de minificator, întărit), fișierele restaurate cu sha256.

## Ce impune

- O fișă nouă de etapă (`etapa-NN.md`) intră singură în roadmap dacă păstrează forma: titlul, „Feliile”, „Jurnalul
  feliilor” (și, opțional, „Ce îi trebuie owner-ului”). Un ADR nou intră singur dacă are rândul lui în index. Integratorul
  scrie rândul feliei în jurnal (cu `Completed` la final); fără el, felia apare „de făcut”.
- Tabelele fișelor și indexul se țin în forma citită de poartă (`CLAUDE.md`, regulile de proces); o schimbare de formă
  schimbă întâi `scripts/documentatie.ts`, cu testele lui (`test/unit/documentatie.test.ts`).

## Ce am respins

- **`import …?raw` în `/admin`** (ca fila „Operare” din ediția întâi): textul documentelor (~0,85 MB) ar fi intrat în
  bucata `/admin` și peste plafon, iar roadmap-ul ar fi fost calculat în browser la fiecare deschidere.
- **Un roadmap scris de mână** (JSON sau o pagină separată): a doua listă, care derivă tăcut.
- **Documentele în Firestore**: o scriere în cloud la fiecare publicare, reguli noi, fără folos (sursa e repo-ul).
- **O bibliotecă de markdown** (marked, remark): mai mare decât subsetul de care e nevoie, cu HTML brut implicit.
- **O bibliotecă de grafice**: cronologia e o grilă de bare; CSS ajunge și urmează tema.
- **Roadmap-ul în precache**: doar online, ca pagina care îl cere.

## Felia următoare

**Documentația live** (manualul utilizatorului, en + ro), cu același cititor (`src/docs/`), servită și ea din build și
deschisă din aplicație; poarta de acoperire: fiecare acțiune din registrul de acțiuni are o intrare în manual (sau o
excepție scrisă), ca manualul să nu rămână în urma interfeței.

## Se redeschide dacă

- documentele cresc peste ~5 MB (atunci: împărțirea `DEVLOG.md` sau a catalogului);
- o fișă are nevoie de o formă pe care tabelele nu o pot ține (atunci: forma nouă întâi în generator, cu poarta ei);
- owner-ul vrea roadmap-ul și offline.
