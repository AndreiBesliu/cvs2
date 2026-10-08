# PLANUL v1: CNC Vector Studio, ediția a doua

**Stare: aprobat de owner pe 07.10.2026, fără modelul de planșe (A / D).** Modelul îl alege după ce încearcă
prototipul, înainte de etapa 1. Deciziile de la aprobare sunt la §8.1. E versiunea a doua a ciornei, după cei trei
critici independenți (`docs/faza2/arhitectura/critica-*.md`).

**Autoritatea:**
- După aprobare, acest fișier e autoritatea pentru arhitectură, ordinea etapelor și regulile de proces.
- `BRIEF.md` rămâne autoritatea pentru ce vrea owner-ul.
- Propunerile din `docs/faza2/arhitectura/` sunt **istoric, nu autoritate**. Detaliul etapelor 5–30 se scrie la
  începutul fiecărei etape, din tabelul de la §5.4 și din amendamentele de la §5.5.

**Marcaje:** [măsurat] = probat prin rulare (sondă, verificare, git); [citit] = din documente sau cod; [dedus] =
concluzie, nerulată. Sursele sunt în `docs/faza2/`:
- **sondele:** `sonde/s1`…`s8`, `s11`, `s12`;
- **verificările:** `s1-V`, `s3-V`, `s6-V` (fișierul `VERIFICARE.md` din dosarul sondei);
- **adminul:** `admin/RAPORT.md`;
- **prototipul planșelor:** `prototip-planse/RAPORT.md`;
- **propunerile și estimarea:** `arhitectura/propunere-*.md`, `arhitectura/estimare.md`.

---

## 0. Pe scurt

- **Ce construim:** v1 = cele 65 de rânduri v1 din prag + cele 8 funcții din `BRIEF.md` §10 + adminul (§16.1) + vectorii
  reali (§16.2). Lansarea vine la v1 complet (§8), dacă nu decizi altfel la întrebarea despre beta (§8.1).
- **Cum lucrăm:**
  - etape de o săptămână, fiecare cu o țintă scrisă aici și cu o **placă de probă**: 5–10 cote date dinainte, cu
    valorile pe hârtie;
  - placa e aprobarea etapei, iar după ea se publică pe live, cu confirmarea ta;
  - feliile le aleg eu din etapă, nu dintr-un registru;
  - ținta e ca tu să lucrezi ≤ 2 ore pe săptămână: mașina, măsurătorile și deciziile.
- **Ordinea:**
  - **prima piesă tăiată din aplicația nouă: sfârșitul săptămânii 1;**
  - primul live: săptămâna 3;
  - pachetul pentru ateliere: săptămâna 4;
  - CAM-ul 2D și producția: săptămânile 5–18;
  - relieful și 3D-ul: 19–26;
  - importurile grele, facturarea, interfața pentru începători și lansarea: 27–33.
- **Arhitectura, în șase rânduri:**
  1. un singur drum pentru tot ce mișcă mașina: document → operație → IR → un singur post → G-code cu amprentă →
     sender;
  2. geometrie exactă din linii, arce și cubice: cercul rămâne cerc. Aproximarea e declarată și mică, doar unde e
     inevitabilă (T2);
  3. tot calculul greu rulează pe procesor, în workere, și dă aceleași celule de simulare în teste și pe ecran;
  4. pânza desenează vectorii exacți într-un worker, iar traseele pe placa video;
  5. datele stau local (IndexedDB), proiectul se salvează ca zip determinist, iar aplicația pornește fără rețea;
  6. cloud-ul (cont, drept de acces, facturare, admin) stă pe aceleași proiecte Firebase, cu dreptul de acces calculat
     doar pe server.
- **Durata**, din ritmul măsurat al ediției întâi (`estimare.md`):
  - **P50:** ~33 de săptămâni, adică **sfârșitul lui mai – mijlocul lui iunie 2027**;
  - **P80:** ~50 de săptămâni, ~septembrie 2027;
  - **P90:** ~64 de săptămâni, **~sfârșitul lui decembrie 2027**.

  Planul are 30 de etape + 3 săptămâni-tampon (§5.4). Prima recalibrare, din duratele noastre reale, vine **după
  etapa 3**. Dacă P50 se mută cu peste 20 %, primești noua cifră, pârghiile și întrebarea despre beta, din nou.
- **Deciziile de la aprobare (07.10, §8.1):**
  - **A / D se alege înainte de etapa 1;** recomand D;
  - **proba închisă după etapa 14:** 1–2 ateliere prietene, doar 2D, conturi invitate, fără plată. Lansarea publică
    rămâne la v1 complet;
  - **DGK / PIC scoase din prag; DWG doar mesaj; EPS și AI vechi printr-un cititor propriu; WMF propriu; fără export
    AI;**
  - **găurirea multiplă** se acceptă pe simulare și pe octeții postului;
  - **laserul se probează pe laserul tău Ruida**, printr-un export vectorial pentru LightBurn / RDWorks.

  Restul are implicit (§8.2), plus coada ta de acțiuni (§8.3).

---

## 1. Cum s-a făcut planul

- **Faza 2 a avut patru runde:**
  - 10 sonde cu cod de probă;
  - 3 verificări adversariale și 2 sonde mici;
  - 3 propuneri independente (corectitudine, valoare, simplitate) și un estimator;
  - 3 critici pe ciorna planului.

  Costul în agenți: **~10,2 M tokeni** (4,19 + 2,18 + 2,35 + 1,44), fără conversația principală [măsurat, `DEVLOG.md`].
  Faza 0 a costat separat 10,3 M.
- **Toate cele 10 sonde din prima rundă** (s1–s8, adminul, prototipul) s-au reprodus când le-am rulat serial, pe mașina
  liberă [măsurat]. Două rezerve sunt notate în `DEVLOG.md`: mediul Python al s2 a trebuit refăcut, iar martorul de
  procesor al s6 nu mai pică pe mașina liberă.
- **Fiecare dintre cele 3 sonde verificate a avut cel puțin o afirmație decisivă infirmată**, iar planul o folosește pe
  cea corectată:
  - offsetul cade pe polilinii dense;
  - booleanul derivă în lanț;
  - V-carve-ul cere un pas mai fin;
  - pânza trebuie să deseneze în worker.
- **Cele trei propuneri au convers** pe deciziile mari. Planul ia:
  - **scheletul pe etape** din „simplitate”, pentru că acoperirea pe rânduri e verificată și de un critic;
  - **spina de dovadă** din „corectitudine”;
  - **felul de a cere decizii** din „valoare”.
- **Criticii au găsit 3 probleme blocante și ~30 importante**, toate de ordine și de text, niciuna de arhitectură.
  Le-am corectat pe toate. Lista lor, cu rezolvarea, e în `DEVLOG.md`.

---

## 2. Glosarul

Fiecare cuvânt are un singur sens în cod, în interfață și în discuții.

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
| 12 | **montaj** | Ce vede mașina la un job: foaia, fața, originea de lucru, axele, știfturile (în v1.x) și profilul mașinii. Transformarea document → mașină e o singură matrice. |
| 13 | **sculă** (freză) | Silueta reală h(r) a tăișului, cu diametre și lungimi, plus valorile calibrate pe lemn; operația ține un instantaneu al ei. |
| 14 | **material** | Esența și proprietățile ei (densitate, avansuri), cu sursa fiecărei cifre. |
| 15 | **regiunea păstrată** | Materialul care trebuie să rămână; intrările, urechile și verificările o citesc. |
| 16 | **IR-ul traseului** | Reprezentarea intermediară: mișcări tipizate (linie, arc, elice) pe N axe, cu valorile la ambele capete, scula, operația și eticheta. Toți o citesc; nimeni nu reparsează G-code. |
| 17 | **post** | Singurul cod care transformă IR-ul în text G-code pentru un controler. |
| 18 | **contract de dialect** | Regulile unui controler, scrise ca date, fiecare cu sursa și cu starea „documentat” sau „probat în atelier”. |
| 19 | **program** | Octeții G-code scriși de post, cu amprenta SHA-256; senderul trimite exact acești octeți. |
| 20 | **profilul mașinii** | Ce știm despre o mașină: controlerul, axele, cursele, turațiile, Z-ul sigur, strategia de schimbare a sculei. Controlerul rămâne sursa de adevăr. |
| 21 | **câmp de înălțimi** | O grilă cu o cotă Z pe celulă; îl folosesc simularea, relieful și prelucrarea 3D. |
| 22 | **oracol** | Cod scris separat, fără niciun import din aplicație, care știe răspunsul corect și judecă aplicația. |
| 23 | **invariantă** | O regulă care trebuie să țină pe orice program: niciodată mai adânc decât pasul pe trecere, nimic tăiat din regiunea păstrată, nicio scobitură în model. |
| 24 | **placă de probă** | Piesa tăiată de owner la sfârșitul etapei, cu 5–10 cote date dinainte cu valoarea pe hârtie; e aprobarea etapei. |
| 25 | **placă de regresie** | O placă fixă, cu trăsăturile canonice ale etapelor trecute, retăiată când nu există funcții noi de mașină. |
| 26 | **felie** | O schimbare cu commit, care se termină cu ceva de încercat, cu dovada scrisă înaintea funcției. Mărimea nominală: ~½ zi activă (§5.1). |
| 27 | **etapă** | O săptămână de felii, cu ținta scrisă în plan și cu placa la sfârșit. |
| 28 | **capabilitate** | Dreptul de a folosi o funcție. Fiecare acțiune îl declară din prima zi; dreptul de acces al contului se calculează doar pe server. |

---

## 3. Arhitectura

### 3.1 Principiile

1. **Un singur drum pentru tot ce mișcă mașina.** Nicio a doua cale pentru același lucru (în ediția întâi erau 5
   emitenți de G-code [citit, `LECTII.md` §1]).
2. **Un fapt, o autoritate.** Fiecare fapt are un singur modul-proprietar. Regulile de import, verificate în CI, fac
   ocolul imposibil (clasa 1 din `LECTII.md` §2.2). Exemplu: pentru starea mașinii, controlerul e autoritatea, iar
   profilul mașinii e doar memoria ultimei citiri.
3. **Relațiile se scriu la actul omului, nu se ghicesc** (clasa 5): instanța trimite la piesă, perechea incrustației e
   declarată, inelul ramei are identitate.
4. **Modelul de curbă e închis din prima zi** (clasa 7): trei tipuri de segment, cu `switch` exhaustiv verificat de
   compilator. Schimbările de schemă sunt migrații pure, cu corpus de aur.
5. **Dovada înaintea funcției.** Oracolul unui subsistem intră înaintea primei lui funcții și se refolosește.
6. **Determinismul e poartă.**
   - Simularea dă aceleași celule în Node și în browser [măsurat, s4 §4.5].
   - Aceiași octeți de G-code în Node și în browser [dedus], ceea ce devine poartă în CI (§4.4).
7. **O tehnologie intră doar când o măsurătoare o cere** (§3.6). Infrastructura vine când o cere produsul.

   **Ce intră din etapa 1, fiindcă e ieftin doar atunci:**
   - build determinist, configul citit de la gazdă, `.gitattributes`;
   - schema cu versiune;
   - `t()` cu paritate en / ro, ErrorBoundary;
   - **registrul de acțiuni, cu capabilitatea declarată pe fiecare acțiune** (toate permise până la facturare,
     `BRIEF.md` §4);
   - **tipurile pe N axe** (T22);
   - regulile de import;
   - cârligul care refuză `git add -A`.

### 3.2 Harta modulelor

**Un singur depozit și un singur build:** aplicația e un singur pachet npm, cu dosare în `src/`. Funcțiile Firebase au
al doilea `package.json`, fiindcă așa cere Firebase. Fără workspaces și fără proiecte TypeScript legate.

