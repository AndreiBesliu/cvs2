# Lista de otrăvuri a feliei 13.A↑b (fereastra Mașina adusă în fundal după pornire, ADR 0132 §9), 03.11.2026, alese de autor:
# preîncărcarea, mesajul de încărcare și cel de eșec. Toate trei sunt de interfață, deci prin e2e (build-ul și Playwright prin
# `node`, pe portul din `.tmp/pw.config.ts`), din worktree-ul feliei (în afara Drive-ului), după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


APP = 'src/app/App.tsx'

o('P01', APP, '      void incarcaMasina().catch(() => undefined);\n', '', 'e2e', 'Mașina nu mai e adusă în fundal: primul clic o cere')
o('P02', APP, "<Suspense fallback={<p className=\"fereastra-mesaj\" role=\"status\" data-testid=\"masina-incarca\">{t('fereastra.masina.incarca')}</p>}>",
  '<Suspense fallback={null}>', 'e2e', 'fereastra stă goală cât vine bucata')
o('P03', APP, '() => ({ default: MasinaNeincarcata })));', '() => ({ default: () => null })));', 'e2e',
  'bucata care nu vine lasă fereastra goală, fără motiv și fără Reîncarcă')

SETURI = {}
E2E = ['test/e2e/fereastra.spec.ts']
