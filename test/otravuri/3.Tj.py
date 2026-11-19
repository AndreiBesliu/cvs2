# Lista de otrăvuri a feliei 3.Tj (roata cu anvelopă în atelierul Easy 3Draw, ADR 0280), 19.11.2026, alese de autor:
# motorul (cotele LEGO ale jantei și ale anvelopei, canalul nervurii și nervura, umerii, canalele benzii, blocurile și
# alternarea lor, varianta jantei, pragul spițelor, peretele benzii, grosimea feței, lățimea spițelor, găurile, marginile,
# setul de calibrare) și atelierul (spițele doar unde încap, fața plină spusă, „Pune janta și anvelopa”, numele, varianta
# trimisă motorului, câmpul din calibrare, „Ca LEGO”, câte spițe).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit; setul „e2e” e
# `test/e2e/trenulet.roata.spec.ts` (pagina de sine stătătoare a planificatorului, din aceleași surse).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


E = 'extensii/trenulet/sursa/lego/lego.ts'
A = 'extensii/trenulet/sursa/planificator/atelier.ts'

# Motorul (unitare).
o('U01', E, 'canal: 1.6, canalAd: 1.05, perete: 0.85,', 'canal: 1.2, canalAd: 1.05, perete: 0.85,', 'roata',
  'canalul nervurii prea îngust (nervura LEGO, de 2,8 mm, nu mai intră)')
o('U02', E, 'canal: 1.6, canalAd: 1.05, perete: 0.85,', 'canal: 1.6, canalAd: 0.85, perete: 0.85,', 'roata',
  'canalul nervurii prea puțin adânc (fundul peste vârful nervurii)')
o('U03', E, 'alezaj: 0.15, nervura: 1.4, nervuraVarf: 0.6, nervuraAd: 0.8,', 'alezaj: 0, nervura: 1.4, nervuraVarf: 0.6, nervuraAd: 0.8,',
  'roata', 'anvelopa fără strângere pe scaun')
o('U04', E, 'alezaj: 0.15, nervura: 1.4, nervuraVarf: 0.6, nervuraAd: 0.8,', 'alezaj: 0.15, nervura: 1.4, nervuraVarf: 0.6, nervuraAd: 0.5,',
  'roata', 'nervura anvelopei mai scurtă decât la LEGO')
o('U05', E, 'umar: 1.15, umarLat: 1.8, nervuri: 2.6, nervuraLat: 0.4, nervuraAdanc: 0.4,',
  'umar: 0.6, umarLat: 1.8, nervuri: 2.6, nervuraLat: 0.4, nervuraAdanc: 0.4,', 'roata', 'umerii teșiți mai puțin decât la LEGO')
o('U06', E, 'umar: 1.15, umarLat: 1.8, nervuri: 2.6, nervuraLat: 0.4, nervuraAdanc: 0.4,',
  'umar: 1.15, umarLat: 1.8, nervuri: 2.0, nervuraLat: 0.4, nervuraAdanc: 0.4,', 'roata', 'canalele benzii în alt loc decât la LEGO')
o('U07', E, 'umar: 1.15, umarLat: 1.8, nervuri: 2.6, nervuraLat: 0.4, nervuraAdanc: 0.4,',
  'umar: 1.15, umarLat: 1.8, nervuri: 2.6, nervuraLat: 0.4, nervuraAdanc: 0.2,', 'roata', 'canalele benzii pe jumătate de adânci')
o('U08', E, 'bloc: 0.6, butuc: 4.8, peretButuc: 1.6, spita: 1.8, ramura: 0.8, fata: 0.3,',
  'bloc: 0.3, butuc: 4.8, peretButuc: 1.6, spita: 1.8, ramura: 0.8, fata: 0.3,', 'roata', 'baza blocurilor coborâtă doar 0,3 mm')
o('U09', E, 'bloc: 0.6, butuc: 4.8, peretButuc: 1.6, spita: 1.8, ramura: 0.8, fata: 0.3,',
  'bloc: 0.6, butuc: 4.8, peretButuc: 1.6, spita: 1.8, ramura: 0.8, fata: 0.15,', 'roata', 'fața pe jumătate de groasă')
o('U10', E, 'const e = ef(), K = ROATA, perete = Math.max(K.perete, 0.04 * D)', 'const e = ef(), K = ROATA, perete = K.perete', 'roata',
  'peretele benzii nu crește cu diametrul jantei')
o('U11', E, 'return { rb, rh, spite: rb - rh >= 3.5 - 1e-9 };', 'return { rb, rh, spite: rb - rh >= 2.5 };', 'roata',
  'spițele cerute și unde nu încap (pragul de 3,5 mm coborât)')
o('U12', E, 'const Rs = D / 2 + (fel === "janta" ? e.jantaD / 2 : 0)', 'const Rs = D / 2 + (fel === "janta" ? e.jantaD : 0)', 'roata',
  'varianta jantei pusă pe rază întreagă (dublă)')
o('U13', E, 'jantaD: (P.varianta_janta - 3) * P.pas_janta,', 'jantaD: (P.varianta_janta - 3) * P.pas_janta / 2,', 'roata',
  'pasul variantei jantei înjumătățit')
o('U14', E, 'const tp = Math.min(6, Math.max(2, K.fata * W)), ws = Math.min(4.5, Math.max(K.spita, 0.07 * D))',
  'const tp = Math.min(6, Math.max(2, K.fata * W)), ws = K.spita', 'roata', 'spițele la fel de subțiri la orice jantă')
