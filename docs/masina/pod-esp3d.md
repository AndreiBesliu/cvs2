# Podul ESP3D: GRBL-ul mașinii prin WiFi

Ghidul montajului din ADR 0119 (secțiunea „Podul ESP3D”). Un ESP32 cu **ESP3D 3.0.2** stă între aplicație și GRBL 1.1h-ul
de pe Arduino: primește programul prin WiFi (un WebSocket, pe portul 8282) și îl dă mai departe pe serial, octet cu octet.
Imaginea pentru ESP32 o compilează workflow-ul `pod-esp3d` al repo-ului, pe mașinile GitHub: pe calculatorul tău nu se
instalează nimic pentru compilare.

## Ce îți trebuie

- **Un ESP32 DevKit cu modulul ESP32-WROOM-32**: ESP32-ul clasic, cu 4 MB de flash (nu S2, S3 sau C3). Un modul WROVER (cu
  PSRAM) ține GPIO16 și GPIO17 pentru memorie: spune-mi și schimb pinii, e un rând în `scripts/pod-esp3d.ts`.
- **Două rezistențe, de 1 kΩ și de 2 kΩ** (merge și 2,2 kΩ), pentru divizorul de tensiune. Sau un modul de conversie a
  nivelului, 5 V ↔ 3,3 V.
- Fire dupont și un încărcător USB de 5 V pentru ESP32. Dacă Arduino-ul se alimentează de obicei din PC, încă un încărcător,
  pentru el.
- Chrome sau Edge pe PC: scrierea imaginii merge prin Web Serial.

## 1. Imaginea

Pe GitHub: **Actions → pod-esp3d → ultima rulare verde → Artifacts → `pod-esp3d-3.0.2`** (un zip). Înăuntru:

- `pod-esp3d-3.0.2.bin`: imaginea unică, scrisă de la adresa 0x0;
- `configurare.diff`: ce s-a schimbat în sursa ESP3D (ESP3D e GPL-3.0, iar sursa imaginii e commit-ul ei plus diff-ul);
- `CITESTE.txt` și `SHA256SUMS`: de unde vine imaginea și amprentele.

