# ADR 0250 — Patru aranjamente ale interfeței, la alegerea omului

**Starea:** acceptat pe 10.11.2026 (propus pe 09.11), cu răspunsurile owner-ului: 1a, 2b, 3a, 4a (provizoriu), 5a
(secțiunea „Răspunsurile owner-ului”, la capăt). **Pe 11.11, owner-ul a schimbat 2b:** codul se scrie într-un worktree
nou, pornit după unirea planșelor („Worktree după planșe”), nu pe `main`. Schițele mai cresc până atunci. **Pe 13.11, §6 s-a
completat:** și fereastra Imprimanta urmează aranjamentul („Da, ca Mașina”). **Tot pe 13.11, schițele acoperă toate
ecranele, iar cele 16 idei din ele sunt acceptate** („Da la toate”): 13 intră în feliile 28.x, 3 devin linii separate.
După tura a opta, încă 11 („Da la toate”): 10 în feliile 28.x, una linie separată. După tura a noua, încă 11 („Da la
toate”), toate în feliile 28.x. După tura a zecea, încă 12 („Da la toate”): 11 în feliile 28.x, una linie separată. După
tura a unsprezecea, încă 13 în feliile 28.x („Da la toate”; a 14-a e a adminului, în ADR 0260) (toate, în secțiunile de la
capăt). **Tot pe 13.11, owner-ul a declarat schițele gata** („Da, sunt gata”; codul pornește după unirea planșelor). **Pe 18.11, §7 s-a schimbat:** pe telefon nu mai lucrăm la desen, iar telefonul primește, cu linia Proiectelor, fluxul „proiectele mele → Trimite la mașină” („1”; secțiunea „Schimbarea din 18.11”). Cererea owner-ului, exactă, după schițele celor patru direcții (canvas-ul
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
7. **Pe telefon (sub 48 rem)** (schimbat pe 18.11, secțiunea „Schimbarea din 18.11: telefonul încarcă și trimite”):
   - pe telefon, omul nu desenează: încarcă un proiect gata făcut (salvat sau urcat în cont) și îl trimite la mașină.
     Fluxul lui („proiectele mele → Trimite la mașină”) e o felie a liniei Proiectelor, după ce proiectele ajung în
     cont;
   - ce merge azi pe telefon rămâne și nu se strică (probele de la 390 și 320 px păzesc asta), dar feliile 28.x nu mai
     aduc așezări de desen pentru telefon; planșele de telefon de pe canvas rămân referință, nu țintă;
   - Clasic trece pe aranjamentul de telefon al Insulelor, ca până acum: o bară de meniuri nu încape la 390 px, iar omul
     o vede scris în fereastra Aspectul.
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
| 28.5↑ | **Insule** rafinat după schița A: bara selecției cu „Rolul…”, cipul traseului cu Animează, zoomul pe pânză, arborele proiectului cu operațiile pe piese; pe telefon, doar ce merge azi rămâne (punctul 7, schimbat pe 18.11). |
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

## Completarea din 13.11: ideile din schițe, acceptate

Pe 13.11.2026 schițele au ajuns să acopere toate ecranele, fiecare în cele patru aranjamente (tabla „Harta schițelor” de pe
canvas). Owner-ul a fost întrebat apoi: „Accepți recomandările la cele 16 idei de pe Harta schițelor?”. A răspuns „Da la
toate”.

**În feliile liniei (recomandarea „da”):**

| Ideea | Felia |
| --- | --- |
| Shift + F10 și tasta Meniu deschid meniul de context pe selecție, în toate aranjamentele | 28.1↑ |
| Poza planșei bifată din start la raportare, în Atelier | 28.1↑ |
| „Ce fac?” lângă „Salvarea n-a mers”: capitolul din manual | 28.1↑ (zona stărilor) |
| Straturile ascunse sau blocate doar pe ecran, în panourile Clasicului | 28.2↑ |
| Meniul Extensii (în bara de meniuri a Clasicului, între Mașina și Ajutor), cu „Trimite selecția la …” | 28.2↑ |
| Filele foilor sub planșă, în Clasic | 28.2↑, după unirea planșelor |
| Comanda „extensie” / „ext” | 28.3↑ |
| Linia de comandă pe tabletă doar cu o tastatură legată | 28.3↑ |
| „?” pe fiecare pas, cu manualul alături; cardul „Unelte din extensii” în pasul 1; plăcile recente ca variante la foaia nouă | 28.4↑ |
| Alegerea controlerului la pasul 5 fără mașină legată; bifa filamentului la imprimantă | 28.6↑ |
| Turul de trei opriri după alegerea aranjamentului (Pas cu pas n-are tur; Manual › „Turul interfeței” îl reia) | 28.7↑ |
| Placa de probă în proiectul gol: un desen gata, dus prin cei cinci pași până la G-code | 28.7↑ (intrarea), 28.4↑ (pașii) |
| Regulile de strângere la 1024 px (tabla „La 1024 × 768”) | fiecare felie, pentru aranjamentul ei, cu proba la 1024 px cu fontul lat, ca bara de sus la 1280 |

**Două butoane din stări au nevoie de altceva întâi.** „Salvează ca fișier…” vine cu fișierul `.cvs2` (linia proiectelor,
mai jos). „Scrie aici” cere ca fila care doar citește să poată lua scrierea de la cealaltă. E o schimbare a depozitului cu
un singur scriitor (felia 1.7), cu proba ei, deci o felie mică a depozitului, nu a aranjamentelor.

**Linii separate (recomandarea „separat”),** fiecare cu ADR-ul și întrebările ei, la cuvântul owner-ului:

- **Simularea ca vedere unică:** harta adâncimilor (ADR 0047), relieful 3D (ADR 0057) și animația traseului (ADR 0099)
  într-un singur loc, cu momentul împărțit pe operații și operațiile ascunse la cerere. În aranjamente intră doar locul ei
  (tabla „Simularea”).
- **Mai multe proiecte, fișierul `.cvs2`, lista versiunilor:** azi browserul ține un proiect, cu ultimele 20 de versiuni.
  Lista proiectelor, deschiderea unei versiuni ca proiect nou și fișierul ca document al proiectului sunt o linie a
  depozitului.
- **Clipboardul** (Taie, Copiază, Lipește), cerut de meniurile Clasicului: o funcție a editării, valabilă în toate
  aranjamentele.

Mărimea fiecărei idei intră în ținta feliei ei (secțiunea „Mărimea”).

### Ideile turei a opta, acceptate tot pe 13.11

După tura a opta (tablele Conectarea mașinii, Proiectul gol, Textul și Tastatura), owner-ul a fost întrebat: „Accepți
recomandările la ideile noi 17–27?”. A răspuns „Da la toate”.

| Ideea | Felia |
| --- | --- |
| Plăcile mari ale Atelierului în proiectul gol, cu „Am deja G-code” (deschide Mașina, cu „Fișier…”) | 28.1↑ |
| Plăcile fonturilor și tastatura tabletei, în Atelier | 28.1↑ |
| F6 trece prin zonele aranjamentului, Shift + F6 înapoi; ordinea stă în tipul `Aranjament`, cu o probă care le parcurge pe toate | 28.1↑ |
| Pagina de start a Clasicului, ca filă de document, închisă singură la primul desen | 28.2↑ |
| Textul în grila proprietăților, pe grupuri (Textul, Forma literelor, Așezarea); Alt cu literele meniurilor și F10 | 28.2↑ |
| Comanda „conecteaza <nume>” | 28.3↑ |
| Fontul ales după scop în Pas cu pas („simplu”, „cu serife”, „pentru gravură pe linie”); Ctrl + Enter apasă „Continuă” | 28.4↑ |
| Cardul „Foaia e goală” pe planșă, cu cele trei începuturi, plecat la primul gest | 28.5↑ |
| Opțiunile rare ale textului, pliate sub „Mai mult”, în Insule | 28.5↑ |
| Conectarea după aranjament: dialogul Clasicului, cardurile Atelierului, „Leagă mașina” la începutul pasului 5, cu avertismentul WiFi înainte de „Conectează” | 28.6↑ |

**Linie separată:** editarea textului direct pe planșă, cu dublu clic. Ține de unealta Text, deci de toate aranjamentele.

### Ideile turei a noua, acceptate tot pe 13.11

După tura a noua (tablele Acțiunile pe forme, Traseul și animația, Mesajele și confirmările, În engleză), owner-ul a fost
întrebat: „Accepți recomandările la ideile noi 28–38?”. A răspuns „Da la toate”.

| Ideea | Felia |
| --- | --- |
| Bara selecției a Atelierului, cu acțiunile pe forme ca butoane de 60 px; offsetul cu − / + | 28.1↑ |
| Comenzile animației de 72 px, cu operația și freza scrise sub timp, în Atelier | 28.1↑ |
| O zonă „mesaj” în tipul `Aranjament`: toate uneltele scriu acolo rezultatul lor, cu „Anulează” (Ctrl Z) lângă mesaj | 28.1↑ |
| Confirmarea ieșirii din foaie pe tot ecranul, cu bifa de 36 px, în Atelier | 28.1↑ |
| Meniul Vectori cu submeniurile Aliniere, Copiere, Booleanul; Offset… și Taie… ca dialoguri; comanda „offset 10 ext” | 28.2↑ (comanda: 28.3↑) |
| Animația ca panou andocat jos, cu banda operațiilor; timpul jobului în bara de stare | 28.2↑ |
| Confirmările ca dialog clasic, cu Renunță ca buton implicit | 28.2↑ |
| Cardul „Formele alese” în pasul 1, cu acțiunile grupate după scop și o propoziție | 28.4↑ |
| În pasul 2, lista operațiilor cu timpul fiecăreia și traseul operației alese | 28.4↑ |
| Numele pașilor în engleză: Drawing, Cutting, Checking, Simulation, Machine | 28.4↑ |
| Panoul animației plutește între insule, fără să acopere proprietățile | 28.5↑ |
| Bara fiecărui aranjament probată în ambele limbi, cu fontul lat (Verdana / DejaVu Sans) | fiecare felie |

Zona „mesaj” schimbă unde scriu uneltele, nu ce scriu: textele mesajelor rămân aceleași.

### Ideile turei a zecea, acceptate tot pe 13.11

După tura a zecea (tablele Transformarea și ancora, Nodurile și Pen-ul, Navigarea și ajutoarele de desen, Fonturile),
owner-ul a fost întrebat: „Accepți recomandările la ideile noi 39–50?”. A răspuns „Da la toate”.

| Ideea | Felia |
| --- | --- |
| Mânerele transformării de 16 px, cu ținta de atingere de 44 px; selectorul ancorei cu celule de 56 px; comutatorul „Proporțional” în locul lui Shift, în Atelier | 28.1↑ |
| Bara nodului cu butoane de 56 px (tipul, Desparte, Scoate nodul); nod nou cu apăsare lungă pe o latură, în Atelier | 28.1↑ |
| Zoomul de 64 px, comutatoarele Lipire, Grilă, Ghidajele de 56 px și gesturile cu două degete, în Atelier | 28.1↑ |
| Transformarea în Clasic: lățimea, înălțimea, lacătul proporțiilor și rotirea scrise în bara de context; ancora și înclinarea în fila Unealta | 28.2↑ |
| X / Y ale nodului și ale mânerelor în grila proprietăților; „Scoate nodul” ca buton, în Clasic | 28.2↑ |
| Lipire, Grilă, Ghidaje ca comutatoare în bara de stare, cu pasul grilei și zoomul ca listă, în Clasic | 28.2↑ |
| Comenzile „roteste 15”, „pen” (cu puncte scrise X,Y) și „zoom” („zoom toata”, „zoom 200”, „zoom +”) | 28.3↑ |
| Cardul „Mărimea și locul”, cu ancora explicată într-o propoziție, în Pas cu pas | 28.4↑ |
| Noduri și Pen grupate ca „forme libere”, cu tipurile Colț și Curbă, în Pas cu pas | 28.4↑ |
| Doar Lipirea la vedere; grila, ghidajele și riglele sub „Mai multe”, în Pas cu pas | 28.4↑ |
| Insula zoomului în colțul planșei, cu − și +, în Insule | 28.5↑ |
| Fereastra Fonturi după aranjament: dialogul clasic (28.2↑), plăcile (28.1↑), „De unde vine fontul” (28.4↑); bifa „Doar cu diacriticele românești” implicită în română (28.1↑, pentru toate) | 28.1↑–28.4↑ |

**Linie separată:** textul de probă din fereastra Fonturi ia textul omului (textul ales pe planșă), nu o frază fixă. Ține de
fereastră, deci de toate aranjamentele.

**Ce nu există azi** și intră prin aceste felii: câmpul de rotire scris (azi rotirea se face din mâner), butoanele − / + de
pe pânză (azi zoomul e cu rotița, iar bara de jos are „Zoom N %” și „Arată toată foaia”).

### Ideile turei a unsprezecea, acceptate tot pe 13.11

După tura a unsprezecea (tablele Exportă vectori…, Verifică vectorii, Tăierea și rolurile mele, „Din desen…” al
imprimantei), owner-ul a fost întrebat: „Accepți recomandările la ideile noi 63–76?”. A răspuns „Da la toate”. Ideea 76
ține de admin și stă în ADR 0260.

| Ideea | Felia |
| --- | --- |
| Plăcile formatelor la Exportă vectori, cu conturul foii ca comutator, în Atelier | 28.1↑ |
| Problemele verificării ca carduri cu „Arată”, reparațiile de 64 px, în Atelier | 28.1↑ |
| Rolurile mele ca plăci și adâncimea cu − / +, în Atelier | 28.1↑ |
| Dialogul Exportă vectori al Clasicului (numele, formatul, straturile); formatul ales ultima dată, ținut în browser | 28.2↑ |
| Verificarea ca panou andocat jos, cu problemele în tabel și dublu clic spre locul lor | 28.2↑ |
| Panoul andocat „Rolurile mele” | 28.2↑ |
| Comenzile „exportvectori dxf” și „rol "Buzunar ușă"” (rolul după nume) | 28.3↑ |
| „Alte fișiere: desenul, fără tăieri” în pasul 5 | 28.4↑ |
| Rolurile pe înțeles („Decupat pe contur”, „Scobit înăuntru”, „Gravat în V”, „Găuri”), rolurile tale ca butoane, restul sub „Alt rol…” | 28.4↑ |
| Exportă vectori sub iconița din capul ferestrei, cu lista straturilor înainte de export | 28.5↑ |
| Verificarea vectorilor ca insulă la dreapta, deschisă cât repari | 28.5↑ |
| „Din desen…” după aranjament: dialogul cu file (Clasic), plăcile pentru material și calitate (Atelier), pasul 1 al imprimantei „Ce imprimi?” (Pas cu pas) | 28.6↑ |

## Schițele, încheiate pe 13.11

Pe 13.11.2026, după a unsprezecea tură, owner-ul a fost întrebat: „Declari schițele gata, ca să pornim codul aranjamentelor
după planșe?”. A răspuns „Da, sunt gata”.

- **Canvas-ul** (<https://claude.ai/artifact/VuzcaEYQsLoTvRBxpnSak2>) e referința feliilor 28.1↑–28.7↑:
  - rândurile A–D: cele patru aranjamente;
  - rândurile E și F: ce e comun tuturor;
  - tabla „Harta schițelor”: fiecare ecran în fiecare aranjament și cele 76 de idei hotărâte;
  - rândul G e al adminului (ADR 0260).
- **Ce mai trebuie înaintea codului:** doar unirea planșelor în `main` (decizia din 11.11, „Worktree după planșe”). La
  13.11, seara, ramura `wip/11.1-plansele` avea 11.5↑ gata și 46 de commit-uri neunite. Unirea o face sesiunea
  principală, la cuvântul owner-ului.
- **Apoi:** worktree-ul `aranjamente` (`wip/28.1-aranjamente`, `C:\Users\besli\cncvs2-lucru\aranjamente`, e2e pe 4182 și
  `127.0.9`), din `main`-ul cu planșele, cu felia 28.1↑ întâi (Atelier, alegerea și ținerea). O schimbare de design de
  acum încolo trece întâi pe canvas, apoi în ADR.

## Schimbarea din 18.11: telefonul încarcă și trimite

În timpul feliei 28.1↑d, owner-ul a scris, exact: „ca idee, ma gandesc ca pe telefon userii nu vor crea fisiere pentru
executie si doar vor incarca modele deja create, salvate sau uploaded in cont si le vor trimite catre o masina pentru
executie. asa ca nu cred ca este nevoie sa ne concentram design complet pentru mobile”. La întrebarea „hotărăsc acum (§7
schimbat) sau doar scad prioritatea telefonului?”, cu prima variantă recomandată, a răspuns „1”.

- **Ce se schimbă:** §7 (mai sus) și rândul 28.5↑. Feliile 28.x nu mai aduc așezări de desen pentru telefon; ce merge
  azi pe telefon (Insule, Atelier cu uneltele într-un rând jos, Clasic pe aranjamentul Insulelor) rămâne și e păzit de
  probele de la 390 și 320 px.
- **Fluxul telefonului:** lista proiectelor din cont, alegerea unuia, „Trimite la mașină” (acțiunea `export.trimite`,
  din 28.1↑d). E o felie a liniei Proiectelor (proiectele multiple, `.cvs2` ca document; încă fără ADR), fiindcă cere
  proiectele în cont: azi aplicația ține doar ultimele 20 de versiuni locale, în browser, fără listă.
- **Ce există deja și nu e același lucru:** primirea lucrărilor (ADR 0126, `#primeste-lucrare`) aduce programe de la
  altă aplicație deschisă alături, nu din cont; telefonul ca telecomandă (§8) rămâne o linie a ei, după cercetare.

## Implementarea

- **28.1↑a, 16.11: alegerea și densitatea, citite înaintea primei randări** (worktree-ul `aranjamente`, ramura
  `wip/28.1-aranjamente`):
  - `src/ui/alegereAranjament.ts` citește cheia `cncvs2.aranjament`, ca JSON `{ v: 1, aranjament, densitate }`.
  - Fiecare câmp se judecă singur și doar ca proprietate proprie (`Object.hasOwn`).
  - O valoare stricată sau altă versiune dă Insule cu densitatea normală.
  - Un aranjament pe care build-ul nu-l are încă dă Insule, iar alegerea ținută rămâne: citirea nu scrie.
  - `main.tsx` pune `data-aranjament` și `data-densitate` pe `<html>`, lângă temă, înaintea primei randări. Tot acolo îi dă
    lui `App` aranjamentul din `ARANJAMENTE` (`aranjament.ts`). Deocamdată acolo stau doar Insulele, iar fiecare felie 28.x
    adaugă unul.
  - Densitatea mare: `--tinta` 48 px, 56 la atingere (`stil.css`).
  - Mărimea, față de un build curat al lui `main` `0e3725c`: pornirea 105,7 → 106,2 kB (cu ușa 110,1 / 115), totalul
    695,8 → 696,2 / 800.
- **28.1↑b, 17.11: fereastra Aspectul** (aceeași ramură, adusă la `main` `5ab3941`, după unirea lui 28.1↑a în `8ea3057`;
  la capăt, `main` `4b52fc3`, fără conflicte):
  - `src/app/Aspectul.tsx` vine la cerere, cu mesajele panourilor (`carcasa`) și cu CSS-ul ei (`aspect.css`). Arată cele
    patru aranjamente, fiecare cu miniatura și rândul de descriere. Se pot alege doar cele din `ARANJAMENTE_DISPONIBILE`
    (azi, Insule); Clasic, Atelier și Pas cu pas se văd „în curând”.
  - Tema și „Butoane mari” se aplică pe loc: densitatea pe `<html>`, tema prin aplicație (butonul din bară o arată).
    Renunță sau Escape pun la loc ce era la deschidere; Păstrează scrie `cncvs2.aranjament`.
  - Se deschide din meniul contului (rândul **Aspectul…**, după Manual, cu aranjamentul de acum în dreapta) și din paletă
    (`vedere.aspect`, „Aspectul interfeței”), din orice fereastră, ca tema.
  - F1 în fereastră deschide capitolul ei din manual. Ține locul legăturii „Despre aranjamente, în manual” din schiță:
    manualul e al editorului, iar fereastra stă în aplicație.
  - `alegereaDeAcum` (în `alegereAranjament.ts`) citește alegerea de pe `<html>`; tot acolo s-a mutat lista temelor, din
    `App.tsx`.
  - Manualul are capitolul „Aspectul interfeței” (`vedere.aspect`, ușa a 108-a), iar testul pas cu pas din aplicație, pasul
    lui (36 de pași).
  - Mărimea, față de un build curat al lui `main` `5ab3941`: pornirea 106,3 → 106,6 kB (cu ușa 110,6 / 115), totalul
    703,4 → 704,6 / 800; pe unirea cu `main` `4b52fc3`: pornirea 106,6 kB (cu ușa 110,6 / 115), totalul 710,8 / 800.
- **28.1↑c, 17.11: Atelierul pe Proiectare, așezarea** (aceeași ramură, adusă la `main` după unirea lui 28.1↑b; la
  capăt, `main` `b6aaa54`, fără conflicte):
  - Atelierul e al doilea aranjament al build-ului. Datele lui (`src/ui/aranjamentAtelier.ts`: aceleași acțiuni, cipuri,
    panouri și ferestre ca Insulele) și CSS-ul lui vin ca bucată la cerere (`src/ui/atelier.ts`, `atelier.css`), adusă
    de `src/ui/incarcaAranjament.ts`: înaintea primei randări când e ales (`main.tsx`), sau pe loc din fereastra
    Aspectul (App ține aranjamentul în stare). Fără bucată: Insulele, cu alegerea ținută păstrată și motivul în jurnalul
    local.
  - Așezarea, după planșa „C · Întunecat”: uneltele de desen pe o coloană în stânga, pe două coloane, cu numele și tasta
    la vedere; bara de sus cu Anulează și Reface numite; extensia pe mai multe rânduri; panourile împreună, în dreapta.
    Sub 1024 px (tableta în picioare, telefonul), uneltele trec într-un rând jos, care se derulează (planșa „C ·
    Telefon”).
  - Prima alegere din fereastră îl pornește întunecat și cu butoane mari (§5); tema și densitatea se schimbă apoi ca
    oricând.
  - Locul coloanei e rezervat de la pornire, iar foaia se potrivește din nou când modulul editării umple extensia (care
    se rupe pe rânduri în coloana din mijloc) și după o schimbare pe loc.
  - Rămân pentru 28.1↑d (tot din planșa „C”): felul tăierii din butoane mari, − / + la adâncime și pas, cartela frezei
    și „Trimite la mașină” (acțiunea nu există încă).
  - Mărimea, pe unirea cu `main` `b6aaa54`: pornirea 107,0 kB (cu ușa 111,0 / 115), totalul 716,8 / 800; bucata
    Atelierului 0,30 kB, cu pornirea și ușa 111,3 / 115.
- **28.1↑d, 18.11: tăierea din butoane mari, în Atelier** (aceeași ramură, adusă la `main` `ae5a13c4` la pornire;
  ciocnire doar în DEVLOG):
  - Tipul `Aranjament` are câmpul `taierea`: `lista` (Insule: rolul din listă, câmpurile) sau `butoane` (Atelier);
    `verificaAranjament` prinde un fel necunoscut.
  - În Atelier, tăierea stă prima în panoul de proprietăți, ca pe planșa „C · Întunecat”: felul ei din butoane mari
    (rolurile care se potrivesc formelor alese, apoi rolurile omului; apăsat e rolul de acum), adâncimea și pasul cu − /
    + (câte 0,5 mm, la micron; oprite înainte de zero și când formele alese au valori diferite, cu motivul în sfat;
    câmpul dintre ele rămâne de scris), cartela frezei (freza comună: numărul, felul, diametrul; „Schimbă” deschide
    fereastra exportului, unde se alege freza). Calculul stă în `src/app/taiereButoane.ts`.
  - „Trimite la mașină” e o acțiune nouă a registrului exportului (`export.trimite`, cu starea lui `export.gcode`), deci
    e și în paletă, în orice aranjament. Deschide fereastra exportului cu butonul „Trimite la mașină”; după un export pe
    care senderul îl vorbește (familia GRBL), programul intră în Mașina fără să pornească, ca prin „Deschide în Mașina”
    (ADR 0132 §7), fără al doilea clic. Fișierul se descarcă și aici, ca la orice export. Cu un controler pe care
    senderul nu-l vorbește (NcStudio, RichAuto), butonul e „Exportă”, iar nota postului spune de ce. Lista de dinainte
    de pornire (planșa „C · Trimite la mașină”) rămâne a ferestrei Mașina (§8, etapa 13).
  - „Trimite la mașină” și „Exportă G-code” stau la capătul panoului, lipite de marginea lui de jos (la vedere oricât se
    derulează), cu motivul unui refuz scris (pe tabletă sfatul nu se vede); sub 1024 px, unul lângă altul. De la 1024
    px, panourile Atelierului sunt mai late (până la 320 px, ca pe planșă), ca rolurile să încapă câte trei pe rând, cu
    numele întregi.
  - Manualul: capitolul „Atelierul” acoperă `export.trimite` (ușa a 109-a); pasul `x-atelier` al testului din aplicație
    cere și tăierea din butoane și trimiterea.
  - Rămân pentru felia zoomului (ideile turei a zecea): Lipire și Grilă cu nume pe pânză, zoomul de 64 px, gesturile cu
    două degete.
  - Mărimea, pe codul cu `main` `ae5a13c4`: pornirea 107,1 kB (cu ușa 111,1 / 115), totalul 719,0 / 800; bucata
    Atelierului 0,32 kB, cu pornirea și ușa 111,4 / 115. Față de baza `354ed251`: pornirea +0,1, totalul +1,1.
