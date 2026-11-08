# ADR 0180 — Tăierea și conversia vectorilor

**Starea:** acceptat pe 06.11.2026 (propus în aceeași zi), pentru feliile 10.3↑–10.3↑e (aduse din etapa 10), fără mașină, în
worktree-ul `taiere` (ramura `wip/10.3-taiere-conversie`). Cererea owner-ului, din 06.11: „vreau sa deschidem worktrees pentru
alte etape sau felii”, apoi „Vector trim/convert, stage 10”. Răspunsurile lui, din formularul schiței: 1a, 2a, 3a, 4a, 5a, 6a,
cu două note (la §3 și la „Se redeschide dacă”). **Felia 10.3↑** (tăierea cu o linie dreaptă, §2, §3, §6, §7) gata pe
06.11; **felia 10.3↑b** (cuțitul-formă și „Taie la intersecții”, §3, §5, §6) și **felia 10.3↑c** (decuparea, §4) pe 07.11.
**Schimbat de** ADR 0181 (08.11, răspunsul 4a): §13 și „Ce am respins”, tăierea cu un clic pe bucată (felul Retează al
cuțitului). **Completează:** ADR 0062 (un nod nou, exact, pe linie, arc și cubică), ADR 0033
(biarcele), ADR 0067 (booleanul), ADR 0103 (degruparea), ADR 0124 §15 („Taie la intersecții” vine cu rândul ăsta).
**Documentul:** neschimbat (v19): rezultatul e din tipurile de azi (căile din linii, arce și cubice; cercul; dreptunghiul).

**Problema.** Rândul de prag „Tăierea și conversia vectorilor” (A, v1 din 06.10) cere cinci lucruri, niciunul în aplicație
azi: tăierea cu o linie, decuparea la un contur, arcele în locul curbelor, netezirea și conversia în cercuri / dreptunghiuri.
Concret: un panou prea lung pentru masă nu se poate tăia în două; un model de linii nu se poate decupa la un cerc; un cerc
dintr-un DXF, desenat cu 64 de laturi, rămâne poligon (găurirea, ADR 0087, cere un cerc); curbele unui import ajung la mașină
ca biarce la 0,001 mm, cu multe linii scurte, fără ca omul să poată alege o toleranță mai largă.

## Ce am aflat (cercetarea din 06.11)

- **În cvs2 există deja** [citit]: nodul nou exact pe linie, arc și cubică (`adaugaNod`, ADR 0062); locurile comune a două
  forme (cavalier pe biarce, `intersectiiIntre`) și rafinarea lor cu Newton pe segmentele adevărate, cu tăierea exactă a
  buclei (ADR 0124 §13: `despartiLa`); biarcele cu abaterea Hausdorff în ambele sensuri, sub 0,99 × toleranța (ADR 0033); formele
  `cerc` și `dreptunghi` (cu raza colțului) și recunoașterea lor (ADR 0053); booleanul, care refăcea însă geometria prin cavalier
  (cubicele ca biarce), deci nu lasă vârfurile la bit.
- **ArtCAM 2018** (referință funcțională, ajutorul lui) [citit]: tăierea are ca „cuțit” ultimul vector ales sau o linie
  verticală / orizontală, la o coordonată sau pe un ghidaj, cu închiderea bucăților la alegere; decuparea are o graniță (unul sau
  mai mulți vectori, grupați), înăuntru / în afară, iar vectorii care trec granița se taie, se șterg sau rămân; arcele înlocuiesc
  doar curbele Bézier (o curbă dreaptă devine linie), cu numerele înainte și după; netezirea face din linii curbe, cu toleranța
  pe noduri și „păstrează liniile mai lungi de”; conversia dă cercuri sau dreptunghiuri din mărimea formei sau cu mărimea dată.
