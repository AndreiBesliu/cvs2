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
  Detaliile: ADR 0290, „Implementarea 28.8↑a”. Urmează 28.8↑b (desenele foii, mașinii și profilului).

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
