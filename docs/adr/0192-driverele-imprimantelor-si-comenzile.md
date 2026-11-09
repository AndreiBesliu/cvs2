# ADR 0192 — Driverele imprimantelor și comenzile din timpul imprimării

**Starea:** acceptat pe 08.11.2026 (propus în aceeași zi), cu recomandările („Da, recomandările”: 1a, 2a, 3a), pentru felia
3.6o (fără imprimantă, pe imprimanta falsă; apoi proba pe imprimanta owner-ului, după ghid), în worktree-ul `imprimanta`
(ramura `wip/3.6g-imprimanta`). **Felia 3.6o** gata pe 09.11 (secțiunea „Felia 3.6o, gata”), fără imprimantă; proba pe
imprimanta owner-ului (ghidul, pasul 5) rămâne la el. Cererea owner-ului, din 08.11, la
răspunsul cu cele șapte grupuri de îmbunătățiri ale legăturii prin WiFi: „in principiu, vreau sa pot conecta orice fel de
imprimanta, deci codul pe care il dezvolti trebuie sa fie pregatit pentru asta. poti incepe cu 1”. Grupul 1: comenzile din
timpul imprimării (lumina, viteza și debitul, ventilatoarele, preîncălzirea și răcirea, homing-ul). **Schimbă:** ADR 0190 §A.2
(modulele imprimantei: un contract comun, cu un driver pe familie), §A.3 (o singură comandă fără clic, răcirea singură, dacă
owner-ul o vrea: întrebarea 3), §C.8 (lumina și temperaturile vin aici; consola de G-code rămâne „nu”), §E.14 (aplicația poate
încălzi, la clic). **Documentul:** neschimbat (v20); imprimanta ține de atelier, nu de proiect.

**Problema.** Codul imprimantei vorbește azi un singur protocol, al familiei Creality K1 (ADR 0190): cadrele de pe 9999 se
citesc direct în starea ferestrei, iar comenzile (pauza, reluarea, oprirea, pornirea) sunt texte ale acelui protocol, chemate pe
nume din panou. O altă imprimantă (Klipper cu Moonraker, OctoPrint, Prusa, Elegoo, Marlin pe USB) ar cere o fereastră a ei. Iar
fereastra doar citește temperaturile: lumina, ventilatoarele, viteza, debitul, preîncălzirea și homing-ul se fac doar de pe
ecranul imprimantei.

## Ce am aflat (cercetarea din 08.11)

Semnele, ca la ADR 0190: [citit] în sursă sau în documentație, [raportat] de oameni care au imprimanta, [măsurat] pe imprimanta
owner-ului, [nemăsurat] de aflat.

- **Familia K1, pe 9999** [citit: integrarea Home Assistant `ha_creality_ws`, descărcată pe 07.11]. Toate sunt
  `{"method":"set","params":{…}}`:
  - lumina: `{"lightSw":1}` / `{"lightSw":0}`; starea, `lightSw` (doar 0 / 1, fără intensitate);
  - ventilatoarele: `{"gcodeCmd":"M106 P<canal> S<0–255>"}`, cu canalul 0 al piesei, 1 al carcasei și 2 cel lateral
    (auxiliar); starea, `modelFanPct`, `caseFanPct`, `auxiliaryFanPct` (%);
  - viteza și debitul: `{"setFeedratePct":v}`, `{"setFlowratePct":v}`, întregi 1–200; starea, `curFeedratePct`,
    `curFlowratePct`;
  - țintele: `{"nozzleTempControl":t}`, `{"bedTempControl":{"num":0,"val":t}}`, între 0 și maximul spus de imprimantă
    (`maxNozzleTemp`, `maxBedTemp`; altfel 300 și 100). **Nicio K1 n-are încălzitor al carcasei**, deși K1C trimite uneori
    `targetBoxTemp` (integrarea și-a scos comanda, care nu făcea nimic);
  - homing-ul: `{"autohome":"X Y"}`, apoi, după ce imprimanta nu mai e ocupată (`deviceState` diferit de 7, cel mult 15 s),
    `{"autohome":"Z"}`; starea, `autohome` („X:0 Y:0 Z:0”: axele știute).
