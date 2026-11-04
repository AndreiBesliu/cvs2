# ADR 0132: Meniul global și fereastra Mașina pe tot ecranul

**Starea:** acceptat pe 02.11.2026, la felia 13.A↑ (adusă din etapa 13, „Senderul (complet)”). Cererea owner-ului: „vreau inca
un worktree care sa faca panoul sender-ului mai mare, el trebuie sa fie fullscreen, sub meniu. Atentie, meniul global, el va fi
diferit de cel cu uneltele de desen. ca la cvs1 acest meniu va aparea doar in fereastra de desing/desen/project”. La schița cu
nouă întrebări și recomandarea fiecăreia, owner-ul a răspuns „Da, cu recomandările”. **Schimbă:** ADR 0081 §3 (panoul Mașina nu
mai stă în docul din dreapta: e o fereastră), aranjamentul carcasei din felia 2.8a (o zonă nouă, `meniu`, și lista ferestrelor;
marca și grupul din dreapta-sus trec în meniu), ADR 0120 (butonul Cont stă în meniul global). **Continuă:** ADR 0082, 0085, 0119
(conținutul ferestrei e al panoului de până acum). **Completat** pe 04.11 de 13.A↑c: meniul pe telefon (§10), după comparația
cu capturi din aplicație și „Yes, B”.

**Problema.** Panoul mașinii stătea în docul din dreapta, sub proprietăți, lat de 15,5 rem: jog-ul, palparea, jurnalul și starea
lucrării se înghesuiau într-o coloană îngustă, iar în timpul unei lucrări omul nu vedea de nicăieri altundeva că mașina merge
sau s-a oprit. În ediția întâi, senderul avea fila lui în meniul de sus, pe tot ecranul. Tot atunci, pagina nu întreba nimic la
închidere sau la „Reîncarcă” cu o lucrare pornită: legătura cădea, iar jobul se oprea la mijlocul tăieturii.

## Decizia

**1. Meniul global.** Un rând nou, sus, lipit de marginea ferestrei, în toate ferestrele (zona `meniu` a aranjamentului): marca,
filele ferestrelor (controlul `ferestre`), locul lucrării (controlul `lucrare`, umplut de fereastra Mașina), apoi „Caută o
comandă”, limba, tema și butonul Cont (cu manualul, sugestia și raportarea, ADR 0120). Meniurile Fișier / Editare nu vin acum:
vin cu șablonul clasic (decizia din 13.10). Zona `unelte` rămâne în tip, pentru alte șabloane, goală în cel modern.

**2. Ferestrele sunt o listă, în date** (`aranjament.ferestre`): **Proiectare** (`vedere.proiectare`) și **Mașina**
(`vedere.masina`, id-ul comutatorului de până acum: același buton pentru paletă, manual și probe). O extensie (gazda din
Trenuleț) își adaugă fereastra prin aranjament, nu prin cod nou în carcasă. Fereastra de acum se ține în browser
(`cncvs2.fereastra`), iar la pornire aplicația se deschide în ea; o valoare necunoscută sau stocarea lipsă dau Proiectare.

**3. Proiectare** e carcasa de până acum: bara de desen cu extensia ei, pânza, docurile și bara de jos. Docul din dreapta are
doar proprietățile. Cât e deschisă Mașina, Proiectarea rămâne montată (pânza, editarea, starea desenului, butonul Cont, pe care
îl pune modulul editării), dar acoperită și inertă:
- tastele desenului (registrul și modulul editării: uneltele, săgețile, Escape, oglindirea, nodurile) nu ating desenul ascuns;
  merge doar `Ctrl+K`;
- o comandă a desenului aleasă din paletă întoarce întâi la Proiectare, apoi rulează;
- fișierele lăsate pe pagină se ignoră (nu pornesc un import nevăzut);
- bara de jos arată doar cipurile globale (`CIPURI_GLOBALE`: proiectul, configurația, actualizarea, jurnalul).

