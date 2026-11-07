# ADR 0221 — Trasarea pe culori: reducerea în OKLab, granițele comune, o piesă pe culoare

**Starea:** propus pe 07.11.2026, în linia trasării (worktree-ul `trasare`, ramura `wip/25.1-trasare`), pornit la „Da, 25.2↑”
(owner-ul, după 25.1↑). Felia 25.2↑, adusă din etapa 25, fără mașină. Codul pornește după răspunsurile la întrebările de la
final.
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
    imaginii, mult mai puțin).

## Decizia (propusă; întrebările deschise sunt marcate)

1. **Sursa „Culorile”** în lista Sursa a ferestrei trasării, lângă Transparența și Luminozitatea. Pragul și Inversează se
   ascund (nu au sens aici); Netezimea, petele, golurile și lățimea rămân.
2. **Reducerea**, în workerul trasării:
   - pixelii vizibili (alfa peste 50 %) trec în OKLab; centrele se aleg cu k-means++ doar pe pixelii *plini* (opaci, cu
     vecinătatea de 3 × 3 de aceeași culoare), deci amestecurile de pe margini nu devin culori false; apoi fiecare pixel
     vizibil primește culoarea cea mai apropiată;
   - numărul: **Automat** (cel mai mare număr de la 2 la 16 la care centrele stau la cel puțin 0,08 unul de altul și fiecare
     are cel puțin 1 % din desen; pe logoul tău, 3) sau ales cu glisorul, 2–16 (întrebarea 1);
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
   - **e2e:** logoul pe culori (3 pastile, legarea celor două griuri, Importă → 2 piese aliniate), lecția D7 pe culori,
     oprirea;
   - **otrăvurile** la capăt (`test/otravuri/25.2.py`).
10. **Mărimea:** ~+5–7 kB (reducerea, plasa duală, granițele deschise, pastilele), în workerul trasării și în fereastră;
    totalul de pe ramură, de la 531,8 la ~538 / 550. Plafonul e comun cu liniile neunite.

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
