
# ADR 0037: Contururile deschise. Calea deschisă, tăiată pe linie și pe o parte (documentul v10)

**Starea:** acceptat pe 13.10.2026, în felia 2.3c. Designul a pornit de la trei propuneri independente (minimal, atelier,
risc) și o sondă cu cod a offsetului deschis; judecătorul a reverificat afirmațiile pe cod, la `ed5cd65`. **Deciziile
owner-ului** (13.10, „ok, dar, taietura care desparte foaia ar trebui pusa intentionat de utilizator, nu automat”): partea =
partea frezei (§3); gravura de 1 mm la import (§11); închiderea formelor umplute (§11); avertisment pentru tăietura pe linie
prin foaie într-o piesă (§10); **despărțirea foii o marchează utilizatorul, aplicația n-o ghicește** (§8).

**Intră în:** etapa 2.

**Amendează:**
- ADR 0025 (ordinea);
- ADR 0026 (regiunea, §1, §6);
- ADR 0027 (sensul);
- ADR 0029 §5 (invarianta 11);
- ADR 0034 §1–§3 (forma „cale”);
- ADR 0035 §7, §8, §10 (ușa SVG).

Nimic de aici nu se schimbă fără un ADR nou.

## Problema

- Documentul n-are contururi deschise: calea are mereu `inchis: true` (ADR 0034 §1).
- Ușa SVG sare subcăile deschise, orice `line` și `polyline`-urile care nu se închid. Le numără și spune că „vin cu 2.3c” (ADR 0035 §7).
- O gravură pe o linie nu ajunge la mașină. Nici o tăietură pe o parte a unei linii: un perete drept, o margine de foaie, o fâșie.
- **În ediția întâi:**
  - orice formă deschisă se tăia pe linie, fără offset;
  - o formă închisă fără Z era luată drept deschisă: un pătrat de 40 mm a ieșit cu 6 mm mai mic, cu ultima latură netăiată;
  - trecerile pe deschis replonjau la capătul greșit, până la reparația cu ridicare și întoarcere.

## Ce am măsurat (13.10)

**1. Poarta de azi pică orice tăietură deschisă, chiar și pe linie.**
- Invarianta 11, în forma fără rampă (`formaFaraRampa` din `test/oracles/rampa.ts`), cere ca fiecare trecere să se întoarcă în punctul plonjării. Ea se aplică și pe `pe-linie`.
- Eticheta (`ETICHETA` din `test/oracles/regiune.ts`) cunoaște doar `exterior|interior|pe-linie`.

**2. Un defect pe `main`, pe drumul „pe linie”.** Reprodus din document și din ușa SVG.
- **Intrarea:** un arc cu coarda 1e-11 mm și bulge 1e-13, adică raza 25 mm. Ușa documentului îl primește. Ușa SVG îl produce din `A25 25 0 0 1 50 0.00000000001`.
- **Calea defectului:**
  - pe `pe-linie`, `taieBucla` (`src/cam/traseu.ts`) scrie arcul brut;
  - `baleiajArc` (`src/ir/ir.ts`) ia un baleiaj ≤ 1e-12 rad drept cerc întreg.
- **Rezultatul:** G-code-ul conține `G3 X60.013 Y60.000 I-24.993` și `G3 X110.000 Y60.000 I24.994`, adică un cerc Ø50 tăiat prin piesă.
- **De ce nu se vede:** poarta nu-l prinde, fiindcă pe linie nu judecă nimic. Pe exterior sau interior defectul nu apare, pentru că offsetul curăță arcul plat într-o linie.

**3. Offsetul deschis al lui cavalier: `plineOpen(v).parallelOffset(d)`.**
- **Semnul:** d > 0 înseamnă stânga mersului. Verificat: linia (10,50)→(110,50) cu d = +3 dă y = 53.
- **Corpusul:** 40 de contururi deschise × 3 raze × 2 părți = 240 de offseturi, măsurate independent:
  - 0 excepții;
  - 0 puncte pe partea greșită;
  - 0 puncte în capacele capetelor;
  - toate bucățile în sensul desenului;
  - pe formele fără zgomot, |d − r| ≤ 1,2e-7 mm.
- **Capetele:** traseul pornește exact pe normala capătului și nu are capace.
- **23 de offseturi goale, fără eroare.** Acolo freza chiar nu încape: unghiul de 5°, arcul cu raza 1 mm, agrafele înguste.
- **Defectul.** Apare pe poliliniile fine: două linii vecine cu L1·L2·sin θ < 1e-5 mm². Cauza: testul de paralelism nenormalizat din `core/lineLineIntersect.ts` și `core/mathUtils.ts`. Efectele:
  - offsetul dispare fără eroare. Exemplu: arcul R5 de 300° din coarde de 0,02 mm, decalat 1,5 mm spre exterior, dă 0 bucăți; pe hârtie ar avea 34,03 mm;
  - sau capătă cocoașe de până la 0,012 mm.
- **Ce prinde defectul:** doar acoperirea. Toate celelalte verificări trec pe 0 bucăți.
- **Copia cu cele două teste normalizate** (în afara repo-ului): fiecare caz fin dă o bucată, cu acoperire 100 %; restul corpusului rămâne la 1e-8 mm.

**4. Fișierele reale.** Pe cinci SVG-uri de pe disc, ușa de azi sare 11 subcăi „deschise”.
- **10 sunt forme umplute:** 8 în logoul VfB, 2 în logoul Presto.
  - golul capăt–start e de 5e-5 … 6e-4 mm și vine din rotunjirea coordonatelor relative;
  - browserul le umple ca regiuni.
- **Singura linie reală** e valul de 150 mm, cu `fill: none`, din stratul GRAVARE al lui `CNC-referinta.svg`.
- Logoul AS Roma și logoul plăcii 2 n-au nicio subcale deschisă.
- **Logoul VfB, închis cu linii de închidere:**
  - 2 subcăi sunt praf (diagonala ~6e-5 mm);
  - 1 formă e refuzată de offset cu „se autointersectează” (o încrucișare minusculă la închidere);
  - restul trec de gărzi.

**5. Locurile care scriu `inchis: true` de mână:**
- `src/model/forme.ts` (`conturElement`);
- `src/io/piesa.ts` (cutia, forma, operația);
- `src/io/imbricare.ts`;
- `src/ui/actiuniImportCalcul.ts`.

