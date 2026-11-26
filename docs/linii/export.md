# Linia exportului: fereastra „Exportă G-code” (ADR 0290)

- **Ce face:** desenează din nou fereastra exportului, cu un desen care explică fiecare setare, fără să schimbe ce face
  fereastra (aceleași câmpuri, aceleași valori, același program).
- **Ramura:** `wip/28.8-export`, făcută din `origin/main` `d6fd5d68` pe 23.11.2026.
- **ADR-urile:** 0290–0299 (libere pe 23.11). **Canalul:** `export` al instanței de test.
- **Feliile:** 28.8↑a–g (ADR 0290), în etapa 28, adusă în etapa 3, fără mașină, unite în `main` pe 24.11. **Linia s-a
  redeschis pe 25.11**, după audit: feliile 28.8↑h–q, din ADR 0291 (acceptat cu „1a, 2a, 3a, 4a, 5a, 6a, 7a, 8a, 9a”).

## Cererea

Pe 23.11, după ce owner-ul a încercat incrustația în trepte (12.1↑e-4), cu două capturi ale ferestrei: „in primul rand, nu imi
place deloc fereastra asta, nici nu este clar ce anume imi ceri sa fac, vreau sa facem un design pentru fereastra export, si
vreau ca ficare setare sa fie insotita de o ilustratie sugestiva, ca sa ajute userul sa inteleaga ce reprezinta”.

## Starea

- **23.11: ADR 0290 propus,** cu inventarul setărilor, trei direcții (B recomandată: lista și fișa), desenele și costul lor
  măsurat, și patru întrebări. Schița: <https://claude.ai/artifact/FX4y5HfSixLXthAcnrzUQP> (fereastra propusă de încercat, în
  ambele teme, la 1280 și 1024 px; 33 de capturi ale ferestrei de azi; formularul întrebărilor).
- **23.11: ADR 0290 acceptat, cu toate recomandările („1a, 2a, 3a, 4a”).** Feliile, precizate la acceptare: 28.8↑a mută toate
  câmpurile în fișă (fără desene încă), b–e aduc desenele pe familii, f rezultatul, Atelier și fișa de sine stătătoare pentru
  Clasic și Pas cu pas (aranjamentele lor, 28.2↑ și 28.4↑, nu sunt încă scrise).