- **Ediția întâi** [citit, codul ei]: n-avea tăierea, decuparea sau conversia (doar „trim / extend” între două
  segmente drepte). Lecțiile: potrivirea arcelor pe o polilinie verifica doar nodurile, iar un dreptunghi a devenit cerc, la 58 mm
  de el (reparat apoi cu săgeata coardelor); netezirea (Douglas-Peucker, apoi Catmull-Rom) bomba laturile lungi, pierdea arcele
  (11,9 % din arie) și suda contururile unei litere; o bucată deschisă cu rol de arie s-a tăiat pe linie, fără compensare (un
  pătrat de 40 mm a ieșit cu 6 mm mai mic); probele erau mai largi decât toleranța declarată.
- **Pe hârtie** [calculat]: poligonul regulat cu 64 de laturi înscris în cercul R50 se abate de cerc cu săgeata coardei,
  50·(1 − cos(π/64)) = 0,0602 mm, la mijlocul laturilor; cercul cel mai apropiat de el are R49,9699, cu abaterea 0,0301.

## Decizia

1. **Două butoane în extensia barei, după Boolean:** **Taie** (panoul tăierii: „Taie cu…”, „Decupează la…”, „Taie la
   intersecții”) și **Convertește** (Arce, Netezește, În cerc, În dreptunghi). Fiecare e și o acțiune în registru (paleta,
   Ctrl+K), cu capitolul ei în manual; „Taie la intersecții” intră și în meniul de clic dreapta. Calculul e al workerului CAM
   (o cerere nouă, ca `reparare`), pe documentul de la clic; acțiunea aplică rezultatul într-un singur pas de anulare, doar dacă
   documentul e încă același (ca `document.repara`). Panoul spune ce s-a făcut (bucățile, numerele înainte și după, abaterea cea
   mai mare) și, pe fiecare formă refuzată, motivul.
2. **Tăierea exactă, comună.** Locurile de tăiere: cu o linie dreaptă, direct pe fiecare segment (linia; arcul, prin cercul lui;
   cubica, prin rădăcinile polinomului ei de gradul 3); cu o formă, din cavalier, rafinate apoi cu Newton pe segmentele adevărate
   (ca bucla din ADR 0124 §13). Segmentul se taie exact (`adaugaNod`): arcul în două arce ale aceluiași cerc, cubica prin de
   Casteljau. Restul vârfurilor rămân la bit, iar câmpurile elementului (numele, cele necunoscute) se păstrează. Doar o trecere
   taie: o atingere fără trecere nu taie (panoul o spune), iar un cuțit care merge pe o latură a formei se refuză.
3. **Taie cu…** linia verticală X = …, orizontală Y = … (mm ai foii), un ghidaj al foii sau ultima formă aleasă (Shift + clic,
   ca la copierea pe curbă, ADR 0066). **Închide bucățile**, bifată implicit și ținută în browser (ca Lipirea): fiecare parte a
   unei forme închise se închide pe tăietură. O piesă cu găuri se citește ca regiune (par-impar): un inel tăiat în două dă două
   „U”-uri închise, nu patru jumătăți suprapuse. Fără bifă, bucățile rămân deschise (nota owner-ului la întrebarea 2: „vreau
   optiunea ca taierea sa nu inchida forma/vectorul. vreau si o unealta care daca tai de exemplu un cerc pe jumate, operatia
   creeaza doua arce de cerc egale cu jumate din cerc, independente una de alta”): un cerc tăiat prin centru dă două forme
   separate, fiecare un singur arc de 180°, exact (cercul se taie pe cercul lui, nu pe cele două arce ale desenului).
   Cuțitul rămâne neschimbat.
4. **Decupează la** ultima formă aleasă, închisă (o piesă cu mai multe contururi e regiunea lor, par-impar): **Păstrează**
   înăuntru / în afară; **formele care trec granița** se taie (implicit), se șterg sau rămân întregi. Cu „Închide bucățile”, o
   formă închisă tăiată rămâne închisă pe graniță (un dreptunghi decupat la un cerc devine partea lor comună). Granița rămâne.
