# ADR 0300: Biblioteca de freze: „Frezele mele”, în browser și în cont

**Starea:** acceptat pe 23.11.2026, cu toate recomandările („Da, 1a–6a”); **felia 16.A↑a implementată pe ramura
`wip/16.A-freze`** (23.11, „Implementarea (16.A↑a)”); propus în aceeași zi, la cererea owner-ului: „Vreau sa pot crea freze l sau profiluri de freze in aplicatie si
sa le salvez in cont”. Felia 16.A↑ (adusă din etapa 16, fără mașină), linia „freze”: ramura `wip/16.A-freze`, ADR-urile
0300–0309, canalul `freze`. **Rândurile din prag:** „Bibliotecă de freze cu geometrie reală (dreaptă, bilă, toroidală, V,
gravare, profil, formă desenată)” și „Freze de profil desenate de utilizator; roundover cu offset față de interior”
(`ACOPERIRE-ARTCAM-DESKPROTO.md`). **Completează:** ADR 0084 (freza pe fiecare rând al exportului), 0090 și 0092 (forma
frezei), 0093 (frezele de rest), 0112 și 0114 (rolul din panou, rolurile personalizate, regula numerelor T), 0116 (contul),
0120 (meniul contului), 0250 (aranjamentele) și `PLAN.md` §4.6, punctul 6 (valorile calibrării intră în biblioteca de
scule). Schița, cu fereastra, editorul, alegerea la export și întrebările: <https://claude.ai/artifact/HntiSsxBQyPFmZoA8B39EP> (răspunsurile se salvează în pagină, în `raspunsuri/owner`). **Numărul:** scris întâi ca 0290; mutat pe 23.11 la 0300,
fiindcă 0290–0299 sunt ale liniei exportului (`wip/28.8-export`, ADR 0290 propus acolo).

## Ce e azi

- **Documentul** ține o copie a frezei pe fiecare operație: `scula: { numar, nume, diametru, forma? }`. Forma lipsă e freza
  plată; `{ tip: 'v', unghi, varf? }` e freza în V, iar cu vârful plat, freza de gravare (ADR 0090, 0092). La fel freza
  fundului plat (`fundPlat.scula`), frezele de rest (`rest[].scula`), ale dopului și ale benzii incrustațiilor: toate trec
  prin aceeași schemă (`SchemaScula`, `src/model/schemaDocument.ts`). Tabelul `scule[]` din `PLAN.md` §3.2 nu există: copia
  stă pe operație. Nici turația, nici avansul, nici lungimea tăișului nu sunt în document.
- **Unde se alege freza:** în fereastra exportului, pe fiecare rând: numărul T, diametrul, forma (plată sau în V), unghiul și
  vârful (`src/ui/DialogExport.tsx`); fundul plat și frezele de rest, sub rând. Rolul din panou (ADR 0112) pune o freză
  potrivită rolului, cu numărul ales de `numarFreza` (`src/model/rol.ts`); un rol personalizat (ADR 0114) aduce freza lui,
  ținută în browser (`cncvs2.roluri`). În panou, freza nu se alege.
- **Valorile de lucru sunt aceleași pentru orice freză:** `REGIM_IMPLICIT` din `src/cam/job.ts` (axul la 18 000 rot/min,
  avansul 1 000 mm/min, plonjarea 300 mm/min, Z sigur 5 mm), spus în fereastră ca o notă (`export.regim`). ADR 0084,
  „Limitele”: „o turație pe freză vine cu biblioteca de scule”.
- **Formele:** CAM-ul știe freza plată și pe cea în V (ascuțită sau cu vârf plat; V-ul doar pe linie și în V-carve, ADR 0092
  §3). IR-ul și nucleul simulării (`src/sim/nucleu.ts`) știu plata, bila și V-ul cu vârf; elicea cu bila sau cu V-ul încă nu.
  Oracolul simulării (`test/oracles/simulare.ts`) știe plata, bila, V-ul și profilul ca puncte (r, h). Toroidala și profilul
  desenat nu există.
- **Contul:** `conturi/{uid}`, scris doar de callable-ul `cont` (ADR 0116); editorul nu citește Firestore. Nicio dată a omului
  nu stă încă în cont: fonturile lui sunt în IndexedDB (`cncvs2-fonturi`), rolurile și aranjamentul în `localStorage`.
  Callable-urile cer App Check, deci nu merg pe un canal de previzualizare.
- **Mărimea:** pornirea cu ușa 113,0 / 115 kB, totalul 770,0 / 800 kB, bucata contului 29,6 / 32 kB (doar online).

## Decizia (propusă)

### 1. „Profilul de freză” înseamnă două lucruri, care stau împreună (întrebarea 1)

- **Forma desenată** a unei freze de profil (un roundover, o canelură, un ogee) e un fel de freză: „Profil desenat”, cu
  silueta tăișului.
- **Valorile de lucru** (turația, avansul, plonjarea, pașii) stau în fiecare freză, ca set implicit; mai târziu și seturi pe
  material (§11, felia g).

Se fac amândouă; diferă doar ordinea feliilor.

### 2. Ce ține o freză

| Câmpul | Pentru ce | Felia |
|---|---|---|
| Numele (≤ 40 de caractere, unic fără deosebire de majuscule) | propus din fel și diametru: „Plată Ø6”, „V60 Ø12”, „Gravare 30° vârf 0,2” | a |
| Felul | plată (dreaptă), V, gravare (V cu vârf plat); apoi bilă, toroidală, profil desenat; mai târziu burghiul | a; e; f |
| Diametrul tăișului | ca azi (`diametru`), în (0, 100] mm | a |
| Unghiul inclus, vârful plat | V și gravare, ca azi: unghiul în [1°, 179°], vârful sub diametru (0 = ascuțit) | a |
| Raza colțului | toroidala (0 < r < Ø / 2; r = Ø / 2 e bila) | e |
| Silueta | profilul desenat: linii și arce de la (0, 0) la (Ø / 2, h), cu h nedescrescător (forma oracolului de azi) | f |
| Lungimea tăișului | adâncimea pe care freza o poate tăia; peste ea, exportul refuză, cu motivul | a (ținută), b (folosită) |
| Numărul de tăișuri | calculatorul avansului (turația × tăișuri × așchia pe dinte) | a (ținut), g |
| Numărul T preferat | 1–999: numărul de pe portscule sau din magazie | a |
| Valorile de lucru | turația, avansul, plonjarea, pasul pe trecere, pasul lateral (ca procent din diametru) | a (ținute), b (folosite) |
| Valorile măsurate | diametrul efectiv, vârful efectiv (V), bătaia, data și placa măsurării | d |
| Nota | producătorul, codul, orice (≤ 200 de caractere) | a |

