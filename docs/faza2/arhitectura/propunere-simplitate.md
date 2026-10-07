# Arhitectura cncvs2: propunerea „simplitate întâi”

Faza 2, tranșa 2. Una din trei propuneri independente. Unghiul ei: **cele mai puține tehnologii, pachete, straturi și
piese în mișcare care încă îndeplinesc toate cerințele.** Fiecare recomandare a sondelor care adaugă complexitate e
pusă la îndoială; ce scot sau amân din v1 are motivul și condiția care l-ar aduce înapoi.

Data: 07.10.2026. Fără cod. Documentul nu descrie slăbiciuni ale aplicației vechi încă live.

**Marcaje.** Fiecare afirmație are sursa:
- **[măsurat]** = cifră rulată de o sondă sau de o verificare, cu fișierul;
- **[citit]** = documentație, cod sau decizie scrisă, cu fișierul;
- **[dedus]** = raționamentul meu, nerulat.

Prescurtări pentru surse: `s1` = `sonde/s1-geometrie/RAPORT.md`, `v1` = `s1-geometrie/VERIFICARE.md`, `s2` =
`sonde/s2-export-import`, `s3` / `v2` = `s3-vcarve` (raport / verificare), `s4` = `s4-simulare`, `s5` = `s5-relief`,
`s6` / `v3` = `s6-panza` (raport / verificare), `s7` = `s7-date-offline`, `s8` = `s8-posturi`, `s11` = `s11-izolare`,
`s12` = `s12-formate`, `adm` = `admin/RAPORT.md`, `pp` = `prototip-planse/RAPORT.md`, `faza0/NN` = rapoartele locale ale
ediției întâi.

**Pe scurt.**
- **30 de etape săptămânale + 3 săptămâni-tampon = ~33 de săptămâni**, cu **254 de felii** planificate (interval
  28–39 de săptămâni). Lansarea: ~începutul lui iunie 2027, dacă etapa 1 pornește pe 19.10.2026.
- **Prima piesă tăiată din aplicația nouă: sfârșitul etapei 1.** Prima publicare pe live: sfârșitul etapei 3. Pachetul
  de probă pentru ateliere pleacă la sfârșitul etapei 4.
- **Două feluri de workere** (un bazin fără stare + un worker de randare), **zero calcul pe GPU în v1**, **o singură
  bază de date locală** (IndexedDB), **un singur motor de geometrie pentru „ce e înăuntru”**, **un singur post**, **un
  singur scriitor DXF** până când un program real al owner-ului cere al doilea.
- Toate cele 65 de rânduri v1, cele 8 funcții din `BRIEF.md` §10, adminul P0–P4 și lista de lansare din §8 au etapa
  lor (§5.3). Ce rămâne pe masa owner-ului: §5.6 și §8.

---

## 1. Ideea de bază

1. **Un singur drum îngust care taie din prima săptămână, apoi lărgit etapă cu etapă.** Drumul e mereu același:
   document → operație → IR-ul traseului → post → G-code → mașină. Nu construim o a doua cale pentru același lucru.
2. **Un fapt, o autoritate.** Documentul stă pe firul principal și e singura sursă de adevăr. Tot calculul greu e o
   funcție pură, rulată într-un bazin de workere care primește date și întoarce rezultate. Workerele nu țin date
   care contează.
3. **O tehnologie intră doar cu o măsurătoare care o cere.** Ce n-a cerut nicio măsurătoare rămâne afară din v1:
   WebGPU pentru calcul, memoria partajată, OPFS, WASM compilat de noi, Clipper, a doua presetare DXF. Pentru fiecare
   e scrisă condiția care l-ar aduce înapoi (§3.5).
4. **Dovada e mică, fixă și scrisă înaintea funcției.** Refolosim oracolele sondelor, valorile pe hârtie și o poartă
   de invariante care rulează pe orice program generat de teste. Placa de probă săptămânală e judecătorul final. Nu
   adăugăm ritualuri după livrare (`LECTII.md` §2.3, cauza 2).
5. **Infrastructura vine când o cere produsul.** Excepția e ce costă puțin doar dacă e pus din prima zi: build
   determinist, configul citit de la gazdă, schema cu versiune, `.gitattributes`, `t()` cu paritate (`LECTII.md`
   §2.3, „Ce înseamnă pentru proces”).
6. **Fiecare etapă are o țintă de produs scrisă înainte și o placă tăiată la sfârșit.** Feliile se aleg din etapă,
   nu dintr-un registru (`BRIEF.md` §6). Asta răspunde direct cauzei 1 din ediția întâi: lipsa țintei.

---

## 2. Glosarul

Substantivele domeniului, fixate o dată. Termenii tehnici sunt explicați la prima folosire, în text.

| # | Cuvântul | Ce înseamnă, într-o frază |
|---:|---|---|
| 1 | **document** | Tot proiectul: piesele, foile, operațiile, sculele folosite și resursele (fonturi, imagini, STL), într-un singur arbore cu versiune. |
| 2 | **nod** | Un element al arborelui documentului; fiecare nod are o matrice de plasare (mutare, rotire, scalare, înclinare). |
| 3 | **element** | Un nod care desenează ceva: vector, text, relief, model 3D sau cotă. |
| 4 | **grup** | Un nod care ține alte noduri și le mută împreună; grupurile se pot pune unul în altul. |
| 5 | **ramă** | Un grup cu contur propriu și inele paralele cu el (de exemplu o canelură la 10 mm); conținutul ei nu-și schimbă niciodată singur mărimea. |
| 6 | **piesă** | Un obiect fizic de tăiat (o ușiță, o plăcuță), cu arborele lui și operațiile lui. |
| 7 | **foaie** | O placă de material reală pe care se așază piese; are dimensiuni, grosime, fibră și două fețe. |
| 8 | **instanță** | O piesă așezată pe o foaie: poziție, rotire și câmpuri proprii (de exemplu un nume din CSV), nu o copie a desenului. |
| 9 | **față** | Partea de sus sau de jos a foii; prelucrarea pe spate se face după întoarcerea foii. |
| 10 | **operație** | Un pas de prelucrare (profil, buzunar, V-carve...) care referă noduri și poartă scula și parametrii ei. |
| 11 | **montaj** | Ce vede mașina la un job: foaia, fața, originea (colțul de zero și Z0) și profilul mașinii; transformarea document → mașină e o singură matrice, într-un singur loc. |
| 12 | **sculă** | O freză (sau un burghiu, un laser) cu silueta reală h(r); operația ține un instantaneu al ei. |
| 13 | **material** | Esența și proprietățile ei (densitate, avansuri recomandate), cu sursa fiecărei cifre. |
| 14 | **regiunea păstrată** | Partea din material care trebuie să rămână neatinsă; o citesc intrările, urechile și verificările. |
| 15 | **IR-ul traseului** | Reprezentarea intermediară a traseului: mișcări tipizate (linie, arc, elice) cu Z la capete, sculă, operație și etichete; toți o citesc, nimeni nu reparsează G-code. |
| 16 | **post** | Singura bucată care transformă IR-ul în text G-code pentru un controler. |
| 17 | **contract de dialect** | Regulile scrise ale unui controler (comentariu, unități, arce, pauză, schimbarea sculei), ca date, cu sursa pe fiecare câmp. |
| 18 | **profilul mașinii** | Ce știm despre o mașină anume: controlerul, cursele, turațiile, Z-ul sigur, strategia de schimbare a sculei. |
| 19 | **câmp de înălțimi** | O grilă cu o cotă Z pe celulă; îl folosesc simularea, relieful și prelucrarea 3D. |
| 20 | **oracol** | Cod scris separat, fără importuri din aplicație, care știe răspunsul corect și judecă aplicația. |
| 21 | **invariantă** | O regulă care trebuie să țină pe orice program: niciodată mai adânc decât pasul pe trecere, nimic tăiat din regiunea păstrată, nicio scobitură în model. |
| 22 | **placă de probă** | Ce taie owner-ul la sfârșitul etapei, cu 5–10 cote date dinainte și valorile lor pe hârtie; e aprobarea etapei. |
| 23 | **felie** | O schimbare mică, cu commit, care se termină cu ceva de încercat (~o jumătate de zi de lucru). |
| 24 | **etapă** | ~O săptămână de felii, cu o țintă scrisă înainte și o placă de probă la sfârșit. |
| 25 | **capabilitate** | Dreptul de a folosi o funcție; fiecare acțiune îl cere, iar dreptul de acces al contului se calculează doar pe server. |

---

## 3. Arhitectura

### 3.1 Harta modulelor

**Un singur depozit, un singur build.** Aplicația e un singur pachet npm, cu dosare în `src/`. Funcțiile Firebase
au al doilea `package.json`, fiindcă așa le cere Firebase [citit, `adm` §5.1]. Nu folosim workspaces, proiecte
TypeScript legate sau un al treilea pachet [dedus: fiecare adaugă configurare fără să adauge o garanție].

Coloana „deține” spune faptul pentru care modulul e **singura** autoritate.

| Dosar | Ce deține (un fapt, o autoritate) | Unde rulează |
|---|---|---|
| `src/geom/` | Geometria exactă: contururi din linie, arc, cubică; formele parametrice; transformările; offsetul (cavalier, adus în repo); booleanul (PathKit + R3); biarcele; distanța exactă; regula de umplere; vindecarea regiunii; testul de clic | bazin (operațiile), fir principal (doar clicul și casetele) |
| `src/model/` | Documentul: schema (valibot), versiunea, migrările, arborele, comenzile și jurnalul lor (undo), `rev` | fir principal |
| `src/text/` | Fonturile, așezarea literelor, înălțimea majusculei, normalizarea glifelor | bazin |
| `src/relief/` | Straturile de relief pe dale, operațiile pe relief, editorul de forme, sculptura | fir principal (pensula), bazin (operațiile globale) |
| `src/ir/` | Tipurile IR-ului traseului și verificatorul de invariante (funcție pură) | oriunde |
| `src/cam/` | Operațiile → IR: profil, buzunar, găurire, V-carve, incrustații, caneluri, textură, laser, 3D; biblioteca de scule și materialele | bazin |
| `src/post/` | Postul unic, contractele de dialect, formatorul de numere | bazin sau fir principal |
| `src/sim/` | Nucleul de simulare (câmp pe dale) și estimarea timpului | bazin |
| `src/io/` | Ușile de import (SVG, DXF, PDF, EPS, WMF, plase 3D) și de export (DXF, SVG, PDF, STL/OBJ, fișierul `.cncvs`) | bazin (SVG se parsează pe firul principal, inert) |
| `src/machine/` | Senderul: sesiunea Web Serial, fluxul, procedurile (palpare, schimbare de sculă, reluare) ca mașini de stare | fir principal |
| `src/jobs/` | Bazinul de workere: lista de joburi, anularea, progresul, bazinul de bufere | fir principal + workere |
| `src/canvas/` | Cele trei straturi ale pânzei: WebGL2 (foaia, traseele, câmpurile), vectorii (worker de randare), interacțiunea | fir principal + workerul de randare |
| `src/ui/` | Componentele React, uneltele (mașini de stare pure), **registrul de acțiuni**, `t()` și dicționarele en/ro, câmpul numeric unic | fir principal |
| `src/cloud/` | Contul, citirea dreptului de acces, raportarea erorilor, tichetele | fir principal |
| `src/admin/` | Adminul: câte un dosar pe filă, încărcat leneș pe ruta `/admin` | fir principal |
| `src/app/` | Pornirea, PWA-ul, ErrorBoundary, legarea modulelor | fir principal |
| `shared/` | Catalogul unic: capabilitățile, nivelurile, lista albă de prețuri, codurile de eroare; folosit și de client, și de server | ambele |
| `functions/src/` | Serverul: erorile, diagnoza, dreptul de acces, proba, facturarea, adminul pe domenii, publicarea | Cloud Functions |
| `test/oracles/` | Oracolele: zero importuri din `src/` | Node (CI) |
| `test/oracles-py/` | Cititorii independenți pentru export/import: ezdxf, PyMuPDF, fontTools | Python (CI) |
| `test/placi/` | Plăcile de probă: fișierul de aur (octeții G-code + hash) și cotele măsurate de owner | Node (CI) |

**Registrul de acțiuni** (`LECTII.md` §4.7) e stratul dintre interfață și restul. Fiecare acțiune are: id, eticheta
(cheie `t()`), `activă → motiv`, capabilitatea cerută și `run`. Barele, meniurile, tastatura, asistentul pas cu pas și
analiza din admin sunt vederi ale aceluiași registru [citit, `adm` §4.1 „Analiză”: evenimentul de adopție = id-ul
acțiunii].

### 3.2 Direcțiile permise ale importurilor

O regulă de lint (ESLint, `no-restricted-imports`, în nivelul rapid al CI) le impune. „—” = nu importă nimic din `src/`.

| Modulul | Are voie să importe |
|---|---|
| `geom` | — (doar bibliotecile aduse în repo) |
| `model` | `geom` |
| `text`, `relief` | `geom`, `model` |
| `ir` | — |
| `cam` | `geom`, `model`, `text`, `relief`, `ir` |
| `post` | `ir`, `shared` |
| `sim` | `ir` |
| `io` | `geom`, `model`, `text`, `relief` |
| `machine` | — (primește linii de text și hash-ul lor) |
| `jobs` | `geom`, `model`, `text`, `relief`, `ir`, `cam`, `sim`, `io`, `post` |
| `canvas` | `geom` (tipurile listelor de desen) |
| `ui` | `model`, `canvas`, `jobs` (prin fațada lui), `machine`, `cloud`, `shared`, iar din `geom` doar testul de clic și casetele |
| `cloud` | `shared` |
| `admin` | `cloud`, `shared`, iar din `ui` doar componentele de bază și `t()` |
| `app` | tot |
| `functions/src` | `shared` |
| `test/oracles` | nimic din `src/` |

Trei interdicții explicite, fiecare legată de un defect din ediția întâi:
- `ui` nu importă `cam` și nici geometria grea: acțiunile cheamă joburi [citit, `LECTII.md` §2.2, clasele 3 și 4];
- `post` nu importă `model` sau `cam`: postul vede doar IR-ul și matricea montajului [citit, `LECTII.md` §2.2, clasa 2];
- `sim` și oracolul nu împart cod: oracolul citește textul G-code [citit, `s4` §5.11].

### 3.3 Fluxurile de date

**1. De la desen la mașină.**
- Operația referă noduri (prin id), ține un instantaneu al sculei și parametrii ei.
- Acțiunea „calculează” trimite în bazin doar nodurile referite (serializate) și resursele lor, după hash. Workerul
  întoarce IR-ul ca tablouri tipizate transferate (Float64 pentru coordonate).
- IR-ul stă în cache după hash-ul (parametrii operației + `rev`-urile nodurilor + scula). E un derivat, nu se salvează
  [citit, `s7` §5.5].
- Postul primește IR-ul, montajul (cu matricea document → mașină) și contractul de dialect. Iese text G-code.
- Același text merge în fișier sau în sender. Senderul trimite exact octeții exportați și arată hash-ul lor [citit,
  `LECTII.md` §4.10].

**2. De la document la ecran.**
- Firul principal calculează listele de desen pentru vectori (contururile în lume, după `rev`) și le trimite
  workerului de randare doar pe cele schimbate.
- Workerul de randare desenează pe o pânză software și predă o imagine (ImageBitmap = o imagine gata de afișat, mutată
  între fire fără copie) [măsurat, `v3` §4.4: clicul se vede în 24 ms].
- Traseele merg în WebGL2 ca LINE_STRIP (linie continuă de 1 pixel), în float32 relativ la originea unei dale
  [măsurat, `v3` §4.2; `s6` §5.5].
- Câmpurile (simularea, relieful) merg în WebGL2 ca texturi, încărcate doar pe dalele schimbate [măsurat, `s6` §5.6,
  `s5` §4.6].

**3. Relieful.**
- Stratul de relief e Float32 pe dale de 256 × 256, rare (o dală lipsă = o înălțime constantă) [citit, `s5` §5.1].
- Se salvează ca Uint16 cu scară pe dală, adică exact formatul imaginii gri pe 16 biți [măsurat, `s5` §3: eroare
  0,15–0,46 µm].
- Pensula lucrează pe firul principal, pe dalele atinse (0,27–2,61 ms pe aplicare) [măsurat, `s5` §4.6].
- O operație globală (netezire, combinare mare, câmpul pentru CAM) pleacă în bazin pe benzi cu margine (halo) și se
  întoarce transferată. Stratul e blocat cât rulează operația [dedus].

**4. Stocarea și fișierul de proiect.**
- **O singură bază IndexedDB:** documentul (JSON canonic, cu chei sortate), pointerul „versiunea curentă”, jurnalul
  de comenzi și resursele ca `Blob`, cu cheia = SHA-256 [măsurat, `s7` §4.3–4.4].
- Salvarea automată scrie versiunea nouă și pointerul într-o singură tranzacție. La o cădere, versiunea veche rămâne
  întreagă [măsurat, `s7` §4.4, strategia S4].
