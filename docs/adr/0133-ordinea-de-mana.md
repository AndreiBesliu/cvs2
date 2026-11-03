# ADR 0133: Ordinea de mână a operațiilor

**Starea:** acceptat pe 03.11.2026. Felia 5.9↑, adusă din etapa 5 în etapa 3, fără mașină. Întrebarea: „Repar întâi tăcerea de
pe Ctrl+G, apoi pornesc reordonarea de mână?”. Răspunsul: „Da, pornește”. La schița cu trei planșe, „continua”, cu cele patru
recomandări. **Rândul din prag:** „Ordinea operațiilor și a vectorilor; câte un fișier separat pe sculă”
(`ACOPERIRE-ARTCAM-DESKPROTO.md`). Cu felia asta, partea rămasă (reordonarea de mână a operațiilor) e făcută, deci rândul devine
**făcut**, cu placa etapei 5. **Urmează:** ADR 0084 („Ordinea e automată … reordonarea de mână a operațiilor rămâne în rândul de
prag”). **Documentul:** v19.

**Problema.** Ordinea programului e automată (ADR 0025, 0037 §8, 0084): întâi interioarele, apoi liniile, la urmă exterioarele
și despărțirile foii; în fiecare clasă, operațiile se grupează pe freză. Ordinea asta e sigură, dar nu e mereu cea pe care o vrea
atelierul. Uneori o piesă trebuie terminată înaintea alteia. Alteori o gravură trebuie tăiată la urmă, sau ordinea frezelor
trebuie să urmeze raftul. ArtCAM și VCarve lasă omul să mute operațiile în listă. Ordinea listei e cea a fișierului.

## Decizia

**1. Documentul v19.** Câmpul opțional `rang?: number` pe operație, un întreg în [0, 100 000] (plafonul operațiilor). Dacă nicio
operație a pieselor de pe foaie n-are rang, ordinea e automată, exact ca în v18. Altfel, foaia e în ordinea omului. Migrarea
v18 → v19 schimbă doar numărul. Un document marcat v18 cu un câmp propriu `rang` pe o operație e refuzat: v18 nu-l cunoaște.
Oracolul documentului trece la v19. Câmpul intră în corpusul de aur (ADR 0121) ca adăugirea versiunii 19.

**2. Ordinea tăierii** (`ordineTaieturi`, `src/model/lume.ts`). În ordinea automată, rezultatul e cel de azi:
`grupeazaPeScula(taieturiFoaie(doc))`. În ordinea omului, aceeași listă se sortează stabil după rangul operației fiecărei
tăieturi. O operație fără rang vine după toate cele cu rang. Pe ranguri egale (o copie a unei operații) și între cele fără rang
rămâne ordinea automată. Regulile regiunilor nu se schimbă:
- V-carve-urile unei piese dintr-o instanță, cu aceleași valori (freza, adâncimea, pasul, sensul, fundul plat), se sapă ca o
  singură regiune, la prima lor tăietură din ordine (ADR 0090, precizarea din 5.8↑b);
- buzunarele nu se unesc: fiecare buzunar se taie la locul lui, iar o insulă (ADR 0073) n-are traseu, o ocolește buzunarul care
  o cuprinde.

Schimbările de freză urmează ordinea, deci pot fi mai multe decât în ordinea automată. La fișierele separate pe sculă (ADR 0084),
fiecare șir cu aceeași freză e un fișier, numerotat în ordine.

**3. Fereastra exportului.**
- **Ordinea tăierii:** „Automată” (implicit) sau „A mea”, două butoane apăsabile.
- **Rândurile:** stau în ordinea în care se taie, cu numărul lor (coloana `#`).
  - În „Automată”, ordinea e cea a documentului la deschidere. O schimbare de latură sau de freză în fereastră o reface la
    export (nota de sub comutator o spune).
  - În „A mea”, fiecare rând are un mâner de tras și săgețile Sus / Jos. Lista pornește din ordinea automată. „Înapoi la ordinea
    automată” o readuce.
- **Rândurile legate:** V-carve-urile aceleiași piese, cu aceleași valori, arată „cu N”. Ele se sapă odată cu rândul N, primul
  dintre ele din ordine.
- **Riscul**, doar în „A mea”: exteriorul unei piese poate veni înaintea unei alte operații (interior, linie, buzunar, V-carve,
  găurire) a aceleiași piese sau din interiorul ei. Un dreptunghi și cercul desenat în el sunt piese separate, dar cercul stă pe
  placa pe care o decupează dreptunghiul. „Din interior” înseamnă: primul punct al operației stă într-un contur închis al
  exteriorului, oricare, deci și într-o gaură a lui (`cuprinse`, `src/model/ordine.ts`). O despărțire a foii poate veni
  înaintea altei operații. În aceste cazuri, piesa se poate desprinde înainte să fie gata. Avertismentul numește rândurile, câte
  unul pe piesa exteriorului, iar Exportă cere bifa „Taie în ordinea mea”. Bifa se șterge la orice mutare.
