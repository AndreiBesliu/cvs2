# ADR 0322: Relieful ca imagine gri pe 16 biți, dus și întors

**Starea:** acceptat pe 28.11.2026, la cuvântul owner-ului („Porneste sesiunile, pune-le sa continue cu ce aveau la rand”,
transmis liniei reliefului de sesiunea principală, cu „mergi înainte cu recomandarea” la întrebările owner-ului). Felia
**18.1↑g**, linia reliefului. Alegerile owner-ului (§5) au recomandarea aplicată, cum sunt implementate.

**Continuă:** ADR 0310 §8 (rândul 18.1↑g: relief ↔ imagine gri pe 16 biți, PNG și TIFF, cu Z-ul scris în fișier, dus-întors
exact), §12 (fișierul pe 16 biți: PNG sau TIFF); ADR 0311 (grila, golurile, cuantizarea pe dale).

**Nu redeschide:** dalele și cuantizarea lor pe 16 biți cu scară pe dală (ADR 0311), calculul în workere. Documentul nu se
schimbă: rămâne **v32**.

## Contextul

Un relief făcut aici trebuie să poată pleca pe alt calculator (dalele stau în browser) și în alte programe, iar o hartă de
înălțimi făcută în altă parte (un scaner 3D, un program de sculptat) trebuie să poată intra fără să piardă din precizie. O
imagine pe 8 biți are doar 256 de trepte (la 5 mm, 0,02 mm pe treaptă); una pe 16 biți are 65 536 (la 5 mm, 0,08 µm). Browserul
decodează orice PNG pe 8 biți, deci un PNG pe 16 biți cere un cititor propriu.

## Decizia

1. **Exportul:** din secțiunea Relieful a panoului, **Exportă ca imagine pe 16 biți…** scrie compusul straturilor vizibile ca
   PNG gri pe 16 biți (`src/relief/png16.ts`): valoarea fiecărei celule e round((z − z_min) / (z_max − z_min) · 65 535), rândul
   de sus al imaginii e rândul de sus al reliefului, golul compusului (planul zero, ADR 0311 §7) e o valoare ca oricare.
   În fișier: un bloc `tEXt` cu cheia `cncvs2-relief` și JSON-ul `{ v: 1, zMin, zMax, celula }` (mm) și blocul `pHYs` cu
   pixelii pe metru (1000 / celula), ca un alt program să aibă scara.
2. **Importul:** un PNG pe 16 biți se citește în workerul reliefului cu cititorul propriu (tipurile de culoare 0, 2, 4, 6, pe
   8 și 16 biți; filtrele 0–4; fără întrețesere, care e refuzată cu motiv). Griul e valoarea împărțită la 65 535 (sau 255),
   luminanța la culoare. Cu blocul `cncvs2-relief`, fereastra „Relief din imagine” oferă **Z-ul din fișier** (implicit): Z =
   z_min + g · (z_max − z_min) și celula din fișier, deci relieful revine cum a plecat; fără bloc, sau cu alegerea de mână,
   înălțimea și baza din fereastră, ca la orice imagine.
3. **Dus-întors:** exportul unui relief importat din propriul fișier dă aceiași octeți (un punct fix), iar înălțimile importate
   diferă de cele exportate cu cel mult (z_max − z_min) / 131 070 (jumătate de treaptă), plus cuantizarea dalelor (ADR 0311).
4. **Funcțiile sunt pure** (scrierea și citirea PNG-ului, cu `CompressionStream` / `DecompressionStream`, deci aceleași în Node
   și în browser) și se probează pe hârtie: un fișier scris de cititorul probelor, independent (`node:zlib`), și invers.

## Mișcă mașina?

Indirect: un relief importat se taie. CAM-ul nu se schimbă; probele fixează că valorile citite sunt cele scrise, pe hârtie.

## Alegerile owner-ului (cu recomandarea aplicată)

1. **TIFF-ul pe 16 biți:** după PNG, într-o felie a lui (18.1↑g-2), peste cititorul TIFF al trasării (recomandat: PNG-ul e
   citit de orice program, iar o felie rămâne mică). Alternativa: amândouă acum.
2. **Ce se exportă:** compusul straturilor vizibile (recomandat: ce se taie). Alternativa: fiecare strat, câte un fișier.
3. **Z-ul din fișier, la import:** implicit, când fișierul îl are (recomandat). Alternativa: implicit înălțimea și baza din
   fereastră, ca la orice imagine.
4. **Simularea salvată ca strat** (din rândul 18.1↑g al ADR 0310): într-o felie a ei, după PNG (recomandat). Alternativa: acum.
