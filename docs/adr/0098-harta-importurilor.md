# ADR 0098: Harta importurilor și o publicare care aduce doar ce s-a schimbat

**Starea:** acceptat pe 28.10.2026, la felia 3.N. Owner-ul a răspuns „Da, repar-o” la întrebarea „Repar cascada, ca o
actualizare să aducă doar ce s-a schimbat?”.

- **Rezolvă:** ADR 0096, „Limite” (cascada amprentelor).
- **Schimbă:** verificarea publicării din ADR 0044 (`distEsteAlCommitului`). Versiunea se citește acum din antetul lui
  `index.html`, nu dintr-o bucată JavaScript.
- **Completează:** CSP-ul din ADR 0017 (T17) primește o amprentă. Tot fără `unsafe-inline` și fără `unsafe-eval`.

**Problema.** Măsurat pe test, la publicarea unui commit doar cu DEVLOG (ADR 0096): workerul nou a re-adus 38 din 71 de fișiere,
941 din 1 314 kB necomprimați (~72 %), în ~9 s. Cauzele sunt două:

- fiecare bucată poartă în text numele cu amprentă ale bucăților pe care le importă. Bucata de pornire le poartă pe toate cele la
  cerere, deci se redenumește la orice schimbare. Aproape toate bucățile o importă, deci se redenumesc și ele;
- versiunea (primele 12 caractere ale commit-ului) stătea în bucata de pornire, deci o redenumea la fiecare publicare, chiar și
  fără cod.

## Decizia

1. **Harta importurilor.** Opțiunea `build.chunkImportMap` din Vite 8.3.3 (Rolldown 1.2.12), marcată experimentală:
   - bucățile se importă între ele după nume stabile (`./index-DoZRo7Qp.js`);
   - harta din `index.html` (`<script type="importmap">`) le traduce în fișierele cu amprentă;
   - o bucată schimbată se redenumește doar pe ea, iar `index.html` poartă harta nouă;
   - fișierul separat al hărții (`importmap.json`) nu se mai publică, fiindcă harta e deja în pagină.
2. **CSP-ul hărții.** Harta e un script inline, deci CSP-ul o lasă să ruleze doar prin amprenta ei exactă: sha256 al textului
   dintre etichete, `'sha256-…'` în `script-src`, după `'self'` (`cspCu` în `shared/csp.ts`, `scripts/cspHtml.ts`). Amprenta e în
   două locuri:
   - **în meta-ul paginii.** Se scrie pe pagina finală, în `generateBundle`, fiindcă Vite pune harta după transformările `post`
     ale paginii;
   - **în antetul de pe Hosting.** Publicarea o citește din `index.html`-ul build-ului (`scripts/pregateste-publicare.ts`).

   Orice alt script inline rămâne refuzat.
3. **Versiunea în antetul paginii**, nu în JavaScript: `<meta name="cncvs2-versiune">` (`shared/versiune.ts`). O citesc:
   - aplicația (raportul, jurnalul, `/admin`, testul);
   - verificarea publicării (`scripts/publica.ts`).
4. **Meta-urile build-ului (CSP-ul, versiunea) stau după `<meta charset>`.** Codarea paginii trebuie să rămână în primii 1 024
   de octeți. Cu amprenta în CSP, ajunsese la octetul 996; acum e la 46.
5. **Proba, în poarta build-ului.** Un al treilea build al aceluiași arbore, cu altă versiune (`CNCVS2_VERSIUNE`), poate schimba
   doar `index.html` și `sw.js`. Înainte de remediere schimba 78 de fișiere: numele vechi și cele noi a 39 de bucăți. Tot
   poarta mai verifică:
   - că harta e singurul script inline, iar CSP-ul din meta are amprenta ei;
   - unde stă codarea paginii;
   - că harta duce doar la fișiere care există.

   Ca măsurătorile ei (închiderile, importurile cerute) să citească fișierele, poarta traduce numele stabile înapoi în cele
   reale.

## Cifrele (măsurate, gzip 9)

| | Înainte (3.M) | După (3.N) |
|---|---|---|
| O publicare fără cod schimbă | 38 de fișiere, ~72 % din octeți (pe test) | `index.html` și `sw.js` (în poartă; de re-măsurat pe test) |
| Pornirea (cu ușa) | 96,3 (99,8) / 100 kB | 96,3 (99,8) / 100 kB |
| Totalul JavaScript | 326,1 / 400 kB | 326,1 / 400 kB |

O publicare cu cod schimbă bucățile atinse, plus `index.html` și `sw.js`. Bucata de pornire se redenumește doar când se schimbă
codul ei.

## Probele

- **Poarta:** cascada (al treilea build, cu altă versiune), CSP-ul meta-ului, codarea paginii, harta.
- **`test/unit/csp.harta.test.ts`:**
  - amprenta, față de valorile calculate cu `hashlib` din Python, în afara codului;
  - scripturile cu `src`;
  - două amprente;
  - `cspCu` (o singură dată, restul directivelor neschimbat);
  - versiunea din antet.
- **`firebase-json.test.ts`:** antetul cu amprente.
- **`appcheck-cheie.test.ts`:** publicarea scrie amprenta hărții din `index.html` în antet.
- **`publica.test.ts`:** versiunea din antet, nu din text.
- **e2e:**
  - aplicația și o bucată la cerere (manualul) pornesc sub CSP-ul din build, fără nicio încălcare;
  - un alt script inline e refuzat;
  - toată suita: workerele, ferestrele, actualizarea PWA (publicarea simulată recalculează amprenta).

## Ce am respins

- **Nume fără amprentă (`assets/[name].js`), cu reviziile Workbox.** N-ar avea cascadă, dar o filă veche fără worker (prima
  vizită, un browser fără service worker) ar primi bucata nouă lângă codul vechi: erori tăcute în locul unui 404 curat. În plus,
  antetul `immutable` n-ar mai fi posibil.
- **Bucățile reîmpărțite (codul comun fără numele bucăților la cerere):** e fragil. Orice modul comun cu un `import()` aduce
  cascada înapoi.
- **Un nonce în CSP:** cere un server care scrie pagina la fiecare cerere, iar Hosting-ul servește fișiere statice.
- **CSP-ul doar în meta (antetul paginii cu `frame-ancestors` atât):** ar ocoli amprenta din antet. Dar antetul apără înaintea
  citirii paginii și acoperă și workerele, deci rămâne întreg.
- **Versiunea într-o bucată mică, separată:** o cerere în plus la pornire. Poarta cere o singură bucată la pornire.

## Limite și neprobat

- **Opțiunea e experimentală** în Vite și Rolldown: o actualizare a lor o poate schimba. Proba din poartă prinde o cascadă
  întoarsă.
- **Harta importurilor merge** în Chrome / Edge 89+, Firefox 108+ și Safari 16.4+. E2e-ul rulează doar în Edge.
- **Workerele nu văd harta paginii.** Bucățile lor (`lucrator`, `lucratorSimulare`) nu importă nimic, deci nu le trebuie. Un
  worker care ar importa o bucată comună ar cădea; e2e-ul workerelor (exportul, simularea, pânza) îl prinde.

## Se redeschide dacă

- Vite stabilizează sau schimbă opțiunea;
- un worker are nevoie de bucăți comune;
- proba din poartă pică.