o('U15', E, 'const nb = Math.max(12, Math.round(2 * Math.PI * R / 3.2))', 'const nb = Math.max(12, Math.round(2 * Math.PI * R / 4))', 'roata',
  'mai puține blocuri decât unul la 3,2 mm')
o('U16', E, 'tri.push(...strung(k % 2 ? pSus : pJos, a0, a1, 0, 0, n));', 'tri.push(...strung(pJos, a0, a1, 0, 0, n));', 'roata',
  'blocurile toate jos (nu mai alternează)')
o('U17', E, 'const zona = W * 0.3;', 'const zona = W * 0.2;', 'roata', 'umerii cu blocuri mai înguști')
o('U18', E, 'P = { ...salvat, varianta_janta: v };', 'P = { ...salvat, varianta_janta: 3 };', 'roata', 'toate jantele de probă la fel')
o('U19', E, 'for (let k = 0; k < v; k++) {', 'for (let k = 0; k < 1; k++) {', 'roata', 'jantele de probă fără numărul lor pe față')
o('U20', E, 'Math.min(150, Math.max(12.6, nr(janta, 16.8)))', 'Math.min(150, Math.max(8, nr(janta, 16.8)))', 'roata',
  'janta mai mică decât 12,6 (canalul ar intra în butuc)')
o('U21', E, 'if (fel !== "janta" && Dt < D + 4)', 'if (fel !== "janta" && Dt < D + 2)', 'roata', 'anvelopa cu doar 1 mm peste jantă')
o('U22', E, 'const g: Poli | null = gaura === "r" ? cerc(0, 0, e.gauraD / 2) : gaura === "nu" ? null : cruce(0, 0, e.axGauraD, e.axGauraLat);',
  'const g: Poli | null = gaura === "r" ? cruce(0, 0, e.axGauraD, e.axGauraLat) : gaura === "nu" ? null : cerc(0, 0, e.gauraD / 2);',
  'roata', 'gaura rotundă și crucea schimbate între ele')
o('U23', E, 'if (fata === "drepte") tri.push(...prisma(bara(u(r0, 0), u(r1, 0), ws), 0, tp));',
  'if (fata === "drepte") tri.push(...prisma(bara(u(r0, 0), u(r1, 0), ws), 0, tp), ...prisma(bara(u(r0, 0.2), u(r1, 0.2), ws), 0, tp));',
  'roata', 'câte două spițe drepte în loc de una')
o('U24', E, 'const N = Math.round(Math.min(12, Math.max(3, nr(nrSpite, 5))))', 'const N = Math.round(Math.min(16, Math.max(3, nr(nrSpite, 5))))',
  'roata', 'peste 12 spițe')

# Atelierul (e2e).
o('E01', A, 'else if (p.spite !== "disc" && !Lego.spiteIncap(p.janta ?? 16.8, p.gaura ?? "x")) p.spite = "disc";', '', 'e2e',
  'numele pomenește spițe și unde nu încap')
o('E02', A, '${faraJanta ? "" : `${!Lego.spiteIncap(p.janta, p.gaura) ?', '${faraJanta ? "" : `${false ?', 'e2e',
  'fața plină nespusă: alegerea spițelor și la janta mică')
o('E03', A, '    pune(janta, n); pune(anvelopa, n);', '    pune(janta, n);', 'e2e', '„Pune janta și anvelopa” pune doar janta')
o('E04', A, 'if (d.fel === "janta") return tr`Jantă Ø ${fmt(d.janta ?? 16.8)} × ${fmt(d.lat ?? 13.6)}${s}${g}`;',
  'if (d.fel === "janta") return tr`Jantă Ø ${fmt(d.janta ?? 16.8)}${s}${g}`;', 'e2e', 'numele jantei fără lățime')
o('E05', A, 'varianta_dinti: setari.varianta_dinti, varianta_janta: setari.varianta_janta,', 'varianta_dinti: setari.varianta_dinti,', 'e2e',
  'varianta jantei din calibrare nu ajunge la motor')
o('E06', A, '["varianta_dinti", "Varianta roților dințate"], ["varianta_janta", "Varianta jantei"]]', '["varianta_dinti", "Varianta roților dințate"]]',
  'e2e', 'fila Calibrare fără câmpul jantei')
o('E07', A, '$("#at-ro-lego").onclick = () => { p.diam = 30.4; p.janta = 16.8; p.lat = 13.6; editor(); schimbat(); };',
  '$("#at-ro-lego").onclick = () => { p.diam = 30.4; p.janta = 16.8; editor(); schimbat(); };', 'e2e', '„Ca LEGO” lasă lățimea cum era')
o('E08', A, 'const b = d.banda === "neteda" ? tr(", netedă") : d.banda === "blocuri" ? tr(", cu blocuri") : "";',
  'const b = d.banda === "neteda" ? tr(", netedă") : "";', 'e2e', 'banda cu blocuri nu apare în nume')
o('E09', A, 'camp("#at-ro-nr", 3, 12, v => { p.nrSpite = Math.round(v); });', 'camp("#at-ro-nr", 3, 12, v => { p.nrSpite = 5; });', 'e2e',
  'câte spițe: câmpul nu schimbă nimic')

SETURI = {
    'roata': ['test/unit/trenulet.roata.test.ts'],
}
E2E = ['test/e2e/trenulet.roata.spec.ts']
