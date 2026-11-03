# ADR 0119: Senderul prin WiFi (WebSocket), pregătit și pentru imprimantele 3D

**Starea:** acceptat pe 01.11.2026 pentru felia 3.6d. A pornit din cererea owner-ului din aceeași zi („O sa vreau imediat dupa
felia asta sa facem senderul sa se poata conecta pri wifi la masina. Si am de gand sa folosim asta si pentru imprimante 3D”) și
din „Da, WiFi”. Răspunsurile owner-ului:
- „Da”, la „Pornesc senderul prin WiFi (felia 3.6d) cu implicitele recomandate?”: programele pe flux (2a) și tableta într-o
  felie separată (3a);
- „si da, la ultima intrebare”, la „Adaug în CSP schema `ws:`?”.

Tot pe 01.11, la întrebarea 1, owner-ul a ales „Pod ESP3D”: podul ESP3D pe GRBL 1.1h-ul de azi (secțiunea „Podul ESP3D”).
Pe 02.11, la „Îți pregătesc configurarea ESP3D (fișierul și pașii de compilare)?”, a răspuns „Da, pregătește”: imaginea
podului și ghidul montajului (aceeași secțiune).
Pe 03.11, la întrebarea 4, owner-ul a răspuns „Am o imprimanta 3d pe care vreau sa o folosim din cvs2 prin wifi”, cu o captură
din aplicația Creality: imprimanta e o **Creality K1C**, cu firmware-ul Creality pe Klipper (secțiunea E, §14).
**Completează:** ADR 0020 (T20, sesiunea Web Serial), ADR 0079 (emulatorul GRBL), ADR 0080 (fluxul) și ADR 0081 (panoul
mașinii, transportul). **Schimbă, în feliile imprimantelor:** `BRIEF.md` §12 („Senderul lucrează doar cu familia GRBL”).

**Problema.** Azi, senderul vorbește cu mașina doar prin cablul USB (Web Serial, ADR 0081), deci calculatorul stă lângă mașină.
Owner-ul vrea legătura prin WiFi și, mai târziu, aceeași cale pentru imprimante 3D. Mașina lui (COSTEL, 800 × 1200 × 200) are
GRBL 1.1h, cu care senderul ediției întâi a tăiat o piesă pe 09.08.2026. Un GRBL 1.1h stă de obicei pe un Arduino, fără WiFi.

**Ce poate un browser (cercetarea din 01.11, sursele la final):**
- **Nu deschide conexiuni TCP** (Telnet). Spre un dispozitiv din rețea, o pagină are WebSocket, `fetch` și WebTransport.
- **Aplicația e servită pe HTTPS**, iar un `ws://` spre rețeaua locală e conținut mixt.
  - **Din Chrome și Edge 147 (aprilie 2026),** accesul la rețeaua locală (Local Network Access) cere o permisiune a omului și,
    odată dată, scutește de blocare un `ws://` spre un IP privat scris ca atare (`ws://192.168.1.50:81`) sau spre un nume
    `.local` (mDNS).
  - Verificarea se face pe adresă, înainte de DNS: un nume obișnuit care duce tot la un IP privat rămâne blocat și cere `wss://`.
  - Firefox și Safari n-au dat niciun semnal: acolo, un `ws://` din HTTPS rămâne blocat. Web Serial lipsește oricum acolo.
- **Controlerele familiei GRBL cu rețea:**
  - **FluidNC** (ESP32): WebSocket pe portul web + 1 (implicit 81).
    - Ieșirea vine în cadre binare, mesajele de control în cadre text (`CURRENT_ID:` / `currentID:`, `PING:`).
    - Intrarea, text sau binar, merge în canalul clientului, cu caracterele de timp real deosebite; fiecare client are canalul
      lui.
    - WebUI v3 folosește portul 82, cu un singur client odată.
  - **grblHAL**, cu modulul de rețea: WebSocket pe portul din `$307` (implicit 81) și Telnet. Un singur flux are controlul
    deplin, ceilalți trimit doar comenzi de timp real.
  - **GRBL 1.1 clasic** (Arduino): fără rețea. Merge prin podul ESP3D, un ESP32 legat la portul serial: un WebSocket de date
    (subprotocolul `arduino`, portul din setările lui) duce G-code-ul și răspunsurile. LaserGRBL numără caracterele și prin
    WebSocket.
