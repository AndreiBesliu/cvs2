# Etapa 2 — Profilul complet, pe geometrie exactă

**Ținta** (`PLAN.md` §5.3): decupezi o piesă reală, cu urechi, intrări și dog-bone, desenată sau importată din SVG.

**Starea:** pornită pe 08.10.2026, la cuvântul owner-ului („poți să continui”), înaintea plăcii 1. Etapa 1 se închide
cu placa 1, tăiată de owner. Pe 08.10 nu mai avea nicio felie care să nu depindă de el.
- **Instanța de test:** adresa principală (`cncvectorstudio-test`) primește aplicația abia după exportul Firestore pe
  proiectul de test. Până atunci, ce e de încercat merge pe canalul `etapa-01`.
- **Operațiile intră în document** (schema v3, cu migrare): profilul, cu urechile, intrările și dog-bone-ul, e o
  operație a piesei (glosarul din `PLAN.md` §2, rândul 11), nu un parametru al dialogului de export.

## Feliile

Bugetul unei felii e ~½ zi activă, până la prima măsurătoare (`PLAN.md` §5.1). Articolele și clasele vin din
`docs/faza2/arhitectura/estimare.md`.

| # | Felia | Articolul | Clasa | Depinde de |
|---|---|---|---|---|
| 2.1 | Gărzile offsetului (s1-V §5): intrarea curățată (vârfuri repetate, linii aproape coliniare, autointersecții refuzate cu motiv), ieșirea validată (buclă deschisă, gol, aria monotonă în distanță, segmente sub 1 µm), rezoluția declarată de 0,01 mm; corpusul din s1 / s1-V în CI | I10d | R2 | — |
| 2.2 | Operațiile în document (schema v3, cu migrarea v2 → v3): profilul ca operație a piesei, cu scula și parametrii; exportul le citește din document | I3, B1 | R2 | 2.1 |
| 2.3 | Regiunea păstrată, cu oracolul întâi (invarianta 2, sesiune independentă); profilul pe orice contur (exterior, interior, pe linie, deschis pe o parte); sensul de tăiere | B1 | R2 | 2.2 |
| 2.4 | Urechile ca modificator Z(s), portate cu cele 88 de verificări pe hârtie; vârful urechii măsurat de la fundul materialului (`docs/PORTARE.md` §3.1) | B1 | R2 | 2.3 |
| 2.5 | Intrările și ieșirile, alese față de regiunea păstrată, plus rampa (portate, `docs/PORTARE.md` §3.2) | B1 | R2 | 2.3 |
| 2.6 | Dog-bone și T-bone | B2 | R1 | 2.3 |
| 2.7 | Importul SVG: DOMParser inert, unități, viewBox, transformări, plafonul de mărime; biarcele (T6) cu bugetul de toleranță (`docs/PORTARE.md` §3.3); fațada PathKit minimă (reuniunea + R3) pentru normalizarea `nonzero` de la ușă | A4, I10b | R2 | 2.1 |
| 2.8 | Stratul WebGL2 (foaia, traseul ca LINE_STRIP) și panoul de proprietăți | I7, I19 | R2 | 2.2 |
| 2.9 | Bancul vizual v1, cu martorii lui | I18 | R2 | 2.8 |
| 2.10 | Fișa plăcii 2, cu programele de aur | — | R2 | 2.4–2.7 |

**Contractul gărzilor offsetului** (felia 2.1, din `docs/faza2/sonde/s1-geometrie/VERIFICARE.md` §5). Scris aici ca
fațada `offsetInchis` din `src/geom/offset.ts` și oracolul independent să-l implementeze separat. Versiunea 2, după
primul contact cu oracolul (08.10).
- **Ușa:** `offsetInchis(contur, distanta)` întoarce `{ ok: true, contururi }` sau `{ ok: false, motiv }`, niciodată o
  excepție. `distanta` > 0 înseamnă spre exterior, < 0 spre interior. Conturul e închis, din linii și arce (`bulge`); o
  cubică e refuzată cu motiv până la biarce (felia 2.7). **La distanța 0**, conturul trece prin aceleași gărzi de intrare
  (un contur autointersectat e refuzat), iar dacă trece, iese neschimbat (exact intrarea primită).
- **Rezoluția declarată e 0,01 mm.** O distanță cu 0 < |d| < 0,005 mm e refuzată cu motiv (sub rezoluție).
- **Toleranța de atingere e 1e-6 mm:** două puncte mai apropiate sunt unul; două segmente mai apropiate se ating.
- **Intrarea se curăță, fără să-și schimbe forma:**
  - un arc de peste 180° (|bulge| > 1) se împarte în două jumătăți pe același cerc, fiecare cu bulge-ul tan(atan(b) / 2);
  - un arc cu |bulge| < 1e-6 e o linie;
  - un segment mai scurt de 1e-6 mm, **măsurat pe curbă** (un arc aproape întreg are coarda mică, dar nu e scurt), se
    scoate: capetele lui devin un vârf (rămâne vârful cu indicele mai mic; la perechea ultim–prim rămâne primul);
  - un vârf între două linii se scoate dacă stă la mai puțin de 1e-6 mm de dreapta dintre vecinii lui și între ei (un
    vârf în plus pe o latură dreaptă), nu dacă ar întoarce drumul înapoi.
