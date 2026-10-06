# LECȚII: ce ne învață CNC Vector Studio, ediția întâi

**Data:** 06.10.2026.

**Ce am citit:** proiectul vechi la `d850c7b`: codul (111k linii), testele (326 de suite), tot DEVLOG-ul
(39 083 de linii), OWNER_VERIFY, documentele, ramurile `wip/inlay-traseu-decupare` și `laterala`. Le-am citit
cu 29 de agenți, pe module și cronologic, iar ciorna a trecut prin doi critici.

**Ce am verificat:** afirmațiile din `CERCETARE-DETALIATA.json`, la sursele lor.

**Rapoartele detaliate, cu surse `fișier:linie` / `sha`:** în [`docs/faza0/`](docs/faza0/). Documentul ăsta
trage concluziile; dovezile stau în rapoarte. Rapoartele există **doar local** (în Drive), nu în repo-ul public:
descriu găuri de securitate ale aplicației vechi, care încă rulează pe live.

> Marcaje: **[măsurat]** = cifră din git, din cod sau dintr-un test al proiectului vechi. **[dedus]** = citit în
> cod, nerulat. Tot restul are sursa în raportul citat.

---

## 0. Pe scurt

1. **Nu ne-a lipsit codul.** Ediția întâi are algoritmi buni și verificați:
   - aplatizarea curbelor și bugetul de toleranță;
   - urechile, lead-ul și incrustația;
   - dilatarea cu profilul frezei;
   - planarea blatului și trasarea din imagine;
   - senderul de bază, poarta test → live și plasa ciornei.

   Mulți dintre ei se pot porta (§3).
2. **Aproape nimic n-a fost probat pe lemn.** O singură sesiune pe mașină e documentată (08–09.08). ~18 funcții
   de mașină și toate reparațiile CAM din septembrie au venit după ea și au fost verificate doar pe dubluri și în
   simulare.
3. **Defectele grave le-au găsit auditurile și o fază de măsurare, nu suitele.** Prima cifră e cât a stat ascuns
   defectul, a doua cât a trăit până la reparație:
   - incrustația care săpa a doua cavitate: 96 / 106 zile;
   - originea din dreapta, care oglindea tot programul: 104 / 112 zile;
   - urechile tăiate ca pante: 106 / 114 zile;
   - lead-in-ul care mușca din piesă: 105 / 113 zile;
   - relieful care tăia sub model: 51–61 de zile până la reparație.

   Primele patru le-a găsit auditul extern din 16.09, care a adus **oracole fizice** și valori pe hârtie. Au fost
   reparate pe 24–26.09. Relieful îl găsise deja, pe 25.08, o fază de măsurare cu un verificator independent.
   Pe origine, cele 299 de suite dădeau rezultate **identice** pe codul oglindit și pe reparație.

   Și auditurile *fără* oracol au greșit:
   - în iunie, scepticii au respins exact lead-in-ul și sensul de tăiere;
   - în iulie, un audit a declarat traseele și senderul „VERIFIED CLEAN”;
   - un alt audit a „infirmat” gaura din `checkout_sessions`.
4. **Cauza de arhitectură care se repetă în fiecare modul:** același fapt avea mai multe autorități. Patru forme
   principale:
   - textul G-code era interfața dintre subsisteme: cinci emitenți, reparsare peste tot;
   - documentul nu avea un singur arbore, ci cinci câmpuri structurale paralele;
   - nu exista un strat de acțiuni: fiecare buton, meniu și ușă AI chema geometria pe drumul lui;
   - prețurile erau scrise în patru locuri, iar dreptul de acces în două.

   Reparația a fost de fiecare dată „o singură ușă”, aplicată retroactiv, clasă cu clasă, după ce defectul lovea.
5. **Cauza de testare:** testele verificau **structura**, nu **rezultatul fizic** („e oglinda? are umăr?” în loc
   de „intră dopul?”). Le scria același autor care scria codul.
   - Otrăvurile alese de autor au fost prinse toate: 281 din 281.
   - Dintre cele alese independent, aproape jumătate au supraviețuit: 27 din 54. Cifra e ușor umflată, pentru că
     unele au fost rulate contra unei singure suite.
6. **De ce a devenit greu și haotic** (detaliat în §2.3):
   - **Iunie a mers foarte repede, fără plasă:** teste persistente abia din ziua 7, CI din ziua 11, deploy pe
     producție după fiecare task. Modelul de date a trecut prin șase forme în 11 zile, iar fundațiile au fost
     puse în ore.
   - **Din august, fiecare felie s-a plătit de 2–3 ori:** construcție, respingere la recenzie, reparație,
     corectură. Pe linii, ~1,5–3 linii de test și ~0,6–1,45 linii de jurnal la fiecare linie de produs.
   - **În septembrie, ținta de produs a dispărut.** 165 din 231 de prompturi (71 %) au fost „continua”; între
     07 și 19.09, 111 din 126 (88 %). Agentul alegea singur lucrul dintr-un registru pe care tot el îl umplea.
     Când owner-ul a dat din nou o țintă (auditul, apoi incrustația), valoarea vizibilă a revenit.
   - **Owner-ul a fost singurul oracol vizual și n-a mai putut ține pasul.** OWNER_VERIFY a ajuns la 37 de
     secțiuni în 27 de zile. Pe 22.09 a scris: „nu pot sa verific acum, continua”.
7. **Planșele:** owner-ul a cerut de la prima zi, stabil, aceleași 5–6 lucruri. Containerul a avut însă 4 forme
   în 6 zile, iar șablonul și-a schimbat definiția de 6 ori, fiindcă între cerere și schemă n-a existat niciun
   pas: nici glosar, nici prototip. Ca ipoteză recomand un hibrid „piese pe materiale” (§5). Decizia e a
   owner-ului, după prototip.

---

## 1. Inventarul pe module: ce exista și cât de bine mergea

**Legendă pentru coloana Calitate:**
- **bun** = probat pe rezultat (oracol fizic sau valoare pe hârtie);
- **parțial** = merge, cu goluri sau probat doar structural;
- **defect** = greșit la HEAD.

Nicio funcție n-are verificare pe lemn, cu excepția unei singure piese tăiate pe 09.08.

