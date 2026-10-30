# Manualul CNC Vector Studio

## Primii pași
%% capitol: pornire
%% acopera: vedere.paleta, vedere.lista, vedere.proprietati, vedere.tema, editare.manual

CNC Vector Studio desenează piese pentru o freză CNC și scrie programul (G-code) pe care îl taie mașina. Lucrezi pe o
**foaie** (placa de material), pui pe ea forme, fiecare cu **operația** ei de tăiere, apoi exporți G-code-ul.

**Ecranul.** Pânza ține tot ecranul; deasupra ei plutesc:
- **bara de sus**: uneltele de desen, Lipire și Grilă, Anulează și Reface și, la capăt, fișierele: importul, „Exportă
  vectori” și „Exportă G-code”;
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
Freza e cea a foii (la început, freza plată Ø6); fiecare operație poate avea alta, în fereastra exportului: vezi [Operațiile](#operatii).

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
- **Clic pe primul nod** închide calea. O tragere de acolo îi pune mânerele primului nod, cu calea închisă arătată cât tragi;
  cu **Shift**, se schimbă doar curba care închide (primul segment rămâne cum l-ai desenat). O cale închisă are cel puțin trei
  noduri, sau două cu o curbă între ele.
- **Dublu clic** pune ultimul nod și închide calea pe primul (cu prea puține noduri ca să se închidă, o termină deschisă);
  **Enter** termină calea deschisă; **Backspace** (sau Delete) scoate ultimul nod pus; **Esc** renunță la calea începută (încă
  un Esc întoarce la Selecție).
- **Ctrl+Z** cât desenezi anulează ultimul pas al căii (un nod, o tragere), nu ce era pe planșă înainte; **Ctrl+Y** (sau
  Ctrl+Shift+Z) îl reface. După ce ai terminat, Ctrl+Z anulează pe planșă, ca de obicei. **Ctrl+Shift+Z imediat după** ce ai
  terminat o cale (fără nimic de refăcut pe planșă) o redeschide, cu pașii ei: Ctrl+Z îi anulează pe rând, iar terminarea o pune
  din nou. Lăsată cu Esc, calea redeschisă se întoarce cu Ctrl+Y.

Nodurile se lipesc ca orice altceva (vezi Lipire în [Pânza](#panza)); mânerele nu. Segmentul următor se vede punctat până la
maus. Forma terminată e aleasă, cu operația implicită a unei căi (vezi [Desenul](#desen)): închisă, o insulă; deschisă, tăiată
pe linie. Pen-ul rămâne ales pentru calea următoare.

## Textul
%% capitol: text
%% acopera: unealta.text, document.text, editare.text.fonturi

Unealta **Text** (`X`; `T` e „Arată traseul”) scrie text de tăiat. Cu ea aleasă:
- un **clic pe foaie** pune ancora (o cruce): acolo începe linia de bază a primului rând (aliniat la stânga), îi stă
  mijlocul (centrat) sau capătul (la dreapta);
- un **clic lângă conturul unei forme** (un cerc, un arc, o curbă, un dreptunghi) pune ancora pe contur, în punctul cel mai
  apropiat, iar textul **urmează curba** (mai jos);
- un **clic pe un text** îl alege, ca să-l editezi.

În panoul uneltei scrii textul (Enter: rând nou) și alegi:
- **fontul**: cele **incluse** (Roboto, Droid Serif), **Fonturile mele** (încărcate de tine sau descărcate din Google
  Fonts) și, după ce permiți accesul, cele **ale sistemului**; sub câmpuri se vede textul, cum se va tăia;
- **înălțimea majusculelor**, în mm: la „20 mm”, H, N sau E au exact 20 mm (literele rotunde, ca O sau C, trec puțin peste
  linie, ca în orice font);
- **spațiul dintre litere** (în mm; negativ, mai strâns), **distanța dintre rânduri** (ca multiplu al rândului fontului) și
  **alinierea** față de ancoră.

**Adaugă** pune textul pe foaie ca o piesă: fiecare literă e un grup, cu golurile ei, tăiată ca un import (profilul pe
exterior pe contururile de afară, pe interior pe goluri; le schimbi în fereastra exportului, de exemplu în V-carve).
**Aplică** înlocuiește textul ales cu cel din panou, într-un singur pas de anulare; operațiile lui rămân, mutate pe literele
noi (profilul pe exterior pe contururile de afară, cel pe interior pe goluri, restul pe toate). În paletă, comanda e
**Scrie textul**.

Pe o curbă, panoul arată secțiunea **Pe curbă** (cu lungimea curbei), cu:
- **Poziția față de curbă**: **Deasupra** (literele stau peste curbă, cu coborârile pe ea), **Pe linia de bază**, **Centrat
  pe curbă** (mijlocul majusculelor pe curbă) sau **Dedesubt** (vârful majusculelor pe curbă);
- **Distanța de curbă** (mm), în plus, în sus (negativă: spre curbă și dincolo de ea);
- **Pe partea cealaltă**: textul trece de partea cealaltă a curbei (pe un cerc, înăuntru);
- **Literele verticale**: literele stau drepte, nu se rotesc după curbă;
- **Întins pe toată curba**: spațiul dintre litere crește cât textul să acopere curba (una deschisă de la un capăt la
  altul, una închisă tot ocolul, cu același spațiu și între ultima literă și prima).

Pe un cerc sau pe altă formă închisă, textul stă pe dinafară și se citește de la stânga la dreapta; ancora rămâne unde ai
dat clic, iar textul se aliniază față de ea (la stânga, centrat sau la dreapta). Mai lung decât o curbă deschisă, textul
continuă drept după capete; pe una închisă se reia. Literele se mută întregi, nu se îndoaie, deci contururile rămân exacte.
**Pe linie dreaptă** scrie textul drept, din ancoră (curba rămâne aleasă: **Pe curbă** îl pune înapoi). Curba se ține în
text: dacă schimbi sau ștergi forma, textul rămâne cum era; ca să urmeze forma nouă, dai din nou clic lângă ea.

**Adaugă fonturi…**, sub font, deschide fereastra fonturilor. Sus, **Textul de probă** (primul rând din panou sau, gol, o
probă cu diacriticele) se vede scris cu fiecare font din listă: în Fonturile mele și în cele ale sistemului, desenat din
contururile fontului, cum se va tăia (literele care lipsesc din font sunt numite); în Google Fonts, cu fiecare familie, în
stilul ales, **înainte de descărcare** (browserul aduce de la Google doar alfabetele textului de probă, iar ce se taie vine
din fișierul descărcat). Filele:
- **Fonturile mele**: **Încarcă fonturi…** primește TTF, OTF (și cele cu contururi CFF, ca fonturile Adobe), TTC (toate
  fețele) și WOFF; fonturile rămân în browserul ăsta, merg și fără rețea și nu pleacă nicăieri. **Folosește** alege fontul
  în panou, **Șterge** îl scoate (un text făcut cu el rămâne, doar nu se mai editează aici până nu-l încarci din nou);
- **Google Fonts**: cauți o familie (după nume, după categorie, doar cu diacriticele românești), alegi stilul și
  **Descarcă**: fontul vine o dată și intră în Fonturile mele. Pe alt calculator, un text cu un font Google îl cere din
  nou dintr-un clic (**Descarcă din nou**);
- **Ale sistemului**: **Permite accesul la fonturile sistemului** (Chrome și Edge, pe calculator) pune fonturile
  instalate în lista din panou și în fereastră, cu căutarea, proba fiecăruia și **Folosește**. Nu se copiază nicăieri:
  textul se editează doar unde fontul e instalat.

Înălțimea în mm se măsoară pe litera **H** a fontului (vârful ei e la „20 mm”); un font fără H folosește înălțimea
majusculelor scrisă în el. Un font variabil (ca Bahnschrift) se citește deocamdată doar în stilul lui implicit, iar un
WOFF2 se încarcă întâi convertit în TTF sau OTF.

Textul rămâne editabil și după salvare, cât timp contururile lui nu se schimbă pe altă cale: mutarea, rotirea, oglindirea și
scalarea uniformă îl păstrează (scalarea crește și înălțimea din panou); o scalare neuniformă, o înclinare sau o editare de
noduri îl fac vectori obișnuiți. **Degrupează** îl desface în litere, ca vectori. Ș și Ț se scriu cu virgulă (Ș ș Ț ț), ca
în română. Un caracter pe care fontul nu-l are nu se desenează, iar panoul îl spune.

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
dreptunghi devine o cale (un paralelogram). O formă cu arce (un cerc, un dreptunghi cu colțuri rotunjite, o cale cu arce) se
înclină doar cu bifa **Arcele devin curbe (cercul devine elipsă)**, care apare în panou doar atunci: arcele devin curbe Bézier,
la cel mult 0,001 mm de arcul înclinat, iar cercul iese o elipsă (o cale). Fără bifă, panoul spune de ce nu, iar Înclină rămâne
inactiv: cercul rămâne cerc dacă nu ceri altfel. Bifa pornește scoasă la fiecare deschidere a panoului. Un singur pas de anulare.

**Copiază în rețea** (secțiunea Copiere din extensia barei, butonul cu patru pătrate) face copii ale selecției, într-un
singur pas de anulare. Copiile sunt piese independente (ca la Duplică): fiecare se poate schimba sau transforma separat.
- **Rânduri și coloane**: câte coloane și câte rânduri (cu originalul în colțul stânga-jos, cel mult 1000 de forme), și
  spațiul dintre copii pe fiecare direcție (mm, între cutiile lor). Copiile merg spre dreapta și în sus.
- **Pe cerc**: câte forme, cu originalul; unghiul (360°: cercul întreg, la pas egal; mai puțin: de la original până la
  ultima copie); centrul cercului (gol: centrul foii); **Rotește copiile** le rotește odată cu poziția, altfel doar le mută.
- **Pe curbă**: alege formele de copiat, apoi curba (o linie, o cale, un cerc, un dreptunghi), cu Shift + clic: curba e ultima
  formă aleasă. **Câte copii pe curbă** (1–1000) se așază la distanțe egale pe lungimea ei, cu centrul cutiei formelor pe
  curbă: pe o curbă deschisă, de la un capăt la celălalt; pe una închisă, de jur împrejur, de la primul ei vârf. **Rotește
  copiile după curbă** le întoarce după direcția curbei în fiecare loc (o formă desenată „spre dreapta” o urmează). **Față de
  curbă**: **Pe ea** (centrul pe curbă; o distanță îl mută spre stânga mersului curbei, una negativă spre dreapta), **La stânga**
  sau **La dreapta** (formele lângă curbă, de acea parte, privind în sensul ei, cu punctul cel mai apropiat la distanța scrisă:
  0 = tangente). Un dreptunghi sau un cerc desenat merge în sens trigonometric, deci „la stânga” e înăuntru. Originalele și
  curba rămân pe loc; curba nu se copiază. Curba trebuie să fie o singură formă (nu o piesă cu mai multe contururi).

Cât panoul e deschis, copiile se văd pe pânză, punctat. Dacă rețeaua nu se poate face (valori greșite, nimic ales, proiectul
la plafon, copii prea departe), panoul spune de ce, iar Copiază rămâne inactiv. După copiere sunt alese originalul și copiile.

**Offset** (în extensia barei, lângă Copiere, butonul cu un pătrat într-un contur punctat) desenează un contur paralel cu
fiecare formă închisă aleasă, la distanța scrisă (mm, între 0,01 și 1000), **spre exterior** sau **spre interior**. Conturul
vine din același motor ca tăierea, exact, din linii și arce. **Colțurile:**
- **Ca originalul** (implicit): un colț ascuțit rămâne ascuțit, cu laturile prelungite până se întâlnesc. Un colț mai ascuțit
  de ~11° rămâne rotunjit (altfel vârful ar fugi departe de formă), la fel unul care s-ar apropia de altă parte a formei.
- **Rotunjite**: fiecare colț se rotunjește cu raza egală cu distanța, în ambele sensuri. Pe un dreptunghi, și spre interior.

Fiecare formă se decalează după interiorul ei (la o piesă cu mai multe contururi, fiecare contur separat), iar un contur care se rupe în bucăți dă mai multe forme. Formele noi sunt căi independente, cu operația lor
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

## Degruparea
%% capitol: degrupare
%% acopera: document.degrupeaza

Un import (SVG, DXF, PDF) e o singură piesă, cu toate contururile fișierului; la fel o formă cu găuri, făcută de boolean.
**Degrupează** (butonul de lângă boolean, meniul de clic dreapta, `Ctrl+Shift+G`) o desface: fiecare contur devine o piesă a
lui, care se alege, se mută, se scalează și se șterge singură. Desfacerea e pe un singur nivel: un subgrup (o literă cu golul
ei) rămâne întreg.

Fiecare parte stă exact unde era și își păstrează operația (latura, adâncimea, freza): **ce se taie rămâne același**. Ordinea
tăierii păstrează clasele (întâi interioarele, apoi liniile, la urmă exterioarele); o piesă cu mai multe operații pe aceleași
contururi (degroșare și finisare) le taie, după degrupare, contur cu contur. După degrupare, alese sunt toate părțile, iar un
singur `Ctrl+Z` le adună la loc.

Degruparea se refuză, cu motivul spus lângă butoane, dacă un **V-carve** își sapă contururile împreună (literele cu golurile
lor: despărțite, golurile s-ar săpa și ele), dacă piesa e folosită și de alte instanțe sau dacă nicio formă aleasă nu e un grup.

## Meniul de clic dreapta
%% capitol: meniu
%% acopera: editare.meniu

Clicul dreapta pe pânză deschide **meniul de clic dreapta**, cu ce se poate face pe selecție: **Degrupează**, apoi **Unește**,
**Scade** și **Intersectează** (booleanul), apoi **Duplică** și **Șterge selecția**, fiecare cu tasta lui. Pe o formă care nu e
aleasă, clicul dreapta o alege întâi; pe gol, selecția rămâne. Un rând e activ doar când se poate (booleanul, cu două forme;
degruparea, cu un grup ales); un refuz își spune motivul în meniu.

Săgețile trec între rânduri, `Enter` rulează rândul, `Esc` închide meniul; se închide și la un clic în afara lui, la rotiță sau
după o comandă făcută. În vederea 3D, clicul dreapta nu deschide meniul.

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
- **Curbă pe ambele părți**: pune mânerele pe aceeași dreaptă, pe bisectoarea direcțiilor din nod, și cu aceeași lungime
  (nodul devine neted): media celor două, lungimea celui care există, sau, fără niciunul, câte o treime din segmentul lui. Pe un
  nod cu mânerele despărțite, le unește din nou;
- **Curbă pe o parte**: păstrează mânerul de înainte (sau pune unul în prelungirea liniei care vine, ca linia să intre lin în
  curbă) și îl scoate pe celălalt; încă un clic trece curba pe cealaltă parte.

**Trage un mâner** ca să schimbi curba; pe un nod neted, mânerul de pe cealaltă parte se rotește odată cu el (își păstrează
lungimea). Cu `Alt`, mânerele se despart (nodul rămâne curbă pe ambele părți, dar cu un colț); pe mânerele despărțite, `Alt`
le unește din nou: celălalt devine oglinda celui tras, pe aceeași dreaptă și cu aceeași lungime. Capătul unei căi deschise are
o singură parte.

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

## Importul SVG, DXF, PDF și AI
%% capitol: import
%% acopera: import.svg, document.importa

Butonul **Importă SVG / DXF / PDF / AI** din bara de sus (primul dintre fișiere, lângă „Exportă vectori” și „Exportă
G-code”) deschide fereastra de fișiere (poți alege mai multe). Sau tragi fișierele direct pe pânză: fiecare cade cu centrul
unde îl lași.

Pentru fiecare fișier se deschide o fereastră care arată mărimea desenului și cum se va tăia:
- **contururile închise**: cele din afară pe exterior, găurile din ele pe interior (după imbricare);
- **căile deschise**: pe linie, un canal de cel mult 1 mm (jumătate din foaie, dacă e mai subțire), într-o trecere; grosimea
  liniei din fișier nu contează, canalul are diametrul frezei;
- la un SVG, **cât înseamnă un px**: 1/96 țol (standardul CSS, Inkscape) sau 1/72 țol (Illustrator); un fișier scris de
  Illustrator e recunoscut;
- la un DXF, **unitățile**: cele declarate de fișier se folosesc ca atare; unul care nu le declară (de exemplu un R12) se
  citește în mm, iar fereastra te lasă să alegi mm, cm, m, țol sau picior (mărimea desenului se schimbă pe loc);
- la un PDF cu mai multe pagini, **pagina** de importat (vezi mai jos);
- ce nu se importă sau se citește altfel, cu numărul lor (la un SVG: textele, clonele `<use>`, imaginile, formele ascunse).

**Importă** pune desenul pe foaie ca o singură formă, selectată; **Sari peste** trece la fișierul următor, **Renunță** și
**Renunță la toate** închid fereastra. Se importă fișiere SVG, DXF, PDF și AI, de cel mult 16 MB, nearhivate (nu `.svgz`). Textul
trebuie transformat în contururi în programul de desen înainte de export.

Un **DXF** se citește așa:
- DXF-ul text (ASCII), de la R12 la cele noi; unul binar e refuzat (salvează-l ca ASCII);
- desenul ajunge pe foaie unde e în fișier: originea DXF-ului e colțul foii (lăsat pe pânză, cade unde îl lași);
- fiecare formă își păstrează numele stratului;
- liniile, arcele, cercurile, poliliniile cu arce, elipsele și curbele (spline) intră exact: cercul rămâne cerc, curbele devin
  curbe Bézier; blocurile se desfac, cu scara, rotirea și matricea lor;
- bucățile deschise de pe același strat care se ating (capetele la cel mult 0,01 mm) se leagă: patru linii care fac un
  dreptunghi devin un contur închis; unde se întâlnesc trei capete (un T), nu se leagă;
- se sar, numărate: textele, hașurile, cotele, punctele, entitățile 3D, imaginile, straturile oprite sau înghețate și spațiul
  hârtiei (layout-urile).

Un **PDF** se citește așa (un **AI** salvat de Illustrator 9 sau mai nou e tot un PDF și se citește la fel):
- se importă o singură pagină: fereastra o citește pe prima, iar la un fișier cu mai multe pagini alegi alta din lista
  **Pagina**, și după un refuz (o copertă doar cu text n-are nimic de importat);
- desenul ajunge pe foaie unde era pe pagină: colțul stânga-jos al paginii afișate (cu decuparea și rotirea ei) e colțul
  foii;
- liniile și curbele intră exact, la scara 1:1 (curbele rămân curbe Bézier); o formă umplută după regula nonzero se
  redesenează ca la SVG;
- fiecare formă își păstrează numele stratului (OCG), dacă fișierul are straturi; formele de pe straturile oprite se sar;
- se sar, numărate: textele, imaginile și umbririle (gradientele); măștile de tăiere nu se aplică (ce decupează se importă
  întreg);
- un fișier protejat (cu parolă sau cu restricții de editare) e refuzat: salvează o copie fără protecție. Un AI de dinainte
  de Illustrator 9 sau un EPS e PostScript, nu PDF: salvează-l ca PDF, sau ca AI cu „Create PDF Compatible File” bifat (un AI
  salvat fără opțiunea asta arată doar o notă de text, iar fereastra îți spune s-o bifezi).

## Operațiile de tăiere
%% capitol: operatii
%% acopera: document.aplica-operatii

Fiecare formă are o operație: un **profil** (freza merge de-a lungul conturului, în treceri, până la adâncime), un
**buzunar** (freza scoate tot materialul dinăuntrul unui contur închis, până la adâncime), pe cercuri o **găurire**
(gaura cât cercul, vezi mai jos) sau un **V-carve** (freza în V sapă forma pe mijlocul ei, vezi mai jos). Operațiile se schimbă din
fereastra **Exportă G-code**, câte un rând pe formă; la export, fereastra **aplică operațiile** în proiect.

| Câmpul | Ce înseamnă |
|---|---|
| Tăietura | **exterior** (piesa rămâne înăuntru), **interior** (o gaură), **pe linie** (freza pe contur), **buzunar** (golește conturul, vezi mai jos), **găurire** (doar pe un rând numai cu cercuri), **V-carve** (sapă forma cu freza în V, vezi mai jos); pe o cale deschisă: pe linie, **stânga** sau **dreapta** (partea pe care merge freza, privind în sensul săgeții de pe planșă) |
| Sens | **urcare**: materialul care rămâne e în dreapta sensului de mers (ax M3); **opoziție**: invers. Pe linie nu contează; acolo, alături, **Direcția**: **ca desenul**, **invers** sau **cel mai scurt drum** (o cale deschisă pornește din capătul mai apropiat de locul în care a rămas freza; o buclă închisă rămâne cum e desenată) |
| Adâncimea, Pasul | cât de adânc se taie și cât coboară o trecere (mm) |
| Urechi | punți care țin piesa în foaie pe ultimele treceri: câte pe buclă, lungimea și grosimea punții (de la fața de jos) |
| Rampă | freza coboară de-a lungul buclei, nu drept în material; lungimea rampei (cel puțin 1 mm) |
| Intrări | freza intră pe contur și iese pe câte un sfert de cerc, prin deșeu, ca peretele piesei să nu păstreze urma |
| Colțuri | degajarea colțurilor în care freza nu intră: **dog-bone** (pe diagonală) sau **T-bone** (în peretele mai lung) |
| Despărțire | o cale deschisă, tăiată prin toată foaia, în afara pieselor: se taie la urmă, ca să despartă foaia |
| Pasul lateral | doar pe un buzunar: distanța dintre inele, cel mult jumătate din diametrul frezei (implicit 40 %) |
| Coborârea | doar pe un buzunar: cum intră freza în material la fiecare trecere: **plonjare** (implicit), **rampă pe inel**, **zigzag** sau **elice**, cu valorile lor (vezi mai jos) |
| Iese la fiecare al … pas | doar pe o găurire: după câți pași iese freza din gaură ca să scoată așchia (1–100, implicit 1) |

**Buzunarul** scoate materialul în inele paralele cu conturul: primul la o rază de freză de perete, fiecare următor cu un pas
lateral mai înăuntru, tăiate dinăuntru spre perete, pe fiecare trecere. Freza trece de la un inel la următorul fără să se
ridice cât drumul rămâne în buzunar. Cu pasul lateral de cel mult jumătate din diametru, fundul iese neted peste tot; rămân
doar colțurile pe care nicio freză rotundă nu le atinge (cu raza frezei). Unde buzunarul e mai îngust decât freza, ea nu
intră. Pe un buzunar nu există urechi, intrări sau degajări, iar rampa profilului e înlocuită de coborâre.

**Traseul buzunarului.** Sub rândul unui buzunar, **Traseul** alege între **inele (paralele cu conturul)**, implicit, și
**linii paralele**, la **Unghiul** dat față de X (de la 0 până sub 180°), cu pasul lateral între ele. Pe fiecare trecere, freza
trece întâi pe linii, legate la adâncime doar cu linia vecină și doar dacă drumul rămâne în buzunar (altfel se ridică), apoi pe
o **trecere de profil** de-a lungul marginii, ca peretele să iasă exact pe vector, nu în trepte. Liniile coboară prin plonjare
(rampa, zigzagul și elicea sunt ale inelelor); pe linii, freza taie dus-întors, deci alternativ în urcare și în opoziție, iar
trecerea de profil urmează sensul rândului. Insulele și frezele de rest merg la fel ca la inele.

**Frezele de rest.** Sub rândul unui buzunar, **Adaugă o freză de rest** pune după freza rândului una mai mică (implicit
jumătate din diametru, cu T-ul următor liber și pasul de 40 %); se pot pune mai multe, fiecare mai mică decât cea dinainte, și
se scot cu ×. Fiecare taie doar unde cea dinainte n-a ajuns: colțurile și fâșiile mai înguste decât ea, pe aceleași treceri;
nu mai trece pe lângă pereții pe care cea mare i-a tăiat deja. Colțurile rămân cu raza celei mai mici. De exemplu, un buzunar
de 80 × 40 cu Ø12 și apoi Ø3: Ø12 scoate aproape tot, Ø3 doar cele patru colțuri, rotunjite cu 1,5 mm în loc de 6. O freză de
rest care n-are ce scoate (un cerc pe care cea mare îl golește întreg) nu se montează, iar exportul o spune. Fiecare freză
cere numărul ei (T); programul o schimbă după cea dinainte. Ele coboară drept, pe o adâncime de cel mult un pas.

**Coborârea.** La fiecare trecere, freza intră în buzunar la începutul primului inel (și acolo unde trebuie să se ridice
între inele). Felul se alege la **Coborârea**:

- **Plonjare (fără rampă)**, implicit: drept în jos, cu avansul de plonjare.
- **Rampă pe inel**: freza coboară de-a lungul inelului, cu panta dată de **unghi** (între 0,5° și 45°, implicit 3°), apoi
  mai face o tură întreagă la adâncime, peste tot ce a tăiat rampa mai sus.
- **Zigzag**: dus-întors pe primii milimetri ai inelului (**lungimea**, implicit 20 mm), cu panta cel mult unghiul; fereastra
  arată câte rampe ies pe o trecere (din unghi, lungime și pasul pe trecere). Apoi o tură întreagă la adâncime.
- **Elice**: pe un cerc de **raza** dată (implicit jumătate din diametrul frezei), cu centrul ales de aplicație acolo unde
  încape; după elice, un cerc plin la adâncime, apoi inelul. Unde elicea nu încape, freza coboară pe inel, cu același unghi,
  iar rezumatul exportului spune asta.

Fiecare coboară întâi, cu avansul de plonjare, până la fundul trecerii de dinainte (acolo materialul e deja scos), apoi taie
în pantă cu un avans ales așa încât freza să nu coboare mai repede decât la plonjare. Drumurile coborârii stau în buzunar:
pe inel sau pe cercul elicei, în bucata lui.

**Insulele.** Buzunarele de pe foaie cu aceeași adâncime sunt un singur buzunar, oricare ar fi piesa lor: o formă cu
buzunar aflată în întregime în alta e o **insulă** (rămâne în picioare, iar freza o ocolește, cu peretele ei tăiat ca al
buzunarului), iar una aflată într-o insulă e iar buzunar. De exemplu, un dreptunghi și un text, amândouă cu buzunar de 3 mm:
literele rămân în relief, iar golurile lor (din „O”, „A”) se golesc. Pasul lateral și sensul vin de la conturul din afară;
ale insulei nu contează. Cu altă adâncime, fiecare buzunar se taie întreg: un buzunar mai adânc în altul face o treaptă.
Două contururi de aceeași adâncime care se ating sau se intersectează sunt refuzate (unește-le întâi cu booleanul sau dă-le
adâncimi diferite). Între o insulă și perete, un loc mai îngust decât freza rămâne netăiat.

**Găurirea.** Pe un rând numai cu cercuri, Tăietura are și **găurire**: gaura iese cât cercul din desen, cu freza plată a
rândului, scrisă doar cu mișcări simple (G0, G1, G2, G3), fără ciclurile de găurire G81–G83 pe care GRBL nu le are.
- Un **cerc cât freza** (diametrul ei, ± 0,02 mm) se găurește în centru, **cu ciocănire**: freza coboară cu pasul pe trecere,
  cu avansul de plonjare; după fiecare pas se ridică 1 mm (rupe așchia), iar la fiecare al câtelea pas scris la **Iese la
  fiecare al … pas** iese până la Z sigur (scoate așchia) și coboară repede până la 0,5 mm deasupra fundului.
- Un **cerc mai mare**, până la două diametre ale frezei, se face **în elice** pe perete: ture de cel mult un pas pe trecere,
  apoi un cerc plin la fund, ca fundul să iasă neted. Sensul: la urcare, trigonometric; la opoziție, orar. Freza nu coboară
  mai repede decât la plonjare.
- Un cerc mai mic decât freza sau peste două diametre ale ei e refuzat, cu motivul (peste două diametre, în mijloc ar rămâne
  un miez: folosește buzunarul). Pe o găurire nu există urechi, rampă, intrări, degajări sau despărțire; găurile se taie cu
  interioarele.

**V-carve-ul.** Pe contururi închise, Tăietura are și **V-carve**: freza în V merge pe mijlocul formei (axa ei medială) și
coboară în fiecare punct cât încape între pereți: adâncimea e distanța până la cel mai apropiat perete împărțită la
tan(θ/2), unde θ e unghiul frezei (la 90°, cât distanța; la 60°, de 1,73 ori mai mult). Pereții ies înclinați, exact pe
contur, iar colțurile ascuțite rămân ascuțite: literele, ornamentele, conturul unui logo.
- Contururile rândului se citesc împreună, par-impar: un „O” e inelul dintre cele două contururi, nu două forme.
- **Adâncimea** e cea maximă. Unde forma e mai lată decât freza la acea adâncime, freza merge la ea pe mijloc și pe un contur
  paralel cu peretele, iar între ele rămâne un **fund plat**.
- **Fundul plat cu freza dreaptă**: bifa de sub rândul V-carve-ului, cu freza dreaptă (numărul ei, alt T decât V-ul; implicit
  T-ul V-ului + 1, Ø3,175) și pasul ei lateral (cel mult jumătate din diametru, implicit 40 %). Întâi freza dreaptă scoate
  fundul, nivel cu nivel, fără să atingă pereții; apoi freza în V taie pereții și colțurile în care cea dreaptă nu ajunge
  (colțurile ascuțite ale fundului și canalele mai înguste decât ea), cu inele dese: acolo rămâne o creastă de cel mult
  0,05 mm. Programul are o schimbare de freză între ele. Fără bifă, fundul rămâne netăiat, iar exportul o spune, ca
  avertisment; o formă fără fund plat nu montează freza dreaptă deloc. Sub freza dreaptă, **Adaugă o freză de rest** pune
  după ea alte freze drepte, tot mai mici, care scot fundul doar unde cea dinainte n-a ajuns (ca la buzunar); freza în V
  vine după toate, doar unde n-a ajuns cea mai mică.
- **Pasul**: la fiecare trecere, freza coboară cel mult cu pasul față de trecerea de dinainte.
- Freza rândului trebuie să fie **în V** (vezi [Exportul G-code](#export)), iar conul ei, ((diametrul − vârful) / 2) / tan(θ/2),
  trebuie să ajungă la adâncimea cerută; altfel exportul e refuzat, cu motivul. Pe un V-carve nu există urechi, rampă, intrări,
  degajări sau despărțire, iar o cale deschisă e refuzată.

**Freza în V cu vârf plat (freza de gravare).** La freza în V, lângă unghi, **Vârful** e diametrul platoului de la vârful ei,
în mm: 0 = vârful ascuțit (implicit), altfel sub diametrul frezei. Simularea și exportul țin cont de el: pe linie, fundul
canalului e lat cât vârful; în V-carve, freza coboară doar unde forma e mai lată decât vârful, iar colțurile ascuțite rămân
rotunjite cu jumătate din vârf (o regiune peste tot mai îngustă decât vârful e refuzată, cu motivul). Două freze cu același
T, același unghi și alt vârf sunt două freze: exportul cere numere diferite.

**Gravarea pe linie.** Pe linie, freza poate fi și în V: centrul ei merge exact pe vector, la adâncimea rândului, iar canalul
iese lat de vârful + 2 · adâncimea · tan(θ/2) (la V90 și 1 mm: 2 mm), cu pereții înclinați. Conul frezei trebuie să ajungă la
adâncime, ca la V-carve. **Pe o parte** (exterior, interior, stânga, dreapta), **într-un buzunar** sau **la găurire**, freza
în V e refuzată, cu motivul: acolo lucrarea ar decala-o ca pe o freză plată, iar peretele n-ar ieși unde e desenat (teșirea
pe contur vine mai târziu).

**Gravarea inteligentă** (smart engrave) e un V-carve cu fund plat și o freză de gravare: freza dreaptă golește interiorul
literelor, apoi freza în V cu vârf plat (de obicei 15° pe flanc, adică 30° la Unghiul V) face pereții înclinați și urcă în
colțuri ca să le ascută. De exemplu, un pătrat de 20 mm la 2 mm, cu freza dreaptă Ø2 și freza de gravare de 30° cu vârful de
0,25 mm: pereții ies la 15°, iar colțurile la suprafață au raza de 0,13 mm (cu Ø2 singură ar fi 1 mm). Deocamdată fundul îl
scoate o singură freză dreaptă; mai multe, de la cea mai mare la cea mai mică, vin cu buzunarul cu mai multe freze.

Fiecare rând își are freza lui (vezi [Exportul G-code](#export)). Regimul e fix deocamdată: axul la 18 000 rot/min (cu 3 s de așteptare), avansul 1 000 mm/min, plonjarea 300 mm/min, Z sigur 5 mm;
interioarele se taie primele.

## Traseul pe pânză
%% capitol: traseu
%% acopera: vedere.traseu

**Arată traseul** (`T`, sau butonul din bara de jos) calculează programul documentului și desenează pe pânză drumul frezei:
tăierile cu verde, mișcările rapide cu gri. Lângă el apare **timpul jobului**, estimat pentru setările mașinii (cele din
fabrică ale GRBL 1.1h, sau setările `$$` lipite în fereastra exportului).

Când schimbi desenul, traseul vechi se stinge, cu un semn jos; `T` îl calculează din nou. Încă un `T`, pe traseul la zi, îl
ascunde. Dacă programul nu se poate calcula, semnul spune de ce. Traseul cere WebGL2 în browser.

Calculul (traseul, timpul, exportul, vederea 3D) rulează separat de desen: pe un proiect mare, pânza nu se oprește cât se
calculează. Dacă schimbi desenul înainte să fie gata traseul, calculul lui se oprește; `T` îl pornește din nou, pe desenul de
acum.

**Animează**, lângă timpul jobului, deschide animația traseului: freza merge pe traseu în timpul mașinii (aceeași estimare
ca timpul jobului), iar drumul parcurs se colorează pe pânză. În panou: **Rulează** / **Pauză**, **Pasul anterior** și
**Pasul următor** (câte o mișcare a programului), **Viteza** (1× înseamnă timpul real; implicit, toată animația ține cam un
minut) și glisorul (`Home` la început, `End` la final). Dedesubt: timpul din total, pasul, ce face freza (deplasare, tăiere
cu avansul, arc, pauză, schimbarea sculei) și lucrarea ei, poziția X Y Z și freza montată. Cercul frezei e cât diametrul ei,
plin cât e în material. `Esc` sau **×** închid animația; dacă schimbi desenul, se închide singură.

## Exportul G-code
%% capitol: export
%% acopera: export.gcode

**Exportă G-code** deschide fereastra exportului. Pe lângă [operații](#operatii), alegi:
- **colțul de origine** al foii (stânga-jos, dreapta-jos, dreapta-sus, stânga-sus): unde e zero-ul X/Y pe mașină;
- **Z0**: fața de sus a materialului sau fața de jos (masa de sacrificiu);
- **Postul**: controlerul mașinii, din familia GRBL (GRBL 1.1, grblHAL, FluidNC). Un post scris doar după documentația
  controlerului, încă neprobat pe o mașină, poartă o notă: urmărește primul program în aer;
- **Unitățile**: mm (implicit) sau inch (G20, cu 5 zecimale și avansul în inch/min); antetul rămâne în mm;
- **Schimbarea frezei**, doar când rândurile au freze diferite: **oprire în senderul aplicației** (implicit: lucrarea se
  oprește la `T… M6`, scoți freza, o pui pe următoarea, palpezi Z și **Continui**), **M6 la controler** (grblHAL, FluidNC, cu
  schimbarea configurată acolo), **M0, cu freza în comentariu** sau **câte un fișier pe freză** (se descarcă toate).

Fiecare rând are **freza** lui: numărul sculei (T), diametrul (mm) și forma: **plată** sau **în V**, cu unghiul inclus al
vârfului (între 1° și 179°, implicit 60°; la V, diametrul e cel al părții tăietoare). Rândurile cu freze diferite se taie cu o
schimbare între ele: în fiecare clasă (interioarele, apoi pe linie, apoi exterioarele), întâi freza deja montată, ca
schimbările să fie cât mai puține. Același număr cu două diametre sau două forme e refuzat: fiecare freză cere numărul ei.

Butonul **Exportă** descarcă fișierul și arată câte linii are și amprenta lui SHA-256 (cu ea verifici că pe mașină ajunge
exact fișierul ăsta). Dacă freza ar ieși din foaie, fereastra spune cu cât și unde, iar exportul cere confirmarea ta că acolo
nu e nimic în cale (cleme, șuruburi); confirmarea se scrie în antetul programului.

**Rezumatul jobului** arată timpul estimat, pe operații și pe scule. Pentru timpii mașinii tale, lipește la „Setările
mașinii” răspunsul controlerului la `$$` (din consola senderului); programul nu se schimbă.

După descărcare, fereastra **simulează** programul: harta adâncimilor pe foaie, materialul scos, cea mai adâncă tăietură și
dacă freza trece prin foaie. Pentru placa văzută în 3D, vezi [Vederea 3D](#vedere-3d).

## Exportul vectorilor
%% capitol: vectori
%% acopera: editare.vectori

**Exportă vectori** (în bara de sus, între import și „Exportă G-code”) scrie foaia ca fișier de desen, pentru alte programe (ArtCAM,
Inkscape, Illustrator / Corel, AutoCAD / LibreCAD) sau pentru laser:
- **DXF (R2007)**, implicit, **SVG**, **PDF** sau **EPS**;
- în mm, la scara 1:1, din colțul stânga-jos al foii (în SVG, foaia are mărimea ei în mm);
- **cercurile, arcele și curbele rămân ce sunt**: cercul e cerc (CIRCLE), liniile și arcele unei forme sunt o polilinie cu
  arce, curbele sunt curbe (SPLINE în DXF, `C` în SVG), fără puncte aproximate. PDF-ul și EPS-ul n-au arce: acolo cercurile
  și arcele ies din câteva curbe, la cel mult 0,001 mm de ele (cercul R50 din 7);
- **un strat pe rol**, după prima operație care taie forma: EXTERIOR, INTERIOR, PE_LINIE, PE_O_PARTE (o cale tăiată pe
  stânga sau pe dreapta), BUZUNAR, GAURIRE și FARA_OPERATIE, fiecare cu culoarea lui; scrise doar straturile folosite. În PDF
  sunt straturi PDF (le vezi și le ascunzi în cititor); EPS-ul n-are straturi, deci rolul rămâne doar în culoare;
- **Cu conturul foii** adaugă dreptunghiul foii, pe stratul FOAIE.

**Exportă** descarcă fișierul și spune câte entități și câte straturi are. O formă cu și linii, și curbe iese în bucăți
legate cap la cap (o polilinie, apoi o curbă).

## Mașina
%% capitol: masina
%% acopera: vedere.masina

Panoul **Mașina** (în dreapta, sub proprietăți) trimite programul la mașină, prin cablul USB, și îi arată starea.

- **Conectează (USB)** te lasă să alegi portul mașinii (GRBL, 115 200 baud). Merge doar în Chrome sau Edge pe un calculator
  (Web Serial); altfel, panoul spune asta. Pe instanța de test mai e și **Mașină simulată**: un controler GRBL simulat, ca să
  încerci panoul fără CNC, cu **Viteza** 1×, 10× sau 100×. **Deconectează** închide portul.
- **Starea** vine din rapoartele mașinii (de 5 ori pe secundă): Idle, Run, Hold:0 (oprită), Hold:1 (încă frânează), Alarm, și
  poziția (de lucru, când se știe; altfel a mașinii).
- **Programul**: **Ultimul export** încarcă exact fișierul ultimului Exportă G-code (amprenta SHA-256 e aceeași cu cea din
  fereastra exportului); **Fișier…** încarcă un G-code din alt program, verificat întâi. Un program se refuză, cu linia, dacă are
  caractere în afara ASCII (la GRBL, „ș” și „ț” ar schimba turația axului), capete de linie Windows (`\r`), linii de peste 70 de
  octeți, nu alege un sistem de coordonate (`G54`–`G59`) înaintea primei mișcări, schimbă scula (`M6`) fără să fie exportat de
  aici sau n-are capăt de linie la sfârșit. Cu câte un fișier pe freză, **Fișierul ultimului export** alege care se încarcă.
- **Pornește** trimite programul linie cu linie, cât încape în memoria mașinii. Lucrarea arată faza și linia. **Pauză** oprește
  mișcarea (Hold), **Reia** o continuă. O eroare a mașinii pe o linie oprește lucrarea în pauză și o arată în listă; **Reia după
  eroare** continuă de la prima linie netrimisă. La o schimbare de sculă (`M6`) sau o pauză din program (`M0`), lucrarea se
  oprește după ce mașina termină mișcările (la sculă, cu axul oprit); muți, palpezi, faci zero, apoi **Continuă**. La o schimbare
  de freză, lucrarea spune ce freză se montează (de exemplu „montează T2 freza plata D3.000”); ridică freza cu jog înainte de
  palpare: la Z sigur e sub fața plăcii.
- **Oprește** e repornirea mașinii (Ctrl-X): se oprește pe loc, iar lucrarea nu se mai poate relua (se pornește din nou de la
  început). La fel după o alarmă sau dacă se pierde cablul. **Deblochează ($X)** apare când mașina e în alarmă.
- **Comanda** trimite o linie la mașină (de exemplu `$G`, `$#`, `G0 X10`), doar când nu merge o lucrare; răspunsul apare în
  **jurnal**. Citirile `$` pleacă doar când mașina stă (altfel GRBL le refuză).

Lucrarea e „gata” abia după ultimul răspuns al mașinii și după ce raportează Idle: o pauză nu o încheie.

**Erorile și alarmele mașinii.** Când mașina răspunde cu un cod (`error:N`, o linie refuzată; `ALARM:N`, mașina s-a oprit), sub
stare apare explicația lui: ce s-a întâmplat, unde (linia programului, comanda, jog-ul, palparea) și **Ce faci**, cu butoanele
care ajută: **Oprește** (când mașina cere repornirea, „Reset to continue”), **Deblochează ($X)**, **Reia** (după ușa de
siguranță), **Mergi la jog** și **Mergi la palpare** (te duc la butoanele lor). **Am înțeles** ascunde explicația până la codul
următor; lista erorilor și jurnalul arată și ele titlul fiecărui cod.
- Explicația vine din tabelul controlerului tău, după cum se prezintă la conectare: GRBL 1.1, grblHAL sau FluidNC (până atunci,
  GRBL 1.1, scris sub explicație). Același număr înseamnă altceva la fiecare: `ALARM:10` e al doilea limitator al unei axe duble
  la GRBL, oprirea de urgență la grblHAL. Un cod pe care tabelul nu-l are se arată ca atare, fără o explicație ghicită.
- După o alarmă care pierde poziția (un limitator atins, o repornire în mișcare, un homing eșuat), **Deblochează** cere întâi
  confirmarea: poziția nu mai e sigură, deci fă homing (`$H`) sau refă zero-ul X, Y și Z. **Deblochează oricum** trimite `$X`,
  **Renunță** nu trimite nimic.
- Explicațiile merg și fără rețea, după prima încărcare a aplicației.

**Poziționarea** (cu mașina conectată):
- **Coordonatele de lucru**: sistemul activ al mașinii (G54–G59), citit de la ea; poziția de lucru se arată în el. Dacă
  programul încărcat taie în altul, panoul o spune și oferă **Treci pe** acela.
- **Jog**: săgețile mută freza cu **Pasul** ales (0,1, 1, 10 sau 100 mm) și cu **Avansul** dat; diagonalele sunt o singură
  mișcare, în linie dreaptă; Z+ și Z− în dreapta. **Oprește jog-ul** apare cât mașina e în Jog.
- **Zero XY** și **Zero Z** fac poziția de acum 0 în sistemul programului încărcat (altfel în cel activ), scris pe buton.
  Dedesubt: unde e Z0 pentru programul exportat de aici (fața de sus a materialului sau cea de jos, pe masă) și colțul
  originii XY.
- **Palparea Z**: pune placa de contact sub freză (pe material, dacă Z0 e sus; pe masă, dacă e jos), prinde clema și apasă
  **Palpează Z**. Freza coboară până atinge placa (cel mult **Distanța de căutare**, cu **Avansul căutării**), se ridică 2 mm,
  atinge din nou încet, scrie Z0 (atingerea minus **Grosimea plăcii**) și se ridică 5 mm. După palpare, mașina e în modul de
  dinainte (de obicei G90, în mm). Fără atingere, mașina intră în alarmă (ALARM:5); dacă freza atingea deja placa, ALARM:4:
  deblochează ($X) și încearcă din nou.
- Ce nu se poate acum e dezactivat, cu motivul alături („Nu acum: mașina e în alarmă…”): în alarmă, cât merge o lucrare sau o
  procedură. Oprit la o schimbare de sculă, merg jog-ul, palparea și zero-ul Z, nu și zero-ul XY.

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
- Aplicația merge și **fără rețea**, după prima încărcare (și manualul). La prima vizită, jos apare „Pregătesc lucrul offline”,
  cu procentul; când dispare, aplicația merge și fără rețea. Când apare o versiune nouă, jos apare întâi „Se descarcă versiunea
  nouă”, cu procentul, apoi „Versiune nouă gata”; se încarcă la clicul tău, nu în mijlocul lucrului.
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
| `Ctrl+Shift+G` | Degrupează |
| `Delete` | Șterge selecția |
| `Ctrl+K` | Caută o comandă |
| `Home` | Arată toată foaia |
| `T` | Arată traseul |
| `V` `S` `N` `B` `R` `O` `E` `L` `P` `X` | uneltele: Selecție, Transformare, Noduri, Pen, Dreptunghi, Cerc, Elipsă, Linie, Poligon, Text (tasta e scrisă și în colțul butonului) |
| `Shift+H`, `Shift+V` | Oglindește orizontal, Oglindește vertical |
| săgețile | mută selecția 1 mm (Shift: 10 mm, Alt: 0,1 mm); în vederea 3D, rotesc placa |
| `Shift` + clic, `Shift` + tragere | adaugă la selecție (la clic, o formă aleasă deja iese din ea) |
| `Alt`, cât tragi | inversează lipirea |
| `Delete`, `Backspace` (cu unealta Noduri și un nod ales) | scoate nodul ales |
| `Enter` (cu unealta Pen) | termină calea începută |
| `Ctrl+Z`, `Ctrl+Y` (cu unealta Pen și o cale începută) | anulează / reface ultimul pas al căii |
| `Ctrl+Shift+Z` (imediat după o cale terminată cu Pen) | redeschide calea, cu pașii ei |
| `Backspace`, `Delete` (cu unealta Pen și o cale începută) | scoate ultimul nod pus |
| `Alt`, cât tragi un mâner (unealta Noduri) | desparte mânerele nodului; pe cele despărțite, le unește din nou |
| `Esc` | anulează forma sau calea începută, lasă nodul ales, întoarce la Selecție, închide vederea 3D și ferestrele |
| `F1` | manualul, la capitolul de acum |

Pe Mac, `Ctrl` e `⌘`.