Intern, fiecare freză are un id, versiunea (`rev`) și data schimbării. Felurile apar în listă doar când CAM-ul le poate
tăia: plata, V-ul și gravarea acum; bila, toroidala și profilul desenat cu feliile lor. **Schimbat de ADR 0302 §2** (24.11): felurile fără CAM apar
în catalog și în bibliotecă, cu „în curând”; lista „Freza” din proiect le oferă abia cu CAM-ul lor.

### 3. Fereastra „Frezele mele”

- **Se deschide** din meniul contului (rândul „Frezele mele…”, ca „Manualul”, ADR 0120), din paletă (Ctrl K), din fereastra
  exportului (lângă freza rândului) și din secțiunea Tăierea. Merge fără cont și offline, în orice aranjament, cu tema și
  densitatea lui (ADR 0250).
- **Pe birou:** lista în stânga (căutarea, filtrul pe fel, grupată pe fel, fiecare cu silueta mică, diametrul, T-ul și starea
  sincronizării), editorul frezei alese în dreapta (câmpurile felului ei, silueta desenată la scară cu cotele, valorile de
  lucru). **Pe telefon** (sub 48 rem): lista, apoi editorul pe tot ecranul, cu „Înapoi”. **Schimbat de ADR 0302 §3** (24.11): în dreapta stă întâi fișa
  frezei alese, doar de citit; editorul („configuratorul”) se deschide la „Editează” și la „Freză nouă”, iar comutatorul
  „Listă / Configurator” îl poate ține mereu deschis.
- **Butoanele:** Freză nouă, Duplică, Șterge (cu întrebarea; proiectele își păstrează copia, §5), Importă…, Exportă….
- **Bara de jos a ferestrei** spune unde stă biblioteca: „În cont, la zi”, „Doar în acest browser”, „Fără rețea: se trimite
  la reconectare” sau „O freză în conflict”.
- **Goală la început,** cu „Adaugă frezele de pornire” (șase freze obișnuite: plate Ø3,175 și Ø6, V60 Ø6, V90 Ø12, gravare
  30° cu vârful 0,2 și plată Ø12 pentru fund, toate cu valorile implicite de azi) și „Importă…”. Valorile sunt ale
  aplicației, nu dintr-un catalog. **Schimbat pe 24.11** (precizarea owner-ului: „biblioteca de freze trebuie să fie
  populată cu freze default standard”): biblioteca vine cu ele, singură; vezi „Implementarea (16.A↑a-2)”.
- **Marginile** sunt cele ale documentului (`PLAFON`, unghiul V, vârful sub diametru): o freză care s-ar salva aici trece
  și de ușa documentului.

### 4. Alegerea în proiect

- **Pe rândul exportului:** lista „Freza” arată frezele bibliotecii potrivite rândului (V și gravare doar pe linie și în
  V-carve, ADR 0092 §3; plata peste tot), apoi „Scrisă de mână”. Alegerea umple T-ul, diametrul, forma, unghiul, vârful,
  valorile de lucru și pașii rândului; câmpurile rămân editabile, iar o schimbare de mână face rândul „scrisă de mână (din
  «Plată Ø6»)”. La fel la fundul plat, la frezele de rest, la ale dopului și ale benzii.
- **Numărul T:** al bibliotecii, cât e liber în proiect; altfel al unei freze identice din proiect sau cel mai mic liber, cu
  nota pe rând (regula rolurilor personalizate, ADR 0114 §5). Exportul nu primește două freze sub același T (ADR 0084).
- **În secțiunea Tăierea** (ADR 0112), rândul „Freza”, pentru formele alese, cu aceeași listă: schimbă freza operațiilor lor
  într-un pas de anulare.
- **Rolurile personalizate** rămân cum sunt (freza copiată în rol); un rol cu o freză din bibliotecă o arată cu numele ei.
- **Fereastra exportului refăcută** (linia exportului, ADR 0290, propus pe ramura `wip/28.8-export`: lista operațiilor și fișa
  celei alese, cu secțiunea „Freza”): dacă ea e unită înaintea feliei b, alegerea din bibliotecă intră în secțiunea „Freza”
  a fișei; altfel stă pe rândul de azi și se mută odată cu fereastra. Ordinea o ține sesiunea principală, la unire.

### 5. Documentul v27: copia rămâne, cu originea ei (întrebarea 4)

- Trei câmpuri opționale pe `scula` (deci pe toate locurile unde stă o freză):
  - `biblioteca?: { id, rev }`: de unde vine copia; nu schimbă nimic din tăiere;
  - `regim?: { turatie, avans, plonjare }`: valorile de lucru; lipsă = `REGIM_IMPLICIT`, deci programele de azi rămân octet
    cu octet;
  - `tais?`: lungimea tăișului; o adâncime mai mare e refuzată, cu motivul (ca „conul prea scurt” al V-ului, ADR 0090 §4).
- **Turația e a frezei montate:** același T cu două turații e un conflict, ca două diametre (ADR 0084 §1). Avansul și
  plonjarea pot diferi de la o operație la alta.
- **Migrarea v26 → v27** schimbă doar numărul; un document marcat v26 care are deja câmpurile e refuzat. Oracolul
  documentului, corpusul de aur și probele care țin versiunea curentă se mută pe v27 (pașii din `CLAUDE.md`).
- **Când freza se schimbă în bibliotecă,** proiectul își păstrează copia. Rândul exportului spune ce s-a schimbat („În
  bibliotecă, «Plată Ø6» are acum avansul 1 400 (aici 1 000)”), cu „Ia valorile noi”, pe rând sau pentru toate. **Ștearsă din
  bibliotecă:** „nu mai e în bibliotecă”, cu „Pune-o înapoi în bibliotecă”. Niciodată singur.
- **Un proiect fără origine** (de dinainte de v27, sau o freză scrisă de mână): rândul arată numele frezei din bibliotecă cu
  exact aceleași valori, dacă există una (recunoașterea rolurilor, ADR 0114 §6), fără să scrie nimic.

