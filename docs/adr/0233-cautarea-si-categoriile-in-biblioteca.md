# ADR 0233: Căutarea și categoriile în biblioteca extensiilor

**Starea:** în lucru din 24.11.2026, la cuvântul owner-ului („ok, porneste cautarea si categoriile”, după raportul feliei
3.Xi, care le lăsa „la cuvântul tău”), și implementat în aceeași zi **cu alegerile recomandate**: felia 3.Xj a liniei
bibliotecii (ramura `wip/3.Xh-biblioteca-ui`, din `main` `fdce5f1`). Cinci alegeri țin de owner și stau la „Întrebările”,
cu recomandarea în față; fiecare se schimbă fără să atingă restul. **Schimbă:** ADR 0231 („Căutarea și categoriile, acum:
catalogul are o extensie”; „Se redeschide dacă: catalogul trece de ~20 de extensii”) și ADR 0232 („rămân pentru peste ~20
de extensii”): owner-ul le vrea de acum, cu o singură extensie în bibliotecă. **Continuă:** ADR 0231 (fereastra
bibliotecii, tastatura ei), ADR 0232 (filele „Din bibliotecă” / „Instalate”, lipsa internetului), ADR 0230 (catalogul de
lângă aplicație, citit cu îngăduință; nicio cerere la pornire).

## Ce e azi

Fereastra „Biblioteca extensiilor” are lista în stânga și pagina extensiei în dreapta. Lista se parcurge cu ochiul:
catalogul are o singură extensie (Easy 3Draw), iar „Instalate” le are pe ale omului, și pe cele din afara bibliotecii.
Nimic nu spune ce fel de extensie e una (pentru desen, pentru mașină, pentru imprimantă), afară de descrierea ei.

## Decizia

### A. Categoriile sunt rafturile bibliotecii

1. **Catalogul rafturilor e al aplicației** (`CATEGORII_BIBLIOTECA`, în `shared/biblioteca.ts`), o listă scurtă, fixă, cu
   numele în ambele limbi (mesajele carcasei, `extensii.categorie.<id>`), în ordinea în care se arată:

   | id | în română | în engleză |
   | --- | --- | --- |
   | `desen` | Desen și forme | Drawing and shapes |
   | `cnc` | CNC și trasee | CNC and toolpaths |
   | `imprimare` | Imprimare 3D | 3D printing |
   | `masina` | Mașina | Machine |
   | `modele` | Jucării și modele | Toys and models |

   Un raft nou intră acolo, cu numele lui în ambele limbi. Fără „Altele”: o extensie care nu se potrivește nicăieri nu stă
   pe niciun raft și se vede sub „Toate”.
2. **Pe ce rafturi stă o extensie o spune lista bibliotecii, nu pachetul:** `categorii` în `extensii/biblioteca.json`, 1–3
   id-uri, fiecare o dată; primul e raftul principal. Raftul e al celui care ține biblioteca, nu ceva ce își pune singur
   un pachet. Urmarea: **pachetele nu se schimbă** (nicio versiune nouă pentru o categorie), iar o extensie din afara
   bibliotecii nu stă pe niciun raft.
3. **O extensie poate sta pe mai multe rafturi** (cel mult trei). Easy 3Draw: Jucării și modele, Imprimare 3D, CNC și
   trasee. Un singur raft ar ascunde-o de cine caută „ce pot printa”.
4. **Catalogul le poartă ca dată de prezentare**, citită cu îngăduință, ca restul (ADR 0231 §B.1): o categorie pe care
   fila n-o știe (un catalog mai nou decât ea) cade singură, cu numele câmpului în `sarite`, iar cele știute rămân; o
   formă greșită (nu o listă de texte, peste trei, una de două ori) cade cu totul; rândul rămâne bun. **Construcția e
   strictă:** `scripts/biblioteca.ts` refuză o categorie care nu există și înșiră în mesaj rafturile care există, iar o
   probă cere fiecărei extensii din listă cel puțin un raft.
5. **Fără catalog, fără categorii.** Rafturile vin odată cu biblioteca: fără internet, „Instalate” n-are rândul lor.
   Extensia instalată nu-și ține raftul în browser (ar îmbătrâni acolo când biblioteca îl schimbă).

### B. Căutarea

6. **Un câmp, „Caută o extensie”, filtrează lista la fiecare literă**, în fila deschisă (și în „Instalate”, peste
   extensiile din afara bibliotecii).
7. **Regula potrivirii** (`src/extensii/cautare.ts`, pură): textul căutat se desparte în cuvinte, comparate fără
   diacritice și fără majuscule. Fiecare cuvânt trebuie găsit, fiecare unde poate:
   - **oriunde în numele extensiei** (sau în id-ul ei): „draw” găsește „Easy 3Draw”;
   - **la începutul unui cuvânt** din descriere, din descrierea lungă, din autor și din numele rafturilor ei, în limba
     aplicației: „palp” găsește „palpator”, „alpator” nu. Două litere din mijlocul unui cuvânt ar găsi aproape orice.
