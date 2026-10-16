# ADR 0039: Jurnalul de erori pe server (P0, partea 1)

**Starea:** acceptat pe 16.10.2026, fără alegeri noi: scrie contractul deciziilor deja aprobate (`PLAN.md` §3.4 și §8.2,
deciziile 9 și 13; `docs/faza2/admin/RAPORT.md` §5.1, punctele 2–4, și §5.3). **Intră în:** etapa 3, felia 3.1 (serverul);
clientul în 3.2. **Precizează:** ADR 0021 (T21): funcțiile au propriul `package.json` și se compilează în `lib/`.

**Problema.** Până acum, o eroare a aplicației se vede doar în browserul în care a apărut: jurnalul local și butonul
„Copiază raportul”. Înaintea primului live trebuie un singur loc, scris doar de server, în care se văd erorile tuturor,
grupate, cu build-ul și instanța.

## Decizia

**1. Funcțiile aplicației noi** stau în `functions/`, în TypeScript, compilate cu `tsc` în `functions/lib/` (scriptul
`compileaza`, nu `build`: buildpack-ul Google rulează singur un script `build`, iar acolo nu există `tsc`).
- **Codebase-ul `cncvs2`**, separat de `default` (funcțiile aplicației vechi, care rulează încă pe proiectul de test).
  Publicarea atinge doar `--only functions:cncvs2,firestore:rules`; funcțiile vechi rămân neatinse (lista lor de șters i
  se arată owner-ului la comutare, 3.9).
- **Node 24** (GA până la 30.04.2028), `firebase-functions` 7.4.0 și `firebase-admin` 14.5.0, fixate exact.
- **Regiunile** stau într-un tabel din cod (`functions/src/regiuni.ts`): callable-urile și joburile în `europe-central2`,
  declanșatoarele Firestore în `us-central1` (lângă baza `nam5`).
- Importă doar din `shared/` (regula `functiile-doar-shared`); contractul raportului e comun clientului și serverului
  (`shared/erori.ts`).

**2. `errorLogs`: un document pe grup, plus aparițiile.** Numele e nou (aplicația veche nu-l folosește). Scrise doar de server, prin Admin SDK, într-o tranzacție pe eroare:
- `errorLogs/{amprenta}`: `schema: 1`, `amprenta`, `sursa` (`client` / `server`), `tip`, `mesaj` (primul), `numar`,
  `primaData`, `ultimaData`, `rezolvat` (devine `false` la fiecare apariție nouă: un grup rezolvat se redeschide singur),
  `oameni` (uid-urile distincte, cel mult 50; „50” înseamnă „50 sau mai mulți”), `ultima` (ultima apariție, întreagă),
  `expiraLa`;
- `errorLogs/{amprenta}/aparitii/{id}`: `cand`, `tip`, `mesaj`, `stiva`, `build`, `instanta`, `adresa`, `browser`,
  `limba`, `uid` (sau `null`), `context` (doar la server), `expiraLa`.

**3. Amprenta** = primii 32 de caractere hex din SHA-256 peste `sursa | tip | mesajul normalizat`. Normalizarea înlocuiește
adresele, numele fișierelor cu hash de build, uuid-urile, id-urile lungi (hex de cel puțin 8, alfanumerice de cel puțin
20) și numerele; păstrează formularea, ca două defecte diferite să nu se contopească. Stiva **nu** intră: numele din
pachetul minificat se schimbă la fiecare build, deci aceeași eroare ar face un grup nou la fiecare publicare.

**4. `logServerError(sursa, eroare, { uid, ... })` nu aruncă niciodată.** `uid` e obligatoriu în semnătură (poate fi
`null`): în ediția întâi, apelurile din `catch` îl uitau, iar panoul arăta „0 oameni”. O valoare aruncată care nu e
`Error` se descrie (șirul rămâne șirul; `null`, `undefined`, Promise-ul sunt numite; obiectul prin nume, mesaj sau JSON),
iar un `Error` se descrie ca `Nume: mesaj`. Contextul e JSON, tăiat la 2 000 de caractere.

**5. `logClientError`**, callable în `europe-central2`, cu **App Check impus** (`enforceAppCheck: true`), fără ramură
pe instanță; fără cont cerut (erorile de dinaintea login-ului contează), cu `uid`-ul din token când există.
- **Raportul** se validează cu plafoanele jurnalului local (`shared/erori.ts`): tipul din lista închisă, mesajul ≤ 1 000,
  stiva ≤ 4 000, adresa ≤ 500 fără query și fără fragment, build-ul, browserul și limba scurte. Instanța o pune
  serverul, din proiect, nu clientul.
