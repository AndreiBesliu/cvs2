# Sonda s8-posturi: contractele de dialect pentru posturile din v1

Faza 2, tranșa 1. Scris pe 07.10.2026. Tip: cercetare de birou, plus o măsurătoare mică pe regula de arc a GRBL.

**Legendă.** Fiecare afirmație are o etichetă:
- **[măsurat]**: am rulat-o eu;
- **[citit]**: documentație sau cod sursă, cu link în Anexa C;
- **[dedus]**: concluzia mea, din ce am citit sau măsurat.

Unde contează, eticheta are și încrederea: **mare**, **medie** sau **mică**.

**Termeni, explicați o dată:**
- **post** (post-procesor): bucata de program care transformă traseul sculei în text G-code pentru un anumit controler;
- **dialect**: felul în care un controler anume înțelege G-code-ul (ce coduri are, ce unitate, ce comentariu);
- **contract de dialect**: lista scrisă a acestor reguli pentru un controler, fiecare cu sursa ei;
- **IR** (reprezentarea intermediară): traseul tipizat din care postul scrie textul (`LECTII.md` §4, punctul 4);
- **I/J**: centrul unui arc G2/G3. „Incremental” = distanța de la începutul arcului la centru. „Absolut” = poziția centrului în sistemul piesei;
- **WCS**: sistemul de coordonate al piesei (G54–G59);
- **TLO**: offsetul de lungime al sculei (G43 H sau G43.1);
- **G4**: pauză (dwell) în program;
- **ciclu fix**: o găurire scrisă ca un singur cod (G81, G83);
- **sender**: programul care trimite fișierul linie cu linie la controler;
- **ATC**: schimbător automat de scule.

---

## 1. Întrebarea

BRIEF §12 cere în v1 posturi pentru:
- familia GRBL (GRBL 1.1, grblHAL, FluidNC), cu senderul nostru;
- NcStudio (Weihong);
- RichAuto DSP (A11/A18/B18) și Syntec;
- Mach3 și Mach4.

Fiecare post se scrie după documentația controlerului, cu sursa citată. Apoi se probează pe un controler real, într-un atelier.

Ediția întâi avea 12 dialecte, dar numai unul cu sursă. Scria `G21` fix, iar `T# M6` ajungea pe GRBL și dădea `error:20` (`LECTII.md`, rândul „Export și post”).

Sonda trebuia să decidă trei lucruri:
1. ce conține contractul de dialect al fiecărui controler (Anexa A);
2. ce fișiere de probă rulează fiecare atelier și ce se măsoară (Anexa B);
3. ce schimbă asta în arhitectura postului (§5).

## 2. Pe scurt

- **Cele 8 controlere pot citi același IR, dar diferă în 6 puncte care strică piesa dacă sunt greșite:**
  - stilul comentariului;
  - codul de unități (G21 sau G71);
  - punctul zecimal (pe Syntec, `X10` înseamnă 0,010 mm);
  - modul I/J, care pe NcStudio, RichAuto și Mach3 e o setare a controlerului;
  - unitatea pauzei G4: secunde pe GRBL, milisecunde pe NcStudio și Syntec, după setare pe Mach3;
  - schimbarea sculei.

  Toate sunt [citit], cu sursa în Anexa A.
- **Documentația e bună** pentru GRBL, grblHAL și FluidNC (codul sursă), Mach3, Mach4, NcStudio și Syntec. **E slabă pentru RichAuto:** manualul A11 nu are listă de coduri și nu pomenește nicăieri comentariile, M30 sau G21 [citit, mare].
- **Recomandarea:** un singur post, condus de un contract de dialect scris ca date, cu sursa pe fiecare câmp.
  - Schimbarea sculei e un eveniment în IR, tradus de contract într-una din 4 strategii.
  - Implicitul e „un fișier pe sculă” acolo unde M6 nu e sigur: GRBL 1.1 cu sender străin, FluidNC fără ATC, NcStudio și RichAuto [dedus].
- **Am măsurat regula de arc a GRBL** pe 200 000 de arce pentru fiecare configurație, cu raze de la 0,005 la 2 440 mm [măsurat]:
  - cu 3 zecimale în mm: 0 erori. Diferența maximă de rază e 0,0023 mm, sub pragul de 0,005 mm și sub marginea calculată pe hârtie, 0,0028 mm;
  - cu 4 zecimale în inch apar erori (2–5 la 200 000), exact clasa raportată de utilizatori la Vectric 10.5;
  - fără o gardă de coardă minimă și de unghi minim, arcele foarte mici devin cercuri întregi.
- **Proba în atelier:** un pachet de 6–8 fișiere mici (sub 300 de linii, în afară de fișierul care testează limitele), cu valori calculate pe hârtie. Pentru RichAuto e probabil nevoie de două runde [dedus].

## 3. Candidații

Sonda e cercetare de birou, deci „candidații” sunt sursele (cât de mult te poți baza pe ele) și variantele de post.

### 3.1 Sursele pe controlere

