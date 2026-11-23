#!/usr/bin/env bash
# Pregătirea unui container cloud (Claude Code pe web) pentru cncvs2, ca în CI (`.github/workflows/complet.yml`): Node 26,
# dependențele aplicației și ale funcțiilor, Edge pentru Playwright (e2e), Java 21 și firebase-tools 15.18.0 (emulatoarele),
# Python 3 (otrăvurile, uneltele LDraw). Se rulează din orice dosar al repo-ului, ca script de pregătire al mediului
# (`bash scripts/cloud/pregatire.sh`); se poate relua: sare ce e deja instalat. Fără secrete: publicarea pe test merge prin
# GitHub Actions (`publica.yml`, cu Workload Identity), nu din container. Pașii și felul de lucru: docs/lucru-in-cloud.md.
set -uo pipefail
cd "$(dirname "$0")/../.." || exit 9
SUDO=""
if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then SUDO="sudo"; fi
pas() { echo; echo "== $*"; }
lipsa=()

pas "Node 26"
if ! node -v 2>/dev/null | grep -q '^v26\.'; then
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ ! -s "$NVM_DIR/nvm.sh" ]; then
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash || lipsa+=("nvm")
  fi
  # shellcheck disable=SC1091
  if [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm install 26 && nvm alias default 26; then :; else lipsa+=("Node 26"); fi
fi
node -v

pas "Dependențele: aplicația și funcțiile (npm ci)"
if npm ci && npm --prefix functions ci; then :; else lipsa+=("npm ci"); fi

pas "Edge pentru Playwright (e2e)"
npx playwright install --with-deps msedge || lipsa+=("Edge: e2e-ul nu poate rula")

pas "Java 21 (emulatoarele Firebase)"
if ! java -version 2>&1 | grep -q 'version "21'; then
  if $SUDO apt-get update -qq && $SUDO apt-get install -y -qq openjdk-21-jdk-headless; then :; else lipsa+=("Java 21: emulatoarele nu pot rula"); fi
fi
java -version 2>&1 | head -1

pas "firebase-tools 15.18.0"
if ! firebase --version 2>/dev/null | grep -q '^15\.18\.0'; then npm install -g firebase-tools@15.18.0 || lipsa+=("firebase-tools"); fi
firebase --version 2>/dev/null

pas "Python 3"
python3 --version || lipsa+=("Python 3")

echo
if [ ${#lipsa[@]} -eq 0 ]; then
  echo "Gata: mediul are tot ce cer porțile (npm run rapid, npm run e2e, npm run test:emulator)."
else
  printf 'Lipsesc: %s\n' "${lipsa[@]}"
  exit 1
fi
