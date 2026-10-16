# ADR 0041: Backup-ul zilnic al Firestore și marcajele de rulare (P1, partea 1)

**Starea:** acceptat pe 16.10.2026 („Da, pregătește 3.4 (backup-ul și marcajele)”), în limitele planului (`PLAN.md` §3.4:
„backup zilnic cu alarmă”, „marcaj de rulare pe fiecare job”; `docs/faza2/admin/RAPORT.md` §5.1, punctul 5). **Intră în:**
etapa 3, felia 3.4a. Restul lui 3.4 (workflow-ul de publicare pe live, WIF, `meta/deployment`) cere conturile owner-ului.

**Problema.** O bază fără copie zilnică nu se poate reface după o greșeală; iar un job programat care nu pornește e
invizibil: nimic nu se plânge.

## Decizia

**1. Două joburi programate**, în `europe-central2`, cu ora României (`Europe/Bucharest`), fără reîncercări automate:
- **`backupZilnic`, la 03:00:** pornește exportul întregii baze (`exportDocuments`, toate colecțiile) în
  `<BUCKET_BACKUP>/firestore/<ora UTC a pornirii>`. Exportul durează minute, deci jobul nu-l așteaptă: notează numele
  operației și destinația în marcajul lui;
- **`verificaBackup`, la 05:00:** citește operația notată de `backupZilnic` și cere s-o găsească terminată, fără eroare.
  Altfel: eșec, cu motivul (neterminată, eșuată, niciun export pornit, exportul de ieri).
- `BUCKET_BACKUP` e un parametru pe proiect (`functions/.env.<proiect>`; pe test, `gs://cncvectorstudio-test-backup`,
  unde owner-ul a făcut exportul din 08.10). Lipsă sau greșit = eșec cu motivul, nu un export oriunde.

**2. Marcajul de rulare**, `marcaje/{job}`, scris de server în jurul fiecărui job: `ultimaPornire` înainte de lucru;
la reușită `ultimulFinal`, `ultimulSucces`, `esecuriLaRand: 0` și `detaliu`; la eșec `ultimulFinal`, `esecuriLaRand + 1`,
`ultimaEroare`, plus `logServerError('job:<nume>')` (deci eșecul ajunge în fila Erori: asta e alarma, până la e-mail în
P2+). Un job oprit la timeout nu mai scrie nimic: pornirea fără final se vede din marcaj.

**3. Judecata marcajului** (`shared/joburi.ts`, pură, folosită de Diagnoză), în ordine:
1. fără marcaj: **atenție**, „n-a rulat niciodată” (normal până la prima oră programată după publicare);
2. pornit fără final de peste timeout + 1 min: **eșec** (oprit la timeout sau căzut);
3. două eșecuri la rând sau mai multe: **eșec**;
4. a rulat, dar n-a reușit niciodată: **eșec**;
5. ultimul succes mai vechi de 1,1 × intervalul + 2 h: **eșec** (programarea nu mai pornește);
6. un eșec: **atenție**; altfel **bine**.
Un câmp de timp care nu e un `Timestamp` face marcajul **nevalid** (eșec), nu „lipsă”.

**4. Joburile așteptate stau într-o listă comună** (`JOBURI`): Diagnoza judecă fiecare job din listă, deci unul care n-a
scris niciodată un marcaj tot apare.

**5. Regulile:** `marcaje` se citește de personal; nu se scrie din client.

## Ce nu intră acum (cere conturile owner-ului)

- **Permisiunile exportului:** jobul rulează cu contul de serviciu implicit al funcțiilor. Dacă nu are dreptul de export
  (`Cloud Datastore Import Export Admin`), primul `backupZilnic` (03:00) eșuează cu `PERMISSION_DENIED`, iar eșecul apare
  în fila Erori și în Diagnoză: alarma se probează singură. Un cont de serviciu dedicat, cu doar acest drept, vine odată
  cu WIF (3.4b).
- **Retenția copiilor** în bucket (o regulă de ciclu de viață, de ex. 30 de zile) e o decizie a owner-ului, în consolă.

## Dovada

- Judecata, pe hârtie, pe fiecare ramură (teste unitare).
- Pe emulator: marcajul la reușită și la eșec (contorul, eroarea, rândul din `errorLogs`), backup-ul și verificarea cu un
  client de export fals (cererea exactă, operația terminată / neterminată / eșuată / lipsă), regulile.
- Pe test: joburile publicate, cu programarea; prima rulare reală e la 03:00 și 05:00, citită a doua zi în Diagnoză.

## Se redeschide dacă

- exportul complet trece de 5 minute de pornire sau de costul acceptat (atunci exportul pe colecții);
- e-mailul de alertă există (P2+): alarma trece și pe e-mail.
