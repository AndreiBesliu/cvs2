# ADR 0052: Transformările selecției (scalarea, rotirea), Alt care inversează lipirea, uneltele în bara de sus

**Starea:** acceptat pe 20.10.2026, odată cu felia 6.C↑. Cererea owner-ului: „Da, fă acum transformările (mânerele de
scalare și rotire pe selecție), împreună cu Alt care inversează lipirea, fără agenți. […] cercul, ar trebui sa aiba raza,
cum hexagonul are numar de fete […] acum am cerc si rectangle in doua locuri. pe UI-ul asta, vreau ca toate uneltele astea
sa fie in bara de sus, cu snap si grid, iar align/distribute options intr-o subbara, ca un submeniu”. **Intră în:** etapa 6
(„Editorul de vectori”), adusă în etapa 3, fără mașină (6.C↑). **Continuă:** ADR 0050 (lipirea, modulul editării la
cerere), ADR 0051 (uneltele de desen).

**Problema.** O formă pusă nu se poate mări, micșora sau roti din pânză (doar rotirea, ca număr, în panou). Alt doar oprea
lipirea, deci cu lipirea oprită nu exista o lipire de o clipă. Cercul se desena doar prin tragere, fără o rază scrisă.
Dreptunghiul și cercul apăreau de două ori (butoanele „Adaugă” din bara de sus și uneltele), iar bara editării plutea în
colțul pânzei, cu alinierea întreagă la vedere.

## Decizia

**1. Bara de sus.** Aranjamentul (`src/ui/aranjament.ts`) are un loc `unelte` în grupul „forme” al barei de sus; modulul
editării (la cerere) îl umple printr-un portal: uneltele de desen, câmpul uneltei (laturile poligonului, raza cercului),
Lipire și Grilă ca butoane cu pictogramă (pasul grilei apare când grila e pornită) și un singur buton „Aliniere” (▾) care
deschide sub-bara cu cele 8 alinieri și distribuiri (ADR 0053: din 6.D↑, în extensia barei, mereu la vedere). Fără locul acesta (alt aranjament), bara plutește în colțul zonei
libere, ca înainte. „Adaugă dreptunghi / cerc” pleacă din bara de sus, dar rămân în registru și în paleta de comenzi
(Ctrl+K). Sub 95rem, „Caută o comandă” rămâne doar cu pictograma (numele îl păstrează cititorul de ecran): măsurat, la
1280 px grupul din dreapta acoperea 62 px din „Exportă G-code”, la 1366 px 19 px, la 1440 px cu grila 7 px.

**2. Alt inversează lipirea** pe durata gestului: cu lipirea pornită o oprește, cu ea oprită o pornește (mutarea, desenul,
ghidajele). ADR 0050 §2 („Alt ține lipirea oprită”) se citește de acum așa.

**3. Raza cercului.** Unealta cercului are câmpul razei (implicit 15 mm, ținut în browser, ca laturile poligonului). Un clic
fără tragere pune un cerc cu raza din câmp, centrat în punctul (lipit) al clicului; o tragere desenează ca înainte și scrie
raza ei în câmp. Editarea după plasare (raza, laturile, razele) e felia următoare (6.D↑).

