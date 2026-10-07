# Critica cifrelor: verificarea faptelor din `PLAN.md`

**Faza 2 · 07.10.2026 · critic independent.** Doar citire și socoteli de mână. N-am modificat alt fișier și n-am
rulat nimic din sonde.

---

## Ce am verificat

- **`PLAN.md` complet** (675 de linii), secțiune cu secțiune: §0, §1, §3.1–§3.6, §4, §5.1–§5.6, §6, §7, §8, §9.
- **Sursele:** `estimare.md`, cele trei propuneri, `sonde/*/RAPORT.md` (s1–s8, s11, s12), cele trei `VERIFICARE.md`,
  `admin/RAPORT.md`, `prototip-planse/RAPORT.md`, `BRIEF.md`, `LECTII.md`, `ACOPERIRE-ARTCAM-DESKPROTO.md`, `DEVLOG.md`,
  `CLAUDE.md` și lista fișierelor din `s2-export-import/pachet-owner/`.
- **Ce am refăcut eu:**
  - datele P50 / P80 / P90 (07.10.2026 + 232 / 350 / 446 de zile);
  - capacitatea de 10,75 felii pe săptămână;
  - suma feliilor din simplitate (86 + 84 + 84 = 254) și feliile de rezervă, etapă cu etapă;
  - corespondența rând de prag → etapă, pentru toate cele 65 de rânduri v1;
  - numerotarea etapelor și a săptămânilor din §0, §5.3, §5.5 și §8;
  - ritmul nominal al planului și formula de recalibrare, la valorile P50;
  - fiecare marcaj [măsurat], față de sursa lui.
- **Volumul:** peste 70 de afirmații. Cele corecte sunt grupate în cele 45 de rânduri ale tabelului de la final;
  celelalte au dat cele 15 constatări.

## Verdictul

**Nu încă: 1 constatare blocantă, 5 importante, 9 minore.**

- Cifrele copiate din surse sunt aproape toate exacte, inclusiv cele din tabelul T1–T21.
- Problema e la legăturile dintre cifre:
  - planul pe etape și estimatorul numără feliile în unități diferite;
  - pragurile de control ale planului se aprind chiar pe ritmul lui nominal;
  - formula de recalibrare scade de două ori costul plăcii.
- Mai sunt trei abateri de la surse, nespuse owner-ului: momentul jurnalului de erori, calibrarea oracolului și
  articolul R3 din primele etape.
- După constatările 1–6, planul poate merge la owner. Cele minore sunt corecturi de o frază.

---

## Constatările, ordonate după gravitate

### 1. [blocant] Două unități de „felie”: potrivirea cu P50 nu e demonstrată, iar alarmele se aprind pe ritmul nominal

- **Unde:** §0 (r. 49), §5.1 (r. 409–418), §7, riscul 1 (r. 582).
- **Problema:** planul pe etape vine din „simplitate”: 254 de felii de ~½ zi, ~8,5 pe săptămână. Capacitatea,
  bugetul unei felii și pragurile vin însă din estimator, unde același v1 are 311 felii de ~0,4 zile active.
  Planul le pune una lângă alta, fără conversie.
- **Dovada:**
  - simplitate, glosarul (r. 82): felia are „~o jumătate de zi de lucru”; §6 (r. 1257–1279): 254 de felii,
    „~8,5 felii pe săptămână”, ~15 felii de rezervă;
  - estimare §0 pct. 1 și §4.10: 311 felii (suma medianelor); §6.2: 340 de felii planificate și 396 totale la P50,
    capacitatea „~10,75 felii planificate, plus 1,5 de refacere”; §8.4: bugetul de 0,4 zile și pragul de proces
    „r_obs < 1,8”;
  - **socoteala:**
    - 254 de felii la 10,75 pe săptămână dau 23,6 săptămâni (~24,6 cu pasul 0), nu 33;
    - 311 felii la 8,5 pe etapă dau 36,7 etape, adică ~40 de săptămâni cu tampoanele;
    - cele două „33” coincid doar dacă o felie de plan valorează 1,2–1,3 felii de estimator (311 / 254 = 1,22;
      fără rezervele simplitate și fără I16, 308 / 239 = 1,29). Planul nu spune asta nicăieri;
  - **pe ritmul nominal al planului** (8,47 felii pe etapă, 5,4 zile active) ies 1,57 felii pe zi activă, sau 1,73
    fără ziua plăcii. Asta e sub pragul riscului 1 (< 2) și sub pragul de proces din estimare §8.4 (< 1,8). Dacă
    planul merge exact cum e scris, își aprinde singur alarma după etapa 2;
  - **bugetul de 0,4 zile** aplicat unei felii de plan de ~0,5 zile pune pragul de oprire (1,5 × 0,4 = 0,6 zile) la
    ~+20 % peste mărimea ei nominală. Regula „mă opresc și te întreb” s-ar declanșa des, fără motiv real;
  - **„~1 felie de rezervă pe etapă”:** detaliul din simplitate §5.2 are 18 felii de rezervă, puse în 15 etape.
    Celelalte 15 etape n-au niciuna, inclusiv etapele 1–4, cele care alimentează prima recalibrare. Media e 0,6;
  - **„Capacitatea măsurată”:** estimatorul o dă dedusă: 2,5 felii pe zi e [dedus din măsurat], iar f e [dedus].
