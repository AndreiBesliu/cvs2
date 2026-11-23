# ADR 0231: Biblioteca extensiilor, refăcută: fereastra ei, semnul extensiei, capturile și „ce e nou”

**Starea:** acceptat pe 23.11.2026, cu toate recomandările („Da, 1a–4a”; „Răspunsurile owner-ului”, mai jos), pentru felia
3.Xh, a liniei bibliotecii (ramura `wip/3.Xh-biblioteca-ui`, din `main` `8f122eb6`). **Implementat:** 3.Xh-1 (datele),
3.Xh-2 (ferestrele de confirmare) și 3.Xh-3 (fereastra bibliotecii) pe 23.11; 3.Xh-4 urmează („Implementat”, la capăt). Cererea owner-ului, din aceeași zi: „poti sa pornesti un branch in
care sa modificam libraria de plugin-uri? vreau ceva mai frumos si cu un UI/UX mai bun si atragator”. **Continuă:** ADR 0230 (biblioteca: toate marginile lui
rămân, §C), ADR 0127 și 0128 (pachetul, permisiunile arătate la instalare), ADR 0160 (fereastra extensiei), ADR 0164 (tema),
ADR 0167 (semnul lui Easy 3Draw, lăsat acolo pentru „altă decizie, cu schiță”), ADR 0250 (aranjamentele, densitatea).
**Schița**, cu capturile de azi, cele trei direcții pe ambele teme, la birou și pe telefon, în română și în engleză, și cu
formularul întrebărilor (colecția `raspunsuri`, documentul `owner`): <https://claude.ai/artifact/RVvJq3q2NPxtTPm2Y8Q8EV>.

## Ce e azi (capturile din 23.11)

Build-ul de pe `8f122eb`, 87 de capturi cu Playwright: meniul Extensii cu extensia neinstalată, instalată, cu o versiune
nouă, cât se încarcă biblioteca, fără rețea și cu un catalog stricat; fereastra instalării, a actualizării și a gestionării;
extensia deschisă. La 1440, 1024 și 390 px, pe ambele teme, în română și în engleză. Cifrele sunt măsurate în pagină. (În
container lipsește Edge, deci capturile sunt făcute cu Chrome 153, același motor.)

1. **Nimic de privit.** Biblioteca e o cutie de text de 362 px în meniu. Extensia deschisă arată bogat (circuitul din lemn,
   piesele 3D), dar înainte de instalare omul nu vede nicio imagine și niciun semn al ei.
2. **Easy 3Draw apare de două ori.** Instalată, are un rând sus și cardul din Biblioteca dedesubt. La o versiune nouă, sus
   scrie „actualizare: 18.18.0” (nu se poate apăsa), iar butonul e jos.
3. **Meniul sare.** Cât se încarcă biblioteca are 250 × 215 px; când sosește catalogul, 362 × 377 px (fără rețea, 324 ×
   225). Rândurile de dedesubt pleacă de sub cursor.
4. **Fereastra instalării e un zid de text.** La 1440 px are 896 px lățime și cinci paragrafe la fel de grele. Ce cere
   extensia e o singură frază de 450 de caractere, pe rânduri de ~90 de caractere (pe telefon, 12 rânduri; la 320 px, 16).
   Titlul „Instalezi o extensie?” nu spune care.
5. **Ținte mici la atingere.** Pe telefon, butonul „Instalează” are 82 × 28 px și rândurile meniului 30 px; butoanele
   ferestrelor au 44 px.
6. **Cuvinte de programator.** „Biblioteca nu se poate încărca acum (format).”, „451,2 kB” fără niciun reper, „18.18.0 ·
   deschide fereastra” ca legendă a rândului.
7. **Trei ferestre, trei așezări.** Instalarea, „e instalată” și „Extensiile tale” arată fiecare altfel. „Scoate” e text
   simplu și șterge pe loc extensia cu datele ei (ADR 0128 §B), fără nicio întrebare.
8. **Un singur drum, greu de găsit.** Intrarea e o piesă de puzzle de 16 px, fără nume. Rămâne discretă (decizia din 02.11),
   dar nici paleta (Ctrl K) nu găsește biblioteca.
9. **N-are unde crește.** Meniul n-are derulare. Cu trei extensii în catalog (un card are 180 px) ar trece de un ecran de
   768 px.