- **23.11: tabla „Exportul G-code” pe canvas-ul aranjamentelor** (<https://claude.ai/artifact/VuzcaEYQsLoTvRBxpnSak2>): fereastra
  în cele patru aranjamente.
- **23.11: 28.8↑a gata** (carcasa: lista și fișele, grupurile pe întrebări, explicația câmpului activ, greșelile în grup,
  „Du-mă la …”, Rezultatul adus o singură dată), pe ramură și pe canalul `export`; neunită. Otrăvurile 18 / 18. Totalul +2,3 kB.
  Detaliile: ADR 0290, „Implementarea 28.8↑a”.
- **24.11: 28.8↑b-1 gata** (desenele întrebărilor: colțul XY0, Z0 cu supracursa, freza, adâncimea, sensul, rampa, intrările,
  urechile, din valori, cu cota activă; caseta explicației își ține înălțimea), pe ramură și pe canalul `export`; neunită.
  Otrăvurile 16 / 16. Totalul +4,9 kB (800,8 / 900). Detaliile: ADR 0290, „Implementarea 28.8↑b-1”. Completul CI verde pe
  `5e1f7d64`.
- **24.11: 28.8↑b-2 gata** (alegerile ca cartonașe cu poze: colțurile, locurile urechilor, direcția, unitățile, schimbarea
  frezei, foile; despărțirea cu poza ei), pe ramură și pe canalul `export`; neunită. Otrăvurile 11 / 11. Totalul +1,3 kB
  (802,1 / 900). Detaliile: ADR 0290, „Implementarea 28.8↑b-2”. După `main` adus (A.8c, A.8d: catalogul controalelor),
  numele cartonașelor scrise în sursă (`c10f2f37`); completul CI verde pe el.
- **24.11: 28.8↑b-3 gata** (tăietura ca cartonașe, poza tăieturii în listă; inputul cartonașelor oprite ascuns), pe ramură și
  pe canalul `export`; neunită. Otrăvurile 7 / 7. Totalul 808,8 / 900. 28.8↑b e încheiată; urmează 28.8↑c (buzunarul și
  găurirea).
- **24.11: 28.8↑c gata** (traseul și coborârea buzunarului ca cartonașe; desenele golirii, coborârii, frezelor de rest și
  găuririi; nota rampelor zigzagului pe trecerea egală), pe ramură și pe canalul `export`; neunită. Otrăvurile 20 / 20.
  Totalul 811,4 / 900 (+2,6 kB). Detaliile: ADR 0290, „Implementarea 28.8↑c”. Înainte, completul de pe b-3 reparat
  (`6fc38abf`). Completul CI verde pe `83f44f9e` (unit 10 053 / 0, e2e 664 / 664, emulatoarele 120 / 120 și 50 / 50).
  Urmează 28.8↑d (V-carve-ul, fundul plat, incrustația în V, banda).
- **24.11: 28.8↑d-1 gata** (secțiunea V-carve-ului cu fundul plat, inelele V sau lemnul rămas; secțiunea incrustației în V;
  lemnul din jurul dopului pe cartonașe; frezele la miime în desene), pe ramură; neunită. Otrăvurile 15 / 15. Totalul
  812,7 / 900 (+1,3 kB). Urmează 28.8↑d-2: banda, cu câmpurile ei mutate din grupul incrustației în grupul lor.
- **24.11: 28.8↑d-2 gata** (câmpurile benzii în grupul lor, desenul semifabricatului dopului cu banda, decuparea și puntea), pe
  ramură; neunită. Otrăvurile 11 / 11. Totalul 813,4 / 900 (+0,7 kB). 28.8↑d e încheiată; urmează 28.8↑e (incrustația cu
  pereți drepți).
- **24.11: 28.8↑e-1 gata** (câmpurile incrustației cu pereți drepți în grupurile lor: Locașul, Treapta, Dopul; locașul, treapta,
  dopul și sprijinul pe cartonașe), pe ramură; neunită. Otrăvurile 6 / 6. Urmează 28.8↑e-2 (desenele).
- **24.11: 28.8↑e-2 gata** (desenele locașului, treptei și dopului așezat, din `dopDreptDesen`), pe ramură; neunită.
  Otrăvurile 19 / 19. Totalul 820,4 / 900 (+1,5 kB). 28.8↑e e încheiată; urmează 28.8↑f (rezultatul în fereastră,
  Atelierul și densitatea mare, fișa de sine stătătoare, privirea cu fontul lat).
- **24.11: 28.8↑f-1 gata** (privirea cu fontul lat: pe telefon, rândul operației își ține lățimea, nota ordinii lipsește de pe
  bandă, ordinea stă la capăt; în densitatea mare, câmpurile, bifele și butoanele listei au 48 px), pe ramură; neunită.
  Otrăvurile 9 / 9. Urmează f-2 (Rezultatul pe grupuri) și f-3 (fișa operației ca componentă de sine stătătoare).
- **24.11: 28.8↑f-2 gata** (Rezultatul pe grupuri: de văzut, fișierele, rezumatul, simularea; timpul și avertismentele în
  rândul listei), pe ramură; neunită. Otrăvurile 7 / 7. Urmează f-3.
- **24.11: 28.8↑f-3 gata** (fișa operației ca componentă, `FisaOperatie` cu `ContextFisa`; tipurile și ajutoarele rândului în
  `exportRand.ts`), pe ramură; neunită. Otrăvurile 7 / 7. **Linia are toate feliile ADR 0290 (a–f)**; unirea, la cuvântul
  owner-ului.
- **24.11: owner-ul a încercat fereastra pe canal** („e ok”) și a cerut închiderea la Esc și la clic în afară: **28.8↑g gata**
  (Esc ca Închide, nu și cât fereastra e ascunsă de modul urechilor; clicul pe fundal doar cu apăsarea și ridicarea afară),
  pe ramură; neunită. Otrăvurile 6 / 7 (E03 echivalentă azi).
- **24.11: unirea.** Owner-ul, aici: „ok, cand e verde fa unirea”; în sesiunea principală: „da, uneste fereastra exportului
  cand e verde si sa imi spui cand pot sa o arhivez”. Commit-ul de unit e `4ee623d3` (28.8↑a–g, cu `main` `7312d685` adus,
  adică loturile 19–21). Completul CI, verde pe el: unit 10 240 / 0 (12 sărite), e2e 756 / 756, funcțiile pe emulatoare
  136 / 136, paginile 57 / 57. Pornirea 110,2 kB (cu ușa 114,9, cu Atelierul 115,2 / 120), totalul 846,8 / 900 (linia, +16,3
  kB față de `main`), `/admin` 138,2. **Unirea o face sesiunea principală,** în lotul 24 (`unire-2411y`, `c4ca5ec2`), peste
  lotul 23; ciocnirile au fost doar în traducerile roadmap-ului (27 de chei noi ale liniei) și în catalogul controalelor
  (scris din nou). După unire, sesiunea liniei se poate arhiva, iar ramura `wip/28.8-export` de pe `origin` intră în lista de
  șters a owner-ului.
- **25.11: auditul ferestrei,** la cererea owner-ului, prin sesiunea principală, înaintea arhivării: `audit-export.md` (21 de
  constatări, cele mai importante întâi, feliile propuse 28.8↑h–m și nouă întrebări). Două nepotriviri între desen și
  program, spuse imediat sesiunii principale: trecerile cu supracursa prin foaie și găurirea cu elice. Doar documente.
- **25.11: răspunsurile owner-ului la audit:** „1a, 2a, 3a, 4a, 5a, 6a, 7a, 8a, 9a”. ADR 0291, acceptat, cu feliile
  28.8↑h–q: h–l după unirea lui 16.A↑b-5 (linia frezelor lucrează în fișa operației), n (numele fișierului) și o (centrul
  foii ca origine) înainte, fiindcă nu ating fișa; p (avansul și Z-ul sigur) și q („Toate foile” cu toate operațiile) după
  feliile de care depind. 8a (pasul scurt din Atelier) e al liniei aranjamentelor, 9a (adaosul și trecerea de finisare)
  o felie de CAM după placa 2, cu documentul nou.
- **25.11: 28.8↑n gata** (numele fișierului, 5a), pe ramură; neunită. Câmpul în „Mașina și fișierul”, după Unități;
  propunerea din numele foii; numele aplicat după calcul, deci aceiași octeți. Otrăvurile 16 / 16. Pornirea +0,1 kB,
  totalul +1,0 kB (885,8 / 1 000). Urmează 28.8↑o (centrul foii ca origine).
- **25.11: 28.8↑o gata** (centrul foii ca origine XY0, 6a), pe ramură; neunită. Montajul cu `centru`, antetul citit de
  sender, punctul din mijlocul desenului XY0; colțurile, octet cu octet. Otrăvurile 13 / 13. Pornirea +0, totalul +0,1 kB
  (885,9 / 1 000). Proba pe mașina owner-ului (zero-ul în mijlocul foii, o placă privită întâi în aer) rămâne a owner-ului.
  Unită în `main` pe 25.11 (`3fd3bf49`), odată cu 28.8↑n (`1eda6f0b`).
- **25.11: 28.8↑h gata** (rândul „pe hârtie”, 1a), pe ramură; neunită. Desenele și notele fișei din funcțiile lucrării
  (`src/app/hartieExport.ts`): adâncimea tăiată cu supracursa prin foaie (constatarea 1), felul găuririi cu elicea desenată și
  cercul care nu se găurește ca greșeală înainte de clic (constatarea 2). Programul, octet cu octet. Otrăvurile 21 / 21.
  Pornirea +0, totalul +1,4 kB (891,7 / 1 000). Urmează 28.8↑i (viteza).
- **25.11: 28.8↑h-2 gata** (reparația lui „Du-mă la …”, cerută de sesiunea principală după completul unirii lui h peste
  16.A↑b-4, căzut la `export.hartie.spec.ts:51`). Ramura are `origin/unire-2511t` adus (b-4, 3.Au), cu ciocnirile rezolvate ca
  în `unire-2511u`. `du(cheie, true)` aduce în vedere grupul primei greșeli și pune focusul pe câmpul ei; diametrul frezei e
  marcat greșit cât un cerc nu se găurește. Otrăvurile 6 / 6. Totalul 893,5 / 1 000 (+0,2 kB). Apoi, la cererea sesiunii
  principale, `origin/unire-2511w` (16.A↑b-6, 3.Tu) adus în ramură, cu proba cu nota bibliotecii desfăcută; apoi
  `origin/unire-2511x` (18.1↑c, relieful; apoi `b35e2f75`, cu 16.A↑b-7), cu finisarea în `catFoaia` și proba ei pe hârtie.
  Unită în `main` pe 25.11 (`7d74ade2`).
- **25.11: 28.8↑i gata** (viteza ferestrei, constatarea 4 a auditului). Peste 12 fișe, doar cele din jurul panoului, cea
  curentă cu vecinele și cea cu focusul se randează; rândurile listei sunt `memo`. Pe 150 de operații: deschiderea 9,7 s →
  ~0,5 s (următoarele ~0,15 s), o tastă 96 → ~10 ms. Primul complet a căzut la proba de viteză: timpul citit pe treptele lui
  `expect` și, găsit apoi sub suprasarcină, `content-visibility` pe rânduri (un rând departe de vedere avea înălțimea 0, deci
  clicul cădea pe listă); amândouă reparate la cauză. Otrăvurile 10 / 10. Totalul 909,4 / 1 000 (+0,3 kB). Unită în `main` pe
  26.11 (`953205a8`).
- **26.11: 28.8↑j gata** (greșelile pe înțeles, constatările 5, 6, 7 și 15). „Dă-i T{n}” lângă conflictul de freze, cu roșul
  doar pe frezele cu numărul ciocnit; greșeala pe câmp, cu marginile ei, și „—” în listă; nota în locul avertismentului de viteză
  cu setările din fabrică; refuzurile din calcul cu numele elementelor, cu virgula și cu „Du-mă la …”. Totalul 910,5 / 1 000
  (+1,1 kB). Unită în `main` pe 26.11 (`93ff3b29`).
- **26.11: 28.8↑k gata** (curățenia vizuală, constatările 8, 10, 11, 12, 16, 17 și 21). Capul listei nu se mai strânge; bifele
  cu căsuța lângă etichetă; fundul plat pe rânduri, cu lista „Din frezele mele” pe rândul ei; bifa „și tăieturile cât foaia”
  doar cu supracursă; golurile desenului Z0 doar când sunt în proiect; diametrul frezei în V sub vârf; titlurile în engleză;
  textele lungi prescurtate, cu „Mai mult” al grupului și al notelor. Totalul 919,2 / 1 000 (+0,5 kB). Unită în `main` pe
  26.11 (`3cdd23f5`).
- **26.11: 28.8↑l gata** (tastatura și cititorul de ecran, constatarea 13). Lista duce focusul pe titlul fișei; titlul grupului
  înaintea explicației; câmpurile descrise de explicația întreagă și de greșelile grupului; `aria-live` doar pe greșeli; pe telefonul culcat, banda listei pe
  un rând. Totalul 919,5 / 1 000 (+0,3 kB). Cu ea, feliile din ADR 0291 cerute de audit pentru fereastră (h–l) sunt gata; rămân p și q.
  Unită în `main` pe 26.11 (`c3a0c184`).
- **26.11: 28.8↑q gata** („Toate foile” cu operațiile fiecărei foi, constatarea 18, răspunsul 7a). Lista și fișele au capul
  fiecărei foi, cu operațiile ei; o piesă comună (copia legată, plăcuțele din CSV) stă o dată, la prima ei foaie; numerele și
  „A mea” pe foaie; grosimea pe rând; Exportă scrie toate piesele; Rezultatul pe foi. Programul fiecărei foi, cel exportat singur.
  Unită în `main` pe 26.11 (`d3da8953`), cu titlurile alese de owner („Tăietura”, „Golirea”, „Coborârea”).
- **26.11: 28.8↑p gata** (lipsurile 1 și 2, răspunsul 3a; mișcă mașina). În „Mașina și fișierul”, grupul „Z-ul sigur și
  parcarea”: Z-ul sigur (1–100 mm, implicit 5) și locul de la final (rămâne sus, la XY0, într-un punct), setări ale aplicației,
  ca supracursa; postul scrie parcarea ca `G0 X Y` după `M5`, în coordonatele programului, în fiecare fișier. Pe „Scrisă de
  mână”, turația, avansul și plonjarea, în `scula.regim` (v27, fără schemă nouă); goale, programul de azi. Probate pe hârtie,
  pe poartă, pe oracolul simulării, pe sender și pe emulatorul GRBL; fără valori, octet cu octet. Proba pe mașină, întâi în
  aer, rămâne a owner-ului.

## Ce s-a găsit (23.11)

- **Fereastra:** `src/ui/DialogExport.tsx` (1 918 rânduri), legată în `src/ui/ExportConectat.tsx`, adusă la cerere din
  `src/app/App.tsx` (`incarcaDialogExport`); bucata ei: 18,9 kB gzip.
- **Câmpurile:** 76 de nume `data-camp` scrise în cod, plus cele 5 ale frezelor de rest pe trei liste (`rest-*`, `fund-rest-*`,
  `dop-rest-*`, din `frezeRest`, cu prefixul `pre`). Fără cele trei note (`banda-minima`, `banda-placa-minima`,
  `rampe-zigzag`): 88 de câmpuri, 19 mereu la vedere, 69 după o alegere sau o condiție. Cu 11.3↑f (unită în `main` pe 23.11,
  `c8b235ab`), încă trei locuri ale urechilor (`urechi-lungi`, `urechi-scurte`, `urechi-mijloc`): 91 și 72. Fiecare unire a
  lui `main` care atinge `DialogExport.tsx` se verifică față de inventarul din ADR 0290.
- **Explicațiile:** 61 de chei `export.*.titlu` ale câmpurilor (fără titlurile ferestrei, ale raportului și ale modului
  urechilor), toate doar în `title`.
- **Lățimea:** cutia dialogului are `max-width: min(56rem, 100vw − 2rem)` (`src/app/stil.css`, `.dialog-cutie`), deci 894 px de
  conținut la 1280 și la 1024; tabelul are 1 270 px (1 414 la V-carve; 1 206 / 1 350 în engleză).
- **Trecerile** sunt egale: n = ⌈A / p⌉, fiecare de A / n (`adancimiTreceri`, `src/cam/profil.ts`); rampele zigzagului:
  `src/cam/coborare.ts:40`. Desenele le folosesc pe acestea, iar o probă le compară.
- **Sensul** (ADR 0027): cu M3, urcare = piesa în dreapta drumului; exteriorul în urcare merge orar, interiorul trigonometric.
- **Probele care citesc fereastra:** 15 fișiere e2e (`buzunar`, `conversie`, `export-foi`, `export`, `gaurire`, `gravare`,
  `incrustatie`, `incrustatieBanda`, `incrustatieDreapta`, `paralel`, `placute-iesire`, `rest`, `rezumat`, `supracursa`,
  `vcarve`); 24 de fișiere citesc câmpuri `data-camp` ale ei.
- **Costul desenelor din schiță** (terser, gzip -9): 11 desene din valori, cu ajutoarele lor, 5,8 kB; 53 de poze, 1,9 kB ca JS,
  1,9 kB ca fișier SVG. Totalul pe 23.11: 770,0 / 800 kB (770,9 cu 11.3↑f); pornirea 108,5 / 115 (cu ușa 113,0).

## Capcanele

- **Selectorii probelor (din 28.8↑a):** o operație e `[data-fisa="op"][data-operatie="…"]` (fișa, cu toate câmpurile ei,
  inclusiv cele de sub bife); în listă, `[data-nav-op="…"]` (locul, „cu N”, mânerul, săgețile) și `[data-nav="…"]` (butonul;
  `foaia`, `masina`, `rezultatul` sau cheia operației). Grupurile: `[data-grup="…"]`, cu `[data-explicatie]` și `[data-greseala]`.
  Ce nu se aplică nu apare (`toHaveCount(0)`), nu e oprit.
- **Grupul unui câmp nou:** în `GRUP_CAMP` (`src/ui/exportGrupuri.ts`); altfel `export.grupuri.test.ts` cade.
- **Desenele (din 28.8↑b-1):** `[data-grup="…"] [data-desen] svg`; cotele `[data-cota="<data-camp>"]`, aprinse cu `data-aprinsa`;
  colțurile `[data-colt]` (cel ales, `data-ales`), urechile `[data-ureche]` (cu `data-latura` `o` / `v`), trecerile `[data-trecere]`.
  Ce spune un desen nou (o formulă) se socotește în `exportDeseneCalcul.ts` și se compară cu lucrarea în `export.desene.test.ts`.
- **Cartonașele (din 28.8↑b-2):** o alegere e `input[data-camp="…"][value="…"]` (grupul, `[data-alegere="…"]`); în probe,
  `alege(loc, camp, v)` și `aleasa(loc, camp)` din `test/e2e/ajutor-export.ts`.
- **Tăietura (din 28.8↑b-3):** `input[data-camp="latura"][value="…"]` (`alege(loc, 'latura', v)`); valoarea, pe cel bifat. Găurirea
  e pe cartonaș și oprită pe un rând fără cercuri: o probă care caută „se poate găuri” numără `:enabled`.
- **Lista operațiilor se derulează:** la 1280 × 720 are ~480 px văzuți, iar un rând ~117 px (cu poza tăieturii, b-3). O probă
  care trage sau dă clic cu mausul pe un rând aduce întâi ținta în vedere (`tragePeRand` din `export.spec.ts`): mausul nu apasă
  ce taie marginea listei. Pe 24.11, mânerul celui de-al doilea rând stătea local la 5 px de ea, iar pe runner, cu fonturile
  lui, dincolo: completul a picat doar acolo (reprodus local la 700 px înălțime).
- **Cota câmpului activ urmează ultimul dintre focus și maus:** cu mausul lăsat pe un cartonaș (după `alege`), derularea de la
  un `fill` pune sub maus alt câmp, care ia explicația și cota. O probă care cere cota aprinsă după scriere dă întâi clic în
  câmp (ca omul). Traseul și coborârea buzunarului sunt cartonașe din 28.8↑c (`alege(fisa, 'strategie' | 'coborare', v)`;
  vizibilitatea, pe `[data-alegere="coborare"]`).
- **Incrustația cu pereți drepți (din 28.8↑e-1):** locașul, treapta, dopul și sprijinul sunt cartonașe
  (`alege(fisa, 'inc-locas' | 'inc-treapta' | 'inc-dop' | 'inc-sprijin', v)`); variantele sprijinului se citesc pe
  `[data-alegere="inc-sprijin"] .dx-card > span`. Cutia `[data-incrustatie][data-fel="drept"]` e acum în fiecare din cele trei
  grupuri: o probă caută câmpuri prin ea, nu o numără.
- **Un grup cu corpul gol nu se randează** (`corp(g) === null`): așa a stat „banda” până la 28.8↑d-2, cu câmpurile în grupul
  incrustației. Un câmp nou stă în corpul grupului lui din `GRUP_CAMP`, altfel explicația și desenul lui ajung în alt grup.
- **Catalogul controalelor** (ADR 0262, din `main`, 24.11): se scoate din `data-camp="…"` (și celelalte atribute de nume)
  scrise în sursă pe un control sau pe o componentă; un nume dat prin proprietate (`camp={…}`) sau din șablon nu intră, iar
  un `id="…"` pe o componentă intră. După o schimbare a câmpurilor, `node scripts/catalog-controale.ts --scrie`
  (`utilizare.catalog.test.ts` cade până atunci). Clicul pe un cartonaș se dă pe cartonaș (`.dx-card`), nu pe textul
  lui: inputul transparent îl acoperă. Tokenurile pozelor stau pe `.dx-ilu`.
- **Otrăvurile cu multe spec-uri e2e** (~2–3 min fiecare) se rulează câte două: o repornire a procesului oprește rularea, iar
  otrava în lucru rămâne aplicată în clonă (`git status` acolo, înainte de reluare).
- **Proba „adâncimea” (`export.desene.spec.ts:48`) a căzut de trei ori în clonă, sub otrăvuri fără legătură cu ea** (28.8c E01,
  28.8e2 E03 și E08, la ~6,2 s: o așteptare de 5 s), și niciodată altfel: 66 de rulări în paralel, 24 cu procesorul plin, 44 în
  serie, 33 în clona refăcută. Eroarea n-a fost prinsă (unealta păstrează doar numele probei). Dacă mai cade, se rulează
  spec-ul direct în clonă, cu `--workers=1`, ca să se vadă așteptarea care expiră.
  Pe 24.11 a căzut și aici, în cele 47 de spec-uri ale exportului, tot la cota aprinsă: mausul rămânea peste panoul fișelor
  (unde era butonul „Exportă G-code”), care ascultă `pointerover`. Cu mausul pe loc, derularea n-a mutat cota în încercări, deci
  cauza nu e dovedită; de atunci, `export.desene.spec.ts` duce mausul în afara ferestrei (`mausulDeoparte`). Dacă mai cade, e
  altceva.
- **Proba privirii** (`export.privire.spec.ts`, din 28.8↑f-1) cere, cu fontul lat, ro și en: fereastra în ecran, nimic în
  afara ei sau a panoului fișelor, niciun text mai lat decât cutia lui; pe telefon, rândurile listei atinse, banda sub o
  cincime de ecran, fiecare element al ei cât ecranul; în densitatea mare, 48 px pe fiecare țintă. Un grup nou al fișei sau o
  alegere nouă trece prin ea dacă apare pe una din tăieturile ei; altfel, se adaugă acolo.
- **Din 28.8↑f-3, fișa unei operații stă în `src/ui/FisaOperatie.tsx`** (câmpurile, desenele și cartonașele ei), iar foaia,
  mașina, lista, Rezultatul și starea în `DialogExport.tsx`. Tipurile și ajutoarele pure ale rândului (`Rand`, `BunRand`,
  implicitele, verificările) stau în `exportRand.ts`. Ce îi trebuie fișei nou intră în `ContextFisa`, nu ca import din
  fereastră (ar face un ciclu). Proba grupurilor citește `data-camp` din ambele surse.
- **Caseta explicației își ține înălțimea** (`rezervaExplicatii`): un text nou mai lung (un `title` nou în grup) e măsurat singur.
  O probă care compară poziții după un focus le măsoară în conținutul panoului (`[data-fise]`, cu `scrollTop`): focusul poate
  derula panoul.
- **Starea exportului se schimbă de două ori** (descărcarea, apoi simularea): ce se face „după export” se face la trecerea în
  rezultat, nu la fiecare schimbare a stării.
- **În containerul cloud,** `masina-wifi-pod.spec.ts:44` cade și pe `main` curat (`esp3d.local` nu se rezolvă aici); în CI trece.

- **Capturile:** un `scrollIntoView` pe un câmp din dreapta derulează și dialogul în lateral; pentru capturi cinstite, după el,
  `scrollLeft = 0` pe `.dialog-cutie`. Captura derulată rămâne în schiță ca exemplu (așa o vede omul după un clic).
- **Cum s-au făcut:** `npm run build`, `npx vite preview --port 4173`, apoi un script Playwright (Edge, `deviceScaleFactor: 2`)
  care desenează din paletă („Adaugă dreptunghi” / „Adaugă cerc”, ca `test/e2e/ajutor-panza.ts`), deschide
  `[data-actiune="export.gcode"]` și alege pe `tr[data-operatie="e1/e1"]` (dreptunghiul) și `e2/e2` (cercul). A doua foaie:
  `[data-actiune="foaie.adauga"]` în `lista-vectori`.
- **Un server local de fișiere statice** nu trimite setul de caractere al paginii schiței (diacriticele ies stricate); la
  publicare, scheletul îl pune.
- **Numele fișierului (28.8↑n):** regula stă în `src/post/numeFisier.ts`, iar baza `cncvs2-<colț>` se scrie doar de
  `bazaFisier`. Un nume nou al exportului (alt sufix, alt fel de fișier) pornește de la ea, ca `cuBaza` să-l găsească.
  Numele ales se aplică după calcul, pe firul principal (`cuNumele` din `actiuniExportCalcul.ts`), nu în worker și nu în
  `App.tsx` (pornirea). Câmpul e `data-camp="nume-fisier"`, în grupul `fisier`; nota de sub el, `data-nume-rezultat`;
  Rezultatul unui singur fișier poartă `data-fisier`. O probă care cere numele de azi nu dă foii un nume.
- **Centrul ca origine (28.8↑o):** originea e `OrigineXY` (`src/ir/montaj.ts`), nu `ColtOrigine`; o listă nouă de origini
  pleacă de la `ORIGINI` (în interfață, `ORIGINI` din `exportRand.ts`). Un text care spune „colțul {colt}” are varianta lui
  pentru centru (`….centru`): desenul XY0, panoul Mașina, raportul foilor. Oracolele porții și buzunarului citesc centrul pe
  hârtie; un tip de origine local al unei probe care primește corpusurile oracolului acceptă și `centru`. Cu centrul, I / J
  pot diferi cu o unitate a ultimei zecimale de cele ale unui colț (strategia B a postului).
- **Rândul „pe hârtie” (28.8↑h):** ce spune fișa despre ce face lucrarea (adâncimea tăiată, trecerile, felul găuririi,
  pașii ciocănirii) vine din `ContextFisa.hartie`, socotit în `src/app/hartieExport.ts` cu funcțiile lucrării, nu din formule
  scrise în `src/ui`. Ce aduce acolo intră în bucata ferestrei: doar module mici ale lucrării, fără importuri grele
  (`treceri.ts`, `gaurireFel.ts`, `prinFoaie.ts`); parcurgerea buclei, offsetul și degajările rămân în workerul CAM (de aceea
  urechile schiței, pasul lateral și coborârea rămân în `exportDeseneCalcul.ts`, cu proba lor). O regulă nouă a lucrării pe
  care o arată fișa se scoate într-un modul mic, folosit de amândouă, nu se copiază. Rândul primește supracursa și bifa ca
  cererea de la Exportă (supracursa doar cât e pozitivă și bună). Un cerc care nu se găurește e greșeală în grupul Freza și
  oprește Exportă (`gauriBune`), nu doar o notă.
- **„Du-mă la …” (28.8↑h-2):** `du(cheie, true)` aduce în vedere grupul primei greșeli a fișei, nu doar capul ei, și pune
  focusul pe primul câmp cu `aria-invalid` din grup. O greșeală nouă stă în grupul câmpului de reparat, iar câmpul acela e
  marcat `aria-invalid` cât ține greșeala; altfel focusul rămâne pe buton. O probă care judecă „se vede” măsoară dreptunghiul
  față de panoul `[data-fise]` (ca `cumSeVede` din `export.hartie.spec.ts`), nu cu `toBeInViewport()`, care trece cu un pixel.
- **Fereastra „Frezele mele” într-o probă se închide cu ✕ (`[data-freze="inchide"]`):** până la 16.A↑b-7, după salvare sau
  ștergere focusul cădea din ea, iar Escape nu mai ajungea la fereastră (căderile lui `exportFrezeNota` și
  `exportFrezeInapoi`, spuse liniei frezelor pe 25.11, reparate de ea în b-7). ✕ merge oricum.
- **Peste 12 operații, o fișă poate fi doar locul ei (`[data-fisa="op"][data-gol]`, cu titlul):** se randează cele din jurul
  panoului, cea curentă cu vecinele și cea cu focusul (28.8↑i). O probă care lucrează într-o fișă departe o aduce întâi (clic în
  listă, „Du-mă la …” sau derulând), iar una care numără fișele randate le caută după `:has([data-grup])` sau
  `:not([data-gol])`. Un câmp nou al fișei nu cere nimic; o regulă nouă a ferestrei își are proba în `export.viteza.spec.ts`.
- **O probă de timp măsoară în pagină și ia cea mai bună încercare** (`export.viteza.spec.ts`): `expect` din Playwright
  întreabă pagina la 0, 100, 350, 850 ms…, deci un timp citit așa sare pe treptele lui (1 159 ms pentru o deschidere de sub
  850). Pe un runner ocupat, zgomotul doar adaugă timp; o tastă scrie de fiecare dată altă valoare (una la fel nu randează).
- **Fără `content-visibility` pe rândurile listei:** în Edge, un rând departe de vedere ajungea la înălțimea 0, deși
  `contain-intrinsic-block-size` cerea 3,5 rem, deci rândurile se mutau sub clic. Proba „un rând are înălțimea lui și departe
  de vedere” îl prinde (V10). O listă lungă nouă se strânge altfel (o fereastră, ca a fișelor), nu cu proprietatea asta.
- **Regula „cât foaia” stă o singură dată, în `catFoaia` (`src/cam/prinFoaie.ts`):** lucrarea (`cuTaieturiPrinFoaie`) și
  fereastra (`adancimeTaiata`) o citesc de acolo. Un fel nou de operație care nu trece prin foaie cu bifa intră acolo, nu
  într-o condiție a lucrării (la unirea cu 18.1↑c, finisarea reliefului sosise pe vechiul `prin` al lucrării).
- **Intervalul diacriticelor** se scrie cu escape-uri (`\u0300-\u036f`), nu cu semnele combinatoare: scrise direct, nu se
  văd, iar o otravă pe ele iese VOID.

- **O greșeală a unui grup poate avea un buton** (28.8↑j): `greseliRand` întoarce `[text, grup, reparație?]`, iar `grup` primește
  textele sau `{ text, buton }`. Un buton nou de reparat stă lângă textul lui, nu în câmpurile grupului.
- **Conflictul de T are o singură identitate, `cheieFreza`** (diametrul, unghiul V cu vârful, bila): detectarea și „Dă-i T{n}”
  o citesc de acolo, deci un fel nou de freză (bila în proiect, toroidala) își pune forma în cheie, nu în etichetă.
- **Un text lung al ferestrei se prescurtează singur** (28.8↑k): peste 160 de caractere, explicațiile grupurilor și notele
  `TextScurt` arată doar prima propoziție. O probă care caută o propoziție de după prima apasă întâi „Mai mult”
  (`[data-mai-mult]`), iar o notă nouă cu variante își pune prima propoziția care se schimbă (cum sunt acum notele dopului).
- **„Mai mult” din caseta explicației e al grupului, nu al textului** (28.8↑k): mausul care merge spre buton trece peste alte
  câmpuri, care schimbă textul; deschis, grupul își arată toate explicațiile întregi. `rezervaExplicatii` măsoară textele
  prescurtate cât grupul e strâns și pune `data-lung` pe grupurile cu un text lung (altfel butonul nu se vede).
- **O bifă nouă primește singură căsuța lângă etichetă** (`.dialog-export label:where(:has(> input[type='checkbox']))`), iar
  `ceIese` din proba privirii o cere la fiecare tăietură. Confirmările de sub fișe își păstrează regula lor (specificitatea
  e a lui `.dialog label`, prin `:where`).
- **Ordinea unui grup e titlul, explicația, câmpurile** (28.8↑l): `h4` e primul copil al lui `.dx-grup`, iar grila îl pune în
  dreapta, deasupra câmpurilor (`grid-template-areas`). Un grup nou se face tot prin `grup(...)`; o fișă scrisă de mână (ca
  finisarea) pune și ea titlul întâi. Selectorii pe `.dx-campuri h4` nu mai găsesc nimic.
- **Câmpurile primesc `aria-describedby` de la `legaDescrierile`, după randare** (28.8↑l): un câmp care își pune singur
  `aria-describedby` în JSX e suprascris, deci o descriere în plus intră în grup (o greșeală, `[data-greseala]` cu id, sau
  explicația), nu pe câmp.
- **`du(cheie, cum)`**: `'titlu'` din listă și din „Du-mă la …” al refuzurilor (focusul pe titlul fișei), `'repara'` din
  „Du-mă la …” al greșelilor (focusul pe câmpul greșit), fără `cum` doar când fereastra mută singură fișa (Rezultatul).
- **Rândurile listei nu se strâng** (`.dx-lista > * { flex-shrink: 0 }`, doar pe desktop): un rând nou își ține înălțimea, iar
  lista se derulează. Pe telefon, banda le strânge pe lățime.
- **Cu „Toate foile”, `operatii` din fereastră e setul văzut, iar `param` ține și rândurile aduse ale altor foi** (28.8↑q): ce
  judecă sau numără rândurile (greșelile, „Pe toate (N)”, golul din desenul Z0) merge pe `operatii` sau pe `paramVazut`, nu pe
  `Object.values(param)`; altfel un rând ascuns al altei foi oprește „Foaia activă”. Ordinea e foaie după foaie: o mutare nouă
  trece prin `mutaRand`, iar numerele arătate vin din `pozitie` (pe foaie), nu din locul în ordinea întreagă.
- **Rândurile altor foi le socotește getter-ul `toateFoile`** (din `ExportConectat.tsx`), doar la alegerea lui „Toate foile”: o
  valoare nouă a rândului se pune în `randuriFoii`, ca să fie și a celorlalte foi, iar grosimea pe rând (`grosime`) se citește cu
  `o.grosime ?? grosimeFoaie`.
- **Un refuz al calculului trece prin `motivPeInteles`** (`src/ui/motivCalcul.ts`) înaintea afișării: id-urile din lume devin
  nume, iar în română numerele lucrării primesc virgula. O probă care citește un refuz caută numele elementului, nu „e1/e1”, și
  „5,5 mm”, nu „5.5 mm”.
- **Parcarea e deja în coordonatele programului** (28.8↑p): postul n-o trece prin montaj, doar prin unitate și zecimale, și o
  scrie după ultimul `M5`. O probă care o caută în text o scrie cu zecimalele contractului (`G0 X-10.000 Y250.500`), iar una
  care schimbă Z-ul sigur compară cuvânt cu cuvânt (`Z5.000` → `Z20.000`), cu Z0 jos peste grosimea foii.
- **Un rând nou în fișa operației o lungește, iar proba vitezei depinde de înălțimea ei** (`export.viteza.spec.ts`, regula
  ferestrei): marginea trece de vecine doar cât o fișă (~2 230 px pe un profil) e mai scundă decât panoul. Din 28.8↑p, proba
  merge la 1280 × 3200 și spune condiția; o fișă care trece de ~3 000 px o face să cadă, cu motivul.
- **Un câmp nou al rândului (`Rand`) intră și în bazele probelor care fac rânduri de mână** (`exportFreze.nota`, `.inapoi`,
  `.rest`): compilatorul le cere; valoarea lui o pune inițializarea rândului din `DialogExport.tsx`.
- **Rândurile reliefului sunt editabile din 18.1↑d-4 (linia reliefului, ADR 0315):** fișa finisării și a degroșării stă în
  `src/ui/FisaFinisare.tsx`, cu starea ei în fereastră (`paramRelief`; rândul ca text, verificarea și perechile în
  `src/ui/exportRelief.ts`), grupurile ei (`GRUPURI_RELIEF`: `freza-relief`, `linii`, `adaos`, `margine`, `podea`) și câmpurile
  `relief-*` în `GRUP_CAMP` (proba grupurilor citește și `FisaFinisare.tsx`). `greseliRand(cheie)` întoarce și greșelile lor
  (marcajul din listă, „Du-mă la …”), iar `valid` cere `reliefBun`. Exportă le dă în `CerereExport.valoriRelief`, pe care
  `App.tsx` îl scoate înaintea calculului, ca pe `valori`; aplicația le scrie cu `operatieReliefDinDialog`
  (`src/app/valoriOperatii.ts`). Marginea și planul zero se scriu și pe perechea rândului (`perechi`).

## Ce rămâne

Din ADR 0290, nimic: toate feliile (a–f) și 28.8↑g sunt gata. Din ADR 0291 (după audit): 28.8↑n, 28.8↑o și 28.8↑h–28.8↑l sunt
în `main`, cu 28.8↑q („Toate foile” cu operațiile fiecărei foi); 28.8↑p (avansul, turația și plonjarea pe „Scrisă de mână”,
Z-ul sigur și parcarea) e gata pe ramură. Din ADR 0291 nu mai rămâne nicio felie a liniei: 28.8↑m (starea ca hook) vine la
pornirea Clasicului, a lui Pas cu pas sau a pasului scurt din Atelier, iar adaosul și trecerea de finisare (9a), după placa 2,
pe linia aleasă de sesiunea principală. Titlurile în
română sunt, din 26.11, cele alese de owner: „Tăietura”, „Golirea”, „Coborârea”. Telefonul culcat (640 × 360) e rezolvat în 28.8↑l. Pentru alte linii, mai târziu:

- **Clasicul (28.2↑) și Pas cu pas (28.4↑)** iau fișa operației (`FisaOperatie`, cu `ContextFisa`) în panoul lor, cu starea
  lor, fără s-o copieze (ADR 0290, „Cu canvas-ul aranjamentelor”): la Clasic, în locul panoului din dreapta, cu Simularea filă;
  la Pas cu pas, ca panou al pasului 2, iar pasul 5 ia „Foaia și originea” și „Mașina și fișierul”.
- **Ce desenează canvas-ul și nu există azi** (începutul G-code-ului la vedere): o felie a lui, la cuvântul owner-ului; Z-ul
  sigur editabil a venit cu 28.8↑p.
- **Frezele din bibliotecă pe rândurile exportului (16.A↑b-3, linia frezelor)** vin peste fereastra nouă: câmpul nou stă în
  fișă, cu grupul lui în `GRUP_CAMP`, explicația (`….titlu`, ambele limbi) și locul în proba privirii; ce îi trebuie fișei
  intră în `ContextFisa`; catalogul controalelor se scrie din nou. Capcanele de mai sus sunt și ale ei.
- **Inventarul din ADR 0290** (câmpurile și condițiile lor) e ținut de `export.grupuri.test.ts`, care citește `data-camp` din
  `DialogExport.tsx` și `FisaOperatie.tsx`: un câmp nou fără grup cade acolo.
- **Rândul frezei** (cu linia frezelor, 25.11): „Scrisă de mână (ca „Plată Ø6”)” din 16.A↑b-4 lărgea lista „Din frezele mele”
  și rupea rândul. Rezolvat în 28.8↑k fără să schimbe eticheta: lista stă pe rândul ei (la freza operației și la fundul plat),
  iar numărul, diametrul și forma pe rândul de sub ea. Recunoașterea ca notă sub listă rămâne o idee, nu o felie.
- **Proba „adâncimea”** (`export.desene.spec.ts:48`): cauza celor câteva căderi nu e dovedită (vezi Capcanele); dacă mai cade,
  se rulează singură, cu `--workers=1`, ca să se vadă așteptarea care expiră.