- Fișierul `.cncvs` e zip-ul determinist din `s7`: manifest + document canonic + resursele după hash, identic octet cu
  octet în orice fus orar [măsurat, `s7` §4.5].

**5. Cloud-ul.**
- Contul (Firebase Auth), dreptul de acces calculat doar pe server (`entitlements/{uid}`, scris numai de funcții),
  rolul de personal din `staff/{uid}`, jurnalul de erori, tichetele, configurarea prin callable cu audit, plata prin
  extensia Stripe, e-mailul prin extensia Trigger Email (§3.7).

### 3.4 Firele: ce rulează unde

Un **worker** e un fir de lucru separat al paginii; firul principal nu se blochează cât lucrează el.

| Firul | Ce face | De ce |
|---|---|---|
| **Firul principal** | documentul și comenzile, React, uneltele, testul de clic, stratul de interacțiune, stratul WebGL2, senderul, pensula de relief, IndexedDB | documentul trăiește într-un singur fir: o copie a lui costă ~0,6 s la 50 000 de noduri [măsurat, `s7` §6] |
| **Bazinul** (N = numărul de nuclee − 1, cel mult 16), **fără stare** | orice operație de geometrie (boolean, offset, biarce, text), tot CAM-ul, benzile simulării, operațiile globale pe relief, plasele 3D, parsarea și scrierea fișierelor | calcul pur; scalarea s-a măsurat până la 16 fire [măsurat, `s4` §4.4]; rezultat identic bit cu bit la orice N [măsurat, `s4` §4.5] |
| **Workerul de randare** (unul) | vectorii exacți, pe pânză software, predați ca imagine | singurul mod care lasă liberă și pagina, și ecranul [măsurat, `v3` §4.4] |
| **Service worker-ul** (generat de vite-plugin-pwa) | pornirea fără rețea, actualizarea oferită | [măsurat, `s7` §4.7: 9 din 9 verificări, martorul pică] |

**Bazinul e fără stare, iar asta e o abatere conștientă de la `s11`.** `s11` recomandă ca datele grele să stea în
workere (varianta c). Aleg varianta b (benzi transferate dus-întors), din trei motive:
- **costă la fel:** netezirea × 1,10 (b) față de × 1,13 (c), finisarea × 0,97 față de × 0,96 [măsurat, `s11` §4.1–4.2];
- **autoritatea rămâne una:** documentul. Cu varianta c, salvarea, undo-ul și exportul ar trebui să ceară datele
  asincron de la workere [dedus, sprijinit pe `s11` §6, „Lanțuri de operații”];
- **un worker fără stare se poate reporni oricând,** fără să piardă nimic [dedus].

Ce adaug din `s11`: un bazin de bufere pentru benzi, nu alocare la fiecare operație. Vârfurile de 345–517 ms din
rulările scurte au o cauză nestabilită, iar alocările de 64 MB pe operație sunt suspectul principal [citit, `s11`
§4.1].

Cache-urile din workere (fonturi, plase după hash) sunt permise: se pot pierde oricând fără efect asupra rezultatului.

### 3.5 Stack-ul

**Ce intră** (versiunile sunt cele probate în sonde; restul e marcat):

| Ce | Versiunea | Pentru ce | Dovada |
|---|---|---|---|
| TypeScript | 7.0 | tipuri stricte, `erasableSyntaxOnly` | folosit de `s7` [citit, `s7` §3.2] |
| Vite + vite-plugin-pwa (Workbox) | 8.3 + 2.0 (7.4) | build-ul unic, workerele, PWA cu actualizare oferită | [măsurat, `s7` §4.7] |
| React | 19 | interfața | **neprobat în Faza 2** [dedus: standardul cel mai cunoscut; logica nu stă în componente, deci riscul e mic] |
| valibot | 1.5.0 | schema → tipul și validatorul, fără `eval` | [măsurat, `s7` §4.2: 3,3 KB gzip; 311 ms la 50 000 de noduri, la fel sub CSP] |
| fflate | 0.8.3 | fișierul `.cncvs` | [măsurat, `s7` §4.5] |
| cavalier_contours (portul TS, adus în repo) | 0.1.1 + reparațiile 0.8/0.9 | offsetul exact pe linii și arce | [măsurat, `s1` §4.2–4.4; `v1` §5] |
| PathKit (Skia PathOps) | 1.0.0, adus în repo, înghețat | booleanul | [măsurat, `v1` §4.6–4.7] |
| delaunator + robust-predicates | 5.1.0 + 3.0.3 | axa medială pentru V-carve | [măsurat, `s3` §3; `v2` §5] |
| flatbush | 4.6.2 | indexul spațial pentru clic | [măsurat, `s6` §4.5] |
| opentype.js | 2.0.0 | fonturile | [măsurat, `s2`, `s3`] |
| svgpath | 2.6.0 | căile SVG (cu `Number()` pe stegulețul arcului) | [măsurat, `s2` §3] |
| dxf | 5.3.1 | citirea DXF (păstrează ponderile NURBS) | [măsurat, `s2` §3] |
| @tarikjabiri/dxf | 2.9.0, versiune fixată | scrierea DXF R2007 | [măsurat, `s2` §3; test pe codurile de grup] |
| pdf-lib / pdfjs-dist | 1.17.1 / 6.4.299 | scrierea / citirea PDF | [măsurat, `s2` §3] |
| firebase (client) | 12.19 | Auth, Firestore, App Check | [citit, `adm` §3; `s11` §7] |
| firebase-functions / firebase-admin | 7.4 / 14.5 | serverul, în TypeScript | [citit, `adm` §3] |
| Node | 26 | dezvoltare, teste, CI | [citit: rularea tuturor sondelor] |
| **Doar test:** playwright-core 1.63, Python 3.13 cu ezdxf 1.4.4, PyMuPDF 1.28, fontTools 4.66 | — | e2e și cititorii independenți | [măsurat, `s2` §4] |

**Ce lipsește intenționat din v1.** Fiecare rând spune de ce e sigur și ce l-ar aduce înapoi.

| Ce nu intră | Cine îl propusese | De ce e sigur să lipsească | Ce l-ar aduce înapoi |
|---|---|---|---|
| **Calculul pe GPU (WebGPU compute)** | `s5` §5.3 | Bazinul CPU ajunge: finisarea pe 2,67 M de puncte în 2,2 s pe 16 workere, netezirea în 83–102 ms [măsurat, `s5` §4.5, `s11` §4.1–4.2]. GPU-ul nu e identic bit cu bit cu procesorul (până la 0,18 µm) și CI-ul n-are placă video [măsurat, `s4` §4.5]. Ar cere a doua implementare, un test diferențial pe o mașină cu GPU și recuperarea după pierderea dispozitivului [dedus, `s5` §6] | un job obișnuit care durează > 10 s pe calculatorul owner-ului, măsurat; atunci intră în v1.x, ca accelerator al acelorași nuclee pe bandă |
| **SharedArrayBuffer și izolarea cross-origin** | `s5` §3 | Transferul costă × 1,10 la netezire și × 0,97 la finisare [măsurat, `s11` §2]. COOP + COEP strică login-ul Google, și prin popup, și prin redirect [măsurat, `s11` §4.5] | o bibliotecă WASM cu fire; atunci doar `Document-Isolation-Policy`, niciodată COOP + COEP [citit, `s11` §5.7] |
| **Workere care țin date** | `s11` §5.2 | același cost (§3.4) | memoria temporară în plus (+64 MB pe operație la 4000²) devine o problemă măsurată pe un laptop de 8 GB |
| **OPFS și workerul de persistență** | `s7` §5.5 | IndexedDB cu `Blob`: 100 MiB scrise în 218 ms, citiți în 84 ms, intacți la cădere [măsurat, `s7` §4.3–4.4]. Mutarea atomică `move()` din OPFS e neprobată la cădere [citit, `s7` §6] | resurse de peste ~500 MB sau o salvare de peste 1 s, măsurate pe fișierele owner-ului |
| **A doua presetare DXF (R12, „compatibil”)** | `s2` §5.2 | R2007 „exact” îndeplinește `BRIEF.md` §16.2 („curba iese curbă”); R12 transformă curbele în arce (866 de arce în loc de 248 de Bézier) [măsurat, `s2` §4] | unul din programele owner-ului nu deschide R2007; scriitorul R12 are ~80 de linii și e gata în sondă |
| **Clipper în produs** | `s3` §4 | Normalizarea regiunii se face cu același motor ca ecranul și clicul (§3.6, punctul 5): un singur răspuns la „ce e înăuntru” | ruta din nucleu pică pe corpusul cu muchii aproape comune din `v2` §4(b); atunci Clipper intră închis în pasul de pregătire al V-carve-ului |
| **WASM compilat de noi** (Rust, emsdk, AssemblyScript) | `v1` §5.9, `s4` | WASM a adus 1,05–1,08× pe cod identic [măsurat, `s4` §4.4]. Un toolchain în plus pe calculatorul owner-ului și în CI | criteriul de ieșire al etapei 9 (§3.6, punctul 9) pică |
| **A doua cale de desen pentru vectori** (redesen exact pe firul principal, planul B pe WebGL) | `s6` §5.4, §4.8 | Workerul de randare e singurul mod la nivelul martorului, pe ambele plăci video [măsurat, `v3` §4.4]. Cu el, cele două trepte din `s6` devin una | un laptop real de atelier care face imaginea exactă de 50 k forme în peste ~1 s [citit, `v3` §5.5] |
| **Arcul eliptic ca al patrulea tip de segment** | `s2` §5.1 | Matricea de pe fiecare nod ține elipsa exactă (§3.6, punctul 2) | — |
| **Validarea documentului într-un worker la încărcare** | `s7` §5.3 | 0,3 s la 50 000 de noduri, o dată, cu un ecran de încărcare [măsurat, `s7` §4.2] | cel mai mare fișier real al owner-ului se încarcă în peste 1 s |
| **Traseul ținut în workere între rulări** | `s11` §5.2 | +60…190 ms pe o rulare a simulării [măsurat, `s11` §4.3] | timpul de re-simulare devine vizibil pentru owner |
| **Martori în plus în CI** (voron8 sub GPL, flo-mat) | `s3` §5.2 | Oracolul cu distanța exactă, valorile pe hârtie și controalele negative ajung [măsurat, `v2` §4] | două oracole care nu cad de acord pe un caz real |
| **Ciclurile fixe G81/G83** | `s8` §5.9 | găurirea se scrie desfăcută în G0/G1, identic pe toate controlerele [citit, `s8`] | — (v1.x) |
| **Instanțele exportate ca BLOCK/INSERT** | `pp` §5.5 | exportul desfăcut e exact | owner-ul vrea piesa editabilă ca bloc în AutoCAD |
| **Biblioteci de stare, de i18n, de rutare, de CSS, un kit de componente** | — | documentul are propriul jurnal; `t()` cu paritate există de la ediția întâi [citit, `LECTII.md` §3.1]; trei rute | — |
| **Runner de teste propriu sau un framework de test** | ediția întâi | `node --test`, cu tipurile scoase nativ de Node 26; toate sondele au rulat cu `node` simplu [citit, §7 al fiecărei sonde] | fricțiune măsurată în prima săptămână; atunci vitest, cu aceleași fișiere |
| **Three.js, PixiJS, CanvasKit pentru desen** | `s6` §3 | WebGL2 propriu a ținut 5 M de segmente și câmpurile la 60 Hz [măsurat, `s6` §4.3, `v3` §4.2] | — |
| **Un al doilea serviciu pentru plată** | — | extensia Stripe rămâne (`BRIEF.md` §7); lista albă de prețuri se impune în reguli, probată în perechi | — |

### 3.6 Cele nouă puncte deschise

**1. Regula de umplere: `evenodd`, una pentru tot documentul, cu normalizare la uși.**
- *Decizia:* ecranul, clicul și scula folosesc aceeași regulă, `evenodd` (o gaură e gaură oricum ar fi orientată).
  Nicio formă nu are regula ei.
- *Ușile normalizează o dată:*
  - textul: fonturile sunt `nonzero` prin construcție, iar unele au contururi suprapuse. La generarea conturului,
    glifa trece printr-o reuniune `nonzero` (PathKit `simplify` + R3). După ea, `evenodd` și `nonzero` dau același
    rezultat;
  - SVG-ul cu `fill-rule="nonzero"` și contururi suprapuse: aceeași reuniune, la import;
  - DXF, PDF, EPS: orientarea e arbitrară, deci `evenodd` e chiar regula potrivită.
- *Dovada:* în DXF și SVG orientarea e arbitrară, iar cu `nonzero` o gaură orientată ca exteriorul se umple (757 din
  4 000 de puncte diferă) [măsurat, `s6` §4.6]. Ecranul, nucleul și `isPointInPath` dau 0 diferențe pe aceeași regulă
  [măsurat, `s6` §4.6]. Roboto v3 are contururi suprapuse pe 41 din 65 de caractere [măsurat, `s3` §4], iar `s3` a
  normalizat deja „cu nonzero la text”.
- *Ce rămâne de probat (în etapa 7):* PathKit `simplify` pe glifele suprapuse e neprobat [citit, `s1` §5.4]. Oracolul
  felie: `evenodd(glifa normalizată) = nonzero(glifa originală)` pe o grilă densă, pe cele 41 de caractere Roboto v3 și
  pe fonturile script din `v2`.

**2. Arcele eliptice: trei tipuri de segment, plus o matrice pe fiecare nod.**
- *Decizia:* calea are linie, arc de cerc și cubică (`s1`). Fiecare nod are o matrice afină. Elipsa e un cerc cu
  matrice neuniformă, deci exactă. O cale cu arce, scalată neuniform, rămâne exactă: se schimbă doar matricea nodului.
- *Unde apare aproximarea, declarată:* doar la operațiile care schimbă topologia (boolean, offset), unde arcele de sub
  o matrice neuniformă devin cubice sub toleranța modelului: 8 cubice pe elipsă la 0,001 mm până la r = 50 mm, 16 până
  la r = 1 220 mm [măsurat, `s1` §4.6]. Offsetul unei elipse oricum nu e o elipsă.
- *Importul:* un bloc DXF scalat neuniform devine nod cu matrice (exact); entitatea ELLIPSE devine elipsă parametrică
  (exactă). Singurul caz aproximat e comanda `A` cu rx ≠ ry în interiorul unei căi SVG: devine cubice la 0,001 mm, cu
  numărul raportat.
- *Exportul:* un arc de sub o matrice neuniformă se scrie ELLIPSE în DXF, `A` (sau `transform`) în SVG; cubicele ies
  SPLINE. Deci exportul exact din `s2` (ELLIPSE, SPLINE) rămâne [citit, `s2` §5.2].
- *De ce nu al patrulea tip:* fiecare primitivă în plus înmulțește perechile de intersecție din fiecare operație, iar
  în ediția întâi 12 module ignorau deja arcul [citit, `s1` §5.2; `LECTII.md` §1]. CNC-ul n-are mișcare eliptică.

**3. Calculul pe GPU în v1: nu.**
- *Decizia:* nucleele (simularea, relieful, prelucrarea 3D) rulează pe CPU, în bazin. WebGL2 doar desenează.
- *Dovada:* §3.5, primul rând. În plus, procesorul dă același rezultat în Node și în browser, la 1, 4, 8 sau 16 fire
  [măsurat, `s4` §4.5], deci ecranul și testele văd același câmp, cum cere `BRIEF.md` §13.
- *Ce păstrăm pentru mai târziu:* nucleele se scriu peste „o bandă cu decalaj” `(buffer, rândul de start, rânduri)`
  [citit, `s11` §5.3], aceeași formă pe care ar folosi-o un accelerator GPU.

**4. Workerele: fără izolare, cu transfer; bazin fără stare.**
- *Decizia:* adopt verdictul `s11`: fără COOP + COEP, date transferate, `Document-Isolation-Policy` dacă vreodată e
  nevoie de memorie partajată. Mă abat la un singur punct: workerele nu țin datele (§3.4), fiindcă măsurătorile `s11`
  arată același cost pentru ambele variante.
- *Câte workere:* două feluri. Bazinul (N = nuclee − 1, cel mult 16) și workerul de randare.
- *Halo-ul* e o constantă calculată din nucleu, cu testul care pune vârfuri exact la marginea benzii. Fără el, o
  scobitură de 2,545 mm trece nevăzută pe teren neted [măsurat, `s11` §4.2].

