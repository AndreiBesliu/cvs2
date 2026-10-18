# ADR 0046: Estimarea timpului jobului: planificatorul GRBL 1.1h pe G-code-ul exportat, profilul mașinii ca date, rezumatul în dialogul exportului

**Starea:** acceptat pe 18.10.2026, odată cu felia „estimarea timpului jobului” (`PLAN.md` §5.3, etapa 4, punctul 5:
„Estimarea timpului cu modelul planificatorului GRBL și rezumatul jobului, comparate cu cronometrul plăcilor 2 și 3”),
adusă ca felie fără mașină (`PLAN.md` §4.6, punctul 7: plăcile 1 și 2 sunt netăiate). Rândul pragului: „Timpul estimat”
(`docs/faza2/arhitectura/estimare.md`, D6, clasa R2). **Continuă:** ADR 0008 (IR-ul), ADR 0009 (postul unic și
contractele), ADR 0022 (N axe), ADR 0042 (pornirea, ferestrele cu calculul lor), ADR 0045 (cache-ul PWA: bucata nouă intră
în precache ca orice bucată la cerere).

**Problema.** Owner-ul nu știe cât durează un job înainte să-l pornească, iar ediția întâi avea un estimator
„autoconsistent, niciodată comparat cu cronometrul” (`estimare.md`, D6). Un timp calculat ca lungime / avans greșește
mult pe un GRBL real: accelerațiile mici, colțurile, segmentele scurte ale arcelor și viteza maximă pe axe îl pot dubla
(placa 2, pe setările din fabrică ale GRBL 1.1h: 623 s față de ~250 s „pe hârtie”, lungime / avans). Comparația cu
cronometrul vine după tăierea plăcilor 2 și 3; acum se probează modelul.

## Decizia

**1. Modelul rulează pe TEXTUL G-code exportat, nu pe IR.** GRBL planifică ce primește, iar între IR și octeți postul ia
decizii care schimbă timpul: coordonatele rotunjite la 3 zecimale (și I / J din startul rotunjit), arcele împărțite la
cel mult π, arcele cu raza peste gardă scrise ca segmente G1, arcele minuscule scrise G1, rapidele fără efect sărite,
avansul cu o zecimală, pauza după M3 (parametrul mașinii), retragerea de la final. Un model pe IR ar fi trebuit să refacă
aceste decizii (o a doua copie a postului) sau să le ignore. Pe text, modelul vede exact octeții pe care îi taie mașina
și pe care îi leagă SHA-256-ul; tot el va servi senderul (etapa 3), care trimite și fișiere scrise de alte programe.
Prețul: un cititor G-code în aplicație, restrâns la ce acceptă GRBL 1.1 și refuzând cu linia restul (punctul 3).

**2. Profilul mașinii e un obiect de date (`src/ir/masina.ts`, tipul și citirea lui `$$`; `src/ir/masini/grbl11h.ts`,
implicitele cu sursa fiecărui câmp), în unitățile lui `$$`:** pe axă (X, Y, Z, opțional A, T22) `$100`–`$103` pași / mm,
`$110`–`$113` viteza maximă (mm/min), `$120`–`$123` accelerația (mm/s²); `$11` devierea la joncțiune, `$12` toleranța
arcului; plus constantele compilate în firmware, care nu apar în `$$` (blocurile planificatorului, pasul pauzei, viteza
minimă la joncțiune, avansul minim). Stă în `ir` fiindcă estimarea (`sim`), postul și senderul (`machine`) au voie să
importe doar `ir` (`PLAN.md` §3.3). Implicitele sunt ale GRBL 1.1h (`defaults.h`, `DEFAULTS_GENERIC`: 250 pași / mm, 500
mm/min, 10 mm/s², `$11` = 0,01, `$12` = 0,002; `planner.h`: `BLOCK_BUFFER_SIZE` 16). `profilDinSetari(text, baza)`
citește răspunsul la `$$` (formatul 1.1 și cel vechi, cu comentariul în paranteze) peste un profil de bază: o valoare
nenumerică, ≤ 0 (`$11` poate fi 0), nefinită sau scrisă de două ori refuză tot textul, cu linia; un text fără nicio
setare de mișcare e refuzat; axa A intră doar întreagă. Senderul îl va citi direct de la mașină; până atunci, owner-ul îl
lipește în dialog (punctul 5).