5. **Taie la intersecții** (ADR 0124 §15): formele alese se taie în toate locurile lor comune (treceri, atingeri, capetele care
   cad pe altă formă). Buclele unei singure forme rămân ale verificării („Desparte”, ADR 0124 §13).
6. **Unde ajung bucățile** (răspunsul 2a): după operație. Linia dreaptă împarte fiecare formă aleasă în două forme, ce e de o
   parte și ce e de cealaltă (contururile netăiate ale unei piese merg cu partea lor); o formă închisă drept cuțit, ce e în ea și ce
   e în afara ei; o cale deschisă drept cuțit desparte doar contururile pe care le trece. Decuparea lasă fiecare formă cu ce rămâne
   din ea (fără nimic rămas, forma pleacă). „Taie la intersecții” face din fiecare bucată o formă, ca s-o poți alege și șterge.
   Formele noi stau exact unde erau, ca la degrupare (ADR 0103 §2).
7. **Operațiile bucăților** (răspunsul 3a): bucățile își păstrează rolul. O bucată deschisă dintr-o formă închisă e tăiată pe
   aceeași parte a frezei: exteriorul devine partea din afară, stânga sau dreapta după sensul desenului (ADR 0037 §3), interiorul
   cea dinăuntru. Buzunarul, V-carve-ul și găurirea cer o formă închisă: de pe o bucată deschisă se scot, iar panoul o spune.
8. **Arce în locul curbelor.** Fiecare cubică devine linii și arce sub toleranța aleasă, prin biarcele din ADR 0033; liniile și
   arcele rămân. Și șirurile de linii scurte care stau pe un cerc (o polilinie dintr-un DXF) devin arce (răspunsul 6a);
   colțurile și liniile lungi rămân.
9. **Netezește.** Șirurile de linii devin curbe netede (cubice potrivite direct pe ele, nu simplificate întâi), sub toleranță;
   colțurile ascuțite rămân colțuri, liniile peste „Păstrează liniile mai lungi de” (implicit 5 mm) rămân linii, arcele rămân arce.
   Fiecare contur separat: o literă cu găuri nu se sudează.
10. **În cerc / În dreptunghi** (răspunsul 4a): „doar dacă e”: forma devine cercul (sau dreptunghiul, cu colțurile rotunjite dacă
    le are) doar dacă stă toată la cel mult toleranța de el, altfel refuzul spune abaterea; „cu mărimea dată”: orice formă închisă
    devine cercul de diametrul dat sau dreptunghiul dat, cu centrul în centrul cutiei ei (semnele de găurire dintr-un DXF devin
    cercuri Ø8, găuribile). Forma își păstrează elementul și operațiile; dacă una nu se mai potrivește (găurirea pe un dreptunghi),
    conversia acelei forme se refuză, cu motivul. Căile deschise se sar (numărate).
11. **Toleranța** stă pe fiecare rând al panoului Convertește, între 0,001 și 1 mm (ca la verificare): implicit 0,01 mm la Arce și
    Netezește (fidelitatea desenului), 0,1 mm la În cerc și În dreptunghi (o gaură de lemn). Se măsoară pe toată forma, în ambele
    sensuri (nodurile și laturile), nu doar pe noduri (lecția din ediția întâi). Cercul din poligon trece prin noduri (răspunsul
    5a): un Ø100 desenat cu 64 de laturi rămâne Ø100, iar abaterea față de laturi (0,06 mm) trebuie să încapă în toleranță.
12. **Refuzurile, cu motiv:** o piesă pusă de mai multe ori (ca la reparații, decizia 8a din ADR 0124), un cuțit care nu atinge
    nicio formă, un cuțit care nu trece de tot printr-o formă de închis, plafoanele documentului (judecate de schema lui, pe
    documentul de după).