**5. Normalizarea regiunii pentru V-carve: fără Clipper.**
- *Decizia:* lanțul e:
  1. reuniunea regiunii după regula documentului (PathKit + R3), din curbele exacte;
  2. **vindecarea**, cu toleranța declarată de 0,005 mm: o închidere morfologică (offset +t, apoi −t, cu cavalier),
     care închide fantele și scoate micro-găurile; utilizatorul vede ce s-a reparat;
  3. eșantionarea pe curbele exacte, cu **pasul adaptiv**: h ≤ 0,02 mm pe trăsăturile sub ~0,5 mm, altfel 0,05 mm
     (sau ~0,4 × lățimea locală);
  4. `delaunator` + **legalizarea pe stivă** (Lawson) cu predicate robuste, care aruncă eroare dacă nu converge;
     după ea se numără zero muchii ne-Delaunay;
  5. raza recalculată exact în fiecare nod, cu garda pe coardă;
  6. **adâncimea de start** pentru incrustații: `z = −min(D, S0 + r·cot(θ/2))`.
- *Dovada:* la h = 0,05, plăcuța de 6 mm iese cu 0,0163 mm sub ideal, peste bugetul de 0,014; la 0,02 intră în buget
  [măsurat, `v2` §2]. Legalizarea pe stivă: 0,08 s în loc de 16–19 s, cu 0 muchii proaste [măsurat, `v2` §4(d)].
  Muchiile aproape comune lasă 110 micro-găuri și cusătura netăiată [măsurat, `v2` §4(b)]. Fără adâncimea de start,
  dopul nu intră; cu ea, jocul variază cu 0,015 mm la h = 0,02 [măsurat, `v2` §4(h)].
- *De ce fără Clipper:* altfel „ce e înăuntru” ar avea două implementări, iar cazul care contează (muchii aproape
  comune) e exact cel în care două motoare dau răspunsuri diferite [dedus, sprijinit pe `v2` §4(b): două oracole
  diferă cu 0,17 mm acolo]. Fundul plat folosește tot offseturile cavalier (1,5 ms pe nivel [măsurat, `v1` §2]), nu
  cele ~30 de offseturi Clipper care luau 2,8–3,8 s [măsurat, `s3` §4].
- *Risc:* vindecarea prin închidere cu cavalier pe intrări zgomotoase e neprobată [dedus]. Felia ei rulează corpusul
  `v2` §4(b); dacă pică, rezerva e Clipper închis în pasul de pregătire al V-carve-ului (§3.5).

**6. Pânza: adopt `v3` și îl simplific.**
- *Decizia:* vectorii exacți se desenează într-un singur worker de randare, pe pânză software
  (`OffscreenCanvas` = o pânză pe care se desenează dintr-un worker, cu `willReadFrequently: true`), și se predau ca
  ImageBitmap. Traseele dense merg ca LINE_STRIP; segmentele instanțiate (cu grosime și culoare pe segment) doar sub un
  buget ales la pornire dintr-un test scurt de cadru. Planul B nu se promovează.
- *Simplificarea mea:* calea din worker e **singura** cale pentru vectori, din prima felie a pânzei. Nu există treapta
  „redesen exact pe firul principal când e puțin”. În gest, firul principal mută ultima imagine; imaginea exactă vine
  când e gata (câteva ms pe o scenă mică, 67–121 ms la 50 k forme [măsurat, `v3` §2]).
- *Dovada:* `v3` §4.4: clicul pictat în 24 ms mediana, p95 32 ms, pe ambele plăci; pe firul principal, 456–552 ms.
- *Reguli scrise:* linia vectorului are 1 pixel fizic (de 13–20 de ori mai ieftină [măsurat, `v3` §4.6]); un test
  nocturn măsoară nucleele procesului GPU în timpul redesenului, fiindcă `willReadFrequently` e un indiciu, nu o
  garanție [citit, `v3` §6].

**7. Formatele de import cu probleme de licență: întrebări pentru owner, cu recomandarea în față.**
- **EPS și AI ≤ 8:** recomand **decizia pe corpusul real**: owner-ul aduce 30–50 de fișiere primite în ultimele luni.
  Dacă EPS-urile sunt ≥ 10 %, construim interpretorul limitat din `s12`; altfel, în v1 mesaj „salvează ca PDF sau
  SVG”, iar interpretorul în v1.x. **Planul de mai jos îl ține în etapele 25–26**, ca să nu ascund costul: ~7 felii
  plus rezerva etapelor. E mai puțin decât cele 2–3 săptămâni estimate de `s12` [dedus, `s12` §2], fiindcă
  interpretorul de probă, de 493 de linii, scris în sub o oră, a citit deja exact EPS-ul Illustrator CS6 [măsurat,
  `s12` §4.3]. Dacă fișierele reale cer mai multe profiluri, depășirea intră în săptămâna-tampon T3.
- **DWG:** în v1 doar mesaj, cu trimitere la DXF și la un convertor gratuit. Nativ, de decis în v1.x, după cerere
  reală: ODA costă 7 500 $ în primul an, iar cititoarele gratuite sunt GPL [citit, `s12` §2].
- **WMF / EMF:** aceeași regulă a corpusului; planul îl ține în etapa 26 (cititor propriu din specificația publică,
  ~2 felii plus rezerva; `s12` estimase 3–5 zile) [citit, `s12` §2].
- **DGK / PIC:** recomand scoaterea din prag: n-au specificație publică, iar regula owner-ului interzice reverse
  engineering [citit, `s12` §2]. Doar owner-ul o poate scoate.

**8. Planșele: D ca ipoteză de lucru.**
- Modelul D intră în schemă din etapa 1 (`Doc { parts, sheets }`, nivelul doi ascuns), ca alegerea să nu ceară o
  migrare. Interfața lui completă vine în etapa 11.
- Ce se schimbă dacă owner-ul alege A e la §5.5. Decizia trebuie să vină **înainte de etapa 1**; altfel pornim cu D și,
  dacă vine A mai târziu, plătim o migrare (~2 felii) [dedus].

**9. Maturitatea nucleului geometric.**
- **cavalier:** copia JS adusă în repo, cu reparațiile din Rust 0.8.0 / 0.9.0 portate (#79, #82, #83, vârfurile
  repetate), testul „paralele” reparat cu unghi normalizat, plus gărzile obligatorii din `v1` §5: curățarea intrării,
  validarea structurală a ieșirii, rezoluția modelului declarată la 0,01 mm. **Fără toolchain Rust.**
  - *Etapizare:* în etapa 2, domeniul curat (litere, forme CAD), unde e exact și robust [măsurat, `v1` §2: 32/32
    buzunare, topologia 40/50 exactă]. Reparațiile pentru poliliniile dense vin în etapa 9, odată cu importurile reale,
    adică exact când apare domeniul lor de eșec [dedus]. Până atunci, garda de ieșire face orice eșec explicit, niciodată
    un traseu tăcut greșit.
  - *Criteriul de ieșire (etapa 9):* pe suita densă din `v1` (240 de offseturi), 0 eșecuri tăcute și cel mult 1 % eșecuri
    explicite. Biarcele singure reduc deja eșecurile de la 47 la 2 din 240 [măsurat, `v1` §4.3]. Dacă nu trece, devine
    întrebare pentru owner: Rust compilat în WASM.
- **PathKit 1.0:** dependență înghețată, adusă în repo, în spatele fațadei `boolean(a, b, op)`, cu re-ancorarea R3 după
  **fiecare** operație (R3 = fiecare segment al rezultatului e potrivit prin 3 puncte pe primitiva-sursă exactă, iar
  vârfurile devin intersecții exacte) [măsurat, `v1` §4.6: 3,3·10⁻¹³ mm după 100 de operații]. Rezerva fără cod nou:
  `Path.MakeFromOp` din CanvasKit (întreținut, 3,3 MB) [citit, `s1` §4.11]. Nu facem un build propriu cu emsdk.

### 3.7 Cloud-ul, pe scurt

- **Proiectele:** `cncvectorstudio` (live) și `cncvectorstudio-test`, refolosite [citit, `BRIEF.md` §7].
- **Regiunile:** baza în `nam5`; callable-urile și joburile programate în `europe-central2`; declanșatorii Firestore în
  `us-central1`, lângă bază [citit, `BRIEF.md` §7].
- **Un singur declanșator Firestore în v1:** abonament scris de extensia Stripe → dreptul de acces recalculat, cu marcaj
  de rulare. Tot ce poate face un callable sincron nu primește declanșator: tichetul nou scrie alerta în colecția
  `mail` în aceeași tranzacție; primul login inițializează contul printr-un callable. În ediția întâi, un declanșator a
  tăcut 2 zile fără ca cineva să afle [citit, `adm` §4.1, „Tichete”].
- **Joburile programate** (cu cron, nu „every N”): backup-ul zilnic cu alarmă, curățarea jurnalului de erori (90 de
  zile), rezumatul zilnic (din etapa 28) [citit, `adm` §5.1].
- **App Check impus peste tot.** Pe test: cheie reCAPTCHA Enterprise pentru domeniul de test și un token de debug
  înregistrat doar acolo, ținut ca secret în CI. Local: furnizorul de probă, în carantină [citit, `adm` §5.3].
- **Rolul de personal** stă doar în `staff/{uid}`, citit la fiecare cerere; nu în claim-uri [citit, `adm` §5.1].
- **Plata:** extensia Stripe, cu lista albă de prețuri și de argumente impusă în reguli pe `checkout_sessions`, probată
  în perechi permis / refuzat pe emulator.
- **Funcțiile** se scriu în TypeScript, pe domenii (`functions/src/admin/<domeniu>.ts`) [citit, `adm` §5.1], cu
  `shared/` inclus în build; proba de build e `firebase deploy --dry-run` [dedus, din lecțiile celorlalte proiecte ale
  owner-ului].

---

## 4. Dovada

### 4.1 Oracolele pe subsistem (refolosite din sonde)

Toate stau în `test/oracles/`, cu zero importuri din `src/`. Fiecare intră în CI **înaintea** funcției pe care o judecă.

| Subsistemul | Oracolul | De unde vine | Controlul negativ (trebuie să pice) |
|---|---|---|---|
| Geometria | distanța exactă la linie / arc / pătratică / cubică, Hausdorff în ambele sensuri, interiorul prin numărul de înfășurare, plus un oracol de structură (numărul de contururi, fără laturi comune) | `s1` §4.1, `v1` §4.0 | offset × 1,01; inelul final șters; „reuniune” care pierde găurile |
| Postul și G-code-ul | cititorul G-code al oracolului (dialectul complet, G2/G3 cu I/J sau R) + regula de arc GRBL rescrisă + valorile pe hârtie ale celor 4 colțuri de origine | `s4` §4.2, `s8` §4.2 | 2 zecimale în mm; o mutație care taie „.000” |
| Simularea | grila densă Float64 cu eșantionare la cell/8, regula „nucleul nu e niciodată mai sus decât oracolul cu peste 10 nm”, 16 piese cu valoare pe hârtie | `s4` §4.2 | cele 7 otrăvuri din `s4` §4.3 |
| V-carve | distanța exactă la curbele de intrare + înfășurătoarea analitică a conului, cu reparația la capetele bucăților de graniță; al doilea oracol prin eșantionare densă pe un set mic | `s3` §4, `v2` §4 | raza dată de algoritm („circ”), fără legalizare, deplasare de 0,02 mm |
| Incrustațiile | jocul pe linia de lipire, din cele două suprafețe simulate | `v2` §5.5 | masculul fără adâncime de start |
| Relieful și 3D-ul | CL-ul analitic pe plan, sferă, cilindru; drop-cutter exact pe triunghiuri (vârfuri, muchii, fețe); simulatorul de creastă; volumul pe hârtie; reconstrucția Poisson pe o funcție analitică | `s5` §4.1–4.9 | fără testul pe muchii; fără testul pe fețe; halo cu un rând mai mic (`s11`) |
| Exportul și importul | ezdxf (recover + audit), PyMuPDF, fontTools, valorile pe hârtie; doar Ghostscript-WASM dacă intră EPS | `s2` §4, `s12` §4.3 | raza × 1,0001; „20 mm” = corpul em; totul pe stratul „0”; toleranța R12 greșită |
| Pânza | marginea cercului față de cercul analitic (≤ 0,5 px), testul de clic față de distanțele analitice, aceeași regulă de umplere pe ecran / nucleu / `isPointInPath`, latența clicului cu Event Timing | `s6` §4.2–4.6, `v3` §4.4 | teselarea grosieră (martorul PixiJS); martorii `idle` / `busy` |
| Datele | 10 defecte injectate cu calea așteptată; JSON canonic; zip identic octet cu octet + cititorul Python; procesul omorât la mijlocul salvării; PWA fără rețea | `s7` §4 | suprascrierea pe loc (S1); service worker blocat |
| Adminul și regulile | matricea de 63 de celule pe emulator pentru logică; perechile permis / refuzat pe testul din cloud, cu tokenuri reale | `adm` §4.2 | fiecare test sabotat o dată |
| Planșele | valorile pe hârtie ale așezării pe rânduri și ale feței de jos | `pp` §4 | sabotajele M1–M6 |

### 4.2 Poarta invariantelor

O funcție pură din `src/ir/` rulează pe **orice** program generat de orice test, nu doar pe cele scrise pentru ea
[citit, `LECTII.md` §4.6]:
- nicio trecere mai adâncă decât pasul pe adâncime;
- nimic tăiat din regiunea păstrată (pe câmpul simulat);
- niciun G0 prin material;
- fiecare arc scris trece regula controlerului țintă, după rotunjire;
- nicio linie peste 70 de octeți [citit, `s8` §5.8];
- în 3D: nicio scobitură față de modelul exact (eșantionat) și creasta măsurată în toleranța ei.

O metrică nouă intră în poartă abia după ce o otravă o înroșește [citit, `s4` §5.12].

### 4.3 Otrăvurile (mutațiile)

- Un dosar `test/poisons/` cu câte un patch mic pe modulele critice: formatorul de numere, matricea originii, urechile
  Z(s), intrările față de regiunea păstrată, raza din V-carve, nucleele simulării, drop-cutter-ul, adâncimea de start a
  incrustației, calculul dreptului de acces.
- Un script de ~50 de linii aplică fiecare patch, rulează suitele și cere roșu. Un patch care nu se aplică e VOID, nu
  „prins”.
- **Otrăvurile le alege altcineva decât autorul feliei**: o sesiune separată, din lista modulelor critice, pornită cu
  acordul owner-ului și cu costul spus înainte [citit, `CLAUDE.md`]. În ediția întâi, cele alese de autor au fost prinse
  281 din 281, iar dintre cele alese independent au supraviețuit 27 din 54 [citit, `LECTII.md` §0].
- Rulează noaptea, detașat. Fără framework de mutații.

### 4.4 CI pe trei niveluri

GitHub Actions, repo public, minute nelimitate [citit, `BRIEF.md` §7]. Commit-urile care ating doar `.md` nu pornesc CI-ul:
în ediția întâi ele au ars 29 % din minute [citit, `faza0/27`].

| Nivelul | Când | Ce rulează | Bugetul |
|---|---|---|---|
| **rapid** | la fiecare push | `tsc`, lint (direcțiile importurilor), paritatea en/ro, testele unitare și subseturile oracolelor (`node --test`), build-ul, mărimea pachetului, lista albă de licențe | ≤ 5 min |
| **complet** | înaintea fiecărui deploy pe test | toate corpusurile oracolelor, cititorii Python, e2e Playwright pe `dist/` (PWA fără rețea, CSP real, amprenta simulării Node = browser, calea de randare), regulile pe emulator în perechi | ≤ 15 min |
| **noapte** | cron | otrăvurile, corpusurile mari (polilinii dense, firma de 1200 × 400), bancurile de performanță cu praguri, perechile pe testul din cloud cu token de debug | ≤ 60 min |

- Deploy-ul pe test e automat după nivelul complet verde. Pe live, doar prin workflow-ul de publicare, cu sha-ul
  deja trecut prin test și aprobarea owner-ului în GitHub [citit, `adm` §5.1, punctul 7].
- Lista albă de licențe e un script mic peste `package-lock.json`: o dependență de rulare GPL / AGPL face CI-ul roșu.
  Capcana `dwg2dxf` (declarat ISC, de fapt GPL) arată de ce [citit, `s12` §2].
- Scanarea de secrete e cea a GitHub pentru repo-urile publice, cu protecția la push.

### 4.5 Bancul vizual

- Playwright deschide `dist/` pe documentele de referință, la vederi fixe, și scrie o singură pagină HTML: **poza și
  cifra ei, una lângă alta** (abaterea în px, intervalul cadrelor, clic → pictură în ms) [citit, `LECTII.md` §4.12].
- Fiecare poză are lângă ea un martor negativ care trebuie să arate greșit și să aibă cifra greșită. În ediția întâi,
  bancul raporta verde pe 3 sabotaje [citit, `LECTII.md` §1].
- Pagina e artefact CI și se publică pe instanța de test la `/banc/`. Owner-ul o deschide la sfârșitul etapei.

### 4.6 Cum devine placa de probă test

1. **Înainte de tăiere:** fișa plăcii (generată din document) are fiecare cotă cu valoarea pe hârtie și toleranța.
   Fișierul G-code și hash-ul lui intră în `test/placi/Snn/`.
