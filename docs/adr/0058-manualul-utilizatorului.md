# ADR 0058: Manualul utilizatorului (documentația live)

**Starea:** acceptat pe 24.10.2026. Cererea owner-ului (19.10): „vreau sa mentinem ideea de documentatie, una live si una
admin, pe care o aveam la vechiul cncvs”; documentația admin a venit în ADR 0048, care a lăsat manualul „felia următoare”.
Pornită pe 24.10 („Trecem mai departe”). **Intră în:** etapa 3, lângă documentația admin, fără mașină. **Continuă:** ADR 0048
(cititorul de markdown comun, generarea la build), ADR 0045 (precache-ul), ADR 0042 (pornirea nu crește).

**Problema.** Aplicația n-avea niciun ajutor în afara sfaturilor de pe butoane. Ediția întâi avea un manual (`DocsView`),
dar el rămânea în urma interfeței: nimic nu cerea ca un buton nou să fie descris. Iar pornirea nu mai are loc (99,8 / 100 kB
cu ușa), deci nici butonul manualului nu poate sta în pachetul de pornire.

## Decizia

**1. Sursa, în repo, câte un fișier pe limbă.** `docs/manual/ro.md` și `docs/manual/en.md`: un `# Titlu`, apoi capitolele
(`## Titlu`). Imediat sub titlul fiecărui capitol stau metadatele, care nu ajung la om: `%% capitol: id` (același id în ambele
limbi) și `%% acopera: usa, usa` (ușile interfeței pe care le descrie). Primul manual are 14 capitole: primii pași, pânza,
foaia, desenul, selecția, transformările, alinierea, importul, operațiile, traseul, exportul, vederea 3D, proiectul,
scurtăturile.

**2. Generat la build, ținut și offline.** Generatorul (`scripts/manual.ts`, chemat din generarea documentației, ADR 0048)
scrie `dist/manual/ro.json` și `en.json` (contractul: `shared/manual.ts`). Spre deosebire de documentația admin, fișierele
intră în precache (`shared/precache.ts`): manualul se citește și fără rețea, ca aplicația. Poarta generatorului oprește
build-ul pe un capitol fără id, un id repetat, un rând `%%` în alt loc sau cu altă cheie, capitole diferite între limbi și pe
un link `#id` spre un capitol care nu există.

**3. Fereastra, la cerere, cu zero kilobytes la pornire.** Butonul „?” stă la capătul extensiei barei (secțiunea Ajutor),
umplută de modulul editării (deja la cerere, după prima randare), iar F1 merge de oriunde. Fereastra (`src/app/Manual.tsx`,
1,8 kB gzip, cu cititorul de markdown din `src/docs/`, împărțit cu `/admin`) e un `<dialog>` nativ cu `showModal`: restul paginii devine
inert, Esc o închide, focusul se întoarce unde era. Tastele apăsate în ea se opresc acolo (altfel T, Delete sau Ctrl+Z ar
lucra pe desen, dedesubt). Cuprinsul în stânga, capitolul în dreapta, căutarea fără diacritice și fără litere mari, linkurile
`#id` între capitole; limba e cea a aplicației.

**4. Ajutorul după context.** F1 deschide capitolul care acoperă ușa de acum: fereastra deschisă a aplicației (exportul,
importul, paleta), apoi vederea 3D, altfel unealta aleasă (`unealta.<nume>`). Butonul „?” deschide ultimul capitol citit
(prima oară, primii pași).

**5. Poarta de acoperire** (în nivelul rapid, `test/unit/manual.test.ts`). Ușile interfeței sunt cele 27 de acțiuni ale
registrului, cele 7 unelte ale editării, Lipire, Grilă, Aliniere, cele 8 alinieri, cele 2 oglindiri, vederea 3D și manualul
(49). Fiecare trebuie să fie acoperită, în ambele limbi, de un capitol care o **numește cu eticheta ei din interfață** (partea
dinaintea parantezei sau a celor două puncte, fără „…”). O etichetă schimbată, o acțiune nouă în registru sau un control nou
cu `data-editare` în bara editării fără capitol fac proba să cadă: manualul nu rămâne în urma interfeței. Capitolul
scurtăturilor trebuie să conțină fiecare tastă din `src/ui/scurtaturi.ts` și din tastele uneltelor, cu numele acțiunii ei.

## Respinse

- **Manualul în pachetul JS** (`?raw`, ca ediția întâi): ~2 × 6 kB gzip în totalul JS (271,7 / 300 kB) și în bucata ferestrei.
- **Manualul doar online** (ca documentația admin): aplicația merge offline; ajutorul trebuie să meargă tot atunci.
- **Butonul în bara de sus sau în paletă** (o acțiune a registrului): eticheta și butonul ar intra în pornire, care n-are loc.
- **O singură limbă cu traducerea prin dicționar** (ca roadmap-ul, ADR 0056): manualul e scris pentru om, în fiecare limbă;
  poarta de acoperire, pe etichetele fiecărei limbi, ține cele două texte la zi.

## Se redeschide dacă

- manualul are nevoie de imagini (atunci: capturile generate de e2e, cu poarta lor);
- un capitol crește peste ~4 ecrane (atunci: subcapitole în cuprins);
- selecția multiplă sau alte unelte noi apar: capitolele lor vin cu ele, poarta o cere.
