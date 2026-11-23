# Tăierea și conversia (10.3↑)

<!-- Adusă din memoria sesiunii principale pe 23.11.2026 (mutarea în cloud). De aici înainte o ține la zi linia, pe ramura ei, odată cu feliile. -->

_CNCVS2, linia tăierii și conversiei vectorilor (ADR 0180, 0181, 0182): worktree `C:\Users\besli\cncvs2-lucru\taiere`, portul 4175, canalul `taiere`; 10.3↑f–m UNITE în main; referința `e39ddc4` pe `wip/10.3-taiere-conversie` (nu uni, nu șterge); 10.3↑n (numărul panoului) UNITĂ în main 21.11 seara (`fa8e7abe` din `2fce5b91`, lotul `8e96ff13`, pe test); ADR 0182 (legarea căilor) ACCEPTAT 21.11 (1a–3a + „cât mai multe opțiuni”), 10.3↑o (comanda Leagă căile, Ctrl+J, Verificarea, opțiunile) GATA DE UNIT 22.11 pe `wip/10.3o-legare` (main `88be9d6c` unit), canalul pe `3ad80ef2`; urmează p (Noduri), q (felurile legăturii), r (la import)_

Linia pornită de sesiunea principală cncvs2 pe 06.11.2026. Worktree `C:\Users\besli\cncvs2-lucru\taiere`, ramura
`wip/10.3-taiere-conversie`, e2e pe portul 4175 (`CNCVS2_E2E_RETEA=127.0.2`), clona otrăvurilor
`C:\Users\besli\cncvs2-lucru\otravuri-taiere` (portul 4179), canalul de previzualizare `taiere`.

**Starea pe 07.11.2026 (seara):** linia e gata pe ramură: 10.3↑ (linia dreaptă), b (cuțitul-formă, intersecțiile), c
(decuparea), d (conversia: Arce, În cerc, În dreptunghi), e (Netezește: Schneider verificat cu Hausdorff, colțurile peste 60°
pe 4 × toleranța). `main` a unit ramura doar până la `be7733e` (10.3↑b). Pe 08.11, la „continua”, ramura ținută unibilă:
`origin/main` `0060a86` unit (`b7aac9c`, ușile 89, capitolele 31), porțile și emulatoarele verzi, canalul pe `b7aac9c`; ultimul
commit `2483b50` (DEVLOG). Rămâne doar unirea în `main`, a sesiunii principale, la cuvântul owner-ului. Mărimea liniei: ~18,5 kB (6,8 + 3,7 + 0,6 + 4,9 + 2,5), peste ghidul de
~10 kB din brief; spus owner-ului la fiecare felie.

