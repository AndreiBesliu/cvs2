# ADR 0210 — Planșele: mai multe foi, piesele puse de mai multe ori, plăcuțele din CSV și lista de tăiere (etapa 11)

**Starea:** acceptat pe 07.11.2026, cu toate variantele ca opțiuni pentru utilizator și recomandarea ca implicit („Da,
toate”, la „Le fac pe toate opțiuni, cu recomandarea ca implicit?”; vezi „Răspunsurile owner-ului”). Propus în aceeași zi,
în linia planșelor (worktree-ul `plansele`, ramura `wip/11.1-plansele`, din `main` `36c75cb`). **Felia 11.1↑ gata pe 07.11**
(foaia activă și lista cu foile; vezi la capăt, „Felia 11.1↑”).
Etapa 11 adusă înainte (↑), fără mașină, cât plăcile de probă nu sunt tăiate; linia a deschis-o sesiunea principală, la
întrebarea owner-ului despre ce se mai poate face în paralel. **Rândurile din prag:** „Mai multe foi de material într-un
proiect (Sheets) și plăcuțe cu date variabile din CSV (Multi-Plate)” (v1, decis 06.10) și funcția „Listă de tăiere pe mai
multe plăci” (`BRIEF.md` §10, v1). **Completează:** ADR 0024 (planșele D; „etapa 11 primește instanțele legate și
«Desprinde»”), ADR 0105, 0138 și 0142 (textul, blocul lui, caseta). **Documentul:** neschimbat pentru foi, piese, instanțe,
export și lista de tăiere; o versiune nouă doar pentru literele plăcuțelor din CSV (felia 11.4↑), prima liberă la unire:
v21 dacă 11.4↑ ajunge în `main` înaintea pereților drepți (12.1↑b, ADR 0171, care își cere tot v21), altfel v22. **Codul**
a așteptat răspunsurile și unirea liniilor incrustațiilor și a tăierii vectorilor în `main` (ating aceleași fișiere ale
CAM-ului și ale exportului): amândouă au venit pe 07.11 (`main` `8003cb2`, adus în ramură).
**Schița:** <https://claude.ai/artifact/Fe7LSU7Lo8pQg4qxGA5JYZ> (recomandările întâi, șapte planșe ale interfeței la scară,
feliile, plafonul și formularul celor opt întrebări; răspunsurile stau în baza paginii, colecția `raspunsuri`).

## Problema

- **Modelul are deja foile, aplicația nu.** Contractul v2 (ADR 0024) ține până la 1 000 de foi și câmpurile instanței
  (`campuri`), dar lista, pânza, uneltele, panoul, CAM-ul, exportul, traseul și simularea citesc doar prima foaie (`foi[0]`,
  `FOAIA = 0`). Ușa (`usaCurenta.ts`) judecă deja toate foile.
- **O piesă nu se poate pune de mai multe ori.** Nu există «Încă…»; mânerele refuză o piesă cu mai multe instanțe („copiile
  legate vin în etapa 11”), iar gruparea la fel (decizia din 02.11: „când nivelul doi devine vizibil (etapa 11), gruparea ei
  vine cu opțiuni, fără pași în plus în cazul obișnuit”).
- **O plăcuță cu nume e un text** (ADR 0105, 0138): literele lui sunt contururi scrise în piesă. 30 de nume nu pot fi o piesă
  cu 30 de instanțe fără ca fiecare instanță să-și aibă literele. `campuri` nu e folosit nicăieri.
- **`BRIEF.md` §10, „De lămurit”:** imbricarea e v2, dar foile și lista pe mai multe plăci sunt v1. Cum ajung piesele pe foi
  în v1?
- **Criteriul din prag** (`CERCETARE-DETALIATA.json`, rândul 33): cu 3 foi, o editare pe foaia activă nu schimbă nimic pe
  celelalte; Multi-Plate cu 25 de rânduri, plăcuța 80 × 30, foaia 300 × 200, distanța 5 și marginea 10 dau 15 plăcuțe pe foaie
  (3 × 5) și 2 foi (15 + 10), fiecare cu textul rândului ei, fără text ieșit din plăcuță; un traseu pe foaie, salvat separat;
  raportul foii cu mărimile (± 0,01 mm) și traseele ei.

## Ce am aflat (cercetarea din 07.11)

Referință funcțională, fără texte, interfață sau cod copiate.

