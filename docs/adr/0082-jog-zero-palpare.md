# ADR 0082: Jog-ul, zero-ul, WCS-ul și palparea Z, întâi pe mașina simulată

**Starea:** acceptat pe 26.10.2026. Felia 3.7a, la cererea owner-ului („Da, pornește 3.7: jog, zero XY / Z, palparea Z cu placa
de contact și G54–G59, întâi pe mașina simulată.”). **Continuă:** ADR 0020 (T20), ADR 0080 (fluxul senderului: regulile 6, 7, 9
și 11), ADR 0081 (sesiunea și panoul). **Schimbă:** ADR 0079 (emulatorul: jog-ul, palparea pe o placă simulată, `error:9` în
Jog, `WCO:` în rapoarte), ADR 0081 §4 (panoul primește poziționarea) și limita lui („jog-ul, zero-ul și palparea vin în 3.7”).
**Documentul:** neschimbat.

**Problema.** Panoul trimitea programul, dar omul nu avea cum să aducă freza la origine, să facă zero și să găsească fața
materialului fără să scrie G-code de mână. Ediția întâi a greșit aici de trei ori (`docs/PORTARE.md` §3.5, `LECTII.md`): zero-ul
apăsat în Alarm pleca și primea `error:9` tăcut; zero-ul se scria în WCS-ul activ (G55) cât programul tăia în G54; jog-ul pe
diagonală era o scară de două mișcări.

## Decizia

**1. Procedurile sunt pure** (`src/machine/proceduri.ts`), ca fluxul: comenzile se construiesc și pașii palpării înaintează pe
răspunsuri, fără port și fără timp.
- **Jog-ul:** o singură linie `$J=G91 G21 X… Y… Z… F…` pentru toate axele cerute (diagonala e o dreaptă), incremental, în mm,
  fără să schimbe starea modală; pașii 0,1 / 1 / 10 / 100 mm, avansul ales (implicit 1000 mm/min, plafonat de controler).
  **Oprește jog-ul** trimite 0x85 (un octet de timp real, regula 9; mișcarea programului nu e atinsă).
- **Zero-ul:** `G10 L20 P<n> X0 Y0` sau `Z0`, scris explicit în WCS (P1 = G54 … P6 = G59), niciodată implicit în cel activ.
- **WCS-ul activ:** `G54`…`G59` trimis ca o comandă; poziția de lucru din raport se arată în el.
- **Motivul refuzului** (`motivMiscare`), înainte de orice octet: neconectat, o procedură în curs, o lucrare în curs, niciun
  raport, alarmă (întâi `$X`), mașina în mișcare. G-code-ul (zero, WCS, palpare) cere Idle; jog-ul merge și în Jog (GRBL
  planifică jog-urile unul după altul). Oprit la o barieră (schimbarea sculei), se pot jog-ul, palparea și zero-ul Z, nu zero-ul
  XY și nici alt WCS: restul programului s-ar muta.

**2. Palparea Z** cu placa de contact, în pași:
1. `$G` (starea modală: mișcarea, unitățile, modul distanțelor) și `$#` (`G92` și `TLO` pe Z);
2. căutarea, `G91 G21 G38.2 Z-<distanța> F<avans>` (implicit 30 mm, 100 mm/min);
3. retragerea, `$J=G91 G21 Z2 F500`;
4. atingerea fină, `G91 G21 G38.2 Z-3 F25`;
5. `G10 L2 P<n> Z<atins − grosime − G92 − TLO>`: din punctul atins (`PRB`), nu din locul unde s-a oprit freza (depășirea
   frânării nu intră), cu decalajele active scoase, ca Z0 de lucru să fie exact pe fața pe care stă placa;
6. ridicarea, `$J=G91 G21 Z5 F500`.

Eșecurile au motivul lor: ALARM:4 (freza atingea deja placa), ALARM:5 (nicio atingere pe distanță), `error:N`, întreruptă
(altă alarmă, Ctrl-X, portul), citirea `$G` / `$#` neînțeleasă, parametrii în afara plajei (refuzați înainte de orice comandă:
grosimea ≤ 100 mm, distanța ≤ 300 mm, avansurile ≤ 2000 mm/min).

**Starea modală se pune la loc.** Palparea schimbă `G91`, `G21` și mișcarea (`G38.2`); la sfârșit (și după un eșec, de îndată
ce mașina e iar Idle, deci după o alarmă abia după `$X`) sesiunea trimite mișcarea, unitățile și distanțele de dinainte
(`G0 G21 G90`; o mișcare G2 / G3 / G38.x devine G0, fiindcă fără axe ar fi o eroare). Un `$J=` n-ar fi schimbat nimic, dar
`G38.2` nu există ca jog.

**3. Sesiunea leagă procedurile de flux** (`sesiune.ts`): comenzile pleacă pe canalul manual (regula 7), cu id-uri `#…`, una
singură odată; cât ține o procedură, alta și pornirea programului se refuză în jurnal, cu motivul. **G-code-ul procedurii
pleacă doar pe un Idle proaspăt** (un raport Idle venit după ultimul răspuns): `ok`-ul unui jog vine la planificare, nu la
capăt, iar GRBL 1.1 refuză G-code-ul cât ține jog-ul (`error:9`; prins de emulator la prima rulare a palpării). O alarmă, o
repornire a controlerului sau portul pierdut încheie procedura.

