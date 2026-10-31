# ADR 0112: Rolul de tăiere din panoul de proprietăți și traseul la zi (felia 5.8↑)

**Starea:** acceptat pe 31.10.2026, la felia 5.8↑ (adusă din etapa 5), din cererea owner-ului din 28.10; alegerile marcate
**(owner)** au implicitul recomandat, de confirmat. **Schimbă:** ADR 0038 §2 (traseul la cerere, stins după o schimbare) și
§4 (operațiile doar în fereastra exportului). **Completează:** ADR 0025 (operațiile pe piese), ADR 0109 (CAM-ul în worker).

**Problema.** Owner-ul: „o sa vreau sa setam rolurile de taiere inainte sa intru la export g code si sa se faca update si la
toolpath”. Până acum, tăietura unei forme se schimba doar din fereastra exportului, câte un rând pe operație, iar traseul de
pe pânză se stingea la orice schimbare și se calcula din nou doar cu `T`. Pe o piesă cu mai multe operații (un text, un
import: profilul pe exterior pe contururile de afară, cel pe interior pe goluri), un V-carve ales pe ambele rânduri rămânea
împărțit: regiunea unui V-carve e a unei singure operații (ADR 0090), deci literele se săpau fără goluri, iar golurile încă o
dată.

## Decizia

1. **Secțiunea „Tăierea” în panoul de proprietăți**, pentru formele alese (una sau mai multe): **Rolul** (lista), **Adâncimea**
   și **Pasul** (câmpul numeric al panoului, ADR 0038 §5). Dedesubt rămân operațiile piesei (la o singură formă aleasă) și
   „Editează în export”, pentru restul valorilor: freza, sensul, urechile, rampa, intrările, degajările, coborârea, strategia.
2. **Rolul e al piesei întregi**, nu al unei operații. Alegerea înlocuiește operațiile fiecărei piese alese cu cele ale
   rolului (`document.rol`, un pas de anulare):
   - **exterior:** contururile de afară (adâncimea pară a imbricării) pe exterior, golurile pe interior; **interior:** invers;
   - **pe linie:** toate formele, într-o operație; **stânga / dreapta:** doar pe o piesă care e o singură cale deschisă;
   - **buzunar, V-carve:** toate contururile, într-o singură operație (regiunea par-impar: literele cu golurile lor);
   - **găurire:** toate cercurile, doar pe o piesă numai din cercuri.
3. **Lista oferă doar rolurile care se potrivesc tuturor formelor** pieselor alese: o piesă cu contururi închise și căi
   deschise primește din panou doar „pe linie” (restul, din export sau după degrupare). Rolul arătat e al piesei doar dacă
   operațiile ei sunt exact ce ar da rolul (felul, latura și formele fiecărei operații); altfel, lista arată „—”.
4. **Ce rămâne la schimbarea rolului:** freza, sensul, adâncimea și pasul primei operații; între exterior și interior, și
   urechile, rampa, intrările și degajările. Restul revine la implicitul ferestrei exportului: pasul lateral al buzunarului,
   40 % din freză (sau cel vechi, dacă era buzunar și încape în jumătatea frezei), găurirea cu ieșirea la fiecare pas,
   V-carve-ul fără fund plat. Când o operație devine tot una, își păstrează id-ul; altfel, id-urile sunt ale rolului
   (`exterior`, `interior`, `linie`, `buzunar`, `vcarve`, `gaurire`; peste plafonul de noduri pe operație, `-2`, `-3`…), ca la
   import. Același rol ales din nou nu e o comandă.
5. **Freza potrivită rolului (owner).** Freza în V merge doar pe linie și în V-carve (ADR 0092). La V-carve cu o freză plată,
   piesa primește freza V60 cu același diametru; la un rol care nu primește V, cu o freză în V, freza plată cu același
   diametru. Numărul (T) e al unei freze identice din proiect, altfel cel mai mic liber, ca două freze diferite să nu aibă
   același număr (ADR 0084). Panoul arată freza nouă, iar exportul o schimbă.
6. **Adâncimea și pasul** se scriu pe toate operațiile pieselor alese, prin `document.aplica-operatii` (aceeași acțiune ca
   Exportă): aceleași margini, un pas de anulare. Cu valori diferite între operații, câmpul e gol („—”), iar o valoare scrisă
   le face egale.
7. **O piesă cu mai multe copii** își schimbă rolul pentru toate (operațiile sunt ale piesei, ADR 0024); panoul o spune.
8. **Traseul la zi (owner).** Cât e arătat, orice schimbare a documentului (desenul, rolul, adâncimea, o anulare, versiunea
   altei file) îl calculează din nou după 300 ms fără altă schimbare, în workerul CAM (ADR 0109). Cât se calculează, traseul
   vechi rămâne, stins, sub „se calculează”; un refuz se calculează din nou la fel. `T` îl ascunde și îl arată, ca până acum.
9. **Fila care doar citește:** lista și câmpurile sunt oprite, cu motivul; traseul se reface și acolo.

## Probele