### 6. Calibrarea (întrebarea 3)

- Diametrul măsurat (de pe șanțurile plăcii 4, `PLAN.md` §4.6) intră în copia din proiect ca `diametru`: CAM-ul taie cu el,
  iar numele păstrează nominalul („Plată Ø6”). Rândul arată „Ø6 · măsurat 6,08”. Vârful efectiv al V-ului intră la fel, ca
  `varf`. Bătaia se ține doar notată: e deja în diametrul măsurat.
- Fără câmp nou în document. Valorile se scriu de mână în editor; placa 4 le dă pe cele adevărate.

### 7. Fără cont, fără rețea, pe două calculatoare (întrebările 2 și 5)

- **Copia din browser:** IndexedDB `cncvs2-freze`, una pentru fiecare cont (după uid) și una fără cont. Biblioteca lucrează
  mereu pe copia ei, și offline. Fără cont, stă doar în browserul acesta, ca Rolurile mele.
- **Prima logare cu o bibliotecă fără cont:** „Adaugi cele N freze din acest browser în cont?” (Da / Nu acum). La ieșirea din
  cont, copia contului rămâne în browser, ascunsă, iar fereastra arată biblioteca fără cont.
- **Sincronizarea trece prin callable-ul `freze`** (editorul nu citește Firestore): `lista` (schimbările de la versiunea
  știută), `scrie` (cel mult 50 de freze, fiecare cu versiunea văzută) și `sterge`. Pe server, `conturi/{uid}/freze/{id}`,
  cu `rev`, data schimbării și semnul ștergerii (ca celălalt calculator să afle de ea), plus contorul de versiuni al
  contului. Regulile: nicio citire și nicio scriere din client. Plafoanele: 500 de freze pe cont, 8 KB pe freză. Fără audit
  pe fiecare freză (sunt datele omului, nu acțiuni ale echipei); erorile intră în jurnal, ca la celelalte callable-uri.
- **Când se sincronizează:** la deschiderea ferestrei, la fiecare salvare (după 2 s fără altă schimbare) și la revenirea
  rețelei. La pornirea aplicației, nimic: în pornire nu intră nimic.
- **Conflictul** (aceeași freză schimbată pe două calculatoare între două sincronizări): îmbinarea pe câmpuri, față de
  ultima versiune comună. Un câmp schimbat doar pe o parte se ia de acolo; unul schimbat pe ambele întreabă: „Păstrează-o pe
  a mea”, „Păstrează-o pe cea din cont”, „Păstrează-le pe amândouă”.
- **Dreptul:** o capabilitate nouă, `cloud`, judecată pe server (`shared/capabilitati.ts`). Proba, planul gratuit și
  personalul o au. Cu proba încheiată sau contul dezactivat, biblioteca din cont se citește și se descarcă, dar nu se scrie;
  cea din browser merge oricum.
- **Datele contului:** exportul și ștergerea lor (14.D↑, ADR 0116 §17) cuprind frezele; nota de confidențialitate le
  pomenește.
- **Testul:** sincronizarea se încearcă doar pe adresa principală de test, după unire și publicarea serverului (App Check).
  Pe canalul `freze` se vede tot restul.

### 8. Fișierul

- **Exportă…** scrie `frezele-mele.cvs2freze.json` (`{ format: 'cncvs2-freze', v: 1, freze: [...] }`), cu toate frezele sau
  cu cele alese.
- **Importă…** citește același format și un CSV cu coloanele scrise în manual (numele, felul, Ø, unghiul, vârful, T,
  turația, avansul, plonjarea, pasul, pasul lateral), cu `;` sau `,`. O freză cu același nume întreabă: Înlocuiește,
  Păstrează-le pe amândouă sau Sari.
- **Formatele altor programe,** doar la cerere și doar dacă formatul lor e public (fără reverse engineering).

### 9. Formele noi, după frezele de azi

Fiecare cu ADR-ul ei (0301 și următoarele), cu probele pe hârtie și invariantele: niciodată mai adânc decât pasul pe
trecere, freza nu intră greșit în piesă.

- **Bila și toroidala:** întâi simularea (toroidala în nucleu, elicea cu bila) și oracolul (toroidala în
  `test/oracles/simulare.ts`, cu h(r) pe hârtie), apoi CAM-ul: pe linie (canelura), în buzunar (fundul, cu creasta pe
  hârtie) și pe o parte doar unde peretele e vertical; în rest, refuzul cu motiv.
- **Profilul desenat:** editorul siluetei, simularea pe siluetă (nucleul, cu altă formulă decât oracolul), oracolul; CAM-ul
  pe linie (canelura cu profil) și pe margine (roundover, cu offsetul față de interior), care închid rândurile etapei 16.

### 10. Mărimea

Biblioteca vine la cerere, ca fonturile: în pornire nu intră nimic (rândul din meniul contului stă în bucata editării, cu
textele ca date, ADR 0086). Estimat: fereastra ~12 kB, alegerea la export și ușa v27 ~3 kB, sincronizarea ~2 kB în bucata
contului (29,6 → ~31,6 / 32). Feliile a–d încap (totalul ~787 / 800). Formele noi (e, f) cer și workerul CAM, simularea și
editorul siluetei: probabil trec de 800, deci decizia pe plafon (sau modulele aduse la prima folosire) se cere la felia e,
cu măsurătoarea.

### 11. Feliile (întrebarea 6)

| Felia | Ce aduce | Se încearcă |
|---|---|---|
| 16.A↑a | Biblioteca în browser: modelul frezei (pur, cu marginile documentului), depozitul IndexedDB, fereastra „Frezele mele” (plată, V, gravare; silueta la scară), frezele de pornire, fișierul (JSON, CSV), meniul contului și paleta, manualul (ro, en) | canalul `freze` |
| 16.A↑b | Alegerea în proiect: lista pe rândurile exportului (și fundul plat, restul, dopul, banda), rândul „Freza” în Tăierea, numerele T, documentul v27, valorile de lucru în program (turația la schimbare, avansul, plonjarea; estimarea timpului cu ele), refuzul adâncimii peste tăiș, nota „s-a schimbat în bibliotecă” | canalul `freze` |
| 16.A↑c | Contul: callable-ul `freze`, colecția, regulile, capabilitatea `cloud`, sincronizarea, conflictul, prima logare cu o bibliotecă fără cont; probele pe emulatoare | adresa de test, după unire și publicarea serverului |
| 16.A↑d | Calibrarea: valorile măsurate în editor, folosite de CAM (după răspunsul 3), legate de fișa plăcii 4 | canalul `freze` |
| 16.A↑e | Bila și toroidala (ADR-ul ei; 0301 și 0302 au luat plafonul și catalogul): simularea, oracolul, CAM-ul | canalul `freze` |
| 16.A↑f | Profilul desenat (ADR-ul lui): editorul siluetei, simularea, oracolul, canelura și roundover-ul | canalul `freze` |
| 16.A↑g | Valorile pe material (seturi pe eticheta materialului foii, ADR 0210 §1) și calculatorul avansului | canalul `freze` |