**08.11, linia a doua (ADR 0181, cuțitul pe pânză):** la „vreau mai multe optiuni de taiere, si vreau un 'cutit' mai
versatil”, ADR 0181 propus (`1cf590d`), apoi ACCEPTAT (`b515126`) cu „ok, la toate recomandarile” (1a–4a) și nota: o formă
existentă (un text) drept cuțit = felul **Formă**, pus în 10.3↑f. Schița: <https://claude.ai/artifact/7jiFhVpNn9vAcc2Mjpd5bW>
(răspunsurile în colecția `raspunsuri`). **10.3↑f GATA** pe 08.11 (`c320f07`, împins; canalul `taiere` pe `862ae18`): unealta K
cu Linie / Pen / Liber / Formă; în model, buclele libere (un cuțit închis tot înăuntrul unei forme o taie: textul pe placă
dădea `nimic-taiat`). Otrăvurile 24 / 24 (F10 după o probă nouă). Mărimea: +3,7 kB (546,8 / 600), pornirea neschimbată.
**10.3↑g GATA** pe 08.11 (`0e11109`, împins; canalul pe `290a944`, verificat): Foarfecă și Retează în bara cuțitului,
Desparte în Noduri; **selecția rămâne** după orice tăiere a cuțitului (schimbat față de 10.3↑f, spus owner-ului); otrăvurile
23 / 23; felia +2,9 kB. Raportat owner-ului: iconița Retează seamănă cu un „+” (propus: bucata care pleacă, punctată); el a
ales 10.3↑h, iconița a rămas. **10.3↑h GATA** pe 08.11 (`a79983c`, împins; canalul pe `4ebe3f5`, verificat): linia la unghi,
Păstrează, Prelungește, cuțitul șters; otrăvurile 27 / 27 la prima rulare; felia +4,6 kB (563,6 / 600). **Bara de sus are
doar ~100 px liberi la 1 280 px**: opțiunile noi ale cuțitului (10.3↑i spațiul, 10.3↑j îmbinarea) intră în panoul de sub
butonul „Opțiunile tăierii” (`GrupuriTaiere.tsx`), nu pe rând; după orice control nou în bară, o captură la 1 280 px.
Raportat owner-ului: schimbarea față de schiță (panoul, nu listele pe rând). Urmează 10.3↑i (spațiul și suprapunerea), la
cuvântul owner-ului. **E2e cu mașina încărcată** (alte sesiuni, un joc deschis): lucrătorii cad cu 0xC000012D (memoria
virtuală epuizată); `vite preview` rămâne pe 4175 (oprește-l), apoi reia cu `--workers=2`. **Otravă scăpată pe un filtru de toleranță** (G07): un caz exact n-o prinde dacă codul vecin rotunjește deja la
`eps` (`pozitie` scrie locul ca vârf); caută banda dintre cele două toleranțe (aici 5e-8 mm: peste `eps` ≈ 1e-9 mm, sub 1e-9
din λ) înainte s-o declari echivalentă. Un rând scos din coada owner-ului se poate întoarce
prin unirea altei ramuri (`72def2a` a adus înapoi întrebările ADR 0180): la acceptarea unui ADR, verifică coada și pe `main`.
Probe e2e cu clicuri pe pânză: pânza acoperă toată pagina, iar panourile (proprietăți, textul) stau peste ea; alege punctul
cu `elementFromPoint` = pânza. Proiectul se păstrează la reîncărcare (IndexedDB): un script pe canal care face `goto` de două
ori pornește a doua oară cu formele de dinainte.

**10.3↑i GATA** pe 09.11 (`21492d3`, împins; canalul pe `c9dd793`, verificat): `intre = { fel, latime }`, fiecare parte tăiată
cu cuțitul mutat cu w / 2 (linia: paralela; calea: `offsetDeschis` + capetele prelungite cât au rămas într-un contur tăiat;
cel închis: `offsetFigura`); refuzurile `spatiu` (bucata mâncată, găurile scutite), `spatiu-cutit`, `spatiu-inchide`. Otrăvurile
33 / 33 la prima rulare; felia +2,1 kB (567,8 / 600 pe ramură). **Bugetul:** o unire de probă cu `main` 3797e17 (578,8) dă
600,1 / 600: linia trece de plafon cu 0,1 kB (planșele ~604 singure): decizia owner-ului, spusă în raport. **Bara de sus cu
Cuțitul**, la 1 280 px cu fontul lat (Verdana, ca proba 6.V↑d din main): 2,2 px liberi în română; proba ei, la 10.3↑j. La
unirea lui main, tsc a prins `capatConstrans(…, m.shift)` (GestDesen are acum și Ctrl): Shift-ul Liniei cuțitului era oprit
tăcut. **Oracolul pe rețea** (`mancatRaster`): vecinii doar pe laturi văd bucăți false în vârful unei pene (leagă și diagonalele,
iar o componentă de câteva celule e nehotărâtă); o parte toată în fâșia suprapunerii se potrivește ambelor laturi (încearcă-le).

**Why:** sesiunea principală unește ramura în `main` doar la cuvântul owner-ului și a cerut ca `main` să fie adus în ramură
(merge) înaintea fiecărui commit de cod.

**How to apply:**
- Adu în ramură `origin/main`, nu `main`-ul local: acolo pot sta uniri ale sesiunii principale încă neîmpinse (pe 07.11,
  15.B↑b), iar împingerea ramurii le-ar publica. Cu lucru necomis: pune deoparte ca patch doar fișierele atinse de unire
  (`git apply -R`), unește, aplică la loc (fără stash).
