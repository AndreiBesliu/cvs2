# ADR 0028 — Urechile (documentul v5)

**Starea:** acceptat pe 09.10.2026, în felia 2.4, pe verdictul din `docs/PORTARE.md` §3.1 (profilul adaptat, emitentul
rescris pe IR). **Intră în:** etapa 2. Nimic de aici nu se schimbă fără un ADR nou.

**Problema.** O piesă decupată prin material se desprinde de foaie pe ultima trecere și poate fi prinsă de freză.
Urechile lasă punți subțiri de material, rupte după tăiere. În ediția întâi:
- până pe 24.09.2026, Z-ul era binar pe vârfuri: controlerul urca pe toată latura dinaintea urechii, iar un raft
  600 × 100 rămânea tăiat de tot pe 15,4 % din contur;
- profilul Z(s) care a reparat asta (88 de verificări pe hârtie, 7 / 7 otrăvuri) e bun, dar emitentul aplatiza arcele în
  polilinii pe trecerile cu urechi;
- vârful urechii se măsura de la adâncimea totală, deci la o tăiere cu supracursă puntea ieșea mai subțire cu toată
  supracursa (2 mm cerut, 1,7 mm tăiat).

**Decizia.** Urechile sunt un parametru al operației de profil (`Operatie.urechi`), ca în ArtCAM. Profilul Z(s) se
portează cu formulele lui. Emitentul devine un modificator peste trecerea L / A din IR: liniile și arcele se taie exact
în punctele de ruptură, iar un flanc pe arc devine elice. Grosimea punții se măsoară de la fața de jos a foii.

## Contractul

**1. Documentul v5** (`schema: 5`) = contractul v4 (ADR 0027), plus `Operatie.urechi`, obligatoriu: `null` (fără
urechi) sau `{ numar, latime, grosime }`:
- `numar`: întreg, 1–100 (`PLAFON.urechi`); câte urechi pe **fiecare buclă** a traseului;
- `latime` (W): pozitiv, cel mult `PLAFON.latura`; lungimea palierului, în mm, **măsurată pe traseul centrului frezei**;
- `grosime` (g): pozitiv, cel mult `PLAFON.grosime`; grosimea punții, în mm, **de la fața de jos a foii** în sus.

**Migrarea v4 → v5** (pură, deterministă): fiecare operație primește `urechi: null`. O operație v4 care are deja un câmp
necunoscut `urechi` e refuzată cu motiv (ciocnire de nume, ca în ADR 0024, precizarea 7). Lanțul v1 → … → v5 rămâne.
- O operație nouă (Adaugă) vine cu `urechi: null`. Programul unui document fără urechi e **același, octet cu octet**, ca
  în v4 (placa 1 își păstrează amprentele).
- Urechile se pornesc din dialogul de export, pe rând, cu valorile implicite **4 × 8 mm × 2 mm** (cele ale plăcii 2).

**2. Vârful urechii,** ca adâncime de la fața de sus: `varf = grosimeFoaie − g`. Puntea are grosimea g oricât de adânc
merge tăietura, și cu supracursă. Exportul refuză, cu motiv:
- `g ≥ grosimeFoaie`: vârful ar fi la fața de sus sau deasupra ei;
- `adancime ≤ varf`: nicio trecere nu ajunge la vârful urechii, deci urechile cerute n-ar exista.

**Supracursa** devine un parametru al exportului: `calculeazaExport(doc, { …, supracursa })`, în mm, implicit 0, cel
mult 2. Adâncimea unei operații poate trece de grosimea foii cu cel mult atât. Dialogul nu-l arată încă (vine cu profilul
mașinii), deci din interfață rămâne 0, ca azi.

**3. Profilul Z(s), pe fiecare buclă** (formulele din ediția întâi, `PORTARE.md` §3.1):
- P = lungimea exactă a buclei (liniile; arcele ca r·|θ|); s = drumul pe buclă de la vârful 0, în sensul de mers
  (după ADR 0027). Pornirea (plonjarea) e la s = 0.
