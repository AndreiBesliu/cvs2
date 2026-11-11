# ADR 0194 — Notificările și istoricul imprimărilor: semnul din bară, istoricul cu costul, estimarea care învață, filmele

**Starea:** propus pe 11.11.2026, pentru feliile 3.6s, 3.6t și 3.6u (fără imprimantă, pe imprimanta falsă; apoi proba pe
imprimanta owner-ului, după ghid), în worktree-ul `imprimanta` (ramura `wip/3.6g-imprimanta`, adusă la `main` pe 11.11,
`99ff34c`). Cererea owner-ului: grupul 3 din cele șapte grupuri de îmbunătățiri ale legăturii prin WiFi (08.11,
„Notificările și istoricul”), la „Da, grupul 3” (11.11), după grupul 2 (ADR 0193), unit în `main` pe 09.11 (`1eb4722`).
Pe 07.11, owner-ul acceptase deja ideile („in primul rand, accept toate sugestiile tale”): imprimarea văzută în tot cvs2
(semn și notificare) și istoricul. **Completează:** ADR 0190 (fereastra Imprimanta), ADR 0192 (starea comună a driverelor
primește istoricul și filmele, tot doar citiri) și ADR 0193 (pauza din fișier ajunge într-o notificare, cu nota ei).
**Documentul:** neschimbat (cu răspunsul recomandat la întrebarea 2). **Schița,** cu formularul răspunsurilor (colecția
`raspunsuri`): <https://claude.ai/artifact/VdM6u5SLVa83jh4czpyTfQ>.

**Problema.** O imprimare ține o oră sau cinci, iar omul nu stă în fereastra Imprimanta: lucrează în Proiectare sau în alt
program. Azi află că imprimarea s-a terminat, s-a oprit la pauza din fișier (magnetul de pus), a rămas fără filament sau
a dat o eroare doar dacă se uită la ea. După final nu rămâne nimic în cvs2: cât a durat față de estimare, cât filament a
mers, cât a costat. Filmul timelapse, dacă imprimanta l-a făcut, rămâne în ea.

## Ce am aflat (cercetarea din 11.11)

Semnele, ca la ADR 0190: [citit] în sursă sau în documentație, [raportat] de oameni care au imprimanta, [măsurat] pe imprimanta
owner-ului (transcrierea din 07.11, K1C 2025, V1.0.0.26, în `test/fixtures/imprimanta/k1c-2025.json`), [nemăsurat] de aflat.

- **Finalul:** `state` 2 înseamnă „terminată”. Pe o K3, lucrarea trece prin 0 → 9 → 1 → 2 → 0, iar 2 ține ~5 s; după
  final, `printJobTime` și `usedMaterialLength` revin la 0 [raportat: sonda din `printlog-bridge` #87; citit: integrarea
  Home Assistant `home-assistant-creality`, `const.py`: 0 liberă, 1 imprimă, 2 terminată, 4 oprită, 5 pauză]. Spre
  final, progresul sare 99 ↔ 100, deci doar `state` 2 spune „gata” [citit: aceeași integrare]. Pe K1C: [nemăsurat].
- **Oprirea** e `state` 4 (după `stop`, 3.6g) [măsurat]; o oprire de pe ecran arată la fel [nemăsurat].
- **Fără filament:** `materialStatus` 1, cu imprimanta în pauză (`state` 5) [citit: integrarea Home Assistant,
  `__filament_runout = materialStatus == 1`]. K1C 2025 trimite `materialStatus` 0 cu filamentul pus [măsurat].
- **Erorile:** `err` = `{"errcode":N,"key":K}`, cu cheia ≠ 0 [măsurat, 3.6g]. Textele lor sunt în wiki-ul Creality;
  integrarea Home Assistant le ține într-o bază făcută din wiki [citit].
- **Istoricul imprimantei:** `{"method":"get","params":{"reqHistory":1}}` → `historyList`, ultimele ~30–50 de lucrări, trimis
  și la finalul unei lucrări [citit: `Connect3Dp`, `Research/Creality/CrealityK1C.md`; integrarea Home Assistant]. Pe K1C 2025
  vine și după lista fișierelor, la `reqGcodeFile` [măsurat]. O intrare: `id`, `filename` (calea întreagă), `size`, `ctime`,
  `starttime` (secunde de la 1970), `totaltime` și `usagetime` (s; 1180 și 1140 pentru un fișier Creality Print „19m”),
  `usagematerial` (mm; 3712,4, față de 3670 estimat în listă), `startway` (9), `printfinish` (1), `thumbnail` [măsurat].
  `printfinish`: 1 gata, 0 oprită, 2 și 3 erori [raportat: `filament-tracker`]. Ce cuprinde `totaltime` în plus față de
  `usagetime` și ce e `startway`: [nemăsurat].
