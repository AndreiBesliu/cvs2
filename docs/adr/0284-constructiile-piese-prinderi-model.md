# ADR 0284: Construcțiile din Easy 3Draw: piese noi pe familii, punctele de prindere și Modelul ca asamblare

**Starea:** acceptat pe 24.11.2026, cu toate recomandările (1a, 2a, 3a și toate cele patru grupe de piese, alese de owner
la întrebările puse în sesiune; „Răspunsurile owner-ului”, mai jos). Propus în aceeași zi, la cererea lui („ok, vreau sa
adaugi mai multe tipuri de piese pentru fiecare categoire, sau sa imbunatatesti piesele si configuratoarele care exista
deja. vreau ca userii sa poata crea cat mai multe piese, care sa fie si compatibile intre ele nu doar una cate una ci si
ca constructii complexe”), în sesiunea cloud a liniei bibliotecii (ramura `wip/3.Xh-biblioteca-ui`). **Felia 3.Ca
(conectorul perpendicular) implementată pe 24.11** („Implementat”, la capăt).
**Continuă:** ADR 0169 (rotițele), 0280 (roțile, fuliile, conicele, șenila), 0281 (piesele pe file), 0282 (elicele),
0168 (înălțimile din profilul imprimantei). **Se leagă de:** felia 3.Tu (unde stă axul pieselor rotunde în vederea „Modelul”;
propusă ca ADR 0283, la răspunsurile owner-ului): partea D de aici pleacă de la ce hotărăște ea. 3.Tu a fost a liniei
elicelor; din 24.11 seara e a acestei linii (predarea, la cererea owner-ului, în `docs/linii/elice.md`).

## Ce e azi (inventarul din 24.11, Easy 3Draw 18.23.0)

Atelierul are **27 de piese în patru familii** (`FAMILII`, `extensii/trenulet/sursa/planificator/atelier.ts`), fiecare cu
configuratorul ei, făcute de motorul `extensii/trenulet/sursa/lego/lego.ts` (`TIPURI`):

| Familia | Piesele |
|---|---|
| Cărămizi (10) | cărămidă / placă (orice formă pe grilă, știfturi sus sau la mijloc, găuri, știfturi laterale), pantă, pantă inversă, pană / aripă, rotund / con, știfturi pe lateral, suport, grindă (dreaptă, pe grilă, îndoită), cărămidă Technic, placă cu găuri |
| Legături (8) | știft (de 2 sau 3, și cu capăt de ax), ax, bucșă / conector, clemă, bară, mâner, bilă, cupă |
| Roți (7) | roată dințată, conică, coroană, conică dublă, fulie, roată cu anvelopă, șenilă (zala și pinionul) |
| Elice (3) | elice, elice de barcă, ventilator cu carcasă |

**Ce se potrivește azi cu ce:**

- toate piesele țin cotele LEGO (pasul de 8 mm, placa de 3,2 mm, gaura de știft, crucea axului), cu jocurile din
  calibrarea imprimantei: o piesă făcută aici se prinde de una LEGO și de alta făcută aici;
- perechile au ajutorul lor, câte unul pe mecanism: „Fă perechea” (roți dințate, conice, elice), cureaua dintre două
  fulii, „Fă șenila”, „Fă ventilatorul”; fiecare spune distanța dintre axe și pune piesele în listă;
- **vederea „Modelul”** așază piesele pe grila de știfturi (X și Y câte un știft, Z câte o placă, rotire din 90° în 90° în
  jurul verticalei), le colorează și le trimite în lista de printat. Textul ei o spune: „Nu verific dacă piesele se
  prind”. Există un singur model.

## Ce lipsește pentru „construcții complexe”

1. **Nimic nu leagă piesele în 3D.** Grinzile, axele și știfturile se pot înșira într-un plan; singura trecere între
   planuri e cărămida Technic (găuri orizontale, știfturi sus). Lipsesc conectorii cu găuri pe două sau trei axe și
   conectorii în unghi, adică exact piesele din care se fac cadre, șasiuri și brațe.
2. **Mecanismele se opresc la rotație.** Există angrenaje, curele și șenile; lipsesc mișcarea dreaptă (cremaliera),
   demultiplicarea mare (melcul), mișcarea alternativă (cama, manivela) și piesele care se rotesc una față de alta
   (placa turnantă, balamaua).
3. **Cărămizile n-au forme de clădit.** Arcul, balamaua, placa turnantă, cadrul (fereastra) lipsesc.
4. **Modelul nu știe ce e o prindere.** Piesele stau doar culcate, cum ies de pe pat: o roată nu se poate pune în
   picioare pe un ax, un ax nu se poate trece prin găurile a două grinzi. Nu se vede dacă două piese se prind, dacă
   plutesc sau dacă intră una în alta.
5. **O construcție nu e un lucru al ei.** Nu are nume, nu se pot ține mai multe, nu are o listă de piese a ei și nu se
   poate porni de la una gata făcută.

## Decizia propusă

Un program în cinci părți. Fiecare felie se termină cu ceva ce se poate printa sau încerca, cu Easy 3Draw la o versiune
nouă și cu rândul ei de „ce e nou” în bibliotecă.

### A. Piesele care leagă în 3D (familia Legături)

- **Conectorul perpendicular** („bloc cu găuri”): un bloc de 1 × 1 până la 1 × 5 pași, cu găuri de știft sau de ax pe
  lungime și, la alegere, cu găuri perpendiculare pe ele, pe a doua și pe a treia axă. Acoperă, dintr-un configurator,
  blocurile în cruce, conectorii 1 × 2 și 1 × 3 perpendiculari și colțarul.
- **Conectorul în unghi**: două manșoane de ax (sau un manșon și un știft) la un unghi ales, de la 0° la 180°, din
  22,5° în 22,5° (unghiurile conectorilor LEGO numerotați) sau scris de mână.
- **Axul cu opritor** și **știftul lung cu bucșă**: opțiuni noi în configuratoarele „Ax” și „Știft”, nu piese noi.

### B. Mecanismele și formele noi (Roți, Cărămizi, Elice)