| Controler | Sursa principală | Licența sursei | Ce am verificat | Verdict |
|---|---|---|---|---|
| GRBL 1.1 | codul `gnea/grbl` + lista oficială de erori | GPL-3.0 (doar citit, nu se copiază nimic) | coduri, comentarii, arce, M6, G4, linia de 79 | **bună**: sursa e chiar codul care rulează |
| grblHAL | codul `grblHAL/core` (build 20261004) + wiki | GPL-3.0 (doar citit) | M6 după `$341`, linia de 256, coduri în plus | **bună**; regula de arc nu am putut-o citi (fișier trunchiat) |
| FluidNC | codul `bdring/FluidNC` | GPL-3.0 (doar citit) | M6 fără ATC, linia de 255, G4, lipsa ciclurilor fixe | **bună** pe sursă; wiki-ul a refuzat conexiunea |
| NcStudio | Programming Manual ed. 6 (2016) + User's Manual V8 | © Weihong (citat scurt) | comentariul `'`, G04 în ms, parametrul I/J, fără M06 | **bună** |
| RichAuto A11/A18/B18 | manualul A11 (două ediții) + personalul Axiom pe forum | © RichAuto; forum | setările „G Code Setup”; lipsa comentariilor | **slabă**: fără listă de coduri; A18/B18 fără manual |
| Syntec | Mill Machine Program Manual v8.19 (2015) | © Syntec (citat scurt) | G70/G71, punctul zecimal, G04, M06 | **bună** pentru v8.19; seriile noi pot diferi |
| Mach3 | „Using Mach3Mill”, Release 1.84 | © ArtSoft (citat scurt) | linia de 256, N ≤ 99999, mod I/J, G4 după setare, M6 | **bună** |
| Mach4 | GCode Manual v1.0 + Programming Guide v1.1 (build 3775) | © Newfangled/ArtSoft | G4 (cele două ediții se contrazic), un M pe bloc, T la M6 | **bună**, cu o contradicție de probat |
| Posturile Autodesk (NcStudio, Syntec, Mach3, Mach4) | fișierele `.cps` din biblioteca publică Autodesk | proprietar Autodesk: **nu se copiază**, doar se citează ce arată | setări: comentariu, arce, G4, M6 | **martor util**, independent de manuale |

### 3.2 Variantele de post

| Variantă | Ce face | Ce am măsurat sau citit | Verdict |
|---|---|---|---|
| Post unic + contract de dialect ca date | un serializator. Diferențele stau în câmpuri cu sursă | 8 contracte încap în aceleași ~15 câmpuri (Anexa A) [citit] | **recomandat** |
| Câte un post scris de mână pe controler | 8 serializatoare | ediția întâi: 5 emitenți de G-code. Fiecare își aplica singur transformarea, iar relieful a ieșit 62 de zile în alt cadru (`LECTII.md` §1, rândul „Export și post”, și §2.1) [citit] | **respins** |
| I/J calculat din startul exact (A) | centrul se rotunjește separat de start | 0 erori la 3 zecimale în mm, dar marginea e mai largă: 4,24·10⁻ᵈ [măsurat] | acceptabil |
| I/J calculat din startul deja rotunjit (B) | controlerul vede centrul la cel mult o jumătate de rezoluție pe axă | 0 erori la 3 zecimale în mm; margine pe hârtie 2,83·10⁻ᵈ [măsurat] | **recomandat** |
| Arc fără gardă de coardă și de unghi | scrie orice arc | zeci de mii de arce mici devin cercuri întregi (§4.2) [măsurat] | **respins** |
| Arc cu gardă: coardă ≥ 10 rezoluții **și** unghi ≥ 1·10⁻⁴ rad, altfel G1 | arcele degenerate devin linii | 0 cercuri false și 0 erori la 3 zecimale în mm, în float32 [măsurat] | **recomandat** |
| Schimbare de sculă: M6 | controlerul oprește, sau senderul interceptează | GRBL 1.1: `error:20`. FluidNC fără ATC: continuă fără pauză [citit, mare] | doar unde contractul o permite |
| Schimbare de sculă: M0 + comentariu | pauză | GRBL 1.1 refuză jog-ul în pauza M0 [citit, mare] | doar ca opțiune |
| Schimbare de sculă: fișiere separate pe sculă | câte un fișier pentru fiecare sculă | merge pe orice controler [dedus] | **implicit** unde M6 nu e sigur |
| Ciclu fix de găurire (G81/G83) | un cod per gaură | lipsește pe GRBL 1.1 și FluidNC [citit, mare] | **amânat**. În v1 se scrie desfăcut în G0/G1 |

## 4. Măsurători

### 4.1 Cercetarea: metoda

- **Codul sursă GRBL, grblHAL și FluidNC:** l-am citit direct de pe GitHub (`raw.githubusercontent.com`), pe ramurile principale din 07.10.2026.
- **Manualele PDF:** au fost aduse de unealta de citire web, apoi transformate în text cu `pdftotext`. Am căutat în text și am citit secțiunile întregi, nu doar rezumatele.
  - Copiile stau doar în spațiul de lucru temporar, nu în repo, fiindcă sunt documente cu drepturi de autor.
- **Posturile Autodesk:** am citit doar liniile de setări (comentariu, arce, G4, M6). Nu am copiat nimic din ele.
- **Forumuri:** le-am folosit doar pentru capcanele raportate de utilizatori. Sunt marcate cu încredere medie.
- **Ce nu s-a putut citi** e trecut la §6 și în rezumatul structurat.

### 4.2 Măsurătoarea: regula de arc a GRBL după rotunjire

**Întrebarea:** câte zecimale și ce garduri trebuie să aibă postul, ca un arc scris în text:
1. să treacă verificarea de capăt a GRBL (`error:33`);
2. să nu se transforme în cerc întreg din cauza rotunjirii?

**Regula controlerului.** Am citit-o din `grbl/gcode.c` și `grbl/motion_control.c` și am rescris-o, fără cod comun cu GRBL [citit, mare]:
- raza din I/J: `r = hypot(I, J)`;
- raza până la capăt: `target_r = |capăt − (start + IJ)|`;
- eroare 33 dacă `|target_r − r| > 0,005 mm` **și** (`> 0,5 mm` **sau** `> 0,1 % din r`);
- unghiul arcului se calculează cu `atan2`. Dacă, în sensul cerut, e sub 5·10⁻⁷ rad sau iese de semn opus, GRBL adaugă 2π, adică un cerc întreg;
- FluidNC are exact aceeași regulă [citit, mare]. La grblHAL o presupun [dedus, medie].

**Corpusul** (determinist, cu sămânță fixă):
- 200 000 de arce pentru fiecare configurație;
- raza log-uniformă între 0,005 și 2 440 mm;
- centrul oriunde pe o placă de 2 440 × 2 440;
- unghiul între 0,00001° și 359,99°, în ambele sensuri.

Corpusul rupe coincidențele: raze minuscule, raze de mărimea plăcii, arce aproape plate și aproape cercuri întregi.

**Oracolul:**
1. **Geometria exactă**, calculată înainte de orice rotunjire.
2. **O margine calculată pe hârtie.** Cu strategia B, startul, capătul și centrul văzut de controler se abat fiecare cu cel mult (√2/2)·10⁻ᵈ. Deci `|target_r − r| ≤ |eS| + |eE| + 2|eC| ≤ 2,83·10⁻ᵈ`.
3. **Un control care trebuie să cadă:** 2 zecimale în mm.
4. **Un martor din lumea reală:** raportul Vectric 10.5 din iulie 2020, cu 4 zecimale în inch și „arc end point error” pe GRBL [citit, medie].

**Rezultatele** [măsurat]. Ieșirea întreagă se obține cu comanda din §7.

| Unitate, zecimale | Strategie I/J | Gardă (coardă, unghi) | Calcul | Erori 33 (din care r < 5 mm) | Cercuri false | Δr maxim | Marginea pe hârtie |
|---|---|---|---|---|---|---|---|
| mm, 2 (control) | B | fără | double | **12 502 (11 593)** | 98 162 | 0,0224 mm | 0,0283 mm |
| mm, 3 | A | fără | double | 0 | 73 081 | 0,0021 mm | 0,0042 mm (A) |
| mm, 3 | B | fără | double | 0 | 73 082 | 0,0022 mm | 0,0028 mm |
| mm, 3 | B | 10 rezoluții, 1·10⁻⁴ rad | **float32** | **0** | **0** | 0,0023 mm | 0,0028 mm |
| mm, 4 | B | 10 rezoluții, fără unghi | double | 0 | **15** | 0,0002 mm | 0,0003 mm |
| mm, 4 | B | 10 rezoluții, 1·10⁻⁴ rad | float32 | 0 | 0 | 0,0005 mm | 0,0003 mm (depășită de float32) |
| inch, 4 | B | fără | double | **4 (4)** | 83 328 | 0,0055 mm | 0,0072 mm |
| inch, 4 | B | 10 rezoluții, 1·10⁻⁴ rad | float32 | **2 (2)** | 0 | 0,0056 mm | 0,0072 mm |
| inch, 5 | B | 10 rezoluții, 1·10⁻⁴ rad | float32 | 0 | 0 | 0,0010 mm | 0,0007 mm (depășită de float32) |

**Ce arată:**
- **3 zecimale în mm ajung** pentru regula de capăt a GRBL. Valoarea măsurată stă sub marginea de pe hârtie, iar marginea e de 1,8 ori sub prag [măsurat + calculat].
  - A patra zecimală nu ajută pe controlerele cu float32 (GRBL pe AVR, grblHAL și FluidNC pe MCU-uri de 32 de biți). La coordonate de ~2 400 mm, pasul de reprezentare al float32 e deja ~0,00024 mm [măsurat: Δr crește de la 0,0002 la 0,0005 mm când trec în float32].
- **4 zecimale în inch nu ajung** pentru arcele cu raza sub 5 mm, chiar cu garduri. Rezultatul reproduce raportul Vectric [măsurat + citit]. În inch trebuie 5 zecimale.
- **Controlul cade cum trebuie:** 2 zecimale în mm dau 6 % erori, deci reimplementarea regulii discriminează [măsurat].
- **Fără garduri, arcele foarte mici devin cercuri întregi.** Există două mecanisme:
  1. rotunjirea mută capătul „în spatele” startului;
  2. unghiul exact e sub pragul de 5·10⁻⁷ rad al GRBL.

  Cele 15 cazuri cu 4 zecimale în mm sunt arce cu raza de ~2 100–2 400 mm și coarda de 0,001 mm, deci al doilea mecanism. Garda de coardă singură nu ajunge. Trebuie și un unghi minim [măsurat].
  - Biarcele folosite la aproximarea curbelor Bézier aproape drepte produc exact astfel de arce: raze uriașe, coarde mici [dedus].
- **Abaterea drumului față de arcul exact:** cel mult 0,0021 mm la 3 zecimale în mm (maximul pe 200 000 de arce) [măsurat].

**Zgomotul.** Măsurătoarea e deterministă (sămânță fixă). Repetările dau aceleași numere, iar timpul de rulare (~4 s) nu contează. Mediana pe 5 repetări nu are sens aici.

**Limitele măsurătorii:**
- verifică regula controlerului, nu mașina: dacă arcul taie bine se vede la proba din atelier;
- regulile de arc ale NcStudio, RichAuto, Syntec și Mach nu sunt publicate, deci nu le-am putut simula. Postul Autodesk pentru NcStudio limitează razele la 0,01–1 000 mm și unghiul la 0,01°…180° [citit], ceea ce sugerează limite asemănătoare [dedus, mică].

## 5. Ce schimbă în arhitectură

Decizii propuse pentru plan, în ordinea importanței:

1. **Un singur post, condus de un contract de dialect scris ca date.**
   - Câmpurile sunt cele din Anexa A: unități, numere, comentarii, numere de linie, lungimea liniei, arce, schimbarea sculei, pauză, început și sfârșit, WCS, cicluri, extensie.
   - Fiecare câmp are sursa (document, secțiune, data citirii) și starea: „documentat” sau „probat în atelier la data X, cu fișierul Y, pe versiunea Z”.
   - Interfața de export arată starea. Un post „documentat, neprobat” poartă un avertisment până la probă [dedus].
2. **Formatorul de numere are o singură regulă:**
   - zecimale fixe, cu **punctul zecimal scris mereu**, fără tăierea zerourilor. Pe Syntec, `X10` = 0,010 mm [citit, mare];
   - 3 zecimale în mm și 5 în inch [măsurat];
   - ASCII strict: diacriticele românești se transliterează în comentarii;
   - o mutație care taie „.000” trebuie să pice o probă [dedus].
3. **Arcele sunt arce reale în G-code**, adică partea de CAM a cerinței „vectori reali” din BRIEF §16.2.
   - **Format:** I/J incremental, calculat din startul deja rotunjit (strategia B).
   - **Gardă:** coardă ≥ 10 rezoluții **și** unghi ≥ 1·10⁻⁴ rad, altfel G1 [măsurat].
   - **Limite:** cel mult 180° pe bloc, iar cercurile întregi se împart în 2–4 arce. Plan G17 în v1. Elicea doar unde contractul o declară.
   - **R nu se folosește implicit:** toate cele 8 controlere au I/J [citit].
   - **Validare după rotunjire:** fiecare arc scris se re-citește din text și se verifică cu regula controlerului țintă (pentru GRBL, cea din §4.2). Asta e oracol în CI, nu cod în produs [dedus].
   - **Pentru mai târziu:** grblHAL are G5, spline cubic [citit], adică o curbă Bézier direct în G-code. Nu intră în v1 [dedus].
4. **Schimbarea sculei e un eveniment în IR,** iar contractul o traduce într-una din 4 strategii:
   - **M6 interceptat de senderul nostru** (familia GRBL, rulată din aplicație): M6 nu se trimite niciodată controlerului. E bariera din BRIEF §10;
   - **M6 lăsat controlerului**: grblHAL cu `$341` între 0 și 3, Syntec (`T` + `M06`), Mach3/Mach4 (`T` pe linia dinainte, `M6` singur);
   - **M0/M00 + comentariu** (opțiune);
   - **fișiere separate pe sculă**: implicit pentru GRBL 1.1 cu sender străin, FluidNC fără ATC, NcStudio și RichAuto.

   *De ce:* GRBL 1.1 dă `error:20` la M6, iar FluidNC fără ATC trece peste M6 fără pauză [citit, mare]. NcStudio n-are M06 [citit, mare]. RichAuto nu-l documentează [citit].
5. **Pauza după pornirea axului e un parametru al mașinii.** Postul o scrie în unitatea controlerului:
   - GRBL, grblHAL, FluidNC: secunde;
   - NcStudio: ms;
   - Syntec: `P` în ms, întreg;
   - Mach4: `P2.0`, secunde cu punct, care dă același rezultat în ambele ediții ale manualului;
   - Mach3: după setarea „G04 in ms” a profilului, verificată la probă.

   FluidNC poate aștepta singur (`spinup_ms`). O pauză în plus nu strică [citit, dedus].
6. **Antetul setează tot ce folosește programul:** G90, G17, unitățile, G94, plus G40, G49 și G80 unde există.
   - *De ce:* macrourile de palpare lasă controlerul în G91, iar următorul program cade pe arce (raport V1E, 2024) [citit, medie].
   - Pe Mach, G91.1 se scrie pe linia lui. Costul e zero, iar ordinea pe linie la Mach3 e neclară [dedus].
7. **WCS-ul se scrie explicit când e ales, și niciodată implicit.** GRBL resetează la G54 după M2/M30 [citit, mare]. Deci un job în G55 trebuie să scrie G55 de fiecare dată.
8. **Plafon de linie de 70 de octeți pentru toate contractele.**
   - GRBL acceptă cel mult 79 de caractere utile, după ce scoate spațiile și comentariile.
   - Senderul cu numărare de caractere are 128 de octeți.
   - Pe NcStudio și RichAuto limita e nedocumentată [citit + dedus].
   - Comentariile se taie, nu se rup pe două linii.
9. **Găurirea în pași se scrie desfăcută în G0/G1 în v1.**
   - GRBL 1.1 și FluidNC n-au cicluri fixe [citit, mare].
   - Simularea și oracolul citesc astfel aceleași mișcări pe toate controlerele.
   - Ciclurile fixe rămân un câmp de contract pentru mai târziu.
10. **Fișa de lucru tipărită listează setările controlerului de care depinde fișierul:**
    - NcStudio: N4063 (modul I/J), N4034 și N4035 (avansul și turația din fișier);
    - RichAuto: F Read, AbsCntr, T Read;
    - Mach3: modul IJ, unitatea G4, M6;
    - Mach4: T de la M6;
    - grblHAL: `$341`; FluidNC: ATC.

    Operatorul le verifică înainte de pornire [dedus].
11. **Pachetul de probă îl generează chiar aplicația, cu același post** (Anexa B).
    - Rezultatele din atelier (cote, timpi, fotografii ale erorilor) devin teste automate: fișierul de aur plus cotele măsurate.
    - **Momentul:** pachetul pleacă la ateliere la sfârșitul etapei în care intră nucleul postului, nu la sfârșitul v1. Atelierele externe sunt drumul critic (BRIEF §15) [dedus].
12. **Adminul** (BRIEF §16.1) poate arăta, doar pentru citire:
    - registrul posturilor, cu starea „documentat / probat” și dovezile;
    - ce posturi folosesc utilizatorii și erorile de export raportate.

    Contractele nu se editează din admin. Un dialect greșit e risc de coliziune, deci trece prin revizuire și CI, ca orice cod [dedus].

## 6. Riscuri și ce a rămas neprobat

- **Nimic din contracte nu e probat pe fier.** Proba vine din atelier, după Anexa B. Familia GRBL se poate proba pe mașina owner-ului.
- **Versiunile diferă de documente:**
  - NcStudio are V5, V8, V10 și V15;
  - RichAuto are A11, A11E, A18 și seria B;
  - Syntec are v8.19 față de seriile noi;
  - Mach4 are build-uri diferite.

  Raportul din atelier trebuie să noteze versiunea exactă. Contractul se leagă de ea [dedus].
- **Semantica depinde de setări** (modul I/J, unitatea G4, F ignorat, T de la M6, `$341`, ATC-ul FluidNC). Un atelier cu setări neobișnuite poate tăia greșit un fișier corect. Plasa e fișa de lucru (§5.10), plus fișierele T1/T2 la probă [dedus].
- **RichAuto e cel mai neclar:**
  - comentariile, M30, G21/G17 și M6 nu apar în manual [citit];
  - lista de coduri vine de la personalul unui producător de mașini, pe un forum [citit, medie];
  - pentru A18/B18 n-am găsit manual. Presupun același interpretor [dedus, mică].

  Bugetul trebuie să cuprindă două runde de probă.
- **Mach4:** ediția v1.0 a manualului spune „G4 P în secunde”, iar v1.1 spune „P fără punct = ms”. Forma `P2.0` e sigură doar dacă v1.1 tratează punctul cum scrie [citit + dedus, medie].
- **Mach3 demo** limitează mărimea lucrării [citit]. Cifra de 500 de linii vine din surse secundare [citit, medie]. Fișierele de probă stau sub 500 de linii.
- **Syntec:** comentariile `( )` nu sunt documentate în v8.19. Exemplele folosesc `//`, iar postul Autodesk scrie `( )`. Se probează amândouă.
- **Neprobat în sondă:**
  - regula de arc a grblHAL (fișierul s-a trunchiat la citire);
  - wiki-ul FluidNC (conexiune refuzată);
  - forumurile Autodesk (403);
  - manualele oficiale Weihong V8/V10 (404). Am folosit copiile de la distribuitori.
