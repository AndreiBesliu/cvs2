# ADR 0066: Copierea de-a lungul unei curbe

**Starea:** acceptat pe 25.10.2026. Ordinea cerută de owner („Da”, la întrebarea dacă booleanul intră în uneltele de desen
înaintea testului lui): întâi copierea de-a lungul unei curbe, apoi booleanul, apoi testul. **Intră în:** etapa 6 („Editorul de
vectori”, rândul „Transformare și copiere”), adusă în etapa 3, fără mașină. **Continuă:** ADR 0061 (copierea în rețea și pe
cerc), ADR 0059 (Shift + clic adaugă la selecție, în ordine).

**Problema.** Copiile se puteau așeza în rânduri și coloane sau pe un cerc, nu și de-a lungul unei curbe oarecare (găuri pe o
bordură curbă, motive pe un chenar, litere pe un arc).

## Decizia

**1. Un al treilea fel al rețelei** (`fel: 'curba'` în `src/model/retea.ts`), prin aceeași acțiune `document.copiaza-in-retea`:
copiile sunt piese independente, într-un singur pas de anulare; nicio acțiune nouă, nimic la pornire.

**2. Curba e ultima formă aleasă.** Formele de copiat se aleg întâi, curba după ele, cu Shift + clic (selecția își ține ordinea).
Panoul o spune. Curba e o singură formă (o piesă cu un element: linie, cale, cerc, dreptunghi); o piesă cu mai multe contururi
se refuză. Curba nu se copiază; după copiere, sunt alese originalele și copiile, fără ea.

**3. Locurile, la distanțe egale pe lungime** (`locuriPeCurba`, `src/model/curba.ts`, pur): pe o curbă deschisă, de la capăt la
capăt, ambele incluse; pe una închisă, la pas egal de jur împrejur, de la primul vârf. Liniile și arcele se măsoară exact;
cubicele, cu Gauss–Legendre (8 puncte) pe 32 de bucăți și Newton pe lungime (sub 1e-9 mm pe curbele desenate). Într-un vârf,
tangenta e a segmentului care pleacă din el (la capătul unei curbe deschise, a celui care ajunge).

**4. Copia** pune centrul cutiei formelor alese (fără curbă) în loc; cu „Rotește copiile după curbă”, o rotește cu direcția
tangentei (absolută: o formă desenată „spre dreapta” urmează curba), altfel doar o mută. Originalele rămân pe loc.

**5. Panoul** e cel al rețelei, cu felul „Pe curbă”: câte copii (1–1000), rotirea, nota despre curbă, previzualizarea cutiilor
copiilor; motivele (nicio curbă, curba compusă, fără lungime, nimic de copiat) vin din calculul pur, înaintea verdictului
acțiunii.

## Respinse

- **Curba aleasă cu un buton „Alege curba” și un clic pe pânză**: încă un mod al pânzei de învățat; ordinea selecției face deja
  asta, iar panoul spune care e curba.
- **Pasul fix (mm) în loc de numărul de copii**: pentru o bordură de lungime dată, omul știe câte găuri vrea; pasul se poate
  adăuga ca opțiune.
- **Originalul pus pe curbă** (ca la rețeaua pe cerc): la o curbă oarecare, locul originalului n-are legătură cu curba.

## Se redeschide dacă

- se cere pasul fix, un decalaj față de curbă sau doar o porțiune a ei;
- se cere copierea pe o curbă compusă (mai multe contururi).