2. **La mașină:** senderul salvează transcrierea (liniile trimise, `ok` / `error`, rapoartele de stare).
3. **După tăiere:** owner-ul trece cotele măsurate într-un formular din aplicație (sau în chat, iar asistentul le
   copiază). Ele ajung în `test/placi/Snn/cote.csv`.
4. **Testele care rezultă:**
   - aplicația generează din documentul plăcii aceiași octeți (sau diferența e revizuită și placa se retaie);
   - simularea și oracolul prezic fiecare cotă în toleranță;
   - transcrierea se rejoacă pe emulator;
   - o cotă măsurată în afara toleranței deschide un defect de gravitate „mașină”, care trece înaintea oricărei felii
     noi [citit, `LECTII.md` §2.3].
5. **Placa de regresie:** o placă mică, cu trăsăturile canonice ale etapelor trecute. Octeții ei se compară la fiecare
   etapă; se retaie doar când se schimbă intenționat sau într-o săptămână-tampon.

---

## 5. Planul pe etape

### 5.0 Pasul 0, înaintea etapelor (~3 zile, fără cod de produs)

- aprobarea planului;
- evaluarea portării (`docs/PORTARE.md`), față de arhitectura aprobată; owner-ul decide pe ea [citit, `CLAUDE.md`,
  „Decizii luate”] (~2 felii de analiză);
- primele 5 lucruri pentru owner (§8): A sau D, pachetul de export din `s2`, atelierele, corpusul de fișiere,
  materialul pentru plăci.

**Presupuneri pentru plăci** (owner-ul le confirmă sau le înlocuiește; valorile pe hârtie se recalculează la
pregătirea fișei): MDF de 12 și 18 mm; freze plate Ø6 și Ø3,175, V60, V90, bilă Ø6; șubler, șubler de adâncime, lere
de rază și de joc. **Toleranța mașinii, de confirmat:** ±0,2 mm pe cotele în plan, ±0,1 mm pe adâncimi.

### 5.1 Etapele dintr-o privire

„Live” = publicare pe live la sfârșitul etapei, după placă și cu confirmarea owner-ului.

| Nr | Ținta | Felii | Live |
|---:|---|---:|---|
| 1 | Schelet care taie: dreptunghi și cerc → G-code corect la orice colț de origine | 8 | nu |
| 2 | Profilul complet pe geometrie exactă, plus importul SVG | 8 | nu |
| 3 | Senderul, postul cu contracte, observabilitatea și prima publicare | 9 | **da (prima)** |
| 4 | Simularea și verificarea; calibrarea pe lemn; pachetul pleacă la ateliere | 9 | da |
| 5 | Buzunar, găurire, ordinea operațiilor, frezele | 9 | da |
| 6 | Editorul de vectori | 9 | da |
| 7 | Textul și gravarea pe linie | 8 | da |
| 8 | V-carve și gravarea inteligentă | 9 | da |
| 9 | Importul și exportul cu vectori reali | 9 | da |
| 10 | Repararea, conversia, cotele, transformarea traseelor | 8 | da |
| T1 | Săptămână-tampon | — | da |
| 11 | Planșele: piese, foi, instanțe, Multi-Plate, lista de tăiere | 8 | da |
| 12 | Incrustațiile | 8 | da |
| 13 | Mașina, partea a doua | 9 | da |
| 14 | Conturile, dreptul de acces, adminul P2 | 8 | da |
| 15 | Adminul P2+, fișa de lucru, șabloanele de operații | 8 | da |
| 16 | Caneluri, teșire, Raised Round, freze desenate | 8 | da |
| 17 | Textura din freză, ghilotina, burghiele multiple, laserul 2D | 8 | da |
| 18 | Relieful 1: nucleul, relieful din imagine, prelucrarea 3D din relief | 9 | da |
| 19 | Relieful 2: editorul de forme, textul, operațiile, analiza | 9 | da |
| 20 | 3D din modele: import, câmp conservativ, zone, decupare | 9 | da |
| T2 | Săptămână-tampon | — | da |
| 21 | 3D: coliziunea, subtăierile, modelele înalte; extrudarea, sweep, spin | 9 | da |
| 22 | Relieful 3: îmbinări, straturi bitmap, sculptura, anvelopa | 9 | da |
| 23 | Relieful 4: față-verso, basorelieful, conturul | 8 | da |
| 24 | Relieful 5: texturi, export STL, biblioteca, laserul 3D | 8 | da |
| 25 | Trasarea din imagine; EPS și AI vechi | 9 | da |
| 26 | Importul, partea 2: Corel, WMF / EMF, DWG ca mesaj | 8 | da |
| 27 | Facturarea (P3) și partea legală | 8 | da |
| 28 | Cele două interfețe, ghidul de pornire, adminul P4 | 9 | da |
| T3 | Săptămână-tampon | — | da |
| 29 | Atelierele, regresia, laptopul de atelier | 8 | da |
| 30 | Lansarea | 8 | da (lansarea) |

### 5.2 Etapele, una câte una

Format: ținta; feliile (fiecare cu commit și ceva de încercat); ce închide; placa (cote cu valoarea pe hârtie);
publicarea. Prima felie a fiecărei etape începe cu transcrierea plăcii precedente în teste (§4.6). Rândurile de prag
sunt scrise cu numele lor exact din `ACOPERIRE-ARTCAM-DESKPROTO.md`.

#### Etapa 1 — Schelet care taie (săptămâna 1)
- **Ținta:** un dreptunghi și un cerc desenate în aplicație ies într-un fișier G-code pe care owner-ul îl taie corect,
  cu originea în oricare colț.
- **Feliile (8):**
  1. depozitul și scheletul: Vite, TypeScript, React, CI rapid, `t()` cu paritate en/ro, ErrorBoundary, build
     determinist, configul citit de la gazdă, `.gitattributes`, jurnal local de erori;
  2. documentul v0: schema valibot cu versiune și o singură ușă de încărcare, arborele D cu nivelul doi ascuns,
     dreptunghi și cerc parametrice cu matrice; jurnalul de comenzi (undo / redo); IndexedDB cu salvare în tranzacție;
  3. pânza: stratul WebGL2 (foaia), stratul de interacțiune; pan, zoom, selecție, mutare; câmpul numeric unic, cu
     unități;
  4. workerul de randare: vectorii pe pânză software, predați ca imagine;
  5. IR-ul traseului v0 + profilul exterior / interior pe dreptunghi și cerc (offset analitic, încă fără cavalier),
     cu treceri pe adâncime;
  6. originea (4 colțuri, Z0 sus sau jos, o singură matrice) + postul GRBL v0: 3 zecimale, G2/G3 cu I/J din startul
     rotunjit și gărzile de coardă și unghi, antet complet, plafon de 70 de octeți [citit, `s8` §5]; exportul fișierului;
  7. oracolul G-code din `s4`, adus în `test/oracles/`, cu valorile pe hârtie ale celor 4 colțuri și regula de arc
     GRBL; invarianta pasului; totul în CI;
  8. instanța de test: export Firestore, lista funcțiilor vechi de șters arătată owner-ului, reguli „refuză tot”,
     hosting; fișa plăcii 1.
- **Închide:** niciun rând încă. Pornește „Profil, cu urechi de susținere, intrări / ieșiri, direcție de tăiere”.
- **Placa 1** (MDF 18, 300 × 200, freză Ø6; fișierul A cu originea stânga-jos, fișierul B cu originea dreapta-sus):
  1. insula dreptunghiulară: lungimea **100,00** ±0,2;
  2. lățimea **60,00** ±0,2;
  3. gaura (profil interior): **Ø30,00** ±0,2;
  4. A: marginea stângă a insulei la **20,00** ±0,3 de marginea stângă a stocului;
  5. A: marginea de jos la **20,00** ±0,3 de marginea de jos;
  6. B: marginea dreaptă la **20,00** ±0,3 de marginea dreaptă;
  7. B: marginea de sus la **20,00** ±0,3 de marginea de sus;
  8. adâncimea canalului dintr-o singură trecere: **3,00** ±0,1;
  9. adâncimea profilului din două treceri de 4: **8,00** ±0,1.

  *Confirmă:* matricea originii și sensul arcelor, adică exact defectul care a stat ascuns 104 zile în ediția întâi
  [citit, `LECTII.md` §2.1]; oracolul G-code.
- **Live:** nu. Mecanismul de publicare (P1) vine în etapa 3.

#### Etapa 2 — Profilul complet, pe geometrie exactă (săptămâna 2)
- **Ținta:** owner-ul decupează o piesă reală, cu urechi, intrări și dog-bone, desenată sau importată din SVG.
- **Feliile (8):**
  1. modelul de curbă L / A / C (noduri cu bulge = tan(baleiaj / 4)), transformările exacte, conturul în lume;
  2. cavalier adus în repo + curățarea intrării + validarea structurală a ieșirii + corpusul curat din `s1` / `v1`
     în CI;
  3. profilul pe orice contur (exterior, interior, pe linie, deschis pe o parte) + regiunea păstrată + sensul de
     tăiere;
  4. urechile ca modificator Z(s), portate cu cele 88 de verificări pe hârtie [citit, `LECTII.md` §3.2];
  5. intrările / ieșirile alese față de regiunea păstrată + rampa (portate) [citit, `LECTII.md` §3.2];
  6. dog-bone și T-bone;
  7. importul SVG: DOMParser inert (arborele nu se atașează niciodată paginii), unități, viewBox, transformări, plafon
     de 16 MiB;
  8. fișa plăcii 2.
- **Închide:** „Profil, cu urechi de susținere, intrări / ieșiri, direcție de tăiere”; „Fileturi la colțuri
  interioare: dog-bone și T-bone”.
- **Placa 2** (MDF 12, Ø6, piesa decupată pe sacrificiu):
  1. piesa 120 × 80 cu colțuri R10: **120,00** ±0,2;
  2. **80,00** ±0,2;
  3. colțul **R10** (leră);
  4. grosimea urechii **2,0** ±0,2;
  5. lungimea urechii **8,0** ±0,5;
  6. gaura cu dog-bone, la mijlocul laturilor: **40,00 × 30,00** ±0,2;
  7. cepul 40 × 30 cu colțuri ascuțite intră în gaura cu dog-bone și în cea cu T-bone fără forță (da / nu), joc ≤ 0,3;
  8. logoul SVG al owner-ului, cu lățimea declarată 80 mm: **80,00** ±0,3 (un logo curat, desenat; logourile vectorizate
     din imagini au polilinii dense, care intră abia în etapa 9);
  9. nicio urmă de intrare în piesă peste 0,1 (șublerul în dreptul intrării față de restul laturii).

  *Confirmă:* regiunea păstrată (intrarea nu mușcă din piesă: defect ascuns 105 zile în ediția întâi [citit,
  `LECTII.md` §2.1]), urechile pe hârtie, oracolul G-code.
- **Live:** nu.

#### Etapa 3 — Senderul, postul cu contracte, observabilitatea, prima publicare (săptămâna 3)
- **Ținta:** owner-ul taie din aplicația nouă, fără alt program, pachetul de probă al postului pe mașina lui, iar
  aplicația ajunge pe live.
- **Feliile (9):**
  1. senderul: sesiune Web Serial (o interfață a browserului pentru porturi seriale) cu tranzacții (`$#`, `$G`, `$$`),
     flux cu numărarea caracterelor, refuzul liniilor peste 70 de octeți la încărcare, trimite exact octeții exportați
     și arată hash-ul;
  2. jog, zero XY / Z (cu „Z0 = sus / jos” scris lângă buton), G54–G59, bariera M6: oprire la Z sigur, ax oprit, jog
     permis, reluare;
  3. emulatorul GRBL de test + transcrierile ca fixturi; 100 000 de linii trimise cu 0 pierderi;
  4. postul: contractul de dialect ca date, cu sursa și starea pe fiecare câmp; 4 strategii de schimbare a sculei;
     pauza în unitatea controlerului; elicea; inch cu 5 zecimale [citit, `s8` §5];
  5. funcțiile în TypeScript + P0 pe test: `errorLogs`, `logClientError` (cu plafon de rată) și `logServerError`,
     fila Erori, Diagnoza minimă, amprenta `meta/deployment`; poarta „doar personalul” cu login Google; tokenul de debug
     App Check doar pe test [citit, `adm` §5.2];
  6. P0, continuare: scriptul pentru primul owner (`staff`), marcajele de rulare, gruparea erorilor;
  7. P1: workflow-ul de publicare (sha fixat, arbore curat, mediul `live` cu aprobarea owner-ului în GitHub, WIF =
     identitate federată, fără chei descărcate) + backup programat cu alarmă;
  8. PWA: pornește fără rețea, actualizarea e oferită și blocată cât rulează un job; CSP fără `eval`, probat pe
     build-ul servit [citit, `s7` §5.2, §5.10];
  9. pachetul T0–T7 pentru GRBL, generat de post din IR (nu de CAM), + fișa plăcii 3.
- **Închide:** adminul **P0** (Erori, Diagnoza minimă, amprenta) și **P1** (publicarea cu aprobare, backup-ul cu
  alarmă). Pornește „Trimiterea directă la mașină (senderul)”.
- **Placa 3** (fișierele T din `s8` Anexa B, pe GRBL 1.1h, prin senderul nou):
  1. T1: cercul Ø50 din 2 × 180°, cu Ø6: canalul are exteriorul **Ø56,00** și interiorul **Ø44,00** ±0,2;
  2. T1: același cerc din 4 × 90°: aceleași valori;
  3. T1: distanța dintre centre **100,00** ±0,2;
  4. T2: linia de 200 mm la F1000: **12,0 s** ±0,5; la F2000: **6,0 s** ±0,5;
  5. T2: pauza după M3: **2,0 s** ±0,3;
  6. T3: gaura elicoidală Ø20 cu 3 spire de 1 mm: adâncimea **3,0** ±0,1, diametrul **20,0** ±0,2;
  7. T4: pătrate 20 × 20 la 2 mm, cu Ø6 apoi Ø3,175, prin bariera M6: diferența de adâncime **0,0** ±0,1; axul oprit
     la Z sigur (da / nu);
  8. T7: 4 găuri în pași de 2 mm: adâncimea **10,0** ±0,1;
  9. o linie de 80 de caractere e refuzată la încărcare, cu numărul ei (da / nu).

  *Confirmă:* contractul GRBL, regula de arc după rotunjire, fluxul senderului (transcrierea).
- **Live: da, prima publicare.** Înainte: export Firestore pe live și lista funcțiilor vechi de șters, confirmată de
  owner. Extensiile Stripe și Trigger Email rămân neatinse. Pe live, aplicația e deschisă doar personalului până la
  lansare.

#### Etapa 4 — Simularea și verificarea; calibrarea (săptămâna 4)
- **Ținta:** owner-ul vede pe ecran exact ce verifică testele, iar simularea e calibrată o dată pe lemn.
- **Feliile (9):**
  1. migrările pure vN → vN+1 cu corpus de aur (de acum există date pe live);
  2. nucleul de simulare CPU: dale mici într-un atlas, dalele uniforme ca un singur număr, calcul exact pe celulă
     (plată, bilă, V, profil la Z constant, elice plată), benzi pe bazin; amprenta Node = browser în e2e [citit,
     `s4` §5];
  3. afișarea simulării în WebGL2 + traseele ca LINE_STRIP;
  4. poarta invariantelor (§4.2) + cele 7 otrăvuri din `s4`;
  5. animația traseului: freza pe traseu, pas cu pas, viteză, glisor;
  6. estimarea timpului cu modelul planificatorului GRBL (accelerații, deviația la joncțiuni) + rezumatul jobului;
     comparată cu cronometrul plăcilor 2 și 3;
  7. profilul pe rampă exact (sumă de trunchiuri de con) + elicea cu bilă sau V fără coarde interioare [citit,
     `s4` §5.4];
  8. contractele NcStudio, RichAuto, Syntec, Mach3, Mach4, grblHAL, FluidNC + pachetul de atelier generat de aplicație
     (T0–T7, fișe cu setările controlerului și valorile pe hârtie) [citit, `s8` Anexa B];
  9. fișa plăcii 4.
- **Închide:**
  - „Simulare 3D a materialului: 3 axe în v1, apoi rotativ” (partea v1);
  - „Animația traseului: freza care se mișcă pe traseu, pas cu pas, cu viteză reglabilă și glisor”;
  - „Timpul estimat, afișat imediat după fiecare calcul, și rezumatul jobului”;
  - „Calcul pe mai multe fire (workers)”.