Mai târziu, la cuvântul owner-ului: Rolurile mele în cont (aceeași sincronizare), burghiul cu vârf la găurire, biblioteca
comună a unui atelier cu mai multe conturi.

## Probele (pe felii)

- **Pe hârtie:** marginile frezei (aceleași ca ale ușii: o freză bună în bibliotecă trece de schema documentului), propunerea
  numelui, frezele de pornire, numerele T (regula ADR 0114 §5), recunoașterea fără origine, îmbinarea pe câmpuri (fiecare
  caz: doar local, doar în cont, același câmp pe ambele, ștearsă pe o parte și schimbată pe cealaltă), fișierul dus-întors și
  CSV-ul (separatorul, virgula zecimală, coloanele lipsă).
- **Programul:** fără `regim`, aceiași octeți (corpusul CAM și plăcile); cu `regim`, turația la `schimba-scula` și avansurile
  scrise, pe hârtie; estimarea timpului cu avansurile noi; refuzul adâncimii peste tăiș; conflictul de turații pe același T.
- **Documentul v27:** ușa, migrarea, oracolul documentului (rândurile în `CAMPURI_NOI_O`, judecata, frontierele pe hârtie),
  corpusul de aur (`ADAUGIRI`, `ISTORIE`).
- **Contul, pe emulatoare:** callable-ul (fără cont, plafoanele, versiunea văzută, ștergerea, dreptul `cloud` cu proba
  încheiată), regulile (nicio citire și nicio scriere din client), sincronizarea cap-coadă pe două contexte de browser.
- **E2e (Edge):** fereastra (freză nouă, editare, ștergere, reîncărcare, fișierul), alegerea pe rând și în Tăierea, nota de
  schimbare, la 1280 px cu fontul lat (Verdana) și pe telefon (390, 360, 320 px), în ambele limbi.
- **Otrăvurile** fiecărei felii, în clonă (`test/otravuri/16.A-*.py`).

## Ce am respins

- **Biblioteca în proiect:** fiecare proiect nou ar porni fără freze; documentul ține doar copiile folosite.
- **Proiectul legat de bibliotecă** (o freză schimbată schimbă proiectul singură): un proiect vechi ar tăia altfel decât a
  fost probat (`PLAN.md`: instantanee).
- **Tabelul `scule[]` la nivelul documentului** (`PLAN.md` §3.2): copia stă deja pe operație (ADR 0084); un tabel ar dubla-o
  și ar cere o migrare a tuturor operațiilor. Originea din §5 face ce ar fi făcut amprenta din plan.
- **Ascultătorii Firestore în editor:** ar aduce Firestore întreg (ADR 0116); callable-ul face aceeași judecată pe server.
- **Biblioteca în `localStorage`** (ca rolurile): sincron și împărțit cu restul aplicației; IndexedDB, ca fonturile.
- **Datele de scule ale altor programe** (cataloagele ArtCAM, Vectric): sunt doar referință funcțională; frezele de pornire
  au valorile aplicației.

## Întrebările pentru owner (doar ce se exclude), cu recomandarea în față

1. **„Profilul de freză”:**
   - **a (recomandat):** amândouă: forma desenată e un fel de freză, iar valorile de lucru stau în fiecare freză; ordinea din
     §11;
   - b: amândouă, cu forma desenată adusă imediat după cont (înaintea bilei și a toroidalei);
   - c: doar valorile de lucru; fără freze desenate acum.
2. **Aceeași freză, schimbată pe două calculatoare:**
   - **a (recomandat):** îmbinarea pe câmpuri; doar un câmp schimbat pe ambele întreabă (a mea, din cont, amândouă);
   - b: ultima salvare câștigă, fără întrebare;
   - c: se păstrează mereu amândouă, ca două freze.
3. **Diametrul măsurat la calibrare:**
   - **a (recomandat):** CAM-ul taie cu el, iar rândul arată „Ø6 · măsurat 6,08”;
   - b: doar notat; CAM-ul taie cu diametrul nominal.
4. **Proiectul, când freza i se schimbă sau i se șterge din bibliotecă:**
   - **a (recomandat):** copia rămâne, cu originea ei în proiect (v27); rândul exportului arată diferența, cu „Ia valorile
     noi”;
   - b: copia rămâne, fără origine; frezele se recunosc doar după valori (ca rolurile), deci o freză schimbată nu se mai
     recunoaște.
5. **Salvarea în cont și planul:**
   - **a (recomandat):** cere un plan activ (proba, gratuit, personal); cu proba încheiată sau contul dezactivat, biblioteca
     din cont se citește și se descarcă, dar nu se scrie;
   - b: orice cont salvează, oricare ar fi planul.
6. **Ordinea feliilor:**
   - **a (recomandat):** cea din §11: biblioteca în browser, alegerea în proiect, apoi contul;
   - b: contul înaintea alegerii în proiect (a, c, b).

## Răspunsurile owner-ului

Pe 23.11.2026, exact: „Da, 1a–6a”. Deci:

1. **a:** amândouă: forma desenată e un fel de freză (felia f), iar valorile de lucru stau în fiecare freză; ordinea din §11.
2. **a:** conflictul se îmbină pe câmpuri; doar un câmp schimbat pe ambele calculatoare întreabă (felia c).
3. **a:** diametrul măsurat intră în copia din proiect și CAM-ul taie cu el (felia d).
4. **a:** copia rămâne, cu originea ei în proiect (documentul v27, felia b), iar rândul exportului arată diferența.
5. **a:** salvarea în cont cere un plan activ; cu proba încheiată sau contul dezactivat, biblioteca din cont doar se citește
   și se descarcă (capabilitatea `cloud`, felia c).
