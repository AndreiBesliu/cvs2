# Verificarea pasului 0

Uneltele cu care s-au verificat `docs/PORTARE.md` și `docs/adr/` (rezultatele: `docs/PORTARE.md` §6). Se rulează din
Git Bash, de la rădăcina repo-ului. Repo-ul vechi nu se atinge niciodată: totul rulează pe o copie.

**1. Documentele** (trimiterile la codul vechi, numerele din ADR-uri, legăturile):

```bash
PYTHONIOENCODING=utf-8 python docs/pasul0/verificare/verifica_documente.py
```

Trebuie să iasă „0 probleme”, „0 numere fără sursă”, „0 legături rupte”. `VECHI` schimbă locul repo-ului vechi.

**2. Suitele vechi și sonda pentru supracursă**, pe o copie a lui `d850c7b`. `test-zz-sonda-supracursa.ts` importă din
codul vechi și rulează doar în copie; nu face parte din build-ul nou (`docs/` stă în afara lui `tsconfig`).

```bash
VECHI=/c/Users/besli/Desktop/MyWork/Apps/CNCVectorStudio
COPIE=$(mktemp -d)/vechi-d850c7b && mkdir -p "$COPIE"
git -C "$VECHI" archive d850c7b src scripts public functions package.json tsconfig.json tsconfig.node.json tsconfig.scripts.json vite.config.ts firestore.rules | tar -x -C "$COPIE"
cmd //c mklink //J "$(cygpath -w "$COPIE/node_modules")" "$(cygpath -w "$VECHI/node_modules")"
cp docs/pasul0/verificare/test-zz-sonda-supracursa.ts "$COPIE/scripts/"
(cd "$COPIE" && node scripts/run-tests.mjs urechi-profil lead-material-pastrat test-machine.ts machine-bariera machine-resume trial-ledger zz-sonda)
```

**3. Textele GRBL** față de CSV-urile oficiale (GPL-3.0, descărcate doar în dosarul temporar):

```bash
T=$(mktemp -d)
curl -sSf -o "$T/grbl_err.csv" https://raw.githubusercontent.com/gnea/grbl/master/doc/csv/error_codes_en_US.csv
curl -sSf -o "$T/grbl_alarm.csv" https://raw.githubusercontent.com/gnea/grbl/master/doc/csv/alarm_codes_en_US.csv
GRBL_CSV_DIR="$(cygpath -w "$T")" PYTHONIOENCODING=utf-8 python docs/pasul0/verificare/compara_grbl.py
```
