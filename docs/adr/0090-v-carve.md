# ADR 0090: V-carve-ul

**Starea:** acceptat pe 27.10.2026. Felia 8.1↑, adusă din etapa 8 în etapa 3, fără mașină, la cererea owner-ului („continua cu
ce era in ordine”: găurirea, V-carve-ul, exportul 2D; exportul 2D a trecut înainte, fiind mai repede). **Rândul din prag:**
„V-carve (inclusiv cu freză dreaptă pentru fund plat)” (`ACOPERIRE-ARTCAM-DESKPROTO.md`), acum **în lucru**: aici V-carve-ul
cu freza în V; fundul plat cu freza dreaptă e felia următoare (8.2↑). **Urmează:** `PLAN.md` T7 și sonda s3 (`docs/faza2/`).
**Documentul:** v14.

**Problema.** Literele, ornamentele și logo-urile se gravează cu o freză în V: pereții înclinați urmează conturul, iar colțurile
ascuțite rămân ascuțite, ceea ce o freză plată pe profil sau în buzunar nu poate face. Până acum, aplicația nu știa forma frezei
(orice freză era plată) și nu avea operația.

## Decizia

**1. Freza are o formă.** `scula.forma?: { tip: 'v', unghi }` pe operație, cu unghiul inclus al vârfului în [1°, 179°]; lipsă =
plată, ca până acum. Diametrul e al părții tăietoare. Forma trece în IR (`Scula.forma`), ca simularea și postul s-o vadă. În
fereastra exportului, freza fiecărui rând are și forma (plată / în V) și, la V, unghiul (implicit 60°); același T cu două
diametre sau două forme e un conflict, cu motivul (ADR 0084), și în fereastră, și în lucrare (un document salvat nu trece
prin fereastră, iar schimbarea frezei se decide doar după număr).

**2. Operația.** Încă un fel, `tip: 'vcarve'`, pe contururi închise: latura `interior`, nimic din profil (urechi, rampă,
intrări, degajări, despărțire). Contururile unei operații dintr-o instanță sunt **o singură regiune, citită par-impar** (un
„O” e inelul dintre cele două contururi), tăiată odată, la prima ei tăietură, cu o etichetă. Ca buzunarul și găurirea, nu e
inel al regiunii păstrate (scoate material doar înăuntrul ei).

**3. Axa medială** (`src/cam/axaMediala.ts`), după T7 și s3, candidatul (a):
- eșantioane pe contur la cel mult h = 0,02 mm (`PAS_ESANTIOANE`, uniform), puncte exacte pe linii, arce și cubice;
- triangularea Delaunay a eșantioanelor (`delaunator` 5.1.0, ISC), apoi **legalizarea pe stivă** cu predicatele robuste
  (`robust-predicates` 3.0.3, Unlicense): aruncă dacă nu converge (s3: legalizarea pe treceri ieșea tăcut);
- centrele cercurilor circumscrise aflate în regiune sunt nodurile (unite la 1e-7 mm), o muchie a triangulării dă o muchie
  a axei când cele două eșantioane nu sunt vecine pe contur, iar colțurile convexe se leagă pe bisectoare;
- **raza se recalculează exact** în fiecare nod (distanța la contur, pe o grilă uniformă de segmente), nu se ia din
  triangulare: conul nu poate trece de suprafața ideală (s3 §5.3);
- ramurile terminale redundante se taie (discurile lor stau în discul ramificației, până la 0,004 mm, cu punctele deja
  absorbite), lanțurile se simplifică (Douglas–Peucker pe x, y, r, 0,004 mm), apoi garda: pe fiecare coardă, raza interpolată
  ≤ distanța exactă + 0,0005 mm, altfel se adaugă punctul. Un nod fără muchii (cercul: toate centrele în același punct) e axa
  bucății lui.

**4. Traseul** (`src/cam/vcarve.ts`): z = −min(D, r·cot(θ/2)), cu punctele inserate unde z trece prin −D. Unde regiunea e
mai lată decât freza la D (r > D·tan(θ/2)), axa rămâne la −D, iar peretele se taie pe inelul regiunii decalate cu
D·tan(θ/2), la −D (`offsetRegiune`): pereții ies exacți, iar **fundul plat dintre ei rămâne**, cu un avertisment (îl face
freza dreaptă, 8.2↑). Trecerile: trecerea k taie doar bucățile de sub nivelul k − 1, oprite la nivelul k (`adancimiTreceri`,
ca profilul), deci conul se mută cu cel mult un pas între treceri; inelele, pe fiecare trecere. Lanțurile, în ordinea
capătului cel mai apropiat (inversate la nevoie), cu ridicare la Z sigur între ele; o coborâre în pantă, cu viteza pe Z cel
mult a plonjării (`avansCoborare`). Refuzat, cu motiv: freza plată, calea deschisă, ce e al profilului, unghiul sau
adâncimea greșite și **conul prea scurt** ((Ø / 2)·cot(θ/2) sub adâncimea cerută: coada frezei ar tăia).

