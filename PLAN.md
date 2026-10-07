# PLANUL v1: CNC Vector Studio, ediția a doua

**Stare: ciornă spre aprobare, Faza 2, 07.10.2026.** După aprobare, planul devine autoritatea pentru ordinea etapelor
și pentru arhitectură. `BRIEF.md` rămâne autoritatea pentru ce vrea owner-ul.

**Marcaje:** [măsurat] = probat prin rulare (sondă, verificare sau git); [citit] = din documente sau cod; [dedus] =
concluzie, nerulată. Sursele sunt în `docs/faza2/`:
- **sondele:** `sonde/s1`…`s8`, `s11`, `s12`;
- **verificările:** `s1-V`, `s3-V`, `s6-V`, adică fișierul `VERIFICARE.md` din dosarul sondei;
- **adminul:** `admin/RAPORT.md`;
- **prototipul planșelor:** `prototip-planse/RAPORT.md`;
- **propunerile și estimarea:** `arhitectura/propunere-*.md` și `arhitectura/estimare.md`.

---

## 0. Pe scurt

- **Ce construim:** v1 = cele 65 de rânduri v1 din prag + cele 8 funcții din `BRIEF.md` §10 + adminul (§16.1) + vectorii
  reali (§16.2). Lansarea vine abia la v1 complet (§8).
- **Cum lucrăm:**
  - etape de o săptămână, fiecare cu o țintă scrisă aici și o **placă de probă** cu 5–10 cote date dinainte;
  - placa e aprobarea etapei, iar după ea se publică pe live, cu confirmarea ta;
  - feliile le aleg eu din etapă, nu dintr-un registru.
- **Ordinea:**
  - **prima piesă tăiată din aplicația nouă: sfârșitul săptămânii 1;**
  - prima publicare pe live: săptămâna 3;
  - pachetul de probă pleacă la ateliere în săptămâna 4;
  - apoi CAM-ul 2D și producția (săptămânile 5–18);
  - relieful și 3D-ul (19–26);
  - importurile grele, facturarea, interfața pentru începători și lansarea (27–33).
- **Arhitectura, în șase rânduri:**
  1. un singur drum pentru tot ce mișcă mașina: document → operație → IR → un singur post → G-code cu amprentă →
     sender;
  2. geometrie exactă din linii, arce și cubice: cercul rămâne cerc prin orice operație, iar exportul scrie
     entități reale;
  3. tot calculul greu rulează pe procesor, în workere, și dă exact același rezultat în teste și pe ecran;
  4. pânza desenează vectorii exacți într-un worker, iar traseele pe placa video;
  5. datele stau local (IndexedDB), proiectul se salvează ca zip determinist, iar aplicația pornește fără rețea;
  6. cloud-ul (cont, drept de acces, facturare, admin) e pe aceleași proiecte Firebase, cu dreptul de acces calculat
     doar pe server.
- **Durata, din ritmul măsurat** (`arhitectura/estimare.md`), socotită de pe 07.10.2026:

  | Pragul | Săptămâni | Data |
  |---|---:|---|
  | P50 | ~33 | ~sfârșitul lui mai 2027 |
  | P80 | ~50 | ~septembrie 2027 |
  | P90 | ~64 | ~sfârșitul lui decembrie 2027 |

  - Planul pe etape are 30 de etape + 3 săptămâni-tampon (~33 de săptămâni, 254 de felii) și se potrivește cu P50.
  - **După etapa 2, estimarea se reface din duratele noastre reale.** Dacă P50 se mută cu peste 20 %, primești noua
    cifră și pârghiile (§6).
- **Ce iau de la tine acum** (§8, lotul 1, fiecare cu implicitul în față): alegerea A / D după prototip, pachetul de
  export deschis în programele tale, atelierele, fișierele tale reale, „live doar pentru personal până la lansare”.

---

## 1. Cum s-a făcut planul

- **Faza 2 a avut trei tranșe**, plus sinteza mea:
  - tranșa 1: 10 sonde cu cod de probă;
  - tranșa 1b: 3 verificări adversariale și 2 sonde mici;
  - tranșa 2: 3 propuneri independente (corectitudine, valoare, simplitate) și un estimator.
- **Cost total, până aici:** ~8,7 M tokeni [măsurat, `DEVLOG.md`].
- **Toate cele 10 sonde s-au reprodus** când le-am rulat serial, pe mașina liberă [măsurat].
- **Fiecare dintre cele 3 sonde verificate a avut cel puțin o afirmație decisivă infirmată**, iar planul o folosește pe
  cea corectată:
  - offsetul cade pe polilinii dense;
  - booleanul derivă în lanț;
  - V-carve-ul cere un pas mai fin pe detalii;
  - pânza trebuie să deseneze în worker.

  De aceea regula „verificarea câștigă” e scrisă și în procesul de lucru (§4).
- **Cele trei propuneri au convers** pe aceleași decizii mari. Planul ia:
  - **scheletul pe etape** din propunerea „simplitate”: e cea mai prudentă, iar acoperirea pe rânduri e verificată
    (`arhitectura/propunere-simplitate.md` §5.3);
  - **spina de dovadă** din „corectitudine”: invariantele, oracolele, amprenta programului;
  - **felul de a cere decizii** din „valoare”: implicitul în față, loturi cu termen.

  Diferențele tranșate sunt la §3.5.

---

## 2. Glosarul

Fiecare cuvânt are un singur sens în cod, în interfață și în discuții. Termenii tehnici sunt explicați la prima folosire.

| # | Cuvântul | Ce înseamnă |
|---:|---|---|
| 1 | **document** (proiect) | Tot proiectul: piesele, foile, operațiile, sculele folosite și resursele (fonturi, imagini, STL), într-un singur arbore, cu versiune. |
| 2 | **nod** | Un element al arborelui; fiecare nod are o matrice de plasare (mutare, rotire, scalare, înclinare). |
| 3 | **element** | Un nod care desenează ceva: contur, formă parametrică (cerc, elipsă, dreptunghi rotunjit, poligon, text), relief, model 3D sau cotă. |
| 4 | **contur** | Un lanț de segmente: linie, arc de cerc sau cubică Bézier, cu „închis” scris o singură dată. |
| 5 | **grup** | Un nod care ține alte noduri; grupurile se pot pune unul în altul. |
| 6 | **ramă** | Un grup cu contur propriu și inele paralele la distanță fixă; conținutul ei nu-și schimbă niciodată singur mărimea. |
| 7 | **piesă** | Un obiect fizic de tăiat (o ușiță, o plăcuță), cu arborele lui și operațiile lui, definit o dată. |
| 8 | **foaie** | O placă reală de material, cu dimensiuni, grosime, fibră și două fețe; pe ea se așază piese. |
| 9 | **instanță** | O piesă așezată pe o foaie: poziție, rotire și câmpuri proprii (de exemplu un nume din CSV). Trimite la piesă, nu copiază desenul. |
| 10 | **față** | Partea de sus sau de jos a foii; prelucrarea pe spate se face după întoarcere. |
| 11 | **operație** | Un pas de prelucrare (profil, buzunar, V-carve…) care referă noduri și poartă scula și parametrii. |
| 12 | **montaj** | Ce vede mașina la un job: foaia, fața, originea de lucru și profilul mașinii. Transformarea document → mașină e o singură matrice. |
| 13 | **sculă** (freză) | Silueta reală h(r) a tăișului, cu diametre și lungimi; operația ține un instantaneu al ei. |
| 14 | **material** | Esența și proprietățile ei (densitate, avansuri), cu sursa fiecărei cifre. |
| 15 | **regiunea păstrată** | Materialul care trebuie să rămână; intrările, urechile și verificările o citesc. |
| 16 | **IR-ul traseului** | Reprezentarea intermediară: mișcări tipizate (linie, arc, elice) cu Z la ambele capete, scula, operația și eticheta. Toți o citesc; nimeni nu reparsează G-code. |
| 17 | **post** | Singurul cod care transformă IR-ul în text G-code pentru un controler. |
| 18 | **contract de dialect** | Regulile unui controler, scrise ca date, fiecare cu sursa și cu starea „documentat” sau „probat în atelier”. |
| 19 | **program** | Octeții G-code scriși de post, cu amprenta SHA-256; senderul trimite exact acești octeți. |
| 20 | **profilul mașinii** | Ce știm despre o mașină: controlerul, cursele, turațiile, Z-ul sigur, strategia de schimbare a sculei. |
| 21 | **câmp de înălțimi** | O grilă cu o cotă Z pe celulă; îl folosesc simularea, relieful și prelucrarea 3D. |
| 22 | **oracol** | Cod scris separat, fără niciun import din aplicație, care știe răspunsul corect și judecă aplicația. |
| 23 | **invariantă** | O regulă care trebuie să țină pe orice program: niciodată mai adânc decât pasul pe trecere, nimic tăiat din regiunea păstrată, nicio scobitură în model. |
| 24 | **placă de probă** | Piesa tăiată de owner la sfârșitul etapei, cu 5–10 cote date dinainte cu valoarea pe hârtie; e aprobarea etapei. |
| 25 | **placă de regresie** | O placă fixă, cu trăsăturile canonice ale etapelor trecute, retăiată când nu există funcții noi de mașină. |
| 26 | **felie** | O schimbare mică, cu commit, care se termină cu ceva de încercat, cu dovada scrisă înaintea funcției. |
| 27 | **etapă** | O săptămână de felii, cu ținta scrisă în plan și cu placa la sfârșit. |
| 28 | **capabilitate** | Dreptul de a folosi o funcție. Fiecare acțiune îl cere; dreptul de acces al contului se calculează doar pe server. |

