# ADR 0190 — Imprimanta 3D prin WiFi: Creality K1C, pe protocolul ei din fabrică

**Starea:** acceptat pe 07.11.2026 (propus pe 06.11), pentru feliile 3.6g și 3.6h, fără mașină, și 3.6i, pe imprimanta
owner-ului, în worktree-ul `imprimanta` (ramura `wip/3.6g-imprimanta`). Cererea owner-ului, din 06.11: „Vreau un worktree care
sa lucreze in continuare la conectorul wifi. Inca nu mi se conecteaza imrpimanta”. Răspunsurile lui, din formularul schiței
(07.11): 1a, 2a, 3a, 4a, adică recomandările, cu o notă la 1 (§B, „Mai târziu”); imprimanta e o K1C (2024), rootarea nu o
știe, IP-ul ei e 192.168.1.12, iar verificarea de pe calculatorul lui, doar cu citiri, e permisă. **Felia 3.6g** gata pe
07.11 (secțiunea „Felia 3.6g”). **Schimbat în parte de ADR 0192** (08.11: §A.2, modulele, cu un driver pe familie; §A.3 și
§E.14, comenzile din timpul imprimării și încălzirea la clic, cu răcirea singură; §C.8, lumina și temperaturile; consola de
G-code rămâne „nu”). **Completează:** ADR 0119 (§13–§14: imprimantele 3D pe
același drum, fără slicer în aplicație; răspunsul din 03.11, o Creality K1C), ADR 0136 (conexiunile ținute, căutarea), ADR 0132
(ferestrele din meniul global). **Schimbă, cu feliile lui:** `BRIEF.md` §12 („Senderul lucrează doar cu familia GRBL”), cum
anunța deja ADR 0119. **Documentul:** neschimbat (v19); imprimanta ține de atelier, nu de proiect.

**Problema.** „Conectează (WiFi)” vorbește azi doar cu controlerele familiei GRBL: „Caută mașina” încearcă `esp3d.local`,
`fluidnc.local`, `grblhal.local` și 192.168.0.1, pe porturile 8282 și 81, iar „Caută în toată rețeaua”, tot 8282 și 81; o
gazdă găsită trebuie să răspundă la `[ESP800]` sau la `?`. O K1C nu ascultă pe porturile acelea și nu vorbește GRBL, deci nu
poate fi găsită și nici legată, oricare ar fi adresa scrisă. Aplicația n-are încă niciun drum spre o imprimantă: asta aduce
felia.

## Ce am aflat (cercetarea din 06.11)

Semnele: [citit] în sursă, [raportat] de oameni care au imprimanta, [nemăsurat] de aflat pe imprimanta owner-ului.

- **Două K1C, cu firmware-uri diferite** [raportat]:
  - **K1C (2024):** firmware 1.3.x (cel mai nou raportat: 1.3.5.22, din vara lui 2026). Accesul root se dă din ecran
    (Setări → informațiile contului root; SSH cu o parolă publică). **Moonraker nu e în firmware-ul de fabrică:** îl aduce,
    după root, scriptul comunității (Creality Helper Script), cu Fluidd pe 4408 și Mainsail pe 4409. Creality are pagina ei pe
    portul 80, WebSocket-ul pe 9999 (folosit și de pagina ei, cu subprotocolul `wsslicer`) și camera MJPEG pe 8080
    (`/?action=stream`); firmware-urile noi au și camera WebRTC pe 8000.
  - **K1C 2025** (altă placă de bază, fără CFS): firmware 1.0.0.x (1.0.0.22 din 07.2025, 1.0.0.26 din 10.2025; pagina Creality
    a K1C arată V1.1.0.27, din 03.2026). **Fără root din ecran** (scos intenționat). Pe **7125**, un API compatibil Moonraker
    („nexusp v0.1.1”, nu Moonraker), cu care Fluidd pornit de pe PC merge; 9999, starea; 8000, camera WebRTC; pe 80, nicio
    pagină (404), dar urcarea merge.
