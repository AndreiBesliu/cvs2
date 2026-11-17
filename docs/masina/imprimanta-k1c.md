# Imprimanta Creality K1C în cvs2, prin WiFi

Ghidul din ADR 0190 (feliile 3.6g și 3.6h). Fereastra **Imprimanta** a aplicației vorbește cu o imprimantă Creality din familia
K1 (K1C, K1C 2025, K1, K1 Max, K1 SE) pe protocolul ei din fabrică: un WebSocket pe portul **9999**, același pe care îl folosesc
Creality Print și OrcaSlicer, iar fișierele urcă pe HTTP, pe portul **80**. Nu cere root și nicio setare pe imprimantă: starea,
temperaturile, **Pauză / Reia / Oprește**, pornirea fișierelor din imprimantă (3.6g) și trimiterea unui `.gcode` de pe calculator
(3.6h).

## Ce îți trebuie

- Imprimanta pornită, în rețeaua WiFi a atelierului (o vezi pe ecranul ei: **Setări → Rețea**, cu IP-ul).
- Calculatorul în **aceeași rețea**, prin cablu sau WiFi, nu într-o rețea de oaspeți: multe routere despart rețeaua de oaspeți
  (și uneori WiFi-ul de cablu, „AP isolation”), iar atunci calculatorul nu vede imprimanta deloc.
- Chrome sau Edge pe calculator (de la versiunea 147).

## 1. IP-ul imprimantei

Pe ecranul imprimantei: **Setări → Rețea**. Scrie-ți IP-ul (de exemplu 192.168.1.12). Ca să nu se schimbe după o repornire a
routerului, pune-i în router o adresă rezervată (în lista de clienți, numele ei e de felul „K1C-8578”). La tine s-a schimbat
deja: pe 07.11 era la 192.168.1.10, nu la .12.

Proba rapidă, de pe calculator: în Windows, `ping 192.168.1.12` (în PowerShell sau în Command Prompt). Dacă nu răspunde, aplicația
nu va ajunge nici ea la imprimantă: verifică întâi rețeaua (pasul „Ce îți trebuie”).

## 2. În aplicație

1. Fila **Imprimanta** (lângă Proiectare și Mașina).
2. **Adresa imprimantei**: IP-ul de la pasul 1, apoi **Conectează**.
3. Prima dată, browserul întreabă dacă pagina poate ajunge la dispozitivele din rețeaua locală: **Permite**.
4. În câteva secunde apare banda imprimantei: starea (Liberă, Imprimă, Pauză…), numele, adresa și firmware-ul.

Imprimanta rămâne în listă: data viitoare o alegi de acolo, cu **Conectează**. Dacă IP-ul s-a schimbat, **Caută în toată
rețeaua** încearcă portul 9999 pe toate adresele rețelei (cam un minut).

## 3. Trimiterea unui fișier

1. Feliază piesa în Creality Print sau OrcaSlicer, cu profilul imprimantei tale (K1C), și salvează `.gcode`-ul pe calculator.
2. Sub lista fișierelor: **Trimite un fișier…**, apoi alege-l.
3. Fereastra îl verifică pe calculator, înainte să plece: pentru ce imprimantă a fost feliat, duza, materialul, temperaturile,
   timpul și miniatura, apoi dacă toate mișcările încap în pat (220 × 220 × 250 mm la K1C). Fără probleme: **Trimite**. O
   mișcare în afara patului (cu linia ei, de felul lui CC5000) sau un fișier feliat pentru altă imprimantă dau un avertisment,
   iar butonul devine **Trimite oricum**.
4. După trimitere, fereastra îl caută în lista imprimantei: „Ajuns în imprimantă”, apoi **Pornește imprimarea…** (cu bifa
   **Patul e gol**) sau **Închide**.

Numele pierde spațiile (ca în OrcaSlicer), iar un fișier care e deja în imprimantă nu se înlocuiește: cel nou primește „-2” la
nume.

## 4. Proba (felia 3.6i)

1. Cu imprimanta liberă: banda spune „Liberă”, iar **În imprimantă** arată fișierele ei (cele trimise din Creality Print sau
   OrcaSlicer).
2. Trimite un cub de calibrare feliat pentru K1C (pasul 3): în fereastra de verificare apar ✓ și „Toate mișcările încap în
   patul…”. Dacă apare totuși un avertisment pentru un fișier feliat chiar pentru K1C, trimite-mi linia din el: așa aflăm unde
   își face K1C linia de curățare a duzei.