- **Filmele:** `{"method":"get","params":{"reqElapseVideoList":1}}` → `elapseVideoList`; o intrare are `id` (=
  `printStartTime` al lucrării), `videoname` („<cifre>.mp4”) și `gcodename`, iar filmul se ia pe HTTP de la
  `http://<ip>/downloads/video/<videoname>`, cu ~0,5 MB/s [citit: integrarea Home Assistant, `timelapse.py`: „verified on
  stock K1-family firmware”]. Pe K1C 2025, lista era goală (niciun film făcut) [măsurat]; dacă filmează: [nemăsurat]. Miniaturile:
  `http://<ip>/downloads/humbnail/<nume>.png` [citit: `filament-tracker`].
- **Browserul:**
  - O notificare a sistemului cere permisiunea omului, dintr-un clic [citit: MDN, Notifications API]. Pe calculator merge
    din pagină; pe Android, doar printr-un service worker [citit: MDN]. Merge cât cvs2 e deschis, și în fundal; cu browserul
    închis ar trebui un server, ceea ce e respins aici.
  - O filă ascunsă de peste 5 minute: Chrome îi rărește temporizatoarele la unul pe minut [citit: „Timer throttling in Chrome
    88”]; mesajele WebSocket vin mai departe [nemăsurat: de probat]. Edge pune o filă inactivă în repaus după 2 ore,
    implicit [citit: politica `SleepingTabsTimeout`]; în repaus, fila nu mai primește nimic, deci la o imprimare lungă cvs2
    trebuie pus la „Nu pune niciodată aceste site-uri în repaus”.
  - O imagine `http://` într-o pagină `https://` e conținut mixt (trecută pe https sau blocată) [citit], deci miniaturile și
    filmele imprimantei nu se pot arăta în pagină. Un link deschis într-o filă nouă merge (e o navigare, nu o resursă).
  - Sunetul: Web Audio pornește doar după un clic al omului în pagină [citit: regulile de redare automată].

## Decizia

### A. Notificările și semnul din bară (felia 3.6s)

1. **Evenimentele,** fiecare cu bifa lui, în cardul nou **Notificările** din fereastra Imprimanta:
   - imprimarea s-a terminat (cu durata și filamentul);
   - s-a oprit;
   - **pauza din fișier** (stratul și nota: „Pune magnetul”);
   - altă pauză;
   - **fără filament**;
   - o eroare (cheia și „vezi ecranul imprimantei”);
   - **legătura pierdută cât imprimă**;
   - primul strat gata (oprit implicit).
   Toate celelalte sunt pornite implicit. Un eveniment se anunță o dată, la schimbarea stării; o reconectare nu-l repetă.
2. **Unde apar:** cât cvs2 e ascuns (altă filă, alt program), o notificare a sistemului; clic pe ea → fereastra Imprimanta.
   Cât cvs2 e în față, o bandă în aplicație (sus, ca „Legătura s-a pierdut”), cu sunet. Bifa **Și notificarea sistemului
   cât cvs2 e în față** e oprită implicit. Pornirea: **Pornește notificările** (permisiunea, dintr-un clic). Dacă e refuzată,
   cardul arată pașii pentru a o da din browser; banda din aplicație merge oricum.
3. **Sunetul:** câteva tonuri scurte făcute de aplicație (Web Audio, fără fișiere): două urcătoare la final, trei la pauză,
   la lipsa filamentului și la eroare. Bifa **Cu sunet** e pornită implicit.
4. **Semnul din bară:** pe butonul **Imprimanta** din bara de sus, în orice aranjament (e acțiunea `vedere.imprimanta`), cât
   imprimanta e legată:
   - un punct: verde cât imprimă, portocaliu în pauză, roșu la eroare sau fără filament, gri cu legătura pierdută;
   - procentul („45 %”);
   - după final, ✓, până deschizi fereastra.
   **Titlul filei** devine „45 % · CNC Vector Studio” cât imprimă (bifa **Procentul în titlul filei**, pornită implicit).
   Locul și forma butonului le stabilesc aranjamentele (ADR 0250, în worktree-ul lor, după planșe) și designul ales pe
   11.11 („Variante design CVS2”); semnul merge cu acțiunea, deci nu cere un loc al lui. Atingerile carcasei (`App.tsx`):
   semnul, titlul filei și legarea la deschidere (punctul 5); de lucrat cu sesiunea principală și cu linia aranjamentelor.
5. **Legarea la deschidere:** bifa **Leagă imprimanta ținută la deschiderea cvs2** e oprită implicit. Codul imprimantei se
   încarcă după pornire, nu în ea, și trimite doar citiri. Fără bifă, semnul și notificările vin după ce ai deschis
   fereastra o dată (ea rămâne apoi legată și când lucrezi în Proiectare).