- **Corectura propusă:** o singură unitate, scrisă explicit în §5.1:
  - „O felie de plan ≈ ½ zi activă ≈ 1,2–1,3 felii de estimator. Cele 254 de felii ale planului ≈ cele 311 ale
    estimatorului. Doar prin această echivalență, 33 de săptămâni ≈ P50; prima recalibrare o verifică.”;
  - capacitatea dată în felii de plan (~8,5–9 pe etapă), iar rezerva, cea reală: 18 felii în 15 etape, plus 3
    tampoane;
  - bugetul unei felii standard: ~0,5 zile active, cu oprirea la ~0,75;
  - semnalul riscului 1 trecut în felii de plan, de exemplu „media etapelor 1–3 sub ~7 felii pe etapă”, ca în
    simplitate §7;
  - la recalibrare, mărimile (S) și ritmul (r) numărate în aceeași unitate.

### 2. [important] Formula de recalibrare scade de două ori placa și refacerile

- **Unde:** §5.1 (r. 419–420) și §0 (r. 50). Amândouă preiau formula din estimare §8.3.
- **Problema:** estimare §8.3 calculează `r_obs = felii acceptate ÷ zile active`, iar zilele active sunt zilele cu
  commit (§8.1). În ele intră și timpul plăcii, și refacerile. Apoi modelul de la §6 mai scade o dată 0,5 zile pe
  placă și f = 1,5 felii.
- **Dovada, la ritmul exact P50** (10,75 felii acceptate în 5,4 zile active):
  - r_obs = 1,99 felii pe zi;
  - după etapa 2 (z = 10,8 zile): r_nou = (25 + 10,8 × 1,99) ÷ 20,8 = 2,24, deci (5,4 − 0,5) × 2,24 − 1,5 = 9,46
    felii pe săptămână;
  - la medianele exacte iese 1 + 311 / 9,46 = 33,9 săptămâni, față de baza de 29,9 din estimare §7: **+13 %**;
  - pe termen lung, r_nou tinde la 1,99, deci 8,25 felii pe săptămână și 38,7 săptămâni: **+29 %**;
  - pragul de 20 % se trece după ~5 etape (z ≈ 28 de zile active), fără nicio întârziere reală.
- **Corectura propusă:** în §5.1, regula scrisă întreagă, nu doar trimiterea la estimare §8:
  - r_obs = (felii acceptate + felii de refacere din plăci) ÷ (zile active − 0,5 × numărul plăcilor);
  - la P50, asta dă (10,75 + 1,5) ÷ 4,9 = 2,5, deci formula e consecventă;
  - sau, mai simplu: feliile nete pe săptămână, comparate direct cu capacitatea.

### 3. [important] Prima recalibrare n-are articolul R3 pe care îl cere estimatorul

- **Unde:** §0 (r. 50), §5.1 (r. 419) și etapele 1–2 din §5.3.
- **Dovada:**
  - estimare §0 pct. 5 și §8.2: „Primele două etape trebuie să conțină un articol greu (R3)”. Exemplul dat e
    I10c, reparațiile cavalier;
  - planul ia detaliul din simplitate (§5.1, r. 412–413). Acolo, reparațiile cavalier vin în etapa 9 (simplitate
    §3.6 pct. 9, r. 378–380; etapa 9, r. 781–782). Etapa 2 aduce doar copia cavalier pe „domeniul curat”;
  - celălalt articol R3 de la început, senderul (F3), e în etapa 3;
  - deci etapele 1 și 2 conțin doar articole R1 și R2.
