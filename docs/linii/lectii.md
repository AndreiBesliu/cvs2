# Lecțiile comune

<!-- Adunate din memoria sesiunii principale pe 23.11.2026 (mutarea în cloud): lecțiile generale la care trimit notele liniilor, cele despre probe, porți, mutații și Firestore, capcanele uneltelor folosite de cncvs2 și felul de lucru cu owner-ul. Se țin la zi aici. -->

<a id="feedback-iesirea-reala-privita-marita"></a>

## Ieșirea reală, privită mărită

_Un rezultat geometric sau vizual (trasare, linii mediane, curbe, G-code): înainte de raport, ieșirea pe un caz REAL al owner-ului, privită mărită, în întregime, pe bucăți; probele sintetice treceau și cu trei runde de defecte pe logo_

Pentru orice ieșire geometrică sau vizuală (trasarea din imagine, liniile mediane, curbele, traseele sculei), raportul vine
abia după ce ieșirea pe un caz REAL al owner-ului (logoul lui, un desen trimis) a fost privită **mărită, în întregime, pe
bucăți** (randare cu imaginea sub linii, 4–6× pe zone), nu doar după cifrele probelor.

**Why:** la cncvs2 25.3↑ (linia mediană, 08.11.2026), corpusul (îmbinări rotunde), furcile, zgomotul și otrăvurile treceau
toate, iar logoul owner-ului avea: zigzaguri în colțurile drepte ale literelor (61 de întoarceri peste 120°), o joncțiune în
afara cernelii, apoi, la a doua privire, colțurile urechilor tăiate de o coardă (2,7–4,1 px), joncțiunea lui „e” cu 4,4 px pe
lângă și un colț teșit. Trei runde de corectură, fiecare găsită doar privind logoul, nu din probe. Cifrele măsoară ce ai
gândit să măsori; imaginea arată ce n-ai gândit.

**How to apply:**
- Privește TOT cazul real (pe plăci care acoperă tot desenul), nu doar zonele bănuite; a doua rundă a ieșit la plăcile
  nebănuite. Fă asta înaintea raportului și din nou după fiecare corectură (o corectură mută defectele în altă parte).
- Fiecare defect văzut devine probă: reperele cazului real (colțuri, joncțiuni, numărul capetelor la o joncțiune) în proba
  pe imaginea reală, plus un caz sintetic care reproduce mecanismul (un „e” sintetic, un X îngust); verifică întâi că proba
  cade pe codul vechi.
- O otravă care scapă și schimbă doar topologia (aceeași geometrie, alte căi) cere o probă de topologie (câte căi se termină
  într-un punct), nu un prag mai strâns pe distanțe.
- Corectura se compară cu codul vechi pe configurații întâmplătoare (mai bune / mai rele / la fel, cu cele mai rele regresii
  văzute), ca să nu repari cazul real stricând altele: X-ul îngust și Y-ul din arce au ieșit așa.

**A doua confirmare (3.Th, rotițele dințate, 18.11.2026):** unitarele, e2e-ul și 27 / 27 otrăvuri treceau. Capturile 3D
și perechile mărite au arătat crucea roții de 8 aproape tăiată de goluri; măsurat apoi pe contur: **0,036 mm** de perete
(avertismentul spunea 0,25, socotit din raze). Căutând marginile cazului, STL-ul ieșea deschis la modulul 0,5 cu puțini
dinți. Pentru piese 3D: capturi din mai multe unghiuri, la toate felurile și găurile, plus o măsură pe geometria reală
(colțuri, coarde), nu pe razele teoretice.

**Pictogramele (3.Tp↑b, 22.11.2026):** desenele mici (18 px) se aleg pe o foaie: lângă poza piesei reale, la 48 px și pe
butoane (apăsat și nu, ambele teme), la 1x ȘI 2x, mărite cu pixeli vizibili (`image-rendering: pixelated`). La 48 px toate
păreau bune; la mărimea reală, bila pe placă era pictograma de „utilizator”, fulia (mosorul) o clepsidră, roata cu două
cercuri o țintă, șenila (buclă cu roți) grinda cu găuri. Caută și asemănarea cu pictogramele comune ale interfețelor.

Legat: „Semnal ≠ măsurătoare”, „Proba unde e bugul”, „Mutații: disciplina”,
[Trasarea din imagine (25.x↑)](trasare.md), [Roți, fulii, conice, șenila (3.Tj–3.To)](roti-senile.md).

<a id="feedback-constanta-potrivita-pe-corpus"></a>

## Constantă pe corpus

_O constantă potrivită pe un corpus se rupe pe următorul; dacă predicția chiar nu se poate face, întoarce o BANDĂ măsurată, nu un număr inventat în mijlocul ei_

CNCVS, 19.09.2026. Restanța cerea „un predictor ieftin" pentru câte linii de G-code scoate o v-carve.
Am măsurat trei, pe rând, și **fiecare a părut bun până la corpusul următor**:

| predictor | împrăștiere | ce l-a rupt |
|---|---|---|
| `aria / pas` | ×251 | inelele unui dreptunghi rămân dreptunghiuri (4 segmente); ale unui cerc se re-eșantionează |
| `aria·segmente/(pas·perimetru)` | ×26,6 | subestimează o stea de **20×** — un colț reintrant CÂȘTIGĂ segmente la offset |
| `inele × segmentele primului inel` | ×10 | a dat ×4,09 pe primul corpus și **0,546** (sub 1!) pe al doilea, la un dreptunghi rotunjit |

Al treilea e cazul instructiv: **părea câștigătorul**, cu 12 forme și o împrăștiere acceptabilă. L-am
rupt doar fiindcă am mai adăugat patru forme. Cu minimul din primul corpus ca factor conservator,
regula n-ar fi refuzat nici măcar cazul pentru care a fost scrisă.

**Why:** cauza nu era calibrarea, era că mărimea prezisă variază în **ambele direcții** de-a lungul
procesului (segmentele pe inel cresc pe colțuri reintrante și scad când geometria se simplifică). Un
singur eșantion n-o poate reprezenta, indiferent de constantă. „Mai măsor și potrivesc coeficientul"
e exact drumul care duce la un predictor care minte convingător.

**How to apply:**
- **Înainte să potrivești o constantă, lărgește corpusul cu forme ADVERSARIALE** — nu cu mai multe
  din aceleași. Cercuri de opt raze nu spun nimic despre o stea. Cel puțin o formă concavă, una
  rotunjită, una alungită, una foarte fină.
- **Verifică minimul, nu media.** Dacă regula refuză ceva, siguranța ei stă pe extrema de jos; media
  e irelevantă. Vezi „Feedback_excluderea_valoreaza_cat_instrumentul”.
- Când predicția chiar nu se poate face, **întoarce banda măsurată, nu mijlocul ei**. O bandă de 11×
  e un răspuns; un număr cu trei zecimale în mijlocul ei e o minciună. Și scrie în cod că marginile
  sunt ale INSTRUMENTULUI (corpusul), nu ale geometriei, ca să fie relărgite, nu ajustate.
- **Separă ce se poate ști de ce nu.** Aici numărul de INELE se afla exact și ieftin (±1, prin
  căutare binară, ~10 offseturi în loc de N); numărul de LINII nu. Spune-l pe primul.

Înrudite: „Autoconsistența”, „Semnal ≠ măsurătoare”,
„Feedback_mutatia_probeaza_ce_ating_fixturile” (fixturile pătrate unde răspunsul greșit nimerea).

<a id="feedback-scaner-sursa-polaritate"></a>

## Scaner fără polaritate

_Un scaner de sursă orb la literalii de regex își inversează polaritatea pe tot restul fișierului, TĂCUT — și gărzile care îl folosesc devin oarbe fără să pice_

Un scaner care albește comentariile/șirurile ca să poată afirma ceva despre COD trebuie să cunoască
**literalii de regex**. `.replace(/'/g, '&apos;')` — un apostrof între bare — face un scaner naiv să
creadă că începe un șir; îngite până la următoarea ghilimea, și de-acolo citește **tot restul
fișierului cu polaritatea inversată**: codul ca șir, șirurile ca cod.

**Why:** simptomul nu e o eroare, e o TĂCERE. Comentariile de după acel rând nu se mai albesc, deci o
verificare care caută un tipar în cod îl găsește în proza care explică de ce tiparul e interzis —
verde exact invers decât adevărul. Măsurat în CNCVectorStudio (16.09.2026): **353 de linii de
comentariu în 17 fișiere**, inclusiv în fișierul scanerului însuși, iar cele două porți care măturau
tot `src/` erau oarbe acolo. Vezi „Semnal ≠ măsurătoare”.