| Dosar | Ce deține (singura autoritate) | Unde rulează |
|---|---|---|
| `src/geom/` | geometria exactă: contururi L/A/C, forme parametrice, transformări, offset (cavalier), boolean (PathKit + R3), biarce, distanța exactă, regula de umplere, normalizarea și vindecarea regiunii, testul de clic | bazin (operațiile), fir principal (clicul) |
| `src/model/` | documentul: schema (valibot), versiunea, migrările, arborele, comenzile și jurnalul lor (undo), `rev` | fir principal |
| `src/text/` | fonturile, așezarea literelor, înălțimea majusculei, normalizarea glifelor | bazin |
| `src/relief/` | straturile de relief pe dale, operațiile pe relief, editorul de forme, sculptura | fir principal (pensula), bazin |
| `src/ir/` | tipurile IR-ului pe N axe și verificatorul de invariante (funcție pură) | oriunde |
| `src/cam/` | operațiile → IR (2D, 2.5D, V-carve, incrustații, decorative, laser, 3D), sculele, materialele | bazin |
| `src/post/` | postul unic, contractele de dialect, formatorul de numere | bazin sau fir principal |
| `src/sim/` | nucleul de simulare (câmp pe dale), estimarea timpului | bazin |
| `src/io/` | ușile de import și de export, fișierul `.cncvs` | bazin (SVG se parsează inert pe firul principal) |
| `src/machine/` | senderul: sesiunea Web Serial, fluxul, procedurile ca mașini de stare, pozițiile pe N axe cu cadru | fir principal (worker, dacă proba o cere) |
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

**Registrul de acțiuni** e singura ușă a interfeței spre domeniu.
- Fiecare acțiune are: id, etichetă (cheie `t()`), `activă → motiv`, **capabilitatea cerută** și `run`.
- Un test cere ca nicio acțiune să nu aibă capabilitatea goală.
- Barele, meniurile, tastatura, asistentul pentru începători și analiza din admin sunt doar vederi ale aceluiași
  registru.

**Modelul documentului (ipoteza D):**
- `Doc { schema, rev, piese[], foi[], montaje[], scule[] (instantanee), resurse{sha → meta} }`;
- `Piesă { nume, rădăcină: Nod }`, unde `Nod = Grup | Ramă | Element`;
- `Foaie { stoc, fețe{sus, jos}, instanțe[] }`;
- `Instanță { piesă, x, y, rotire, câmpuri{} }`;
- `Montaj { foaie, față, origine, axe[], știfturi[] }`. Știfturile și axa rotativă rămân goale în v1;
- `Operație { tip, noduri[], sculă (instantaneu + hash), parametri }`.

Câmpurile necunoscute se păstrează. Pentru A, vezi §5.7.

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

- **Postul e singurul care aplică matricea montajului** și singurul care scrie coordonate de mașină.
  - Oglindirea pentru fața de jos stă tot în matrice.
  - Postul inversează G2 ↔ G3 când matricea oglindește [dedus, din propunerea „corectitudine” §3.4].
- **Arcele rămân arce până în post.** Un controler fără arce primește arcele aplatizate de post, nu de nucleu
  [citit, s1 §5.7].
- **Schimbarea sculei e un eveniment în IR,** iar contractul o traduce într-una din 4 strategii [citit, s8 §5.4].
  - Pornirea axului e tot un eveniment.
  - **Pauza după pornire e un parametru al mașinii**, scris de post în unitatea controlerului [citit, s8 §5.5].

**Pânza:** documentul trăiește pe firul principal. Workerul de randare și indexul de clic primesc doar comenzile, nu
documentul: o copie de 50 000 de noduri costă ~0,6 s [măsurat, s7 §4.6].

```
Strat WebGL2:            foaia, traseele (LINE_STRIP implicit), câmpul simulării (dale urcate la schimbare)
Strat de vectori:        worker de randare, Path2D pe găleți spațiale, OffscreenCanvas SOFTWARE ──► ImageBitmap
Strat de interacțiune:   mânere, selecție, previzualizarea uneltei (Canvas2D accelerat, mic), Pointer Events
```

**Relieful:** straturi Float32 pe dale de 256 × 256, rare; o dală lipsă înseamnă o constantă.
- Operațiile rulează în bazin, pe benzi transferate. Pensula rulează pe firul principal, pe dalele atinse (0,3–2,6 ms pe
  aplicare [măsurat, s5 §4.6]).
- Salvarea și undo-ul folosesc Uint16 cu scară pe dală, cu eroarea de 0,15–0,46 µm [măsurat, s5 §2].
- Relieful făcut din vectori rămâne o rețetă derivată: vectorul nu se pierde.

**Persistența:**
- **o singură bază IndexedDB:** documentul, pointerul „versiunea curentă”, jurnalul și resursele după SHA-256, ca
  `Blob`, în tranzacții. 100 MiB se scriu în 218 ms și se citesc în 84 ms [măsurat, s7 §4.3]. O tranzacție omorâtă la
  mijloc lasă versiunea veche intactă [măsurat pe 64 MiB, s7 §4.4];
- **numele bazelor sunt noi**, deci datele locale ale aplicației vechi rămân neatinse;
- **fișierul `.cncvs`:** un zip determinist (manifest + JSON canonic + resurse), identic octet cu octet în orice fus
  orar [măsurat, s7 §4.5];
- **un singur scriitor**, cu Web Locks între file;
- cerem `persist()`; plasa e fișierul exportat (și copia în cloud, §8.2).

**Cloud-ul:**
- **proiectele:** `cncvectorstudio` (live) și `cncvectorstudio-test`, refolosite. **Rămân neatinse** (`BRIEF.md` §7):
  - extensiile Stripe și Trigger Email;
  - domeniul;
  - configurarea App Check de pe live;
  - conturile de Auth și Secret Manager.

  Deploy-ul atinge doar țintele numite (`--only`). Lista extensiilor se verifică înainte și după.
- **colecțiile aplicației noi au nume noi;** cele vechi rămân neatinse, iar regulile noi le refuză. Ce se întâmplă cu
  ele se decide înainte de etapa 14 (§8.2);
- **regiunile, într-un tabel unic din cod:** baza în `nam5`, callable-urile și joburile în `europe-central2`,
  declanșatoarele Firestore în `us-central1`;
- **App Check impus peste tot.** Pe test există un token de debug, înregistrat doar acolo [citit, `admin` §5.3];
- **rolul de personal** stă doar în `staff/{uid}`. Citirile de admin trec prin reguli, iar scrierile numai prin
  callable-uri, cu auditul în aceeași tranzacție;
- **dreptul de acces** se calculează doar pe server, în `entitlements/{uid}`, cu o perioadă de grație offline;
- **observabilitatea:** un singur jurnal de erori, scris doar de server (`errorLogs`), Diagnoza, marcaj de rulare pe
  fiecare job și declanșator, backup zilnic cu alarmă.
  - Intră **în etapa 3**, cu primul deploy de funcții și înaintea primului live.
  - În etapele 1–2, pe test e doar hosting, fără funcții. Erorile clientului stau într-un jurnal local, cu butonul
    „Copiază raportul”.
  - E o abatere de la `admin/RAPORT.md` §5.2 („la primul deploy pe test”), făcută ca să nu încarc etapa 1. O poți
    respinge (§8.2): atunci P0 minim intră în etapa 1, iar pânza trece în etapa 2.
- **publicarea pe live:** workflow GitHub cu sha fixat, mediul `live` cu aprobarea ta și WIF (fără chei descărcate);
- **plata:** extensia Stripe, cu lista albă de prețuri și de argumente impusă în reguli.

### 3.5 Deciziile tehnice

Fiecare decizie are dovada ei și condiția în care se redeschide. Când o verificare a contrazis sonda, a câștigat
verificarea. Fiecare rând are ADR-ul lui în `docs/adr/` (0001 = T1, …, 0023 = T23). O decizie se schimbă doar printr-un
ADR nou, iar rândul de aici trimite la el.