- După merge, **recalculează numărătorile** (capitolele manualului, ușile din `manual.test.ts`): două părți care schimbă
  aceeași cifră la fel (28 → 29) se unesc fără conflict, dar greșit.
- E2e-ul întreg sub încărcarea altor sesiuni (procesorul ~90 %, zeci de procese Edge) cade în masă la `page.goto` (30 s):
  reluat cu `--workers=3`, trece (370 / 370 în 9 min). Emulatoarele țin 4173 și 9095 / 8085 / 5005 / 4400 / 4500 din orice
  worktree: `netstat -ano` înainte. Vezi [Uneltele worktree-urilor locale (de dinainte de cloud)](unelte-worktree.md), [sesiunea principală](principala.md), „Vite: pornirea”.

**10.3↑j GATA** pe 09.11 (`1a81540`, împins; canalul pe `4eb8649`, verificat): îmbinarea (zigzag, val, dinți, coadă, puzzle) pe
tăieturile drepte, `src/model/imbinare.ts` comun workerului și previzualizării; otrăvurile 54 / 54 (7 scăpate la prima rulare,
prinse după probe noi); felia +4,2 kB (604,3 / 700). **Unirea în `main` a căzut pe proba barei de sus** (`ancore.spec.ts:512`):
proba **pornește grila** (câmpul pasului, +50 px), iar butonul K a adăugat 36 px la toate stările; bara Cuțitului ajungea la
1340 px. Măsoară bara la FIECARE unealtă, cu grila și fontul lat, nu doar starea ta. Reparația mea (bifa „Închide bucățile” în
opțiuni, butoanele doar cu iconiță la 38 px sub 95rem) era o schimbare de aranjament: întrebat owner-ul, a cerut altceva:
**„Exports g-code, import si export trebuie sa fie in topbarul de langa imprimanta”**. Schița, cu prototipul construit în clona
`otravuri-taiere` (necomis acolo): <https://claude.ai/artifact/94AHZeAD9KvEmZsBt6MQW6>, colecția `raspunsuri`, 5 întrebări
(locul, iconițe / nume, doar în Proiectare, sub 1200 px rămân în bara de desen, bifa înapoi în bara Cuțitului). Grupul
`fisier` trece din zona `sus` în `meniu` (aranjament.ts; proba `aranjament.test.ts` fixează zonele); la 320 px ar face 3 rânduri.
**Capcane noi:** o otravă pe o verificare de sus scapă dacă un cuțit închis cade oricum pe aceeași ramură mai jos (`caleDreapta`):
caută cazul care desparte ramurile (o linie dreaptă aleasă ultima); zoomul cu rotița într-o probă poate scoate punctele tragerii
din pânză (`data-locuri=0` = nicio urmă); CSP-ul aplicației blochează `page.addStyleTag` (folosește `element.style`); emulatoarele
și orice script cu `npm`: din PowerShell, cu `npxshim` în PATH („Shell: capcane”).

**Fișierele lângă Imprimanta** (09.11, „Ok la toate” la cele cinci recomandări ale schiței): `4988fd6` pe ramură, după `a105bdc`
(`origin/main` 25.4↑ unit). Grupul `fisier` în meniul global cu `fereastra` + `ingust` (`grupuriZona`, `useEcranLat`, 75rem).
**Pauză la 22:30, cerută de owner:** necomise încă proba bifei (`cutit.spec.ts`) și B08 nou (`10.3j.py`); rămân emulatoarele,
mărimea, documentele (`docs-fisiere.py` în scratchpad), împingerea, canalul și commit-ul pentru sesiunea principală (pașii
exacți, în nota comună). **O otravă cu `hidden` pe un element cu `display` din CSS e echivalentă** (CSS-ul autorului bate
`[hidden]` din foaia implicită): otrăvește comportamentul, nu vizibilitatea.
**La pauză (22:45), ultimul commit împins `314d5fe`; ramura NU e gata de unit:** porțile pe `4988fd6` au prins
`editare.spec.ts:463` (proba din `main` a meniului pe un rând, cu literele lățite cu 5 px): cu fișierele în meniu, grupul
aplicației trece pe al doilea rând la 1280 px. Variantele (recomandat: meniul fără rupere peste 75rem, cu marca strânsă cu „…”)
și pașii rămași, în nota comună. **Lecția:** proba nouă a unui aranjament trebuie să ruleze și stresul probelor vechi ale
aceluiași loc (aici literele lățite), nu doar fontul lat al probei mele.

