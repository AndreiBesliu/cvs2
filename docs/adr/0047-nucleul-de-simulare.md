# ADR 0047: Nucleul de simulare pe CPU: câmpul rar pe dale în atlas, calculul exact pe celulă, benzile pe bazin, amprenta Node = browser; harta adâncimilor în dialogul exportului

**Starea:** acceptat pe 19.10.2026, odată cu felia „simularea, nucleul CPU, felia 1 din 2” (`PLAN.md` §5.3, etapa 4,
punctul 2: „Nucleul de simulare CPU (2 felii): dale mici într-un atlas, calcul exact pe celulă, benzi pe bazin; amprenta
Node = browser în e2e”), adusă ca felie fără mașină (`PLAN.md` §4.6, punctul 7: plăcile 1 și 2 sunt netăiate). Rândul
pragului: „Simulare 3D (3 axe)”, partea nucleului. **Continuă:** ADR 0010 (nucleul TypeScript pe CPU; aici, cum), ADR 0011
(fără calcul pe GPU), ADR 0014 (fără izolare cross-origin: fără memorie partajată), ADR 0015 (workerele fără stare: aici
intră bazinul), ADR 0022 (N axe: simularea refuză A în v1), ADR 0042 (pornirea: calculul vine cu fereastra lui), ADR 0045
(precache-ul: workerul simulării e o bucată la cerere ca oricare).

**Problema.** Ecranul trebuie să arate exact ce verifică testele (`BRIEF.md` §13: un nucleu folosit de ecran și de teste,
plus un oracol separat). Sonda s4 a probat nucleul (0 celule greșite pe 16 piese pe hârtie, identic bit cu bit în Node și
în Edge, la 1–16 fire) pe dale de 64 × 64 ținute ca obiecte, cu `acos` / `atan2` din `Math` pe celulă și fără IR-ul
aplicației. Produsul cere: dale mici într-un atlas, dalele uniforme ca un număr, programul IR adevărat ca intrare, bazinul
de workere, poarta Node = browser în CI și ceva ce owner-ul vede pe test până la afișarea în WebGL2 (felia următoare).

## Decizia

**1. Câmpul (`src/sim/camp.ts`).** O celulă ține Z-ul cel mai jos atins de suprafața sculei deasupra centrului ei (Float32;
„cea mai adâncă tăietură câștigă”). Grila e pe dale de **16 × 16** celule; o dală se alocă la prima tăietură sub fața
plăcii, într-un **atlas** (un singur `Float32Array` cu locuri de 256 de celule, crescut în pași de cel mult 8 192 de locuri)
cu un tabel de index pe dală (−1 neatinsă, −2 uniformă, ≥ 0 locul). După calcul, **compactarea** face din fiecare dală cu
toate celulele egale un singur număr (cele rămase la fața plăcii redevin neatinse) și strânge atlasul; o dală uniformă
scrisă din nou revine în atlas cu valoarea ei. Mărimea dalei e măsurată (s4 §5.3 o lăsa „după o măsurătoare de viteză în
nucleul real”): pe jobul 2D al sondei (194 208 mutări, placa de 2 440 × 1 220 la 0,25 mm, un fir, Node 26), dalele de 16 →
**612 ms și 37,6 MB** în atlas (54 438 de dale atinse, 17 736 uniforme), cele de 32 → 626 ms și 60,7 MB. Grila foii pornește
din colțul stânga-jos, cu **0,25 mm** (ADR 0010); o foaie peste 2²⁶ celule (≈ 67 M; placa de 2 440 × 1 220 are 47,6 M)
primește cea mai mică dublare a celulei care încape (plafonul e pe artefact). Fereastra de 0,1 mm rămâne pentru felia 2.

