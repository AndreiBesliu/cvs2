# Lucrul în cloud: o linie pe ramura ei

Din 23.11.2026, liniile proiectului pot lucra în sesiuni cloud (Claude Code pe web), pe repo-ul de pe GitHub, în loc de
worktree-urile de pe calculatorul owner-ului. Regulile rămân cele din `CLAUDE.md`; aici e doar felul de lucru, adică ce
făcea până acum fiecare worktree local, spus pentru un container.

## Mediul

Un mediu cloud pentru `AndreiBesliu/cvs2`, cu scriptul de pregătire `bash scripts/cloud/pregatire.sh`. Scriptul instalează
aceleași unelte ca CI-ul: Node 26, dependențele, Edge pentru Playwright, Java 21 și firebase-tools 15.18.0 pentru emulatoare,
Python 3. Accesul la rețea trebuie să lase instalările:
- npm;
- descărcarea lui Edge (Microsoft);
- pachetele Ubuntu;
- nodejs.org și GitHub;
- `library.ldraw.org`, pentru uneltele LDraw ale pluginului.

Containerul nu are secrete și nu are nevoie de ele.

## O linie = o sesiune pe ramura ei

- **Ramura:** fiecare linie lucrează pe ramura ei `wip/<felia>-<nume>` (de pildă `wip/3.Tq-elice`). La pornire face
  `git fetch`, `git status`, `git log -5` și citește ultima intrare a liniei în `DEVLOG.md`, apoi continuă de unde a rămas
  ramura.
- **Cine scrie în `main`:** liniile doar împing ramura lor. În `main` scrie numai sesiunea principală, la unire.
- **`main` adus în ramură:** înaintea documentelor unei felii, linia aduce `origin/main` în ramura ei. O ciocnire doar în
  `DEVLOG.md` se rezolvă cu `python3 -X utf8 scripts/rezolva-devlog.py DEVLOG.md`, care păstrează ambele părți.
- **Pauza:** la „pauză”, linia lasă să se termine ce rulează deja, comite tot (ca WIP dacă felia nu e gata), împinge
  ramura și se oprește.

## Porțile (ca în CI)

```bash
npm run rapid                          # tipurile, importurile, unitarele, build-ul determinist, licențele
npm run build && npm run e2e           # Playwright, cu Edge
npm run test:emulator                  # funcțiile și paginile pe emulatoarele Firebase
node scripts/traduceri.ts --verifica   # roadmap-ul în engleză
```

O probă care pică doar sub încărcare se reia singură, cu fișierul ei, înainte să fie socotită o cădere. Un fișier
Playwright în mod serial sare restul probelor după o cădere, așa că se reia fișierul întreg. Cifrele (unitarele, e2e-ul,
emulatoarele, mărimea pornirii și totalul) intră în raport și în DEVLOG.

## Otrăvurile

Otrăvurile (mutațiile țintite, `docs/otravuri.md`) se rulează într-o clonă, niciodată pe arborele de lucru:

```bash
git clone --branch <ramura> . /tmp/otravuri-<felia>
cd /tmp/otravuri-<felia> && npm ci && npm --prefix functions ci
python3 -X utf8 scripts/otravuri.py test/otravuri/<felia>.py baza <seturile>
python3 -X utf8 scripts/otravuri.py test/otravuri/<felia>.py lot 0 <N>
```

După fiecare felie, se rulează `verifica` pe toate listele zonei atinse. Un VOID nou (`vechi` nu mai apare exact o dată)
se mută pe codul nou sau se scoate împreună cu codul echivalent.

## Documentele unei felii

- **ADR-ul:** propus, cu schița și întrebările, apoi acceptat cu răspunsurile; apoi „implementat”, cu cifrele.
- **Fișa etapei** (`docs/etape/`), cu rândul feliei și coada owner-ului.
- **Registrul otrăvurilor:** `docs/otravuri.md`.
- **`DEVLOG.md`:** Started / Completed, promptul exact, modelul, porțile, otrăvurile.
- **Traducerile roadmap-ului:** `node scripts/traduceri.ts`, apoi completarea textelor noi.
- **`CLAUDE.md`:** deciziile le scrie sesiunea principală, la unire.

## Unirea și publicarea

- **Raportul:** linia raportează felia gata cu ramura și commit-ul (împinse), porțile, otrăvurile și ce rămâne.
- **Unirea:** sesiunea principală unește într-o ramură `unire-<data>` din `origin/main` și rulează porțile pe unire. Apoi
  scrie decizia în `CLAUDE.md` și face un singur push în `main`.
- **Publicarea pe test:** CI-ul rapid pornește la push. Completul (`complet.yml`) și publicarea (`publica.yml`, cu sha-ul
  fixat) se pornesc ca workflow-uri, după ce rapidul și completul sunt verzi pe același sha. Adresa de test își spune apoi
  sha-ul.
- **Canalele de previzualizare ale liniilor:** `node scripts/publica-canal.ts` cere acreditările Firebase, pe care
  containerul nu le are. În cloud, un canal îl publică sesiunea locală a owner-ului sau un workflow.

## Uneltele mutate în repo

- `scripts/rezolva-devlog.py`: ciocnirile din `DEVLOG.md`, cu ambele părți păstrate.
- `scripts/ldraw/`: pentru pluginul Easy 3Draw.
  - `aduce.py` aduce piesele LDraw (licența CC BY 4.0) în dosarul dat, de pildă `.tmp/ldraw`.
  - `plat.py`, `felie.py`, `felie_axa.py`, `sectiune.py` dau secțiunile.
  - `elice_masura.py` și `elice_desfasurata.py` sunt pentru elice.
  - `randare.mts` dă randarea 3D a unei piese LDraw sau a motorului.

Biblioteca LDraw nu intră în repo: se aduce la nevoie.