Primul e periculos: o cale deschisă citită ca închisă primește coarda de închidere, iar freza o taie prin material.

**6. Rampa și parcurgerea desfășurată** (`src/cam/parcurgere.ts`, cu `seg[k % n]`; `src/cam/rampa.ts`). După ultimul vârf, ele continuă cu segmentul 0. Pe o cale deschisă ar ieși un G1 drept, la adâncime, de la capăt spre începutul căii.

## Decizia

**Documentul.** Calea primește `inchis: false` (documentul v10). Operația de profil primește două laturi noi, `stanga` și `dreapta`, doar pentru căile deschise.

**Cum se taie o cale deschisă:**
- **pe linie:** centrul frezei merge pe cale;
- **pe o parte:** centrul merge pe offsetul deschis la R, calculat printr-o fațadă nouă a lui cavalier. Ieșirea fațadei se verifică singură, inclusiv prin acoperire.

**Regiunea și refuzurile:**
- regiunea păstrată K rămâne aceeași;
- pereții tăieturilor pe o parte devin margini protejate;
- urechile, rampa, intrările și degajările pe căile deschise se refuză cu motiv.

**Ușa SVG** aduce liniile ca căi deschise și închide subcăile umplute, cum face browserul.

**Ordinea lucrului:**
- întâi se repară drumul „pe linie” (§1);
- poarta se amendează înainte ca o cale deschisă să ajungă pe instanța de test.

## Contractul

**1. Pe linie, freza stă pe linie, pe orice contur.** Repară defectul de la „Ce am măsurat”, punctul 2.
- **Regula:** în IR, un segment de arc cu |bulge| < 1e-6 (`BULGE_MINIM`, același ca la offset) sau mai scurt de 1e-6 mm pe curbă se scrie ca linie (`taiere`). Asta oriunde traseul scrie un segment al conturului: `taieBucla` și, pe viitor, orice emitent.
- **Abaterea:** cel mult 2e-8 mm. Atât e săgeata unui arc cu raza ≤ 10 000 mm și bulge sub 1e-6.
- **Programele existente:** postul scria deja G1 pe orice arc cu baleiajul sub 1e-4 rad. Deci programele rămân aceleași, octet cu octet, în afara arcelor pe care postul le citea drept cerc întreg. Se verifică pe corpusul amprentelor.
- Poarta primește invarianta 14 (i) (§13).

**2. Documentul v10** (`schema: 10`).

*Forma:* `{ tip: 'cale', inchis: boolean, varfuri }`.
- O cale deschisă are n ≥ 2 vârfuri și n − 1 segmente (ADR 0001).
- Segmentul ultimului vârf trebuie să fie `{ tip: 'L' }`; altfel ușa refuză cu motiv. Un segment ignorat ar fi o dată ascunsă: o versiune viitoare, sau o închidere, l-ar face real fără ca cineva să-l vadă.
- Verificările arcului (capetele diferite, raza ≤ 10 000 mm) se fac doar pe cele n − 1 segmente reale. Azi vecinul se ia cu `(i + 1) % n`, ceea ce închide calea.
- Câmpurile necunoscute se păstrează, ca peste tot.

*Latura:* `'exterior' | 'interior' | 'pe-linie' | 'stanga' | 'dreapta'`.
- Id-urile sunt ASCII, ca `opozitie`. În interfață apar „stânga” și „dreapta”.
- *Despărțirea* (decizia owner-ului, §8): câmpul opțional `despartire: true` al operației de profil. Lipsă = `false`.
  Are sens doar pe o cale deschisă tăiată prin toată foaia; altfel CAM-ul îl refuză, cu motiv (§8). Un document v9 nu-l
  are, deci migrarea rămâne doar schimbarea numărului.

*Plafoanele* rămân aceleași. Vârfurile căilor deschise se numără la fel, cu tot cu vârful final.

*Ce nu judecă ușa* (ADR 0034 §2):
- geometria: lungimea, autointersecția, capetele care coincid;
- potrivirea laturii cu `inchis`.

Le refuză CAM-ul, cu motiv (§4, §9), iar dialogul le oglindește.

*Migrarea v9 → v10* schimbă doar numărul schemei.
- Un document v9 e un document v10 valid. Programul lui rămâne același, octet cu octet (după §1).
- Un document marcat v9 care conține `inchis: false` sau latura `stanga` / `dreapta` e refuzat: „nu e un document v9 valid”.
- O versiune v9 refuză un document v10 la ușă („scris de o versiune mai nouă”). Deci nu poate tăia o cale deschisă închizând-o.

*Codul care trebuie să citească `inchis` real:* cele patru locuri de la „Ce am măsurat”, punctul 5. Restul lucrează deja pe deschise:
- desenul pe pânză (`desen.ts` scrie Z doar pe căile închise);
- distanța și `inRegiune` (sar căile deschise);
- biarcele;
- matricea și cutia (merg pe `numarSegmente`).

*Lista de vectori:* „cale deschisă L × H, n segmente, la X x, Y y”.

**3. Partea** (decizia owner-ului, 13.10). „Stânga / dreapta” e partea pe care merge FREZA, privind în sensul desenului, de
la vârful 0 la ultimul, ca G41 / G42 și ca Left / Right din ArtCAM și Vectric. Peretele, adică linia desenată, rămâne
exact; materialul păstrat e pe partea cealaltă.
- Partea se socotește în coordonatele elementului, ca exterior / interior.
- Sub o matrice în lume cu determinantul negativ (o oglindire), partea pe foaie se inversează odată cu forma: `parteaLume = latura XOR (det < 0)`. Așa, o pereche oglindită își păstrează peretele pe forma ei.
- Azi nicio acțiune nu face oglindiri (importul scrie matricea identitate), dar documentul le admite.

**4. Pe linie, pe o cale deschisă.**
- **Traseul** e calea în lume:
  - cu cubicele ca biarce (ADR 0034 §6) și cu regula de la §1;
  - pornește din vârful 0 și merge în sensul desenului;
  - sensul de tăiere nu schimbă nimic (ADR 0027 §3).