- **Roți:** cremaliera (modulul roților dințate de aici, lungimea în știfturi, prinsă pe știfturi sau cu găuri de știft),
  melcul (pe ax, pentru roata dințată de 8, 16 sau 24), cama și manivela (discul excentric cu gaură de ax).
- **Cărămizi:** arcul (deschiderea și săgeata în știfturi), balamaua (cele două jumătăți, cu bolțul printat), placa
  turnantă (două discuri care se rotesc, 2 × 2 și 4 × 4), cadrul (fereastra: o cărămidă cu gol).
- **Elice:** roata cu palete (de apă sau de vânt), pe butucul roților.

### C. Punctele de prindere (motorul)

Fiecare piesă își spune **prinderile**: felul (știft, locaș, gaură de știft, gaură de ax, știft Technic, capăt de ax,
bară, clemă, bilă, cupă), locul și direcția, în milimetri, în sistemul piesei. Calculul stă în motor, pur, lângă piesa
lui (`Lego.prinderi(def)`), și e probat ca restul motorului: locurile pe hârtie și, pentru fiecare pereche care trebuie
să se prindă, cele două piese montate nu se pătrund și nu au joc peste cel din calibrare.

În configurator apare **„Se prinde cu”**: piesele din atelier care se potrivesc cu cea de pe ecran, fiecare cu un clic
care o deschide cu mărimile potrivite (axul de lungimea bună, grinda cu găurile la distanța angrenajului). E „Fă
perechea” de azi, făcut pentru toate piesele, dintr-un singur loc.

### D. Modelul ca asamblare

- **Orientarea pe trei axe:** o piesă se poate pune în picioare sau pe o parte (cele 24 de așezări drepte), nu doar
  rotită pe masă; pozițiile la jumătate de pas, pentru Technic.
- **Alipirea la prinderi:** o piesă nouă se așază pe prinderea aleasă a celei alese (știftul în locaș, axul în gaură),
  nu doar „deasupra”.
- **Verificarea:** modelul spune, pentru fiecare piesă, dacă e prinsă, dacă plutește sau dacă intră în alta. E un
  avertisment, nu un refuz: omul poate lăsa o piesă cum vrea.
- **Mai multe construcții:** fiecare cu numele ei, ținute în atelier ca lista de azi; lista de piese a construcției
  (câte bucăți din fiecare, grame, timp) și „Pune construcția în lista de printat”.

### E. Construcțiile gata

Câteva construcții de pornire, făcute din piesele de mai sus și deschise în Model, cu mărimile la alegere: șasiul cu
patru roți, cutia de angrenaje (raportul ales, cu grinzile găurite la distanțele bune), brațul de macara, barca cu
elice. Fiecare e un șablon din parametri, nu un desen fix.

## Feliile (propunere; fiecare, cam o jumătate de zi)

| # | Felia | Ce aduce |
|---|---|---|
| 3.Ca | Conectorul perpendicular | piesa și configuratorul; „Repede” pentru formele uzuale (gata pe 24.11) |
| 3.Cb | Conectorul în unghi; axul cu opritor, știftul lung cu bucșă | piesa și opțiunile noi |
| 3.Cc | Cremaliera | cu montajul față de roata dințată și „Fă perechea” (gata pe 24.11); melcul a trecut în 3.Cj |
| 3.Cd | Arcul | piesa și configuratorul (gata pe 25.11) |
| 3.Ce | Punctele de prindere și „Se prinde cu” | motorul și panoul din configurator, pentru toate piesele (gata pe 25.11) |
| 3.Cf | Modelul: orientarea pe trei axe și alipirea la prinderi | după 3.Tu (ADR 0283; a acestei linii din 24.11 seara) |
| 3.Cg | Modelul: verificarea (prins, plutește, se ciocnește) | avertismente pe piese și în listă |
| 3.Ch | Construcțiile cu nume și lista lor de piese | mai multe construcții în atelier |
| 3.Ci | Construcțiile gata | patru șabloane |
| 3.Cj | Melcul, cama și manivela, cadrul, roata cu palete | restul pieselor din B, pe bucăți: 3.Cj-1, cama, 3.Cj-2, roata cu palete, 3.Cj-3, cadrul, și 3.Cj-4, șurubul melc (toate gata pe 25.11) |
| 3.Ck | Balamaua și placa turnantă | despărțite de 3.Cd: au jocuri de mișcare care se potrivesc pe piese tipărite |

## Marginile

- **Doar pachetul extensiei se schimbă.** Nimic în aplicația cvs2: nici pornirea, nici totalul, nici documentul, nici
  serverul. Fiecare felie ia versiunea următoare a lui Easy 3Draw și își scrie rândul în `extensii/biblioteca.json`.
- **Aceleași date.** O listă sau un model salvat azi se deschide la fel; piesele noi sunt tipuri noi, iar ce adaugă
  Modelul (orientarea) lipsește din piesele vechi și înseamnă „culcată”, ca azi.
- **Referințele v18 ale motorului nu se schimbă**; piesele noi își au probele lor: plasa închisă, cotele pe hârtie,
  perechea montată fără pătrundere, e2e în atelier, engleza, otrăvurile.
- **Cotele LEGO se măsoară, nu se copiază:** din fișierele LDraw, ținute în afara repo-ului, ca la roți și la elice.
  Nicio piesă nu poartă nume sau desene ale altcuiva; „Ca LEGO <număr>” e doar un reper de mărime.
- **Se printează fără suport** unde se poate; unde nu, configuratorul o spune.

## Întrebările (recomandarea e „a”)

1. **Cu ce începem.** (a) Cu piesele care leagă în 3D și cu mecanismele (3.Ca–3.Cc), fiindcă fără ele construcțiile nu
   ies din plan; (b) cu Modelul ca asamblare (3.Ce–3.Cg), pe piesele de azi; (c) cu cărămizile de clădit (3.Cd).
2. **Verificarea din Model.** (a) Avertisment: arăt ce nu se prinde sau se ciocnește, dar piesa rămâne unde o pui;
   (b) refuz: o piesă care nu se prinde nu se poate pune.
