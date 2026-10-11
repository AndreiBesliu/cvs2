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
- `TINTA_APROXIMARE` = **0,99**: fitter-ul țintește 0,99 × toleranța: o marjă peste măsurătoarea rafinată de la §6;
- `RAZA_MAXIMA_ARC` = **9 900 mm**: cea mai mare rază a unui arc din lanț (§4). Postul scrie ca segmente G1 orice arc cu
  raza peste garda contractului (`razaMaxima`, 10 000 mm la GRBL 1.1), cu săgeata până la toleranță. O a doua aproximare
  peste prima ar dubla abaterea: recenzia a măsurat până la 2,05 × `tol` prin postul real. Cei 100 mm de sub gardă sunt
  pentru offset, care adaugă raza frezei. Un test leagă cifra de fiecare contract și toleranța postului de cea de aici.

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
- tăieturile, pentru t strict în (0, 1), în ordinea asta:
  1. cubica se taie la inflexiuni, unde cross(B′, B″) = 0, și la vârfuri, unde B′ = 0;
  2. **o bucată plată devine linie:** dacă c1 și c2 ai bucății stau la cel mult 0,99 × `tol` de segmentul [a, b] al ei,
     curba stă la fel de aproape de segment, în ambele sensuri (învelitoarea convexă, iar proiecția curbei acoperă
     segmentul);
  3. o bucată care nu e plată se taie și la **extremele pe axe**, unde B′x = 0 sau B′y = 0. Fiecare bucată rămasă e
     monotonă pe x și pe y, deci tangenta ei stă într-un cadran și se rotește cel mult 90°. Nu se poate întoarce între
     două eșantioane ale măsurătorii (§6);
  4. fiecare bucată monotonă se împarte în jumătăți până când biarcul ei încape (sau devine plată);
- **raza:** un arc cu raza peste `RAZA_MAXIMA_ARC` devine linie, înainte de măsurare, deci lanțul măsurat e cel emis;
- nicio bucată de lungime nulă: un biarc a cărui îmbinare cade pe un capăt nu se folosește (bucata se împarte), iar un
  vârf al lanțului aflat la sub 1e-9 mm de următorul cade;
- o cubică degenerată (toate cele patru puncte la sub 1e-9 mm) nu dă nicio bucată.

**Vârfurile se caută din B′, nu din cross(B′, B″).** La un vârf, cross are o rădăcină dublă: rotunjirea face discriminantul
puțin negativ și tăietura se pierde (recenzia: în 52 % din vârfurile exacte cu coordonate oarecare). Pe o cubică dreaptă,
cross e identic zero. Vârful e însă o rădăcină simplă a lui B′x și a lui B′y deodată, deci se ia dintre rădăcinile lor,
acolo unde B′ se anulează (la 3e-9 × latura cea mai lungă a poligonului de control).

**5. Refuzuri, cu motiv:**
- `tol` care nu e un număr finit pozitiv: altfel, recursivitatea ajunge la mii de bucăți (măsurat în ediția întâi);
- un punct neterminat (NaN, infinit);
- **plafonul:** cel mult **4 096 de bucăți pe o cubică**. Peste el, refuz explicit, nu trunchiere tăcută (T5: niciun
  traseu tăcut);
- **sub rezoluția numerică:** o bucată mai scurtă de 1e-12 în t care tot nu încape înseamnă că `tol` e sub precizia
  coordonatelor (de exemplu 1e-10 mm la 1e6 mm de origine). Are motivul ei, nu pe cel al plafonului.

**6. Cum se măsoară** (de fitter, pe fiecare bucată, înainte s-o accepte):
- de la curbă la lanț: distanța exactă de la puncte ale curbei la linii și arce;
- de la lanț la curbă: distanța de la puncte ale liniilor și arcelor la curbă, cu proiecția pe cubică;
- pe cel puțin 32 de puncte pe fiecare sens, plus capetele;
- apoi **fiecare maxim local** al șirului eșantionat (pe fiecare sens, pe fiecare segment) se rafinează prin secțiunea de
  aur, în 20 de pași, pe intervalul dintre eșantioanele vecine. Bucata se acceptă pe maximul rafinat. Dacă maximul
  eșantionat trece deja de țintă, bucata cade fără rafinare.

Eșantionarea singură scăpa vârful abaterii: recenzia a găsit un singur biarc la 1,13 × `tol`, iar ținta de 0,99 nu-l
acoperea. Garanția stă pe trei lucruri: bucățile monotone (§4, pas 3), rafinarea maximelor locale și marja de 0,99. Ea
rămâne euristică: o cocoașă mai îngustă de 1/32 din bucată, fără un maxim eșantionat lângă ea, poate scăpa. Pe bucăți
monotone, recenzia n-a găsit niciuna (căutări adversariale: cel mult 0,990 × `tol`).

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

- Arcele au raza cel mult 9 900 mm. O curbă mai plată de atât iese din linii măsurate: pe arcul de 1 200 × 50 al unei
  elipse, 128 de linii de 5–8 mm. Sunt aproximativ segmentele G1 pe care postul le-ar fi scris oricum. În campaniile
  recenziei, numărul bucăților a crescut de ~1,8 ori. Contractele altor controlere (NcStudio, Syntec, Mach3) vin cu
  posturile (etapele 3–4); testul de consecvență le cuprinde pe fiecare.
- O inflexiune prost condiționată (cross(B′, B″) are coeficientul de grad 2 rezultat din scăderea a doi termeni de
  ~3·10⁶) se găsește cu o eroare de ~3·10⁻⁶ mm pe curbă. Tăietura rămâne pe curbă, deci abaterea nu se schimbă.
- Pătraticele (SVG `Q`, fonturile) se ridică exact la cubice la import (ADR 0001), deci trec pe aceeași ușă.
- Arcul eliptic din mijlocul unei căi SVG se aproximează tot prin cubice (ADR 0002), la import.

## Ce am respins

- **Polilinia** (eșantionarea curbei în segmente): mii de mișcări G1 și fără continuitate tangentă.
- **Verificarea într-un singur sens** (ediția întâi): lanțul se poate depărta de curbă între punctele verificate.
- **Trunchierea tăcută la o adâncime** (ediția întâi): o curbă grea ieșea peste toleranță fără niciun cuvânt.

## Recenzia (11.10.2026)

O lentilă de geometrie și câte un verificator pe constatare (șase agenți) au găsit, toate reproduse cu măsuri
independente:
- **mânerul întors** pe o cubică aproape dreaptă: întoarcerea din primul 1/32 al bucății nu cădea pe niciun eșantion, iar
  lanțul era coarda goală. Abaterea: 18–35 × `tol`, până la 414 × pe 2,4 m, tăcut. S-a reparat cu extremele pe axe (§4);
- **vârfurile ratate** din rotunjire: până la 2,63 × `tol`, cu arce de 180° de câțiva nanometri în locul colțului. S-au
  reparat cu căutarea din B′ (§4);
- **vârful abaterii între eșantioane:** 1,13 × `tol` pe un singur biarc. S-a reparat cu rafinarea maximelor locale (§6);
- **razele** de 10⁶–10¹² mm, pe care postul le-ar fi aproximat a doua oară. S-a reparat cu `RAZA_MAXIMA_ARC` (§1, §4);
- bucățile nule, începutul la 1e-9 mm de a și motivul greșit al refuzului de sub rezoluție.

Cazurile intră în testele aplicației (`test/unit/geom.biarce.recenzie.test.ts`), judecate cu măsura oracolului.

**Se redeschide dacă:** oracolul arată abateri peste `tol` pe un corpus real, sau numărul de arce încarcă senderul
(etapa 3).