- S = P / n; centrele urechilor sunt la c_k = (k + ½)·S, k = 0 … n − 1.
- h = W / 2 (jumătatea palierului); ℓ = min(W / 2; 0,45·(S − W)) (flancul).
- **Refuz:** W > 0,9·S pe vreo buclă („urechile nu încap”). Ediția întâi strângea tăcut palierul la 0,9·S; aici lățimea
  cerută nu se micșorează niciodată pe ascuns.
- Pe o trecere de adâncime d > varf:
  - palierul, |s − c_k| ≤ h: Z = −varf;
  - flancul, h < |s − c_k| < h + ℓ: Z liniar, de la −varf (la h) la −d (la h + ℓ);
  - în rest: Z = −d.
- Pe o trecere cu d ≤ varf, Z = −d: trecerea e aceeași ca fără urechi.
- **Proprietăți**, care decurg din formule și pe care oracolul le verifică:
  - h + ℓ ≤ 0,495·S < S / 2, deci flancurile vecine nu se ating și cel puțin 10 % din spațiul dintre urechi rămâne la
    adâncime plină;
  - s = 0 e la adâncime plină: plonjarea nu cade pe o ureche;
  - toate rupturile (c_k ± h, c_k ± (h + ℓ)) sunt în (0, P): niciuna nu trece peste pornire.
- Toate laturile pot avea urechi: `exterior`, `interior` (gaura își ține miezul) și `pe-linie`.

**4. Emitentul** (modificator peste trecerea din IR):
- Fiecare segment se taie exact în rupturile care cad strict în interiorul lui. O ruptură la cel mult 1e-6 mm de un vârf
  e chiar vârful.
- O bucată de linie e o mișcare `taiere`; o bucată de arc e un `arc` pe același cerc, cu același centru. Z-ul e liniar
  pe fiecare bucată (constant pe palier și la adâncime plină). Pe arc, Z liniar în lungime e liniar în unghi, adică
  exact elicea G2 / G3 cu Z.
- Pe o trecere care traversează urechi, o mișcare poartă Z doar dacă Z-ul de la capătul ei diferă de cel de la start.
  Plonjarea de la s = 0 rămâne la −d. Trecerile care nu traversează se emit exact ca înainte.
- Eticheta tăieturii rămâne cea din ADR 0026 §7, fără etichete în interiorul buclei. Poarta citește urechile din
  geometrie, nu din comentarii.

**5. Invariantele:**
- **1 (cel mult pasul pe trecere)** rămâne valabilă:
  - pe flanc, două treceri consecutive diferă cu (d₂ − d₁)·(u − h) / ℓ ≤ d₂ − d₁;
  - pe palier, prima trecere care traversează scoate varf − d₁ < d₂ − d₁.
- **2 (regiunea păstrată):** traseul în plan nu se schimbă, deci nici verificarea.
- **9 (sensul), amendată** (ADR 0027 §6). Z-ul se poate schimba sub fața de sus fără să rupă drumul:
  - **mișcarea în material:** G1 / G2 / G3 cu startul cunoscut și cu ambele capete sub fața de sus (z < −1e-6), la
    orice Z;
  - **drumul:** șirul maximal de astfel de mișcări sub aceeași etichetă, întrerupt de G0, de o mișcare care atinge
    fața de sus sau de o etichetă nouă.

  Închiderea buclei și aria se socotesc în proiecția XY, ca înainte. Trecerile fără urechi, la Z constant, dau
  aceleași bucle.
- **10 (urechile), nouă.** Rulează în poartă cu documentul (ca 2 și 9).
  - Pe fiecare buclă a unei tăieturi cu urechi, la fiecare trecere cu d > varf, Z(s) urmează profilul de la 3:
    - P se măsoară pe bucla din program;
    - centrele, palierele și flancurile se compară cu formulele;
    - Z-ul se compară cu −varf și −d, cu toleranțele de rotunjire declarate de oracol.
  - Pe o tăietură fără urechi, sau pe o trecere cu d ≤ varf, toate mișcările buclei sunt la Z constant.
  - Legarea etichetei de operație e cea de la invarianta 9.