| # | Decizia | Dovada | Se redeschide dacă |
|---:|---|---|---|
| T1 | **Conturul are trei primitive: linie, arc de cerc, cubică.** Nodurile poartă `bulge` = tan(baleiaj/4). Pătraticele (fonturi, SVG `Q`) se ridică exact la cubice la import | cercul decalat rămâne 2 arce; rotirea păstrează colțurile rotunde (3,6·10⁻¹⁴ mm) [măsurat, s1 §4] | — |
| T2 | **Elipsa e un cerc sub o matrice neuniformă**, deci exactă, și se exportă ELLIPSE în DXF. **Aproximarea, declarată.** Ies cubice (sau biarce pentru CAM) sub toleranța proiectului (0,001 mm), cu numărul raportat, în aceste cazuri:<br>- „convertește în cale” pe o elipsă;<br>- booleanul și offsetul pe forme sub matrice neuniformă;<br>- offsetul unei cubice;<br>- un arc eliptic din mijlocul unei căi SVG.<br>La export, astfel de bucăți ies SPLINE (curbe), nu ELLIPSE. PDF și EPS n-au arc, deci acolo cercul iese din cubice; e o limită a formatului | 8 cubice pe elipsă până la r = 50 mm, 16 până la r = 1 220 [măsurat, s1 §4.6]; o primitivă în plus înmulțește cazurile din fiecare operație | — |
| T3 | **Regula de umplere: `evenodd`, una pentru ecran, clic, sculă și export.** Fonturile și SVG-urile `nonzero` se normalizează o dată, la intrare (reuniune PathKit + R3) | gaura orientată ca exteriorul: 757 din 4 000 de puncte diferă cu `nonzero`; ecranul = nucleul = `isPointInPath` [măsurat, s6 §4.6]; Roboto v3 are contururi suprapuse pe 41 din 65 de caractere [măsurat, s3 §4] | proba de normalizare din etapa 7 pică |
| T4 | **Booleanul: PathKit 1.0** (Skia PathOps, BSD-3), adus în repo, înghețat, în spatele fațadei `boolean(a, b, op)`. **Re-ancorarea R3 se face după fiecare operație** | o operație: ≤ 1,3·10⁻⁴ mm la 2 440 mm; 100 de operații fără R3: 5,1·10⁻⁴ mm și centre de arc greșite cu 0,57 mm; cu R3: 3,3·10⁻¹³ mm [măsurat, s1-V §4.6] | un defect PathKit fără ocol → PathOps din CanvasKit (întreținut, 3,3 MB), fără alt cod |
| T5 | **Offsetul: cavalier_contours**, portul TypeScript adus în repo. Reparațiile din Rust 0.8 / 0.9 se portează în etapa 9. Testul „paralele” se repară (unghi normalizat). Gărzile vin din etapa 2: curățarea intrării, validarea structurală a ieșirii, rezoluția declarată de 0,01 mm. Orice eșec iese explicit, niciodată ca traseu tăcut. **Fără toolchain Rust** | exact pe litere și forme CAD (48/48 buzunare; abaterea = toleranța biarcelor); pe polilinii dense cade în 47/240 [măsurat, s1-V] | criteriul din etapa 9 pică (pe suita densă: eșecurile explicite peste 1 % sau orice eșec tăcut) → **întrebare pentru tine**: Rust 0.9 compilat în WASM |
| T6 | **Biarcele proprii sunt singura ușă de aproximare** (cubică → arce sub toleranță). Bugetul de toleranță e pe etape și se probează pe rezultat | abaterea reală e 1,005 × toleranța [măsurat, s1-V §4.5] | — |
| T7 | **V-carve:** axa medială din Voronoi pe eșantioane (delaunator), cu:<br>- legalizare pe stivă, care aruncă eroare dacă nu converge;<br>- pas adaptiv (h ≤ 0,02 mm pe trăsături fine);<br>- raza recalculată exact;<br>- vindecarea intrării cu toleranță declarată (0,005 mm, raportată);<br>- adâncimea de start la incrustații.<br>Normalizarea regiunii folosește PathKit + R3, **fără Clipper** | plăcuța de 6 mm: 8 222 de linii, față de 161 842 în ediția întâi [citit, s3 §4]; la h = 0,05 iese peste buget (0,0163 mm), la h = 0,02 în buget; legalizarea pe stivă durează 0,08 s, cea pe treceri 16–19 s, cu ieșire tăcută [măsurat, s3-V] | corpusul cu muchii aproape comune pică → Clipper închis doar în pregătirea V-carve-ului |
| T8 | **Un singur IR al traseului, în coordonatele documentului.** Postul aplică matricea montajului | ediția întâi: originea din dreapta oglindea tot programul, 104 zile [citit, `LECTII.md` §2.1] | — |
| T9 | **Un singur post, condus de contracte de dialect ca date**, cu sursa și starea pe fiecare câmp:<br>- 3 zecimale în mm și 5 în inch, cu punctul zecimal scris mereu;<br>- I/J din startul rotunjit;<br>- garda de coardă ≥ 10 rezoluții și unghi ≥ 10⁻⁴ rad; arcele cu rază > ~10⁴ mm ies G1;<br>- plafonul de 70 de octeți pe linie;<br>- 4 strategii de schimbare a sculei;<br>- antetul setează tot ce folosește programul; WCS-ul e scris explicit;<br>- găurirea desfăcută în G0/G1;<br>- **7 contracte în v1**: GRBL 1.1, grblHAL, FluidNC, NcStudio, RichAuto, Syntec, Mach3 / Mach4 | 200 000 de arce: 0 erori la regula GRBL [măsurat, s8 §4.2]; 6 diferențe între controlere strică piesa [citit, s8 §2]; regula GRBL respinge și peste 0,5 mm absolut [citit, s1-V §3] | rezultatele din ateliere |
| T10 | **Simularea:** nucleu TypeScript pe CPU, câmp rar pe dale mici, dalele uniforme ca un singur număr, calcul exact pe celulă, rânduri de dale intercalate pe bazin. Rezoluția implicită e 0,25 mm, cu 0,1 mm pe o fereastră. **Amprenta Node = browser e poartă în CI** | 0 celule greșite pe 16 piese pe hârtie; identic bit cu bit în Node și Edge, la 1–16 fire [măsurat, s4] | — |
| T11 | **Fără calcul pe GPU în v1.** Placa video doar desenează | finisarea 2,67 M de puncte în 2,2 s pe 16 workere [măsurat, s5]; GPU ≠ CPU cu până la 0,18 µm, iar CI-ul n-are GPU [măsurat, s4] | un job obișnuit durează > 10 s pe calculatorul tău (măsurat) → v1.x, ca accelerator al acelorași nuclee, cu probă față de CPU |
| T12 | **CAM 3D doar pe câmpul conservativ** (maximul modelului pe celulă) + distanța la segment. Eșantionarea în nod e doar pentru ecran. Drop-cutter-ul exact pe triunghiuri e oracolul | eșantionarea în nod sapă până la 5 mm; câmpul conservativ: 0 scobituri [măsurat, s5 §4.1, §4.3] | — |
| T13 | **Pânza:**<br>- vectorii exacți se rasterizează într-un worker, pe pânză software, și se predau ca ImageBitmap;<br>- traseele merg ca LINE_STRIP implicit, iar segmentele instanțiate doar sub un buget măsurat la pornire;<br>- linia vectorului are 1 pixel fizic;<br>- zoomul maxim e 1000 px/mm;<br>- intrarea prin Pointer Events | clicul se vede în 24 ms în timpul redesenului, pe RTX și pe iGPU; pe firul principal, 456–552 ms [măsurat, s6-V §4.4]; 5 M de segmente ca LINE_STRIP țin 60 Hz pe iGPU [măsurat, s6-V §4.2] | pe un laptop de atelier (măsurat în etapele 4, 18 și 29), imaginea exactă la 50 k forme trece de ~1 s, sau respingi imaginea neclară din timpul gestului → planul B (vectori pe WebGL) |
| T14 | **Fără izolare cross-origin.** Datele spre workere se transferă. Nucleele se scriu peste o bandă cu decalaj `(buffer, rândul de start, rânduri)`, iar halo-ul e calculat din nucleu și testat la margine | COOP + COEP strică login-ul Google (popup și redirect); transferul costă × 1,10–1,23 la blur și × 0,97 la finisare [măsurat, s11] | o bibliotecă cu fire o cere → doar Document-Isolation-Policy, niciodată COOP + COEP |
| T15 | **Workerele nu țin date între joburi** (bazin fără stare + worker de randare). **Mă abat de la s11 §5.2**, care recomanda date ținute în workere: costul măsurat e același, iar varianta fără stare n-are invalidare de cache și recuperare | același cost la blur și la finisare [măsurat, s11 §4.1–4.2] | memoria temporară (+64 MB pe operație la 4000²) devine problemă pe un laptop de 8 GB, sau re-simularea se simte (+60–190 ms) → relieful și simularea primesc worker-proprietar; trecerea e locală, fiindcă nucleele lucrează deja pe benzi |
| T16 | **Datele:** valibot (o declarație → tip + validator cu limite, necunoscutele păstrate, fără `eval`), JSON canonic, migrări pure, undo ca jurnal de comenzi cu valorile vechi și noi | 10/10 defecte la calea exactă, 318 ms sub CSP strict, 3,3 KB gzip; o comandă de undo = ~190 B, față de 96 MB pentru o copie completă [măsurat, s7] | — |
| T17 | **PWA:** Vite + vite-plugin-pwa, cu actualizarea oferită și blocată cât rulează un job; CSP fără `unsafe-eval`, probat pe build-ul servit | 9/9 pași offline, martorul pică [măsurat, s7 §4.7] | — |
| T18 | **Importul și exportul:** câte o ușă pe format, toate spre același model.<br>- **Export DXF R2007 „exact”:** CIRCLE, ARC, ELLIPSE, LWPOLYLINE cu bulge, SPLINE, straturile = rolurile;<br>- **SVG** în mm;<br>- **PDF** cu straturi;<br>- **EPS** (implicit da);<br>- scriitorul **R12** e gata (~80 de linii) și intră doar dacă un program de-al tău nu deschide R2007;<br>- **laserul:** export vectorial pentru LightBurn / RDWorks (laserul tău are Ruida), cu straturi pe culori de putere și viteză și cu feliile pe Z; G-code de laser pentru GRBL în v1.x | export 108/108 și import 65/65, recitite de programe independente [măsurat, s2] | pachetul tău de probă (§8.3) |
| T19 | **Textul:** „înălțimea textului” = înălțimea majusculei, verificată pe conturul lui H; glifele se normalizează; GSUB are rezervă literă cu literă | „20 mm” = 20,000000 mm pe litera N [măsurat, s2] | — |
| T20 | **Senderul:**<br>- sesiune Web Serial cu tranzacții, flux cu numărarea caracterelor;<br>- trimite exact octeții exportați, cu hash;<br>- bariera M6;<br>- procedurile sunt mașini de stare pure;<br>- emulatorul GRBL și transcrierile sunt fixturi | ediția întâi: linia ≥ 128 de caractere bloca fluxul; reluarea avea drept oracol propria funcție [citit, `LECTII.md` §1] | proba din etapa 3: dacă planificatorul GRBL rămâne gol sub încărcare, senderul se mută într-un worker |
| T21 | **Stack-ul:**<br>- TypeScript 7 strict; React 19, subțire peste acțiuni;<br>- fără bibliotecă de stare, de rutare sau de CSS;<br>- `node --test` (Vitest doar dacă fricțiunea e măsurată);<br>- Playwright pe Edge, pe `dist/`;<br>- Python doar în CI | toate sondele au rulat cu `node` simplu [citit, §7 al fiecărei sonde]; Chromium-ul Playwright nu pornește pe mașina asta, Edge da [măsurat] | — |
| T22 | **N axe din prima zi.**<br>- IR-ul, profilul mașinii, contractele și senderul au lista de axe;<br>- pozițiile au cadru (`MachinePos` / `WorkPos`) și stare (`Known` / `Unknown`);<br>- **v1 folosește XYZ**, iar simularea refuză explicit A până în v1.x (`BRIEF.md` §12);<br>- contractele grblHAL și FluidNC poartă cuvântul și unitatea axei A, probate de tine pe controlerul axei A | `BRIEF.md` §12 („senderul și postul trebuie să știe de A”); `LECTII.md` §4.10 | — |
| T23 | **CAM-ul lasă material implicit și are ieșirea mărginită:**<br>- la îndoială se lasă material, nu se sapă;<br>- bugetul de linii al programului e calculat înainte de generare (pre-flight);<br>- plafoanele stau pe artefact (document și program), pentru toate ușile | „implicit se lasă material” a limitat paguba de fiecare dată în ediția întâi [citit, `LECTII.md` §4.5] | — |

### 3.6 Ce nu intră în v1 (tehnic), și ce l-ar aduce înapoi

| Ce nu intră | De ce e sigur | Ce l-ar aduce înapoi |
|---|---|---|
| calculul pe GPU (WebGPU compute) | T11 | T11 |
| SharedArrayBuffer, izolarea cross-origin | T14 | T14 |
| OPFS și workerul de persistență | IndexedDB ajunge, iar `move()` din OPFS e neprobat la cădere [s7 §6] | resurse > ~500 MB sau o salvare > 1 s, măsurate pe fișierele tale |
| WASM compilat de noi (Rust, emsdk, AssemblyScript) | WASM a adus 1,00–1,08× pe cod identic [măsurat, s4 + re-măsurarea mea] | T5 |
| Clipper în produs | T7 | T7 |
| PixiJS, CanvasKit, Three.js pentru desen | PixiJS greșea cercul cu 29 px la 1000 px/mm [măsurat, s6] | — |
| a doua presetare DXF (R12) | T18 | T18 |
| arcul eliptic ca al patrulea tip de segment | T2 | — |
| ciclurile fixe G81/G83 | găurirea desfăcută e identică pe toate controlerele [s8] | v1.x |
| instanțele exportate ca BLOCK / INSERT | exportul desfăcut e exact | vrei piesa editabilă ca bloc în AutoCAD |
| martori GPL în CI (voron8), flo-mat ca nucleu | oracolul cu distanța exactă, al doilea oracol prin eșantionare și controalele negative ajung [s3-V] | două oracole nu cad de acord pe un caz real |

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
| V-carve și incrustația | suprafața ideală din distanța exactă + înfășurătoarea conului, cu capetele graniței testate; **al doilea oracol, prin eșantionare densă**, pe un set mic în CI; jocul pe linia de lipire [s3, s3-V] | raza luată de la algoritm; fără legalizare; deplasare de 0,02 mm |
| relieful și 3D-ul | CL analitic (plan, sferă, cilindru); drop-cutter exact pe triunghiuri; creasta; volumul [s5] | eșantion în nod; fără testul pe muchii sau pe fețe; halo cu un rând mai mic |
| importul și exportul | ezdxf, PyMuPDF, fontTools (doar CI); Ghostscript-WASM doar în test, dacă intră EPS [s2, s12] | raza × 1,0001; „20 mm = em”; totul pe stratul „0” |
| pânza | marginea cercului față de cercul analitic; clicul față de distanțe analitice; aceeași regulă pe ecran, nucleu și `isPointInPath`; Event Timing [s6, s6-V] | martorul PixiJS (prezis 29,149 px); martorii `idle` / `busy` |
| datele | 10 defecte injectate cu calea așteptată; zip-ul citit în Python; procesul omorât la mijlocul salvării; PWA fără rețea [s7] | suprascrierea pe loc; service worker blocat |
| cloud și admin | matricea pe emulator pentru logică; perechi permis / refuzat cu tokenuri reale pe instanța de test (emulatorul nu e banc de securitate) [admin §4.2] | fiecare test sabotat o dată |
| planșele | valorile pe hârtie ale așezării și ale feței de jos [prototip] | sabotajele M1–M6 |
| mașina, fizic | placa de probă, cu instrumentele tale de măsură | — |

