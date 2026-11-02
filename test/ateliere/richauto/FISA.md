# Pachetul de probă pentru RichAuto

Generat de CNC Vector Studio cu postul aplicației și contractul „RichAuto” (ADR 0125, 0131). Contractul e scris după
documentația controlerului și nu e încă probat pe o mașină: rezultatele de aici îl fac „probat”. Fișierele sunt exact cele
de mai jos (amprentele SHA-256 la final): un fișier schimbat nu mai e proba.

## Înainte de pornire

- Versiunea controlerului (de pe ecran sau din meniul „Despre”): ____________________
- Setările de verificat pe controler: F Read = Read; AbsCntr = Off; Spindle delay >= 3000 ms.
- Materialul: MDF de rebut, cel puțin 250 × 150 × 12 mm; freza plată Ø6 (T1) și Ø3,175 (T2, doar la T4).
- Zero-ul: X0 Y0 în colțul stânga-jos al plăcii, Z0 pe fața de sus.
- **Prima rulare a fiecărui fișier, în aer:** zero Z la 20 mm deasupra materialului. Cele „pe MDF” se rulează apoi a doua
  oară, cu Z0 pe material.
- Fotografiați orice eroare: mesajul și linia la care apare.

## Fișierele

| Fișier | Ce probează | Unde | Ce se măsoară (valoarea pe hârtie) | Măsurat |
|---|---|---|---|---|
| T0AFARA.NC | antetul contractului, fără comentarii | în aer | o eroare (da / nu) și linia la care apare: nicio eroare | |
| T0BPAR.NC | comentariile ( ) | în aer | o eroare (da / nu) și linia la care apare: nicio eroare | |
| T0CALT.NC | stilurile alternative: ;, apostroful și //, câte unul pe linie | în aer | o eroare (da / nu) și linia la care apare: nicio eroare | |
| T0DANTET.NC | antetul maxim: G17, G21, G94, G40, G49, G80 și G54 | în aer | o eroare (da / nu) și linia la care apare: nicio eroare | |
| T1ARCE.NC | arcele: modul I/J, sensul, niciun cerc fals; arcul R1200 e scris ca arc (G2), ca să probeze controlerul | pe MDF | canalul cercurilor A (2 × 180°) și B (4 × 90°): exterior Ø56,00 și interior Ø44,00 (±0,2); distanța dintre centre 100,00 (±0,2); dreptunghiul cu colțurile R5: exterior 106,00 × 66,00 (±0,2); arcul R1200: o curbă lină, bombată 0,67 mm, nu un cerc; arcul mic: o linie de 0,05 mm, nu un cerc | |
| T2AVANS.NC | avansul din fișier; așteptarea axului e a controlerului | în aer | linia de 200 mm: 12,0 s la F1000 și 6,0 s la F2000 (±0,5 s, cu accelerațiile); după M3, controlerul așteaptă cât spune setarea lui (Spindle delay): pe cronometru, aceeași valoare (±0,3 s) | |
| T3ELICE.NC | elicea (G2 / G3 cu Z), 3 spire cu pasul de 1 mm | pe MDF | gaura: adâncimea 3,0 (±0,1) în inel, diametrul 20,0 (±0,2); în mijloc rămâne un miez de Ø8 | |
| T4SCULA1.NC | schimbarea sculei: un fișier pe freză | pe MDF | adâncimea celor două pătrate: diferența 0,0 (±0,1) după zero Z pe noua freză; la oprire, axul oprit și freza sus (da / nu); reluarea continuă de unde trebuie (da / nu) | |
| T4SCULA2.NC | schimbarea sculei: un fișier pe freză | pe MDF | adâncimea celor două pătrate: diferența 0,0 (±0,1) după zero Z pe noua freză; la oprire, axul oprit și freza sus (da / nu); reluarea continuă de unde trebuie (da / nu) | |
| T5G54.NC | WCS-ul scris (G54) e respectat; ce rămâne activ după sfârșit | pe MDF | pătratul din G55 stă față de cel din G54 exact cu decalajul pus între ele pe controler (de exemplu 50,00 pe X, ±0,2); după M30, ce WCS e activ | |
| T5G55.NC | WCS-ul scris (G55) e respectat; ce rămâne activ după sfârșit | pe MDF | pătratul din G55 stă față de cel din G54 exact cu decalajul pus între ele pe controler (de exemplu 50,00 pe X, ±0,2); după M30, ce WCS e activ | |

## Ce trimiteți înapoi

Versiunea controlerului, setările de mai sus (cum erau), tabelul completat (cel mult 10 cote) și pozele erorilor.

## Amprentele fișierelor (SHA-256)

| Fișier | SHA-256 |
|---|---|
| T0AFARA.NC | `93584aa1b1c535e17321769121c6f1e093a3ffa3e17d733f54dd9512aceba534` |
| T0BPAR.NC | `91d2092072a8f8bfcf08de234ba3c6f0b6977039b8844d774d598c6c36d0d421` |
| T0CALT.NC | `2299dff2d8cfeb145c4d76f01cb33de9c1375c760923f40a4d4b87ba13d4a53e` |
| T0DANTET.NC | `b8dbad9edba22b904977e32c9b519198436d0eb1cd47a07e81d6c263f4aed9bb` |
| T1ARCE.NC | `855424b54e61ee46648522263a632db0da613231427e55f3a40a8487bd53b993` |
| T2AVANS.NC | `e248c2c773fda381e4825c0899d072c52d6cc8892c32c8e23e64c71a66293f33` |
| T3ELICE.NC | `af8c065427a426c9dca2bc21da683e1acd54a277d1e14931bea6bd20b7566273` |
| T4SCULA1.NC | `b20b793b4ba02a77fc7c02a8bbe0efe7ee5c2de080c6c898bbdc622392d9dd86` |
| T4SCULA2.NC | `73d7b290dd08e1e0fd8bf759f71dd251c4a1a2dd5e53b3e1ab2cae101336882d` |
| T5G54.NC | `4a0c166da5a9833d62f5e79267fc679db90cc493f090e49bf0c6d0fa05f6cc15` |
| T5G55.NC | `cc7d52e961574a75747a2fbb4afb263235ae2bfeebb61a18fa2e35c6812cb24c` |