- **Corectura propusă:** una dintre trei variante:
  - prima recalibrare după etapa 3, cu senderul (F3, R3) inclus;
  - reparațiile cavalier (I10c) mutate în etapa 2;
  - dacă recalibrarea rămâne după etapa 2, scris explicit că factorul R3 rămâne cel inițial (× 2,2 la P90) până la
    primul articol R3 închis.

### 4. [important] Jurnalul de erori de server „din prima zi” vine abia în săptămâna 3

- **Unde:** §3.4 (r. 252), față de §5.3 (etapa 3: „admin P0 + P1”) și §5.5 (r. 506–507).
- **Dovada:**
  - §3.4 scrie „observabilitatea din prima zi: un singur jurnal de erori scris doar de server (`errorLogs`),
    Diagnoza…”;
  - `admin/RAPORT.md` §5.2 pune P0 la „primul deploy pe test (etapa 0–1)”;
  - planul face primul deploy pe test în etapa 1: §8, pașii de configurare (r. 649), și simplitate, etapa 1, felia 8;
  - `LECTII.md` §4.11: „observabilitate din ziua 1: un jurnal de erori de server … și un panou de diagnoză”;
  - toate trei propunerile au pus P0 în etapele 2–3, iar planul a moștenit abaterea fără s-o spună.
- **Corectura propusă:** una dintre două variante:
  - P0 minim (`errorLogs`, `logClientError`, fila Erori) intră în etapa 1, odată cu primul deploy pe test. Atunci
    cheia reCAPTCHA de test și tokenul de debug se mută din etapa 3 în etapa 1;
  - sau §3.4 spune „din etapa 3, înaintea primului deploy pe live”, iar abaterea față de admin §5.2 e scrisă.

### 5. [important] Principiul 4 dă drept măsurat ceva ce n-a măsurat nimeni

- **Unde:** §3.1 pct. 4 (r. 130–131): „aceleași celule de simulare și aceiași octeți de G-code în Node … și în
  browser … [măsurat, s4 §4.5]”.
- **Dovada:**
  - s4 §4.5 compară doar amprentele câmpului de simulare (Node 26 = Edge 154, pe 1–16 fire);
  - nicio sondă n-a comparat octeții G-code în browser: s1 §4.10, s3 și s8 §4.2 au rulat doar în Node;
  - afirmația vine din propunerea „corectitudine” §1 pct. 4 (r. 37–38). Aceeași propunere o pune apoi ca poartă de
    construit: §4.4, nivelul complet, „aceiași octeți de Program” (r. 516);
  - nivelul complet din §4.4 al planului scrie doar „amprenta Node = browser”.
- **Corectura propusă:**
  - „aceleași celule de simulare [măsurat, s4 §4.5]; aceiași octeți de G-code [dedus, devine poartă]”;
  - nivelul complet din §4.4 numește explicit „SHA-256 al programului: Node = Edge”.

### 6. [important] Calibrarea pe lemn contrazice `BRIEF.md` §13, fără să apară ca schimbare

- **Unde:** §4.6 pct. 5 (r. 385–386): „Constantele se folosesc doar la compararea plăcilor, niciodată în oracol.”
- **Dovada:**
  - `BRIEF.md` §13 [decis 06.10]: „Oracolul e calibrat o dată pe lemn.”;
  - toate trei propunerile urmează BRIEF-ul: simplitate, etapa 4 (r. 699–700); valoare (r. 561, 643); corectitudine
    (r. 678);
  - antetul planului: „`BRIEF.md` rămâne autoritatea pentru ce vrea owner-ul”;
  - schimbarea nu apare la §8.
- **Corectura propusă:** una dintre două variante:
  - textul aliniat la BRIEF §13;
  - sau o decizie nouă la §8: „Recomand ca oracolul să rămână necalibrat, deci independent, iar constantele de pe
    placa 4 să intre doar în compararea plăcilor. Implicit: așa.” Decizia rămâne a owner-ului.

