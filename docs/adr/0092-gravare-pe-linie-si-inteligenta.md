# ADR 0092: Gravarea pe linie cu freza în V și gravarea inteligentă

**Starea:** acceptat pe 27.10.2026. Felia 8.3↑, adusă din etapa 8 în etapa 3, fără mașină („continua”, după fundul plat al
V-carve-ului, ADR 0091). **Rândul din prag:** „Gravare pe linie; gravare «inteligentă» cu colțuri ascuțite (smart engrave)”
(`ACOPERIRE-ARTCAM-DESKPROTO.md`): cu felia asta, **în lucru**; rămân lista de freze de golire (de la cea mai mare la cea mai
mică, cu „doar unde freza mare n-a ajuns”), care vine cu buzunarul cu mai multe freze (rest machining, rândul „Buzunar cu mai
multe freze”), și proba fizică a plăcii etapei 8. **Urmează:** `PLAN.md` T7 (etapa 8: „Gravare pe linie + smart engrave”),
sonda s3 (`docs/faza2/sonde/s3-vcarve/RAPORT.md` §5: „smart engrave, adică axa trunchiată unde r depășește raza frezei de
gravare, cu freza V doar spre colțuri”) și criteriul de acceptare din cercetare (`CERCETARE-DETALIATA.json`, grupa B).
**Documentul:** v16.

**Problema.** Trei lucruri:
- **Gravarea pe linie** (ArtCAM „Along”, DeskProto „On curve”): centrul unei freze în V merge exact pe vector, la o adâncime,
  ca o peniță; canalul iese lat de 2·d·tan(θ/2). Tăietura „pe linie” exista (ADR 0027, ADR 0037), dar doar cu freza plată.
- **Gravarea inteligentă** (smart engrave, doar în ArtCAM Premium / Standard 2018.1): interiorul literelor golit cu freze
  drepte, apoi o freză de gravare (un con cu vârf plat, de obicei 15° pe flanc) face pereții înclinați și urcă în colțuri ca să
  le ascută. Freza de gravare nu exista: freza în V (ADR 0090) avea vârful ascuțit.
- **Un defect găsit înainte de lucru:** fereastra lăsa freza în V pe orice rând, iar pe un profil exterior / interior / pe o
  parte, un buzunar sau o găurire, lucrarea o decala cu Ø/2, ca pe una plată. V90 Ø6 la 1 mm pe un pătrat de 20: traseul la
  3 mm de contur, peretele la suprafață la 2 mm de el, piesa cu 2 mm mai mare pe fiecare parte, fără niciun mesaj.

## Decizia

**1. Documentul v16.** Două câmpuri opționale:
- `scula.forma.varf` (și pe scula fundului plat, unde lucrarea refuză oricum o formă): diametrul vârfului plat al frezei în V,
  în mm; lipsă = ascuțit (ca în v15). Ușa: un număr finit în (0, 100]; potrivirea (sub diametru) e a lucrării. Freza cu vârf e
  conul trunchiat: h(r) = 0 pe r ≤ a = varf / 2, apoi (r − a)·cot(θ/2), până la Ø / 2.
- `directie` pe operație: `invers` sau `scurt`; lipsă = în sensul desenului (ca în v15). Ușa: una dintre cele două; potrivirea
  (doar pe linie) e a lucrării.

Migrarea v15 → v16 schimbă doar numărul; un document marcat v15 cu un câmp propriu `directie` pe o operație, sau `varf` în forma
frezei unei operații ori a fundului ei plat, e refuzat („nu e un document v15 valid”): v15 l-ar fi tăiat cu vârful ascuțit sau
în sensul desenului. Oracolul documentului (al sesiunii aplicației, ca v11–v15) e mutat pe v16.