- **Drumul comun ambelor, din fabrică, e al lui Creality Print și OrcaSlicer** [citit: sursa OrcaSlicer, tipul de gazdă
  „CrealityPrint”, din 04.11.2026; integrarea Home Assistant `ha_creality_ws`, cu capturi de pe o K1C din 25.10.2026]:
  - `GET http://<ip>/info`: JSON, cu `model` („K1C”, „K1C_CFS-C”) și `mac`;
  - `POST http://<ip>/upload/<nume>` (multipart, câmpul `file`): fișierul ajunge în `/usr/data/printer_data/gcodes/`;
  - **WebSocket-ul `ws://<ip>:9999`**, cu cadre text JSON (familia K1 nu primește cadre binare):
    - imprimanta trimite periodic `{"ModeCode":"heart_beat",…}`, iar clientul răspunde `ok` (text simplu): fără răspuns,
      imprimanta închide legătura;
    - **starea vine pe bucăți**, doar ce s-a schimbat: `state`, `printProgress`, `printFileName`, `printLeftTime`,
      `printJobTime`, `nozzleTemp` / `targetNozzleTemp`, `bedTemp0` / `targetBedTemp0`, `boxTemp`, `err` (`errcode`, `key`),
      `withSelfTest`, `lightSw`, `model`, `modelVersion`, `hostname`;
    - `state`: 1 imprimă, 5 pauză, 4 oprită, 7 oprirea în curs, 9 pornirea (sub o secundă), 0 pregătirea. La final, K1C
      arată 100 % cu timp rămas (86 s în captură), apoi 99, abia apoi încheie; numele ultimului fișier și 100 % rămân și după;
    - cereri: `{"method":"get","params":{"ReqPrinterPara":1}}` (toată starea), `{"method":"get","params":{"reqGcodeFile":1}}`
      (lista fișierelor, răspunsul `retGcodeFileInfo2`: ~150 KiB la 200 de fișiere);
    - comenzi (`"method":"set"`): `{"pause":1}`, `{"pause":0}` (reia), `{"stop":1}`,
      `{"opGcodeFile":"printprt:/usr/data/printer_data/gcodes/<nume>"}` (pornirea; după ea, K1 închide legătura),
      `{"nozzleTempControl":t}`, `{"bedTempControl":{"num":0,"val":t}}`, `{"lightSw":0|1}` și `{"gcodeCmd":"…"}`, orice
      G-code;
    - **fără parolă:** oricine din rețea poate comanda imprimanta (ca podul ESP3D, ADR 0119 „Limite”).
  - **Găsirea:** imprimanta se anunță prin DNS-SD (`_Creality-<MAC>._udp.local.`), pe care un browser nu-l vede (n-are UDP), și
    n-are un nume `.local` știut. Rămân IP-ul, de pe ecranul ei (Setări → Rețea), și căutarea în rețea pe portul 9999, ca la 3.6f.
- **Browserul** (ADR 0119 §B; ghidul Chrome „Local Network Access”) [citit]:
  - `ws://<ip privat>:9999` dintr-o pagină HTTPS e scutit de blocare, cu permisiunea rețelei locale; `ws:` e deja în CSP;
  - urcarea (`fetch('http://<ip>/upload/…', { targetAddressSpace: 'local' })`) trece tot cu permisiunea, dar **CSP-ul cere
    `http:` în `connect-src`**, pe care azi nu-l are. Un POST multipart e o cerere „simplă”, fără preflight: ajunge la imprimantă
    și dacă ea nu răspunde cu antete CORS; atunci răspunsul nu se poate citi, deci urcarea se verifică în lista fișierelor de pe
    9999 (numele și mărimea);
  - **camera:** un `<img src="http://…">` într-o pagină HTTPS e conținut mixt (browserul îl ridică la `https` și cade); ar trece
    doar prin `fetch` (CSP `http:`, CORS la cameră) sau prin WebRTC (semnalizarea pe HTTP, la 8000);
  - **Moonraker adevărat refuză WebSocket-ul unei pagini de pe altă origine** dacă originea ei nu e în `cors_domains`
    (`check_origin` din `components/websockets.py`).
- **Nemăsurat încă, pe imprimanta owner-ului:**
  - dacă 9999 primește o pagină de pe altă origine: browserul trimite `Origin: https://cncvectorstudio-test.web.app`, iar
    clienții de până acum fie nu trimit o origine de browser (OrcaSlicer, Home Assistant), fie vin de pe imprimantă (pagina ei);
  - dacă `/info` și `/upload` au antete CORS;
  - varianta (K1C sau K1C 2025) și firmware-ul.
- **Avertismentul din captura owner-ului** (03.11): „CC5000: Movement coordinates are out of range” nu apare în nicio listă
  publică de coduri [căutat]. Familia apropiată (CX2585, CY2586, CZ2587, „coordonatele în afara cursei”) vine, după Creality,
  dintr-un fișier feliat pentru altă imprimantă sau cu altă mărime a patului; imprimarea din captură a mers mai departe (26 %).

## Decizia

### A. Calea: protocolul Creality, din fabrică

1. **Profilul `creality-k1`** (familia K1: K1, K1C, K1C 2025, K1 Max, K1 SE): starea și comenzile pe WebSocket-ul de pe 9999,
   urcarea pe HTTP, pe 80. Merge pe ambele K1C, fără root și fără nicio setare pe imprimantă; e drumul lui Creality Print și al
   lui OrcaSlicer, deci unul pe care Creality îl păstrează. Moonraker vine ca al doilea profil, mai târziu (§F).
