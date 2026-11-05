# ADR 0136 — Conectarea prin WiFi, mai ușoară

**Starea:** acceptat pe 05.11.2026, în felia 3.6f, fără mașină. Cererea owner-ului: „si defapt, vreau sa imbunatatim la
senderul wifi, vreau sa fie mult mai usor sa conectezi o masina prin wifi”. Răspunsurile la cele patru întrebări: „1. c”,
„2. a”, „3. b”, „4. trebuie sa pot alege la care retea sa ma conectez”. **Completează:** ADR 0119 (senderul prin WiFi,
transportul și profilurile). **Documentul:** neschimbat (v19).

**Problema.** Până la 3.6f, o mașină se lega prin WiFi așa: „Conectează (WiFi)”, controlerul ales din listă (FluidNC, grblHAL,
podul ESP3D), adresa scrisă de mână (un IP privat sau un nume `.local`) și portul. Adresa era partea grea: ghidul podului spunea
s-o cauți în lista de clienți a routerului. Înainte de asta, rețeaua atelierului se punea în pod prin șase comenzi scrise în
terminalul paginii lui (`[ESP106]`, `[ESP100]`, `[ESP101]`, `[ESP110]`, `[ESP444]`). La o eroare, panoul spunea motivul, dar
nu și ce faci mai departe.

## Ce am aflat (cercetarea din 05.11)

