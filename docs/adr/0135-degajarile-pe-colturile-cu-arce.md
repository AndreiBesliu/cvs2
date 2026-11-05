# ADR 0135 — Degajările pe colțurile cu arce

**Starea:** acceptat pe 05.11.2026, în felia 3.V, fără mașină. Întrebarea: „Start the next slice, 3.V (relief at corners with
an arc)?”. Răspunsul: „da, 3.V”. **Rândul din prag:** „Fileturi la colțuri interioare: dog-bone și T-bone”
(`ACOPERIRE-ARTCAM-DESKPROTO.md`); cu felia asta rămâne doar placa 2. **Urmează:** ADR 0032 („Colțurile cu un arc nu primesc
degajare: vin cu importul SVG”) și ADR 0134 (pereții din V). **Documentul:** neschimbat (v19).

**Problema.** ADR 0032 degajează doar colțurile dintre două linii. Un colț cu o latură curbă primește din 2.7b doar
avertismentul „o latură a colțului e curbă”. Astfel de colțuri vin din importurile SVG, DXF și PDF, din unealta Pen și din
boolean: un dreptunghi unit cu un cerc dă o piesă cu un „umăr” rotund, ale cărui colțuri sunt intrânde. Un „D” tăiat ca gaură
are două colțuri în care cepul cu muchii drepte nu intră.

## Decizia

**1. Colțurile.** Un colț de degajat poate avea acum o latură curbă, sau două. Colțul se caută pe conturul curățat de la §2
(ADR 0032), deci pe linii și arce: o cubică intră ca biarce, iar un arc de peste 180° ca două jumătăți. Regulile lui §2
rămân: tangenta se rupe în V spre deșeu (la stânga, cu K în dreapta), iar restul |QV| − R e de cel puțin 0,01 mm. Ruptura
trebuie să lase restul minim și între două linii, R / cos(φ/2) − R ≥ 0,01 (φ = cât se rupe mersul), ca la plasa de la §5:
o joncțiune netedă nu e colț, chiar dacă decalatele pereților se taie mai departe (la un dreptunghi cu colțurile rotunjite). Direcțiile
din V sunt tangentele segmentelor în V. La un arc, tangenta e coarda rotită cu ∓2·atan(bulge).

**2. Q.** Q e intersecția curbelor decalate cu R spre deșeu ale celor doi pereți din V (§3), segment cu segment:
- la o linie, dreapta paralelă;
- la un arc cu centrul C și raza r, cercul cu centrul C și raza r − R când deșeul e spre centru, r + R când e în afară; cu
  r − R ≤ 0, segmentul n-are decalată.

Dintre intersecții se ia cea mai apropiată de V, cu piciorul pe câte un segment al fiecărui perete (proiecția pe linie între
capete, unghiul pe arc în baleiajul lui). Piciorul poate cădea și pe un segment mai departe al peretelui: la o cubică, prima
biarcă e adesea mai scurtă decât drumul până la picior. Contează doar o încrucișare (|sin| dintre decalate peste 10⁻⁶): la o
joncțiune netedă, două decalate doar se ating. Ca la §2, Q trebuie să fie un vârf al traseului (la 10⁻⁶ mm). Fără o astfel
de intersecție nu există Q, deci nici degajare.

**3. E.** Ca la §3, din direcțiile din V:
- **dog-bone:** E = V + R·u, cu u bisectoarea lor spre deșeu. Cercul frezei trece prin V;
- **T-bone:** E = V + R·m, cu m normala spre deșeu a tangentei peretelui mai scurt. La egalitate (diferența sub 10⁻⁶ mm), lung
  e peretele de după V în sensul de mers, ca la §3.

**Peretele** unui colț cu o latură curbă e drumul de pe contur din V până la următoarea rupere a tangentei (|sin| > 10⁻⁶, sau
întoarcere), măsurat pe curbă. O curbă desenată e deci un singur perete, cu toate biarcele ei, iar un arc de peste 180° are
ambele jumătăți. La colțurile dintre două linii rămâne regula de până acum (lungimea laturii), deci programul lor e același.

