# ADR 0210 — Planșele: mai multe foi, piesele puse de mai multe ori, plăcuțele din CSV și lista de tăiere (etapa 11)

**Starea:** acceptat pe 07.11.2026, cu toate variantele ca opțiuni pentru utilizator și recomandarea ca implicit („Da,
toate”, la „Le fac pe toate opțiuni, cu recomandarea ca implicit?”; vezi „Răspunsurile owner-ului”). Propus în aceeași zi,
în linia planșelor (worktree-ul `plansele`, ramura `wip/11.1-plansele`, din `main` `36c75cb`). **Feliile 11.1↑ și 11.1↑b gata pe
07.11** (foaia activă și lista cu foile; toate foile pe pânză), **11.2↑, 11.3↑ și 11.4↑ pe 08.11** (piesele puse de mai
multe ori; „Așază pe foi”; plăcuțele, nucleul), **11.4↑b și 11.4↑c pe 09.11** («Din CSV…»; textul care iese din plăcuță),
**11.5↑ și 11.6↑ pe 13.11** („Toate foile” la export; raportul foilor și lista de tăiere; vezi la capăt).
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

## Felia 11.1↑b (gata pe 07.11)

- **Pe pânză**, foile stau una lângă alta, în ordinea listei, la 100 mm una de alta, cu fețele de jos la Y 0 (`locuriFoi`,
  `SPATIU_FOI`). Originea rămâne a foii active, deci riglele, coordonatele, ghidajele, uneltele și traseul rămân ale ei, fără
  nicio schimbare; celelalte foi se arată față de ea, estompate (foaia la jumătate peste fundal, liniile la 35 %) și
  needitabile, fiecare cu numele deasupra. **Foaia activă n-are nume pe pânză:** acolo stă rigla ei (prima variantă îl
  scria sub riglă); o arată lista, cipul și culoarea ei.
- **Workerul pânzei** primește foile vecine într-un mesaj al lor (`CerereFoi`), trimis doar când se schimbă, înaintea cererii
  de desen care le folosește: o deplasare nu le copiază din nou la fiecare cadru. Foile din afara pânzei se sar. Desenul unei
  foi vecine se ține în aplicație cât rămân aceeași foaie și aceleași piese, deci o editare pe foaia activă nu le reface.
- **Dublu-clic** pe o foaie estompată o face activă; vederea se mută cu originea (cu x-ul foii), deci pânza nu sare, iar
  cursorul din bara de jos se arată din colțul foii noi. Uneltele care folosesc dublu-clicul (Pen la capătul căii, Noduri pe o
  latură) îl iau înaintea pânzei. PgUp / PgDn, clicul din listă și meniul nu mută vederea: foaia nouă vine în locul celei de
  dinainte, ca până acum.
- **Comutatorul „Toate foile pe pânză”** (`vedere.toate-foile`, în dreapta-jos, lângă „Arată traseul”, doar cu mai multe
  foi), ținut în browser (`cncvs2.toate-foile`, implicit pornit): pornit, le încadrează pe toate (potrivirea primește o
  cutie, `src/canvas/potrivire.ts`); oprit, rămâne doar foaia activă, încadrată. `Home` încadrează foaia activă.
- **Măsurat:** pornirea 103,7 → 104,3 kB (cu ușa 107,8 / 110), totalul 524,7 → 525,5 / 550 (desenul foilor stă în
  workerul pânzei, nu în pornire).
- **Probele:** `foi.panza.test.ts` (rândul pe hârtie, încadrarea unei cutii, comutatorul ținut), e2e-ul pânzei din
  `foi.spec.ts` (pixelii foii estompate, ai fundalului dintre foi și ai foii active, cerneala numelui, dublu-clicul cu vederea
  mutată exact cu 400 mm și cursorul, comutatorul oprit și ținut după reîncărcare), manualul (96 de uși), otrăvurile
  `test/otravuri/11.1b.py`: 19; toate prinse la prima rulare (`235ed5d`): 6 unitare și 13 prin e2e, în clonă, pe portul 4178.

## Felia 11.2↑ (gata pe 08.11)

- **«Încă…»** (panoul Proprietăți, la „Piesa”, cu o singură piesă aleasă) cere „Câte în total” (mai multe decât acum, cel
  mult 1 000) și arată, înainte de „Adaugă N”, unde ajung copiile („1 pe Foaia 1, 2 pe o foaie nouă”). Copiile sunt instanțe
  ale aceleiași piese (`adauga` cu instanța copiată, id nou, locul nou), într-un pas: pe rândul piesei, la dreapta ei, apoi pe
  rânduri dedesubt, de la marginea foii (`MARGINE_COPII`, 10 mm); între piese, `distantaCopii`: cel puțin 5 mm sau diametrul
  celei mai mari freze a profilelor exterioare (§3); un loc mai aproape de o piesă de pe foaie se sare; ce nu încape trece pe
  foaia următoare dacă e goală, apoi pe foi noi după ea, ca foaia piesei (`planCopii`, `src/model/pieseLegate.ts`). O piesă
  care nu încape între margini se refuză (`motiv.inca-prea-mare`), fără foi noi fără sfârșit. **«+1»** pune una după
  ultima instanță a piesei, în ordinea proiectului. Așezarea e chiar nucleul lui „Așază pe foi” (11.3↑), care primește
  colțul, ordinea și rotirea.
- **Nivelul doi se vede:** în listă, rândul unei piese puse de mai multe ori spune, violet, „(3 din 12)” (spațiul e în
  textul butonului, deci și în numele lui); panoul, „Pusă de 12 ori: o schimbare a ei se vede la toate. (Foaia 1: 2 · Foaia
  2: 10)”, cu «+1», «Încă…» și «Desprinde».
- **Editarea legată:** refuzurile pieselor împărțite au ieșit din mânere (scalarea, oglindirea, înclinarea), din noduri, din
  forma din panou (`comandaForma`, prin care trec și nodurile, ADR 0068) și din textul editat: schimbarea intră în piesă,
  deci la toate instanțele; locul și rotirea rămân ale fiecăreia. Două instanțe alese ale aceleiași piese pe care schimbarea
  le-ar face diferit (rotite altfel, la o scalare neuniformă, o oglindire sau o înclinare) se refuză (`piesa-impartita`, cu
  textul nou: „alege doar una”); la fel, piesa intră o singură dată în comandă. Rămân refuzate, cu „Desprinde-o întâi” în
  motiv: degruparea, reparațiile verificării (decizia 8a) și tăierea vectorilor, unde o piesă s-ar face mai multe.