10. **Actualizarea nu spune ce aduce.** „Actualizează la 18.18.0” vine fără niciun cuvânt, deși de la 18.6.0 au intrat
    roțile, fuliile, șenila, filele și căutarea.

## Decizia

### A. Trei direcții care se exclud; aleasă: B

Diferă doar locul în care stă biblioteca. Machetele sunt în schiță.

| | A · Meniul de azi, îmbunătățit | **B · Fereastra „Biblioteca extensiilor”** | C · Pagina pe tot ecranul |
| --- | --- | --- | --- |
| Ce vede omul | un card cu semnul extensiei și un singur buton; o extensie apare o singură dată; versiunea nouă, o bandă sub rândul ei | meniul rămâne scurt; biblioteca are fereastra ei, cu lista în stânga și pagina extensiei în dreapta | un magazin, ca fereastra Mașina: captura mare, grila, căutarea, filele |
| Loc pentru capturi și „ce e nou” | nu (doar o propoziție) | da | da, cel mai mult |
| Câte extensii cuprinde bine | 3–4 | ~20 | oricâte |
| Atinge bara de sus și aranjamentele (ADR 0250) | nu | nu | da: o filă nouă în toate cele patru |
| Pornirea | 0 | 0 | 0 |
| Totalul (acum 760,9 / 800 kB), estimat | +2 kB | +6 kB | +10 kB |
| Fișiere noi lângă aplicație, în afara plafonului | semnul, ~3 kB | semnul și capturile, ~100 kB | semnul și capturile, ~100 kB |
| Felii de câte o jumătate de zi | 3 | 4 | 5–6 |

**B, recomandată:**
- **Meniul Extensii**, scurtat: extensiile instalate (semnul, numele, versiunea; clicul o deschide), banda „Versiunea … e
  gata”, cu „Actualizează” (dintr-un clic, ca azi), și rândul „Biblioteca extensiilor…”. Catalogul se cere tot la
  deschiderea meniului; cât vine, meniul își ține mărimea.
- **Fereastra „Biblioteca extensiilor”** (o bucată nouă, adusă la primul clic), cu filele „Toate” și „Instalate”:
  - în stânga, lista: semnul, numele, o linie de descriere, starea (versiunea nouă, ✓);
  - în dreapta, pagina extensiei: semnul mare, numele, autorul, versiunea și mărimea; până la patru capturi; descrierea; „Ce
    e nou”, pe ultimele versiuni; „Ce poate face”, o listă cu câte o pictogramă, un titlu și explicația de azi; „Rulează
    izolată…”, scos în evidență;
  - **„Instalează” stă în pagina extensiei**, cu ce cere ea la vedere; nimic nu se descarcă înaintea lui. Butonul arată apoi
    „Descarc și verific…” și devine „Deschide”. A doua fereastră dispare: pagina e confirmarea (ADR 0230, răspunsul 2a, rămâne:
    întâi vezi ce cere, apoi instalezi);
  - o versiune nouă: „Actualizează la …” dintr-un clic; dacă cere ceva în plus, întâi fereastra de confirmare (§B.3);
  - fila „Instalate” ține locul ferestrei „Extensiile tale”: de unde vine fiecare, de când, cât ocupă datele ei, „Scoate”;
  - „Din fișier sau adresă…” deschide căile de azi, „din afara bibliotecii”.
- **Pe telefon (sub 48 rem):** fereastra ține tot ecranul; lista, apoi pagina extensiei, cu „înapoi”.
- **Linkul `#biblioteca=<id>`** deschide fereastra pe pagina acelei extensii.

**De ce B:** e singura care arată ce face extensia fără să atingă carcasa. Ferestrele sunt aceleași în toate cele patru
aranjamente, deci nu se ciocnește cu linia lor și nu cere loc în bara de sus (proba de 1280 px cu fontul lat). Păstrează
piesa de puzzle discretă (decizia din 02.11). E varianta 7b din ADR 0230, lăsată acolo pentru ziua în care meniul nu mai
ajunge. A rămâne doar text, deci „mai atrăgător” s-ar face pe jumătate. C costă aproape dublu, iar cu o singură extensie
pagina e aproape goală.

### B. Ce se face în orice direcție

Ce poate sta împreună nu se întreabă: intră în felii.