| Modul | Ce exista | Calitate | Dovada / problema principală | Raport |
|---|---|---|---|---|
| Nucleu geometric | aplatizare, toleranță pe etape, regiuni (PolyTree), offset, boolean, model `Subpath` (arc = centru + sweep) | aplatizare, toleranță, regiuni: **bun**; modelul și operațiile: **parțial** | oracole analitice la 3 scări. Dar: migrarea de reprezentare s-a oprit la jumătate (49 de apeluri pe forma veche); 12 module ignoră arcele; rotirea distruge dreptunghiul rotunjit; „convertește în cale” pierde arcele **[dedus]** | [01](docs/faza0/01-nucleu-geometric.md) |
| Editor și pânză | 14 unelte, noduri, transformări, selecție, grupuri plate, acroșaj, registru de 58 de comenzi | **parțial** | `PixiCanvas` e o clasă-zeu de 4 123 de linii pe care nicio suită n-o rula. A redesenat de 60 de ori pe secundă timp de 78 de zile. Undo-ul ține 200 de copii complete. Grupurile nu se imbrică | [02](docs/faza0/02-editor-canvas.md) |
| Text | text în vectori, text pe cale | **parțial** | „20 mm” dădea litere de 14,61 mm timp de 3,5 luni. Fonturile se pierd la reîncărcare. Nu există font single-line, rânduri multiple sau text pe cale editabil | [02](docs/faza0/02-editor-canvas.md) |
| Import 2D | SVG, DXF, PLT, PDF/AI, plafoane, desen absurd | SVG: **bun** din 24.09; restul **parțial** | Am refăcut scara SVG (×3,78 timp de 107 zile). Lipsesc: straturile, unitățile și blocurile DXF; arcele și scalarea PLT; altă pagină PDF decât prima. **Zero fișiere reale** în fixturi | [08](docs/faza0/08-import-trasare.md) |
| Trasare din imagine | luminanță, culoare, alfa, linie mediană | **bun** | Oracol analitic. A cerut 7 runde, fiindcă primele 5 au fost măsurate pe poze sintetice opace, nu pe fișierul owner-ului | [08](docs/faza0/08-import-trasare.md) |
| CAM 2D | profil, interior, buzunar, V-carve, incrustație, găurire, urechi, rampă, lead, sens de tăiere | profil, lead, urechi: **bun** din 24.09; incrustație: **bun pe simulare**; buzunar, găurire: **parțial** | Buzunarul e doar concentric, numai G1, cu plonjare dreaptă, verificat structural. V-carve-ul e o stivă de inele, nu axă medială: plăcuța de 6 mm ajunge la 161 842 de linii. Nu există V-carve cu freză plată pentru fund, nici rest machining | [03](docs/faza0/03-cam-2d.md) |
| Relief 2.5D / STL | degroșare pe terase, finisare raster, relief compus din vectori (doar cupolă) | geometric **bun** din 25.08–04.09; ca strategie **parțial** | Oracol convex exact. Un singur raster pe X. Nu există relief din imagine, orientarea plasei sau alte strategii. **Niciun relief tăiat** | [04](docs/faza0/04-relief-3d-freze.md) |
| Freze și materiale | `BitProfile` (profil h(d)), import `.tdb`, 15 materiale, calculator de avans | profil: **bun**; `.tdb`: **bun pe corpusul owner-ului**; avansuri: **parțial** | Martor înghețat bit-exact pentru profil. Tabelul de chipload n-are sursă. `.vtdb` nesuportat | [04](docs/faza0/04-relief-3d-freze.md) |
| Simulare | back-plot, vedere 2D, hartă de înălțime, panglici măturate, câmpuri de arie | **parțial, parcată** din 26.07 | **4 motoare**, niciunul oracol; panglicile *desenau* trasee, nu *simulau* material. Oracolul fizic (`inlayOracle`) e separat și n-a fost comparat niciodată cu simularea | [05](docs/faza0/05-simulare-oracole.md) |
| Export și post | 12 dialecte, origine, multi-sculă, dale, nesting, estimare, fișă, ofertă, DXF | **parțial** | Doar 1 dialect din 12 are sursă. `G21` e scris fix. `T# M6` ajunge pe GRBL. Estimarea e autoconsistentă, necomparată cu cronometrul. 5 emitenți de G-code | [06](docs/faza0/06-export-gcode-post.md) |
| Mașină | sender Web Serial, jog, G54–G59, `$$`, palpare Z, reluare, override-uri, cursa, planare | miezul: **validat pe fier o dată**; restul **parțial** | ~18 funcții scrise după singura sesiune la mașină. O linie ≥ 128 de caractere oprește fluxul pentru totdeauna. Reluarea are drept oracol propria funcție | [07](docs/faza0/07-masina-sender.md) |
| Date și persistență | 5 numere de schemă (6 formate), ușa unică de încărcare, ciorna sigură, garda de versiune, `.cncvs` local, cloud | ușa, ciorna, garda: **bun**; cloud: **parțial** | În cloud câștigă ultimul care scrie. Nu există istoric sau backup. 47 de chei `localStorage` și 4 baze IndexedDB. Fonturile și STL-ul nu au loc în document | [09](docs/faza0/09-date-persistenta.md) |
| Cloud și comercial | cont, probă de 14 zile, 3 planuri, credite, Stripe, 32 de funcții, reguli, App Check, admin, AI, tichete | cod: **în mare parte corect**; comercial: **neactivat** | **Zero lei încasați**: Stripe e pe cheia de test, iar contul live e blocat pe CAEN din ≥ 08.07. Pe live erau 2 utilizatori, amândoi owneri (măsurat pe 26.07). Prețurile stau în 4 copii. Poarta plătită pentru export rula **doar pe client**. Erorile de server stau doar în Cloud Logging, iar costul AI e scris pe fiecare apel, dar fără plafon în $. Baza e în `nam5`, iar funcțiile sunt în UE | [10](docs/faza0/10-cloud-comercial.md) |
| Porți și infrastructură de test | runner propriu, CI, poarta locală, test → live, banc vizual, boot-smoke, instanța de test, mutații | publicarea pe hosting: **bun**; CI și bancul: **parțial** | CI-ul a fost mort 16 zile, fără minute. `deploy.yml` n-a rulat niciodată. Bancul a raportat verde pe 3 sabotaje. Suitele rulează serial, cu plafonul de 300 s | [11](docs/faza0/11-porti-teste-infra.md) |
| Interfață și i18n | taburi, subbare, panoul drept, dialoguri, 5 teme, en+ro, asistent AI, site | i18n: **bun**; restul **parțial** | 18 reorganizări în 4 luni. 97 de controale pe un dreptunghi. 7 câmpuri numerice diferite. 160 de `aria-label` folosite drept cârlige de test | [12](docs/faza0/12-interfata-i18n.md) |
| Planșe, cadre, grupuri | plăci multiple, cadre cu inele, legături, grupuri, dosare, șabloane, nesting | **parțial**, de regândit | vezi §5 | [14](docs/faza0/14-planse-istoria.md), [15](docs/faza0/15-planse-azi-variante.md) |
| Ramura WIP | decuparea dopului de incrustație | algoritm **bun pe oracol**; felie **oprită** | Poarta n-a rulat pe commit-ul ei. `laterala` e un commit gol, fără nimic de recuperat | [13](docs/faza0/13-ramuri-wip-laterala.md) |

---

## 2. Defectele și cauzele lor de fond

### 2.1 Defectele mari: cât au stat ascunse și cine le-a găsit

Coloana „Ascuns / trăit”: zile până când l-a găsit cineva / zile până la reparație.

| Defect | Ascuns / trăit | Găsit de | Cauza de fond |
|---|---|---|---|
| Incrustația: masculul era a doua cavitate (612 din 616 mișcări în interior pe dreptunghiul auditului; dopul umplea 0 %) | 96 / 106 zile | auditul din 16.09, cu oracol | specificație greșită + test pe structură |
| Originea din dreapta oglindea tot programul (G-code, DXF, găurire, relief) | 104 / 112 zile | auditul din 16.09, cu reper pe hârtie | arhitectură: două cadre de coordonate și o conversie aleasă să fie „propria inversă” |
| Urechile erau pante cât toată latura (un raft tăiat pe 15,4 % din contur) | 106 / 114 zile | auditul din 16.09 | model de date: steag pe puncte, nu Z(poziție) |
| Lead-in-ul mușca 2,8–8,2 mm din piesă | 105 / 113 zile | auditul din 16.09 (în iunie fusese **respins** de sceptici) | lipsea noțiunea de „material păstrat” |
| Relieful tăia sub model (87/120 de configurații, −20,96 mm) | — / 51–61 de zile | faza de măsurare, cu verificator independent | garanție pe eșantioane, fizica pe segmente |
| Relieful în alt cadru decât restul (oglindit, la ~140 mm) | 62 de zile | criticul hărții 2.5D | fiecare emitent își aplica singur transformarea |
| SVG importat ×3,78 | 107 zile | audit | parsare pe DOM viu, netestabilă; reparația din iunie „raționată”, nu măsurată |
| Un SVG importat rula cod pe originul aplicației | ~4 luni | audit | arhitectură: arborele brut atașat la document |
| Abonament plătit fără plată (`checkout_sessions`) | ~3 luni | audit (un audit anterior îl „infirmase”) | extensia ia argumentele din documentul clientului; nu exista listă albă |
| Divide ștergea 37,9 % din desen | ~11 săptămâni | audit vectorial | specificație + test pe numărul de bucăți |
| `T# M6` pe GRBL → `error:20` | ~3,5 luni | audit | schimbarea de sculă era un șir în emitent, fără contract de dialect |
| Pânza redesena de 60 de ori pe secundă | 78 de zile | CI | nimeni nu deținea bucla de randare |
| 7 defecte critice la reluare (scula intra 3 mm în lemn etc.) | 1 zi pe live | recenzie | coordonate fără cadru; 11 commit-uri pe live într-o zi |
| Aplicația nu mai pornea (ciornă din era panourilor) | 5 zile | owner, din captură | o ușă de încărcare ocolea normalizarea |
| Textul: „20 mm” → 14,61 mm | 3,5 luni | audit | ușa către om fără specificație |

