# ADR 0228 — Rezultatul pe fiecare culoare

**Starea:** acceptat pe 17.11.2026, cu toate recomandările („Da, 1a–2a”, owner-ul, la întrebările de la final); propus
pe 17.11, la cererea sesiunii principale („dacă vrei, pregătește propunerea, fără cod”), după unirea lui 25.3↑d în
`main`. Felia 25.3↑e, lăsată de ADR 0227 („Rezultatul ales pe fiecare culoare … rămâne o felie a ei, dacă o vrei”),
fără mașină, în linia trasării (worktree-ul `trasare`, ramura `wip/25.1-trasare`, adusă la `origin/main`, `021dcc6`).
**Completează:** ADR 0221 (trasarea pe culori), ADR 0227 (liniile mediane pe culori).
**Schița:** <https://claude.ai/artifact/DatxQZJuRxdiL32WAxVoh6> (desenul probelor, cu macheta pastilelor și cele trei
alegeri gata; măsurătorile; întrebările, cu formularul).

## Problema

Pe **Culorile**, „Rezultatul” (ADR 0227) e unul singur, pentru toate culorile: ori contururi, ori linii mediane. Un desen
colorat amestecă adesea cele două: forme pline într-o culoare (un fond, un pătrat, literele pline ale unui logo, de
buzunărit sau de incrustat) și linii în alta (un contur subțire, o schemă, un scris, de gravat pe linie). Azi, pentru
asta, trasezi de două ori, cu alte bife, și ștergi ce nu-ți trebuie.

## Ce am aflat (cercetarea din 17.11)

- **Alte programe** (referință funcțională, din documentația lor; fără cod, interfață sau texte copiate):
  - **ArtCAM / Carveco:** în „Bitmap to Vector”, după reducerea culorilor, fiecare culoare aleasă din listă primește fie
    conturul ei, fie linia ei mediană („Create centreline”): rezultatul se alege pe culoare, la fiecare trasare;
  - **CorelDRAW PowerTRACE, Inkscape, Vectric, LightBurn:** un singur fel pe toată trasarea.
- **Prototipul** [17.11, Node 26, `.tmp/proto-0228.ts`, doar cu nucleele de azi]: desenul probelor din 25.3↑c (o linie
  roșie tăiată de una albastră și de un cerc verde, un pătrat galben plin cu marginea neagră), cu galbenul și negrul pe
  **Contururi**, iar roșul, albastrul și verdele pe **Linii mediane**:
  - galbenul, un contur; negrul, inelul lui (două contururi); roșul, o singură linie (legată de trei ori peste albastru și
    verde); albastrul, o linie; verdele, o buclă: exact ce cere un desen ca acesta;
  - tot pe linii mediane (azi): pătratul galben e un punct (25.3↑d), fără piesă; tot pe contururi: roșul în patru bucăți,
    tăiat de celelalte culori;
  - **timpul pe 12 Mpx:** reducerea culorilor 1,84 s, plasa contururilor încă ~0,4 s, liniile mediane încă ~0,7 s: cu
    reducerea o singură dată, ~3 s pentru amestec (rulate separat, fiecare cu reducerea ei, ~4,8 s).

## Decizia (propusă)

1. **În fiecare pastilă** (o culoare bifată, cu cele legate de ea), o listă **Rezultatul culorii**: **Ca Rezultatul**
   (implicit), **Contururi** sau **Linii mediane**. „Rezultatul” de sus rămâne și dă felul culorilor lăsate „Ca
   Rezultatul” (întrebarea 1); opțiunile liniei mediane (capetele, părțile late, buclele, legarea) apar cât măcar o
   culoare e pe linii mediane și sunt comune lor.
2. **Calculul**, în workerul trasării, cod propriu: reducerea culorilor și etichetele **o singură dată**; plasa și
   contururile doar pentru culorile pe contururi, liniile mediane doar pentru celelalte (`traseazaCuloriMediane`, pe
   etichetele gata). Pragul automat al părților late vine din grosimea culorilor pe linii mediane (o culoare plină pe
   contururi nu-l mai mută). Legarea peste alte culori trece și peste culorile pe contururi.
3. **Piesele:** tot câte una pe culoare, cu felul ei: contururile, vectori închiși cu găurile lor (ca în ADR 0221);
   liniile mediane, tăiate pe linie (ca în ADR 0227); „Importă” le pune împreună, într-un singur pas.
4. **Raportul:** grosimea în pastilele culorilor pe linii mediane (ca acum); punctele, părțile late și legăturile, doar ale
   lor.
5. **Mărimea pachetului:** ~+1,5–2,5 kB (totalul, după unirea lui 25.3↑d în `main`: 708,7 / 800 kB).
6. **Probele, scrise întâi:** desenul probelor cu amestecul de mai sus (piesele, căile, legăturile), fiecare culoare pe
   fiecare fel, reducerea o singură dată (spionată), culorile legate cu felul primei; ușa (felul fiecărei piese, laturile);
   e2e (lista din pastilă, „Ca Rezultatul”, Importă); otrăvurile la capăt.

## Ce am respins

- **Un mod „Automat” în pastilă** (contur pentru o culoare plină, linie pentru una subțire): „Părțile late: Contururi”
  (ADR 0223) face deja din partea plină a unei culori un contur, în interiorul liniilor mediane; alegerea ar dubla-o.
- **Două trasări, una după alta** (întâi contururile unor culori, apoi liniile altora, fiecare cu Importă): rămâne
  posibil, dar reface reducerea și cere ca omul să știe culorile dinainte.
- **Felul ales pe bucată de culoare** (o literă pe contur, alta pe linie, în aceeași culoare): în felia asta, pe culoare;
  pe bucăți, cu legarea culorilor (o culoare se poate împărți la reducere: numărul culorilor).

## Ce impune

- `src/trasare/culori.ts`: etichetele refolosite (reducerea o dată); `src/trasare/medianeCulori.ts`: pe etichetele gata;
  calculul (`src/jobs/calculTrasare.ts`): felul fiecărei culori în cerere (`CerereTrasare`, `AlegeriCulori`).
- Fereastra (`src/ui/FereastraTrasare.tsx`): lista din pastilă; textele, în `src/i18n/import.*.ts`; manualul, în ambele
  limbi.

**Se redeschide dacă:** pe un desen real, culorile pe contururi și cele pe linii nu se potrivesc la margini (o linie care
intră într-o formă plină se oprește înainte sau trece peste ea); amestecul trece de 30 s pe 12 Mpx.

## Întrebările (recomandarea întâi)

Opțiunile de mai sus vin toate (regula „toate opțiunile”); întrebările sunt doar despre ce se exclude.

1. **Implicitul pastilei:**
   - **a)** „Ca Rezultatul”: lista de sus rămâne alegerea principală, iar pastila o schimbă doar unde vrei;
   - b) fără „Rezultatul” de sus pe culori: fiecare pastilă își are felul ei (pornit din cel de azi).
2. **Locul alegerii:**
   - **a)** în pastilă, o listă sub „Se trasează” (lângă culoarea ei, cu grosimea ei);
   - b) sub „Rezultatul”, o listă separată a culorilor pe contururi (cu bife).

**Răspunsurile** (17.11, owner-ul, în sesiunea liniei trasării): „Da, 1a–2a”, deci 1a și 2a, toate recomandările.