Imaginea verificată pe 02.11: [rularea 41404105524](https://github.com/AndreiBesliu/cvs2/actions/runs/41404105524), cu
[artefactul](https://github.com/AndreiBesliu/cvs2/actions/runs/41404105524/artifacts/13123205136) (cere login pe GitHub).
Imaginea are 1 397 200 de octeți, cu SHA-256
`0a0208fb6d4ee0b8ed7100901d0e3386bdb204bc63f2d4cb3f125d87ed1c8800`. Artefactul se păstrează până pe 31.01.2027. După
aceea, **Run workflow** pe `pod-esp3d` face altul, cu amprenta lui.

Față de ESP3D 3.0.2 neschimbat, imaginea are trei rânduri altfel în `configuration.h`:

- **ținta implicită e GRBL.** Cu alta, `?`, `!` și `~` stau în pod până la capătul liniei, deci oprirea nu mai e imediată;
- **GRBL e pe Serial2**, cu RX pe GPIO16 și TX pe GPIO17, la 115 200 baud. Serial0 e al USB-ului și al mesajelor de pornire,
  care altfel ar ajunge la GRBL la fiecare repornire a podului;
- **socket-ul de date e compilat** (`WS_DATA_FEATURE`), pe portul 8282.

Rețeaua atelierului nu e în imagine: o pui la pasul 3.

## 2. Scrierea pe ESP32 (o dată)

ESP32-ul e legat doar la PC, prin USB (încă nu la Arduino).

1. Deschide <https://espressif.github.io/esptool-js/> în Chrome sau Edge.
2. **Connect** și alege portul ESP32-ului (CP210x sau CH340). Dacă portul nu apare, instalează driverul cipului de lângă mufa
   USB. Dacă nu se conectează, ține apăsat **BOOT** cât apeși Connect.
3. **Erase Flash**: șterge și setările vechi, dacă placa a mai avut ceva.
4. Schimbă Flash Address în `0x0` (implicit e 0x1000), alege fișierul `pod-esp3d-3.0.2.bin`, apoi **Program**.
5. La final, apasă **EN** (sau **RST**) pe placă.

## 3. Rețeaua atelierului (o dată)

După pornire, podul își face rețeaua lui, **ESP3D**, cu parola `12345678`.

1. Leagă telefonul sau laptopul la rețeaua ESP3D și deschide <http://192.168.0.1>.
2. Dă click pe bara **Terminal**, ca să se deschidă (pornește închisă). Scrie pe rând și trimite cu **Send**:
   1. `[ESP800]`: răspunsul are versiunea `3.0.2` și ținta (`FWTarget`) `grbl`;
   2. `[ESP106]<o parolă a ta, de cel puțin 8 caractere>`: parola rețelei ESP3D. Podul se întoarce în ea dacă nu găsește
      rețeaua atelierului, iar parola implicită e publică;
   3. `[ESP100]<numele rețelei atelierului>`;
   4. `[ESP101]<parola rețelei atelierului>`;
   5. `[ESP110]WIFI-STA`;
   6. `[ESP444]RESTART`.

   Un spațiu din nume sau din parolă se scrie cu `\` în față: `Atelier\ Costel`.
3. Podul repornește în rețeaua atelierului, iar rețeaua ESP3D dispare. Dacă nu se poate lega, se întoarce în ESP3D (acum cu
   parola ta): reia de la comanda 3 (`[ESP100]`).
4. **Adresa podului** e în lista de clienți a routerului, cu numele `esp3d`. Pune-i în router o adresă rezervată, ca să nu
   se schimbe. De obicei merge și numele `esp3d.local`.

Parolele le scrii doar în pagina podului: nu în aplicație, nu în repo, nu în chat.

## 4. Firele (cu totul oprit)

| ESP32 | Arduino | Cum |
|---|---|---|
| GPIO17 (TX2) | D0 (RX) | direct: cei 3,3 V ajung pentru Arduino |
| GPIO16 (RX2) | D1 (TX) | prin divizor: D1 → 1 kΩ → GPIO16, și GPIO16 → 2 kΩ → GND |
| GND | GND | masa comună |

Divizorul coboară cei 5 V ai Arduino-ului la 3,3 V. Fără el, GPIO16 se poate strica.

**Alimentarea:** ESP32-ul din încărcătorul lui, prin USB. Arduino-ul ca de obicei, dar **nu din PC**: cu PC-ul legat la
USB-ul Arduino-ului, cipul USB și ESP32-ul vorbesc amândoi pe D0. Un încărcător USB în aceeași mufă e bun, fiindcă dă doar
curent.

## 5. În aplicație

În panoul mașinii: **Conectează (WiFi)** → controlerul **Pod ESP3D (GRBL)** → adresa podului → portul **8282** →
**Conectează**. Prima dată, browserul cere voie pentru rețeaua locală: **Permite**.

Panoul arată starea mașinii (Idle sau Alarm), ca pe USB. O diferență: pe WiFi, Arduino-ul nu se resetează la conectare (pe
USB, deschiderea portului îl reseta), deci mașina rămâne în starea în care era.

## De știut

- **Nu pune ESP3D 3.1**, versiunea stabilă mai nouă. Socket-ul ei de date are alt subprotocol, iar cadrele binare sunt
  transfer de fișiere: aplicația nu lucrează cu el.
- **Nu schimba ținta podului** (Target firmware) de pe GRBL: cu alta, `?`, `!` și `~` așteaptă capătul liniei.
- **Oricine din rețeaua atelierului poate comanda mașina prin pod**, fiindcă podul nu cere parolă pentru comenzi. Ține-l
  într-o rețea doar a ta; un router separat pentru atelier e cel mai sigur.

## Cum e făcută imaginea

Workflow-ul `pod-esp3d` (pornit de mână) ia sursa ESP3D de la commit-ul tag-ului v3.0.2. Apoi
`scripts/pod-esp3d.ts configureaza`:

- verifică întâi faptele din sursă de care depinde profilul aplicației: subprotocolul `arduino`, cadrele binare care pleacă
  la GRBL, portul 8282, 115 200 baud, timpul real doar cu ținta GRBL. O sursă schimbată, ca 3.1, e refuzată;
- schimbă cele trei rânduri din `configuration.h`, fiecare găsit exact o dată;
- adaugă o unitate de probă: compilarea pică dacă configurarea efectivă, după toate includerile, nu e cea de mai sus.

Compilarea folosește PlatformIO 6.2.0, mediul `esp32dev` (pioarduino 51.03.04, Arduino core 3.0.4). `esptool merge_bin`
pune bucățile la adresele lor (DIO, 40 MHz, 4 MB). `scripts/pod-esp3d.ts verifica` le reverifică:

- fiecare bucată stă la adresa ei din metadatele PlatformIO;
- aplicația stă în partiția `ota_0`, adresa de unde o pornește bootloader-ul;
- bootloader-ul și aplicația sunt valide (suma de control, amprenta).

esptool le validează și el, separat.

Nedovedit până la 3.6e: pornirea pe placa ta și drumul până la GRBL.
