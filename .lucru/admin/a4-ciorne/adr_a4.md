- **A.4, 22.11: Sugestii ca tablă a deciziilor** (aceeași ramură, `wip/A.1-admin`, adusă înainte, fără unire, la `main`
  `88be9d6c`, care conține A.3; `3.Ad` în jurnalul etapei 3). Fără reguli, permisiuni, indexuri, date sau funcții noi: mutările
  trec prin acțiunea `decide` a callable-ului `sugestii` de azi, pe versiunea văzută.
  - **Partea pură** (`src/admin/sugestii/date.ts`): coloanele, în ordinea schiței (Fără decizie, Acceptată, În lucru, Amânată,
    Făcută), cu Respinsele dedesubt; unde se mută un card („Mută în…”: celelalte coloane, apoi Respinsă); nota cerută
    (Respinsă, Amânată; spațiile singure nu sunt o notă); tabla (`tabla`: în „Fără decizie”, cele mai noi întâi; în
    celelalte, ultima decizie întâi, deci un card mutat urcă în capul coloanei; o stare necunoscută stă separat); mutarea
    arătată cât cererea e în drum (`cuMutarea`) și lista după răspuns (`dupaDecizie`). Filtrele pe stare ale listei vechi
    au ieșit: coloanele sunt filtrul.
  - **Tabla** (`Tabla.tsx`): cardul are titlul (butonul care deschide detaliul), tipul și autorul; owner-ul îl trage într-o
    coloană sau în banda Respinselor (strânsă, cu numărul; un card trimis acolo o deschide) ori alege din „⋯”, meniul „Mută
    în…” (calea din tastatură: săgețile, Home, End, Enter, Esc, care întoarce focusul pe buton). Rândurile care deschid
    fereastra notei au „…”. Cât cererea e în drum, cardul stă deja în coloana nouă, cu marginea punctată, și nimic altceva nu
    se mută. La răspuns, lista ține decizia fără s-o recitească: serverul a scris pe versiunea trimisă, deci rândul e cel
    citit, cu starea, nota curățată ca pe server, ora și versiunea întoarsă (o mutare nu mai costă cele până la 300 de
    citiri ale listei, iar a doua mutare a aceluiași card pleacă pe versiunea nouă). La un refuz, cardul revine în coloana
    lui, cu motivul pe el, până la „Reîncarcă” sau la următoarea cerere. După o mutare din tastatură, focusul rămâne pe card,
    în coloana nouă. Sub 1 100 px, coloanele trec pe rânduri (niciun meniu nu se taie la o derulare laterală).
  - **Nota cerută:** la Respinsă și Amânată, tragerea și meniul deschid o fereastră modală cu nota de acum a cardului; „Mută”
    pleacă doar cu o notă, iar „Renunță” și Esc lasă cardul pe loc. Și în detaliu, decizia nu pleacă la aceste două stări fără
    notă. Nota cerută e a tablei: serverul primește, ca azi, orice notă (o decizie veche fără notă rămâne validă).
  - **Detaliul:** o fereastră modală nativă (ca manualul), cu textul, poza la cerere, decizia cu nota, editarea autorului
    (cât n-are decizie) și decizia owner-ului; Esc o închide, iar focusul revine pe card.
  - **„Sugestie nouă”** deschide formularul deasupra tablei; poza planșei venită din editor (ADR 0111) îl deschide singură,
    deci drumul din manual rămâne același. După trimitere, formularul se închide și focusul revine pe buton.
  - **„Ale mele” / „Toate”**, comutatorul din schiță, pentru cine vede toate sugestiile și le poate scrie.
  - **Rolurile:** un rol care doar citește vede tabla, fără „Sugestie nouă”, fără tragere și fără „Mută în…”; autorul își
    vede sugestiile pe tablă, cu decizia în detaliu.
  - **Probele:** NN unitare noi (`test/unit/sugestii.tabla.test.ts`: coloanele și meniul, nota cerută, tabla, mutarea în drum,
    lista după răspuns; `sugestii.test.ts`: „Ale mele”). Proba e2e a Sugestiilor, rescrisă pe tablă, plus două noi
    (`test/e2e-emulator/sugestii.emulator.spec.ts`: tragerea în Acceptată cu cererea ținută pe drum, nota cerută în banda
    Respinselor și în Amânată, renunțarea, „Mută în…” din tastatură cu focusul pe card, a doua mutare pe versiunea nouă, nicio
    citire a listei după mutări; mutarea refuzată care revine și „Reîncarcă”).
  - **Otrăvurile:** NN / 40 prinse (`test/otravuri/A.4.py`: 14 unitare, 26 pe emulatoare).
  - **Mărimea:** `/admin` 121,2 → NN / 200 kB.