- **Imprimantele 3D:**
  - Marlin vorbește pe serial altfel decât GRBL: `ok` pe fiecare linie, numerele de linie cu suma de control, `Resend: N`,
    `busy: processing`, temperaturile.
  - Klipper, prin Moonraker: JSON-RPC pe WebSocket (`ws://<gazdă>:7125/websocket`), cu originea aplicației în `cors_domains` și
    o cheie API sau o rețea de încredere.
  - OctoPrint: REST pe HTTP, cu cheia API în `X-Api-Key` și CORS pornit (`allowCrossOrigin`, oprit din fabrică).
  - Bambu Lab vorbește MQTT peste TLS, la care un browser nu ajunge.

## Decizia

### A. Transportul

1. **Un transport nou, `retea`,** lângă `serial` și `simulat` (`src/machine/retea.ts`, interfața `Transport` din ADR 0081): un
   WebSocket spre `ws://<adresa>:<port>[/cale]`, cu `binaryType = 'arraybuffer'`.
   - Cadrele primite, text sau binare, devin octeți pentru sesiune; mesajele de control ale controlerului se scot înainte,
     după profil.
   - Cadrele trimise pleacă binare; fiecare comandă de timp real (`?`, `!`, `~`, Ctrl-X, 0x85) are cadrul ei.
2. **Fluxul nu se schimbă** (ADR 0080): numărarea caracterelor, cu bufferul de 128 de octeți. E prudent: canalele de rețea ale
   FluidNC și grblHAL țin mai mult, iar la podul ESP3D bufferul GRBL-ului din spate e chiar 128.
   - Închiderea WebSocket-ului (WiFi-ul căzut, controlerul repornit) e portul pierdut: regula 4 a fluxului (bufferul nu se mai
     știe, punctul de reluare).
3. **Profilurile controlerelor, ca date** (lângă contractele postului, ADR 0083): FluidNC (portul 81, mesajele de control de
   scos), grblHAL (portul din `$307`), podul ESP3D (portul WebSocket-ului de date, subprotocolul `arduino`). Doar familia GRBL
   (`BRIEF.md` §12); familia o confirmă bannerul, ca acum.

### B. Browserul și adresa

4. **Doar Chrome și Edge pe desktop, de la 147,** ca Web Serial. Prima conectare cere permisiunea „dispozitivele din rețeaua
   locală”. Refuzată, panoul spune unde se schimbă (setările site-ului) și nu încearcă din nou.
5. **Adresa:** un IP privat (10/8, 172.16/12, 192.168/16, IPv6 local) sau un nume `.local`, cu portul.
   - Altceva se refuză înainte de conectare, cu motivul: browserul ar bloca un `ws://` spre un nume obișnuit.
   - `wss://` merge spre orice nume, dacă un controler îl are (azi niciunul).
6. **(owner) Tableta:** cu WiFi, panoul mașinii poate merge și pe Android (Chrome 147, unde Web Serial lipsește). Recomandarea:
   întâi pe desktop; tableta, cu aranjamentul ei, într-o felie separată.

### C. Panoul mașinii

7. **„Conectează” oferă USB sau WiFi.** WiFi cere profilul controlerului și adresa, ținute în browser pentru mașină (ca `$$`-ul
   lipit, ADR 0046); jurnalul și starea conexiunii spun transportul.
8. **WiFi-ul căzut în timpul programului e ca un cablu scos:** controlerul termină ce are în buffer și se oprește, iar senderul
   nu mai poate trimite oprirea. Înainte de pornirea unui program prin WiFi, panoul spune asta o dată pe sesiune; oprirea de
   urgență a mașinii rămâne cea fizică.
9. **(owner) Programele lungi:** recomandarea e trimiterea pe flux, ca pe USB (același cod, probat pe emulator). Urcarea
   programului pe cardul controlerului și pornirea de acolo (FluidNC, ESP3D), care nu mai depinde de WiFi după urcare, rămâne
   o felie separată, după măsurătorile din atelier.

### D. Proba

10. **Pe hârtie:** cadrele tăiate în linii, mesajele de control scoase, adresa primită sau refuzată, cu motivul.
11. **Pe emulator:** emulatorul GRBL (ADR 0079) în spatele unui server WebSocket local, doar în probe.
    - Programul plăcii 2 trimis prin `retea` ajunge cu aceiași octeți ca prin serial.
    - WiFi-ul tăiat la mijloc lasă punctul de reluare, ca la cablul scos.
    - E2e-ul în Edge: pagina pe `localhost`, serverul pe `127.0.0.1`, fără permisiune (aceeași mașină).
12. **Proba finală, pe mașina owner-ului,** prin controlerul ales (întrebarea 1), cu transcrierea rejucată pe emulator (ca 3.5b).

### E. Imprimantele 3D (felii viitoare)

