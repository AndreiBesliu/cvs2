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
| 3.2 | Raportorul din client (P0, partea 1b): erorile jurnalului local pleacă spre `logClientError`, cu SDK-ul adus la prima eroare; App Check cu cheia instanței citită de la gazdă; CSP-ul; măsurat pe test: 200 cu token, 401 fără | P0, I13 | R2 | nu | 3.1; cheia reCAPTCHA de test (owner) |
| 3.3 | Personalul și Diagnoza (P0, partea 2): `staff/{uid}` și `staffLevel()`, login Google, scriptul primului owner; fila Erori; Diagnoza minimă (instanța, sha-ul, erorile nerezolvate, marcajele); amprenta `meta/deployment`; retenția de 90 de zile | P0 | R2 | nu | 3.1 |
| 3.4 | Publicarea pe live (P1): workflow-ul cu sha fixat, mediul `live` cu aprobarea owner-ului, WIF; backup programat, cu alarmă | P1 | R2 | nu | 3.3; mediul `live`, WIF, PITR (owner) |
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

## Ce îi trebuie owner-ului (coada din `PLAN.md` §8.3)

| Ce | Pentru | Termen |
|---|---|---|
| Cheia reCAPTCHA Enterprise pentru domeniul de test, creată în proiectul `cncvectorstudio-test` | 3.2: erorile oamenilor ajung pe server | înainte de 3.2 |
| Tăierea plăcilor 1 și 2 | 3.5 (transcrierile rejucate pe emulator) și prima felie a etapei | cât mai curând |
| Placa de contact pentru Z | 3.7 | înainte de 3.7 |
| Mediul `live` în GitHub; WIF pe ambele proiecte; PITR pe live | 3.4 | înainte de 3.4 |
| Copia locală a aplicației vechi, verificată pe calculatorul de la mașină (decizia 8) | lucrul de zi cu zi după primul live | înainte de 3.9 |
| Arhivarea repo-ului vechi pe GitHub | 3.9 | la comutare |

## Placa 3

Fișierele T din `docs/faza2/sonde/s8-posturi` (Anexa B), pe GRBL 1.1h, prin senderul nou. Cotele sunt în `PLAN.md` §5.3;
fișa completă (programele de aur, cotele pe hârtie, cum tai, ce măsori) se scrie în 3.9. **Live:** da, primul.

## Jurnalul feliilor

| # | Started | Completed | Treceri | Nota |
|---|---|---|---:|---|
