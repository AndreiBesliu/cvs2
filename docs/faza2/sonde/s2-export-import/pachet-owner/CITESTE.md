# Pachetul de probă pentru export (sonda s2)

Cinci fișiere cu **același desen**, scrise de prototipul de export. Le deschizi în programele tale și bifezi ce vezi.
Durează cam 20–30 de minute. Nu e nevoie să le încerci pe toate în toate programele: prioritatea e ArtCAM și
Aspire/VCarve, apoi ce mai ai la îndemână.

## Ce e în desen (valorile pe hârtie)

Pagina are 400 × 300 mm. Coordonatele sunt în mm, cu originea în colțul din stânga-jos.

| Ce | Unde | Cât trebuie să măsoare | Strat |
|---|---|---|---|
| Cerc Ø100 | centrul la (70; 227) | diametrul **100,00** | DECUPARE |
| Dreptunghi rotunjit 200 × 100, colțuri R10, rotit 30° | centrul la (270; 200) | caseta **215,88 × 179,28**; colțurile rămân rotunde | DECUPARE |
| Elipsă 120 × 60, rotită 20° | centrul la (75; 95) | axele **120** și **60** | DECUPARE |
| Curba S (o singură curbă Bézier) | de la (160; 60) la (310; 60) | înălțimea totală **34,64** (de la 42,68 la 77,32) | GRAVARE |
| Textul „CNC 20 mm”, transformat în curbe | linia de bază la y = 15 | litera **N are exact 20,00** înălțime (de la y 15 la y 35) | GRAVARE |

**De ce N și nu C:** „text de 20 mm” înseamnă acum înălțimea majusculei. Literele drepte (H, N) au exact 20 mm.
Literele rotunde (C, O) depășesc puțin în sus și în jos, cum se desenează orice font: C are ~20,6 mm.

## Fișierele

| Fișier | Ce conține | Cercul e scris ca |
|---|---|---|
| `CNC-referinta-R2007.dxf` | DXF „exact”: cerc, elipsă, curbe Bézier ca SPLINE, dreptunghiul ca polilinie cu arce | o entitate CIRCLE |
| `CNC-referinta-R12.dxf` | DXF „compatibil” (formatul vechi R12): doar linii și arce. Elipsa, curba S și literele sunt **arce**, cu abaterea de cel mult 0,001 mm | o entitate CIRCLE |
| `CNC-referinta.svg` | SVG la scară 1:1 în mm, cu straturi Inkscape | un element `circle` |
| `CNC-referinta.pdf` | PDF vectorial, cu straturi (OCG) | 7 curbe Bézier (PDF n-are cerc) |
| `CNC-referinta.eps` | EPS vectorial, fără straturi (EPS n-are straturi) | 7 curbe Bézier |

## Ce verifici, program cu program

Notează pentru fiecare fișier deschis: **se deschide? / scara e bună? / cercul e cerc? / nodurile? / straturile?**

### ArtCAM (prioritar)
1. Importă vectorii din `CNC-referinta-R2007.dxf`. Măsoară cercul: 100,00. Selectează-l și uită-te la noduri: e cerc
   sau arc, nu o polilinie cu zeci de puncte?
2. Măsoară litera N: 20,00. Verifică dreptunghiul: colțurile sunt rotunde, nu ascuțite.
3. Curba S: câte noduri are? În R2007 trebuie să fie **2** (un singur segment curb).
4. Straturile: apar DECUPARE și GRAVARE?
5. Repetă cu `CNC-referinta-R12.dxf`. Aici curba S are **64 de arce** (65 de noduri), iar elipsa 112. E normal: R12
   n-are curbe, doar arce. Spune-mi dacă ArtCAM le unește într-un vector închis.
6. Dacă ai timp: `CNC-referinta.pdf` și `CNC-referinta.eps`.

### Aspire / VCarve (prioritar)
Aceiași pași ca la ArtCAM, cu R2007, apoi R12, apoi PDF, EPS și SVG (dacă versiunea ta importă SVG).
În plus: la importul PDF, Vectric pune fiecare pagină pe un strat. Verifică dacă păstrează și straturile noastre.

### AutoCAD / LibreCAD / DWG TrueView (dacă ai unul)
Deschide ambele DXF. Clic pe cerc, apoi comanda `LIST` sau panoul de proprietăți:
- R2007: cercul e **CIRCLE** (rază 50), elipsa e **ELLIPSE**, curba S și literele sunt **SPLINE**, dreptunghiul e
  **LWPOLYLINE**;
- R12: cercul e CIRCLE, restul sunt **POLYLINE** cu arce.
Straturile: DECUPARE (roșu) și GRAVARE (albastru). Unitățile: milimetri.

### Inkscape
1. Deschide `CNC-referinta.svg`. În panoul Straturi apar DECUPARE și GRAVARE. Cercul e un obiect cerc cu W = H = 100 mm.
2. Deschide `CNC-referinta-R2007.dxf`. La dialogul de import alege scara manuală 1,0 sau „Read from file”. Cercul
   trebuie să aibă tot 100 mm.
3. Deschide `CNC-referinta.pdf`: verifică dimensiunile.

### Illustrator / CorelDRAW
1. Deschide SVG, PDF, EPS și DXF R2007. La CorelDRAW, la import DXF alege „Metric (1 unit = 1 mm)” sau „Automatic”.
2. Măsoară cercul (100 × 100) și elipsa (cu rotirea ei, axele 120 și 60).
3. Numără nodurile curbei S: **2**. Nodurile dreptunghiului: 8 în SVG și DXF, 12 în PDF și EPS (acolo fiecare colț
   e din 2 curbe, fiindcă PDF n-are arc).
4. Straturile: în SVG și DXF trebuie să apară. În PDF depinde de program. În EPS nu există.

## Ce îmi trimiți

Un tabel simplu, de exemplu:

| Program | Fișier | Se deschide | Ø100 | N = 20 | Cerc = cerc | Noduri curba S | Straturi |
|---|---|---|---|---|---|---|---|
| ArtCAM | R2007.dxf | da | 100,00 | 20,00 | da | 2 | da |

Dacă ceva iese altfel, o captură de ecran ajută mult.
