# BRIEF: CNC Vector Studio, ediția a doua

Se completează în Faza 1, pe măsură ce răspunde owner-ul. Structura e cea din `Apps\PROJECT_KICKOFF.md`, plus
întrebările din `docs/PROMPT-START.md` și din `LECTII.md` §7.

**Legendă:**
- **[decis DD.MM]** = răspunsul owner-ului;
- **[din prompt]** = dat deja în prompt-ul de pornire;
- **[de decis]** = încă deschis.

---

## 1. Produsul

- **Bucla de bază** [din prompt]: desenez sau import vectori → aleg operațiile (decupare, buzunar, V-carve,
  gravare, incrustații) → simulez și verific → generez G-code pentru GRBL → îl trimit la mașină.
- **Ținta** [din prompt]: o aplicație profesională, nu mai simplă, ci mai bună decât ediția întâi. Pragul minim
  e ArtCAM (până la Premium 2018) + DeskProto.
- **Pentru cine (primul utilizator țintă)** [decis 06.10]: **ateliere de producție**. Asta aduce nesting, liste de
  tăiere, oferte, mai multe mașini și posturi. Owner-ul rămâne primul utilizator, pe mașina lui.
- **„v1 merge” pentru un străin** [decis 06.10]: **tot pragul marcat v1** în `ACOPERIRE-ARTCAM-DESKPROTO.md`,
  inclusiv degroșarea și finisarea 3D din STL.
  - Consecință pentru plan: v1 e mare. Planul din PDF estima 93–138 de felii până la v1.
  - De aceea, drumul trebuie împărțit în etape care se termină fiecare cu ceva tăiat pe mașină, nu cu o
    singură livrare la final.

## 2. Ce NU intră în v1 (gardul de scope)

[decis 06.10, din triaj] Ce e pe lista asta nu intră în v1 fără o decizie nouă a owner-ului.

- **v1.x:**
  - ofertă automată PDF, macrouri în sender, buzunar adaptiv;
  - axa a 4-a și fețele multiple, cu posturi A/B;
  - finisare 3D: alte strategii, pas din creastă, rest machining 3D;
  - punți 3D, avans adaptat, piese 3D mari pe dale;
  - posturile pentru alte controlere decât cele din §12.
- **v2:** nesting după formă și cu fibra, vectori decorativi, clipart vectorial, asistent pentru mobilier,
  frezare inversă, gravură pe suprafață 3D, scripting, imagini latente, imprimare 3D.
- **Mai târziu:** generatoare de produse, AI, import IGES/STEP, portret din fotografie, 5 axe, inele și bijuterii.

## 3. Platforma și stack-ul

- **Limbile** [din prompt]: en + ro din prima zi, prin `t()`, cu paritatea verificată de compilator.
- **Platforma principală** [decis 06.10]: **web, ca PWA care pornește offline**, în Chrome/Edge. Senderul
  lucrează prin Web Serial. Desktopul nativ vine abia când chiar e nevoie.
- **Stack-ul:** [de decis în Faza 2]

## 4. Modelul de business

- **Modelul** [decis 06.10]: **mai multe niveluri de la start, toate cu abonament** (de exemplu
  Hobby / Pro / Producție).
- **Proba** [decis 06.10]: **14 zile, fără card.** Registrul probei din ediția întâi (HMAC pe e-mail) e candidat
  la portare.
- **Ce conține fiecare nivel** [decis 06.10]: **se decide înainte de codul de facturare.** Arhitectura are din
  ziua 1 un sistem de capabilități, verificat de fiecare funcție, ca împărțirea să nu ceară refactorizare.
- **Lansarea** [decis 06.10]: **atelierele folosesc aplicația abia la v1 complet**, fără beta înainte. Până
  atunci, singura judecată din afara codului e a owner-ului.
  - Plasa: plăcile de probă săptămânale și demo-ul de la sfârșitul fiecărei etape.
  - Riscul e trecut la §14.
- **Ce se blochează** [decis 06.10]:
  - **exportul G-code și senderul, prin convenție în aplicație.** O verificare de licență în client se poate
    ocoli; e acceptat conștient, fiindcă PWA-ul offline generează G-code-ul local;
  - **cloud-ul, AI-ul și bibliotecile partajate, blocate real pe server.**
  - Dreptul de acces se calculează doar pe server.