- **Imprimanta owner-ului** [măsurat: transcrierea din 07.11, K1C 2025, V1.0.0.26]: trimite toate câmpurile stării de mai sus
  (`lightSw` 1, ventilatoarele la 0 %, viteza și debitul la 100 %, `maxNozzleTemp` 320, `maxBedTemp` 115, `deviceState` 0,
  `autohome` „X:0 Y:0 Z:0”), dar nu `targetBoxTemp` sau `maxBoxTemp`: carcasa doar se citește. Comenzile n-au fost încercate pe
  ea [nemăsurat].
- **Alte familii: ce diferă**, ca un contract comun să le cuprindă:
  - **Klipper prin Moonraker** (K1 rootată, 7125 al lui K1C 2025, Voron, Sovol, Elegoo Neptune 4, Creality Ender-3 V3 KE…)
    [citit]: JSON-RPC pe `ws://<ip>:7125/websocket`; starea prin abonarea la obiectele imprimantei (`extruder`, `heater_bed`,
    `fan`, `gcode_move` cu `speed_factor` și `extrude_factor`, `toolhead` cu `homed_axes`); comenzile ca G-code
    (`printer.gcode.script`: M104, M140, M106, M220, M221, G28); ventilatoarele și luminile după numele din configurația
    imprimantei; originea paginii în `cors_domains` (ADR 0190 §F).
  - **OctoPrint** (orice imprimantă Marlin, cu un Raspberry Pi) [citit: documentația API]: REST cu o cheie API (`X-Api-Key`) și
    CORS-ul pornit de om; viteza 50–200 % (singura comandă a capului primită în timpul imprimării), debitul 75–125 %; țintele pe
    duză, pat și cameră; homing-ul pe axe (refuzat, 409, cât imprimă); ventilatoarele și lumina doar ca G-code.
  - **PrusaLink** (MK4, XL, MINI, Core One) [raportat]: starea (`/api/v1/status`) are țintele, ventilatoarele și viteza, dar API-ul
    documentat nu le schimbă (integrarea Home Assistant doar le citește); parola, prin HTTP Digest.
  - **Elegoo Centauri Carbon** (SDCP v3, `ws://<ip>:3030/websocket`) [raportat]: lumina (`LightStatus.SecondLight` 0 / 1); viteza
    primește doar patru trepte, nu un procent oarecare.
  - **Bambu Lab** [raportat]: MQTT peste TLS, pe 8883, pe care un browser nu-l poate deschide (ADR 0119); viteza, tot în patru
    trepte.
  - **Marlin pe USB** (Web Serial, ca senderul GRBL) [citit]: G-code direct (M104, M140, M106, M220, M221, G28; lumina, M355,
    dacă firmware-ul o are), cu starea cerută periodic (M105, M27).
  - **Deci diferă:** transportul (WebSocket cu text JSON, JSON-RPC, REST cu cheie, portul serial, MQTT), parola (niciuna, o cheie,
    Digest, un cod de acces), ce comenzi există (lumina, care ventilatoare, camera încălzită), intervalele (viteza 1–200 la K1,
    50–200 la OctoPrint; debitul 75–125 la OctoPrint), ce se poate doar citi (PrusaLink) și forma (procent sau trepte).

## Decizia

### A. Driverul: un contract comun, un driver pe familie

1. **Două straturi.** **Driverul** (pur, fără rețea și fără timp, probat pe hârtie octet cu octet) citește cadrele imprimantei
   în **starea comună**, scrie fiecare **comandă comună** în protocolul ei, ca pași (un text de trimis, sau o așteptare cât
   imprimanta e ocupată), și spune ce poate imprimanta (**capabilitățile**). **Legătura** (transportul: reconectarea, paza de
   tăcere, jurnalul, pașii comenzilor) e comună driverelor de același transport: azi WebSocket cu cadre text (K1; mai târziu
   Moonraker și Elegoo SDCP). HTTP (OctoPrint, PrusaLink), portul serial (Marlin) și un pod local (Bambu) vin cu driverele lor.
