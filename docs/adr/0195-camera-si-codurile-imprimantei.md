# ADR 0195 — Camera imprimantei și codurile ei explicate

**Starea:** acceptat pe 21.11.2026 (propus în aceeași zi), cu recomandările („Da, recomandările”: 1a, 2a), pentru feliile 3.6v, 3.6w și 3.6x (fără imprimantă, pe imprimanta falsă; apoi proba pe
imprimanta owner-ului, după ghid), în worktree-ul `imprimanta` (ramura `wip/3.6g-imprimanta`, la `main` `a64adf63`). Cererea
owner-ului: grupul 4 din cele șapte grupuri de îmbunătățiri ale legăturii prin WiFi (08.11, „Camera: imaginea live în
fereastră”, cu ordinea recomandată atunci: „1 → 2 → 3, apoi camera”), după grupul 3 (ADR 0194, unit în `main` pe 18.11), la
„da si vreau sa pornesti si restul worktrees” (21.11, prin sesiunea principală). Pe 07.11, owner-ul acceptase și camera, și
codurile explicate („in primul rand, accept toate sugestiile tale”); cardul erorii promite de atunci dicționarul („vine
într-o felie separată”). **Completează:** ADR 0190 (fereastra Imprimanta; întrebarea 4 din 07.11, camera într-o felie a ei,
„4a”), ADR 0192 (starea comună și capabilitățile driverelor primesc camera și dicționarul codurilor) și ADR 0194 (o eroare
se anunță cu ce înseamnă, nu doar cu cheia). **Documentul:** neschimbat. **CSP-ul:** neschimbat (§D). **Schița,** cu
formularul răspunsurilor (colecția `raspunsuri`): <https://claude.ai/artifact/BwK8f4t9vrsQ98JeENHKdC>. **Felia 3.6v** gata pe 22.11 (secțiunea „Felia 3.6v, gata”); proba pe imprimanta owner-ului: ghidul, pasul 12.

**Problema.** Când imprimanta se oprește cu o eroare, cvs2 arată „Cod 2585” și te trimite la ecranul ei; notificarea dă doar
cheia („textul ei e pe ecranul imprimantei”). Ca să afli ce s-a întâmplat și ce faci, te duci la imprimantă sau cauți codul
pe internet. Iar ca să vezi cum merge o imprimare lungă (s-a dezlipit o piesă? „spaghete”?), deschizi aplicația
Creality sau Creality Print: cvs2 arată placa văzută de sus, cu stratul de acum (3.6q), dar nu imaginea adevărată, deși K1C
are cameră.

## Ce am aflat (cercetarea din 21.11)

Semnele, ca la ADR 0190: [citit] în sursă sau în documentație, [raportat] de oameni care au imprimanta, [măsurat] pe imprimanta
owner-ului (transcrierea din 07.11, K1C 2025, V1.0.0.26, în `test/fixtures/imprimanta/k1c-2025.json`), [nemăsurat] de aflat.