---

## 3. Arhitectura

### 3.1 Principiile

1. **Un singur drum pentru tot ce mișcă mașina.** Nicio a doua cale pentru același lucru (în ediția întâi erau 5
   emitenți de G-code [citit, `LECTII.md` §1]).
2. **Un fapt, o autoritate.** Fiecare fapt are un singur modul-proprietar. Regulile de import, verificate în CI, fac
   ocolul imposibil (clasa 1 din `LECTII.md` §2.2).
3. **Dovada înaintea funcției.** Oracolul unui subsistem intră înaintea primei lui funcții și se refolosește. O funcție
   nouă adaugă doar rânduri în corpus, valori pe hârtie și un control negativ.
4. **Determinismul e poartă.** Același cod dă aceleași celule de simulare și aceiași octeți de G-code în Node (teste) și
   în browser (ecran) [măsurat, s4 §4.5].
5. **O tehnologie intră doar când o măsurătoare o cere.** Ce nu e cerut rămâne afară, cu condiția de revenire scrisă
   (§3.6).
6. **Infrastructura vine când o cere produsul.** Excepția e ce costă puțin doar dacă e pus din prima zi: build
   determinist, configul citit de la gazdă, schema cu versiune, `.gitattributes`, `t()` cu paritate, ErrorBoundary.

### 3.2 Harta modulelor

**Un singur depozit și un singur build:** aplicația e un singur pachet npm, cu dosare în `src/`. Funcțiile Firebase au
al doilea `package.json`, fiindcă așa cere Firebase. Fără workspaces și fără proiecte TypeScript legate.

| Dosar | Ce deține (singura autoritate) | Unde rulează |
|---|---|---|
| `src/geom/` | geometria exactă: contururi L/A/C, forme parametrice, transformări, offset (cavalier), boolean (PathKit + R3), biarce, distanța exactă, regula de umplere, normalizarea și vindecarea regiunii, testul de clic | bazin (operațiile), fir principal (clicul) |
| `src/model/` | documentul: schema (valibot), versiunea, migrările, arborele, comenzile și jurnalul lor (undo), `rev` | fir principal |
| `src/text/` | fonturile, așezarea literelor, înălțimea majusculei, normalizarea glifelor | bazin |
| `src/relief/` | straturile de relief pe dale, operațiile pe relief, editorul de forme, sculptura | fir principal (pensula), bazin |
| `src/ir/` | tipurile IR-ului și verificatorul de invariante (funcție pură) | oriunde |
| `src/cam/` | operațiile → IR (2D, 2.5D, V-carve, incrustații, decorative, laser, 3D), sculele, materialele | bazin |
| `src/post/` | postul unic, contractele de dialect, formatorul de numere | bazin sau fir principal |
| `src/sim/` | nucleul de simulare (câmp pe dale), estimarea timpului | bazin |
| `src/io/` | ușile de import și de export, fișierul `.cncvs` | bazin (SVG se parsează inert pe firul principal) |
| `src/machine/` | senderul: sesiunea Web Serial, fluxul, procedurile ca mașini de stare | fir principal (worker, dacă proba o cere) |
| `src/jobs/` | bazinul de workere: joburi, anulare, progres, bazinul de bufere | fir principal + workere |
| `src/canvas/` | cele trei straturi ale pânzei: WebGL2, vectorii (worker de randare), interacțiunea | fir principal + worker de randare |
| `src/ui/` | componentele React, uneltele ca mașini de stare pure, **registrul de acțiuni**, `t()` en/ro, câmpul numeric unic | fir principal |
| `src/cloud/` | contul, citirea dreptului de acces, raportarea erorilor, tichetele, copiile în cloud | fir principal |
| `src/admin/` | adminul, câte un dosar pe filă, încărcat doar pe ruta `/admin` | fir principal |
| `src/app/` | pornirea, PWA-ul, ErrorBoundary, legarea modulelor | fir principal |
| `shared/` | catalogul unic: capabilități, niveluri, lista albă de prețuri, coduri de eroare (client + server) | ambele |
| `functions/src/` | serverul pe domenii: erori, diagnoză, drept de acces, probă, facturare, admin, publicare, backup | Cloud Functions |
| `test/oracles/` | oracolele: **zero importuri din `src/`** | Node (CI) |
| `test/oracles-py/` | cititorii independenți pentru import / export: ezdxf, PyMuPDF, fontTools | Python (doar CI) |
| `test/placi/` | plăcile de probă: programul de aur (octeți + hash), cotele măsurate, transcrierile | Node (CI) |

**Registrul de acțiuni** e singura ușă a interfeței spre domeniu. Fiecare acțiune are id, etichetă (cheie `t()`),
`activă → motiv`, capabilitatea cerută și `run`. Barele, meniurile, tastatura, asistentul pentru începători și analiza
din admin sunt doar vederi ale aceluiași registru [citit, `LECTII.md` §4.7].

**Modelul documentului (ipoteza D):**
- `Doc { schema, rev, piese[], foi[], montaje[], scule[] (instantanee), resurse{sha → meta} }`;
- `Piesă { nume, rădăcină: Nod }`, unde `Nod = Grup | Ramă | Element`;
- `Foaie { stoc, fețe{sus, jos}, instanțe[] }`;
- `Instanță { piesă, x, y, rotire, câmpuri{} }`;
- `Operație { tip, noduri[], sculă (instantaneu + hash), parametri }`.

Câmpurile necunoscute se păstrează. Migrările sunt funcții pure vN → vN+1, cu corpus de aur. Dacă alegi A, se schimbă
doar forma `foi[]` (§5.6).

### 3.3 Regulile de import

Le verifică `dependency-cruiser` în nivelul rapid al CI. Un fișier-capcană din `test/` încalcă intenționat o regulă,
iar testul cere ca regula s-o raporteze: altfel plasa poate fi vidă.

- `geom`, `shared` și i18n nu importă nimic din `src/`.
- `model` importă `geom`. `text`, `relief`, `io` importă `geom` și tipurile din `model`.
- `cam` importă `geom`, `model` (citire), `ir`, `relief`, `text`. **Nu importă** `post`, `sim`, `machine` și nimic din
  interfață.
- **`post` importă doar `ir`** și contractele lui: postul nu știe de document și nu face geometrie.
- `sim` importă doar `ir` și tipurile sculelor.
- `machine` primește programul ca date (octeți + manifest); nu importă `post` și nici documentul.
- `ui`, `canvas`, `admin` ajung la domeniu doar prin registrul de acțiuni și prin protocolul workerelor.
- `test/oracles/**` nu importă nimic din `src/**`. `functions/` importă doar `shared/`.
- Fără cicluri. **Niciun test nu citește textul surselor**: în ediția întâi, plasele pe sursă au mințit (84 din 326 de
  suite) [citit, `LECTII.md` §2.2].

### 3.4 Fluxurile de date

**Drumul care mișcă mașina:**