- **ArtCAM 2018** (ajutorul lui: Sheets, Nesting, Multi-Plate): oricâte foi într-un model, numerotate; cea nouă devine
  activă; doar una se editează, celelalte se văd ca previzualizări; imbricarea și Multi-Plate fac foile singure, iar foile
  identice ieșite din imbricare devin una, cu numărul de copii. Traseele se calculează și se salvează foaie cu foaie; simularea
  la fel. **Multi-Plate:** șablonul e desenul ales (conturul plăcuței), cu variabile între acolade în text; datele dintr-un
  `.csv` sau `.txt` cu separator de un caracter, cu previzualizare; mărimea materialului și numărul de plăcuțe dau numărul de
  foi; distanța între plăcuțe și marginea foii, pe X și pe Y; fiecare variabilă ia o coloană, o valoare scrisă sau un număr
  care crește (start, pas, cifrele); valorile se corectează pe plăcuță; textul se potrivește în plăcuță; un traseu pe foaie.
- **Vectric** (ajutorul Aspire / VCarve, V9–V12.5): foile apar când imbricarea nu încape pe una; din V11 au fila lor: lista,
  adaugă, duplică (cu desenul și traseele), redenumește, șterge (rămâne cel puțin una), mărimea și Z0 pe foaie. Pe pânză, foile
  inactive se văd estompate, iar dublu-clic pe una o face activă; în 3D, doar cea activă; traseele sunt ale foii lor; o fișă de
  lucru pe foaie. **Plate Production:** variabile marcate în text, fișierul delimitat (virgulă, tab, punct și virgulă, spațiu),
  cu sau fără rândul de antet, coloana aleasă pe variabilă, contoarele, marginile pe fiecare latură, distanțele, câte plăcuțe
  încap pe foaie (calculat), câte un strat pe foaie, traseele pe plăcuță la cerere.
- **LightBurn** (Variable Text): rândurile CSV de la… la…, rândul curent și pasul; mai multe copii pe pagină primesc rânduri
  diferite; previzualizarea; avertismentul pentru fișierele care nu sunt UTF-8; lățimea maximă, cu strângerea textului.
- **OpenCutList** (SketchUp): lista pieselor pe material (lungimea, lățimea, grosimea, câte, aria), diagramele pe foi cu
  deșeul în procente, exportul CSV.
- **Prototipul din Faza 2** (D, încercat de owner): «Încă…», «Din CSV…», «+1», «Desprinde», lista Piese, banda violet;
  câmpul `{nume}`; «Așază pe rânduri» (marginea 10, distanța 10, ordinea listei, fără rotire, surplusul pe foaia următoare
  goală sau pe una nouă; ce nu încape rămâne pe loc, cu mesaj); valoarea pe instanță, fontul pe piesă (30 de plăcuțe: 2 noduri
  în D, 60 în A).
- **În cvs2:** comenzile jurnalului poartă deja id-ul foii; `elementeFoaie` și `taieturiFoaie` primesc indicele ei; blocul
  textului poate sta pe orice grup al piesei (gruparea îl păstrează, ADR 0130); „Limitat de casetă” (ADR 0142) micșorează un
  text doar cât să încapă, exact ce cere un nume lung.
- **CSV-ul din Excel în română** [dedus; de probat cu un fișier al owner-ului]: Excel scrie separatorul listei din Windows
  (`;` în română, unde virgula e zecimală), iar „CSV” simplu în codarea Windows (1250), nu în UTF-8; diacriticele vin sigur
  doar din „CSV UTF-8”. Ușa CSV trebuie să le primească pe toate.

## Decizia (implicitele; opțiunile din „Răspunsurile owner-ului” se adaugă lângă ele)

1. **Foile.**
   - Fără schemă nouă: foaia are numele, stocul (lățimea, înălțimea, grosimea), instanțele și ghidajele. Se adaugă doar
     **materialul**, un text liber pe foaie („MDF alb 18”, ≤ 200 de caractere), pentru lista de tăiere și numele fișierelor:
     nu schimbă tăierea (ca ghidajele, ADR 0050). Biblioteca de materiale (esența, avansurile) vine mai târziu, cu câmpul ei.
   - **Foaia activă** e a ferestrei, nu a documentului: o vedere (ca zoomul), ținută în browser pe proiect, fără revizie și
     fără anulare. Pe ea lucrează pânza, uneltele, panoul, verificarea, traseul, timpul, simularea, vederea 3D și fereastra
     exportului. Fiecare loc care citește azi `foi[0]` primește foaia activă.
   - **Lista din stânga** devine arborele cu foile: un rând pe foaie (numele, L × l × g, materialul, câte piese; cea activă
     marcată), pliabil, cu piesele dedesubt; clic pe rândul foii o face activă. La capăt, „+ Foaie” (ca foaia activă). Meniul
     foii (clic dreapta sau ⋯): Redenumește, Mărimea și materialul…, Duplică (piese separate, ca Ctrl+D), Mută sus / jos
     (ordinea la export), Șterge (cu confirmare dacă are piese; rămâne cel puțin una).
   - **Pe pânză** (întrebarea 1): toate foile, pe un rând, în ordinea listei, la 100 mm una de alta; cea activă vie,
     celelalte estompate și needitabile; dublu-clic pe una o face activă; PgUp / PgDn trec la foaia de dinainte / următoare
     (Ctrl + PgUp / PgDn sunt ale browserului); Home încadrează foaia activă, iar „Toate foile” le arată pe toate. Riglele,
     coordonatele și ghidajele sunt ale foii active (ADR 0060).
   - **Mutarea pe altă foaie:** din listă (rândul tras pe altă foaie) și din meniul de clic dreapta al selecției („Mută pe
     foaia…”, cu foile și „Foaie nouă”). Piesa își păstrează locul (x, y, rotirea); dacă iese din foaia nouă, avertismentul
     obișnuit. Nimic nu se mută singur.
   - **Comenzile noi ale jurnalului** (nu ale schemei): `adauga-foaie` / `sterge-foaie` (cu locul, instanțele și piesele care
     pleacă odată cu ultima lor instanță), `inlocuieste-foaie` (numele, materialul), `muta-foaie`. Mutarea între foi e un `lot`
     de `sterge` + `adauga`. Fiecare gest, un pas de anulare.
