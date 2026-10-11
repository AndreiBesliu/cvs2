# ADR 0033 — Biarcele: cubica devine linii și arce sub toleranța proiectului

**Starea:** acceptat pe 11.10.2026, în felia 2.7a. Pune în cod ADR 0006 (T6: biarcele proprii sunt singura ușă de
aproximare) și bugetul din `docs/PORTARE.md` §3.3. **Intră în:** etapa 2. Nimic de aici nu se schimbă fără un ADR nou.

**Problema.** Offsetul (cavalier), regiunea păstrată, postul și G-code-ul lucrează doar cu linii și arce. Cubicele vin cu
importul SVG (2.7c) și cu textul (etapa 7). Ele trebuie aduse la linii și arce o singură dată, într-un singur loc, cu
abaterea cunoscută.

În ediția întâi, fitter-ul își verifica eroarea într-un singur sens, de la curbă spre arce, în 24 de puncte, și tăia
recursivitatea la adâncimea 12 fără să spună. Sonda s1 a scris un fitter în modelul de aici (`bulge`), iar abaterea lui
reală a ajuns la 1,0076 × toleranța [măsurat, s1-V C3].

## Contractul

**1. Bugetul de toleranță** stă într-un singur loc, `src/geom/toleranta.ts`:
- `TOLERANTA_PROIECT` = **0,001 mm** (T2): abaterea declarată a oricărei aproximări de pe drumul spre mașină;
- `TINTA_APROXIMARE` = **0,99**: fitter-ul țintește 0,99 × toleranța, ca abaterea reală să rămână sub cea declarată.

Rotunjirea postului (0,0005 mm, la 3 zecimale) e separată și nu intră aici.

**2. Ușa:** `cubicaInArce(a, c1, c2, b, tol)` primește capetele a, b și punctele de control c1, c2 ale unei cubice și
întoarce fie lanțul de bucăți (linii și arce, cu `bulge`) de la a la b, fie un refuz cu motiv. Niciodată o excepție.
`conturFaraCubice(c, tol)` face același lucru pe un contur întreg. Liniile și arcele rămân neschimbate, iar fiecare cubică
e înlocuită de lanțul ei.

**3. Garanția.** Distanța Hausdorff dintre cubică și lanț (în **ambele** sensuri: de la fiecare punct al curbei la lanț și
de la fiecare punct al lanțului la curbă) e **cel mult `tol`**. Dacă nu se poate garanta, ușa refuză.

**4. Forma lanțului:**
- începe exact în a și se termină exact în b;
- între două arce, tangenta e continuă: biarcele au tangente egale la îmbinare, iar tăieturile sunt pe curbă. Excepțiile:
  - la un vârf al cubicei, tangenta se întoarce (colț de 180°);
  - lângă o linie (o bucată plată, mai jos), direcția liniei e coarda, deci poate face un unghi mic cu tangenta curbei. Linia
    stă oricum în abatere;
- cubica se taie întâi la inflexiuni, unde cross(B′, B″) = 0, și la vârfuri, unde B′ = 0, pentru t strict în (0, 1). Apoi
  fiecare bucată se împarte în jumătăți până când biarcul ei încape;
- **o bucată plată devine linie:** dacă c1 și c2 stau la cel mult 0,99 × `tol` de segmentul [a, b] al bucății, curba stă
  la fel de aproape de segment, în ambele sensuri (învelitoarea convexă, iar proiecția curbei acoperă segmentul);
- o cubică degenerată (toate cele patru puncte la sub 1e-9 mm) nu dă nicio bucată.

**5. Refuzuri, cu motiv:**
- `tol` care nu e un număr finit pozitiv: altfel, recursivitatea ajunge la mii de bucăți (măsurat în ediția întâi);
- un punct neterminat (NaN, infinit);
- **plafonul:** cel mult **4 096 de bucăți pe o cubică**. Peste el, refuz explicit, nu trunchiere tăcută (T5: niciun
  traseu tăcut).

**6. Cum se măsoară** (de fitter, pe fiecare bucată, înainte s-o accepte):
- de la curbă la lanț: distanța exactă de la puncte ale curbei la linii și arce;
- de la lanț la curbă: distanța de la puncte ale liniilor și arcelor la curbă, cu proiecția pe cubică;
- pe cel puțin 32 de puncte pe fiecare sens, plus capetele. Eșantionarea poate scăpa un vârf între puncte, de aceea ținta
  e 0,99 × `tol`.

**7. Unde se folosește:** CAM-ul înlocuiește cubicele conturului unei tăieturi cu biarce la `TOLERANTA_PROIECT`, înaintea
regiunii păstrate și a offsetului (felia 2.7b, când formele cu cubice intră în document). Desenul, pânza și exportul
vectorial păstrează cubicele exacte.

**8. Ce verifică oracolul** (sesiune independentă, din acest ADR):
- distanța exactă de la un punct la o cubică și Hausdorff în ambele sensuri, cu rafinare locală;
- tangenta continuă între arcele vecine (cu excepțiile de la §4);
- pe un corpus de cubice: din SVG-uri și glife, plus cele grele (vârf, buclă, mâner retras P1 = P0, aproape dreaptă,
  dublă inflexiune, de 0,01 mm, de 2 440 mm). Pe fiecare, abaterea ≤ `tol` și capetele exacte;
- refuzurile de la §5;
- **controlul negativ:** un lanț împins cu 1,01 × `tol` trebuie prins.

**Martorul pozitiv** (doar informativ): câte bucăți dă fitter-ul față de cel al sondei s1, pe același corpus.

## Limitele

- Pe o bucată aproape dreaptă, dar care nu trece de pragul liniei, arcele pot avea raze foarte mari (sute de mii de mm).
  GRBL le primește; contractele altor controlere (NcStudio, Syntec, Mach3) vin cu posturile (etapele 3–4).
- Pătraticele (SVG `Q`, fonturile) se ridică exact la cubice la import (ADR 0001), deci trec pe aceeași ușă.
- Arcul eliptic din mijlocul unei căi SVG se aproximează tot prin cubice (ADR 0002), la import.

## Ce am respins

- **Polilinia** (eșantionarea curbei în segmente): mii de mișcări G1 și fără continuitate tangentă.
- **Verificarea într-un singur sens** (ediția întâi): lanțul se poate depărta de curbă între punctele verificate.
- **Trunchierea tăcută la o adâncime** (ediția întâi): o curbă grea ieșea peste toleranță fără niciun cuvânt.

**Se redeschide dacă:** oracolul arată abateri peste `tol` pe un corpus real, sau numărul de arce încarcă senderul
(etapa 3).
