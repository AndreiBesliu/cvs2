# ADR 0109: Calculul CAM în bazinul de workere (felia 4.A↑) și plafonul total 450 kB

**Starea:** acceptat pe 30.10.2026, la felia 4.A↑. Felia închide partea CAM a rândului de prag „Calcul pe mai multe fire”
(etapa 4) și e adusă înainte ca felie fără mașină, ca 7.1↑–7.3↑. Pornirea: „vreau o subsesiune care sa lucreze la inca
ceva la care poate sa lucreze fara sa afecteze celelalte sesiuni”. Sesiunea părinte a ales calculul CAM în workere, primul
pas al deciziei din 28.10 (rolurile de tăiere în panou, cu traseul la zi).

Pe plafon, owner-ul a ales „1” pe 29.10, la 22:10: plafonul total crește la 450 kB, cu ADR nou, iar felia merge cum e
scrisă.

**Continuă:** ADR 0010 și 0047 (bazinul simulării), ADR 0014 (fără izolare: datele se transferă), ADR 0015 (workerele fără
stare; bazinul în etapa 4), ADR 0038 §2 (recalculul automat al traseului „abia cu bazinul”), ADR 0046 §6 (estimarea pe firul
principal „până la bazinul de workere”) și ADR 0084.

**Schimbă:**
- ADR 0096: plafonul total crește de la 400 la 450 kB;
- regula de import `bazinul-doar-simularea` (ADR 0047) devine `bazinul-fara-interfata`.

**Problema.**
- **Pânza îngheța pe un document mare.** CAM-ul (operațiile → trasee → IR), postul (IR → G-code), SHA-256 și estimarea
  timpului rulau pe firul principal. Pe un document de 2 304 de forme (78 336 de mișcări, 70 284 de linii), măsurat în Edge:
  - „Arată traseul” oprea pânza ~0,33 s pentru CAM, apoi ~0,63–0,68 s pentru timpul din cip;
  - exportul o oprea ~1,2 s înainte de descărcare.
- **Rolurile cer recalculul automat.** Felia lor (decizia din 28.10) recalculează traseul la fiecare schimbare. Pe firul
  principal, fiecare tragere ar îngheța pânza; de aceea ADR 0038 §2 a legat recalculul de bazin.

## Decizia

1. **Un worker pe calcul** (`src/jobs/lucratorCam.ts`; bazinul, `src/jobs/bazinCam.ts`).
   - **Oprit la capăt:** la răspuns, la eroare, la anulare (semnalul) sau la termen (180 s).
   - **Fără stare (ADR 0015):** cererea poartă tot documentul, iar workerul nu ține nimic între calcule.
   - **Un singur fir pe calcul:** tăieturile unui document depind una de alta (ordinea, regiunea păstrată, insulele, frezele
     de rest), deci CAM-ul nu se împarte pe benzi. Bazinul simulării rămâne cel cu N fire.
   - **Pornirea workerului nu costă:** măsurat în Edge pe documentul mare, un worker nou și unul refolosit dau aceiași timpi
     (traseul 387–465 ms rece, 408–458 cald; timpul 622–705 rece, 647–813 cald). Un worker ținut viu n-ar câștiga nimic, iar
     o anulare tot l-ar opri.
2. **Ce calculează workerul.** Codul e cel de dinainte, mutat neschimbat din `src/ui/actiuniExportCalcul.ts` în
   `src/jobs/calculCam.ts` și `src/jobs/rezumat.ts`.
   - **`export`:** CAM → ieșirea din foaie (cu confirmarea) → postul ales → SHA-256 → rezumatul (estimarea) → mutările
     simulării (`pregatesteProgram`). Firul principal primește octeții, rezumatul și mutările. Simularea rămâne pe firul
     principal, în bazinul ei, după descărcare (ADR 0047 §5).
   - **`traseu`:** CAM-ul; programul IR vine împachetat (punctul 3), iar firul principal îl despachetează pentru stratul
     traseului și pentru animație.
   - **`timp`:** timpul de lângă traseu (ADR 0046 §8), pentru un program deja calculat (după traseu, alt `$$`, altă foaie),
     fără CAM. Traseul nu-l așteaptă: se desenează întâi.
   - **`simulare`:** CAM-ul și mutările pentru vederea 3D (ADR 0057).
