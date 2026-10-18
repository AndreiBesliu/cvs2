# Etapa 3 — Senderul, postul cu contracte, observabilitatea, primul live

**Ținta** (`PLAN.md` §5.3): tai din aplicația nouă, fără alt program, pachetul GRBL pe mașina ta, iar aplicația ajunge pe
live.

**Starea:** pornită pe 16.10.2026, după ce etapa 2 și-a terminat feliile fără agenți (2.8e, probele independente, așteaptă
resetarea săptămânală din 17.10). Owner-ul: „Continuăm […] Lucrăm în pași mari, cu commit, publicare pe test și raport la
fiecare”.
- **Plăcile 1 și 2 sunt netăiate** (la owner). `PLAN.md` §4.6, punctul 7: cel mult o placă netăiată; la a doua, lucrul
  trece pe felii fără mașină (interfață, import, admin) până se taie. Deci etapa începe cu feliile fără mașină
  (observabilitatea, P0), iar senderul, emulatorul și postul pornesc după prima placă tăiată.
- **Prima felie a etapei** (transcrierea plăcii precedente în teste, `PLAN.md` §5.1) așteaptă placa 2.
- **Live:** primul, la sfârșitul etapei, după placa 3 și cu confirmarea owner-ului.

## Feliile

Articolele și clasele vin din `docs/faza2/arhitectura/estimare.md` (I13: Firebase și App Check; P0 / P1: adminul, 3 + 1–2
felii; F3: senderul, 8 felii R3). Coloana „Mașina” spune dacă proba feliei cere mașina sau o placă.

| # | Felia | Articolul | Clasa | Mașina | Depinde de |
|---|---|---|---|---|---|
| 3.1 | Jurnalul de erori pe server (P0, partea 1a; ADR 0039): funcțiile în TypeScript (codebase-ul `cncvs2`, `europe-central2`), `errorLogs` grupat pe amprentă, `logServerError` care nu aruncă, `logClientError` cu App Check și plafon de rată, regulile Firestore noi; testele pe emulator; publicat pe test | P0, I13 | R2 | nu | — |
| 3.2 | Raportorul din client (P0, partea 1b): erorile jurnalului local pleacă spre `logClientError`, cu SDK-ul adus la prima eroare; App Check cu cheia instanței citită de la gazdă; CSP-ul; măsurat pe test: 200 cu token, 401 fără | P0, I13 | R2 | nu | 3.1; cheia reCAPTCHA de test, înregistrată în App Check (gata pe 17.10) |
| 3.3 | Personalul și Diagnoza (P0, partea 2; ADR 0040): `staff/{uid}` și rolul în reguli, login Google, primul owner scris din consolă; pagina `/admin` cu fila Erori (și „Rezolvat” prin callable, cu auditul) și Diagnoza minimă (instanța, build-ul, App Check, erorile nerezolvate, funcțiile, marcajele); retenția de 90 de zile (TTL) | P0 | R2 | nu | 3.1 |
| 3.4a | Backup-ul zilnic al Firestore, cu verificarea lui, și marcajele de rulare judecate în Diagnoză (P1, partea 1; ADR 0041) | P1 | R2 | nu | 3.3 |
| 3.4b | Publicarea pe live (P1, partea 2): workflow-ul cu sha fixat, mediul `live` cu aprobarea owner-ului, WIF; amprenta `meta/deployment`, scrisă de pipeline (mutată din 3.3, ADR 0040 §7); contul de serviciu dedicat al backup-ului | P1 | R2 | nu | 3.4a; mediul `live`, WIF, PITR (owner) |
| 3.5 | Emulatorul GRBL și transcrierile ca fixturi: numără ce primește; rejucarea programelor plăcilor 1 și 2; 100 000 de linii fără pierderi | F3 | R3 | da | o placă tăiată |
| 3.6 | Fluxul senderului: cele 11 reguli din `docs/PORTARE.md` §3.4 (octeții, răspunsurile, eroarea în flux, bufferul pierdut, bariera, citirile, hold-ul, timpul real, WCS-ul), ca mașini de stare pure; sesiunea Web Serial; octeții exportați, cu hash | F3 | R3 | da | 3.5 |
| 3.7 | Jog, zero XY / Z, palparea Z cu placa de contact, G54–G59, bariera M6 (blocul de după, scris de post) | F3 | R3 | da | 3.6; placa de contact (owner) |
| 3.8 | Postul: contractele grblHAL și FluidNC, cele 4 strategii de schimbare a sculei, pauza în unitatea controlerului, elicea, inch cu 5 zecimale | I11 | R2 | da (placa 3) | — |
| 3.9 | Comutarea pe live (repetată întâi pe test), pachetul T0–T7 generat de post, fișa plăcii 3, prima recalibrare | I13, F3 | R2 | da | 3.4, 3.7, 3.8 |

