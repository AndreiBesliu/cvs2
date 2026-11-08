# ADR 0240 — Ancora și tastele transformării: Shift, Ctrl și Alt la mânere și la desen

**Starea:** acceptat pe 08.11.2026 (propus în aceeași zi), cu răspunsul owner-ului la cele patru întrebări: „Ok la toate”,
deci recomandările 1a–4a (secțiunea „Răspunsurile owner-ului”, la capăt). Lucrat în worktree-ul `ancore` (ramura
`wip/6.V-ancore`, din `main` `b56f0e1`). Cererea owner-ului, exactă: „vreau un worktree care sa se ocupe de origin/anchor points pentru vectori. si
o sa vreau ca unealta transform sa tina cont de ele ba mai mult vreau hotkeys care sa influenteze unealta. de exemplu, daca
vreau sa deformez un cerc si sa il fac elipsa coltul pastreaza proportia cercului, dar lateralele nu, eu vreau sa pot apasa
SHIFT si sa pastrez proportia orice ar fi si pe CTRL sa ignor proportia orice ar fi, si pe ALT, chiar si in combinatie cu
celelalte, vreau sa imi pastreze centrul formei. Aceste hotkeys trebuie sa functioneze asa si cand creez formele (cercul,
dreptunghiul etc.)”. **Intră în:** etapa 6 („Editorul de vectori”), adusă în etapa 3, fără mașină (feliile 6.V↑–6.V↑d).
**Schimbă:** ADR 0051 §2 (tastele la desen), ADR 0052 §2 (Alt care inversează lipirea, la mânere și la desen) și §4 (Shift
face colțul liber; punctul fix e mânerul opus; rotirea în jurul centrului cutiei), ADR 0052 §5 și ADR 0102 §1 (scalarea
neuniformă a cercului și a arcelor, refuzată), ADR 0055 §1 (Alt la mânere), ADR 0138 §4 (textul cu aldin, refuzat).
**Documentul:** neschimbat (v20) în recomandare; o ancoră ținută în proiect ar cere o versiune nouă (întrebarea 1).

## Problema

- **La mânere** (ADR 0052 §4), colțul scalează proporțional, iar Shift îl face liber. Latura scalează pe o axă. Punctul fix e
  mereu mânerul opus, iar rotirea e mereu în jurul centrului cutiei. Nu se poate scala proporțional dintr-o latură, nici
  față de centru, nici roti în jurul altui punct. Shift face aici invers decât în ArtCAM și în Illustrator, unde Shift
  păstrează proporția.
- **Un cerc nu se face elipsă din mânere.** O scalare neuniformă a cercului e refuzată (`neuniform-cerc`), la fel cea a unei
  căi cu arce (`neuniform-arc`) și a unui dreptunghi cu colțuri rotunjite (`neuniform-colt`). Exemplul owner-ului (lateralele
  nu păstrează proporția) se oprește la refuz.
- **La desen** (ADR 0051 §2), dreptunghiul și elipsa merg doar din colț în colț, iar cercul și poligonul doar din centru.
  Shift face pătrat, cerc sau pași de 15°, iar Alt inversează lipirea. Nu există „din centru” pentru dreptunghi, elipsă și
  linie, nici „fără proporție” pentru cerc.
- **Tastele se citesc doar la mișcarea mausului.** Shift apăsat cu mausul pe loc nu schimbă previzualizarea până la
  următoarea mișcare.

## Ce am aflat (cercetarea din 08.11)

**Programele**, din ajutorul lor oficial (referință funcțională, fără cod sau texte copiate):

