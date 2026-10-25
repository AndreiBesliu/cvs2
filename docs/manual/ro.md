# Manualul CNC Vector Studio

## Primii pași
%% capitol: pornire
%% acopera: vedere.paleta, vedere.lista, vedere.proprietati, vedere.tema, editare.manual

CNC Vector Studio desenează piese pentru o freză CNC și scrie programul (G-code) pe care îl taie mașina. Lucrezi pe o
**foaie** (placa de material), pui pe ea forme, fiecare cu **operația** ei de tăiere, apoi exporți G-code-ul.

**Ecranul.** Pânza ține tot ecranul; deasupra ei plutesc:
- **bara de sus**: uneltele de desen, Lipire și Grilă, Anulează și Reface, importul și „Exportă G-code”;
- **extensia barei**, dedesubt: alinierea, oglindirea, vederea 3D și manualul;
- în dreapta sus: „Caută o comandă”, limba (RO / EN) și tema;
- în stânga, panoul **Pe foaie**: formele foii, cu piesa și operațiile fiecăreia; în dreapta, panoul **Proprietăți**;
- jos: ce e selectat, cursorul pe foaie (în mm, din colțul stânga-jos al foii), zoomul, jurnalul de erori, „Arată
  traseul” și „Arată toată foaia”.

Fiecare panou se strânge și se deschide din butonul din colțul lui („Panoul listei”, „Panoul de proprietăți”). Butonul
„Tema” trece prin temele luminoasă, întunecată și după sistem.

**Caută o comandă** (`Ctrl+K`): paleta de comenzi. Scrii câteva litere, alegi cu săgețile și apeși Enter; Esc o închide.
Paleta arată toate comenzile, cu tasta fiecăreia; la cele care se fac cu mausul spune cum.

**Manualul** se deschide cu butonul „?” din extensia barei sau cu `F1`. Cu F1 se deschide la capitolul a ce faci acum
(unealta aleasă, vederea 3D, fereastra deschisă). În manual poți căuta după cuvinte, cu sau fără diacritice.

