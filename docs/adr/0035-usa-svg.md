# ADR 0035 — Ușa SVG: din fișier, la căi în milimetri

**Starea:** acceptat pe 12.10.2026, în felia 2.7c. **Intră în:** etapa 2. Nimic de aici nu se schimbă fără un ADR nou.

**Problema.** Placa 2 cere o piesă „importată din SVG”, iar logoul ei are lățimea declarată de 80 mm (±0,3). Un SVG e un
desen pentru ecran: unități CSS, `viewBox`, transformări, șapte feluri de forme, arce eliptice, regula de umplere și stiluri.
Documentul are o singură formă pentru contururile oarecare, calea (ADR 0034). Ușa trebuie să le aducă la ea, în milimetri,
fără să execute nimic din fișier și fără să aproximeze ce se poate păstra exact.

În ediția întâi, o propoziție greșită despre `getCTM()` (care unități întoarce) a ținut trei luni un import de 3,78 ori
prea mare. Aici nu se atașează nimic și nu se cere nimic browserului în afară de parser: matricile și unitățile le
socotește ușa, din atribute, cu valorile lor pe hârtie.

## Contractul

**1. Intrarea.**
- **Octeții:** peste **16 MiB** (`PLAFON_IMPORT.octeti`), fișierul e refuzat înainte de citire. Ca în ediția întâi:
  `DOMParser` singur trece de o secundă la plafon (măsurat acolo: 17,5 MiB → 1,36 s).
- Fișierul arhivat (`.svgz`, primii doi octeți 1F 8B) e refuzat, cu motiv: „dezarhivează-l întâi”.
- Textul se citește UTF-8.
- **Entitățile XML** se judecă pe text, înaintea parserului. Refuzul vine pentru:
  - o entitate parametru (`<!ENTITY %`) sau una externă (`SYSTEM` / `PUBLIC`);
  - o entitate a cărei valoare conține `&` sau `<`: o entitate care cheamă alta (expansiunea exponențială), sau una care
    aduce elemente;
  - mărimea expandată peste 16 MiB, socotită exact: Σ (aparițiile `&nume;` în text) × (lungimea valorii). Fără imbricare,
    suma e chiar expansiunea (expansiunea pătratică);
  - peste **100** de declarații (`PLAFON_IMPORT.entitati`): mii ar face judecata lor pătratică;
  - o valoare implicită literală într-un `<!ATTLIST>` (recenzia 2.7c: Edge o pune pe fiecare element, o amplificare pe care
    numărătoarea entităților n-o vede); `#IMPLIED` / `#REQUIRED` trec.

  La o entitate declarată de două ori contează prima declarație (XML 1.0 §4.2, și în Edge). Motivul refuzului e un cod
  (`parametru`, `fara-nume`, `externa`, `neterminata`, `valoare`, `numar`, `expansiune`, `attlist`), tradus de interfață:
  niciun text din fișier nu ajunge în mesaj.

  Entitățile simple (Illustrator le folosește pentru spațiile de nume) trec.
- **Parserul** e `DOMParser`, cu `image/svg+xml`. Un document fără context de navigare nu rulează scripturi și nu încarcă
  nimic. Ușa nu-l atașează, nu-i cere stiluri calculate și nu urmează nicio referință (`href`, `url(…)`, `@import`). Citește
  doar atribute.
- O eroare de parsare (`parsererror`) sau o rădăcină care nu e `svg` dau refuzul „nu e un SVG valid”. Elementele contează
  după numele local, în spațiul de nume SVG (sau fără spațiu de nume, dacă rădăcina n-are). Celelalte spații de nume
  (Inkscape, Sodipodi, Illustrator) se ignoră.

**2. Unitățile și pagina.** Coordonatele ies în milimetri, cu Y în sus. Pagina SVG stă cu colțul stânga-jos în originea
piesei.
- **Lungimile** au gramatica CSS: un număr urmat, opțional, de o unitate (fără deosebire de majuscule):
  - mm = 1; cm = 10; Q = 0,25; in = 25,4; pt = 25,4 / 72; pc = 25,4 / 6;
  - px și numărul fără unitate = 25,4 / `pxPeTol` mm. `pxPeTol` e **96** (CSS), implicit, sau **72**, la alegerea omului
    din dialog: Illustrator socotește 1 px = 1 pt. Dialogul o preselectează pe 72 când fișierul spune în comentariu că l-a
    scris Illustrator, și spune de ce;
  - `%`, `em`, `ex` și alte unități: lungimea lipsește. Pe rădăcină, latura vine atunci din `viewBox`; fără el, pagina
    n-are mărime (`pagina-fara-marime`).