13. **Aplicația trimite un G-code gata făcut (din slicer) și urmărește imprimarea; nu feliază modele 3D.** Transportul (serial sau
    WebSocket) e același; peste el, un al doilea protocol, lângă fluxul GRBL:
    - Marlin, pe USB (și prin podul ESP3D): `ok` pe linie, numerele de linie cu suma de control, `Resend`, `busy: processing`,
      temperaturile;
    - prin rețea: Klipper (Moonraker, JSON-RPC pe WebSocket) și OctoPrint (REST, cu `fetch` și `targetAddressSpace: 'local'`),
      cu configurarea lor (originea aplicației, cheia API) scrisă în pașii omului.
14. **(owner) Ce imprimante:** recomandarea e Marlin pe USB întâi (cele mai multe imprimante), apoi Klipper. Bambu Lab nu se
    poate din browser.
    - **Răspunsul (03.11):** imprimanta owner-ului, o Creality K1C (Klipper, cu firmware-ul Creality), prin WiFi.
      Recomandarea devine: prima felie a imprimantelor e a ei, prin rețea; Marlin pe USB, după.
    - Ce expune în rețea firmware-ul de fabrică (Moonraker sau doar protocolul aplicației Creality) și dacă cere accesul root
      se cercetează la pornirea feliei, ca la 3.6d.

### F. Ordinea feliilor

- **3.6d:** transportul `retea`, profilurile, adresa, panoul cu USB / WiFi, avertismentul, proba pe emulator; fără mașină.
- **3.6e:** proba pe mașina owner-ului, prin controlerul ales.
- **Mai târziu, fiecare cu ADR-ul ei:** programul urcat pe cardul controlerului, tableta, protocolul Marlin, imprimantele prin
  rețea.

## Felia 3.6d (01.11.2026): transportul și panoul

- **Ce s-a construit:**
  - transportul, în `src/machine/websocket.ts`, lângă `serial.ts` (nu `retea.ts`, ca în propunere: numele era deja al copierii
    în rețea, ADR 0061);
  - profilurile;
  - adresa judecată înainte de conectare (`adresaRetea`);
  - mesajele de control scoase (`esteControl`);
  - butonul **Conectează (WiFi)** din panoul mașinii, cu controlerul, adresa și portul ținute în browser (`cncvs2.masina.retea`,
    `v: 1`);
  - starea „Conectat prin WiFi (gazda:portul)”;
  - avertismentul de dinaintea primei porniri prin WiFi, o dată pe pagină;
  - capitolul mașinii din manual (ro, en).
- **CSP-ul** (`shared/csp.ts`, cu acordul owner-ului) primește în `connect-src` schema `ws:`. Fără ea, browserul bloca orice
  WebSocket („violates the following Content Security Policy directive: connect-src”, prins în diagnoza din probă).
  - Spre o gazdă publică, un `ws://` rămâne blocat ca conținut mixt.
  - Schimbare față de §5: `wss:` nu intră în CSP (ar deschide orice gazdă publică), deci și adresa `wss://` se refuză, cu
    motivul. Un controler cu TLS va cere un ADR, cu gazdele lui.
- **Deschiderea refuzată** are motivul ei:
  - fără răspuns la adresa aceea (`retea-nedeschis`);
  - permisiunea rețelei locale refuzată (`retea-permisiune`, din starea permisiunii `local-network`);
  - timpul trecut: 10 s (`retea-timp`).

  O conexiune oprită de browser dă doar `error`, fără `close`: și ea e un eșec pe loc, nu după cele 10 s.
- **Închiderea de după deschidere:** `retea-cazuta` (1006, WiFi-ul) și `retea-inchisa:<cod>` (controlerul). Panoul spune
  „Legătura s-a închis: …”, iar lucrarea pierdută spune „legătura cu mașina s-a închis” (text neutru, bun și pentru USB).
- **Probele:**
  - pe hârtie: `test/unit/websocket.test.ts` (adresele primite și refuzate, mesajele de control, transportul pe un WebSocket
    fals, sesiunea prin rețea cu legătura căzută în timpul programului);
  - cap-coadă: `test/e2e/masina-wifi.spec.ts`, cu emulatorul GRBL în spatele unui server WebSocket minimal
    (`test/e2e/controlerWebSocket.ts`, RFC 6455, fără dependențe; ca FluidNC, un mesaj de control în cadru text și ieșirea în
    cadre binare). Verifică:
    - adresele refuzate;
    - profilul care își aduce portul;
    - jurnalul fără mesajul de control;
    - programul ajuns la controler cu amprenta exportului, după avertisment;
    - a doua pornire, fără avertisment;
    - legătura tăiată în timpul programului;
    - alegerile ținute.