8. **Ordinea:** potrivirile din nume stau înaintea celor doar din descrieri; în rest, ordinea listei.
9. **„N din M”** lângă câmp, cât lista e filtrată (de text sau de raft).
10. **Nimic găsit are starea lui:** „Nicio extensie nu se potrivește cu „…”.”, cu **Arată toate extensiile** (șterge și
    textul, și raftul; focusul rămâne în câmp). Pagina din dreapta nu arată altă extensie lângă o listă goală.
11. **Căutarea și raftul, împreună.** Când textul nu găsește nimic pe raftul ales, dar ar găsi pe altele: „Nicio extensie
    din „Mașina” nu se potrivește cu „…”.” și **Caută în toate categoriile (N)**. Când găsește și aici, și dincolo, același
    buton stă sub rânduri, discret.
12. **Țin de fereastra deschisă.** Textul și raftul nu se țin minte între deschideri și nu pleacă nicăieri: înregistrarea
    utilizării (ADR 0262) prinde doar clicul pe un control numit din cod, niciodată ce scrie omul. Schimbarea filei
    păstrează textul; raftul rămâne doar dacă există și dincolo.

### C. Interfața

13. **O bară sub capul ferestrei, pe toată lățimea ei:** câmpul stă deasupra listei, cât coloana ei, cu „N din M” lângă
    el; rafturile, ca pastile, în dreapta lui, fiecare cu numărul ei, „Toate” prima. În coloana listei (18rem), cinci
    rafturi ocupau trei rânduri; pe toată lățimea încap pe unul. Pe telefon, bara e pe două etaje (câmpul, apoi pastilele)
    și dispare cât e deschisă pagina unei extensii, ca filele.
14. **Rândul rafturilor are doar rafturile prezente** în lista filei, în ordinea catalogului lor; numerele sunt ale
    rafturilor, nu ale căutării (nu sar la fiecare literă).
15. **Pagina extensiei își spune rafturile** sub nume, cel principal primul; un clic pe unul îl alege (pe telefon, se
    întoarce la listă).
16. **Tastatura:** „/” duce în câmp, de oriunde din fereastră în afară de un câmp de scris; ↓ din câmp trece pe primul
    rând; Enter deschide pagina primului rezultat; Escape golește întâi câmpul, apoi închide fereastra. Săgețile listei
    rămân cum erau (ADR 0231 §B.7).
17. **Mereu la vedere,** și cu o singură extensie: owner-ul le-a cerut acum, iar o bibliotecă nouă își arată rafturile
    de la început. Câmpul e stins doar cât lista filei e goală.
18. **Țintele:** pastilele sunt strânse cu mausul (28 px) și cât `--tinta` la atingere și la densitatea mare (44, 48 sau
    56 px), ca filele; proba țintelor le numără.

## Ce nu intră

- **Rafturi scrise de pachet** (în `extensie.json`): A.2.
- **Ținerea minte** a căutării sau a raftului; **căutarea din paleta de comenzi** (paleta deschide biblioteca și
  extensiile instalate, ADR 0232 §C.14).
- **Sortarea** (după dată, după nume) și **evidențierea** textului găsit în rând: de adus când lista e lungă.
- **Bara lipită sus la derularea listei:** bara e deja în afara listei.

## Marginile

- Izolarea, CSP-ul, `HostApi` și catalogul permisiunilor nu se schimbă. **Nicio cerere de rețea la pornire.**
- **Pachetele nu se schimbă:** Easy 3Draw rămâne la versiunea lui; rândul lui din listă a primit doar `categorii`.
- Documentul rămâne v27. Nimic pe server.
- Paleta și gazda extensiilor rămân despărțite (ADR 0232): nimic nou în pornire.

## Întrebările (recomandarea e „a”, cea implementată)

1. **Rafturile.** (a) cele cinci din A.1; (b) altele: spune care (un raft e un rând în listă și două texte).
2. **Unde stă Easy 3Draw.** (a) Jucării și modele (principal), Imprimare 3D, CNC și trasee; (b) altfel.
3. **Cu o singură extensie în bibliotecă.** (a) câmpul și rafturile, mereu la vedere; (b) abia de la un număr de
   extensii (de exemplu opt, cum spunea ADR 0231), iar până atunci doar rafturile de pe pagina extensiei.
4. **Câte rafturi pentru o extensie.** (a) cel mult trei, primul fiind cel principal; (b) unul singur.
5. **Cât de îngăduitoare e căutarea.** (a) oriunde în nume, la început de cuvânt în descrieri; (b) oriunde, peste tot
   (găsește mai mult, dar și mult zgomot la două-trei litere).

## Verificare

