# ADR 0164: pluginul ca parte din cvs2: tema, fonturile, contul văzut, închiderea fără pierderi

**Starea:** acceptat pe 04.11.2026 pentru felia 3.Xd, a liniei Trenuleț (worktree-ul `wip/trenulet`). Owner-ul: „Da, pornește
A” (la „Pornesc felia A (pluginul ca parte din cvs2: temă, fonturi, contul văzut, închiderea fără pierderi)?”), după direcția
nouă: pluginul devine un atelier de forme 3D pentru printare, iar întâi vine „comunicare perfectă între cvs2 și plugin”. Fără
server: salvarea modelelor în cont vine în feliile următoare.

## Contextul

- Cadrul primea 13 culori ale temei (ADR 0127 §E), dar planificatorul nu le folosea: avea paleta lui și urma tema
  sistemului (`prefers-color-scheme`), nu pe cea aleasă în cvs2. Fonturile lui (Bricolage Grotesque, Atkinson Hyperlegible)
  vin de la Google Fonts pe claude.ai; în cvs2, unde cadrul n-are rețea, cădeau pe Trebuchet MS și Segoe UI.
- Extensia nu știa nimic de cont (manualul: „nu vede proiectele, contul sau portul mașinii”).
- × scotea cadrul pe loc. Planificatorul își salvează circuitul la 1,2 s după o schimbare, setările CNC și profilul mașinii
  la 0,9 s, atelierul la 0,7 s: o închidere în fereastra asta pierdea ultimele schimbări, fără să spună.

## Decizia

### A. Tema și fonturile lui cvs2

- `JETOANE_TEMA` (`src/extensii/cadru.ts`) primește fonturile, `--font` și `--mono`, și `color-scheme`: tema aleasă în cvs2,
  `light` sau `dark` (valoarea calculată a rădăcinii, pe care `stil.css` o pune pentru fiecare temă). Cadrul le pune pe
  rădăcină ca pe celelalte; `color-scheme` e o proprietate, deci controalele browserului din cadru o urmează. Toate se trimit
  din nou la fiecare schimbare (tema aleasă, a sistemului la „auto”, limba), fără repornire.
- Planificatorul: intrarea pune pe rădăcina paginii `data-gazda="cvs2"` și `data-theme` (`light` sau `dark`), după
  `color-scheme`, pe loc. Foaia lui, sub `:root[data-gazda="cvs2"]`, leagă de variabilele lui cvs2 suprafețele (`--panou`,
  `--panou-2`), textul (`--text`, `--text-2`), marginile, roșul de pericol, inelul de focus (`--inel`, nou) și fonturile
  (`--font-titlu`, `--font-text`, `--font-mono`, nou). Rămân ale planificatorului masa, lemnul, cărămizile, verdele de semnal
  și butoanele principale (verde în 2D, cărămiziu în 3D): ele spun ce e pe plan și în ce parte a planificatorului ești.
- O gazdă dinainte de 3.Xd (fără `color-scheme`) lasă pagina cu tema ei; pagina de sine stătătoare nu se schimbă.

### B. Contul văzut, cu permisiunea `cont`

- O permisiune nouă în catalog: `cont`, arătată la instalare: „să vadă dacă ești conectat, cu ce nume și ce plan (nu adresa,
  nu parola)”.
- `host.cont` (`ContCvs2`): `{ conectat: false }` sau `{ conectat: true, nume, plan }`, din contul ținut de aplicație
  (`src/app/dreptCont.ts`, ADR 0116 §8), cu planul judecat la zi (`dreptLaZi`, ca exportul și senderul); cât adresa nu e
  confirmată, numele (care e chiar adresa) rămâne gol și planul null; numele, cel mult 80 de caractere. Fără permisiune, null.
  Nimic din adresă, uid, restul dreptului sau proiecte; din extensie, contul nu se poate schimba.
- Contul stă în context, ca tema: vine la pornire și la fiecare schimbare (`aboneazaCont`: intrarea, ieșirea, alt plan, și
  din altă filă, prin evenimentul `storage`), anunțat prin `host.laSchimbare`. `PlanCont`, din API, trebuie să cuprindă
  planurile lui cvs2: un plan nou nu trece de compilator (`src/extensii/cont.ts`).
- Planificatorul îl arată la Circuite, într-o propoziție schimbată pe loc; circuitele rămân deocamdată în browserul acesta.