- **Eroarea, pe 9999:** `err` = `{"errcode":N,"key":K}` (pe K2 și `value`, placa și locul din CFS). K1C 2025 trimite
  `{"errcode":0,"key":0}` fără eroare [măsurat]; o eroare are cheia ≠ 0 [măsurat, 3.6g]. Creality Print 4 (`WsClient.cpp`,
  `LanPrinterListLocal.qml`) le ține pe amândouă și caută textul **după `key`** în tabelul lui (`errorData.js`); un al doilea
  cititor (`creality-printer-monitor`, MIT) la fel: întâi `key`, apoi `errcode` [citit].
  - **Tabelul Creality:** pentru fiecare cheie, codul de pe ecran (de exemplu `CX2585`), nivelul (1 grav, 2 obișnuit, 3
    special), modelele cărora li se aplică (K1, K1C, K1 Max, K2 Plus), un text în engleză și, la câteva, un link în
    wiki-ul Creality [citit]. **Familiei K1 i se aplică 71 de chei** (67 lui K1C, plus 4 ale LiDAR-ului de pe K1 Max): 31
    grave, 38 obișnuite, 2 speciale; 10 au o pagină în wiki [citit: Creality Print 4]. Creality Print 6 are un tabel mai mare
    (~320 de chei, fără modele), cu coduri mai noi (2839 filamentul terminat, 528 extrudarea oprită…) [citit: tabelul scos de
    `creality-printer-monitor`].
  - **Despre ce sunt** (gruparea noastră): motoarele și axele (homing-ul pe X, Y, Z, cursa, decalajul Z), încălzirea și
    termistoarele (duza, patul: nu se încălzește, deconectat, scurtcircuit), fișierul (coordonate în afara cursei: CX2585,
    CY2586, CZ2587, CC5000), detecțiile camerei AI (spaghetele, un obiect străin pe pat, primul strat, deformarea) și camera
    însăși, sistemul (repornirea: XS2000…), filamentul și pana de curent.
  - **Nu vin în `err`:** filamentul terminat (`materialStatus` 1, citit din 3.6s) și imprimarea oprită de o pană de curent
    (`repoPlrStatus` 1; K1C 2025 trimite 0 [măsurat]). Creality Print le arată cu chei ale lui: 20010 și 20000 în versiunea
    4, 2839 și 115 în versiunea 6 [citit].
  - **Răspunsurile la o eroare,** în Creality Print 4 (`LanPrinterListLocal.qml`, `LanPrinterPanel.qml`,
    `Klipper4408Interface.cpp`) [citit; nemăsurat pe K1C]: **Continuă** = reia imprimarea (`pause` 0) și `cleanErr` 1;
    **Anulează** (cu confirmare) = `stop` 1 și `cleanErr` 1; la pana de curent, `repoPlrStatus` 1 (reia) sau 0 (renunță);
    **Reîncearcă** = `errorHandling` (valoarea nu reiese din sursă). Ce butoane apar depinde de nivel și de cod.
  - **Textele:** Creality Print e AGPL-3.0, deci textele lui nu intră în cvs2. Faptele (cheia → ce înseamnă) nu sunt ale
    nimănui: dicționarul e al nostru, în română și engleză, ca al codurilor GRBL (ADR 0085). Tabelul din K2Dash (Unlicense)
    pare luat din Creality Print, deci nici el.
- **Camera:**
  - K1C 2025 trimite `video: 1` și `webrtcSupport: 1` [măsurat]; camera WebRTC e pe 8000 [raportat: ADR 0190].
  - **Semnalizarea** (K2Dash, Unlicense, `useWebcam.ts`) [citit]: `POST http://<ip>:8000/call/webrtc_local`, cu
    `Content-Type: text/plain` și corpul = base64 din `{"type":"offer","sdp":…}`; răspunsul = base64 din
    `{"type":"answer","sdp":…}` (sau direct SDP-ul). Pagina cere doar să primească imaginea (`recvonly`). K2Dash citește
    răspunsul dintr-o pagină servită de imprimantă pe alt port (4408), deci 8000 trimite antete CORS, pe K2 [citit]; pe K1C
    2025, [nemăsurat].
  - **Într-o pagină HTTPS:** imaginea vine prin WebRTC (UDP, criptat), nu ca o resursă `http://`, deci nu e conținut mixt
    [citit]. Doar semnalizarea merge la `http://<ip>:8000`: `fetch` cu `targetAddressSpace: 'local'` și permisiunea rețelei
    locale, ca urcarea (3.6h) și WebSocket-ul (3.6g), dar în modul `cors` (răspunsul trebuie citit). Fără servere STUN: în
    aceeași rețea ajung adresele locale, iar nimic nu iese din rețea (K2Dash folosește un server Google; noi nu).
  - **K1 mai vechi** (firmware-ul din 2023–2024, din fabrică sau rootat): MJPEG la `http://<ip>:8080/?action=stream`
    [citit: `printer-protocol-orchard`]; Creality Print 6 preferă adresa asta când imprimanta o are [citit]. Un
    `<img src="http://…">` e conținut mixt (ADR 0190); citit cu `fetch` (mjpg-streamer trimite
    `Access-Control-Allow-Origin: *` [citit: `httpd.c`]), fluxul se arată cadru cu cadru, ca `blob:`.