- **Placa 4** (șanțurile de calibrare din `s4` §5.13):
  1. șanț plat Ø6 la z = −3: lățimea **6,00** ±0,1;
  2. adâncimea lui **3,00** ±0,1;
  3. bilă Ø6 cu vârful la z = −2: lățimea la suprafață 2·√(3² − 1²) = **5,657** ±0,15;
  4. V90 la z = −2: lățimea **4,000** ±0,15;
  5. V60 la z = −2: lățimea 2·2·tan 30° = **2,309** ±0,15;
  6. arc G3 cu r = 25, Ø6: canalul are exteriorul **Ø56,00** și interiorul **Ø44,00** ±0,2;
  7. plonjare Ø6 la 5 mm: gaura **Ø6,00** ±0,1, adâncimea **5,00** ±0,1;
  8. timpul pe cronometru față de estimare: ±10 %.

  *Confirmă:* nucleul de simulare și oracolul, pe lemn. Abaterile (vârful teșit al frezei V, bătaia axului) se trec în
  biblioteca de scule ca valori de calibrare [citit, `BRIEF.md` §13: oracolul e calibrat o dată pe lemn].
- **Live:** da. **Pachetul de probă pleacă la ateliere** la sfârșitul acestei etape.

#### Etapa 5 — Buzunar, găurire, ordinea operațiilor, frezele (săptămâna 5)
- **Ținta:** owner-ul golește buzunare cu două freze și face găuri în pași, cu câte un fișier pe sculă.
- **Feliile (9):** biblioteca de scule cu geometrie reală (plată, bilă, toroidală, V cu vârf teșit, gravare,
  profil), cu instantaneul în operație; importul `.tdb` pe corpusul owner-ului + materialele + avansul F = n × z × fz
  cu sursă; buzunarul din offseturi (cavalier pe forme cu insule), cu legături și intrare în rampă sau elice;
  buzunarul raster; a doua freză pe ce n-a curățat prima (rest); găurirea prin plonjare, în pași și elicoidală;
  ordinea operațiilor și a vectorilor, schimbarea sculei ca eveniment în IR, câte un fișier pe sculă; o felie de
  rezervă; fișa plăcii 5.
- **Închide:** „Buzunar (curățare de suprafață), cu mai multe freze”; „Găurire”; „Ordinea operațiilor și a
  vectorilor; câte un fișier separat pe sculă”; „Bibliotecă de freze cu geometrie reală (dreaptă, bilă, toroidală, V,
  gravare, profil, formă desenată)” (forma desenată se completează în etapa 16); **§10 „Găurire în pași (peck)”**.
- **Placa 5:** buzunar 80 × 50 cu colțuri ascuțite, la 6 mm, Ø6 + rest cu Ø3,175: **80,00** ±0,2 și **50,00** ±0,2;
  adâncimea **6,00** ±0,1; raza colțului interior ≤ **1,6** (leră); buzunar circular Ø40 cu insulă Ø20 la 4 mm: insula
  **Ø20,00** ±0,2; găuri în pași cu Ø6 la 10 mm: **10,0** ±0,1; gaură elicoidală Ø12 cu Ø6: **Ø12,00** ±0,15; buzunar
  raster 60 × 40 la 2 mm: **2,00** ±0,1, fără coame peste 0,05; timpul ±10 %. *Confirmă:* simularea și oracolul,
  regiunea curățată de rest.
- **Live:** da.

#### Etapa 6 — Editorul de vectori (săptămâna 6)
- **Ținta:** owner-ul desenează și editează vectori exacți, cu boolean, offset, aliniere și copii, iar cercul rămâne
  cerc.
- **Feliile (9):** uneltele de desen (linie, polilinie, peniță cu Bézier și arce, dreptunghi, dreptunghi rotunjit,
  cerc, elipsă, poligon, stea) ca mașini de stare pure; editarea nodurilor (mutare, bulge, mânere, adăugare, ștergere,
  conversie), cu „închis” ca fapt explicit [citit, `s6` §4.6]; grupuri imbricate + ramă cu inele parametrice și ancoră
  în 9 poziții + avertismente în loc de reparații + Escape urcă un nivel (2 felii) [citit, `pp` §5]; fațada PathKit + R3
  + reunirea arcelor co-circulare + oracolul de structură; unealta de offset + aliniere și distribuire + acroșaj +
  rigle; mutare, scalare, rotire, înclinare, oglindire exacte + copiere în rețea, circulară și de-a lungul unei curbe
  (2 felii); fișa plăcii 6.
- **Închide:** „Vectori, noduri, boolean, offset, aliniere”; „Transformare și copiere: mutare, scalare, rotire,
  înclinare, oglindire, copiere în rețea, circulară și de-a lungul unei curbe”.
- **Placa 6:** dreptunghi rotunjit 100 × 60, R8, rotit 30°, ca insulă: **100,00 × 60,00** ±0,2 pe axele lui, colțurile
  **R8**; reuniunea a două cercuri R20 cu centrele la 30 mm: lungimea **70,00** ±0,2, talia 2·√(20² − 15²) = **26,458**
  ±0,2; 8 găuri Ø6 în cerc, pe Ø80: distanța dintre centre vecine 2·40·sin 22,5° = **30,615** ±0,2; 5 găuri în rețea cu
  pasul 25: prima–ultima **100,00** ±0,2; offset +5 al unui dreptunghi 50 × 30: **60,00 × 40,00** cu colțuri **R5**.
  *Confirmă:* oracolul de geometrie (Hausdorff, structura), R3 fără derivă.
- **Live:** da.

#### Etapa 7 — Textul și gravarea pe linie (săptămâna 7)
- **Ținta:** „20 mm” înseamnă litere de 20,00 mm, cu diacritice, pe rânduri, pe cale și cu fonturi cu o singură linie.
- **Feliile (8):** nodul de text (fontul ca resursă după hash, opentype.js, înălțimea = majuscula, verificată față de
  conturul lui H [citit, `s2` §5.7]; rezervă pentru GSUB care aruncă: literă cu literă cu kerning [citit, `s3` §4]);
  normalizarea glifelor (§3.6, punctul 1); rânduri multiple, aliniere, spații, diacritice; text pe cale, editabil;
  fonturi cu o singură linie (OFL, pentru gravare); gravarea pe linie (urmărirea vectorului cu plată, bilă sau V, pe
  linie sau decalat, în treceri); resursele după hash în IndexedDB + fișierul `.cncvs` + cererea `persist()` [citit,
  `s7` §5.11]; fișa plăcii 7.
- **Închide:** „Text, text pe cale, fonturi”. Pornește „Gravare pe linie; gravare „inteligentă” cu colțuri ascuțite
  (smart engrave)”.
- **Placa 7** („LEMN ȘI ȚARĂ”, Roboto, majuscula 20, V90 pe linie la 1 mm; cotele de la muchia de sus a unui canal la
  muchia de sus a celuilalt, ca lățimea canalului să se anuleze): N **20,00**, L **20,00**, E **20,00** ±0,2; distanța
  dintre liniile de bază ale celor două rânduri **30,00** ±0,2; textul pe arcul R100: linia de bază a primei litere la
  **100,00** ±0,3 de centru; textul cu o singură linie: lățimea din metricile fontului (calculată în fișă) ±0,3; lățimea
  canalului V90 la 1 mm: **2,00** ±0,15; Ș, Ț, Ă corecte (da / nu). *Confirmă:* oracolul de text din `s2` (contururile
  citite cu fontTools), normalizarea glifelor.
- **Live:** da.

#### Etapa 8 — V-carve și gravarea inteligentă (săptămâna 8)
- **Ținta:** V-carve pe axa medială, cu fund plat, care nu sapă niciodată sub ideal peste buget.
- **Feliile (9):** normalizarea regiunii + vindecarea declarată; axa medială cu pas adaptiv și legalizare pe stivă;
  generatorul (raza exactă, tăierea ramurilor, simplificarea, garda pe coardă, arce cu Z liniar, adâncimea de start în
  parametri) + controalele negative; fundul plat pe niveluri, cu a doua freză și inelele din colțuri; oracolul V-carve
  în CI și firma de 1200 × 400 noaptea; gravarea inteligentă (axa trunchiată unde raza depășește freza, V doar spre
  colțuri); predicția costului înainte de generare; o felie de rezervă; fișa plăcii 8.
- **Închide:** „V-carve (inclusiv cu freză dreaptă pentru fund plat)”; „Gravare pe linie; gravare „inteligentă” cu
  colțuri ascuțite (smart engrave)”.
- **Placa 8:** dreptunghi 12 × 6 cu V90: creasta la **3,000** ±0,1; cerc r = 2,5 cu V60: centrul la r / tan 30° =
  **4,330** ±0,1; triunghi echilateral cu latura 10 și V90: incentrul la 10 / (2√3) = **2,887** ±0,1; canal 100 × 8 cu
  fund plat D = 3, V60 + Ø3,175: fundul la **3,00** ±0,1, lățimea fundului 8 − 2·3·tan 30° = **4,536** ±0,2, lățimea la
  suprafață **8,00** ±0,2; „MANOLE”, Roboto, majuscula 30: nicio literă săpată (da / nu); stea cu 5 vârfuri prin
  gravare inteligentă: vârfuri ascuțite, rază ≤ 0,3; timpul ±10 %. *Confirmă:* oracolul `s3` / `v2` (distanța exactă,
  învelitoarea conului).
- **Live:** da.

#### Etapa 9 — Importul și exportul cu vectori reali (săptămâna 9)
- **Ținta:** owner-ul importă DXF și PDF reale și exportă DXF, SVG, PDF pe care programele lui le deschid editabile,
  cu cercul cerc și scara exactă.
- **Feliile (9):** importul DXF (`dxf` + semantica noastră: unități, R12 fără unități = mm cu avertisment, OCS,
  blocuri imbricate cu matrice, NURBS → Bézier, conica rațională → arc, LWPOLYLINE cu bulge, straturi → roluri, TEXT
  raportat) + plafoanele pe artefact (2 felii); importul PDF și AI compatibil PDF (toate paginile, straturi pe pagină,
  precizia Float32 declarată); întărirea cavalier: reparațiile Rust portate, testul „paralele”, refacerea poliliniilor
  dense în biarce, netezirea intrării zimțate, criteriul de ieșire (§3.6, punctul 9) (2 felii); exportul DXF R2007
  exact (CIRCLE, ARC, ELLIPSE, LWPOLYLINE cu bulge, SPLINE, straturi = roluri, `$INSUNITS = 4`, test pe codurile de
  grup); exportul SVG (1 unitate = 1 mm, straturi Inkscape, `circle`, nicio comandă A peste 90°) și PDF (pdf-lib,
  straturi OCG, numărul de Bézier după toleranță); cititorii Python în nivelul complet + cele 4 otrăvuri; fișa plăcii 9
  + lista de programe pentru owner. Tot aici se generează **runda a 2-a a pachetului de atelier** (RichAuto și ce a
  ieșit greșit în runda 1).
- **Închide:** „Export 2D cu vectori reali: DXF, SVG, PDF (EPS / AI de decis)…”. Avansează „Import 2D: DXF, AI / EPS
  (S+D); SVG (D); PDF vectorial, DWG, WMF, DGK / PIC (S)” (DXF, SVG, PDF, AI compatibil PDF).
- **Placa 9** (DXF-urile de referință scrise de ezdxf, independent de noi, plus un DXF al owner-ului): linia de 1″ dintr-un
  DXF în țoli: **25,40** ±0,2; cercul NURBS R25: **Ø50,00** ±0,2; cercul R10 dintr-un bloc scalat (2; 1): elipsa
  **40,00 × 20,00** ±0,2; arcul cu extrudarea (0, 0, −1): poziția oglindită din fișă ±0,3; forma rotită 30° de pe pagina
  3 a PDF-ului: colțul din fișă ±0,3; DXF-ul exportat, deschis în ArtCAM, AutoCAD / LibreCAD, Inkscape, CorelDRAW:
  cercul rămâne cerc (da / nu pe program); SVG-ul exportat în Inkscape: dreptunghiul are **100,00 mm**; PDF-ul în
  Illustrator / Corel: straturile DECUPARE și GRAVARE există (da / nu). *Confirmă:* cititorii independenți din `s2`.
- **Live:** da.

#### Etapa 10 — Repararea, conversia, cotele, transformarea traseelor (săptămâna 10)
- **Ținta:** owner-ul curăță vectorii importați, îi convertește, pune cote și refolosește trasee calculate.
- **Feliile (8):** verificarea vectorilor (deschiși, duplicați, intersecții, bucle, noduri prea apropiate) cu raport și
  selecție; repararea lor; tăierea cu o linie și decuparea la un contur (PathKit + R3); arce în loc de curbe (biarce sub
  toleranța declarată), netezirea, conversia în cercuri și dreptunghiuri; cotele (liniară, aliniată, rază, diametru,
  unghi), legate de noduri la actul omului, exportate ca geometrie pe stratul „COTE” (2 felii); transformarea traseelor
  calculate (mutare, rotire, oglindire, copiere, unire), cu poarta invariantelor rerulată; fișa plăcii 10.
- **Închide:** „Verificarea și repararea vectorilor: deschiși, duplicați, intersecții, bucle, noduri prea apropiate”;
  „Cote (nici ArtCAM nu le are: doar rigle și măsurare)”; „Tăierea și conversia vectorilor: tăiere cu o linie,
  decupare la un contur, arce în loc de curbe, netezire, conversie în cercuri / dreptunghiuri”; „Transformarea
  traseelor calculate: mutare, rotire, oglindire, copiere, unire”.
- **Placa 10:** curba S convertită în arce: capetele la **100,00** ±0,2; dreptunghiul 80 × 50 decupat de un cerc R30 cu
  centrul la mijlocul laturii din dreapta: lățimea rămasă la mijloc **50,00** ±0,2; traseul oglindit față de x = 150:
  distanța dintre trăsăturile pereche din fișă ±0,3; traseul rotit 90°: poziția din fișă ±0,3; cotele tipărite pe fișă
  (100,00; R15; 30°) = măsurate, în toleranță; un 64-gon importat, convertit în cerc Ø40: gaura **Ø40,00** ±0,2;
  conturul închis la un gol de 0,05: decupat fără ciot peste 0,2. *Confirmă:* oracolul de geometrie (biarcele ≤
  toleranța), invariantele pe traseele transformate.
- **Live:** da.

#### Săptămâna-tampon T1 (săptămâna 11)
Coada de defecte, reestimarea din duratele măsurate, retăierea plăcii de regresie. Fără funcții noi. **Live:** da.

#### Etapa 11 — Planșele: piese, foi, instanțe, Multi-Plate, lista de tăiere (săptămâna 12)
- **Ținta:** mai multe plăci reale într-un proiect, cu piese repetate ca instanțe, plăcuțe din CSV și lista de tăiere.
- **Feliile (8):** interfața pieselor și a foilor (nivelul doi apare la «Încă…», «Din CSV…» sau «+1»); instanțele
  («Încă…», «Desprinde», editarea sursei schimbă toate cele N, cu banda care o spune); așezarea pe rânduri (marginea și
  distanța 10, după dreptunghiul piesei, cu surplusul pe foaia următoare), mutarea între foi, rotirea cu 90°;
  Multi-Plate (câmpurile `{nume}` pe instanță); CAM-ul și exportul pe foaie (instanțele desfăcute la nivelul IR-ului,
  cu transformările din etapa 10); lista de tăiere pe mai multe plăci (tipărită și CSV); avertismentele după fiecare
  comandă (iese din foaie, contururi de tăiere suprapuse, inelul nu încape), fără reparații [citit, `pp` §5.6]; fișa
  plăcii 11.
- **Închide:** „Mai multe foi de material într-un proiect (Sheets) și plăcuțe cu date variabile din CSV (Multi-Plate)”;
  **§10 „Listă de tăiere pe mai multe plăci”**.
- **Placa 11** (6 suporturi 90 × 60 pe foi de 300 × 200; pe un rând încap ⌊(300 − 20 + 10) / 100⌋ = 2, pe foaie 2
  rânduri, deci 4 + 2 pe foaia a doua): suportul **90,00 × 60,00** ±0,2; distanța dintre suporturi **10,00** ±0,3;
  marginea **10,00** ±0,3; pe foaia a doua stau exact **2** suporturi; 3 plăcuțe 120 × 30 cu nume din CSV: **120,00 ×
  30,00** ±0,2, numele în ordinea din CSV (da / nu); lista de tăiere arată 6 + 3 piese pe 3 foi (da / nu). *Confirmă:*
  formulele de așezare din `pp` §4.
- **Live:** da.

#### Etapa 12 — Incrustațiile (săptămâna 13)
- **Ținta:** dopul intră în locaș, în V și cu pereți drepți, fără ajustări de mână.
- **Feliile (8):** incrustația în V (femela = V-carve cu fund plat; masculul = V-carve-ul complementului, cu adâncimea
  de start și limita la înălțimea dopului; poarta = jocul pe linia de lipire, din suprafețele simulate); poziția
  decupării dopului `e*` (portată de pe ramura WIP, bună pe oracol [citit, `LECTII.md` §1]); incrustația cu pereți
  drepți, simplă; în trepte; perechea ca relație declarată de om, nu ghicită din grup sau nume [citit, `LECTII.md`
  §2.2, clasa 5]; oracolul dopului (întors și așezat, cu arce); rezultatele rundei 1 de la ateliere → contracte
  „probate” + teste; fișa plăcii 12.