3. **Construcțiile gata (3.Ci).** (a) Da, cele patru de mai sus, după Model; (b) nu acum; (c) altele: spune care.
4. **Lista pieselor noi.** (a) Cea de mai sus; (b) scoți sau adaugi: spune care.

## Răspunsurile owner-ului (24.11.2026)

1. **Cu ce începem:** a, piesele care leagă în 3D și mecanismele (3.Ca–3.Cc).
2. **Verificarea din Model:** a, avertisment (piesa rămâne unde o pui).
3. **Construcțiile gata:** a, cele patru (șasiul, cutia de angrenaje, brațul de macara, barca cu elice), după Model.
4. **Lista pieselor noi:** toate cele patru grupe (conectorii 3D, mecanismele, cărămizile de clădit, roata cu palete).

## Se redeschide dacă

- owner-ul alege altă ordine sau altă listă de piese;
- 3.Tu (axul pieselor rotunde în Model) hotărăște altfel decât presupune partea D;
- o piesă nouă nu se poate printa fără suport la mărimile uzuale (atunci, în două bucăți sau cu altă așezare);
- pachetul extensiei trece de o mărime care îngreunează instalarea (azi, sub 0,5 MB).

## Implementat (3.Ca, 24.11.2026)

**Conectorul perpendicular** (tipul `conector`, fila Legături, Easy 3Draw 18.24.0):

- **Piesa:** un bloc culcat, de 1 până la 5 pași, cu secțiunea pătrată cât grosimea grinzii groase (7,8 × 7,8 mm) și
  lungimea 8·n − 0,2 mm. Fiecare pas are gaura lui, în mijlocul pasului: de știft (cu lamaj pe fețele prin care iese), de
  ax (crucea) sau niciuna, pe axa lui: în sus, de-a latul sau, doar la capete, în lung. Găurile stau în pași diferiți,
  deci nu se taie una pe alta; cea în lung intră din capăt cât un pas și se oprește în vecin (singură, trece prin tot).
  Diametrele și jocurile sunt cele ale grinzii, din calibrare. Se printează culcat, fără suport.
- **Configuratorul:** lungimea, formele gata („Repede”: crucea 1 × 2, ax–știft–ax, două știfturi și ax, colțul pe trei
  axe) și, pe fiecare pas, felul găurii și axa ei. „În lung” se poate alege doar la capete; un pas ajuns la mijloc își
  trece gaura în sus; un pas plin n-are axă. Numele piesei își spune pașii („Conector 1×3: ax în lung, știft sus, știft
  lateral”), deci două forme diferite au nume și fișiere diferite.
- **Față de propunere:** formele gata nu poartă numere de piese LEGO. Cotele pieselor LEGO se măsoară din LDraw, iar
  fișierele lui nu sunt în containerul sesiunii; forma (ce gaură, pe ce axă) nu are nevoie de ele, iar mărimile sunt
  cele ale grinzii de aici. Colțurile blocului sunt drepte (stă cu o față întreagă pe pat).
- **Motorul spune ce nu se poate:** o gaură în lung la mijloc rămâne plină, cu avertisment; blocul fără nicio gaură, la
  fel. Peste 5 pași se iau primii cinci; un cod necunoscut e o gaură de știft în sus.
- **Probele:** unitare 8 (`test/unit/trenulet.conector.test.ts`): corpul închis și cotele pe toată plaja (peste 80 de
  forme), iar găurile judecate punct cu punct, după numărul de înfășurare al plasei (în lemn sau în gol), fără să știe
  cum e făcută piesa: diametrul din calibrare în cele patru direcții, lamajul pe fețe, crucea axului, gaura în lung care
  se oprește în vecin, blocul dintr-o bucată. E2e 4 (`test/e2e/trenulet.conector.spec.ts`): fila și piesa, configuratorul,
  STL-ul descărcat (închis, cu cotele), lista și modelul, avertismentul. Probele filelor, căutării („con” o găsește) și
  pictogramelor, la zi.
- **Mărimea:** doar pachetul extensiei (480,9 → 481,1 kB cu stilul); aplicația, neschimbată.
- **Felia următoare (3.Cb):** conectorul în unghi, axul cu opritor, știftul lung cu bucșă (mai jos).

## Implementat (3.Cb, 24.11.2026)

**Conectorul în unghi** (tipul `conectorUnghi`, fila Legături), **axul cu opritor** și **știftul cu bucșă** (opțiuni noi
ale axului și ale știftului); Easy 3Draw 18.25.0.

- **Conectorul în unghi:** un butuc rotund în picioare (Ø 7,8), cu gaura lui verticală (de știft, cu lamaj pe ambele
  fețe; de ax; sau plin), din care pleacă 1–4 brațe pătrate (7,8 × 7,8), culcate pe masă. Fiecare braț are pe axa lui un
  manșon orb, adânc de un pas: de la 4 mm de centrul butucului până la gură (11,9 mm); de ax (crucea) sau de știft (gaura
  grinzii, cu lamaj la gură). Laturile brațului pleacă tangent din butuc (un „umăr” plin, fără cercul găurii), deci
  piesa n-are crestături între butuc și brațe. Se printează culcat, fără suport.
- **Unghiurile:** două brațe stau la cel puțin 90° unul de altul. Sub 90°, un braț ar intra în manșonul celuilalt
  (socotit pe hârtie: la 67,5°, colțul manșonului cade în brațul vecin); de aceea plaja din propunere („de la 0° la
  180°”) e, de fapt, 90°–180° pentru două brațe, iar „0°” e conectorul cu un singur braț. Motorul lasă afară brațul
  care nu încape și o spune.