**11.11: mutarea fișierelor OPRITĂ.** Owner-ul merge pe designul sesiunii „Variante design CVS2” (ADR 0250, 0251), care
hotărăște și bara de sus. În `main` rămâne reparația provizorie a lui 10.3↑j. Ramura `wip/10.3-taiere-conversie` (la
`e39ddc4`) păstrează mutarea ca referință: NU o uni, NU o șterge; lucrul nou al liniei (10.3↑k) pornește dintr-o ramură nouă din
`main`. Porțile pe `e39ddc4` oprite la jumătate (`TaskStop` nu oprește copiii lui `bash`: `taskkill /T` pe scriptul porților).

**13.11: 10.3↑k GATA (tăierea în panouri, ultima felie a ADR 0181)**, pe ramura nouă `wip/10.3k-panouri` (din `main`), împinsă,
neunită; worktree-ul `taiere` stă pe ea. Grila (`grilaPanouri.ts`), tăierea în worker (`panouri.ts`, linie cu linie, cu `desparte`
în `taie`), gruparea pe firul principal (`grupuriPanouri.ts`, din `document.taie`). Canalul pe `9835062`. Mărimea +4,7 kB
(662,2 / 700 pe `main` `44c47fa`). Detaliile, în nota comună (`taiere-10.3.md`) și în DEVLOG.
**Capcane noi:** (1) un modul cu scheme valibot construite la încărcare (`blocText.ts`, prin `grupare.ts`) trage valibot în
worker (+4,5 kB): măsoară bucățile pe nume (`.tmp/bucati.mjs` în clonă: gzip pe fișier, fără hash) și ține în worker doar ce n-are
scheme; (2) `Editare` primește `selectieValida`, deja filtrată la instanțele de pe foaie: un filtru în panou e echivalent (H10);
(3) un id ales din documentul de după o degrupare poate fi cel abia eliberat: după Anulează, alegerea rămasă arată spre forma
veche; ocolește și documentul de dinainte; (4) nu edita și nu uni cât rulează porțile: build-ul determinist face două build-uri
(o editare între ele pare nedeterminism), iar un `merge` cât rulează e2e-ul le amestecă stările; (5) într-un apel de unealtă,
backslash-ul dublat dintr-un heredoc ajunge simplu: scripturile Python cu backslash, scrise cu Write și `chr(92)`.

**14.11: PAUZĂ („pauza peste tot”, owner-ul, prin sesiunea principală), la `34748a6`, împins.** După „gata de unit” pe
`52184a4`, `main` a primit planșele (`d62e6b8`): unite în ramură (`f24ec10`), panourile pe foaia activă (`indexFoaie` pe drumul
lor, ca la restul tăierii), proba foii a doua. Pe unire: unit-urile tăierii 263 / 263, e2e `taiere` + `cutit` 32 / 32, build
determinist, totalul 694,8 / 700 (pornirea cu ușa 109,7 / 110, ca `main`), otrăvurile 45 / 46 (M03 echivalentă). **Felia NU e
gata de unit pe `main`-ul de acum.** La reluare: unește `origin/main` `0e3725c` (banda 3.6s, plafoanele 115 / 800, trasarea
25.5↑), porțile întregi și emulatoarele pe rezultat, mărimea finală în ADR 0181 / fișă (și traducere) / DEVLOG (acum de pe
`44c47fa`), împinge, canalul `taiere` (acum pe `9835062`, fără planșe), raportul. Pașii exacți, în nota comună (`taiere-10.3.md`).
O otravă e2e NEVALIDĂ cu „localhost:4179 is already used” = serverul rulării dinainte încă se oprea: reia-o singură.

