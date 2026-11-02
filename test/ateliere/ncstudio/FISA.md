# Pachetul de probă pentru NcStudio

Generat de CNC Vector Studio cu postul aplicației și contractul „NcStudio” (ADR 0125, 0131). Contractul e scris după
documentația controlerului și nu e încă probat pe o mașină: rezultatele de aici îl fac „probat”. Fișierele sunt exact cele
de mai jos (amprentele SHA-256 la final): un fișier schimbat nu mai e proba.

## Înainte de pornire

- Versiunea controlerului (de pe ecran sau din meniul „Despre”): ____________________
- Setările de verificat pe controler: N4063 = 1; N4034 = 0; N4035 = 0.
- Materialul: MDF de rebut, cel puțin 250 × 150 × 12 mm; freza plată Ø6 (T1) și Ø3,175 (T2, doar la T4).
- Zero-ul: X0 Y0 în colțul stânga-jos al plăcii, Z0 pe fața de sus.
- **Prima rulare a fiecărui fișier, în aer:** zero Z la 20 mm deasupra materialului. Cele „pe MDF” se rulează apoi a doua
  oară, cu Z0 pe material.
- Fotografiați orice eroare: mesajul și linia la care apare.

## Fișierele

| Fișier | Ce probează | Unde | Ce se măsoară (valoarea pe hârtie) | Măsurat |
|---|---|---|---|---|
| T0AFARA.NC | antetul fără comentarii | în aer | o eroare (da / nu) și linia la care apare: nicio eroare | |
| T0BAPOS.NC | comentariul contractului (apostroful) | în aer | o eroare (da / nu) și linia la care apare: nicio eroare | |
| T0CALT.NC | stilurile alternative: ( ) și ;, câte unul pe linie | în aer | o eroare (da / nu) și linia la care apare: nicio eroare | |
| T1ARCE.NC | arcele: modul I/J, sensul, niciun cerc fals; arcul R1200 e scris ca arc (G2), ca să probeze controlerul | pe MDF | canalul cercurilor A (2 × 180°) și B (4 × 90°): exterior Ø56,00 și interior Ø44,00 (±0,2); distanța dintre centre 100,00 (±0,2); dreptunghiul cu colțurile R5: exterior 106,00 × 66,00 (±0,2); arcul R1200: o curbă lină, bombată 0,67 mm, nu un cerc; arcul mic: o linie de 0,05 mm, nu un cerc | |
| T2AVANS.NC | avansul din fișier și unitatea pauzei G4 | în aer | linia de 200 mm: 12,0 s la F1000 și 6,0 s la F2000 (±0,5 s, cu accelerațiile); pauza de după M3: 2,0 s (±0,3), pe cronometru | |
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
| T0AFARA.NC | `cd425de31d0053016fd1a978adfa27225ce48e5c76f989bf5bada0708e880e4c` |
| T0BAPOS.NC | `1fc8cdefd90827253ac6cabfc93d2f2c8440b96a774dea95e34577ca01f2cae1` |
| T0CALT.NC | `0d8d9732d447b573d2ea98f4efa9958570e77d5ca246990c613f74c85c992e82` |
| T1ARCE.NC | `7d019ed3e474a048b84b20fa502f1087b968419308724c23bf5b25b4c4645f76` |
| T2AVANS.NC | `f1ef9950591bdb9f05b26dd56bd92c36751ddd4a7dcefc8df7ec0482c47458d7` |
| T3ELICE.NC | `7cb5ca92eedaf538a90789bf713ee777977e13a72cab30ef0a94c45e03711782` |
| T4SCULA1.NC | `df41628a2fec7cb8a04055021374332a7fe02742016c3566f700ac75e53afed6` |
| T4SCULA2.NC | `30ee03ed2ccb91ceed7f04fafdb1fad7c1d7d1b2e82d3ba25059bc86e6ce3f1c` |
| T5G54.NC | `5ba9ce3ce2306234e3f4d506702f45a17263a608c8aa512fc3dfe5f1fe143288` |
| T5G55.NC | `ce3bcced080a30fa8cde5e83d20d0bb4c8ffeeba95554566431cbed21313a44f` |
