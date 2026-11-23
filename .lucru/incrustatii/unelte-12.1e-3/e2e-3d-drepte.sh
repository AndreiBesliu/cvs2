#!/usr/bin/env bash
# Doar specificația vederii 3D (incrustatie3d.spec.ts), pe build-ul arborelui, după un minut de liniște, cu un lucrător.
cd /c/Users/besli/cncvs2-lucru/incrustatii || exit 9
export CNCVS2_E2E_RETEA=127.0.1
node node_modules/vite/bin/vite.js build > .tmp/build-3d-drepte.txt 2>&1 || { echo "build eșuat"; tail -20 .tmp/build-3d-drepte.txt; exit 3; }
echo "build gata $(date '+%H:%M:%S')"
start=$(date +%s); liniste=0
while :; do
  n=$(powershell.exe -NoProfile -Command "(Get-CimInstance Win32_Process | Where-Object { \$_.CommandLine -match 'playwright/test/cli.js|workerProcessEntry' } | Measure-Object).Count" | tr -d '\r ')
  if [ "$n" = "0" ]; then liniste=$((liniste + 5)); else liniste=0; fi
  if [ $liniste -ge 60 ]; then echo "liniște de un minut la $(date '+%H:%M:%S')"; break; fi
  if [ $(( $(date +%s) - start )) -ge 1200 ]; then echo "fără liniște în 20 de minute (ultimele procese: $n); pornesc oricum la $(date '+%H:%M:%S')"; break; fi
  sleep 5
done
( time node node_modules/@playwright/test/cli.js test --config=.tmp/pw.config.ts --workers=1 --reporter=line test/e2e/incrustatie3d.spec.ts ) > .tmp/e2e-3d-drepte.log 2>&1
echo "e2e 3D gata $(date '+%H:%M:%S'): $(grep -E '^\s+[0-9]+ (passed|failed|flaky|did not run|skipped)' .tmp/e2e-3d-drepte.log | tr -s ' ' | tr '\n' ';')"
