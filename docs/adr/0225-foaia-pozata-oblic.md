# ADR 0225 — Foaia pozată oblic: colțurile găsite, îndreptarea, formatul și mărimea adevărată

**Starea:** acceptat pe 13.11.2026, cu toate recomandările („Da la 1-3a”, la întrebările de la final), și implementat tot
atunci (felia 25.5↑, mai jos); propus tot atunci, la
„continua” (owner-ul, după unirea lui 25.4↑ în `main`). Felia 25.5↑, adusă din etapa 25, fără mașină, în linia trasării
(worktree-ul `trasare`, ramura `wip/25.1-trasare`, adusă la `origin/main`, `29b69c0`). Am pus-o înaintea luminii pe culori
(25.4↑b) și a liniilor mediane pe culori: strâmbă orice poză de telefon, nu doar pe cele colorate.
**Completează:** ADR 0220 §7 (mărimea: DPI-ul fișierului sau 96 px pe țol, „Lățimea”), ADR 0224 (zona, lumina și marginea
lucrează pe foaia îndreptată).
**Schița:** <https://claude.ai/artifact/SnirKdXpgvCjcbWkcEn4Ax> (pozele prototipului: colțurile găsite, foaia îndreptată cu
vectorii și formele adevărate, urma fără îndreptare; macheta controalelor; ce am măsurat; întrebările, cu formularul).

## Problema

O poză de telefon a unui desen pe hârtie e rar făcută drept de deasupra: foaia iese un patrulater oarecare, iar desenul se
strâmbă. În prototip, un pătrat de 60 × 60 mm, măsurat cu o singură scară, are laturile de 58–65 mm și colțurile nu mai sunt
drepte. Pentru o piesă tăiată pe CNC e o greșeală de mărime și de formă. Iar o poză n-are DPI: mărimea desenului vine azi
din 96 px pe țol sau din „Lățimea” scrisă de mână.

## Ce am aflat (cercetarea din 13.11)

- **Alte programe** (referință funcțională, din documentația lor; fără cod, interfață sau texte copiate): Microsoft Lens (la
  fel Adobe Scan și CamScanner) găsește singur marginile documentului, te lasă să le muți, apoi îl îndreaptă; LightBurn
  corectează perspectiva doar pentru camera de deasupra mașinii (lentila calibrată, apoi alinierea pe patru ținte gravate),
  nu pentru o poză trasată; Vectric, ArtCAM și Inkscape n-au nimic pentru o foaie pozată oblic; GIMP are unealta de
  perspectivă, de mână.
- **Algoritmii, din lucrări publice:** omografia din patru perechi de puncte (transformarea liniară directă, un sistem de
  8 × 8); proporțiile unui dreptunghi dintr-o singură poză (Zhang și He, 2007, „Whiteboard scanning and image enhancement”):
  focala din ortogonalitatea laturilor, cu centrul optic în mijlocul imaginii, apoi raportul laturilor, cu eroarea raportată
  de ei mai ales sub 3 %, mai mare la unghiuri mari; învelitoarea convexă (lanțul monoton); dreapta celor mai mici pătrate
  totale.
