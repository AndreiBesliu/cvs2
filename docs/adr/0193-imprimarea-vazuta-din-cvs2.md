# ADR 0193 — Imprimarea văzută din cvs2: pauza la un strat, placa cu stratul viu, anularea unei piese

**Starea:** acceptat pe 09.11.2026 (propus în aceeași zi), cu recomandările („Da, recomandările”: 1a, 2a, 3a, 4a), pentru
feliile 3.6p, 3.6q și 3.6r (fără imprimantă, pe imprimanta falsă; apoi proba pe imprimanta owner-ului, după ghid), în
worktree-ul `imprimanta` (ramura `wip/3.6g-imprimanta`). **Felia 3.6p** gata pe 09.11 (secțiunea „Felia 3.6p, gata”), fără
imprimantă; proba pe imprimanta owner-ului (ghidul, pasul 6) rămâne la el. Cererea owner-ului: grupul 2
din cele șapte grupuri de îmbunătățiri ale legăturii prin WiFi (08.11, „Ce ar face-o specială: imprimarea „văzută” din
cvs2”), după grupul 1 (ADR 0192, „poti incepe cu 1”), la „continua” (09.11). **Schimbă:** ADR 0192 §B.8 (al doilea text făcut
doar de driver în `gcodeCmd`, anularea unei piese, dacă owner-ul o vrea: întrebarea 2) și ADR 0191 §E.7 (fișierul primește
`PAUSE`, doar la straturile alese de om). **Documentul:** neschimbat (v20), cu răspunsul recomandat la întrebarea 4.

**Problema.** Cât imprimă, fereastra arată starea, procentul, timpii și „Stratul 3 / 61”, ca aplicația Creality. Dar cvs2 a
feliat sau a trimis el însuși fișierul, deci îi știe straturile și piesele, iar imprimanta spune poziția duzei, filamentul
folosit și piesele de pe pat. Lipsesc trei lucruri: o pauză la un strat ales (pentru o piuliță, un magnet sau altă culoare),
placa văzută de sus, cu stratul care se imprimă acum, și anularea unei singure piese (una dezlipită), fără să oprești placa.

## Ce am aflat (cercetarea din 09.11)

Semnele, ca la ADR 0190: [citit] în sursă sau în documentație, [raportat] de oameni care au imprimanta, [măsurat] pe imprimanta
owner-ului, [nemăsurat] de aflat. Măsurătorile vin din transcrierea din 07.11 (K1C 2025, V1.0.0.26; 15:42:37–15:43:13, un
fișier Creality Print de 61 de straturi, `pat_1_PLA_16m2s.gcode`).

- **Ritmul:** cât imprimă, K1C trimite la ~3 s o bucată de stare, cu ce s-a schimbat: `curPosition`, `printProgress`,
  `printJobTime`, `printLeftTime`, `usedMaterialLength`, `layer` [măsurat].
- **Poziția duzei** (`curPosition`, „X:102 Y:104 Z:00”): X și Y în mm întregi, pe pat, în conturul piesei cât imprimă
  [măsurat]. Z rămâne „00” pe straturile 3–10, deci nu spune înălțimea; cât se pregătește (homing-ul, nivelarea), valorile ies
  din pat („Y:338”, „X:-124”, „Z:383”) [măsurat].
- **Stratul** (`layer`) sare între două numărători, mereu la 5 una de alta: 3, 8, 3, 4, 10, 5 [măsurat]. Klipper-ul Creality
  (sursa publică a seriei K1, `virtual_sdcard.py`) numără straturile după primul fel de comentariu găsit în fișier, dintr-o
  listă (`;LAYER_CHANGE`, `;LAYER:`, `;AFTER_LAYER_CHANGE`, `; layer #`…), iar `print_stats` primește și numărătoarea
  feliatorului (`SET_PRINT_STATS_INFO`) [citit]; a doua numărătoare vine probabil din a doua sursă [nemăsurat: care, pe K1C
  2025]. Cea mică e cea adevărată: progresul (6 % la „3”, 10 % la „5”, din 61) se potrivește cu ea, nu cu 8 și 10 (13 % și
  16 %). Fișierele noastre au pe fiecare strat o singură linie din listă (`;LAYER_CHANGE`) și niciun `SET_PRINT_STATS_INFO`,
  deci o singură numărătoare, exactă [citit; de măsurat pe imprimantă].
- **Progresul** (`printProgress`) e un procent întreg, care crește neregulat față de timpul scurs [măsurat]; în Klipper-ul
  Creality e poziția în fișier [citit], dar firmware-ul K1C 2025 îl poate calcula altfel [nemăsurat]. Nu ajunge pentru un strat.
