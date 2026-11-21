# ADR 0178 — Dopul în vederea 3D

**Starea:** acceptat pe 19.11.2026, din ADR 0170 §5 („în vederea 3D, «Foaia / Dopul N»”) și din planșa „Dopul în vederea 3D” a
schiței acceptate odată cu el (<https://claude.ai/artifact/GKxS4iWgdjLghybs2FYxPK>). Felia 12.1↑e, pornită la alegerea
owner-ului „12.1↑e, dopul 3D”, în linia incrustațiilor (worktree-ul `incrustatii`, ramura `wip/12.1-incrustatii`), fără
mașină. **Documentul:** neschimbat (v25).

## Problema

Dopul unei incrustații se taie dintr-un program al lui, pe semifabricatul lui. Până acum îl vedeai doar pe hârtie (secțiunea
din panou) și în rândul exportului (mărimea semifabricatului). Vederea 3D (ADR 0057) arăta doar foaia. ADR 0170 a cerut, la
felia lui, dopul în vederea 3D și potrivirea simulată, arătată lângă valorile pe hârtie.

## Decizia

1. **Felia se împarte în două:**
   - 12.1↑e, aceasta: alegerea „Foaia / Dopul N” în vederea 3D, cu dopul simulat pe semifabricatul lui;
   - 12.1↑e-2, la cuvântul owner-ului: „Împreună (secțiunea)”, adică dopul întors și așezat în locașul simulat, cu valorile
     simulate lângă cele pe hârtie (planșa schiței).
2. **Alegerea:** în insula de stare a vederii 3D apare un grup de butoane: „Foaia”, apoi „Dopul 1” … „Dopul N”.
   - Butoanele apar doar când foaia are dopuri.
   - Fiecare dop are pe titlu elementul lui și semifabricatul (lățime × înălțime × grosime).
   - Dopurile sunt cele ale exportului, în aceeași ordine (întâi cele în V, apoi cele cu pereți drepți), deci „Dopul N” e
     fișierul `…-dop-N`.
3. **Dopul simulat:** programul dopului (același ca la export, fără supracursă, ca foaia, ADR 0057 §1) se simulează pe
   semifabricatul lui.
   - Fața semifabricatului e la Z 0, iar fundul la grosimea lui cea mai mică (la dopul decupat, exact placa).
   - Camera încadrează semifabricatul la fiecare schimbare; fereastra fină și „Simulează din nou” merg ca la foaie.
4. **Un dop care nu se poate tăia** nu oprește foaia: vederea o simulează, fără butoanele dopurilor, și spune motivul lor
   (același ca la export).
5. **O singură funcție a dopurilor** (`dopurileFoii`), folosită de export și de vederea 3D: aceeași listă, același program.
   Lucrătorul CAM o cheamă la cererea `simulare`, care primește, opțional, al câtelea dop.

## Dovada

- [măsurat] Proba, scrisă întâi (`incrustatie.dop3d.test.ts`), a picat toată pe codul de dinainte:
  - lista dopurilor vederii trebuie să fie a exportului (cu o incrustație în V și una dreaptă);
  - relieful fiecărui dop trebuie să fie, pe toate celulele plane, cel al oracolului independent al simulării, pe G-code-ul
    dopului exportat;
  - un dop refuzat nu oprește foaia;
  - un document fără incrustații n-are dopuri.
- [citit] ADR 0170 §5 și planșa „Dopul în vederea 3D”: „Foaia 1 / Dopul 1 / Împreună (secțiunea)”, cu dopul pe semifabricatul
  lui.

## Ce am respins

- **Dopul lângă foaie, în aceeași scenă:** semifabricatul nu are un loc pe foaie, deci l-aș pune undeva inventat.
- **Calculul dopurilor pe firul principal:** gruparea și programele lor sunt ale CAM-ului (ADR 0109).
- **„Împreună (secțiunea)” acum:** cere măsurarea potrivirii în aplicație (o a doua implementare, lângă oracolul probelor) și
  secțiunea desenată. Rămâne o felie a ei.

## Ce impune

- `RaspunsSimulare` / `ProgramSimulare` primesc `dopuri` (elementul și semifabricatul fiecăruia) și `motivDopuri`;
  `CerereCam` `simulare` primește `dop`.
- Vederea 3D: grupul de butoane, simularea dopului ales, încadrarea; mesajele (ro, en); manualul (ro, en).
- Probele, e2e-ul vederii, otrăvurile (`test/otravuri/12.1e.py`), fișa (rândul 12.1↑e), DEVLOG-ul.

**Se redeschide dacă:** semifabricatul dopului primește un loc pe o foaie (foile multiple), sau owner-ul vrea „Împreună” altfel
decât în planșă.