2. **Starea comună:** lucrarea (starea, fișierul, progresul, timpii, stratul), temperaturile (duza, patul, carcasa; fiecare cu
   ținta și maximul, unde imprimanta le spune), lumina, ventilatoarele (al piesei, al carcasei, cel lateral; altele, după
   driver), viteza și debitul (%), axele știute, „ocupată”, eroarea. Ce o imprimantă nu spune rămâne necunoscut (null), nu zero.
3. **Comenzile comune:** pauza, reluarea, oprirea, pornirea unui fișier (cele din 3.6g, mutate în contract, cu aceleași texte pe
   K1), lumina, un ventilator la un procent, viteza, debitul, ținta unui încălzitor, homing-ul. Un driver care nu știe o comandă,
   sau o primește în afara intervalului, o refuză: nu pleacă nimic.
4. **Capabilitățile** vin din driver și din ce a spus imprimanta: lumina (dacă imprimanta o raportează), ventilatoarele,
   intervalele vitezei și debitului, încălzitoarele de comandat, cu maximul lor, homing-ul, fișierele, trimiterea. Fereastra
   arată doar ce poate imprimanta legată. Treptele vitezei (Bambu, Elegoo) intră în contract odată cu primul lor driver.
5. **Lista driverelor** (`drivere.ts`): azi unul, `creality-k1`. Imprimantele ținute primesc driverul lor (câmpul `driver`, în
   aceeași listă `v: 1`; una fără el e `creality-k1`, deci lista de azi rămâne). Căutarea în rețea folosește portul și citirea
   driverului. Alegerea tipului apare în fereastra de conectare odată cu al doilea driver: o listă cu o singură variantă nu ajută.
6. **Modulele** (`src/machine/imprimanta/`, aceleași reguli de importuri): `driver.ts` (contractul: starea, comenzile,
   capabilitățile, pașii; pur), `creality.ts` (driverul K1: ce era, plus comenzile noi), `drivere.ts` (lista), `sesiune.ts`
   (legătura WebSocket, peste orice driver de text, cu pașii comenzilor), `tinute.ts`, `urcare.ts` (trimiterea rămâne a lui K1
   până la al doilea driver), `gcode3d.ts`.

### B. Comenzile (grupul 1), pe K1

7. **Lumina:** un comutator, aprinsă sau stinsă.
8. **Ventilatoarele** (al piesei, al carcasei, cel lateral): 0–100 %, întregi; driverul scrie `M106 P<0|1|2> S<0–255>` în
   `gcodeCmd`. **Textul îl face doar driverul**, dintr-un canal și un procent verificate; nimic scris de om nu ajunge în
   `gcodeCmd` (consola rămâne „nu”, ADR 0190 §C.8; întrebarea 2).
9. **Viteza și debitul:** întregi 1–200 % (intervalul lui K1), doar cât imprimă sau stă în pauză (țin de lucrarea de acum);
   „100 %” le readuce.
10. **Temperaturile:** ținta duzei și a patului, întregi între 0 și maximul spus de imprimantă (320 și 115 pe imprimanta
    owner-ului); **Preîncălzește**, cu temperaturile primului strat ale materialelor din felier (PLA 220 / 55, PETG 250 / 70,
    ABS 260 / 105…: aceeași listă, nu o copie; tăiate la maxim); **Răcește** (ambele ținte la 0). Carcasa: doar citită, pe K1.
11. **Homing-ul (X, Y, Z):** cei doi pași de mai sus; doar cu imprimanta liberă (nu cât imprimă, stă în pauză sau se pregătește)
    și după confirmare („Patul e gol?”: la Z, duza coboară spre pat [nemăsurat: unde, pe K1C]).

### C. Fereastra (schița)

12. **Comenzile stau lângă ce schimbă,** ca în Mainsail, Fluidd și panoul Creality Print: în **Temperaturile**, ținta fiecărui
    încălzitor se scrie direct, cu **Preîncălzește** și **Răcește**; în **Lucrarea**, cât imprimă, viteza și debitul (un glisor,
    valoarea scrisă și „100 %”); un card nou, **Ventilatoarele și lumina**, cu comutatorul luminii, glisorul fiecărui
    ventilator și **Homing**. Fără consolă și fără deplasarea capului (jog-ul): alt grup, dacă e cerut.