**2. V-carve-ul cu vârful plat** (`src/cam/vcarve.ts`, parametrul `varf`): pe axă, z = −min(D, (r − a)·cot(θ/2)), doar pe
bucățile cu r > a (mai îngust, vârful n-are loc nici la suprafață; la r = a atinge suprafața). Peretele de la −D rămâne la
D·tan(θ/2) de contur (conul trunchiat la −L are peretele la L·tan(θ/2), oricare ar fi vârful), deci centrul inelului peretelui
e la w(D) = a + D·tan(θ/2). Cu fundul plat (ADR 0091): zona frezei drepte pe niveluri rămâne {d ≥ L·tan(θ/2) + m}; axa V rămâne
unde r < D·tan(θ/2) + m + R_f; inelele colțurilor stau la s_v = t + 2·c·tan(θ/2) unul de altul (între două conuri trunchiate
la distanța s, creasta e max(0, s/2 − a)·cot(θ/2), deci tot c), păstrate unde sunt la peste R_f − s_v/2 de zona centrului
frezei drepte (aceeași demonstrație ca în ADR 0091 §2, cu raza vârfului scăzută din distanța la inel). Refuzat, cu motiv:
vârful în afara [0, Ø), regiunea nicăieri mai lată decât vârful, conul ((Ø − t) / 2)·cot(θ/2) mai scurt decât adâncimea.

**Gravarea inteligentă e chiar asta:** un V-carve cu fundul plat (freza dreaptă întâi, pe niveluri, fără să atingă pereții) și
o freză de gravare (conul cu vârf plat), care face pereții și urcă pe axă spre colțuri, până unde vârful atinge suprafața;
colțurile rămân rotunjite cu raza vârfului, nu cu a frezei drepte. Nu e o operație nouă: același nucleu (s3 §5: „un singur
modul axa medială → traseu”), aceeași fereastră; manualul o numește.

**3. Freza în V în lucrare** (`src/cam/job.ts`): doar pe linie (centrul pe vector, la adâncimea rândului, în trecerile
profilului) sau într-un V-carve. Pe o parte (exterior, interior, stânga, dreapta), într-un buzunar sau la o găurire, refuzată
cu motiv: decalarea ei corectă depinde de adâncime (r(d) = a + d·tan(θ/2)), adică e o teșire, care e a etapei 16. Pe linie,
conul ((Ø − t) / 2)·cot(θ/2) trebuie să ajungă la adâncime (altfel ar tăia coada frezei). Freza în IR poartă vârful
(`FormaScula`), iar conflictul de freze (același T) deosebește și vârful.

**4. Direcția pe linie** (§1, `directie`): `invers` = fiecare buclă a tăieturii în sens opus desenului (închisă: tot din vârful
0); `scurt` = o cale deschisă pornește din capătul mai apropiat de ultima poziție a frezei din program (prima tăietură a
programului, ca desenul; o buclă închisă rămâne cum e desenată). Doar pe un profil pe linie: pe altă latură, refuzată cu motiv
(acolo sensul de tăiere, ADR 0027, hotărăște direcția).

**5. Simularea** (`src/sim/nucleu.ts`): silueta V primește raza vârfului a. Pe o linie, z(s) + k·max(0, √(s² + p²) − a) e
convexă în s: minimul liber e punctul staționar al conului, mutat pe marginea discului vârfului (|s| = √(a² − p²), din partea
în care coboară segmentul) când iese în disc, apoi tăiat la capetele segmentului; pe arc și la plonjare, h(r) direct. Aceleași
operații deterministe (+ − × ÷ √ min max). Cu a = 0, formulele sunt cele dinainte, cifră cu cifră. Vârful e validat (în
[0, Ø)).

**6. Fereastra exportului.** La freza în V, lângă unghi, câmpul **Vârful** (mm; 0 = ascuțit, implicit); pe un rând pe linie,
alături de sens, alegerea **Direcția** (ca desenul / invers / cel mai scurt drum). Freza în V pe un rând care nu e pe linie sau
V-carve oprește exportul, cu motivul. Exportă scrie vârful doar peste 0 (numele frezei după el: „freza V30 varf 0.25”) și
direcția doar pe linie (ca desenul: câmpul pleacă). Panoul spune vârful și direcția; manualul (ro + en) are vârful, gravarea pe
linie, direcția și gravarea inteligentă.

## Probele

- **simularea:** nucleul cu vârful plat față de oracolul simulării (`test/oracles/simulare.ts`), căruia freza i se dă ca sculă
  de PROFIL ((0, 0), (a, 0), (Ø/2, (Ø/2 − a)·cot)), cu altă formulă: 6 piese (linie orizontală, oblică, rampă lină, coborâre
  abruptă, arc și cerc, plonjări), nucleul nu e mai sus decât oracolul cu peste 10 nm și nici mai jos peste marjă; aceleași
  piese pică cu vârful ascuțit (proba vede vârful); pe hârtie, canalul liniei: −1 pe |y| ≤ 0,125, apoi conul;
