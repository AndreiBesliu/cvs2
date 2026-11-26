# Atelierul Easy 3Draw: piese, prinderi, construcții, decorațiuni (3.Ca–3.Cl și 3.Tu; ADR 0284, ADR 0283, ADR 0285)

_Linia pieselor noi, a punctelor de prindere și a Modelului ca asamblare, în atelierul Easy 3Draw. Pornită pe 24.11.2026,
la cererea owner-ului („vreau sa adaugi mai multe tipuri de piese pentru fiecare categoire […] compatibile intre ele nu
doar una cate una ci si ca constructii complexe”), în sesiunea cloud a liniei bibliotecii: aceeași ramură,
`wip/3.Xh-biblioteca-ui`, același canal, `biblioteca`. ADR 0284, acceptat pe 24.11 cu toate recomandările (1a–4a).
**Din 24.11 seara, linia ține și lucrul elicelor** (predat la cererea owner-ului; istoria și capcanele lor rămân în
[elice.md](elice.md), secțiunea „Predarea”): felia **3.Tu** (piesele rotunde pe același ax în „Modelul”, ADR 0283),
acceptată de owner pe 25.11 cu 1a, 2a, 3a („1a, 2a, 3a la 3.Tu, pornește”) și făcută în aceeași zi.
Starea: **3.Ca (conectorul perpendicular, Easy 3Draw 18.24.0) și 3.Cb (conectorul în unghi, axul cu opritor, știftul cu
bucșă; 18.25.0), unite în `main` cu lotul 28 (`11877a3e`); 3.Cc (cremaliera; 18.26.0) și 3.Cd (arcul; 18.27.0),
unite în `main` pe 25.11 (`9815527f`); 3.Ce (punctele de prindere și „Se prinde cu”; 18.28.0), unită în `main` pe
25.11 (`38ff9391`, PR-ul `AndreiBesliu/cvs2#28`); 3.Cj-1 (cama; 18.29.0) și 3.Cj-2 (roata cu palete; 18.30.0), unite
în `main` pe 25.11 (`e90edd2e`, PR-ul `AndreiBesliu/cvs2#29`); 3.Cj-3 (cadrul; 18.31.0) și 3.Cj-4 (șurubul melc;
18.32.0), unite în `main` pe 25.11 (`36559b49`, PR-ul `AndreiBesliu/cvs2#33`). Cu melcul, 3.Cj e încheiată. 3.Tu
(piesele rotunde pe același ax în „Modelul”; 18.33.0), unită în `main` pe 25.11 (`f5cf10c8`, PR-ul
`AndreiBesliu/cvs2#45`). 3.Cf-1 (alipirea la prinderi, cu piesele legate; 18.34.0), unită în `main` pe 25.11
(`02ac0715`, PR-ul `AndreiBesliu/cvs2#46`). **Decorațiunile de Crăciun (ADR 0285, cerute de owner pe 25.11 și acceptate cu
recomandările, 1a–4a): 3.Cl-1 (fulgul, steaua și brăduțul, în fila nouă „Crăciun”; 18.35.0), unită în `main` pe 26.11
(`41b1fb6f`, PR-ul `AndreiBesliu/cvs2#50`); 3.Cl-2 (globul; 18.36.0), unită în `main` pe 26.11 (`b6c9998d`, PR-ul
`AndreiBesliu/cvs2#53`); 3.Cl-3 (ornamentul cu nume; 18.37.0) și 3.Cl-4 (brăduțul LEGO; 18.38.0), gata pe ramură pe
26.11 (PR-ul `AndreiBesliu/cvs2#55`, raportat): ADR 0285 are toate feliile făcute.** **3.Cf-2 (răsturnările și jumătățile de
pas în „Modelul”; 18.39.0), gata local pe 26.11, neîmpinsă cât PR-ul #55 își așteaptă unirea.**
Urmează 3.Cg (verificarea); 3.Ck așteaptă tipărirea bilei și a cupei. Versiunea
următoare a pachetului: 18.40.0._

## Numerele liniei

- **ADR-urile:** 0280–0289 sunt ale pluginului (0280 roțile, 0281 filele, 0282 elicele, **0283 pentru 3.Tu**, **0284
  construcțiile**, **0285 decorațiunile de Crăciun**); sesiunea principală a dat liniei și intervalul **0340–0349**,
  pentru ADR-urile de după.
- **Feliile:** 3.Ca–3.Cj (planul din ADR 0284, zece felii: literele rămase după 3.Tu, v–z, nu ajungeau) și 3.Tu.
  Sesiunea principală propusese „de la 3.Tv” înainte să afle că ADR-ul fusese deja acceptat de owner ca 0284, cu feliile
  3.C; numerotarea rămâne de confirmat cu ea la unirea lui 3.Ca (dacă cere 0340 și 3.Tv…, redenumirea e mecanică).

## Planul (ADR 0284)

| # | Felia | Starea |
|---|---|---|
| 3.Ca | Conectorul perpendicular | gata (24.11) |
| 3.Cb | Conectorul în unghi; axul cu opritor, știftul cu bucșă | gata (24.11) |
| 3.Cc | Cremaliera | gata (24.11); melcul a trecut în 3.Cj |
| 3.Cd | Arcul | gata (25.11) |
| 3.Ce | Punctele de prindere și „Se prinde cu” | gata (25.11) |
| 3.Tu | Modelul: piesele rotunde pe același ax (ADR 0283) | gata (25.11); acceptată de owner cu 1a, 2a, 3a |
| 3.Cf | Modelul: orientarea pe trei axe și alipirea la prinderi | 3.Cf-1 (alipirea, cu piesele legate), gata (25.11); 3.Cf-2 (răsturnările, jumătățile de pas), gata (26.11) |
| 3.Cg | Modelul: verificarea (prins, plutește, se ciocnește) | avertisment, nu refuz (răspunsul 2a) |
| 3.Ch | Construcțiile cu nume și lista lor de piese | |
| 3.Ci | Construcțiile gata (șasiul, cutia de angrenaje, brațul de macara, barca cu elice) | după Model (răspunsul 3a) |
| 3.Cj | Melcul, cama și manivela, cadrul, roata cu palete | pe bucăți: 3.Cj-1, cama, 3.Cj-2, roata cu palete, 3.Cj-3, cadrul, și 3.Cj-4, șurubul melc: gata (25.11) |
| 3.Ck | Balamaua și placa turnantă | despărțite de 3.Cd; după ce owner-ul încearcă primele piese pe imprimantă |
| 3.Cl | Decorațiunile de Crăciun (ADR 0285) | 3.Cl-1 (fulgul, steaua, brăduțul) și 3.Cl-2 (globul, relieful pe două înălțimi), gata (25.11); 3.Cl-3 (ornamentul cu nume) și 3.Cl-4 (brăduțul LEGO), gata (26.11) |

## 3.Ca, gata (24.11, în cloud): conectorul perpendicular

- **Unde e:** motorul, `conector` în `extensii/trenulet/sursa/lego/lego.ts` (lângă `bucsa`); atelierul, în `atelier.ts`:
  `stare.conector`, `FAMILII` (Legături), `PICTOGRAME`, `CONECTORI` (formele gata), `coduriConector` (îndreptarea codurilor,
  aceeași ca în motor), `numeDef`, editorul (`t === "conector"`); stilul, în `head.html` (`#at-co-pasi`, `#at-co-repede`).
- **Datele piesei:** `gauri`, câte un cod pe pas: felul (`r` știft, `x` ax, `p` plin) și axa (`v` în sus, `o` de-a latul,
  `l` în lung, doar la capete): `["xl", "rv", "ro"]` e colțul pe trei axe.