- **Prototipul** [13.11, Node 26, `.tmp/proto-255.ts`]: o foaie A4 cu patru forme de mărime știută (un pătrat de 60 mm, un
  disc de 50, un dreptunghi de 120 × 25, un inel de 70 / 50), pozată cu o cameră pinhole (1600 × 1200 px, focala 1400) sub
  patru unghiuri, pe o masă, cu lumina dintr-o parte; foaia îndreptată, trasată cu nucleul real („Neuniformă”). Eroarea
  formelor: distanța cea mai mare (și media) dintre vârfurile trasate și marginea formei adevărate.

  | Poza | Colțurile (px): găsite → rafinate | Focala; raportul (A4: 0,7071) | Formele, cu A4 | Cu raportul estimat | Pătratul de 60 mm, neîndreptat |
  |---|---|---|---|---|---|
  | aproape din față (8°) | 1,69 → 0,02 | 1404; 0,7070 | 0,27 / 0,094 mm | 0,27 / 0,094 mm | 61,7 / 62,5 / 60,5 / 62,2 mm |
  | înclinată 25° | 1,74 → 0,05 | 1409; 0,7062 | 0,17 / 0,053 mm | 0,36 / 0,144 mm | 65,4 / 62,3 / 61,4 / 62,3 mm |
  | înclinată 40° | 2,22 → 0,20 | 1401; 0,7073 | 0,12 / 0,056 mm | 0,12 / 0,056 mm | 62,7 / 58,9 / 58,1 / 57,9 mm |
  | rotită 30° în plan | 1,57 → 0,07 | 1400; 0,7071 | 0,12 / 0,042 mm | 0,20 / 0,068 mm | 64,5 / 63,5 / 62,6 / 64,7 mm |

  - pixelul foii îndreptate are ~0,29 mm: formele stau sub un pixel de cele adevărate;
  - **găsirea:** pe imaginea redusă la ~0,4 Mpx, pragul Otsu, componenta deschisă cea mai mare, punctele ei de margine,
    învelitoarea convexă și patrulaterul de arie maximă dintre vârfurile ei; apoi fiecare latură, pe imaginea întreagă:
    trecerea de 50 % dintre foaie și masă pe 48 de normale, dreapta potrivită pe ele, colțurile din intersecții;
  - **găsit pe drum:** reducerea Visvalingam (vârful cu triunghiul cel mai mic scos, până rămân patru) pierdea colțul
    adevărat când pixelii îl rotunjesc în trei vârfuri apropiate (29 px pe lângă, pe poza aproape din față); patrulaterul
    de arie maximă (după o reducere doar până la 40 de vârfuri) nu-l pierde;
  - **timpul:** găsirea 17–99 ms pe 1,9 Mpx, rafinarea 2–5 ms; pe 12 Mpx, îndreptarea (ieșirea de 10,3 Mpx, biliniară,
    bucla scrisă direct) 219–255 ms. Trasarea însăși ia ~6,7 s (ADR 0220).

## Decizia (cu răspunsurile owner-ului: toate recomandările)

1. **Fereastra trasării**, pe imaginile opace, grupul **Foaia**:
   - **Îndreaptă foaia** (bifa; implicitul, întrebarea 1): aplicația caută foaia și îi găsește colțurile; dacă nu o
     găsește, pune colțurile puțin înăuntrul colțurilor pozei, iar raportul spune să le muți;
   - **Formatul:** A4 (implicitul, întrebarea 2), A5, A3, Letter, „Alt format” (lățimea și înălțimea, în mm) și „Din poză”
     (proporțiile estimate); orientarea (în picioare sau culcată) o ia din poză;
   - butonul **Colțurile**, în bara previzualizării, lângă Zona: cât e apăsat, previzualizarea arată poza, cu marginea foii
     și cele patru mânere, trase cu mausul; altfel, foaia îndreptată, cu vectorii (întrebarea 3);
   - **raportul:** formatul și mărimea foii, de unde vin colțurile (găsite singure sau mutate) și proporțiile din poză față
     de ale formatului (o diferență mare: „foaia nu pare A4”).
2. **Calculul**, în workerul trasării, înaintea zonei, cod propriu în `src/trasare/foaia.ts` (regula `trasare-izolat`):
   găsirea pe imaginea redusă, rafinarea pe cea întreagă, omografia, îndreptarea biliniară (cu densitatea laturii celei mai
   lungi din poză, cel mult 16 Mpx). Cererea poartă colțurile date (sau niciunele: găsite) și formatul; răspunsul, colțurile
   folosite, proporțiile din poză și foaia îndreptată redusă (cel mult 1 Mpx), pentru previzualizare.
3. **Mărimea:** cu un format știut, foaia îndreptată are mărimea lui (A4: 210 mm pe lățime), deci desenul are mărimea lui
   adevărată; „Lățimea” scrisă rămâne mai tare (și e a zonei, dacă e una), iar zona e un decupaj din foaie, cu mărimea ei.
   Cu „Din poză”, mărimea vine ca acum (DPI-ul, 96 px pe țol, „Lățimea”).
