# Fișa plăcii 2

**Ce probează:** profilul complet al etapei 2, pe o piesă reală, tăiată prin foaie:
- **regiunea păstrată:** nicio intrare, ureche sau degajare nu intră în piesă (defectul care a stat ascuns 105 zile în
  ediția întâi);
- **urechile pe hârtie:** grosimea punții se măsoară de la fața de jos;
- **dog-bone-ul:** un cep de 40 × 30 intră în gaura de 40 × 30;
- **importul SVG** la scară: logoul cu lățimea declarată 80 mm.

Dacă cotele ies în toleranță, etapa 2 e aprobată.

Programul e chiar exportul aplicației: documentul plăcii trece de ușa documentului, iar G-code-ul iese din aceeași
funcție ca butonul Exportă. Logoul intră prin ușa SVG, ca la „Importă SVG…”. Fișierul trece poarta invariantelor, cu
regiunea păstrată a documentului.

## Ce îți trebuie

- O bucată de **MDF de 12 mm**, de cel puțin **300 × 200 mm**. Programul folosește colțul ei stânga-jos, cam 255 × 130 mm.
- O freză plată **Ø6**, cu tăiș în capăt.
- O placă de sacrificiu sub MDF: programul taie **exact 12 mm**, prin foaie, fără supracursă.
- Un șubler.

## Fișierul

| Fișierul | Zero XY | Linii | SHA-256 |
|---|---|---:|---|
| [placa-02.nc](https://raw.githubusercontent.com/AndreiBesliu/cvs2/main/test/placi/placa-02/placa-02.nc) | colțul **stânga-jos** al bucății | 587 | `c33a5a42b11c87f0fe6485c37a9a61504dcc395cafee7944883e2d7ded1fa302` |

Fișierul e și în Drive, în `cncvs2\test\placi\placa-02\`. Ca să verifici că fișierul de la mașină e exact acesta, rulează în
dosarul lui:

```powershell
Get-FileHash .\placa-02.nc -Algorithm SHA256
```

## Cum îl tai

1. Prinde bucata pe placa de sacrificiu. **Z0 e pe fața de sus a MDF-ului**, iar zero X și Y e în colțul stânga-jos al
   bucății.
2. Rulează fișierul cu senderul tău de azi.

Regimul e același ca la placa 1:
- axul la 18 000 rot/min, cu o pauză de 3 s după pornire;
- avansul 1 000 mm/min, plonjarea 300 mm/min;
- Z sigur la 5 mm.

Totul se taie în urcare, prin foaie, în trei treceri de 4 mm, cu intrări de R3 pe partea deșeului.

Ordinea:
1. **Gaura de 40 × 30** din mijlocul piesei, cu dog-bone în cele 4 colțuri.
2. **Găurile logoului:** cercul Ø16 și elipsa de 28 × 14.
3. **Piesa de 120 × 80** cu colțurile R10, cu 4 urechi.
4. **Cepul de 40 × 30**, cu 2 urechi.
5. **Conturul logoului**, cu 2 urechi.

Dopurile găurilor (gaura piesei, cercul și elipsa logoului) nu au urechi: se desprind la ultima trecere. Dacă vrei, prinde-le
cu bandă dublu adezivă, sau oprește-te înainte de ultima trecere și scoate-le.

## Ce măsori

| Cota | Valoarea | Toleranța |
|---|---:|---:|
| piesa, lățimea | 120,00 | ±0,2 |
| piesa, înălțimea | 80,00 | ±0,2 |
| colțul piesei, cu lera | R10 | — |
| grosimea urechii (puntea, de la fața de jos) | 2,0 | ±0,2 |
| lungimea urechii | 8,0 | ±0,5 |
| gaura piesei | 40,00 × 30,00 | ±0,2 |
| cepul intră în gaură | fără forță | — |
| logoul, lățimea | 80,00 | ±0,3 |
| urma unei intrări în piesă, în cep sau în logo | 0 | ≤ 0,1 |

Cepul și gaura au colțuri drepte: în colțurile găurii, dog-bone-ul scobește câte o adâncitură rotundă, ca un cep cu colțuri ascuțite
să intre. Fiecare ureche lasă pe marginea cepului, jos, un rest de 8 mm lungime și până la 2 mm înălțime. Taie-l sau
șlefuiește-l înainte de probă, altfel cepul nu intră din cauza lui, nu a găurii.

## Rezultatul

Trimite-mi cotele măsurate, sau o poză cu șublerul pe fiecare. Ele intră în teste ca transcrierea plăcii, legată de
acest fișier de aur.
