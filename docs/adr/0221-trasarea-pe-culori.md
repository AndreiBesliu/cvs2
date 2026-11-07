# ADR 0221 — Trasarea pe culori: reducerea în OKLab, granițele comune, o piesă pe culoare

**Starea:** acceptat pe 07.11.2026, cu toate recomandările („Da, 1a–5a”, la întrebările de la final), în linia trasării
(worktree-ul `trasare`, ramura `wip/25.1-trasare`); propus în aceeași zi, la „Da, 25.2↑” (owner-ul, după 25.1↑). Felia
25.2↑, adusă din etapa 25, fără mașină. **Implementat** pe 07.11 (`9fe27dd`, `c39e46c`, `672c199`, `88b2e10`), cu
abaterile de la propunere scrise la „Implementarea”; reducerea și joncțiunile de mai jos sunt cele implementate.
**Completează:** ADR 0220 (§12: „reducerea (2–16), pastilele cu procentul, alegerea și legarea culorilor, granița dintre două
culori la amestecul lor de 50 % (aceeași pentru amândouă, fără goluri între ele), o piesă pe culoare”), incrustațiile (ADR
0170: dopul și locașul se potrivesc doar pe o graniță comună).
**Schița:** <https://claude.ai/artifact/DGtMAHCKrGFPqCor4vxjVY> (fereastra culorilor ca machetă vie, pe culorile logoului tău; drumul unei imagini color; de ce
granițe comune; probele; întrebările, cu formularul).

## Problema

Un logo are des două–patru culori: o literă albastră, un contur gri închis, o umbră gri deschis. Omul le vrea separat: fiecare
culoare săpată la altă adâncime, într-o piesă a ei, sau incrustată (ADR 0170). Pentru asta, regiunile trebuie să se
potrivească exact: unde se termină albastrul, începe griul, pe aceeași linie. Trasarea alb-negru (ADR 0220) dă o singură
cerneală; trasarea fiecărei culori separat, cu ea, lasă goluri între culori (fiecare margine se netezește altfel).

## Ce am aflat (cercetarea din 07.11)

- **Alte programe** (referință funcțională, din documentația lor; fără cod, interfață sau texte copiate):
  - **ArtCAM 2018 / Carveco:** „Reduce Colours” cu un glisor (nuanțele apropiate se contopesc), apoi paleta: o culoare se
    *leagă* de alta trăgându-i pastila peste a ei (și se dezleagă), „Link All”, „Reset All Links”; reducerea din nou șterge
    legăturile. Vectorii se fac pe culoarea aleasă și pe cele legate de ea.
  - **Inkscape** (potrace): „Multiple scans: colors”, cu numărul culorilor; fără „Stack”, culorile trasate separat lasă
    goluri între ele; cu „Stack”, golurile dispar fiindcă formele se suprapun (straturi puse unul peste altul): bun pentru
    tipar, nu pentru tăiat.
  - **vtracer:** modurile „stacked” (straturi suprapuse) și „cutout” (regiuni separate); în versiunile 0.6, „cutout” avea
    cusături între forme; abia 1.0 (alfa) promite un mozaic fără cusături, cu granițe comune. Rust / WASM.
  - **Numitorul comun:** numărul culorilor, pastilele cu culoarea și ponderea ei, alegerea culorii de trasat, legarea.
    Granițe comune promite doar vtracer 1.0 (alfa); la celelalte, documentația nu spune, iar la Inkscape ele lipsesc.
- **Algoritmii, din lucrări publice:**
  - spațiul de culoare: OKLab (Ottosson, 2020): distanțele urmează culoarea văzută, mai bine decât RGB; trecerea din sRGB e
    o matrice, o rădăcină cubică și încă o matrice;
  - reducerea: k-means cu pornirea k-means++ (Arthur și Vassilvitskii, 2007); median cut (Heckbert, 1982) taie cutii în RGB
    și se potrivește mai slab ochiului;
  - granițele: un câmp de etichete și o plasă duală (Surface Nets, Gibson, 1998, în 2D): un vârf în fiecare celulă de 2 × 2
    pixeli cu mai multe culori, iar fiecare latură a plasei desparte exact două culori. Așa, o graniță e una singură, folosită
    de amândouă regiunile.
