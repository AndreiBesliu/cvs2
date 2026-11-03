# ADR 0150: Alinierea ca bloc

**Starea:** acceptat pe 02.11.2026, la felia 6.U↑ (adusă din etapa 6), în sesiunea paralelă a grupării (worktree-ul
`C:\Users\besli\cncvs2-lucru\grupare`, ramura `wip/6.U-aliniere`). Numărul 0150 ocolește numerele luate de celelalte ramuri
(0123–0132, 0140–0142) și pe cele următoare ale liniei principale (de la 0133). **Completează:** alinierea (ADR 0050 §3),
centrarea pe foaie (ADR 0110) și gruparea (ADR 0130 §8).

**Problema.** Notița 3 a owner-ului, din 28.10 (CLAUDE.md, „Decizii luate”): vectorii degrupați, duplicați și aliniați ajung
unii peste alții, fiindcă alinierea mai multor forme le duce pe fiecare la cutia lor comună. Recomandarea de atunci: gruparea
(gata, ADR 0130), alinierea selecției ca bloc la alegere și un avertisment când contururile ajung să se atingă. Owner-ul, pe
02.11, la întrebarea din raportul grupării: „3, ok” (o felie următoare, după unirea grupării).

## Decizia

1. **Comutatorul Ca bloc**, în secțiunea Aliniere a extensiei barei, primul după butonul care o strânge (`aria-pressed`).
   Pornit, cele șase alinieri (stânga, centrul pe orizontală, dreapta, sus, centrul pe verticală, jos) aliniază cutia comună
   a formelor alese față de foaie, cu aceeași deplasare pentru toate: așezarea dintre ele rămâne, deci nu se suprapun.
   Oprit, alinierea e cea de până acum (fiecare formă la cutia comună; o singură formă, față de foaie).
2. **Ce nu se schimbă:** distribuirea (goluri egale între forme) și centrarea pe foaie (deja un bloc, ADR 0110), cu
   comutatorul pornit sau oprit; o singură formă se aliniază față de foaie, ca până acum.
3. **Implicit oprit, ținut în browser** (`cncvs2.aliniere-bloc`, ca Lipirea și Grila): cine nu-l pornește nu vede nicio
   schimbare. Sfatul fiecărui buton de aliniere spune, cu mai multe forme și comutatorul pornit, „(ca bloc, față de foaie)”.
4. **Calculul**, pur, în `aliniaza` (`src/geom/aliniere.ts`): cu `bloc`, cutia comună e lucrul aliniat față de foaie, prin
   aceeași regulă ca un singur lucru. Mutarea e `document.muta-instantele`, deci un singur pas de anulare.
5. **Avertismentul la contururile care se ating** nu intră aici: verificarea vectorilor din etapa 10 (felia 10.1↑, ADR 0124,
   încă pe ramura ei) găsește deja intersecțiile și atingerile dintre contururi. Un al doilea detector ar fi o a doua părere
   despre același lucru; după unirea ei, alinierea poate cere verificarea, într-o felie a ei.

## Probele

- **Unitar** (`lipire.test.ts`): valorile pe hârtie ale celor șase alinieri ca bloc (cutia comună 10–60 × 10–80 pe foaia
  300 × 200: −10, +240, +115 pe orizontală; −10, +120, +55 pe verticală, aceeași deplasare pentru amândouă formele); deja la
  marginea foii, nimic; o formă, distribuirea și centrarea pe foaie, aceleași cu sau fără bloc.
- **E2e** (`selectie.spec.ts`): fără bloc, „Aliniază la dreapta” duce B peste C (notița 3); ca bloc, B și C se mută amândouă
  cu +30 mm, A rămâne; sfatul butonului; un singur Ctrl+Z; comutatorul rămâne pornit după reîncărcare.
- **Manualul:** capitolul Alinierea (ro, en) numește comutatorul; ușa nouă în poarta manualului (70).

## Ce am respins

- **Alinierea ca bloc implicită.** Ar schimba ce face azi alinierea mai multor forme, pe care owner-ul o folosește; fiecare
  formă la cutia comună rămâne felul obișnuit al programelor de desen.
- **Un al treilea fel de referință („față de forma cheie”).** Nu l-a cerut nimeni; se poate adăuga lângă comutator.
- **Gruparea ghicită din suprapuneri** (notița 3). Doar ca propunere vizibilă, într-o felie a ei, dacă owner-ul o vrea.

## Limite și neprobat

- Doar foaia de lucru (foaia 0), ca toate acțiunile editării până la Multi-Plate (etapa 11).
- Comutatorul se vede doar cu secțiunea Aliniere deschisă (strânsă, rămâne cum a fost lăsat).

## Se redeschide dacă

- owner-ul vrea alinierea ca bloc implicită, sau o referință în plus (forma cheie);
- verificarea vectorilor (etapa 10) intră în `main`: avertismentul după aliniere, cu ea.
