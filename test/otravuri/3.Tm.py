# Lista de otrăvuri a feliei 3.Tm (roata coroană în atelierul Easy 3Draw, ADR 0280), 19.11.2026, alese de autor: motorul
# (planul de divizare la 4·m și axul pinionului, înălțimile și razele dinților, pragul de grosime, jocul de la fundul golului
# și prelungirea capului doar sub capul real, plafonul golului de sub el, punctul secțiunii pe cilindru la asin, baleiajul
# până la ieșirea dintelui, pinionul-cuțit îngroșat cu jocul, rostogolirea pe rază, butucul, discul și alezajul, montajul,
# avertismentele) și atelierul (numele cu gaura și butucul, „Ca LEGO 24 (3650)”, pinionul ales repede, perechea cu pinionul,
# gaura și grosimea lui, montajul spus, perechea care nu se prinde, galeria) și traducerea.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit; setul „e2e” e
# `test/e2e/trenulet.coroana.spec.ts` (pagina de sine stătătoare a planificatorului, din aceleași surse).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


E = 'extensii/trenulet/sursa/lego/lego.ts'
A = 'extensii/trenulet/sursa/planificator/atelier.ts'
T = 'extensii/trenulet/sursa/planificator/texte.en.json'
K = 'const COROANA = { jos: 4, pas: 0.2, inaltimi: 16, dinteMin: 0.15, adanc: 0.25, inauntru: 2.5, afara: 2 };'

# Motorul (unitare).
o('U01', E, K, K.replace('jos: 4', 'jos: 3.5'), 'coroana', 'planul de divizare la 3,5·m de fața de jos (axul pinionului în afara grilei)')
# U02 a scăpat la prima rulare (`b5b409c3`): cu 4 înălțimi, flancul se abate cu ~0,10 mm de înfășurătoare chiar deasupra
# capului real, o fâșie pe care proba perechii (vârfuri în plasă) n-o vede. A prins-o proba nouă „plasa e înfășurătoarea”.
o('U02', E, K, K.replace('inaltimi: 16', 'inaltimi: 4'), 'coroana', 'înălțimile dintelui prea rare (flancul tăiat drept între ele)')
o('U03', E, K, K.replace('dinteMin: 0.15', 'dinteMin: 0.05'), 'coroana', 'dinții duși până unde ies subțiri ca o foaie')
o('U04', E, K, K.replace('adanc: 0.25', 'adanc: 0'), 'coroana', 'fără jocul de la fundul golului (golul se închide sub capul pinionului)')
o('U05', E, K, K.replace('inauntru: 2.5', 'inauntru: 0.2'), 'coroana', 'dinții opriți aproape de raza de rostogolire, înăuntru')
o('U06', E, K, K.replace('afara: 2', 'afara: 0.3'), 'e2e', 'dinții opriți aproape de raza de rostogolire, în afară')
o('U07', E, 'u = Math.abs(r * Math.asin(Math.max(-1, Math.min(1, y / r))) - k * phi);', 'u = Math.abs(y - k * phi);', 'coroana',
  'secțiunea pinionului pusă pe cilindru ca în plan (jocul scade la pinioanele mari)')
# U08 a scăpat la prima rulare (`b5b409c3`): practic echivalentă. Dintele care iese din zona dinților aproape că nu mai lărgește
# golul: față de baleiajul până la ieșire, plasa diferă cu cel mult 0,003 mm la modulul 1 (24 / 8 … 80 / 40) și cu 0,031 mm la
# modulul 3 (40 / 40, colțul de sus dinăuntru, jocul 0,25), cât zgomotul eșantionării pe φ (~0,006·m): o probă n-o poate
# despărți fără să cadă din întâmplare (`.tmp/referinta-coroana.cjs`, `.tmp/rezolutie-coroana.cjs`). Codul rămâne marginea pe
# construcție: taie tot ce taie mutantul, plus colțul acela.
o('U08', E, 'for (const [x, y] of dinte) { const rho = Math.hypot(x, y); if (rho > r1 - m) phiMax = Math.max(phiMax, Math.acos((r1 - m) / rho) + Math.abs(Math.atan2(x, -y))); }',
  'phiMax = Math.min(Math.PI / 2, 2.6 * 2 * Math.PI / z1);', 'coroana', 'baleiajul de ±2,6 pași (pinionul de 40 iese pe la jumătate)')