3. **Ce se transferă (ADR 0014).**
   - **Documentul pleacă copiat:** e text și numere, ~11–19 ms pe documentul mare.
   - **Octeții fișierelor și mutările simulării se transferă.**
   - **Programul IR se transferă împachetat** (`src/jobs/impachetare.ts`): felul mișcării, o mască (axele țintei, sensul
     arcului, câmpurile etichetei) și numerele, în tablouri tipizate. Textele etichetelor și sculele schimbărilor rămân
     obiecte. Despachetarea dă exact programul: aceleași câmpuri, în aceeași ordine, numerele bit cu bit (și −0); o axă care
     lipsea rămâne lipsă. Măsurat în Node pe programul mare:
     - împachetarea 13–17 ms, transferul ~0,5 ms, despachetarea 9–14 ms;
     - copia programului ca obiecte ar fi costat 70–99 ms pe firul principal.
4. **Anularea oprește workerul (`terminate`)** din mijlocul calculului. Ce o pornește:
   - **la traseu:** un document schimbat pe altă revizie, sau un „Arată traseul” nou. Traseul de dinainte rămâne, stins
     (ADR 0038 §2); fără unul, nu se mai arată nimic;
   - **la export:** un export nou, un parametru schimbat, un document venit din bază sau fereastra închisă;
   - **la vederea 3D:** o simulare nouă sau vederea închisă;
   - **la timpul din cip:** o schimbare a programului, a foii sau a `$$`.
5. **Erorile.**
   - Un refuz al CAM-ului (`ok: false`) rămâne motivul de până acum.
   - O excepție a calculului ajunge tot ca motiv, ca înainte.
   - Un worker căzut, unul tăcut peste termen sau un mesaj necitibil (`LucratorCazut`) sunt defecțiuni: ajung și în jurnal.
     Exportul le recunoaște după nume, ca acțiunea lui să nu aducă bazinul în pornire.
6. **În Node (testele), fără `Worker`,** același calcul rulează în proces, prin aceeași graniță: cererea și răspunsul trec
   prin `structuredClone`, cu transferul lor. Astfel toate testele care cheamă exportul trec și prin protocol.
   - În codul construit, ramura asta nu există: `__CNCVS2_CONSTRUIT__` (`define` în `vite.config.ts`) o elimină, cu importul
     ei.
   - Poarta din `scripts/build-determinist.ts` cere CAM-ul doar în workerul lui, după marcajele din `src/cam/job.ts` și
     `src/jobs/calculCam.ts`. Altfel, calculul ar ieși și într-o bucată a firului principal.
7. **Pachetul și plafonul 450 kB.**
   - **De ce dublura:** Vite construiește workerul separat, fără bucăți comune cu aplicația. Workerul nici nu poate refolosi
     bucățile aplicației: harta importurilor (ADR 0098) nu se aplică în workere, iar geometria comună stă în bucata de pornire,
     care ar porni aplicația. Workerul are deci copia lui de cavalier și de geometrie, pe care firul principal le ține pentru
     desen și import.
   - **Măsurat:**
     - workerul are 72,7 kB;
     - bucata `job` (29,1 kB) a ieșit din firul principal;
     - calculul exportului a scăzut de la 16,6 la 8,4 kB;
     - totalul a crescut de la 374,4 la 411,8 kB, peste plafonul de atunci (400 kB);
     - pornirea a rămas 97,4 → 97,3 / 110 kB.
   - **Decizia owner-ului:** plafonul total crește la 450 kB.
8. **Regula de import** `bazinul-doar-simularea` devine `bazinul-fara-interfata`. `src/jobs` importă simularea, CAM-ul,
   postul, IR-ul și modelul, dar nu interfața, pânza, adminul, mașina, ușile sau norul. Capcana rămâne aceeași
   (`test/capcane/jobs/importa-ui.ts`).

## Dovada