### 7. [minor] Lista „ce mută rezultatul cu peste 20 %” e incompletă

- **Unde:** §6 (r. 557–560).
- **Dovada:** estimare §7 are patru factori peste 20 %. Lipsește „Toate articolele R3 ies × 2,2: 36,1 săptămâni,
  +21 %”, pomenit și în estimare §0 pct. 4.
- **Corectura propusă:** rândul adăugat în listă.

### 8. [minor] Mărimile pentru EPS și WMF nu spun cât estima sonda

- **Unde:** §6, pârghiile (r. 565–566); §8, nr. 6 și 8 (r. 625, 627).
- **Dovada:**
  - s12 §2 estima EPS la „2–3 săptămâni de lucru [dedus]” și WMF + EMF la „3–5 zile [dedus]”;
  - planul folosește ~7 felii pentru EPS și ~2 felii pentru WMF; estimatorul (A4) pune EPS la 6 felii, în clasa R3;
  - simplitate §3.6 pct. 7 (r. 355–364) explică reducerea, dar planul n-o preia.
- **Corectura propusă:** câte o frază la nr. 6 și 8: „s12 estima 2–3 săptămâni / 3–5 zile; planul ia ~7 / ~2 felii
  pentru că …; EPS e un articol R3.”

### 9. [minor] Cele 254 de felii nu sunt totalul implicit, iar etapa 15 se umflă

- **Unde:** §0 (r. 49), §5.4 (r. 479–482), §8 nr. 10–11 (r. 629–630).
- **Dovada:**
  - la ambele adaosuri implicitul e „da” (§8: „recomandarea e implicitul”), deci planul implicit are
    254 + 1 + 3 = 258 de felii;
  - pentru copiile în cloud, sursele dau alte cifre: simplitate §8 nr. 7 (r. 1363–1364) „+4–6 felii”; valoare, etapa
    E28: 2 felii; estimare I16: 3 felii, dar pentru un domeniu mai larg. Planul nu spune de unde vine „+3”;
  - etapa 15 trece de la 8 la 11 felii (12–14, cu cifra din simplitate). Asta depășește „~8–9” din §5.1 și plafonul
    de ~11 pe săptămână din estimare §6.2;
  - etapa 9 ajunge la 10 felii, fără nicio rezervă, deși conține reparațiile cavalier (R3).
- **Corectura propusă:**
  - „258 de felii, cu implicitele”;
  - sursa pentru „+3” scrisă;
  - o felie mutată din etapa 15 într-o etapă vecină sau într-un tampon.

### 10. [minor] Data planului pe etape nu e data P50

- **Unde:** §0 (r. 41–49) și §5.2.
- **Dovada:**
  - P50 (33,2 săptămâni) include o săptămână întreagă de pas 0 (estimare §6.1 și §9);
  - cele 33 de săptămâni ale planului pe etape nu includ pasul 0, iar §5.2 îi dă ~3 zile;
  - dacă etapa 1 pornește pe 12.10.2026, săptămâna 33 se încheie pe ~30.05.2027;
  - dacă pornește pe 19.10.2026 (ipoteza din simplitate §2), se încheie pe ~06.06.2027, nu pe ~28.05.
- **Corectura propusă:** lângă P50, data de start a etapei 1 și data de final a planului pe etape.

### 11. [minor] Pachetul pentru ateliere pleacă cu o săptămână mai târziu decât presupune estimatorul

- **Unde:** §0 (r. 27) și §5.5 (r. 501).
- **Dovada:**
  - estimare §6.4: pachetul pleacă „cel târziu în etapa 3”;
  - s8 §5.11: „la sfârșitul etapei în care intră nucleul postului”;
  - propunerea valoare îl trimite în E3;
  - planul îl trimite în săptămâna 4, fiindcă contractele celorlalte controlere intră abia în etapa 4 (simplitate,
    etapa 4, felia 8);
  - atelierele sunt pe drumul critic (`BRIEF.md` §15).
- **Corectura propusă:** o frază care spune abaterea și motivul ei, sau contractele mutate în etapa 3.

### 12. [minor] Termenul pentru A / D și „lotul 1” se contrazic

