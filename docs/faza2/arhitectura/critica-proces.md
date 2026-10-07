# Critica planului: procesul și fezabilitatea

**Faza 2, critica adversarială · 07.10.2026 · lentila „proces și fezabilitate”.** Doar citire: n-am rulat cod, n-am
folosit git și n-am atins alt fișier în afară de acesta.

**Marcaje:** [citit] = din documente, cu sursa; [măsurat] = numărat de mine în fișiere (grep, awk); [dedus] = calculul
sau raționamentul meu, scris ca să se poată reface. „r.” = rândul din fișier.

---

## Ce am verificat

- `PLAN.md`, integral.
- Sursele:
  - `BRIEF.md` (integral), `LECTII.md` (§0–§2, §3.1, §4, §5.5–§5.7, §7), `CLAUDE.md`, `DEVLOG.md`;
  - `ACOPERIRE-ARTCAM-DESKPROTO.md` (rândurile v1, numărate pe grupe);
  - `arhitectura/estimare.md` (integral) și `arhitectura/propunere-simplitate.md` (§3.6, §5, §6–§8);
  - din `propunere-corectitudine.md` și `propunere-valoare.md`: etapele 1–4, A / D, capabilitățile, axa A;
  - `admin/RAPORT.md` (§1–§2, §5–§7), `prototip-planse/RAPORT.md` (§1–§2), `sonde/s1` (refacerea), `s4` §5–§6,
    `s8` (Anexa B).
- Cele șase întrebări ale lentilei:
  1. săptămâna 1 și placa 1;
  2. dependențele dintre etape;
  3. încărcarea owner-ului;
  4. regulile de proces, la cadența scrisă;
  5. publicarea pe live din etapa 3;
  6. deciziile owner-ului amânate sau scăpate.

## Verdictul

**Planul nu pleacă la owner așa.** Două constatări sunt blocante, amândouă despre decizii ale owner-ului:
- planul nu-i pune întrebarea pe care `BRIEF.md` §15 o rezervă exact pentru momentul ăsta: beta sau v1, cu riscul
  principal, „drumul lung fără utilizatori externi”;
- amână alegerea A / D contra `BRIEF.md` §9, pe o afirmație falsă („până atunci nimic nu depinde de alegere”).

Arhitectura și spina de dovadă nu le pun în discuție. Procesul are însă locuri unde poate reface tiparul din
`LECTII.md` §2.3:
- o săptămână 1 de ~1,5 ori mai mare decât debitul măsurat;
- controale de ritm fără o unitate comună;
- owner-ul cu ~10 lucruri deschise în săptămânile 1 și 3;
- dovada după funcție în etapele 1–3 și fundația „din ziua 1” fără etapă;
- înlocuirea live-ului fără un plan pentru aplicația veche;
- un mediu de build (Drive) pe care sondele l-au ocolit.

Corecturile sunt de ordine și de text. Niciuna nu cere altă arhitectură.

| Gravitate | Câte |
|---|---:|
| blocant | 2 |
| important | 14 |
| minor | 5 |

---

## Constatările

### Blocante

#### B1. Lipsesc riscul principal și întrebarea „beta sau v1” (`BRIEF.md` §15)

- **Unde:** §6 (pârghiile), §7 (riscurile), §8 (lotul 1).
- **Problema:** `BRIEF.md` §15 numește „drumul lung fără utilizatori externi” riscul principal și îi lasă owner-ului,
  după estimarea din Faza 2, reconsiderarea beta-ului sau a lui v1. Planul aduce estimarea (P50 ~33, P80 ~50, P90 ~64
  de săptămâni), dar:
  - nu pune întrebarea: cuvântul „beta” nu apare în plan [măsurat];
  - tabelul de riscuri n-are riscul principal;
  - pârghiile de la §6 sunt doar tăieri de funcții, „dacă estimarea crește”, cu „Nu le recomand”.
- **Dovada:** `BRIEF.md` r. 266–270 și r. 56–59; `estimare.md` §7 (r. 471–473) și §8.4 (r. 524–525) trimit la alegerea
  asta; `propunere-simplitate.md` r. 1314–1315: cel mai devreme punct cu o buclă 2D completă pentru un străin e
  sfârșitul etapei 13 (săptămâna 14).
- **Corectura:**
  - în lotul 1, o decizie cu implicitul din `BRIEF.md` §4 (lansare la v1 complet, fără beta): „lansez la v1 complet
    (P50 ~mai 2027, P90 ~decembrie 2027) sau deschid o probă închisă cu 1–2 ateliere după etapa 13 (bucla 2D) sau 17”;
  - un rând de risc „drumul lung fără utilizatori externi”, cu semnalul (de exemplu P80 recalculat peste 50 de
    săptămâni) și cu momentele în care întrebarea revine: tampoanele T1 și T2.

#### B2. A / D amânat contra `BRIEF.md` §9, pe o afirmație falsă