1. **Datele noi ale catalogului**, toate opționale (tabelul de sub listă). Un catalog fără ele rămâne valid, iar o filă veche
   a aplicației le sare (`citesteRand` ia doar câmpurile pe care le știe), deci catalogul rămâne la schema 1. Fișierele stau
   în `dist/extensii/`, cu amprenta în nume și `immutable`, ca pachetele: în afara precache-ului și a plafonului, cerute doar
   când se deschide biblioteca. Poarta build-ului le cere exact pe cele din catalog, cu mărimea lor. **CSP-ul nu se
   schimbă:** `img-src 'self' data: blob:` există deja.
2. **Semnul stă în pachet:** `extensie.json` primește câmpul opțional `pictograma` (un fișier din `fisiere`, deci cu
   amprenta lui verificată). Așa îl are și o extensie instalată din fișier, și fără internet: în meniu, în fila ei și în
   bibliotecă. O gazdă veche îl sare. Se arată doar ca `<img>` (dintr-o adresă `blob:` sau din fișierul de lângă catalog),
   niciodată pus în pagină ca SVG. Fără semn, piesa de puzzle pe un fond neutru. Semnul schimbă pachetul lui Easy 3Draw, deci
   cere o versiune nouă a lui și `node scripts/biblioteca.ts --scrie`.
3. **O singură fereastră de confirmare**, pentru un pachet din fișier, de la o adresă și pentru o versiune care cere ceva
   în plus: numele extensiei în titlu, de unde vine, „Ce poate face” ca listă, izolarea, apoi butoanele. La o actualizare,
   ce cere în plus stă primul, evidențiat. „Din afara bibliotecii” rămâne avertisment.
4. **„Scoate” întreabă întâi** și spune ce se pierde: extensia și datele ei.
5. **Stările:** un schelet cât vine catalogul (meniul nu mai sare); fără internet, extensiile instalate rămân la vedere, cu
   „Reîncearcă”; un catalog stricat spune „Biblioteca nu s-a putut încărca. Încearcă din nou peste puțin.”, iar detaliul
   tehnic ajunge doar în jurnal, ca azi.
6. **Un drum cu nume:** acțiunea „Biblioteca extensiilor” în paletă (Ctrl K), înregistrată din bucata extensiilor (adusă
   după prima randare), deci fără nimic în pornire; cu capitolul ei din manual, în ambele limbi.
7. **Ținte și tastatură:** butoane cât `--tinta` (44 px la atingere, 56 la densitatea mare); săgețile în listă, Enter
   deschide, Escape închide, focusul întors la piesa de puzzle. Probat la 390, 360 și 320 px și cu fontul lat (Verdana).
8. **Tema și limba:** doar jetoanele aplicației (`--s-panou`, `--t`, `--a`, `--l-margine`…), deci urmează tema, densitatea
   și aranjamentul; toate textele prin `t()`, în `carcasa`, cu paritate.

Datele noi ale catalogului (punctul 1):

| Câmp | Ce e | De unde vine | Plafon |
| --- | --- | --- | --- |
| `pictograma` | semnul extensiei, un SVG de lângă catalog | din pachet (punctul 2) | 8 kB |
| `capturi` | până la patru imagini pe limbă, cu textul lor alternativ | `extensii/<dosar>/biblioteca/`, comise (întrebarea 4) | 150 kB una |
| `despre` | descrierea lungă, în română și în engleză | `extensii/biblioteca.json` | 600 de caractere |
| `noutati` | „ce e nou”, pe ultimele cel mult cinci versiuni | `extensii/biblioteca.json` (întrebarea 3) | 240 de caractere una |
| `autor` | cine o publică | `extensii/biblioteca.json` | 60 de caractere |

### C. Marginile păstrate (ADR 0230 și decizia din 02.11)

- Biblioteca stă lângă aplicație, construită din repo la build; catalogul se cere la deschidere, nu la pornire.
- Amprenta SHA-256 a pachetului se verifică înaintea cititorului de pachete.
- Un pachet din fișier sau de la o adresă rămâne „din afara bibliotecii”; linkul `#biblioteca=<id>` rămâne.
- „Actualizează” merge dintr-un clic, cu fereastra doar când versiunea nouă cere ceva în plus.
- Codul extensiilor rulează doar în cadrul izolat; cvs2 importă din `extensii/` doar `extensii/api.ts`. Construcția
  catalogului rămâne în `scripts/`.
- Nicio gazdă nouă și niciun script inline nou în CSP.

### D. Mărimea (estimată; măsurătorile, la „Implementat”)