- **Drepturi:** manualele și posturile Autodesk sunt protejate. Repo-ul e public, deci nu intră în el nici copii, nici fragmente lungi. Contractele noastre conțin fapte, cu trimitere la sursă [dedus].
- **Licențe:** GRBL, grblHAL și FluidNC sunt GPL-3.0. Le-am citit ca documentație. Regula de arc a fost rescrisă de la zero, în test, nu în produs. Nimic GPL nu intră în aplicație [dedus].

## 7. Cum se reproduce

```
cwd:     C:/Users/besli/Desktop/MyWork/Apps/cncvs2/docs/faza2/sonde/s8-posturi/cod
comanda: node arc-rounding.mjs 200000
```

- Durează ~4 s pe o mașină încărcată și nu are dependențe (Node 26).
- Rezultatul e determinist. Trebuie să iasă exact numerele din §4.2: de exemplu, „mm 3 B 10 0.0001 da … 0(0) … 0 … 2.32e-3”.
- Cercetarea de birou nu are comandă. Sursele sunt în Anexa C.

---

## Anexa A. Contractele de dialect, controler cu controler

Același set de câmpuri pentru fiecare. „De probat” = ce trebuie confirmat în atelier.

### A.0 Diferențele care contează, pe un rând

| Controler | Comentariu | Unități | Punct zecimal | I/J | G4 | Schimbarea sculei (implicit propus) | Linie max. |
|---|---|---|---|---|---|---|---|
| GRBL 1.1 | `( )` și `;` | G21 | opțional | doar incremental | P în **s** | sender: M6 interceptat; extern: fișiere separate | **79** utile |
| grblHAL | `( )` și `;` | G21 | opțional | doar incremental | P în s [dedus] | M6 dacă `$341` între 0 și 3, altfel fișiere separate | 256 |
| FluidNC | `( )`, `;`, `(MSG,…)` | G21 | opțional | doar incremental | P în **s** | fișiere separate; M6 doar cu ATC/macro declarat | 255 |
| NcStudio | **`'`** | G21 sau G71 | opțional | **setare N4063** | P în **ms** | fișiere separate (n-are M06) | ? |
| RichAuto | **?** | metric (fără cod?) | ? | **setare AbsCntr** | ? | fișiere separate | ? |
| Syntec | `( )`? `//`? | **G71** | **obligatoriu** | incremental | P în **ms**, întreg | `T` + `M06` + `G43 H` | ? |
| Mach3 | `( )`, `//` | G21 | opțional | **setare** + G91.1 | **după setare** | `T` / `M6` | 256 |
| Mach4 | `( )` (după postul Autodesk) | G21 | recomandat | setare + G91.1 | `P2.0` = 2 s | `T` / `M6` | ? |

