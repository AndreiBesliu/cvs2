# ADR 0099: Animația traseului

**Starea:** acceptat pe 28.10.2026, la felia 5.7↑, la „continua”. Etapa 3 nu mai are felii fără mașină, iar `PLAN.md` §4.6
(punctul 7) cere felii fără mașină cât plăcile sunt netăiate. Rândul de prag e „Animația traseului: freza care se mișcă pe
traseu, pas cu pas, cu viteză reglabilă și glisor” (v1, etapa 5), din cea mai devreme etapă care mai avea ceva fără mașină.

**Completează:** traseul pe pânză (ADR 0038) și timpul jobului (ADR 0046 §8). **Schimbă:** rezultatul postului
(`RezultatPost`), care primește `liniiMiscari`, și rezumatul timpului de lângă traseu (`traseu`).

**Problema.** Traseul se vede întreg, dintr-odată. Omul nu vede ordinea tăierilor, unde intră freza, cât stă pe o operație
și unde se schimbă scula, decât la mașină.

## Decizia

1. **Timpul fiecărei mișcări, al mașinii.** Postul spune la ce linie începe fiecare mișcare a programului și unde începe
   finalul (`liniiMiscari`). Estimarea planificatorului GRBL (ADR 0046) se împarte la acele linii (`secundePeMiscare`), cu
   același post și aceeași mașină ca timpul jobului de lângă traseu. Suma e exact timpul din cip (probat), cu accelerațiile,
   pauza axului și urcarea de la schimbarea sculei. Animația rulează deci în timpul mașinii, nu cu o viteză inventată.
2. **Modelul pur** (`src/sim/animatie.ts`):
   - **cronologia:** pregătirea, câte un pas pe mișcare care ia timp sau mută freza, apoi finalul;
   - **poziția la orice moment:** liniară în timp în interiorul unei mișcări; pe arc, unghiul și Z-ul (elicea);
   - **schimbarea sculei** urcă la Z sigur și montează scula nouă;
   - **pașii înainte și înapoi;**
   - **drumul parcurs între două momente**, ca linii frânte în XY, cu arcele în coarde sub o săgeată dată.

   Capătul unui pas e al lui: „Pasul următor” arată pasul parcurs. La capătul animației se arată finalul.
3. **Playerul** (`src/ui/actiuniAnimatie.ts`), unul în aplicație:
   - rulează pe cadrele browserului, cu viteza aleasă (1× … 500×). Viteza implicită e cea mai mică cu care toată animația ține
     cel mult un minut;
   - se oprește singur la final, iar „Rulează” de la final o ia de la capăt;
   - sare și merge pas cu pas;
   - starea citită poartă și freza la momentul ei.
4. **Interfața:**
   - **„Animează”** stă lângă timpul jobului, în cip. Apare doar când timpul e estimat, fiindcă animația folosește aceeași
     estimare;
   - **panoul de deasupra** are:
     - butoanele: înapoi, rulează / pauză, înainte;
     - viteza;
     - glisorul momentului;
     - citirile: timpul din total, pasul din câți, mișcarea (cu avansul) și lucrarea, X Y Z, freza;
   - **pe pânză**, deasupra traseului, stratul animației desenează drumul parcurs (tăierile pline, rapidele punctate, în
     culoarea `--animatie`) și freza: un cerc cât diametrul ei, plin cât e în material;
   - **închiderea:** Escape sau „×” închid panoul. Un document schimbat (traseul vechi) închide animația singur, odată cu cipul
     timpului.
5. **Pornirea nu crește.** Totul vine la cerere: panoul cu cipul timpului, stratul cu stratul traseului. `App` nu se
   schimbă, iar programul ajunge la panou prin rezumatul timpului de lângă traseu (`traseu`). Interfața ajunge la simulare
   doar prin `actiuniAnimatie`, după regula importurilor.

## Cifrele (măsurate, gzip 9)

| | Înainte (3.N) | După (5.7↑) |
|---|---|---|
| Pornirea (cu ușa) | 96,3 (99,8) / 100 kB | 96,4 (99,9) / 100 kB |
| Totalul JavaScript | 326,1 / 400 kB | 330,3 / 400 kB |

