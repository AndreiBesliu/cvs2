# ADR 0083: Postul familiei GRBL: contractele grblHAL și FluidNC, inch, elicea și schimbarea sculei

**Starea:** acceptat pe 26.10.2026. Felia 3.8a, la cererea owner-ului („Da, pornește 3.8: postul, cu contractele grblHAL și
FluidNC și schimbarea sculei (blocul de după M6), probat pe emulator.”). **Continuă:** ADR 0009 (T9: un singur post, condus de
contracte ca date), ADR 0008 (T8: IR-ul), ADR 0022 (T22: N axe), ADR 0080 (regula 6: bariera `M0` / `M1` / `M6` în sender),
ADR 0082 (jog-ul, zero-ul și palparea la oprire), `docs/PORTARE.md` §3.4 (blocul de după `M6` îl scrie postul). Sursa
faptelor: sonda s8 (`docs/faza2/sonde/s8-posturi/RAPORT.md`, §5 și Anexa A.1–A.3). **Documentul:** neschimbat.

**Completat de:** ADR 0084 (joburile cu mai multe freze din document; simularea nu mai refuză schimbările).

**Problema.** Postul scria doar GRBL 1.1, în mm, cu o singură sculă pe program: exportul refuza operațiile cu freze diferite
(„schimbarea sculei vine în etapa 3”). Planul (§5.3, punctul 4) cere familia GRBL întreagă, cu cele 4 strategii de schimbare
a sculei, pauza în unitatea controlerului, elicea și inch cu 5 zecimale.

## Decizia

**1. Contractele grblHAL și FluidNC sunt date** (`src/post/contracte/`), cu sursa fiecărui câmp, „documentate” până la proba
owner-ului pe controlerul axei A (T0, T1, T2, T4; `PLAN.md` §5.5, punctul 12). Față de GRBL 1.1: axa A declarată (v1 n-o
taie), M6 acceptat la controler (grblHAL cu `$341` între 0 și 3; FluidNC doar cu ATC sau `m6_macro`), linia lungă (256 / 255),
dar plafonul comun rămâne 70 (T9). În v1, cele trei dau același program, în afara comentariului `(post …)`: dialectul familiei
e același; diferă schimbarea sculei. Registrul `CONTRACTE` (`grbl-11`, `grblhal`, `fluidnc`) e ce oferă fereastra exportului.

**2. Contractul are câmpuri noi:** `zecimaleInch` (5), `unitati` (cuvântul G21 / G20, pus în antet în locul lui `{unitati}`),
`elice` (G2 / G3 cu Z, sau segmente G1) și `scula` (strategia implicită și cele acceptate). Pauza după pornirea axului era deja
în unitatea controlerului (`pauza.unitate`: s sau ms); toată familia GRBL o vrea în secunde.

**3. Inch:** opțiunea `unitati: 'inch'` scrie G20, coordonatele, I / J și Z-ul cu 5 zecimale, avansul în inch/min cu 3
zecimale (o zecimală ar rotunji 1000 mm/min la 39,4 in/min). Comentariile antetului rămân în mm (le citește omul). Garda de
coardă se socotește în rezoluția programului (10⁻⁵ inch); raza maximă și toleranța segmentelor rămân în mm. Programul în mm nu
se schimbă cu niciun octet (fișierele de aur ale plăcilor rămân).

**4. Elicea doar unde contractul o declară:** altfel, un arc cu Z iese în segmente G1 pe elicea exactă, la cel mult 0,001 mm
(T2), numărate în `aproximari`, ca raza peste gardă. Toată familia GRBL o declară.

**5. Schimbarea sculei e un eveniment în IR** (`schimba-scula`, cu scula și turația ei; T8). Postul o traduce după strategie
(s8 §5.4):
- **`bariera-sender`** (implicit pentru toată familia, fiindcă aplicația are senderul ei): `T2 M6` pe linia lui, pe care
  senderul nu-l trimite niciodată (ADR 0080, regula 6; la GRBL 1.1, M6 ar da `error:20`);
- **`m6-controler`**: același text, M6 îl face controlerul (grblHAL, FluidNC; GRBL 1.1 nu-l acceptă);
- **`m0-comentariu`**: scula în comentariu, apoi `M0` (oprit și de senderul nostru; cu alt sender, la GRBL 1.1 jog-ul nu merge
  în Hold, s8 A.1);
- **`fisiere-separate`**: câte un program întreg pe sculă (`posteazaPeScule`: antetul, WCS-ul, axul cu turația ei, finalul);
  o parte fără tăieri nu devine fișier.

