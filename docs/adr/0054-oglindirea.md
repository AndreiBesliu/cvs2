# ADR 0054: Oglindirea selecției

**Starea:** acceptat pe 20.10.2026, odată cu felia 6.E↑. Cererea owner-ului: după „Da, fă acum unirea și separarea
vectorilor, fără agenți.”, la întrebarea despre sensul unirii: „M-am razgandit, nu vreau asta acum. As face ceva mai mic.”,
apoi, din feliile mici propuse, „Oglindirea (Recomandat)”. **Intră în:** etapa 6 („Editorul de vectori”, rândul pragului
„Transformarea … mutare, rotire, oglindire”), adusă în etapa 3, fără mașină (6.E↑). **Continuă:** ADR 0052, 0053.

**Problema.** O formă se putea muta, roti și scala, dar nu și întoarce în oglindă (stânga ↔ dreapta, sus ↔ jos), ca pentru
perechea simetrică a unei piese.

## Decizia

**1. Butoanele.** Extensia barei de sus (ADR 0053 §2) are o a doua secțiune, **Oglindire**, după Aliniere: „Oglindește
orizontal” (stânga ↔ dreapta, Shift+H) și „Oglindește vertical” (sus ↔ jos, Shift+V). Oglinda e față de axa care trece prin
centrul cutiei selecției, deci cutia rămâne pe loc. Butoanele sunt oprite fără selecție și în doar-citire. Tastele merg cu
focusul pe pagină, pe pânză, în bara uneltelor sau în extensie, nu într-un câmp.

**2. Exactă, în matricea piesei.** În lume, un punct p al piesei e T(loc)·R(rotire)·p. Oglinda S față de axă dă
S·T(loc)·R(rotire)·p = T(loc′)·R(rotire)·L·p, cu loc′ oglinda locului și L = R(−rotire)·S·R(rotire), tot o reflexie. Rotirea
instanței rămâne, iar L intră în matricea rădăcinii piesei, înaintea ei. O reflexie e o similitudine, deci arcele rămân arce
(cu semnul schimbat, `transformaContur`), cercul rămâne cerc, iar forma (laturile, raza, vârfurile) nu se atinge. La rotiri
multiple de 90°, L are doar 0 și ±1, deci de două ori aceeași oglindire dă exact documentul de la început.

**3. Ce se taie e oglinda.** CAM-ul inversează deja partea frezei pe căile deschise sub o matrice care oglindește (ADR 0037
§3), iar sensul de tăiere (urcare / opoziție, ADR 0027) se judecă față de material. Deci tăieturile în plan ale documentului
oglindit sunt exact oglinda celor de dinainte, cu același sens al arcelor: oglinda întoarce sensul de rotire, iar ca tăierea să
rămână în urcare bucla se parcurge invers. Același motiv mută intrarea frezei la celălalt capăt al buclei.

**4. Prin acțiunea existentă.** Oglindirea e un fel nou al `Transformare` (`{ fel: 'oglindire', directie, centru }`), dat
acțiunii `document.transforma` (ADR 0052), un pas de anulare. Pornirea nu primește nimic nou. O piesă folosită și de alte
instanțe e refuzată (s-ar schimba și ele), cu motivul spus în secțiunea Oglindire.

## Probele

`test/unit/transformare.test.ts`:
- locul și matricea, pe valori pe hârtie, plus cutia în lume; de două ori aceeași oglindire dă documentul de la început;
- la 0°, 90° și 30°, orizontal și vertical: fiecare vârf și punct de control din lume e oglinda lui (sub 1e-9), iar arcele își
  schimbă semnul;
- selecția cu două forme, față de centrul comun, și refuzul piesei împărțite;
- programul de tăiere al documentului oglindit (exteriorul, gaura și o linie tăiată pe stânga) are tăieturile în plan egale cu
  oglinda celor de dinainte, cu sensul arcelor; martorul (latura liniei schimbată în document) nu mai trece.

`test/e2e/editare.spec.ts`: un triunghi exportat înainte și după oglindire; X-urile tăieturilor sunt în oglindă (orizontal,
din buton), apoi Y-urile (vertical, Shift+V). Două oglindiri Shift+H dau același G-code, iar anularea lor întoarce programul
de la început.