- **Rămâne pentru 3.6e:** proba pe mașina owner-ului, prin controlerul ales (întrebarea 1).

## Podul ESP3D (răspunsul 1, 01.11.2026)

Mașina owner-ului (COSTEL, GRBL 1.1h pe Arduino) primește un ESP32 cu **ESP3D 3.0.2**, legat la portul ei serial. Celelalte
variante au alt WebSocket de date și nu sunt profiluri ale aplicației:
- ESP3D-X, pe ESP-IDF: `/wsdata`, subprotocolul `esp3d-v1`;
- ESP3D 3.1, linia stabilă nouă pe Arduino (din 05.2026): subprotocolul e tot `esp3d-v1`, conectarea trimite un text de bun
  venit, iar cadrele binare sunt protocolul lui de transfer de fișiere (`handleV1Binary`), nu date pentru firmware.

- **Ce spune sursa ESP3D 3.0** (ramura 3.0, `websocket_server.cpp`, `esp3d_settings.cpp`, `esp3d_string.cpp`):
  - WebSocket-ul de date are subprotocolul `arduino` și portul `DEFAULT_WEBSOCKET_PORT` „8282”; serialul e la „115200”;
  - cadrele primite, text sau binare, se strâng până la capătul de linie și pleacă la firmware;
  - o comandă de timp real pleacă imediat (`isRealTimeCommand`), **dar doar cu ținta GRBL sau grblHAL**: cu ținta
    implicită (`UNKNOWN_FW`), `?`, `!` și `~` ar aștepta capătul liniei, deci oprirea n-ar mai fi imediată;
  - ieșirea serială vine în cadre binare (`broadcastBIN`), iar textul e controlul și jurnalul podului (`pushMSG`).
- **De aceea, profilul `esp3d` aruncă toate cadrele text** (`textDoarControl`), nu doar mesajele de control știute: un text
  picat în mijlocul unei linii GRBL ar strica-o (proba: un „ok” rupt de un mesaj al podului rămâne „ok”).
- **Imaginea (02.11, felia 3.Q).** Workflow-ul `pod-esp3d` (pornit de mână) compilează ESP3D de la commit-ul tag-ului
  v3.0.2, cu trei schimbări în `configuration.h`, puse de `scripts/pod-esp3d.ts`:
  - ținta implicită GRBL (`DEFAULT_FW`), pentru timpul real de mai sus;
  - GRBL pe Serial2, cu RX pe GPIO16 și TX pe GPIO17 (pinii RX2 / TX2 ai plăcilor DevKit): Serial0 e al cipului USB și al
    mesajelor ROM-ului la pornire, care ar ajunge la GRBL la fiecare repornire a podului;
  - socket-ul de date (`WS_DATA_FEATURE`, comentat implicit).

  Restul rămâne ca în ESP3D. Cârligele de la IP și de la oră (`ESP_GOT_IP_HOOK`, `[ESP212]`) nu ajung la GRBL: fără
  `PRINTER_HAS_DISPLAY`, `[ESP212]` nu e compilat, iar răspunsul de comandă necunoscută nu are destinatar. Rețeaua
  atelierului nu intră în imagine (repo-ul și artefactele lui sunt publice): se pune la prima pornire, din pagina podului.
- **Probele imaginii.** Scriptul verifică întâi în sursă faptele de mai sus, așa că o sursă 3.1 e refuzată. Schimbă fiecare
  rând exact o dată și adaugă o unitate de probă, care verifică la compilare configurarea efectivă. Imaginea unică
  (`merge_bin`, DIO / 40 MHz / 4 MB, de la 0x0) e verificată bucată cu bucată:
  - adresele din metadatele PlatformIO, iar aplicația în partiția `ota_0` (adresa vine din tabela compilată, ca la platformă:
    metadatele n-o au);
  - suma de control și amprenta bootloader-ului și ale aplicației; esptool le validează și el, separat.

  Prima imagine verde: [rularea 41404105524](https://github.com/AndreiBesliu/cvs2/actions/runs/41404105524).
- **Pașii owner-ului, pentru 3.6e,** sunt în ghidul [`docs/masina/pod-esp3d.md`](../masina/pod-esp3d.md):
  1. imaginea, din artefactul rulării;
  2. scrierea pe ESP32, din browser (esptool-js, de la 0x0);
  3. rețeaua atelierului, din terminalul paginii podului: `[ESP100]`, `[ESP101]`, `[ESP110]WIFI-STA`, `[ESP444]RESTART`, cu
     parola rețelei de rezervă a podului schimbată (`[ESP106]`);
  4. firele: TX-ul ESP32 la D0, iar D1 la RX-ul ESP32 prin divizorul de tensiune (5 V față de 3,3 V), cu masa comună;
     Arduino-ul alimentat, dar nu din PC, fiindcă altfel cipul USB și podul ar vorbi amândoi pe D0;
  5. în aplicație: „Conectează (WiFi)”, „Pod ESP3D (GRBL)”, adresa podului, portul 8282; prima dată, browserul cere voie
     pentru rețeaua locală.

## Întrebările (owner)

1. **Controlerul cu WiFi al mașinii** (răspuns: podul ESP3D, 01.11):
   - a) podul ESP3D pe GRBL 1.1h-ul de azi, un ESP32 legat la TX / RX (recomandat cât rămâne placa);
   - b) un controler nou, FluidNC sau grblHAL pe ESP32, cu axa A din `BRIEF.md` §12;
   - c) altul (placa și firmware-ul).