**Ordinea, cu plăcile netăiate:** 3.1 → 3.2 → 3.3 → 3.4, apoi, după prima placă tăiată, 3.5 → 3.9. Dacă placa vine mai
devreme, 3.5 poate porni în paralel cu 3.3.

**3.1, jurnalul de erori pe server: contractul e ADR 0039.**
*Gata când:* funcțiile `cncvs2` și regulile noi sunt publicate pe `cncvectorstudio-test` fără să atingă funcțiile aplicației
vechi; pe test, `logClientError` fără App Check întoarce 401; testele pe emulator (gruparea, redeschiderea, plafonul,
regulile) sunt verzi și intră în nivelul complet al CI-ului.

**3.3, personalul și fila Erori: contractul e ADR 0040.** Pagina `/admin` pe instanța de test: login Google, rolul din
`staff/{uid}`, fila Erori, Diagnoza. Abaterile de la plan (§7 din ADR): primul owner se scrie din consolă (nu există
credențiale Admin locale), iar amprenta `meta/deployment` vine cu pipeline-ul din 3.4.

**3.4a, backup-ul și marcajele: contractul e ADR 0041.** `backupZilnic` (03:00) pornește exportul în
`gs://cncvectorstudio-test-backup/firestore/<ora>`, `verificaBackup` (05:00) îl cere terminat; fiecare job își scrie
marcajul (`marcaje/{job}`), iar Diagnoza îl judecă. Prima rulare reală: 17.10, 03:00 și 05:00. Dacă contul de serviciu
implicit n-are dreptul de export, eșecul apare în fila Erori și în Diagnoză (alarma se probează singură).

## Ce îi trebuie owner-ului (coada din `PLAN.md` §8.3)

| Ce | Pentru | Termen |
|---|---|---|
| Primul login pe <https://cncvectorstudio-test.firebaseapp.com/admin> și documentul `staff/<uid>` cu `rol: "owner"`, creat în consola Firestore (pagina arată uid-ul și linkul) | 3.3: fila Erori și Diagnoza | după 3.3 |
| Tăierea plăcilor 1 și 2 | 3.5 (transcrierile rejucate pe emulator) și prima felie a etapei | cât mai curând |
| Placa de contact pentru Z | 3.7 | înainte de 3.7 |
| WIF, conturile și PITR pe **live**: `scripts/wif/pregateste-proiect.sh cncvectorstudio live --pitr` în Cloud Shell, apoi mediul GitHub `live` cu **Required reviewers** și doar `main`, cu variabilele tipărite de script (ADR 0044, „Pașii owner-ului”). Pe test: făcut pe 18.10 (workflow-ul a publicat de două ori) | 3.9: prima publicare pe live | înainte de 3.9 |
| Copia locală a aplicației vechi, verificată pe calculatorul de la mașină (decizia 8) | lucrul de zi cu zi după primul live | înainte de 3.9 |
| Arhivarea repo-ului vechi pe GitHub | 3.9 | la comutare |

## Placa 3

Fișierele T din `docs/faza2/sonde/s8-posturi` (Anexa B), pe GRBL 1.1h, prin senderul nou. Cotele sunt în `PLAN.md` §5.3;
fișa completă (programele de aur, cotele pe hârtie, cum tai, ce măsori) se scrie în 3.9. **Live:** da, primul.

## Jurnalul feliilor