- **Refuz, cu motiv:** mai puțin de 2 vârfuri distincte, sau lungimea sub `REZOLUTIE` (0,01 mm). Motivul: „ar fi o găurire, nu o linie”.
- **Autointersecția e permisă:** freza își traversează propriul canal.
- **La mașină:**
  - rezultă un canal lat cât D, centrat pe linie;
  - fiecare capăt al canalului e un semicerc de rază R, centrat în capătul liniei. Deci canalul e cu D mai lung decât linia: o linie de 100 mm, tăiată cu Ø6, dă un canal de 106 mm;
  - un capăt pus pe marginea foii iese din foaie cu R. Exportul cere atunci confirmarea de la 1.10.

**5. Offsetul deschis.** E fațada `offsetDeschis(contur, distanta)`, în `src/geom/offset.ts`, lângă `offsetInchis`, prin aceeași fațadă cavalier. Contractul e scris ca cel de la 2.1 (versiunea 1), pentru oracol.

*Ce întoarce:* `{ ok: true, bucati, neatins }` sau `{ ok: false, motiv }`, niciodată o excepție.
- `distanta` > 0 înseamnă stânga mersului, iar < 0 dreapta, în coordonatele primite (în lume).
- |d| < 0,005 mm e refuzat (sub rezoluție).

*Intrarea:*
- e deschisă, fără cubice (întâi biarcele: `conturFaraCubice` știe căile deschise) și cu coordonate finite;
- **curățarea**, fără nicio legătură peste capăt:
  - arcele cu |bulge| < 1e-6 devin linii;
  - arcele de peste 180° se împart în două jumătăți;
  - segmentele mai scurte de 1e-6 mm pe curbă se unesc, fără perechea ultim–prim;
  - capetele nu se mută: un segment scurt de la capăt pierde vârful dinspre interior;
  - vârfurile de pe o latură dreaptă se scot doar din interior;
- **refuzul**, cu motiv:
  - mai puțin de 2 vârfuri distincte;
  - lungimea sub 0,01 mm;
  - o cale care se atinge singură, inclusiv cu capetele în același punct sau pe altă parte a căii. Motivul: „după încrucișare partea nu mai e definită: alege pe linie”;
- **contactul fals** dintre două segmente vecine la o joncțiune tangentă se iartă ca la închis (ADR 0034, precizarea recenziei), fără perechea ultim–prim.

*Ieșirea se verifică singură:*
- **Forma bucăților:** fiecare bucată e deschisă, finită, are cel puțin 2 vârfuri și nicio cubică. Bucățile se ordonează după poziția lor de-a lungul căii.
- **Distanța:** fiecare vârf și fiecare mijloc de segment stă la |d| ± 0,002 mm de cale.
- **Partea:**
  - când cel mai apropiat punct al căii e în interiorul unui segment, semnul produsului vectorial e cel cerut;
  - când cel mai apropiat punct e un capăt, punctul nu stă strict pe partea păstrată a tangentei din capăt și nici în capacul capătului (piciorul cade în capăt, dar nu perpendicular). Traseul nu ocolește capătul și nu se prelungește dincolo de normala lui.
- **Atingerile:** nicio bucată nu se atinge pe ea însăși și nici pe alta. Excepția: la lățimea exact 2R (±1e-4 mm), un traseu dus-întors pe aceeași linie (o canelură cât freza) se acceptă.
- **Acoperirea** (prinde dispariția de la „Ce am măsurat”, punctul 3):
  - se ia fiecare punct ideal p + d·n(p) al căii, pe segmente și pe evantaiele colțurilor convexe dinspre sculă, eșantionat la cel mult 0,05 mm;
  - un punct ideal e **valid** dacă nicio altă parte a căii nu stă mai aproape de el decât |d| − 1e-5 mm;
  - fiecare punct ideal valid trebuie să stea la cel mult 0,002 mm de traseu.
- **La o verificare picată:** încă o încercare cu |d| + 1e-4 mm, apoi refuz.

*Refuzurile ieșirii:*
- zero bucăți și niciun punct ideal valid: „scula nu încape pe partea cerută”;
- acoperirea picată, inclusiv zero bucăți când există puncte ideale valide: „offsetul a eșuat lângă (x, y)”. Niciodată „nu încape”: pe poliliniile fine, golul vine din defectul lui cavalier, nu din sculă.

*`neatins`:* porțiunile căii ale căror puncte ideale nu sunt valide, adică peretele la care freza nu ajunge, cu lungimea și locul. Le folosește avertismentul de la §10.

*Precizările 2.3c-4 (15.10, la implementare; oracolul le ia ca parte a contractului):*
- **Bucata care se închide pe ea însăși.** Într-o cameră cu gura mai îngustă decât D (un canal cu o strangulare, scula
  înăuntru), freza ocolește camera și se întoarce în start: bucata are capătul în start. Atingerea dintre primul și
  ultimul ei segment, chiar în start, nu e o atingere (ca la un contur închis). Orice altă atingere rămâne refuzată.
- **Picioarele la egalitate.** Un punct al traseului poate fi la fel de aproape (în 1e-6 mm) de mai multe locuri ale
  căii: de exemplu, startul unei bucăți pe un zig-zag dens e intersecția cercului din jurul startului căii cu cercul din
  jurul primului vârf. Partea se judecă atunci față de fiecare picior, iar punctul e corect dacă e corect față de unul.
  Judecat doar față de capăt, punctul ar cădea în capac, deci un traseu bun ar fi fost refuzat (văzut la R3 pe zig-zag-ul
  cu pasul 0,5).
- **Forma lui `neatins`:** `{ de, pana, lungime, la }`. `de` și `pana` sunt pozițiile pe cale (mm pe curbă, de la vârful 0),
  iar `la` e punctul căii din mijlocul porțiunii. Porțiunile vecine peste un vârf se unesc: cârligul dă o singură porțiune
  de 14,828 mm. Marginile poartă marja de validitate (|d| − 1e-5): se mută cu ~1e-5 mm, iar pe o pană îngustă cu
  1e-5 / sin θ (V-ul de 10°: 1,2e-4 mm în total).
