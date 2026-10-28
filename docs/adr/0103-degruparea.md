# ADR 0103: Degruparea vectorilor

**Starea:** acceptat pe 28.10.2026, la felia 6.R↑ (adusă din etapa 6), după reparația scalării (ADR 0102). **Completează:**
modelul D (ADR 0024: piese și instanțe, arborele piesei), operațiile pe noduri (ADR 0025), importul (ADR 0035 §8, ADR 0101:
o piesă-grup pe fișier) și booleanul (ADR 0067: rezultatul cu găuri e o piesă-grup). **Schimbă:** jurnalul comenzilor (ADR
0016: o comandă nouă, `degrupeaza` / `regrupeaza`) și banda etichetei mânerelor (ADR 0102 §3: ocolește și insula selecției).

**Problema.** Owner-ul, pe 28.10, după DXF-ul de 247 de contururi: „Si vreau cat mai devreme sa avem functie de ungroup
vectors. Pe click dreapta, dar, si in meniu, langa booleans”. Un import SVG / DXF e o singură piesă, un grup cu câte un
element pe contur, deci contururile nu se pot alege, muta sau scala unul câte unul. Booleanul refuză aceeași piesă („are mai
multe contururi”). „Unirea și separarea vectorilor” fusese amânată pe 20.10 („As face ceva mai mic”).

## Decizia

1. **Ce se desface.** O instanță aleasă a unei piese al cărei arbore e un grup cu cel puțin doi copii devine câte o instanță
   pe fiecare copil, un singur nivel (un copil care e el însuși grup rămâne grup), fiecare cu piesa ei. Instanțele alese care
   nu sunt grupuri rămân cum sunt. După degrupare, alese sunt toate părțile și instanțele care n-aveau ce desface.
2. **Unde stau.** Fiecare parte stă în lume exact unde stătea: instanța ei e o copie a celei vechi (locul, rotirea, câmpurile),
   iar rădăcina ei e copilul grupului, cu matricea grupului compusă (`compune(grup, copil)`). Cu grupul fără transformare
   (importul, desenul, booleanul), rădăcina e chiar copilul, deci lumea rămâne la bit; cu un grup oglindit (ADR 0054), sub
   1e-12 mm. Numele piesei (al fișierului) trece pe fiecare parte; numele elementelor (stratul DXF) rămân pe elemente.
3. **Ce se taie.** Fiecare parte își ia operațiile piesei pe nodurile ei, cu același id, latură, adâncime, sculă și setări; o
   operație pe noduri din mai mulți copii se împarte. Contururile tăiate și operațiile lor rămân aceleași: profilul, linia și
   găurirea sunt ale fiecărui contur; regiunea păstrată se socotește pe toată foaia, din inelele elementelor în lume (ADR 0026);
   buzunarele de aceeași adâncime se citesc împreună pe toată foaia (ADR 0073). Părțile iau locul instanței vechi, în ordinea
   copiilor, deci clasele tăierii rămân (întâi interioarele, la urmă exterioarele, ADR 0037 §8). În clasă, ordinea e acum a
   instanțelor: la importul și la desenul de azi (o operație pe clasă, cu nodurile în ordinea elementelor) programul iese
   identic, la octet; o piesă cu mai multe operații pe aceleași contururi (degroșare și finisare) le taie, după degrupare,
   contur cu contur.
4. **Refuzurile, cu motiv:**
   - **V-carve-ul** pe contururi din copii diferiți: el își citește contururile împreună, par-impar, pe instanța lui (literele
     cu golurile lor, ADR 0090); despărțite, golurile s-ar săpa și ele. Un V-carve pe un singur copil (o literă într-un
     subgrup) trece.
   - **Piesa împărțită** (folosită și de alte instanțe): degruparea uneia ar desface și piesa celorlalte.
   - **Plafoanele documentului**, judecate de schema documentului pe documentul de după.
5. **O comandă a ei, liniară.** `degrupeaza` pune, într-o singură trecere prin liste, părțile în locul fiecărei instanțe vechi
   și piesele lor în locul piesei vechi; inversa, `regrupeaza`, pune la loc instanța și piesa veche, pe locul primei părți.
   Comanda ține doar ce se schimbă, deci istoricul nu crește cu documentul, și se păzește ca celelalte: o instanță sau o piesă
   lipsă, un id repetat, o instanță care ar trimite la o piesă scoasă aruncă. Măsurat (Node, pe mașina owner-ului), cu calea
   de până acum (câte o comandă `adauga` pe parte, într-un lot, ca la duplicare și la rețea): 250 de părți 2 ms, 2 000 55 ms,
   5 000 ~0,3 s, 20 000 ~3 s la aplicare și tot atât la anulare (pătratică: fiecare adăugare copiază listele). Cu comanda nouă,
   la 20 000 de părți: aplicarea 3 ms, anularea 4 ms; judecata, cu schema documentului, 265 ms.