- **Unde:** §8 #1 (r. 601–607), §0 (r. 52), §3.2, §3.4, §5.6, §9.4.
- **Problema:** `BRIEF.md` §9 cere ca planul să se aprobe cu modelul de planșe ales. Planul pune A / D în lotul 1, „la
  aprobare”, dar cu „Termen: înainte de etapa 11. Până atunci nimic nu depinde de alegere.” Afirmația e falsă în
  propriul plan:
  - modelul din §3.2 e D (piese, foi, instanțe), iar drumul care mișcă mașina trece de la primul program prin „IR al
    piesei × matricea instanței” (§3.4);
  - etapa 1, în detaliul la care trimite §5.1, construiește „arborele D cu nivelul doi ascuns”;
  - pe live există documente din săptămâna 3;
  - §5.6 spune singur că „schema planșelor se îngheață după alegere”.

  Rezultatul ar fi 10 etape pe o schemă neînghețată, adică tiparul planșelor din ediția întâi (4 containere în 6 zile,
  `LECTII.md` §0.7, §5.5). Iar §5.6 dă alegerea A ca „−2 felii”, fără migrarea documentelor D deja scrise.
- **Dovada:** `BRIEF.md` r. 158–161; `propunere-simplitate.md` r. 566 și r. 371–372 (decizia „înainte de etapa 1”,
  altfel o migrare de ~2 felii); `propunere-valoare.md` r. 424–425 semnalase explicit `BRIEF.md` §9, iar semnalul s-a
  pierdut în plan.
- **Corectura:** A / D și cele trei alegeri ale prototipului se decid la aprobare, cum cere `BRIEF.md` §9 (prototipul e
  gata). Dacă owner-ul vrea totuși să amâne, planul o scrie ca schimbare a `BRIEF.md` §9, cu prețul real: etapa 1
  construiește D, iar A ales după etapa 3 costă o migrare a documentelor de pe live (+~2 felii). Fraza „nimic nu
  depinde” se scoate.

### Importante

#### I1. Săptămâna 1 nu încape în debitul măsurat

- **Unde:** §0 (r. 25), §5.3 (etapa 1), §5.5; detaliul e în `propunere-simplitate.md` §5.2, etapa 1.
- **Problema:** cele 8 felii ale etapei 1 cuprind, în articolele estimatorului: I1 și I2 întregi (3 felii), I5 (1),
  aproape tot I20 (2), plus părți din I3, I4, I7, I8, I11, I12, I13, I19 și B1.
  - Cu fracțiile mele, asta face ~13–18 felii ale estimatorului: 5,2–7,2 zile active la 2,5 pe zi, plus 0,5 zile
    pentru placă. Săptămâna are 5,4 zile active la P50 și 4,0 la P10 [dedus].
  - Estimatorul scrie singur că peste ~11 felii pe săptămână „contrazice debitul măsurat”.
  - E prima săptămână cu uneltele reale (Vite, CI pe Ubuntu, Edge, Firebase CLI). Ritmul din august nu conține frecarea
    asta.
  - Felia 1 (I1 + I2, ~1,2 zile) trece singură de 1,5 × bugetul de 0,4 zile, deci regula de oprire sună din prima zi.
  - Felia 5 face profilul cu „offset analitic, încă fără cavalier”: o a doua cale, aruncată în etapa 2, contra §3.1.1.
- **Dovada:** `estimare.md` §4.1 (r. 211–236), §6.2 (r. 425–426), §8.4 (r. 521–523); `propunere-simplitate.md`
  r. 563–578. Corectitudinea (S1, r. 644–660) și valoarea (E1, r. 608–623) pun sămânța L / A / C în săptămâna 1 și nu
  pun pânza completă.
- **Corectura:** etapa 1 tăiată la drumul minim până la placă:
  - scheletul și CI-ul; documentul v0 cu sămânța L / A / C (fără calea analitică);
  - IR, profil, post, export; oracolul s4 cu invariantele (vezi I5);
  - deploy doar de hosting pe test, după export;
  - o pagină de modele parametrice, cu previzualizare SVG, în locul pânzei WebGL2 și al workerului de randare (care
    trec în etapele 2–3).

  Lista funcțiilor vechi de șters pe test trece în etapa 3, unde se publică primele funcții. „Prima piesă la sfârșitul
  săptămânii 1” rămâne țintă, cu regula de alunecare de la I7.

#### I2. Plăcile 1 și 2 se taie fără senderul nostru, iar planul nu spune cu ce

- **Unde:** §4.6, §5.1 (r. 414), §5.3 (etapele 1–2).
- **Problema:** senderul vine în etapa 3, iar planul nu spune cu ce se taie plăcile 1–2. Urmările:
  - pașii 2 și 4 din §4.6 (transcrierea, reluarea pe emulator) nu se aplică înainte de etapa 3: emulatorul e felia 3
    a etapei 3;
  - „prima felie a fiecărei etape trece transcrierea plăcii precedente” n-are obiect în etapele 2 și 3;
  - nimic nu asigură că senderul folosit trimite octeții exportați neschimbați.
