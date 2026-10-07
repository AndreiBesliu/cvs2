# Fișa plăcii 1

**Ce probează:** colțul de origine (matricea montajului), sensul arcelor și oracolul G-code. Dacă cotele ies în
toleranță, partea de G-code a etapei 1 e aprobată.

Programele au ieșit din codul aplicației noi: geometria, profilul, postul GRBL. Au trecut poarta invariantelor 1, 3,
5, 6, 7 și 8. Desenul lor în aplicație vine cu documentul și pânza (feliile 1.7–1.8). G-code-ul nu depinde de ele, așa
că placa se poate tăia de acum.

## Ce îți trebuie

- O bucată de MDF de 18 mm, de cel puțin **300 × 200 mm**: A și B se taie în colțuri opuse și nu se suprapun. Merg și
  două bucăți de cel puțin 160 × 120.
- O freză plată Ø6, cu tăiș în capăt.
- Un șubler, pentru adâncimi tija lui sau un șubler de adâncime.

## Fișierele

| Fișierul | Zero XY | Linii | SHA-256 |
|---|---|---:|---|
| [placa-01-A.nc](https://raw.githubusercontent.com/AndreiBesliu/cvs2/main/test/placi/placa-01/placa-01-A.nc) | colțul **stânga-jos** al bucății | 34 | `edcb9c4e2a2aa2ff78761052f0776cacec367d862e9cee2646aab061d1b5a541` |
| [placa-01-B.nc](https://raw.githubusercontent.com/AndreiBesliu/cvs2/main/test/placi/placa-01/placa-01-B.nc) | colțul **dreapta-sus** al bucății | 34 | `dc4cc988b45c9807a0ffdd6264bb9a6b06d48de1b0525438c8b4384b0eece51e` |

Sunt și în Drive, în `cncvs2\test\placi\placa-01\`. Ca să verifici că fișierul de pe calculatorul de la mașină e exact
acesta, deschide PowerShell în dosarul lui și rulează:

```powershell
Get-FileHash .\placa-01-A.nc -Algorithm SHA256
```

Hash-ul trebuie să fie cel din tabel.

## Cum le tai

1. Prinde bucata pe masă. În ambele fișiere, **Z0 e pe fața de sus a MDF-ului**.
2. **Fișierul A:** zero X și Y exact în colțul stânga-jos al bucății, adică pe marginea stângă și pe cea de jos. Rulează-l
   cu senderul tău de azi.
3. **Fișierul B:** zero X și Y în colțul dreapta-sus al bucății. Rulează-l.

Regimul din fișiere:
- axul la 18 000 rot/min, cu o pauză de 3 s după pornire;
- avansul 1 000 mm/min, plonjarea 300 mm/min;
- Z sigur: 5 mm deasupra plăcii.

Dacă mașina ta cere alt regim, spune-mi și regenerez fișierele. Programul nu are `M6`: e o singură sculă.

Ce face fiecare fișier:
1. **Gaura:** un șanț circular de 8 mm adâncime, în două treceri de 4. În mijloc rămâne un dop Ø18.
2. **Insula:** un șanț de 3 mm în jurul unui dreptunghi de 100 × 60, într-o trecere.

## Ce măsori, la fiecare fișier

| Cota | Valoarea | Toleranța |
|---|---:|---:|
| insula, lățimea | 100,00 | ±0,2 |
| insula, înălțimea | 60,00 | ±0,2 |
| gaura: diametrul exterior al șanțului circular, pe două direcții perpendiculare | 30,00 | ±0,2 |
| A: de la marginea stângă a bucății până la insulă | 20,00 | ±0,3 |
| A: de la marginea de jos până la insulă | 20,00 | ±0,3 |
| B: de la marginea dreaptă până la insulă | 20,00 | ±0,3 |
| B: de la marginea de sus până la insulă | 20,00 | ±0,3 |
| adâncimea șanțului din jurul insulei | 3,00 | ±0,1 |
| adâncimea șanțului circular | 8,00 | ±0,1 |

## Rezultatul

Trimite-mi cotele măsurate, sau o poză cu șublerul pe fiecare. Ele intră în teste ca transcrierea plăcii: prima felie a
etapei 2 le leagă de aceste fișiere de aur.
