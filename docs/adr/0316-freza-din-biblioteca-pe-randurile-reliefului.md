# ADR 0316: Freza din „Frezele mele” pe rândurile reliefului

**Starea:** acceptat pe 27.11.2026, la cuvântul owner-ului („zi-le sesiunilor sa continue cu recomandarile, acolo unde inca
asteapta”, spus în sesiunea principală și transmis liniei reliefului la 06:37), pentru prima dintre cele trei felii lăsate la el
în ADR 0315 („rămân freza din bibliotecă, desenele și „Dă-i T{n}””). Felia 18.1↑d-5, linia reliefului. Alegerile de mai jos
sunt ale liniei, cu recomandarea aplicată; owner-ul le poate schimba.

**Continuă:** ADR 0300 §4–§5 (freza din bibliotecă pe rândurile exportului, nota „s-a schimbat în bibliotecă”, „Pune-o înapoi”),
ADR 0303 §4 (bila și toroidala în proiect; răspunsul 4a: toroidala la finisarea reliefului e a liniei reliefului), ADR 0312 §1
(bila, doar la finisare), ADR 0313 §1 (degroșarea, doar cu freza plată), ADR 0315 (rândul editabil al reliefului).

## Decizia

1. **Lista „Din frezele mele” în grupul Freza al fișei reliefului**, pe rândul ei, ca la celelalte fișe (`relief-biblioteca`):
   la finisare, frezele pe care lucrarea le primește acolo (plata, V-ul cu vârful, bila); la degroșare, doar plata. Lista vine
   de la aplicație (`frezeRelief`, prin `frezePotrivite` pe felul operației), deci o formă nouă intră singură când
   `motivFormaPeOperatie` o primește. Toroidala rămâne afară până la felia ei (18.1↑e): rândul n-o poartă încă.
2. **Aleasă, freza își aduce:** numărul T (regula rolurilor, ADR 0114 §5, printre toate frezele ferestrei, cu ale rândurilor
   reliefului, fără cea înlocuită), diametrul, forma, pasul pe trecere, **pasul lateral ei** și originea (numele, id-ul și
   versiunea, valorile de lucru, tăișul). Pasul lateral vine și pe finisare: frezele de finisare din catalog au unul mic (bila,
   10 %), deci freza aleasă își aduce pasul pentru care a fost scrisă; creasta pe un plan se vede îndată în fișă.
   **În secțiunea Tăierea**, freza aleasă aduce acum pasul lateral și pe operațiile reliefului (`operatiiCuFreza`), nu doar pe
   buzunar: aceeași regulă în panou și în fereastră.
3. **Frezele celorlalte rânduri numără și frezele reliefului** când omul alege o freză din bibliotecă pe un rând obișnuit:
   altfel T-ul ales putea ciocni freza unei finisări.
4. **Nota bibliotecii pe rândul reliefului** (`stareOrigine`, `locFrezaRelief`): schimbată (cu ce diferă și „Ia valorile noi”,
   care păstrează T-ul și pașii rândului), ștearsă (cu „Pune-o înapoi în bibliotecă”, din copia rândului), la zi (nimic) sau, la
   o freză scrisă de mână, recunoscută („Scrisă de mână (ca „…”)”), doar arătată. „Pe toate (N)” numără și ia, deodată, frezele
   rândurilor obișnuite și ale reliefului cu aceeași freză din bibliotecă.
5. **Scrisă de mână:** un diametru, o formă, un unghi sau un vârf schimbate de mână scot originea de pe rând, ca la celelalte
   rânduri; alt T o păstrează. Exportă (`operatieReliefDinDialog`) scrie originea cu regula celorlalte rânduri (`cuOrigine`): o
   origine scrie numele, id-ul și versiunea, valorile de lucru și tăișul; `null` le scoate, cu numele după formă; aceeași origine
   pe aceeași freză lasă operația neatinsă, la octet. Un diametru sau o formă schimbate cu originea documentului încă pe rând (un
   apelant fără fereastră) rămân scrise de mână, ca în ADR 0315.
6. **Documentul nu se schimbă** (rămâne v31): originea stă în câmpurile din v27 (`biblioteca`, `regim`, `tais`). Nimic pe server.

## Alternativele

- **Pasul lateral rămâne al rândului la finisare** (doar degroșarea îl ia din bibliotecă, ca un buzunar): mai puțină schimbare,
  dar o bilă de finisare aleasă din catalog ar tăia cu pasul vechi, iar panoul și fereastra ar face lucruri diferite. Owner-ul
  poate cere asta; atunci se schimbă `cuFrezaAleasaRelief` și `cuPasLateral`.
- **Fără „Pune-o înapoi” pe relief:** nota ar spune „nu mai e în bibliotecă” fără ieșire. Respinsă: aceeași notă trebuie să
  facă același lucru pe orice rând.

## Probele

- `test/unit/export.relief.biblioteca.test.ts` (scrisă întâi): alegerea pe finisare și pe degroșare, T-ul printre frezele
  ferestrei, nota (schimbată, ștearsă, la zi, recunoscută) și „Ia valorile noi”, „Pune-o înapoi”, ce scrie Exportă (originea,
  aceeași operație fără schimbare, „Scrisă de mână”, diametrul schimbat), pasul lateral din Tăierea.
- `test/unit/export.relief.test.ts`: rândul ca text și valorile citite poartă originea; fereastra citește originea din document
  (`finDin`), deci Exportă fără schimbare scrie tot aceeași operație.
- `test/e2e/relief.biblioteca.spec.ts`: o bilă Ø6 din catalog, aleasă pe finisare (degroșarea n-o oferă), scrisă de Exportă,
  arătată aleasă la redeschidere, apoi schimbată în bibliotecă (nota și „Ia valorile noi”) și scrisă de mână.
- Otrăvurile: `test/otravuri/18.1d-5.py`.

## Se redeschide dacă

- owner-ul vrea pasul lateral al rândului păstrat la finisare (alternativa de mai sus);
- toroidala intră pe finisare (18.1↑e): lista o oferă, iar rândul îi poartă raza colțului.