**16.11: reluare; GATA DE UNIT la `fc3a785`, împins** (owner-ul: „unește ce se poate”, deci sesiunea principală unește la
raport). `main` adus de patru ori în aceeași seară (`0e3725c`, `bfdf2ed`, `380c053`, `5ab3941`): după porțile întregi pe o
unire, la unirile următoare doar ce ating ele (cu acordul sesiunii principale). Mărimea +4,8 kB (703,4 → 708,2 / 800), pornirea
neschimbată. **Capcane noi:** (1) un `git commit` pus după un script de rezolvare pe un rând separat rulează și când scriptul
cade: marcajele de conflict au intrat în unire (`50fb4b4`, scoase în `0133c76`); `set -e` și verificarea marcajelor înaintea lui
`git add`; (2) un regex `[^.]*\.` pe un text cu nume de fișiere (`fonturi.spec.ts`) se oprește la punctul din nume: înlocuiește
fraze întregi, cu capătul scris; (3) „liniștea” pentru e2e: numără procesele cu `playwright` în linia de comandă
(`Get-CimInstance Win32_Process`) și așteaptă 60 s la zero (`porti4.sh`).

**17.11: 10.3↑k UNITĂ în main** (`c577549`, arborele lui `fc3a785`; porțile sesiunii principale: unit 9 414 / 0, e2e 494 / 494).
Ramura `wip/10.3k-panouri` adusă la `main` `22ab3de`. **Propuse owner-ului, la cuvântul lui** (recomandarea întâi): (1) panourile
pe foi (ADR 0181, „se redeschide dacă vin planșele”): mărimea implicită ține cont de dinți, joc și freză (azi = materialul foii,
deci un panou cu dinți iese din foaie), plus „Așază pe foi” din blocul panourilor; (2) tăierea pieselor puse de mai multe ori
(ADR 0180: opțiuni în locul refuzului „Desprinde-o întâi”); (3) numărul fiecărui panou, gravat pe el; (4) unirea căilor (ADR
0124 §14), ca ADR propus întâi.

**17.11: 10.3↑l (panourile pe foi), la „1” al owner-ului; GATA DE UNIT la `e17a352`, împinsă.** Mărimea implicită a panoului
= cât încape pe foaie la „Așază pe foi” (`panouriPeFoaie.ts`); „Așază pe foi…” în bloc. **Reparat din 10.3↑k:** dinții drepți pe
grila egală erau refuzați (`pe-linie`: o linie a grilei cădea pe flancul dintelui din mijloc), dinții de la încrucișări erau
tăiați; acum `taie` are `opriri`. Punctul 2 (piesele puse de mai multe ori) explicat owner-ului, fără cod: «Desprinde și taie»
(toate operațiile) și «Taie piesa» (doar Taie cu și Convertește; tăietura mutată în desenul piesei), întrebarea ca la grupare.
**Capcane noi:** (1) heredoc-ul cu backtick-uri rupt și în Python inline: scriptul în scratchpad; (2) un e2e care trece cu
implicitele nu dovedește că blocul citește alegerile ținute (`cncvs2.asezare` pus cu `addInitScript`); (3) emulatoarele:
`documentatie.emulator.spec.ts:83` (fondul etapei 6) poate cădea din timp; a doua rulare verde.

**17.11 (seara): 10.3↑m GATA DE UNIT la `7ae0d5a`** („Da, cu recomandările”): întrebarea pentru piesele puse de mai multe ori
la tăiere și conversie («Desprinde și taie» principal / «Taie piesa»; `surori.ts` ușor, `taiereSurori.ts` comenzile,
`intrebareSurori.ts` alegerea ținută, banda `IntrebareSurori.tsx`). **Capcane noi:** (1) mărimea: un import cu valoare (nu tip)
în calculul la cerere (`CUTITE_PIESA` din `taiere.ts`, `comenziDesprinde`) scoate module într-o bucată comună (+1,4–1,9 kB):
constantele ușoare în module ușoare, restul prin bucata care le are deja (`import()` direct face o bucată nouă); măsoară pe
bucăți (`vite build` + `join` pe dimensiuni); (2) «+1» / «Încă…» pornesc rândul de la cutia piesei și coboară: o formă la
Y < margine se varsă pe foaia următoare; (3) o soră rotită cu 180° dă bucățile A / B invers: comparațiile de bucăți, fără ordine;
(4) un canal deja vizitat în browserul aplicației rulează versiunea veche (PWA) până la „Reîncarcă” din bara de jos.

