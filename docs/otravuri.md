# Otrăvurile: unealta și listele

O otravă e o schimbare mică și plauzibilă în cod (un operator, o comparație, o ramură scoasă, o constantă). Întrebarea pe
care o pune este dacă testele observă schimbarea. Una care scapă e fie o gaură în teste, fie o schimbare echivalentă,
dovedită. Planul cere otrăvuri țintite pe modulele critice, alese de o **sesiune independentă** (`PLAN.md` §4, articolul
I18).

## Unealta

`scripts/otravuri.py` primește o listă și o comandă (lista e un fișier Python cu `O`, `SETURI` și, opțional, `E2E`;
formatul e în antetul uneltei):

```
python scripts/otravuri.py LISTA verifica               # VOID-urile, fără să ruleze nimic
python scripts/otravuri.py LISTA baza SET [SET ...]     # seturile fără otravă: verzi întâi
python scripts/otravuri.py LISTA lot START END          # fiecare otravă pe setul ei
python scripts/otravuri.py LISTA doua ID [ID ...]       # a doua șansă, pe setul „2” (zona modulului)
python scripts/otravuri.py LISTA plin ID [ID ...]       # toată suita unitară (~11 min pe otravă)
python scripts/otravuri.py LISTA tinte FISIER ID [...]  # un fișier de test: proba testului nou al unei otrăvi scăpate
python scripts/otravuri.py LISTA e2e ID [ID ...]        # build + spec-urile E2E ale listei
```

Comenzile rulează cu `PYTHONIOENCODING=utf-8`, iar jurnalul se adaugă la `.tmp/otravuri.log`.

## Reguli, învățate pe pielea noastră

- **Într-o clonă, în afara Drive-ului.** Drive-ul a înviat mutații deja restaurate, și în alte proiecte, ore mai târziu.
  Unealta refuză să ruleze în dosarul sincronizat. Pașii:

  ```
  git clone --no-hardlinks <repo> <scratchpad>/clona-otravuri
  ```

  Apoi `node_modules` se mută sau se leagă cu o joncțiune.
- **Serial, mereu.** Copiile paralele pică din lipsă de memorie și pe testele de timp, chiar fără otravă. O „prinsă” dintr-o
  copie cu baza roșie nu contează.
- **Baza întâi.** Fiecare set trebuie să fie verde fără otravă (`baza`), altfel verdictele lui nu înseamnă nimic.
- **Restaurarea se verifică:**
  - după fiecare otravă, cu sha256;
  - la capătul comenzii, fiecare fișier atins trebuie să fie identic cu HEAD (`git hash-object`), altfel unealta scrie
    ARBORE MURDAR și iese cu codul 2.
- **O otravă scăpată** primește un test țintit, care trece pe codul curat și pică cu otrava ei (`tinte`). Altfel primește un
  argument de echivalență, cu dovada scrisă în DEVLOG.
- **Interfața în e2e:** un efect trecător se prinde pe efectul sincron. De exemplu, un dialog încărcat la cerere nu apucă
  să apară, dar aplicația devine `inert` din primul cadru.
- **Clona veche** poate avea depozitul git stricat după un `pull`. Nu o repara, fă alta.

## Listele