| | ArtCAM 2018 | CorelDRAW | Illustrator | Inkscape 1.x |
|---|---|---|---|---|
| Colțul, fără tastă | schimbă mărimea și forma | proporțional | liber | liber |
| Proporția | Shift | implicită la colț | Shift | Ctrl |
| Colțul liber | fără tastă | Alt („stretch”) | fără tastă | fără tastă |
| Față de un punct fix | Alt: față de originea transformării | Shift: din centru | Alt: din centru | Shift: simetric, față de centrul rotirii |
| Altele | Ctrl la mutare lasă o copie | Ctrl: multipli ai mărimii | — | Alt: scara în rapoarte întregi |
| Punctul de referință | originea transformării: un mâner al cutiei, mutat după ce deschizi lacătul din „Origin Position”, sau una din 9 poziții, sau X / Y + Apply; rotirea e în jurul ei | originea obiectului (ancora, punctul de referință): centrul sau un mâner, din bara de proprietăți; câmpurile de mărime o țin pe loc | punctul de referință (9 puncte) din panoul Transform; originea uneltelor Scale și Rotate, pusă cu un clic oriunde | centrul rotirii (crucea): tras oriunde, își ține locul pentru obiectele alese și se salvează în fișier; Shift + clic îl readuce în centrul cutiei |
| Desen: pătrat / cerc | Shift (doar dreptunghiul) | Ctrl | Shift | Ctrl (și rapoarte întregi) |
| Desen: din centru | dreptunghiul are un centru, care rămâne pe loc la redimensionarea din formă | Shift | Alt (poligonul și steaua, mereu din centru) | Shift |
| Lipirea oprită de o clipă | Shift | — | — | Shift (la noduri și la creion) |

CorelDRAW lasă omul să schimbe tastele între ele (Pick tool: „Traditional CorelDRAW” sau „Windows standard”, unde Shift
constrânge și Ctrl lucrează pe o copie). Nu există o convenție comună: proporția e Shift în ArtCAM și Illustrator și Ctrl în
Inkscape; „din centru” e Alt în Illustrator (și față de origine în ArtCAM), Shift în CorelDRAW și Inkscape. Cererea
owner-ului e convenția ArtCAM + Illustrator, cu Ctrl = „liber” în plus (CorelDRAW folosește Alt pentru asta). Ancora cerută e
originea transformării din ArtCAM: una din 9 poziții sau mutată cu mâna, rotirea în jurul ei, Alt față de ea.

**cvs2 azi** (codul din `main`, `b56f0e1`):
- **Mutarea formei** (Selecția, Transformarea): Alt inversează lipirea; Shift + clic sau tragere adaugă la selecție; săgețile
  mută cu 1 mm, cu Shift 10 mm, cu Alt 0,1 mm.
- **Desenul** (`src/app/desenCalcul.ts`, `capatConstrans`, `formaDesenata`): dreptunghiul și elipsa din colț în colț; cercul și
  poligonul din centru, cercul prin cursor; linia din capăt în capăt. Shift face pătrat sau cerc (dreptunghiul, elipsa) și pași
  de 15° (linia, primul vârf al poligonului); Alt inversează lipirea capetelor (`gestDesen` în `Editare.tsx`). Tastele se citesc
  din evenimentele mausului (`src/canvas/Panza.tsx`).
- **Mânerele** (`transformareManer` și `transformareManerLipita` în `src/app/editareCalcul.ts`, componenta `Manere` din
  `Editare.tsx`): ca la „Problema”; Alt inversează lipirea mânerului (ADR 0055); eticheta arată mărimea în mm sau unghiul.
- **Modelul** (`src/model/transformare.ts`): rotirea în jurul unui `centru`, scalarea cu `sx` și `sy` față de o `ancora`,
  oglindirea și înclinarea față de un `centru`. Punctul fix e deja un parametru al transformării; doar mânerele, oglindirea și
  înclinarea îl iau mereu din cutie (mânerul opus sau centrul). Scalarea neuniformă refuză cercul, arcele, colțurile rotunjite și
  instanțele rotite altfel decât cu 90°.
- **Noduri și Pen:** la Noduri, Alt desparte sau unește mânerele nodului (ADR 0074 §5) și inversează lipirea nodului. La Pen,
  Alt inversează lipirea, Shift face curba pe o parte, iar Ctrl+Z, Ctrl+Y și Ctrl+Shift+Z sunt ale căii cât are pași (ADR 0074
  §4). La text, Alt + ← / → schimbă spațierea literelor alese (ADR 0138 §5).
