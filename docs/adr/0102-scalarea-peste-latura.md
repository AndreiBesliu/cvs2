# ADR 0102: Scalarea unui arc peste latura documentului

**Starea:** acceptat pe 28.10.2026, la felia 9.3↑b, după importul DXF (ADR 0101). **Completează:** transformările (ADR
0052: scalarea exactă a geometriei sau refuzul cu motiv), raza arcului la ușa documentului (ADR 0034 §2) și arcul plat al
importului (ADR 0035 §6, ADR 0101). **Schimbă:** scalarea uniformă a unei căi și ce arată mânerele la un refuz.

**Problema.** Owner-ul, pe 28.10: „Am importat un dxf cu succes, dar nu il pot scala” („Ce-i drept, era un fisier
complex”): 247 de contururi, fără unități, 25,04 × 39,25 mm, cu 6 arce plate. Un arc aproape drept are raza mare, (c / 4)
· (β + 1/β). Mărit de k ori, raza crește de k ori și trece de latura documentului (10 000 mm), pe care schema o cere pe
fiecare arc al căii (ADR 0034 §2, recenzia 2.7b: un cerc cât un continent, double-ul, float32-ul pânzei). Scalarea pură
trecea, fiindcă arcele se scalează exact uniform, dar acțiunea `document.transforma` refuza documentul la schemă, iar
mânerele nu spuneau nimic: cutia revenea la loc. Un motiv ar fi stat deasupra mânerului de rotire, adică sub barele de sus,
la o piesă care umple ecranul (ca în poza owner-ului).

## Decizia

1. **Arcul care ar trece de latură devine cubice.** La scalarea uniformă a unei căi, un arc a cărui rază, după scalare, ar
   trece de 0,999 × latura (9 990 mm) devine cubicele aceluiași cerc (`arcInCubice`, ADR 0068), sub toleranța importului
   (0,000001 mm, `TOLERANTA_IMPORT`), ca arcul plat la import (ADR 0035 §6). Marja de 0,1 % ține arcul departe de plafonul
   ușii, care îl socotește din coardă și bulge. Un arc sub prag își păstrează bulge-ul (doar se mărește). Scalarea
   neuniformă a unei căi cu arce rămâne refuzată (`neuniform-arc`), ca înainte: bifa „Arcele devin curbe” e a înclinării
   (ADR 0078), nu a mânerelor.
2. **Refuzul ușii are motiv.** Mânerele aplică transformarea prin acțiune și citesc rezultatul ei (`RezultatActiune`): un
   refuz al documentului (o latură sau o rază peste 10 m, un loc prea departe, o transformare care n-ar mai fi exactă) se
   arată ca motiv (`motiv.transformare-inexacta`), la fel ca refuzurile scalării pure.
3. **Eticheta rămâne pe ecran.** Mărimea, unghiul și motivul stau deasupra mânerului de rotire. Dacă acolo ar intra sub
   barele de sus, stau sub cutie. Dacă nici acolo nu se văd (o piesă mai mare decât ecranul), stau chiar sub bare
   (`susEticheta`, pură). Banda vizibilă se măsoară din `header.sus` și `footer.jos` când eticheta apare.

## Probele

- **Unitar** (`transformare.test.ts`):
  - arcul plat (coarda 10, bulge 1/800, mărit de 10 ori: raza ≈ 20 000 mm) devine cubice pe cercul lui, sub 1,01e-6 mm,
    iar documentul trece de ușă;
  - arcul larg (0,3 rad, coarda 360, mărit de 10 ori: raza ≈ 12 045 mm) devine exact 3 cubice, pe cerc. Pe hârtie, eroarea
    e R · 2 · sin⁶(φ / 4n) / (27 · cos²(φ / 4n)): 0,00016 mm cu una, 0,0000025 cu două, 0,0000002 cu trei;
  - mărit de 2 ori, arcul își păstrează bulge-ul.
- **Unitar** (`editare.test.ts`): banda etichetei, pe hârtie, la margini: deasupra la egalitate, sub cutie, apoi sub bare.
- **E2e** (`import.spec.ts`): un DXF cu un arc aproape drept (R ≈ 4 000 mm) și un cerc R5, mărit din colț până sub barele
  de sus: piesa crește (lățimea trece de 100 mm), fără motiv. Trasă apoi pe latură, piesa e refuzată (scalare doar
  proporțională), iar motivul se vede sub bare, întreg pe ecran.
- **E2e** (`editare.spec.ts`): un dreptunghi de 8 × 6 m, mărit din colț peste 10 m: motivul ușii se vede, întreg pe ecran,
  iar dreptunghiul rămâne cum era.
- **Mutațiile: 7 / 7 prinse.** În prima rundă au scăpat două:
  - toleranța proiectului în locul celei a importului: pe un arc aproape drept, o singură cubică e oricum exactă;
  - eticheta lăsată mereu deasupra: piesa probei nu urca până la bare.

  Probele de mai sus le prind.

## Ce am respins

- **Un prag mai mare în schemă.** Raza de 10 m apără pânza (float32) și calculele de ansamblu. O rază mai mare n-ar fi mai
  exactă, doar mai fragilă.
- **Arcul plat pus ca linie.** S-ar pierde săgeata (0,05 mm la DXF-ul probei): nu e exact.
- **Doar refuzul cu motiv, fără conversie.** Omul ar rămâne cu piesa la mărimea din fișier, exact ce a raportat owner-ul.

## Limite și neprobat

- Banda de jos (`footer.jos`) e măsurată, dar doar funcția pură o probează: în e2e, cutia nu ajunge până la bara de jos.
- O cale cu multe arce plate mărite poate trece, după conversie, de plafonul vârfurilor (fiecare arc devine 1…64 de
  cubice). Refuzul ușii are atunci motiv, dar nu și o cale de ocolire.

## Se redeschide dacă

- un DXF real tot nu se poate mări (alt plafon decât raza);
- scalarea neuniformă a căilor cu arce trebuie să meargă din mânere (bifa înclinării, ADR 0078, adusă și aici).
