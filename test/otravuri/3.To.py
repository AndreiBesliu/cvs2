# Lista de otrăvuri a feliei 3.To (șenila în atelierul Easy 3Draw, ADR 0280), 21.11.2026, alese de autor: zala (pasul, limba
# și crestătura cu jocul lor, fălcile, pereții canalului, obrajii teșiți, bolțul, clema și gura ei, aripile, găurile de știft),
# pinionul (scobiturile și jocul lor, raza lor, vârful și limita lui la pinioanele mici, discul, butucul, plaja dinților și
# avertismentul ei), montajul (lungimea pe coarde, unghiurile înfășurării, zalele, pragul pinioanelor care s-ar atinge, distanța
# la care stă întinsă) și atelierul (galeria,
# numele, piesa fără câmpurile editorului, textul montajului cu „de”, „Fă șenila”, câmpurile și alegerile) și traducerea.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit; setul „e2e” e
# `test/e2e/trenulet.senila.spec.ts` (pagina de sine stătătoare a planificatorului, din aceleași surse).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


E = 'extensii/trenulet/sursa/lego/lego.ts'
A = 'extensii/trenulet/sursa/planificator/atelier.ts'
T = 'extensii/trenulet/sursa/planificator/texte.en.json'
K = ('  const SENILA = { pas: 12, lat: 19.2, placa: 3.2, zb: 5.6, aripa: [-12.4, -1.2], limba: [-14.8, -4.4], xl: 5.45, xn: 5.75, '
     'obraz: 7.2, obrazY: 2.4,')
K2 = '    obrazZ: 8.4, falci: [3.2, 5.45], zid: [-10, -4.4], zidZ: 8.4, gauraX: 8, gauraY: -6.8, disc: 4, varf: 1, butucR: 6, butucZ: 8 };'

# Zala (unitare).
o('U01', E, K, K.replace('pas: 12,', 'pas: 12.5,'), 'senila', 'pasul de 12,5 (clema nu mai stă pe bolțul zalei următoare, pinionul altă rază)')
o('U02', E, K, K.replace('xn: 5.75,', 'xn: 5.6,'), 'senila', 'crestătura de ±5,6, fără joc față de limba LEGO')
o('U03', E, K, K.replace('xl: 5.45,', 'xl: 5.75,'), 'senila', 'limba cât crestătura (zalele se ating)')
o('U04', E, K2, K2.replace('falci: [3.2, 5.45]', 'falci: [2.0, 5.45]'), 'senila', 'fălcile intră în canalul discului')
o('U05', E, K2, K2.replace('zid: [-10, -4.4]', 'zid: [-10, -2.0]'), 'senila', 'pereții până lângă bolț (în cârligul zalei de dinainte)')
o('U06', E, K2, K2.replace('zidZ: 8.4', 'zidZ: 7.0'), 'senila', 'pereții mai joși decât la LEGO')
o('U07', E, 'const obraz: Poli = [[-4.2, S.placa - 0.2], [-1.0, S.placa - 0.2], [S.obrazY,',
  'const obraz: Poli = [[-4.2, S.placa - 0.2], [S.obrazY, S.placa - 0.2], [S.obrazY,', 'senila',
  'obrajii fără teșitură (cad peste aripile zalei de dinainte)')
o('U08', E, 'tri.push(...pe(cerc(0, S.zb, rb, N_CERC), -(xn + 0.8), xn + 0.8));',
  'tri.push(...pe(cerc(0, S.zb + 0.5, rb, N_CERC), -(xn + 0.8), xn + 0.8));', 'senila', 'bolțul mai sus cu 0,5')
o('U09', E, 'const falca = sectiuneC(ri, ro, P.clema_gura, Math.PI / 2, yc, S.zb),',
  'const falca = sectiuneC(ri, ro, P.clema_gura, Math.PI / 2, yc + 0.5, S.zb),', 'senila', 'clema mutată cu 0,5 de pe bolțul zalei următoare')
o('U10', E, 'const falca = sectiuneC(ri, ro, P.clema_gura, Math.PI / 2, yc, S.zb),',
  'const falca = sectiuneC(ri, ro, P.clema_gura, -Math.PI / 2, yc, S.zb),', 'senila', 'gura clemei în jos, spre placă')
o('U11', E, K2, K2.replace('gauraX: 8,', 'gauraX: 7,'), 'senila', 'găurile de știft la ±7, nu pe grila LEGO')
o('U12', E, K, K.replace('aripa: [-12.4, -1.2]', 'aripa: [-13.2, -1.2]'), 'senila', 'aripile până la ale zalei următoare (fără cei 0,8 mm)')
# Pinionul (unitare).
o('U13', E, 'rho = P.bara_d / 2 + e.jocDinti;', 'rho = P.bara_d / 2;', 'senila', 'scobiturile fără jocul dinților')
o('U14', E, 'return { z, R: SENILA.pas / 2 / Math.sin(Math.PI / z) };', 'return { z, R: SENILA.pas / 2 / Math.sin(Math.PI / z) + 0.3 };', 'senila',
  'scobiturile pe altă rază decât bolțurile șenilei întinse')
o('U15', E, 'const ra = Math.min(R + SENILA.varf, R * Math.cos(Math.PI / z) + SENILA.zb - SENILA.placa - 0.3);',
  'const ra = R + SENILA.varf;', 'senila', 'vârful nelimitat (la 6 dinți atinge placa zalei)')
