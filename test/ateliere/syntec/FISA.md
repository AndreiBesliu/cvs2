# Pachetul de probă pentru Syntec

Generat de CNC Vector Studio cu postul aplicației și contractul „Syntec” (ADR 0125, 0131). Contractul e scris după
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
| T0CITIRE.NC | antetul (%, O0001, G71) și comentariile ( ) | în aer | o eroare (da / nu) și linia la care apare: nicio eroare | |
| T0CALT.NC | comentariul // al exemplelor din manual | în aer | o eroare (da / nu) și linia la care apare: nicio eroare | |
| T1ARCE.NC | arcele: modul I/J, sensul, niciun cerc fals; arcul R1200 e scris ca arc (G2), ca să probeze controlerul | pe MDF | canalul cercurilor A (2 × 180°) și B (4 × 90°): exterior Ø56,00 și interior Ø44,00 (±0,2); distanța dintre centre 100,00 (±0,2); dreptunghiul cu colțurile R5: exterior 106,00 × 66,00 (±0,2); arcul R1200: o curbă lină, bombată 0,67 mm, nu un cerc; arcul mic: o linie de 0,05 mm, nu un cerc | |
| T2AVANS.NC | avansul din fișier și unitatea pauzei G4 | în aer | linia de 200 mm: 12,0 s la F1000 și 6,0 s la F2000 (±0,5 s, cu accelerațiile); pauza de după M3: 2,0 s (±0,3), pe cronometru; la oprirea M0, X arată 0,010; după pornire, linia are 10,00 mm | |
| T3ELICE.NC | elicea (G2 / G3 cu Z), 3 spire cu pasul de 1 mm | pe MDF | gaura: adâncimea 3,0 (±0,1) în inel, diametrul 20,0 (±0,2); în mijloc rămâne un miez de Ø8 | |
| T4SCULA.NC | schimbarea sculei: M6 la controler | pe MDF | adâncimea celor două pătrate: diferența 0,0 (±0,1) după zero Z pe noua freză; la oprire, axul oprit și freza sus (da / nu); reluarea continuă de unde trebuie (da / nu) | |
| T5G54.NC | WCS-ul scris (G54) e respectat; ce rămâne activ după sfârșit | pe MDF | pătratul din G55 stă față de cel din G54 exact cu decalajul pus între ele pe controler (de exemplu 50,00 pe X, ±0,2); după M30, ce WCS e activ | |
| T5G55.NC | WCS-ul scris (G55) e respectat; ce rămâne activ după sfârșit | pe MDF | pătratul din G55 stă față de cel din G54 exact cu decalajul pus între ele pe controler (de exemplu 50,00 pe X, ±0,2); după M30, ce WCS e activ | |

## Ce trimiteți înapoi

Versiunea controlerului, setările de mai sus (cum erau), tabelul completat (cel mult 10 cote) și pozele erorilor.

## Amprentele fișierelor (SHA-256)

| Fișier | SHA-256 |
|---|---|
| T0CITIRE.NC | `bf64d95eb2a840f9ffe45aca1439a6c862cf491968c8007dbdbbd48f6c15e615` |
| T0CALT.NC | `16f2756116b5114f7b8ee8905894023070b51976cf07a343189981fdae9e808d` |
| T1ARCE.NC | `10c227d531947b3e1f65a66c6ede8b9169e1997201cab7b61f50596b04007e58` |
| T2AVANS.NC | `ccc163cb5376f0ff6a2233567783257da6cb433aad747c7d51ce88b568fc7c54` |
| T3ELICE.NC | `4439c10a21744eb1ab14f564069a00bf52517f81effc965744e889316194d05b` |
| T4SCULA.NC | `9d820c0683b857afdc52c419f78bdd2edadd0bbaef119cc1234d3b0b90958350` |
| T5G54.NC | `e75a603f2e7b72dd4ac9635762c05eb325dbe9f7befb391ebdd22920e87215fd` |
| T5G55.NC | `50bc5a0c0875d5b11e1ae695286d3d74ffb0db4f48d3880c9f50108a46d0a7aa` |
