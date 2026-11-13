# ADR 0173 — Fundul doar cu freza V (incrustația în V)

**Starea:** acceptat pe 13.11.2026, din răspunsul 4 al ADR 0170 („4a+b”: fundul plat cu freza dreaptă **și** doar cu freza
V, prin inele dese), la „Yes, start 12.1↑d” al owner-ului (dat în sesiunea principală, la „Start 12.1↑d on incrustații
now?”). Felia 12.1↑d, în linia incrustațiilor (worktree-ul `incrustatii`, ramura `wip/12.1-incrustatii`), fără mașină.
**Documentul:** v22, neschimbat: alegerea e chiar coloana Fund plat lăsată goală (ADR 0170 §4), deci nu cere câmp nou.

## Problema

O incrustație în V fără freză dreaptă e refuzată azi („fața dopului se coboară cu freza dreaptă: alege-o în coloana Fund
plat (varianta doar cu freza V vine în felia 12.1↑d)”; cu banda, „fundul benzii … se scoate cu freza dreaptă”). ADR 0170 a
ales ambele variante: „fără freză dreaptă, pe o incrustație, fundul îl scoate V-ul (creasta cel mult g/2 în locaș și H/2 pe
fața dopului), nu rămâne netăiat ca la un V-carve obișnuit”. E varianta pentru cine n-are o freză dreaptă: mai lentă.

## Ce am aflat

- **V-carve-ul are deja inelele.** Cu freza dreaptă, freza V taie inele dese în colțurile în care cea dreaptă nu ajunge
  (ADR 0091, `CREASTA_FUND` = 0,05 mm), la sv = t_v + 2c·tan(θ/2) unul de altul. Fără freză dreaptă, V-carve-ul taie axa și
  inelul peretelui (la wD de contur, la −D), iar fundul dintre ele rămâne, cu un avertisment.
- **Creasta.** Două tăieturi V alăturate, la aceeași adâncime și la sv una de alta, lasă între ele creasta sv / (2·t) (vârf
  ascuțit, t = tan(θ/2)); cu sv = 2c·t, creasta e c. Inelele regiunii decalate cu wD + j·sv acoperă tot fundul: un punct de
  fund la distanța d de contur, cu wD + j·sv ≤ d ≤ wD + (j + 1)·sv, e la cel mult sv/2 de unul dintre cele două inele sau de axă
  (distanța la contur crește cu cel mult 1 pe mm, iar unde inelul următor nu mai există, axa e mai aproape), deci creasta e
  cel mult c peste tot.
- **Unde contează creasta.** Fața dopului, întors, stă la g deasupra fundului locașului: cu creasta cel mult g/2, sub dop
  rămân cel puțin g/2 pentru clei. Fața coborâtă a dopului (sau fundul benzii) stă la H de placa locașului: cu creasta cel
  mult H/2, între plăci rămân cel puțin H/2. Dopul se oprește tot pe pereți, la S.
- **Costul, pe hârtie.** Inelele: (r − wD) / sv, cu r raza cea mai mare a regiunii. Dreptunghiul 12 × 6 (V60, D 3, g 0,5):
  sv = g·t = 0,289 mm, wD = 1,732, r = 3, deci 4 inele în locaș. Fața dopului (H 2): sv = H·t = 1,155 mm.
- **Decuparea benzii** (ADR 0172) taie prin placă cu o freză dreaptă (implicit, cea a fundului plat): fără ea, decuparea
  cere freza ei („Altă freză pentru decupare”). Freza V nu poate tăia prin placă cu pereți drepți.

## Decizia

1. **Alegerea:** fără freză dreaptă (coloana Fund plat goală, în fereastra exportului sau într-un rol), pe o incrustație în V.
   Documentul rămâne v22; implicitul rolului rămâne freza dreaptă (recomandarea din ADR 0170).
2. **Locașul:** freza V taie, după axă și inelul peretelui, inelele regiunii decalate cu wD + j·sv (j = 1, 2, …, cât există),
   la −D (pe fiecare trecere la −nivel, ca inelul peretelui: nicio trecere nu scoate mai mult decât pasul), pe contur, cu
   arcele lor; sv = 2·(g/2)·t = g·t, deci creasta cel mult g/2.
3. **Dopul, fața coborâtă:** la fel, la −(S + H), cu sv = H·t (creasta cel mult H/2); regiunea se lărgește cu e = H·t + 1
   (nu mai e o freză dreaptă care să încapă între dop și marginea regiunii).
4. **Dopul cu bandă:** fundul benzii, la fel (creasta cel mult H/2). Banda cea mai îngustă e 2·H·t + 2c fără decupare și
   2·H·t + Ø + 2c cu ea (Ø, freza decupării). Decuparea cere „Altă freză pentru decupare”: fără ea, refuzul spune ce să alegi,
   iar fereastra arată câmpul greșit (nicio alegere tăcută în locul omului).
5. **Avertismentul:** „fundul îl fac N inele ale frezei în V, la sv mm unul de altul (creasta cel mult c mm): mai lent decât
   cu o freză dreaptă”. Peste 400 de inele într-o regiune, refuzul, cu sfatul (o freză dreaptă sau un joc mai mare).
6. **Interfața:** în fereastra exportului, nota rândului spune că fundul îl scoate freza V; în panou, pe hârtie, rândul
   „Fundul cu freza V”: inelele la g·t în locaș și la H·t pe dop, cu crestele lor. Manualul (ro, en).
7. **Probele, scrise întâi:** oracolul potrivirii (`test/oracles/incrustatie.ts`, neschimbat) pe cazurile pe hârtie, fără
   freză dreaptă: oprirea la S ± 0,05, pereții în contact pe cel puțin 95 %, sub dop între g/2 și g + 0,05, între plăci între
   H/2 și H + 0,05, iar unde fundul e lat, creasta chiar există (sub dop, sub g − 0,05: nu e fundul plat de altă dată); niciun
   schimb de sculă în locaș sau în dop. Banda cu decupare, cu freza ei. Refuzurile. Otrăvurile, în `test/otravuri/12.1d.py`.

## Ce am respins

- **Creasta aleasă de om** (o finețe a fundului în fereastră): cere un câmp nou în document, deci v24, după v23 a planșelor.
  Acum, valorile din ADR 0170 (g/2, H/2).
- **Decuparea cu freza V:** n-ar tăia prin placă cu pereți drepți.
- **Fundul doar cu V și la un V-carve obișnuit** (fără incrustație): n-are un joc din care să iasă creasta, deci ar cere tot
  un câmp nou; după v23, dacă e cerut.

## Ce impune

- O incrustație fără freză dreaptă nu mai e refuzată; refuzul nou e decuparea fără freza ei.
- Fișa etapei 3 (rândul 12.1↑d), DEVLOG-ul și lista de otrăvuri a feliei; CLAUDE.md rămâne al sesiunii principale.