```
Acțiune ──► jurnalul de comenzi ──► document (rev nou)
Document ──(„Generează”, în bazin, anulabil)──► cam(operație) ──► IR pe piesă
          (cache după hash-ul intrărilor; IR-ul e în coordonatele documentului)
IR al piesei × matricea instanței (rigidă, exactă) ──► IR al foii, în ordinea operațiilor
      ├──► sim (ecranul: materialul îndepărtat; același nucleu ca testele)
      ├──► estimarea timpului + rezumatul jobului + fișa de lucru
      └──► post(IR, contract, profilul mașinii, matricea montajului) ──► program (octeți + SHA-256 + manifest)
                                                                       ├──► exportul fișierului
                                                                       └──► senderul (trimite exact octeții)
Testele: oracolul citește octeții programului (textul G-code), nu IR-ul. Poarta invariantelor judecă orice program.
```

- **Postul e singurul care aplică matricea montajului** și singurul care scrie coordonate de mașină. Oglindirea pentru
  fața de jos stă tot în matrice, iar postul inversează G2 ↔ G3 când matricea oglindește [dedus, din propunerea
  „corectitudine” §3.4].
- **Arcele rămân arce până în post.** Un controler fără arce primește arcele aplatizate de post, nu de nucleu
  [citit, s1 §5.7].
- **Schimbarea sculei, pornirea axului și pauza sunt evenimente în IR,** iar contractul le traduce [citit, s8 §5.4].

**Pânza:** documentul trăiește pe firul principal. Workerul de randare și indexul de clic primesc doar comenzile, nu
documentul: o copie de 50 000 de noduri costă ~0,6 s [măsurat, s7 §4.6].

```
Strat WebGL2:            foaia, traseele (LINE_STRIP implicit), câmpul simulării (dale urcate la schimbare)
Strat de vectori:        worker de randare, Path2D pe găleți spațiale, OffscreenCanvas SOFTWARE ──► ImageBitmap
Strat de interacțiune:   mânere, selecție, previzualizarea uneltei (Canvas2D accelerat, mic)
```

**Relieful:** straturi Float32 pe dale de 256 × 256, rare; o dală lipsă înseamnă o constantă.
- Operațiile rulează în bazin, pe benzi transferate. Pensula rulează pe firul principal, pe dalele atinse (0,3–2,6 ms pe
  aplicare [măsurat, s5 §4.6]).
- Salvarea și undo-ul folosesc Uint16 cu scară pe dală, cu eroarea de 0,15–0,46 µm [măsurat, s5 §2].
- Relieful făcut din vectori rămâne o rețetă derivată: vectorul nu se pierde.

**Persistența:**
- **o singură bază IndexedDB:** documentul, pointerul „versiunea curentă”, jurnalul și resursele după SHA-256, ca
  `Blob`, în tranzacții. 100 MiB se scriu în 218 ms și se citesc în 84 ms, intacți la cădere [măsurat, s7 §4.3–4.4];
- **fișierul `.cncvs`:** un zip determinist (manifest + JSON canonic + resurse), identic octet cu octet în orice fus
  orar [măsurat, s7 §4.5];
- **un singur scriitor**, cu Web Locks între file;
- cerem `persist()`; dacă browserul nu o acordă, plasa e fișierul exportat (și copia în cloud, dacă o vrei, §8).

**Cloud-ul:**
- **proiectele:** `cncvectorstudio` (live) și `cncvectorstudio-test`, refolosite;
- **regiunile, într-un tabel unic din cod:** baza în `nam5`, callable-urile și joburile în `europe-central2`,
  declanșatoarele Firestore în `us-central1`;
- **App Check impus peste tot.** Pe test există un token de debug, înregistrat doar acolo [citit, `admin` §5.3];
- **rolul de personal** stă doar în `staff/{uid}`. Citirile de admin trec prin reguli, iar scrierile numai prin
  callable-uri, cu auditul în aceeași tranzacție;
- **dreptul de acces** se calculează doar pe server, în `entitlements/{uid}`, cu o perioadă de grație offline;
- **observabilitatea din prima zi:** un singur jurnal de erori scris doar de server (`errorLogs`), Diagnoza, marcaj de
  rulare pe fiecare job și declanșator, backup zilnic cu alarmă;
- **publicarea pe live:** workflow GitHub cu sha fixat, mediul `live` cu aprobarea ta și WIF (fără chei descărcate);
- **plata:** extensia Stripe, cu lista albă de prețuri și de argumente impusă în reguli.

### 3.5 Deciziile tehnice

Fiecare decizie are dovada ei și condiția în care se redeschide. Când o verificare a contrazis sonda, a câștigat
verificarea.

