#!/usr/bin/env bash
# Pregătirea mediului cloud (Claude Code pe web) pentru cncvs2, ca în CI (`.github/workflows/complet.yml`). Rulează ca root,
# pe Ubuntu 24.04, după clonarea repo-ului, o dată pe mediu: sub vreo 5 minute rezultatul e păstrat (o captură a
# sistemului de fișiere) și refolosit de sesiuni. Imaginea are deja Java 21 (emulatoarele) și Python 3; aici se adaugă:
# Node 26 (imaginea are 20–22, iar repo-ul rulează .ts direct, ca în CI), dependențele aplicației și ale funcțiilor, Edge
# pentru Playwright și firebase-tools 15.18.0. Nu iese niciodată cu eroare (o eroare ar opri pornirea sesiunii): ce lipsește
# se spune la sfârșit. Fără secrete: publicarea pe test merge prin GitHub Actions. Felul de lucru: docs/lucru-in-cloud.md.
set -uo pipefail
cd "$(dirname "$0")/../.." || exit 0
t0=$(date +%s)
pas() { echo; echo "== $* ($(( $(date +%s) - t0 )) s)"; }
lipsa=()

pas "Node 26"
if ! node -v 2>/dev/null | grep -q '^v26\.'; then
  f=$(curl -fsSL https://nodejs.org/dist/latest-v26.x/SHASUMS256.txt 2>/dev/null | grep -o 'node-v26[^ ]*-linux-x64\.tar\.xz' | head -1)
  if [ -n "$f" ] && mkdir -p /opt/node26 && curl -fsSL "https://nodejs.org/dist/latest-v26.x/$f" | tar -xJ -C /opt/node26 --strip-components=1; then
    # imaginea pune /opt/node22/bin primul în PATH: /opt/node22 devine Node 26 (originalul rămâne în /opt/node22.imagine)
    if [ -d /opt/node22 ] && [ ! -L /opt/node22 ]; then mv /opt/node22 /opt/node22.imagine && ln -s /opt/node26 /opt/node22; fi
    ln -sf /opt/node26/bin/node /usr/local/bin/node; ln -sf /opt/node26/bin/npm /usr/local/bin/npm; ln -sf /opt/node26/bin/npx /usr/local/bin/npx
    hash -r
  else
    lipsa+=("Node 26")
  fi
fi
node -v

pas "Dependențele: aplicația și funcțiile (npm ci)"
if npm ci --no-audit --no-fund --prefer-offline && npm --prefix functions ci --no-audit --no-fund --prefer-offline; then :; else lipsa+=("npm ci"); fi

pas "Edge pentru Playwright (e2e)"
npx playwright install --with-deps msedge || lipsa+=("Edge: e2e-ul nu poate rula")

pas "Java 21 (emulatoarele Firebase)"
java -version 2>&1 | head -1
java -version 2>&1 | grep -q 'version "21' || lipsa+=("Java 21: emulatoarele nu pot rula")

pas "firebase-tools 15.18.0"
if ! firebase --version 2>/dev/null | grep -q '^15\.18\.0'; then npm install -g --no-audit --no-fund firebase-tools@15.18.0 || lipsa+=("firebase-tools"); fi
firebase --version 2>/dev/null

pas "Python 3"
python3 --version || lipsa+=("Python 3")

pas "Gata"
if [ ${#lipsa[@]} -eq 0 ]; then
  echo "Mediul are tot ce cer porțile (npm run rapid, npm run e2e, npm run test:emulator)."
else
  printf 'LIPSESC: %s\n' "${lipsa[@]}"
fi
exit 0
