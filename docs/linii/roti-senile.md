# Roți, fulii, conice, șenila (3.Tj–3.To)

<!-- Adusă din memoria sesiunii principale pe 23.11.2026 (mutarea în cloud). De aici înainte o ține la zi linia, pe ramura ei, odată cu feliile. -->

_CNCVS2, feliile 3.Tj–3.To (ADR 0280, ACCEPTAT 19.11 „Da, fără TPU”: 1a, 2b, 3a): 3.Tj–3.Tm unite pe 19.11, 3.Tn (conicele duble, 18.14.0) unită pe 20.11 (`55d3949e`); 3.Tp (piesele pe file, ADR 0281 ACCEPTAT 1b/2a/3a, 18.15.0) UNITĂ în main 20.11 (`ae548a42`, exact `7feac1c2`, în lot cu 12.1↑e; decizia `a64adf63`); 3.To (șenila, 18.16.0) UNITĂ 21.11 (`86116b20`, decizia `4667898a`), cu montajul reparat la recenzie pe COARDE (r = z·12/2π); rămase lanțul dintr-o bucată și întinzătorul; LDraw în `cncvs2-lucru\\ldraw`_

Cererea owner-ului din 18.11.2026, seara: „Uite alte tipuri de roti si un tip de sina pe care vreau ca pluginul sa le faca
custom”, cu nouă poze: roata cu janta în Y, janta mică LEGO cu canale, fulia, conica de 20, conicele duble de 12 și 20,
coroana de 24, șenila cu zale late pe pinioane.

**Răspunsul (19.11):** „Da, fără TPU” = 1a (roata și fulia întâi), 2b (roata dintr-o bucată din PLA; janta singură pentru
anvelopa LEGO; anvelopa din TPU rămâne opțiune), 3a (cotele din LDraw, cu acordul de descărcare). ADR 0280 acceptat.
Feliile: 3.Tj roata, 3.Tk fulia, 3.Tl conica, 3.Tm coroana, 3.Tn conicele duble, 3.To șenila. Schița:
<https://claude.ai/artifact/LDQXX4JQUW5S9kpVu4cWGK>.

**LDraw:** 187 de fișiere (17 piese și ce folosesc) în `C:\Users\besli\cncvs2-lucru\ldraw`, în afara repo-ului.
- Licența: CC BY 4.0 (3650a/b: „CC BY 2.0 and CC BY 4.0”).
- Unelte în `unelte\ldraw`:
  - `aduce.py` aduce recursiv, cu 0,6 s între cereri și pauză la 429; `32198` e acum `32198a`;
  - `plat.py <dir> <piesă> --axa Z --pas 0.1` dă profilul radial (doar rmin și rmax; 1 LDU = 0,4 mm);
  - `sectiune.py` dă secțiunea r–z pe unghiuri, cu web-ul, obada și canalul;
  - `felie.py --z 0 --text` dă felia z = c, cu contururile ei: găurile discului, centrele și razele lor.
- Desenul mărit peste LEGO: `rotite\.tmp\sectiune-fulie.mjs` și `svg-png.mts`.

**3.Tj GATA (19.11, 00:10–10:10):** „Roată cu anvelopă”, Easy 3Draw 18.10.0, unită în `70cacc32`.
- Janta 55982 are scaunul la r 8,4 (Ø16,8, nu 18). Nervura anvelopei 58090 e LATĂ, cu fundul aproape plat la r 7,45.
- Canalul jantei merge de la −1,7 la +1,25 mm, apoi se teșește la 45°; jocul față de nervura LEGO e de 0,104 mm.
- Otrăvuri 34 / 34.

**3.Tk GATA (19.11, 12:14–13:26):** „Fulie”, Easy 3Draw 18.11.0, unită în `9f1202c7` (exact `2b92fa19`).
- Cotele 4185: Ø24, obada 3,5, butucul 4, discul 2,4 cu șase găuri de știft la r 8 (de la 30°).
- Canalul în V (4185a) coboară de la r 12 la ±1,3 până la r 11 la ±0,65. Canalul rotund (4185b) e un semicerc de r 1.
- Fulia tipărită are fața JOS și butucul cu 0,5 mm mai sus (LEGO: discul la mijloc), ca să se tipărească fără suport.
- Găurile de știft stau pe cercurile grilei (6·k pe r 8·k) și încap de la Ø24.
- Cureaua merge pe fundul canalelor; `Lego.cureaua` spune și când fuliile s-ar atinge.
- `butucRoata` și `fataRoata` sunt comune cu roata; amprentele roții au rămas neschimbate (`rotite\.tmp\amprente-roata.mjs`).
- Otrăvuri 37 / 37 din prima; porțile au fost verzi din prima.