Nimic din animație nu e în bucata de pornire. Ea crește doar cu numele bucății noi, comune panoului și stratului
(`actiuniAnimatie`), în lista de preîncărcare a lui Vite (`__vite__mapDeps`): +271 de octeți necomprimați, ~0,1 kB gzip.

## Probele

- **`test/unit/animatie.test.ts`** (modelul, pe hârtie):
  - durata;
  - poziția în pregătire, pe deplasări, pe tăieri, pe arcul în elice (la jumătate și la un sfert);
  - pauza, schimbarea sculei (urcarea, scula nouă), finalul;
  - felul, avansul, eticheta, pasul și capetele lui;
  - pas cu pas;
  - drumul parcurs (separat rapid / tăiere, doar Z nevăzut, un pas tăiat la jumătate, arcul cu săgeata sub toleranță și
    capetele exacte);
  - timpi răi.
- **`test/unit/animatie.timp.test.ts`** (postul și estimarea):
  - linia fiecărei mișcări (cu cea care nu scrie nimic);
  - suma = timpul din cip;
  - mașina din `$$`;
  - un `$$` greșit sau un program refuzat dau „nimic”;
  - rezumatul de lângă traseu poartă programul.
- **`test/unit/animatie.player.test.ts`** (pe un ceas fals):
  - viteza implicită;
  - rulează, pauză, viteza schimbată din mers, oprirea la final;
  - sărituri, pas cu pas, ascultătorii;
  - închiderea, încărcarea din program.
- **`test/e2e/animatie.spec.ts`** (Edge, pe build):
  - panoul și pașii;
  - rularea până la final (freza sus);
  - glisorul (Home / End);
  - freza desenată pe pânză exact unde spune panoul, cu drumul parcurs;
  - „×”, Escape și documentul schimbat;
  - engleza.

## Ce am respins

- **O viteză inventată (lungimea la avans):** n-ar fi timpul mașinii, iar cipul ar spune alt timp decât animația.
- **Timpi simpli când estimarea lipsește:** „Animează” apare doar unde există timpul jobului, deci ramura n-ar fi avut cum să
  ruleze. Cod mort, fără probă în aplicație.
- **Animația în vederea 3D, cu materialul scos pe măsură:** e simularea, cu altă felie. Acum, freza și drumul pe pânza 2D.
- **Animația pe liniile G-code-ului:** IR-ul are deja coordonatele documentului; postul doar spune unde începe fiecare mișcare.
- **Taste pentru rulare:** Space mută pânza, iar săgețile mută selecția. Panoul are butoane, iar glisorul ascultă Home / End.

**Modelul stă în `src/sim/`, dar nu e nucleul simulării.** Nu scrie celule, doar arată freza pe pânză, deci nu trebuie să iasă
bit cu bit la fel în Node și în Edge. Ca estimarea timpului (`timp.ts`), e scos din plasa care interzice trigonometria lui
`Math` în nucleu (`test/unit/simulare.unghi.test.ts`). Tot de aceea poate lua `baleiajArc` din IR. Nucleul își păstrează plasa
neschimbată.

## Limite și neprobat

- **În interiorul unei mișcări, poziția e liniară în timp.** Accelerația e în durata mișcării, nu în viteza din interiorul ei.
- **Eticheta lucrării e textul din G-code** (de exemplu „e1/e1: dreptunghi, exterior, 3 mm”), deci nu trece prin traducere.
- **Un program foarte mare** redesenează drumul parcurs de la început la o vedere schimbată sau la un salt înapoi. E o
  singură dată, nu la fiecare cadru.
- **Pornirea cu ușa e la 99,9 / 100 kB.** Fiecare bucată nouă la cerere, comună mai multor module, adaugă un nume în lista de
  preîncărcare din pornire, deci felia următoare de felul ăsta poate trece de plafon. Plafonul pornirii e decizia
  owner-ului.

## Se redeschide dacă

- simularea 3D primește redarea în timp;
- eticheta lucrării primește numele din document;
- un program mare se simte la zoom.