- **Configuratorul:** formele gata („Repede”: Nr. 1–6, cu unghiurile conectorilor LEGO numerotați: un braț, 180°,
  157,5°, 135°, 112,5°, 90°; apoi T, Cruce, Y), numărul brațelor (1–4), butucul, iar pe fiecare braț manșonul și, de la
  al doilea, unghiul față de primul (în trepte de 22,5° sau scris de mână, la zecimi de grad). Câmpul primește doar ce
  încape între marginile lui (la cel puțin 90° de vecini; cu două brațe, până la 180°, fiindcă dincolo e aceeași piesă,
  întoarsă); un braț mutat îi împinge pe următorii. O formă gata și un alt număr de brațe țin manșoanele alese. Numele
  piesei își spune brațele („Conector în unghi: ax, știft 120°, ax 240°, butuc de ax”).
- **Axul cu opritor:** bifa „Cu opritor la un capăt” în configuratorul axului. Un disc cât gulerul știftului (Ø 6),
  gros de 1 mm, în lungimea axului (axul 4 are tot 31,8 mm), tăiat de masă ca să stea culcat. Se sprijină pe fața
  grinzii (intră în lamajul găurii, Ø 6,4). Fără bifă, axul e cel de până acum, triunghi cu triunghi.
- **Știftul cu bucșă:** al treilea capăt scurt al știftului („Știft”, „Ax”, „Bucșă”), la 2 și la 3. Partea scurtă e un
  cilindru plin de Ø 7,2 (cât bucșa), lung de un pas, tăiat de masă; știftul nu mai are guler (bucșa se sprijină pe
  grindă) și are fantă doar la capătul rotund.
- **Găsite pe drum, de probe și la privire:** (1) discul opritorului ieșea teșit sub axă (conturul sărea de la masă
  direct la mijloc): l-a prins proba punct cu punct; (2) brațul conectorului pornea drept din peretele rotund al
  butucului, cu crestături de jumătate de milimetru pe părți: văzut în captură, îndreptat cu umărul tangent; (3) colțul
  umărului cădea exact pe un vârf al cercului butucului, deci două corpuri închise își împărțeau o muchie, iar STL-ul
  ieșea „deschis” la cine îl citește: l-a prins proba din browser a STL-ului; umărul începe acum la 0,2 mm după centru,
  iar proba unitară judecă plasa și ca STL (`muchiiFaraPereche`).
- **Lăsat cum era:** știftul obișnuit „fără fantă” iese mai lung cu 0,02 mm (corpul lui pornește de la −0,01); e așa din
  v18, iar referințele lui sunt fixate. Știftul cu bucșă nu moștenește abaterea.
- **Probele:** unitare 13 (`test/unit/trenulet.unghi.test.ts`, 9; `test/unit/trenulet.opritor.test.ts`, 4), cu
  ajutoarele comune în `test/unit/ajutor-plasa-lego.ts` (numărul de înfășurare, amprenta plasei, muchiile ca în STL);
  e2e 6 (`test/e2e/trenulet.unghi.spec.ts`; una deschide un conector stricat venit din stocare și îl cere îndreptat ca în
  motor). Probele filelor („Legături 10”), galeriilor, căutării („con”) și
  pictogramelor, la zi.
- **Mărimea:** doar pachetul extensiei (481,1 → 485,4 kB); aplicația, neschimbată.
- **Felia următoare (3.Cc):** cremaliera (mai jos).

## Implementat (3.Cc, 24.11.2026)

**Cremaliera** (tipul `cremaliera`, fila Roți; Easy 3Draw 18.26.0).

- **Piesa:** o bară lată cât un știft (7,8 mm), lungă de 2–24 de știfturi, cu dinți drepți deasupra. Dinții au profilul
  cu care motorul taie roțile de aici (20°, capul m, piciorul 1,25·m): la linia de divizare, dintele are π·m / 2 − 2 ×
  jocul din calibrare, deci jocul cu o roată e același ca între două roți. Încap doar dinți întregi, așezați pe mijlocul
  piesei (cremaliera 1 × 4 are 10 dinți, ca cea LEGO). Se printează în picioare, cu dinții în sus, fără suport.
- **Prinderea:** pe știfturi (dedesubt e chiar placa 1 × n a motorului, fără știfturi sus) sau cu găuri de știft de-a
  latul, câte una pe pas, la înălțimea găurilor unei grinzi.
- **Înălțimea, după roata pereche:** linia de divizare stă acolo unde axul roții cade pe grilă: în gaura unei cărămizi
  Technic (5,8 mm) ridicate cu k plăci, respectiv în găurile de la k pași (8 mm) deasupra găurilor cremalierei, cu cel mai
  mic k la care sub dinți rămâne lemn (0,5 mm peste placă; 0,8 mm peste lamajul găurii). Pentru roata de 8, pe știfturi:
  linia de divizare la 5 mm, axul la 9 mm, cărămida cu o placă mai sus. Configuratorul scrie montajul în cuvinte și cât
  înaintează cremaliera la o rotație a roții (π·m·z); „Fă perechea” pune în listă cremaliera și roata ei (aceeași piesă
  cu roata din editorul roților).
- **Angrenarea e probată pe plase, nu doar pe hârtie:** roata făcută de motor, cu axul unde spune montajul, se
  rostogolește peste un pas întreg fără să intre în cremalieră; martorii (axul coborât peste jocul de la fund, o jumătate
  de pas alături, rostogolirea în sensul greșit) intră, iar jocul dintre dinți iese cel de pe hârtie (2 × jocul de fiecare
  parte).
- **Lăsat pentru mai târziu:** dinții nu se continuă de la o cremalieră la alta pusă cap la cap (pasul π·m nu cade pe
  grila de 8 mm; LEGO folosește pasul de 3,2 mm): pentru o cursă lungă se face o cremalieră mai lungă (până la 24 de
  știfturi, 191,8 mm). Pasul „pe grilă” rămâne o opțiune de adăugat dacă e cerută.
- **Melcul a trecut în 3.Cj.** Are nevoie întâi de dovada, pe plase, că nu se pătrunde cu roata dreaptă (dinții roții
  sunt drepți, spira e înclinată) și de o hotărâre despre tipărire: la diametrul de divizare de 8 mm, cerut de grila
  LEGO (axele la 4 + z / 2 mm), între gaura de ax și fundul spirei rămân 0,25 mm, iar flancul de jos al spirei stă în
  consolă la 70°.
