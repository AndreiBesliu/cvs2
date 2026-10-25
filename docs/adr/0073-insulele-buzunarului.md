# ADR 0073: Insulele buzunarului

**Starea:** acceptat pe 25.10.2026. Felia 5.2↑, adusă din etapa 5 în etapa 3, fără mașină, lucrată cât owner-ul face testul
uneltelor de desen („poti sa continui cu altceva intre timp”), publicată pe canalul de previzualizare. **Rândul din prag:**
„Buzunar (curățare de suprafață), cu mai multe freze” (`ACOPERIRE-ARTCAM-DESKPROTO.md`): insulele; cele două freze rămân.
**Schimbă:** ADR 0069 §3 (inelele sunt bucăți ale unei regiuni), §5 (legăturile ocolesc insulele) și §6 (un contur în altul
nu mai e refuzat). **Documentul:** neschimbat (v11): insula e o citire a contururilor, nu un câmp nou.

**Problema.** Un buzunar golea tot ce era în conturul lui. Un panou cu litere în relief, un locaș în jurul unui logo sau fundul
unei rame cu o piesă care rămâne în mijloc cereau insule, iar un contur într-altul, în aceeași operație, era refuzat
(„buzunarul cu insule vine mai târziu”).

## Decizia

**1. Ce e insulă.** Buzunarele de pe foaie **cu aceeași adâncime** sunt un singur buzunar, oricare ar fi piesa, instanța sau
operația lor, și se citesc **par-impar**: un contur aflat strict în altul (fără să-l atingă) e o insulă; unul strict într-o
insulă e iar buzunar, cu insulele lui; și tot așa. Concret, adâncimea de includere a fiecărui contur în grupul lui (câte
contururi îl cuprind) decide: pară, se taie; impară, rămâne în picioare. Insulele unui buzunar sunt copiii lui direcți
(părintele = cel mai mic contur care cuprinde). **De ce adâncimea:** un buzunar de aceeași adâncime în altul n-ar face nimic
(locul e deja golit), deci singurul lui înțeles e insula; cu altă adâncime, înțelesul e treapta (mai adânc) și se taie întreg,
ca până acum. **De ce peste piese:** fiecare formă desenată e o piesă a ei (ADR 0051), iar un text importat stă de obicei în
alta decât rama; insula trebuie să le lege, ca selecția din ArtCAM. Pasul lateral, pasul pe trecere și sensul sunt ale
conturului din afară; cele ale insulei nu se folosesc (ea nu se taie).

**2. Refuzurile, cu motiv:** două contururi de aceeași adâncime care se ating sau se intersectează („unește-le întâi
(booleanul) sau dă-le adâncimi diferite”: par-impar n-ar mai spune ce e buzunar), din orice piese; același contur de două ori
în buzunare de aceeași adâncime. Două buzunare care se suprapun, din instanțe diferite, se tăiau înainte fiecare întreg (o
reuniune); acum cer booleanul sau adâncimi diferite. Buzunarul era nou (25.10), încă netestat de nimeni.

**3. Offsetul unei regiuni** (`offsetRegiune`, în fațada `geom/offset.ts`): exteriorul trigonometric și insulele orar formează
figura lui cavalier (`Shape`), strânsă cu d. Gărzile sunt ale lui `offsetInchis`: fiecare contur se curăță sau e refuzat;
ieșirea se verifică față de toate contururile (`verificaIesire` primește și o listă: fiecare punct la |d| de cel mai apropiat,
în regiune după par-impar, niciun contur atins, sensurile); la o verificare picată, a doua încercare cu 1e-4 mm mai adânc.
Ieșirea vine pe regiuni: fiecare gaură în cel mai mic exterior care o cuprinde (o bucată poate sta în gaura alteia: golul
unei insule în „C”, despărțit când deschiderea se închide). Fără insule, inelele ies aceleași ca în ADR 0069 (aceleași probe).

**4. Inelele** sunt bucăți ale regiunii de la d_k = R + k·s: bucla exterioară, apoi buclele din jurul insulelor, fiecare cu
regiunea în stânga mersului (materialul de scos, peretele sau insula, în dreapta: urcarea le ia așa, opoziția le întoarce).
Arborele: fiecare bucată de la d_k + s stă într-o singură bucată de la d_k (regiunea se strânge), găsită par-impar pe toate
buclele ei. **Acoperirea** din ADR 0069 §3 rămâne cuvânt cu cuvânt, cu δ distanța la margine (conturul și insulele): drumul
cel mai scurt spre margine trece prin fiecare δ. Pragul de topologie (golul dintre insulă și perete exact cât 2d) se rezolvă
la fel (inelul puțin mai aproape de margine). Plafonul de 20 000 numără buclele.