- **Probele:** `test/unit/trenulet.conector.test.ts`, `test/e2e/trenulet.conector.spec.ts`; otrăvurile,
  `test/otravuri/3.Ca.py`.

## 3.Cb, gata (24.11, în cloud): conectorul în unghi, axul cu opritor, știftul cu bucșă

- **Unde e:** motorul, `conectorUnghi` (după `conector`), `ax` (cu `opritor`) și `stiftTechnic` (cu `capat: "bucsa"`), în
  `lego.ts`; atelierul, în `atelier.ts`: `stare.conectorUnghi`, `FAMILII`, `PICTOGRAME`, `CONECTORI_UNGHI` (formele gata),
  `mansoaneUnghi` (îndreptarea brațelor, aceeași regulă ca în motor), `numeDef`, `defCurenta`, editorul
  (`t === "conectorUnghi"`), bifa `at-a-opritor`, capătul „Bucșă” (`at-s-capat`); stilul, în `head.html` (`#at-cu-brate`,
  `#at-cu-repede`, `.at-unghi`).
- **Datele pieselor:** `mansoane`, câte o pereche pe braț, `[unghiul în grade, felul]` (`x` de ax, `r` de știft), primul
  la 0°; `butuc` (`r` implicit, nescris; `x`, `p`). La ax, `opritor: true` (nescris când lipsește); la știft,
  `capat: "bucsa"`.
- **De ce cel puțin 90° între brațe:** brațele sunt late cât butucul (7,8), iar manșonul începe la 4 mm de centru; sub
  90°, colțul unui manșon cade în brațul vecin. Conectorii LEGO numerotați au aceeași plajă (90°–180°).
- **Probele:** `test/unit/trenulet.unghi.test.ts`, `test/unit/trenulet.opritor.test.ts`, `test/e2e/trenulet.unghi.spec.ts`;
  otrăvurile, `test/otravuri/3.Cb.py`. Ajutoarele comune ale probelor pe plase: `test/unit/ajutor-plasa-lego.ts`.

## 3.Cc, gata (24.11, în cloud): cremaliera

- **Unde e:** motorul, `cremalieraCote` și `cremaliera` (după `rotita`), cu `Lego.cremalieraMontaj` pentru atelier;
  atelierul: `stare.cremaliera`, `FAMILII` (Roți), `PICTOGRAME`, `numeDef`, `defCurenta`, editorul
  (`t === "cremaliera"`, câmpurile `at-crm-…`), `adaugaPerecheCremaliera`.
- **Datele piesei:** `lung` (2–24), `modul` (nescris când e 1), `prindere` (`stifturi` sau `gauri`), `roata` (dinții
  roții pereche: de ea ține înălțimea piesei).
- **Probele:** `test/unit/trenulet.cremaliera.test.ts` (cu angrenarea pe plase: `patrundere`), 
  `test/e2e/trenulet.cremaliera.spec.ts`; otrăvurile, `test/otravuri/3.Cc.py`.
- **Melcul** a venit în 3.Cj-4 (mai jos), cu amândouă diametrele de divizare (8 mm, pe grila LEGO, cu miezul subțire, și
  16 mm) și cu proba de angrenare pe plase, ca a cremalierei.

## 3.Cd, gata (25.11, în cloud): arcul

- **Unde e:** motorul, `arcCote` și `arc` (înaintea lui `lateral`), cu `Lego.arcCote` pentru atelier; atelierul:
  `stare.arc`, `FAMILII` (Cărămizi), `PICTOGRAME`, `ARCE` (mărimile uzuale), `numeDef`, `defCurenta`, editorul
  (`t === "arc"`, câmpurile `at-arc-…`).
- **Datele piesei:** `lung` (3–16), `inalt` (1–4, în cărămizi), `bolta` (`joasa`; nescrisă când e cea înaltă).
- **Probele:** `test/unit/trenulet.arc.test.ts`, `test/e2e/trenulet.arc.spec.ts`; otrăvurile, `test/otravuri/3.Cd.py`.

## 3.Ce, gata (25.11, în cloud): punctele de prindere și „Se prinde cu”

- **Unde e, în motor (`lego.ts`):** tipul `Prindere` și `Corp` (sus); ajutoarele, în secțiunea „prinderile” (înaintea
  corpurilor): `FELURI_PRINDERI`, `PERECHI` și `sePrind`, `prinGaura` (cele două guri ale unei găuri care trece),
  `axePrinderi` și `mutaPrinderi` (prinderile, duse cu plasa), `bratCruce`, `prinderiButuc` (gaura din mijlocul unei
  roți), `prinderiFata` (găurile de știft de pe fața unei roți), `montaj`, `rezumatPrinderi`, `perechiFeluri`,
  `axPentru`, `stiftPentru`. Fiecare piesă își face lista lângă plasa ei și o întoarce în `prinderi`; `construieste` o
  mută în origine, cu plasa.
- **Unde e, în atelier (`atelier.ts`):** secțiunea „Se prinde cu” (înaintea lui `arataPrivita`): `NUME_PRINDERI`,
  `prinderiCurente` (ale piesei de pe ecran, puse de `construiesteCurent`), `prinderiPiesa` (ale altei piese, ținute
  minte până i se schimbă definiția sau calibrarea), `grindaPereche`, `randeazaPrinde`, `deschidePrinsa`,
  `adaugaGrindaPereche`; `defCurenta(tip)` dă acum definiția oricărui tip, nu doar a celui de pe ecran. Marcajul:
  `<details id="at-prinde">` în `body.html`; stilul, `.at-prinde…` în `head.html`.
- **Convenția unei prinderi** e scrisă la tipul `Prindere` și în capul probei; pe scurt: tatăl își dă rădăcina, mama
  gura; `d` iese din piesă; montate, `p` coincid și `d` sunt opuse.
- **Probele:** `test/unit/trenulet.prinderi.test.ts` (mostrele `MOSTRE`, proba pe plasă `peMasa`, perechile montate
  `patrund`), `test/unit/trenulet.plasa-ajutor.test.ts` (înfășurarea pe grilă față de cea completă),
  `test/e2e/trenulet.prinderi.spec.ts`; engleza panoului, în proba limbii din `trenulet.spec.ts`; otrăvurile,
  `test/otravuri/3.Ce.py`.
- **Ce a rămas pentru feliile Modelului:** rotirea în jurul axei unei prinderi e liberă (`unghi`): clema pe un mâner
  trebuie întoarsă cu 180°, altfel plăcile se pătrund; 3.Cf o alege din verificare, nu din convenție. Axele și barele
  alunecă: montajul le pune „până la capăt” (rădăcina pe gură), iar Modelul va lăsa omul să le tragă.

## 3.Cj-1, gata (25.11, în cloud): cama

- **Unde e:** motorul, `camaCote`, `conturCama` și `cama` (după `cremaliera`), cu `Lego.camaCote` pentru atelier;
  atelierul: `stare.cama`, `FAMILII` (Roți), `PICTOGRAME`, `numeDef`, `defCurenta`, editorul (`t === "cama"`, câmpurile
  `at-cam-…`).
- **Datele piesei:** `forma` (`excentric`, `para`, `melc`), `diam` (diametrul de bază, 10–64), `cursa` (1–24), `grosime`
  (1–20), `gaura` (`x`, `r`).
- **Probele:** `test/unit/trenulet.cama.test.ts` (raza pe plasă: `masurata`, față de `hartie`), 
  `test/e2e/trenulet.cama.spec.ts`; otrăvurile, `test/otravuri/3.Cj-1.py`.