- **Mărimea paginii:** `width` și `height` ale rădăcinii, dacă sunt lungimi pozitive. Cu `viewBox` și o singură lungime,
  cealaltă vine din raportul `viewBox`-ului (dimensionarea intrinsecă, ca în browser; recenzia 2.7c: altfel latura lipsă
  venea în px, iar scara „meet” micșora desenul de 3,78 ori). Cu `viewBox` și fără nicio lungime, laturile lui, în px.
  Fără `viewBox` și fără ambele lungimi, pagina nu are mărime: unitatea e 1 px, iar colțul stânga-jos al desenului (cutia
  lui exactă) stă în origine.
- **`viewBox`**: patru numere, cu lățimea și înălțimea pozitive; altfel se ignoră (cu avertisment). Maparea e cea din
  SVG 2 (§8.2), cu `preserveAspectRatio`: `none` scalează neuniform; altfel scara e `min` (`meet`, implicit) sau `max`
  (`slice`) și alinierea `xMin|xMid|xMax`, `yMin|yMid|yMax` (implicit `xMidYMid`). Decuparea (`overflow`) nu se aplică.
- **Unitățile din atributele formelor** (de exemplu `width="10mm"` pe un `rect`) trec în unități utilizator după CSS,
  96 px pe țol, oricare ar fi `pxPeTol`. Procentele de acolo sar forma (cu avertisment).
- Dacă maparea depinde de px (nicio latură absolută, o latură dată în px, sau fără `viewBox`), dialogul oferă alegerea lui
  `pxPeTol`.

**3. Transformările.** Atributul `transform`, cu gramatica SVG 1.1: `matrix`, `translate`, `scale`, `rotate` (cu centru
opțional), `skewX`, `skewY`, separate de spații sau virgule, compuse de la stânga la dreapta. Matricea unei forme în
milimetri e M = pagina ∘ strămoșii ∘ forma.
- O transformare cu o eroare de gramatică sare elementul și tot ce conține (cu avertisment).
- O matrice M singulară (|determinantul normat| ≤ 1e-12) sare forma: SVG nu o desenează.
- `transform` pe rădăcină se ignoră (cu avertisment); `transform` din CSS nu se citește.

**4. Elementele.** Arborele se parcurge în ordinea documentului, iterativ (oricât de adânc).
- **Containerele:** `g`, `a` și `switch`. Din `switch` intră doar primul copil-element SVG fără atributul `requiredExtensions`
  (Illustrator își învelește desenul într-un `switch`, lângă un `foreignObject` cu `requiredExtensions`) și cu
  `systemLanguage` potrivit: lipsă, sau o listă în care una din limbi e limba aplicației (`ro` / `en`) ori începe cu ea
  urmată de „-” (SVG 1.1; recenzia 2.7c: fișierele multilingve aveau altă variantă decât cea din browser).
  `requiredFeatures` nu se judecă (adevărat, ca în Chrome).
- **Formele:** `path`, `rect`, `circle`, `ellipse`, `line`, `polyline`, `polygon`.
- **Sărite, numărate în raport:** `text`, `use`, `image`, `foreignObject` și `svg` imbricat.
- **Sărite fără raport** (nu se desenează direct, sau nu sunt desen): `defs`, `symbol`, `clipPath`, `mask`, `marker`,
  `pattern`, gradientele, filtrele, `style`, `script`, `title`, `desc`, `metadata`, animațiile și orice alt element.
- **Ascunse:** `display: none` sare elementul și tot ce conține; `visibility: hidden` sau `collapse` se moștenește, iar un
  copil cu `visible` reapare. Se numără. Într-un subarbore ascuns, transformările nu se mai judecă: se numără doar formele
  (și elementul ascuns cu o transformare greșită e ascuns, nu „transformare invalidă”).
