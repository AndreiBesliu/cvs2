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
6. **Incrustația cu pereți drepți și treptele** (oracolele lor, `masoaraPotrivireaDreapta` și `masoaraPotrivireaTrepte`)
   vin în felia 12.1↑e-3.

## Dovada

- [măsurat] Proba, scrisă întâi (`incrustatie.potrivire3d.test.ts`), pe toate cazurile în V ale oracolului:
  - măsurarea aplicației e a oracolului: oprirea ± 0,01, contactul ± 0,03, medianele jocurilor ± 0,02; și fără freză
    dreaptă (jocurile între jumătate și întreg), iar cu banda decupată tăietura și punțile nu intră;
  - niciun rând roșu, iar valorile pe hârtie sunt ale panoului;
  - controlul negativ (dopul tăiat ca a doua cavitate) are rânduri roșii;
  - secțiunea dreptunghiului e pe hârtie: fundul la −D, dopul la −S, între plăci H.
- [citit] ADR 0170 §3, §5–§7, ADR 0178 §1, planșele „Dopul în vederea 3D” și „Potrivirea, pe hârtie”.

## Ce am respins

- **Oracolul probelor mutat în aplicație:** o singură implementare, dar probele ar pierde verificarea independentă.
- **Benzile după suprafețele simulate** (pereții după F = d/t, fundul după F ≈ D, fără desen): mai ieftine, dar un fund
  prea puțin adânc ar ieși din bandă în loc să fie roșu, iar rândul „Sub dop” ar rămâne gol. Prima variantă a probei a
  arătat-o pe cercul DeskProto.
- **Distanța exactă la fiecare segment, ca oracolul:** scumpă pe literele cu sute de segmente și ar copia oracolul;
  transformarea distanței pe grilă e liniară în celule.
- **Secțiunea aleasă cu mausul:** utilă, dar o interacțiune nouă; rămâne pentru când o cere cineva.
- **Dopul întors în vederea 3D:** ar acoperi locașul. Secțiunea arată jocurile.

## Ce impune

- `DopCalculat` primește, la dopul în V, ce cere potrivirea (`potrivire`: cutia desenului, marginea, valorile pe hârtie,
  felul piesei). `CerereCam` primește cererea `potrivire`.
- Vederea 3D: comutatorul, secțiunea, tabelul; mesajele (ro, en); manualul (ro, en).
- Probele, e2e-ul vederii, otrăvurile (`test/otravuri/12.1e-2.py`), fișa (rândul 12.1↑e-2), DEVLOG-ul.

**Se redeschide dacă:** placa 12 arată altă potrivire decât simularea, sau owner-ul vrea secțiunea în alt loc.