13. **Fără valori ghicite:** o comandă arată valoarea cerută („→ 120 %”) până o raportează imprimanta; după 6 s fără ea, valoarea
    revine la cea raportată, cu nota „imprimanta n-a confirmat”. Câmpurile scrise pleacă la Enter sau la ieșirea din câmp;
    glisoarele, la eliberare.

### D. Siguranța (schimbă ADR 0190 §E.14)

14. **Fiecare comandă pleacă dintr-un clic** (ADR 0190 §A.3); singura excepție posibilă e răcirea singură (§D.16).
15. **Încălzirea:** doar la clic, doar întregi între 0 și maximul imprimantei. Cât o țintă e peste 0 fără o lucrare, banda
    ferestrei spune „Încălzește: 220 / 55 °C”, cu **Răcește** lângă, la vedere oricât derulezi.
16. **Răcirea singură** (întrebarea 3): dacă după o preîncălzire din aplicație nu pornește nicio imprimare în 30 de minute (de
    schimbat), aplicația pune țintele la 0. Merge doar cât fereastra e deschisă și legată (ghidul o spune). Dacă imprimanta se
    răcește singură după o vreme [nemăsurat pe K1C] se află în proba pe imprimanta owner-ului.
17. **Homing-ul:** cu confirmare, doar cu imprimanta liberă; al doilea pas (Z) nu mai pleacă dacă legătura a căzut între pași.
18. **În timpul imprimării,** țintele și ventilatoarele se pot schimba (ca de pe ecran); fișierul le poate schimba la loc la
    straturile următoare (o notă scurtă lângă ele o spune).

### E. Mai târziu: celelalte drivere, fiecare cu felia lui

19. Ordinea propusă: **Moonraker** întâi (cele mai multe imprimante; și 7125 al lui K1C 2025, deci probabil de probat pe
    imprimanta owner-ului), apoi **Marlin pe USB** (orice imprimantă cu USB; Web Serial, ca senderul), **OctoPrint**, **Elegoo
    SDCP**, **PrusaLink** (mai mult citire). **Bambu Lab** doar cu un pod local (browserul nu deschide MQTT peste TLS: ADR 0119),
    deci cu un ADR al lui. Fiecare vine cu cercetarea lui, imprimanta falsă a protocolului și ghidul lui.

### F. Bugetul

20. Pornirea neschimbată (fereastra vine la cerere). Ținta: cel mult +4 kB în total (contractul, comenzile, cardul nou, textele);
    lista materialelor vine din `profil.ts` (al felierului), fără să tragă felierul după ea [de măsurat].

## Felia 3.6o

- **Contractul și driverul K1** (§A): starea comună, comenzile (și cele din 3.6g, cu aceleași texte), capabilitățile, pașii;
  sesiunea peste driver; imprimantele ținute cu driverul lor.
- **Comenzile grupului 1** (§B) și **fereastra** (§C), după schiță; **siguranța** (§D), după răspunsuri.
- **Imprimanta falsă** învață comenzile noi (lumina, ventilatoarele, viteza, debitul, țintele, homing-ul în doi pași, cu
  `deviceState` 7 între ei) și refuză orice alt `gcodeCmd`.
- **Ghidul** (`docs/masina/imprimanta-k1c.md`): pașii de probă pe imprimanta owner-ului (lumina, un ventilator, preîncălzirea și
  răcirea, homing-ul, viteza și debitul pe o imprimare scurtă), cu transcrierea copiată.

## Proba

- **Pe hârtie:** `test/unit/imprimanta.driver.test.ts`: fiecare comandă pe K1, octet cu octet (și cele vechi, neschimbate);
  refuzurile (în afara intervalului, nu întreg, alt canal, homing cât imprimă); capabilitățile din stare (cu și fără maxime,
  fără `lightSw`, cu `targetBoxTemp`); pașii homing-ului cu ceasul probei (așteptarea, legătura căzută între pași); răcirea
  singură; imprimantele ținute de azi (fără driver).