**Tiparul:** fiecare funcție a fost construită în iunie, în commit-uri de 109–226 de linii. În septembrie au
venit reparațiile, de 390–2 912 linii fiecare. Suitele au tăcut de fiecare dată.

### 2.2 Cauzele de arhitectură: șapte clase care se repetă în toate modulele

1. **Un fapt, mai multe autorități.** Câteva exemple:
   - `closed` față de `Z`;
   - trei modele de inel;
   - trei numere de versiune;
   - adâncimea calculată în cinci locuri;
   - prețurile ×4 și dreptul de acces ×2;
   - profilul mașinii față de `$$`;
   - marcajul de sculă, cu 4 scriitori și 6 cititori.

   Am numărat ≥ 10 cazuri doar în persistență și ≥ 7 în export. **Remediul** e unul singur: o singură autoritate,
   decisă în model, nu „o plasă de sincronizare”.
2. **Textul G-code ca interfață între subsisteme.** Nu exista o reprezentare intermediară (IR) a traseului:
   - simularea, estimarea, dalele și senderul reparsau textul;
   - oracolul nu știa arce;
   - 79 % din blocajul reliefului era recitirea propriului text;
   - unitățile, schimbarea de sculă și turația nu aveau unde să stea.
3. **Niciun strat de acțiuni.** Fiecare suprafață chema singură geometria: panou, bară, meniu contextual,
   tastatură, telefon și șase uși AI. De aici au venit:
   - două grile „Aliniere” cu rezultate diferite;
   - cinci meniuri de roluri cu liste diferite;
   - AI-ul pe telefon fără poartă;
   - șapte câmpuri numerice.
4. **Logica stătea unde nu se putea testa:** pânza de 4 123 de linii, CAM-ul în componente React pe firul
   principal, un store cu 104 acțiuni. De aici, 84 din 326 de suite citeau **textul sursei** cu regexuri, iar acele
   plase au mințit.
5. **Relații deduse, nu declarate.** Câteva exemple:
   - ierarhia ghicită din caseta de încadrare;
   - incrustația recunoscută după grup și nume;
   - inelul recunoscut după concentricitate;
   - „e plin” dedus din culoare.

   Fiecare ghiceală a mers pe exemplul de test și a picat pe desenul owner-ului.
6. **Model de date incomplet:**
   - nu existau entități de operație, de montaj sau de resursă;
   - exista o singură sculă pe proiect;
   - CAM-ul stătea pe vector;
   - primitivele nu aveau matrice, deci o rotire le distrugea;
   - fonturile și STL-ul nu aveau loc în document.

   Relieful și 3D-ul au intrat lipite pe margine.
7. **Migrări de reprezentare neterminate.** Comenzile au fost înlocuite cu `Subpath`, dar 49 de apeluri citesc
   încă forma veche. Arcul nativ a venit după ~25 de `switch`-uri scrise fără el. Fiecare trecere a lăsat
   consumatori pe forma veche.

### 2.3 De ce progresul a devenit greu și procesul haotic

Răspunsul vine din citirea cronologică a întregului DEVLOG ([21](docs/faza0/21-cronologie-1.md)–[28](docs/faza0/28-cronologie-8.md))
și din git ([00](docs/faza0/00-metrici-git.md)). Rescrierea de cod n-a fost cauza: churn-ul a stat la 12–19 %.

**Cum a evoluat, pe faze:**

| Perioada | Cum arăta | Ce a lăsat în urmă |
|---|---|---|
| **30.05–12.06**: viteză fără plasă | ~35 700 de linii de produs în 13 zile; teste și jurnal ~0,09 la o linie. Primul test persistent abia în ziua 7, CI în ziua 11. Regula #8 cerea deploy pe producție după fiecare task (~215 intrări cu deploy). MVP-ul a fost gata în ziua 2, dar nu s-a oprit nimic acolo: scope-ul l-au condus sugestiile asistentului („you choose”, „all of them”) | modelul de date trecut prin șase forme în 11 zile; fundații puse în ore (comenzi în loc de geometrie, offset ales după arie, părinte dedus din casetă, pași ficși), care în august au devenit un program de 32 + 112 constatări |
| **12.06–12.07**: lățime | admin, credite, mobil, teme; simularea refăcută de 6 ori în 2 zile, **pe producție**, ca s-o vadă owner-ul. Senderul construit pe 12.06 a rulat prima dată pe mașină pe **08.08** | funcții late, nevalidate fizic |
| **13–24.07**: pauză | zero commit-uri; la reluare, jurnalul scrie date greșite și sesiunea revine direct la zona cea mai fragilă | context pierdut |
| **August**: dovada devine munca | aproape fiecare felie trece prin construcție, **respingere** la recenzie adversarială, reparație, corectură. Un sfert din jurnal sunt re-treceri. Teste ~1,6–1,7× produsul. Porțile mint: 9 felii verzi aveau defecte reale. Briefurile orchestratorului au premise false „de mai multe ori pe zi”. Sesiunile paralele se calcă pe picioare (`git add -A` străin, alias șters). `CLAUDE.md` apare abia pe 15.08 | infrastructură de dovadă construită după fapt, care costă cât produsul |
| **Septembrie**: fără țintă | Prompturile „continua”, pe ferestre: 27/50 (28.08–06.09), 55/62, 52/64, apoi 26/57 (19–28.09). Agentul își alege lucrul din registru, iar registrul se hrănește singur: 55 de rânduri deschise în 6 zile, multe deschise de el „acum o oră”, cel puțin 10 cu premisa greșită. În 14–19.09, 35 din 97 de commit-uri au atins numai `.md`. În 01–15.09, commit-urile de jurnal au ars 29 % din minutele de CI (571 din 1 955), până când CI-ul a murit pe 15.09 | reparații ale reparațiilor: 3 audituri suprapuse în 30 de ore (~8 M tokeni). O reparație de audit ar fi suprascris biblioteca primului cont pe un calculator cu două conturi; auditul următor a prins-o în aceeași zi |
| **24.09–03.10**: auditul extern și oprirea | auditul **cerut de owner** (făcut pe 16.09) găsește ce n-au găsit 299 de suite; brieful „o felie per defect” dă cele mai ordonate zile din proiect. Incrustația: 9 zile, fiecare rundă de recenzie găsește 10–17 defecte reale, otrăvurile urcă de la 35 la 147. Owner-ul oprește campania pe 29.09; felia rămâne pe o ramură WIP | „costul fiecărui pas de produs ajunsese mai mare decât valoarea lui vizibilă” ([28 §6](docs/faza0/28-cronologie-8.md)) |

**Cele opt cauze de proces:**