- **Banda violet** (`--violet`, cu textul derivat pe temă, `--t-pe-violet`: 7,4:1 în ambele): „Editezi o piesă pusă de 4
  ori: se schimbă toate (2 pe foaia aceasta).”, cu „Desprinde-o doar pe aceasta” când e aleasă una. **Stă jos, la mijlocul
  zonei libere a pânzei:** sus, riglele urmează foaia și o acopereau (prima variantă, sub meniul aplicației, nici nu se putea
  apăsa; e2e-ul a prins-o).
- **«Desprinde»** (panoul, banda): fiecare instanță aleasă cu surori primește o copie a piesei (arborele cu noduri
  noi, operațiile), cu id nou, în același loc al listei (`sterge` + `adauga`); ultima instanță păstrează piesa.
- **Gruparea cu surori** (întrebarea 6): fără alegere ținută, **Grupează** (butonul, `Ctrl+G`) întreabă, sus, sub bare: «Doar
  aceasta» (o desprinde, apoi gruparea obișnuită, într-un `lot`) sau «În toate cele N» (celelalte forme intră în piesa
  gazdei, la locul lor față de instanța ei, cu rotirea ei scoasă: apar lângă fiecare instanță; merge cu o singură piesă cu
  surori printre cele alese, `motiv.grupare-toate-una`). „Ține minte alegerea” o ține în browser (`cncvs2.grupare-surori`,
  `src/ui/grupareSurori.ts`); o stocare care aruncă înseamnă „întreabă”. Meniul de clic dreapta are, în locul lui Grupează,
  „Grupează doar aceasta” și „Grupează în toată piesa”, fără întrebare. Întrebarea se închide la altă selecție.
- **„Duplică foaia cu aceleași piese”** (meniul foii, `foaie.duplica-legat`): o foaie nouă după ea, ca ea (fără nume), cu
  instanțe noi ale acelorași piese, la aceleași locuri, care devine activă. „Duplică foaia” rămâne cu copii separate.
- **Registrul:** `piesa.inca`, `piesa.plus-unu`, `piesa.desprinde`, `foaie.duplica-legat`, la cerere (calculul în
  `actiuniDocumentCalcul.ts`); `idNou` și `copieArbore` s-au mutat în `src/model/copii.ts`, ca modelul să le folosească fără
  registru.
- **Măsurat:** pornirea 104,5 → 104,9 kB (cu ușa 108,0 → 108,5 / 110), totalul 541,1 → 544,4 / 600 (estimarea era ~4,8 kB).
- **Probele:** `pieseLegate.test.ts` (locurile pe hârtie: rândurile, obstacolele, foaia următoare goală, foile noi, distanța
  din freză, rotirea; «Desprinde»; copia legată a foii; fiecare cu inversa exactă), `pieseLegate.actiuni.test.ts` (registrul,
  pe hârtie: «Încă…» cu vărsarea pe o foaie nouă și refuzurile, «+1» după ultima, «Desprinde», „Duplică foaia cu aceleași
  piese” cu forma schimbată pe ambele, gruparea cu întrebarea, «Doar aceasta», «În toate cele N», și cu gazda rotită;
  alegerea ținută), probele vechi ale refuzurilor rescrise pe §2 (transformările, înclinarea, nodurile, textul, forma din
  panou, gruparea), `piese-legate.spec.ts` (e2e: panoul, lista, banda, editarea legată, «Desprinde» din bandă și din panou,
  întrebarea cu Renunță și „Ține minte”, rândurile din meniu, copia legată a foii), manualul (capitolul nou „Piesele puse
  de mai multe ori”, 32 de capitole, 101 uși), otrăvurile `test/otravuri/11.2.py`: 32; toate prinse la prima rulare (`cb7efec`): 20 unitare (L05, rândurile care urcă, și L08, fără garda piesei prea mari, prin termenul de 300 s: planul copiilor nu se mai termină) și 12 prin e2e, în două clone, pe portul 4178.

## Felia 11.3↑ (gata pe 08.11)

- **„Așază pe foi”** (`foaie.aseaza`; fereastra `DialogAsezare.tsx`, la cerere, din meniul de clic dreapta al pânzei și din
  meniul foii; planșa 3 a schiței): ce se așază (piesele alese, implicit când sunt, sau toate de pe foaia activă), colțul de
  pornire (implicit stânga-sus), marginea foii și distanța dintre piese pe X și pe Y (cu „Aceeași pe X și pe Y”, implicit
  bifată), ordinea și rotirea (răspunsul 3: ambele moduri, implicit ordinea listei, fără rotire), foile noi și, înainte de
  „Așază”, rezultatul („7 piese pe 2 foi: 4 + 3. Una e o foaie nouă.”). Alegerile se țin în browser (`cncvs2.asezare`,
  `src/app/asezareTinuta.ts`; o valoare stricată dă implicitele). Scrierea dialogului trece pe lângă garda „dialog
  deschis”, ca exportul și importul.
- **Așezarea** (`planAsezare`, `src/model/asezare.ts`): după cutia fiecărei piese (cu rotirea ei), din colțul ales, rând cu
  rând (fiecare rând cât piesa cea mai înaltă din el); piesele care rămân pe foaie se ocolesc, la distanța aleasă și cel
  puțin cât freza profilului lor exterior; un rând oprit de ele coboară sub piesa care l-a oprit. Ce nu încape trece pe
  foaia următoare dacă e goală, apoi pe foi noi, ca foaia țintă (mărimea, materialul; fără ghidaje), după ultima folosită.
  O piesă mai mare decât foaia rămâne pe loc, iar fereastra o spune. Instanțele care rămân pe foaia lor își schimbă locul și
  rotirea (`inlocuieste-instanta`, doar când se schimbă ceva: altfel „nimic de mutat”); cele care pleacă ies de pe foaia lor
  și intră la capătul listei foii noi. Un pas de anulare. Selecția păstrează doar piesele rămase pe foaia activă.