- **Filamentul folosit** (`usedMaterialLength`, mm) crește lin, fără salturi: 92, 96, 99 … 115 mm în 36 s [măsurat]. În
  Klipper (`print_stats.filament_used`) e mișcarea extruderului cerută de fișier, împărțită la debitul ales, deci nu se schimbă
  cu debitul [citit]. Pentru un fișier știut, filamentul de la începutul fiecărui strat se calculează exact; în plus vine doar
  linia de curățare din `START_PRINT` (câțiva mm [nemăsurat]).
- **Piesele** (cadrul `objects`) vin la pornire și la oprire [măsurat], cu listele ca text JSON în JSON: `objects` (numele,
  centrul, conturul), `excluded_objects`, `current_object`; numele cu majuscule („PAT_1.STL_ID_0_COPY_0”: Klipper le face
  majuscule) [măsurat, citit]. Ce trimite K1C când trece la altă piesă sau când una e anulată [nemăsurat]. Fișierele noastre
  definesc fiecare piesă cu `EXCLUDE_OBJECT_DEFINE`, cu numele din `[A-Za-z0-9_.-]`, ca OrcaSlicer [citit].
- **Anularea** (`EXCLUDE_OBJECT NAME=<nume>`, a lui Klipper): Klipper-ul Creality o are, dar **refuză piesa care se imprimă
  chiar atunci** („Forbidden EXCLUDE_OBJECT current_print_object”), spre deosebire de Klipper-ul obișnuit [citit:
  `exclude_object.py` al seriei K1]. Pe 9999 n-am găsit o comandă a ei (nici integrarea Home Assistant n-o are) [citit]; drumul
  rămas e `gcodeCmd`, ca la ventilatoare (ADR 0192 §B.8). N-a fost încercată pe K1C [nemăsurat].
- **Pauza:** `PAUSE` (macroul imprimantei; profilul OrcaSlicer al K1C îl scrie la „pauză”), pus în fișier, oprește K1 și K1
  Max fără root; pauza vine la începutul stratului; cea pusă de Creality Print a fost uneori sărită sau mutată pe alt strat
  [raportat: forumul Creality]. Unde parchează capul și cât rămâne duza caldă în pauză [nemăsurat]. Reluarea e comanda din
  3.6g (`pause: 0`) sau ecranul imprimantei.

## Decizia

### A. Pauza la un strat (felia 3.6p)

1. **În „Din desen…”,** lângă glisorul straturilor: **Pauză înaintea acestui strat** (apăsat sau nu), semnele pauzelor pe
   glisor și lista lor: stratul, înălțimea, o notă scurtă (cel mult 40 de caractere, de exemplu „filament negru”) și ×.
   Rezumatul de lângă Salvează și Trimite spune pauzele („2 pauze: înaintea straturilor 9 și 15”), iar dialogul de pornire
   le spune lângă bifa „Patul e gol”. Nu înaintea primului strat. Pe piesele plate, pauza servește mai ales la a doua
   culoare de la o înălțime în sus (un text sau un desen adâncit, în altă culoare) și la ceva pus într-un locaș deschis; un
   magnet închis înăuntru cere „piesa ascunsă înăuntru” (grupul 7: punțile peste goluri), care va folosi aceeași pauză.
2. **Fișierul:** la începutul stratului, înaintea oricărei piese (în afara `EXCLUDE_OBJECT_START` / `END`): `;PAUSE_PRINT`
   (semnul OrcaSlicer), nota ca un comentariu și comanda de pauză a profilului (`PAUSE` la K1C). Timpul estimat rămâne fără
   pauze și o spune („plus pauzele”).
3. **O pauză ține o înălțime, nu un număr de strat:** cea până la care s-a imprimat (marginea de sus a cavității). La altă
   grosime a straturilor, pauza vine înaintea primului strat care începe de la ea în sus; dacă piesele sunt mai joase, cade.
4. **Unde se țin pauzele** unui desen: întrebarea 4.
5. Pe placa din fereastră (felia 3.6q), pauzele fișierului apar pe bara straturilor, iar cât imprimanta stă într-una, nota ei:
   „Pauza din fișier, înaintea stratului 11 (2,0 mm): filament negru”, cu Reia lângă.

### B. Placa și stratul viu (felia 3.6q)