6. **a:** întâi biblioteca în browser (16.A↑a), apoi alegerea în proiect (b), apoi contul (c).

## Implementarea (16.A↑a)

Pe 23.11.2026, în sesiunea cloud a liniei, pe ramura `wip/16.A-freze`. Documentul nu se schimbă, serverul nu se atinge.

- **Modelul** (`src/model/freza.ts`, fără valibot): freza plată, în V și de gravare, cu marginile ușii documentului
  (diametrul până la 100 mm, T-ul 1–999, unghiul 1°–179°, vârful sub diametru), tăișul cel puțin cât conul
  (R − a)·cot(θ/2), turația întreagă, pasul lateral cel mult 50 %, numele unice (fără spațiile dublate, cu literele compuse
  unite, fără deosebire de majuscule, și față de numele frezelor necitite). La salvare pleacă unghiul plăcii și vârful V-ului,
  iar un câmp opțional golit; versiunea crește; câmpurile necunoscute ale frezei vechi rămân. `sculaDinFreza` dă copia pentru
  document (T, nume, Ø, forma), care trece de schema operației; o folosește felia 16.A↑b. Lista: adăugarea, schimbarea,
  ștergerea, mai multe deodată, importul („Păstrează-le pe amândouă”, „Înlocuiește”, „Sari”), plafonul de 500.
- **Depozitul** (`src/app/frezeMele.ts`): IndexedDB `cncvs2-freze`, magazia `biblioteci`, o înregistrare pe bibliotecă
  (`{ v: 1, freze }`, cheia `local`; din 16.A↑c, și una pe cont). Fiecare schimbare citește, schimbă și scrie într-o
  tranzacție, deci două file nu-și pierd schimbările; celelalte file află printr-un `BroadcastChannel`. Frezele pe care
  versiunea de azi nu le citește rămân neatinse la scriere; o listă scrisă de o versiune mai nouă doar se citește; fără
  stocare sau după o scriere căzută, biblioteca ține cât fila, iar fereastra o spune.
- **Fișierul** (`src/io/frezeFisier.ts`): JSON-ul propriu, fără id, versiune și dată; CSV-ul cu cititorul plăcuțelor
  (`src/io/csv.ts`, acum o bucată comună de 0,65 kB): coloanele în orice ordine, `nume`, `fel` și `diametru` necesare,
  restul cu implicitele din manual, virgula zecimală doar când separatorul nu e virgula.
- **Fereastra** (`src/app/FrezeleMele.tsx`, `freze.css`, modulul de mesaje `freze`, la cerere): după schiță. Câmpurile se
  scriu ca text (virgula sau punctul); „Salvează” le judecă. Plecarea din editor (altă freză, una nouă, închiderea, „Frezele”
  pe telefon) salvează schimbările bune; cu un câmp greșit, editorul rămâne, cu focusul pe el. Numele gol primește numele
  propus (la gravare, și cu diametrul: „Gravare 30° vârf 0,2 Ø3,175”, ca două freze de gravare să nu se ciocnească).
  Ștergerea întreabă în fereastră (Escape renunță la întrebare). „Exportă…” e oprit cât biblioteca e goală.
- **Legăturile:** rândul „Frezele mele…” în meniul contului, după contul (și raportările), înaintea manualului;
  `vedere.freze` în paletă, din orice fereastră (ca Aspectul); F1 în fereastră deschide capitolul „Frezele mele”.
- **Probele:** unitare 23 noi (`freza.test.ts` 12, `frezeFisier.test.ts` 6, `frezeMele.test.ts` 5, cu un depozit fals);
  e2e 9 noi (`freze.spec.ts`: meniul, pornirea, filtrul, F1, editorul cu refuzurile, reîncărcarea, plecarea, duplicarea,
  ștergerea, exportul, importul CSV și JSON, două file, telefonul la 390 / 360 / 320 px și 1280 px cu fontul lat, paleta peste
  Mașina, engleza); `cont.spec.ts`, `manual.spec.ts`, `manual.test.ts` și `meniuCont.test.ts` cu rândul și capitolul noi.
  Suita unitară în container: 9 907 / 9 919 (12 sărite, 0 căzute). Otrăvurile: `test/otravuri/16.A-a.py`, 46 / 46.
- **Mărimea** (față de `main` `870e8759`, măsurat pe același container): pornirea 108,5 → 108,7 kB (doar legătura: acțiunea
  din paletă, importul la cerere, cheia din dicționarul de bază; cu ușa 113,2 / 115), totalul 770,9 → 779,9 / 800 kB
  (fereastra 8,8 kB, stilul 1,4, bucata comună a CSV-ului 0,65); mesajele `freze`, ca date, 3,0 kB gzip.

## Implementarea (16.A↑b-1)

Pe 24.11.2026, în sesiunea cloud a liniei, pe ramura `wip/16.A-freze`, la „continua” al owner-ului. Felia 16.A↑b s-a
împărțit în trei: **b-1** (documentul v27 și valorile frezei în program, fără interfață), **b-2** (lista „Freza” pe rândurile
exportului și în Tăierea, numerele T; după fereastra exportului refăcută, ADR 0290, dacă e unită) și **b-3** (nota „s-a
schimbat în bibliotecă”, „Ia valorile noi”, recunoașterea fără origine). Serverul nu se atinge.

- **Documentul v27** (`src/model/document.ts`, `schemaDocument.ts`, `migrari.ts`): pe orice freză a unei operații (scula,
  frezele de rest, fundul plat și frezele lui de rest, frezele dopului drept, freza benzii), `biblioteca` ({ id ca id-urile
  documentului, rev întreg de la 1 }), `regim` ({ turatie întreagă 1–100 000, avans și plonjare în (0, 100 000] }, toate
  cerute; `PLAFON.regimFreza`, aceleași margini ca biblioteca) și `tais` (în (0, 1 000] mm). Migrarea v26 → v27 schimbă doar
  numărul; un v26 care are deja unul din câmpuri pe o freză e refuzat, cu calea frezei și câmpul în motiv.