6. **Ușile.**
   - Acțiunea `document.degrupeaza`, în registru (deci și în paletă, Ctrl+K), cu tasta **Ctrl+Shift+G**.
   - Butonul **Degrupează**, în secțiunea Boolean a extensiei barei, după Intersectează. Motivul unui refuz stă lângă butoane,
     până la altă selecție.
   - **Meniul de clic dreapta** pe pânză (în afara vederii 3D): Degrupează, apoi Unește / Scade / Intersectează, apoi Duplică și
     Șterge selecția, fiecare cu tasta lui și activ doar când se poate. Clicul dreapta pe o formă neselectată o alege întâi
     (ca un clic), pe gol lasă selecția. Primul rând activ primește focusul; săgețile, Home și End trec între rânduri; meniul se
     închide cu Escape (fără să schimbe unealta, oriunde ar fi focusul), cu un clic în afara lui, cu rotița, după o comandă
     făcută și la orice altă tastă, după ce tasta își face drumul (închis pe loc, React scotea meniul din pagină între
     ascultători, iar tastele editării nu mai vedeau focusul pe pânză); un refuz își spune motivul în meniu.
7. **Calculul la cerere.** Registrul ține eticheta și garda ieftină: fără selecție, „Selectează întâi ceva”; cu selecție, dar
   înaintea modulului editării, „Editarea se încarcă încă” (nu aruncă, fiindcă acțiunea n-are date de fereastră și vine și din
   paletă și din tastatură). Calculul (`partiDegrupare`, comanda, schema) vine cu modulul acțiunilor la cerere.
8. **Banda etichetei mânerelor** (schimbă ADR 0102 §3). Marginea ei de jos e cea mai de sus dintre bara de jos și insula
   selecției (Duplică, Șterge, proprietățile), care stă deasupra ei: la verificarea lui 9.3↑b pe instanța de test, motivul
   unui refuz, coborât sub cutie, cădea pe jumătate sub insulă.

## Probele

- **Unitar** (`degrupare.test.ts`):
  - piesa unui import (dreptunghiul exterior, gaura interior, linia pe linie) dă trei părți, cu operațiile lor, iar lumea e
    aceeași la bit; grupul oglindit dă colțul (60, 40) în (100 − 47,5 · sin 30°, 50 + 47,5 · cos 30°), sub 1e-12 mm;
  - V-carve-ul peste copii e refuzat, cel dintr-un subgrup rămâne întreg; nimic de desfăcut; operația împărțită, nodul lipsă;
  - acțiunea: părțile în locul instanței, alese părțile și cercul de lângă; **G-code-ul GRBL, fără comentarii, e același**
    (20 de mișcări de tăiere); anularea dă documentul de dinainte la bit, refacerea pe cel de după; refuzurile, cu motivul lor;
  - comanda din jurnal: instanța lipsă, id-ul repetat, piesa scoasă care mai are o instanță aruncă; inversa.
- **Unitar** (`actiuni.calcul.test.ts`): fără calcul, degruparea spune că se încarcă, fără să atingă documentul.
- **E2e** (`import.spec.ts`): un DXF cu trei contururi, degrupat din clic dreapta (meniul, tasta, focusul), din butonul de lângă
  boolean și cu Ctrl+Shift+G, cu Ctrl+Z între ele; clic dreapta pe o formă simplă o alege, iar Degrupează e inactiv; săgețile
  și Escape. Proba scalării (ADR 0102) cere acum și ca motivul să nu cadă sub insula selecției.
- **Manualul:** capitolele „Degruparea” și „Meniul de clic dreapta” (ro + en), tasta în capitolul scurtăturilor; ușile noi în
  poarta manualului (62).
- **Mutațiile: 28 / 28** (modelul, comanda, calculul și garda pe probele unitare; legăturile din editare pe e2e). Prima rundă
  din editare s-a refăcut: controlul ei căzuse, fiindcă un pas nou al probei („altă tastă închide meniul”) pica pe codul bun
  (cauza de mai sus). Escape cu focusul în afara meniului a cerut apoi un pas nou.

## Ce am respins

- **Desfacerea pe toate nivelurile.** Un subgrup (o literă cu golul ei, un ansamblu) și-ar pierde legătura; un nivel pe rând e
  ce fac programele de desen.
- **Degruparea cu V-carve-ul împărțit pe părți.** Literele și-ar săpa golurile: alt traseu, fără să se vadă.
- **Gruparea în aceeași felie.** Cererea e degruparea; gruparea (piese diferite într-una) cere alegerea operațiilor comune și
  vine cu notițele owner-ului din aceeași seară (alinierea care amestecă grupurile, CLAUDE.md, 28.10).
- **Calea de până acum (o adăugare pe parte).** Pătratică: un DXF de 20 000 de contururi ar fi înghețat interfața ~6 s.

## Limite și neprobat

- Doar foaia de lucru (foaia 0), ca toate acțiunile editării până la Multi-Plate (etapa 11).
- Judecata e cu schema documentului întreagă (265 ms la 20 000 de părți), la fiecare clic pe buton sau în meniu.
- Banda de jos e măsurată când eticheta apare; o insulă care apare după aceea (alt aranjament) n-o mută.

## Se redeschide dacă

- trebuie și gruparea, sau desfacerea pe toate nivelurile;
- un V-carve trebuie desfăcut pe litere (fiecare literă cu golurile ei, recunoscută din imbricare);
- ordinea în clasă trebuie păstrată și pentru piesele cu mai multe operații pe aceleași contururi.
