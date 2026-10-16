# ADR 0040: Personalul, fila Erori și Diagnoza minimă (P0, partea 2)

**Starea:** acceptat pe 16.10.2026 („Da, continuă cu 3.3”), în limitele deciziilor deja aprobate (`PLAN.md` §3.2, §3.4;
`docs/faza2/admin/RAPORT.md` §5.1, punctele 1–5, 9, 10). Două abateri de la plan, scrise mai jos (§7), cu motivul; owner-ul
le poate respinge. **Intră în:** etapa 3, felia 3.3. **Continuă:** ADR 0039.

**Problema.** Erorile ajung pe server (3.1), dar nu le vede nimeni: nu există cont, rol, nici pagină care să le citească.

## Decizia

**1. Ruta `/admin`**, o pagină separată de aplicație (`src/admin/`), încărcată la cerere: pornirea o alege după cale,
înaintea deschiderii proiectului, deci adminul nu ia blocarea de scriere a proiectului din alt tab și nu intră în pachetul
de pornire. Hosting-ul trimite `/admin` și `/admin/**` la `index.html`.

**2. Contul: login Google** (popup), prin Firebase Auth, cu configurația web a instanței citită de la gazdă
(`config.json` → `firebase`; la publicare, scriptul o ia din Firebase, `apps:sdkconfig`, nu din repo). Fără configurație
(local), pagina spune că adminul nu e configurat aici. Codul Firebase stă în `src/cloud/` (contul, conexiunea).

**3. Rolul are o singură sursă: `staff/{uid}`** (`rol`: `support` < `admin` < `owner`; altceva = nimic). Clientul îl
citește ca să arate filele; regulile și callable-urile îl citesc la fiecare cerere. Un om logat fără rol vede uid-ul lui,
de copiat, și pasul prin care owner-ul îl adaugă.

**4. Fila Erori:** grupurile din `errorLogs`, cele mai recente întâi, cu filtrul „nerezolvate / toate” (indexul compus
`rezolvat` + `ultimaData`, declarat în `firestore.indexes.json`); pe rând: tipul, sursa, mesajul, de câte ori, câți
oameni (50 = „50 sau mai mulți”), prima și ultima dată, build-ul și instanța ultimei apariții; deschis: ultimele 20 de
apariții, cu stiva și contextul. Citirea se face prin reguli, la cerere („Reîncarcă”), nu cu ascultător.
- **„Rezolvat” / „Redeschide”** trece prin callable-ul `marcheazaEroarea` (personal, oricare rol), cu auditul în aceeași
  tranzacție: `audit/{id}` cu cine, rolul, acțiunea, ținta, valoarea dinainte și cea de după. Callable-ul are App Check
  impus: pe o instanță fără cheie reCAPTCHA, butonul e oprit și spune de ce.

**5. Diagnoza minimă:** câteva verificări active, fiecare cu starea (bine / atenție / eșec / informație), măsura și
indiciul de reparare: instanța față de proiect, build-ul clientului, cheia App Check, rolul tău, erorile nerezolvate (o
cifră care nu se poate citi nu e niciodată 0: „necunoscut, cu motivul”), funcțiile (un apel fără App Check la
`logClientError` trebuie să dea 401: un 403 înseamnă invocarea publică lipsă, ca la prima publicare a lui 3.1), marcajele
de rulare (încă niciun job).

**6. Retenția de 90 de zile:** politica TTL a Firestore pe `expiraLa`, pentru `errorLogs`, `aparitii` și `limiteErori`
(`firestore.indexes.json`, `fieldOverrides`). Firestore șterge documentele expirate în cel mult o zi. Publicarea fără
`--force` nu atinge indecșii aplicației vechi.

**7. Abaterile de la plan:**
- **Primul owner se scrie din consolă, nu cu un script.** Scriptul de urgență (Admin SDK) cere credențiale Google pe
  mașina owner-ului (`gcloud`, care nu e instalat) sau o cheie de serviciu descărcată, interzisă de regula WIF. Owner-ul
  creează o dată documentul `staff/<uid>` cu `rol: "owner"` în consola Firestore; callable-ul de roluri vine în P2.
- **Amprenta `meta/deployment` vine în 3.4**, cu pipeline-ul de publicare: o scrie pipeline-ul (cu WIF), iar local nu
  există credențiale Admin. Până atunci, Diagnoza arată build-ul clientului, din pachet.

**8. CSP-ul** primește exact originile Firebase folosite: Auth (`identitytoolkit`, `securetoken`, `apis.google.com` pentru
popup, cadrul `authDomain` al fiecărei instanțe), Firestore, App Check și reCAPTCHA Enterprise, funcțiile din
`europe-central2` ale celor două proiecte. Nimic cu `*`, fără `unsafe-inline`.

**9. Probele locale:** emulatoarele Auth, Firestore și Functions, cu `config.json` care le numește (`emulatoare`), doar pe
gazda locală; acolo, un furnizor App Check de probă (token fix), în carantină: se folosește doar cu `emulatoare` și pe
`localhost` / `127.0.0.1`. Emulatorul nu verifică tokenurile (ADR 0039), deci probează logica, nu securitatea lor.

## Dovada

- Regulile pe emulator: personalul citește jurnalul și aparițiile, nimeni nu le scrie, auditul îl citește doar admin /
  owner; callable-ul: refuză fără rol, cu rol necunoscut și fără App Check, scrie auditul în aceeași tranzacție, refuză o
  amprentă inexistentă.
- Funcțiile pure ale filelor (rândurile din documente, cifra măsurată, verificările Diagnozei) au teste unitare.
- E2e, pe emulatoare: login, fără rol (uid-ul), cu rol (lista, filtrul, detaliul, „Rezolvat”, Diagnoza); fără
  configurație: mesajul. Pe test: pagina pornește fără erori de CSP, până la fereastra Google (login-ul îl face owner-ul).

## Ce am respins

- **Rolul în custom claims:** rămâne vechi până la reîmprospătarea tokenului, deci retragerea nu retrage accesul.
- **Ascultătorul permanent pe `errorLogs`:** un refuz al regulilor arată ca „nimic încă” (lecția din alte proiecte);
  citirea la cerere spune eroarea.
- **Adminul ca filă în aplicație:** ar aduce Firebase în pachetul de pornire și ar lua blocarea proiectului.

## Se redeschide dacă

- personalul crește peste câțiva oameni (atunci callable-ul de roluri din P2 vine mai devreme);
- lista de grupuri trece de 100 nerezolvate (paginarea).