**Independența oracolelor noi.** Pentru rândurile R3 fără oracol de sondă (de exemplu anvelopa, canelurile împletite,
sweep, sculptura, texturile, laserul), oracolul și valorile pe hârtie le scrie **o sesiune separată, fără acces la
`src/`**, în etapa dinaintea funcției. Bugetul se aprobă o dată (§8.2).

### 4.2 Poarta invariantelor

O funcție pură, judecată de oracole, rulează pe **fiecare program generat de orice test**. Ce verifică:
1. **pasul:** nicio trecere nu scoate mai mult decât pasul pe adâncime;
2. **piesa:** nimic tăiat din regiunea păstrată, calculată de oracol din geometria de intrare;
3. **rapidele:** niciun G0 prin material;
4. **3D:** nicio scobitură față de modelul exact; creasta măsurată ≤ cea cerută;
5. **limitele:** programul încape în cursele mașinii și în grosimea foii;
6. **controlerul:** fiecare linie e acceptată de contract (coduri, ≤ 70 de octeți, punctul zecimal, arcul valid după
   rotunjire);
7. **scula și axul:** nicio tăiere cu axul oprit sau înaintea pauzei de pornire;
8. **cadrul:** coordonatele programului = document × matricea montajului, verificat pe hârtie pe cele 4 colțuri.

**Când intră fiecare:**
- **1, 3, 5, 6, 7 și 8 intră în etapa 1**, odată cu primul program, pe oracolul din s4;
- **2 intră în etapa 2**, înaintea intrărilor și a urechilor;
- **4 intră în etapa 18**, odată cu primul relief tăiat.

O metrică nouă intră în poartă abia după ce o otravă o înroșește [citit, s4 §5.12].

### 4.3 Otrăvurile

- **Unealta:** în etapa 4 intră dosarul `test/poisons/`, cu câte un patch mic pe modulele critice, și un script care:
  - aplică fiecare patch și verifică pe hash că s-a aplicat (altfel „VOID”);
  - rulează toate suitele;
  - restaurează și verifică arborele față de `HEAD`.
- **Otrăvurile le alege altcineva decât autorul feliei:** o sesiune separată, după etapele 2, 4, 8, 12, 14, 18 și 20,
  cu bugetul aprobat o dată (§8.2).
- **De ce:** în ediția întâi, cele alese de autor au fost prinse 281 din 281, iar dintre cele alese independent au
  supraviețuit 27 din 54 [citit, `LECTII.md` §0].

### 4.4 CI pe niveluri

GitHub Actions, repo public, minute nelimitate. Commit-urile care ating doar `.md` nu pornesc CI-ul.

| Nivelul | Când | Ce rulează | Bugetul | Un roșu… |
|---|---|---|---|---|
| rapid | la fiecare push | `tsc`, regulile de import (cu capcana), paritatea en/ro, unitățile, subseturile oracolelor, poarta invariantelor pe corpusul mic, build-ul, mărimea pachetului, lista albă de licențe | ≤ 5 min | blochează commit-ul următor |
| complet | înaintea fiecărui deploy pe test | corpusurile complete, cititorii Python, e2e pe `dist/` în Edge (PWA offline, CSP real, **amprenta simulării și SHA-256 al programului: Node = Edge**, calea de randare), regulile pe emulator | ≤ 15 min | blochează deploy-ul |
| noapte | cron | otrăvurile alese, cazurile mari (polilinii dense, firma de 1 200 × 400, 5 M de mișcări, relief 4000²), bugetele de performanță relative la martori, perechile pe instanța de test | ≤ 60–90 min | deschide un incident cu gravitate; blochează publicarea doar dacă privește sha-ul de publicat |

- **Prima acțiune a fiecărei sesiuni:** starea lui `main` și a ultimei rulări de noapte. Dacă nu există nicio rulare de
  noapte în ultimele 26 de ore, înseamnă roșu: un cron care nu pornește e invizibil.
- **Un CI roșu pe `main` e incidentul numărul unu.** În ediția întâi, CI-ul a stat mort 16 zile.
- O dependență de rulare GPL / AGPL face CI-ul roșu. Exemplu de capcană: `dwg2dxf` declară ISC, dar e GPL [s12].

### 4.5 Bancul vizual (din etapa 2)

- **Ce e:** Playwright deschide `dist/` pe documentele de referință și scrie o pagină cu **poza și cifra ei, una lângă
  alta**.
- **Martorii:** fiecare poză are un martor negativ care trebuie să arate greșit. În ediția întâi, bancul a raportat verde
  pe 3 sabotaje.
- **Unde îl vezi:** pagina se publică pe instanța de test și o deschizi la sfârșitul etapei.

### 4.6 Placa de probă devine test

1. **Înainte de tăiere:** fișa plăcii are fiecare cotă cu valoarea pe hârtie și toleranța. Programul (octeți + hash)
   intră în `test/placi/Snn/`.
2. **Build-ul plăcii:** placa se taie dintr-un build fixat pe sha-ul etapei (un canal de previzualizare din Firebase
   Hosting), nu din testul care se mișcă.
3. **La mașină:** din etapa 3, senderul nostru salvează transcrierea.
   - **Plăcile 1 și 2** se taie cu senderul pe care îl folosești azi (aplicația veche sau alt program): păstrăm
     programul cu hash și cotele, dar nu și transcrierea.
   - Cele două programe se rejoacă pe emulator în etapa 3.
4. **După tăiere:** treci cotele într-un formular din aplicație sau în chat.
5. **Ce devine test:**
   - documentul plăcii regenerează aceiași octeți;
   - oracolul prezice fiecare cotă;
   - transcrierea se rejoacă pe emulator;
   - o cotă în afara toleranței deschide un defect de gravitate „mașină” (§4.8).
6. **Calibrarea pe lemn** se face o dată, la placa 4, pe șanțurile de calibrare.
   - Măsoară sculele reale: diametrul efectiv, vârful teșit al frezei V, bătaia.
   - Valorile intră în biblioteca de scule, ca date ale sculei. Le citesc și CAM-ul, și oracolul (care primește sculele
     ca date de intrare, nu din cod).
   - Așa oracolul e calibrat pe lemn, cum cere `BRIEF.md` §13, fără să împartă cod cu aplicația.
7. **Placa picată sau întârziată:**
   - cel mult o placă netăiată. La a doua, lucrul trece pe felii fără mașină (interfață, import, admin) până se taie;
   - o placă picată blochează publicarea pe live a etapelor de după ea, până trece retăierea;
   - retăierea intră pe placa următoare, cu cotele ei;
   - **etapa e o cutie de timp:** ce nu încape trece în etapa următoare, iar fișa plăcii se reduce la ce s-a livrat.
8. **Placa de regresie** se definește în etapa 4, după calibrare, și se retaie în tampoane și în etapele fără funcții noi
   de mașină.

**Toleranța de pornire:** ±0,2 mm în plan, ±0,1 mm pe adâncime (§8.2).

### 4.7 Costul dovezii, ținut în frâu

În ediția întâi, dovada făcută după fapt a ajuns să coste cât produsul.
- **Ce măsor săptămânal, din git:**
  - liniile de test la o linie de produs (semnal la peste ~2,5);
  - durata nivelului rapid (≤ 5 min);
  - rândurile de DEVLOG pe felie (≤ 15);
  - commit-urile doar de documentație.
- Peste prag urmează o retrospectivă scurtă la sfârșitul etapei.
- **Fără recenzii adversariale pe fiecare felie și fără audituri „pentru siguranță”.** Independența vine din oracole
  (§4.1), din otrăvurile alese de altcineva (§4.3) și din plăci.

### 4.8 Registrul de defecte și cunoașterea

- **Registrul de defecte:** un fișier structurat (`docs/registru.json`, cu o vedere generată), cu gravitățile
  **mașină > bani > date > restul**.
  - Un defect de gravitate „mașină” sau „bani” trece înaintea oricărei felii noi.
  - **Un verdict, inclusiv o respingere, se dă doar cu probă.**
  - Defectele de securitate nu intră în repo-ul public: stau într-un fișier local, ignorat de git, ca `docs/faza0`.
  - Registrul rămâne o listă de datorii, nu sursa feliilor (`BRIEF.md` §6).
- **Cunoașterea** (`LECTII.md` §4.13):
  - un ADR de o pagină pe decizie, în `docs/adr/`, scris din tabelul de la §3.5;
  - un document pe subsistem, citit de fiecare sesiune;
  - cifrele din documente sunt generate sau asertate, nu narate;
  - comentariile spun ce **este** codul, nu istoria lui;
  - DEVLOG-ul e scurt, cu promptul exact și modelul pe fiecare intrare.
- **Lecțiile devin unelte:**
  - cârligul împotriva `git add -A`;
  - **o singură sesiune scrie în repo la un moment dat** (celelalte lucrează în worktree-uri sau doar citesc);
  - git e sursa de adevăr față de Drive (`CLAUDE.md`).

---

## 5. Planul pe etape

### 5.1 Unitatea și regulile

**Felia de plan** = ~½ zi activă, cu commit și cu proba ei. E unitatea în care se numără tot de aici încolo:
mărimile, ritmul, rezerva, bugetul.
- **Echivalența cu estimatorul:** o felie de plan ≈ 1,17 felii ale estimatorului. Pentru același v1, estimatorul numără
  311 felii, iar planul ~265 (§6).
- **Capacitatea la P50:** ~9 felii de plan pe săptămână. Etapele au 8–9 felii, deci rezerva pe etapă e mică. Coada o
  acoperă cele 3 săptămâni-tampon și cele ~15 felii de rezervă puse în etape.
- **Bugetul unei felii:** ~½ zi activă până la prima măsurătoare. În etapa 1 măsor câte ore are o zi activă (din
  `Started` / `Completed`). Din etapa 2, bugetul se scrie în ore, în fișa etapei.
- **La depășirea de 1,5 × bugetul** (regula din `CLAUDE.md`):
  - felia se parchează pe o ramură WIP;
  - întrebarea intră în lista grupată pentru tine;
  - lucrul continuă cu o felie independentă.

  Oprire completă doar dacă felia mișcă mașina sau la a doua depășire din aceeași etapă. E o interpretare a regulii, deci
  o aprobi tu (§8.2).
- **Feliile le aleg eu din etapă.**
  - La începutul etapei N scriu `docs/etape/etapa-NN.md`: feliile, cu articolul estimatorului și estimarea lor, fișa
    plăcii și rândurile pe care le închide.
  - Etapele 1–4 sunt deja scrise în detaliu la §5.3. Pentru 5–30, pornesc de la tabelul de la §5.4 și de la
    amendamentele de la §5.5.
- **Prima felie a fiecărei etape** trece transcrierea plăcii precedente în teste.
- **Pe live** se publică din etapa 3, la sfârșitul fiecărei etape, după placă și cu confirmarea ta (§4.6 pentru plăcile
  picate).