2. **Piesele puse de mai multe ori** (nivelul doi; ADR 0024 §1–§3).
   - **«Încă…»** pe o piesă aleasă: „Câte în total”; celelalte se adaugă ca instanțe ale aceleiași piese și se așază pe rânduri
     după ea, cu vărsarea pe foile următoare (§3). **«+1»** pune încă una lângă ultima. Ctrl+D rămâne o copie separată.
   - **Nivelul doi se vede** când o piesă are mai multe instanțe: rândul din listă spune „Suport (3 din 12)”, iar panoul „Piesa
     Suport: 12, pe 2 foi”, cu «+1» și «Desprinde».
   - **Editarea dintr-o instanță cu surori** schimbă piesa, deci toate instanțele (mânerele, nodurile, textul, rolul,
     operațiile), cu banda violet „Editezi piesa Suport: se schimbă toate cele 12”. Locul și rotirea rămân ale instanței.
     Criteriul din prag („o editare pe foaia activă nu schimbă nimic pe celelalte”) privește deci piesele care nu sunt puse
     și pe alte foi.
   - **«Desprinde»:** instanța primește o piesă a ei (copia arborelui și a operațiilor, cu id nou), în același loc.
   - **Ștergerea:** o instanță cu surori pleacă singură; ultima ia piesa cu ea, ca azi.
   - **Gruparea** cu o piesă care are surori (întrebarea 6): o întrebare, cu «Doar aceasta» (o desprinde, apoi grupează) și
     «În toate cele N» (forma intră în piesă). Cu o singură instanță, ca azi, fără întrebare.
3. **Așezarea pe foi** (răspunsul la `BRIEF.md` §10 pentru v1). Piesele ajung pe foi de mână (puse, mutate între foi) și cu
   **„Așază pe foi”**: după cutia fiecărei piese (cu rotirea ei), din colțul ales (implicit stânga-sus), rând cu rând, cu
   marginea foii și distanța dintre piese pe X și pe Y (legate implicit); ce nu încape trece pe foaia următoare dacă e goală,
   apoi pe foi noi, ca foaia activă; o piesă mai mare decât foaia rămâne pe loc, cu mesaj. Nicio mărime nu se schimbă.
   Distanța e cel puțin diametrul celei mai mari freze a profilelor exterioare (altfel tăietura unei piese intră în vecina
   ei): refuz cu motiv. Ordinea și rotirea, la întrebarea 3. Imbricarea după contur, cu fibra, rămâne v2.
4. **Plăcuțele din CSV** (Multi-Plate).
   - **Șablonul e o piesă** (o plăcuță cu ramă, canelură, găuri, text). Câmpul se scrie în text între acolade (întrebarea 4):
     `{nume}`, `Masa {nr}`. Panoul arată valorile plăcuței alese („pe această plăcuță”; forma, fontul și mărimea „pe piesă”).
   - **«Din CSV…»** pe plăcuță: fișierul (`.csv`, `.txt`) sau celulele lipite din Excel (vin cu tab); separatorul găsit singur
     (`;`, `,`, tab), cu alegerea la vedere; UTF-8 (cu sau fără BOM), altfel Windows-1250; previzualizarea tabelului; rândul de
     antet dă numele coloanelor, potrivite cu câmpurile după nume (fără litere mari și diacritice); pentru restul, o coloană,
     o valoare scrisă sau numerotarea (de la, pas, cifre); rândurile de la… la… Fiecare rând devine o instanță a piesei, cu
     valorile în `campuri`, așezată pe foi (§3), cu distanțele și marginile din dialog.
   - **Literele fiecărei plăcuțe** (singura schemă nouă a etapei, §7): instanța ține, pentru fiecare text cu câmpuri al piesei
     ei, textul așezat, literele lui și literele pe care le taie fiecare operație a piesei. `lume.ts` le pune în locul literelor
     șablonului, deci pânza, CAM-ul, verificarea și exportul le văd fără să știe de CSV. Fontul trebuie doar la gest (importul,
     o valoare schimbată, textul șablonului editat), ca azi (ADR 0105 §4): o editare a șablonului reface literele tuturor
     plăcuțelor în același pas; fără font pe calculatorul acesta, refuz cu motiv. O scalare a piesei le scalează pe toate.
   - **Un nume prea lung** (întrebarea 5): cu caseta „Limitat de casetă” pe textul șablonului, se micșorează doar cât să încapă,
     iar lista spune care plăcuțe și cât (%); fără casetă, plăcuța din care iese textul e roșie, cu avertismentul.
   - **«Desprinde»** pe o plăcuță: o piesă a ei, cu textul ei obișnuit (blocul cu valorile scrise).
