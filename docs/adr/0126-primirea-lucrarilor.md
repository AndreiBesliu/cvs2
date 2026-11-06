# ADR 0126: Primirea lucrărilor de la alte aplicații (protocolul „cvs2-lucrare” v1)

**Starea:** acceptat pe 02.11.2026 pentru felia 3.S, prima a liniei Trenuleț (sesiunea dedicată, worktree-ul `wip/trenulet`).
Pornește din cererea owner-ului din 01.11, făcută în sesiunea Planificatorului Trenuleț: „pregatit sa comunice cu cvs2 ca sa
putem trimite fisierele direct la masina de executie”. Răspunsurile owner-ului la întrebările primirii au venit pe 02.11, cu
recomandările, fără obiecție („La întrebările vechi (1–5 și 8–12), dacă nu spui altfel, merg pe recomandări”, apoi „Da, ca
recomandat”):
- dialogul e modal, la sosire;
- pe live, primirea pornește abia după o placă de probă trimisă așa pe test;
- după „Primește”, panoul mașinii se deschide singur;
- lucrarea primită stă doar în memorie: la reîncărcare se pierde, iar planificatorul o retrimite dintr-un clic.

## Contextul

Planificatorul Trenuleț e o pagină separată: pe claude.ai și ca o copie pe calculator, cu originea `"null"`. Desenează
circuite de cale ferată din lemn și scoate G-code cu postul portat din cvs2. Din versiunea 11, butonul lui „Trimite la cvs2”
deschide cvs2 într-o filă nouă, la `<adresa>#primeste-lucrare`, și vorbește protocolul de mai jos. Partea lui cvs2 lipsea:
planificatorul aștepta 20 de secunde, apoi îi spunea omului să încarce fișierul cu „Fișier…”.

Protocolul și o propunere de cod au fost scrise de sesiunea Trenuleț, în afara repo-ului (`Apps/Trenulet/cvs2/`:
`PROTOCOL_CVS2.md`, `primireLucrare.ts`, `primireLucrare.test.ts`). Aici intră re-probate, după regula proiectului.

Pe termen lung, planificatorul devine o extensie a lui cvs2 (decizia owner-ului din 02.11, în `CLAUDE.md`). Ca extensie, el
dă programele senderului prin `HostApi` (feliile 3.Xa și 3.Xb), nu prin protocolul ăsta. Protocolul rămâne pentru pagina de
sine stătătoare. Lista „Lucrarea primită” din panoul mașinii e locul comun al programelor venite din afară.

## Decizia

### A. Protocolul (v1, fixat de partea care trimite)

Mesajele sunt obiecte simple, trimise cu `postMessage`, cu `protocol: "cvs2-lucrare"` și `versiune: 1`:
- **`gata`** (cvs2 → cel care trimite): `{ tip: "gata", aplicatie: "CNC Vector Studio 2" }`, spre `window.opener`, cu ținta
  `"*"`: la pornire, când adresa are ancora, și la fiecare schimbare a ancorei spre ea. Mesajul nu conține nimic;
- **`cauta`** (cel care trimite → cvs2): cvs2 răspunde cu `gata`, spre originea mesajului;
- **`lucrare`**: `id`, `de_la` (`aplicatie`, `versiune`), `titlu` și `fisiere`, în ordinea de tăiere. Fiecare fișier are
  `nume`, `text` (G-code ASCII cu `\n`) și `sha256` (hex mic), plus câmpuri doar pentru om: `rol`, `placa`, `fata`, `scula`,
  `timp_s`;
- **`primit`** (cvs2 → cel care trimite), cu același `id`: `acceptate` (numele) și `refuzate` (`{ nume, cod, linie }`, cu
  linia numărată de la 0), sau `renuntat: true`.

Limitele (`LIMITE` în `src/app/primireLucrare.ts`):
- cel mult 64 de fișiere, 32 MB unul și 128 MB toate;
- numele, ASCII vizibil, fără `/` și `\`, altele decât `.` și `..`, fără dubluri;
- titlul, tăiat la 200 de caractere.

O lucrare cu un `id` deja văzut se ignoră. O formă greșită, sau altă versiune, se ignoră: v1 n-are un mesaj de eroare, iar
cel care trimite spune singur, după `gata`, că versiunea nu se potrivește.

### B. Siguranța

- **Doar fereastra care a deschis fila.** cvs2 ascultă numai mesajele cu `ev.source === window.opener`. O pagină oarecare
  nu-i poate trimite lucrări.
- **Omul confirmă.** Dialogul arată de unde vine lucrarea (originea, aplicația, titlul) și fișierele ei. Fără „Primește”, nu
  se întâmplă nimic.
- **Fiecare fișier e verificat ca unul adus cu „Fișier…”.** Trece prin `incarcaProgram` cu `sursa: 'fisier'` și amprenta
  declarată. Așa, `M6` e refuzat (`m6-strain`), la fel `\r`, ASCII-ul depășit și liniile lungi, iar o amprentă diferită dă
  `hash`. Fișierele primite **nu** intră în `ultimulExport`: acolo s-ar încărca cu `sursa: 'export'`, iar `M6` ar trece
  fără blocul postului nostru.
- **Nimic nu pornește singur.** După primire, fișierul se alege și se încarcă din panoul mașinii. Pornirea rămâne gestul omului,
  cu verificările de azi: dreptul contului, avertismentul WiFi, fluxul.
- **Nu există o listă de origini permise.** Cei care trimit au origini necunoscute dinainte: pagina de pe claude.ai,
  copia de pe calculator (`"null"`), localhost. Protecția e `window.opener` plus confirmarea omului.
- **Răspunsurile nu conțin nimic secret:** doar numele fișierelor și codurile refuzului. De aceea, unei origini `"null"`
  i se răspunde cu ținta `"*"`.

**Constrângerea:** Hosting-ul nu pune antetul `Cross-Origin-Opener-Policy`, care ar tăia `window.opener`. Azi nu e pus.
Punerea lui cere un protocol nou.

### C. În aplicație

- **Pornirea.** În pachetul de pornire intră doar verificarea „ancora e `#primeste-lucrare` și există `window.opener`”, la
  pornire și la `hashchange`, și doar în afara instanței live (secțiunea D). Ascultarea și dialogul (`src/app/primireLucrare.ts`,
  `src/app/DialogLucrare.tsx`) se aduc la cerere, cu mesajele panoului mașinii (ADR 0086: `mesaje = mesajeGata()`, încărcat
  cu `.then(cuMesaje)`).