- **Stripe** [decis 06.10]:
  - contul live **e încă blocat pe CAEN** și nu se știe când se deblochează;
  - plata se construiește și se probează în modul de test, **cu aceleași produse ca în ediția întâi**;
  - trecerea pe live vine când apar codurile CAEN. Până atunci, live-ul nu încasează.

## 5. Invariante din ziua 1

Din prompt și din `LECTII.md`:
- en + ro prin `t()`;
- ErrorBoundary;
- secretele nu se pun în chat;
- niciodată `git add -A`;
- deploy pe test liber, pe live doar cu confirmarea owner-ului;
- CI verde;
- schema cu versiune și o singură ușă de încărcare;
- build determinist, cu configul citit de la gazdă;
- `.gitattributes`.

## 6. Felul de lucru

Propunerile din `LECTII.md` §2.3, de confirmat:
- **Cine alege felia** [decis 06.10]: **asistentul alege feliile din plan, iar owner-ul aprobă la sfârșitul
  fiecărei etape.** Riscul cunoscut e bucla „continua” din septembrie (`LECTII.md` §2.3). Plasa:
  - ținta fiecărei etape e scrisă în planul aprobat;
  - feliile se aleg din etapă, nu din registru;
  - registrul rămâne o listă de datorii.
- **„Gata” pentru o funcție care mișcă mașina** [decis 06.10]:
  - **la fiecare commit:** oracol fizic automat și valori calculate pe hârtie;
  - **la sfârșitul fiecărei etape:** placa de probă, tăiată de owner, cu 5–10 cote de măsurat date dinainte.
    Placa e momentul aprobării etapei. Transcrierea de pe mașină devine test automat.
  - Până la placă, funcțiile etapei stau pe test, nu pe live.
- **Ritmul etapelor** [decis 06.10]: owner-ul poate ajunge la mașină **săptămânal**, deci etapele au ~1
  săptămână și fiecare se încheie cu o placă de probă.
- **Limita listei pentru owner:** [de decis]
- **Ritmul publicării** [decis 06.10]:
  - pe test, oricând;
  - **pe live, la sfârșitul fiecărei etape**, după placa de probă și cu confirmarea owner-ului, deci
    ~săptămânal.

## 7. Configurarea făcută de owner

Se face în prima săptămână, altfel blochează lansarea mai târziu.
- **Proiectele Firebase** [decis 06.10]: **refolosim `cncvectorstudio` (live) și `cncvectorstudio-test`**, cu
  toate setările făcute acolo: Stripe, domeniu, e-mail, App Check, secrete. Codul vechi se poate șterge din
  Firebase, pentru că rămâne în GitHub și local.
  - **Când se șterge:** nu acum, fiindcă aplicația veche încă rulează pe live. Ștergerea vine la primul deploy al
    aplicației noi: întâi pe test, apoi pe live la sfârșitul primei etape publicate.
    - Hosting-ul nou îl înlocuiește pe cel vechi, cu versiunile vechi păstrate în istoric.
    - La funcții, lista celor de șters e arătată owner-ului înainte de confirmare.
  - **Rămân neatinse:** extensiile Stripe și Trigger Email, domeniul, App Check, conturile de Auth și Secret
    Manager.
  - **Înainte de primul deploy pe fiecare proiect: export Firestore**, ca plasă pentru datele vechi.
  - **Regiunea mixtă rămâne** (baza în `nam5`, funcțiile în `europe-central2`). Declanșatoarele Firestore stau
    în `us-central1`. Planul trebuie să țină cont de asta.
- **Domeniul** [decis 06.10]: `cncvectorstudio.com`. **Numele:** CNC Vector Studio.
- **Stripe** [decis 06.10]: aceleași produse ca în ediția întâi (vezi §4). Contul live e blocat pe CAEN.
  - În ediția întâi, catalogul de test avea 3 niveluri: 9,99 / 19,99 / 49,99 pe lună și 99,99 / 199 / 499 pe an.
- **E-mailul tranzacțional:** cel configurat deja (Trigger Email). Domeniul n-avea MX, SPF și DKIM, deci rămâne
  de reparat [pas pentru owner].
- **Entitatea juridică** [06.10]: **încă necunoscută.** E pas de configurare pentru owner, înainte de lansare. Și
  adresa de contact trebuie să fie una de firmă.
- **GitHub** [decis 06.10]: `AndreiBesliu/cvs2`, **public**.
  - Minutele de CI sunt nelimitate.
  - `docs/faza0/` rămâne doar local și în Drive: e ignorat de git și a fost scos și din istoria locală înainte de
    primul push.
