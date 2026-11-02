# ADR 0121: Corpusul de aur al documentului: proiectul salvat de fiecare versiune, cu ieșirea ușii înghețată

**Starea:** acceptat pe 02.11.2026, la felia 4.1↑ (etapa 4, punctul 1 din `PLAN.md` §5.3: „Migrările pure vN → vN+1, cu
corpus de aur”). Owner-ul a cerut „acum vreau sa luam roadmap-ul de unde a ramas”, iar etapa 3 mai avea doar felii cu mașina.
**Împlinește:** ADR 0016 („Migrările au corpus de aur din etapa 4”) și ADR 0001 („O schimbare de schemă e o migrare pură, cu
corpus de aur”). **Continuă:** ADR 0024 și 0070 (ușa unică și migrările ei, ușa documentului curent), felia 5.1↑c (oracolul
independent al ușii).

**Problema.** Ușa și migrările (v1 → v18) au un oracol independent: cazuri scrise pe hârtie, din ADR-uri, pentru fiecare
versiune. Niciun document din probe nu e însă scris de aplicația însăși, așa cum ajunge în browserul unui om:
- cu cifrele calculate (o rotire de 30° lasă `0.49999999999999994`);
- cu implicitele operațiilor din versiunea lui;
- cu `rev`-ul și ordinea pieselor după pașii omului.

Nimic nu spunea, octet cu octet, ce deschide ușa de azi dintr-un proiect salvat ieri. Planul cerea corpusul „de acum” (din
etapa 4), când există date pe live. Pe live nu e încă aplicația nouă, dar instanța de test a publicat toate cele 18 versiuni,
iar un proiect salvat acolo poate fi al oricăreia.

## Decizia

1. **Intrările sunt proiecte salvate chiar de aplicația fiecărei versiuni** (`test/fixtures/documente/intrari/`). Același
   proiect de probă al unui atelier trăiește prin versiuni, ca al unui om:
   - v1 îl desenează (un capac rotit cu colțuri rotunjite, două găuri, una scalată, o plăcuță);
   - fiecare versiune următoare deschide salvarea versiunii dinainte cu ușa ei (deci cu migrarea ei) și adaugă ce a adus ea:
     v2 un grup și a doua instanță, rotită; v3 operațiile; v4 sensul; v5 urechile; v6 rampa; v7 intrările; v8 degajările;
     v9 o cale închisă (linii, un arc, o cubică); v10 o cale deschisă pe linie și ghidajele; v11 buzunarul; v12 coborârea; v13
     găurirea; v14 V-carve-ul; v15 fundul plat; v16 freza de gravare și direcția; v17 frezele de rest; v18 strategia paralelă;
   - salvează JSON-ul canonic, după ce ușa ei l-a redeschis neschimbat;
   - lângă proiect, documentul gol al lui v1.

   Rețeta e `scripts/corpus-documente-reteta.ts`. Folosește doar ce are orice versiune: `documentNou`, `operatieImplicita`
   (din v3), `incarca` și `jsonCanonic`.
2. **Commit-ul fiecărei versiuni e în `ISTORIE`** (`scripts/corpus-documente.ts`): ultimul cu acea schemă, adică părintele
   celui care a urcat-o; pentru versiunea curentă, unul al ei. `node scripts/corpus-documente.ts --istorie` scoate din git
   sursele fiecăruia (`src`, `shared`, printr-un `git cat-file --batch`) într-un dosar temporar din afara repo-ului, lângă un
   `node_modules` legat de cel al repo-ului (o joncțiune pe Windows), și rulează rețeta acolo. Același commit și aceeași rețetă
   dau aceiași octeți (probat: a doua rulare, identică).
3. **Intrările sunt înghețate:** `corpus.json` ține versiunea, commit-ul și sha256-ul fiecăreia. Se scriu doar cu
   `--istorie`; o intrare schimbată de mână pică proba.
4. **Ieșirile așteptate** (`asteptat/`) sunt documentele deschise de ușa de azi, ca JSON cu cheile sortate, pe rânduri (o
   diferență se citește). `node scripts/corpus-documente.ts` le scrie din nou; `--verifica` le compară.
