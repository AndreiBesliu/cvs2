# Lucrul în cloud: o linie pe ramura ei

Din 23.11.2026, tot lucrul la cncvs2 se face în sesiuni cloud (Claude Code pe web), pe repo-ul de pe GitHub: liniile și
sesiunea principală, cea care unește și publică. Calculatorul owner-ului doar își sincronizează folderul din GitHub. Regulile
rămân cele din `CLAUDE.md`; aici e doar felul de lucru, adică ce făcea până acum fiecare worktree local, spus pentru un
container. Faptele despre mediu sunt din documentația Claude Code („Cloud environments”), citită pe 23.11.

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

Sesiunile le pornește owner-ul, pe claude.ai/code: mediul, repo-ul `AndreiBesliu/cvs2`, ramura, apoi brief-ul liniei ca
prim mesaj. O sesiune cloud nu poate porni alte sesiuni și nu trimite note altora: legătura dintre ele e GitHub (ramurile,
PR-urile, rulările CI).

## O linie = o sesiune pe ramura ei

- **Ramura și nota:** fiecare linie lucrează pe ramura ei `wip/<felia>-<nume>` (de pildă `wip/3.Tq-elice`) și își ține
  nota în `docs/linii/<linie>.md` (indexul: `docs/linii/README.md`). La pornire face `git fetch`, `git status`,
  `git log -5`, citește nota liniei și ultima ei intrare în `DEVLOG.md`, apoi continuă de unde a rămas ramura. Dacă lipsește `node_modules` sau `package-lock.json` diferă de cel din `main`, rulează întâi `npm ci` (și
  `npm --prefix functions ci`). Dacă `node -v` nu e 26, pregătirea mediului a lipsit: se spune în raport.
- **Cine scrie în `main`:** liniile doar împing ramura lor. În `main` scrie numai sesiunea principală, la unire.
- **`main` adus în ramură:** înaintea documentelor unei felii, linia aduce `origin/main` în ramura ei. O ciocnire doar în
  `DEVLOG.md` se rezolvă cu `python3 -X utf8 scripts/rezolva-devlog.py DEVLOG.md`, care păstrează ambele părți.
- **Containerul se suspendă singur:** după câteva minute fără activitate, iar ce rulează în fundal se poate opri. Comenzile
  lungi (porțile, otrăvurile) se rulează deci în prim-plan, cu limita mare (până la 30 de minute), nu lăsate în fundal cât
  sesiunea își încheie tura.
- **Pauza:** la „pauză”, linia lasă să se termine ce rulează deja, comite tot (ca WIP dacă felia nu e gata), împinge
  ramura și se oprește.
- **Setul de lucru adus din `.tmp`** (`.lucru/<linie>/`, la liniile mutate pe 23.11 cu o felie în lucru): ciornele,
  scripturile și mesajele pregătite pe calculatorul local, cu un README. Ce trebuie din el intră la locul lui; dosarul
  `.lucru/` se scoate înainte de raportul „gata de unit”. Ciornele noi stau în `/tmp` sau în `.tmp/` (ignorat), nu în repo.

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

`gh` merge prin API-ul REST (GraphQL e oprit în container): `gh run` și `gh workflow` merg, `gh pr` nu. Pentru PR-uri se
folosește `gh api` (mai jos).

În container rulează probele atinse de felie, de pildă `node --test test/unit/<fișier>.test.ts` sau, după `npm run build`,
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
- **Nota liniei** (`docs/linii/<linie>.md`): starea, deciziile owner-ului, capcanele găsite, ce rămâne; la zi cu fiecare
  felie. Repo-ul e public: fără secrete, fără găurile aplicației vechi, fără alte proiecte.
- **Traducerile roadmap-ului:** `node scripts/traduceri.ts`, apoi completarea textelor noi.
- **`CLAUDE.md`:** deciziile le scrie sesiunea principală, la unire.

## Felia gata: raportul și PR-ul

Felia e gata de unit cu rapidul și completul verzi pe commit-ul final al ramurii. Linia raportează atunci în chat (ramura și
commit-ul, porțile cu legăturile rulărilor CI, otrăvurile, ce rămâne) și deschide un PR spre `main`, cu același raport, ca
sesiunea principală să-l găsească fără ca owner-ul să-l poarte între sesiuni:

```bash
gh api repos/AndreiBesliu/cvs2/pulls -f head=<ramura> -f base=main -f title="<felia>: <ce face>" -f body="<raportul>"
```

