# ADR 0024 — Planșele: varianta D (piese cu arbore, instanțe pe foi)

**Starea:** acceptat pe 08.10.2026, de owner („D, ok la toate”). **Intră în:** etapa 1, felia 1.7 (documentul v2).

**Problema.** Schema planșelor se îngheață în etapa 1 (`BRIEF.md` §9). A (planșa e pânza, un singur arbore) și D (piese
cu arbore propriu, puse ca instanțe pe foi) dau documente diferite. Owner-ul a încercat prototipul pe 07.10.

**Decizia: D**, cu cele trei alegeri ale prototipului (`docs/faza2/prototip-planse/RAPORT.md` §5):
1. **Piesă e orice lucru pus pe foaie.** În spate, fiecare e o piesă cu o singură instanță. Nivelul doi (lista de piese)
   rămâne ascuns până îl ceri cu «Încă…», «Din CSV…» sau «+1» (etapa 11).
2. **Ctrl+D face o copie separată:** o piesă nouă, cu id nou și cu o copie a arborelui, plus instanța ei. Nodurile își
   păstrează id-urile, fiindcă sunt unice doar în piesă. Copia stă imediat după original, decalată cu 20 mm la dreapta
   și 20 mm în jos. Copiile legate le face doar «Încă…».
3. **Mânerele unei instanțe cu surori schimbă piesa**, deci toate instanțele, cu banda „se schimbă toate cele N” (vin cu
   unealta de transformare, etapa 6).

Plus, tot „ok”: confirmarea la export se cere când discul frezei trece de marginea foii (felia 1.10); adâncimea e cel
mult grosimea foii.

**Contractul documentului v2** (`schema: 2`). Îl citesc și aplicația, și oracolul independent; nimic de aici nu se
schimbă fără un ADR nou.
- `Document { schema: 2, rev, piese: Piesa[], foi: Foaie[] }`; cel puțin o foaie.
- `Piesa { id, nume?, radacina: Nod }`.
- `Nod = Grup { tip: 'grup', id, nume?, matrice, copii: Nod[] } | Element { tip: 'element', id, nume?, forma, matrice }`.
  Forma și matricea sunt cele din v1 (`dreptunghi` cu colțul stânga-jos în origine, `cerc` cu centrul în origine).
- `Foaie { id, nume?, stoc: { latime, inaltime, grosime }, instante: Instanta[] }`.
- `Instanta { id, piesa, x, y, rotire, campuri? }`: `piesa` e id-ul unei piese existente, `rotire` e în grade, în
  [0, 360), iar `campuri` e un dicționar text → text.
- **Id-urile:** `^[A-Za-z0-9_-]+$`, 1–64 de caractere. Unice între piese, între foi, între instanțele tuturor foilor și
  între nodurile aceleiași piese. Piesele și instanțele au spații de nume separate.
- **Plafoanele:** latura și razele ≤ 10 000 mm, grosimea ≤ 1 000 mm, cel mult 100 000 de noduri și 100 000 de
  instanțe, 1 000 de foi, adâncimea arborelui ≤ 32.
- **Matricea instanței** = `translatie(x, y) ∘ rotatie(rotire)`, cu sinusul și cosinusul exacte la multiplii de 90°.
- **Matricea în lume a unui element** = instanța ∘ grupurile de pe drum, de la rădăcină în jos ∘ elementul.
- **Elementele în lume** ale unei foi: instanțele în ordinea foii; în fiecare piesă, elementele în preordine
  (grupurile nu desenează nimic). Id-ul în lume e `<id instanță>/<id element>`.
- **Migrarea v1 → v2** (pură, deterministă):
  - foaia v1 devine `foi[0]` cu `id: 'f1'`; câmpurile ei necunoscute merg pe `stoc`;
  - fiecare element v1 `e`, în ordine, dă o piesă și o instanță, ambele cu id-ul `e.id`:
    - piesa: `{ id: e.id, nume: e.nume (dacă există), radacina: { tip: 'element', id: e.id, forma, matrice: {a, b, c,
      d, e: 0, f: 0}, …câmpurile necunoscute ale lui e } }`;
    - instanța: `{ id: e.id, piesa: e.id, x: e.matrice.e, y: e.matrice.f, rotire: 0 }`;
  - câmpurile necunoscute de pe primul nivel rămân, iar `rev` se păstrează;
  - geometria se păstrează exact: matricea în lume a lui `e.id/e.id` e numeric egală (`===`) cu matricea v1 a lui `e`.
- **Ștergerea ultimei instanțe a unei piese șterge și piesa**, în aceeași comandă, cât timp nivelul doi e ascuns.
- **Un câmp nou cu sens** (de exemplu fața de jos, montajele, sculele) **intră doar cu o schemă nouă și o migrare.**
  Câmpurile necunoscute se păstrează, dar o versiune mai veche nu trebuie să taie fără să înțeleagă un câmp.