2. **O imprimantă nu e un flux GRBL.** Fișierul stă în memoria ei și ea îl imprimă singură; aplicația îl urcă, cere pornirea și
   urmărește. Fără numărarea caracterelor, fără buffer, fără punct de reluare. Module noi, alături de sender, nu în el, în
   domeniul mașinii (`src/machine/imprimanta/`, sub aceeași regulă de importuri: fără document, CAM sau post): `creality.ts`
   (pur: cadrele în stare, comenzile, `ok`-ul, lista fișierelor), `sesiune.ts` (WebSocket-ul, reconectarea), `tinute.ts`
   (imprimantele ținute și căutarea), iar în 3.6h `urcare.ts` (POST-ul și verificarea lui) și `gcode3d.ts` (pur: antetul
   feliatorului, întinderea mișcărilor). Adresa locală, permisiunea și planificatorul căutării, comune cu senderul, stau în
   `src/machine/reteaLocala.ts` (reexportate de `websocket.ts` și `conexiuni.ts`), ca imprimanta să nu tragă după ea
   transportul senderului (§G).
3. **Legătura:** `ws://<ip>:9999`, **fără subprotocol** (ca OrcaSlicer: Chrome refuză o legătură care cere un subprotocol pe
   care serverul nu-l întoarce, iar pagina imprimantei, care cere `wsslicer`, nu e pe toate K1C), cadre text. La deschidere, cere toată
   starea (`ReqPrinterPara`) și lista fișierelor; răspunde `ok` la fiecare bătaie a inimii. **Singur, nu trimite nicio comandă
   `set`:** doar cereri de citire și `ok`; fiecare `set` pleacă dintr-un clic. Adresa, ca la ADR 0119 §B (un IP privat sau un
   nume `.local`, judecat înainte, cu `adresaRetea`); doar Chrome și Edge, de la 147.

### B. Unde stă (întrebarea 1)

4. **Fereastra Imprimanta** (en: Printer), a treia filă a meniului global, după Proiectare și Mașina (lista ferestrelor e făcută
   să crească, ADR 0132). Imprimanta lucrează în paralel cu CNC-ul și fără el, iar panoul ei e altul (temperaturile, fișierele din
   imprimantă, mai târziu camera): fereastra Mașina rămâne a CNC-ului. „Caută mașina”, din Mașina, nu caută imprimante.
5. **Conexiunile ținute,** ca la ADR 0136, într-o listă a lor (`localStorage`, `cncvs2.imprimanta.retea`, `v: 1`, cel mult 8):
   adresa, portul (implicit 9999), modelul și numele de la imprimantă (`model`, `hostname`). Omul alege din listă; fereastra nu
   se leagă singură la deschidere. „Caută în toată rețeaua” încearcă 9999 pe rețelele /24 ale imprimantelor ținute (altfel
   192.168.0.x și 192.168.1.x), la clic, cu aceleași plafoane ca 3.6f. Ultimul IP al unui nume `.local`, ca la pod, nu se
   ține: imprimanta nu-și spune IP-ul pe 9999.

**Mai târziu (nota owner-ului la întrebarea 1, 07.11):** „Vreau sa pot pune panourile mai multor masini unul langa altul,
eventual si pe monitoare diferite. Dar asta poate veni mai tarziu.” Ferestrele Mașina și Imprimanta, alăturate sau în ferestre
de browser separate (pe alt monitor), cer o felie a lor: ferestrele aranjamentului (ADR 0132) ca panouri de pus unul lângă
altul, iar sesiunile (o mașină și o imprimantă, deodată) sunt deja despărțite.

### C. Feliile (întrebarea 2)

6. **3.6g:** conectarea (adresa sau căutarea), starea (starea imprimantei, duza și patul, cu țintele, aerul din carcasă,
   progresul, timpul trecut și cel rămas, fișierul, eroarea cu codul ei), **Pauză / Reia / Oprește**, fișierele din imprimantă (lista;
   **Pornește** un fișier, cu confirmare), jurnalul cadrelor (de copiat, pentru transcriere). **Fără schimbare de CSP.**
7. **3.6h:** trimiterea unui `.gcode` gata feliat, de pe calculator, cu verificarea fișierului (§D) și pornirea cu confirmare.
   Cere `http:` în `connect-src` (întrebarea 3).
8. **Mai târziu, fiecare cu ADR-ul ei:** camera (întrebarea 4), comanda temperaturilor (preîncălzirea), lumina, profilul
   Moonraker, Marlin pe USB. **Nu:** felierea (ADR 0119 §13: modelul se feliază în Creality Print sau OrcaSlicer) și consola de
   G-code (`gcodeCmd`): ecranul imprimantei și aplicația Creality le au.

### D. Verificarea fișierului (3.6h)

9. **Antetul:** Creality Print și OrcaSlicer scriu în comentarii imprimanta, materialul, temperaturile, timpul estimat și
   miniatura (PNG în base64). Fereastra de confirmare le arată pe toate.
10. **Întinderea mișcărilor:** cea mai mică și cea mai mare valoare pe X, Y și Z, din toate mișcările (G0–G3, cu G90 / G91 și
    G92), față de patul K1C (220 × 220 × 250 mm). O mișcare în afara lui (sau un antet al altei imprimante) dă un avertisment
    cu linia, înainte de urcare, ca o eroare de felul lui CC5000 să se vadă în aplicație, nu la imprimantă; urcarea cere atunci
    „Trimite oricum”. Marginile exacte ale K1C (unde purjează la start) se iau din fișierele reale ale owner-ului, nu din memorie.

