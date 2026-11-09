# ADR 0224 — Scanările și pozele: lumina inegală, zona aleasă, „Ignoră ce atinge marginea”

**Starea:** acceptat pe 09.11.2026, cu toate recomandările („Da, 1a–2a”, la întrebările de la final); propus tot atunci, la
„continua” (owner-ul, după unirea liniei trasării în `main`). Felia 25.4↑, adusă din etapa 25, fără mașină, în linia
trasării (worktree-ul `trasare`, ramura `wip/25.1-trasare`, adusă la `origin/main`, `01f6673`; neunită); implementat în
aceeași zi (secțiunea „Implementarea”).
**Completează:** ADR 0220 §3 (cerneala și pragul: „pragul local (25.4↑) e altă sursă a cernelii, pe aceeași cale”), §4
(curățarea), §10 (fereastra), §12 (felia 25.4↑); ADR 0222 și 0223 (liniile mediane primesc același câmp); ADR 0221
(culorile primesc zona și marginea; lumina lor, într-o felie a ei, dacă o vrei).
**Schița:** <https://claude.ai/artifact/U1jHQbsKGXNwopvJMBppCj> (fereastra ca machetă, cu luminile pe fiecare caz al
prototipului, zona pe foaia de pe masă și marginea; ce am măsurat; întrebările, cu formularul).

## Problema

Un desen scanat și, mai des, o poză de telefon: lumina cade dintr-o parte și colțurile se întunecă (vignetarea), umbra
telefonului sau a mâinii taie foaia, masa intră în cadru. Pragul global (Otsu, ADR 0220 §3) desparte atunci lumina, nu
cerneala: în prototip, pe desenul luminat dintr-o parte, partea întunecată a foii iese cerneală, de zece ori cât cerneala
adevărată. Iar polaritatea din marginea imaginii se întoarce când masa e pe toată marginea sau colțurile sunt închise:
hârtia devine cerneală, iar desenul, găuri în ea.

## Ce am aflat (cercetarea din 09.11)

- **Alte programe** (referință funcțională, din documentația lor; fără cod, interfață sau texte copiate): LightBurn (pragul
  și intervalul trasat, „ignoră sub” în arie, urmărirea unei schițe cu prag local, trasarea doar în dreptunghiul tras pe
  imagine), Vectric (pragul, filtrul de zgomot, decuparea imaginii sau trasarea într-o zonă), CorelDRAW (scoaterea fundalului),
  ImageJ (scăderea fundalului cu „rolling ball”, pragurile locale Sauvola, Niblack, Bernsen, Phansalkar; „exclude on edges”).
- **Algoritmii, din lucrări publice:** Sauvola și Pietikäinen (2000), T = m(1 + k(s/R − 1)), cu imaginile integrale (Shafait,
  Keysers, Breuel 2008) sau cu sumele pe coloane glisante; Bradley și Roth (2007); fundalul scăzut („rolling ball”, Sternberg
  1983) și închiderea morfologică, cu maximul și minimul pe fereastră în trei comparații pe pixel, oricât de mare e ea (van
  Herk 1992; Gil și Werman 1993); corecția câmpului plat: luminozitatea e lumina × hârtia, deci se împarte la fundal.