- **Găsit pe drum:** fețele barei cu dinți nu se pot triunghiula cu `prisma` (poligonul are multe colțuri intrate și
  ieșea cu muchii deschise); se fac cu `prismaGauri` (earcut). Câmpurile editorului au prefixul lor (`at-crm-`): `at-cr-`
  e al coroanei, `at-cm-` al clemei.
- **Probele:** unitare 9 (`test/unit/trenulet.cremaliera.test.ts`), e2e 4 (`test/e2e/trenulet.cremaliera.spec.ts`).
  Probele filelor („Roți 8”), galeriilor și pictogramelor, la zi.
- **Mărimea:** doar pachetul extensiei (485,4 → 488,7 kB); aplicația, neschimbată.
- **Felia următoare (3.Cd):** arcul (mai jos).

## Implementat (3.Cd, 25.11.2026)

**Arcul** (tipul `arc`, fila Cărămizi; Easy 3Draw 18.27.0).

- **Piesa:** o cărămidă 1 × n (3–16 știfturi), înaltă de 1–4 cărămizi, cu știfturi pe toată lungimea și cu o boltă
  dedesubt. Picioarele sunt primul și ultimul știft: două cărămizi 1 × 1 ale motorului, goale pe dedesubt, deci stau pe
  știfturi; între ele, puntea, care intră 0,5 mm în pereții picioarelor.
- **Bolta:** un arc de cerc prin cele două colțuri de jos ale deschiderii (deschiderea e (n − 2) × 8 + 0,2 mm). Urcă
  jumătate din deschidere (semicerc), dar nu mai mult decât înălțimea piesei fără 1,6 mm: arcul 1 × 4 urcă 8 mm și lasă
  1,6 mm deasupra; arcul 1 × 6 × 2 e un semicerc de 16,1 mm. „Joasă” urcă pe jumătate.
- **Configuratorul:** lungimea, înălțimea în cărămizi, bolta (înaltă sau joasă), mărimile uzuale („Repede”: 1×3, 1×4,
  1×6, 1×6×2, 1×8×2, 1×12×3) și cotele bolții în cuvinte. Numele e ca la arcele LEGO („Arc 1×6×2”).
- **Tipărirea:** în picioare. O boltă rotundă și mică iese de obicei curat fără suport; una lată sau joasă are vârful
  aproape orizontal și cere suport sub ea. Configuratorul o spune; pragul adevărat îl arată imprimanta.
- **Găsit pe drum:** muchia de la piciorul bolții cădea exact pe muchia de jos a peretelui piciorului (două corpuri cu
  o muchie comună); marginea de jos a punții stă acum la 0,01 mm de masă.
- **Balamaua și placa turnantă au trecut în 3.Ck.** Amândouă au jocuri de mișcare (între articulații, între discuri)
  care nu se pot hotărî pe hârtie: se potrivesc pe piese tipărite, după ce owner-ul încearcă primele piese ale liniei.
- **Probele:** unitare 7 (`test/unit/trenulet.arc.test.ts`: bolta judecată punct cu punct pe cerc, picioarele comparate
  cu o cărămidă 1 × 1, legătura, știfturile), e2e 3 (`test/e2e/trenulet.arc.spec.ts`). Probele filelor („Cărămizi 11”),
  galeriilor și pictogramelor, la zi.
- **Mărimea:** doar pachetul extensiei (488,7 → 491,4 kB); aplicația, neschimbată.
- **Felia următoare (3.Ce):** punctele de prindere și „Se prinde cu”.

## Implementat (3.Ce, 25.11.2026)

**Punctele de prindere și „Se prinde cu”** (Easy 3Draw 18.28.0).

- **Fiecare piesă își spune prinderile**, odată cu plasa: `construieste(def).prinderi` (și `Lego.prinderi(def)`). O
  prindere are felul, locul `p`, direcția `d` (unitară, spre afară) și lungimea, în milimetri, în sistemul plasei.
  Felurile sunt unsprezece: știft, locaș, gaură de știft, gaură de ax, **gaură de bară** (știftul gol; adăugată față de
  lista de mai sus), știft Technic, capăt de ax, bară, clemă, bilă, cupă.
- **Convenția:** la tată (știft, știft Technic, capăt de ax, bară, bilă), `p` e rădăcina, unde ajunge fața piesei
  pereche când prinderea e făcută până la capăt; la mamă (locaș, găuri, clemă, cupă), `p` e mijlocul gurii, pe fața
  piesei. Două prinderi sunt făcute când `p` coincid și `d` sunt opuse. În plus: `orb` (gaura nu trece), `r` (un braț
  al crucii, la ax și la gaura lui), `guler` și `lamaj` (gulerul unui știft Technic intră în lamajul găurii, cât
  încap amândouă: într-o grindă subțire sau într-o placă, știftul rămâne cu gulerul afară).
- **Compilatorul cere prinderile fiecărei piese:** `prinderi` e câmp obligatoriu al rezultatului unei piese (tipul
  `Corp`), deci o piesă nouă nu se poate scrie fără el; proba îi cere și o mostră, cu numerele de pe hârtie.
- **Montajul** (`Lego.montaj(a, b, unghi)`): mutarea rigidă care duce piesa prinderii `b` pe prinderea `a`. Două cruci
  se potrivesc singure, braț pe braț; un tată mai lung decât o gaură oarbă se oprește în fundul ei; gulerul intră în
  lamaj. E baza alipirii din Model (3.Cf).
- **„Se prinde cu”, în configurator**, sub butoanele piesei: închis, un rând cu ce are piesa, numărat ca un om („8
  știfturi · 8 locașuri”, „5 găuri de știft”, „1 ax”); deschis, câte un rând pe fel („Pe știfturi”, „În găurile de ax”,
  „Pe ax”…), cu piesele atelierului care se potrivesc, fiecare cu pictograma ei. Celelalte piese se judecă așa cum sunt
  acum în editoarele lor (o roată fără gaură nu mai stă pe ax). Un clic deschide piesa; **axul și știftul vin cu
  lungimea potrivită** piesei de pe ecran (axul trece prin gaura cea mai adâncă și mai iese un pas; știftul de 3, doar
  unde gaura trece de un pas) și o spun. De la piesa deschisă, drumul înapoi e în același panou.