o('U09', E, 'if (t <= tCap) for (let e = 0; e + 1 < E.length; e++) taie(E[e]!, E[e + 1]!);', 'for (let e = 0; e + 1 < E.length; e++) taie(E[e]!, E[e + 1]!);', 'coroana',
  'prelungirea capului taie și deasupra capului real (flancul subțiat unde pinionul nu ajunge)')
o('U10', E, 'if (iSus > 0) for (let i = 0; i < iSus; i++) gol[i] = Math.min(gol[i]!, gol[iSus]!);',
  'if (false) for (let i = 0; i < iSus; i++) gol[i] = Math.min(gol[i]!, gol[iSus]!);', 'coroana', 'fără plafonul golului de sub capul real (crestătura și consola)')
o('U11', E, 'if (iSus > 0) for (let i = 0; i < iSus; i++) gol[i] = Math.min(gol[i]!, gol[iSus]!);',
  'if (iSus > 0) for (let i = 0; i < ts.length; i++) gol[i] = Math.min(gol[i]!, gol[iSus]!);', 'coroana', 'plafonul golului pe toată înălțimea (dinții prea groși sus)')
o('U12', E, 'P = profilRoata(z1, m, -joc)', 'P = profilRoata(z1, m, 0)', 'coroana', 'pinionul-cuțit neîngroșat (jocul doar pe jumătate)')
o('U13', E, 'tA = zp + r1, k = r * z1 / z2;', 'tA = zp + r1, k = r1;', 'coroana', 'coroana rostogolită ca la raza de rostogolire, pe toate razele')
o('U14', E, 'Math.min(...coroanaDinte(q, r, joc)) >= COROANA.dinteMin * q.m;', 'Math.min(...coroanaDinte(q, r, joc)) >= -1;', 'coroana',
  'razele dinților fără pragul de grosime (dinții duși până la margini)')
o('U15', E, 'if (rOut - rIn < m - 1e-9) avert.push(', 'if (rOut - rIn < 0.5 * m - 1e-9) avert.push(', 'coroana', 'dinții scurți nespuși')
o('U16', E, 'tri.push(...butucRoata(gaura, rh, butuc === "scurt" ? tT : 2 * zp));', 'tri.push(...butucRoata(gaura, rh, butuc === "scurt" ? tT : 2 * zp - 1));', 'coroana', 'butucul lung mai scurt decât la 3650')
o('U17', E, 'tri.push(...butucRoata(gaura, rh, butuc === "scurt" ? tT : 2 * zp));', 'tri.push(...butucRoata(gaura, rh, butuc === "scurt" ? tR : 2 * zp));', 'coroana', 'butucul scurt doar până la disc')
o('U18', E, 'rgol ? [cerc(0, 0, rgol + 0.05)] : [], 0, tR));', 'rgol ? [cerc(0, 0, rgol + 0.6)] : [], 0, tR));', 'coroana',
  'discul oprit mai departe de alezaj (golul dintre el și butuc)')
o('U19', E, 'rgol ? [cerc(0, 0, rgol + 0.05)] : [], 0, tR));', 'rgol ? [cerc(0, 0, rgol + 0.05)] : [], 0, tR - 0.5));', 'coroana',
  'discul mai jos decât piciorul dinților')
o('U20', E, 'grosime: Math.max(3.8, Math.ceil((rOut - rIn + 0.6) * 10 - 1e-6) / 10)', 'grosime: 3.8', 'coroana',
  'pinionul de 3,8 și când nu acoperă dinții')
o('U21', E, 'inCale: q.axa - 2.4 < 2 * q.zp + 0.2', 'inCale: q.axa + 2.4 < 2 * q.zp + 0.2', 'coroana', 'butucul lung nu mai e în calea axului pinionului de 8')
o('U22', E, 'axa: zp + r1 };', 'axa: zp + r1 + 0.5 };', 'coroana', 'axul pinionului în alt loc')
o('U23', E, 'tT: zp + m,', 'tT: zp + 1.25 * m,', 'coroana', 'capetele dinților mai sus (fără jocul de sub piciorul pinionului)')
o('U24', E, 'tR: zp - 1.25 * m,', 'tR: zp - m,', 'coroana', 'picioarele dinților mai sus (fără jocul de sub capul pinionului)')
o('U25', E, 'if (z2 !== +dinti || q.z1 !== +pinion) avert.push(', 'if (z2 !== +dinti) avert.push(', 'coroana', 'pinionul în afara plajei, nespus')
o('U26', E, 'for (let k = 0; k < z2; k++) {\n      const c = 2 * Math.PI * k / z2, sus', 'for (let k = 0; k < z2 - 1; k++) {\n      const c = 2 * Math.PI * k / z2, sus', 'coroana',
  'un dinte lipsă')