- **Ce urmează în 3.Cj:** roata cu palete (gata, mai jos), cadrul (cărămida cu gol), melcul (cu proba de angrenare pe
  plase, ca la cremalieră; de hotărât întâi diametrul de divizare).

## 3.Cj-2, gata (25.11, în cloud): roata cu palete

- **Unde e:** motorul, `PALETE`, `roataPaleteCote`, `conturPaleta` și `roataPalete` (după `cama`), cu
  `Lego.roataPaleteCote` pentru atelier (dă și `incap`, câte palete încap la diametrul și forma cerute); atelierul:
  `stare.roataPalete`, `FAMILII` (Elice), `PICTOGRAME`, `numeDef`, `defCurenta`, editorul (`t === "roataPalete"`,
  câmpurile `at-rp-…`).
- **Datele piesei:** `diam` (24–160), `palete` (4–24, dar cel mult câte încap), `lat` (4–40), `forma` (`drepte`,
  `curbate`), `disc` (`unul`, `fara`), `gaura` (`x`, `r`).
- **Probele:** `test/unit/trenulet.palete.test.ts` (`peCerc`: bucățile de lemn de pe un cerc din jurul axului, câte
  sunt și cât ține cea mai lată), `test/e2e/trenulet.palete.spec.ts`; otrăvurile, `test/otravuri/3.Cj-2.py`.
- **Ce urmează în 3.Cj:** cadrul (gata, mai jos), apoi melcul.

## 3.Cj-3, gata (25.11, în cloud): cadrul (fereastra)

- **Unde e:** motorul, `cadruCote` și `cadru` (după `arc`), cu `Lego.cadruCote` pentru atelier; atelierul:
  `stare.cadru`, `FAMILII` (Cărămizi), `PICTOGRAME`, `numeDef`, `defCurenta`, `CADRE` (mărimile uzuale), editorul
  (`t === "cadru"`, câmpurile `at-cad-…`).
- **Datele piesei:** `lung` (2–8), `inalt` (2–6 cărămizi), `rama` (1,2–4 mm), `colturi` (`drepte`, `tesite`; în piesă
  doar când sunt teșite).
- **Probele:** `test/unit/trenulet.cadru.test.ts` (`hartie`: golul, teșitura și puntea pe hârtie),
  `test/e2e/trenulet.cadru.spec.ts`; otrăvurile, `test/otravuri/3.Cj-3.py`.
- **Ce urmează în 3.Cj:** melcul (gata, mai jos).

## 3.Cj-4, gata (25.11, în cloud): șurubul melc

- **Unde e:** motorul, `melcCote` și `melc` (după `cama`), cu `Lego.melcCote` și `Lego.melcMontaj` pentru atelier;
  `prismaStraturi` are opțiunea `elice` (fețele pe diagonala scurtă, pentru straturi rotite); atelierul: `stare.melc`
  (cu `pereche`, roata editorului), `FAMILII` (Roți, după cremalieră), `PICTOGRAME`, `numeDef`, `defCurenta` (scoate
  `pereche`), editorul (`t === "melc"`, câmpurile `at-mlc-…`), `adaugaPerecheMelc`.
- **Datele piesei:** `diam` (8 sau 16, diametrul de divizare), `lung` (1–4 știfturi). Modulul e 1 (pasul π), fix.
- **De ce subțierea:** spira e înclinată, dinții roții sunt drepți; fără ea, jocul pe o parte scade de la 0,30 la 0,21
  (Ø8) și 0,26 (Ø16). Cu 0,1 și 0,05 mm pe flanc, măsurat pe plase: 0,30–0,32. Un diametru nou își măsoară subțierea
  lui (studiul: `patrundere` din proba unitară, cu jocul căutat prin înjumătățire).
- **Probele:** `test/unit/trenulet.melc.test.ts` (`hartie`: profilul spirei; `patrundere`: roata motorului față de
  melc, pe plase, cu faza dată de locul de pe axul melcului), `test/e2e/trenulet.melc.spec.ts`; otrăvurile,
  `test/otravuri/3.Cj-4.py`.
- **LDraw 4716** (măsurat cu `scripts/ldraw/plat.py` și `sectiune.py`): Ø10,16 / Ø5,6, pasul 3,2 mm, spira pe dreapta.
- **3.Cj e încheiată.** Rămân din ADR 0284: 3.Cf–3.Ci (Modelul ca asamblare, la răspunsurile lui 3.Tu) și 3.Ck
  (balamaua, placa turnantă: după ce owner-ul tipărește bila și cupa).

## 3.Tu, gata (25.11, în cloud): piesele rotunde pe același ax în „Modelul”

- **Ce face:** în vederea „Modelul”, o piesă rotundă stă cu axul în mijlocul unui știft și se rotește în jurul lui; o
  piesă nouă intră cu pivotul cât mai aproape de al celei alese (două rotunde, pe același ax); rotorul și carcasa în
  care încape stau la același Z; „Înlocuiește în model” ține axul unei roți. Celelalte piese, ca până acum.
- **Unde e:** motorul, secțiunea „asezarea in model (ADR 0283)”, după `construieste`: `ROTUNDE` și `eRotunda` (care
  piese au ax), `asezareModel` (amprenta și pivotul; aici e și tabelul pieselor așezate după placa lor, mutat din
  atelier), `pivotModel`, `langaPivot`, `impreunaInModel`; `construieste(def).ax`. Atelierul: `corpModel` (amprenta și
  pivotul de la motor), `stiftAx` (știftul axului, pentru rânduri), `arataModel`, `mutaM` (rotirea în jurul axului),
  `puneInModel`.
- **Datele ținute nu s-au schimbat:** x, y sunt tot colțul amprentei (rotite), z plăcile, rot sferturile de tură. La o
  piesă rotundă, colțul se mută la rotire (axul rămâne), iar rândul ei spune știftul axului, nu colțul.
- **Probele:** `test/unit/trenulet.model.test.ts` (tabelul `ROTUNDE`: fiecare piesă rotundă, cu amprenta și axul pe
  hârtie; `DREPTE`: celelalte, față de formula v18) și `test/e2e/trenulet.model.spec.ts` (mărimea modelului, pe hârtie);
  otrăvurile, `test/otravuri/3.Tu.py` (111: motorul 64 / 64, atelierul 43 / 43 (40 la prima rulare; cele trei scăpate, prinse după întărirea probei), textele 4 / 4) și `3.Tu-en.py` (6 / 6 (5 la prima rulare)).
- **Ce n-a intrat:** „Fă ventilatorul” nu pune perechea și în model (propunerea din auditul elicelor); pașii de jumătate
  de știft (3.Cf); verificarea prinderii (3.Cg).

## 3.Cf-1, gata (25.11, în cloud): alipirea la prinderi în „Modelul”

- **Răspunsurile owner-ului** (25.11, la cele trei întrebări puse înaintea codului): întâi alipirea; prinderea se alege
  din puncte în vederea 3D (cu lista alături); **piesa alipită urmează baza** (nu era recomandarea).
- **Ce face:** piesa aleasă își arată prinderile (puncte și numere, pe feluri); una aleasă e ținta; „Alipește în model”
  pune piesa următoare cu prinderea ei pe țintă și o leagă de bază. Piesa prinsă: „Altă prindere”, „Alt loc pe bază”,
  „Rotește ↻”, „Glisează −/+” (doar pe o tijă), „Desprinde”. Desprinsă: pe grilă, dacă stă drept pe ea; altfel liberă.