### E. Siguranța

11. **Pornirea** (a unui fișier din imprimantă sau a celui urcat) doar după confirmarea omului, într-o fereastră a lui cvs2:
    fișierul, miniatura, materialul și temperaturile, timpul și întrebarea „Patul e gol?” (o piesă rămasă pe pat, sub duză).
12. **Pauză și Oprește** stau vizibile cât imprimă, sus în fereastră. Pauza pleacă pe loc; Oprește cere o confirmare, fiindcă o
    imprimare oprită nu se mai poate relua. Oprirea de urgență rămâne ecranul imprimantei (și întrerupătorul ei).
13. **O legătură căzută nu oprește imprimarea:** imprimanta merge mai departe din memoria ei. Panoul spune asta și încearcă singur
    să se lege din nou (doar citiri), cât fereastra e deschisă și omul nu s-a deconectat.
14. **Încălzitoarele:** în 3.6g și 3.6h, temperaturile doar se citesc. Aplicația nu încălzește nimic; imprimanta încălzește
    singură când pornește un fișier.
15. Fără parolă pe 9999: ghidul spune că oricine din rețeaua atelierului poate comanda imprimanta (o rețea doar a ta).

### F. Moonraker, mai târziu

16. Pentru o K1C rootată (Helper Script), pentru 7125 al lui K1C 2025 și pentru alte imprimante Klipper: JSON-RPC pe
    `ws://<ip>:7125/websocket`, urcarea prin `POST /server/files/upload`, cu originea aplicației în `cors_domains` (pusă de om, în
    `moonraker.conf`; ghidul o va spune). Vine dacă profilul Creality nu ajunge, de exemplu dacă 9999 refuză originea paginii.

### G. Bugetul

17. Pornirea neschimbată: fila ferestrei e un nume, iar panoul și protocolul vin la cerere; textele, ca date
    (`mesaje/imprimanta.json`, ADR 0086). Ținta: cel mult ~8 kB în total, pentru 3.6g și 3.6h împreună (504,5 / 550 pe `main`,
    cu patru linii pe același plafon). **Măsurat la 3.6g:** pornirea 101,6 (+0,2: fila, acțiunea și iconița ei), totalul 512,6
    (+8,1: bucata ferestrei 7,5 kB, cea comună `reteaLocala` 1,0 kB). Fără mutarea din §A.2, fereastra trăgea după ea transportul
    și conexiunile mașinilor într-o bucată comună nouă de 4 kB. Pentru 3.6h rămân deci ~2 kB din țintă: mai mult cere întâi
    acordul owner-ului. **Măsurat la 3.6h:** pornirea neschimbată (101,6), totalul 517,3 (+3,3 față de 514,0, după unirea cu
    7.9↑b: verificarea fișierului ~1,8 kB, trimiterea ~0,6, dialogul ~1,0), deci ~1,3 kB peste țintă: **acceptat de owner pe 07.11**
    („Da, accept”, la „Accepți cei 3,3 kB în plus pentru 3.6h?”); cu `main` din 07.11 unit în ramură, totalul
    e 530,8 / 550.

## Feliile

Numele urmează seria 3.6d–3.6f („3.6g-b” nu e un id al roadmap-ului, care primește doar forme ca `3.6g`, `3.4b`, `3.8-0`).

- **3.6g** (§A, §B, §C.6, §E): imprimanta falsă, protocolul pe hârtie, fereastra Imprimanta, ghidul owner-ului.
- **3.6h** (§C.7, §D): urcarea și verificarea fișierului, după răspunsul la întrebarea 3.
- **3.6i** (pe imprimanta owner-ului): proba ghidului, cu transcrierea cadrelor rejucată pe imprimanta falsă (ca 3.5b).

## Proba

- **Pe hârtie:** `test/unit/imprimanta.creality.test.ts` (cadrele, pe bucăți, în stare: 1, 4, 5, 7, 9 și 100 % cu timp rămas;
  `ok` la bătaia inimii; comenzile, octet cu octet; lista fișierelor; eroarea); în 3.6h, `test/unit/imprimanta.gcode3d.test.ts`
  (antetele OrcaSlicer și Creality Print; întinderea, cu G90, G91, G92 și arce, pe valori calculate pe hârtie) și
  `imprimanta.urcare.test.ts` (numele, cererea, verificarea în listă).
- **Imprimanta falsă** (`test/e2e/imprimantaFalsa.ts`, fără dependențe, ca `controlerWebSocket.ts`): WebSocket-ul de pe 9999,
  cu protocolul de mai sus (bătăile inimii, iar fără `ok` închide legătura; starea pe bucăți; lista; pauza, reluarea, oprirea;
  pornirea, după care închide legătura, ca K1), pe rețeaua de loopback a probei (`CNCVS2_E2E_RETEA`); în 3.6h și
  `POST /upload/<nume>`, pe portul ei: 80 cere drepturi pe Linux (în CI), deci proba mută cererea aplicației de pe 80 pe portul
  imprimantei false (`page.route`), iar aplicația rămâne pe 80. Protocolul ei, pe hârtie, în ghid.