13. **Ce nu face:** nu unește căi (discuție separată, ADR 0124 §14), nu taie interactiv cu un clic pe bucată (după „Taie la
    intersecții”, bucata se alege și se șterge), nu schimbă schema documentului.
14. **Mărimea.** Plafonul total e comun (503,1 / 550 kB pe `main`, cu trei linii pe el): linia ține creșterea sub ~10 kB.
    Calculul stă în workerul CAM (cavalier e acolo), panourile vin la cerere; pornirea nu se schimbă.

## Feliile

Ordinea din răspunsul 1a. La acceptare, prima felie propusă s-a despărțit în două: tăierea cu o linie dreaptă are locurile de
tăiere direct, pe fiecare segment, pe când cuțitul-formă și „Taie la intersecții” cer locurile din cavalier, rafinate cu Newton.

- **10.3↑:** tăierea exactă cu o linie dreaptă (§2): „Taie cu” linia verticală, orizontală sau un ghidaj (§3), cu închiderea la
  alegere, bucățile după operație (§6) și rolul păstrat (§7); panoul Taie.
- **10.3↑b:** „Taie cu” ultima formă aleasă (§3) și „Taie la intersecții” (§5).
- **10.3↑c:** „Decupează la…” (§4).
- **10.3↑d:** În cerc, În dreptunghi (§10) și Arce (§8), cu panoul Convertește.
- **10.3↑e:** Netezește (§9).

**Felia 10.3↑b, la cod** (în cadrul deciziilor de mai sus, 07.11):
- **Unde taie cuțitul-formă:** un contur închis se taie doar unde exact una dintre bucățile cuțitului de lângă loc intră în
  regiunea piesei: o trecere, sau capătul cuțitului care intră printr-o latură (un cuțit desenat cu capetele chiar pe laturi
  taie ca linia). O atingere, din afară sau dinăuntru, nu taie; nici capătul cuțitului care doar ajunge la latură din afară.
  O cale deschisă se taie unde cuțitul o trece de tot.
- **Părțile (§6):** cuțitul închis lasă două părți, înăuntrul lui (regiunea lui par-impar) și în afara lui; cel deschis face
  din fiecare față și din fiecare bucată o formă, iar un contur netrecut merge cu cea mai mică față în care stă sau rămâne cu
  celelalte, împreună (piesa rămasă).
- **Închiderea:** corzile sunt bucățile cuțitului din regiune, cu nodurile lui; fețele merg pe bucăți (cu regiunea în
  stânga) și pe corzi. O față cu aria negativă (corzile închid o buclă în jurul unei găuri) e marginea dinăuntru a regiunii
  și merge cu ea. Un cuțit care intră din afară și se oprește în gaură despică inelul (un „C”); un cerc deschis într-un singur
  loc are două semicercuri (un arc de 360° n-are bulge).
- **Refuzurile noi (§12):** `nu-trece` (cu închidere, cuțitul se oprește în regiunea unei forme), `cutit` (cu închidere, se
  încrucișează în ea), `pe-linie` și pentru cuțit (merge pe o latură a unei forme pe care o taie; una doar atinsă pe latură nu
  se taie și nu se refuză), `prea-multe` (perechile de cercetat, la plafonul verificării).
- **„Taie la intersecții” (§5):** fiecare contur ales se taie în locurile lui comune cu celelalte contururi alese (și cu cele
  ale aceleiași piese), la capetele unei suprapuneri (nu și în îmbinările ei); un contur închis cu un singur loc rămâne
  întreg; capătul unei căi deschise nu e un loc de tăiere. Pornește din panoul Taie și din meniul de clic dreapta; ca „Taie”
  (10.3↑), nu și din paletă: calculul cere workerul.

