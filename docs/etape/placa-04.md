# Fișa plăcii 4

**Ce probează:** calibrarea pe lemn (`PLAN.md` §4.6, punctul 6) și simularea etapei 4, pe șanțurile de calibrare din sonda
s4 (§5.13): freza plată, bila, V90, V60, arcul și plonjarea, plus timpul estimat.
- **simularea:** fiecare cotă de mai jos e prezisă de oracolul independent al simulării (`test/unit/placa04.test.ts`); placa
  arată dacă lemnul spune același lucru;
- **sculele reale:** lățimile măsurate dau diametrul efectiv al frezei plate, raza bilei și vârful teșit al frezelor V. Ele
  intră ca date ale sculelor, citite și de CAM, și de oracol;
- **timpul:** cronometrul față de estimarea aplicației (ADR 0046), cu ±10 %.

Dacă cotele ies în toleranță, etapa 4 e închisă și pe lemn: simularea 3D, timpul estimat și calculul pe mai multe fire.

Programele sunt scrise de postul aplicației, contractul GRBL 1.1, câte unul pe freză. Bila nu e încă o formă de freză a
documentului (acolo, freza e plată sau V), deci programele se scriu direct din IR, ca pachetul de atelier (ADR 0131).

## Ce îți trebuie

- O bucată de **MDF de 18 mm**, de cel puțin **200 × 120 mm**. Programele folosesc colțul ei stânga-jos, cam 175 × 105 mm.
- Patru freze, toate cu Ø6 la partea tăietoare: **plată** (T1), **bilă** (T2), **V90** (T3) și **V60** (T4).
- Un șubler. Pentru șanțurile înguste (bila și V-urile), o lupă sau o riglă cu zecimi ajută.

## Fișierele

