# ADR 0222 — Linia mediană: scheletul trăsăturilor, cu centrul sub-pixel, tăiat pe linie

**Starea:** acceptat pe 08.11.2026, cu toate recomandările („Da, 1a–5a”, la întrebările de la final), și implementat în
aceeași zi (secțiunea „Implementarea”), în linia trasării (worktree-ul `trasare`, ramura `wip/25.1-trasare`, neunită în
`main`); propus pe 07.11, la „Da, 25.3↑” (owner-ul, după 25.2↑). Felia 25.3↑,
adusă din etapa 25, fără mașină. Bugetul (întrebarea 1) îl hotărâse între timp ADR 0143: plafonul total e 600 kB („Yes,
600 kB”, 07.11), peste cei 575 recomandați aici; cu `main` unit, linia trasării e la 557,1 / 600.
**Completează:** ADR 0220 (§12: „25.3↑ linia mediană: axa medială a trăsăturilor, fără cioturile scurte, ca linii deschise
gravate pe linie, cu grosimea trăsăturii față de freză”), ADR 0221 (curbele arcelor deschise, cu capetele fixe; joncțiunile
prin cele mai mici pătrate), ADR 0037 §11 (căile deschise, tăiate pe linie), ADR 0090 (axa medială exactă a V-carve-ului).
**Schița:** <https://claude.ai/artifact/MQqzj1TaxZgRp5pmnsPCLu> (bugetul la scară, contururile și liniile mediane pe un desen de probă,
calculate de prototip; ce am măsurat; cele cinci întrebări, cu formularul).

## Problema

Un desen făcut din linii (o semnătură, un scris de mână, o schiță, un desen tehnic scanat, liniile subțiri ale unui logo)
trasat pe contur dă **două linii pe fiecare trăsătură**: marginea din stânga și cea din dreapta. Pentru gravură, omul vrea una
singură, pe mijlocul trăsăturii, tăiată pe linie de o freză de gravură sau în V cât trăsătura. Fără ea, în ArtCAM sau în
cvs2 de azi, cele două margini se șterg de mână, una câte una.

## Ce am aflat (cercetarea din 07.11)

- **Alte programe** (referință funcțională, din documentația lor; fără cod, interfață sau texte copiate):
  - **ArtCAM 2018 / Carveco:** în panoul „Bitmap to Vector”, după reducerea culorilor, bifa „Create centreline” pe culoarea
    aleasă, cu toleranța în pixeli, mărimea petelor, netezimea și alegerea între vectori deschiși („Disconnected open
    vectors”) și bucle închise („Closed vector loops”);
  - **CorelDRAW (PowerTRACE):** metoda „Centerline Trace”, cu două presetări: ilustrație tehnică (linii subțiri, slabe) și
    desen cu linii (linii groase); dă curbe nepline, deschise și închise;
  - **Inkscape:** „Trace Bitmap” → „Centerline” (din 1.0), prin AutoTrace, care e GPL (programul) și LGPL (biblioteca): nimic
    din el;
  - **LightBurn:** nu are linie mediană (o cerere veche pe forum); la **Vectric** (VCarve, Aspire), utilizatorii raportează
    două linii pe trăsătură, iar documentația găsită nu are linie mediană;
  - **numitorul comun:** un singur comutator în aceeași fereastră de trasare, toleranța și netezimea, petele; ArtCAM adaugă
    alegerea deschis / închis.
- **Algoritmii, din lucrări publice:**
  - subțierea: Zhang și Suen (1984), paralelă, în două sub-treceri pe direcții; subțierea în ordinea distanței (Pudney, 1998);
  - axa medială: Blum (1967); cvs2 o are deja exactă pe o regiune (`src/cam/axaMediala.ts`, ADR 0090), din triangularea
    Delaunay a eșantioanelor conturului, cu predicate robuste;
  - **joncțiunile sunt partea grea** (Noris și alții, 2013, „Topology-driven vectorization of clean line drawings”): subțierea
    face dintr-un X două Y legate de o punte; remediul obișnuit: joncțiunile ale căror cercuri înscrise se suprapun devin una;
  - cioturile: ramurile mai scurte decât raza cercului înscris la joncțiunea lor (colțurile unei trăsături groase, zgomotul
    marginii).