- **Plafonul de rată**, pe ore: 40 pe IP (IP-ul ultim din `X-Forwarded-For`, păstrat ca hash, nu în clar) și 2 000 pe tot
  proiectul, numărate în `limiteErori/{cheie}` în aceeași tranzacție. Clientul mai are plafonul lui pe sesiune (3.2).
- **Răspunsul** e `{ ok: true }` sau `{ ok: false, motiv }` (`nevalid`, `plafon`, `scriere`); funcția nu aruncă spre
  client, iar o scriere eșuată ajunge în jurnalul Cloud Logging.

**6. Ce nu e eroare:** condițiile de operare (o cotă, un 429 al unui furnizor) nu intră în `errorLogs`: reapar prin
construcție și ar acoperi defectele adevărate. Predicatul se ține îngust, la sursa lor.

**7. Regulile Firestore noi** (`firestore.rules`): totul e refuzat implicit, deci și colecțiile vechi (`PLAN.md` §3.4 și
§8.2, decizia 22). `errorLogs` și aparițiile se citesc doar de personal (`staff/{uid}` cu rolul `support`, `admin` sau
`owner`; un rol necunoscut nu dă nimic) și nu se scriu niciodată din client; `staff/{uid}` îl citește doar omul lui și
nu-l scrie nimeni din client (callable-ul owner-ului vine în 3.3).
- **În 3.1 se probează pe emulator, dar nu se publică.** Pe test stau încă regulile aplicației vechi, care refuză deja
  clienților orice colecție de pe primul nivel pe care n-o numesc (deci și `errorLogs`); Admin SDK-ul nu trece prin
  reguli. Regulile noi se publică odată cu fila Erori (3.3), prima care le citește. Așa repetiția comutării pe test (3.9:
  build-ul vechi cu regulile lui, apoi cel nou) rămâne posibilă fără o republicare a regulilor vechi.

**8. Retenția: 90 de zile** (decizia 13). `expiraLa` e scris de acum; politica TTL a Firestore (sau jobul cu marcaj de
rulare) se pornește în 3.3. Până atunci nimic nu se șterge, iar volumul e mărginit de plafonul de rată.

## Dovada și probele

- **Nucleul pur** (`shared/erori.ts`: validarea, normalizarea, descrierea valorilor aruncate, cheia plafonului) are teste
  unitare în nivelul rapid.
- **Pe emulator** (Firestore + Functions, proiectul `demo-cncvs2`, `npm run test:emulator`, în nivelul complet):
  gruparea și numărarea, redeschiderea unui grup rezolvat, plafonul pe IP și cel global, `logServerError` cu valori
  care nu sunt `Error` și cu Firestore oprit (nu aruncă), callable-ul (401 fără App Check, `{ ok }` cu el), regulile
  (personal / om / anonim, scrierea refuzată tuturor, colecțiile vechi refuzate). Emulatorul nu verifică semnăturile
  tokenurilor (`docs/faza2/admin/RAPORT.md` §4.2): probează logica, nu securitatea tokenurilor.
- **Pe test** (cloud): `logClientError` fără App Check întoarce 401 (măsurat la publicare). 200 cu un token adevărat
  se măsoară în 3.2, când există cheia reCAPTCHA a domeniului de test.

## Ce am respins

- **Câte un document pe apariție, grupat în panou** (modelul din Presto): panoul citește cele mai noi 500, deci o eroare
  frecventă le ascunde pe celelalte, iar numărul pe grup nu se vede.
- **Cloud Logging / Error Reporting singure:** nu prind erorile din browser, nu știu de build și de instanță, iar owner-ul
  nu se uită acolo.
- **Un serviciu extern (Sentry etc.):** datele ar sta în altă parte, cu alt cont, alt cost și altă intrare în CSP.
- **Stiva în amprentă:** vezi punctul 3.

## Se redeschide dacă

- traficul real trece de plafoane fără să fie abuz (atunci plafoanele cresc, cu cifra măsurată);
- două defecte diferite ajung în același grup, sau aceeași eroare în grupuri diferite, pe date reale.