**4. WCS-ul activ se citește, nu se presupune** (regula 11): sesiunea trimite singură `$G` (fără să-l scrie în jurnal) la
conectare, după bannerul unei reporniri (GRBL se întoarce în G54), după un program (`M2` / `M30` îl readuc la G54) și după o
comandă G-code a omului; un `$G` cerut de om îl actualizează și el. Citirea pleacă doar pe un Idle proaspăt, fără nimic la coadă.
Comenzile încă la coadă când portul se închide primesc „pierdut” (nu pleacă pe portul următor; ADR 0080, regula 4).

**5. Ținta zero-ului și a palpării este WCS-ul programului încărcat** (cel în care va tăia), altfel cel activ; numele lui stă pe
butoane („Zero XY (G55)”, „Palpează Z (G55)”). Dacă diferă de WCS-ul activ, panoul o spune și oferă **Treci pe G55**. Lângă
zero stă Z0-ul declarat de programul exportat (comentariul postului: „origine stanga-jos, Z0 sus”): fața de sus a materialului
(placa pe material) sau cea de jos (placa pe masă), plus colțul originii XY; un program străin nu-l declară, iar panoul spune
asta.

**6. Mașina simulată** are o placă de contact la Z −25 (al mașinii): de la pornire, palparea implicită atinge, iar cu distanța
sub 25 mm dă ALARM:5. Emulatorul trimite acum `WCO:` ca GRBL 1.1 (în primul raport, în cel de după o schimbare a decalajului,
apoi la 10 rapoarte în repaus și la 30 în mișcare): fără el, panoul ar arăta doar poziția mașinii, iar un zero n-ar schimba nimic
pe ecran.

## Probele

- pe hârtie: jog-ul (diagonala, nimic de mișcat, nefinit, avansul, limita de 70 de octeți la egalitate), zero-ul în fiecare WCS,
  citirile (`$G`, `PRB` pe N axe, `$#`), tabelul motivelor pe faze și stări, pașii palpării cu `G92` 1,5 și `TLO` 0,5
  (`G10 L2 P2 Z-47.010` din atingerea la −25,010 și grosimea 20), marginile parametrilor, fiecare eșec, restaurarea;
- prin sesiune, pe emulator: WCS-ul citit la conectare fără jurnal; jog-ul pe diagonală și anularea lui (oprit pe loc); totul
  refuzat în alarmă, nimic trimis; zero-ul XY în G55 (`$#`: G55 = poziția, G54 neatins), apoi G55 activ, apoi o comandă `G56` a
  omului recitită; palparea de la Z 0 (exact cele 8 linii primite, G54 Z = −45, freza la −20, adică +25 de lucru, `G0 G21 G90`
  la loc); palparea cu `G92 Z10` și `G20 G91` lăsate de om (G54 Z = −35, tot +25 de lucru, `G20 G91` la loc); fără placă
  (ALARM:5, restaurarea abia după `$X`); freza pe placă (ALARM:4); pornirea refuzată și deconectarea în timpul palpării; WCS-ul
  recitit după un program în G55 și după Ctrl-X;
- emulatorul: G-code-ul în Jog dă `error:9`, jog-urile următoare se planifică; ciclul `WCO:`; fluxul: 0x85 în orice fază, fără
  socoteală; coada pierdută la deconectare;
- e2e (Edge, mașina simulată): Z0 declarat de export, jog pe diagonală, zero XY (poziția de lucru 0), palparea (Z0 scris, +25),
  apoi programul până la „gata”; palparea fără atingere (motivul, butoanele dezactivate, `$X`, restaurarea), un program în G55
  (nepotrivirea, „Treci pe G55”); în engleză.
- mutațiile țintite: 55 / 59 la prima rulare pe procedurile, sesiunea, emulatorul, fluxul și mașina simulată; două echivalente
  (citirile interne oprite și în timpul unei proceduri; refuzul fluxului pentru o comandă a procedurii, de neatins), scoase din
  cod; două prinse de probe noi (o repornire cât un zero așteaptă Idle-ul: zero-ul nu mai pleacă; un port fără banner: WCS-ul se
  citește tot); pe panou, 4 / 4 prinse de e2e (ținta zero-ului în WCS-ul activ, Z0 greșit, motivul ascuns, jog-ul activ în
  alarmă).

## Limitele

- Totul e probat pe emulator, nu pe mașină: frânarea, ordinea `PRB` / `ok` și timpii reali se verifică pe prima placă (3.7b, cu
  placa de contact a owner-ului; transcrierile, 3.5b).
- Jog-ul e cu pași; jog-ul continuu (cât ții apăsat, cu 0x85 la eliberare) și tastele lui vin cu interfața atelierului.
- Blocul de după `M6` îl scrie postul (PORTARE §3.4): felia 3.8.

## Respinse

- **Zero-ul în WCS-ul activ, cu un avertisment**: exact greșeala ediției întâi; ținta e WCS-ul programului.
- **`G10 L20 Z<grosime>` după atingere** (cum fac multe sendere): ar include depășirea frânării și ar depinde de unde s-a oprit
  freza; `L2` din `PRB` e exact.
- **Palparea fără restaurare** („programele își pun singure modul”): un `G0 Z5` scris de om după palpare ar urca 5 mm relativ.
