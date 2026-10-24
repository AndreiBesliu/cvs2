# ADR 0059: Selecția cu dreptunghi, ca în CAD

**Starea:** acceptat pe 24.10.2026. Cererea owner-ului: „vreau ca selectia sa functioneze ca inainte. De le stanga la dreapta
trebuie sa selectezi toata forma, de la dreapta la stanga se selecteaza toate formele/vectorii atinsi de selectie”. **Intră
în:** etapa 3, lângă editorul adus din etapa 6 (ADR 0050–0055), fără mașină. **Continuă:** ADR 0050 (editarea pe pânză),
ADR 0052 (mânerele), ADR 0042 (pornirea nu crește).

**Problema.** Un clic alegea o singură formă, iar nimic nu putea alege mai multe: alinierea între forme și distribuirea (care
cere trei) nu se puteau folosi, deși modelul, panoul, mutarea, transformările și oglindirea lucrau deja pe o selecție de mai
multe (lipsa a ieșit la scrierea manualului, ADR 0058).

## Decizia

**1. Dreptunghiul de selecție, după sensul tragerii.** Cu unealta Selecție sau Transformare, o apăsare pe un loc gol al pânzei
pornește un dreptunghi:
- tras **spre dreapta**, **fereastra** (linie plină, albastră): se aleg instanțele cuprinse în întregime, adică fiecare
  element al lor (o piesă importată are mai multe contururi) cu cutia exactă în dreptunghi, marginea inclusă;
- tras **spre stânga**, **intersecția** (punctată, verde): se aleg instanțele cu măcar un contur care atinge dreptunghiul
  plin. Contează conturul, ca la vectori: un dreptunghi tras în interiorul unui cerc, fără să-i atingă marginea, nu-l alege.
Un dreptunghi fără deplasare pe orizontală e o fereastră. Un clic pe gol (sub 3 px de tragere) golește selecția, ca înainte.

**2. Shift.** Shift + clic pe o formă o adaugă la selecție sau o scoate; Shift + tragere (pornită oriunde, și de pe o formă)
adaugă instanțele prinse la cele alese deja. Esc renunță la dreptunghiul început.

**3. Clicul pe o formă dintr-o selecție multiplă o păstrează**, iar tragerea care urmează le mută pe toate (mutarea pânzei
lucra deja pe selecție). Un clic pe o formă din afara selecției o alege singură, ca înainte.

**4. Geometria exactă** (`src/geom/cadru.ts`): segmentul drept prin Liang–Barsky; arcul printr-un capăt înăuntru sau prin
cercul lui tăiat cu laturile, păstrând doar punctele de pe baleiaj; cubica prin subdivizare, cu poligonul de control ca
margine, până la o bucată sub 10⁻⁶ mm. Alegerea (`aleseInCadru`, în ordinea documentului) e pură; un oracol independent,
prin eșantionare densă, o judecă pe 2 000 de contururi aleatoare.

**5. Nimic nou în pornire.** Gestul stă în modulul editării (la cerere, după prima randare): un ascultător în faza de captură
ia apăsarea pe gol sau cu Shift înaintea pânzei; apăsarea pe o formă fără Shift rămâne a pânzei (alegerea și mutarea), iar
cea pe un mâner, a mânerelor. Selecția se scrie prin acțiunea existentă `selectie.din-lista` (fără acțiune nouă în registru). Forma de sub punct
(`instantaLa`) stă în `src/model/alegere.ts`, comună bucății alegerii și modulului editării: editarea nu depinde de bucata
alegerii (dacă ea nu vine, clicul spune că n-a putut, iar editarea și dreptunghiul merg mai departe).
În pornire s-a schimbat doar clicul (punctul 3), câteva zeci de octeți: pornirea rămâne 95,1 kB, cu ușa 99,8 / 100.

## Respinse

- **Dreptunghiul în pânză** (pachetul de pornire): gestul și desenul lui ar fi intrat în pornire, care n-are loc.
- **Intersecția după arie** (un dreptunghi în interiorul unei forme închise o alege): owner-ul a cerut „formele/vectorii
  atinși”; la vectori, atinge marginea.
- **Ctrl + clic pentru adăugare**: Ctrl e al scurtăturilor (Ctrl+D, Ctrl+Z); Shift e convenția programelor de desen și CAD.

## Se redeschide dacă

- selecția din panoul Pe foaie trebuie să aleagă și ea mai multe (Shift + clic pe rânduri);
- vin grupurile: atunci dreptunghiul alege grupul întreg sau intră în el.