**4. Mașina** e o fereastră pe tot ecranul, sub meniu, cu conținutul panoului de până acum, în coloane:
- de la 80 rem: mașina (conexiunea, starea și poziția, cu cifre mari, poziționarea), lucrarea (codul controlerului, faza cu
  progresul și butoanele, programul) și consola (comanda și jurnalul);
- între 48 și 80 rem: două coloane, cu consola dedesubt;
- sub 48 rem: o coloană, în ordinea urgenței: conexiunea, starea, codul, lucrarea, poziționarea, programul, consola.

Fereastra se montează la prima deschidere și rămâne montată (numele programului, formularele, cardul codului). Sesiunea rămâne
a paginii (ADR 0081): Proiectarea se deschide oricând, iar lucrarea continuă.

**5. Indicatorul lucrării**, în meniul global, de oriunde: îl pune fereastra Mașina, deci există doar după prima ei deschidere
(înainte nu există sesiune). Starea vine din sesiune, printr-o funcție pură (`src/machine/indicator.ts`):
- „Mașina conectată” (neutru);
- „Rulează N %” (verde), cu **Pauză**;
- „Pauză N %” (portocaliu), cu **Reia**;
- „Oprită la M6”, „Oprită la linia N” (M0 / M1) sau „Oprită pe o eroare” (portocaliu);
- „Alarmă” sau „Întreruptă” (roșu);
- „Gata”, după ultima linie.

Un clic pe el deschide Mașina. **Oprește** rămâne doar în fereastră: o repornire în mișcare pierde poziția. Titlul filei
browserului spune procentul cât rulează lucrarea și starea cât e oprită.

**6. O lucrare începută** (fazele `trimite`, `suspendat`, `golire`, `bariera`, `terminare`):
- închiderea sau reîncărcarea paginii cere confirmarea browserului (`beforeunload`);
- „Reîncarcă” (versiunea nouă, ADR 0045 §5) așteaptă sfârșitul ei: butonul devine „Reîncarcă după lucrare”, dezactivat.

Carcasa află asta din semnalul `lucrareInceputa` (în pornire, câțiva octeți), scris de fereastra Mașina.

**7. „Deschide în Mașina”**, în fereastra exportului, după un export G-code reușit pe care senderul îl vorbește (familia GRBL,
ADR 0125): închide dialogul, deschide Mașina și încarcă primul fișier al exportului, ca „Ultimul export”, fără să-l pornească. Cât
o lucrare e începută, încărcarea se refuză, cu motivul.

**8. Escape** închide doar ce e deschis: în Mașina, formularul WiFi, confirmarea deblocării și avertismentul WiFi; în rest, ca
până acum. Nu schimbă fereastra și nu trimite nimic la mașină. F1 în Mașina deschide capitolul mașinii din manual.

**9. Plafonul pornirii:** fereastra și indicatorul vin la cerere, în bucata panoului de până acum (`PanouMasina`); pornirea
primește doar meniul, filele și semnalul lucrării. Din 13.A↑b (03.11, după observația de la unire: la prima deschidere,
fereastra stătea goală cât venea bucata), bucata vine și în fundal, la o secundă după pornire, ca dialogurile (lista de
preîncărcare, ADR 0100): primul clic pe Mașina o găsește gata. Cât încă vine (un clic dat înaintea preîncărcării, o rețea
lentă), fereastra spune „Se încarcă fereastra Mașina…”; dacă nu vine (o publicare nouă, rețeaua căzută), spune de ce și oferă
Reîncarcă, ca dialogurile. Cu bucata deja venită, fereastra se montează direct, fără Suspense: o componentă `lazy` suspendă la
prima randare chiar cu bucata adusă, iar React ține mesajul de încărcare pe ecran ~300 ms, ca să nu clipească (verificarea pe
canal l-a prins așa). Alegerea se face o dată, la montare: schimbată după, ar remonta fereastra și i-ar pierde starea.

**10. Meniul pe telefon** (sub 40 rem; 13.A↑c, 04.11), mereu pe două rânduri: sus marca și grupul aplicației, dedesubt filele
și indicatorul, pe același rând (un element gol, cât tot rândul, începe rândul al doilea).
- Fila deschisă își arată numele, celelalte doar iconița, ca bara de acțiuni pe telefon. Numele rămâne în sfat și pentru
  cititorul de ecran. Deci orice filă (și a unei extensii) are o iconiță.
