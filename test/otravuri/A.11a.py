# Lista de otrăvuri a feliei A.11a (pașii dinaintea unei erori; ADR 0262 §4), 24.11.2026, alese de autor: pașii din
# evenimente (timpul față de eroare, plafonul, zona, codul, rezultatul), verificarea serverului (câmpurile, felul, id-ul, zona,
# rezultatul, timpul, ultimii 100), captura în clipa erorii (nu la trimitere; fără câmp gol; copia inelului; legarea
# înregistratorului și a raportorului), serverul (verificarea, scrierea), adminul (citirea, timpul scurt) și pagina Erori
# (pașii, numele acțiunilor, rezultatul „ok” ascuns, catalogul dat filei).
# Unitarele și serverul se rulează cu `scripts/otravuri.py` (serverul în `firebase emulators:exec --only firestore`); setul
# „e2e”, cu `scripts/otravuri-emulatoare.py`.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


P = 'shared/pasiEroare.ts'
V = 'shared/pasiEroareVerificare.ts'
U = 'src/app/utilizare.ts'
RP = 'src/app/raportorPornire.ts'
RC = 'src/cloud/raportor.ts'
C = 'functions/src/erori/client.ts'
S = 'functions/src/erori/scrie.ts'
AD = 'src/admin/erori/date.ts'
F = 'src/admin/erori/FilaErori.tsx'

# Pașii din evenimente (unitare).
o('P01', P, 'Math.round(tEroare - e.t)', 'Math.round(e.t - tEroare)', 'pasi', 'timpul pașilor e socotit pe dos: toți la 0')
o('P02', P, 'Math.min(MS_MAX_PAS, Math.max(0, Math.round(tEroare - e.t)))', 'Math.max(0, Math.round(tEroare - e.t))', 'pasi',
  'un pas foarte vechi trece de marginea pe care o cere serverul (și raportul pierde pasul)')
o('P03', P, '      return { fel: e.fel, id: e.de, ms };', '      return { fel: e.fel, id: e.fel, ms };', 'pasi', 'derularea și zoom-ul pierd zona')
o('P04', P, 'return e.cod === undefined ? { fel: e.fel, id: e.id, ms } : { fel: e.fel, id: e.id, rez: `cod:${e.cod}`, ms };',
  'return { fel: e.fel, id: e.id, ms };', 'pasi', 'alarma mașinii pierde codul')
o('P05', P, '      return { fel: e.fel, id: e.id, rez: e.rez, ms };', '      return { fel: e.fel, id: e.id, ms };', 'pasi',
  'acțiunile refuzate arată ca reușite (fără rezultat)')

# Verificarea (unitare).
o('V01', V, "  if (chei.some((k) => k !== 'fel' && k !== 'id' && k !== 'rez' && k !== 'ms')) return null;\n", '', 'pasi',
  'un câmp în plus (geometria) trece de server')
o('V02', V, "  if (typeof fel !== 'string' || !(FELURI_PAS as readonly string[]).includes(fel)) return null;", "  if (typeof fel !== 'string') return null;",
  'pasi', 'un fel necunoscut trece')
o('V03', V, '  if (zona ? !(SURSE as readonly string[]).includes(id) : !idBun(id)) return null;', '  if (zona && !(SURSE as readonly string[]).includes(id)) return null;',
  'pasi', 'un text al omului (numele unei foi) trece drept id')
o('V04', V, '  if (zona ? !(SURSE as readonly string[]).includes(id) : !idBun(id)) return null;', '  if (!zona && !idBun(id)) return null;', 'pasi',
  'zoom-ul trece cu un id oarecare în locul zonei')
o('V05', V, "  if (rez !== undefined && (typeof rez !== 'string' || !RE_REZ.test(rez))) return null;", "  if (rez !== undefined && typeof rez !== 'string') return null;",
  'pasi', 'un rezultat cu text liber trece')
o('V06', V, "  if (typeof ms !== 'number' || !Number.isInteger(ms) || ms < 0 || ms > MS_MAX_PAS) return null;",
  "  if (typeof ms !== 'number' || ms < 0 || ms > MS_MAX_PAS) return null;", 'pasi', 'un timp cu zecimale trece')