- **Închide:** „Inlay în V (D) ȘI inlay cu pereți drepți, simplu sau în trepte (S), fiecare cu criteriul lui”.
- **Placa 12:** „B”, Roboto 40, V60: fundul femelei la **3,00** ±0,1; dopul (Ds = 1,5, Fm = 2,5) intră complet (da /
  nu); jocul pe linia de lipire ≤ **0,10** (leră de joc); după rindeluire, niciun gol vizibil peste 0,2; locașul cu
  pereți drepți 50 × 30, Ø3,175: **50,00 × 30,00** ±0,15; dopul **49,80 × 29,80** ±0,15 (jocul 0,1 pe latură); dopul
  stă fără să se clatine (da / nu); treptele incrustației în trepte la **2,00** și **4,00** ±0,1. *Confirmă:* poarta
  de pereche din `v2` §5.5.
- **Live:** da.

#### Etapa 13 — Mașina, partea a doua (săptămâna 14)
- **Ținta:** owner-ul lucrează la mașină doar din aplicație: palpare, senzor de lungime, reluare, override-uri,
  planare.
- **Feliile (9):** verificarea cursei din `$#` față de casetele jobului, zonele interzise, `$C`, rularea în gol,
  editarea `$$` cu confirmare; senzorul de lungime la schimbarea frezei, cu M6 ca barieră; găsirea colțului XY și
  palparea Z în două treceri; override-urile confirmate prin `Ov:` + jurnalul de rulare; reluarea de la linia N, cu
  oracolul = simularea programului reluat față de cea a celui întreg (nu propria funcție) [citit, `LECTII.md` §1]; planarea
  plăcii de sacrificiu (portată, cu oracolul de acoperire); procedurile ca mașini de stare pure, pe emulator; o felie
  de rezervă; fișa plăcii 13.
- **Închide:** „Trimiterea directă la mașină (senderul)”; **§10** „Senzor de lungime la schimbarea frezei, cu M6 ca
  barieră”, „Găsirea colțului XY prin palpare”, „Override de avans/turație + jurnal de rulare”, „Planarea plăcii de
  sacrificiu”.
- **Placa 13:** Ø6 apoi Ø3,175 cu senzorul: diferența de adâncime **0,00** ±0,05; colțul găsit prin palpare: marginea
  piesei la **20,00** ±0,1 de colțul stocului, fără zero manual; 10 palpări Z: împrăștiere ≤ **0,05**; reluarea după o
  oprire: treapta la reluare ≤ **0,05**; override 150 %: apare în jurnal (da / nu), timpul ±10 % față de fișă; planarea
  200 × 200: planeitate ±0,05 (comparator); un job care iese cu 1 mm din cursă e refuzat (da / nu); bariera M6: ax
  oprit, Z sigur, jog permis (da / nu). *Confirmă:* emulatorul și transcrierile.
- **Live:** da.

#### Etapa 14 — Conturile, dreptul de acces, adminul P2 (săptămâna 15)
- **Ținta:** un client își face cont, primește proba de 14 zile, iar owner-ul îl vede și îl gestionează din admin.
- **Feliile (8):** contul (Google și e-mail); dreptul de acces calculat pe server (`entitlements/{uid}`), capabilitățile
  cerute de fiecare acțiune, perioadă de grație offline; proba de 14 zile fără card (registrul cu HMAC pe e-mail,
  portat); Utilizatori (căutare pe server, dosar, plan, probă, dezactivare, export și ștergere GDPR din aceeași listă
  de colecții, cu testul care le compară); Audit atomic cu pre-imaginea + Admini (`staff/{uid}`, niciodată fără owner);
  plăcile de conturi și probe din Puls + regulile în perechi pe emulator + perechile pe testul din cloud, noaptea;
  poarta de pre-lansare: personal + testeri invitați; placa 14.
- **Închide:** adminul **P2** (Utilizatori, Audit, Admini, Puls parțial).
- **Placa 14** (placa de regresie, generată pe **live** dintr-un cont în probă): hash-ul G-code = cel de aur (da / nu);
  insula **100,00** ±0,2; gaura **Ø30,00** ±0,2; creasta V-carve **3,00** ±0,1; buzunarul **6,00** ±0,1; urechea
  **2,0** ±0,2; exportul nu e blocat în probă (da / nu). *Confirmă:* calea capabilităților nu schimbă un octet din
  program.
- **Live:** da.

#### Etapa 15 — Adminul P2+, fișa de lucru, șabloanele de operații (săptămâna 16)
- **Ținta:** owner-ul raportează din aplicație, tipărește fișa de lucru și aplică aceleași operații pe alte desene,
  în lot.
- **Feliile (8):** tichetele („Raportează” atașează documentul, captura și build-ul; atașamentele în Storage; răspuns
  pe e-mail; alerta cu marcaj); configurarea prin callable cu audit (oprirea site-ului, mentenanța, anunțul) + panoul
  de publicare test → live; fișa de lucru tipărită (freze, ordine, zero, timp, setările controlerului din contract
  [citit, `s8` §5.10]); șabloanele de operații; calculul în lot; Diagnoza extinsă (e-mail, regulile publicate =
  commit-ul, retenția); o felie de rezervă; fișa plăcii 15.
- **Închide:** „Șabloane de operații (aceleași setări pe alt desen) și calcul în lot”; **§10 „Fișă de lucru tipărită
  (freze, ordine, zero, timp)”**; adminul **P2+** (Tichete, Config, panoul de publicare).
- **Placa 15** (șablonul „plăcuță”: ramă 150 × 50 R5 cu urechi, nume în V-carve, 2 găuri Ø6 la 130 mm, aplicat în lot
  pe 3 nume): fiecare plăcuță **150,00 × 50,00** ±0,2; găurile la **130,00** ±0,2; creasta pe tulpina lui „I” = lățimea
  / 2 · cot 30° (din fișă) ±0,1; timpul de pe fișă față de cronometru ±10 %; ordinea frezelor de pe fișă = cea reală (da /
  nu); cele 3 fișiere au rulat fără editare (da / nu). *Confirmă:* lotul dă aceiași octeți ca generarea pe rând.
- **Live:** da.

#### Etapa 16 — Caneluri, teșire, Raised Round, freze desenate (săptămâna 17)
- **Ținta:** operațiile decorative ArtCAM și frezele de profil desenate de om.
- **Feliile (8):** frezele de profil desenate (h(r) din linii și arce) în bibliotecă; simularea și oracolul pentru ele;
  roundover cu offset față de interior; canelurile cu rampe și încrucișări împletite (adâncimea modulată pe sus / jos);
  teșirea (bevel carving) pe axa medială cu unghi limitat; Raised Round; invariantele și otrăvurile lor; fișa plăcii 16.
- **Închide:** „Caneluri (cu încrucișări împletite), teșire (bevel carving), Raised Round (adâncitură cu profil)”;
  „Freze de profil desenate de utilizator; roundover cu offset față de interior”.
- **Placa 16:** canelură cu bilă Ø6 la 2 mm: lățimea **5,66** ±0,15; canelura de 100 cu rampe de 10: porțiunea la
  adâncime plină **80,00** ±0,5; încrucișarea împletită: **1,00** pe canelura de deasupra și **2,00** pe cea de dedesubt
  ±0,1; teșirea pe un „I” cu tulpina de 6, V90: **3,00** în ax ±0,1; roundover R6 cu freza desenată: raza (leră);
  profilul desenat al owner-ului se potrivește cu șablonul tipărit (da / nu); Raised Round cu lățimea **20,00** ±0,2.
- **Live:** da.

#### Etapa 17 — Textura din freză, ghilotina, burghiele multiple, laserul 2D (săptămâna 18)
- **Feliile (8):** traseul de textură direct din forma frezei; tăierile ghilotină (grilă de tăieturi drepte); găurirea
  cu mai multe burghie simultan (geometria băncii în profilul mașinii, comenzile din contract, simularea ștampilează
  toate burghiele); postul de laser (M3 / M4 cu putere dinamică, fără Z, laserul oprit pe G0) și operațiile de tăiere și
  gravare (linie și hașură); simularea laserului și invariantele lui; **runda a 3-a la ateliere**: câte un fișier de job
  real (profil + buzunar + V-carve) pe fiecare controler; o felie de rezervă; fișa plăcii 17.
- **Închide:** „Traseu de textură direct din forma frezei, fără relief”; „Tăieri ghilotină (grilă de tăieturi drepte,
  nesting aliniat); găurire cu mai multe burghie simultan (drillbanks)”. Pornește „Laser: tăiere / gravare, plus laser
  3D în felii pe Z”.
- **Placa 17:** textura cu pasul 10: 10 perioade pe **100,0** ±0,3; adâncimea texturii **1,00** ±0,1; grila ghilotină
  3 × 2 pe 300 × 200: bucăți **100,0 × 100,0** ±0,2; diagonalele unei bucăți egale ±0,3; găurirea multiplă: verificată
  pe simulare și pe octeții postului (owner-ul n-are bancă de burghie); laserul, dacă owner-ul are unul: pătratul gravat
  **50,00** ±0,2 și discul decupat **Ø40,00** ±0,2.
- **Live:** da.

#### Etapa 18 — Relieful 1: nucleul, relieful din imagine, prelucrarea 3D din relief (săptămâna 19)
- **Ținta:** owner-ul face un relief dintr-o imagine și îl taie cu degroșare și finisare, fără nicio scobitură.
- **Feliile (9):** stratul de relief (Float32 pe dale 256², rar; Uint16 cu scară pentru salvare și undo pe dală) +
  stiva de straturi (combinare: adună, scade, păstrează înalt / jos, înlocuiește, multiply; vizibilitate; ordine);
  afișarea (2D umbrit și plasă 3D cu nivel de detaliu) + bugetul la 4000² pe calculatorul owner-ului; relieful din
  imagine (8 și 16 biți), alinierea pixelilor cu grila, relief ↔ imagine gri pe 16 biți; litofania; câmpul conservativ
  (maximul pe celulă) + dilatarea cu profilul frezei, cu distanța la segment [citit, `s5` §5.4]; degroșarea în trepte Z
  cu piele (portată) și finisarea paralelă la orice unghi; poarta 3D (nicio scobitură față de sursa exactă, creasta în
  toleranță) + simularea salvată ca strat de relief; o felie de rezervă; fișa plăcii 18.
- **Închide:** „Relief din imagine (gri → înălțime)”; „Alinierea pixelilor imaginii cu grila de calcul (fără „riduri”
  moiré)”; „Litofanie (relief din fotografie, pentru lumină)”; „Combinarea reliefurilor: adună, scade, păstrează înalt
  / jos, înlocuiește; Multiply între straturi”; „Rezoluție: cel puțin 4000 × 4000 de puncte (16 milioane), cu editare
  fluidă”; „Straturi de relief: combinare, vizibilitate, ordine”; „Relief ↔ imagine gri pe 16 biți; simularea salvată
  ca strat de relief”; „Degroșare 3D (în trepte Z)”; „Finisare paralelă (la orice unghi)”.
- **Placa 18:** pana de gri cu 8 trepte, Z alb = 5: treapta 128 la 128 / 255 · 5 = **2,510** ±0,05, treapta 255 la
  **5,00** ±0,1, treapta 0 la **0,00**; calota sferică R50 cu înălțimea 8 (imagine sintetică pe 16 biți): baza
  2·√(2·50·8 − 8²) = **Ø54,26** ±0,3 și înălțimea **8,00** ±0,1; geamăna ei doar degroșată, cu pielea 0,5: **8,50**
  ±0,1; litofania 100 × 70: grosimile **0,8** și **3,0** în pixelii din fișă ±0,1; timpul ±10 %. *Confirmă:* CL-ul
  analitic și câmpul conservativ din `s5`.
- **Live:** da.

#### Etapa 19 — Relieful 2: editorul de forme, textul, operațiile, analiza (săptămâna 20)
- **Feliile (9):** transformata de distanță (Danielsson, portată, 1,5–1,9 µm RMS [citit, `LECTII.md` §3.2]) din
  curbele exacte; editorul de forme: cupolă, rotunjit, unghi, plan, cu înălțime, unghi, limită, Zero și Zero Rest (2
  felii); relieful din text; operațiile (scalarea înălțimii, negativul, offsetul, netezirea, limita, planul înclinat);
  estomparea (liniară, radială, între contururi) și pantele pe pereți; analiza (harta de înălțimi și de pante) +
  suprafața, volumul și greutatea, din câmpul în nod, nu din cel conservativ [măsurat, `s5` §4.8]; o felie de rezervă;
  fișa plăcii 19.
- **Închide:** „Editor de forme: din vector → cupolă, rotunjit, unghi, plan; înălțime, unghi, limită; Zero / Zero Rest”;
  „Relief din text”; „Operații: scalarea înălțimii, negativ (male / female), offset, netezire, limită, plan înclinat”;
  „Estompare (liniară, radială, între contururi) și pante pe pereți (draft, cu unghi)”; „Analiza reliefului: hartă de
  înălțimi și hartă de pante (gradient)”; „Suprafața, volumul și greutatea reliefului (date pentru ofertă)”.
- **Placa 19:** cupola din cercul Ø60, înălțimea 6: vârful la **6,00** ±0,1; rotunjitul din 80 × 40 cu limita 5: palierul
  la **5,00** ±0,1; forma cu unghi de 45° pe o bandă de 40: la 4 mm de margine **4,00** ±0,15; textul „ANA” în relief:
  **3,00** ±0,1; planul înclinat 0 → 4 pe 100: la mijloc **2,00** ±0,1; negativul cupolei: adâncimea **6,00** ±0,1;
  greutatea prezisă a piesei față de cântar ±5 % (esența din fișă).
- **Live:** da.

#### Etapa 20 — 3D din modele: import, câmp conservativ, zone, decupare (săptămâna 21)
- **Feliile (9):** importul STL (binar și text), OBJ, 3MF, cu poziționare, scalare, oglindire, rotire și alegerea feței;
  rasterizarea conservativă a plasei + drop-cutter-ul exact pe triunghiuri ca oracol în CI; degroșarea și finisarea pe
  plase (același nucleu ca în etapa 18), cu poarta „nicio scobitură față de plasa exactă”; zonele: limitate (dreptunghi
  sau vector), libere, imbricate cu găuri, conturul automat al modelului, sărirea zonei din jur (2 felii); decuparea 3D
  (profil cu Z absolut, cu urechi și intrări, din mașinăria etapei 2); 3DS, VRML și DXF 3D; o felie de rezervă; fișa
  plăcii 20.
- **Închide:** „Import 3D din rețele de triunghiuri: STL, OBJ, 3MF, 3DS, VRML, DXF 3D; poziționare, scalare, oglindire,
  rotire, alegerea feței”; „Zone: limitate (dreptunghi sau vector), libere, imbricate (cu găuri), contur automat al
  modelului, sărirea zonei din jur”; „Decupare 3D: profil cu Z absolut în jurul piesei sculptate, cu punți și intrări /
  ieșiri”.
- **Placa 20** (un STL de referință, verificat cu un instrument independent: piramidă în trepte cu lățimile 60 / 45 / 30
  și înălțimile 4 / 8 / 12, plus o semisferă R10 deasupra): treptele la **4,00 / 8,00 / 12,00** ±0,1; lățimile
  **60,00 / 45,00 / 30,00** ±0,2; semisfera cu baza **Ø20,00** ±0,3 și vârful la **22,00** ±0,15; decuparea **70,00 ×
  70,00** ±0,2 cu urechi de **2,0**; nimic tăiat în afara zonei Ø50 (da / nu); timpul ±10 %.
- **Live:** da.

#### Săptămâna-tampon T2 (săptămâna 22)
Coada de defecte, reestimarea, retăierea plăcii de regresie. **Live:** da.

#### Etapa 21 — 3D: coliziunea, subtăierile, modelele înalte; extrudarea, sweep, spin (săptămâna 23)
- **Feliile (9):** coliziunea cu mandrina și cu motorul (al doilea profil peste același câmp); vizualizarea zonelor
  inaccesibile; modelul înalt construit din felii (după grosime sau după număr), cu înregistrarea între ele; extrudarea
  de-a lungul unei căi, cu profil (2 felii); two rail sweep; spin și turn; o felie de rezervă; fișa plăcii 21.
- **Închide:** „Detectarea coliziunii cu mandrina (collet) și cu motorul”; „Vizualizarea zonelor inaccesibile
  (undercut)”; „Model mai înalt decât freza sau decât placa: construit din felii (după grosime sau după numărul de
  felii)”; „Extrudare de-a lungul unei căi, cu profil”; „Two Rail Sweep; Spin (profil rotit în plan, pe 360° sau între
  unghiuri); Turn (formă strunjită)”.