6. **Pe telefon:** doar cât cvs2 e în față (Android oprește fila în fundal); cardul o spune. Pe Edge, cardul spune și
   repausul filelor (pasul din ghid).
7. Setările stau în browser (`cvs2.imprimanta.notificari`, `v: 1`).

### B. Istoricul imprimărilor, costul și estimarea care învață (felia 3.6t)

8. **Două surse, unite după fișier și început:**
   - istoricul imprimantei (`historyList`): toate imprimările, și cele pornite de pe ecran sau din Creality Print, ultimele
     ~30–50;
   - **istoricul cvs2**: fiecare imprimare pornită sau văzută de fereastră, cu fișierul, piesele cu numele din cvs2,
     materialul, estimarea, începutul, finalul, filamentul spus de imprimantă (ținut înainte să revină la 0) și rezultatul.
     Stă în browser (baza `cvs2-imprimanta`, magazia nouă `imprimari`), ultimele 500 (întrebarea 2).
9. **Cardul Istoricul,** în fereastra Imprimanta (tabel; pe telefon, carduri):
   - data, fișierul (cu numele din cvs2 când e al nostru), rezultatul (✓ gata, ⏹ oprită, ⚠ eroare);
   - **durata față de estimare** („19 min · estimat 18 min, +6 %”);
   - filamentul, în metri și grame (cu densitatea materialului);
   - **costul**, dacă ai pus prețul.
   Dedesubt: totalurile lunii (ore, kg, lei), **Exportă CSV** și **Golește istoricul cvs2** (cu confirmare; cel al
   imprimantei rămâne în ea).
10. **Costul:** prețul pe kg al fiecărui material, fără valoare implicită (până îl pui, costul e „—”). Opțional și curentul:
    puterea medie a imprimantei (W) și prețul kWh, oprite până le pui. Fără valori ghicite.
11. **Estimarea care învață:** pentru fișierele feliate în cvs2 („Din desen…”), raportul dintre durata reală și estimare, pe
    imprimantă și material. Se ia mediana ultimelor imprimări încheiate, cel puțin 3.
    - În „Din desen…”: „~21 min (după 5 imprimări pe K1C-8578; feliatorul: 18 min)”.
    - Bifa **Corectează estimarea după istoric** e pornită implicit.
    - Fișierul nu se schimbă (numele lui poartă tot estimarea feliatorului).
12. **Driverul** (contractul din ADR 0192): `istoric` în starea comună, cu intrări normalizate (fișierul, începutul, durata,
    filamentul, rezultatul). Se citește la legare, la finalul unei lucrări și la deschiderea cardului. Moonraker are la fel
    (`server.history.list`), deci intră fără alt contract.

### C. Filmele timelapse (felia 3.6u)

13. **Lista filmelor** (`elapseVideoList`) se cere la deschiderea istoricului. O lucrare cu film are **Filmul**: se
    deschide de pe imprimantă, într-o filă nouă (`http://<ip>/downloads/video/<nume>.mp4`), iar de acolo îl salvezi.
    Doar nume `<cifre>.mp4`, potrivite după începutul lucrării; nimic din cvs2 nu ajunge în adresă.
14. Imprimanta face filmul doar dacă timelapse-ul e pornit pe ecranul ei; ghidul spune unde [nemăsurat pe K1C 2025].

### D. Siguranța și datele (completează ADR 0192 §D)

15. **Nicio comandă nouă:** doar citiri (`reqHistory`, `reqElapseVideoList`); aplicația tot nu trimite singură nimic altceva
    (răcirea singură de la 3.6o rămâne singura excepție).
16. **Datele stau la tine:** notificările se fac în browser, fără niciun server (nici de notificări); istoricul și setările
    stau în browserul tău (întrebarea 2). Filmul vine direct de pe imprimantă, în rețeaua ta.
17. Textele notificărilor vin din stare și din fișierele ținute (nota pauzei: cea scrisă în cvs2, altfel cea ASCII din
    fișier), niciodată din altă sursă.

### E. Bugetul

18. **Pornirea:** doar semnul din bară (~0,3 kB); restul vine la cerere, cu fereastra.
19. **Ținta:** cel mult +7 kB pentru toate trei (3.6s ~2,5; 3.6t ~3,5; 3.6u ~1), măsurat la fiecare felie. Azi: totalul
    654,4 / 700, pornirea 102,3 (cu ușa 105,9 / 110), măsurate pe 11.11 la `99ff34c`.

## Feliile (ordinea propusă)

- **3.6s, notificările și semnul din bară** (§A): evenimentele din schimbările de stare, banda, notificarea sistemului,
  sunetul, semnul pe butonul Imprimanta, titlul filei, legarea la deschidere. Imprimanta falsă învață finalul cu `state` 2,
  lipsa filamentului și o eroare.