- **Roata dințată își spune și grinda perechii:** când axele cad pe grila de 8 mm (24 cu 24: o grindă de 4; 24 cu 8: de
  3), cu „Pune grinda în listă”; altfel spune că nu cad pe grilă.
- **Ce nu face încă:** celelalte piese se deschid cu mărimile din editorul lor (o cărămidă nu ia forma știfturilor de
  sub ea: i-ar șterge omului forma desenată); alipirea în Model vine în 3.Cf.
- **Găsit pe drum, pe plase:**
  - **bila nu stă în centrul găurii cupei.** Gaura sferică a cupei are fundul plat, cu 0,3 mm peste polul ei, iar bila
    (Ø 5,9 în gaura de Ø 6,1) ajunge cu 0,2 mm sub el. Bila se așază deci pe fundul plat, cu centrul la 0,2 mm deasupra
    centrului găurii, și e ținută de buza gurii; prinderea cupei e dată acolo. Geometria cupei nu s-a schimbat
    (referințele v18): dacă articulația tipărită iese prea strânsă sau prea moale, aici e locul de umblat;
  - **știfturile plăcii 2 × 2 de sub bilă și de sub cupă nu sunt prinderi:** o piesă pusă pe ele ar intra în bilă sau
    în cupă (motorul avertiza deja la cupă);
  - **clema e mai îngustă în față decât raza ei:** marginea piesei e la capetele gurii, nu la raza inelului.
- **Probele:** unitare 15 (`test/unit/trenulet.prinderi.test.ts`): 88 de mostre, cel puțin una pe fiecare tip al
  motorului, cu numerele de pe hârtie; **fiecare prindere declarată e întrebată pe plasă**, punct cu punct (știftul e
  plin și are loc în jur, locașul îl ține din două părți, gaura e rotundă sau în cruce, cu lamajul spus, bara e liberă,
  clema are o singură gură, bila și cupa); o declarație mincinoasă (mutată cu 0,4 mm, întoarsă, de alt fel, prea
  lungă) cade; 17 perechi montate pe plasele amândurora nu se pătrund, iar mutate cu 0,4 mm într-o parte se pătrund.
  În browser 7 (`test/e2e/trenulet.prinderi.spec.ts`), plus engleza panoului în proba limbii.
- **Proba pe plase, mai repede:** „în lemn / în gol” se socotește doar pe triunghiurile din dreptul punctului
  (`infasurareRepede`, în `test/unit/ajutor-plasa-lego.ts`), cu aceeași aritmetică pe triunghi; o probă o compară cu
  numărarea completă pe 13 500 de puncte. Proba prinderilor ține 8 s (50 s fără).
- **Mărimea:** doar pachetul extensiei (491,4 → 501,6 kB: a trecut de pragul de 0,5 MB din „Se redeschide dacă”;
  instalarea nu se simte, dar pragul e de hotărât din nou); aplicația, neschimbată.
- **Felia următoare:** 3.Tu (piesele rotunde pe același ax în „Modelul”), la răspunsurile owner-ului, apoi 3.Cf.
  (3.Tu, făcută pe 25.11: ADR 0283, Easy 3Draw 18.33.0.)

## Implementat (3.Cj-1, 25.11.2026)

**Cama** (tipul `cama`, fila Roți; Easy 3Draw 18.29.0). Prima piesă din 3.Cj, care se face pe bucăți: 3.Cj-1 cama, apoi
roata cu palete, cadrul și melcul.

- **Piesa:** un disc pe ax, cu marginea la o distanță de ax care se schimbă în timpul rotației, de la raza de bază
  (jumătate din diametrul cerut) la raza de bază plus cursa. Un tachet sprijinit pe ea (capătul unei grinzi, un ax într-un
  ghidaj) urcă și coboară cu cursa, o dată pe tură. Se tipărește culcată, fără suport.
- **Trei forme:** excentricul (un cerc cu axul mutat din mijloc cu jumătate din cursă: urcă și coboară lin), para
  (cercul de bază și un nas rotund, legate prin tangente: stă jos mai mult de jumătate de tură, apoi urcă scurt) și
  melcul (raza crește liniar pe o tură întreagă, apoi cade: într-un singur sens).
- **Parametrii:** diametrul de bază 10–64 mm, cursa 1–24 mm, grosimea 1–20 mm (implicit 7,8, cât o grindă), gaura de ax
  sau rotundă. La cea mai mică, între colțul crucii și margine rămân 2,3 mm.
- **„Manivela” din planul de mai sus nu e o piesă nouă:** o grindă cu o gaură de ax la un capăt și găuri de știft în
  rest se face deja din editorul grinzilor, iar discul cu găuri de știft pe cercul de 8 mm e fața „cu găuri de știft” a
  fuliei.
- **Prinderile:** gaura de pe ax; „Se prinde cu” îi propune axul de lungimea bună, iar axul o propune înapoi.
- **Probele:** unitare 6 (`test/unit/trenulet.cama.test.ts`): **raza se judecă pe plasă**, din 5 în 5 grade, față de
  formula de pe hârtie a fiecărei forme (para, ca înfășurătoare convexă a două cercuri, socotită altfel decât în motor);
  e2e 3 (`test/e2e/trenulet.cama.spec.ts`). Probele filelor („Roți 9”), galeriilor, pictogramelor și ale panoului „Se
  prinde cu”, la zi.
- **Mărimea:** doar pachetul extensiei (501,6 → 504,7 kB); aplicația, neschimbată.

## Implementat (3.Cj-2, 25.11.2026)

**Roata cu palete** (tipul `roataPalete`, fila Elice; Easy 3Draw 18.30.0). A doua piesă din 3.Cj.

- **Piesa:** butucul roților, paletele pornite din el, egal depărtate, până la diametrul cerut, și, la alegere, un disc
  pe fața de jos, care le ține între ele. Pe un ax, între două grinzi, împinge o barcă sau e învârtită de un jet de apă
  ori de aer. Paletele sunt pereți drepți, deci se tipărește culcată, fără suport.
