# ADR 0079: Emulatorul GRBL, fixtura senderului

**Starea:** acceptat pe 25.10.2026. Felia 3.5a, la cererea owner-ului de a continua etapa 3 fără placă („continuă direct cu ce a
rămas din etapa 3, începând cu emulatorul GRBL”). **Continuă:** ADR 0020 (T20: „emulatorul GRBL și transcrierile sunt
fixturi”), `docs/PORTARE.md` §3.4 (cele 11 reguli ale fluxului; regula 10: emulatorul numără ce primește). **Documentul:**
neschimbat.

**Problema.** Senderul (3.6) trebuie probat înainte să atingă mașina. În ediția întâi, plasa ferestrei număra cu aceeași sumă pe
care o otrăvea (oarbă prin construcție), iar reluarea își era propriul oracol. Proba are nevoie de un controler fals care să se
poarte ca GRBL 1.1h și să numere singur ce primește. Plăcile 1 și 2 sunt încă netăiate.

## Decizia

**1. Unde stă:** `test/emulator/grbl.ts`, o fixtură de test, nu cod de produs: nimic din `src/` nu-l importă. Contractul e ca
date (`ContractEmulator`: bufferul, linia, planificatorul, bannerul), ca grblHAL și FluidNC să-și aducă propriile cifre.

**2. Ce modelează, cu cifrele din sursele GRBL 1.1** (citite pentru comportament, nu copiate; GPL-3.0):
- bufferul serial de 128 de octeți; un octet care nu mai încape se pierde, tăcut, și se numără;
- octeții de timp real se iau la sosire și nu intră în buffer (`?`, `!`, `~`, Ctrl-X, override-urile 0x90–0x9D, 0x84, 0x85,
  0x9E, 0xA0, 0xA1); orice alt octet peste 0x7F se aruncă;
- linia: cel mult 79 de caractere păstrate (spațiile, caracterele de control și comentariile nu se păstrează, literele mici urcă);
  peste, `error:11`; `\n` și `\r` închid fiecare o linie (deci „\r\n” sunt două `ok`), linia goală dă `ok`;
- planificatorul de 15 blocuri: `ok`-ul unei mișcări vine când intră în el; o linie care nu are loc stă în buffer; `G4`, `M3` /
  `M4` / `M5`, `M8` / `M9`, `M0`, `M2` / `M30` și `G10` așteaptă golirea lui; o mișcare de lungime zero nu intră;
- `$#`, `$$`, `$I`, `$H` și setările cer Idle sau Alarm (altfel `error:8`); `$G` și `$X` merg oricând;
- codurile: 1, 2, 3, 4, 5, 8, 9, 11, 20 (și `M6`), 22, 25, 33; alarmele cu Ctrl-X (`ALARM:3` doar în mișcare), cele critice (1, 2:
  „Reset to continue”, nimic procesat până la Ctrl-X), deblocarea cu `$X`;
- hold-ul (`Hold:1`, apoi `Hold:0`), reluarea, override-urile de avans, rapid și ax; avansul și rapidele plafonate de viteza
  maximă a axelor ($110–$112);
- `G10 L2` / `L20`, `G54`–`G59`, `G92`, `G43.1` / `G49`, `G53`, `G20` / `G21`, `G90` / `G91`, arcele cu I / J;
- transcrierea: fiecare octet primit și fiecare răspuns, cu timpul emulatorului.

**3. Ce e modelul nostru**, de verificat pe transcrierile reale (felia 3.5b; unde emulatorul diferă de mașină, mașina are
dreptate): frânarea (o durată fixă, cu poziția oprită pe loc), starea Idle în timpul unei pauze `G4`, poziția din mijlocul unui
bloc, lipsa accelerației, rapoartele fără `Ov:` și `WCO:`. **Ce nu modelează aruncă** (`Nemodelat`: `G28`, palparea, `$J`,
`$C`, `R` la arce, numerele de linie, două coduri din aceeași grupă): un test cade, nu primește un răspuns inventat.

**4. Fluxul de probă** (`test/emulator/flux.ts`): numărarea caracterelor (octeții liniei + 1, cel mult cât bufferul), cât să
conducă emulatorul. **Nu e senderul** (3.6): n-are bariera, citirile, hold-ul sau reluarea.

**5. O constatare pentru sender și post.** La GRBL 1.1, octeții UTF-8 nu ajung în buffer (peste 0x7F se aruncă), deci numărarea
în UTF-16 nu pierde octeți, cum presupunea martorul din `docs/PORTARE.md` §3.4. În schimb, unele diacritice **sunt comenzi**:
„ș” (C8 99) readuce override-ul axului la 100 %, „ț” (C8 9B) îl coboară cu 10 %, „Ț” (C8 9A) îl urcă. Postul scrie deja doar ASCII
(exportul refuză altceva); senderul (3.6) va refuza un program străin care nu e ASCII.

## Probele

- pe hârtie, 15 probe ale emulatorului: bufferul și pierderile, timpul real (și în mijlocul unei linii), octeții peste 0x7F,
  limita liniei (79 / 80, spațiile și comentariile, literele mici), „\r\n”, planificatorul (a 16-a mișcare așteaptă), G4 și M3,
  codurile, alarma obișnuită și cea critică, Ctrl-X, hold-ul, override-ul și plafonul axei, `$G` / `$#` / `$I` / `$$` / `G10 L20`
  (și `error:8` în mișcare), transcrierea;
- sub încărcare: 100 000 de linii scurte, de 1–11 octeți (goale, comentarii, mișcări modale): 0 pierderi, fiecare cu `ok`-ul ei,
  bufferul plin până aproape de 128, planificatorul plin, înapoi în origine;
- programele plăcilor 1 (A și B) și 2, exact octeții din fișele lor (SHA-256): fiecare linie `ok`, 0 pierderi, „Pgm End”, axul
  oprit, poziția finală din textul programului;
- martorii negativi: numărarea fără „+1” pierde octeți; o linie mai lungă decât bufferul blochează fluxul; una de 100 de
  caractere păstrate dă `error:11`; numărarea în UTF-16, cu „ț” în comentarii: 0 pierderi, override-ul axului la 10 %;
- mutațiile țintite pe emulator: 28 / 30 la prima rulare (linia închisă doar cu `\r`, `G10 L20` cu valori zero), apoi 30 / 30.

## Limitele

- Fără transcrieri reale, comportamentul de la margini (ordinea mesajelor la alarme, frânarea) e al modelului.
- Emulatorul e determinist și fără latență: întârzierea USB și a browserului (de care depinde dacă planificatorul rămâne gol
  sub încărcare, condiția de redeschidere din ADR 0020) se măsoară cu senderul, în 3.6.

## Se redeschide dacă

- o transcriere reală contrazice modelul (atunci emulatorul se corectează după ea);
- se cere emulatorul și în aplicație (o „mașină de probă” pentru utilizatori), nu doar în teste.
