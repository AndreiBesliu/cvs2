# Atelierul Easy 3Draw: piese, prinderi, construcții (3.Ca–3.Cj și 3.Tu; ADR 0284, ADR 0283)

_Linia pieselor noi, a punctelor de prindere și a Modelului ca asamblare, în atelierul Easy 3Draw. Pornită pe 24.11.2026,
la cererea owner-ului („vreau sa adaugi mai multe tipuri de piese pentru fiecare categoire […] compatibile intre ele nu
doar una cate una ci si ca constructii complexe”), în sesiunea cloud a liniei bibliotecii: aceeași ramură,
`wip/3.Xh-biblioteca-ui`, același canal, `biblioteca`. ADR 0284, acceptat pe 24.11 cu toate recomandările (1a–4a).
**Din 24.11 seara, linia ține și lucrul elicelor** (predat la cererea owner-ului; istoria și capcanele lor rămân în
[elice.md](elice.md), secțiunea „Predarea”): felia **3.Tu** (piesele rotunde pe același ax în „Modelul”, ADR 0283,
rezervat), cu trei întrebări încă fără răspuns de la owner (recomandările: 1a, 2a, 3a).
Starea: **3.Ca (conectorul perpendicular, Easy 3Draw 18.24.0) și 3.Cb (conectorul în unghi, axul cu opritor, știftul cu
bucșă; 18.25.0), unite în `main` cu lotul 28 (`11877a3e`); 3.Cc (cremaliera; 18.26.0) și 3.Cd (arcul; 18.27.0),
unite în `main` pe 25.11 (`9815527f`); 3.Ce (punctele de prindere și „Se prinde cu”; 18.28.0), unită în `main` pe
25.11 (`38ff9391`, PR-ul `AndreiBesliu/cvs2#28`); 3.Cj-1 (cama; 18.29.0) și 3.Cj-2 (roata cu palete; 18.30.0), unite
în `main` pe 25.11 (`e90edd2e`, PR-ul `AndreiBesliu/cvs2#29`); 3.Cj-3 (cadrul; 18.31.0) gata pe 25.11, pe ramură, de
unit; urmează restul lui 3.Cj (melcul) și, la răspunsurile owner-ului, 3.Tu, apoi 3.Cf.** Versiunea următoare a
pachetului: 18.32.0._

## Numerele liniei

- **ADR-urile:** 0280–0289 sunt ale pluginului (0280 roțile, 0281 filele, 0282 elicele, **0283 pentru 3.Tu**, **0284
  construcțiile**); sesiunea principală a dat liniei și intervalul **0340–0349**, pentru ADR-urile de după.
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
| 3.Tu | Modelul: piesele rotunde pe același ax (ADR 0283) | a acestei linii din 24.11 (predarea elicelor); la răspunsurile owner-ului la cele trei întrebări |
| 3.Cf | Modelul: orientarea pe trei axe și alipirea la prinderi | după 3.Tu |
| 3.Cg | Modelul: verificarea (prins, plutește, se ciocnește) | avertisment, nu refuz (răspunsul 2a) |
| 3.Ch | Construcțiile cu nume și lista lor de piese | |
| 3.Ci | Construcțiile gata (șasiul, cutia de angrenaje, brațul de macara, barca cu elice) | după Model (răspunsul 3a) |
| 3.Cj | Melcul, cama și manivela, cadrul, roata cu palete | pe bucăți: 3.Cj-1, cama, 3.Cj-2, roata cu palete, și 3.Cj-3, cadrul, gata (25.11); urmează melcul |
| 3.Ck | Balamaua și placa turnantă | despărțite de 3.Cd; după ce owner-ul încearcă primele piese pe imprimantă |

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
- **Melcul** vine în 3.Cj: de hotărât întâi diametrul de divizare (8 mm, pe grila LEGO, cu miezul subțire, sau 16 mm) și
  cum se tipărește; proba lui de angrenare se scrie ca a cremalierei (roata motorului, pe plase).

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
- **Ce urmează în 3.Cj:** melcul (cu proba de angrenare pe plase, ca la cremalieră; de hotărât întâi diametrul de
  divizare).

## Reguli și capcane (de la 3.Ca–3.Cj)

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