**Unde se salvează.** Proiectul se salvează singur, în browserul ăsta, la fiecare schimbare. Vezi [Proiectul și
salvarea](#proiect).

## Pânza: zoom, deplasare, rigle și grilă
%% capitol: panza
%% acopera: vedere.potriveste, foaie.ghidaje, editare.lipire, editare.grila

- **Zoom**: rotița mausului, în jurul cursorului.
- **Deplasare**: tragi cu butonul din mijloc, sau ții Space și tragi.
- **Arată toată foaia** (`Home`): încadrează foaia în spațiul dintre panouri.

**Riglele**, în mm, stau pe marginea foii: cea de sus deasupra ei, cea din stânga la stânga ei, lungi cât foaia. La
deplasare și la zoom se mută odată cu foaia, și pe sub bare și panouri. Dacă formele ies din foaie, o **linie de cotă** continuă rigla și arată cu câți mm ies, pe fiecare parte.

**Ghidajele foii** se fac trăgând dintr-o riglă: din cea de sus iese un
ghidaj orizontal, din cea din stânga unul vertical. Un ghidaj se mută trăgându-l și se șterge lăsându-l înapoi pe riglă;
cu dublu clic pe el îi scrii poziția exactă. Ghidajele se salvează cu proiectul.

**Grilă**: butonul cu grila din bara de sus o arată pe foaie; pasul ei (între 0,1 și 1000 mm) se scrie în câmpul de lângă.

**Lipire**: cât e pornită, ce tragi (o formă, un mâner, capătul unei forme noi, un ghidaj) se lipește de ghidaje, de
marginile și centrul foii, de celelalte forme și de grilă; liniile de aliniere arată de ce s-a lipit. Ține apăsat `Alt` cât
tragi ca s-o inversezi: o oprește când e pornită, o pornește când e oprită.

## Foaia
%% capitol: foaia
%% acopera: foaie.stoc

Foaia e placa de material. Când nu e nimic selectat, panoul Proprietăți arată **Mărimea foii**: lățimea, înălțimea și
grosimea, în mm (lățimea și înălțimea până la 10 000 mm, grosimea până la 1 000 mm). Scrii valoarea și apeși Enter (sau ieși
din câmp); Escape revine la valoarea veche.

Toate pozițiile se măsoară din **colțul stânga-jos** al foii, cu X spre dreapta și Y în sus, ca pe mașină. Grosimea contează
la tăiere: o operație nu coboară sub fața de jos a foii, iar vederea 3D arată ce trece prin ea.

O formă care iese din foaie e semnalată în panoul Pe foaie, jos, în bara de stare, și pe riglă, cu linia de cotă (cu câți mm
iese).

## Desenul
%% capitol: desen
%% acopera: unealta.dreptunghi, unealta.cerc, unealta.elipsa, unealta.linie, unealta.poligon, document.deseneaza, document.adauga-dreptunghi, document.adauga-cerc

Uneltele de desen stau în bara de sus; fiecare are o tastă. Alegi unealta, apoi tragi pe pânză. **Desenează** o formă
nouă, cu operația ei implicită; unealta rămâne aleasă pentru forma următoare.

| Unealta | Tasta | Cum se trage | Cu Shift |
|---|---|---|---|
| Dreptunghi | `R` | din colț în colț | pătrat |
| Cerc | `O` | din centru; tragerea dă raza | — |
| Elipsă | `E` | din colț în colț | cerc |
| Linie | `L` | din capăt în capăt | pași de 15° |
| Poligon | `P` | din centru (poligon regulat) | pași de 15° |

- La **Cerc**, un clic fără tragere pune un cerc cu raza din câmpul de lângă unealtă; o tragere scrie raza ei în câmp.
- La **Poligon**, numărul de laturi (3–64) se scrie în câmpul de lângă unealtă.
- Capetele formei se lipesc ca orice altceva (vezi Lipire în [Pânza](#panza)).
- `Esc` anulează forma începută; încă un Esc întoarce la Selecție.

**Operația implicită** a unei forme noi: cercul e o gaură (profil interior, 8 mm în două treceri), dreptunghiul, elipsa,
poligonul și conturul închis sunt insule (profil exterior, 3 mm), iar linia se taie pe linie, un canal de cel mult 1 mm.
Freza e cea a foii (la început, freza plată Ø6). Operațiile se schimbă la export: vezi [Operațiile](#operatii).

În paleta de comenzi mai sunt **Adaugă dreptunghi** (100 × 60 mm) și **Adaugă cerc** (raza 15 mm), care pun forma într-un
loc fix pe foaie.

## Unealta Pen
%% capitol: pen
%% acopera: unealta.pen

Unealta **Pen** (`B`) desenează o cale nod cu nod, cu linii și curbe. Fiecare nod e un **colț** sau face **curbă**, pe ambele
părți sau doar pe o parte; tipurile sunt aceleași ca în unealta [Noduri](#noduri), unde se pot schimba oricând.
- **Clic**: un colț (segmentul până la el e drept, dacă nici nodul dinainte n-are mâner spre el).
- **Tragere**: un nod cu **curbă pe ambele părți**; tragi mânerul de înainte, iar cel de înapoi stă în oglindă (nodul e neted).
- **Shift + tragere**: **curbă pe o parte**, doar înainte: linia care vine intră dreaptă în nod, segmentul următor face curbă.
- **Clic pe ultimul nod**: îi scoate mânerul de înainte (curba rămâne doar înapoi); o tragere din el îi pune unul nou.
- **Clic pe primul nod** închide calea (o tragere de acolo îi pune mânerele primului nod). O cale închisă are cel puțin trei
  noduri, sau două cu o curbă între ele.
- **Enter** sau **dublu clic** termină calea deschisă; **Backspace** (sau Delete) scoate ultimul nod pus; **Esc** renunță la
  calea începută (încă un Esc întoarce la Selecție).

Nodurile se lipesc ca orice altceva (vezi Lipire în [Pânza](#panza)); mânerele nu. Segmentul următor se vede punctat până la
maus. Forma terminată e aleasă, cu operația implicită a unei căi (vezi [Desenul](#desen)): închisă, o insulă; deschisă, tăiată
pe linie. Pen-ul rămâne ales pentru calea următoare.

## Selecția și editarea
%% capitol: selectie
%% acopera: unealta.selectie, selectie.la-punct, selectie.din-lista, document.muta-selectia, document.duplica-selectia, document.sterge-selectia, istoric.anuleaza, istoric.reface, document.pozitioneaza, document.roteste, document.forma

Cu unealta **Selecție** (`V`), un clic pe o formă o **selectează**; un clic pe un rând din panoul Pe foaie face la fel. Un
clic pe pânza goală golește selecția. O piesă importată dintr-un fișier e o singură formă, cu toate contururile ei.

**Mai multe forme** se aleg cu un dreptunghi tras pe pânză, pornit de pe un loc gol, ca în programele de CAD:
- **de la stânga la dreapta** (cadru albastru, cu linie plină): se aleg doar formele cuprinse **în întregime** în dreptunghi;
- **de la dreapta la stânga** (cadru verde, punctat): se aleg toate formele pe care dreptunghiul le **atinge** (conturul lor,
  nu interiorul: un dreptunghi tras în mijlocul unui cerc, fără să-i atingă marginea, nu-l alege);
- **Shift + clic** pe o formă o adaugă la selecție sau o scoate; **Shift + tragere** adaugă formele prinse la cele alese deja;
- un clic pe o formă dintr-o selecție de mai multe le păstrează pe toate, iar tragerea care urmează le mută împreună;
- `Esc` renunță la dreptunghiul început.

Dreptunghiul merge și cu unealta Transformare, în afara mânerelor.

- **Mută selecția**: tragi forma pe pânză (se lipește, dacă Lipire e pornită), sau apeși săgețile: 1 mm, cu Shift 10 mm, cu
  Alt 0,1 mm.
- **Duplică** (`Ctrl+D`): o copie alături (20 mm la dreapta și 20 mm mai jos), selectată.
- **Șterge selecția** (`Delete`).
- **Anulează** (`Ctrl+Z`) și **Reface** (`Ctrl+Y`, sau `Ctrl+Shift+Z`): fiecare schimbare a proiectului se poate anula.

Lângă selecție apare bara ei, cu Duplică, Șterge și panoul de proprietăți.

**Panoul Proprietăți**, pentru forma selectată:
- **Poziționează selecția**: X și Y ale colțului stânga-jos al cutiei ei;
- **Rotește**: unghiul, în grade (pe o singură formă);
- **Schimbă forma**: mărimile formei, după fel: dreptunghiul (lățimea, înălțimea, raza colțurilor), cercul (raza),
  poligonul regulat (raza, laturile), elipsa (raza pe X, raza pe Y). Forma se recunoaște și după ce a fost scalată sau
  rotită. O piesă folosită de mai multe forme nu se schimbă de aici.
- operațiile formei, doar de citit: se schimbă din fereastra Exportă G-code.

Valoarea se aplică la Enter sau când ieși din câmp; Escape revine. O valoare care nu se poate aplica își spune motivul sub
câmp.

## Transformările, oglindirea, copierea și offsetul
%% capitol: transformari
%% acopera: unealta.transformare, document.transforma, oglindeste.orizontal, oglindeste.vertical, editare.inclinare, document.copiaza-in-retea, editare.offset

Unealta **Transformare** (`S`) arată mânerele pe cutia selecției și **transformă** forma exact (arcele rămân arce):
- **colțurile** scalează proporțional, cu colțul opus fix; cu Shift, liber pe ambele axe;
- **laturile** scalează pe o singură axă;
- **mânerul rotund de deasupra** rotește în jurul centrului; cu Shift, în pași de 15°.

Mânerele se lipesc de ghidaje, foaie, celelalte forme și grilă, doar pe axa pe care o scalează (`Alt` inversează lipirea).
Unele scalări nu se pot face exact și sunt refuzate, cu motivul: un cerc, o cale cu arce, un dreptunghi cu colțuri rotunjite
sau o formă rotită oblic se scalează doar proporțional; o piesă folosită și de alte forme nu se schimbă.

**Oglindirea** stă în extensia barei: **Oglindește orizontal** (`Shift+H`, stânga ↔ dreapta) și **Oglindește vertical**
(`Shift+V`, sus ↔ jos), față de centrul cutiei selecției. Se taie oglinda, cu același sens de tăiere.

**Înclină** (lângă oglindire, butonul cu un pătrat și paralelogramul lui) deschide un panou cu două unghiuri, în grade, între
−75° și 75° (gol = 0): **Orizontal** mută punctele spre dreapta cu cât sunt mai sus (un unghi negativ, spre stânga), apoi
**Vertical** le ridică cu cât sunt mai la dreapta, față de centrul cutiei selecției. Aria rămâne aceeași. Cât panoul e deschis,
cutia înclinată se vede pe pânză, punctat. Înclinarea intră exact în geometrie: liniile și curbele rămân linii și curbe, iar un
dreptunghi devine o cale (un paralelogram). O formă cu arce (un cerc, un dreptunghi cu colțuri rotunjite, o cale cu arce) nu se
înclină, fiindcă arcele ar deveni elipse: panoul spune asta, iar Înclină rămâne inactiv. Un singur pas de anulare.

**Copiază în rețea** (secțiunea Copiere din extensia barei, butonul cu patru pătrate) face copii ale selecției, într-un
singur pas de anulare. Copiile sunt piese independente (ca la Duplică): fiecare se poate schimba sau transforma separat.
- **Rânduri și coloane**: câte coloane și câte rânduri (cu originalul în colțul stânga-jos, cel mult 1000 de forme), și
  spațiul dintre copii pe fiecare direcție (mm, între cutiile lor). Copiile merg spre dreapta și în sus.
- **Pe cerc**: câte forme, cu originalul; unghiul (360°: cercul întreg, la pas egal; mai puțin: de la original până la
  ultima copie); centrul cercului (gol: centrul foii); **Rotește copiile** le rotește odată cu poziția, altfel doar le mută.
- **Pe curbă**: alege formele de copiat, apoi curba (o linie, o cale, un cerc, un dreptunghi), cu Shift + clic: curba e ultima
  formă aleasă. **Câte copii pe curbă** (1–1000) se așază la distanțe egale pe lungimea ei, cu centrul cutiei formelor pe
  curbă: pe o curbă deschisă, de la un capăt la celălalt; pe una închisă, de jur împrejur, de la primul ei vârf. **Rotește
  copiile după curbă** le întoarce după direcția curbei în fiecare loc (o formă desenată „spre dreapta” o urmează). Originalele
  și curba rămân pe loc; curba nu se copiază. Curba trebuie să fie o singură formă (nu o piesă cu mai multe contururi).

Cât panoul e deschis, copiile se văd pe pânză, punctat. Dacă rețeaua nu se poate face (valori greșite, nimic ales, proiectul
la plafon, copii prea departe), panoul spune de ce, iar Copiază rămâne inactiv. După copiere sunt alese originalul și copiile.

**Offset** (în extensia barei, lângă Copiere, butonul cu un pătrat într-un contur punctat) desenează un contur paralel cu
fiecare formă închisă aleasă, la distanța scrisă (mm, între 0,01 și 1000), **spre exterior** sau **spre interior**. Conturul
vine din același motor ca tăierea: exact, din linii și arce; colțurile ocolite se rotunjesc cu raza egală cu distanța (spre
exterior, colțurile ieșite; spre interior, cele intrânde), iar celelalte rămân ascuțite. Fiecare formă se decalează după interiorul ei (la o piesă cu mai multe contururi, fiecare
contur separat), iar un contur care se rupe în bucăți dă mai multe forme. Formele noi sunt căi independente, cu operația lor
implicită, alese după Aplică; originalele rămân, iar totul e un singur pas de anulare.
- Cât panoul e deschis, contururile noi se văd pe pânză, punctat.
- Formele deschise alese se sar (panoul spune câte); doar deschise, offsetul nu se poate face.
- Spre interior, o formă prea mică pentru distanța cerută oprește tot, cu motivul: nimic nu se face pe jumătate.

## Booleanul: unirea, scăderea, intersecția
%% capitol: boolean
%% acopera: boolean.uneste, boolean.scade, boolean.intersecteaza

Secțiunea Boolean din extensia barei lucrează pe **exact două forme închise**, alese în ordine: întâi una, apoi a doua cu
Shift + clic pe pânză. Rezultatul le **înlocuiește** pe amândouă, într-un singur pas de anulare, și rămâne ales.
- **Unește**: cele două forme devin una (reuniunea lor). Un dreptunghi și un cerc cu centrul într-un colț al lui dau un singur
  contur, cu arcul cercului rămas în afară.
- **Scade**: din **prima** formă aleasă se scoate **ultima**. Dacă ultima e înăuntrul primei, rezultatul e prima cu o gaură.
- **Intersectează**: rămâne doar partea comună.

Contururile sunt cele pe care le-ar tăia freza, iar rezultatul e exact: liniile rămân linii, arcele rămân arce din aceleași
cercuri. O curbă (desenată cu Pen sau importată) intră ca arce, la toleranța proiectului (0,001 mm), ca la tăiere. Un rezultat
cu găuri rămâne o singură piesă: conturul cu profil exterior, găurile cu profil interior (ca la import). Dacă rezultatul are
mai multe bucăți separate, fiecare e o formă nouă.

Butoanele sunt active doar cu două forme alese. Booleanul se refuză, cu motivul spus lângă butoane, dacă o formă e deschisă
(o linie) sau are mai multe contururi (o piesă importată), dacă formele nu se ating (unirea și scăderea nu le-ar schimba), dacă
nu au nimic în comun (intersecția) sau dacă din prima nu rămâne nimic (scăderea).

## Nodurile
%% capitol: noduri
%% acopera: unealta.noduri

Unealta **Noduri** (`N`) arată nodurile (vârfurile) formei alese și le schimbă:
- **trage un nod** ca să-l muți; se lipește ca orice altceva (vezi Lipire în [Pânza](#panza)), iar punctele de control ale
  curbelor vecine se mută odată cu el;
- **dublu clic pe o latură** adaugă un nod acolo, fără să schimbe forma (o linie, un arc sau o curbă se împart exact);
- un **clic pe un nod** îl alege; **Delete** (sau Backspace) îl scoate, `Esc` îl lasă. Deocamdată se scot doar nodurile dintre
  două linii; o formă închisă păstrează cel puțin trei noduri.

**Tipul nodului.** Un nod e un colț (pătrat pe pânză) sau face curbă (rotund), pe ambele părți sau doar pe o parte, ca în
unealta [Pen](#pen). Nodul ales își arată mânerele; butoanele din bara de sus, de lângă unelte, îi schimbă tipul:
- **Colț**: scoate mânerele (o curbă rămasă fără mânere redevine linie);
- **Curbă pe ambele părți**: pune mânerele pe aceeași dreaptă (nodul devine neted), cele noi pe bisectoarea direcțiilor din nod,
  cât o treime din segmentul lor;
- **Curbă pe o parte**: păstrează mânerul de înainte (sau pune unul în prelungirea liniei care vine, ca linia să intre lin în
  curbă) și îl scoate pe celălalt; încă un clic trece curba pe cealaltă parte.

**Trage un mâner** ca să schimbi curba; pe un nod neted, mânerul de pe cealaltă parte se rotește odată cu el (își păstrează
lungimea). Cu `Alt`, mânerele se despart (nodul rămâne curbă pe ambele părți, dar cu un colț). Capătul unei căi deschise are o
singură parte.

**Orice nod, din orice unealtă.** Un nod de pe un arc (cercul, colțurile rotunjite, rezultatele offsetului și ale booleanului) e
și el o curbă (rotund), iar mânerele lui sunt tangentele arcului. Când îi schimbi tipul sau îi tragi un mâner, arcul vecin
devine întâi curbe ale aceluiași cerc, cu noduri noi între ele (un semicerc de rază 15 devine 3 curbe), abătute de cerc cu cel
mult 0,001 mm, cât toleranța de tăiere: forma nu se schimbă până n-o schimbi tu.

Nodurile se editează pe o singură formă, a cărei piesă nu e folosită și de alte forme. La o piesă cu mai multe contururi (un
import, un boolean cu găuri), fiecare contur își arată nodurile și se editează separat. Un dreptunghi sau un cerc devine la
prima schimbare o **cale** cu același contur (colțurile rotunjite rămân arce), iar câmpurile lui din panou nu mai apar. Fiecare schimbare se poate anula cu `Ctrl+Z`.
Jos, un sfat spune ce se poate face sau de ce forma aleasă nu se poate edita.

## Alinierea
%% capitol: aliniere
%% acopera: editare.aliniere, document.muta-instantele, aliniaza.stanga, aliniaza.centru-x, aliniaza.dreapta, aliniaza.sus, aliniaza.centru-y, aliniaza.jos, aliniaza.distribuie-x, aliniaza.distribuie-y

Secțiunea **Aliniere** din extensia barei e mereu acolo; butonul ei o strânge spre stânga și o deschide la loc. Butoanele
**aliniază** cutiile formelor alese:

| Butonul | Ce face |
|---|---|
| Aliniază la stânga / Aliniază la dreapta | marginile din stânga / din dreapta, pe aceeași linie |
| Aliniază centrele pe orizontală | centrele, pe aceeași verticală |
| Aliniază sus / Aliniază jos | marginile de sus / de jos, pe aceeași linie |
| Aliniază centrele pe verticală | centrele, pe aceeași orizontală |
| Distribuie pe orizontală / Distribuie pe verticală | goluri egale între forme (cel puțin trei) |

Cu o singură formă aleasă, alinierea o pune față de foaie (de exemplu, „Aliniază la stânga” o duce la marginea din stânga a
foii). Mai multe forme se aleg cu dreptunghiul de selecție sau cu Shift + clic (vezi [Selecția și editarea](#selectie)).
Fiecare aliniere se poate anula cu `Ctrl+Z`.

## Importul SVG
%% capitol: import
%% acopera: import.svg, document.importa

Butonul **Importă SVG** din bara de sus deschide fereastra de fișiere (poți alege mai multe). Sau tragi fișierele SVG direct
pe pânză: fiecare cade cu centrul unde îl lași.

Pentru fiecare fișier se deschide o fereastră care arată mărimea desenului și cum se va tăia:
- **contururile închise**: cele din afară pe exterior, găurile din ele pe interior (după imbricare);
- **căile deschise**: pe linie, un canal de cel mult 1 mm (jumătate din foaie, dacă e mai subțire), într-o trecere; grosimea
  liniei din fișier nu contează, canalul are diametrul frezei;
- **cât înseamnă un px**: 1/96 țol (standardul CSS, Inkscape) sau 1/72 țol (Illustrator); un fișier scris de Illustrator e
  recunoscut;
- ce nu se importă sau se citește altfel (textele, clonele `<use>`, imaginile, formele ascunse), cu numărul lor.

**Importă** pune desenul pe foaie ca o singură formă, selectată; **Sari peste** trece la fișierul următor, **Renunță** și
**Renunță la toate** închid fereastra. Se importă doar fișiere SVG, de cel mult 16 MB, nearhivate (nu `.svgz`). Textul trebuie
transformat în contururi în programul de desen înainte de export.

## Operațiile de tăiere
%% capitol: operatii
%% acopera: document.aplica-operatii

Fiecare formă are o operație: un **profil** (freza merge de-a lungul conturului, în treceri, până la adâncime) sau un
**buzunar** (freza scoate tot materialul dinăuntrul unui contur închis, până la adâncime). Operațiile se schimbă din
fereastra **Exportă G-code**, câte un rând pe formă; la export, fereastra **aplică operațiile** în proiect.

| Câmpul | Ce înseamnă |
|---|---|
| Tăietura | **exterior** (piesa rămâne înăuntru), **interior** (o gaură), **pe linie** (freza pe contur), **buzunar** (golește conturul, vezi mai jos); pe o cale deschisă: pe linie, **stânga** sau **dreapta** (partea pe care merge freza, privind în sensul săgeții de pe planșă) |
| Sens | **urcare**: materialul care rămâne e în dreapta sensului de mers (ax M3); **opoziție**: invers. Pe linie nu contează |
| Adâncimea, Pasul | cât de adânc se taie și cât coboară o trecere (mm) |
| Urechi | punți care țin piesa în foaie pe ultimele treceri: câte pe buclă, lungimea și grosimea punții (de la fața de jos) |
| Rampă | freza coboară de-a lungul buclei, nu drept în material; lungimea rampei (cel puțin 1 mm) |
| Intrări | freza intră pe contur și iese pe câte un sfert de cerc, prin deșeu, ca peretele piesei să nu păstreze urma |
| Colțuri | degajarea colțurilor în care freza nu intră: **dog-bone** (pe diagonală) sau **T-bone** (în peretele mai lung) |
| Despărțire | o cale deschisă, tăiată prin toată foaia, în afara pieselor: se taie la urmă, ca să despartă foaia |
| Pasul lateral | doar pe un buzunar: distanța dintre inele, cel mult jumătate din diametrul frezei (implicit 40 %) |

**Buzunarul** scoate materialul în inele paralele cu conturul: primul la o rază de freză de perete, fiecare următor cu un pas
lateral mai înăuntru, tăiate dinăuntru spre perete, pe fiecare trecere. Freza trece de la un inel la următorul fără să se
ridice cât drumul rămâne în buzunar. Cu pasul lateral de cel mult jumătate din diametru, fundul iese neted peste tot; rămân
doar colțurile pe care nicio freză rotundă nu le atinge (cu raza frezei). Unde buzunarul e mai îngust decât freza, ea nu
intră. Pe un buzunar nu există urechi, rampă, intrări sau degajări.

**Insulele.** Buzunarele de pe foaie cu aceeași adâncime sunt un singur buzunar, oricare ar fi piesa lor: o formă cu
buzunar aflată în întregime în alta e o **insulă** (rămâne în picioare, iar freza o ocolește, cu peretele ei tăiat ca al
buzunarului), iar una aflată într-o insulă e iar buzunar. De exemplu, un dreptunghi și un text, amândouă cu buzunar de 3 mm:
literele rămân în relief, iar golurile lor (din „O”, „A”) se golesc. Pasul lateral și sensul vin de la conturul din afară;
ale insulei nu contează. Cu altă adâncime, fiecare buzunar se taie întreg: un buzunar mai adânc în altul face o treaptă.
Două contururi de aceeași adâncime care se ating sau se intersectează sunt refuzate (unește-le întâi cu booleanul sau dă-le
adâncimi diferite). Între o insulă și perete, un loc mai îngust decât freza rămâne netăiat.

Freza (Ø, plată) e una pentru toată foaia: dacă formele au freze diferite, la export primesc toate freza scrisă sus. Regimul
e fix deocamdată: axul la 18 000 rot/min (cu 3 s de așteptare), avansul 1 000 mm/min, plonjarea 300 mm/min, Z sigur 5 mm;
interioarele se taie primele.

## Traseul pe pânză
%% capitol: traseu
%% acopera: vedere.traseu

**Arată traseul** (`T`, sau butonul din bara de jos) calculează programul documentului și desenează pe pânză drumul frezei:
tăierile cu verde, mișcările rapide cu gri. Lângă el apare **timpul jobului**, estimat pentru setările mașinii (cele din
fabrică ale GRBL 1.1h, sau setările `$$` lipite în fereastra exportului).

Când schimbi desenul, traseul vechi se stinge, cu un semn jos; `T` îl calculează din nou. Încă un `T`, pe traseul la zi, îl
ascunde. Dacă programul nu se poate calcula, semnul spune de ce. Traseul cere WebGL2 în browser.

## Exportul G-code
%% capitol: export
%% acopera: export.gcode

**Exportă G-code** deschide fereastra exportului (GRBL 1.1). Pe lângă [operații](#operatii), alegi:
- **colțul de origine** al foii (stânga-jos, dreapta-jos, dreapta-sus, stânga-sus): unde e zero-ul X/Y pe mașină;
- **Z0**: fața de sus a materialului sau fața de jos (masa de sacrificiu);
- **freza plată Ø** (mm).

Butonul **Exportă** descarcă fișierul și arată câte linii are și amprenta lui SHA-256 (cu ea verifici că pe mașină ajunge
exact fișierul ăsta). Dacă freza ar ieși din foaie, fereastra spune cu cât și unde, iar exportul cere confirmarea ta că acolo
nu e nimic în cale (cleme, șuruburi); confirmarea se scrie în antetul programului.

**Rezumatul jobului** arată timpul estimat, pe operații și pe scule. Pentru timpii mașinii tale, lipește la „Setările
mașinii” răspunsul controlerului la `$$` (din consola senderului); programul nu se schimbă.

După descărcare, fereastra **simulează** programul: harta adâncimilor pe foaie, materialul scos, cea mai adâncă tăietură și
dacă freza trece prin foaie. Pentru placa văzută în 3D, vezi [Vederea 3D](#vedere-3d).

## Vederea 3D
%% capitol: vedere-3d
%% acopera: editare.3d

Butonul **3D** din extensia barei (**Vedere 3D**) pune în locul pânzei placa tăiată, văzută în trei dimensiuni. La deschidere, programul documentului
de acum se simulează pe toată placa (fără export), la 0,25 mm; pe o foaie mare, desenul e pe blocuri (cel mai adânc punct al
fiecăruia), iar starea din colț o spune.

- **Trage** ca să rotești; **butonul drept** (sau Shift + tragere) mută placa; **rotița** apropie spre punctul de sub
  cursor; **dublu clic** sau „Încadrează placa” o pune la loc în fereastră.
- De la tastatură: săgețile rotesc, `+` și `-` apropie și depărtează, `0` încadrează.
- **0,1 mm la apropiere**: când te apropii destul, zona din jurul centrului (cel mult 204,8 × 204,8 mm) se simulează din nou
  la 0,1 mm și se desenează peste placă; restul rămâne la 0,25 mm.

Culorile: fața plăcii, tăieturile (mai închise cu adâncimea) și, albastru-gri, masa de sacrificiu acolo unde freza a trecut
prin foaie. Dacă schimbi documentul cât vederea e deschisă, starea o spune; „Simulează din nou” îl simulează, cu placa
rămasă cum ai rotit-o. `Esc`, butonul 3D sau o unealtă de desen întorc la pânză. Vederea 3D cere WebGL2.

## Proiectul și salvarea
%% capitol: proiect

- Proiectul se **salvează singur**, în browserul ăsta (memoria locală), la fiecare schimbare; nu e nevoie de cont.
- Deschis în **două file**, proiectul se scrie doar dintr-una; cealaltă îl arată, doar de citit, și o spune jos.
- Dacă altă filă a salvat între timp, fila de aici se oprește din salvat și îți cere să reîncarci pagina.
- Aplicația merge și **fără rețea**, după prima încărcare (și manualul). Când apare o versiune nouă, jos apare „Versiune nouă
  gata”; se încarcă la clicul tău, nu în mijlocul lucrului.
- **Jurnalul de erori**: jos, cipul spune câte erori are jurnalul local al browserului. Dacă ceva se strică, aplicația arată
  „Ceva n-a mers”, cu „Copiază raportul” (îl poți trimite) și „Reîncarcă”.

## Testul pas cu pas
%% capitol: test
%% acopera: editare.test

Pe instanța de test, butonul **Test** din extensia barei, lângă „?” (titlul lui: „Testul pas cu pas”), deschide testul
uneltelor de desen într-un panou plutitor, pe care îl muți trăgând de titlu și îl strângi cu ▾. Fiecare pas spune ce faci și
ce trebuie să vezi; marchezi **Bine**, **Nu** sau **Sărit** și poți scrie o notă. **Poză** salvează imaginea planșei
(desenul, riglele, ghidajele, mânerele, traseul) în browser: nimic nu pleacă pe server. **Descarcă raportul** scrie un singur
fișier HTML, cu rezultatele, notele și pozele, de trimis mai departe. Lista de sus duce la orice pas. Rezultatele rămân și
după reîncărcare; **Începe din nou** le șterge, după o confirmare.

## Scurtăturile
%% capitol: scurtaturi

| Tasta | Ce face |
|---|---|
| `Ctrl+Z` | Anulează |
| `Ctrl+Y`, `Ctrl+Shift+Z`, `Ctrl+Shift+Y` | Reface |
| `Ctrl+D` | Duplică |
| `Delete` | Șterge selecția |
| `Ctrl+K` | Caută o comandă |
| `Home` | Arată toată foaia |
| `T` | Arată traseul |
| `V` `S` `N` `B` `R` `O` `E` `L` `P` | uneltele: Selecție, Transformare, Noduri, Pen, Dreptunghi, Cerc, Elipsă, Linie, Poligon (tasta e scrisă și în colțul butonului) |
| `Shift+H`, `Shift+V` | Oglindește orizontal, Oglindește vertical |
| săgețile | mută selecția 1 mm (Shift: 10 mm, Alt: 0,1 mm); în vederea 3D, rotesc placa |
| `Shift` + clic, `Shift` + tragere | adaugă la selecție (la clic, o formă aleasă deja iese din ea) |
| `Alt`, cât tragi | inversează lipirea |
| `Delete`, `Backspace` (cu unealta Noduri și un nod ales) | scoate nodul ales |
| `Enter` (cu unealta Pen) | termină calea începută |
| `Backspace`, `Delete` (cu unealta Pen și o cale începută) | scoate ultimul nod pus |
| `Alt`, cât tragi un mâner (unealta Noduri) | desparte mânerele nodului |
| `Esc` | anulează forma sau calea începută, lasă nodul ales, întoarce la Selecție, închide vederea 3D și ferestrele |
| `F1` | manualul, la capitolul de acum |

Pe Mac, `Ctrl` e `⌘`.