- **Oracolul documentului** (`test/oracles/document.ts`): `FREZE_OPERATIE_O`, rândul 27 din `CAMPURI_NOI_O` (18 căi, cu pașii
  `[]` pe liste, deci ciocnirea se caută pe fiecare element), `problemeFrezaV27O` pe fiecare loc (categoriile `scula`, `rest`,
  `fund-plat`, `incrustatie`); cazurile pe hârtie la capătul lui `document.cazuri.ts` (13 documente valide noi, 2 migrări,
  4 neciocniri, 16 frontiere, 12 refuzuri, câte o ciocnire pe fiecare loc); `document.v27.oracol.test.ts` 16 / 16; probele
  versiunii curente trec pe 27 (cea mai nouă: 28). Corpusul de aur la v27: frezele capacului (originea, valorile, tăișul de
  22 mm), freza de rest a buzunarului (valorile), fundul plat al etichetei (tăișul), freza benzii (originea); în ieșirile
  celor 27 de dinainte se schimbă doar numărul.
- **Programul** (`src/cam/regimFreza.ts`, pur): `regimFrezei` dă valorile frezei (Z-ul sigur rămâne al lucrării) sau, fără
  ele, chiar regimul lucrării, deci programele de până la v27 rămân octet cu octet. Lucrarea (`job.ts`) le folosește pe
  fiecare loc: profilul, inelele și liniile paralele ale buzunarului, frezele de rest, găurirea, V-ul, fundul plat și frezele
  lui de rest (`traseuVcarve` primește avansurile fiecărei freze a fundului), turația la pornire (a primei freze montate) și
  la fiecare schimbare; la fel dopul în V (`dopV.ts`), iar dopul drept și decuparea benzii trec prin lucrare. Estimarea
  timpului citește F-urile scrise, deci le urmează singură.
- **Turația pe T:** același număr cu două turații (ale frezelor, sau una cu valori și una fără, deci cu turația lucrării) e
  refuzat, ca două diametre; avansul și plonjarea pot diferi de la o operație la alta.
- **Tăișul** (`refuzTais`): pe programul gata, cea mai mare adâncime a fiecărei freze montate (față de fața de sus, deci cu
  supracursa, rampele și elicele) se compară cu tăișul ei; peste, refuzul („freza T1 (…) are tăișul de 5,9 mm, iar tăietura
  coboară la 6 mm: mai adânc, ar tăia cu coada”), cu elementul; egal trece. Pe lucrare și pe dopuri.
- **Probele:** `freze.program.test.ts` 15 / 15 (fără valori, același program; valorile pe fiecare loc; schimbarea; turațiile pe
  același T; estimarea; G-code-ul; tăișul pe profil, cu supracursa prin foaie, pe freza de rest, pe fundul plat, pe dopuri),
  plus corpusul CAM, plăcile și dopurile, neschimbate. Suita unitară în container: 10 076 / 10 088 (12 sărite, 0 căzute).
  Otrăvurile: `test/otravuri/16.A-b1.py`, 34 / 34.
- **Mărimea:** pornirea 109,4 → 109,5 kB (constantele noi ale documentului; cu ușa 113,9 → 114,0, cu Atelierul 114,2 →
  114,3 / 115), totalul 799,6 → 800,5 / 900 kB.

## Implementarea (16.A↑c)

Pe 24.11.2026, în sesiunea cloud a liniei, pe ramura `wip/16.A-freze`, la „b, pornește 16.A↑c” al owner-ului (16.A↑b-2 așteaptă
fereastra exportului refăcută, PR-ul `AndreiBesliu/cvs2#11`). Documentul rămâne v27.

- **Serverul** (`functions/src/freze/actiuni.ts`, callable-ul `freze`, contractul în `shared/freze.ts`): fiecare freză e un
  document `conturi/{uid}/freze/{id}`, cu JSON-ul ei ca text, neatins (o versiune mai nouă a aplicației poate avea câmpuri pe
  care serverul nu le știe; serverul judecă doar forma: un obiect cu id-ul cererii, cel mult 8 KB UTF-8) și versiunea ei în
  cont, dată de contorul contului (`conturi/{uid}/sincron/freze`: versiunea, frezele vii, semnele ștergerii, ultima versiune
  plecată). `lista` dă schimbările de după versiunea știută, în ordinea versiunilor, câte 100, într-o tranzacție doar de
  citire; `scrie` și `sterge` (cel mult 50) cer versiunea văzută, altfel dau conflictul cu ce e în cont, fără scriere; o freză
  nouă peste 500 de vii e refuzată („plina”), nu tot lotul. O ștergere lasă un semn (`json: null`, `stearsaLa`); peste 500 de
  semne, cele mai vechi pleacă (la ștergerea următoare, deci cel mult un lot în plus), iar un calculator rămas în urma lor
  primește lista întreagă (`complet`). Id-urile `__…__` sunt refuzate (Firestore nu le primește). Regulile: nimic din client
  (nicio regulă pe subcolecții, deci închise; proba în `reguli.emulator.test.ts`). Câmpul `json` nu se indexează.
- **Capabilitatea `cloud`** (`shared/capabilitati.ts`): proba, planul gratuit și personalul o au; expiratul și dezactivatul,
  nu (lângă exportul G-code și sender, `shared/conturi.ts`). Serverul o judecă din planul efectiv, ca la deschiderea
  contului: fără ea, `lista` merge (cu `poateScrie: false`), `scrie` și `sterge` sunt refuzate (`permission-denied`).
- **Îmbinarea, pură** (`src/model/frezeSincron.ts`): pentru fiecare freză știută din cont, baza (versiunea și JSON-ul canonic
  de atunci, cu cheile în ordine). O freză de aici diferită de bază e de trimis; una venită cu altă versiune se ia, dacă aici
  n-a fost schimbată, sau se îmbină pe câmpuri față de bază: un câmp schimbat pe o singură parte se ia de acolo, unul schimbat
  pe ambele (sau o freză ștearsă pe o parte și schimbată pe cealaltă) e un conflict, ținut cu ce e în cont până alege omul.
  Rezultatul îmbinat are versiunea peste amândouă și trebuie să fie o freză bună, altfel e conflict pe câmpurile care diferă.
  Un nume luat de o freză venită: una nouă de aici, netrimisă, primește un nume liber; altfel, cea venită (și pleacă). Frezele
  pe care versiunea de azi nu le citește stau brute: se iau din cont, nu se trimit și nu se șterg. „Păstrează-o pe a mea” pune
  baza pe ce e în cont (deci a mea pleacă peste ea), „din cont” o înlocuiește, „amândouă” păstrează a mea ca o freză nouă, cu un
  nume liber. La prima deschidere cu contul, frezele bibliotecii fără cont pe care contul nu le știe (nici în listă, nici în
  baze) se pot aduce, cu id-ul lor, până la plafon.