1. **Lipsea o țintă de produs și o definiție a lui „gata”.**
   - MVP-ul n-a fost înghețat. Scope-ul a fost delegat, apoi a venit „continua”.
   - Registrul de restanțe a devenit foaia de parcurs, deși era o listă de datorii.
   - Owner-ul a numit singur problema: *„nu vreau să rămână o idee neimplementată complet și să iasă din context
     pentru că ne-am apucat de altceva mai mare sau urgent între timp”* (DEVLOG.md:16886). Din cererea asta s-a
     născut registrul. Registrul a păstrat ideile, dar nu le-a dat o ordine.
   - Cele mai valoroase zile au fost cele cu o țintă dată de el: auditul vectorial cerut pe 16.09 și brieful
     „o felie per defect, cu commit separat” din 24–25.09.
2. **Viteză fără plasă la început, apoi plasă fără încredere.**
   - În iunie nu existau teste.
   - Când au venit, le scria același autor care scria codul, și verificau structura. Au mințit.
   - Încrederea s-a mutat atunci în ritualuri scumpe, făcute **după** livrare: recenzii adversariale, campanii de
     otrăvuri, audituri cu zeci de agenți. Prindeau defecte reale, dar costau fiecare cât încă o felie.
   - Poarta locală a crescut de la ~10 la ~20 de minute pe felie.
3. **Un verdict fără probă a valorat cât o părere.**
   - Auditul din 09.06 a găsit lead-in-ul și sensul de tăiere, iar scepticii le-au respins.
   - Tot el a găsit scara și punctele SVG, care au stat în coadă 107 zile. Tot el a cerut „coerce to 0”, care a
     introdus un defect.
   - Auditul din 12.07 a declarat traseele și senderul „VERIFIED CLEAN”.
   - Un audit a „infirmat” gaura din `checkout_sessions`.
   - Registrul nu avea gravitate, deci o constatare adevărată stătea la coadă lângă o idee de interfață.
4. **Producția a fost mediul de test, iar owner-ul a fost singurul oracol.**
   - Pânza, simularea și UI-ul logat erau oarbe pentru unelte: „blind spot” de 34 de ori, „verifică owner-ul” de
     29 de ori, doar în primele două săptămâni.
   - Owner-ul a găsit defectele din capturi, după deploy.
   - Lista lui (OWNER_VERIFY) a crescut mai repede decât o putea goli. La final nici limbajul nu se mai potrivea:
     *„explică-mi mai degrabă la ce te referi când zici dopul”*.
5. **Contextul nu s-a transmis între sesiuni și între modele.**
   - Jurnalul a ajuns la 39 083 de linii, necronologic, cu paragrafe false corectate mai jos și date greșite.
   - Au lucrat cel puțin cinci modele AI diferite, plus sesiuni paralele pe același arbore.
   - Aceleași capcane de unelte (heredoc, CRLF, `| tail`, `git checkout --`) s-au plătit de 8–12 ori, deși
     erau scrise în memorie.
   - Raționamentul stătea în comentarii: 33 % din `src/`, până la 68 % în unele fișiere.
6. **Mașina și lemnul au lipsit din buclă.**
   - O singură sesiune pe fier. Nicio piesă tăiată după reparațiile din septembrie.
   - Fizica a fost „dovedită” numai de simulări scrise de aceeași echipă, iar uneori simularea împărțea defectul
     cu generatorul.
7. **Infrastructura a fost construită înaintea nevoii.**
   - Codul cloud și comercial a ocupat 21–35 % din commit-uri pe lună. Încasarea era blocată din ≥ 08.07, iar pe
     live erau 2 utilizatori, ambii owneri (26.07).
   - Poarta de publicare: ~3 000 de linii și 18 commit-uri, retrofitate.
   - Instanța de test și poarta au fost construite într-o zi, deși owner-ul le ceruse „ULTIMA”. Testul a rămas o
     trecere de 3 minute, fără App Check.
   - Storage conectat și nefolosit.
   - Un `deploy.yml` de 327 de linii care n-a rulat niciodată.
   - Desktopul, construit în 3 zile și scos după două luni.

   Instanța de test rămâne o idee bună (§3.1), dar folosită de owner, nu doar trecută prin poartă.
8. **Mediul a produs frecare permanentă.**
   - Windows cu CRLF față de CI pe Ubuntu.
   - Google Drive care readuce fișiere.
   - Minutele de CI, care au ajuns un plafon ascuns.
   - Fiecare a costat de mai multe ori, pentru că lecția nu era pusă într-o unealtă, ci într-un text.

**Ce înseamnă pentru procesul ediției a doua** (de confirmat la interviu):

- **Owner-ul dă ținta fiecărei etape**, cu „gata” definit printr-o probă pe care o poate face: de preferat o piesă
  tăiată. Registrul de restanțe e o listă de datorii, nu foaia de parcurs.
- **Registrul are gravitate.** Un defect confirmat care atinge mașina sau banii trece înaintea oricărei restanțe
  noi. Un verdict se dă numai cu probă, inclusiv o respingere.
- **Dovada se proiectează înaintea funcției și e mică și de încredere:** un oracol independent, valori pe hârtie,
  un martor. Nu se adaugă după, ca ritual. Poarta are un buget de timp pe niveluri.
- **Fără deploy pe producție la fiecare task.** Owner-ul încearcă prototipuri și instanța de test, nu live-ul.
- **Fierul e în buclă la fiecare etapă care mișcă mașina.** Transcrierile de pe mașină devin fixturi.
- **Cunoașterea stă în locuri mici și verificate:** `CLAUDE.md`, ADR-uri, cifre generate. Jurnalul e scurt pe
  fiecare felie. Lecțiile despre unelte devin **unelte** (un hook, un script, `.gitattributes`), nu propoziții.
- **Lista pentru owner are o limită** (de exemplu cel mult 5 lucruri deschise) și o stare pe fiecare rând.
- **Infrastructura vine când o cere produsul.** Excepție: ce e ieftin doar dacă e pus din prima zi (build
  determinist, config citit de la gazdă, schema cu versiune, `.gitattributes`). Partea comercială vine după ce
  bucla de bază merge pe lemn.

---

## 3. Ce a mers bine și merită păstrat

### 3.1 Idei de proces

- **Oracolul fizic independent** (`testkit/inlayOracle.ts`).
  - Ce face: zero importuri din aplicație. Citește textul G-code, sapă un bloc simulat cu silueta reală a frezei,
    răstoarnă dopul și îl așază.
  - De ce merită: a închis în câteva zile defecte care trăiseră luni. Tot pe acest tipar au funcționat
    `vcarveAirJudge` și oracolul convex al reliefului.
  - Ce lipsea: arcele (pe `main` aruncă la G2/G3; pe ramura WIP le aproximează prin coarde), dialectul complet
    și calibrarea **o dată** pe lemn.
- **Valoarea pe hârtie și martorul.**
  - Ținta testului e calculată de mână, nu cerută funcției testate (`test-origine-colt`, `test-urechi-profil`).
  - Proba se arată căzând pe defectul vechi (1,732 / 3,975 / 2,991).
  - Pentru refactorizări, un **martor înghețat**: implementarea veche e extrasă din git și cere egalitate bit cu
    bit.
- **Publicarea test → live a aceluiași artefact.**
  - Build-ul e determinist, iar configul e citit de la gazdă.
  - Ștampila e citită din `sw.js`-ul servit, un arbore `-dirty` e refuzat, iar confirmarea compară octet cu octet.
  - Rezultat: 29 din 29 de publicări **de hosting** pe live au trecut prin test, cu zero ocoliri.
  - Limitele:
    - garantează identitatea, nu verificarea: mediana dintre test și live a fost de 3 minute;
    - regulile Firestore au avut o cale fără poartă până pe 09.09;
    - regulile de Storage au ajuns pe live înaintea testului, dintr-un arbore murdar.
  - Mecanismele ieftine, dacă sunt puse din prima zi, sunt build-ul fără ceas, configul citit de la gazdă și
    comparația pe octeți.
