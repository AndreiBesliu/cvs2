Pornim un proiect NOU, de la zero: o aplicație profesională de proiectare vectorială și CAM pentru CNC pe
lemn. Desenez sau import vectori, aleg operațiile (decupare, buzunar, V-carve, gravare, incrustații), simulez
și verific, generez G-code pentru mașina mea GRBL și o trimit la mașină. Am mai construit una, CNC Vector
Studio (C:\Users\besli\Desktop\MyWork\Apps\CNCVectorStudio, GitHub AndreiBesliu/CncVectorStudio). Scopul NU
e o aplicație mai simplă, ci una MAI BUNĂ: făcută corect de la început, cu tot ce am învățat din prima.
Planul complet, ca prezentare: C:\Users\besli\Desktop\MyWork\Apps\PlanNou-CNC\Plan-CNC-Studio-2.pdf. Aceleași date,
în formă structurată (lecțiile cu surse, deciziile, specificațiile funcțiilor cu criterii de acceptare, definițiile
pragului, modulele, modelul de date, etapele, riscurile, întrebările de interviu, glosarul):
C:\Users\besli\Desktop\MyWork\Apps\PlanNou-CNC\CERCETARE-DETALIATA.json. Citește-le la Faza 0; LECTII.md le verifică
și le completează, nu le ia de bune.

Ce nu mi-a plăcut la proiectul vechi: incepeam sa facem progres prea greu si incepea sa para prea haotic procesul de dezvoltare. asa ca am decis sa 'start again from scratch'

## Prag minim obligatoriu: ArtCAM + DeskProto
Aplicația trebuie să acopere un mix între ArtCAM (până la ArtCAM Premium 2018) și DeskProto. Carveco se ignoră.
Mixul NU e produsul final, ci pragul minim peste care construim. Lista completă de capabilități, cu sursa și
etapa propusă, e în
C:\Users\besli\Desktop\MyWork\Apps\PlanNou-CNC\ACOPERIRE-ARTCAM-DESKPROTO.md. O copiezi în repo și o ții la zi
(stare + commit pe fiecare rând). Nimic nu iese din listă fără decizia mea. Cele două programe sunt referință
funcțională: fără cod, interfață sau clipart copiate, fără reverse engineering.
Pe scurt, înseamnă:
- proiectare 2D și prelucrare 2D / 2.5D completă;
- modelarea reliefurilor, ca ArtCAM: din imagine, editor de forme, combinare, extrudare / sweep / spin,
  sculptare, straturi;
- prelucrarea 3D a modelelor STL, ca DeskProto: degroșare, strategii de finisare, rest, zone, punți, felii;
- axa a 4-a (continuă și indexată) și mai multe fețe.

## Faza 0 — studiezi proiectul vechi, înainte de orice
Citește DEVLOG.md (registrul de restanțe: `npm run stare`), OWNER_VERIFY.md, CLAUDE.md, codul și branch-ul
`wip/inlay-traseu-decupare`. Apoi scrie în folderul proiectului nou un document LECTII.md cu:
1. Inventarul de funcții pe module, cu cât de bine mergea fiecare.
2. Defectele găsite la audituri și cauzele lor de fond, mai ales cele de arhitectură.
3. Ce a mers bine și merită păstrat ca idee: oracolele fizice (simularea tăierii ca dovadă), porțile de
   publicare test → live, instanța de test, plafoanele pe uși, registrul de restanțe.
4. Ce aș face altfel în arhitectură și de ce.
5. Separat, **sistemul de planșe** (plăci, piese, panouri, cadre): cum funcționa, ce probleme a avut și ce
   variante există. Nu sunt mulțumit de el și vreau să-l regândim, dar decizia o luăm împreună la interviu.
Mi-l prezinți pe scurt. Nu-l transcrii; trage concluziile.

