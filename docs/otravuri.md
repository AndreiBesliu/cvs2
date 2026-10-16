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

Codul se mișcă după campanie, așa că o otravă poate ieși VOID mai târziu: `verifica` o arată, iar lista se reface. Feliile
de dinainte de 2.3c au rulat otrăvurile cu harnașe nesalvate; rezultatele lor sunt în DEVLOG și în fișa etapei.