- **Instanța de test cu identitate reală, nu cu reguli slăbite**, plus carantina auto-loginului. Regulile Firestore
  sunt probate pe emulator **în perechi permis/refuzat**, cu chitanța care leagă hash-ul regulilor de rulare.
- **Plafoanele pe uși.**
  - **Ce a mers:**
    - importul refuză peste 16 MiB înainte de citire și întreabă omul peste 15 000 de elemente sau 150 000 de
      noduri;
    - senderul refuză peste 400 000 de linii, nu trunchiază;
    - pragurile vin din bugetul de timp împărțit la costul măsurat și stau într-un singur modul;
    - otrăvurile au ieșit 40/40 roșii;
    - desenul absurd (> 100 m) e judecat pe caseta exactă, cu patru răspunsuri pentru om.
  - **Ce n-a mers:** ușile neprevăzute au ocolit plafonul.
    - Un șablon aplicat ×50 dă 20 000 de forme.
    - AI-ul poate dubla planșa până la 16 384 de forme.
    - Exportul scria fișiere pe care propriul sender le refuza.
    - Lungimea liniei n-avea plafon: o linie de ≥ 128 de caractere oprea senderul.
  - **Ce se păstrează:** metoda (refuz motivat, prag măsurat, un singur modul). Plafonul se mută însă pe
    **artefact**, adică pe document și pe program, și se verifică la intrarea în store, pentru toate ușile.
- **Registrul de restanțe derivat din jurnal** (`npm run stare`).
  - A pornit la cererea owner-ului, ca nicio idee să nu se piardă. Funcția asta rămâne.
  - Nu are o a doua listă care să derapeze.
  - Limitele lui:
    - parserul era permisiv;
    - ramurile erau invizibile;
    - închiderile scrise în proză se pierdeau;
    - n-avea gravitate.
- **Faza de măsurare fără drept de a scrie cod.** „Dacă felia nu merită, spune-o cu cifre.” Așa a fost găsit
  relieful care tăia sub model.
- **Verificatorul independent, cu instrumentul și corpusul lui.** A respins de două ori reparații declarate bune.
- **Corpusul real al owner-ului** (`FREZE.tdb`, fișierul lui de imagine). A găsit diametrele ×25,4 și a oprit un
  avertisment care ar fi fost fals în 92 % din cazuri. Trasarea a mers abia când s-a lucrat pe fișierul lui.
- **Modelul fizic derivat pe hârtie înaintea codului** (incrustația, urechile) și **bifa scrisă lângă
  măsurătoare**.
- **Ciorna sigură.** Salvarea e sincronă în `localStorage`, apoi în IndexedDB, și există un `.bak` înaintea oricărei
  aruncări. O ciornă mai nouă e ținută ostatică. Regula: o verificare nu scrie ce verifică.
- **Controlerul e sursa de adevăr.** „Neștiut” se afișează ca neștiut, nu ca 0. Verdictul vine din re-citire, nu
  din `ok`.
- **Faptele publice derivate din cod** (`landingFacts`, `contentFacts`): un număr afișat pe pagină e o valoare din
  cod, nu o propoziție scrisă de mână.
- **Paritatea en/ro impusă de compilator** (`ro: typeof en`) și suita de plurale românești.
- **Analiza scrisă înaintea codului**, cu deciziile owner-ului numerotate (documentele mașinii).

### 3.2 Algoritmi verificați, de portat după ce owner-ul vede ce și de ce

| Algoritm | De ce mă încred | Limite |
|---|---|---|
| Aplatizorul: pas din săgeată (formă stabilă), planeitatea Bézier, reziduul κ | oracole analitice la 10/100/1000 mm | doar arc circular |
| Bugetul de toleranță pe etape și drumuri | sumă exactă, refuzul lui 0 | calibrarea trebuie probată pe rezultat |
| `arcFitPolyline` și biarc | testat, cu D9 reparat | oracolul suitei e unidirecțional |
| Urechile ca profil Z(s) cu palier și flancuri | 88 de verificări pe hârtie, 7 otrăvuri | supracursa subțiază puntea |
| Lead-ul ales față de regiunea păstrată | 594 de variante, discul sculei | — |
| Modelul incrustației (limită, umăr S = D − joc, pasul femelei) + poziția decupării `e*` | oracol pe 10–12 forme | **neprobat pe lemn** |
| Dilatarea gri cu profilul frezei + lema coardei (finisare sigură pe segment) | oracol convex exact, verificator independent | exactă în noduri; un singur raster |
| Maximul glisant cu deque monoton (degroșare O(grilă)) | oracol | disc plat, conservativ |
| Modelul de freză `BitProfile` | martor bit-exact, corpus de 186 de siluete | o cotă pe rază; fără lățimea vârfului |
| Cunoașterea formatului `.tdb` | corpusul owner-ului (409 intrări) | format reverse-engineered, de folosit doar pentru citirea fișierelor owner-ului |
| Transformata de distanță Danielsson | 1,5–1,9 µm RMS | — |
| Planarea blatului | oracol de acoperire, cu un caz de control care pică | nimic pe fier |
| Fluxul GRBL cu numărare de caractere, bariera `M6`/`M0`, preambulul de reluare | o piesă reală + port-model | linii ≥ 128; reluarea are oracol autoconsistent |
| Trasarea pe luminanță (Otsu, muchie sub-pixel) + potrivirea pe arce | oracol analitic | eroare ≈ 0,65 px |
| Oferta în bani întregi, cu baza pe fiecare rând | aritmetică probată | timpul de mașină moștenește estimarea neverificată |
| Registrul probei (HMAC pe email), grația ancorată pe începutul perioadei, creditele pe egalitate exactă | module pure testate | copiile de pe server netestate |

---

## 4. Ce aș face altfel în arhitectură, și de ce

Fiecare punct e legat de defectele din §2. Ce e marcat **propunere** n-a fost probat nicăieri; se probează în
Faza 2, cu sonde.

1. **Glosarul și documentul de structură înaintea schemei.** Substantivele domeniului se fixează într-o frază
   fiecare: placă, parte, element, operație, montaj. Fiecare variantă se încearcă într-un **prototip aruncabil**,
   iar schema se îngheață abia după felia verticală folosită de owner.
   *De ce:* „piesa” a însemnat parte pe 31.05 și placă pe 01.06; patru containere în șase zile.
2. **Un singur document, cu entități tipizate și un arbore unic.**
   - Nodurile sunt: grup, cadru, vector, text, relief, instanță de mesh.
   - Operațiile sunt entități care **referă** noduri.
   - Montajele țin materialul, originea, orientarea, axa și știfturile.
   - Sculele intră ca instantaneu al folosirii.
   - **Resursele** (STL, imagini, fonturi, câmpuri) sunt adresate prin hash. Derivatele sunt cache, niciodată
     salvate.
   - O singură declarație de schemă dă și tipul, și validatorul cu limite.
   - Câmpurile necunoscute se **păstrează**.
   - Migrările sunt funcții pure vN→vN+1, cu corpus de aur.
   - `rev` decide „nesalvat”, iar undo-ul e un jurnal de comenzi.

   *De ce:* clasele 1, 5 și 6; D3 și D9–D14 din [09](docs/faza0/09-date-persistenta.md). E singurul fel în care
   relieful, 3D-ul și axa a 4-a intră fără o migrare dureroasă.

   *Ce depinde de §5:* containerul de producție (planșă, montaj sau foaie) și locul originii se aleg după
   prototip. Indiferent de variantă rămân:
   - arborele unic;
   - operațiile ca entități;
   - resursele prin hash;
   - o singură schemă cu validator;
   - migrările pure;
   - păstrarea câmpurilor necunoscute.
