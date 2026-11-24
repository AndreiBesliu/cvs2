# Linia exportului: fereastra „Exportă G-code” (ADR 0290)

- **Ce face:** desenează din nou fereastra exportului, cu un desen care explică fiecare setare, fără să schimbe ce face
  fereastra (aceleași câmpuri, aceleași valori, același program).
- **Ramura:** `wip/28.8-export`, făcută din `origin/main` `d6fd5d68` pe 23.11.2026.
- **ADR-urile:** 0290–0299 (libere pe 23.11). **Canalul:** `export` al instanței de test.
- **Feliile:** 28.8↑a–f, în etapa 28, adusă în etapa 3, fără mașină.

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

## Ce rămâne

- 28.8↑b–f, fiecare cu proba scrisă înainte, e2e, privirea pe fereastra reală, otrăvurile, documentele și canalul `export`.
- Unirea în `main`, la cuvântul owner-ului (de sesiunea principală), după ce încearcă fereastra pe canal.
