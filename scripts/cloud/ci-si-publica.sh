#!/usr/bin/env bash
# CI-ul unui commit din main și publicarea lui pe test, pentru sesiunea principală din cloud (docs/lucru-in-cloud.md):
# rapidul (pornit de push), completul (pornit aici, pe main), apoi publicarea (`publica.yml`, cu sha-ul fixat), doar cu
# amândouă verzi pe același sha, și la sfârșit adresa de test, care își spune sha-ul.
#
# Containerul se suspendă când stă și o comandă ține cel mult 30 de minute, iar completul durează mai mult: scriptul
# așteaptă cel mult ASTEAPTA minute (implicit 25), apoi iese cu 3 („încă rulează”). Se reia la fel și continuă de unde a
# rămas: nu pornește a doua oară completul sau publicarea pe același sha.
#
#   bash scripts/cloud/ci-si-publica.sh <sha>     # 0 publicat; 1 CI roșu sau publicare căzută; 3 de reluat; 9 folosire
set -uo pipefail
cd "$(dirname "$0")/../.." || exit 9
[ $# -eq 1 ] || { echo "folosire: bash scripts/cloud/ci-si-publica.sh <sha>"; exit 9; }
git fetch -q origin || { echo "git fetch a căzut"; exit 9; }
SHA=$(git rev-parse --verify "$1^{commit}" 2>/dev/null) || { echo "commit necunoscut: $1"; exit 9; }
git merge-base --is-ancestor "$SHA" origin/main || { echo "${SHA:0:8} nu e pe main"; exit 9; }
LIMITA=$(( $(date +%s) + ${ASTEAPTA:-25} * 60 ))
RULARI=https://github.com/AndreiBesliu/cvs2/actions/runs
ADRESA=https://cncvectorstudio-test.web.app/

# Cea mai nouă rulare a unui workflow care se potrivește filtrului jq: „<id> <stare> <concluzie>” sau nimic.
rulare() {
  gh run list --workflow "$1" --limit 30 --json databaseId,headSha,event,status,conclusion,displayTitle \
    --jq "[.[] | select($2)] | .[0] // empty | \"\(.databaseId) \(.status) \(.conclusion)\"" 2>/dev/null
}
# Așteaptă o rulare (workflow, filtru): 0 verde, 1 altfel terminată, 2 nu apare, 3 încă rulează la limită.
# Cele 10 minute în care rularea trebuie să apară se numără de la începutul așteptării ei, nu de la pornirea scriptului:
# altfel o publicare pornită după o așteptare lungă a completului e declarată lipsă la prima întrebare.
asteapta() {
  local r="" vazuta=0 inceput
  inceput=$(date +%s)
  while :; do
    r=$(rulare "$1" "$2")
    case "$r" in
      *" completed success") echo "$1: verde, $RULARI/${r%% *}"; return 0 ;;
      *" completed "*) echo "$1: ${r##* }, $RULARI/${r%% *}"; return 1 ;;
      "") [ $vazuta -eq 0 ] && [ "$(date +%s)" -ge $(( inceput + 600 )) ] && { echo "$1: nicio rulare după 10 minute"; return 2; } ;;
      *) vazuta=1 ;;
    esac
    [ "$(date +%s)" -lt "$LIMITA" ] || { echo "$1: încă rulează ($r), reia scriptul"; return 3; }
    sleep 30
  done
}
adresa() { curl -fsS "$ADRESA" 2>/dev/null | grep -o 'cncvs2-versiune" content="[0-9a-f]*' | tail -c 13; }

[ "$(adresa)" = "${SHA:0:12}" ] && { echo "pe adresa de test e deja ${SHA:0:12}"; exit 0; }

# 1. Rapidul, pornit de push (lipsește doar când push-ul a avut numai .md: îl judecă atunci publica.yml, pe strămoș).
if [ -z "$(rulare rapid.yml ".headSha == \"$SHA\" and .event == \"push\"")" ] && \
   [ -z "$(git diff --name-only "$SHA~1" "$SHA" | grep -vE '\.md$')" ]; then
  echo "rapid.yml: commit doar cu .md, fără rulare (publica.yml cere strămoșul verde)"; SR=0
else
  asteapta rapid.yml ".headSha == \"$SHA\" and .event == \"push\""; SR=$?
fi
[ $SR -eq 1 ] && { echo "rapidul nu e verde: nu public"; exit 1; }
[ $SR -eq 2 ] && exit 1
[ $SR -eq 3 ] && exit 3

# 2. Completul, pornit de mână pe main, o singură dată pe sha (pe main trebuie să fie chiar sha-ul).
FC=".headSha == \"$SHA\" and .event == \"workflow_dispatch\""
if [ -z "$(rulare complet.yml "$FC")" ]; then
  [ "$(git rev-parse origin/main)" = "$SHA" ] || { echo "main a trecut de ${SHA:0:8}: completul se pornește doar pe vârful lui main"; exit 1; }
  gh workflow run complet.yml --ref main && echo "complet.yml: pornit $(date +%H:%M)" || exit 1
fi
asteapta complet.yml "$FC"; SC=$?
[ $SC -eq 3 ] && exit 3
[ $SC -eq 0 ] || { echo "completul nu e verde: nu public"; exit 1; }

# 3. Publicarea pe test, o singură dată pe sha (run-name: „publica test <sha>”).
FP=".displayTitle == \"publica test $SHA\""
if [ -z "$(rulare publica.yml "$FP")" ]; then
  # `--ref main` e obligatoriu în container: fără el, gh întreabă prin GraphQL (oprit acolo) care e ramura implicită.
  gh workflow run publica.yml --ref main -f instanta=test -f sha="$SHA" && echo "publica.yml: pornită $(date +%H:%M)" || exit 1
fi
asteapta publica.yml "$FP"; SP=$?
[ $SP -eq 3 ] && exit 3
[ $SP -eq 0 ] || { echo "publicarea a căzut"; exit 1; }

# 4. Adresa de test își spune sha-ul (cache-ul paginii se golește în câteva zeci de secunde).
for _ in 1 2 3 4 5 6; do
  V=$(adresa); [ "$V" = "${SHA:0:12}" ] && break
  sleep 20
done
echo "pe adresa de test: ${V:-nimic} (așteptat ${SHA:0:12})"
[ "$V" = "${SHA:0:12}" ]