5. **Exportul** (întrebarea 2). Fereastra lucrează pe foaia activă, ca azi (titlul spune foaia). În plus, **„Toate foile”**:
   câte un program pe foaie, cu fișierele pe freze ale fiecăreia (`<proiect>-foaia-2-1-T2`), descărcate împreună într-o
   arhivă `.zip` (scrisă de aplicație, fără compresie, cu aceiași octeți la fiecare export; cititorul și CRC-32 există, ADR
   0127); foile identice (aceleași forme, locuri și valori) ies o dată, cu „×N” în nume; timpul pe foaie și totalul. Programul
   unei foi e, octet cu octet, cel exportat doar din ea. „Deschide în Mașina” încarcă foaia activă; coada foilor în Mașina
   vine cu etapa 13.
6. **Raportul foilor și lista de tăiere** (întrebarea 7), într-o fereastră, din fereastra exportului și din paletă: pe fiecare
   foaie, previzualizarea (din contururi), numele, materialul, mărimea și grosimea, Z0, operațiile (freza, adâncimea) și piesele
   (numele, câte, lungimea × lățimea, rotirea, valorile din CSV), cât din foaie folosesc și foile identice (×N); la capăt,
   totalurile pe piesă și pe material. Mărimea piesei e cutia conturului care o decupează (profilul exterior prin toată
   grosimea), în axele ei; fără el, cutia desenului, marcată „desen”. CSV (UTF-8 cu BOM și `;`, ca Excel în română să-l
   deschidă direct) și tipărirea (PDF din browser). Fișa de lucru (ordinea, schimbările de freză, timpul) rămâne funcția ei,
   în etapa 15, și pornește de aici.
7. **Schema.**

   | Ce | Schema nouă |
   |---|---|
   | Foile, foaia activă, materialul foii, mutarea între foi | nu: contractul v2; materialul e o etichetă |
   | «Încă…», «+1», «Desprinde», gruparea cu surori | nu: instanțele unei piese sunt chiar modelul D |
   | Valorile din CSV | nu: `campuri`, din v2 |
   | **Literele fiecărei plăcuțe** | **da** |
   | Așezarea, exportul pe foi, foile identice, lista de tăiere | nu: scriu doar câmpuri existente sau calculează |

   Literele plăcuțelor au sens pentru tăiere: o versiune care le-ar ignora ar tăia textul șablonului („{nume}”) pe fiecare
   plăcuță. Intră deci cu o versiune nouă: `Instanta.texte` (cheia: id-ul grupului de text; valoarea: `continut`, textul
   așezat; `copii`, literele; `operatii`, id-ul operației → literele tăiate). Ușa cere ca grupul să fie al piesei, cu bloc
   valid și cu câmpuri; `continut` să fie textul blocului cu valorile din `campuri` (o verificare de șiruri, fără font); id-urile
   literelor unice și diferite de ale piesei; operațiile ale piesei, pe literele din `copii`. Plafoanele rămân (100 000 de
   elemente în lume, cu literele plăcuțelor). Numărul: primul liber la unire (`main` e v20 din 07.11, iar ADR 0171 își cere
   v21: deci **v21** dacă 11.4↑ ajunge întâi, altfel v22). Migrarea schimbă doar numărul; o instanță care are deja un câmp necunoscut `texte`
   e refuzată, cu motiv (ciocnire, ca la ADR 0024 §7). Oracolul documentului și corpusul de aur (ADR 0121) trec la ea. Doar
   felia 11.4↑ o cere.