**3. Planificatorul (`src/sim/timp.ts`), din codul GRBL 1.1h** (gnea/grbl v1.1h.20190825, citit pe 18.10):
- **blocurile** (`plan_buffer_line`): ținta cuantizată pe pași (`lround`), lungimea și versorul din pașii cuantizați,
  blocul fără niciun pas aruncat; accelerația și viteza rapidă ale blocului limitate pe axe (`limit_value_by_axis_maximum`:
  minimul lui max_axă / |u_axă|); viteza nominală = rapida pentru G0, altfel avansul tăiat la viteza rapidă a blocului
  (numărat: „blocuri limitate”), cel puțin avansul minim;
- **joncțiunea**: `cos θ = −u_prev · u`; peste 0,999999 viteza minimă, sub −0,999999 nelimitată, altfel
  `v² = a_j · $11 · sin(θ/2) / (1 − sin(θ/2))`, cu `a_j` limitat pe axe pe direcția `u − u_prev`; viteza maximă la intrare
  e minimul dintre joncțiune și vitezele nominale ale celor două blocuri; după un buffer gol, intrarea e 0;
- **fereastra (lookahead-ul)**: senderul ține bufferul serial plin, deci planificatorul e plin: inelul de 16 ține cel
  mult 15 blocuri (`plan_check_full_buffer`), iar un loc se eliberează doar când blocul care se execută e pregătit întreg
  în segmente (`plan_discard_current_block`). Blocul i își află deci viteza de ieșire cu blocurile i … i + 14 cunoscute,
  ultimul oprit la capăt: pasul înapoi din `planner_recalculate` pe fereastră, limitat înainte de intrarea lui + 2·a·L.
  Modelul ține în memorie doar fereastra;
- **timpul blocului**: profilul din `stepper.c` (`st_prep_buffer`), în aproximarea continuă: trapez dacă accelerarea și
  decelerarea încap, altfel triunghi cu vârful `v_p² = (2aL + v0² + v1²) / 2`;
- **arcele**: exact segmentarea din `mc_arc`: unghiul din `atan2` cu `ARC_ANGULAR_TRAVEL_EPSILON` (startul în capăt = cerc
  întreg), raza din I / J, `segmente = floor(|½·θ·r| / √($12·(2r − $12)))`, rotația aproximată cu corecția la al 12-lea
  segment, ultimul segment exact la capăt; zero segmente = o singură linie. Arcul cu capătul pe alt cerc (`error:33`) și
  cel cu 2r ≤ `$12` (rădăcină din negativ în firmware) sunt refuzate;
- **sincronizările** (bufferul se golește, mișcarea se oprește): G4, schimbarea stării axului (M3 / M4 / M5; M3 și M4 sunt
  stări diferite, deci și trecerea dintre ele) și a turației cu axul pornit (`spindle_sync`), răcirea (M8 / M9), sfârșitul
  (M2 / M30), după care modurile revin la G1, G90, G94, G54, axul și răcirea oprite (unitățile, F și S rămân);
- **pauza**: `delay_sec` numără pași de 50 ms, rotunjit în sus (`ceil(20 · P)`);
- **cititorul**, ca `protocol.c` și `gcode.c`: comentariile `( … )` (una neînchisă ține până la capăt) și `;`, spațiile și
  `/` ignorate, cel mult 79 de caractere utile (`error:11`); G0–G4, G17, G20 / G21, G61, G90 / G91, G91.1, G94, G40 / G49 /
  G80 / G54–G59, M2–M5, M8 / M9, M30, F, S, T, N, P. Refuzate, cu linia, ca pe controler: două coduri din același grup
  modal (`error:21`), valorile negative la F / S / P / T / N (`error:4`), T peste 255, N peste 10 000 000, pauza peste
  contorul de 16 biți, F lipsă sau 0 la un G1–G3 scris sau modal (`error:22`), cuvintele de axă cu G80 (`error:31`), arcul
  fără X / Y sau fără I / J, M7 (oprit din fabrică, `ENABLE_M7`), M6 (`error:20`). Refuzate fiindcă estimarea nu le știe:
  G18 / G19, G93, R, axa A (v1), orice alt cod. **M0 și M1** sunt refuzate amândouă (timpul omului): pe GRBL 1.1h, M1 e
  ignorat (`gcode.c`, „Optional stop not supported”), dar un program cu M1 e scris pentru o oprire; refuzul e prudent,
  ales, nu al sursei. Cititorul rămâne mai strict decât GRBL pe intrări pe care postul nu le scrie (K în G17, `G4 P1 X10`,
  caracterele de control);
