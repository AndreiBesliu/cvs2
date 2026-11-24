# Atelierul Easy 3Draw: piese, prinderi, construcții (3.Ca–3.Cj și 3.Tu; ADR 0284, ADR 0283)

_Linia pieselor noi, a punctelor de prindere și a Modelului ca asamblare, în atelierul Easy 3Draw. Pornită pe 24.11.2026,
la cererea owner-ului („vreau sa adaugi mai multe tipuri de piese pentru fiecare categoire […] compatibile intre ele nu
doar una cate una ci si ca constructii complexe”), în sesiunea cloud a liniei bibliotecii: aceeași ramură,
`wip/3.Xh-biblioteca-ui`, același canal, `biblioteca`. ADR 0284, acceptat pe 24.11 cu toate recomandările (1a–4a).
**Din 24.11 seara, linia ține și lucrul elicelor** (predat la cererea owner-ului; istoria și capcanele lor rămân în
[elice.md](elice.md), secțiunea „Predarea”): felia **3.Tu** (piesele rotunde pe același ax în „Modelul”, ADR 0283,
rezervat), cu trei întrebări încă fără răspuns de la owner (recomandările: 1a, 2a, 3a).
Starea: **3.Ca (conectorul perpendicular, Easy 3Draw 18.24.0) și 3.Cb (conectorul în unghi, axul cu opritor, știftul cu
bucșă; 18.25.0) gata pe 24.11, de unit; urmează 3.Cc (cremaliera și melcul).** Versiunea următoare a pachetului:
18.26.0._

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
| 3.Cc | Cremaliera și melcul | urmează |
| 3.Cd | Arcul, balamaua, placa turnantă | |
| 3.Ce | Punctele de prindere și „Se prinde cu” | |
| 3.Tu | Modelul: piesele rotunde pe același ax (ADR 0283) | a acestei linii din 24.11 (predarea elicelor); la răspunsurile owner-ului la cele trei întrebări |
| 3.Cf | Modelul: orientarea pe trei axe și alipirea la prinderi | după 3.Tu |
| 3.Cg | Modelul: verificarea (prins, plutește, se ciocnește) | avertisment, nu refuz (răspunsul 2a) |
| 3.Ch | Construcțiile cu nume și lista lor de piese | |
| 3.Ci | Construcțiile gata (șasiul, cutia de angrenaje, brațul de macara, barca cu elice) | după Model (răspunsul 3a) |
| 3.Cj | Cama și manivela, cadrul, roata cu palete | |

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

## Reguli și capcane (de la 3.Ca și 3.Cb)

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