8. **Cifrele.** Măsurat aici, pe `36c75cb`: pornirea 101,4 kB (cu ușa 104,9 / 110), totalul 506,0 / 550. Liniile deschise
   (notele lor): incrustațiile +4,3, tăierea vectorilor +10,4, imprimanta +8,0, deci ~528,7 după unire (~21 kB liberi), înainte
   de feliile lor următoare. Etapa 11, estimată după felii asemănătoare (panoul tăierii 1,9 kB, workerul CAM +3,2…4,5 kB pe
   felie): **~25–35 kB** în total, ~28–38 kB cu opțiunile din răspunsuri (tabelul feliilor), iar pornirea +0,5…1 kB (lista
   cu foile și foaia activă; restul la cerere). Nu încape: întrebarea 8. Timpul: 12.1↑ a cerut 2 h 17 min de cod după răspunsuri (~5 h estimate); aici ~2–4 h pe
   felie, cu probele, deci ~3–4 zile de lucru activ.

## Feliile propuse

| Felia | Ce | Schema | Mașina | Depinde de | JS (estimat) |
|---|---|---|---|---|---:|
| 11.1↑ | Foaia activă în toată aplicația; lista cu foile (+ Foaie, redenumește, mărimea și materialul, duplică, mută, șterge); mutarea între foi; exportul foii active | nu | nu | unirea incrustațiilor și a tăierii în `main` | ~5 kB |
| 11.1↑b | Pânza cu toate foile (răspunsul 1): estompate, dublu-clic, PgUp / PgDn, comutatorul „Toate foile” / „Doar foaia activă” | nu | nu | 11.1↑ | ~2,3 kB |
| 11.2↑ | «Încă…», «+1», «Desprinde», nivelul doi în listă și în panou, banda violet, gruparea cu surori (întrebarea cu „Ține minte”, rândurile din meniu), „Duplică foaia” cu aceleași piese | nu | nu | 11.1↑ | ~4,8 kB |
| 11.3↑ | „Așază pe foi”: rândurile, vărsarea, distanța minimă din freză, ordinea și rotirea; „Mută și așază la capăt” | nu | nu | 11.2↑ | ~3 kB |
| 11.4↑ | Plăcuțele, nucleul: literele fiecărei plăcuțe (v21 sau v22, după ordinea cu 12.1↑b), `lume.ts`, CAM-ul, ușa, migrarea, câmpurile în panou; oracolul documentului scris separat (un agent, cu acordul tău și costul spus) | **nouă** | nu | 11.3↑ | ~5 kB |
| 11.4↑b | «Din CSV…»: fișierul sau lipirea, separatorul, codarea, antetul, potrivirea, „Fă din textul ales câmpul”, numerotarea, rândurile; numele prea lungi (avertismentul sau confirmarea la export) | nu | nu | 11.4↑ | ~5 kB |
| 11.5↑ | „Toate foile” la export: arhiva, foile identice ×N, timpii | nu | nu | 11.1↑ | ~3,5 kB |
| 11.5↑b | Un singur program pentru toate foile, cu oprire între ele (foi cu aceeași mărime și grosime, în același colț; confirmarea la fiecare foaie) | nu | da (proba) | etapa 13 | ~2,5 kB |
| 11.6↑ | Raportul foilor și lista de tăiere: fereastra, CSV cu `;` sau `,`, mărimea tăiată sau a desenului, tipărirea | nu | nu | 11.1↑ (valorile CSV: 11.4↑) | ~4,7 kB |
| 11.7 | Fișa plăcii 11: așezarea pe rânduri, vărsarea pe foaia 2, plăcuțele din CSV, cu cotele pe hârtie | — | da | 11.3↑–11.5↑ | — |

## Proba (scrisă întâi)

- **Pe hârtie.** Criteriul din prag: 80 × 30 pe 300 × 200, marginea 10, distanța 5: 3 · 80 + 2 · 5 = 250 ≤ 280 (4 nu încap:
  335), 5 · 30 + 4 · 5 = 170 ≤ 180 (6 nu încap: 205), deci 15 pe foaie și 25 = 15 + 10; din stânga-sus, colțurile plăcuțelor
  la x = 10 / 95 / 180 și y = 160 / 125 / 90 / 55 / 20; foaia 1 folosită 60 %, foaia 2 40 %. Prototipul: 12 suporturi
  150 × 100 pe 600 × 400 (10 / 10) dau 9 + 3 (56,25 % și 18,75 %), 30 de plăcuțe 180 × 60 dau 15 + 15. Distanța minimă cu
  Ø6 pe exterior: 6 mm.
- **Foile:** o editare pe foaia activă lasă celelalte foi identice (JSON-ul canonic), pe 3 foi; programul fiecărei foi din
  „Toate foile” e octet cu octet programul exportat doar din ea; arhiva are aceiași octeți la fiecare export.
