# Imprimanta Creality K1C în cvs2, prin WiFi

Ghidul din ADR 0190 (felia 3.6g). Fereastra **Imprimanta** a aplicației vorbește cu o imprimantă Creality din familia K1 (K1C,
K1C 2025, K1, K1 Max, K1 SE) pe protocolul ei din fabrică: un WebSocket pe portul **9999**, același pe care îl folosesc Creality
Print și OrcaSlicer. Nu cere root și nicio setare pe imprimantă. Deocamdată (3.6g): starea, temperaturile, **Pauză / Reia /
Oprește** și pornirea fișierelor aflate deja în imprimantă. Trimiterea unui `.gcode` de pe calculator vine în 3.6h.

## Ce îți trebuie

- Imprimanta pornită, în rețeaua WiFi a atelierului (o vezi pe ecranul ei: **Setări → Rețea**, cu IP-ul).
- Calculatorul în **aceeași rețea**, prin cablu sau WiFi, nu într-o rețea de oaspeți: multe routere despart rețeaua de oaspeți
  (și uneori WiFi-ul de cablu, „AP isolation”), iar atunci calculatorul nu vede imprimanta deloc.
- Chrome sau Edge pe calculator (de la versiunea 147).

## 1. IP-ul imprimantei

Pe ecranul imprimantei: **Setări → Rețea**. Scrie-ți IP-ul (de exemplu 192.168.1.12). Ca să nu se schimbe după o repornire a
routerului, pune-i în router o adresă rezervată (în lista de clienți, numele ei e de felul „K1C-8578”).

Proba rapidă, de pe calculator: în Windows, `ping 192.168.1.12` (în PowerShell sau în Command Prompt). Dacă nu răspunde, aplicația
nu va ajunge nici ea la imprimantă: verifică întâi rețeaua (pasul „Ce îți trebuie”).

## 2. În aplicație

1. Fila **Imprimanta** (lângă Proiectare și Mașina).
2. **Adresa imprimantei**: IP-ul de la pasul 1, apoi **Conectează**.
3. Prima dată, browserul întreabă dacă pagina poate ajunge la dispozitivele din rețeaua locală: **Permite**.
4. În câteva secunde apare banda imprimantei: starea (Liberă, Imprimă, Pauză…), numele, adresa și firmware-ul.

Imprimanta rămâne în listă: data viitoare o alegi de acolo, cu **Conectează**. Dacă IP-ul s-a schimbat, **Caută în toată
rețeaua** încearcă portul 9999 pe toate adresele rețelei (cam un minut).

## 3. Proba (felia 3.6i)

1. Cu imprimanta liberă: banda spune „Liberă”, iar **În imprimantă** arată fișierele ei (cele trimise din Creality Print sau
   OrcaSlicer).
2. Pornește o imprimare scurtă (un cub de calibrare): **Pornește…**, bifa **Patul e gol**, **Pornește imprimarea**. Imprimanta
   închide legătura imediat după pornire, ca toate K1; fereastra se leagă singură din nou în câteva secunde.
3. Cât imprimă: **Pauză**, apoi **Reia**. Temperaturile duzei și ale patului urcă la țintele lor.
4. Dacă vrei: **Oprește…** → **Oprește imprimarea** (imprimarea nu se mai poate relua).
5. **Jurnalul cadrelor** → **Copiază jurnalul**, și lipește-l în conversație: e transcrierea pe care o rejucăm pe imprimanta
   falsă din probe.

## Când nu merge

- **„Nu răspunde nimic la …”**: imprimanta e oprită, are alt IP sau calculatorul nu e în rețeaua ei (vezi `ping`).
- **„Browserul n-are voie să ajungă la rețeaua locală”**: ai apăsat Blochează la întrebarea browserului. Iconița din stânga
  adresei → setările site-ului → **Acces la rețeaua locală** → Permite, apoi Conectează din nou.
- **„La … răspunde ceva, dar nu ca o imprimantă Creality”**: pe portul 9999 al adresei aceleia stă altceva.
- **Legătura se pierde des:** semnalul WiFi la imprimantă. Imprimanta continuă oricum; fereastra se leagă singură din nou.

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
    (lista: `{"retGcodeFileInfo2":[{"name","path","timeCost","material",…}]}`);
  - comenzi: `{"method":"set","params":{"pause":1}}`, `{"pause":0}`, `{"stop":1}`,
    `{"opGcodeFile":"printprt:/usr/data/printer_data/gcodes/<nume>"}` (după ea, K1 închide legătura).
- HTTP pe 80 (pentru 3.6h): `GET /info` (`model`, `mac`), `POST /upload/<nume>` (multipart, câmpul `file`).
- Nemăsurat încă pe imprimanta ta: ritmul bătăilor inimii, dacă 9999 primește o pagină de pe altă origine, câmpurile exacte
  ale listei de fișiere (mărimea, data).
