# ADR 0284: Construcțiile din Easy 3Draw: piese noi pe familii, punctele de prindere și Modelul ca asamblare

**Starea:** propus pe 24.11.2026, la cererea owner-ului („ok, vreau sa adaugi mai multe tipuri de piese pentru fiecare
categoire, sau sa imbunatatesti piesele si configuratoarele care exista deja. vreau ca userii sa poata crea cat mai multe
piese, care sa fie si compatibile intre ele nu doar una cate una ci si ca constructii complexe”), scrisă în sesiunea cloud
a liniei bibliotecii (ramura `wip/3.Xh-biblioteca-ui`). Codul pornește după răspunsurile lui la „Întrebările”.
**Continuă:** ADR 0169 (rotițele), 0280 (roțile, fuliile, conicele, șenila), 0281 (piesele pe file), 0282 (elicele),
0168 (înălțimile din profilul imprimantei). **Se leagă de:** felia 3.Tu a liniei elicelor (unde stă axul pieselor rotunde
în vederea „Modelul”; propusă ca ADR 0283, la răspunsurile owner-ului): partea D de aici pleacă de la ce hotărăște ea.

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
| 3.Ca | Conectorul perpendicular | piesa și configuratorul; „Ca LEGO” pentru formele uzuale |
| 3.Cb | Conectorul în unghi; axul cu opritor, știftul lung cu bucșă | piesa și opțiunile noi |
| 3.Cc | Cremaliera și melcul | cu montajul față de roata dințată și „Fă perechea” |
| 3.Cd | Arcul, balamaua, placa turnantă | trei piese în Cărămizi |
| 3.Ce | Punctele de prindere și „Se prinde cu” | motorul și panoul din configurator, pentru toate piesele |
| 3.Cf | Modelul: orientarea pe trei axe și alipirea la prinderi | după 3.Tu a liniei elicelor |
| 3.Cg | Modelul: verificarea (prins, plutește, se ciocnește) | avertismente pe piese și în listă |
| 3.Ch | Construcțiile cu nume și lista lor de piese | mai multe construcții în atelier |
| 3.Ci | Construcțiile gata | patru șabloane |
| 3.Cj | Cama și manivela, cadrul, roata cu palete | restul pieselor din B |

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

## Se redeschide dacă

- owner-ul alege altă ordine sau altă listă de piese;
- 3.Tu (axul pieselor rotunde în Model) hotărăște altfel decât presupune partea D;
- o piesă nouă nu se poate printa fără suport la mărimile uzuale (atunci, în două bucăți sau cu altă așezare);
- pachetul extensiei trece de o mărime care îngreunează instalarea (azi, sub 0,5 MB).