**3.Tl GATA (19.11, 15:30–17:20):** „Roată conică”, Easy 3Draw 18.12.0, unită în `bd7351a4` (exact `21213162`).
- Montajul LEGO 87407 vine din LDraw: vârful conului la 12 mm de gulerul din spate. Picioarele dinților la spate și conul din
  spate (r 6,9 la 1,8) se potrivesc. Dinții din LDraw sunt STILIZAȚI (pene); din ei nu se ia profilul.
- Regula montajului: planul de divizare la 2·m de fața din spate, deci vârful la m·(2 + z2 / 2). Cade pe grila de jumătate de
  pas la perechile de 12, 20, 28, 36 … de dinți.
- Profilul e Tredgold, cu z / cos δ dinți, proiectat din vârf pe planul de divizare. `prismaStraturi` micșorează conturul spre
  vârf și îl taie pe rază la conul din spate. Sub picioarele dinților e un cilindru, ca pinionul să nu stea în consolă.
- Proba perechii (`trenulet.conica.test.ts`, `rotite\.tmp\pereche-conica.mjs`): roata 2 cu axa pe −x și un gol în dreptul
  dintelui 0. Numărul de înfășurare cu index pe grilă în xy. La ±0,2 mm nu se atinge, la ±0,9 mm se atinge.
- Otrăvuri 25 / 25 din prima; porțile au fost verzi din prima.

**3.Tm GATA (19.11, 18:55–21:03):** „Roată coroană”, Easy 3Draw 18.13.0, unită în `733bf5c2` (exact `c11cec4d`), decizia
în CLAUDE.md `4b7539a7`. Otrăvuri 40 / 41 (U02 prinsă abia de proba nouă „plasa e înfășurătoarea”; U08 practic echivalentă).
- Cotele 3650 din LDraw: fața de jos la −3,2, planul de divizare la 0,8 (deci 4·m deasupra feței de jos), r max 13,19, butucul
  până la 8. Axul pinionului la m·(4 + z1 / 2): 8 / 12 / 16 mm la pinioanele de 8 / 16 / 24.
- Dintele coroanei = ce lasă pinionul-cuțit (rotița îngroșată cu jocul) baleiat prin gol. Punctul secțiunii la y cade pe
  cilindrul de rază r la s = r·asin(y / r) − r·φ·z1 / z2 (cu s = y − …, ca în plan, jocul ieșea 0,17 la 24 / 24). Baleiajul
  ține până iese dintele (φ = acos((r1 − m) / ρ) + |δ|). Prelungirea capului (+0,25·m) taie DOAR sub tA − ra; golul de
  dedesubt e plafonat la cel de la prima înălțime prin care trece capul real (altfel crestătură și consolă).
- Ancora de hârtie: la r2, pe planul de divizare, jumătatea dintelui = (π·m / 2 − 2·joc) / 2 (golul cremalierei pinionului).
  Funcția `material` din teste mută unghiul cu 0,0011 rad (0,063°): la toleranțe sub 0,1° pune 1e-5.
- Capacele dinților (poligoane pe cilindru, triunghiulate) intră spre axă ~0,06 mm: probele cu raze verticale, departe de
  capete.
- Otrăvurile: 41 (`test/otravuri/3.Tm.py`); `verifica` pe toate listele a găsit 3.Tl E01 ambiguă (rândul copiat în numele
  coroanei): redirecționată. Reperul VOID-urilor: 20 vechi.

**3.Tn GATA (20.11, 07:28–09:22):** „Conică dublă”, Easy 3Draw 18.14.0, unită în `55d3949e` (exact `b7ed3591`), decizia în
CLAUDE.md `0ab28651`. Otrăvuri 31 / 31 (E09 abia după întărirea probei e2e).
- Rotița lată de 8·m; banda ±2·m = rotița; spre fețe, dintele micșorat spre vârful conului de 45° (la r_p + 2·m de mijloc) și
  subțiat liniar până la **0,3·m** pe flanc; piciorul la r_p − 2·m (ca 32270 / 32269), discul cu 0,2 mm mai mic; dintele intră
  0,3·m în disc. Montajul la 90°: planul de mijloc la r_p(perechii) + 2·m de axul ei (8 / 12 / 16 / 20 mm față de 12 / 20 / 28
  / 36). `dublaMontaj().strans`: sub 12 dinți cu o pereche de peste 2,5 ori mai mare (8 cu 24 se pătrunde la jocul 0,05).