- **CSP-ul:** `connect-src` are `http:` din 3.6h (cu acordul owner-ului), un `<video>` cu `srcObject` nu încarcă o adresă,
  iar `img-src` are `blob:`. Deci nicio schimbare (pe 08.11 spusesem că s-ar putea să trebuiască: nu trebuie).

## Decizia

### A. Codurile explicate (felia 3.6v)

1. **Dicționarul cvs2 al familiei K1** (K1, K1C, K1 Max), în română și engleză, scris de noi: pentru fiecare din cele 71 de
   chei, codul de pe ecran (`CX2585`), gravitatea (gravă sau obișnuită), un titlu scurt, **ce faci** (una–două propoziții) și,
   unde Creality are, linkul paginii din wiki-ul lui (doar spre `wiki.creality.com`). Căutarea, ca în Creality Print: întâi
   `key`, apoi `errcode`.
2. **Cardul Eroarea** (azi „Cod 2585” și „ecranul ei arată textul”): codul de pe ecran și titlul, ce faci, linkul **Pagina
   Creality ↗** (o filă nouă), iar dedesubt, mic, cheia și codul primite (pentru jurnal). Un cod pe care nu-l avem: „Codul …
   nu e în dicționarul cvs2: textul e pe ecranul imprimantei”, cu linkul listei codurilor K1 din wiki.
3. **Notificarea** (3.6s): titlul în locul cheii („Eroare CX2585: coordonatele X ies din cursă”), în bandă și în notificarea
   sistemului.
4. **Pana de curent:** driverul citește `repoPlrStatus` (câmp nou în starea comună, `reluareDupaPana`). Cardul: „Imprimarea
   s-a oprit la o pană de curent; imprimanta te întreabă pe ecran dacă o reia.” Notificare nouă, **Pană de curent**, pornită
   implicit.
5. **La cerere:** dicționarul limbii active vine la prima eroare; pornirea și fereastra rămân cum sunt.
6. **Driverul** (ADR 0192): fiecare familie își aduce dicționarul (`DriverText.coduri`, încărcat la cerere); unul fără
   dicționar arată codul, ca azi. Moonraker dă textul erorii direct (`print_stats.message`), deci n-are nevoie de unul.
7. **Răspunsurile din cvs2** (Continuă, Anulează, Reia după pană; întrebarea 2): implicit, 3.6v doar explică, iar
   răspunsul rămâne pe ecranul imprimantei; Pauza, Reia și Oprește din fereastră rămân cum sunt.

### B. Camera prin WebRTC (felia 3.6w)

8. **Cardul Camera,** în fereastra Imprimanta (un modul al aranjamentului, ADR 0250 §6), lângă placă: **Pornește camera** →
   imaginea live; **Oprește**; **Pe tot ecranul**. Se oprește singură când fereastra se ascunde sau legătura cade. Bifa
   **Pornește camera la deschiderea ferestrei** e oprită implicit (o cameră pornită ține imprimanta ocupată și rețeaua).
9. **Starea, cu ce faci:** „Se pornește…”, apoi imaginea; „Imprimanta nu răspunde pe 8000” (camera oprită din setările ei
   sau altă imprimantă); „Imprimanta răspunde, dar browserul nu lasă cvs2 să citească răspunsul” (CORS); „Imaginea n-a
   venit” (rețeaua). Pentru fiecare, ce încerci și unde se vede camera între timp (aplicația Creality, Creality Print).
10. **Capabilitatea `camera`** (ADR 0192): K1 o declară din `webrtcSupport` 1 (WebRTC) sau, fără el, din `video` 1 (MJPEG,
    §C). Un driver fără cameră nu arată cardul.
11. **Semnalizarea,** ca în K2Dash, cu `RTCPeerConnection` fără servere ICE și un termen de 10 s; răspunsul gol sau `{}`
    înseamnă „camera n-a pornit”.
12. **Imaginea nu se înregistrează și nu pleacă nicăieri:** e doar între imprimantă și browser (filmele le face imprimanta,
    3.6u).
13. **Pe telefon:** același card, imaginea pe lățimea lui (`playsinline`, fără sunet).

### C. Camera MJPEG (felia 3.6x)