- **Același G-code, octet cu octet.** Corpusul (`test/unit/ajutor-corpus-cam.ts`) are 14 documente, trecute prin ușă.
  - **Ce acoperă:** plăcile 1 și 2, buzunarul cu insulă și treaptă, coborârea (zigzag, elice, rampă), paralelul cu frezele de
    rest, V-carve-ul cu fundul plat și restul lui, găurirea, gravarea pe linie cu vârf plat, profilul cu urechi, rampă,
    intrări și degajări, căile deschise, trei freze, ieșirea din foaie, o tăietură sub foaie (refuzată fără supracursă) și
    un refuz.
  - **Parametrii:** 25 de seturi, cu toate cele trei posturi, inch, toate strategiile schimbării sculei, un `$$`,
    confirmarea și supracursa.
  - **În Node** (`test/unit/cam.bazin.test.ts`), exportul prin bazin e egal cu calculul direct: octeții, SHA-256, liniile,
    secțiunile, rezumatul, avertismentele și amprenta simulării, pe 26 de fișiere.
  - **Plăcile:** prin bazin, placa 1 A (liniile) și placa 2 (octet cu octet) sunt fișierele lor de aur.
  - **Traseul** despachetat e programul CAM-ului, iar timpul lui e cel calculat direct, cu și fără `$$`. Mutările vederii 3D
    sunt bit cu bit cele ale pregătirii directe.
- **Workerul adevărat, cu un `Worker` fals în Node.** Testul rulează chiar `lucratorCam.ts`, iar mesajele trec prin
  `structuredClone` cu transferul.
  - Exportul și traseul ies ca la calculul direct.
  - Răspunsul vine transferat, iar programul cererii `timp` pleacă transferat.
  - Workerul se oprește la răspuns, la anulare, la eroare, la un mesaj necitibil și la termen.
  - O cerere deja anulată nu pornește niciun worker.
- **În Edge** (`test/e2e/cam-bazin.spec.ts`).
  - **Workerul construit, pe același motor:** pe tot corpusul (54 de cereri), workerul din `dist/` întoarce bit cu bit ce dă
    același script rulat pe firul principal al paginii.
  - **Față de Node:**
    - octeții și SHA-256 fiecărui fișier, rezumatul, avertismentele și felurile mișcărilor sunt aceleași;
    - dublele programului și ale mutărilor stau sub 1e-6 mm.
  - **Pe calea omului:** placa 2, deschisă ca proiect și exportată din fereastră, e fișierul de aur.
  - **Pe un document greu pentru CAM:** 3 136 de forme într-o singură piesă, ca interfața să randeze un singur rând. Cât
    calculează workerul traseul (~0,5 s), pânza primește 29–30 de cadre, cu golul cel mai lung de 17 ms.
    - La prima încărcare a bucății calculului, golul e de 100–183 ms: copia documentului și randarea stării „se calculează”.
    - Poarta cere golul sub 60 % din fereastră, ca pe o mașină mai lentă (CI) să judece la fel.
  - **Anularea:** un document schimbat oprește workerul traseului înainte să răspundă (măsurat: imediat după ștergere), iar
    rezultatul vechi nu apare.
- **Timpii, în Edge 156, pe documentul mare.** Aceleași ceasuri în ambele build-uri (cipurile, workerele și golurile dintre
  cadre). Pe `main` (`e5538a0`) și pe ramură:

  | | înainte (firul principal) | după (worker) |
  |---|---|---|
  | T: traseul desenat | 0,68–0,78 s | 0,93–1,01 s |
  | T: timpul în cip | 1,75–1,84 s | 2,11–2,36 s |
  | T: cel mai lung gol al pânzei | 633–683 ms (estimarea), plus ~333 ms (CAM-ul) | ≤ 233 ms |
  | exportul (al doilea): calculul | ~1,2 s, pânza oprită | 1,07 s, niciun gol peste 100 ms |
  | exportul: descărcarea | 1,22 s | 1,32 s |

  - **Rezultatele vin puțin mai târziu, dar pânza nu mai stă.** Cauzele: workerul concurează cu randarea aplicației (2 304 de
    piese), iar timpul face un drum în plus (programul trimis înapoi workerului).
  - **Golurile rămase există și pe `main`, deci nu țin de CAM:**
    - ~180 ms la apăsarea lui T (randarea aplicației);
    - ~0,7–0,9 s după descărcare (tabelul rezumatului cu 4 608 operații, unirea benzilor simulării);
    - ~2,6–2,9 s la primul export (scrierea celor 4 608 operații în document).
- **În Node,** pe același document: CAM-ul 0,40–0,50 s, postul 85–108 ms, postul cu estimarea 0,60–0,66 s, exportul întreg
  1,53 s.
