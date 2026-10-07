# Propunerea „corectitudine întâi”: arhitectura și planul pe etape pentru cncvs2

Faza 2, tranșa 2. Una din trei propuneri independente. Unghiul acestei propuneri: **dovada înaintea funcției**.
Data: 07.10.2026. Fără cod. Nu modifică nimic în afara acestui fișier.

**Marcaje.** Fiecare afirmație importantă are o etichetă și sursa:
- **[măsurat, sursa]** = cifră obținută prin rulare, în sondă sau în git;
- **[citit, sursa]** = luată din document, cod sau documentație;
- **[dedus]** = raționamentul meu, nerulat.

**Prescurtările surselor** (toate sub `docs/faza2/`, dacă nu scrie altfel):
- s1 = `sonde/s1-geometrie/RAPORT.md`, s1-V = `sonde/s1-geometrie/VERIFICARE.md`;
- s2 = `sonde/s2-export-import/RAPORT.md`;
- s3 = `sonde/s3-vcarve/RAPORT.md`, s3-V = `sonde/s3-vcarve/VERIFICARE.md`;
- s4 = `sonde/s4-simulare/RAPORT.md`; s5 = `sonde/s5-relief/RAPORT.md`;
- s6 = `sonde/s6-panza/RAPORT.md`, s6-V = `sonde/s6-panza/VERIFICARE.md`;
- s7 = `sonde/s7-date-offline/RAPORT.md`; s8 = `sonde/s8-posturi/RAPORT.md`;
- s11 = `sonde/s11-izolare/RAPORT.md`; s12 = `sonde/s12-formate/RAPORT.md`;
- adm = `admin/RAPORT.md`; proto = `prototip-planse/RAPORT.md`;
- f0/NN = `docs/faza0/NN-*.md` (doar local); LECTII, BRIEF, ACOPERIRE = fișierele din rădăcina repo-ului.

Când o verificare contrazice sonda ei, am luat verificarea (s1-V, s3-V, s6-V), cum cere sarcina.

---

## 1. Ideea de bază

1. **Tot ce mișcă mașina trece printr-o singură coloană vertebrală:** document → operație → **IR-ul traseului** →
   **un singur post** → **Program** (octeți cu amprentă) → sender. Nimic nu ocolește coloana, iar fiecare legătură a
   ei are un judecător independent, construit înaintea primei funcții care o folosește.
2. **Judecătorul citește ce vede mașina, nu ce crede codul.** Oracolul simulează tăierea din **textul G-code**, cu
   silueta reală a frezei, și compară cu valori calculate pe hârtie din geometria piesei, nu din programul testat.
   Așa au fost găsite, cu întârziere, defectele grave din ediția întâi [citit, LECTII §0.3, §3.1].
3. **Un fapt, o autoritate.** Fiecare fapt (geometria, regula de umplere, originea, scula, dialectul, dreptul de
   acces) are un singur modul-proprietar. Regulile de import, verificate în CI, fac imposibil drumul ocolit. Clasa 1
   din LECTII §2.2 devine o eroare de compilare, nu un audit.
4. **Determinismul e poartă.** Același cod produce aceleași celule de simulare și aceiași octeți de G-code în Node
   (teste) și în browser (ecran). Ecranul arată exact ce verifică testele [măsurat, s4 §4.5: amprentele Node = Edge].
5. **Ordinea etapelor pune întâi coloana:** IR, post, simulare și oracol în săptămâna 1, senderul și pachetul pentru
   ateliere în săptămâna 2, nucleul geometric de produs în săptămâna 3. **Prima placă de probă se taie la sfârșitul
   săptămânii 1.** Pachetul de posturi pleacă la ateliere la sfârșitul săptămânii 2.
6. **Dovada e infrastructură construită o dată, nu ritual repetat.** Fiecare subsistem primește oracolul o singură
   dată. O funcție nouă adaugă doar rânduri în corpus, valori pe hârtie și un control negativ. Costul dovezii are
   buget și cifre urmărite săptămânal, ca să nu se repete ediția întâi, unde dovada ajunsese să coste cât produsul
   [măsurat în git, f0/00: ~1,5 linii de test la o linie de produs din august].
7. **Placa de probă e aprobarea.** Fiecare etapă conține cel puțin o funcție care mișcă mașina, deci fiecare placă e
   o probă reală. Transcrierea de pe mașină și cotele măsurate devin test automat.

---

## 2. Glosarul

Cuvintele de mai jos au un singur sens în cod, în interfață și în documente.

| # | Termen | Ce înseamnă |
|---|---|---|
| 1 | **Proiect** | Fișierul de lucru: piesele, foile, montajele, operațiile și **resursele** (fonturi, imagini, STL-uri), acestea din urmă adresate prin amprenta conținutului (SHA-256). |
| 2 | **Foaie** (sheet) | O bucată de material pe care se taie: dimensiuni, grosime, material, fibră opțională, fața de sus și fața de jos. |
| 3 | **Piesă** (part) | Un lucru fizic de produs, cu arborele lui de desen și operațiile lui, definit o singură dată. |
| 4 | **Instanță** | O așezare a unei piese pe o foaie (poziție, rotire, câmpuri din CSV), care trimite la piesă și nu copiază desenul. |
| 5 | **Element** | O frunză a arborelui: contur, formă parametrică (cerc, elipsă, dreptunghi rotunjit, poligon, text), strat de relief sau model 3D. |
| 6 | **Contur** (cale) | Un lanț de segmente linie, arc de cerc sau cubică Bézier, cu „închis” scris o singură dată. |
| 7 | **Grup** | Un nod al arborelui care conține alte noduri; grupurile se pot imbrica. |
| 8 | **Ramă** | Un grup cu contur propriu și inele parametrice (contururi paralele la distanță fixă); conținutul ei se ține de o ancoră și nu-și schimbă singur mărimea. |
| 9 | **Regiunea păstrată** | Materialul care trebuie să rămână după o operație, calculat din contururi cu regula de umplere; lead-ul, legăturile și verificările îl citesc. |
| 10 | **Operație** | O entitate care referă elemente și poartă scula, avansurile, adâncimile și strategia (profil, buzunar, V-carve...). |
| 11 | **Montaj** (setup) | Contextul de prelucrare: foaia, fața, originea de lucru, axa și matricea unică document → mașină. |
| 12 | **Originea de lucru** (WCS) | Punctul de la care controlerul măsoară coordonatele piesei (colț, centru sau punct ales), scris explicit ca G54–G59. |
| 13 | **Sculă** (freză) | Geometria tăișului ca siluetă h(r), plus diametre, lungimea tăișului și mandrina; operația ține un instantaneu al ei. |
| 14 | **Material** | Tipul de lemn sau placă, cu densitatea și încărcările pe dinte de la care se calculează avansurile. |
| 15 | **Profilul mașinii** | Cursele, accelerațiile, controlerul, contractul de dialect și pauza după pornirea axului; controlerul rămâne sursa de adevăr. |
| 16 | **IR-ul traseului** | Reprezentarea intermediară tipizată a mișcărilor (linie, arc, elice, cu Z la ambele capete, scula, operația și eticheta) pe care o citesc postul, simularea, estimarea și fișa. |
| 17 | **Post** | Singurul serializator: transformă IR-ul în text G-code pentru un controler, după contractul lui. |
| 18 | **Contract de dialect** | Regulile unui controler scrise ca date (unități, zecimale, comentarii, arce, schimbarea sculei, pauză, lungimea liniei), fiecare câmp cu sursa și starea „documentat” sau „probat în atelier”. |
| 19 | **Program** | Octeții G-code produși de post, cu amprenta SHA-256 și manifestul (scule, limite, timp, contract); senderul trimite exact acești octeți. |
| 20 | **Relief** | O hartă de înălțimi (o cotă Z pe celulă), pe straturi, modelată ca în ArtCAM. |
| 21 | **Model 3D** | O plasă de triunghiuri importată (STL, OBJ...), poziționată pe foaie. |
| 22 | **Oracol** | Cod scris separat, fără importuri din aplicație, care știe răspunsul corect din geometria intenționată și judecă artefactul final. |
| 23 | **Placă de probă** | Piesa tăiată de owner la sfârșitul unei etape, cu 5–10 cote date dinainte cu valoarea pe hârtie; e aprobarea etapei. |
| 24 | **Felie** | O schimbare încheiată cu ceva ce owner-ul poate încerca, cu commit, cu dovada ei și cu un rând scurt în DEVLOG. |
| 25 | **Etapă** | O săptămână de lucru cu țintă scrisă în plan, cu ~8 felii, care se încheie cu placa de probă și, după aprobare, cu publicarea pe live. |

---

## 3. Arhitectura

### 3.1 Harta modulelor

Un monorepo cu spații de lucru npm și referințe de proiect TypeScript [dedus]. Pachetele de domeniu sunt pure: fără
DOM, fără ceas, fără `Math.random`, deci rulează identic în Node și în workere.

```
cncvs2/
  packages/
    core/       numere, unități (mm intern), tabelul de toleranțe, rezoluția modelului 0,01 mm,
                id-uri, hash, tipurile Known/Unknown, MachinePos/WorkPos
    geom/       curbele L/A/C, formele parametrice cu matrice, transformări exacte, biarce,
                offset (cavalier, cu gărzi), boolean (PathKit, cu R3), regula de umplere, normalizarea,
                distanța exactă, hit-test
    medial/     axa medială: Voronoi pe eșantioane, raza recalculată exact
    doc/        schema (valibot), arborele, piese/foi/instanțe/montaje/operații, jurnalul de comenzi,
                migrațiile, plafoanele pe artefact, funcția de avertismente
    tools/      frezele (silueta h(r)), materialele, avansurile, cititorul `.tdb`
    dialects/   contractele de dialect, ca date cu sursă pe câmp
    ir/         tipurile IR-ului și verificarea lui structurală
    cam/        operații → IR (2D, 2.5D, 3D), modificatorii Z(s), regiunea păstrată, legarea, ordinea
    post/       serializatorul unic → Program
    sim/        nucleul de îndepărtare a materialului (dale rare), amprenta
    estimate/   timpul, cu modelul mașinii
    relief/     straturile de relief, operațiile, câmpul conservativ, drop-cutter
    mesh/       importul 3D, indexul spațial, rasterizarea conservativă
    io2d/       importul și exportul 2D (DXF, SVG, PDF, EPS, WMF/EMF)
    text/       fonturile, înălțimea majusculei, așezarea textului
    trace/      bitmap → vectori
    machine/    senderul: transport Web Serial, sesiune, proceduri ca mașini de stare pure
    persist/    IndexedDB, OPFS, fișierul `.cncvs`, ciorna
    workers/    grupul de workere, protocolul de joburi, anularea, transferul
    actions/    registrul de acțiuni: singura ușă a interfeței spre domeniu
    render/     pânza: stratul vectori (worker), stratul GL, stratul de interacțiune
    ui/         interfața (React), i18n en/ro
    cloud/      clientul Firebase: cont, App Check, capabilități, proiecte în cloud, jurnalul de erori
    shared/     contractele client–server: catalogul ca date, tabelul de capabilități, tipuri
  functions/    Firebase Functions în TS, pe domenii: entitlement, billing, admin/*, errors,
                diagnostics, publish, backup
  rules/        regulile Firestore și Storage + testele lor în perechi permis/refuzat
  oracles/      judecătorii independenți, zero importuri din packages/:
                geom/, vcarve/, gcode-sim/, relief/, controller/, canvas/, io-py/ (Python)
  testkit/      corpusul comun, unealta de mutații, plăcile de probă, transcrierile de pe mașină
  bench/        bancul vizual și bugetele de performanță
  docs/         ADR-uri scurte și un document pe subsistem
```

**Modelul documentului** (ipoteza D, vezi §3.7 punctul 8):
- `Proiect { schema, rev, piese[], foi[], montaje[], scule[] (instantanee), resurse{sha → meta}, setări }`;
- `Piesă { id, nume, rădăcină: Nod }`, unde `Nod = Grup | Ramă | Element`;
- `Foaie { stoc, fețe { sus, jos (axa de întoarcere, știfturi) }, instanțe[] }`;
- `Instanță { piesă, x, y, rotire, câmpuri{} }`;
- `Montaj { foaie, fața, originea, matricea document → mașină, axe }`;
- `Operație { tip, elemente[], sculă (instantaneu + hash), avansuri, adâncimi, parametri }`.

Câmpurile necunoscute se păstrează, iar migrațiile sunt funcții pure vN → vN+1, cu un corpus de aur
[citit, LECTII §4.2; măsurat, s7 §4.2].

### 3.2 Un fapt, o autoritate

| Faptul | Singura autoritate | Cine îl citește | De ce (defectul vechi) |
|---|---|---|---|
| Geometria unui element | `doc` îl stochează; `geom` derivă conturul la cerere (cache după `rev`) | pânza, CAM, exportul | primitive fără matrice, rotirea distrugea dreptunghiul rotunjit [citit, LECTII §2.2.6] |
| Regula de umplere | o funcție în `geom` (evenodd) | pânza, clicul, CAM, exportul | D11, regula diferea între ecran și sculă [citit, LECTII §4.3] |
| „Închis” | un câmp pe contur, scris o dată; orientarea se derivă din imbricare | toate | `closed` față de `Z` [citit, LECTII §2.2.1, §6] |
| Regiunea păstrată | `cam/region` | lead, legare, sens, pre-flight | lead-in-ul mușca 2,8–8,2 mm din piesă [citit, LECTII §2.1] |
| Toleranța pe etape | tabelul din `core` | biarce, CAM, post, export, simulare | toleranțe fixe puse în ore [citit, f0/21 §6] |
| Originea și transformarea document → mașină | `Montaj`: o matrice, inversa calculată | doar postul scrie coordonate de mașină | originea din dreapta oglindea tot programul, 104 zile [citit, LECTII §2.1] |
| Geometria frezei | biblioteca de scule; operația ține instantaneul | CAM, simularea, fișa | o singură sculă pe proiect [citit, LECTII §2.2.6] |
| Traseul | IR-ul, scris numai de `cam` | post, simulare, estimare, fișă | cinci emitenți de G-code, textul ca interfață [citit, LECTII §2.2.2] |
| Textul G-code | `post` | export, sender (octeți + sha) | senderul regenera, exportul scria fișiere refuzate de sender [citit, LECTII §3.1] |
| Regulile controlerului | contractul de dialect | post, sender (lungimea liniei), fișa, adminul (doar citire) | `T# M6` pe GRBL → `error:20` [citit, LECTII §2.1] |
| Starea mașinii | controlerul (`Known`/`Unknown`) | senderul afișează, nu presupune | „neștiut” afișat ca 0 [citit, LECTII §3.1] |
| Unitățile | mm în model; doar postul convertește | — | `G21` scris fix [citit, LECTII §1] |
| Timpul estimat | `estimate`, din IR + profilul mașinii | ecranul, fișa | estimare autoconsistentă [citit, f0/06 §4.9] |
| Prețurile | catalogul unic pe server | site, facturare, admin | prețuri în 4 copii [citit, LECTII §0.4] |
| Dreptul de acces | funcția `entitlement`, doar pe server | registrul de acțiuni citește capabilitățile | drept de acces în 2 locuri [citit, LECTII §0.4] |
| Rolul de admin | documentul `staff/{uid}` | reguli, callable-uri | claim-uri care întârzie o oră [citit, adm §3 E/F] |
| Versiunea schemei | o declarație valibot (tip + validator + limite) | toate ușile de încărcare | 5 numere de schemă [citit, LECTII §1] |
| „Nesalvat” | `rev` | interfața | — |
| Plafoanele | `doc/caps`, verificate la intrarea în magazin, pentru toate ușile | import, șabloane, AI, export | ușile neprevăzute ocoleau plafonul [citit, LECTII §3.1] |
| Textele interfeței | `en.ts`, cu `ro: typeof en` | interfața | — |
| Versiunea publicată | amprenta `meta/deployment`, scrisă de pipeline | Diagnoza | jurnal local negitversionat [citit, f0/11 §5] |

### 3.3 Regulile de import, verificate în CI

Le verifică dependency-cruiser (MIT) în nivelul rapid, iar referințele de proiect TypeScript le fac erori de
compilare [dedus].

1. `core` nu importă nimic din proiect.
2. `geom`, `medial`, `tools`, `ir`, `dialects` importă doar `core`.
3. `doc` importă `core` și `geom`.
4. `cam` importă `core`, `geom`, `medial`, `tools`, `doc`, `ir`, `relief`, `mesh`. Nu importă `post`, `sim`,
   `machine` și nimic din interfață.
5. `post` importă doar `core`, `ir`, `dialects`. Postul nu știe de document și nu face geometrie.
6. `sim` și `estimate` importă doar `core`, `ir`, `tools`.
7. `machine` importă `core` și `dialects`. Primește Programul ca date (octeți + manifest), nu importă `post`.
8. `io2d`, `text`, `trace`, `mesh`, `relief` importă `core`, `geom` și tipurile din `doc`.
9. `ui` și `render` ajung la domeniu doar prin `actions` și prin protocolul workerelor. `render` poate importa
   tipurile din `geom` și `ir`, ca să construiască ce desenează.
10. `oracles/**` nu importă nimic din `packages/**`. E regula care ține oracolul independent.
11. `functions/` importă doar `shared/`. Clientul nu importă `functions/`.
12. Fără cicluri.
13. **Niciun test nu citește textul surselor.** Plasele pe sursă din ediția întâi au mințit: 84 din 326 de suite
    [citit, LECTII §2.2.4]. Singura excepție e verificarea acestor reguli.

### 3.4 Fluxurile de date

**Coloana vertebrală (tot ce mișcă mașina):**