- **Măsurat** [07.11, Node 26, pe mașina de lucru]:
  - logoul tău (1288 × 325, 40 541 de pixeli opaci, dintre care 25 203 „plini”, cu vecinătatea de 3 × 3 de aceeași culoare):
    3 culori naturale: albastru `#07609c` (22 %), gri închis `#353c45` (61 %), gri deschis `#4e5560` (17 %); centrele, la cel
    puțin 0,095 unul de altul, în OKLab. La 4, o lumină de 1,8 % (`#1a6fab`) se desparte de albastru la doar 0,055;
  - pe 12 Mpx: atribuirea la 8 centre 260 ms; trecerea în OKLab 760 ms fără tabel (cu memorarea pe culorile distincte ale
    imaginii, mult mai puțin);
  - **corectat la implementare:** testul „plin” (vecinătatea de 3 × 3 de aceeași culoare) nu vedea deloc liniile punctate
    portocalii ale logoului (0 din 414 pixeli portocalii plini: liniile au 3 px, cu marginile parțial transparente), iar
    „griul deschis” `#4e5560` era umbrirea axului frezei. Cu reducerea implementată, paleta automată a logoului e griul (cu
    umbrirea lui), albastrul și portocaliul: `#3a404a`, `#0c619c`, `#ef9347`, la cel mult 8 niveluri pe canal de mediana
    fiecărei familii (măsurată de oracol pe pixelii plini: `#363d46`, `#055f9b`, `#ef913f`).

## Decizia (cu răspunsurile owner-ului: toate recomandările)

1. **Sursa „Culorile”** în lista Sursa a ferestrei trasării, lângă Transparența și Luminozitatea. Pragul și Inversează se
   ascund (nu au sens aici); Netezimea, petele, golurile și lățimea rămân.
2. **Reducerea**, în workerul trasării (cum s-a implementat; propunerea, la „Implementarea”):
   - spațiul: OKLab cu luminozitatea pe jumătate (ca la CIE94, kL = 2): umbrirea unei suprafețe (mai ales luminozitate)
     rămâne o culoare, iar nuanțele se despart;
   - centrele se aleg doar pe pixelii plini (opaci) care nu sunt amestecuri de margine: un pixel care stă, pe una dintre cele
     patru direcții, între doi vecini opuși clar diferiți (o margine netezită) nu votează; o linie subțire și un gradient lin
     votează;
   - întâi 32 de clase (k-means++, trei porniri), apoi unite: cele sub 0,2 % din pixelii plini, cu cea mai apropiată; apoi
     perechea cu centrele cele mai apropiate, până la numărul ales sau, **Automat**, cât timp e sub 0,08 (cel mult 16); la
     capăt, câțiva pași Lloyd din centrele unite. Pe logoul tău, automat: griul, albastrul și portocaliul;
   - etichetele: un pixel curat (la cel mult 0,03 de centrul lui și nu un amestec) își ia culoarea; un amestec, una dintre
     culorile pixelilor curați din jur, după partea amestecului de 50 % în care cade; un pixel parțial transparent fără vecin
     curat (o aură în jurul literelor), culoarea regiunii de care se lipește;
   - numărul: **Automat** sau ales cu glisorul, 2–16 (întrebarea 1);
   - **fundalul:** pe transparență, transparentul (nu e o pastilă); pe o imagine opacă, culoarea care domină marginea
     imaginii, nebifată (întrebarea 3).
3. **Pastilele:** fiecare culoare, cu ponderea ei în desen și bifa „se trasează”; **legarea** face din două culori una
   singură (întrebarea 2); o reducere nouă (alt număr) șterge legăturile, ca în ArtCAM.
4. **Curățarea:** o pată de culoare sub „Ignoră petele sub” trece la culoarea cu care împarte cea mai lungă margine; un gol
   de fundal sub „Umple golurile sub”, care nu atinge marginea imaginii, la fel.