Drumul rămâne Q → E → Q, două linii, la Z-ul curent (§4). Lângă un arc convex pentru K (K în cerc), discul purtat pe drum
poate intra în perete ceva mai mult decât discul din E, dacă drumul trece mai aproape de centru decât E. În cazurile pe
hârtie de aici, cel mai adânc punct e chiar E.

**4. Pereții din V la ADR 0134 (d).** Pereții care se întâlnesc în V sunt cei de la §3, întregi, nu doar primul segment.
Bucățile următoare ale unei curbe din V sunt peretele în care degajarea intră prin definiție. Altfel, la o cubică cu prima
biarcă scurtă, discul ar „trece” de a doua și ar opri orice degajare. Regula se aplică și colțurilor dintre linii: o linie
care se continuă tangent cu un arc e un singur perete.

**5. Plasa.** Avertismentul „o latură a colțului e curbă” dispare. Un colț cu o latură curbă, concav pentru K, cu restul de
cel puțin 0,01, la care o buclă trece la cel mult 2R / cos(φ/2) de V, dar care nu e candidat, primește
`<idLume>: degajarea omisă la colțul (x, y): freza nu ajunge în colț`. Cazul tipic: Q nu e vârf al traseului, pentru că
decalarea a mâncat colțul. Colțurile omise după condițiile de la §5 își spun motivul lor, ca până acum.

**6. Arcele sub rază.** Textul avertismentului de la §2 (precizarea din 11.10) devine: `<idLume>: colțul rotunjit cu raza r mm
(sub raza frezei, R mm) rămâne cu raza frezei; o degajare cere un colț ascuțit în desen`. „Degajarea pe arce vine cu importul
SVG” nu mai e adevărat.

**7. Oracolul.** `test/oracles/degajari.ts` primește colțurile cu arce, scrise după textul de aici, cu metodele lui:
- Q se caută numeric, prin Newton pe cele două distanțe: exacte la linii și arce, pe poligonul cubicei (săgeata 10⁻⁴) la cubice;
- E și pereții vin din laturile căii (L, A, C), cu pereții ca șiruri de laturi fără rupere de tangentă;
- **sosirea în Q** poate fi și un arc (G2 / G3), la un colț cu o latură curbă: o mișcare în material care se termină în Q și
  pornește la R de peretele de intrare (± 0,003, cotele rotunjite), deci vine pe buclă, de-a lungul lui. Intrarea, un sfert de
  cerc care se termină într-un Q (pornirea din vârful 0), pornește din deșeu, la altă distanță de perete, deci nu e sosire;
- pereții din V la d sunt cei de la §4;
- pe hârtie, cât intră degajarea într-un perete-arc se măsoară radial, față de cercul lui.

## Ce am respins

- **Q citit din traseu** (vârful ascuțit cel mai apropiat de V), fără valoarea de pe hârtie: nimic n-ar mai arăta că e colțul
  potrivit.
- **Q doar pe segmentele din V** (prima formă a deciziei): la o cubică, prima biarcă e adesea mai scurtă decât drumul până la
  picior, deci colțul ar fi rămas fără degajare. Un „D” cu semicercul în două arce (5° + 175°) arată la fel: piciorul cade pe
  al doilea arc (cazul D48).
- **Lungimea peretelui la T-bone = primul segment:** la o curbă, prima biarcă ar alege peretele după cum a ieșit aproximarea.
- **Arcul înlocuit cu coarda lui:** Q și E ar ieși greșit tocmai unde curbura contează.
- **E pe bisectoarea curbelor decalate (prin Q):** n-are o definiție simplă. Bisectoarea tangentelor păstrează regula
  „cercul trece prin V”.

**Se redeschide dacă:** o placă arată că discul purtat pe drum intră prea adânc într-un arc convex, sau atelierele cer altă
alegere a peretelui lung lângă curbe.