```
Document ──(acțiunea „Generează”, într-un worker, anulabilă)──► cam(operație) ──► IR pe operație
                                                                 (cache după hash-ul intrărilor)
IR al piesei × matricea instanței (rigidă, exactă) ──► IR al foii, în ordinea operațiilor
        │
        ├──► sim (ecranul: material îndepărtat, același nucleu ca testele)
        ├──► estimate (timp + rezumat)
        ├──► fișa de lucru
        └──► post(IR, contract, profilul mașinii, matricea montajului) ──► Program
                                                                  (octeți + SHA-256 + manifest)
                                                                       │
                                               exportul fișierului ◄───┴───► senderul (trimite exact octeții)

Testele: oracolul citește octeții Programului (text G-code), nu IR-ul.
Poarta invariantelor (§4.2) judecă fiecare Program generat de orice test.
```

- IR-ul stă în coordonatele documentului. **Postul e singurul care aplică matricea montajului** și singurul care
  scrie coordonate de mașină. Oglindirea pentru fața de jos stă tot în matrice, iar postul inversează G2 ↔ G3 când
  matricea oglindește [dedus].
- O mutare are `z0` și `z1`, scula, operația și eticheta (tăiere, plonjare, rampă, lead, punte, legătură, aer).
  Schimbarea sculei, pornirea axului și pauza sunt evenimente în IR [citit, LECTII §4.4; s8 §5.4].
- Arcele rămân arce până în post. Un controler fără arce primește arcele aplatizate de post, nu de nucleu
  [citit, s1 §5.7].

**Pânza:**

```
Comandă (din acțiune) ──► jurnalul de comenzi ──► documentul (firul principal)
                                     └──► oglinzi: workerul de raster vectorial (Path2D pe găleți spațiale),
                                          indexul de hit-test, cache-urile de contur
Workerul vectorial: OffscreenCanvas SOFTWARE ──► ImageBitmap transferat ──► afișat pe firul principal
Stratul GL: placa, traseele (LINE_STRIP implicit), harta simulării (dale urcate la schimbare)
Stratul de interacțiune: mânere, selecție, previzualizarea uneltei (Canvas2D accelerat, mic)
```

Documentul nu circulă întreg între fire: o copie de 50 000 de noduri costă ~0,6 s [măsurat, s7 §4.6]. Oglinzile
primesc doar comenzile.

**Relieful:** straturile stau în workerul de relief, pe dale Float32 de 256 × 256. Operațiile rulează acolo.
Afișarea primește dalele modificate pe GPU. Salvarea scrie dalele ca Uint16 cu scară pe dală, ca resurse în OPFS
[măsurat, s5 §2.1: eroare 0,15–0,46 µm]. Relieful făcut din vectori rămâne o rețetă derivată: vectorul nu se pierde
[citit, s5 §5.8].

**Persistența și fișierul de proiect:**
- documentul, pointerul „versiunea curentă” și jurnalul: o singură bază IndexedDB, cu tranzacții;
- resursele: OPFS, fișiere numite după SHA-256, scrise o dată (`.tmp` → flush → move → verificare), niciodată
  suprascrise;
- derivatele (trasee, câmpuri coapte, G-code): cache după hash, se pot șterge oricând;
- fișierul `.cncvs`: zip determinist (manifest + JSON canonic + resurse), identic octet cu octet în orice fus orar
  [măsurat, s7 §4.5];
- un singur scriitor: workerul de persistență; între file, Web Locks [citit, s7 §5.7].

**Cloud-ul:**
- **Cont:** Firebase Auth (e-mail și Google), fără izolare cross-origin (§3.7 punctul 4).
- **Drept de acces:** funcția `entitlement` calculează capabilitățile din abonamentul oglindit de extensia Stripe,
  din registrul probei (HMAC pe e-mail, candidat la portare) și din planurile date de admin. Scrie
  `entitlements/{uid}`, doar pe server. Clientul îl citește și îl ține în cache pentru lucrul offline.
- **Ce se blochează:** exportul și senderul, prin convenție în client; cloud-ul și bibliotecile partajate, real, pe
  server [citit, BRIEF §4].
- **Facturarea:** catalogul unic, cu lista albă a prețurilor impusă în reguli pentru `checkout_sessions`; webhook-ul
  oglindește abonamentul; portalul Stripe pentru client [citit, adm §5.1; LECTII §2.1].
- **Adminul:** citiri prin reguli cu `staffLevel()`, scrieri numai prin callable-uri cu auditul în aceeași
  tranzacție, cu pre-imagine [citit, adm §5.1].
- **Observabilitatea:** `errorLogs` scris doar de server (client prin callable cu plafon de rată, server printr-o
  funcție care nu aruncă), marcaj de rulare pe fiecare job și declanșator, Diagnoza, backup zilnic cu alarmă
  [citit, adm §5.1; LECTII §4.11].
- **Regiunile:** funcțiile în `europe-central2`, declanșatoarele Firestore în `us-central1` (baza e în `nam5`)
  [citit, BRIEF §7]. Un tabel unic de regiuni stă în cod, iar un test cere ca fiecare funcție exportată să-și ia
  regiunea de acolo [dedus]. Fiecare declanșator are marcaj de rulare, fiindcă în ediția întâi unul a tăcut două
  zile [citit, adm §4.1 Tichete].

### 3.5 Firele: ce rulează unde

| Firul | Ce deține | Ce face | Dovada |
|---|---|---|---|
| Principal | documentul, jurnalul, registrul de acțiuni, stratul GL, stratul de interacțiune | interfața; nicio sarcină de peste 50 ms din codul nostru | bugetul e test în banc [dedus] |
| Worker vectorial | Path2D-urile pe găleți spațiale | raster exact pe pânză software → ImageBitmap | clic → pictură 24 ms median, p95 32 ms, pe RTX și pe iGPU [măsurat, s6-V §4.4] |
| Grup de workere de geometrie și CAM | PathKit (WASM), cavalier | offset, boolean, axa medială, CAM, importuri mari, interpretorul EPS (cu buget) | CAM-ul în worker cu anulare [citit, LECTII §4.9] |
| Grup de workere de simulare | dalele câmpului (rânduri intercalate, r mod N), traseul trimis o dată | îndepărtarea materialului | identic la 1, 4, 8, 16 fire [măsurat, s4 §4.5]; traseul ținut în workere e calea ieftină [măsurat, s11 §4.3] |
| Worker(e) de relief | dalele straturilor | operațiile de relief, drop-cutter | variantă „datele stau în worker”: × 0,96 la finisare [măsurat, s11 §4.2] |
| Worker de persistență | accesul OPFS | scrieri atomice, curățenie | [măsurat, s7 §4.4] |
| Senderul | sesiunea serială | fluxul cu numărare de caractere | Web Serial într-un worker dedicat e **de probat în S2**; dacă nu merge, rămâne pe firul principal, cu regula „nicio sarcină lungă cât rulează un job” [dedus] |

Reguli pentru toate workerele [măsurat, s11 §5]:
- datele se **transferă**, nu se partajează: fără `SharedArrayBuffer`, fără izolare cross-origin în v1;
- nucleele se scriu peste „o bandă cu decalaj” `(buffer, gj0, rows)`, ca trecerea la memorie partajată să nu ceară
  rescriere;
- halo-ul benzii e o constantă calculată din nucleu, cu test pe vârfuri puse exact la margine. Fără el, un halo greșit
  dă o scobitură de 2,545 mm care trece de orice test pe teren neted [măsurat, s11 §4.2];
- buferele benzilor se iau dintr-un bazin, nu se alocă la fiecare operație [dedus, s11 §4.1].

### 3.6 Stack-ul

| Zona | Alegerea | Versiunea | Licența | Dovada |
|---|---|---|---|---|
| Limbaj | TypeScript strict, ESM | 7.0.2 (din s7) | Apache-2.0 | [citit, s7 §3.2] |
| Runtime de test | Node | 26.10 | — | determinism Node = Edge [măsurat, s4 §4.5] |
| Build și PWA | Vite + vite-plugin-pwa (Workbox), `registerType: 'prompt'` | 8.3.3 + 2.0.0 (Workbox 7.4) | MIT | 9/9 offline, martorul pică [măsurat, s7 §4.7] |
| Interfața | React, peste registrul de acțiuni; magazinul documentului e al nostru (jurnal de comenzi), fără Immer | 19 [dedus] | MIT | nesondat; e strat subțire peste acțiuni [dedus] |
| Schema | valibot (rezervă: zod 4) | 1.5.0 | MIT | 10/10 defecte la calea exactă; 318 ms sub CSP; 3,3 KB gzip [măsurat, s7 §4.2] |
| Fișierul de proiect | fflate | 0.8.3 | MIT | zip identic octet cu octet [măsurat, s7 §4.5] |
| Offset | cavalier_contours, portul JS adus în repo și reparat | 0.1.1 + reparațiile Rust 0.8/0.9 | MIT / Apache-2.0 | exact pe domeniul principal; gărzi obligatorii [măsurat, s1-V] |
| Boolean | `pathkit-wasm`, ca dependență înghețată, după o fațadă proprie | 1.0.0 (2022-02-03) | BSD-3-Clause | ≤ 1,3e-4 mm la 2 440 mm pe o operație; R3 după fiecare operație [măsurat, s1-V §4.6] |
| Axa medială | delaunator + robust-predicates | 5.1.0 + 3.0.3 | ISC / Unlicense | [măsurat, s3, s3-V] |
| Index spațial | flatbush | 4.6.2 | ISC | clic 0,04 ms la 50 k [măsurat, s6 §4.5] |
| Fonturi | opentype.js, cu prinderea erorilor GSUB | 2.0.0 | MIT | [măsurat, s2, s3 §4] |
| DXF | `dxf` (citire), `@tarikjabiri/dxf` (R2007, fixat), scriitor R12 propriu | 5.3.1, 2.9.0 | MIT | 108/108 export, 65/65 import [măsurat, s2 §2] |
| SVG | svgpath (cu `Number()` pe stegulețe), @xmldom/xmldom în workere | 2.6.0, 0.9.12 | MIT | [măsurat, s2 §3] |
| PDF | pdf-lib (scriere), pdfjs-dist (citire) | 1.17.1, 6.4.299 | MIT, Apache-2.0 | [măsurat, s2 §3] |
| Firebase | firebase, firebase-functions, firebase-admin, firebase-tools (fixat) | 12.19.0, 7.4.0, 14.5.0, 15.32.1 | Apache-2.0 / MIT | [citit, adm §3] |
| Teste | Vitest pentru unități [dedus]; playwright-core pentru browser | —, 1.63.0 | MIT, Apache-2.0 | [citit, s4–s7] |
| Oracolele de format (doar CI) | Python 3.13: ezdxf, svgelements, PyMuPDF, fontTools; Ghostscript-WASM | 1.4.4, 1.9.6, 1.28, 4.66, 0.0.2 | MIT / AGPL (doar în CI) | [măsurat, s2, s12] |

**Ce nu intră:** PixiJS și CanvasKit complet [măsurat, s6 §3]; Clipper2, paper.js, maker.js, flatten-js, bezier-js
ca purtători de geometrie [măsurat, s1 §5.10]; WASM pentru simulare (× 1,05) [măsurat, s4 §4.4]; calcul pe GPU în
v1 (§3.7 punctul 3); COOP/COEP (§3.7 punctul 4); TypeBox și arktype [măsurat, s7 §4.2]; Immer pentru document
[măsurat, s7 §4.6]; orice cod GPL/AGPL în pachetul livrat (un audit de licențe rulează noaptea) [dedus].

**Antetele hosting-ului:** CSP fără `'unsafe-eval'`, probat pe build-ul servit, nu prin injectare [citit, s7 §5.2];
`index.html` și `sw.js` cu `no-cache`, fișierele cu hash în nume `immutable` [măsurat, s7 §4.7]; fără COOP, COEP sau
DIP [măsurat, s11 §5.1]. Build fără ceas, config citit de la gazdă, același artefact pe test și pe live
[citit, LECTII §3.1].

### 3.7 Cele 9 puncte deschise, tranșate

**1. Regula de umplere.**
- **Decizia:** documentul are o singură regulă, **evenodd**, pentru ecran, clic, CAM și export. Regula sursei se
  aplică **o singură dată, la ușa de intrare**: conturul unei glife TrueType (nonzero), al unei căi SVG cu
  `fill-rule` nonzero sau al unui PDF umplut cu `f` se reunește cu PathKit, după regula sursei. Ce intră în document e
  deja „curat”: evenodd pe el dă exact regiunea pe care sursa o voia cu regula ei.
- **Dovada:** în DXF și SVG orientarea contururilor e arbitrară; cu nonzero, o gaură orientată ca exteriorul s-ar
  umple (757 din 4 000 de puncte diferă) [măsurat, s6 §4.6]. Fonturile moderne au contururi suprapuse: Roboto v3
  diferă între reguli pe 41 din 65 de caractere [măsurat, s3 §4]. Ecranul, nucleul și `isPointInPath` dau 0 diferențe
  pe ambele reguli [măsurat, s6 §4.6]. Deci problema din s3 nu e de regulă, ci de normalizare la intrare.
- **Proba din produs:** pentru fiecare ușă, un test pe grilă cere `evenodd(normalizat) = regula_sursei(brut)`, în
  afara unei benzi lângă contur.
- **Rămâne pentru owner** (întrebarea 6, §8): două elemente **separate** care se suprapun în aceeași operație se
  unesc (recomandarea mea) sau se scad?

**2. Arcele eliptice.**
- **Decizia:** conturul are trei primitive, **linie, arc de cerc, cubică**, cu `switch` exhaustiv. Elipsa și arcul
  de elipsă sunt **forme parametrice cu matrice**, exacte la orice transformare afină, exportate ca `ELLIPSE` în DXF
  R2007 și ca `ellipse` sau `A` (≤ 90°) în SVG [citit, s1 §5.2; s2 §5.2–5.3].
  - La import, o elipsă sau un arc de elipsă de sine stătător (DXF `ELLIPSE`, SVG `ellipse`, cerc dintr-un bloc scalat
    neuniform, cale SVG făcută dintr-un singur `A`) devine formă parametrică, deci se întoarce exact la export.
  - Un arc eliptic **în mijlocul unei căi** devine cubice sub toleranța declarată: 8 cubice pentru 0,001 mm până la
    r = 50 mm, 16 până la r = 1 220 mm [măsurat, s1 §4.6]. Raportul de verificare a vectorilor spune că a aproximat.
- **De ce nu ca primitivă:** fiecare primitivă în plus înmulțește perechile de intersecție din fiecare operație; în
  ediția întâi, 12 module au fost oarbe la arc [citit, s1 §5.2]. Mașina n-are mișcare eliptică, deci CAM-ul ar
  converti oricum. Un model mai mic înseamnă o suprafață de probă mai mică.
- **Ce se pierde din s2:** doar cazul rar al unui arc eliptic în interiorul unei căi, care iese la export ca `SPLINE`
  exactă a cubicelor, nu ca `ELLIPSE`. Abaterea e sub 0,001 mm și e declarată (BRIEF §16.2.3).

**3. Calculul pe GPU în v1.**
- **Decizia:** **nu.** Tot ce se salvează sau ajunge la mașină (trasee, simulare, straturi de relief) se calculează
  pe procesor, în workere. GPU-ul doar desenează.
- **Dovada:** GPU-ul nu e identic bit cu bit cu procesorul (până la 0,18 µm, 89,6–98,8 % celule identice), iar CI-ul
  n-are placă video [măsurat, s4 §4.5]. Un strat de relief calculat pe GPU ar avea alt hash pe alt calculator, deci
  fișierele de aur și poarta „Node = browser” ar cădea [dedus]. Un runner propriu cu GPU, pe un repo public, ar lăsa
  cod străin să ruleze pe mașina owner-ului [dedus].
- **Costul acceptat:** finisarea a 2,67 M de puncte durează 2,2 s pe 16 workere față de 90 ms pe GPU; netezirea
  globală 83 ms față de 35 ms [măsurat, s5 §4.5]. Pe un laptop cu 4 nuclee, finisarea ar dura ~10 s [dedus]: e un
  calcul de CAM, cu progres și anulare. Sculptura rămâne pe procesor la 0,27–1,06 ms pe aplicare [măsurat, s5 §4.6].
- **Ușa pentru v1.x:** GPU-ul ca accelerator al **previzualizării**, cu rezultatul final recalculat pe procesor și cu
  o probă automată GPU față de CPU (toleranță 1 µm). Se deschide doar dacă o operație măsurată pe mașina owner-ului
  trece de bugetul ei (de exemplu 10 s la finisarea implicită).

**4. Workerele: memorie partajată sau transfer.**
- **Decizia:** adopt s11. **Fără izolare cross-origin în v1.** Datele grele stau în workere, transferate pe benzi cu
  halo; traseul se trimite o dată și rămâne acolo. Dacă vreodată e nevoie de `SharedArrayBuffer`, se folosește
  Document-Isolation-Policy, nu COOP + COEP.
- **Dovada:** fără memorie partajată, blur-ul costă × 1,10–1,23, finisarea × 0,97, cu rezultat identic bit cu bit;
  COOP + COEP strică login-ul Google (popup și redirect), iar DIP nu strică nimic din ce folosim [măsurat, s11 §2].

**5. Normalizarea regiunii pentru V-carve.**
- **Decizia:** în produs, regiunea se normalizează cu **același nucleu ca desenul** (PathKit + R3 + reunirea după
  regula sursei), plus **vindecarea** cu toleranță declarată (implicit 0,005 mm, sub rezoluția modelului) și raport
  către om. **Clipper nu intră în produs.** Offseturile fundului plat (regiunile F_k și colțurile Q) se fac cu
  offsetul exact cavalier, nu cu Clipper.
- **Se adoptă tot ce aduce s3-V:** pas de eșantionare adaptiv (h ≤ 0,02 mm pe trăsături sub ~0,5 mm, sau ~0,4 ×
  lățimea locală), legalizare Lawson pe stivă cu verificarea „0 muchii ne-Delaunay” și eroare la orice plafon,
  adâncimea de start pentru incrustație, garda arcelor cu toleranța în Z scalată cu unghiul.