- **Prototipul** [09.11, Node 26, `.tmp/proto-254.ts`, `.tmp/metode-254.ts`; 1200 × 800 px, cu adevărul știut]: un desen
  (patru rânduri de zigzaguri de 3–6 px, un cerc, o spirală) pe hârtie (0,93), cu cerneala 0,12 și zgomot; lumina scade de la
  87,5 % într-un colț la 17,5 % în cel opus (de cinci ori: cazul greu; pe o poză obișnuită, mai puțin); cazurile: lumina
  egală; luminat dintr-o parte; plus o pată plină de 320 × 180 px; plus o umbră tare (38 % mai închisă); foaia pe masă
  (0,18), rotită cu 2,3°; creta pe tablă (cerneala deschisă). Erorile, după petele sub 25 px²: cerneala în plus / cea lipsă,
  ca parte din cerneala adevărată.

  | Cazul | Uniformă (acum) | Neuniformă | Cu umbre | Sauvola, k 0,5 |
  |---|---|---|---|---|
  | lumina egală | 0,1 / 0,3 % | 0,1 / 0,5 % | 0,1 / 0,3 % | 2,4 / 0 % |
  | luminat dintr-o parte | 1010 / 0 % | 0,2 / 1,1 % | 0,3 / 1,0 % | 0,5 / 1,0 % |
  | + pată plină | 259 / 0 % | **0 / 0,7 %** | 1,4 / 26,1 % (golită) | 0,2 / 38,6 % |
  | + umbră tare | 1082 / 100 % (întoarsă) | 648 / 0 % | **0,7 / 1,1 %** | 0,5 / 1,5 % |
  | foaia pe masă | 2519 / 99,5 % (întoarsă) | 378 / 0,9 %; fără margine 0,3 / 0,9 % | 378 / 0,9 %; fără margine 0,4 / 0,9 % | 287 / 1,0 % |
  | foaia pe masă, cu zona foii | 949 / 0 % | 0,3 / 0,9 % | 0,4 / 0,8 % | — |
  | creta pe tablă | 1,6 / 6,6 % | 0,2 / 0,8 % | 2,1 / 2,4 % | 10,5 / 0 % (în oglindă) |

  - **Neuniformă** = fundalul neted: un polinom de gradul 3 în (x, y), potrivit pe hârtie; **Cu umbre** = fundalul local:
    închiderea luminozității pe o fereastră de 1/12 din latura mică (aici 67 px). Cerneala e raportul față de fundal, iar
    pragul, Otsu pe ea, ca acum. Fundalul neted nu știe umbrele tari; cel local golește o pată plină mai lată decât fereastra.
    Nicio măsură nu deosebește sigur o umbră de o pată plină (amândouă sunt zone mari, închise), deci alege omul, cu
    previzualizarea pe loc.
  - **Polaritatea:** marginea (acum) se întoarce pe umbră și pe masă; clasa cea mai mare după Otsu, pe umbră (Otsu desparte
    lumina); **minoritatea locală** a cernelii (lângă trăsături, cerneala e clasa mai puțin numeroasă față de mijlocul dintre
    închidere și deschidere) le nimerește pe toate șase, cu 5–12 % din imagine față de 29,5–31,5 % pentru ipoteza greșită.
    Pe un logo opac care umple cadrul, ea ia literele albe drept cerneală, de aceea „Uniformă” păstrează marginea.
  - **Timpul pe 12 Mpx** (4000 × 3000): Neuniformă, potrivirea 7–14 ms și evaluarea pe o grilă de 32 px, interpolată, 69–120
    ms; Cu umbre, închiderea pe 231 px 546–590 ms; polaritatea 71–93 ms; Sauvola 120–189 ms. Trasarea însăși: ~6,7 s (ADR
    0220). Cu umbre ține încă două imagini de numere (2 × 48 MB pe 12 Mpx) cât lucrează.

## Decizia (cu răspunsurile owner-ului: toate recomandările)

1. **Fereastra trasării**, sub prag și Inversează, doar pe sursa luminozității (o imagine cu transparență n-are lumină):
   - **Lumina:** „Uniformă” (pragul global și polaritatea din margine, ca acum) | „Neuniformă” | „Cu umbre”; implicitul,
     întrebarea 1. Pragul (automat sau glisorul, cu histograma) și Inversează lucrează pe cerneala corectată;
   - **Zona:** butonul „Zona” din bara previzualizării: cât e apăsat, tragerea desenează dreptunghiul, îl mută sau îl
     întinde de laturi și colțuri; Shift + tragere îl desenează și fără buton; „Toată imaginea” îl scoate. În afara zonei,
     imaginea se estompează. Ce e zona, întrebarea 2;
   - **„Ignoră ce atinge marginea”** (bifa, implicit oprită): bucățile de cerneală lipite de marginea imaginii, sau a zonei,
     se șterg, ca petele, și pe culori (trec la fundal); raportul le numără;
   - **raportul** spune zona (în px și mm) și, pe „Uniformă”, când fundalul neted al hârtiei variază cu peste 25 %, sugerează
     „Neuniformă”.
