# Lista de otrăvuri a feliei A.11b (pașii atașați la o raportare; ADR 0262 §4), 24.11.2026, alese de autor: citirea în
# admin, serverul tichetelor (scrierea, verificarea, auditul), fereastra raportării (pașii doar cu bifa, bifa, lista „ce mai
# pleacă”) și fila Tichete (pașii, numele acțiunilor).
# Unitarele și serverul se rulează cu `scripts/otravuri.py` (serverul în `firebase emulators:exec`, cu funcțiile); setul
# „e2e”, cu `scripts/otravuri-emulatoare.py`.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


A = 'functions/src/tichete/actiuni.ts'
R = 'src/app/Raportari.tsx'

o('T01', 'src/admin/tichete/date.ts', "    pasi: pasiDin(d['pasi']),", '    pasi: [],', 'tichete', 'adminul nu citește pașii tichetului')

o('S01', A, '        ...(pasi.length > 0 ? { pasi } : {}),\n', '', 'server', 'serverul nu scrie pașii în tichet')
o('S02', A, "  const pasi = pasiDin(d['pasi']);", "  const pasi = (Array.isArray(d['pasi']) ? d['pasi'] : []) as never[];", 'server',
  'serverul scrie pașii așa cum vin, cu textul omului')
o('S03', A, ' pasi: pasi.length, poza: meta,', ' poza: meta,', 'server', 'auditul nu spune câți pași au venit')

o('E01', R, '          ...(cuPasi && pasi.length > 0 ? { pasi } : {}),\n', '', 'e2e', 'bifa nu trimite nimic')
o('E02', R, 'disabled={pasi.length === 0}', 'disabled', 'e2e', 'bifa nu se poate bifa niciodată')
o('E03', R, '{cuPasi && pasi.length > 0 ? <li data-raport-date-pasi', '{false ? <li data-raport-date-pasi', 'e2e', '„Ce mai pleacă” nu spune pașii')
o('E04', 'src/admin/tichete/FilaTichete.tsx', "          {x.pasi.length > 0 ? <PasiDinainte", "          {false ? <PasiDinainte", 'e2e',
  'fila Tichete nu arată pașii')
o('E05', 'src/admin/PaginaAdmin.tsx', ' tinta={tintaTichete} aducator={aducator} />', ' tinta={tintaTichete} />', 'e2e',
  'fila Tichete nu primește catalogul: pașii fără nume')
o('E06', R, '...(cuPasi && pasi.length > 0 ? { pasi } : {})', '...(pasi.length > 0 ? { pasi } : {})', 'e2e', 'pașii pleacă și fără bifă')

SETURI = {
    'tichete': ['test/unit/tichete.test.ts'],
    'server': ['functions/test/tichete.emulator.test.ts'],
}
E2E = ['test/e2e-emulator/tichete.emulator.spec.ts']
GREP = {k: 'raportarea din editor' for k in ['E01', 'E02', 'E03', 'E04', 'E05', 'E06']}
