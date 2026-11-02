# Pachetul de probă pentru FluidNC

Generat de CNC Vector Studio cu postul aplicației și contractul „FluidNC” (ADR 0125, 0131). Contractul e scris după
documentația controlerului și nu e încă probat pe o mașină: rezultatele de aici îl fac „probat”. Fișierele sunt exact cele
de mai jos (amprentele SHA-256 la final): un fișier schimbat nu mai e proba.

## Înainte de pornire

- Versiunea controlerului (de pe ecran sau din meniul „Despre”): ____________________
- Setările de verificat pe controler: ATC sau m6_macro declarat (altfel M6 trece fără pauză).
- Materialul: MDF de rebut, cel puțin 250 × 150 × 12 mm; freza plată Ø6 (T1) și Ø3,175 (T2, doar la T4).
- Zero-ul: X0 Y0 în colțul stânga-jos al plăcii, Z0 pe fața de sus.
- **Prima rulare a fiecărui fișier, în aer:** zero Z la 20 mm deasupra materialului. Cele „pe MDF” se rulează apoi a doua
  oară, cu Z0 pe material.
- Fotografiați orice eroare: mesajul și linia la care apare.

## Fișierele

| Fișier | Ce probează | Unde | Ce se măsoară (valoarea pe hârtie) | Măsurat |
|---|---|---|---|---|
| T0CITIRE.NC | antetul și comentariile contractului | în aer | o eroare (da / nu) și linia la care apare: nicio eroare | |
| T1ARCE.NC | arcele: modul I/J, sensul, niciun cerc fals; arcul R1200 e scris ca arc (G2), ca să probeze controlerul | pe MDF | canalul cercurilor A (2 × 180°) și B (4 × 90°): exterior Ø56,00 și interior Ø44,00 (±0,2); distanța dintre centre 100,00 (±0,2); dreptunghiul cu colțurile R5: exterior 106,00 × 66,00 (±0,2); arcul R1200: o curbă lină, bombată 0,67 mm, nu un cerc; arcul mic: o linie de 0,05 mm, nu un cerc | |
| T2AVANS.NC | avansul din fișier și unitatea pauzei G4 | în aer | linia de 200 mm: 12,0 s la F1000 și 6,0 s la F2000 (±0,5 s, cu accelerațiile); pauza de după M3: 2,0 s (±0,3), pe cronometru | |
| T4SCULA.NC | schimbarea sculei: M6 la controler | pe MDF | adâncimea celor două pătrate: diferența 0,0 (±0,1) după zero Z pe noua freză; la oprire, axul oprit și freza sus (da / nu); reluarea continuă de unde trebuie (da / nu) | |

## Ce trimiteți înapoi

Versiunea controlerului, setările de mai sus (cum erau), tabelul completat (cel mult 10 cote) și pozele erorilor.

## Amprentele fișierelor (SHA-256)

| Fișier | SHA-256 |
|---|---|
| T0CITIRE.NC | `c16ae1c48bc66519fbdc33c7c85df2139c4672c69c4fbc9f3f1efeec996f525a` |
| T1ARCE.NC | `8672e158d51507654d181bf60e9f76e45b59cd86facf4cd5f830956b9d8c5fe9` |
| T2AVANS.NC | `22dff02eb36684aa0fea820ec3ea515daff90a885e5ceeca7093232ef38092bd` |
| T4SCULA.NC | `892dda4c66793247d1fe4ba6d4c36a65e227cb80d267e4ecc3d81f64f930ebbc` |
