# ADR 0087: Găurirea

**Starea:** acceptat pe 26.10.2026. Felia 5.4↑, adusă din etapa 5 în etapa 3, fără mașină, la alegerea owner-ului („1”, la
„Ce urmeaza?”: găurirea, recomandarea asistentului, înaintea V-carve-ului și a exportului 2D). **Rândurile din prag:**
„Găurire” (`ACOPERIRE-ARTCAM-DESKPROTO.md`) și „Găurire în pași (peck)” (`BRIEF.md`, v1). **Urmează:** `PLAN.md` T9 („găurirea
desfăcută în G0/G1”; ciclurile fixe G81 / G83 în v1.x). **Documentul:** v13.

**Problema.** Găurile de șurub, de diblu sau de balama se desenau ca cercuri și se tăiau ca profil interior: freza merge pe
contur, în treceri, iar pe un cerc cât freza drumul e un punct (refuzat de offset). Un atelier vrea găurile date de cercurile
desenului, la adâncime, fără un burghiu montat separat și fără ciclurile de găurire, pe care GRBL nu le are.

## Decizia

**1. Operația.** Încă un fel, `tip: 'gaurire'`, doar pe cercuri: latura `interior`, nimic din profil (urechi, rampă, intrări,
degajări, despărțire), cu `retragereCompleta` (un întreg 1–100, lipsă = 1): la al câtelea pas freza iese din gaură. Freza e a
rândului (ADR 0084), plată. Sensul rămâne al operației (urcare implicit, ADR 0027).

**2. Cum se găurește** (`src/cam/gaurire.ts`), după diametrul cercului în lume, Dc, față de al frezei, D:
- **Dc în D ± 0,02 mm: ciocănirea în centru.** Pașii cum îi dă profilul (`adancimiTreceri`: egali, de cel mult `pas`), cu
  avansul de plonjare. Între doi pași, freza se ridică `RETRAGERE_PARTIALA` = 1 mm (rupe așchia); după fiecare al
  `retragereCompleta`-lea, iese la Z-ul de siguranță (scoate așchia) și coboară rapid până la `APROPIERE` = 0,5 mm deasupra
  fundului de dinainte. Rapida rămâne mereu deasupra fundului deja găurit: nu atinge material.
- **D < Dc ≤ 2·D: elicea pe perete.** Centrul frezei pe cercul de rază (Dc − D) / 2, de la Z 0, cu n = numărul pașilor de mai
  sus ture egale (cel mult `pas` pe tură), apoi o tură plină la fund (fundul neted). Viteza pe Z nu trece de avansul de
  plonjare (`parcurge`, ca rampa profilului, ADR 0029 §3). Sensul: la urcare trigonometric (peretele, materialul de păstrat, în
  dreapta mersului), la opoziție orar.
- **Refuzate, cu motiv:** Dc < D − 0,02 (gaura ar ieși cât freza, mai mare decât cercul) și Dc > 2·D (discul frezei nu mai
  acoperă centrul: ar rămâne un miez, deci e un buzunar). Toleranța de 0,02 mm e cea a oracolului simulării: o gaură de Ø6
  dintr-un cerc de Ø6,02 iese cu 0,02 mai mică, deci tot în toleranță.

**3. Doar G0 / G1 / G2 / G3.** Fără G73 și G81–G89: același program pe toate controlerele familiei (T9); antetul scrie G80, care
le anulează. Elicea e un arc cu Z în IR; un contract care nu declară elicea o primește în segmente G1 (ADR 0083).

**4. Lucrarea** (`programDinDocument`). Un cerc e o formă `cerc` sub o asemănare (un cerc deformat, o elipsă, nu trece de
ușa documentului); centrul și diametrul vin din matrice, cu scara ei. Ce poartă ceva din profil e refuzat (despărțirea, de garda ei, înaintea găuririi).
Găurirea e în clasa interioarelor (se taie înaintea exterioarelor, ca o gaură de profil). Ca buzunarul, nu e inel al regiunii
păstrate (`regiune.ts`): scoate material doar din cercul ei, deci regiunea rămâne a celorlalte operații.