- **Datele:** `InModel.prins` (`de`, `a`, `b`, `unghi`, `alunec`) și `InModel.liber` (`m`, `t`); x, y, z, rot rămân, ca
  loc de rezervă. Felul unei piese (pe grilă, prinsă, liberă) îl spune motorul (`Lego.rezolvaModel`), nu prezența
  câmpurilor: o legătură stricată lasă piesa „pe grilă”. Atelierul întreabă `asezari()`.
- **Unde e:** motorul, secțiunea „alipirea in model (ADR 0284, 3.Cf)”; atelierul, de la `asezari` la `puneInModel`
  (`lasaPeLoc`, `scoateM`, `tintaBuna`, `alegeTinta`, `punctePrinderi`, `inlocuiesteM`).
- **Scena:** fiecare plasă (mutată în origine, nemutată în pivot ca la 3.Tu) e pusă cu `applyMatrix4`; punctele stau în
  `v3.puncte`, în afara lui `v3.grup`, deci mărimea modelului nu le vede. Tipurile three.js folosite se declară în
  `globale.d.ts` (`Trei`).
- **Probele:** `test/unit/trenulet.alipire.test.ts` (15) și `test/e2e/trenulet.alipire.spec.ts` (7); otrăvurile,
  `test/otravuri/3.Cf-1.py` (132: motorul 53 / 53, cu 49 la prima rulare; atelierul 75 / 75; textele 4 / 4) și
  `3.Cf-1-en.py` (13 / 13). Listele lui 3.Tu au fost aduse la zi (scena nu mai mută plasa în pivot: otrăvurile ei sunt
  acum pe apelul `Lego.transfGrila` din `asezari`); cele 30 mutate, rulate din nou, toate prinse.
- **Ce n-a intrat:** orientarea de mână și jumătățile de pas (3.Cf-2); verificarea (3.Cg); „Fă perechea” și construcțiile
  gata nu pun încă piese legate în model.

## 3.Cl-1, gata (25.11, în cloud): fulgul, steaua și brăduțul (ADR 0285)

- **Cererea:** owner-ul, în sesiunea principală, pe 25.11 („Vreau ca sesiunea care lucreaza la plugin, sa faca si
  decoratiuni de craciun pentru imprimanta”); ADR 0285, propus cu o schiță și patru întrebări, acceptat în aceeași seară
  („Mergem cu recomandarile”). Feliile: 3.Cl-1…4.
- **Unde e:** motorul, secțiunea „decorațiunile de Crăciun”, înaintea calibrării (`semne`): `CRACIUN` (măsurile comune),
  `unesteForme` și `prismaUnite` (unirea formelor, cu golurile lor), `tijaRotunda`, `inelAgatat`, `tijaInel`,
  `gauraAgatat`, `campMarginit`, apoi `fulgCote` / `fulg`, `steaCote` / `stea`, `bradCote` / `brad`. Atelierul:
  `stare.fulg`, `stare.stea`, `stare.brad`, familia `craciun` din `FAMILII`, `FULGI` și `STELE` (cei gata făcuți),
  `fulgIntamplator`, `PICTOGRAME`, `numeDef`, `defCurenta`, editorul (`at-fg-…`, `at-st-…`, `at-bd-…`).
- **Datele pieselor:** în ADR 0285, „Implementat”. Steaua își ține colțurile în `varfuri` (`colturi` e al cadrului).
- **Probele:** `test/unit/trenulet.craciun.test.ts`, `test/e2e/trenulet.craciun.spec.ts`; otrăvurile,
  `test/otravuri/3.Cl-1.py` și `3.Cl-1-en.py`.

### Reguli și capcane (3.Cl-1)

- **O piesă plată nouă se face din forme unite, nu din corpuri suprapuse:** `unesteForme` dă un singur contur, cu
  golurile lui, deci greutatea scrisă e cea adevărată. Formele trebuie să se taie curat: un capăt drept pleacă din
  interiorul formei de care se leagă, iar niciun vârf nu stă pe latura altei forme (Cavalier dă atunci bucăți fără arie).
- **Ce întoarce Cavalier nu are sensul normalizat:** bucățile unui „not” vin și în sens orar; conturul se întoarce cu
  `spreStanga` (arcele își schimbă semnul și trec pe vârful dinainte). Două forme care se ating pe o latură dau și o
  bucată fără arie (se scot cu pragul de arie). `parallelOffset(+d)` strânge un contur trigonometric.
- **O polilinie Cavalier e marginea de afară, plină:** golurile se țin separat. Un gol închis la unirea cu o bucată
  pierde ce acoperă bucățile unite după ea, în același pas (proba „U”-ului cu bara dinăuntru).
- **Proba unei forme e modelul ei de pe hârtie, întrebat punct cu punct:** `caPeHartie` compară plasa cu regula scrisă
  în probă, în mii de puncte la întâmplare (mereu aceleași), sărind punctele de la mai puțin de 0,04 mm de o margine
  (arcele plasei sunt din laturi). A prins dintr-odată locul, unghiul, lungimea și lățimea fiecărei tije.
- **Măsurarea cu pasul de 0,01 mm dă ±0,01:** o lățime se compară cu 0,03 îngăduință, nu rotunjită la sutimi.
- **Gâtul dintre inel și piesă se măsoară, nu se presupune:** cu vârful la mijlocul peretelui, gâtul ieșea de 1,16 mm
  la linia de 1,2. Inelul a coborât (centrul la 1,9), iar pe vârfurile ascuțite stă pe o tijă.
- **„Cât mai sus” are nevoie de o margine de jos:** gaura de agățat își găsea loc deasupra trunchiului unui brad mic
  (bradul ar fi atârnat cu vârful în jos). Am văzut-o scriind otrăvurile, nu din probe: căutarea se oprește acum la
  ultimul etaj (la stea, la o treime din rază), iar piesa primește inelul.
- **Un nume care se schimbă după ce piesa e făcută din nou nu se citește imediat după clic:** proba „Alt fulg” își scrie
  numele așteptat din câmpuri (care se schimbă pe loc) și îl așteaptă; cu zarul adevărat, o expresie regulată trecea pe
  numele vechi.
- **Zarul se ține pe loc doar cât ține clicul, cu o valoare constantă** (`Math.random` pus înapoi în același `evaluate`):
  three.js îl folosește și el.
- **O filă nouă atinge:** tabela și lista filelor din `trenulet.file.spec.ts` (și starea scrisă înapoi a unei liste
  vechi), tabela și numărul desenelor din `trenulet.pictograme.spec.ts`, căutarea („fu” găsește și fulgul), lista filelor
  și drumul prin galerii din proba în engleză (`trenulet.spec.ts`: fila nouă merge prima, ca la capăt să rămână deschisă
  piesa de dinainte), `MOSTRE` (prinderile) și `DREPTE` (modelul).
- **Un cuvânt cu alt sens în altă parte își ia contextul:** „Gol” era „Empty”; miezul gol e `tr("Gol", "miez")`,
  „Hollow”.
- **Rândul din indexul ADR are patru celule** (a patra: etapa și starea): cu trei, build-ul se oprește.

## 3.Cl-2, gata (25.11, în cloud): globul (ADR 0285)

- **Unde e:** motorul, după `brad`: `GLOB_CATE`, `globCote`, `modelGlob` (formele modelului, în cercul dinăuntru) și
  `globCraciun` (în `TIPURI`, sub numele `glob`: `glob` e, în motor, numele obiectului global); atelierul:
  `stare.glob`, `CATE_GLOB`, `PICTOGRAME`, `numeDef`, `defCurenta`, editorul (`at-gl-…`).
