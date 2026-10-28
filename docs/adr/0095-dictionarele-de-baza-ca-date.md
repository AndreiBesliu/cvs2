# ADR 0095: Dicționarele de bază ca date

**Starea:** acceptat pe 28.10.2026. Felia 3.L, la „continua”, după ce totalul ajunsese la 329,2 / 330 kB (ADR 0094: „o felie
nouă cu cod în plus cere întâi loc în pachet”). Asistentul a ales să facă loc, nu să ridice plafonul: plafonul e decizia
owner-ului, iar o felie care micșorează pachetul lasă ambele drumuri deschise. **Continuă:** ADR 0086 (mesajele modulelor la
cerere, ca date), care lăsase dicționarele de bază în cod, „de reluat dacă pornirea o cere”; acum o cere totalul. **Schimbă:**
ADR 0086 §5 și ADR 0042 pentru dicționarele de bază (`src/i18n/mesaje.ro.ts` / `.en.ts`): nu mai vin cu `import()`, ca bucăți
JavaScript, ci ca fișiere de date.

**Problema.** Măsurat pe hărțile de surse ale build-ului (felia 5.6↑), din cei ~329 kB numărați: react-dom ~62,5 kB, `src/geom`
~51, `src/app` ~50, `src/ui` ~24, `src/cam` ~24; textele rămase în JavaScript erau mai ales dicționarele de bază, ~4,4 kB (ambele
limbi, câte o bucată pe limbă). Restul e cod: „la cerere” nu scade totalul (ADR 0086, Problema), iar un alt minificator (terser,
peste ieșirea Oxc) ar fi scos doar ~1,3 kB.

## Decizia

**1. Dicționarul de bază al fiecărei limbi e un fișier de date:** `mesaje/ro.json` și `mesaje/en.json`, scrise de build din
aceleași surse TypeScript (`scripts/mesaje.ts`, lângă mesajele modulelor), în precache. Câte un fișier pe limbă, nu unul cu
amândouă: pornirea aduce doar limba activă, înaintea primei randări, iar cealaltă vine în fundal (ca până acum). Numele urmează
manualul și dicționarul codurilor (`<dosar>/<limbă>.json`).

**2. Pornirea rămâne aceeași:** `incarcaLimba` (`src/i18n/t.ts`) aduce fișierul în loc de bucată, cu aceeași promisiune la fiecare
cerere și cu un eșec neținut minte; în `main.tsx` nu se schimbă nimic: rezerva celeilalte limbi la 4 s, renunțarea la 30 s,
ecranul „fără texte”, intrarea în jurnal și raportul. Un fișier care nu vine (HTTP) sau are altă formă respinge, cu calea lui în
motiv (`dicționarul ro (/mesaje/ro.json): HTTP 404`), deci raportul spune ce fișier lipsește.

**3. Pornirea ia doar ce-i trebuie:** adresa dicționarului (`fisierBaza`) și verificarea formei (`esteDictionarMesaje`) stau în
`shared/dictionar.ts`; `shared/mesaje.ts` (lista modulelor, forma fișierelor lor) le reexportă și rămâne în bucata încărcătorului
de mesaje. Cu tot fișierul în pornire, pornirea creștea cu 0,32 kB; despărțit, cu 0,24.

**4. Pe hosting, `/mesaje/**` fără cache** (`Cache-Control: no-cache`, `scripts/firebase-json.ts`). Implicitul Hosting e
`max-age=3600` (măsurat pe test, 28.10, pe `/mesaje/carcasa.json`): cu bucata de JavaScript, numele se schimba la fiecare
publicare; la o adresă fixă, o pagină fără worker (prima vizită, un browser fără service worker) ar fi putut primi o oră
dicționarul vechi lângă codul nou, adică un `t()` care aruncă. Regula acoperă și mesajele modulelor (ADR 0086), aduse tot de la
adrese fixe.

**5. Poarta build-ului:** nicio bucată JavaScript de limbă (`mesaje.*.js`), ambele fișiere există, cu forma citită de aplicație,
și sunt în precache (printre obligatorii, verificate fără predicat), iar textul lor nu mai apare în nicio bucată (cel mai lung
mesaj ASCII al fiecărei limbi, ca la module). **Pornirea numără mai departe dicționarul** (cel mai mare dintre ele, gzip):
vine înaintea primei randări la fiecare pornire, deci o pornire fără el ar ascunde ~2,2 kB.

## Ce s-a câștigat

| Ce | Înainte | După |
|---|---:|---:|
| Totalul JavaScript (plafon 330) | 329,2 kB | **325,0 kB** (−4,2) |
| Pornirea (plafon 100), cu dicționarul limbii active | 96,0 kB | 96,2 kB (+0,2) |
| Pornirea cu ușa unui proiect salvat | 99,5 kB | 99,7 kB |
| Dicționarele de bază (date, gzip) | — | ro 2,2 kB, en 2,1 kB |
| Precache-ul întreg | — | ≈ +0,2 kB |

Textele nu dispar, se mută din JavaScript în date (ca la ADR 0086). Pornirea crește cu 0,24 kB: aducerea prin `fetch` și
verificarea formei stau în ea, iar `import()`-ul celor două bucăți era mai scurt. Pornirea cu ușa rămâne strâmtă (0,3 kB liberi).

## Probele

- aducerea, pe drumul aplicației (un `fetch` care servește fișierele generate): un 404 și un fișier cu altă formă resping, cu
  calea în motiv, iar limba rămâne neîncărcată; apoi `mesaje/ro.json` vine o singură dată, doar limba cerută;
- fișierul generat e exact dicționarul din sursă, în fiecare limbă (cheile, textele, pluralele); generatorul scrie întâi cele
  două dicționare, apoi modulele, și refuză un dicționar gol, cu altă formă sau cu alte chei decât româna;
- `firebase.json`: `/mesaje/**` fără cache; precache-ul ia `mesaje/ro.json` și `mesaje/en.json`;
- e2e: dicționarul englezei care nu vine (pornirea în română, intrarea în jurnal), niciunul (ecranul „fără texte”, în ambele
  limbi, cu Reîncarcă), ambele după termenul de 4 s, româna după engleza de rezervă, ultimul clic câștigă; raportul unei
  publicări fără dicționare pleacă, cu calea fișierului;
- poarta build-ului (§5).

## Respinse

- **Ridicarea plafonului:** decizia owner-ului; rămâne deschisă, iar felia asta n-o închide.
- **Pornirea fără dicționar în cifră:** ar fi arătat −2,2 kB la pornire, deși octeții vin tot înaintea primei randări.
- **Un fișier cu ambele limbi:** pornirea ar fi adus și limba care nu se arată (~2,1 kB în plus înaintea primei randări).
- **Un alt minificator (terser):** ~1,3 kB, cu o dependență nouă pentru build.
- **Un worker PWA propriu, fără Workbox:** din cei 7,2 kB ai lui `sw.js`, ~5,9 sunt Workbox; ar scoate ~4 kB, dar ar rescrie
  ADR 0045 (precache-ul, actualizarea, preluarea de la aplicația veche), cu probele lui.
- **Preact în locul lui React:** cea mai mare pârghie (react-dom ~62,5 kB, din total și din pornire), dar o dependență nouă și o
  schimbare a stack-ului (ADR 0021, React 19): decizia owner-ului, cu o felie a ei.

## Se redeschide dacă

O felie nouă nu mai încape nici în cei ~5 kB câștigați: atunci owner-ul alege între plafon, workerul propriu și Preact (cifrele
de mai sus).