### A.1 GRBL 1.1 (gnea/grbl)

- **Sursa:** codul `grbl/gcode.c`, `protocol.c`, `protocol.h`, `serial.h`, `motion_control.c`, `config.h`, `defaults.h`, plus lista de erori și README [citit, mare].
- **Coduri acceptate:**
  - G: G0–G3, G4, G10 L2/L20, G17–G19, G20/G21, G28/G28.1, G30/G30.1, G38.2–G38.5, G40, G43.1, G49, G53, G54–G59, G61, G80, G90/G91, G91.1, G92/G92.1, G93/G94;
  - M: M0, M1, M2, M30, M3–M5, M7 (opțional la compilare), M8, M9, M56 (opțional);
  - orice alt cod dă `error:20` [citit, mare].
- **Unități:** G21 implicit, G20 inch. Valorile se convertesc în mm la citire, inclusiv I/J/K [citit, mare].
- **Numere:** în virgulă mobilă; `X10` = 10 unități. Postul: 3 zecimale în mm, 5 în inch [măsurat].
- **Comentarii:**
  - `( … )` ține până la `)` sau până la capătul liniei; `;` ține până la capătul liniei [citit, mare];
  - spațiile și comentariile se scot înainte de numărarea liniei;
  - `/` (ștergerea de bloc) e ignorat.