| # | Decizia | Dovada | Se redeschide dacă |
|---:|---|---|---|
| T1 | **Conturul are trei primitive: linie, arc de cerc, cubică.** Nodurile poartă `bulge` = tan(baleiaj/4). Pătraticele (fonturi, SVG `Q`) se ridică exact la cubice la import | cercul decalat rămâne 2 arce; rotirea păstrează colțurile rotunde (3,6·10⁻¹⁴ mm) [măsurat, s1 §4] | — |
| T2 | **Elipsa e un cerc sub o matrice neuniformă** (exactă). Se exportă ELLIPSE în DXF. Doar un arc eliptic aflat în mijlocul unei căi SVG devine cubice la 0,001 mm, iar numărul lor se raportează | 8 cubice pe elipsă până la r = 50 mm, 16 până la r = 1 220 [măsurat, s1 §4.6]; o primitivă în plus înmulțește cazurile din fiecare operație | — |
| T3 | **Regula de umplere: `evenodd`, una pentru ecran, clic, sculă și export.** Fonturile și SVG-urile `nonzero` se normalizează o dată, la intrare (reuniune PathKit + R3) | gaura orientată ca exteriorul: 757 din 4 000 de puncte diferă cu `nonzero`; ecranul = nucleul = `isPointInPath` [măsurat, s6 §4.6]; Roboto v3 are contururi suprapuse pe 41 din 65 de caractere [măsurat, s3 §4] | proba de normalizare din etapa 7 pică |
| T4 | **Booleanul: PathKit 1.0** (Skia PathOps, BSD-3), adus în repo, înghețat, în spatele fațadei `boolean(a, b, op)`. **Re-ancorarea R3 se face după fiecare operație** | o operație: ≤ 1,3·10⁻⁴ mm la 2 440 mm; 100 de operații fără R3: 5,1·10⁻⁴ mm și centre de arc greșite cu 0,57 mm; cu R3: 3,3·10⁻¹³ mm [măsurat, s1-V §4.6] | un defect PathKit fără ocol → PathOps din CanvasKit (întreținut, 3,3 MB), fără alt cod |
| T5 | **Offsetul: cavalier_contours**, portul TypeScript adus în repo, cu reparațiile din Rust 0.8 / 0.9 portate, cu testul „paralele” reparat (unghi normalizat) și cu gărzi: curățarea intrării, validarea structurală a ieșirii, rezoluția declarată de 0,01 mm. **Fără toolchain Rust.** | exact pe litere și forme CAD (32/32 buzunare, abaterea = toleranța biarcelor); pe polilinii dense cade în 47/240 [măsurat, s1-V] | criteriul din etapa 9 pică (pe suita densă: eșecurile explicite peste 1 % sau orice eșec tăcut) → **întrebare pentru tine**: Rust 0.9 compilat în WASM |
| T6 | **Biarcele proprii sunt singura ușă de aproximare** (cubică → arce sub toleranță). Bugetul de toleranță e pe etape și se probează pe rezultat | abaterea reală e 1,005 × toleranța [măsurat, s1-V §4.5] | — |
| T7 | **V-carve:** axa medială din Voronoi pe eșantioane (delaunator), cu legalizare pe stivă care aruncă eroare dacă nu converge, pas adaptiv (h ≤ 0,02 mm pe trăsături fine), raza recalculată exact, vindecarea intrării cu toleranță declarată (0,005 mm, raportată) și adâncimea de start la incrustații. Normalizarea regiunii folosește PathKit + R3, **fără Clipper** | plăcuța de 6 mm: 8 222 de linii față de 161 842 în ediția întâi; la h = 0,05 iese peste buget (0,0163 mm), la h = 0,02 în buget; legalizarea pe stivă durează 0,08 s, cea pe treceri 16–19 s, cu ieșire tăcută [măsurat, s3, s3-V] | corpusul cu muchii aproape comune pică → Clipper închis doar în pregătirea V-carve-ului |
| T8 | **Un singur IR al traseului, în coordonatele documentului.** Postul aplică matricea montajului | ediția întâi: originea din dreapta oglindea tot programul, 104 zile [citit, `LECTII.md` §2.1] | — |
| T9 | **Un singur post, condus de contracte de dialect ca date**, cu sursa și starea pe fiecare câmp:<br>- 3 zecimale în mm și 5 în inch, cu punctul zecimal scris mereu;<br>- I/J din startul rotunjit;<br>- garda de coardă ≥ 10 rezoluții și unghi ≥ 10⁻⁴ rad;<br>- plafonul de 70 de octeți pe linie;<br>- 4 strategii de schimbare a sculei;<br>- antetul setează tot ce folosește programul;<br>- WCS-ul e scris explicit;<br>- ciclurile de găurire sunt desfăcute în G0/G1 | 200 000 de arce: 0 erori la regula GRBL [măsurat, s8 §4.2]; 6 diferențe între controlere strică piesa [citit, s8 §2] | rezultatele din ateliere |
| T10 | **Simularea:** nucleu TypeScript pe CPU, câmp rar pe dale mici, dalele uniforme ca un singur număr, calcul exact pe celulă, rânduri de dale intercalate pe bazin. Rezoluția implicită e 0,25 mm, cu 0,1 mm pe o fereastră. **Amprenta Node = browser e poartă în CI** | 0 celule greșite pe 16 piese pe hârtie; identic bit cu bit în Node și Edge, la 1–16 fire [măsurat, s4] | — |
| T11 | **Fără calcul pe GPU în v1.** Placa video doar desenează | finisarea 2,67 M de puncte în 2,2 s pe 16 workere [măsurat, s5]; GPU ≠ CPU cu până la 0,18 µm, iar CI-ul n-are GPU [măsurat, s4] | un job obișnuit durează > 10 s pe calculatorul tău (măsurat) → v1.x, ca accelerator al acelorași nuclee, cu probă față de CPU |
| T12 | **CAM 3D doar pe câmpul conservativ** (maximul modelului pe celulă) + distanța la segment. Eșantionarea în nod e doar pentru ecran. Drop-cutter-ul exact pe triunghiuri e oracolul | eșantionarea în nod sapă până la 5 mm; câmpul conservativ: 0 scobituri [măsurat, s5 §4.1, §4.3] | — |
| T13 | **Pânza:**<br>- vectorii exacți se rasterizează într-un worker, pe pânză software, și se predau ca ImageBitmap;<br>- traseele merg ca LINE_STRIP implicit, iar segmentele instanțiate doar sub un buget măsurat la pornire;<br>- linia vectorului are 1 pixel fizic;<br>- zoom maxim 1000 px/mm | clicul se vede în 24 ms în timpul redesenului, pe RTX și pe iGPU; pe firul principal, 456–552 ms [măsurat, s6-V §4.4]; 5 M de segmente ca LINE_STRIP țin 60 Hz pe iGPU [măsurat, s6-V §4.2] | pe un laptop real de atelier, imaginea exactă la 50 k forme trece de ~1 s, sau respingi imaginea neclară din timpul gestului → planul B (vectori pe WebGL) |
| T14 | **Fără izolare cross-origin.** Datele spre workere se transferă. Nucleele se scriu peste o bandă cu decalaj `(buffer, rândul de start, rânduri)`, iar halo-ul e calculat din nucleu și testat la margine | COOP + COEP strică login-ul Google (popup și redirect); transferul costă × 1,10–1,23 la blur și × 0,97 la finisare [măsurat, s11] | o bibliotecă cu fire o cere → doar Document-Isolation-Policy, niciodată COOP + COEP |
| T15 | **Workerele nu țin date între joburi** (bazin fără stare + worker de randare) | același cost măsurat ca la variantele cu stare [măsurat, s11 §4.1–4.2] | memoria temporară (+64 MB pe operație la 4000²) devine problemă pe un laptop de 8 GB, sau re-simularea se simte (+60–190 ms) → relieful și simularea primesc worker-proprietar |
| T16 | **Datele:** valibot (o declarație → tip + validator cu limite, necunoscutele păstrate, fără `eval`), JSON canonic, migrări pure, undo ca jurnal de comenzi cu valorile vechi și noi | 10/10 defecte la calea exactă, 318 ms sub CSP strict, 3,3 KB gzip; o comandă de undo = ~190 B, față de 96 MB pentru o copie completă [măsurat, s7] | — |
| T17 | **PWA:** Vite + vite-plugin-pwa, cu actualizarea oferită și blocată cât rulează un job; CSP fără `unsafe-eval`, probat pe build-ul servit | 9/9 pași offline, martorul pică [măsurat, s7 §4.7] | — |
| T18 | **Importul și exportul:** câte o ușă pe format, toate spre același model.<br>- **Export DXF R2007 „exact”:** CIRCLE, ARC, ELLIPSE, LWPOLYLINE cu bulge, SPLINE, straturile = rolurile;<br>- **SVG** în mm;<br>- **PDF** cu straturi;<br>- scriitorul **R12** e gata (~80 de linii) și intră doar dacă un program de-al tău nu deschide R2007 | export 108/108 și import 65/65, recitite de programe independente [măsurat, s2] | pachetul tău de probă (§8) |
| T19 | **Textul:** „înălțimea textului” = înălțimea majusculei, verificată pe conturul lui H; glifele se normalizează; GSUB are rezervă literă cu literă | „20 mm” = 20,000000 mm pe litera N [măsurat, s2] | — |
| T20 | **Senderul:**<br>- sesiune Web Serial cu tranzacții, flux cu numărarea caracterelor;<br>- trimite exact octeții exportați, cu hash;<br>- bariera M6;<br>- procedurile sunt mașini de stare pure;<br>- emulatorul GRBL și transcrierile sunt fixturi;<br>- coordonatele au tipurile Known / Unknown | ediția întâi: linia ≥ 128 de caractere bloca fluxul; reluarea avea drept oracol propria funcție [citit, `LECTII.md` §1] | proba din etapa 3: dacă planificatorul GRBL rămâne gol sub încărcare, senderul se mută într-un worker |
| T21 | **Stack-ul:** TypeScript 7 strict; React 19, subțire peste acțiuni; fără bibliotecă de stare, de rutare sau de CSS; `node --test` (Vitest doar dacă fricțiunea e măsurată); Playwright pe Edge, pe `dist/`; Python doar în CI | toate sondele au rulat cu `node` simplu; Chromium-ul Playwright nu pornește pe mașina asta, Edge da [măsurat] | — |

### 3.6 Ce nu intră în v1 (tehnic), și ce l-ar aduce înapoi

| Ce nu intră | De ce e sigur | Ce l-ar aduce înapoi |
|---|---|---|
| calculul pe GPU (WebGPU compute) | T11 | T11 |
| SharedArrayBuffer, izolarea cross-origin | T14 | T14 |
| OPFS și workerul de persistență | IndexedDB ajunge, iar `move()` din OPFS e neprobat la cădere [s7 §6] | resurse > ~500 MB sau o salvare > 1 s, măsurate pe fișierele tale |
| WASM compilat de noi (Rust, emsdk, AssemblyScript) | WASM a adus 1,00–1,08× pe cod identic [măsurat, s4 + re-măsurare] | T5 |
| Clipper în produs | T7 | T7 |
| PixiJS, CanvasKit, Three.js pentru desen | PixiJS greșea cercul cu 29 px la 1000 px/mm [măsurat, s6] | — |
| a doua presetare DXF (R12) | T18 | T18 |
| arcul eliptic ca al patrulea tip de segment | T2 | — |
| ciclurile fixe G81/G83 | găurirea desfăcută e identică pe toate controlerele [s8] | v1.x |
| instanțele exportate ca BLOCK / INSERT | exportul desfăcut e exact | vrei piesa editabilă ca bloc în AutoCAD |
| martori GPL în CI (voron8), flo-mat ca nucleu | oracolul cu distanța exactă și controalele negative ajung [s3-V] | două oracole nu cad de acord pe un caz real |

---

## 4. Dovada

### 4.1 Oracolele, pe subsistem