**Felia 10.3↑c, la cod** (07.11):
- **Decuparea refolosește împărțirea cuțitului închis:** fiecare formă aleasă e împărțită ca de un cuțit închis (granița),
  apoi păstrează ce e de partea aleasă. O formă toată de partea păstrată rămâne neschimbată; una fără nimic acolo pleacă; una
  cu câte ceva de ambele părți trece granița (și o piesă cu un contur înăuntru și unul în afară, fără nicio tăietură) și, după
  alegere, se taie (rămâne partea păstrată), se șterge sau rămâne întreagă.
- **Ștergerile:** o formă care pleacă se șterge cu piesa ei (dacă n-o mai folosește altă instanță); ștergerile și degruparea
  sunt un singur pas de anulare (un lot: întâi ștergerile, apoi degruparea). O instanță a unei piese puse de mai multe ori se
  poate șterge (cealaltă rămâne), dar nu tăia.
- **Granița** trebuie să fie închisă (refuzul `granita`) și rămâne. „Închide bucățile” e aceeași bifă ca la „Taie cu”,
  arătată și în blocul decupării, ca în schiță.
- **Panoul:** cele trei blocuri ale schiței, unul sub altul; nu trece de 70 % din fereastră (se derulează, ca panoul
  verificării).

**Felia 10.3↑d, la cod** (07.11):
- **Arce (§8):** fiecare cubică devine biarcele din ADR 0033 (`cubicaInArce`), cu toleranța împărțită la scara elementului
  (abaterea se spune în lume); un element întins neuniform se sare (un arc întins nu mai e arc). Cu „și liniile scurte”, cel
  mai lung șir de linii din fiecare vârf, fără colțuri (**o întoarcere de peste 30° e un colț**), devine arcul prin primul,
  mijlocul și ultimul lui vârf, cât stă la cel mult toleranța de șir în ambele sensuri (vârfurile, laturile, arcul dintre două
  vârfuri) și **nu trece de 180°**: poligonul închis cu 64 de laturi devine două semicercuri. Numerele unei căi (curbele, arcele,
  liniile) se adună doar dacă ea se schimbă de tot.
- **În cerc, doar dacă e (§10, 5a):** cercul celor mai mici pătrate (Kåsa), **pe vârfuri la o formă doar din linii** (deci prin
  noduri), altfel pe eșantioane. Abaterea e radială, exactă pe linii (și piciorul perpendicularei din centru) și pe arce, **cât
  forma ocolește centrul o singură dată, fără să se întoarcă**; altfel, distanța Hausdorff (o cale dus-întors pe un sfert de
  cerc nu e cerc).
- **În dreptunghi, doar dacă e:** dreptunghiul de arie minimă pe laturile învelitorii convexe, cu unghiul în (−45°, 45°]; raza
  colțului din cât lipsesc colțurile (distanța de la colț la formă = r·(√2 − 1)), cel mult jumătate din latura mică. **Un cerc
  (fără laturi drepte pe nicio axă) nu e dreptunghi, o fantă da.** Abaterea, Hausdorff în ambele sensuri (o cale dus-întors pe
  trei laturi nu e dreptunghi).
- **Cu mărimea dată:** cercul sau dreptunghiul, drept pe foaie, în centrul cutiei formei; doar formele închise.
- **Elementul își păstrează id-ul, numele, câmpurile și operațiile;** se schimbă forma și matricea lui, cât să stea pe foaie
  unde era (matricea nouă = matricea lui · inversa matricei lui în lume · matricea nouă în lume). Găurirea refuză dreptunghiul
  (numărată, „cu găurire”).
- **Ce se sare, numărat:** căile deschise (la cerc și dreptunghi), piesele puse de mai multe ori (§12), elementele întinse
  neuniform (la arce). Panoul spune ce s-a făcut (formele, curbele înlocuite, arcele și liniile noi, abaterea cea mai mare) și,
  la refuz, cea mai mică abatere a formelor refuzate.
