# Lista de otrăvuri a feliei 3.Tl (roata conică în atelierul Easy 3Draw, ADR 0280), 19.11.2026, alese de autor: motorul
# (planul de divizare la 2·m și vârful conului, lățimea dinților, butucul și manșonul, unghiul conului din raport, profilul
# Tredgold de pe conul din spate, proiecția din vârf, unghiurile strict crescătoare pe flanc, cercul corpului dinților peste
# alezaj, conul din spate și cilindrul de sub picioare, straturile până la capete, gaura care nu încape, montajul perechii) și
# atelierul (numele cu butucul și gaura, „Ca LEGO 12” și „Ca LEGO 20”, perechea cu dinții schimbați, montajul perechii,
# dinții perechii, galeria).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit; setul „e2e” e
# `test/e2e/trenulet.conica.spec.ts` (pagina de sine stătătoare a planificatorului, din aceleași surse).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


E = 'extensii/trenulet/sursa/lego/lego.ts'
A = 'extensii/trenulet/sursa/planificator/atelier.ts'
K = 'const CONICA = { spate: 2, latime: 0.25, peretButuc: 1.2, liber: 0.4 };'

# Motorul (unitare).
o('U01', E, K, K.replace('spate: 2', 'spate: 1.5'), 'conica', 'planul de divizare la 1,5·m de fața din spate (vârful în afara grilei)')
o('U02', E, K, K.replace('latime: 0.25', 'latime: 0.2'), 'conica', 'dinții mai scurți decât R / 4')
o('U03', E, K, K.replace('peretButuc: 1.2', 'peretButuc: 0.8'), 'conica', 'butucul mai subțire în jurul găurii')
o('U04', E, K, K.replace('liber: 0.4', 'liber: 0.2'), 'conica', 'manșonul lung mai aproape de vârf (atinge manșonul perechii)')
o('U05', E, 'delta = Math.atan2(z, z2), rp = m * z / 2;', 'delta = Math.atan2(z2, z), rp = m * z / 2;', 'conica',
  'unghiul conului din raportul întors (la 12 / 36)')
o('U06', E, 'return { z, z2, m, delta, rp, rh, zp, zA: zp + rp * ctg, R: rp / Math.sin(delta) };',
  'return { z, z2, m, delta, rp, rh, zp, zA: zp + rp / ctg, R: rp / Math.sin(delta) };', 'conica', 'vârful conului în alt loc decât la m·(2 + z2 / 2)')
o('U07', E, 'const V = profilRoata(z / cd, m, e.jocDinti), zB = zp - rp * Math.tan(delta);',
  'const V = profilRoata(z, m, e.jocDinti), zB = zp - rp * Math.tan(delta);', 'conica', 'profilul roții drepte, nu al celei echivalente (Tredgold)')
o('U08', E, 'const t = (zA - zp) / (zA - (zB + rho * sd)), r = t * rho * cd, a = c + phi / cd;',
  'const t = 1, r = t * rho * cd, a = c + phi / cd;', 'conica', 'profilul de pe conul din spate, neproiectat din vârf pe planul de divizare')
o('U09', E, 'const t = (zA - zp) / (zA - (zB + rho * sd)), r = t * rho * cd, a = c + phi / cd;',
  'const t = (zA - zp) / (zA - (zB + rho * sd)), r = t * rho * cd, a = c + phi;', 'conica', 'unghiurile desfășurării luate ca pe roată (dinții subțiați)')
o('U10', E, 'const h = (hm = Math.min(hm - 1e-4, V.jum[i]!));', 'const h = (hm = Math.min(hm, V.jum[i]!));', 'conica',
  'unghiuri egale pe flanc: tăierea la conul din spate suprapune puncte (roțile mici se deschid)')
o('U11', E, 'else if (rgol) g = [cerc(0, 0, rgol + 0.05)];', 'else if (rgol) g = [cerc(0, 0, rgol + 0.6)];', 'conica',
  'corpul dinților oprit mai departe de alezaj (golul dintre el și butuc)')