3. **Un model de curbă închis din prima zi:**
   - linie, arc și cubică (plus arc eliptic, dacă vrem), cu `switch` exhaustiv;
   - primitive parametrice cu matrice de plasare;
   - regula de umplere decisă o dată, pentru ecran, clic și sculă;
   - offset care păstrează arcele, cu Clipper ca rezervă (**propunere**).
4. **Un IR al traseului.** Mișcările sunt tipizate (linie, arc, elice), cu `z0`/`z1`, scula, operația și etichete
   (intrare, punte, lead, aer).
   - Toți citesc IR-ul: simularea, estimarea, dalele, fișa, oferta, senderul.
   - **Un singur post** serializează G-code-ul și deține unitățile, arcele, dialectul și schimbarea de sculă.
   - Originea de lucru e un obiect, iar transformarea document → mașină e o singură matrice.

   *De ce:* clasa 2, originea oglindită, `M6` pe GRBL, `G21` fix.
5. **Motorul CAM.**
   - **V-carve pe axa medială**, cu Z variabil și o a doua sculă pentru fund (cerința [v1]). Stiva de inele a cerut
     trei felii compensatorii și a dat 161 842 de linii pe o plăcuță de 6 mm.
   - **Regiunea păstrată**, cu paritatea inelelor, e obiect de prim rang. O citesc lead-ul, legăturile, sensul de
     tăiere și pre-flight-ul.
   - **Rampa, lead-ul și urechile** sunt modificatori Z(s) compuși peste orice trecere, inclusiv peste buzunar.
   - **Relief și STL:**
     - suprafața separată de bugetul de linii;
     - rasterizare conservativă;
     - drop-cutter pe triunghiuri și orientarea plasei;
     - strategiile (raster cu unghi, offset, waterline, scallop, rest) peste același câmp de degajare.
   - **Implicit, se lasă material, nu se sapă.** Regula asta a limitat paguba de fiecare dată.
   - **Ieșirea e mărginită, cu buget de linii măsurat.** Workerul singur n-a oprit OOM-ul reliefului.
   - **Operațiile poartă scula, turația și avansurile lor.** Schimbarea de sculă e un eveniment în IR.

   *De ce:* [03](docs/faza0/03-cam-2d.md) §4, [04](docs/faza0/04-relief-3d-freze.md) §4,
   [32](docs/faza0/32-verif-lectii-5-9.md) lecția 9.
6. **Simularea are două motoare, separate prin construcție.**
   - **Nucleul de produs:** hartă de înălțime pe dale, cu rezoluția legată de kerf; apoi câmp cilindric pentru
     rotativ.
   - **Oracolul de referință:** lent, cu zero importuri, citește G-code-ul cu tot dialectul și e calibrat o dată pe
     lemn.
   - Cele două se compară pe un corpus.
   - Invariantele (niciodată mai adânc decât pasul, nimic tăiat din regiunea păstrată, nicio scobitură în model)
     rulează pe **orice** program generat de suite.

   *De ce:* [05](docs/faza0/05-simulare-oracole.md); patru motoare de simulare, niciunul oracol.

   *Atenție:* prompt-ul cere „același motor folosit de teste”. Propunerea de aici păstrează asta pentru testele de
   produs (aceeași simulare și în previzualizare, și în teste). Adaugă însă un oracol de referință care o validează.
   Întrebarea e la interviu (§7).
7. **Un strat de acțiuni înaintea oricărei suprafețe.**
   - Fiecare comandă are: `id`, etichetă, `enabled → motiv`, capacitatea de plan și `run`.
   - Barele, meniurile, paleta, tastatura, telefonul și AI-ul sunt doar vederi ale aceluiași registru.
   - O plasă de importuri interzice componentelor să cheme direct geometria sau CAM-ul.
8. **Pânza doar desenează.**
   - Uneltele sunt mașini de stare pure, testabile cu un script de pointer.
   - Intrarea folosește Pointer Events de la prima linie.
   - Scena e reținută, cu culling și index spațial, cu buget măsurat.
9. **Tot calculul greu rulează în worker, cu anulare, din prima zi:** CAM, simulare, relief, import mare.
10. **Mașina:**
   - o sesiune cu tranzacții (`query('$#')` întoarce blocul);
   - procedurile sunt mașini de stare pure;
   - tipuri pentru coordonate (`MachinePos`/`WorkPos`, `Known`/`Unknown`);
   - senderul trimite exact octeții exportați, cu hash;
   - contractul de dialect e declarat de post;
   - N axe din prima zi.
11. **Cloud-ul:**
    - o singură regiune în UE;
    - un singur catalog comercial;
    - dreptul de acces se calculează doar pe server;
    - lista albă de prețuri pe server;
    - reguli fără catch-all, probate în CI;
    - funcții în TypeScript, împărțite pe domenii;
    - configurarea de consolă ca script;
    - App Check egal pe toate instanțele;
    - backup cu alarmă din ziua 1;
    - observabilitate din ziua 1: un jurnal de erori de server, un ledger AI pe apel cu plafon lunar în $, oprirea
      AI-ului impusă pe server și un panou de diagnoză (Stripe, App Check, backup, e-mail).

    **Ce se vinde se impune pe server.** G-code-ul generat în browser nu se poate bloca real. Ori acceptăm
    convenția, ori vindem ce rulează pe server: cloud, AI, biblioteci. Se decide înainte de codul de facturare.

    **Comerțul merge în pas cu capacitatea de a încasa.**
12. **Testele:**
    - oracolul **înaintea** funcției;
    - criteriu de acceptare fizic;
    - fixturi = corpus care rupe coincidențele (forme cu găuri, arce, unghiuri 30–90°, toate colțurile de origine);
    - mutațiile ca unealtă comisă, alese de altcineva decât autorul, rulate pe toată suita;
    - runner standard, paralel, pe niveluri (rapid / complet / de noapte), cu buget pe suită;
    - **nicio** plasă pe textul sursei;
    - banc vizual din prima zi, care dă owner-ului poza și cifra împreună.
13. **Cunoașterea:**
    - deciziile în ADR-uri scurte;
    - cifrele din documente sunt generate sau asertate, nu narate;
    - comentariile spun ce **este** codul, nu istoria lui;
    - registrul de restanțe e structurat (nu proză) și vede ramurile;
    - un singur document pe subsistem, citit de fiecare sesiune și de fiecare model.
14. **Fierul e în buclă.** O placă de probă tăiată de owner e poarta de „gata” pentru orice funcție care mișcă
    mașina. Transcrierile de pe mașină intră în fixturi.

---

## 5. Sistemul de planșe: cum funcționa, ce probleme a avut, ce variante există

### 5.1 Cum funcționa la HEAD

O **planșă** (`Piece`, în cod) e o placă de material:
- nume, dimensiuni, grosime și colț de origine;
- fibra, opțional;
- o listă **plată** de vectori.

Toată structura stă pe vector, în câmpuri independente:
- `insets[]` (inelele cadrului);
- `parentId` (legătura de conținut);
- `template` (regula de reflow);
- `groupId` (grup plat);
- `layerId` (dosar);
- plus `clipToId`, `locked` și `hidden`.

Perechea incrustației e recunoscută din geometrie. Exportul, simularea și devizul văd doar **planșa activă**.
„Mai multe planșe” înseamnă o listă de pânze, nu o unitate de producție.

### 5.2 Istoria pe scurt: ce s-a schimbat și de ce

| Ce | De câte ori | Detaliu |
|---|---|---|
| Containerul | 4 forme în 6 zile | `PanelShape` (30.05, alt model AI) → `Piece[]` (31.05) → Placă→Panouri (01.06: trei commit-uri în 22 de minute, cel mult ~45 de minute cu tot cu planul) → plat (05.06, în 75 de minute) |
| Straturile | 5 stări | create → operații și grup → scoase → slot mort → dosare (22.08) |
| Inelul | 6 forme | — |
| Șablonul | 6 definiții | placă → panou → conținutul plăcii → spațiu per vector → cadru + conținut → din orice selecție |