5. **Granițele comune** (§12 din ADR 0220):
   - pe fiecare latură dintre doi pixeli de culori diferite A și B, granița trece unde amestecul lor ajunge la 50 %: culoarea
     fiecărui pixel se proiectează pe dreapta dintre centrele A și B, iar punctul se interpolează liniar între cei doi pixeli
     (ca pragul la jumătatea acoperirii din ADR 0220, generalizat). Față de fundalul transparent, pragul e alfa de 50 %;
   - în fiecare celulă de 2 × 2 pixeli cu mai multe culori stă un vârf, media acestor puncte; vârfurile se leagă peste
     fiecare latură dintre culori, deci fiecare latură a plasei desparte exact două culori. Unde se întâlnesc trei culori,
     vârful e o joncțiune. La o celulă-șa (A B / B A), se leagă pe diagonală culoarea mai apropiată de media celulei
     (fundalul, niciodată), ca punctul-șa din ADR 0220;
   - plasa dă doar ordinea: geometria graniței sunt punctele de 50 % ale laturilor ei; o joncțiune se mută în punctul cel
     mai apropiat (cele mai mici pătrate) de dreptele granițelor care se întâlnesc acolo, potrivite pe primele lor treceri,
     oprite la primul colț;
   - granițele dintre două joncțiuni se netezesc **o singură dată** (poligonul, colțurile și cubicele din 25.1↑, cu
     capetele fixe), apoi fiecare regiune își adună granițele: două culori vecine au exact aceeași linie, în sensuri opuse.
     Fără goluri, fără suprapuneri; abaterea se măsoară pe fiecare graniță, ca în ADR 0220.
6. **Piesele:** câte o piesă pentru fiecare culoare bifată, toate din aceeași pagină (imaginea), deci aliniate; exterioarele
   și golurile din sensul contururilor; rolul (buzunar, V-carve, incrustație) se alege din panou, pe fiecare (întrebarea 4).
   Numele: al fișierului și al culorii; culoarea nu intră în document (întrebarea 5).
7. **Previzualizarea:** imaginea redusă la culorile ei (fiecare pixel pictat cu centrul lui), cu granițele peste ea; trecerea
   mausului peste o pastilă îi arată regiunea.
8. **Plafoanele și timpul:** cele din ADR 0220 (16 Mpx, 20 000 de contururi și 500 000 de vârfuri pe import, 30 s), cel mult
   16 culori.
9. **Probele, scrise întâi:**
   - **corpusul Python** (în `trasare_corpus.py`), cu acoperirea exactă pe culori: un disc în trei sectoare (joncțiunea în
     centru, razele și arcele pe hârtie), un pătrat cu un inel de altă culoare și un punct în mijloc, o tablă de șah cu
     blocuri mari (celulele-șa); judecata: fiecare graniță de ambele părți, aria regiunilor (suma = aria desenului, fără
     goluri și fără suprapuneri), joncțiunile la cel mult 0,5 px de hârtie;
   - **logoul tău:** reuniunea culorilor = trasarea alb-negru a aceleiași imagini (ADR 0220), iar fiecare culoare, față de
     martorul scikit-image (`label` și `find_contours` pe măștile culorilor);
   - **e2e:** logoul pe culori (3 pastile, ca în Node; portocaliul tras peste albastru; Importă → 2 piese, la colțurile
     calculate în Node, într-un singur pas de anulare), tastatura și bifele, lecția D7 pe culori și fundalul opac, oprirea;
   - **otrăvurile** la capăt (`test/otravuri/25.2.py`).
10. **Mărimea:** ~+5–7 kB (reducerea, plasa duală, granițele deschise, pastilele), în workerul trasării și în fereastră;
    totalul de pe ramură, de la 531,8 la ~538 / 550. Plafonul e comun cu liniile neunite.

## Implementarea (07.11)

**Ce s-a schimbat față de propunere** (fiecare, găsit pe corpus sau pe logoul tău):