- **Distanța minimă** e regulă: cea mai mare freză a profilelor exterioare ale pieselor așezate. Scrisă mai jos de om,
  refuz cu motiv (`motiv.aseaza-distanta`), iar fereastra arată minimul („cel puțin 6 mm: freza Ø6 a profilului
  exterior”). Unde omul n-a scris nimic (fereastra la deschidere, „Mută și așază la capăt” din meniu), distanța ținută
  urcă singură la minim: altfel, cu implicitul de 5 mm și dreptunghiul cu freza Ø6, gestul ar fi fost refuzat fără ca omul
  să fi ales vreo distanță.
- **Ordinea „cele mari întâi”**: după arie, descrescător (la egalitate, ordinea listei). **Rotirea „90° când încap mai
  multe”**: se calculează două așezări, cu orientarea de acum și cu piesele culcate (rotite cu 90° cele mai înalte decât
  late; o piesă care încape doar rotită se rotește oricum); se ia cea culcată doar dacă e strict mai bună: mai puține piese
  rămase pe loc, apoi mai puține foi, apoi mai multe pe prima. Proba: 6 piese de 50 × 110 pe 300 × 200 încap culcate pe o
  foaie (2 × 3), în picioare doar 5 + 1; plăcuțele de 80 × 30, deja culcate, rămân nerotite.
- **„Mută și așază la capăt”** (`selectie.muta-si-aseaza`; răspunsurile, „implicitele devenite opțiuni”): în meniul de clic
  dreapta, lângă „Mută pe”, câte un rând „Mută și așază la capăt pe Foaia N” pentru fiecare altă foaie și „Mută și așază pe o
  foaie nouă” (ca foaia activă, după ea). Piesele alese pleacă pe foaia țintă și se așază după piesele ei (ocolite), cu
  alegerile ultimei așezări; foaia activă rămâne, selecția se golește (ca la „Mută pe”).
- **Paleta:** `selectie.muta-si-aseaza` apare în grupul selecției, oprită fără o foaie țintă (ca `selectie.muta-pe-foaie`);
  `foaie.aseaza`, ca acțiunile foilor, nu.
- **Măsurat:** pornirea 104,9 → 105,3 kB (cu ușa 108,5 → 108,9 / 110: rămân 1,1 kB pentru feliile următoare), totalul
  544,4 → 548,7 / 600 (estimarea era ~3 kB; au venit în plus fereastra și „Mută și așază”).
- **Probele:** `asezare.test.ts` (pe hârtie: cele 25 de plăcuțe din prag, 15 + 10, la x = 10 / 95 / 180 și y = 160 / 125 /
  90 / 55 / 20; colțurile; marginile și distanțele diferite pe X și pe Y; piesele rămase, și cu freza lor de 8; distanța sub
  freză; valorile; piesa prea mare; ordinea; rotirea, cu varianta culcată doar când e mai bună; vărsarea pe foaia următoare
  goală și oprirea la una cu piese; mutarea pe altă foaie; fiecare cu inversa exactă), `asezare.actiuni.test.ts` (registrul,
  pe hârtie, cu refuzurile; „Mută și așază” pe o foaie cu o piesă ocolită și pe o foaie nouă; alegerile ținute),
  `asezare.spec.ts` (e2e: fereastra din meniul foii și din cel de clic dreapta, distanța de la freză, rezultatul, refuzul,
  colțul ținut, anularea; „Mută și așază la capăt pe Foaia 2”), manualul (capitolul „Foile”, 103 uși), otrăvurile
  `test/otravuri/11.3.py`: 32; pe codul final (`87f3aee`) toate prinse. La prima rulare (`ab85477`): 22 unitare prinse, A05 prin termenul de 300 s (fără distanță, saltul peste piesa rămasă nu mai înainta: rescrisă cu un milimetru în plus) și A09 scăpată (nicio probă cu culcarea mai proastă: proba nouă, 16 piese de 30 × 80 care încap doar în picioare); 8 prin e2e, în două clone, pe portul 4178.

## Felia 11.4↑ (gata pe 08.11)

- **Documentul v23** (`4c0f0d7`; schema nouă a etapei, §7): `Instanta.texte`, cheia e id-ul unui grup de text cu câmpuri al
  piesei, valoarea `continut` (textul blocului cu valorile din `campuri`), `copii` (literele) și `operatii` (id-ul operației →
  literele pe care le taie). Migrarea v22 → v23 schimbă doar numărul; o instanță v22 cu un `texte` necunoscut e o ciocnire.
  `lume.ts` pune literele plăcuței în locul literelor șablonului (`cuLitere`), iar tăieturile le iau pe ale ei
  (`noduriInInstanta`): pânza, CAM-ul, verificarea, exportul și cutiile le văd fără să știe de CSV. `numara` le socotește în
  plafoane. `campuri` și `texte` sunt dicționare (un `[]` e refuzat, ca la ADR 0024).
- **Ușa la cerere** (ADR 0070): forma literelor e în ușa de la pornire; judecata lor întreagă (blocul valid al șablonului, cu
  schema și amprenta, textul cu valorile, id-urile unice și diferite de ale piesei, operațiile ale piesei pe literele
  plăcuței, plafonul unei operații în lumea instanței, un text al plăcuței sub altul, adâncimea, marginile matricelor) stă în
  `judecataTexte.ts` (0,9 kB), adus doar pentru un document cu plăcuțe (`cuPlacute`, înainte de prima randare), de ușa
  întreagă și de calculul acțiunilor. În ușa de la pornire ar fi trecut de plafon (111,8 / 110 kB).
- **Judecata pe documentul brut** (reparată în pasul 3): ușa întoarce o copie a intrării, cu cheile `__proto__`,
  `constructor` și `prototype` ca date (ADR 0024 §9), dar judecata plăcuțelor rula în validator, pe ieșirea lui, din care
  `v.record` le scoate tăcut. O plăcuță sub o asemenea cheie (un grup `constructor`, o operație `constructor`) trecea deci
  nejudecată, iar lumea îi folosea literele. Acum ușa judecă plăcuțele după schemă, pe documentul brut (`problemaTexte`,
  `usaCurenta.ts`), cu forma intrărilor sărite de validator (literele, valoarea câmpului, lista operației) și plafoanele cu
  literele lor; acțiunile la fel (`motivDupa`). Un câmp `{__proto__}` sau `{constructor}` e un câmp ca oricare (ca în
  oracol, P22 și P23).
