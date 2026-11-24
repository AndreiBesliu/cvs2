# ADR 0311: Nucleul reliefului: grila, dala, harta, compunerea și imaginea → relief

**Starea:** acceptat pe 24.11.2026, în cadrul ADR 0310 (acceptat cu 1a–6a): e contractul exact al feliei 18.1↑a, scris
înaintea codului, ca oracolul (`test/oracles/relief.ts`, întrebarea 5a) să-l citească de aici, nu din cod. Nu adaugă
nicio decizie de produs; precizează ce ADR 0310 §1–§3 lasă deschis (numerele, rotunjirile, ordinea operațiilor).

## 1. Grila

- Un relief are **nx × ny celule**, cu 1 ≤ nx, ny ≤ 8192 (plafonul, răspunsul 4a), și **celula pătrată** `c`, în mm, cu
  0,001 ≤ c ≤ 100 și nx · c, ny · c ≤ 10 000 mm (plafonul laturii documentului).
- Celula (i, j), cu i = 0 … nx − 1 spre dreapta și j = 0 … ny − 1 **în sus**, are centrul în ((i + ½) · c, (j + ½) · c), în
  sistemul elementului: originea e colțul stânga-jos al grilei.
- O valoare e înălțimea modelului în centrul celulei, în mm, față de planul zero al reliefului: un Float32 finit. **Golul**
  (o celulă fără valoare a unui strat) e NaN în memorie.

## 2. Imaginea → grilă

- Pixelul (x, y), cu y numărat **de sus** (ca în imagine), dă celula (i = x, j = ny − 1 − y); nx și ny sunt lățimea și
  înălțimea imaginii în pixeli (aliniat: o celulă = un pixel).
- **Golul:** un pixel cu alfa < 128 (din 255) e gol; altfel alfa nu contează.
- **Valoarea gri** g ∈ [0, 1], după sursă:
  - luminanța: g = (2126 · R + 7152 · G + 722 · B) / 2 550 000 (coeficienții Rec. 709 pe valorile codate, fără
    liniarizare; numărătorul e un întreg exact, deci g e o singură împărțire rotunjită);
  - un canal: g = R / 255, G / 255 sau B / 255.

## 3. Netezirea (nucleu binomial, fără `exp`)

- σ e scris în celule; ordinul nucleului e n = 2 · round(2 · σ²) (par; Math.round). n = 0 înseamnă fără netezire. Abaterea
  standard reală e √(n / 4).
- Ponderile: w_k = C(n, k) / 2ⁿ, pentru k = 0 … n, așezate la deplasarea k − n / 2. Sunt exacte în Float64 până la n = 50;
  peste, n se taie la 50 (σ cel mult 3,5 celule; mai mult netezire nu e nevoie la 18.1↑a).
- **Două treceri:** întâi pe orizontală (de-a lungul lui i), apoi pe verticală (de-a lungul lui j), în Float64, fără
  rotunjire între ele. La fiecare trecere, într-o celulă care nu e goală:
  out = Σ_k w_k · g(vecinul k) / Σ_k w_k, pe vecinii **din grilă și negoi**, cu k crescător. O celulă goală rămâne goală
  (netezirea nu umple goluri).

## 4. Înălțimea

- h = b + g · H („Alb = sus”) sau h = b + (1 − g) · H („Negru = sus”), în Float64, apoi rotunjită la Float32. H > 0 e
  înălțimea, b ≥ 0 baza (planul zero), ambele în mm.

## 5. Dala și cuantizarea

- Dalele au 256 × 256 celule; dala (ti, tj) ține celulele i ∈ [256 · ti, 256 · ti + 256), j ∈ [256 · tj, 256 · tj + 256).
  Celulele din afara grilei (pe dalele de pe marginea dreaptă și de sus) sunt goale.
- Fie m și M cea mai mică și cea mai mare valoare negoală a dalei.
  - **Toate goale:** dala e `null` (fără octeți).
  - **Toate negoale și m = M:** dala e constanta m (un număr, fără octeți).
  - **Altfel:** pasul p = (M − m) / 65 534 în Float64 (0 dacă m = M); codul unei valori v e 0 dacă p = 0, altfel
    min(65 534, max(0, Math.round((v − m) / p))); golul are codul 65 535.
- **Valoarea citită** dintr-un cod k < 65 535 e Math.fround(m + k · p). Eroarea față de v e cel mult p / 2 plus rotunjirea
  la Float32: (M − m) / 131 068, adică 0,46 µm pe o dală care urcă 60 mm.
- **Octeții dalei**, pentru amprentă și pentru bază: „CVR1” (4 octeți ASCII), m și p ca Float64 little-endian (16 octeți),
  apoi cele 65 536 de coduri ca Uint16 little-endian, rând cu rând (j crescător, apoi i crescător): 131 092 de octeți.
  **Amprenta** e SHA-256 a lor, în hexazecimal mic (64 de caractere).

## 6. Harta dalelor

- Harta unui strat e JSON-ul canonic (cheile sortate, ca `src/model/jsonCanonic.ts`) al obiectului
  `{ "v": 1, "nx": nx, "ny": ny, "dale": [...] }`, cu dalele în ordinea tj crescător, apoi ti crescător (⌈nx / 256⌉ pe rând,
  ⌈ny / 256⌉ rânduri). Fiecare intrare e amprenta dalei (text), constanta ei (număr) sau `null`.
- Amprenta hărții e SHA-256 a textului canonic, în UTF-8; ea e `dale` din stratul documentului (ADR 0310 §1).

## 7. Compunerea

- Compusul pornește cu R = 0 în toate celulele (planul zero; compusul n-are goluri).
- Straturile vizibile, de jos în sus (indicele 0 jos), fiecare pe celulele lui negoale, cu valoarea v:

  | Modul | R devine |
  |---|---|
  | `aduna` | R + v |
  | `scade` | R − v |
  | `inalt` | max(R, v) |
  | `jos` | min(R, v) |
  | `inlocuieste` | v |
  | `inmulteste` | R · v |

- Fiecare pas se rotunjește la Float32 (Math.fround), deci ordinea e cea a straturilor, celulă cu celulă.
- Compunerea citește valorile **cuantizate** ale straturilor (§5): ce se vede, ce se salvează și ce se taie e același lucru.

## 8. Ce probează oracolul

- §2–§4 pe imagini mici, cu valorile pe hârtie (luminanța, canalele, alfa, sensul, netezirea cu nucleul [1, 2, 1] / 4 și cu
  golurile).
- §5 pe dale cu valori alese, pe hârtie (codurile, valoarea citită, constanta, golul), plus marginea erorii pe dale
  întâmplătoare; octeții și amprenta unei dale mici, recalculate independent.
- §6 pe o hartă mică, scrisă de mână.
- §7 pe un tabel pe hârtie, cu toate modurile, golurile și ordinea.
- **Controalele negative** (oracolul trebuie să le prindă): coeficienții Rec. 601 în locul celor 709; pixelul (x, y) pus pe
  rândul j = y (fără întoarcere); floor în locul lui round la cod; golul codat 0; compunerea de sus în jos; netezirea care
  umple golurile.

## Se redeschide dacă

- o imagine reală arată un defect pe care contractul îl produce (de exemplu, marginea alfa la 128 face trepte vizibile pe un
  logo): atunci o regulă nouă, cu proba ei, nu o potrivire în cod.
