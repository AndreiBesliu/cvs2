# Lista de otrăvuri a feliei A.11d (sesiunea raportării, în cronologie; ADR 0262 §6), 24.11.2026, alese de autor: citirea
# tichetului în admin (autorul, sesiunea), serverul tichetelor (sesiunea ținută, forma ei), cronologia pe o sesiune (filtrul,
# forma), raportarea (sesiunea trimisă, dată de înregistrator, spusă în „ce mai pleacă”) și fila Tichete (secțiunea, filtrul).
# Unitarele și serverul se rulează cu `scripts/otravuri.py` (serverul în `firebase emulators:exec`, cu funcțiile); setul
# „e2e”, cu `scripts/otravuri-emulatoare.py`.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


D = 'src/admin/tichete/date.ts'
T = 'functions/src/tichete/actiuni.ts'
U = 'functions/src/utilizare/actiuni.ts'
R = 'src/app/Raportari.tsx'

o('T01', D, "    sesiune: esteSesiune(d['sesiune']) ? d['sesiune'] : null,", "    sesiune: typeof d['sesiune'] === 'string' ? d['sesiune'] : null,",
  'tichete', 'o sesiune cu altă formă (o cale) ajunge la cronologie')
o('T02', D, "    autor: typeof d['autor'] === 'string' && d['autor'] !== '' ? d['autor'] : null,", "    autor: typeof d['autor'] === 'string' ? d['autor'] : null,",
  'tichete', 'un autor gol cere cronologia unui cont gol')

o('S01', T, '        ...(sesiune === null ? {} : { sesiune }),\n', '', 'server-tichete', 'tichetul nu ține sesiunea')
o('S02', T, "  const sesiune = esteSesiune(d['sesiune']) ? d['sesiune'] : null;", "  const sesiune = typeof d['sesiune'] === 'string' ? d['sesiune'] : null;",
  'server-tichete', 'tichetul ține orice text drept sesiune')
o('S03', U, "    if (sesiune !== undefined) q = q.where('sesiune', '==', sesiune);\n", '', 'server-utilizare',
  'cronologia unei sesiuni aduce toate sesiunile')
o('S04', U, "  if (sesiune !== undefined && !esteSesiune(sesiune)) throw argument('sesiunea');\n", '', 'server-utilizare',
  'o sesiune cu altă formă trece, fără refuz')

o('E01', R, '          ...(sesiune === null ? {} : { sesiune }),\n', '', 'e2e', 'raportarea nu trimite sesiunea')
o('E02', 'src/app/utilizareLot.ts', '  preiaUtilizarea(ins.primeste, ins.pasi, sesiune);', '  preiaUtilizarea(ins.primeste, ins.pasi);', 'e2e',
  'înregistratorul nu-și dă sesiunea: nicio raportare n-o are')
o('E03', R, '{sesiune === null ? null : <li data-raport-date-sesiune', '{true ? null : <li data-raport-date-sesiune', 'e2e',
  '„Ce mai pleacă” nu spune sesiunea')
o('E04', 'src/admin/tichete/FilaTichete.tsx', 'poateActivitate && x.autor !== null && x.sesiune !== null ?', 'false ?', 'e2e',
  'fila Tichete nu arată sesiunea raportării')
o('E05', 'src/admin/utilizatori/Activitatea.tsx', 'cronologiaContului(con, uid, inainte.at(-1)?.primit, sesiune)', 'cronologiaContului(con, uid, inainte.at(-1)?.primit)',
  'e2e', 'sesiunea raportării arată toate sesiunile omului')

SETURI = {
    'tichete': ['test/unit/tichete.test.ts'],
    'server-tichete': ['functions/test/tichete.emulator.test.ts'],
    'server-utilizare': ['functions/test/utilizare.emulator.test.ts'],
}
E2E = ['test/e2e-emulator/tichete.emulator.spec.ts']
GREP = {k: 'raportarea din editor' for k in ['E01', 'E02', 'E03', 'E04', 'E05']}
