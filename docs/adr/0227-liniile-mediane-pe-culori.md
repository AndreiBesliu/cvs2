# ADR 0227 — Liniile mediane pe culori

**Starea:** propus pe 13.11.2026, la „Da, propune-le” (owner-ul, după felia 25.4↑b). Felia 25.3↑c, lăsată de ADR 0222 §1
(„pe culori, linia mediană a fiecărei culori bifate vine mai târziu, la cerere”), fără mașină, în linia trasării
(worktree-ul `trasare`, ramura `wip/25.1-trasare`, adusă la `origin/main`, `4f379cd`). Codul vine abia după răspunsurile la
întrebările de la final.
**Completează:** ADR 0221 (trasarea pe culori), ADR 0222 și 0223 (linia mediană și opțiunile ei).
**Schița:** <https://claude.ai/artifact/ETpi7XDNW8ApGivaNZKb91> (desenul prototipului, culorile, liniile mediane ale fiecărei
culori fără legare și cu legarea și părțile late; macheta ferestrei; ce am măsurat; întrebările, cu formularul).

## Problema

Pe **Culorile**, „Rezultatul” nu apare: fiecare culoare iese ca o formă, cu conturul ei. Un desen cu linii colorate (o
schemă, un logo desenat cu linii, un desen de copil cu carioci) iese deci cu două margini pe fiecare trăsătură, ca la
alb-negru înaintea liniei mediane (ADR 0222). Pentru gravură, fiecare culoare ar trebui să fie linia ei de mijloc, tăiată pe
linie, cu adâncimea sau freza ei.

## Ce am aflat (cercetarea din 13.11)

- **Alte programe** (referință funcțională, din documentația lor; fără cod, interfață sau texte copiate):
  - **ArtCAM / Carveco:** în „Bitmap to Vector”, după reducerea culorilor, „Create centreline” pe culoarea aleasă din listă
    (culorile legate de ea se trasează împreună), cu toleranța în pixeli și vectorii deschiși sau închiși; „Thin” face
    dintr-o culoare un schelet de un pixel;
  - **CorelDRAW PowerTRACE:** „Centerline Trace” nu reduce și nu unește culori; documentația îl recomandă pe alb-negru;
  - **Inkscape** (prin AutoTrace) și **LightBurn**, **Vectric**: linia mediană, dacă o au, doar pe alb-negru.
- **Prototipul** [13.11, Node 26, `.tmp/proto-mediane-culori.ts`]: un desen de 600 × 400 cu trăsături de 6 px: o linie roșie
  tăiată de o linie albastră și de două ori de un cerc verde (desenate peste ea), un pătrat galben plin cu marginea neagră;
  trasat pe culori (nucleul real, numărul automat: cele cinci culori și hârtia), apoi linia mediană a fiecărei culori pe
  masca ei (`traseazaMediana`, nucleul liniei mediane, neschimbat):
  - **exactă:** bucla neagră și cea verde, linia albastră, la cel mult 0,17 px de mijlocul adevărat al trăsăturii;
  - **încrucișările:** linia roșie iese în **patru bucăți**: unde altă culoare trece peste ea, roșul lipsește. Legate
    capetele aceleiași culori față în față (direcțiile opuse, la cel mult 25° de dreapta dintre ele), la cel mult trei
    grosimi, cu tot drumul pe desen (nu pe hârtie) și măcar o bucată din altă culoare: o singură cale (trei legături);
  - **pătratul galben plin:** ca linie mediană, doar o liniuță în centrul lui (scheletul, scurtat de capete); ca „parte
    lată” (ADR 0223), abia cu pragul
    din **grosimea desenului întreg** (mediana grosimilor culorilor, ponderată cu lungimea liniilor fiecăreia: 6 px, deci
    pragul 12 px) iese conturul lui; cu grosimea lui singur (160 px), nu e „lat” față de el însuși;
  - **timpul:** fiecare culoare, o trecere a liniei mediane (20–70 ms aici); pe 12 Mpx, o trecere alb-negru ia ~1,5 s
    (ADR 0222), deci pe culori contează decuparea fiecărei culori la cutia ei.