- **Recalibrarea:** **după etapa 3** (are senderul, un articol R3, și refacerile a două plăci), apoi la fiecare etapă,
  cu formula de la §6.3.
- **DEVLOG:** `Started` / `Completed`, promptul exact și modelul, clasa (R1 / R2 / R3), estimarea în felii, trecerile,
  placa.

### 5.2 Pasul 0 (~3 zile, fără cod de produs)

1. Aprobarea planului, cu deciziile de la §8.1.
2. `docs/PORTARE.md`: verdictul pe fiecare candidat din `LECTII.md` §3.2, față de arhitectura de aici (decizia ta din
   06.10). **Pentru etapa 1 trebuie doar candidații etapelor 1–3**: urechile, intrările, fluxul GRBL, registrul probei.
   Restul poate veni pe parcurs, înaintea etapei lui.
3. `CLAUDE.md` adus la zi (starea, linkul spre plan, regulile de la §5.1) și primele ADR-uri.

### 5.3 Primele patru etape, în detaliu

**Etapa 1 — Un schelet care taie (săptămâna 1).** Ținta: un dreptunghi și un cerc desenate în aplicație ies într-un
G-code pe care îl tai corect, cu originea în oricare colț.
1. **Proba de mediu în Drive:** instalarea, build-ul, nivelul rapid și Edge, de două ori, cu `git status` curat după.
   Dacă apar blocaje sau fișiere readuse, scoatem `node_modules` și artefactele din Drive printr-o joncțiune, cu decizia
   ta scrisă ca ADR.
2. **Scheletul:**
   - Vite, TypeScript, React;
   - CI rapid, `t()` cu paritate, ErrorBoundary + jurnalul local de erori;
   - build determinist, configul de la gazdă;
   - cârligul `git add -A`.
3. **Documentul v0:**
   - schema valibot cu versiune și o singură ușă de încărcare;
   - arborele D cu nivelul doi ascuns; dreptunghi și cerc parametrice, cu matrice;
   - jurnalul de comenzi (undo / redo); IndexedDB, în tranzacție;
   - **registrul de acțiuni cu capabilitatea pe fiecare acțiune** și testul lui; regulile de import, cu capcana.
4. **Geometria v0:**
   - modelul L / A / C cu bulge, transformările exacte;
   - cavalier adus în repo (portul TS, pe forme curate);
   - profilul exterior / interior pe dreptunghi și cerc, cu treceri pe adâncime.
5. **IR-ul v0 pe N axe** (T22), originea (4 colțuri, Z0 sus sau jos, o singură matrice) și postul GRBL v0:
   - 3 zecimale, I/J din startul rotunjit, gărzile;
   - antetul complet, plafonul de 70 de octeți;
   - exportul cu SHA-256.
6. **Oracolul G-code din s4**, adus în `test/oracles/`:
   - valorile pe hârtie pentru cele 4 colțuri;
   - regula de arc GRBL;
   - invariantele 1, 3, 5, 6, 7 și 8 în CI.
7. **Pânza v0:**
   - stratul de vectori în worker, pe pânză software;
   - pan, zoom, selecție și mutare prin acțiuni;
   - oracolul pânzei (marginea cercului) în aceeași felie.

   Stratul WebGL2 vine în etapa 2.
8. **Instanța de test:** exportul Firestore (îl confirmi tu), apoi deploy doar de hosting; fișa plăcii 1.

**Placa 1** (MDF 18, freză Ø6; fișierul A cu originea stânga-jos, B cu originea dreapta-sus):
- insula dreptunghiulară: **100,00** ±0,2 și **60,00** ±0,2;
- gaura: **Ø30,00** ±0,2;
- A: marginile la **20,00** ±0,3 de marginea stângă și de cea de jos;
- B: marginile la **20,00** ±0,3 de marginea dreaptă și de cea de sus;
- adâncimile: **3,00** ±0,1 (o trecere) și **8,00** ±0,1 (două treceri de 4).

Confirmă: matricea originii, sensul arcelor, oracolul G-code. **Live:** nu.

**Etapa 2 — Profilul complet, pe geometrie exactă (săptămâna 2).** Ținta: decupezi o piesă reală, cu urechi, intrări
și dog-bone, desenată sau importată din SVG.
1. **Gărzile cavalier:** curățarea intrării și validarea structurală a ieșirii, cu corpusul curat din s1 / s1-V în CI.
2. **Regiunea păstrată, cu oracolul întâi** (invarianta 2); profilul pe orice contur (exterior, interior, pe linie,
   deschis pe o parte); sensul de tăiere.
3. **Urechile** ca modificator Z(s), portate cu cele 88 de verificări pe hârtie. Vârful urechii se măsoară de la fundul
   materialului, nu de la adâncimea cu supracursă (`docs/PORTARE.md` §3.1).
4. **Intrările și ieșirile** alese față de regiunea păstrată, plus rampa (portate).
5. **Dog-bone și T-bone.**
6. **Importul SVG**, cu biarcele (T6) și bugetul de toleranță (`docs/PORTARE.md` §3.3) și cu fațada PathKit minimă
   (reuniunea + R3) pentru normalizarea `nonzero` de la ușă:
   - DOMParser inert;
   - unități, viewBox, transformări;
   - plafonul de mărime.
7. **Stratul WebGL2** (foaia, traseul ca LINE_STRIP) și panoul de proprietăți.
8. **Bancul vizual v1**, cu martorii lui.
9. **Fișa plăcii 2.**

**Placa 2** (MDF 12, Ø6):
- piesa 120 × 80, cu colțuri R10: **120,00** și **80,00** ±0,2, colțul **R10** (leră);
- urechea: grosimea **2,0** ±0,2, lungimea **8,0** ±0,5;
- gaura cu dog-bone: **40,00 × 30,00** ±0,2; cepul 40 × 30 intră fără forță;
- logoul SVG cu lățimea declarată 80 mm: **80,00** ±0,3;
- nicio urmă de intrare în piesă peste 0,1.

Confirmă: regiunea păstrată (defectul care a stat ascuns 105 zile în ediția întâi), urechile pe hârtie. **Live:** nu.

**Etapa 3 — Senderul, postul cu contracte, observabilitatea, primul live (săptămâna 3).** Ținta: tai din aplicația
nouă, fără alt program, pachetul GRBL pe mașina ta, iar aplicația ajunge pe live.
1. **Senderul:**
   - sesiune Web Serial cu tranzacții (`$#`, `$G`, `$$`);
   - flux cu numărarea caracterelor; refuzul liniilor peste 70 de octeți la încărcare;
   - trimite exact octeții exportați și arată hash-ul;
   - pozițiile pe N axe, cu cadru și cu stare `Known` / `Unknown`.
2. **Jog, zero și WCS:**
   - jog; zero XY / Z; **palparea Z cu placa de contact** (pentru T4);
   - G54–G59;
   - bariera M6: oprire la Z sigur, ax oprit, jog permis, reluare.
3. **Emulatorul GRBL de test și transcrierile ca fixturi:**
   - 100 000 de linii trimise, cu 0 pierderi;
   - rejucarea programelor plăcilor 1 și 2.
4. **Postul condus de contracte ca date**, pentru familia GRBL (GRBL 1.1, grblHAL, FluidNC):
   - 4 strategii de schimbare a sculei;
   - pauza în unitatea controlerului;
   - elicea; inch cu 5 zecimale.
5. **P0, partea 1:**
   - funcțiile în TypeScript;
   - `errorLogs`, `logClientError` (cu plafon de rată), `logServerError`;
   - poarta „doar personalul”, cu login Google;
   - App Check cu token de debug, doar pe test.
6. **P0, partea 2:** fila Erori; Diagnoza minimă; amprenta `meta/deployment`; scriptul primului owner (`staff`);
   marcajele de rulare.
7. **P1:**
   - workflow-ul de publicare (sha fixat, mediul `live` cu aprobarea ta, WIF);
   - backup programat, cu alarmă.
8. **Comutarea** (repetată întâi pe test):
   - pe test se instalează întâi build-ul vechi, apoi cel nou;
   - se verifică preluarea de către service worker, stocarea veche neatinsă și revenirea din istoricul de hosting;
   - pe live: PITR activ, exportul Firestore, lista funcțiilor vechi de șters (arătată ție), lista extensiilor înainte
     și după;
   - registrul probei: secretul `TRIAL_LEDGER_KEY` și colecția `trialLedger` rămân; cel mai vechi `expiresAt` se
     citește de pe live, ca termen pentru curățare (`docs/PORTARE.md` §3.6).
9. **Pachetul T0–T7 pentru GRBL**, generat de post din IR; fișa plăcii 3; **prima recalibrare**.

**Placa 3** (fișierele T din s8 Anexa B, pe GRBL 1.1h, prin senderul nou):
- T1: canalul cercului Ø50, cu exteriorul **Ø56,00** și interiorul **Ø44,00** ±0,2, la fel la 2 × 180° și la 4 × 90°;
  distanța dintre centre **100,00** ±0,2;
- T2: linia de 200 mm la F1000 în **12,0 s** ±0,5; pauza după M3 de **2,0 s** ±0,3;
- T3: gaura elicoidală Ø20 cu 3 spire: adâncimea **3,0** ±0,1, diametrul **20,0** ±0,2;
- T4: Ø6 apoi Ø3,175, prin bariera M6 și palparea Z: diferența de adâncime **0,0** ±0,1;
- T7: 4 găuri în pași de 2 mm: adâncimea **10,0** ±0,1;
- o linie de 80 de caractere e refuzată la încărcare, cu numărul ei.

**Live:** **da, primul.** Admin **P0** și **P1** închise.

**Etapa 4 — Simularea și verificarea; calibrarea (săptămâna 4).** Ținta: vezi pe ecran exact ce verifică testele, iar
sculele sunt calibrate o dată pe lemn.
1. Migrările pure vN → vN+1, cu corpus de aur (de acum există date pe live).
2. **Nucleul de simulare CPU (2 felii):** dale mici într-un atlas, calcul exact pe celulă, benzi pe bazin; amprenta Node
   = browser în e2e.
3. Afișarea simulării în WebGL2.
4. **Poarta invariantelor completă** și unealta de otrăvuri (§4.3), cu cele 7 otrăvuri din s4.
5. Estimarea timpului cu modelul planificatorului GRBL și rezumatul jobului, comparate cu cronometrul plăcilor 2 și 3.
6. **Contractele NcStudio, RichAuto, Syntec, Mach3 / Mach4** și **pachetul de atelier** generat de aplicație (T0–T7,
   fișele cu setările controlerului și valorile pe hârtie).
7. **PWA:** pornește fără rețea; actualizarea e oferită și blocată cât rulează un job; CSP fără `eval`, probat pe
   build-ul servit.
8. **Măsurarea pe un laptop de atelier** (bancul s6-V, cu pragurile din T13).
9. Fișa plăcii 4 și placa de regresie definită.

**Placa 4** (șanțurile de calibrare din s4 §5.13):
- șanț plat Ø6 la z = −3: lățimea **6,00** ±0,1, adâncimea **3,00** ±0,1;
- bilă Ø6 cu vârful la z = −2: lățimea la suprafață **5,657** ±0,15;
- V90 la z = −2: lățimea **4,000** ±0,15; V60: **2,309** ±0,15;
- arc G3 cu r = 25 și Ø6: canalul **Ø56,00 / Ø44,00** ±0,2;
- plonjare Ø6 la 5 mm: **Ø6,00** și **5,00** ±0,1;
- timpul pe cronometru față de estimare: ±10 %.

**Închide:** Simulare 3D (3 axe), Timpul estimat, Calcul pe mai multe fire. **Live:** da. **Pachetul pleacă la
ateliere.**