- **Ctrl azi:** doar scurtăturile (`src/ui/scurtaturi.ts`: Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z, Ctrl+Shift+Y, Ctrl+D, Ctrl+G,
  Ctrl+Shift+G, Ctrl+K) și pașii Pen-ului. Niciun gest al mausului nu-l citește, iar handlerul tastelor editării se oprește la
  Ctrl. Browserul ia Ctrl + rotița (zoomul paginii; pânza o oprește deja) și Ctrl + litere (W, T, N, L, P, S, F…). Pe Mac,
  Ctrl + clic e clicul dreapta, deci acolo „Ctrl” e ⌘, ca la scurtături (`tastaApasata`).
- **Panoul:** X / Y sunt colțul stânga-jos al cutiei selecției; rotirea unei instanțe e în jurul centrului ei (`instantaRotita`).
- **Manualul** (capitolele desenului, selecției și scurtăturilor) și **pașii testului din aplicație**
  (`docs/tutorial/unelte-desen.md`: „cu Alt nu se mai prinde”, „cu Shift, liber”) spun regulile de azi.

## Decizia propusă

Owner-ul vrea toate variantele care pot sta împreună ca opțiuni (07.11). Unde scrie mai jos **opțiune**, se face, cu prima
variantă implicită; întrebările de la capăt sunt doar ce se exclude.

### A. Ancora (originea transformării)

1. **Ce e:** un punct al selecției, punctul fix al transformărilor. Cu unealta Transformare, pe pânză stă o țintă mică (⊕) în
   locul ei, cât cutia are cel puțin 24 px (ca mânerele).
2. **Unde pornește:** într-unul din cele 9 puncte ale cutiei selecției (colțurile, mijloacele laturilor, centrul), ales într-un
   selector 3 × 3 din bara uneltei Transformare (locul câmpului uneltei, ca raza cercului). Implicit e centrul, ca în toate
   cele patru programe. Alegerea se ține în browser (`cncvs2.ancora`).
3. **Mutată cu mâna:** trasă de țintă oriunde, și în afara cutiei, lipită de aceleași ținte ca mânerele (ADR 0055) și de cele 9
   puncte ale cutiei selecției. Aici Alt inversează lipirea, fiindcă n-are alt sens. Dublu clic pe țintă o întoarce în punctul
   selectorului, la fel o selecție nouă. Când ancora stă chiar pe un mâner (un colț ales în selector), mânerul are întâietate
   la apăsare; ancora se mută de acolo din selector.
4. **Urmează selecția:** e ținută față de cutia selecției (ca fracții din lățimea și înălțimea ei), deci merge cu formele la
   mutare și la scalarea din alt mâner. După o transformare în jurul ei (rotirea, scalarea cu Alt, oglindirea, înclinarea),
   rămâne pe loc.
5. **Ce o folosește:** rotirea din mâner (în jurul ancorei, nu al centrului), scalarea cu Alt (§B), oglindirea (Shift+H /
   Shift+V și butoanele) și înclinarea. Cu ancora în centru, toate fac exact ce fac azi.
6. **Nu se ține în proiect** (recomandat, întrebarea 1): e a selecției de acum, ca în ArtCAM, CorelDRAW și Illustrator; doar
   punctul de pornire se ține în browser. Documentul rămâne v20.
7. **Opțiune (6.V↑d):** în panoul de proprietăți, rândul **Ancora**, cu X / Y. Scrise, mută ancora, nu formele, ca „Origin
   Position” din ArtCAM.

### B. Tastele la mânere

8. **Fără tastă:** ca azi. Colțul scalează proporțional (după axa care s-a schimbat mai mult), latura pe o axă; fix e mânerul
   opus.
9. **Shift: proporțional, pe orice mâner.** La o latură, scara laturii trase intră și pe cealaltă axă, care crește simetric față
   de linia de mijloc (fix e mijlocul laturii opuse). La colț, ca fără tastă. Azi Shift făcea colțul liber: asta trece pe Ctrl.
10. **Ctrl (⌘ pe Mac): liber, pe orice mâner.** Colțul scalează fiecare axă cu deplasarea ei; la o latură, nu schimbă nimic.
11. **Alt: față de ancoră** (implicit centrul; în 6.V↑, înainte de ancoră, centrul cutiei). Punctul fix e ancora, nu mânerul
    opus. Se combină: Alt + Shift scalează proporțional față de ancoră, Alt + Ctrl liber față de ancoră.