- **Colțurile concave dinspre sculă intră în `neatins`:** R · cot(θ / 2) pe fiecare latură (la 90°, câte R). E adevărat
  fizic (colțul rămâne rotunjit cu R, §6), dar pe un zig-zag tăiat pe partea concavă dă câte o porțiune la fiecare dinte
  (12 799 la 25 600 de segmente). **De hotărât la 2.3c-5:** cum le arată avertismentul de la §10 (grupate, sau doar
  porțiunile mai lungi decât colțul), fără să schimbe `neatins`.
- **Timpul:** pe zig-zag-ul de 25 600 de segmente, cu R3, 2,4–4,9 s cu tot cu verificări (în banda de 4–8 s din „Limitele”).

**6. Tăietura pe o parte: ce face freza.**
- **Traseul:** centrul merge pe offsetul la R, pe partea sculei. Peretele rămâne exact pe linie; materialul păstrat e dincolo de el.
- **Capetele:**
  - centrul pornește și se oprește pe normala capătului;
  - discul e tangent la prelungirea liniei, deci peretele se termină exact în capăt, cu muchia vie;
  - pe partea sculei, canalul trece de capăt cu un semicerc de rază R. Dincolo de capăt, partea păstrată rămâne neatinsă;
  - o linie trasă până într-o piesă intră în ea cu R, deci e refuzată (§10). O linie trasă până la marginea foii iese din foaie cu R (confirmarea de la 1.10);
  - prelungirea și scurtarea capetelor nu se oferă.
- **Colțurile convexe dinspre sculă:** centrul se rotește în jurul vârfului pe un arc de rază R (G2 / G3), iar colțul păstrat rămâne viu.
- **Colțurile concave dinspre sculă:** rămâne material în colț, deci colțul păstrat iese rotunjit cu R, ca la închis fără degajări. La 90° cu Ø6, rămân 9 − 9π/4 ≈ 1,93 mm².
- **Partea sculei mai îngustă decât D:** freza nu ajunge acolo (bucata se oprește), iar peretele rămâne netăiat pe porțiunea aceea, cu avertisment (§10). Dacă freza nu încape nicăieri, exportul e refuzat.
- **Arcele** rămân arce.
- **Sensul** (ADR 0027, axul M3: la urcare, materialul păstrat stă în dreapta mersului):

| parteaLume | urcare | opoziție |
|---|---|---|
| stânga | ca desenul | invers |
| dreapta | invers | ca desenul |

- **Cum se aplică sensul:** bucățile ies din offset în sensul desenului. Fiecare bucată se inversează când (parteaLume = stânga) ≠ (sens = urcare), iar ordinea bucăților se inversează odată cu ele. Pe linie, sensul nu contează.
- **Proba convenției:** modelul așchiei (`test/unit/cam.sens.fizic.test.ts`), nu tabelul copiat.

**7. Trecerile pe o cale deschisă** (pe linie și pe o parte). Adâncimile sunt cele de azi (`adancimiTreceri`). Pentru fiecare trecere k, pe fiecare bucată, în ordine:
1. G0 la Z-ul sigur, apoi G0 deasupra startului bucății;
2. G1 până la −d_k, cu avansul de plonjare: o plonjare verticală. Trecerea k − 1 a pornit din același punct, deci plonjarea scoate cel mult pasul;
3. bucata, cu avansul de tăiere, până la capătul ei;
4. G0 la Z-ul sigur.

Toate trecerile pornesc din același capăt.

**Fără zig-zag (dus-întors):**
- pe o parte, fiecare a doua trecere ar tăia peretele în sensul celălalt;
- pe linie, zig-zag-ul ar cere amendarea ADR 0027 §3 și o formă nouă în poartă.

Plonjarea verticală lasă o urmă pe capătul peretelui (intrările se refuză, §9).

**8. Ordinea** (amendează ADR 0025 și `taieturiFoaie`). Decizia owner-ului (13.10): **tăietura care desparte foaia o pune
utilizatorul, intenționat**; aplicația nu clasifică singură o tăietură drept despărțire.
0. interioarele;
1. tăieturile pe linie (închise și deschise) și tăieturile deschise nemarcate (o fantă în piesă se taie cât piesa e încă
   prinsă);
2. exterioarele;
3. **despărțirile**: tăieturile deschise marcate de utilizator cu `despartire: true` (§2).

În aceeași clasă, ordinea de azi.

- **Marcajul se judecă, nu se ghicește:** `despartire: true` pe o cale închisă, pe o adâncime mai mică decât grosimea
  foii, sau cu discul frezei intrând într-o piesă (în K) e refuzat, cu motiv.
- **O tăietură deschisă prin foaie, nemarcată, care ajunge la marginea foii** (un capăt la cel mult R + 1 mm de conturul
  foii, sau în afara ei) poate despărți foaia: exportul o refuză, cu motivul „X: tăietura deschisă prin foaie ajunge la
  marginea foii și o poate despărți; marcheaz-o «despărțire» (se taie la urmă) sau micșorează adâncimea”. Aplicația nu
  hotărăște în locul omului; doar îi cere să hotărască. *(Refuzul, nu avertismentul: confirmat de owner pe 13.10, „ok” la
  recomandare.)*
- Rețelele de linii care închid o bucată fără să atingă marginea foii nu se analizează (Limitele).

De ce: o linie prin foaie care desparte scheletul înaintea decupării lasă liberă o bucată de foaie cu piese încă netăiate. Acele piese se pot mișca sub freză.

**9. Ce se refuză, cu motiv.** Refuzurile sunt în `job.ts`, înaintea traseului. Dialogul oprește coloanele, cu motivul în titlu, în en și ro.
- **`exterior` / `interior` pe o cale deschisă:** „profilul exterior / interior cere un contur închis: alege pe linie, stânga sau dreapta”. Nu se degradează tăcut pe linie, ca în ediția întâi.
- **`stanga` / `dreapta` pe un contur închis:** „alege exterior sau interior”. Maparea după orientare ar ocoli inelele regiunii.
- **`stanga` și `dreapta` pe același element:** nu se știe ce parte se păstrează (analogul ADR 0026 §1).
- **Pe o operație care are cel puțin un nod deschis**, urechile, rampa, intrările și degajările, cu motivul „pe o cale deschisă vin mai târziu”:
  - **rampa:** parcurgerea desfășurată ar continua de la capăt spre segmentul 0 (G1 prin material, „Ce am măsurat”, punctul 6). Pe o cale deschisă nu există nici tura care re-acoperă rampa;
  - **urechile:** formula Z(s) ar merge pe [0, P], dar invarianta 10 e scrisă pe bucle și n-are poartă. O fâșie despărțită rămâne liberă;
  - **intrările:** candidații din ADR 0030 stau pe o buclă, iar trecerea deschisă nu se întoarce în p₀. Pe linie sunt refuzate deja;
  - **degajările:** condițiile din ADR 0032 §5 sunt scrise pe bucle. Pe linie sunt refuzate deja.
