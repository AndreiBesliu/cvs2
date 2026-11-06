# ADR 0162: Sursele planificatorului Trenuleț în TypeScript

**Starea:** acceptat pe 04.11.2026 pentru felia 3.Tc, a liniei Trenuleț (worktree-ul `wip/trenulet`). Owner-ul: „Sursele în
TypeScript”. Continuă ADR 0129 (sursele în repo, construcția fără Python) și ADR 0161 (planificatorul adaptat pentru cvs2),
care lăsaseră conversia pentru o felie a ei, cu `referinte.js --compara` ca plasă.

## Contextul

Planificatorul avea șase surse JavaScript (~7 900 de linii): motoarele (CNC, G-code, profilurile, LEGO) și pagina (atelierul
3D și planul). Restul lui cvs2 e TypeScript strict; sursele planificatorului nu le verifica nimeni: o greșeală de tip se
vedea abia la rulare, dacă se vedea.

## Decizia

### A. Scripturi clasice TypeScript, nu module

Sursele devin `.ts`, dar rămân scripturi clasice, încărcate ca acum (în pagină, în pachetul extensiei, în ham-ul referințelor):
aceeași semantică globală. Fiecare motor e tot o funcție închisă; numele global se întoarce acum ca `var`
(`var TrenCNC = (function (glob: typeof globalThis) { …; return { … }; })(…)`), ca să-i știe compilatorul tipul. E singura
schimbare de cod. Fără module: n-ar mai fi aceleași fișiere pentru claude.ai, copia de pe calculator și extensie, și ar fi cerut
un bundler.

### B. Un proiect de tipuri al lor

`extensii/trenulet/sursa/tsconfig.json` extinde rădăcina (aceleași reguli stricte: `strict`, `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`, doar sintaxă care se șterge) și are doar sursele planificatorului și `globale.d.ts`. Rădăcina
le exclude: numele lor globale (`$`, `TrenCNC`, `PAS`…) ar fi trecut, în aplicație, drept ale ei, fără import.
`npm run typecheck` verifică ambele proiecte, iar `test/unit/trenulet.tipuri.test.ts` le verifică și în suita unitară
(toate sursele sunt în proiect, zero erori, aplicația nu le vede).

`globale.d.ts` declară ce găsesc sursele gata făcut: Cavalier și earcut (din `vendor/`, cât folosesc sursele), three.js
(doar tipuri, cât folosește atelierul: biblioteca nu e în pachet), `window.claude` (baza de date și descărcările de pe
claude.ai), `window.cvs2` (gazda și senderul, cu tipul din `extensii/api.ts`).

### C. Tipurile se șterg la construcție

`scripts/construieste-trenulet.ts` și `teste/incarca.js` trec sursele prin `stripTypeScriptTypes` (modul `strip`: spațiile
țin locul tipurilor, liniile și coloanele rămân). Pachetul și pagina au tot JavaScript (`vm.Script` îl compilează în probă).
`build.py` a plecat din copia din repo: nu poate construi sursele `.ts`, iar `Apps/Trenulet/` îl păstrează.

### D. Doar tipuri adăugate, dovedit pe arbore

Conversia n-a schimbat cod: fiecare sursă, fără tipuri, are același arbore sintactic (acorn) cu JavaScript-ul de dinainte
(`b2ad915`), în afară de exportul de la A. Unde codul presupunea că o valoare există (un element din listă, în limite; un
element din pagină), stă un `!` (1 785); unde forma vine din afară (JSON din stocare, DOM, câmpurile editorului), o conversie
`as` (274). Explicit `any`: niciunul. Ieșirile motoarelor: `referinte.js --compara`, 622, 0 diferite.

## Ce am respins

- **Module ES și un bundler:** altă pagină pe claude.ai și alt pachet; câștigul (importuri explicite) nu cerea asta acum.
- **Reguli mai blânde pentru planificator** (fără `noUncheckedIndexedAccess`): ar fi scos semnele `!`, dar ar fi fost a doua
  măsură în același repo.
- **Gărzi în loc de `!`** (`if (!x) continue`): schimbă ce face codul în cazurile „imposibile”; nu în felia care promite
  același JavaScript.
- **Tipurile three.js și Cavalier din pachetele lor:** ar fi cerut descărcări; declarațiile scrise acoperă exact ce se folosește.

## Limite

- Semnele `!` și conversiile `as` arată presupuneri, nu le verifică. Fiecare poate deveni o gardă sau un tip mai strâns, cu
  proba ei, când se schimbă codul din jur.
- Copia JSON a câmpurilor editorului din atelier (`defCurenta`) și setările CNC salvate rămân netipizate acolo unde
  `JSON.parse` le dă: se verifică la margine, unde intră în motor.
- Definiția unei piese din atelier e un tip cu câmpurile tuturor pieselor, opționale; motorul LEGO are tipul exact, pe tip.
- Listele vechi de otrăvuri (`3.Ta`, `3.Tb`) țintesc fișierele `.js`: pe sursele de acum ies VOID.