4. **Restul ferestrei** lucrează pe foaia îndreptată: zona (în pixelii ei; colțuri sau format noi o scot), lumina, „Ignoră ce
   atinge marginea”, pragul, liniile mediane, culorile.
5. **Mărimea pachetului:** ~+4–5 kB (totalul din `main` e 654,4 / 700).
6. **Probele, scrise întâi:** poze sintetice cu colțurile și formele știute (generatorul prototipului, în
   `test/unit/ajutor-poze.ts`): colțurile la cel mult 0,5 px, proporțiile la 1 %, formele la cel mult un pixel pe foaia
   îndreptată; colțul rotunjit (cazul Visvalingam); o imagine fără foaie; poza aproape din față (focala nedeterminată); ușa
   (mărimea din format, zona pe foaia îndreptată); e2e (bifa, formatul, colțurile mutate cu mausul, Importă cu mărimea A4);
   fișierul real întâi (lecția D7), dacă îl trimiți; otrăvurile la capăt.

## Implementarea (13.11)

**Ce s-a schimbat față de propunere** (fiecare, găsit de probe sau de privirea ferestrei):

1. **Proporțiile au un interval.** Pe poza cea mai obișnuită, cu telefonul înclinat doar înainte, laturile de sus și de jos
   rămân paralele în poză: focala nu se poate afla (Zhang și He o spun), iar raportul, luat cu o focală obișnuită de telefon
   (0,85 din diagonală), iese cu 4 % pe lângă. Acum `proportiiDinPoza` dă și intervalul: colțurile mișcate cu câte 1 px (pe
   pozele mari, o două-miime din diagonală) și, cu focala nedeterminată, focala între 0,5 și 1,5 diagonale. Mai lat de 2 %:
   „nesigure”, iar cu „Din poză” raportul spune să alegi formatul; „nu se potrivesc cu A4” vine doar când formatul iese din
   interval (cu 3 % de o parte și de alta). O focală în afara oricărui telefon (sub 0,3 sau peste 3 diagonale) e
   nedeterminată.
2. **Un colț ieșit din cadru se extrapolează.** O foaie tăiată puțin de cadru (sub 10 % din perimetrul învelitorii pe
   marginea pozei) era „găsită” cu colțul din afară la 106 px: latura învelitorii de pe margine se înlocuiește acum cu
   intersecția laturilor vecine (după reducerea Visvalingam, cu reperul cel mai depărtat de pe aceeași dreaptă: vârful de
   alături, la 1 px, dădea direcția din zgomot și colțul la 47 px). O normală a rafinării tăiată de cadru citește marginea
   pozei: n-are contrast și se sare, iar trecerea găsită lângă ieșire pleacă la a doua potrivire (încercat întâi: dreptele
   fără pixelii de pe marginea pozei și normalele tăiate sărite; otrăvurile lor au scăpat, deci au ieșit din cod). Cu
   mânerele, un colț se trage și în afara pozei (vederea se micșorează până la jumătate, doar cu Colțurile).
3. **A doua potrivire a dreptei** (fără punctele la peste 1 px de prima): o agrafă care intră 6 px pe foaie muta colțurile
   la 0,57 px; acum, 0,05.
4. **Geometria colțurilor stă singură** (`src/trasare/colturi.ts`, fără importuri): fereastra verifică un patrulater
   convex la tragerea mânerelor fără să aducă nucleul trasării în bucata ei; ușa (`src/io`) își scrie tipul colțurilor
   structural (regula io-doar-model-geom).
5. **Fereastra:** formatele scurte în listă (A4, A5, A3, Letter; lista dialogului are 9 rem), cu mărimea în raport; numele
   formatului din raport vine din foaia trasată (după mărimea ei), nu din alegerea de acum, care poate aștepta o trasare.

**Măsurat** [13.11, Node 26 și Edge fără fereastră]:
- pe cele patru poze ale probelor (1600 × 1200, focala 1400): colțurile la 0,02–0,19 px; proporțiile la 0,10 % cel mult
  (focala 1400–1407), intervalul lor 0,4–3,3 % lat, cuprinzând mereu A4; pe poza înclinată doar înainte, focala
  nedeterminată, raportul 0,6788 (−4 %), intervalul 0,55–0,74 („nesigure”); formele pe foaia îndreptată cu A4, la
  0,12–0,27 mm cel mult (media 0,04–0,09; pixelul foii, 0,27–0,31 mm), cu proporțiile din poză 0,12–0,35 mm; desenul din
  e2e (1200 × 900 px), importat: 144,97 × 225,04 mm (adevărat: 145 × 225);