### C. Închiderea fără pierderi

- `HostApi` primește `nesalvat(da)`, prin care extensia spune când are și când nu mai are modificări nesalvate, și
  `laInchidere(f)`, salvările de făcut când cvs2 îi închide fereastra. Încărcătorul trimite `nesalvat` doar când se schimbă;
  la „inchidere” (cu un număr) rulează toate salvările date, apoi răspunde „inchidere-gata”.
- cvs2: × îi cere extensiei închiderea și așteaptă răspunsul cel mult 5 s; dacă apoi nu mai e nimic nesalvat, o închide,
  altfel întreabă: „Închizi „<numele>”?”, cu „Rămân” (focusul pe el, și Escape; focusul se întoarce la ×) și „Închide
  oricum”. La fel când altă extensie se deschide în locul ei și când o versiune nouă a ei se instalează peste ea. Extensia
  deschisă, aleasă din meniu, doar își arată fereastra. `host.inchide()` nu întreabă: extensia știe ce are. Reîncărcarea sau
  închiderea filei întreabă prin browser (`beforeunload`), cât e ceva nesalvat.
- Planificatorul: salvările amânate ale paginii trec prin `window.cvs2.amana(cheie, f, ms)` (circuitul, setările CNC,
  profilul mașinii, atelierul), iar scrierile adaptoarelor (documentele, `localStorage`) sunt urmărite. Cât e o salvare
  programată, o scriere în zbor sau una refuzată (până reușește alta la aceeași cheie), extensia e nesalvată; „salvat” se
  spune abia după un temporizator, ca două scrieri înlănțuite să nu lase o clipă de „salvat” între ele. La închidere,
  salvările amânate pornesc pe loc și se așteaptă, cu încă o tură după un temporizator, pentru ce pornesc ele. Pe claude.ai
  și în copia de pe calculator rămân temporizatoarele de până acum.

### D. Încărcătorul și API-ul

Textul încărcătorului s-a schimbat, deci și amprenta lui din CSP (`shared/cadruExtensie.ts`, `firebase.json`), pe mecanismul
aprobat în ADR 0127. Politica CSP rămâne aceeași. API-ul rămâne `api: 1`: membrii noi se adaugă. O extensie scrisă pentru ei
verifică dacă există (o gazdă mai veche nu-i are; intrarea planificatorului o face), iar o gazdă mai veche refuză la
instalare permisiunea `cont`, pe care n-o cunoaște.

## Ce am respins

- **Accentul lui cvs2 (portocaliul) pe butoanele principale ale planificatorului:** 2D și 3D și-ar fi pierdut culorile care
  le deosebesc, iar lângă cărămiziul pieselor portocaliul nu se mai deosebea de roșul de pericol.
- **Fonturile planificatorului în pachet:** două familii descărcate (cu acordul owner-ului) și puse în pachet, doar ca
  extensia să arate altfel decât restul lui cvs2.
- **Contul cu adresa sau uid-ul:** extensia nu are nevoie de ele (salvarea în cont o va face cvs2, cu contul lui), iar ce nu
  primește nu poate scăpa.
- **Un serviciu `cont.stare()`, cerut de extensie:** contul e o stare a gazdei, ca tema: vine în context, fără cerere și
  fără așteptare.
- **Doar întrebarea, fără salvările de la închidere:** planificatorul se salvează singur, deci ar fi întrebat la aproape
  orice ×, cât așteaptă cele 1,2 s.
- **Doar salvările de la închidere, fără `nesalvat`:** reîncărcarea paginii nu poate aștepta cadrul; `beforeunload` cere
  răspunsul pe loc.
- **`api: 2`:** extensiile de acum ar fi trebuit refăcute pentru nimic: tot ce e nou se adaugă.

## Limite

- Salvarea în cont nu există încă: contul doar se vede (feliile următoare, cu sesiunea principală: stocarea în cloud e și a
  proiectelor lui cvs2).
- Planul se judecă la trimitere (la pornire și la o temă, limbă sau cont nou): o probă care expiră cât extensia e deschisă se
  vede la următoarea schimbare.
- Engleza planificatorului vine într-o felie separată: textele lui noi sunt în română.
- Întrebarea vine doar când cvs2 închide extensia. O filă închisă de sistem sau un browser oprit nu întreabă: atunci se pierd,
  ca până acum, cel mult schimbările din ultima secundă.
