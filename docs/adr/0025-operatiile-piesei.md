# ADR 0025 — Operațiile piesei (documentul v3)

**Starea:** acceptat pe 08.10.2026, în felia 2.2. **Intră în:** etapa 2 (felia 2.2); urechile, intrările și dog-bone-ul
din feliile 2.4–2.6 se adaugă la operația de profil, fiecare cu schema și migrarea ei.

**Problema.** Până la 1.10, parametrii profilului (latura, adâncimea, pasul, freza) trăiau doar în dialogul de export:
nu se salvau, nu se anulau și nu se puteau lega de urechi sau intrări. Glosarul (`PLAN.md` §2, rândul 11) spune că
operația e un pas de prelucrare care referă noduri și poartă scula și parametrii, iar ADR 0024 spune că un câmp nou cu
sens intră doar cu o schemă nouă și o migrare.

**Decizia.** Operațiile stau în piesă: `Piesa.operatii`. O piesă cu mai multe instanțe se taie la fel în fiecare
instanță. Dialogul de export arată și schimbă operațiile; schimbările intră în document ca o singură comandă, la Exportă.

**Contractul documentului v3** (`schema: 3`) = contractul v2 din ADR 0024, cu precizările lui, plus:
- `Piesa { id, nume?, radacina, operatii: Operatie[] }`: lista e obligatorie, poate fi goală.
- `Operatie { id, tip: 'profil', noduri, scula, latura, adancime, pas }`, cu câmpurile necunoscute păstrate:
  - `id`: ca orice id (`^[A-Za-z0-9_-]+$`, 1–64), unic între operațiile aceleiași piese (spațiu de nume separat de
    noduri);
  - `noduri`: 1–10 000 de id-uri distincte, fiecare al unui **element** din arborele piesei (nu al unui grup);
  - `scula`: `{ numar, nume, diametru }`: `numar` întreg 1–999, `nume` text de cel mult 200 de caractere, `diametru`
    finit, în (0, 100] mm;
  - `latura`: `exterior` | `interior` | `pe-linie`;
  - `adancime` și `pas`: finite, în (0, 1 000] mm. Adâncimea față de grosimea foii o judecă CAM-ul (depinde de foaie).
- **Plafoanele:** cel mult 100 000 de operații în document și 100 000 de tăieturi în lume (suma, peste instanțele
  tuturor foilor, a referințelor din operațiile piesei lor).
- **Elementele fără operație nu se taie.** O formă nouă (Adaugă) primește operația implicită; Ctrl+D copiază piesa cu
  tot cu operații.
- **Ordinea tăieturilor:** întâi interioarele, apoi cele pe linie, la urmă exterioarele; în aceeași clasă, instanțele în
  ordinea foii, operațiile în ordinea piesei, nodurile în ordinea operației.
- **O singură sculă pe program**, până la schimbarea sculei (etapa 3): operații cu `scula` diferită (număr sau diametru)
  în același export sunt refuzate cu motiv.

**Migrarea v2 → v3** (pură, deterministă): fiecare piesă primește `operatii` = câte o operație pe fiecare element al
ei, în preordine: `{ id: <id element>, tip: 'profil', noduri: [<id element>], scula: { numar: 1, nume: 'freza plata',
diametru: 6 }, latura, adancime, pas }`, cu `cerc` → `interior`, 8, 4 și `dreptunghi` → `exterior`, 3, 3. Sunt exact
implicitele cu care aplicația v2 exporta. O piesă v2 care are deja un câmp necunoscut `operatii` e refuzată cu motiv
(ciocnire de nume, ca în ADR 0024, precizarea 7). `rev` și restul documentului rămân.

**Scrierea din dialog** (acțiunea `document.aplica-operatii`) schimbă doar **valorile** operațiilor existente: aceleași
operații, în aceeași ordine, cu aceleași id-uri și noduri. Așa referințele, unicitatea și plafoanele rămân cum le-a
lăsat ușa. Valorile noi trebuie să treacă de schema operației (marginile de mai sus), altfel acțiunea e inactivă, cu
motiv, și exportul nu pornește: un proiect salvat peste margini nu s-ar mai putea redeschide (ADR 0024, precizarea 5).
Dialogul ține aceleași margini, deci Exportă e inactiv înainte. Fila care doar citește nu scrie, dar exportă operațiile
din document.

**Precizări din felia 2.2** (recenzia adversarială și reverificarea ei):
1. **„Aceeași sculă” = același număr și același diametru**, peste tot: la export (refuzul „altă sculă”), la forma nouă și
   în dialog. Numele nu schimbă ce face mașina.
2. **O formă nouă (Adaugă) primește freza foii** când toate operațiile de pe foaie au una singură; altfel, implicita
   (T1, Ø6). Așa, un document făcut doar din interfață are o singură sculă.
3. **Dialogul are o singură freză** până la schimbarea sculei (etapa 3): la Exportă, toate operațiile de pe foaie primesc
   numărul primei operații și diametrul din dialog. Când operațiile au freze diferite (un proiect vechi sau importat),
   dialogul o spune pe față, cu fiecare freză (`T1 Ø6, T2 Ø6`), înainte de unificare.
4. **Numerele din dialog** se scriu cu punct sau cu virgulă zecimală și nimic altceva (`src/ui/numar.ts`); un text care
   nu e număr, sau e în afara marginilor, oprește Exportă cu motivul spus. O valoare din document se arată cu cel mai
   scurt text care se citește înapoi exact, ca un Exportă neatins să nu rescrie nimic.
5. **Fila care citește urmează scriitorul și în dialog:** o versiune nouă (sau preluarea scrierii) reia valorile
   operațiilor din document; montajul ales (colțul, Z0) rămâne. Un export în curs, al versiunii vechi, se aruncă și se
   spune. O versiune pe care fila n-o poate deschide (scrisă de o aplicație mai nouă) o trece în `necitita`: nu scrie,
   nu exportă versiunea veche, o spune, și lasă blocarea de scriitor altei file.

**Dovada:** [citit] parametrii implicitii din `src/cam/job.ts` și dialogul de export (freza Ø6) la felia 1.10; placa 1
se taie cu exact aceste implicite, deci fișierele de aur rămân neschimbate după migrare.

**Ce am respins:**
- operațiile la nivelul documentului, cu referințe la instanțe: piesa definită o dată și tăiată la fel peste tot e chiar
  argumentul lui D (ADR 0024);
- un parametru implicit ascuns la export pentru elementele fără operație: „se taie” trebuie să fie o decizie vizibilă
  în document.

**Se redeschide dacă:** apare o operație care trebuie să difere între instanțele aceleiași piese (de exemplu o gravură
cu textul din CSV): atunci ea citește câmpurile instanței, nu se mută la instanță.