**2. Nucleul (`src/sim/nucleu.ts`), portat din s4 (`cod/src/core.mjs`), exact pe celulă:** linia 3D cu freza plată, bila
și V-ul (formă închisă: minimul unei funcții convexe pe intervalul în care scula acoperă celula), plonjarea (discul sculei
la Z-ul cel mai jos), arcul la Z constant cu orice formă (distanța exactă la arc sau la capete), elicea cu freza plată
(intervalul exact de unghiuri). Formele sunt cele ale sculelor (`FormaScula` în `src/ir/ir.ts`: plată, fără câmp; bilă; V
cu unghiul inclus); documentul are deocamdată doar freze plate. **Nesimulate încă, refuzate cu motiv:** elicea cu bila sau
cu V-ul (coardele lasă material: s4 §4.2; cere o formă exactă sau coarde deplasate, la V-carve) și scula de profil (nu e o
formă a sculelor aplicației; piesele ei rămân în corpusul oracolului).

**3. Intrarea e programul IR (`src/sim/program.ts`), în coordonatele documentului**, nu G-code-ul: nucleul arată ce
generează CAM-ul, înaintea postului (rotunjirea la 3 zecimale, de cel mult 0,5 µm pe axă, e treaba postului și a porții
invariantelor). Poziția se urmărește de la o pornire necunoscută: mutările cu o axă necunoscută se sar dacă rămân deasupra
feței, iar coborârea în material sau un arc dintr-o poziție necunoscută sunt refuzate. **Rapidele se simulează ca tăieri**
(o rapidă prin material se vede). Arcele rămân arce, cu baleiajul după regula IR-ului (`baleiajArc`: start = capăt =
cercul întreg), calculat cu unghiurile deterministe; arcul cu raza zero sau cu capetele pe raze diferite (peste 1 µm) e
refuzat. **Axa A e refuzată** (T22). Eticheta, axul și pauza nu mișcă nimic.

**4. Benzile și bazinul (`src/sim/banda.ts`, `src/jobs/`).** Rândul de dale r e al benzii r mod N (rânduri intercalate,
s4 §5.6). Fiecare bandă primește doar mutările care îi pot atinge rândurile (cutia în Y, lărgită cu raza efectivă a sculei
la cel mai jos Z al mutării și cu o celulă), ca tablouri transferate, nu prin memorie partajată (ADR 0014). Banda simulează,
compactează și întoarce **doar rezumatul**: amprenta fiecărui rând cu ceva tăiat, volumul pe rând, Z-ul minim,
previzualizarea (cel mai jos Z pe bloc de celule) și numărătoarea dalelor; câmpul ei e aruncat (ADR 0015: nimic ținut între
joburi). Unirea pune rândurile în ordine, deci rezultatul nu depinde de N. Bazinul (`src/jobs/bazin.ts`) are N = numărul de
nuclee − 1, între 1 și 8 (s4: 8,5× pe 16 fire, 6,4× pe 8); **workerele sunt ale jobului**: pornesc cu el și se opresc la
capătul lui — la răspuns, la prima eroare, la anulare (`AbortSignal`) sau la termen (120 s pe job). Așa memoria benzilor se
eliberează imediat, iar un worker care tace nu mai rămâne în bazin (recenzia, mai jos). În Node (testele, fără `Worker`), aceleași benzi rulează pe rând,
prin aceeași funcție. Regula de import nouă `bazinul-doar-simularea`: `src/jobs` importă doar `src/sim`.