- Recenzia a găsit-o pe plase, prin BISECȚIE la jocurile 0,05 / 0,15 / 0,25: cu 0,1·m, 12 cu 28 și 12 cu 36 se pătrundeau la
  0,05. Cu 0,3·m: perechile LEGO au tot jocul la 0,05 și 0,15 (la 0,25, 12 cu 36: 0,44 din 0,50); 12 cu 60 are joc, nu tot.
  Uneltele: `rotite\.tmp\recenzie-dubla.mjs` (`inchis`, `ciudate`, `perechi` cu JOC / PERECHI / PARALEL / LEGO=fișier),
  `pereche-dubla.mjs`, `sectiune-dubla.mjs`, `fata-dubla.mjs` (secțiunea la față, nou peste vechi), `png-decupaj.mts`.
- `gauraRoata(ext, gaura)`: gaura comună rotiței și conicei duble (rotițele identice la octet); otrăvurile 3.Th ale găurii
  (U13, U20, U21) și E07 mutate pe ea.
- E09 (perechea păstrată în piesă) scăpase: schimbarea perechii doar redesenează editorul, NU reface piesa (`schimbat()`),
  deci proba trebuie să refacă piesa („Repede” din nou) înainte de fiecare adăugare.

**Lecții:**
- Nervura (3.Tj) a găsit-o doar secțiunea MĂRITĂ. O cifră pentru documente se MĂSOARĂ din nou: 0,24 din memorie era greșit,
  cifra reală e 0,46.
- O schimbare de text comun strică proba ALTEI felii. Înaintea unirii rulează toate spec-urile pluginului:
  `test/e2e/trenulet*`, biblioteca și extensiile.
- Același lucru e valabil pentru otrăvuri: la 3.Tj, lista câmpurilor de calibrare a lăsat VOID otrava 3.Th E06, nevăzută.
  După fiecare felie: `verifica` pe TOATE listele cu `extensii/trenulet`. Compară cu clona de dinainte, ca să deosebești
  VOID-urile noi de cele vechi (20 vechi după 3.Tn; reperul, `void-inainte.txt` în scratchpad, se poate pierde: refă-l din
  `verifica` pe main). Cod COPIAT dintr-o felie veche face VOID otrăvurile ei (rândul apare de două ori): scoate o funcție
  comună, nu redirecționa.
- O rază care depinde de gaură (butucul fuliei) schimbă forma la schimbarea găurii. Proba de volum „aria × înălțimea” a
  prins-o; acum butucul e același la toate găurile.