- colțul ieșit din cadru cu 94 și cu 135 px: 0,01–0,05 px; agrafa: 0,05 px;
- timpul (Node): găsirea 24–43 ms pe 1,9 Mpx și 79–110 ms pe 16 Mpx; îndreptarea 0,17–0,18 s pe 16 Mpx (ieșirea 7,2 Mpx),
  0,33 s pe 12 Mpx (ieșirea ~10 Mpx);
- probele: 15 ale nucleului (cu agrafa, colțul ieșit din cadru, poza înclinată doar înainte), 7 ale ușii, 4 e2e (sugestia,
  A4 cu mărimea adevărată și Importă; Colțurile, cu mânerele, ciorna convexă și colțul tras în afara pozei; formatele;
  scanul și transparența); suita unitară întreagă 9 191 (0 căzute); e2e-urile trasării, importului și tutorialul 48 / 48;
- otrăvurile (`test/otravuri/25.5.py`, alese de autor): 61 / 61 pe codul final (44 unitare, 17 prin e2e). La prima
  rulare, 42 / 47 unitare: K01 (pivotul minim al omografiei) și P05 (focalele de telefon la focala nedeterminată) au primit
  probe (trei puncte coliniare cu zecimale; camerele de 0,5 și 1,5 diagonale); G09, G10 și G13, echivalente, au ieșit din
  cod (punctul 2, mai sus);
- mărimea: totalul 660,2 / 700 kB (+5,8 față de `main`), pornirea 102,2 / 110 (105,9 cu ușa).

## Ce am respins

- **Proporțiile din cutia colțurilor** (lățimea și înălțimea patrulaterului din poză): greșesc cu atât mai mult cu cât poza e
  mai oblică (Zhang și He o arată); le dă formatul sau estimarea din perspectivă.
- **O bibliotecă** (OpenCV.js: megaocteți).
- **Corecția lentilei** (distorsiunea în butoi): telefoanele o corectează deja în poză; dacă o poză reală o arată, o felie
  a ei.

## Ce impune

- Îndreptarea e un pas al calculului (`src/jobs/calculTrasare.ts`), înaintea zonei, cu nucleul în `src/trasare/foaia.ts`;
  fereastra (`src/ui/FereastraTrasare.tsx`) primește grupul Foaia, butonul Colțurile și mânerele; textele, în
  `src/i18n/import.*.ts`; manualul, în ambele limbi.
- Zona din alegeri e în pixelii foii îndreptate, când îndreptarea e pornită.

**Se redeschide dacă:** pe o poză reală, foaia nu se găsește sau colțurile ies pe lângă; formele ies cu peste 1 % față de
mărimea lor; îndreptarea trece de 0,5 s pe 16 Mpx.

## Întrebările (recomandarea întâi)

**Răspunsurile (13.11):** „Da la 1-3a”: toate recomandările.

Opțiunile de mai sus vin toate (regula „toate opțiunile”); întrebările sunt doar despre ce se exclude.

1. **Îndreptarea, implicit:**
   - **a)** oprită; raportul o sugerează când găsește în poză o foaie înclinată (ca sugestia luminii);
   - b) pornită singură când aplicația găsește o foaie în poză.
2. **Formatul implicit:**
   - **a)** A4: foaia îndreptată are 210 × 297 mm, deci desenul ia mărimea lui adevărată;
   - b) „Din poză”: proporțiile estimate din perspectivă, iar mărimea din „Lățimea”, ca acum.
3. **Previzualizarea, cu foaia îndreptată:**
   - **a)** foaia îndreptată, cu vectorii; butonul „Colțurile” arată poza, ca să muți colțurile (ca butonul Zona);
   - b) poza mereu, cu colțurile; foaia îndreptată se vede abia după Importă.
