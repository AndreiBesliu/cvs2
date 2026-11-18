# Fișa plăcii 11

**Ce probează:** planșele (ADR 0210, etapa 11) pe lemn, cu criteriul din prag: 25 de plăcuțe cu nume, făcute dintr-un CSV
pe un singur șablon, așezate pe rânduri, cu ce nu încape vărsat pe a doua foaie, exportate cu „Toate foile”.
- **așezarea pe rânduri** (ADR 0210 §3): din stânga-sus, marginea 10, distanța 10, în ordinea listei, fără rotire: 15
  plăcuțe pe foaia 1 (3 × 5), iar restul de 10 pe foaia 2, făcută singură ca foaia activă;
- **plăcuțele din CSV** (§4): fiecare are numele rândului ei, centrat, cu literele săpate V-carve, inclusiv cu diacritice
  (Ionuț, Ștefan); niciun text nu iese din plăcuță;
- **„Toate foile” la export** (§5): o arhivă cu programele celor două foi, câte unul pe freză, fiecare exact exportul foii
  lui singure;
- **raportul foilor** (§6): mărimea tăiată 80 × 30, foile folosite 6/11 și 4/11 (54,5 % și 36,4 %), două foi de MDF 12;
- **urechile** (ADR 0028) pe o așezare strânsă: fiecare plăcuță rămâne ținută de foaie până la capătul ramelor.

**De ce distanța 10, nu cea implicită de 5:** la 5, ramele vecine, tăiate fiecare cu 3,175 pe dinafară, scot tot lemnul
dintre plăcuțe. Urechile a două plăcuțe vecine nu stau față în față (fiecare ramă le are la un sfert și la trei sferturi din
drum), deci urechile de pe laturile dinspre vecini nu mai țin de nimic. La 5, 9 din cele 15 plăcuțe de pe foaia 1 (rândurile
2–4) și 4 din cele 10 de pe foaia 2 ar cădea sub freză, cât lucrează încă alături. La 10 rămân 10 − 2 · 3,175 = 3,65 mm
de lemn între tăieturi, iar urechile se țin de el. Ca 15 plăcuțe să încapă tot pe o foaie, foaia are 220 în loc de 200.
De la felia 11.3↑b, aplicația propune singură distanța asta pieselor cu urechi (2 × freza + 3 mm, rotunjită în sus) și
avertizează sub ea, în «Așază pe foi» și în «Din CSV…».

Dacă plăcuțele ies la cote, cu numele lor, etapa 11 e închisă și pe lemn. Rămâne 11.5↑b, programul unic pentru toate foile,
după etapa 13.

Programele sunt scrise de exportul aplicației, contractul GRBL 1.1, câte un fișier pe freză. Documentul din care vin e făcut
pe drumul ferestrei «Din CSV…»: șablonul, `nume.csv`, literele fiecărei plăcuțe, așezarea, ușa documentului
(`test/placi/placa-11/genereaza.ts`).

## Ce îți trebuie

- Două bucăți de **MDF de 12 mm**, de cel puțin **300 × 220 mm** fiecare (foaia 1 și foaia 2). Merge și o singură bucată de
  cel puțin 620 × 220 mm, cu zero-ul mutat pentru foaia 2 (vezi mai jos).
