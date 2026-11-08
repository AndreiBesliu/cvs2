# Lista de otrăvuri a feliei 12.1↑c2 (după unirea lui 12.1↑b–c în `main`, „1 si 2 acum 3-6 dupa”: punctele 3, 5 și 6), 08.11.2026,
# alese de autor: viteza benzii (indexul contururilor: cercul arcului ținut pe segment, segmentele de lângă rază sărite după
# cutie; arcul cu cercul dat, în `geom/distanta.ts`), rândurile legate ale incrustațiilor în V în fereastra exportului, arborele
# („cu banda îngustă”) și lemnul din jurul dopului ales din panou.
# Nu se otrăvește afișarea refuzului alegerii din panou (`refuzJur`): acțiunea refuză doar cu o fereastră deschisă sau într-o
# filă care doar citește, unde lista e oprită (ca la rol); nici marja cutiei (`MARJA_CUTIE` = 0 ar schimba ceva doar la un ulp
# de cutie, pe care nicio probă nu-l nimerește: marja e o siguranță, nu o regulă).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), din worktree-ul feliei (în afara Drive-ului), după commit, cu
# CNCVS2_E2E_RETEA=127.0.1 și configul local pe portul 4174 (`.tmp/pw.config.ts`).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


AXA = 'src/cam/axaMediala.ts'
DIS = 'src/geom/distanta.ts'
DLG = 'src/ui/DialogExport.tsx'
ARB = 'src/ui/NivelPiesa.tsx'
PAN = 'src/app/PanouProprietati.tsx'

# ---- Viteza benzii: indexul contururilor (aceeași numărătoare, aceeași distanță ca segment cu segment) ----
o('V01', AXA, 'g.maxX < p.x - MARJA_CUTIE ||', 'g.maxX < p.x + 1 ||', 'index',
  'sărite și segmentele care trec de punct cu mai puțin de 1 mm (raza le taie)')
o('V02', AXA, 'y < g.minY - MARJA_CUTIE ||', 'y < g.minY + 0.5 ||', 'index', 'sărite segmentele cu raza în jumătatea lor de jos')
o('V03', AXA, 'y > g.maxY + MARJA_CUTIE) continue;', 'y > g.maxY - 0.5) continue;', 'index', 'sărite segmentele cu raza în jumătatea lor de sus')
o('V04', AXA, "      const cerc = s.tip === 'A' ? cerculArcului(a, b, s.bulge) : null;",
  "      const cerc = s.tip === 'A' ? cerculArcului(a, b, -s.bulge) : null;", 'index', 'cercul ținut pe segment, al arcului oglindit')
o('V05', AXA, '          d = Math.min(d, g.cerc ? distantaLaArcCerc(p, g.a, g.b, g.cerc) : distantaLaSegment(p, g.a, g.b, g.s));',
  "          d = Math.min(d, distantaLaSegment(p, g.a, g.b, g.cerc ? { tip: 'L' } : g.s));", 'index', 'distanța la arce, măsurată la coardă')
o('V06', AXA, '      n += g.cerc ? traversariArc(p, y, g.cerc) : traversariSegment(p, y, g.a, g.b, g.s);',
  "      n += traversariSegment(p, y, g.a, g.b, g.cerc ? { tip: 'L' } : g.s);", 'index', 'interiorul, cu arcele ca niște coarde')
o('V07', DIS, '    + (x1 > p.x && peArc(Math.atan2(h, x1 - centru.x), start, baleiaj) ? 1 : 0);', '    + 0;', 'geom',
  'arcul tăiat de rază doar în stânga centrului')
o('V08', DIS, '  if (peArc(u, start, baleiaj)) return Math.abs(Math.hypot(p.x - centru.x, p.y - centru.y) - raza);',
  '  if (peArc(u, start, baleiaj)) return Math.hypot(p.x - centru.x, p.y - centru.y) - raza;', 'geom', 'distanța la arc, cu semn')
o('V09', DIS, '  return (x0 > p.x && peArc(Math.atan2(h, x0 - centru.x), start, baleiaj) ? 1 : 0)', '  return (x0 > p.x ? 1 : 0)', 'geom',
  'tăietura din stânga numărată și în afara arcului')
o('V10', DIS, "  if (s.tip === 'A') return traversariArc(p, y, cerculArcului(a, b, s.bulge));",
  "  if (s.tip === 'A') return traversariArc(p, y, cerculArcului(b, a, s.bulge));", 'geom', 'interiorul segment cu segment, pe arcul oglindit')
o('V11', DIS, '  return distantaLaArcCerc(p, a, b, cerculArcului(a, b, bulge));', '  return distantaLaArcCerc(p, a, b, cerculArcului(a, b, -bulge));', 'index',
  'distanța segment cu segment, la arcul oglindit (indexul, cu cercul lui, rămâne bun)')

# ---- Rândurile legate ale incrustațiilor în V (fereastra exportului) ----
o('K01', DLG, "      p.incrustatie ? JSON.stringify(incrustatieVRand(p) ?? 'de necitit') : '',\n", '', 'e2e',
  'rândurile legate fără incrustație (cu alt joc sau altă bandă, tot legate)')
o('K02', DLG, "p.incrustatie ? JSON.stringify(incrustatieVRand(p) ?? 'de necitit') : ''", "p.incrustatie ? numar(p.jocInc) : ''", 'e2e',
  'rândurile legate doar după joc (banda ignorată)')

# ---- Arborele: „cu banda îngustă” ----
o('A01', ARB, "t(o.incrustatie.jurDop === 'banda' ? 'arbore.vcarve.incrustatie-banda' : 'arbore.vcarve.incrustatie', ",
  "t('arbore.vcarve.incrustatie', ", 'e2e', 'arborele nu spune banda')

# ---- Lemnul din jurul dopului ales din panou ----
o('P01', PAN, "p.operatii.map((o) => (o.incrustatie?.fel === 'v' ? { ...o, incrustatie: { ...o.incrustatie, jurDop: jur } } : o))",
  'p.operatii.map((o) => o)', 'e2e', 'alegerea din panou nu scrie nimic')
o('P02', PAN, '  const jurComun = incrustatii && jururi.every((j) => j === jururi[0]) ? jururi[0] ?? null : null;',
  '  const jurComun = incrustatii ? jururi[0] ?? null : null;', 'e2e', 'cu valori diferite, lista arată valoarea primei piese, nu „—”')

SETURI = {
    'index': ['test/unit/axaMediala.index.test.ts'],
    'index2': ['test/unit/axaMediala.index.test.ts', 'test/unit/vcarve.test.ts', 'test/unit/vcarve.fund.test.ts', 'test/unit/geom.distanta.test.ts'],
    'geom': ['test/unit/geom.distanta.test.ts'],
    'geom2': ['test/unit/geom.distanta.test.ts', 'test/unit/axaMediala.index.test.ts', 'test/unit/vcarve.test.ts', 'test/unit/cale.clic.oracol.test.ts'],
}
E2E = ['test/e2e/incrustatieBanda.spec.ts']