- **Depozitul** (`src/app/frezeMele.ts`): o bibliotecă pe cheie (`local`, `cont:<uid>`), cu starea sincronizării lângă freze
  (`sincron`, ca date simple, judecate la citire: cheile periculoase și versiunile greșite pleacă); o schimbare a omului păstrează
  restul înregistrării; `schimbaCont` schimbă frezele, cele brute și starea deodată, într-o tranzacție. Canalul filelor spune
  cheia bibliotecii schimbate.
- **Trecerea** (`src/app/frezeSincronizare.ts`): ia toate paginile, apoi lista întreagă dacă e cazul, apoi trimite în loturi
  (de cel mult trei ori, cât conflictele îmbinate lasă ceva de trimis; o freză refuzată de contul plin, o dată pe trecere).
  Se încheie „la zi”, „fără rețea” (inclusiv bucata contului neadusă), „citire”, „cont” (altul logat, ieșit, neconfirmat) sau
  „eroare”. Cererile pleacă prin bucata contului (`cheamaFrezele` din `PanouCont.tsx`, `apeleazaFrezele` din
  `contEditor.ts`), doar cu contul Firebase al bibliotecii deschis: modulul n-are Firebase.
- **Fereastra:** cu contul deschis pe server (adresa confirmată), lucrează pe biblioteca contului; sincronizarea la
  deschidere, la 2 s după o schimbare, la revenirea rețelei și cu „Sincronizează”. Bara de jos: „În cont, la zi”, „Se
  sincronizează cu contul…”, „Fără rețea: se trimite la reconectare”, doar citirea, „Intră din nou în cont…”, conflictele,
  frezele care n-au loc. Banda conflictului (freza, câmpurile, cele trei alegeri) și întrebarea „Adaugi cele N freze din acest
  browser în cont?” (Da / Nu acum, „Nu acum” ținut cât fila) stau deasupra listei. Editorul arată o schimbare venită pe freza
  deschisă, cât n-ai schimbat nimic; ștearsă, se închide. Manualul, în ambele limbi.
- **Probele:** pe emulator, callable-ul (9: refuzurile, versiunile, conflictul, ștergerea și readucerea, octeții, plafonul de
  500, paginile, semnele plecate și lista întreagă, dreptul) și regulile; unitare noi 20 (îmbinarea și sincronizarea pură 14,
  depozitul pe cont 1, trecerea peste un server fals cu două calculatoare 5); cap-coadă pe emulatoare, două browsere ale
  aceluiași cont (`test/e2e-emulator/freze.emulator.spec.ts`, 2). Otrăvurile: `test/otravuri/16.A-c.py`, 47 / 47 (15 pe
  server, 25 pe hârtie, 7 pe fereastră, pe emulatoare).
- **Nu e probat:** că `cheamaFrezele` refuză un alt cont Firebase deschis în același browser (de pildă din `/admin`) decât al
  bibliotecii: garda e o singură comparație de uid, fără probă automată (ar cere două conturi în același browser).
- **Mărimea:** pornirea neschimbată (109,9 kB; cu ușa 114,4, cu Atelierul 114,7 / 115), totalul 806,1 → 810,5 / 900 kB,
  contul 30,1 → 30,3 / 32 (doar online).
- **Nimic pe server până la unire;** la publicare merg funcția `freze`, regulile (neschimbate) și indexurile (scutirea câmpului
  `json`). Sincronizarea se încearcă pe adresa principală de test, după publicare (App Check).

## Implementarea (16.A↑b-2)

Pe 24.11.2026, în sesiunea cloud a liniei, pe ramura `wip/16.A-freze`, la „continua cu 16.A↑b-2” al owner-ului. Fereastra
exportului refăcută (ADR 0290, PR-ul `AndreiBesliu/cvs2#11`) nu era unită, deci feliile lui 16.A↑b s-au renumerotat: **b-2**
e secțiunea Tăierea (fără fereastra exportului, care se schimbă acolo), **b-3** rândurile exportului (lista „Freza” pe freza
operației, pe fundul plat, pe frezele de rest, ale dopului și ale benzii; pe fereastra refăcută, după unirea ei), iar **b-4**
nota „s-a schimbat în bibliotecă” (fostă b-3). Documentul rămâne v27; nimic pe server.

- **Ce formă primește fiecare operație** (`src/model/formaFrezei.ts`, `motivFormaPeOperatie(tip, latura, forma)`): freza în
  V (și cea de gravare) doar pe linie și în V-carve, V-carve-ul doar cu freza în V, freza plată în rest; aceeași regulă ca
  lucrarea (ADR 0090, ADR 0092 §3). E o singură funcție, stabilită cu linia reliefului (ADR 0310 §13): bila își adaugă rândul
  acolo (18.1↑c), toroidala și profilul desenat la fel (16.A↑e–f).
- **Alegerea, pură** (`src/model/alegereFreza.ts`): frezele oferite sunt cele care merg pe toate operațiile alese, în ordinea
  bibliotecii; copia din document (`sculaDinBiblioteca`) are T-ul, numele, diametrul, forma, originea (`biblioteca: { id,
  rev }`), valorile de lucru (`regim`) și tăișul, dacă freza îl are; operațiile pieselor alese primesc copia ca freză
  principală, pasul pe trecere al frezei și, la buzunar, pasul lateral din procentul ei (în jos la 0,001 mm, deci cel mult raza
  la 50 %); adâncimea, frezele de rest, fundul plat, dopurile și restul câmpurilor rămân.
- **Numărul T** (§4, regula ADR 0114 §5): al bibliotecii, cât nicio altă freză a proiectului nu-l are; altfel al unei freze
  identice; altfel cel mai mic liber. Frezele principale ale operațiilor alese nu se numără (le înlocuiește alegerea), frezele
  lor de rest, fundul plat și dopurile da. **Identitatea unei freze montate ține acum și turația** (`aceeasiFreza` în
  `src/model/rol.ts`: diametrul, forma, turația din `regim` sau lipsa ei): același T cu două turații e refuzat la export (16.A↑b-1),
  deci o turație diferită cere alt număr. Regula trece și la roluri (`numarFreza`, `numereFreze`): un rol personalizat cu
  valori de lucru (copiat după 16.A↑b-1) nu mai poate primi T-ul unei freze cu altă turație.