- **Măsurat** [07.11, un prototip în Node, `.tmp/proto-mediana.ts`, pe 21 de trăsături desenate pe hârtie: drepte la 0° și
  17°, T, X la 60°, L, inel, S, fiecare la grosimile 3, 6 și 10 px, cu capete și îmbinări rotunde]:
  - **mărimea axei mediale exacte în workerul trasării:** 9,2 kB gzip doar ea (`axaMediala.ts`, `delaunator`,
    `robust-predicates` și geometria lor): workerele se construiesc dintr-o bucată (IIFE), deci nu împart codul cu workerul
    CAM, care o are deja; cu restul feliei, ~12 kB;
  - **scheletul pe pixeli** (cod propriu, în nucleul trasării): transformarea distanței (Felzenszwalb și Huttenlocher),
    subțierea Zhang–Suen, graful, cioturile, joncțiunile unite, centrul sub-pixel la mijlocul dintre trecerile de 50 % de-a
    curmezișul trăsăturii, apoi curbele arcelor deschise din 25.2↑. **Topologia corectă în toate 21** (capetele, joncțiunile,
    buclele); linia la 0,04–0,30 px de hârtie, în medie (cel mai rău 0,93 px, la colțul unui L de 10 px); **grosimea
    trăsăturii**, din aceleași treceri, la cel mult 0,1 px (3,00 / 6,00 / 10,0);
  - subțierea în ordinea distanței, făcută pe rând, a mâncat miezul de 2 px al trăsăturilor cu grosime pară, de la capăt (un
    L de 6 px și-a pierdut tot brațul); Zhang–Suen, nu;
  - de lucrat în cod: unde se termină o linie (scheletul se oprește la 1–5 px de centrul capătului rotund) și brațele de lângă
    o joncțiune unită (în prototip, unul ieșea mai scurt);
  - **bugetul:** pe ramură, cu `main` unit (`e9cf6ee`), totalul e **557,1 / 550 kB**; `main` singur, 535,0 kB (pe un build
    curat); 25.1↑ și 25.2↑ au adus 22,1 kB. Linia trasării nu se poate uni în `main` sub plafonul de azi, cu sau fără 25.3↑.

## Decizia (cu răspunsurile owner-ului: toate recomandările)

1. **Bugetul** (întrebarea 1): plafonul total e 600 kB, din ADR 0143 (decizia owner-ului din 07.11, peste cei 575 propuși
   aici); încap 25.1↑–25.3↑ și liniile paralele gata pe ramuri.
2. **Rezultatul** în fereastra trasării, la sursele alb-negru (Transparența, Luminozitatea): **Contururi** (ca acum) sau
   **Linii mediane**. Pe culori, linia mediană a fiecărei culori bifate vine mai târziu, la cerere.
3. **Calculul** (întrebarea 2), în workerul trasării, cod propriu în `src/trasare/` (regula `trasare-izolat`):
   - cerneala la pragul ales, ca în 25.1↑; petele sub „Ignoră petele sub” ies întâi;
   - scheletul: subțierea Zhang–Suen, apoi pixelii de scară în plus; graful: capete, joncțiuni, lanțuri, buclele fără
     joncțiuni;
   - cioturile: un lanț de la un capăt la o joncțiune, mai scurt decât raza la joncțiune (+1 px), iese, până nu mai iese
     nimic; joncțiunile ale căror cercuri înscrise se suprapun devin una, în punctul celor mai mici pătrate al dreptelor
     brațelor (ca în ADR 0221);
   - centrul, sub-pixel: mijlocul dintre trecerile de 50 % de-a curmezișul trăsăturii (nu centrul pixelului); grosimea
     trăsăturii, distanța dintre ele;
   - curbele: arcele deschise din 25.2↑ (capetele fixe), buclele ca bucle; treptele Netezimii, aceleași.
4. **Capetele** (întrebarea 3): o linie se termină în centrul capătului ei rotund, acolo unde se oprește o freză cât
   trăsătura (nu în vârful trăsăturii, care ar tăia cu o rază mai departe).
