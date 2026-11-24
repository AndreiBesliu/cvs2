# ADR 0260 — Pagina `/admin` reproiectată: bara laterală, fila Azi și filele după schițe

**Starea:** acceptat pe 13.11.2026, cu toate cele 12 idei din schițe („Da la toate”, la „Accepți recomandările la ideile
adminului 51–62?”), completat tot pe 13.11 cu ideea 76 (intrarea și stările goale; secțiunea de la capăt). Cererea
owner-ului, exactă: „vreau sa faci design si pentru admin”, după schițele aranjamentelor.
Schițele stau pe canvas, rândul G (<https://claude.ai/artifact/VuzcaEYQsLoTvRBxpnSak2>), iar ideile, pe tabla „Harta
schițelor”, la 51–62. **Intră în:** o linie a ei, nu în feliile aranjamentelor (ADR 0250); pornește la cuvântul owner-ului,
cu feliile A.1–A.7 de mai jos. **Continuă:** ADR 0040 (pagina și fila Erori), 0048 (Roadmap și Documentație), 0049
(personalul și rolurile), 0107 (sugestiile), 0116 (conturile, tichetele, setările). **Schimbă:** doar așezarea paginii și
fila de pornire; nimic din reguli, permisiuni sau date. **Documentul:** neschimbat.

## Problema

Pagina `/admin` a crescut filă cu filă: Erori, Diagnoză, Roadmap, Documentație, Sugestii, Tichete, Utilizatori, Personal,
Setări, Cont. Azi sunt zece file pe un singur rând, iar pagina se deschide pe Erori. Ca să afle ce cere atenție, omul trebuie
să intre în fiecare filă. Fiecare filă își deschide detaliile pe loc, în listă. Pe telefon, pagina are o singură regulă,
sub 640 px.

## Decizia

1. **Carcasa** (ideile 51–53):
   - **Bara laterală grupată,** cu aceleași file, în grupuri: Probleme (Erori, Tichete, Diagnoză), Produs (Sugestii,
     Roadmap, Documentație), Clienți (Utilizatori), Echipa (Personal, Setări), iar Contul meu la capăt.
   - Lângă filă stă un număr: erorile nerezolvate, tichetele noi, sugestiile fără decizie. Lângă Diagnoză stă un punct:
     galben la o Atenție, roșu la un Eșec.
   - Filele vizibile rămân cele date de rol (`fileVizibile`).
   - **Insigna instanței** în antet: TEST albastru, LIVE roșu, mereu la vedere.
   - **Căutarea din antet** găsește o eroare, un cont sau un tichet, în ce s-a citit deja. Căutarea pe server rămâne mai
     târziu (ADR 0116).
   - **Fila Azi,** prima după intrare, are patru părți:
     - cifrele care cer o mână;
     - joburile de noapte (marcajele de rulare, ADR 0041);
     - „Ce așteaptă de la tine” (din roadmap, doar pentru owner);
     - ultimele întâmplări (din auditul existent, doar cu „Audit: citește”).

     Fiecare rând duce în fila lui. Cifrele vin din aceleași citiri ca filele și doar din ce poate vedea rolul.
2. **Erori** (54): lista la stânga, eroarea aleasă la dreapta, fără să împingă lista. În plus, filtrul pe sursă (browser /
   server) și graficul aparițiilor pe 14 zile, din aparițiile deja citite.
3. **Tichete** (55): lista la stânga, raportarea ca o conversație la dreapta.
   - Amprentele erorilor din sesiune duc în fila Erori.
   - **Răspunsurile rapide** sunt texte scrise de owner, puse în câmp la un clic. Se țin într-o setare nouă, doar a
     owner-ului, cu regula ei și cu auditul ei (felia A.3).
4. **Sugestii** (56): o coloană pe decizie (Fără decizie, Acceptată, În lucru, Amânată, Făcută; Respinsele strânse sub
   ele).
   - Owner-ul trage un card dintr-o coloană în alta, prin callable-ul `sugestii` de azi, pe versiunea văzută.
   - Nota se cere la Respinsă și la Amânată.
5. **Utilizatori** (57): filtrele pe plan, cu numărul fiecăruia, și căutarea în conturile încărcate. Istoricul planului
   vine din rândurile de audit ale contului, doar cu „Audit: citește”.
6. **Personal** (58): matricea rol × permisiune, toate rolurile alături. Sub nume stă metoda de intrare: Google, parolă sau
   invitație în așteptare.
7. **Diagnoză** (59): sumarul (câte Bine, Atenție, Eșec) deasupra listei, apoi problemele întâi.
8. **Roadmap și Documentație** (60): „Ce așteaptă de la tine” mereu la vedere; în Documentație, cuprinsul paginii alături
   și starea ADR-ului (acceptat / propus) sub titlu.
9. **Setări** (61): istoricul schimbărilor sub buton, din audit.
10. **Telefonul** (62): sub 640 px, o bară jos cu Azi, Erori, Tichete și Mai mult, iar antetul are meniul ☰ și insigna.
    Pe telefon, un tichet se citește și primește răspuns; proiectul atașat se descarcă doar pe calculator.

## Feliile

| # | Felia |
| --- | --- |
| A.1 | Carcasa: bara laterală grupată cu numerele și punctul Diagnozei, insigna instanței, căutarea din antet, fila Azi (cu joburile, „Ce așteaptă de la tine”, ultimele întâmplări), Contul meu la capăt. |
| A.2 | Erori (detaliul alături, filtrul pe sursă, graficul pe 14 zile) și Diagnoză (sumarul, problemele întâi). |
| A.3 | Tichete: lista și conversația, legătura cu erorile din sesiune, răspunsurile rapide (setarea nouă, regula și auditul ei). |
| A.4 | Sugestii: tabla deciziilor, cu tragerea cardurilor și nota cerută. |
| A.5 | Utilizatori (filtrele, căutarea, istoricul planului) și Personal (matricea, metoda de intrare). |
| A.6 | Roadmap, Documentație (cuprinsul, starea ADR-ului) și Setări (istoricul). |
| A.7 | Telefonul: bara de jos, meniul ☰, tichetul cu răspunsul. |

## Probele

- **Permisiunile nu se schimbă:**
  - filele vizibile rămân date de `fileVizibile`;
  - o probă cere ca fila Azi să nu arate cifre din file pe care rolul nu le vede;
  - istoricul (planului, setărilor) și ultimele întâmplări cer „Audit: citește”.
- **Firestore Lite rămâne:** adminul citește o dată, fără ascultători (CLAUDE.md, 14.C↑b). Numerele din bara laterală se
  citesc la intrare și la „Reîncarcă”, nu în timp real.
- **Fiecare felie are proba ei e2e pe emulatoare** (`npm run test:emulator`), cu owner-ul și cu un rol custom cu permisiuni parțiale.
- **Tragerea în Sugestii are și cale din tastatură:** un meniu „Mută în…” pe card.

## Mărimea

- `/admin` e azi 106,5 / 200 kB. Ținta liniei: cel mult +25 kB pe toată linia.
- Graficul aparițiilor se desenează în SVG, fără bibliotecă.
- Totalul aplicației și pornirea nu se schimbă: adminul are pachetul lui.

## Completarea din 13.11: intrarea și stările goale

După tabla „Admin · Intrarea și stările goale”, owner-ul a acceptat și ideea 76 („Da la toate”, la „Accepți recomandările la
ideile noi 63–76?”). Felia ei e **A.1**, cu carcasa:

- intrarea și „Contul ăsta nu e în personal” într-un card centrat, cu insigna instanței deasupra. La „fără rol” se adaugă o
  propoziție: ceri o invitație, iar uid-ul e pentru primul owner;
- lista goală a unei file are un semn și ultima rezolvare, nu doar textul;
- eroarea citirii păstrează motivul de azi și primește „Deschide Diagnoza”;
- „Se încarcă…” arată rânduri schițate.

## Implementarea

- **A.1, 17.11: carcasa, fila Azi, intrarea și stările goale** (worktree-ul `admin`, ramura `wip/A.1-admin`, din `main`
  `b6aaa548`; în jurnalul etapei 3, `3.Aa`, fiindcă id-urile fișei sunt `<etapa>.<felia>`, ca liniile `3.T` și `3.X`):
  - **Partea pură** stă în `src/admin/carcasa/date.ts`: bara (`BARA`, `grupuriBarei`), filele ei (`fileBarei`: Azi, apoi
    exact `fileVizibile`, care nu știe de Azi), părțile filei Azi pe care le vede un rol (`partiAzi`), fila deschisă
    (`filaAratata`: fără `#`, Azi), insigna, punctul Diagnozei, numărul de lângă filă, întâmplările din audit
    (`intamplareDin`, `cheieIntamplare`, `filaTintei`), căutarea (`cauta`, `simplu`) și ultima rezolvare (`ceaMaiRecenta`,
    `rezolvareDin`).
  - **Ce parte din Azi vede un rol:** cifra erorilor cu „Erori: citește”, a tichetelor noi cu „Tichete: citește” sau
    „răspunde”, a sugestiilor fără decizie doar cu „Sugestii: citește toate” (scrierea dă doar sugestiile proprii; fără cifră),
    a conturilor noi (7 zile, schița) cu „Conturi: citește” sau „administrează”, joburile cu „Diagnoză: citește”, „Ce așteaptă
    de la tine” doar owner-ul, ultimele întâmplări cu „Audit: citește”. Un rol fără nicio parte nu are fila Azi și se
    deschide pe prima filă a lui, ca înainte. Proba trece prin toate cele 2 048 de roluri posibile
    (`test/unit/admin.carcasa.test.ts`).
  - **Rezumatul** (`src/admin/carcasa/sumar.ts`): la intrare și la „Reîncarcă” din Azi, doar părțile rolului, prin aceleași
    reguli: numărători (`count`) pe indexuri simple (`rezolvat`, `stare`, `creatLa`), Diagnoza prin `masoaraDiagnoza` (aceeași
    funcție ca fila; punctul din bară e cea mai rea stare a ei), ultimele 8 rânduri din `audit` (`cand`, descrescător). O
    parte pe care rolul n-o vede nu se citește deloc (proba numără cererile spre Firestore). Fără index compus nou, fără
    reguli noi. **Excepția: sonda funcțiilor** (apelul fără App Check, care trebuie refuzat cu 401) rămâne doar în fila
    Diagnoză: e o cerere activă spre server, iar browserul scrie „401” în consolă; la intrare ar fi fost la fiecare deschidere
    a paginii (găsită de proba documentației, care cere consola curată). Punctul din bară e deci cea mai rea stare a
    Diagnozei fără ea (`functii` lipsă în `verificari`).
  - **Bara laterală:** legături `#fila` (clicul simplu schimbă fila fără o intrare nouă în istoric, ca bara de până acum;
    clicul de mijloc deschide o filă nouă a browserului), `aria-current="page"`, numerele (erorile nerezolvate, tichetele
    noi, sugestiile fără decizie) doar peste 0, punctul Diagnozei (galben la o Atenție, roșu la un Eșec). Sub 640 px, până
    la A.7, bara trece deasupra, cu filele pe rânduri (nimic nu iese din ecran în dreapta). Titlurile grupurilor poartă
    `data-grup-bara`: `data-grup` e al rândurilor din fila Erori.
  - **Antetul:** insigna (TEST albastră, LIVE roșie, altfel neutră, cu numele instanței), căutarea, limba, „Înapoi la
    aplicație” și meniul contului (cine și rolul, „Contul meu”, „Ieși”). Căutarea găsește în ce au citit filele Erori,
    Tichete și Utilizatori (`publica` din contextul carcasei), fără diacritice, cel mult 5 pe fel; un fel necitit încă se
    spune. Un rezultat deschide fila lui și rândul: grupul de erori deschis (cu filtrul „Toate” dacă e rezolvat), tichetul
    și contul derulate la vedere și marcate.
  - **Fila Azi** (`src/admin/azi/FilaAzi.tsx`): cartelele cifrelor (una necitită se arată „?”, cu motivul), joburile de
    noapte din aceleași verificări ca Diagnoza (plus un rând „Diagnoza: alte N probleme”), „Ce așteaptă de la tine” (primele
    5 din roadmap, tăiate la două rânduri; pentru owner, Azi aduce `roadmap.json`, iar restul documentației vine tot la
    deschiderea filelor ei) și ultimele întâmplări. Fiecare rând duce în fila lui.
  - **Intrarea și stările** (ideea 76): intrarea, „fără rol” (cu propoziția nouă și „Ieși”) și eroarea rolului stau într-un
    card centrat, sub antetul cu insigna; `SeIncarca`, `ListaGoala` și `EroareCitire` (`src/admin/carcasa/stari.tsx`) sunt
    în toate filele. Ultima rezolvare: la erori, `marcatLa` al ultimei marcări (indexul simplu, descendent); la tichete,
    `rezolvatLa`; la sugestii, `decisaLa` (din lista citită).
  - **Ce s-a schimbat pentru probe:** pagina se deschide pe Azi (probele de pe emulatoare intră în filă din bară),
    `aria-selected` → `aria-current="page"`, „Ieși” stă în meniul contului.
  - **Probele:** 14 unitare noi (`test/unit/admin.carcasa.test.ts`), Diagnoza fără sondă (`admin.test.ts`) și rândul
    tichetului cu `rezolvatLa`; 5 e2e noi pe emulatoare (`test/e2e-emulator/azi.emulator.spec.ts`: owner-ul, cu consola
    curată până la Diagnoză și telefonul la 390 px; un rol doar cu tichetele; căutarea; stările; intrarea). Otrăvurile:
    40 / 40 prinse (`test/otravuri/A.1.py`: 24 unitare, 16 pe emulatoare).
  - **Mărimea**, față de un build curat al lui `main` `ae5a13c4`: `/admin` 106,5 → 112,2 / 200 kB (+5,7 din cei +25 ai
    liniei); pornirea (106,6, cu ușa 110,6 / 115) și totalul (716,7 / 800) neschimbate.
- **A.2, 18.11: Erori și Diagnoza** (aceeași ramură, `wip/A.1-admin`, peste A.1, cu `main` `c302d73a` adus în `951933e5`;
  `3.Ab` în jurnalul etapei 3):
  - **Partea pură:** `src/admin/erori/vedere.ts` (filtrul pe sursă, eroarea aleasă, aparițiile pe 14 zile, barele
    graficului) și `src/admin/diagnoza/vedere.ts` (sumarul, problemele întâi).
  - **Erori:** lista în stânga (între 280 și 420 px), eroarea aleasă în dreapta, lipită sus la derulare, deci lista nu se
    mișcă la alegere; sub 800 px, detaliul trece sub listă. La deschidere e aleasă prima; un grup găsit de căutare vine
    ales. Aleasă e cea văzută: un filtru care o ascunde mută alegerea pe prima arătată, iar ridicarea filtrului n-o mută
    înapoi. Filtrul pe stare arată numărul fiecăreia (două numărători `count` la fiecare citire, pe indexul simplu al lui
    `rezolvat` și pe colecție); filtrul pe sursă (browser / server) lucrează pe ce s-a citit, fără o cerere nouă. În
    detaliu: ultima apariție, graficul, ultimele 20 de apariții și „Marchează rezolvată” / „Redeschide”, doar cu
    `erori.rezolva` (ADR 0049). Un grup fără nicio apariție păstrată o spune (se păstrează 90 de zile, ADR 0040 §6).
  - **Graficul pe 14 zile:** din aparițiile citite (ultimele 20; eticheta spune „din cele citite”), pe zilele calendarului
    local (între miezurile nopții locale, deci și peste schimbarea orei; proba unitară fixează fusul României, ca să nu
    treacă degeaba pe CI, în UTC). SVG fără bibliotecă: o serie, fără legendă (titlul o numește), bare cu 2 px între ele,
    capătul de sus rotunjit (cel mult 4 px) și baza dreaptă pe axă, în culoarea de accent. Barele se desenează la lățimea
    măsurată a graficului (`ResizeObserver`; fără scalarea SVG, colțurile rămân rotunde), iar graficul are cel mult 28rem,
    ca barele să rămână subțiri. Ziua și numărul fiecărei bare la hover (`<title>`), totalul în eticheta graficului
    (`role="img"`). Fără nicio apariție în cele 14 zile, o propoziție în locul axei goale.
  - **Diagnoza:** sumarul (câte Bine, Atenție, Eșec; informațiile nu se numără) deasupra listei; problemele întâi (Eșec,
    apoi Atenție, cu fundalul stării), restul în ordinea de până acum; ora verificării lângă „Rulează din nou”.
  - Fără reguli, permisiuni, indexuri sau date noi; singurele cereri noi sunt cele două numărători ale filtrului.
  - **Bancul vizual** (1440, 1024 și 760 px, în ambele teme) a găsit patru lucruri, reparate în `8d747031`: textul
    rândurilor centrat de regula globală a butoanelor (`justify-content: center` strângea grila rândului pe text),
    colțurile barelor turtite de scalarea SVG, barele late de 50 px pe toată lățimea detaliului și graficul gol, fără
    nicio vorbă.
  - **Otrăvurile au găsit o probă care trecea din noroc:** ruta care ține citirea aparițiilor lui G2
    (`**/errorLogs/<id>:runQuery`) nu se potrivea niciodată, fiindcă adresa are `?key=…` după `:runQuery`; proba trecea
    doar când răspunsul întârzia de la sine. Trei otrăvuri (E05, E06, E14) au căzut pe aceeași linie, pe care niciuna nu
    o atinge. Reparată în `ed064a08`: ruta e o funcție pe calea adresei, iar proba cere ca citirea să fie ținută.
  - **Probele:** 6 unitare noi (`test/unit/admin.vederi.test.ts`); 3 e2e noi pe emulatoare
    (`test/e2e-emulator/erori.emulator.spec.ts`: owner-ul, cu așezarea, textul rândurilor, numerele, sursa, graficul și
    graficul gol, alegerea care nu sare înapoi, aparițiile erorii de dinainte care nu rămân sub cea nouă, marcarea și
    ecranul de 700 px; Diagnoza; un rol care doar citește erorile); probele vechi, pe așezarea nouă. Otrăvurile:
    28 / 28 prinse pe `ed064a08` (`test/otravuri/A.2.py`: 12 unitare, 16 pe emulatoare), fiecare pe aserțiunea
    care îi țintește defectul.
  - **Mărimea**, față de un build curat al lui `951933e5` (A.1 cu `main` `c302d73a`): `/admin` 112,2 → 113,6 / 200 kB
    (+1,4; linia: +7,1 din cei +25); pornirea (107,0, cu ușa 111,0 / 115) și totalul (721,3 / 800) neschimbate.
- **A.3, 21.11: Tichete ca o conversație** (aceeași ramură, `wip/A.1-admin`, peste A.2, cu `main` `a64adf63` adus în
  `c356744f`; `3.Ac` în jurnalul etapei 3). Răspunsurile rapide cer un document, o regulă și audit noi, deci felia s-a
  oprit întâi la ADR 0261 (propus, `182428da`), cu schița și formularul întrebărilor
  (<https://claude.ai/artifact/DhLTbJiBTWGdgjobiDcJb2>). Ce urmează e doar partea ADR-ului 0260:
  - **Partea pură:** `src/admin/tichete/vedere.ts` (titlul tichetului din primul rând al textului, tăiat la un cuvânt întreg
    peste 90 de litere; numerele filtrului, și la „Toate”; starea pusă de „Răspunde și …”; erorile din sesiune cu grupurile
    citite) și `cuTinta` în `src/admin/erori/vedere.ts` (grupul cerut din altă filă, adus singur).
  - **Lista** în stânga, ca la Erori: titlul, starea și felul ca cipuri, data, câte răspunsuri, vârsta roșie. Tichetul ales
    stă în dreapta, lipit sus. Ales e cel văzut: un filtru (sau un răspuns care îi schimbă starea) care îl ascunde mută
    alegerea pe primul arătat, fără s-o mute înapoi. Un tichet găsit de căutarea din antet vine ales.
  - **Conversația:** raportarea clientului (textul întreg, poza la cerere, proiectul atașat, erorile din sesiune, datele
    aplicației), apoi răspunsurile echipei, împinse spre dreapta, cu bara accentului, apoi câmpul răspunsului, jos. Detaliul
    ține cât spațiul de sub el, și înainte de prima derulare, când stă sub antet (`useCatSpatiulDeJos`). Conversația se
    derulează în el, deci butoanele răspunsului rămân la vedere. Sub 800 px, detaliul trece sub listă și curge cu pagina.
  - **Răspunsul:** „Răspunde” și, din schiță, „Răspunde și rezolvă” (la un tichet rezolvat, „… și redeschide”). Starea pleacă
    pe versiunea întoarsă de răspuns. După fiecare schimbare, lista se citește din nou, iar cât se citește nu pleacă nimic:
    versiunea arătată ar fi cea veche, iar serverul ar refuza-o. Ciornele stau pe tichet cât e deschisă pagina: alegerea altui
    tichet sau un drum în fila Erori nu le pierde, iar un răspuns trimis își golește ciorna.
  - **Erorile din sesiune:** cu fila Erori (rolul o vede, deci citește și `errorLogs`), grupul fiecărei amprente se citește o
    dată, la alegerea tichetului: mesajul, starea și „Deschide în Erori ›”. Unul care nu mai e în jurnal o spune. Fără fila
    Erori, amprentele rămân text și nu se citește nimic din `errorLogs`.
  - **Erori:** un grup cerut dintr-un tichet poate fi mai vechi decât cele mai recente 100; atunci se aduce singur (`getDoc`)
    și stă primul în listă, cât îl lasă filtrul pe stare. Detaliul ei ține și el cât spațiul de sub el și se derulează în el:
    din A.2, un detaliu mai înalt decât ecranul își ascundea partea de jos până la capătul listei.
  - Fără reguli, permisiuni, indexuri sau date noi.
  - **Găsite pe drum:**
    - ruta probei din A.1 care ținea citirea tichetelor, pentru rândurile schițate (`**/documents:runQuery`), nu se potrivea,
      ca aceea din A.2 (`?key=…` după `:runQuery`). Schița se vedea doar dacă citirea întârzia de la sine. Acum ruta e pe
      cale, iar proba cere ca citirea să fie ținută;
    - din 15.B↑a, câmpul răspunsului își ținea versiunea de la deschiderea rândului, deci, la citirea codului, un al doilea
      răspuns fără „Reîncarcă” ar fi fost refuzat. Acum pleacă pe versiunea tichetului arătat, iar proba trimite două
      răspunsuri la rând.
  - **Răspunsurile rapide** (ADR 0261, acceptat pe 21.11 cu toate recomandările) intră tot în A.3; detaliile lor stau în
    „Implementarea” lui 0261.
  - **Probele:** 8 unitare noi pentru partea de aici (`test/unit/admin.tichete.test.ts`: titlul, numerele, starea de după
    răspuns, erorile din sesiune, punerea la cursor și plafonul ei; `admin.vederi.test.ts`: grupul adus). 3 e2e noi pe
    emulatoare (`test/e2e-emulator/conversatia.emulator.spec.ts`: owner-ul, cu așezarea, conversația lungă cu răspunsul la
    vedere, erorile din sesiune spre Erori, grupul vechi adus, ciornele, „Răspunde și rezolvă” cu nimic trimis cât se
    recitește lista, al doilea răspuns fără „Reîncarcă”, alegerea care nu sare înapoi și ecranul de 700 px; un rol care
    răspunde fără fila Erori, fără nicio citire în `errorLogs`; un rol care doar citește). Probele vechi, pe așezarea nouă
    (`tichete`, `azi`, `erori`, `utilizatori`).
  - **Otrăvurile:** 59 / 59 prinse pentru toată felia (`test/otravuri/A.3.py`: 24 unitare, 5 pe server, 1 pe regulă, 29 pe
    emulatoare), fiecare pe aserțiunea care îi țintește defectul, pe `25b22992` (unitarele, E08 și E22 din nou pe `ed96b7a6`).
    La primul tur, 56 / 59. U04 trecea fiindcă propoziția
    probei se rupea, la a 90-a literă, chiar înaintea unui spațiu; acum titlul așteptat e scris de mână. E08 și E22 treceau
    fiindcă citirile interzise se numărau doar după adresă, iar Firestore Lite citește un document prin `documents:batchGet`,
    cu calea în corp; acum se caută și în corp.
  - **Mărimea**, față de un build curat al lui `main` `a64adf63` (cu A.2): `/admin` 113,7 → 121,2 / 200 kB (+7,5, din care
    vreo 5,7 sunt răspunsurile rapide; dicționarele adminului, română și engleză, intră amândouă în bucata lui, deci fiecare
    text nou contează de două ori; linia ajunge la +14,7 din cei +25). Pornirea (107,2, cu ușa 111,2 / 115) și totalul
    (739,5 / 800) sunt neschimbate.
- **A.4, 22–23.11: Sugestii ca tablă a deciziilor** (aceeași ramură, `wip/A.1-admin`, adusă înainte, fără unire, la `main`
  `88be9d6c`, care conține A.3; `3.Ad` în jurnalul etapei 3; oprită la pauza din 22.11 seara și încheiată pe 23.11 într-o
  sesiune cloud, cu `main` `8f122eb6` adus în `141fe90e`). Fără reguli, permisiuni, indexuri, date sau funcții noi: mutările
  trec prin acțiunea `decide` a callable-ului `sugestii` de azi, pe versiunea văzută.
  - **Partea pură** (`src/admin/sugestii/date.ts`): coloanele, în ordinea schiței (Fără decizie, Acceptată, În lucru, Amânată,
    Făcută), cu Respinsele dedesubt; unde se mută un card („Mută în…”: celelalte coloane, apoi Respinsă); nota cerută
    (Respinsă, Amânată; spațiile singure nu sunt o notă); tabla (`tabla`: în „Fără decizie”, cele mai noi întâi; în
    celelalte, ultima decizie întâi, deci un card mutat urcă în capul coloanei; o stare necunoscută stă separat); mutarea
    arătată cât cererea e în drum (`cuMutarea`) și lista după răspuns (`dupaDecizie`). Filtrele pe stare ale listei vechi
    au ieșit: coloanele sunt filtrul.
  - **Tabla** (`Tabla.tsx`): cardul are titlul (butonul care deschide detaliul), tipul și autorul. Owner-ul îl trage într-o
    coloană sau în banda Respinselor (strânsă, cu numărul; un card trimis acolo o deschide) ori alege din „⋯”, meniul „Mută
    în…” (calea din tastatură: săgețile, Home, End, Enter, Esc, care întoarce focusul pe buton). Rândurile care deschid
    fereastra notei au „…”.
  - **Mutarea:** cât cererea e în drum, cardul stă deja în coloana nouă, cu marginea punctată, și nimic altceva nu se mută.
    La răspuns, lista ține decizia fără s-o recitească: serverul a scris pe versiunea trimisă, deci rândul e cel citit, cu
    starea, nota curățată ca pe server, ora și versiunea întoarsă. O mutare nu mai costă cele până la 300 de citiri ale
    listei, iar a doua mutare a aceluiași card pleacă pe versiunea nouă. La un refuz, cardul revine în coloana lui, cu
    motivul pe el, până la „Reîncarcă” sau la următoarea cerere. După o mutare din tastatură, focusul rămâne pe card, în
    coloana nouă. Sub 1 100 px, coloanele trec pe rânduri (niciun meniu nu se taie la o derulare laterală).
  - **Nota cerută:** la Respinsă și Amânată, tragerea și meniul deschid o fereastră modală cu nota de acum a cardului; „Mută”
    pleacă doar cu o notă, iar „Renunță” și Esc lasă cardul pe loc. Și în detaliu, decizia nu pleacă la aceste două stări fără
    notă. Nota cerută e a tablei: serverul primește, ca azi, orice notă (o decizie veche fără notă rămâne validă).
  - **Detaliul:** o fereastră modală nativă (ca manualul), cu textul, poza la cerere, decizia cu nota, editarea autorului
    (cât n-are decizie) și decizia owner-ului; Esc o închide, iar focusul revine pe card.
  - **„Sugestie nouă”** deschide formularul deasupra tablei; poza planșei venită din editor (ADR 0111) îl deschide singură,
    deci drumul din manual rămâne același. După trimitere, formularul se închide și focusul revine pe buton.
  - **„Ale mele” / „Toate”**, comutatorul din schiță, pentru cine vede toate sugestiile și le poate scrie.
  - **Rolurile:** un rol care doar citește vede tabla, fără „Sugestie nouă”, fără tragere și fără „Mută în…”; autorul își
    vede sugestiile pe tablă, cu decizia în detaliu.
  - **Găsite de bancul vizual:** o adresă lungă ieșea din card și, la 760 px, lățea pagina (cardul și listele au acum coloana
    `minmax(0, 1fr)`); mesajele puse deasupra tablei o împingeau în jos la fiecare mutare, sub cursorul care trage (la mutări,
    cardul arată singur starea, iar decizia se anunță doar pentru cititorul de ecran).
  - **Probele:** 5 unitare noi (`test/unit/sugestii.tabla.test.ts`: coloanele și meniul, nota cerută, tabla, mutarea în drum,
    lista după răspuns), plus „Ale mele” în `sugestii.test.ts`. Proba e2e a Sugestiilor, rescrisă pe tablă, plus două noi
    (`test/e2e-emulator/sugestii.emulator.spec.ts`: tragerea în Acceptată cu cererea ținută pe drum, nota cerută în banda
    Respinselor și în Amânată, renunțarea, „Mută în…” din tastatură cu focusul pe card, a doua mutare pe versiunea nouă, nicio
    citire a sugestiilor după mutări, adresa lungă tăiată în card; mutarea refuzată care revine și „Reîncarcă”).
  - **Otrăvurile:** 41 / 41 prinse (`test/otravuri/A.4.py`: 14 unitare, 27 pe emulatoare), fiecare pe aserțiunea care îi
    țintește defectul, pe `699921a4`. La primul tur, pe emulatoare, 25 din 28:
    - E19 era nevalidă: titlul probei are paranteze, iar `--grep` e o expresie regulată, deci nu se potrivea nicio probă;
    - E27 (adresa lungă iese din card) scăpa fiindcă proba măsura cardul din banda Respinselor la 700 px, lat de 416 px, în
      care adresa încăpea. Acum adresa lungă e pe cardul urmărit în coloana cea mai îngustă și, la 700 px, în a doua coloană;
    - E12 a ieșit cu regula ei (`pointer-events: none` pe butonul oprit al benzii): în Edge, un buton oprit primește
      evenimentele tragerii și le lasă să urce (măsurat: `dragenter`, `dragover`, `drop` pe buton), deci cardul cade în bandă
      și fără regulă. Proba lasă acum cardul chiar peste buton.
  - **Găsit la reluarea în cloud:** proba „mutările nu recitesc lista” număra orice citire Firestore, iar pe o mașină mai
    lentă ultima citire a rezumatului de la intrare (amprenta publicării, din Diagnoza barei) sosea după listă și proba
    cădea. Acum numără doar citirile sugestiilor, și imediat după prima mutare. Bucla otrăvurilor de pe emulatoare, până acum
    doar locală, e în repo: `scripts/otravuri-emulatoare.py`.
  - **Mărimea:** `/admin` 121,2 → 124,1 / 200 kB (+2,9; linia ajunge la +17,6 din cei +25). Pornirea (107,9, cu ușa 112,2 /
    115) și totalul (760,9 / 800) sunt cele ale lui `main`.
- **A.5, 23.11: Utilizatori și Personal** (aceeași ramură, `wip/A.1-admin`, adusă înainte la `main` `c010e3d1`, care conține
  A.4; `3.Ae` în jurnalul etapei 3; lucrată într-o sesiune cloud). Fără reguli, permisiuni, indexuri, date sau funcții noi.
  - **Utilizatori, partea pură** (`src/admin/utilizatori/vedere.ts`): filtrele pe plan (Toate, Probă, Gratuit, Expirat,
    Dezactivat, Personal) cu numărul fiecăruia, după planul arătat la ora citirii; căutarea în conturile încărcate (adresa,
    numele sau uid-ul, fără diacritice și majuscule); dreptul pe scurt („nelimitat”, „încă N zile”, „din” data expirării);
    istoricul planului din rândurile de audit ale contului.
  - **Tabelul:** contul, planul, dreptul și crearea, cele mai noi întâi. Numerele filtrelor urmează căutarea: un filtru
    arată câte rânduri dă cu textul căutat. Contul ales stă alături (primul arătat, la intrare); un filtru care îl ascunde
    mută alegerea pe primul arătat, fără s-o mute înapoi. Un cont găsit de căutarea din antet vine ales. Sub 1 100 px,
    panoul trece sub tabel.
  - **Panoul contului:** planul de acum, numele, crearea și ultima logare; cu `conturi.administreaza`, schimbarea planului,
    cu formularul de azi (gratuit, o probă de N zile, dezactivarea sau reactivarea, cu „Salvează planul”). Schița avea trei
    butoane cu un clic; formularul a rămas, fiindcă o dezactivare dintr-un clic greșit ajunge imediat la client. Cât lista
    se recitește după o schimbare, nimic nu pleacă: planul arătat ar fi cel vechi, iar serverul l-ar refuza.
  - **Istoricul planului** se citește doar cu „Audit: citește”: rândurile de audit cu `tinta` egală cu contul (indexul
    simplu, fără ordine pe server, cel mult 100), ordonate în pagină. Arată deschiderea contului („Cont nou”) și fiecare
    schimbare, cu planul de după și cine a făcut-o (tu sau personalul). Fără permisiune, nu se arată și nu se cere nimic din
    audit.
  - **Personal, oamenii:** sub nume stă felul intrării, din sursa documentului omului: „Google, prin invitație”, „parolă,
    cont creat aici” sau „adăugat în consolă” (primul owner: felul lui de intrare nu e ținut nicăieri, deci nu se
    ghicește). Metodele legate mai târziu din fila Cont (ADR 0049 §6) nu se văd aici: ar cere o citire din Auth, pe server.
    Invitațiile deschise stau în aceeași listă, cu „invitație trimisă”, termenul și rolul. „Adaugă un om” deschide
    formularul de azi (invitația sau contul cu parolă).
  - **Matricea rol × permisiune:** o coloană pe rol (owner-ul are „tot”), un rând pe permisiunea din catalog, pe zone
    (`grupePermisiuni`), cu descrierea permisiunii pe rândul ei. Zona și fapta vin din eticheta de azi a permisiunii
    („Erori: citește”), despărțită (`etichetaPermisiune`): fără texte noi, iar o probă cere, în ambele limbi, ca permisiunile
    unei zone să aibă aceeași zonă în etichetă. Un rol se editează pe coloana lui (numele în cap, bifele în celule), cu
    „Salvează rolul”: aceeași cerere `salveaza-rol`, cu lista întreagă. Cât se editează un rol, celelalte nu se ating. Un rol
    folosit de un om sau de o invitație nu se șterge. Sub 1 200 px, matricea trece sub oameni; cu multe roluri, se derulează
    în cardul ei.
  - **Găsite de capturi** (cele două file la 1440, 1024 și 760 px, în ambele teme): la 1024 px, cu panoul alături, adresele
    din tabel se rupeau pe trei rânduri (de aici pragul de 1 100 px); matricea era înghesuită lângă oameni sub 1 200 px;
    căutarea își tăia textul de ajutor; datele cu oră nu încăpeau în coloane (`ziScurta`).
  - **Probele:** 8 unitare noi (`admin.utilizatori.test.ts`: filtrele, căutarea, dreptul, istoricul, ziua pe scurt;
    `admin.personal.test.ts`: grupele, eticheta, etichetele reale în ambele limbi). Pe emulatoare, probele celor două file pe
    așezarea nouă, plus două noi: un cont găsit de căutarea din antet și administrarea fără audit
    (`utilizatori.emulator.spec.ts`); matricea, editarea pe coloană și așezarea (`personal.emulator.spec.ts`). În proba
    owner-ului: filtrele, căutarea, istoricul din audit, citirea listei ținută după o schimbare.
  - **Otrăvurile:** 61 / 61 prinse la prima rulare (`test/otravuri/A.5.py`: 23 unitare, 38 pe emulatoare), fiecare pe
    aserțiunea care îi țintește defectul, pe `58bb8f54`. Înaintea rulării, patru probe au fost întărite, după ce lista a
    arătat că otrava lor ar fi scăpat: un sfârșit de probă ținut pe un cont dezactivat, deschiderea contului făcută de
    cineva din personal, „Salvează planul” oprit cât lista se recitește, „Renunță” din matrice fără nicio cerere spre server.
  - **Mărimea:** `/admin` 124,1 → 125,6 / 200 kB (+1,5; linia ajunge la +19,1 din cei +25). Pornirea (107,9, cu ușa 112,3 /
    115) și totalul (763,1 / 800) sunt cele ale lui `main`.
- **A.6, 23.11: Roadmap, Documentație și Setări** (aceeași ramură, `wip/A.1-admin`, peste A.5, încă neunită: sesiunea
  principală unește A.5 din `fe026f9f`; `3.Af` în jurnalul etapei 3; lucrată într-o sesiune cloud). Fără reguli, permisiuni,
  indexuri, date sau funcții noi.
  - **Roadmap:** peste 1 400 px, „Ce așteaptă de la tine” stă în stânga etapelor, lipit sus, cât ecranul de înalt, cu titlul
    fix și lista derulată în el, deci rămâne la vedere cât citești etapele și feliile. Mai îngust, deasupra lor, ca înainte.
    Cifrele trec peste amândouă coloanele.
  - **Pista cronologiei,** după lățimea secțiunii ei (container), nu a ecranului: cele 33 de etape stau pe un rând doar de la
    42rem în sus (~19,5 px pe coloană); mai îngust, pe rânduri, ca pe telefon. Sub 68,5rem, coloanele se strâng (1 px între
    ele), iar semnele unei etape (↑N, placa, live-ul) trec pe două rânduri, cu cifra mai mică. Înainte de felie, la 1 024 px,
    semnele intrau deja în coloana vecină; lângă listă, pista ar fi fost și mai îngustă.
  - **Documentație, partea pură** (`src/admin/documentatie/cuprins.ts`): cuprinsul (titlurile de nivel 2 și 3 de la rădăcina
    documentului, cu ancorele cititorului), secțiunea de acum (ultimul titlu urcat la 96 px de sus; la capătul paginii,
    ultimul), titlul de nivel 1 despărțit de rest și ziua din rândul „**Starea:**”.
  - **Cuprinsul,** cu cel puțin două intrări: peste 1 400 px, în a treia coloană, lipit sus, cu derularea lui (intrarea de acum
    ținută la vedere în el); între 900 și 1 400 px, deasupra documentului, în coloana lui, cu cel mult 12rem; pe telefon, între
    listă și document. Secțiunea de acum se măsoară o dată pe cadru, la derulare și la redimensionare. Un clic pune ancora în
    adresă și duce la titlu, și la al doilea clic pe aceeași ancoră (adresa nu se mai schimbă).
  - **Starea ADR-ului,** sub titlu: insigna (acceptat verde, propus albastru, din catalog) și ziua în care a primit-o. Ca să stea
    sub titlu, la un ADR titlul se randează separat de restul textului (ancora lui, aceeași: primul titlu e unic). Un document
    care nu e ADR se randează întreg, ca înainte.
  - **Setări:** sub fiecare buton, istoricul setării (`src/admin/setari/istoric.ts`, `IstoricSetari.tsx`): rândurile de audit cu
    `tinta` egală cu documentul ei (`setari/conturi`, `setari/raspunsuriRapide`; indexul simplu, cel mult 100, ordonate în
    pagină), cea mai nouă întâi, cu ziua, cine și ce s-a schimbat. Setările conturilor: zilele offline și păstrarea raportărilor
    rezolvate, de la cât la cât (prima salvare, de la implicite; dacă le păstrează, „implicitele, salvate”). Răspunsurile rapide,
    după etichetă: schimbate și adăugate în ordinea listei noi, apoi cele scoase; fără nimic din ele, „ordinea”. Se citește din
    nou după fiecare salvare. Fila e doar a owner-ului, care are „Audit: citește”, deci istoricul n-are o condiție a lui.
  - **Găsite de capturi** (cele trei file la 1440, 1024 și 760 px, în ambele teme): semnele pistei peste coloana vecină (de
    aici regulile pistei de mai sus); data și cine, mai mici decât restul rândului istoricului.
  - **Probele:** 7 unitare noi (`admin.setari.istoric.test.ts`, `admin.documentatie.cuprins.test.ts`, cu ADR-ul liniei din
    repo). Pe emulatoare, 3 noi: cuprinsul și starea (`documentatie.emulator.spec.ts`: alături și deasupra, fiecare intrare cu
    titlul ei, secțiunea de acum la derulare și la capătul paginii, cu ADR 0116, a cărui ultimă secțiune e scurtă, clicul și al
    doilea clic, ADR-ul propus, ADR-ul fără secțiuni, PLAN.md fără insignă), Roadmap-ul (lista alături și la vedere la
    derulare, semnele în coloana lor la 1 440, 1 024, 990 și 940 px, rândurile pistei) și istoricul setărilor
    (`utilizatori.emulator.spec.ts`: rândurile de audit ale fiecărei setări sub butonul ei, un document străin lăsat deoparte,
    o salvare nouă în capul istoricului ei); plus istoricul în proba setărilor și în a răspunsurilor rapide.
  - **Otrăvurile:** 54 / 54 prinse (`test/otravuri/A.6.py`: 23 unitare, 31 pe emulatoare), fiecare pe aserțiunea care îi
    țintește defectul. La prima rulare (`326bcf6e`), 52 / 53: E19 (golul de 1 px dintre coloanele pistei) a scăpat, fiindcă
    la 1 024 și 1 440 px semnele încap și fără el. Măsurat pe lățimi, regula contează între ~960 și ~1 000 px, iar sub ~960 px
    cele 33 de coloane erau prea înguste oricum; de aici pista pe rânduri sub 42rem (`ecba6fa6`), cu proba la 990 și 940 px și
    otrava pragului (E31). Pe `ecba6fa6`, E19 și E31 prinse. `verifica` pe toate listele: aceleași VOID-uri ca pe A.5.
  - **Mărimea:** `/admin` 125,6 → 127,5 / 200 kB (+1,9; linia ajunge la +21,0 din cei +25, deci pentru A.7 rămân ~4 kB).
    Pornirea (107,9, cu ușa 112,3 / 115) și totalul (763,1 / 800) sunt cele ale lui `main`.
- **A.7, 24.11: telefonul** (aceeași ramură, `wip/A.1-admin`, peste A.11e a liniei utilizării, ADR 0262; `3.As` în fișă). Sub
  640 px:
  - **jos**, bara cu Azi, Erori și Tichete (doar cele pe care rolul le vede, cu numerele lor, ca în bara laterală) și „Mai
    mult”; fila de acum, marcată (`aria-current`);
  - **antetul** are ☰ (stânga), semnul, titlul și insigna; textul instanței se ascunde, restul (căutarea, limba, „Înapoi”,
    contul) trece pe rânduri;
  - **bara laterală e un sertar**: ascunsă, deschisă de ☰ sau de „Mai mult” (același sertar, `aria-expanded` pe amândouă),
    închisă de o filă aleasă sau de Escape; în el, filele pe grupuri, cu titlurile lor;
  - **un tichet** se citește și primește răspuns (lista și conversația, una sub alta, ca sub 800 px); **proiectul atașat se
    descarcă doar de pe calculator**: pe telefon, un text cu mărimea lui ține locul butonului (CSS-ul alege, butonul rămâne
    în pagină);
  - conținutul are loc sub bara de jos (`padding-bottom` cât ea, plus zona sigură), deci nimic de la capătul paginii (butonul
    trimiterii) nu stă sub ea.

  Probele: 2 e2e noi pe emulatoare (`conversatia.emulator.spec.ts`: owner-ul la 390 px, cu bara de jos, sertarul prin ☰ și
  prin „Mai mult”, Escape, o filă aleasă, tichetul cu răspunsul, proiectul doar pe calculator, nimic în afara ecranului,
  butonul trimiterii deasupra barei, apoi la 1 280 px fără bară și fără ☰; un rol doar cu tichetele, cu bara de jos după
  drepturi). Otrăvurile: 9 / 9 (`test/otravuri/A.7.py`, toate pe emulatoare); E08 (bara peste capătul conținutului) cădea
  întâi pe termenul clicului, iar proba măsoară acum butonul față de bară înaintea clicului. Mărimea: `/admin` 137,9 → 138,2 /
  200 kB (linia ADR 0260, cu A.7, rămâne sub ținta ei); pornirea și totalul, neschimbate.