6. **Placa,** în cardul Lucrarea, cât imprimă sau stă în pauză: patul văzut de sus, mărit pe piese ca în „Din desen…”
   (grila la 10 mm, fața imprimantei jos), piesele (conturul din cadrul `objects`, altfel din fișier), piesa care se imprimă acum (evidențiată), cele anulate (tăiate),
   **duza** (un punct, din `curPosition`, doar cât imprimă și doar în pat) și **stratul de acum**. Lângă ea, bara straturilor
   (cele făcute, stratul de acum, pauzele; pe telefon, orizontală, sub placă), „Stratul 12 / 15 · 2,4 mm” și lista pieselor.
   Schița: <https://claude.ai/artifact/5h1Y3RFM7wZvhZXzhMLNBw>.
7. **Fișierele trimise din cvs2** („Din desen…” și „Trimite un fișier…”) se țin în browser (o bază IndexedDB a lor; ultimele
   5, cel mult 100 MB), cu numele și mărimea de pe imprimantă. Când imprimanta pornește unul dintre ele, fereastra îi citește
   straturile (pe bucăți, ca verificarea de la 3.6h) și desenează căile stratului de acum, peste stratul de dedesubt,
   estompat. Pentru alt fișier: piesele, duza și numărul stratului, fără căi.
8. **Stratul:** pentru un fișier știut, din filamentul folosit pe filamentul fișierului; numărul spus de imprimantă e luat când
   e la cel mult un strat de acesta (atunci e exact). Pentru alt fișier: dintre cele două numărători, cea mai apropiată de
   progres. Fără valori ghicite: un strat necunoscut rămâne „—”.
9. **Starea comună** (ADR 0192 §A.2) primește piesele (numele, centrul, conturul), pe cele anulate, piesa de acum, poziția
   duzei (x, y; null în afara patului) și filamentul folosit. Driverul K1 le citește; Moonraker le are la fel (`exclude_object`,
   `print_stats`), deci intră la driverul lui fără alt contract.
10. **Mai târziu** (nu în 3.6q): partea făcută din stratul de acum (din filament și din poziția duzei); un fișier pornit din
    altă parte, adus de pe imprimantă (dacă portul 80 îl dă [nemăsurat]); vederea 3D.

### C. Anularea unei piese (felia 3.6r)

11. **Din placă sau din lista de sub ea** (și pentru tastatură): clic pe o piesă → **Anulezi piesa?** („Restul pieselor merg
    mai departe. Piesa anulată nu se mai reia.”) → **Anulează piesa**. Doar cât imprimă sau stă în pauză; niciodată ultima
    piesă rămasă (pentru ea, **Oprește**).
12. **Comanda** (întrebarea 2): driverul scrie `EXCLUDE_OBJECT NAME=<nume>` în `gcodeCmd`, cu un nume doar din lista
    imprimantei, încă neanulat, doar din litere, cifre, `_`, `.`, `-` (altfel butonul spune de ce nu se poate). Nimic scris de
    om nu ajunge în comandă.
13. **Piesa care se imprimă chiar atunci** (K1 o refuză): întrebarea 3.
14. **Fără valori ghicite:** piesa rămâne „→ se anulează” până apare la imprimantă printre cele anulate; după 6 s fără ea,
    „imprimanta n-a confirmat” (ca la 3.6o). O piesă anulată nu se mai readuce din cvs2.

### D. Siguranța (completează ADR 0192 §D)

15. Anularea pleacă dintr-un clic, cu confirmare (ca homing-ul). Pauzele stau în fișier: alese la feliere, la vedere în dialog,
    la trimitere și pe placă; aplicația nu trimite singură nicio pauză.
16. În `gcodeCmd` ajung doar texte făcute de driver (`M106` de la 3.6o și, cu întrebarea 2, `EXCLUDE_OBJECT`); consola rămâne
    „nu” (ADR 0190 §C.8).

### E. Bugetul

17. Pornirea neschimbată (fereastra și dialogul vin la cerere). Ținta: cel mult +7 kB pentru toate trei (3.6p ~1, 3.6q ~4,5,
    3.6r ~1,5), măsurat la fiecare felie; totalul de azi, 573,1 / 600.

## Feliile (ordinea propusă)

- **3.6p, pauza la un strat** (§A): dialogul, fișierul și unde se țin pauzele; probele pe hârtie (locul pauzei în fișier,
  înălțimea la altă grosime a straturilor) și e2e (pauza aleasă, rezumatul, fișierul salvat).
- **3.6q, placa și stratul viu** (§B): fișierele ținute, citirea straturilor, starea nouă din driver, placa; imprimanta falsă
  învață să „imprime” fișierul primit (straturile, filamentul, poziția, piesele, cele două numărători ale lui K1C, oprirea la
  `PAUSE`).
