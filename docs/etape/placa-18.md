# Fișa plăcii 18

**Ce probează:** relieful pe lemn (ADR 0310 §13): degroșarea cu freza plată (ADR 0313) și finisarea cu bila (ADR 0312), pe
un relief cunoscut pe hârtie. Măsurătorile răspund la trei întrebări:
- **lemnul rămas după degroșare:** adaosul pe fund, pe platou și pe rampă;
- **suprafața finisată față de model:** fundul, platoul și rampa la adâncimea lor, vârful calotei la față, creasta între linii;
- **timpul:** cronometrul față de estimarea aplicației (ADR 0046), cu ±10 %.

Fiecare cotă de mai jos e prezisă de oracolul independent al simulării, pe aceste fișiere (`test/unit/placa18.test.ts`). Placa
arată dacă lemnul spune același lucru. Asta nu se poate dovedi fără mașină: creasta reală (raza adevărată a bilei, bătaia,
încovoierea frezei), suprafața tăiată și timpul.

Programele sunt scrise de aplicație pe drumul ei (`test/placi/placa-18/genereaza.ts`):
- relieful vine dintr-o grilă, ca unul importat;
- rolul e „Relief 3D” (întâi degroșarea, apoi finisarea);
- exportul pune câte un fișier pe freză, pe contractul GRBL 1.1.

## Ce îți trebuie

- O bucată de **MDF de 18 mm**, de cel puțin **140 × 100 mm**. Relieful stă în ea între x 30 și 110, y 25 și 75.
- Două freze cu Ø6: **plată** (T1) și **bilă** (T2).
- Un șubler cu tijă de adâncime. Pentru creastă, un comparator ajută; altfel, lumina razantă și degetul.

## Relieful

Relieful are 80 × 50 mm, cu vârful la fața plăcii. Coordonatele de mai jos sunt pe foaie (zero în colțul stânga-jos al bucății).

| Trăsătura | Unde | Pe hârtie |
|---|---|---|
| fundul | tot ce nu e calotă, rampă sau platou | la 8,00 sub față |
| calota | centrul în (52, 50); sfera cu raza 15, înaltă de 8 | vârful la față; baza, Ø26,5 pe fund |
| rampa | x de la 75 la 95, y de la 37 la 63; panta 0,3 (~16,7°) | de la 8,00 la 2,00 sub față |
| platoul | x de la 95 la 105, y de la 37 la 63 | la 2,00 sub față |
| buzunarul | x de la 30 la 110, y de la 25 la 75 | pereții drepți, păstrați |

## Fișierele