12. **Shift + Ctrl:** câștigă Shift (recomandat, întrebarea 3).
13. Pe o axă pe care ancora stă pe linia mânerului tras (de exemplu ancora pe latura dreaptă, iar latura dreaptă trasă cu Alt),
    axa nu se scalează, iar eticheta o spune. O scară care trece de zero se refuză, ca azi (`scara-invalida`).
14. **Lipirea mânerului** (ADR 0055) rămâne pe axele pe care mânerul le scalează. Pe o axă lipită, scara îl duce exact pe țintă,
    față de punctul fix (cu Alt, ancora). La proporțional decide latura trasă sau, la colț, axa care s-a schimbat mai mult.
15. **Tastele se citesc și când se apasă sau se lasă,** nu doar la mișcarea mausului: cu mausul pe loc, Shift apăsat schimbă pe
    loc previzualizarea (și la desen). Cât ține gestul, browserul nu primește apăsarea lor (`preventDefault`).
16. **Rotirea:** în jurul ancorei; Shift, în pași de 15°, ca azi; Ctrl și Alt nu schimbă nimic.
17. **Opțiune (6.V↑d):** „Alt ține fix: ancora / centrul cutiei”, în bara Transformării. Cu a doua, Alt e mereu centrul cutiei,
    și la rotire, oriunde ar sta ancora.

**Pe hârtie, exemplul owner-ului:** cercul Ø 40 cu centrul în (100, 100), latura dreaptă trasă cu 10 mm:

| Tastele | Punctul fix | sx | sy | Rezultatul |
|---|---|---|---|---|
| — | (80, 100) | 1,25 | 1 | elipsa 50 × 40, centrul (105, 100) |
| Shift | (80, 100) | 1,25 | 1,25 | cercul Ø 50, centrul (105, 100) |
| Ctrl | (80, 100) | 1,25 | 1 | elipsa 50 × 40, ca fără tastă |
| Alt | (100, 100) | 1,5 | 1 | elipsa 60 × 40, centrul (100, 100) |
| Alt + Shift | (100, 100) | 1,5 | 1,5 | cercul Ø 60, centrul (100, 100) |
| Alt + Ctrl | (100, 100) | 1,5 | 1 | elipsa 60 × 40, ca Alt |

Colțul dreapta-sus, tras cu (10, 4) mm: fără tastă și cu Shift, cercul Ø 50 (decide x: 1,25 față de 1,1), cu centrul în
(105, 105); cu Ctrl, elipsa 50 × 44, centrul (105, 102); cu Alt, cercul Ø 60 în (100, 100) (1,5 față de 1,2); cu Alt + Ctrl,
elipsa 60 × 48 în (100, 100).

### C. Tastele la desen

18. **Dreptunghiul și elipsa:** fără tastă, din colț în colț (ca azi); Shift, pătrat sau cerc (ca azi); Ctrl, liber (ca fără
    tastă); Alt, din centru (punctul apăsat e centrul, cursorul e un colț al cutiei); Alt + Shift, pătrat sau cerc din centru;
    Alt + Ctrl, ca Alt.
19. **Cercul:** din centru, cu cursorul pe cerc, ca azi (Alt și Shift n-au ce schimba). Cu Ctrl, elipsa din centru, cu cursorul
    în colțul cutiei ei (razele |dx| și |dy|). Clicul fără tragere pune tot cercul cu raza din câmp. **Opțiune (6.V↑d):**
    „Cercul: din centru / din colț”, lângă rază. Din colț, cercul se desenează ca elipsa cu Shift: Alt îl face din centru, cu
    cursorul în colțul cutiei, iar Ctrl îl face elipsă.
20. **Poligonul:** din centru; Shift, primul vârf în pași de 15° (ca azi). **Opțiune (6.V↑d):** Ctrl, poligonul întins, cu
    vârfurile pe elipsa cu semiaxele |dx| și |dy| și primul vârf sus. Nu mai e regulat, deci panoul nu-l mai editează ca
    poligon.