- **Otrăvurile:** `test/otravuri/3.6g.py`, `test/otravuri/3.6h.py`.
- **Pe imprimanta owner-ului** (ghidul `docs/masina/imprimanta-k1c.md`): IP-ul, permisiunea, starea văzută; pauza și reluarea pe
  o imprimare scurtă de probă; jurnalul cadrelor copiat (transcrierea), rejucat pe imprimanta falsă.

## Felia 3.6g (07.11.2026): fereastra Imprimanta

- **Ce s-a construit:**
  - protocolul, pur (`src/machine/imprimanta/creality.ts`): cadrele text în stare, pe bucăți, cu numerele ca text; eroarea
    (`err.errcode`, `key`); firmware-ul din `modelVersion`; lista fișierelor, cu căile ținute în directorul G-code (o cale din
    afara lui sau un nume cu `/`, `..` ori caractere de control nu se folosește); starea lucrării ca integrarea Home Assistant;
    cererile și comenzile, octet cu octet ca OrcaSlicer;
  - sesiunea (`sesiune.ts`): deschiderea (10 s), primul cadru al imprimantei (6 s; altfel „răspunde ceva, dar nu ca o
    imprimantă”), `ok` la fiecare bătaie a inimii, comenzile doar cu legătura făcută, legătura căzută („pierdută”, apoi
    reîncercări la 1, 2, 4, 8, 15 și 30 s, doar cu citiri), închiderea de după o pornire (așteptată: legătura se reface după
    0,3 s), jurnalul (cel mult 500 de cadre, unul lung tăiat la 2 000 de caractere);
  - imprimantele ținute și căutarea (`tinute.ts`);
  - fereastra (`src/app/PanouImprimanta.tsx`, la cerere): conectarea (lista, adresa, căutarea, motivul și pașii unui eșec),
    banda (starea, numele, adresa, firmware-ul, Pauză / Reia / Oprește, Deconectează), lucrarea, temperaturile, codul de la
    imprimantă, fișierele (Pornește, cu bifa „Patul e gol”), jurnalul (pe ecran fără bătăile inimii, numărate; copia le are);
    capitolul „Imprimanta” din manual, în ambele limbi.
- **Găsit pe drum:**
  - **o reîncercare nu judecă permisiunea** (§E.13): browserul aplicației spune permisiunea rețelei locale refuzată și pentru o
    adresă la care nici n-o cere (pagina pe `localhost`, imprimanta pe 127.0.0.1); o legătură căzută renunța la reîncercări.
    Acum doar prima legare, cerută de om, citește starea permisiunii;
  - după Oprește, imprimanta trece prin 7 („oprirea în curs”, arătată altfel neutru, „Se pregătește”): cu oprirea cerută din
    fereastră, banda spune „Se oprește”;
  - căutarea include și rețelele de loopback ale imprimantelor ținute (ca la mașini), altfel proba ar căuta în rețeaua reală.
- **Pe imprimanta owner-ului** (07.11, cu acordul lui, doar citiri): la 10:48 și 11:57, 192.168.1.12 n-a răspuns nici la ping,
  nici pe vreun port (80, 9999, 7125, 8000, 8080), iar din calculatorul lui nu se vedea niciun alt aparat din 192.168.1.x în
  afară de router: imprimanta oprită sau o rețea WiFi despărțită de cablu (rețeaua de oaspeți, „AP isolation”). Ce n-a putut fi
  măsurat (originea paginii pe 9999, CORS-ul de pe 80, ritmul bătăilor inimii) rămâne pentru 3.6i.
- **Probele:** `test/unit/imprimanta.creality.test.ts` (14), `imprimanta.sesiune.test.ts` (10, pe un WebSocket fals și un ceas
  fals), `imprimanta.tinute.test.ts` (7); `test/e2e/imprimanta.spec.ts` (5, în Edge, cu imprimanta falsă din
  `test/e2e/imprimantaFalsa.ts`, pe 9999, pe rețeaua de loopback a probei); manualul (fiecare `data-imprimanta` numit în
  capitolul lui). Otrăvurile (`test/otravuri/3.6g.py`, 43, într-o clonă în afara Drive-ului): 39 prinse din prima; C07 (o cale
  lungă din afara directorului G-code), T01 (o listă de altă versiune, cu rânduri) și T06 (ceasul dat înapoi) au primit probe
  și sunt prinse acum; S08 (garda generației din `onmessage`) era cod mort: un WebSocket vechi își pierde ascultătorii la
  oprire sau e deja închis, deci garda a rămas doar pe căile asincrone (ceasurile, răspunsul permisiunii).