o('U27', E, '  rs.push(rOut);\n', '\n', 'coroana', 'dinții opriți la ultima felie dinaintea capătului dinafară')

# Atelierul (e2e).
o('E01', A, 'tr`Roată coroană ${d.dinti ?? 24} pentru pinionul de ${d.pinion ?? 8}${g}${b}${m}`', 'tr`Roată coroană ${d.dinti ?? 24} pentru pinionul de ${d.pinion ?? 8}${b}${m}`',
  'e2e', 'gaura nespusă în numele coroanei')
o('E02', A, 'tr`Roată coroană ${d.dinti ?? 24} pentru pinionul de ${d.pinion ?? 8}${g}${b}${m}`', 'tr`Roată coroană ${d.dinti ?? 24} pentru pinionul de ${d.pinion ?? 8}${g}${m}`',
  'e2e', 'butucul scurt nespus în numele coroanei')
o('E03', A, 'Object.assign(p, { dinti: 24, pinion: 8, modul: 1, gaura: "x", butuc: "lung" }); editor(); schimbat(); };',
  'Object.assign(p, { dinti: 24, pinion: 16, modul: 1, gaura: "x", butuc: "lung" }); editor(); schimbat(); };', 'e2e', '„Ca LEGO 24 (3650)” cu pinionul de 16')
o('E04', A, 'alege("#at-cr-repede", v => { p.pinion = +v; });', 'alege("#at-cr-repede", v => { p.pinion = 8; });', 'e2e', 'pinionul ales repede nu schimbă nimic')
o('E05', A, 'dinti: a.z1, fel: "drepti", grosime: a.grosime', 'dinti: a.z2, fel: "drepti", grosime: a.grosime', 'e2e', 'perechea: pinionul cu dinții coroanei')
o('E06', A, 'gaura: d.gaura ?? "x" };', 'gaura: "x" };', 'e2e', 'perechea: pinionul cu gaura de ax, oricare ar fi a coroanei')
o('E07', A, 'grosime: a.grosime, gaura', 'grosime: 3.8, gaura', 'e2e', 'perechea: pinionul de 3,8, oricât de lungi ar fi dinții coroanei')
o('E08', A, 'const butuc = d.butuc !== "scurt" && a.inCale ? tr`', 'const butuc = d.butuc !== "scurt" ? tr`', 'e2e', 'butucul lung spus în cale și la pinionul de 16')
o('E09', A, 'if (!a.prinde) { toast(textCoroana(d)); return; }', 'if (false) { toast(textCoroana(d)); return; }', 'e2e',
  'perechea care nu se prinde intră în listă')
o('E10', A, 'if (!a.prinde) return tr`Pinionul de ${a.z1} nu se prinde cu o coroană de ${a.z2}: alege o coroană mai mare.`;', '', 'e2e',
  'montajul unei perechi care nu se prinde, spus cu numere')
o('E11', A, '${textGrila(a.axa)}, și întâlnește', '${textGrila(a.mijloc)}, și întâlnește', 'e2e', 'grila spusă pentru mijlocul pinionului, nu pentru ax')
o('E12', A, 'camp("#at-cr-dinti", 12, 80, v => { p.dinti = Math.round(v); });', 'camp("#at-cr-dinti", 12, 80, v => { p.dinti = 24; });', 'e2e',
  'dinții coroanei: câmpul nu schimbă nimic')
o('E13', A, '["coroana", "Roată coroană"], ', '', 'e2e', 'coroana lipsește din galerie')

# Traducerea (unitare).
o('T01', T, '"Roată coroană": "Crown gear",', '"Roată coroană": "",', 'engleza', 'numele coroanei, netradus')

SETURI = {
    'coroana': ['test/unit/trenulet.coroana.test.ts'],
    'engleza': ['test/unit/trenulet.engleza.test.ts'],
}
E2E = ['test/e2e/trenulet.coroana.spec.ts']
