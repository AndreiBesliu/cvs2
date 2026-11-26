# ADR 0315: Rândul editabil al reliefului în fereastra exportului

**Starea:** acceptat pe 26.11.2026, la cuvântul owner-ului („Zi-le ca pot continua cu ce urmeaza la fiecare”, spus în sesiunea
principală și transmis liniei reliefului la 20:16), pentru rândul care rămăsese la el în ADR 0312 §7 și ADR 0313 §7. Felia
18.1↑d-4, linia reliefului. Alegerile de mai jos sunt ale liniei, cu recomandarea aplicată; owner-ul le poate schimba.

**Continuă:** ADR 0290 și ADR 0291 (fereastra pe listă și fișe, grupurile pe întrebări, greșeala lângă cauză), ADR 0312 §7 și
ADR 0313 §7 (rândurile reliefului, doar de citit până acum), ADR 0313 §5 (marginea și planul zero egale pe același relief),
ADR 0314 (pasul aliniat, rotunjit în jos).

## Decizia

1. **Fișa are grupurile ferestrei** (`GRUPURI_RELIEF`, `src/ui/exportGrupuri.ts`): Freza, Liniile, Adaosul (doar la
   degroșare), Marginea și înălțimea, Cât de adânc. Fiecare câmp are explicația lui (titlul), iar o valoare greșită se spune în
   grupul ei, cu câmpul înroșit, cu rândul din listă marcat și cu „Du-mă la …” (fișa și focusul pe câmp). Câmpurile au numele
   `relief-*` (`GRUP_CAMP`), deci catalogul controalelor și proba grupurilor le văd.
2. **Câmpurile:** numărul sculei, diametrul și forma (bilă, plată sau în V, cu unghiul și vârful; la degroșare, doar plată, cu
   nota), pasul lateral, unghiul liniilor, liniile prin centrele celulelor sau nealiniate (doar la finisare), adaosul (doar la
   degroșare), marginea și înălțimea (vârful la față sau planul zero, cu adâncimea lui), adâncimea și pasul pe trecere.
   Marginile sunt ale ușii documentului, iar pasul lateral cel mult diametrul frezei (altfel lucrarea refuză).
3. **Notele de pe hârtie:** pasul folosit, cu liniile aliniate (ADR 0314, din `celuleAliniate`, aceeași funcție ca lucrarea;
   celula e a primului relief, cu scalarea instanței), și, la finisare, creasta pe un plan (`creastaPePlan`, dată ferestrei de
   aplicație). Cât pasul e greșit, tac.
4. **Marginea și înălțimea sunt comune perechii:** schimbate pe un rând, se scriu și pe celelalte operații ale reliefului din
   aceeași piesă, pe un relief comun (`perechi`, `cuPerechile`), ca în panou (`scrieAmbele`). Fișa o spune. Altfel, o schimbare
   pe un singur rând ar fi refuzată de lucrare abia la Exportă.
5. **Exportă scrie valorile** (`operatieReliefDinDialog`, `src/app/valoriOperatii.ts`), doar ce s-a schimbat, la locul lui: fără
   nicio schimbare, aceeași operație, la octet. Freza: alt T o păstrează, cu originea din bibliotecă; alt diametru sau altă formă
   o face scrisă de mână (numele după formă, fără origine, valori de lucru și tăiș), ca în panou (`frezaFinisare`). Câmpurile
   opționale lăsate la implicit (liniile aliniate, peretele, vârful la față) pleacă.
6. **Rândul din listă** arată freza și adâncimea scrise în fereastră, iar felul operației stă sub titlul fișei (degroșarea și
   finisarea aceluiași relief au același nume).

Documentul nu se schimbă (rămâne v30); nimic pe server.

## Rămân pentru o felie următoare

- **Freza din „Frezele mele”** pe rândurile reliefului (cu bila: lista dată ferestrei ține azi doar frezele rândurilor, ADR
  0312 §7, `frezePeRanduri`): cu nota bibliotecii și „Ia valorile noi”, ca pe celelalte rânduri.
- **Desenele grupurilor** (ADR 0290): secțiunea peste două linii cu freza, pasul și creasta (sau adaosul), marginea și planul
  zero, din valorile rândului, socotite în `exportDeseneCalcul.ts` și comparate cu lucrarea.
- **„Dă-i T{n}”** pe un T ciocnit de freza reliefului (azi conflictul se spune în grupul frezei, fără buton).

## Probele

- **Pe hârtie** (`test/unit/export.relief.test.ts`): rândul ca text (cu virgula în română), câmpurile greșite (fiecare margine),
  perechile, scrierea: fără schimbare, aceeași operație la octet (și cu o freză din bibliotecă); fiecare câmp schimbat; freza cu
  alt T, alt diametru, altă formă; degroșarea rămâne cu freza plată.
- **Grupurile** (`test/unit/export.grupuri.test.ts`): fiecare câmp `relief-` are grupul lui, iar grupurile reliefului nu primesc
  câmpurile celorlalte operații.
- **e2e:** `relief.export.spec.ts` (schimbările, perechea în ambele sensuri, greșeala, „Du-mă la …”, Exportă, panoul și fereastra
  redeschisă, programul cu adaosul nou), `finisare.spec.ts` și `degrosare.spec.ts` (fișele cu valorile documentului) și privirea
  (`export.privire.spec.ts`: fontul lat, cu V-ul și planul zero, telefonul, Atelierul cu densitatea mare).