- **Rândul „Freza” din Tăierea** (`src/app/PanouProprietati.tsx`): cât biblioteca are freze, sub pas; nu în Atelier (butoanele
  mari, fără liste: acolo freza rămâne pe cartela ei, schimbată din fereastra exportului; precizat la 16.A↑a-2); biblioteca e a contului deschis pe server sau cea fără cont (`cheieBibliotecii` din `frezeMele.ts`, aceeași
  ca a ferestrei), citită din browser la prima deschidere a panoului, fără sincronizare (aceea rămâne a ferestrei, §7). Arată
  freza din bibliotecă a tuturor operațiilor alese; altfel „Scrisă de mână” (aceeași freză pe toate) sau „— (diferite)”; fără
  nicio freză potrivită, lista e oprită, cu „Nicio freză din bibliotecă nu se potrivește”. Aleasă, trece prin acțiunea
  `document.aplica-operatii` (un pas de anulare, aceeași judecată a ușii). Un T altul decât al bibliotecii are nota lui („Aici e
  T2: T1 e deja al altei freze din proiect.”). Exportă păstrează copia: `sculaScrisa` (`src/app/valoriOperatii.ts`) suprascrie
  doar numărul, diametrul și forma.
- **Probele:** unitare noi 9 (`test/unit/alegereFreza.test.ts`: forma pe operație, frezele oferite, copia, freza comună,
  operațiile, pasul lateral, V-carve-ul cu fundul plat, numărul T cu frezele de rest, cu turația și cu aceeași freză pe două
  numere, rolurile cu turația); în Edge 4 (`test/e2e/frezeTaiere.spec.ts`: rândul ascuns fără bibliotecă, plata pe profil,
  alegerea într-un pas, exportul, anularea, reîncărcarea; V-carve-ul; amestecul și nota; Atelierul cu fontul lat, în engleză).
  Otrăvurile: `test/otravuri/16.A-b2.py`, 22 / 22 (R02 scăpase: aceeași freză pe două numere; proba a primit cazul).
- **Mărimea:** pornirea neschimbată (109,9 kB; cu ușa 114,5, cu Atelierul 114,8 / 120: harta importurilor are o bucată în
  plus), totalul 810,5 → 812,2 / 900 kB. Biblioteca (`frezeMele.ts`, cu îmbinarea și modelul frezei) stă acum într-o bucată a ei,
  comună panoului și ferestrei „Frezele mele”.

## Implementarea (16.A↑a-2)

Pe 24.11.2026, în sesiunea cloud a liniei, pe ramura `wip/16.A-freze`, după precizarea owner-ului: „să ai în vedere că
biblioteca de freze trebuie să fie populată cu freze default standard”. Setul rămâne cel de pornire (cele șase freze din §3,
cu valorile implicite ale aplicației); nimic pe server, documentul rămâne v27.

- **Id-uri fixe** (`ID_PORNIRE` în `src/model/freza.ts`: `std-plata-3175`, `std-plata-6`, `std-v60-6`, `std-v90-12`,
  `std-gravare-30-3175`, `std-plata-12`): aceeași freză standard pe orice calculator și în orice cont. `cuStandard` pune doar
  cele care lipsesc (după id), cu nume libere, cât încap.
- **Biblioteca fără cont** le primește singură, o dată, la prima citire (fereastra sau panoul de proprietăți,
  `cuFrezeleStandard` din `src/app/frezeStandard.ts`; numele propuse vin din mesajele ferestrei, cerute doar atunci). Steagul
  `standard` din înregistrarea depozitului ține minte că s-a hotărât: o bibliotecă cu freze (de dinainte) doar îl primește,
  iar una golită nu se mai umple singură. Butonul unei biblioteci goale e „Adaugă frezele standard” (le pune pe cele care
  lipsesc, cu aceleași id-uri).
- **Contul** le primește la prima sincronizare a acestui browser doar dacă n-a avut niciodată freze (versiunea contului e 0),
  apoi pleacă la el în aceeași trecere: două calculatoare care le pun deodată trimit aceleași id-uri, deci al doilea primește
  conflictul cu același conținut, îmbinat fără întrebare; un cont cu freze, sau cu frezele șterse, doar ține minte că s-a
  hotărât (o freză standard ștearsă nu reînvie pe un calculator nou). Un cont care doar se citește (fără `cloud`) nu le
  primește. Întrebarea „Adaugi … din acest browser în cont?” vine după prima trecere și nu mai numără frezele standard (au
  aceleași id-uri).
- **Panoul** folosește biblioteca contului după ce ea are freze sau a primit setul; până atunci, pe cea fără cont (aceleași
  id-uri pentru frezele standard, deci originea copiată în proiect rămâne valabilă și după sincronizare).
- **Probele:** unitare noi 3 (`cuStandard` și id-urile; depozitul: o dată, ștearsă nu revine, butonul, altă filă, o
  bibliotecă cu freze, versiunea mai nouă, fără depozit; sincronizarea: un cont gol, al doilea calculator, deodată, șterse,
  doar citire); în Edge, fereastra (puse singure, în limba de la prima pornire; goală, cu butonul) și panoul (de la prima
  pornire, fără fereastră) 16 / 16; pe emulatoare 2 / 2 (contul gol le primește, întrebarea numără doar freza omului; doar
  citirea nu le primește). Otrăvurile: `test/otravuri/16.A-a2.py` și `16.A-a2-emu.py`, 15 / 16 (E05, întrebarea înaintea
  primei treceri, practic echivalentă: un „Da” grăbit duce aceleași freze, cu aceleași id-uri).
- **Atelierul** (butoanele mari, fără liste) n-are rândul „Freza”: cu setul pus de la prima pornire, lista ar fi apărut acolo;
  freza rămâne pe cartela ei.
- **Mărimea:** pornirea neschimbată (109,9 kB; cu ușa 114,5 / 120), totalul +0,5 kB: 816,6 / 900 pe ramură, cu 16.A↑b-2, față
  de 814,4 în `main` (`fdce5f1b`).

## Se redeschide dacă

- owner-ul vrea o bibliotecă comună mai multor conturi ale aceluiași atelier, sau cataloagele publice ale producătorilor;
- placa 4 arată că diametrul măsurat nu ajunge (de exemplu, bătaia diferă cu turația);
- plafonul total nu mai lasă loc formelor noi (§10).
