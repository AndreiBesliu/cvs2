# ADR 0250 — Patru aranjamente ale interfeței, la alegerea omului

**Starea:** acceptat pe 10.11.2026 (propus pe 09.11), cu răspunsurile owner-ului: 1a, 2b, 3a, 4a (provizoriu), 5a
(secțiunea „Răspunsurile owner-ului”, la capăt). **Pe 11.11, owner-ul a schimbat 2b:** codul se scrie într-un worktree
nou, pornit după unirea planșelor („Worktree după planșe”), nu pe `main`. Schițele mai cresc până atunci. **Pe 13.11, §6 s-a
completat:** și fereastra Imprimanta urmează aranjamentul („Da, ca Mașina”; secțiunea de la capăt). Cererea owner-ului, exactă, după schițele celor patru direcții (canvas-ul
<https://claude.ai/artifact/VuzcaEYQsLoTvRBxpnSak2>, 12 ecrane): „imi plac toate, si vreau sa fie la dispozitia userilor”.
**Intră în:** etapa 28 („Cele două interfețe, ghidul de pornire”), adusă în etapa 3, fără mașină (feliile 28.1↑–28.6↑).
**Închide:** rândul de prag „Două interfețe: asistent pas cu pas pentru începători + interfața completă”, dacă răspunsul
la întrebarea 3 e „a”. **Continuă:** felia 2.8a (aranjamentul ca date, `src/ui/aranjament.ts`) și decizia din 13.10 („un
al doilea șablon, clasic […] și interfața personalizabilă”, momentul ales de asistent). **Schimbă:** nimic acceptat.
**Documentul:** neschimbat.

## Problema

- Aplicația are un singur aranjament, `ARANJAMENT_MODERN` (prototipul B, ales pe 13.10). Aranjamentul e deja scris ca date:
  carcasa (`App.tsx`) randează după el meniul global, bara de sus, bara selecției, bara de jos și docurile. Fiecare unealtă
  e id-ul unei acțiuni din registru, deci aranjamentul nu ocolește ușa acțiunilor (PLAN §3.5: barele, meniurile,
  tastatura și asistentul sunt „doar vederi ale aceluiași registru”).
- Schițele din 09.11 arată patru direcții:
  - **A, Insule:** aranjamentul de azi, rafinat;
  - **B, Clasic:** meniuri, panouri andocate, linia de comandă;
  - **C, Atelier:** întunecat, ținte mari, uneltele cu etichete;
  - **D, Pas cu pas:** un rând de pași, de la desen la mașină.

  Fiecare are și ecranele ei pentru Mașina, export, telefon și simulare.
- Ce nu poate exprima `Aranjament` azi:
  - o bară de meniuri (B) și linia de comandă (B);
  - rândul pașilor și panoul pasului (D);
  - ținte mai mari decât 44 px (C);
  - fereastra Mașina așezată altfel decât pe coloane (B, C, D).

  Aranjamentul nu se ține nici după reîncărcare: nu există încă alegere.

## Decizia (propusă)

1. **Patru aranjamente, toate în aplicație**, cu același registru de acțiuni, aceleași taste și aceeași paletă (Ctrl K).
   Nicio acțiune nu există doar într-un aranjament: o probă cere ca fiecare acțiune a registrului să fie la îndemână în
   fiecare (într-o zonă sau în paletă).

   | Id | Numele (ro / en) | Pe scurt |
   | --- | --- | --- |
   | `modern` | Insule / Islands | Implicit. Pânza pe tot ecranul, barele plutesc deasupra ei (azi). |
   | `clasic` | Clasic / Classic | Meniurile Fișier / Editare / Vectori / Trasee / Mașina; bara cu grupuri etichetate; panouri andocate cu file (Proiect, Vectori, Trasee); proprietățile ca grilă; linia de comandă și comutatoarele (Lipire, Grilă, Ghidaje) în bara de stare. |
   | `atelier` | Atelier / Workshop | Pentru tabletă și pentru ecranul de lângă mașină: ținte de 48–64 px, uneltele cu etichete pe două coloane, rolul din butoane mari, adâncimea cu − / +, „Trimite la mașină”. Tema întunecată la prima alegere. |
   | `pasi` | Pas cu pas / Step by step | Rândul pașilor: Desenul → Tăierile → Verificarea → Simularea → Mașina. Fiecare pas are panoul lui; „Continuă” spune ce lipsește. |

   Id-ul `modern` rămâne (probele și CSS-ul îl cer), iar omul vede doar numele.
2. **Tipul `Aranjament` crește, cu probe:**
   - zone noi: `meniuri` (B), `comanda` (B), `pasi` (D);
   - `densitate`: `normala` (36 px, 44 pe ecrane tactile, ca azi) sau `mare` (48 px, 56 pe tactil);
   - felul ferestrei Mașina: `coloane` (azi), `clasic`, `atelier` sau `ghidat`.

   `verificaAranjament` judecă și zonele noi. Carcasa rămâne una singură: un aranjament nou e alt obiect, nu altă carcasă
   (regula din `aranjament.ts`).
3. **Alegerea** se face din trei locuri:
   - meniul contului, rândul **Aspectul…**, lângă Manual, ca ajutorul (ADR 0120);
   - paleta (Ctrl K), la „Aspectul interfeței”;
   - o singură dată, la prima pornire (întrebarea 4).

   Fereastra arată cele patru aranjamente, cu o miniatură și un rând de descriere. Alegerea se aplică pe loc, fără
   reîncărcare, iar Renunță (sau Escape) o pune la loc pe cea dinainte.
4. **Alegerea se ține pe dispozitiv**, ca tema: `localStorage`, cheia `cncvs2.aranjament`, `v: 1`. Tableta din atelier și
   calculatorul din birou vor de obicei aranjamente diferite.
   - Se citește înaintea primei randări, deci aranjamentul nu se schimbă pe ecran după pornire.
   - O valoare necunoscută sau stricată dă Insule.
   - Ținerea în cont (aranjamentul implicit pe un dispozitiv nou) e o felie a ei, mai târziu.
5. **Tema și densitatea rămân alegeri separate**, valabile cu orice aranjament:
   - Atelier pornește întunecat și cu ținte mari, dar tema se schimbă ca azi;
   - „Butoane mari” se poate alege și în Insule, Clasic sau Pas cu pas.
6. **Fereastra Mașina urmează aranjamentul:**
   - Insule: cele trei coloane de azi (ADR 0132 §4);
   - Clasic: bara de comenzi, cu tastele, și programul linie cu linie, cu linia de acum marcată;
   - Atelier: cifrele mari, butoanele de mișcare de 72 px, Zero lângă fiecare axă;
   - Pas cu pas: pasul 5, cu lista de dinainte de pornire (punctul 8).

   Conexiunea, starea, codul controlerului, poziționarea, programul și consola sunt aceleași module în toate; se schimbă
   doar așezarea.
7. **Pe telefon (sub 48 rem):**
   - Insule are aranjamentul lui de azi, rafinat după schiță (fila deschisă cu numele, indicatorul cu Pauză, uneltele
     derulate, foaia cu piesa aleasă);
   - Atelier și Pas cu pas își păstrează felul (ținte mari, respectiv pașii);
   - Clasic trece pe aranjamentul de telefon al Insulelor: o bară de meniuri nu încape la 390 px, iar omul o vede scris în
     fereastra Aspectul.
8. **Funcțiile din schițe care nu țin de aranjament** intră în coada etapelor lor, valabile în toate aranjamentele, nu în
   această linie:
   - **Schimbarea sculei ghidată la M6** (schița C): ridică Z, schimbă freza, palpează, reia. Fereastra Mașina, etapa 13.
   - **Lista de dinainte de pornire** (schița D), cu rânduri adăugate de om („Aspiratorul pornit”) și „Pornește” deschis
     abia după ea. Fereastra Mașina, etapa 13. Aici, Pas cu pas o folosește întâi.
   - **Planșa colorată pe roluri și piesele „Fără rol”, cu sugestia rolului** (schița D). Pas cu pas le cere (pasul
     Tăierile), deci vin în 28.4↑; în celelalte aranjamente, ca opțiune de vedere.
   - **Traseul parcurs în timp real și corecțiile** de avans și turație (schițele A, B, C). Deja în etapa 13 (ADR 0132,
     „mai târziu”).
   - **Telefonul ca telecomandă** prin WiFi (schița C). Cere întâi răspunsul dacă podul ESP3D primește a doua legătură cât e
     legat calculatorul; e o linie a ei, după cercetare.

## Feliile

| Felia | Ce aduce |
| --- | --- |
| 28.1↑ | Alegerea și ținerea: fereastra Aspectul (meniul contului, paleta), `cncvs2.aranjament` citit înaintea primei randări, densitatea, tipul extins cu probe; **Atelier** pe Proiectare (uneltele cu etichete, rolul din butoane mari, − / + la adâncime și pas, „Trimite la mașină”). |
| 28.2↑ | **Clasic**: bara de meniuri (din registru, pe categorii), bara cu grupuri etichetate, panourile andocate cu file, grila proprietăților, bara de stare cu comutatoare. |
| 28.3↑ | Linia de comandă a Clasicului: o acțiune a registrului după nume, cu argumentele ei simple („offset 3”); Enter aplică, Escape renunță, istoricul pe săgeți. |
| 28.4↑ | **Pas cu pas**: rândul pașilor, panoul fiecărui pas (Desenul = uneltele; Tăierile = piesele fără rol, apoi rolurile, cu planșa colorată pe roluri; Verificarea = verificarea vectorilor; Simularea = vederea 3D; Mașina = pasul 5), „Continuă” cu motivul când lipsește ceva. |
| 28.5↑ | **Insule** rafinat după schița A: bara selecției cu „Rolul…”, cipul traseului cu Animează, zoomul pe pânză, arborele proiectului cu operațiile pe piese; telefonul (punctul 7). |
| 28.6↑ | Ferestrele Mașina și Imprimanta după aranjament (punctul 6 și completarea din 13.11), cu lista de dinainte de pornire în Pas cu pas. |
| 28.7↑ | Prima pornire (dacă răspunsul la întrebarea 4 e „a”): alegerea aranjamentului o dată, ca primul pas al ghidului de pornire (rândul de prag „Ghid la prima pornire”). |

Fiecare felie se încheie cu ceva de încercat pe un canal al instanței de test (`aranjamente`).

## Probele

- `verificaAranjament` pe fiecare aranjament. Fiecare acțiune a registrului e la îndemână în fiecare aranjament (o zonă sau
  paleta). Un aranjament cu o problemă cade în proba unitară, nu în fața omului.
- Ținerea:
  - alegerea supraviețuiește reîncărcării;
  - o valoare stricată dă Insule;
  - nimic nu se mișcă pe ecran între prima randare și cea de după încărcare (captura la `DOMContentLoaded` și după, aceeași
    zonă).
- Bara de sus și bara de meniuri încap la 1280 px cu un font lat (Verdana aici, DejaVu Sans pe Linux), în română și în
  engleză (regula din 09.11, `ancore.spec.ts`).
- Fiecare aranjament se probează:
  - la 390, 360 și 320 px;
  - în tema deschisă și în cea întunecată, cu contrastul textului derivat (nu scris de mână);
  - cu țintele lovite (`elementFromPoint` în centrul fiecărui buton al densității mari).
- Manualul are un capitol pentru fiecare aranjament și pentru fereastra Aspectul, în ambele limbi (`%% acopera:`), altfel
  `manual.test.ts` cade.
- Testul pas cu pas din aplicație (`?test`) primește pașii schimbării aranjamentului.

## Mărimea

- **Pornirea:** citirea alegerii și densitatea, ~1–1,5 kB (azi 101,9, cu ușa 105,6 / 110 kB). Aranjamentul implicit rămâne
  în pornire.
- **Restul:** fiecare alt aranjament vine ca bucată la cerere, cu CSS-ul lui, în precache (merge offline). Când e ales, vine
  înaintea primei randări, ca dicționarul limbii (ADR 0095). Estimarea pe total:
  - Atelier ~6 kB, Clasic ~15 kB (cu linia de comandă), Pas cu pas ~12 kB, fereastra Mașina ~8 kB;
  - deci **~40 kB pe total**.
- **Totalul ajunge la plafon:** azi 582,5 / 700. Cu cele trei linii care așteaptă unirea (tăierea +19,4, planșele +18,9,
  imprimanta +32,6) ar fi ~653, iar cu această linie ~693 / 700. Unirea care trece de plafon cere decizia scrisă (ADR 0144),
  măsurată atunci.

## Întrebările (doar ce se exclude), cu recomandarea în față

1. **Fonturile.**
   - **a (recomandat):** fontul sistemului în toate aranjamentele, ca azi. Nimic în plus pe total, CSP-ul neschimbat.
   - **b:** fontul din schiță pentru fiecare (IBM Plex, Inter, Space Grotesk, Manrope), inclus în aplicație. ~150–200 kB pe
     total, deci un plafon nou.
   - **c:** un singur font pentru toate, inclus. ~40–50 kB.
2. **Unde se lucrează.**
   - **a (recomandat):** un worktree nou, `aranjamente`:
     - ramura `wip/28.1-aranjamente`, în `C:\Users\besli\cncvs2-lucru\aranjamente`;
     - e2e pe 4182 și pe rețeaua de loopback `127.0.9`;
     - ADR-urile 0250–0259, canalul `aranjamente`.

     `App.tsx` și `stil.css` sunt atinse de toate liniile, iar `main` așteaptă trei uniri.
   - **b:** pe `main`, după unirile care așteaptă.
3. **Pas cu pas e asistentul pentru începători din prag?**
   - **a (recomandat):** da. Închide rândul „Două interfețe” (cu Clasicul sau Insulele ca „interfața completă”), iar proba
     etapei 28 („un job făcut doar prin asistent”) se face în el.
   - **b:** nu. Rămâne un aranjament, iar asistentul se face separat, în etapa 28.
4. **Prima pornire.**
   - **a (recomandat):** la prima pornire pe un dispozitiv, omul alege aranjamentul o dată (Insule e preselectat). E primul
     pas al ghidului de pornire.
   - **b:** fără. Insule până când omul îl schimbă din meniu.
5. **Ordinea feliilor.**
   - **a (recomandat):** cum e în tabel: Atelier (cel mai ieftin și se vede imediat), Clasic, linia de comandă, Pas cu pas,
     Insule rafinat, Mașina, prima pornire.
   - **b:** altă ordine, spusă de owner.

## Răspunsurile owner-ului

Pe 10.11.2026, exact: „1a, 2 b e mai bine, pentru ca pot aparea si alte diferente, si deci propun sa facem asta dupa ce
mai dezvoltam design-urile inca putin, 3 a, 4 a, dar poate il schimbam mai tarziu, 5, a”.

1. **a, fontul sistemului** în toate aranjamentele. Fonturile din schițele din 09.11 (IBM Plex, Inter, Space Grotesk,
   Manrope) rămân doar ale schițelor; schițele noi folosesc fontul sistemului, ca aplicația.
2. **b, pe `main`**, nu într-un worktree. Feliile pornesc după două lucruri:
   - unirile care așteaptă (planșele);
   - încă o tură de schițe, fiindcă „pot aparea si alte diferente”.

   Worktree-ul `aranjamente`, portul 4182 și rețeaua `127.0.9` nu se mai folosesc. Rămân ale liniei:
   - ADR-urile 0250–0259;
   - canalul `aranjamente` al instanței de test, pentru ce nu trebuie să ajungă pe adresa principală.
3. **a, Pas cu pas e asistentul pentru începători din prag.** Linia închide rândul „Două interfețe”, iar proba etapei 28
   („un job făcut doar prin asistent”) se face în Pas cu pas.
4. **a, alegerea la prima pornire** (felia 28.7↑), **provizoriu** („poate il schimbam mai tarziu”). Dacă owner-ul o
   schimbă, felia se scoate sau se mută, fără alt efect: alegerea din meniul contului și din paletă rămâne.
5. **a, ordinea din tabel:** Atelier, Clasic, linia de comandă, Pas cu pas, Insule rafinat, Mașina, prima pornire.

**Mărimea, la acceptare:** după unirea tăierii și a imprimantei (09.11), totalul e 654,4 / 700 kB. Cu planșele (~+19) și
cu această linie (~+40), ar ajunge la ~713, deci peste plafon. Prima felie care trece de el cere decizia scrisă
(ADR 0144), cu mărimile măsurate atunci.

## Schimbarea din 11.11: worktree după planșe

Pe 11.11.2026, sesiunea principală, care face unirile în checkout-ul comun, a semnalat riscul: două sesiuni care scriu în
același loc se pot ciocni. Ea a recomandat un worktree, ca la celelalte linii. Owner-ul a ales: „Worktree după planșe”.
Asta înlocuiește punctul 2 de mai sus. Rămâne ce cerea 2b: codul vine după unirile care așteaptă și după încă o tură de
schițe.

- **Când:** după unirea planșelor în `main`, din `main`-ul de atunci.
- **Unde:**
  - worktree-ul `aranjamente`, în `C:\Users\besli\cncvs2-lucru\aranjamente`, pe ramura `wip/28.1-aranjamente`;
  - e2e pe 4182 și pe rețeaua de loopback `127.0.9` (libere pe 11.11);
  - ADR-urile 0250–0259, canalul `aranjamente` al instanței de test.
- **Unirea în `main`** o face sesiunea principală, la cuvântul owner-ului, ca la celelalte linii.

Tot pe 11.11 (CLAUDE.md, „Decizii luate”): designul acestei linii e direcția („o sa mergem pe design-ul creat acolo”).
Locul lui Importă, Exportă vectorii și Exportă G-code îl stabilesc aranjamentele; mutarea lor lângă fila Imprimanta, din linia
tăierii, nu se mai unește. Bara de sus a fiecărui aranjament se probează la 1280 px cu fontul lat (`test/e2e/ancore.spec.ts`
sau o probă a lui).

## Completarea din 13.11: Imprimanta urmează aranjamentul, ca Mașina

Pe 13.11.2026, la schița ferestrei Imprimanta în Insule, owner-ul a fost întrebat: „Fereastra Imprimanta urmează și ea
aranjamentul, ca Mașina?”. A răspuns „Da, ca Mașina”. §6 se completează astfel:

- **Regula e aceeași ca la Mașina:** se schimbă doar așezarea. Modulele imprimantei rămân aceleași în toate aranjamentele
  (`src/machine/imprimanta/`, ADR 0190–0194): legătura, starea, temperaturile doar citite, placa cu anularea unei piese,
  pauza din fișier, fișierele și trimiterea lor, „Din desen…” și jurnalul.
- **Așezarea, pe aranjament:**
  - **Insule:** trei coloane: imprimanta (legătura, temperaturile, ventilatoarele și lumina), placa cu progresul și
    butoanele, fișierele. Schița e pe canvas, „A · Imprimanta”.
  - **Clasic:** bara de comenzi, cu tastele, și fișierele ca tabel, ca fereastra Mașina a Clasicului.
  - **Atelier:** butoane mari, temperaturile cu cifre mari, Pauză și Oprește la un deget.
  - **Pas cu pas:** confirmarea de dinainte de pornire („Patul e gol”) e o listă, ca la pasul 5 al mașinii.
- **Felia:** intră în 28.6↑, „fereastra Mașina după aranjament”, care devine „ferestrele Mașina și Imprimanta după
  aranjament”. Dacă felia iese prea mare, Imprimanta se desparte într-o felie a ei, imediat după.