- **ESP3D 3.0.2** (sursa tag-ului, imaginea podului):
  - **mDNS e pornit** (`MDNS_FEATURE`), cu numele implicit `esp3d`: în rețeaua atelierului, podul răspunde la `esp3d.local`.
    SSDP și portalul captiv sunt și ele pornite;
  - fără rețeaua atelierului, podul pornește în rețeaua lui, **ESP3D** (parola `12345678`), la **192.168.0.1**. Dacă nu se
    poate lega la rețeaua atelierului (cam 20 de secunde de încercări), se întoarce în ea (`ESP_STA_FALLBACK_MODE`, implicit
    rețeaua de configurare, cu numele și parola rețelei proprii: `[ESP106]` o schimbă și pe aceea). `[ESP104]` nu poate pune
    înapoi rețeaua de configurare în 3.0.2 (doar `BT` și `OFF`), deci aplicația nu-l atinge;
  - **o comandă `[ESP…]` venită pe socket-ul de date (8282) se execută în pod** (`esp3d_commands.process` judecă doar textul,
    nu de unde vine; fără parolă, fiindcă `AUTHENTICATION_FEATURE` e oprit). Răspunsul pleacă tot pe socket-ul de date, în
    cadre binare, la toți clienții, ca ieșirea GRBL;
  - **răspunsurile:** cel scurt (`dispatchAnswer`) e o linie întreagă, `{"cmd":"100","status":"ok","data":"ok"}` cu capăt de
    linie, cu ghilimelele din date nescrise cu `\`; `[ESP800]json` pleacă în bucăți (capul, câte o pereche, coada `}}`), fără
    capăt de linie, deci o linie GRBL poate ajunge între ele; `[ESP410]` simplu dă „Start Scan”, câte o linie
    `SSID⇥semnal%⇥Open|Secure` și „End Scan”;
  - **parametrii:** podul se oprește la primul spațiu alb nescris cu `\` (`get_clean_param`) și scoate din valoare `json`,
    `json=…` și `pwd=…`: o valoare care ar fi doar asta ajunge goală, iar o comandă fără valoare e o **citire** (răspunsul e
    valoarea veche, cu „ok” ca stare). `NOPASSWORD` e parola goală (o rețea liberă). Lungimile: rețeaua 1–32, parolele 8–64;
  - `[ESP800]json` dă versiunea (`FWVersion`), ținta (`FWTarget`), numele (`Hostname`), IP-ul (`WebSocketIP`) și modul
    (`WiFiMode`: `AP` sau `STA`); `[ESP105]` dă numele rețelei proprii; `[ESP110]WIFI-STA` trece podul pe loc în rețeaua
    atelierului (legătura cade), deci `[ESP444]RESTART` nu mai trebuie.
- **FluidNC:** în rețeaua atelierului, `fluidnc.local` (mDNS); fără ea, rețeaua **FluidNC**, la 192.168.0.1. WebSocket-ul e pe
  portul web + 1 (81), dar un raport spune 80 de la versiunea 4.0: de verificat cu o placă.
- **grblHAL:** numele `grblhal` (`$300`), WebSocket-ul pe `$307` (81); mDNS-ul depinde de driver. Rețeaua se pune din USB
  (`$73`–`$75`, cu numere care diferă de la un driver la altul).
- **Browserul** nu caută singur în rețea (n-are UDP, deci nici mDNS, nici SSDP), dar un nume `.local` îl rezolvă de obicei
  sistemul: Windows 10 și 11 au rezolvarea mDNS în ele, macOS de mult. Nu întotdeauna: un firewall care oprește UDP 5353 sau
  unele instalări Windows 11 o pierd, de aceea ultimul IP rămâne rezerva (§2). Permisiunea rețelei locale se cere o dată pe
  site. O căutare în toată rețeaua (254 de adrese) merge, dar încet (fiecare adresă moartă așteaptă) și seamănă cu o scanare
  de porturi; nici rețeaua calculatorului nu se știe din pagină.

## Decizia

**1. Conexiunile ținute, fiecare cu rețeaua ei (răspunsul 4).** Fiecare legătură reușită rămâne în browser (`localStorage`,
`cncvs2.masina.retea`, `v: 2`, cel mult 8, cea folosită ultima prima): controlerul, adresa (numele sau IP-ul), portul, drumul,
numele rețelei (când se știe) și ultimul IP al unui nume. Drumul spune pe unde ajunge calculatorul la mașină: **prin rețeaua
atelierului** (după nume, de exemplu `esp3d.local`), **direct, prin rețeaua proprie a mașinii** (podul în rețeaua lui, la
192.168.0.1) sau o **adresă scrisă de mână**. Sub „Conectează (WiFi)”, fereastra Mașina le arată ca o listă („Prin rețeaua
„Atelier-COSTEL””, „Direct, prin rețeaua „ESP3D” a mașinii”), din care omul alege; fereastra nu se conectează singură, iar
„Uită” scoate o conexiune. Alegerile din 3.6d (`v: 1`) devin prima conexiune și rămân în formularul „Altă adresă…”. Parolele
nu se țin nicăieri.

**2. Găsirea, fără adresă scrisă (răspunsul 1c).**
- **Caută mașina** încearcă deodată, câte o gazdă pe rând: conexiunile ținute (numele, apoi ultimul IP), `esp3d.local` (8282),
  `fluidnc.local` (81), `grblhal.local` (81) și 192.168.0.1 (8282, apoi 81). Pe aceeași gazdă, podul se încearcă întâi: un pod
  ESP3D are pe 81 terminalul paginii lui, care ar răspunde ca un controler.
- **Caută în toată rețeaua**, doar la clic: rețelele /24 ale IP-urilor știute (fără rețeaua proprie a podului), altfel
  192.168.0.x și 192.168.1.x; întâi podul (8282) pe toate gazdele, apoi portul 81, câte 32 de gazde deodată, cu progresul și
  oprirea; prima mașină găsită oprește restul. Cu permisiunea rețelei locale neîntrebată încă, prima gazdă merge singură, cu
  timp, cât omul răspunde la întrebarea browserului.
- **Browserul încetinește WebSocket-urile care nu răspund.** Chrome întârzie fiecare WebSocket nou al unei pagini (pe procesul
  ei) cu rand(1000, 5000) · 2^min(p + f / (s + 1), 16) / 65536 ms: p încercările în curs, f cele căzute și s cele reușite în
  ultimele 2–4 minute (`WebSocketPerProcessThrottler`). La căutarea în toată rețeaua, fiecare încercare așteaptă deci 1–5 s
  înainte să plece: deschiderea are 9 s (întârzierea, apoi ~3 s cât cade ARP-ul unei gazde care nu există), iar întârzierile
  curg în paralel. Durează cam un minut pe rețea și port. Tot de aceea, legătura cu o conexiune ținută (și proba ei) are 10 s
  pe deschidere, cât în 3.6d: imediat după o căutare, și ea așteaptă.
- **Proba:** podul răspunde la `[ESP800]json` (versiunea 3.0, ținta GRBL sau grblHAL; IP-ul, numele, modul), un controler GRBL
  la `?`. Unui controler i se trimite doar `?`: timpul real n-are răspuns `ok`, deci nu încurcă numărătoarea unui alt sender
  care-i trimite deja o lucrare (un `$I` ar face-o). Controlerul se deduce din cine răspunde; pe portul 81, FluidNC și grblHAL
  se leagă la fel, deci o mașină găsită acolo prin căutarea în rețea se ține ca FluidNC.
- **Legătura cu o conexiune ținută:** numele, apoi ultimul IP, dacă numele nu răspunde (câte 6 secunde); la un pod, întâi proba
  (versiunea și IP-ul de acum, ținut), apoi transportul senderului, deschis din nou.

**3. Ce faci când nu merge.** Un eșec își spune pașii, sub listă: ce s-a încercat (adresele), apoi, când nu răspunde nimic,
mașina pornită, calculatorul în rețeaua conexiunii, pagina controlerului (cu un link spre ea, ca test), „Caută mașina” și
„Caută în toată rețeaua”. O permisiune refuzată spune unde se schimbă; un pod cu altă versiune sau altă țintă spune ce e.

**4. Configurarea podului din aplicație (răspunsurile 2a și 3b).** Un asistent în trei pași înlocuiește comenzile din
terminalul podului:
1. „Leagă calculatorul la rețeaua podului”: rețeaua ESP3D, parola din fabrică. **Verifică** deschide `ws://192.168.0.1:8282`
   (adresa se poate schimba) și cere `[ESP800]json`; podul potrivit rămâne ținut ca drum direct, cu numele rețelei lui
   (`[ESP105]`);