- **Pornirea:** neschimbată (107,9 / 115 kB; cu ușa 112,2). Fereastra bibliotecii e o bucată nouă la cerere; numele ei
  intră în harta importurilor din `index.html`.
- **Totalul** (760,9 / 800 kB): B ~+6 kB (fereastra ~4,5; stilurile ~1; confirmarea și meniul, ~0,5 la un loc), A ~+2, C
  ~+10. Textele sunt date (`mesaje/carcasa.json`), în afara plafonului.
- **`dist/extensii/`:** semnul ~3 kB; capturile ~30 kB una (măsurat pe trei capturi adevărate, WebP la 960 px), deci ~100
  kB pe limbă.

### E. Feliile (pentru B), fiecare cu ceva de încercat pe canalul `biblioteca`

| # | Felia | Ce se vede la capăt |
| --- | --- | --- |
| 3.Xh-1 | datele: semnul în pachet și în catalog, descrierea lungă, „ce e nou”, autorul, capturile cu scriptul lor, poarta build-ului | semnul lui Easy 3Draw în meniul de azi și în fila lui |
| 3.Xh-2 | fereastra de confirmare refăcută, „Scoate” cu întrebarea, mesajele pe înțeles, țintele | instalarea din fișier și scoaterea, în ferestrele noi |
| 3.Xh-3 | fereastra „Biblioteca extensiilor”: lista, pagina extensiei, instalarea și actualizarea în ea, „Instalate”, linkul; meniul scurtat; paleta | biblioteca nouă, la birou |
| 3.Xh-4 | telefonul, tastatura, fontul lat, densitatea, manualul în ambele limbi, otrăvurile | biblioteca nouă pe telefon; felia gata de unit |

## Întrebările (recomandarea întâi)

1. **Unde stă biblioteca?**
   - **a)** o fereastră „Biblioteca extensiilor”, deschisă din meniu (direcția B);
   - b) meniul de azi, îmbunătățit (direcția A);
   - c) o pagină pe tot ecranul, cu fila ei (direcția C).
2. **Semnul lui Easy 3Draw** (desenele sunt în schiță, la 64, 28 și 20 px, pe ambele teme):
   - **a)** cărămida: spune „piese 3D”, partea care crește; culoarea e a butoanelor 3D din extensie;
   - b) șina de lemn: continuă semnul de azi din bara extensiei; spune „trenuleț”, nu și „3D”;
   - c) cubul desenat: spune numele, în culorile cvs2; seamănă cu semnele multor programe 3D;
   - d) altul, descris de owner.
3. **„Ce e nou” la fiecare versiune a unei extensii din bibliotecă.** Easy 3Draw a trecut de la 18.9 la 18.18 într-o
   săptămână, din două linii de lucru.
   - **a)** cerut de probă: o versiune nouă nu trece fără un rând de „ce e nou”, în română și în engleză (proba care cere azi
     versiunea nouă îl cere și pe el); e o regulă pentru toate liniile care schimbă pluginul;
   - b) la alegere: rândul lipsește dacă nu l-a scris nimeni.
4. **Capturile din bibliotecă:**
   - **a)** trei capturi adevărate pe extensie, făcute de un script din repo (Playwright, pe build-ul local, în română și în
     engleză), comise și refăcute când se schimbă înfățișarea extensiei;
   - b) fără capturi acum: doar semnul, descrierea și „ce e nou”.

## Răspunsurile owner-ului (23.11)

„Da, 1a–4a”, în sesiunea liniei și în formularul schiței (fără note):

1. **1a:** biblioteca e o fereastră, „Biblioteca extensiilor”, deschisă din meniu (direcția B).
2. **2a:** semnul lui Easy 3Draw e cărămida.
3. **3a:** „ce e nou” e cerut de probă la fiecare versiune nouă a unei extensii din bibliotecă, în română și în engleză.
   **E o regulă pentru toate liniile care schimbă pluginul:** versiunea nouă din `extensie.json`, rândul ei de „ce e nou”
   în `extensii/biblioteca.json` (primul din `noutati`), apoi `node scripts/biblioteca.ts --scrie`.
4. **4a:** trei capturi adevărate pe extensie, în română și în engleză, făcute de un script din repo, comise și refăcute
   când se schimbă înfățișarea extensiei.

## Ce am respins