| Lista | Zona | Rezultatul |
|---|---|---|
| `test/otravuri/2.3c-a.py` | offsetul deschis, tăietura pe o parte, CAM-ul căilor deschise | 70: 50 prinse, 20 scăpate → 18 teste, 2 echivalente |
| `test/otravuri/2.3c-b.py` | ușa SVG, documentul v10, aplicația, desenul, interfața (e2e) | 45: 36 prinse, 9 scăpate (+1 indirect) → 10 teste |
| `test/otravuri/timp.py` | estimarea timpului (ADR 0046): planificatorul, arcele, sincronizările, `$$`, secțiunile, rezumatul; alese de autor | 38: 37 prinse, 1 scăpată → 1 test (plus o gardă); pe codul final 48 / 48 |
| `test/otravuri/9.5.py` | ușa EPS și AI ≤ 8 (ADR 0115): lexicul, antetul, interpretorul, imaginile sărite, operatorii AI, ușa după antet; alese de autor | 59: 58 prinse, 1 echivalentă pe corpus → 1 test; plus 3 de interfață, prin e2e pe portul 4175 (în afara listei), prinse |
| `test/otravuri/26.A.py` | ușa WMF (ADR 0117): unitățile, axa Y, PolyPolygon, maparea (fereastra, vizorul, ISOTROPIC, SaveDC / RestoreDC), sensul arcelor, tabelul obiectelor, ce se sare, ușa după antet; alese de autor | 56: 51 prinse, 5 scăpate → 5 teste (formele nevăzute cu numărul punctelor greșit, ISOTROPIC fără extinderi, cadrul decalat fără fereastra fișierului, o înregistrare fără parametri de 2 cuvinte); plus 3 de interfață (E01–E03, din listă), prin e2e pe portul 4177, rulate fără `npx`, prinse |
| `test/otravuri/3.S.py` | primirea lucrărilor (ADR 0126): forma și limitele protocolului, fereastra care a deschis fila, verificarea ca un fișier străin, răspunsurile; legarea în aplicație (live, ancora fără fereastră, dialogul modal, înlocuirea, panoul, alegerea fișierului, Escape); alese de autor | 28: 28 prinse (P01–P20 unitare; E01–E08 prin e2e pe portul 4176, cu build-ul și Playwright pornite cu node, `.tmp/otravuri-local.py`, neversionat); trei probe e2e scrise înaintea rulării, pentru E01, E03 și E06; 3 lăsate afară ca echivalente (în listă) |
| `test/otravuri/3.Xa.py` | gazda extensiilor (ADR 0127): manifestul, căile, intrarea, permisiunile, fișierele în ambele sensuri, amprentele; cititorul `.zip` (CRC, criptarea, metodele, ZIP64, limitele, dosarele); CSP-ul și încărcătorul; cadrul (sandbox-ul, serviciile refuzate) și legarea în aplicație (acțiunile documentului, fereastra inertă, pânza ascunsă, linkul, tema); alese de autor | 32: 31 prinse la prima rulare; E03 (paza din `ruleazaDocument`) scăpată, fiindcă proba trecea doar prin paletă → proba alegerii din lista vectorilor cu spațiul deschis, apoi prinsă; P01–C03 unitare, E01–E09 prin e2e pe portul 4176 (`.tmp/otravuri-local.py`); 2 lăsate afară ca echivalente (în listă) |
| `test/otravuri/3.Xb.py` | stocarea extensiilor (ADR 0128): permisiunea, cheile, valorile JSON și octeții, plafoanele, valoarea înlocuită, cheile citite; catalogul și încărcătorul; legarea (cererea din cadru, ștergerea datelor la scoatere, fereastra instalării, gestionarea); alese de autor | 18: 18 prinse (S01–L01 unitare, E01–E04 prin e2e pe portul 4176); 3 lăsate afară ca echivalente și una nerulată (în listă) |
| `test/otravuri/3.Ta.py` | Planificatorul Trenuleț ca extensie (ADR 0129): serviciul descărcărilor (permisiunea, metoda, numele curățat, lista albă, datele, plafonul, răspunsul); catalogul; construcția fără Python (`repr`, JSON-ul ca `json.dumps`, catalogul, licențele, pachetul, ordinea scripturilor); adaptoarele din cadru (`db`, `downloads`, `localStorage`, atributele `style`) și legarea în cvs2 (cererea, numele descărcării); alese de autor | 47: 47 prinse (D01–A09 unitare, E01–E10 prin e2e pe portul 4176); A05 și A07 scăpaseră întâi, prinse după două probe noi; 3 lăsate afară ca echivalente (în listă) |

Codul se mișcă după campanie, așa că o otravă poate ieși VOID mai târziu: `verifica` o arată, iar lista se reface. Feliile
de dinainte de 2.3c au rulat otrăvurile cu harnașe nesalvate; rezultatele lor sunt în DEVLOG și în fișa etapei.