- **Dovada:** Clipper pune sute sau mii de linii în locul unui arc [măsurat, s1 §4.2]; pe o cusătură aproape comună a
  lăsat 110 micro-găuri și o cusătură netăiată [măsurat, s3-V §4b]. La h = 0,05, plăcuța iese cu 0,0163 mm sub ideal,
  peste buget; cifrele-titlu din s3 erau la h = 0,02 [măsurat, s3-V §2]. Legalizarea pe treceri se oprește tăcut la
  plafon (16–19 s, 230 de muchii proaste); cea pe stivă face același lucru în 0,08 s [măsurat, s3-V §4d].
- **Ce trebuie re-probat:** corpusul s3 + s3-V, cu normalizarea nouă, trebuie să intre în bugete înainte ca V-carve-ul
  să fie livrat (poartă în S8). Axa are nevoie doar de eșantioane pe conturul exact, deci schimbarea normalizării nu
  atinge algoritmul [dedus].

**6. Pânza.**
- **Decizia:** adopt s6-V. Vectorii exacți se rasterizează într-un worker, pe o pânză **software**, și se predau ca
  `ImageBitmap`; în gest se mută ultimul bitmap, iar imaginea exactă vine după. Traseele dense se desenează ca
  LINE_STRIP; segmentele instanțiate doar sub un buget de segmente vizibile ales la pornire dintr-un test scurt de
  cadru. Linia vectorilor are 1 pixel fizic. Planul B (vectori pe WebGL) nu se promovează.
- **Dovada:** redesenul pe pânza accelerată ține procesul GPU ocupat 120–350 ms și îngheață ecranul, chiar din worker;
  pânza software din worker dă pictura după clic în 24 ms median, pe ambele plăci [măsurat, s6-V §4.4]. Pe iGPU,
  5 M de segmente instanțiate cer 33 ms pe cadru, iar ca LINE_STRIP țin 60 Hz [măsurat, s6-V §4.2].
- **Criteriul pentru planul B** (scris dinainte): imaginea exactă de 50 k forme trece de ~1 s pe un laptop real de
  atelier, sau owner-ul respinge bitmapul neclar din timpul gestului [citit, s6-V §5.5]. Se măsoară în S4 și în S24.

**7. Formatele de import cu probleme de licență.** Nimic nu iese din prag fără owner-ul. Recomandarea mea, în față
(întrebarea 3, §8), după s12:
- **EPS și AI ≤ 8:** în v1, prin interpretor propriu, limitat, cu profiluri de producător (Illustrator acum,
  CorelDRAW după fișiere reale), rulat într-un worker cu buget de pași, timp și memorie, cu refuz explicit și niciodată
  import parțial pe tăcute. Poarta: ≥ 80 % din corpusul real al owner-ului. Stă în S22, ca owner-ul să aibă timp să
  strângă fișierele. Un interpretor de probă a citit exact EPS-ul real din Illustrator CS6: 34/34 de pictări,
  0,0048 pt față de Ghostscript [măsurat, s12 §4.3].
- **DWG:** doar mesaj în v1 („salvează ca DXF”), cu trimitere la un convertor gratuit; decizia nativă în v1.x. Un
  cititor permisiv costă 7 500 $ primul an (ODA, pentru web); cele gratuite sunt GPL [citit, s12 §4.2].
- **WMF:** cititor propriu, din specificația publică; EMF vine „peste prag”, aproape gratis (S23) [citit, s12 §2].
- **DGK și PIC:** scoase din prag, cu motivul scris la „Scoase la reverificare”: nu au specificație publică, iar
  regula owner-ului interzice reverse engineering [citit, s12 §2].

**8. Planșele: A sau D.** Lucrez cu **D** ca ipoteză. Modelul D e un supraset al lui A: în A, fiecare lucru de pe
foaie e o piesă cu o singură instanță, iar copiile sunt piese noi [citit, proto §5 decizia 1]. Deci **schema nu
depinde de alegere**, iar decizia trebuie luată abia înainte de S10.

| Zona | Cu D (ipoteza) | Dacă owner-ul alege A | Efectul în plan |
|---|---|---|---|
| Arborele, rama, gesturile (scenariile 1–3, 8) | comune | comune | 0 [măsurat, proto §2: aceleași gesturi] |
| Repetarea (scenariile 4–5) | «Încă…» face instanțe legate; banda „se schimbă toate cele N”; «Desprinde» | «Multiplică» face copii; editarea se face pe fiecare | S10: −1 felie; dar 26 de gesturi în loc de 6 la scenariul 5 [măsurat, proto §4] |
| Multi-Plate (scenariul 6) | valoarea pe instanță, fontul pe piesă | numele scris în fiecare copie | S10: ±0; 60 de noduri în loc de 2 [măsurat, proto §4] |
| CAM pe instanțe | IR calculat o dată pe piesă, transformat exact | CAM pe fiecare copie (timp × N) | S10: −0,5 felie; plafoanele trebuie să țină copiile [dedus] |
| Două fețe (scenariul 7) | fața de jos a foii; spatele urmează fața | planșă copiată oglindit, știfturi de mână | S21: −0,5 felie, dar nealinierea tăcută de 50 mm cere un avertisment nou (+0,5) [măsurat, proto §4] |
| Exportul | BLOCK/INSERT, `symbol`/`use` | desfăcut | S13: −0,5 felie |

Net: A economisește ~1,5–2 felii și pierde scenariile 5 și 7 (6 față de 26 și 9 față de 39 de gesturi).
Rămân și cele trei alegeri din prototip pe care owner-ul trebuie să le confirme (întrebarea 2, §8).

**9. Maturitatea nucleului geometric.**
- **Offsetul, decizia:** portul JS adus în repo, cu reparațiile din Rust 0.8.0 și 0.9.0 portate (#79, #82, #83,
  vârfurile repetate), cu testul „paralele” reparat (unghi normalizat, nu produs în mm² comparat cu o lungime) și cu
  suita s1-V în CI. Estimat 2–4 zile [dedus, s1-V §5.1], adică ~1,5 felii în S2.
- **Martorul Rust:** originalul Rust 0.9.0, compilat în WASM **doar în CI** (o dată, în S2), pe aceeași suită
  (`t-c2-dens` și restul), față de portul reparat. Owner-ul nu are nevoie de Rust pe mașină pentru măsurătoare
  [dedus; prezența Rust pe runnerele GitHub e de verificat]. Dacă Rust 0.9, cu aceleași gărzi, are sub jumătate din
  eșecurile portului, propun trecerea pe el, iar decizia de a instala lanțul Rust e a owner-ului (întrebarea 4, §8).
  Semicercul rămâne și în Rust [citit, s1-V §4.3], deci garda de intrare e obligatorie oricum.
- **Gărzile obligatorii** (S3): curățarea intrării (vârfuri repetate, linii aproape coliniare, polilinii dense →
  arce, Douglas–Peucker pe zimți, autointersecții), validarea structurală a ieșirii (buclă deschisă sau excepție =
  eșec; rezultat gol când raza înscrisă e > d = eșec; aria monotonă în d), reîncercare cu d ± 1e-6, apoi eroare clară.
  **Niciodată un traseu tăcut greșit.** Rezoluția declarată a modelului: 0,01 mm [citit, s1-V §5.2–5.4].
- **Booleanul:** PathKit 1.0, înghețat din 2022, rămâne, dar doar cu re-ancorarea R3 după fiecare operație
  (3,3e-13 mm după 100 de operații) [măsurat, s1-V §4.6]. Stă în spatele fațadei `boolean(a, b, op)`, deci trecerea pe
  PathOps din CanvasKit (întreținut, 3,3 MB) e o schimbare de un modul, dacă apare un defect [dedus].

---

## 4. Dovada

### 4.1 Oracolele pe subsistem

Regula: oracolul unui subsistem intră **în prima felie** a subsistemului, înaintea primei funcții, și se refolosește.
Majoritatea vin direct din sonde, unde au prins defecte reale.

| Subsistemul | Oracolul (independent) | Ce citește | Valori pe hârtie (exemple) | Controale negative | Din |
|---|---|---|---|---|---|
| Geometrie (offset, boolean, transformări, normalizare) | `oracles/geom`: distanța exactă la L/A/pătratică/cubică; Hausdorff în ambele sensuri; clasificare prin numărul de înfășurare, cu bandă; **oracolul de structură** (număr de contururi, fără laturi comune) | segmentele ieșite | cercul r ± d; aria dreptunghiului rotunjit decalat; lentila; haltera 2 634,177185 mm² | offset × 1,01; inel șters; partea greșită; reuniunea care pierde găurile | s1, s1-V |
| Axa medială și V-carve | `oracles/vcarve`: suprafața ideală z = −min(D, d·cot(θ/2)) din distanța exactă la curbele de intrare, cu capetele testate explicit; oracolul 2, prin eșantionare densă, pe un set mic | textul G-code | 12 × 6 la 90°: −3,0000; cerc r 2,5 la 60°: −4,3301; triunghi: −2,8868; stea: −5,7684 | „circ” (raza algoritmului); fără legalizare; deplasare de 0,02 mm | s3, s3-V |
| Simularea (nucleul) | `oracles/gcode-sim`: citește G-code-ul cu dialectul (G0–G3, I/J sau R, G90/G91, G20/G21), grilă densă Float64, eșantionare la cell/8; regula „nucleul nu e niciodată mai sus cu peste 10 nm” | textul G-code | șanț plat Ø6 la −3: 6,000 × −3; bilă R3: secțiune cu R = 3,00000; V90: pante ±1 | 7 otrăvuri (toate prinse în sondă) | s4 |
| Relief și 3D | `oracles/relief`: CL analitic (plan, sferă, cilindru, perete); drop-cutter exact pe triunghiuri; creasta R − √(R² − (s/2)²); volumul 2/3·π·R³ | puncte CL, G-code, plasa | creasta R3, s = 1: 0,041960 | eșantion în nod; nod + vecini; fără testul pe muchii sau fețe | s5 |
| Postul | `oracles/controller`: regula de arc GRBL rescrisă din sursă; un tabel propriu pe controler (comentariu, punct zecimal, unitatea G4), scris din documentație, separat de contract | textul G-code | 200 000 de arce, 3 zecimale în mm: 0 erori; marginea 2,83·10⁻³ | 2 zecimale (controlul trebuie să cadă); tăierea lui „.000” | s8 |
| Senderul | `oracles/controller`: simulatorul GRBL (RX de 128 la octet, linia de 80, stările, erorile 20/33/11, regulile `$` pe stare) + reluarea transcrierilor de pe fier | octeții trimiși | linia de 79 trece, cea de 80 → `error:11` | un `ok` pierdut; numărare greșită | f0/07 §4.6 |
| Import / export | Python: ezdxf (recover + audit), svgelements, PyMuPDF, fontTools; Ghostscript-WASM; doar în CI | fișierul scris | aria 19 914,159265 mm²; N = 20,000000 mm | raza × 1,0001; „20 mm = em”; totul pe stratul 0; toleranța R12 | s2, s12 |
| Textul | fontTools pe același TTF | conturul | capHeight → em: 20 mm → 29,0703 mm | „înălțimea = em” | s2 |
| Persistența | Python `zipfile` + `hashlib`; omorârea procesului; SHA-256 din Node | fișierele | zip identic în 3 fusuri orare | suprascrierea pe loc **trebuie** să strice (martorul S1) | s7 |
| PWA | scenariul în 9 pași pe build-ul real | — | — | SW blocat → trebuie să pice | s7 |
| Pânza | distanțe analitice (cerc, arc, segment, parabolă, dreptunghi rotunjit); martor cu abatere prezisă pe hârtie; ritmul rAF cu martori; Event Timing | pixeli, evenimente | 92 de vârfuri → 29,149 px | martorii pozitivi (10 k redesenat; GPU × 8) | s6, s6-V |
| Planșele | invariantele M1–M6 | starea | rama 400 × 200 → canelura 380 × 180; 12 = 9 + 3 la x 10/170/330 | sabotajele M1–M6 | proto |
| Cloud și admin | perechi permis/refuzat pe emulator (reguli); perechi pe instanța de test, cu tokenuri reale (callable-uri) | răspunsuri | — | rol necunoscut; token falsificat | adm |
| Estimarea | cronometrul din jurnalul de rulare | transcrieri | T2: 12,0 s și 6,0 s | — | s8 anexa B |
| Mașina, fizic | placa de probă, cu șublerul owner-ului | lemnul | cotele fiecărei plăci (§5) | — | BRIEF §6 |

Emulatorul Firebase nu e banc de securitate: răspunde altfel decât producția în 30 din 63 de celule și acceptă un
owner falsificat [măsurat, adm §4.2]. Pe emulator se probează logica; securitatea tokenurilor se probează pe
instanța de test.

### 4.2 Poarta invariantelor

Un **invariant** e o proprietate care trebuie să țină pe orice program, oricare ar fi operația. Poarta rulează pe
**fiecare Program generat de orice test**, prin oracole (deci independent de cod). Produsul rulează un subset al ei ca
pre-flight, dar acela e o comoditate pentru om, nu o probă.

1. **Pasul:** nicio mișcare de tăiere nu scoate mai mult decât pasul pe adâncime al operației, plus toleranța.
   Se măsoară cu simularea **în ordine** (înălțimea dinaintea mutării minus vârful sculei, sub sculă).
2. **Piesa:** nicio celulă din regiunea păstrată nu e tăiată sub cota permisă. Regiunea și cotele permise le
   calculează `oracles/geom` din geometria de intrare, nu CAM-ul.
3. **Rapidele:** niciun G0 sub suprafața curentă a materialului plus garda.
4. **3D:** zero scobituri față de model (drop-cutter exact pe triunghiuri sau formula analitică) și creasta măsurată
   ≤ cea cerută.
5. **Limitele:** programul încape în cursele mașinii și nu coboară sub fundul permis al foii.
6. **Controlerul:** fiecare linie e acceptată de contract: coduri permise, lungimea ≤ 70 de octeți, punctul zecimal
   scris, arcul valid după rotunjire, cu regula controlerului.
7. **Scula și axul:** fiecare mișcare are scula ei; schimbările de sculă sunt evenimente; nicio tăiere cu axul oprit
   sau înaintea pauzei de pornire.
8. **Cadrul:** coordonatele din program = coordonatele documentului × matricea montajului, verificate pe hârtie pe
   cele patru colțuri și pe centru.

Invariantele 1 și 2 sunt cele două reguli fixe din `CLAUDE.md`; invariantul 4 e regula 3D de acolo.

### 4.3 Mutațiile

- **Unealta e în repo** (`testkit/mutations`): aplică o otravă, verifică pe hash că s-a aplicat (altfel „VOID”, nu
  „prinsă”), rulează **toate** suitele, restaurează, verifică la final față de `HEAD` [citit, f0/11 §4.8].
- **Otrăvurile nu le alege autorul feliei.** În ediția întâi, cele alese de autor au fost prinse 281 din 281, iar cele
  alese independent doar 27 din 54 [citit, LECTII §0.5]. O dată pe etapă, un agent separat alege ~10 otrăvuri pentru
  modulele critice atinse în etapă (costul e cerut la owner, întrebarea 11, §8).
- **Modulele critice:** offsetul și adaptorul de boolean, axa medială, modificatorii Z(s) (rampă, lead, punți),
  regiunea păstrată, formatorul de numere și garda de arc din post, strategiile de schimbare a sculei, nucleul de
  simulare, fluxul senderului, matricea montajului, funcția de drept de acces.
- **Regula din s4:** o metrică nouă intră în poartă doar după ce o otravă o înroșește [citit, s4 §5.12].
- **Când:** noaptea, cu buget de 60 de minute; o otravă supraviețuitoare devine un rând de corpus, nu un audit.

### 4.4 Nivelurile de CI și bugetele

| Nivelul | Când | Ce rulează | Bugetul de timp |
|---|---|---|---|
| **Rapid** | la fiecare commit, aceeași comandă local și în CI | `tsc -b`, lint (regulile de import, paritatea en/ro), testele de unitate, oracolele pe corpusul mic, poarta invariantelor pe corpusul mic, amprentele de simulare în Node | ≤ 3 min; fiecare suită are bugetul ei, cu alarmă la +20 % |
| **Complet** | la push pe `main` | Playwright (Edge și Chromium fixat): amprentele Node = browser pe tot corpusul de simulare **și aceiași octeți de Program**; scenariul PWA; CSP pe build-ul servit; fidelitatea pânzei, regula de umplere, hit-test-ul; perechile din reguli pe emulator (Java 21); oracolele Python de format; corpusurile complete (geometrie, V-carve, simulare, relief) | ≤ 15 min |
| **Noaptea** | programat | mutațiile; oracolele a doua (eșantionare densă); cazurile mari (firma de 1 200 × 400, 5 M de mutări, relief 4 000²); bugetele de performanță cu martori; martorul Rust (dacă e ales); auditul de licențe | ≤ 90 min |
| **Pe instanța de test** | după fiecare deploy pe test | callable-urile cu tokenul de debug App Check (200) și fără el (401); perechile permis/refuzat cu tokenuri reale; Diagnoza verde | ≤ 5 min |

- Commit-urile care ating doar `.md` nu pornesc CI-ul [citit, f0/11 §4.4].
- **Un CI roșu pe `main` e incidentul numărul unu**, verificat la începutul fiecărei sesiuni. Nicio publicare peste
  un roșu. În ediția întâi, CI-ul a stat mort 16 zile [citit, LECTII §1].
- Nicio țeavă (`| tail`) după o poartă: codul de ieșire al porții decide [citit, f0/11 §5].

### 4.5 Bancul vizual

- **Ce e:** randarea deterministă, offscreen, a scenelor de probă, cu **același cod de randare** ca aplicația, într-un
  PNG, plus cifrele scenei (de exemplu adâncimea în punctele de pe hârtie) [citit, f0/05 §4.5].
- **De ce:** owner-ul primește poza și cifra împreună, iar agentul nu mai iterează orb pe pânză (ediția întâi: aproape
  4 săptămâni orb) [citit, f0/05 §4.5].
- **Dinții lui:** fiecare scenă are un martor pozitiv (o scenă care trebuie să pice) și unul negativ. Bancul vechi a
  raportat verde pe 3 sabotaje [citit, LECTII §1].
- **Unde:** pornește în S4, odată cu pânza. La sfârșitul fiecărei etape, owner-ul primește o pagină cu programul
  plăcii simulat, cotele pe hârtie și cifrele oracolului.