- **Un punct pe butonul Extensii, la pornire, pentru o versiune nouă:** cere catalogul la pornire (respins în ADR 0230, 4b).
- **Evaluări, număr de instalări, comentarii:** cer server și conturi, iar biblioteca are o singură sursă.
- **Căutarea și categoriile, acum:** catalogul are o extensie. În B au loc când trece de vreo opt.
- **Capturile făcute la build:** build-ul ar cere un browser și n-ar mai fi determinist. Se comit și se copiază octet cu octet.
- **Imaginile în precache:** ar ajunge pe discul fiecărui om, și al celor fără extensii.
- **Semnul pus în pagină ca SVG:** un SVG străin în DOM poate purta scripturi; ca `<img>`, nu.
- **O temă sau un font al bibliotecii:** urmează aplicația (ADR 0250), ca orice fereastră.

## Limite

- Capturile pot rămâne în urma extensiei: se refac la cerere, cu scriptul, și nu sunt păzite de o probă.
- Biblioteca tot cere internet. Semnul unei extensii instalate se vede și fără el.
- Piesa de puzzle rămâne discretă; cine nu o știe găsește biblioteca doar din paletă și din manual.
- În container lipsește Edge: probele e2e ale feliei rulează acolo cu Chrome, iar cu Edge în CI-ul complet.

## Probele (scrise întâi, la cod)

- **Unitare:** catalogul cu câmpurile noi (plafoanele, un fișier lipsă, un catalog vechi fără ele); manifestul cu
  `pictograma` (un fișier din afara listei, prea mare, alt tip); „ce e nou” cerut la o versiune nouă (după răspunsul 3);
  construcția și poarta build-ului (imaginile din `dist/extensii/`, în afara precache-ului).
- **E2e** (`biblioteca.spec.ts`, pe fereastra nouă): nimic descărcat înainte de „Instalează”; instalarea, apoi „Deschide”;
  amprenta greșită; actualizarea dintr-un clic, din meniu și din pagină, cu fereastra doar la o permisiune nouă; „Scoate” cu
  întrebarea; fără rețea și cu un catalog stricat; linkul; engleza; 390, 360 și 320 px; fontul lat; tastatura.
- **Manualul:** capitolul „Extensiile”, în ambele limbi, cu fiecare buton nou (`%% acopera:`).
- **Otrăvurile:** câte o listă pe felie (`test/otravuri/3.Xh-1.py` …), dintr-o clonă; listele extensiilor (3.Xa–3.Xg),
  verificate după fiecare felie.

## Se redeschide dacă

- vine o extensie de la altcineva decât owner-ul (atunci: semnăturile din ADR 0127 și un autor verificat);
- catalogul trece de ~20 de extensii (atunci: căutarea, categoriile, eventual pagina din C);
- owner-ul vrea biblioteca mai la vedere decât piesa de puzzle (decizia din 02.11).

## Implementat

### 3.Xh-1: datele (23.11.2026)

- **Semnul în pachet.** `extensie.json` are câmpul opțional `pictograma`: un fișier `.svg` din `fisiere`, de cel mult
  8 kB, care începe ca un SVG. Altfel pachetul se refuză cu motivul `pictograma` („semnul extensiei nu e un SVG mic din
  pachet (cel mult 8 kB)”). Amprenta lui e verificată ca a oricărui fișier al pachetului. Împachetarea
  (`scripts/impacheteaza-extensie.ts`, `scripts/construieste-trenulet.ts`) îl pune în pachet.
- **Catalogul.** Câmpurile `pictograma`, `capturi` (`ro` și `en`, fiecare cu lățimea, înălțimea și textul alternativ),
  `despre`, `noutati` și `autor`, toate opționale, citite de `citestePrezentare` (`shared/biblioteca.ts`). Un câmp greșit se
  sare și e numit în `sarite` („<id>: <câmp>”); rândul rămâne bun. Numele unui fișier de imagine e legat de id-ul rândului
  și poartă primele 8 caractere din amprenta lui: `<id>-pictograma-<8>.svg`, `<id>-captura-<nume>-<limba>-<8>.webp`.
  Schema catalogului rămâne 1.
- **Construcția** (`scripts/biblioteca.ts`). Semnul vine din pachet, deci e același fișier pe care îl are extensia
  instalată. Capturile se citesc din `extensii/<dosar>/biblioteca/<nume>.<limba>.webp`, cu mărimea din antetul WebP. Lista
  (`extensii/biblioteca.json`) primește `despre`, `autor`, `noutati` și `capturi` (numele și textul alternativ). Catalogul
  ține ultimele cinci rânduri de „ce e nou”; lista poate păstra toată istoria.