- **Cap-coadă** (`test/e2e/imprimanta.spec.ts`, pe imprimanta falsă): lumina, un ventilator, viteza în timpul unei imprimări,
  preîncălzirea cu PLA și răcirea, homing-ul cu confirmarea; „n-a confirmat” la o comandă ignorată.
- **Otrăvurile:** `test/otravuri/3.6o.py`.
- **Pe imprimanta owner-ului:** ghidul, cu transcrierea rejucată pe imprimanta falsă (ca 3.6i).

## Felia 3.6o, gata (09.11.2026)

- **Contractul** (`src/machine/imprimanta/driver.ts`, pur): starea comună (cu maximele, lumina, ventilatoarele pe nume,
  viteza, debitul, axele știute, „ocupată”; ventilatoarele dintr-o bucată de stare intră peste cele știute), starea lucrării
  și ce comenzi au rost (`esteLibera`, `sePoateRegla`, `comandaPermisa`), comenzile, pașii (un text, sau o așteptare cu
  `minMs` / `maxMs`), capabilitățile, cadrul citit (cu răspunsul de menținere) și `DriverText`. Lista driverelor:
  `drivere.ts` (`creality-k1`).
- **Driverul K1** (`creality.ts`): câmpurile noi (`lightSw`, `modelFanPct` / `caseFanPct` / `auxiliaryFanPct`,
  `curFeedratePct`, `curFlowratePct`, `maxNozzleTemp`, `maxBedTemp`, `deviceState`, `autohome`), capabilitățile după ce
  spune imprimanta, fiecare comandă cu intervalul ei (un număr greșit, un ventilator necunoscut, o țintă peste maxim: nimic
  nu pleacă), homing-ul în trei pași; textele din 3.6g, neschimbate.
- **Sesiunea** (`sesiune.ts`), peste orice driver de text: `comanda` (ce are rost, driverul, pașii; o singură comandă în pași
  odată; o legătură căzută sau refăcută între pași oprește restul, cu „homing stopped” în jurnal) și răcirea singură:
  armată de o țintă caldă cu imprimanta liberă, termenul la 30 de minute (setarea, din fereastră), oprită de o imprimare
  pornită, de țintele văzute calde apoi la 0, de deconectare, de altă imprimantă sau de setare; rămâne peste o legare din
  nou (IP-ul schimbat), iar la termen, cu legătura căzută, pleacă la primul cadru de după; în jurnal, „auto-cool after N
  min” și „auto-cool off: …”.
- **Imprimantele ținute** (`tinute.ts`): câmpul `driver` în lista `v: 1` (fără el, `creality-k1`; unul necunoscut se sare);
  proba și căutarea, pe portul, citirea și răspunsurile driverului.
- **Fereastra**, după schiță: viteza și debitul în cardul lucrării (cât imprimă sau stă în pauză), țintele scrise direct,
  Preîncălzește (primul strat al materialelor felierului, tăiat la maxim) și Răcește, banda „Încălzește”, răcirea singură
  (`cncvs2.imprimanta.racire`, `v: 1`; implicit pornită, la 30 de minute), cardul Ventilatoarele și lumina, homing-ul cu bifa
  „Patul e gol”; o valoare cerută rămâne „în așteptare” până o raportează imprimanta (după 6 s, „n-a confirmat”). Cardurile
  și butoanele, după capabilități (și fișierele, și trimiterea).
- **Găsit pe drum:** (1) șase ținte ale listei de otrăvuri 3.6g s-au mutat odată cu codul (starea lucrării în contract,
  sesiunea și proba peste driver): lista e refăcută pe codul nou; (2) imediat după o legare din nou, țintele sunt încă
  nespuse: răcirea nu le mai ia drept „răcite”; (3) proba manualului cere `data-imprimanta` scris la vedere la fiecare
  control: glisoarele și câmpurile primesc proprietățile dintr-un hook, iar atributul rămâne pe fiecare intrare.