**Precizările contractului** (08.10, în aceeași felie, după întrebările oracolului independent și înainte de încheierea
feliei; ele fac parte din contract):
1. **Adâncimea** se numără în niveluri, cu rădăcina pe nivelul 1: 32 de niveluri trec, 33 nu.
2. **Plafoanele de noduri și de instanțe** sunt totaluri pe document; grupurile se numără ca noduri.
3. **Compunerea** se face de sus în jos: `M = matricea instanței`, apoi, pentru fiecare nod de pe drum, `M = M ∘ nod`
   (`compune(M, nod)`). Rotirea care nu e multiplu de 90° folosește `cos(r·π/180)` și `sin(r·π/180)`, cu `r` adus în
   [0, 360).
4. **Mărimile** sunt strict pozitive (laturile, raza, stocul), iar `razaColt` ≥ 0, ca în v1, și cel mult jumătate din
   latura mai mică a dreptunghiului. `rev` e un întreg sigur (0 … `Number.MAX_SAFE_INTEGER`). `nume` are cel mult 200 de
   caractere; `campuri` are cel mult 200 de chei, fiecare cheie cel mult 200 de caractere, fiecare valoare cel mult
   10 000.
5. **Lumea e mărginită**, ca nimic să nu ajungă Infinity sau NaN pe pânză ori în CAM:
   - matricea compusă a fiecărui nod față de rădăcina piesei are toți coeficienții finiți, `|a|, |b|, |c|, |d|` ≤ 10 000
     și `|e|, |f|` ≤ 10 000 000 mm;
   - `|x|, |y|` ale instanței ≤ 10 000 000 mm;
   - elementele în lume ale tuturor foilor (instanțele înmulțite cu elementele pieselor lor) sunt cel mult 100 000,
     cât era plafonul de elemente din v1: pânza, CAM-ul, avertismentele și lista sunt liniare în ele;
   - o formă cu arce (cercul, dreptunghiul rotunjit) stă doar sub o matrice compusă care e similitudine (rotire, scalare
     uniformă, eventual oglindire), cu toleranța 1e-12 relativă la scară. Elipsa (ADR 0002) intră mai târziu, cu o
     schemă nouă;
   - tot JSON-ul documentului, cu câmpurile necunoscute, are cel mult 200 de niveluri de imbricare.

   Un document v1 cu valori peste aceste margini e refuzat la migrare, cu motivul, nu tăiat. Comenzile aplicației nu
   pot produce un document peste plafoane: o acțiune care l-ar trece e inactivă, cu motivul ei.
6. **Migrarea păstrează și câmpurile necunoscute ale matricei** (`matrice: { …matricea v1, e: 0, f: 0 }`).
7. **Ciocnirile de nume în migrare se refuză, cu motiv:** un document v1 cu un câmp de sus numit `piese` sau `foi`, sau
   cu un element care are un câmp `tip`, nu se poate migra fără să-l piardă. Un câmp necunoscut `copii` pe un element
   rămâne doar un câmp (nu e arbore).
8. **Lucrurile goale sunt valide:** un grup fără copii, o foaie fără instanțe, o piesă fără instanțe. Regula „ștergerea
   ultimei instanțe ia și piesa” e a comenzilor, nu a ușii.
9. **Cheile `__proto__`, `constructor` și `prototype`** (câmpuri necunoscute, chei din `campuri`) se păstrează ca date:
   ușa întoarce o copie a documentului validat, nu ieșirea validatorului, care le-ar scoate tăcut.
10. **Un document v2 valid trece prin ușă neschimbat**, fără valori implicite adăugate; JSON-ul canonic scrie −0 ca `0`.

**Dovada:**
- [măsurat, prototipul] Scenariul 5 cere 6 gesturi în D și 26 în A, iar scenariul 7 cere 9 în D și 39 în A. În A, spatele
  rămânea decalat cu 50 mm, fără avertisment. La 12 suporturi, D ține 2 noduri, iar A 24.
- [citit, notițele owner-ului din 07.10] La scenariul 5 a scris „da e clar”, iar la 7 „ori D, ori legate în oglindă în A”.

**Ce am respins:** A (`PLAN.md` §5.7).

**Ce impune:**
- etapa 11 primește instanțele legate și «Desprinde»;
- etapa 23 primește fața de jos a foii;
- exportul cu vectori reali poate scrie instanțele ca `BLOCK` / `INSERT` (etapa 9).

**Se redeschide dacă:** owner-ul o cere după ce lucrează cu foile reale (etapa 11). Până la etapa 3 nu există date pe
live, deci o întoarcere ar costa ~2 felii de migrare (`PLAN.md` §5.7).
