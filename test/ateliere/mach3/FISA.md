# Pachetul de probă pentru Mach3

Generat de CNC Vector Studio cu postul aplicației și contractul „Mach3” (ADR 0125, 0131). Contractul e scris după
documentația controlerului și nu e încă probat pe o mașină: rezultatele de aici îl fac „probat”. Fișierele sunt exact cele
de mai jos (amprentele SHA-256 la final): un fișier schimbat nu mai e proba.

## Înainte de pornire

- Versiunea controlerului (de pe ecran sau din meniul „Despre”): ____________________
- Setările de verificat pe controler: G04 Dwell param in Milliseconds = off; Tool Change = Stop Spindle. Wait for Cycle Start.
- Materialul: MDF de rebut, cel puțin 250 × 150 × 12 mm; freza plată Ø6 (T1) și Ø3,175 (T2, doar la T4).
- Zero-ul: X0 Y0 în colțul stânga-jos al plăcii, Z0 pe fața de sus.
- **Prima rulare a fiecărui fișier, în aer:** zero Z la 20 mm deasupra materialului. Cele „pe MDF” se rulează apoi a doua
  oară, cu Z0 pe material.
- Fotografiați orice eroare: mesajul și linia la care apare.

## Fișierele

| Fișier | Ce probează | Unde | Ce se măsoară (valoarea pe hârtie) | Măsurat |
|---|---|---|---|---|
| T0CITIRE.TAP | antetul și comentariile contractului | în aer | o eroare (da / nu) și linia la care apare: nicio eroare | |
| T1ARCE.TAP | arcele: modul I/J, sensul, niciun cerc fals; arcul R1200 e scris ca arc (G2), ca să probeze controlerul | pe MDF | canalul cercurilor A (2 × 180°) și B (4 × 90°): exterior Ø56,00 și interior Ø44,00 (±0,2); distanța dintre centre 100,00 (±0,2); dreptunghiul cu colțurile R5: exterior 106,00 × 66,00 (±0,2); arcul R1200: o curbă lină, bombată 0,67 mm, nu un cerc; arcul mic: o linie de 0,05 mm, nu un cerc | |
| T2AVANS.TAP | avansul din fișier și unitatea pauzei G4 | în aer | linia de 200 mm: 12,0 s la F1000 și 6,0 s la F2000 (±0,5 s, cu accelerațiile); pauza de după M3: 2,0 s (±0,3), pe cronometru | |
| T3ELICE.TAP | elicea (G2 / G3 cu Z), 3 spire cu pasul de 1 mm | pe MDF | gaura: adâncimea 3,0 (±0,1) în inel, diametrul 20,0 (±0,2); în mijloc rămâne un miez de Ø8 | |
| T4SCULA.TAP | schimbarea sculei: M6 la controler | pe MDF | adâncimea celor două pătrate: diferența 0,0 (±0,1) după zero Z pe noua freză; la oprire, axul oprit și freza sus (da / nu); reluarea continuă de unde trebuie (da / nu) | |
| T5G54.TAP | WCS-ul scris (G54) e respectat; ce rămâne activ după sfârșit | pe MDF | pătratul din G55 stă față de cel din G54 exact cu decalajul pus între ele pe controler (de exemplu 50,00 pe X, ±0,2); după M30, ce WCS e activ | |
| T5G55.TAP | WCS-ul scris (G55) e respectat; ce rămâne activ după sfârșit | pe MDF | pătratul din G55 stă față de cel din G54 exact cu decalajul pus între ele pe controler (de exemplu 50,00 pe X, ±0,2); după M30, ce WCS e activ | |

## Ce trimiteți înapoi

Versiunea controlerului, setările de mai sus (cum erau), tabelul completat (cel mult 10 cote) și pozele erorilor.

## Amprentele fișierelor (SHA-256)

| Fișier | SHA-256 |
|---|---|
| T0CITIRE.TAP | `a9382851c5fba4f6569b765cadbb4b69835bf1c8bf3a83e5a517b12542947718` |
| T1ARCE.TAP | `52c036fbc94b3b1ac7ece33ee8a1018a711d79977398504fff9ec0aefe146c04` |
| T2AVANS.TAP | `819836d87be9d827f0ee30eed659d93bcce2fe2bf84edf4e8e824e325c0199f8` |
| T3ELICE.TAP | `9c1cabd4ef19edf85539553e5aee66769437fcb73fe069d89585e23aaf81841c` |
| T4SCULA.TAP | `66ca0a51a44a750ac6bea9e830dd113a9639a79971fdad71b09ad3c1a1e10d99` |
| T5G54.TAP | `9b0cc433ccab6b26d3114246573a76a7e744f4f23362c2fa8feffc38113232fd` |
| T5G55.TAP | `6b3b34e6e898293cca6efd2b08d32bf468bd11f294ca0b5fcc4f475ecb57b3d6` |