- **Datele piesei:** în ADR 0285, „Implementat (3.Cl-2)”.
- **Probele:** `test/unit/trenulet.glob.test.ts`, `test/e2e/trenulet.glob.spec.ts`; uneltele „de pe hârtie”, comune cu
  ale lui 3.Cl-1, în `test/unit/ajutor-craciun.ts`; otrăvurile, `test/otravuri/3.Cl-2.py` și `3.Cl-2-en.py`.

### Reguli și capcane (3.Cl-2)

- **Arcele mari se fac din laturi fine.** `aplatizeaza` împarte orice arc ca pe un cerc de 48 de laturi; la un disc de
  60 mm, abaterea era de 0,06 mm (a arătat-o comparația punct cu punct, la marginea de 0,04), iar la 120 mm laturile
  aveau aproape 8 mm. Decorațiunile cheamă `aplatizeaza(…, laturiFine)` (săgeata de cel mult 0,02 mm); sub raza de
  9 mm iese același număr de laturi, deci piesele de dinainte nu se schimbă.
- **Un nume de tip care e deja nume în motor:** funcția se numește altfel (`globCraciun`) și intră în `TIPURI` cu cheia
  tipului (`glob: globCraciun`).
- **Un număr care ține de altă alegere e arătat în marginile ei, dar rămâne ținut minte cum l-a scris omul:** cele 5
  dungi se văd ca 3 zigzaguri, iar întoarcerea la dungi dă înapoi 5. În margini îl aduce `defCurenta` (prin
  `globCote`), deci piesa nu primește avertisment; o aducere în margini și în editor era de prisos (a arătat-o o
  otravă scăpată) și a fost scoasă.
- **Relieful stă peste disc ca un corp al lui, intrat 0,01 mm:** două corpuri închise, fără muchii comune; proba cere
  discul întreg dedesubt și doar modelul deasupra.
- **O piesă nouă într-o filă mută ancorele listei feliei dinainte** (rândul familiei din `FAMILII`, un text la fel în
  alt editor): se caută cu comparația față de `main` și se aduc la zi în aceeași felie.

## 3.Cl-3, gata (26.11, în cloud): ornamentul cu nume (ADR 0285)

- **Unde e:** motorul, după `globCraciun`: tabelul fontului (`SCRIS`) și al punților (`PUNTI`), `sferturi`,
  `trasatura` (o trăsătură îngroșată), `numeScris` (numele cum se scrie), `cutieScris` (cât ocupă), `dreptInPoli`,
  `ornamentCote` (forma, potrivirea), `semneNume` (semnele așezate, ca bucăți cu ochiuri și punți), `ornament` (în
  `TIPURI`); atelierul: `stare.ornament`, `PICTOGRAME`, `numeDef`, `defCurenta`, editorul (`at-on-…`), cu primul
  câmp de text al atelierului (`.mod-3d .at-campuri input[type="text"]`, în `head.html`).
- **Datele piesei:** în ADR 0285, „Implementat (3.Cl-3)”.
- **Probele:** `test/unit/trenulet.ornament.test.ts`, `test/e2e/trenulet.ornament.spec.ts`; hârtia fontului
  (`distArc`, `distSemn`, `intreSemn`, `numePeHartie`), în `test/unit/ajutor-craciun.ts`; otrăvurile,
  `test/otravuri/3.Cl-3.py` și `3.Cl-3-en.py`.

### Reguli și capcane (3.Cl-3)

- **Un arc de peste o jumătate de cerc nu se dă întreg lui Cavalier.** Decalarea unei polilinii deschise cu un arc de
  220° urmat de un colț întoarce zero bucăți (cifra 2), iar unirea unui contur cu arce de 188° cu un dreptunghi care îl
  taie întoarce „e înăuntru” (inima și tija inelului), fără nicio eroare. Arcele se împart întâi în sferturi
  (`sferturi`) sau se scriu din bucăți (inima: până la punctul cel mai din afară, până la cel mai de sus, până la
  crestătură, ceea ce dă și mărimile întregi). La fel `extents()`: întinderea unui arc de 240° iese greșită (un „S”
  singur ieșea din etichetă).
- **O piesă cu multe intrări se trece și printr-o sondă pe multe mărimi, nu doar prin cazurile probei.** Sonda
  (fiecare semn, singur și de opt ori, la 45 de înălțimi, în cele trei feluri de scris; aruncată după) a găsit „S” și
  „3” ieșite din etichetă, pe care cazurile alese de mână nu le aveau. Ce găsește sonda intră în probă ca regulă
  (cutia fiecărui semn, față de hârtie), nu ca listă de cazuri.
- **O trăsătură nu se atinge pe ea însăși.** O polilinie deschisă care se întoarce pe ea (bucla lui P scrisă dintr-o
  bucată, 4 cu bara care taie tija, 3 cu cele două arce puse cap la cap, care se întorc la mijloc) nu se decalează
  bine: semnul se scrie din trăsături diferite, care se întâlnesc.
- **Trăsăturile aceluiași semn nu au aceeași grosime la micron.** Două trăsături cu laturi suprapuse (bara din mijloc
  a lui B, comună celor două bucle; un capăt rotund pe axa altei trăsături, tangent la marginea ei) se unesc sigur
  doar dacă laturile nu coincid: fiecare e cu 2 µm mai subțire decât cea dinainte.
- **Fontul se probează cu el însuși ca hârtie.** Tabelul trăsăturilor e desenul; proba ia tabelul din motor și cere
  plasei „la cel mult jumătate de linie de trăsături”, pentru toate semnele. Desenul însuși e păzit de câteva litere
  scrise în probă și de o amprentă: o schimbare a unui semn se privește pe randare (`.tmp/vezi-ornament.cjs`, în
  sesiune) înainte de amprenta nouă.
- **Un text scris de om nu se pune în piesă cum a fost scris.** `defCurenta` ține numele cum se scrie pe piesă
  (majuscule, doar semnele fontului): altfel „Ana” și „ANA” ar fi două piese în listă. Starea editorului ține ce a
  scris omul, ca rândul de jos să poată spune ce semne au fost sărite.
- **Culegătorul de texte ia orice șir cu diacritice dat unui apel** (`.replace(…, "Ș")`): un semn românesc care nu e
  text se scrie cu `String.fromCharCode`; ca nume de proprietate (`"Ș": …`) trece.
- **O alegere între două liste de butoane se scrie cu listele întregi** (`et ? [[…], […]] : [[…], […]]`): cu alegerea
  înăuntrul listei, detectorul textelor nelipite de `tr` o ia drept text compus.
- **Verificări de prisos, arătate la scrisul listei de otrăvuri și scoase:** ocolirea găurii etichetei (numele stă la
  mijlocul locului rămas, deci cutia lui nu ajunge la gaură) și „mijlocul e în poligon” (locul numelui e mereu în
  formă).

## 3.Cl-4, gata (26.11, în cloud): brăduțul LEGO (ADR 0285)

- **Unde e:** motorul, după `ornament`: `BRAD_LEGO`, `trunchiForme` (trunchiul dintre două contururi cu același număr
  de vârfuri), `bradLegoCote`, `bradLego` (etajul și steaua; în `TIPURI`), `bradLegoPiese` (piesele brăduțului întreg);
  atelierul: `stare.bradLego`, `PICTOGRAME`, `numeDef`, `defCurenta`, editorul (`at-bl-…`), `adaugaBradLego`.
- **Datele piesei:** în ADR 0285, „Implementat (3.Cl-4)”.
- **Probele:** `test/unit/trenulet.bradlego.test.ts`, `test/e2e/trenulet.bradlego.spec.ts`; otrăvurile,
  `test/otravuri/3.Cl-4.py` și `3.Cl-4-en.py`.