Toate stau în `test/oracles/`, cu **zero importuri din `src/`**. Fiecare intră în CI înaintea funcției pe care o judecă
și are un control negativ care trebuie să pice. Majoritatea vin din sonde, unde au prins defecte reale.

| Subsistemul | Oracolul | Controlul negativ |
|---|---|---|
| geometria | distanța exactă la L / A / pătratică / cubică, Hausdorff în ambele sensuri, numărul de înfășurare, **oracolul de structură** (număr de contururi, fără laturi comune) [s1, s1-V] | offset × 1,01; inel șters; reuniune care pierde găurile |
| postul și G-code-ul | cititorul G-code (G0–G3, I/J sau R, G90/G91, G20/G21) + regula de arc GRBL rescrisă + valorile pe hârtie pentru cele 4 colțuri de origine [s4, s8] | 2 zecimale în mm; o mutație care taie „.000” |
| simularea | grila densă Float64, eșantionare la cell/8; „nucleul nu e niciodată mai sus cu peste 10 nm” [s4] | cele 7 otrăvuri din s4 |
| V-carve și incrustația | suprafața ideală din distanța exactă + înfășurătoarea conului, cu capetele graniței testate; jocul pe linia de lipire [s3, s3-V] | raza luată de la algoritm; fără legalizare; deplasare de 0,02 mm |
| relieful și 3D-ul | CL analitic (plan, sferă, cilindru); drop-cutter exact pe triunghiuri; creasta; volumul [s5] | eșantion în nod; fără testul pe muchii sau pe fețe; halo cu un rând mai mic |
| importul și exportul | ezdxf, PyMuPDF, fontTools (doar CI); Ghostscript-WASM doar în test, dacă intră EPS [s2, s12] | raza × 1,0001; „20 mm = em”; totul pe stratul „0” |
| pânza | marginea cercului față de cercul analitic; clicul față de distanțe analitice; aceeași regulă pe ecran, nucleu și `isPointInPath`; Event Timing [s6, s6-V] | martorul PixiJS (prezis 29,149 px); martorii `idle` / `busy` |
| datele | 10 defecte injectate cu calea așteptată; zip-ul citit în Python; procesul omorât la mijlocul salvării; PWA fără rețea [s7] | suprascrierea pe loc; service worker blocat |
| cloud și admin | matricea pe emulator pentru logică; perechi permis / refuzat cu tokenuri reale pe instanța de test (emulatorul nu e banc de securitate) [admin §4.2] | fiecare test sabotat o dată |
| planșele | valorile pe hârtie ale așezării și ale feței de jos [prototip] | sabotajele M1–M6 |
| mașina, fizic | placa de probă, cu șublerul tău | — |

### 4.2 Poarta invariantelor

O funcție pură (din `src/ir/`, cu oracolele ca judecători) rulează pe **fiecare program generat de orice test**, nu doar
pe cele scrise pentru ea:
1. **pasul:** nicio trecere nu scoate mai mult decât pasul pe adâncime;
2. **piesa:** nimic tăiat din regiunea păstrată, calculată de oracol din geometria de intrare;
3. **rapidele:** niciun G0 prin material;
4. **3D:** nicio scobitură față de modelul exact; creasta măsurată ≤ cea cerută;
5. **limitele:** programul încape în cursele mașinii și în grosimea foii;
6. **controlerul:** fiecare linie e acceptată de contract (coduri, ≤ 70 de octeți, punctul zecimal, arcul valid după
   rotunjire);
7. **scula și axul:** nicio tăiere cu axul oprit sau înaintea pauzei de pornire;
8. **cadrul:** coordonatele programului = document × matricea montajului, verificat pe hârtie pe cele 4 colțuri.

O metrică nouă intră în poartă abia după ce o otravă o înroșește [citit, s4 §5.12].

### 4.3 Otrăvurile

- Un dosar `test/poisons/` are câte un patch mic pe modulele critice: formatorul de numere, matricea originii, urechile
  Z(s), intrările față de regiunea păstrată, raza din V-carve, nucleele simulării, drop-cutter-ul, adâncimea de start,
  dreptul de acces.
- Un script aplică fiecare patch, verifică pe hash că s-a aplicat (altfel „VOID”), rulează toate suitele, restaurează
  și verifică arborele față de `HEAD`.
- **Otrăvurile le alege altcineva decât autorul feliei:** o sesiune separată, o dată pe câteva etape, cu acordul tău și
  cu costul spus înainte. În ediția întâi, cele alese de autor au fost prinse 281 din 281, iar dintre cele alese
  independent au supraviețuit 27 din 54 [citit, `LECTII.md` §0].

### 4.4 CI pe niveluri

GitHub Actions, repo public, minute nelimitate. Commit-urile care ating doar `.md` nu pornesc CI-ul.

| Nivelul | Când | Ce rulează | Bugetul |
|---|---|---|---|
| rapid | la fiecare push | `tsc`, regulile de import, paritatea en/ro, unitățile, subseturile oracolelor, poarta invariantelor pe corpusul mic, build-ul, mărimea pachetului, lista albă de licențe | ≤ 5 min |
| complet | înaintea fiecărui deploy pe test | corpusurile complete, cititorii Python, e2e pe `dist/` în Edge (PWA offline, CSP real, amprenta Node = browser, calea de randare), regulile pe emulator | ≤ 15 min |
| noapte | cron | otrăvurile, cazurile mari (polilinii dense, firma de 1 200 × 400, 5 M de mișcări, relief 4000²), bugetele de performanță cu martori, perechile pe instanța de test | ≤ 60–90 min |

- **Un CI roșu pe `main` e incidentul numărul unu.** Peste un roșu nu se publică nimic. În ediția întâi, CI-ul a stat
  mort 16 zile.
- O dependență de rulare GPL / AGPL face CI-ul roșu. Exemplu de capcană: `dwg2dxf` declară ISC, dar e GPL [s12].

### 4.5 Bancul vizual

- **Ce e:** Playwright deschide `dist/` pe documentele de referință și scrie o pagină cu **poza și cifra ei, una lângă
  alta**.
- **Martorii:** fiecare poză are un martor negativ care trebuie să arate greșit. În ediția întâi, bancul a raportat verde
  pe 3 sabotaje.
- **Unde îl vezi:** pagina se publică pe instanța de test și o deschizi la sfârșitul etapei.

### 4.6 Placa de probă devine test

1. **Înainte de tăiere:** fișa plăcii are fiecare cotă cu valoarea pe hârtie și toleranța. Programul (octeți + hash)
   intră în `test/placi/Snn/`.
2. **La mașină:** senderul salvează transcrierea.
3. **După tăiere:** treci cotele într-un formular din aplicație sau în chat.
4. **Ce devine test:**
   - documentul plăcii regenerează aceiași octeți;
   - oracolul prezice fiecare cotă;
   - transcrierea se rejoacă pe emulator;
   - o cotă în afara toleranței deschide un defect de gravitate „mașină”, care trece înaintea oricărei felii noi.
5. **Calibrarea pe lemn** se face o singură dată, la placa 4, cu șanțurile de calibrare. Constantele se folosesc doar la
   compararea plăcilor, niciodată în oracol.
6. **În etapele fără funcții noi de mașină** se retaie placa de regresie.

**Toleranța de pornire** (o confirmi sau o schimbi, §8): ±0,2 mm în plan, ±0,1 mm pe adâncime.

### 4.7 Costul dovezii, ținut în frâu

În ediția întâi, dovada făcută după fapt a ajuns să coste cât produsul.
- **Ce măsor săptămânal, din git:**
  - liniile de test la o linie de produs (semnal la peste ~2,5);
  - durata nivelului rapid (≤ 5 min);
  - rândurile de DEVLOG pe felie (≤ 15);
  - commit-urile doar de documentație.
- Peste prag urmează o retrospectivă scurtă la sfârșitul etapei.
- **Fără recenzii adversariale pe fiecare felie și fără audituri „pentru siguranță”.** Independența vine din oracole, din
  otrăvurile alese de altcineva și din plăci.

---

## 5. Planul pe etape

### 5.1 Regulile

- **O etapă = ~o săptămână, ~8–9 felii**, cu placa la sfârșit. Capacitatea măsurată e ~10,75 felii pe săptămână la P50
  (`estimare.md` §6.2). Planul lasă ~1 felie de rezervă pe etapă și o săptămână-tampon la fiecare ~10 etape.