- **Oracolul documentului v23**, scris separat de un agent doar din ADR-uri (cu acordul owner-ului, ~0,76 M tokeni): 26 / 26
  față de ușa aplicației, după două divergențe reparate în aplicație (blocul șablonului judecat întreg; listele refuzate
  ca dicționare) și punctele deschise aliniate: numele câmpurilor (orice în afară de acolade, și un rând nou), un câmp fără
  valoare refuzat, `texte` gol și o plăcuță fără litere primite, `operatii` lipsă refuzat și o listă goală primită, plafonul
  de 10 000 de noduri al unei operații în lumea instanței, grupurile plăcuței neimbricate, orice nod valid ca literă,
  adâncimea cel mult 32, literele unice pe instanță. Corpusul de aur (ADR 0121) are versiunea 23 (`1f250a7`).
- **Literele unei plăcuțe** (`src/text/placute.ts`, în modulul textului, la cerere): pentru fiecare text cu câmpuri al piesei
  (`textePiesei`: grupurile cu bloc valid și cu câmpuri, cele mai de sus), textul blocului cu valorile plăcuței, așezat ca un
  text obișnuit cu același bloc (drept sau pe curba lui; limitat de casetă, de la înălțimea cerută, nu de la cea în care a
  încăput șablonul); literele, ca la piesa unui text (`litereText`, scoasă din `piesaText`), cu id-urile `t<j>-l<k>` și
  `t<j>-c<n>` (un sufix dacă s-ar ciocni cu un id al piesei). Un câmp fără valoare e gol (`valoriPlacutei`). Refuzurile, cu
  motiv: fontul lipsă (cu numele lui), aldinul care n-a îngroșat o literă, textul care nu încape în casetă nici la cea mai mică
  înălțime, curba fără lungime, imbricarea peste plafon. Spațierile literelor alese (ADR 0138 §5) țin de caracterele
  șablonului: plăcuțele nu le primesc.
- **Operațiile literelor** (`src/io/placuteOperatii.ts`, fără font): o operație care taie literele șablonului se mută pe
  literele plăcuței de același fel, ca la editarea unui text (`felOperatie`, scoasă din `piesaText`): profilul pe exterior pe
  contururile de afară, cel pe interior pe goluri, restul pe toate; o găurire nu are pe ce sta. Rama și găurile plăcuței
  (operațiile care nu taie textul) rămân ale șablonului. Felul vine din imbricarea contururilor plăcuței, deci operațiile se
  mută din nou și fără font (rolul de tăiere).
- **Panoul** („Pe această plăcuță”, `PanouProprietati.tsx`): cu o singură instanță aleasă a unui șablon, câte un rând pe câmp
  (exemplul arată câmpul, `{nr}`), cu nota (câmpurile; forma, fontul și mărimea sunt ale piesei). O valoare scrisă cere modulul
  textului și fonturile (`textePlacuteiCuFonturi`), apoi acțiunea textului (`document.text`, cererea `placuta`, fără o acțiune
  nouă în registrul de pornire) scrie instanța într-un pas; o piesă schimbată între timp e refuzată (`motiv.placute`). Lista
  numește plăcuța după textul ei („Masa 7 (1 din 3)”).
- **Consecvența șablonului:** editarea textului lui (unealta Text, pe oricare plăcuță) reface literele tuturor plăcuțelor, pe
  toate foile, în același pas, cu fontul deja adus de panou; panoul spune câte („Șablonul are 3 plăcuțe: «Aplică» le reface
  literele.”); un text fără câmpuri le lasă doar cu valorile. Rolul de tăiere mută operațiile noi pe literele plăcuțelor. O
  scalare a piesei le scalează pe toate (cele alese și celelalte, pe orice foaie), iar blocul unui text grupat (șablonul cu
  ramă) rămâne valid la o scalare uniformă. **«Desprinde»** pe o plăcuță (și pe una singură) o coace (`placutaCoapta`):
  literele ei în arbore, cu blocul obișnuit (textul ei, amprenta literelor ei, fără spațierile alese), numele piesei din primul
  rând, operațiile care taie ce taiau în lume; tăieturile rămân aceleași. Gruparea și degruparea coc plăcuța întâi (anularea
  o pune la loc). Restul schimbărilor care ar strica literele (nodurile literelor șablonului, înclinarea, o scalare neuniformă
  care face textul vectori, reparațiile și tăierea pe litere) se refuză cu motivul plăcuțelor (`motiv.placute`, prin
  `motivDupa`, după judecata documentului de după).
- **Banda pieselor legate** nu se mai arată cât e deschis panoul textului (înalt, îi acoperea «Aplică»): spune panoul, „Piesa
  e pusă de N ori: «Aplică» o schimbă la toate.” (sau nota plăcuțelor).
- **Rămâne pentru 11.4↑b** (cu dialogul CSV): editarea textului unui șablon grupat (unealta Text editează doar textul de pe
  rădăcina piesei), lista plăcuțelor micșorate de casetă (cât, în %) și avertismentul celor din care iese textul.
- **Măsurat:** pornirea 106,0 kB (cu ușa 109,7 → 109,9 / 110: rămâne sub 0,1 kB, deci o felie care atinge pornirea sau ușa
  face întâi loc), totalul 548,7 → 563,0 / 600 (v23 și judecata ei, oracolul nu intră în aplicație, literele din font în
  modulul textului, panoul).
