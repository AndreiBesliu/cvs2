#!/usr/bin/env bash
# Doar local: build, bancul vizual A.4, apoi probele e2e ale feliei pe emulatoare (fiecare așteaptă liniștea și porturile).
cd /c/Users/besli/cncvs2-lucru/admin || exit 9
node node_modules/vite/bin/vite.js build > .tmp/build-a4.log 2>&1 || { echo "build EȘUAT"; exit 7; }
echo "build ok $(date +%H:%M:%S)"
rm -f .tmp/vizual/capturi/5*-sugestii-* .tmp/vizual/capturi/6*-sugestii-*
bash .tmp/banc-a4.sh > .tmp/banc-a4.out 2>&1; echo "banc exit=$? $(date +%H:%M:%S)"
bash .tmp/e2e-a4.sh > .tmp/e2e-a4.out 2>&1; echo "e2e exit=$? $(date +%H:%M:%S)"
grep -E "passed|failed|flaky" .tmp/e2e-a4.run.log | tail -5
