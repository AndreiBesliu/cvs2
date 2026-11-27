# ADR 0317: Desenele fișei reliefului în fereastra exportului

**Starea:** acceptat pe 27.11.2026, la cuvântul owner-ului („zi-le sesiunilor sa continue cu recomandarile, acolo unde inca
asteapta”, transmis liniei reliefului la 06:37), pentru a doua dintre feliile lăsate la el în ADR 0315 („desenele grupurilor”).
Felia 18.1↑d-6, linia reliefului. Alegerile de mai jos sunt ale liniei, cu recomandarea aplicată; owner-ul le poate schimba.

**Continuă:** ADR 0290 (desenul fiecărei întrebări, din valorile omului, cu cota câmpului activ aprinsă; „Desenele spun
adevărul”), ADR 0291 (ce spune un desen vine din funcțiile lucrării sau se socotește în `exportDeseneCalcul.ts`, cu proba lui
față de lucrare), ADR 0314 (pasul aliniat, rotunjit în jos), ADR 0315 (rândul editabil al reliefului).

## Decizia

1. **Fiecare grup al fișei reliefului are desenul lui**, ca la celelalte fișe, în stânga grupului, deasupra explicației:
   - **Freza:** desenul comun al frezei (plata, V-ul cu unghiul și vârful, bila cu capătul rotund), cu T-ul și diametrul pe cote;
     cotele lui poartă numele câmpurilor fără prefixul `relief-`, deci fișa le aprinde prin numele lor scurt.
   - **Liniile**, văzute de sus: la 0° și 90°, prin centrele celulelor (grila celulelor, între linii), la pasul folosit de lucrare
     (k celule întregi, `celuleAliniate`); la alt unghi sau nealiniate, „cel mult” pasul cerut (lucrarea îl împarte egal pe
     lățimea reliefului, pe care fereastra n-o știe). Unghiul, pe un arc.
   - **Adaosul** (doar la degroșare), în secțiune: modelul, lemnul lăsat deasupra lui, pe normală (în orice direcție, ADR 0313
     §2), și treptele degroșării.
   - **Marginea și înălțimea**, în secțiune: la perete freza rămâne în relief, iar peretele stă; la „trece”, freza trece de
     margine cu raza ei; planul zero, la adâncimea lui sub față, pe o cotă.
   - **Podeaua**, în secțiune: fundurile trecerilor la k · pas sub față și ultima pe model, cel mult la podea; la degroșare,
     podeaua ridicată cu adaosul (ca lucrarea, care ridică cu el și cota, și podeaua).
2. **Ce spune un desen e al lucrării:** trecerile pe Z (`treceriPodeaRelief`) și pasul liniilor (`liniiReliefDesen`) se socotesc în
   `src/ui/exportDeseneCalcul.ts`, fără importuri din lucrare (regula `interfata-prin-actiuni`), și se compară cu mișcările
   programului (`finisareRelief`, `degrosareRelief`) în `test/unit/export.desene.relief.test.ts`. Profilul reliefului din
   desene e o schiță: fereastra nu citește dalele.
3. **Desenele stau în cadrul lor:** liniile oblice se taie exact la marginea reliefului desenat (nu printr-un decupaj), ca proba
   privirii să vadă că nimic nu iese.
4. **Nimic nu se schimbă în program sau în document** (rămâne v31); nimic pe server.

## Probele

- `test/unit/export.desene.relief.test.ts` (scrisă întâi): fundurile trecerilor față de cotele Z ale tăierilor din program, pe
  modele mai sus și mai jos decât podeaua, la finisare și la degroșare (cu adaosul); pasul liniilor față de pasul folosit de
  lucrare, la 0° și 90°, și „cel mult” la alt unghi.
- `test/e2e/relief.desene.spec.ts`: fiecare grup cu desenul lui (adaosul doar la degroșare), cota câmpului activ aprinsă, liniile
  prin centrele celulelor sau nealiniate, numărul fundurilor, adaosul, marginea „trece”, planul zero.
- Proba privirii (`export.privire.spec.ts`): fișele reliefului, cu desenele, nu ies din panou la 1280, 1024 și 390 px.
- Otrăvurile: `test/otravuri/18.1d-6.py`.

## Se redeschide dacă

- fereastra primește dalele reliefului (atunci profilul din desene poate fi cel adevărat);
- lucrarea schimbă regula trecerilor pe Z (proba desenului cade).
