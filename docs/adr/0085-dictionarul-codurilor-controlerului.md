# ADR 0085: Dicționarul codurilor controlerului

**Starea:** acceptat pe 26.10.2026. Felia 3.6c, la cererea owner-ului („Da, pornește dicționarul codurilor GRBL: error:N și
ALARM:N cu explicații și ce faci, în panoul mașinii.”), amânată din 3.6b. **Continuă:** ADR 0080 (fluxul senderului), ADR 0081
(panoul mașinii), ADR 0082 (procedurile), ADR 0083 (contractele familiei GRBL), `docs/PORTARE.md` §3.5 (verdictul „adaptat” al
dicționarului ediției întâi). **Documentul:** neschimbat.

**Problema.** Panoul arăta `error:22` sau `ALARM:1` ca atare: omul de la mașină trebuia să caute numărul, iar același număr
înseamnă altceva pe alt controler (`ALARM:10`: al doilea limitator al unei axe duble la GRBL 1.1, oprirea de urgență la
grblHAL, axul la FluidNC). Deblocarea (`$X`) pleca la fel după o palpare ratată și după un limitator atins, deși în al doilea
caz poziția mașinii nu mai e cea știută.

## Decizia

**1. Un tabel pe familie** (`src/machine/coduri/tabel.ts`): GRBL 1.1, grblHAL, FluidNC, cu id-urile contractelor postului.
Fiecare număr are cheia textului, gravitatea (`oprit`: controlerul refuză și ce urmează până omul face ceva, adică toate
alarmele și erorile care spun că e blocat; `linie`: doar linia a fost refuzată), poziția pierdută și butoanele panoului care
ajută, în ordinea încercării. Numerele vin din sursele firmware-ului, citite, nu din memorie (GPL-3.0: faptele, nu textele):
- GRBL 1.1 (`gnea/grbl` @ bfb67f0, `doc/csv/*_codes_en_US.csv`, `protocol.c`): erorile 1–17 și 20–38 (`error:18` și
  `error:19` nu există), alarmele 1–10; limitele hard și soft sunt critice („Reset to continue”);
- grblHAL (`grblHAL/core` @ 4ec1ae4, `errors.h`, `alarms.h`): erorile 1–58, 60–66, 70–92 și 253, alarmele 1–22; critice: 1, 2,
  10, 17, 20 (`alarm_is_critical`);
- FluidNC (`bdring/FluidNC` @ c82d217, `Error.h`, `Alarm.h`, `Protocol.cpp`, `ProcessSettings.cpp`, `GCode.cpp`): erorile 1–40
  și grupele de peste 60, alarmele 1–18; critice: 1, 2, 13. Codurile nu înseamnă peste tot ce înseamnă la GRBL: `$H` fără
  homing configurat dă `error:5`, iar o linie de peste 127 de caractere `error:14`.

Un text e comun mai multor familii doar unde înțelesul e același (alarmele 1–9; erorile G-code 1–37; homing-ul neconfigurat:
GRBL 5, grblHAL 5, FluidNC 5 și 18). Codurile pe care senderul aplicației nu le produce (fișierele controlerului, expresiile,
compensarea razei, autentificarea) au un text pe grupă, care spune de unde vine eroarea.

**2. Textele sunt ale noastre, în ambele limbi** (`texte.en.ts`, cheile; `texte.ro.ts`, exact aceleași, verificate de
compilator), scrise din înțelesul fiecărui cod: titlul scurt, ce s-a întâmplat, ce faci, cu numele butoanelor panoului.
Textele ediției întâi nu s-au refolosit (trei erau aproape copiate din documentația GRBL, `docs/PORTARE.md` §3.5).

**3. Date, nu JavaScript.** Generatorul (`scripts/coduri.ts`, la build, lângă manual) scrie `coduri/ro.json` și
`coduri/en.json`, în precache (explicația unei alarme vine și fără rețea, în atelier). Panoul le cere la deschidere, o dată pe
limbă, și le verifică forma. Un text pe care nicio intrare nu-l folosește oprește generarea. Plafonul e pe fișierul unei limbi,
comprimat: 12 kB (8,9 la felie). Motivul: textele (~9 kB pe limbă) n-ar fi încăput în bugetul JavaScript (5,6 kB rămași din
330), iar panoul are nevoie doar de limba omului.

**4. Familia controlerului, după cum se prezintă** (`familieDinLinie`): bannerul (`Grbl 1.1h`, `GrblHAL 1.1f`, `Grbl 3.9
[FluidNC …]`) sau `$I` (`[FIRMWARE:grblHAL]`, `[VER:… FluidNC …]`). Până se prezintă, tabelul e GRBL 1.1, iar panoul o scrie
sub explicație. **Bannerul grblHAL e acum un banner**: înainte, „GrblHAL …” nu era recunoscut, deci repornirea unui controler
grblHAL nu golea fluxul și nu recitea WCS-ul.