- **3.6r, anularea unei piese** (§C): comanda, confirmarea, așteptarea; imprimanta falsă învață `EXCLUDE_OBJECT` și refuzul
  piesei de acum.

Fiecare, după răspunsuri și după schiță, cu probele, otrăvurile și ghidul ei, apoi oprire și raport.

## Proba

- **Pe hârtie:** pauza în fișier (locul ei, în afara pieselor, la altă grosime a straturilor; nu pe primul strat); harta unui
  fișier (straturile, filamentul la începutul fiecăruia, căile, piesele, pauzele); stratul din filament și din cele două
  numărători; cadrul `objects` (texte JSON în JSON, liste stricate); poziția (în pat, în afara lui, cât se pregătește);
  anularea pe K1, octet cu octet, și refuzurile (nume necunoscut, deja anulat, ultima piesă, caractere nepermise, imprimanta
  liberă).
- **Cap-coadă,** pe imprimanta falsă: o pauză aleasă și fișierul ei; o imprimare a unui fișier trimis din cvs2, cu placa,
  stratul și duza; pauza din fișier, cu nota și Reia; anularea unei piese, cu așteptarea piesei de acum.
- **Otrăvurile:** `test/otravuri/3.6p.py`, `3.6q.py`, `3.6r.py`.
- **Pe imprimanta owner-ului** (ghidul, pași noi): placa de probă cu o pauză înaintea stratului 9 (la 1,6 mm), pusă din „Din
  desen…”: se oprește acolo? unde stă capul? duza rămâne caldă? Reia din cvs2; transcrierea, cu `layer` și
  `usedMaterialLength` pe un fișier al nostru; o placă cu două piese și anularea uneia (după răspunsul 2), cu transcrierea.

## Felia 3.6p, gata (09.11.2026)

- **Felierul** (`src/cam/feliere/gcode.ts`): `punePauze` (fiecare pauză, înaintea primului strat k ≥ 2 care începe de la
  înălțimea ei, cu o toleranță de 1e-6 mm; peste vârful penultimului strat, cade), `cuPauze` (pauza pusă peste textul
  feliat, după `;AFTER_LAYER_CHANGE`, Z-ul stratului și temperaturile celui de-al doilea, înaintea primei piese:
  `;PAUSE_PRINT`, `; pause note: …`, `PAUSE`; două pe același strat dau una, cu notele alăturate), `notaPauza`,
  `notaInFisier`; comanda, din profil (`K1C.pauza`). O notă schimbată nu cere o feliere nouă: doar textul se reface.
- **Dialogul** (`src/app/DialogDinDesen.tsx`), după schiță: **Pauză înaintea acestui strat** sub glisor (apăsat pe stratul
  unei pauze, oprit pe primul strat, cu „Imprimanta se oprește după stratul N, la H mm”), semnele roșii pe glisor, lista
  **Pauzele** (stratul și înălțimea, un clic arată stratul; **Nota pauzei**; **Scoate pauza**), rezumatul („1 pauză, plus
  cât stă în ea”). Pauzele, ținute în browser pentru aceleași piese (`src/app/pauzeDesen.ts`: cheia
  `cvs2.imprimanta.felie.pauze`, `v: 1`; cheia unui desen e lista instanțelor alese, ordonată; ultimele 20 de desene).
- **Verificarea fișierului** (`src/machine/imprimanta/gcode3d.ts`): pauzele oricărui `.gcode` (`PAUSE`, `M600`, `M601`,
  `M0`, `M1`, `M25`, `M226`), cu stratul (`;LAYER_CHANGE`, sau `;LAYER:` al lui Cura), înălțimea (`;Z:`) și nota; spuse în
  trimitere și la pornire, lângă bifa „Patul e gol”.
- **Găsit pe drum:** (1) nota intră în fișier doar ca ASCII (diacriticele scoase), ca restul fișierului: Klipper-ul Creality
  oprește imprimarea la un fișier pe care nu-l poate citi ca text (`key571`); (2) calitatea 0,12 are și primul strat de
  0,12, deci pauza de la 2 mm vine acolo înaintea stratului 18, la 2,04 mm: pauza ține înălțimea, nu numărul stratului;
  (3) rândul cu Z-ul și rolul stratului rămâne lângă glisor, iar pauza vine sub el, ca în schiță.