2. **Calculul**, în workerul trasării, cod propriu în `src/trasare/lumina.ts` (regula `trasare-izolat`), în `campul`, deci
   pentru contururi și pentru liniile mediane:
   - **zona** e decupată din imagine înaintea cernelii: pragul automat, histograma, lumina și curățarea văd doar zona;
   - **Neuniformă:** polinomul (10 termeni), potrivit pe ~40 000 de puncte ale hârtiei, de patru ori (întâi clasa hârtiei,
     apoi pixelii la cel puțin 0,85 din suprafață), evaluat pe o grilă de 32 px; cerneala 1 − g / B (pe fondul închis,
     g / B − 1, întins după percentila 99,5);
   - **Cu umbre:** fundalul e închiderea luminozității (maximul, apoi minimul; deschiderea, pe fondul închis), pe o fereastră
     de 1/12 din latura mică a zonei, cel puțin 15 px; o treaptă de umbră rămâne în fundal (închiderea păstrează o funcție
     monotonă), o trăsătură mai îngustă decât fereastra iese din el; aceeași cerneală, ca raport;
   - **polaritatea**, la Neuniformă și Cu umbre, din minoritatea locală (pe imaginea redusă la ~0,25 Mpx); Inversează o
     întoarce, ca acum;
   - **marginea:** componentele de cerneală care ating marginea (`componente` le știe deja, ADR 0220 §4) se șterg la curățare.
3. **Culorile** (ADR 0221) primesc zona și marginea; lumina lor (fiecare canal raportat la fundal) e o felie a ei, 25.4↑b,
   dacă o vrei. **Îndreptarea foii** pozate oblic (cele patru colțuri) e tot o felie a ei, după, dacă o vrei.
4. **Mărimea:** ~+3–4 kB (totalul ~582; plafonul e 700 kB din 09.11, ADR 0144).
5. **Probele, scrise întâi:**
   - nucleul (`test/unit/trasare.lumina.test.ts`): cazurile prototipului, generate cu adevărul știut, cu plafoanele măsurate
     (plus și lipsă, numărul componentelor); polaritatea pe toate șase; închiderea păstrează exact o treaptă; polinomul
     regăsește o suprafață cubică știută; o bucată lipită de margine se șterge, una la un pixel de ea rămâne; zona: pragul
     automat nu vede masa din afara ei;
   - ușa: zona în px → căile în mm, după răspunsul 2; raportul;
   - e2e: Lumina (ascunsă pe transparență), zona trasă cu butonul și cu Shift, „Toată imaginea”, bifa marginii, o poză
     sintetică cu masa în jur → Importă, fără nicio cale pe masă;
   - fișierul real întâi (lecția D7): o poză de telefon a unui desen pe hârtie și o scanare, dacă le trimiți;
   - otrăvurile la capăt (`test/otravuri/25.4.py`).

## Implementarea (09.11)

**Ce s-a schimbat față de propunere** (fiecare, găsit de probe):

