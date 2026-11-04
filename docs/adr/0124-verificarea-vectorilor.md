# ADR 0124: Verificarea vectorilor: detectarea, panoul și reparațiile (feliile 10.1↑ și 10.2↑)

**Starea:** acceptat pe 02.11.2026, la felia 10.1↑ (adusă din etapa 10, fără mașină), în worktree-ul `wip/10.1-vectori`;
completat pe 04.11.2026, la felia 10.2↑ (reparațiile, §10–§16), după răspunsurile owner-ului din formularul deciziilor.
**Completează:** ADR 0026 §2 (contururile care se ating, refuzate la export), ADR 0037 (contururile deschise), ADR 0109
(calculul greu, în workerul CAM). **Rândul de prag:** „Verificarea și repararea vectorilor: deschiși, duplicați,
intersecții, bucle, noduri prea apropiate” (`ACOPERIRE-ARTCAM-DESKPROTO.md`, A).

**Problema.** Un desen importat (DXF, SVG, PDF, EPS, WMF) sau desenat aduce des aceeași formă de două ori (freza o taie de
două ori, iar exportul refuză inelele care se ating, ADR 0026 §2), contururi care se taie, bucle mici lăsate de alt
program, noduri dublate și căi rămase deschise. Până acum, aplicația le afla doar la export, din refuzuri (și doar pe
formele cu operații), fără să spună unde. ArtCAM are un „doctor” al vectorilor; DeskProto doar arată startul curbelor
deschise. Ele sunt referință funcțională: nimic din codul, interfața sau textele lor nu e copiat.

## Decizia

1. **Ce, unde, cu ce toleranță.** Verificarea citește foaia întâi, în lume (instanța ∘ grupurile ∘ elementul, ADR 0024),
   toată sau doar formele instanțelor alese (selecția e pe instanțe), cercetate între ele, și nu schimbă documentul.
   Toleranța `t` e un singur număr, implicit 0,01 mm (rezoluția modelului), între 0,001 mm (toleranța proiectului) și 1 mm.
   Calculul pur e `src/model/verificare.ts`; limitele, în `src/model/verificareLimite.ts`, ca panoul să le citească fără
   geometrie. Sunt cinci feluri de probleme; una cu o singură formă e „în aceeași formă”, una cu mai multe e „între forme”.

2. **Duplicatul.** Două forme sunt același contur dacă, după ce se scot nodurile de la capătul unui segment de cel mult `t`
   (pe curbă) aflate la cel mult `t` de ultimul nod păstrat, au aceleași noduri (un contur închis, cu orice start; ambele,
   în oricare sens), fiecare la cel mult `t`, iar segmentele se potrivesc: linia și arcul își au punctele de la ¼, ½ și ¾
   la cel mult `t`, cubicele își au mânerele la cel mult `t`; o cubică nu se potrivește cu o linie sau cu un arc.
   Candidații au cutiile exacte la cel mult `t`, pe fiecare latură. Duplicatele se grupează (tranzitiv): rămâne prima formă
   în ordinea foii, celelalte sunt copii. **Copiile nu-și mai spun alte probleme și nu intră în celelalte căutări**: sunt
   aceeași formă ca prima. Merge și între piese (aceeași piesă, două instanțe în același loc).

3. **Intersecțiile dintre forme.** Pentru fiecare pereche de forme cu cutiile atinse, locurile comune vin de la cavalier,
   prin fațadă (`intersectiiIntre` în `src/geom/offset.ts`), la 1e-6 mm (`EPS_ATINGERE`, ca refuzul exportului). Înainte,
   cubicele trec în biarce sub 0,001 mm (ADR 0033), iar nodurile la sub 1e-6 mm unul de altul se unesc (un segment nul n-are
   direcție). O suprapunere (o bucată comună) e un singur loc, cu capetele ei; bucățile care se continuă (o latură comună
   tăiată de un nod) se unesc. Un punct la `t` de un punct deja păstrat nu se mai spune. Cavalier nu spune un punct la
   capătul unei suprapuneri și spune o singură dată o tăietură printr-un nod comun (măsurat pe 02.11, pe cinci cazuri: o
   latură comună, un triunghi lipit pe dinăuntru și pe dinafară, o linie pe latură și dincolo, o linie prin colț).