- **Probele:** `document.v23.oracol.test.ts` (26, oracolul agentului față de ușa aplicației), corpusul de aur cu v23,
  `placute.test.ts` (pe hârtie: literele plăcuței sunt literele unui text obișnuit cu același conținut, pe drept, pe curbă și
  limitat de casetă; operațiile taie aceleași contururi; rama nu taie textul; prefixul liber; valorile goale; acțiunea textului
  și refuzurile ei; refacerea la editarea șablonului, pe două foi; «Desprinde», cu tăieturile neschimbate; gruparea și
  degruparea; rolul; scalarea, și a celor de pe altă foaie; nodurile și înclinarea refuzate; cheile `__proto__` și
  `constructor`, judecate de ușă), `placute.spec.ts` (e2e: câmpul, valoarea, copiile, editarea șablonului cu nota, «Desprinde»,
  Ctrl+Z), manualul. Otrăvurile `test/otravuri/11.4.py`: la prima rulare (`c2784f2`) 30 / 32 unitare prinse: P07 echivalentă (limitat de casetă, așezarea caută oricum de la `caseta.ceruta`: ramura din `parametriBloc` era cod în plus, scoasă) și U02 scăpată (proba strica literele într-un fel prins oricum mai jos: proba nouă, o literă cu forma stricată sub cheia `constructor`); pe codul final (`ca7c0b6`) 40 / 40: 31 / 31 unitare și 9 / 9 prin e2e, în două clone, pe portul 4178.

## Felia 11.4↑b (gata pe 09.11)

- **Unirea întâi:** `main` (linia ancorelor 6.V↑–6.V↑c, 12.1↑c-2) adus în ramură (`3cdb96a`): `transformare.ts` primește
  colțurile și arcele la scalare (ADR 0240) și le dă și literelor plăcuțelor (`texteScalate` cu felul colțurilor); mânerele,
  ancora și tastele lucrează pe foaia activă (în `main`, `FOAIA = 0`). Porțile pe codul unit: unitare 8 827 / 0, e2e 404 / 404.
- **«Din CSV…»** (planșa 4 a schiței; `DialogCsv.tsx`, adusă la primul clic, din panou, la „Piesa”, pe orice piesă cu un text,
  și grupată, cu ramă): fișierul (`.csv`, `.txt`, cel mult 5 MB, cu butonul aplicației, nu câmpul browserului) sau celulele
  lipite din Excel; separatorul (`;`, `,`, tab) și codarea (UTF-8 cu sau fără BOM, altfel Windows-1250) găsite singure, cu
  alegerea la vedere; „Primul rând are numele coloanelor”; previzualizarea (primele 4 rânduri și câte mai sunt); cel mult
  1 000 de rânduri de date și 100 de coloane, restul tăiat cu nota lui. Cititorul (`src/io/csv.ts`) ține ghilimelele ca RFC
  4180 (separatorul, rândul nou și ghilimelele dublate în celulă; ghilimelele din mijlocul unei celule sunt un caracter) și
  sare rândurile goale.
- **Potrivirea** (`src/model/valoriCsv.ts`): fiecare câmp ia coloana cu același nume, fără litere mari și diacritice
  („potrivit singur”); unul fără ea ia prima coloană rămasă (un tabel fără antet), altfel o valoare goală; la alegere, altă
  coloană, o valoare scrisă sau numerotarea (de la, pasul, cifrele, cu zerourile din față și semnul). Valorile pierd spațiile
  de la capete, ca în panou. „Rândurile de la … până la” aleg rândurile.
- **„Fă din textul ales câmpul {Coloana}”** (răspunsul 4b): în fereastră, textul piesei (și al unui șablon grupat, cu ramă);
  bucata aleasă devine `{Nume}` (numele coloanei, sau cel scris, fără acolade), iar textul se reface din font
  (`sablonCuContinut`: pe rădăcină prin `piesaText`, ca editarea din panou; grupat, cu id-uri libere față de ramă și cu
  operațiile textului mutate pe literele noi de același fel; spațierile literelor alese nu trec). Plăcuțele piesei se refac în
  același pas (cererea `sablon` a acțiunii textului, refuzată dacă piesa s-a schimbat între timp).
- **„Fă N plăcuțe”:** fonturile textelor piesei aduse o dată (`fonturiPiesei`), literele fiecărui rând (cu progresul, „Se fac
  literele: 340 din 1 000…”), apoi un singur pas (cererea `placute`): primul rând pe plăcuța aleasă, celelalte instanțe noi
  ale piesei, toate așezate pe foi cu `planAsezare` (din colțul și cu marginea, distanța, ordinea și rotirea ținute ale lui
  „Așază pe foi”, cu vărsarea pe foile următoare goale și pe foi noi). Unde omul n-a scris nimic, distanța urcă singură până
  la freza profilului exterior (ca la „Mută și așază”). Cel mult 1 000 de instanțe ale piesei (ca «Încă…»). Înainte, fereastra
  spune unde ajung („6 plăcuțe pe 3 foi: 2 + 2 + 2. Marginea 10, distanța 6 mm.”, „Schimbă…”); după, panoul spune ce s-a
  făcut și câte plăcuțe s-au micșorat în caseta „Limitat de casetă” și cât (răspunsul 5a, partea listei).
- **Rămâne pentru 11.4↑c:** textul care iese din plăcuță fără casetă (plăcuța roșie, avertismentul în bara de jos sau
  confirmarea la export, alese în fereastră: răspunsul 5) și editarea textului unui șablon grupat cu unealta Text.
- **Măsurat:** pornirea neschimbată (105,9 kB, cu ușa 109,9 / 110), totalul 565,4 → 571,7 / 600 (fereastra și cititorul
  vin la primul clic; peste estimarea de ~5 kB a venit „Fă din textul ales câmpul” pe un șablon grupat).
- **Probele:** `csv.test.ts` (pe hârtie: Windows-1250 cu diacriticele lui, ghilimelele, separatorul, și la egalitate,
  plafoanele, potrivirea, numerotarea cu semn și zerouri, „Fă din textul ales câmpul”), `placute.csv.test.ts` (un pas cu
  anularea exactă, refuzurile, șablonul pe rădăcină și grupat, id-ul ramei ca al unei litere noi, spațierile vechi,
  operația golurilor fără goluri, micșorarea în casetă egală cu a unui text obișnuit), `placute-csv.spec.ts` (e2e:
  celulele lipite și „Fă din textul ales câmpul {Nume}”, trei plăcuțe într-un pas și Ctrl+Z; un fișier Windows-1250 cu
  `;` și numerotarea), manualul. Otrăvurile `test/otravuri/11.4b.py`: la prima rulare (`4bd0c40`) 22 / 28 unitare: C01
  și C05 echivalente (codul scos), C10, T02, T03, T05 cu probe noi; prin e2e 8 / 8; pe codul final (`0895c94`) 26 / 26
  unitare.