**5. Documentul v14** (`VERSIUNE_SCHEMA = 14`): `tip` primește „vcarve”, scula primește `forma` (ușa: `tip: 'v'`, unghiul
finit în [1, 179]; câmpurile necunoscute ale formei rămân). Migrarea v13 → v14 schimbă doar numărul; un document marcat v13
care are deja un V-carve sau `scula.forma` e refuzat („nu e un document v13 valid”). Oracolul documentului (al sesiunii
aplicației, ca v11–v13) e mutat pe v14. Ce scrie Exportă: forma rândului, cu numele frezei după ea doar când se schimbă
(„freza V60”, „freza plata”), ca un Exportă fără schimbare să nu scrie o comandă.

## Probele

- pe hârtie: dreptunghiul 12 × 6 la 90° = −3, cercul R2,5 la 60° = −4,33013, triunghiul echilateral de latură 10 la 90° =
  −2,88675, inelul R10 / R6 la 90° = −2 (la 1e-4 mm); trecerile: 3 mm în pași de cel mult 1,2 = 3 × 1;
- oracolul simulării (independent, `test/oracles/simulare.ts`, conul V), pe G-code-ul exportat, față de suprafața ideală
  −min(D, d·cot(θ/2)) cu d pe hârtie, pe cinci forme (dreptunghiul, cercul la 60°, inelul, steaua cu colțuri concave,
  dreptunghiul rotunjit la 120°): niciodată mai adânc decât 0,002 mm (rotunjirea G-code-ului la 0,001 mm; măsurat 0,0011),
  material lăsat cel mult 0,015 mm (măsurat 0,0054, pe inel), nimic tăiat în afară;
- fundul plat: pereții exacți până la D·tan(θ/2), axa la −D, creasta dintre axă și inel lăsată, avertismentul;
- fiecare trecere scoate cel mult pasul: prefixele programului (după `statistici.sfarsitTreceri`) pe oracol, cu și fără inele;
- legalizarea: patrulaterul cu diagonala lungă se întoarce o dată; triangulările eșantioanelor conciclice rămân Delaunay,
  verificate cu predicatele robuste;
- lucrarea: inelul din două cercuri e o singură regiune, o etichetă, nu e inel al regiunii păstrate; refuzurile, cu motiv;
- ușa v14 și migrarea; ce scrie Exportă;
- e2e (Edge): dreptunghiul 100 × 60, freza plată oprește exportul (motivul), unghiurile 0° și 180° nu trec, cu V90 Ø6, 3 mm
  în două treceri: oracolul pe octeții din browser (pereții exacți, nimic sub −3, nimic în afară) și avertismentul fundului
  plat; operația rămâne în proiect, în arbore, în panou și la redeschidere; T1 plată și T1 V90 sunt un conflict;
- mutațiile țintite: în jurnalul feliei (`docs/etape/etapa-03.md`, 8.1↑).

## Limitele

- **Fundul plat** dintre pereți rămâne netăiat: freza dreaptă care îl curăță e felia 8.2↑ (rândul din prag o cere).
- Eșantionarea e uniformă (h = 0,02 mm); pasul adaptiv din T7 (mai des doar pe trăsăturile fine) vine dacă o formă mare cere
  prea multe eșantioane (plafonul: 600 000, refuzat cu motiv).
- Intrarea nu se „vindecă” (T7: toleranța declarată de 0,005 mm, pentru muchiile aproape comune): o regiune cu contururi care
  se ating trece așa cum e; un caz real care o cere redeschide decizia (cu normalizarea, fără Clipper).
- Adâncimea de start a incrustațiilor (inlay) e a feliei incrustațiilor.
- Proba fizică (o placă cu litere în V, adâncimea și lățimea pereților măsurate) e a plăcii etapei 8.

## Respinse

- **Raza din triangulare** (fără recalculare): s3 a măsurat-o peste suprafața ideală, cu tăieturi sub ea; raza exactă o
  mărginește prin construcție.
- **V-carve-ul ca profil decalat în trepte** (inele succesive, ca în unele programe vechi): colțurile ies rotunjite și
  programul crește cu adâncimea; axa medială dă colțurile ascuțite și un singur drum pe trecere.
- **Fundul plat curățat cu freza în V** (buzunar cu vârful): fundul ar ieși vălurit, cât pasul lateral; e treaba frezei
  drepte.
- **Clipper** pentru regiune: T7 îl lasă doar pentru normalizarea intrării, care nu e în felia asta.

## Se redeschide dacă

- placa etapei 8 arată pereții sau adâncimea în afara toleranței (unghiul real al frezei, vârful tocit, lemnul);
- o formă reală cere peste plafonul de eșantioane sau intrarea trebuie vindecată;
- owner-ul cere V-carve-ul pe căi deschise (gravura pe linie cu adâncime variabilă) sau vârful tocit al frezei ca parametru.