- **3.6t, istoricul** (§B): istoricul imprimantei în driver, istoricul cvs2 în browser, cardul, costul, CSV-ul, estimarea
  care învață în „Din desen…”. Imprimanta falsă trimite `historyList` la final și la cerere.
- **3.6u, filmele** (§C): lista filmelor și linkul lor. Imprimanta falsă trimite `elapseVideoList` și servește un film.

Fiecare, după răspunsuri și după schiță, cu probele, otrăvurile și ghidul ei, apoi oprire și raport.

## Proba

- **Pe hârtie:** evenimentele din schimbările de stare (unul pe eveniment, nu la fiecare cadru; reconectarea nu repetă;
  finalul doar la `state` 2); semnul; istoricul (`historyList` citit, intrări stricate, unirea cu istoricul cvs2, gramele,
  costul, mediana, plafonul); lista filmelor (numele nesigure refuzate).
- **Cap-coadă,** pe imprimanta falsă:
  - o lucrare dusă la capăt cu `state` 2 și istoricul trimis la final; lipsa filamentului; o eroare; un film, în listă și
    pe HTTP;
  - notificările (API-ul browserului înlocuit în probă) și semnul din bară cât lucrezi în Proiectare;
  - istoricul cu durata și costul; „Din desen…” cu estimarea corectată; linkul filmului.
- **Otrăvurile:** `test/otravuri/3.6s.py`, `3.6t.py`, `3.6u.py`.
- **Pe imprimanta owner-ului** (ghidul, pași noi): o imprimare scurtă cu notificările pornite și cvs2 în fundal (vine
  notificarea? sunetul?); istoricul (durata, filamentul, față de estimare); un film, cu timelapse-ul pornit pe ecran.

## Întrebările (owner)

1. **Schița** (<https://claude.ai/artifact/VdM6u5SLVa83jh4czpyTfQ>): a) așa (recomandat); b) altfel (spune unde).
2. **Istoricul cvs2 se ține:** a) în browser, pe calculatorul acesta (recomandat acum: nimic nou în cont, iar exportul CSV
   îl mută oriunde); b) și în contul tău, ca să-l vezi de pe orice calculator (o colecție nouă în Firestore, cu reguli și
   cu sesiunea principală; felie în plus, după 3.6t).

## Ce am respins

- **Notificări cu cvs2 închis** (push printr-un server): ar cere un server care vede imprimanta din rețeaua ta. E grupul 7
  („accesul din afara casei”).
- **Miniaturile și filmul imprimantei în pagină:** conținut mixt (`http://` în `https://`), deci blocate de browser. Filmul
  se deschide într-o filă nouă.
- **Textele erorilor copiate din wiki-ul Creality:** nu sunt ale noastre. Notificarea dă cheia și trimite la ecranul
  imprimantei; explicațiile, mai târziu, scrise de noi.
- **Un sunet ascuns care ține fila trează:** ocolește repausul pe care omul l-a ales; ghidul spune excepția din Edge.
- **Istoricul cerut des:** doar la legare, la final și la deschiderea cardului.

## Se redeschide dacă

- K1C nu trimite `state` 2 la final (atunci finalul vine din 100 % urmat de liber) sau nu mai trimite `historyList`;
- filmele K1C 2025 nu sunt la `/downloads/video/` (proba pe imprimanta owner-ului);
- notificările nu vin cu cvs2 în fundal la o imprimare lungă, nici cu excepția din Edge;
- owner-ul vrea istoricul în cont (întrebarea 2, b) sau notificări cu cvs2 închis (grupul 7).

## Sursele

- Integrarea Home Assistant `home-assistant-creality` (MIT; stările, `materialStatus`, erorile, `timelapse.py`: lista și
  adresa filmelor, verificate pe K1): <https://github.com/filipeamorimdev/home-assistant-creality>
- Notele despre K1C și Creality Print 6.3 (`reqHistory`, `reqElapseVideoList`, câmpurile istoricului):
  <https://github.com/AaronFJung/Connect3Dp/blob/main/Research/Creality/CrealityK1C.md>
- `filament-tracker` (istoricul K1 citit pe 9999, `printfinish`, miniaturile): <https://github.com/Anto5314/filament-tracker>
- Sonda pe o K3 (stările la final, valorile care revin la 0): <https://github.com/HoffmanEngineering/printlog-bridge/issues/87>
- MDN, Notifications API: <https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API>
- Chrome, temporizatoarele în filele ascunse: <https://developer.chrome.com/blog/timer-throttling-in-chrome-88>
- Edge, repausul filelor (`SleepingTabsTimeout`, implicit 7200 s):
  <https://learn.microsoft.com/en-us/deployedge/microsoft-edge-browser-policies/sleepingtabstimeout>
- Moonraker, istoricul (`server.history.list`): <https://moonraker.readthedocs.io/en/latest/external_api/history/>
