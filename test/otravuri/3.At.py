# Otrăvurile de pe emulatoare ale feliei 3.At (fila Setări din /admin: mesajul salvării apare abia cu citirea de după, când
# formularul e deja cel umplut din nou din ea; 24.11.2026, după completul 45449914076), alese de autor: mesajul dat la
# răspunsul salvării (cele trei formulare), mesajul care nu mai vine, citirea căzută care lasă formularul ocupat.
# Se rulează cu `scripts/otravuri-emulatoare.py`, în `firebase emulators:exec`, dintr-o clonă, după commit.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


FS = 'src/admin/setari/FilaSetari.tsx'
SU = 'src/admin/setari/SetariUtilizarii.tsx'
RR = 'src/admin/setari/RaspunsuriRapide.tsx'

o('C01', FS, "      dupa.tine(t(r.schimbat ? 'admin.set.salvate' : 'admin.set.neschimbate'));",
  "      setLucru({ faza: 'gata', mesaj: t(r.schimbat ? 'admin.set.salvate' : 'admin.set.neschimbate') });", 'e2e',
  'conturile: mesajul apare la răspunsul salvării, înaintea citirii de după')
o('U01', SU, "      dupa.tine(t(r.schimbat ? 'admin.set.util.salvate' : 'admin.set.neschimbate'));",
  "      setLucru({ faza: 'gata', mesaj: t(r.schimbat ? 'admin.set.util.salvate' : 'admin.set.neschimbate') });", 'e2e',
  'utilizarea: mesajul apare la răspunsul salvării, înaintea citirii de după')
o('R01', RR, "      dupa.tine(t(r.schimbat ? 'admin.set.rapide.salvate' : 'admin.set.neschimbate'));",
  "      setLucru({ faza: 'gata', mesaj: t(r.schimbat ? 'admin.set.rapide.salvate' : 'admin.set.neschimbate') });", 'e2e',
  'răspunsurile rapide: mesajul apare la răspunsul salvării, înaintea citirii de după')
o('U02', SU, "        setCitiri((n) => n + 1);\n        dupa.citit();\n", "        setCitiri((n) => n + 1);\n", 'e2e',
  'utilizarea: după citire, mesajul salvării nu mai apare, iar formularul rămâne ocupat')
o('U03', SU, "        setCitite({ ok: false, motiv: motivDin(e) });\n        dupa.citit();\n", "        setCitite({ ok: false, motiv: motivDin(e) });\n", 'e2e',
  'utilizarea: citirea căzută înghite mesajul salvării și lasă formularul ocupat')

SETURI = {}
E2E = ['test/e2e-emulator/utilizatori.emulator.spec.ts']
T1 = 'mesajul de după'
T2 = 'căzută: mesajul salvării apare oricum'
GREP = {'C01': T1, 'U01': T1, 'R01': T1, 'U02': T1, 'U03': T2}