o('U12', E, 'rb = rp + (Math.max(h, zR) - zp) * ctg;', 'rb = rp + (h - zp) * ctg;', 'conica',
  'sub picioarele dinților, conul din spate în loc de cilindru (pinionul în consolă)')
o('U13', E, 'zT = Math.min(zIn, zp + m * sd), zR = zp - 1.25 * m * sd;', 'zT = Math.min(zIn, zp + m * sd), zR = zp - m * sd;', 'conica',
  'picioarele dinților la spate, în alt loc')
o('U14', E, 'zT = Math.min(zIn, zp + m * sd), zR = zp - 1.25 * m * sd;', 'zT = Math.min(zIn, zp + 0.3 * m * sd), zR = zp - 1.25 * m * sd;', 'conica',
  'straturile dese se opresc înaintea capetelor dinților (conul din spate, întins drept până la capăt)')
o('U15', E, 'const hb = butuc === "scurt" ? zIn : Math.max(zIn, zA - rh - CONICA.liber);',
  'const hb = butuc === "scurt" ? zIn : Math.max(zIn, zA - CONICA.liber);', 'conica', 'manșonul lung până aproape de vârf')
o('U16', E, 'let sIn = Math.max(1 - CONICA.latime, rgol ? (rgol + CONICA.liber) / rIn : 0), g: Poli[] = [];',
  'let sIn = 1 - CONICA.latime, g: Poli[] = [];', 'conica', 'gaura păstrată și unde nu încape (fără avertisment)')
o('U17', E, 'b = conicaCote({ dinti: a.z2, pereche: a.z, modul: a.m });', 'b = conicaCote({ dinti: a.z, pereche: a.z2, modul: a.m });', 'conica',
  'montajul perechii, socotit ca al roții de acum')

# Atelierul (e2e).
o('E01', A, 'const b = d.butuc === "scurt" ? tr(", butuc scurt") : ""', 'const b = ""', 'e2e', 'butucul scurt nespus în nume')
o('E02', A, 'return tr`Roată conică ${d.dinti ?? 20} pentru ${d.pereche ?? 20}${g}${b}${m}`;', 'return tr`Roată conică ${d.dinti ?? 20} pentru ${d.pereche ?? 20}${b}${m}`;',
  'e2e', 'gaura nespusă în numele conicei')
o('E03', A, '{ dinti: 12, pereche: 12, modul: 1, gaura: "x", butuc: "scurt" }', '{ dinti: 12, pereche: 12, modul: 1, gaura: "r", butuc: "scurt" }', 'e2e',
  '„Ca LEGO 12” cu gaura de știft')
o('E04', A, '{ dinti: 20, pereche: 20, modul: 1, gaura: "r", butuc: "lung" }); editor(); schimbat(); };',
  '{ dinti: 20, pereche: 20, modul: 1, gaura: "r", butuc: "scurt" }); editor(); schimbat(); };', 'e2e', '„Ca LEGO 20” cu butucul scurt')
o('E05', A, 'a: Def = { ...d, dinti: d.pereche ?? 20, pereche: d.dinti ?? 20 }', 'a: Def = { ...d }', 'e2e', 'perechea, aceeași roată de două ori')
o('E06', A, 'a perechii, la ${fmt(a.fataPereche)} mm de axa acesteia, ${textGrila(a.fataPereche)}.', 'a perechii, la ${fmt(a.fata)} mm de axa acesteia, ${textGrila(a.fata)}.',
  'e2e', 'montajul perechii, spus ca al roții de acum')
o('E07', A, 'camp("#at-co-pereche", 8, 60, v => { p.pereche = Math.round(v); });', 'camp("#at-co-pereche", 8, 60, v => { p.pereche = 20; });', 'e2e',
  'dinții perechii: câmpul nu schimbă nimic')
o('E08', A, '["conica", "Roată conică"], ', '', 'e2e', 'conica lipsește din galerie')

SETURI = {
    'conica': ['test/unit/trenulet.conica.test.ts'],
}
E2E = ['test/e2e/trenulet.conica.spec.ts']