- **Feliile le aleg eu din etapă.** La începutul fiecărei etape scriu `docs/etape/etapa-NN.md`, cu feliile, fișa plăcii
  (cotele cu valorile pe hârtie) și ce rânduri închide. Punctul de plecare e detaliul din
  `docs/faza2/arhitectura/propunere-simplitate.md` §5.2, cu modificările de la §5.4.
- **Prima felie a fiecărei etape** trece transcrierea plăcii precedente în teste.
- **Pe live** se publică din etapa 3, la sfârșitul fiecărei etape, după placă și cu confirmarea ta. O placă picată
  ține etapa pe test.
- **O felie care trece de 1,5 × estimarea ei → mă opresc și te întreb.** Până la prima măsurătoare, o felie standard are
  un buget de ~0,4 zile active.
- **Recalibrarea:** după etapa 2, apoi la fiecare etapă (formula din `estimare.md` §8). Dacă P50 se mută cu peste 20 %,
  primești noua estimare și pârghiile.
- **DEVLOG scurt:** `Started` / `Completed`, clasa (R1 / R2 / R3), estimarea în felii, trecerile, placa. Deciziile intră
  în ADR-uri de o pagină (`docs/adr/`).

### 5.2 Pasul 0 (~3 zile, fără cod de produs)

1. Aprobarea planului (acesta).
2. `docs/PORTARE.md`: ce din codul vechi se integrează, cu verdictul pe fiecare candidat, față de arhitectura de aici
   (decizia ta din 06.10). Decizi tu pe el.
3. Lotul 1 de decizii (§8).
4. Actualizarea `CLAUDE.md` și scrierea primelor ADR-uri, din tabelul de la §3.5.

### 5.3 Etapele

„Live” = publicare pe live la sfârșitul etapei, după placă și cu confirmarea ta. Numerotarea săptămânilor pornește de la
prima etapă.

| Săpt. | Etapa | Ținta | Închide (rânduri de prag, funcții, admin) | Placa probează | Live |
|---:|---|---|---|---|---|
| 1 | 1 | **Un schelet care taie:** dreptunghi și cerc → G-code corect cu originea în oricare colț | — (pornește profilul) | matricea originii, sensul arcelor, oracolul G-code | nu |
| 2 | 2 | **Profilul complet pe geometrie exactă**, plus importul SVG | Profil cu urechi, intrări, sens; dog-bone / T-bone | regiunea păstrată, urechile, intrările | nu |
| 3 | 3 | **Senderul, postul cu contracte, observabilitatea**, prima publicare | admin **P0** + **P1** | fișierele T0–T7 pe GRBL, prin senderul nou | **da (prima)** |
| 4 | 4 | **Simularea și verificarea;** calibrarea pe lemn; contractele celorlalte controlere | Simulare 3D (3 axe); Animația traseului; Timpul estimat; Calcul pe mai multe fire | șanțurile de calibrare (plată, bilă, V90, V60, arc) | da; **pachetul pleacă la ateliere** |
| 5 | 5 | Buzunar, găurire, ordinea, frezele | Buzunar cu mai multe freze; Găurire; Ordinea + un fișier pe sculă; §10 Găurire în pași | buzunar + rest, insulă, găuri în pași, elice | da |
| 6 | 6 | **Editorul de vectori** | Vectori, noduri, boolean, offset, aliniere; Transformare și copiere | dreptunghi rotunjit rotit, reuniunea a două cercuri, rețele | da |
| 7 | 7 | Textul și gravarea pe linie | Text, text pe cale, fonturi | „20 mm” = 20,00 mm; diacritice; text pe arc | da |
| 8 | 8 | **V-carve** și gravarea inteligentă | V-carve (+ fund plat); Gravare pe linie + smart engrave | crestele pe hârtie (12 × 6, cerc, triunghi), fundul plat | da |
| 9 | 9 | **Importul și exportul cu vectori reali** | Export 2D cu vectori reali (import: DXF, PDF, AI compatibil PDF) | DXF-urile de referință independente + fișierele tale deschise în programele tale | da; runda 2 la ateliere |
| 10 | 10 | Repararea, conversia, cotele, transformarea traseelor | Verificarea și repararea vectorilor; Cote; Tăierea și conversia; Transformarea traseelor | curba în arce, decuparea, traseul oglindit și rotit | da |
| 11 | T1 | **Tampon:** coada de defecte, recalibrarea, placa de regresie | — | placa de regresie | da |
| 12 | 11 | **Planșele:** piese, foi, instanțe, Multi-Plate, lista de tăiere | Sheets + Multi-Plate; §10 Listă de tăiere | așezarea pe rânduri și vărsarea pe foaia 2; plăcuțele din CSV | da |
| 13 | 12 | Incrustațiile | Inlay în V și cu pereți drepți | dopul intră; jocul pe linia de lipire | da |
| 14 | 13 | Mașina, partea a doua | Senderul (complet); §10 Senzor de lungime, Colțul XY, Override + jurnal, Planarea | senzorul, palparea, reluarea, planarea | da |
| 15 | 14 | Conturile, dreptul de acces, proba de 14 zile | admin **P2** | regresia pe live, dintr-un cont în probă | da |
| 16 | 15 | Tichetele, configurarea, fișa de lucru, șabloanele (+ copiile în cloud, dacă le vrei) | Șabloane + lot; §10 Fișa de lucru; admin **P2+** | șablonul aplicat în lot pe 3 nume | da |
| 17 | 16 | Caneluri, teșire, Raised Round, freze desenate | Caneluri / bevel / Raised Round; Freze de profil desenate; Biblioteca de freze (completă) | canelura, încrucișarea, roundover | da |
| 18 | 17 | Textura din freză, ghilotina, burghiele multiple, laserul 2D | Textura din freză; Ghilotină + drillbanks | textura, grila ghilotină; laserul, dacă ai | da; runda 3 la ateliere |
| 19 | 18 | **Relieful 1:** nucleul, relieful din imagine, prelucrarea 3D din relief | Relief din imagine; Alinierea pixelilor; Litofanie; Combinarea; Rezoluția 4000²; Straturi; Relief ↔ 16 biți; Degroșare 3D; Finisare paralelă | pana de gri, calota, litofania | da |
| 20 | 19 | Relieful 2: editorul de forme, textul, operațiile, analiza | Editor de forme; Relief din text; Operații; Estompare și pante; Analiza; Suprafață / volum / greutate | cupola, rotunjitul, planul înclinat, greutatea | da |
| 21 | 20 | **3D din modele:** import, câmp conservativ, zone, decupare | Import 3D; Zone; Decupare 3D | STL-ul de referință în trepte + semisfera | da |
| 22 | T2 | **Tampon** | — | placa de regresie | da |
| 23 | 21 | 3D avansat; extrudare, sweep, spin, turn | Coliziunea cu mandrina; Zonele inaccesibile; Model înalt din felii; Extrudare; Two Rail / Spin / Turn | modelul din felii, profilul extrudat, rozeta | da |
| 24 | 22 | Relieful 3: îmbinări, straturi bitmap, sculptura, anvelopa | Îmbinări; Straturi bitmap; Sculptare; Deformare în anvelopă | îmbinările, textul în anvelopă | da |
| 25 | 23 | Relieful 4: două fețe, bas-relieful, conturul | Relief pe două fețe + întoarcere; Bas-relief din STL; Conturul vectorial al reliefului | gaura prin față + lamajul din spate | da |
| 26 | 24 | Relieful 5: texturi, export STL, biblioteca, laserul 3D | Texturi; Export STL / OBJ; Clipart de relief; Laser (complet) | țesătura, STL-ul închis | da |
| 27 | 25 | Trasarea din imagine; **EPS și AI vechi** (după decizia ta) | Trasare din imagine (importul avansează) | logoul trasat; un EPS real | da |
| 28 | 26 | Importul, partea 2: Corel, WMF / EMF, DWG ca mesaj | Import 2D, în forma decisă de tine | fișierele tale reale | da |
| 29 | 27 | **Facturarea** (Stripe în mod de test) și partea legală | admin **P3** | regresia dintr-un cont plătit (test) și dintr-unul cu proba expirată | da |
| 30 | 28 | Cele două interfețe, ghidul de pornire | Două interfețe; §10 Ghid la prima pornire; admin **P4** | un job făcut doar prin asistent | da |
| 31 | T3 | **Tampon** | — | placa de regresie | da |
| 32 | 29 | Atelierele, regresia, laptopul de atelier | posturile probate pe controlere reale (dacă au venit rezultatele) | regresia completă (10 cote din 10 etape) | da |
| 33 | 30 | **Lansarea** | lista de lansare (`BRIEF.md` §8) | piesa unui străin, făcută fără ajutor | **lansarea** |

