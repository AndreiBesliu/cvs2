#!/usr/bin/env bash
# Probele atinse de A.4, pe emulatoare: după un minut de liniște și cu porturile libere (4173 și ale emulatoarelor). Dacă
# altă sesiune ia porturile în aceeași clipă („port taken”), o ia de la capăt, cel mult 6 ori.
cd /c/Users/besli/cncvs2-lucru/admin || exit 9
SPECS="${SPECS:-sugestii.emulator tichete.emulator conversatia.emulator azi.emulator}"
export PATH="/c/Users/besli/AppData/Roaming/npm:/c/Program Files/Android/Android Studio/jbr/bin:$PATH"
export JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
export FUNCTIONS_DISCOVERY_TIMEOUT=30
for incercare in 1 2 3 4 5 6; do
  bash .tmp/liniste.sh
  ocupat=""
  for p in 4173 8085 9095 5005 9195 4400; do
    if netstat -ano | grep -q ":$p .*LISTENING"; then ocupat="$p"; fi
  done
  if [ -n "$ocupat" ]; then echo "încercarea $incercare: portul $ocupat e ocupat, aștept"; sleep 90; continue; fi
  T=$(mktemp -d); TW=$(cygpath -w "$T")
  TMP="$TW" TEMP="$TW" TMPDIR="$TW" firebase emulators:exec --only auth,firestore,functions,storage --project demo-cncvs2 \
    "node node_modules/@playwright/test/cli.js test -c .tmp/pw.emulator.config.ts $SPECS --reporter=line $EXTRA" > .tmp/e2e-a4.run.log 2>&1
  r=$?
  rm -rf "$T"
  cat .tmp/e2e-a4.run.log
  if grep -q "port taken\|unable to start on port 4400\|Port [0-9]* is not open" .tmp/e2e-a4.run.log && ! grep -q "Running [0-9]* test" .tmp/e2e-a4.run.log; then
    echo "încercarea $incercare: porturile luate de altă sesiune, o iau de la capăt"; sleep 90; continue
  fi
  exit $r
done
echo "fără porturi libere după 6 încercări"
exit 8
