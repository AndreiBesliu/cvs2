# ADR 0063: Unealta Pen și tipurile nodurilor

**Starea:** acceptat pe 24.10.2026. Cererea owner-ului după felia 6.H↑ („unealta de noduri va trebui sa imprumute de la unealta
Pen, care inca nu exista. nodurile vor avea ori colturi ori vor crea curbe, ori in ambele parti ori doar intr-o singura
parte”). **Intră în:** etapa 6 („Editorul de vectori”), adusă în etapa 3, fără mașină. **Continuă:** ADR 0034 (forma „cale”, cu
cubice), ADR 0051 (uneltele de desen), ADR 0062 (editarea nodurilor).

**Problema.** Unealta Noduri mută, adaugă și scoate noduri, dar nu știe ce fel de nod e unul: o linie nu se putea îndoi într-o
curbă, iar o curbă nu se putea netezi sau rupe. Iar o formă cu curbe se putea doar importa: nicio unealtă nu desena curbe.

## Decizia

**1. Un singur model de nod, comun** (`src/model/noduri.ts`). Un nod e un **colț** (fără mânere) sau face **curbă**: pe
**ambele părți** (mâner înapoi și înainte) sau **pe o parte** (doar înainte, spre segmentul care pleacă, sau doar înapoi, spre
cel care vine). Mânerul e punctul de control al cubicei de pe partea aceea; o linie sau un punct de control lipit de nod = fără
mâner. Tipul se **deduce** din geometrie, nu se ține în document: nicio schemă nouă, nicio migrare; o cale importată are
aceleași tipuri. Un nod cu mânerele pe aceeași dreaptă (la 0,001 rad) e **neted**.

**2. Unealta Pen** (`B`, în bara de sus, după Noduri) pune nodurile pe rând: clic = colț; tragere = curbă pe ambele părți
(mânerul înainte unde e mausul, cel înapoi în oglindă); Shift + tragere = curbă doar înainte; clic pe ultimul nod îi scoate
mânerul de înainte (rămâne doar înapoi), tragerea din el îi pune unul; clic pe primul nod închide calea (cel puțin 3 noduri, sau
2 cu o curbă); Enter sau dublu clic o termină deschisă; Backspace / Delete scoate ultimul nod; Esc renunță. Nodurile se lipesc
(Alt inversează), mânerele nu. Forma pleacă prin acțiunea existentă `document.deseneaza` (originea piesei în primul nod), cu
operația implicită a unei căi. Gestul e al modulului editării (ascultători în captură, ca la Noduri), nu al pânzei: o apăsare cu
Pen-ul nu alege și nu mută; Space + tragere deplasează vederea ca înainte.

**3. Unealta Noduri împrumută tipurile:** nodurile cu curbă sunt rotunde, colțurile pătrate; nodul ales își arată mânerele.
Trei butoane în bara de sus (doar cât Noduri e aleasă) schimbă tipul nodului ales (`schimbaTipNod`):
- **Colț**: scoate mânerele; o cubică rămasă fără ele redevine linie (exact: aceeași dreaptă);
- **Curbă pe ambele părți**: mânerele pe aceeași dreaptă; cele existente își păstrează lungimea, cele noi stau pe bisectoarea
  direcțiilor din nod, cât o treime din coarda segmentului lor;
- **Curbă pe o parte**: păstrează mânerul de înainte, sau pune unul în prelungirea părții celeilalte (linia intră lin în curbă),
  și îl scoate pe celălalt; încă un clic trece curba pe cealaltă parte, pe aceeași dreaptă.
**Tragerea unui mâner** (`mutaManer`): pe un nod neted, mânerul opus se rotește cu el, cu lungimea lui; Alt le desparte; un
mâner adus pe nod dispare. Fiecare schimbare e un pas de anulare, prin `document.forma` (ADR 0053); o cerere care nu schimbă
nimic nu face niciunul.

**4. Arcele nu se aproximează.** Un nod care ar primi un mâner spre un arc (colțurile rotunjite, cercul) refuză, cu motivul în
sfat; Colț merge oricând. La capătul unei căi deschise, „ambele părți” refuză (o singură parte). Ca la ADR 0062: forma nu se
schimbă în tăcere.

**5. Pornirea** nu primește nimic: Pen-ul, butoanele și calculul stau în modulul editării (la cerere); acțiunile sunt cele
existente. Manualul are capitolul „Unealta Pen”, iar „Nodurile” descrie tipurile; tasta B, Enter și Backspace sunt în capitolul
scurtăturilor.

## Respinse

- **Tipul nodului ținut în document** (ca `sodipodi:nodetypes`): cere schema v11 și migrare, iar tipul se citește oricum din
  mânere; un nod „neted” cu mânerele nealiniate n-ar avea sens.
- **Conversia arcelor în cubice** ca să poată primi mânere: aproximare (eroarea cubicei față de cerc), contra regulii că un cerc
  rămâne cerc prin orice operație (BRIEF §16).
- **Alt pentru „pe o parte” la Pen**: Alt inversează deja lipirea în tot editorul; Shift nu avea alt rost în Pen.
- **Esc care termină calea** (în loc să renunțe): în tot editorul, Esc anulează forma începută; terminarea are Enter și dublu clic.

## Se redeschide dacă

- se cer mânerele vecinilor (segmentul întreg, nu doar nodul ales) sau mânerele simetrice ca lungime;
- se cere un nod care face curbă lângă un arc (cu conversia arcului, spusă omului);
- calea Pen-ului trebuie continuată de la un capăt al unei căi existente.