- **Numere de linie:** opționale; peste 10 000 000 dau eroare [citit, mare]. Postul nu le scrie.
- **Lungimea liniei:** cel mult 79 de caractere utile (bufferul are 80, cu terminatorul); de la 80 vine `error:11` [citit, mare].
  - Bufferul serial are 128 de octeți. Un sender cu numărare de caractere nu poate trimite o linie de 128 de octeți sau mai lungă [citit, mare]. Ediția întâi atârna aici.
- **Arce:**
  - G2/G3 cu I/J/K, doar incremental. G91.1 nu face nimic, iar G90.1 dă `error:20` [citit, mare];
  - R e permis, dar nu pentru cerc întreg [citit, mare];
  - elice: da; planuri G17, G18, G19 [citit, mare];
  - verificarea de capăt și cercul fals sunt cele din §4.2;
  - toleranța de segmentare `$12` = 0,002 mm implicit [citit, mare].
- **Schimbarea sculei:**
  - M6 nu există și dă `error:20`. T e acceptat până la 255, dar nu face nimic [citit, mare];
  - offsetul de lungime e doar dinamic: G43.1 Z. G43 H nu există [citit, mare];
  - M0 face o oprire de avans (starea Hold), iar jog-ul e acceptat doar în stările Idle și Jog [citit, mare]. Deci M0 nu ajunge pentru o schimbare de sculă cu re-zero [dedus].
- **Ax și pauză:**
  - M3/M4/M5 cu S;
  - nu există așteptare după M3, iar G4 P e în **secunde** [citit, mare].
- **Început și sfârșit:** M2 și M30 resetează G1, G17, G90, G94, G54, M5 și M9. F, S și T rămân [citit, mare].
- **WCS:** G54–G59. G59.1–.3 dau `error:29`. G53 merge doar cu G0/G1 [citit, mare].
- **Cicluri fixe:** niciunul, doar G80 [citit, mare].
- **Extensie:** oricare; `.nc` implicit [dedus].
- **Capcane raportate:**
  - M6, adică `error:20` (ediția întâi) [citit];
  - G91 lăsat activ de palpare, urmat de `error:33` pe arce (V1E, ian. 2024) [citit, medie];
  - prea puține zecimale în inch, urmate de erori de capăt de arc (Carbide3D/Vectric 10.5, iulie 2020) [citit, medie], reproduse în §4.2 [măsurat].
- **De probat:** pe mașina owner-ului (GRBL 1.1h), tot pachetul T0–T7.

### A.2 grblHAL

- **Sursa:** `grblHAL/core` (`gcode.c`, `protocol.h`, `stream.h`, `config.h`), build 20261004, plus wiki-ul cu codurile suplimentare și pagina despre schimbarea sculei [citit, mare].
- **Față de GRBL 1.1:**
  - linia are 256 de caractere, iar bufferul de intrare 1 024 implicit (driverul îl poate schimba) [citit, mare];
  - **coduri în plus** pe toate driverele: G5 (spline cubic), G50/G51, G73, G81, G82, G83, G98/G99. Cu tabel de scule: G10 L1/L10/L11, G43, G43.2, M6, M61. După driver: M62–M68, M70–M73, G65 [citit, mare];
  - G90.1 tot nesuportat [citit, mare];
  - **M6** depinde de `$341`: 0 = manual, 1 = atingere manuală, 2 = la G59.3, 3 = automat la G59.3, 4 = M6 ignorat. Fără ATC și fără un flux care se poate suspenda, M6 dă `error:20`. În modul 4 e ignorat tăcut [citit, mare];
  - implicit `N_TOOLS 0`, deci G43 H cere o compilare cu tabel de scule [citit, medie];
  - regula de arc: aceeași ca la GRBL [dedus, medie].
- **Contract propus:** ca GRBL 1.1, plus M6 permis doar când profilul mașinii declară `$341` între 0 și 3 și un sender care știe protocolul. Senderul nostru interceptează oricum M6 [dedus].
- **De probat:** pe controlerul axei A a owner-ului, T0, T1, T2 (G4) și T4.

### A.3 FluidNC

- **Sursa:** `bdring/FluidNC` (`GCode.cpp`, `Spindles/Spindle.cpp`, `Channel.h`). Wiki-ul a refuzat conexiunea [citit, mare pentru ce e în sursă].
- **Coduri:**
  - G: 0–4, 10, 17–19, 20/21, 28, 30, 38.x, 40, 43/43.1, 49, 53, 54–59, 61, 80, 90, 91, 92, 93, 94;
  - **fără 73/81–83/98/99**, iar orice alt cod G dă „unsupported” [citit, mare];
  - M: 0, 1 (acceptat, fără efect), 2, 30, 3–9, 56, 61, 62–68 [citit, mare].
- **Linia:** maximum 255 de caractere. Bufferul raportat senderului e 256 minus octeții din coadă [citit, mare].
- **Arce:** ca la GRBL. G90.1 e refuzat; toleranța e aceeași [citit, mare].
- **G4:** P în secunde [citit, mare].
- **M6 fără ATC și fără `m6_macro`:** schimbă doar numărul sculei curente, iar programul **continuă fără pauză** [citit, mare]. Postul nu scrie M6 decât dacă profilul declară ATC sau macro [dedus].
- **Axul:** `spinup_ms` și `spindown_ms` în configurare. Controlerul așteaptă singur dacă sunt setate [citit, medie].
- **Comentarii:** `( )`, `;`, `(MSG,…)`, `(PRINT,…)`, `(DEBUG,…)`. Expresiile și parametrii `#` sunt suportați [citit, mare].
- **De probat:** dacă axa A ajunge pe FluidNC, T0, T2 și T4.

### A.4 NcStudio (Weihong)

- **Sursa:**
  - Programming Manual, ed. 6 (R6, 2016.03), copia unui distribuitor;
  - User's Manual V8 (PCIMC-63A/53B/53C);
  - postul Autodesk „NcStudio Programming System”, doar citat [citit].
- **Coduri G:** G00–G04, G17–G19, G20/G21 **și** G70/G71, G28, G34–G37, G40–G44, G49, G50/G51, G50.1/G51.1, G53, G54–G59, G65, G68/G69, G73, G74, G76, G80–G89, G90/G91, G92, G98/G99, plus codurile proprii G9xx [citit, mare].
- **Coduri M:** M00, M01, M02, M03, M04, M05, M08, M09, M10, M11, M17, M30, M98, M99, M801, M802, M901, M902, M903. **Fără M06** [citit, mare].
- **Unități:** G21 sau G71 = mm, G20 sau G70 = inch. Implicit mm [citit, mare].
- **F:** în mm/min. **Un F pe o linie G00 setează viteza rapidă, modal** [citit, mare]. Postul nu scrie F pe G0 [dedus].
- **Comentarii:** doar apostroful `'`, până la capătul liniei [citit, mare].
  - În expresii, `;` încheie instrucțiunea, iar parantezele țin argumentele funcțiilor.
  - Deci `;` și `( )` **nu** sunt comentarii documentate [citit, mare]. Postul Autodesk scrie tot `'` [citit, mare].