1. **Polaritatea, din mediana din jur:** regula propusă (închiderea și deschiderea, cu pixelii de sub mijlocul lor) mergea pe
   desenul sintetic doar fiindcă zigzagurile lui sunt dese: hârtia dintre dinți, mai îngustă decât fereastra, ieșea
   „deschisă”. Pe un desen rar (un zigzag larg, un cerc, o linie: e2e-ul) lua hârtia drept cerneală. Acum, pe imaginea redusă
   la ~0,25 Mpx, mediana luminozității în fereastra fiecărui pixel (1/12 din latura mică, glisantă pe rânduri, după Huang,
   1979) e a hârtiei, iar abaterile de la ea se adună: cerneala are semnul sumei (hârtia se abate puțin și în ambele sensuri,
   cerneala mult și într-unul). Un prag de zgomot, încercat întâi, n-a schimbat nicio probă (otrava lui a scăpat): a ieșit
   din cod. Toate cele nouă cazuri ies bine (șase dese, trei rare); logoul opac care umple cadrul, ca în propunere.
2. **Fundalul are cel puțin un sfert din hârtia cea mai deschisă** (percentila 95 a lui), pe hârtia deschisă: pe masa
   închisă, zgomotul împărțit la fundalul ei ieșea pete („Cu umbre” cu marginea: 1 % în plus pe desenul des, 2,7 % pe cel
   rar; acum 0,01 %). Prețul: o pată plină se pierde toată cu „Cu umbre” (48 % lipsă, nu 33 %), cum oricum se golea.
3. **Probele numără doar greșelile clare** (un pixel cu acoperirea sub 0,4 luat drept cerneală, sau unul de cel puțin 0,6
   pierdut): pe trăsăturile subțiri, pragul automat de azi (mijlocul mediilor claselor) cade la acoperirea ~0,47, fiindcă
   pixelii parțiali trag media cernelii spre hârtie. În prototip nu se vedea: acolo, acoperirea era cuantizată la 1/16.
4. **Viteza:** luminozitatea scrisă direct în bufferul cernelii, histograma cu index (un `for…of` pe 12 M de pixeli ținea
   ~180 ms), filtrul pe loc și raportul scris peste fundal (de la patru imagini de câte 48 MB la două): pe 12 Mpx, „Neuniformă”
   adaugă ~0,4 s, „Cu umbre” ~0,7 s (la început, 2,2–2,5 s).
5. **Pragul inițial al fundalului neted îl dă nucleul** (`pragAutomat`, Otsu pe întunecime): `lumina.ts` nu importă din
   `trasare.ts` (fără import circular), iar lista de otrăvuri 25.1, care țintește pragul, rămâne valabilă.
6. **Zona** se decupează în calcul, înaintea nucleului; răspunsul poartă imaginea întreagă și zona tăiată la ea, iar
   previzualizarea arată toată imaginea, cu vectorii zonei la locul ei; un clic fără tragere (sub 4 px) nu face o zonă.

**Măsurat** [09.11, Node 26 și Edge fără fereastră, pe `fe21e56` și `3ecf19b`]:
- pe pozele sintetice de 600 × 400 (`.tmp/masoara-lumina-0224.ts`, greșelile clare): „Neuniformă” 0–0,06 % în plus și
  0 % lipsă pe lumina dintr-o parte, pe pata plină, pe masă (cu marginea) și pe cretă; „Cu umbre” 0–0,1 % pe lumina dintr-o
  parte, pe umbra tare și pe masă (cu marginea), 1,5 / 0,7 % pe cretă; pragul de azi, 156–1267 % în plus, iar pe umbră și pe
  masă cu polaritatea întoarsă (95 % lipsă);
- timpul pe 12 Mpx (Node): polaritatea 65–100 ms, fundalul neted 84–102 ms, fundalul local 716–874 ms (fereastra de 251 px),
  raportul 22–40 ms; `campul` întreg 0,57–1,07 s cu „Uniformă”, 1,0–1,2 s cu „Neuniformă”, 1,2–1,35 s cu „Cu umbre”;
- probele: 20 ale luminii (cu trei desene rare, hârtia foarte întunecată, poza subexpusă), 4 ale ușii, 4 e2e (lumina și
  sugestia; masa, marginea și Importă; zona cu butonul, cu Shift, clicul, mutarea, întinderea și vectorii la locul ei;
  transparența și culorile); suita unitară întreagă 8883 (0 căzute, pe `fe21e56`), e2e-urile importului, ale trasării și
  tutorialul 44 / 44 (și pe `3ecf19b`);
