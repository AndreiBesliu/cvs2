# ADR 0174 — Punțile dopului drept decupat, alese în fereastră (documentul v24)

**Starea:** acceptat pe 13.11.2026, din lista dinaintea unirii lui 12.1↑b–c, punctul 4 („1 si 2 acum 3-6 dupa”, 08.11),
cu condiția v23 în `main` (planșele, unite la `d62e6b8`, la cuvântul owner-ului). Felia 12.1↑b-2, în linia incrustațiilor
(worktree-ul `incrustatii`, ramura `wip/12.1-incrustatii`), fără mașină. **Documentul:** v24 (v23 e al planșelor).

## Problema

Dopul decupat al incrustației cu pereți drepți (ADR 0171) are punți fixe: 4 pe buclă, late de 4 mm și groase de 1 mm
(`PUNTI` în `src/cam/dopDrept.ts`). Banda dopului în V (ADR 0172) le are alese în fereastră, cu valorile acestea ca implicite.
Owner-ul a cerut același lucru și aici („Punțile dopului decupat cu pereți drepți alese în fereastră (câte, lățimea,
grosimea), ca la bandă”); cere un câmp nou în document.

## Decizia

1. **Câmpul:** `punti` opțional pe incrustația cu pereți drepți, ca urechile: `{ numar, latime, grosime }` (un întreg 1–100,
   lățimea și grosimea pozitive, aceleași margini ca urechile unei operații). Fără el, cele de azi (4 × 4 × 1 mm). Contează doar
   la dopul decupat; Exportă îl scrie doar acolo (pe dopul ridicat, câmpul pleacă), îmbinat cu cel din document (un câmp
   necunoscut rămâne), ca punțile benzii. Precizare (la cod): cele implicite nu se scriu peste un dop care nu le are, ca un
   Exportă fără schimbare să nu scrie o comandă (același document); odată scrise, rămân și când revin la 4 × 4 × 1.
2. **Documentul v24:** migrarea v23 → v24 schimbă doar numărul; un document v23 care are deja `punti` în `incrustatie` (un
   câmp necunoscut) e refuzat, ca ciocnire. Ușa (la pornire, cu un proiect salvat) primește doar câmpul opțional: +7 octeți
   gzip, măsurați înainte (pornirea cu ușa rămâne 109,7 / 110 kB).
3. **Dopul:** punțile din document, pe fiecare buclă câte încap (`puntiPeBucle`, ca până acum), cu palierul = lățimea plus
   freza; avertismentul spune valorile alese. Ce nu se poate tăia (punți mai groase decât placa) îl refuză lucrarea, ca la
   urechile unei operații.
4. **Fereastra:** pe rândul incrustației cu pereți drepți, cu dopul decupat, „Punți pe buclă”, „Lățimea punții”, „Grosimea
   punții” (implicit 4, 4 și 1), validate ca urechile; pe dopul ridicat, ascunse (valorile rămân scrise în rând). Panoul, pe
   hârtie: punțile dopului decupat. Manualul (ro, en).
5. **Probele, scrise întâi:** oracolul documentului (rândul `CAMPURI_NOI_O[24]`, judecata câmpului, frontierele pe hârtie),
   corpusul de aur v24, dopul decupat cu punțile alese (câte pe buclă, palierul, grosimea în program), scrierea îmbinată,
   fereastra (e2e). Otrăvurile, în `test/otravuri/12.1b-2.py`.

## Ce am respins

- **Punțile în rolul personalizat** (fără document): un rol nu ține valorile exportului dopului.
- **Câmpul și pe dopul ridicat:** n-are punți; s-ar păstra degeaba.

## Ce impune

- Probele care țin versiunea curentă trec pe v24 (`schema: 23` → `24`); corpusul de aur, cu adăugirea v24 și `ISTORIE`.
- Fișa etapei 3 (rândul 12.1↑b-2), DEVLOG-ul; CLAUDE.md rămâne al sesiunii principale.
