# ADR 0167: numele pluginului, Easy 3Draw

**Starea:** acceptat pe 05.11.2026 pentru felia 3.Tf, a liniei Trenuleț (worktree-ul `wip/trenulet`). Owner-ul: „o sa vreau ca
plugin-ul sa se numeasca Easy 3Draw”, după 3.Xe.

## Contextul

Pluginul se numea „Planificator Trenuleț”, după aplicația din care a pornit: planul unui circuit de trenuleț din lemn, cu
fișierele pentru CNC. De la 3.Td și 3.Xe face și piese de printat 3D: cărămizi LEGO și forme din desenul cvs2, ridicate. Numele
vine din două locuri:

- din manifest, în cvs2: la instalare („„<nume>” <versiune>, de la <fișier>”), în meniul extensiilor, pe fereastra extensiei, la
  „Trimite la <nume>” și „Propus de <nume>”, la originea unei lucrări trimise și la cererea de pornire pe mașină;
- din planificator: titlul paginii, antetele README-urilor (arhiva CNC, arhiva de printat), sfatul filei „Din cvs2” și aplicația
  din care vine lucrarea trimisă la cvs2 (`de_la.aplicatie`).

## Decizia

### A. Numele afișat: „Easy 3Draw”, la fel în română și în engleză

- Manifestul: `"nume": "Easy 3Draw"`, versiunea 18.7.0.
- Planificatorul: `<title>Easy 3Draw</title>`; „EASY 3DRAW — fișierele pentru CNC”; „PIESE DE PRINTAT — din atelierul 3D din
  Easy 3Draw”; „… apasă Trimite la Easy 3Draw …”; `de_la: { aplicatie: "Easy 3Draw" }`.
- E un nume de produs: nu se traduce (`PASTRATE` din `scripts/texte-trenulet.ts`), iar textele care îl cuprind îl păstrează și în
  engleză. N-are diacritice, deci verificarea românei rămase (în dicționar, pe pagină și în README-ul englez) nu mai scutește
  nimic: scutirea lui „Trenuleț” a ieșit.
- Manualul (ro, en) spune „Easy 3Draw” unde spunea „Planificatorul Trenuleț” / „the Trenuleț planner”.

### B. Ce rămâne „trenulet”

- **Id-ul extensiei**, `trenulet`. De el țin rândul instalat (o instalare cu același id îl înlocuiește, ADR 0127 §B) și datele
  extensiei (cheile `[id, cheie]`, ADR 0128 §B): circuitele, atelierul, setările. Așa, 18.7.0 instalat peste 18.6.0 îi ia locul,
  cu tot ce avea.
- Numele tehnice: pachetul `trenulet-<versiune>.zip`, dosarul `extensii/trenulet/`, scripturile, probele, ramura `wip/trenulet`
  și canalul de previzualizare `trenulet`.
- Comentariul din antetul G-code-ului („Trenulet - planificatorul de circuite”): ieșirile motoarelor rămân cele de referință v18,
  după amprentele lor (`trenulet.referinte.test.ts`).
- Textul paginii de sine stătătoare despre „dosarul Trenulet”: e dosarul de pe calculatorul owner-ului, nu numele produsului.
- Istoria: ADR-urile, fișa, DEVLOG-ul și otrăvurile de dinainte păstrează numele de atunci. Lucrările deja trimise, „de la
  Planificator Trenuleț”, se primesc ca până acum: probele primirii îl păstrează ca dată.

### C. Probele

- e2e: instalarea („„Easy 3Draw” 18.7.0, de la trenulet-18.7.0.zip”), originea lucrării, cererea de pornire, „Trimite la Easy
  3Draw”, „Propus de Easy 3Draw”, titlul paginii de sine stătătoare, antetul README-ului englez;
- actualizarea: un pachet ca 18.6.0 (aceleași fișiere, manifestul de atunci), cu un circuit salvat, apoi 18.7.0 peste el: un
  singur rând în meniu, „Easy 3Draw”, iar circuitul se redeschide;
- otrăvurile feliei: `test/otravuri/3.Tf.py`.

## Ce am respins

- **Un id nou** (`easy-3draw`): extensia veche ar rămâne instalată alături, iar cea nouă ar porni fără circuitele și piesele de
  până acum; mutarea datelor între id-uri ar fi un mecanism nou, fără câștig pentru om.
- **Numele tradus**: e un nume de produs, același în ambele limbi.
- **Antetul G-code-ului schimbat acum**: ar schimba toate amprentele de referință v18, cu care se probează că motoarele dau
  aceleași programe. Se poate, cu amprente noi, la cererea owner-ului.

## Limite

- Semnul din bara planificatorului (o șină de lemn) rămâne cel vechi; unul pentru Easy 3Draw e altă decizie, cu schiță.
- Numele vechi rămâne în lucrările primite deja, unde e o dată a lor.