### 4.6 Cum devine placa de probă test

1. **Specificația plăcii** stă în `testkit/boards/NN/`: proiectul, Programul (octeți + sha), lista de 5–10 cote cu
   valoarea pe hârtie și toleranța, și valorile prezise de oracol în aceleași puncte. Valorile pe hârtie le calculează
   `oracles/`, nu produsul.
2. **Prima rulare e în aer** (Z + 20 peste material), a doua în lemn [citit, s8 anexa B].
3. **Transcrierea:** senderul nostru (din S2) înregistrează tot: liniile trimise, răspunsurile, alarmele,
   override-urile, timpii. Transcrierea se salvează automat ca fixtură.
4. **Cotele măsurate:** owner-ul le scrie într-un formular mic din aplicație (sau în tabelul plăcii); commit.
5. **Testele care rămân:**
   - Programul se regenerează identic (același sha) sau diferența e explicată în commit;
   - transcrierea se reia în simulatorul de controler și dă aceeași secvență de `ok` și erori;
   - timpul real față de estimare calibrează modelul mașinii;
   - cotele măsurate față de valorile pe hârtie, în toleranță.
6. **Calibrarea pe lemn se face o singură dată** (placa 1): lățimea reală a tăieturii (bătaia frezei), adâncimea reală.
   Constantele se folosesc **doar** la compararea plăcilor cu hârtia, niciodată în nucleul oracolului
   [citit, BRIEF §13].
7. **O placă picată:** etapa rămâne deschisă (fără live); defectul confirmat trece înaintea oricărei felii noi
   [citit, LECTII §2.3].

### 4.7 Costul dovezii, ținut în frâu

Ediția întâi a eșuat și prin dovada făcută după fapt, care a ajuns să coste cât produsul: 1,5–3 linii de test și
0,6–1,45 linii de jurnal la o linie de produs, audituri de 8 M tokeni [citit, LECTII §0.6, f0/28 §6]. Regulile de aici:
- **Un oracol pe subsistem, construit o dată.** Coloana (S1–S3) construiește oracolele de simulare, de controler și
  de geometrie; restul subsistemelor își aduc oracolul în prima lor felie, de obicei portat din sondă.
- **O funcție nouă adaugă doar:** rânduri în corpus, valori pe hârtie, un control negativ.
- **Fără recenzii adversariale pe felie** și fără audituri „pentru siguranță”. Independența vine din oracole și din
  otrăvurile alese de altcineva, o dată pe etapă.
- **Cifre urmărite săptămânal, din git:** liniile de test la o linie de produs (ținta ≤ 1,2), timpul nivelului rapid
  (≤ 3 min), rândurile de DEVLOG pe felie (≤ 15), commit-urile doar de documentație. Peste țintă → retrospectivă
  scurtă la sfârșitul etapei.
- **Nicio infrastructură de dovadă înaintea primului ei consumator**, cu excepția celor ieftine doar din ziua 1 (build
  determinist, config de la gazdă, schemă cu versiune, `.gitattributes`) [citit, LECTII §2.3].

---

## 5. Planul pe etape

### 5.1 Regulile planului

- O etapă = o săptămână, ~8 felii de conținut, plus pregătirea plăcii (~0,75 felie: Programul, valorile pe hârtie,
  transcrierea → test). Se încheie cu placa tăiată de owner.
- **Coloana întâi:** S1 (IR, post, simulare, oracol, poarta), S2 (senderul, contractele, pachetul pentru ateliere),
  S3 (nucleul geometric de produs). Fiecare subsistem nou își aduce oracolul în prima felie.
- **Fiecare etapă are cel puțin o funcție care mișcă mașina**, deci fiecare placă e o probă reală.
- **Pista B** (cont, drept de acces, facturare, admin, site) ia 1–2,5 felii pe etapă din S9 încolo. Comerțul vine după
  ce bucla de bază merge pe lemn și merge în pas cu capacitatea de a încasa [citit, LECTII §2.3, §4.11].
- **Pe live:** de la S3, la sfârșitul fiecărei etape, după placă și cu confirmarea owner-ului. S1 și S2 rămân pe test:
  prima publicare live cere mecanismul P1 (sha fixat, aprobare, backup cu alarmă), care intră în S3.
- **Recomandarea mea până la lansare:** live-ul arată publicului o pagină „în curând”, iar aplicația e doar pentru
  personal (întrebarea 1, §8). Un CAM neterminat nu trebuie să ajungă la mașinile altora.
- O felie care depășește estimarea cu peste 50 % → stop și întreb. Estimarea se recalibrează din durate măsurate la
  sfârșitul lui S3 și al lui S8.
- Algoritmii portați (urechile, lead-ul, modelul incrustației, `BitProfile`, `.tdb`, planarea, fluxul GRBL, trasarea,
  registrul probei) intră cu verdictul din `docs/PORTARE.md`; estimările presupun verdictul „adaptat”. „Rescris”
  adaugă ~0,5 felie pe candidat [dedus].
- **Calendarul orientativ:** S1 = 19.10.2026, dacă planul și evaluarea portării se aprobă săptămâna viitoare;
  pauză 21.12.2026–03.01.2027; două săptămâni de rezervă, folosite unde cere o placă.

### 5.2 Tabelul pe scurt

| Etapa | Săpt. (orientativ) | Ținta | Felii | Live |
|---|---|---|---:|---|
| S1 | 19.10 | Coloana: un profil probat de la document la G-code, tăiat | 9 | nu |
| S2 | 26.10 | Senderul nostru; pachetul de posturi pleacă la ateliere | 8 | nu |
| S3 | 02.11 | Geometria de produs; admin P0 + P1; **prima publicare live** | 8,5 | **da (prima)** |
| S4 | 09.11 | Editorul: pânza exactă, acțiunile, desenul | 8,5 | da |
| S5 | 16.11 | Persistența, arborele comun A/D, profilul complet | 8 | da |
| S6 | 23.11 | Freze, materiale, găurire, dog-bone, ordinea | 8 | da |
| S7 | 30.11 | Buzunarul cu rest, simularea pe ecran, timpul | 8,5 | da |
| S8 | 07.12 | Textul și V-carve-ul pe axa medială | 8,5 | da |
| S9 | 14.12 | Incrustații, gravare, transformarea traseelor + conturile | 8 | da |
| — | 21.12–03.01 | pauză | — | — |
| S10 | 04.01 | Producția: foi, instanțe, Multi-Plate, lista de tăiere | 8,5 | da |
| S11 | 11.01 | Lucrul la mașină: palpare, senzor, override, planare, reluare | 8,5 | da |
| S12 | 18.01 | Importul și exportul cu vectori reali | 8,5 | da |
| S13 | 25.01 | Textul complet și uneltele 2D + facturarea în mod de test | 8,5 | da |
| S14 | 01.02 | Trasarea, anvelopa, operațiile decorative (1) | 8,5 | da |
| S15 | 08.02 | Operațiile decorative (2), laserul + proiectele în cloud | 8 | da |
| S16 | 15.02 | Relieful: fundația și primul relief tăiat | 8,5 | da |
| S17 | 22.02 | Editorul de forme și operațiile pe relief | 8,5 | da |
| S18 | 01.03 | Extrudare, sweep, spin, turn, îmbinări | 8 | da |
| S19 | 08.03 | Sculptura, straturile bitmap, texturile, conturul reliefului | 8 | da |
| S20 | 15.03 | Modelul 3D din STL | 8,5 | da |
| S21 | 22.03 | 3D avansat și relieful pe două fețe | 8 | da |
| S22 | 29.03 | EPS și AI ≤ 8 (după decizia owner-ului) | 8 | da |
| S23 | 05.04 | WMF/EMF, cele două interfețe, ghidul de pornire | 8 | da |
| S24 | 12.04 | Performanța pe laptopul de atelier, rezultatele atelierelor | 8 | da |
| S25 | 19.04 | Placa-sampler și auditul pragului | 7 | da |
| S26 | 26.04 | Lansarea v1 | 6 | **lansare** |
| R1–R2 | oriunde | rezervă pentru plăci picate și decizii întârziate | — | — |
| **Total** | | | **212** | |

### 5.3 Etapele, una câte una

Pentru fiecare placă: materialul e MDF de 18 mm dacă nu scrie altfel; freza implicită e dreaptă Ø6 (dacă owner-ul
are Ø6,35, cotele care depind de D se recalculează și se tipăresc pe fișă); prima rulare e în aer. Toleranțele țin cont
de o mașină de atelier (±0,1–0,15 mm), nu de oracol (µm).

---

#### S1 — Coloana vertebrală (9 felii)

**Ținta:** un profil pe un cerc și pe un dreptunghi rotunjit trece prin document → IR → post GRBL → octeți G-code, e
judecat de un oracol independent și e tăiat de owner.

**Felii:**
1. Scheletul repo-ului: spațiile de lucru, CI-ul rapid, regulile de import, paritatea en/ro verificată de compilator,
   ErrorBoundary, `.gitattributes`.
2. Build determinist, config citit de la gazdă, PWA minim, CSP fără eval probat pe build-ul servit; deploy pe test
   (doar hosting, după exportul Firestore al testului).
3. `core` (unități, tabelul de toleranțe, rezoluția 0,01 mm, `Known`/`Unknown`) + `doc` v0 (schema valibot, piesă,
   foaie, montaj cu originea ca obiect și o singură matrice).
4. `geom` v0: L/A/C, formele parametrice cu matrice, transformări exacte, cavalier adus ca atare; `oracles/geom` cu
   valorile pe hârtie din s1.
5. `ir` v0 + `cam` profil v0 (exterior, interior, treceri pe adâncime, sensul) + regiunea păstrată v0.
6. `post` v0: contractul GRBL 1.1 ca date cu sursă; formatorul (3 zecimale în mm, punctul scris mereu); garda de arc
   (coardă ≥ 10 rezoluții și unghi ≥ 1·10⁻⁴ rad, altfel G1); I/J din startul rotunjit; antetul complet; WCS explicit;
   Programul (octeți + sha + manifest); oracolul regulii de arc GRBL.
7. `sim` v0 (portul nucleului din s4) + `oracles/gcode-sim` + cele 16 piese pe hârtie + cele 7 otrăvuri + amprenta
   Node = browser pe build-ul servit.
8. Poarta invariantelor v0 (pasul, piesa, rapidele, limitele, controlerul, cadrul pe cele 4 colțuri).
9. „Laboratorul de modele”: pagina în care owner-ul alege un model parametric, vede previzualizarea și descarcă
   `.nc`; en/ro.

**Închide:** niciun rând complet; pornește „Profil, cu urechi de susținere, intrări / ieșiri, direcție de tăiere”.

**Placa 1** (≥ 250 × 150; originea în colțul din stânga jos, Z0 pe fața plăcii; cercul cu centrul la (70, 75),
dreptunghiul cu centrul la (185, 75); tăiată cu senderul folosit azi de owner):

| # | Ce se măsoară | Pe hârtie |
|---|---|---|
| 1 | Cercul în relief (profil exterior, 6 mm, în 2 treceri): diametrul | 100,00 ± 0,15 |
| 2 | Conturul interior al dreptunghiului rotunjit 80 × 40 R10 | 80,00 × 40,00 ± 0,15 |
| 3 | Distanța de la marginea cercului la marginea dreptunghiului (nu depinde de zero) | 25,00 ± 0,15 |
| 4 | De la marginea stângă a plăcii la cerc (verifică originea) | 20,00 ± 0,3 |
| 5 | Adâncimea treptei cercului | 6,00 ± 0,1 |
| 6 | Șanțul de calibrare pe linie: lungimea (100 + D) | 106,00 ± 0,15 |
| 7 | Același șanț: adâncimea; lățimea se notează (= D efectiv, calibrarea pe lemn) | 3,00 ± 0,1 |
| 8 | Litera „L” de orientare: piciorul lung spre +Y, cel scurt spre +X, citită corect de sus | da / nu |

**Confirmă:** nucleul de simulare și oracolul G-code, regula de arc GRBL, poarta invariantelor; calibrarea o dată pe
lemn. **Live:** nu.

---

#### S2 — Senderul nostru și pachetul pentru ateliere (8 felii)

**Ținta:** owner-ul taie pachetul de probă GRBL cu senderul nostru, iar pachetul pentru NcStudio, RichAuto/Syntec și
Mach3/Mach4 pleacă la ateliere.

**Felii:**
1. Transportul Web Serial (worker dedicat, de probat) + sesiunea cu tranzacții + fluxul cu numărare de caractere +
   validatorul de acceptare (lungimea liniei, ASCII, plafoane, refuz cu numărul liniei) + octeții exacți (sha).
2. `oracles/controller`: simulatorul GRBL și reluarea transcrierilor.
3. Interfața senderului: conectare, stare `Known`/`Unknown`, jog, zero cu WCS explicit, „unde e Z0” lângă buton,
   start / pauză / stop, alarme; jurnalul de rulare v0.
4. Bariera M6 în sender (M6 nu ajunge niciodată la GRBL 1.1) + palparea Z cu placa de contact.
5. Postul: cele 4 strategii de schimbare a sculei, elicea, pauza în unitatea controlerului, G54–G59; generatorul
   pachetului T0–T7 direct din IR, cu același post.
6. Contractele externe ca date (NcStudio, RichAuto, Syntec, Mach3, Mach4, grblHAL, FluidNC), starea „documentat,
   neprobat”, testele lor (punctul zecimal, G4, comentarii, linia de 70).
7. Fișa de lucru v0 (setările controlerului de verificat: N4063, AbsCntr, F Read, modul IJ, unitatea G4, `$341`) și
   arhiva pentru ateliere, en/ro.
8. Offsetul: cavalier adus la zi (reparațiile 0.8/0.9, testul „paralele”) + suita s1-V în CI + măsurătoarea martorului
   Rust 0.9 în CI → recomandarea pentru owner.

**Închide:** niciun rând complet; o parte din „Trimiterea directă la mașină (senderul)” și din „Senzor de lungime la
schimbarea frezei, cu M6 ca barieră” (bariera).

**Placa 2** (pachetul GRBL T0–T7, pe mașina owner-ului, cu senderul nostru; freza Ø3 la T1):

| # | Ce se măsoară | Pe hârtie |
|---|---|---|
| 1 | T1, cercul Ø50 din 2 × 180°: exteriorul și interiorul șanțului | 53,00 și 47,00 ± 0,1 |
| 2 | T1, cercul Ø50 din 4 × 90°: aceleași cote; distanța dintre centre | 100,00 ± 0,15 |
| 3 | T1, dreptunghiul 100 × 60 R5 pe linie: exteriorul | 103,00 × 63,00 ± 0,15 |
| 4 | T2 în aer: 200 mm la F1000 și la F2000 (jurnal + cronometru) | 12,0 s și 6,0 s ± 0,5 |
| 5 | T2: pauza după M3 | 2,0 s ± 0,3 |
| 6 | T3: gaura elicoidală Ø20, 3 spire cu pas 1: diametrul și adâncimea | 20,00 ± 0,1 și 3,00 ± 0,1 |
| 7 | T4: pătrate 20 × 20 la 2 mm cu Ø6, apoi Ø3, prin bariera M6 și re-zero: diferența de adâncime | 0,00 ± 0,1 |
| 8 | T5: aceeași piesă în G54 și în G55 (= G54 + 50 pe X) | 50,00 ± 0,15 |
| 9 | T6: linia de 79 de caractere utile trece; cea de 80 e refuzată de validator, cu numărul liniei | da / nu |
| 10 | T7: 4 găuri în pași de 2 mm: adâncimea | 10,00 ± 0,15 |

**Confirmă:** simulatorul de controler (transcrierea reluată dă aceeași secvență), contractul GRBL trece în „probat pe
<data>, GRBL 1.1h”. **Pachetul pleacă la ateliere** imediat după aprobare. **Live:** nu.

---

#### S3 — Geometria de produs și prima publicare pe live (8,5 felii)

**Ținta:** offsetul și booleanul sunt exacte și păzite pe intrări reale, iar aplicația e publicată prima dată pe live,
cu jurnalul de erori, Diagnoza, backup-ul și publicarea cu aprobare.

**Felii:**
1. Ușa de intrare a offsetului (curățare, polilinii dense → arce, Douglas–Peucker pe zimți, autointersecții) +
   validarea structurală a ieșirii + reîncercarea + eroarea clară.
2. Fitter-ul de biarce (eroarea verificată mai des, potrivire la 0,98 × toleranța) + aplatizarea cu toleranță declarată.
3. Adaptorul PathKit (arc ↔ conică, pătratică → cubică, coordonate locale) + R3 după fiecare operație + reunirea
   arcelor co-circulare + oracolul de structură.
4. Regula evenodd într-o singură funcție + normalizarea la ușile de intrare + vindecarea cu toleranță declarată și
   raport.
5. Laboratorul de modele: boolean, offset, transformări (modelele plăcii 3).
6. Admin P0 (2 felii): funcțiile în TS (`europe-central2`), `errorLogs` din client și din server, marcajele de rulare,
   Diagnoza minimă, amprenta `meta/deployment`, scheletul adminului cu fila Erori, owner-ul creat prin script, tokenul
   de debug App Check doar pe test; înainte: exportul Firestore și lista funcțiilor vechi de șters, arătată owner-ului.
7. Admin P1 (1,5 felii): workflow-ul de publicare (sha fixat, arbore curat, WIF, mediul `live` cu aprobarea owner-ului)
   + backup zilnic cu alarmă + în Diagnoză amprenta test / live și vârsta backup-ului; poarta „doar personal” pe live.

**Închide:** admin **P0** și **P1**; o parte din „Vectori, noduri, boolean, offset, aliniere”.

**Placa 3** (modele din laborator, adâncime 3, freza Ø3, deci r = 1,5):