- **Dialogul** e modal. Aplicația de sub el e inertă, ca sub dialogul exportului. Arată:
  - originea; `"null"` devine „o pagină deschisă din fișier, de pe calculatorul tău”;
  - aplicația, cu versiunea ei, și titlul;
  - fișierele, cu placa, fața, freza și timpul, când le are.

  Butoanele sunt **Primește** și **Nu**; Escape înseamnă Nu.
- **O lucrare nouă, venită cât dialogul e deschis, o înlocuiește pe cea dinainte.** Celei dinainte i se răspunde
  `renuntat: true`. Omul care apasă din nou „Trimite” vrea ultima variantă.
- **La „Primește”** se verifică toate fișierele, iar lucrarea intră în starea ei (`lucrarePrimita`), separată de
  `ultimulExport`. Cel care a trimis primește `primit`, cu cele acceptate și cele refuzate, iar panoul mașinii se deschide.
  **La „Nu”**, cel care a trimis primește `renuntat: true`.
- **Panoul mașinii** are rândul „Lucrarea primită”: titlul, de unde vine, alegerea fișierului (**Fișierul lucrării primite**,
  în ordinea de tăiere) și butonul **Încarcă lucrarea**. Butonul încarcă octeții cu `sursa: 'fisier'` și amprenta, ca
  „Fișier…”. Fișierele refuzate stau sub rând, fiecare cu motivul, în textele refuzului de la „Fișier…”. Pentru `hash`,
  textul cere o nouă trimitere, nu un export. O lucrare primită nouă o înlocuiește pe cea dinainte.
- **Doar în memorie:** la reîncărcare, lista se pierde.

### D. Pe live

Primirea e oprită pe instanța live: acolo pornirea nu încarcă nimic, nici la ancoră. Owner-ul o pornește după o placă de
probă trimisă așa pe test. Atunci se scoate condiția, cu o notă aici.

## Ce am respins

- **`BroadcastChannel`:** merge doar pe aceeași origine.
- **Un iframe cu cvs2 în pagina planificatorului:** `frame-ancestors 'none'`.
- **Un fișier JSON încărcat de mână:** mai greoi decât „Fișier…”, pe care omul îl are deja.
- **Lucrarea pusă în `ultimulExport`:** s-ar încărca cu `sursa: 'export'`, iar `M6` ar trece fără blocul postului.
- **O coadă de lucrări în dialog:** în v1 câștigă ultima (secțiunea C).
- **Pornirea automată după primire:** trimiterea la mașină rămâne gestul omului, din panou.

## Limite

- Fără `window.opener`, primirea nu există. Așa se întâmplă când browserul desparte fila de pagina care a deschis-o (de
  exemplu pagina de pe claude.ai, după setările ei), sau când adresa e scrisă de mână. Atunci planificatorul trece, după 20
  de secunde, pe „Fișier…”.
- Lucrarea primită se pierde la reîncărcare (alegerea owner-ului).
- O formă greșită se ignoră fără răspuns. Planificatorul așteaptă 90 de secunde, apoi spune omului.

## Se redeschide dacă

- vine protocolul v2 (un mesaj de eroare, mai multe lucrări, alte câmpuri);
- se pune COOP pe Hosting;
- lucrarea trebuie să rămână după reîncărcare;
- owner-ul pornește primirea pe live (secțiunea D).

## Probele

- `test/unit/primireLucrare.test.ts`:
  - forma și limitele lucrării;
  - fiecare fișier verificat ca unul străin: `M6`, `\r\n` și amprenta greșită refuzate cu codul lor;
  - ascultarea: `gata` la pornire, la `cauta` și la ancora pusă mai târziu; lucrarea doar de la fereastra care a deschis
    fila și doar o dată; originea `"null"` cu ținta `"*"`; oprirea scoate ascultătorii.
- `test/e2e/primire.spec.ts`, în Edge. O pagină de pe altă origine (servită de Playwright) deschide aplicația la ancoră,
  așteaptă `gata` și trimite o lucrare cu două fișiere bune și unul cu `M6`. Se verifică:
  - dialogul și conținutul lui;
  - după „Primește”: răspunsul `primit` (acceptate și refuzate), panoul deschis, cele două fișiere în ordine, refuzul
    `M6` cu linia, încărcarea cu amprenta fișierului trimis;
  - la „Nu”: `renuntat: true`;
  - un mesaj de la altă fereastră decât cea care a deschis fila e ignorat;
  - o a doua lucrare cu dialogul deschis o înlocuiește pe prima, iar prima primește `renuntat`.
- Otrăvurile țintite (`scripts/otravuri.py`), pe `primireLucrare.ts` și pe legarea din aplicație.

## Sursele

- `Apps/Trenulet/cvs2/PROTOCOL_CVS2.md` și `HANDOFF_PRIMIRE.md` (01.11.2026), citite pe `main` la `77a1be6`.
- Planificatorul Trenuleț v11+, funcția `trimiteLaCvs2` și ascultătorul lui `message` (`Apps/Trenulet/planificator/`).
