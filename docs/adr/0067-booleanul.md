# ADR 0067: Booleanul formelor

**Starea:** acceptat pe 25.10.2026. Ordinea cerută de owner („Da”, 25.10): copierea pe curbă, apoi booleanul, apoi testul lui;
„Ok” după copierea pe curbă. **Intră în:** etapa 6 („Editorul de vectori”, rândul „Vectori, noduri, boolean, offset, aliniere”;
placa etapei cere „reuniunea a două cercuri”), adusă în etapa 3, fără mașină. **Continuă:** ADR 0005 (cavalier, T5), ADR 0033
(biarcele), ADR 0064 (`document.deseneaza` cu o listă), ADR 0066 (ordinea selecției).

**Problema.** Două forme nu se puteau uni, scădea una din alta sau intersecta: o ramă cu decupaj, o formă din cercuri suprapuse
sau o piesă cu o gaură se desenau doar din import.

## Decizia

**1. Motorul: cavalier, prin fațadă.** Booleanul pe polilinii cu arce există deja în portul cavalier (T5); îl expune
`booleanContururi` din `src/geom/offset.ts` (singura fațadă permisă, regula `cavalier-doar-prin-fatada`): intrările se curăță
și se aduc în sens trigonometric, ieșirea păstrează arcele, iar fiecare gaură (contur negativ) se pune în exteriorul care o
cuprinde (numărul de înfășurare). Niciodată o excepție.

**2. Contururile tăiate.** Fiecare formă intră cu conturul pe care l-ar tăia CAM-ul: în lume, iar cubicele ca biarce la
toleranța proiectului (0,001 mm, ca `conturDeTaiat`). Rezultatul e deci exact ce s-ar tăia; liniile rămân linii, arcele rămân
arce ale acelorași cercuri (BRIEF §16).

**3. Exact două forme închise, în ordinea alegerii** (`booleanSelectie`, `src/model/boolean.ts`, pur): Unește (reuniunea),
Scade (din prima aleasă se scoate ultima, aleasă cu Shift + clic), Intersectează. Refuzuri, cu motiv: nu sunt exact două, una e
deschisă sau are mai multe contururi, formele nu se ating (unirea și scăderea n-ar schimba nimic), nu au nimic comun
(intersecția), nu rămâne nimic (scăderea), motorul a refuzat.

**4. Rezultatul înlocuiește formele alese, într-un pas.** `document.deseneaza` primește acum și `sterge` (instanțele înlocuite) și
forme cu `gauri`: ștergerile și formele noi intră într-un singur `lot`; id-urile noi nu le refolosesc pe cele șterse. Fiecare
regiune a rezultatului e o piesă nouă: un singur contur = o cale (editabilă cu Nodurile); cu găuri = un grup, ca la import
(`c1` cu profil exterior, `c2`… cu profil interior), ca găurile să rămână găuri la tăiere. Ștergerea are acum o singură
funcție (`comenziStergere`), folosită și de „Șterge selecția”.

**5. Interfața**: secțiunea Boolean din extensia barei (trei butoane, active doar cu două forme alese); motivul unui refuz se
spune lângă ele, până la altă selecție. Calculul (cu cavalier) se aduce la primul clic. Pornirea nu primește nimic: nicio
acțiune nouă.

## Respinse

- **Mai mult de două forme deodată** (unirea unui șir de litere): cere algebra regiunilor cu găuri peste pașii succesivi; unirea
  se poate repeta, iar o variantă cu N forme se adaugă dacă se cere.
- **Păstrarea originalelor** (ca la offset): la boolean, rezultatul ține locul formelor; anularea le readuce.
- **Cubicele păstrate în rezultat**: cavalier lucrează pe linii și arce; biarcele sunt deja ce se taie.
- **O acțiune nouă `document.boolean`** în registru: pornirea cu ușa e la 99,9 / 100 kB.

## Se redeschide dacă

- se cere booleanul pe mai multe forme deodată, pe piese cu mai multe contururi sau „excluderea” (xor);
- se cere păstrarea originalelor, ca opțiune.