14. Pentru K1 fără WebRTC: `fetch` pe `http://<ip>:8080/?action=stream`; cadrele JPEG se despart din flux și se arată pe
    rând într-un `<img>` (`blob:`), cel mult 10 pe secundă, cu cadrul vechi eliberat. Același card, aceleași opriri și
    mesaje (cu 8080 în loc de 8000).
15. K1C-ul owner-ului are WebRTC, deci 3.6x se probează doar pe imprimanta falsă (și cu jurnalul unui owner de K1 mai vechi,
    dacă vine).

### D. Siguranța și datele (completează ADR 0192 §D)

16. **Doar citiri:** camera și dicționarul nu trimit comenzi. Răspunsurile la o eroare, doar cu „b” la întrebarea 2: cu
    confirmare, ca Pauza și Oprește.
17. **Totul rămâne în rețeaua ta:** imaginea și semnalizarea merg direct între browser și imprimantă, fără niciun server
    (nici STUN). Linkurile wiki, doar spre `wiki.creality.com`, într-o filă nouă.
18. **Neschimbate:** CSP-ul, documentul, regulile Firestore.

### E. Bugetul

19. **Pornirea:** neschimbată (fereastra vine la cerere, iar dicționarul la prima eroare).
20. **Ținta:** cel mult +8 kB pentru toate trei: 3.6v ~+5 (dicționarul în două limbi, fiecare ~2,5 kB gzip, adus doar al
    limbii active; cardul), 3.6w ~+2, 3.6x ~+1; măsurat la fiecare felie. Azi: totalul 739,4 / 800, pornirea cu ușa 111,2 / 115, măsurate de sesiunea principală pe 20.11, pe `b3c3970f` (`main` `a64adf6` adaugă doar CLAUDE.md și indexul ADR).

## Feliile (ordinea propusă)

- **3.6v, codurile explicate** (§A): întâi, fiindcă nu așteaptă nimic de la imprimantă. Imprimanta falsă trimite o eroare cu
  o cheie din dicționar, una necunoscută și pana de curent.
- **3.6w, camera prin WebRTC** (§B). Imprimanta falsă răspunde pe 8000, iar „camera” e o a doua pagină a probei, cu imaginea
  dintr-un canvas (`captureStream`), legată prin imprimanta falsă.
- **3.6x, camera MJPEG** (§C). Imprimanta falsă servește un flux MJPEG pe 8080.

Fiecare, după răspunsuri și după schiță, cu probele, otrăvurile și ghidul ei, apoi oprire și raport.

## Proba

- **Pe hârtie:** căutarea (întâi `key`, apoi `errcode`; o cheie necunoscută; zero = fără eroare); dicționarul (fiecare cheie
  cu titlu și ce faci, în ambele limbi, aceleași chei; linkurile doar spre wiki); `repoPlrStatus`; semnalizarea (base64 dus
  și întors, răspunsul gol sau `{}`, termenul); fluxul MJPEG (un cadru tăiat între două bucăți ale fluxului, plafonul).
- **Cap-coadă,** pe imprimanta falsă: erorile și pana de curent în card și în notificări; camera pornită, oprită la
  ascunderea ferestrei, refuzul CORS și imprimanta fără cameră; fluxul MJPEG.
- **Otrăvurile:** `test/otravuri/3.6v.py`, `3.6w.py`, `3.6x.py`.
- **Pe imprimanta owner-ului** (ghidul, pași noi): camera (pornește? cât întârzie? și pe telefon?); o eroare, când apare,
  cu jurnalul copiat (cheia și codul ei față de dicționar).

## Felia 3.6v, gata (22.11.2026)

- **Dicționarul familiei K1:** 126 de chei, nu 71, cum spunea propunerea: cele 64 cu un înțeles din tabelul Creality Print 4
  (fără cele cinci „Unknown error”, 2536, 2537 și 2566–2568, și fără 20000 și 20010, cheile Creality Print pentru pană și
  filament), plus 61 din „K1 Series Error Code Summary”, rezumatul codurilor K1 din wiki-ul Creality (cu explicația și
  soluția fiecăruia; de acolo și-a primit înțelesul 103), și CC5000, arătat de K1C-ul owner-ului pe 03.11 (ADR 0190), aflat
  și în tabelul Creality Print 6. 84 grave, 42 obișnuite. 12 au pagina lor în wiki, în engleză, verificate una câte una
  (răspund 200; o cale inventată dă 404); 2571 are acum pagina lui, nu pe a lui 2121, cum o lega Creality Print. Textele
  (titlul, ce faci) sunt ale noastre, în română și engleză; nimic copiat.
