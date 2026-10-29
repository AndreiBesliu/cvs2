# ADR 0108: Textul pe curbă și proba fonturilor (felia 7.3↑)

**Starea:** acceptat pe 29.10.2026, la felia 7.3↑ (adusă din etapa 7), după ADR 0106. **Completează:** ADR 0105 (textul și
fonturile), ADR 0106 (fonturile omului), ADR 0066 (curba măsurată, `src/model/curba.ts`), T17 (ADR 0017: CSP-ul).
**Schimbă:** politica CSP (`connect-src` primește `fonts.googleapis.com`, `font-src` primește `fonts.gstatic.com`).

**Problema.** Textul stătea doar drept, din ancoră; textul pe curbă era următorul pas al etapei 7 („Continua tu ce aveai la
rand”). În timpul feliei, două cereri ale owner-ului: „cum fac sa adaug fonturi” (butonul „Fonturi…” arăta ca o etichetă) și
„vreau sa se poata face preview la un font, de oriunde este el, mai ales din google fonts, inainte sa descarci fontul”. Până
acum, un font se vedea doar după ce era ales în panou, iar unul din Google, doar după descărcare.

## Decizia

1. **Curba se parcurge pe lungime** (`parcurgere` în `src/model/curba.ts`, pe măsurarea copierii pe curbă, ADR 0066):
   liniile și arcele exact, cubicele cu cuadratura Gauss–Legendre pe bucăți, apoi locul (punctul și tangenta) la orice
   distanță `s`. Dincolo de capete, o curbă închisă se reia (s modulo lungimea), una deschisă continuă pe tangenta capătului.
   Într-un vârf, tangenta e a segmentului care pleacă din el; segmentele fără lungime se sar.
2. **Literele se mută întregi** (`src/text/peCurba.ts`): textul se așază întâi drept (ADR 0105), apoi mijlocul liniei de
   bază a fiecărei litere (mijlocul avansului ei) se pune pe curbă la `s` al ancorei plus locul literei pe rând, iar litera
   se rotește după tangentă (sau rămâne dreaptă: **literele verticale**). O mișcare rigidă duce liniile și cubicele exact,
   deci contururile rămân exacte și normalizate; literele nu se îndoaie (o literă lată pe o curbă strânsă își ține linia
   dreaptă). Rândurile următoare stau mai jos, pe normală.
   - **Poziția** față de curbă, pentru tot blocul: **deasupra** (coborârea ultimului rând pe curbă), **pe linia de bază**
     (a primului rând), **centrat** (mijlocul dintre vârful majusculelor primului rând și linia de bază a ultimului),
     **dedesubt** (vârful majusculelor primului rând pe curbă); plus **distanța** în mm, în sus (negativă: spre curbă).
   - **Sensul:** curba e parcursă cum a fost desenată; una închisă, în sensul acelor, ca textul să stea afară și să se
     citească de la stânga la dreapta (cercul e desenat trigonometric, deci se parcurge invers); **partea cealaltă** schimbă
     sensul. „Sus”-ul literelor e normala din stânga mersului.
   - **Întins pe toată curba:** spațiul dintre caractere crește (sau scade) cât rândul să acopere curba: una deschisă de la
     capăt la capăt, (L − W) / (n − 1) pe gol; una închisă tot ocolul, (L − W) / n, cu același gol și după ultimul caracter.
     Pe cea închisă, alinierea față de ancoră privește literele, de la începutul primei la sfârșitul ultimei (fără golul de
     după ea): centrat, textul vizibil are mijlocul în ancoră. Golurile sunt egale, nu distanțele dintre mijloacele literelor:
     8 litere H stau la 45° una de alta pe cerc, 8 litere diferite nu.
3. **Blocul ține curba** (`curba` în blocul de text, `SchemaCurbaText`): conturul în sistemul piesei (originea e ancora, un
   punct al curbei: linii, arce, cubice, cel mult 10 000 de vârfuri), `s` al ancorei pe curbă, poziția, distanța (cel mult
   ±1 000 mm), partea, orientarea, întinderea. Nu e o schemă nouă: blocul e un câmp păstrat (ADR 0105 §4). Scalarea uniformă
   crește curba, `s` și distanța (o distanță peste plafon lasă doar contururile). Curba e copiată în bloc, nu legată de
   formă: o formă schimbată sau ștearsă nu schimbă textul; ca să urmeze forma nouă, se dă din nou clic lângă ea.