| # | Ce se măsoară | Pe hârtie |
|---|---|---|
| 1 | Lentila (reuniunea a două cercuri R20 cu centrele la 30), profil exterior: lungimea | 70,00 ± 0,15 |
| 2 | Gâtul lentilei. Freza nu intră în colțul concav și lasă acolo un racord de rază r, deci valoarea e 2·(√((20 + r)² − 15²) − r), nu 2·√(20² − 15²) = 26,46 | 27,81 ± 0,15 |
| 3 | Niciun șanț peste zona comună (un singur contur) | da / nu |
| 4 | Dreptunghiul rotunjit 100 × 60 R8 rotit cu 30°: între laturile paralele | 100,00 și 60,00 ± 0,15 |
| 5 | Inelul: cercul Ø80 și offsetul lui spre interior cu 10, gravate cu Ø3: banda dintre șanțuri (10 − D) | 7,00 ± 0,15 |
| 6 | Diferența pătrat 60 − cerc Ø30: gaura | 30,00 ± 0,15 |
| 7 | Aceeași piesă: pătratul | 60,00 ± 0,15 |

**Confirmă:** oracolul de geometrie (Hausdorff în ambele sensuri) și oracolul de structură. **Live:** **da, prima
publicare**, după exportul Firestore al live-ului și confirmarea listei de funcții șterse.

---

#### S4 — Editorul: pânza, acțiunile, desenul exact (8,5 felii)

**Ținta:** owner-ul desenează o piesă din curbe exacte și o taie cu rampe și urechi.

**Felii:**
1. Pânza pe trei straturi (raster software în worker → ImageBitmap; GL; interacțiune) + bugetele ei în banc: abaterea
   curbei ≤ 0,5 px, cadența 60 Hz cu martori, clic → pictură ≤ 50 ms (1,5 felii).
2. Bancul vizual v1: randare deterministă → PNG + cifre, cu martori.
3. Registrul de acțiuni + jurnalul de comenzi (undo prin restaurarea valorilor stocate) + magazinul documentului.
4. Uneltele ca mașini de stare pure (testate cu scripturi de pointer) + selecție, mutare, rotire, scalare exacte +
   hit-test (flatbush + distanța exactă, 5 px pe ecran).
5. Primitivele: linie, polilinie, arc, cerc, elipsă parametrică, dreptunghi (rotunjit), poligon, stea, creionul Bézier.
6. Editarea nodurilor v0 + acroșajul.
7. Booleanul și offsetul din interfață + profilul pe orice contur închis desenat.
8. Rampa și urechile ca modificatori Z(s), cu modelul urechilor portat (palier și flancuri, verificările pe hârtie).

**Închide:** nimic complet; avansează „Vectori, noduri, boolean, offset, aliniere” și „Profil, cu urechi...”.

**Placa 4** (placă de 12 mm, decupată de tot; piesa desenată în editor: dreptunghi rotunjit 120 × 80 R15 unit cu un cerc
Ø60 centrat pe latura de sus):

| # | Ce se măsoară | Pe hârtie |
|---|---|---|
| 1 | Lățimea piesei | 120,00 ± 0,15 |
| 2 | Înălțimea piesei (80 + 30) | 110,00 ± 0,15 |
| 3 | Cercul deasupra laturii de sus | 30,00 ± 0,15 |
| 4 | Grosimea punții (din 4), măsurată de la fața de jos | 2,00 ± 0,15 |
| 5 | Lungimea punții | 8,00 ± 0,3 |
| 6 | Intrarea în rampă nu lasă urmă de plonjare | da / nu |

**Confirmă:** poarta invariantelor pe un desen liber (nu doar pe modele), bugetele pânzei pe mașina owner-ului.
**Live:** da.

---

#### S5 — Persistența, arborele comun și profilul complet (8 felii)

**Ținta:** munca supraviețuiește căderii și lipsei de rețea; rama își păstrează inelele și conținutul la orice
mărime; profilul are lead-ul ales față de regiunea păstrată.

**Felii:**
1. IndexedDB + OPFS după SHA-256 + workerul de persistență + Web Locks + curățenia la pornire.
2. Ciorna sigură la cădere (cu martorul care trebuie să strice) + recuperarea.
3. Fișierul `.cncvs` (zip determinist) + cititorul independent Python în CI; Deschide / Salvează.
4. Migrațiile pure + corpusul de aur + plafoanele pe artefact, la intrarea în magazin, pentru toate ușile.
5. PWA: actualizarea oferită, blocată cât rulează un job; scenariul în 9 pași cu martor.
6. Arborele: grupuri imbricate, rama cu inele și ancore, tabelul de gesturi (clic, dublu-clic, Escape, Ctrl+D,
   Delete), funcția de avertismente (nu repară nimic).
7. Invariantele din prototip (M1–M6) ca teste, cu sabotajele lor.
8. Regiunea păstrată de prim rang + lead-in/out ales față de ea + sensul de tăiere pe găuri și exterioare.

**Închide:** **„Profil, cu urechi de susținere, intrări / ieșiri, direcție de tăiere”**.

**Placa 5** (plăcuță cu ramă, mărită în aplicație de la 300 la 250; canelura cu Ø3 pe linie):

| # | Ce se măsoară | Pe hârtie |
|---|---|---|
| 1 | Plăcuța | 250,00 × 150,00 ± 0,15 |
| 2 | De la margine la marginea canelurii (10 − 1,5), pe toate cele 4 laturi | 8,50 ± 0,15 |
| 3 | Gaura de agățat rămâne | Ø8,00 ± 0,1 |
| 4 | Centrul ei: de la stânga și de sus | 125,00 și 20,00 ± 0,2 |
| 5 | Cercul din mijloc nu se micșorează | Ø40,00 ± 0,15 |
| 6 | Intrarea pe arc nu lasă urmă pe muchie | da / nu |

**Confirmă:** invariantele M1–M6 pe lemn (defectul vechi: gaura de 8 mm ajungea la 98 mm [citit, LECTII §5.4]).
**Live:** da.

---

#### S6 — Freze, materiale, găurire, dog-bone și ordinea (8 felii)

**Ținta:** o piesă de mobilier cu găuri, îmbinare și găurire în pași iese din biblioteca reală de freze, în ordinea
corectă, cu un fișier pe sculă.

**Felii:**
1. Biblioteca de freze cu geometrie reală (dreaptă, bilă, toroidală, V, gravare, profil) + modelul de profil portat
   (martorul bit-exact pe 186 de siluete).
2. Citirea `.tdb` (doar fișierele owner-ului) + corpusul lui.
3. Materiale + avansuri și turații (F = n · z · fz), cu sursă + profilul mașinii (curse, accelerații, pauza axului).
4. Interfața operațiilor v1 (scula, avansurile, adâncimile).
5. Găurirea: punct, în pași (desfăcută în G0/G1), elicoidală.
6. Dog-bone și T-bone.
7. Ordinea operațiilor și a vectorilor + un fișier separat pe sculă.
8. Pre-flight: freza prea scurtă, peste adâncimea maximă, G0 prin material, cursa.

**Închide:** **„Fileturi la colțuri interioare: dog-bone și T-bone”**, **„Găurire”**, **„Ordinea operațiilor și a
vectorilor; câte un fișier separat pe sculă”**; funcția §10 **„Găurire în pași (peck)”**. Din „Bibliotecă de freze cu
geometrie reală (...)” rămâne doar forma desenată, care vine în S14.

**Placa 6** (piesă 200 × 150):

| # | Ce se măsoară | Pe hârtie |
|---|---|---|
| 1 | Piesa | 200,00 × 150,00 ± 0,15 |
| 2 | Gaura 60 × 40 cu dog-bone Ø6: cepul 60 × 40 tăiat din aceeași placă intră; jocul | da; ≤ 0,2 |
| 3 | Gaura rotundă | Ø30,00 ± 0,15 |
| 4 | Cele 4 găuri Ø5 în pași: entraxele | 160,00 × 110,00 ± 0,15 |
| 5 | Adâncimea lor | 10,00 ± 0,15 |
| 6 | Gaura elicoidală | Ø12,00 ± 0,1 |
| 7 | Pre-flight: avertismentul la o operație pusă mai adânc decât tăișul (nu se taie) | da / nu |

**Confirmă:** poarta pe ordinea operațiilor și pe schimbarea sculei. **Live:** da.

---

#### S7 — Buzunarul cu rest, simularea pe ecran și timpul (8,5 felii)

**Ținta:** un buzunar cu insulă, curățat în colțuri cu a doua freză, se vede simulat pe ecran exact ca în teste, iar
timpul estimat se confirmă cu cronometrul.

**Felii:**
1. Buzunar prin offseturi (cu insule) + legarea inelelor + intrare în rampă sau elice.
2. Buzunar raster la unghi + trecerea de finisare.
3. Rest machining cu a doua freză.
4. Pas automat pentru textul mic și trăsăturile înguste (cerința [v1] din prompt).
5. Grupul de workere de simulare (rânduri de dale intercalate, traseul trimis o dată, anulare, progres) + afișarea pe
   GL + bugetul „nicio sarcină lungă” (1,5 felii).
6. Animația traseului: pas cu pas, viteză, glisor.
7. Estimarea timpului cu modelul mașinii + rezumatul jobului; calibrarea din transcrierile din S2.
8. Simularea 3D a materialului pe ecran (umbrire), din același nucleu.

**Închide:** **„Buzunar (curățare de suprafață), cu mai multe freze”**, **„Simulare 3D a materialului: 3 axe în v1,
apoi rotativ”** (partea de 3 axe), **„Calcul pe mai multe fire (workers)”**; pentru 2D: „Animația traseului” și
„Timpul estimat” (închise în S16, cu 3D).

**Placa 7:**

| # | Ce se măsoară | Pe hârtie |
|---|---|---|
| 1 | Buzunarul | 120,00 × 80,00 ± 0,15 |
| 2 | Adâncimea lui | 6,00 ± 0,1 |
| 3 | Insula; fața ei rămâne neatinsă (cota 0) | Ø30,00 ± 0,15; da |
| 4 | Colțurile după rest cu Ø3 (șablon de raze) | R1,50 |
| 5 | Buzunarul raster 60 × 40 la 3: fundul fără trepte peste 0,1 | da / nu |
| 6 | Timpul real față de estimare | ± 10 % |

**Confirmă:** ecranul arată același câmp ca testele; modelul de timp calibrat. **Live:** da.

---

#### S8 — Textul și V-carve-ul pe axa medială (8,5 felii)

**Ținta:** o firmă cu litere V-carved, cu fund plat făcut de a doua freză, iese în bugetul de toleranță măsurat de
oracol și pe lemn.

**Felii:**
1. Textul v1: fonturi (OFL incluse + ale utilizatorului, salvate ca resurse), înălțimea = majuscula (probată pe N),
   rânduri, kerning, contururi închise explicit, reuniunea glifei la conversia în curbe.
2. `medial`: Voronoi pe eșantioane + raza recalculată exact + garda pe coardă + legalizarea pe stivă + „0 muchii
   ne-Delaunay” + plafon = eroare (1,5 felii).
3. Pasul adaptiv h și termenul lui în bugetul de toleranță; corpusul s3 + s3-V, oracolul reparat, oracolul 2,
   controlul „circ”.
4. Generatorul V-carve (puncte la D și la nivele, arce cu Z liniar și gardă scalată cu unghiul).
5. Fundul plat cu a doua freză (regiunile pe niveluri cu offset exact; colțurile cu creastă ≤ 0,05).
6. Normalizarea regiunii cu PathKit + vindecarea (fără Clipper) + cusăturile aproape comune; **poarta: corpusul s3-V
   intră în bugete**.
7. Felierea regiunilor mari (firma de 1 200 × 400 în bugetul de memorie) + interfața V-carve.
8. Avertismentele: trăsături sub pas, colțuri inaccesibile.

**Închide:** **„V-carve (inclusiv cu freză dreaptă pentru fund plat)”**; o parte din „Text, text pe cale, fonturi”.

**Placa 8** (firma 300 × 100, Roboto, V60, fund plat cu Ø3, D = 3; formele de referință 4–6 sunt tăiate separat, fără
limită de adâncime):

| # | Ce se măsoară | Pe hârtie |
|---|---|---|
| 1 | Litera N, înălțimea majusculei | 30,00 ± 0,2 |
| 2 | Lățimea tulpinii lui „I” (din font, scalată, calculată de oracol) | tipărită pe fișă, ± 0,15 |
| 3 | Fundul plat | 3,00 ± 0,1 |
| 4 | Dreptunghiul 12 × 6 cu V90: creasta | −3,00 ± 0,1 |
| 5 | Cercul r 2,5 cu V60: centrul | −4,33 ± 0,1 |
| 6 | Șanțul V60 la 2 mm: lățimea la suprafață (2 · 2 · tan 30°) | 2,31 ± 0,1 |

**Confirmă:** oracolul V-carve pe lemn; planul trimite în bugete și fontul real. **Live:** da.

---

#### S9 — Incrustații, gravare pe linie, transformarea traseelor + conturile (8 felii)

**Ținta:** un dop V intră în locașul lui cu jocul de pe hârtie, iar aplicația are conturi și drept de acces calculat
pe server.

**Felii (A):**
1. Incrustația V: femela + masculul cu adâncime de start + poarta jocului pe linia de lipire, din cele două suprafețe
   simulate.
2. Decuparea dopului (algoritmul din ramura WIP, re-probat) + verificarea grosimii.
3. Incrustația cu pereți drepți, simplă și în trepte.
4. Gravarea pe linie (offset deschis pe o parte, exact) + smart engrave (axa trunchiată, V spre colțuri).
5. Transformarea traseelor calculate (mutare, rotire, oglindire, copiere, unire), exact pe IR.
6. Perechea de incrustație declarată la actul omului (nu dedusă) + interfața.

**Felii (B):**
7. Conturile (e-mail, Google) + `staff/{uid}` + modelul de capabilități în client.
8. Funcția `entitlement` pe server + proba de 14 zile fără card (registrul HMAC portat) + cache-ul offline.

**Închide:** **„Gravare pe linie; gravare «inteligentă» cu colțuri ascuțite (smart engrave)”**, **„Inlay în V (D) ȘI
inlay cu pereți drepți, simplu sau în trepte (S), fiecare cu criteriul lui”**, **„Transformarea traseelor calculate:
mutare, rotire, oglindire, copiere, unire”**.

**Placa 9** (femela în stejar, masculul în nuc; V60, Df = 3, adâncimea de start 1,5, t = 1,4):

| # | Ce se măsoară | Pe hârtie |
|---|---|---|
| 1 | Adâncimea femelei înainte de lipire | 3,00 ± 0,1 |
| 2 | Umărul masculului | 1,50 ± 0,1 |
| 3 | Dopul se așază; cel mai mare gol după rindeluire | da; ≤ 0,1 |
| 4 | Incrustația cu pereți drepți 40 × 40: dopul intră; jocul | da; 0,10 ± 0,05 |
| 5 | Gravarea pe linie V60 la 1 mm: lățimea (2 · tan 30°) și adâncimea | 1,15 ± 0,1; 1,00 ± 0,1 |
| 6 | Smart engrave pe o stea: vârfurile ajung în colțuri | da / nu |

**Confirmă:** poarta jocului din simulare (s3-V §5.5) pe lemn real. **Live:** da.

---

#### S10 — Producția: foi, instanțe, Multi-Plate, lista de tăiere (8,5 felii)

**Ținta:** piesele repetate se așază singure pe foi, cu surplusul pe foaia următoare, iar plăcuțele cu nume vin din CSV.
Decizia A/D trebuie luată înainte de această etapă.

**Felii (A):**
1. Piese și instanțe pe foi, cu nivelul doi ascuns până e cerut («Încă…», «Din CSV…», «+1»).
2. Așezarea pe rânduri + vărsarea pe foaia următoare + mutarea între foi + avertismentele.
3. CAM pe piesă, IR refolosit pe instanță prin transformare rigidă exactă + un program pe foaie și montaj + exportul
   tuturor foilor.
4. Multi-Plate: câmpurile din CSV pe instanță.
5. Lista de tăiere pe mai multe plăci + fișa de lucru completă, tipărită (PDF).
6. Șabloanele de operații + calculul în lot.
7. Editarea piesei-sursă cu N instanțe (banda, «Desprinde»).

**Felii (B):**
8. Admin P2 (1,5 felii): Utilizatori (căutare pe server, dosarul, planul, proba, dezactivarea, GDPR cu exportul derivat
   din aceeași listă ca ștergerea) + Auditul atomic cu pre-imagine.

**Închide:** **„Mai multe foi de material într-un proiect (Sheets) și plăcuțe cu date variabile din CSV (Multi-Plate)
— legat de sistemul de planșe”**, **„Șabloane de operații (aceleași setări pe alt desen) și calcul în lot”**; funcțiile
§10 **„Listă de tăiere pe mai multe plăci”** și **„Fișă de lucru tipărită (freze, ordine, zero, timp)”**.

**Placa 10** (suporturi 75 × 50 pe foi de 300 × 200, margine și distanță 10: câte 3 pe rând, 3 rânduri, deci 9 pe
foaie; 12 = 9 + 3):

| # | Ce se măsoară | Pe hârtie |
|---|---|---|
| 1 | Colțul suportului 1 | (10, 10) ± 0,2 |
| 2 | Colțul suportului 5 | (95, 70) ± 0,2 |
| 3 | Colțul suportului 9 | (180, 130) ± 0,2 |
| 4 | Mărimea fiecărui suport (identice) | 75,00 × 50,00 ± 0,15 |
| 5 | Foaia 2: exact 3 suporturi + 3 plăcuțe cu numele din CSV | 3 + 3/3 |
| 6 | Fișa tipărită: frezele, ordinea și timpul corespund rulării | da; ± 10 % |

**Confirmă:** oracolul de așezare (valorile din prototip, proto §4) pe lemn; IR-ul transformat al instanțelor trece
poarta. **Live:** da.

---

#### S11 — Lucrul la mașină (8,5 felii)

**Ținta:** toate funcțiile de mașină din v1 rulează pe mașina owner-ului, fiecare ca procedură pură cu transcriere.

