# ADR 0055: Lipirea mânerelor de scalare

**Starea:** acceptat pe 20.10.2026, odată cu felia 6.F↑. Cererea owner-ului: „Fă acum lipirea mânerelor de ghidaje, grilă și
forme, fără agenți.” **Intră în:** etapa 6 („Editorul de vectori”), adusă în etapa 3, fără mașină (6.F↑). **Continuă:** ADR
0050 (lipirea), ADR 0052 (mânerele, unde lipirea lor era amânată), ADR 0053 (unealta Transformare).

**Problema.** Mutarea și desenul se lipeau de ghidaje, foaie, forme și grilă, dar un mâner de scalare tras mergea doar după
maus. O latură nu se putea duce exact pe un ghidaj sau pe marginea altei piese, iar scara ieșea rotunjită la 1e-4.

## Decizia

**1. Mânerul se lipește ca un punct.** Punctul mânerului, mutat cu deplasarea cursorului față de apăsare (ADR 0052 §4), se
lipește de aceleași ținte și cu aceeași toleranță ca mutarea (ADR 0050 §2): ghidajele, marginile și mijlocul foii, marginile
și mijlocul cutiilor celorlalte forme (nu ale celor alese, care se schimbă), capetele căilor deschise și grila pornită.
Liniile de aliniere ale țintelor atinse se văd cât se trage. Alt inversează lipirea (ADR 0052 §2).

**2. Doar axele pe care mânerul le scalează.** Laturile e și v se lipesc doar pe x, n și s doar pe y, colțurile pe amândouă.
La colțul proporțional (fără Shift) decide axa care s-a schimbat mai mult (ADR 0052 §4). O lipire pe cealaltă axă nu se
folosește și linia ei nu se arată. Se arată doar liniile axelor pe care mânerul chiar a ajuns pe țintă.

**3. Exact pe țintă.** Pe o axă lipită, scara e raportul exact (ținta − ancora) / (mânerul − ancora), nerotunjit, deci latura
ajunge pe țintă (sub 1e-12 mm). Pe o axă nelipită, scara rămâne rotunjită la 1e-4, ca pixelii mausului să nu intre în
geometrie.

**4. Rotirea nu se lipește:** are Shift, în pași de 15°.

**5. Pornirea** nu primește nimic: lipirea mânerelor stă în modulul editării, la cerere (`transformareManerLipita` în
`src/app/editareCalcul.ts`, ținta exactă dată lui `transformareManer`).

## Probele

`test/unit/editare.test.ts`:
- latura e lipită de un ghidaj la 40,1, cu scara nerotunjită; fără lipire, rotunjită, la 1,3167;
- colțul proporțional ia doar axa care decide; cu Shift, ambele axe;
- latura n ignoră un ghidaj pe x;
- grila de 10 duce latura de la 58,7 la 60;
- rotirea nu se lipește.

`test/e2e/editare.spec.ts`:
- latura dreptunghiului, trasă la 199,2, ajunge pe ghidajul de la 200 (lățimea exact 180), cu linia ghidajului arătată cât
  se trage;
- cu Alt ținut, aceeași tragere rămâne liberă (179,…);
- controlul negativ: aceeași probă cade pe codul fără lipirea mânerelor.