- **Stilurile** (din 2.7d; recenzia 2.7d: Illustrator pune `fill-rule: evenodd` și `fill: none` în clase, iar normalizarea
  `nonzero`, ADR 0036, le umplea găurile). Se citesc doar `display`, `visibility`, `fill-rule` și `fill`, din trei
  surse, în ordinea în care câștigă: atributul de prezentare, apoi regulile din `<style>` (după specificitate, la egalitate
  ultima), apoi declarațiile din `style` (ultima câștigă; `!important` se ignoră). Din `<style>` se citesc doar regulile cu
  selectori simpli: `element`, `.clasă`, `#id`, `*` și lipiți (`path.a.b`), separați prin virgulă; comentariile se sar.
  Specificitatea: id, apoi clase, apoi element. O regulă cu una din cele patru proprietăți al cărei selector nu e
  simplu (un combinator, un atribut, o pseudo-clasă, două id-uri), o regulă `@` (`@media`…) sau un `!important` dau avertismentul
  `stil` (o dată), iar regula nu se aplică (`!important` se aplică, dar ca o declarație obișnuită). Peste 10 000 de
  reguli, `<style>` nu se citește deloc (`stil`). **Bugetul potrivirilor:** fiecare regulă verificată pe un element
  costă 1 (regulile stau pe găleți: prima clasă, id-ul, elementul, `*`); peste 2·10⁷ pe fișier, importul e refuzat
  (`plafon`, detaliul `css`): nu se citește pe jumătate stilat.
- **Umplerea:** `fill` efectiv `none` (moștenit; `inherit` ia părintele; implicit plin) face din formă un desen de
  contur, nu o regiune: nu se normalizează (ADR 0036 §9), subcăile ei se citesc ca atare.
- **Geometria formelor** (SVG 2, cu atributele citite ca în Edge): `rect` cu `rx` / `ry` (unul lipsă îl ia pe celălalt;
  fiecare tăiat la jumătatea laturii; lățimea sau înălțimea ≤ 0 sare forma), pornit din (x + rx, y). La `rx` / `ry` (și ale
  lui `ellipse`), un atribut necitibil (și „auto” scris ca atribut, și un procent) e 0, iar unul negativ e lipsă (recenzia
  2.7c); regula procentelor de la §2 nu se aplică razelor; `circle` (r ≤ 0 sare forma) și `ellipse` (`rx` sau `ry`
  lipsă îl ia pe celălalt; 0 sare forma în tăcere; `r` negativ sau necitibil e `atribut-invalid`), pornite din (cx + rx, cy),
  în sensul unghiului crescător al spațiului SVG, ca
  două jumătăți; arcele cercului, ale elipsei și colțurile lui `rect` au centrul și unghiurile știute, deci nu trec prin
  F.6.5 (precizarea oracolului: din capetele rotunjite cx ± rx, rădăcina de la 180° amplifică rotunjirea la √ε);
  `polyline` / `polygon` cu `points` (o eroare sau un număr impar de coordonate: punctele dinaintea ei, cu avertisment);
  `line` e mereu deschisă, oricât de scurtă. Un atribut obligatoriu care nu se poate citi sare forma (cu avertisment).

**5. Datele căii** (`d`), cu gramatica SVG 1.1 (BNF) și tratarea erorilor din SVG 2:
- comenzile `M m Z z L l H h V v C c S s Q q T t A a`, cu repetarea implicită (după `M`, perechile sunt `L`); numerele
  `[+-]? (cifre)? (. cifre)? ([eE][+-]? cifre)?` (deci `.5.5` sunt două numere, `1-2` la fel); steagurile arcului sunt un
  singur caracter, `0` sau `1` (deci `a1 1 0 1120 20` e valid);
- prima comandă trebuie să fie `M` / `m`; la prima eroare, calea se păstrează până înainte de ea (cu avertisment);
- după `Z`, o comandă alta decât `M` pornește o subcale nouă din punctul de start al celei închise;
- `S` și `T` oglindesc punctul de control al comenzii dinainte doar dacă aceea a fost `C` / `S`, respectiv `Q` / `T`;
- `Q` și `T` devin cubice exact (T1): c1 = p0 + ⅔ (q − p0), c2 = p1 + ⅔ (q − p1);
- `A` după SVG 1.1, F.6.5 și F.6.6: o rază 0 dă o linie, capetele egale omit arcul, iar razele prea mici se măresc
  uniform cu √Λ. Cu Λ ≥ 1, arcul e exact o jumătate: centrul e mijlocul coardei, iar rădăcina din F.6.5 e 0, nu zgomotul
  rotunjirii (precizarea oracolului, 12.10: un semicerc ieșea împărțit în două, cu centrul mutat);
