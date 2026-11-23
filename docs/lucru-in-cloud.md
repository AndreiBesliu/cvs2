# Lucrul în cloud: o linie pe ramura ei

Din 23.11.2026, liniile proiectului pot lucra în sesiuni cloud (Claude Code pe web), pe repo-ul de pe GitHub, în loc de
worktree-urile de pe calculatorul owner-ului. Regulile rămân cele din `CLAUDE.md`; aici e doar felul de lucru, adică ce
făcea până acum fiecare worktree local, spus pentru un container. Faptele despre mediu sunt din documentația Claude Code
(„Cloud environments”), citită pe 23.11.

## Mediul (o dată, de owner)

Pe claude.ai/code, în ecranul unei sesiuni noi, selectorul de mediu (primul buton de sub caseta mesajului) → **Cloud** →
**New environment**, cu:
- **Network access:** *Limited*, cu **Allow package managers** bifat (lista implicită are npm, Ubuntu, `nodejs.org`,
  `packages.microsoft.com` pentru Edge și GitHub). La **Allowed domains** se adaugă `library.ldraw.org`, pentru uneltele
  LDraw ale pluginului.
- **Setup script:** comanda de mai jos, care găsește repo-ul clonat și rulează `scripts/cloud/pregatire.sh`:

  ```bash
  f=$(find / -maxdepth 6 -path '*/scripts/cloud/pregatire.sh' -not -path '*/node_modules/*' 2>/dev/null | head -1)
  if [ -n "$f" ]; then bash "$f"; else echo "pregatire.sh negăsit"; fi
  ```

  Scriptul rulează ca root, o dată pe mediu (sub vreo 5 minute, rezultatul e păstrat și refolosit). Adaugă la imagine
  (Ubuntu 24.04, Java 21, Python 3, Node 20–22):
  - Node 26 (pus în locul lui 22 în PATH);
  - dependențele;
  - Edge pentru Playwright;
  - firebase-tools 15.18.0.

  Nu iese niciodată cu eroare: ce lipsește se spune la sfârșit, la „LIPSESC”.
- **Environment variables:** `BASH_DEFAULT_TIMEOUT_MS=1800000` și `BASH_MAX_TIMEOUT_MS=1800000` (comenzile lungi, cum sunt
  porțile, până la 30 de minute). Fără secrete: containerul nu are nevoie de ele.
- **GitHub:** aplicația Claude instalată pe repo (<https://github.com/apps/claude>), ca sesiunile să poată împinge ramuri.

## O linie = o sesiune pe ramura ei

- **Ramura:** fiecare linie lucrează pe ramura ei `wip/<felia>-<nume>` (de pildă `wip/3.Tq-elice`). La pornire face
  `git fetch`, `git status`, `git log -5` și citește ultima intrare a liniei în `DEVLOG.md`, apoi continuă de unde a rămas
  ramura. Dacă lipsește `node_modules` sau `package-lock.json` diferă de cel din `main`, rulează întâi `npm ci` (și
  `npm --prefix functions ci`). Dacă `node -v` nu e 26, pregătirea mediului a lipsit: se spune în raport.
- **Cine scrie în `main`:** liniile doar împing ramura lor. În `main` scrie numai sesiunea principală, la unire.
- **`main` adus în ramură:** înaintea documentelor unei felii, linia aduce `origin/main` în ramura ei. O ciocnire doar în
  `DEVLOG.md` se rezolvă cu `python3 -X utf8 scripts/rezolva-devlog.py DEVLOG.md`, care păstrează ambele părți.
- **Containerul se suspendă singur:** după câteva minute fără activitate, iar ce rulează în fundal se poate opri. Comenzile
  lungi (porțile, otrăvurile) se rulează deci în prim-plan, cu limita mare (până la 30 de minute), nu lăsate în fundal cât
  sesiunea își încheie tura.
- **Pauza:** la „pauză”, linia lasă să se termine ce rulează deja, comite tot (ca WIP dacă felia nu e gata), împinge
  ramura și se oprește.

## Porțile: în container, ce atinge felia; întregi, în CI

Containerul are 4 procesoare. Suitele întregi (unitarele, cele aproape 600 de probe e2e, emulatoarele) se lasă deci CI-ului:
- **CI-ul rapid** pornește singur la fiecare push, pe orice ramură, în 6 felii: tipurile, importurile, unitarele, build-ul
  determinist, licențele.
- **CI-ul complet** (e2e cu Edge și emulatoarele) se pornește pe ramura liniei:

  ```bash
  gh workflow run complet.yml --ref <ramura>
  gh run list --workflow complet.yml --branch <ramura> --limit 1   # starea
  gh run view <id> --log-failed                                    # căderile
  ```

În container rulează probele atinse de felie, de pildă `node --test test/unit/<fișier>.test.ts` sau
`npx playwright test test/e2e/<fișier>.spec.ts`, plus tipurile (`npm run typecheck`) și traducerile
(`node scripts/traduceri.ts --verifica`). O probă care pică doar sub încărcare se reia singură, cu fișierul ei, înainte să
fie socotită o cădere. Cifrele (unitarele, e2e-ul, emulatoarele, mărimea pornirii și totalul) intră în raport și în DEVLOG.

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

- **Raportul:** linia raportează felia gata cu ramura și commit-ul (împinse), porțile (cu legăturile rulărilor CI),
  otrăvurile și ce rămâne.
- **Unirea:** sesiunea principală unește într-o ramură `unire-<data>` din `origin/main` și rulează porțile pe unire. Apoi
  scrie decizia în `CLAUDE.md` și face un singur push în `main`.
- **Publicarea pe test:** CI-ul rapid pornește la push. Completul (`complet.yml`) și publicarea (`publica.yml`, cu sha-ul
  fixat) se pornesc ca workflow-uri (`gh workflow run`), după ce rapidul și completul sunt verzi pe același sha. Adresa de
  test își spune apoi sha-ul.
- **Canalele de previzualizare ale liniilor:** `node scripts/publica-canal.ts` cere acreditările Firebase, pe care
  containerul nu le are. În cloud, un canal îl publică sesiunea locală a owner-ului sau un workflow.

## Uneltele mutate în repo

- `scripts/rezolva-devlog.py`: ciocnirile din `DEVLOG.md`, cu ambele părți păstrate.
- `scripts/ldraw/`: pentru pluginul Easy 3Draw.
  - `aduce.py` aduce piesele LDraw (licența CC BY 4.0) în dosarul dat, de pildă `.tmp/ldraw`.
  - `plat.py`, `felie.py`, `felie_axa.py`, `sectiune.py` dau secțiunile.
  - `elice_masura.py` și `elice_desfasurata.py` sunt pentru elice.
  - `randare.mts` dă randarea 3D a unei piese LDraw sau a motorului, cu Edge, prin Playwright.

Biblioteca LDraw nu intră în repo: se aduce la nevoie.