21. **Linia:** Shift, pași de 15° (ca azi); Alt, din mijloc (punctul apăsat e mijlocul liniei).
22. Pen și Text rămân cum sunt.

**Pe hârtie:** apăsat în (10, 10), lăsat în (40, 30). Dreptunghiul: 30 × 20 ([10, 40] × [10, 30]); cu Shift, 30 × 30; cu Alt,
60 × 40 ([−20, 40] × [−10, 30]); cu Alt + Shift, 60 × 60. Elipsa: razele 15 și 10 în (25, 20); cu Shift, cercul R 15 în
(25, 25); cu Alt, razele 30 și 20 în (10, 10); cu Alt + Shift, cercul R 30 în (10, 10). Cercul: R √1 300 = 36,056 în (10, 10);
cu Ctrl, elipsa cu razele 30 și 20 în (10, 10). Linia cu Alt: de la (−20, −10) la (40, 30).

### D. Lipirea, după ce Alt devine centrul (întrebarea 2)

23. **Recomandat:** Alt rămâne „lipirea invers” unde n-are alt sens: la mutarea formelor, la ghidaje, la ancora trasă, la Noduri
    și la Pen. La mânere și la desen, lipirea urmează butonul Lipire, iar **Shift+L** îl comută, și în timpul tragerii (butonul
    arată starea). Probele care țin Alt pentru lipire la mânere (ADR 0055) și la desen (ADR 0052) se schimbă odată cu regula.

### E. Cum se vede ce face tasta

24. Eticheta de lângă cutie (azi, mărimea sau unghiul) primește modul, de exemplu „50,00 × 40,00 mm · proporțional · față de
    ancoră”, iar ținta ancorei se umple cât e punctul fix. La desen, aceeași etichetă stă lângă cursor (azi nu e niciuna), cu
    mărimea formei: „60,00 × 40,00 mm · din centru”.
25. **Opțiune (6.V↑d):** în bara de jos, cât e aleasă Transformarea sau o unealtă de desen, rândul tastelor („Shift proporțional
    · Ctrl liber · Alt din centru”), cu cele ținute evidențiate.

### F. Arcele și textul la o scalare neuniformă

26. **Cercul devine elipsă.** O scalare neuniformă a unui `cerc` (în axele lui) dă elipsa generatorului uneltei de desen
    (`elipsa`, ADR 0053 §4–§5): aceleași cubice ca o elipsă desenată (sub 0,000001 mm), recunoscută de panou, deci razele ei se
    editează după. O elipsă recunoscută se face din nou din generator, cu razele noi; cu razele egale, din nou `cerc`. Intră în
    6.V↑, fiindcă e exemplul owner-ului.
27. **Arcele unei căi** (colțurile unui offset, arcele importate, literele cu aldin) devin cubice ale aceluiași cerc, apoi se
    scalează exact, ca la înclinare (ADR 0078 §2). Toleranța proiectului se împarte la scara elementului în lume și la cea mai
    mare dintre scări, deci curbele stau sub 0,001 mm de arcul de elipsă. Eticheta spune „arcele devin curbe” cât se trage;
    Ctrl+Z le readuce.
28. **Dreptunghiul cu colțuri rotunjite**, opțiune cu trei feluri, în bara Transformării:
    a) la o scalare neuniformă colțurile își păstrează raza, la una uniformă raza crește cu forma (implicit). Rămâne
    `dreptunghi`, exact și editabil; un colț care nu mai încape se refuză cu motiv;
    b) raza rămâne mereu, și la scalarea uniformă (ca „Scale Corners” oprit în Illustrator);
    c) colțurile se scalează mereu; la scalarea neuniformă devin sferturi de elipsă, din curbe.
29. **Textul** drept, fără aldin, rămâne text (ADR 0138 §4, neschimbat); pe o curbă devine vectori, ca azi. Cu aldin, azi
    refuzat din cauza arcelor, devine vectori (curbe), cu eticheta „textul devine vectori”.