| Fișierul | Freza | Ce taie | Linii | SHA-256 |
|---|---|---|---:|---|
| [placa-18-1-T1.nc](https://raw.githubusercontent.com/AndreiBesliu/cvs2/main/test/placi/placa-18/placa-18-1-T1.nc) | plată Ø6 | degroșarea: trei trepte de 3 mm, liniile la 2,5 mm, adaosul 0,5 | 9 704 | `03892179f7d1160e0197a2ca7eae4ba3591e02b95980c6675fe5f8287b501fdc` |
| [placa-18-2-T2.nc](https://raw.githubusercontent.com/AndreiBesliu/cvs2/main/test/placi/placa-18/placa-18-2-T2.nc) | bilă Ø6 | finisarea: trei treceri de 3 mm, liniile la 1,5 mm | 18 889 | `0fc1b7a13db17058ce81c8e44f3f2cfc3bcc859c67593eb5c6d0a06126ae8f5c` |

Ca să verifici că fișierul de la mașină e exact acesta, rulează în dosarul lui:

```powershell
Get-FileHash .\placa-18-1-T1.nc -Algorithm SHA256
```

## Cum le tai

1. Prinde bucata pe masă. Zero X și Y e în colțul stânga-jos al bucății, iar **Z0 e pe fața de sus a MDF-ului**.
2. Rulează **T1** (freza plată).
3. **Înainte de T2, măsoară cotele „după T1”** de mai jos: după finisare nu se mai pot citi.
4. Schimbă freza cu bila și **refă doar zero Z**, pe fața de sus, cu bila. X și Y rămân.
5. Rulează **T2**.

Regimul e cel implicit al aplicației: axul la 18 000 rot/min, cu o pauză de 3 s după pornire; avansul 1 000 mm/min, plonjarea
300 mm/min; Z sigur la 5 mm. Freza coboară cu avansul de plonjare oriunde coboară abrupt, nu doar la plonjările pe loc.

## Timpul (ADR 0046)

Estimarea aplicației, cu modelul planificatorului GRBL 1.1h:

| Fișierul | Pe setările din fabrică ale GRBL 1.1h | Pe o mașină cu $110 = $111 = 5 000, $112 = 1 000, $120 = $121 = 500, $122 = 200 |
|---|---:|---:|
| placa-18-1-T1.nc | 15 min 2 s | 5 min 59 s |
| placa-18-2-T2.nc | 23 min 57 s | 9 min 47 s |

**Cronometrează fiecare fișier**, de la pornire până la oprirea axului, și trimite-mi timpii împreună cu răspunsul mașinii la
`$$`. Comparația cu estimarea, cu toleranța ±10 %, intră în teste odată cu cotele.

## Ce măsori

Adâncimile se măsoară de pe fața plăcii, cu tija șublerului, la mijlocul fiecărei zone (punctele din tabel).

### După T1 (degroșarea)

| Cota | Unde (x, y) | Valoarea | Toleranța |
|---|---|---:|---:|
| fundul, adâncimea | (38, 33) | 7,50 | ±0,1 |
| platoul, adâncimea | (100, 50) | 1,50 | ±0,1 |
| rampa la mijloc, adâncimea | (85, 50) | 4,25 | ±0,15 |
| vârful calotei | (52, 50) | neatins, la față | — |

Pe fund și pe platou, freza plată lasă exact adaosul, 0,5 mm. Pe rampă, cu liniile de-a lungul ei, rămâne mai mult (ADR 0313
§3): între a · (1 + g) = 0,65 și 0,65 + g · (R − √(R² − (s / 2)²)) + 2 · h · g = 0,77 deasupra modelului. Oracolul prezice
0,75, deci adâncimea de 4,25 în loc de 5,00.

### După T2 (finisarea)

| Cota | Unde (x, y) | Valoarea | Toleranța |
|---|---|---:|---:|
| fundul, adâncimea | (38, 33) | 8,00 | ±0,1 |
| platoul, adâncimea | (100, 50) | 2,00 | ±0,1 |
| rampa la mijloc, adâncimea | (85, 50) | 5,00 | ±0,15 |
| vârful calotei | (52, 50) | la față (o riglă pe față atinge calota) | ±0,1 |
| buzunarul, pe X (la față) | rândul y = 30 | 79,88 | ±0,2 |
| buzunarul, pe Y (la față) | coloana x = 70 | 50,00 | ±0,2 |
| creasta pe fund și pe platou | între două linii | 0,095 | ±0,05 |
| distanța dintre creste | pe Y | 1,50 | ±0,1 |
| timpul fiecărui fișier, față de estimarea pe setările mașinii tale | — | — | ±10 % |

Valorile pe hârtie:
- **creasta** bilei Ø6 la 1,5 mm între linii: 3 − √(3² − 0,75²) = 0,095 mm. Ca să măsori distanța dintre creste, numără 10
  dungi pe Y: au 15,0 mm;
- **pe X, buzunarul are 79,88, nu 80:** bila nu atinge fața din jur, deci la capetele liniilor rămâne cel mult o celulă de
  calcul (0,06 mm) pe fiecare perete;
- **pe Y, buzunarul are 50,00 la față:** linia de lângă perete rotunjește muchia de sus. Mai jos, peretele e la ~0,1–0,2 mm
  înăuntru;
- **la baza pereților și a calotei:** un racord cu raza bilei (3 mm), pentru că bila nu poate face un colț interior.

## Ce devin măsurătorile

- **Fundul și platoul după T1:** dacă sunt mai adânci decât 7,50 și 1,50 cu aceeași diferență, e zero-ul Z al lui T1. Dacă
  diferă doar între ele, e freza (lungimea ei în mandrină).
- **Creasta mai mare decât 0,095:** raza efectivă a bilei e mai mică (sau freza bate). Din creasta măsurată c, raza efectivă e
  r = (c² + 0,75²) / (2 · c).
- **Fundul după T2 mai adânc decât 8,00:** zero-ul Z al lui T2 sau lungimea bilei.
- **Pereții:** un buzunar mai lat decât în tabel înseamnă o freză care taie mai lat (bătaia).

Valorile intră ca date ale frezelor (ADR 0300), citite și de CAM, și de oracol, nu din cod.

## Rezultatul

Trimite-mi cotele măsurate (sau poze cu șublerul pe fiecare), timpii și `$$`. Ele intră în teste ca transcrierea plăcii, legată de
aceste fișiere de aur.

## Partea a doua: litofania (felia 18.1↑i)

**Ce probează:** litofania (ADR 0321): o placă translucidă a cărei grosime urmează imaginea, tăiată cu planul zero la grosimea
plăcii, deci cu grosimea rămasă exact cea din harta litofaniei. Trei pătrate de gri, cu grosimile lor pe hârtie. Ca la partea
întâi, fiecare valoare e prezisă de oracolul independent al simulării (`test/unit/placa18.litofanie.test.ts`), iar programele
sunt scrise de aplicație pe drumul ei (`test/placi/placa-18/genereaza-litofanie.ts`): harta grosimilor ca din fereastra
„Litofanie”, rolul „Relief 3D” cu planul zero la 6 mm, câte un fișier pe freză, GRBL 1.1.

### Ce îți trebuie

- O **placă albă translucidă de 6 mm** (din răspunsul 6a la ADR 0310: Corian, acril opal sau PVC expandat alb), de cel puțin
  **100 × 50 mm**. Litofania stă în ea între x 20 și 80, y 15 și 35.
- Două freze cu Ø3: **plată** (T1) și **bilă** (T2).
- Un micrometru sau un șubler pentru grosime și o lampă (sau o fereastră luminoasă) pentru proba din spate.

### Litofania

Trei pătrate de 20 × 20 mm, de la stânga la dreapta, cu grosimea rămasă pe hârtie (lumina liniară: t = 3 − L · 2,2, cu L griul
pixelului): placa din jur rămâne netăiată, deci e rama.

| Pătratul | Unde (centrul) | Griul | Grosimea rămasă | Adâncimea de la față |
|---|---|---:|---:|---:|
| 1 | (30, 25) | alb (255) | 0,80 | 5,20 |
| 2 | (50, 25) | gri (128) | 1,90 (1,8957) | 4,10 |
| 3 | (70, 25) | negru (0) | 3,00 | 3,00 |

### Fișierele

| Fișierul | Freza | Ce taie | Linii | SHA-256 |
|---|---|---|---:|---|
| [placa-18-litofanie-1-T1.nc](https://raw.githubusercontent.com/AndreiBesliu/cvs2/main/test/placi/placa-18/placa-18-litofanie-1-T1.nc) | plată Ø3 | degroșarea: trepte de 2 mm, liniile la 1,2 mm, adaosul 0,3 | 416 | `b284b14f7a6b63069d2597d1c5d0011bf8d0fa5559730c92a785f3737268c385` |
| [placa-18-litofanie-2-T2.nc](https://raw.githubusercontent.com/AndreiBesliu/cvs2/main/test/placi/placa-18/placa-18-litofanie-2-T2.nc) | bilă Ø3 | finisarea: treceri de 2 mm, liniile la 0,5 mm | 3 936 | `1e8255bc909c802569580edc837ddef6e77462ba879300cff54fe4cd7f567dd8` |

### Cum le tai

1. Prinde placa pe masă, plat (o placă de 6 mm se îndoaie ușor: bandă dublu adezivă pe toată fața de jos). Zero X și Y e în
   colțul stânga-jos al plăcii, iar **Z0 e pe fața de sus**.
2. Rulează **T1** (freza plată), apoi **măsoară grosimile „după T1”**.
3. Schimbă freza cu bila și **refă doar zero Z**, pe fața de sus. X și Y rămân.
4. Rulează **T2**.

Regimul e cel implicit al aplicației (18 000 rot/min, avansul 1 000 mm/min, plonjarea 300 mm/min). Pe acril sau PVC, dacă
materialul se topește, coboară turația sau urcă avansul: valorile se pot schimba din fereastra exportului, fără să atingă drumul.

### Timpul (ADR 0046)

| Fișierul | Pe setările din fabrică ale GRBL 1.1h |
|---|---:|
| placa-18-litofanie-1-T1.nc | 8 min 22 s |
| placa-18-litofanie-2-T2.nc | 16 min 59 s |

### Ce măsori

Grosimea rămasă, în mijlocul fiecărui pătrat (micrometrul, cu placa scoasă; sau adâncimea de la față, cu tija șublerului).

| Cota | Unde (x, y) | După T1 | După T2 | Toleranța |
|---|---|---:|---:|---:|
| grosimea pătratului 1 | (30, 25) | 1,10 | 0,80 | ±0,05 |
| grosimea pătratului 2 | (50, 25) | 2,20 | 1,90 | ±0,05 |
| grosimea pătratului 3 | (70, 25) | 3,30 | 3,00 | ±0,05 |
| creasta finisării | între două linii | — | 0,021 | ±0,02 |
| rama | în jurul pătratelor | netăiată | netăiată | — |

Valorile pe hârtie:
- **după T1**, freza plată lasă pe fiecare pătrat exact adaosul, 0,3 mm, peste grosimea finală;
- **creasta** bilei Ø3 la 0,5 mm între linii: 1,5 − √(1,5² − 0,25²) = 0,021 mm, greu de simțit cu degetul;
- **la treptele dintre pătrate și la pereți:** un racord cu raza bilei (1,5 mm).

**Cu lumina din spate**, cele trei pătrate trebuie să se vadă ca trei griuri distincte, de la deschis (stânga) la închis
(dreapta). O poză cu placa în fața lămpii arată cât de liniară e lumina materialului: ea alimentează lumina după material
(felia 18.1↑f-2, ADR 0321 §8).

### Rezultatul

Trimite-mi grosimile măsurate, timpii, `$$` și poza cu lumina din spate. Ele intră în teste ca transcrierea litofaniei, legată
de aceste fișiere de aur.