- **Calea deschisă degenerată** (§4).

**Ce se permite:**
- sensul (doar pe o parte);
- adâncimea și pasul;
- supracursa;
- mai multe operații pe aceeași cale: pe linie și pe o parte, cum se poate azi exterior împreună cu pe linie;
- ieșirea din foaie, cu confirmare.

**10. Regiunea păstrată** (amendează ADR 0026).

*K nu se schimbă.* O cale deschisă nu e inel, deci materialul păstrat de un perete nu intră în K.

*Pereții.* Fiecare cale deschisă cu o operație `stanga` / `dreapta` dă un perete. Peretele are conturul de tăiat al căii, în lume (cu biarcele, ADR 0034 §6), și partea sculei (§3).

*`verificaTaietura`:*
- **`pe-linie`:** nu se judecă (ADR 0026 §6).
- **`exterior` / `interior`:** ca azi, dar marginile includ și pereții. Profilul unei piese nu are voie să atingă peretele unei tăieturi pe o parte.
- **`stanga` / `dreapta`:**
  - p₀ ∉ K;
  - discul stă la cel puțin max(R − ε, 1e-6) de marginile lui K și de toți pereții, inclusiv de al său;
  - partea față de propriul perete se judecă ca la §5, fără ocolirea capătului.
- **Motivele** încep cu `regiunea păstrată:`, de exemplu „tăietura lui X intră în piesa Y cu … (lângă …)” sau „tăietura lui X atinge peretele lui Z (lângă …)”.

*Ce înseamnă fizic.* Un perete promite muchia lui: linia desenată. Se refuză deci:
- două linii tăiate pe o parte care se încrucișează în X;
- un canal mai îngust de 2R între două linii, cu sculele înăuntru;
- colțul concav al unui lanț de linii separate: discul de la capătul unei linii ar intra cu R în peretele vecinei;
- o linie care se oprește la mai puțin de R de o piesă.

Lanțul convex trece: capătul stă la exact R de vârful comun.

*Pe o parte, într-o piesă.* O tăietură pe o parte care intră într-o piesă (o treaptă, un falț, o piesă despicată) se refuză. În piesă se lucrează pe linie. Despicarea adevărată cere K calculat cu liniile ca margini (aranjamentul exact, ADR 0036) și un ADR nou.

*Pe linie, prin foaie, într-o piesă* (decizia owner-ului, 13.10): avertisment, cu programul neschimbat: „X: tăietura pe
linie trece prin toată grosimea piesei Y (lângă …): o despică sau o crestează; bucățile care se desprind n-au urechi”.

*Avertismentele.* Programul nu se schimbă.
- **Peretele neatins:** porțiunile `neatins` de la §5, cu lungimea și locul. La mașină, acolo rămâne material lipit de perete.
- **Bucata liberă:** o tăietură deschisă prin foaie cu capetele la mai puțin de D + 1 mm unul de altul, sau o cale pe linie prin foaie care se taie singură. Textul: „bucata închisă de tăietură iese liberă, fără urechi”.

*Precizările 2.3c-5 (15.10, la implementare):*
- **Peretele neatins se spune o dată pe tăietură, doar peste D.** `neatins` (§5) rămâne întreg, dar avertismentul ia doar
  porțiunile mai lungi decât D și le spune într-un singur rând: câte sunt, lungimea totală, cea mai lungă și locul ei.
  Rotunjirea unui colț concav de cel puțin 90° are cel mult D (R · cot(θ / 2) pe fiecare latură) și nu se spune, ca la un
  profil închis fără degajări (§6). Un colț mai ascuțit, cârligul și V-ul de 10° se spun (14,828 mm; 68,580 mm). Pe un
  zig-zag tăiat pe partea concavă, un singur rând, nu câte unul pe dinte (hotărât de asistent, la recomandarea din
  precizările 2.3c-4).
- **Hârtia 10, „cu freza pe partea cealaltă: trece”, cere și ca profilul piesei să stea departe de perete.** La 5 mm de
  latura piesei, fâșia e mai îngustă decât D: linia trece pe dreapta, dar profilul exterior al piesei (la R de latura ei)
  vine la 2 mm de perete, deci refuzul e pe piesă: „tăietura lui r atinge peretele lui l cu 1,000 mm”. Pe hârtie, la 9 mm
  trec amândouă părțile.
- **Despărțirea pe o parte** se judecă pe bucățile offsetului (discul merge pe ele), iar marginea foii pe capetele căii
  (canalul trece de capăt cu R, ca pe linie).

**11. Ușa SVG** (amendează ADR 0035 §7, §8, §10).

*Praful.* O subcale, închisă sau deschisă, cu diagonala cutiei sub `REZOLUTIE` se sare. Se numără la `sub-rezolutie`. Azi, o subcale închisă de felul ăsta face CAM-ul să refuze tot exportul.
- Cutia e cea exactă (`cutieContur`: arcele cu extremele, cubicele cu ale lor), a subcăii închise.
- Se judecă **după** închidere și după verificarea degenerării: un `M…Z` fără segmente rămâne `degenerate` (ADR 0035
  §7), iar o subcale pe care închiderea o face degenerată rămâne deschisă. O subcale lăsată deschisă (golul peste 0,01 mm)
  nu poate fi praf: diagonala ei e cel puțin golul. `line` nu e niciodată praf (e mereu deschisă).
- Se judecă și pe **contururile ieșite din normalizarea `nonzero`** (ADR 0036): o buclă de închidere sub rezoluție (logoul
  VfB: 2 bucle de ~6e-5 mm, la vârful închiderii) se sare, numărată la `sub-rezolutie`. Regiunea pierdută e sub
  rezoluție; păstrată, CAM-ul ar refuza tot exportul.