### 5.4 Etapele

„Live” = publicare pe live la sfârșitul etapei, după placă și cu confirmarea ta.

**Calendarul:**
- săptămânile se numără de la prima etapă;
- dacă etapa 1 pornește pe 19.10.2026, pauza de sărbători (21.12.2026–03.01.2027) cade după etapa 9 și nu se numără;
- săptămâna 10 începe pe 04.01.2027, iar etapa 30 se încheie pe ~20.06.2027, la ritmul nominal.

| Săpt. | Etapa | Ținta | Închide (rânduri de prag, funcții, admin) | Placa probează | Live |
|---:|---|---|---|---|---|
| 1 | 1 | **Un schelet care taie** (§5.3) | — (pornește profilul) | matricea originii, sensul arcelor | nu |
| 2 | 2 | **Profilul complet pe geometrie exactă** + importul SVG | Profil cu urechi, intrări, sens; dog-bone / T-bone | regiunea păstrată, urechile, intrările | nu |
| 3 | 3 | **Senderul, postul cu contracte, observabilitatea**, primul live | admin **P0** + **P1** | fișierele T0–T7 pe GRBL | **da (primul)** |
| 4 | 4 | **Simularea și verificarea;** calibrarea; celelalte contracte | Simulare 3D (3 axe); Timpul estimat; Calcul pe mai multe fire | șanțurile de calibrare | da; **pachetul la ateliere** |
| 5 | 5 | Buzunar, găurire, ordinea, frezele, animația | Buzunar cu mai multe freze; Găurire; Ordinea + un fișier pe sculă; Animația traseului; §10 Găurire în pași | buzunar + rest, insulă, găuri în pași, elice | da |
| 6 | 6 | **Editorul de vectori** | Vectori, noduri, boolean, offset, aliniere; Transformare și copiere | dreptunghi rotunjit rotit, reuniunea a două cercuri, rețele | da |
| 7 | 7 | Textul și gravarea pe linie | Text, text pe cale, fonturi | „20 mm” = 20,00 mm; diacritice; text pe arc | da |
| 8 | 8 | **V-carve** și gravarea inteligentă | V-carve (+ fund plat); Gravare pe linie + smart engrave | crestele pe hârtie, fundul plat | da |
| 9 | 9 | **Importul și exportul cu vectori reali**; reparațiile cavalier | Export 2D cu vectori reali (importul: DXF, PDF, AI compatibil PDF) | DXF-urile de referință + fișierele tale deschise în programele tale | da; runda 2 la ateliere |
| 10 | 10 | Repararea, conversia, cotele, transformarea traseelor | Verificarea și repararea vectorilor; Cote; Tăierea și conversia; Transformarea traseelor | curba în arce, decuparea, traseul oglindit și rotit | da |
| 11 | T1 | **Tampon:** coada de defecte, recalibrarea, placa de regresie | — | placa de regresie | da |
| 12 | 11 | **Planșele:** piese, foi, instanțe, Multi-Plate, lista de tăiere | Sheets + Multi-Plate; §10 Listă de tăiere | așezarea pe rânduri, vărsarea pe foaia 2, plăcuțele din CSV | da |
| 13 | 12 | Incrustațiile | Inlay în V și cu pereți drepți | dopul intră; jocul pe linia de lipire | da |
| 14 | 13 | Mașina, partea a doua | Senderul (complet); §10 Senzor de lungime, Colțul XY, Override + jurnal, Planarea | senzorul, palparea XY, reluarea, planarea | da |
| 15 | 14 | Conturile, dreptul de acces, proba de 14 zile; poarta devine „personal + invitați” | admin **P2** | regresia pe live, dintr-un cont în probă | da; **proba închisă pornește în săptămâna 15** |
| 16 | 15 | Tichetele, configurarea, fișa de lucru, șabloanele, copiile în cloud | Șabloane + lot; §10 Fișa de lucru; admin **P2+** | șablonul aplicat în lot pe 3 nume | da |
| 17 | 16 | Caneluri, teșire, Raised Round, freze desenate | Caneluri / bevel / Raised Round; Freze de profil desenate; Biblioteca de freze (completă) | canelura, încrucișarea, roundover | da |
| 18 | 17 | Textura din freză, ghilotina (grila și așezarea aliniată), burghiele multiple, exportul pentru laser (LightBurn / RDWorks) | Textura din freză; Ghilotină + drillbanks (găurirea multiplă pe simulare și pe octeți) | textura, grila ghilotină; tăietura și gravura pe laserul tău Ruida | da; runda 3 la ateliere |
| 19 | 18 | **Relieful 1:** nucleul, relieful din imagine, prelucrarea 3D din relief | Relief din imagine; Alinierea pixelilor; Litofanie; Combinarea; Rezoluția 4000²; Straturi; Relief ↔ 16 biți (Degroșarea și Finisarea pornesc, pe relief) | pana de gri, calota, litofania | da |
| 20 | 19 | Relieful 2: editorul de forme, textul, operațiile, analiza | Editor de forme; Relief din text; Operații; Estompare și pante; Analiza; Suprafață / volum / greutate | cupola, rotunjitul, planul înclinat, greutatea | da |
| 21 | 20 | **3D din modele:** import, câmp conservativ, zone, decupare | Import 3D; Zone; Decupare 3D; **Degroșare 3D; Finisare paralelă** (închise pe STL) | STL-ul de referință în trepte + semisfera | da |
| 22 | T2 | **Tampon** | — | placa de regresie | da |
| 23 | 21 | 3D avansat; extrudare, sweep, spin, turn | Coliziunea cu mandrina; Zonele inaccesibile; Model înalt din felii; Extrudare; Two Rail / Spin / Turn | modelul din felii, profilul extrudat, rozeta | da |
| 24 | 22 | Relieful 3: îmbinări, straturi bitmap, sculptura, anvelopa | Îmbinări; Straturi bitmap; Sculptare; Deformare în anvelopă | îmbinările, textul în anvelopă | da |
| 25 | 23 | Relieful 4: două fețe, bas-relieful, conturul | Relief pe două fețe + întoarcere; Bas-relief din STL; Conturul vectorial al reliefului | gaura prin față + lamajul din spate | da |
| 26 | 24 | Relieful 5: texturi, export STL, biblioteca, laserul 3D (felii exportate pentru LightBurn / RDWorks) | Texturi; Export STL / OBJ; Clipart de relief; Laser | țesătura, STL-ul închis; o piesă în felii pe laserul tău | da |
| 27 | 25 | Trasarea din imagine; EPS și AI vechi, cu cititor propriu | Trasare din imagine (importul avansează) | logoul trasat; un EPS real | da |
| 28 | 26 | Importul, partea 2: Corel, WMF (+ EMF peste prag), DWG ca mesaj | Import 2D (fără DGK / PIC, scoase pe 07.10) | fișierele tale reale | da |
| 29 | 27 | **Facturarea** (Stripe în mod de test) și partea legală | admin **P3** | regresia dintr-un cont plătit (test) și dintr-unul cu proba expirată | da |
| 30 | 28 | Cele două interfețe, ghidul de pornire | Două interfețe; §10 Ghid la prima pornire; admin **P4** | un job făcut doar prin asistent | da |
| 31 | T3 | **Tampon** | — | placa de regresie | da |
| 32 | 29 | Atelierele, regresia, laptopul de atelier | **cele 7 contracte probate** (sau decizia ta de la §8.1) | regresia completă (10 cote din 10 etape) | da |
| 33 | 30 | **Lansarea** | lista de lansare (`BRIEF.md` §8) | piesa unui străin, făcută fără ajutor | **lansarea** |

**Acoperirea:**
- **Cele 65 de rânduri:** harta rând → etapă e cea din `propunere-simplitate.md` §5.3 (A 11, B 14, C 24, D 10, F 6 =
  65), verificată independent de criticul de acoperire, cu două mutări:
  - „Animația traseului” se închide în etapa 5;
  - „Degroșare 3D” și „Finisare paralelă” se închid în etapa 20.
- **Cele 8 funcții din §10:** etapele 5, 11, 13 (patru funcții), 15 și 28.
- **Lista de lansare din `BRIEF.md` §8** se închide în etapele 3, 9, 12, 27, 28, 29 și 30, plus punctele continue (Stare
  + Commit pe fiecare rând de prag).

### 5.5 Amendamentele față de propunerea „simplitate”

Aceste reguli se aplică la scrierea fișelor etapelor 5–30. Propunerea rămâne doar istoric.

1. **A / D:** modelul ales la aprobare intră din etapa 1 (§8.1).
2. **Calibrarea:** constantele de pe placa 4 intră în biblioteca de scule și le citesc și CAM-ul, și oracolul (§4.6).
3. **Recalibrarea:** după etapa 3, apoi la fiecare etapă (nu după 3 și 6).
4. **Observabilitatea:** P0 în etapa 3 (§3.4).
5. **Invariantele:** cele din §4.2, la momentele scrise acolo.
6. **Fundația din etapa 1:** registrul de acțiuni cu capabilitățile și tipurile pe N axe (§5.3); capabilitățile reale
   pe niveluri intră în etapa 27.
7. **Învelișul interfeței,** împărțit pe etape:
   - panoul de proprietăți în etapa 2;
   - proiectele și setările în etapele 4–5;
   - tema în etapa 6;
   - fișierul `.cncvs` în etapa 7.
8. **Reparațiile cavalier** rămân în etapa 9, cu criteriul din T5. Până atunci, garda de ieșire face orice eșec
   explicit.
9. **Exportul EPS** (+1 felie, etapa 9) și **copiile în cloud** (+3 felii, etapa 15; partea care nu încape trece în 16),
   dacă păstrezi implicitele.
10. **Oracolele noi pentru rândurile R3** fără sondă le scrie o sesiune separată, în etapa dinainte (§4.1).
11. **Laptopul de atelier** se măsoară în etapele 4, 18 și 29.
12. **Contractele grblHAL și FluidNC:** le probezi tu pe controlerul axei A (T0, T1, T2, T4), în etapa 4 sau imediat ce
    ai controlerul.
13. **Primele 4 etape** sunt scrise la §5.3 și înlocuiesc detaliul din propunere.
14. **Proba închisă** (decizia de la aprobare):
    - din etapa 14, poarta e „personal + invitați”;
    - din săptămâna 15, ~1 felie pe săptămână merge pe răspunsurile și reparațiile pentru atelierele din probă;
    - la T2 și T3, întrebarea despre lansare revine cu cifrele din probă.
15. **Laserul:** export vectorial pentru LightBurn / RDWorks, cu straturi pe culori de putere și viteză și feliile pe
    Z. Placa se taie pe laserul Ruida al owner-ului.

### 5.6 Momentele-cheie și drumul critic

**Prima piesă:** sfârșitul săptămânii 1 (placa 1). Dacă nu încape, placa alunecă la începutul săptămânii 2, iar ce
nu încape trece în etapa 2.

**Primul live:** săptămâna 3, odată cu P0 și P1.
- Aplicația veche dispare de pe live. Codul ei rămâne în GitHub și local.
- **Din etapa 1 nu se mai publică din repo-ul vechi pe proiectul de test; din etapa 3, nici pe live.** Repo-ul vechi se
  arhivează în etapa 3 (`BRIEF.md` §14).
- Pentru lucrul tău de zi cu zi există o alternativă la §8.2.

**Posturile**, drumul critic din `BRIEF.md` §15. Cele 7 contracte și cine le probează:

| Contractul | Cine probează | Când |
|---|---|---|
| GRBL 1.1 | tu, pe mașina ta | etapa 3 |
| grblHAL, FluidNC | tu, pe controlerul axei A (T0, T1, T2, T4) | etapa 4, sau când ai controlerul |
| NcStudio | un atelier | pachetul în săptămâna 4; runda 2 în 9; runda 3 în 18 |
| RichAuto | un atelier (probabil în 2 runde) | la fel |
| Syntec | un atelier | la fel |
| Mach3 / Mach4 | un atelier (sau unul pentru fiecare) | la fel |

- Rezultatele intră în teste în etapele 12 și 29.
- Ce rămâne neprobat la etapa 26 devine decizia ta (§8.1).
- **De ce pachetul pleacă în săptămâna 4, nu în 3:** contractele celorlalte controlere se scriu după ce familia GRBL e
  probată pe mașina ta, ca greșelile evidente să fie prinse acasă. Rămân ~29 de săptămâni de marjă până la lansare.

**Adminul.** Momentul l-am ales eu, cum ai cerut.

| Fila | Etapa | Ce intră în v1 | Ce se lasă sau se schimbă față de vechi |
|---|---|---|---|
| Erori (fostele Crash-uri) | 3 | un singur jurnal, scris de server, pentru client, server, declanșatoare și joburi; gruparea; redeschiderea automată; contul ascuns | fără poarta de consimțământ (§8.2) |
| Diagnoză (nouă) | 3, crește | instanța, sha-ul, App Check, backup-ul, e-mailul, joburile, erorile nerezolvate, regulile publicate, retenția, identitatea juridică | — |
| Operare, cu publicarea | 3 (mecanismul), 15 (panoul) | diferența test / live, butonul, jurnalul | ghidurile rămân în repo, cu link din admin |
| Utilizatori | 14 | căutarea pe server, dosarul, planul, proba, dezactivarea, exportul și ștergerea GDPR din aceeași listă de colecții | panoul de credite (§8.2) |
| Audit | 14 | rândul în aceeași tranzacție cu schimbarea, cu pre-imaginea; restaurarea configurării | — |
| Admini | 14 | `staff/{uid}`, cererile de acces, niciodată fără owner | rolurile nu mai stau în claim-uri |
| Puls | 14 → 28 | plăcile, pe măsură ce apar sursele lor | plăcile de AI, până la AI |
| Tichete | 15 | atașamentele în Storage, răspunsul pe e-mail, alerta cu marcaj | — |
| Config | 15 | oprirea site-ului, mentenanța, anunțul, alertele, prin callable cu audit | partea de AI (până la AI); prețurile creditelor (§8.2) |
| Venituri | 27 | MRR din catalogul unic, eticheta „MOD DE TEST”, cozile de eșecuri | — |
| Analiză | 28 | pâlnia, adopția din id-urile acțiunilor, perioada aleasă | „ultimele 1 000 de evenimente” |
| CAM | 28 | simplificat, din fluxul de evenimente | „ce vede AI-ul”, până la AI |

**Vectorii reali** (`BRIEF.md` §16.2; definiția ai confirmat-o pe 07.10):
- modelul de curbă în etapele 1–2;
- editorul în etapa 6;
- importul și exportul, cu cititori independenți și cu pachetul tău deschis în programele tale, în etapa 9;
- conversia în etapa 10;
- anvelopa în etapa 22.

Aproximarea inevitabilă e declarată la T2.

### 5.7 Dacă alegi A în loc de D

- **Modelul:** `Doc { foi: [{ stoc, rădăcină }] }`. Restul arhitecturii nu se schimbă.
- **Etapa 11** scade cu ~2 felii: fără instanțe și fără „Desprinde”. Multi-Plate face copii: 60 de noduri în loc de 2
  la 30 de plăcuțe [măsurat, prototip].
- **Etapa 23** crește cu ~1 felie: fața de jos devine o planșă-copie oglindită și cere un avertisment de aliniere. În
  prototip, spatele rămânea decalat cu 50 mm fără avertisment.
- **Prețul pentru tine:** schimbarea textului pe 12 suporturi cere 26 de gesturi în loc de 6, iar buzunarul pe spate 39
  în loc de 9 [măsurat, prototip].
- **Momentul:** dacă alegi A după etapa 1, se adaugă ~2 felii de migrare. După etapa 3, se migrează și documentele de pe
  live.

---

## 6. Estimarea

### 6.1 Modelul și cifrele

**Modelul** (`arhitectura/estimare.md` §6, din ritmul măsurat al ediției întâi):

```
săptămâni = 1 (pasul 0) + felii / ((zile active − 0,5) × felii pe zi − refacerile de pe placă)
```

Valorile de pornire:
- **5,4 zile active pe săptămână** [măsurat: 97 din 127 de zile cu commit];
- **2,5 felii de estimator pe zi activă** [dedus din măsurat];
- **0,5 zile pe etapă** pentru placă [dedus];
- **1,5 felii de refacere** pe placă [dedus].

Mărimile au clase de risc: R1 × 1,3, R2 × 1,6 și R3 × 2,2 la P90.

| | P10 | **P50** | P80 | **P90** |
|---|---:|---:|---:|---:|
| Săptămâni, de pe 07.10.2026 | 18,7 | **33,2** | 50,0 | **63,7** |
| Data orientativă | — | **~28.05.2027** | ~22.09.2027 | **~27.12.2027** |

- **Calendarul planului**, la ritmul nominal: etapa 1 din 19.10.2026, plus pauza de sărbători, înseamnă lansarea pe
  ~20.06.2027. Deci **P50 ≈ sfârșitul lui mai – mijlocul lui iunie 2027**.
- **Mărimea în felii de plan:** ~265, cu implicitele de la §8.2. În ea intră scheletul „simplitate” (254), registrul de
  acțiuni, bancul, unealta de otrăvuri, învelișul interfeței, comutarea, exportul EPS și copiile în cloud. Rezerva în
  etape e ~15 felii.
- **Potrivirea cu P50** ține doar prin echivalența de la §5.1 (o felie de plan ≈ 1,17 felii de estimator). Prima
  recalibrare o verifică.
- **Proba închisă** (decisă la aprobare) adaugă ~1 felie pe săptămână din săptămâna 15, adică ~18 felii (~2
  săptămâni). Mărimea devine ~283 de felii de plan. Recalibrarea măsoară costul real.

### 6.2 Ce mută rezultatul

Ce mută rezultatul cu peste 20 % [`estimare.md` §7]:
- zilele active pe săptămână (5,4 → 4,0: +47 %);
- feliile pe zi (2,5 → 1,8: +45 %; 2,5 → 3,3: −26 %);
- mărimea totală (× 1,3: +29 %);
- toate articolele R3 la × 2,2 (+21 %).

**Deciziile deschise (EPS, GPU, Rust, A / D) mută fiecare sub 3 %.** Durata o decid ritmul și continuitatea.

### 6.3 Recalibrarea

În felii de plan, după etapa 3, apoi la fiecare etapă:
1. **ritmul observat:** `r_obs` = (felii acceptate + felii de refacere din plăci) ÷ (zile active − 0,5 × numărul
   plăcilor). Așa timpul plăcii nu se scade de două ori;
2. **ritmul nou:** `r_nou` = (10 × 2,1 + z × r_obs) ÷ (10 + z), unde 2,1 felii de plan pe zi activă e prior-ul (= 2,5
   felii ale estimatorului ÷ 1,17), iar z sunt zilele active observate;
3. **mărimile:** pe fiecare clasă, `k_c` = felii consumate ÷ felii estimate, pe articolele închise. Sub 5 articole
   închise într-o clasă se folosește `k` global;
4. **refacerea:** media pe placă, din plăcile observate;
5. **P50 și P90** se recalculează cu modelul de la §6.1;
6. **factorul R3** rămâne cel inițial (× 2,2 la P90) până se închide primul articol R3 (senderul, etapa 3).

**Pragurile:**
- dacă P50 recalculat se mută cu peste 20 % față de cel aprobat, primești noua estimare, pârghiile și întrebarea despre
  beta;
- dacă după 3 etape `r_obs` < 1,5 felii de plan pe zi activă (≈ pragul de 1,8 al estimatorului), urmează o discuție de
  proces, nu doar o estimare nouă.

### 6.4 Pârghiile și porțile externe

**Pârghiile tale, dacă estimarea crește.** Le arăt cu costul lor; nimic nu iese fără tine.
- **beta:** o probă închisă cu 1–2 ateliere după etapa 14 (bucla 2D completă, conturile; §8.1);
- EPS / AI vechi doar ca mesaj: −7 felii;
- WMF ca mesaj: −2;
- texturi, țesătură și clipart de relief: −5;
- îmbinările de relief: −3;
- sweep, spin, turn: −3;
- laserul, dacă n-ai laser de probă: −5;
- modelul înalt din felii: −2.

**Porțile externe** (nu sunt în săptămâni și pot amâna lansarea după ce v1 e gata):
- atelierele;
- CAEN-ul pentru Stripe live;
- entitatea juridică, adresa de firmă și Termenii;
- DNS-ul pentru e-mail;
- străinul pentru testul de lansare.

Toate **pornesc în săptămânile 1–2** (`BRIEF.md` §7). Termenele-limită sunt la §8.3.

---

## 7. Riscurile

| # | Riscul | Semnalul timpuriu | Ce facem |
|---:|---|---|---|
| 1 | **Drumul lung fără utilizatori externi** (riscul principal din `BRIEF.md` §15) | P80 recalculat peste 50 de săptămâni; tu, singurul care judecă, obosești | întrebarea despre beta acum (§8.1) și din nou la tampoanele T1 și T2; plăcile săptămânale |
| 2 | **Ritmul real e sub estimare** (dovada se scumpește ca în august) | după etapa 3, `r_obs` < 1,7 felii de plan pe zi (−20 % față de prior); o felie > 1,5 × bugetul | recalibrarea; parcarea feliei și întrebarea grupată; pârghiile |
| 3 | **Atelierele întârzie** | la sfârșitul etapei 2 n-ai ateliere pentru cele 5 controlere | pachetul pleacă în săptămâna 4, cu trei runde; fișierele sunt mici și rulează întâi în aer; ce rămâne neprobat devine decizia ta |
| 4 | **Nucleul geometric cade pe fișierele reale** | după etapa 9, suita densă are eșecuri explicite > 1 % | gărzile T5; eșec explicit, niciodată traseu tăcut; întrebarea Rust → WASM |
| 5 | **PathKit înghețat** (o incompatibilitate viitoare) | segmente nepotrivite de R3 pe corpus; WASM-ul nu se încarcă într-un Chrome nou | R3 după fiecare operație; fațada permite CanvasKit fără alt cod |
| 6 | **Laptopurile din ateliere sunt mai slabe** decât mașina de măsură | la etapa 4, pe laptopul de atelier, imaginea exactă la 10 k forme > 300 ms | LINE_STRIP, bugete alese la pornire, nivel de detaliu; criteriul planului B |
| 7 | **Relieful (24 de rânduri) e subestimat** | etapele 18–19 depășesc cu peste 2 felii | tamponul T2; ordinea de la riscul mic la cel mare; pârghiile |
| 8 | **Primul live strică ceva vechi** (funcții, extensii, regiuni, datele locale) | lista de ștergere conține funcții ale extensiilor; comutarea de pe test pică | felia de comutare repetată întâi pe test; PITR și exportul înainte; deploy doar pe ținte numite |
| 9 | **CAEN, firma sau Termenii nu vin la timp** | fără CAEN până în etapa 20; fără entitate până în etapa 25 | Stripe gata în mod de test; tu decizi lansarea fără încasare (`BRIEF.md` §8) |
| 10 | **Contextul se pierde între sesiuni și modele** | o sesiune redeschide o decizie luată; DEVLOG-ul crește mai repede decât codul | §4.8; ADR-uri; `CLAUDE.md` la zi; fișele etapelor; feliile doar din etapă |
| 11 | **Mediul: repo-ul în Google Drive** (build-ul, `node_modules`) | proba de mediu din etapa 1 pică; fișiere readuse după build | joncțiune în afara Drive-ului, cu ADR; `git status` la începutul sesiunii |

