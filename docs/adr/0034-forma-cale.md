# ADR 0034 — Forma „cale”: un contur închis din linii, arce și cubice (documentul v9)

**Starea:** acceptat pe 11.10.2026, în felia 2.7b. **Intră în:** etapa 2. Nimic de aici nu se schimbă fără un ADR nou.

**Problema.** Importul SVG (2.7c), textul (etapa 7) și desenul (etapa 6) aduc contururi oarecare: linii, arce și cubice.
Documentul are doar două forme parametrice, dreptunghiul și cercul. Cubicele trebuie să stea exacte în document, pentru
pânză și pentru exportul vectorial (T1, ADR 0001). La mașină ajung doar prin biarce (ADR 0006, ADR 0033).

## Contractul

**1. Forma** (o variantă nouă a formei unui element, ADR 0024):

```
{ tip: 'cale', inchis: true, varfuri: [ { p: { x, y }, s }, … ] }
s = { tip: 'L' } | { tip: 'A', bulge } | { tip: 'C', c1: { x, y }, c2: { x, y } }
```

- Convenția e a conturului (ADR 0001). Fiecare vârf poartă segmentul care pleacă din el spre vârful următor, iar ultimul
  vârf se leagă de primul. Arcul are `bulge` = tan(baleiaj / 4), pozitiv în sens trigonometric. Cubica are punctele de
  control c1 și c2.
- Coordonatele sunt ale elementului. Matricea lui, a grupurilor de deasupra și a instanței o așază pe foaie (ADR 0024).
- `inchis` e mereu `true` în v9. Contururile deschise vin cu 2.3c, cu o schemă nouă, ca o versiune care nu le înțelege
  să le refuze la ușă, nu să le închidă.
- Câmpurile necunoscute se păstrează pe formă, pe vârf, pe segment și pe punct, ca peste tot în document.

**2. Ce refuză ușa** (schema documentului, cu motiv):
- mai puțin de 2 vârfuri, sau peste **`PLAFON.varfuriCale` = 50 000** pe o cale;
- un număr care nu e finit, sau o coordonată (p, c1, c2) cu |x| sau |y| peste `PLAFON.translatie` (10⁷ mm);
- un tip de segment necunoscut;
- un arc cu `bulge` 0 sau cu capetele în același punct: n-are cerc;
- un arc cu **raza peste 10 000 mm** (`PLAFON.latura`, ca la cerc), socotită ca (c / 4)·(b + 1/b) din coardă și bulge
  (precizarea recenziei, 11.10). Un bulge aproape de 0 (zgomotul unui cos 90°) dădea un cerc de 10¹⁷ mm, desenat la 14 mm
  de unde e; unul uriaș depășea double-ul, iar CAM-ul tăia un semicerc ascuns, prin piesă. Importul scrie un arc mai
  plat ca o cubică (2.7c);
- `inchis` altfel decât `true`;
- o cale cu arce sub o matrice care nu e o similitudine (ca dreptunghiul rotunjit și cercul): arcul ar deveni elipsă.
  Liniile și cubicele trec exact prin orice matrice afină. **Precizarea recenziei:** ușa judecă, pe lângă matricea din
  piesă (la 1e-12, ADR 0024 §5), și matricea în lume a fiecărui element cu arce, compusă ca în `lume.ts` (instanța cu
  rotirea ei, apoi grupurile, apoi elementul), la `TOLERANTA_SIMILITUDINE_LUME` = 2e-12, cu care judecă și consumatorii.
  Rotirea instanței învârte abaterea (norma pe componente crește cu cel mult √2), iar un grup neuniform compensat de
  element rotunjește altfel în cele două ordini: pânza arunca la fiecare pornire. Acum ce trece de ușă se și desenează;
- plafoanele de ansamblu, numărate o dată pentru ușă și pentru acțiuni (ADR 0024):
  - vârfurile tuturor căilor pieselor: cel mult **`PLAFON.varfuri` = 200 000**;
  - vârfurile în lume (instanțele înmulțite cu vârfurile căilor piesei lor): cel mult **`PLAFON.varfuriLume` =
    1 000 000**. Pânza și clicul sunt liniare în ele; CAM-ul e aproape liniar (indexul de la §6);