30. **Instanțele rotite** altfel decât cu 90° rămân refuzate la o scalare neuniformă (`neuniform-rotit`), cu motivul lângă cutie.
    **Opțiune (6.V↑d):** scalarea în axele foii intră în geometrie, ca înclinarea (A = W⁻¹ · S · W: liniile și cubicele exacte,
    arcele din curbe), iar rotirea instanței rămâne.

### G. Ce nu se schimbă

31. Documentul (v20) și G-code-ul formelor de azi. Mutarea (Alt și lipirea), săgețile (Alt 0,1 mm), Noduri (Alt desparte
    mânerele), Pen, textul (Alt + săgeți), rotirea din panou (în jurul centrului instanței). Oglindirea și înclinarea, cât
    ancora stă în centru.
32. **Pornirea nu primește nimic:** tot ce e nou stă în modulul editării și în calculul la cerere.

## Feliile

| Felia | Ce | Mașina |
|---|---|---|
| 6.V↑ | Tastele la mânere și la desen (§B, §C, fără opțiuni): Shift proporțional, Ctrl liber, Alt față de centrul cutiei, combinate, citite și la apăsarea tastei; cercul care devine elipsă (§F.26); eticheta cu modul (§E.24); lipirea după răspunsul 2 (§D) | nu |
| 6.V↑b | Ancora (§A.1–§A.6): selectorul 3 × 3 în bara Transformării, ținta pe pânză (trasă, lipită, dublu clic înapoi), urmată de selecție; rotirea, Alt, oglindirea și înclinarea față de ea | nu |
| 6.V↑c | Arcele și textul (§F.27–§F.29): arcele căilor devin curbe, colțurile rotunjite în cele trei feluri, textul cu aldin devine vectori | nu |
| 6.V↑d | Opțiunile: „Alt ține fix” (§B.17), cercul din colț și poligonul întins (§C.19–§C.20), rândul tastelor în bara de jos (§E.25), X / Y ale ancorei în panou (§A.7), instanțele rotite (§F.30) | nu |

Fiecare felie vine cu manualul (capitolele desenului, selecției și scurtăturilor, în ambele limbi; un buton nou cere capitolul
lui, `%% acopera:`), cu pașii testului din aplicație (`docs/tutorial/unelte-desen.md`) și cu fișa.

**Bugetul (întrebarea 4).** Estimat, gzip, în modulul editării și în calculul la cerere (pornirea neschimbată): 6.V↑ ~1,2 kB,
6.V↑b ~1,5 kB, 6.V↑c ~0,8 kB, 6.V↑d ~1,5 kB. Deci ~5 kB pe toată linia, fiecare felie sub ținta de 3 kB. Totalul pe `main` e
535,0 / 600 kB, iar liniile paralele au gata pe ramuri încă ~60 kB: cu toate unite rămân ~5 kB în tot pachetul (ADR 0143), cât
ar lua singură linia asta. Textele noi stau în dicționarele modulelor (date, ADR 0086), nu în totalul de JavaScript.

## Proba

- **Pe hârtie** (`test/unit/editare.test.ts`, `unelte-desen.test.ts`, `transformare.test.ts`): tabelele din §B și §C; fiecare
  mâner (cele patru colțuri, cele patru laturi) cu fiecare combinație (fără tastă, Shift, Ctrl, Alt, perechile lor, Shift +
  Ctrl). Ancora: dreptunghiul 40 × 20 din (0, 0), rotit cu 90° în jurul colțului stânga-jos, dă cutia [−20, 0] × [0, 40], iar
  în jurul centrului, [10, 30] × [−10, 30]. Cu ancora liberă în (10, 10), latura dreaptă trasă de la 40 la 50 cu Alt dă
  sx = 40 / 30 și cutia [−3,333…, 50]; fără Alt, sx = 1,25 și cutia [0, 50]. Oglindirea orizontală față de ea dă [−20, 20].
  Cu ancora pe latura trasă, axa nu se scalează.