4. **Interacțiunea:** cu unealta Text, un clic la cel mult 4 px de conturul unei forme (care nu e text) pune ancora în
   punctul cel mai apropiat de pe contur (`pozitiePeCurba`: eșantioane la 0,25 mm, secțiunea de aur, apoi zeroul derivatei
   distanței prin bisecție, sub 1e-9 mm; minimul singur iese doar la ~1e-7 mm, fiindcă distanța e plată acolo), iar panoul
   arată secțiunea **Pe curbă** (cu lungimea curbei) și opțiunile ei. **Pe linie dreaptă** așază textul drept, cu curba
   ținută aleasă (**Pe curbă** îl pune înapoi). Panoul textului se derulează în zona liberă: pe un ecran scund, secțiunea
   curbei îl făcea să treacă sub bara de jos.
5. **Proba fonturilor, înainte de a le folosi** (fereastra „Adaugă fonturi…”): un câmp **Textul de probă** (primul rând din
   panou sau, gol, o probă a limbii: „Aa Ăă Ââ Îî Șș Țț 0123”), scris cu fiecare font din listă.
   - **Fonturile mele și cele ale sistemului:** proba e așezată de cititorul aplicației (`aduceFont`, aceeași cale și
     aceleași refuzuri ca în panou), deci arată contururile care se vor tăia, numește literele care lipsesc și spune de ce
     un font nu se poate folosi (instanța unui font variabil). Fontul se citește când rândul ajunge pe ecran și nu se ține:
     rămân doar contururile probei (fonturile mari ale sistemului au zeci de MB). Fila sistemului primește lista fonturilor,
     cu căutarea (primele 60), proba și **Folosește**.
   - **Google Fonts, înainte de descărcare:** fiecare familie din listă e scrisă cu ea însăși, în stilul ales, de browser:
     CSS API v2 cerut din browser (`credentials: 'omit'`, fără textul omului în adresă), fețele de afișare (WOFF2 tăiat pe
     alfabete, doar de pe gstatic, cu intervalul fiecăruia) adăugate în `document.fonts` sub un nume al aplicației;
     browserul aduce doar alfabetele textului de probă, abia când rândul ajunge pe ecran. Desenul e al aceluiași font (alt
     fișier al lui); ce se taie vine din TTF-ul descărcat (ADR 0106 §5).
6. **Butonul ferestrei** devine **Adaugă fonturi…**, cu chenar de buton (cererea „cum fac sa adaug fonturi”).

## Cifrele (măsurate, gzip 9)

| | Înainte (7.2↑) | După (7.3↑) |
|---|---|---|
| Pornirea (cu ușa) | 97,4 (100,9) / 110 kB | 97,4 (100,9) / 110 kB |
| Totalul JavaScript | 370,5 / 400 kB | 374,4 / 400 kB |
| Precache | 83 de fișiere, 517,7 kB | 83 de fișiere, 522,2 kB |

## Probele

- **Oracolul independent** (`test/oracles-py/text_corpus.py`, fontTools 4.67): curba măsurată fără codul aplicației (arcele
  din bulge, cu centrul și raza deduse acolo; cubicele cu `calcCubicArcLengthC`, pe 512 bucăți, și bisecția pe parametru),
  locul fiecărei litere în sistemul original al curbei (fără conturul inversat), regulile poziției, alinierii și întinderii
  scrise din nou, mișcarea rigidă ca înmulțire complexă. 16 cazuri (cercul, arcul, linia cu un segment fără lungime, colțurile
  dreptunghiului, cubica deschisă și o formă închisă din cubice desenată în sensul acelor; toate pozițiile, ambele orientări,
  literele verticale pe două rânduri, toate cele 8 combinații de sens, întindere și curbă închisă, mai multe rânduri, dincolo
  de capete, Roboto, Droid Serif, Inter CFF): aplicația iese la fel sub 1e-9 mm (măsurat: sub 2e-11 mm pe cubice, sub 1e-13
  pe linii și arce).