În iunie au fost 70 de commit-uri pe fișierele de structură. Pasul 5 (07–09.08) a inserat ~9 700 de linii în trei
zile, aproape tot ca să repare ce lăsase iunie: 3 625 de produs, 4 488 de teste și 1 572 de jurnal. În 9 săptămâni
au fost **patru migrări de schemă**.

### 5.3 Ce voia de fapt owner-ul: stabil, de la prima zi

1. Mai multe plăci reale într-un proiect, văzute împreună.
2. Părți ca niște uși de dulap, cu desenul lor înăuntru, așezate automat pe placă (rotite, nu deformate).
3. **Mărimea unei părți o schimbă doar omul.** O spune de patru ori. *La HEAD, conținerea încă micșorează în tăcere
   orice vector care iese din placă.*
4. Margini constante, ca în CSS, oricât ai întinde cadrul.
5. Omul decide cum se reașază conținutul și găsește ușor unde.
6. Ce pui în ramă devine al ramei, fără gestul de „legare”, și se scoate ușor.
7. Șablonul e o parte (ramă + conținut), aplicată la multe mărimi, în lot, pe plăci standard.
8. Părțile se mută între plăci. *Pierdut pe 05.06, odată cu panourile.*
9. Selecția de grup e diferită de selecția multiplă. *Grupurile imbricate sunt încă deschise.*
10. Mai puțină aglomerare și mai multă libertate, nu gărzi.

**Ce nu s-a cerut niciodată:** panoul ca obiect separat de desen, legarea explicită și ierarhia dedusă din
geometrie. Toate trei au fost propuneri ale asistentului, apoi respinse sau șterse.

### 5.4 Problemele

**Pentru om:**
- **Același gest dă răspunsuri diferite după felul de „împreună”.** Ctrl+D pe o ramă face o ramă goală; Șterge
  lasă conținutul pe loc. Tabelul complet e în [15 §2](docs/faza0/15-planse-azi-variante.md).
- Grupurile sunt plate.
- Legătura se vede doar în panoul Obiecte.
- Reflow-ul surprinde: gaura de agățat de 8 mm ajunge la 98 mm.
- Micșorarea e tăcută.
- Planșele nu sunt producție.
- Dosarele sunt al patrulea concept de „împreună”.
- Offset-ul are trei motoare.
- O piesă repetată e o copie, nu o instanță: un șablon aplicat ×50 dă 20 000 de forme.

**Pentru cod:**
- opt câmpuri structurale fără container;
- clasa „un gest scrie, altul curăță”, cu 8 instanțe în 3 zile;
- o mașină de stări a apărut doar ca să susțină colapsul;
- o ierarhie ghicită care a corupt date pe disc timp de ~9 săptămâni;
- teste care treceau fiindcă nu se mișca nimic.

### 5.5 Cauza de fond

Cerințele n-au fost greșite: văzute la rând, sunt remarcabil de stabile. **Între cerere și schemă n-a existat
niciun pas.** Nu s-a scris fluxul, nu s-au fixat cuvintele și nu s-a încercat un prototip care să poată fi respins
ieftin. Fiecare propoziție a owner-ului a devenit în câteva minute o schemă publicată pe live. Owner-ul și-a
descoperit cerințele folosind producția, iar fiecare descoperire a costat o schemă, o migrare și teste care
fixau mecanismul, nu intenția. La asta s-au adăugat cinci modele AI fără un document-sursă al structurii.

### 5.6 Variantele

| | Ideea | Rezolvă | Costă | Relief / 3D / axa a 4-a / fețe |
|---|---|---|---|---|
| **A. Planșe + un singur arbore** | Planșa rămâne pânza. Grupuri imbricabile; cadrul e un grup cu contur | gesturile incoerente, grupurile plate, dosarele, perechile | puțin | 3 axe bine; axa a 4-a și fețele, slab |
| **B. Scenă + montaje** | Desenul trăiește liber, fără material. „Montajul” (material, origine, orientare) **referă** obiecte și operații | producția, originea, CAM-ul scos de pe vector | mult: două spații de lucru, referințe la nivel de operație | cel mai bine (tiparul DeskProto) |
| **C. Piese + foi de material** | Se definesc PIESE (contur, desen, operații). Pe FOI se pun **instanțe**, de mână sau prin nesting. Un G-code pe foaie. Multi-Plate = piesă cu câmpuri din CSV | producția, instanțele (50 de plasări, nu 20 000 de forme), mutarea între foi, vărsarea pe foaia următoare | semantica instanțelor; două niveluri | relieful aparține piesei; fețele = foi oglindite cu știfturi; axa a 4-a cere „material” generalizat |
| **D. Hibrid (recomandat ca ipoteză)** | Producția ca în C. În fiecare piesă, arborele din A. Materialul poartă orientarea și fața, ca montajul din B. **Al doilea nivel apare doar când e cerut** | tot ce rezolvă A și C | costul din C + disciplina de a ascunde nivelul doi | da, prin material generalizat (placă, bloc, cilindru) |

**De ce D, ca ipoteză:**
- owner-ul gândește în piese fizice;
- cererile lui de producție sunt operații pe instanțe: vărsare, mutare între plăci, fibră;
- plafonul și Multi-Plate cer instanțe, nu copii;
- pragul ArtCAM + DeskProto cere materialul și orientarea separate de desen;
- arborele face să dispară întrebările `rama-ca-grup`, `grupuri-imbricate` și `grup-membru-mutat-singur`.

**Ce nu se reia din vechi, oricare variantă:**
- ierarhia ghicită;
- micșorarea tăcută;
- colapsul cu mașină de stări;
- câmpurile structurale paralele pe vector.

**Ce se păstrează:**
- inelul parametric cu identitate (singurul model corect sub orice redimensionare);
- regula „relația se scrie la actul omului, nu se re-deduce”;
- registrul de referințe verificat de compilator;
- nesting-ul (rafturi exacte, apoi raster pe contur, cu vărsare).

### 5.7 Prototipul care decide (fără motor, clicabil)

Opt scenarii. Pentru fiecare: ce face owner-ul, apoi ce observăm.

1. **Plăcuța mărită.** O plăcuță cu ramă, canelură la 10 mm și text, mărită de la 300 la 400 mm.
   *Observăm:* poate prezice unde ajung canelura și textul înainte de clic?
2. **Gesturile pe ramă.** Dublu-clic în ramă și mută textul; apoi Ctrl+D pe ramă; apoi Șterge rama.
   *Observăm:* primește același răspuns la toate trei?
3. **Grup în grup.** Intră pe două niveluri.
   *Observăm:* iese cu Escape fără să se rătăcească?
4. **Suporturi pe foaie.** 12 suporturi pe o foaie de 600×400, cu surplusul pe foaia 2; apoi mută unul înapoi.
   *Observăm:* câte concepte a trebuit să numească?
5. **Piesa-sursă editată.** Editează piesa-sursă după ce are 12 instanțe.
   *Observăm:* e clar dacă editează una sau toate?
6. **Plăcuțe din CSV.** 30 de plăcuțe cu nume din CSV.
   *Observăm:* valorile stau pe instanță sau pe piesă, și i se pare firesc?
7. **Două fețe.** Relief pe față și buzunar pe spate.
   *Observăm:* i se par firești foile oglindite cu știfturi, sau un montaj cu orientare?
8. **Semnul unic.** Un semn de 1 200 mm.
   *Observăm:* apare al doilea nivel fără să-l ceară?

