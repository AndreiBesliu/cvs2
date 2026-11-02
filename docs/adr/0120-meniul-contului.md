# ADR 0120: Meniul contului: contul, manualul și sugestia, într-un meniu sub butonul Cont

**Starea:** acceptat pe 02.11.2026, la felia 14.C↑c. A pornit din observația owner-ului pe instanța de test, cu captura ferestrei
contului rămase pe „Opening the account…” („de ce apare chestia asta? ar trebui sa fie un meniu mai conventional pentru account
area.”), urmată de „si trebuie sa pui acolo si manualul si sugestiile”. La schița propusă (meniul derulant, „?” și Sugestie mutate
din bară în meniu, F1 rămas) owner-ul a răspuns „Da, fă-l”. **Schimbă:** ADR 0116 §A3 (butonul Cont nu mai deschide direct
panoul), ADR 0058 §3 și §4 (manualul nu mai are butonul „?” din extensia barei; F1 rămâne), ADR 0111 §1 (butonul Sugestie din
extensia barei devine un rând al meniului, cu aceeași condiție). **Continuă:** ADR 0103 (meniul de clic dreapta: tastele).

**Problema.** Butonul Cont deschidea direct fereastra contului, care la fiecare deschidere reconfirma contul pe server:
- două cereri la Firebase Auth (`reload` și tokenul reîmprospătat);
- tokenul App Check;
- callable-ul `cont`, care pe instanța de test pornește la rece.

Cât aștepta, fereastra spunea doar „Se deschide contul…”, deci clicul pe Cont părea să nu ducă nicăieri. Manualul („?”) și
sugestia stăteau separat, în extensia barei.

## Decizia

1. **Butonul Cont deschide un meniu**, sub el, aliniat la dreapta lui, pe `body` (peste panouri și bare, ca fereastra contului).
   Logat, butonul arată inițialele (într-un cerc) și primul nume; fără cont, „Cont”. Are `aria-haspopup="menu"` și
   `aria-expanded`.
2. **Capul meniului vine din contul ținut** (`dreptCont.ts`, ADR 0116 §8), fără server. Arată, după caz:
   - numele și planul de azi (proba cu zilele rămase, judecată și după zilele offline; planul gratuit; personalul; proba
     încheiată; contul dezactivat);
   - adresa neconfirmată;
   - „Nu ești logat”, cu proba unui cont nou.

   Meniul se deschide deci pe loc; serverul îl întreabă doar panoul contului.
3. **Rândurile** (`randuriMeniuCont`, `src/app/meniuCont.ts`):
   - „Contul meu…” (logat) sau „Intră sau creează cont…” (fără cont) deschide panoul contului de până acum;
   - „Manualul”, cu `F1`;
   - „Trimite o sugestie…”, doar unde stătea și butonul ei (în afara instanței live, fără `?test`);
   - după o linie, „Ieși din cont” (logat).
4. **Ieșirea din meniu** închide contul Firebase prin modulul panoului (adus la cerere, ca reconfirmarea, ca Firebase să nu
   intre în pornire), apoi scoate contul ținut. Fără Firebase (instanța locală), pleacă doar contul ținut. Dacă modulul nu vine
   (fără rețea), se deschide panoul, care spune de ce.
5. **Tastele** sunt ale meniului de clic dreapta, dintr-o singură funcție (`tastaInMeniu`): săgețile, Home și End trec în cerc
   între rânduri, Enter alege. Săgeata în jos pe buton deschide meniul pe primul rând, cea în sus pe ultimul. Escape îl închide
   și întoarce focusul la buton. Îl mai închid un clic în afara lui, Tab, mărimea schimbată a ferestrei și fereastra fără
   focus. Sugestia își deschide fila chiar în clicul pe rând, altfel browserul o blochează.
6. **Extensia barei** pierde „?” și Sugestie; F1 deschide manualul de oriunde, ca până acum. Fără locul lui lângă temă (un
   aranjament fără controlul `cont`), butonul Cont stă la capătul extensiei.
7. **Textele** stau în dicționarul modulului de editare (cel al butonului), nu în cel al panoului, adus la cerere. Planul are aici
   forme scurte („Proba: încă 10 zile”), iar panoul își păstrează frazele lungi.

## Proba

- **Pe hârtie** (`test/unit/meniuCont.test.ts`):
  - rândurile, după cont și sugestie;
  - capul, cu pluralele ambelor limbi, cu proba trecută la data ei sau după zilele offline și cu celelalte planuri;
  - numele și inițialele (o adresă, diacriticele, o literă din afara planului de bază).
- **Poarta manualului:** fiecare rând al meniului are ușa lui, iar capitolul ușii îi spune numele. Un rând nou, fără capitol,
  face proba să cadă.
- **E2e în Edge:**
  - meniul, sub buton, cu capul, rândurile, focusul, tastele și închiderea;
  - logarea, care deschide panoul;
  - cu un cont ținut: inițialele, numele, proba și ieșirea;
  - manualul, CSP-ul, PWA-ul offline și testul pas cu pas, care trec acum prin meniu.
- **Pe emulatoare:**
  - meniul arată planul schimbat pe server, din contul ținut;
  - „Contul meu…” deschide panoul;
  - ieșirea din meniu închide și contul Firebase (panoul redeschis cere logarea);
  - sugestia se trimite din meniu.

## Ce am respins

- **Un meniu cu toate funcțiile contului** (numele, parola), în loc de panou: panoul le are deja, cu erorile lor; meniul doar
  duce la el.
- **„?” și Sugestie păstrate și în bară:** două uși pentru același lucru; F1 rămâne scurtătura manualului.
- **Serverul întrebat la deschiderea meniului:** capul ar sta iar pe „se deschide”; contul ținut ajunge pentru cap.

## Limite

- Capul arată ce știe contul ținut: un plan schimbat pe server apare după reconfirmarea de la pornire sau după „Contul meu…”.