4. **Autointersecțiile și buclele.** Locurile în care o formă se taie sau se atinge singură urmează regula lui
   `seAutointersecteaza` (contactele false dintre doi vecini tangenți, iertate), toate, nu doar primul (`autointersectii`
   în fațadă; `seAtingeSingur` și ea folosesc aceeași funcție, `atingeriReale`). Pentru un punct între segmentele i < j,
   bucla „dinăuntru” e drumul de la punct, pe segmentele dintre ele, înapoi în punct; pe un contur închis, cealaltă buclă
   are aria întregului minus a ei (ariile cu semn se adună). Se spune bucla mai mică, cu aria ei și cu procentul ei din
   suma ariilor celor două; pe o cale deschisă, aria buclei, fără procent. Panoul o numește „buclă mică” sub un prag
   (implicit 1 %, schimbat în panou): pe criteriul pragului, un vector de 100 mm² cu o buclă de 1,5 mm² e la 1,48 %, peste
   1 % și sub 2 %.

5. **Nodurile prea apropiate.** În aceeași formă: un segment de cel mult `t` pe curbă (la cubică, lungimea poligonului de
   control, care trece de curbă); segmentele mici consecutive fac un singur loc, iar o formă cu toate segmentele sub `t`
   (praful) e un singur loc. Între forme: două noduri ale unor forme diferite la cel mult `t` (toate nodurile, ordonate pe
   x, cu fereastra `t`), câte unul pe loc pentru fiecare pereche de forme, cel mai apropiat întâi; `capete`, dacă ambele
   sunt capete de căi deschise (o înlănțuire ruptă). **O pereche de noduri de lângă o atingere a acelorași forme e chiar
   atingerea**: rămâne intersecția (două pătrate cu o latură comună: o suprapunere, nu și două perechi de noduri). Invers,
   la capetele a două căi deschise care se ating, rămân nodurile: punctul înlănțuirii nu e o intersecție.

6. **Formele deschise.** Fiecare cale deschisă, cu distanța dintre capete, fără o clasare: o cale deschisă poate fi voită
   (ADR 0037). Un loc de autointersecție de lângă capetele unei căi cu golul sub `t`, sau de lângă un șir de noduri prea
   apropiate, e al acelora.

7. **Panoul și pânza.** Butonul **Verifică vectorii** stă în extensia barei, după boolean și degrupare, în secțiunea lui.
   Panoul și locurile de pe pânză sunt o bucată adusă la cerere (`src/app/PanouVerificare.tsx`, cu mesajele editării),
   iar calculul e al workerului CAM: cererea `verificare` a protocolului (ADR 0109), cerută prin bucata calculului
   exportului, ca vederea 3D. Panoul are toleranța, pragul buclei, „Doar formele alese” (instanțele alese la bifă: un clic
   pe un rând nu schimbă ce se verifică), starea, legenda și lista pe feluri (duplicate, intersecții, autointersecții și
   bucle, noduri prea apropiate, forme deschise; cel mult 200 de rânduri pe fel). Cât e deschis, o schimbare a documentului
   sau a toleranței reface verificarea după 300 ms, iar cea veche se anulează. Pe pânză, fiecare problemă are un cerc de
   mărime fixă pe ecran (o problemă de 0,005 mm se vede la orice apropiere): **roșu** în aceeași formă, **verde** între
   forme; o suprapunere e o linie groasă, golul unei căi deschise o linie punctată, rândul ales are cercul mai mare. Un
   clic pe un rând alege instanțele formelor lui. Un eșec care nu e o anulare (workerul căzut, o excepție) merge în jurnalul
   de erori (`reportError`). Cercurile nu prind clicuri: pânza rămâne a uneltelor.

