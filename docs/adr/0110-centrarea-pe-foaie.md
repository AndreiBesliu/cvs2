# ADR 0110: Centrarea pe foaie, ca un bloc (felia 6.S↑)

**Starea:** acceptat pe 30.10.2026, la felia 6.S↑ (adusă din etapa 6), din notițele owner-ului din 28.10. **Completează:**
ADR 0050 §3 (alinierea), ADR 0053 (extensia barei de sus).

**Problema.** Notița owner-ului: „Buton de centrare un plansa, nu doar centrare orizontala si apoi verticala.” Până acum, o
singură formă se centra pe foaie din două clicuri (centrele pe orizontală, apoi pe verticală), iar mai multe forme se
aliniau față de cutia lor comună, fiecare mutată singură: centrarea lor pe aceeași axă le suprapunea.

## Decizia

1. **Un fel nou de aliniere**, `centru-foaie` („Centrează pe foaie”), în secțiunea Aliniere a extensiei barei, după cele
   șase alinieri: centrul cutiei comune a formelor alese ajunge în centrul foii, pe ambele axe, într-un clic.
2. **Ca un bloc:** toate formele alese se mută cu aceeași deplasare, deci așezarea dintre ele rămâne și nu se suprapun. Cu o
   singură formă, e centrarea ei.
3. **Referința e mereu foaia** (de la 0 la lățimea × înălțimea ei), nu cutia comună. Un bloc deja centrat nu se mișcă (sub
   1e-9 mm, ca alinierea); o formă ieșită din foaie ajunge tot în centru.
4. **Aceeași cale ca alinierea:** calculul pur în `src/geom/aliniere.ts`, deplasările prin `document.muta-instantele`, un
   singur pas de anulare. Butonul e o ușă nouă a interfeței, cu capitolul ei în manual (ro, en).

## Probele

- **Pe hârtie** (`test/unit/lipire.test.ts`), pe foaia 300 × 200 (centrul 150, 100): o formă 20 × 10 din (10, 10) se mută
  cu (130, 85); două forme cu cutia comună (0, 0)–(60, 40) se mută amândouă cu (120, 80); un bloc deja centrat (din forme
  care nu sunt fiecare în centru) nu se mișcă; o formă deja centrată pe orizontală se mută doar pe verticală; una ieșită din
  foaie ajunge în centru; o foaie care nu pleacă din origine își dă centrul ei.
- **E2e** (Edge): dreptunghiul 100 × 60 centrat pe foaia 300 × 200, într-un clic: colțul în (100, 70) (`editare.spec.ts`);
  două forme alese, ca un bloc: (150, 20) și (230, 20) ajung în (90, 85) și (170, 85), a treia rămâne, iar Ctrl+Z le pune
  pe amândouă la loc (`selectie.spec.ts`).
- **Mutațiile:** 7 / 7 (5 pe probele unitare: blocul făcut din centrarea fiecărei forme, foaia crezută din origine, doar pe
  orizontală, felul scos din listă, două forme cerute; 2 pe e2e: eticheta cu „față de foaie” în plus, butonul legat de
  centrarea pe orizontală), cu controlul verde înainte și după.
- **Mărimile:** pornirea 97,4 (cu ușa 100,9 / 110 kB) neschimbată; totalul 374,4 → 374,5 / 400 kB.

## Ce am respins

- **Două alinieri la rând pe fiecare formă** (centrele pe orizontală, apoi pe verticală): cu mai multe forme, le-ar strânge
  pe toate în centru, una peste alta (situația din notița 3 a owner-ului).
- **Alinierea „ca bloc” pentru toate felurile, acum:** e propunerea din notița 3 („la alegere”); forma și ordinea le alege
  owner-ul.
- **O tastă și un rând în meniul de clic dreapta:** necerute; vin dacă owner-ul le vrea.

## Limite

- Centrul e al cutiei comune (dreptunghiul care cuprinde formele), nu al materialului: o formă în L se centrează după cutie.
- Ghidajele foii nu se mută.

## Se redeschide dacă

- owner-ul vrea alinierea ca bloc și pentru celelalte feluri (notița 3);
- se cere centrarea după altceva decât cutia (centrul de masă, un punct ales).