- o instanță mutată sau copiată (Ctrl+D) peste 10⁷ mm de origine: acțiunea e inactivă, cu motivul ei („prea departe”),
  iar ușa folosește același prag (`instantaPreaDeparte`).

Ușa **nu** judecă geometria: autointersecțiile, segmentele nule, sensul de parcurgere sau aria nulă. Pânza desenează orice
cale, iar CAM-ul refuză, cu motiv, ce nu poate tăia (gărzile offsetului, ADR 0005: conturul care se autointersectează,
cel sub rezoluție, cel cu mai puțin de două vârfuri distincte; regiunea păstrată, ADR 0026).

**3. Migrarea v8 → v9** schimbă doar numărul schemei. Un document v8 e un document v9 valid, iar programul lui rămâne
același, octet cu octet. O versiune v8 refuză un document v9 la ușă („scris de o versiune mai nouă”), deci nu poate tăia o
cale fără s-o înțeleagă. Invers, un document **marcat v8 care conține o cale** e refuzat, cu motiv: v8 n-o cunoaște, deci
nu e un v8 valid, iar ușa nu ghicește cine l-a scris (precizarea din 11.10, la constatarea oracolului).

**4. Pânza** desenează calea exact: liniile, arcele cu centrul și raza lor, cubicele ca Bézier. Nicio aproximare pe ecran.

**5. Clicul** (ADR 0003: o singură funcție „punct în regiune”) măsoară cubicele direct, nu prin biarce:
- **includerea** (`evenodd`): cubica se taie la extremele lui y în bucăți monotone pe y. Raza orizontală traversează o
  bucată cel mult o dată, iar punctul traversării se găsește prin bisecție, la precizia aritmeticii;
- **distanța** la cubică: bucățile monotone pe x și pe y, eșantionate; în jurul fiecărui minim local, secțiunea de aur
  pe intervalul dintre eșantioanele vecine, apoi Newton, prins în acel interval. Fără secțiunea de aur, Newton pornit
  dintr-un capăt cu mânerul retras (B′ = 0) nu se mișca, iar minimul de lângă capăt scăpa: 0,3 mm, până la 29 mm pe o
  cubică lungă (oracolul și recenzia). Măsura e pentru clic, nu pentru mașină;
- clicul sare elementele a căror cutie exactă (ținută între clicuri) stă mai departe decât toleranța.

CAM-ul nu măsoară cubice: el lucrează pe conturul lui din biarce (§6). Distanța dintre două contururi (`apropiere`) și
offsetul refuză în continuare o cubică, ca gardă.

**6. CAM-ul** (ADR 0033 §7). Fiecare element tăiat intră în CAM ca un contur fără cubice, **o singură dată**, în lume:
- conturul elementului, după matrice, cu fiecare cubică înlocuită de biarcele ei la `TOLERANTA_PROIECT`. Arcele și
  liniile rămân. Biarcele se fac în coordonatele foii, ca toleranța și raza maximă (`RAZA_MAXIMA_ARC`) să fie măsurate
  unde taie freza;
- același contur servește regiunii păstrate (ADR 0026), profilului, degajărilor (ADR 0032) și avertismentelor. Nu există
  două aproximări ale aceleiași căi într-un program;
- un refuz al biarcelor (plafonul de bucăți, rezoluția numerică; ADR 0033 §5) e refuzul exportului: `<idLume>: <motiv>`;
- **abaterea traseului** față de calea desenată: biarcele (≤ 0,99 × 0,001 mm), plus ce adaugă oricum offsetul și
  rotunjirea postului pe linii și arce (ADR 0026 §6);
