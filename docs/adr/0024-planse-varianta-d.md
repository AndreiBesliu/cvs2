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