- între transformări, separatorul e opțional (`translate(1)scale(2)`, ca în browsere).

**6. Din unitățile formei în milimetri.** Liniile și punctele cubicelor trec prin M exact.
- **Arcul de cerc** (`rx` = `ry` după F.6.6, deci și cercul, colțurile rotunde ale lui `rect` cu `rx` = `ry`) sub o M
  care e o similitudine (la 1e-12 relativ la scara ei: sub scara 1, toleranța absolută ar lua o elipsă minusculă drept cerc;
  recenzia 2.7c) rămâne arc: capetele trec prin M, iar `bulge` = tan(Δθ / 4) · semn(det M), cu Δθ din F.6.5, în spațiul
  formei. Un arc de peste 180° se împarte în două jumătăți, cu mijlocul din centrul F.6.5 (unghiul t1 + Δθ/2, în spațiul
  formei, trecut prin M) și cu `bulge` = tan(Δθ / 8) · semn(det M) fiecare. Recenzia 2.7c: mijlocul socotit din coardă și
  bulge ieșea greșit aproape de 360° (coarda minusculă, tan(Δθ/4) uriaș: raza 58 mm în loc de 50). Un arc de cel mult o
  jumătate ale cărui capete s-au contopit în mm se omite.
- **Arcul eliptic** (`rx` ≠ `ry`, sau o M care nu e similitudine) devine cubice. Baleiajul parametric se împarte în
  n = ⌈|Δθ| / φ⌉ bucăți egale, fiecare cu cubica standard a cercului unitate (mânerul 4/3 · tan(φ / 4)), trecută prin
  harta afină a elipsei și prin M. Cubica standard se abate radial de la cercul unitate cu cel mult **1,82e-5 · φ⁶**, pentru
  φ ≤ π/2 (măsurat: 1,8142e-5 · φ⁶ la 90°, 1,8085e-5 · φ⁶ spre 0). Imaginea afină înmulțește distanța cu cel mult σ,
  cea mai mare valoare singulară a hărții, deci φ = min(π/2, (`TOLERANTA_IMPORT` / (1,82e-5 · σ))^(1/6)).
- **Arcul de cerc cu raza în milimetri peste 0,999 × 10 000** (`PLAFON.latura`; ADR 0034 §2 l-ar refuza), cu raza socotită
  din F.6.5 (raza × scara lui M), devine cubice, la fel, cu σ = raza. Marja de 0,1 % ține arcul departe de plafonul ușii
  documentului, care îl socotește din coardă și bulge.
- `TOLERANTA_IMPORT` = **1e-6 mm** = `TOLERANTA_PROIECT` / 1 000, în `src/geom/toleranta.ts`. Abaterea traseului față de
  curba din fișier: biarcele (≤ 0,99 × 0,001 mm, ADR 0033) plus importul (≤ 0,001 × 0,001 mm), deci tot sub toleranța
  proiectului.

**7. Subcăile devin căi** (ADR 0034).
- O subcale e **închisă** dacă se termină cu `Z`, sau dacă ultimul ei punct stă la cel mult `TOLERANTA_IMPORT` de primul
  (în milimetri). Un `M` singur nu e o subcale; `M … Z` fără niciun segment e una închisă, fără vârfuri (degenerată).
- **Degenerată** e o subcale închisă cu mai puțin de 2 vârfuri, sau doar din linii, toate pe o dreaptă (până la 1e-12 din
  mărimea ei): n-are arie, browserul n-o umple, iar CAM-ul ar refuza toată piesa (recenzia 2.7c). O buclă dintr-o singură
  cubică (o picătură desenată dintr-un nod) se împarte la t = 1/2 (de Casteljau) în două cubice, deci două vârfuri. Calea
  are vârfurile subcăii fără ultimul punct: ultimul segment ajunge în primul vârf. Un punct de control al ultimei cubice
  egal (exact) cu acel ultim punct (mânerul retras, `s… -1-1-1-1z` din Illustrator) se mută odată cu el în primul vârf
  (13.10, logoul AS Roma: rămânea la 1 ulp de vârf, cu o tangentă din zgomot, iar normalizarea refuza forma). Cu `Z` și
  un gol mai mare, se adaugă linia de închidere.
