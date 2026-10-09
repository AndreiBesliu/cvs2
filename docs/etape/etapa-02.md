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
| 2.3a | Regiunea păstrată (ADR 0026), cu oracolul întâi (invarianta 2 în poartă, sesiune independentă); exportul refuză tăietura care intră într-o piesă | B1 | R2 | 2.2 |
| 2.3b | Sensul de tăiere (urcare / opoziție), pe operație, cu implicitul ales de owner; schema v4 | B1 | R2 | 2.3a |
| 2.3c | Profilul pe orice contur: și pe cele deschise, pe o parte (stânga / dreapta), la nivelul CAM, pentru importul SVG | B1 | R2 | 2.3a |
| 2.4 | Urechile ca modificator Z(s), portate cu cele 88 de verificări pe hârtie; vârful urechii măsurat de la fundul materialului (`docs/PORTARE.md` §3.1) | B1 | R2 | 2.3a |
| 2.5 | Intrările și ieșirile, alese față de regiunea păstrată, plus rampa (portate, `docs/PORTARE.md` §3.2) | B1 | R2 | 2.3a |
| 2.6 | Dog-bone și T-bone | B2 | R1 | 2.3a |
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
  arce de 180°), un contur mai mic decât rezoluția (diagonala cutiei vârfurilor sub 0,01 mm), sau un contur care se
  autointersectează (aria zero, de exemplu două vârfuri legate doar de linii, e un caz al lui): două
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

  La o verificare picată se încearcă o dată cu |d| + 1e-4 mm, apoi se refuză cu motiv. Pasul trece de pragul de
  topologie pe care îl decide epsilon-ul lui cavalier (s1-V §5.4): la un gât lat exact cât 2d, cavalier dă un contur care
  se atinge singur, iar la 1e-4 mai încolo, cele două insule corecte (măsurat pe 08.10). 0,1 µm e sub rezoluția postului. **Niciodată un traseu tăcut greșit:**
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
| 2.1 | 08.10 16:08 | 08.10 17:15 | 4 | Gărzile offsetului, după contractul din fișă (versiunea 2). Oracolul l-a scris o sesiune independentă, doar din contract: 83 de teste de legătură, 22 de sabotaje pe oracol și 12 stricăciuni ale aplicației, toate prinse. **La primul contact a găsit un offset greșit și tăcut:** la halteră, exteriorul de 1 mm ieșea la 0,15 mm de intrare (arcele de peste 180°, pe care cavalier nu le primește); plus inelul refuzat degeaba și poligoanele dese refuzate de toleranța implicită a lui cavalier (1e-5). Ieșirea se verifică acum singură: distanța fiecărui punct, partea, atingerile, orientarea. Refuzuri pe „corect sau refuzat”: 2 din 213 (cavalier se taie singur pe un poligon de scara 1; se abate cu 0,017 mm pe o polilinie densă). La un gât lat exact cât 2d, a doua încercare cu +1e-4 mm dă cele două insule corecte. 19 otrăvuri pe fațadă, 18 prinse (cea scăpată, coarda în loc de curbă, e echivalentă după împărțirea arcelor mari). **Treceri:** (1) gărzile; (2) oracolul: haltera, inelul, poligoanele dese, apoi contractul v2 (zece pericole ale lui); (3) curățarea ieșirii muta arcele, deci rămân segmentele scurte reale; (4) otrăvurile: verificările ieșirii n-aveau caz care să le declanșeze, deci au devenit testabile direct. 624 de teste unitare, 26 e2e. |
| 2.2 | 08.10 19:01 | 08.10 22:45 | 6 | Operațiile în document (ADR 0025, schema v3, migrarea v2 → v3): profilul, cu latura, adâncimea, pasul și freza, stă în piesă; se salvează, se anulează cu Ctrl+Z, iar exportul le citește din document. Placa 1 iese neschimbată după migrare (implicitele sunt cele de până acum). Oracolul v3 l-a scris o sesiune independentă: 752 de teste de legătură verzi pe aplicație, 38 de sabotaje pe oracol prinse. **Recenzia adversarială** (21 de agenți, 3,0 M, 100 min; anunțasem 1,5 M) a confirmat 15 din 17 constatări, cea mai gravă: în fila care citește, dialogul de export arăta valori vechi și, după preluarea scrierii, le scria înapoi peste munca celeilalte file. Plus virgula zecimală („2,5” era 25, salvat și tăiat), frezele amestecate, bucla pătratică, o filă care nu putea citi versiunea nouă și ținea blocarea. **Reverificarea** (un agent, 0,30 M): 7 din 7 reparate, 6 probleme noi mici, 5 reparate (colțul și Z0 nu se mai pierd la o versiune nouă, exportul în curs aruncat se spune, numerele se arată exact, fila „necitită” nu exportă versiunea veche, „aceeași sculă” = număr + diametru peste tot). **Otrăvuri:** 51 pe instantaneu și 33 pe codul final, într-un worktree în afara Drive-ului; toate prinse în afară de un mutant echivalent (garda din aplicație pentru o scriere pe care dialogul n-o permite); 5 goluri închise cu teste noi. **Treceri:** (1) implementarea, plus garda marginilor (Ø150 ar fi salvat un proiect care nu se mai deschide); (2) oracolul și elementul oglindit; (3) recenzia; (4) otrăvurile, cu 4 teste noi; (5) reverificarea; (6) runda finală de otrăvuri. 1022 de teste unitare, 35 e2e. |
