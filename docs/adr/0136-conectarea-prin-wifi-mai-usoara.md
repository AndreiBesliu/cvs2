# ADR 0136 — Conectarea prin WiFi, mai ușoară

**Starea:** propus pe 05.11.2026, pentru felia 3.6f, fără mașină. Cererea owner-ului: „si defapt, vreau sa imbunatatim la
senderul wifi, vreau sa fie mult mai usor sa conectezi o masina prin wifi”. **Completează:** ADR 0119 (senderul prin WiFi,
transportul și profilurile). **Documentul:** neschimbat (v19).

**Problema.** Azi (3.6d), o mașină se leagă prin WiFi așa: „Conectează (WiFi)”, controlerul ales din listă (FluidNC, grblHAL,
podul ESP3D), adresa scrisă de mână (un IP privat sau un nume `.local`) și portul. Adresa e partea grea: ghidul podului spune
s-o cauți în lista de clienți a routerului. Înainte de asta, rețeaua atelierului se pune în pod prin șase comenzi scrise în
terminalul paginii lui (`[ESP106]`, `[ESP100]`, `[ESP101]`, `[ESP110]`, `[ESP444]`). La o eroare, panoul spune motivul, dar nu
și ce faci mai departe.

## Ce am aflat (cercetarea din 05.11)

- **ESP3D 3.0.2** (sursa tag-ului, imaginea podului):
  - **mDNS e pornit** (`MDNS_FEATURE`), cu numele implicit `esp3d`: în rețeaua atelierului, podul răspunde la `esp3d.local`.
    SSDP și portalul captiv sunt și ele pornite;
  - fără rețeaua atelierului, podul pornește în rețeaua lui, **ESP3D** (parola `12345678`), la **192.168.0.1**;
  - **o comandă `[ESP…]` venită pe socket-ul de date (8282) se execută în pod** (`esp3d_commands.process` judecă doar textul,
    nu de unde vine; fără parolă, fiindcă `AUTHENTICATION_FEATURE` e oprit). Răspunsul pleacă tot pe socket-ul de date, în
    cadre binare, la toți clienții, ca ieșirea GRBL;
  - `[ESP410]json` dă rețelele văzute (`SSID`, `SIGNAL`, `IS_PROTECTED`); în rețeaua proprie trece cât caută în AP + STA, apoi
    revine. `[ESP111]` dă IP-ul curent, `[ESP112]` numele, `[ESP800]` versiunea și ținta, iar `[ESP100]`, `[ESP101]`,
    `[ESP106]`, `[ESP110]`, `[ESP444]` pun rețeaua, parolele, modul și repornirea.
- **FluidNC:** în rețeaua atelierului, `fluidnc.local` (mDNS); fără ea, rețeaua **FluidNC**, la 192.168.0.1. WebSocket-ul e pe
  portul web + 1 (81), dar un raport spune 80 de la versiunea 4.0: de verificat cu o placă.
- **grblHAL:** numele `grblhal` (`$300`), WebSocket-ul pe `$307` (81); mDNS-ul depinde de driver. Rețeaua se pune din USB
  (`$73`–`$75`, cu numere care diferă de la un driver la altul).
- **Browserul** nu caută singur în rețea (n-are UDP, deci nici mDNS, nici SSDP), dar un nume `.local` îl rezolvă de obicei
  sistemul: Windows 10 și 11 au rezolvarea mDNS în ele, macOS de mult. Nu întotdeauna: un firewall care oprește UDP 5353 sau
  unele instalări Windows 11 o pierd, de aceea ultimul IP rămâne rezerva (§2). Permisiunea rețelei locale se cere o dată pe
  site. O scanare a rețelei (254 de adrese) ar merge,
  dar încet (fiecare adresă moartă așteaptă) și seamănă cu o scanare de porturi; nici rețeaua calculatorului nu se știe din
  pagină.

## Decizia propusă

**1. Mașinile ținute.** Fiecare mașină legată prin WiFi rămâne în browser: numele ei, controlerul, numele din rețea (`.local`)
și ultimul IP. În fereastra Mașina, un buton mare: **Conectează la COSTEL**. La alte mașini: o listă.

**2. Găsirea, fără adresă scrisă.** **Caută mașina** încearcă deodată numele știute: ale mașinilor ținute, apoi `esp3d.local`
(8282), `fluidnc.local` (81) și `grblhal.local` (81). Controlerul se deduce din cine răspunde. La pod, `[ESP800]` confirmă
versiunea 3.0.2 și ținta GRBL, iar `[ESP111]` dă IP-ul, ținut ca rezervă pentru un sistem fără mDNS. Adresa scrisă de mână
rămâne, sub **Altă adresă…**.

**3. Ce faci când nu merge.** Fiecare eșec își spune pașii:
- nu răspunde nimeni: mașina e pornită și în aceeași rețea? Cu un buton spre ultimul IP știut și un link spre pagina
  controlerului (`http://esp3d.local`), ca test;
- permisiunea refuzată: unde se schimbă, în setările site-ului;
- podul răspunde, dar altă versiune sau altă țintă: ce e de schimbat.