## Felia 11.4↑c (gata pe 09.11)

- **Unirea întâi:** `main` (trasarea din imagine 25.1↑–25.3↑b, 6.V↑d și reparația ei) adus în ramură (`bb13a6e`, `dbf2cbf`):
  o formă rotită oblic, scalată pe o axă, trece prin geometrie (ADR 0240 §F.30), cu piesa pusă de mai multe ori schimbată o
  dată (`oSinguraSchimbare`); literele unei plăcuțe care ar ieși oblice (un text pe o curbă) refuză scalarea, ca piesa
  împărțită; importul cu mai multe piese deodată (trasarea pe culori) pe foaia activă a ferestrei. Porțile pe codul unit:
  unitare 8 960 / 0, e2e 427 / 427. Unit cu `main`, totalul a ajuns la 604,0 / 600 (trasarea și 6.V↑d), iar pornirea cu ușa
  la 110,0 / 110, peste plafon la a doua zecimală.
- **Locul la pornire:** cele 14 motive ale planșelor (foile, «Încă…», așezarea, plăcuțele) le dă doar calculul acțiunilor, la
  cerere; trec în mesajele editorului, pe care calculul le cere la evaluare (`import '../i18n/editare.ts'`), iar ferestrele
  care îl aduc (editorul, panoul, exportul, importul, așezarea) așteaptă mesajele cerute înainte de randare. Dicționarul de
  bază 3,9 → 3,5 kB, deci pornirea cu ușa 109,9 / 110, cu felia în ea.
- **Plăcuța** (`src/model/placuteIesire.ts`, adus la cerere când documentul are plăcuțe): conturul închis cel mai mare al
  piesei, din afara textelor (rama, marginea plăcii; o gaură mică, un text fix sau o linie deschisă nu sunt plăcuța); o piesă
  doar cu text n-are din ce ieși. **Textul iese** când o literă a plăcuței trece de el cu peste 0,001 mm (toleranța
  proiectului): întâi cutia literei, exactă; pe o ramă care nu e un dreptunghi drept (un cerc, o elipsă, colțuri rotunjite),
  și vârfurile literei, cu trei puncte pe fiecare arc sau curbă dintre ele. Judecata e ținută pe obiecte (literele plăcuței,
  piesa): o editare o reface doar pentru plăcuțele atinse.
- **Unde se vede** (răspunsul 5, cu regula owner-ului din 07.10: niciodată pe pânză): plăcuța e roșie în listă, cu motivul în
  titlu („Textul plăcuței „Constantin Brâncoveanu” iese din ea”), bara de jos îl spune (mai multe: „Textul iese din 3
  plăcuțe”; amestecate cu formele ieșite din foaie: „5 avertismente”), iar panoul îl spune la „Pe această plăcuță”, cu ce se
  poate face. Avertismentele vin printr-un cârlig (`inregistreazaPlacute`), ca pornirea să nu ducă judecata.
- **Avertismentul sau confirmarea** (răspunsul 5): în fereastra «Din CSV…», „Dacă textul iese din plăcuță”: avertisment
  (implicit) sau avertisment și confirmare la export, ținut în browser (`cncvs2.placute.iesire`, ca „Ține minte” al
  grupării); rezultatul spune din câte plăcuțe iese textul. Fereastra exportului arată plăcuțele foii (primele 5 nume); cu
  confirmarea, Exportă rămâne oprit până la bifă, iar bifa e legată de lista văzută (alt document vine nebifat).
- **Unealta Text pe un șablon cu ramă:** clicul pe literele unui text grupat (cutia lor în lume; pe o plăcuță, ale ei) îl
  alege, cu grupul lui (`texteGrupate.ts`); un clic în altă parte a ramei pune ancora unui text nou, ca până acum. «Aplică»
  îi înlocuiește literele (`sablonCuAsezat`, scos din `sablonCuContinut`): rama, locul textului pe ea și operațiile rămân,
  literele noi au id-uri libere, iar plăcuțele piesei se refac în același pas, cu fonturile celorlalte texte aduse
  (`fonturiPiesei`). Cererea `editat` a acțiunii textului primește grupul; un grup care nu e text e refuzat ca vectori.
- **Măsurat:** pornirea cu ușa 109,9 / 110 (dicționarul de bază −0,4 kB, aplicația +0,3 kB: cârligul și textele
  avertismentului); totalul 607,2 / 700: după prima unire cu `main` era 604,0 / 600, felia a adus +3,3 kB, iar
  owner-ul a ridicat între timp plafonul la 700 kB (ADR 0144, „Yes, 700 kB”, adus din `main` la capătul feliei).
- **Probele:** `placute.iesire.test.ts` (pe hârtie: rama dreptunghi cu literele lipite, peste și sub toleranță, pe fiecare
  latură; deplasarea grupului; rama cerc cu cutia literei în cutia cercului dar colțul afară; cercul-literă și curba care ies
  doar între vârfuri; gaura (și înaintea ramei în arbore), textul fix, linia deschisă; fontul: „I” și 20 de „W”; judecata ținută pe obiecte;
  avertismentele pe foi; numele plăcuței), `placute.text.test.ts` (înălțimea 10 → 6 cu raportul 0,6 al literelor, rama și
  operațiile păstrate, rădăcina care nu e text; cererea `editat` cu grupul, plăcuțele refăcute, anularea exactă; alegerea la
  clic), `placute-iesire.spec.ts` (e2e: rama și textul grupate, «Din CSV…» cu un nume prea lung și confirmarea aleasă: roșu
  în listă, bara de jos, panoul, bifa exportului, redeschis; unealta Text care repară textul; textul grupat ales la clic, cu
  rama păstrată; două texte în fonturi diferite), manualul. Otrăvurile `test/otravuri/11.4c.py`: la prima rulare
  (`06ca803`) 20 / 21 unitare: I05 („plăcuța e ultimul contur închis”) scăpată, fiindcă parcurgerea întâlnea rama
  ultima; proba nouă pune gaura înaintea ramei. Prin e2e 15 / 15. Pe codul final (`1c4b000`) 21 / 21 unitare.