8. **Plafoanele.** Cel mult 5 000 de probleme și 5 000 000 de perechi cercetate (de noduri și de forme); peste ele,
   verificarea se oprește, iar panoul spune că lista e tăiată. O formă cu o cubică pe care biarcele n-o prind sub toleranța
   proiectului rămâne fără căutarea intersecțiilor, numărată și spusă.

9. **Reparațiile** sunt ale feliei 10.2↑ (§10–§16), după răspunsurile owner-ului (mai jos).

## Reparațiile (felia 10.2↑)

Deciziile owner-ului, din 04.11 (formularul): 1c, 2a, 3a, 4a, 5a, 6b, 7b, 8a, cu nota lui: „este datoria userului să își
facă corect desenul; verificarea trebuie să-l ajute să găsească erori mai mult decât să i le repare”. Deci reparațiile
sunt puține și cerute, niciuna automată, fiecare un singur pas de anulare.

10. **Unde și cum.** Ce se poate repara din fiecare rând (`reparabile`, în `src/model/reparare.ts`) vine odată cu
    verificarea, din workerul CAM (`verificaPentruPanou`): reguli ieftine, fără geometrie nouă. Reparația însăși e cererea
    `reparare` a protocolului, calculată tot în worker (bucla cere cavalier) pe documentul din clipa clicului; întoarce
    piesele schimbate (cu aceleași id-uri) și instanțele de șters. Acțiunea `document.repara` le aplică într-un `lot`
    (piesele înlocuite, apoi instanțele șterse, ca la Șterge), doar dacă documentul e încă cel al cererii (altfel: „Desenul
    s-a schimbat cât se calcula reparația”) și doar dacă documentul de după trece de plafoane și de schemele lui. Panoul
    spune ce s-a reparat („Reparat: n. Anulezi cu Ctrl+Z.”) sau de ce nu, iar lista se reface singură. O reparație care
    nu reușește își spune motivul; butonul apare după regulile ieftine, nu după o încercare (o buclă ar cere cavalier pe
    fiecare rând).

11. **Copiile (decizia 1c).** Un singur buton, **Scoate toate copiile (n)**, sub lista duplicatelor, fără butoane pe rânduri.
    Rămâne prima formă din fiecare grup. O copie pleacă doar dacă fiecare operație a ei (fără id, noduri și rang) e și a
    primei: altfel s-ar pierde o tăietură voită, iar rândul spune câte au rămas. O instanță cu toate formele copii se
    șterge întreagă: piesa ei nu se schimbă, deci se poate și când piesa e pusă de mai multe ori. Altfel, copia pleacă din
    piesă (și din operațiile ei; o operație rămasă fără noduri pleacă, la fel un grup rămas gol), doar dacă piesa e pusă o
    singură dată (§15).

12. **Închiderea (deciziile 2a, 3a).** **Închide**, pe rândul unei căi deschise cu golul (în lume) cel mult pragul de
    închidere, **Închide sub** (implicit 1 mm, între 0,001 și 10 mm, în panou). Sub toleranță, ultimul vârf se lipește de
    primul: pleacă, iar segmentul care venea în el vine în primul (la cubică, mânerul se mută la fel). Peste ea, segmentul
    ultimului vârf (o linie, ADR 0037 §2) devine linia de închidere. Operația rămâne; rolul se schimbă din panoul de
    proprietăți. Refuzată: golul peste prag, o cale fără arie după închidere (dus-întors). Fără „pentru toate” (2a).