**4. Mânerele.** Cu unealta Selecție (ADR 0053: din 6.D↑, doar cu unealta Transformare), pe cutia selecției (în afara doar-citirii): 8 mânere de scalare și unul de rotire,
deasupra. Colțurile scalează proporțional (după axa care s-a schimbat mai mult), cu Shift liber; laturile, pe o singură
axă; ancora e mânerul opus. Rotirea e în jurul centrului cutiei, cu Shift în pași de 15°; unghiul ia drumul scurt (±180°).
Mânerul urmează deplasarea cursorului față de apăsare: un clic pe mâner (sub 3 px de tragere) nu schimbă nimic. Scările se
rotunjesc la 1e-4, unghiul la 0,001° (pixelii mausului nu intră în geometrie). Cât se trage: conturul cutiei transformate
și mărimea în mm (sau unghiul); Escape renunță. La eliberare, o singură acțiune, `document.transforma` (un pas de anulare).
- **Mânerele sunt doar desen** (`pointer-events: none`). Lovitura se decide geometric (`manerLovit`, pătrate de 12 px),
  într-un ascultător pus înaintea pânzei, doar pentru butonul stâng fără Space: rotița, butonul din mijloc și Space
  ajung la pânză oriunde ar fi mânerele (cu mânere care prind apăsarea, panoramarea pornită de pe un mâner nu mai mergea:
  au prins-o oracolele traseului, care panoramează din punctul unui cerc). Cursorul pânzei arată mânerul de sub maus.
- Pe o axă mai mică de 24 px pe ecran, mânerele care o scalează nu apar (o linie orizontală are doar capetele; o formă
  mică, niciunul), ca forma să rămână de apucat și mutat. Cât e apăsată pânza în altă parte (mutarea, panoramarea),
  mânerele se ascund: n-ar urma forma.
- Calculul e pur (`transformareManer`, `manereVazute`, `manerLovit`, în `src/app/editareCalcul.ts`).

**5. Exactitatea** (BRIEF §16.2), pură, în `src/model/transformare.ts`:
- Rotirea schimbă doar instanța: unghiul (adus în 0…360) și locul, rotit în jurul centrului.
- Scalarea schimbă geometria piesei, exact, nu o matrice de scară: dreptunghiul își schimbă laturile (raza colțului doar
  uniform), cercul raza, calea vârfurile și punctele de control ale cubicelor; translațiile nodurilor se scalează și ele.
  Locul instanței: ancora + (loc − ancora) · scara. Pe o instanță (sau un nod) rotită cu 90° / 270°, axele își schimbă locul.
- Se refuză, cu motivul spus lângă cutie: scalarea neuniformă a unui cerc (ar deveni elipsă), a unei căi cu arce, a unui
  dreptunghi cu colțuri rotunjite, a unei instanțe sau a unui nod rotit altfel decât cu un multiplu de 90°; o piesă
  folosită de mai multe instanțe (s-ar schimba toate; copiile legate vin în etapa 11); o scară zero sau negativă (fără
  oglindire din mânere).
- Documentul de după trece de schemele documentului și de plafonul translației, ca la desen (ADR 0051 §4).

**6. Pornirea** nu primește nimic nou: mânerele, transformarea și calculul acțiunii vin cu modulul editării, la cerere;
în registru stă doar acțiunea, cu garda ei. Pornirea rămâne 95,0 kB (cu ușa 99,7 / 100).

**Amânate:** lipirea mânerelor de ținte (ghidaje, grilă), oglindirea, transformarea numerică a selecției multiple din
panou; editarea după plasare (6.D↑).

## Probele

`test/unit/transformare.test.ts` (rotirea, scalarea fiecărei forme cu valori pe hârtie, axele la 90°, refuzurile, documentul
de după trece de ușă), `test/unit/editare.test.ts` (mânerele: punctele, ancora, proporțional / Shift, o axă, deplasarea față de
apăsare, rotunjirea, rotirea cu Shift și drumul scurt; pragul de 24 px, lovitura), `test/unit/actiuni.editare.test.ts` (acțiunea: un pas, rotirea care nu atinge piesa,
refuzul inexact fără comandă, plafonul, doar-citirea, fără selecție), `test/e2e/editare.spec.ts` (mânerele pe pânză, ascunse cât se mută forma, rotița și butonul din mijloc
deasupra lor, clicul fără efect,
refuzul cercului, Alt care pornește lipirea de grilă, cercul pus cu un clic și raza scrisă de tragere; bara de sus fără
suprapuneri la 1280, 1366 și 1440 px, cu și fără câmpul grilei: pe CSS-ul de dinainte, proba cade la 1280 px).