- **plafonul** (T23): cel mult 10 000 000 de blocuri pe program (cu segmentele arcelor), apoi refuz cu linia: un `$$` cu
  `$12` foarte mic pe arce mari ar ține firul principal zeci de secunde.

**Ipotezele, scrise:** fereastra mereu plină: un sender lent, un USB întârziat sau legătura serială însăși lungesc timpul
real (la 115 200 baud trec cel mult ~575 de linii G1 de 20 de octeți pe secundă: contează doar la polilinii dense, la
avans mare); override-urile la 100 %; scula pornește din zeroul programului (0, 0, 0); fără temporizarea pașilor și fără
bufferul de segmente (~60 ms înaintea mișcării); fără `delay_ms($1)` din `st_go_idle` la fiecare oprire completă (25 ms
din fabrică: câteva sutimi de secundă pe programele noastre); dublă precizie, nu `float` pe 32 de biți: pe AVR, `20 · P`
în `float` poate urca pauza cu un pas (de exemplu `G4 P0.3`: 0,35 s, nu 0,30), iar `read_float` ține doar 8 cifre;
timpul de accelerare al axului e pauza programată, nu una măsurată.

**4. Secțiunile programului.** Eticheta IR primește `operatie` (cheia `<piesă>/<operație>`), lângă `element`. Postul
întoarce, lângă text, `sectiuni`: linia comentariului fiecărei etichete cu element sau operație, apoi finalul (retragerea,
M5), fără să atingă octeții (proba: aceleași mișcări fără `element` / `operatie` dau același text; placa 2 rămâne octet
cu octet). Estimarea primește liniile ca limite și întoarce câte o porțiune pe interval; rezumatul adună porțiunile pe
operație (o operație pe mai multe elemente sau instanțe are mai multe secțiuni), iar ce e înaintea primei secțiuni
(Z sigur, M3, pauza) și după ultima (finalul) e „restul”. Pe sculă: o singură sculă pe program până la schimbarea sculei
(etapa 3), deci rândul ei e tot jobul; forma e deja o listă.

**5. Rezumatul în dialogul exportului.** După Exportă, sub starea descărcării: timpul estimat al fișierului descărcat
(același SHA-256), mașina pe care s-a estimat (numele, sursa, vitezele și accelerațiile pe axe), avertismentul când
avansul cerut trece de viteza maximă a mașinii (numărate liniile programului, nu segmentele arcelor), tabelul pe operații
(cu restul și totalul: timp, tăiere, rapide) și cel pe scule; tabelele au nume, iar prima coloană e antetul rândului. **„Setările mașinii ($$)”**: un câmp în care owner-ul lipește răspunsul controlerului la `$$`; e un parametru al
exportului (schimbat, rezumatul vechi dispare), ține cât e deschisă pagina (și după închiderea dialogului), nu se salvează
(din etapa 3, senderul îl citește de la mașină). Un `$$` greșit nu oprește exportul: programul se descarcă, rezumatul spune
linia. Textele prin `t()`, en + ro, în dicționarul exportului (la cerere, cu dialogul); motivul unui refuz (linia din `$$`
sau din program) vine structurat, iar fraza e a interfeței; textul motivului rămâne al domeniului, în română, ca la
celelalte motive ale exportului.