- **Măsurat și probat:** totalul 574,9 / 600 kB (+1,8), pornirea 102,0 (neschimbată); probele noi:
  `test/unit/imprimanta.pauza.test.ts` (locul pauzei, înălțimea la altă grosime, nota, verificarea fișierului, pauzele ținute)
  și două e2e (dialogul; trimiterea și pornirea). Porțile: unit 8 760 (8 752 trecute, 0 căderi, 8
  sărite), build-ul determinist, e2e 384 / 384. Privit în browser: lat, în română, luminos; pe telefon (375 px),
  întunecat, fără nimic ieșit din ecran; semnele nu acoperă glisorul, iar butoanele au 44 px pe telefon. Otrăvurile:
  `test/otravuri/3.6p.py`, 37 / 37 din prima (27 pe probele unitare, 10 prin e2e, fiecare de proba ei).

## Întrebările (owner)

**Răspunsurile, din 09.11:** „Da, recomandările”: 1a (planșele așa), 2a (anularea prin `gcodeCmd`, cu textul făcut doar
de aplicație), 3a (cererea pentru piesa de acum așteaptă, retrimisă cel mult 2 minute), 4a (pauzele, în browser, pentru
aceleași piese).

1. **Schița** (linkul din mesaj): a) așa (recomandat); b) altfel (spune unde).
2. **Anularea pe K1,** prin `gcodeCmd`, cu textul făcut doar de aplicație (`EXCLUDE_OBJECT NAME=` și un nume din lista
   imprimantei): a) da (recomandat: e singurul drum, ca la ventilatoare; se probează întâi pe imprimanta ta); b) nu (piesele
   doar se văd pe placă; anularea rămâne pe ecranul imprimantei).
3. **Piesa care se imprimă chiar atunci,** pe care K1 o refuză: a) cererea rămâne la vedere, cu **Renunță**, iar aplicația o
   retrimite până o primește imprimanta, cel mult 2 minute (recomandat: starea vine la 3 s, deci momentul trecerii la altă
   piesă nu se poate prinde cu mâna); b) butonul e oprit cât piesa se imprimă, iar tu apeși din nou mai târziu.
4. **Pauzele unui desen se țin:** a) în browser, pentru aceleași piese (recomandat: ca setările felierii; revin când redeschizi
   dialogul pe ele, deci nu le uiți la a doua imprimare); b) în proiect (umblă cu proiectul pe alt calculator; un câmp nou în
   document, de unit cu sesiunea principală); c) doar cât e deschis dialogul.

## Ce am respins

- **O pauză trimisă de aplicație în timpul imprimării,** fără să fie în fișier: starea vine la 3 s, iar stratul unei piese
  mici ține 5–20 s, deci pauza ar cădea pe alt strat; și ar fi o comandă fără clic. Pe K1 fără root nu există un macrou de
  pauză la strat (`SET_PAUSE_AT_LAYER` e al lui Mainsail).
- **Numărul stratului luat așa cum vine:** sare între două numărători (3, 8, 3, 4, 10, 5).
- **Stratul din înălțimea duzei:** K1C trimite Z ca „00” cât imprimă.
- **Readucerea unei piese anulate:** straturile ei ar continua în aer.
- **Placa în 3D, acum:** o bibliotecă în plus, peste buget; vederea de sus arată ce trebuie (piesele, stratul, duza).

## Se redeschide dacă

- K1C nu se oprește la `PAUSE` din fișier sau refuză `EXCLUDE_OBJECT` prin `gcodeCmd` (proba pe imprimanta owner-ului);
- un fișier al nostru arată tot două numărători, sau filamentul spus de imprimantă nu urmează fișierul;
- K1C nu trimite piesa de acum sau pe cele anulate cât imprimă (atunci întrebarea 3 se schimbă);
- owner-ul vrea pauza trimisă de aplicație sau placa în 3D.

## Sursele

- Klipper-ul Creality al seriei K1 (`klippy/extras/virtual_sdcard.py`: straturile după comentarii; `print_stats.py`:
  `SET_PRINT_STATS_INFO`; `exclude_object.py`: refuzul piesei de acum), descărcat pe 09.11:
  <https://github.com/CrealityOfficial/K1_Series_Klipper>
- Klipper, anularea pieselor și starea: <https://www.klipper3d.org/Exclude_Object.html>,
  <https://www.klipper3d.org/Status_Reference.html>
- OrcaSlicer, numele pieselor (`sanitize_instance_name`) și semnele straturilor, `src/libslic3r/GCode.cpp`:
  <https://github.com/SoftFever/OrcaSlicer>
- Integrarea Home Assistant `ha_creality_ws` (stratul, poziția, filamentul; fără anulare): <https://github.com/3dg1luk43/ha_creality_ws>
- Pauza pe K1, forumul Creality: <https://forum.creality.com/t/how-to-pause-when-printing-k1/928>,
  <https://forum.creality.com/t/bug-pause-gcode-does-not-work/22627>