| Fișierul | Freza | Linii | SHA-256 |
|---|---|---:|---|
| [placa-04-T1.nc](https://raw.githubusercontent.com/AndreiBesliu/cvs2/main/test/placi/placa-04/placa-04-T1.nc) | plată Ø6 | 27 | `36788dc3519e38eda7fbbf34f4d8e886ee2ab2cfd77639218ec1c7a250d12281` |
| [placa-04-T2.nc](https://raw.githubusercontent.com/AndreiBesliu/cvs2/main/test/placi/placa-04/placa-04-T2.nc) | bilă Ø6 | 17 | `1251033105413cfc3affb61e00bd4aa31da56b32c1448aa987dd9f5e3baa99d3` |
| [placa-04-T3.nc](https://raw.githubusercontent.com/AndreiBesliu/cvs2/main/test/placi/placa-04/placa-04-T3.nc) | V90 | 17 | `a956e08842f631522f0b50bfcc4308510d8cf703f372deff34b58a5e52123d47` |
| [placa-04-T4.nc](https://raw.githubusercontent.com/AndreiBesliu/cvs2/main/test/placi/placa-04/placa-04-T4.nc) | V60 | 17 | `f291af254e0f7c7e0d51c72080cd511311c7688dd5714b2110d2d9e0b405ad2b` |

Fișierele sunt și în Drive, în `cncvs2\test\placi\placa-04\`. Ca să verifici că fișierul de la mașină e exact acesta, rulează
în dosarul lui:

```powershell
Get-FileHash .\placa-04-T1.nc -Algorithm SHA256
```

## Cum le tai

1. Prinde bucata pe masă. Zero X și Y e în colțul stânga-jos al bucății, iar **Z0 e pe fața de sus a MDF-ului**.
2. Rulează fișierele în ordine, T1, T2, T3, T4. Între ele schimbi freza și **refaci doar zero Z**, pe fața de sus, cu freza
   nouă; X și Y rămân.

Regimul e același ca la plăcile 1 și 2: axul la 18 000 rot/min, cu o pauză de 3 s după pornire; avansul 1 000 mm/min,
plonjarea 300 mm/min; Z sigur la 5 mm.

Ce taie fiecare:
1. **T1, freza plată Ø6:** un șanț drept de 60 mm (x 20–80, y 100) la 3 mm adâncime; canalul unui cerc cu raza 25 (centrul
   la x 140, y 70), la 1 mm, în sens trigonometric (G3); o plonjare dreaptă la 5 mm (x 20, y 15).
2. **T2, bila Ø6:** un șanț drept de 60 mm (y 80), cu vârful bilei la 2 mm.
3. **T3, V90:** un șanț drept de 60 mm (y 60), cu vârful la 2 mm.
4. **T4, V60:** un șanț drept de 60 mm (y 40), cu vârful la 2 mm.

## Timpul (ADR 0046)

Estimarea aplicației, cu modelul planificatorului GRBL 1.1h, pe fiecare fișier:

| Fișierul | Pe setările din fabrică ale GRBL 1.1h | Pe o mașină cu $110 = $111 = 5 000, $112 = 1 000, $120 = $121 = 500, $122 = 200 |
|---|---:|---:|
| placa-04-T1.nc | 1 min 23 s | 27 s |
| placa-04-T2.nc | 26 s | 10 s |
| placa-04-T3.nc | 24 s | 10 s |
| placa-04-T4.nc | 21 s | 10 s |

Pe mașina ta, timpul depinde de setările ei. **Cronometrează fiecare fișier**, de la pornire până la oprirea axului, și
trimite-mi timpii împreună cu răspunsul mașinii la `$$`. Comparația cu estimarea, cu toleranța ±10 %, intră în teste odată
cu cotele.

## Ce măsori

| Cota | Valoarea | Toleranța |
|---|---:|---:|
| șanțul plat (T1), lățimea | 6,00 | ±0,1 |
| șanțul plat (T1), adâncimea | 3,00 | ±0,1 |
| canalul cercului (T1), diametrul exterior | 56,00 | ±0,2 |
| canalul cercului (T1), diametrul interior | 44,00 | ±0,2 |
| plonjarea (T1), diametrul | 6,00 | ±0,1 |
| plonjarea (T1), adâncimea | 5,00 | ±0,1 |
| șanțul cu bilă (T2), lățimea la suprafață | 5,657 | ±0,15 |
| șanțul V90 (T3), lățimea la suprafață | 4,000 | ±0,15 |
| șanțul V60 (T4), lățimea la suprafață | 2,309 | ±0,15 |
| timpul fiecărui fișier, față de estimarea pe setările mașinii tale | — | ±10 % |

Valorile pe hârtie: bila Ø6 la 2 mm adâncime taie la suprafață 2·√(3² − 1²) = 5,657 mm; un V la adâncimea d taie
2·d·tan(unghi / 2), adică 4,000 mm la V90 și 2,309 mm la V60.

## Ce devin măsurătorile (calibrarea)

- **Lățimea șanțului plat** e diametrul efectiv al frezei Ø6, cu bătaia ei: 6,08 înseamnă o freză care taie cu 0,08 mm mai
  lat.
- **Lățimea șanțului cu bilă** dă raza efectivă a bilei.
- **Lățimea unui șanț V** mai mare decât pe hârtie înseamnă un vârf teșit: lățimea vârfului e lățimea măsurată minus
  2·2·tan(unghi / 2). Ea intră în freză ca vârful ei plat (`scula.forma.varf`, ADR 0092).
- **O adâncime greșită** pe toate șanțurile unei freze înseamnă zero-ul Z, nu freza.

Valorile intră ca date ale sculelor: CAM-ul și oracolul simulării le citesc de acolo, nu din cod.

## Rezultatul

Trimite-mi cotele măsurate, sau o poză cu șublerul pe fiecare, timpii și `$$`. Ele intră în teste ca transcrierea plăcii,
legată de aceste fișiere de aur.

## Placa de regresie (definită aici, `PLAN.md` §5.3, punctul 9)

**Ce e** (`PLAN.md`: glosarul, rândul 25, și §4.6, punctul 8): o placă fixă, cu trăsăturile canonice ale etapelor
trecute. Se definește în etapa 4, după calibrare (placa 4), și se retaie în tampoane (săptămânile 11, 22 și 31) și în
etapele fără funcții noi de mașină.

**De ce:** o schimbare în post, în CAM sau în sender care strică o trăsătură veche se vede atunci pe lemn, nu doar în teste.
Testele prind ce știu să întrebe; placa prinde ce arată lemnul.

### Ce are

Placa nu are un program nou. E făcută din fișierele de aur care există deja, fiecare cu cotele lui pe hârtie:

| Trăsătura | Fișierul de aur | Ce probează | Cotele (toleranța) |
|---|---|---|---|
| insula 100 × 60 cu gaura Ø30 | `test/placi/placa-01/placa-01-A.nc` (placa 1) | originea, sensul arcelor, profilul pe dinafară și pe dinăuntru | cele din fișa plăcii 1 |
| piesa 120 × 80 cu urechi, gaura 40 × 30 cu dog-bone, cepul, logoul | `test/placi/placa-02/placa-02.nc` (placa 2) | regiunea păstrată, urechile, intrările, degajările, importul SVG | cele din fișa plăcii 2 |
| cercurile Ø50 (2 × 180° și 4 × 90°), dreptunghiul cu R5 | `test/ateliere/grbl-11/T1ARCE.NC` (placa 3) | arcele, niciun cerc fals | Ø56,00 / Ø44,00, centrele la 100,00 (±0,2) |
| gaura elicoidală Ø20 | `test/ateliere/grbl-11/T3ELICE.NC` (placa 3) | elicea | adâncimea 3,0 (±0,1), Ø20,0 (±0,2) |
| pătratele cu Ø6 și Ø3,175 | `test/ateliere/grbl-11/T4SCULA.NC` (placa 3) | schimbarea sculei prin bariera senderului | diferența de adâncime 0,0 (±0,1) |
| cele 4 găuri în pași | `test/ateliere/grbl-11/T7GAURI.NC` (placa 3) | găurirea ciocănită | 10,0 (±0,1) |
| șanțurile de calibrare, arcul, plonjarea | `test/placi/placa-04/placa-04-T1.nc` … `T4.nc` (placa 4) | sculele, simularea, timpul | cele din fișa plăcii 4 |

### Cum se taie

- Pe o bucată de MDF de 18 mm, de cel puțin 600 × 400 mm, fiecare fișier în zona lui. Zero-ul XY se mută la colțul
  stânga-jos al zonei, înaintea fiecărui fișier:

  | Zona | Fișierul | Zero-ul XY pe bucată (mm) |
  |---|---|---|
  | 1 | placa 1 A | (0, 0) |
  | 2 | placa 2 | (150, 0) |
  | 3 | T1 | (0, 150) |
  | 4 | T3, T4, T7 | (250, 150), apoi la fel pentru fiecare |
  | 5 | placa 4, T1 … T4 | (400, 0) |

- Z0 e mereu pe fața de sus; după fiecare schimbare de freză se reface doar zero Z.
- Prima tăiere vine în tamponul T1 (săptămâna 11), după plăcile 1–4. Fiecare retăiere folosește aceleași fișiere, cu
  aceleași amprente.

### Când se schimbă

Fișierele de aur se schimbă doar printr-o felie care spune de ce, cu probele lor: `placa01.test.ts`, `placa02.test.ts`,
`ateliere.aur.test.ts` și `placa04.test.ts` cad la orice octet schimbat. Atunci placa de regresie primește fișierul nou, cu
amprenta lui, iar schimbarea se notează aici.

### Rezultatul

La fiecare retăiere, cotele se compară cu cele ale plăcii din care vine trăsătura. O cotă în afara toleranței deschide un
defect de gravitate „mașină” (`PLAN.md` §4.8).