**6. Ce verifică oracolul** (sesiune independentă, din acest ADR):
- documentul v5 (schema, migrarea v4 → v5, ciocnirea);
- invarianta 9 amendată și invarianta 10 în poartă;
- un oracol pe hârtie (`test/oracles/urechi.ts`), cu zero importuri din `src/`. El citește G-code-ul, cu tot cu
  arcele elicoidale, și măsoară pe fiecare trecere care traversează o ureche:
  - lungimea pe palier, pe flancuri și la adâncime plină;
  - numărul de paliere (fiecare de exact W);
  - poziția centrelor față de pornire.

  Valorile așteptate vin din perimetrul calculat analitic din formă (nu citit din program).

**Cazurile pe hârtie** sunt cele 6 din ediția întâi:
- toate pe o foaie de 3 mm, cu adâncimea 3, pasul 1, g = 1,5 (deci varf = 1,5, iar trecerile la 2 și 3 traversează),
  cu freza Ø6, pe exterior;
- formele și urechile:

  | Forma | Urechi |
  |---|---|
  | dreptunghi 300 × 200 | 4 × 8 |
  | dreptunghi 300 × 200 | 4 × 6 |
  | ușa 300 × 200 cu colțurile R40 | 4 × 8 |
  | cercul R100 | 4 × 8 |
  | raftul 600 × 100 | 4 × 6 |
  | dreptunghi 300 × 200 | 8 × 6 |

Se adaugă:
- o gaură (`interior`) circulară cu 3 urechi;
- un caz ca placa 2 (120 × 80 cu colțurile R10, MDF 12, adâncimea 12, pasul 4, g = 2, deci puntea de 2,0);
- **supracursa:** exportul cu `supracursa: 0,3`, adâncimea 18,3 pe o foaie de 18, cu g = 2. Palierul rămâne la −16,
  iar puntea e de 2,0. Fără parametru, aceeași adâncime e refuzată.

**Martorii negativi**, care trebuie să înroșească oracolul:
- Z binar pe vârfuri (forma de dinainte de 24.09);
- vârful măsurat de la adâncimea tăieturii;
- centrele la k·S (o ureche pe plonjare);
- palierul strâns la 0,9·S în loc de refuz;
- flancul pe arc scris ca o coardă.

**7. Interfața:** în dialogul de export, fiecare rând are o coloană **Urechi**:
- oprit, sau numărul, lățimea și grosimea (numerele se citesc ca la 2.2, cu punct sau virgulă);
- coloana e oprită în fila care doar citește;
- valorile intră în document prin `document.aplica-operatii`.

## Limitele

- **Palierul se măsoară pe traseul centrului frezei.** Pe o latură dreaptă, ciotul de pe peretele piesei are exact W.
  Pe un arc al traseului, are W·r_perete / r_traseu: la exterior e mai scurt (un colț R10 cu freza Ø6 dă 8 → 6,15 mm),
  la interior mai lung.
- Pozițiile sunt automate, egal depărtate de la pornire. Așezarea de mână, sau cea care ocolește arcele, vine cu
  panoul de proprietăți sau mai târziu.
- Placa 2 (felia 2.10) își alege forma și pornirea astfel încât urechile să cadă pe laturi drepte.
- Rampa și intrările (felia 2.5) se compun cu urechile prin Z-ul cel mai puțin adânc dintre cele două, ca în ediția
  întâi. Precizarea intră în ADR-ul lor.
- Supracursa (tăierea în masa de sacrificiu) nu e încă în interfață; exportul o primește ca parametru (punctul 2).

## Ce am respins

- **Strângerea tăcută a palierului** la 0,9·S (ediția întâi): lățimea cerută s-ar schimba fără să o știi.
- **Vârful măsurat de la adâncimea tăieturii:** puntea se subțiază cu supracursa.
- **Z binar pe vârfuri** și **arcele aplatizate** pe trecerile cu urechi: defectele de dinainte de 24.09, respectiv ale
  emitentului vechi.
- **Urechile ca operație sau geometrie separată:** sunt o proprietate a profilului, cum le tratează și ArtCAM.
  Geometria lor depinde de bucla tăiată, nu de desen.

**Se redeschide dacă:**
- placa 2 arată că ciotul de pe arc contează în atelier (atunci palierul trece pe peretele piesei);
- apar urechile triunghiulare (3D), cele pe trecerea de finisare sau așezarea de mână.
