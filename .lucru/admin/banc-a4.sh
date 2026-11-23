#!/usr/bin/env bash
# Doar local: bancul vizual A.4, pe emulatoare, pe dist/ deja construit; după liniște, cu porturile libere (reîncearcă).
cd /c/Users/besli/cncvs2-lucru/admin || exit 9
export PATH="/c/Users/besli/AppData/Roaming/npm:/c/Program Files/Android/Android Studio/jbr/bin:$PATH"
export JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
export FUNCTIONS_DISCOVERY_TIMEOUT=30
for incercare in 1 2 3 4 5 6; do
  bash .tmp/liniste.sh
  ocupat=""
  for p in 4173 8085 9095 5005 4400; do netstat -ano | grep -q ":$p .*LISTENING" && ocupat="$p"; done
  if [ -n "$ocupat" ]; then echo "încercarea $incercare: portul $ocupat e ocupat, aștept"; sleep 90; continue; fi
  T=$(mktemp -d); TW=$(cygpath -w "$T")
  TMP="$TW" TEMP="$TW" TMPDIR="$TW" firebase emulators:exec --only auth,firestore,functions --project demo-cncvs2 \
    'node node_modules/@playwright/test/cli.js test -c .tmp/pw.vizual.config.ts -g "capturi A.4" --reporter=line' > .tmp/banc-a4.run.log 2>&1
  r=$?; rm -rf "$T"; cat .tmp/banc-a4.run.log
  if grep -q "port taken\|Port [0-9]* is not open" .tmp/banc-a4.run.log && ! grep -q "Running [0-9]* test" .tmp/banc-a4.run.log; then echo "încercarea $incercare: porturile luate, o iau de la capăt"; sleep 90; continue; fi
  echo "banc exit=$r"; exit $r
done
exit 8