5. **Grosimea:** raportul dă grosimea obișnuită a trăsăturilor (mediana, în mm); dacă foaia are o freză și ea e mai îngustă
   sau mai lată decât trăsătura, raportul o spune (gravura ar ieși mai subțire, sau ar mânca din jur).
6. **Părțile pline** (întrebarea 4): totul devine linii mediane, ca la ArtCAM și CorelDRAW (o pată plină dă scheletul ei);
   cine vrea contururile alege Contururi.
7. **Piesa** (întrebarea 5): liniile mediane intră ca o piesă, tăiate pe linie (operația căilor deschise, ADR 0037 §11), iar
   buclele (un O, un inel) la fel, pe linie: `piesaDinImport` pune și o buclă cu latura „pe linie” în operația căilor
   deschise.
8. **Previzualizarea:** imaginea estompată, liniile mediane peste ea, iar dedesubt, la cerere, banda grosimii (unde ar tăia
   o freză cât trăsătura).
9. **Plafoanele și timpul:** cele din ADR 0220 (16 Mpx, 20 000 de căi și 500 000 de vârfuri pe import, 30 s).
10. **Probele, scrise întâi:**
    - **corpusul Python** (în `trasare_corpus.py`): trăsături cu linia mediană știută pe hârtie (drepte, arce, T, X, Y, L,
      inel, un S, o semnătură desenată din curbe), la mai multe grosimi și unghiuri, cu acoperirea exactă; martorul
      scikit-image (`skeletonize`, BSD-3) pentru topologie; judecata: distanța în ambele sensuri în afara zonelor nodurilor,
      capetele și joncțiunile la cel mult o jumătate de grosime, grosimea la 0,2 px;
    - proba pe zgomot (o poză de scris de mână, JPEG), ca la 25.1↑; e2e: o semnătură trasată, Importă cu liniile pe linie;
    - otrăvurile la capăt (`test/otravuri/25.3.py`).
11. **Mărimea:** ~+3,5 kB (nucleul ~2,5–3 kB în workerul trasării, fereastra ~0,5 kB, textele ~0,3 kB).

## Implementarea (08.11)

**Ce s-a schimbat față de propunere** (fiecare, găsit pe corpus, pe furci sau de otrăvuri):

1. **Subțierea** (§3): Zhang–Suen singur șterge toată o trăsătură la 45° (banda ei diagonală dispare într-o sub-trecere:
   slăbiciunea cunoscută a algoritmului, măsurată pe corpus); cu îndreptarea lui Lü și Wang (un pixel iese doar cu cel puțin
   trei vecini), rămâne. Treptele: doar coturile (doi vecini ortogonali în unghi drept, partea opusă goală) ies; un pixel
   simplu oarecare ar fi ros o linie de doi pixeli de la capăt și ar fi mutat joncțiunile (măsurat). Ciotul de un pixel rămas
   sub o linie după tăierea unui ciot iese și el, dacă e simplu (altfel, o joncțiune falsă). Subțierea lucrează cu cozi: se
   reîncearcă doar pixelii cu vecinătatea schimbată (exact subțierea clasică, verificat pe pete întâmplătoare), deci munca
   e pe aria cernelii.
2. **Cioturile:** pragul e 1,5 · raza joncțiunii + 1 px (prototipul avea o rază + 1: furca unui capăt drept, lungă cât
   √2 raze, rămânea).
3. **Brațele lângă joncțiune:** normala unui punct de lângă joncțiune intră în celelalte brațe (lățimea măsurată acolo e
   prea mare, iar centrul, mutat: pe un X la 60°, linia la 2,6 px). Punctele ies de la capătul dinspre joncțiune până la
   primele trei la rând cu lățimea brațului (±20 %, cel puțin ±0,75 px), cel mult până la raza joncțiunii plus trei
   grosimi; dreapta brațului se trage prin primele lui puncte rămase (1,5 grosimi).
4. **Locul joncțiunii:** punctul celor mai mici pătrate al dreptelor brațelor, fără gardă de distanță (doar cu două
   direcții destul de diferite). O gardă de o rază, propusă ca siguranță, respingea tocmai încrucișarea furcilor înguste,
   care stă departe de pixelii joncțiunii (la 20°, ~5 raze): linia ieșea la 0,29 px în loc de 0,09, iar la 12°, la 1,87 în
   loc de 0,07.