- **Măsurat și probat:** totalul 573,1 / 600 kB (+5,8, peste ținta de +4 din §F: bucata ferestrei, adusă la cerere, are +8,0,
  din care 2,0 e lista materialelor, mutată din bucata „Din desen…”, care scade cu 2,0), pornirea 102,0 (neschimbată). Probe
  noi: `imprimanta.driver.test.ts`, sesiunea (pașii homing-ului cu ceasul probei, răcirea singură), imprimantele ținute, două
  e2e (imprimanta liberă; cât imprimă, cu o comandă fără răspuns). Otrăvurile `test/otravuri/3.6o.py`: 59 / 59 din prima (46
  pe probele unitare, 13 prin e2e, fiecare de proba ei), plus cele șase refăcute din 3.6g. Porțile: unit 8 751 (8 743
  trecute, 0 căderi, 8 sărite); build-ul determinist (288 de fișiere identice); e2e 381 / 381 (378 din prima; proba 3.6k,
  instabilă și înainte de 3.6o, și cele două de după ea, trecute la reluare). Privită în browser, pe două imprimante false:
  cât imprimă (viteza la 120 %), liberă (Preîncălzește PLA, banda, ora răcirii, homing-ul cu axele X, Y, Z), pe telefon
  (375 px) și în ambele teme.

## Întrebările (owner)

**Răspunsurile, din 08.11:** „Da, recomandările”: 1a (fereastra ca în planșe), 2a (ventilatoarele prin `gcodeCmd`, cu textul
făcut doar de aplicație), 3a (răcirea singură, pornită, la 30 de minute).

1. **Schița ferestrei** (linkul din mesaj): a) așa (recomandat: comenzile lângă ce schimbă, §C.12); b) altfel (spune unde).
2. **Ventilatoarele pe K1,** prin `gcodeCmd`, cu textul făcut doar de aplicație (`M106 P0–2 S0–255`), fără consolă: a) da
   (recomandat: e singurul drum al protocolului, folosit și de Home Assistant); b) nu (K1 fără ventilatoare în aplicație).
3. **Răcirea singură,** după o preîncălzire fără imprimare (singura comandă fără clic; doar coboară țintele la 0; doar cât
   fereastra e deschisă): a) da, pornită, la 30 de minute (recomandat); b) da, dar oprită până o pornești; c) nu.

## Ce am respins

- **O fereastră pentru fiecare imprimantă:** aceleași carduri, scrise de mai multe ori; diferențele stau în capabilități.
- **Consola de G-code** (ADR 0190 §C.8, neschimbat): o comandă scrisă de mână ocolește intervalele și confirmările.
- **Deplasarea capului (jog-ul) și extrudarea de mână:** nu țin de grupul 1; cer confirmările și limitele lor.
- **Treptele vitezei de pe acum:** fără un driver care să le folosească, n-ar avea probă.

## Se redeschide dacă

- K1 refuză o comandă de aici (proba pe imprimanta owner-ului) sau un firmware nou îi schimbă numele;
- owner-ul vrea consola sau jog-ul;
- driverul Moonraker cere alt contract (de exemplu, ventilatoare și lumini după nume, alese de om).

## Sursele

- Integrarea Home Assistant `ha_creality_ws` (lumina, ventilatoarele, viteza, debitul, țintele, homing-ul; K1 fără încălzitor
  de carcasă): <https://github.com/3dg1luk43/ha_creality_ws>
- OctoPrint, API-ul imprimantei: <https://docs.octoprint.org/en/master/api/printer.html>
- Moonraker, API-ul imprimantei (`printer.objects.subscribe`, `printer.gcode.script`):
  <https://moonraker.readthedocs.io/en/latest/external_api/printer/>
- Klipper, obiectele stării (`gcode_move`, `fan`, `toolhead`): <https://www.klipper3d.org/Status_Reference.html>
- PrusaLink în Home Assistant (citirile): <https://www.home-assistant.io/integrations/prusalink/>; temperaturile, pe un drum
  nedocumentat: <https://forum.prusa3d.com/forum/general-discussion-user-experience-ideas/rest-command-to-set-tool0-temperature/>
- Elegoo Centauri Carbon, SDCP: <https://suchmememanyskill.github.io/OpenCentauri/software/api> (pagina nu mai răspundea pe
  08.11), <https://glama.ai/mcp/servers/bjan/pycentauri>
- Marlin, comenzile G-code: <https://marlinfw.org/meta/gcode/>
