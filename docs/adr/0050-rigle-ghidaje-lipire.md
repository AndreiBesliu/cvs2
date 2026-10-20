# ADR 0050: Riglele, ghidajele salvate pe foaie, lipirea și alinierea, la cerere după prima randare

**Starea:** acceptat pe 20.10.2026, odată cu felia 6.A↑. Cererea owner-ului: „putem face mai multe unelte de desen acum? ruler si guides?” +
„snapping system, aligning etc.?”; deciziile lui, din întrebările de pe 20.10: întâi riglele și lipirea (uneltele de desen
prin tragere sunt felia următoare, care le folosește), ghidajele **păstrate în proiect**, lipirea de ghidaje și de foaie,
de punctele formelor și de grilă, fără agenți. **Intră în:** etapa 6 („Editorul de vectori”: aliniere), adusă în etapa 3,
fără mașină (6.A↑). **Continuă:** ADR 0038 (pânza, panoul), ADR 0042 (pornirea nu crește).

**Problema.** Pe pânză nu se poate măsura sau așeza nimic exact cu mausul: nu există rigle, ghidaje, lipire sau aliniere.
Iar pachetul de pornire e la 99,0 / 100 kB cu ușa proiectului: tot ce se adaugă trebuie să vină la cerere.

## Decizia

**1. Ghidajele stau pe foaie, în document, fără o schemă nouă.** `foaie.ghidaje?: { id, axa: 'x' | 'y', poz }[]`: o linie
verticală la `x = poz` (axa `x`) sau orizontală la `y = poz` (axa `y`), în mm ai foii. Ghidajele nu schimbă nimic din ce se
taie, deci nu cer v11 (regula din `document.ts`: schemă nouă doar pentru un câmp care schimbă tăierea). O versiune mai
veche îl păstrează ca pe orice câmp necunoscut, iar proiectul scris de versiunea nouă se deschide și într-o filă rămasă pe
cea veche; cu v11 l-ar fi refuzat. Ușa îl judecă: cel mult `PLAFON.ghidaje` (1 000) pe foaie, id-uri unice, poziția finită
în `±PLAFON.translatie`. O schimbare a ghidajelor e o comandă a jurnalului (`inlocuieste-ghidaje`), deci se anulează și se
reface ca orice altceva.

**2. Lipirea**, pură (`src/geom/lipire.ts`), pe fiecare axă separat: punctele selecției care se mută (marginile și
mijlocul cutiei ei) se lipesc de cea mai apropiată țintă, dacă e la cel mult 6 px pe ecran. Țintele: ghidajele, marginile
și mijlocul foii, marginile și mijlocul cutiei fiecărui element al celorlalte instanțe și capetele căilor deschise, plus
grila (multiplii pasului), când e pornită. La egalitate, câștigă ținta care nu e grila. Cât se trage, pânza arată liniile
tuturor țintelor pe care cade selecția după lipire (marginea pe un ghidaj și mijlocul pe mijlocul foii, deodată). Alt inversează lipirea pe durata gestului (ADR 0052; la început Alt doar o oprea). Pornirea lipirii și a grilei (cu pasul ei) e o
preferință a omului, în browser, nu în document.

**3. Alinierea și distribuirea**, pure (`src/geom/aliniere.ts`), pe cutiile instanțelor alese: stânga, centrul, dreapta,
sus, mijlocul, jos — față de cutia lor comună, sau față de foaie când e aleasă una singură; distribuirea egală a golurilor
pe orizontală sau pe verticală, de la trei instanțe în sus (prima și ultima rămân pe loc). Fiecare e un singur pas de
anulare. Săgețile mută selecția cu 1 mm (Shift: 10 mm, Alt: 0,1 mm), doar cu focusul pe pagină sau pe pânză (și pe
butoanele de deasupra ei): într-un control din afara pânzei (arborele proiectului) sau într-un câmp, săgețile sunt ale lui.

**4. Riglele și ghidajele pe pânză.** Riglele, în mm ai foii (originea în colțul stânga-jos, Y în sus), stau pe marginile
zonei libere a pânzei și urmează zoomul și deplasarea; pasul gradațiilor se alege din 1, 2, 5 × 10ⁿ, ca etichetele să nu
se calce. Un ghidaj nou se trage din riglă (din cea de sus: orizontal; din stânga: vertical); unul existent se trage
oriunde, iar lăsat pe riglă se șterge; dublu clic pe el cere poziția exactă. Ghidajul tras se lipește și el.

**5. Totul la cerere.** Riglele, ghidajele, grila, liniile de aliniere, bara alinierii, săgețile și dicționarul lor vin
într-un modul încărcat după prima randare (`src/app/Editare.tsx`, cu calculul în `src/ui/actiuniEditare.ts`, registrul lui
de acțiuni: ghidajele, mutarea instanțelor cu deplasări proprii). Pornirea primește doar cârligele pânzei (stratul de
deasupra, funcția de lipire a mutării) și comanda nouă a jurnalului; ușa, validarea ghidajelor.

## Ce am respins

- **Documentul v11:** o filă rămasă pe versiunea veche ar refuza proiectul salvat de cea nouă, pentru un câmp care nu
  schimbă tăierea.
- **Ghidajele doar în vedere** (pierdute la reîncărcare): owner-ul le vrea în proiect.
- **Lipirea de fiecare vârf al fiecărei căi:** zeci de mii de ținte la un logo importat, fără folos la așezare; capetele
  căilor deschise și cutiile elementelor ajung.
- **Riglele și lipirea în pachetul de pornire:** n-au loc (99,0 / 100 kB).

## Probele

`test/unit/lipire.test.ts` (fiecare țintă, toleranța în pixeli, grila, egalitatea, Alt), `test/unit/aliniere.test.ts`
(cele 8 feluri, foaia ca referință, golurile egale, nimic de mutat), `test/unit/ghidaje.test.ts` (ușa: plafonul, id-urile,
poziția, câmpurile necunoscute păstrate; comanda și inversa ei; o versiune care nu le știe le păstrează),
`test/e2e/editare.spec.ts` (riglele urmează zoomul, ghidajul tras din riglă rămâne după reîncărcare și se șterge pe riglă,
mutarea se lipește de ghidaj, alinierea, săgețile, grila; pornirea nu crește).

## Se redeschide dacă

- uneltele de desen (felia următoare) cer lipirea unui singur punct, nu a unei cutii;
- owner-ul vrea ghidaje înclinate sau pe toate foile deodată;
- pornirea câștigă loc și riglele merită să apară din primul cadru.