Repo-ul e public, deci și PR-ul: același ecran ca la commit-uri (niciun secret, nimic despre găurile aplicației vechi încă
live). Linia nu unește singură PR-ul. Dacă mai lucrează pe ramură după raport, PR-ul se actualizează singur la push.

## Canalele de previzualizare

Un canal al instanței de test (adresa principală neatinsă, 30 de zile) se publică din GitHub Actions, cu identitatea WIF a
testului, pentru orice ramură cu rapidul verde:

```bash
gh workflow run canal.yml --ref main -f ramura=<ramura> -f canal=<canal>
gh run list --workflow canal.yml --limit 1          # adresa canalului e în jurnalul rulării
```

Owner-ul primește LINK-ul canalului când adresa principală a testului e ocupată de altă felie.

## Sesiunea principală în cloud

Sesiunea principală ține registrul liniilor (rândurile de stare din `CLAUDE.md` și `docs/linii/README.md`), unește
feliile gata și publică pe test; nota ei, cu felul de lucru al owner-ului, e `docs/linii/principala.md`. Lucrează în
containerul ei, ca o linie, dar pe ramuri `unire-<data>`:

1. **PR-urile gata:** `gh api repos/AndreiBesliu/cvs2/pulls --jq '.[] | "\(.number) \(.head.ref) \(.title)"'`.
2. **Unirea:** `git switch -c unire-<data> origin/main`, apoi `git merge --no-ff <sha-ul raportat>` pentru fiecare felie
   (din commit-ul raportat, nu din vârful ramurii, dacă linia a mers mai departe). Un commit care mai are `.lucru/` nu se
   unește (`git ls-tree -d <sha> .lucru` e gol). `DEVLOG.md` se rezolvă cu
   `scripts/rezolva-devlog.py`; o ciocnire în cod se rezolvă cu ambele părți, citind ambele felii, apoi tipurile și probele
   atinse în container.
3. **Porțile unirii, în CI:** `git push origin unire-<data>` (rapidul pornește singur), apoi
   `gh workflow run complet.yml --ref unire-<data>`. Ambele verzi pe același commit.
4. **Decizia și un singur push în `main`:** decizia în `CLAUDE.md` („Decizii luate”, cu porțile), rândurile de stare ale
   liniilor, indexul ADR; apoi `git push origin HEAD:main` (fast-forward). PR-urile feliilor se închid singure, ca unite.
5. **Publicarea pe test:** `bash scripts/cloud/ci-si-publica.sh <sha>`: rapidul, completul pe `main`, publicarea
   (`publica.yml`, serverul și hosting-ul, cu amprenta) și adresa de test. O comandă ține cel mult 30 de minute, iar
   completul durează mai mult: la ieșirea cu 3, scriptul se reia la fel și continuă de unde a rămas.
6. **Live:** doar la cuvântul owner-ului, pe un commit publicat întreg pe test:
   `gh workflow run publica.yml -f instanta=live -f sha=<sha>`, apoi aprobarea owner-ului în GitHub (mediul `live`).

Un CI roșu pe `main` e incidentul numărul unu: sesiunea principală îl repară înaintea oricărei uniri noi.

## Ce rămâne pe calculatorul owner-ului

- **Probele pe aparatele reale**, din rețeaua owner-ului: imprimanta 3D (K1C) și mașina CNC. Feliile lor se dezvoltă în
  cloud, cu simulatoarele; proba pe aparat o face owner-ul, după ghidul feliei.
- **`docs/faza0/`** (capturile și analiza aplicației vechi): nu intră niciodată în repo, deci nu e în cloud. Ce trebuie din
  ele intră în brief-ul liniei, fără găurile aplicației vechi.
- **Folderul local** (`Apps\cncvs2`): doar se sincronizează din GitHub (`git pull --ff-only`), fără lucru în el.

## Uneltele mutate în repo

- `scripts/rezolva-devlog.py`: ciocnirile din `DEVLOG.md`, cu ambele părți păstrate.
- `scripts/cloud/ci-si-publica.sh`: CI-ul și publicarea unui commit din `main`, de reluat până iese cu 0 sau 1.
- `scripts/ldraw/`: pentru pluginul Easy 3Draw.
  - `aduce.py` aduce piesele LDraw (licența CC BY 4.0) în dosarul dat, de pildă `.tmp/ldraw`.
  - `plat.py`, `felie.py`, `felie_axa.py`, `sectiune.py` dau secțiunile.
  - `elice_masura.py` și `elice_desfasurata.py` sunt pentru elice.
  - `randare.mts` dă randarea 3D a unei piese LDraw sau a motorului, cu Edge, prin Playwright.

Biblioteca LDraw nu intră în repo: se aduce la nevoie.