1. **Reducerea** (§2): testul „plin” de 3 × 3 pierdea culorile subțiri (liniile portocalii ale logoului, întregi), iar
   k-means la un număr mic împărțea umbrirea griului în loc să țină portocaliul, la orice număr (2–8). Acum: pixelii plini
   fără amestecurile de margine, multe clase unite după distanță, luminozitatea pe jumătate; pragul de pondere, 0,2 % (nu
   1 %: punctul unui ®, o linie subțire).
2. **Etichetele:** un amestec nu e curat nici când are culoarea unui centru (pe granița închis–alb, mijlocul are chiar
   gri-deschisul); aura parțial transparentă din jurul literelor ia culoarea literei (altfel, culoarea cea mai deschisă din
   paletă: portocaliul).
3. **Geometria** (§5): trecerile de 50 % sunt geometria (vârfurile plasei, mediile celulelor, trăgeau ariile înăuntru), iar
   joncțiunile se mută prin cele mai mici pătrate (media celulei stătea până la 0,56 px de hârtie; oprite la primul colț:
   o graniță în L, la colțul unei imagini cu margini dure, muta altfel joncțiunea și înclina marginea).
4. **Arcele deschise:** `curbeleArcului` în `trasare.ts`, cu capetele fixe (un arc scurt, o singură latură în bandă, rămâne
   coardă: o cubică încercată pe el schimba reuniunea logoului cu cel mult 0,08 %, scoasă); latura scurtă a unei teșituri,
   până la 4,5 px (era 3,5: un colț de arc cu teșitura de 4,02 px rămânea netăiat). Ultima schimbă și alb-negrul: probele
   lui au rămas verzi, iar otrăvurile lui atinse (T02, B02, E05) au rândurile noi; mutarea vârfului în afară e o funcție
   pentru bucle și arce (`mutatInAfara`).
5. **Atingerile în colț:** unde fundalul apare de două ori într-o celulă (două culori se ating într-un punct, peste el),
   bucla ocolește mai departe aceeași vecină: un gol care atinge alt gol sau marginea din afară rămâne o buclă a lui, nu o
   singură buclă care trece prin punct de două ori (regula după unghiuri le lipea când bucla nu pornea chiar din punct).
6. **Importul:** `ImportPregatit.impreuna` (piesele aduse împreună, într-un pas), numele „<fișier> #hex”; paleta în ordinea
   ponderii (cea mai mare întâi); legăturile într-un singur loc (`src/trasare/legaturi.ts`), pentru nucleu și pentru pastile
   (care arată legătura pe loc, ca și bifele, înaintea trasării noi); trecerile strânse ca la alb-negru (o milionime).

**Măsurat** [07.11, Node 26 și Edge fără fereastră]:
- corpusul pe culori: sectoarele la 0,17–0,20 px de hârtie în ambele sensuri, joncțiunea centrală sub 0,25 px; inelul la
  0,21–0,22 px, granițele comune 307,0 / 307,9 px; tabla de șah la 0,08 px, 120,0 / 120,0 px; logoul: reuniunea culorilor
  49 097,7 px² față de 49 107,8 la alb-negru (0,02 %);
- nucleul pe logoul tău (1288 × 325): 0,2–0,4 s în Node; trei culori, 48 de contururi (cu reducerea veche: 386); pe o poză
  de 12 Mpx (câmpuri de culoare cu zgomot): 6,8–8,8 s, 320–370 MB (sub termenul de 30 s);
- barele subțiri (3 px) au pe culori aceeași arie ca alb-negrul la pragul de 50 % (871,3 / 871,4 px²); amândouă stau cu ~3 %
  sub hârtie la Echilibrat (capetele de 3 px se rotunjesc: curbele din 25.1↑, comune);
- cu multe culori, reuniunea logoului e cu 0,2–0,35 % sub alb-negru (la 4–8 culori: curbele trase prin joncțiuni dese, sub
  banda de 0,3 px); la 3 culori, 0,02 %;
