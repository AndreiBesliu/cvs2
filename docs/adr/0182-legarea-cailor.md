# ADR 0182 — Legarea căilor

**Starea:** acceptat pe 21.11.2026 (propus în aceeași zi), pentru feliile 10.3↑o–10.3↑r, fără mașină, în worktree-ul `taiere`
(linia tăierii și conversiei). Răspunsurile owner-ului: 1a, 2a, 3a (recomandările), cu nota „cat mai multe optiuni pe care le
putem pune la dispozitia userilor”: recomandările sunt implicitele, iar celelalte variante, plus felurile legăturii și legarea la
import, devin opțiuni (§7). A patra propunere a liniei din 17.11 (după panourile pe foi, piesele puse de mai multe ori și
numărul panoului, toate făcute), la cererea sesiunii principale din 21.11 („după felia de acum, ia-o pe următoarea din coada
ta”); declanșatorul din ADR 0124, „Se redeschide dacă”: „se discută unirea căilor (capetele a două căi prea apropiate, §14)”.
**Completează:** ADR 0124 §14 (nodurile a două forme doar se arată), ADR 0101 §7 (legarea capetelor la importul DXF), ADR 0180
§6 (unde ajung bucățile tăierii). **Schimbă:** ADR 0124, „Ce am respins”: unirea capetelor a două căi (6a) vine înapoi, ca
discuția separată cerută atunci de owner („unirea căilor e o discuție separată, mai amplă”). **Documentul:** neschimbat: o cale
legată e o `cale`, din tipurile de azi; opțiunile legării se țin în browser, ca opțiunile tăierii. **Felia
10.3↑o** implementată pe 22.11, pe `wip/10.3o-legare`.

**Problema.** Un desen venit în bucăți are căi deschise ale căror capete se întâlnesc: un SVG sau un PDF cu liniile scrise
separat, un contur desenat din două căi cu Pen-ul, bucățile rămase după Retează sau Desparte, căile unei trasări din imagine.
Freza le taie ca linii separate (pe linie): n-au interior și exterior, nici buzunar, iar tăierea, conversia și exportul le
tratează ca deschise. Verificarea le găsește („Capetele a două căi, la X mm”), dar doar le arată (ADR 0124 §14, decizia 6b);
unealta Noduri unește doar noduri ale aceleiași forme; importul DXF leagă capetele pe același strat (ADR 0101 §7), celelalte
uși nu. Azi, o cale nu se poate lega de alta deloc: rămâne doar redesenarea.

## Ce am aflat (cercetarea din 21.11)

- **În cvs2 există deja** [citit]: legarea capetelor la importul DXF (`src/io/dxf.ts`, `leaga`): capetele la cel mult
  `REZOLUTIE` (0,01 mm), doar câte două (trei capete într-un punct, ca un T, rămân nelegate); golul de peste
  `TOLERANTA_IMPORT` se închide cu o linie, numărată, iar sub ea capetele se lipesc; un lanț care se întoarce în el însuși e
  închis; o bucată întoarsă își inversează arcele (`bulge` cu semn schimbat) și cubicele (mânerele schimbate). Verificarea
  găsește perechile de capete a două căi deschise sub toleranță (`verificare.ts`, `capete: true`; toleranța implicită 0,01 mm).
  Reparațiile din panoul ei (`reparare.ts`, în worker): „Unește” nodurile aceleiași forme (§14: rămâne primul vârf al șirului)
  și „Închide” o cale cu capetele la cel mult 1 mm (sub toleranță le lipește, peste adaugă linia; operația rămâne). Booleanul
  „Unește” (ADR 0067) e reuniunea a două forme închise: alt lucru, cu același nume. Unealta Noduri lucrează pe o singură formă
  („nodurile se editează pe o singură formă; alege doar una”).
- **Vectric** (VCarve, Aspire) [citit, ajutorul lor]: „Join Vectors”: cu o toleranță, leagă singur capetele mai apropiate de
  ea și închide căile; pe două căi alese, între cele mai apropiate capete: cu o linie, cu o curbă netedă sau mutând ambele
  capete în mijlocul dintre ele (ajutorul spune că poate deforma desenul); o cale aleasă singură se închide cu o linie.
