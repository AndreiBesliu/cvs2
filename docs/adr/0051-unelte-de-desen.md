# ADR 0051: Uneltele de desen prin tragere, cu lipirea

**Starea:** acceptat pe 20.10.2026, odată cu felia 6.B↑. Cererea owner-ului: „Da, fă acum uneltele de desen prin tragere (dreptunghi, cerc,
elipsă, linie, poligon), cu lipirea, fără agenți.” **Intră în:** etapa 6 („Editorul de vectori”), adusă în etapa 3, fără
mașină (6.B↑). **Continuă:** ADR 0050 (lipirea, modulul editării la cerere).

**Problema.** „Adaugă dreptunghi / cerc” pun o formă fixă (100 × 60 mm, R15) într-un colț; nu se poate desena o formă
unde și cât trebuie, nici o elipsă, o linie sau un poligon.

## Decizia

**1. Uneltele** stau în bara editării (ADR 0050 §5), la cerere: Selecție (V), Dreptunghi (R), Cerc (O), Elipsă (E), Linie
(L), Poligon (P, cu numărul de laturi 3…64, implicit 6). O unealtă rămâne aleasă după o formă (se desenează mai multe la
rând); Escape sau V întoarce la selecție. Butoanele „Adaugă dreptunghi / cerc” din bara de sus rămân cum erau (ADR 0052: din 20.10 stau doar în paleta de comenzi, iar uneltele trec în bara de sus).

**2. Gestul:** apăsat și tras pe pânză, cu previzualizarea conturului; la eliberare, forma intră în document printr-o
singură acțiune (`document.deseneaza`, un pas de anulare) și rămâne aleasă. O tragere sub 3 px nu face nimic. Fiecare
capăt al gestului se lipește ca un punct (ADR 0050 §2: ghidajele, foaia, celelalte forme, grila; Alt: liber), cu liniile
de aliniere arătate. Un capăt nelipit se rotunjește la 0,001 mm (pixelii mausului dau 60,000002661).
- Dreptunghiul și elipsa: din colț în colț (Shift: pătrat, cerc). Cercul și poligonul: din centru (raza = distanța;
  poligonul are primul vârf în direcția tragerii, Shift: unghiul în pași de 15°). Linia: din capăt în capăt (Shift: pași
  de 15°).

**3. Geometria rămâne exactă** (BRIEF §16.2): dreptunghiul e `dreptunghi`, cercul e `cerc`, elipsa e o cale închisă din
cubice cu aceeași funcție și toleranță ca importul SVG (`arcEliptic`, `TOLERANTA_IMPORT`; o elipsă cu razele egale e un
`cerc`), linia o cale deschisă, poligonul o cale închisă din linii. Operația implicită: a dreptunghiului pentru formele
închise, a liniilor deschise din import pentru linie (pe linie, `adancimeDeschise(grosime)`, o trecere; ADR 0037 §11).

**4. Ușa:** documentul de după trebuie să treacă de plafoane și de schemele documentului, cu judecata lor de ansamblu:
ce se desenează se și redeschide (migrările și arcele în lume ale ușii nu privesc o formă nouă; ușa întreagă importată
aici ar fi lipit schemele de ea într-o singură bucată la cerere). Pornirea primește doar cârligul gestului în pânză și acțiunea în registru (calculul ei vine la cerere).

## Probele

`test/unit/unelte-desen.test.ts` (fiecare unealtă, cu valori pe hârtie: colțurile, raza, Shift, unghiul, elipsa sub toleranță,
tragerea prea scurtă), `test/unit/actiuni.editare.test.ts` (acțiunea: un pas, ușa, plafonul, doar-citirea),
`test/e2e/editare.spec.ts` (fiecare unealtă pe pânză, lipirea de un ghidaj, Escape).