Antetul unui program cu schimbări spune strategia într-un comentariu (s8 §5.10, fișa de lucru), de exemplu „scula: oprire în
senderul CNC Vector Studio, M6 nu pleacă”. Numărul sculei e un întreg între 0 și 255 (GRBL: `error:38` peste).

**6. Blocul de după schimbare îl scrie postul** (PORTARE §3.4), cu ordinea întoarsă la primul pas: întâi starea modală
(antetul întreg, apoi WCS-ul), fiindcă palparea sau o comandă a omului pot lăsa G91 / G20, iar un `G0 Z5` în G91 ar urca relativ;
apoi Z sigur, axul cu turația noii scule și pauza. Înainte de oprire: Z sigur (dacă nu e deja) și M5. După: poziția XY nu se mai
știe (omul a mutat freza ca s-o schimbe), deci următoarea deplasare se scrie întreagă, iar F se scrie din nou la prima tăiere.

**7. Ce nu știe încă restul aplicației, refuză sau măsoară corect:** simularea refuză un program cu schimbări („o singură sculă
pe program”), în loc să taie a doua parte cu diametrul primei; ieșirea din foaie măsoară discul sculei de atunci. Jobul CAM
dă încă o singură sculă: joburile cu mai multe freze din document vin în 3.8b.

**8. Fereastra exportului** are **Postul** (GRBL 1.1, grblHAL, FluidNC) și **Unitățile** (mm, inch). Un post cu vreun câmp
neprobat pe mașină poartă o notă („scris după documentația controlerului, încă neprobat: urmărește primul program în aer”):
deocamdată, toate trei.

## Probele

- pe hârtie: contractele (plafonul, zecimalele, unitățile, strategiile, codurile scrise de post, sursele; GRBL 1.1 fără M6 la
  controler); același program pe cele trei contracte, diferit doar la `(post …)`; inch (G20, punctul (20, 20) e X0.78740
  Y0.78740, Z0.19685, F39.370, un arc cu I0.50000), apoi fiecare cuvânt al unui program cu arce egal cu cel în mm împărțit la
  25,4, în rotunjirea fiecăruia; elicea (G3 cu Z, sau segmente G1 la 0,001 mm de ea, cu Z descrescător); pauza în ms pe un
  contract în ms; bariera (exact liniile de dinainte și de după `T2 M6`, Z sigur scris o singură dată, XY și F scrise din nou),
  M0 cu comentariu, M6 la controler (refuzat pe GRBL 1.1, scris pe grblHAL), fișierele separate (două programe întregi, refuzul
  prin `posteaza`, schimbarea la început, contractul fără fișiere separate, turația greșită numită cu scula), numărul sculei;
  ieșirea din foaie cu discul noii scule, refuzul simulării;
- pe emulator: 300 de arce aleatoare în inch (raze de 0,5–400 mm), zero `error:33` după rotunjire, același capăt ca în mm;
- prin sesiune, pe mașina simulată: un program cu două scule se oprește la `T2 M6` cu axul oprit (bariera și M0), noua sculă
  (cu 3 mm mai lungă) se palpează la oprire (Z0 −45 → −42), Continuă trimite blocul de după și tăierile noii scule, M6 nu pleacă
  niciodată, freza ajunge la Z −37 al mașinii (−42 + 5); fișierele separate, unul după altul, cu palparea între ele;
- e2e: grblHAL în inch, din fereastra exportului (antetul, 5 zecimale, mișcările plăcii 1 A împărțite la 25,4, nota postului);
- mutațiile țintite: 30 / 31 pe post, contracte, ieșirea din foaie și simulare (F ținut minte peste schimbare: prins de o probă
  nouă, cu același avans înainte și după), apoi 31 / 31; pe fereastră, 4 / 4 prinse de e2e (postul și unitățile pierdute în
  dialog, în aplicație, în calcul; nota ascunsă).

## Limitele

- Nimic din contracte nu e probat pe fier: GRBL 1.1 pe placa 3 (3.9), grblHAL și FluidNC pe controlerul axei A al owner-ului.
- Jobul cu mai multe scule din document, simularea și estimarea peste schimbări, alegerea strategiei și fișierele separate în
  interfață: 3.8b.
- Celelalte patru contracte (NcStudio, RichAuto, Syntec, Mach3 / Mach4) vin cu pachetul atelierelor.

## Respinse

- **Blocul de după în ordinea din PORTARE (întâi Z sigur, modalul la sfârșit):** un G91 lăsat de om ar face din `G0 Z5` o urcare
  relativă.
- **Fișiere separate implicit pentru GRBL 1.1** (s8, pentru un sender străin): aplicația are acum senderul ei, care oprește la
  `M6`; fișierele separate rămân o alegere.
- **Avansul în inch cu o zecimală:** 0,07 % pe avans, gratuit de evitat.