13. **Buclele (deciziile 4a, 5a).** Pe bucla unei căi închise: sub pragul buclei mici (implicit 1 %, în panou), **Scoate**:
    bucla pleacă, iar conturul trece drept prin încrucișare. Peste el, **Desparte**: bucla devine o formă a ei, în aceeași
    piesă, după element, cu matricea lui și în operațiile lui (se taie la fel; o rădăcină-element devine un grup).
    Elementul rămâne partea cea mai mare (la arii egale, cea cu începutul căii). **Repară toate buclele (n)** le face pe
    toate, una câte una (o buclă despărțită poate purta alta). Tăietura e exactă:
    - cavalier dă încrucișarea între bucăți de biarce, iar `pentruCavalier` ține segmentul din care vine fiecare bucată;
    - pe cele două segmente în lume, parametrul drumului prin X: la linie, proiecția; la arc și la cubică, minimele
      distanței, rafinate cu Newton; la cubica care se taie singură, punctul ei dublu, în formă închisă (s + t și s·t din
      coeficienții ei); apoi Newton pe P_i(s) = P_j(t);
    - tăieturile se fac în coordonatele elementului, cu `adaugaNod` (arcul în două arce ale aceluiași cerc, cubica prin de
      Casteljau), unde parametrii sunt aceiași: o matrice afină păstrează parametrii liniilor și ai cubicelor, iar arcele
      trec doar prin similitudini. Restul vârfurilor rămân la bit;
    - o parte dintr-un singur segment (bucla unei singure cubice) se taie la jumătate, ca să aibă două vârfuri.
    Reușită doar dacă nicio parte nu se mai taie singură în X și fiecare are arie; altfel, refuzată, iar bucla rămâne
    pentru unealta Noduri. Buclele căilor deschise (de exemplu o literă dintr-un font cu o singură linie) și atingerile
    doar se arată.

14. **Nodurile (decizia 6b).** Doar în aceeași formă: **Unește** pe rând și **Unește toate nodurile (n)**. Fiecare șir de
    segmente de cel mult `t` devine un nod: rămâne primul vârf al șirului, care ia segmentul de după șir (la cubică,
    mânerul se mută cât s-a mutat începutul ei); la capătul unei căi deschise rămâne capătul, iar segmentul care venea în
    șir vine în el. Indicii unui contur închis trec de capătul listei (șirul de pe segmentul de închidere). Nodurile a două
    forme doar se arată: unirea căilor e o discuție separată, mai amplă (nota owner-ului). Praful nu se repară.

15. **Intersecțiile (decizia 7b) și piesele puse de mai multe ori (decizia 8a).** Intersecțiile dintre forme doar se
    arată, cu nota „Pot fi voite: freza urmează fiecare formă cu rolul ei, iar exportul spune ce nu se poate tăia” (nota
    owner-ului: e normal ca unele căi să se suprapună). „Taie la intersecții” vine cu rândul „Tăierea și conversia”
    (etapa 10). O reparație care ar schimba o piesă pusă de mai multe ori, pe orice foaie, se refuză („Piesa e folosită și
    de alte instanțe: reparația ar schimba-o și pe a lor”, ca la degrupare); rândul spune de câte ori e pusă.

16. **Pragurile, mai târziu în setări.** Owner-ul vrea pragul buclei mici setat separat, global sau pe proiect, când va
    exista zona de setări. Până atunci, toleranța și cele două praguri stau în panou, cât e deschis.

## Probele

- **Pe hârtie** (`test/unit/verificare.test.ts`, 17): toleranța (refuzată în afara [0,001; 1]); un desen curat (pătrat,
  cerc, dreptunghi rotunjit, triunghi, o lacrimă din cubice netede): nimic; calea cu capetele la 0,05 mm (și o linie de
  100 mm); două cercuri identice: un duplicat, fără intersecții; același cerc pornit din stânga și orar, pătratul ca o cale
  orară cu alt start, cercul mutat cu 0,005 mm: duplicate; aceleași noduri cu o latură arc: nu; cercurile la 0,02 mm: două
  intersecții în x = 50,01, y = 50 ± √(100 − 0,0001); centrele la 19,99999: punctele la 0,02 mm (două, plus perechea de
  noduri de la 0,00001 mm), iar cu toleranța 0,05 un singur loc; aceeași piesă în două instanțe; trei „8”-uri identice: un
  duplicat și o singură autointersecție; fundița: (10, 10), 100 mm², 50 %; „8”-ul prin același nod (cavalier dă locul de
  trei ori): o dată; bucla de 1,5 mm² dintr-un vector de 100 mm²: 1,5 și 1,5 / 101,5; cubica (−1, 0), (2, 3), (−2, 3),
  (1, 0): în (0, 9/7), sub 0,002 mm; nodurile la 0,001 mm (pragul inclus) și la 0,002 cu toleranța 0,001 (nimic); capetele
  a două linii la 0,005 mm (capete), colțurile la 0,005 mm (3-4-5), la 0,015 și la 0,0113 mm (nimic), două căi care se ating
  în capete (nodurile, nu și o intersecție); pătratele suprapuse pe un sfert (10, 5) și (5, 10), cu o latură comună (o
  suprapunere, de la (10, 0) la (10, 10)), cu latura comună tăiată de un nod (tot una), cu un triunghi lipit de latură (una),
  colț în colț (o atingere); calea întoarsă în start, țeapa de 0,005 mm și praful: câte o problemă; doar formele alese.
