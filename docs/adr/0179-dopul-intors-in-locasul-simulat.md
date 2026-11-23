# ADR 0179 — Dopul întors în locașul simulat

**Starea:** acceptat pe 21.11.2026, din ADR 0170 §5 și §7 („potrivirea simulată, arătată lângă valorile pe hârtie”), din ADR
0178 §1 (felia 12.1↑e-2) și din planșele „Dopul în vederea 3D” și „Potrivirea, pe hârtie” ale schiței acceptate atunci
(<https://claude.ai/artifact/GKxS4iWgdjLghybs2FYxPK>). Felia 12.1↑e-2, la alegerea owner-ului „12.1↑e-2, secțiunea”, cu
implicitele spuse atunci: potrivirea se măsoară în aplicație cu un calcul nou, iar probele își păstrează oracolul, ca să-l
verifice; întâi incrustația în V. Linia incrustațiilor (worktree-ul `incrustatii`, ramura `wip/12.1-incrustatii`), fără
mașină. **Documentul:** neschimbat (v25).

## Problema

Vederea 3D arată foaia și fiecare dop pe semifabricatul lui (ADR 0178), dar nu arată dacă dopul se potrivește în locaș.
Valorile pe hârtie (panoul) spun cât ar trebui să intre. Oracolul potrivirii (ADR 0170 §6) le verifică doar în probe. Omul
vrea să vadă, înainte să taie, dopul întors în locaș, cu valorile simulate lângă cele pe hârtie.

## Decizia

1. **Alegerea.** Lângă „Foaia / Dopul 1 … Dopul N” apare comutatorul „Împreună (secțiunea)”.
   - E pornit doar când e ales un dop în V. La un dop cu pereți drepți e oprit, cu motivul pe titlu (felia 12.1↑e-3).
   - Apăsat, vederea arată dopul ales întors și așezat în locașul lui, în secțiune, cu tabelul valorilor.
   - „Foaia” sau alt dop îl opresc.
2. **Calculul, în lucrătorul CAM** (cererea `potrivire`, cu numărul dopului).
   - Programul foii și al dopului se simulează cu nucleul aplicației (ADR 0047), pe grile de 0,1 mm.
   - Grilele își corespund prin oglinda din contract (ADR 0170 §3): celula i a locașului e celula nx − 1 − i a dopului, pe X.
   - Fereastra e cutia desenului lărgită cu min(m, H·t + 1) pe fiecare parte.
   - Peste 2 M de celule, celula se dublează până încape (ca la ADR 0047 §1), iar tabelul o spune.
3. **Măsurarea, o implementare nouă** (`src/sim/potrivire.ts`), cu benzile contractului (ADR 0170 §6, ca oracolul). Distanța
   d la contur vine din desenul rasterizat pe grilă (par-impar, pe rânduri) și din transformarea exactă a distanței
   (Felzenszwalb–Huttenlocher), nu din distanța la fiecare segment, ca în oracol. Desenul îl dă CAM-ul, aplatizat (arcele cu
   săgeata sub 2 µm): simularea nu știe de geometrie. F e cât s-a scos din placă, M cât s-a scos din dop, c celula,
   t = tan(θ/2).
   - Întors și coborât, dopul se oprește la h* = min(F + M) pe celulele cu lemn ale dopului. La dopul decupat (ADR 0172), ce
     taie decuparea până la vârful punților nu mai e al lui. Rama benzii nu ajunge în fereastră: banda e mai lată decât
     H·t + 1.
   - Pereții sunt celulele din desen cu 2c < d < S·t − 2c. Contactul e partea lor cu jocul F + M − h* sub 0,05 mm.
   - Sub dop sunt celulele din desen cu d ≥ D·t + 2c: fundul.
   - Între plăci sunt celulele din afara desenului cu d ≥ H·t + 2c: fața coborâtă sau fundul benzii.
   - Fiecare bandă dă câte celule are, minimul, mediana și maximul.
4. **Lângă hârtie, tabelul planșei.**
   - „Dopul intră”: S pe hârtie, h* în simulare.
   - „Pereții în contact”: 100 % din bandă pe hârtie, partea simulată.
   - „Sub dop (clei)”: g pe hârtie; doar cu freza V, între g/2 și g.
   - „Între plăci”: H pe hârtie; doar cu freza V, între H/2 și H.
   - Un rând care iese cu peste 0,05 mm din valoarea pe hârtie, sau contactul sub 95 %, e roșu, cu locul celulei celei mai
     depărtate.
5. **Secțiunea** e pe orizontală (de-a lungul lui X), prin mijlocul desenului. Dacă un rând e roșu, trece prin celula lui
   cea mai depărtată, marcată.
   - Se desenează la scara 1:1 pe ambele axe: placa, cu fundul ei până la D + 1,5 mm, și dopul întors, până la fața lui.
   - Jocul cu clei e albastru, pereții în contact sunt verzi, iar tăietura cu fierăstrăul e o linie întreruptă la mijlocul
     spațiului dintre plăci.
6. **Incrustația cu pereți drepți** vine în felia 12.1↑e-3 (vezi mai jos), iar **treptele** în 12.1↑e-4 (oracolul lor,
   `masoaraPotrivireaTrepte`, are alte rânduri: umărul, tija, flanșa, reazemul).

## Felia 12.1↑e-3: pereții drepți (22.11 – 23.11)

La alegerea owner-ului „12.1↑e-3, pereții drepți”. Fără trepte: ele sunt felia 12.1↑e-4. Contractul dopului (ADR 0171 §3):
dopul ridicat e oglindit pe X, (x, y) → (x1 + m − x, y − y0 + m), cu fața coborâtă în jur până la h; cel decupat nu se
oglindește, (x, y) → (x − x0 + m, y − y0 + m), și e tăiat prin placa groasă exact h, cu punți. Pe hârtie, h = D + H pe fund
și la decupat, D − g pe față (la gaură, ADR 0175 §1, D e grosimea foii).

1. **Comutatorul** e pornit și pe dopul cu pereți drepți fără trepte; cu trepte rămâne oprit, cu motivul pe titlu.
2. **Jocul lateral se măsoară exact, pe mutări**, nu pe grilă: jocul de pe hârtie e de obicei 0,1 mm, cât o celulă, deci
   grila nu-l vede. O freză plată taie, la un nivel z, discurile ei de-a lungul mutărilor aflate în întregime sub z. Funcția
   „distanța în plan la cea mai apropiată mutare, minus raza frezei ei” e deci negativă în ce s-a tăiat și 0 pe perete. Pe
   peretele locașului, la D/2, punctele le dă grila de 0,1 mm, iar bisecția pe funcție le face exacte. Jocul fiecăruia e cât
   intră punctul, dus pe semifabricat după contract, în zona tăiată din jurul dopului, la h/2. Interferența: punctele
   peretelui dopului (fără rama semifabricatului), aduse înapoi pe foaie, care cad în afara locașului. Implementarea e a
   aplicației (`src/sim/taiereExacta.ts`, pe mutările nucleului); oracolul (`masoaraPotrivireaDreapta`) urmează același
   contract pe textul G-code, cu cititorul lui.
3. **Adâncimea locașului și înălțimea dopului** sunt medianele pe grilă: fundul locașului (F peste D/2) și fața coborâtă a
   dopului (M peste h/2); la cel decupat, cea mai adâncă tăietură (punțile ridică fundul șanțului în dreptul lor).
4. **Tabelul** are cinci rânduri: jocul lateral (c, cu toleranța 0,02, ca oracolul), dopul în locaș (niciun punct al
   peretelui lui afară), adâncimea locașului (D), înălțimea dopului (h) și sprijinul. Pe fund, sprijinul e „Între plăci”,
   H = h − D; pe față, „Sub dop (clei)”, g = D − h (la gaură, 0: dopul e cât foaia, ADR 0175); la decupat, „Peste placă (de
   rindeluit)”, H = h − D (ADR 0171: ce iese peste placă se rindeluiește, nu se taie). Ultimele trei au toleranța 0,05.
5. **Secțiunea**, ca la V: pe orizontală, prin mijlocul desenului sau, cu rânduri roșii, prin locul primului din tabel,
   marcat. Dopul ridicat, întors și coborât până la primul contact (h* = min(F + M)); cel decupat, neîntors, pus pe fundul
   locașului. Linia întreruptă e tăietura cu fierăstrăul la mijlocul spațiului dintre plăci (pe fund) sau la fața plăcii (pe
   față); la decupat e fața plăcii, până la care se rindeluiește dopul.
6. **Desenul secțiunii drepte** (din privirea pe secțiunea reală, 23.11). La V, profilul trece prin centrele celulelor:
   pereții lui sunt înclinați. La pereții drepți, fiecare celulă e o treaptă cât ea, deci pereții ies verticali, la marginea
   celulei.
   - Cleiul e doar în locaș, sub fața plăcii: de la suprafața plăcii până la fața de jos a dopului, dar cel mult până la
     fața plăcii. Deasupra ei e spațiul dintre plăci, nu clei. La dopul decupat, locașul fără dop deasupra e jocul lateral.
   - La gaura prin foaie (ADR 0175), placa e desenată cât foaia: sub gaură nu e lemn și nici contact (dopul stă acolo pe
     masă, nu pe placă). Hârtia dopului spune `gaura`.
   - Geometria desenului e un modul pur (`src/app/sectiuneDesen.ts`), probat pe hârtie; componenta doar îl desenează.
     Desenul dopului în V nu s-a schimbat.
7. **Insula rămâne în zona liberă.** Cu secțiunea, insula e cel mult cât zona liberă. Dacă nu încape (o gaură prin foaia de
   18, un ecran scund), alegerea și cipurile rămân pe loc, iar secțiunea se derulează. Derulează secțiunea, nu insula: cu
   derularea pe insulă, captura browserului avea o zonă nedesenată deasupra ei, peste pânza 3D.

## Dovada

- [măsurat] Proba, scrisă întâi (`incrustatie.potrivire3d.test.ts`), pe toate cazurile în V ale oracolului:
  - măsurarea aplicației e a oracolului: oprirea ± 0,01, contactul ± 0,03, medianele jocurilor ± 0,02; și fără freză
    dreaptă (jocurile între jumătate și întreg), iar cu banda decupată tăietura și punțile nu intră;
  - niciun rând roșu, iar valorile pe hârtie sunt ale panoului;
  - controlul negativ (dopul tăiat ca a doua cavitate) are rânduri roșii;
  - secțiunea dreptunghiului e pe hârtie: fundul la −D, dopul la −S, între plăci H.
- [citit] ADR 0170 §3, §5–§7, ADR 0178 §1, planșele „Dopul în vederea 3D” și „Potrivirea, pe hârtie”.

Felia 12.1↑e-3 (pereții drepți):

- [măsurat] `incrustatieDreapta.potrivire3d.test.ts`, pe toate cele 8 cazuri drepte ale oracolului
  (`masoaraPotrivireaDreapta`, pe textul G-code):
  - jocul lateral: mediana la cel mult 0,01 de oracol, iar toate punctele peretelui în c ± 0,02;
  - niciun punct al peretelui dopului în afara locașului; adâncimea și înălțimea, la cel mult 0,02 de oracol; niciun rând
    roșu, cu hârtia panoului;
  - controlul negativ (dopul cu vârfuri ascuțite) are „Dopul în locaș” roșu, cu locul lui, marcat pe secțiune;
  - controlul pe hârtie: o valoare scrisă diferit de programe (c cu 0,05; D, h, H cu 0,1) face roșu doar rândul ei;
  - gaura prin foaia de 10: D e grosimea foii; dopul decupat iese H peste placă, cel ridicat pe față e cât foaia;
  - dopul în trepte e refuzat, cu motivul; secțiunile celor trei sprijinuri, pe hârtie.
- [măsurat] `taiereExacta.test.ts`, pe hârtie: linia, arcul în ambele sensuri, nivelul, freza în V, cutia, bisecția.
- [măsurat] `sectiune.desen.test.ts`, pe secțiuni scrise de mână: treptele, cleiul doar în locaș (și la un joc de trei
  celule), pragul contactului, dopul decupat, gaura (cu martorul buzunarului de aceeași adâncime), dopul în V neschimbat.
- [văzut] Privirea pe secțiunea reală, mărită, în Edge: ridicat pe fund și pe față, decupat, gaura (decupat și ridicat),
  cercul, jocul lateral de 0,5, în engleză, pe un ecran scund. Desenul dopului în V pe cercul R15 e identic octet cu octet
  înainte și după mutarea geometriei.
- [măsurat] Otrăvurile (`test/otravuri/12.1e-3.py`): 63 / 63 prinse pe codul final.

## Ce am respins

- **Oracolul probelor mutat în aplicație:** o singură implementare, dar probele ar pierde verificarea independentă.
- **Benzile după suprafețele simulate** (pereții după F = d/t, fundul după F ≈ D, fără desen): mai ieftine, dar un fund
  prea puțin adânc ar ieși din bandă în loc să fie roșu, iar rândul „Sub dop” ar rămâne gol. Prima variantă a probei a
  arătat-o pe cercul DeskProto.
- **Distanța exactă la fiecare segment, ca oracolul:** scumpă pe literele cu sute de segmente și ar copia oracolul;
  transformarea distanței pe grilă e liniară în celule.
- **Secțiunea aleasă cu mausul:** utilă, dar o interacțiune nouă; rămâne pentru când o cere cineva.
- **Dopul întors în vederea 3D:** ar acoperi locașul. Secțiunea arată jocurile.
- **Jocul lateral măsurat pe grilă** (felia 12.1↑e-3): jocul de pe hârtie e de obicei cât o celulă, deci grila nu-l vede.
  Se măsoară exact, pe mutări.
- **Derularea pe insula întreagă** (felia 12.1↑e-3): o proprietate mai puțin, dar captura browserului avea o zonă nedesenată
  deasupra insulei, iar cipurile se striveau. Derulează doar secțiunea.

## Ce impune

- `DopCalculat` primește, la dopul în V, ce cere potrivirea (`potrivire`: cutia desenului, marginea, valorile pe hârtie,
  felul piesei). `CerereCam` primește cererea `potrivire`.
- Vederea 3D: comutatorul, secțiunea, tabelul; mesajele (ro, en); manualul (ro, en).
- Probele, e2e-ul vederii, otrăvurile (`test/otravuri/12.1e-2.py`), fișa (rândul 12.1↑e-2), DEVLOG-ul.
- Felia 12.1↑e-3: `DopCalculat.potrivire` și la dopul drept fără trepte (`fel: 'drept'`, cu `gaura` în hârtie);
  `potrivireaDreapta` și `functieTaiere` în `src/sim/`; desenul în `src/app/sectiuneDesen.ts`; otrăvurile
  (`test/otravuri/12.1e-3.py`), fișa (rândul 12.1↑e-3), DEVLOG-ul.

**Se redeschide dacă:** placa 12 arată altă potrivire decât simularea, sau owner-ul vrea secțiunea în alt loc.