- **Numere de linie:** N opțional [citit, mare].
- **Lungimea liniei:** nedocumentată. Plafonul de contract e 70 [dedus].
- **Arce:**
  - G02/G03 cu I/J/K sau R. I/J/K sunt relative la start doar dacă **N4063 „ArcIJKIncrementModeValid” = 1** (implicit 1). Cu 0, se raportează la originea piesei [citit, mare];
  - R > 0 înseamnă cel mult 180°, R < 0 peste 180°; cercul întreg nu se poate scrie cu R [citit, mare];
  - elice: da; G17/G18/G19 [citit, mare];
  - postul Autodesk folosește implicit R, cu cel mult 90° pe bloc și raza între 0,01 și 1 000 mm. Recomandă potrivirea I/J cu setarea controlerului [citit, mare].
- **Schimbarea sculei:**
  - fără M06. T selectează scula (la mașinile cu magazie) și cheamă corecțiile [citit, mare];
  - **N4068 „ToolReplacingPromptValid” = 0 implicit:** la o instrucțiune de schimbare, sistemul nu face pauză. Manualul nu spune care e acea instrucțiune [citit];
  - M00 = oprire obligatorie;
  - calibrarea fixă („After Switching Tool”) reface Z-ul după schimbare [citit, mare];
  - implicit propus: fișiere separate; opțional M00 + comentariu [dedus].
- **Offset de lungime:** G43/G44 cu H00–H07, adică doar 8 registre [citit, mare].
- **Ax și pauză:** M03 S…; **G04 P în milisecunde** [citit, mare]. N4034 și N4035 = 0 implicit, adică avansul și turația se iau din fișier [citit, mare].
- **Început și sfârșit:** G54 implicit; M30 = sfârșit și întoarcere la început [citit, mare].
- **Z de siguranță:** N4051 (implicit 10 mm, față de originea piesei) se folosește la întoarcere și la reluare [citit, mare].
- **Cicluri fixe:** există, cu R/Z după G90/G91 și P în ms, fără punct. În v1 se scriu desfăcut [citit + dedus].
- **Formate:** G-code ISO, PLT, DXF (LINE, LWPOLYLINE, ARC, CIRCLE, ELLIPSE, SPLINE), ENG [citit, mare]. Extensia G-code nu e numită în manual; postul Autodesk scrie `.nc` [citit].
- **De probat:**
  - stilul comentariului (`'`, `( )`, `;`);
  - N4063;
  - G04 în ms;
  - F pe G0;
  - M00 la schimbarea sculei.

### A.5 RichAuto DSP (A11 / A18 / B18)

- **Sursa:**
  - manualul A11 (RichAuto S&T, „Engraving machine motion control system A11”, §4.2.2), plus o ediție mai veche;
  - personalul Axiom (mașini cu RichAuto B11), pe forumul Grid.Space, în aprilie 2024;
  - DeskProto (sfaturi pentru RichAuto).

  Pentru A18 și B18 n-am găsit manual. Presupun același interpretor [dedus, mică].
- **Ce spune manualul A11** [citit, mare]:
  - „G-code standard și PLT”;
  - stick USB FAT16/32 sau memorie internă;
  - 9 sisteme de coordonate de lucru;
  - întârzierea axului la pornire și la oprire, în ms, setată în controler;
  - viteza de lucru implicită 3 000 mm/min; înălțimea de siguranță implicită 40 mm.
- **Setările „G Code Setup” care schimbă sensul fișierului:**
  - **F Read** (ignoră F / citește F);
  - **AbsCntr** (centru absolut, Off/On);
  - T Read;
  - Spindle (NTLLG / FORCE / INSTR);
  - S Read;
  - Read G54, Read G49, Read G40;
  - CodeHead (Skip / NoSkip) [citit, mare].

  Valorile implicite sunt marcate cu albastru în manual și nu se văd în text [citit: absent].
- **Ce nu spune manualul:** listă de coduri G/M; comentarii; M30; G21; M06. Am căutat în două ediții [citit, mare].
- **Personalul Axiom (B11)** [citit, medie]:
  - coduri: G0–G4, G40–G44, G49, G54–G59, G80–G84, G90, G91; M3, M4, M5, M6, M8, M9, M208, M210, M211, M350, M351;
  - „codul trebuie să fie metric”;
  - S nu se folosește pe mașinile lor;
  - exemplul lor are comentarii în paranteze.
- **DeskProto:** RichAuto suportă avansul în timp invers (G93), util la axa a 4-a [citit, medie].
- **Contract implicit propus (prudent, totul de probat)** [dedus, mică]:
  - metric, fără G20/G21 și fără G17, fiindcă nu apar în lista Axiom;
  - antet minim: G90 și G5x doar dacă e ales;
  - fără comentarii până la probă;
  - arce I/J incremental, presupunând AbsCntr = Off, cel mult 180° pe bloc;
  - M3/M5;
  - sfârșit cu M30, de verificat;
  - fișiere separate pe sculă.
- **Extensii:** paginile de vânzare listează `.nc`, `.tap`, `.u00`, `.txt`, `.plt`, `.g`, `.dxf`, `.mmg` [citit, mică]. Postul: `.nc`, cu nume scurte, ASCII [dedus].
- **Capcane:**
  - cu F Read = Ign, piesa se taie cu viteza controlerului, nu cu cea din fișier;
  - cu AbsCntr = On, I/J se citesc ca absolute;
  - comentariile pot opri citirea, fiindcă nu sunt documentate [citit + dedus].
- **De probat:** tot. E controlerul cu cea mai slabă documentație.

### A.6 Syntec (freză și router)

- **Sursa:** SYNTEC Mill Machine Program Manual v8.19 (2015/05/11), plus postul Autodesk „SYNTEC”, doar citat. Controlerele Syntec mai noi pot diferi [citit + dedus].
- **Unități:** **G70 = inch, G71 = mm.** G20/G21 nu apar în lista de coduri.
  - Manualul spune că, față de Fanuc 0M, singura diferență sunt G70/G71 în loc de G20/G21.
  - Postul Autodesk scrie tot G71/G70 [citit, mare, din două surse independente].
- **Punctul zecimal:** o valoare cu punct e în mm, inch sau secunde. **Un întreg e în unitatea minimă (µm, ms)** [citit, mare].
  - Deci `X10` = 0,010 mm, iar `X10.` = 10 mm. Postul scrie mereu punctul [dedus].
- **Comentarii:**
  - exemplele din manual au `//` la capătul liniei și `;` ca sfârșit de bloc;
  - postul Autodesk scrie `( … )`;
  - nu există o secțiune despre comentarii [citit, medie].
- **Arce:**
  - I/J/K = vectorul de la start la centru, deci incremental, mereu [citit, mare];
  - R > 0 până la 180°, R < 0 între 180° și 360°; cercul întreg doar cu IJK [citit, mare];
  - elice cu al treilea ax; G17/G18/G19 [citit, mare].
- **G04:**
  - X cu punct = secunde, între 0,001 și 9 999,999;
  - P fără punct = ms;
  - `G04 P2.5` dă 2 s [citit, mare]. Postul scrie `G04 P<ms întreg>` [dedus].
