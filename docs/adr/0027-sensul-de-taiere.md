# ADR 0027 — Sensul de tăiere (documentul v4)

**Starea:** acceptat pe 09.10.2026 de owner („ok” la recomandarea: urcare implicit, pe operație; placa 1 regenerată), în
felia 2.3b. **Intră în:** etapa 2. Nimic de aici nu se schimbă fără un ADR nou.

**Problema.** În ediția întâi, sensul de tăiere n-a existat 99 de zile, apoi a ieșit „cum e desenat”, fiindcă implicitul
era o întrebare de atelier rămasă deschisă (`LECTII.md`, D5). Azi, offsetul dă traseele în sens trigonometric, deci
exteriorul se taie în opoziție, iar gaura în urcare: tot din întâmplare, nu din decizie. (Și notițele ediției întâi aveau
regula întoarsă: „M3 = orar ⇒ urcare ⇔ materialul în stânga”; vezi precizarea de la sfârșit.)

**Decizia.** Fiecare operație de profil își poartă sensul: `Operatie.sens = 'urcare' | 'opozitie'`, implicit
**`urcare`** (decizia owner-ului). Sensul se aplică pe partea păstrată a conturului (ADR 0026), nu pe felul în care e
desenat.

## Contractul

**1. Definiția, cu axul M3** (rotație orară văzută de sus, singura pe care o scrie postul azi):
- **urcare** (climb): materialul care rămâne e **în dreapta** sensului de mers;
- **opoziție** (conventional): materialul care rămâne e **în stânga** sensului de mers.

De ce: cu M3, la urcare dintele intră în material cu așchia groasă și iese pe peretele păstrat cu așchia subțire; e
regula G41 + M3 = urcare (scula la stânga drumului, piesa la dreapta). Pe un perete din stânga, dintele ar intra chiar pe
perete, cu așchia nulă: opoziție.

Materialul care rămâne e partea păstrată a conturului tăiat, S(C) din ADR 0026: pentru `exterior`, interiorul
conturului; pentru `interior`, exteriorul lui. Deci:

| Latura | Urcare | Opoziție |
|---|---|---|
| `exterior` | orar în jurul piesei (G2 pe arcele ei) | trigonometric |
| `interior` | trigonometric în jurul găurii (G3) | orar |

**2. Pe orice buclă a traseului.** Offsetul poate da mai multe bucle (insule și goluri ale rezultatului). Pe fiecare,
materialul păstrat e de partea conturului de intrare; regula de la 1 se aplică fiecărei bucle, la fiecare trecere.

**3. `pe-linie`:** scula taie ambii pereți, deci sensul nu schimbă nimic din material. Câmpul se păstrează în document,
dar traseul urmează conturul cum e desenat; interfața nu-l lasă schimbat pe un rând `pe-linie`.

**4. Pornirea** rămâne vârful 0 al buclei: inversarea nu mută locul în care freza intră în material.

**5. Documentul v4** (`schema: 4`) = contractul v3 (ADR 0025), plus `Operatie.sens`, obligatoriu, unul dintre
`'urcare'` și `'opozitie'`.
- **Migrarea v3 → v4** (pură, deterministă): fiecare operație primește `sens: 'urcare'` (implicitul owner-ului). O
  operație v3 care are deja un câmp necunoscut `sens` e refuzată cu motiv (ciocnire de nume, ca în ADR 0024,
  precizarea 7). Lanțul v1 → v2 → v3 → v4 rămâne.
- **Efectul migrării:** un proiect vechi își păstrează găurile (erau deja în urcare), iar exterioarele trec din opoziție
  în urcare. Owner-ul a acceptat (compatibilitatea e sacrificabilă, munca nesalvată nu).
- O operație nouă (Adaugă) vine cu `sens: 'urcare'`.

**6. Ce verifică oracolul** (sesiune independentă, din acest ADR): pe textul G-code, pentru fiecare tăietură etichetată
(ADR 0026 §7) cu latura `exterior` sau `interior`, fiecare buclă închisă de mișcări de tăiere la aceeași adâncime are
aria cu semn (cu arcele, în coordonatele documentului) de semnul din tabelul de la 1: pozitivă = trigonometric. Sensul
așteptat vine din document. Verificarea intră în poartă ca **invarianta 9** (sensul de tăiere).

**7. Placa 1** se regenerează cu `urcare`: gaura rămâne în G3 (era deja în urcare), insula trece în G2, fiecare pornind
din același punct; cotele și numărul de
linii nu se schimbă. Amprentele noi se scriu în `docs/etape/placa-01.md`.

## Limitele

- Doar axul M3. Axul invers (M4) vine cu profilul mașinii (etapa 13) și inversează tabelul.
- Rampa, intrările și urechile (feliile 2.4–2.5) își iau sensul de aici.

## Ce am respins

- **Sensul global (pe proiect sau pe mașină):** degroșarea și finisarea aceluiași contur se taie des în sensuri
  diferite; operația e locul firesc (ca în ArtCAM și DeskProto).
- **„Cum e desenat”:** sensul ar depinde de unealta cu care s-a desenat forma, nu de material; e chiar defectul D5.

**Se redeschide dacă:** apare axul M4, sau operații care cer ambele sensuri pe aceeași buclă (finisarea „dus-întors”).

**Precizare (09.10.2026, recenzia feliei 2.3b, înainte de orice publicare).** Prima versiune a acestui ADR avea tabelul
întors (urcare = materialul în stânga), preluat din notițele ediției întâi fără să fie verificat pe cinematica așchiei.
Aplicația îl urma întocmai, deci „urcare” tăia în opoziție, iar placa 1 regenerată pe el ar fi tăiat gaura în opoziție.
Recenzia l-a prins cu o simulare de așchie (dintele intră subțire pe peretele din stânga) și cu regula G41 + M3. De aici
înainte, convenția e ancorată într-un test fizic (`test/unit/cam.sens.fizic.test.ts`), nu doar într-un tabel.