## Faza 1 — interviul
Pe baza C:\Users\besli\Desktop\MyWork\Apps\PROJECT_KICKOFF.md și a LECTII.md: tranșe mici, meniuri de opțiuni,
cu recomandarea ta prima. Brief-ul îl completezi în folderul proiectului pe măsură ce răspund. Întrebări:
- bucla de bază și ce înseamnă „v1 merge” pentru un străin;
- **sistemul de planșe**: ce nu merge azi și cum ar trebui să fie. Pornește de la analiza din LECTII.md, cu 2–3
  variante desenate simplu și recomandarea ta. Modelul de date se fixează abia după ce îl încerc;
- din lista de funcții candidate (mai jos), ce intră în v1, ce vine în v1.x și ce vine mai târziu;
- modelul de business (trial, planuri, ce se blochează);
- limbile (en + ro) și platforma (web întâi?);
- mașinile țintă (GRBL întâi? ce alte posturi?) și dacă am axa a 4-a;
- ordinea pragului ArtCAM + DeskProto: ce capabilități din ACOPERIRE-ARTCAM-DESKPROTO.md intră în v1, în v1.x
  și în v2. Recomandarea ta e în coloana „Etapă”;
- infrastructura: refolosim GitHub, Firebase `cncvectorstudio` / `cncvectorstudio-test`, domeniul
  cncvectorstudio.com, Stripe?
- unde stă codul: în afara Google Drive (de ex. C:\dev\<nume>), sincronizat prin GitHub.

## Funcții candidate (recomandarea mea pentru v1 e marcată cu [v1])
1. Traiectorii mai bune
   - [v1] arce G2/G3 native;
   - [v1] V-carve cu două freze (o freză dreaptă curăță fundul plat, V-ul taie marginile);
   - [v1] profil cu urechi, rampe și lead-in corecte;
   - [v1] buzunar și pas automat pentru textul mic;
   - degroșare + finisare, plus recuperare cu o freză mai mică (rest machining);
   - buzunar adaptiv (trohoidal);
   - teșire (chamfer), caneluri (fluting), găurire în pași cu ieșiri pentru așchii (peck);
   - planarea plăcii de sacrificiu (spoilboard);
   - inlay complet: dop + limită + decupare generată.
2. Simulare și estimare
   - [v1] simularea îndepărtării materialului pe tot jobul: previzualizare 3D, și același motor folosit de teste;
   - [v1] avertismente: freza intră unde nu trebuie, trecere peste adâncimea maximă, freză prea scurtă;
   - [v1] timp estimat cu accelerațiile reale ale mașinii (planificatorul GRBL).
3. Lucrul la mașină
   - [v1] sender GRBL;
   - [v1] verificare înainte de start: jobul încape în cursă, zone interzise (cleme), tăiere în gol;
   - [v1] reluarea unui job oprit de la o linie, cu reintrare sigură;
   - [v1] palpare Z cu placă de contact;
   - găsirea colțului XY;
   - senzor de lungime la schimbarea frezei, cu M6 ca barieră;
   - override avans/turație, macrouri, jurnal de rulare.
4. Biblioteca de freze și materiale
   - [v1] freze cu geometrie reală (V, dreaptă, bilă, profil desenat);
   - [v1] materiale; avansuri și turații din încărcarea pe dinte; preseturi pe mașină;
   - fișă de lucru tipărită: freze, ordinea operațiilor, zero, timp.
5. Proiectare
   - [v1] editor vectorial complet: curbe, noduri, boolean, offset, text pe cale, cote;
   - [v1] import robust: SVG / DXF / PDF / PLT, cu plafoane, coordonate absurde, SVG ostil;
   - trasare din imagine;
   - generatoare de produse: cutii cu îmbinări, plăcuțe, rame, puzzle;
   - grupuri și cadre, cu comportament configurabil în setări;
   - prelucrare pe două fețe cu știfturi de aliniere;
   - relief 2,5D din imagine;
   - AI: generare de design, asistent.
