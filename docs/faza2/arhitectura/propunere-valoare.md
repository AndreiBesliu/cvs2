# Propunerea „valoare”: o tăietură reală în fiecare săptămână

Faza 2, tranșa 2 · 07.10.2026 · unul dintre cei trei arhitecți independenți. Unghiul meu: **valoarea pentru owner
întâi**. Planul e organizat în jurul primei tăieturi reale pe mașina owner-ului și al unui pas vizibil în fiecare
săptămână. Fără cod: e o propunere de plan.

**Marcaje:**
- **[măsurat]** = cifră rulată într-o sondă sau în proiectul vechi, cu fișierul-sursă;
- **[citit]** = scris într-un document sau în cod, cu fișierul-sursă;
- **[dedus]** = concluzia mea, nerulată.

**Sursele, prescurtate** (toate sub `C:/Users/besli/Desktop/MyWork/Apps/cncvs2/`):

| Scurt | Fișierul |
|---|---|
| BRIEF, LECTII, ACOPERIRE, CLAUDE | `BRIEF.md`, `LECTII.md`, `ACOPERIRE-ARTCAM-DESKPROTO.md`, `CLAUDE.md` |
| s1, s1-V | `docs/faza2/sonde/s1-geometrie/RAPORT.md`, `…/VERIFICARE.md` |
| s2 | `docs/faza2/sonde/s2-export-import/RAPORT.md` |
| s3, s3-V | `docs/faza2/sonde/s3-vcarve/RAPORT.md`, `…/VERIFICARE.md` |
| s4 | `docs/faza2/sonde/s4-simulare/RAPORT.md` |
| s5 | `docs/faza2/sonde/s5-relief/RAPORT.md` |
| s6, s6-V | `docs/faza2/sonde/s6-panza/RAPORT.md`, `…/VERIFICARE.md` |
| s7 | `docs/faza2/sonde/s7-date-offline/RAPORT.md` |
| s8 | `docs/faza2/sonde/s8-posturi/RAPORT.md` |
| s9-admin | `docs/faza2/admin/RAPORT.md` |
| s10-planșe | `docs/faza2/prototip-planse/RAPORT.md` |
| s11 | `docs/faza2/sonde/s11-izolare/RAPORT.md` |
| s12 | `docs/faza2/sonde/s12-formate/RAPORT.md` |
| f0/NN | `docs/faza0/NN-*.md` (doar local; nu citez detalii de securitate) |
| DEVLOG | `DEVLOG.md` (ediția a doua) |
| JSON | `C:/Users/besli/Desktop/MyWork/Apps/PlanNou-CNC/CERCETARE-DETALIATA.json`, secțiunea `arch.roadmap` |

Când o verificare contrazice sonda ei, am luat verificarea (s1-V, s3-V, s6-V). Unde n-am făcut-o, spun de ce.

---

## 1. Ideea de bază

1. Fiecare săptămână se termină cu o piesă tăiată pe mașina owner-ului (COSTEL, 800 × 1200 × 200, GRBL 1.1h
   [citit: f0/07]) și cu o funcție pe care el o folosește chiar atunci, nu „mai târziu”.
2. Primele două etape fac **bucla subțire completă**: desen → profil → G-code GRBL → senderul nostru → placă
   măsurată cu șublerul. Problemele de integrare apar în prima săptămână, nu în a patra lună.
3. Apoi lărgesc subsistemele **unul câte unul, în ordinea valorii pentru un atelier de producție**: piese decupate,
   plăcuțe cu text și V-carve, editare, import și export, buzunare, mașina, foile de producție, incrustațiile, apoi
   relieful și 3D-ul.
4. Arhitectura e cea probată în sonde, dar **se construiește doar cât cere felia de azi**. Fiecare modul apare odată
   cu prima funcție care îl folosește, cu oracolul lui scris înaintea funcției. Excepție: ce e ieftin doar din prima
   zi (build determinist, config de la gazdă, schema cu versiune, `t()`, ErrorBoundary, regulile de import) [citit:
   LECTII §2.3].
5. **Drumul critic stă la vedere:** pachetul pentru ateliere pleacă la sfârșitul săptămânii 3; prima publicare pe
   live tot atunci; relieful și 3D-ul, cel mai mare bloc (8 etape, E17–E24), stau la mijloc, cu un tampon înainte și
   unul după;
   facturarea vine târziu, în pas cu CAEN-ul; adminul crește în tranșe legate de nevoi (P0 în săptămâna 2, P4 la
   final).
6. **Placa de probă e aprobarea etapei.** Cotele măsurate și transcrierea senderului devin teste automate. În etapele
   fără funcții noi de mașină se taie **placa de regresie**, o placă fixă comparată cu măsurătorile ei vechi.
7. Estimarea e de **218,5 felii în 31 de etape săptămânale**, cu 8 felii pe săptămână ca ipoteză. O re-măsor la
   etapele 4 și 8, din duratele reale (regula din CLAUDE).

---

## 2. Glosarul

Fiecare cuvânt are un singur sens în cod, în interfață și în discuții.

| # | Cuvântul | Ce înseamnă, într-o frază |
|---:|---|---|
| 1 | **Foaie** (sheet) | O placă reală de material, cu dimensiuni, grosime, față și orientare, pe care se așază piese; pe ea se generează programul. |
| 2 | **Material** | Ce e foaia (esența, grosimea, densitatea), de unde vin avansurile implicite și greutatea. |
| 3 | **Piesă** (part) | Un obiect fizic de tăiat (o ușiță, o plăcuță), cu arborele lui de desen și operațiile lui. |
| 4 | **Instanță** | O așezare a unei piese pe o foaie (poziție, rotire, câmpuri din CSV) care trimite la piesă și nu copiază desenul. |
| 5 | **Element** | O frunză a arborelui: vector, text, relief sau model 3D. |
| 6 | **Grup** | Un nod al arborelui care ține împreună elemente și alte grupuri, oricât de adânc. |
| 7 | **Ramă** (frame) | Un grup cu contur: ce pui în ea devine al ei, iar conținutul nu-și schimbă niciodată singur mărimea. |
| 8 | **Inel** | Un contur paralel cu rama, la o distanță fixă (de exemplu canelura la 10 mm), cu identitatea lui. |
| 9 | **Operație** | O entitate care referă elemente și spune ce face scula (profil, buzunar, V-carve…), cu scula, avansurile și locul ei în ordine. |
| 10 | **Montaj** (setup) | Felul în care foaia stă pe mașină: fața, originea de lucru, axa și știfturile. |
| 11 | **Sculă** (freză) | O siluetă reală h(r), cu diametru, lungimi și date de tăiere; operația ține un instantaneu al ei. |
| 12 | **Regiunea păstrată** | Materialul care trebuie să rămână (piesa), din care scula n-are voie să scoată nimic. |
| 13 | **IR-ul traseului** | Programul ca date: mișcări tipizate (linie, arc, elice) cu Z la ambele capete, cu scula, operația și etichetele (intrare, punte, aer). |
| 14 | **Post** | Singurul cod care transformă IR-ul în text G-code pentru un controler anume. |
| 15 | **Contract de dialect** | Regulile unui controler scrise ca date, fiecare cu sursa ei și cu starea „documentat” sau „probat în atelier”. |
| 16 | **Program** | Fișierul G-code scris de post, identificat prin hash; senderul trimite exact octeții lui. |
| 17 | **Sender** | Partea aplicației care vorbește cu un controler GRBL prin Web Serial; controlerul e sursa de adevăr. |
| 18 | **Strat de relief** | O hartă de înălțimi pe dale, cu modul ei de combinare; relieful e rezultatul straturilor. |
| 19 | **Oracol** | Cod de test scris separat, fără niciun import din aplicație, care știe răspunsul corect din geometrie sau din formule. |
| 20 | **Invariantă** | O regulă fizică verificată pe orice program generat: niciodată mai adânc decât pasul, nimic scos din regiunea păstrată, nicio scobitură sub model. |
| 21 | **Placă de probă** | Piesa tăiată de owner la sfârșitul etapei, cu 5–10 cote date dinainte; e aprobarea etapei. |
| 22 | **Placă de regresie** | O placă fixă, tăiată din nou în etapele fără funcții noi de mașină și comparată cu măsurătorile ei vechi. |
| 23 | **Felie** | Cea mai mică livrare: un commit, ceva ce owner-ul poate încerca, cu dovada scrisă înaintea funcției. |
| 24 | **Etapă** | O săptămână de felii alese din plan, încheiată cu placa de probă și cu publicarea pe live, după confirmarea owner-ului. |
| 25 | **Capabilitate** | Un drept numit (de exemplu „exportă G-code”), cerut de o acțiune; setul de capabilități al unui cont (dreptul de acces) se calculează doar pe server. |

---

## 3. Arhitectura

### 3.1 Harta modulelor

Un singur repo, un singur pachet de aplicație, cu dosare-module. Regulile de import dintre ele le verifică CI-ul
(§3.3). Modulele „pure” nu ating DOM-ul și rulează identic în Node (teste) și în workerii din browser.

```
cncvs2/
  src/
    geom/       nucleul geometric (pur)
    doc/        documentul: schema, arborele, piese/foi/instanțe, operații, montaje, resurse (pur)
    actions/    stratul de acțiuni + jurnalul de comenzi (singurul care scrie documentul)
    tools/      freze, materiale, avansuri (pur)
    toolpath/   IR-ul traseului, lungimi, timpul estimat (pur)
    cam/        motorul CAM: 2d/, modifiers/, vcarve/, relief3d/, mesh3d/, laser/ (pur, rulează în workeri)
    post/       postul unic + contractele de dialect ca date (pur)
    sim/        nucleul de simulare pe dale (pur, rulează în workeri)
    relief/     straturile de relief și operațiile lor (pur, rulează în workeri)
    mesh/       modelele 3D: import, plasare, câmpul conservativ (pur, rulează în workeri)
    io/         ușile de import și export, fișierul .cncvs (pur, rulează în workeri)
    machine/    senderul: transport Web Serial, sesiune, proceduri ca mașini de stare
    persist/    IndexedDB + OPFS + actualizarea PWA (worker de persistență)
    view/       pânza: straturi, unelte ca mașini de stare, funcția unică de vedere
    ui/         interfața React: panouri, dialoguri, asistentul pentru începători
    admin/      adminul (încărcat separat, doar pentru personal)
    cloud/      clientul de cloud: cont, drept de acces citit, erori, tichete
    caps/       registrul de capabilități (date)
    i18n/       en, ro (ro: typeof en), plurale, glosar
    workers/    intrările workerilor, bazinul, protocolul de mesaje, anularea
  shared/       catalogul comercial (sursa unică) + tipuri comune client/server
  functions/    Cloud Functions în TypeScript, pe domenii (errors, diag, admin, entitlement,
                billing, tickets, backup, publish)
  testkit/      oracole, simulatorul de controler, corpusuri, plăcile, unealta de mutații
                (ZERO importuri din src/)
  scripts/      build determinist, deploy, amprentă, catalog → Stripe, rularea mutațiilor
  docs/         ADR-uri, sursele contractelor de dialect, PORTARE.md, planul
```

[dedus, din LECTII §4 și din „Ce schimbă în arhitectură” al fiecărei sonde]

### 3.2 Un fapt, o autoritate

Cauza de arhitectură numărul unu din ediția întâi a fost „un fapt, mai multe autorități” [citit: LECTII §2.2, clasa 1].
Tabelul fixează autoritatea fiecărui fapt. Oricine altcineva doar citește.

| Faptul | Autoritatea | Cine îl citește |
|---|---|---|
| Forma exactă a unui contur sau a unei forme parametrice | `geom` (modelul de curbă) | toți, prin funcțiile din `geom` |
| „Înăuntru sau în afară” (regula de umplere) | `geom/region` (§3.7, punctul 1) | pânza, clicul, CAM-ul, exportul |
| Toleranțele și rezoluția modelului (0,01 mm) | `geom/tolerance` (bugetul pe etape) | CAM, export, post |
| Ce conține proiectul | `doc` (un singur arbore + piese/foi/instanțe + operații + montaje + resurse prin hash) | toți |
| Cum se schimbă documentul și undo-ul | `actions` (jurnalul de comenzi cu valorile vechi și noi) | interfața, pânza, mai târziu AI-ul |
| Originea de lucru și transformarea document → mașină | montajul din `doc` + o singură matrice în `geom/frame` | CAM (o aplică o dată), pânza (inversa) |
| Geometria sculei h(r) și avansurile | `tools` | CAM, simularea; oracolul are copia lui independentă |
| Unde merge scula | `cam` → IR | simularea, postul, estimarea, previzualizarea, fișa de lucru |
| Textul G-code | `post` + contractele de dialect | exportul, senderul (octeții, cu hash) |
| Starea mașinii (poziții, `$$`, alarme) | controlerul, citit de `machine/session` | interfața, estimarea (modelul mașinii din `$$`) |
| Ce material rămâne | `sim` | pânza, avertismentele, testele |
| Înălțimile reliefului | `relief` (dalele deținute de workeri) | CAM 3D, pânza, exportul STL |
| Ce poate face un cont | serverul: `entitlements/{uid}`, scris doar de funcții | `caps` în client (doar citire) |
| Prețurile și nivelurile | `shared/catalog` (generat spre Stripe, funcții, client) | toți |
| Rolul de admin | documentul `staff/{uid}` | regulile (`staffLevel()`), callable-urile [citit: s9-admin §5.1] |
| Ce versiune rulează pe test și pe live | `meta/deployment`, scris de pipeline | Diagnoza, panoul de publicare |
| Textele interfeței | `i18n` (en; ro verificat de compilator) | interfața, adminul |
| Cotele unei plăci de probă | `testkit/placi/E<n>/fisa.json` | generatorul plăcii, testele |

### 3.3 Regulile de import (verificate în CI)

„A → B” înseamnă că A are voie să importe din B. Orice altă săgeată e roșie în nivelul rapid.

| Modulul | Are voie să importe din |
|---|---|
| `geom`, `caps`, `i18n`, `shared` | nimic din `src/` |
| `tools` | `geom` |
| `doc` | `geom`, `tools` |
| `toolpath` | `geom` (doar tipuri) |
| `relief`, `mesh` | `geom` |
| `cam` | `geom`, `doc` (citire), `tools`, `toolpath`, `relief`, `mesh` |
| `post` | `toolpath` |
| `sim` | `toolpath`, `tools` |
| `io` | `geom`, `doc`, `relief`, `mesh` |
| `persist` | `doc`, `io` (doar fișierul `.cncvs`) |
| `machine` | `post` (doar tipurile contractului) |
| `workers` | modulele pure pe care le găzduiesc (`cam`, `sim`, `relief`, `mesh`, `io`, `geom`, `post`) |
| `actions` | `doc`, `geom`, `caps`, `persist`, clientul `workers` |
| `view` | `doc` (citire), `geom` (clic), `toolpath` (desen), `actions` |
| `cloud` | `caps`, `i18n` |
| `ui` | `actions`, `view`, `machine`, `cloud`, `caps`, `i18n` |
| `admin` | `cloud`, `i18n`, `ui/kit` |
| `functions` | `shared` |
| `testkit` | **nimic din `src/`** |

Interdicțiile care contează cel mai mult:
- interfața nu cheamă direct geometria, CAM-ul, postul sau simularea; trece prin acțiuni [citit: LECTII §4.7];
- postul nu știe de document; simularea nu știe de CAM sau de post; senderul nu știe de document;
- oracolele nu importă nimic din aplicație [citit: s4 §5.11, s3 §5.8].

**Unealta:** `dependency-cruiser`, cu tabelul de mai sus drept configurare [dedus]. Proba că plasa vede: un fișier-capcană
din `testkit` importă `ui → cam` și testul cere ca regula să-l raporteze. Fără capcană, regula poate fi vidă.

### 3.4 Fluxurile de date

**F1. De la desen la mașină (drumul care mișcă mașina):**
1. Acțiunea omului → `actions` scrie comanda în jurnal și schimbă documentul (rev nou).
2. Operațiile modificate se trimit la bazinul de workeri CAM, ca instantaneu al intrărilor lor (după id și rev).
3. CAM-ul produce **IR-ul**, deja în coordonatele mașinii (matricea montajului se aplică o singură dată, aici).
4. IR-ul merge la: simulare, estimare, previzualizare, fișa de lucru. Nimeni nu mai citește textul G-code înapoi
   [citit: LECTII §2.2, clasa 2].
5. **Postul** citește IR-ul + contractul de dialect și scrie **programul** (text ASCII + hash). Validatorul de
   acceptare refuză o linie prea lungă sau un caracter non-ASCII, cu numărul liniei [citit: f0/07 §4.5].
6. **Senderul** trimite exact octeții programului, cu hash-ul afișat; nu regenerează nimic [citit: f0/07 §4.4].

**F2. De la document la ecran:**
1. `doc` (firul principal) → delte după rev → workerul de raster.
2. Workerul de raster ține câte un Path2D pe formă, grupate în găleți spațiale, și desenează pe o pânză **software**
   (`OffscreenCanvas` cu `willReadFrequently`). Imaginea pleacă la firul principal ca `ImageBitmap` transferat
   [măsurat: s6-V §5.1].
