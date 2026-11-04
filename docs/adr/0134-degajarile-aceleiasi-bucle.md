# ADR 0134 — Degajările aceleiași bucle: față de pereții piesei și între ele

**Starea:** acceptat pe 04.11.2026, în felia 3.U, fără mașină. Întrebarea: „continua”. Felia vine după regula de până acum:
etapa cea mai devreme cu ceva rămas fără mașină. Asta e etapa 2, cu limita lăsată deschisă în ADR 0032: „Degajările aceleiași
bucle nu se judecă între ele: cu formele de azi nu se pot întâlni (se redeschide la 2.7)”. **Rândul din prag:** „Fileturi la
colțuri interioare: dog-bone și T-bone” (`ACOPERIRE-ARTCAM-DESKPROTO.md`); rămân colțurile cu arce și placa 2. **Precizează:**
ADR 0032 §5, cu precizarea din 11.10. **Documentul:** neschimbat (v19).

**Problema.** ADR 0032 judecă drumul unei degajări doar față de ce e în afara buclei ei: traseele și degajările celorlalte bucle,
urechile, marginea foii. Nu-l judecă față de restul piesei lui și nici față de celelalte degajări ale aceleiași bucle. Pe 11.10,
formele erau dreptunghiuri și cercuri, deci nu se puteau întâlni. De atunci, editorul de vectori (etapa 6) și importurile (DXF,
SVG, PDF, EPS, WMF) dau orice poligon. Măsurat pe 04.11, pe `main` (`46abd2a`), cu programul aplicației: o gaură 60 × 50 cu o
limbă de material păstrat lată de 2 mm și lungă de 35, care pleacă din peretele de jos, freza Ø6.
- **T-bone:** pereții lungi ai colțurilor de la baza limbii sunt chiar laturile ei, deci crestăturile intră în ea. E = (28, 3) și
  (30, 3), iar discul de rază 3 de la E acoperă toată lățimea limbii. Limba se desprinde la bază, fără niciun avertisment.
- **Dog-bone, limba de 1 mm:** cele două discuri se suprapun în limbă.
- **T-bone, limba de 6 mm:** discurile se ating (0 mm rămași).

La fel pățesc degetele unei îmbinări cu degete tăiate pe exterior, cu T-bone în laturile lor: crestăturile din cele două goluri
vecine se întâlnesc în deget.

## Decizia

**1. Două condiții noi la §5.** Se adaugă după cele de azi: d (pereții piesei) și e (degajările aceleiași bucle). Un colț care
nu trece de una dintre ele rămâne fără degajare, cu avertisment, ca la §5. Ordinea verificărilor (deci și a motivelor) e: a
(traseele), a (candidații), b (urechile), c (foaia), d, e. Unde nu pică nici d, nici e, programul și avertismentele rămân
aceleași, octet cu octet. Proba: amprentele programelor cu degajări ale corpusului 2.6 (110, dintre care 53 cu colțuri
omise) și ale cazurilor §8 (104), cu avertismentele lor, sunt cele de pe `46abd2a`, socotite într-o clonă curată.

**2. Condiția d: pereții piesei.** Conturul e cel al elementului, curățat ca la §2: linii și arce, cu cubicele ca biarce. Pentru
un colț V cu drumul [Q, E] se ia fiecare segment σ al conturului, în afară de cele două care se întâlnesc în V. Pe drum, c e
punctul cel mai apropiat de σ, iar pe σ, p e cel mai apropiat de c, la distanța δ = |cp|.
- **δ < R − 10⁻⁶:** discul frezei de pe drum trece de σ, deci intră în materialul păstrat de dincolo de el;
- **R − 10⁻⁶ ≤ δ < R + 1 mm:** între disc și σ rămân δ − R < 1 mm. Contează doar dacă discul e în K spre σ, adică dacă
  degajarea taie în materialul păstrat chiar în direcția lui. Proba se face în punctul discului cel mai apropiat de σ,
  s = c + R·(p − c) / δ. Dacă s e în K, între crestătură și σ rămâne sub 1 mm de material păstrat.

În oricare dintre cazuri, degajarea se omite. Un gol prin deșeu nu oprește nimic:
- într-o fantă puțin mai lată decât freza, drumul din colț stă la mai puțin de R + 1 mm de peretele din față, dar s e în
  fantă;
- o aripioară subțire din desen, la sub 1 mm de discul din Q (deci și de traseul buclei), nu oprește degajarea colțului: s e
  în deșeu, iar degajarea nu se apropie de ea mai mult decât traseul.

