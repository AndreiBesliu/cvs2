# ADR 0080: Fluxul senderului, ca mașină de stare pură

**Starea:** acceptat pe 26.10.2026. Felia 3.6a, fără mașină, la cererea owner-ului de a continua etapa 3 fără placă („continuă
direct cu ce a rămas din etapa 3, începând cu emulatorul GRBL”, apoi „continua”). **Continuă:** ADR 0020 (T20: procedurile ca
mașini de stare pure, octeții exportați cu hash, bariera `M6`, WCS-ul obligatoriu), ADR 0022 (T22: N axe, poziția necunoscută
nu e un număr), ADR 0079 (emulatorul GRBL, pe care se probează), `docs/PORTARE.md` §3.4 (cele 11 reguli) și §3.5 (citirea
răspunsurilor). **Documentul:** neschimbat.

**Problema.** În ediția întâi, senderul era o clasă cu steaguri (`streaming` cu două înțelesuri), număra unități UTF-16, se
bloca pe o linie de 128 de caractere și scria singur preambulul de după barieră. Senderul nou trebuie să fie corect înainte să
atingă mașina, deci probat pe emulator, fără port și fără timp.

## Decizia

**1. Trei module în `src/machine/`**, fără port, fără ceas, fără interfață (stratul `machine` nu importă postul sau documentul):
- `program.ts`: **încărcarea**. Senderul primește octeți (și, de la export, amprenta lor), trimite exact octeții aceia, linie cu
  linie, și arată SHA-256-ul lor. Refuză, cu linia: un octet peste 0x7F (la GRBL 1.1 unele sunt override-uri, ADR 0079 §5), un
  `\r` („\r\n” ar fi două linii, două `ok`), o linie de peste 70 de octeți (regula 1), lipsa unui WCS înaintea primei mișcări
  (regula 11), `M6` într-un program străin, ultima linie fără `\n`, o amprentă diferită de cea a exportului;
- `raspunsuri.ts`: **citirea** liniilor controlerului (`ok`, `error:N`, `ALARM:N`, rapoartele, bannerul, mesajele, datele);
  rapoartele pe N axe (`MPos`, `WPos`, `WCO` cu oricâte valori), cu `Hold:0` ≠ `Hold:1`; poziția de lucru e `null` când nu se
  știe (fără `WCO`, alt număr de axe);
- `flux.ts`: **fluxul**, `pas(stare, eveniment) → { stare, acțiuni }`. Evenimentele: comenzile omului (încarcă, start, reia,
  continuă, oprește, hold, eliberare, o comandă manuală), ceasul (`tic` → `?`) și fiecare linie primită. Acțiunile: octeți de
  scris, răspunsul unei comenzi manuale (cu datele dinaintea lui), un refuz, o alarmă, un mesaj.

**2. Faza spune un singur lucru:** liber, pregătit, trimite, suspendat (o eroare în flux), golire (în fața unei bariere),
barieră (oprit), terminare (tot programul a plecat), terminat, pierdut (bufferul golit). Regulile:
- **1** o linie costă octeții ei + 1, neconfirmați cel mult cât bufferul (din contract: 128 la GRBL 1.1);
- **2** `ok` / `error` se potrivesc în ordine; datele dinaintea răspunsului unei comenzi manuale se leagă de ea; un `ok` fără
  nimic în zbor se numără („necorelat”), nu strică socoteala;
- **3** `error:N` pe o linie a programului: `!` (hold) și suspendat; reluarea (`~`) continuă de la prima linie netrimisă (și
  regăsește o barieră nefinalizată);
- **4** ALARM, Ctrl-X (și „oprește”, care îl trimite) și bannerul de repornire: pierdut, cu motivul; reluarea se refuză,
  pornirea de la capăt nu;
- **5** terminat doar după ultimul răspuns **și** un raport Idle venit după el: un Idle vechi (de exemplu din pauza unui `G4`)
  sau un hold nu termină lucrarea;
- **6** `M0`, `M1`, `M6` nu pleacă; fluxul golește (tot confirmat, Idle proaspăt), la sculă trimite `M5`, apoi se oprește;
  barierele vecine (cu linii goale sau comentarii între ele) sunt o singură oprire; „continuă” sare tot grupul. La barieră
  merg comenzile manuale (jog, palpare, zero vin în 3.7);
- **7** comenzile manuale pleacă una câte una, doar în afara fluxului; citirile (`$#`, `$$`, `$G`, `$I`, `$N`) doar pe un Idle
  venit după ultimul răspuns (altfel GRBL dă `error:8`); un text cu `?`, `!` sau `~` se refuză (ar fi timp real);
- **9** octeții de timp real nu intră în socoteală.

**3. Ce rămâne pentru 3.6b** (sesiunea Web Serial și panoul mașinii): portul, ceasul de rapoarte, încărcarea din export sau din
fișier, butoanele, condiția T20 de mutare într-un worker (planificatorul gol sub încărcare, cu latența reală). **Pentru 3.7:** jog,
zero, palparea, WCS-ul activ citit cu `$G` înainte de start. **Pentru etapa 13:** pornirea de la linia N (reconstruirea stării).

## Probele

- pe emulator (ADR 0079), regulă cu regulă: 100 000 de linii (exact octeții programului, 0 pierderi, suma senderului ≤ 128,
  bufferul emulatorului plin până aproape de 128, înapoi în origine); programele plăcilor 1 și 2 (exact octeții, axul oprit);
  hold-ul înaintea sfârșitului; Idle-ul vechi după `G4 P1`; eroarea în flux (în zbor, reluarea, fiecare linie o singură dată),
  pe ultima linie și chiar în fața unei bariere; alarma, „oprește”, repornirea neașteptată la barieră; `M6` cu `M5`-ul senderului
  și o citire la barieră; „M0, (comentariu), T5 M6, M3 S…” ca o singură oprire; citirea după o mișcare manuală (nu `error:8`) și
  datele legate de comenzi; refuzurile comenzilor manuale și ale fazei;
- încărcarea: plăcile, cu amprenta din fișe; fiecare refuz cu linia lui (70 de octeți trec, 71 nu); barierele (și ce nu e
  barieră: `M3`, `M30`, `M60`, `M10`, comentariile); rapoartele pe 3 și 4 axe, `Hold:0` / `Hold:1`, `Door:2`, cele stricate;
- mutațiile țintite pe cele trei module: 32 / 33 la prima rulare; cea rămasă era echivalentă (reluarea alegea faza, pe care
  `umple` o regăsește singur) și s-a scos din cod, cu o probă nouă pentru eroarea din fața barierei.

## Limitele

- Proba e pe emulator: comportamentul real al controlerului (ordinea mesajelor, frânarea) se confirmă pe transcrieri (3.5b).
- Comenzile manuale nu pleacă în timpul fluxului (în afara timpului real); override-urile și jog-ul vin cu panoul (3.6b, 3.7).

## Respinse

- **O clasă cu steaguri** (ca în ediția întâi): starea s-ar putea contrazice singură; faza unică nu poate.
- **Preambulul de după barieră scris de sender**: îl scrie postul, care știe starea modală (PORTARE §3.4); un program străin cu
  `M6` se refuză până la reconstruirea stării (etapa 13).
- **Trimiterea liniilor peste 70 de octeți** (GRBL păstrează 79 fără spații și comentarii): marja acoperă o linie cu spații pe
  care GRBL o scurtează oricum, iar postul nostru nu trece de 65.