**6. Pachetul.** Estimarea și citirea lui `$$` stau în bucata calculului exportului (`actiuniExportCalcul.ts`, adusă la
primul export), nu în pornire; poarta build-ului are câte un marcaj pentru fiecare (`LA_CERERE` din
`scripts/build-determinist.ts`): în bucata de pornire, build-ul pică. Fără worker: pe placa 2 (2 701 blocuri) estimarea
ia câteva milisecunde. Măsurat de recenzie: 500 000 de linii G1, 0,77 s; 50 000 de semicercuri (3,9 M blocuri), 1,2 s;
~0,3 µs pe bloc, deci la plafon ~3 s. Estimarea rulează înaintea descărcării, pe firul principal, ca exportul însuși, până
la bazinul de workere (etapa 4).

**7. Proba.** Scrise înaintea modelului: valorile pe hârtie (`test/unit/timp.test.ts`): T2 din placa 3 (200 mm la F1000:
12,1667 s cu a = 100; 24,8333 s pe implicite, unde $110 = 500 taie avansul), trapezul și triunghiul, G0 în diagonală
limitat pe axe, colțul de 90° (v_j² = √2 + 2), întoarcerea, fereastra (100 de segmente de 1 mm: 2,407036 s cu 15
blocuri, 2,362988 cu 16), arcul (78 de segmente), pauza (P2.001 = 2,05 s), sincronizările, plonjarea limitată pe Z,
cuantizarea, unitățile; `test/unit/rezumat.test.ts` (un program trecut prin post, pe hârtie: 11,394662 s; placa 2 pe
operații) și `test/unit/masina.setari.test.ts`. **Oracolul independent** (`test/oracles/timp.ts`, cu cazurile lui pe
hârtie în `timp.cazuri.ts`) l-a scris o sesiune separată, fără acces la `src/`, din codul GRBL; deși felia e R2 (regula
din `PLAN.md` §4.1 cere asta pentru R3), defectul ediției întâi era chiar autoconsistența. Aplicația și oracolul se compară
pe un corpus (`test/unit/timp.oracol.test.ts`): plăcile 1 și 2 pe două mașini și 300 de programe aleatoare pe profile
aleatoare (fereastra 1–35, `$11`, `$12`, pașii; M3 / M4 / M5, S, M8 / M9, G4, G91, G20, M30 la mijloc): abaterea
relativă cea mai mare, ~10⁻¹⁴, pe ~500 000 de blocuri; aplicația trece și cele 16 cazuri pe hârtie ale oracolului și
refuză tot ce refuză el. Sabotajele: `test/otravuri/timp.py`.
- **Recenzia** (un verificator adversarial, 18.10): niciun defect mare; remediate, cu proba lor: M3 → M4 golește bufferul,
  M2 / M30 resetează modurile, o probă pe hârtie cu două operații (o rotire a timpilor pică), refuzurile ca pe controler
  (linia lungă, valorile negative, `/` și paranteza ca în `protocol.c`), liniile limitate numărate pe linii, plafonul de
  blocuri, motivul structurat, tabelele accesibile; scrise aici: ipotezele legăturii seriale și ale lui `$1`, M1.

## Consecințe

- Owner-ul vede timpul înainte să taie, pe mașina lui dacă lipește `$$`; cu implicitele din fabrică, timpul e cel al unui
  GRBL neconfigurat (avansul de 1 000 mm/min tăiat la 500), spus pe față în dialog.
- Senderul (etapa 3) primește un model gata: timpul rămas = estimarea liniilor netrimise, iar `$$` citit de la mașină
  înlocuiește câmpul lipit.
- grblHAL și FluidNC au alt planificator (bufferul mai mare, alte joncțiuni): un profil nou, cu `blocuriPlanificator` al
  lor, și o probă a diferențelor, înaintea contractelor lor (etapa 3, felia 3.8).

## Ce rămâne

- **Comparația cu cronometrul**, cu toleranța ±10 % (`PLAN.md` §5.3, placa 4): placa 2 (tăiată cu senderul de azi al
  owner-ului; cronometrul și `$$`-ul mașinii) și placa 3 (T2: 12,0 ±0,5 s și pauza de 2,0 ±0,3 s, prin senderul nou).
  Dacă diferența trece de 10 %, ipotezele de la punctul 3 se iau pe rând (fereastra, segmentarea, temporizarea pașilor).
- Timpul de schimbare a sculei și pauzele omului (M0) nu se pot estima; vin cu barierele senderului.
