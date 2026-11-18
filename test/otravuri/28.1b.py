# Lista de otrăvuri a feliei 28.1↑b (fereastra Aspectul, ADR 0250 §3, §5), 17.11.2026, alese de autor: fereastra (Renunță și
# Escape pun la loc densitatea și tema, Păstrează scrie alegerea, densitatea se aplică pe loc, doar aranjamentele build-ului
# se pot alege, focusul se întoarce), legăturile ei (rândul din meniul contului, cu aranjamentul de acum; paleta din orice
# fereastră; tema prin aplicație; F1 la capitolul ei) și manualul (capitolul acoperă ușa).
# Refăcută în 28.1↑c (E01, E07): densitatea are acum funcția ei (`aplicaDensitatea`), iar aranjamentul îl pune aplicația.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit; e2e-ul, cu
# `CNCVS2_E2E_RETEA=127.0.9` și configul local (`.tmp/pw.config.ts`, portul 4182 al worktree-ului `aranjamente`).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


AS = 'src/app/Aspectul.tsx'
AP = 'src/app/App.tsx'
ED = 'src/app/Editare.tsx'
MC = 'src/app/meniuCont.ts'
MR = 'docs/manual/ro.md'

# Rândul din meniu și ușa manualului (unitare).
o('A01', MC, "    'manual',\n    'aspect',\n", "    'manual',\n", 'aspect', 'rândul lipsește din meniul contului')
o('A02', MR, '%% capitol: aspect\n%% acopera: vedere.aspect', '%% capitol: aspect\n%% acopera: vedere.tema', 'aspect',
  'capitolul nu acoperă ușa ferestrei')
# Fereastra și legăturile ei (e2e, `aranjament.spec.ts`).
o('E01', AS, '    aplicaDensitatea(inainte.densitate);\n    if (alegere.aranjament', '    if (alegere.aranjament', 'e2e',
  'Renunță nu pune la loc densitatea')
o('E02', AS, 'localStorage.setItem(CHEIE_ARANJAMENT, scrieAlegerea(alegere));', 'void CHEIE_ARANJAMENT; void scrieAlegerea(alegere);', 'e2e',
  'Păstrează nu scrie')
o('E03', AS, 'disabled={!poate}', 'disabled={false}', 'e2e', 'Clasic se poate alege')
o('E04', AP, "'vedere.tema', 'vedere.aspect', ", "'vedere.tema', ", 'e2e', 'din paletă, fereastra Mașina se închide')
o('E05', AS, '    if (tema !== inainte.tema) onTema(inainte.tema);\n', '', 'e2e', 'Renunță nu pune la loc tema')
o('E06', AS, '    return () => { if (focusInapoi instanceof HTMLElement) focusInapoi.focus(); };\n', '', 'e2e', 'focusul nu se întoarce')
o('E07', AS, '    aplicaDensitatea(a.densitate);\n    setAlegere(a);', '    setAlegere(a);', 'e2e', 'densitatea se vede doar după Păstrează')
o('E08', AP, 'onTema={schimbaTema}', 'onTema={alegeTema}', 'e2e', 'tema din fereastră ocolește aplicația (bara nu o arată)')
o('E09', ED, "  if (document.querySelector('[aria-labelledby=\"aspect-titlu\"]')) return 'vedere.aspect';\n", '', 'e2e',
  'F1 în fereastră nu ajunge la capitolul ei')
o('E10', ED, '{t(`aranjament.${alegereaDeAcum(document.documentElement.dataset).aranjament}`)}', "{t('aranjament.clasic')}", 'e2e',
  'indiciul din meniu arată alt aranjament')

SETURI = {
    'aspect': ['test/unit/meniuCont.test.ts', 'test/unit/manual.test.ts'],
}
E2E = ['test/e2e/aranjament.spec.ts']