- O placă de sacrificiu sub MDF: ramele trec prin toată grosimea.
- Două freze: **V90 Ø6** (T3), pentru nume, și **freza plată Ø3,175** (T5, cea de 1/8" de la placa 3), pentru rame, cu
  tăișul de cel puțin 12 mm.
- Cleme sau șuruburi pe dreapta și jos, în lemnul liber de lângă rame (26,8 mm pe dreapta, pe o bucată de 300, și 16,8 mm
  jos; pe foaia 2, 56,8 mm), sau bandă dublu adezivă sub toată bucata. Pe stânga și sus rămân doar 6,8 mm. În colțul
  stânga-jos, nimic mai înalt de 5 mm deasupra MDF-ului: de acolo pleacă freza, la Z 5, spre prima plăcuță.
- Un șubler.

## Fișierele

| Fișierul | Foaia | Freza | Linii | SHA-256 |
|---|---|---|---:|---|
| [cncvs2-stanga-jos-foaia-1-1-T3.nc](https://raw.githubusercontent.com/AndreiBesliu/cvs2/main/test/placi/placa-11/cncvs2-stanga-jos-foaia-1-1-T3.nc) | 1 | V90 Ø6 (T3): numele | 14 660 | `d04e9de0ccbbe5c9fc84d95e8ac58ed3fe99f8cc2a8cd48710eadae9cab46a55` |
| [cncvs2-stanga-jos-foaia-1-2-T5.nc](https://raw.githubusercontent.com/AndreiBesliu/cvs2/main/test/placi/placa-11/cncvs2-stanga-jos-foaia-1-2-T5.nc) | 1 | plată Ø3,175 (T5): ramele | 762 | `17f63a0d688fab55e67581bb56c6981b7da3bb15e0da7098a2eb0da3e7099710` |
| [cncvs2-stanga-jos-foaia-2-1-T3.nc](https://raw.githubusercontent.com/AndreiBesliu/cvs2/main/test/placi/placa-11/cncvs2-stanga-jos-foaia-2-1-T3.nc) | 2 | V90 Ø6 (T3): numele | 11 516 | `5bff3383bd7af5e8d315b7c6526787778a6b9510955c5ec4b7439060ba034288` |
| [cncvs2-stanga-jos-foaia-2-2-T5.nc](https://raw.githubusercontent.com/AndreiBesliu/cvs2/main/test/placi/placa-11/cncvs2-stanga-jos-foaia-2-2-T5.nc) | 2 | plată Ø3,175 (T5): ramele | 512 | `c8bd486814c880e780826377f6c3a24c8e2b655565e6687d14bb82afc5c64e48` |

Cele patru fișiere vin din arhiva pe care o descarcă „Toate foile”,
[cncvs2-stanga-jos-foile.zip](https://raw.githubusercontent.com/AndreiBesliu/cvs2/main/test/placi/placa-11/cncvs2-stanga-jos-foile.zip)
(SHA-256 `6253e97ad41c29616ed951ace645586f85eff9cc2c0ab5867e267fad4e679111`). Numele plăcuțelor sunt în
[nume.csv](https://raw.githubusercontent.com/AndreiBesliu/cvs2/main/test/placi/placa-11/nume.csv) (UTF-8 cu BOM). După
unirea în `main`, fișierele sunt și în checkout-ul principal, în `cncvs2\test\placi\placa-11\`. Ca să verifici că fișierul de
la mașină e exact acesta, rulează în dosarul lui:

```powershell
Get-FileHash .\cncvs2-stanga-jos-foaia-1-1-T3.nc -Algorithm SHA256
```

## Cum le tai

1. Prinde prima bucată pe masă, peste placa de sacrificiu. Zero X și Y e în colțul stânga-jos al bucății, iar **Z0 e pe fața
   de sus a MDF-ului**.
2. Rulează întâi **T3**, `cncvs2-stanga-jos-foaia-1-1-T3.nc` (numele, V-carve), apoi **T5**,
   `cncvs2-stanga-jos-foaia-1-2-T5.nc` (ramele, în patru treceri de 3 mm). Între ele schimbi freza și refaci doar zero Z, pe
   fața de sus; X și Y rămân.
3. Foaia 2: la fel, pe a doua bucată, cu `cncvs2-stanga-jos-foaia-2-1-T3.nc`, apoi `cncvs2-stanga-jos-foaia-2-2-T5.nc`. Pe o
   singură bucată mare, mută zero-ul XY la colțul stânga-jos al zonei a doua, de exemplu la (320, 0).
4. Fiecare ramă are două urechi de 6 × 2 mm, una pe latura de sus, una pe cea de jos, care țin plăcuța în foaie până la
   capăt. Uită-te întâi dacă vreo plăcuță s-a mișcat, apoi scoate-le tăind urechile cu un cutter și șlefuiește-le.

Regimul e cel al plăcilor de până acum: axul la 18 000 rot/min, cu o pauză de 3 s după pornire; avansul 1 000 mm/min (pe
mișcările în pantă ale V-carve-ului și pe urechi, mai mic), plonjarea 300 mm/min; Z sigur la 5 mm.

## Timpul (ADR 0046)

Estimarea aplicației, cu modelul planificatorului GRBL 1.1h:

| Fișierul | Pe setările din fabrică ale GRBL 1.1h | Pe o mașină cu $110 = $111 = 5 000, $112 = 1 000, $120 = $121 = 500, $122 = 200 |
|---|---:|---:|
| foaia 1, T3 (numele) | 46 min | 19 min |
| foaia 1, T5 (ramele) | 39 min | 18 min |
| foaia 2, T3 (numele) | 35 min | 14 min |
| foaia 2, T5 (ramele) | 26 min | 12 min |

În total, foaia 1 cere ≈ 1 h 25 min pe setările din fabrică și ≈ 36 min pe mașina de alături, iar foaia 2, ≈ 1 h și
≈ 26 min. V-carve-ul numelor are multe segmente scurte, frânate de accelerații. **Cronometrează fiecare fișier**, de la
pornire până la oprirea axului, și trimite-mi timpii împreună cu răspunsul mașinii la `$$`.

## Ce măsori

După ce scoți plăcuțele: pe ele și pe foaia rămasă, cu găurile lor (fâșiile se prind ușor cu fălcile șublerului, prin gaură):

| Cota | Valoarea | Toleranța |
|---|---:|---:|
| plăcuța, lungimea × lățimea, departe de urechi: Ana, Carmen, Nicoleta, Paula (colțurile foii 1), Horia (mijlocul ei), Radu și Diana (foaia 2) | 80,00 × 30,00 | ±0,2 |
| în foaia rămasă, fâșia de lemn dintre două găuri vecine, pe X și pe Y | 3,65 | ±0,3 |
| fâșia din stânga primei coloane, de la latura stângă a bucății la gaură | 6,83 | ±0,5 |
| de la latura de jos a bucății la prima gaură: foaia 1 / foaia 2 | 16,83 / 56,83 | ±0,5 |
| câte plăcuțe: foaia 1 / foaia 2 | 15 / 10 | exact |
| timpul fiecărui fișier, față de estimarea pe setările mașinii tale | — | ±10 % |

Și, cu ochiul: pe foaia 1, de sus în jos și de la stânga la dreapta, **Ana, Bogdan, Carmen; Dan, Elena, Florin; Gabriela,
Horia, Ioana; Ionuț, Laura, Mihai; Nicoleta, Ovidiu, Paula**; pe foaia 2, **Radu, Sorina, Ștefan; Teodora, Tudor, Valentin;
Zoe, Alexandra, Cristian; Diana**. Fiecare nume e întreg, centrat pe plăcuța lui, cu virgula sub ț și sub Ș. Nicio plăcuță
nu s-a mișcat în timpul tăierii și niciuna nu are o tăietură pe margine.

Valorile pe hârtie: 3 · 80 + 2 · 10 = 260 ≤ 300 − 2 · 10 (a patra coloană nu încape: 350); 5 · 30 + 4 · 10 = 190 ≤ 220 − 2 · 10
(al șaselea rând nu încape: 230). Colțurile stânga-jos ale plăcuțelor: x = 10 / 100 / 190, y = 180 / 140 / 100 / 60 / 20; pe
foaia 2, Diana singură pe ultimul rând, la (10, 60). Gaura unei plăcuțe e plăcuța plus tăietura din jurul ei,
80 + 2 · 3,175 = 86,35 pe 36,35; între două găuri rămân 10 − 2 · 3,175 = 3,65; în stânga, 10 − 3,175 = 6,825; jos,
20 − 3,175 = 16,825 pe foaia 1 și 60 − 3,175 = 56,825 pe foaia 2. Foaia 1 folosește 15 · 80 · 30 / (300 · 220) = 6/11, foaia 2,
4/11, cât spune și **Raportul foilor** al aplicației.

## Ce devin măsurătorile

- **O plăcuță mai mică** cu aceeași cotă pe fiecare latură înseamnă o freză care taie mai lat (bătaia): 79,90 × 29,90 dă un
  diametru efectiv de 3,175 + 0,10 = 3,275 mm. El intră ca dată a frezei Ø3,175, ca la placa 4. Fâșia dintre găuri iese
  atunci ≈ 3,55 (10 − 3,175 − 3,275): a doua citire a aceluiași lucru.
- **Fâșiile din stânga și de jos greșite cu aceeași valoare** la toate găurile înseamnă zero-ul XY, nu aplicația.
- **Literele prea adânci sau prea puțin** pe o foaie întreagă înseamnă zero-ul Z al lui T3, nu V-carve-ul.
- **O plăcuță mișcată sau ciupită pe margine** contrazice proba urechilor: spune-mi care și pe ce latură.

## Rezultatul

Trimite-mi cotele măsurate, sau o poză cu șublerul pe fiecare, timpii și `$$`. Ele intră în teste ca transcrierea plăcii,
legată de aceste fișiere de aur (`test/unit/placa11.test.ts` cade la orice octet schimbat).

## În aplicație (opțional)

Ca să vezi drumul din care vin fișierele, pe [instanța de test](https://cncvectorstudio-test.web.app), pe o foaie de
300 × 220:
1. Desenează un dreptunghi de 80 × 30 și, înăuntrul lui, textul `{Nume}`, cu majuscula de 8 mm, aliniat la centru;
   alege-le pe amândouă și grupează-le (Ctrl+G).
2. În panou, **Din CSV…** cu `nume.csv`: coloana „Nume” se potrivește singură. Pune **Distanța dintre plăcuțe** la 10 (marginea
   rămâne 10), apoi **Fă 25 de plăcuțe**. Dă-i ramei profilul exterior cu freza Ø3,175 și două urechi, iar textului V-carve
   cu V90.
3. **Exportă G-code**, **Toate foile (2)**: arhiva are câte un program pe foaie; **Raportul foilor și lista de tăiere** arată
   80 × 30 și foile folosite.

Fișierele tale vor fi aceleași octet cu octet doar cu exact aceleași valori (locul textului, frezele, urechile, trecerile).
Cele de aur, de mai sus, sunt cele de tăiat.