**Criteriul de decizie:**
- dacă 1, 2 și 8 cer două niveluri vizibile, alegem A (eventual cu un C ușor deasupra);
- dacă 4–7 contează în v1, alegem D.

---

## 6. Ce se corectează în CERCETARE-DETALIATA.json

Am verificat adversarial secțiunea `old` (rapoartele [31](docs/faza0/31-verif-lectii-0-4.md)–[36](docs/faza0/36-verif-decizii.md)
și secțiunea 6 din fiecare raport de modul). **Nicio afirmație n-a fost infirmată**: toate defectele și faptele
au existat. Multe sunt însă corectate la cifră, la dată, la mecanism sau la regula propusă.

| Secțiune | Confirmate | Corectate | Infirmate |
|---|---:|---:|---:|
| `lessons` (20) | 5 | 15 | 0 |
| `metrics` (15) | 8 | 7 | 0 |
| `decisions` (27) | 19 | 8 | 0; 8 dintre decizii s-au întors ulterior |
| `inventory` (28) + `boards` | puține integral | cele mai multe note | 0; o sub-afirmație depășită: elicea simulată e reparată la HEAD |

Lista completă e în [`docs/faza0/40-corecturi-json.md`](docs/faza0/40-corecturi-json.md). Aici rămân doar corecturile care
**schimbă o concluzie sau o regulă** pentru ediția a doua:

- **Lecția 7, orientarea.** Nu se stochează. Se **derivă** dintr-o singură autoritate (imbricarea regiunii);
  doar închiderea se stochează, o dată, pe subtraseu. Proiectul vechi a măsurat asta. Regula din JSON („orientarea
  stocată”) ar reintroduce defectul.
- **Lecția 8, simularea ca oracol.** „Simularea e și oracol” devine tautologie fără un al doilea motor
  independent. Parcarea din 26.07 a venit după ce owner-ul a acceptat reparațiile, nu ca o capitulare.
- **Lecțiile 0 și 2, oracolul.** Oracolul trebuie să ia valoarea așteptată din **geometria piesei**, nu din
  programul testat, și să nu împartă cod nici cu generatorul, nici cu simulatorul. Profilul frezei n-a fost
  cauza defectului de relief: tăia și cu o freză dreaptă.
- **Lecția 11, Drive.** Regula „cod în afara Drive” e deja respinsă de owner (05.10). Rămâne plasa:
  - git ca sursă de adevăr;
  - fără `git stash` în arbore;
  - mutațiile verificate pe hash.
- **Lecția 13, listele ținute de mână.** „Nicio listă de mână” e prea larg: proiectul vechi a încălcat-o a doua
  zi. Forma care se poate ține: **se derivă unde se poate; unde nu, copia are un test care o compară cu sursa, în
  ambele direcții.**
- **Lecția 15, auditurile scumpe.** Auditul din 04.09 n-a găsit „un singur defect”. A arătat că registrul era
  corect (27/36) și a dus la două reparații. Risipa a venit din pornirea la coada ferestrei și din reluare.
  Regula: tranșe de cel mult ~20 de agenți, cu rezultatul scris pe disc, niciodată la coada ferestrei. Am aplicat-o
  chiar în Faza 0.
- **Lecția 17, poarta test → live.** Există din 26.08, la cererea owner-ului. Mecanismele care o fac posibilă
  sunt build-ul fără ceas, configul citit de la gazdă și comparația pe octeți. Puse din prima zi, sunt ieftine;
  retrofitate, au costat 18 commit-uri și ~3 000 de linii.
- **Lecția 18, interfața aglomerată.** **Nu** se contopesc meserii diferite într-un singur model: cele trei
  offset-uri sunt unelte diferite. Regula corectă: o singură implementare și o singură listă de opțiuni pe acțiune.
  Ușile sunt subțiri și testate că oferă același lucru; meseriile diferite primesc nume diferite.
- **Lecția 5, modelul de date.** „Versiune de schemă + o singură funcție de migrare” exista deja din 31.05 și n-a
  oprit cele patru modele din 7 zile. Ce lipsea era prototipul înaintea schemei.
- **Inventarul, la V-carve.** V-carve-ul **nu** e pe axa medială: e o stivă de inele concentrice. De aici vine
  propunerea din §4.5.
- **Metricile, la posturi.** Doar **1** post-procesor din 12 are sursa documentată.

Fișierul `CERCETARE-DETALIATA.json` nu l-am modificat: e documentul owner-ului.

---

## 7. Ce scoate LECTII la suprafață pentru interviu

Le adaug la lista din `CLAUDE.md`. Recomandarea mea e prima:

1. **Planșele.** Prototip clicabil pe cele 8 scenarii din §5.7, apoi alegere între A și D. Recomand D, ca
   ipoteză.
2. **Ce înseamnă „gata” pentru o funcție care mișcă mașina**, și cât de des poate owner-ul tăia o placă de probă.
   Recomandarea: o placă de probă pe etapă, cu transcrierea de pe mașină păstrată ca fixtură.
3. **Cine alege următoarea felie.** Recomandarea: owner-ul alege ținta etapei, iar asistentul propune feliile din
   ea. Registrul nu e foaia de parcurs. Lista pentru owner are o limită.
4. **Proiectele Firebase.**
   - Varianta recomandată e să **pornim proiecte noi într-o singură regiune UE**. Azi baza live e în `nam5`,
     funcțiile și Storage-ul în `europe-central2`, iar locațiile nu se mai pot schimba. Pe 26.07, pe live erau 2
     utilizatori, ambii owneri, deci migrarea ar costa aproape nimic. Înainte de decizie, renumărăm utilizatorii
     din consolă.
   - Varianta cealaltă e să refolosim `cncvectorstudio` / `cncvectorstudio-test`.
   - Domeniul, contul Stripe, cheia reCAPTCHA Enterprise și textele juridice se refolosesc oricum.
5. **Comerțul și ce se blochează.** Contul Stripe live e blocat pe CAEN din ≥ 08.07. Recomandarea: întâi
   deblocarea contului și un plan comercial simplu, apoi codul comercial, după ce bucla de bază merge pe lemn.
   Întrebarea „ce se blochează” are o limită de care trebuie ținut cont: G-code-ul generat în browser nu se poate
   bloca real. Ori acceptăm convenția, ori vindem ce rulează pe server (cloud, AI, biblioteci).
6. **Simularea ca oracol: unul sau două motoare.** Prompt-ul cere „același motor folosit de teste”, iar proiectul
   vechi arată că un motor care se judecă singur devine tautologie. Recomandarea: același nucleu pentru
   previzualizare și pentru testele de produs, validat contra unui oracol de referință cu zero importuri, pe un
   corpus (§4.6).
7. **Ritmul publicării.** Recomandarea: fără deploy pe producție la fiecare task; pe test oricând; pe live la
   sfârșitul unei etape, cu confirmarea owner-ului.
8. **Ce algoritmi din vechi se portează.** Hotărât pe 06.10: după interviu și după planul aprobat, owner-ul
   primește o evaluare dedicată, `docs/PORTARE.md`, făcută față de arhitectura nouă și pornind de la lista din
   §3.2. Fiecare candidat primește unul dintre verdictele: portat, adaptat, rescris cu vechiul ca martor, lăsat.
9. **Regula de umplere și modelul de curbă.** Sunt decizii tehnice cu efect vizibil pentru om: de exemplu
   `nonzero` față de `evenodd`. Se decid în Faza 2, cu o sondă.
10. **Desktop / offline.** Recomandarea: PWA din prima zi (vechiul service worker a mers); shell nativ abia după
    ce produsul se vinde.
11. **Proiectul vechi.** Recomandarea: rămâne arhivat ca referință. Ramura goală `laterala` se poate șterge, dar
    doar la decizia owner-ului.
