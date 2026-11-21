# ADR 0281: Piesele atelierului Easy 3Draw pe file: familiile în locul galeriei unice „Legături”

**Starea:** acceptat pe 20.11.2026 (1b, 2a, 3a), cu felia 3.Tp pornită („Da, pornește 3.Tp”) și implementată în aceeași
zi, pe ramura `wip/3.Tp-galeria-pe-file`; propus în
aceeași zi, la cererea owner-ului: „O sa vreau ca rotitele sa fie pe un tab diferit de blocks si de
conectoare.. nu stiu, o sa se adune multe tipuri de piese si vreau sa fie mai organizat UI-ul”. **Completează:** ADR 0280
(roțile, fulia, roțile la 90°, șenila), ADR 0169 (rotițele dințate), ADR 0129 (Planificatorul ca extensie). Al doilea număr
al intervalului 0280–0289 al pluginului. Schița, cu macheta de încercat (gruparea și așezarea, la alegere) și întrebările:
<https://claude.ai/artifact/G32UWgWyP73uk26yMF3U26>.

**Ce e azi.** Sus, opt file: șase pentru cărămizile System (Cărămidă / placă, Pantă, Pantă inversă, Pană / aripă,
Rotund / con, Știfturi pe lateral), „Legături” și „Calibrare”, plus „Din cvs2”, doar cu forme venite din cvs2. Sub
„Legături”, o singură galerie cu 18 tipuri: grinda, cărămida și placa Technic, știftul, axul, bucșa, toate roțile (dințată,
cu anvelopă, fulia, conica, coroana, conica dublă), suportul, clema, mânerul, bara, bila, cupa; cu șenila (3.To), 19. În cod:
lista `LEGATURI` din `atelier.ts`, `tabPentru` (tipul → fila) și `ultimaLegatura` (ultima piesă aleasă sub „Legături”).

## Decizia (propusă)

1. **Familiile, în locul filelor de azi** (gruparea, după întrebarea 1):
   - **Cărămizi** (7): Cărămidă / placă, Pantă, Pantă inversă, Pană / aripă, Rotund / con, Știfturi pe lateral, Suport
     (bracket);
   - **Technic** (3): Grindă, Cărămidă Technic, Placă cu găuri;
   - **Legături** (8): Știft, Ax, Bucșă / conector, Clemă, Bară, Mâner, Bilă, Cupă;
   - **Roți** (7): Roată dințată, Roată conică, Roată coroană, Conică dublă, Fulie, Roată cu anvelopă, Șenilă (3.To).

   „Din cvs2” (doar cu forme din cvs2) și „Calibrare” rămân file proprii, la capăt: nu sunt familii de piese.
2. **Așezarea** (după întrebarea 2): familiile sus, ca file; piesele familiei alese dedesubt, ca azi sub „Legături”. Fiecare
   filă ține minte ultima piesă aleasă în ea.
3. **Nimic nu se mută în date.** Piesele se țin după tip (`stare.tip`, definițiile din listă), nu după filă: lista de
   printat, fișierele salvate, numele și STL-urile rămân la fel. Se schimbă doar drumul până la o piesă, dintr-o singură
   tabelă tip → familie, din care se fac și filele, și galeriile.
4. **Ce poate sta lângă oricare grupare intră tot, pe felii, după felia filelor:** căutarea peste toate filele („Caută o
   piesă”: „con” găsește Roată conică, Conică dublă, Rotund / con) și pictogramele pe butoanele pieselor.

## Întrebările (recomandarea întâi)

1. **Cum se grupează piesele?**
   - **1a.** 4 familii: Cărămizi, Technic, Legături, Roți (recomandat: cel mai aproape de cerere, cu blocurile, legăturile
     și roțile fiecare pe fila lor).
   - **1b.** 3 familii: Cărămizi (cu cele Technic), Legături, Roți: mai puține file, liste mai lungi.
   - **1c.** 6 familii: Cărămizi, Technic, Știfturi și axe, Clipsuri și bile, Roți dințate (rotița, conica, coroana, conica
     dublă), Roți și șenile (roata cu anvelopă, fulia, șenila): liste scurte, mai multe file.
2. **Cum se așază?**
   - **2a.** File: familiile sus, piesele familiei dedesubt (recomandat: tiparul de azi de sub „Legături”).
   - **2b.** Listă: toate piesele deodată, sub titlul familiei lor, fără file.
   - **2c.** Meniuri: câte un buton pe familie, care deschide lista pieselor ei.
3. **Când?**
   - **3a.** Înaintea șenilei: felia filelor după conicele duble, iar șenila intră direct în fila roților (recomandat).
   - **3b.** După șenilă (3.To, cu șenila deocamdată sub „Legături”).

