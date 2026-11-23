#!/usr/bin/env bash
# Porțile lente ale feliei 12.1↑e-3 („Împreună (secțiunea)” la pereții drepți, ADR 0179), pe arborele de lucru (= commit-ul
# care urmează): suita unitară, build-ul determinist, baza 082435b4 (HEAD-ul de dinaintea feliei, pentru mărime), apoi
# e2e-ul întreg după un minut de liniște, cu fișierele căzute reluate întregi cu un lucrător. Jurnalele în .tmp/.
cd /c/Users/besli/cncvs2-lucru/incrustatii || exit 9
S=/c/Users/besli/cncvs2-lucru/incrustatii/.tmp/unelte-12.1e-3
export CNCVS2_E2E_RETEA=127.0.1
echo "HEAD $(git rev-parse --short=12 HEAD), start $(date '+%H:%M:%S'); arborele: $(git status --short | tr '\n' ' ')"
( time node --test "test/unit/**/*.test.ts" ) > .tmp/unit-drepte.log 2>&1
echo "unit gata $(date '+%H:%M:%S'): $(grep -E '^ℹ (tests|pass|fail|skipped)' .tmp/unit-drepte.log | tr '\n' ' ')"
node scripts/build-determinist.ts > .tmp/determinist-drepte.txt 2>&1
echo "determinist rc=$? $(date '+%H:%M:%S')"
grep -E '^Build determinist|^JavaScript gzip|^Cu un proiect|^Cu Atelierul' .tmp/determinist-drepte.txt
# Baza: 082435b4, în .tmp/baza-drepte, cu node_modules prin joncțiune (scoasă cu rmdir, nu urmată).
B=.tmp/baza-drepte
if [ -e "$B/node_modules" ]; then cmd //c "rmdir $(cygpath -w "$B/node_modules")"; fi
if [ -e "$B/node_modules" ]; then echo "joncțiunea bazei n-a ieșit: mă opresc înainte de rm -rf"; exit 5; fi
rm -rf "$B"
mkdir -p "$B"
git archive 082435b4 | tar -x -C "$B"
cmd //c "mklink /J $(cygpath -w "$B/node_modules") C:\\Users\\besli\\Desktop\\MyWork\\Apps\\cncvs2\\node_modules" > /dev/null
( cd "$B" && node scripts/build-determinist.ts > ../determinist-baza-drepte.txt 2>&1; echo "baza determinist rc=$?"; node node_modules/vite/bin/vite.js build > ../build-baza-drepte.txt 2>&1; echo "baza build rc=$?" )
grep -E '^Build determinist|^JavaScript gzip|^Cu un proiect|^Cu Atelierul' .tmp/determinist-baza-drepte.txt
node node_modules/vite/bin/vite.js build > .tmp/build-e2e-drepte.txt 2>&1 || { echo "build eșuat"; exit 3; }
echo "build gata $(date '+%H:%M:%S')"
python -B -X utf8 "$S/marime_bucati.py" "$B/dist/assets" dist/assets
# Un minut întreg fără nicio rulare Playwright pe mașină (verificat la 5 s), cel mult 20 de minute.
start=$(date +%s); liniste=0
while :; do
  n=$(powershell.exe -NoProfile -Command "(Get-CimInstance Win32_Process | Where-Object { \$_.CommandLine -match 'playwright/test/cli.js|workerProcessEntry' } | Measure-Object).Count" | tr -d '\r ')
  if [ "$n" = "0" ]; then liniste=$((liniste + 5)); else liniste=0; fi
  if [ $liniste -ge 60 ]; then echo "liniște de un minut la $(date '+%H:%M:%S')"; break; fi
  if [ $(( $(date +%s) - start )) -ge 1200 ]; then echo "fără liniște în 20 de minute (ultimele procese: $n); pornesc oricum la $(date '+%H:%M:%S')"; break; fi
  sleep 5
done
( time node node_modules/@playwright/test/cli.js test --config=.tmp/pw.config.ts --workers=3 --reporter=line ) > .tmp/e2e-drepte.log 2>&1
echo "e2e gata $(date '+%H:%M:%S'): $(grep -E '^\s+[0-9]+ (passed|failed|flaky|did not run|skipped)' .tmp/e2e-drepte.log | tr -s ' ' | tr '\n' ';')"
# Fișierele căzute (și cele nerulate după ele, din același fișier), reluate întregi, cu un lucrător.
if grep -qE '^\s+[0-9]+ (failed|did not run)' .tmp/e2e-drepte.log; then
  rerun=$(grep -E '^\s+[0-9]+\) \[edge|✘|^\s+x ' .tmp/e2e-drepte.log | grep -oE 'test\\e2e\\[^:]+\.spec\.ts' | sed -E 's/test\\e2e\\/test\/e2e\//' | sort -u)
  echo "reiau: $(echo $rerun | tr '\n' ' ')"
  ( time node node_modules/@playwright/test/cli.js test --config=.tmp/pw.config.ts --workers=1 --reporter=line $rerun ) > .tmp/e2e-drepte-reluare.log 2>&1
  echo "reluarea gata $(date '+%H:%M:%S'): $(grep -E '^\s+[0-9]+ (passed|failed|flaky|did not run|skipped)' .tmp/e2e-drepte-reluare.log | tr -s ' ' | tr '\n' ';')"
fi
git status --short
echo "sfârșit $(date '+%H:%M:%S')"