**Felii (A):**
1. Palparea Z și a colțului XY (mașini de stare pure, compensarea razei palpatorului pe hârtie).
2. Senzorul de lungime la schimbarea frezei, cu M6 ca barieră.
3. Override de avans și turație + jurnalul de rulare complet, care devine fixtură.
4. Planarea plăcii de sacrificiu (portată, cu oracolul de acoperire).
5. Pre-flight la mașină: cursa, zonele interzise (cleme), rularea în aer, modul de verificare `$C`.
6. Reluarea de la o linie, cu reintrare sigură; oracolul compară materialul scos cu și fără întrerupere.
7. Profilul controlerului din `$$`, tipurile pentru N axe, reconectarea, plafoanele de program.

**Felii (B):**
8. Admin P2 (restul, 1,5 felii): Admini (`staff`, cererile, regulile „niciodată fără owner”) + plăcile de conturi și
   probe din Puls.

**Închide:** **„Trimiterea directă la mașină (senderul)”**; funcțiile §10 **„Senzor de lungime la schimbarea frezei,
cu M6 ca barieră”**, **„Găsirea colțului XY prin palpare”**, **„Override de avans/turație + jurnal de rulare”**,
**„Planarea plăcii de sacrificiu”**; admin **P2**.

**Placa 11:**

| # | Ce se măsoară | Pe hârtie |
|---|---|---|
| 1 | Planarea 150 × 150 la 0,3: planeitatea în 5 puncte | ± 0,05 |
| 2 | Palparea colțului XY, apoi pătratul la (10, 10): distanțele de la margini | 10,00 / 10,00 ± 0,1 |
| 3 | Latura pătratului | 50,00 ± 0,1 |
| 4 | Senzorul: două trepte la 1 mm, cu două freze: diferența | 0,00 ± 0,05 |
| 5 | Reluarea după oprirea la jumătate: fără adâncire la reintrare | ≤ 0,05 |
| 6 | Override 50 % pe un segment: apare în jurnal; timpul segmentului | × 2 ± 10 % |

**Confirmă:** simulatorul de controler pe proceduri; transcrierile intră în CI. **Live:** da.

---

#### S12 — Importul și exportul cu vectori reali (8,5 felii)

**Ținta:** desenele din DXF, SVG și PDF intră exact, iar exporturile se deschid editabile în programele owner-ului.

**Felii (A):**
1. Importul DXF (unități, OCS, blocuri, NURBS → Bézier, conica rațională → arc exact, straturi, avertismente).
2. Importul SVG (transformări, unități, arce, elipse; SVG ostil: fără script, fără rețea, plafoane; xmldom în worker).
3. Importul PDF și AI compatibil PDF (toate paginile, un strat pe pagină, precizia float32 declarată).
4. Exportul DXF „exact” (R2007) și „compatibil” (R12), cu straturile = rolurile; instanțele ca BLOCK/INSERT.
5. Exportul SVG, PDF (straturi OCG) și EPS + oracolele Python în CI, cu cele 4 otrăvuri.
6. Verificarea și repararea vectorilor (deschiși, dubluri, intersecții, bucle, noduri prea apropiate), fără reparații
   tăcute + plafoanele de import și desenul absurd + pachetul pentru owner (1,5 felii).

**Felii (B):**
7. Admin P2+ (2 felii): Tichete (Storage, e-mail, marcaj pe declanșator), Config (oprire, mentenanță, anunț) prin
   callable cu audit, panoul de publicare test → live.

**Închide:** **„Verificarea și repararea vectorilor: deschiși, duplicați, intersecții, bucle, noduri prea apropiate”**,
**„Export 2D cu vectori reali: DXF, SVG, PDF (EPS / AI de decis), la scara exactă, cu cercuri, arce și curbe păstrate
ca entități și cu straturile păstrate; deschis editabil în alte programe (...)”**; o parte din „Import 2D: DXF, AI /
EPS (S+D); SVG (D); PDF vectorial, DWG, WMF, DGK / PIC (S)”; admin **P2+**.

**Placa 12** (din fișierele de referință s2):

| # | Ce se măsoară | Pe hârtie |
|---|---|---|
| 1 | Cercul din DXF | Ø100,00 ± 0,15 |
| 2 | Dreptunghiul rotunjit 200 × 100 R10 rotit 30°, la scara 1:2 | 100,00 × 50,00 ± 0,15 |
| 3 | Elipsa 120 × 60 rotită 20°, gravată: axele | 120,00 / 60,00 ± 0,2 |
| 4 | Din DXF-ul în țoli: linia de 1″ | 25,40 ± 0,1 |
| 5 | Din PDF: litera N a „CNC 20 mm” | 20,00 ± 0,15 |
| 6 | Owner-ul deschide exporturile în ArtCAM, Inkscape, Illustrator / Corel, AutoCAD / LibreCAD | lista bifată |

**Confirmă:** cititorii independenți (s2) și programele owner-ului (BRIEF §16.2.4). **Live:** da.

---

#### S13 — Textul complet și uneltele 2D + facturarea în mod de test (8,5 felii)

**Ținta:** desenul 2D ajunge la pragul A, iar abonamentele se pot cumpăra în modul de test. Conținutul nivelurilor
trebuie decis înaintea feliei de facturare.

**Felii (A):**
1. Text pe cale (editabil), rânduri multiple, aliniere + fonturi single-line.
2. Cotele.
3. Transformare și copiere: rețea, circulară, de-a lungul unei curbe, înclinare, oglindire.
4. Tăierea și conversia vectorilor: tăiere cu o linie, decupare la un contur, arce în loc de curbe, netezire,
   conversie în cercuri și dreptunghiuri.
5. Alinierea și distribuirea + îmbinările miter și teșit la offsetul de desen.
6. Exportul instanțelor ca `symbol`/`use` în SVG (și desfăcut, dacă programul nu le citește).

**Felii (B):**
7. Catalogul unic + lista albă de prețuri în reguli + Stripe Checkout în mod de test + webhook-ul (2 felii).
8. Portalul clientului + accesul pe niveluri în registrul de acțiuni (0,5 felie).

**Închide:** **„Vectori, noduri, boolean, offset, aliniere”**, **„Text, text pe cale, fonturi”**, **„Cote (nici
ArtCAM nu le are: doar rigle și măsurare)”**, **„Transformare și copiere: mutare, scalare, rotire, înclinare, oglindire,
copiere în rețea, circulară și de-a lungul unei curbe (rând nou)”**, **„Tăierea și conversia vectorilor: tăiere cu o
linie, decupare la un contur, arce în loc de curbe, netezire, conversie în cercuri / dreptunghiuri (rând nou)”**.

**Placa 13:**

| # | Ce se măsoară | Pe hârtie |
|---|---|---|
| 1 | Rețeaua circulară de 6 găuri Ø8 pe R50: entraxul vecinilor (2 · 50 · sin 30°) | 50,00 ± 0,15 |
| 2 | Entraxul găurilor opuse | 100,00 ± 0,15 |
| 3 | Textul pe cale, font single-line, majuscula | 8,00 ± 0,15 |
| 4 | Forma tăiată cu o linie: latura nouă la poziția de pe hârtie | ± 0,15 |
| 5 | 5 copii pe un arc R80 la 20°: coarda dintre vecine (2 · 80 · sin 10°) | 27,78 ± 0,2 |
| 6 | Cota desenată pe piesă = cota măsurată | 80,00 ± 0,15 |

**Live:** da (facturarea rămâne în mod de test, cu eticheta „MOD DE TEST” pe ecran).

---

#### S14 — Trasarea, anvelopa și operațiile decorative (1) (8,5 felii)

**Ținta:** o imagine a owner-ului devine contur tăiat, iar canelurile, teșirea și Raised Round ies pe lemn.

**Felii (A):**
1. Trasarea din imagine (portată: luminanță cu Otsu, muchie sub-pixel, potrivirea pe arce; culoare, alfa, linie
   mediană), cu oracolul analitic, pe fișierul owner-ului.
2. Deformarea în anvelopă pentru vectori (ieșire în cubice, sub toleranță declarată).
3. Canelurile, cu încrucișări împletite.
4. Teșirea (bevel carving).
5. Raised Round.
6. Frezele de profil desenate de utilizator + roundover cu offset față de interior.
7. Simularea exactă pentru profil pe rampă (sumă de trunchiuri de con) și pentru elicea cu bilă, V sau profil (fără
   coarde interioare) [citit, s4 §5.4].

**Felii (B):**
8. Admin P3 (1,5 felii): Venituri (MRR din catalogul unic, eticheta TEST), cozile de eșecuri, verificările Stripe în
   Diagnoză.

**Închide:** **„Trasare din imagine (bitmap → vectori)”**, **„Caneluri (cu încrucișări împletite), teșire (bevel
carving), Raised Round (adâncitură cu profil)”**, **„Freze de profil desenate de utilizator; roundover cu offset față
de interior”**, **„Bibliotecă de freze cu geometrie reală (dreaptă, bilă, toroidală, V, gravare, profil, formă
desenată)”**; admin **P3**; o parte din „Deformare în anvelopă (între două curbe), pentru vectori și reliefuri”.

**Placa 14:**

| # | Ce se măsoară | Pe hârtie |
|---|---|---|
| 1 | Logo-ul trasat, la scară cunoscută: lățimea și înălțimea (pixeli × scară) | ± 0,3 |
| 2 | Caneluri cu bilă Ø6, 150 cu rampe de 20: porțiunea la adâncime plină | 110,00 ± 0,3 |
| 3 | Adâncimea și lățimea canelurii | 3,00 ± 0,1; 6,00 ± 0,15 |
| 4 | Teșirea la 45°: lățimea | 5,00 ± 0,2 |
| 5 | Roundover cu freza desenată R6 (șablon de raze) | R6 |
| 6 | Raised Round: adâncimea profilului | pe fișă, ± 0,15 |

**Live:** da.

---

#### S15 — Operațiile decorative (2), laserul + proiectele în cloud (8 felii)

**Ținta:** ghilotina, găurirea multiplă, textura și laserul ies corect, iar proiectele se salvează în cloud fără
pierderi la conflict.

**Felii (A):**
1. Traseul de textură din forma frezei.
2. Tăieri ghilotină (grilă de tăieturi drepte, așezare aliniată).
3. Găurirea cu mai multe burghie simultan (câmp nou în contract pentru blocul de găurire).
4. Laser: tăiere și gravare (modul laser GRBL, puterea pe mișcare) + laser 3D în felii pe Z (2 felii).
5. Avertismentele specifice (freza laser fără mod laser, bloc de găurire nedeclarat).

**Felii (B):**
6. Proiectele în cloud: revizii, conflict detectat, niciodată „ultimul care scrie câștigă”; blocate pe server (2 felii).

**Închide:** **„Traseu de textură direct din forma frezei, fără relief”**, **„Tăieri ghilotină (grilă de tăieturi
drepte, nesting aliniat); găurire cu mai multe burghie simultan (drillbanks)”**, **„Laser: tăiere / gravare, plus
laser 3D în felii pe Z”** (proba pe fier depinde de întrebarea 8, §8).

**Placa 15:**

| # | Ce se măsoară | Pe hârtie |
|---|---|---|
| 1 | Ghilotina: 4 pătrate din 210 × 210, cu compensarea tăieturii | 100,00 ± 0,15 fiecare |
| 2 | Textura din forma frezei: adâncimea | 1,00 ± 0,1 |
| 3 | Profilul pe rampă: adâncimea la capătul rampei | pe fișă, ± 0,1 |
| 4 | Laser (dacă există modulul): pătratul gravat | 20,00 ± 0,1 |
| 5 | Găurirea multiplă: fișierul rulat pe o mașină cu bloc de găurire, dacă există; altfel doar oracolul | da / n.a. |

**Live:** da.

---

#### S16 — Relieful: fundația și primul relief tăiat (8,5 felii)

**Ținta:** un relief din imagine se modelează pe straturi și se taie cu degroșare și finisare fără nicio scobitură.

**Felii (A):**
1. Stratul de relief: dale Float32 rare în worker, stocare Uint16 pe dală în OPFS, undo pe dale, afișare GL
   (1,5 felii).
2. Straturile de relief + combinarea (adună, scade, înalt, jos, înlocuiește, Multiply).
3. Relief din imagine + alinierea pixelilor cu grila + imagine gri pe 16 biți, dus-întors + simularea salvată ca strat.
4. Litofania.
5. Câmpul conservativ (maximul pe celulă) + distanța la segment + drop-cutter; `oracles/relief` cu controalele care
   trebuie să pice (eșantionul în nod sapă 5 mm) [măsurat, s5 §4.1].
6. Degroșarea pe trepte Z (maximul glisant portat).
7. Finisarea paralelă la orice unghi + creasta măsurată; timpul și animația pentru 3D; poarta „0 scobituri” pe orice
   program 3D.

**Felii (B):**
8. Bibliotecile partajate în cloud (freze, șabloane), blocate pe server (1 felie).

**Închide:** **„Relief din imagine (gri → înălțime)”**, **„Alinierea pixelilor imaginii cu grila de calcul (fără
„riduri” moiré)”**, **„Litofanie (relief din fotografie, pentru lumină)”**, **„Combinarea reliefurilor: adună, scade,
păstrează înalt / jos, înlocuiește; Multiply între straturi”**, **„Straturi de relief: combinare, vizibilitate,
ordine”**, **„Relief ↔ imagine gri pe 16 biți; simularea salvată ca strat de relief”**, **„Animația traseului: freza
care se mișcă pe traseu, pas cu pas, cu viteză reglabilă și glisor”**, **„Timpul estimat, afișat imediat după fiecare
calcul, și rezumatul jobului”**.

**Placa 16** (calotă din imagine gri generată: baza Ø40, înălțimea 10, deci sferă cu raza 25; degroșare Ø6,
finisare bilă Ø3, pas 0,3):

| # | Ce se măsoară | Pe hârtie |
|---|---|---|
| 1 | Vârful calotei | 10,00 ± 0,15 |
| 2 | Baza | Ø40,00 ± 0,3 |
| 3 | La 10 mm de centru: √(25² − 10²) − 15 | 7,91 ± 0,15 |
| 4 | Fundul din jur, plat | 0,00 ± 0,1 |
| 5 | Relieful salvat din simulare, recitit ca strat: identic cu placa simulată | da / nu |

**Confirmă:** oracolul de relief pe lemn; creasta (0,0075 mm aici) rămâne doar în oracol, sub ce se poate măsura.
**Live:** da.

---

#### S17 — Editorul de forme și operațiile pe relief (8,5 felii)

**Ținta:** reliefurile ArtCAM de bază se fac din vectori exacți și se taie doar în zonele alese.

**Felii (A):**
1. Editorul de forme din vector: cupolă, rotunjit, unghi, plan; vectorul rămâne rețeta (1,5 felii).
2. Înălțimea, unghiul, limita; Zero și Zero Rest.
3. Operațiile: scalarea înălțimii, negativ, offset, netezire, limită, plan înclinat.
4. Estomparea (liniară, radială, între contururi) + pantele pe pereți.
5. Relieful din text.
6. Analiza (hărți de înălțimi și de pante) + suprafața, volumul și greutatea (din câmpul în nod, nu din cel
   conservativ) [măsurat, s5 §4.8].
7. Deformarea în anvelopă pentru reliefuri + zonele (dreptunghi sau vector, libere, imbricate, contur automat, sărirea
   zonei din jur).

**Felii (B):**
8. E-mailul tranzacțional (Trigger Email + verificarea DNS în Diagnoză) + alertele din Config (1 felie).

**Închide:** **„Editor de forme: din vector → cupolă, rotunjit, unghi, plan; înălțime, unghi, limită; Zero / Zero
Rest”**, **„Operații: scalarea înălțimii, negativ (male / female), offset, netezire, limită, plan înclinat”**,
**„Estompare (liniară, radială, între contururi) și pante pe pereți (draft, cu unghi)”**, **„Relief din text”**,
**„Analiza reliefului: hartă de înălțimi și hartă de pante (gradient)”**, **„Suprafața, volumul și greutatea reliefului
(date pentru ofertă)”**, **„Deformare în anvelopă (între două curbe), pentru vectori și reliefuri”**, **„Zone: limitate
(dreptunghi sau vector), libere, imbricate (cu găuri), contur automat al modelului, sărirea zonei din jur”**.

**Placa 17:**

| # | Ce se măsoară | Pe hârtie |
|---|---|---|
| 1 | Cupola din cercul Ø60, înălțimea 8 | 8,00 ± 0,15 |
| 2 | Baza ei | Ø60,00 ± 0,3 |
| 3 | Textul ridicat | 2,00 ± 0,1 |
| 4 | Planul înclinat cu 5° pe 100 mm (100 · tan 5°) | 8,75 ± 0,15 |
| 5 | Finisarea limitată la zona 80 × 50: urmele se opresc la margini | 80,00 × 50,00 ± 0,3 |

**Live:** da.

---

#### S18 — Extrudare, sweep, spin, turn, îmbinări (8 felii)

**Ținta:** profilele trase de-a lungul căilor și îmbinările de reliefuri ies la cotele profilului.

**Felii (A):**
1. Extrudarea de-a lungul unei căi, cu profil (1,5 felii).
2. Two Rail Sweep (1,5 felii).
3. Spin (profil rotit, 360° sau între unghiuri) + Turn (formă strunjită) (1,5 felii).
4. Îmbinările: contour blend, 3D blend, mirror-merge, relief lipit pe vector, cookie cutter (2,5 felii).

**Felii (B):**
5. Site-ul public, scheletul: landing cu cifre derivate din cod, prețurile din catalog (1 felie).

**Închide:** **„Extrudare de-a lungul unei căi, cu profil”**, **„Two Rail Sweep; Spin (profil rotit în plan, pe 360°
sau între unghiuri); Turn (formă strunjită)”**, **„Îmbinări: contour blend, 3D blend, mirror-merge, relief lipit pe
vector, cookie cutter”**.

**Placa 18:**