- **Rămâne în etapa 11:** 11.5↑ („Toate foile” la export: arhiva, foile identice ×N, timpii), 11.6↑ (raportul foilor și
  lista de tăiere), 11.5↑b după etapa 13 și 11.7 (fișa plăcii, pe mașină).

## Felia 11.5↑ (gata pe 13.11)

- **Pauzele și unirea:** felia a stat de două ori la cererea owner-ului (09.11 la `c8b9358`, 12.11 la `0f1aee4`). La reluare,
  `main` (tăierea 10.3↑f–j, imprimanta 3.6j–3.6r, ADR 0250–0251; 99 de commit-uri) a venit în ramură (`3aaf5dc`), iar codul
  venit lucrează pe foaia activă: conversia și Cuțitul trimit `indexFoaie` workerului CAM, tăierea și conversia din acțiuni
  judecă foaia aleasă, iar desenul ferestrei Imprimanta („Din desen…”) e al foii active, ca exportul.
- **Locul la pornire:** unit cu `main`, pornirea cu ușa ajungea la 110,1 / 110. Încă 11 motive date doar de calculul
  acțiunilor (gruparea, degruparea, textul, rolul, foaia, importul, din `main`) trec în mesajele editorului, după regula de
  la 11.4↑c (`4b32996`): dicționarul de bază 3,4 → 2,8 kB, pornirea cu ușa 109,6 / 110. Etichetele celor 12 acțiuni ale
  planșelor (paleta, meniul foii, panoul) trecuseră acolo înaintea primei pauze. Câmpul numeric și fereastra exportului își
  păstrează motivele lor în dicționarul de bază (nu toate gazdele lor își cer mesajele editorului).
- **Fereastra exportului**, de la două foi: „Ce exporți: Foaia activă / Toate foile (N)”, implicit foaia activă, ca până
  acum. Cu „Toate foile”, titlul o spune, iar nota: câte un program pe foaie, într-o arhivă `.zip`, foile identice o dată,
  cu ×N; rândurile ferestrei (operațiile) sunt ale foii active, celelalte foi își păstrează operațiile lor.
- **Calculul** (`calculeazaToateFoile`, în `actiuniExportCalcul.ts`): fiecare foaie cerută workerului CAM ca un document doar
  cu ea (`doarFoaia`), cu aceiași parametri, pe rând; programul ei e deci, octet cu octet, cel exportat doar din ea. O foaie
  fără nimic de tăiat se sare și se spune la capăt; toate goale: refuz. Confirmarea ieșirii din foaie trece doar pe aceeași
  ieșire (foaia activă, sau una identică cu ea): o altă foaie din care iese freza se exportă singură, cu confirmarea ei, deci
  „Toate foile” o refuză, cu numele ei. Panoul mașinii, simularea și rezumatul rămân ale foii active, iar „Deschide în
  Mașina” încarcă programul ei, nu arhiva.
- **Foile identice** (`src/post/foi.ts`): aceleași fișiere, cu numele și programul fără comentarii (parantezele și `;` până
  la capătul rândului), adică ce face mașina. O copie legată a foii („Duplică foaia cu aceleași piese”) diferă doar în
  comentarii (id-ul instanței: `r2/r` față de `r/r`), deci taie la fel. Ies o dată, cu programul primei și `-x<N>` în nume;
  lista spune care („Foaia 1 ×2 (și Foaia 2)”).
- **Numele:** după baza exportului, `cncvs2-<origine>-foaia-<k>[-x<N>]…`, cu fișierele pe freze și dopurile foii
  (`cncvs2-stanga-jos-foaia-2-x3-1-T2.nc`); arhiva, `cncvs2-<origine>-foile.zip`. Pe un controler cu nume scurte (RichAuto,
  FAT 8.3), numele fișierelor rămân, fiecare foaie în dosarul ei (`F2X3/CV1T2.NC`), iar arhiva e `CNCVS2.ZIP`.
- **Arhiva** (`src/io/scrieZip.ts`): intrările stocate (metoda 0), data fixă 01.01.1980, fără câmpuri în plus, deci aceleași
  intrări dau aceiași octeți; fără ZIP64 (peste 65 535 de fișiere sau 4 GB, refuz, judecat înaintea alocării). CRC-32 e unul
  singur, comun cu cititorul arhivelor extensiilor (`src/io/crc32.ts`, reexportat de `src/extensii/zip.ts`), care o și
  citește înapoi în probe.
- **După export, fereastra** arată arhiva și amprenta ei, foile (×N, cu cele identice), fișierele fiecăreia și timpul ei; la
  capăt, timpul tuturor (fiecare foaie de câte ori se taie) și foile fără nimic de tăiat. Plăcuțele cu textul ieșit (11.4↑c)
  sunt, la „Toate foile”, ale tuturor foilor: cu confirmarea aleasă, bifa e cerută și de pe o foaie fără plăcuțe.
- **Măsurat:** felia a adus +3,3 kB (611,0 → 614,3 / 700, înainte de unire; estimarea era ~3,5 kB); cu `main`, totalul
  686,2 / 700, pornirea cu ușa 109,6 / 110.
- **Probele:** `export.foi.test.ts` (pe hârtie: arhiva cu „a.txt” = „hi”, 110 octeți, câmp cu câmp; CRC-ul lui „123456789”;
  mai multe intrări citite înapoi de cititorul extensiilor, aceiași octeți la a doua scriere; refuzurile fără ZIP64; numele,
  comentariile, foile identice; calculul pe patru foi: fiecare program din arhivă e exportul foii lui singure, foile 1 și 3
  o dată cu `-x2`, foaia goală, timpul și rândurile tuturor, Mașina cu foaia activă, aceiași octeți la al doilea export;
  RichAuto; foaia activă fără „Toate foile”; toate foile goale; refuzul ieșirii din foaie), `export-foi.spec.ts` (e2e: fără
  alegere cu o singură foaie; un dreptunghi, copia legată a foii și o foaie cu un cerc: arhiva, ×2, timpul tuturor, Mașina
  cu amprenta foii active), `placute-iesire.spec.ts` (bifa plăcuțelor la „Toate foile”, nu și la exportul unei foi fără
  plăcuțe), manualul (35 de capitole după unire). Otrăvurile `test/otravuri/11.5.py`: 61 / 61 la prima rulare (`41daf8a`; 44 unitare, 17 prin
  e2e, în două clone, pe portul 4178).
