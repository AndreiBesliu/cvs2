# ADR 0091: Fundul plat al V-carve-ului, cu freza dreaptă

**Starea:** acceptat pe 27.10.2026. Felia 8.2↑, adusă din etapa 8 în etapa 3, fără mașină („continua”, după V-carve-ul cu
freza în V, ADR 0090). **Rândul din prag:** „V-carve (inclusiv cu freză dreaptă pentru fund plat)”
(`ACOPERIRE-ARTCAM-DESKPROTO.md`): cu felia asta, **făcut** în aplicație; proba fizică rămâne a plăcii etapei 8. **Urmează:**
`PLAN.md` T7 și sonda s3 (`docs/faza2/sonde/s3-vcarve/RAPORT.md` §4, §6). **Documentul:** v15.

**Problema.** Unde regiunea e mai lată decât freza în V la adâncimea maximă D (r > D·tan(θ/2)), V-carve-ul taie pereții și
axa, iar fundul plat dintre ei rămâne netăiat (ADR 0090 §4). La litere mari și firme, fundul plat e chiar ce se vrea: o
freză dreaptă îl scoate repede, iar freza în V face doar pereții.

## Decizia

**1. Documentul v15.** Operația V-carve primește un câmp opțional, `fundPlat?: { scula: { numar, nume, diametru }, pasLateral }`:
freza dreaptă care scoate fundul și distanța dintre inelele ei (mm). Lipsă = ca în v14 (fundul rămâne, cu avertisment). Ușa
judecă forma (scula ca a operației: numărul întreg 1–999, diametrul în (0, 100]; pasul lateral pozitiv, cel mult 50); potrivirea
o judecă lucrarea: `fundPlat` doar pe un V-carve, freza lui plată (o `forma` e refuzată), pasul lateral cel mult raza ei, iar
numărul ei e al altei freze decât V-ul (același T cu două forme e conflictul de freze, ADR 0084, ADR 0090 §1). Migrarea
v14 → v15 schimbă doar numărul; un document marcat v14 cu un câmp propriu `fundPlat` pe o operație e refuzat („nu e un document
v14 valid”). Oracolul documentului (al sesiunii aplicației, ca v11–v14) e mutat pe v15.

**2. Traseul** (`src/cam/vcarve.ts`, după s3 §4 și §6), cu w(L) = L·tan(θ/2), R_f raza frezei drepte, m = `MARJA_FUND`
(0,002 mm):
- **freza dreaptă, întâi, pe niveluri:** pe fiecare nivel L_k al trecerilor (`adancimiTreceri(D, pas)`), buzunarul
  (`ineleBuzunar` + `traseuBuzunar`, ADR 0069: inele dinăuntru în afară, plonjarea dreaptă, sensul operației) în zona
  F_k = {d ≥ w(L_k) + m}, adică în regiunea decalată cu −(w(L_k) + m). Marginea frezei stă la cel puțin w(L_k) + m de contur,
  deci nu taie în pereți; acoperă tot ce poate atinge un disc de raza R_f în F_k (deschiderea lui F_k), iar zona nivelului
  k e în cea a nivelului k − 1, deci fiecare nivel scoate cel mult pasul. Unde nu încape, nivelul n-are inele acolo;
- **freza în V, apoi, pe aceleași treceri ca în v14,** dar:
  - axa rămâne doar unde r < w(D) + m + R_f (mai departe de perete, freza dreaptă a scos-o deja la −D);
  - inelul peretelui (regiunea decalată cu w(D), la −D), ca în v14;
  - **inelele colțurilor:** unde freza dreaptă nu ajunge (Q = F − deschiderea lui F cu R_f: colțurile ascuțite și canalele mai
    înguste de 2·R_f), inele la w(D) + j·s_v, j = 1, 2, …, cu s_v = 2·c·tan(θ/2) și creasta c = `CREASTA_FUND` (0,05 mm),
    până la R_f + m + s_v; din fiecare inel rămân bucățile la peste R_f − s_v/2 de zona centrului frezei drepte. Un punct
    neatins de freza dreaptă (la peste R_f de zona ei) e atunci la peste s_v/2 de inelul următor, deci la sub s_v/2 de unul
    păstrat: creasta e cel mult c. Inelul paralel cu un perete drept, la w(D) + s_v, e atins (m < s_v/2) și nu se taie. La
    −D, pe fiecare trecere, ca inelul peretelui. Conul la −D, oriunde în F, nu sapă sub ideal;
- **fără fund plat** (forma mai îngustă decât V-ul la D): freza dreaptă nu taie nimic și nu se montează; avertisment.
  Freza dreaptă care nu încape nicăieri în fundul de la D: tot fundul îl fac inelele V, cu avertisment; pe nivelurile de sus,
  unde zona e mai lată, ea poate tăia (și atunci se montează);