- **Fișierele:** `coduri/creality-k1.ro.json` și `coduri/creality-k1.en.json` (4,8 și 4,5 kB gzip,
  plafonul 8 pe fișier, în poarta mărimii), generate la build (`scripts/coduriImprimanta.ts`, din
  `src/machine/imprimanta/coduri/k1.ts`, `k1.ro.ts`, `k1.en.ts`), în precache. Forma (`shared/coduriImprimanta.ts`) se
  verifică și la citire: linkurile doar spre `https://wiki.creality.com/`, fără ghilimele; codul de pe ecran, doar litere
  și cifre; cheile, numere.
- **Fereastra:** cardul „De la imprimantă” (`EroareImprimanta.tsx`): codul de pe ecran, gravă sau obișnuită, ce s-a
  întâmplat, „Ce faci:”, „Pagina Creality ↗” (filă nouă, `noopener noreferrer`) și, mic, cheia și codul primite; un număr
  necunoscut, ca atare, cu „Lista codurilor ↗”; fără dicționar, codul, ca înainte. Dicționarul se cere la prima eroare
  (`useCoduriImprimanta`), o dată pe familie și limbă.
- **Notificările:** banda își face textul la randare, deci o eroare își primește explicația când vine dicționarul;
  notificarea sistemului o așteaptă cel mult 1,5 s, apoi pleacă oricum. Evenimentul nou **Pană de curent**
  (`repoPlrStatus` 1), pornit implicit (o setare veche îl primește pornit); banda lui pleacă singură când întrebarea de
  pe ecran se închide. Răspunsurile la o eroare rămân pe ecranul imprimantei (2a).
- **Driverul** (ADR 0192): `DriverText.coduri` (K1: `creality-k1`), `Imprimanta.reluareDupaPana`; evenimentul `eroare`
  poartă și codul (`errcode`); cheia 0, ca și codul 0, nu numește nimic. Imprimanta falsă: `pana(da)`; pornește cu
  `repoPlrStatus` 0, ca K1C-ul owner-ului.
- **Recenzia proprie** (22.11; Workflow-ul cu agenți e refuzat aici fără o regulă de permisiune), trei reparații, fiecare
  cu proba și otrava ei: linkurile cardului țin cât textul lor (în grilă se întindeau pe tot rândul, deci un clic pe gol
  deschidea pagina); un dicționar care n-a venit (fără rețea, înainte de precache) se cere din nou la eroarea următoare, nu
  abia la redeschiderea ferestrei; cheia 0 cu un cod nenul nu mai poate arăta „Cod 0”.
- **Măsurat și probat:** totalul 745,6 / 800 kB (+1,5 față de `main` `69fe779`, A/B pe aceeași mașină;
  ținta ~5), pornirea 107,2 (cu ușa 111,2 / 115; aceeași ca pe `main`). Probe noi:
  `test/unit/imprimanta.coduri.test.ts` (11: cheile și textele, linkurile, generatorul și gărzile lui, forma citită din
  rețea, căutarea, pana în driver și în evenimente, notificarea explicată, setarea nouă, precache-ul), cheia 0 în proba
  driverului, manualul (două controale noi), două e2e (3.6v: codurile, cu lățimea linkurilor; dicționarul cerut din nou
  după o cerere căzută) și două actualizate (3.6g: CC5000 explicat; 3.6s: banda explicată).
  Porțile, pe `805ad35b` (cu `main` `69fe779` adus): unit 9 693 (9 685 trecute, 0 căderi, 8 sărite), build-ul determinist (350 fișiere),
  e2e 582 / 582: 549 în rularea întreagă; cele 11 căderi, din încărcare (alte linii rulau e2e), singure 11 / 11; `imprimanta.spec.ts` e serial, deci cele 22 de după căderea lui `:294` (la deschiderea ferestrei) n-au rulat acolo: tot fișierul, singur, 30 / 30.
  Privit în Edge, la 1280 px (luminos) și la 390 px (întunecat, în română și în engleză): cardul încape, iar „Pagina Creality ↗” ține cât textul (105 px; în engleză, 95), nu tot rândul.
  Otrăvurile: `test/otravuri/3.6v.py`, 46 / 46 (32 pe probele unitare, 14 prin e2e); din lista 3.6s, U02 adusă la codul nou și probată din nou.