- **Acțiunea `document.converteste`:** un lot de `inlocuieste-piesa`, un singur pas de anulare, doar dacă documentul e cel de la
  clic; selecția rămâne. Pornește din panou (calculul cere workerul), ca „Taie”. Butonul Convertește stă lângă Taie, în
  extensia barei; panoul are câte un bloc pentru Arce, În cerc și În dreptunghi, fiecare cu toleranța și butonul lui.
  Rezultatul, sub blocuri, e adus în vedere la fiecare schimbare (panoul se derulează; la fel în panoul Taie).

**Felia 10.3↑e, la cod** (07.11):
- **Netezește (§9):** șirurile de linii scurte (cel mult „Păstrează”, implicit 5 mm, pe foaie) devin cubice potrivite direct
  pe punctele lor (Schneider: cele mai mici pătrate cu tangentele capetelor date, reparametrizarea Newton, împărțirea în
  punctul cel mai depărtat, cu tangenta comună, deci netedă), nu simplificate întâi. O cubică se primește doar dacă abaterea
  Hausdorff față de bucata ei de șir (nodurile și laturile, în ambele sensuri) încape în toleranță; o latură singură care nu
  încape rămâne linie.
- **Colțurile ascuțite:** un vârf în care drumul se întoarce cu **peste 60°** (la Arce, 30°), măsurat pe **4 × toleranța** de
  fiecare parte. Treptele mai mici decât atât nu sunt colțuri: o trasare în trepte se netezește la o toleranță cât treapta (la
  0,01 rămâne). De ce 60°: la capătul unui platou, treptele se întorc cu 37–45° pe scara toleranței, iar cu 30° fiecare platou
  lăsa o frântură; pătratul și triunghiul își păstrează colțurile. La mai puțin de 4 × toleranța de capătul unui șir,
  întoarcerea nu se judecă (coarda ar fi trunchiată și ar măsura treapta).
- **Ce rămâne:** liniile lungi, arcele și curbele (legătura cu ele e netedă, cu tangenta lor, dacă nu e colț); un șir drept
  (punctele pe coarda lui) rămâne linii; pe o cale închisă, vârful 0 rămâne vârf, cu tangenta netedă (de el ține intrarea
  frezei); fiecare contur separat (o literă cu găuri nu se sudează).
- **În lume:** colțurile, lungimile și abaterea se măsoară pe foaie; mânerele se duc înapoi cu inversa matricei (o cubică
  rămâne cubică sub orice matrice afină), deci și un element întins neuniform se netezește; capetele bucăților rămân vârfurile
  vechi, la bit.
- Măsurarea Hausdorff, comună conversiei și netezirii, stă în `src/model/abatereContur.ts`. Panoul: blocul Netezește, al
  doilea, ca în schiță (toleranța 0,01, „Păstrează liniile mai lungi de” 5).

Fiecare felie: proba scrisă întâi, oracolul independent, documentul de după trecut prin ușă, manualul în ambele limbi pentru
fiecare buton, otrăvurile țintite, publicarea pe canalul `taiere`.

## Proba

- **Pe hârtie:** pătratul 100 × 100 tăiat la X = 50, cu închidere: două dreptunghiuri 50 × 100, cu vârfurile exacte; cercul R50
  tăiat la X = 20: tăieturile în (20, ±45,8258), segmentele de 1 981,68 și 5 872,30 mm²; inelul R50 / R30 tăiat la X = 0: două
  „U”-uri închise de câte 2 513,27 mm²; o cubică tăiată la x = X (cele două jumătăți refac curba); restul vârfurilor la bit; zece
  linii paralele (y = ±5, ±15 … ±45) decupate în cercul Ø100: capetele în x = ±√(2500 − y²), la ±0,001 (±21,7945 la y = ±45);
  elipsa 100 × 60 la 0,01: doar linii și arce, abaterea ≤ 0,01; poligonul cu 64 de laturi R50, în cerc; 20 de contururi oarecare
  în cercuri Ø8: centrele în centrele cutiilor, la ±0,001 (criteriile pragului, ACOPERIRE).