- Subcăile **deschise** (și `line`, și `polyline` care nu se închide) se sar, numărate: vin cu 2.3c.
- Se scot doar segmentele nule exact, judecate în coordonatele formei: linia cu capetele egale și cubica cu toate cele patru
  puncte egale. Restul geometriei
  nu se judecă la ușă (ADR 0034 §2).
- O cale degenerată se sare (numărată). Citirea unei subcăi se oprește la `PLAFON.varfuriCale` vârfuri, iar subcalea
  (închisă sau nu) se sare, numărată; plafonul se judecă după linia de închidere (recenzia 2.7c: 50 001 de vârfuri treceau
  de ușă și opreau tot importul). Cubicele unui arc eliptic se numără înainte să se facă: dacă nu mai încap (cu un loc
  păstrat pentru linia de închidere), subcalea se sare pe loc (un arc cât un continent ar cere milioane).
- **Plafonul de lucru:** citirea se oprește la **1 000 000** de vârfuri produse (`PLAFON_IMPORT.varfuriLucru`, și ale căilor
  sărite) și refuză (`plafon`); la fel, căile primite cu peste `PLAFON.varfuri` (200 000) de vârfuri: întâi pe intrare,
  înaintea normalizării `nonzero` (recenzia 2.7d: un fișier refuzat oricum nu mai plătește normalizarea), apoi pe ieșirea
  ei.
- O coordonată în milimetri peste `PLAFON.translatie` (de origine) refuză importul.

**8. Piesa.** Importul adaugă o piesă și o instanță a ei, într-un singur pas de anulare (o comandă `adauga`):
- piesa are numele fișierului (fără extensie, tăiat la `PLAFON.numeLungime`) și rădăcina un grup `g`, cu identitatea, cu
  câte un element `c1` … `cN` pe cale, în ordinea documentului. Numele elementului e `id`-ul formei SVG, dacă are;
- coordonatele elementelor sunt ale paginii minus colțul stânga-jos al cutiei exacte a desenului; instanța stă în acel
  colț, cu rotirea 0. Pe foaie, desenul ajunge unde era pe pagină;
- **latura** (ADR 0034 §7): adâncimea unei căi e numărul celorlalte căi care conțin primul ei vârf (`evenodd`, cu
  includerea exactă a clicului, ADR 0034 §5). Adâncimea pară → `exterior`, impară → `interior`. **Bugetul includerilor**
  (`PLAFON_IMPORT.includeri` = 2·10⁷): fiecare candidat vizitat costă 1, iar fiecare includere măsurată, câte vârfuri are
  calea; contururile suprapuse fac judecata pătratică (recenzia 2.7c: 50 000 de dreptunghiuri identice, 334 s cu fila
  blocată). Peste buget, importul e refuzat (`plafon`, detaliul `includeri`). Operațiile sunt două
  (`exterior`, `interior`, fiecare doar dacă are căi; peste `PLAFON.noduriOperatie` căi, încă una, `exterior-2` …), cu
  valorile operației implicite a dreptunghiului (profil, 3 mm într-o trecere, urcare) și freza foii, dacă e una singură;
- **regula `nonzero`** (implicita SVG): din 2.7d, fiecare formă cu regula efectivă `nonzero` trece, cu toate subcăile ei,
  prin normalizarea exactă (ADR 0036) înainte să devină căi; neschimbată, rămâne exact ca în 2.7c. La refuz, se citește
  `evenodd`, ca în 2.7c, numărată (§10);
- documentul de după import trece de ușa documentului (`incarca`), cu plafoanele lui (ADR 0024, ADR 0034). Altfel importul
  e refuzat, cu motivul ușii, iar documentul rămâne neschimbat.

**9. Dialogul.** Fișierul se alege cu „Importă SVG…”. Ușa rulează pe firul principal, încărcată la cerere (nu intră în
pachetul de pornire). Dialogul arată, înainte de import: numele, mărimea desenului în mm, câte căi (exterioare /
interioare), avertismentele numărate și, când contează, alegerea lui `pxPeTol`. „Importă” adaugă piesa și o selectează.