2. rețelele văzute de pod (`[ESP410]`), cu semnalul și parola (sau una ascunsă, scrisă de mână). Omul alege rețeaua
   atelierului, îi scrie parola și pune o parolă nouă rețelei proprii a podului (cea din fabrică e publică). Valorile pe care
   podul le-ar citi altfel sau le-ar refuza se refuză înainte, cu câmpul și motivul. Apoi aplicația trimite, pe rând, fiecare
   cu răspunsul ei (o scriere cere „ok”, nu o valoare): `[ESP106]`, `[ESP100]`, `[ESP101]` (sau `NOPASSWORD`) și
   `[ESP110]WIFI-STA`, după care legătura cade. Parolele merg doar de la browser la pod și nu se țin nici în pagină;
3. „Leagă calculatorul înapoi la rețeaua atelierului”: aplicația caută podul după numele lui (`esp3d.local`: numele rămâne
   `esp3d`, răspunsul 3b) până răspunde (o încercare la 4 secunde, cam două minute), apoi îl ține, cu rețeaua aleasă și IP-ul
   lui. Dacă nu apare: înapoi la pasul 1 (podul s-a întors în rețeaua lui, cu parola nouă) sau căutarea în toată rețeaua.

FluidNC și grblHAL primesc doar 1–3; configurarea lor (din pagina lor sau prin USB) vine când apare o mașină cu ele.

**5. Ce nu face.** Nu se conectează singură la deschiderea ferestrei (prima trimitere spre mașină pleacă dintr-un clic) și nu
caută în toată rețeaua fără clic.

## Proba

- **Pe hârtie:** `test/unit/conexiuni.test.ts` (conexiunile ținute: citirea tolerantă, alegerile din 3.6d aduse, drumul,
  ordinea, plafonul; comenzile podului: escape-urile, lungimile, valorile rezervate, `NOPASSWORD`; cititorii: răspunsul scurt
  cu ghilimele, `[ESP800]json` cu o linie GRBL după fiecare bucată, verdictul, lista rețelelor; gazdele căutate, rețelele,
  planificarea: câte deodată, prima găsită oprește restul, oprirea din afară) și `test/unit/sonde.test.ts` (pe o rețea falsă:
  ce pleacă spre fiecare gazdă, octet cu octet; închiderea; ultimul IP; refuzurile podului; un răspuns vechi nu e al comenzii
  noi).
