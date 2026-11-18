# ADR 0261 — Răspunsurile rapide ale tichetelor

**Starea:** propus pe 18.11.2026, pentru felia A.3 a liniei adminului (ADR 0260 §3, acceptat cu „Da la toate”). Textul
acceptat atunci: „Răspunsurile rapide sunt texte scrise de owner, puse în câmp la un clic. Se țin într-o setare nouă, doar a
owner-ului, cu regula ei și cu auditul ei.” Felia s-a oprit aici, cum cere linia: ADR 0260 nu schimbă reguli sau date, iar
setarea nouă le schimbă. **Continuă:** ADR 0116 §13 (răspunsul personalului) și §20 (setările, doar ale owner-ului, prin
callable, cu audit), ADR 0260 §3. **Schimbă:** un document nou (`setari/raspunsuriRapide`), o regulă de citire pentru el și
o acțiune nouă a callable-ului `tichete`, cu rândul ei de audit. Catalogul permisiunilor rămâne neschimbat.

## Problema

Multe răspunsuri la tichete se repetă: „Am primit, ne uităm”, „Reparat în versiunea nouă”, „Ne trebuie pașii” (schița
Tichete de pe canvas, rândul G). Azi fiecare se scrie de mână, de fiecare dată. ADR 0260 a acceptat ideea, dar a lăsat-o
unui ADR al ei, fiindcă cere un document și o regulă noi.

## Decizia (propusă)

1. **Un răspuns rapid** are o etichetă (pe buton, cel mult 40 de caractere) și textul pus în câmp (cel mult 2 000 de
   caractere, cât un răspuns, `RASPUNS_MAX`). Textul are o variantă în română și, dacă owner-ul o scrie, una în engleză.
   Sunt cel mult 12, în ordinea aleasă de owner, cu etichete diferite.
2. **Locul:** documentul `setari/raspunsuriRapide`, lângă `setari/conturi`:
   `{ schema: 1, lista: [{ eticheta, ro, en }], versiune, modificatLa, modificatDe }`. Fără document, lista e goală: codul
   nu inventează texte în numele owner-ului.
3. **Cine le scrie:** doar owner-ul, din fila Setări, într-o secțiune nouă: adaugă, schimbă, șterge, mută sus sau jos, apoi
   Salvează. Scrierea trece prin acțiunea nouă `raspunsuriRapide` a callable-ului `tichete`, pe versiunea văzută: o salvare
   peste o listă schimbată între timp e refuzată, ca la planul văzut (ADR 0116, 14.C↑b). Auditul se scrie în tranzacție
   (`setari.raspunsuriRapide`), cu lista dinainte și cea de după. Sunt texte ale owner-ului, fără date ale clienților, deci
   istoricul din Setări (felia A.6) le poate arăta întregi.
4. **Cine le folosește:** owner-ul și rolurile cu `tichete.raspunde`, adică cei care au câmpul de răspuns. Regula nouă:
   `setari/raspunsuriRapide` se citește (`get`) cu `tichete.raspunde`. Un rol doar cu `tichete.citeste` nu le vede, iar
   `setari/conturi` rămâne doar a owner-ului.
5. **Folosirea:** în fila Tichete, deasupra câmpului de răspuns, stă câte un buton pentru fiecare etichetă.
   - Clicul pune textul în locul cursorului, fără să șteargă ce e scris (cu un rând gol înainte, când e nevoie), iar
     câmpul primește focusul.
   - Se pune textul din limba raportării (`aplicatia.limba`). Fără varianta în engleză, se pune cel în română.
   - Un buton al cărui text nu mai încape în câmp (2 000) se oprește, cu motivul la hover.
   - Răspunsul pleacă la fel ca unul scris de mână: clientul nu vede că a fost rapid.
6. **Citirea:** fila Tichete citește documentul o dată, la deschidere și la „Reîncarcă” (Firestore Lite, fără ascultători),
   doar pentru cine poate răspunde. O citire căzută nu oprește răspunsul: câmpul merge, iar locul butoanelor spune motivul.
   Pentru owner, lângă butoane stă legătura „Schimbă-le în Setări”.

## Ce am respins

- **Răspunsuri rapide ale fiecărui om:** ADR 0260 le vrea scrise de owner; ar fi cerut o colecție pe om și reguli pe autor.
- **O permisiune nouă pentru scrierea lor:** setările sunt ale owner-ului (ADR 0116 §20), ca decizia pe sugestii.
- **Ținerea lor în `setari/conturi`:** regula ar fi trebuit să deschidă și setările conturilor pentru rolurile care răspund.
- **Locuri de completat în text** (`{versiune}`, `{nume}`): nu e nevoie de ele azi. Se pot adăuga mai târziu, fără date noi.
- **Scrierea din client:** toate scrierile trec prin callable-uri, cu audit (ADR 0039 §7).

## Probele

- **Pe hârtie:** contractul (marginile, curățarea, etichetele diferite, cel mult 12), textul ales după limbă și punerea în
  câmp (cursorul, selecția, rândul gol, plafonul).
- **Pe emulator, callable-ul:**
  - owner-ul salvează, iar un rol cu `tichete.raspunde` e refuzat;
  - o versiune văzută veche e refuzată;
  - o listă neschimbată nu scrie nimic, nici rând de audit;
  - rândul de audit are lista dinainte și pe cea de după.
- **Pe emulator, regulile:**
  - citesc owner-ul și un rol cu `tichete.raspunde`;
  - nu citesc un rol doar cu `tichete.citeste`, un om fără rol sau un anonim;
  - nimic nu se scrie din client;
  - `setari/conturi` rămâne doar a owner-ului.
- **E2e pe emulatoare:**
  - owner-ul scrie două răspunsuri în Setări și le pune în câmp în Tichete, cu textul din limba raportării;
  - un rol cu `tichete.raspunde` le folosește;
  - un rol doar cu citirea nu le vede.
- **Otrăvurile**, în lista feliei (`test/otravuri/A.3.py`).

## Mărimea

Câțiva kB în `/admin` (secțiunea din Setări și butoanele din Tichete), din cei +25 ai liniei. Pornirea și totalul nu se
schimbă.
