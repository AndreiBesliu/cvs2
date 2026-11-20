# ADR 0281: Piesele atelierului Easy 3Draw pe file: familiile în locul galeriei unice „Legături”

**Starea:** acceptat pe 20.11.2026 (1b, 2a, 3a), cu felia 3.Tp pornită în aceeași zi („Da, pornește 3.Tp”); propus în
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