- **Lista pentru owner** [implicit 06.10, dacă nu spune altfel]: cel mult 5 lucruri deschise, fiecare cu stare.

## 8. Ce înseamnă „gata” la lansarea v1

Lista e derivată din răspunsuri și se confirmă în planul din Faza 2.
- Toate rândurile v1 din `ACOPERIRE-ARTCAM-DESKPROTO.md` și cele 8 funcții v1 din §10 sunt făcute.
- Fiecare rând are commit-ul lui în listă.
- Fiecare funcție care mișcă mașina e probată pe placa de probă a etapei ei.
- Posturile pentru NcStudio, Richauto/Syntec și Mach3 sunt probate pe controlere reale.
- Un străin dintr-un atelier își face cont și taie o piesă fără ajutor (criteriul din §1).
- Plata funcționează: Stripe live, după CAEN. Dacă CAEN întârzie, owner-ul decide lansarea fără încasare.
- Partea legală e completă: entitatea juridică, adresa de contact de firmă și Termenii.
- Backup cu alarmă, jurnal de erori de server, costul AI pe apel (dacă AI-ul există), en + ro complet.
- Adminul din §16.1 e complet pentru v1 și se poate exersa pe instanța de test.
- Exportul vectorial din §16.2 e probat cu cititor independent și deschis de owner în programele lui.

## 9. Sistemul de planșe

- **Ce nu mergea, după owner** [06.10]: toate cele patru probleme pe care le-am propus.
  - **Prea multe feluri de „împreună”.** Rama, grupul, dosarul și perechea se purtau diferit la clic, la
    Ctrl+D și la Șterge.
  - **Mai multe plăci nu însemnau producție.** Exportul lua doar planșa activă, nu se putea muta între plăci,
    surplusul nu trecea pe placa următoare, iar piesele repetate erau copii.
  - **Micșorări și reașezări surprinzătoare.**
  - **Interfața din jurul planșelor.**
- **Variantele din prototip** [decis 06.10]: **A** (planșa e pânza, cu un singur arbore) și **D** (hibrid:
  piese cu arbore pe materiale cu față și orientare, nivelul doi ascuns până e cerut). Desenul și descrierea
  sunt în `LECTII.md` §5.6.
- **Când** [decis 06.10]: **în Faza 2, ca sondă, înainte de aprobarea planului.**
  - O pagină clicabilă, fără motor CAM, cu cele 8 scenarii din `LECTII.md` §5.7.
  - Owner-ul o încearcă, iar planul se aprobă cu modelul de planșe ales.
  - Cost estimat: 1–2 zile.
- **Rândul de prag „Sheets + Multi-Plate”** [decis 06.10]: **v1**.

## 10. Funcțiile candidate: v1 / v1.x / mai târziu

[decis 06.10] Funcțiile din prompt care nu sunt deja în pragul v1:

| Funcția | Etapa |
|---|---|
| Listă de tăiere pe mai multe plăci | **v1** |
| Fișă de lucru tipărită (freze, ordine, zero, timp) | **v1** |
| Senzor de lungime la schimbarea frezei, cu M6 ca barieră | **v1** |
| Găsirea colțului XY prin palpare | **v1** |
| Override de avans/turație + jurnal de rulare | **v1** |
| Planarea plăcii de sacrificiu | **v1** |
| Găurire în pași (peck) | **v1** |
| Ghid la prima pornire | **v1** |
| Ofertă automată pentru client (PDF) | v1.x |
| Macrouri în sender | v1.x |
| Buzunar adaptiv (trohoidal) | v1.x |
| Nesting cu direcția fibrei | mai târziu |
| Generatoare de produse | mai târziu |
| AI (generare de design, asistent) | mai târziu |

Deja în pragul v1, deci în afara triajului: rest machining la buzunar (rândul „buzunar cu mai multe freze”).
Incrustația completă, prelucrarea pe două fețe și trasarea din imagine se decid la rândurile lor din prag.

**De lămurit:** nesting-ul e „mai târziu”, dar lista pe mai multe plăci și foile (Sheets) sunt în v1. Trebuie
stabilit cum ajung piesele pe foi în v1.

## 11. Pragul ArtCAM + DeskProto: ordinea

[decis 06.10] Etapele sunt scrise rând cu rând în `ACOPERIRE-ARTCAM-DESKPROTO.md`, cu marcajul „decis 06.10;
era …”.