- **pe linie** (criteriul din cercetare, cu linii în locul fontului de o linie, care vine cu textul): V90 la 1 mm, canalul de
  2,00 mm (± 0,02) cu centrul pe vector (± 0,01), pe o linie și pe un cerc; freza de 30° cu vârful 0,25: 0,786 mm, fundul lat de
  0,25;
- **gravarea inteligentă** (criteriul din cercetare): pătratul 20 × 20, D = 2, freza dreaptă Ø2 și freza de gravare de 30° cu
  vârful 0,25 (Ø3,175): pe oracol, nimic mai adânc decât −min(D, d·cot 15°), nimic în afară; freza dreaptă, singură, rămâne
  deasupra pereților finali cu 0,00765 mm (marja m·cot 15° = 0,0075); peretele la 15,0000° față de verticală (± 0,5°); colțurile la
  suprafață cu raza 0,128 mm (≤ 0,15; martorul măsurii, un buzunar doar cu Ø2, dă 0,999 mm, pe hârtie 1);
- **V-carve-ul cu vârful**, pe hârtie: dreptunghiul 12 × 6 la 90° cu vârful 1 (Ø8), departe de capete −min(q, 3 − a) (abaterea
  0); nimic mai adânc decât −q; o regiune mai îngustă decât vârful, refuzată;
- **refuzurile**: freza în V pe exterior, interior, stânga, dreapta, buzunar, găurire; vârful cât diametrul; conul prea scurt
  pe linie (5,458 mm față de 6); direcția pe exterior; conflictul de freze cu alt vârf;
- **direcția**: ca desenul, invers, cel mai scurt drum (a doua cale pornește din capătul de lângă prima), bucla închisă;
- ușa v16 și migrarea v15 → v16; ce scrie Exportă (vârful, numele, direcția);
- e2e (Edge): V pe exterior oprit cu motivul; pe linie, vârful cât diametrul oprit; cu vârful 0,25 și direcția invers, canalul
  pe oracol pe octeții din browser; panoul și fereastra redeschisă;
- mutațiile țintite: în jurnalul feliei (`docs/etape/etapa-03.md`, 8.3↑).

## Limitele

- **Lista de freze de golire** (ArtCAM: mai multe freze cilindrice, de la cea mai mare, fiecare doar unde cea de dinainte n-a
  ajuns) vine cu buzunarul cu mai multe freze (rest machining): aceeași mașinărie servește buzunarul și fundul plat. Acum,
  una singură.
- Strategia raster a golirii, adâncimea de start (vectorii sub suprafață), „doar profil” și adâncimea proprie pe freză din
  ArtCAM nu sunt aici; adâncimea de start e a incrustațiilor (ADR 0090, „Limitele”).
- Freza în V pe o parte (teșirea pe contur) e a etapei 16 (teșirea, bevel); până atunci, refuzată.
- Direcția „cel mai scurt drum” alege doar capătul unei căi deschise; ordinea tăieturilor rămâne a documentului (ADR 0025,
  ADR 0084), iar pornirea unei bucle închise rămâne vârful 0.
- Proba fizică (canalul pe lemn, colțurile, pereții) e a plăcii etapei 8.

## Respinse

- **O operație nouă „gravare inteligentă”**: ar repeta V-carve-ul cu fundul plat cu altă freză; diferența e doar freza.
- **Freza în V pe o parte decalată cu raza ei la adâncimea finală** (ce ar fi făcut un CAM simplu): pereții ies teșiți, iar o
  trecere de sus nu atinge conturul; e teșirea, cu regulile ei (etapa 16), nu o reparație aici.
- **Vârful ca a doua formă (`tip: 'gravare'`)**: freza de gravare e un V cu platou; un câmp pe aceeași formă păstrează unghiul,
  conflictele și ușa.

## Se redeschide dacă

- placa etapei 8 arată canalul, pereții sau colțurile în afara toleranței;
- owner-ul cere ordinea întregului program după drumul cel mai scurt, pornirea buclelor închise din alt vârf, sau freza în V pe o
  parte înainte de teșire.
