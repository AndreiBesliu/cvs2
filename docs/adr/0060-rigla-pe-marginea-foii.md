# ADR 0060: Rigla pe marginea foii, cu linia de cotă

**Starea:** acceptat pe 24.10.2026. Cererea owner-ului: „vreau sa modificam rigla, trebuie sa stea pe marginea planselor.
Acum se suprapun lucruri care ar trebui mai clar delimitate”; la întrebarea despre formă: „Vreau ca rigla sa tina cat foaia
de lucru, dar, daca avem piese care depasesc, sa se extinda o linie cu cota de lungime”. **Intră în:** etapa 3, lângă
editorul adus din etapa 6, fără mașină. **Continuă:** ADR 0050 §4 (riglele și ghidajele), care le punea pe marginea zonei
libere.

**Problema.** Riglele stăteau pe marginea de sus și din stânga a zonei libere (spațiul dintre panouri), lungi cât zona, în
timp ce foaia și formele se desenau pe tot ecranul: după o deplasare, foaia trecea pe sub riglă și ieșea de partea cealaltă a
ei, iar rigla nu mai spunea nimic despre marginea foii. Formele ieșite din foaie se vedeau doar în panou și în bara de stare.

## Decizia

**1. Rigla e a foii.** Rigla de sus stă deasupra marginii de sus a foii, de la X 0 la lățimea ei; cea din stânga, la stânga
marginii din stânga, de la Y 0 la înălțimea ei; colțul lor, în colțul stânga-sus al foii. La deplasare și la zoom se mută
odată cu foaia. Gradațiile sunt doar pe foaie.

**2. Oprită pe marginea zonei.** Când marginea foii iese din zona liberă (pe sub bare sau panouri), rigla rămâne pe marginea
zonei, iar întinderea ei se taie la zonă; cea de sus începe după colțul celei din stânga, ca să nu se suprapună. Fără nimic de
arătat pe axa ei (foaia cu totul în afara zonei pe acea axă), rigla dispare. Un ghidaj lăsat înapoi în banda riglei lui se
șterge (înainte: oriunde deasupra marginii zonei).

**3. Linia de cotă.** Dacă formele foii ies din ea, în banda riglei, în continuarea ei, o linie de cotă merge de la marginea
foii la marginea formelor, cu cât ies (mm, rotunjit la sutime), pe fiecare parte (stânga, dreapta, sus, jos), în culoarea
atenției, cu sfatul „Formele ies din foaie cu … mm la dreapta”. Pe o cotă prea scurtă pentru etichetă, eticheta stă după
capătul dinspre forme. Sub 10⁻⁶ mm nu e cotă (zgomotul unei forme lipite de margine).

**4. Calculul e pur** (`src/canvas/gradatii.ts`: `pozitiaRiglelor`, `cotePeste`; `cutieFormelor` în calculul editării),
cu probe unitare; rigla rămâne în modulul editării (la cerere), deci pornirea nu se schimbă.

## Respinse

- **Zona de desen închisă** (desenul doar între panouri, cu riglele pe marginea ei): propusă, neleasă; pânza rămâne pe tot
  ecranul, ca în șablonul ales pe 13.10.
- **Rigla pe toată zona, cu foaia marcată pe ea**: rigla n-ar fi spus unde se termină foaia, iar suprapunerea ar fi rămas.

## Se redeschide dacă

- vin mai multe foi (Multi-Plate, etapa 11): fiecare foaie cu riglele ei, sau doar cea aleasă;
- „Arată toată foaia” trebuie să cuprindă și formele care ies (atunci și cotele se văd întregi).