- **„Ce e nou”, cerut (răspunsul 3a).** Primul rând din `noutati` trebuie să fie al versiunii pachetului de acum
  (`stareNoutati`). Altfel proba `biblioteca.constructie.test.ts` cade, cu rândul de scris în mesaj, iar `node
  scripts/biblioteca.ts --scrie` refuză. Versiunile din `noutati` stau strict descrescător.
- **Capturile (răspunsul 4a).** `node scripts/capturi-biblioteca.ts [dosar]` pornește serverul de dezvoltare și un browser
  fără fereastră, instalează pachetul din fișier, deschide extensia, aduce cadrul ei la 1280 × 800 și scrie fiecare scenă
  ca WebP de 960 × 600, în română și în engleză, pe tema luminoasă. Scenele stau în script (`SCENE`). Build-ul nu pornește
  niciun browser: copiază capturile comise.
- **Poarta build-ului** (`scripts/build-determinist.ts`): catalogul din `dist/` fără câmpuri sărite; fiecare imagine din
  catalog există, cu mărimea ei și cu amprenta din nume; în `dist/extensii/` nu stă nimic în plus. Anteturile `immutable`
  acoperă `/extensii/*.svg` și `/extensii/*.webp`. **CSP-ul nu s-a schimbat.**
- **Interfața de azi** (până la fereastra din 3.Xh-3): semnul stă lângă numele extensiei în Biblioteca și la extensiile
  instalate (28 px) și pe fila extensiei deschise (20 px, în locul piesei de puzzle). O extensie fără semn își arată piesa
  de puzzle pe un fond neutru. Semnul unei extensii instalate vine din pachetul ținut în browser (o adresă `blob:`), deci se
  vede și fără internet. Se arată doar ca `<img>`.
- **Easy 3Draw 18.20.0:** semnul (cărămida 2 × 2), descrierea lungă, autorul („CNC Vector Studio”), „ce e nou” pentru
  18.20.0–18.16.0, trei capturi pe limbă (circuitul, atelierul 3D, fila Roți).
- **Abaterea de la schiță:** fondul semnului e gri-albăstrui (`#dbe6ee`), nu crem, iar cărămida e mai mare. Pe fila
  aleasă, cremul se pierdea în fondul filei, iar la 20 px cărămida mică nu se mai citea. Owner-ul îl vede pe canal.
- **Privirea pe interfața adevărată** (capturi mărite, ambele teme) a găsit două greșeli pe care probele nu le prindeau:
  rândul extensiei instalate stătea la mijlocul meniului (un `<button>` își centrează conținutul), iar numele din Biblioteca
  ieșea gri (regula versiunii îl prindea și pe el). Amândouă au acum proba lor e2e, scrisă înaintea reparației.
- **Măsurat** (`npm run determinism`): pornirea 107,9 kB, neschimbată (cu ușa 112,2 / 115); totalul 762,0 / 800 kB
  (+1,1); `/admin` 121,2 / 200. În `dist/extensii/`: pachetul 457,3 kB, catalogul 4,8 kB, semnul 0,7 kB, șase capturi de
  31–39 kB (210,9 kB la un loc).
- **Probele:** unitare pentru pachet, catalog, construcție, precache, anteturi și semn; e2e în `biblioteca.spec.ts` (semnul
  în Biblioteca, în meniu și pe filă, și fără rețea; extensia fără semn). Otrăvurile: `test/otravuri/3.Xh-1.py`
  (`docs/otravuri.md`).

### 3.Xh-2: fereastra de confirmare, „Scoate” cu întrebarea, mesajele, țintele (23.11.2026)

- **O singură fereastră de confirmare** (§B.3), pentru un pachet din fișier, de la o adresă, din bibliotecă și pentru o
  versiune nouă. În capul ei stau semnul extensiei (48 px; al unui pachet din fișier vine din pachet, înainte de instalare)
  și titlul cu numele ei: „Instalezi „Easy 3Draw”?”, „Actualizezi „Easy 3Draw”?”. Dedesubt, de unde vine: „18.20.0 · din
  fișierul trenulet-18.20.0.zip · 16 fișiere, 1,6 MB”, „18.20.0 · din biblioteca cvs2”, „18.6.0 → 18.20.0 · din biblioteca
  cvs2”. Urmează avertismentul „din afara bibliotecii” (o casetă, nu un rând portocaliu), „Ce poate face”, izolarea și
  butoanele: întâi gestul, apoi „Renunță”, ca în restul aplicației.