- **Corpusul plantat al pragului** (criteriul din cercetare): 10 duplicate, 8 perechi de noduri la 0,005 mm (4 în aceeași
  formă, 4 între capete), 6 intersecții între vectori, 5 bucle, fiecare în celula ei: găsite toate, fără alarme false, cu
  culoarea lor; la duplicate rămâne primul. **Același corpus, citit dintr-un DXF** (LWPOLYLINE, LINE, CIRCLE, câte un
  strat pe entitate, prin cititorul aplicației): aceleași probleme, în aceleași locuri.
- **E2e** (`test/e2e/verificare.spec.ts`, Edge): un DXF importat cu un duplicat, două intersecții, o fundiță și o cale
  deschisă: lista pe feluri, textele, cercul fiecărei probleme în locul ei (sub 1,5 px), culorile (2 roșii, 3 verzi),
  clicul (rândul apăsat, cercul mai mare), bifa, toleranța greșită, Esc; două dreptunghiuri în același loc: duplicatul,
  clicul alege ambele instanțe, iar după Ctrl+Z lista se reface singură: nimic; la 1024 px, panoul stă în fereastră și
  după ce vine conținutul lui (prima versiune se lărgea după așezare și ieșea cu 40 px pe dreapta).
- **Mutațiile:** 18 / 18. Pe modul, 15 / 15, cu controlul verde înainte și după și fișierul identic la final (duplicatul,
  sensul invers, segmentele duplicatului, pragul inclus, semnul buclei de afară, perechea de lângă atingere, înlănțuirea,
  copiile, fereastra nodurilor, unirea suprapunerilor, punctele apropiate, autointersecția de lângă noduri, praful, alesele
  după instanță, golul căii); primele rulări au scăpat patru, pentru care probele au primit cazurile lor, iar o regulă care
  nu prindea nimic (punctul de pe o suprapunere: cavalier nu-l dă, §3) a ieșit din cod. Pe panou, 3 / 3, prin build și e2e
  (culorile inversate; clicul cu id-urile în lume în loc de instanțe; lățimea de 22rem, pusă după așezare).
- **Fațada offsetului:** probele offsetului și booleanului (48) rămân verzi: `seAtingeSingur` folosește aceeași funcție ca
  `autointersectii`.
- **Mărimile:** pornirea 98,4 → 98,5 kB (cu ușa 101,9 → 102,0 / 110: numele bucății noi în harta importurilor și
  `instantaDin`); totalul 448,9 → 454,7 / 500 kB (verificarea, doar în workerul CAM; panoul, 2,3 kB, la cerere).