| # | Ce se măsoară | Pe hârtie |
|---|---|---|
| 1 | Mulura extrudată: lungimea | 150,00 ± 0,2 |
| 2 | Înălțimea profilului ei în 3 puncte | pe fișă, ± 0,15 |
| 3 | Rozeta (spin): diametrul | 60,00 ± 0,3 |
| 4 | Sweep cu profil semicerc R10 între două șine paralele: înălțimea la mijloc | 10,00 ± 0,15 |
| 5 | Cookie cutter: relieful tăiat urmează vectorul | da / nu |

**Live:** da.

---

#### S19 — Sculptura, straturile bitmap, texturile, conturul reliefului (8 felii)

**Ținta:** relieful se sculptează fluid la 4 000 × 4 000, primește texturi, iar conturul lui pe o înălțime devine
vector tăiat.

**Felii (A):**
1. Sculptura: netezire locală, adaugă / scoate, șterge, întinde, cu undo pe dale, la 60 fps (1,5 felii).
2. Straturile bitmap ca suprafață de desen + forme ridicate direct din culori.
3. Texturile pe relief, fluxul de textură, țesătura (2 felii).
4. Conturul vectorial pe interval de înălțime + tăierea după culoare + magic wand (1,5 felii).
5. Rezoluția 4 000 × 4 000 cu editare fluidă: bugetele măsurate pe mașina owner-ului și pe iGPU.

**Felii (B):**
6. Consimțământul + paginile legale (Termeni, confidențialitate), cu textele de la owner (1 felie).

**Închide:** **„Sculptare: netezire locală, adăugare / scoatere material, ștergere, întindere (smudge)”**, **„Straturi
bitmap ca suprafață de desen; forme ridicate direct din culori”**, **„Texturi pe relief, flux de textură, țesătură
(weave)”**, **„Conturul vectorial al reliefului (pe interval de înălțime); tăiere după culoare; magic wand”**,
**„Rezoluție: cel puțin 4000 × 4000 de puncte (16 milioane), cu editare fluidă”**.

**Placa 19:**

| # | Ce se măsoară | Pe hârtie |
|---|---|---|
| 1 | Conul (baza Ø50, înălțimea 10), cu conturul la înălțimea 2 decupat: 50 · (1 − 2/10) | Ø40,00 ± 0,3 |
| 2 | Țesătura: adâncimea | 1,00 ± 0,1 |
| 3 | Panoul | 150,00 × 100,00 ± 0,15 |
| 4 | Zona sculptată | aprobată vizual de owner |

**Live:** da.

---

#### S20 — Modelul 3D din STL (8,5 felii)

**Ținta:** un model STL se prelucrează și se decupează cu punți, fără nicio scobitură față de plasă.

**Felii (A):**
1. Importul 3D: STL, OBJ, 3MF, 3DS, VRML, DXF 3D, în worker, cu plafoane (1,5 felii).
2. Poziționarea, scalarea, oglindirea, rotirea, alegerea feței.
3. Rasterizarea conservativă a plasei (grila acoperă plasa plus raza frezei) + oracolul exact pe triunghiuri.
4. Degroșarea și finisarea pe STL (refolosind S16).
5. Decuparea 3D: profil cu Z absolut în jurul piesei sculptate, cu punți și intrări / ieșiri.
6. Bas-relieful din model 3D + silueta.
7. Exportul reliefului ca STL / OBJ, cu toleranță (decimare).

**Felii (B):**
8. Admin P4, prima parte: Analiza (pâlnia, adopția derivată din registrul de acțiuni) (1 felie).

**Închide:** **„Import 3D din rețele de triunghiuri: STL, OBJ, 3MF, 3DS, VRML, DXF 3D; poziționare, scalare,
oglindire, rotire, alegerea feței”**, **„Degroșare 3D (în trepte Z)”**, **„Finisare paralelă (la orice unghi)”**,
**„Decupare 3D: profil cu Z absolut în jurul piesei sculptate, cu punți și intrări / ieșiri”**, **„Relief din model 3D
(bas-relief din STL), siluetă”**, **„Export relief ca STL / OBJ (deschis sau închis cu bază plană), cu toleranță”**.

**Placa 20** (modelul de test: bază 40 × 40 × 5 cu o semisferă R15):

| # | Ce se măsoară | Pe hârtie |
|---|---|---|
| 1 | Baza | 40,00 × 40,00 ± 0,2 |
| 2 | Grosimea bazei | 5,00 ± 0,15 |
| 3 | Înălțimea totală | 20,00 ± 0,15 |
| 4 | Punțile decupării 3D | 2,00 ± 0,15 |
| 5 | Bas-relieful din STL | parametri aprobați de owner |

**Live:** da.

---

#### S21 — 3D avansat și relieful pe două fețe (8 felii)

**Ținta:** aplicația oprește coliziunea cu mandrina, arată zonele inaccesibile, face modele înalte din felii și
prelucrează pe două fețe cu întoarcere.

**Felii (A):**
1. Coliziunea cu mandrina și cu motorul (al doilea profil peste același câmp).
2. Zonele inaccesibile, vizualizate.
3. Modelul mai înalt decât freza sau decât placa: felii după grosime sau după număr.
4. Relieful pe două fețe + prelucrarea cu întoarcere (fața de jos a foii, oglindirea în matricea montajului,
   înregistrarea) (2 felii).
5. Biblioteca de clipart de relief: infrastructura (răsfoire, inserare ca strat); conținutul vine de la owner.
6. Rezervă pentru defectele găsite pe plăcile 16–20 (0,5 felie).

**Felii (B):**
7. Admin P4, partea a doua: CAM simplificat din fluxul de evenimente + rezumatul zilnic (1,5 felii).

**Închide:** **„Detectarea coliziunii cu mandrina (collet) și cu motorul”**, **„Vizualizarea zonelor inaccesibile
(undercut)”**, **„Model mai înalt decât freza sau decât placa: construit din felii (după grosime sau după numărul de
felii)”**, **„Relief pe două fețe (back relief) și prelucrare cu întoarcere (flip machining)”**, **„Bibliotecă de
clipart de relief (proprie)”** (infrastructura; conținutul, întrebarea 9, §8); admin **P4**.

**Placa 21** (suport Ø90 × 12 pe două fețe; model de 24 mm din 2 felii de 12):

| # | Ce se măsoară | Pe hârtie |
|---|---|---|
| 1 | Diametrul suportului | 90,00 ± 0,2 |
| 2 | Grosimea | 12,00 ± 0,15 |
| 3 | Buzunarul de pe spate Ø60 la 3: concentric cu fața | abatere ≤ 0,3 |
| 4 | Modelul din 2 felii, după lipire: înălțimea; feliile aliniate | 24,00 ± 0,2; da |
| 5 | Coliziunea: un buzunar adânc pus intenționat e semnalat (nu se taie) | da / nu |

**Live:** da.

---

#### S22 — EPS și AI ≤ 8 (8 felii, după decizia owner-ului)

**Ținta:** EPS-urile reale ale owner-ului se importă exact sau se refuză cu motiv, niciodată pe jumătate.

**Felii:**
1. Nucleul interpretorului PostScript: scanner, stive, dicționare, proceduri, CTM, căi (2 felii).
2. Bugetul de pași, timp și memorie + workerul + EPS-ul binar DOS + comentariile DSC (1 felie).
3. Profilul Illustrator (EPS 8 → CC) + AI ≤ 8 după specificația publică (2 felii).
4. Profilul CorelDRAW, după fișierele reale ale owner-ului (1,5 felii).
5. Mesajele de refuz (text, imagini, degradeuri raportate cu numărul lor) + oracolul Ghostscript-WASM + PyMuPDF în CI,
   cu otrăvurile din s12 (1,5 felii).

**Închide:** partea EPS / AI din „Import 2D: DXF, AI / EPS (S+D); SVG (D); PDF vectorial, DWG, WMF, DGK / PIC (S)”.
Poarta: ≥ 80 % din corpusul real al owner-ului.

**Placa 22:**

| # | Ce se măsoară | Pe hârtie |
|---|---|---|
| 1–4 | O piesă din EPS-ul real al owner-ului: 4 distanțe față de aceeași piesă importată din PDF-ul ei | ± 0,1 |

**Live:** da.

---

#### S23 — WMF/EMF, cele două interfețe și ghidul de pornire (8 felii)

**Ținta:** un începător taie o plăcuță doar cu asistentul pas cu pas, iar importul 2D e complet.

**Felii:**
1. Cititorul WMF + EMF, din specificațiile publice (1,5 felii); DWG ca mesaj, cu trimitere la convertor (0,5 felii).
2. Asistentul pas cu pas: material → desen sau import → șablon de operație → simulare → trimite (3 felii).
3. Interfața completă: paleta de comenzi și scurtăturile, ca vederi ale registrului de acțiuni (1 felie).
4. Ghidul la prima pornire (1 felie).
5. Setările pe utilizator + temele, cu contrastul derivat (1 felie).

**Închide:** **„Import 2D: DXF, AI / EPS (S+D); SVG (D); PDF vectorial, DWG, WMF, DGK / PIC (S)”** (cu deciziile
owner-ului pentru DWG, DGK, PIC), **„Două interfețe: asistent pas cu pas pentru începători + interfața completă”**;
funcția §10 **„Ghid la prima pornire”**.

**Placa 23:**

| # | Ce se măsoară | Pe hârtie |
|---|---|---|
| 1 | Plăcuța făcută doar din asistent, dintr-un șablon: cele 2 cote ale șablonului | ± 0,15 |
| 2 | Adâncimea gravurii | ± 0,1 |
| 3 | Timpul de la pornire la prima tăiere | notat (minute) |
| 4 | O piesă din WMF: 2 cote | ± 0,15 |

**Live:** da.

---

#### S24 — Performanța pe laptopul de atelier și rezultatele atelierelor (8 felii)

**Ținta:** aplicația își ține bugetele pe un laptop slab, iar toate posturile v1 sunt probate pe controlere reale.

**Felii:**
1. Măsurătorile pe un laptop real de atelier (pânza, simularea, relieful); planul B al pânzei doar dacă pică
   criteriul (1,5 felii).
2. Rezultatele atelierelor integrate: contractele trec în „probat pe <data>, <versiune>”; a doua rundă RichAuto
   (1,5 felii).
3. Auditul en/ro complet + accesibilitatea de bază + mesajele de eroare din (cale, cod, limită) (1,5 felii).
4. Exercițiul de restaurare din backup + Diagnoza completă (1 felie).
5. Fiecare filă de admin exersată pe test, cu scenariul ei (1,5 felii).
6. Rezervă pentru defectele găsite pe plăci (1 felie).

**Închide:** criteriul de lansare „Posturile pentru NcStudio, Richauto/Syntec și Mach3 sunt probate pe controlere
reale”; „Adminul din §16.1 e complet pentru v1 și se poate exersa pe instanța de test”.

**Placa 24:** placa 1 și placa 2 tăiate din nou, cu postul final (regresie fizică), plus fișierele ateliere
reconfirmate: 6 cote din plăcile 1 și 2. **Live:** da.

---

#### S25 — Placa-sampler și auditul pragului (7 felii)

**Ținta:** fiecare operație v1 trece încă o dată pe lemn, iar fiecare rând v1 are commit și probă.

**Felii:**
1. Proiectul-sampler: câte o instanță din fiecare operație v1 pe o singură foaie (1,5 felii).
2. Auditul pragului: fiecare rând v1 cu starea „făcut”, commit-ul și placa lui (1 felie).
3. Auditul listei de lansare din BRIEF §8 (1 felie).
4. Repetiția probei străinului, cu cineva din afara proiectului (1 felie).
5. Rezervă pentru defecte (2,5 felii).

**Placa 25** (sampler): 10 cote alese din plăcile anterioare (profil cu punți, buzunar cu rest, V-carve cu fund plat,
femela de incrustație, gravarea pe linie, canelura, găurirea în pași, elicea, un relief mic, finisarea 3D), fiecare cu
valoarea ei pe hârtie. **Live:** da.

---

#### S26 — Lansarea v1 (6 felii)

**Ținta:** un om dintr-un atelier își face cont și taie o piesă fără ajutor, iar live-ul se deschide publicului.

**Felii:**
1. Proba străinului: cont nou, probă de 14 zile, o piesă tăiată fără ajutor, cu tot drumul înregistrat.
2. Stripe live, dacă CAEN-ul e deblocat; altfel, decizia owner-ului de lansare fără încasare.
3. Partea legală: entitatea, adresa de firmă, Termenii.
4. Scoaterea porții „doar personal” de pe live.
5. Arhivarea repo-ului vechi.
6. Rezervă.

**Placa 26:** piesa străinului, măsurată față de desenul lui (cotele le alege el). **Live:** **lansarea**.

### 5.4 Acoperirea

**Cele 65 de rânduri v1** din `ACOPERIRE-ARTCAM-DESKPROTO.md` (numele exacte) și etapa în care se închid:

| Grupa | Rândul | Etapa |
|---|---|---|
| A | Vectori, noduri, boolean, offset, aliniere | S3 → S13 |
| A | Text, text pe cale, fonturi | S8 → S13 |
| A | Verificarea și repararea vectorilor: deschiși, duplicați, intersecții, bucle, noduri prea apropiate | S12 |
| A | Import 2D: DXF, AI / EPS (S+D); SVG (D); PDF vectorial, DWG, WMF, DGK / PIC (S) | S12 → S22 → S23 (cu deciziile owner-ului) |
| A | Export 2D cu vectori reali: DXF, SVG, PDF (EPS / AI de decis), la scara exactă, cu cercuri, arce și curbe păstrate ca entități și cu straturile păstrate; deschis editabil în alte programe (rând nou, cerut de owner; `BRIEF.md` §16.2) | S12 |
| A | Cote (nici ArtCAM nu le are: doar rigle și măsurare) | S13 |
| A | Deformare în anvelopă (între două curbe), pentru vectori și reliefuri | S14 → S17 |
| A | Trasare din imagine (bitmap → vectori) | S14 |
| A | Mai multe foi de material într-un proiect (Sheets) și plăcuțe cu date variabile din CSV (Multi-Plate) — legat de sistemul de planșe | S10 |
| A | Transformare și copiere: mutare, scalare, rotire, înclinare, oglindire, copiere în rețea, circulară și de-a lungul unei curbe (rând nou) | S13 |
| A | Tăierea și conversia vectorilor: tăiere cu o linie, decupare la un contur, arce în loc de curbe, netezire, conversie în cercuri / dreptunghiuri (rând nou) | S13 |
| B | Profil, cu urechi de susținere, intrări / ieșiri, direcție de tăiere | S1 → S5 |
| B | Fileturi la colțuri interioare: dog-bone și T-bone | S6 |
| B | Buzunar (curățare de suprafață), cu mai multe freze | S7 |
| B | V-carve (inclusiv cu freză dreaptă pentru fund plat) | S8 |
| B | Găurire | S6 |
| B | Ordinea operațiilor și a vectorilor; câte un fișier separat pe sculă | S6 |
| B | Gravare pe linie; gravare „inteligentă” cu colțuri ascuțite (smart engrave) | S9 |
| B | Inlay în V (D) ȘI inlay cu pereți drepți, simplu sau în trepte (S), fiecare cu criteriul lui | S9 |
| B | Caneluri (cu încrucișări împletite), teșire (bevel carving), Raised Round (adâncitură cu profil) | S14 |
| B | Freze de profil desenate de utilizator; roundover cu offset față de interior | S14 |
| B | Transformarea traseelor calculate: mutare, rotire, oglindire, copiere, unire | S9 |
| B | Traseu de textură direct din forma frezei, fără relief | S15 |
| B | Tăieri ghilotină (grilă de tăieturi drepte, nesting aliniat); găurire cu mai multe burghie simultan (drillbanks) | S15 |
| B | Laser: tăiere / gravare, plus laser 3D în felii pe Z | S15 |
| C | Relief din imagine (gri → înălțime) | S16 |
| C | Alinierea pixelilor imaginii cu grila de calcul (fără „riduri” moiré) | S16 |
| C | Litofanie (relief din fotografie, pentru lumină) | S16 |
| C | Editor de forme: din vector → cupolă, rotunjit, unghi, plan; înălțime, unghi, limită; Zero / Zero Rest | S17 |
| C | Combinarea reliefurilor: adună, scade, păstrează înalt / jos, înlocuiește; Multiply între straturi | S16 |
| C | Extrudare de-a lungul unei căi, cu profil | S18 |
| C | Two Rail Sweep; Spin (profil rotit în plan, pe 360° sau între unghiuri); Turn (formă strunjită) | S18 |
| C | Relief din text | S17 |
| C | Operații: scalarea înălțimii, negativ (male / female), offset, netezire, limită, plan înclinat | S17 |
| C | Estompare (liniară, radială, între contururi) și pante pe pereți (draft, cu unghi) | S17 |
| C | Conturul vectorial al reliefului (pe interval de înălțime); tăiere după culoare; magic wand | S19 |
| C | Export relief ca STL / OBJ (deschis sau închis cu bază plană), cu toleranță | S20 |
| C | Rezoluție: cel puțin 4000 × 4000 de puncte (16 milioane), cu editare fluidă | S19 |
| C | Îmbinări: contour blend, 3D blend, mirror-merge, relief lipit pe vector, cookie cutter | S18 |
| C | Straturi bitmap ca suprafață de desen; forme ridicate direct din culori | S19 |
| C | Sculptare: netezire locală, adăugare / scoatere material, ștergere, întindere (smudge) | S19 |
| C | Straturi de relief: combinare, vizibilitate, ordine | S16 |
| C | Relief pe două fețe (back relief) și prelucrare cu întoarcere (flip machining) | S21 |
| C | Relief din model 3D (bas-relief din STL), siluetă | S20 |
| C | Texturi pe relief, flux de textură, țesătură (weave) | S19 |
| C | Analiza reliefului: hartă de înălțimi și hartă de pante (gradient) | S17 |
| C | Relief ↔ imagine gri pe 16 biți; simularea salvată ca strat de relief | S16 |
| C | Suprafața, volumul și greutatea reliefului (date pentru ofertă) | S17 |
| C | Bibliotecă de clipart de relief (proprie) | S21 (infrastructura; conținutul: owner) |
| D | Import 3D din rețele de triunghiuri: STL, OBJ, 3MF, 3DS, VRML, DXF 3D; poziționare, scalare, oglindire, rotire, alegerea feței | S20 |
| D | Degroșare 3D (în trepte Z) | S16 → S20 |
| D | Finisare paralelă (la orice unghi) | S16 → S20 |
| D | Animația traseului: freza care se mișcă pe traseu, pas cu pas, cu viteză reglabilă și glisor | S7 → S16 |
| D | Timpul estimat, afișat imediat după fiecare calcul, și rezumatul jobului | S7 → S16 |
| D | Zone: limitate (dreptunghi sau vector), libere, imbricate (cu găuri), contur automat al modelului, sărirea zonei din jur | S17 |
| D | Detectarea coliziunii cu mandrina (collet) și cu motorul | S21 |
| D | Vizualizarea zonelor inaccesibile (undercut) | S21 |
| D | Decupare 3D: profil cu Z absolut în jurul piesei sculptate, cu punți și intrări / ieșiri | S20 |
| D | Model mai înalt decât freza sau decât placa: construit din felii (după grosime sau după numărul de felii) | S21 |
| F | Simulare 3D a materialului: 3 axe în v1, apoi rotativ | S1 → S7 |
| F | Bibliotecă de freze cu geometrie reală (dreaptă, bilă, toroidală, V, gravare, profil, formă desenată) | S6 → S14 |
| F | Trimiterea directă la mașină (senderul) | S2 → S11 |
| F | Calcul pe mai multe fire (workers) | S7 |
| F | Șabloane de operații (aceleași setări pe alt desen) și calcul în lot | S10 |
| F | Două interfețe: asistent pas cu pas pentru începători + interfața completă | S23 |