- **Pe hârtie, în oracol:** cercul R50 are 100π (314,16 mm, criteriul din cercetare); pe linia de bază, mijlocul liniei de
  bază a fiecărei litere stă pe cerc și vârful ei de 10 mm la raza 60, deasupra centrului, de la stânga la dreapta; dedesubt,
  pe partea cealaltă, cu distanța 1,5, vârful la 48,5 și baza la 58,5; 8 litere H întinse pe cerc la 45° una de alta, cu
  ancora sus la mijlocul lor; întins pe linia de 100 mm, textul pleacă din 0 și ajunge în 100. Oracolul a prins alinierea
  textului întins pe o curbă închisă (număra și golul de după ultima literă: centrat, textul ieșea mutat cu o jumătate de gol).
- **Probele țintite** (`test/unit/text.curba.test.ts`): parcurgerea (tangenta în colț, segmentele fără lungime și la capete,
  dincolo de capete, reluarea), ancora din clic (cercul, linia, dreptunghiul, capetele; a prins precizia promisă de 1e-9 mm, pe care
  minimul singur n-o dădea), sensul, criteriul R50 (clicul deasupra dă 25π, „LEMN” centrat afară), schema curbei, scalarea
  (vârfurile și mânerele unei cubice; peste plafon, blocul scos de tot, nu lăsat nevalid în document);
  `text.actiune.test.ts`: textul pe curbă trece schema documentului întreg, editat drept își pierde curba.
- **Proba Google** (`test/unit/fonturiGoogle.test.ts`): fețele de afișare din CSS (doar WOFF2 de pe gstatic; un interval
  stricat sare fața, unul lipsă înseamnă tot fontul), cererea fără acreditări, fețele adăugate sub numele aplicației, ținute
  pe variantă, cererea căzută reluată.
- **E2e** (Edge): textul pe un cerc R50 desenat în aplicație (`text.spec.ts`: legenda cu 314,16 mm, ancora pe cerc, curba
  în sistemul piesei, literele între razele 50 și 60, dedesubt între 40 și 50, drept din nou); probele în fereastra
  fonturilor (`fonturi.spec.ts`: contururile fiecărei fețe a colecției, schimbate din câmpul de probă; lista sistemului cu
  proba, motivul instanței Bold, căutarea, **Folosește**).
- **Mutațiile:** 47 / 47 (37 pe probele unitare, 10 pe e2e, controlul verde înainte și după); una a trecut întâi: segmentele fără lungime nesărite (proba avea segmentul fără lungime la mijloc, unde căutarea îl sare oricum; la capetele unei curbe deschise el dădea tangenta greșită): probă nouă, cu punctele dublate la capete.

## Ce am respins

- **Literele îndoite după curbă** (fiecare punct mutat pe curbă): contururile n-ar mai fi exacte (o linie devine o curbă
  aproximată), iar un text de tăiat e citit ca litere întregi, ca în programele de gravură.
- **Curba legată de formă** (textul urmează forma schimbată): o legătură între piese, cu o schemă nouă și cu ordinea
  actualizărilor în jurnal; acum, un clic din nou lângă formă.
- **Proba Google din TTF-ul întreg:** ar descărca fișierul (sute de kB pe familie) doar ca să-l arate; fețele de afișare
  aduc doar alfabetele textului.
- **Parametrul `text=` al CSS API** (doar literele probei): ar trimite textul omului la Google.
- **Fontul ținut după probă:** zeci de fonturi ale sistemului derulate ar sta în memorie (unele au zeci de MB).

## Limite și neprobat

- **Literele lungi pe o curbă strânsă** își țin linia dreaptă: colțurile bazei ies puțin de pe curbă (pe cercul R50, la
  10 mm, cu sub 0,5 mm).
- **Proba Google** e desenul browserului (WOFF2-ul de afișare, cu hinting-ul lui), nu contururile care se taie; se vede
  doar cu rețea, pe aplicația publicată (pe instanța locală n-are catalog). Probată pe Google adevărat pe instanța de test.
- **Fonturile sistemului** în fereastră: doar Chrome și Edge, pe calculator (ADR 0106 §4); primele 60 de rânduri, cu
  căutarea pentru restul.
- **Textul vertical** (litere una sub alta), **încadrarea în casetă**, **instanțele fonturilor variabile** și **fonturile cu
  o singură linie** rămân felii ale etapei 7.

## Se redeschide dacă

- owner-ul cere ca textul să urmeze forma când ea se schimbă;
- un text pe o curbă strânsă trebuie îndoit (gravura pe inele, de pildă);
- Google schimbă forma CSS API (proba se oprește curat: fără fețe, fără probă).