**How to apply:**
- Deosebirea regex/împărțire fără parser: privește ultimul caracter semnificativ. După identificator,
  număr, `)` sau `]` urmează o VALOARE ⇒ `/` e împărțire; altfel deschide un regex. Excepțiile sunt
  cuvintele-cheie (`return`, `typeof`, `case`, `in`, `of`, `new`, `delete`, `void`, `throw`, `yield`,
  `await`, `do`, `else`, `instanceof`).
- **JSX nu e niciuna din două:** `</div>` (bara după `<`) și `/>` (bara urmată de `>`) trebuie sărite
  explicit, altfel „regexul" înghite rândul următor — inclusiv un `{/*` care deschide un comentariu.
- Într-un mod „numai comentariile" (șirurile PĂSTRATE), nu albi acolada care închide `${…}`:
  `` `p/${X}/d` `` devine `` `p/${X /d` `` și o verificare care caută interpolarea n-o mai găsește.
- **Proba care prinde următoarea formă de sintaxă:** pe tot arborele, orice linie care e numai corp de
  comentariu-bloc trebuie să iasă fără nicio LITERĂ. Nu „linie goală" — ultima linie a unui comentariu
  JSX lasă legitim `}`. Măsoară înainte/după cu scanerul de la `HEAD` pe același corpus.

<a id="feedback-izolarea-cere-binarul-nu-sursa"></a>

## Izolarea cere binarul

_Un test care conduce un artefact CONSTRUIT nu vede editările de sursă — izolarea „cu/fără schimbarea mea" măsoară zgomot dacă nu reconstruiești între rulări_

Înainte să izolezi o regresie schimbând sursa și re-rulând, **verifică ce consumă comanda de test**.
Dacă drive-uiește un artefact construit (`dist/`, un bundle, un container), editările de sursă nu
ajung la ea decât după un build — iar „cu schimbarea mea pică, fără ea trece" e o comparație între
aceiași octeți.

**Why:** măsurat în CNCVectorStudio (18.09.2026). `npm run test:sim` verifică doar că `dist/index.html`
EXISTĂ și îl servește; nu construiește. Am pus fișierele deoparte, am adus versiunile de la `HEAD`, am
rulat — verde. Am pus munca înapoi și am scos doar un import nefolosit — verde. Concluzia se scria
singură („ștergerea unui import schimbă chunk-urile și, prin ele, comportamentul pânzei") și era
falsă: toate rulările folosiseră `dist/`-ul construit o singură dată, de poartă, la început.
Reconstruit și rulat de trei ori: verde, verde, verde. **1 roșu din 6 rulări pe același binar** —
adică o poartă intermitentă, nu o regresie. Vezi „Semnal ≠ măsurătoare” și
„Măsoară, reproductibil”.

**How to apply:**
- Citește ce face scriptul de test înainte de a-l folosi ca instrument de izolare: construiește, sau
  presupune că cineva a construit? Un `if (!existsSync(dist)) { eroare }` e semnalul.
- **Stabilește întâi RATA**: rulează de 3–5 ori pe binarul NESCHIMBAT. Un roșu izolat pe cinci verzi
  e intermitență, și orice experiment clădit peste el e zgomot.
- Dacă chiar reconstruiești între variante, spune-o în raport — altfel cititorul nu poate deosebi
  „am testat schimbarea" de „am testat același binar de două ori".
- O poartă care cade ~1 din 6 pentru motive fără legătură e o poartă pe care omul o va ignora;
  deschide-o ca restanță, și fă evenimentul determinist în loc să lărgești pragul
  („Rularea nu repară geometria”).

<a id="feedback-poarta-locala-cu-dependenta-in-cloud"></a>

## Poartă locală, dep. cloud

_O poartă „locală" care servește un build real poate deschide rețeaua și-și lua măsurătorile dintr-un document editabil din cloud; declară mediul probei, nu-l presupune_

CNCVS, 18.09.2026: `boot-smoke` și `sim-check` conduc `dist/`-ul construit, care își citește configul
Firebase de la gazdă. Deci aplicația deschidea un ascultător viu pe `firestore.googleapis.com` **la
fiecare rulare a porții** — iar unul dintre documentele de acolo e un ANUNȚ, randat ca primă bandă a
paginii. Înălțimea editorului dintr-o poartă locală era decisă de un document pe care-l poate edita
oricine are adminul. Aia a fost poarta intermitentă 1/12.

**Why:** o probă care conduce artefactul REAL moștenește și dependențele lui de rețea. „Local"
descrie unde rulează procesul, nu de unde îi vin datele. Și mai rău: proiectul avea **două antete
care se contraziceau** — unul spunea corect „these checks DO contact firestore on every run … nobody
had said so", celălalt scria „**dacă vreodată** o cerere ar scăpa" și stătea exact în fișierul pe
care-l cheamă porțile. Proza optimistă era cea pe care ai fi citit-o.

**How to apply:**
- Când o poartă e intermitentă și n-ai cauza, **întreabă întâi ce iese în rețea** (`page.on('request')`),
  înainte să cauți în codul care pare implicat. Un vinovat din afara repo-ului nu apare la `git log`.
- Taie ieșirile pe CONTEXT (nu pe pagină — altfel scapă service worker-ul) și verifică apoi că pagina
  se ridică întreagă; dacă se ridică, dependența era accidentală, nu măsurată.
- **O verificare pe „ce a încercat să iasă" trece ÎN GOL dacă interceptorul e scos** (mulțime goală →
  zero gazde noi → verde). Pune lângă ea rândul care cere dovada că înregistratorul era pornit. Vezi
  „Feedback_plafon_atins_nu_inseamna_plafon_care_leaga”.
- Mută regula la CLASĂ, nu la fișier: „cine cheamă `serveInitDeGazda` cheamă și `ermetizeaza`, câte
  unul pentru fiecare `newContext()`". Greșeala reală e un context nou adăugat fără izolarea lui.