### Reguli și capcane (3.Cl-4)

- **Proba prinderilor (`trenulet.prinderi.test.ts`) judecă și piesa nouă, după regulile ei:** un locaș ține știftul din
  două părți (golul etajului, făcut întâi cu 0,15 mm mai larg, îl ținea doar cu tubul: a căzut), iar o „bară” e plină
  pe toată raza ei (cuiul pătrat al stelei a căzut: acum e bara culcată a atelierului, `sectiuneBara`).
- **O suprafață între două contururi diferite se scrie cu triunghiurile ei pe hârtie.** Fiecare latură a conului
  zimțat e din două triunghiuri; la o înălțime dată, conturul are și punctul muchiei dintre ele. `inel(…, exteriorSus)`
  reface contururile pe unghiuri și dă altă suprafață: pentru o hârtie exactă, trunchiul se face cu `trunchiForme`.
- **Piesele unui set, cu aceleași chei ca în editorul lor:** `bradLegoPiese` dă trunchiul și vârful cu cheile piesei
  rotunde, în ordinea din `defCurenta` (fără `gaura` când nu e): altfel aceeași piesă ar sta pe două rânduri în listă.
- **Un câmp al editorului care e doar al setului (`etaje`) se scoate din piesă** în `defCurenta`.
- **Un diametru de etaj e par:** locașul 2 × 2 e între patru știfturi doar dacă mijlocul piesei cade pe un colț al
  grilei.

## Reguli și capcane (de la 3.Ca–3.Cj)

- **`addInitScript` rulează la fiecare încărcare:** o probă care pune stocarea așa și apoi reîncarcă pagina primește
  iar stocarea de la început. Proba redeschiderii pornește fără stocare dată.
- **O mărime la marginea rotunjirii nu se cere exact:** colțul unui ax de Ø4,75 cade la 1,625, iar la două zecimale
  iese 1,62 sau 1,63 după ultimul bit. Proba cere una din două (`1,6[23]`) sau alege o piesă cu cote rotunde.
- **Un punct din vederea 3D se atinge în mijlocul pânzei:** camera țintește mijlocul cutiei modelului, deci o piesă
  singură al cărei punct e lângă mijlocul cutiei ei (placa 1 × 1: știftul, la 0,65 mm) îl are în mijlocul pânzei.
- **Listele de otrăvuri ale pluginului pun `E2E_BUILD = False`** (docs/otravuri.md): spec-urile își fac pagina și
  pachetul din surse, deci o otravă ține ~40 s, nu ~2 min.
- **Proba unitară nu verifică tipurile** (motorul e încărcat cu tipurile șterse): `npm run typecheck` după fiecare
  schimbare a motorului.
- **Amprenta pachetului se înregistrează din nou după orice schimbare a surselor.** Pentru o versiune încă neunită,
  `biblioteca.ts --scrie` cere o versiune nouă („conținutul s-a schimbat, versiunea nu”): se pun la loc `versiune` și
  `continut` din `main` în `extensii/biblioteca.json`, apoi `--scrie` înregistrează aceeași versiune cu amprenta nouă.
- **O felie care schimbă scena sau editorul modelului mută ancorele listelor mai vechi** (3.Cf-1 a mutat 30 din
  `3.Tu.py` și `3.Tu-en.py`): `verifica` pe toate listele, comparat cu `main`, apoi ancorele aduse la zi și rulate din nou.

- **O piesă rotundă nouă a motorului intră în `ROTUNDE` (`lego.ts`) și în tabelul `ROTUNDE` al probei
  `trenulet.model.test.ts`, cu amprenta și locul axului pe hârtie;** una care nu e rotundă, în `DREPTE` (proba cere
  fiecărui tip al motorului o mostră într-unul din ele). Rotundă înseamnă: axul ei e originea piesei din motor.
- **Scena 3D se judecă prin mărimea modelului** (`#at-cote`, cutia tuturor pieselor din scenă), cu două piese alese
  anume: una nesimetrică față de ax (elicea cu 3 palete: −19,3…36 mm) lângă una care îi dă cealaltă margine (roata de
  40: ±21). Două piese simetrice, una în alta, dau aceeași mărime oriunde ar fi cea mică: nu judecă nimic.
- **O probă care întreabă de multe ori aceeași piesă o construiește o singură dată:** prima formă a probei așezării
  ținea 5 minute (elicea, construită de sute de ori); cu piesele ținute minte, 4,5 s.
- **O versiune scrisă într-un regex (`18\.32\.0`) scapă de înlocuirea simplă a versiunii** (`trenulet.spec.ts`).
- **Un ADR nou își pune rândul în index înaintea primului build:** build-ul cade pe documentație, iar probele e2e care
  cer build-ul nu mai pornesc („Timed out waiting … from config.webServer”).

- **O felie care mută o ancoră a unei liste mai vechi de otrăvuri aduce lista la zi în aceeași felie** (cererea sesiunii
  principale din 25.11, după auditul liniei elicelor). La capăt: `python3 -X utf8 scripts/otravuri.py <lista> verifica`
  pe listele vecine (cele care otrăvesc `lego.ts` și `atelier.ts`), comparat cu `main`; o ancoră devenită dublă (o piesă
  nouă a copiat rândul) se lungește cu rândul de dinainte, una schimbată se rescrie, iar otrava re-ancorată se rulează
  din nou. Pe 25.11: 23 re-ancorate (6 mutate de cadru și de melc, 17 rămase de la 3.Cb–3.Cj-2), toate prinse; listele
  3.Ca–3.Cj-4 n-au nicio otravă fără țintă. **Neatinse:** cele 22 ale elicelor (3.Tq, 3.Tr, 3.Ts; auditul din
  `audit-elice.md`, la cuvântul owner-ului) și cele din listele mai vechi ale pluginului (3.Tb–3.Tp, 3.Xd).
- **Straturi rotite unul față de altul (o elice) se leagă pe diagonala scurtă:** `prismaStraturi(…, true)`. Cu
  diagonala cealaltă, fiecare triunghi se întinde pe două laturi, iar săgeata lui e de patru ori mai mare: melcul Ø16
  ieșea cu miezul mâncat cu 0,06 mm, cu plasa închisă și cutia bună. A prins-o o probă care întreabă lemnul la 0,05 mm
  sub fundul spirei, pe tot conturul.
- **O piesă care se prinde cu alta, dar nu e tăiată din ea, își măsoară jocul pe plase înainte să fie scrisă:** melcul
  are spira înclinată, roata are dinții drepți; pe hârtie (în planul de mijloc) jocul e cel al cremalierei, dar spre
  marginile roții scade. Subțierea spirei vine din măsurătoare (`patrundere`, cu jocul căutat prin înjumătățire), nu
  dintr-o formulă.
- **Valorile unui `seg` sunt texte:** `seg(id, [["8", …], ["16", …]], String(q.diam))`. Cu numere, butonul ales nu se
  vede apăsat (`String(cur) === v` compară un text cu un număr).
- **Numele fișierului STL scoate semnele:** „Șurub melc Ø8, lung 2” dă `surub_melc_8_lung_2.stl` (fără „Ø”).
- **O retragere „de siguranță” se probează, nu se presupune:** cadrul își retrăgea stâlpii cu 0,01 mm față de fețele
  pragului, „ca două corpuri să nu-și împartă muchii”. Otrava care scotea retragerea n-a fost prinsă de nimic: muchiile
  nu coincideau nici fără ea (au alte capete), iar două fețe suprapuse în același plan, cu aceeași normală, nu se văd.
  Retragerea a ieșit din cod. Muchiile se împart doar când au aceleași două capete (cazul arcului, la piciorul bolții).
