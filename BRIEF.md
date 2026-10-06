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

[de decis]

## 3. Platforma și stack-ul

- **Limbile** [din prompt]: en + ro din prima zi, prin `t()`, cu paritatea verificată de compilator.
- **Platforma principală** [decis 06.10]: **web, ca PWA care pornește offline**, în Chrome/Edge. Senderul
  lucrează prin Web Serial. Desktopul nativ vine abia când chiar e nevoie.
- **Stack-ul:** [de decis în Faza 2]

## 4. Modelul de business

- **Modelul** [decis 06.10]: **mai multe niveluri de la start, toate cu abonament** (de exemplu
  Hobby / Pro / Producție).
  - Proba de 14 zile fără card e de confirmat.
  - Ce conține fiecare nivel se decide la triajul funcțiilor (tranșa 6).
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
  - **Înainte de primul deploy pe fiecare proiect: export Firestore.** Azi nu există niciun backup, iar PITR e
    oprit.
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

[de decis]

## 9. Sistemul de planșe

[de decis după prototip; variantele sunt în `LECTII.md` §5.6]

## 10. Funcțiile candidate: v1 / v1.x / mai târziu

[de decis; lista e în `docs/PROMPT-START.md`]

## 11. Pragul ArtCAM + DeskProto: ordinea

[de decis; propunerea e în coloana „Etapă” din `ACOPERIRE-ARTCAM-DESKPROTO.md`]

## 12. Mașinile țintă și axa a 4-a

- **Axa a 4-a** [decis 06.10]: owner-ul are, sau va avea, **o axă A separată, pe grblHAL sau FluidNC**.
  - Senderul și postul trebuie să știe de A.
  - Rotativul se poate proba pe mașina lui.
  - Când intră în etape se decide la ordinea pragului (tranșa 6).
- **Controlerele și posturile pentru v1:** [de decis]

## 13. Întrebări deschise

- Simularea ca oracol: un singur motor sau două (`LECTII.md` §7.6).