- **Unde:** §0 (r. 52–53), §8 nr. 1 (r. 607) și §9 pct. 4 (r. 674).
- **Dovada:**
  - §8 nr. 1 spune: „Termen: înainte de etapa 11. Până atunci nimic nu depinde de alegere.”;
  - dar §3.2 pune modelul D în schemă de la început;
  - simplitate §3.6 pct. 8 (r. 369–372): „Decizia trebuie să vină înainte de etapa 1; altfel … o migrare
    (~2 felii)”;
  - §9 pct. 4 spune „Etapa 1 pornește după lotul 1”, deși lotul 1 are termene până la etapa 9 (pachetul de export)
    și etapa 11 (A / D).
- **Corectura propusă:**
  - la nr. 1: „Dacă alegi A după etapa 1: ~2 felii de migrare.”;
  - la §9 pct. 4: „Etapa 1 pornește cu implicitele lotului 1.”

### 13. [minor] Lista de lansare: lipsește etapa 29

- **Unde:** §5.3 (r. 474–475): „închisă pe rând în etapele 3, 9, 27, 28 și 30”.
- **Dovada:**
  - tabelul planului (săptămâna 32, etapa 29) închide „posturile probate pe controlere reale”, care e un punct din
    `BRIEF.md` §8;
  - simplitate §5.3 (r. 1205–1206) închide posturile în etapele 12 și 29.
- **Corectura propusă:** „în etapele 3, 9, 27, 28, 29 și 30”.

### 14. [minor] Marcaje și etichete mai tari decât sursa

- **Unde și dovada:**
  - **§1 (r. 63), „Cost total ~8,7 M tokeni [măsurat]”:** cifra e doar pentru Faza 2, doar agenții, fără
    conversația principală (DEVLOG r. 192). Faza 0 a avut separat 10,3 M (DEVLOG r. 60);
  - **§1 (r. 64), „Toate cele 10 sonde s-au reprodus”:** reproducerea a fost pe s1–s8, admin și prototip (DEVLOG
    r. 125–141), nu pe s11 și s12 din lista de la r. 8. DEVLOG mai notează două rezerve:
    - martorul de procesor din s6 nu mai pică pe mașina liberă;
    - s2 a cerut refacerea mediului Python;
  - **T7, „161 842”:** cifra e [citit] (s3 §4, `LECTII.md` §1), nu măsurată;
  - **T21, „[măsurat]”:** n-are sursă. E citit din §7 al sondelor; simplitate îl marchează [citit];
  - **§3.4 (r. 238), „100 MiB … intacți la cădere”:** viteza e măsurată pe 100 MiB (s7 §4.3), iar proba de cădere
    pe 64 MiB (s7 §4.4).
- **Corectura propusă:** etichetele corectate ca mai sus.

### 15. [minor] Trimiteri care spun mai mult decât sursa

- **Unde și dovada:**
  - **§3.4 (r. 219):** „Schimbarea sculei, pornirea axului și pauza sunt evenimente în IR [citit, s8 §5.4]”. s8 §5.4
    vorbește doar de schimbarea sculei. Pauza e un parametru al mașinii, scris de post (s8 §5.5);
  - **§3.6 (r. 300):** „oracolul cu distanța exactă și controalele negative ajung [s3-V]”. s3-V §5.6 cere și „un al
    doilea oracol, prin eșantionare densă, … pe un set mic în CI”. Simplitate §4.1 îl păstra, dar §4.1 din plan l-a
    scos;
  - **T15:** cifrele din s11 §4.1–4.2 sunt corecte, dar s11 §5.2 recomandă opusul (datele grele ținute în workere).
    Planul nu spune că se abate de la sondă.
- **Corectura propusă:**
  - fiecare trimitere spune doar ce scrie în sursă;
  - al doilea oracol pentru V-carve revine în §4.1, sau abaterea e scrisă;
  - la T15: „mă abat de la s11 §5.2, fiindcă…”.

---

## Ce am verificat și e corect