- **Pe hârtie** (`test/unit/rol.test.ts`, 7 probe): rolurile oferite (dreptunghiul, cercul, calea deschisă, litera cu gol,
  piesa amestecată, două căi deschise, 2 000 de contururi suprapuse peste bugetul imbricării); operațiile fiecărui rol pe un
  contur și pe o literă cu gol (exterior: conturul pe exterior, golul pe interior; interior: invers; V-carve și buzunar: o
  singură operație cu ambele); id-urile; ce rămâne (urechile între exterior și interior, câmpurile necunoscute) și ce revine;
  freza (plată → V60 cu T liber, V → plată cu T-ul unei freze identice, numerele frezelor de rest și ale fundului plat
  ocolite); rolul recunoscut înapoi din operații, iar un V-carve împărțit pe două operații nu e „V-carve”; împărțirea peste
  plafonul nodurilor pe operație; fiecare operație trece de schema documentului.
- **Acțiunea** (`test/unit/actiuni.rol.test.ts`): un pas de anulare, refuzurile (fără selecție, fila care doar citește, rolul
  nepotrivit uneia dintre piese), două piese într-un pas, același rol fără comandă.
- **E2e** (Edge, `test/e2e/rol.spec.ts`): rolul ales în panou apare în fereastra exportului și mută traseul arătat de pe
  exterior pe interior fără `T` (pixelii stratului, ±1 px), iar o anulare îl pune la loc; adâncimea din panou; două forme cu
  roluri și adâncimi diferite („—”, câmpul gol), apoi aceleași într-un pas; două cercuri devin găuriri, iar un dreptunghi
  alăturat scoate găurirea din listă; o mutare din panou reface traseul pe locul nou. Traseul la zi, și în
  `traseu.spec.ts`, `cam-bazin.spec.ts` (calculul anulat de o schimbare: workerul vechi oprit fără răspuns, al doilea pornit
  după întârziere), `recenzie28.spec.ts` (C4: traseul vechi stins sub „se calculează”, pe un document mare).
- **Mutația:** fără calculul pornit de întârziere, trei probe e2e cad (rolul care mută traseul, schimbarea din `traseu.spec.ts`,
  mutarea), iar restul trec.
- **O singură imbricare:** judecata de adâncime a importului (`src/io/imbricare.ts`) e acum în `src/geom/imbricare.ts`, cu
  candidații dați de apelant (indexul de cutii la import, cutiile filtrate la rol), ca panoul să nu aducă biblioteca indexului;
  1 605 probe de import și text, neschimbate.
- **Mărimile:** pornirea 97,3 → 97,5 (cu ușa 100,8 → 101,0 / 110 kB); totalul 411,9 → 414,4 / 450 kB.

## Ce am respins

- **Rolul pe operație**, ca rândurile exportului: pe un text, V-carve-ul și buzunarul ar rămâne împărțite.
- **Rolurile și pe piesele amestecate** (contururi și căi deschise): ar cere o regulă pentru căile deschise (adâncimea,
  despărțirea foii); vine dacă owner-ul o cere.
- **Freza aleasă din panou:** numărul, diametrul și forma au regulile lor (conflictul numerelor, ADR 0084); rămân în export.
- **„Fără tăiere”** (o piesă fără operații): necerut.
- **Un comutator separat pentru traseul viu:** owner-ul a cerut traseul la zi; `T` rămâne pentru ascundere.

## Limite

- Din fereastra exportului, tăietura rămâne pe operație. Un V-carve ales pe ambele rânduri ale unui text se sapă totuși
  întreg (precizarea de mai jos); cu valori diferite pe rânduri, regiunile rămân ale lor.

## Precizarea din 31.10.2026 (felia 5.8↑b): V-carve-ul unei piese e o singură regiune

Limita de mai sus dădea un rezultat greșit: un text cu operațiile importului, trecute pe V-carve rând cu rând în fereastra
exportului, avea două regiuni (contururile de afară fără goluri, apoi golurile încă o dată), deci „O” se săpa ca un disc
plin. **Schimbă ADR 0090 (regiunea unui V-carve e a unei operații):** în lucrare, regiunea e a contururilor V-carve ale unei
piese dintr-o instanță cu aceleași valori (freza: numărul, diametrul, forma; adâncimea, pasul, sensul, fundul plat), oricâte
operații ar fi, ca buzunarele de aceeași adâncime (ADR 0073). Cu valori diferite, regiunile rămân ale lor. Eticheta și
rezumatul pe operație poartă regiunea la prima operație a ei.
- **Proba** (`test/unit/vcarve.test.ts`): inelul R10 / R6 pe două operații cu aceleași valori dă exact mișcările unei
  singure operații (2 mm, nu 10); cu adâncimi diferite, discul R10 se sapă întreg (limita, spusă). Înainte de schimbare,
  proba cădea.
- Rolul din panou rămâne „V-carve” doar pentru o singură operație (§3): un V-carve împărțit arată „—”, iar alegerea lui îl
  regrupează, fără să schimbe G-code-ul.

## Se redeschide dacă

- owner-ul vrea roluri pe piesele amestecate, sau „fără tăiere”;
- traseul la zi încetinește desenul pe un proiect mare (atunci, întârzierea mai lungă sau recalculul doar la cerere);
- owner-ul vrea altă freză implicită pentru V-carve.