- **Arcele:** cercul R 20 scalat cu (1,5; 1) dă exact `elipsa((0, 0), 30, 20)` (aceleași vârfuri și puncte de control), pe care
  panoul o recunoaște. Dreptunghiul 100 × 60 cu R 10, latura dreaptă × 1,5: 150 × 60, R 10 (felul a); × 0,15: refuzat
  (15 < 2 · 10); felul c: patru linii, iar colțurile, sferturi de elipsă cu razele 15 și 10, cu toate eșantioanele la cel mult
  0,001 mm de elipsa exactă. O cale cu un semicerc R 10 scalată cu (2; 1): curbe sub 0,001 mm de elipsa cu razele 20 și 10, și
  pe o instanță din grupuri scalate (ca la ADR 0078). Textul cu aldin scalat neuniform: vectori, fără bloc; textul drept: același
  bloc ca azi (ADR 0138).
- **Ușa:** documentul de după trece de schemă și de plafoane, ca la orice transformare.
- **E2e** (Edge): cercul Ø 40, latura dreaptă trasă cu 10 mm cu fiecare combinație, citit în panou (razele elipsei sau raza);
  Shift apăsat cu mausul pe loc schimbă previzualizarea; desenul cu Alt și cu Alt + Shift; ancora pusă pe un colț din selector
  și trasă de mână (lipită de un ghidaj), cu rotirea și oglindirea față de ea; lipirea la mânere fără Alt; Shift+L.
- **Otrăvurile** (`test/otravuri/6.V.py` și următoarele): Shift ignorat pe o latură; Ctrl ignorat pe un colț; Alt cu mânerul
  opus; Shift + Ctrl dat lui Ctrl; tasta necitită la apăsare; razele elipsei inversate; elipsa făcută din `arcInCubice`
  (nerecunoscută) în locul generatorului; ancora nepusă la loc după rotire; rotirea în jurul centrului cu ancora mutată;
  toleranța arcelor fără scara cea mai mare; raza colțului scalată la felul a; Alt care încă inversează lipirea la mânere.
- **Probele de azi care se schimbă:** cele cu Shift = colțul liber (ADR 0052), cu Alt = lipirea liberă la mânere și la desen
  (ADR 0052, ADR 0055) și cele care așteaptă refuzul cercului (`neuniform-cerc`) sau al aldinului. Fiecare se rescrie pe regula
  nouă, nu se șterge.

## Întrebările (owner, recomandarea întâi)

1. **Ancora în proiect:** a) nu: e a selecției de acum, cu punctul de pornire ținut în browser, ca în ArtCAM, CorelDRAW și
   Illustrator (recomandat; documentul rămâne v20); b) da: fiecare piesă își ține ancora în proiect, ca în Inkscape (o versiune
   nouă a documentului, cerută întâi sesiunii principale; felia ei, după 6.V↑b).
2. **Lipirea la mânere și la desen, după ce Alt devine centrul:** a) acolo lipirea urmează butonul Lipire, comutat și cu Shift+L;
   Alt rămâne „lipirea invers” la mutare, ghidaje, ancoră, Noduri și Pen (recomandat); b) acolo, lipirea invers cu Space ținut
   după apăsare (Space dinaintea apăsării rămâne panoramarea); c) altă tastă, scrisă în notă.
3. **Shift și Ctrl ținute împreună:** a) câștigă Shift, adică proporția (recomandat); b) câștigă tasta apăsată ultima; c) scara în
   trepte întregi (×2, ×3, ½, ⅓), ca Ctrl în CorelDRAW și Alt în Inkscape.
4. **Bugetul:** a) 6.V↑, 6.V↑b și 6.V↑c acum (~3,5 kB), iar 6.V↑d după decizia ta pe plafon, când se unesc liniile
   (recomandat); b) toate patru acum (~5 kB), cu plafonul ridicat printr-un ADR nou.

## Răspunsurile owner-ului (08.11)

„Ok la toate” (la „Accepți recomandările la cele 4 întrebări din ADR 0240?”), deci recomandările:
1. „1a”: ancora e a selecției de acum, cu punctul de pornire ținut în browser; documentul rămâne v20;
2. „2a”: la mânere și la desen, lipirea urmează butonul Lipire, comutat și cu Shift+L; Alt rămâne „lipirea invers” la
   mutare, ghidaje, ancoră, Noduri și Pen;
