# Pachetul de probă pentru Mach4

Generat de CNC Vector Studio cu postul aplicației și contractul „Mach4” (ADR 0125, 0131). Contractul e scris după
documentația controlerului și nu e încă probat pe o mașină: rezultatele de aici îl fac „probat”. Fișierele sunt exact cele
de mai jos (amprentele SHA-256 la final): un fișier schimbat nu mai e proba.

## Înainte de pornire

- Versiunea controlerului (de pe ecran sau din meniul „Despre”): ____________________
- Nicio setare a controlerului nu schimbă înțelesul fișierelor.
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
| T0CITIRE.TAP | `b22f595c9c7a4891292e632ddd1090dc58e96b9fa02a410a34d60a38193696f3` |
| T1ARCE.TAP | `0e8c2ef46ead5597e2d4444a4b8854f24727222e8c0812c187da62cbafd9ca25` |
| T2AVANS.TAP | `119d9a9f0c66faa7961e0d4baa8aee18c8db015a31b6fb46e72a0c47a1721914` |
| T3ELICE.TAP | `725bf4df0cd3898cceca991a4867f172522273dfa5778274596fac59e6a36e46` |
| T4SCULA.TAP | `fa1a3de3c21eaf897b9eb2e2cbc78a76aba0f5233f3a31aaf2eb15a39f17ab02` |
| T5G54.TAP | `504e4ea5711647f818cf5212f54315a987e0bd7e6b1614062a9212ff80e6cd78` |
| T5G55.TAP | `8585f4d3b89a8bdf4db9c4abfcaadd8e740d14c51cb5d66dd18719179ff1d34a` |