- **Cap-coadă:** serverul WebSocket al probelor (`test/e2e/controlerWebSocket.ts`) răspunde și la comenzile `[ESP…]`, ca ESP3D
  3.0.2 (`[ESP800]` în bucăți, cu un raport GRBL între ele). `test/e2e/masina-wifi-pod.spec.ts`: asistentul, de la rețeaua
  proprie la podul găsit după nume (browserul rezolvă `esp3d.local` la 127.0.0.1), cu comenzile ajunse întocmai și parolele
  nicăieri în pagină; „Caută mașina” (după nume, ultimul IP, pașii unui eșec, „Uită”); „Caută în toată rețeaua” pe 127.0.0.x.
- **Otrăvurile:** `test/otravuri/3.6f.py`.
- **Pe mașină (3.6e):** podul real, configurat din asistent, în rețeaua atelierului.

## Răspunsurile owner-ului (05.11)

1. „1. c”: conectarea de zi cu zi, configurarea podului din aplicație și căutarea în toată rețeaua, când numele nu răspund;
2. „2. a”: parola rețelei atelierului se scrie în aplicație, merge doar spre pod și nu se ține (schimbă regula din ghidul
   podului, „parolele doar în pagina podului”);
3. „3. b”: numele mașinii în rețea rămâne `esp3d`;
4. „4. trebuie sa pot alege la care retea sa ma conectez”: în locul butonului „Conectează la COSTEL” și al conectării singure,
   lista conexiunilor, fiecare cu rețeaua ei (§1), fără conectare singură.

## Ce am respins

- **Căutarea în toată rețeaua ca prim pas:** lentă și seamănă cu o scanare de porturi; rămâne la clic (§2).
- **Un ajutor instalat pe calculator, pentru mDNS sau SSDP:** ar cere o instalare (ca la ADR 0119).
- **Numele `.local` scris doar în ghid:** omul tot trebuie să știe controlerul și portul, iar la o eroare n-are pașii.
- **`$I` în proba unui controler:** ar deosebi FluidNC de grblHAL, dar un `$` primește răspuns (`ok` sau `error:8` în timpul
  unei lucrări), deci ar strica numărătoarea altui sender legat la același controler.

## Sursele

- ESP3D 3.0.2: `configuration.h` (mDNS, SSDP, portalul), `esp3d_settings.cpp` (numele `esp3d`, rețeaua `ESP3D`, 192.168.0.1,
  rețeaua de configurare la eșec, lungimile), `wificonfig.cpp` (cele 20 de secunde, rețeaua de configurare cu numele și parola
  rețelei proprii), `websocket_server.cpp` (socket-ul de date, cadrele binare), `esp3d_commands.cpp` (`[ESP…]` din orice
  client, `get_clean_param`, `hasTag`, `dispatchAnswer`), `commands/ESP100.cpp`, `ESP104.cpp`, `ESP410.cpp`, `ESP800.cpp`:
  <https://github.com/luc-github/ESP3D/tree/v3.0.2>
- FluidNC, rețeaua proprie și portul WebSocket: <https://forum.v1e.com/t/fluidnc-webui-hard-to-connect/38051?page=3>,
  <https://forum.lightburnsoftware.com/t/no-connections-to-fluidnc/187957/3>, <https://forum.v1e.com/t/first-time-setup-of-fluidnc/43802>
- grblHAL, rețeaua: <https://petervanderwalt.github.io/grblhal_docs/06-Advanced-Topics/networking.html>,
  <https://github.com/grblHAL/RP2040/issues/34>
- mDNS pe Windows (rezolvarea din sistem, firewall-ul pe UDP 5353, eșecurile pe Windows 11):
  <https://www.espboards.dev/troubleshooting/issues/wifi/esp32-mdns-not-working/>,
  <https://kiwix.lema.org/stackoverflow.com_en_all_2023-11/questions/76991743/windows-11-not-resolving-local-addresses-using-mdns>
