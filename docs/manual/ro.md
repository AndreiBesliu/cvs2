# Manualul CNC Vector Studio

## Primii pași
%% capitol: pornire
%% acopera: vedere.paleta, vedere.lista, vedere.proprietati, vedere.proiectare, vedere.tema, editare.manual

CNC Vector Studio desenează piese pentru o freză CNC și scrie programul (G-code) pe care îl taie mașina. Lucrezi pe o
**foaie** (placa de material), pui pe ea forme, fiecare cu **operația** ei de tăiere, apoi exporți G-code-ul.

**Ecranul.** Sus de tot stă **meniul aplicației**, în toate ferestrele: marca, filele ferestrelor (**Proiectare** și
**Mașina**), indicatorul lucrării (cu mașina conectată, vezi [Mașina](#masina)), apoi „Caută o comandă”, limba (RO / EN),
tema și butonul **Cont**. Fila apăsată e fereastra de acum; aplicația se redeschide în ea la pornirea următoare. Pe telefon,
meniul are două rânduri: sus marca și celelalte butoane, dedesubt filele și indicatorul; fila deschisă își arată numele,
celelalte doar iconița.

În fereastra **Proiectare**, pânza ține tot ecranul; deasupra ei plutesc:
- **bara de sus**: uneltele de desen, Lipire și Grilă, Anulează și Reface și, la capăt, fișierele: importul, „Exportă
  vectori” și „Exportă G-code”;
- **extensia barei**, dedesubt: alinierea, oglindirea, copierea, offsetul, booleanul și vederea 3D;
- în stânga, panoul **Pe foaie**: formele foii, cu piesa și operațiile fiecăreia; în dreapta, panoul **Proprietăți**;
- jos: ce e selectat, cursorul pe foaie (în mm, din colțul stânga-jos al foii), zoomul, jurnalul de erori, „Arată
  traseul” și „Arată toată foaia”.

Fiecare panou se strânge și se deschide din butonul din colțul lui („Panoul listei”, „Panoul de proprietăți”). Butonul
„Tema” trece prin temele luminoasă, întunecată și după sistem.

**Caută o comandă** (`Ctrl+K`): paleta de comenzi. Scrii câteva litere, alegi cu săgețile și apeși Enter; Esc o închide.
Paleta arată toate comenzile, cu tasta fiecăreia; la cele care se fac cu mausul spune cum.

**Manualul** se deschide din meniul **Cont**, din colțul din dreapta-sus (rândul **Manualul**), sau cu `F1`. Cu F1 se
deschide la capitolul a ce faci acum
(unealta aleasă, vederea 3D, fereastra deschisă, Mașina). În manual poți căuta după cuvinte, cu sau fără diacritice.

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
marginile și centrul foii, de celelalte forme și de grilă; liniile de aliniere arată de ce s-a lipit. `Shift+L` o pornește
sau o oprește, și cât tragi (butonul arată starea). Când muți o formă, un ghidaj sau un nod, ține apăsat `Alt` cât tragi ca
s-o inversezi; la mânere și la desen, `Alt` înseamnă „din centru” (vezi [Transformările](#transformari)).

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

| Unealta | Tasta | Cum se trage | Cu Shift | Cu Ctrl | Cu Alt |
|---|---|---|---|---|---|
| Dreptunghi | `R` | din colț în colț | pătrat | ca fără tastă | din centru |
| Cerc | `O` | din centru; tragerea dă raza | — | elipsă, cu cursorul în colțul cutiei ei | — (pornește oricum din centru) |
| Elipsă | `E` | din colț în colț | cerc | ca fără tastă | din centru |
| Linie | `L` | din capăt în capăt | pași de 15° | — | din mijloc |
| Poligon | `P` | din centru (poligon regulat) | pași de 15° | întins: vârfurile pe elipsa cutiei, primul sus | — |

- Tastele se pot ține împreună (Alt + Shift: pătrat sau cerc din centru); cu Shift și Ctrl, câștigă Shift. Se pot apăsa și
  în timpul tragerii, cu mausul pe loc. Lângă cursor, eticheta arată mărimea formei și ce fac tastele. Pe Mac, `Ctrl` e `⌘`.
  În bara de jos, **rândul tastelor** spune ce fac Shift, Ctrl și Alt cu unealta aleasă; tasta ținută se umple.
- La **Cerc**, un clic fără tragere pune un cerc cu raza din câmpul de lângă unealtă; o tragere scrie raza ei în câmp. Lista
  de lângă rază alege de unde pornește cercul: **Cercul: din centru** (implicit, ca în tabel) sau **Cercul: din colț**: cercul
  din cutia trasă, ca elipsa cu Shift; cu Alt, din centru (cursorul în colțul cutiei), cu Ctrl, elipsă. Lista se ține în
  browser.
- Poligonul **întins** (Ctrl) nu mai e regulat: panoul îl arată ca pe o cale, fără laturi și rază.
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
%% acopera: unealta.text, document.text, editare.text.fonturi, editare.text.aldin, editare.text.cursiv, editare.text.vertical, editare.text.caseta, editare.text.unitate, editare.text.proportii.latime, editare.text.proportii.inaltime, editare.text.crenare, editare.text.spatieri

Unealta **Text** (`X`; `T` e „Arată traseul”) scrie text de tăiat. Cu ea aleasă:
- un **clic pe foaie** pune ancora (o cruce): acolo începe linia de bază a primului rând (aliniat la stânga), îi stă
  mijlocul (centrat) sau capătul (la dreapta);
- un **clic lângă conturul unei forme** (un cerc, un arc, o curbă, un dreptunghi) pune ancora pe contur, în punctul cel mai
  apropiat, iar textul **urmează curba** (mai jos);
- un **clic pe un text** îl alege, ca să-l editezi.

În panoul uneltei scrii textul (Enter: rând nou) și alegi:
- **fontul**: cele **incluse** (Roboto, Droid Serif și Relief SingleLine, un font cu o singură linie, de gravură),
  **Fonturile mele** (încărcate de tine sau descărcate din Google Fonts) și, după ce permiți accesul, cele **ale
  sistemului**; sub câmpuri se vede textul, cum se va tăia;
- **înălțimea majusculelor**, cu **unitatea mărimii** alături: în mm (la „20 mm”, H, N sau E au exact 20 mm; literele
  rotunde, ca O sau C, trec puțin peste linie, ca în orice font), în inch (tot majusculele: 1 in sunt 25,4 mm) sau în pt,
  unde numărul e **mărimea fontului**, ca în Word sau CorelDRAW (72 pt = un em de 1 inch; sub câmp, panoul spune ce
  majuscule dă, de exemplu 18,06 mm cu Roboto). Schimbarea unității nu schimbă textul: numărul se convertește;
- **lățimea literelor** și **înălțimea literelor**, în procente (100 %: literele fontului): la 70 % lățime, textul
  devine îngust, cu aceleași majuscule; la altă înălțime, sub câmpuri apar majusculele tăiate, de exemplu 30 mm la 20 mm
  și 150 %;
- **crenarea fontului**: pornită, perechile ca „AV” sau „Te” se strâng după tabelul fontului; oprită, fiecare literă
  stă la avansul ei (textul vertical n-o folosește);
- **spațiul dintre litere** (în mm; negativ, mai strâns), **distanța dintre rânduri** (ca multiplu al rândului fontului) și
  **alinierea** față de ancoră;
- **între literele alese**, chiar sub text: alegi câteva litere în text (cu mausul sau cu Shift + săgeți) și le schimbi
  spațiul dintre ele, toate deodată, în câmp (mm; negativ, mai strâns), cu − / + sau cu `Alt+←` / `Alt+→` chiar în text
  (0,1 mm); cu cursorul între două litere, doar perechea lor. Câmpul e gol când spațiile alese diferă. Spațiul se adaugă la
  spațiul dintre litere (pe o curbă, de-a lungul ei; la textul vertical, între literele coloanei) și rămâne pe literele lui
  când scrii în altă parte a textului; **Fără spațieri** le scoate pe toate;
- **Aldin** și **Cursiv**, pentru orice font, chiar fără fețele lui îngroșate sau înclinate, **Vertical**, literele una
  sub alta, și **Caseta**, textul încadrat într-o lățime și o înălțime (mai jos).

**Aldin** îngroașă literele: bifat, cere **Îngroșarea pe fiecare parte** (mm; propune 3 % din înălțime, de exemplu 0,6 la
20 mm; cel mult o cincime din înălțime). Fiecare trăsătură crește cu dublul ei, golurile mici se strâng (pot dispărea), iar
bucățile apropiate ale unei litere (virgula lui ș, punctul lui i) se pot uni. Înălțimea rămâne cea cerută: H de 20 mm are tot
20 mm, cu colțurile de afară rotunjite cu raza îngroșării, și spațiul dintre litere rămâne același. Literele îngroșate se
taie din linii și arce, la cel mult 0,001 mm de forma exactă. **Cursiv** înclină literele: bifat, cere **Înclinarea** (°;
propune 12°; negativă, spre stânga; cel mult 45°), fiecare literă față de linia ei de bază, exact. Cu amândouă, literele se
înclină întâi și se îngroașă apoi, deci trăsăturile se îngroașă la fel în toate direcțiile. Textul își ține aldinul și
cursivul: se redeschide cu ele, iar scalarea uniformă crește și îngroșarea.

Lățimea și înălțimea literelor scalează literele înaintea oricărui alt pas: spațiul dintre litere, aldinul și distanța
de curbă rămân în mm, iar cursivul înclină litera deja scalată. Trasă cu mânerele doar în lățime (sau doar în înălțime),
un text drept fără aldin rămâne text: i se schimbă lățimea literelor (și mărimea, când tragi în înălțime). Un text pe o
curbă sau unul aldin devine vectori (arcele aldinului, curbe), iar eticheta mânerelor o spune; scalarea uniformă le crește
pe toate.

**Vertical** pune literele una sub alta, drepte: fiecare rând devine o coloană, iar coloanele merg de la stânga la dreapta,
la **distanța dintre coloane** (ca multiplu al rândului fontului). Fiecare literă stă centrată pe axa coloanei, iar între două
litere vecine rămâne același gol: cât lasă em-ul fontului sub o majusculă (între două majuscule, pasul e chiar un em), plus
**spațiul dintre litere**. Căciula lui Ă sau virgula lui Ș își primesc locul, deci literele nu se ating; un spațiu ține locul
unei majuscule. **Alinierea** devine **Sus** (coloana pornește din ancoră în jos), **Mijloc** sau **Jos** (coloana se termină
în ancoră). Textul vertical stă drept: pus pe o curbă, nu o urmează. Aldinul, cursivul și fonturile cu o singură linie merg
la fel, iar textul se redeschide vertical.

**Caseta** încadrează textul: **Limitat de casetă** păstrează înălțimea majusculelor scrisă și o micșorează doar cât să
încapă; **Scalat la casetă** face textul cât mai mare încât să încapă, iar înălțimea o dă caseta (câmpul ei se oprește). Se
încadrează literele tăiate (nu spațiul din jurul lor), în **Lățimea casetei** și **Înălțimea casetei** (mm); spațiul dintre
litere și aldinul rămân cum le-ai scris, în mm. Sub câmpuri, panoul spune înălțimea care a încăput și mărimea textului; dacă
textul nu încape nici la cea mai mică înălțime (de pildă, cu un spațiu dintre litere prea mare), o spune și nu-l pune pe
foaie. Caseta nu mută textul: el pornește tot din ancoră. Textul în casetă stă drept (nu urmează o curbă), poate fi vertical,
iar scalarea uniformă crește și caseta.

**Fonturile cu o singură linie** (de gravură, „stick”) n-au litere pline, ci trăsături: freza merge o dată pe fiecare linie.
Relief SingleLine e inclus; unul încărcat de tine în Fonturile mele (TTF, OTF sau un font SVG, formatul fonturilor de
gravură Hershey și EMS) se recunoaște singur, fie că își scrie trăsăturile dus-întors, fie deschise, ca fonturile pentru CAD
și cele SVG. Cu un asemenea font, previzualizarea arată liniile, **Aldin**
e oprit (o trăsătură n-are ce îngroșa; **Cursiv** merge), iar textul pus pe foaie e făcut din linii deschise (o buclă
închisă rămâne buclă), gravate pe linie la adâncimea liniilor importate (1 mm, cel mult jumătate din grosimea foii, într-o
trecere). Freza și adâncimea le schimbi în fereastra exportului, de exemplu cu freza în V.

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
  fețele), WOFF și fonturile SVG (cele de gravură, Hershey sau EMS); fonturile rămân în browserul ăsta, merg și fără rețea și nu pleacă nicăieri. Un font variabil (ca Roboto
  Flex) dă câte un rând pe fiecare stil numit al lui (Thin, Bold, Bold Italic…), ca fețe separate. **Folosește** alege fontul
  în panou, **Șterge** îl scoate (un text făcut cu el rămâne, doar nu se mai editează aici până nu-l încarci din nou);
- **Google Fonts**: cauți o familie (după nume, după categorie, doar cu diacriticele românești), alegi stilul și
  **Descarcă**: fontul vine o dată și intră în Fonturile mele. Pe alt calculator, un text cu un font Google îl cere din
  nou dintr-un clic (**Descarcă din nou**);
- **Ale sistemului**: **Permite accesul la fonturile sistemului** (Chrome și Edge, pe calculator) pune fonturile
  instalate în lista din panou și în fereastră, cu căutarea, proba fiecăruia și **Folosește**. Nu se copiază nicăieri:
  textul se editează doar unde fontul e instalat.

Înălțimea în mm se măsoară pe litera **H** a fontului (vârful ei e la „20 mm”); un font fără H folosește înălțimea
majusculelor scrisă în el. Un font variabil (ca Bahnschrift) se taie în stilul ales (SemiBold, Condensed…), cu contururile,
lățimile și crenarea lui; textul ține stilul și se redeschide cu el. Un WOFF2 se încarcă întâi convertit în TTF sau OTF.

Textul rămâne editabil și după salvare, cât timp contururile lui nu se schimbă pe altă cale: mutarea, rotirea, oglindirea și
scalarea uniformă îl păstrează (scalarea crește și înălțimea din panou), la fel scalarea pe o axă a unui text drept fără
aldin; scalarea pe o axă a unui text pe curbă sau aldin, o înclinare sau o editare de noduri îl fac vectori obișnuiți. **Degrupează** îl desface în litere, ca vectori. Ș și Ț se scriu cu virgulă (Ș ș Ț ț), ca
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

Unealta **Transformare** (`S`) arată mânerele pe cutia selecției și **transformă** forma exact (arcele rămân arce cât
scalarea e proporțională):
- **colțurile** scalează proporțional, cu colțul opus fix; **laturile** scalează pe o singură axă, cu latura opusă fixă;
- **Shift**: proporțional pe orice mâner (și pe o latură: cealaltă axă crește la fel, simetric față de mijloc);
- **Ctrl** (`⌘` pe Mac): liber pe orice mâner (și pe un colț, fiecare axă cu tragerea ei);
- **Alt**: față de **ancoră** (implicit centrul cutiei): ancora rămâne pe loc, nu mânerul opus;
- tastele se pot ține împreună (Alt + Shift: proporțional față de ancoră; Alt + Ctrl: liber față de ancoră); cu Shift și
  Ctrl, câștigă Shift. Se pot apăsa și în timpul tragerii, cu mausul pe loc;
- **mânerul rotund de deasupra** rotește în jurul ancorei; cu Shift, în pași de 15°.

**Ancora** e punctul fix al transformărilor: rotirea e în jurul ei, Alt scalează față de ea, oglindirea și înclinarea o
folosesc. Pe pânză e ținta albastră, un cerc cu cruce. Pornește dintr-unul din cele 9 puncte ale cutiei (colțurile, mijloacele
laturilor, centrul), ales în **selectorul** de lângă unealtă și ținut în browser. O tragi cu mâna oriunde, și în afara cutiei:
se lipește de cele 9 puncte ale cutiei și de ținte (`Alt` inversează lipirea); **dublu clic** pe ea o întoarce în punctul
ales. Când ancora stă pe un mâner (un colț ales în selector), mânerul are întâietate, iar ancora o muți din selector. Merge cu
selecția când o muți sau o scalezi din alt mâner; după o rotire, o scalare cu Alt, o oglindire sau o înclinare în jurul ei,
rămâne pe loc. O selecție nouă o întoarce în punctul ales; ancora nu se salvează în proiect. În panoul de proprietăți, rândul
**Ancora transformării** îi arată locul, cu X / Y: scrise acolo, mută ancora, nu formele.

Lista **Ce ține fix Alt**, de lângă selector, ținută în browser: **Alt: ancora** (implicit) sau **Alt: centrul**: atunci Alt
scalează față de centrul cutiei, oriunde ar sta ancora, iar rotirea e și ea în jurul centrului (ancora rămâne pentru oglindire
și înclinare).

Cât tragi, eticheta de deasupra arată mărimea și ce fac tastele (de exemplu „50 × 40 mm · pe o axă · față de latura
opusă”), iar un punct albastru arată ce rămâne pe loc. Mânerele se lipesc de ghidaje, foaie, celelalte forme și grilă, doar
pe axa pe care o scalează, cât e pornită lipirea (`Shift+L` o comută). Un **cerc** scalat pe o singură axă devine **elipsă**:
aceeași elipsă ca una desenată cu Elipsa, cu razele editabile în panou. Arcele unei căi (colțurile unui offset, arcele
importate) scalate pe o axă devin **curbe**, la cel mult 0,001 mm de arcul întins; eticheta spune „arcele devin curbe”, iar
`Ctrl+Z` le readuce.

**Colțurile rotunjite** ale unui dreptunghi urmează lista de lângă selectorul ancorei, ținută în browser:
- **Colțuri: rămân la întindere** (implicit): trasă pe o axă, raza rămâne aceeași, iar dreptunghiul rămâne dreptunghi,
  cu raza editabilă în panou; scalată proporțional, raza crește cu forma;
- **Colțuri: rămân mereu**: raza rămâne și la scalarea proporțională;
- **Colțuri: se scalează**: raza crește mereu cu forma; trasă pe o axă, colțurile devin sferturi de elipsă, din curbe (forma
  devine o cale).

Un colț care nu mai încape în latura scalată (de exemplu R 10 într-o latură de 15 mm) se refuză, cu motivul. O formă **rotită
oblic** (altfel decât cu 90°), trasă pe o axă, se scalează în axele foii prin geometrie, ca înclinarea: devine o cale (un
dreptunghi rotit iese un paralelogram), arcele devin curbe, iar locul și rotirea ei rămân; eticheta spune „formele rotite
oblic devin căi”. Rămâne refuzată, cu motivul, schimbarea unei piese folosite și de alte forme. În bara de jos, **rândul
tastelor** spune ce fac Shift, Ctrl și Alt cu Transformarea; tasta ținută se umple.

**Oglindirea** stă în extensia barei: **Oglindește orizontal** (`Shift+H`, stânga ↔ dreapta) și **Oglindește vertical**
(`Shift+V`, sus ↔ jos), față de ancoră (implicit centrul cutiei selecției). Se taie oglinda, cu același sens de tăiere.

**Înclină** (lângă oglindire, butonul cu un pătrat și paralelogramul lui) deschide un panou cu două unghiuri, în grade, între
−75° și 75° (gol = 0): **Orizontal** mută punctele spre dreapta cu cât sunt mai sus (un unghi negativ, spre stânga), apoi
**Vertical** le ridică cu cât sunt mai la dreapta, față de ancoră (implicit centrul cutiei selecției). Aria rămâne aceeași. Cât panoul e deschis,
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

Degruparea se refuză, cu motivul spus lângă butoane (și la `Ctrl+Shift+G`), dacă un **V-carve** își sapă contururile împreună
(literele cu golurile lor: despărțite, golurile s-ar săpa și ele), dacă piesa e folosită și de alte instanțe sau dacă nicio
formă aleasă nu e un grup.

## Gruparea
%% capitol: grupare
%% acopera: document.grupeaza

**Grupează** (butonul de lângă Degrupează, meniul de clic dreapta, `Ctrl+G`) face din formele alese, cel puțin două, o singură
piesă: se alege, se mută, se rotește și se aliniază ca un bloc, deci formele ei nu se mai suprapun la aliniere. O piesă care era
deja un grup (un import, un text, o formă cu găuri) intră întreagă, ca un nivel al grupului nou; **Degrupează** desface doar
acel nivel.

Fiecare formă stă exact unde era și își păstrează operația (latura, adâncimea, freza): **ce se taie rămâne același**. Grupul ia
locul primei forme alese în ordinea tăierii; dacă între formele alese erau altele, ele se taie, în aceeași clasă, după grup.
Într-un grup, un text e doar vectori; după degrupare, se editează din nou. După grupare, ales e grupul, iar un singur `Ctrl+Z`
desface gruparea, cu fiecare formă la locul ei.

Două texte (sau forme) cu câte un **V-carve** cu aceleași valori se grupează: freza le sapă într-un singur drum, iar fiecare
literă iese la fel. Gruparea se refuză, cu motivul spus lângă butoane (și la `Ctrl+G`), dacă e aleasă o singură formă, dacă două
forme cu același V-carve se ating sau se suprapun (grupate, s-ar săpa ca o singură regiune, iar suprapunerea ar rămâne nesăpată)
sau dacă o piesă aleasă e folosită și de alte instanțe.

## Meniul de clic dreapta
%% capitol: meniu
%% acopera: editare.meniu

Clicul dreapta pe pânză deschide **meniul de clic dreapta**, cu ce se poate face pe selecție: **Grupează** și **Degrupează**, apoi **Unește**,
**Scade** și **Intersectează** (booleanul), apoi **Duplică** și **Șterge selecția**, fiecare cu tasta lui. Pe o formă care nu e
aleasă, clicul dreapta o alege întâi; pe gol, selecția rămâne. Un rând e activ doar când se poate (booleanul, cu două forme;
gruparea, cu cel puțin două; degruparea, cu un grup ales); un refuz își spune motivul în meniu.

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
  curbă) și îl scoate pe celălalt; încă un clic trece curba pe cealaltă parte;
- **Desparte**: taie forma chiar în nodul ales, ca [foarfeca cuțitului](#cutit): o cale închisă se deschide acolo, una deschisă
  devine două forme (rămâne aleasă prima). Capătul unei căi deschise nu se desparte.

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
%% acopera: editare.aliniere, editare.aliniere-bloc, document.muta-instantele, aliniaza.stanga, aliniaza.centru-x, aliniaza.dreapta, aliniaza.sus, aliniaza.centru-y, aliniaza.jos, aliniaza.centru-foaie, aliniaza.distribuie-x, aliniaza.distribuie-y

Secțiunea **Aliniere** din extensia barei e mereu acolo; butonul ei o strânge spre stânga și o deschide la loc. Butoanele
**aliniază** cutiile formelor alese:

| Butonul | Ce face |
|---|---|
| Aliniază la stânga / Aliniază la dreapta | marginile din stânga / din dreapta, pe aceeași linie |
| Aliniază centrele pe orizontală | centrele, pe aceeași verticală |
| Aliniază sus / Aliniază jos | marginile de sus / de jos, pe aceeași linie |
| Aliniază centrele pe verticală | centrele, pe aceeași orizontală |
| Centrează pe foaie | centrul formelor alese în centrul foii, pe ambele axe, într-un clic; mai multe forme se mută împreună, ca un bloc |
| Distribuie pe orizontală / Distribuie pe verticală | goluri egale între forme (cel puțin trei) |

Cu o singură formă aleasă, alinierea o pune față de foaie (de exemplu, „Aliniază la stânga” o duce la marginea din stânga a
foii). **Centrează pe foaie** lucrează mereu față de foaie: mută toate formele alese cu aceeași deplasare, deci așezarea
dintre ele rămâne, iar cutia lor comună ajunge în mijlocul foii. Mai multe forme se aleg cu dreptunghiul de selecție sau cu Shift + clic (vezi [Selecția și editarea](#selectie)).

Comutatorul **Ca bloc** (primul buton după cel care strânge secțiunea) mută formele alese împreună, față de foaie: cutia lor
comună se aliniază la marginea sau la mijlocul foii, iar așezarea dintre ele rămâne, deci nu ajung una peste alta. Fără el,
fiecare formă se aliniază la cutia comună și se pot suprapune. Comutatorul se ține în browser, ca Lipirea; distribuirea și
centrarea pe foaie lucrează la fel cu el sau fără. Ca niște forme să se miște mereu împreună, grupează-le (vezi
[Gruparea](#grupare)).
Fiecare aliniere se poate anula cu `Ctrl+Z`.

## Importul SVG, DXF, PDF, AI, EPS, WMF și al imaginilor
%% capitol: import
%% acopera: import.svg, document.importa

Butonul **Importă SVG / DXF / PDF / AI / EPS / WMF / imagine** din bara de sus (primul dintre fișiere, lângă „Exportă vectori” și
„Exportă G-code”) deschide fereastra de fișiere (poți alege mai multe). Sau tragi fișierele direct pe pânză: fiecare cade cu
centrul unde îl lași.

Pentru fiecare fișier se deschide o fereastră care arată mărimea desenului și cum se va tăia:
- **contururile închise**: cele din afară pe exterior, găurile din ele pe interior (după imbricare);
- **căile deschise**: pe linie, un canal de cel mult 1 mm (jumătate din foaie, dacă e mai subțire), într-o trecere; grosimea
  liniei din fișier nu contează, canalul are diametrul frezei;
- la un SVG, **cât înseamnă un px**: 1/96 țol (standardul CSS, Inkscape) sau 1/72 țol (Illustrator); un fișier scris de
  Illustrator e recunoscut;
- la un DXF, **unitățile**: cele declarate de fișier se folosesc ca atare; unul care nu le declară (de exemplu un R12) se
  citește în mm, iar fereastra te lasă să alegi mm, cm, m, țol sau picior (mărimea desenului se schimbă pe loc);
- la un WMF fără antet placeable, **unitatea**: 1/96 țol (px, ca LibreOffice), 1/1440 țol (twip), 0,01 mm, 0,1 mm sau mm
  (vezi mai jos);
- la un PDF cu mai multe pagini, **pagina** de importat (vezi mai jos);
- la o imagine, **trasarea**: cum devine desenul din pixeli contururi (vezi mai jos);
- ce nu se importă sau se citește altfel, cu numărul lor (la un SVG: textele, clonele `<use>`, imaginile, formele ascunse).

**Importă** pune desenul pe foaie ca o singură formă, selectată; **Sari peste** trece la fișierul următor, **Renunță** și
**Renunță la toate** închid fereastra. Se importă fișierele SVG, DXF, PDF, AI, EPS și WMF, precum și imaginile PNG, JPEG,
WebP, GIF și BMP, de cel mult 16 MB, nearhivate (nu `.svgz`). Textul trebuie transformat în contururi în programul de desen înainte de
export.

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
- un fișier protejat (cu parolă sau cu restricții de editare) e refuzat: salvează o copie fără protecție. Un AI salvat fără
  „Create PDF Compatible File” arată doar o notă de text, iar fereastra îți spune s-o bifezi.

Un **EPS** (și un **AI** de dinainte de Illustrator 9, care e PostScript, nu PDF) se citește așa; dacă e AI sau EPS, decide
începutul fișierului, nu extensia:
- desenul ajunge pe foaie unde e în fișier: originea PostScript e colțul foii, la scara 1:1 (un EPS binar, cu
  previzualizarea lui, se citește la fel);
- liniile și curbele intră exact, cu transformările lor (mutare, scară, rotire, înclinare); o formă umplută după regula
  nonzero se redesenează ca la SVG;
- la un AI, fiecare formă își păstrează numele stratului; formele de pe straturile ascunse se sar;
- se sar, numărate: textele, imaginile și umbririle; măștile de tăiere nu se aplică;
- cititorul e limitat: citește desenele scrise pas cu pas, cu procedurile lor simple. Un fișier care folosește bucle sau
  condiții (de exemplu un EPS din CorelDRAW), un operator pe care cititorul nu-l are (de exemplu `arc`) sau un EPS salvat de
  Illustrator 9 ori mai nou e refuzat, iar fereastra spune de ce: salvează-l ca PDF, SVG sau AI compatibil PDF.

Un **WMF** (metafișierul Windows: clipartul vechi, exporturile din CorelDRAW, Office sau AutoCAD) se citește așa:
- cu antetul placeable (aproape orice WMF de pe disc), desenul ajunge pe foaie unde e în cadrul lui: colțul stânga-jos al
  cadrului e colțul foii, iar mărimea vine din antet (unitățile pe țol, arătate în fereastră);
- fără antet, fișierul nu-și spune mărimea: fereastra te lasă să alegi unitatea (implicit 1/96 țol, cum îl arată LibreOffice),
  iar desenul vine în colțul foii; un fișier desenat într-un mod metric (de exemplu în 0,01 mm) își spune singur unitățile;
- poliliniile, poligoanele (și cele cu mai multe contururi), dreptunghiurile, dreptunghiurile rotunjite, elipsele, arcele
  (și cele închise cu o coardă sau cu două raze) și liniile trase din punct în punct intră cum le desenează Windows, cu
  fereastra, vizorul și modul de mapare ale fișierului: cercul rămâne cerc, elipsele devin curbe Bézier;
- o formă umplută după regula „winding” se redesenează ca la SVG; una nevăzută (fără contur și fără umplere) se sare;
- se sar, numărate: textele, imaginile și operațiile raster, regiunile pictate, înregistrările necunoscute; decupajele nu
  se aplică;
- un WMF nu are curbe Bézier: un cerc desenat liber de un program ajunge un poligon, și așa se importă;
- un EMF (metafișierul pe 32 de biți) e refuzat: salvează-l ca WMF, SVG sau PDF.

O **imagine** (PNG, JPEG, WebP, GIF sau BMP: un logo, un desen scanat, o semnătură) se **trasează**: aplicația găsește
marginea desenului și o scrie ca vectori, în alb-negru. Fereastra se lărgește, cu reglajele în stânga și previzualizarea în
dreapta:
- **Sursa**: ce e desen. **Aleasă singură** ia **Transparența** la o imagine cu fundal transparent (desenul e tot ce nu e
  transparent, oricare i-ar fi culoarea) și **Luminozitatea** la una opacă (fundalul are culoarea marginii imaginii);
  rândul de sub listă spune ce a ales;
- **Rezultatul** (la Transparența și la Luminozitatea): **Contururi** (marginea desenului) sau **Linii mediane** (mijlocul
  fiecărei trăsături, tăiat pe linie: vezi mai jos);
- **Pragul**: unde se desparte desenul de fundal. **Automat** îl alege din imagine, între cele două tonuri ale ei; fără el,
  glisorul îl mută;
- **Inversează**: fundalul devine desen și invers (de exemplu, la un text alb pe o placă neagră);
- **Lumina** (la Luminozitatea): **Uniformă** (implicit) ia un singur prag pe toată imaginea, pentru o scanare curată sau
  un logo; **Neuniformă** raportează hârtia la o suprafață netedă potrivită pe ea, pentru o poză luminată dintr-o parte, cu
  colțurile întunecate sau cu pete pline; **Cu umbre** o raportează la fundalul din jurul fiecărui punct, pentru umbra
  telefonului sau a mâinii (o pată plină mai lată decât o douăsprezecime din imagine iese golită: atunci, Neuniformă). La
  amândouă, desenul e ce iese din hârtie, oricum ar fi marginea imaginii (o foaie pozată pe masă); dacă iese totuși
  întors, **Inversează**. Când hârtia variază mult la Uniformă, raportul îți propune Neuniformă;
- **Netezimea**: **Fidel** urmează marginea de aproape și păstrează colțurile mici, **Echilibrat** netezește treptele
  pixelilor, **Neted** rotunjește colțurile mici și dă mai puține noduri;
- **Ignoră petele sub** și **Umple golurile sub** (în mm, cu pixelii alături): petele de desen și golurile din el mai mici de
  atât dispar (praful unei scanări, zgomotul unei fotografii); o formă lipită de marginea imaginii rămâne;
- **Ignoră ce atinge marginea**: o bucată de desen lipită de marginea imaginii (sau a zonei) se șterge, oricât de mare: masa
  din jurul unei foi pozate, o literă tăiată de zonă; raportul le numără. Merge și pe culori;
- **Lățimea (mm)**: mărimea desenului pe foaie. Goală, mărimea vine din DPI-ul scris în fișier, iar fără el din 96 px pe
  țol, ca la un SVG; rândul de sub ea arată înălțimea, mărimea pixelului și de unde vine scara.

Previzualizarea arată **Imaginea**, **Vectorii** sau **Amândouă** (cu **Estompează imaginea**, ca vectorii să se vadă peste
ea); rotița mărește în jurul mausului, tragerea mută imaginea, **Mărește** și **Micșorează** fac la fel din butoane, iar
**Încadrează** arată toată imaginea. **Zona** alege doar o parte din ea: cât e apăsat butonul, tragerea pe previzualizare
desenează dreptunghiul, îl mută sau îl întinde de laturi și colțuri (Shift + tragere îl desenează și fără buton), iar
**Toată imaginea** îl scoate. Se trasează doar zona, ca și cum ar fi imaginea: pragul automat și lumina nu mai văd ce e în
afara ei, colțul ei stânga-jos ajunge în colțul foii, iar **Lățimea** e a ei. Sub previzualizare stă raportul: **abaterea maximă** a vectorilor față de marginea din imagine (în
mm și în pixeli, măsurată pe fiecare contur), mărimea imaginii, câte pete și goluri s-au curățat și dacă marginile erau dure
(fără nuanțe: atunci treptele pixelilor se netezesc). Fiecare schimbare trasează imaginea din nou, deoparte: fereastra
rămâne vie, iar o schimbare nouă o oprește pe cea începută.

Cu **Sursa: Culorile**, imaginea se trasează pe culori: fiecare culoare devine o formă a ei, iar două culori vecine au
exact aceeași margine (fără fâșie și fără suprapunere între ele), ca să le poți săpa la adâncimi diferite sau să le
incrustezi. Pragul și **Inversează** se ascund; restul reglajelor rămân. Apoi:
- **Numărul culorilor**: **Automat** găsește singur culorile deosebite ale imaginii (umbrirea unei suprafețe rămâne o
  singură culoare, iar o culoare mică dar clară, ca o linie subțire, rămâne a ei); fără el, glisorul alege de la 2 la 16.
  Un număr nou face culorile din nou, fără legăturile și bifele de dinainte;
- **pastilele**: fiecare culoare, cu cât din desen are și bifa **Se trasează**. La o imagine opacă, culoarea marginii e
  **fundalul**, nebifată (o poți bifa); la una transparentă, transparentul nu e o culoare;
- **legarea**: trage o pastilă peste alta și cele două devin o singură culoare (de exemplu, umbra unei litere și litera);
  **Leagă de…** face același lucru de la tastatură, iar pastila legată are **Dezleagă**;
- mausul pe o pastilă îi arată regiunea în previzualizare; **Imaginea** e aici imaginea pictată în culorile găsite.

**Importă** pune câte o formă pe culoare bifată, toate aliniate ca în imagine, într-un singur pas (un Ctrl+Z le scoate pe
toate); numele fiecăreia are culoarea ei (de exemplu „logo #0c619c”). Rolul fiecăreia (buzunar, V-carve, incrustație) îl
alegi apoi din panou.

Cu **Rezultatul: Linii mediane**, fiecare trăsătură devine linia ei de mijloc, nu conturul: un scris de mână, o semnătură,
un desen cu linii. O linie se termină în centrul capătului rotund al trăsăturii (acolo se oprește o freză cât trăsătura);
unde se întâlnesc trăsături, liniile se întâlnesc într-un punct, iar cele care se continuă (bara unui T, un X, o buclă care
se încrucișează) rămân o singură linie; un O sau un inel devine o buclă. O pată plină dă linia ei de mijloc (un dreptunghi
lung, o linie; un disc, doar un punct): punctele, adică trăsăturile mai scurte decât grosimea lor, nu au linie, iar raportul
le numără. Raportul spune și **grosimea obișnuită a trăsăturilor**, în mm, iar dacă foaia are o singură freză, cum stă ea
față de trăsătură: mai lată (gravura ar mânca din jur), mai îngustă (ar ieși mai subțire) sau cât ea. **Arată grosimea**
desenează, sub linii, banda pe care ar tăia-o o freză cât trăsătura. **Importă** pune liniile într-o formă, toate tăiate
pe linie (și buclele), ca liniile deschise ale unui SVG.

Sub **Rezultatul: Linii mediane** stau opțiunile lor:
- **Capetele:** **Centrul capătului** (implicit) sau **Vârful trăsăturii**: linia merge până la marginea trăsăturii, pentru o
  freză în V care trebuie să ajungă până în vârf;
- **Părțile late:** **Linii mediane** (implicit: o pată plină dă linia ei de mijloc) sau **Contururi**: părțile mai late
  decât pragul rămân contururi închise, tăiate pe exterior (golurile lor pe interior), iar liniile care ajung la ele se
  opresc pe conturul lor, fără punte; **Mai late de**: **Automat** (de două ori grosimea obișnuită) sau o valoare în mm;
- **Arată părțile late** (pornită implicit): previzualizarea le colorează, iar raportul spune câte sunt și ce parte din
  cerneală, ca să vezi că desenul are părți pline înainte să imporți;
- **Buclele:** **Pe linie** (implicit) sau **Vectori închiși**: un O sau un inel devine un contur închis, tăiat pe exterior,
  iar o buclă aflată în alta, pe interior.

Desenul trasat intră ca o formă, cu imaginea drept pagină (sau zona): colțul stânga-jos al imaginii e colțul foii.
Contururile din afară se taie pe exterior, golurile pe interior, după sensul fiecărui contur. Deocamdată:
- liniile mediane pe culori și scanările îndreptate vin mai târziu;
- o imagine de peste 16 megapixeli se micșorează întâi (raportul o spune); una cu peste 20 000 de contururi e refuzată, cu
  numărul lor, la fel ca o trasare de peste 30 de secunde: mărește **Ignoră petele sub** sau mută pragul;
- o fotografie se citește întoarsă cum o arată telefonul (orientarea din fișier);
- TIFF-ul nu se citește încă (salvează imaginea ca PNG), iar imaginile din PDF-uri și din SVG-uri se sar, ca până acum.

## Tăierea vectorilor
%% capitol: taiere
%% acopera: editare.taiere, document.taie

**Taie** (butonul cu foarfeca, după boolean și degrupare, în extensia barei) împarte formele alese, **Taie cu**:
- **Linia verticală X =** sau **Linia orizontală Y =**, poziția în mm ai foii (pornește din mijlocul formelor alese);
- **Linia printr-un punct, la un unghi**: punctul (X, Y, în mm ai foii) și unghiul (0° e orizontala, 90° verticala), tot
  exactă;
- **Ghidajul**: unul dintre ghidajele foii, tras din riglă;
- **Ultima formă aleasă (Shift + clic)**: cuțitul e o formă a ta. Alege formele de tăiat, apoi, ultimul, cuțitul, cu
  Shift + clic; cuțitul rămâne neschimbat, iar cu **și șterge-o după tăiere** pleacă în același pas cu tăierea.

Cât panoul e deschis, linia se vede pe pânză, punctată. **Taie** face din fiecare formă prin care trece linia două forme:
ce e de o parte a liniei și ce e de cealaltă, fiecare aleasă după tăiere, la locul ei. O formă prin care linia nu trece
rămâne cum e. Tăierea e exactă: un arc se taie în două arce ale aceluiași cerc, o curbă rămâne pe curba ei, iar nodurile pe
care linia nu le atinge rămân neschimbate. Doar o trecere taie: un cerc tangent la linie sau un vârf care doar atinge linia
nu se taie.

Un cuțit închis (un cerc, un dreptunghi) lasă din fiecare formă două forme: ce e înăuntrul lui și ce e în afara lui. Un cuțit
închis pus tot înăuntrul unei forme, fără să-i atingă marginea (un text pe o placă), o taie și el, cu **Închide
bucățile**: din placă ies literele, iar placa rămâne cu golurile lor. Un
cuțit deschis (o linie frântă, o curbă) face din fiecare bucată o formă; contururile pe care nu le trece rămân împreună, iar
o gaură netăiată merge cu bucata în care stă. Cuțitul taie unde trece prin formă și unde capătul lui intră în ea dintr-o
latură; un cuțit care doar atinge forma nu o taie.

**Închide bucățile** (bifată implicit; aplicația își amintește alegerea): fiecare parte a unei forme închise se închide pe
tăietură: cu o linie dreaptă, la linie și la ghidaj, sau pe drumul cuțitului, cu nodurile lui. O formă cu găuri se citește
ca regiune: un inel tăiat în două dă două forme în „U”, închise. Fără bifă, bucățile rămân deschise: un cerc tăiat prin
centru dă două semicercuri, fiecare un singur arc. Cu bifă, un cuțit care se oprește înăuntrul unei forme sau care se
încrucișează în ea nu se poate folosi (panoul spune de ce): prelungește-l (sau alege „până ies din formă”, mai jos) ori taie
fără bifă.

**Prelungește capetele** (doar la un cuțit-formă deschis; liniile sunt deja întregi): **nu** (implicit); **până ies din
formă**: un capăt oprit înăuntrul unei forme de tăiat merge mai departe pe tangenta lui (linia, arcul sau curba de la capăt)
până iese din ea, și din formele în care intră așa, ca tăietura să treacă de tot; **linia întreagă**: capetele merg pe
tangentă dincolo de toate formele de tăiat (la o linie dreaptă, linia fără capete).

**Păstrează**: **ambele părți** (implicit), **stânga** sau **dreapta** tăieturii, față de sensul ei: la linia verticală,
stânga e x mai mic; la cea orizontală, părțile se cheamă **deasupra** și **dedesubt**; la linia la unghi, stânga sensului dat
de unghi; la un cuțit-formă deschis, a sensului în care a fost desenat; la unul închis, **înăuntru** sau **în afară**. Partea
cealaltă a formelor tăiate pleacă în același pas; o formă pe care tăietura n-o atinge rămâne, chiar dacă e de partea
cealaltă. Aplicația își amintește alegerile, aceleași și în bara [Cuțitului](#cutit).

**Între bucăți** (cere **Închide bucățile**): **nimic** (implicit), **spațiu** sau **suprapunere**, de **lățimea** dată
(în mm, implicit 3, de la 0,01 la 1 000), centrate pe tăietură. Fiecare parte se taie cu tăietura mutată cu jumătate din
lățime: la spațiu, spre ea, deci între bucăți rămâne o fâșie goală, ca tăietura unei pânze (pătratul 100 × 100 tăiat la
X = 50 cu spațiul 6 dă două dreptunghiuri de 47 × 100); la suprapunere, spre cealaltă, deci bucățile se suprapun pe toată
lățimea (53 × 100 fiecare). La un cuțit-formă deschis, tăietura mutată e drumul lui mutat paralel (colțurile ies rotunjite
pe partea dinafară); la unul închis, înăuntru se strânge, iar în afară crește. Cât panoul e deschis, fâșia se vede pe pânză,
cu două linii punctate mai rar. Se taie doar formele prin care trece tăietura: una de lângă ea rămâne, chiar dacă fâșia ar
atinge-o. Un spațiu care ar mânca o bucată întreagă de partea păstrată (o fâșie mai îngustă decât el, o insulă din fâșie)
nu se face, iar panoul spune de ce; o gaură din fâșie pleacă odată cu ea. Nici un cuțit care nu se poate muta (se rupe într-o
curbă mai strânsă decât jumătatea lățimii) nu se poate folosi.

**Îmbinarea** (cere **Închide bucățile**; doar la tăieturile drepte: liniile din panou, ghidajul și felul Linie al
[Cuțitului](#cutit)): marginea nouă a bucăților urmează un model, ca ele să se prindă una de alta: **dreaptă** (implicit,
fără model), **zigzag**, **val**, **dinți drepți**, **coadă de rândunică** sau **puzzle**, cu **pasul** (lungimea unui
dinte, implicit 40 mm), **înălțimea** (de la vârful de jos la cel de sus, implicit 20 mm) și **raza** colțurilor (implicit 3
mm; 0 lasă colțurile ascuțite). Pe fiecare bucată de tăietură care trece printr-o formă, dinții întregi stau la mijloc, iar
la fiecare capăt rămâne o margine dreaptă de cel puțin o jumătate de pas, deci niciun dinte nu e tăiat de marginea formei:
pătratul 100 × 100 tăiat la X = 50 în zigzag cu pasul 20 și înălțimea 10 are patru dinți, cu câte 10 mm drepți la capete,
iar fiecare bucată are 55 × 100. Fiecare colț e al ambelor bucăți (scobit într-una, bombat în cealaltă), deci se rotunjește
cu raza dată, ca o freză de raza aceea să le taie pe amândouă; valul și puzzle-ul sunt făcute din arce, iar arcele lor
trebuie să aibă cel puțin raza dată. Coada de rândunică are laturile înclinate 1 : 6, iar puzzle-ul, capul mai lat decât
gâtul (cât timp înălțimea trece de patru raze): amândouă țin bucățile prinse și pe lungime. Modelele sunt simetrice față de
mijlocul lor, deci cele două bucăți ale unei forme simetrice au aceeași arie. Cu **Între bucăți**, dinții se taie cu spațiul
dat între ei (jocul, ca bucățile să intre una în alta) sau cu suprapunerea dată. Cât panoul e deschis, dinții se văd pe
pânză, pe formele alese, în locul fâșiei. Nu se face, iar panoul spune de ce, o tăietură în care nu încape niciun dinte, un
model care nu iese cu mărimile date (o rotunjire care nu încape în dinte, o rază a valului sau a puzzle-ului sub cea dată)
și dinții care ar atinge marginea unei forme (o latură oblică sau o gaură prea aproape de tăietură).

**Taie în panouri** (un bloc al panoului): o firmă mai mare decât masa mașinii se taie în panouri, care se prind apoi unul
de altul. Se taie formele alese (fără nimic ales, toate formele foii), pe o grilă peste cutia lor: cu **Mărimea panoului**,
lățimea × înălțimea în mm (implicit, materialul foii), sau cu **Numărul de panouri**, pe lățime × pe înălțime. Cu mărimea,
**Panourile** sunt **egale** (implicit: cel mai mic număr care încape, toate de aceeași mărime) sau **din colț** (panouri
pline de la colțul din stânga-jos, plus ce rămâne): firma de 2 400 × 1 000 mm, cu panoul de 1 200 × 900, dă patru panouri de
1 200 × 500, respectiv două de 1 200 × 900 și două de 1 200 × 100. Sub câmpuri, panoul spune câte panouri ies, iar cât
lucrezi în bloc, grila se vede pe pânză. Tăieturile sunt ale liniilor din panou, cu **Închide bucățile**, **Între bucăți**
și **Îmbinarea** de mai sus: dinții prind panourile între ele, iar jocul le lasă să intre unul în altul. Bucățile fiecărui
panou devin un grup, **Panoul 1**, **Panoul 2** … (rând cu rând, de jos, de la stânga), și stau unde erau; un panou cu o
singură bucată e chiar ea, cu numele panoului, iar o celulă goală a grilei nu primește număr. Un text cu literele de o parte
și de alta a unei linii care nu le atinge se desparte și el, fiecare literă în panoul ei. Peste 100 de panouri nu se taie;
nici o formă pusă de mai multe ori pe foaie. **Taie în panouri** e un singur pas de anulare.

**Decupează la ultima formă aleasă**: granița e forma aleasă ultima (cu Shift + clic), închisă, și rămâne. **Păstrează**
**înăuntru** sau **în afară**: fiecare formă aleasă păstrează doar ce e de partea aleasă, iar una fără nimic acolo pleacă. **Formele care trec granița** se taie (implicit), se șterg sau rămân întregi. Cu **Închide bucățile**, o formă închisă
tăiată rămâne închisă pe graniță: un dreptunghi decupat la un cerc devine partea lor comună; fără bifă, rămân doar bucățile
lui dinăuntru, deschise. **Decupează** e și ea un singur pas de anulare.

**Taie la intersecții** (butonul din partea de jos a panoului, sau din meniul de clic dreapta) taie formele alese între
ele, în toate locurile lor comune: unde se trec, unde se ating și la capetele unei laturi comune. Fiecare bucată devine o
formă, aleasă, ca s-o poți șterge pe cea de prisos. O formă care se taie singură nu se desparte de aici (asta e treaba
verificării), iar un contur închis cu un singur loc comun rămâne întreg.

Bucățile își păstrează rolul de tăiere: un pătrat tăiat pe exterior dă două dreptunghiuri tăiate tot pe exterior. O bucată
deschisă dintr-o formă închisă e tăiată pe aceeași parte a frezei (pe afară sau pe dinăuntru, după sensul desenului).
Buzunarul, V-carve-ul și găurirea cer o formă închisă, deci pleacă de pe bucățile deschise, iar panoul spune câte. O formă
pusă de mai multe ori pe foaie nu se taie de aici. Fiecare tăiere (**Taie vectorii**, din panou) e un singur pas de anulare
(Ctrl+Z).

## Unealta Cuțit
%% capitol: cutit
%% acopera: unealta.cutit

Unealta **Cuțit** (`K`, după Noduri) taie direct pe pânză formele pe care le trece. Taie formele alese; fără nimic ales, toate
formele foii. Cuțitul tras nu rămâne în desen, iar tăierea e cea din [Tăierea vectorilor](#taiere): exactă, cu bucățile la
locul lor și cu rolul lor de tăiere. Selecția rămâne cum era: fără nimic ales, rămâne nimic ales (tăieturile următoare au tot
toate formele foii), iar o formă aleasă care se taie e înlocuită de bucățile ei. Felul cuțitului se alege în bară:
- **Linie**: o tragere peste forme, din capăt în capăt; **Shift** dă pași de 15°, iar capetele se lipesc ca la desen (Alt
  inversează lipirea).
- **Pen**: nodurile cuțitului, ca în unealta [Pen](#pen) (clic = colț, tragere = curbă); **Enter** sau dublu clic taie,
  **Backspace** scoate ultimul nod, **Esc** renunță.
- **Liber**: tragi cu mâna; urma se netezește când ridici mausul, mai fin la zoom mare, cu colțurile ascuțite păstrate.
- **Formă**: un clic pe o formă care există deja (un text, un cerc, o piesă cu mai multe contururi) și ea devine cuțitul;
  rămâne neschimbată. Un text taie din placa de sub el literele și placa cu golurile lor (mijlocul unui „O” rămâne în placă).
  **Shift + clic** adaugă forme la cuțit (contururile lor se citesc împreună); clicul fără Shift, sau **Enter**, taie cu toate;
  **Esc** le lasă.
- **Foarfecă**: un clic pe conturul unei forme îl desparte acolo (lângă un nod, chiar în el): o cale închisă se deschide în
  punctul acela, una deschisă devine două forme. Un cerc deschis rămâne cerc, ca drum: două semicercuri. Capătul unei căi
  deschise nu se desparte.
- **Retează**: bucata conturului de sub maus, între cele mai apropiate două locuri unde îl trec alte contururi (ale formelor
  alese sau, fără nimic ales, ale tuturor formelor foii; și celelalte contururi ale aceleiași piese), se vede cu roșu, iar
  clicul o scoate. Cu ceva ales, formele alese sunt marginile, iar sub maus poate fi orice formă, chiar nealeasă. Ce rămâne
  stă în aceeași formă, ca un DXF cu liniile prelungite să rămână, după curățat, o singură formă: cele opt capete ale unui
  „#” lasă pătratul din mijloc. Un contur fără două locuri comune (o cale deschisă: fără niciunul) pleacă tot. Unde se trece
  singur un contur nu e un loc comun: acolo e treaba verificării. Liniile rămase nu se unesc între ele.

Cât tragi, urma e punctată, iar locurile unde taie se văd cu roșu. Tăierea se face când ridici mausul (la Pen, la Enter),
într-un singur pas de anulare (Ctrl+Z). Ce s-a tăiat (sau de ce nu) se spune în colțul pânzei.

Butonul **Opțiunile tăierii** (glisoarele de după felurile cuțitului; la Foarfecă și Retează nu e, ele n-au opțiuni)
deschide **Închide bucățile**, aceeași bifă ca în panoul Taie, apoi **Prelungește capetele**, **Păstrează**, **Între
bucăți** și **Îmbinarea**, aceleași ca în [panoul Taie](#taiere): un capăt oprit înăuntrul unei forme merge pe tangentă până
iese din ea, partea din dreapta sau din stânga sensului în care tragi pleacă în același pas, spațiul (sau suprapunerea) mută
cuțitul cu jumătate din lățime pentru fiecare parte, iar îmbinarea, doar la felul Linie (o tăietură dreaptă), pune modelul
ei pe tăietură. La felul Formă, părțile se cheamă **înăuntru** și **în afară**, iar **Șterge cuțitul** scoate formele-cuțit
după tăiere. Când o opțiune nu e cea implicită (și bucățile lăsate deschise), butonul are un punct roșu, iar sfatul din
colțul pânzei o spune. Cât tragi (Linie, Liber), capetele prelungite se văd punctate, iar partea care pleacă e estompată, cu
o nuanță roșie, peste formele pe care cuțitul le împarte de tot; cu spațiu sau suprapunere, fâșia lor se vede de o parte și
de alta a urmei, punctată mai rar; cu îmbinare, în locul fâșiei se văd dinții, pe formele pe care urma le trece de tot.

## Conversia vectorilor
%% capitol: conversie
%% acopera: editare.conversie, document.converteste

**Convertește** (butonul cu poligonul care devine cerc, lângă Taie, în extensia barei) schimbă forma formelor alese, fără să
le schimbe locul, numele sau operațiile. Panoul are patru blocuri, fiecare cu butonul lui:
- **Arce în locul curbelor**: fiecare curbă devine arce și linii, fără să se abată de ea mai mult decât **toleranța**
  (implicit 0,01 mm); liniile și arcele rămân. Cu **și liniile scurte care stau pe un cerc** (bifată implicit), un șir de
  linii scurte ale căror vârfuri stau pe un cerc (o polilinie dintr-un DXF) devine un arc, de cel mult o jumătate de cerc;
  colțurile (unde drumul se întoarce cu peste 30°) și liniile lungi rămân.
- **Netezește**: șirurile de linii scurte (o polilinie dintr-un DXF, treptele unei trasări) devin curbe netede, fără să se
  abată de ele mai mult decât **toleranța** (implicit 0,01 mm). Liniile mai lungi de **Păstrează liniile mai lungi de**
  (implicit 5 mm), arcele și curbele rămân, iar curba nouă se leagă de ele fără frântură; colțurile ascuțite (unde drumul se
  întoarce cu peste 60°) rămân colțuri. Treptele mai mici decât de patru ori toleranța nu sunt colțuri: ca o trasare în
  trepte să devină o curbă, alege o toleranță cât treptele.
- **În cerc**: **doar dacă e cerc** (toleranța implicită 0,1 mm), forma devine cercul care trece prin nodurile ei, dacă stă
  toată la cel mult toleranța de el: un cerc Ø100 desenat cu 64 de laturi rămâne Ø100 (laturile lui se abat de cerc cu
  0,06 mm). **Cu diametrul** dat (implicit 8 mm), orice formă închisă devine cercul acela, în centrul cutiei ei: semnele de
  găurire dintr-un DXF devin cercuri, pe care le poți găuri.
- **În dreptunghi**: **doar dacă e dreptunghi** (0,1 mm), forma devine cel mai mic dreptunghi din jurul ei, oricât de rotit,
  cu colțurile rotunjite dacă le are. **Cu mărimea** dată (implicit 40 × 20 mm), orice formă închisă devine dreptunghiul
  acela, drept pe foaie, în centrul cutiei ei. O formă găurită nu devine dreptunghi: găurirea cere un cerc.

Abaterea se măsoară pe toată forma, la noduri și pe laturi, în ambele sensuri. O formă întinsă inegal (mai mult pe o axă decât
pe cealaltă) nu primește arce. Panoul spune ce s-a făcut (formele, curbele înlocuite, arcele și liniile noi, abaterea cea mai
mare) și de ce au rămas celelalte: cât de departe e cea mai apropiată de un cerc sau de un dreptunghi, câte erau căi deschise
(doar formele închise devin cerc sau dreptunghi) sau forme puse de mai multe ori pe foaie, care nu se convertesc de aici.
Fiecare conversie (**Convertește vectorii**, din panou) e un singur pas de anulare (Ctrl+Z).

## Verificarea vectorilor
%% capitol: verificare
%% acopera: editare.verificare, document.repara

**Verifică vectorii** (butonul cu nodul încercuit, după boolean și degrupare, în extensia barei) caută ce poate strica o
tăietură, fără să schimbe nimic în proiect:
- **duplicate**: aceeași formă pusă de mai multe ori în același loc (și între piese): prima rămâne, celelalte sunt copii;
  freza le-ar tăia pe toate, iar exportul refuză contururile care se ating;
- **intersecții**: două forme care se taie, se ating sau au o bucată comună (o latură comună e o suprapunere);
- **autointersecții și bucle**: o formă care se taie singură, cu aria buclei mai mici și cât e ea din formă; sub pragul
  „Bucla mică” (implicit 1 %), bucla e „mică”, ca nodurile încurcate dintr-un import;
- **noduri prea apropiate**: un segment mai scurt decât toleranța, sau nodurile a două forme mai apropiate de atât (de
  exemplu capetele a două căi care ar trebui să fie una);
- **forme deschise**: fiecare cale deschisă, cu distanța dintre capete.

**Toleranța** (implicit 0,01 mm) e distanța sub care două noduri sunt același loc, iar două forme sunt aceeași. Cu forme
alese și bifa **Doar formele alese**, verificarea le cercetează doar pe ele, între ele; altfel, toată foaia. Cât panoul e
deschis, lista se reface singură după fiecare schimbare. Merge la fel pe vectorii desenați și pe cei importați.

Pe pânză, fiecare problemă are un cerc, de aceeași mărime la orice apropiere: **roșu** în aceeași formă, **verde** între
forme; o suprapunere e o linie groasă, iar golul unei căi deschise o linie punctată. Un clic pe un rând alege formele lui
și îi mărește cercul.

Verificarea te ajută întâi să găsești greșelile; desenul rămâne al tău. Câteva se pot repara din panou
(**Repară vectorii**), fiecare cu un singur pas de anulare (Ctrl+Z):
- **Scoate toate copiile**, sub lista duplicatelor: rămâne prima formă din fiecare grup, cu operația ei. O copie cu o
  operație pe care prima n-o are rămâne și ea, iar rândul spune câte au rămas;
- **Închide**, pe o cale deschisă cu capetele la cel mult **Închide sub** (implicit 1 mm): sub toleranță capetele se
  lipesc, peste ea se adaugă o linie dreaptă între ele. Operația rămâne aceeași; rolul îl schimbi din panoul de
  proprietăți. O cale cu capetele mai departe (o linie de gravat) rămâne deschisă, fără buton;
- **Scoate** sau **Desparte**, pe bucla unei forme închise: sub pragul „Bucla mică” bucla se scoate, iar conturul trece
  drept prin încrucișare; peste prag, bucla devine o formă separată, în aceeași piesă și cu aceeași operație (un „8”
  devine două forme, care se ating în punctul de încrucișare). **Repară toate buclele** le face pe toate deodată;
- **Unește**, pe nodurile prea apropiate din aceeași formă: șirul de segmente scurte devine un singur nod. **Unește toate
  nodurile** le face pe toate. Nodurile a două forme diferite doar se arată.

Intersecțiile dintre forme doar se arată: pot fi voite, fiindcă freza urmează fiecare formă cu rolul ei, iar exportul
spune ce nu se poate tăia. O formă dintr-o piesă pusă de mai multe ori nu se repară de aici, fiindcă reparația le-ar
schimba pe toate: rândul spune de câte ori e pusă.

## Operațiile de tăiere
%% capitol: operatii
%% acopera: document.aplica-operatii, document.rol

Fiecare formă are o operație: un **profil** (freza merge de-a lungul conturului, în treceri, până la adâncime), un
**buzunar** (freza scoate tot materialul dinăuntrul unui contur închis, până la adâncime), pe cercuri o **găurire**
(gaura cât cercul, vezi mai jos) sau un **V-carve** (freza în V sapă forma pe mijlocul ei, vezi mai jos). Operațiile se schimbă din
fereastra **Exportă G-code**, câte un rând pe formă; la export, fereastra **aplică operațiile** în proiect.

**Rolul de tăiere** se alege și din panoul de proprietăți, în secțiunea **Tăierea**, pentru oricâte forme alese: **exterior**,
**interior**, **pe linie**, **stânga** sau **dreapta** (pe o cale deschisă), **buzunar**, **găurire** (doar cercuri),
**V-carve**, **incrustație în V** (vezi [Incrustația în V](#incrustatie)) sau **incrustație cu pereți drepți** (vezi
[Incrustația cu pereți drepți](#incrustatie-drept)). Lista arată doar rolurile care se potrivesc tuturor formelor alese; „—”, când au roluri diferite. Rolul e al formei
întregi: pe o literă cu goluri, exteriorul taie conturul pe afară și golurile pe dinăuntru, iar buzunarul și V-carve-ul sapă
litera cu golurile ei, dintr-o dată. La schimbarea rolului rămân freza, sensul, adâncimea și pasul; restul revine la
implicit. Freza în V merge doar pe linie și în V-carve: la V-carve, o freză plată devine una V60 cu același diametru, iar la
alt rol, o freză în V devine plată. La V-carve, adâncimea e cel mult cât conul frezei (la V60 Ø6, 5,196 mm). Sub rol, **Adâncimea** și **Pasul** se scriu pe toate operațiile formelor alese (cu valori
diferite, câmpul e gol). O piesă cu mai multe copii își schimbă rolul pentru toate. Traseul arătat se reface singur.

**Rolurile mele.** Un rol cu toate valorile lui (freza, sensul, adâncimea, pasul, urechile, rampa, intrările, degajările,
coborârea, traseul buzunarului, frezele de rest, fundul plat) se păstrează cu **Salvează ca rol…**, sub câmpurile Tăierii:
scrii numele (cel mult 40 de caractere; e propus din rol, freză și adâncime) și apeși Enter. Merge când formele alese au
același rol și aceleași valori. Rolurile salvate apar în lista Rolului, sub cele de bază, în grupul **Rolurile mele**: doar
cele care se potrivesc formelor alese. Alegerea unuia dă formelor exact valorile lui, într-un pas de anulare; la exterior și
interior, golurile primesc valorile lor, dacă erau altele la salvare. Freza își păstrează numărul (T) cât nicio altă freză din
proiect nu-l are; altfel ia numărul unei freze identice, sau cel mai mic liber. Lista **Rolurile mele (N)** le arată pe toate,
cu **Redenumește** și **Șterge**. Formele își păstrează operațiile (valorile se copiază), iar după o valoare schimbată de mână,
lista Rolului arată rolul de bază. Rolurile stau în browserul acesta, pentru toate proiectele: alt calculator, alt browser sau
adresa de test față de cea live au lista lor.

| Câmpul | Ce înseamnă |
|---|---|
| Tăietura | **exterior** (piesa rămâne înăuntru), **interior** (o gaură), **pe linie** (freza pe contur), **buzunar** (golește conturul, vezi mai jos), **găurire** (doar pe un rând numai cu cercuri), **V-carve** (sapă forma cu freza în V, vezi mai jos), **incrustație în V** (locașul și dopul lui, vezi [Incrustația în V](#incrustatie)), **incrustație cu pereți drepți** (un buzunar cu dopul lui, vezi [Incrustația cu pereți drepți](#incrustatie-drept)); pe o cale deschisă: pe linie, **stânga** sau **dreapta** (partea pe care merge freza, privind în sensul săgeții de pe planșă) |
| Sens | **urcare**: materialul care rămâne e în dreapta sensului de mers (ax M3); **opoziție**: invers. Pe linie nu contează; acolo, alături, **Direcția**: **ca desenul**, **invers** sau **cel mai scurt drum** (o cale deschisă pornește din capătul mai apropiat de locul în care a rămas freza; o buclă închisă rămâne cum e desenată) |
| Adâncimea, Pasul | cât de adânc se taie și cât coboară o trecere (mm) |
| Urechi | punți care țin piesa în foaie pe ultimele treceri: câte pe buclă, lungimea și grosimea punții (de la fața de jos) |
| Rampă | freza coboară de-a lungul buclei, nu drept în material; lungimea rampei (cel puțin 1 mm) |
| Intrări | freza intră pe contur și iese pe câte un sfert de cerc, prin deșeu, ca peretele piesei să nu păstreze urma |
| Colțuri | degajarea colțurilor în care freza nu intră: **dog-bone** (pe diagonală) sau **T-bone** (în peretele mai lung). Un colț a cărui degajare ar lăsa sub 1 mm de material până la alt perete al piesei, sau până la degajarea altui colț (la baza unei limbi sau a unui deget subțire), rămâne fără ea, cu un avertisment. Și colțurile cu o latură curbă (un „D”, un umăr rotund, o lentilă, o curbă importată) primesc degajarea; unde freza nu ajunge deloc în colț, avertismentul o spune |
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
- Contururile rândului se citesc împreună, par-impar: un „O” e inelul dintre cele două contururi, nu două forme. La fel
  rândurile V-carve ale aceleiași forme cu aceleași valori (freza, adâncimea, pasul, fundul plat): un text pus pe V-carve rând
  cu rând se sapă cu golurile lui. Cu valori diferite, fiecare rând e o regiune separată.
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

## Incrustația în V
%% capitol: incrustatie

O **incrustație în V** pune un dop dintr-un lemn în locașul săpat în altul: locașul e un V-carve al desenului, iar dopul e
același desen, oglindit, săpat în V pe semifabricatul lui, ca să intre în locaș și să se oprească înainte de fund. Se alege ca
rol: **incrustație în V**, din secțiunea **Tăierea** a panoului de proprietăți sau din lista Tăietura a ferestrei **Exportă
G-code**. Freza rândului e în V, ascuțită (fără vârf plat), iar fundul plat cu freza dreaptă e pus: el scoate fundul locașului
și lemnul din jurul dopului.

Valorile incrustației, sub Adâncime și Pas în panou și pe rândul ei din fereastra exportului:

- **Jocul pentru clei** (g; implicit 0,5 mm, cel puțin 0,1): cât rămâne sub dop. Dopul se sapă de la adâncimea locașului
  minus jocul (S = D − g), deci se oprește pe pereți, cu g deasupra fundului.
- **Spațiul pentru fierăstrău** (H; implicit 2 mm): cât rămâne între cele două plăci după lipire, ca să tai cu fierăstrăul
  spatele semifabricatului dopului sau să-l rindeluiești. În fereastra exportului, **Același spațiu pentru clei și
  fierăstrău** ține o singură valoare pentru amândouă.
- **Marginea dopului** (implicit 5 mm): cât lemn rămâne în jurul desenului pe semifabricatul dopului (cu banda, dincolo de
  ea și de șanțul ei).

**Lemnul din jurul dopului**, ales în secțiunea **Tăierea** a panoului (pentru toate formele alese) sau pe rândul
incrustației din fereastra exportului; valorile benzii se aleg în fereastră:

- **fața coborâtă toată** (implicit): freza dreaptă coboară toată fața semifabricatului dopului, până dincolo de margini, deci
  semifabricatul se prinde fără cleme pe margini (de exemplu cu bandă dublu adezivă), iar spatele lui se taie după lipire;
- **banda îngustă**: doar o bandă în jurul dopului, săpată cu V-ul și cu fundul plat, iar marginile semifabricatului rămân
  întregi, pentru cleme. Valorile ei, fiecare la alegerea ta:
  - **Lățimea benzii**: goală, cea mai mică, socotită de aplicație și arătată lângă câmp: 2 · H · tan(θ/2) (pereții dopului
    și ai benzii) plus freza fundului plat (sau, cu decuparea, cea mai lată dintre ea și freza decupării) plus 2 · 0,5 mm
    rezervă. O poți lărgi; mai îngustă, fereastra o refuză.
  - **Decupează dopul din placă, cu punți** (pusă implicit): la urmă, freza decupării taie dopul prin toată placa, pe fundul
    benzii, la H · tan(θ/2) + 0,5 mm de desen, și lasă punțile. Fără bifă, rămâne doar banda, iar dopul îl tai tu cu
    fierăstrăul, pe fundul ei.
  - **Grosimea plăcii dopului**: goală, adâncimea − jocul + fierăstrăul + 1 mm (S + H + 1). Tăietura trece prin toată placa,
    deci grosimea trebuie să fie exactă; cel puțin fundul benzii plus grosimea punților.
  - **Punți pe buclă**, **Lățimea punții**, **Grosimea punții** (implicit 4, 4 mm și 1 mm): ca urechile; grosimea se măsoară
    de la fundul plăcii, deci după așezare punțile stau deasupra plăcii și se rindeluiesc odată cu restul.
  - **Altă freză pentru decupare**: implicit, freza dreaptă a fundului plat; cu bifa, numărul și diametrul alteia (un număr
    nou, ca orice freză).

**Pe hârtie**, panoul arată, pentru formele alese cu aceleași valori: cât intră dopul în locaș (S), pe cât se ating pereții de
la contur (S · tan(θ/2)), jocul de sub dop, spațiul dintre plăci, cât din conul frezei folosesc locașul și dopul, și grosimea
cea mai mică a semifabricatului dopului (S + H + 1 mm). De exemplu, cu V60 Ø6, adâncimea 3, jocul 0,5 și fierăstrăul 2: dopul
intră 2,5 mm, pereții se ating pe 1,44 mm, dopul se sapă până la 4,5 mm din conul de 5,20 mm, iar semifabricatul are cel puțin
5,5 mm. Cu banda (de îndată ce o alegi, și înainte de primul export), arată și lățimea ei (și pe cea mai mică), semifabricatul în plan (cutia desenului plus banda, șanțul de la
față și marginea, pe fiecare parte) și decuparea: placa și punțile, sau unde tai de mână. În exemplu, cu fundul plat Ø6, banda
are cel puțin 9,31 mm, iar semifabricatul, cutia desenului plus 15,75 mm pe fiecare parte.

**Exportul.** La **Exportă**, pe lângă programul foii (cu locașul), se descarcă un fișier pentru fiecare dop: numele
programului foii cu „-dop-1”, „-dop-2”… (pe numele scurte, DOP1…). Fereastra arată, pentru fiecare, semifabricatul: lățimea ×
înălțimea (cutia desenului, plus marginea pe fiecare parte) și grosimea cea mai mică. Dopul e desenul oglindit stânga–dreapta;
XY0 e în colțul ales pentru foaie, pe semifabricatul dopului, iar Z0 pe fața lui. Programul coboară întâi fața
semifabricatului cu freza dreaptă, până la S + H (lemnul din jurul dopului), apoi freza în V taie pereții dopului de la S în
jos; schimbarea frezei e cea aleasă în fereastră, ca la foaie. Cu banda, freza dreaptă scoate doar fundul benzii, iar cu
decuparea, la urmă, freza decupării taie dopul prin placă; fereastra arată atunci placa „groasă de exact” grosimea aleasă.

**Lipirea.** Întoarce dopul cu fața în jos peste locaș (oglindirea îl aduce la desen) și apasă-l cu clei: se oprește pe pereți,
cu jocul sub el și spațiul dintre plăci. Apoi taie sau rindeluiește spatele lui până la fața plăcii. Cu decuparea, întâi
taie punțile și curăță-le la nivelul pereților, ca dopul să intre întreg.

**Refuzurile**, cu motivul, la export: o freză plată sau cu vârf plat; jocul sub 0,1 mm (crestele din colțurile locașului ar
ține dopul) sau cel puțin cât adâncimea; dopul săpat (adâncimea − jocul + fierăstrăul) mai adânc decât conul frezei; lipsa
fundului plat cu freza dreaptă (varianta doar cu freza în V vine mai târziu). Cu banda: mai îngustă decât cea mai mică; cu
decuparea, o placă mai subțire decât fundul benzii plus punțile, o freză a decupării în V, sau cu numărul altei freze și alt
diametru. Dopul în vederea 3D vine într-o felie următoare; pereții drepți au capitolul lor ([Incrustația cu pereți
drepți](#incrustatie-drept)).

## Incrustația cu pereți drepți
%% capitol: incrustatie-drept

O **incrustație cu pereți drepți** pune un dop cu pereți verticali în locașul săpat în altă placă: locașul e un buzunar al
desenului, iar dopul e același contur, tăiat cu freza plată pe semifabricatul lui, mai mic cu un joc lateral pe toată
lungimea. Se alege ca rol: **incrustație cu pereți drepți**, din secțiunea **Tăierea** a panoului de proprietăți sau din lista
Tăietura a ferestrei **Exportă G-code**. Freza rândului e plată; buzunarul își păstrează frezele de rest, strategia și
coborârea.

**Colțurile le potrivește aplicația.** Freza e rotundă: în locaș, vârfurile desenului ies rotunjite cu raza ei (R), iar la dop,
pe care freza îl ocolește pe dinafară, se rotunjesc unghiurile intrânde (cu raza frezei dopului, r). Aplicația rotunjește deci
și unghiurile locașului, cu r minus jocul, iar dopul e conturul tăiat al locașului micșorat cu jocul: arcele perechi sunt
concentrice, iar jocul e același pe tot conturul, și în colțuri. Cât se retrage cel mai ascuțit vârf față de desen apare ca
avertisment după export. O parte a desenului mai îngustă decât freza nu încape în locaș: exportul o refuză.

Valorile incrustației, în panou (sub Adâncime și Pas) și pe rândul ei din fereastra exportului:

- **Jocul lateral** (c; implicit 0,1 mm): cât rămâne între pereții dopului și ai locașului, pe fiecare parte. Locașul rămâne
  cât desenul, dopul se micșorează cu c. Trebuie să fie sub raza celei mai mici freze a locașului.
- **Dopul** (doar în fereastra exportului): **ridicat pe semifabricat**: dopul rămâne în picioare pe semifabricatul lui
  (desenul oglindit, fața coborâtă în jur), îl întorci în locaș și tai spatele; sau **decupat prin placă**: dopul se taie prin
  toată placa lui, cu 4 punți pe buclă (desenul neoglindit), și intră în locaș fără întoarcere.
- **Se sprijină** (doar la dopul ridicat): **pe fundul locașului**: dopul e înalt cât adâncimea plus **spațiul pentru
  fierăstrău** (H; implicit 2 mm), care rămâne între plăci; sau **pe fața plăcii**: fața coborâtă a semifabricatului stă pe
  placă, iar dopul e înalt cât adâncimea minus **jocul pentru clei** (g; implicit 0,5 mm, cel puțin 0,1 și sub adâncime).
- **Cât iese peste placă** (la dopul decupat; tot H): placa dopului e groasă cât adâncimea plus H, iar partea care iese peste
  placă se rindeluiește după lipire.
- **Marginea dopului** (implicit 5 mm): cât lemn rămâne în jurul desenului pe semifabricatul dopului; la cel decupat, cel puțin
  cât freza lui.
- **Altă freză pentru dop** (doar în fereastra exportului): implicit, dopul se taie cu frezele locașului; cu bifa, cu o freză a
  lui (T, Ø, pasul lateral) și frezele ei de rest. O freză mai mică ascute unghiurile intrânde: locașul le rotunjește cu raza
  ei minus jocul. Același T înseamnă aceeași freză și în fișierul dopului.

**Pe hârtie**, panoul arată, pentru formele alese cu aceleași valori: colțurile locașului (vârfurile R, unghiurile r − c) și ale
dopului (vârfurile R − c, unghiurile r), jocul pe contur, înălțimea dopului și grosimea semifabricatului (cea mai mică la dopul
ridicat, înălțimea plus 1 mm; exactă la cel decupat). De exemplu, cu freza Ø6, adâncimea 6, jocul 0,1 și dopul ridicat pe
fund: vârfurile locașului R3, unghiurile R2,9, ale dopului R2,9 și R3; dopul e înalt de 8 mm, iar semifabricatul are cel
puțin 9 mm.

**Exportul.** Ca la incrustația în V, se descarcă și un fișier pentru fiecare dop („-dop-1”…), cu semifabricatul lui: XY0 în
colțul ales, Z0 pe fața lui. La dopul ridicat, fața se coboară în jur cu frezele dopului, până dincolo de marginile
semifabricatului: fixează-l fără cleme pe margini, de exemplu cu bandă dublu adezivă. La dopul decupat, conturul se taie ca
exterior, prin placă, cu punți late de 4 mm și groase de 1 mm, iar golurile desenului ca interioare; taie punțile și
curăță-le la nivelul pereților înainte de lipire.

**Refuzurile**, cu motivul, la export: incrustația pe altceva decât un buzunar; o freză în V la dop; jocul lateral cel puțin cât
raza celei mai mici freze a locașului; pe față, jocul de sub dop sub 0,1 mm sau cel puțin cât adâncimea; o parte a desenului
mai îngustă decât freza; marginea dopului decupat mai mică decât freza lui.

## Traseul pe pânză
%% capitol: traseu
%% acopera: vedere.traseu

**Arată traseul** (`T`, sau butonul din bara de jos) calculează programul documentului și desenează pe pânză drumul frezei:
tăierile cu verde, mișcările rapide cu gri. Lângă el apare **timpul jobului**, estimat pentru setările mașinii (cele din
fabrică ale GRBL 1.1h, sau setările `$$` lipite în fereastra exportului).

Cât e arătat, traseul se reface singur după fiecare schimbare (desenul, rolul de tăiere, adâncimea, o anulare): traseul vechi
se stinge sub „se calculează”, apoi apare cel nou. `T`, pe traseul arătat, îl ascunde. Dacă programul nu se poate calcula,
semnul de jos spune de ce. Traseul cere WebGL2 în browser.

Calculul (traseul, timpul, exportul, vederea 3D) rulează separat de desen: pe un proiect mare, pânza nu se oprește cât se
calculează. Dacă schimbi desenul înainte să fie gata traseul, calculul lui se oprește și pornește din nou, pe desenul de acum.

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
- **Postul**: controlerul mașinii. Familia GRBL (GRBL 1.1, grblHAL, FluidNC) vorbește cu senderul aplicației; **NcStudio,
  RichAuto, Syntec, Mach3** și **Mach4** primesc un fișier pe care îl rulezi de pe controlerul lor (în panoul mașinii nu
  ajunge). Un post scris doar după documentația controlerului, încă neprobat pe o mașină, poartă o notă: urmărește primul
  program în aer;
- **Unitățile**: mm (implicit) sau inch (cu 5 zecimale și avansul în inch/min); antetul rămâne în mm. RichAuto citește doar mm;
- **Schimbarea frezei**, doar când rândurile au freze diferite: **oprire în senderul aplicației** (implicit pe familia GRBL:
  lucrarea se oprește la `T… M6`, scoți freza, o pui pe următoarea, palpezi Z și **Continui**), **M6 la controler** (grblHAL,
  FluidNC, cu schimbarea configurată acolo; implicit pe Syntec, Mach3 și Mach4), **M0, cu freza în comentariu** sau **câte un
  fișier pe freză** (se descarcă toate; implicit pe NcStudio și RichAuto, care n-au M06).

Posturile atelierelor scriu ce cere documentația controlerului. Setările de care depinde fișierul apar în fereastră și în
antetul programului: verifică-le pe controler înainte de pornire.
- **NcStudio**: comentariul începe cu apostrof, pauza `G4 P` e în milisecunde, fără `G94`. Setările: **N4063 = 1** (arcele
  cu I/J față de start), **N4034 = 0** și **N4035 = 0** (avansul și turația din fișier);
- **RichAuto**: fără comentarii, fără unități și fără WCS (lucrează în sistemul activ pe controler), fără `G4` (după
  pornirea axului așteaptă controlerul), elicea în segmente, nume scurte pentru stick-ul FAT (`CNCVS2.NC`, `CV2T3.NC`). O
  ieșire din foaie confirmată nu se poate scrie în program, deci exportul o refuză. Setările: **F Read = Read**, **AbsCntr =
  Off** și întârzierea axului la pornire de cel puțin 3 s;
- **Syntec**: programul începe cu `%` și `O0001`, unitățile sunt `G71` (mm) sau `G70` (inch), pauza e în milisecunde. La
  început și la fiecare schimbare, `T… M6`, apoi `G43 H…`: lungimea frezei din tabela de scule (0, dacă faci Z pe fiecare
  freză);
- **Mach3**: `G91.1` (arcele cu I/J față de start), `T…` pe linia dinaintea lui `M6`, pauza în secunde. Setările profilului:
  **G04 Dwell param in Milliseconds** nebifat și **Tool Change = Stop Spindle. Wait for Cycle Start**;
- **Mach4**: ca Mach3, cu `%` după `M30`; pauza `G4 P3.000` înseamnă 3 s în ambele ediții ale manualului Mach4.

Pe aceste cinci posturi, o deplasare rapidă care schimbă și XY, și Z se scrie în două linii (urcarea întâi, coborârea la
urmă): acolo, `G0` poate merge pe fiecare axă cu viteza ei.

Fiecare rând are **freza** lui: numărul sculei (T), diametrul (mm) și forma: **plată** sau **în V**, cu unghiul inclus al
vârfului (între 1° și 179°, implicit 60°; la V, diametrul e cel al părții tăietoare). Rândurile cu freze diferite se taie cu o
schimbare între ele: în ordinea automată, în fiecare clasă (interioarele, apoi pe linie, apoi exterioarele), întâi freza deja
montată, ca schimbările să fie cât mai puține. Același număr cu două diametre sau două forme e refuzat: fiecare freză cere
numărul ei.

**Ordinea tăierii** stă deasupra tabelului. Rândurile apar în ordinea în care se taie, cu locul lor în coloana **#**:
- **Automată** (implicit): interioarele întâi, apoi liniile, la urmă exterioarele și despărțirile foii; în fiecare, grupate pe
  freză. O latură sau o freză schimbată în fereastră reface ordinea la export;
- **A mea**: se taie de sus în jos. Muți un rând trăgând de mânerul lui (cele șase puncte) sau cu săgețile **↑** / **↓**. Lista
  pornește din ordinea automată, iar **Înapoi la ordinea automată** o readuce. Ordinea se scrie în proiect la **Exportă**:
  fereastra redeschisă o arată, iar traseul, timpul, animația și vederea 3D o urmează. O operație nouă (o formă desenată, un
  import, un text) vine la capăt. Schimbările de freză urmează ordinea ta, deci pot fi mai multe decât în cea automată.

V-carve-urile aceleiași piese, cu aceleași valori (freza, adâncimea, pasul, sensul, fundul plat), se sapă ca o singură
regiune: rândul de după primul arată **cu N**, adică se sapă odată cu rândul N. Buzunarele nu se unesc: fiecare se taie la
locul lui. Dacă în ordinea ta exteriorul unei piese vine înaintea altei operații a ei sau a unei forme din interiorul ei (un
cerc desenat în dreptunghi), sau o despărțire a foii înaintea altei operații, piesa se poate desprinde înainte să fie gata:
fereastra numește rândurile, iar **Exportă** cere bifa **Taie în ordinea mea** (orice mutare o șterge).

Butonul **Exportă** descarcă fișierul și arată câte linii are și amprenta lui SHA-256 (cu ea verifici că pe mașină ajunge
exact fișierul ăsta). Dacă freza ar ieși din foaie, fereastra spune cu cât și unde, iar exportul cere confirmarea ta că acolo
nu e nimic în cale (cleme, șuruburi); confirmarea se scrie în antetul programului. După un export pe care îl trimite
senderul aplicației (familia GRBL), **Deschide în Mașina** închide fereastra și încarcă programul în [Mașina](#masina), fără
să-l pornească.

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

Fila **Mașina** din meniul aplicației deschide fereastra mașinii, pe tot ecranul, sub meniu: ea trimite programul la mașină,
prin cablul USB sau prin WiFi, și îi arată starea. Pe un ecran lat stă pe trei coloane: mașina (conexiunea, starea și poziția,
cu cifre mari, poziționarea), lucrarea (faza cu butoanele ei și programul) și consola (comanda și jurnalul). Pe un laptop,
consola coboară dedesubt; pe telefon, totul stă pe o coloană, în ordinea urgenței.

- **Desenul rămâne la un clic.** Fila **Proiectare** te întoarce la desen oricând, iar lucrarea continuă. Cât ești în Mașina,
  tastele desenului (Delete, Ctrl+Z, săgețile, uneltele) nu ating desenul acoperit; `Ctrl+K` merge, iar o comandă a desenului
  aleasă din paletă te duce întâi în Proiectare. `F1` deschide capitolul ăsta. **Escape** închide doar ce e deschis
  (alegerea WiFi, o confirmare): nu schimbă fereastra și nu trimite nimic la mașină.
- **Indicatorul lucrării** stă în meniul aplicației, după prima deschidere a Mașinii, și se vede din orice fereastră: „Mașina
  conectată”, „Rulează 42 %” (verde, cu **Pauză** alături), „Pauză 42 %” (portocaliu, cu **Reia**), „Oprită la M6”, „Oprită la
  linia …” sau „Oprită pe o eroare” (portocaliu), „Alarmă” sau „Lucrare întreruptă” (roșu), „Lucrare gata”. Un clic pe el
  deschide Mașina. **Oprește** rămâne doar în fereastră: o repornire apăsată din greșeală pierde poziția. Cât rulează
  lucrarea, titlul filei browserului începe cu procentul.
- **Cu o lucrare pornită**, închiderea sau reîncărcarea paginii cere întâi confirmarea browserului: legătura s-ar tăia, iar
  lucrarea s-ar opri la mijloc. Tot atunci, „Versiune nouă gata” arată **Reîncarcă după lucrare**, dezactivat, până se termină.

- **Conectează (USB)** te lasă să alegi portul mașinii (GRBL, 115 200 baud). Merge doar în Chrome sau Edge pe un calculator
  (Web Serial); altfel, panoul spune asta. Pe instanța de test mai e și **Mașină simulată**: un controler GRBL simulat, ca să
  încerci panoul fără CNC, cu **Viteza** 1×, 10× sau 100×. **Deconectează** închide portul.
- **Conectează (WiFi)** leagă panoul de un controler din rețeaua locală, printr-un WebSocket (Chrome și Edge, de la versiunea
  147: prima dată, browserul cere voie pentru dispozitivele din rețeaua locală, iar un refuz se schimbă din setările site-ului).
  Fereastra arată conexiunile ținute în browser, fiecare cu rețeaua ei: **prin rețeaua** atelierului (după nume, de exemplu
  `esp3d.local`, cu ultimul IP ca rezervă), **direct**, prin rețeaua proprie a mașinii (podul ESP3D, la `192.168.0.1`), sau o
  adresă scrisă de mână. Alegi tu la care te legi, cu **Conectează**: fereastra nu se conectează singură. **Uită** scoate o
  conexiune din listă, iar **Renunță** închide alegerea. Dacă nu merge, panoul spune ce a încercat (numele, apoi ultimul IP) și
  ce verifici: mașina pornită, calculatorul în aceeași rețea, pagina controlerului (cu un link spre ea).
- **Caută mașina** încearcă deodată conexiunile ținute, numele obișnuite ale controlerelor (`esp3d.local`, `fluidnc.local`,
  `grblhal.local`) și rețeaua proprie a podului; controlerul se deduce din cine răspunde, iar o mașină găsită se leagă cu
  **Conectează**. **Caută în toată rețeaua**, doar la clic, încearcă fiecare adresă a rețelelor obișnuite (192.168.0.x,
  192.168.1.x, sau rețeaua ultimului IP), întâi pe portul 8282 (podul ESP3D), apoi pe 81, cu bara de progres; browserul
  încetinește încercările fără răspuns, deci durează cam un minut pe rețea și port. Se oprește la prima mașină găsită, sau cu
  **Oprește căutarea**. Unui controler i se trimite doar `?` (o cerere de stare, fără răspuns `ok`), deci nu încurcă un alt
  program care-i trimite deja o lucrare. **Înapoi** te întoarce la listă.
- **Altă adresă…** e formularul de mână: **Controlerul** (FluidNC, grblHAL sau un pod ESP3D pe un GRBL clasic, care-și aduce
  portul implicit), **Adresa** (un IP local, de exemplu `192.168.1.50`, sau un nume care se termină în `.local`) și **Portul**,
  apoi **Conectează**. Ultima adresă rămâne în formular. O adresă pe care browserul n-ar lăsa-o (un nume obișnuit, un IP din
  afara rețelei locale) se refuză înainte de conectare, cu motivul.
- **Configurează un pod nou** pune podul ESP3D în rețeaua atelierului, în trei pași, fără terminalul lui:
  1. legi calculatorul la rețeaua podului (ESP3D, cu parola din fabrică, 12345678), apoi **Verifică** (**Adresa podului** e
     implicit `192.168.0.1:8282`): podul își spune versiunea și ținta, iar drumul direct, prin rețeaua lui, rămâne ținut;
     **Continuă**;
  2. din **Rețelele văzute de pod** (cu semnalul; **Caută din nou** le recitește) alegi rețeaua atelierului, sau **Altă rețea**
     pentru una ascunsă, scrii **Parola rețelei** și o **Parolă nouă pentru rețeaua podului** (cea din fabrică e publică), apoi
     **Trimite podului**. Parolele merg doar de la browser la pod și nu se țin nicăieri;
  3. legi calculatorul înapoi la rețeaua atelierului, iar aplicația caută podul la `esp3d.local` până răspunde, apoi îl ține,
     cu rețeaua lui: **Conectează** sau **Gata**. Dacă nu apare, podul s-a întors în rețeaua lui (cu parola nouă): **Reia de la
     pasul 1**, sau caută-l în toată rețeaua.
- **Prin WiFi, legătura poate cădea.** Atunci mașina termină ce are în memorie și se oprește, iar panoul nu mai poate trimite
  Pauză sau Oprește, ca la un cablu scos. De aceea, la prima pornire a unui program prin WiFi, panoul spune asta întâi:
  **Pornește oricum** sau **Renunță**. Oprirea de urgență a mașinii rămâne cea fizică.
- **Starea** vine din rapoartele mașinii (de 5 ori pe secundă): Idle, Run, Hold:0 (oprită), Hold:1 (încă frânează), Alarm, și
  poziția (de lucru, când se știe; altfel a mașinii).
- **Programul**: **Ultimul export** încarcă exact fișierul ultimului Exportă G-code (amprenta SHA-256 e aceeași cu cea din
  fereastra exportului); **Fișier…** încarcă un G-code din alt program, verificat întâi. Un program se refuză, cu linia, dacă are
  caractere în afara ASCII (la GRBL, „ș” și „ț” ar schimba turația axului), capete de linie Windows (`\r`), linii de peste 70 de
  octeți, nu alege un sistem de coordonate (`G54`–`G59`) înaintea primei mișcări, schimbă scula (`M6`) fără să fie exportat de
  aici sau n-are capăt de linie la sfârșit. Cu câte un fișier pe freză, **Fișierul ultimului export** alege care se încarcă. Din fereastra exportului, după un
  export reușit, **Deschide în Mașina** aduce aici primul fișier al exportului, încărcat, fără să-l pornească.
- **Lucrarea primită**: o aplicație care trimite lucrări (de exemplu Easy 3Draw, cu „Trimite la cvs2”) deschide
  cvs2 într-o filă nouă. Dialogul **Lucrare primită** spune cine trimite, de unde (o adresă, sau o pagină deschisă din fișier,
  de pe calculatorul tău) și ce fișiere, cu placa, freza și timpul. **Primește** verifică fiecare fișier la fel ca unul adus
  cu **Fișier…** și deschide fereastra Mașina; **Nu** îi răspunde aplicației că n-ai vrut lucrarea. Fișierele bune stau sub butoane, în
  ordinea de tăiere: alegi unul din **Fișierul lucrării primite** și apeși **Încarcă lucrarea**; cele refuzate stau dedesubt,
  fiecare cu motivul. Nimic nu pornește singur, iar lucrarea se pierde la reîncărcarea paginii (aplicația o poate trimite din
  nou). Pe instanța live, primirea e oprită deocamdată.
- **De la o extensie** (capitolul Extensiile): un program încărcat de o extensie are lângă nume „de la” ea. O pornire sau o
  reluare cerută de o extensie te întreabă întâi, într-o fereastră a aplicației: **Pornește** (sau **Reia**) se poate apăsa
  după o secundă, iar **Nu** și Escape nu trimit nimic.
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

## Imprimanta
%% capitol: imprimanta
%% acopera: vedere.imprimanta

Fila **Imprimanta** din meniul aplicației deschide fereastra imprimantei 3D, pe tot ecranul, sub meniu. Deocamdată lucrează cu
imprimantele Creality din familia K1 (K1C și K1C 2025), prin WiFi, pe protocolul lor din fabrică: fără root și fără nicio
setare pe imprimantă. Imprimanta lucrează în paralel cu CNC-ul, deci fereastra Mașina rămâne a lui. `F1` deschide capitolul ăsta.

- **Conectarea.** Scrie **Adresa imprimantei** (o vezi pe ecranul ei: Setări → Rețea, de exemplu 192.168.1.50) și apasă
  **Conectează**. Prima dată, browserul întreabă dacă pagina poate ajunge la dispozitivele din rețeaua locală: alege
  **Permite**. Merge în Chrome și Edge, pe calculator. O imprimantă legată rămâne în listă, cu numele ei (de exemplu
  „K1C-8578”): data viitoare o alegi de acolo, cu **Conectează**, iar **Uită** o scoate din listă. Fereastra nu se leagă
  singură când o deschizi.
- **Caută în toată rețeaua** încearcă portul 9999 pe fiecare adresă a rețelei, doar când apeși, cam un minut; **Oprește
  căutarea** o oprește. Prima imprimantă care răspunde se leagă.
- **Când nu merge,** fereastra spune ce s-a întâmplat (nu răspunde nimic, permisiunea refuzată, răspunde altceva decât o
  imprimantă) și ce verifici: imprimanta pornită, calculatorul în aceeași rețea cu ea (nu într-o rețea de oaspeți), adresa
  de pe ecranul ei.
- **Starea.** Sus stă banda imprimantei: starea (Liberă, Se pregătește, Imprimă, Pauză, Oprită, Gata), numele, adresa și
  firmware-ul. Dedesubt: lucrarea (fișierul, progresul, timpul trecut și cel rămas, stratul), **Temperaturile** duzei, ale
  patului și din carcasă și codul semnalat de imprimantă (textul lui îl arată ecranul ei).
- **Placa**, cât imprimă sau stă în pauză, în cardul lucrării: patul văzut de sus, mărit pe piese, cu fața imprimantei jos.
  Arată piesele (conturul lor; **piesa de acum**, cu un contur turcoaz; una **anulată**, tăiată), **duza** (un punct alb,
  doar cât imprimă) și, pentru fișierele trimise din cvs2, **stratul de acum** (portocaliu) peste cel de dedesubt. Lângă ea,
  bara straturilor (cele făcute, stratul de acum, pauzele din fișier) și „Stratul 6 / 10 · 1,2 mm”: imprimanta K1C amestecă
  două numărători ale stratului, deci fereastra îl ia după filamentul folosit (pentru fișierele trimise din cvs2) sau pe cel
  care se potrivește cu progresul. Dedesubt, **Piesele**, cu numele din cvs2. Cât imprimanta stă într-o pauză a fișierului,
  placa spune pauza și nota ei. Fișierele trimise din cvs2 se țin în browser (ultimele 5), ca să li se poată desena
  straturile; pentru altele, placa arată doar piesele, duza și numărul stratului.
- **Anularea unei piese** (doar ce are imprimanta legată; azi familia K1), cât imprimă sau stă în pauză: **Anulează…** lângă
  o piesă din listă (sau un clic pe ea, pe placă) deschide confirmarea: **Anulează piesa** sau **Renunță**. Restul pieselor
  merg mai departe, iar piesa anulată nu se mai reia. Rândul piesei arată „→ se anulează · așteaptă imprimanta” până
  imprimanta o trece printre cele anulate; fără ea în 6 s, „imprimanta n-a confirmat”. K1 nu anulează piesa la care lucrează
  chiar atunci: cererea rămâne la vedere, cu **Renunță**, și se retrimite până o primește imprimanta, cel mult 2 minute.
  Ultima piesă rămasă n-are buton: pentru ea, Oprește. La imprimantă ajunge doar un nume din lista ei, din litere, cifre,
  _ . -; nimic scris de mână.
- **Pauză**, **Reia** și **Oprește** stau sus, în bandă, cât imprimă. Pauza pleacă pe loc. Oprește cere o confirmare, fiindcă o
  imprimare oprită nu se mai poate relua: **Oprește imprimarea** sau **Lasă-o să meargă**. **Deconectează** închide doar
  legătura; imprimanta nu e atinsă.
- **Comenzile din timpul imprimării** (doar ce are imprimanta legată; azi familia K1). O valoare cerută se vede
  „→ 120 % · așteaptă imprimanta” până o raportează imprimanta; dacă nu vine în 6 s, fereastra revine la valoarea ei, cu
  „imprimanta n-a confirmat”. Un glisor trimite când îl lași, un câmp la `Enter` sau când ieși din el; un număr în afara
  intervalului nu pleacă.
  - **Temperaturile:** **Ținta duzei** și **Ținta patului** se scriu direct, în grade întregi, între 0 și maximul spus de
    imprimantă (320 și 115 °C pe K1C). Cu imprimanta liberă, **Preîncălzește** deschide lista materialelor felierului
    (aceeași ca în „Din desen…”), cu temperaturile primului strat, iar **Răcește** pune țintele la 0. Cât o țintă e pornită
    fără o lucrare, banda spune **Încălzește**, cu **Răcește** lângă. **Răcește singură după** 30 **min fără imprimare**
    (bifată din fabrică, cu minutele de schimbat): după o preîncălzire din aplicație, dacă nu pornește nicio imprimare,
    fereastra pune țintele la 0 și spune ora; merge doar cât fereastra e deschisă și legată. Cât imprimă, fișierul poate
    schimba țintele la straturile următoare.
  - **Viteza** și **Debitul**, cât imprimă sau stă în pauză: între 1 și 200 %, cu glisorul, câmpul și **100 %**, care le
    readuce.
  - **Ventilatoarele și lumina:** **Lumina**, aprinsă sau stinsă; ventilatorul piesei, al carcasei și cel lateral, între 0
    și 100 % (pe K1 pleacă un `M106` scris doar de aplicație: fereastra n-are consolă de G-code). **Homing (X, Y, Z)**,
    doar cu imprimanta liberă, după bifa **Patul e gol**: capul merge întâi pe X și Y, apoi duza coboară spre pat, pentru
    Z; **Renunță** închide confirmarea.
- **Fișierele din imprimantă** (trimise din Creality Print sau OrcaSlicer): **Pornește** deschide confirmarea, cu fișierul,
  materialul și timpul estimat. **Pornește imprimarea** se aprinde abia după bifa **Patul e gol** (nicio piesă rămasă sub
  duză); **Renunță** închide confirmarea. Imprimanta se încălzește și își face singură verificările; imediat după pornire
  închide legătura, iar fereastra se leagă singură din nou. **Reîmprospătează** cere din nou lista.
- **Trimite un fișier…** (sub listă) trimite la imprimantă un `.gcode` de pe calculator, gata feliat în Creality Print sau
  OrcaSlicer. Întâi fereastra îl verifică pe calculator: pentru ce imprimantă a fost feliat, duza, materialul, temperaturile,
  timpul estimat și miniatura, apoi dacă toate mișcările încap în patul imprimantei (220 × 220 × 250 mm la K1C). O mișcare în
  afara patului (cu linia ei) sau un fișier feliat pentru altă imprimantă dau un avertisment, iar butonul devine **Trimite
  oricum**; altfel e **Trimite**. **Alt fișier…** alege altul; **Renunță** (sau `Escape`) închide fereastra și oprește o
  trimitere începută. Numele pierde spațiile, iar un fișier care e deja în imprimantă nu se înlocuiește: cel nou primește
  „-2” la nume. După trimitere, fereastra îl caută în lista imprimantei (și, dacă lista are mărimile, cu aceeași mărime);
  când îl găsește, **Pornește imprimarea…** deschide
  confirmarea de mai sus (cu bifa **Patul e gol**), iar **Închide** îl lasă în imprimantă. Dacă nu ajunge, fereastra spune
  de ce (imprimanta nu răspunde pe portul 80, fișierul nu apare în lista ei sau are altă mărime), cu **Încearcă din nou**.
- **Din desen…** (sub listă; fără imprimantă legată, sub textul de început) feliază aici, fără Creality Print, piesele plate
  din desen: o placă, un distanțier, un șablon, un cub de calibrare, adică un contur închis ridicat la o grosime. Golurile vin
  din desen (o formă cuprinsă în alta e gaură, una cuprinsă într-o gaură e insulă), formele suprapuse se unesc, textul se
  imprimă și el, iar căile deschise sunt lăsate deoparte, cu un mesaj. În fereastra **Piesă plată pentru imprimantă**:
  - **Ce se imprimă:** **Piesele foii**, **Piesele selectate** sau **O singură piesă**, aleasă din listă. Piesele își păstrează
    așezarea de pe foaie și se centrează pe pat; ce nu încape (220 × 220 mm la K1C, cu 5 mm margine pe fiecare latură) e spus.
  - **După CNC: buzunarele, găuririle și profilele parțiale ca trepte** (bifa de sub „Ce se imprimă”): fiecare piesă se
    imprimă cum o lasă freza, din operațiile ei, nu din formele desenate. Marginea și golurile vin din profilele prin tot (pe
    exterior sau pe interior, cel puțin cât grosimea foii); un buzunar, o găurire sau un profil parțial (cât lățimea frezei, pe
    partea tăieturii) coboară zona lor la înălțimea minus adâncime, iar adâncimea rămâne în mm, măsurată de sus, oricare ar fi
    înălțimea aleasă; ce trece prin tot (sau mai adânc decât înălțimea) e gol. Pe fiecare treaptă vin straturile pline de sus,
    ca pe fața piesei. Urechile, rampele și intrările nu contează; V-carve-ul și gravura cu freza în V nu se imprimă (o gravură
    în V n-are trepte drepte), iar fereastra spune câte sunt. O piesă fără profil exterior prin tot n-are margine: fereastra
    spune asta.
  - **Înălțimea:** **Una pentru toate** (câmpul **Înălțimea pentru toate**, implicit grosimea foii) sau **A fiecărei piese,
    ținută în proiect**: lista pieselor alese, fiecare cu înălțimea ei, scrisă în piesă (în proiect, cu anularea obișnuită),
    deci data viitoare vine singură; o piesă fără ea ia înălțimea pentru toate (cu proiectul deschis doar pentru citit, lista
    nu se poate schimba).
  - **Materialul** (PLA, PLA High Speed, PLA Matte, PLA Silk, PLA-CF, PETG, ABS, ASA,
    PC, PA-CF, TPU, cu valorile profilelor Creality K1 din OrcaSlicer), **Calitatea** (straturi de 0,08, 0,12, 0,16, 0,20 sau
    0,24 mm), temperaturile **Duza** și **Patul**, **Pereții**, **Umplerea** (procentul umplerii rare) și **Brim**
    (Automat: pentru piesele înguste sau înalte; Da; Nu).
  - **Avansat** arată restul setărilor, pe grupuri. Straturile: Înălțimea stratului, Înălțimea primului strat, Straturile pline
    de sus, Grosimea de sus, cel puțin, Straturile pline de jos, Grosimea verticală a pereților (Toată (și sub pereții
    treptelor), implicit: la o piesă cu trepte, plinul se pune și sub pereții de deasupra unei trepte, ca ei să nu stea pe
    umplerea rară; Moderată; Doar ce e critic; Fără: plinul doar sub fețele de sus, cu regiunile pline înguste lățite sau,
    la Fără și Doar ce e critic, scoase cele foarte înguste). Temperaturile primului strat: Duza, pe primul strat; Patul, pe
    primul strat. Lățimile liniilor: Lățimea peretelui exterior, Lățimea pereților interiori, Lățimea umplerii pline, Lățimea
    umplerii rare, Lățimea suprafeței de sus, Lățimea pe primul strat. Vitezele: Viteza peretelui exterior, Viteza pereților
    interiori, Viteza umplerii pline, Viteza umplerii rare, Viteza suprafeței de sus, Viteza primului strat, Viteza umplerii pe
    primul strat, Viteza deplasărilor. Accelerațiile: Accelerația pereților, Accelerația suprafeței de sus, Accelerația
    umplerii, Accelerația primului strat, Accelerația deplasărilor. Retragerea: Lungimea retragerii, Viteza retragerii,
    Ridicarea pe Z. Răcirea: Ventilatorul piesei, minim; Ventilatorul piesei, maxim; Ventilatorul oprit pe primele straturi;
    Ventilatorul auxiliar; Timpul minim al unui strat (un strat mai scurt se imprimă mai încet, ca să se răcească); Viteza
    minimă la răcire. Debitul materialului: Debitul, Debitul volumic maxim (vitezele se taie ca materialul să încapă prin duză).
    Marginile: Compensarea piciorului de elefant (primul strat, strâns puțin), Suprapunerea umplerii rare pe pereți,
    Suprapunerea umplerii pline pe pereți, Lățimea brim-ului, Golul brim-ului. Modelele umplerii: Modelul umplerii rare
    (Grilă, implicit; Dreptunghiular, întors cu 90° de la un strat la altul; Dreptunghiular aliniat; Linii, una din două
    ușor înclinată; Triunghiuri; Tri-hexagon; Cubic, Hașură în cruce și Giroid, care se schimbă cu înălțimea, ca o umplere
    în spațiu; Fagure; Concentric; Curba Hilbert; Coardele lui Arhimede; Spirala octogramă; la 0,12 mm, profilul pornește cu
    Hașură în cruce), Direcția umplerii rare, Modelul plinului dinăuntru, Modelul suprafeței de sus și Modelul suprafeței de
    jos (Monoton, pe linii, implicit sus; Monoton, implicit jos și dinăuntru: liniile, mereu în aceeași ordine, pentru o
    față netedă; Dreptunghiular; Dreptunghiular aliniat; Concentric; Curba Hilbert; Coardele lui Arhimede; Spirala
    octogramă), Direcția plinului. Ștergerea: Șterge la retragere (pornită în profilul K1C: înaintea unei deplasări, duza
    merge puțin pe linia abia făcută, ca să nu lase o picătură), Distanța ștergerii, Retragerea dinaintea ștergerii (restul
    retragerii se face pe drum), Viteza ștergerii după rol (cu viteza ultimei linii), Viteza ștergerii, din a deplasării.
    Cusătura: Locul cusăturii (Aliniată, implicit: în colțul cel mai ascuns, la fel pe fiecare strat; Aliniată, în spate; În
    spate; Cea mai apropiată, de duză; Aleatoare), Cusăturile dinăuntru decalate (fiecare perete dinăuntru pornește puțin
    mai departe, ca cusăturile să nu stea una peste alta), Golul cusăturii. Călcarea: Ce se calcă (Fără călcare, implicit;
    Toate suprafețele de sus; Doar suprafața cea mai de sus; Toate straturile pline): o trecere în plus, cu debit mic, peste
    față, ca s-o netezească; Modelul călcării (Dreptunghiular, Concentric), Debitul călcării, Pasul călcării, Viteza
    călcării, Marginea călcării (0: jumătate de duză), Unghiul călcării (față de liniile feței). Fusta: Buclele fustei (0:
    fără fustă, implicit), Distanța fustei (față de piese sau de brim), Straturile fustei, Viteza fustei, Felul fustei (Una
    pentru toate piesele; Câte una pe piesă), Filamentul minim al fustei (buclele se adaugă până ajung la el), Scutul (fusta
    pe toată înălțimea), contra curentului de aer, la ABS sau ASA, Începutul fustei (unghiul, față de centrul pieselor), O
    singură buclă după primul strat. Fusta se trage prima, pe primul strat: amorsează duza și arată dacă patul e bine
    nivelat. **Valorile profilului** le pune înapoi pe cele ale materialului și calității alese. Setările alese se țin în
    browser, pentru data viitoare.
  - În dreapta, stratul ales, văzut de sus, cu liniile colorate după rol (peretele exterior, pereții interiori, plin, suprafața
    de sus, umplere rară, brim, călcarea, fusta) peste conturul piesei, subțire și roșu: unde se vede doar roșul, piesa e mai îngustă decât o
    linie și acolo nu iese nimic (fereastra spune și aria). Glisorul **Stratul** alege stratul; dedesubt stau rolul lui (la o piesă cu trepte, un strat poate avea mai multe:
    **cu o treaptă:** suprafața de sus a treptei, plinul de sub o față, umplerea rară), apoi
    straturile, timpul estimat (fără încălzire) și filamentul, în metri și grame. Bifa **deplasările** arată, punctat, și
    drumurile duzei dintre linii.
  - **Pauză înaintea acestui strat** (sub glisor) pune o pauză la stratul arătat: imprimanta se oprește după stratul de
    dedesubt, de exemplu ca să schimbi filamentul pentru o a doua culoare de la o înălțime în sus (un text sau un desen
    adâncit), sau ca să pui ceva într-un locaș deschis; apoi apeși **Reia** în fereastra Imprimanta sau pe ecranul ei. Un
    nou clic pe buton o scoate. Pauzele apar ca semne roșii pe glisor și în lista **Pauzele**, fiecare cu stratul și
    înălțimea ei (un clic pe ea arată stratul), cu o **Nota pauzei** (de exemplu „filament negru”) și cu **Scoate pauza**.
    O pauză ține înălțimea până la care s-a imprimat: la altă grosime a straturilor rămâne în același loc al piesei, iar
    peste piese nu intră în fișier. Pauzele se țin în browser pentru aceleași piese (revin când redeschizi fereastra pe
    ele), iar rezumatul le numără. În fișier, pauza e comanda `PAUSE` a imprimantei, înaintea primei piese a stratului;
    timpul estimat nu cuprinde cât stă imprimanta în ea. Înaintea primului strat nu se pune pauză.
  - **Duza** și **Patul** din „Simplu” schimbă și temperaturile primului strat (cu aceeași diferență față de ele cât are
    profilul materialului: PC pornește cu 10 °C mai jos). Brim-ul e unul pentru toate piesele: ocolește piesele vecine. Tot ce
    se extrudează, brim-ul inclus, trebuie să încapă în pat cu marginea de 5 mm, iar ultimul strat sub 250 mm; altfel
    fișierul nu se face, iar fereastra spune cât iese. Dacă desenul se schimbă în Proiectare cât fereastra e deschisă,
    piesele se citesc din nou.
  - **Trimite la imprimantă** (doar cu imprimanta legată) trece fișierul prin aceeași verificare și trimitere ca **Trimite un
    fișier…**, cu aceeași bifă **Patul e gol** la pornire. **Salvează .gcode** îl descarcă, de pus pe stick sau de trimis mai
    târziu; **Renunță** (sau `Escape`) închide fereastra. Fișierul folosește doar comenzile pe care OrcaSlicer le scrie pentru
    K1C: începutul (`START_PRINT`) și sfârșitul (`END_PRINT`) rămân ale imprimantei, cu nivelarea, linia de curățare și răcirea
    lor; fiecare piesă e un obiect pe care imprimanta îl poate sări, dacă se dezlipește.
- **O legătură căzută nu oprește imprimarea:** imprimanta merge mai departe din memoria ei. Fereastra spune „Legătura s-a
  pierdut” și încearcă singură s-o refacă; cât lipsește, butoanele sunt oprite. Oprirea de urgență rămâne ecranul imprimantei.
  O imprimantă care tace mai mult de 20 s e luată drept pierdută (legătura poate muri fără să se închidă), iar una care nu mai
  răspunde la adresa ei e căutată singură în rețea, după nume (de exemplu „K1C-8578”), și ținută la noua adresă.
- **Jurnalul cadrelor** arată ce a trimis fereastra și ce a primit; **Copiază jurnalul** îl pune în clipboard, pentru o
  raportare.
- Singură, fereastra doar citește starea și răspunde imprimantei că e acolo; orice comandă pleacă dintr-un clic al tău. Portul
  9999 n-are parolă: oricine din rețeaua atelierului poate comanda imprimanta, deci ține-o într-o rețea doar a ta.

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

Pe instanța de test, adresa aplicației cu `?test` la capăt deschide testul uneltelor de desen într-un panou plutitor, pe care
îl muți trăgând de titlu și îl strângi cu ▾. Fiecare pas spune ce faci și
ce trebuie să vezi; marchezi **Bine**, **Nu** sau **Sărit** și poți scrie o notă. **Poză** salvează imaginea planșei
(desenul, riglele, ghidajele, mânerele, traseul) în browser: nimic nu pleacă pe server. **Descarcă raportul** scrie un singur
fișier HTML, cu rezultatele, notele și pozele, de trimis mai departe. Lista de sus duce la orice pas. Rezultatele rămân și
după reîncărcare; **Începe din nou** le șterge, după o confirmare.

Tot pe instanța de test, o sugestie pentru owner, cu poza planșei, se trimite din meniul **Cont** (vezi
[Contul](#cont)).

## Contul
%% capitol: cont
%% acopera: editare.cont, editare.sugestie

Butonul **Cont** din colțul din dreapta-sus, lângă butonul temei (titlul lui: „Contul: logarea, planul, raportările și
manualul”), deschide meniul contului. Logat, butonul arată inițialele și primul nume. Sus în meniu stau numele și planul de
azi, cu zilele de probă rămase; fără cont, „Nu ești logat”. Rândurile:

- **Contul meu…** (logat) sau **Intră sau creează cont…** (fără cont) deschide panoul contului, de mai jos;
- **Raportările mele** (cu contul deschis) arată raportările tale, cele mai noi întâi, cu starea lor (trimisă, în lucru,
  rezolvată) și răspunsurile echipei, mai jos;
- **Manualul** (`F1`) deschide manualul acesta;
- **Raportează o problemă…** (cu contul deschis) trimite echipei o problemă, o idee sau o întrebare, mai jos;
- **Trimite o sugestie…**, doar pe instanța de test (titlul lui: „Trimite o sugestie: pentru owner, cu poza planșei”), face
  poza planșei, o ține în browser și deschide pagina `/admin` pe fila **Sugestii**, într-o filă nouă. Intri cu contul tău de
  personal și scrii sugestia, iar poza pleacă odată cu ea; înainte s-o trimiți, o poți scoate. Dacă browserul nu deschide
  fila, un mesaj îți dă legătura spre ea;
- **Ieși din cont** (logat) închide contul în browserul acesta.

Meniul merge și din tastatură: săgețile trec între rânduri, Enter alege, Escape îl închide. Panoul contului și raportările cer
internet: fără rețea nu se deschid, dar aplicația merge mai departe cu ultimul drept primit.

- **Raportează o problemă…:** alegi ce trimiți (o problemă, o idee sau o întrebare), scrii ce s-a întâmplat și, dacă vrei,
  bifezi **Atașează poza planșei**. Cu **Atașează proiectul (ca echipa să-l deschidă)** pleacă și proiectul deschis, exact cum
  îl ai, comprimat; sub bifă se vede cât are. Se pot atașa cel mult 10 MB: un proiect mai mare nu pleacă, iar fără bifă nu
  pleacă deloc. Sub text, **Ce mai pleacă odată cu raportarea** arată tot ce pleacă în plus: versiunea aplicației, limba,
  planul, browserul, amprentele erorilor din sesiunea asta (doar amprentele, fără conținutul erorilor, ca echipa să le
  găsească în jurnalul ei) și, cu bifa, proiectul. **Trimite** o trimite; un cont trimite cel mult 10 raportări pe zi.
- **Raportările mele:** un răspuns nou al echipei pune un punct pe butonul **Cont** și numărul raportărilor cu răspuns nou pe
  rândul **Raportările mele**. Când deschizi lista, răspunsurile noi sunt marcate, iar semnul se stinge. O raportare cu
  proiectul atașat îi arată mărimea. Raportările rezolvate se șterg singure, cu poza și proiectul lor, după perioada de
  păstrare (implicit un an de la rezolvare; vezi nota de confidențialitate din panoul contului).

- **Logarea:** **Intră cu Google**, sau adresa de e-mail și parola, cu **Intră**. **Creează cont** face un cont nou cu parolă
  și trimite un e-mail de confirmare; după ce deschizi linkul din el, apeși **Am confirmat**. **Am uitat parola** trimite un
  e-mail de resetare.
- **Proba:** un cont nou are 14 zile de probă, fără card, cu toate funcțiile. Pornește la prima logare cu adresa confirmată
  (cu Google, adresa e deja confirmată). Panoul arată câte zile au rămas.
- **După probă:** exportul G-code și pornirea programului din panoul mașinii se opresc; desenul, operațiile, traseul și
  exportul vectorial rămân. Echipa poate da un plan gratuit. Comenzile manuale ale mașinii (jog, zero, oprirea) rămân mereu.
- **Fără internet:** aplicația ține dreptul primit 7 zile (cât setează echipa) de la ultima confirmare, apoi cere o conexiune
  ca să-l reconfirme. La fiecare pornire cu rețea, dreptul se reconfirmă singur.
- **Numele** afișat se schimbă din panou, iar **Ieși** închide contul în browserul acesta.

Fără cont, aplicația merge ca până acum. Dedesubt, **Ce date ținem** spune ce păstrăm despre cont (și despre raportări) și
de ce.

## Extensiile
%% capitol: extensii
%% acopera: extensii.buton, extensii.trimite-selectia

O extensie adaugă aplicației o fereastră a ei, de exemplu Easy 3Draw. Nu face parte din aplicație: o instalezi
tu, iar interfața aplicației rămâne aceeași.

- Butonul **Extensii** (piesa de puzzle de lângă numele instanței) deschide meniul: extensiile instalate, **Biblioteca**,
  apoi **Instalează din fișier (.zip)…**, **Instalează din adresă…** și **Gestionează extensiile…**.
- **Biblioteca** arată extensiile noastre, publicate odată cu aplicația, de exemplu Easy 3Draw: numele, versiunea, ce face, ce
  cere pe scurt și mărimea. **Instalează** deschide fereastra instalării, cu ce cere extensia pe larg; acolo, **Instalează**
  descarcă pachetul, îl verifică după amprenta lui din bibliotecă și îl pune în browserul acesta, iar **Deschide** îi deschide
  fereastra (**Închide** o lasă pentru mai târziu). Când biblioteca are o versiune mai nouă a unei extensii instalate, rândul ei
  din meniu spune „actualizare: …”, iar **Actualizează la …** o aduce dintr-un clic, cu datele ei; dacă versiunea nouă cere
  ceva în plus, fereastra spune întâi ce, iar **Actualizează** o instalează. Biblioteca se citește la fiecare deschidere a
  meniului și are nevoie de internet; fără el, **Reîncearcă** o cere din nou, iar extensiile instalate merg ca până acum. Un
  link de forma `…/#biblioteca=trenulet` deschide fereastra lui Easy 3Draw din bibliotecă; nimic nu se descarcă fără clicul
  tău. Un pachet instalat din fișier sau de la o adresă vine din afara bibliotecii, iar fereastra îl spune așa.
- **Instalează din fișier** primește un pachet `.zip`. **Instalează din adresă** cere **Adresa pachetului** (HTTPS), apoi
  **Descarcă**; gazda trebuie să permită descărcarea din alte pagini, altfel descarci tu fișierul și îl instalezi din
  fișier. Un link de forma `…/#instaleaza=<adresa>` deschide aceeași fereastră, cu adresa completată; nimic nu se descarcă
  fără clicul tău.
- Înainte de instalare, fereastra arată numele, versiunea, de unde vine pachetul, fișierele și mărimea lor, ce cere extensia
  (de exemplu, să-și țină datele în browserul acesta) și, dacă e cazul, versiunea pe care o înlocuiește. **Instalează** o
  pune în browserul acesta (merge și offline); **Renunță** nu schimbă nimic. Un pachet stricat sau greșit se refuză, cu
  motivul.
- O extensie care a cerut asta își ține datele (de exemplu, circuitele ei) în browserul acesta, cel mult 16 MB. O versiune
  nouă a ei le păstrează.
- O extensie care a cerut asta poate salva fișiere (de exemplu, G-code-ul sau piesele de printat) ca descărcări obișnuite
  ale browserului: doar date și desene (`.zip`, `.json`, `.gcode`, `.stl` și altele asemenea), cel mult 64 MB unul, nu
  programe sau pagini.
- O extensie care a cerut asta vede dacă ești conectat la cvs2, cu ce nume și ce plan, doar pentru citire: nu vede adresa,
  parola sau proiectele. Easy 3Draw îl arată la **Circuite**; intrarea sau ieșirea din cont (și din altă filă)
  ajunge în extensie pe loc.
- Extensia ia tema aplicației: luminoasă sau întunecată (cea aleasă cu **Tema**), culorile și fonturile; o temă schimbată
  ajunge în extensie pe loc. Easy 3Draw își păstrează doar culorile lui: masa, lemnul, cărămizile, verdele de
  semnal.
- Extensia primește și limba aplicației. Easy 3Draw vorbește română sau engleză, după **Limba** din bara de sus;
  la o limbă schimbată, repornește singur, după ce își salvează lucrul (circuitul, setările, atelierul). Comentariile din
  G-code rămân în română, ca în exportul aplicației.
- Un clic pe o extensie din meniu îi deschide fereastra: lângă **Proiectare** și **Mașina** apare o filă cu numele ei, iar
  dedesubt, pe tot ecranul, stă extensia. Treci oricând la altă fereastră: extensia rămâne deschisă, cu ce ai lucrat în ea, iar
  o comandă a desenului aleasă din **Caută o comandă** te duce întâi la Proiectare. **×**, lângă numele ei, închide
  extensia: întâi îi lasă câteva secunde să salveze ce avea de salvat (Easy 3Draw își salvează atunci circuitul,
  setările și atelierul). Dacă tot rămân modificări nesalvate, te întreabă: **Rămân** (sau Escape) o lasă deschisă, **Închide
  oricum** o închide, iar modificările se pierd. La fel, cât extensia are modificări nesalvate, reîncărcarea sau închiderea
  filei te întreabă, prin fereastra browserului. După o reîncărcare a paginii, aplicația pornește fără extensie. F1 deschide
  capitolul acesta.
- O extensie care a cerut asta poate folosi mașina, prin fereastra **Mașina**: vede starea ei (legătura, lucrarea cu
  procentul, programul încărcat), încarcă un program G-code, verificat la fel ca unul adus cu **Fișier…** (fereastra Mașina
  scrie lângă el de la cine e), pune pauză și oprește lucrarea. Ca să pornească sau să reia lucrarea, te întreabă întâi,
  într-o fereastră a aplicației: ce extensie cere, ce program (numele, liniile, începutul amprentei) și ce se reia. Butonul
  care mișcă mașina se poate apăsa abia după o secundă, iar **Nu** sau Escape nu trimit nimic. Conectarea, jog-ul, zero-ul,
  palparea, deblocarea, comenzile manuale și continuarea după o oprire din program rămân în fereastra Mașina. Pe instanța
  live, deocamdată, extensiile nu folosesc mașina.
- O astfel de extensie poate trimite și o lucrare întreagă (de exemplu, „Trimite la cvs2” din Easy 3Draw): vine
  în dialogul **Lucrare primită**, ca de la o aplicație deschisă alături, cu extensia drept origine.
- O extensie care a cerut asta primește forme din desen și îți propune forme pentru desen. Alege forme pe planșă: în bara
  selecției apare **Trimite la extensie**, cu numele extensiei deschise (de exemplu, **Trimite la Easy 3Draw**;
  și în **Caută o comandă**). Contururile alese pleacă spre extensie, în mm, iar fereastra ei se deschide; Easy 3Draw le
  ridică în 3D, în atelier, la **Din cvs2**. Extensia nu vede desenul altfel. Invers, o extensie îți poate
  propune un fișier SVG sau DXF (Easy 3Draw: o placă din exportul CNC, cu **În desenul cvs2**): se deschide
  fereastra **Importă**, cu „Propus de” și numele extensiei, iar nimic nu intră în desen până nu apeși **Importă**.
- Easy 3Draw folosește mașina și din exportul lui CNC, la „Pe mașină, prin cvs2”: încarcă un fișier, îl pornește
  (cu întrebarea de mai sus), pune pauză, îl reia și îl oprește. Starea mașinii stă deasupra butoanelor.
- Extensia rulează izolată: nu vede proiectele sau portul mașinii și nu iese pe internet; din cont vede doar ce i-ai dat voie
  (mai sus); vorbește cu aplicația doar prin ce îi dă aceasta.
- **Gestionează extensiile** le arată pe cele instalate, cu sursa, data și cât ocupă datele lor; **Scoate** șterge una,
  împreună cu datele ei, **Închide** închide fereastra.

## Scurtăturile
%% capitol: scurtaturi

| Tasta | Ce face |
|---|---|
| `Ctrl+Z` | Anulează |
| `Ctrl+Y`, `Ctrl+Shift+Z`, `Ctrl+Shift+Y` | Reface |
| `Ctrl+D` | Duplică |
| `Ctrl+G` | Grupează |
| `Ctrl+Shift+G` | Degrupează |
| `Delete` | Șterge selecția |
| `Ctrl+K` | Caută o comandă |
| `Home` | Arată toată foaia |
| `T` | Arată traseul |
| `V` `S` `N` `K` `B` `R` `O` `E` `L` `P` `X` | uneltele: Selecție, Transformare, Noduri, Cuțit, Pen, Dreptunghi, Cerc, Elipsă, Linie, Poligon, Text (tasta e scrisă și în colțul butonului) |
| `Shift+H`, `Shift+V` | Oglindește orizontal, Oglindește vertical |
| săgețile | mută selecția 1 mm (Shift: 10 mm, Alt: 0,1 mm); în vederea 3D, rotesc placa |
| `Alt+←`, `Alt+→` (în textul uneltei Text) | spațiul între literele alese, cu 0,1 mm mai strâns / mai larg |
| `Shift` + clic, `Shift` + tragere | adaugă la selecție (la clic, o formă aleasă deja iese din ea) |
| `Shift+L` | pornește sau oprește lipirea, și cât tragi |
| `Alt`, cât tragi o formă, un ghidaj sau un nod (și cu Pen) | inversează lipirea |
| `Shift` / `Ctrl` / `Alt`, cât tragi un mâner (unealta Transformare) | proporțional pe orice mâner / liber pe orice mâner / față de ancoră (implicit centrul); se pot ține împreună, iar cu Shift și Ctrl câștigă Shift |
| dublu clic pe ținta ancorei (unealta Transformare) | ancora înapoi în punctul ales în selector |
| `Shift` / `Ctrl` / `Alt`, cât desenezi | pătrat, cerc, pași de 15° / fără proporție (cercul devine elipsă) / din centru (linia, din mijloc) |
| `Delete`, `Backspace` (cu unealta Noduri și un nod ales) | scoate nodul ales |
| `Enter` (cu unealta Pen) | termină calea începută |
| `Ctrl+Z`, `Ctrl+Y` (cu unealta Pen și o cale începută) | anulează / reface ultimul pas al căii |
| `Ctrl+Shift+Z` (imediat după o cale terminată cu Pen) | redeschide calea, cu pașii ei |
| `Backspace`, `Delete` (cu unealta Pen și o cale începută) | scoate ultimul nod pus |
| `Alt`, cât tragi un mâner (unealta Noduri) | desparte mânerele nodului; pe cele despărțite, le unește din nou |
| `Esc` | anulează forma sau calea începută, lasă nodul ales, întoarce la Selecție, închide vederea 3D și ferestrele |
| `F1` | manualul, la capitolul de acum |

Pe Mac, `Ctrl` e `⌘`.