- **„Ce poate face” e o listă:** câte un rând pe permisiune, cu numele ei („Datele în browser”) și ce face extensia cu ea
  („își ține datele în browserul acesta (cel mult 16 MB)”). Fraza „Cere: să …; să …” a plecat (450 de caractere la Easy
  3Draw). La o actualizare, „Versiunea nouă poate și” stă prima, evidențiată; apoi „Ce putea și până acum”.
- **Aceeași lățime pentru toate ferestrele extensiilor:** 34rem (544 px), nu cât ecranul (896 px la 1440). Și fereastra
  adresei, gestionarea și capătul instalării.
- **„Scoate” întreabă întâi** (§B.4): „Scoți „Easy 3Draw”?”, cu ce se pierde: „se șterge din browserul acesta. Se șterg și
  datele ei (12 kB): nu se pot aduce înapoi.” (sau „N-are date salvate.”). „Păstrează” are focusul; el și Escape se întorc
  la listă, cu focusul pe „Scoate” al aceluiași rând. Gestul care șterge e roșu. Rândurile gestionării au semnul extensiei.
- **Mesajele pe înțeles** (§B.5):
  - un catalog care nu se poate citi: „Biblioteca nu s-a putut încărca. Încearcă din nou peste puțin.”, în meniu și în
    fereastra linkului; detaliul („format”, „HTTP 500”) ajunge doar în jurnal, ca până acum;
  - descărcarea de la o adresă: fără textul browserului („Failed to fetch”) și fără „CORS”; un răspuns al serverului e spus
    ca atare („Serverul n-a trimis pachetul (răspunsul 404). Verifică adresa.”);
  - mărimile: „sub 1 kB”, kB întregi până la 1 MB, apoi MB cu o zecimală (`src/extensii/marime.ts`); „1.616,3 kB” și
    „457,3 kB” au plecat.
- **Țintele** (§B.7): la atingere și la densitatea mare, rândurile și butoanele meniului sunt cât `--tinta` (44, 48 sau 56
  px; erau 30 și 28). Cu mausul, la densitatea obișnuită, meniul rămâne strâns.
- **Într-o fereastră mai înaltă decât ecranul, butoanele rămân lipite jos, la vedere**, iar fereastra rămâne sus. Pe captura
  de 320 px cu fontul lat, fereastra se deschidea derulată la capăt (focusul pus pe „Instalează” o trăgea în jos), cu numele
  extensiei și avertismentul ascunse. Proba scrisă întâi a căzut la 390, 360 și 320 px.
- **Rămase pentru 3.Xh-3**, unde meniul se reface: legenda rândului („18.20.0 · deschide fereastra”), „ce e nou” în
  fereastra actualizării, scheletul cât vine catalogul.
- **Măsurat** (`npm run determinism`): pornirea 107,9 kB, neschimbată; totalul 762,7 / 800 kB (+0,7 față de 3.Xh-1).
- **Probele:** unitare pentru mărime, semnul unui pachet abia citit, textele permisiunilor și controalele din manual; e2e în
  `extensii.spec.ts`, `biblioteca.spec.ts` și `extensii.tinte.spec.ts` (nou: țintele la atingere și la densitatea mare;
  390, 360 și 320 px cu fontul lat și un nume de fișier lung). Manualul, în ambele limbi. Otrăvurile:
  `test/otravuri/3.Xh-2.py` (`docs/otravuri.md`).

### 3.Xh-3: fereastra „Biblioteca extensiilor”, meniul scurtat, paleta (23.11.2026)

- **Fereastra** (`src/extensii/Biblioteca.tsx`): capul cu titlul, filele **Toate** (catalogul) și **Instalate** (ce e în
  browserul acesta, și extensiile din afara bibliotecii) și ×; în stânga lista, în dreapta pagina extensiei alese. La birou
  are 61 × 41rem și nu-și schimbă mărimea când vine catalogul.