*Umplerea* (decizia owner-ului, 13.10). Se închid cu o linie, ca în browser, și se numără la `inchise-de-umplere`:
- o subcale fără Z a unei forme umplute (`fill` efectiv ≠ `none`, moștenit, ADR 0035 §4);
- o `polyline` umplută.

Dacă închiderea dă o cale degenerată (mai puțin de 2 vârfuri, sau numai linii pe o dreaptă), subcalea rămâne deschisă.
- Căile închise așa intră în normalizarea `nonzero` (ADR 0036) și în imbricare, ca orice cale închisă.
- Precizează „Ce am respins” din ADR 0035: se închid doar subcăile umplute, pe care le umple și browserul, nu și cele trase doar cu linie.

*Golul sub rezoluție.* O subcale cu `fill: none` și golul de cel mult 0,01 mm se închide cu o linie. Se numără la `inchise-la-usa` (textul raportului spune pragul, 0,01 mm). Niciun punct nu se mută, iar linia adăugată e
sub rezoluția declarată.

*Ce devine cale deschisă:*
- subcăile fără Z, cu `fill: none` și golul peste 0,01 mm;
- orice `line`;
- `polyline`-urile cu `fill: none` care nu se închid.

Calea are vârfurile subcăii plus punctul final, cu segmentul L. E degenerată dacă are mai puțin de 2 vârfuri distincte sau lungimea sub 0,01 mm: atunci se sare și se numără la `degenerate`. Plafonul căii se judecă cu vârful final inclus.

*Ce nu se citește:* `stroke-width`. Canalul are diametrul frezei, nu grosimea liniei din fișier.

*Ce nu intră:*
- căile deschise nu intră în imbricare: nu conțin nimic și nu primesc latură;
- nu intră nici în normalizarea `nonzero`.

*Piesa.* Pe lângă `exterior` și `interior` apare o a treia operație, `deschise` (apoi `deschise-2` …, peste `noduriOperatie`):
- latura: pe linie;
- adâncimea (decizia owner-ului, 13.10): min(1 mm, grosimea foii / 2), într-o trecere; o linie uitată în fișier lasă
  doar o urmă și nu desparte niciodată foaia din oficiu;
- sensul: urcare;
- freza foii;
- urechile, rampa, intrările și colțurile: `null`.

*Refuzul `gol`* devine „nicio cale”: un fișier făcut doar din linii se poate importa.

*Raportul:*
- `deschise` numără acum căile deschise importate, nu pe cele sărite;
- coduri noi: `inchise-de-umplere`, `inchise-la-usa`, `sub-rezolutie`, în ordinea asta, la coada listei din ADR 0035 §10;
- textele se scriu în en și ro.

**12. Interfața minimă.** Schimbă doar componentele de azi; carcasa din 2.8a le reîmbracă fără să schimbe contractul.
- **Pânza:**
  - calea deschisă se desenează fără linie de închidere (`desen.ts` face deja asta);
  - pe căile deschise din selecție **tăiate pe o parte (stânga / dreapta)** apare o săgeată mică la vârful 0, în sensul
    desenului (~8 px, aceeași la orice zoom). Pe linie, sensul nu schimbă tăietura, deci săgeata nu apare (decizia
    owner-ului, 13.10: „Sagetile de directie ar trebui sa apara totusi doar cand sunt relevante […] Cand se face
    pe.linie este irelevant”);
  - dacă o cale are o operație pe o parte, apare și o liniuță pe partea sculei. Liniuța e socotită în lume, cu aceeași funcție ca în CAM, deci e corectă și sub oglindire.
- **Lista de vectori:** „cale deschisă …”.
- **Dialogul de export.** Coloana Profil oferă, după tipul nodurilor din rând:
  - rânduri închise: exterior / interior / pe linie;
  - rânduri deschise: pe linie; stânga și dreapta doar dacă rândul are **o singură** cale deschisă. Pe mai multe căi, fiecare și-ar avea partea după sensul ei întâmplător din fișier; latura pe fiecare cale vine cu panoul (2.8);
  - rânduri amestecate: doar pe linie.

  Celelalte coloane:
  - Sens: activ doar pe stânga / dreapta;
  - Urechi, Rampă, Intrări și Colțuri: oprite pe orice rând cu noduri deschise, cu motivul în titlu.
- **Dialogul de import:**
  - rezumatul: „X exterioare, Y interioare, Z deschise (pe linie)”;
  - contoarele noi;
  - nota: „grosimea liniei din fișier nu contează: canalul are diametrul frezei”.
- **Ce nu intră:** inversarea sensului, alegerea startului, latura pe o singură cale, previzualizarea traseului, scoaterea unei căi de la tăiere.

**13. Poarta.** O scrie o sesiune independentă, doar din acest ADR.
- **Etichetele** `(<idLume>: cale, stanga|dreapta|pe-linie, <adâncime> mm)` devin cunoscute.
- **Invarianta 2, amendată.** Pe stânga / dreapta se judecă partea de sub fața de sus a fiecărei mișcări G1 / G2 / G3:
  - stă în afara lui K;
  - stă la cel puțin max(R − ε − 0,002, 1e-6) de marginile lui K și de toți pereții;
  - stă pe partea etichetei față de propriul perete, fără ocolirea capătului.

  Pe exterior / interior, pereții se adaugă la margini. Pereții și partea se construiesc din document, cu matricea în lume și cu XOR-ul determinantului.
- **Invarianta 9, amendată.** Pe stânga / dreapta, în fiecare eșantion de tăiere: q e piciorul pe perete (numai unde cade în interiorul unui segment), v = p − q, iar τ e direcția de mers. Urcare ⇔ τ × v > 0, derivat din modelul așchiei, nu din tabel. O buclă închisă sub o etichetă deschisă e o încălcare.
- **Invarianta 11, amendată.** Pe eticheta unei căi deschise, o trecere înseamnă:
  - o plonjare verticală din aer într-un capăt al bucății;
  - drumul până la celălalt capăt;
  - ridicarea.

  Toate trecerile unei bucăți pornesc din același punct; pe linie, din vârful 0. Întoarcerea în punctul plonjării nu se mai cere pe căile deschise.