## Decizia (propusă)

1. **Fereastra trasării**, pe **Culorile**: apare „Rezultatul” (**Contururi** sau **Linii mediane**), cu opțiunile liniei
   mediane din ADR 0223 (capetele, părțile late și pragul lor, semnalarea, buclele), comune tuturor culorilor. Fiecare culoare
   bifată dă piesa ei, cu liniile ei mediane (tăiate pe linie) și contururile părților ei late; culorile legate se
   trasează împreună (ca la ArtCAM). Bifa **„Leagă peste alte culori”**: o linie întreruptă de altă culoare continuă peste
   ea (întrebarea 1, implicitul).
2. **Pragul părților late** vine din grosimea obișnuită a desenului întreg (mediana grosimilor culorilor, ponderată cu
   lungimea liniilor fiecăreia), deci o culoare plină (un fond, o pată) iese contur; pragul scris în mm (ADR 0223) rămâne.
3. **Raportul:** grosimea obișnuită a trăsăturilor, față de freza foii (ADR 0222 §5), pe fiecare culoare, în pastila ei
   (întrebarea 2); joncțiunile, buclele, punctele fără linie și legăturile peste alte culori, numărate.
4. **Calculul**, în workerul trasării, cod propriu (regula `trasare-izolat`): după etichetele culorilor, linia mediană a
   fiecărei culori bifate pe masca ei, decupată la cutia ei (nucleul liniei mediane, neschimbat); legăturile, pe căile
   gata (capetele față în față, ca în prototip).
5. **Mărimea pachetului:** ~+1–2 kB (totalul ramurii, după unirea cu `main`: 696,1 / 700 kB).
6. **Probele, scrise întâi:** desene colorate sintetice cu mijlocul trăsăturilor știut (încrucișările, culoarea plină, o
   culoare doar cu puncte, culorile legate), cu plafoanele măsurate; ușa (piesele, `pe-linie`, numele); e2e (Rezultatul pe
   Culorile, legarea, Importă); fișierul real întâi (lecția D7), dacă îl trimiți; otrăvurile la capăt.

## Ce am respins

- **Rezultatul ales pe fiecare culoare** (o culoare contur, alta linie mediană), în felia asta: „Părțile late: Contururi”
  face deja conturul unei culori pline; alegerea în pastilă rămâne o felie a ei, dacă o vrei.
- **Scheletul tuturor culorilor într-o singură trecere** (subțierea pe imaginea etichetelor): mai repede, dar schimbă
  nucleul liniei mediane; abia dacă timpul pe culori iese prea mare.
- **Legarea prin închiderea morfologică a măștii** (umplerea golului din culoarea de deasupra): lățește linia și pe unde
  două culori doar se ating.

## Ce impune

- `src/trasare/culori.ts` sau un modul nou al liniilor mediane pe culori, după etichete; `traseazaMediana` (sau partea ei de
  după câmp) primește o mască; răspunsul pe culori poartă căile deschise ale fiecărei piese.
- Fereastra (`src/ui/FereastraTrasare.tsx`): „Rezultatul” și opțiunile lui și pe culori, bifa legării, grosimea în pastile;
  textele, în `src/i18n/import.*.ts`; manualul, în ambele limbi.

**Se redeschide dacă:** pe un desen real, legarea leagă ce nu trebuie (două linii ale aceleiași culori care doar se
apropie de o a treia) sau lasă rupte trăsături evidente; trasarea pe culori cu linii mediane trece de 30 s pe 12 Mpx.

## Întrebările (recomandarea întâi)

Opțiunile de mai sus vin toate (regula „toate opțiunile”); întrebările sunt doar despre ce se exclude.

1. **„Leagă peste alte culori”, implicit:**
   - **a)** bifată: o linie întreruptă de altă culoare (o încrucișare) iese o singură cale;
   - b) nebifată: fiecare bucată, o cale a ei.
2. **Grosimea trăsăturilor, în raport:**
   - **a)** pe fiecare culoare, în pastila ei (culorile pot avea grosimi diferite: o carioca, un pix);
   - b) una singură, a desenului întreg, ca la alb-negru.
