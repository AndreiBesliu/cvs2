# ADR 0314: Pasul lateral aliniat, rotunjit în jos la celule întregi

**Starea:** acceptat pe 26.11.2026, la cuvântul owner-ului („Zi-le ca pot continua cu ce urmeaza la fiecare”, spus în sesiunea
principală și transmis liniei reliefului la 20:16), pe recomandarea liniei din 18.1↑d (a șaptea alegere, „nepornită”, din
lista owner-ului). Felia 18.1↑d-3, linia reliefului. Schimbă regula rotunjirii din ADR 0310 §5 și din ADR 0312 (`pasLateral`);
restul lor rămâne.

**Continuă:** ADR 0310 (§4 invarianta 4: „creasta măsurată cel mult cât cea cerută”, §5 alinierea), ADR 0312 (finisarea, v29),
ADR 0313 (degroșarea, v30, care folosește aceleași linii).

## Contextul

Cu liniile la 0° sau 90°, liniile finisării și ale degroșării trec prin centrele celulelor reliefului, deci pasul lateral e un
număr întreg de celule (ADR 0310 §5). Până acum se rotunjea la cel mai apropiat număr de celule, deci și în sus: 2,4 mm pe o
celulă de 0,5 devenea 2,5, cu un avertisment. Atunci liniile stau mai rar decât a cerut omul, iar creasta iese mai mare decât
cea cerută, adică exact ce interzice invarianta 4 (creasta măsurată cel mult cât cea cerută). Cu liniile la un unghi sau
nealiniate, pasul era deja cel mult cel cerut.

Rotunjirea în sus mai avea o gaură: un pas cerut cât diametrul putea ieși peste el (bila Ø3, pasul 3, celula 2: două celule,
4 mm), deci cu dungi netăiate între linii, fără niciun refuz.

## Decizia

1. **Rotunjirea în jos.** Aliniat, pasul folosit e cel mai mare număr întreg de celule care nu trece de pasul cerut, cel puțin
   o celulă: k = max(1, ⌊s / c⌋), s' = k · c (`celuleAliniate`, `src/cam/reliefFinisare.ts`). Un pas care e, pe hârtie, un
   număr întreg de celule rămâne întreg și când împărțirea în virgulă mobilă iese puțin sub el (0,3 / 0,1): se adună 1e-9
   înainte de rotunjire. Regula e aceeași la finisare și la degroșare (aceleași linii).
2. **Sub o celulă, o celulă.** Aliniat, liniile nu pot sta mai des decât o celulă. Avertismentul o spune: „mărit la o celulă a
   reliefului: … mm (liniile aliniate nu pot sta mai des; creasta iese mai mare decât cea cerută)”. Pentru un pas mai fin,
   omul alege liniile nealiniate (sau un unghi), ori o celulă mai mică (resamplarea, ADR 0310 §5).
3. **Celula mai lată decât freza se refuză.** Aliniat, dacă o celulă trece de diametrul frezei, liniile ar lăsa dungi
   netăiate: lucrarea refuză, cu motivul („celula reliefului (… mm) e mai mare decât diametrul frezei (… mm) …”), și spune ce
   merge (liniile nealiniate sau un unghi, la finisare; un unghi, la degroșare; o freză mai mare). Refuzul pasului cerut peste
   diametru rămâne cum era.
4. **Avertismentul rotunjirii** spune pasul folosit: „pasul lateral, rotunjit în jos la k celule ale reliefului: … mm”. Un pas
   cerut care e deja un număr întreg de celule nu dă niciun avertisment.

Programele cu un pas care era deja un număr întreg de celule ies octet cu octet ca înainte (placa 18: 2,5 și 1,5 pe celula de
0,25). Celelalte au liniile mai dese, deci creasta mai mică și timpul mai lung.

## Probele

- **Pe oracol** (`test/unit/reliefFinisare.test.ts`): pe un plan, la 0° și la 90°, cu pașii 1,3 (două celule), 1,7 (trei),
  1,5 (exact trei, fără avertisment) și 0,3 (sub o celulă): pasul folosit, avertismentul, iar creasta măsurată de simulatorul
  independent (`creastaSimulata`) e cea a pasului folosit și, de la o celulă în sus, cel mult cea a pasului cerut, pe hârtie
  (`creastaPlan`). Pașii 0,3, 0,6, 0,7, 1,1 pe celula 0,1 rămân întregi, fără avertisment. Celula de 2 mm cu bila Ø1 se
  refuză la 0° și la 90°, la finisare și la degroșare, și trece nealiniat sau la 30°; bila Ø3 cu pasul 3 lasă o celulă (2 mm).
- **La degroșare** (`test/unit/reliefDegrosare.test.ts`): pe platou, pasul 2,4 pe celula 0,5 dă 2 mm, iar distanța dintre
  liniile tăiate, citită din mișcări (nu din pasul spus de lucrare), nu trece nicăieri de 2,4.
- **Placa 18:** aurul și cotele prezise, neschimbate.

## Respinse

- **Rotunjirea la cel mai apropiat** (cum era): creasta peste cea cerută, cu avertisment; invarianta 4 cere „cel mult”.
- **Linii nealiniate singure, când pasul nu e un număr întreg de celule:** ar aduce ridurile (moiré) pe care alinierea le
  evită, fără ca omul să fi ales asta.