3. Traseele și harta de înălțime se desenează în stratul WebGL2 propriu (LINE_STRIP sau segmente instanțiate) [măsurat:
   s6-V §5.2].
4. Stratul de interacțiune (mânere, previzualizarea uneltei) e un Canvas2D mic, pe firul principal.
5. Clicul: indexul `flatbush` + distanța exactă din `geom`, cu aceeași regulă de umplere [măsurat: s6 §4.5–4.6].

**F3. Relieful:**
1. Generatorii (din imagine, editorul de forme, extrudare, text) lucrează din curbele exacte; vectorul nu se pierde
   [citit: s5 §5.8].
2. Straturile stau pe dale Float32 de 256 × 256, rare, **deținute de workeri**; o operație schimbă doar marginile
   (halo-ul) între benzi [măsurat: s5 §5.1, s11 §5.2].
3. Ecranul primește doar dalele modificate; CAM-ul 3D folosește **câmpul conservativ** (maximul pe celulă), niciodată
   eșantionarea în nod [măsurat: s5 §4.1].
4. Stocarea și undo-ul: Uint16 cu scară pe dală (eroare 0,15–0,46 µm) [măsurat: s5 §2].

**F4. Persistența și fișierul de proiect:**
1. Documentul, pointerul „versiunea curentă” și jurnalul: **o singură bază IndexedDB**, cu tranzacții [măsurat: s7 §4.4].
2. Octeții resurselor (fonturi, imagini, STL, dale de relief): **OPFS, fișiere numite după SHA-256, scrise o singură
   dată** (`.tmp` → `flush` → `move` → verificare) [măsurat: s7 §5.5].
3. Derivatele (trasee, câmpuri, G-code) sunt cache după hash și se pot șterge oricând.
4. Fișierul `.cncvs` = zip determinist (manifest + JSON canonic + `assets/<sha256>`), identic octet cu octet în orice fus
   orar [măsurat: s7 §4.5].

**F5. Cloud-ul:**
1. **Contul:** Firebase Auth (Google + e-mail); App Check impus peste tot, același cod pe test și pe live [citit:
   s9-admin §5.3].
2. **Dreptul de acces:** funcțiile scriu `entitlements/{uid}` din probă, din Stripe și din acordările de admin. Clientul îl
   citește și îl ține în cache offline, cu expirare. Exportul și senderul se blochează **prin convenție** în client;
   cloud-ul și bibliotecile partajate se blochează **pe server** [citit: BRIEF §4].
3. **Capabilitățile din ziua 1:** fiecare acțiune își declară capabilitatea în registru; până la facturare, toate sunt
   permise. Împărțirea pe niveluri se scrie apoi ca date, fără refactorizare [citit: BRIEF §4].
4. **Facturarea:** Stripe în modul de test, cu produsele din ediția întâi; prețurile într-o singură sursă, cu listă
   albă pe server [citit: BRIEF §4, LECTII §4.11].
5. **Adminul:** rolul din `staff/{uid}`; citirile prin reguli; orice scriere prin callable, cu auditul în aceeași
   tranzacție și cu pre-imaginea [citit: s9-admin §5.1].
6. **Observabilitatea:** `errorLogs` scris doar de server (client, server, declanșatoare, joburi), marcaje de rulare pe
   fiecare job și declanșator, backup cu alarmă, Diagnoza [citit: s9-admin §5.1].
7. **Regiunile:** baza în `nam5`, funcțiile în `europe-central2`, declanșatoarele Firestore în `us-central1` [citit:
   BRIEF §7]. Fiecare declanșator are marcaj de rulare, fiindcă în ediția întâi unul a tăcut două zile [citit:
   s9-admin, fila Tichete].

### 3.5 Workerii: ce rulează unde

| Firul | Ce rulează | Ce date deține |
|---|---|---|
| Principal | documentul, acțiunile, jurnalul, interfața React, stratul de interacțiune, compunerea WebGL2, indexul de clic, sesiunea Web Serial | documentul (o copie costă ~0,6 s, deci nu circulă între fire [măsurat: s7 §4.6]) |
| Raster (1) | rasterul exact al vectorilor, pe pânză software | Path2D pe găleți |
| Geometrie (1) | PathKit (WASM) și cavalier: boolean, offset, ușa regiunii | cache după (id, rev) |
| Bazinul de calcul (N = min(16, nuclee − 2), minim 2) | CAM 2D/V-carve/3D, simularea (rândurile de dale r mod N), relieful (benzile), mesh-urile | dalele simulării și ale reliefului, IR-ul trimis o dată pe traseu |
| Persistență (1) | IndexedDB, OPFS, zip; un singur scriitor, cu Web Locks între file | resursele |
| Import (la cerere) | DXF, SVG, PDF, EPS, WMF, STL, cu buget de pași, timp și memorie | — |

Reguli [măsurat: s11 §5; s4 §5.6]:
- datele se **transferă**, nu se partajează (fără `SharedArrayBuffer`);
- nucleele se scriu peste „o bandă cu decalaj” `(buffer, gj0, rows)`, deci trecerea ulterioară la memorie partajată nu
  cere rescrierea lor;
- halo-ul e o constantă calculată din nucleu și are test cu vârfuri puse exact la marginea benzii;
- orice calcul greu are anulare și progres; nicio sarcină lungă > 50 ms pe firul principal [citit: JSON, M3].

### 3.6 Stack-ul

| Strat | Alegerea | Versiunea | De unde |
|---|---|---|---|
| Browserul | Chrome / Edge (Chromium) desktop | Edge 154 măsurat | [citit: BRIEF §3; măsurat: s4–s7] |
| Limbajul | TypeScript strict | 7.x (s7 a folosit 7.0.2) | [măsurat: s7] |
| Build + PWA | Vite + vite-plugin-pwa (Workbox), actualizare „oferită” | 8.3 / 2.0 (Workbox 7.4) | [măsurat: s7 §4.7] |
| Interfața | React, plus un store mic doar pentru starea interfeței (nu documentul) | React 19, Zustand 5 | [dedus; ediția întâi: React 18 + Zustand 5, citit în `package.json` vechi] |
| i18n | `t()` propriu, cu `ro: typeof en` | — | [citit: LECTII §3.1] |
| Schema | valibot (`looseObject`, fără `eval`, merge sub CSP strict) | 1.5 | [măsurat: s7 §4.2]; rezerva: zod 4 |
| Zip | fflate | 0.8.3 | [măsurat: s7 §4.5] |
| Boolean | PathKit (Skia PathOps), dependență înghețată, în spatele unei fațade | 1.0.0 | [măsurat: s1, s1-V] |
| Offset | cavalier_contours, copie JS în repo, cu reparațiile din Rust 0.8/0.9 | port din 0.1.1 | [măsurat: s1-V] |
| Clicul | flatbush (rezervă: rbush) | 4.6.2 | [măsurat: s6 §4.5] |
| Axa medială | delaunator + robust-predicates + legalizare Lawson pe stivă | 5.1.0 / 3.0.3 | [măsurat: s3, s3-V] |
| Fonturi | opentype.js, cu prinderea erorilor GSUB | 2.0.0 | [măsurat: s2, s3] |
| Import | `dxf`, `svgpath` (cu `Number()` pe steguleț), `@xmldom/xmldom`, `pdfjs-dist` | 5.3.1 / 2.6.0 / 0.9.12 / 6.4.299 | [măsurat: s2] |
| Export | `@tarikjabiri/dxf` (fixat, cu test pe codurile de grup), scriitor R12 propriu, `pdf-lib`, EPS propriu | 2.9.0 / — / 1.17.1 | [măsurat: s2] |
| Firebase | `firebase`, `firebase-functions`, `firebase-admin`, `firebase-tools` | 12.19 / 7.4 / 14.5 / 15.32.1 | [citit: s9-admin, s11] |
| Teste | Vitest (paralel), Playwright pe artefactul construit; Java 21 pentru emulatorul de reguli | — | [dedus; citit: f0/11 §4] |
| Oracole Python (doar jobul de test din CI) | ezdxf, svgelements, PyMuPDF, fontTools, Ghostscript-WASM | 1.4.4 / 1.9.6 / 1.28 / 4.66 / 0.0.2 | [măsurat: s2, s12]; AGPL doar în test, niciodată în aplicație |

**Nu intră în aplicație:** Clipper, paper.js, maker.js, flatten-js, bezier-js, PixiJS, CanvasKit, `dxf-parser`, jspdf
(pentru vectori), TypeBox, arktype, WASM pentru simulare, calculul pe GPU (implicit), COOP/COEP, voron8 (GPL),
Ghostscript, `marchingsquares` (AGPL cu excepție condiționată) [măsurat sau citit în sondele respective; LECTII
„Decizii luate”].

### 3.7 Cele 9 puncte deschise, închise

**1. Regula de umplere.**
- **Decizia:** documentul are **o singură regulă, `evenodd`** (paritatea imbricării), pentru ecran, clic și sculă.
  Regula sursei se aplică **o singură dată, la ușa de intrare**: glifele (nonzero), SVG cu `fill-rule` nonzero sau
  implicit, PDF `f` și EPS `fill` (nonzero) se normalizează prin uniune (PathOps `simplify` cu `FillType`-ul sursei) în
  contururi simple, fără suprapuneri. Orientarea nu se stochează; se derivă din imbricare. „Închis” e un câmp explicit
  al conturului.
- **De ce:** pe date normalizate, cele două reguli dau același rezultat, deci nimic nu mai depinde de orientarea
  arbitrară din DXF/SVG.
- **Dovezi:**
  - cu `nonzero`, o gogoașă cu gaura orientată la fel diferă în 757 din 4 000 de puncte [măsurat: s6 §4.6];
  - Roboto v3 are contururi suprapuse: nonzero ≠ par-impar pe 41 din 65 de caractere [măsurat: s3 §4];
  - pe 27 de glife Arial, regulile nu diferă [măsurat: s6 §4.6];
  - orientarea se derivă, nu se stochează [citit: LECTII §6, lecția 7].
- **Ce rămâne de probat (felia E4.1):** `simplify` din PathKit n-a fost probat [citit: s1 §5.4]. Oracolul felie: aria
  după regula sursei = aria după `evenodd` pe forma normalizată, pe glifele Roboto v3, Segoe Script și Kunstler din
  s3-V.

**2. Arcele eliptice.**
- **Decizia:** **calea are trei primitive: linie, arc de cerc, cubică** (s1). Elipsa și arcul de elipsă sunt **forme
  parametrice cu matrice**, deci exacte la orice transformare, și se exportă exact (ELLIPSE în DXF R2007, `ellipse`/`A`
  în SVG). Un arc eliptic devine cubice sub toleranța declarată doar în trei cazuri: la „convertește în cale”, la
  boolean/offset și când vine **în interiorul** unei căi mixte (SVG `A` cu rx ≠ ry, o polilinie dintr-un bloc scalat
  neuniform). Un ELLIPSE sau un cerc dintr-un bloc scalat neuniform rămâne formă parametrică.
- **Dovezi:**
  - 8 cubice țin elipsa la 0,001 mm până la r = 50 mm, 16 până la r = 1 220 mm [măsurat: s1 §4.6];
  - fiecare primitivă în plus înmulțește cazurile din fiecare operație; în ediția întâi 12 module ignorau arcul [citit:
    s1 §5.2, LECTII §1];
  - CNC-ul n-are mișcare eliptică, iar PDF-ul n-are arce deloc [citit: s1 §5.2];
  - s2 a probat exportul și importul exact al elipsei ca entitate: rămâne valabil, ca formă parametrică [măsurat: s2 §4].
- **De ce nu ca s2:** IR-ul din s2 era modelul unei sonde de fișiere, nu IR-ul traseului. Ce cere s2 (ELLIPSE exact,
  blocul (2;1) → elipsă) se păstrează integral.

**3. Calculul pe GPU în v1.**
- **Decizia:** **tot calculul care decide unde merge scula și tot ce verifică testele rulează pe CPU.** WebGPU nu e
  necesar în v1. Are un singur declanșator măsurat: dacă la placa etapelor E17 sau E21, pe mașina owner-ului sau pe un
  laptop de atelier, o operație globală pe relief de 4000² trece de 250 ms sau finisarea a 2,67 M de puncte trece de
  30 s, atunci WebGPU intră **doar** ca accelerator pentru editarea reliefului și pentru afișare. Rezultatul se
  stochează, iar o probă GPU = CPU (toleranță 1 µm) rulează pe mașina owner-ului. Traseele și simularea rămân pe CPU.
- **Dovezi:**
  - CPU-ul e identic bit cu bit în Node și în Edge, pe orice număr de fire; GPU-ul diferă cu până la 0,18 µm, iar CI-ul
    n-are placă video [măsurat: s4 §4.5];
  - pe 16 workeri, fără memorie partajată: blur 4000² în 99 ms, finisarea a 2,67 M de puncte în 2,29 s [măsurat: s11
    §2]; pe GPU: 35 ms și 90 ms [măsurat: s5 §4.5];
  - deci CPU-ul încape în buget pe o mașină bună; pe un laptop cu 4 fire, ~4× mai lent [dedus].

**4. Workerii: memorie partajată sau benzi transferate.**
- **Decizia:** **adopt s11.** Fără izolare cross-origin în v1; datele grele stau în workeri și se transferă; dacă va
  trebui vreodată memorie partajată, se activează cu Document-Isolation-Policy, nu cu COOP + COEP.
- **Dovezi:** COOP + COEP strică login-ul Google, și prin popup, și prin redirect; transferul costă × 1,10–1,23 la blur
  și × 0,97 la finisare; rezultatele sunt identice bit cu bit [măsurat: s11 §2].

**5. Normalizarea regiunii pentru V-carve.**
- **Decizia:**
  - normalizarea (uniunea după regula sursei, vindecarea) o face **ușa regiunii din `geom`**, adică PathKit cu
    re-ancorarea R3, aceeași funcție ca la desen. **Clipper nu intră** [citit: s3 §5.4 cere chiar „aceeași funcție ca la
    desen”; s1 §5.10];
  - offseturile pentru fundul plat (zonele F_k și inelele din colțuri) se fac cu cavalier, exact, pe linii și arce;
  - **vindecarea intrării, cu toleranță declarată** (implicit 0,005 mm, sub rezoluția modelului de 0,01 mm): închide
    fantele și golurile sub toleranță, scoate micro-găurile, lipește muchiile aproape comune și spune omului ce a reparat.
    Aceeași ușă servește rândul „Verificarea și repararea vectorilor”;
  - **pasul de eșantionare e adaptiv:** h ≤ 0,02 mm pe trăsăturile sub ~0,5 mm (text sub ~10 mm, fonturi script, linii
    fine), altfel 0,05 mm; bugetul de toleranță primește explicit termenul de eșantionare;
  - **legalizarea e pe stivă (Lawson)**, urmată de un test robust care cere zero muchii ne-Delaunay; orice plafon aruncă
    eroare, niciodată ieșire tăcută;
  - **incrustația are adâncime de start** în generator, iar poarta ei e jocul pe linia de lipire, calculat din cele două
    suprafețe simulate.
- **Dovezi:**
  - cifrele-titlu din s3 erau la h = 0,02; la h = 0,05 plăcuța iese cu 0,0163 mm sub ideal, peste bugetul de 0,014
    [măsurat: s3-V §2];
  - legalizarea pe treceri se oprește tăcut la plafon (230 de muchii proaste, 16–19 s); pe stivă: 0,08 s și zero muchii
    proaste [măsurat: s3-V §4(d)];
  - muchiile aproape comune (~0,9 µm) lasă cusătura netăiată (−6,93 mm pe hârtie, 0 simulat) [măsurat: s3-V §4(b)];
  - masculul fără adâncime de start nu intră; cu ea, jocul variază cu 0,034 mm la h = 0,05 și cu 0,015 mm la h = 0,02
    [măsurat: s3-V §4(h)].
- **Ce rămâne la owner:** formele care se ating în aceeași operație se unesc sau rămân separate? (§8, întrebarea 5.)

**6. Pânza.**
- **Decizia:** **adopt s6-V.** Vectorii exacți se rasterizează într-un worker, pe pânză **software**, și se predau ca
  `ImageBitmap`; traseele dense se desenează ca LINE_STRIP pe plăcile slabe; bugetul de segmente instanțiate se alege la
  pornire dintr-un test scurt de cadru; planul B (vectori pe WebGL) nu se promovează. Linia vectorilor are 1 pixel fizic.
- **Dovezi:** clicul apare pe ecran în 24 ms (p95 32) pe ambele plăci; imaginea exactă de 50 k forme vine în 67–121 ms;
  5 M de segmente LINE_STRIP țin 60 Hz și pe iGPU; linia de 1 pixel fizic e de 13–20 de ori mai ieftină [măsurat: s6-V
  §2, §4].
- **Criteriul planului B** (scris dinainte): se promovează dacă, pe un laptop real de atelier, imaginea exactă de 50 k
  forme trece de ~1 s, sau dacă owner-ul respinge imaginea neclară din timpul gestului [citit: s6-V §5.5]. Măsurătoarea
  se face la placa E6.