- **Dovada:** `propunere-simplitate.md` r. 636; corectitudinea (r. 665) și valoarea (r. 605–606) scriu explicit: „cu
  senderul folosit azi de owner”.
- **Corectura:** pentru plăcile 1–2 se scrie numele senderului, ce se păstrează (programul cu hash, cotele), ce nu
  (transcrierea), și că cele două programe se rejoacă retroactiv pe emulator în etapa 3. Dacă senderul de azi e cel din
  aplicația veche, se notează că dispare de pe live în săptămâna 3, odată cu venirea celui nou.

#### I3. Controalele de ritm nu se pot aplica așa cum sunt scrise

- **Unde:** §5.1 (r. 409–420), §6.
- **Problema:**
  1. **Unitatea.** §5.1 compară 8–9 felii „simplitate” (~0,5 zile, `propunere-simplitate.md` r. 1278) cu capacitatea
     estimatorului, 10,75 felii de ~0,4 zile (`estimare.md` §3), și scoate „~1 felie de rezervă pe etapă”.
     - Pe același scop, simplitatea are 254 de felii (239 fără rezervă), iar estimatorul 311. O felie de plan ≈ 1,25–1,3
       felii ale estimatorului, deci 8,5 felii de plan ≈ toată capacitatea P50: rezerva pe etapă e ~0 [dedus].
     - Recalibrarea (`estimare.md` §8.3) are prior-ul în felii ale estimatorului. Dacă `r_obs` se numără în felii de
       plan, la ritm nominal ar arăta ~15 % încetinire după etapa 2 și ar trece pragul de 20 % în jurul etapelor 4–6,
       fără nicio încetinire reală [dedus]. Dacă și `k_c` e numărat amestecat, erorile se pot anula și pot ascunde o
       încetinire adevărată.
  2. **Condițiile primei recalibrări.** `estimare.md` §8.2 cere în primele două etape un articol R3 (exemplul dat: I10c,
     reparațiile cavalier). Planul le are în etapa 9 (`propunere-simplitate.md` r. 781–782), iar următorul R3 (senderul)
     e în etapa 3. După etapa 2 s-ar recalibra fără R3 și cu refacerea unei singure plăci.
  3. **Oprirea la 1,5 ×.**
     - Bugetul e în „zile active” (zile cu commit), care nu cronometrează o felie. Estimatorul cerea măsurarea orelor în
       etapa 1 și buget în ore de acolo încolo (r. 521–523); fraza s-a pierdut în plan.
     - Cu împrăștierile estimatorului (P90 / P50 = 1,3 / 1,6 / 2,2), trec de 1,5 × ~2 %, ~13 % și ~25 % din felii;
       ponderat, ~13 %, adică ~1 oprire pe săptămână [dedus].
     - Planul nu spune ce se face cât owner-ul nu răspunde, iar `CLAUDE.md` cere și ca întrebările să se strângă și să se
       pună grupat.
- **Corectura:**
  1. O singură unitate, felia estimatorului. Fiecare `etapa-NN.md` trece feliile cu articolul estimatorului (I…, A…,
     B…) și cu estimarea în felii ale lui; `r_obs` și `k_c` se numără la fel. În §5.1: „rezerva e ~0 la P50; tampoanele
     acoperă coada sumei (340 față de 311)”.
  2. Prima recalibrare după etapa 3 (are senderul R3 și refacerile a două plăci), cum propunea chiar simplitatea
     (etapele 3 și 6, r. 1290). Sau portul reparațiilor cavalier în etapa 2, ca în corectitudine (S2, r. 701–702).
  3. Bugetul feliei în ore, din `Started` / `Completed`, scris în `etapa-NN.md`. La depășire: felia se parchează pe o
     ramură WIP, întrebarea intră în lista grupată, lucrul continuă cu o felie independentă. Oprire completă doar pentru
     o felie care mișcă mașina sau la a doua depășire din aceeași etapă. E o interpretare a regulii din `CLAUDE.md`, deci
     o aprobă owner-ul.

#### I4. Lista de 5 e depășită de plan, iar timpul owner-ului nu e bugetat

