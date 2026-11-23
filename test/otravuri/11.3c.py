# Lista de otrăvuri a feliei 11.3↑c (proba urechilor la export, ADR 0210, varianta b), 18.11.2026, alese de autor: pragul
# fundului, plafonul celulelor, umplerea (în jos, în sus), lemnul înăuntrul părții, ordinea trecerilor, celulele tăiate;
# părțile (profilul exterior, urechile, tăietura prin foaie, o dată, mijlocul cutiei, coardele arcelor); legătura din
# workerul CAM (rezultatul, grupurile de după schimbarea sculei); avertismentul (câte se numesc, numele plăcuței, locul,
# mesajele aduse la cerere, foaia singură, „Toate foile”, câte mai sunt) și interfața (avertismentul exportului, forma de
# singular). Filtrul mutărilor (doar cele care ajung la fund) nu e în listă: nu schimbă niciun rezultat (o mutare cu
# capetele deasupra pragului nu taie prin foaie, cu nicio sculă), doar viteza (pe placa 11, 2 % din mutări: 10,7 față de
# 17,6 ms; pe un program cu buzunare mari, cât o simulare întreagă pe un fir).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit; e2e-ul, cu
# `CNCVS2_E2E_RETEA=127.0.5` și configul local (`.tmp/pw.config.ts`, portul worktree-ului).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


DS = 'src/sim/desprinse.ts'
PU = 'src/cam/partiUrechi.ts'
CC = 'src/jobs/calculCam.ts'
EC = 'src/ui/actiuniExportCalcul.ts'
ER = 'src/i18n/export.ro.ts'

# Rasterul și umplerea (unitare, pe hârtie și pe placa 11).
o('S01', DS, 'export const PRAG_FUND = 1e-3;', 'export const PRAG_FUND = 1e-1;', 'urechi', 'o buclă oprită la 0,01 mm deasupra fundului trece drept tăiată')
o('S02', DS, 'export const PLAFON_DESPRINSE = 1 << 22;', 'export const PLAFON_DESPRINSE = 1 << 20;', 'urechi', 'plafonul celulelor e de patru ori mai mic')
o('S03', DS, '    if (k >= nx) pune(k - nx);\n', '', 'urechi', 'umplerea nu coboară (nu intră printr-o ureche de sus)')
o('S04', DS, '    if (k < (ny - 1) * nx) pune(k + nx);\n', '', 'urechi', 'umplerea nu urcă (nu intră printr-o ureche de jos)')
o('S05', DS, '    if (lemn > 0 && !legata) desprinse.push(idx);', '    if (!legata) desprinse.push(idx);', 'urechi',
  'și o parte fără lemn înăuntru (scoasă toată) se spune desprinsă')
o('S06', DS, '      xs.sort((a, b) => a - b);\n', '', 'urechi', 'trecerile rândului nesortate: intervalele ies întoarse')
o('S07', DS, '          if (v === TAIAT) continue;\n', '', 'urechi', 'și celulele tăiate prin foaie trec drept lemn înăuntrul părții')
# Părțile (unitare).
o('P01', PU, "if (t.tip !== 'profil' || t.latura !== 'exterior' || t.urechi === null",
  "if (t.tip !== 'profil' || t.urechi === null", 'urechi', 'și profilele interioare cu urechi sunt părți')
o('P02', PU, "t.latura !== 'exterior' || t.urechi === null || t.adancime",
  "t.latura !== 'exterior' || t.adancime", 'urechi', 'și profilele fără urechi sunt părți')
o('P03', PU, ' || t.adancime < foaie.stoc.grosime - EPS_GROSIME) continue;', ') continue;', 'urechi',
  'și profilele care nu trec prin foaie sunt părți')
o('P04', PU, '    if (vazute.has(t.idLume)) continue;\n', '', 'urechi', 'un element tăiat de două profile cu urechi e două părți')
o('P05', PU, 'x: (k.minX + k.maxX) / 2, y: (k.minY + k.maxY) / 2', 'x: k.minX, y: k.minY', 'urechi', 'locul spus e colțul cutiei, nu mijlocul')
o('P06', PU, '    const pas = k.raza > tol ? 2 * Math.acos(1 - tol / k.raza) : Math.PI / 2;',
  '    const pas = k.raza > tol ? 4 * Math.acos(1 - tol / k.raza) : Math.PI / 2;', 'urechi', 'coardele arcelor de două ori mai lungi')
o('P07', PU, "    if (s.tip !== 'A' || !(Math.abs(s.bulge) > 1e-12)) continue;", '    continue;', 'urechi', 'arcele rămân o coardă')
# Workerul CAM (unitare, pe placa 11).
o('J01', CC, '    simulare, foaie: { latime, inaltime, grosime }, desprinse: desprinseFoii(doc, simulare),',
  '    simulare, foaie: { latime, inaltime, grosime }, desprinse: [],', 'urechi', 'exportul nu mai face proba')
o('J02', CC, 'grupuri: [{ scula: simulare.scula, mutari: simulare.mutari }, ...(simulare.apoi ?? [])],',
  'grupuri: [{ scula: simulare.scula, mutari: simulare.mutari }],', 'urechi', 'doar prima sculă (pe placa 11, V-ul numelor)')
# Avertismentul (unitare).
o('U01', EC, 'export const PIESE_DESPRINSE_NUMITE = 5;', 'export const PIESE_DESPRINSE_NUMITE = 4;', 'urechi', 'patru numite, nu cinci')
o('U02', EC, "    return valori !== '' ? valori : (i ? piese.get(i.piesa)?.nume?.trim() || null : null);",
  '    return i ? piese.get(i.piesa)?.nume?.trim() || null : null;', 'urechi', 'plăcuța fără valorile ei (doar locul)')
o('U03', EC, "    const loc = t('export.urechi.loc', { x: String(Math.round(d.x)), y: String(Math.round(d.y)) });",
  "    const loc = t('export.urechi.loc', { x: String(Math.round(d.y)), y: String(Math.round(d.x)) });", 'urechi', 'X și Y schimbate')
o('U04', EC, "  await cereMesaje('export');\n", '', 'urechi', 'mesajele exportului nu se cer: fără ele, exportul cade')
o('U05', EC, '    ...rest, avertismente: await cuDesprinse(doc, rest.avertismente, desprinse),',
  '    ...rest, avertismente: rest.avertismente,', 'urechi', 'exportul unei foi nu spune piesele desprinse')
o('U06', EC, '(await cuDesprinse(d, r.avertismente, r.desprinse)).map(', 'r.avertismente.map(', 'urechi',
  '„Toate foile” nu spune piesele desprinse')
o('U07', EC, '  const rest = desprinse.length - numite.length;', '  const rest = 0;', 'urechi', 'fără „și încă N”')
# Interfața (e2e).
o('E01', EC, '    ...rest, avertismente: await cuDesprinse(doc, rest.avertismente, desprinse),',
  '    ...rest, avertismente: rest.avertismente,', 'e2e', 'fereastra exportului nu spune piesa desprinsă')
o('E02', ER, "    one: 'o piesă se desprinde de foaie cât freza încă taie lângă ea,", "    one: 'o piesă se desprinde de foaie,", 'e2e',
  'singularul avertismentului, alt text')

SETURI = {
    'urechi': ['test/unit/desprinse.test.ts', 'test/unit/urechi.export.test.ts', 'test/unit/urechi.mesaje.test.ts'],
}
E2E = ['test/e2e/export-urechi.spec.ts']