5. **Capetele** (§4): mersul spre vârf pleacă din centrul dreptei capătului, nu din primul punct bun (scheletul cotit spre
   colțul unui capăt drept îl strâmba cu 1 px), iar centrul capătului se recentrează de-a curmezișul (acolo trăsătura are
   toată lățimea): pe 61 de capete drepte oblice, cel mai rău de la 0,71 la 0,14 px.
6. **Brațele legate** (nou): două brațe ale unei joncțiuni care se continuă (sub 30° de cotitură; cele mai drepte întâi) sunt
   o singură cale: un T dă două căi (bara și piciorul), un X două, un Y trei, un 8 o buclă, o acadea o cale; o joncțiune cu
   doar două brațe (un colț ascuțit, după ciotul lui) e o trecere. Mai puține ridicări ale frezei, iar bara unui T rămâne o
   singură dreaptă.
7. **Punctele:** o trăsătură mai scurtă decât grosimea ei (un punct, un disc plin) n-are linie mediană; raportul le numără,
   cu sfatul „alege Contururi”, iar un desen doar din puncte e refuzat cu același sfat.
8. **Comune cu 25.1↑:** cerneala, pragul, curățarea și marginile sunt o singură funcție (`campul`, în `trasare.ts`), pentru
   contururi și pentru liniile mediane. Ieșirea: `CaiTrasate.deschisa` (ultimul vârf al unei căi deschise e capătul ei),
   transferată din worker; ușa pune toate căile pe linie (și buclele, în operația căilor deschise, §7); fereastra are
   „Rezultatul”, raportul grosimii (și al frezei foii, când foaia are una singură: `sculaFoii`) și banda grosimii.

**Măsurat** [08.11, Node 26 și Edge fără fereastră]:
- corpusul (24 de trăsături, scrise de `trasare_corpus.py`, cu martorul scikit-image de acord pe capete, joncțiuni și goluri):
  topologia exactă peste tot (căile, buclele, capetele libere, brațele fiecărei joncțiuni); linia la cel mult 0,34 px de
  hârtie în ambele sensuri, în afara zonelor nodurilor (S-ul de 7 px; cele mai multe sub 0,2); capetele la cel mult 0,18 px
  de centrul capătului; joncțiunile la cel mult 0,32 px (semnătura; celelalte sub 0,1); grosimea la cel mult 0,14 px; în
  colțul unui L, axa medială taie colțul cu 0,6 px (sub jumătatea de grosime: așa e axa, nu o greșeală);
- furcile (o dreaptă și o ramură, 20–45°, grosimile 3–8): dreapta rămâne o cale, linia la cel mult 0,17 px, joncțiunea la
  cel mult 0,21 px; sub ~12°, trăsăturile se suprapun pe câteva grosimi, iar linia trece printre ele (până la 2,5 px);
- zgomotul (±12 niveluri pe pixel): aceleași căi și capete, fără cioturi, linia sub 0,5 px; marginile dure: T-ul la 17°,
  linia sub 0,6 px;
- timpul: logoul tău (1288 × 325) 0,13 s (54 de căi, 2 bucle, 12 joncțiuni: literele pline dau scheletul lor); o imagine de
  12 Mpx cu 400 de trăsături, 1,5 s (contururile, pe aceeași imagine, 1,7 s);
- probele: 14 țintite, 25 ale corpusului, 2 ale calculului și ușii, 3 e2e;
- otrăvurile (`test/otravuri/25.3.py`): prima rulare 50 / 59 (lotul s-a oprit cu una înainte de capăt: F08, rulată apoi, prinsă); cele nouă scăpate, după ce le desparte pe configurații întâmplătoare: două echivalente (S05, C04: la fel pe 400), două cu codul lor scos (garda de distanță a joncțiunii, mai rea pe furci: B05; limita de sus a lățimii la capăt, fără efect după recentrare: E04), cinci cu probe noi (furcile: L04, B02, P04; colțul ascuțit: L03; coada subțierii, pe codul nou: S04); două otrăvuri noi (E07, B08). A doua rulare: 57 / 57;
- mărimea: totalul 561,7 / 600 kB (+4,6 față de 557,1; estimarea fusese ~3,5), pornirea 101,8 / 110, neschimbată.

