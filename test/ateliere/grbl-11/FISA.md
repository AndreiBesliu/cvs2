# Pachetul de probă pentru GRBL 1.1

Generat de CNC Vector Studio cu postul aplicației și contractul „GRBL 1.1” (ADR 0125, 0131). Contractul e scris după
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
| T0CITIRE.NC | antetul și comentariile contractului | în aer | o eroare (da / nu) și linia la care apare: nicio eroare | |
| T1ARCE.NC | arcele: modul I/J, sensul, niciun cerc fals; arcul R1200 e scris ca arc (G2), ca să probeze controlerul | pe MDF | canalul cercurilor A (2 × 180°) și B (4 × 90°): exterior Ø56,00 și interior Ø44,00 (±0,2); distanța dintre centre 100,00 (±0,2); dreptunghiul cu colțurile R5: exterior 106,00 × 66,00 (±0,2); arcul R1200: o curbă lină, bombată 0,67 mm, nu un cerc; arcul mic: o linie de 0,05 mm, nu un cerc | |
| T2AVANS.NC | avansul din fișier și unitatea pauzei G4 | în aer | linia de 200 mm: 12,0 s la F1000 și 6,0 s la F2000 (±0,5 s, cu accelerațiile); pauza de după M3: 2,0 s (±0,3), pe cronometru | |
| T3ELICE.NC | elicea (G2 / G3 cu Z), 3 spire cu pasul de 1 mm | pe MDF | gaura: adâncimea 3,0 (±0,1) în inel, diametrul 20,0 (±0,2); în mijloc rămâne un miez de Ø8 | |
| T4SCULA.NC | schimbarea sculei: oprirea în senderul aplicației | pe MDF | adâncimea celor două pătrate: diferența 0,0 (±0,1) după zero Z pe noua freză; la oprire, axul oprit și freza sus (da / nu); reluarea continuă de unde trebuie (da / nu) | |
| T5G54.NC | WCS-ul scris (G54) e respectat; ce rămâne activ după sfârșit | pe MDF | pătratul din G55 stă față de cel din G54 exact cu decalajul pus între ele pe controler (de exemplu 50,00 pe X, ±0,2); după M30, ce WCS e activ | |
| T5G55.NC | WCS-ul scris (G55) e respectat; ce rămâne activ după sfârșit | pe MDF | pătratul din G55 stă față de cel din G54 exact cu decalajul pus între ele pe controler (de exemplu 50,00 pe X, ±0,2); după M30, ce WCS e activ | |
| T6LINII.NC | limita liniei | în aer | cu alt sender: linia de 79 de caractere trece, cea de 80 dă error:11; senderul aplicației refuză fișierul la încărcare, la prima linie de peste 70 de caractere, cu numărul ei | |
| T7GAURI.NC | găurirea în pași, scrisă în G0 / G1 | pe MDF | cele 4 găuri Ø6: adâncimea 10,0 (±0,1) | |

## Ce trimiteți înapoi

Versiunea controlerului, setările de mai sus (cum erau), tabelul completat (cel mult 10 cote) și pozele erorilor.

## Amprentele fișierelor (SHA-256)

| Fișier | SHA-256 |
|---|---|
| T0CITIRE.NC | `f93add676928c037817537de1dfb38b1aa1b692bc672932be9a04b1687c44c29` |
| T1ARCE.NC | `6e327d31fd42d6be72fc4e8d3c924ed3dbb2ef1b3762a7a6ee4c5325a6558103` |
| T2AVANS.NC | `d87f3bc8d8a0cfa4080666f4f19790a0c0e4c1c1a3b3a4fefc4e51a7bbe0a165` |
| T3ELICE.NC | `fc2125046c7f1a198ea93a8ab8a7180f1c91dc0bb5cfe695a00912576bb88f95` |
| T4SCULA.NC | `b2d34456c2b09de6a5426cd628f1d433b425ae70776d52fd45f8d94e68aa21d3` |
| T5G54.NC | `55122076492c790c0790755e64d25fc9841836798d2eb74bea79a6c27008763f` |
| T5G55.NC | `a27f2b1b3aca7146b3abfd8898f6092a54b9667ab21dea78177809a09ff9b370` |
| T6LINII.NC | `956feacc517a275e0c84b45ff878b084a0388c44d3ddc745113d5dfcc90e9bf0` |
| T7GAURI.NC | `21517ddd4602b6b075a1a2bbd73394bee7c9af9e6fcdd7b7b96bcfdc8c618ca7` |