- **După felie:** o confirmare închisă de o legătură pierdută nu mai reapare când legătura revine (proba e2e a legăturii căzute).

## Felia 3.6h (07.11.2026): trimiterea unui `.gcode`

- **Ce s-a construit:**
  - verificarea, pură (`src/machine/imprimanta/gcode3d.ts`): antetul lui OrcaSlicer și Creality Print (`; cheie = valoare`, cu
    configurația la final), al lui PrusaSlicer și al lui Cura (`;CHEIE:valoare`): imprimanta (`printer_model`,
    `TARGET_MACHINE.NAME`, `printer_settings_id`), duza, materialul (primul din `filament_type`), timpul (`total estimated time`,
    `estimated printing time (normal mode)`, `TIME`) și cea mai mare miniatură PNG; temperaturile, din primele comenzi de
    încălzire cu o valoare (M104 / M109, M140 / M190) sau din `START_PRINT EXTRUDER_TEMP=… BED_TEMP=…` (cum pornesc K1);
    întinderea mișcărilor G0–G3 pe X, Y și Z, cu G90 / G91, G92 (deplasarea), G28 (poziția neștiută până la o mișcare
    absolută) și arcele cu I / J, cu punctele lor extreme (un arc cu capetele în pat poate ieși din el), față de patul modelului
    (K1, K1C, K1 SE: 220 × 220 × 250; K1 Max: 300 × 300 × 300). Un arc cu `R` se judecă doar după capăt. Fișierul se citește pe
    bucăți de 1 MiB, fără să taie o literă între ele; analiza ține doar ce a aflat;
  - trimiterea (`urcare.ts`): numele (spațiile devin `_`, ca OrcaSlicer; doar `.gcode`; un nume pe care lista îl are primește
    „-2”, „-3”…: **un fișier din imprimantă nu se înlocuiește**, poate fi chiar cel care se imprimă, iar verificarea după nume
    spune ceva doar pentru un nume nou); `POST http://<ip>/upload/<nume>` pe 80, multipart doar cu `file`, `no-cors` (răspunsul
    nu se citește: CORS-ul imprimantei e nemăsurat), cu `targetAddressSpace: 'local'` spre rețeaua locală (nu spre loopback);
    apoi lista, cerută din nou pe 9999 (de trei ori, la câte 2 s), până apare numele;
  - fereastra: **Trimite un fișier…** sub lista fișierelor și dialogul „Trimite la imprimantă” din schiță (secțiunea E): fișierul
    și mărimea, **Alt fișier…**, ce spune antetul (cu ✓ fără avertismente) și miniatura, „Toate mișcările încap în patul…”,
    avertismentele (o mișcare în afara patului, cu linia și textul ei; alt model în antet; nicio mișcare), numele nou, apoi
    **Trimite** sau **Trimite oricum**; „Se trimite…”; „Ajuns în imprimantă”, cu **Pornește imprimarea…** (confirmarea de la
    3.6g, cu bifa) și **Închide**, sau motivul (`retea`, `lipsa`, `citire`) cu **Încearcă din nou**. **Renunță** și Escape
    închid și opresc o trimitere începută;
  - CSP-ul: `http:` în `connect-src` (răspunsul 3a), cu motivul în `shared/csp.ts`; `firebase.json` regenerat.
- **Găsit pe drum:** proba e2e a CSP-ului (`csp.spec.ts`) avea drept martor refuzat `http://example.com`, care acum trece de CSP
  (iar de pe `http://localhost` ar fi ieșit în internet): cererea e prinsă acum de `route`, iar martorul refuzat e o cerere
  `data:`. Un martor `wss://` n-a mers: trece de CSP (după CSP3, sursele `ws:` și `https:` acoperă și `wss:`, deci lipsa lui din
  `connect-src` nu-l refuză), iar o rută Playwright nu prinde un WebSocket, deci ar fi ieșit în rețea.
- **Probele:** `imprimanta.gcode3d.test.ts` (9), `imprimanta.urcare.test.ts` (5); `imprimanta.spec.ts` +2 (trimiterea
  cap-coadă, cu imprimanta falsă care primește `POST /upload`; refuzul, avertismentele și **Trimite oricum**, cererea căzută,
  fișierul care nu apare în listă, reluarea); `csp.spec.ts` (martorul `data:`); manualul (8 controale noi).
- **Rămâne pentru 3.6i:** dacă `/upload` primește o pagină de pe altă origine (CORS, `Origin`), dacă Chrome lasă cererea HTTP
  spre IP-ul imprimantei cu permisiunea dată pentru 9999, și marginile reale ale patului K1C (unde își face linia de curățare a
  duzei), din fișierele owner-ului.

## Felia 3.6i (07.11.2026): pe imprimanta owner-ului