**10. Raportul** numără, fiecare cu textul lui (en + ro). Se numără doar ce stă în contextul de desen (nu în `defs`,
`symbol`, `clipPath`, `mask`, `marker`, `pattern`, nici în copiii nealeși ai unui `switch`):
- `deschise`: subcăile deschise (o `line` e una, o `polyline` care nu se închide e una);
- `degenerate`: subcăile închise cu mai puțin de 2 vârfuri; `prea-mari`: cele cu peste `PLAFON.varfuriCale` vârfuri;
- `sarit-text`, `sarit-use`, `sarit-image`, `sarit-foreignObject`, `sarit-svg`: elementele sărite, dacă nu sunt ascunse cu
  `display: none` (conținutul lor nu se mai numără). `visibility: hidden` nu le scoate din raport: un copil vizibil (un
  `tspan`) reapare, iar conținutul lor nu se citește (recenzia 2.7c: precizarea oracolului era invers, și ar fi ascuns din
  raport un text care se vede);
- `ascunse`: formele (cele șapte) ascunse, oriunde în subarborele ascuns;
- `eroare-date`: formele `path` / `polyline` / `polygon` citite până la o eroare;
- `atribut-invalid`: formele sărite pentru un atribut care nu se poate citi, negativ sau cu o unitate nesuportată
  (o lățime, o rază 0 sau lipsă sare forma în tăcere, ca în SVG);
- `transformare-invalida`: elementele cu `transform` greșit (subarborele lor nu se mai numără); `singulara`: formele sub
  o matrice singulară;
- `arce-eliptice`, `arce-plate`: arcele scrise ca cubice (§6), iar `cubice-din-arce`: câte cubice au ieșit din ele. Se
  numără când se scriu, chiar dacă subcalea lor e sărită apoi (deschisă, degenerată); dintr-o subcale prea mare, doar cele
  scrise înainte de oprire;
- `nonzero-normalizate`: formele `nonzero` pe care normalizarea (ADR 0036) le-a schimbat; `nonzero-refuzate`: cele pe care
  le-a refuzat, citite `evenodd`. (În 2.7c, contorul `nonzero` număra perechile de subcăi în același sens, una în alta: o
  euristică pe care suprapunerile, dublurile și buclele duble o ocoleau; ADR 0036 l-a înlocuit.) Căile normalizate trec
  din nou prin plafonul căii (§7);
- o singură dată (0 sau 1): `pagina-fara-marime`, `viewbox-invalid`, `transformare-radacina`, `stil` (o regulă CSS care
  nu s-a citit, §4; în 2.7c, orice `<style>`).

Ordinea căilor e ordinea documentului, apoi a subcăilor. Un fișier fără nicio cale închisă e refuzat, cu raportul.

Steagul Illustrator: un comentariu din primii 16 KiB conține „Adobe Illustrator”. Un prim vârf aflat chiar pe conturul
altei căi (§8) are latura pe care o dă includerea, nedefinită pe contur.

**Refuzurile** au coduri, traduse de interfață, judecate în ordinea: `plafon` (vârfurile, apoi includerile), `departe`,
`gol`: `octeti`, `svgz`, `entitati`, `parsare`, `radacina` (rădăcina nu e `svg`),
`gol` (nicio cale închisă), `departe` (o coordonată peste `PLAFON.translatie`), `plafon` (plafonul de lucru sau al
vârfurilor, §7, al includerilor, §8, sau al potrivirilor CSS, §4, detaliul `css`). Interfața adaugă `neincarcat`: codul ușii nu s-a putut aduce (o publicare nouă a
schimbat fișierele, rețeaua lipsește); dialogul spune asta și oferă reîncărcarea, nu „fișierul nu e un SVG” (recenzia
2.7c).

## Ce verifică oracolul

O sesiune independentă scrie, din acest ADR, un cititor SVG propriu (`test/oracles/`, fără importuri din `src/`, cu
`@xmldom/xmldom` ca parser) și un corpus de fișiere scrise de mână, cu valorile pe hârtie:
- unitățile, pagina, `viewBox` cu fiecare `preserveAspectRatio`, `pxPeTol` 96 / 72;
- transformările (și oglindirea, înclinarea, compunerea pe niveluri), cu sensul arcelor;
- fiecare formă și regulile ei (SVG 2), gramatica datelor căii (numerele lipite, steagurile, repetarea, `Z` urmat de
  altceva, `S` / `T`, erorile), arcele la 180° și peste, razele corectate;