- **Un câmp `sus` exista deja ca număr (rândurile de sus ale pantei):** opțiunea cadrului se numește `colturi`. Înainte de
  un câmp nou al unei piese, se caută numele în `Def` (atelier): un nume cu alt tip acolo nu trece de tipuri.
- **O probă de „stă la locul lui” întreabă marginile, nu centrul:** știfturile mutate cu 1 mm treceau, fiindcă proba
  întreba doar centrul știftului; acum întreabă la 0,2 mm înăuntrul și în afara marginii, în cele patru părți.

- **Numără pe plasă ce ai cerut:** proba roții cu palete numără paletele pe un cerc din jurul axului. Așa s-a văzut că
  paleta curbată, prelungită înapoi „până intră în butuc”, ocolea butucul roților mici și ieșea de partea cealaltă: 8
  palete în loc de 4, cu plasa închisă și cutia bună. O probă doar pe cutie și pe muchii n-ar fi spus nimic.
- **Un corp care pleacă pieziș dintr-un cilindru nu se închide „unde intră în el”:** una dintre margini poate doar să-l
  atingă. Capătul se coboară pe rază, de la marginea rămasă afară, până în cilindru.
- **O piesă care schimbă singură un număr cerut îl ține și în editor:** paletele cerute peste cât încap ar rămâne ținute
  minte și s-ar întoarce la alt diametru; editorul scrie înapoi, după fiecare schimbare, numărul făcut (`tine`), iar
  marginea de sus a câmpului e cea de la diametrul ales.
- **Un cuvânt de pe un buton are o singură traducere pe toată pagina:** „Drepte” e „Straights” (șinele), iar „Paletele”,
  „Blades” (elicea). Butoanele roții cu palete spun „Palete drepte”, „Palete curbate”, „Câte palete”.

- **Capetele unui contur din arce se pun pe vârfuri:** para ieșea cu 0,03 mm mai scurtă, fiindcă spatele cercului de
  bază cădea la mijlocul unei laturi; arcele au acum un număr par de laturi. A arătat-o cutia STL-ului din proba din
  browser, nu proba razei (care are 0,06 mm îngăduință).
- **O piesă nouă cu gaură intră singură în listele panoului „Se prinde cu”:** proba panoului își ține listele pe nume
  (`PE_AX` …), deci le schimbă.

- **O piesă nouă a motorului își spune prinderile.** `prinderi` e câmp obligatoriu al tipului `Corp`: compilatorul nu
  lasă o piesă fără el. Apoi piesa își pune mostra în `MOSTRE` (proba cere una pe fiecare tip), cu numerele de pe
  hârtie; restul îl judecă proba pe plasă. O piesă făcută din altele (arcul din cărămizi, clema din placă) ia prinderile
  lor și le duce cu aceeași mutare ca plasa (`axePrinderi`, `mutaPrinderi`), scoțând ce nu mai e liber (știfturile de sub
  bilă).
- **Declarația unei prinderi se crede abia după ce o confirmă plasa.** Trei valori „de pe hârtie” scrise din cap au fost
  greșite și le-a arătat proba: capătul de ax al știftului începea în guler, clema nu ajunge la raza ei în față (gura),
  iar bila nu încape în centrul cupei (fundul plat). La fiecare, s-a judecat cine are dreptate, nu s-a potrivit numărul.
- **O probă care judecă o declarație își are și martorii mincinoși:** aceeași prindere mutată cu 0,4 mm, întoarsă, de alt
  fel sau prea lungă trebuie să cadă. Așa s-a văzut că o gaură care trece „prea lungă” nu era prinsă (lipsea întrebarea
  de la capătul celălalt) și că, la știftul gol, lungimea găurii de bară nu se poate vedea pe plasă (o spune proba).
- **Tablourile întoarse de motor sunt din alt tărâm și după `filter` / `map`:** o probă le copiază cu `Array.from`
  înainte de `deepEqual` (proba prinderilor o face o dată, în `fa`).
- **`-0` nu e `0` pentru `deepEqual`:** o direcție întoarsă se scrie `-x || 0`.
- **Proba pe plase costă cât triunghiurile:** `plin` întreabă doar triunghiurile din dreptul punctului
  (`infasurareRepede`); o piesă se face o singură dată pe probă (în proba prinderilor, `fa` le ține minte, afară de
  cazurile cu altă calibrare).
- **O probă din browser care citește catalogul cere aplicația construită din nou după o versiune nouă** (`npm run build`):
  cu `dist` vechi, proba „Ce e nou” cade pe rândul care lipsește, fără nicio legătură cu felia.
- **Starea din proba limbii e cea lăsată de drumul ei prin galerii:** cărămida e acolo „placa cu găuri”, deci primește și
  un ax; așteptările se scriu pe starea reală, nu pe cea implicită.

- **O piesă nouă a atelierului atinge, pe lângă motor și editor:** `FAMILII` și `PICTOGRAME` (probele unitare le cer),
  `texte.en.json` (`node scripts/texte-trenulet.ts`, apoi traducerile), versiunea din `extensie.json`, rândul de „ce e
  nou” și `node scripts/biblioteca.ts --scrie`. **Și probele vechi care numără:** filele („Legături 9”, „Joints 9”),
  galeriile (`trenulet.file.spec.ts`, `trenulet.pictograme.spec.ts`: tabelele lor și `desene.size`), căutarea („con”
  găsește și conectorul), starea scrisă înapoi a unei liste vechi (cheia nouă din `stare`), versiunea din
  `trenulet.spec.ts` (și în expresia regulată).
- **După orice schimbare a pachetului pe aceeași versiune nepublicată** (și un stil din `head.html`), amprenta se
  înregistrează din nou: pune temporar versiunea publicată în înregistrarea pachetului din `extensii/biblioteca.json` (nu
  în rândul din `noutati`) și rulează `biblioteca.ts --scrie`.
- **Un cuvânt cu două sensuri își ia contextul din dicționar:** „știft” e „stud” în engleză; știftul Technic e
  `tr("știft", "pin")` (contextul exista deja). Fila „Legături” e „Joints”.
- **Tablourile motorului vin din alt tărâm (`vm`):** într-o probă unitară, `deepEqual` pe ele cade („same structure but
  not reference-equal”); se compară copiate (`Array.from`) sau după lungime.
- **O probă de geometrie care judecă puncte își verifică întâi unealta în amândouă sensurile:** numărul de înfășurare
  avea semnul întors, iar toate așteptările „în gol” treceau; l-au arătat cele „în lemn”. O probă doar cu puncte goale
  n-ar fi prins nimic.
- **O gaură mutată din mijloc se vede doar dacă se probează toate cele patru direcții** (otrava U23); iar „o singură
  bucată” se probează la granița dintre pași, nu doar prin plasa închisă (otrava U10: pașii despărțiți rămân plase
  închise).
- **Capturile hotărăsc așezarea:** pe telefon, axa unui pas trecea sub felul lui, lipită de pasul următor; pașii au
  acum loc între ei.
- **Cotele LEGO nu se pot măsura în containerul sesiunii** (fișierele LDraw stau în afara repo-ului): o piesă care are
  nevoie de ele (nu doar de pasul de 8 mm și de găurile din calibrare) își cere măsurătoarea de la owner sau de la
  linia care le are.
- **Două corpuri închise nu-și împart nicio muchie.** Motorul pune piesa din corpuri care se suprapun puțin (cu 0,01 mm
  sau mai mult); dacă două dintre ele au o muchie comună (un colț căzut exact pe un vârf al unui cerc), plasa rămâne
  „închisă” pentru `plasa()`, dar STL-ul iese cu muchii fără pereche la cine îl citește. Proba unitară o cere cu
  `muchiiFaraPereche` (numere pe 32 de biți, vârfuri unite la miimi, ca în proba din browser a STL-ului).