o('U16', E, K2, K2.replace('varf: 1,', 'varf: 0.5,'), 'senila', 'vârful dinților la R + 0,5')
o('U17', E, K2, K2.replace('disc: 4,', 'disc: 6,'), 'senila', 'discul gros de 6 (atinge fălcile și pereții)')
o('U18', E, K2, K2.replace('butucR: 6,', 'butucR: 16.5,'), 'senila', 'butucul mare (atinge zalele)')
o('U19', E, 'const z = Math.round(Math.min(40, Math.max(6, nr(dinti, 10))));', 'const z = Math.round(Math.min(60, Math.max(6, nr(dinti, 10))));', 'senila',
  'plaja dinților până la 60')
o('U20', E, 'if (z !== +dinti) avert.push(tr`Un pinion de șenilă', 'if (false) avert.push(tr`Un pinion de șenilă', 'senila', 'dinții în afara plajei, nespuși')
# Montajul (unitare).
o('U21', E, 'zale = Math.ceil(L / SENILA.pas - 1e-9)', 'zale = Math.floor(L / SENILA.pas)', 'senila', 'zalele rotunjite în jos (șenila nu ajunge)')
o('U22', E, 'const aproape = d < a.R + b.R + 2 * SENILA.varf + 1;', 'const aproape = d < a.R + b.R + 2 * SENILA.varf;', 'senila',
  'pinioanele lipite, fără milimetrul dintre vârfuri')
o('U23', E, 'if (lung(m) < tinta) lo = m; else hi = m;', 'if (lung(m) < tinta) hi = m; else lo = m;', 'senila', 'bisecția întinsei întoarsă')
o('U24', E, 'const r1 = a.z * SENILA.pas / (2 * Math.PI), r2 = b.z * SENILA.pas / (2 * Math.PI), dr = r2 - r1;',
  'const r1 = a.R, r2 = b.R, dr = r2 - r1;', 'senila', 'lungimea pe arcele cercului bolțurilor (cureaua pe R; zalele sunt coarde)')
o('U25', E, 'r1 * (Math.PI - 2 * al) + r2 * (Math.PI + 2 * al)', 'r1 * (Math.PI + 2 * al) + r2 * (Math.PI - 2 * al)', 'senila',
  'unghiurile înfășurării întoarse (pinionul mic cuprins mai mult)')

# Atelierul (e2e).
o('E01', A, '["roata", "Roată cu anvelopă"], ["senila", "Șenilă"]]]', '["roata", "Roată cu anvelopă"]]]', 'e2e', 'șenila lipsește din fila Roți')
o('E02', A, 'return d.gauriStift === "nu" ? tr("Zală de șenilă, fără găuri") : tr("Zală de șenilă");',
  'return d.gauriStift === "da" ? tr("Zală de șenilă, fără găuri") : tr("Zală de șenilă");', 'e2e', 'numele zalei cu găurile întoarse')
o('E03', A, 'if (t === "senila") { delete p.pereche; delete p.distanta;', 'if (t === "senila") {', 'e2e',
  'montajul intră în piesă (zala din editor e alt rând decât cele de la „Fă șenila”)')
o('E04', A, 'const cuDe = (n: number) => n % 100 >= 20 ||', 'const cuDe = (n: number) => n % 100 >= 10 ||', 'e2e', '„10 de știfturi”')
o('E05', A, 'gauriStift: p.gauriStift === "nu" ? "nu" : "da" }, n * m.zale);', 'gauriStift: p.gauriStift === "nu" ? "nu" : "da" }, n);', 'e2e',
  '„Fă șenila” pune o singură zală')
o('E06', A, 'alege("#at-sn-repede", v => { p.dinti = +v; });', 'alege("#at-sn-repede", v => { p.dinti = 10; });', 'e2e', 'pinionul repede nu schimbă nimic')
o('E07', A, 'if (v >= 2 && v <= 60) { p.distanta = v; editor(); } };', 'if (v >= 2 && v <= 60) { p.distanta = 8; editor(); } };', 'e2e',
  'distanța dintre axe: câmpul nu schimbă montajul')
o('E08', A, 'if (m.aproape) return tr`Pinioanele de ${m.z1} și ${m.z2} s-ar atinge cu axele la',
  'if (false) return tr`Pinioanele de ${m.z1} și ${m.z2} s-ar atinge cu axele la', 'e2e', 'pinioanele care s-ar atinge, nespuse')
o('E09', A, 'alege("#at-sn-gauri", v => { p.gauriStift = v; });', 'alege("#at-sn-gauri", v => { p.gauriStift = "da"; });', 'e2e',
  'găurile de știft: alegerea nu schimbă nimic')
o('E10', A, 'alege("#at-sn-piesa", v => { p.piesa = v; });', 'alege("#at-sn-piesa", v => { p.piesa = "zala"; });', 'e2e', 'piesa: pinionul nu se poate alege')

# Traducerea (unitare).
o('T01', T, '"Șenilă": "Track",', '"Șenilă": "",', 'engleza', 'numele șenilei, netradus')

SETURI = {
    'senila': ['test/unit/trenulet.senila.test.ts'],
    'engleza': ['test/unit/trenulet.engleza.test.ts'],
}
E2E = ['test/e2e/trenulet.senila.spec.ts']

for x in O:
    assert x['vechi'] != x['nou'], x['id']
