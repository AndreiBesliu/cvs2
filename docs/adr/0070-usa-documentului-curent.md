# ADR 0070: Ușa documentului curent, fără migrări

**Starea:** acceptat pe 25.10.2026, odată cu buzunarul (felia 5.1↑, ADR 0069). **Schimbă:** ADR 0042 (ce aduce ușa unui
proiect salvat înaintea primei randări). Nu schimbă nimic din ce face ușa (T16, ADR 0016): aceleași verificări, aceleași
migrări, aceleași motive.

**Problema.** Documentul v11 (ADR 0069) a adăugat migrarea v10 → v11 și felul `buzunar` în schemă: pornirea cu ușa a
ajuns la 100,2 / 100 kB (măsurat pe 25.10: pornirea 93,03 + dicționarul 2,21 + ușa 4,79, față de 99,91 la `HEAD`). Ușa
aducea toate migrările (v1 → v11, cu schema v1 înghețată), deși un proiect salvat de versiunea curentă (cazul obișnuit) nu
are nevoie de niciuna.

## Decizia

**1. Ușa se desparte în trei module:** `src/model/usaCurenta.ts` (verificările: imbricarea, versiunea, schema, arcele în
lume; `incarcaCu(brut, migrări)`), `src/model/migrari.ts` (migrările pure, mutate neschimbat), `src/model/incarcare.ts`
(`incarca`, ușa întreagă și sincronă, `incarcaCu` cu toate migrările: o folosesc importul, acțiunile și probele).

**2. La pornire**, `proiectLocal.ts` aduce doar ușa documentului curent (`incarcaCurent`); un document mai vechi (o versiune
întreagă între 1 și cea curentă, exclusiv) aduce, în plus, `incarcare.ts` cu migrările: o dată, după o actualizare a
aplicației. Un document mai nou, fără versiune sau stricat se refuză în ușa curentă (refuzul nu cere migrări). Workerul
PWA le ține pe amândouă în cache (offline, un proiect vechi se deschide la fel).

**3. Plasa pe artefact** (`scripts/build-determinist.ts`): ușa e acum bucata `usaCurenta` cu ce aduce ea; un text pe care îl
are doar migrarea v1 → v2 („pe care v2 îl folosește”) trebuie să fie în bucata `incarcare` și în afara ușii.

**Măsurat** (25.10, după despărțire): pornirea 93,07 + dicționarul 2,21 + ușa 3,29 = 98,56 / 100 kB (migrările, 1,85 kB, vin
doar pentru un document vechi). Rămân ~1,4 kB pentru feliile următoare.

## Respinse

- **Ușa asincronă** (`incarca` cu migrările aduse cu `import()`): ar fi schimbat semnătura folosită de import, acțiuni și
  mii de probe, pentru același câștig.
- **Scoaterea verificării din migrarea v10 → v11** (doar numărul): ar fi încăput, dar un document marcat v4 … v10 cu un
  buzunar ar fi trecut, fiindcă schema curentă îl cunoaște; verificarea apără tot lanțul.

## Se redeschide dacă

- un proiect vechi se deschide prea încet (două drumuri la prima deschidere după o actualizare).