3. Pornește-l: **Pornește imprimarea…**, bifa **Patul e gol**, **Pornește imprimarea**. Imprimanta închide legătura imediat
   după pornire, ca toate K1; fereastra se leagă singură din nou în câteva secunde.
4. Cât imprimă: **Pauză**, apoi **Reia**. Temperaturile duzei și ale patului urcă la țintele lor.
5. Dacă vrei: **Oprește…** → **Oprește imprimarea** (imprimarea nu se mai poate relua).
6. **Jurnalul cadrelor** → **Copiază jurnalul**, și lipește-l în conversație: e transcrierea pe care o rejucăm pe imprimanta
   falsă din probe.

## 5. Comenzile din timpul imprimării (felia 3.6o)

Pe imprimanta ta, cu imprimanta liberă și fără nimic pe pat, apoi pe o imprimare scurtă:

1. **Lumina:** comutatorul din cardul **Ventilatoarele și lumina**; lumina din imprimantă se stinge și se aprinde, iar
   fereastra arată starea nouă fără „imprimanta n-a confirmat”.
2. **Un ventilator:** al piesei la 30 %, din câmp, apoi la 0 %. Ar trebui să-l auzi pornind; fereastra arată 30 %.
3. **Preîncălzește → PLA:** țintele duzei și patului devin 220 și 55 °C, iar banda spune **Încălzește**. Apoi **Răcește**
   (din bandă): țintele revin la 0.
4. **Răcirea singură:** preîncălzește din nou, schimbă minutele la 2 și așteaptă, cu fereastra deschisă: după 2 minute,
   țintele revin singure la 0, iar fereastra spune ora. Pune minutele înapoi la 30. Dacă vrei să știm și ce face imprimanta
   singură: preîncălzește cu bifa scoasă și lasă fereastra deschisă 15 minute; jurnalul arată dacă imprimanta își coboară
   singură țintele (nemăsurat pe K1C).
5. **Homing (X, Y, Z):** cu patul gol, bifa **Patul e gol**, apoi **Homing**: capul merge pe X și Y, apoi duza coboară spre
   pat, pentru Z; la final, fereastra spune „Axele știute: X, Y, Z”. Uită-te unde coboară duza la Z (mijlocul patului?):
   spune-mi, ca ghidul să știe ce înseamnă „patul gol”.
6. **Viteza și debitul**, pe o imprimare scurtă (cubul de la pasul 4 al probei de mai sus): viteza la 120 %, apoi **100 %**;
   debitul la 95 %, apoi **100 %**. Ecranul imprimantei arată aceleași valori.
7. **Jurnalul cadrelor** → **Copiază jurnalul**, și lipește-l în conversație: comenzile și răspunsurile imprimantei intră în
   imprimanta falsă din probe.

## 6. Pauza la un strat (felia 3.6p)

Cu placa de probă din „Din desen…” (40 × 20 × 3 mm, PLA 0,20: 15 straturi), pe patul gol:

1. Mută glisorul **Stratul** pe 9 și apasă **Pauză înaintea acestui strat**: fereastra spune că imprimanta se oprește după
   stratul 8, la 1,6 mm. Scrie o notă (de exemplu „probă”), apoi **Trimite la imprimantă**: dialogul spune pauza din
   fișier, iar la pornire o spune din nou, lângă bifa **Patul e gol**.
2. Pornește imprimarea și uită-te la stratul 9: imprimanta ar trebui să se oprească singură, iar fereastra să arate
   **Pauză**. Spune-mi unde a parcat capul (în spate, într-o parte, sus?) și dacă duza rămâne caldă (temperatura din
   fereastră); lasă-o în pauză cam 2 minute.
3. Apasă **Reia** în fereastră: imprimarea continuă de unde a rămas, iar piesa nu are o treaptă sau o dungă la 1,6 mm.
4. **Jurnalul cadrelor** → **Copiază jurnalul**, și lipește-l în conversație: cu el aflăm și cum numără K1C straturile
   unui fișier al nostru (`layer`) și filamentul folosit, pentru placa din felia 3.6q.

## 7. Placa (felia 3.6q)

Pe aceeași imprimare (placa de probă trimisă din „Din desen…”), în cardul **Lucrarea**:

1. **Placa** apare cât imprimă: piesa ta, văzută de sus, cu stratul de acum (portocaliu) și duza (un punct alb). Spune-mi
   dacă punctul duzei stă pe piesă și se mută la ~3 s.
2. **„Stratul N / 15”** de deasupra plăcii: compară-l cu ecranul imprimantei de câteva ori. Lângă el scrie de unde vine
   („după imprimantă” sau „după filamentul folosit”); dacă vezi un număr care sare (de exemplu 3, apoi 8), spune-mi.
3. La pauza de la pasul 6, placa spune „Pauza din fișier, înaintea stratului 9” și nota ta.
4. **Copiază jurnalul** la final: cadrele cu `layer`, `curPosition`, `usedMaterialLength` și piesele (`objects`) intră în
   imprimanta falsă din probe.

## 8. Anularea unei piese (felia 3.6r)

Cu trei piese mici pe pat (în „Din desen…”: trei dreptunghiuri, **Piesele foii**), trimise și pornite din cvs2. O piesă
anulată rămâne neterminată: folosește o probă de care nu-ți pare rău.

1. Cât imprimă, în **Piesele** de sub placă: **Anulează…** lângă o piesă la care imprimanta **nu** lucrează acum →
   **Anulează piesa**. În câteva secunde, rândul ei arată „anulată”, iar pe placă e tăiată. Uită-te la stratul următor:
   imprimanta n-o mai face, iar celelalte merg mai departe.
2. Dacă rândul spune „imprimanta n-a confirmat”, K1C n-a primit comanda prin `gcodeCmd`: copiază jurnalul și lipește-l
   în conversație; până atunci, anularea rămâne pe ecranul imprimantei.
3. **Anulează…** lângă piesa care „se imprimă acum”: rândul ei arată „→ se anulează când imprimanta trece la altă piesă”.
   Spune-mi dacă devine „anulată” după ce imprimanta o termină pe stratul de acum. A treia piesă, rămasă singură, n-are
   buton: pentru ea, Oprește.
4. **Copiază jurnalul** la final: cadrele cu `excluded_objects` și `current_object` ne spun ce trimite K1C când anulează.

## 9. Notificările (felia 3.6s)

Pe o imprimare scurtă (placa de probă de la pasul 6, cu pauza ei), cu cvs2 deschis:

1. În cardul **Notificările**, din fereastra Imprimanta: **Pornește notificările**, apoi permite-le în browser. Lasă
   bifele cum sunt.
2. Treci în **Proiectare**: pe butonul **Imprimanta** din bara de sus apar un punct verde și procentul, iar titlul filei
   începe cu procentul.
3. Ascunde cvs2 (alt program în față). La pauza din fișier ar trebui să vină o notificare a sistemului, cu nota ta, iar la
   final încă una. Spune-mi dacă au venit și cât au întârziat față de imprimantă.
4. Dacă vrei să încerci și senzorul: scoate filamentul cât imprimă. Ar trebui să vină „s-a terminat filamentul”, iar
   imprimanta să stea în pauză. Spune-mi ce a arătat ecranul ei.
5. **Copiază jurnalul** la final: cadrele cu `state` și `materialStatus` ne spun cum anunță K1C finalul și filamentul.

## 10. Istoricul (felia 3.6t)

După o imprimare scurtă din „Din desen…” (placa de probă de la pasul 6), cu fereastra Imprimanta deschisă la final:

1. În cardul **Istoricul**, rândul de sus are numele piesei din cvs2, „✓ gata”, durata față de estimare și filamentul.
   Spune-mi cifrele: le compar cu ce arată imprimanta pe ecranul ei, la istoric.
2. Mai jos apar și imprimările vechi ale imprimantei (cele din Creality Print sau de pe ecran), cu materialul ghicit
   din numele fișierului. Spune-mi dacă vreuna lipsește sau apare de două ori.
3. Pune **Prețul pe kg** al filamentului tău (PLA): costul apare pe fiecare rând și în totalul lunii. Dacă vrei și
   curentul, pune **Puterea medie** (W; pentru K1C, în jur de 150 W cât imprimă PLA) și **Prețul kWh**.