- **Schimbarea sculei:** M06 trebuie folosit cu T. Exemplele scriu `M06 T1;`, apoi `H1;`, apoi G37 pentru măsurarea automată a lungimii. Mai există G43/G44/G49 cu H [citit, mare]. Postul Autodesk: `T<n> M6` [citit, mare].
- **Coduri M:** M00, M01, M02, M03, M04, M05, M06, M08, M09, M19, M30 (sfârșit și întoarcere la început), M98, M99 [citit, mare].
- **Început și sfârșit:** postul Autodesk scrie `%`, `O` cu 4 cifre, codul, `M30` și `%` [citit, mare].
- **Rapid:** parametrul #411 decide dacă G00 merge în linie dreaptă sau fiecare ax cu viteza lui, adică un drum în „L” [citit, mare]. De aceea, Z-ul se retrage înaintea oricărui G0 în XY [dedus].
- **Cicluri fixe:** G73–G89, G98/G99. În v1 se scriu desfăcut [citit + dedus].
- **Netezire:** G05.1 (manual) și G120.1 (postul Autodesk). Nu intră în v1 [citit, medie].
- **Extensie:** `.nc` (Autodesk). În memoria controlerului, programele au de obicei nume `O####` [citit, medie].
- **De probat:**
  - punctul zecimal (în aer);
  - comentariile `( )` față de `//`;
  - M06 cu schimbătorul atelierului;
  - G43 H;
  - antetul `%`/`O`.

### A.7 Mach3

- **Sursa:** „Using Mach3Mill”, pentru Release 1.84, plus postul Autodesk „Mach3Mill”, doar citat [citit].
- **Linia:**
  - maximum 256 de caractere;
  - N între 0 și 99 999, cel mult 5 cifre;
  - până la 4 cuvinte M pe linie, dar nu două din același grup modal [citit, mare].
- **Comentarii:**
  - `( … )`, fără imbricare și închis pe aceeași linie;
  - `//` până la capătul liniei;
  - o linie care începe cu `%` e ignorată;
  - `(MSG, …)` afișează un mesaj [citit, mare].
- **Unități:** G20/G21 și G70/G71 [citit, mare].
- **Arce:**
  - **modul IJ (Inc/Abs) e o setare** din configurare și se poate forța cu G90.1/G91.1;
  - manualul spune singur că cercurile ratate sau prea mari înseamnă un mod IJ nepotrivit [citit, mare];
  - postul scrie G91.1 explicit, pe linia lui [dedus];
  - elice: da [citit, mare].
- **G4:** unitatea depinde de setarea „G04 Dwell param in Milliseconds” [citit, mare].
  - Cu bifa, `G4 5000` dă 5 s. Fără ea, dă 1 h 23 min 20 s.
  - Unitatea e o setare a profilului, verificată la probă [dedus].
- **M6:** dacă schimbările nu sunt ignorate, mașina urcă la Safe Z, se oprește, aprinde LED-ul „Tool Change” și așteaptă Cycle Start [citit, mare].
  - Cu „Auto Tool Changer” se cheamă macrourile M6Start/M6End fără Cycle Start.
  - Există G43/G44/G49 cu H [citit, mare].
- **Mișcarea:** G64 (viteză constantă, care rotunjește colțurile) sau G61 (oprire exactă) [citit, mare].
- **Demo:** limite pe mărimea lucrării [citit, mare]. „500 de linii” vine din surse secundare [citit, medie].
- **Postul Autodesk:**
  - scrie `G90 G94 G91.1 G40 G49 G17` pe o linie;
  - numerotarea N reîncepe peste 100 000;
  - extensia `.tap` [citit, mare].
- **De probat:**
  - unitatea G4;
  - modul IJ notat de pe controler;
  - comportamentul la M6;
  - un fișier sub 500 de linii.

### A.8 Mach4

- **Sursa:** „Mach4 Mill GCode Manual” v1.0 (2014), „Mill Programming Guide” v1.1 build 3775, plus postul Autodesk „Mach4Mill”, doar citat [citit].
- **G4:** cele două ediții se contrazic [citit, mare]:
  - v1.0 spune P în secunde;
  - v1.1 spune P sau X fără punct = ms, iar cu punct = secunde, și G4 trebuie să fie singurul cod G din bloc;
  - postul scrie `G4 P2.0` pe linia lui, care dă 2 s după ambele texte [dedus, medie].
- **Un singur cod M pe bloc** [citit, mare]. Regula e bună pentru toate contractele: fiecare M pe linia lui [dedus].
- **Arce:** G90.1/G91.1 sau setarea din configurare, independent de G90/G91 [citit, mare].
- **M06:**
  - T stă pe aceeași linie sau mai sus;
  - o setare decide dacă T de pe linia cu M06 e „scula de folosit” sau „următoarea sculă” [citit, mare];
  - cu `T<n>` pe linia dinainte și `M6` singur, rezultatul e același în ambele setări [dedus, din textul manualului].
- **Sfârșit:**
  - M30, urmat de `%`, ca ultima linie să aibă sfârșit de bloc;
  - M02 resetează G54, G17 și G90 [citit, mare].
- **Numere:** punctul nu e obligatoriu (X1 = X1.0), dar e „foarte recomandat” [citit, mare].
- **Comentarii:** nedocumentate în cele două manuale. Postul Autodesk scrie `( … )` [citit, medie].
- **Extensie:** `.tap` (Autodesk) [citit, medie].
- **De probat:** `G4 P2.0`, setarea T de la M6 și comentariile.

---

## Anexa B. Fișierele de probă pentru ateliere

**Reguli comune** [dedus]:
- Fiecare fișier are sub 300 de linii, ca să încapă și în Mach3 demo. Excepția e T6, care testează chiar limitele.
- Numele sunt scurte și ASCII (`T1ARCE.NC`), fiindcă DSP-urile citesc de pe stick FAT.
- Prima rulare se face **în aer** (Z +20 peste material), a doua pe MDF de rebut.
- Valorile așteptate sunt calculate pe hârtie și tipărite pe fișa probei.
- Atelierul notează versiunea controlerului și setările din contract (N4063, AbsCntr, F Read, modul IJ, unitatea G4, `$341`).
- Atelierul fotografiază orice eroare și completează cel mult 10 cote.

**Pachetul comun:**

| Fișier | Ce dovedește | Ce se măsoară (valoarea pe hârtie) |
|---|---|---|
| **T0 Citire** (în aer) | antetul și stilul de comentariu sunt acceptate | eroare da/nu și linia la care apare. Variante: T0a fără comentarii, T0b cu stilul din contract, T0c cu stilurile alternative, T0d cu antet maxim (G17, G21/G71, G94, G40, G49, G80, G91.1) |
| **T1 Arce** (MDF, 1 mm) | modul I/J, sensul CW/CCW, niciun cerc fals | cerc Ø50 din 2×180° și Ø50 din 4×90°: canalul are exterior 50 + D și interior 50 − D (±0,1). Distanța dintre centre: 100,00. Dreptunghi 100×60 cu colțuri R5. Un arc cu R 1 200 și coardă 80. Un arc mic (coardă 0,05), care trebuie să apară scris ca G1 |
| **T2 Unități, avans, pauză** (în aer) | F e citit, unitatea G4, punctul zecimal | linie de 200,000 mm la F1000, apoi la F2000: 12,0 s și 6,0 s (±0,5 s, cu accelerații). Pauza de 2 s după M3: cronometru, ±0,3 s. Pe Syntec, `X10` față de `X10.`: 0,01 mm față de 10 mm, pe riglă |
| **T3 Elice** (MDF) | elicea e suportată | gaura Ø20, 3 spire cu pasul 1 mm: adâncimea 3,0 ±0,1 și diametrul 20,0 ±0,1 |
| **T4 Schimbarea sculei** | strategia din contract | pătrate 20×20, adânci de 2 mm, tăiate cu D6 și cu D3: diferența de adâncime 0,0 ±0,1 după re-zero. Oprirea vine cu axul oprit și la Z sigur (da/nu). Reluarea continuă de unde trebuie |
| **T5 WCS și sfârșit** | WCS-ul scris e respectat; ce resetează sfârșitul | aceeași piesă mică în G54 și în G55: poziția pe riglă. După M30, starea controlerului (GRBL: `$G`; Mach: DRO) |
| **T6 Limite de fișier** | limitele de linie și de fișier | GRBL: linii de 79 și 80 de caractere utile (ok, apoi `error:11`). Mach3, doar dacă atelierul rulează versiunea demo: un fișier de 600 de linii. DSP și NcStudio: un fișier de 200 000 de linii (încarcă sau nu, plus timpul) |
| **T7 Găurire în pași** (MDF) | ciclul desfăcut în G0/G1 | 4 găuri de 10 mm în pași de 2 mm: adâncimea 10,0 ±0,1 |