- **Placa 21:** modelul de 30 în două felii de 15: fiecare **15,00** ±0,1, lipit **30,00** ±0,2; extrudarea unui profil
  semirotund R5 pe 100: lățimea **10,00** ±0,2, înălțimea **5,00** ±0,1; rozeta din spin: **Ø60,00** ±0,3; sweep între
  șine la 20: lățimea **20,00** ±0,3; un buzunar adânc și îngust e refuzat sau limitat pentru coliziune (da / nu); turn:
  diametrul maxim din fișă ±0,3.
- **Live:** da.

#### Etapa 22 — Relieful 3: îmbinări, straturi bitmap, sculptura, anvelopa (săptămâna 24)
- **Feliile (9):** contour blend, 3D blend, mirror-merge; relieful lipit pe vector și cookie cutter; straturile bitmap
  ca suprafață de desen și formele ridicate direct din culori (2 felii); sculptura (netezire locală, adăugare, scoatere,
  ștergere, întindere), pe CPU, pe dalele atinse, cu undo pe dală; deformarea în anvelopă pentru vectori (sub toleranța
  declarată) și pentru reliefuri (2 felii); o felie de rezervă; fișa plăcii 22.
- **Închide:** „Îmbinări: contour blend, 3D blend, mirror-merge, relief lipit pe vector, cookie cutter”; „Straturi bitmap
  ca suprafață de desen; forme ridicate direct din culori”; „Sculptare: netezire locală, adăugare / scoatere material,
  ștergere, întindere (smudge)”; „Deformare în anvelopă (între două curbe), pentru vectori și reliefuri”.
- **Placa 22:** relieful tăiat de o stea cu 5 vârfuri: **80,00** ±0,3 de la vârf la vârf; mirror-merge: două trăsături
  simetrice la aceeași distanță de axă ±0,2; regiunea ridicată din culoare: **2,00** ±0,1; textul în anvelopă între două
  arce: **30,00** la mijloc și **20,00** la capete ±0,3; zona sculptată: simularea nu arată nicio tăietură sub piele
  (ecran); șaua dintre două cupole îmbinate: înălțimea din fișă ±0,15.
- **Live:** da.

#### Etapa 23 — Relieful 4: față-verso, basorelieful, conturul (săptămâna 25)
- **Feliile (8):** relieful pe spate și prelucrarea cu întoarcere: fața de jos a foii, axa de întoarcere, alinierea pe
  muchiile stocului (știfturile sunt v1.x), simularea ambelor fețe, instrucțiunile de întoarcere pe fișă (2 felii);
  basorelieful din STL (gradienți, compresie logaritmică, Poisson multigrid pe benzi în bazin) și silueta (2 felii);
  conturul vectorial al reliefului (marching squares propriu, nu biblioteca AGPL), tăierea după culoare, magic wand; 2
  felii de rezervă; fișa plăcii 23.
- **Închide:** „Relief pe două fețe (back relief) și prelucrare cu întoarcere (flip machining)”; „Relief din model 3D
  (bas-relief din STL), siluetă”; „Conturul vectorial al reliefului (pe interval de înălțime); tăiere după culoare;
  magic wand”.
- **Placa 23:** gaura Ø6 prin față și lamajul Ø12 la 3 mm din spate: concentricitate ≤ **0,3**; buzunarul de pe spate la
  **20,00** ±0,3 de muchie și la **5,00** ±0,1 adâncime; basorelieful cu adâncimea totală **8,00** ±0,15; conturul la
  înălțimea 2 al unei cupole: cercul din fișă ±0,3; regiunea din magic wand: cotele din fișă ±0,3.
- **Live:** da.

#### Etapa 24 — Relieful 5: texturi, export STL, biblioteca, laserul 3D (săptămâna 26)
- **Feliile (8):** texturi pe relief, fluxul de textură, țesătura (2 felii); exportul STL / OBJ (deschis sau închis cu
  bază plană), cu decimare sub toleranță și plafon de mărime (o plasă completă de 4000² ar avea ~1,6 GB [citit, `s5`
  §6]); biblioteca proprie de clipart de relief (mecanismul + un set de pornire); laserul 3D în felii pe Z; 2 felii de
  rezervă; fișa plăcii 24.
- **Închide:** „Texturi pe relief, flux de textură, țesătură (weave)”; „Export relief ca STL / OBJ (deschis sau închis cu
  bază plană), cu toleranță”; „Bibliotecă de clipart de relief (proprie)”; „Laser: tăiere / gravare, plus laser 3D în
  felii pe Z”.
- **Placa 24:** țesătura cu pasul 10: **100,0** pe 10 perioade ±0,3; adâncimea texturii **1,00** ±0,1; STL-ul exportat,
  deschis într-un vizualizator străin: caseta din fișă (da / nu) și plasă închisă (validator independent, da / nu); un
  element din bibliotecă tăiat: înălțimea maximă din fișă ±0,15; laserul 3D, dacă există laser: adâncimea pe strat din
  fișă ±0,2.
- **Live:** da.

#### Etapa 25 — Trasarea din imagine; EPS și AI vechi (săptămâna 27)
- **Feliile (9):** trasarea pe luminanță, culoare și alfa (Otsu, muchie sub-pixel, potrivirea pe arce; portată, cu
  marching squares propriu); trasarea pe linia mediană; interpretorul PostScript limitat (stive, dicționare,
  proceduri, salvare / restaurare, matricea CTM, căi; buget de pași, timp și memorie; worker; antetul EPS binar) (2
  felii); profilul Illustrator + oracolul Ghostscript-WASM doar în test + cele 4 otrăvuri; AI ≤ 8 după specificația
  publică; 2 felii de rezervă; fișa plăcii 25. **Dacă owner-ul alege mesajul în loc de EPS (§3.6, punctul 7),
  etapa scade la ~4 felii.**
- **Închide:** „Trasare din imagine (bitmap → vectori)”. Avansează „Import 2D: …” (EPS, AI).
- **Placa 25:** logoul owner-ului, scanat la 300 dpi și trasat: lățimea **100,00** ±0,3; cercul trasat: **Ø40,00** ±0,3;
  trăsătura trasată pe linia mediană: lungimea din fișă ±1 %; un EPS Illustrator real: 2–3 cote din fișier ±0,2.
- **Live:** da.

#### Etapa 26 — Importul, partea 2: Corel, WMF / EMF, DWG ca mesaj (săptămâna 28)
- **Feliile (8):** profilul CorelDRAW (doar cu fișierele reale ale owner-ului); refuzurile explicite (operator
  necunoscut, EPS raster „fără vectori”, text și imagini sărite, cu numărul lor); cititorul WMF (antetul „placeable”,
  arce și elipse exacte, poligoanele rămân polilinii); EMF (Bézier); ușa DWG ca mesaj + convertor, DGK / PIC după decizia
  owner-ului, plafoanele de import pe artefact; corpusul owner-ului de ≥ 50 de fișiere reale, la ±0,01 mm; o felie de
  rezervă; fișa plăcii 26.
- **Închide:** „Import 2D: DXF, AI / EPS (S+D); SVG (D); PDF vectorial, DWG, WMF, DGK / PIC (S)”, în forma decisă de
  owner (§5.6).
- **Placa 26:** fișierele reale ale owner-ului (un DXF din programul lui, un EPS Corel, un WMF de clipart), gravate: 5–8
  cote din fișiere ±0,2.
- **Live:** da.

#### Etapa 27 — Facturarea (P3) și partea legală (săptămâna 29)
- **Precondiție:** ce conține fiecare nivel e decis de owner până la etapa 20 [citit, `BRIEF.md` §4].
- **Feliile (8):** catalogul unic (aceleași produse ca în ediția întâi) + lista albă de prețuri, în `shared/`; Checkout prin
  extensia Stripe, în modul de test, cu lista albă impusă în reguli + webhook-ul → dreptul de acces; portalul clientului
  și plățile eșuate; Venituri (MRR din catalogul unic, eticheta „MOD DE TEST”), cozile de eșecuri, verificările Stripe
  din Diagnoză, placa MRR din Puls; Termenii, confidențialitatea, identitatea firmei, consimțământul pentru evenimente;
  matricea de capabilități pe niveluri, cu perechi permis / refuzat; o felie de rezervă; placa 27.
- **Închide:** adminul **P3** (Venituri).
- **Placa 27:** placa de regresie generată pe live dintr-un cont plătit (mod de test) și dintr-un cont cu proba
  expirată: hash-ul = cel de aur (da / nu); 5 cote canonice (ca la placa 14); proba expirată blochează exportul cu
  mesaj clar (ecran).
- **Live:** da.

#### Etapa 28 — Cele două interfețe, ghidul de pornire, adminul P4 (săptămâna 30)
- **Feliile (9):** asistentul pas cu pas (fluxurile: plăcuță, piesă decupată, text în V-carve, relief din imagine),
  peste același registru de acțiuni (2 felii); trecerea asistent ↔ interfața completă fără pierderea documentului;
  ghidul la prima pornire (profilul mașinii, frezele, originea, prima tăiere de probă); Analiza (pâlnia, adopția din
  id-urile acțiunilor), CAM simplificat, rezumatul zilnic; auditul en / ro (plurale, chei); fiecare filă de admin
  exersată pe test; Puls complet; placa 28.
- **Închide:** „Două interfețe: asistent pas cu pas pentru începători + interfața completă”; **§10 „Ghid la prima
  pornire”**; adminul **P4** (Analiză, CAM).
- **Placa 28** (un job de începător, făcut de owner doar prin asistent: plăcuță 200 × 100 cu urechi, nume în V-carve,
  2 găuri): **200,00 × 100,00** ±0,2; găurile la **180,00** ±0,2; creasta din fișă ±0,1; owner-ul n-a ieșit din
  asistent (da / nu).
- **Live:** da.

#### Săptămâna-tampon T3 (săptămâna 31)
Coada de defecte, reestimarea, retăierea plăcii de regresie. **Live:** da.

#### Etapa 29 — Atelierele, regresia, laptopul de atelier (săptămâna 32)
- **Feliile (8):** rezultatele rundelor 2–3 → contractele „probate pe <dată>, <versiune>” + teste de aur; performanța pe
  un laptop real de atelier (randarea în worker, bugetul LINE_STRIP, editarea reliefului la 4000²); plafoanele pe
  artefact (documentul de 50 k forme, traseul de 5 M de segmente); placa de regresie completă + transcrierile; coada de
  defecte, cu gravitate (3 felii); placa 29.
- **Închide:** lista de lansare, punctul „posturile NcStudio, Richauto/Syntec și Mach3 probate pe controlere reale”
  (dacă rezultatele au venit).
- **Placa 29:** placa de regresie completă: 10 cote, câte una din etapele 1, 2, 5, 6, 7, 8, 12, 13, 18, 20, cu valorile
  lor pe hârtie.
- **Live:** da.

#### Etapa 30 — Lansarea (săptămâna 33)
- **Feliile (8):** testul cu un străin dintr-un atelier (își face cont și taie o piesă fără ajutor; owner-ul doar
  privește; transcrierea intră în teste); reparațiile din test (2 felii); Stripe live, dacă a venit CAEN, sau decizia
  owner-ului de lansare fără încasare; partea legală completă; exercițiul de restaurare din backup, Diagnoza verde, en +
  ro complet; scoaterea porții de pre-lansare și cifrele publice derivate din cod; fiecare rând v1 din
  `ACOPERIRE-ARTCAM-DESKPROTO.md` cu „făcut” și commit + placa de lansare.
- **Închide:** lista de lansare din `BRIEF.md` §8.
- **Placa 30:** piesa străinului (cotele din desenul lui, 5) + hash-ul plăcii de regresie.
- **Live:** da, lansarea, cu confirmarea owner-ului.

### 5.3 Unde ajunge fiecare rând

**Cele 65 de rânduri v1** (etapa în care se închide):

| Grupa | Rândul (început) | Etapa |
|---|---|---:|
| A | Vectori, noduri, boolean, offset, aliniere | 6 |
| A | Text, text pe cale, fonturi | 7 |
| A | Verificarea și repararea vectorilor | 10 |
| A | Import 2D: DXF, AI / EPS (S+D); SVG (D); PDF vectorial, DWG, WMF, DGK / PIC (S) | 2 → 9 → 25 → **26** |
| A | Export 2D cu vectori reali | 9 |
| A | Cote | 10 |
| A | Deformare în anvelopă (între două curbe), pentru vectori și reliefuri | 22 |
| A | Trasare din imagine (bitmap → vectori) | 25 |
| A | Mai multe foi de material… (Sheets) și… (Multi-Plate) | 11 |
| A | Transformare și copiere | 6 |
| A | Tăierea și conversia vectorilor | 10 |
| B | Profil, cu urechi de susținere, intrări / ieșiri, direcție de tăiere | 2 |
| B | Fileturi la colțuri interioare: dog-bone și T-bone | 2 |
| B | Buzunar (curățare de suprafață), cu mai multe freze | 5 |
| B | V-carve (inclusiv cu freză dreaptă pentru fund plat) | 8 |
| B | Găurire | 5 |
| B | Ordinea operațiilor și a vectorilor; câte un fișier separat pe sculă | 5 |
| B | Gravare pe linie; gravare „inteligentă” cu colțuri ascuțite | 7 → **8** |
| B | Inlay în V (D) ȘI inlay cu pereți drepți, simplu sau în trepte (S) | 12 |
| B | Caneluri (cu încrucișări împletite), teșire (bevel carving), Raised Round | 16 |
| B | Freze de profil desenate de utilizator; roundover cu offset față de interior | 16 |
| B | Transformarea traseelor calculate | 10 |
| B | Traseu de textură direct din forma frezei, fără relief | 17 |
| B | Tăieri ghilotină…; găurire cu mai multe burghie simultan (drillbanks) | 17 |
| B | Laser: tăiere / gravare, plus laser 3D în felii pe Z | 17 → **24** |
| C | Relief din imagine (gri → înălțime) | 18 |
| C | Alinierea pixelilor imaginii cu grila de calcul | 18 |
| C | Litofanie | 18 |
| C | Editor de forme | 19 |
| C | Combinarea reliefurilor | 18 |
| C | Extrudare de-a lungul unei căi, cu profil | 21 |
| C | Two Rail Sweep; Spin; Turn | 21 |
| C | Relief din text | 19 |
| C | Operații: scalarea înălțimii, negativ, offset, netezire, limită, plan înclinat | 19 |
| C | Estompare… și pante pe pereți | 19 |
| C | Conturul vectorial al reliefului; tăiere după culoare; magic wand | 23 |
| C | Export relief ca STL / OBJ, cu toleranță | 24 |
| C | Rezoluție: cel puțin 4000 × 4000 de puncte, cu editare fluidă | 18 |
| C | Îmbinări: contour blend, 3D blend, mirror-merge, relief lipit pe vector, cookie cutter | 22 |
| C | Straturi bitmap ca suprafață de desen; forme ridicate direct din culori | 22 |
| C | Sculptare | 22 |
| C | Straturi de relief: combinare, vizibilitate, ordine | 18 |
| C | Relief pe două fețe (back relief) și prelucrare cu întoarcere | 23 |
| C | Relief din model 3D (bas-relief din STL), siluetă | 23 |
| C | Texturi pe relief, flux de textură, țesătură | 24 |
| C | Analiza reliefului: hartă de înălțimi și hartă de pante | 19 |
| C | Relief ↔ imagine gri pe 16 biți; simularea salvată ca strat de relief | 18 |
| C | Suprafața, volumul și greutatea reliefului | 19 |
| C | Bibliotecă de clipart de relief (proprie) | 24 |
| D | Import 3D din rețele de triunghiuri: STL, OBJ, 3MF, 3DS, VRML, DXF 3D… | 20 |
| D | Degroșare 3D (în trepte Z) | 18 |
| D | Finisare paralelă (la orice unghi) | 18 |
| D | Animația traseului | 4 |
| D | Timpul estimat… și rezumatul jobului | 4 |
| D | Zone: limitate, libere, imbricate, contur automat, sărirea zonei din jur | 20 |
| D | Detectarea coliziunii cu mandrina (collet) și cu motorul | 21 |
| D | Vizualizarea zonelor inaccesibile (undercut) | 21 |
| D | Decupare 3D: profil cu Z absolut… | 20 |
| D | Model mai înalt decât freza sau decât placa: construit din felii | 21 |
| F | Simulare 3D a materialului: 3 axe în v1 | 4 |
| F | Bibliotecă de freze cu geometrie reală | 5 → **16** |
| F | Trimiterea directă la mașină (senderul) | 3 → **13** |
| F | Calcul pe mai multe fire (workers) | 4 |
| F | Șabloane de operații și calcul în lot | 15 |
| F | Două interfețe: asistent pas cu pas + interfața completă | 28 |

Numărătoarea: A 11, B 14, C 24, D 10, F 6 = **65**.

**Cele 8 funcții din `BRIEF.md` §10:** listă de tăiere pe mai multe plăci (11); fișă de lucru tipărită (15); senzor de
lungime cu M6 ca barieră (13); găsirea colțului XY prin palpare (13); override de avans / turație + jurnal (13);
planarea plăcii de sacrificiu (13); găurire în pași (5); ghid la prima pornire (28).