- **Pagina extensiei:** semnul (48 px), numele, „de CNC Vector Studio · 18.20.0 · 457 kB”, capturile, descrierea lungă, „Ce
  poate face” și „Ce e nou”. Gestul stă în capul paginii: **Instalează** (nimic nu se descarcă înainte de clic),
  **Actualizează la …**, **Deschide**, **Scoate** (cu întrebarea din 3.Xh-2). Sub butoane, starea: „Amprenta se verifică la
  instalare.”, „Ai 18.17.0. Datele ei rămân.”, „✓ Instalată. Merge și fără internet.”, „Instalată, la zi”. O extensie
  instalată își spune sursa, data și cât ocupă datele ei.
- **Actualizarea spune ce aduce:** la o versiune mai veche instalată, „Ce e nou” arată doar versiunile de după a omului.
  Merge dintr-un clic; când versiunea nouă cere ceva în plus, pagina arată „Versiunea nouă poate și”, iar clicul deschide
  fereastra de confirmare din 3.Xh-2 (marginea din ADR 0230).
- **Stările:** cât vine catalogul, lista arată un schelet; fără internet, „Toate” spune „Biblioteca are nevoie de internet.”
  cu **Reîncearcă**, iar „Instalate” merge ca până acum; un catalog stricat își spune mesajul pe înțeles, cu detaliul în
  jurnal; linkul spre o extensie care nu e în catalog o spune în pagină, fără să arate alta în locul ei.
- **Meniul, scurtat:** extensiile instalate și **Biblioteca extensiilor…**. Lățimea lui e fixă (21rem), iar „Actualizează”
  apare **în rândul extensiei** („18.17.0 → 18.20.0”), nu ca un rând nou: meniul nu se mai mișcă atunci când vine catalogul
  (era de la 250 × 215 la 362 × 377 px). Numele și rândul de sub el stau fiecare pe un rând, tăiate cu „…”: cu un nume
  lung, rândul se rupea în două când apărea „Actualizează”, iar meniul creștea cu 19 px. Fereastra „Extensiile tale” a plecat: e fila „Instalate”.
- **Pe un ecran îngust** (sub 40rem), biblioteca ia tot ecranul, iar lista și pagina vin pe rând: un rând deschide pagina
  lui, **Înapoi la listă** (‹) se întoarce. Capturile se derulează în lateral; butoanele paginii sunt cât lățimea ei.
- **Paleta de comenzi:** acțiunea `extensii.biblioteca` („Biblioteca extensiilor”), de oriunde, fără să schimbe fereastra de
  dedesubt. Paleta are acum grupul „Extensii”. **Până acum, acțiunile cu prefixul `extensii` nu apăreau deloc în paletă:**
  nici „Trimite la extensie”, promisă acolo de manual și de ADR 0166 §B. Proba ei e în `biblioteca.spec.ts`.
- **Abaterile de la schiță și de la §B.6, §D:**
  - fereastra stă în bucata la cerere a ferestrelor extensiilor (`Instalare`), nu într-una nouă: nimic de adăugat în harta
    importurilor;
  - „Din fișier” și „din adresă” stau la capătul listei („Din afara bibliotecii”), nu într-un buton din cap: pe telefon,
    capul n-are loc de el;
  - acțiunea paletei stă în registrul static al aplicației, deci pornirea crește cu ~0,1 kB (§B.6 spunea „nimic în
    pornire”); fereastra o cere printr-o ancoră, `#biblioteca`, pe care modulul extensiilor o ascultă deja pentru linkuri;
  - actualizarea din meniu stă în rândul extensiei, nu într-un rând evidențiat de sub el (ca meniul să nu sară).
- **Măsurat** (`npm run determinism`): pornirea 107,9 kB (cu ușa 112,3 / 115: +0,1); totalul 764,4 / 800 kB (+1,7 față de
  3.Xh-2; estimarea din §D era ~+6 pentru toată direcția B, iar până aici sunt +3,5).
- **Probele:** `biblioteca.spec.ts`, rescris pe fereastră (13 probe); `extensii.spec.ts` și `extensii.tinte.spec.ts` pe
  drumurile noi (țintele la atingere și la densitatea mare; 390, 360 și 320 px cu fontul lat; lista și pagina pe rând).
  Proba de încăpere a găsit un nume lung de fișier care împingea pagina în lateral pe telefon (166–236 px): reparat.
  Otrăvurile: `test/otravuri/3.Xh-3.py` (`docs/otravuri.md`).
- **Rămâne pentru 3.Xh-4:** săgețile în listă și în file, fontul lat la 1024 și 1280 px, densitatea mare în fereastră,
  recitirea manualului, capturile ferestrei în manual (dacă owner-ul le vrea).