**5. Ce vede owner-ul, până la WebGL2 (felia următoare):** după export — **după descărcare, nu înaintea ei**: rezultatul
exportului poartă simularea ca funcție, pornită de aplicație după ce fișierul a plecat — programul se simulează pe toată
foaia, în bazin, în bucata la cerere a exportului (pornirea nu se schimbă). Cât rulează, dialogul spune „Se simulează
programul… (G-code-ul e deja descărcat)” (`aria-busy`); un export nou, un parametru schimbat, un document venit din bază
sau dialogul închis o anulează. Apoi dialogul arată **harta adâncimilor** văzută de sus (tonuri de
gri: alb = fața, mai închis = mai adânc până la cea mai adâncă tăietură, negru = la fața de jos a foii sau sub ea; cel mult
480 de pixeli pe latură), **materialul scos** (cm³, nimic sub fața de jos), **cea mai adâncă tăietură** (cu „trece prin
foaie”), grila, firele, timpul și **amprenta**. Un refuz sau un worker căzut nu oprește exportul: dialogul spune de ce
lipsește simularea; un eșec (nu un refuz, nu o anulare) intră în jurnalul de erori, ca `promisiune` (un tip nou ar fi
schimbat contractul cu serverul, ADR 0039). Ales față de o fereastră separată sau de un strat pe pânză: datele sunt deja în dialogul exportului,
care are calculul la cerere; pânza primește simularea abia cu WebGL2 (ADR 0038 a ținut stratul traseului pentru asta).

**6. Determinismul, prin construcție și prin poartă.**
- În bucla pe celulă doar + − × ÷ √ min max (rotunjite corect de IEEE 754, deci aceleași pe orice motor) și funcțiile din
  `src/sim/unghi.ts`: `atan2`, `acos`, `sin`, `cos`, `tan` scrise **doar cu + − × ÷ √** (înjumătățirea unghiului și seria
  arctangentei; reducerea Cody–Waite și seriile Taylor), la câteva ulp-uri de `Math`. ECMAScript lasă `Math.sin`,
  `Math.atan2` sau `Math.hypot` „dependente de implementare”: s4 avea `acos` / `atan2` pe celulă în elice și `Math.hypot`;
  aici nu mai e niciunul. Plasele pe sursă: nicio funcție `Math` nedeterministă (nici `**`) în `src/sim/` (în afară de
  `timp.ts`), iar din `src/ir/` nucleul importă doar tipuri (o funcție de acolo, ca `baleiajArc`, ar aduce `Math.atan2`).
- O celulă e scrisă de o singură bandă; minimul valorilor rotunjite la Float32 e rotunjirea minimului, deci ordinea mutărilor
  nu contează.
- **Amprenta**: FNV-1a pe 2 × 32 de biți peste valorile Float32 ale celulelor (o dală uniformă = de 256 de ori valoarea ei),
  pe rânduri de dale, apoi peste rânduri, cu grila în față. Poarta e în e2e (`test/e2e/simulare.spec.ts`): pe cele 20 de
  piese ale corpusului, **workerul construit** (`dist/assets/lucratorSimulare-*.js`) dă în Edge, pe 1 și pe 4 fire, aceleași
  rânduri, amprente, volume, Z-uri minime și previzualizări ca Node, bit cu bit; pe calea omului, amprenta din dialog e
  aceeași pe 1 fir, pe 4 fire (`hardwareConcurrency` = 1 și 5) și în Node, pe documentul salvat de aplicație.

**7. Oracolul și probele.** Oracolul (`test/oracles/simulare.ts`, cu corpusul `simulare.cazuri.ts`) e portat din s4 de un
agent care n-a văzut nucleul (o clonă fără el) și a intrat în CI înaintea lui (`e0bb1d4`): citește TEXTUL G-code-ului,
grila densă Float64, eșantionare la celula / 8 pe arcul adevărat, regula „nucleul nu e niciodată mai sus decât oracolul cu
peste 10 nm”, marja derivată (s_z + L·s_xy / 2: formula din s4, panta × pas / 2, nu acoperea rampele) și unde nu se aplică
(pereții verticali: decide hârtia); 18 piese pe hârtie (cele 16 din s4, plus elicea și o gravură V60 în locul literelor
Arial), cele 7 otrăvuri din s4 ca martori greșiți. Nucleul trece pe 20 de piese (17 pe hârtie; profilul e scos, cu motiv)
toate verificările cu care oracolul își prinde otrăvurile; placa 1, din CAM-ul aplicației, judecată pe octeții exportați
(A și B).