- probele: 17 țintite, 4 cazuri de corpus, 3 ale calculului și ușii, 1 a importului adus împreună, 4 e2e;
- otrăvurile (`test/otravuri/25.2.py`): prima rulare 42 / 51 (lotul s-a oprit cu trei înainte de capăt: E07–E09 au intrat
  în a doua); cele scăpate, cu probe noi (șase), o regulă nouă la atingerile în colț, codul a două scos, două echivalente
  scoase din listă (cu motivul) și otrava R03 reparată (pragul ei era sub contrastul negru–alb); a doua rulare 49 / 50, iar
  X04, prinsă cu proba joncțiunii lângă un colț: 50 / 50. În lista 25.1, rândurile mutate aici (T02, B02, E05) sunt noi;
  T02 și B02, prinse;
- mărimea: totalul 545,1 / 550 kB, cu felia +9,7 (înainte de ea, la `251355e`, 535,4; estimarea era 5–7: nucleul culorilor
  stă în workerul trasării, fereastra are pastilele), pornirea 101,6 / 110, neschimbată. Rămân 4,9 kB până la plafon, comun
  cu liniile neunite.

## Ce am respins

- **Fiecare culoare trasată alb-negru, separat:** golurile dintre culori (ca Inkscape fără „Stack”).
- **Straturi suprapuse** („Stack”, „stacked”): fără goluri, dar culorile se acoperă, deci nici săpatul pe adâncimi, nici
  incrustația nu se potrivesc.
- **vtracer** (WASM, peste plafon; mozaicul fără cusături doar într-o versiune alfa) și **median cut** (cutii în RGB, mai
  slab ochiului decât k-means în OKLab).
- **k-means pe toți pixelii:** amestecurile de pe margini devin culori false; centrele se aleg pe pixelii plini.
- **O unealtă separată pentru culori:** aceeași fereastră, aceeași ușă (ADR 0220, răspunsul 1a).

## Ce impune

- Nucleul culorilor stă tot în `src/trasare/` (regula `trasare-izolat`), iar fereastra în `src/ui/FereastraTrasare.tsx`;
  textele noi, în `src/i18n/import.*.ts`, iar manualul primește culorile în capitolul importului, în ambele limbi.
- Ușa importului întoarce, pentru culori, mai multe piese dintr-un fișier: `document.importa` le adaugă într-un singur pas de
  anulare, aliniate.

**Se redeschide dacă:** pe logoul tău sau pe o imagine trimisă de tine, granițele dintre culori nu se potrivesc (o fâșie sau
o suprapunere); numărul automat greșește des; totalul trece de 550 kB.

## Întrebările (recomandarea întâi)

**Răspunsurile (07.11):** „Da, 1a–5a”: toate recomandările.

1. **Câte culori, implicit?**
   - **a)** Automat: culorile distincte din imagine, 2–16 (pe logoul tău, 3), cu glisorul pentru alt număr;
   - b) 4, ca punct de pornire;
   - c) le alegi mereu tu, de la 2.
2. **Legarea culorilor:**
   - **a)** tragi pastila unei culori peste alta (ca în ArtCAM), iar legătura se desface din „Dezleagă” de pe pastilă;
   - b) bifezi două pastile și apeși „Leagă”;
   - c) fără legare: doar numărul culorilor.
3. **Fundalul unei imagini opace:**
   - **a)** culoarea care domină marginea imaginii e fundalul, nebifată (o poți bifa);
   - b) nicio culoare nu e fundal: toate se trasează;
   - c) alegi tu fundalul dintre pastile, de fiecare dată.
4. **Piesele:**
   - **a)** o piesă pe culoare, toate aliniate, cu rolul ales din panou pe fiecare;
   - b) o singură piesă, cu culorile ca elemente ale ei;
   - c) doar culoarea aleasă, câte una pe import.
5. **Culoarea pe piesă:**
   - **a)** doar în numele piesei (documentul nu se schimbă);
   - b) un câmp al piesei, cu pânza colorată după el (o schemă nouă a documentului).