**Limitele, scrise:** furcile sub ~12° (trăsături suprapuse pe câteva grosimi) dau linia printre ele; o trăsătură mai scurtă
decât grosimea ei e un punct, fără linie; liniile mediane pe culori, capetele în vârf (3b), părțile late rămase contururi și
semnalarea lor (4b, 4c) și buclele ca vectori închiși (5b) vin în 25.3↑b, ca opțiuni.

## Ce am respins

- **Axa medială exactă a V-carve-ului** în workerul trasării: +9,2 kB doar ea (~12 kB cu felia), pentru o precizie pe care
  scheletul cu centrul la trecerile de 50 % o atinge deja pe trăsăturile de pe hârtie (rămâne alternativa b a întrebării 2).
- **Subțierea în ordinea distanței, pe rând:** mănâncă miezurile de 2 px (măsurat).
- **AutoTrace** (GPL / LGPL) și orice cod copiat; **linia mediană din conturul trasat, prin decalare spre interior:** se rupe
  la joncțiuni și la trăsăturile cu grosime variabilă.

## Ce impune

- Nucleul stă în `src/trasare/` (o funcție nouă lângă `traseaza`), fără importuri din aplicație; fereastra, în
  `src/ui/FereastraTrasare.tsx`; textele, în `src/i18n/import.*.ts`; manualul primește linia mediană în capitolul importului,
  în ambele limbi.
- `piesaDinImport` primește buclele tăiate pe linie (latura „pe linie” pe o cale închisă).

**Se redeschide dacă:** pe o semnătură sau pe un desen trimis de tine, joncțiunile ies greșit (un X cu două noduri, un braț
tăiat), cioturile rămân, sau linia stă la peste o jumătate de grosime de mijlocul trăsăturii.

## Întrebările (recomandarea întâi)

**Răspunsurile (08.11):** „Da, 1a–5a”: toate recomandările. **Opțiunile care pot sta împreună** (regula „toate opțiunile”,
din 07.11): capetele în vârf (3b), părțile late rămase contururi (4b) și semnalarea lor (4c), buclele ca vectori închiși
(5b) vin ca opțiuni ale ferestrei, într-o felie de după (25.3↑b); recomandările de aici sunt implicitele. Doar calea (2) și
bugetul (1) se exclud.

1. **Bugetul** (linia trasării, cu `main`, e la 557,1 / 550 kB; cu 25.3↑, ~561):
   - **a)** plafonul total la 575 kB (ca la ADR 0137): încap 25.1↑–25.3↑ și ~15 kB pentru celelalte linii;
   - b) trasarea „doar online”: workerul și fereastra ei ies din precache (ca testul pas cu pas), totalul revine sub 550,
     dar fără internet trasarea nu merge;
   - c) plafonul rămâne 550: linia trasării așteaptă până se găsesc ~11 kB de tăiat în altă parte.
2. **Calea liniei mediane:**
   - **a)** scheletul pe pixeli, cod propriu (~3,5 kB cu fereastra), cu centrul sub-pixel la trecerile de 50 %;
   - b) axa medială exactă a V-carve-ului, pe contururile netede ale lui 25.1↑ (~12 kB).
3. **Unde se termină o linie:**
   - **a)** în centrul capătului rotund al trăsăturii (cât o freză cât trăsătura);
   - b) în vârful trăsăturii.
4. **Părțile pline dintr-un desen cu linii:**
   - **a)** totul devine linii mediane (ca la ArtCAM și CorelDRAW); pentru contururi, alegi Contururi;
   - b) părțile mai late decât un prag rămân contururi, celelalte devin linii mediane (mixt), într-o felie de după;
   - c) fereastra arată unde sunt părți late și te lasă să alegi pentru tot desenul.
5. **Buclele închise (un O, un inel):**
   - **a)** tăiate pe linie, ca liniile deschise;
   - b) vectori închiși, tăiați pe interior sau pe exterior (ca „Closed vector loops” din ArtCAM).