**5. Sesiunea ține minte** ultimul cod, cu locul lui (linia programului, comanda omului, jog-ul, procedura, ori controlerul
singur), **alarma care ține mașina** (până la primul raport în afara stării Alarm; un `error:9` venit după ea n-o înlocuiește)
și **oprirea critică** („reset to continue”, în orice formă: GRBL, prefixele FluidNC `INFO:` / `ERR:`, oprirea de urgență
grblHAL), până la bannerul repornirii. Blocarea fără cod (`'$H'|'$X' to unlock`, la pornirea cu homing activat) e un cod al ei,
cu explicația ei, dar doar dacă nu o ține deja o alarmă (după `ALARM:1` și repornire, explicația rămâne a alarmei).

**6. Panoul** arată ultimul cod într-un card sub stare: linia controlerului cu titlul, locul, ce s-a întâmplat, ce faci,
gravitatea (la erori), alarma care ține mașina (dacă e alta), repornirea cerută și tabelul folosit. Butoanele, doar unde ajută
acum: **Oprește** (repornirea), **Deblochează** (doar în Alarm, dezactivat până la repornire când controlerul o cere),
**Reia** (după ușă), **Mergi la jog**, **Mergi la palpare**; **Am înțeles** îl ascunde până la codul următor. Lista erorilor,
jurnalul și faza întreruptă arată titlul codului. Un cod care nu e în tabel se arată ca atare: „Nu e în tabelul grblHAL”, fără
o explicație ghicită.

**7. Deblocarea cere confirmarea** după o alarmă care pierde poziția (limita hard, repornirea în mișcare, homing-ul eșuat,
oprirea de urgență, blocarea fără cod; un cod necunoscut sau dicționarul nevenit: tot da), și de pe butonul lucrării. O
singură confirmare, care spune ce se poate strica („poziția mașinii nu mai e sigură… fă homing sau refă zero-ul”), cu
**Deblochează oricum** și **Renunță**; nu două ferestre la fel. După palpare (alarmele 4 și 5) și după limita soft, poziția s-a
păstrat: deblocarea pleacă direct.

## Probele

- tabelele: exact numerele din surse, pe familie; toate alarmele opresc; repornirea exact la alarmele critice; poziția
  pierdută la 1, 3, 6–9 și păstrată la 2, 4, 5; erorile care blochează GRBL: 9 și 13; `ALARM:10` cu trei înțelesuri;
- textele: în ambele limbi, traduse, titluri de cel mult 48 de caractere; generatorul: aceleași tabele în ambele limbi, forma
  citită de panou, refuzul unui text nefolosit și al unei intrări fără text; forma refuză fișierul stricat (cheie lipsă,
  acțiune necunoscută, numărul 0, familie lipsă);
- sesiunea: familia din banner și `$I`, uitată la deconectare; bannerul grblHAL golește fluxul; locul codului (comanda,
  controlerul, jog-ul, linia programului); limita hard cu „Reset to continue” până la banner, blocarea de după a alarmei,
  `error:9` care n-o înlocuiește, Idle care o eliberează; blocarea fără cod; pe mașina simulată, Oprește în mișcare dă
  `ALARM:3`, nu blocarea;
- e2e: `error:22` și `error:5` explicate și ascunse; `ALARM:5` deblocat fără confirmare, „Mergi la palpare”; `ALARM:3`
  deblocat abia după confirmare (Renunță nu trimite nimic); pe un port fals, limita hard (întâi repornirea, apoi confirmarea)
  și tabelul grblHAL (oprirea de urgență, un cod necunoscut, alarma care ține mașina); în engleză;
- poarta build-ului: ambele fișiere, aceleași tabele, în precache, sub plafon;
- mutații: 31 unitare (29 prinse la prima rulare; o resetare echivalentă scoasă, o probă nouă pentru blocare) și 10 pe
  interfață.

## Limitele

- Pe mașină, transcrierile reale vin cu 3.5b / 3.7b; tabelele grblHAL și FluidNC sunt după sursă, neprobate pe un controler.
- Mesajele libere ale controlerului (`[MSG:…]`) rămân în jurnal, neexplicate, în afară de „Reset to continue” și blocare.
- Homing-ul (`$H`) n-are buton: textele îl trimit la câmpul Comanda (mașina owner-ului nu are încă limitatoare de homing
  știute).
- Sesiunea nu cere singură `$I`: un controler care nu-și trimite bannerul la deschiderea portului (grblHAL pe USB nativ)
  rămâne „presupus GRBL 1.1” până la un `$I` al omului.

## Respinse

- **Textele în JavaScript, în panou:** ~9 kB pe limbă peste bugetul total; panoul are nevoie doar de limba omului.
- **Un singur tabel, al GRBL 1.1, pentru toate:** `ALARM:10` ar spune „al doilea limitator” la o oprire de urgență grblHAL.
- **Explicația ghicită pentru un cod necunoscut:** o explicație greșită despre o mașină e mai rea decât un număr.
- **Două confirmări la deblocare:** a doua învață mâna să apese de două ori.