## Răspunsurile

Owner-ul a răspuns în schiță pe 20.11.2026, apoi: „Da, pornește 3.Tp”.

- **1b:** trei familii, nu patru: **Cărămizi** (10: Cărămidă / placă, Pantă, Pantă inversă, Pană / aripă, Rotund / con,
  Știfturi pe lateral, Suport (bracket) și cele Technic: Grindă, Cărămidă Technic, Placă cu găuri), **Legături** (8: Știft,
  Ax, Bucșă / conector, Clemă, Bară, Mâner, Bilă, Cupă) și **Roți** (6: Roată dințată, Roată conică, Roată coroană, Conică
  dublă, Fulie, Roată cu anvelopă; șenila intră a șaptea, la 3.To).
- **2a:** file: familiile sus, piesele familiei alese dedesubt, ca azi sub „Legături”; fiecare filă ține minte ultima piesă
  aleasă în ea. „Din cvs2” și „Calibrare” rămân file proprii, la capăt.
- **3a:** înaintea șenilei: felia filelor (3.Tp) după conicele duble, iar șenila (3.To) intră direct în fila Roți.

## Felia 3.Tp, implementată: piesele pe file (pachetul 18.15.0)

- **Filele:** sus, cele trei familii, cu câte piese au (Cărămizi 10, Legături 8, Roți 6), apoi, după o linie subțire, filele
  proprii: „Din cvs2” (doar în cvs2, ca până acum) și „Calibrare”. Pe telefon, filele trec pe două rânduri, fără linie.
- **Galeria:** sub file, pe toată lățimea, piesele familiei alese, cu piesa de acum apăsată; ascunsă în vederea modelului și
  pe filele proprii. Stă sub file și pe telefon: în panoul editorului, ca galeria de până acum a „Legăturilor”, ar fi ajuns
  sub vederea 3D, care pe ecranele înguste urcă deasupra editorului. Se face din nou doar la altă familie: în aceeași, se
  mută doar apăsarea, deci cu tastatura focusul rămâne pe butonul ales (cărămizile System erau până acum file fixe, cu
  focusul păstrat; altfel, mutate în galerie, l-ar fi pierdut la fiecare alegere).
- **Ultima piesă pe filă:** fiecare familie ține minte ultima piesă aleasă în ea (la început, prima din galerie): după altă
  filă, după „Calibrare”, după model și după „Schimb-o în editor”. „Placă cu găuri” rămâne forma gata a cărămizii, pe
  Cărămizi. Altă filă sau altă piesă anulează „Înlocuiește în model”, ca până acum.
- **O singură tabelă** (`FAMILII`, în `atelier.ts`), în locul lui `LEGATURI`, `eLegatura`, `tabPentru` și
  `ultimaLegatura`: din ea se fac filele (`data-fila`) și galeria (`#at-galerie`, `data-piesa`). Motorul își spune tipurile
  (`Lego.tipuri`); proba unitară cere fiecare tip o singură dată în tabelă (afară de „dinCvs2”, cu fila lui), doar tipuri și
  forme gata, forma gata în familia tipului ei, iar în marcaj doar filele proprii.
- **Nimic nu se mută în date:** `stare.tip`, definițiile, numele și STL-urile rămân. O listă salvată de pagina publicată
  18.14.0 (fixtura `test/fixtures/trenulet/atelier-18.14.0.json`, făcută ca un om, din `origin/main`) se deschide la fel:
  aceeași piesă, acum pe Roți, aceleași rânduri în listă (numele, mărimile, bucățile, filamentul), același model, aceeași
  culoare; scrisă înapoi, aceeași stare, aceeași listă, același model. La fel pe claude.ai, unde lista vine din baza
  artefactului abia după ce partea 3D a pornit: acum filele și galeria trec pe piesa ei (până acum, filele rămâneau pe piesa
  de dinainte).
- **Textele noi**, în engleză: Bricks, Wheels („Legături” avea deja Joints).
- **Probele:** unitare 5 (`trenulet.familii.test.ts`), e2e 5 (`trenulet.file.spec.ts`: fiecare filă cu piesele ei și
  editorul lor, focusul în galerie; ultima piesă pe filă; lista lui 18.14.0, din `localStorage` și din baza artefactului;
  telefonul, cu fiecare filă și piesă întreagă, pe un rând, fără depășire). Spec-urile pluginului trec pe drumul nou
  (`data-fila`, `#at-galerie`); proba în engleză trece prin fiecare piesă a fiecărei familii și prin filele proprii.
