# Construcțiile din Easy 3Draw (3.Ca–3.Cj, ADR 0284)

_Linia pieselor noi, a punctelor de prindere și a Modelului ca asamblare, în atelierul Easy 3Draw. Pornită pe 24.11.2026,
la cererea owner-ului („vreau sa adaugi mai multe tipuri de piese pentru fiecare categoire […] compatibile intre ele nu
doar una cate una ci si ca constructii complexe”), în sesiunea cloud a liniei bibliotecii: aceeași ramură,
`wip/3.Xh-biblioteca-ui`, același canal, `biblioteca`. ADR 0284, acceptat pe 24.11 cu toate recomandările (1a–4a).
Starea: **3.Ca (conectorul perpendicular, Easy 3Draw 18.24.0) gata pe 24.11, de unit; urmează 3.Cb (conectorul în unghi,
axul cu opritor, știftul lung cu bucșă).** Versiunea următoare a pachetului: 18.25.0._

## Planul (ADR 0284)

| # | Felia | Starea |
|---|---|---|
| 3.Ca | Conectorul perpendicular | gata (24.11) |
| 3.Cb | Conectorul în unghi; axul cu opritor, știftul lung cu bucșă | urmează |
| 3.Cc | Cremaliera și melcul | |
| 3.Cd | Arcul, balamaua, placa turnantă | |
| 3.Ce | Punctele de prindere și „Se prinde cu” | |
| 3.Cf | Modelul: orientarea pe trei axe și alipirea la prinderi | după 3.Tu a liniei elicelor (axul pieselor rotunde în Model) |
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

## Reguli și capcane (de la 3.Ca)

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