- **Intrarea care nu se poate decala e refuzată cu motiv:** mai puțin de 2 vârfuri distincte (cercul are 2, cu două
  arce de 180°), aria zero (de exemplu două vârfuri legate doar de linii), sau un contur care se autointersectează: două
  segmente neînvecinate care se ating, două segmente vecine care se suprapun pe o lungime, sau două segmente vecine care
  se taie și în alt punct decât vârful lor comun. Aria și orientarea se calculează exact, cu arcele (nu pe coarde).
- **Ieșirea se verifică singură, nu doar ca formă:**
  - fiecare contur e închis, are cel puțin 2 vârfuri și numai coordonate finite; segmentele de lungime sub 1e-6 mm se
    scot, cele scurte, dar reale, rămân (postul scrie G1 acolo unde coarda e sub 10 rezoluții);
  - aria netă crește la exterior și scade la interior; un interior care dispare înseamnă „scula nu încape”, cu motiv;
    un exterior gol e un eșec;
  - **fiecare punct al traseului stă la |d| de conturul de intrare** (abaterea în ambele sensuri, Hausdorff, e cel mult
    0,002 mm), afară la exterior și înăuntru la interior;
  - **niciun contur nu se atinge pe el însuși, și nici două contururi între ele**: freza ar trece de două ori pe același
    loc;
  - **orientarea:** insulele merg în sens trigonometric, găurile în sens orar (adâncimea de includere pară = insulă).

  La o verificare picată se încearcă o dată cu |d| + 1e-6, apoi se refuză cu motiv. **Niciodată un traseu tăcut greșit:**
  pentru orice intrare validă, aplicația dă fie offsetul corect, fie un refuz cu motiv.
- **Ce trebuie să reușească:** cercurile, dreptunghiurile (rotunjite sau nu, rotite), haltera și inelul cu fantă din
  s1, la scările 1–2 440 mm, adică formele cu care se lucrează azi și cele de pe placa 2.
- **Ce poate fi refuzat, cu motiv, până la reparațiile lui cavalier** (ADR 0005) **și la biarce** (felia 2.7):
  poligoanele oarecare din linii și arce și poliliniile dense. Măsurat pe 08.10: la un poligon de 600 de laturi pe raza
  1, cavalier se abate cu 0,017 mm; la un poligon de 13 vârfuri pe scara 1, offsetul interior de 0,0755 se taie singur
  într-un punct. Pentru ele, oracolul acceptă offsetul corect sau un refuz, niciodată un rezultat greșit, și numără
  refuzurile (cifra intră în fișă, ca dovadă pentru reparații).
- **Topologia** se judecă pe puncte: un punct e în rezultatul exterior dacă e în conturul de intrare sau la cel mult |d|
  de marginea lui; în rezultatul interior, dacă e în contur și la cel puțin |d| de margine. Punctele dintr-o bandă de
  max(2e-4 × diagonala, 0,003 mm) în jurul marginii așteptate nu se judecă. Interiorul rezultatului se citește cu regula
  `evenodd` (ADR 0003). Banda e grosieră la mărimea foii; abaterea în ambele sensuri (de mai sus) e verificarea fină.
- **Limita cunoscută:** un contur se decalează singur. Găurile unei litere sau ale unei piese se decalează împreună abia
  cu regiunea păstrată (felia 2.3).

## Placa 2

MDF 12, freză Ø6.

| Cota | Valoarea | Toleranța |
|---|---:|---:|
| piesa, cu colțuri R10 | 120,00 × 80,00 | ±0,2 |
| colțul (leră) | R10 | — |
| grosimea urechii | 2,0 | ±0,2 |
| lungimea urechii | 8,0 | ±0,5 |
| gaura cu dog-bone | 40,00 × 30,00 | ±0,2; cepul 40 × 30 intră fără forță |
| logoul SVG, cu lățimea declarată 80 mm | 80,00 | ±0,3 |
| urma de intrare în piesă | 0 | ≤ 0,1 |

Placa confirmă regiunea păstrată (defectul care a stat ascuns 105 zile în ediția întâi) și urechile pe hârtie.
**Live:** nu.

## Rândurile de prag

Se închide profilul (B1, B2). Importul SVG (A4) se închide pe partea lui de SVG.

## Jurnalul feliilor

| # | Started | Completed | Treceri | Nota |
|---|---|---|---:|---|