- **Plăcuțele:** literele fiecărei plăcuțe sunt, sub 1e-9 mm, literele unui text obișnuit cu același conținut; corpusul
  Python al textului (fontTools) primește câteva nume (Ana, Mihaela, Ștefan, unul prea lung în casetă); niciun text nu iese din
  conturul plăcuței; fiecare plăcuță are textul rândului ei.
- **CSV-ul:** un corpus scris de mână (ghilimele cu separator și rând nou în ele, `;`, tab, BOM, Windows-1250 cu ș ț ă,
  celule goale, CRLF), cu tabelele așteptate scrise alături.
- **Oracolul documentului** pe noua versiune, scris separat; otrăvurile pe fiecare felie.

## Ce am respins

- **O piesă pe plăcuță, legată de șablon** (ca A): fără schemă nouă și fără grija consumatorilor, dar al doilea fel de
  „împreună” lângă instanțe (prima problemă din `LECTII.md` §5.4) și 60 de noduri în loc de 2 la 30 de plăcuțe (prototipul).
- **Literele plăcuței așezate din font la fiecare afișare:** pânza, CAM-ul și exportul ar avea nevoie de font (respins și în
  ADR 0105).
- **Foaia activă în document:** e o vedere; ar face revizii și certuri între file.
- **Un singur program pentru toate foile, cu oprire între ele:** fiecare placă nouă cere din nou zero-ul; foaie cu foaie, ca
  ArtCAM și Vectric.
- **Imbricarea după contur în v1:** rămâne v2 (rândul din prag), cu fibra (mai târziu).
- **Importul `.xlsx`:** un cititor de XML arhivat ar costa peste 10 kB; CSV-ul și lipirea din Excel acoperă același lucru.
- **Biblioteca de piese** (piese fără instanțe, ținute): un concept în plus; piesa pleacă odată cu ultima ei instanță.
- **Numărul de copii pe foaie** (un câmp): foile identice se găsesc singure, la export și în listă.

## Ce impune

- Locurile cu `foi[0]` / `FOAIA = 0`: `src/app/App.tsx`, `ExportConectat.tsx`, `PanouProprietati.tsx`, `Editare.tsx`,
  `editareCalcul.ts`, `noduriCalcul.ts`, `src/cam/job.ts`, `src/jobs/calculCam.ts`, `src/model/alegere.ts`,
  `src/ui/actiuniDocument.ts`, `actiuniDocumentCalcul.ts`, plus ~20 de apeluri ale `elementeFoaie` / `taieturiFoaie` cu indicele
  implicit 0.
- Unirea întâi: liniile incrustațiilor și a tăierii ating aceleași fișiere (CAM, export, Editare); versiunea nouă a
  plăcuțelor vine după v20 (făcut: `main` `8003cb2`, adus în ramură).
- Manualul (ro, en): capitolele foilor, ale pieselor puse de mai multe ori, ale plăcuțelor din CSV și ale listei de tăiere;
  ușile noi în `manual.test.ts`.

**Se redeschide dacă:** lucrul cu foile reale sau placa 11 cer altceva (ADR 0024 se redeschide tot atunci); un lot real de
plăcuțe trece de plafoane; imbricarea (v2) vine mai devreme, iar „Așază pe foi” devine primul ei mod.

## Întrebările (recomandarea întâi)

1. **Cum vezi foile?** **a)** toate pe pânză, una lângă alta, cea activă vie, celelalte estompate; dublu-clic o face activă
   (ca Vectric; plăcile „văzute împreună”, cum cereai în ediția întâi, `LECTII.md` §5.3); b) doar foaia activă, schimbată
   din listă și cu PgUp / PgDn (ca ArtCAM); c) b, plus
   „Toate foile”, doar pentru privit.
2. **Exportul cu mai multe foi:** **a)** foaia activă, ca azi, plus „Toate foile”: un program pe foaie, într-o arhivă `.zip`,
   foile identice o dată, cu „×N”; b) doar foaia activă, exportată pe rând; c) a, plus un program unic pentru toate foile, cu
   oprire între ele.
3. **Așezarea pe foi:** a) ordinea listei, fără rotire, ca în prototip; b) cele mari întâi, rotite cu 90° când încap mai
   multe; **c)** amândouă, alese în dialog (implicit a).
4. **Câmpurile din text:** **a)** între acolade (`{nume}`), potrivite singure cu coloanele după nume, cu alegerea pentru
   rest și numerotarea; b) fără acolade: alegi un text al plăcuței și îi dai coloana.
5. **Un nume prea lung:** **a)** cu caseta „Limitat de casetă” pe textul șablonului se micșorează cât să încapă, iar lista
   spune care și cât; fără casetă, avertisment; b) plăcuța e roșie și exportul cere confirmare; c) nimic: iese din plăcuță,
   cu avertismentul.