**Setul minim pe controler** [dedus]:

| Controler | Cine | Fișiere | Ce se urmărește în mod special |
|---|---|---|---|
| GRBL 1.1 | owner, pe COSTEL | T0–T7 | bariera M6 în senderul nostru; fișiere separate; linia de 79 |
| grblHAL / FluidNC | owner (axa A) | T0, T1, T2, T4 | M6 după `$341` sau după ATC; FluidNC: M6 nu trebuie să treacă tăcut |
| NcStudio | atelier | T0a/b/c, T1, T2, T3, T4, T5 | ce comentariu e acceptat; N4063; G04 în ms; F pe G0 |
| RichAuto | atelier, probabil în 2 runde | T0a/b/c/d, T1, T2, T3, T4, T5 | ce antet și ce comentarii trec; AbsCntr; F Read; M30 |
| Syntec | atelier | T0, T1, T2 (cu punctul zecimal), T3, T4, T5 | punctul zecimal; G71; M06 + G43 H; `%`/`O` |
| Mach3 | atelier | T0, T1, T2, T3, T4, T5 | unitatea G4; modul IJ; M6 cu Cycle Start; fișiere sub 500 de linii |
| Mach4 | atelier | T0, T1, T2, T3, T4, T5 | `G4 P2.0`; T pe linia dinainte; comentariile |

**Cum se închide proba:** fișierul trimis (cu hash), cotele măsurate și versiunea controlerului intră în repo ca test automat. Contractul trece din „documentat” în „probat pe <dată>, <versiune>” [dedus].

---

## Anexa C. Surse (citite pe 07.10.2026)

**GRBL 1.1:**
- https://github.com/gnea/grbl/blob/master/grbl/gcode.c (cazurile M, T, regula de arc, G4, M2/M30, G90.1);
- https://github.com/gnea/grbl/blob/master/grbl/protocol.c (comentariile, `/`, depășirea liniei);
- https://github.com/gnea/grbl/blob/master/grbl/protocol.h (`LINE_BUFFER_SIZE 80`);
- https://github.com/gnea/grbl/blob/master/grbl/serial.h (`RX_BUFFER_SIZE 128`);
- https://github.com/gnea/grbl/blob/master/grbl/motion_control.c (`mc_dwell` în secunde, `ARC_ANGULAR_TRAVEL_EPSILON`);
- https://github.com/gnea/grbl/blob/master/grbl/config.h și `defaults.h` (`$12` = 0,002);
- https://github.com/gnea/grbl/blob/master/doc/csv/error_codes_en_US.csv;
- https://github.com/gnea/grbl/blob/master/README.md (lista de coduri);
- https://github.com/gnea/grbl/wiki/Grbl-v1.1-Commands, https://github.com/gnea/grbl/wiki/Grbl-v1.1-Interface și https://github.com/gnea/grbl/wiki/Grbl-v1.1-Jogging (jog doar în Idle/Jog).

**grblHAL:**
- https://github.com/grblHAL/core/blob/master/gcode.c (M6, M61, T, G90.1), `protocol.h` (257), `stream.h` (1 024), `config.h`;
- https://github.com/grblHAL/core/wiki/Additional-G--and-M-codes;
- https://github.com/grblHAL/core/wiki/Manual,-semi-automatic-and-automatic-tool-change.

**FluidNC:**
- https://github.com/bdring/FluidNC/blob/main/FluidNC/src/GCode.cpp;
- `FluidNC/src/Spindles/Spindle.cpp` (`tool_change`) și `FluidNC/src/Channel.h` (`maxLine = 255`);
- wiki-ul http://wiki.fluidnc.com/en/features/supported_gcodes a refuzat conexiunea.

**NcStudio:**
- Programming Manual, ed. 6: https://ncstudio.ru/wa-data/public/site/doc/10/NcStudio-programming-manual-6th-edition.pdf (§2.1, §3.2–3.5, §3.6.3, §3.11.3, §3.13, §4.3–4.4);
- User's Manual V8: https://wiki.tampere.hacklab.fi/_media/tyokaluja/nc_studio_menu.pdf (N4034, N4035, N4051, N4063, N4068; formatele suportate);
- postul Autodesk: https://cam.autodesk.com/hsmposts („NcStudio Programming System”, doar setări citate).

**RichAuto:**
- manualul A11: https://www.richautocontroller.com/wp-content/uploads/2023/08/DSP-A11-Manual.pdf (§4.2.2 Auto Pro Setup, G Code Setup);
- o ediție mai veche: https://cncu.co.za/EasyRoute-CNC-Router/Component%20Manuals/RichAuto/A11Manual.pdf;
- personalul Axiom: https://forum.grid.space/t/output-for-an-axiom-cnc-using-richauto-b11/1225;
- DeskProto: https://www.deskproto.com/support-tips-tricks/dp-tips-richauto.php;
- manualul Axiom (Rev. 18/JULY/2017): https://toolstoday.com/content/axiom-manual-pro.pdf.

**Syntec:**
- https://wiki.hsbne.org/_media/tools/woodshop/mill-programming-manual-en.pdf (v8.19: lista G, §1.2.3 arce, §1.2.5 G04, §1.2.31 G70/G71 și punctul zecimal, cap. 2 codurile M);
- postul Autodesk „SYNTEC” (setări citate).

**Mach3:** https://www.machsupport.com/wp-content/uploads/2013/02/Mach3Mill_1.84.pdf (§5 Config: I/J Mode, Tool change, G04 în ms; §6.2 M6; §10.5 formatul liniei, N, comentariile; §3.1 demo).

**Mach4:**
- https://www.machsupport.com/wp-content/uploads/2014/05/Mach4%20Mill%20GCode%20Manual.pdf (v1.0);
- https://www.machsupport.com/wp-content/uploads/2014/05/Mill%20GCode%20Programming.pdf (v1.1, build 3775).

**Capcane raportate de utilizatori:**
- https://forum.v1e.com/t/gcode-error-33-invalid-target/42015 (G91 lăsat de palpare, `error:33`, ian. 2024);
- https://community.carbide3d.com/t/warning-bad-gcode-after-vectric-vcarve-10-5-update/24235?page=2 (precizia arcelor, iulie 2020).