- **raza arcelor după offset:** biarcele au raza ≤ 9 900 mm. Offsetul spre exterior adaugă raza frezei, cel mult 50 mm
  (`PLAFON.diametruScula` = 100 mm), deci arcul rămâne sub garda postului GRBL (10 000 mm), care l-ar aproxima a doua
  oară. Testul de consecvență al bugetului (`geom.toleranta.test.ts`) leagă cifrele de plafonul sculei.

**Precizările recenziei (11.10), la offset (ADR 0005), regiune (ADR 0026) și degajări (ADR 0032), pentru lanțurile de
biarce:**
- **contactul fals la o joncțiune tangentă:** cavalier socotește centrele în double; la două arce mici tangente, distanța
  dintre centre iese cu ~1e-14 peste diferența razelor, iar cercurile se „taie” a doua oară la ~1e-6 mm de vârful comun.
  Un astfel de punct, între două segmente vecine, la cel mult 1e-4 mm de vârful lor, unde mersul se rupe cu sub 90°, nu
  e o autointersecție (la intrarea și la ieșirea offsetului). Fără asta, până la 90 % din florile mici erau refuzate;
- **buclele minuscule ale ieșirii:** la o joncțiune aproape tangentă (o linie plată lângă un arc, frântura ~1e-4 rad),
  tăierea offsetului lăsa o buclă de 5e-4 … 0,03 mm care se întoarce în același punct, iar căile netede erau refuzate cu
  „se atinge singur” (32 de cubice: un sfert; 128: patru din cinci). O buclă locală (cel mult 8 segmente), mai scurtă de
  0,1 mm, se scoate: traseul trece prin punctul de intersecție, cu arcele tăiate exact. Ieșirea se verifică apoi întreagă,
  ca înainte (distanța la |d|, partea, nicio altă atingere);
- **două inele care se ating:** un inel din biarce stă la cel mult `TOLERANTA_PROIECT` de desen, deci două desene care se
  ating pot ieși, ca biarce, despărțite. Pragul atingerii crește cu o toleranță pentru fiecare inel dintr-o cale cu
  cubice (1e-6 + 0,001 · câte), iar refuzul spune și banda;
- **colțurile curbe:** degajările rămân doar între două linii (ADR 0032). Un colț al desenului cu o latură curbă, concav
  pentru piesă, cu restul de cel puțin 0,01 mm, la care freza ajunge, primește avertismentul „degajarea omisă la colțul
  (x, y): o latură a colțului e curbă”. Degajarea pe arce și cubice cere un ADR nou;
- **curbele strânse:** „colțul rotunjit cu raza …” se socotește pe desen, pe arcele lui (nu pe arcele biarcelor, care nu
  sunt colțuri). O cubică ce se strânge spre deșeu sub raza frezei dă un singur avertisment, cu raza ei minimă de
  curbură: „curba de lângă (x, y) se strânge până la raza r mm …: freza o rotunjește”;
- **timpul:** verificarea ieșirii offsetului și apropierea dintre contururi erau O(n·m) (un poligon de 35 000 de vârfuri:
  7 minute). Acum intrarea stă într-un index de cutii (arborele lui cavalier), iar apropierea primește pragul deciziei
  apelantului: aceleași verdicte, octet cu octet (corpusurile), în ~2 s.

**7. Operația implicită** a unei căi noi e cea a dreptunghiului: profil pe exterior, 3 mm într-o trecere. Importul (2.7c)
își alege latura din imbricare.

**8. În lista de vectori**, calea apare ca „cale L × H, n segmente, la X x, Y y”: cutia ei exactă în lume (ADR 0033: cu
extremele cubicelor), cu colțul stânga-jos.

**9. Ce verifică oracolul** (sesiune independentă, din acest ADR):
- documentul v9: forma, refuzurile de la §2, păstrarea câmpurilor necunoscute, migrarea v8 → v9, plafoanele noi,
  numărate și după acțiuni;
- clicul pe căi: includerea și distanța, față de o măsură proprie;
- CAM-ul pe căi cu cubice, de la cap la coadă: G-code-ul citit înapoi stă la raza frezei de calea exactă, cu abaterea în
  bugetul de la §6, pe un corpus (litere, inimi, curbe de 2 440 mm, cubice cu vârfuri, căi cu arce și linii amestecate);