- **Invarianta 14, nouă:**
  - (i) pe orice etichetă `pe-linie`, deschisă sau închisă, fiecare mișcare de tăiere stă pe calea desenată, iar calea e acoperită. Ambele sensuri se judecă la cel mult 0,001 mm (biarcele) + 0,002 mm (postul), plus marja declarată de oracol;
  - (ii) pe stânga / dreapta, la fiecare trecere, reuniunea drumurilor e offsetul deschis ideal: distanța Hausdorff, în ambele sensuri, ≤ 0,002 mm, pe porțiunile valide. Capetele stau pe normalele capetelor acolo unde sunt valide;
  - (iii) ordinea de la §8.
- **Refuzurile, luate ca încălcări:**
  - o etichetă de cale deschisă legată de o operație cu urechi, rampă, intrări sau colțuri;
  - exterior / interior pe un element deschis;
  - stânga / dreapta pe un element închis.
- **Neschimbate:** invariantele 1, 3, 5, 6, 7, 8, 10, 12 și 13.
- **Echivalența:** documentele fără căi deschise primesc exact aceleași verdicte, cu o singură excepție: 14 (i), pe programele cu arcele de la „Ce am măsurat”, punctul 2. Poarta are un mod `inainteDe0037`, ca la ADR 0030–0032.

## Ce verifică oracolul

Sesiuni independente, fără niciun import din `src/` și fără cavalier, verifică:
- **documentul v10:** forma, refuzurile ușii (ultimul segment ≠ L, `inchis` care nu e boolean, sub 2 vârfuri), câmpurile necunoscute, plafoanele și migrarea v9 → v10 (aceleași programe; un v9 cu o cale deschisă sau cu o latură nouă e refuzat);
- **ușa SVG amendată:** praful, umplerea, golul ≤ 0,01 mm, căile deschise cu vârful final, degeneratele, refuzul `gol`, imbricarea doar pe căile închise, contoarele;
- **offsetul deschis ideal**, pe linii și arce: c(t) + d·n(t) și evantaiele colțurilor convexe, păstrat unde distanța la toată calea e cel puțin |d|. `offsetDeschis` se compară cu el, în ambele sensuri, pe un corpus. Ca la 2.1, oracolul acceptă offsetul corect sau un refuz, niciodată un traseu greșit, și numără refuzurile;
- **poarta amendată** (2, 9, 11, 14) și refuzurile;
- **acordul în ambele sensuri** (ADR 0026 §9): oracolul găsește o încălcare pe traseul ideal dacă și numai dacă aplicația refuză cu `regiunea păstrată:`;
- **proba fizică a sensului**, pe cazul deschis: peretele (linia) e de partea cerută de modelul așchiei.

**Valorile pe hârtie.** Freza Ø6 (R = 3), o trecere de 3 mm, Z sigur 5, F1000, plonjarea la F300, originea stânga-jos.
1. **Linia (10,50)→(110,50):**
   - pe linie: G0 X10 Y50 · G1 Z-3 F300 · G1 X110 Y50;
   - stânga + urcare: G0 X10 Y53 · G1 Z-3 · G1 X110 Y53;
   - stânga + opoziție: la Y53, de la X110 la X10;
   - dreapta + urcare: G0 X110 Y47 · G1 Z-3 · G1 X10 Y47;
   - dreapta + opoziție: la Y47, de la X10 la X110.
2. **Linia (0,0)→(100,0), pe linie, 6 mm cu pasul 3:**
   - două treceri, la −3 și la −6, fiecare de la (0,0) la (100,0), cu ridicare și întoarcere între ele;
   - canalul pe câmpul de înălțimi: x ∈ [−3; 103], lățimea 6,00, fundul la −6.
3. **Semicercul R50, trigonometric, (50,0)→(−50,0), cu bulge 1:**
   - stânga + urcare: G0 X47 Y0 · G3 X-47 Y0 I-47 J0;
   - dreapta + urcare: G0 X-53 Y0 · G2 X53 Y0 I53 J0.
4. **L-ul (0,0)→(100,0)→(100,100):**
   - dreapta + opoziție: (0,−3)→(100,−3) · G3 X103 Y0 I0 J3 · →(103,100);
   - stânga: (0,3)→(97,3)→(97,100), cu 1,93 mm² de material rămas în colț.
5. **Cârligul (0,0)→(50,0)→(50,2)→(45,2), stânga:** o bucată, (0,3)→(42,172; 3); avertismentul peretelui neatins dă 14,828 mm (7,828 + 2 + 5).
6. **U-ul de 5 mm (0,50)→(0,0)→(5,0)→(5,50):**
   - stânga, cu scula înăuntru: refuz, „scula nu încape pe partea cerută”;
   - dreapta: 6 vârfuri, cu colțurile convexe ca arce R3.
7. **V-ul de 10°, cu scula înăuntru:** centrul se oprește la R / sin 5° = 34,421 mm de vârf; peretele neatins are 34,290 mm pe fiecare latură.
8. **Arcul R5 de 300°, din coarde de 0,02 mm, decalat 1,5 mm spre exterior:** offsetul corect (o bucată) sau refuzul „offsetul a eșuat”, niciodată „nu încape”.
9. **Oglindirea:** elementul cu matricea (a = −1, e = 150, f = 50), linia (0,0)→(100,0), stânga + urcare: G0 X50 Y53 · G1 Z-3 · G1 X150 Y53.
10. **Regiunea, linia paralelă cu o piesă:** o linie paralelă cu latura unei piese, la 5 mm de ea, tăiată pe partea dinspre piesă: refuz („intră în piesa … cu 1,000 mm”). Cu freza pe partea cealaltă: trece.
11. **Linia oprită lângă o piesă:** o linie perpendiculară pe latura unei piese, oprită la 1 mm de ea, tăiată pe o parte: refuz, discul de la capăt intră 2,000 mm.
12. **Două linii tăiate pe o parte:**
    - în X: refuz;
    - lanțul convex, din două linii separate: trece;
    - lanțul concav: refuz, cu R.
13. **Pe linie, prin foaie, peste o piesă:** avertismentul, programul neschimbat, clasa 1 în ordine.
14. **O linie de la o margine a foii la cealaltă, prin foaie, în afara pieselor:** se taie după exterioare.
15. **Triunghiul cu arcul de coardă 1e-11 mm, pe linie:** G1, fără cerc.
16. **Corpusul v9 și placa 1:** aceleași programe, octet cu octet.

