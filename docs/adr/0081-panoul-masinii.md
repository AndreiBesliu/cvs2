# ADR 0081: Panoul mașinii, portul Web Serial și mașina simulată

**Starea:** acceptat pe 26.10.2026. Felia 3.6b, la cererea owner-ului („Da, pornește 3.6b: portul Web Serial și panoul mașinii,
cu o mașină simulată (emulatorul) pe instanța de test, ca să-l pot încerca fără CNC.”). **Continuă:** ADR 0020 (T20: sesiunea
Web Serial, octeții exportați cu hash), ADR 0080 (fluxul senderului). **Schimbă:** ADR 0079 §1 (emulatorul nu mai e doar o
fixtură de test: e și mașina simulată a panoului, pe instanța de test) și §3 („Se redeschide dacă: se cere emulatorul și în
aplicație”, cerut acum). **Documentul:** neschimbat. **Completat de:** ADR 0082 (poziționarea: jog, zero, WCS, palparea Z).

**Problema.** Fluxul senderului (ADR 0080) era probat, dar nimic din aplicație nu-l folosea: omul nu avea cu ce trimite un
program la mașină și nici cum să încerce senderul fără CNC.

## Decizia

**1. Sesiunea** (`src/machine/sesiune.ts`): un transport, fluxul și ceasul de rapoarte (`?` la 200 ms). Octeții primiți se taie
în linii (`\n`, cu `\r` scos, o linie ruptă între bucăți se lipește) și intră în flux; scrierile pleacă în ordine (o coadă de
promisiuni); fără port, evenimentele care scriu se refuză în jurnal. Portul pierdut (cablul scos, scrierea căzută) închide
transportul, cu motivul, iar fluxul primește `deconectat` (regula 4: punctul de reluare se pierde). Jurnalul (ultimele 300 de
linii) ține bannerul, mesajele, erorile programului și comenzile manuale cu răspunsurile lor, nu `ok`-urile și rapoartele.
Panoul se redesenează cel mult o dată la 100 ms. Timpul vine din afară (`Ceas`), ca sesiunea să se probeze în Node.

**2. Transporturile:** portul Web Serial (`serial.ts`: fereastra de alegere a browserului, 115 200 baud, un scriitor, cititorul
până la închidere; doar Chrome și Edge pe desktop, altfel panoul spune asta) și **mașina simulată** (`MasinaSimulata.ts`):
emulatorul GRBL 1.1h (mutat din `test/emulator/` în `src/machine/emulator.ts`) cu bannerul la conectare și timpul paginii ×
viteza aleasă (1×, 10×, 100×). În aplicație, ce nu știe simularea răspunde cu un mesaj și `error:20` (în teste aruncă, ADR 0079).

**3. Unde stă:** panoul **Mașina** e al treilea panou al carcasei, în docul din dreapta, sub proprietăți (`vedere.masina`,
aranjamentul ca date). Conținutul vine la prima deschidere (`PanouMasina.tsx`), iar sesiunea e una pe pagină (rămâne
conectată și cu panoul strâns). Panoul, sesiunea și fluxul intră în precache (în atelier, fără internet, trimiterea trebuie să
meargă); **mașina simulată e doar pe instanța de test și doar online** (bucata `MasinaSimulata`, plafonul ei de 8 kB, în afara
totalului), ca testul pas cu pas.

**4. Ce arată și ce cere panoul:** conexiunea; starea din rapoarte și poziția (de lucru când se știe, altfel a mașinii); programul
(**Ultimul export**, exact octeții lui, cu amprenta verificată; **Fișier…**, un G-code străin, cu refuzurile din ADR 0080 spuse
cu linia); lucrarea (faza, linia, bara, erorile); Pornește, Pauză / Reia (hold), Reia după eroare, Continuă (barieră), Oprește
(Ctrl-X), Deblochează (`$X`, în alarmă); comanda manuală și jurnalul.

## Probele

- sesiunea, cu un ceas fals: mașina simulată (bannerul, rapoartele la 200 ms, Idle); programul plăcii 1 (A) la 100× până la
  „gata”, exact octeții plăcii la emulator, panoul publicat rar; linia ruptă în două bucăți; refuzurile fără port; portul închis
  în flux (pierdut, motivul, ceasul oprit); scrierea căzută; jurnalul comenzilor manuale și ce nu știe simularea; un singur ceas
  după reconectare;
- fluxul: `deconectat` pierde punctul de reluare și dă „pierdut” comenzilor manuale din zbor;
- e2e (Edge): mașina simulată, de la export la „gata” (același SHA-256 ca în fereastra exportului), `$G` în jurnal, deconectarea;
  un fișier cu diacritice refuzat cu linia, unul bun încărcat; un port Web Serial fals (115 200 baud, bannerul, raportul cu
  poziția, o comandă scrisă și confirmată); fără Web Serial, mesajul în locul butonului;
- mutațiile țintite pe sesiune, mașina simulată și deconectare: 12 / 13 la prima rulare (ceasul rămas după deconectare), apoi
  13 / 13, cu proba reconectării.

## Limitele

- Proba de pe mașina reală lipsește: portul e probat pe un port fals, iar comportamentul GRBL pe emulator. Prima placă tăiată
  cu senderul nostru e proba finală (și transcrierea ei, 3.5b).
- Condiția T20 (planificatorul gol sub încărcare, cu latența reală) se măsoară abia pe mașină; panoul rămâne pe firul principal.
- Codurile de eroare se arată ca numere (`error:20`); dicționarul lor (PORTARE §3.5) vine separat. Jog-ul, zero-ul și palparea
  vin în 3.7.

## Respinse

- **Mașina simulată pe live**: ar fi o funcție a produsului fără proba ei; pe live, panoul are doar portul real.
- **Sesiunea închisă la strângerea panoului**: o lucrare în curs n-are voie să depindă de un panou deschis.
