# Lista de otrăvuri a feliei 28.8↑d-2 (banda dopului în V în grupul ei, cu desenul semifabricatului, ADR 0290), 24.11.2026, alese
# de autor: formulele (tăietura decupării la H·t + c, freza decupării doar cu decuparea, placa implicită S + H + 1, placa cea mai
# mică cu punțile, lățimea scrisă) față de `valoriBanda`, apoi fereastra (câmpurile benzii în grupul ei, desenul, decuparea,
# placa scrisă, lățimea ca în câmp, puntea).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă a ramurii, după commit; cele „e2e” cer build-ul.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


CAL = 'src/ui/exportDeseneCalcul.ts'
DES = 'src/ui/exportDesene.tsx'
DLG = 'src/ui/DialogExport.tsx'

o('B01', CAL, 'e: v.H * v.t + REZERVA_BANDA,', 'e: v.H * v.t,', 'desene', 'tăietura decupării fără rezervă, lipită de peretele dopului')
o('B02', CAL, 'b.decupare ? (b.frezaDecupare ?? b.fund) : b.fund', 'b.frezaDecupare ?? b.fund', 'desene', 'freza decupării lărgește banda și fără decupare')
o('B03', CAL, 'placa: b.placa ?? v.S + v.H + SUB_FATA_DOPULUI,', 'placa: b.placa ?? v.S + v.H,', 'desene', 'placa implicită fără lemnul de sub fața dopului')
o('B04', CAL, 'placaMinima: v.fata + b.puntiGrosime,', 'placaMinima: v.fata,', 'desene', 'placa cea mai mică fără punți')
o('B05', CAL, 'latime: b.latime ?? minima,', 'latime: minima,', 'desene', 'lățimea scrisă ignorată')

o('C01', DLG, "                      {vc && p.incrustatie && p.jurDop === 'banda' && (\n                      <div className=\"campuri-incrustatie\" data-banda={o.cheie}>",
  "                      {false && (\n                      <div className=\"campuri-incrustatie\" data-banda={o.cheie}>", 'e2e', 'grupul benzii fără câmpuri (nu se arată)')
o('C02', DLG, "                  case 'banda': return (c) => <DesenBanda", "                  case 'banda-x': return (c) => <DesenBanda", 'e2e',
  'grupul benzii fără desen')
o('C03', DLG, 'decupare={p.decupareBanda} placa=', 'decupare placa=', 'e2e', 'desenul ignoră bifa decupării')
o('C04', DLG, "placa={p.placaBanda.trim() === '' ? null : citesteNumar(p.placaBanda)}", 'placa={null}', 'e2e', 'desenul ignoră placa scrisă')
o('C05', DES, 'text={`${c.fz(latime ?? susLaMicron(M))} mm`}', 'text={`${c.f(M)} mm`}', 'e2e', 'lățimea benzii altfel decât în câmp (6,48 față de 6,485)')
o('C06', DES, '{pg > 0 && <rect className="cs" data-punte', '{pg < 0 && <rect className="cs" data-punte', 'e2e', 'puntea nedesenată')

SETURI = {
    'desene': ['test/unit/export.desene.test.ts'],
}
E2E = ['test/e2e/export.desene.spec.ts', 'test/e2e/incrustatieBanda.spec.ts']