- **Illustrator** [citit, ajutorul și forumul lor]: Join (Ctrl+J) leagă două capete alese cu o linie dreaptă; pe căi întregi,
  după capetele cele mai apropiate; două capete suprapuse devin unul.
- **CorelDRAW** [citit, ajutorul lor]: „Join Curves”, cu toleranța golului (capetele mai depărtate nu se leagă) și modurile
  prelungire până la intersecție, teșitură, racordare și curbă Bézier; curba legată ia proprietățile ultimului obiect ales.
- **Pe hârtie** [calculat]: (1) segmentele (0, 0)–(50, 0) și (50; 0,004)–(50, 40), la toleranța 0,01: o cale deschisă cu
  vârfurile (0, 0), (50, 0), (50, 40), lungă de 90 mm (capătul celei de-a doua vine pe (50, 0)); (2) un pătrat de 50 × 50 din
  patru linii, una scrisă invers: o cale închisă, arie 2 500 mm², cu sensul primei linii; (3) (0, 0)–(50, 0) și (52, 0)–(100,
  0), golul 2 mm: cu linia, o cale de 100 mm, cu un segment nou de 2 mm; doar cu lipirea, nimic; (4) trei capete în (50, 0):
  nelegate; (5) un arc de 90° cu `bulge` 0,4142 legat întors: același arc, cu `bulge` −0,4142.

## Decizia

1. **Comanda „Leagă căile”** (Ctrl+J; ca la Ctrl+K, pagina oprește tasta browserului), în secțiunea booleanului din bara de
   sus, după Intersectează, și în meniul de clic dreapta, după „Taie la intersecții”. Numele nu e „Unește”: așa se cheamă
   reuniunea. Pe căile deschise alese (cele închise și formele care nu sunt căi nu se ating; o cale aleasă singură se
   închide), într-un singur pas de anulare, cu calculul în worker, ca reparațiile (ADR 0124: o foaie poate avea 10⁶ noduri).
2. **Cum se leagă** (regulile importului DXF, aceleași pentru toate ușile):
   - capetele la cel mult toleranță (0,01 mm, a verificării) se lipesc: capătul căii a doua vine pe al primei (răspunsul 2a;
     opțiunea „la mijloc”, §7); golurile mai mari se leagă cu o linie dreaptă, oricât de mari (răspunsul 1a; opțiunile „până la
     N mm” și „doar lipirea”, §7);
   - doar câte două capete într-un punct: un T (trei sau mai multe) rămâne nelegat, iar mesajul spune unde;
   - un lanț ale cărui capete se întâlnesc devine o cale închisă; operația rămâne cea de dinainte (ca la „Închide”), deci o
     gravare pe linie rămâne pe linie până o schimbi;
   - sensul e al primei căi (prima în document); celelalte se întorc la nevoie, cu arcele și cubicele lor;
   - căile cu operații diferite nu se leagă, iar mesajul spune de ce (răspunsul 3a; opțiunea „operația primei”, §7).
3. **Unde ajunge calea legată:** în locul primei căi (aceeași piesă, aceeași instanță, același nume). Celelalte căi pleacă:
   o instanță rămasă fără nimic se șterge. Căile trebuie să fie pe aceeași foaie și fiecare singură în piesa ei, sau toate în
   aceeași piesă (o piesă importată); altfel refuzul spune „Degrupează întâi”. O piesă pusă de mai multe ori se refuză, ca la
   reparații (ADR 0124 §15).
4. **În panoul Verificare:** rândul „Capetele a două căi, la X mm” primește **Leagă**, iar secțiunea „Noduri prea apropiate”
   primește **Leagă toate căile (n)**, cu aceleași reguli și opțiuni (aici golurile sunt sub toleranță, deci doar lipite).
5. **În unealta Noduri** (care lucrează pe o singură formă): pe calea editată, capătul ales tras peste capătul altei căi
   deschise (lipirea de noduri, ADR 0050, îl pune exact acolo) face activ **Leagă** în bara uneltei: calea editată se leagă de
   aceea, cu aceleași reguli. Aici capetele le alegi tu, nu cele mai apropiate.