**3. Condiția e: degajările aceleiași bucle.** Se judecă doi candidați ai aceleiași bucle, în sensul precizării din 11.10: Q pe
buclă și drumul departe de traseele celorlalte bucle. Fie δ distanța dintre drumurile lor, c₁ și c₂ perechea cea mai apropiată
de puncte, câte unul pe fiecare drum, și û direcția de la c₁ la c₂. Probele sunt punctele discurilor cele mai apropiate de
celălalt drum, s₁ = c₁ + R·û și s₂ = c₂ − R·û; cu drumurile atinse, punctul de atingere. Dacă δ < D + 1 mm și una dintre probe
e strict în K (la peste 10⁻⁶ mm de contur), un disc taie în materialul păstrat spre celălalt, iar între crestături rămâne sub
1 mm, sau deloc. Atunci se omit amândouă, deci ordinea nu contează. Altfel rămân amândouă:
- **probele în deșeu:** cele două colțuri de la capătul unei fante;
- **o probă pe contur:** două T-bone-uri intră în același perete, din capetele lui, iar crestăturile lor se unesc. Exemplul e o
  mortiză 10 × 6,5 cu Ø6. Acolo nu rămâne nimic subțire de care să se rupă ceva.

**4. K.** K e partea păstrată a elementului: înăuntrul conturului pe `exterior`, în afara lui pe `interior`, după regula
`evenodd`. La d, o probă aflată la cel mult 10⁻⁶ mm de contur e socotită în K, ca parte sigură: discul atinge σ. La e, aceeași
probă nu e în K, pentru crestăturile care se unesc pe același perete (§3).

**5. Avertismentele.** Forma e cea de la §5: `<idLume>: degajarea omisă la colțul (x, y): <motiv>`. Motivele noi sunt:
- d: `prea aproape de alt perete al piesei`;
- e: `prea aproape de degajarea altui colț al buclei`.

**6. Ce nu se schimbă.** Colțurile de degajat rămân doar cele dintre două linii; cele cu un arc vin în felia următoare. Pereții
de la d pot fi și arce: colțurile rotunjite și biarcele unei curbe. Distanțele se măsoară exact, pe linii și pe arce, doar unde
cutiile nu le despart deja, ca la §5 a.

**7. Oracolul.** `test/oracles/degajari.ts` primește d și e, scrise după textul de aici, cu metodele lui, fără importuri din
`src/`:
- K e partea păstrată a elementului, citită cu includerea oracolului (`contine`: `evenodd` pe poligonul lui), nu cu cea a
  aplicației. Regiunea păstrată a foii (ADR 0026) nu merge aici: o gaură singură pe foaie n-are acolo niciun K în jur;
- perechea cea mai apropiată se caută numeric, pe drumul eșantionat și rafinat, cu distanța exactă la σ;
- la ± 10⁻⁵ mm de un prag, și când o probă e la 10⁻⁵ mm de contur, oricare verdict e acceptat.

La c (foaia), un drum al cărui disc stă la cel puțin 1 mm de fiecare latură a foii trece, chiar fără bucla citită, pentru că
cerința e min(1, golul buclei). Fără asta, verdictul unei căi pe hârtie ar rămâne în bandă. Cazurile pe hârtie cu limba, fanta și
mortiza intră în `test/oracles/degajari.cazuri.ts`.

## Ce am respins

- **Drumul judecat față de traseul propriei bucle,** fără segmentele din Q. O fantă cât freza plus 0,5 mm și-ar pierde toate
  degajările: latura lungă din față e la sub D + 1 de fiecare colț. O mortiză e chiar locul în care se cer degajările.
- **Bucla parcursă din Q, cu vecinătatea colțului sărită:** o limbă scurtă și subțire rămâne toată în vecinătate, deci se taie.
- **Regiunea tăiată în K, socotită prin boolean** (discul purtat pe drum ∩ K) și distanța ei la pereți. E exactă, dar grea pe
  fiecare colț: 1600 de găuri cu dog-bone ar plăti câte un boolean pe colț.
- **Proba în mijlocul golului dintre disc și σ (la d) sau dintre cele două drumuri (la e).** Era prima formă a deciziei.
  Otrava care muta proba pe marginea discului a scăpat de probe, iar căutarea cazului care le desparte a arătat o alarmă
  falsă. O aripioară subțire din desen, la sub 1 mm de discul din Q, oprea degajarea colțului, deși degajarea nu se apropie
  de ea mai mult decât traseul buclei.
- **La e, conturul socotit K:** mortiza 10 × 6,5 cu T-bone și-ar pierde toate cele patru degajări.

**Se redeschide dacă:** o placă arată o margine subțiată sub 1 mm pe care proba de aici n-a văzut-o, sau colțurile cu arce
(felia următoare) cer altă definiție a pereților vecini.