## Dovada (măsurat, 19.10)

- Corpusul: 0 celule mai sus decât oracolul, 0 sub marjă, 0 greșite pe hârtie, pe 20 de piese; secțiunea bilei R = 3,
  unghiurile V 90° și 60°, lățimea radială 6 mm.
- Benzile: 1, 2, 3, 4 și 7 benzi = aceeași amprentă, același volum, aceeași previzualizare, bit cu bit, pe 9 piese; placa
  mare pe 1 și 5 benzi; programul întors = aceeași amprentă.
- Node = Edge: 20 de piese × (1 + 4 benzi), bit cu bit (e2e).
- Pornirea: 94,2 → 94,3 / 100 kB (aplicația ține anularea simulării), cu ușa 98,8 → 99,0 (strâmt; ADR 0042 se redeschide
  peste ~95). Nucleul și bazinul stau doar în bucata exportului și în worker: poarta le caută în toate bucățile.
- Timpul și memoria (măsurate de recenzie în Edge, pe 8 fire, înaintea remedierilor): placa de 2 440 × 1 220 cu 110 profile
  prin foaie, 46–104 ms în plus; foaia tăiată toată, ~240 ms; foaia la plafonul grilei (2²⁶ celule, 18 treceri), 1,6 s (9,8
  s pe un fir). Vârful de memorie al filei: ~550 MB pe foaia tăiată toată, ~885 MB la plafon; după remediere workerele se
  opresc la capătul jobului (înainte, ~340 MB rămâneau ~60 s).

## Recenzia (19.10, doi verificatori adversariali, în clone separate)

**Nucleul** (~0,37 M tokeni): 32 900 de programe aleatoare (linii 3D, plonjări, arce mici / mari / întregi / aproape
întregi, elice, freza plată / bila / V de 0,5–179,9°, celule de 0,05–0,25 mm, grile nealiniate, fața ≠ 0) și 779 de programe
din CAM (dreptunghiuri, cercuri, căi cu arce și biarce, rampe, intrări elicoidale, urechi, degajări): **0 celule mai sus
decât oracolul**; 1–9 benzi, ordinea întoarsă și amestecată: 0 abateri. Remediate, fiecare cu proba lui:
- **medie:** „prin foaie” era fals la adâncimea exactă pe grosimile care nu încap în Float32 (12,7 și 19,05 mm: placajul de
  ½″ și ¾″) → comparația cu `Math.fround(fund)`;
- **scăzută:** pragul cercului întreg (10⁻¹² rad, cu `Math.atan2` în `baleiajArc`) putea cădea altfel cu unghiurile
  deterministe → arcul cu capetele la sub 10⁻⁹ rad, dar nu în același punct, e refuzat (start = capăt rămâne cercul întreg);
- **scăzută:** a doua jumătate a amprentei amesteca `w >>> 7` (din s4) și nu vedea cei 7 biți de jos: o coliziune pe 3
  celule → cuvântul rotit; acum un ulp schimbă ambele jumătăți;
- **scăzută:** toleranța razelor capetelor (10⁻⁶·r) lăsa nucleul cu 15 nm mai sus (un singur cerc desenat) → 1 nm (CAM-ul:
  ≤ 10⁻¹² mm);
- **scăzută:** elicea cu bilă / V era refuzată și prin aer; elicea parcurgea tot discul (80 ms la r = 500) → doar inelul
  (celulele identice, verificat pe câmpul dens).
Rămân, scrise: liniile aproape verticale (deplasare în XY de 1–3 nm cu Z mare: ±16 nm izolat, mascat în programe de mutarea
vecină; CAM-ul dă plonjări exact verticale) și alarmele false ale oracolului pe treptele mici (`pePerete`, între 0,5 și 5 %
din programele aleatoare pe coordonate nerotunde; un al treilea judecător fin a arătat nucleul exact acolo) — de reparat în
oracol, într-o sesiune fără nucleu.