- **Proba punct cu punct prinde și conturul desenat greșit:** discul opritorului sărea de la masă direct la mijlocul
  cercului; cutia era bună (după ce am pus extremele exacte), iar punctele de sub axă au arătat teșitura.
- **Captura arată ce nu cer probele:** crestăturile dintre butuc și brațe erau geometrie „corectă” (închisă, cu cotele
  bune); s-au văzut abia în previzualizare. După orice piesă nouă, privește-o din două unghiuri înaintea otrăvurilor.
- **Un nume de câmp nou se caută întâi în tipul `Def`:** `brate` era deja al grinzii îndoite (numere), deci brațele
  conectorului se numesc `mansoane`.
- **Starea implicită a unei piese vechi nu primește chei noi** (proba listei salvate de 18.14.0 compară starea scrisă
  înapoi): `stare.ax` rămâne `{ lung: 4 }`, cu `opritor` doar în tip; o cheie care lipsește se șterge și din definiție
  (`defCurenta`), ca piesa din listă să fie aceeași cu cea de dinainte.
- **Valorile de pe hârtie din proba din browser se socotesc, nu se ghicesc:** două cote scrise din cap au fost greșite
  (157,5° și 112,5°); cutia pe hârtie e butucul și colțurile din vârful brațelor.
- **Mesajele probelor rămân scurte:** două plase se compară prin `amprentaPlasei`, nu ca text (o aserțiune căzută pe
  două plase întregi scrie sute de mii de caractere).
- **După o schimbare a pachetului pe aceeași versiune**, amprenta se reînregistrează cu scriptul din `.tmp/` al sesiunii
  (pune o versiune de umplutură în înregistrare și rulează `biblioteca.ts --scrie`); pașii sunt cei din regula de mai sus.
- **Un poligon cu multe colțuri intrate se extrudează cu `prismaGauri`, nu cu `prisma`:** triunghiularea din `prisma`
  lasă fețe incomplete pe un pieptene (muchii deschise); `prismaGauri` (earcut) mișcă vârfurile cu cel mult 0,0001 mm.
- **O piesă care se prinde cu alta își probează prinderea pe plasele amândurora**, cu martori care dovedesc că proba
  vede pătrunderea (prea aproape, decalat, în sensul greșit), nu doar cu formule: așa s-au judecat roțile, coroana,
  conicele și cremaliera.
- **Prefixul câmpurilor unui editor nou se caută întâi printre cele folosite** (`grep -o 'at-[a-z]*-'`): `at-cr-` e al
  coroanei, `at-cm-` al clemei, `at-co-` al conectorului, `at-cu-` al conectorului în unghi, `at-crm-` al cremalierei.
- **O probă pe plase mari se scurtează prin plaja ei, nu prin judecată:** `plasa()` și `muchiiFaraPereche` costă cam 0,1 s
  pe piesă; fișierul cremalierei ține 20 s cu 84 de forme și angrenarea pe patru perechi.
- **O valoare de pe hârtie care cade pe „,05” nu se pune într-o probă din browser** (rotunjirea la o zecimală o duce în
  oricare parte): proba arcului folosește bolta joasă a lui 1 × 8 × 2 (8,8 mm), nu pe a lui 1 × 5 × 2 (6,05).
- **Marginile unui câmp se judecă de la altă valoare decât cea la care motorul ar îndrepta oricum:** „roata de 5 dinți”
  refuzată nu se vede când roata de dinainte e chiar 8.
- **Nu împinge pe ramură între raportul unei felii și unirea ei** (rugămintea sesiunii principale): felia următoare se
  lucrează local și se împinge după unire, sau la sfârșitul turei, dacă trebuie.
- **O probă nu ține scrisă de mână o versiune din „ce e nou”:** catalogul poartă doar ultimele cinci rânduri
  (`MAX_NOUTATI`), deci un rând căutat pe nume dispare după cinci versiuni noi. Completul lui 3.Cc și 3.Cd a căzut așa
  (`extensii.descoperire.spec.ts`, rândul lui 18.21.0, ieșit din catalog la 18.26.0); proba citește acum din lista
  bibliotecii un rând cu dată dintre cele rămase. La fel, orice probă care privește catalogul adevărat își ia valorile
  din `extensii/biblioteca.json`.

## 3.Cf-2, gata (26.11, în cloud): răsturnările și jumătățile de pas în „Modelul” (ADR 0284, partea D)

- **Unde e:** motorul, după `rotitLiber`: `INTORS`, `intorsLiber`, `loculDrept` (prin `grilaDinTransf(…, oriunde)`),
  `susTransf`; `rotitLiber` are al treilea parametru, pivotul. Atelierul: `pasFin`, `SPRE`, `editorModel` (rândul piesei
  libere și butoanele `tx`, `ty`, `fin`), `mutaM(op, fin)`, `tasteModel`; `head.html`: `.mutari .btn[data-m="fin"]`.
- **Ce face și ce n-a intrat:** în ADR 0284, „Implementat (3.Cf-2)”.
- **Probele:** `test/unit/trenulet.intoarcere.test.ts`, `test/e2e/trenulet.intoarcere.spec.ts`; otrăvurile,
  `test/otravuri/3.Cf-2.py` și `3.Cf-2-en.py`.

### Reguli și capcane (3.Cf-2)

- **Nicio dată nouă:** o piesă răsturnată sau dintre știfturi e `liber`. Cine adaugă o mutare nouă în „Modelul” o trece
  prin transformarea piesei și prin `lasaPeLoc`, care hotărăște singur dacă piesa e pe grilă sau liberă.
- **Răsturnarea ține mijlocul cutiei pe X și Y și partea de jos a cutiei.** Nu prinde nimic de grilă: așa, patru
  răsturnări se întorc exact de unde au plecat (o prindere la grilă ar aduna rotunjiri, iar la egalitate ar sări cu 4
  mm). Matricele sferturilor sunt exacte (0, 1, −1), deci cele 24 de așezări nu adună 6e−17.
- **Așezarea de pe grilă are −0 în matrice** (de la −sin 0). O probă care compară matrice le trece întâi prin `v + 0`.
- **Butoanele vechi ale unei piese din model sunt numărate în `trenulet.alipire.spec.ts`** (`MUTARI`): un buton nou al
  pieselor de pe grilă sau libere o schimbă.
- **Un comutator nou printre butoanele de mutare își cere aspectul de „ales”:** `.btn` n-avea niciunul, iar pe captură
  comutatorul ales arăta ca unul neales. Proba compară culoarea de fond, cu mausul mutat de pe buton.
- **Tastele vederii nu iau tastele cu Ctrl, Alt sau Meta.** O tastă nouă a modelului se adaugă în `tasteModel`, după
  paza aceea.
- **Ancorele otrăvurilor vechi:** înaintea commit-ului, fiecare listă care țintește sursele pluginului se verifică față
  de fișierele de acum (un script scurt: `vechi` apare exact o dată). La această felie erau mutate șase ancore ale
  feliilor din aceeași săptămână, aduse la zi. **Rămân 30 de ancore mutate în opt liste mai vechi** (`3.Tg`, `3.Th`,
  `3.Tk`, `3.Tm`, `3.Tpb`, `3.Tq`, `3.Tr`, `3.Ts`), de dinaintea acestei felii: de adus la zi într-o felie de
  întreținere, cu rularea lor din nou.