3. „3a”: cu Shift și Ctrl ținute împreună, câștigă Shift (proporția);
4. „4a”: 6.V↑, 6.V↑b și 6.V↑c acum; 6.V↑d după decizia owner-ului pe plafon, când se unesc liniile.

## Ce am respins

- **Shift = colțul liber** (azi): invers decât cererea și decât ArtCAM și Illustrator.
- **Alt rămas „lipirea invers” peste tot, cu „din centru” pe altă tastă:** cererea spune Alt.
- **Ancora doar pe nodurile formei:** ArtCAM, Inkscape și Illustrator o lasă oriunde.
- **Un mod „rotire” la al doilea clic** (CorelDRAW, Inkscape): cvs2 are mânerul de rotire deasupra cutiei (ADR 0052); încă un mod
  ar cere încă un gest.
- **O elipsă exactă în document** (un fel nou de formă): respinsă în ADR 0078, fiindcă cere o ramură nouă în tot lanțul CAM;
  generatorul o dă sub 0,000001 mm.

## Se redeschide dacă

- ancora se mută din greșeală când omul vrea să mute forma (atunci: lacătul din ArtCAM, sau ținta trasă doar cu o tastă);
- se cere ancora ținută în proiect (întrebarea 1b), copierea pe cerc în jurul ei sau rotirea din panou în jurul ei;
- cineva din echipă vrea altă schemă a tastelor (CorelDRAW o lasă la alegere);
- pe Linux, managerul de ferestre ia Alt + tragere (mută fereastra): atunci, o tastă de rezervă pentru Alt.

## Limitele

- După Ctrl+Z, o ancoră mutată de mână rămâne în aceleași fracții ale cutiei, nu în locul de dinaintea transformării anulate.
- Un cerc dintr-o piesă rotită altfel decât cu 90° rămâne refuzat la o scalare neuniformă, până la opțiunea din 6.V↑d (§F.30).

## Sursele

- ArtCAM 2018, ajutorul Autodesk: [transformarea vectorilor cu cursorul](https://help.autodesk.com/cloudhelp/2018/ENU/ARTC-ReferenceHelp/files/GUID-50578BCB-C16B-4484-96E7-26F7E4FC52E6.htm),
  [originea transformării](https://help.autodesk.com/cloudhelp/2018/ENU/ARTC-ReferenceHelp/files/GUID-D858F3AF-EFA0-41C4-BE4E-C488424BE6FC.htm),
  [dreptunghiul](https://help.autodesk.com/cloudhelp/2018/ENU/ARTC-ReferenceHelp/files/GUID-EAD166E4-BFBD-4793-8A9C-106BBEB7AB23.htm),
  [scurtăturile](https://help.autodesk.com/cloudhelp/2018/ENU/ARTC-ReferenceHelp/files/GUID-CBD9761A-5AA9-4892-8266-9D8CB2531284.htm).
- CorelDRAW, ajutorul Corel: [mărimea și scara obiectelor](https://product.corel.com/help/CorelDRAW/Documentation-Windows/CorelDRAW-en/CorelDRAW-Size-and-scale-objects.html),
  [dreptunghiurile și pătratele](https://product.corel.com/help/CorelDRAW/540223850/Main/EN/Documentation/CorelDRAW-Drawing-rectangles-and-squares.html),
  [elipsele și cercurile](https://product.corel.com/help/CorelDRAW/540227992/Main/EN/Documentation/CorelDRAW-Drawing-ellipses-circles-arcs-and-pie-shapes.html),
  [tastele de constrângere](https://product.corel.com/help/CorelDRAW/540227992/Main/EN/Documentation/CorelDRAW-Constraining-objects.html).
- Illustrator: [Adobe, scalarea obiectelor](https://helpx.adobe.com/illustrator/using/scaling-shearing-distorting-objects.html);
  [scurtăturile de desen](https://www.nobledesktop.com/shortcuts/illustratorcc/pc).
- Inkscape: [referința tastelor](https://gitlab.com/inkscape/inkscape-docs/documentation/-/raw/master/keys/keys.xml) (Selector,
  Rectangle, Ellipse, Star, Node).