6. **Gruparea unei piese puse de mai multe ori:** **a)** o întrebare: «Doar aceasta» sau «În toate cele N»; b) mereu doar
   aceasta; c) mereu în toate.
7. **Raportul foilor și lista de tăiere:** **a)** o fereastră (pe foi, cu previzualizarea, operațiile și totalurile), cu
   CSV și tipărire; b) doar CSV-ul listei; raportul foii vine cu fișa de lucru, în etapa 15.
8. **Plafonul pachetului:** **a)** 550 → 600 kB, cu ADR nou (pornirea rămâne 110 kB; ~0,5–0,7 s în plus la prima instalare
   pe 750 kbit/s); b) loc făcut întâi (Workbox ~4 kB; Preact în locul lui React, ~45–50 kB, o felie cu risc); c) etapa mai
   mică: fără pânza cu toate foile (1b) și cu lista doar CSV (7b), ~5 kB mai puțin.

## Răspunsurile owner-ului (07.11)

După propunere, owner-ul a întrebat: „ma intreb cate dintre raspunsuri/optiuni pot coexista ca optiuni pentru utilizator”.
Răspunsul dat: șapte din opt, cu recomandarea ca implicit și restul la un clic, fără pași în plus în cazul obișnuit (regula
lui de la grupare, 02.11); plafonul nu e o opțiune a utilizatorului. La „Le fac pe toate opțiuni, cu recomandarea ca
implicit?”: **„Da, toate”**. Deci:

1. **Vederea:** comutatorul „Toate foile” / „Doar foaia activă”, ținut minte în browser pe proiect; implicit toate (1a);
   „Doar foaia activă” e 1b, iar 1c se cuprinde în ele.
2. **Exportul:** foaia activă și „Toate foile” (arhiva, foile identice ×N), acum. Programul unic pentru toate foile, cu
   oprire între ele (2c), e felia 11.5↑b, după etapa 13, cum spunea același răspuns: doar pentru foi cu aceeași mărime și
   grosime, puse în același colț, cu oprirea ca la schimbarea frezei și confirmarea omului la fiecare foaie.
3. **Așezarea:** ambele moduri în dialog (3c), implicit ordinea listei, fără rotire.
4. **Câmpurile:** acoladele scrise de mână (4a) și, în dialogul CSV, „Fă din textul ales câmpul {Coloana}”, care scrie
   acoladele pentru om (4b); plus numerotarea.
5. **Numele prea lung:** modul casetei pe textul șablonului (fără, „Limitat de casetă”, „Scalat la casetă”, ADR 0142); pentru
   un text care tot iese din plăcuță, avertismentul (implicit) sau confirmarea la export, alese în dialogul CSV.
6. **Gruparea cu surori:** întrebarea («Doar aceasta» / «În toate cele N»), cu „Ține minte alegerea”, plus „Grupează doar
   aceasta” și „Grupează în toată piesa” în meniul de clic dreapta.
7. **Raportul și lista:** fereastra, CSV-ul cu `;` (implicit, Excel în română) sau `,`, tipărirea.
8. **Plafonul:** 550 → 600 kB (8a). E luat din același „Da, toate”, fiindcă răspunsul la întrebare spunea că opțiunile cer
   plafonul ridicat („În ambele cazuri trebuie ridicat plafonul (8a)”). ADR-ul lui vine la prima felie care trece de 550;
   pornirea rămâne 110 kB.

**Implicitele mele devenite opțiuni:** „Mută și așază la capăt” lângă „Mută pe foaia…” (11.3↑); „Duplică foaia” cu copii
separate (implicit) sau cu aceleași piese (11.2↑); mărimea piesei în raport, cea tăiată (implicit) sau a desenului (11.6↑).
**Rămân reguli:** distanța minimă cât freza (sub ea, tăietura unei piese intră în vecina ei), un singur marcaj al câmpurilor
(`{nume}`), locul literelor plăcuțelor în document. Biblioteca de piese rămâne pentru mai târziu. Numărul schemei
plăcuțelor: v21 dacă 11.4↑ ajunge în `main` înaintea lui 12.1↑b (ADR 0171), altfel v22.

## Felia 11.1↑ (gata pe 07.11)

- **Foaia activă** e a ferestrei: o vedere ținută în browser (`cncvs2.foaia`, `src/app/foaiaActiva.ts`; un singur proiect în
  browser, deci o singură cheie), fără revizie și fără anulare; un id necunoscut (foaia ștearsă, alt proiect) dă prima foaie.
  Se dă explicit: `ContextDocument.foaie` în registru, `indexFoaie` / `idFoaie` în editare, în panouri și în cererile
  workerului CAM care fac id-uri noi (verificarea, reparația, tăierea primesc documentul întreg, ca id-urile să nu se
  ciocnească cu ale altor foi). CAM-ul care doar citește (exportul, traseul, timpul, simularea, vederea 3D) primește
  documentul văzut din foaie (`doarFoaia`): programul unei foi e, octet cu octet, al documentului doar cu ea (proba unitară pe
  trei foi; cea e2e pe placa 1 A, exportată de pe foaia 2).