**7. Formatele de import cu probleme de licență.** Nimic nu iese din prag fără owner-ul; sunt întrebările 2 și 3 din §8.
Recomandarea mea, aceeași cu s12 cu o singură precizare de cost:
- **EPS și AI ≤ 8:** în v1, prin interpretor PostScript propriu, limitat, cu profiluri de producător (Illustrator acum,
  CorelDRAW după fișiere reale); refuz explicit, niciodată import parțial pe tăcute; poarta: ≥ 80 % din corpusul real al
  owner-ului. Îl pun **târziu (E27, ~7–8 felii)**, ca să nu stea pe drumul critic. Dovada fezabilității: 493 de linii de
  probă citesc exact EPS-ul Illustrator CS6, la 0,0048 pt de Ghostscript [măsurat: s12 §4.3].
- **DWG:** doar mesaj în v1 („salvează ca DXF”, cu trimitere la un convertor gratuit); nativ, de decis în v1.x. ODA costă
  7 500 $ primul an și 4 500 $/an [citit: s12 §2].
- **WMF:** cititor propriu, din specificația publică (+ EMF peste prag, aproape gratis), în E26 [citit: s12 §2;
  măsurat: SheetJS `wmf` cade pe un WMF real].
- **DGK și PIC:** scoase din prag, fiindcă n-au specificație publică și regula interzice reverse engineering [citit:
  s12 §2].
- **Exportul EPS / AI** (rândul de export îl lasă „de decis”): EPS da, cu scriitorul propriu; AI nu, fiindcă Illustrator
  deschide PDF, SVG și EPS [măsurat: s2 §4; citit: s2 §5.4].

**8. Planșele: A sau D.**
- **Ipoteza de lucru: D** (piese pe foi, cu al doilea nivel ascuns până e cerut). Cifrele prototipului: la scenariul 5,
  6 gesturi față de 26; la scenariul 7, 9 față de 39, iar în A spatele rămâne nealiniat cu 50 mm, fără avertisment; la 12
  suporturi, 2 noduri față de 24 [măsurat: s10-planșe §2].
- **Ce nu depinde de alegere:** arborele (grup, ramă, element), tabelul de gesturi, rama cu inele și ancore. Scenariile
  1, 2, 3 și 8 au ieșit identice în A și D [măsurat: s10-planșe §2]. De aceea etapele E1–E10 lucrează pe **o foaie cu un
  arbore** și sunt identice în A și D.
- **Când contează:** la E11 (foile și producția). O migrare pură vN → vN+1 transformă atunci arborele foii în piesă +
  instanță (D) sau îl lasă așa (A). Fără utilizatori, migrarea costă puțin.
- **Ce se schimbă exact dacă owner-ul alege A:**

  | Unde | Cu D (planul) | Cu A |
  |---|---|---|
  | Modelul | `Doc { parts, sheets }`, `Sheet { stoc, flip?, items: [{ partId, x, y, rot, fields }] }` | `Doc { sheets: [{ stoc, root }] }`, piesele repetate sunt copii |
  | E11, foile | instanțe, „Încă…”, editarea piesei-sursă, „Desprinde”: 7 felii | copii, fără editare în bloc: ~6 felii (−1) |
  | E11, Multi-Plate | valoarea pe instanță; 30 de plăcuțe = 2 noduri | valoarea scrisă în fiecare copie; 30 de plăcuțe = 60 de noduri; plafonul pe artefact se atinge mai repede |
  | E11, exportul | instanțele ca BLOCK/INSERT, `symbol`/`use`, Form XObject | doar geometrie desfăcută |
  | E23, două fețe | fața de jos aparține foii, spatele urmează fața | o planșă-copie oglindită; ca să nu repete nealinierea tăcută de 50 mm, trebuie o legătură explicită: +2 felii |
  | Lista de tăiere | numără instanțele | numără copiile; același rezultat |
  | Total | — | ~+1 felie, plus riscul pe Multi-Plate și pe întoarcere |

- **Termenul:** alegerea trebuie făcută înainte de E11 (săptămâna 11). BRIEF §9 cere ca planul să se aprobe cu modelul
  ales; dacă owner-ul vrea să aprobe înainte, primele 10 etape nu depind de alegere.