- **Otrăvurile** (`test/otravuri/3.Tp.py`): 29 / 29 pe codul final. La prima rulare, 26 / 27: E15 (filele pe un singur
  rând) scăpase, fiindcă pe telefon pastilele se strângeau, cu numele rupt pe două rânduri, fără nicio depășire; proba
  telefonului cere acum fiecare filă și piesă întreagă. `verifica` pe toate listele pluginului: aceleași 20 de VOID vechi,
  plus 3.Tk E12 (fulia din galerie), redirecționată pe tabelă.

## Felia 3.Tp↑a, implementată: căutarea (pachetul 18.16.0)

Pornită pe 21.11.2026, la cuvântul owner-ului („da si vreau sa pornesti si restul worktrees”), fără întrebare (§4).

- **Câmpul:** „Caută o piesă”, lângă file, nu în locul lor: la capătul rândului lor, iar pe telefon pe un rând al lui, cât
  tot rândul.
- **Potrivirea:** la fiecare literă, galeria arată piesele găsite din toate familiile, în ordinea filelor și a galeriilor.
  Fiecare cuvânt căutat trebuie să înceapă un cuvânt din numele de pe ecran (în limba paginii), fără diacritice (ș și ş,
  la fel) și fără majuscule. „con” găsește Rotund / con, Bucșă / conector, Roată conică și Conică dublă (conectorul se
  adaugă la exemplul din schiță: „con” e începutul cuvântului lui); „nic” nu găsește nimic (e doar în mijlocul lui Technic
  și al conicelor); „roata con” găsește doar Roată conică. Un text fără litere nu găsește nimic.
- **Alegerea:** o piesă găsită se deschide cu fila ei, care o ține minte, iar rezultatele rămân, ca să se încerce pe rând
  (focusul rămâne pe butonul ales); Enter alege prima. Escape, golirea câmpului sau o filă aleasă întorc galeria familiei.
  Peste model și peste filele proprii („Calibrare”, „Din cvs2”), căutarea arată tot rezultatele, fără piesă apăsată.
- **Fără potrivire:** „Nicio piesă nu se potrivește cu „…”.”, cu textul căutat.
- **Nimic în date:** căutarea nu se păstrează; piesele se aleg pe drumul de până acum (`alegePiesa`).
- **Escape și ×** golesc câmpul singure (e un câmp `type="search"`, care trimite `input`); un cod propriu pentru Escape era
  echivalent (otrava lui a scăpat) și a ieșit.
- **Textele noi**, în engleză: Find a piece, No piece matches “…”., Pieces found.
- **Probele:** e2e 4 (`trenulet.cautare.spec.ts`: „con” și alegerea pe rând, cu fila și focusul; diacriticele, majusculele,
  începutul de cuvânt, mai multe cuvinte, textul fără litere, mesajul, Escape, Enter, golirea; peste model și peste
  „Calibrare”; telefonul, cu câmpul pe un rând al lui), plus căutarea în engleză în proba din cvs2 (`trenulet.spec.ts`:
  „bevel” găsește Bevel gear și Double bevel gear; mesajul și numele, în engleză).
- **Otrăvurile:** 21 / 21 pe codul final (`3.Tpa.py`, 20; `3.Tpa-en.py`, 1: potrivirea pe numele din limba paginii, cu setul
  ei în engleză). La prima rulare, 19 / 21 în lista principală: F03 (Escape) era echivalentă, deci codul ei a ieșit; G03
  (cache-ul familiei, neșters la căutare) scăpase fiindcă proba căuta înainte ca atelierul să-și fi arătat galeria; proba
  așteaptă acum galeria și o prinde. 3.Tp E05 și E13, mutate pe rândurile noi; `verifica` pe toate listele pluginului:
  aceleași 20 de VOID vechi.

## Feliile

- **3.Tp:** filele, după răspunsuri; ultima piesă pe filă; probele atelierului mutate pe file.
- **3.Tp↑a:** căutarea peste toate filele.
- **3.Tp↑b:** pictogramele pieselor.

## Probele

- **unitare:** tabela tip → familie are fiecare tip al motorului o singură dată (un tip nou fără familie pică proba);
- **e2e:** fiecare filă arată piesele familiei ei; ultima piesă pe filă; o listă salvată înainte se deschide la fel; pe
  telefon (390 px), filele fără depășire;
- **otrăvuri**, ca la feliile pluginului.

## Mărimea

Doar în pachetul extensiei (atelierul), nu în aplicație.

## Se redeschide dacă

O familie trece de vreo 10 piese (atunci căutarea devine drumul principal) sau owner-ul cere alt fel de a găsi piesele.