- documentele fără căi dau aceleași programe, octet cu octet (corpusul și placa 1).

## Limitele

- **Timpul CAM-ului:** biarcele costă ~1–3 ms pe cubică (măsurat pe corpusul ADR 0033), pe firul principal; restul e
  aproape liniar după index (35 000 de vârfuri: ~2 s; un cerc din 4 000 de cubice: 0,1 s). Se măsoară în 2.7c, pe
  fișiere reale; dacă trece de buget, CAM-ul se mută într-un worker (T3, ADR 0015). Rămân pătratice, în numărul de
  elemente (nu în mărimea unei căi), perechile de inele ale regiunii și perechile de bucle ale ieșirii.
- **Cavalier dă uneori un contur deschis** pe offsetul interior al unui colț de 0,5 mm (măsurat și înainte de 2.7b):
  exportul îl refuză, cu motiv.
- **Cauza buclelor mici e în cavalier** (verificatorul recenziei): la o îmbinare linie–arc aproape tangentă, linia decalată
  trece la sub `posEqualEps` de cerc, iar intersecția e clasificată „tangentă”, deci îmbinarea cade la R·θ de cea
  adevărată. Reparația la cauză (reîncercarea intersecției cu 1e-12·r) ajuta pe literele TrueType (21 → 3 refuzuri din
  2 249), dar, peste scoaterea buclelor, a dat aserțiuni noi în cavalier pe bulele de 128 de cubice (2 din 60): a rămas
  deoparte. Se reia în 2.7c, pe fonturi și SVG-uri reale, prin martorul lui cavalier (`PROVENIENTA.md`).
- **Documentul la plafon** (200 000 de vârfuri pe piese, măsurat): 20,6 MB de JSON; ușa îl judecă în ~1,1 s, iar JSON-ul
  canonic al fiecărei salvări ia ~0,7 s. Un SVG obișnuit are de sute de ori mai puțin.
- Calea nu se editează încă (desenul vine în etapa 6), iar contururile deschise vin cu 2.3c.
- Arcele eliptice ale unui SVG vin ca cubice, de la import (ADR 0002).

## Recenzia (11.10.2026)

Două lentile (geometria și CAM-ul pe căi; ușa, plafoanele, acțiunile) și câte un verificator pe constatare, toate
reproduse cu măsuri independente. Pe lângă precizările de mai sus: căile netede refuzate de offset (înaltă), contactele
false (înaltă), arcele cu raza absurdă (critică: un semicerc ascuns tăiat în piesă, dintr-un document fabricat), matricile
la limita similitudinii (medie), două căi care se ating (medie), colțurile curbe tăcute (medie), timpul pătratic (medie),
distanța clicului (medie), instanța peste 10⁷ mm (medie, din etapa 1). Mici: pluralul românesc al etichetei, istoricul
care copia o cale întreagă la fiecare Ctrl+D (formele se împart acum între copii), clicul și lista fără cutii ținute.

## Ce am respins

- **Biarcele în document:** s-ar pierde cubica exactă, pentru pânză și pentru export, iar aproximarea ar depinde de
  scara la care o așază matricea. Ușa biarcelor rămâne una, la CAM (ADR 0006).
- **Polilinia** (calea eșantionată): pierde curbele și continuitatea tangentei.
- **Câte o formă pe fiecare element SVG** (`rect`, `ellipse`, `path`…): CAM-ul și pânza ar avea câte o ramură pe fiecare.
  Importul (2.7c) aduce totul la cale, cu excepțiile pe care le alege el.
- **Clicul prin biarce:** ar cere aceeași aproximare ca CAM-ul pe fiecare clic (~1–3 ms pe cubică), pentru o toleranță
  de câțiva pixeli.

**Se redeschide dacă:** importul (2.7c) are nevoie de altceva decât un contur închis pe element, sau timpul CAM-ului pe
fișiere reale trece de buget.