4. **Exportă CSV** și deschide fișierul în Excel: coloanele trebuie să fie separate, cu virgula zecimală.
5. După trei imprimări din „Din desen…” cu același material, „Din desen…” arată estimarea învățată („~21m după 3
   imprimări pe K1C-8578 (feliatorul: 18m)”). Spune-mi cât a durat de fapt următoarea, față de ea.
6. **Copiază jurnalul** la final: cadrul cu `historyList` ne spune ce înseamnă `startway` și ce mai cuprinde `totaltime`.

## Când nu merge

- **„Nu răspunde nimic la …”**: imprimanta e oprită, are alt IP sau calculatorul nu e în rețeaua ei (vezi `ping`).
- **„Browserul n-are voie să ajungă la rețeaua locală”**: ai apăsat Blochează la întrebarea browserului. Iconița din stânga
  adresei → setările site-ului → **Acces la rețeaua locală** → Permite, apoi Conectează din nou.
- **„La … răspunde ceva, dar nu ca o imprimantă Creality”**: pe portul 9999 al adresei aceleia stă altceva.
- **Legătura se pierde des:** semnalul WiFi la imprimantă. Imprimanta continuă oricum; fereastra se leagă singură din nou.
- **Fereastra rămâne pe aceeași stare sau spune „Legătura s-a pierdut” după o pornire de pe ecran:** la tine, pe 07.11,
  imprimanta și-a refăcut WiFi-ul la o pornire de pe ecran și și-a luat alt IP (.10, apoi .7), iar legătura veche a murit fără
  să se închidă. Acum fereastra observă tăcerea după 20 s și caută singură imprimanta în rețea, după numele ei. Ca să nu se
  mai întâmple deloc, **rezervă-i adresa în router** (pasul 1).
- **„Fișierul n-a plecat”**: imprimanta nu răspunde pe portul 80 sau browserul a oprit cererea. Dacă starea merge (9999), dar
  trimiterea nu, trimite-mi textul jurnalului și ce scrie în consola browserului (F12 → Console): e unul din lucrurile
  nemăsurate încă (de mai jos).
- **„Fișierul a plecat, dar nu apare în lista imprimantei”**: poate n-a ajuns întreg (WiFi slab). **Încearcă din nou** sau
  trimite-l din Creality Print.
- **„imprimanta n-a confirmat”** lângă o comandă: imprimanta n-a raportat valoarea cerută în 6 s. Încearcă încă o dată; dacă
  rămâne, trimite-mi jurnalul: poate firmware-ul tău are alt nume pentru comanda aceea.

## De știut

- **O legătură căzută nu oprește imprimarea:** fișierul e în memoria imprimantei. Oprirea de urgență rămâne **ecranul
  imprimantei** (și întrerupătorul ei).
- Singură, fereastra doar citește starea și răspunde `ok` la bătăile inimii imprimantei; orice comandă pleacă dintr-un clic.
  Singura excepție (din 3.6o): **răcirea singură**, care doar coboară țintele la 0, după o preîncălzire din aplicație fără
  imprimare, cât fereastra e deschisă și legată (implicit după 30 de minute; se oprește din bifă).
- **Încălzirea** pleacă doar la clic, în grade întregi, până la maximul spus de imprimantă (320 °C la duză, 115 °C la pat, pe
  K1C). Homing-ul merge doar cu imprimanta liberă, după bifa **Patul e gol**. Fereastra n-are consolă de G-code: pentru
  ventilatoare pleacă un `M106` scris de aplicație, nimic scris de mână.
- **Portul 9999 n-are parolă:** oricine din rețeaua atelierului poate comanda imprimanta (la fel și din Creality Print). Ține-o
  într-o rețea doar a ta.

## Protocolul, pe hârtie (pentru imprimanta falsă din probe)

Sursele: gazda „CrealityPrint” din OrcaSlicer (`src/slic3r/Utils/CrealityPrint.cpp`, la `0b1d825`, 04.11.2026) și integrarea
Home Assistant `ha_creality_ws` (capturi de pe o K1C, 25.10.2026). Imprimanta falsă: `test/e2e/imprimantaFalsa.ts`.