- **Rămâne în etapa 11:** 11.6↑ (raportul foilor și lista de tăiere), 11.5↑b după etapa 13 și 11.7 (fișa plăcii, pe mașină).

## Felia 11.6↑ (gata pe 13.11)

- **Fereastra** (`src/app/DialogRaportFoi.tsx`, adusă la cerere și preîncărcată după pornire; planșa 7 a schiței): din
  fereastra exportului („Raportul foilor…”, cu colțul și Z0 alese acolo; exportul se închide) și din paletă (acțiunea
  `export.raport`, cu eticheta în mesajele editorului, ca ale planșelor). Pe fiecare foaie: previzualizarea, materialul,
  mărimea, cât e folosită (aria cutiilor pieselor față de a foii), operațiile (felul, freza cu unghiul V, adâncimea cu
  trecerile, urechile; despărțirea foii) și piesele (numele sau felul primei forme, câte, mărimea, rotirile, valorile din CSV:
  primele trei și câte sunt). La capăt, totalurile pe piesă (în tot proiectul, cu materialele și foile) și foile pe material
  (de cumpărat). Z0 și colțul nu sunt ale foii în cvs2, ci ale exportului (cele din fereastra lui; din paletă, cele
  implicite), deci raportul îi spune o dată, sus.
- **Previzualizarea** e SVG-ul exportului de vectori (`vectoriFoaie` cu foaia, `scrieSvg`), pe alb și în tema întunecată.
  Liniile lui de 0,1 mm (pentru tăiere) erau fire de păr în cei ~160 px: `scrieSvg` primește acum grosimea, implicit 0,1 mm
  (fișierul exportat rămâne octet cu octet același), iar raportul cere a 150-a parte din latura mare a foii.
- **Mărimea piesei** (`src/model/raportFoi.ts`, pur): cutia contururilor tăiate de un profil exterior care nu e o despărțire
  a foii și ajunge la grosimea ei (prin toată grosimea), în axele piesei: rotirea instanței n-o schimbă. Fără el, cutia
  desenului, marcată „(desen)”; „Mărimea pieselor: tăiată / desen” e implicitul devenit opțiune (răspunsurile). Pe o foaie mai
  groasă decât adâncimea profilului, aceeași piesă primește acolo mărimea desenului, cu rândul ei și la totaluri; instanțele
  unei piese cu mărimi diferite (în modul desen, plăcuțele cu texte de lungimi diferite) au rânduri separate.
- **Foile identice:** semnătura foii e mărimea, materialul, formele în lume (forma și matricea, rotunjite la 1e-6) și
  operațiile cu formele pe care le taie, fără id-uri și fără numele frezei, în orice ordine. O copie legată a foii și una
  cu piese separate, dar egale, ies o dată, ×N, ca la export; alt loc, altă mărime sau alt material, nu. Exportul (11.5↑)
  judecă după programe; aici, fără CAM, după document, cu aceleași grupuri pe aceleași foi.
- **CSV-ul** (`src/app/raportCsv.ts`, `cncvs2-lista-de-taiere.csv`): UTF-8 cu BOM; `;` cu virgula zecimală (implicit, Excel
  în română) sau `,` cu punctul; trei tabele, cu un rând gol între ele: foile (un rând pe piesă, cu foaia, de câte ori se
  taie, materialul, mărimea foii și cât e folosită; o foaie goală are rândul ei, fără piesă), totalurile pe piesă și foile pe
  material. Ghilimelele ca RFC 4180 (separatorul, ghilimelele, rândul nou), fiecare rând cu CRLF.
- **Tipărirea** (PDF din browser): fereastra stă direct sub `body` (un portal), iar `@media print` scoate restul paginii,
  cutia ferestrei și butoanele: raportul curge pe oricâte pagini, negru pe alb, iar o foaie nu se rupe între pagini. La tipar,
  `vw` e lățimea paginii (regula lățimii ferestrei cere `!important` acolo), iar `body:has(.aplicatie)` avea `overflow:
  hidden`, care ar fi tăiat tiparul la o pagină: ambele, găsite pe capturi și măsurate înainte de reparație.
- **Regula importurilor:** fereastra și CSV-ul stau în `src/app`, lângă celelalte ferestre care citesc modelul (interfața din
  `src/ui` ajunge la model doar prin registrul de acțiuni).
- **Manualul:** capitolul nou „Raportul foilor și lista de tăiere” (ro, en; 36 de capitole); `export.raport` e ușa a 107-a.
- **Măsurat:** pornirea +0,2 kB (cu ușa 109,7 / 110), totalul 686,2 → 690,5 / 700 (estimarea era ~4,7 kB).
- **Probele:** `raport.foi.test.ts` (pe hârtie: criteriul din prag, 25 de plăcuțe 80 × 30 pe foi 300 × 200, 15 + 10,
  folosite 60 % și 40 %, cu valorile lor; prototipul, 12 suporturi 150 × 100 pe 600 × 400, 9 + 3, 56,25 % și 18,75 %; mărimea
  tăiată, a desenului și marcajul; rotirea în axele piesei; foile identice, legate și separate, cu mărimea, locul, materialul
  și ordinea; interiorul și despărțirea care nu decupează piesa, urechile, freza în V; CSV-ul în ambele limbi, cu ghilimele,
  rândul nou, virgula zecimală, foaia goală), `raport-foi.spec.ts` (e2e: din paletă și din export; foile identice ×2,
  operațiile, piesele, totalurile, materialele; mărimea desenului; CSV-ul cu `;` și cu `,`; tipărirea doar cu raportul;
  Escape), manualul. Otrăvurile `test/otravuri/11.6.py`: 55 / 55 la prima rulare (`aa16c19`; 38 unitare,
  17 prin e2e, în două clone, pe portul 4178).
- **Rămâne în etapa 11:** 11.5↑b după etapa 13 și 11.7 (fișa plăcii, pe mașină). Fișa de lucru (ordinea, schimbările de
  freză, timpul) rămâne funcția ei, în etapa 15, și pornește din raportul acesta.