| Etapa | Înainte | După decizie |
|---|---:|---:|
| v1 | 22 | **64** |
| v1.x | 33 | 10 |
| v2 | 26 | 9 |
| mai târziu | 5 | 4 |

Total: 87 de rânduri.

Pe 07.10 s-a adăugat un rând v1: exportul cu vectori reali (§16.2). Acum v1 are **65** de rânduri, iar totalul e
88.

**Mutat în v1:**
- **A:** cote, deformare în anvelopă, trasare din imagine, tăierea și conversia vectorilor, foi multiple +
  plăcuțe din CSV.
- **B:** tot în afară de asistentul pentru mobilier: gravare pe linie și smart engrave, incrustație V și cu
  pereți drepți, caneluri / teșire / Raised Round, freze de profil desenate, transformarea traseelor, textură din
  forma frezei, ghilotină + găurire multiplă, laser.
- **C:** tot relieful, în afară de portretul din fotografie.
- **D:** zone + contur automat, decupare 3D, coliziunea cu mandrina, zone inaccesibile, felii pentru model
  înalt.
- **F:** șabloane de operații + calcul în lot, asistent pas cu pas + interfața completă.

**Alte etape:**
- **Axa a 4-a și fețele multiple → v1.x** (rotativ continuu, indexat, două fețe cu știfturi, posturi A/B). Cele 5
  axe rămân „mai târziu”.
- **Nesting → v2.**
- **Piese pe foi în v1:** așezare simplă pe rânduri, după dreptunghiul piesei, cu surplusul pe foaia următoare.
- **Imprimare 3D → v2.**
- **Imagini latente:** v2. **Inele:** mai târziu.

**Consecință pentru plan:** v1 aproape s-a triplat. Planul din PDF estima 93–138 de felii pentru v1-ul inițial și
188–273 pentru tot drumul (v1 + v1.x + v2). Ca ordin de mărime, noul v1 se apropie de acea cifră totală. Estimarea
reală se reface în Faza 2, pe etape săptămânale.

## 12. Mașinile țintă și axa a 4-a

- **Axa a 4-a** [decis 06.10]: owner-ul are, sau va avea, **o axă A separată, pe grblHAL sau FluidNC**.
  - Senderul și postul trebuie să știe de A.
  - Rotativul se poate proba pe mașina lui.
  - Când intră în etape se decide la ordinea pragului (tranșa 6).
- **Controlerele atelierelor-țintă** [decis 06.10]: familia GRBL (GRBL, grblHAL, FluidNC), NcStudio (Weihong),
  DSP Richauto / Syntec și Mach3 / Mach4.
- **Posturile în v1** [decis 06.10]: familia GRBL, cu sender, plus posturile pentru toate controlerele de mai
  sus.
  - Fiecare e scris după documentația controlerului, cu sursa citată.
  - Fiecare e **probat pe un fișier real rulat pe acel controler**.
  - Restul posturilor vin în v1.x.
  - **Pas pentru owner:** găsește câte un atelier cu NcStudio, Richauto/Syntec și Mach3 care să ruleze
    fișierele de probă. Pe mașina proprie există doar familia GRBL.
- **Senderul** lucrează doar cu familia GRBL. Pentru celelalte controlere, aplicația doar exportă.

## 13. Simularea și oracolul

- [decis 06.10] **Un nucleu de simulare și un judecător separat.**
  - Ecranul și testele folosesc aceeași simulare, deci owner-ul vede exact ce verifică testele.
  - Un oracol mic, scris altfel și fără cod comun cu aplicația, verifică simularea pe un set de piese de
    referință.
  - Oracolul e calibrat o dată pe lemn.

## 14. Proiectul vechi

[decis 06.10] Rămâne neatins, ca referință.
- Ramura locală goală `laterala` a fost ștearsă pe 06.10. Arborele ei era identic cu commit-ul-părinte, deja pe
  `main`.
- Repo-ul GitHub vechi (`AndreiBesliu/CncVectorStudio`) se **arhivează**, adică devine doar citire, după ce
  aplicația nouă înlocuiește live-ul. Până atunci poate primi o reparație de urgență.

## 15. Riscuri cunoscute, din interviu