**Reparațiile (10.2↑):**
- **Pe hârtie** (`test/unit/reparare.test.ts`, 21): ce se poate repara din fiecare rând (bucla, nodurile, închiderea;
  intersecțiile și linia de două noduri, nimic); o piesă pusă de două ori (rândurile spun de câte ori, reparația se refuză);
  copiile: două cercuri identice (a doua instanță pleacă), o copie cu altă adâncime (rămâne), una fără operații (pleacă),
  prima fără operații (copia cu operație rămâne), copia din aceeași piesă (pleacă din grup și din operație), aceeași piesă
  pusă de două ori cu copia în ea (refuzată), o a doua instanță în același loc (se șterge); închiderea: golul de 0,05 mm
  (linia de închidere), cel de 0,005 mm (lipit, pătratul exact), pragul (0,5 și 2 mm față de 1 și 5), calea dus-întors
  (fără arie), mânerul cubicei mutat cu (−0,004; −0,003); nodurile: în mijloc (pătratul exact), la capăt, la început,
  mânerul cubicei mutat cu −0,006, șirul de pe segmentul de închidere, „toate” pe două forme, praful; buclele: fundița
  (triunghiurile (0, 0)(10, 10)(0, 20) și (10, 10)(20, 20)(20, 0), câte 100 mm², în aceeași operație, apoi doar atingerea
  lor), nodul de 1,5 mm² din 101,5 (scos sub 2 %, despărțit peste 1 %), „8”-ul prin același nod (în vârfurile lui), cubica
  închisă care se taie în (0, 9/7) (parametrii (1 ∓ √(3/7)) / 2, ariile față de un poligon de 4 000 de puncte), o instanță
  rotită cu 90° și un element scalat de 2 ori și oglindit, „toate” (fundița și nodul; bucla căii deschise rămâne); acțiunea:
  copiile și închiderea, fiecare un pas, două anulări aduc documentul de la început; documentul schimbat între timp,
  doar-citirea, nimic de aplicat și o piesă care ar strica schemele: refuzate. După fiecare reparație, documentul trece de
  ușă, iar verificarea nu mai găsește problema.
- **E2e** (`test/e2e/verificare.spec.ts`): pe DXF-ul cu probleme, Scoate toate copiile (un singur buton), Închide,
  Desparte, fiecare cu lista refăcută; intersecțiile fără butoane, cu nota lor; „Închide sub” sub gol stinge butonul; trei
  anulări aduc lista de la început.

## Ce am respins

- **Duplicatul după distanța dintre curbe, eșantionată:** ar prinde aceeași curbă scrisă cu alte noduri, dar eșantionarea
  poate scăpa o abatere dintre eșantioane; regula nodurilor e exactă și se probează pe hârtie. Aceeași curbă cu alte
  noduri (un cerc din 2 sau din 4 arce) iese ca suprapunere, deci se vede tot.
- **Calculul pe firul principal:** o foaie poate avea 10⁶ noduri (ADR 0109).
- **Bazinul CAM chemat direct din panou:** poarta build-ului îl vrea doar în bucata calculului exportului; panoul trece pe
  acolo, ca vederea 3D.
- **Reparațiile în aceeași felie:** detectarea are întâi nevoie de ochii owner-ului, iar felia ar fi trecut de ½ zi.
- **„Unește” (booleanul) pe intersecții (7a) și unirea capetelor a două căi (6a):** owner-ul a ales 7b și 6b.
- **Butoane de copiere pe rânduri (1a, 1b):** owner-ul a ales un singur buton (1c).
- **Repararea pe firul principal:** bucla cere cavalier, iar o foaie poate avea 10⁶ noduri; ca verificarea, workerul.
- **Butonul după o încercare a reparației:** o buclă ar cere cavalier pe fiecare rând; regulile ieftine arată butonul, iar
  o reparație care nu reușește își spune motivul.
- **Un oracol cu shapely:** o dependență nouă cere acordul owner-ului; valorile pe hârtie și corpusul plantat, cu locurile
  știute din construcție, ajung aici.

## Limite

- Selecția e pe instanțe: într-un import (o singură piesă), clicul alege tot importul; locul problemei îl arată cercul.
  Degruparea (ADR 0103) desface piesa, iar atunci clicul alege chiar formele.