6. **Ce nu face:** nu leagă forme închise între ele (booleanul); nu alege care două capete ale unui T se leagă.
7. **Opțiunile** (nota owner-ului: cât mai multe opțiuni pentru useri), sub butonul „Opțiunile legării” de lângă comandă, ca
   „Opțiunile tăierii”, ținute în browser; recomandările sunt implicitele:
   - **Golul peste toleranță:** „cu o linie” (implicit), „cu o linie, până la N mm” (implicit 1, ca „Închide”), „doar
     lipirea”; peste prag, refuzul spune golul;
   - **Capetele lipite:** „pe capătul primei căi” (implicit), „la mijloc” (ambele capete se mută cu jumătate);
   - **Operații diferite:** „nu leagă” (implicit), „ia operația primei căi”;
   - **Legătura** (felia 10.3↑q): „linie” (implicit), „curbă netedă” (tangentă la ambele capete, ca la Vectric), „prelungire
     până la intersecție” (capetele merg pe tangenta lor până se întâlnesc, ca la CorelDRAW; dacă nu se întâlnesc în față,
     refuzul), „racordare” (cu raza dată) și „teșitură” (cu distanța dată), ultimele două pe capetele prelungite;
   - **La import** (felia 10.3↑r): „Leagă capetele la import” pentru SVG și PDF (oprită implicit: fișierul spune ce e), cu
     regulile de mai sus; DXF-ul le leagă deja.

## Feliile

- **10.3↑o:** legarea în model (`legareCai.ts`, pur, în worker), comanda „Leagă căile” (bara, meniul, Ctrl+J), butoanele din
  Verificare și opțiunile golului, ale capetelor lipite și ale operațiilor.
- **10.3↑p:** „Leagă” în unealta Noduri, pe capătul căii editate tras peste capătul altei căi.
- **10.3↑q:** felurile legăturii: curba netedă, prelungirea până la intersecție, racordarea, teșitura.
- **10.3↑r:** legarea la importul SVG și PDF, opțională.

Fiecare felie: proba scrisă întâi (valorile pe hârtie, un oracol independent: lanțul refăcut din eșantioane, cu lungimea și
aria; documentul de după trecut prin ușă), manualul în ambele limbi, otrăvurile în clona ramurii, porțile, canalul `taiere`;
înaintea primului commit de cod, `origin/main` unit în ramură.

**Felia 10.3↑o, la cod** (21–22.11):
- **Legarea** (`legareCai.ts`, pur; cererea `legare` a workerului CAM): capetele căilor deschise, grupate pe o grilă cu pasul
  toleranței; o grupă de două se leagă (dacă au voie: aceeași clasă de piese, aceleași operații), una de trei sau mai multe se
  numără (un T) și își blochează capetele; lanțurile, ca la importul DXF. Golul: între exact două lanțuri deschise, perechea de
  capete libere cea mai apropiată (cu voie), cel mult limita opțiunii; o singură cale deschisă aleasă se închide. Calea legată:
  vârfurile fiecărei căi în coordonatele primei (`inversa(W₁)·Wᵢ`; arcele își schimbă semnul sub oglindire, iar o matrice
  neuniformă cu arce se refuză, `transformare`), întoarse la nevoie (bulge-ul cu semn schimbat, mânerele schimbate), lipite cu
  nodul pe capătul căii mai devreme în document (sau la mijloc), cu mânerele cubicelor mutate cu capetele; la un lanț închis,
  ultimul vârf pleacă în primul. Rezultatul are forma reparațiilor (piesele schimbate, instanțele de șters), deci îl aplică
  `document.repara`.
- **Comanda:** acțiunea ușoară `document.leaga-caile` (Ctrl+J, paleta), cu `legaCaile` dat de modulul editării prin contextul
  aplicației; butonul și săgeata opțiunilor, în secțiunea booleanului; rândul din meniul de clic dreapta. Rezultatul sau motivul
  stă lângă butoane (`stare-legare`) până la altă alegere, comparată după conținut (cea făcută de legare, când instanțele legate
  pleacă, nu-l șterge). Opțiunile: `legareOptiuni.ts` (ușor), depozitul `optiuniLegare.ts` (cheia `cncvs2.legare`) și panoul
  `PanouLegare.tsx`.
- **Verificarea:** „Leagă” pe rândul „Capetele a două căi” (cererea `capete`, doar prin lipire) și „Leagă toate căile (n)”
  (cererea `toate`, pe formele verificate), cu toleranța panoului și restul opțiunilor legării.