- otrăvurile (`test/otravuri/25.4.py`, alese de autor): 48 / 48. La prima rulare 46 / 49: L12 și T06 au primit probe (hârtia
  foarte întunecată, cu contrastul întreg al cernelii, și poza subexpusă); L15, echivalentă, a ieșit din listă cu pragul de
  zgomot al polarității;
- mărimea: totalul 582,5 / 700 kB (+3,7), pornirea 101,9 / 110, cu un proiect salvat 105,6.

**Limitele, scrise:** „Cu umbre” golește o pată plină mai lată decât fereastra (o douăsprezecime din imagine) și lasă, pe
cretă, puțină cerneală în plus (zgomotul tablei închise, ~1,5 %); polaritatea din mediană se poate întoarce pe un desen în
care cerneala e majoritatea ferestrei (hașuri dese pe toată foaia: atunci, Inversează); pe 16 Mpx, „Cu umbre” adaugă ~1 s;
sugestia se calculează cu polaritatea din margine, deci nu apare pe o foaie pozată pe masă (acolo, marginea e masa).

## Ce am respins

- **Sauvola** (și Bradley–Roth): marginea cade unde cade pragul local, nu la jumătatea acoperirii (ADR 0220 §3): pe lumina
  egală, trăsăturile ies cu 2,4 % mai groase, iar în oglindă, pe cretă, cu 10,5 %; glisorul pragului n-ar mai avea înțelesul
  de acum. Fundalul local, cu raportul și Otsu, ține marginea la jumătate.
- **O singură metodă automată:** fundalul neted greșește pe umbre (648 % în plus), cel local pe petele pline (26 % lipsă).
- **Polaritatea din margine pe poze** (masa întoarce foaia) și **din clasa cea mai mare** (pe lumina tare, Otsu desparte
  lumina). Pe „Uniformă”, marginea rămâne: un logo opac care umple cadrul are fundalul pe margine.
- **O bibliotecă:** OpenCV.js (megaocteți), scikit-image doar ca martor (ADR 0220).

## Ce impune

- `OptiuniTrasare` primește `lumina` și `margine`; `AlegeriTrasare`, `zona` (în pixelii imaginii, sau lipsă). Fereastra în
  `src/ui/FereastraTrasare.tsx`, textele în `src/i18n/import.*.ts`, manualul în ambele limbi (`%% acopera:`).
- Cu umbre ține cât lucrează două imagini de numere în plus (pe 16 Mpx, 2 × 64 MB).

**Se redeschide dacă:** pe o poză reală a ta, o lumină iese mai rău decât în LightBurn sau ArtCAM, ori polaritatea se întoarce;
Cu umbre trece de 1 s pe 16 Mpx în browser; zona se încurcă cu mutarea previzualizării pe un ecran tactil.

## Întrebările (recomandarea întâi)

**Răspunsurile (09.11):** „Da, 1a–2a”: toate recomandările.

Opțiunile de mai sus vin toate (regula „toate opțiunile”); întrebările sunt doar despre ce se exclude.

1. **Lumina implicită:**
   - **a)** „Uniformă”, ca acum (o imagine care iese bine azi iese la fel); raportul sugerează „Neuniformă” când hârtia e
     luminată inegal;
   - b) „Automat”: aplicația alege „Neuniformă” când hârtia e luminată inegal (umbrele rămân de ales de mână).
2. **Ce e zona:**
   - **a)** un decupaj: zona devine imaginea trasată (colțul ei stânga-jos pe colțul foii; „Lățimea” și mărimea din raport
     sunt ale zonei), ca decuparea din Vectric;
   - b) un filtru: vectorii rămân unde sunt în imaginea întreagă, iar „Lățimea” e a imaginii, ca dreptunghiul din LightBurn.