6. Pentru cine vinde ce taie
   - așezarea pieselor pe placă (nesting) cu direcția fibrei;
   - listă de tăiere pe mai multe plăci;
   - ofertă automată: material + timp de mașină → PDF pentru client.
7. Fundația
   - [v1] calculul traiectoriilor în fundal (web worker);
   - [v1] offline, salvare automată, recuperare;
   - [v1] date cu versiune de schemă și o singură funcție de migrare;
   - [v1] securitate: CSP, App Check, reguli testate pe emulator;
   - [v1] instanțe test / live cu porți de publicare;
   - [v1] monitorizarea erorilor și costul AI pe fiecare apel;
   - [v1] en/ro și setări pe utilizator;
   - tutorial la prima pornire.
8. Relief, 3D și axa a 4-a
   - toate din pragul ArtCAM + DeskProto (ACOPERIRE-ARTCAM-DESKPROTO.md), cu etapa propusă acolo.

## Faza 2 — arhitectura, în plan mode
Fără cod până nu aprob planul. Planul tratează explicit, din prima zi:
- nucleul geometric: arce exacte, offset, boolean, PLUS reliefuri (hărți de înălțime pe GPU) și modele 3D (mesh);
- motorul CAM: operații 2D / 2.5D / 3D → traiectorii cu arce, pe 3 axe, apoi pe axa a 4-a (continuă și
  indexată), rulat în worker;
- motorul de simulare: hartă de înălțime pentru 3 axe și cilindru pentru rotativ; previzualizare, oracol de
  test, estimare de timp;
- post-procesoarele (GRBL întâi, apoi axele A / B) și senderul;
- modelul de date: proiect (vectori + reliefuri + modele 3D + montaje de prelucrare), bibliotecă, setări —
  totul cu versiune de schemă. Chiar dacă 3D-ul și axa a 4-a vin mai târziu, modelul trebuie să le poată
  primi fără o migrare dureroasă;
- cloud-ul: cont, proiecte, plăți, observabilitate.
Plus, pentru fiecare modul, cum se testează (vezi „Calitatea”).

## Cum lucrăm
- **Corectitudinea se demonstrează.** Tot ce mișcă mașina (CAM, G-code, sender) se verifică cu oracole fizice
  (simularea tăierii) și cu valori calculate pe hârtie. Invariantele sunt fixe: niciodată mai adânc decât pasul
  pe trecere, freza nu intră greșit în piesă. În 3D se adaugă creasta măsurată și suprafața rezultată față
  de model, în limita toleranței. Mutațiile (otrăvurile) se fac țintit, pe modulele critice, în
  fundal. Restul are teste normale și bancul vizual.
- **Felii care se termină cu ceva ce pot încerca,** fiecare cu commit. La final: ce merge, cum testez, ce a
  rămas deschis.
- **Workflow-uri multi-agent doar cu acordul meu,** cu durata estimată spusă înainte.
- **Estimări din durate măsurate.** Dacă o felie depășește estimarea cu peste 50 %, te oprești și mă întrebi.
- **Pauze curate.** Când zic „pauză”, te oprești imediat și lași totul comis (branch WIP, dacă nu e gata).
- **Întrebările le strângi și le pui grupat,** cu recomandarea ta în față. Ce decid se scrie în CLAUDE.md sau
  în brief.
- **Codul stă în afara Google Drive,** sincronizat prin GitHub. Drive-ul a readus fișiere vechi peste munca nouă.
- **Din prima zi:** en + ro prin t(), cu paritate verificată de compilator; ErrorBoundary; secretele NU se lipesc
  în chat (le pun eu în .env.local sau în Secret Manager); niciodată `git add -A`; deploy pe test liber, pe live
  doar cu confirmarea mea; CI verde mereu.

## Proiectul vechi = referință, nu șablon
Algoritmii verificați acolo (G-code, offset-uri, V-carve, inlay, import, sender, simulare) se pot porta după ce
mi-ai arătat ce și de ce. Arhitectura nu se copiază.
