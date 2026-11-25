# Otrăvurile de pe emulatoare ale feliei 16.A↑b-6 („Pune-o înapoi în bibliotecă”; ADR 0300 §5): freza pusă înapoi din
# fereastra exportului pleacă în cont, unde reînvie peste semnul ștergerii. Restul feliei: `test/otravuri/16.A-b6.py`. Se rulează
# cu `scripts/otravuri-emulatoare.py`, în `firebase emulators:exec`.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


A = 'src/app/ExportConectat.tsx'
S = 'src/app/frezeSincronizare.ts'

o('A01', A, '      if (cheieBiblioteca !== CHEIE_LOCALA && uid !== null && config !== null) trimiteSchimbarea(cheieBiblioteca, uid, config);\n', '',
  'e2e', 'freza pusă înapoi nu pleacă în cont')
o('A02', A, '    const b = frezeMele(cheieBiblioteca);\n', '    const b = frezeMele(CHEIE_LOCALA);\n', 'e2e',
  'pusă înapoi în biblioteca fără cont, nu în a contului')
o('S01', S, '  programeaza(cheie);\n}\n\nexport type Sincronizare', '}\n\nexport type Sincronizare', 'e2e',
  'schimbarea nu se mai trimite')

SETURI = {}
E2E = ['test/e2e-emulator/freze.emulator.spec.ts']
P = 'test/e2e-emulator/freze.emulator.spec.ts'
T = (P, 'pusă înapoi din fereastra exportului')
GREP = {'A01': T, 'A02': T, 'S01': T}
