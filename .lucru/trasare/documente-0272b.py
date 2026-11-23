"""Documentele feliei 25.8↑a, a doua parte: ADR 0272 implementat, indexul ADR, fișa etapei, tabelul de acoperire, CLAUDE.md,
DEVLOG, registrul otrăvurilor. Valorile măsurate vin din argumente (json)."""
import json
import sys

V = json.loads(open(sys.argv[1], encoding='utf-8').read())


def editeaza(p, perechi):
    s = open(p, encoding='utf-8', newline='').read()
    nl = '\r\n' if '\r\n' in s else '\n'
    s = s.replace('\r\n', '\n')
    for a, b in perechi:
        assert s.count(a) == 1, (p, a[:90], s.count(a))
        s = s.replace(a, b)
    open(p, 'w', encoding='utf-8', newline='').write(s.replace('\n', nl))


CANAL = 'https://cncvectorstudio-test--trasare-icw58h57.web.app'

IMPL = f"""
## Implementarea (25.8↑a, 21–22.11)

- **Documentul** (`src/model/document.ts`, `schemaDocument.ts`): `Foaie.imagini?: ImagineFoaie[]`, cu `{{ id, sursa, nume?, x,
  y, latime, inaltime, rotire, opacitate, vizibila, fixata }}`: centrul în mm ai foii, rotirea în grade (trigonometric, ca la
  instanțe), opacitatea în (0, 1]. Plafonul, 100 de imagini pe foaie (`PLAFON.imagini`). Ușa cere amprenta (64 de cifre
  hexazecimale mici), centrul în plafonul pozițiilor, mărimea în plafonul laturii, rotirea în [0, 360) și id-uri unice pe
  foaie. Fără schemă nouă: o versiune care nu știe câmpul îl păstrează necunoscut.
- **Comanda și acțiunea:** `inlocuieste-imagini` (lista întreagă, cu anularea) și `foaie.imagini`, a cărei gardă
  (`imaginiBune`) spune ce spune ușa pe orice listă, și pe valorile care nu sunt numere (o probă le compară în ambele
  direcții).
- **Baza imaginilor** (`src/app/imaginiFoaie.ts`): `cncvs2-imagini`, după amprentă (`pastreaza`, `citeste`). Curățarea
  (`curataLaPornire`) rulează în fila care scrie, la 10 s după pornire. Șterge ce nu folosește nici documentul, nici vreo
  versiune păstrată (citite din textul lor, fără ușă), și a fost pus de cel puțin o zi: plasa celorlalte file. O bază care
  nu există nu se creează.
- **Ce se păstrează** (workerul trasării, `octetiImaginiiFoii`): imaginea din fereastră, cu aceleași prelucrări ca trasarea
  (orientarea paginii PDF, foaia, îndreptarea scanării, reducerea la 16 Mpx), întreagă: zona doar se spune.
  - Un JPEG, PNG sau WebP neprelucrat și nereducut rămâne fișierul lui.
  - Altfel se codează în worker: **JPEG (calitatea 0,92) dintr-un JPEG**, PNG din rest. *Abaterea de la §2* („restul se
    păstrează ca PNG”): o poză prelucrată, ca PNG, ținea de câteva ori mai mult, fără folos pentru un ajutor de desen.
- **Locul** (`asezareInPagina`): imaginea întreagă, așezată în pagina importului ca vectorii trasați din ea (originea e
  colțul stânga-jos al zonei trasate).
  - Cu desenul: în același pas (`comandaImport`, cu `imagineImport`), mutată cu el când e lăsat pe planșă.
  - Singură („Doar imaginea”): lăsată pe planșă, cu centrul în punctul lăsat.
  - Id-ul: `im1`, `im2` …, primul liber.
- **Fereastra:** bifa „Păstrează imaginea pe foaie” (oprită implicit, ținută minte până la reîncărcare), „Doar imaginea” (și
  după un refuz al trasării: o poză cu prea multe contururi se poate pune oricum), starea „Se pregătește imaginea…” și
  motivul unui eșec. Sub 40 rem (telefonul, §9), ascunse; la fel, lista din panou.
- **Pânza** (`src/canvas/lucrator.ts`):
  - Imaginile vizibile ale foii active vin într-un mesaj al lor (`CerereImagini`), cu octeții, doar când se schimbă.
  - Workerul le decodează o dată pe amprentă și le desenează peste foaie, sub vectori, pe un strat al lor. Stratul se
    redesenează doar la schimbarea vederii, a mărimii, a imaginilor sau la o decodare, din treapta redusă potrivită
    (jumătăți, făcute la cerere).
  - Fără octeți (lipsă, ori încă se citesc), locul imaginii, punctat.
- **Panoul foii:** „Imaginile foii” (`src/app/ImaginiFoii.tsx`), sub câmpurile foii: miniatura, numele, ochiul, lacătul,
  coșul și opacitatea, în procente. Octeții lipsă se spun.
- **Mânerele** (`src/app/ManereImagine.tsx`; socoteala, pură, în `manereImagine.ts`), pe o imagine desfăcută, cu unealta
  Selecție sau Transformare:
  - interiorul o mută; colțurile o scalează proporțional (colțul opus pe loc, cel puțin 1 mm); mânerul de deasupra o
    rotește (Shift: 15°);
  - cât se trage, conturul nou și mărimea (ori unghiul); la eliberare, un pas de anulare;
  - *Precizarea la §4:* imaginea stă sub desen, deci pe o linie a desenului apăsarea e a formei, iar înăuntrul formelor, a
    imaginii (`instantaLa` cu `doarContur`). Altfel, conturul trasat al unui chenar ar fi acoperit toată imaginea.
- **Mărimea:** totalul {V['total']} / 800 kB pe arborele unit cu `main` `88be9d6c` (acolo, {V['total_main']}: felia
  +{V['delta']}; estimarea: +6–9), pornirea {V['pornire']} / 115, cu ușa {V['usa']} (+{V['delta_pornire']} față de `main`: legătura pânzei
  cu imaginile, curățarea la pornire și textul acțiunii; estimarea spunea „neschimbată”).
- **Probele:**
  - **Unitare** (`imagini.document`, `imagini.import`, `imagini.manere`, `imagini.foaie`, plus `import.rotire`, `desen`,
    `actiuni.calcul`, `foi.actiuni`): ușa (câmpurile bune și rele, fiecare câmp cerut lipsă, plafonul), jurnalul, acțiunea,
    paritatea gardă / ușă, importul cu imaginea (un pas, mutată cu desenul, comanda ținută fără imagine, plafonul), locul în
    pagină (un pixel cade pe vârful trasat din el, cu zonă și fără), tipurile păstrate, mânerele, curățarea, alegerea doar
    pe contur.
  - **4 e2e** (`imagini-foaie.spec.ts`):
    - importul cu bifa: imaginea sub vectori (roșul estompat, citit din pânză), Ctrl+Z și Ctrl+Shift+Z, bifa ținută minte,
      reîncărcarea, miniatura;
    - „Doar imaginea” după un refuz, lăsată pe planșă; ochiul, opacitatea, lacătul; mutarea, rotirea cu Shift, scalarea,
      fiecare cu anularea ei; ștergerea;
    - o scanare îndreptată, păstrată îndreptată (JPEG, octeții cu mărimea spusă);
    - o poză de 16,8 Mpx, păstrată redusă.
- **Otrăvurile** (`test/otravuri/25.8a.py`): 43 / 43 (27 unitare, 16 prin e2e). La prima rulare, M06 („vizibilă” făcută
  opțională) a scăpat: probele refuzau „vizibilă” scrisă ca șir, nu și lipsa ei. Acum, fiecare câmp cerut, lipsă.
- **Nerulat:** curățarea fără documentul de acum (cere IndexedDB și ceasul: o zi).
"""

editeaza('docs/adr/0272-imaginile-pe-foaie.md', [
    ("""cu schiță)?”). Feliile 25.8↑a și 25.8↑b, fără mașină, în linia trasării (worktree-ul `trasare`, ramura
`wip/25.1-trasare`).""", """cu schiță)?”). Feliile 25.8↑a și 25.8↑b, fără mașină, în linia trasării (worktree-ul `trasare`, ramura
`wip/25.1-trasare`). **25.8↑a implementată** pe 22.11 (mai jos, „Implementarea”); 25.8↑b („Calibrează”, „Trasează…”), la
cuvântul owner-ului."""),
])
# Secțiunea implementării, înaintea întrebărilor.
p = 'docs/adr/0272-imaginile-pe-foaie.md'
s = open(p, encoding='utf-8', newline='').read()
nl = '\r\n' if '\r\n' in s else '\n'
s = s.replace('\r\n', '\n')
a = '\n## Întrebările (răspunsurile: „Da, 1a–3a”)'
assert s.count(a) == 1
s = s.replace(a, IMPL + a)
open(p, 'w', encoding='utf-8', newline='').write(s.replace('\n', nl))
print('gata (ADR)')