**Adminul** [citit, `adm` §5.2]: P0 (3); P1 (3); P2 (14); P2+ (15); P3 (27); P4 (28). Cele 12 file: Erori și Diagnoză
(3, crește la fiecare etapă), Operare cu publicarea (3 mecanismul, 15 panoul), Utilizatori, Audit, Admini (14), Tichete
și Config (15), Venituri (27), Analiză și CAM (28), Puls (14 → 28). Fila AI vine cu AI-ul, „mai târziu”.

**Lista de lansare din `BRIEF.md` §8:**
- toate rândurile v1 și cele 8 funcții făcute; fiecare rând cu commit-ul lui: continuu, verificat în etapa 30;
- fiecare funcție care mișcă mașina, probată pe placa etapei ei: etapele 1–30;
- posturile pentru NcStudio, Richauto / Syntec, Mach3 probate pe controlere reale: rundele din etapele 4, 9, 17,
  închise în 12 și 29;
- un străin își face cont și taie fără ajutor: etapa 30;
- plata (Stripe live după CAEN, sau decizia owner-ului): 27 → 30;
- partea legală: 27 → 30;
- backup cu alarmă și jurnal de erori de server: 3; costul AI pe apel: nu se aplică (fără AI în v1); en + ro complet:
  28 → 30;
- adminul complet și exersabil pe test: 28;
- exportul vectorial probat cu cititor independent și deschis de owner în programele lui: 9 (și reverificat în 30).

### 5.4 Pachetul pentru ateliere și prima publicare pe live

- **Pachetul de probă pleacă la sfârșitul etapei 4 (săptămâna 4)**, după ce owner-ul a rulat aceleași fișiere T pe
  GRBL în etapa 3. Atelierele sunt drumul critic [citit, `s8` §5.11; `BRIEF.md` §15].
  - **Runda 2** (RichAuto, care probabil cere două runde [citit, `s8` §2], plus ce a ieșit greșit): etapa 9.
  - **Runda 3** (câte un job real: profil, buzunar, V-carve, pe fiecare controler): etapa 17.
  - Rezultatele intră în teste în etapele 12 și 29.
- **Prima publicare pe live: sfârșitul etapei 3 (săptămâna 3).** De ce atunci, și nu mai devreme sau mai târziu:
  - abia atunci există mecanismul de publicare cu sha fixat și aprobare (P1) și jurnalul de erori (P0) [citit, `adm`
    §5.2];
  - aplicația nouă face deja tot drumul pe mașina owner-ului: desen sau SVG → profil cu urechi → G-code → sender;
  - mecanismele publicării, puse devreme, sunt ieftine; retrofitate au costat 18 commit-uri și ~3 000 de linii în ediția
    întâi [citit, `LECTII.md` §6, lecția 17].

### 5.5 Ce se schimbă dacă owner-ul alege A

- **Modelul:** `Doc { sheets: [{ stoc, root }] }` în loc de `parts` + `sheets`.
- **Etapa 11 scade cu ~2 felii:** fără instanțe, fără «Desprinde» și fără lista de piese. Multi-Plate devine „copii cu
  câmpuri”: aceleași gesturi, dar 60 de noduri în loc de 2 la 30 de plăcuțe [măsurat, `pp` §4].
- **Etapa 23 crește cu ~1 felie:** fața de jos e o planșă-copie oglindită, iar în prototip spatele rămânea nealiniat
  cu 50 mm, fără avertisment [măsurat, `pp` §4]. E nevoie de un avertisment de aliniere.
- **Prețul pentru owner:** textul schimbat pe 12 suporturi cere 26 de gesturi în loc de 6, iar buzunarul pe spate 39
  în loc de 9 [măsurat, `pp` §2].
- **Plafonul pe artefact** trebuie să ducă și copiile: un șablon de 400 de forme pus de 50 de ori dă 20 000 de forme
  [citit, `LECTII.md` §5.4]. Workerul de randare ține 50 k forme [măsurat, `v3`].
- Total: ~1 felie mai puțin, cu mai multe gesturi pentru owner în scenariile 5 și 7.

### 5.6 Ce las afară, explicit

Nimic nu iese din prag fără owner. Ce urmează sunt propuneri, cu recomandarea mea:
- **DGK / PIC** din rândul de import: fără specificație publică; propun scoaterea (o decide owner-ul).
- **DWG nativ:** în v1 doar mesaj și convertor; nativul, de decis în v1.x.
- **EPS / AI ca format de export:** rândul de export le lasă „de decis”; recomand nu în v1 (Illustrator și Corel deschid
  PDF și SVG [citit, `s2` §5.4]). Dacă owner-ul le vrea: +1 felie (scriitorul EPS e gata în sondă).
- **EPS / AI ≤ 8 și WMF / EMF la import:** în plan (etapele 25–26), dar recomand decizia pe corpusul real.
- **Din afara rândurilor:** copiile proiectelor în cloud nu apar în prag, în §10 sau în §8. Recomand să nu intre în v1
  (§8, întrebarea 7).

---

## 6. Estimarea

**Total: 254 de felii în 30 de etape, plus 3 săptămâni-tampon = ~33 de săptămâni.** Pasul 0 mai are ~2 felii de analiză.

| | Felii |
|---|---:|
| Fundația, platforma, cloud-ul de bază (P0, P1) | ~20 |
| Geometria și editorul | ~25 |
| Textul | ~5 |
| Importul, exportul, trasarea (cu EPS / AI ~7 și WMF / EMF ~2) | ~27 |
| Planșele | ~8 |
| CAM 2D / 2.5D | ~42 |
| Postul și mașina | ~17 |
| Simularea | ~9 |
| Sculele și materialele | ~3 |
| Relieful | ~45 |
| 3D din modele | ~15 |
| Interfața (asistentul, fișa, ghidul) | ~5 |
| Conturile, facturarea, adminul P2–P4, partea legală, lansarea | ~18 |
| Felii de rezervă în interiorul etapelor | ~15 |
| **Total** | **~254** |

**Presupunerile, scrise:**
1. **O felie = ~o jumătate de zi de lucru**, cu oracol, valori pe hârtie, commit și ceva de încercat.
2. **~8,5 felii pe săptămână.** Sprijinul măsurat, din ediția întâi:
   - 9 felii în 5 zile pe o zonă grea, cu recenzii și regresii, adică ~1,8 pe zi [citit, `faza0/02` D10];
   - 17 felii în 2 zile pe reparații mici, cu un brief clar [citit, `faza0/28` §4];
   - ~19 felii în ~4 zile după un audit [citit, `faza0/27` S9];
   - 97 din 127 de zile au avut commit-uri, adică ~5,3 zile pe săptămână [citit, `faza0/00`].

   Iau rata grea (1,8 pe zi) × ~5 zile, minus ziua plăcii. Rata ușoară (8,5 pe zi) n-o folosesc: era pe reparații mici.
3. **Fiecare etapă are ~1 felie de rezervă, iar la 10 etape vine o săptămână-tampon.** Rezerva totală e ~17 %. În
   august, ediția întâi plătea fiecare felie de 2–3 ori [citit, `LECTII.md` §2.3]. Dovada scrisă înainte trebuie să
   scadă asta, dar n-am încă o cifră nouă [dedus].
4. **Owner-ul taie placa săptămânal** [citit, `BRIEF.md` §6]. O placă ratată ține etapa pe test, nu oprește lucrul.
5. **Cifra se reface din durate măsurate** la sfârșitul etapelor 3 și 6 (felii pe săptămână, reale). O felie care
   depășește estimarea cu peste 50 % oprește lucrul și se întreabă owner-ul [citit, `CLAUDE.md`].

**Sensibilitatea:**

| Felii pe săptămână | Săptămâni (cu tampoanele) | Lansarea, de la 19.10.2026 |
|---:|---:|---|
| 10 | ~28 | începutul lui mai 2027 |
| **8,5** | **~33** | **începutul lui iunie 2027** |
| 7 | ~39 | a doua jumătate a lui iulie 2027 |

**Comparația cu planul din PDF:** M3–M11 însumau 139–199 de felii pentru un v1 mai mic, iar drumul întreg 188–273
[citit, `CERCETARE-DETALIATA.json`, `arch.roadmap`; `BRIEF.md` §11]. Cele 254 de aici stau în acel interval, cum
prevedea `BRIEF.md` §11.

**Pârghiile owner-ului, dacă drumul e prea lung** (`BRIEF.md` §15). Nu le recomand; le arăt cu costul lor:
- EPS / AI ≤ 8 → mesaj în v1: −7 felii;
- WMF / EMF → mesaj în v1: −2;
- texturi și țesătură, biblioteca de clipart de relief: −5;
- îmbinările de relief: −3;
- sweep, spin, turn: −3;
- laserul (dacă owner-ul n-are laser de probă): −5;
- modelul înalt din felii: −2.

Total: ~27 de felii, adică ~3 săptămâni. Ca informație: cel mai devreme punct cu o buclă 2D completă pentru un
străin e sfârșitul etapei 13 (săptămâna 14).

---

## 7. Riscurile

| # | Riscul | Semnalul timpuriu | Ce facem |
|---:|---|---|---|
| 1 | **Ritmul real e sub 8,5 felii pe săptămână** (dovada se scumpește ca în august) | media etapelor 1–3 sub 7 pe săptămână; o felie peste 1,5 × estimarea | reestimare la etapele 3 și 6; dovada rămâne oracol + hârtie + invariante, fără ritualuri în plus; pârghiile din §6, puse în fața owner-ului |
| 2 | **Atelierele externe întârzie** (posturile sunt pe drumul critic) | la sfârșitul etapei 2 owner-ul n-are trei ateliere confirmate; la etapa 9 nu există rezultate din runda 1 | pachetul pleacă în săptămâna 4; trei runde planificate; fișierele sunt mici și se rulează întâi în aer [citit, `s8` Anexa B]; owner-ul poate merge el în atelier |
| 3 | **cavalier cade pe importurile reale** (polilinii dense, zimți) | după etapa 9, suita densă are eșecuri explicite peste 1 % | gărzile de intrare și de ieșire; criteriul de ieșire; apoi întrebarea Rust → WASM |
| 4 | **PathKit înghețat** (o incompatibilitate viitoare sau derivă) | segmente nepotrivite de R3 pe corpus; o eroare de încărcare WASM în Chrome nou | R3 după fiecare operație; fațada permite CanvasKit fără alt cod |
| 5 | **Laptopurile din ateliere sunt mai slabe** decât mașina de măsură | imaginea exactă de 10 k forme > 300 ms sau sculptura < 30 de cadre pe laptopul de probă | LINE_STRIP implicit, nivel de detaliu, bugete alese la pornire dintr-un test de cadru; un laptop real măsurat devreme (§8) |
| 6 | **Relieful (24 de rânduri) e subestimat** | etapele 18–19 depășesc cu peste 2 felii | săptămâna-tampon T2; pârghiile din §6; ordinea rămâne de la riscul mic la cel mare [citit, `s5` §6] |
| 7 | **Primul deploy pe proiectele refolosite strică ceva vechi** (funcții, extensii, regiuni) | lista de ștergere conține funcții ale extensiilor; deploy-ul pe test dă erori | export Firestore înainte; lista confirmată de owner; extensiile neatinse; test întâi, în etapa 1 |
| 8 | **CAEN și firma nu vin la timp** (plata și partea legală blochează lansarea) | fără coduri CAEN până la etapa 20 | owner-ul decide lansarea fără încasare [citit, `BRIEF.md` §8]; Venituri arată „MOD DE TEST” |
| 9 | **Owner-ul, singurul judecător, nu mai ține pasul** (ca OWNER_VERIFY în ediția întâi) | o placă netăiată două săptămâni la rând; lista lui trece de 5 lucruri | plăci mici (≤ 30 min la mașină); etapa rămâne pe test, nimic pe live fără placă; lista ține cel mult 5 lucruri deschise [citit, `BRIEF.md` §7] |
| 10 | **Contextul se pierde între sesiuni și modele** | o sesiune redeschide o decizie luată; DEVLOG-ul crește mai repede decât codul | ADR-uri scurte (o pagină pe decizie); `CLAUDE.md` la zi; planul cu starea fiecărei felii; cifrele din documente generate, nu narate [citit, `LECTII.md` §4.13] |

Alte riscuri, mai mici: Drive-ul readuce fișiere vechi (plasa: git e sursa de adevăr, push după fiecare felie
[citit, `CLAUDE.md`]); senderul pe firul principal sub încărcare (proba: 100 000 de linii pe emulator în timp ce
interfața lucrează; dacă planificatorul GRBL rămâne gol, senderul se mută într-un worker [dedus]); `willReadFrequently`
schimbat de o versiune nouă de Chromium (testul nocturn din §3.6, punctul 6).

---

## 8. Ce cere de la owner

Lista ține cel mult 5 lucruri deschise odată [citit, `BRIEF.md` §7]. Recomandarea e prima.

### Acum, înainte de etapa 1 (cele 5 deschise)

1. **Planșele: A sau D?** Recomand **D**: la scenariile 5 și 7, 6 gesturi față de 26 și 9 față de 39 [măsurat, `pp`].
   Ce se schimbă cu A: §5.5. Mai sunt trei alegeri ale prototipului: ce e „piesă” pe foaie, Ctrl+D = copie separată,
   mărimea instanței = mărimea piesei [citit, `pp` §5]; recomand variantele din prototip.
2. **Exportul DXF: deschide fișierele din `s2-export-import/pachet-owner/`** în ArtCAM, AutoCAD sau LibreCAD,
   Inkscape, CorelDRAW. Recomand **un singur preset (R2007 exact)**; al doilea (R12) intră doar dacă unul din programe
   nu deschide R2007.
3. **Atelierele:** găsește câte un atelier cu NcStudio, Richauto / Syntec și Mach3 / Mach4, cu versiunea
   controlerului, până la sfârșitul etapei 2. Pachetul pleacă în săptămâna 4.
4. **Corpusul de fișiere:** 30–50 de fișiere primite de ateliere în ultimele luni (DXF, EPS, AI, PDF, WMF, DWG),
   până la sfârșitul etapei 2. Din ele decidem EPS, AI vechi și WMF (§3.6, punctul 7).
5. **Prima publicare pe live la sfârșitul etapei 3, cu aplicația deschisă doar personalului până la lansare.**
   Recomand **da**. Aplicația veche dispare de pe live; codul ei rămâne în GitHub și local.

### La etapa indicată

6. **DGK / PIC** (până la etapa 26): recomand scoaterea din prag, cu motivul scris la „Scoase la reverificare”.
7. **Copii ale proiectelor în cloud în v1** (până la etapa 14): recomand **nu**. v1 rămâne local, cu fișierul `.cncvs` și
   cererea `persist()`. Dacă da: +4–6 felii, în etapa 14 sau 15.
8. **Ce conține fiecare nivel de abonament** (până la etapa 20) [citit, `BRIEF.md` §4].
9. **Creditele de export din ediția întâi** (până la etapa 14): recomand **nu** [citit, `adm` §5.4].
10. **Jurnalul de erori fără consimțământ**, cu uid pseudonim și retenție de 90 de zile (până la etapa 3): recomand
    **da**, cu o frază în politica de confidențialitate, de verificat juridic [citit, `adm` §5.4].
11. **Laserul** (până la etapa 17): ai un laser pentru plăci? Dacă nu, rândul se probează pe simulare și într-un atelier.
12. **EPS / AI ca export** (până la etapa 9): recomand **nu**.
13. **Toleranța mașinii pentru plăci** (înainte de etapa 1): recomand ±0,2 mm în plan și ±0,1 mm pe adâncime.
14. **Semantica formelor care se ating în aceeași operație V-carve** (până la etapa 8): recomand reuniunea, cu
    vindecarea raportată [citit, `v2` §5.4].
15. **Rust compilat în WASM pentru cavalier:** recomand **nu**, cât timp trece criteriul din etapa 9.

### Pași de configurare (asistentul pregătește comenzile, owner-ul confirmă sau le rulează în consolă)

- **Etapa 1:** confirmarea exportului Firestore pe test și a listei de funcții vechi de șters pe test.
- **Etapa 3:**
  - cheia reCAPTCHA Enterprise pentru domeniul de test și tokenul de debug App Check, doar pe test, ca secret în CI
    [citit, `adm` §5.3];
  - mediul `live` în GitHub, cu owner-ul ca aprobator obligatoriu;
  - legarea WIF pe ambele proiecte;
  - exportul Firestore pe live și lista funcțiilor vechi de șters pe live.
- **Etapa 3 sau 4:** un laptop real de atelier (modelul sau accesul la el), pentru bugetele de pânză.
- **Până la etapa 15:** DNS-ul domeniului pentru e-mail (MX, SPF, DKIM) [citit, `BRIEF.md` §7].
- **Până la etapa 27:** entitatea juridică, adresa de firmă, textele juridice.
- **Mereu:** materialul și sculele pentru plăci (§5.0).