- **Pasul 1, legarea (17:04, din browserul owner-ului, pe canalul `imprimanta`):** fereastra s-a legat la 192.168.1.10 (IP-ul s-a
  schimbat de la .12: de rezervat în router), cu „Ready”, numele, temperaturile; jurnalul copiat e transcrierea, păstrată
  anonimizată în `test/fixtures/imprimanta/k1c-2025.json`. **Măsurat:**
  - **9999 primește pagina de pe altă origine** (`https://cncvectorstudio-test--imprimanta-…web.app`), după permisiunea rețelei
    locale: drumul din fabrică merge din browser, deci profilul Moonraker (§F) nu trece înainte;
  - **imprimanta e o K1C 2025:** `modelVersion` are `printer sw ver` gol, iar firmware-ul stă în `DWIN sw ver` (V1.0.0.26.20251024S,
    cel din 10.2025); `webrtcSupport: 1` (camera, pe WebRTC, pentru felia ei);
  - **fără bătăi ale inimii:** în 37 s, niciun `heart_beat`, doar bucăți de stare la ~3 s (`{"maxBedTemp":115}`, `boxTemp`), iar
    legătura ține fără `ok`; sesiunea răspundea oricum doar la o bătaie primită;
  - **lista fișierelor are alt format:** `{"retGcodeFileInfo":{"totalNum":11,"fileInfo":"dir:nume:mărime:strat:dată:filament:miniatură;…"}}`
    (un singur text; numele au spații), nu `retGcodeFileInfo2` (lista din OrcaSlicer și Home Assistant), urmată de `historyList`
    (istoricul imprimărilor) și `elapseVideoList`. Fereastra aștepta lista la nesfârșit („Waiting for the file list”), deci și
    **Trimite un fișier…** rămânea oprit;
  - calculatorul de pe cablu al sesiunii (192.168.1.4) nu vede imprimanta (fără ping, nimic în ARP pe .10 sau .12), dispozitivul
    owner-ului o vede: clienții WiFi despărțiți de cablu. Fără urmări pentru aplicație; verificările mele vin din jurnalele lui.
- **Reparat:** lista ca text (directorul de pe fiecare intrare: una din afara directorului G-code se sare, nu se mută după nume;
  câmpurile din dreapta, ca un nume cu `:` să rămână întreg), **mărimea** fiecărui fișier (arătată în listă; trimiterea cere acum
  și aceeași mărime, cu motivul nou `marime` când diferă), firmware-ul din `DWIN sw ver` când `printer sw ver` e gol. Imprimanta
  falsă are felul `k1c-2025` (fără bătăi ale inimii, lista ca text, istoricul, filmele), cu proba ei e2e; transcrierea, rejucată
  pe hârtie (`imprimanta.creality.test.ts`).
- **Pasul 2 (17:36–17:43, a doua transcriere):** owner-ul a trimis un fișier din aplicația Creality, iar fereastra l-a văzut
  pornind: **imprimanta trimite tuturor celor legați** (răspunsurile cerute de alt client, lista cu fișierul nou, întâi cu mărimea
  parțială, 1 023 de octeți, apoi întreagă, ceea ce confirmă verificarea după mărime, starea 9 → 1, `printId`, `deviceState`,
  `curPosition`, `usedMaterialLength`, plus un cadru `objects` cu conturul piesei pe pat, al lui `exclude_object`). **Oprește din
  fereastră a mers:** `{"stop":1}`, apoi stările 0 (cu fișierul încă pus) → 4 → 0 fără fișier („Se oprește”, „Oprită”,
  „Liberă”). La **o pornire de pe ecran** („reprint”), imprimanta și-a refăcut WiFi-ul **cu alt IP (.10 → .7)**: legătura veche
  a murit fără să se închidă, iar fereastra a rămas pe ultima stare; owner-ul a găsit-o cu „Caută în toată rețeaua”. `layer`
  sare între două numărători (8, 3, 4, 10, 5), de lămurit. **Reparat:** paza de tăcere (`TIMP_TACERE_MS`, 20 s: o legătură
  care tace e pierdută și se reface), căutarea după nume după o reîncercare căzută (`cautaInRetea` cu `nume`; lista ținută se
  mută la noua adresă, fiindcă o imprimantă cu același nume la altă adresă ia locul intrării vechi), evenimentele legăturii în
  jurnal (`open`, `closed <cod>`, `failed <motiv>`, `silence`, `search`, `found`), bucățile fără nimic nou ascunse de pe
  ecran (numărate, în copie). Imprimanta falsă are `taci()` (legătura tace, adresa nu mai primește), cu proba e2e a IP-ului
  schimbat.
- **Rămâne (pasul 3, pe imprimantă):** trimiterea unui cub feliat pentru K1C (urcarea pe 80 de pe pagina aplicației), pornirea,
  pauza și reluarea, oprirea, jurnalul copiat; marginile patului, dintr-un fișier feliat pentru K1C.

## Întrebările (owner)

**Răspunsurile, din 07.11 (formularul schiței):** 1a (cu nota de la §B, „Mai târziu”), 2a, 3a, 4a. Faptele: K1C (2024),
rootarea neștiută, IP-ul 192.168.1.12, verificarea doar cu citiri permisă; ce a încercat și fișierul cu CC5000, necompletate.