**5. Fereastra exportului.** Pe un rând numai cu cercuri, Tăietura are și „găurire”; ce e al profilului se oprește, cu
motivul în titlu, ca la buzunar. Sub rând, „Iese la fiecare al … pas” (implicit 1); în afara 1–100, exportul se oprește, cu
motivul. Pe un dreptunghi (sau un rând cu o formă care nu e cerc), opțiunea nu apare. Ce scrie Exportă: `tip: 'gaurire'`,
latura interior, nimic din profil; implicitul 1 nu se scrie pe o operație care nu-l avea (un Exportă fără schimbare nu scrie o
comandă); câmpul pleacă la trecerea pe profil sau pe buzunar. Panoul de proprietăți arată „găurire” și retragerea.

**6. Documentul v13** (`VERSIUNE_SCHEMA = 13`): `tip` primește „gaurire”, `retragereCompleta` e opțional pe operație (ușa: un
întreg 1–100). Migrarea v12 → v13 schimbă doar numărul; un document marcat v12 care are deja o găurire sau câmpul
`retragereCompleta` e refuzat („nu e un document v12 valid”), ca la migrările de dinainte. Oracolul documentului (scris de
sesiunea aplicației, ca v11 și v12) e mutat pe v13 cu aceleași probe.

## Probele

- pe hârtie: Ø6 cu Ø6, 10 mm cu pasul 3 = 4 pași de 2,5 mm, ieșirea după fiecare; cu ieșirea la al treilea, retragerile
  parțiale de 1 mm între; toleranța (Ø6,02 în centru, Ø6,03 în elice); elicea Ø10 cu Ø6 = 4 ture de 2,5 mm pe cercul de rază 2,
  apoi un cerc la fund, trigonometric la urcare; refuzurile, cu motivul;
- lucrarea: două găuri (în centru și în elice), cu etichetele lor; nu sunt inele ale regiunii; clasa interioarelor; refuzurile
  (dreptunghiul, elipsa, cercul prea mic sau prea mare, ce e al profilului, adâncimea peste foaie); retragerea citită din
  document;
- G-code-ul pe toate contractele: fără G73 / G81–G89; între două ieșiri, freza coboară în material cel mult pasul;
- oracolul simulării (independent), pe G-code-ul exportat: Ø6 în centru (10 mm), Ø10 în elice și Ø12 (cât două diametre, 8
  mm): fundul întreg, peretele la raza cercului, nimic în afară (± 0,02 mm);
- ușa v13 și migrarea; ce scrie Exportă (implicitul nescris, câmpul care pleacă, operația care trece de ușă);
- e2e (Edge): cercul de Ø30 cu freza Ø6 refuzat („trece de două diametre”), cu Ø30 ciocănirea (pașii −2,5 / −5 / −7,5 / −10,
  retragerile la −1,5 și −6,5, ieșirea după al doilea pas), cu Ø16 elicea (G3 cu Z), oracolul simulării pe octeții din browser;
  retragerea 0 oprește exportul; operația rămâne în proiect și în panou; dreptunghiul n-are opțiunea;
- mutațiile țintite: în jurnalul feliei (`docs/etape/etapa-03.md`, 5.4↑).

## Limitele

- Doar freza plată a rândului: un burghiu cu vârf (unghiul vârfului, adâncimea până la diametrul plin) vine cu biblioteca de
  scule.
- Găurile vin doar din cercuri desenate; un punct sau o listă de coordonate nu sunt încă forme ale documentului.
- Ordinea găurilor e a documentului, în clasa lor; drumul cel mai scurt între ele vine cu ordinea operațiilor (rândul din prag).
- Proba fizică (o placă cu găuri ciocănite și în elice, cotele măsurate) e a plăcii etapei 5.

## Respinse

- **Ciclurile fixe G81 / G83** (programul mai scurt): GRBL nu le are, iar grblHAL și FluidNC le tratează diferit; T9 le lasă
  pentru v1.x, pe contractele care le declară.
- **Elicea și peste 2·D**, cu un miez lăsat: un miez desprins se rupe și se învârte sub freză; peste 2·D e un buzunar, cu
  coborârea lui în elice (ADR 0076).
- **Găurirea fără toleranță** (doar Dc = D exact): un cerc importat din SVG are rareori diametrul exact; 0,02 mm e toleranța în
  care gaura iese cât cercul.

## Se redeschide dacă

- placa etapei 5 arată gaura mai mare sau ovală (retragerea parțială prea mică pentru așchia lemnului, sau peretele elicei);
- owner-ul cere burghiul cu vârf, găurile pe puncte sau ciclurile fixe pe un controler care le are.
