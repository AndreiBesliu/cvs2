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

## Când nu merge

- **„Nu răspunde nimic la …”**: imprimanta e oprită, are alt IP sau calculatorul nu e în rețeaua ei (vezi `ping`).
- **„Browserul n-are voie să ajungă la rețeaua locală”**: ai apăsat Blochează la întrebarea browserului. Iconița din stânga
  adresei → setările site-ului → **Acces la rețeaua locală** → Permite, apoi Conectează din nou.
- **„La … răspunde ceva, dar nu ca o imprimantă Creality”**: pe portul 9999 al adresei aceleia stă altceva.
- **Legătura se pierde des:** semnalul WiFi la imprimantă. Imprimanta continuă oricum; fereastra se leagă singură din nou.
- **„Fișierul n-a plecat”**: imprimanta nu răspunde pe portul 80 sau browserul a oprit cererea. Dacă starea merge (9999), dar
  trimiterea nu, trimite-mi textul jurnalului și ce scrie în consola browserului (F12 → Console): e unul din lucrurile
  nemăsurate încă (de mai jos).
- **„Fișierul a plecat, dar nu apare în lista imprimantei”**: poate n-a ajuns întreg (WiFi slab). **Încearcă din nou** sau
  trimite-l din Creality Print.

## De știut

- **O legătură căzută nu oprește imprimarea:** fișierul e în memoria imprimantei. Oprirea de urgență rămâne **ecranul
  imprimantei** (și întrerupătorul ei).
- Singură, fereastra doar citește starea și răspunde `ok` la bătăile inimii imprimantei; orice comandă pleacă dintr-un clic.
  Temperaturile doar se citesc: aplicația nu încălzește nimic.
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
    `{"opGcodeFile":"printprt:/usr/data/printer_data/gcodes/<nume>"}` (după ea, K1 închide legătura).
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
  oprirea pe o imprimare reală, marginile reale ale patului (unde își face linia de curățare a duzei).