**Martorii negativi** (poarta trebuie să iasă roșie pe fiecare):
- partea inversată (Y47 în loc de Y53);
- mersul invers la urcare;
- coarda de închidere tăiată (un G1 de la Pₙ la P₀);
- ieșirea goală falsă luată drept „nu încape”, sau o bucată scăpată;
- traseul prelungit dincolo de normala capătului, sau traseul care ocolește capătul;
- zig-zag-ul la a doua trecere;
- rampa pe o cale deschisă (un G1 de la capăt spre segmentul 0);
- oglindirea fără XOR;
- exteriorul pe o cale deschisă, tăiat pe linie (ca în ediția întâi);
- cercul ascuns (programul de pe `ed5cd65`);
- o despărțire tăiată înaintea exterioarelor.

**Otrăvurile care contează.** Le alege altă sesiune decât autorul (§4.3):
- `inchis: true` lăsat în `forme.ts`, `piesa.ts` sau `imbricare.ts`;
- semnul lui d, sau XOR-ul determinantului;
- tabelul sensului pe căile deschise;
- verificarea capetelor sau a acoperirii scoasă;
- ieșirea goală crezută „nu încape”;
- refuzurile pentru rampă sau urechi pe căile deschise scoase;
- pereții scoși din margini;
- arcele plate de la §1;
- ordinea despărțirilor;
- la ușă: umplerea, pragul golului, vârful final, regula „ultimul segment L”;
- migrarea care primește `inchis: false`.

## Ce am respins

- **„Stânga / dreapta” = partea păstrată:** e inversul convenției G41 / G42, ArtCAM și Vectric (întrebarea 1).
- **Partea socotită în lume:** o pereche oglindită s-ar tăia pe partea greșită față de formă.
- **Exterior / interior pe o cale deschisă, degradat tăcut pe linie:** e defectul ediției întâi.
- **Maparea stânga / dreapta pe exterior / interior, pe închis, după orientare:** ocolește inelele și rolurile regiunii.
- **Refuzul laturii nepotrivite la ușa documentului:** un document cu o cale tocmai deschisă (o acțiune viitoare „rupe calea”) n-ar mai putea fi deschis ca să fie reparat. CAM-ul îl refuză cu motiv, iar dialogul oglindește refuzul.
- **„O singură bucată, cu capetele pe normale” ca verificare a ieșirii:** refuză tăieturi bune (19 din 240 au un capăt la care freza nu ajunge, de exemplu dinții unui zig-zag) și tot nu prinde dispariția parțială. Acoperirea le rezolvă pe amândouă.
- **Ieșirea goală luată drept „nu încape”:** e chiar defectul poliliniilor fine.
- **Zig-zag-ul:** pe o parte, sensul ar alterna pe peretele păstrat. Pe linie, se amână (vezi „Se redeschide dacă”).
- **Doar peretele propriu protejat:** colțul concav al unui lanț de linii separate ar mușca R din peretele vecinei, fără niciun semn.
- **K cu liniile drept margini (despicarea):** cere aranjamentul exact și un contract nou.
- **Urechile pe [0, P] acum:** formula merge, dar n-are poartă.
- **Închiderea golurilor până la 0,1 mm, oricare ar fi umplerea:** mută forma peste rezoluție.
- **Pragul de 0,001 mm doar pe subcăile umplute:** golurile vin din rotunjirea coordonatelor relative, deci cresc odată cu desenul. Un logo scalat de 10 ori ar trece de prag și ar fi tăiat ca linii.
- **Stânga / dreapta pe un rând cu mai multe căi:** sensul fiecărei căi e întâmplător. Rămâne pentru latura pe cale (2.8).
- **Reparația lui cavalier ca precondiție obligatorie:** curbele din SVG ajung ca biarce (arce), pe care defectul nu le atinge, iar acoperirea ține siguranța. Reparația rămâne o sub-felie opțională, prin martorul din `PROVENIENTA.md`.

## Limitele

- **Sensul desenului** vine din fișier. Nu se poate inversa și nici nu se poate alege startul: vin cu 2.8, iar ordinea căilor și capătul cel mai apropiat vin în etapa 5.
- **Ce nu citește ușa:** `stroke-width`, `stroke-dasharray`, markerii și straturile. O linie punctată se taie continuu, iar un strat GRAVARE nu devine operație.
- **Lanțurile de linii separate** (SVG-uri de tip CAD) nu se lipesc într-o cale. Fiecare linie se taie singură, iar pe o parte colțurile concave se refuză.
- **Materialul păstrat de un perete** nu e în K: o tăietură pe linie poate intra în el fără refuz.
- **Plonjarea** e verticală la fiecare trecere și lasă o urmă pe capătul peretelui. Întoarcerea la start costă timp în aer.
- **Fâșiile și bucățile eliberate** au doar avertismentele de la §10. Analiza fragmentelor vine mai târziu.
- **Poliliniile fine** pe o parte se refuză cu „offsetul a eșuat” până la testul de paralelism normalizat din cavalier.
- **Timpul offsetului** crește mai repede decât liniar cu numărul de segmente scurte față de R: un zig-zag de 25 600 de segmente ia 4–8 s pe firul principal. Același lucru e valabil la închis. Dacă fișierele reale trec de buget, calculul se mută într-un worker (ADR 0015).
- **Închiderea prin umplere** poate lăsa o încrucișare minusculă la vârful închiderii. Pe logoul VfB, o formă e refuzată cu „se autointersectează”, cu motiv.
- **Placa 2 n-are nicio cotă pentru căile deschise.** Partea și capetele se probează pe hârtie, în poartă și în simulare (etapa 4).

**Se redeschide dacă:**
- atelierele cer urechi, rampă (dus-întors), intrări la capete (prelungirea tangentă), degajări în colțurile liniei, sau capete scurtate ori prelungite;
- timpul în aer al trecerilor pe linie contează pe fișiere reale (atunci, zig-zag-ul pe linie);
- se cer tăieturi pe o parte în piese (falțuri) sau despicarea (K cu liniile drept margini);
- refuzurile „offsetul a eșuat” sau încrucișările de la închiderea prin umplere se înmulțesc pe fișiere reale;
- vin latura pe fiecare cale, inversarea sensului (2.8) sau straturile ca operații.