**4. (owner) Configurarea podului din aplicație.** Un asistent în trei pași înlocuiește comenzile din terminalul podului:
1. „Leagă calculatorul la rețeaua ESP3D (parola 12345678)”. Aplicația deschide `ws://192.168.0.1:8282` și verifică podul
   (`[ESP800]`);
2. aplicația arată rețelele văzute de pod (`[ESP410]json`), cu semnalul. Omul alege rețeaua atelierului, îi scrie parola, dă
   mașinii un nume (devine `<nume>.local`) și pune o parolă nouă rețelei proprii a podului (cea implicită e publică). Apoi
   aplicația trimite `[ESP106]`, `[ESP100]`, `[ESP101]`, `[ESP112]`, `[ESP110]WIFI-STA` și `[ESP444]RESTART`;
3. „Leagă calculatorul înapoi la rețeaua atelierului”. Aplicația caută `<nume>.local` până răspunde, apoi ține mașina.

Parolele merg doar de la browser la pod, prin rețeaua lui, și nu se țin nicăieri. FluidNC și grblHAL primesc acum doar
partea 1–3; configurarea lor (din pagina lor sau prin USB) vine când apare o mașină cu ele.

**5. Ce nu face.** Nu se conectează singură la deschiderea ferestrei (prima trimitere spre mașină pleacă dintr-un clic) și nu
scanează rețeaua.

## Proba

- **Pe hârtie:** cititorii răspunsurilor podului (`[ESP800]`, `[ESP111]`, `[ESP410]json`, cu răspunsurile întrerupte de ieșirea
  GRBL), găsirea pe un WebSocket fals (cine răspunde, controlerul dedus, ordinea, timpul), mașinile ținute (versiunea lor în
  browser, alegerile vechi din 3.6d aduse), comenzile asistentului (spațiile din nume și din parolă scrise cu `\`).
- **Cap-coadă:** serverul WebSocket al probelor (`test/e2e/controlerWebSocket.ts`) răspunde și la comenzile `[ESP…]`, ca
  ESP3D 3.0.2. Asistentul merge de la rețeaua proprie la mașina găsită după nume, iar căutarea găsește mașina după nume.
- **Pe mașină (3.6e):** podul real, cu numele lui în rețeaua atelierului.

## Întrebările (owner)

1. **Ce intră în 3.6f:** a) conectarea de zi cu zi (1–3) și configurarea podului din aplicație (4) (recomandat); b) doar
   conectarea de zi cu zi; c) a) plus scanarea rețelei, când numele nu răspund.
2. **Parola rețelei atelierului, la configurarea podului:** a) scrisă în aplicație, trimisă doar podului și neținută
   (recomandat; schimbă regula din ghidul podului, „parolele doar în pagina podului”); b) doar în pagina podului, cu
   aplicația arătând pașii.
3. **Numele mașinii în rețea:** a) îl alegi la configurare, de exemplu `costel`, deci `costel.local` (recomandat); b) rămâne
   `esp3d`.
4. **La deschiderea ferestrei Mașina:** a) butonul „Conectează la COSTEL”, fără conectare singură (recomandat); b) conectarea
   singură la ultima mașină.

## Ce am respins

- **Scanarea rețelei ca prim pas:** lentă, seamănă cu o scanare de porturi, iar pagina nu știe rețeaua calculatorului.
- **Un ajutor instalat pe calculator, pentru mDNS sau SSDP:** ar cere o instalare (ca la ADR 0119).
- **Numele `.local` scris doar în ghid:** omul tot trebuie să știe controlerul și portul, iar la o eroare n-are pașii.

## Sursele

- ESP3D 3.0.2: `configuration.h` (mDNS, SSDP, portalul), `esp3d_settings.cpp` (numele `esp3d`, rețeaua `ESP3D`,
  192.168.0.1), `websocket_server.cpp` (socket-ul de date, cadrele binare), `esp3d_commands.cpp` (`[ESP…]` din orice client),
  `commands/ESP410.cpp` (lista rețelelor): <https://github.com/luc-github/ESP3D/tree/v3.0.2>
- FluidNC, rețeaua proprie și portul WebSocket: <https://forum.v1e.com/t/fluidnc-webui-hard-to-connect/38051?page=3>,
  <https://forum.lightburnsoftware.com/t/no-connections-to-fluidnc/187957/3>, <https://forum.v1e.com/t/first-time-setup-of-fluidnc/43802>
- grblHAL, rețeaua: <https://petervanderwalt.github.io/grblhal_docs/06-Advanced-Topics/networking.html>,
  <https://github.com/grblHAL/RP2040/issues/34>
- mDNS pe Windows (rezolvarea din sistem, firewall-ul pe UDP 5353, eșecurile pe Windows 11):
  <https://www.espboards.dev/troubleshooting/issues/wifi/esp32-mdns-not-working/>,
  <https://kiwix.lema.org/stackoverflow.com_en_all_2023-11/questions/76991743/windows-11-not-resolving-local-addresses-using-mdns>