- `ws://<ip>:9999/`, fără subprotocol; **doar cadre text** (familia K1 nu primește cadre binare).
- Imprimanta → client:
  - bătaia inimii, periodic: `{"ModeCode":"heart_beat","msg":"…"}`; clientul răspunde `ok` (text simplu), altfel imprimanta
    închide legătura;
  - starea, pe bucăți (doar câmpurile schimbate), cu temperaturile ca text: `state` (1 imprimă, 5 pauză, 4 oprită, 7 oprirea în
    curs, 9 pornirea, 0 pregătirea), `printProgress`, `printFileName` (calea întreagă), `printJobTime`, `printLeftTime` (s),
    `layer`, `TotalLayer`, `nozzleTemp` / `targetNozzleTemp`, `bedTemp0` / `targetBedTemp0`, `boxTemp`, `err`
    (`{"errcode":N,"key":K}`, 0 = nimic), `withSelfTest`, `model`, `hostname`, `modelVersion` („printer sw ver:…”);
  - la final, K1C arată 100 % cu timp rămas, apoi 99, abia apoi încheie; numele și 100 % rămân după.
- Client → imprimantă (`{"method":…,"params":{…}}`):
  - citiri: `{"method":"get","params":{"ReqPrinterPara":1}}` (toată starea), `{"method":"get","params":{"reqGcodeFile":1}}`
    (lista: `{"retGcodeFileInfo2":[{"name","path","timeCost","material",…}]}`, sau, la K1C 2025, un text, mai jos);
  - comenzi: `{"method":"set","params":{"pause":1}}`, `{"pause":0}`, `{"stop":1}`,
    `{"opGcodeFile":"printprt:/usr/data/printer_data/gcodes/<nume>"}` (după ea, K1 închide legătura);
  - din 3.6o (integrarea Home Assistant): `{"lightSw":0|1}`; `{"gcodeCmd":"M106 P<0|1|2> S<0–255>"}` (ventilatorul piesei,
    al carcasei, cel lateral; starea: `modelFanPct`, `caseFanPct`, `auxiliaryFanPct`, %); `{"setFeedratePct":v}`,
    `{"setFlowratePct":v}` (1–200; starea: `curFeedratePct`, `curFlowratePct`); `{"nozzleTempControl":t}`,
    `{"bedTempControl":{"num":0,"val":t}}` (până la `maxNozzleTemp`, `maxBedTemp`); homing-ul: `{"autohome":"X Y"}`, apoi,
    după ce `deviceState` nu mai e 7 (cel mult 15 s), `{"autohome":"Z"}`; axele știute, în `autohome` („X:1 Y:1 Z:0”).
    Nicio K1 n-are încălzitor al carcasei, deși K1C trimite uneori `targetBoxTemp`.
- HTTP pe 80: `POST /upload/<nume codat>` (multipart, doar câmpul `file`, cu numele fișierului; fără câmpul `path`, ca
  OrcaSlicer pentru K1C), fișierul ajunge în `/usr/data/printer_data/gcodes/`; aplicația nu citește răspunsul (cererea pleacă
  `no-cors`) și caută apoi numele în lista de pe 9999. Mai e `GET /info` (`model`, `mac`), nefolosit.
- **K1C 2025** (imprimanta ta, firmware V1.0.0.26; transcrierea din 07.11, anonimizată în
  `test/fixtures/imprimanta/k1c-2025.json`):
  - **9999 primește pagina aplicației** (altă origine), după permisiunea rețelei locale;
  - **fără bătăi ale inimii:** doar bucăți de stare, la ~3 s (`{"maxBedTemp":115}`, `boxTemp`); legătura ține fără `ok`;
  - firmware-ul e în `DWIN sw ver` („V1.0.0.26.20251024S”), iar `printer sw ver` e gol;
  - lista: `{"retGcodeFileInfo":{"totalNum":N,"fileInfo":"director:nume:mărime:strat:dată:filament:miniatură;…"}}` (numele pot
    avea spații), apoi `{"historyList":[…]}` (istoricul imprimărilor) și `{"elapseVideoList":[]}`;
  - starea are și `deviceState`, `curPosition`, `powerLoss`, `tfCard`, `video`, `webrtcSupport`, `maxBedTemp`, `maxNozzleTemp`.
- Nemăsurat încă pe imprimanta ta: dacă `/upload` primește fișierul trimis de pe pagina aplicației, pornirea, pauza, reluarea și
  oprirea pe o imprimare reală, marginile reale ale patului (unde își face linia de curățare a duzei); din 3.6o, comenzile de
  la pasul 5, unde coboară duza la Z și dacă imprimanta își coboară singură țintele după o vreme.