**9. Maturitatea nucleului geometric.**
- **Decizia:**
  - **offsetul: copia JS a lui cavalier, adusă în repo și reparată de noi.** Se portează reparațiile Rust 0.8.0 și 0.9.0
    (#79, #82, #83, curățarea vârfurilor repetate), testul „paralele” se rescrie pe unghiul normalizat, iar suita din
    `s1-geometrie/cod-verificare/` intră în CI. Cost: 2–4 zile, în E5 [citit: s1-V §5.1]. **Fără Rust în v1**: n-aduc
    un toolchain nou în mediul owner-ului și în CI (frecarea de mediu a fost o cauză de proces, LECTII §2.3, cauza 8). Rust
    0.9 compilat în WASM devine întrebare la owner doar dacă suita densă pică după port;
  - **booleanul: PathKit 1.0.0 ca dependență înghețată, adusă în repo**, în spatele fațadei `boolean(a, b, op)`, cu
    **re-ancorarea R3 după fiecare operație**. Dacă apare un defect care cere o reparație în Skia, trec pe PathOps din
    CanvasKit 0.42 (întreținut, 3,3 MB, încărcat leneș în workerul de geometrie), nu pe un build C++ propriu;
  - **gărzile obligatorii, toate din prima felie de geometrie:**
    - ușa de intrare curăță: vârfuri repetate, linii aproape coliniare, polilinii dense re-aproximate cu arce, zimți
      netezite (Douglas–Peucker la 0,01 mm), căi autointersectate respinse sau reparate;
    - ieșirea e validată de un oracol de structură în produs: buclă deschisă, excepție, rezultat gol când raza înscrisă
      e > d, arie nemonotonă = eșec explicit, niciodată traseu tăcut greșit;
    - rezoluția modelului e declarată: **0,01 mm**;
    - postul scrie G1 în loc de arc când raza > ~1e4 mm sau săgeata < 1e-4 mm.
- **Dovezi:** pe 5 000 de segmente, 47 din 240 de offseturi eșuează; testul „paralele” dă semicercuri (0,0164 mm, prezis
  0,0166); formele sub 0,005 mm dispar; după 100 de booleene PathKit derivă la 5,1e-4 mm și centrele de arc greșesc cu
  până la 0,57 mm, iar R3 le aduce la 3,3e-13 mm; pe domeniul principal (litere, forme CAD) cavalier e exact (1e-15)
  [măsurat: s1-V §2]. PathKit 1.0.0 e din 2022-02-03 [măsurat: s1-V §4.8].

### 3.8 Ce intră din ziua 1, oricum

Din BRIEF §5 și LECTII §2.3 („ieftin doar dacă e pus din prima zi”):
- en + ro prin `t()`, cu paritatea verificată de compilator;
- ErrorBoundary, legat de jurnalul de erori din E2;
- `.gitattributes`, build determinist (fără ceas), configul citit de la gazdă, același artefact pe test și pe live;
- schema cu versiune, o singură ușă de încărcare, câmpurile necunoscute păstrate, migrări pure;
- CSP fără `'unsafe-eval'`, probat pe build-ul servit, cu antetul real (Playwright ocolește verificarea dacă injectează
  codul) [citit: s7 §5.2];
- regulile de import și oracolul cu zero importuri;
- registrul de capabilități (date), chiar dacă toate sunt permise până la facturare.

---

## 4. Dovada

Principiul: **oracolul se scrie înaintea funcției**, ia valoarea așteptată din geometria piesei (nu din programul
testat) și are un control negativ care trebuie să pice [citit: LECTII §4.12, §6].

### 4.1 Oracolele, pe subsistem (refolosite din sonde)

| Subsistemul | Oracolul | Controlul negativ | Sursa |
|---|---|---|---|
| Geometria | distanța exactă la linie, arc, pătratică, cubică; numărul de înfășurare; Hausdorff în ambele sensuri; clasificarea punctelor cu bandă; valori pe hârtie; **oracolul de structură** (număr de contururi, fără laturi comune, fără bucle deschise); inelele buzunarului față de raza maximă înscrisă; lanțul de 100 de booleene | offset × 1,01; inel final șters; „pierde găurile” | s1, s1-V |
| Importul și exportul | cititoare independente în Python (ezdxf audit, svgelements, PyMuPDF, fontTools, Ghostscript-WASM), comparate cu formule pe hârtie; litera N = 20,000000 mm | raza × 1,0001; „20 mm = corpul em”; totul pe stratul „0”; R12 la toleranța greșită | s2, s12 |
| V-carve | distanța exactă la curbele de intrare + înfășurătoarea analitică a conului pe textul G-code (cu reparația capetelor de graniță); al doilea oracol prin eșantionare densă, pe un set mic; flo-mat ca martor fără cod comun | raza dată de algoritm („circ”); fără legalizare; G-code mutat cu 0,02 mm | s3, s3-V |
| Simularea | nucleul (pe IR) față de valori pe hârtie pe fiecare celulă; față de oracolul de referință (textul G-code, zero importuri, eșantionare la cell/8), cu regula „nucleul nu e niciodată mai sus cu peste 10 nm”; amprenta Node = browser | cele 7 otrăvuri din s4 | s4 |
| Relieful și 3D-ul | CL analitic pe plan, sferă, cilindru, perete de 0,01 mm; drop-cutter exact pe triunghiuri; simulator independent de creastă; Poisson pe funcție analitică; volumul semisferei 2/3·π·R³ | fără testul pe muchii; fără testul pe fețe | s5 |
| Workerii pe benzi | vârfuri puse exact la marginea benzilor, cu valoarea pe hârtie | halo cu un rând mai mic (scobitură de 2,545 mm) | s11 |
| Pânza | marginea cercului la 1000 px/mm; clicul față de distanța analitică; ecran = nucleu = `isPointInPath`; ritmul la 60 Hz cu martori; Event Timing | PixiJS ca martor negativ (29,15 px prezis); martorii pozitivi de CPU și de GPU | s6, s6-V |
| Posturile | regula de arc a controlerului rescrisă de la zero, pe 200 000 de arce; formatorul de numere; rezultatele din atelier ca fișiere de aur | 2 zecimale în mm (trebuie să pice); mutația care taie „.000” | s8 |
| Senderul | simulator de controler independent: bufferul RX de 128 de octeți exact, stările Idle/Run/Hold/Alarm, regulile `$` pe stare, codurile de eroare, regula de arc; transcrierile de pe fier, rejucate | bariera M6 scoasă; socoteala de octeți greșită | f0/07 §4.6 |
| Datele | defectele injectate cu calea așteptată; zip-ul identic în trei fusuri orare; cititorul Python; salvarea omorâtă la mijloc; undo după „rotește 30° și înapoi” identic bit cu bit | suprascrierea pe loc (S1); SW blocat | s7 |
| Adminul și cloud-ul | perechi permis / refuzat pe rol; pe emulator doar logica; pe testul din cloud, cu tokenuri reale, securitatea; GDPR: lista exportului = lista ștergerii | fiecare test sabotat o dată | s9-admin |
| Planșele | invariantele M1–M6 din prototip: conținutul ramei nu se micșorează, inelul rămâne la d, așezarea și vărsarea, oglinda feței de jos, Escape urcă un nivel | cele 6 sabotaje | s10-planșe |

Emulatorul Firebase răspunde altfel decât producția în 30 din 63 de celule, deci **securitatea se probează doar pe testul
din cloud** [măsurat: s9-admin §4.2].

### 4.2 Poarta invariantelor

Rulează pe **orice** program generat de suite (toate operațiile, toate colțurile de origine, unghiuri 30–90°, forme cu
găuri), o dată pe IR prin nucleul de simulare și o dată pe textul G-code prin oracolul de referință [citit: LECTII §4.6;
f0/03 §4.3]:
1. nicio mișcare nu scoate mai mult decât pasul pe trecere;
2. nimic nu se scoate din regiunea păstrată (peste toleranța declarată);
3. niciun G0 prin material;
4. fiecare arc trece regula controlerului țintă după rotunjire; nicio linie peste 70 de octeți;
5. fiecare operație își ține promisiunea: fundul buzunarului e curat, peretele e la cotă, puntea are lățimea și grosimea
   cerute;
6. în 3D: nicio celulă sub suprafața modelului (față de plasă, nu față de grilă), creasta măsurată ≤ ținta, suprafața
   rezultată față de model în toleranță [citit: CLAUDE, „Corectitudinea se demonstrează”].

O metrică nouă intră în poartă abia după ce o otravă o înroșește [citit: s4 §5.12].

### 4.3 Mutațiile

- **Unealtă comisă în repo**, nu ritual [citit: LECTII §4.12; f0/11 §4.8]:
  - verifică pe hash-ul git fiecare fișier atins, înainte și după (Drive-ul poate readuce fișiere);
  - o înlocuire care nu se aplică e „VOID”, nu „prinsă”;
  - rulează contra **tuturor** suitelor, inclusiv cele de a doua șansă, cu control;
  - rezultatul se verifică la final față de HEAD.
- **Otrăvurile le alege altcineva decât autorul feliei** (un agent separat, din specificație): în ediția întâi,
  otrăvurile autorului au fost prinse 281 din 281, cele independente doar 27 din 54 [măsurat: LECTII §0].
- **Ținte:** formatorul de numere, garda de arc și strategia I/J, strategiile de schimbare a sculei, nucleele de
  simulare, modificatorii Z(s) (urechi, rampă, intrare), paritatea regiunii păstrate, raza din axa medială,
  legalizarea, halo-ul, R3, testul „paralele” din cavalier, limitele schemei, regulile de drept de acces, socoteala de
  octeți a senderului, bariera M6, ordinea preambulului la reluare.
- Rulează noaptea (§4.4). O otravă vie are gravitate: trece înaintea oricărei restanțe noi [citit: LECTII §2.3].

### 4.4 Nivelurile CI și bugetele

| Nivelul | Când | Ce conține | Bugetul |
|---|---|---|---|
| **Rapid** | la fiecare commit (local) și la fiecare push | typecheck, regulile de import (cu capcana), paritatea en/ro, testele pure și cele pe hârtie, seturi mici de oracole (geometrie, simulare, ~20 000 de arce), schema | ≤ 60 s local, ≤ 3 min în CI |
| **Complet** | pe PR și pe `main`, înaintea oricărui deploy | build determinist (două build-uri, comparate pe octeți); Playwright pe artefactul construit (CSP real, PWA offline + actualizare cu martor, pornire, funcții de pânză independente de GPU); emulatoarele (Java 21) cu perechi de reguli; jobul de oracole Python; corpusurile complete (geometria 508, V-carve, simularea + amprenta Node = Chromium); matricea de roluri | ≤ 12 min, joburi în paralel |
| **Noapte** | cron, 03:00 | mutațiile; corpusurile lungi (200 000 de arce pe controler, firma 1200 × 400, rastrul 3D de 5 M, STL-ul de 1,38 M); bugetele de performanță pe CPU; licențele (nimic GPL/AGPL în bundle) | ≤ 90 min |
| **Pe stația owner-ului** | la sfârșitul etapei | bancul pe GPU (RTX și iGPU): ritmul la 60 Hz cu martori, fidelitatea, rasterul din worker; Edge real | ~5 min |
| **Pe test (cloud)** | după fiecare `deploy:test` | pornirea cu tokenul de debug App Check; perechile permis / refuzat cu tokenuri reale; Diagnoza verde | ≤ 5 min |

- Fiecare suită are bugetul ei; o creștere de peste 25 % dă alarmă [citit: f0/11 §4.3].
- Commit-urile doar cu `.md` nu pornesc CI-ul; o rulare completă săptămânală rulează oricum [citit: f0/11 §4.4].
- **Un roșu permanent e incident de rangul întâi**, verificat la începutul fiecărei sesiuni (`gh run list`). În ediția
  întâi, CI-ul a fost mort 16 zile, iar owner-ul a fost alarma [citit: LECTII §1; f0/11 §5].
- Poarta locală a ediției întâi a crescut de la ~10 la ~20 de minute pe felie [citit: LECTII §2.3]. De aceea bugetele de
  aici sunt scrise dinainte și păzite.

### 4.5 Bancul vizual

- Scene redate de Playwright pe artefactul construit. **Fiecare scenă are o poză și o cifră** (de exemplu, abaterea
  marginii în pixeli, numărul de contururi, grosimea liniei) [citit: LECTII §4.12].
- Fiecare scenă are un sabotaj care trebuie s-o înroșească; în ediția întâi, bancul a raportat verde pe 3 sabotaje
  [citit: LECTII §1].
- Măsurătorile de timp ale pânzei nu folosesc citirea de 1 pixel ca sincronizare: ea mută pânza pe procesor. Se citesc
  intervalul rAF, Event Timing și nucleele procesului GPU [măsurat: s6-V §5.3].
- La fiecare etapă, galeria (poze + cifre) se publică pe instanța de test, ca owner-ul să vadă ce verifică testele.

### 4.6 Cum devine placa test

1. **Generatorul plăcii** e o funcție a aplicației: pentru etapa n, produce proiectul, programul (cu hash) și fișa cu
   cotele, valorile pe hârtie și toleranțele.
2. Owner-ul taie placa și completează cotele într-un formular din aplicație („Placa etapei”, pe test). Până la tichete
   (E9), formularul descarcă un JSON; după E9, îl atașează la un tichet.
3. Dosarul `testkit/placi/E<n>/` primește: `program.nc` (+ SHA-256), `fisa.json`, `masuratori.json` și transcrierea
   brută a senderului.
4. Testele care rămân pentru totdeauna:
   - același proiect regenerează **același program** (fișier de aur); o schimbare voită e justificată în commit sau
     cere o placă nouă;
   - simularea programului prezice valorile pe hârtie, în toleranța simulării;
   - măsurătorile stau în toleranța față de hârtie; ele sunt un fapt înregistrat, nu un rezultat recalculat;
   - transcrierea se rejoacă în simulatorul de controler: aceeași secvență de răspunsuri, numărul de `ok` = numărul de
     linii;
   - abaterile sistematice (lățimea tăieturii, bătaia frezei, Z0) intră o singură dată în calibrarea oracolului pe lemn
     [citit: BRIEF §13].
5. Placa e aprobarea etapei. Dacă o cotă iese din toleranță, etapa nu se publică pe live, iar defectul trece primul în
   etapa următoare.

### 4.7 Cum aleg feliile și când mă opresc

- Feliile se aleg **doar din etapa aprobată**; registrul de restanțe e o listă de datorii, cu gravitate, nu foaia de
  parcurs. În ediția întâi, 71 % din prompturile lunii septembrie au fost „continua”, iar ținta de produs a dispărut
  [măsurat: LECTII §0.6].
- O felie care depășește estimarea cu peste 50 % → stop și întreb [citit: CLAUDE].
- La „pauză”: totul comis, pe o ramură WIP dacă nu e gata [citit: CLAUDE].
- Lista pentru owner are cel mult 5 lucruri deschise, fiecare cu implicitul scris în față [citit: BRIEF §7].
- DEVLOG scurt pe fiecare felie (început / încheiat, prompt exact, model); deciziile în ADR-uri scurte; cifrele din
  documente generate sau asertate, nu narate [citit: LECTII §4.13].

---

## 5. Planul pe etape

### 5.0 Cum se citește

- O etapă ≈ o săptămână. **Felii estimate** = numărul de felii planificate; 0,5 = placa (generare, fișă, fixturi).
- **Închide** = rândurile de prag, funcțiile din BRIEF §10 și tranșele de admin care devin „făcut” în etapa aceea (cu
  commit în ACOPERIRE). **Începe** = ce primește doar o parte.
- Rândurile au ID-uri scurte. Harta ID → numele exact al rândului e la §5.3.
- **Placa:** ce se taie, cotele cu valorile pe hârtie și ce oracol confirmă. Cotele sunt pentru freza dreaptă D = 6 mm
  acolo unde depind de sculă; generatorul le recalculează pentru freza reală a owner-ului.
- **Live:** „da” înseamnă publicare la sfârșitul etapei, după placa trecută și cu confirmarea owner-ului.

### 5.1 Pasul 0, înainte de etape (2–3 zile, fără cod de produs)

- **`docs/PORTARE.md`:** verdictul pe fiecare candidat din LECTII §3.2, față de arhitectura de aici (portat / adaptat /
  rescris cu vechiul ca martor / lăsat). Primii care contează: fluxul GRBL cu numărare de caractere și bariera M6 (E2–E3),
  urechile Z(s) și intrarea față de regiunea păstrată (E3), biarcele (E4), `BitProfile` (E8), planarea (E10), trasarea
  (E16), registrul probei (E25) [citit: CLAUDE, „Decizii luate”].
- **ADR-urile** pentru deciziile din §3.7.
- **Lotul 1 de pași pentru owner** (§8): atelierele, utilizatorii de pe live, cheia reCAPTCHA pentru test, materialele și
  frezele pentru plăci.

### 5.2 Etapele

#### E1 — Prima tăietură (săptămâna 1)

- **Ținta:** owner-ul desenează un pătrat și un cerc, alege profilul, exportă G-code GRBL și taie placa cu senderul pe
  care îl folosește azi.
- **Felii (8):**
  1. scheletul: repo, TypeScript strict, Vite, interfața goală, `t()` en/ro, ErrorBoundary, `.gitattributes`, build
     determinist, regulile de import cu capcana, CI rapid verde;
  2. documentul minim (schema valibot, versiune, câmpuri necunoscute păstrate) + stratul de acțiuni + jurnalul de comenzi
     (undo care restaurează valori, nu operații inverse);
  3. nucleul geometric, sămânța: contur L/A/C cu bulge, forme parametrice cu matrice (dreptunghi, dreptunghi rotunjit,
     cerc), transformări exacte, aplatizare cu toleranță declarată, offsetul cavalier cu gărzile minime + oracolul de
     geometrie;
  4. editorul minim: foaia și materialul, **originea ca obiect și matricea unică document → mașină** (test cu reper pe
     hârtie pe 4 colțuri și pe centru), unelte dreptunghi și cerc (mașini de stare), câmpuri numerice;
  5. bazinul de workeri (protocol, anulare) + operația profil în worker (exterior, interior, pe linie; pas pe trecere;
     sens) + IR-ul traseului;
  6. postul GRBL: contractul GRBL 1.1 ca date, formatorul (3 zecimale, punctul mereu scris), arce I/J din startul
     rotunjit cu gardă, antet complet, `M3 S` + `G4 P` în secunde, plafon de 70, ASCII; exportul `.nc` cu hash;
     validatorul de acceptare;
  7. oracolul de referință (textul G-code, zero importuri) + poarta invariantelor + previzualizarea traseului;
  8. placa: generatorul, fișa și formularul + primul deploy pe test (doar hosting, după exportul Firestore de pe test).
- **Închide:** — (începe A1, B1, F1, F2, F4).
- **Placa E1** (MDF 18; Z0 pe fața plăcii; originea în colțul stânga-jos):
  - pătrat 80 × 80, așezat la 20 mm de marginile din stânga și de jos, profil exterior, 6 mm în 2 treceri de 3; cerc
    Ø30, profil exterior; cerc Ø50, profil interior; canal pe linie de 60 mm, la 3 mm; o crestătură în colțul stânga-sus
    al pătratului, ca semn de orientare.

  | # | Cota | Pe hârtie | Toleranța |
  |---:|---|---:|---:|
  | 1 | latura X a pătratului ridicat | 80,00 | ±0,15 |
  | 2 | latura Y a pătratului ridicat | 80,00 | ±0,15 |
  | 3 | diametrul discului ridicat | 30,00 | ±0,15 |
  | 4 | diametrul găurii (profil interior) | 50,00 | ±0,15 |
  | 5 | lățimea canalului | D (6,00) | +0,2 / −0 |
  | 6 | adâncimea canalului | 3,00 | ±0,10 |
  | 7 | adâncimea șanțului din jurul pătratului | 6,00 | ±0,10 |
  | 8 | marginea stângă a plăcii → latura stângă a pătratului | 20,00 | ±0,30 |
  | 9 | crestătura e în colțul stânga-sus (nu e oglindit) | da | — |

  **Confirmă:** postul (coordonate, arce), cadrul de coordonate (defectul „originea oglindea tot”, LECTII §2.1),
  pasul pe trecere; calibrează o dată oracolul pe lemn (cotele 5–7).
- **Live:** nu.
- **Felii estimate:** 8.

#### E2 — Senderul nostru (săptămâna 2)

- **Ținta:** placa se taie din aplicație, prin senderul nostru, iar transcrierea rulării devine test.
- **Felii (7,5):**
  1. simulatorul de controler GRBL în `testkit` (oracolul senderului) + sesiunea Web Serial cu tranzacții + parserul de
     stare + tipurile `MachinePos` / `WorkPos`, `Known` / `Unknown`;
  2. jog (8 direcții), homing, zero G54–G59 (`G10 L20`), „du-te la zero” (Z întâi), palparea Z cu placa de contact
     (dacă owner-ul o are), refuzurile cu motiv (tabelul stare × acțiune);
  3. rularea: exact octeții exportați, cu hash; numărarea de caractere; pauză, reluare, stop; eroare → hold;
     transcrierea brută salvată;
  4. salvarea automată sigură (IndexedDB: document, pointer, jurnal) și reîncărcarea;
  5. P0a: funcțiile în TypeScript (`europe-central2`), `errorLogs` (`logClientError` cu plafon de rată, `logServerError`
     care nu aruncă), ErrorBoundary → jurnal; primul deploy de funcții pe test, după ce owner-ul vede lista funcțiilor
     vechi de șters;
  6. P0b: scheletul adminului, `staff/{uid}`, owner-ul creat prin script, fila Erori (grupare pe amprentă, redeschidere
     automată);
  7. P0c: Diagnoza minimă (instanța, sha-ul, erorile nerezolvate, marcajele de rulare), amprenta `meta/deployment`; App
     Check pe test cu tokenul de debug înregistrat doar pe test;
  8. placa + transcrierea → fixtură.
- **Închide:** P0 (jurnalul de erori, fila Erori, Diagnoza minimă, amprenta, scheletul adminului, owner-ul prin script,
  accesul pe test și local). Începe F3.
- **Placa E2** = placa E1, tăiată din nou **prin senderul nostru**, plus:

  | # | Cota | Pe hârtie | Toleranța |
  |---:|---|---:|---:|
  | 1–7 | aceleași cote ca la E1 | aceleași | aceleași |
  | 8 | diferența față de măsurătorile E1, pe fiecare cotă | 0,00 | ±0,10 |
  | 9 | transcrierea: liniile trimise = liniile programului; erori | egale; 0 | — |
  | 10 | Z0 prin palpare: adâncimea canalului | 3,00 | ±0,10 |

  **Confirmă:** senderul față de simulatorul de controler (transcrierea rejucată), hash-ul programului = hash-ul
  trimis.
- **Live:** nu.
- **Felii estimate:** 7,5.

#### E3 — Pachetul pentru ateliere pleacă; prima publicare pe live (săptămâna 3)

- **Ținta:** piese decupate complet (urechi, intrări), găuri și buzunare simple, posturi pentru toate controlerele, iar
  pachetul de probă pleacă la ateliere.
- **Felii (8):**
  1. urechile ca Z(s) (palier + flancuri), intrările și ieșirile alese față de regiunea păstrată, rampa, sensul de
     tăiere;
  2. contractele de dialect pentru cele 8 controlere (date, cu sursa pe fiecare câmp și starea „documentat”), starea
     afișată la export, avertismentul „neprobat”;
  3. schimbarea sculei ca eveniment în IR, cele 4 strategii (M6 interceptat de senderul nostru, M6 lăsat controlerului,
     M0 + comentariu, fișiere separate pe sculă), bariera M6 în sender (re-zero manual);
  4. găurirea: frezarea elicoidală a găurilor + găurirea în pași desfăcută în G0/G1;
  5. buzunarul de bază: inele de offset, intrare în rampă sau elice, regiunea păstrată;
  6. generatorul pachetului T0–T7 pe controler + fișa cu setările controlerului (N4063, AbsCntr, F Read, modul IJ,
     unitatea G4, `$341`) → **pachetul pleacă la ateliere**;
  7. P1: publicarea cu sha fixat, mediul `live` cu aprobarea owner-ului în GitHub, WIF pe ambele proiecte; backup cu
     alarmă; amprenta test / live și vârsta backup-ului în Diagnoză;
  8. placa + **prima publicare pe live** (exportul Firestore de pe live, lista funcțiilor vechi de șters arătată
     owner-ului, numărul de utilizatori verificat).
- **Închide:** B1, B5, T7, P1. Începe B3, B6.
- **Placa E3** = pachetul GRBL din s8 (Anexa B), pe COSTEL, plus o piesă decupată cu urechi:

  | # | Cota | Pe hârtie | Toleranța |
  |---:|---|---:|---:|
  | 1 | T1: canalul cercului Ø50 din 2 × 180°, exterior / interior | 56,00 / 44,00 (50 ± D) | ±0,10 |
  | 2 | T1: distanța dintre centrele celor două cercuri | 100,00 | ±0,10 |
  | 3 | T3: gaura elicoidală, diametru / adâncime | 20,00 / 3,00 | ±0,10 |
  | 4 | T4: diferența de adâncime D6 față de D3, după re-zero | 0,00 | ±0,10 |
  | 5 | T7: găurirea în pași, adâncimea | 10,00 | ±0,10 |
  | 6 | T2 (în aer): 200 mm la F1000 / F2000 | 12,0 s / 6,0 s | ±0,5 s |
  | 7 | T2: pauza după M3 | 2,0 s | ±0,3 s |
  | 8 | piesa 100 × 60, R8, decupată în 3 treceri: laturile | 100,00 / 60,00 | ±0,15 |
  | 9 | puntea: grosime / lățime la palier | 3,00 / 6,00 | ±0,20 / ±0,30 |
  | 10 | urma intrării pe piesă | niciuna | ≤ 0,05 |

  **Confirmă:** contractul GRBL (regula de arc după rotunjire), bariera M6, găurirea desfăcută, elicea, modelul urechilor
  și al intrării (nimic scos din regiunea păstrată).
- **Live:** **da, prima publicare pe live.** Aplicația veche iese de pe live.
- **Felii estimate:** 8.

#### E4 — Plăcuța cu text: V-carve (săptămâna 4)

- **Ținta:** owner-ul își importă desenele și face plăcuțe și firme cu text, cu V-carve și fund plat.
- **Felii (7,5):**
  1–2. ușa regiunii: fațada PathKit, adaptorul (arc ↔ conică, pătratică → cubică), R3 după fiecare operație, oracolul de
     structură, regula de umplere (§3.7.1), vindecarea cu toleranță declarată și raportul ei;
  3. importul SVG și DXF simplu prin ușa regiunii, cu plafoanele pe artefact;
  4. fonturile ca resurse (OPFS, după hash) + unealta text: înălțimea = înălțimea majusculei, rânduri, kerning, eroarea
     GSUB prinsă;
  5. axa medială (Voronoi pe eșantioane, h adaptiv, Lawson pe stivă cu numărarea muchiilor proaste, raza recalculată
     exact) + oracolul V-carve cu controalele negative;
  6. traseul V-carve: z = −min(D, r·cot(θ/2)), nivelurile de trecere, arcele potrivite cu gardă scalată cu unghiul, fundul
     plat cu a doua freză (cavalier);
  7. operația V-carve în interfață: previzualizarea, costul prezis înainte de generare, anularea;
  8. placa.
- **Închide:** B4. Începe A2, A3, A4.
- **Placa E4** (MDF 18, freză V60 sau V90 + freză dreaptă Ø3,175):

  | # | Cota | Pe hârtie | Toleranța |
  |---:|---|---:|---:|
  | 1 | dreptunghi 12 × 6, V90: adâncimea pe creastă | 3,000 | ±0,10 |
  | 2 | cerc r 2,5, V60: adâncimea în centru (r/tan 30°) | 4,330 | ±0,10 |
  | 3 | triunghi echilateral 10, V90: adâncimea în incentru | 2,887 | ±0,10 |
  | 4 | textul „LEMN”: înălțimea lui L | 20,00 | ±0,20 |
  | 5 | dreptunghi rotunjit 40 × 20, D = 3, fund plat: adâncimea fundului | 3,00 | ±0,10 |
  | 6 | același, peretele V60 la 1 mm de margine | 1,732 | ±0,10 |
  | 7 | un SVG al owner-ului cu un cerc de 50 mm: diametrul | 50,00 | ±0,15 |
  | 8 | liniile programului față de ediția întâi, pe plăcuța de referință | ~1/20 | fișier |

  **Confirmă:** oracolul V-carve pe lemn, semantica „20 mm = majuscula” [măsurat: s2 §4], scara importului SVG (defectul
  ×3,78 din ediția întâi).
- **Live:** da.
- **Felii estimate:** 7,5.

#### E5 — Editorul vectorial (săptămâna 5)

- **Ținta:** owner-ul desenează ca într-un program de vectori: boolean, offset, noduri, transformări, copii în rețea.
- **Felii (7,5):**
  1–2. portarea reparațiilor Rust 0.8 / 0.9 în cavalier + testul „paralele” pe unghi + suita densă în CI (poarta: 0
     eșecuri pe 240 de offseturi la 5 000 de segmente, după curățarea intrării);
  3. boolean și offset în editor; îmbinări rotunde, plus miter și teșite (post-procesare proprie);
  4. editarea nodurilor (tragere, semantica bulge-ului, adăugare, ștergere, conversie linie ↔ arc ↔ cubică, închidere);
  5. transformări și copii: mutare, scalare, rotire, înclinare, oglindire; rețea, circulară, de-a lungul unei curbe;
  6. aliniere, distribuire, acroșaj;
  7. grupurile imbricate și tabelul de gesturi (clic, dublu-clic, Escape, Ctrl+D, Șterge), comune pentru A și D;
  8. placa.
- **Închide:** A1, A10.
- **Placa E5** (MDF 12, profil exterior 3 mm):

  | # | Cota | Pe hârtie | Toleranța |
  |---:|---|---:|---:|
  | 1 | două cercuri R20 la 30 mm, unite: lungimea | 70,00 | ±0,15 |
  | 2 | aceeași formă: lățimea | 40,00 | ±0,15 |
  | 3 | pătrat 100 × 100 decalat cu 5 mm: latura | 110,00 | ±0,15 |
  | 4 | colțul decalat (șablon tipărit) | R5 | da / nu |
  | 5 | 8 găuri Ø10 pe un cerc Ø80: distanța dintre două găuri vecine, margine la margine | 20,61 | ±0,15 |
  | 6 | aceleași găuri: peste tot, margine exterioară la margine exterioară | 90,00 | ±0,15 |
  | 7 | dreptunghi rotunjit 60 × 40, R8, rotit 30°: laturile pe axele lui | 60,00 / 40,00 | ±0,15 |
  | 8 | XOR între două pătrate 40 × 40 decalate cu (20, 20): insula rămasă | 20,00 | ±0,15 |

  **Confirmă:** oracolul de geometrie (offset exact, boolean exact, transformare exactă); aria unirii, 2 331,94 mm², e
  verificată în test, nu pe placă.
- **Live:** da.
- **Felii estimate:** 7,5.

#### E6 — Pânza la scară și importul robust (săptămâna 6)

- **Ținta:** fișierele reale ale owner-ului (DXF, SVG, PDF) se deschid corect și se lucrează fluid, inclusiv pe un laptop
  de atelier.
- **Felii (6,5):**
  1. pânza: rasterul vectorilor în worker pe pânză software → `ImageBitmap`, găleți spațiale, linia de 1 pixel fizic,
     funcția unică de vedere, `ResizeObserver` cu `device-pixel-content-box`, Pointer Events cu captură;
  2. stratul WebGL2: traseele ca LINE_STRIP sau instanțiate, după testul de cadru de la pornire; harta de înălțime pe
     dale;
  3. clicul (`flatbush` + distanța exactă + regula de umplere) + testele de ritm la 60 Hz cu martori + garda pe
     nucleele procesului GPU;
  4. importul DXF complet: unități, OCS (extrudarea −Z oglindește), blocuri imbricate (cercul dintr-un bloc (2;1) →
     elipsă parametrică), NURBS → Bézier, conica rațională → arc exact, straturi (și cu diacritice), avertismente pentru
     ce se sare;
  5. importul SVG complet (viewBox, unități, transformări, skew, SVG ostil fără scripturi și fără rețea) + PDF și AI
     compatibil PDF, toate paginile, cu precizia Float32 declarată;
  6. plafoanele pe artefact pentru toate ușile, desenul absurd (> 100 m, patru răspunsuri), mesajul DWG;
  7. placa + măsurarea pânzei pe un laptop de atelier.
- **Închide:** — (A4 avansează: DXF, SVG, PDF, AI compatibil PDF).
- **Placa E6** (MDF 12, profil sau canal la 2 mm):

  | # | Cota | Pe hârtie | Toleranța |
  |---:|---|---:|---:|
  | 1–3 | trei cote alese de owner dintr-un DXF real al lui | din desen | ±0,15 |
  | 4 | DXF în țoli: linia de 1″ | 25,40 | ±0,15 |
  | 5 | bloc × 2 cu cerc R10: diametrul | 40,00 | ±0,15 |
  | 6 | bloc (2; 1) cu cerc R10: axele elipsei | 40,00 / 20,00 | ±0,15 |
  | 7 | SVG cu viewBox 2000 pe 200 mm: pătratul de 50 | 50,00 | ±0,15 |
  | 8 | PDF, pagina 3: dreptunghiul 80 × 40 | 80,00 / 40,00 | ±0,15 |
  | 9 | laptopul de atelier: imaginea exactă la 50 k forme | ≤ 1 s | criteriul planului B |

  **Confirmă:** semantica importului (unități, OCS, blocuri) [măsurat: s2 §4, 65/65], bugetele pânzei pe hardware de
  atelier.
- **Live:** da.
- **Felii estimate:** 6,5.

#### E7 — Exportul cu vectori reali, fișierul de proiect, offline (săptămâna 7)

- **Ținta:** owner-ul deschide exporturile noastre editabile în programele lui, își salvează proiectele într-un fișier și
  lucrează fără rețea.
- **Felii (6,5):**
  1. exportul DXF „exact” (R2007) + „compatibil” (R12, biarce, toleranța în dialog), straturile = rolurile, testul pe
     codurile de grup, jobul de oracol Python în CI;
  2. exportul SVG (1 unitate = 1 mm, nicio comandă A peste 90°, straturi Inkscape), PDF (`pdf-lib`, straturi OCG, numărul
     de Bézier după toleranță), EPS (scriitor propriu) + pachetul pentru owner;
  3. fișierul `.cncvs` (zip determinist, JSON canonic, `minWriter`) + cititorul independent în CI + deschiderea și
     salvarea;
  4. resursele în OPFS (scrise o dată, verificate), curățenia la pornire (`*.tmp`, `*.crswap`, nereferite), un singur
     scriitor;
  5. PWA offline cu actualizare oferită, blocată cât rulează un job pe mașină; testul de poartă pe build-ul real, cu
     martorul fără SW;
  6. verificarea și repararea vectorilor: deschiși, dubluri, intersecții, bucle, noduri prea apropiate (peste ușa de
     vindecare din E4);
  7. placa.
- **Închide:** A3, A5. Punctul de lansare L10 (exportul probat cu cititor independent și deschis de owner).
- **Placa E7:**
  - **pachetul de export**, deschis de owner în ArtCAM, AutoCAD / Aspire / VCarve, Inkscape / Illustrator, CorelDRAW:
    cercul e cerc, Ø100,000 cu unealta de măsură a programului, straturile DECUPARE / GRAVARE, scara exactă, dreptunghiul
    rotunjit editabil ca 4 linii + 4 arce (da / nu pe fiecare program);
  - **tăietura dus-întors** (DXF-ul exportat, reimportat și tăiat, profil exterior 3 mm):

  | # | Cota | Pe hârtie | Toleranța |
  |---:|---|---:|---:|
  | 1 | discul Ø100 | 100,00 | ±0,15 |
  | 2 | dreptunghi rotunjit 80 × 50, R10, rotit 30° | 80,00 / 50,00 | ±0,15 |
  | 3 | elipsa 60 × 30 | 60,00 / 30,00 | ±0,15 |
  | 4 | DXF murdar (contur deschis, dubluri, fantă de 0,001 mm), reparat: problemele raportate | numărul pe hârtie | exact |
  | 5 | piesa reparată, tăiată: latura de 50 | 50,00 | ±0,15 |
  | 6 | proiectul salvat pe un calculator, deschis pe altul: hash-ul | identic | exact |

  **Confirmă:** oracolele de export (ezdxf, PyMuPDF, Ghostscript, svgelements) [măsurat: s2, 108/108] și programele
  owner-ului (BRIEF §16.2.4).
- **Live:** da.
- **Felii estimate:** 6,5.

#### E8 — Buzunare cu mai multe freze, biblioteca de freze, timpul (săptămâna 8)

- **Ținta:** buzunare curate în colțuri, îmbinări care intră, freze cu geometrie reală și un timp estimat în care
  owner-ul poate avea încredere.
- **Felii (7,5):**
  1. dog-bone și T-bone;
  2–3. buzunarul cu mai multe freze: degroșare + rest machining 2D cu freza mică + varianta raster;
  4. ordinea operațiilor și a vectorilor; câte un fișier pe sculă;
  5–6. biblioteca de freze cu geometrie reală (dreaptă, bilă, toroidală, V, gravare, profil, formă desenată), materialele,
     avansurile (F = n · z · fz, cu sursa), importul `.tdb` al owner-ului;
  7. timpul estimat cu modelul mașinii citit din `$$` (accelerații pe axe, Z separat) + rezumatul jobului;
  8. placa.
- **Închide:** B2, B3, B6, F2, D5.
- **Placa E8** (MDF 18):

  | # | Cota | Pe hârtie | Toleranța |
  |---:|---|---:|---:|
  | 1 | buzunar 60 × 40, colțuri drepte, D6 + rest cu D3: laturile | 60,00 / 40,00 | ±0,15 |
  | 2 | fundul buzunarului | 5,00 | ±0,10 |
  | 3 | raza rămasă în colț (șablon) | 1,5 | da / nu |
  | 4 | fantă 40 × 12 cu dog-bone: o placă de 12 mm intră | da | — |
  | 5 | diametrul găurii de dog-bone | D (6,00) | ±0,15 |
  | 6 | aceeași fantă cu T-bone: intră | da | — |
  | 7 | timpul estimat față de cronometru, pe toată placa | 0 % | ±10 % |
  | 8 | două fișiere, unul pe sculă, ordinea din fișă | da | — |

  **Confirmă:** poarta invariantelor (rest machining scoate doar ce a lăsat D6, niciodată mai mult decât pasul), modelul
  mașinii (estimarea față de cronometru).
- **Live:** da.
- **Felii estimate:** 7,5.

#### E9 — Simularea completă, animația, rama, tichetele owner-ului (săptămâna 9)

- **Ținta:** owner-ul vede materialul scos înainte să taie, cu avertismente, și își raportează problemele din aplicație,
  cu documentul atașat.
- **Felii (7,5):**
  1–2. simularea completă: atlas de dale 16 / 32, dalele uniforme ca un singur număr, toate siluetele h(r) exacte pe
     celulă, profilul pe rampă ca trunchiuri de con, elicea cu bilă / V exactă sau cu coarde mutate în afară; vederea 3D
     umbrită; amprenta Node = browser în CI;
  3. avertismentele dinaintea startului: pasul, scobitura, freza prea scurtă, G0 prin material, ieșirea din cursă;
  4. animația traseului: freza pe traseu, pas cu pas, viteză reglabilă, glisor;
  5. workerii, măsurat: CAM + simulare în bazin, anularea ≤ 200 ms, nicio sarcină lungă > 50 ms;
  6. rama cu inele parametrice și ancore (comună pentru A și D): conținutul nu se micșorează niciodată; avertismente, nu
     reparații;
  7. tichetele owner-ului (P2+ timpuriu): „Raportează” atașează documentul, captura și build-ul (Storage); inbox-ul din
     admin;
  8. placa.
- **Închide:** F1 (3 axe), D4, F4. Începe P2+.
- **Placa E9** (MDF 18; calibrarea simulării pe lemn [citit: s4 §5.13]):

  | # | Cota | Pe hârtie | Toleranța |
  |---:|---|---:|---:|
  | 1 | canal cu freză dreaptă Ø6 la 3 mm: lățime / adâncime | 6,00 / 3,00 | ±0,10 |
  | 2 | canal V90 la 2 mm: lățimea la suprafață | 4,00 | ±0,10 |
  | 3 | canal V60 la 2 mm: lățimea la suprafață | 2,31 | ±0,10 |
  | 4 | canal cu bilă R3 la 2 mm: lățimea la suprafață (2·√8) | 5,66 | ±0,10 |
  | 5 | plonjare Ø6 la 5 mm: adâncimea | 5,00 | ±0,10 |
  | 6 | plăcuță cu ramă 300 × 150 mărită la 400 × 150: canelura rămâne la 10 mm de margine | 10,00 | ±0,15 |
  | 7 | același: gaura de agățat rămâne Ø8 | 8,00 | ±0,15 |
  | 8 | un job care iese din cursă cu 1 mm: refuzat înainte de start | da | — |

  **Confirmă:** nucleul de simulare față de lemn (calibrarea unică din BRIEF §13), invariantele ramei (prototipul, M1).
- **Live:** da.
- **Felii estimate:** 7,5.

#### E10 — Lucrul la mașină (săptămâna 10)

- **Ținta:** owner-ul taie joburi reale doar din aplicație: senzor de lungime, colț XY, override, jurnal, planare,
  reluare.
- **Felii (6,5):**
  1. senzorul de lungime la bariera M6 (palpare pe senzorul fix, offset de lungime);
  2. colțul XY prin palpare (mașină de stare pură);
  3. override de avans și turație (octeți în timp real, confirmați din `Ov:`) + jurnalul de rulare;
  4. planarea plăcii de sacrificiu (oracolul de acoperire);
  5. reluarea de la linia N, cu reintrare sigură (Z sus → ax + G4 → XY → plonjare cu avans), probată pe simulatorul de
     controler, nu pe propria funcție;
  6. verificarea dinaintea startului pe mașină: cursa din `$#` și `$130–132`, zonele interzise (cleme), `$C`, rularea în
     gol;
  7. placa.
- **Închide:** F3, T3, T4, T5, T6.
- **Placa E10:**

  | # | Cota | Pe hârtie | Toleranța |
  |---:|---|---:|---:|
  | 1 | planarea 200 × 150 la 0,30 mm: adâncimea | 0,30 | ±0,05 |
  | 2 | planarea: nicio coamă rămasă | 100 % acoperit | da / nu |
  | 3 | colțul XY palpat față de reperul trasat, pe X / Y | 0,00 / 0,00 | ±0,10 |
  | 4 | 5 palpări în același loc: împrăștierea | 0,00 | ≤ 0,05 |
  | 5 | două freze cu senzor, fără re-zero manual: diferența de adâncime | 0,00 | ±0,10 |
  | 6 | același job la override 50 %: raportul timpilor | 2,0 | ±10 % |
  | 7 | jobul oprit și reluat de la linia N: treapta la reluare | 0,00 | ±0,05 |
  | 8 | jurnalul de rulare: valorile `Ov:` înregistrate | da | — |

  **Confirmă:** procedurile mașinii pe fier (în ediția întâi, ~18 funcții n-au văzut niciodată fierul [citit: f0/07]),
  oracolul de acoperire al planării.
- **Live:** da.
- **Felii estimate:** 6,5.

#### E11 — Producția: piese pe foi, Multi-Plate, lista de tăiere, fișa (săptămâna 11)

- **Ținta:** owner-ul pune 30 de plăcuțe din CSV pe foi standard, cu surplusul pe foaia următoare, și primește lista de
  tăiere și fișa de lucru tipărită.
- **Felii (7,5)**, cu modelul D (cu A: ~6,5, vezi §3.7.8):
  1–2. modelul D: piese, foi, instanțe (+ migrarea pură a schemei); „Încă…”, editarea piesei-sursă cu banda „se schimbă
     toate cele N”, „Desprinde”;
  3. foile: așezarea pe rânduri după dreptunghi (margine 10, distanță 10), vărsarea pe foaia următoare, mutarea între
     foi, „+ Foaie”;
  4. Multi-Plate din CSV, cu câmpurile pe instanță;
  5. exportul pe foaie și pe sculă; instanțele ca BLOCK / INSERT, `symbol` / `use`, Form XObject, cu varianta desfăcută;
  6. lista de tăiere pe mai multe plăci;
  7. fișa de lucru tipărită: freze, ordine, zero, timp, plus setările controlerului de care depinde fișierul;
  8. placa.
- **Închide:** A9, T1, T2.
- **Placa E11** (8 plăcuțe 100 × 40 din CSV, majuscula de 12, pe foi de 300 × 200; se taie foaia 1):

  | # | Cota | Pe hârtie | Toleranța |
  |---:|---|---:|---:|
  | 1 | plăcuțe pe foaia 1 / foaia 2 | 6 / 2 | exact |
  | 2 | plăcuța | 100,00 × 40,00 | ±0,15 |
  | 3 | marginea foii → prima plăcuță, pe X / Y | 10,00 / 10,00 | ±0,30 |
  | 4 | distanța dintre plăcuțe | 10,00 | ±0,15 |
  | 5 | a doua coloană începe la | 120,00 | ±0,30 |
  | 6 | majuscula numelui | 12,00 | ±0,20 |
  | 7 | numele, în ordinea din CSV | da | — |
  | 8 | timpul din fișă față de cronometru | 0 % | ±10 % |

  **Confirmă:** invariantele foilor din prototip (așezarea și vărsarea, M4) [măsurat: s10-planșe].
- **Live:** da.
- **Felii estimate:** 7,5.

#### E12 — Atelierele (runda 1), gravarea inteligentă, incrustațiile (săptămâna 12)

- **Ținta:** posturile primesc primele probe din ateliere, iar owner-ul taie o incrustație care intră.
- **Felii (7,5):**
  1. rezultatele rundei 1 → contractele „probat pe <dată>, <versiune>” + fișierele de aur; **pachetul de runda 2 pleacă**
     (RichAuto, plus tot ce a picat);
  2–3. gravarea pe linie + smart engrave (axa trunchiată unde r depășește raza frezei, freza V spre colțuri);
  4–5. incrustația în V: femela, masculul cu adâncimea de start, poarta jocului pe linia de lipire;
  6. incrustația cu pereți drepți, simplă și în trepte, cu criteriul ei;
  7. așezarea perechii și decuparea dopului;
  8. placa.
- **Închide:** B7, B8. L4 avansează (runda 1).
- **Placa E12** (nuc pentru femelă, paltin pentru mascul, sau MDF):

  | # | Cota | Pe hârtie | Toleranța |
  |---:|---|---:|---:|
  | 1 | femela „B” (V60, fund plat Df = 3): adâncimea fundului | 3,00 | ±0,10 |
  | 2 | dopul uscat: un lamelar de 0,10 mm nu intră nicăieri pe contur | da | — |
  | 3 | jocul de lipire pe hârtie (Ds − t) | 0,10 | ±0,05 |
  | 4 | incrustația dreaptă: locașul 40 × 20, R3 | 40,00 / 20,00 | ±0,05 |
  | 5 | dopul drept (joc 0,10 pe latură) | 39,80 / 19,80 | ±0,05 |
  | 6 | dopul drept intră cu mâna, fără ciocan | da | — |
  | 7 | smart engrave pe o stea: vârfurile ajung în colț | da | — |
  | 8 | smart engrave: adâncimea în centru | pe hârtie | ±0,10 |

  **Confirmă:** poarta incrustației (jocul din două suprafețe simulate) [măsurat: s3-V §4(h)], pe lemn; defectul din
  ediția întâi „dopul umplea 0 %” [citit: LECTII §2.1].
- **Live:** da.
- **Felii estimate:** 7,5.

#### E13 — Tampon 1 (săptămâna 13)

- **Ținta:** reparațiile găsite de plăcile E1–E12 și re-estimarea din durate măsurate.
- **Felii (3 planificate, până la 8 disponibile):**
  1–2. datoriile cu gravitate din plăci (ce atinge mașina trece primul);
  3. re-estimarea drumului din duratele reale ale feliilor (jumătate de felie);
  4. placa de regresie.
- **Închide:** —.
- **Placa E13 = placa de regresie:** un compozit fix din E1–E4 (pătratul și găurile din E1, piesa cu urechi din E3,
  plăcuța V-carve din E4). Cotele = cotele lor; toleranța față de măsurătorile vechi: ±0,10. **Confirmă:** nimic nu s-a
  stricat pe drum.
- **Live:** da.
- **Felii estimate:** 3.

#### E14 — Caneluri, teșire, Raised Round, freze desenate, traseele transformate, textura (săptămâna 14)

- **Ținta:** operațiile decorative ale atelierului de mobilier: caneluri pe fronturi, teșituri, profile cu freză
  desenată.
- **Felii (7,5):**
  1–3. canelurile (cu încrucișări împletite), teșirea (bevel carving), Raised Round;
  4–5. frezele de profil desenate de utilizator (h(r) din desen) + roundover cu offset față de interior;
  6. transformarea traseelor calculate: mutare, rotire, oglindire, copiere, unire;
  7. traseul de textură direct din forma frezei;
  8. placa.
- **Închide:** B9, B10, B11, B12.
- **Placa E14** (MDF 18):

  | # | Cota | Pe hârtie | Toleranța |
  |---:|---|---:|---:|
  | 1 | 5 caneluri cu bilă R3: adâncimea la mijloc | 3,00 | ±0,10 |
  | 2 | distanța dintre caneluri | 20,00 | ±0,15 |
  | 3 | lungimea canelurii, cu rampele | 150,00 | ±0,30 |
  | 4 | Raised Round pe un cerc Ø60: adâncimea în centru | 4,00 | ±0,10 |
  | 5 | roundover desenat R6 cu offset 1 mm: treapta | 1,00 | ±0,10 |
  | 6 | traseu copiat × 3 la 50 mm: distanța dintre copii | 50,00 | ±0,15 |
  | 7 | textura cu bilă R3 la 4 mm: pasul / adâncimea | 4,00 / 1,00 | ±0,15 / ±0,10 |

  **Confirmă:** simularea cu freză de profil (trunchiuri de con) și invariantele pe operațiile noi.
- **Live:** da.
- **Felii estimate:** 7,5.

#### E15 — Ghilotină, drillbank, laser, cote, șabloane și lot (săptămâna 15)

- **Ținta:** producția repetată: tăieri în grilă, aceleași setări pe alt desen, calcul în lot, cote pe desen și laser.
- **Felii (8,5):**
  1–2. tăierile ghilotină (grilă, nesting aliniat) + găurirea cu mai multe burghie simultan;
  3–4. laserul: tăiere și gravare (contract laser GRBL: `$32`, M4 cu S ca putere, fără Z) + laser 3D în felii pe Z;
  5–6. cotele (liniare, aliniate, rază, diametru, unghi);
  7–8. șabloanele de operații (aceleași setări pe alt desen) + calculul în lot;
  9. placa.
- **Închide:** B13, B14, A6, F5.
- **Placa E15:**

  | # | Cota | Pe hârtie | Toleranța |
  |---:|---|---:|---:|
  | 1 | ghilotină 3 × 2 pe 300 × 200: fiecare bucată | 100,00 × 100,00 | ±0,20 |
  | 2 | laser (dacă există modulul): pătrat 50 × 50 în placaj de 3 mm | 50,00 | ±0,15 |
  | 3 | cota scrisă pe desen față de măsura pe piesă | aceeași | ±0,15 |
  | 4 | șablonul aplicat pe alt desen: parametrii din program | identici | exact |
  | 5 | lotul de 5 desene: 5 programe, cu hash-ul fiecăruia | 5 | exact |
  | 6 | drillbank: programul citit de un controler cu bloc de găurire | da | doar dacă un atelier îl are |

  **Confirmă:** contractul laser; pentru drillbank, doar simularea și citirea fișierului, dacă owner-ul n-are hardware
  (§8).
- **Live:** da.
- **Felii estimate:** 8,5.

#### E16 — Text complet, tăierea și conversia, trasarea din imagine (săptămâna 16)

- **Ținta:** text pe arc cu fonturi de gravare dintr-o linie, logo-uri vectorizate din pozele clienților.
- **Felii (6,5):**
  1–2. textul complet: text pe cale editabil, fonturi cu o singură linie, rânduri multiple;
  3–4. tăierea și conversia vectorilor: tăiere cu o linie, decupare la un contur, arce în loc de curbe (biarce),
     netezire, conversie în cercuri și dreptunghiuri;
  5–6. trasarea din imagine: luminanță (Otsu, muchie sub-pixel), culoare, alfa, linie mediană, potrivirea pe arce, pe
     fișierul owner-ului;
  7. placa.
- **Închide:** A2, A11, A8.
- **Placa E16:**

  | # | Cota | Pe hârtie | Toleranța |
  |---:|---|---:|---:|
  | 1 | text pe un arc R60, gravat cu font dintr-o linie: raza liniei de bază | 60,00 | ±0,20 |
  | 2 | majuscula | 10,00 | ±0,20 |
  | 3 | logo vectorizat din poza owner-ului, scalat la lățimea | 80,00 | ±0,20 |
  | 4 | o curbă convertită în arce: numărul de arce, sub toleranța declarată | pe hârtie | fișier |
  | 5 | pătrat tăiat cu o linie la 30 mm: bucata mică | 30,00 | ±0,15 |

  **Confirmă:** oracolul trasării (eroare ~0,65 px pe ediția întâi [citit: LECTII §3.2]), biarcele.
- **Live:** da.
- **Felii estimate:** 6,5.

#### E17 — Primul relief tăiat: din imagine, litofanie, degroșare și finisare (săptămâna 17)

- **Ținta:** owner-ul transformă o imagine în relief și o litofanie și le taie, cu degroșare și finisare.
- **Felii (8,5):**
  1. stratul de relief: dale Float32 de 256², rare, deținute de workeri, halo, stocare Uint16 pe dală, undo pe dalele
     atinse;
  2. afișarea: textura R32F încărcată parțial, vederea 2D umbrită, plasa 3D cu LOD;
  3. relieful din imagine + alinierea pixelilor cu grila;
  4. litofania;
  5. câmpul conservativ (maximul pe celulă, distanța la segment) + drop-cutter-ul exact pe triunghiuri ca oracol +
     simulatorul de creastă;
  6–7. degroșarea în trepte Z (cu piele) + finisarea paralelă la orice unghi;
  8. invariantele 3D în poartă (nicio scobitură față de plasă, creasta, suprafața față de model);
  9. placa.
- **Închide:** C1, C2, C3, D2, D3. Începe C13.
- **Placa E17:**

  | # | Cota | Pe hârtie | Toleranța |
  |---:|---|---:|---:|
  | 1 | litofania (grosimea = 2,75 − 2,25·v/255, minim 0,50): petic v = 0 | 2,75 | ±0,10 |
  | 2 | petic v = 128 | 1,62 | ±0,10 |
  | 3 | petic v = 255 | 0,50 | ±0,10 |
  | 4 | relieful din gradientul radial (alb = 10 mm): înălțimea în centru | 10,00 | ±0,10 |
  | 5 | același: diametrul la bază | 40,00 | ±0,30 |
  | 6 | zona neatinsă din jur (adâncimea) | 0,00 | ±0,05 |
  | 7 | direcția finisării: 45° | da | — |

  **Confirmă:** câmpul conservativ și invariantele 3D pe lemn (0 scobituri pe corpus [măsurat: s5 §4.1]); formula
  litofaniei [citit: JSON, M11].
- **Live:** da.
- **Felii estimate:** 8,5.

#### E18 — Editorul de forme, combinarea, straturile, relieful din text, analiza (săptămâna 18)

- **Felii (7,5):** 1–3. editorul de forme (cupolă, rotunjit, unghi, plan; înălțime, unghi, limită; Zero / Zero Rest), din
  curbele exacte; 4–5. combinarea (adună, scade, înalt / jos, înlocuiește, Multiply) + straturile de relief (combinare,
  vizibilitate, ordine); 6. relieful din text; 7. analiza (harta de înălțimi și harta de pante); 8. placa.
- **Ținta:** owner-ul construiește reliefuri din vectori și le combină pe straturi.
- **Închide:** C4, C5, C17, C8, C21.
- **Placa E18:**

  | # | Cota | Pe hârtie | Toleranța |
  |---:|---|---:|---:|
  | 1 | cerc R20, „unghi 45°”: vârful conului | 20,00 | ±0,10 |
  | 2 | plan la înălțimea 5 | 5,00 | ±0,10 |
  | 3 | două cupole adunate: înălțimea maximă (suma pe hârtie) | pe hârtie | ±0,10 |
  | 4 | relieful din textul „AB”, înălțimea 3 | 3,00 | ±0,10 |
  | 5 | majuscula reliefului din text | 30,00 | ±0,30 |

  **Confirmă:** generatorii din curbe exacte și combinarea; criteriul vârfului conului [citit: JSON, M11].
- **Live:** da.
- **Felii estimate:** 7,5.

#### E19 — Operații pe relief, estompare și pante, conturul, volumul (săptămâna 19)

- **Felii (7,5):** 1–2. operațiile (scalarea înălțimii, negativ, offset, netezire, limită, plan înclinat); 3–4. estomparea
  (liniară, radială, între contururi) + pantele pe pereți; 5–6. conturul vectorial pe interval de înălțime, tăierea după
  culoare, magic wand; 7. suprafața, volumul și greutatea (din câmpul în nod, nu din cel conservativ [măsurat: s5
  §4.8]); 8. placa.
- **Ținta:** owner-ul ajustează reliefuri și scoate din ele vectori și date pentru ofertă.
- **Închide:** C9, C10, C11, C23.
- **Placa E19:**

  | # | Cota | Pe hârtie | Toleranța |
  |---:|---|---:|---:|
  | 1 | cupola de 10 mm scalată × 0,5 | 5,00 | ±0,10 |
  | 2 | aceeași, negativ: adâncimea cavității | 5,00 | ±0,10 |
  | 3 | plan înclinat 5° pe 100 mm: diferența de înălțime (100·tan 5°) | 8,75 | ±0,10 |
  | 4 | conturul la 2 mm, tăiat ca profil: diametrul pe hârtie | pe hârtie | ±0,15 |
  | 5 | pereți cu pantă 10°: lărgirea la 5 mm adâncime (5·tan 10° pe latură) | 0,88 | ±0,10 |
  | 6 | volumul semisferei R20 afișat / greutatea în stejar | 16 755 mm³ / 12,57 g | ±0,1 % |

- **Live:** da.
- **Felii estimate:** 7,5.

#### E20 — Extrudare, sweep, spin, turn; relief ↔ 16 biți; export STL (săptămâna 20)

- **Felii (8,5):** 1–2. extrudarea de-a lungul unei căi, cu profil; 3–5. Two Rail Sweep, Spin, Turn; 6. relief ↔ imagine
  gri pe 16 biți + simularea salvată ca strat; 7–8. exportul STL / OBJ (deschis sau închis cu bază plană), cu toleranță
  și decimare (o plasă completă de 4000² ar avea ~1,6 GB [dedus: s5 §6]); 9. placa.
- **Ținta:** reliefuri construite din profile (muluri, rozete, forme strunjite) și schimb cu alte programe.
- **Închide:** C6, C7, C22, C12.
- **Placa E20:**

  | # | Cota | Pe hârtie | Toleranța |
  |---:|---|---:|---:|
  | 1 | extrudare dreaptă de 100 mm cu profil semicerc R5: înălțimea / lățimea | 5,00 / 10,00 | ±0,10 |
  | 2 | spin 360° al unui profil: diametrul / înălțimea | pe hârtie | ±0,20 |
  | 3 | sweep între două șine paralele la 60 mm: lățimea | 60,00 | ±0,20 |
  | 4 | STL-ul exportat, deschis de owner într-un program 3D: dimensiunile | aceleași | ±0,05 |

- **Live:** da.
- **Felii estimate:** 8,5.

#### E21 — Sculptura, straturile bitmap, îmbinările (săptămâna 21)

- **Felii (7,5):** 1–2. sculptura (netezire locală, adăugare / scoatere, ștergere, smudge) la 60 fps, cu undo pe dale;
  3–4. straturile bitmap ca suprafață de desen + formele ridicate din culori; 5–7. îmbinările (contour blend, 3D blend,
  mirror-merge, relief lipit pe vector, cookie cutter); 8. placa + măsurarea fluidității la 4000² pe mașina owner-ului și pe
  laptop.
- **Ținta:** owner-ul sculptează și îmbină reliefuri ca în ArtCAM, fluid, la 4000 × 4000.
- **Închide:** C16, C15, C14, C13.
- **Placa E21:**

  | # | Cota | Pe hârtie | Toleranța |
  |---:|---|---:|---:|
  | 1 | pensula „adaugă” r = 5 mm, h = 1 mm: diametrul / înălțimea umflăturii | 10,0 / 1,00 | ±0,5 / ±0,10 |
  | 2 | cookie cutter într-un cerc Ø60 | 60,00 | ±0,20 |
  | 3 | mirror-merge: diferența stânga-dreapta | 0,00 | ±0,10 |
  | 4 | sculptura la 4000²: cadre pe secundă pe laptop | ≥ 30 | — |
  | 5 | operația globală pe 4000² (blur) | ≤ 250 ms | declanșatorul GPU (§3.7.3) |

- **Live:** da.
- **Felii estimate:** 7,5.

#### E22 — 3D din STL: import, zone, decupare 3D (săptămâna 22)

- **Felii (6,5):** 1–3. importul 3D (STL, OBJ, 3MF; 3DS, VRML, DXF 3D; poziționare, scalare, oglindire, rotire, alegerea
  feței); 4–5. zonele (dreptunghi sau vector, libere, imbricate cu găuri, conturul automat al modelului, sărirea zonei din
  jur); 6. decuparea 3D (profil cu Z absolut, cu punți și intrări); 7. placa.
- **Ținta:** owner-ul prelucrează un model STL ca în DeskProto și îl decupează din placă.
- **Închide:** D1, D6, D9.
- **Placa E22** (un cub de 20 mm cu o semisferă R10 deasupra, sau un model al owner-ului):

  | # | Cota | Pe hârtie | Toleranța |
  |---:|---|---:|---:|
  | 1 | latura cubului | 20,00 | ±0,10 |
  | 2 | înălțimea totală (20 + 10) | 30,00 | ±0,10 |
  | 3 | diametrul semisferei | 20,00 | ±0,20 |
  | 4 | zona: finisată doar semisfera; restul are pielea de degroșare | 0,50 | ±0,10 |
  | 5 | decuparea 3D cu 4 punți: grosimea punții | 3,00 | ±0,20 |

  **Confirmă:** drop-cutter-ul exact pe triunghiuri (0 abateri în 8 000 de puncte [măsurat: s5]); nicio scobitură față
  de plasă.
- **Live:** da.
- **Felii estimate:** 6,5.

#### E23 — Două fețe, bas-relief, texturi, anvelopa (săptămâna 23)

- **Felii (8,5):** 1–2. relieful pe două fețe + prelucrarea cu întoarcere (fața de jos a foii, axa de întoarcere,
  știfturile); 3–4. bas-relieful din STL + silueta (Poisson multigrid; parametrii reglați cu owner-ul); 5–6. texturile,
  fluxul de textură, țesătura; 7–8. deformarea în anvelopă pentru vectori și reliefuri; 9. placa.
- **Ținta:** piese lucrate pe ambele fețe, aliniate, și reliefuri din modele 3D.
- **Închide:** C18, C19, C20, A7.
- **Placa E23:**

  | # | Cota | Pe hârtie | Toleranța |
  |---:|---|---:|---:|
  | 1 | două fețe: o gaură străpunsă de pe față față de semnul de pe spate | 0,00 | ≤ 0,20 |
  | 2 | buzunarul de pe spate, oglindit, după o mutare de 50 mm pe față | urmează fața | da / nu |
  | 3 | bas-relieful: adâncimea maximă (ținta 8) | 8,00 | ±0,10 |
  | 4 | țesătura: perioada | 10,00 | ±0,20 |
  | 5 | text în anvelopă între două arce: înălțimea la mijloc | pe hârtie | ±0,20 |

  **Confirmă:** oglinda feței de jos (prototipul, M5) pe lemn; oracolele bas-reliefului (Poisson, adâncimea finală)
  [măsurat: s5 §4.9].
- **Live:** da.
- **Felii estimate:** 8,5.

#### E24 — Coliziunea, zonele inaccesibile, feliile, clipartul de relief (săptămâna 24)

- **Felii (6,5):** 1. coliziunea cu mandrina și cu motorul (al doilea profil peste același câmp); 2. vizualizarea zonelor
  inaccesibile; 3. feliile pentru modelul mai înalt decât freza sau decât placa; 4–6. biblioteca de clipart de relief
  proprie + setul de pornire, făcut cu uneltele noastre (§8, întrebarea 9); 7. placa.
- **Ținta:** modele înalte tăiate în felii și lipite, fără coliziuni, plus o bibliotecă proprie de reliefuri.
- **Închide:** D7, D8, D10, C24.
- **Placa E24:**

  | # | Cota | Pe hârtie | Toleranța |
  |---:|---|---:|---:|
  | 1 | model de 36 mm din 2 felii de 18 mm, lipite: înălțimea | 36,00 | ±0,20 |
  | 2 | alinierea feliilor | 0,00 | ≤ 0,20 |
  | 3 | buzunar adânc cu freză scurtă: avertisment de coliziune înainte de generare | da | — |
  | 4 | un relief din bibliotecă, tăiat la mărimea din fișa lui | pe fișă | ±0,20 |

- **Live:** da.
- **Felii estimate:** 6,5.

#### E25 — Conturi, dreptul de acces pe server, proba, adminul P2 (săptămâna 25)

- **Ținta:** oricine își poate face cont și primește proba de 14 zile fără card; owner-ul administrează utilizatorii.
- **Felii (7,5):**
  1. conturile pentru toți (Google + e-mail), App Check pe live, regulile probate în perechi permis / refuzat;
  2. dreptul de acces calculat pe server (`entitlements/{uid}`), citit în client, cache offline cu expirare;
     capabilitățile fiecărei acțiuni devin active;
  3. proba de 14 zile fără card (registrul probei, după verdictul din PORTARE);
  4–5. P2: Utilizatori (căutare pe server, dosar, plan, probă, dezactivare, export și ștergere GDPR din aceeași listă de
     colecții), Audit atomic cu pre-imaginea, Admini (`staff`), plăcile de conturi și probe din Puls;
  6–7. P2+: Tichete complete (e-mail, alerte cu marcaj de rulare), Config (oprire, mentenanță, anunț, prin callable cu
     audit), panoul de publicare test → live;
  8. placa de regresie.
- **Închide:** P2, P2+.
- **Placa E25 = placa de regresie**, tăiată dintr-un cont nou, în probă (dreptul de acces nu blochează exportul pe probă).
  Cotele și toleranța ca la E13. **Confirmă:** capabilitățile nu strică drumul care mișcă mașina.
- **Live:** da.
- **Felii estimate:** 7,5.

#### E26 — Atelierele (runda 2), WMF / EMF, tampon 2 (săptămâna 26)

- **Felii (4,5 planificate, până la 8 disponibile):** 1. rezultatele rundei 2 → contracte „probat”; ce rămâne neprobat
  devine întrebare la owner, cu dovezile; 2–3. cititorul WMF propriu (+ EMF peste prag); 4. datoriile din plăci; 5. placa
  de regresie + re-estimarea.
- **Ținta:** posturile aproape toate probate; importul WMF; drumul curățat înaintea ultimei porțiuni.
- **Închide:** — (A4 avansează: WMF; L4 avansează).
- **Placa E26 = placa de regresie**, plus un desen dintr-un WMF de clipart: o cotă pe hârtie din coordonatele fișierului
  (unități de 0,0212 mm), ±0,20.
- **Live:** da.
- **Felii estimate:** 4,5.

#### E27 — EPS și AI vechi (săptămâna 27)

- **Felii (7,5):** 1–3. nucleul interpretorului PostScript (stive, dicționare, CTM, căi; buget de pași, timp și memorie;
  într-un worker; refuz cu motiv); 4–5. profilul Illustrator (EPS 8 → CC) + AI ≤ 8 după specificația publică; 6. profilul
  CorelDRAW, după fișierele reale ale owner-ului; 7. corpusul real al owner-ului, poarta ≥ 80 %; 8. placa.
- **Ținta:** EPS-urile de la designeri și din băncile de clipart se deschid ca vectori, iar ce nu se poate citi e refuzat
  cu motiv.
- **Închide:** A4 (cu deciziile owner-ului despre DWG, DGK și PIC).
- **Placa E27:** o piesă dintr-un EPS al unui client, profil exterior: 3 cote pe hârtie din coordonatele fișierului (pt ×
  25,4 / 72), ±0,15. **Confirmă:** oracolul EPS (Ghostscript-WASM + PyMuPDF doar în test) [măsurat: s12].
- **Live:** da.
- **Felii estimate:** 7,5. **Dacă owner-ul alege „EPS doar mesaj”:** etapa dispare, iar planul scade cu o săptămână.

#### E28 — Facturarea (Stripe în modul test), copia în cloud, P3 (săptămâna 28)

- **Felii (7,5):** 1. catalogul unic (prețuri, niveluri, capabilități), generat spre Stripe, funcții și client, cu test în
  ambele direcții; 2–3. Stripe în modul test: checkout, webhook, portal, lista albă pe server, plățile eșuate; 4. P3:
  Venituri (MRR din catalogul unic, eticheta „MOD DE TEST”), cozile de eșecuri, verificările Stripe în Diagnoză; 5–6.
  copia proiectelor în cloud (dacă owner-ul spune da): urcare și coborâre de `.cncvs`, blocată pe server; 7. paginile
  juridice (Termeni, confidențialitate), en + ro, cu entitatea de la owner; 8. placa de regresie.
- **Ținta:** plata merge cap-coadă în modul de test; trecerea pe live așteaptă doar CAEN-ul.
- **Închide:** P3.
- **Placa E28 = placa de regresie**, tăiată dintr-un proiect coborât din cloud pe alt calculator (hash identic). Cotele ca
  la E13.
- **Live:** da (Stripe rămâne pe cheia de test până la CAEN).
- **Felii estimate:** 7,5.

#### E29 — Cele două interfețe și ghidul de la prima pornire (săptămâna 29)

- **Felii (6,5):** 1–3. asistentul pas cu pas pentru începători, ca vedere peste același registru de acțiuni; 4.
  interfața completă și asistentul oferă exact aceleași acțiuni și capabilități (test); 5. ghidul la prima pornire; 6.
  auditul en + ro (paritate, plurale românești, glosarul); 7. placa.
- **Ținta:** un începător ajunge singur de la cont la piesă tăiată.
- **Închide:** F6, T8.
- **Placa E29** (owner-ul joacă începătorul, doar prin asistent):

  | # | Cota | Pe hârtie | Toleranța |
  |---:|---|---:|---:|
  | 1 | plăcuța | 150,00 × 50,00 | ±0,15 |
  | 2 | majuscula textului | 20,00 | ±0,20 |
  | 3 | adâncimea V-carve pe o trăsătură de referință | pe hârtie | ±0,10 |
  | 4 | timpul de la pornire la program exportat | ≤ 15 min | — |

- **Live:** da.
- **Felii estimate:** 6,5.

#### E30 — Testul cu străinul și adminul P4 (săptămâna 30)

- **Felii (6):** 1. pregătirea testului (cont nou pe live, fără ajutor, observat; jumătate de felie); 2–3. reparațiile
  din test; 4–5. P4:
  Analiza (pâlnia, adopția derivată din registrul de acțiuni), CAM simplificat, rezumatul zilnic; 6. fiecare filă de
  admin, exersată pe test cu scenariul ei; 7. placa.
- **Ținta:** un străin dintr-un atelier își face cont și taie o piesă fără ajutor (BRIEF §1, §8).
- **Închide:** P4. Punctul de lansare L5 (dacă trece) și L9.
- **Placa E30 = piesa străinului:** cotele lui, din desenul lui, ±0,20; trecut / picat, fără ajutor.
- **Live:** da.
- **Felii estimate:** 6.

#### E31 — Lansarea v1 (săptămâna 31)

- **Felii (4,5):** 1. lista din BRIEF §8 bifată, cu dovezi (fiecare rând cu commit-ul lui); 2. dovezile posturilor din
  ateliere în repo, contractele „probat”; 3. Stripe live, dacă CAEN-ul a venit, sau decizia owner-ului de lansare fără
  încasare (jumătate de felie); 4. backup, jurnal, Diagnoza verde pe live; partea juridică completă; 5. publicarea de
  lansare (jumătate de felie); 6. placa de regresie finală.
- **Ținta:** v1 complet pe live, cu lista de lansare bifată.
- **Închide:** L1, L2, L3, L4, L6, L7, L8 (L5, L9, L10 sunt deja închise).
- **Placa E31 = placa de regresie finală**, ca la E13.
- **Live:** da, lansarea.
- **Felii estimate:** 4,5.

### 5.3 Harta de control: fiecare rând de prag, unde se închide

| ID | Rândul exact (ACOPERIRE) | Închis în |
|---|---|---|
| A1 | Vectori, noduri, boolean, offset, aliniere | E5 |
| A2 | Text, text pe cale, fonturi | E16 (început E4) |
| A3 | Verificarea și repararea vectorilor: deschiși, duplicați, intersecții, bucle, noduri prea apropiate | E7 (început E4) |
| A4 | Import 2D: DXF, AI / EPS (S+D); SVG (D); PDF vectorial, DWG, WMF, DGK / PIC (S) | E27 (E4, E6, E26 parțial); DWG / DGK / PIC după decizia owner-ului |
| A5 | Export 2D cu vectori reali: DXF, SVG, PDF (EPS / AI de decis), la scara exactă, cu cercuri, arce și curbe păstrate ca entități și cu straturile păstrate; deschis editabil în alte programe (rând nou, cerut de owner; `BRIEF.md` §16.2) | E7 |
| A6 | Cote (nici ArtCAM nu le are: doar rigle și măsurare) | E15 |
| A7 | Deformare în anvelopă (între două curbe), pentru vectori și reliefuri | E23 |
| A8 | Trasare din imagine (bitmap → vectori) | E16 |
| A9 | Mai multe foi de material într-un proiect (Sheets) și plăcuțe cu date variabile din CSV (Multi-Plate) — legat de sistemul de planșe | E11 |
| A10 | Transformare și copiere: mutare, scalare, rotire, înclinare, oglindire, copiere în rețea, circulară și de-a lungul unei curbe (rând nou) | E5 |
| A11 | Tăierea și conversia vectorilor: tăiere cu o linie, decupare la un contur, arce în loc de curbe, netezire, conversie în cercuri / dreptunghiuri (rând nou) | E16 |
| B1 | Profil, cu urechi de susținere, intrări / ieșiri, direcție de tăiere | E3 (început E1) |
| B2 | Fileturi la colțuri interioare: dog-bone și T-bone | E8 |
| B3 | Buzunar (curățare de suprafață), cu mai multe freze | E8 (început E3) |
| B4 | V-carve (inclusiv cu freză dreaptă pentru fund plat) | E4 |
| B5 | Găurire | E3 |
| B6 | Ordinea operațiilor și a vectorilor; câte un fișier separat pe sculă | E8 (început E3) |
| B7 | Gravare pe linie; gravare „inteligentă” cu colțuri ascuțite (smart engrave) | E12 |
| B8 | Inlay în V (D) ȘI inlay cu pereți drepți, simplu sau în trepte (S), fiecare cu criteriul lui | E12 |
| B9 | Caneluri (cu încrucișări împletite), teșire (bevel carving), Raised Round (adâncitură cu profil) | E14 |
| B10 | Freze de profil desenate de utilizator; roundover cu offset față de interior | E14 |
| B11 | Transformarea traseelor calculate: mutare, rotire, oglindire, copiere, unire | E14 |
| B12 | Traseu de textură direct din forma frezei, fără relief | E14 |
| B13 | Tăieri ghilotină (grilă de tăieturi drepte, nesting aliniat); găurire cu mai multe burghie simultan (drillbanks) | E15 |
| B14 | Laser: tăiere / gravare, plus laser 3D în felii pe Z | E15 |
| C1 | Relief din imagine (gri → înălțime) | E17 |
| C2 | Alinierea pixelilor imaginii cu grila de calcul (fără „riduri” moiré) | E17 |
| C3 | Litofanie (relief din fotografie, pentru lumină) | E17 |
| C4 | Editor de forme: din vector → cupolă, rotunjit, unghi, plan; înălțime, unghi, limită; Zero / Zero Rest | E18 |
| C5 | Combinarea reliefurilor: adună, scade, păstrează înalt / jos, înlocuiește; Multiply între straturi | E18 |
| C6 | Extrudare de-a lungul unei căi, cu profil | E20 |
| C7 | Two Rail Sweep; Spin (profil rotit în plan, pe 360° sau între unghiuri); Turn (formă strunjită) | E20 |
| C8 | Relief din text | E18 |
| C9 | Operații: scalarea înălțimii, negativ (male / female), offset, netezire, limită, plan înclinat | E19 |
| C10 | Estompare (liniară, radială, între contururi) și pante pe pereți (draft, cu unghi) | E19 |
| C11 | Conturul vectorial al reliefului (pe interval de înălțime); tăiere după culoare; magic wand | E19 |
| C12 | Export relief ca STL / OBJ (deschis sau închis cu bază plană), cu toleranță | E20 |
| C13 | Rezoluție: cel puțin 4000 × 4000 de puncte (16 milioane), cu editare fluidă | E21 (început E17) |
| C14 | Îmbinări: contour blend, 3D blend, mirror-merge, relief lipit pe vector, cookie cutter | E21 |
| C15 | Straturi bitmap ca suprafață de desen; forme ridicate direct din culori | E21 |
| C16 | Sculptare: netezire locală, adăugare / scoatere material, ștergere, întindere (smudge) | E21 |
| C17 | Straturi de relief: combinare, vizibilitate, ordine | E18 |
| C18 | Relief pe două fețe (back relief) și prelucrare cu întoarcere (flip machining) | E23 |
| C19 | Relief din model 3D (bas-relief din STL), siluetă | E23 |
| C20 | Texturi pe relief, flux de textură, țesătură (weave) | E23 |
| C21 | Analiza reliefului: hartă de înălțimi și hartă de pante (gradient) | E18 |
| C22 | Relief ↔ imagine gri pe 16 biți; simularea salvată ca strat de relief | E20 |
| C23 | Suprafața, volumul și greutatea reliefului (date pentru ofertă) | E19 |
| C24 | Bibliotecă de clipart de relief (proprie) | E24 |
| D1 | Import 3D din rețele de triunghiuri: STL, OBJ, 3MF, 3DS, VRML, DXF 3D; poziționare, scalare, oglindire, rotire, alegerea feței | E22 |
| D2 | Degroșare 3D (în trepte Z) | E17 |
| D3 | Finisare paralelă (la orice unghi) | E17 |
| D4 | Animația traseului: freza care se mișcă pe traseu, pas cu pas, cu viteză reglabilă și glisor | E9 |
| D5 | Timpul estimat, afișat imediat după fiecare calcul, și rezumatul jobului | E8 |
| D6 | Zone: limitate (dreptunghi sau vector), libere, imbricate (cu găuri), contur automat al modelului, sărirea zonei din jur | E22 |
| D7 | Detectarea coliziunii cu mandrina (collet) și cu motorul | E24 |
| D8 | Vizualizarea zonelor inaccesibile (undercut) | E24 |
| D9 | Decupare 3D: profil cu Z absolut în jurul piesei sculptate, cu punți și intrări / ieșiri | E22 |
| D10 | Model mai înalt decât freza sau decât placa: construit din felii (după grosime sau după numărul de felii) | E24 |
| F1 | Simulare 3D a materialului: 3 axe în v1, apoi rotativ | E9 (început E1) |
| F2 | Bibliotecă de freze cu geometrie reală (dreaptă, bilă, toroidală, V, gravare, profil, formă desenată) | E8 (început E1) |
| F3 | Trimiterea directă la mașină (senderul) | E10 (început E2) |
| F4 | Calcul pe mai multe fire (workers) | E9 (început E1) |
| F5 | Șabloane de operații (aceleași setări pe alt desen) și calcul în lot | E15 |
| F6 | Două interfețe: asistent pas cu pas pentru începători + interfața completă | E29 |

Total: 65 de rânduri, toate cu o etapă.

**Funcțiile v1 din BRIEF §10:** T1 Listă de tăiere pe mai multe plăci → E11 · T2 Fișă de lucru tipărită → E11 · T3 Senzor
de lungime la schimbarea frezei, cu M6 ca barieră → E10 (bariera din E3) · T4 Găsirea colțului XY prin palpare → E10 · T5
Override de avans/turație + jurnal de rulare → E10 (transcrierea din E2) · T6 Planarea plăcii de sacrificiu → E10 · T7
Găurire în pași (peck) → E3 · T8 Ghid la prima pornire → E29.

**Adminul (s9-admin §5.2):** P0 → E2 · P1 → E3 · P2+ timpuriu (tichetele owner-ului) → E9 · P2 și restul P2+ → E25 · P3 →
E28 · P4 → E30 · fila AI → „mai târziu”, odată cu AI-ul (BRIEF §16.1). Total admin: ~13,5 felii, în intervalul 12–17 din
s9-admin.

**Lista de lansare (BRIEF §8):**

| # | Punctul | Unde |
|---|---|---|
| L1 | toate rândurile v1 și cele 8 funcții | tabelul de mai sus; bifat în E31 |
| L2 | fiecare rând cu commit-ul lui | la închiderea fiecărui rând; verificat în E31 |
| L3 | fiecare funcție care mișcă mașina, probată pe placa etapei ei | la fiecare placă; verificat în E31 |
| L4 | posturile NcStudio, RichAuto / Syntec, Mach3 / Mach4 probate pe controlere reale | pachetul pleacă E3; runda 1 → E12; runda 2 → E26; dovezile în E31 |
| L5 | un străin își face cont și taie o piesă fără ajutor | E30 |
| L6 | plata: Stripe live după CAEN, sau decizia owner-ului | E28 (modul test) + E31 |
| L7 | partea juridică: entitatea, adresa de firmă, Termenii | pașii owner-ului (§8); paginile în E28 |
| L8 | backup cu alarmă, jurnal de erori de server, costul AI (dacă există AI), en + ro complet | E2 (jurnalul), E3 (backup), E29 (en + ro); costul AI nu se aplică în v1 |
| L9 | adminul complet pentru v1, exersabil pe test | E30 |
| L10 | exportul vectorial probat cu cititor independent și deschis de owner | E7 |

**Pachetul pentru ateliere pleacă la sfârșitul E3 (săptămâna 3).** **Prima publicare pe live: tot la sfârșitul E3.**

### 5.4 Ce las afară, explicit

- **Din rândul A4:** DWG nativ (în plan doar mesaj + convertor gratuit), DGK și PIC (fără specificație publică). Ambele
  așteaptă decizia owner-ului (§8, întrebarea 2). Dacă owner-ul vrea DWG nativ în v1, costul e licența ODA (7 500 $
  primul an) plus ~2 felii [citit: s12 §2; dedus pentru felii].
- **Din rândul A5:** exportul AI (Illustrator deschide PDF, SVG și EPS) — de confirmat de owner.
- **Calculul pe GPU:** nu e în plan; intră doar prin declanșatorul măsurat din §3.7.3.
- **Fila AI din admin:** vine cu AI-ul („mai târziu”).
- **Rotativul din F1** („apoi rotativ”) și tot ce e v1.x în ACOPERIRE nu sunt în plan.
- **PLT** (importul din ediția întâi) nu e în rândul A4, deci nu e în plan.

---

## 6. Estimarea

| | Valoarea |
|---|---|
| Felii planificate | **218,5** (în 31 de etape; media ~7 pe etapă) |
| Capacitatea la 8 felii / săptămână | 248 de felii în 31 de săptămâni |
| Rezerva | 29,5 felii (~13 %), din care ~8,5 în tampoanele E13 și E26 |
| Săptămâni | **31**, plus Pasul 0 (2–3 zile) |
| Interval realist | 29–36 de săptămâni |
| Pesimist | ~39–40 de săptămâni (218,5 × 1,25 ≈ 273 de felii, la 7 pe săptămână) |
| Calendar (aprobare ~09.10, E1 din 12.10.2026, plus 2 săptămâni de sărbători) | lansarea în jurul sfârșitului lui mai 2027; pesimist, iulie 2027 |

**Ipotezele, scrise:**
1. **O felie ≈ 2–4 ore** de lucru concentrat, cu oracolul scris înainte, testele, commit-ul și o notă scurtă în DEVLOG
   [dedus].
2. **8 felii pe săptămână**, adică ~1,6 pe zi lucrătoare, ~5 zile pe săptămână. De ce acest număr:
   - ediția întâi a avut commit-uri în 97 din 127 de zile (~5,3 zile pe săptămână) [măsurat: f0/00];
   - cu o țintă dată de owner („o felie per defect, cu commit separat”), s-au închis 17 felii mici în 2 zile — limita de
     sus [citit: f0/28];
   - în august 2026, ~35 de intrări în 6 zile lucrătoare, dar plătite de 2–3 ori (construcție, respingere, reparație)
     [citit: f0/24], deci ~2–3 felii reale pe zi;
   - aici dovada e mai mică și scrisă înainte, iar poarta are bugete (§4.4); în schimb, sfârșitul etapei (placa,
     publicarea, recenzia owner-ului) ia ~0,5–1 zi;
   - **limita reală e atenția owner-ului**: ~8 lucruri de încercat pe săptămână, plus placa.
3. **Duratele reale din Faza 2 au trecut cu 7–45 % peste capătul de sus al estimării** (tranșa 1: 80 min față de 60–75;
   tranșa 1b: 87 min față de 45–60) [măsurat: DEVLOG]. De aceea rezerva de ~13 % plus intervalul pesimist de +25 %.
4. **Mărimile pe subsistem** vin din probele sondelor și din planul din PDF (de exemplu, fundația 8–12 felii, bucla subțire
   8–12, CAM 2D 20–30 [citit: JSON]), ajustate cu ce am învățat în sonde (de exemplu, cavalier: 2–4 zile [citit: s1-V];
   EPS: 2–3 săptămâni de om, adică ~7–8 felii aici [citit: s12; dedus pentru felii]; adminul: 12–17 felii [citit:
   s9-admin]).
5. **Nu intră în săptămâni:** așteptarea atelierelor, CAEN-ul, entitatea juridică. Ele pot muta lansarea, nu dezvoltarea.
6. **Re-estimarea:** la sfârșitul E4 și al E8, din duratele măsurate ale feliilor, apoi în tampoanele E13 și E26. Dacă
   media pe felie iese cu peste 25 % peste ipoteză, owner-ul primește lista de candidați pentru v1.x (§8, întrebarea 10).

**Defalcarea pe blocuri:**

| Blocul | Etapele | Felii |
|---|---|---:|
| Bucla subțire + mașina de bază + posturi | E1–E3 | 23,5 |
| Text, V-carve, editor, pânză, import, export, persistență | E4–E7 | 28 |
| CAM 2D complet, simulare, mașină, producție, incrustații | E8–E12 | 36,5 |
| Tampoane | E13, E26 | 7,5 |
| Operații decorative, text, trasare | E14–E16 | 22,5 |
| **Relieful** (cel mai mare bloc) | E17–E21, E23 (parțial), E24 (parțial) | ~48 |
| 3D din STL | E22, E24 (parțial) | ~10 |
| Cloud, admin, facturare | E25, E28, plus P0–P1 în E2–E3 și tichetele în E9 | ~21 |
| EPS / AI | E27 | 7,5 |
| Începători, străinul, lansarea | E29–E31 | 17 |

(Rândurile se suprapun pe etapele mixte; totalul autoritativ e suma etapelor: 218,5.)

---

## 7. Riscurile (primele 10)

| # | Riscul | Semnalul timpuriu | Ce fac |
|---:|---|---|---|
| 1 | **Atelierele nu se găsesc sau răspund încet** (drumul critic al posturilor) | la sfârșitul E3 nu e confirmat niciun atelier; după 6 săptămâni nu s-a întors nicio măsurătoare | owner-ul începe căutarea în săptămâna 1; pachetul pleacă devreme (E3), cu două runde; fișierele sunt mici și se rulează întâi în aer; postul neprobat poartă avertisment; în E26, ce rămâne neprobat devine decizie a owner-ului |
| 2 | **Estimarea e prea optimistă** (v1 e foarte mare) | media pe felie în E1–E4 cu peste 25 % peste ipoteză; o felie cu peste 50 % → stop | re-estimare la E4 și E8; lista de candidați pentru v1.x gata; tampoanele E13 și E26 |
| 3 | **Nucleul geometric cade pe fișierele reale** (polilinii dense, deriva PathKit, muchii aproape comune) | suita densă pică după port (E5); DXF-ul owner-ului dă bucle deschise sau goluri (E6) | gărzile la intrare și la ieșire, R3, rezoluția declarată; eșec explicit, niciodată traseu tăcut; rezerva: Rust 0.9 în WASM, cu acordul owner-ului |
| 4 | **Hardware slab în ateliere** (pânza, relieful, 3D-ul) | imaginea exactă de 50 k forme > 1 s pe laptop (E6); sculptura < 30 fps (E21) | LINE_STRIP, LOD, testul de cadru la pornire; criteriul planului B; declanșatorul GPU, măsurat, doar pentru relief |
| 5 | **Blocul de relief se întinde** (cel mai mare; calitatea la sweep și bas-relief e subiectivă) | E17–E18 cu peste 30 % peste estimare; owner-ul respinge calitatea bas-reliefului | ordinea din s5 (riscul mare spre final), parametrii judecați de owner la plăci; tampon înainte (E13) și după (E26) |
| 6 | **Alegerea planșelor întârzie sau se întoarce** | nicio decizie până la E10; owner-ul se încurcă la gesturi în E11 | arborele, gesturile și rama sunt comune și construite înainte; D cu nivelul doi ascuns; migrare pură, fără utilizatori |
| 7 | **Owner-ul rămâne singurul oracol și nu mai ține pasul** | lista lui trece de 5; o placă nu se taie în săptămâna ei; „nu pot verifica acum” | lista ≤ 5 cu implicitul în față; formularul plăcii în aplicație; tichetele din E9; plăci de regresie în etapele fără mașină; bancul vizual cu poză + cifră |
| 8 | **CAEN-ul sau entitatea juridică întârzie lansarea** | fără CAEN la E25; fără entitate la E28 | Stripe gata în modul test (E28); owner-ul decide lansarea fără încasare (BRIEF §8); termenele juridice în §8 |
| 9 | **Derapajul de proces** („continua”, contextul pierdut între sesiuni și modele) | felii alese din afara etapei; registrul crește mai repede decât se închide; DEVLOG lung | ținta fiecărei etape e scrisă aici; feliile doar din etapă; ADR-uri și CLAUDE.md la zi; DEVLOG scurt; registrul cu gravitate |
| 10 | **Porțile mint** (verde pe sabotaj; ediția întâi: 9 felii verzi cu defecte reale) | o otravă supraviețuiește noaptea; un martor nu pică | control negativ în fiecare oracol; mutații alese de altcineva, contra tuturor suitelor; oracole cu zero importuri; plăcile pe lemn |

Riscuri mai mici, urmărite: regiunea mixtă a Firebase (marcaj de rulare pe fiecare declanșator, cron în loc de „every
N”); Drive-ul care readuce fișiere (`git status` la începutul sesiunii, unealta de mutații verifică hash-urile); PathKit
înghețat (rezerva CanvasKit); `willReadFrequently` e doar un indiciu (testul pe nucleele procesului GPU).

---

## 8. Ce cere de la owner

Lista ta are cel mult **5 lucruri deschise** odată [citit: BRIEF §7]. De aceea le pun în loturi, după termen. La fiecare,
**recomandarea și implicitul** sunt primele: dacă nu spui altfel, aplic implicitul.

### 8.1 Lotul 1: la aprobarea planului (5)

1. **Planșele: A sau D?** Recomand **D**. Implicit: D. Prototipul e la tine (`docs/faza2/prototip-planse/index.html`).
   Termen: înainte de E11; primele 10 etape nu depind de alegere.
2. **Formatele de import fără licență liberă** (rândul A4) și exportul AI (rândul A5). Recomand:
   - EPS și AI ≤ 8 în v1, prin interpretor propriu, limitat, cu refuz explicit (E27, ~7,5 felii);
   - DWG doar ca mesaj + convertor gratuit în v1, nativ de decis în v1.x;
   - WMF propriu (+ EMF peste prag);
   - DGK și PIC scoase din prag, cu motivul scris în ACOPERIRE;
   - exportul: EPS da, AI nu.

   Implicit: exact asta. Dacă vrei EPS doar ca mesaj, planul scade cu o săptămână.
3. **Nucleul de offset fără Rust în v1.** Recomand: portăm noi reparațiile în copia JS (2–4 zile, E5); Rust 0.9 în WASM
   doar dacă suita densă pică după port. Implicit: da.
4. **Prima publicare pe live la sfârșitul E3**, care înlocuiește aplicația veche (după exportul Firestore, după ce vezi
   lista funcțiilor vechi de șters și după ce numărăm utilizatorii de pe live). Până la lansare, live-ul are o bandă „în
   dezvoltare”, iar conturile pentru străini rămân închise până la E25. Recomand da. Implicit: da.
5. **Formele care se ating în aceeași operație** (de exemplu, literele script care se suprapun): se unesc sau rămân
   separate? Recomand: **se unesc implicit**, cu o bifă „separat” pe operație [dedus din s3-V §5.4]. Implicit: se unesc.

### 8.2 Lotul 2: cu termen

6. **Jurnalul de erori fără consimțământ**, cu uid-ul pseudonim și retenție de 90 de zile. Recomand da, cu o frază în
   politica de confidențialitate, de verificat juridic [citit: s9-admin §5.4]. Implicit: da. Termen: E2.
7. **Tichetele folosite întâi de tine**, pentru raportările de pe test. Recomand da [citit: s9-admin §5.4]. Implicit: da.
   Termen: E9.
8. **Conținutul nivelurilor** (ce capabilități are Hobby / Pro / Producție) și **creditele de export** din ediția întâi.
   Recomand: creditele **nu** intră în v1 (BRIEF §4 vorbește doar de abonamente) [citit: s9-admin §5.4]. Termen: înainte de
   E25 (nivelurile trebuie decise înainte de codul de facturare, BRIEF §4).
9. **Clipartul de relief propriu (C24):** recomand un set de pornire de ~30 de reliefuri (rozete, chenare, frunze), făcute
   cu uneltele noastre, fără nimic copiat. Implicit: da. Termen: E24.
10. **Copia proiectelor în cloud în v1** (urcare și coborâre de `.cncvs`, blocată pe server). Recomand da: e primul lucru
    pe care îl vinde abonamentul pe server și e plasa pentru stocarea browserului, care poate fi evacuată [măsurat:
    `persist()` a întors fals pe un profil nou, s7 §4.3]. Termen: E28.
11. **Reluarea de la linia N în sender** (era marcată [v1] în prompt): recomand să intre în F3, în E10. Implicit: da.
12. **Dacă estimarea crește** la re-estimarea din E8: candidații mei pentru v1.x, în ordinea economiei: EPS limitat (−1
    săptămână), clipartul de relief (−3 felii), laserul 3D în felii, țesătura. Nimic nu iese fără decizia ta.

### 8.3 Pașii de configurare (fiecare cu termenul lui)

| Pasul | Termen | De ce |
|---|---|---|
| Caută ateliere cu **NcStudio, RichAuto, Syntec, Mach3, Mach4** care să ruleze 6–8 fișiere mici (întâi în aer, apoi în MDF) | **săptămâna 1**; confirmări până la sfârșitul E3 | drumul critic al posturilor (BRIEF §12, §15) |
| Numără utilizatorii de pe live, în consolă | înainte de E3 | prima publicare înlocuiește aplicația veche (LECTII §7.4) |
| Confirmă exportul Firestore pe test (E1) și pe live (E3), rulat din CLI-ul tău logat; secretele nu trec prin chat | E1, E3 | BRIEF §7 |
| Cheie reCAPTCHA Enterprise pentru domeniul de test; tokenul de debug App Check doar pe test, ca secret în CI | E2 | adminul exersabil pe test din ziua 1 (s9-admin §5.3) |
| WIF pe ambele proiecte + mediul `live` în GitHub, cu tine ca aprobator | E3 | publicarea cu sha fixat (s9-admin §5.1) |
| Materiale: MDF 18 / 12 / 6, placaj de 3 mm, lemn tare pentru incrustație (nuc, paltin) | E1, apoi pe etape | plăcile |
| Freze: dreaptă Ø6 și Ø3,175, V60 și V90, bilă R3, un roundover; șubler, lamele de 0,1 mm | E1 | plăcile |
| Placă de contact pentru Z și colț XY; senzor de lungime legat la pinul de palpare | E2 (Z), E10 (senzor, XY) | T3, T4 |
| Modul laser pe mașină, sau un atelier cu laser; un atelier cu bloc de găurire, dacă există | E15 | B14, B13 |
| Fișierele tale reale: DXF / SVG / PDF (E6), o imagine pentru trasare (E16), modele STL (E22), EPS-uri reale, inclusiv din CorelDRAW (E27) | pe etape | corpusul real a reparat ediția întâi de mai multe ori (LECTII §3.1) |
| Un laptop de atelier, pentru măsurarea pânzei | E6 | criteriul planului B (s6-V) |
| DNS-ul pentru e-mail (MX, SPF, DKIM) | E25 | tichetele și alertele (BRIEF §7) |
| Entitatea juridică, adresa de contact de firmă, Termenii | E28 | BRIEF §8 |
| CAEN-ul pentru Stripe live | extern | BRIEF §4; la E31 decizi lansarea cu sau fără încasare |
| Un străin dintr-un atelier, pentru testul de lansare | E30 | BRIEF §1, §8 |
| Încerci instanța de test și tai placa în fiecare săptămână | săptămânal | placa e aprobarea etapei |