- **Oracolul independent** (`test/oracles/taiere.ts`, alt cod decât al aplicației): formele de dinainte și de după, eșantionate
  des (fiecare punct al originalului pe o bucată, la 1e-9; capetele bucăților pe cuțit), ariile regiunilor (suma lor = aria de
  dinainte), abaterea Hausdorff măsurată din nou, cu rafinarea maximelor; documentul de după trecut prin ușă.
- **E2e:** fiecare buton, pe un DXF importat, cu anularea.
- **Otrăvurile țintite** (`test/otravuri/10.3.py`, …), rulate într-o clonă a ramurii în afara Drive-ului.

## Întrebările pentru owner și răspunsurile lui

Formularul lor, cu desenele înainte / după, e pagina „Tăierea și conversia vectorilor” (privată, a owner-ului). **Răspunsurile,
din 06.11:** 1a, 2a, 3a, 4a, 5a, 6a, adică recomandările, cu nota de la 2 (§3) și nota generală („Se redeschide dacă”).

1. **Ordinea feliilor:** a) întâi tăierea (Taie cu…, închiderea, Taie la intersecții), apoi decuparea, apoi conversia (cerc,
   dreptunghi, arce), la urmă netezirea (recomandat: tăierea e nucleul refolosit de decupare); b) întâi conversia (cercurile din
   DXF devin cercuri adevărate, deci găuribile, și arcele), apoi tăierea și decuparea, la urmă netezirea.
2. **Unde ajung bucățile:** a) după operație, ca la §6 (recomandat); b) fiecare bucată devine o formă, la toate operațiile; c)
   bucățile rămân împreună, în forma tăiată (le desparte Degrupează).
3. **Operațiile bucăților:** a) bucățile își păstrează rolul, ca la §7 (recomandat); b) bucățile rămân fără operații, iar rolul
   îl alegi din nou, în panoul Tăierea.
4. **În cerc / În dreptunghi:** a) ambele moduri, „doar dacă e” și „cu mărimea dată” (recomandat); b) doar „doar dacă e”; c) ca
   ArtCAM: din mărimea formei (cutia ei) sau cu mărimea dată, oricare ar fi forma.
5. **Cercul din poligon** (un cerc Ø100 dintr-un DXF, desenat cu 64 de laturi): a) cercul trece prin noduri și rămâne Ø100, cel
   din care a fost desenat; abaterea față de laturi (0,06 mm) se măsoară și trebuie să încapă în toleranță (recomandat); b)
   cercul cel mai apropiat de toată forma, Ø99,94, cu abaterea 0,03.
6. **Arcele din linii scurte:** a) Arce face arce și din șirurile de linii scurte care stau pe un cerc (o polilinie din DXF dă
   G2 / G3), cu colțurile și liniile lungi păstrate (recomandat); b) doar din curbe, ca ArtCAM: liniile trec întâi prin Netezește.

## Ce am respins

- **Booleanul (cavalier) pentru tăiere și decupare:** reface geometria (cubicele ca biarce), deci vârfurile neatinse nu rămân la
  bit.
- **Netezirea prin simplificare, apoi spline** (ediția întâi): laturile lungi bombate, arcele pierdute, de 7 ori mai proastă
  la trasare.
- **Toleranța măsurată doar pe noduri:** un dreptunghi a devenit cerc, la 58 mm de el (ediția întâi).
- **Tăierea interactivă, cu clic pe bucată:** „Taie la intersecții” și ștergerea dau același lucru, fără o unealtă nouă.

## Se redeschide dacă

- owner-ul răspunde altfel la întrebări;
- încercările pe desene reale cer altceva (nota owner-ului: „aici va trebui sa testam si sa ajustam pe viitor, pentru cand avem
  situatiile concrete”);
- se discută unirea căilor (ADR 0124 §14);
- vin planșele (etapa 11): o piesă pusă de mai multe ori primește opțiuni, nu doar refuzul (principiul owner-ului din 02.11).