- distanța în ambele sensuri dintre căile ușii și geometria exactă din fișier: cel mult 1e-9 × mărimea desenului pentru
  linii și cubice, 1e-7 × raza pentru arcele de cerc (F.6.5 e prost condiționată lângă 180°: Λ aproape de 1 dă √ε),
  cel mult `TOLERANTA_IMPORT` pentru arcele eliptice și plate;
- închiderea, segmentele nule, ascunsele, `switch`, latura din imbricare, perechile `nonzero`, avertismentele numărate;
- refuzurile: octeții, `.svgz`, entitățile, parsarea, plafoanele documentului.

Cap-coadă, în Edge (e2e): butonul, dialogul, piesa în listă și pe pânză, exportul G-code al logoului de 80 mm.

## Recenzia (12.10.2026)

Două lentile (suprafața de atac și robustețea; semantica SVG, geometria și CAM-ul după import), fiecare constatare
reprodusă de un verificator independent (2,2 M tokeni). Pe lângă precizările de mai sus: dialogul (focusul pierdut după
alegerea px-ului, Escape), o publicare nouă în timpul unei sesiuni (bucata ușii adusă în fundal, ca dialogurile).

## Limitele

- **Logourile de ecran nu se taie așa cum vin** (măsurat pe fișiere reale, 12.10: două embleme de club de pe Wikipedia,
  logoul Presto, iconițe): sunt straturi pictate unul peste altul, iar contururile lor se ating sau se suprapun. Ușa le
  citește exact (suprapuse peste randarea originalului, se potrivesc), dar regiunea păstrată (ADR 0026) refuză exportul,
  cu motivul: nu se știe ce material rămâne. Ce se taie se alege pe contur în panoul de proprietăți (2.8); un desen făcut
  pentru tăiere (contururi care nu se ating, ca logoul plăcii 2) trece.
- **Timpul** (Node, aceeași mașină): ușa ≤ 9 ms și imbricarea ≤ 9 ms pe 35 kB (103 căi, 1 316 cubice); CAM-ul întreg
  ~0,5 s pe același fișier (~0,4 ms pe cubică). În bugetul firului principal; un worker nu e încă necesar.

- `use`, `text`, `image`, `svg` imbricat, selectorii CSS compuși și decuparea nu se citesc: sunt numărate în raport. `use` și
  `svg` imbricat se pot adăuga fără să schimbe contractul (încă un container cu matricea lui).
- 1 px = 1/96 sau 1/72 țol, la alegere; alte rezoluții (90 dpi, Inkscape vechi) cer scalarea după import, care vine cu
  desenul (etapa 6).
- Regula `nonzero`: normalizată din 2.7d (ADR 0036); o formă refuzată acolo se taie după `evenodd`, numărată.
- Latura se alege pe toată piesa. Schimbarea ei pe o singură cale cere panoul de proprietăți (2.8).
- Ușa rulează pe firul principal: la 16 MiB, ~1–2 s (măsurat în 2.7c).

## Ce am respins

- **`getCTM()` pe un SVG atașat documentului:** un arbore atașat e viu (conținutul lui poate rula și cere resurse), iar
  matricea depinde de stilurile aplicației.
- **`svgpath`** (sonda s2): transformă arcele recalculând elipsa, deci pierde decizia arc / cubice pe care o ia ușa; iar
  după o oglindire scrie steagul ca text (`'0'` e adevărat în JS). Gramatica căii are ~150 de linii, scrise aici.
- **Câte o formă pe element** (`rect`, `circle`): respinsă în ADR 0034. Cercul devine o cale din două arce.
- **Elipsa ca cerc sub o matrice neuniformă** (T2): ușa documentului n-o primește încă (ADR 0034 §2), iar CAM-ul n-ar ști
  s-o taie. Când va ști, `ellipse` și cercul sub o matrice neuniformă pot rămâne exacte, cu un ADR nou.
- **Închiderea oricărei subcăi** (cum o umple browserul): o linie care nu se închide nu e un contur de tăiat; vine cu
  2.3c, pe o parte.
- **Lipirea golurilor până la toleranța proiectului:** ar consuma tot bugetul (ADR 0033) înaintea biarcelor.

**Se redeschide dacă:** fișierele reale cer alte rezoluții px, `use` sau text, sau dacă ușa trece de buget pe firul
principal.