5. **Documentele deschise atunci** (`istorie/`, cu sha256-ul în `corpus.json`): rețeta păstrează și documentul pe care ușa
   versiunii N l-a deschis din salvarea versiunii N − 1, înaintea adăugirii, adică ce a făcut migrarea N − 1 → N în codul
   ei. Migrarea de azi (`MIGRARI[N − 1]`), pe aceeași salvare, trebuie să dea aceiași octeți. Regula din
   `src/model/migrari.ts` („o migrare scrisă nu se mai schimbă”) devine probă pe toată istoria: la scriere, toate cele 17
   au dat octet cu octet ce dăduse codul lor.
6. **Proba** (`test/unit/documente.aur.test.ts`, în nivelul rapid), pe fiecare intrare:
   - corpusul e întreg: câte o intrare pe versiune, de la 1 la cea curentă, scrisă de commit-ul din `ISTORIE`; sha256-ul
     neschimbat; salvarea e JSON canonic;
   - ușa de azi o deschide exact ca în ieșirea așteptată (iar la versiunea curentă, ieșirea e chiar intrarea);
   - ieșirea e un punct fix al ușii întregi și al ușii documentului curent (ADR 0070 §2): aceiași octeți;
   - migrările, luate pas cu pas (`MIGRARI[n]`), pe intrarea înghețată adânc: fiecare reușește, scrie versiunea următoare, dă
     aceiași octeți la a doua chemare, nu-și atinge intrarea, iar capătul e documentul ușii;
   - migrarea de azi N − 1 → N, pe salvarea versiunii N − 1, dă exact documentul deschis atunci de versiunea N (§5).
7. **O versiune nouă a schemei (v19) intră în corpus odată cu ea**, în felia care o aduce:
   - adăugirea ei, în rețetă (`ADAUGIRI[19]`, cu câmpul nou pe proiect);
   - rândul ei în `ISTORIE`, iar rândul lui v18 primește ultimul commit v18;
   - `--istorie`, apoi ieșirile așteptate scrise din nou.

   Diferența ieșirilor așteptate e exact migrarea v18 → v19, citită în commit. Proba cere intrarea v19 cât timp lipsește.

## Ce am respins

- **Documente scrise de mână ca intrări:** oracolul independent le are deja, pe hârtie (felia 5.1↑c și oracolele etapelor 1
  și 2). Corpusul de aur aduce ce lipsea acolo: ce scrie aplicația, cu cifrele și implicitele ei.
- **Proiectele owner-ului de pe instanța de test:** repo-ul e public, iar desenele sunt ale lui. Rețeta e un proiect de probă,
  scris în fiecare versiune de codul ei.
- **Câte un worktree pe versiune:** Drive-ul ține blocate dosarele din `.git/worktrees`, iar `tar` din Git Bash nu primește
  căile Windows cu `C:`. Un `git cat-file --batch` pe versiune n-are nevoie de niciunul.
- **Ieșirile ca hash-uri:** o diferență n-ar mai putea fi citită. Ieșirile stau întregi, pe rânduri.

## Limite

- Proiectul de probă nu acoperă tot ce putea scrie o versiune: câmpurile necunoscute, plafoanele, documentele stricate și
  cazurile la margine rămân ale oracolului independent, care le are pe hârtie.
- Pe live nu e încă aplicația nouă. Proiectele oamenilor intră în discuție la comutare (3.9): dacă un om trimite un proiect
  pe care ușa nu-l deschide, el devine o intrare nouă, cu acordul lui.
- Rețeta rulează codul vechi cu `node_modules` de azi. Merge cât timp dependențele ușii (valibot 1.5.0 la toate cele 18
  versiuni) nu-și schimbă comportamentul; dacă se schimbă, `--istorie` o spune (alți octeți decât în corpus).

## Se redeschide dacă

- o migrare scrisă trebuie schimbată (`src/model/migrari.ts`: „o migrare scrisă nu se mai schimbă”): atunci ieșirile
  așteptate se scriu din nou, iar ADR-ul nou spune de ce;
- proiectele de pe live arată forme pe care proiectul de probă nu le are.
