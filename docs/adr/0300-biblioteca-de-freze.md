# ADR 0300: Biblioteca de freze: „Frezele mele”, în browser și în cont

**Starea:** propus pe 23.11.2026, la cererea owner-ului: „Vreau sa pot crea freze l sau profiluri de freze in aplicatie si
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
tăia: plata, V-ul și gravarea acum; bila, toroidala și profilul desenat cu feliile lor.

### 3. Fereastra „Frezele mele”

- **Se deschide** din meniul contului (rândul „Frezele mele…”, ca „Manualul”, ADR 0120), din paletă (Ctrl K), din fereastra
  exportului (lângă freza rândului) și din secțiunea Tăierea. Merge fără cont și offline, în orice aranjament, cu tema și
  densitatea lui (ADR 0250).
- **Pe birou:** lista în stânga (căutarea, filtrul pe fel, grupată pe fel, fiecare cu silueta mică, diametrul, T-ul și starea
  sincronizării), editorul frezei alese în dreapta (câmpurile felului ei, silueta desenată la scară cu cotele, valorile de
  lucru). **Pe telefon** (sub 48 rem): lista, apoi editorul pe tot ecranul, cu „Înapoi”.
- **Butoanele:** Freză nouă, Duplică, Șterge (cu întrebarea; proiectele își păstrează copia, §5), Importă…, Exportă….
- **Bara de jos a ferestrei** spune unde stă biblioteca: „În cont, la zi”, „Doar în acest browser”, „Fără rețea: se trimite
  la reconectare” sau „O freză în conflict”.
- **Goală la început,** cu „Adaugă frezele de pornire” (șase freze obișnuite: plate Ø3,175 și Ø6, V60 Ø6, V90 Ø12, gravare
  30° cu vârful 0,2 și plată Ø12 pentru fund, toate cu valorile implicite de azi) și „Importă…”. Valorile sunt ale
  aplicației, nu dintr-un catalog.
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
| 16.A↑e | Bila și toroidala (ADR 0301): simularea, oracolul, CAM-ul | canalul `freze` |
| 16.A↑f | Profilul desenat (ADR 0302): editorul siluetei, simularea, oracolul, canelura și roundover-ul | canalul `freze` |
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

## Se redeschide dacă

- owner-ul vrea o bibliotecă comună mai multor conturi ale aceluiași atelier, sau cataloagele publice ale producătorilor;
- placa 4 arată că diametrul măsurat nu ajunge (de exemplu, bătaia diferă cu turația);
- plafonul total nu mai lasă loc formelor noi (§10).