Întâi, ce s-a întâmplat: ce ai apăsat, ce adresă sau nume ai scris și ce a spus aplicația (o captură); firmware-ul K1C (din
ecranul ei) și dacă e K1C sau K1C 2025 (eticheta din spate, sau versiunea: 1.3.x e K1C, 1.0.x / 1.1.x e K1C 2025); dacă e
rootată; IP-ul ei (Setări → Rețea); de unde venea `output_11031835.gcode` și ce a făcut imprimanta la CC5000. Cu imprimanta
pornită și IP-ul ei, verific de pe acest calculator, doar cu citiri (nicio comandă), ce răspunde pe 80, 9999, 7125, 8000 și 8080
și dacă 9999 primește o pagină de pe altă origine.

1. **Unde stă imprimanta:** a) fereastra Imprimanta, a treia filă, după Proiectare și Mașina (recomandat, §B); b) în fereastra
   Mașina, ca al doilea aparat, lângă CNC; c) doar din Easy 3Draw.
2. **Ordinea:** a) 3.6g întâi (conectarea, starea, pauza și oprirea, fișierele din imprimantă), apoi 3.6h (trimiterea unui
   `.gcode`) (recomandat); b) totul într-o singură felie; c) doar urmărirea, fără comenzi.
3. **CSP-ul, pentru trimiterea fișierului (3.6h):** a) da, `http:` în `connect-src` (recomandat: un `http://` spre o gazdă
   publică rămâne blocat ca conținut mixt; trec doar adresele locale, cu permisiunea rețelei locale, ca la `ws:`); b) nu:
   fișierele ajung în imprimantă din Creality Print sau OrcaSlicer, iar cvs2 doar le pornește și le urmărește.
4. **Camera:** a) într-o felie a ei, după 3.6h (recomandat); b) odată cu 3.6g; c) nu: o are aplicația Creality.

## Ce am respins

- **Moonraker ca prim drum:** pe K1C (2024) cere root și scriptul comunității; pe K1C 2025, „nexusp” e o rescriere Creality, fără
  documentație; Moonraker adevărat cere și originea aplicației în `cors_domains`.
- **Creality Cloud:** trece prin contul omului și prin serverele Creality, nu prin rețeaua atelierului.
- **Un ajutor instalat pe calculator** (un pod local, care să ocolească originea și CORS-ul): ca la ADR 0119, o instalare și
  actualizări în plus; rămâne rezerva, dacă imprimanta refuză pagina și Moonraker nu e de folosit.
- **Comanda temperaturilor și consola G-code în primele felii:** imprimanta are încălzitoare, iar ecranul ei le face deja.

## Se redeschide dacă

- 9999 refuză o pagină de pe altă origine (atunci §F trece înainte, sau ajutorul local);
- Creality schimbă protocolul (un firmware nou al K1C) sau owner-ul își rootează imprimanta și vrea Moonraker;
- vine o imprimantă de altă familie (Marlin, Bambu Lab: cea din urmă nu se poate din browser, ADR 0119).

## Sursele

- OrcaSlicer, gazda „CrealityPrint” (urcarea, `/info`, WebSocket-ul de pe 9999, cadrele text, `ok`-ul, pornirea), la
  `0b1d825` (04.11.2026): <https://github.com/SoftFever/OrcaSlicer/blob/main/src/slic3r/Utils/CrealityPrint.cpp>, găsirea:
  <https://github.com/SoftFever/OrcaSlicer/blob/main/src/slic3r/Utils/CrealityHostDiscovery.cpp>
- Integrarea Home Assistant `ha_creality_ws` (portul, subprotocolul `wsslicer`, bătăile inimii, stările K1C, comenzile):
  <https://github.com/3dg1luk43/ha_creality_ws>
- K1C 2025, porturile și firmware-ul: <https://forum.creality.com/t/k1c-2025-orcaslicer-workarounds-for-missing-web-interface/47164>
- K1C, root și Moonraker adus de comunitate: <https://helixscreen-website.pages.dev/guide/creality-k1c-setup/>,
  <https://github.com/Guilouz/Creality-Helper-Script-Wiki/discussions/901>
- K2Dash (o pagină web legată direct de 9999, 8000 și 80): <https://github.com/pdromnt/k2dash>
- Pagina Creality a K1C (firmware-ul): <https://www.creality.com/download/k1c-carbon-3d-printer>
- Moonraker, originea WebSocket-ului: <https://github.com/Arksine/moonraker/blob/master/moonraker/components/websockets.py>
- Chrome, „Local Network Access”: <https://developer.chrome.com/docs/modern-web-guidance/guides/security/local-network-access>
- Codurile „în afara cursei” (CX2585, CY2586, CZ2587):
  <https://support.dremc.com.au/support/solutions/articles/51000435286-error-code-summary-for-k2-plus-multi-color-printer>,
  <https://forum.creality.com/t/y-coordinate-out-of-range-issue-with-creality-print/52987>