- **Parametrii:** diametrul 24–160 mm (implicit 64; „Repede”: 32, 48, 64, 96, adică 4, 6, 8 și 12 știfturi), paletele
  4–24 (implicit 8), lățimea 4–40 mm (implicit 15,8, cât două grinzi), palete drepte sau curbate, cu disc sau fără,
  gaura de ax sau rotundă.
- **Paletele:** groase de 2 % din diametru, cel puțin 1,6 mm; discul, 1,2 mm. Drepte: pe rază. Curbate: arce de cerc cu
  coarda pe rază și săgeata de o cincime din lungimea paletei, toate în aceeași parte, ca niște cupe. Vârful fiecărei
  palete stă pe cercul roții (colțurile și mijlocul lui), deci roata are chiar diametrul cerut.
- **Butucul crește cu paletele:** cel al roților (raza 4,8), dar cel puțin 2,5 grosimi de paletă și cât să rămână 0,8 mm
  între palete lângă el; paleta curbată taie butucul pieziș, deci ține acolo de 1,38 ori grosimea ei. Butucul nu trece
  de jumătatea razei: de aici, câte palete încap pe o roată mică (la Ø24, 15 drepte sau 12 curbate). Motorul aduce
  numărul în margine și o spune; editorul ține paletele câte încap și scrie marginea lângă câmp.
- **Hotărât la implementare, capătul de la butuc al paletei curbate:** paleta pleacă din butuc pieziș (la 43,6° de
  rază), deci marginea ei de jos începe în afara butucului. Prima formă prelungea arcul înapoi până intrau amândouă
  colțurile în butuc; la roțile mici, marginea de jos doar atingea butucul, iar arcul îl ocolea și ieșea de partea
  cealaltă, ca o a doua paletă. A arătat-o proba, care numără paletele pe plasă (8 în loc de 4). Acum capătul coboară
  de la marginea de jos pe rază, până în butuc, și nu rămâne nicio crăpătură între paletă și butuc.
- **Prinderile:** gaura de pe ax; „Se prinde cu” îi propune axul de 3 (la lățimea implicită), iar axul o propune înapoi.
- **Probele:** unitare 8 (`test/unit/trenulet.palete.test.ts`). **Paletele se numără pe plasă:** pe cercuri dintre
  butuc și vârf, lemnul și golul alternează de atâtea ori câte palete sunt, iar fiecare e groasă cât pe hârtie; arcul
  paletei curbate, în puncte de pe hârtie (pe arc, lemn; la 1,1 mm de el, gol); butucul, pe hârtie, la zece mărimi;
  pe toată plaja (64 de roți), plasa închisă, gaura liberă, paletele câte s-au cerut și prinse de butuc. În browser 3
  (`test/e2e/trenulet.palete.spec.ts`), plus engleza editorului în proba limbii. Probele filelor („Elice 4”),
  galeriilor, pictogramelor, căutării și ale panoului „Se prinde cu”, la zi.
- **Mărimea:** doar pachetul extensiei (504,7 → 508,4 kB); aplicația, neschimbată.

## Implementat (3.Cj-3, 25.11.2026)

**Cadrul (fereastra)** (tipul `cadru`, fila Cărămizi; Easy 3Draw 18.31.0). A treia piesă din 3.Cj.

- **Piesa:** o cărămidă 1 × n cu un gol prin ea: o fereastră, o ușă, un portal. Jos, pragul: o placă obișnuită, goală pe
  dedesubt, deci piesa stă pe știfturi. Pe margini, doi stâlpi groși cât rama. Sus, buiandrugul: o placă plină, cu
  știfturi pe toată lungimea, deci se clădește peste ea. Se tipărește în picioare, fără suport: buiandrugul trece peste
  gol ca o punte.
- **Parametrii:** lungimea 2–8 știfturi (implicit 4), înălțimea 2–6 cărămizi (implicit 3), rama 1,2–4 mm (implicit 1,6),
  colțurile de sus ale golului, drepte sau teșite; mărimile uzuale („Repede”): 1×2×2, 1×2×3, 1×4×3, 1×4×5, 1×4×6.
- **Golul:** lat cât piesa fără cele două rame, înalt cât piesa fără prag și fără buiandrug (câte o placă). Cu colțurile
  teșite la 45°, puntea de sus (ce se tipărește în aer) se scurtează până la un știft, cât îi lasă înălțimea golului
  fără 2 mm (cât rămâne stâlpul drept). Editorul scrie golul și puntea, iar peste 40 mm spune că puntea se poate lăsa.
- **Hotărât la implementare:** stâlpii și buiandrugul sunt un singur corp (profilul cu golul, întins pe adâncime), la
  fața pragului și intrat 0,3 mm în capacul lui. Prima formă îl retrăgea cu 0,01 mm față de fețele pragului, ca două
  corpuri să nu-și împartă muchii; otrava care scotea retragerea a trecut toate probele (muchiile nu coincid nici fără
  ea), deci retragerea a ieșit din cod.
- **Prinderile:** locașurile pragului (câte unul pe știft) și știfturile de pe buiandrug; „Se prinde cu” îl leagă de
  cărămizi în amândouă sensurile.
- **Probele:** unitare 6 (`test/unit/trenulet.cadru.test.ts`): golul, judecat pe plasă la 0,15 mm de marginile lui, pe
  toată adâncimea; teșitura, în puncte de pe hârtie de o parte și de alta a ei; știfturile, până la marginea lor;
  locașurile, libere până sub capac; 120 de cadre pe toată plaja, cu plasa închisă și cotele de pe hârtie. În browser 3
  (`test/e2e/trenulet.cadru.spec.ts`). Probele filelor („Cărămizi 12”), galeriilor, pictogramelor, căutării și ale
  panoului „Se prinde cu”, la zi.
- **Mărimea:** doar pachetul extensiei (508,4 → 510,8 kB); aplicația, neschimbată.