**Unde ajunge fiecare din cele 65 de rânduri:** tabelul din `propunere-simplitate.md` §5.3 (A 11, B 14, C 24, D 10,
F 6 = 65), cu cele 8 funcții din §10 și adminul P0–P4. Lista de lansare din `BRIEF.md` §8 e închisă pe rând în etapele
3, 9, 27, 28 și 30.

### 5.4 Ce am schimbat față de scheletul „simplitate”

1. **Exportul EPS în etapa 9,** dacă îl vrei: +1 felie. Scriitorul e gata în s2 și citit corect de Ghostscript.
   Recomand **da**, fiindcă ArtCAM și Corel citesc EPS. Exportul AI rămâne **nu**.
2. **Copiile proiectelor în cloud** (urcarea și coborârea fișierului `.cncvs`, cu listă, fără sincronizare), dacă le
   vrei: +3 felii în etapa 15.
   - Recomand **da**, în forma simplă.
   - Motivele: stocarea browserului poate fi golită (`persist()` a întors fals pe un profil nou [măsurat, s7 §4.3]);
     și e primul lucru pe care abonamentul îl vinde real pe server (`BRIEF.md` §4).
   - Sincronizarea din ediția întâi („câștigă ultimul care scrie”) nu se repetă: fiecare urcare e o versiune nouă.
3. **Oracolul G-code** (cel din s4) intră în etapa 1, ca poarta invariantei pasului să existe de la primul program.
   Nucleul de simulare de produs rămâne în etapa 4.
4. **Rândurile se scriu în `ACOPERIRE-ARTCAM-DESKPROTO.md`** (Stare + Commit) la închiderea fiecăruia, nu la sfârșitul
   v1.

### 5.5 Momentele-cheie și drumul critic

- **Prima piesă tăiată din aplicația nouă:** sfârșitul săptămânii 1 (placa 1).
- **Prima publicare pe live:** săptămâna 3, odată cu P0 (jurnalul de erori, Diagnoza) și P1 (publicarea cu sha fixat și
  aprobarea ta, backup-ul cu alarmă).
  - Înainte: export Firestore pe live și lista funcțiilor vechi de șters, arătată ție.
  - Extensiile Stripe și Trigger Email rămân neatinse.
- **Atelierele** (drumul critic al posturilor, `BRIEF.md` §15):
  - cauți atelierele din săptămâna 1;
  - pachetul T0–T7 pleacă în săptămâna 4, după ce l-ai rulat tu pe GRBL în etapa 3;
  - runda 2 (RichAuto și ce a ieșit greșit) în săptămâna 9;
  - runda 3 (un job real pe fiecare controler) în săptămâna 18;
  - rezultatele intră în teste în etapele 12 și 29.
- **De ce adminul vine în tranșele astea** (momentul l-am ales eu, cum ai cerut):
  - **P0 și P1 în săptămâna 3:** jurnalul de erori, Diagnoza și publicarea sigură trebuie să existe înaintea primului
    deploy pe live, nu după;
  - **P2 în săptămâna 15 și P2+ în 16:** utilizatorii, auditul, adminii, tichetele și configurarea au sens abia când
    există conturi;
  - **P3 în săptămâna 29:** veniturile vin cu facturarea, aproape de CAEN;
  - **P4 în săptămâna 30:** analiza și CAM-ul au nevoie de conturi și de evenimente reale.

  Totalul e cele 12 file (fila AI vine cu AI-ul, „mai târziu”), fiecare exersată pe instanța de test
  [citit, `admin` §5.2].
- **Vectorii reali** (`BRIEF.md` §16.2):
  - modelul de curbă în săptămâna 2;
  - editorul în săptămâna 6;
  - importul și exportul, cu cititori independenți și cu pachetul tău deschis în programele tale, în săptămâna 9;
  - conversia (arce în loc de curbe, cercuri din poligoane) în săptămâna 10;
  - anvelopa în săptămâna 24.

### 5.6 Dacă alegi A în loc de D

- **Modelul:** `Doc { foi: [{ stoc, rădăcină }] }`. Restul arhitecturii nu se schimbă.
- **Etapa 11** scade cu ~2 felii: fără instanțe și fără „Desprinde”. Multi-Plate face copii: 60 de noduri în loc de 2
  la 30 de plăcuțe [măsurat, prototip].
- **Etapa 23** crește cu ~1 felie: fața de jos devine o planșă-copie oglindită, care cere un avertisment de aliniere. În
  prototip, spatele rămânea decalat cu 50 mm fără avertisment.
- **Prețul pentru tine:** schimbarea textului pe 12 suporturi cere 26 de gesturi în loc de 6, iar buzunarul pe spate 39
  în loc de 9 [măsurat, prototip].
- **Momentul:** schema planșelor se îngheață după alegere. Arborele, rama și gesturile comune (scenariile 1–3) se
  construiesc oricum în etapa 6.

---

## 6. Estimarea

**Modelul** (`arhitectura/estimare.md` §6, din ritmul măsurat al ediției întâi):

```
săptămâni = 1 (pasul 0) + felii / ((zile active − 0,5) × felii pe zi − refacerile de pe placă)
```

Valorile de pornire:
- **5,4 zile active pe săptămână**, măsurate pe tot proiectul vechi (97 din 127 de zile cu commit);
- **2,5 felii pe zi activă**, din august (cu reparațiile socotite) și din perioadele cu dovada înainte;
- **0,5 zile pe etapă** pentru placă;
- **1,5 felii de refacere** pe placă.

Mărimile pe articole au clase de risc: R1 × 1,3, R2 × 1,6 și R3 × 2,2 la P90.

| | P10 | **P50** | P80 | **P90** |
|---|---:|---:|---:|---:|
| Săptămâni, de pe 07.10.2026 | 18,7 | **33,2** | 50,0 | **63,7** |
| Data orientativă | — | **~28.05.2027** | ~22.09.2027 | **~27.12.2027** |

**Ce mută rezultatul cu peste 20 %** [`estimare.md` §7]:
- zilele active pe săptămână (5,4 → 4,0: +47 %);
- feliile pe zi (2,5 → 1,8: +45 %; 2,5 → 3,3: −26 %);
- mărimea totală (× 1,3: +29 %).

**Deciziile deschise (EPS, GPU, Rust, A / D) mută fiecare sub 3 %.** Durata o decid ritmul și continuitatea.

**Pârghiile tale, dacă estimarea crește.** Nu le recomand; le arăt cu costul lor. Nimic nu iese fără tine.
- EPS / AI vechi doar ca mesaj: −7 felii;
- WMF / EMF ca mesaj: −2;
- texturi, țesătură și clipart de relief: −5;
- îmbinările de relief: −3;
- sweep, spin, turn: −3;
- laserul, dacă n-ai laser de probă: −5;
- modelul înalt din felii: −2.

**Porțile externe** (nu sunt în săptămâni și pot amâna lansarea după ce v1 e gata): atelierele, CAEN-ul pentru Stripe
live, entitatea juridică și adresa de firmă, DNS-ul pentru e-mail, străinul pentru testul de lansare.

---

## 7. Riscurile

