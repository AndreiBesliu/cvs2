# ADR 0320: Straturile reliefului, editabile, și imaginea ca strat nou

**Starea:** acceptat pe 28.11.2026, la cuvântul owner-ului („Porneste sesiunile, pune-le sa continue cu ce aveau la rand”,
transmis liniei reliefului de sesiunea principală la 09:40, cu „la întrebările care sunt ale owner-ului, scrie-le grupat cu
recomandarea în față și mergi înainte cu recomandarea”). Felia **18.1↑j**, linia reliefului. Alegerile owner-ului de mai jos
(§7) au recomandarea aplicată, cum sunt implementate.

**Continuă:** ADR 0310 §1 (straturile și cele șase moduri, compusul de la planul zero, de jos în sus), §7 (panoul), §8 (rândul
„Straturile și combinarea” din tabelul feliilor), ADR 0311 §7 (golul unui strat: NaN, compunerea îl sare).

**Nu redeschide:** dalele Float32 de 256 × 256 (cuantizate pe 16 biți, cu scară pe dală), calculul în workere, fără GPU,
câmpul conservativ pentru CAM (ADR 0310, 0311). Documentul nu se schimbă: rămâne **v32** (straturile, cu ochiul, numele și
modul, sunt în schema reliefului din v28), deci **v33, rezervat liniei, nu e folosit**.

## Contextul

Din felia 18.1↑a, un relief are o listă de straturi (cel mult 32), fiecare cu harta lui (amprenta dalelor din browser), modul și
vizibilitatea, iar compusul, desenul, modelul 3D, resursele exportului și CAM-ul sar deja straturile ascunse. Lipsea calea
omului spre ele: relieful din imagine făcea mereu o piesă nouă, cu un singur strat, iar panoul le arăta doar de citit.

## Id-ul feliei

În tabelul din ADR 0310 §8, rândul acesta se numea „18.1↑e”, dar id-ul l-a luat finisarea cu toroidala (ADR 0319, unită pe
27.11). Feliile unite își păstrează id-urile, deci straturile primesc un id liber, **18.1↑j**; tabelul din ADR 0310 e îndreptat
în aceeași felie (o notă sub el, ce s-a făcut sub ce id).

## Decizia

1. **Editarea e pură** (`src/model/straturiRelief.ts`): ochiul, numele (gol = fără nume, arătat după id), modul (`cuStrat`),
   ordinea (`mutaStrat`: „sus” = spre capătul listei, deasupra în compus), ștergerea (`stergeStrat`: nu și a ultimului), stratul
   nou (`cuStratNou`: deasupra, „adună”, vizibil, cu cel mai mic id liber `sN`; peste 32, refuzat), câte sunt ascunse
   (`straturiAscunse`). Fiecare dă o formă nouă sau null; câmpurile necunoscute ale unui strat rămân.
2. **Prin registru, nu o acțiune nouă:** forma nouă a elementului-relief trece prin `document.forma`, cu `nodEditat` (relieful
   din imagine e un element într-un grup), deci ușa documentului, plăcuțele, instanțele multiple și jurnalul sunt cele de azi:
   **un pas de anulare** pe fiecare schimbare, iar anularea pune la loc harta veche (dalele rămân în browser după amprentă și se
   șterg, ca până acum, doar când nicio versiune păstrată nu le mai folosește).
3. **Panoul** (`src/app/StraturiRelief.tsx`, în secțiunea Relieful): de sus în jos, ca în compus, fiecare strat cu ochiul,
   numele, modul, ↑ / ↓ și ×; un strat ascuns se estompează, afară de ochi. Fila care doar citește oprește totul.
4. **Imaginea ca strat nou:** cu un relief ales (singura instanță aleasă, cu exact un element-relief: `reliefAles`), fereastra
   „Relief din imagine” are, lângă „O piesă nouă”, „Un strat nou pe „…””. Cererea `din-imagine` a workerului primește atunci
   grila reliefului (`pe`): imaginea, la scara ei (un pixel = lățimea imaginii pe relief / pixelii; implicit lățimea
   reliefului), se așază centrat pe grilă (`asezaPeGrila`, `src/relief/asezare.ts`): fiecare celulă ia pixelul în care îi cade
   centrul (fără amestec: la aceeași scară, stratul e imaginea, pixel cu pixel), golul în jurul imaginii, ce iese din relief
   tăiat; intervalul unui pixel e închis la stânga și jos, deschis la dreapta și sus. Doar + − × ÷ și `floor`: aceeași hartă în
   Node și în browser (poarta amprentei, în e2e). „Importă” păstrează dalele, apoi pune stratul prin `document.forma`. Relieful
   ales îl află dialogul, adus la cerere, deci **nimic nou în pornire**.
5. **Exportul spune straturile ascunse:** fișa finisării și a degroșării din fereastra exportului („N straturi ascunse: nu
   intră în program”). Programul nu se schimbă: un strat ascuns, chiar lipsă din browser, dă exact programul fără el (proba
   `relief.straturi.program.test.ts`; „scade” mută vârful compusului pe hârtie, √27 pentru calota de 6 minus cea de 3).

## Mișcă mașina?

Indirect: ce se taie e compusul, iar straturile îl schimbă. Compunerea și CAM-ul nu s-au schimbat (aceleași funcții, deja
judecate de oracolul 3D); probele noi fixează că editarea ajunge în compus exact (amprenta, Z-ul pe hârtie, programul cu un
strat ascuns = programul fără el). Placa 18 rămâne cu un singur strat.

## Alegerile owner-ului (cu recomandarea aplicată)

1. **Ordinea:** săgețile ↑ / ↓ (recomandat: merg cu tastatura și cu cititorul de ecran). Alternativa: tragerea rândurilor, mai
   târziu, peste săgeți.
2. **Unde stă imaginea pe un strat nou:** centrată, la o lățime aleasă (implicit cât relieful), cel mai apropiat pixel, golul în
   jur, ce iese tăiat (recomandat). Alternative: întinsă pe tot relieful (deformată, dacă proporțiile diferă); pusă cu mausul,
   la un loc ales.
3. **Alegerea implicită din fereastră:** „O piesă nouă”, ca înainte (recomandat: nimic nu se schimbă pentru cine nu caută
   straturi). Alternativa: „Un strat nou” când un relief e ales.
4. **Previzualizarea:** fereastra arată stratul nou singur; compusul se vede pe planșă după „Importă” (recomandat: fără dalele
   reliefului în fereastră). Alternativa: compusul în fereastră.
5. **Modul stratului nou:** „adună”, schimbat apoi din panou (recomandat). Alternativa: lista modului în fereastră.
6. **Un strat mutat sau rotit în relief:** nu acum (ar cere o matrice pe strat, deci documentul v33). Recomandat: mai târziu,
   la cerere.

## Mărimea

Pornirea +0; totalul îl spune raportul feliei (panoul și fereastra sunt în bucățile lor, la cerere; workerul reliefului, cu
așezarea).