| # | Started | Completed | Treceri | Nota |
|---|---|---|---:|---|
| 3.1 | 16.10 18:25 | 16.10 19:50 | 4 | Jurnalul de erori pe server (ADR 0039): funcțiile `cncvs2` pe test, fără să le atingă pe cele vechi; `errorLogs` grupat pe amprentă, cu aparițiile; `logServerError` care nu aruncă; `logClientError` cu App Check și plafon. Regulile noi probate pe emulator, nepublicate (3.3). 12 teste pe emulator, 12 sabotaje prinse (după ce martorul a arătat un eșec fals al instrumentului). **Pe test:** 401 fără App Check și cu un token nesemnat. Publicarea a cerut două reparații: excluderile ancorate (`/src`) și recrearea callable-ului (invocarea publică se pune doar la creare). |
| 3.3 | 16.10 20:15 | 16.10 20:55 | 3 | Personalul, fila Erori și Diagnoza (ADR 0040): pagina `/admin` la cerere (164 kB, cu bugetul ei; pornirea 99,0 / 100 kB), login Google, rolul din `staff/{uid}`, fila Erori cu „Rezolvat” prin callable și audit în aceeași tranzacție, Diagnoza (7 verificări), TTL de 90 de zile, regulile noi publicate. 17 teste pe emulator, 3 e2e pe emulatoare (login-ul emulatorului de Auth inclus), 3 e2e fără configurație, 13 unitare; 7 sabotaje, prinse unde trebuie, cu martorii trecuți (un martor picat a arătat primul apel lent al callable-ului: termen de 30 s). **Pe test:** pagina pornește până la fereastra Google, fără încălcări de CSP. |
| 3.4a | 16.10 21:35 | 16.10 22:20 | 2 | Backup-ul și marcajele (ADR 0041): `backupZilnic` și `verificaBackup` programate pe test (cu `BUCKET_BACKUP` din `functions/.env.cncvectorstudio-test`), marcajul în jurul fiecărui job (pornire, final, succes, eșecuri la rând, eroare, rând în fila Erori), judecata pură în `shared/joburi.ts` și câte o verificare pe job în Diagnoză; regula `marcaje`. 23 de teste pe emulator, 3 e2e, 7 unitare noi; 10 sabotaje prinse, cu martorii. Emulatorul a prins un import care trecea de tipuri și cădea la rulare (`{ v1 }` din pachetul CommonJS). Prima rulare reală: 17.10, 03:00 / 05:00. |
| 3.2 | 17.10 20:45 | 18.10 09:05 | 3 | Raportorul de erori din client (ADR 0043): erorile jurnalului local pleacă spre `logClientError`, cu Firebase adus la prima eroare (pornirea 93,5 kB, partea raportorului 1,20 kB); plafoanele pe sesiune (20 / 3), stingerea (401 / 403 / plafon / import / App Check), tokenul cerut explicit cu termen, reîncercarea doar când cererea n-a ajuns; cheia App Check citită la publicare din înregistrarea ei; CSP-ul reCAPTCHA; doar mediul omului rămâne „doar local”. Workflow-uri: implementarea + 4 verificatori (25 de constatări), remedierile + reverificarea (6), integrarea; otrăvurile 31 / 31. **Pe test:** 200 cu token (grupul în `errorLogs`), 401 fără. Pauză peste noapte pe `wip/3.2-raportor`, unită prin squash. |
| 3.4b | 18.10 09:15 | 18.10 11:35 | 1 | Publicarea pe live, partea fără conturi (ADR 0044): amprenta `meta/deployment` pe ținte, scrisă de scriptul de publicare și citită de Diagnoză; `publica.ts` pentru ambele instanțe (live doar din workflow, în mediul `live`; hosting-ul doar cu `dist/` al commit-ului); workflow-ul `publica` (sha pe `main`, rapid verde, pe live același sha publicat întreg pe test; WIF); contul dedicat al backup-ului din `.env`; scriptul de Cloud Shell al owner-ului. 10 sabotaje prinse. **Pe test:** amprenta întreagă din `ee1357454fb0`; garda a refuzat un `dist/` vechi. **Pașii owner-ului pe test făcuți (18.10):** workflow-ul a publicat pe test (a doua rulare verde, după API-ul Cloud Billing și contul backup-ului ca parametru); joburile de backup rulează cu `backup-cncvs2`. Rămâne live (3.9). |
| 3.P | 17.10 14:55 | 17.10 19:00 | 2 | Loc în pachetul de pornire (ADR 0042), felie fără mașină, prin workflow (măsurătoarea, 3 propuneri, judecătorul, implementarea, 4 verificatori): pornirea 99,1 → **92,3 / 100 kB**; cu un proiect salvat 101,5 → 96,9. Ferestrele exportului, importului și panoului își aduc calculul, schemele documentului stau în modulul lor, dicționarul limbii active și alegerea cu clicul vin la cerere. Recenzia: 9 constatări, 7 remediate cu proba lor (limba nu se mai abandonează după 4 s, ultimul clic de limbă câștigă, pagina „fără texte” accesibilă, otrava C01 repusă, ușa plafonată la 8 kB), fiecare probă pică pe sabotajul remedierii; 2 limite scrise (tragerea și tasta date înaintea sosirii alegerii). |