o('V07', V, 'return x.slice(-PLAFON_PASI).map(pasBun)', 'return x.map(pasBun)', 'pasi', 'o listă de pași fără margine se scrie întreagă')
o('V08', V, 'return x.slice(-PLAFON_PASI).map(pasBun)', 'return x.slice(0, PLAFON_PASI).map(pasBun)', 'pasi',
  'dintr-o listă lungă rămân primii pași, nu cei de lângă eroare')

# Captura (unitare).
o('R01', RP, 'modul.raportDin(x.intrare, deps.build, browser, x.limba, x.pasi)', 'modul.raportDin(x.intrare, deps.build, browser, x.limba, deps.pasi?.())',
  'raportor', 'pașii se iau la trimitere, nu în clipa erorii')
o('R02', RP, 'modul.raportDin(x.intrare, deps.build, browser, x.limba, x.pasi)', 'modul.raportDin(x.intrare, deps.build, browser, x.limba)',
  'raportor', 'raportul pleacă fără pași')
o('R03', RC, '...(pasi && pasi.pasi.length > 0 ? {', '...(pasi ? {', 'raportor', 'un raport fără pași are câmpul gol')
o('R04', U, 'inel ? inel().map((e) => ({ ...e })) : []', 'inel ? inel() : []', 'pasi',
  'pașii luați sunt chiar inelul: o repetare numărată după eroare îi schimbă')
o('R05', U, '  inel = pasi ?? null;', '  inel = null;', 'pasi', 'inelul înregistratorului nu ajunge la raportor')
o('R06', 'src/app/utilizareLot.ts', '  preiaUtilizarea(ins.primeste, ins.pasi);', '  preiaUtilizarea(ins.primeste);', 'e2e',
  'înregistratorul nu-și dă inelul: niciun pas în rapoartele adevărate')
o('R07', 'src/app/main.tsx', '  pasi: pasiAcum,\n', '', 'e2e', 'raportorul din pornire nu ia pașii')

# Serverul (pe emulator).
o('S01', C, '...(pasi.length > 0 ? { pasi } : {})', '', 'server', 'serverul nu scrie pașii')
o('S02', S, '    ...(a.pasi === undefined ? {} : { pasi: a.pasi }),\n', '', 'server', 'pașii nu ajung în grup și în apariție')
o('S03', C, "  const pasi = pasiDin((data as Record<string, unknown>)['pasi']);",
  "  const pasi = (Array.isArray((data as Record<string, unknown>)['pasi']) ? (data as Record<string, unknown>)['pasi'] : []) as never[];",
  'server', 'serverul scrie pașii așa cum vin, fără verificare')

# Adminul (unitare).
o('A01', AD, "pasi: pasiDin(d['pasi'])", 'pasi: []', 'admin', 'adminul nu citește pașii')
o('A02', AD, '  if (ms >= 60_000) return', '  if (ms >= 600_000) return', 'admin', 'trei minute se scriu în secunde')

# Pagina Erori (pe emulatoare).
o('E01', F, '      {a.pasi.length > 0 ? <PasiDinainte pasi={a.pasi} nume={nume} /> : null}', '', 'e2e', 'pașii nu se arată')
o('E02', F, "(p.fel === 'actiune' || p.fel === 'unealta') && nume.has(p.id)", 'false', 'e2e', 'pașii arată id-urile, nu numele acțiunilor')
o('E03', F, "p.rez !== undefined && p.rez !== 'ok'", 'p.rez !== undefined', 'e2e', '„ok” se scrie la fiecare acțiune reușită')
o('E04', 'src/admin/PaginaAdmin.tsx', ' tinta={tintaErori} aducator={aducator} />', ' tinta={tintaErori} />', 'e2e',
  'fila Erori nu primește catalogul: niciun nume')

SETURI = {
    'pasi': ['test/unit/pasiEroare.test.ts'],
    'raportor': ['test/unit/raportor.test.ts'],
    'admin': ['test/unit/admin.test.ts'],
    'server': ['functions/test/erori.emulator.test.ts'],
}
E2E = ['test/e2e-emulator/erori.emulator.spec.ts', 'test/e2e-emulator/raportor.emulator.spec.ts']
ERORI = (E2E[0], 'Erori: lista în stânga')
RAPORT = (E2E[1], 'pașii dinaintea erorii')
GREP = {'E01': ERORI, 'E02': ERORI, 'E03': ERORI, 'E04': ERORI, 'R06': RAPORT, 'R07': RAPORT}
