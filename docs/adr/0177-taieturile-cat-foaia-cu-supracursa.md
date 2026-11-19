# ADR 0177 — Supracursa și pe tăieturile cât foaia, la alegere

**Starea:** acceptat pe 18.11.2026, la răspunsul owner-ului „vreau sa fie optiune la alegerea userului”. Întrebarea fusese:
„Vrei ca tăieturile scrise cât grosimea foii să coboare și ele singure cu supracursa?”. Felia 12.1↑f-4, în linia
incrustațiilor (worktree-ul `incrustatii`, ramura `wip/12.1-incrustatii`), fără mașină. **Înlocuiește în parte ADR 0176:**
punctul 2, a treia liniuță, și primul rând de la „Ce am respins”. **Documentul:** neschimbat (v25).

## Problema

Cu ADR 0176, o tăietură scrisă cât grosimea foii rămâne cât e scrisă: supracursa dă doar voie să tai mai adânc. Pentru o
tăietură prin foaie, omul trebuie să scrie grosimea plus supracursa pe fiecare rând (18,5 pe foaia de 18). Nici titlul câmpului
(„cât coboară tăieturile prin placă”) nu se potrivea cu ele. Owner-ul vrea ca alegerea să fie a omului.

## Decizia

1. **Bifa „și tăieturile cât foaia”**, lângă supracursă, în fereastra exportului.
   - **Implicit e pusă.**
   - O ține aplicația, ca supracursa, de la o fereastră la alta; nu intră în document.
   - Fără supracursă (0 sau un text greșit) e oprită, fiindcă n-are ce schimba.
   - În cererea de export, lipsa ei înseamnă „fără”, deci exporturile de până acum rămân aceleași. Fereastra o trimite doar
     bifată și cu o supracursă.
2. **Bifată:** o operație de profil, de buzunar sau de găurire, fără incrustație, cu adâncimea scrisă cât grosimea foii, se
   taie ca și cum ar fi scrisă grosimea plus supracursa.
   - Programul e același, octet cu octet: aceleași treceri, aceleași urechi (vârful de la fața de jos, ADR 0028 §2).
   - În document, adâncimea rămâne cât e scrisă; doar lucrarea exportului o vede mai adâncă.
   - Nu se schimbă tăieturile scrise altfel: mai puțin adânci decât foaia, sau deja mai adânci (voia din ADR 0028 §2).
   - Nu se schimbă nici V-carve-urile: adâncimea lor e o limită a V-ului, nu o tăietură prin foaie.
   - Nu se schimbă nici incrustațiile: gaura are locașul ei (ADR 0175), iar dopurile au ADR 0176.
3. **Debifată:** ca în ADR 0176, tăietura rămâne cât e scrisă.
4. Traseul, vederea 3D și timpul de lângă traseu rămân fără supracursă (ADR 0176 §4).

## Dovada

- [măsurat] Proba, scrisă întâi (`supracursa.prinFoaie.test.ts`), pe o foaie de 6 mm cu supracursa 0,5. Cu bifa, exportul
  trebuie să fie, octet cu octet, al foii în care tăieturile cât foaia (profilul cu urechi, buzunarul, găurirea) sunt scrise
  6,5. Profilul de 3, V-carve-ul cât foaia (oprit chiar de adâncime) și incrustația cât foaia nu se schimbă. Pe codul de
  dinainte a picat; controlul fără bifă a trecut.
- [dedus] Vârful urechilor e la grosime minus grosimea urechii, măsurat de la față. Cu bifa, e la 4,5, nu la 5, deci puntea are
  tot 1,5.

## Ce am respins

- **Bifa pe fiecare rând** („prin foaie”, ținută la zi cu foaia, ca gaura): cere un câmp în document (v26) și ar dubla bifa de
  aici pentru cazul obișnuit. Rămâne o felie posibilă, la cuvântul owner-ului.
- **Implicit debifată:** o adâncime cât foaia înseamnă aproape mereu o tăietură prin foaie, iar titlul câmpului spune „cât
  coboară tăieturile prin placă”. Cine vrea altfel o debifează.
- **Toate tăieturile de cel puțin grosimea foii:** o adâncime scrisă deja peste foaie e voia din ADR 0028 §2 și rămâne cum e
  scrisă.

## Ce impune

- `ParametriExport.prinFoaie`; `programDinDocument` o primește, iar `cuTaieturiPrinFoaie` (`src/cam/prinFoaie.ts`) face
  documentul tăiat.
- ADR 0176: starea „în parte înlocuit de ADR 0177”.
- Fereastra: bifa, oprită fără supracursă, cu titlul ei; aplicația o ține. Manualul (ro, en).
- Probele, e2e-ul ferestrei, otrăvurile (`test/otravuri/12.1f-4.py`), fișa (rândul 12.1↑f-4), DEVLOG-ul.

**Se redeschide dacă:** owner-ul vrea și bifa pe fiecare rând (câmpul din document), sau vine profilul mașinii.