- **v1 e mare** (64 de rânduri de prag plus 8 funcții din triaj), iar lansarea vine abia la v1 complet. Drumul
  lung fără utilizatori externi e riscul principal.
  - Plasa: etape săptămânale, fiecare cu o placă de probă și o aprobare.
  - Faza 2 trebuie să arate, cu estimare din durate măsurate, cât durează drumul.
  - Dacă estimarea iese prea lungă, owner-ul poate reconsidera beta-ul sau v1.
- **Posturile pentru NcStudio, Richauto/Syntec și Mach3** cer ateliere externe care să ruleze fișierele de
  probă.
- **Regiunea mixtă a proiectelor Firebase** refolosite (`nam5` cu `europe-central2`).
- **Stripe live** depinde de deblocarea CAEN, fără dată.

## 16. Cerințe adăugate după interviu

### 16.1 Adminul intră în v1 [decis 07.10]

- **Ce:** un panou de admin „ca și acum”, adică cu funcțiile adminului din ediția întâi. Acolo avea 12 file
  (cifra 13 din `docs/faza0/10` era o numărătoare greșită, corectată de sonda din `docs/faza2/admin`):
  - Puls, utilizatori, venituri, analiză, CAM;
  - tichete, crash-uri, config, AI, audit;
  - admini (cu rolurile support / admin / owner), operare.

  Fila AI vine abia odată cu AI-ul, care e „mai târziu” (§2).
- **Când:** decide asistentul, în planul pe etape din Faza 2. Owner-ul aprobă planul.
- **Inventarul exact** (ce face fiecare filă în vechi, ce intră în v1 și ce se lasă) se face în Faza 2, din
  codul vechi, și se trece în plan.
- **Ce nu se repetă** (din `docs/faza0/10`):
  - un singur fișier-monolit pentru tot adminul;
  - funcțiile de admin care pe test dau 401, deci se pot exersa doar pe live;
  - bancul vizual verde pe sabotaje;
  - costul fără detaliere per utilizator;
  - crash-urile văzute doar de la cei care au consimțit.
- **Ce se adaugă față de vechi:** panoul de publicare test → live, decis în ediția întâi și nefăcut niciodată.
  Observabilitatea din `LECTII.md` §4.11 (jurnalul de erori de server, panoul de diagnoză) stă tot în admin.

### 16.2 Desenul lucrează cu vectori reali și îi exportă ca vectori reali [decis 07.10]

Cum am înțeles cerința (de confirmat în planul din Faza 2):
1. **Geometria rămâne exactă prin orice operație.** Orice formă desenată, importată sau editată rămâne linie, arc
   sau curbă la:
   - transformare, inclusiv rotire și scalare neuniformă;
   - conversie în cale;
   - unire, boolean, offset;
   - text în curbe;
   - editare de noduri.

   Un cerc rămâne cerc, nu poligon cu 64 de laturi. Un dreptunghi rotunjit își păstrează colțurile după rotire.
2. **Exportul scrie entități reale, nu puncte.** Formatele sunt SVG, DXF și PDF; EPS / AI se decid în plan.
   - Cercul iese cerc, arcul iese arc, curba iese curbă.
   - Scara în mm e exactă.
   - Straturile și rolurile se păstrează.
   - Fișierul se deschide editabil în alte programe: ArtCAM, Inkscape, Illustrator / Corel, AutoCAD / LibreCAD.
3. **Unde aproximarea e inevitabilă, e mică și declarată.** De exemplu, offsetul unei curbe Bézier nu mai e o
   curbă Bézier. Atunci se folosesc puține curbe sau arce, sub o toleranță declarată, nu sute de segmente.
4. **Proba:**
   - un oracol cu cititor independent: fișierul exportat e recitit de alt program și comparat cu valori pe
     hârtie (raze, lungimi, arii, numărul de entități);
   - în plus, owner-ul deschide fișierele de probă în programele lui, la placa etapei.

**De ce:** în ediția întâi (`LECTII.md` §1, `docs/faza0/01` și `06`):
- rotirea făcea din cerc un poligon cu 64 de laturi și ascuțea colțurile rotunjite;
- „convertește în cale” pierdea arcele;
- offsetul deschis ignora arcele;
- Clipper aplatiza tot și ghicea arcele înapoi;
- DXF-ul scria totul pe stratul „0”.

**În Faza 2:** o sondă dedicată. Rândul de export e trecut în `ACOPERIRE-ARTCAM-DESKPROTO.md`, la A.

## 17. Întrebări deschise

- (niciuna; interviul s-a încheiat pe 06.10)