**21.11: 10.3↑n (numărul panoului gravat) GATA DE UNIT la `2fce5b91`, împinsă; ADR 0182 (legarea căilor) ACCEPTAT pe aceeași
ramură.** 10.3↑l și 10.3↑m unite în main 17–18.11 (`eb237a77`, `3ef10357`). 10.3↑n: `numarPanou.ts` (locul cifrelor, pur),
`inaltimeNumar.ts` (ușor), `numerePanouri.ts` (la cerere), `perPanou` din worker; porțile întregi pe unirea cu main `a64adf63`,
otrăvurile 15 / 15, +2,3 kB. ADR 0182: răspunsurile owner-ului în schiță (<https://claude.ai/artifact/VUTp5KjrMGY6ggTcm114B2>,
colecția `raspunsuri`): 1a, 2a, 3a + nota „cat mai multe optiuni pe care le putem pune la dispozitia userilor” = variantele
devin opțiuni ținute în browser ([„Toate opțiunile”](lectii.md#feedback-toate-optiunile)). Feliile: 10.3↑o, p, q, r.
**Capcane noi:** (1) A DOUA OARĂ aceeași greșeală de mărime: o constantă luată din modulul greu (`INALTIME_NUMAR` din
`numarPanou.ts`) l-a adus întreg în bucata panoului: **măsoară pe bucăți (gzip pe nume fără hash, A/B) ÎNAINTEA porților
întregi**, nu după; (2) o probă e2e care reîncarcă imediat după o schimbare vede versiunea de dinainte: așteaptă
`documentSalvat` (proba 88, instabilă de dinainte); (3) unealta Noduri lucrează pe o singură formă: o propunere care alege
noduri pe două forme nu se potrivește (citește textele uneltei înainte de schiță); (4) e2e-ul întreg sub încărcarea altor
sesiuni: `net::ERR_INSUFFICIENT_RESOURCES` și așteptări depășite în fișiere străine de felie: reia-le singure după liniște
(aici 23 de minute de așteptare); (5) `dist/index.html` listează și bucățile versiunii dinainte (două `index-*.js`): primul
`grep` nu e scriptul principal.

**22.11: 10.3↑o (legarea căilor) GATA DE UNIT pe `wip/10.3o-legare`, împinsă** (din vârful lui 10.3↑n; main `40487c43`, apoi `88be9d6c`, unite). Legarea în worker (`legareCai.ts`, cererea `legare`, aplicată prin `document.repara`); acțiunea ușoară
`document.leaga-caile` (Ctrl+J, paleta) cheamă `legaCaile` din context, dat de `Editare` prin `onLegare`; opțiunile în
`legareOptiuni.ts` (ușor) + `optiuniLegare.ts` (cheia `cncvs2.legare`); textele în `textLegare.ts` (comun cu Verificarea).
Otrăvurile 25 / 25; +4,2 kB (pornirea +0,1).
**Capcane noi:** (1) `Path.write_text` din Python scrie CRLF pe Windows: folosește `write_bytes(s.encode())` (patru fișiere
aduse la LF); (2) un efect legat de tabloul `selectie` rulează după ORICE schimbare a documentului (tablou nou, aceleași
forme): compară după conținut (`cheieSelectie`); (3) A DOUA OARĂ o otravă care scoate rândul unui `if` urmat de `else` (Q03,
acum L11): fișierul nu se mai încarcă, deci „PRINSĂ” cu `pass=0` e de fapt NEVALIDĂ: schimbă condiția, nu scoate rândul; (4) o
comandă nouă activă pe orice alegere schimbă primul rând activ al meniului de clic dreapta (`import.spec.ts:436` aștepta
„Duplică”): activ-o doar unde are ce face (aici, o cale deschisă aleasă); (5) e2e-ul paginii pornește în engleză fără
`test.use({ locale: 'ro-RO' })`; (6) o comandă întreruptă la repornire poate să nu fi pornit deloc: verifică `MERGE_HEAD`,
fișierele și patch-ul înainte s-o reiei; pune deoparte cu copii întregi, pas cu pas.