- Când două comentarii ale proiectului spun lucruri contrare, **măsurătoarea decide și amândouă se
  rescriu** — vezi „Semnal ≠ măsurătoare” și
  [„Izolarea cere binarul”](#feedback-izolarea-cere-binarul-nu-sursa).

<a id="feedback-garantie-din-esantionare"></a>

## Garanție din eșantionare

_O garanție de abatere măsurată pe eșantioane uniforme e goală până când bucata nu se poate întoarce între eșantioane; iar o aproximare din aval (postul) se adună la cea din amonte_

Un fitter care „garantează” abaterea ≤ tol măsurând-o pe N eșantioane uniforme în t NU garantează nimic pe bucăți care se pot
întoarce între două eșantioane. Recenzia biarcelor cncvs2 (2.7a, 11.10.2026) a găsit 18–414 × tol tăcut: un mâner întors
pe o cubică aproape dreaptă ținea întoarcerea în primul 1/32 al bucății, iar lanțul era coarda goală. Ținta de 0,99 × tol
nu acoperă așa ceva. Reparația care a închis clasa: bucățile tăiate la extremele pe axe (monotone pe x și y, tangenta
într-un cadran), plus rafinarea FIECĂRUI maxim local al șirului eșantionat (nu doar a celui global).

A doua lecție, din aceeași recenzie: două aproximări stivuite se adună. Postul GRBL scria ca segmente G1 orice arc cu raza
> 1e4 mm, cu săgeata ≤ tol, peste abaterea de 0,99 × tol a fitter-ului: 2,05 × tol prin postul real. Garda din aval
(`razaMaxima` a contractului) TREBUIE să intre în bugetul fitter-ului din amonte, legată printr-un test (postul nu poate
importa geometria).

**Why:** testele de pe corpus treceau toate; doar căutarea adversarială pe familii (mâner întors, vârfuri cu coordonate
neîntregi, raze mari) a găsit golurile. Oracolul independent avea același orb ca aplicația (eșantionare uniformă).

**How to apply:** la orice ușă de aproximare (biarce, offset, liniarizare, simplificare) întreabă: (1) poate bucata să facă
ceva între eșantioane? Dacă da, taie-o întâi la punctele care o fac monotonă; (2) ce aproximează din nou consumatorii din
aval (post, controler, export) și cu ce gardă? Gărzile lor intră în buget, cu un test de consecvență. Otrăvurile care
slăbesc măsurătoarea scapă de obicei: le prinde un test pe ȚINTA declarată (0,99), nu pe tol. Vezi „Mutații: disciplina”,
„Semnal ≠ măsurătoare”, [sesiunea principală](principala.md).

<a id="feedback-plafonul-si-usa"></a>

## Plafonul și ușa

_Plafonul e al artefactului, nu al unei uși (enumeră ușile); ușa care salvează: ce aruncă un consumator devine buclă de căderi_

Unite pe 31.10.2026 la compactarea indexului (fiecare secțiune e fostul fișier, cu textul lui).

#### Plafonul artefactului

Când o constrângere e despre un ARTEFACT (mărimea unui program, formatul unui fișier, o limită de
cotă), cablează-o la **fiecare ușă prin care artefactul iese**, nu la cea la care ai lucrat.

**Why:** măsurat în CNCVectorStudio, 17.09.2026 — aceeași aplicație REFUZA un fișier străin de 22 MiB
cu cifrele pe ecran, și trimitea la mașină propriul ei program de 22 MiB fără o vorbă, pe panoul care
scria limitele operatorului cu litere mari. Verificarea exista, era corectă, era chemată dintr-un
singur loc. Nimic nu era stricat; doar lipsea de pe una din uși. Vezi „Feedback_o_functie_un_adevar”.

**A DOUA OARĂ, 21.09.2026, ACEEAȘI APLICAȚIE, MIZĂ FIZICĂ.** Regula „nimic nu dărâmă pagina cât
mașina taie" era scrisă în DOUĂ antete și aplicată într-UNUL singur (bannerul de actualizare).
`grep` peste `src/`: **opt uși** cu `location.reload` / `assign` / `href =`. `isRunActive()`,
steagul scris special pentru regulă, avea **zero apelanți în tot `src/`**. Cea mai rea reîncărca
**singură, fără niciun clic** (panoul de eroare, la un chunk lipsă după deploy) — adică taie
portul serial cu freza în material. Și antetul spunea „THE RELOAD HAPPENS HERE AND NOWHERE ELSE",
ceea ce **era deja fals**: propoziția aia e ce ține defectul în viață, fiindcă următorul cititor o
crede și nu mai caută. Vezi „Feedback_ce_nu_ruleaza_poarta_nu_e_probat”.

**Trei lucruri noi din a doua oară:**
1. **Reparația nu e o verificare la fiecare ușă, e O SINGURĂ UȘĂ** — un modul prin care trec
   toate, plus o INTERDICȚIE care refuză orice altă atingere. „Un setter lângă fiecare loc merge
   până când cineva adaugă al treisprezecelea." A opta ușă a pus-o cineva care n-avea de unde ști
   că există o regulă; a noua va fi la fel.
2. **`automat` și `cerut` nu pot primi același răspuns.** Ce pornește codul se REFUZĂ fără
   întrebare (nimeni n-are ce confirma); ce apeși tu se ÎNTREABĂ, cu consecința scrisă — un refuz
   tăcut pe un clic e un buton stricat. Și un al treilea mod, `confirmat`, fiindcă întrebarea
   trebuie pusă ÎNAINTE de cererea de rețea care produce URL-ul, nu după.
3. **Piesa mobilă de sub regulă cere proba ei.** Steagul era OGLINDIT dintr-un alt magazin printr-un
   singur `subscribe`. Dacă oglinda nu poartă tranziția, fiecare ușă e deschisă și funcția de
   decizie rămâne perfect verde. Probeaz-o conducând sursa, în ambele sensuri.


**How to apply:**
- **Derivă mulțimea ușilor din sursă**, nu dintr-o listă scrisă de mână: caută apelurile funcției care
  produce artefactul. Apoi **clasifică-le o dată, într-un tabel din test**, cu motivul scris pentru
  fiecare. O ușă nouă cade prin clasificare ⇒ roșu ⇒ o întrebare („trimite, sau doar arată?"), nu o
  omisiune tăcută. Tiparul e al listei albe din `test-post-picker.ts`.
- **Martor în ambele direcții**: cere și ca ușile din clasa „doar arată" să NU aplice regula. Fără el,
  „toate o aplică" ar fi la fel de verde dacă ar aplica-o toată lumea, iar clasificarea n-ar mai
  însemna nimic.
- **Scanarea pe sursă nu ajunge la ușa care contează**: poate cere ca apelul să EXISTE, nu ca
  propoziția să ajungă pe ecran. Pe ușa cu consecințe fizice, montează componenta reală. Alege fixtura
  MĂSURAT: 20 000 de forme mici treceau plafonul în 1,7 s, varianta „evidentă" în 2,8 s.
- **Verifică dacă propoziția rămâne adevărată pe ușa nouă.** A noastră spunea „aplicația NU îl va
  încărca" — adevărat despre un fișier, fals despre un program care se trimite. Un text partajat de
  două uși e un al treilea loc unde adevărul se poate rupe.
- Și **caută documentația**: numărul era retastat și în manual, în ambele limbi.

#### Ușa care salvează

cncvs2, felia 1.7 (08.10.2026): documentul a început să se salveze în IndexedDB, iar recenzia adversarială a găsit
două clase de probleme pe care salvarea le schimbă.

1. **Ce acceptă ușa, dar aruncă un consumator, devine o buclă de căderi.** Un dreptunghi cu raza colțului peste
   jumătate de latură sau un cerc sub o scalare neuniformă treceau de schemă, dar pânza și avertismentele aruncau la
   randare. Înainte, o reîncărcare dădea un document nou. Cu salvarea, aceeași eroare apare la FIECARE deschidere,
   iar ieșirea e doar ștergerea datelor site-ului.
   **Regula:** ușa (schema + verificările de ansamblu) refuză exact ce nu pot procesa pânza, CAM-ul și avertismentele;
   la fel și comenzile aplicației (o acțiune care ar trece de plafon e inactivă). Altfel aplicația salvează un document
   pe care nu-l mai poate redeschide.
2. **valibot 1.5 scoate tăcut cheile `__proto__`, `constructor` și `prototype`** din `looseObject` și din `record`. Nu
   raportează nimic, iar „câmpurile necunoscute se păstrează” devine fals. Ușa validează cu valibot, dar întoarce
   `structuredClone(intrarea validată)`, care păstrează cheile ca date, fără să schimbe prototipul.
   **Consecința (cncvs2 11.4↑, 08.11):** o judecată pusă ÎN validator (`check` / `rawCheck` pe `dataset.value`) vede ieșirea,
   deci nu vede intrările sub acele chei: o plăcuță cu cheia `constructor` trecea nejudecată, iar aplicația (care folosește
   copia brută) îi citea literele. Ce se judecă pe chei-date (dicționare ale căror chei referă noduri, operații) rulează DUPĂ
   schemă, pe intrarea brută, și verifică singur forma intrărilor sărite (valoarea unei chei sărite nu e validată deloc).
   Găsit doar recitind codul cu un câmp `{__proto__}` în minte: la un dicționar nou, întreabă „ce face cu `constructor`?”.

**Plafoanele se pun pe produs, nu pe factori:** 100 000 de noduri și 100 000 de instanțe, fiecare în plafon, dau 10¹⁰
elemente în lume. Pune plafonul pe ce consumă cititorii (elementele în lume).

**Plafoanele stau în contract, nu doar în cod.** Oracolul scris independent din ADR le-a găsit pe toate cele nescrise.
Vezi [sesiunea principală](principala.md), [„Plafonul și ușa”](#feedback-plafonul-si-usa),
„Starea purtată cere lumea care o repară”.

<a id="feedback-trigger-porneste-o-data"></a>

## Trigger O DATĂ

_Un onDocumentCreated pornește O DATĂ — deci orice eșec e definitiv și trebuie SCRIS pe document, altfel ecranul minte în una din două direcții_

Un `onDocumentCreated` (Firestore, Cloud Tasks, orice declanșator cu o singură lovitură) **pornește
o dată pe document**. Deci fiecare cale de eșec e **permanentă**: nu există a doua încercare pentru
documentul ăla, niciodată. Un ecran care desenează starea „se lucrează” dintr-un câmp de pe document
va minți, și va minți în **una din două direcții opuse**, ambele tăcute:

- **ȘTERGE steagul** → indicatorul dispare și rămâne rezultatul gol. Nedeosebit de „s-a uitat și
  n-a găsit nimic”.
- **LASĂ steagul** (un `return` pe o ramură de eroare) → indicatorul se învârte **la infinit**, la
  fiecare deschidere, până la sfârșitul vieții documentului.

**Regula:** orice oprire **aruncă**, un singur `catch` prinde, și scrie **motivul pe document**
(`{ status, reason, at }`). Ecranul citește motivul și oferă reluarea — printr-un **callable
existent**, ca reluarea să întâlnească aceleași limite (auth, cotă, buget) prin care a trecut
declanșatorul, nu să le ocolească.

**Forma care face bug-ul imposibil:** mută generarea într-o funcție **fără niciun `return`** —
scrie, sau aruncă. Declanșatorul păstrează doar `return`-urile care înseamnă „n-am treabă aici”.
Un test cu parser ține numerele; al treilea `return` apărut oriunde e, prin construcție, o cale de
eșec care nu înregistrează nimic. Un test care *caută* bug-ul se poate rata; o formă în care nu
încape nu.

**Cusătura de urmărit:** motivul e un cod care devine propoziție în 6 limbi. Un motiv adăugat pe
server și netradus ajunge la familia cuiva ca `ai-checklist/bad-output`. Un singur tabel de coduri,
și un test peste toate motivele × toate limbile — plus refuzul cazului în care două motive diferite
citesc la fel (un fallback generic trece „are propoziție” și nu spune nimic).

Vezi și „Ascultătorii Firestore”, „Plasele”,
„Feedback_o_functie_un_adevar”.

<a id="feedback-confirmare-legata-de-ce-a-vazut"></a>

## Confirmare = ce a văzut

_O confirmare de siguranță (tăiere în afara foii etc.) se leagă de OBIECTUL arătat omului + amprenta datelor, nu de un boolean; documentul nu se schimbă sub dialog; rezultatele async întârziate se aruncă_

CNCVS2, felia 1.10 (07.10.2026): exportul cerea confirmare când freza iese din foaie. Prima versiune avea bifa ca
`boolean` resetat doar la schimbarea unui câmp al dialogului. Recenzia adversarială (4 lentile + verificatori) a
reprodus în Edge trei ocoliri: Ctrl+Z în spatele dialogului modal schimba desenul, iar cererea nouă (alt loc, altă
latură) venea DEJA bifată; o confirmare cu aceleași patru numere acoperea alt loc al laturii; un rezultat async
întârziat (chunk încărcat la cerere) se afișa după schimbarea parametrilor.

**Why:** consimțământul e pentru ce a văzut omul, nu pentru „da, în general”. Un boolean supraviețuiește schimbării
lucrului confirmat; numerele egale nu înseamnă același traseu.

**How to apply:**
- Bifa = chiar obiectul cererii primit de la calcul (comparat prin identitate); orice cerere nouă vine nebifată.
- Calculul compară și o amprentă a datelor confirmate (traseul), nu doar valorile afișate.
- Cât e deschis dialogul, scurtăturile globale (Delete, Ctrl+Z/Y) nu ating documentul; `window` keydown ignora doar
  `input`/`textarea`, deci `select`, butoanele și `body` treceau.
- Fiecare cerere async are un număr; rezultatul care nu e al ultimei cereri (sau vine după reset/închidere) se aruncă.
- Otrăvurile care SCAPĂ pe cod redundant: scoate codul redundant în loc să-l lași netestat (M-i, M-t în 1.10).

Vezi „Mutații: disciplina”, „Recenzii cu agenți”.

<a id="reference-auth-emulator-capcane"></a>

## Auth emulator: capcane

_Firebase Auth emulator traps — linkWithCredential(password) on the account's own email gives EMAIL_EXISTS; Google widget fields; no-invitation as 404 noise_

Firebase Auth emulator (firebase-tools 15.x), measured on 20.10.2026 in cncvs2 (ADR 0049):

- **`linkWithCredential(EmailAuthProvider.credential(user.email, pwd))` on a Google user fails with `auth/email-already-in-use`** even though the email is the same account's: the emulator's `signUp` (the linking path, with `idToken`) asserts `!getUserByEmail(email)` without excluding the user itself (`lib/emulator/auth/operations.js`). The real backend allows it. Workaround that works in both: on `email-already-in-use`, call `updatePassword(user, pwd)` on the open account (the emulator adds the `password` provider to any user with email + passwordHash, `state.js`), then `reload()` and check `providerData` has `password`. The real-Google path still has to be tried on the test instance.
- **Google sign-in widget** (`widget_ui.js`): `#add-account-button`, `#autogen-button`, `#email-input`, `#display-name-input`, `#sign-in`; it always issues `email_verified: true`.
- **A callable that throws `not-found` logs "Failed to load resource: 404" in the page console**: e2e that assert an empty console then fail. For an expected "nothing found" (e.g. no invitation), return `{ ok: false }` with 200 instead of throwing.
- Admin SDK `generatePasswordResetLink` works on the emulator; the oobCode can be applied with `POST {auth}/identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=…` `{ oobCode, newPassword }`.

Related: „Ascultătorii Firestore”, [sesiunea principală](principala.md).

<a id="reference-esp32-imagine-unica-ci"></a>

## ESP32: imaginea unică în CI

_Imaginea unică ESP32 compilată în CI (PlatformIO + esptool) și scrisă din browser — capcanele găsite la podul ESP3D (cncvs2, 02.11.2026)_

Imaginea ESP32 „de la 0x0”, compilată pe GitHub Actions și scrisă de owner din browser (cncvs2, felia 3.Q, `scripts/pod-esp3d.ts`):

- `pio project metadata -e <env> --json-output` (PlatformIO 6.2.0, pioarduino 51.03.04) dă `extra.flash_images` (bootloader 0x1000, partiții 0x8000, `boot_app0` 0xe000) și `prog_path`, dar **NU `application_offset`**. Platforma ia adresa aplicației din partiția `ota_0` (`_parse_partitions`), deci ia-o tot de acolo, din `partitions.bin` compilat.
- `esptool merge_bin --flash_mode dio --flash_freq 40m --flash_size 4MB` rescrie antetul bootloader-ului (octeții 2–3) și îi reface amprenta SHA-256: compară bootloader-ul din imagine cu fișierul ignorând doar acei octeți și amprenta.
- A doua plasă: `esptool image_info --version 2` scrie `Checksum: 0x.. (valid)` și `Validation hash: … (valid)`.
- esptool-js (<https://espressif.github.io/esptool-js/>) are adresa implicită **0x1000**: pentru imaginea unică, owner-ul trebuie s-o schimbe în 0x0.
- `actions/upload-artifact@v6` e primul major pe node24 (v4 și v5 sunt node20). Artefactul unui repo public cere login pentru descărcare și se păstrează 90 de zile.
- Rețeaua WiFi nu se compilează în imagine dacă repo-ul e public: se pune la prima pornire. Vezi „Execută, nu preda runbook”: compilarea o face CI-ul, owner-ului îi rămâne doar scrierea pe placă.

<a id="reference-ezdxf-entitati-nu-path"></a>

## Ezdxf: entitățile, nu path

_Valorile pe hârtie verificate cu ezdxf se compară cu ENTITĂȚILE exacte, nu cu ezdxf.path (arcele acolo sunt cubice aproximate)_

`ezdxf.path.make_path(e).flattening(tol)` desenează arcele și cercurile din **cubice Bézier aproximate**: punctele lui se abat
de la cerc cu ~2,7e-4 × r (R25 → 0,007 mm), deci o verificare la 1e-6 cade fără vină (cncvs2, felia 9.3↑, 28.10.2026).

Pentru o verificare încrucișată exactă, în generatorul de corpus:
- CIRCLE / ARC: `e.ocs().to_wcs(e.dxf.center)`, `e.dxf.radius`, unghiurile; capetele prin OCS → WCS;
- ELLIPSE: `e.construction_tool().vertices(parametri)` (puncte exacte, WCS);
- SPLINE: `e.construction_tool().point(t)` pe domeniul [U_p, U_{m−p}];
- INSERT / LWPOLYLINE / POLYLINE: `virtual_entities()` (blocul desfăcut, cu matricea și OCS-ul), apoi ca mai sus; MINSERT: `multi_insert()`.

Tot acolo: `ezdxf` (1.4.4) n-are `add_closed_spline`; spline-ul periodic e `msp.add_spline()` + `set_closed(puncte 3D, degree)`
(noduri uniforme, neprinse). Cu `python -I`, `PYTHONIOENCODING` e ignorat: `-X utf8` pentru diacritice. Vezi „Autoconsistența”.

<a id="reference-fonttools-variabile-capcane"></a>

## FontTools: fonturi variabile

_Oracol fontTools pe fonturi variabile (cncvs2 7.4↑, 31.10.2026) - normalizarea, instancer pe CFF2, flags componente, GPOS PairSet, HVAR vs fantoma_

Găsite pe 31.10.2026 la felia 7.4↑ din cncvs2 (ADR 0113), cu fontTools 4.67, când oracolul compară un cititor propriu de
fonturi variabile cu fontTools:

- **Normalizarea:** instancer-ul (`AxisLimits(...).limitAxesAndPopulateDefaults(f).normalize(f)`) rotunjește la F2Dot14 o
  singură dată, DUPĂ `avar`; `TTFont.normalizeLocation` NU rotunjește deloc. Pentru un oracol comparabil la 1e-9, ia
  coordonatele din instancer și dă-le pen-ului cu `getGlyphSet(location=norm, normalized=True)`.
- **Instancer-ul nu rotunjește în memorie:** `instantiateVariableFont` cu toate axele fixate lasă coordonatele glifelor (și
  deplasările componentelor) în virgulă mobilă cât fontul nu e salvat; avansul îl rotunjește (`otRound(dreapta − stânga)` din
  punctele fantomă, IGNORÂND `HVAR` la instanțierea completă), crenarea și MVAR la fel (`otRound(delta)`).
- **HVAR ≠ puncte fantomă** cu 1 unitate la câteva glife (Roboto Flex: 4 din 1 672 glifă × loc): oracolul avansului din HVAR
  e `VarStoreInstancer`, nu instancer-ul.
- **Instancer-ul cade pe CFF2** când Private-ul unui FD alege `vsindex` ≠ 0 (ValueError în specializator); pen-ul îl desenează
  corect. Ocolire: contururile din pen, metricile din fontul neinstanțiat (dacă n-are HVAR/MVAR/GPOS).
- **`GlyphComponent.flags` nu ține `ARGS_ARE_XY_VALUES`** (fontTools păstrează doar steagurile semantice): componenta e pusă
  pe puncte dacă are atributul `firstPt`, nu după steag. Un subset cu `glyph_names` implicit redenumește glifele (`post` 3):
  ia numele din `cmap` și din componentele fontului RECITIT.
- **GPOS PairPos formatul 1:** offsetul dispozitivului (`XAdvDevice`) e de la începutul PairSet-ului, nu al subtabelului
  (formatul 2: de la subtabel). Greșit, crenarea nu variază deloc.
- **Transformarea 2 × 2 a unei componente** se scrie ca F2Dot14: o probă pe hârtie trebuie să folosească 0,9 → 14 746 / 16 384.
- Fonturi variabile libere pe mașina asta: Roboto Flex, Roboto (variabil), Noto CJK (CFF2), Dancing Script, în
  `C:\Program Files\Android\Android Studio\plugins\design-tools\resources\layoutlib\data\fonts\` (OFL). Cascadia din Windows
  NU e OFL (licența Microsoft); fonturile Adobe „VariableConcept” din Illustrator, nici ele.

Legat: „Autoconsistența”, „Mutații: disciplina”, [sesiunea principală](principala.md).

<a id="reference-playwright-capcane"></a>

## Playwright: capcane

_Playwright: opțiunea în slotul greșit e ignorată tăcut; addScriptTag/evaluate ocolesc CSP-ul; refuzurile CSP dintr-un cadru nu vin pe `console`; transpilerul strică clasele cu câmpuri; `worker` nu vine cât scriptul e ținut_

Unite pe 31.10.2026 la compactarea indexului (fiecare secțiune e fostul fișier, cu textul lui).

#### Opțiunea în slotul greșit

CNCVS, 20.09.2026, `scripts/screens/run.mjs`: `page.waitForFunction(fn, { timeout: 60000 })` — de la
nașterea fișierului (15.08). Semnătura Playwright e `waitForFunction(fn, arg, options)`, deci obiectul
ajungea ca `arg` al funcției din pagină și timeout-ul REAL era cel implicit, 30 s, în toate cele trei
locuri. Registrul spunea „expiră la 30 s"; mesajul meu de eroare, scris de mână, spunea „după 60 s".
Playwright, în aceeași linie, spunea `Timeout 30000ms`. Numai instrumentul avea dreptate.

**Why:** o opțiune într-un slot greșit nu dă eroare (JS nu verifică forma argumentelor), deci constanta
din cod e o INTENȚIE, nu o setare în vigoare. Iar un mesaj care copiază constanta e aceeași presupunere
scrisă de două ori — „O_functie_un_adevar”, „Green_gate_is_not_evidence”.

**How to apply:**
- La orice API cu `(fn, arg, options)` (Playwright `waitForFunction`, `evaluate`), verifică slotul;
  proba ieftină: otrăvește cu un timeout de 1 ms și vezi dacă pică IMEDIAT.
- Un mesaj de eroare ia cifrele din eroarea instrumentului (regex pe `Timeout (\d+)ms`) sau nu le
  spune deloc — niciodată dintr-o constantă locală.
- Când două surse dau cifre diferite (30 vs 60), NU alege — explică diferența înainte de verdict.

#### Playwright ocolește CSP-ul

Măsurat pe CNCVS, 25.09.2026: pe o pagină cu `<meta http-equiv="Content-Security-Policy" content="script-src 'self' 'unsafe-inline'">`,
`new Function(...)` era BLOCAT într-un `<script>` al paginii, dar PERMIS în codul injectat cu
`page.addScriptTag({ content })` și în `page.evaluate`. Primul banc de cost pentru `pixi.js/unsafe-eval` a
ieșit deci „Pixi merge și fără polifil sub CSP" — fals: cu bundle-ul servit ca `/app.js` prin
`page.route` + `<script src>`, Pixi aruncă „does not allow unsafe-eval".

**Why:** Playwright injectează prin CDP, iar CSP-ul documentului nu se aplică la fel acolo. Un control
pozitiv lipsă („eval chiar e blocat aici?") ar fi transformat verdictul într-o afirmație falsă despre produs.

**How to apply:** orice probă de CSP (sau de altă politică a documentului) încarcă codul aplicației ca
FIȘIER servit (`dist/` prin `vite preview`, sau `page.route` + `<script src>`), niciodată prin
`addScriptTag({content})`/`evaluate`. Și primul check al probei e controlul: „în contextul ăsta, eval /
un script inline nehash-uit CHIAR e blocat". Vezi „Semnal ≠ măsurătoare”.

#### Transpilerul și workerele

Găsite pe 19.10.2026 în cncvs2 (felia simulării, ADR 0047):

- **Transpilerul Playwright** (procesul în care rulează spec-urile `.ts`) schimbă semantica câmpurilor de clasă: CAM-ul
  aplicației (offsetul cavalier) cade cu „Cannot set property vertexCount of #<Polyline> which has only a getter”. Codul
  care trece prin CAM nu se importă în spec: rulează într-un proces Node obișnuit (`execFileSync(process.execPath,
  ['test/e2e/simulare-node.ts'], { input })`), care scoate tipurile nativ. Nucleele fără clase (src/sim) merg importate direct.
- **`page.on('worker')`** nu se declanșează cât scriptul unui worker dedicat e ținut de `page.route` (scriptul n-a venit).
  Ca să numeri pornirile / opririle workerelor (de exemplu „dialogul închis oprește simularea”), instrumentează în pagină
  cu `page.addInitScript`: o subclasă a `window.Worker` care numără constructorul și `terminate()` (filtrează după URL: și
  pânza are un worker). `page.route` interceptează cererea scriptului workerului (ținere, `abort()`).
- O configurație Playwright pusă în afara repo-ului nu găsește `@playwright/test`: pune-o într-un dosar ignorat din clonă
  (`.tmp/`).

Legat: „Feedback_playwright_csp_ocolit”, „Shell: capcane”.

#### Portul unui worktree stă în TREI locuri (02.11.2026, cncvs2, felia 6.T↑)

Copia `.tmp/pw.config.ts` a unui worktree cu alt port decât 4173 trebuie să schimbe `webServer.command` (`--port N`),
`webServer.url` ȘI `use.baseURL`. Cu doar comanda schimbată, serverul pornea pe 4177, dar Playwright sonda tot 4173 și cădea
după 60 s cu „Timed out waiting 60000ms from config.webServer”, fără altă vină pe ecran. Cauza la mine: `Write` pe copia
necitită a eșuat („File has not been read yet”), iar un `sed` doar pe port a lăsat restul. Diagnosticul ieftin:
`DEBUG=pw:webserver`, care arată adresa sondată. Șablonul bun e în worktree-ul textului (`cncvs2-lucru\text\.tmp\pw.config.ts`).
Rămâne și o aserțiune legată de port: `raportor.spec.ts:101` cere `http://localhost:4173/` (pică pe orice alt port).

**Gărzile tastelor se probează cu focusul pe pagină** (02.11, cncvs2, felia 13.A↑): modulul editării ascultă tastele doar cu
ținta pe `body` sau pe pânză. O probă care apasă tastele după un clic pe o filă (focusul pe buton) nu-i pune garda la
încercare: otrava care o scotea a scăpat. Clic pe un loc fără focus (un titlu), apoi `document.activeElement === body`, apoi
tastele. Vezi „Mutații: disciplina”.

**`route.fulfill` ocolește CORS-ul** (cvs2, extensiile, 02.11.2026): un răspuns servit de Playwright fără
`Access-Control-Allow-Origin` ajunge totuși la `fetch`-ul paginii, deci „gazda fără CORS” nu se poate imita așa. Calea de
eșec a lui `fetch` (aceeași respingere ca un CORS refuzat) se probează cu `route.abort('failed')`; CORS-ul adevărat, doar pe
o gazdă reală.

#### Refuzurile CSP nu vin pe `page.on('console')` (cvs2, felia 3.Tb, 03.11.2026)

Un colector `page.on('console')` cu `/Refused to apply inline style/` a văzut **0** refuzuri într-un cadru cu sandbox
(`srcdoc`, origine opacă), deși sursele aveau încă zeci de atribute `style` refuzate: proba „consola curată” ar fi trecut
oricum. Merge evenimentul `securitypolicyviolation`, ascultat chiar în cadru: `page.addInitScript` (rulează în fiecare
cadru, înaintea scripturilor lui, ocolind CSP-ul) pune ascultătorul pe `document` și strânge `violatedDirective` +
`sample`/`blockedURI` într-o globală, citită apoi cu `(await page.locator('iframe').elementHandle()).contentFrame().evaluate`.
Cadrul `srcdoc` are `url() === ''` (nu `about:srcdoc`). Martorul pe sursele vechi trebuie să vadă refuzuri înainte de
verdict („Semnal ≠ măsurătoare”).

#### `serviceWorkers: 'block'` aruncă în cadrele cu sandbox (cvs2, 3.Xc / 3.Tb, 03.11.2026)

Ca să blocheze workerul, Playwright pune în FIECARE cadru `if (navigator.serviceWorker) navigator.serviceWorker.register = …`.
Într-un iframe cu `sandbox` fără `allow-same-origin`, chiar citirea `navigator.serviceWorker` aruncă `SecurityError`. Când
scriptul lui rulează după ascultătorul de erori al paginii din cadru, eroarea intră în jurnalul aplicației: probele picau RAR,
cu „1 eroare în jurnalul local”, fără nicio vină a codului. Dovada: aceeași deschidere cu `serviceWorkers: 'block'` dă 1
eroare, cu `'allow'` dă 0. Intrarea se recunoaște după mesaj și stiva doar din `<anonymous>` (o eroare a codului din cadru
are în stivă adresa lui, `blob:`). Un ajutor al probei care arată intrările jurnalului la eșec (nu doar numărul) a prins-o.

#### O tastă a browserului nu se probează prin adresă; o reîncărcare așteaptă salvarea (cvs2, 7.9↑b, 07.11.2026)

- **Alt + ← (înapoi în istoric)** în Edge fără fereastră nu navighează nici când pagina NU oprește tasta: „adresa rămâne”
  trece și fără `preventDefault`. Proba care prinde otrava: o apăsare trimisă de pagină, cu
  `!el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', altKey: true, bubbles: true, cancelable: true }))`
  (React o tratează ca pe una adevărată, deci acțiunea ei se vede și ea).
- **`waitForTimeout(300)` + `reload()` după o schimbare** pierdea, sub încărcarea altor sesiuni, scrierea asincronă în
  IndexedDB (reîncărcarea o oprea): proba riglelor cădea și pe `main`. Proba citește din pagină ultima versiune salvată și
  reîncarcă abia când schimbarea e acolo (`expect.poll`), ca `documentSalvat` din `text.spec.ts` (`a489450`).
- Sub CPU ocupat de alte sesiuni (emulatoare, 79 %), prima așteptare după `goto` (un element al modulului editării, adus
  după prima randare) trece uneori de 5 s: căderi pe teste diferite la fiecare rulare, trecute la reluare. Întâi A/B pe
  `main` (clona otrăvurilor) și harta bucăților (aceleași nume = aceeași încărcare), abia apoi „încărcarea”.

#### setInputFiles ține firul paginii

cncvs2, 07.11.2026 (trasarea, sonda sosirii): `setInputFiles` cu un fișier de câțiva MB (o poză de 4 MB) trece octeții prin
base64 și îi decodează în pagină: un cadru lung de ~0,3 s (LoAF fără scripturi ale aplicației; profilul CPU îl pune pe
scriptul injectat de Playwright, cu `atob`). Arăta ca un gol al aplicației la alegerea fișierului.
**How to apply:** într-o probă de timp, fișierul se face în pagină (`OffscreenCanvas.convertToBlob`) și se pune cu
`DataTransfer` (`input.files = dt.files`, apoi `change` cu `bubbles`); înainte, `waitFor({ state: 'attached' })` pe intrare
(`goto` se întoarce la load, înaintea primei randări React). Golurile se atribuie cu un profil CPU prin CDP
(`Profiler.start`), nu ghicind; panoul aplicației ascuns = fila în fundal, deci timpii se măsoară în Edge fără fereastră.

#### O aserție de după o schimbare poate trece pe textul VECHI (cvs2, 25.3↑c, 16.11.2026)

Proba refuzului „doar puncte” pe culori trecea și cu otrava F06 (mesajul greșit pe culori): imediat după `selectOption`,
pe ecran era încă refuzul de la alb-negru, cu ACELAȘI text, iar `toHaveText` se mulțumea cu el cât se trasa pe culori.
**How to apply:** când starea nouă și cea veche pot arăta la fel, aștept întâi un semn care există DOAR în răspunsul nou
(aici, pastilele cu fundalul), apoi citesc textul. O otravă scăpată pe o probă care „ar trebui” s-o prindă = probă din
cursă, nu otravă echivalentă.

#### Clicul sub un conținut care încă crește (cncvs2, 17.11.2026)

`locator.click()` derulează ținta în vedere, așteaptă două cadre cu aceeași cutie, verifică ținta din punct, apoi trimite mausul: mai multe drumuri dus-întors, între care pagina își rulează sarcinile. Dacă deasupra țintei se adaugă conținut între verificare și trimitere, clicul cade pe ce a venit în locul ei, iar proba trece mai departe ca și cum ar fi apăsat. Cazul: `trenulet.spec.ts:77`, foaia exportului extensiei se așază în pași (plăcile într-un `setTimeout`, apoi timpul fiecărui fișier G-code, câte unul pe sarcină, la urmă rândurile „Timp de lucru…”, deasupra plăcilor); clicul pe rezumatul `<details>` de dedesubt a căzut cu 29 px mai sus, pe foaie, iar butonul din el a stat „not visible” 30 s. Doar în completul de pe Linux, o dată în 9 rulări. **How to apply:** înainte de un clic pe ceva aflat SUB un conținut care se completează asincron, aștept semnul ultimului pas (aici `#cnc-timp` cu „Timp de lucru”), nu doar vizibilitatea țintei. Reproducerea deterministă: țin pe loc temporizatorul ultimului pas (înlocuiesc `window.setTimeout` pentru întârzierea lui), măsor cutia, eliberez, apoi `page.mouse.click` în vechiul loc; contraproba: după semn, cutia nu se mai mișcă (2 s). Simptomul de recunoscut: „element is not visible” pe un copil al unui `<details>` pe care proba tocmai l-a „deschis”.

#### Câmpul `type="search"` se golește singur la Escape; proba care acționează înaintea stării de pornire (cncvs2, 3.Tp↑a, 21.11.2026)

- În Chromium (Edge), Escape într-un `<input type="search">` nevid golește câmpul și trimite `input`, fără niciun cod. Un
  handler propriu de Escape e deci un mutant echivalent (otrava lui, „Esc” în loc de „Escape”, a scăpat): codul a ieșit,
  iar proba lui Escape a rămas. La fel butonul × al câmpului.
- O probă care tastează imediat după ce deschide partea 3D (`intra()` așteaptă încă three.js) lucrează pe o pagină care
  nu-și arătase starea de pornire (galeria familiei): o otravă pe cache-ul acelei stări a scăpat, fiindcă starea nu se
  formase niciodată. **How to apply:** ajutorul de deschidere al probei așteaptă starea de pornire vizibilă (aici, piesa
  de acum apăsată în galerie) înainte de prima acțiune; o otravă scăpată pe un cache se verifică întâi pe ORDINEA probei.

#### Un SVG decorativ în buton nu schimbă numele lui: „ascuns” se probează pe atribut (cncvs2, 3.Tp↑b, 22.11.2026)

- Un `<svg>` fără `<title>` nu adaugă nimic numelui accesibil: fără `aria-hidden="true"`, `getByRole('button', { name })`
  găsește butonul la fel, deci proba pe nume NU prinde pierderea ascunderii. **How to apply:** proba cere atributul
  (`aria-hidden` = "true") pe pictogramă, iar numele butonului separat. La fel, `:first-child` în CSS ignoră nodurile de
  text: „pictograma înaintea numelui” se probează cu `buton.firstChild === svg`, nu cu un selector.

<a id="reference-ts-instanceof-structural"></a>

## TS: clasele după formă

_TypeScript compară clasele după formă: două clase cu aceleași câmpuri publice se confundă la `instanceof` și în `Exclude`; un câmp `declare private` le face nominale_

În TypeScript, o clasă e un tip structural: `class Nume { v: string; literal: boolean }` e asignabilă lui
`class Comentariu { v: string }`. Consecințele, văzute în cititorul EPS din cncvs2 (felia 9.5↑, 31.10.2026):
- `Exclude<Jeton, Comentariu>` a scos din uniune și `Nume`, și `NumeImediat` (au și ele un `v`); compilatorul a cerut apoi un
  tip pe care codul nu-l mai avea;
- îngustarea cu `instanceof` merge pe aceeași regulă: în ramura falsă a lui `x instanceof Operator` (doar `v`), TypeScript
  poate scoate și `Nume` din tip, deși la rulare `instanceof` e nominal. Codul rulează corect, iar tipurile mint.

**Cum se aplică:** clasele-valoare care se deosebesc prin `instanceof` primesc un câmp privat declarat, șters la rulare (merge
și sub `erasableSyntaxOnly` și în Node, cu tipurile scoase): `declare private readonly _fel: 'nume';`. Un membru privat face
clasa nominală. Parametrii se scriu ca uniune explicită, nu cu `Exclude` pe clase.

<a id="reference-v8-regex-text-mare"></a>

## V8: regex pe text mare

_V8: o expresie cu un grup repetat (`(?:[A-Za-z0-9+/]{4})*`, base64) cade cu „Maximum call stack size exceeded” pe texte mari (trece la 4 MB, cade la 8 MB); validarea unui base64 mare = decodare + recodare_

Măsurat pe 07.11.2026 (cncvs2, felia 15.B↑b, Node 26): `RE_BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/`
din `shared/poza.ts` trece pe 4 MB de text și aruncă `RangeError: Maximum call stack size exceeded` pe 8 MB (motorul de
backtracking ține o intrare pe fiecare repetare a grupului). Pentru poza de 400 kB (546 kB în base64) e în siguranță; pentru
un fișier de 10 MB (14 MB în base64), nu.

**How to apply:**
- un text mare (peste ~1 MB) nu se validează cu o expresie cu grup repetat; base64 strict = `Buffer.from(p, 'base64')` și
  `o.toString('base64') === p` (decodarea ignoră caracterele străine, recodarea le prinde, iar umplutura lipsă iese diferit);
- pune plafonul de lungime ÎNAINTEA expresiei, ca la poză: o cerere uriașă nu ajunge la ea;
- un throw de stivă dintr-un validator prins de un `catch` larg arată ca „date greșite”, nu ca un defect al validatorului.

Legat: „Shell: capcane”, [sesiunea principală](principala.md).

<a id="feedback-owner-testeaza-pe-test"></a>

## Owner testează pe test

_Andrei încearcă orice pe instanța de test din Firebase, după un link — nu din fișiere locale sau cu Notepad; canal de previzualizare când adresa principală de test e încă ocupată_

Andrei, 07.10.2026, în cncvs2: „Aveam impresia ca o sa testam pe instanta de test din firebase. Aici:
https://cncvectorstudio-test.firebaseapp.com/”. Îi cerusem să deschidă un HTML local (prototipul A / D) și să caute
în G-code cu Notepad.

**Why:** pe toate proiectele, el lucrează așa: test liber, live cu confirmare („Sync workflow”,
„Două instanțe”). Un fișier local nu se deschide de pe alt dispozitiv și nu e „instanța”.

**How to apply:**
- Orice îi dau să încerce merge întâi pe instanța de test și primește un **link**, verificat de mine în browser
  înainte să i-l dau.
- Dacă adresa principală de test nu trebuie încă atinsă, folosește un canal de previzualizare. Exemplu: cncvs2 înainte
  de etapa 1, unde adresa principală servește aplicația veche până la exportul Firestore confirmat.
  - Comanda: `firebase hosting:channel:deploy <canal> --project test --expires 30d`.
  - Se rulează dintr-un dosar temporar, cu `firebase.json` și cu `.firebaserc` (`test` → proiectul de test).
- După deploy, verifică:
  - adresa principală e neschimbată (același Etag);
  - pagina se încarcă fără erori în consolă.
- **cncvs2: un canal nu poate proba nimic care trece printr-un callable.** Toate au `enforceAppCheck: true`, iar domeniul
  canalului nu e în cheia reCAPTCHA (ADR 0043). Asta include raportările, contul și acțiunile din /admin. Pe canal se vede
  doar interfața fără server; pentru rest, testul vine după unirea în `main` și publicarea funcțiilor (15.B↑b, 07.11.2026).
- **Garda de deploy NU prinde `hosting:channel:deploy` și nici `hosting:clone`.** Regexul ei cere `firebase deploy`.
  Deci `--project test` explicit e disciplina ta, nu a gărzii („Deploy guard = HOOK”).

<a id="feedback-segmentare-plan-mic"></a>

## Segmentează (plan mic)

_Owner pe un plan cu usage mai mic (din 15.10.2026) — segmentează taskurile: bucăți mici, oprire și raport la fiecare punct firesc, înainte de următoarea_

Owner (15.10.2026, la mijlocul unei sesiuni „în forță”): „deocamdata folosim un plan cu usage mai mic, asa ca vreau sa
segmentezi mai mult taskurile deocamdata”.

**Why:** limita de 5 ore s-a umplut repede (74 % după un val de 12 agenți + reparații inline); planul nou are mai puțin.

**How to apply:**
- un segment = o singură unitate verificabilă (o felie mică, o integrare, o recenzie), cu commit + raport, apoi STOP și
  aștept „continua”; nu înlănțui singur mai multe valuri de agenți;
- la fiecare raport: ce urmează, în segmente, cu costul estimat al fiecăruia (agenți = ~0,5–1 M fiecare; inline ~1 %);
- citește `get_usage` (fereastra de 5 ore, nu doar cea săptămânală) înainte de un segment cu agenți;
- „deocamdată”: regula ține până spune altfel. Legat de „Recenzii cu agenți”.

**16.10.2026, relaxat:** „vad ca usage-ul nu se consuma periculos de repede. poti sa faci mai multe lucruri in acest pas”
(săptămânalul la 90 %, ~1 % pe segment fără agenți). De acum un pas poate cuprinde o sub-felie întreagă (mai multe
segmente: cod, teste, publicare), tot cu commit-uri pe părți, raport și STOP la capătul pasului; agenții rămân cu acordul
și costul spus.

**16.10.2026, seara (sesiunea de pornire a etapei 3):** „Lucrăm în pași mari, cu commit, publicare pe test și raport la
fiecare. Agenții doar cu acordul meu și cu costul spus înainte.” Un pas = o felie întreagă (contract, cod, teste,
publicare), cu raport și STOP la capăt.

<a id="feedback-toate-optiunile"></a>

## Toate opțiunile

_Owner: la variantele propuse care pot sta împreună în aplicație, le vrea pe toate, ca opțiuni (nu una aleasă); doar alegerile care se exclud rămân întrebări_

Owner-ul, 07.11.2026, la cele cinci întrebări ale ADR 0191 (piesele plate, cvs2): „ca de obicei, vreau cat mai multe optiuni,
asa ca, vreau sa le faci pe toate cele care pot functiona ca optiuni diferite si pot fi disponibile in soft”. „Ca de obicei”:
e o preferință a lui, nu un răspuns izolat.

**Why:** cvs2 e un produs cu clienți diferiți; owner-ul preferă ca fiecare să-și aleagă din aplicație, nu să decidă el o dată
pentru toți.

**How to apply:** într-un ADR cu întrebări, spune pentru fiecare alternativă dacă poate sta lângă celelalte ca opțiune (un
comutator, o listă, „Simplu” / „Avansat”, încă o intrare). Planul implicit le face pe toate, împărțite pe felii (recomandarea
devine opțiunea implicită și prima felie); întrebare reală rămâne doar ce se exclude (o arhitectură, un buget, o schemă). Vezi
[Imprimanta 3D (K1C)](imprimanta.md) și [„Segmentează (plan mic)”](#feedback-segmentare-plan-mic).

<a id="feedback-ui-conventional"></a>

## UI convențional

_Owner-ul vrea tipare de interfață convenționale (meniul contului derulant, cu ajutorul în el), nu ferestre care așteaptă serverul la clic_

La butonul Cont care deschidea o fereastră rămasă pe „Opening the account…”, owner-ul (cncvs2, 02.11.2026): „ar trebui sa fie un meniu mai conventional pentru account area” și „trebuie sa pui acolo si manualul si sugestiile”; la schița vizuală, „Da, fă-l” (ADR 0120).

**Why:** un clic care deschide o fereastră ce așteaptă serverul pare stricat; tiparele cunoscute (meniul contului cu numele, planul, ajutorul și ieșirea) nu cer explicații.

**How to apply:**
- zona contului = meniu derulant sub buton, cu capul din starea ținută local (fără server la deschidere); ajutorul (manualul, sugestiile) stă în el; serverul îl întreabă doar panoul detaliat;
- înainte de un UI nou, pornește de la tiparul convențional; la deciziile de aspect, o schiță vizuală înainte de cod (vizualul e un loc de oprire: „Execută, nu preda runbook”).

<a id="reference-clasificator-scrieri-cloud"></a>

## Clasificatorul și scrierile cloud

_Ce scrieri în proiectele Google Cloud / Firebase (cu acreditările firebase-tools) și pe GitHub trec și ce refuză clasificatorul automat; ștergerea ramurilor de pe origin = refuzată; lansarea unui Workflow cu agenți = refuzată (19.11, de două ori, și 21.11)_

Cu acreditările CLI (`firebase-tools` apiv2, scripturi în scratchpad), clasificatorul modului auto:
- **a lăsat:** publicările (hosting, funcții, reguli, indecși), pornirea unui API (`serviceusage …:enable`), crearea unei
  chei reCAPTCHA Enterprise (17.10, `cncvectorstudio-test`), scrierea amprentei `meta/deployment` (Firestore REST PATCH,
  din `scripts/publica.ts`, 18.10), toate citirile GET;
- **a refuzat:** pornirea forțată a unui job Cloud Scheduler (16.10) și înregistrarea cheii ca furnizor App Check
  (`PATCH …/recaptchaEnterpriseConfig`, 17.10). Fără explicație.
- **GitHub (04.11):** `git push origin main` trece; ștergerea ramurilor de pe origin (`git push origin --delete …`) e
  refuzată, chiar cu acordul owner-ului dat în chat pentru curățenie. Comanda întreagă (cu `git -C <repo>`) merge la owner.
- **Workflow (19.11):** lansarea unui Workflow de recenzie cu agenți a fost refuzată („Destructive or Unwanted Actions”), deși
  Ultracode era pornit și owner-ul invocase `/workflow-authoring`. Nu ocoli refuzul cu Agent. Spune-i owner-ului: poate
  adăuga o regulă de permisiune pentru Workflow sau poate porni el recenzia (cu costul spus înainte). A doua oară în aceeași
  zi (3.Tm, seara, „Undermining Oversight”), cu mesajul de sistem „Ultracode is on” abia sosit: tot refuzat. Recenzia o fac
  singur, pe dimensiuni, și o spun în raport. A treia oară, 21.11 (3.To, înaintea unirii), cu „Ultracode is on” și
  `/workflow-authoring` invocat: „Undermining Oversight”. Ultracode NU deblochează Workflow-ul; doar o regulă de permisiune
  pusă de owner în setări. Recenzia proprie a găsit atunci un bug real (montajul șenilei).

**Cum aplici:** pașii de configurare a securității (App Check, joburi forțate, IAM) se dau owner-ului de la început, cu
link-ul din consolă și valoarea de lipit, în loc să-i încerci și să te oprești la jumătate. Nu ocoli refuzul. Vezi
„Execută, nu preda runbook”, [sesiunea principală](principala.md).

Starea din 17.10: live (`cncvectorstudio`) are cheia „Cheie Appcheck CVS”, înregistrată în App Check (Storage impus).
Pe test, cheia „App Check cncvs2 (test)” creată de asistent, înregistrată în App Check de owner în consolă tot pe 17.10
(serviciile rămân neimpuse; callable-urile își cer singure App Check).

## Pe scurt: lecțiile ținute doar în memoria locală

_Lecțiile de mai jos s-au născut în alte proiecte ale owner-ului, deci textul lor întreg nu intră aici; rămâne rândul lor scurt, care e general._

- **Semnal ≠ măsurătoare:** suspectează instrumentul
- **Măsoară, reproductibil:** „36 %” era 23,5 %; comparații cu aceleași flag-uri
- **Autoconsistența:** ancorează cu o valoare pe hârtie; convenția fizică se DERIVĂ
- **Plasele:** a doua plasă, nu plasa mai largă; mausul ține viu un `:hover`
- **Ordinea modulelor:** pe `lib/` cu `require`; vitest ridică importurile
- **Porți și CI:** roșu permanent = orb; `complet.yml` de mână; verdele pe Windows ≠ Linux; proba pe ceas: cea mai bună din 3; unirea + decizia = UN push
- **Proba unde e bugul:** fus/limbă/platformă; Suspense/lazy pe CLIENT; fixturi cu ceas
- **Mutații: disciplina:** VOID fără aplicare; `cmp` față de HEAD; clonă în afara Drive; `lot 0 N` exclusiv; mutantul mai bun = scoate codul
- **Listă decodată + sloturi:** pagina de N NU mărginește memoria; `slice` ține părintele
- **Proba pe ce se ADUCE:** spionează `Query.get`, nu `data()`; „nu scrie” = spion pe `update`
- **Cotă pe proprietar:** cota pe cine POATE scrie
- **Controale și plafoane:** `<=` vid; control = implicitul
- **Contorul numără cererea:** ramura de eșec are contorul EI; „nimic altceva” = poartă
- **Starea purtată cere lumea care o repară:** salvare implicită doar unde se poate reface
- **Invariante, perechi:** incluziunea ≠ egalitatea (AMBELE direcții); mecanica = 2 rulări care diferă
- **Cod: un adevăr:** o funcție, un fapt; reset structural
- **Minim peste coci:** citește DUPĂ NUME
- **Rularea nu repară geometria:** DETERMINIST
- **Bancul de probă:** UI cu login: codul REAL, app întreagă; montarea (#310); `undefined` sosește `null`
- **Reguli: emulator, publicate:** JDK 21, `npm run test:rules`; ce e PUBLICAT
- **Storage emulator: TEMP comun:** șterge dosarul la oprire; TEMP per rulare
- **Reguli: capcane:** documentul REZULTAT; `resource` cu `.get(c,null)`; `get(c, implicit)` în READ
- **Index lipsă ARUNCĂ:** probează forma pe live
- **`undefined` refuzat:** omoară TĂCUT sincronizarea
- **Ascultătorii Firestore:** refuz = „nimic încă”; server = `!fromCache && !hasPendingWrites`
- **Tranzacția reluată:** răspuns pierdut = callback reluat; tokenul ÎN AFARA lui
- **Emulator: `admin.firestore`:** intrarea modulară; `bind` pe modulul principal
- **Storage `read`/`write`:** read=get+LIST, write=…+DELETE
- **Permisiuni îmbătrânesc:** stochează EXCEPȚIA
- **Back vs Escape:** stivă vs istoric
- **Contrast de temă:** textul se DERIVĂ
- **Hit-test:** ocluzia cu `elementFromPoint`; pe telefon, un rând pe buton (pastilele strânse nu depășesc)
- **Firebase: publicare:** anteturile Hosting pe calea cererii; proba e `deploy --dry-run`; Functions: `ignore`
- **Firestore stream părăsit devreme:** NU închide RunQuery; pagini `get`+`startAfter`
- **Listare Storage + simulări:** `maxResults` = UN apel; `unauthenticated` = și App Check
- **PWA: push, cache, QR:** SW afișează `notification`; `caches.open` creează; `{ QRCode }`; FCM `invalid-argument`
- **React: capcane:** selector Zustand cu []/{} nou → buclă; setState din ascultător nativ; `lazy`; `inert`; text local + efect după Enter; `<select>` fără valoare arată PRIMA opțiune
- **Vite: pornirea:** `import()` eșuat ținut; Safari: „not a valid JavaScript MIME type”; CSS comun = `.js` inexistent
- **DEVLOG:** Started/Completed, prompt exact + model
- **Liste pentru Andrei:** OWNER_VERIFY; „Pașii tăi” cu LINK-uri; decizia = implicitul ÎN FAȚĂ
- **Observabilitate (TOATE):** erorile în fiecare aplicație; joburile cu marcaj; costul AI per apel
- **Recenzii cu agenți:** bugetul ÎNAINTE; remedierea se VERIFICĂ; `get_usage`
- **Reia de la capăt:** după pauză REFACI raționamentul
- **Shell: capcane:** Git Bash: `npx.cmd`; backtick-uri și heredoc → `Write` + fișier; CRLF; `python -B -X utf8`; `TaskStop` lasă copiii (`taskkill /T`); `.ps1` doar ASCII