## Implementat (3.Cj-4, 25.11.2026)

**Șurubul melc** (tipul `melc`, fila Roți; Easy 3Draw 18.32.0). Ultima piesă din 3.Cj.

- **Piesa:** un șurub pe ax, cu o spiră (un singur început, pe dreapta, ca la LEGO 4716). Într-un plan care trece prin
  ax, spira are profilul cremalierei de referință a roților de aici (20°, capul 1, piciorul 1,25, pasul π: modulul 1).
  În planul de mijloc al roții pereche, melcul e deci chiar cremaliera cu care motorul taie roțile: se prinde cu orice
  roată dreaptă de aici, cu axele în cruce, la `diam / 2 + z / 2`. La o tură a melcului, roata înaintează cu un dinte;
  roata nu poate întoarce melcul.
- **Parametrii:** diametrul de divizare, 8 mm („ca LEGO”) sau 16 mm („gros”); lungimea, 1–4 știfturi (8 · n − 0,2 mm);
  gaura de ax, în cruce, prin toată lungimea. Roata pereche (8–80 de dinți) e a editorului, nu a piesei: din ea se
  scrie montajul și pe ea o pune „Fă perechea” în listă (dreaptă, de 3,8 mm, cu gaură de ax: aceeași piesă cu cea din
  editorul roților).
- **Măsurat în LDraw, înaintea codului (4716):** Ø10,16 la vârf, Ø5,6 la fund, pasul 3,2 mm (8 LDU), 16 mm lungime,
  flancuri de aproape 20°, spira pe dreapta. Al nostru are Ø10 la vârf, Ø5,5 la fund și pasul π, al roților de aici
  (modelul LDraw rotunjește pasul la grilă).
- **Montajul:** cu melcul Ø8, roțile de 8, 24 și 40 de dinți cad la 1, 2 și 3 știfturi (ca la LEGO), iar cea de 16, la
  un știft și jumătate; cu melcul Ø16, roțile de 16 și 32 cad la 2 și 3 știfturi. Editorul spune unde cade axul roții:
  pe grila de știfturi, la jumătatea ei sau în afara ei (pe grilă cad roțile cu dinții din 8 în 8).
- **Subțierea spirei:** spira e înclinată (7,1° la Ø8, 3,6° la Ø16), iar dinții roții sunt drepți: spre marginile
  roții, spira mănâncă din joc. În studiul dinaintea codului (melcul pe hârtie, roata motorului pe plasă), fără
  subțiere, jocul pe o parte era 0,21 mm la Ø8 și 0,26 mm la Ø16, față de 2 · jocul dinților = 0,30 mm, cât e între
  două roți. Spira e deci subțiată pe fiecare flanc cu 0,1 mm la Ø8 și cu 0,05 mm la Ø16. Măsurat apoi pe plasele
  motorului: 0,30–0,32 mm pe o parte, cu roțile de 8, 16, 24, 40 și 80 de dinți, late de 3,8 și de 7,8 mm, fără nicio
  pătrundere la nicio fază; jocul urmează calibrarea (0,10–0,12 mm la jocul de 0,05; 0,47–0,52 mm la 0,25).
- **Miezul subțire la Ø8:** între colțul crucii (√(2,5² + 1²) = 2,69 mm de ax) și fundul spirei (2,75 mm) rămân
  0,06 mm; la vârful brațului, 0,25 mm (cifra din secțiunea 3.Cc). Un program de feliere nu tipărește asemenea pereți:
  miezul e, de fapt, patru coloane între brațele crucii, legate între ele de spiră. Editorul o spune și trimite la Ø16
  pentru sarcină (acolo rămân 4,06 mm). Nu e un avertisment al piesei: tot așa e făcută și piesa LEGO.
- **Tipărirea:** în picioare. Flancul de jos al spirei stă în consolă, la 70° de verticală; editorul recomandă straturi
  subțiri sau suport. **Nedovedit pe imprimantă:** rândul din coada owner-ului (fișa etapei 3).
- **Plasa:** secțiunea de-a latul axului (vârful, flancurile, care în secțiune sunt spirale ale lui Arhimede, fundul),
  repetată pe straturi rotite, 48 pe tură (săgeata sub 0,02 mm), cu punctele urcând pe elice. Mijlocul vârfului e un
  punct al secțiunii, deci din sfert în sfert de tură cade pe o axă, iar cutia piesei iese exactă.
- **Găsit de proba scrisă întâi:** `prismaStraturi` tăia fețele dintre straturi pe diagonala care, la straturi rotite,
  se întinde pe două laturi; triunghiurile mâncau din miez 0,06 mm la Ø16 („miezul e plin sub fundul spirei” cădea).
  Funcția a primit opțiunea `elice`: fețele se taie pe diagonala aproape verticală. Roata conică și conica dublă, care
  mai folosesc funcția, sunt neschimbate.
- **Prinderile:** gaura de ax, la amândouă capetele; „Se prinde cu” îl leagă de ax (axul de 3 pentru melcul de 2).
- **Probele:** unitare 8 (`test/unit/trenulet.melc.test.ts`): profilul spirei, judecat pe plasă la 0,07 mm de flancuri
  (trei raze, opt unghiuri, trei înălțimi: deci și pasul, și sensul); **angrenarea, pe plase:** roata motorului, cu
  axul unde spune montajul, nu intră în melc la nicio fază (opt faze, patru perechi), are jocul între 0,23 și 0,43 mm
  și intră cu o jumătate de pas alături sau cu axele apropiate cu 0,45 mm (martorii); la fel la marginile calibrării.
  În browser 3 (`test/e2e/trenulet.melc.spec.ts`). Probele filelor („Roți 10”), galeriilor, pictogramelor, ale stării
  unei liste vechi și ale panoului „Se prinde cu”, la zi.
- **Mărimea:** doar pachetul extensiei (510,8 → 514,4 kB); aplicația, neschimbată.
- **Cu melcul, 3.Cj e încheiată:** cama, roata cu palete, cadrul și melcul; manivela nu e o piesă nouă (secțiunea
  3.Cj-1).