---

## 8. Deciziile tale

Lista ta are cel mult 5 lucruri **deschise**. „Deschis” = ceva ce trebuie să faci tu acum. Deciziile cu implicit nu
sunt deschise dacă ești de acord.

### 8.1 La aprobare: îmi trebuie răspunsul tău explicit

**Răspunsurile tale (07.10, la aprobare):**

| # | Decizia | Răspunsul |
|---:|---|---|
| 1 | A sau D | **D, decis pe 08.10** (ADR 0024), cu cele trei alegeri din prototip |
| 2 | Beta sau v1 complet | **probă închisă după etapa 14** (din săptămâna 15) |
| 3 | Rândul de import și exportul AI | **toate patru recomandările**: DGK / PIC scoase, DWG doar mesaj, EPS și AI vechi cu cititor propriu, fără export AI |
| 4 | Fără placă | **găurirea multiplă** pe simulare și pe octeți; **laserul pe laserul tău Ruida (CO2)**, printr-un export vectorial pentru LightBurn / RDWorks |
| 5 | Posturile neprobate la etapa 26 | implicitul: niciunul nu iese neprobat fără decizia ta de atunci |

Textul întrebărilor, așa cum au fost puse:

1. **Planșele: A sau D?** Recomand **D** (prototipul, scenariile 5 și 7).
   - `BRIEF.md` §9 cere ca planul să se aprobe cu modelul ales, fiindcă schema planșelor se îngheață în etapa 1.
   - Plus trei alegeri ale prototipului, toate cu varianta din prototip ca recomandare:
     - ce e „piesă” pe foaie: orice pui pe foaie;
     - Ctrl+D: copie separată;
     - mânerele unei instanțe cu surori schimbă toate instanțele, cu banda de avertizare.
2. **Beta sau v1 complet?** Ai decis pe 06.10 „lansare abia la v1 complet”, iar `BRIEF.md` §15 te lasă să reconsideri
   după estimare: P50 ~mai–iunie 2027, P90 ~decembrie 2027.
   - **Recomandarea mea: o probă închisă cu 1–2 ateliere prietene, după etapa 14 (săptămâna 15).**
     - Ce conține: doar 2D (profil, buzunar, V-carve, incrustații, foi, senderul), cu conturi invitate, fără plată.
     - De ce: e singurul mod de a scăpa devreme de riscul principal (§7, riscul 1) și de „owner-ul singurul judecător”
       din ediția întâi.
     - Costul: câte ~1 felie pe săptămână pentru răspunsuri și reparații.
   - Implicit rămâne decizia ta de pe 06.10, dacă nu spui altfel.
3. **Rândul de import și exportul AI** (fără răspunsul tău explicit, rândul rămâne întreg):
   - **DGK și PIC: scoase din prag**, cu motivul scris (fără specificație publică; regula ta interzice reverse
     engineering-ul);
   - **DWG: doar mesaj** „salvează ca DXF” și un convertor gratuit în v1; citirea nativă, de decis în v1.x (ODA costă
     7 500 $ în primul an, cele gratuite sunt GPL);
   - **EPS și AI vechi:** interpretor propriu, limitat, cu refuz explicit.
     - s12 estima 2–3 săptămâni; planul ia ~7 felii, fiindcă interpretorul de probă, de 493 de linii, a citit deja exact
       un EPS real din Illustrator. E un articol R3.
     - Recomandarea finală o confirmăm pe fișierele tale reale (§8.3).
   - **WMF:** cititor propriu (~2 felii; s12 estima 3–5 zile pentru WMF + EMF). EMF intră peste prag.
   - **Exportul AI: nu** (Illustrator și Corel deschid PDF, SVG și EPS).
4. **Funcțiile care nu se pot proba pe placa ta** (`BRIEF.md` §8 cere placa pentru orice funcție care mișcă mașina):
   - **găurirea cu mai multe burghie:** n-ai bancă de burghie. Recomand **acceptarea pe simulare și pe octeții
     postului**, sau caut un atelier care are;
   - **laserul:** ai un laser? Dacă nu, recomand un atelier cu laser, și abia după aceea acceptarea pe simulare.
5. **Posturile neprobate la etapa 26.** Recomand: **niciun post nu iese „documentat, neprobat”** fără decizia ta de
   atunci, pe cazul concret. `BRIEF.md` §12 cere fiecare post probat.

### 8.2 Decizii cu implicit (le aplic dacă nu spui altfel)

| # | Decizia | Implicitul (recomandarea mea) | Termen |
|---:|---|---|---|
| 6 | Toleranța mașinii pentru plăci | ±0,2 mm în plan, ±0,1 mm pe adâncime | etapa 1 |
| 7 | Live doar pentru personal până la lansare (publicul vede „în curând”) | da | etapa 3 |
| 8 | Lucrul tău de zi cu zi după săptămâna 3 | o copie locală a aplicației vechi pe calculatorul de la mașină, verificată înainte de săptămâna 3. Alternativa e să mutăm primul live după etapa în care aplicația nouă îți acoperă lucrul | etapa 2 |
| 9 | Observabilitatea din etapa 3, nu din 1 (§3.4) | da | etapa 1 |
| 10 | Exportul EPS | da (+1 felie) | etapa 9 |
| 11 | Copiile proiectelor în cloud (urcare / coborâre `.cncvs`, cu versiuni, fără sincronizare) | da: +3 felii (estimatorul: 3; propunerea „simplitate”: 4–6) | etapa 14 |
| 12 | Creditele de export din ediția întâi | nu (`BRIEF.md` §4 are doar abonamente) | etapa 14 |
| 13 | Jurnalul de erori fără consimțământ, cu contul ascuns și păstrat 90 de zile | da, cu o frază în politica de confidențialitate (de verificat juridic) | etapa 3 |
| 14 | La primele publicări, aprobarea se dă în GitHub; panoul din admin vine în etapa 15 | da | etapa 3 |
| 15 | Tichetele le folosești tu primul, pentru raportările de pe test | da | etapa 15 |
| 16 | Offsetul unei forme cu curbe, în desen | din arce (același motor ca CAM-ul) | etapa 6 |
| 17 | Formele care se ating în aceeași operație V-carve | se unesc, cu vindecarea raportată | etapa 8 |
| 18 | Clipartul de relief | un set de pornire de ~30 de reliefuri, făcute cu uneltele noastre | etapa 24 |
| 19 | Rust compilat în WASM pentru offset | nu, cât timp trece criteriul din etapa 9 | etapa 9 |
| 20 | Parcarea feliei la depășire (§5.1) | da | etapa 1 |
| 21 | Sesiunile independente de dovadă: otrăvurile după etapele 2, 4, 8, 12, 14, 18, 20 și oracolele noi pentru rândurile R3 | da, cu bugetul aprobat o dată: ~3–4 M tokeni pe tot drumul, fiecare sesiune ~0,3 M, spusă dinainte | etapa 2 |
| 22 | Colecțiile aplicației vechi din baza de date | rămân neatinse și închise prin reguli; după lansare decizi ștergerea sau arhivarea | etapa 14 |
| 23 | Ce conține fiecare nivel de abonament | de decis înainte de codul de facturare (`BRIEF.md` §4); fără implicit | etapa 20 |

### 8.3 Coada ta (acțiuni, cel mult 5 deschise)

| Acțiunea | Starea | Termen |
|---|---|---|
| Alegerea A / D, după ce încerci prototipul (planul e aprobat pe 07.10, fără ea). Prototipul e pe instanța de test: <https://cncvectorstudio-test--planse-ad-m9ycx3rc.web.app> (canal de previzualizare, expiră pe 06.11.2026) | **închisă pe 08.10: D**, cu cele trei alegeri din prototip (ADR 0024) | felia 1.7 |
| Lista de cumpărături pentru plăci: MDF 18 / 12 / 6; frezele plate Ø6 și Ø3,175, V60, V90, bilă Ø6, un roundover; șubler, șubler de adâncime, lere de rază și de joc, comparator; placa de contact pentru Z | **deschisă** | etapa 1 (placa de contact: etapa 3) |
| Atelierele: câte unul pentru NcStudio, RichAuto, Syntec, Mach3 / Mach4, cu versiunea controlerului | **deschisă** | căutarea în săptămâna 1, confirmările până la sfârșitul etapei 2 |
| PITR pe live | **deschisă** | înainte de etapa 3 |
| Pașii lungi deja în curs: entitatea juridică + adresa de firmă, DNS-ul pentru e-mail, CAEN | **în curs**, pornite în săptămânile 1–2 | DNS: etapa 15; entitatea și Termenii: etapa 25; CAEN: extern |
| Confirmi exportul Firestore pe test | **făcut pe 08.10** (bucket-ul `cncvectorstudio-test-backup`, `us-central1`); adresa principală de test servește aplicația nouă | etapa 1 |
| `docs/PORTARE.md`: verdictele pentru candidații etapelor 1–3 | **scris pe 07.10**; se aplică la pornirea etapei 1, dacă nu obiectezi | etapa 1 |
| Formatul `.tdb`: biblioteca ta trece o dată, din aplicația veche, prin CSV (`docs/PORTARE.md` §4) | se deschide la etapa 4 | etapa 5 |
| Fișierele tale reale: 30–50 de fișiere primite în ultimele luni, mai ales din CorelDRAW; doar local, ignorate de git | se deschide în săptămâna 2 | etapa 9 (EPS: etapa 25) |
| Pachetul de export deschis în programele tale (`docs/faza2/sonde/s2-export-import/pachet-owner/CITESTE.md`) | se deschide în săptămâna 2 | etapa 9 |
| Copia locală a aplicației vechi, verificată pe calculatorul de la mașină (decizia 8) | se deschide în săptămâna 2 | etapa 3 |
| Cheia reCAPTCHA Enterprise pentru domeniul de test; mediul `live` în GitHub; WIF pe ambele proiecte | se deschide la etapa 3 | etapa 3 |
| Arhivarea repo-ului vechi pe GitHub | se deschide la etapa 3 | etapa 3 |
| Un laptop de atelier (sau accesul la el) | se deschide la etapa 4 | etapa 4 |
| Controlerul axei A (grblHAL / FluidNC) pentru T0, T1, T2, T4 | când îl ai | înainte de etapa 29 |
| Senzorul de lungime legat la pinul de palpare; un palpator pentru colțul XY | se deschide la etapa 12 | etapa 13 |
| Un străin dintr-un atelier, pentru testul de lansare | se deschide la etapa 28 | etapa 29 |

---

## 9. După aprobare

1. **`docs/PORTARE.md`** (pasul 0). Fiecare candidat din `LECTII.md` §3.2 primește un verdict:
   - portat aproape neschimbat;
   - adaptat la interfețele de aici;
   - rescris, cu vechiul ca martor;
   - lăsat.

   Verdictul ține cont de dovezile vechi, de potrivirea cu modelul de aici, de cost și de licențe. Nimic portat nu intră
   fără probele noi.
2. **`CLAUDE.md`:** starea „Faza 2 încheiată”, linkul spre plan, regulile de la §5.1.
3. **ADR-urile**, din tabelul de la §3.5.
4. **Etapa 1 pornește** cu răspunsurile de la §8.1 și cu implicitele de la §8.2.