- un offset care cade pe un prag de topologie (exact cât raza cercului înscris, unde regiunea e o linie, sau un gât lat exact
  2d: „se atinge singur”) se reia puțin mai departe de contur (0,001, 0,002, 0,005 mm), ca inelele buzunarului: nici V-ul la
  −D, nici marginea frezei drepte nu ajung atunci în pereți.

**3. Lucrarea** (`src/cam/job.ts`): pe un V-carve cu fund plat, schimbarea la freza dreaptă (dacă taie ceva), buzunarele ei pe
niveluri, apoi schimbarea la freza V și trecerile ei, fiecare cu eticheta ei. Prima sculă a programului e prima montată (nu
neapărat cea a primei operații: un V-carve cu fund plat începe cu freza dreaptă). Verificarea frezelor (același T = același
diametru și aceeași formă) cuprinde și freza fundului.

**4. Fereastra exportului.** Pe un rând V-carve, sub rând: bifa „Fundul plat cu freza dreaptă”, cu numărul (implicit T-ul
V-ului + 1), diametrul (implicit 3,175 mm) și pasul lateral (implicit 40 % din diametru, la 0,1 mm); câmpurile rămân scrise și
cu bifa scoasă. Conflictul de freze ia și freza fundului. Exportă scrie `fundPlat` doar pe un V-carve cu bifa pusă (îmbinat cu
cel din document: un câmp necunoscut rămâne); altfel câmpul pleacă. Panoul și arborele spun freza fundului.

## Probele

- pe hârtie: dreptunghiul 40 × 20 la V90, D = 3, cu freza dreaptă Ø3 (pasul lateral 1,2): fundul la −3 pe tot dreptunghiul
  interior de la 3 mm de pereți, pereții −d până la d = 3; la V60, lățimea fundului 20 − 2·3·tan 30° = 16,536;
- oracolul simulării (`test/oracles/simulare.ts`, independent), câte o judecată pe sculă (programul tăiat la schimbare),
  suprafețele unite prin minim, față de idealul −min(D, d·cot(θ/2)) cu d pe hârtie, pe forme cu colțuri ascuțite, cu un canal
  mai îngust decât freza dreaptă și cu un inel: niciodată mai adânc de 0,002 mm, material lăsat cel mult 0,015 mm departe de
  colțuri și cel mult c + 0,015 mm în colțuri; nimic în afară;
- fiecare trecere a fiecărei freze scoate cel mult pasul (prefixele, pe oracol, cu suprafața de dinainte);
- freza dreaptă nu taie mai aproape de perete decât w(L_k) (oracolul, cu discul ei);
- lucrarea: schimbările de sculă și ordinea, prima sculă a programului, conflictele, refuzurile (fundul pe alt fel, freza fundului
  în V, pasul lateral prea mare, același T); fără fund plat, freza dreaptă nu se montează;
- ușa v15 și migrarea; ce scrie Exportă;
- e2e (Edge): bifa, câmpurile, conflictul, oracolul pe octeții din browser (programul cu `T… M6`), operația în proiect;
- mutațiile țintite: în jurnalul feliei (`docs/etape/etapa-03.md`, 8.2↑).

## Limitele

- Creasta din colțurile pe care freza dreaptă nu le atinge e de cel mult c = 0,05 mm (s3: un compromis cost / precizie); c
  ca parametru al omului vine dacă placa o cere.
- Inelele colțurilor se calculează pe toată regiunea (câte un offset pe inel, s3: secunde pe o firmă); offsetul doar lângă Q
  vine dacă o firmă reală e prea lentă.
- Freza dreaptă coboară prin plonjare dreaptă (ca buzunarul fără coborare); rampa sau elicea pentru fund vin dacă o freză care
  nu taie în centru o cere.
- Proba fizică (fundul la D ±0,1, lățimea lui) e a plăcii etapei 8.

## Respinse

- **Fundul curățat cu freza în V** (inele dese pe tot fundul): vălurit sau foarte lung (ADR 0090, „Respinse”); aici inelele V
  stau doar în colțuri.
- **Fundul ca operație separată** (un buzunar pe contururile decalate, scris de om): lățimea fundului depinde de unghi și de
  D, iar o schimbare a lor l-ar lăsa greșit; fundul e al V-carve-ului.
- **Freza dreaptă după V** (ordinea inversă): merge (fiecare trecere tot ≤ pas), dar freza dreaptă scoate grosul, deci vine
  întâi, ca la ArtCAM.

## Se redeschide dacă

- placa etapei 8 arată fundul sau pereții în afara toleranței;
- owner-ul cere creasta ca parametru, coborârea frezei drepte în rampă sau elice, ori a treia freză (curățarea colțurilor cu o
  freză dreaptă mai mică).