- Un nod prea aproape de mijlocul unui segment al altei forme (un T aproape atins) nu se spune: nu e nici pereche de
  noduri, nici atingere. La fel, două noduri ale aceleiași forme la sub `t`, dar nu vecine: dacă se ating (1e-6), sunt o
  autointersecție; altfel, nu se spun.
- Duplicatul e tranzitiv: A ≈ B și B ≈ C pun A și C în același grup, deși pot sta la 2·t.
- Pe un contur cu mai multe încrucișări, procentul buclei e al ariilor nete ale celor două drumuri.
- Doar foaia întâi, ca exportul.
- După o schimbare, cercurile vechi rămân până vine verificarea nouă (300 ms și calculul).
- Un „8” despărțit dă două forme care se ating în punctul de încrucișare: verificarea le arată apoi ca intersecție, iar
  exportul refuză două inele care se ating (ADR 0026 §2); le depărtezi sau le unești.
- Bucla scoasă duce conturul drept prin X: un colț nou acolo. O buclă de lângă un șir de noduri prea apropiate nu se spune
  (§6), deci nici nu se repară: întâi nodurile.
- Pragurile nu se țin între sesiuni (§16).

## Întrebările pentru owner (felia 10.2↑) și răspunsurile lui

Formularul lor, cu desenul înainte / după și ce se strică la o alegere greșită, e pagina „Decizii pentru repararea
vectorilor” (privată, a owner-ului; lăsată pe 02.11). Pe scurt, cu varianta recomandată (a) întâi. **Răspunsurile, din
04.11:** 1c, 2a, 3a, 4a, 5a, 6b, 7b, 8a (§10–§16); 2a, 3a, 4a, 5a și 8a au rămas cele recomandate, neschimbate în
formular și trimise așa de owner.

1. **Copiile:** a) „Scoate copiile” pe rând și „Scoate toate copiile”; rămâne prima formă, cu operația ei, un pas de
   anulare; o copie cu altă operație decât prima nu se scoate (rândul spune de ce). b) doar pe rând; c) doar „toate”.
2. **Căile deschise:** a) „Închide” pe căile cu golul de cel mult pragul de închidere: sub toleranță capătul se lipește de
   start, peste se adaugă linia de închidere; operația rămâne. b) doar lipirea sub toleranță; c) pe orice cale deschisă.
3. **Pragul de închidere:** a) 1 mm; b) 0,1 mm; c) 5 mm.
4. **Buclele:** a) sub pragul buclei mici bucla se scoate (drumul trece prin punctul de încrucișare), peste prag devine o
   formă separată (un „8” devine două forme); b) doar scoaterea buclelor mici; c) nimic automat.
5. **Pragul buclei mici:** a) 1 %; b) 2 %; c) 5 %.
6. **Nodurile prea apropiate:** a) „Unește nodurile” pe rând și pentru toate: în aceeași formă segmentul scurt dispare;
   capetele a două căi se unesc într-o cale (închisă, dacă i se întâlnesc capetele); nodurile a două forme închise doar se
   arată; două căi cu operații diferite nu se unesc. b) doar în aceeași formă; c) doar arătate.
7. **Intersecțiile dintre forme:** a) arătate și reparate de mână, cu „Unește” (booleanul, ADR 0067) pentru două forme
   închise care se taie; b) „Taie la intersecții” (rândul „Tăierea și conversia”); c) doar arătate.
8. **O piesă pusă de mai multe ori:** a) reparația se refuză, cu motivul, ca la degrupare (ADR 0103); b) se repară piesa,
   cu toate instanțele ei.

## Se redeschide dacă

- owner-ul răspunde altfel la întrebări;
- vine zona de setări: pragurile (întâi cel al buclei mici) trec acolo, global sau pe proiect (§16);
- vine rândul „Tăierea și conversia”: intersecțiile primesc „Taie la intersecții” (§15);
- se discută unirea căilor (capetele a două căi prea apropiate, §14);
- se cere selecția pe elemente (atunci clicul alege chiar formele problemei);
- un caz real scapă (o ratare sau o alarmă falsă): cazul intră în probe, cu valoarea lui pe hârtie.