- **Unde:** §8, §5.2, §9.4, §7 (riscul 9).
- **Problema:**
  - **Limita de 5** (`BRIEF.md` r. 130, repetată în §8 r. 597) e încălcată de plan [dedus din §5.2, §5.5, §8]:
    - la aprobare și în etapa 1 sunt deschise odată aprobarea, verdictele din `PORTARE.md` („decizi tu pe el”), cele 5
      din lotul 1, toleranța (#18, „etapa 1”), 2 pași de configurare din „etapa 1” și placa 1: ~10;
    - în săptămâna 3: #13, #14, cheia reCAPTCHA, mediul `live`, WIF pe ambele proiecte, exportul pe live, lista
      funcțiilor de pe live, placa de contact, prima aprobare pe live, placa 3, plus #1 și #2 încă deschise: ~10.
  - **§9.4** spune „Etapa 1 pornește după lotul 1”, dar lotul 1 are termene în etapele 2, 9 și 11.
  - **Plăcile nu sunt dimensionate.** „Plăci mici (≤ 30 min la mașină)” nu e verificat pe plăcile din plan:
    - placa 3 = T0–T7, fiecare întâi în aer, apoi în MDF (`s8` r. 542), cu cronometru;
    - placa 12 cere lipire și rindeluire, 13 un comparator, 19 un cântar;
    - lista de unelte din §8 n-are șublerul de adâncime și lerele pe care le avea `propunere-simplitate.md` §5.0.
  - **`PORTARE.md`** cere verdict pe toți candidații înainte de etapa 1, deși etapele 1–3 au nevoie doar de câțiva
    (valoarea i-a ordonat pe etape, r. 593–596).
  - **Sărbătorile:** cu etapa 1 pornită pe 12 sau pe 19.10, intervalul 21.12–03.01 cade în săptămânile 10–12 (etapa 10,
    T1 sau etapa 11, după data de start). Planul nu leagă tamponul de sărbători, deci o etapă cu placă poate cădea pe ele
    (corectitudinea avea pauza scrisă, r. 593–594).
  - **Implicitul lipsește** la #19, la #21 și la lotul 1 #2–#4 (acțiuni, nu alegeri), deși §8 spune „recomandarea e
    implicitul”.
- **Corectura:**
  - un singur fișier-coadă (de exemplu `docs/OWNER.md`): cel mult 5 rânduri deschise, restul „se deschide la etapa N”;
  - lotul 1 redus la ce cere etapa 1: aprobarea, A / D, verdictele `PORTARE.md` pentru candidații etapelor 1–3,
    toleranța și lista de cumpărături cu termenele de livrare (placa de contact, senzorul de lungime, șublerul de
    adâncime, lerele, comparatorul). Atelierele și fișierele reale se deschid în săptămâna 2;
  - un buget de timp al owner-ului pe etapă (de exemplu ≤ 2 h: mașina, măsurătorile, deciziile), măsurat în DEVLOG, cu
    plăcile dimensionate după el;
  - tamponul T1 așezat explicit pe sărbători.

#### I5. Dovada vine după funcție chiar în etapele 1–3

- **Unde:** §3.1 (principiul 3), §4.1, §4.2, §5.4.3, T3.
- **Problema:** principiul cere oracolul înaintea primei funcții, iar §4.2 cere poarta pe orice program. Totuși, în
  etapa 1 intră doar invarianta pasului (§5.4.3); restul porții (piesa, rapidele, limitele, controlerul, axul) vine în
  etapa 4. Între timp:
  - rapidele, limitele și pornirea axului există de la primul program (etapa 1);
  - intrările și urechile față de regiunea păstrată (clasa de defect care a stat ascunsă 105 zile) intră în etapa 2 și
    pe live în etapa 3, judecate doar de placă;
  - T3 cere normalizarea SVG-urilor `nonzero` la import, cu PathKit + R3, dar importul SVG e în etapa 2, iar fațada
    PathKit în etapa 6;
  - pânza (etapa 1) n-are oracolul ei din §4.1 în nicio felie.
- **Dovada:** `PLAN.md` r. 128–129, r. 327–337, r. 487–488, r. 266; `propunere-simplitate.md` r. 606–607 (SVG), r. 727–728
  (PathKit), r. 675 (poarta în etapa 4); `LECTII.md` r. 122 (lead-in-ul, 105 / 113 zile).
- **Corectura:**
  - invariantele 2, 3, 5, 6 și 7 intră în etapele 1–2, pe oracolul s4 adus în etapa 1; regiunea păstrată, calculată de
    oracol din geometria de intrare, intră înaintea intrărilor și urechilor;
  - până la fațada PathKit, importul SVG refuză explicit fișierele `nonzero` cu contururi suprapuse sau cu găuri
    orientate ca exteriorul; altfel fațada minimă (reuniunea + R3) intră în etapa 2;
  - oracolul pânzei intră în aceeași felie cu pânza.

#### I6. Fundația „din ziua 1” n-are etapă, iar capabilitățile (`BRIEF.md` §4) sunt amânate

- **Unde:** §3.2, §3.3, §3.4, §4.5, §4.6, §5.3.
- **Problema:** planul cere din ziua 1 lucruri pe care niciun rând al tabelului de etape și nicio felie din
  `propunere-simplitate.md` §5.2 nu le construiesc:
  - **registrul de acțiuni** (§3.2, §3.3; `LECTII.md` §4.7: „înaintea oricărei suprafețe”): nicăieri;
  - **capabilitatea pe fiecare acțiune.** `BRIEF.md` §4 o vrea „din ziua 1, ca împărțirea să nu ceară refactorizare”;
    în detaliu apare abia în etapa 14 (r. 875–876), adică retrofitată peste 13 etape de funcții. E o decizie a owner-ului
    amânată fără s-o spună;
  - **bancul vizual** (§4.5, pe care owner-ul îl deschide la fiecare sfârșit de etapă) și **unealta de otrăvuri**:
    nicăieri;
  - **învelișul interfeței** (panouri, proprietăți, proiecte, setări, temă): doar câmpul numeric;
  - **placa de regresie** (prima apariție: „retăierea” din T1) și **formularul plăcii** (§4.6.3): fără definiție;
  - **P0** (jurnalul de erori de server) vine în etapa 3, deși hostingul de test merge din etapa 1, `admin/RAPORT.md`
    §5.2 îl pune la „primul deploy pe test”, iar §3.4 spune „din prima zi”.

  Estimatorul le socotește separat: I6 (2), I18 (3), I19 (5), adică ~8–10 felii, cam o săptămână care lipsește din cele
  254.
- **Dovada:** `estimare.md` r. 218, 233, 234; corectitudinea (S4, r. 773–774) și valoarea (E1 r. 610, F5.3 r. 242–243) le
  aveau devreme; `admin/RAPORT.md` r. 500; `PLAN.md` r. 252.
- **Corectura:**
  - registrul de acțiuni, cu câmpul de capabilitate (toate permise până la facturare, ca la valoare F5.3), și regula de
    import în etapa 1;
  - bancul vizual v1 în etapa 2–3, unealta de otrăvuri în etapa 4, învelișul interfeței pe etapele 2–6, placa de
    regresie definită în etapa 4 (după calibrare);
  - P0 odată cu primul deploy de funcții, scris explicit;
  - cele ~10 felii socotite în plan, cu potrivirea cu P50 reverificată.

#### I7. Ce se întâmplă când o placă pică sau întârzie nu e definit

- **Unde:** §5.1 (r. 414–416), §4.6.4, §7 (riscul 9).
- **Problema:** planul spune doar „o placă picată ține etapa pe test”. Rămân deschise:
  - dacă etapa N+1 pornește înainte ca placa N să fie tăiată (`propunere-simplitate.md` r. 1289: „nu oprește lucrul”);
  - cum se publică N+1, când `main` e liniar și o conține pe N, cea picată;
  - unde se retaie: pe placa următoare?
  - dacă etapa e cutie de timp sau de conținut;
  - din ce build taie owner-ul placa, când testul primește deja feliile etapei N+1 („pe test, oricând”).
- **Corectura:**
  - cel mult o placă netăiată; la a doua, lucrul trece pe felii fără mașină (interfață, import, admin) până se taie;
  - o placă picată blochează publicarea pe live a tuturor etapelor de după ea, până trece retăierea (sau etapele au
    steaguri de activare, cu prețul lor spus);
  - retăierea intră pe placa următoare, cu cotele ei;
  - etapa e cutie de timp: ce nu încape trece în etapa următoare, iar fișa plăcii se reduce la ce s-a livrat;
  - placa se taie dintr-un build fixat al etapei (de exemplu un canal de previzualizare Firebase Hosting pe sha-ul
    etapei), nu din testul care se mișcă.

#### I8. Înlocuirea live-ului din săptămâna 3 lasă afară aplicația veche și codul ei

- **Unde:** §5.5 (r. 495–498), §8 #5 și pașii de configurare.
- **Problema:** lista „înainte” (exportul Firestore, lista funcțiilor, extensiile neatinse) nu acoperă:
  - **owner-ul ca utilizator** (`BRIEF.md` §1). Din săptămâna 3 aplicația veche dispare, funcțiile ei sunt șterse, iar
    cea nouă știe doar profilul: buzunarul vine în săptămâna 5, textul în 7, V-carve-ul în 8, relieful în 19. Decizia #5
    spune doar „codul ei rămâne în GitHub și local”;
  - **același origin:** service worker-ul vechi și datele locale ale aplicației vechi (`LECTII.md` r. 102: 47 de chei
    `localStorage`, 4 baze IndexedDB). Nimic nu spune că aplicația nouă nu atinge stocarea străină sau că owner-ul își
    exportă înainte ce vrea să păstreze;
  - **utilizatorii:** `LECTII.md` §7.4 cerea renumărarea din consolă, iar valoarea o avea în lotul 1 (r. 598); planul a
    pierdut-o;
  - **codul vechi poate încă publica pe aceleași proiecte.** Din etapa 1, proiectul de test e al aplicației noi, deci
    „reparația de urgență” permisă de `BRIEF.md` §14 nu mai are drumul test → live. După săptămâna 3, un deploy din
    repo-ul vechi ar suprascrie aplicația nouă. Arhivarea din `BRIEF.md` §14 nu e în nicio etapă;
  - **datele vechi rămân în aceeași bază:** colecțiile vechi și documentele extensiei Stripe din ediția întâi (cu cheia
    de test) pot fi citite de dreptul de acces nou (etapa 14) sau de Venituri (etapa 27) [dedus];
  - **„extensiile neatinse”** n-are mecanism (deploy doar cu ținte `--only`, lista extensiilor înainte și după), iar
    PITR-ul e „oricând”.
- **Corectura:**
  - o felie „comutarea” în etapa 3, cu lista de mai sus, repetată întâi pe test: build-ul vechi instalat, apoi cel nou;
    se verifică preluarea de către service worker, stocarea neatinsă și revenirea din istoricul de hosting;
  - PITR înainte de etapa 3;
  - repo-ul vechi oprit de la publicare din etapa 1 și arhivat în etapa 3;
  - un spațiu de nume sau o arhivare pentru colecțiile vechi, decise înainte de etapa 14;
  - decizia #5 îi spune owner-ului consecința și îi dă alternativa: o copie locală a aplicației vechi, verificată pe
    calculatorul de la mașină înainte de săptămâna 3, sau prima publicare pe live mutată după etapa în care aplicația
    nouă îi acoperă lucrul.

#### I9. Axa A a dispărut (`BRIEF.md` §12)

- **Unde:** glosarul (#12, #16, #20), T9, T20, §5.3.
- **Problema:** `BRIEF.md` §12 cere ca „senderul și postul să știe de A”. Pragul cere din prima zi montaje cu axă și
  posturi cu A / B, iar `LECTII.md` §4.10 cere „N axe din prima zi”. În plan:
  - IR-ul are „Z la ambele capete” (3 axe);
  - montajul și profilul mașinii n-au axe;
  - contractele și senderul nu pomenesc A;
  - `s8` pune grblHAL / FluidNC cu axa A a owner-ului în setul de probă, planul nu.

  Rotativul rămâne în v1.x, dar pregătirea lui era o decizie a owner-ului, iar planul a scăpat-o.
- **Dovada:** `BRIEF.md` r. 233–236; `ACOPERIRE-ARTCAM-DESKPROTO.md` r. 143–150; `LECTII.md` r. 386–387 și r. 455; `s8`
  r. 565; corectitudinea (r. 1031): „tipurile pentru N axe”.
- **Corectura:** în etapele 1–3, tipurile pe N axe: profilul mașinii cu lista axelor, IR-ul cu A opțional, contractul cu
  cuvântul și unitatea axei rotative, senderul cu Known / Unknown pe axă, simularea care refuză explicit A până în v1.x.
  Sau owner-ul scoate cerința, în scris.

#### I10. Configurarea „din prima săptămână” (`BRIEF.md` §7) e mutată spre lansare

- **Unde:** §8 (pașii de configurare), §6 (porțile externe), §7 (riscul 8).
- **Problema:** `BRIEF.md` §7: configurarea owner-ului „se face în prima săptămână, altfel blochează lansarea mai
  târziu”. Planul mută DNS-ul pentru e-mail în etapa 15, iar entitatea juridică, adresa de firmă și textele juridice în
  etapa 27 (săptămâna 29, cu 4 săptămâni înainte de lansare). Totuși, §6 le numește porți externe care pot amâna
  lansarea.
- **Dovada:** `BRIEF.md` r. 106, r. 122–125; `PLAN.md` r. 654–656 și r. 573–574.
- **Corectura:** pornirea lor (nu terminarea) intră în săptămânile 1–2, cu stare în coada owner-ului; termenul rămâne
  etapa 27; riscul 8 primește și entitatea, nu doar CAEN-ul. Sau owner-ul confirmă amânarea, ca schimbare a
  `BRIEF.md` §7.

#### I11. Laptopul de atelier se măsoară abia în etapa 29

- **Unde:** T13, §7 (riscul 5), §8 (laptopul, „etapa 4”), §5.3 (etapa 29).
- **Problema:** semnalul timpuriu al riscului 5 și condiția de redeschidere din T13 (planul B al pânzei) depind de un
  laptop de atelier. Pasul de configurare îl cere în etapa 4, dar singura felie care măsoară e în etapa 29 (săptămâna
  32), iar etapa 18 măsoară relieful pe calculatorul owner-ului, nu pe laptop. Planul B ar veni după 30 de săptămâni de
  interfață construite pe pânză.
- **Dovada:** `propunere-simplitate.md` r. 1100–1101 și r. 936.
- **Corectura:** o felie de măsurare în etapa 4 (bancul `s6-V` pe laptop, cu pragurile din T13 și din riscul 5),
  repetată în etapele 18 și 29.

#### I12. Conținutul etapelor are două surse care se contrazic

- **Unde:** §5.1 (r. 411–413), §5.4.
- **Problema:** feliile stau în `propunere-simplitate.md` §5.2, „cu modificările de la §5.4”, dar §5.4 nu le cuprinde pe
  toate:
  - termenul A / D (simplitatea: „înainte de etapa 1”);
  - constantele de calibrare (simplitatea, etapa 4: „în biblioteca de scule”; planul: „niciodată în oracol”, fără să spună
    unde);
  - recalibrarea (simplitatea: după etapele 3 și 6; planul: după etapa 2 și apoi la fiecare).

  În plus, §5.4.3 trece ca schimbare oracolul G-code din etapa 1, pe care simplitatea îl are deja (felia 7). O sesiune
  care scrie `etapa-NN.md` după simplitate ia varianta greșită: e pierderea de context din `LECTII.md` §2.3, cauza 5.
- **Dovada:** `propunere-simplitate.md` r. 371, r. 699–700, r. 1290, r. 575–576.
- **Corectura:** la aprobare, fișele etapelor (ținta, feliile, placa) se copiază în plan sau în `docs/etape/`, cu
  modificările aplicate, iar propunerile se marchează „istoric, nu autoritate”.

#### I13. Independența dovezii noi: oracolele, otrăvurile și CI-ul de noapte

- **Unde:** §4.1, §4.3, §4.4, §4.7.
- **Problema:**
  - **Oracolele noi.** Pentru ~12 rânduri fără sondă (`estimare.md` §4: A6, A7, B9, B12, B14, C6, C7, C14, C15, C16, C20,
    D10), oracolul îl scrie aceeași sesiune, chiar înaintea funcției, iar §4.7 exclude recenziile. Independența rămâne
    pe seama otrăvurilor „alese de altcineva”, care n-au calendar („o dată pe câteva etape”) și cer de fiecare dată
    acordul. E tiparul 281 / 281 față de 27 / 54 din `LECTII.md` §0.5.
  - **CI-ul roșu.** Planul spune „CI roșu = incidentul nr. 1, peste un roșu nu se publică nimic”. Dar nivelul de noapte
    depinde de cloud (perechile pe instanța de test) și de cronometrarea pe runnerele partajate, deci un roșu
    nedeterminist blochează publicarea săptămânală. Nimeni nu vede un roșu de noapte până la sesiunea următoare, iar un
    cron care nu pornește nu se vede deloc.
- **Corectura:**
  - pentru rândurile R3 fără oracol de sondă, oracolul și valorile pe hârtie le scrie o sesiune separată, fără acces la
    `src/`, în etapa dinainte;
  - sesiunile de otrăvuri fixate după etapele 2, 4, 8, 12, 14, 18 și 20, cu un buget aprobat o dată, în lotul 1;
  - semantica pe niveluri: roșul rapid sau complet blochează commit-ul și deploy-ul; roșul de noapte deschide un incident
    cu gravitate și blochează publicarea doar dacă privește sha-ul publicat; bugetele de performanță se măsoară relativ la
    martori;
  - prima acțiune a fiecărei sesiuni: starea `main` și a ultimei rulări de noapte; nicio rulare de noapte în 26 h = roșu.

#### I14. Build-ul produsului intră în Google Drive, pe care sondele l-au ocolit

- **Unde:** §3.2 („un singur depozit și un singur build”), §5.3 (etapa 1), §7.
- **Problema:** sondele n-au instalat niciodată pachete în repo, tocmai fiindcă stă în Drive. Produsul o va face din
  săptămâna 1 (`node_modules`, `dist/`, Playwright, cache-urile emulatorului), într-un dosar unde Drive „a mai readus
  fișiere vechi”. Planul nu pomenește Drive-ul deloc [măsurat], deși frecarea de mediu e cauza 8 din `LECTII.md` §2.3.
  E un mod nou de a eșua, chiar în săptămâna cea mai încărcată.
- **Dovada:** `CLAUDE.md` (repo-ul în Drive); `s1/RAPORT.md` r. 376–377; `s1/VERIFICARE.md` r. 427 („Din repo nu se
  instalează nimic în Drive”); `admin/RAPORT.md` r. 593 și r. 603; `LECTII.md` r. 250–254.
- **Corectura:** prima felie din etapa 1 e proba de mediu în dosarul din Drive: instalarea, build-ul, nivelul rapid și
  Edge, de două ori, cu `git status` curat după. Dacă apar blocaje sau fișiere readuse, owner-ul decide (de exemplu
  `node_modules` și artefactele în afara Drive-ului, printr-o joncțiune), iar decizia se scrie ca ADR.

### Minore

#### M1. Calibrarea oracolului e reinterpretată (`BRIEF.md` §13)

- **Unde:** §4.6.5.
- **Problema:** `BRIEF.md` §13 spune „Oracolul e calibrat o dată pe lemn”. Planul: constantele „niciodată în oracol”,
  doar la compararea plăcilor. Simplitatea le pune în biblioteca de scule, care alimentează CAM-ul și schimbă G-code-ul.
  Varianta planului e probabil mai bună, dar e o schimbare nespusă.
- **Dovada:** `BRIEF.md` r. 254; `propunere-simplitate.md` r. 699–700.
- **Corectura:** o frază despre unde stau constantele (la compararea plăcilor; în biblioteca de scule doar dacă owner-ul
  vrea ca CAM-ul să compenseze), cu acordul lui.

#### M2. Două inexactități de text

- **Unde:** §1 (r. 63), §5.4.3.
- **Problema:**
  - „Cost total, până aici: ~8,7 M tokeni” e doar Faza 2 și doar agenții (`DEVLOG.md` r. 192: „fără conversația
    principală”); Faza 0 a costat separat 10,3 M (r. 60);
  - §5.4.3 trece drept schimbare ceva ce simplitatea are deja (etapa 1, felia 7).
- **Corectura:** „Faza 2, în agenți: ~8,7 M (fără conversația principală)”; punctul 3 din §5.4 se scoate.

#### M3. Formatul DEVLOG pierde promptul și modelul

- **Unde:** §5.1 (r. 421–422).
- **Problema:** câmpurile propuse (`Started` / `Completed`, clasa, estimarea, trecerile, placa) nu au promptul și modelul.
  Fiecare intrare din `DEVLOG.md` le are, iar `estimare.md` §9 spune că efectul schimbării de model asupra ritmului nu se
  poate măsura din istoric.
- **Corectura:** se adaugă modelul și promptul (sau linkul spre el) pe fiecare felie.

#### M4. Inventarul adminului nu e trecut în plan (`BRIEF.md` §16.1)

- **Unde:** §5.5 (r. 513–514).
- **Problema:** `BRIEF.md` r. 288–289 cere ca inventarul (ce face fiecare filă, ce intră în v1, ce se lasă) să fie
  trecut în plan. Planul trimite doar la `admin/RAPORT.md` §5.2.
- **Corectura:** un tabel de 12 rânduri: fila → ce intră în v1 → ce se lasă (de exemplu panoul de credite, după
  decizia 12) → etapa.

#### M5. Placa 3, T4, cere re-zero de Z fără palpare

- **Unde:** §5.3 (etapele 3 și 13), §8 (placa de contact, „etapa 3”).
- **Problema:** T4 cere o diferență de adâncime de 0,0 ± 0,1 după schimbarea sculei, deci re-zero de Z. Palparea vine în
  etapa 13, iar placa de contact e cerută în etapa 3 fără funcția care o folosește (simplitatea, etapa 3, are doar
  „zero XY / Z”). Un re-zero de mână poate pica toleranța, deci și placa.
- **Dovada:** `propunere-simplitate.md` r. 634 și r. 657–658; valoarea (E2, r. 653–654) avea palparea Z în etapa
  senderului.
- **Corectura:** palparea Z cu placa de contact intră în etapa 3, sau toleranța lui T4 se lărgește pe placa 3.

---

## Ce am verificat și e corect

- **Pragul:** v1 are 65 de rânduri (A 11, B 14, C 24, D 10, F 6) [măsurat, pe grupe]. Toate sunt așezate pe etape în
  `propunere-simplitate.md` §5.3, la fel cele 8 funcții din `BRIEF.md` §10.
- **Cifrele estimării:** P50, P80, P90, datele și sensibilitățile din §0 și §6 (+47 %, +45 %, −26 %, +29 %) sunt cele
  din `estimare.md` §0, §6.2 și §7. Pârghiile de la §6 sunt cele din `propunere-simplitate.md` §6.
- **Publicarea:** pe test oricând, pe live la sfârșitul etapei, după placă și cu confirmarea owner-ului, doar pentru
  personal până la lansare. Se potrivește cu `BRIEF.md` §6.
- **Proiectele Firebase:** exportul Firestore înaintea primului deploy pe fiecare proiect, lista funcțiilor arătată
  owner-ului, extensiile Stripe și Trigger Email neatinse, tabelul de regiuni (`nam5`, `europe-central2`, `us-central1`).
  Se potrivesc cu `BRIEF.md` §7.
- **Adminul:** ordinea P0–P4 urmează `admin/RAPORT.md` §5.2 (cu excepția momentului lui P0, vezi I6); cele 12 file, cu
  fila AI mai târziu, sunt cele din `BRIEF.md` §16.1.
- **Atelierele:** pachetul pleacă în săptămâna 4, după ce owner-ul rulează T0–T7 pe GRBL în etapa 3, iar rundele 2 și 3
  vin în săptămânile 9 și 18. Se potrivește cu `propunere-simplitate.md` §5.4 și rămâne în marja de ~25 de săptămâni din
  `estimare.md` §6.4 (deși estimatorul cerea „cel târziu în etapa 3”).
- **Procedura otrăvurilor** (verificarea pe hash, „VOID”, toate suitele, restaurarea și verificarea față de `HEAD`,
  alegerea de către altcineva) e cea din `LECTII.md` §4.12 și §6.
- **„Verificarea câștigă”** e aplicată la toate cele patru afirmații infirmate (offsetul, booleanul, pasul V-carve,
  pânza), conform tabelului tranșei 1b din `DEVLOG.md`.
- **Toleranța de pornire** (±0,2 mm în plan, ±0,1 mm pe adâncime) e cea din `propunere-simplitate.md` §5.0.
- **Infrastructura înaintea nevoii** e evitată la deciziile tehnice: fără calcul pe GPU, fără COOP / COEP, fără OPFS și
  fără WASM propriu, fiecare cu condiția de revenire scrisă (§3.6), cum cere `LECTII.md` §2.3, cauza 7.