- **Pe hârtie** (`legare.test.ts`): cazurile 1–5 de mai sus; golul cu linia, până la N mm și doar cu lipirea, cu prima și cu a
  doua cale întoarse; arcul oglindit; o singură cale, închisă; „multe”; instanța rotită; refuzurile. Oracolul: căile
  eșantionate, la cel mult 0,06 mm una de alta în ambele direcții, și lungimea, suma lor; aplicarea prin acțiune: un pas de
  anulare, exact, documentul trecut prin ușă.
- **Mărimea:** pornirea +0,1 kB (107,2 → 107,3; cu ușa 111,3 / 115: acțiunea, tasta și eticheta ei în dicționarul de bază),
  totalul +4,2 kB (742,0 → 746,2 / 800, A/B în clonă, pe `main` `40487c43` și pe `3ad80ef2`): workerul +2,4 kB (legarea), bucata
  editării +1,6 kB (butoanele, panoul opțiunilor, depozitul, textele), Verificarea +0,2 kB; opțiunile stau într-un modul ușor,
  deci legarea a rămas toată în worker.

## Proba

- Pe hârtie: cazurile 1–5 de mai sus, plus refuzurile (operații diferite, două piese cu mai multe forme, o piesă pusă de mai
  multe ori, o cale închisă printre cele alese), arcele și cubicele întoarse, lanțul închis cu sensul primei, fiecare opțiune
  cu valoarea ei (golul de 2 mm: refuzat la „până la 1 mm”; lipirea la mijloc: nodul în (50; 0,002)).
- Oracolul: lanțul eșantionat, ca drum continuu (fiecare punct al căii legate la cel mult toleranță de una din căile de
  dinainte, și invers; lungimea, suma lungimilor plus liniile noi).
- E2e: două linii desenate cu Pen-ul, legate cu Ctrl+J într-un L, apoi un pătrat din patru linii devine închis (proprietățile
  spun „închisă”), Anulează; rândul din Verificare, cu Leagă; refuzul, cu motivul; o opțiune ținută după reîncărcare.

## Întrebările pentru owner și răspunsurile lui

Formularul lor, cu desenele înainte / după, e pagina „Legarea căilor” (<https://claude.ai/artifact/VUTp5KjrMGY6ggTcm114B2>, privată, a
owner-ului; răspunsurile se salvează în ea). **Răspunsurile, din 21.11:** 1a,
2a, 3a (recomandările), cu nota „cat mai multe optiuni pe care le putem pune la dispozitia userilor”: variantele celelalte devin
opțiuni (§7), iar implicitul e răspunsul. Restul (§1–§6) putea sta împreună, deci nu au fost întrebări.

1. **Golul peste toleranță, la comanda pe căile alese:** a) se leagă cu o linie dreaptă, oricât de mare (recomandat: căile
   sunt alese anume, linia se vede, iar Ctrl+Z o întoarce; ca Illustrator și „Join with a line” din Vectric); b) cu linie doar
   până la pragul lui „Închide” (1 mm), peste, refuzul cu motivul; c) doar lipirea sub toleranță.
2. **Unde se întâlnesc capetele lipite:** a) capătul căii a doua vine pe al primei (recomandat: prima rămâne exactă, iar
   abaterea e sub toleranță); b) amândouă în mijlocul dintre ele (Vectric: „poate deforma desenul”).
3. **Căile cu operații diferite** (o gravare pe linie și un profil): a) nu se leagă, iar mesajul spune de ce (recomandat: o
   cale legată ar schimba ce taie freza pe una din ele); b) calea legată ia operația primei.

## Ce am respins

- **Numele „Unește”:** e al reuniunii (ADR 0067), iar verificarea îl folosește pentru nodurile aceleiași forme.
- **Legarea la import pornită implicit:** fișierul are ultimul cuvânt; opțiunea există (§7), oprită.

## Se redeschide dacă

- owner-ul vrea alte implicite decât răspunsurile lui;
- un caz real cu un T (trei capete) cere o alegere (atunci: care două se leagă);
- Retează ar trebui să lege singur ce rămâne (ADR 0181, „Se redeschide dacă”).