- **Otrăvurile** (`test/otravuri/4.A.py`): 27 / 27 prinse, pe codec, pe bazin, pe calculul mutat, pe worker și pe legăturile
  din interfață (două în e2e).
  - În prima rundă au scăpat trei: secundele trecute prin float32, apoi supracursa pusă la traseu și la vederea 3D.
  - Probele noi au fost o pauză de 2,001 s și o tăietură sub foaie.
  - Mutarea a lăsat fără țintă patru otrăvuri vechi (R03 și R04 în `timp.py`, E03 și D05 în `simulare.py`), îndreptate acum
    spre codul mutat.

## Ce am găsit pe drum

**Edge și Node nu calculează la fel dublele CAM-ului.** Edge 156 are alt V8 decât Node 26.11 (V8 14.6), cu alte funcții
matematice. Pe 200 000 de intrări fiecare, `sin`, `cos`, `tan`, `atan`, `atan2`, `asin`, `acos`, `exp`, `log`, `log2` și
`cbrt` diferă pe ultimul bit; `hypot`, `pow` și `sqrt` nu.
- **Pe corpus:** 44 din 54 de cereri ies bit cu bit. Pe curbe (biarcele logoului plăcii 2, arcele offsetului, elicea),
  centrul unui arc aproape drept duce diferența până la 4,65e-7 mm.
- **G-code-ul rămâne același** (se rotunjește la 0,001 mm), pe tot corpusul.
- **Nu e de la worker:** CAM-ul de pe firul principal din Edge folosea același motor.
- **Riscul rămas:** o coordonată exact pe pragul rotunjirii ar putea ieși cu 0,001 mm altfel într-un export din Edge decât în
  fișierele de aur făcute în Node. N-am văzut niciuna.
- **Simularea nu e atinsă:** nucleul ei are trigonometria proprie, tocmai pentru asta (ADR 0010).

## Ce am respins

- **Workerul care refolosește bucățile aplicației (fără dublură):** harta importurilor nu se aplică în workere, iar geometria
  comună e în bucata de pornire.
- **Cavalier doar în worker,** cu offsetul din desen, booleanul și normalizarea importului trecute și ele prin bazin. Totalul
  ar fi rămas ~380 kB, dar cu o felie mai mare și cu previzualizările din desen asincrone. A fost varianta 2 a owner-ului,
  nealeasă.
- **Fără plafon nou:** chiar cu postul și estimarea scoase din firul principal, totalul ar fi fost 401,9 / 400 kB.
- **Programul IR copiat ca obiecte:** 70–99 ms pe firul principal, față de 9–14 ms pentru despachetare.
- **Un worker ținut viu între calcule:** nu câștigă nimic măsurabil (punctul 1).

## Limitele

- **Timpii pe mișcare ai animației** (ADR 0099) rămân pe firul principal, la deschiderea panoului: ~0,6 s pe documentul
  mare. Postul și estimarea stau, pentru ei, și în bucata animației.
- **Documentul se copiază la fiecare cerere:** 11–19 ms în Node pe documentul mare.
- **Golurile rămase de după export** (tabelul rezumatului cu 4 608 rânduri, unirea benzilor simulării) și **primul export**
  (scrierea operațiilor) sunt pe firul principal, ca înainte.

## Ce le mai trebuie rolurilor în panou (felia următoare)

- **Recalculul automat al traseului** la fiecare schimbare a documentului, cu o întârziere scurtă. Anularea calculului vechi
  e deja aici.
- **Traseul și timpul în același job:** workerul ar trimite programul, apoi timpul, ca timpul să nu mai facă drumul înapoi
  (+0,3–0,5 s acum).
- **Operațiile editate din panoul de proprietăți,** ca acțiuni ale registrului, cu un ADR nou care schimbă ADR 0038 §2 și
  §4.
- **Când rolurile se schimbă des, cipul „traseul e vechi” nu se mai arată** la fiecare tragere: traseul stins rămâne până
  vine cel nou.

## Se redeschide dacă

- workerul trece de ~90 kB (o altă bibliotecă grea în CAM);
- documentul copiat la fiecare cerere se simte la recalculul automat (atunci, documentul ca text gata făcut, sau doar
  piesele schimbate);
- Edge și Node dau un G-code diferit pe un document real (atunci, trigonometria proprie și în CAM, ca în simulare).