- **Exportă** scrie rangul pe fiecare operație a pieselor de pe foaie, 0 … n−1 în ordinea omului, sau îl scoate în „Automată”.
  Scrierea are loc odată cu celelalte valori, într-un singur pas. Fereastra redeschisă arată ordinea scrisă.

**4. Celelalte comenzi.**
- **Copiile** (duplicarea, rețeaua, degruparea, gruparea) păstrează rangul. Copiile au același rang, deci între ele rămâne ordinea
  automată.
- **O operație nouă** (o formă desenată, un import, un text) n-are rang. În ordinea omului, ea vine la capăt.
- **Rolul aplicat** (`document.rol`, de bază sau personalizat) păstrează locul piesei. O operație nouă primește rangul operației
  vechi cu același id; dacă nu există, primește cel mai mic rang al piesei.
- **Rolul personalizat** nu ține rangul (ca despărțirea, ADR 0114).

**5. Același program peste tot.** Traseul de pe pânză, timpul, animația, simularea și vederea 3D citesc ordinea din document,
deci după Exportă arată ordinea omului.

## Probele

- **Pe hârtie** (`test/unit/ordine.test.ts`). Trei piese: A, cu un exterior și o gaură; B, cu un exterior; C, cu o linie pe T2.
  - Ordinea automată: gaura A, linia C (T2), apoi exteriorul A și exteriorul B (T1); două schimbări de freză.
  - Cu rangurile B = 0, A-exterior = 1, A-gaură = 2, C = 3, programul taie în ordinea asta, cu schimbările de freză numărate.
  - Rangurile egale și operațiile fără rang păstrează ordinea automată.
  - Două V-carve-uri ale aceleiași piese, cu aceleași valori, se sapă la primul. Buzunarul cu insulă rămâne neschimbat.
  - Un document fără rang dă programul de azi, octet cu octet: corpusul CAM și plăcile.
- **Ușa v19 și migrarea:** rangul 0 și 100 000 trec. −1, 100 001, 1,5, „1” și NaN sunt refuzate. Un v18 cu `rang` e refuzat.
  Oracolul independent (`test/oracles/document.ts`) are aceleași frontiere, pe hârtie. Corpusul de aur are versiunea 19.
- **Rolul:** aplicat în ordinea omului, piesa își păstrează locul. Rolul personalizat salvat n-are rang.
- **Fereastra, pe hârtie** (`test/unit/ordineExport.test.ts`): ordinea de la deschidere, mutarea, rândurile legate și riscurile
  (pe aceeași piesă, din interior, despărțirea). Cuprinderea (în gaură, afară, aceeași piesă, bugetul), în
  `test/unit/ordine.test.ts`.
- **E2e** (Edge), în fereastra exportului:
  - comutarea, săgețile și tragerea; avertismentul, bifa și exportul;
  - programul descărcat, în ordinea omului;
  - fereastra redeschisă, cu ordinea scrisă; „Înapoi la ordinea automată” scoate rangurile;
  - V-carve-urile legate, cu „cu N”.
- **Mutațiile țintite:** în jurnalul feliei (`docs/etape/etapa-03.md`, 5.9↑).

## Limitele

- **Vectorii dintr-o operație** se taie în ordinea operației (ADR 0025). Ordinea lor de mână vine la cerere.
- **Doar prima foaie** are program (ADR 0024). Pe mai multe foi, rangul e al operației, deci același pe fiecare foaie.
- **Insula unui buzunar** nu e marcată în listă. Locul ei nu schimbă nimic, fiindcă n-are traseu.
- **Ordinea automată arătată** e cea de la deschidere. Valorile schimbate în fereastră o refac abia la export.
- **Cuprinderea** se judecă pe prima instanță a piesei, ca rândurile, după primul punct al operației: o formă care doar
  intersectează exteriorul poate scăpa. Un exterior din interiorul altui exterior nu e un risc: nici ordinea automată nu le
  ordonează. Peste buget (5 000 000 de vârfuri măsurate), cuprinderile rămase nu se mai caută și rămâne riscul pe aceeași
  piesă.

## Respinse

- **O listă de chei pe foaie** (`<piesă>/<operație>`): degruparea, gruparea și rolul schimbă id-urile pieselor și ale operațiilor.
  Fiecare comandă ar fi trebuit să țină lista la zi, altfel cheile rămâneau moarte. Rangul stă pe operație și pleacă odată cu ea.
- **Mutarea doar în interiorul clasei** (interioarele rămân întâi): owner-ul vrea controlul. Riscul se spune și se confirmă.
- **Refuzul ordinii riscante:** atelierul poate ști de ce o face, de exemplu cu urechi care țin piesa. Confirmarea ajunge.
- **Ordinea scrisă imediat**, fără Exportă: fereastra scrie toate valorile la Exportă, deci ordinea urmează aceeași cale.

## Se redeschide dacă

- owner-ul cere ordinea vectorilor dintr-o operație, ordinea pe foi separate sau ordinea scrisă imediat;
- placa etapei 5 arată o problemă de ordine.