- Proba „e material aici?” pe corpuri suprapuse: numărul de înfășurare pe o rază în sus (semnul normalelor), nu paritatea.
- Workflow-ul de recenzie a fost refuzat de clasificator la 3.Tj și la 3.Tm; nu l-am mai încercat la 3.Tn (recenzia
  proprie). Vezi [„Clasificatorul și scrierile cloud”](lectii.md#reference-clasificator-scrieri-cloud).
- Tăierea pe rază a unui contur pe un cerc cere unghiuri STRICT crescătoare. Altfel subtăierea îl pliază, iar unghiurile egale
  suprapun puncte.
- Două corpuri suprapuse NU au voie să aibă pereți identici (de exemplu același alezaj): vârfurile coincid întâmplător.
- Proiectul de tipuri al planificatorului (`trenulet.tipuri.test.ts`, cu `exactOptionalPropertyTypes`) e mai strict decât
  `tsc` al aplicației: rulează `test/unit/trenulet*` înainte de commit.
- `Math.min(...xs)` pe sute de mii de puncte (STL-uri mari) depășește stiva: folosește bucle.
- O amprentă a bibliotecii înregistrată înainte de ultima schimbare din motor cade la porți („un conținut nou cere o versiune
  nouă”): `--scrie` după ULTIMA schimbare din `extensii/trenulet` (versiunea nepublicată, cu trucul 18.x temporar). Și un
  COMENTARIU din `lego.ts` e în pachet: schimbă amprenta.
- O otravă scăpată la o constantă de rezoluție (înălțimile) a arătat o probă lipsă: flancul plasei față de înfășurătoarea
  calculată în test din definiție, la mijlocul dintre înălțimi. Proba perechii (vârfuri în plasă) nu vede fâșii subțiri.
- O potrivire (perechea, jocul) se probează la MARGINILE calibrării (jocul 0,05 și 0,25), nu doar la implicit: la 3.Tn,
  perechile inegale se pătrundeau doar la 0,05. Și o frază de felul „toate perechile…” se MĂSOARĂ pe cea mai rea pereche
  înainte de documente (12 cu 60 o contrazicea).
- Titlul scurt al unui ADR (până la prima virgulă sau „:”) intră în roadmap și se traduce: fără virgulă înainte de „:”.
- Un lanț pe pinioane e un POLIGON: zalele sunt coarde, deci o jumătate de pinion de z dinți ține z / 2 zale, nu arcul π·R.
  Lungimea se socotește pe r = z·p / 2π; verificarea independentă e înfășurătoarea convexă a bolțurilor, mediată pe faze.
- Proba montajului 3.To compara L din cod cu FORMULA codului, deși comentariul ei avea valorile bune (248, 4 mm): o probă
  scrisă după ieșirea codului e autoconsistentă („Autoconsistența”). Valoarea de pe hârtie intră în
  ASERȚIUNE, nu doar în comentariu. Și textele e2e luate din ieșirea codului moștenesc greșeala.

**3.Tp GATA (20.11, 10:49–12:38), UNITĂ în `main` (`ae548a42`, în lotul cu 12.1↑e; porțile lotului verzi pe `b3c3970f`, decizia `a64adf63`):** ADR 0281 acceptat (1b, 2a, 3a). Sesiunea `galeria` (worktree
`C:\Users\besli\cncvs2-lucru\galeria`, portul 4196; clona otrăvurilor `otravuri-3Tp`, 4197), ramura
`wip/3.Tp-galeria-pe-file` (`7feac1c2`; porțile verzi pe `f63bc14e`, sub el doar `.md`), Easy 3Draw 18.15.0.
- Tabela `FAMILII` în `atelier.ts` (filele `data-fila`; galeria `#at-galerie` SUB file, pe toată lățimea, `data-piesa`;
  `ultima` = ultima piesă pe filă; galeria refăcută doar la altă familie, ca focusul să rămână); `Lego.tipuri` pentru proba
  unitară `trenulet.familii.test.ts`. Probele apasă `#at-tipuri [data-fila="roti"]` + `#at-galerie [data-piesa=…]`.
- Lista „salvată înainte”: fixtura `test/fixtures/trenulet/atelier-18.14.0.json`, făcută de pagina publicată (git archive pe
  `origin/main` + joncțiune `node_modules`, ca un om); și drumul claude.ai (baza artefactului răspunde după pornirea 3D).
- Otrăvuri 29 / 29 (E15 scăpase: pastilele strânse pe telefon nu depășesc; proba cere un rând pe buton).

**3.To GATA (21.11, 17:52–19:51), UNITĂ în `main` (`86116b20`, exact `7040401d`; decizia `4667898a`):** „Șenilă” în fila
Roți, Easy 3Draw 18.16.0, în `rotite` (4193, 127.0.43; clona `otravuri-3Tj`, 4194). Otrăvuri 36 / 36.
- Zala ca 57518: lată de 38,4, pasul 12, bolțul Ø3,2 la z 5,6 între obraji (|x| 5,75…7,2, până la 8,4), clema (inelul clemei
  din atelier, `clemaD`) cu fălcile la |x| 3,2…5,45, PEREȚII canalului (|x| 3,2…5,45, y −10…−4,4, până la 8,4: îi arătase
  abia randarea 3D a triunghiurilor LDraw, nu feliile), limba ±5,45 în crestătura ±5,75 (LEGO: ±5,6 amândouă, deci 0,15 pe
  parte), găurile de știft la (±8, −6,8). Pinionul: scobituri de rază 1,6 + jocDinti pe R = 6 / sin(π / z), vârful la
  min(R + 1, R·cos(π / z) + 2,1), discul 4, butucul Ø12 × 8.
- **Montajul (`senilaMontaj`) e pe COARDE:** cureaua deschisă pe razele r = z·12 / 2π (cercul lung de z zale), NU pe R (arcele
  cercului bolțurilor lungeau șenila cu 1,6…2,6 mm: 10 cu 10 la 8 știfturi dădea 2 mm de joc și 65, în loc de 4 și 66; la 9
  știfturi, 23 de zale în loc de 22). Ancora: media pe faze a înfășurătoarei convexe a bolțurilor (`infasuratoare` în
  `trenulet.senila.test.ts`), la câțiva µm de r; formula ANSI a lanțurilor greșește cu 1,5 mm la 6 cu 40.
- Uneltele: `rotite\.tmp\senila\` (`privire-atelier.ts <dosar>` = capturile atelierului, `randare-ldraw.mts`,
  `pe-pinion.mjs` cu control negativ), `rotite\.tmp\senila-montaj\` (`referinta.mjs`, `infasuratoare.mjs`),
  `unelte\ldraw\felie_axa.py`.
- Rămase, la cuvântul owner-ului: lanțul tipărit dintr-o bucată, întinzătorul. 3.Tp↑a (căutarea, linia `galeria`) ia 18.17.0.

**3.Tp↑b GATA (22.11, 16:16–17:40), pe unire la sesiunea principală (la pauza din 22.11 seara), ramura ÎMPINSĂ pe origin:** `wip/3.Tp-galeria-pe-file` (adusă la `main` `40487c43`, cu
3.Tp↑a UNITĂ în `ffae623a`); codul `35121af0` (Easy 3Draw 18.18.0), documentele `330a5873` (porțile verzi pe el, e2e 580 /
582 + 2 ale aplicației reluate), capătul `57457061` (DEVLOG). Cu `main` `69fe7797`: ciocniri doar în DEVLOG și indexul ADR. Pictogramele: `PICTOGRAME` (tip →
marcaj SVG 24 × 24, doar linii; `.at-pict`: 18 px, `currentColor`, fără umplere), `PICTOGRAMA_GENERICA` (cub),
`butonPiesa(k, n)`, toate lângă `FAMILII`. O PIESĂ NOUĂ (elicele, ADR 0282) = un rând în `PICTOGRAME`; altfel
`trenulet.pictograme.test.ts` pică. Unelte de desen: `galeria\.tmp\pictograme\`, cu o copie în dosarul comun, `galeria-3Tpb-unelte/` (generatorul, foaia cu piesa 3D, lupa la
1x și 2x). Otrăvuri 18 / 18 (`3.Tpb.py`). Id-ul din jurnalul fișei: `3.Tp-3`.

**3.Tp↑a GATA (21.11, 17:55–20:07), UNITĂ în `ffae623a`:** codul în `c9ed8648`, `23ce2982`
(porțile verzi pe `2ab00d64`). „Caută o piesă” la capătul rândului de file; potrivirea la început de cuvânt, fără
diacritice, pe numele de pe ecran (`tr`); codul grupat lângă `marcheazaFile()` și în `init`. La cererea sesiunii
principale (3.To unită întâi, cu 18.16.0), `main` `4667898a` ADUS în ramură (21.11, 20:20–): unirea `0a10d403` (Easy 3Draw
18.17.0 + `--scrie`; în documente rămân rândurile ambelor felii, 3.To apoi 3.Tp↑a), documentele pe 18.17.0 `bb52ac5e`
(rândul din fișă schimbat = amprentă NOUĂ în `roadmap.en.json`: `node scripts/traduceri.ts`, apoi `en` pus înapoi).
Porțile verzi pe `bb52ac5e` (e2e 577 / 577), capătul `900a501a` (DEVLOG). Cu `main` `8e96ff13` (lotul 12.1↑e + 10.3↑n),
ciocnire doar în DEVLOG. Worktree-urile au refs comune: `origin/main` se mișcă și din fetch-ul altei sesiuni.
În jurnalul fișei, id-ul e `3.Tp-2` (tiparul nu primește `3.Tp↑a`). Otrăvuri 21 / 21 (`3.Tpa.py` + `3.Tpa-en.py`, setul
ei e `trenulet.spec.ts`). Urmează 3.Tp↑b (pictogramele), la cuvântul sesiunii principale.

**How to apply (istoric, înainte de 3.To):** la 3.To, în `rotite`: întâi `origin/main` adus în `wip/3.Tj-roti-senile` (rămasă la `b7ed3591`; `main` are de atunci 3.Tp și 12.1↑e). Șenila intră în rândul `roti` din `FAMILII` (proba unitară o cere); „Roți 6” → 7 în
`trenulet.file.spec.ts`, „Wheels 6” → 7 în proba în engleză din `trenulet.spec.ts`, plus `FAMILII` și `EDITOR` din spec;
`verifica` pe toate listele (ținte pe rândurile tabelei: 3.Tk E12, 3.Tl E08, 3.Tm E13, 3.Tn E06, 3.Tp U01–U06, E14). Apoi
3.Tp↑a (căutarea), 3.Tp↑b (pictogramele), la cuvântul owner-ului. Nota de predare: `galeria-3Tp.md` în dosarul comun.
Tiparul unei felii: cotele din `ldraw`; motorul în `lego.ts`; secțiunea mărită peste piesa LEGO
([„Ieșirea reală, privită mărită”](lectii.md#feedback-iesirea-reala-privita-marita)); otrăvurile în clonă plus `verifica` pe toate listele; versiunea urcată și
`biblioteca.ts --scrie` (o versiune NEPUBLICATĂ se reînregistrează punând temporar în `biblioteca.json` versiunea publicată).

Vezi [Rotițele dințate (3.Th)](rotite.md).
