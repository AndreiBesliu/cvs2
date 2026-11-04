# ADR 0165: planificatorul în engleză, după limba lui cvs2

**Starea:** acceptat pe 04.11.2026 pentru felia 3.Te, a liniei Trenuleț (worktree-ul `wip/trenulet`). Owner-ul: „Engleza” (la
„Care felie urmează: B, schimbul de forme între cvs2 și plugin, sau engleza pluginului?”), după 3.Xd.

## Contextul

Planificatorul era doar în română: textele stau scrise în cod, în ~5 500 de linii (planul 2D, exportul CNC cu README-ul
arhivei, atelierul 3D, mesajele motoarelor), plus marcajul din `body.html`. Interfața se face o singură dată, la pornire, într-un
`init` mare, iar cvs2 își poate schimba limba oricând (RO / EN, în bara de sus); cadrul primea deja limba, dar pagina n-o folosea.

## Decizia

### A. Româna rămâne în cod; engleza vine dintr-un dicționar

`planificator/limba.ts`, primul script al paginii, dă limba (în cvs2, a lui; singură, pe claude.ai sau în copia de pe
calculator, română) și traducerea. Dicționarul (`planificator/texte.en.json`, cheia e textul românesc, normalizat) stă doar în
pachetul extensiei; intrarea îl aduce, înaintea scripturilor, doar când cvs2 e în engleză. Pagina de sine stătătoare nu-l are.
Ce nu are intrare rămâne românesc. Două căi:

- **`tr`**, în cod, pentru textele cu valori (un șablon `` tr`Am pus: ${x}.` ``; cheia are {0}, {1}… în locul valorilor, iar
  traducerea le poate muta) și pentru cele care nu ajung pe pagină (README-urile arhivelor, mesajele motoarelor, avertismentele
  lipite cu `join`). Un cuvânt cu două sensuri primește un context (`tr("placă", "pat")`: în engleză se caută întâi
  „placă@pat”), ca placa de lemn (board) să nu se confunde cu patul imprimantei (bed) sau cu placa LEGO (plate), ori știftul
  LEGO (stud) cu cel Technic (pin).
- **Pe pagină**, pentru textele fixe: în engleză, `Limba.urmareste` traduce, întregi, nodurile de text și atributele `title`,
  `aria-label`, `placeholder`, `alt`, la pornire și la fiecare schimbare (`MutationObserver`). Așa se traduc și etichetele
  care sunt și valori în cod („dreapta”, „La comandă”), fără să atingă logica. În română nu se observă nimic.

Numerele cu zecimale și data urmează limba (virgulă și `ro-RO`, punct și `en-GB`). O eroare a motorului recunoscută până acum
după textul ei („Piesa … nu încape pe placă”) poartă piesa ca proprietate.

### B. Ce rămâne românesc

Comentariile din G-code (ca în exportul lui cvs2), numele de fișiere și antetele STL, numele produsului și ale controlerelor,
cheile din cod și erorile „de neajuns” (pentru noi, nu pentru om), toate numite în `scripts/texte-trenulet.ts`.

### C. O limbă nouă: repornirea, fără pierderi

Limba paginii e fixă cât trăiește cadrul. La o limbă nouă în cvs2, intrarea pornește salvările amânate (ADR 0164), le așteaptă,
apoi cere repornirea: `host.reporneste()`, membru nou al `HostApi` v1. cvs2 reface cadrul cu contextul de acum, cel mult o dată
la 2 s; o cerere mai devreme așteaptă până trec cele 2 s, iar cererile de până atunci se adună în ea, cu un singur
temporizator (o extensie care s-ar reporni în buclă nu încarcă aplicația). Închiderea extensiei (sau alta deschisă) anulează
repornirea amânată. Logica stă în `src/extensii/repornire.ts`, fără React, probată pe un ceas fals. Textul încărcătorului s-a
schimbat, deci și amprenta lui din CSP, pe mecanismul din ADR 0127; politica CSP e aceeași.

### D. Uneltele și probele

`scripts/texte-trenulet.ts` găsește în surse ce trebuie tradus (cheile lui `tr`, marcajul, textele fixe care ajung pe pagină)
și pune cheile noi în dicționar; `trenulet.engleza.test.ts` cere ca fiecare să aibă traducere, fără intrări rămase fără
folos, cu aceleași {0}, {1}…, fără litere românești; a doua plasă, fără parser, cere pentru fiecare `tr("cuvânt",
"context")` din surse cheia „cuvânt@context”. Proba e2e în engleză deschide fiecare ecran (planul, circuitele, exportul,
fiecare fel de piesă din atelier) și caută româna rămasă și zecimalele cu virgulă; descarcă și arhiva CNC, cu README-ul ei
(numele, data), și citește eroarea unei plăci prea mici.

## Ce am respins

- **Traducerea pe loc, fără repornire:** interfața se face o dată, în multe locuri; refăcută doar în parte, ar fi lăsat
  texte vechi. Repornirea, după salvări, e la fel de sigură și se vede o clipă.
- **`tr` pe fiecare text din cod (~1 000 de locuri):** cuvintele care sunt și chei („dreapta”) nu se pot traduce în cod fără
  să strice logica; textele fixe se traduc unde ajung, pe pagină.
- **Dicționarul în pagina de sine stătătoare:** acolo rămâne româna (pagina de pe claude.ai e a owner-ului); ar fi crescut
  cu ~100 kB degeaba.
- **Refuzul unei reporniri prea dese:** o schimbare legitimă RO → EN → RO, făcută repede, ar fi lăsat extensia în limba greșită.

## Limite

- Engleza e a autorului feliei; owner-ul o poate corecta direct în `texte.en.json` (unealta păstrează traducerile).
- Un text nou în cod cere intrarea lui: proba unitară cade până o primește. Un text compus la rulare dintr-o valoare care nu
  trece prin `tr` rămâne românesc; proba e2e caută pe ecranele principale, nu în toate mesajele rare.
- Pachetul crește la ~414 kB (+42 kB, dicționarul).