- **Unitare** (`extensii.cautare.test.ts`): regula potrivirii pe hârtie (nume, descrieri, mai multe cuvinte, diacritice,
  ordinea), raftul ales cu „în alte categorii”, rafturile prezente; cititorul catalogului (categoriile bune, una
  neștiută, formele greșite, plafonul). `biblioteca.constructie.test.ts`: lista judecată strict, fiecare extensie pe
  cel puțin un raft, Easy 3Draw pe ale lui.
- **În browser** (`extensii.cautare.spec.ts`), pe o bibliotecă de probă cu cinci extensii (`raftDeProba`): filtrarea la
  fiecare literă și „N din M”; nimic găsit și drumul înapoi; tastatura; rafturile și numerele lor; căutarea cu raftul;
  rafturile de pe pagină; „Instalate”, cu și fără catalog; biblioteca adevărată, în ambele limbi; telefonul la 390, 360
  și 320 px, la atingere, cu fontul lat, în ambele limbi.
- **Țintele** (`extensii.tinte.spec.ts`): pastilele și câmpul, la atingere (44 px) și la densitatea mare (48 px).
- **Manualul**, în ambele limbi; catalogul controalelor; traducerile roadmap-ului; otrăvurile, în clonă.
- **Mărimea:** pornirea neschimbată.

## Se redeschide dacă

- owner-ul răspunde altfel la una dintre întrebări;
- biblioteca trece de ~20 de extensii (sortarea, evidențierea textului găsit, eventual rafturile ca o coloană);
- o extensie din afara bibliotecii are nevoie de un raft (atunci, raftul în pachet, cu judecata lui);
- lista de rafturi trece de vreo opt (pastilele nu mai încap pe un rând: o listă derulantă).

## Implementat (3.Xj, 24.11.2026)

- **Catalogul:** `CATEGORII_BIBLIOTECA`, `MAX_CATEGORII`, `esteCategorie` și `PrezentareRand.categorii` în
  `shared/biblioteca.ts`; `categorii` în `scripts/biblioteca.ts` (lista și catalogul construit) și în
  `extensii/biblioteca.json` (Easy 3Draw).
- **Căutarea:** `src/extensii/cautare.ts` (`simplu`, `cuvinteCautate`, `cauta`, `categoriiPrezente`).
- **Fereastra:** `src/extensii/Biblioteca.tsx` (bara `.bib-filtre`, starea „nimic”, rafturile paginii, tastatura),
  `extensii.css`, mesajele carcasei.
- **Ce au arătat capturile:** în coloana listei, cele cinci rafturi ocupau trei rânduri, deci bara a trecut pe toată
  lățimea ferestrei (C.13), cu pastilele strânse la 8 px, ca toate șase să încapă pe un rând la lățimea întreagă.
- **Găsit în trecere, nereparat aici** (nu e al bibliotecii): la 320 px, la atingere, rândul de sus al aplicației își
  suprapune butoanele, iar în engleză butonul Extensii e acoperit de cel de căutare. Proba de telefon a feliei deschide
  acolo meniul de la tastatură; problema e raportată sesiunii principale.
- **Mărimea:** pornirea neschimbată (109,9 kB; cu ușa 114,4, cu Atelierul 114,7 / 120); totalul 814,3 → 815,6 / 900 kB
  (+1,3); catalogul bibliotecii, 5,3 kB. Cu `main` `a96881a` adus (lotul 18): pornirea 110,1 kB (cu ușa 114,8, cu
  Atelierul 115,1 / 120), totalul 816,8 → 818,1 / 900 kB.
- **Otrăvurile**, în clonă (`test/otravuri/3.Xj.py`): 78 / 78. La prima rulare, 76: „id-ul extensiei nu se mai caută”
  trecea fiindcă „trenu” se găsea și în descriere, iar „în engleză se caută în descrierea românească” trecea pe
  biblioteca adevărată, unde cuvântul căutat era și în descrierea lungă. Amândouă probele caută acum pe biblioteca de
  probă, cu un cuvânt pus într-un singur loc.
- **O probă instabilă a extensiilor, reparată pe drum** (doar probe): completul feliei a căzut la
  `extensii.lucru.spec.ts:222`, „repornirea cerută de extensie”: clicul pe „Repornește” din cadrul extensiei nu s-a mai
  întors (cadrul refăcut îl lasă fără răspuns), ca la „Închide” pe 23.11. Reprodus (16 din 150, pe zece lucrători) și
  reparat cu `clicCareRefaceCadrul` (`test/e2e/ajutor-extensii.ts`): 150 din 150; otrava „gazda ignoră repornirea”, prinsă.
  Sesiunea principală o reparase în aceeași oră în `main` (`29ef7e44`), cu un ajutor cu același nume, care primește și
  urmarea de așteptat: la aducerea lui `main`, ramura a trecut pe varianta lui, ca să rămână una singură.