## Întrebările (owner)

**Răspunsurile, din 21.11:** „Da, recomandările”: 1a (schița așa), 2a (răspunsurile la o eroare rămân pe ecranul imprimantei; butoanele, într-o felie a lor, după proba pe K1C).

1. **Schița** (<https://claude.ai/artifact/BwK8f4t9vrsQ98JeENHKdC>): a) așa (recomandat); b) altfel (spune unde).
2. **Răspunsurile la o eroare, din cvs2** (Continuă, Anulează, Reia după o pană de curent): a) nu acum: 3.6v explică, iar
   răspunsul rămâne pe ecranul imprimantei; butoanele vin într-o felie a lor, după ce proba pe K1C arată ce face fiecare
   (recomandat: sunt comenzi citite doar din sursa Creality Print, nemăsurate, iar Continuă, după o eroare, mișcă imprimanta);
   b) acum, în 3.6v, cu confirmare, cum le trimite Creality Print.

## Ce am respins

- **Textele Creality copiate** (AGPL) și **tabelul întreg al Creality Print 6:** multe coduri sunt ale lui K2 și ale CFS-ului;
  vin cu driverele lor.
- **Camera prin `<img src="http://…">`** (conținut mixt) sau **printr-un intermediar** (K2Dash are un mod cu un server lângă
  imprimantă): pagina vorbește direct cu imprimanta, ca pe 9999 și pe 80.
- **Servere STUN:** ar scoate cereri în afara rețelei, fără folos în aceeași rețea.
- **Înregistrarea camerei în cvs2:** filmele le face imprimanta (3.6u).
- **Camera pornită singură, implicit:** ține imprimanta ocupată fără să vrei; rămâne o bifă, oprită.
- **Detecția AI în cvs2:** o face imprimanta; cvs2 îi explică doar codurile.

## Se redeschide dacă

- 8000 nu trimite CORS pentru originea cvs2 (atunci semnalizarea nu se poate citi din pagină; rămân aplicația Creality,
  Creality Print sau un intermediar, cu decizia owner-ului);
- K1C 2025 cere la semnalizare altceva decât K2;
- cheile erorilor de pe K1C nu se potrivesc cu tabelul (proba: jurnalul unei erori reale);
- owner-ul vrea răspunsurile la o eroare din cvs2 (întrebarea 2, b, sau după probă).

## Sursele

- Creality Print 4, o copie a sursei (AGPL-3.0; citită, nimic copiat): `errorData.js`, `WsClient.cpp`,
  `LanPrinterListLocal.qml`, `LanPrinterPanel.qml`, `Klipper4408Interface.cpp`: <https://github.com/wzx-AILab/CrealityPrint>
- `creality-printer-monitor` (MIT; căutarea după `key`, apoi `errcode`; tabelul scos din Creality Print 6):
  <https://github.com/catmargiela/creality-printer-monitor>
- K2Dash (Unlicense; semnalizarea camerei, porturile 7125, 8000, 80, 9999): <https://github.com/pdromnt/k2dash>
- `printer-protocol-orchard` (camera MJPEG și WebRTC, răspunsurile la o eroare):
  <https://github.com/ChestnutLabs/printer-protocol-orchard/blob/main/protocols/creality.md>
- Notele despre K1C și Creality Print 6 (`webrtcSupport`, `repoPlrStatus`):
  <https://github.com/AaronFJung/Connect3Dp/blob/main/Research/Creality/CrealityK1C.md>
- mjpg-streamer (`Access-Control-Allow-Origin: *`):
  <https://github.com/jacksonliam/mjpg-streamer/blob/master/mjpg-streamer-experimental/plugins/output_http/httpd.c>
- Chrome, „Local Network Access”: <https://developer.chrome.com/docs/modern-web-guidance/guides/security/local-network-access>