| # | Riscul | Semnalul timpuriu | Ce facem |
|---:|---|---|---|
| 1 | **Ritmul real e sub estimare** (dovada se scumpește ca în august) | după etapa 2, ritmul măsurat < 2 felii pe zi activă; o felie > 1,5 × estimarea | recalibrarea; stop și întrebare; pârghiile de la §6 |
| 2 | **Atelierele întârzie** | la sfârșitul etapei 2 n-ai trei ateliere confirmate | pachetul pleacă în săptămâna 4, cu trei runde; fișierele sunt mici și rulează întâi în aer; postul neprobat poartă avertisment |
| 3 | **Nucleul geometric cade pe fișierele reale** | după etapa 9, suita densă are eșecuri explicite > 1 % | gărzile T5; eșec explicit, niciodată traseu tăcut; întrebarea Rust → WASM |
| 4 | **PathKit înghețat** (o incompatibilitate viitoare) | segmente nepotrivite de R3 pe corpus; WASM-ul nu se încarcă într-un Chrome nou | R3 după fiecare operație; fațada permite CanvasKit fără alt cod |
| 5 | **Laptopurile din ateliere sunt mai slabe** decât mașina de măsură | pe laptopul de atelier, imaginea exactă la 10 k forme > 300 ms sau sculptura < 30 de cadre | LINE_STRIP, bugete alese la pornire, nivel de detaliu; criteriul planului B |
| 6 | **Relieful (24 de rânduri) e subestimat** | etapele 18–19 depășesc cu peste 2 felii | tamponul T2; ordinea de la riscul mic la cel mare; pârghiile |
| 7 | **Primul deploy pe proiectele refolosite strică ceva vechi** | lista de ștergere conține funcții ale extensiilor; erori la deploy pe test | export Firestore înainte; lista confirmată de tine; extensiile neatinse; testul întâi |
| 8 | **CAEN și firma nu vin la timp** | fără CAEN până în etapa 20 | Stripe gata în mod de test; tu decizi lansarea fără încasare (`BRIEF.md` §8) |
| 9 | **Tu, singurul judecător, nu mai ții pasul** | o placă netăiată două săptămâni la rând; lista ta trece de 5 | plăci mici (≤ 30 min la mașină); nimic pe live fără placă; lista ≤ 5, cu implicitul în față |
| 10 | **Contextul se pierde între sesiuni și modele** | o sesiune redeschide o decizie luată; DEVLOG-ul crește mai repede decât codul | ADR-uri; `CLAUDE.md` la zi; ținta etapei scrisă aici; feliile doar din etapă |

---

## 8. Deciziile tale

Lista are cel mult 5 lucruri deschise odată. La fiecare, **recomandarea e implicitul**: dacă nu spui altfel, o aplic.

### Lotul 1: la aprobarea planului

1. **Planșele: A sau D?** Recomand **D** (prototipul, scenariile 5 și 7). Plus trei alegeri ale prototipului, toate cu
   varianta din prototip ca implicit:
   - ce e „piesă” pe foaie: orice pui pe foaie;
   - Ctrl+D: copie separată;
   - mânerele unei instanțe cu surori schimbă toate instanțele, cu banda de avertizare.

   Termen: înainte de etapa 11. Până atunci nimic nu depinde de alegere.
2. **Pachetul de export:** deschizi fișierele din `docs/faza2/sonde/s2-export-import/pachet-owner/` în ArtCAM și
   Aspire / VCarve, apoi în ce mai ai, după `CITESTE.md`. Implicit: **un singur preset, DXF R2007**. R12 intră doar dacă
   unul dintre programe nu deschide R2007. Termen: etapa 9.
3. **Atelierele:** câte unul cu NcStudio, Richauto / Syntec, Mach3 / Mach4, cu versiunea controlerului. Termen: începi
   căutarea în săptămâna 1, confirmările până la sfârșitul etapei 2.
4. **Fișierele tale reale:** 30–50 de fișiere primite în ultimele luni (DXF, SVG, PDF, EPS, AI, WMF, DWG), mai ales din
   CorelDRAW.
   - Stau **doar local**, ignorate de git, pentru că repo-ul e public.
   - Din ele decidem EPS, AI vechi și WMF.
   - Termen: sfârșitul etapei 2.
5. **Live doar pentru personal până la lansare:** publicul vede o pagină „în curând”, iar aplicația veche dispare de
   pe live în săptămâna 3. Codul ei rămâne în GitHub și local. Recomand **da**.

### Cu termen

| # | Decizia | Recomandarea (implicitul) | Termen |
|---:|---|---|---|
| 6 | Importul EPS și AI vechi | **da**, interpretor propriu, limitat, cu refuz explicit; confirmat pe fișierele tale (dacă EPS-urile sunt sub ~10 %, rămâne ca mesaj în v1) | etapa 25 |
| 7 | DWG | **doar mesaj** „salvează ca DXF” + un convertor gratuit; nativ, de decis în v1.x (ODA costă 7 500 $ primul an) | etapa 26 |
| 8 | WMF / EMF | **da**, cititor propriu (~2 felii) | etapa 26 |
| 9 | DGK și PIC | **scoase din prag**: n-au specificație publică, iar regula ta interzice reverse engineering-ul | etapa 26 |
| 10 | Exportul EPS | **da** (+1 felie); exportul AI **nu** | etapa 9 |
| 11 | Copiile proiectelor în cloud | **da**, forma simplă (+3 felii) | etapa 14 |
| 12 | Creditele de export din ediția întâi | **nu** (`BRIEF.md` §4 are doar abonamente) | etapa 14 |
| 13 | Jurnalul de erori fără consimțământ, cu identificatorul contului ascuns și păstrat 90 de zile | **da**, cu o frază în politica de confidențialitate (de verificat juridic) | etapa 3 |
| 14 | La primele publicări, aprobarea se dă în GitHub; panoul de publicare din admin vine în etapa 15 | **da** | etapa 3 |
| 15 | Tichetele le folosești tu primul, pentru raportările de pe test | **da** | etapa 15 |
| 16 | Offsetul unei forme cu curbe, în desen | **din arce** (același motor ca CAM-ul); Bézier doar dacă o ceri | etapa 6 |
| 17 | Formele care se ating în aceeași operație V-carve | **se unesc**, cu vindecarea raportată | etapa 8 |
| 18 | Toleranța mașinii pentru plăci | **±0,2 mm în plan, ±0,1 mm pe adâncime** | etapa 1 |
| 19 | Laserul | ai un laser pentru plăci? Dacă nu, rândul se probează pe simulare și într-un atelier | etapa 17 |
| 20 | Clipartul de relief | **un set de pornire de ~30 de reliefuri**, făcute cu uneltele noastre, fără nimic copiat | etapa 24 |
| 21 | Ce conține fiecare nivel de abonament | de decis înainte de codul de facturare (`BRIEF.md` §4) | etapa 20 |
| 22 | Rust compilat în WASM pentru offset | **nu**, cât timp trece criteriul din etapa 9 | etapa 9 |

### Pașii de configurare

Eu pregătesc comenzile; tu confirmi sau le rulezi în consolă.

| Pasul | Termen |
|---|---|
| Confirmi exportul Firestore pe test și lista funcțiilor vechi de șters pe test | etapa 1 |
| Materialul și sculele pentru plăci: MDF 18 / 12, frezele plate Ø6 și Ø3,175, V60, V90, bilă Ø6, șubler | etapa 1 |
| Cheia reCAPTCHA Enterprise pentru domeniul de test; mediul `live` în GitHub, cu tine ca aprobator; WIF pe ambele proiecte; exportul Firestore pe live | etapa 3 |
| Placa de contact pentru Z (etapa 3); senzorul de lungime legat la pinul de palpare (etapa 13) | etapele 3 și 13 |
| Un laptop de atelier (sau accesul la el), pentru bugetele pânzei | etapa 4 |
| DNS-ul pentru e-mail (MX, SPF, DKIM) | etapa 15 |
| Entitatea juridică, adresa de firmă, textele juridice | etapa 27 |
| CAEN-ul pentru Stripe live | extern |
| Un străin dintr-un atelier, pentru testul de lansare | etapa 29 |
| PITR pe live (din lista ta de ieri) | oricând |

---

## 9. După aprobare

1. **`docs/PORTARE.md`** (pasul 0): fiecare candidat din `LECTII.md` §3.2 primește un verdict:
   - portat aproape neschimbat;
   - adaptat la interfețele de aici;
   - rescris, cu vechiul ca martor;
   - lăsat.

   Verdictul ține cont de dovezile vechi, de potrivirea cu modelul de aici, de cost și de licențe. Nimic portat nu intră
   fără probele noi.
2. **`CLAUDE.md`:** starea „Faza 2 încheiată”, linkul spre plan, regulile noi de proces (§5.1).
3. **ADR-urile**, din tabelul de la §3.5, câte o pagină pe decizie.
4. **Etapa 1** pornește după lotul 1 de decizii.