- Indicatorul ia restul rândului, la dreapta. Cuvântul unei stări lungi („Oprită la M6 (linia 1234)”) se taie cu „…”, iar
  punctul, procentul și Pauză / Reia rămân.
- De ce: rularea completă din CI (Linux, unde `system-ui` e un font lat) a picat pe 03.11 și 04.11, fiindcă indicatorul cădea
  pe un al treilea rând. Rândul încăpea doar cu fontul îngust al Windows-ului; un telefon îngust sau fila unei extensii îl
  rupeau la fel. Owner-ul a ales varianta după capturi din aplicație, la 390 px („Yes, B”).

## Probele

- unitare: aranjamentul (zona meniului, ferestrele, cipurile globale, verificarea cu controale negative), fereastra ținută în
  browser, indicatorul și lucrarea începută (fiecare fază, Hold, alarma, procentul, conexiunea pierdută);
- e2e: probele panoului mașinii (`masina.spec.ts` și celelalte) trec în fereastra nouă; ferestrele (bara de desen doar în
  Proiectare, butonul Cont în ambele, fereastra ținută după reîncărcare), tastele desenului oprite în Mașina, indicatorul (Pauză
  și Reia din el, clicul spre Mașina, titlul filei), confirmarea la închiderea paginii, „Deschide în Mașina”, Escape și ecranul
  îngust;
- 13.A↑b, tot e2e: bucata ferestrei și mesajele ei vin fără clic, iar primul clic o deschide plină chiar cu fișierele scoase
  de pe server între timp, fără ca mesajul de încărcare să apară nici o clipă (un observator al paginii îl caută la fiecare
  schimbare); mesajul de încărcare (răspunsul întârziat) și cel de eșec (cererea refuzată), cu Reîncarcă;
- 13.A↑c, e2e: cu un font lat (Verdana aici, DejaVu Sans pe Linux), la 390, 360 și 320 px, indicatorul stă pe rândul filelor,
  după ele și în ecran; la 320 px (lățimea minimă din WCAG 1.4.10), cuvântul stării se taie; Proiectarea, nedeschisă, arată
  doar iconița, cu numele accesibil;
- otrăvurile țintite (`test/otravuri/13.A.py`, `test/otravuri/13.A-b.py`, `test/otravuri/13.A-c.py`).

## Limitele

- Previzualizarea traseului cu freza în timp real și override-urile (avans, turație) vin mai târziu, în etapa 13; locul lor e
  coloana lucrării.
- Ferestrele extensiilor: lista e pregătită, iar gazda extensiilor (Trenuleț) le adaugă.
- Confirmarea de la închidere e cea a browserului, cu textul lui: pagina nu-și poate scrie mesajul.
- Proba pe mașina reală rămâne la 3.7b.

## Respinse

- **Meniuri Fișier / Editare acum:** dublau bara de desen și paleta; vin cu șablonul clasic.
- **Oprește în indicator:** o repornire apăsată din greșeală, din altă fereastră, pierde poziția; Pauză se poate relua.
- **Escape ca oprire sau ca ieșire din Mașina:** Escape se apasă din reflex, ca să închizi ceva.
- **Mașina ca panou mare peste pânză sau ca dialog:** o lucrare durează ore, iar desenul trebuie să rămână la un clic.
- **Proiectarea demontată în Mașina:** ar pierde butonul Cont (pus de modulul editării), starea uneltelor și vederea pânzei.
- **O tastă pentru ferestre:** `Ctrl+1` / `Ctrl+2` sunt ale browserului; paleta (`Ctrl+K` → „Mașina”) ajunge acolo.
- **Pe telefon, filele derulate în lățime (13.A↑c):** tăiau chiar fila deschisă („Mașin…”).
- **Pe telefon, numele tuturor filelor tăiate cu „…” (varianta A):** cu trei file, una ajungea „P”.