| # | Afirmația din plan | Sursa | Ce spune sursa | Verdict |
|---:|---|---|---|---|
| 1 | 65 de rânduri v1: A 11, B 14, C 24, D 10, F 6 | `ACOPERIRE` A–F | aceleași cifre; 88 de rânduri în total | OK |
| 2 | Fiecare rând v1 are o etapă (§5.3) | `ACOPERIRE` + simplitate §5.3 | 65 din 65, verificate rând cu rând | OK |
| 3 | Cele 8 funcții din §10, în etapele 5, 11, 13 (4 funcții), 15 și 28 | `BRIEF.md` §10; simplitate §5.3 | 8 funcții v1, în aceleași etape | OK |
| 4 | 254 de felii în 30 de etape + 3 tampoane | simplitate §5.1 | 86 + 84 + 84 = 254 | OK ca număr (vezi 1) |
| 5 | Numerotarea: T1 = săpt. 11, T2 = 22, T3 = 31, etapa 30 = săpt. 33 | `PLAN` §5.3 | consecventă | OK |
| 6 | Trimiterile la săptămâni din §0, §5.5 și §8: P2 = 15, P2+ = 16, P3 = 29, P4 = 30, runda 3 = 18, anvelopa = 24 | `PLAN` §5.3 | etapele 14, 15, 27, 28, 17 și 22 | OK |
| 7 | Prima piesă în săpt. 1; live în 3; pachetul în 4; runda 2 în 9; rezultatele în etapele 12 și 29 | simplitate §5.4 | la fel | OK |
| 8 | Adminul: P0 + P1 în etapa 3, P2 în 14, P2+ în 15, P3 în 27, P4 în 28 (~13 felii) | simplitate §5.3; admin §5.2 (12–17 felii) | aceleași etape; în interval | OK (pentru P0, vezi 4) |
| 9 | 12 file de admin, fila AI mai târziu | admin §5.2 | lista de 12, fără AI, cu Diagnoză | OK |
| 10 | P10 / P50 / P80 / P90 = 18,7 / 33,2 / 50,0 / 63,7 săptămâni | estimare §6.2 | identic | OK |
| 11 | ~28.05.2027 / ~22.09.2027 / ~27.12.2027 | estimare §6.2; recalculat | 07.10.2026 + 232 / 350 / 446 de zile | OK |
| 12 | Formula 1 + felii / ((D − 0,5) · r − f) | estimare §6.1 | identică | OK (vezi 2) |
| 13 | 5,4 zile active pe săptămână (97 din 127 de zile) | estimare §1.1 | 5,35 | OK |
| 14 | 2,5 felii pe zi; 0,5 zile pe placă; 1,5 felii de refacere; R1 × 1,3, R2 × 1,6, R3 × 2,2 | estimare §3, §6.1 | identic | OK |
| 15 | 10,75 felii pe săptămână la P50 | estimare §6.2 | (5,4 − 0,5) × 2,5 − 1,5 = 10,75 | OK ca cifră (vezi 1) |
| 16 | Sensibilitățile +47 %, +45 %, −26 %, +29 % | estimare §7 | identic | OK (lipsește una, vezi 7) |
| 17 | Deciziile deschise mută fiecare rezultatul sub 3 % | estimare §7 | +2, −2, +1, −1 % | OK |
| 18 | Pârghiile −7, −2, −5, −3, −3, −5, −2 | simplitate §6 | identic, total −27 | OK |
| 19 | Trei tranșe: 10 sonde; 3 verificări + 2 sonde; 3 propuneri + estimator | DEVLOG r. 108, 151, 170 | la fel | OK |
| 20 | Fiecare verificare a infirmat o afirmație decisivă | s1-V §3 (C1b, C2a, C2b); s3-V §3 (C1a); s6-V §3 (W) | la fel | OK |
| 21 | 5 emitenți de G-code; clasa 1; 84 din 326 de suite; originea oglindită 104 zile | `LECTII.md` §1, §2.1, §2.2 | la fel (104 / 112 zile) | OK |
| 22 | O copie de 50 000 de noduri costă ~0,6 s | s7 §4.6 | 613 ms | OK |
| 23 | Pensula: 0,3–2,6 ms; Uint16: 0,15–0,46 µm | s5 §4.6, §2 | 0,27–2,61 ms; 0,15–0,46 µm | OK |
| 24 | IndexedDB, 100 MiB: 218 / 84 ms; zip identic în fusuri orare diferite | s7 §4.3, §4.5 | la fel (3 fusuri) | OK |
| 25 | Regiunile `nam5` / `europe-central2` / `us-central1`; tokenul de debug doar pe test | `BRIEF.md` §7; admin §5.3, §6 | la fel | OK |
| 26 | Arcele se aplatizează în post, nu în nucleu; G2 ↔ G3 la oglindire [dedus] | s1 §5.7; corectitudine r. 214–215 | la fel | OK |
| 27 | T1: cercul rămâne 2 arce; 3,6·10⁻¹⁴ mm | s1 §4.2, §4.6 | la fel | OK |
| 28 | T2: 8 / 16 cubice (0,001 mm; r = 50 / 1 220) | s1 §4.6 | la fel | OK |
| 29 | T3: 757 din 4 000 de puncte; 41 din 65 de caractere | s6 §4.6; s3 §4 | la fel | OK |
| 30 | T4: ≤ 1,3·10⁻⁴; 5,1·10⁻⁴; 0,57 mm; 3,3·10⁻¹³; CanvasKit 3,3 MB | s1-V §2, §4.6, §4.8 | la fel | OK |
| 31 | T5: 32/32; 47/240. T6: 1,005 × toleranța | s1-V §2, §4.5 | 1,0053 × (1,0076 × la buzunare) | OK |
| 32 | T7: 8 222 de linii; 0,0163 mm la h = 0,05; 0,08 s față de 16–19 s | s3 §4; s3-V §2, §4(d) | la fel | OK (pentru 161 842, vezi 14) |
| 33 | T9: 200 000 de arce, 0 erori; 6 diferențe; 3 / 5 zecimale; gărzile; 70 de octeți; 4 strategii | s8 §2, §4.2, §5 | la fel | OK |
| 34 | T10: 0 celule greșite pe 16 piese; Node = Edge pe 1–16 fire; 0,25 / 0,1 mm | s4 §2, §4.5, §5.7 | la fel | OK |
| 35 | T11: 2,67 M de puncte în 2,2 s pe 16 workere; GPU ≠ CPU cu ≤ 0,18 µm | s5 §4.5; s4 §4.5 | la fel | OK |
| 36 | T12: eșantionarea în nod sapă până la 5 mm; câmpul conservativ: 0 scobituri | s5 §2 | la fel | OK |
| 37 | T13: clicul în 24 ms; 456–552 ms pe firul principal; LINE_STRIP la 60 Hz pe iGPU; criteriul planului B | s6-V §2, §4.2, §4.4, §5.5 | la fel | OK |
| 38 | T14: COOP + COEP strică popup-ul și redirectul; × 1,10–1,23 și × 0,97 | s11 §2 | la fel | OK |
| 39 | T15: același cost cu sau fără date ținute în workere; +64 MB; +60–190 ms | s11 §4.1–4.3, §6 | la fel | OK ca cifre (vezi 15) |
| 40 | T16: 10/10; 318 ms; 3,3 KB; ~190 B față de 96 MB. T17: 9/9, cu martorul picat | s7 §2, §4.2, §4.6; DEVLOG r. 138 | la fel (95,8 MB) | OK |
| 41 | T18: 108/108; 65/65; scriitorul R12 de ~80 de linii. T19: N = 20,000000 mm | s2 §2, §4 | la fel | OK |
| 42 | §3.6: PixiJS greșește cu 29 px (prezis 29,149); WASM 1,00–1,08×; `move()` neprobat la cădere | s6 §2 și anexa; s4 §4.4 + DEVLOG r. 132; s7 §6 | la fel | OK |
| 43 | §4: 281 din 281 și 27 din 54; CI mort 16 zile; bancul verde pe 3 sabotaje; `dwg2dxf` e GPL; o metrică intră doar după ce o otravă o înroșește | `LECTII.md` §0, §1; s12 §2; s4 §5.12 | la fel | OK |
| 44 | §5.6: 60 de noduri față de 2; 26 de gesturi față de 6; 39 față de 9; decalajul de 50 mm; etapa 11 −2 felii, etapa 23 +1 | prototip §2, §4; simplitate §5.5 | la fel | OK |
| 45 | §8: cele trei alegeri ale prototipului; pachetul (5 fișiere + `CITESTE.md`); ODA 7 500 $; DGK / PIC fără specificație; jurnalul cu uid pseudonim, păstrat 90 de zile; creditele „nu”; ~30 de reliefuri; termenele, față de tabelul §5.3 | prototip §5; dosarul `pachet-owner/`; s12 §2; admin §5.4; valoare §8.2 nr. 9; `PLAN` §5.3 | la fel | OK |