2. **Programele lungi (§9):** a) pe flux, ca pe USB (recomandat); b) urcate întâi pe cardul controlerului.
3. **Tableta (§6):** a) într-o felie separată, după desktop (recomandat); b) odată cu 3.6d; c) nu.
4. **Imprimantele (§14)** (răspuns: o Creality K1C, prin WiFi, 03.11): ce imprimante și ce firmware? Recomandat: Marlin pe
   USB întâi, apoi Klipper.

## Ce am respins

- **Un ajutor instalat pe calculator** (un pod pe `localhost` spre Telnet): din 147, browserul ajunge singur la un `ws://` din
  rețeaua locală, iar ajutorul ar cere o instalare și actualizări.
- **Socket-urile directe (Direct Sockets, TCP):** sunt doar pentru aplicațiile web izolate (Isolated Web Apps), nu pentru un PWA.
- **`wss://` cu certificat autosemnat pe controler:** controlerele de azi nu-l au, iar omul ar trebui să accepte un certificat
  neverificat.
- **Antetele vechi Private Network Access (preflight-ul):** sunt retrase, iar Chrome cere să nu se mai scrie cod pentru ele.

## Limite

- Doar Chrome și Edge, de la 147, cu permisiunea omului; Firefox și Safari blochează un `ws://` din HTTPS.
- Adresa trebuie să fie un IP privat sau un nume `.local`.
- WiFi-ul căzut oprește senderul, nu și mașina, ca un cablu scos.
- La grblHAL, un singur flux are controlul; o a doua conexiune (alt sender) trimite doar comenzi de timp real.
- Podul ESP3D nu cere parolă pentru comenzi: oricine din rețeaua atelierului poate comanda mașina prin el.

## Se redeschide dacă

- Firefox sau Safari implementează accesul la rețeaua locală (sau îl refuză definitiv);
- controlerul ales de owner nu are WebSocket;
- podul trece pe ESP3D 3.1 sau pe ESP3D-X: alt socket de date, deci un profil nou;
- măsurătorile din atelier arată căderi de WiFi în timpul programelor: atunci urcarea pe card trece înainte.

## Sursele

- Chrome, „Local Network Access”: <https://developer.chrome.com/docs/modern-web-guidance/guides/security/local-network-access>
- Chromium, intenția de livrare pentru WebSocket (M147): <https://groups.google.com/a/chromium.org/g/blink-dev/c/O6GMKt44Ups>
- Edge 147, noutățile platformei web: <https://learn.microsoft.com/microsoft-edge/web-platform/release-notes/147>
- FluidNC, canalul WebSocket: <https://github.com/bdring/FluidNC/blob/main/FluidNC/src/WebUI/WSChannel.cpp>
- grblHAL, rețeaua: <https://petervanderwalt.github.io/grblhal_docs/06-Advanced-Topics/networking.html>
- ESP3D, WebSocket-urile: <https://esp3d.io/esp3d/version-3x/documentation/api/websockets/>
- ESP3D 3.0.2, sursa: <https://github.com/luc-github/ESP3D/tree/v3.0.2>
- ESP3D 3.1.3, socket-ul de date: <https://github.com/luc-github/ESP3D/blob/v3.1.3/esp3d/src/modules/websocket/websocket_server.cpp>
- esptool-js, scrierea din browser: <https://espressif.github.io/esptool-js/>
- OctoPrint, API-ul: <https://docs.octoprint.org/en/main/api/general.html>
- Moonraker (Klipper), autorizarea: <https://docs.fluidd.xyz/configuration/moonraker>