**5. Traseul și legăturile.** Bucățile dinăuntru în afară (postordine); într-o bucată, buclele de la cea mai apropiată de
freză, fiecare din punctul ei cel mai apropiat. Legătura dreaptă rămâne la adâncime dacă stă la cel puțin R − 0,005 mm de
contur **și de fiecare insulă**, cu mijlocul în buzunar (par-impar); altfel ridicare. **Precizare la ADR 0069 §5:** „o
legătură la adâncime taie cel mult un pas” e adevărat spre părinte (inelul dinafară); între două ramuri ale aceluiași părinte,
legătura trece prin material netăiat, cu toată lățimea frezei, ca primul inel al fiecărei treceri (nicio adâncime peste pas).

**6. Lucrarea:** o insulă n-are traseu și nici etichetă; eticheta buzunarului spune câte insule are („…, buzunar, 6 mm,
insule: 2”). Regiunea păstrată nu se schimbă (buzunarul nu e inel, ADR 0069 §4).

## Probele

- pe hârtie: dreptunghiul 100 × 60 cu insula 20 × 20 la mijloc, Ø6, s = 2,4: la 3, 5,4, 7,8 o bucată cu două bucle, la 10,2
  se rupe în stânga și dreapta, până la 19,8 (16 bucle); peretele 94 × 54 și bucla insulei, 26² − 9 (4 − π); cercul R20 cu
  insula R5, s = 3: coroanele 17 / 8 și 14 / 11; offsetul regiunii la 12 mm: 16 × 36 + 2 ∫₀⁸ (12 − √(144 − t²)) dt pe
  bucată, iar exact la prag (10 mm) a doua încercare; golul insulei în „C” cu gaura lui (22² − 36 (4 − π));
- oracolul simulării (independent), pe G-code-ul exportat: insula 20 × 20 rămâne, restul deschiderii e scos; un gol de 4 mm
  între insulă și perete rămâne netăiat la mijloc; un „O” din altă piesă: coroana neatinsă, golul ei scos; cercul de 10 mm în
  buzunarul de 6 mm: treaptă; poarta (pasul pe trecere, rapidele, cutia centrului) curată;
- legăturile: peste insulă, ridicare; pe lângă, la R − ε/2, jos; după bucla exterioară, legătura la adâncime în punctul cel
  mai apropiat al buclei insulei; garda offsetului: un traseu prin insulă e refuzat, deși stă la |d| de exterior;
- mutațiile țintite (offsetul fără insule, garda doar pe exterior, gaura în exteriorul cel mai mare, insula trigonometric,
  fără a doua încercare, părintele doar după exterior, legătura oarbă la insule, mijlocul în insulă, bucla de la vârful 0,
  numărătoarea, adâncimile amestecate, părintele cel mai mare, adâncimea de includere trunchiată, insula tăiată, refuzurile,
  inelele și traseul fără insule): 18 / 18 prinse.

## Limitele

- Insula e citită doar între buzunare: o formă fără operație sau cu un profil, aflată în buzunar, nu e insulă (buzunarul o
  golește, iar profilul ei se taie după). Ca selecția din ArtCAM: insula o face cine îi dă buzunarul.
- Nimic nu avertizează despre materialul rămas între o insulă și perete, unde freza nu încape (se vede în 3D).
- Multe insule apropiate fac multe ridicări: unde golurile dintre insule se închid, fiecare loc dintre ele devine o bucată
  a lui, iar legătura dreaptă spre următoarea trece prea aproape de o insulă (măsurat pe 25.10: 240 de insule la 20 mm, cu
  golul de 12 mm: 691 de bucle, 620 de ridicări pe două treceri; inelele în 0,23 s, traseul în 0,07 s). Un drum de-a lungul
  materialului deja scos, în locul ridicării, vine mai târziu.
- Oracolul documentului v11 (încă al aceleiași sesiuni, ADR 0069) nu judecă insulele: le judecă oracolul simulării.

## Respinse

- **Insula din aceeași operație** (contururile unei singure operații, par-impar): importul SVG împarte contururile în
  operații după imbricare (exterior / interior), iar formele desenate sunt piese separate; un panou cu litere n-ar fi avut
  niciodată insule fără să-și refacă operațiile.
- **Orice formă închisă a piesei aflată în buzunar** (cu sau fără operație): o formă ajutătoare sau o gaură cu profil ar fi
  devenit insulă fără ca omul s-o ceară.
- **Reuniunea automată a buzunarelor care se suprapun**: o geometrie ghicită; booleanul o face pe față.

## Se redeschide dacă

- se cer insule dintr-o formă fără buzunar (o insulă marcată de om, ca despărțirea, ADR 0037 §8);
- pe o placă, legătura între ramuri prin material netăiat se dovedește prea dură (atunci, ridicare între ramuri).