**Integrarea** (~0,31 M tokeni): 1 409 exporturi aleatoare reușite, fără niciun refuz al simulării; CSP, PWA offline,
id-urile joburilor, tablourile transferate, tema întunecată, en / ro: fără constatări. Remediate:
- **medie:** descărcarea G-code-ului aștepta simularea; dialogul închis între timp pierdea fișierul; al doilea clic dubla
  așteptarea → §5 (după descărcare, anulabilă);
- **medie:** un worker care tace rămânea în bazin (fiecare export apoi 120 s) → §4 (workerele jobului, oprite la capăt);
- **medie:** eșecurile simulării nu ajungeau în jurnal → §5;
- **scăzută:** poarta e2e nu vedea o hartă întoarsă, alte tonuri sau un volum greșit → pixelii hărții și cifrele, comparate
  cu cele din Node; marcajele nucleului căutate doar în bucata de pornire → în toate bucățile, cu lista celor permise;
  workerul simulării, obligatoriu în precache; pânza depășea secțiunea cu 2 px; legenda fără nicio tăietură.

**Otrăvurile** (`test/otravuri/simulare.py`): prima rundă, 43 / 44 unitare și 4 / 5 e2e (scăpate: raza capetelor, tăietura
prin foaie pe hartă → probele lor); a doua, pe codul final, cu remedierile: 60 / 61, iar D05 (dialogul închis nu oprea
simularea, fără nimic pe ecran) a primit proba workerelor oprite la închidere: 61 / 61.

## Ce impune

- Un tip de sculă nou (profil, bilă sau V în document) vine cu proba lui pe hârtie în corpus și, pentru elice, cu forma
  exactă sau refuzul păstrat.
- Orice funcție nouă în nucleu folosește doar + − × ÷ √ min max și `unghi.ts` (plasa pe sursă o cere).
- O schimbare care mută amprentele (mărimea dalei, formula amprentei) schimbă și detectorul de schimbare din
  `simulare.benzi.test.ts`, cu motivul în commit.
- Afișarea pe WebGL2 (felia 2) citește celulele nucleului (ADR 0010), nu recalculează.

## Respinse

- **Dale de 32 sau 64** (s4): aceeași viteză, memorie mai mare (60,7 MB la 32, față de 37,6 la 16).
- **`Math.atan2` / `Math.acos` pe celulă** (s4): același rezultat în Node 26 și Edge 154, dar nu garantat între motoare.
- **Simularea pe G-code** (ca oracolul): nucleul arată ce produce CAM-ul; oracolul, ce scrie postul. Două intrări diferite,
  judecate una față de alta.
- **Câmpul întreg trimis înapoi din workere**: pentru hartă și cifre ajunge rezumatul; felia 2 (WebGL2) decide ce dale urcă.
- **Simularea la cerere, după export, cu un buton**: owner-ul ar trebui să știe că există; acum vine cu exportul, iar un job
  tipic durează zeci de milisecunde (jobul 2D al sondei: ~0,6 s pe un fir).

## Rămâne (felia 2 și după)

- Afișarea în WebGL2 pe pânză (`PLAN.md` §5.3, etapa 4, punctul 3) și fereastra de 0,1 mm.
- Elicea cu bilă / V și scula de profil (la V-carve); rastrul 3D (5 M mutări: 4,3 s pe 16 fire în s4) cu dalele care urcă
  pe placa video.
- Memoria pe un job care atinge toată foaia (un buzunar mare): vârful e cel dinaintea compactării (~1 MB pe 1 000 de dale
  atinse); de măsurat pe un laptop de 8 GB (ADR 0015 se redeschide de acolo).

## Se redeschide dacă

- simularea unui job obișnuit trece de 1 s pe calculatorul owner-ului (atunci: simularea după export, în fundal, cu
  dialogul deschis imediat);
- un browser țintă dă altă amprentă decât Node (poarta pică): atunci se caută operația, nu se relaxează poarta.