- **Lista:** foile una sub alta (numele; dedesubt mărimea, materialul și câte piese); piesele doar sub cea activă. „+ Foaie
  nouă” pune una după cea activă, ca ea (mărimea, materialul). Meniul foii (⋯ sau clic dreapta) vine la cerere
  (`MeniuFoaie.tsx`): **„Nume, mărime și material…”, un singur rând în locul celor două din §1** (deschide panoul de
  proprietăți al foii, unde stau toate trei), „Duplică foaia”, „Mută foaia mai sus / jos”, „Șterge foaia” (cu confirmare când
  are piese; ultima rămâne, oprită, cu motivul). PgUp / PgDn trec la foaia de dinainte / următoare; cu Ctrl, ⌘ sau Shift,
  nimic (filele browserului). Cipul din bara de jos („Foaia 2 · 2 din 3”) apare doar cu mai multe foi.
- **Mutarea pe altă foaie:** meniul de clic dreapta al pânzei („Mută pe Foaia 2”, „Mută pe o foaie nouă”; cu multe foi,
  meniul derulează) sau rândul tras pe altă foaie (cu selecția lui, dacă e în ea); un `lot` de `sterge` + `adauga`, deci un
  pas; locul și rotirea rămân, foaia activă la fel.
- **Jurnalul:** `adauga-foaie`, `sterge-foaie`, `muta-foaie` și **`eticheta-foaie`** (numele sau materialul; mărimea rămâne la
  `inlocuieste-stoc`, deci `inlocuieste-foaie` din §1 n-a mai fost nevoie). Aplicarea lor stă în `jurnalFoi.ts`, înregistrată
  în jurnal odată cu comenzile (`foiComenzi.ts`), adică odată cu calculul acțiunilor: o comandă a foilor se naște doar acolo.
- **`material` nu e în schemă** (abaterea de la §1, unde era „un text liber, ≤ 200 de caractere”): oracolul documentului
  generează documente vechi cu un câmp necunoscut `material` pe foaie, cu orice valoare (obiect, număr, `null`), iar un
  document valid ieri trebuie să rămână valid fără o schemă nouă (86 de probe ale oracolului au căzut pe varianta strictă).
  Deci ușa nu-l judecă și îl păstrează; aplicația îl citește doar când e text (`materialFoaie`) și scrie doar text de cel mult
  200 de caractere; comanda etichetei ține valoarea veche exactă (`{ valoare }` sau null), ca anularea să întoarcă și un
  material străin, la locul lui.
- **Exportul:** titlul ferestrei spune foaia când proiectul are mai multe („Exportă G-code (GRBL 1.1) · Foaia 2”); numele
  fișierelor rămân cele de azi (`cncvs2-<origine>.nc`): cele pe foi (`<proiect>-foaia-2-…`) vin cu „Toate foile” (11.5↑).
- **Limita știută:** o cale Pen începută înainte de PgUp / PgDn se termină pe foaia de după; gesturile față de foi vin cu
  11.1↑b (toate foile pe pânză).
- **Măsurat:** pornirea 101,5 → 103,7 kB (cu ușa 105,1 → 107,2 / 110), totalul 519,5 → 524,7 / 550: sub 550, deci ADR-ul
  plafonului de 600 kB rămâne pentru o felie viitoare. Prima variantă urca pornirea cu 3,5 kB; au ieșit din ea comenzile
  foilor, aplicarea lor în jurnal și meniul foii. În pornire rămân lista cu foile, legăturile din `App.tsx` și rândurile
  registrului.
- **Probele:** `foi.test.ts` (comenzile, inversele exacte, materialul străin), `foi.actiuni.test.ts` (registrul pe trei foi,
  criteriul din prag pe JSON-ul canonic, exportul fiecărei foi față de documentul doar cu ea, foaia ținută), `foi.spec.ts`
  (e2e: lista, PgUp / PgDn, reîncărcarea, mutarea din meniu și prin tragere, ștergerea cu confirmare, numele și materialul,
  exportul foii a doua, traseul care urmează foaia), manualul (capitolul „Foile”, 9 uși noi), otrăvurile
  `test/otravuri/11.1.py`: 42; prima rulare (`87a7537`): 41 prinse, C01 scăpată (id-ul foii noi nu sărea peste unul folosit: proba n-avea un gol în id-uri) → cazul f1, f3 → f4 în `foi.test.ts`, apoi prinsă, deci 42 / 42; cele 10 e2e (U01–U10), în clonă, pe portul 4178.
