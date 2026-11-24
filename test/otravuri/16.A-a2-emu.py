# Otrăvurile de pe emulatoare ale feliei 16.A↑a-2 (frezele standard; ADR 0300 §3): fereastra dă setul sincronizării (un cont
# gol îl primește) și întrebarea „Adaugi … din acest browser” vine după prima trecere (nu numără frezele standard). Restul
# feliei: `test/otravuri/16.A-a2.py`. Se rulează cu `scripts/otravuri-emulatoare.py`, în `firebase emulators:exec`.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


S = 'src/app/frezeSincronizare.ts'
W = 'src/app/FrezeleMele.tsx'

o('S03', S, "  void sincronizeaza(frezeMele(cheie), cheama, l.standard ?? undefined).then((fel) => {",
  "  void sincronizeaza(frezeMele(cheie), cheama).then((fel) => {", 'e2e', 'fereastra nu dă setul sincronizării: contul gol rămâne gol')
o('E05', W, " && !amanat && sincronizare.stare.ultima !== null\n", " && !amanat\n", 'e2e',
  'întrebarea vine înaintea primei treceri și numără și frezele standard')

SETURI = {}
E2E = ['test/e2e-emulator/freze.emulator.spec.ts']
P = 'test/e2e-emulator/freze.emulator.spec.ts'
T1 = (P, 'două browsere ale aceluiași cont')
GREP = {'S03': T1, 'E05': T1}