Total: 11 (A) + 14 (B) + 24 (C) + 10 (D) + 6 (F) = **65**.

**Cele 8 funcții v1 din BRIEF §10:**

| Funcția | Etapa |
|---|---|
| Listă de tăiere pe mai multe plăci | S10 |
| Fișă de lucru tipărită (freze, ordine, zero, timp) | S2 (v0) → S10 |
| Senzor de lungime la schimbarea frezei, cu M6 ca barieră | S2 (bariera) → S11 |
| Găsirea colțului XY prin palpare | S11 |
| Override de avans/turație + jurnal de rulare | S2 (jurnalul v0) → S11 |
| Planarea plăcii de sacrificiu | S11 |
| Găurire în pași (peck) | S2 (T7) → S6 |
| Ghid la prima pornire | S23 |

**Funcțiile [v1] din prompt-ul de pornire**, care nu sunt rânduri de prag, intră tot: arcele G2/G3 native (S1),
V-carve cu două freze (S8), profilul cu urechi, rampe și lead (S4–S5), pasul automat pentru textul mic (S7), simularea
pe tot jobul cu același motor ca testele (S1, S7), avertismentele (S6), timpul cu accelerațiile reale (S7), senderul
cu verificarea înainte de start, reluarea și palparea Z (S2, S11), materialele și avansurile (S6), importul robust cu
plafoane (S5, S12), workerele (S7), offline și recuperarea (S5), schema cu versiune (S1, S5), securitatea (S1, S3),
instanțele test / live (S3), monitorizarea erorilor (S3), en/ro și setările (S1, S23).

**Adminul (adm §5.2):**

| Tranșa | Ce conține | Etapa |
|---|---|---|
| P0 | jurnalul de erori, fila Erori, Diagnoza minimă, amprenta, scheletul, owner-ul prin script, accesul pe test și local | S3 |
| P1 | publicarea cu sha fixat și aprobare, backup cu alarmă, amprenta test / live în Diagnoză | S3 |
| P2 | Utilizatori, Audit atomic, Admini, plăcile Puls de conturi | S10 → S11 |
| P2+ | Tichete, Config, panoul de publicare | S12 |
| P3 | Venituri, cozile de eșecuri, verificările Stripe, placa MRR | S14 |
| P4 | Analiză, CAM simplificat, rezumatul zilnic; fiecare filă exersată pe test | S20 → S21 → S24 |
| AI | fila AI | mai târziu, odată cu AI-ul (BRIEF §16.1) |

Cele 12 file din v1: Puls, Utilizatori, Venituri, Analiză, CAM, Tichete, Erori, Diagnoză, Config, Audit, Admini,
Operare cu publicarea.

**Lista de lansare (BRIEF §8):**

| Criteriul | Unde se închide |
|---|---|
| Toate rândurile v1 și cele 8 funcții sunt făcute | tabelele de mai sus; auditul în S25 |
| Fiecare rând are commit-ul lui în listă | se scrie la fiecare felie; auditul în S25 |
| Fiecare funcție care mișcă mașina e probată pe placa etapei ei | plăcile 1–25 |
| Posturile pentru NcStudio, Richauto/Syntec și Mach3 probate pe controlere reale | pachetul pleacă după S2; rezultatele integrate pe măsură ce vin; închis în S24 |
| Un străin își face cont și taie o piesă fără ajutor | repetiție în S25, proba în S26 |
| Plata funcționează (Stripe live după CAEN, sau decizia owner-ului) | mod de test în S13; S26 |
| Partea legală (entitatea, adresa de firmă, Termenii) | paginile în S19; datele owner-ului; S26 |
| Backup cu alarmă, jurnal de erori de server, costul AI pe apel (dacă există AI), en + ro complet | S3; nu există AI în v1; auditul en/ro în S24 |
| Adminul §16.1 complet, exersabil pe test | S24 |
| Exportul vectorial §16.2 probat cu cititor independent și deschis de owner | S12 |

### 5.5 Ce las deoparte

- **Niciun rând v1 nu e scos.** Trei părți depind de decizia owner-ului, cu recomandarea mea (§3.7 punctul 7): DWG
  nativ (propun doar mesaj în v1), DGK și PIC (propun scoaterea, fără specificație publică).
- **Conținutul bibliotecii de clipart de relief:** infrastructura e în S21, dar conținutul (modelele) nu e muncă de
  program. Cine îl face e întrebarea 9 din §8.
- **Știfturile de aliniere** pentru două fețe sunt rândul v1.x „Prelucrare pe două fețe / mai multe fețe, cu știfturi
  de aliniere”. În S21, întoarcerea se face pe marginile plăcii, cu știfturile ca ajutor opțional, nu ca funcție
  completă.
- **AI-ul și fila AI din admin:** „mai târziu”, conform BRIEF.

---

## 6. Estimarea

**Totalul:** **212 felii de conținut** în **26 de etape**, plus pregătirea plăcilor (~0,75 felie pe etapă, ~20 în
total), plus **2 săptămâni de rezervă**. Calendarul nominal: S1 în săptămâna 19.10.2026, pauză de 2 săptămâni la
sărbători, lansarea nominală în săptămâna **26.04.2027**; cu rezerva folosită, în săptămâna **10.05.2027**. Banda
realistă: **23–37 de săptămâni calendaristice**.

**Ipotezele, scrise:**
1. **Ritmul nominal: 8 felii de conținut pe săptămână** (aproximativ 1,6 pe zi lucrătoare, 5 zile), plus placa.
   - Reperele măsurate: ediția întâi a avut 1 009 commit-uri în 97 de zile active [măsurat în git, f0/00]; în zilele
     cu țintă clară (24–25.09) au ieșit 17 felii închise în două zile [citit, f0/28 §4]; o felie mare cu dovadă
     retrofitată a costat 2–3 zile [citit, f0/28 §6]; o sondă de Faza 2 (prototip + oracol + măsurători) a durat
     ~80 de minute de agent [măsurat, DEVLOG.md 07.10], iar tranșa 1b a depășit estimarea cu 45 % [măsurat,
     DEVLOG.md 07.10].
   - De ce 8 și nu 17 pe două zile: o felie de produs are și interfață, i18n, CI, commit, push și încercarea
     owner-ului; o felie de reparație țintită n-are. De ce nu 2–3 zile pe felie: aici dovada e infrastructură existentă,
     nu se construiește după funcție [dedus].
2. **Banda:** 10 felii pe săptămână (coloana merge și dovada rămâne ieftină) → ~21 de săptămâni de lucru;
   6 pe săptămână (dovada se scumpește, plăci picate) → ~35. Cu sărbătorile: 23–37 de săptămâni calendaristice.
3. **Mărimea feliilor** vine din sonde, acolo unde există cod de probă (s1–s12 au deja oracolul și cazul principal), și
   din estimările din s9 (adminul: 12–17 felii; aici 13) și s12 (EPS: „2–3 săptămâni de lucru”, aici 8 felii, cu nucleul
   portat din proba de 493 de linii) [citit, adm §5.2; s12 §4.3].
4. **Relieful are cel mai mare risc de subestimare** (24 de rânduri în 43 de felii, S16–S21), fiindcă multe operații
   nu au fost sondate (extrudarea, sweep-ul, texturile, îmbinările) [citit, s5 §6]. Rezerva R1–R2 e gândită în primul
   rând pentru el.
5. **Recalibrarea:** la sfârșitul lui S3 și al lui S8, din duratele măsurate ale feliilor (marcajele din commit-uri și
   din sesiuni). Dacă ritmul măsurat e sub 7, planul se refac cu owner-ul, care poate reconsidera beta-ul sau v1
   [citit, BRIEF §15].
6. **Ce nu e în estimare:** timpul owner-ului (plăcile, deciziile, atelierele, CAEN-ul, entitatea juridică) și
   evaluarea portării dinaintea lui S1.

**Comparația cu estimarea din planul PDF:** 93–138 de felii pentru v1-ul vechi, 188–273 pentru tot drumul [citit,
BRIEF §1, §11]. Cele 212 + ~20 de aici cad în banda drumului întreg, cum anticipa BRIEF-ul pentru noul v1.

---

## 7. Riscurile

| # | Riscul | Semnalul timpuriu | Ce facem |
|---|---|---|---|
| 1 | Estimarea e prea optimistă: v1 are 65 de rânduri, 8 funcții, adminul și lansarea | la S3 sau S8, ritmul măsurat < 7 felii pe săptămână; orice felie > +50 % | stop și întreb; replanificare cu owner-ul pe cifre; rezerva R1–R2; owner-ul poate reconsidera beta-ul (BRIEF §15) |
| 2 | Dovada ajunge iar să coste cât produsul (recidiva ediției întâi) | testele > 1,2 linii la o linie de produs pe o etapă; nivelul rapid > 3 min; DEVLOG > 15 rânduri pe felie; felii doar de dovadă | un oracol pe subsistem, construit o dată; fără recenzii pe felie; retrospectivă scurtă la etapa care trece de prag |
| 3 | Nucleul geometric cade pe fișiere reale (polilinii dense, zimți, deriva PathKit, PathKit înghețat) | validarea ieșirii pică pe > 1 % din corpusul real al owner-ului; segmente R3 „ambigue” | gărzile din S3; martorul Rust; fațada permite trecerea pe PathOps din CanvasKit; corpusul real al owner-ului din S3 |
| 4 | Atelierele nu se găsesc sau răspund încet (drumul critic al lansării) | până la sfârșitul lui S4, nu există un atelier confirmat pentru fiecare familie; niciun rezultat până la S12 | pachetul pleacă după S2; fișierele sunt mici și se rulează întâi în aer; RichAuto are buget de două runde; owner-ul caută prin furnizori de mașini |
| 5 | Owner-ul nu ajunge la mașină în săptămâna etapei | placa netăiată la 3 zile după etapă, de două ori la rând | plăci de ≤ 45 de minute de mașină; etapa rămâne deschisă (fără live), cea următoare continuă pe test; două plăci se pot tăia într-o sesiune |
| 6 | Laptopurile de atelier sunt prea slabe (pânza, relieful 4 000²) | bancul pe iGPU în S4: imaginea exactă > 1 s la 50 k sau cadre pierdute; operațiile de relief peste buget în S19 | LINE_STRIP, raster software în worker, LOD; criteriul scris pentru planul B; măsurătoarea pe un laptop real în S24 |
| 7 | Determinismul Node = browser se rupe (funcții `Math`, versiuni V8) | amprentă sau sha de Program diferit în nivelul complet | trigonometrie o dată pe mutare, nimic de felul `acos`/`atan2` pe celulă [citit, s4 §5.2]; formator propriu; Chromium fixat în CI; roșu = stop |
| 8 | Comerțul nu depinde de noi (CAEN, entitatea, Stripe live) | fără CAEN până la S20; fără entitate până la S19 | totul construit în mod de test; owner-ul decide lansarea fără încasare (BRIEF §8) |
| 9 | Proiectele Firebase refolosite: codul vechi, regiunile mixte, un declanșator care tace | marcaj de rulare lipsă; Diagnoza roșie; funcții vechi rămase | exporturi Firestore înainte de fiecare prim deploy; lista funcțiilor de șters arătată owner-ului; tabelul de regiuni testat; marcaj pe fiecare job |
| 10 | Procesul derapează iar („continua”, registrul ca foaie de parcurs, context pierdut, Drive-ul readuce fișiere) | > 30 % din felii în afara listei etapei; lista owner-ului > 5 deschise; `git status` arată fișiere vechi | ținta etapei scrisă în plan; feliile se aleg din etapă; registrul = datorii cu gravitate; un document pe subsistem; `git status` la începutul sesiunii |

---

## 8. Ce cere de la owner

Recomandarea mea e prima la fiecare punct. Lista e grupată pe momente, ca să nu fie mai mult de 5 lucruri deschise
deodată.

### Acum, înainte de S1

1. **Live-ul până la lansare.** Recomand: publicul vede o pagină „în curând”, iar aplicația pe live e doar pentru
   personal (contul tău), până la S26. Motivul: un CAM neterminat nu trebuie să ajungă la mașinile altora.
   Alternativa: aplicația deschisă de la prima publicare (S3).
2. **Deploy-ul pe test și exportul Firestore.** Recomand: exportul Firestore al lui `cncvectorstudio-test` și
   înlocuirea hosting-ului de test cu aplicația nouă în S1. Funcțiile vechi de pe test le ștergem abia în S3, după ce
   vezi lista.
3. **Atelierele.** Pas pentru tine: găsește câte un atelier cu NcStudio, cu RichAuto sau Syntec și cu Mach3 sau Mach4,
   care să ruleze fișiere mici, întâi în aer. Pachetul pleacă la sfârșitul lui S2.
4. **Pentru prima placă:** freza dreaptă (Ø6 sau Ø6,35), MDF de 18 mm, șublerul, senderul pe care îl folosești azi
   (pentru S1), plus ieșirea `$$` a mașinii și fișierul `FREZE.tdb` (pentru S6).
5. **Agentul care alege otrăvurile.** Recomand: o dată pe etapă, un agent separat alege ~10 otrăvuri pentru modulele
   critice (~0,2–0,3 M tokeni, ~15 minute). E un workflow multi-agent, deci cere acordul tău o dată, pentru tot drumul.

### Până la S3

6. **Elemente separate care se suprapun în aceeași operație.** Recomand: se unesc (buzunarul acoperă amândouă), cu
   avertisment pe suprapunere. Alternativa: se scad, după regula evenodd între elemente.
7. **Martorul Rust pentru offset (după măsurătoarea din S2).** Recomand: rămânem pe portul JS reparat; trecem pe
   originalul Rust 0.9 în WASM doar dacă martorul arată sub jumătate din eșecuri, iar atunci instalăm lanțul Rust pe
   mașina ta și în CI.
8. **Pași de configurare pentru publicarea pe live:** cheia reCAPTCHA Enterprise pentru domeniul de test, WIF pe
   ambele proiecte, mediul `live` în GitHub cu aprobarea ta, confirmarea listei funcțiilor vechi de șters și exportul
   Firestore al live-ului.
9. **Întrebările adminului (adm §5.4).** Recomand: creditele de export nu intră în v1; jurnalul de erori fără
   consimțământ, cu uid pseudonim și retenție de 90 de zile (de verificat juridic); primele publicări aprobate în
   GitHub, panoul din admin în S12; tichetele folosite întâi de tine, pe test.

### Până la S10

10. **Planșele: A sau D,** după prototip. Recomand D. Plus cele trei alegeri din prototip: ce e „piesă” pe foaie
    (recomand: orice lucru pus direct pe foaie e o piesă cu o instanță); Ctrl+D face o copie separată, iar copiile
    legate vin doar din «Încă…»; mărimea unei instanțe e mărimea piesei, cu banda „se schimbă toate cele N”.
11. **Corpusul tău real:** DXF, SVG, PDF, AI, EPS, WMF, imagini și STL-uri primite de ateliere, plus două lemne
    contrastante pentru placa de incrustație (S9). Corpusul intră în teste din S3 și decide poarta EPS.
12. **Conținutul nivelurilor de abonament** (Hobby / Pro / Producție): ce capabilitate intră în fiecare. Trebuie înainte
    de S13, când se scrie codul de facturare.

### Până la S20

13. **Formatele de import (s12).** Recomand: EPS și AI ≤ 8 în v1, cu interpretor propriu (S22) și cererea unei oferte
    Artifex în paralel; DWG doar ca mesaj în v1, nativ decis în v1.x; WMF în v1, EMF peste prag; DGK și PIC scoase din
    prag, cu motivul scris.
14. **Laserul și blocul de găurire.** Ai un modul laser pe mașină? Există o mașină cu bloc de găurire în atelierele
    tale? Dacă nu, recomand proba laserului în aer (puterea 0, verificată în jurnal) și a blocului doar prin oracol,
    cu probă fizică în v1.x.
15. **Clipartul de relief propriu.** Recomand: un set mic făcut chiar cu aplicația (S16–S21), din forme și text, plus
    modele comandate unui designer, cu drepturi cedate. Nu se copiază clipart ArtCAM.
16. **E-mailul și partea legală:** MX, SPF și DKIM pe domeniu (până la S17); entitatea juridică, adresa de firmă și
    textele Termenilor (până la S19).

### Înainte de lansare

17. **Stripe live:** starea CAEN-ului până la S24; dacă nu e gata, decizia de lansare fără încasare.
18. **Străinul:** cineva dintr-un atelier care să facă proba de lansare (repetiție în S25, proba în S26).
