# Lista de otrăvuri a feliei 3.Xg (biblioteca extensiilor, ADR 0230), 07.11.2026, alese de autor: catalogul judecat câmp cu
# câmp, versiunile pe numere, starea rândului (Reîncarcă, nicio coborâre), amprenta verificată înaintea cititorului, potrivirea
# manifestului cu rândul, descărcarea plafonată, lipsa rețelei care nu e defect, sursa scrisă; construcția (amprenta și mărimea
# din catalog, garda „conținut nou ⇒ versiune nouă”, amprenta conținutului); precache-ul și anteturile; interfața (fereastra
# instalării, actualizarea dintr-un clic sau prin fereastră, semnul „actualizare: …”, linkul, „Deschide”, „din afara
# bibliotecii”, gestionarea, defectul în jurnal, „Reîncearcă”).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


SB = 'shared/biblioteca.ts'
EB = 'src/extensii/biblioteca.ts'
CB = 'scripts/biblioteca.ts'
EX = 'src/extensii/Extensii.tsx'
IN = 'src/extensii/Instalare.tsx'

# Catalogul și versiunile (shared/biblioteca.ts)
o('B01', SB, "  if (c.format !== FORMAT_CATALOG) return { ok: false, detaliu: 'format' };\n", '', 'biblioteca',
  'un catalog de alt format se citește')
o('B02', SB, "    if (randuri.some((y) => y.id === r.rand.id)) return", '    if (false) return', 'biblioteca',
  'același id de două ori în catalog')
o('B03', SB, "  if (r.pachet !== numePachet(id, r.versiune, r.sha256)) return nu('pachet');\n", '', 'biblioteca',
  'numele pachetului nu mai e legat de amprentă (și poate ieși din dosar)')
o('B04', SB, ' || r.octeti > MAX_OCTETI_PACHET) return', ') return', 'biblioteca',
  'un pachet peste plafonul de 16 MB intră în catalog')
o('B05', SB, '    const d = (x[i] ?? 0) - (y[i] ?? 0);', '    const d = String(x[i] ?? 0).localeCompare(String(y[i] ?? 0));', 'biblioteca',
  'versiunile comparate ca texte: 18.10.0 iese mai veche decât 18.9.1')
o('B06', SB, '    const d = (x[i] ?? 0) - (y[i] ?? 0);', '    const d = (x[i] ?? -1) - (y[i] ?? 0);', 'biblioteca',
  'segmentele lipsă nu mai sunt zero: 18.7 diferă de 18.7.0')
o('B07', SB, 'export const RE_VERSIUNE_BIBLIOTECA = /^\\d{1,6}(?:\\.\\d{1,6}){0,3}$/;', 'export const RE_VERSIUNE_BIBLIOTECA = /^.+$/;', 'biblioteca',
  'orice text e o versiune: un pachet de probă se compară ca număr')

# Starea rândului, descărcarea, judecata, instalarea (src/extensii/biblioteca.ts)
o('S01', EB, '  if (rand.api !== api || rand.permisiuni.some((p) => !catalog.includes(p))) return', '  if (rand.api !== api) return', 'biblioteca',
  'un rând cu o permisiune necunoscută filei de acum se poate instala')
o('S02', EB, '  if (rand.api !== api || rand.permisiuni', '  if (rand.permisiuni', 'biblioteca',
  'un rând pentru alt HostApi se poate instala')
o('S03', EB, "  if (c === 0) return { fel: 'instalata' };\n  return { fel: 'alta', versiune: instalata.versiune };",
  "  if (c === 0) return { fel: 'instalata' };\n  return { fel: 'actualizeaza', de: instalata.versiune, permisiuniNoi: [] };", 'biblioteca',
  'biblioteca coboară o versiune instalată mai nouă')
o('S04', EB, '  return noi.filter((p) => !vechi.includes(p));', '  return [...noi];', 'biblioteca',
  'o actualizare spune toate permisiunile ca noi')
o('S05', EB, "  if (await sha256Hex(octeti) !== rand.sha256) return refuz('amprenta-biblioteca', true, rand.pachet);\n", '', 'biblioteca',
  'amprenta nu se mai verifică: cititorul primește octeți schimbați')
o('S07', EB, ' || !aceleasi(m.permisiuni, rand.permisiuni)) {', ') {', 'biblioteca',
  'un pachet care cere altceva decât rândul lui se instalează')
o('S08', EB, 'm.nume !== rand.nume || ', '', 'biblioteca',
  'un pachet cu alt nume decât rândul lui se instalează')
o('S09', EB, '    if (n > octeti) {', '    if (false) {', 'biblioteca',
  'descărcarea nu se mai oprește la mărimea din catalog')
o('S10', EB, "    r = await f(adresa, { credentials: 'omit' });\n  } catch (e) {\n    return refuz('retea', false,",
  "    r = await f(adresa, { credentials: 'omit' });\n  } catch (e) {\n    return refuz('retea', true,", 'biblioteca',
  'lipsa rețelei ajunge în jurnal, ca un defect')
o('S11', EB, "sursa: { fel: 'biblioteca', sha256: rand.sha256 }", "sursa: { fel: 'adresa', adresa: rand.pachet }", 'biblioteca',
  'extensia din bibliotecă se scrie ca venită de la o adresă')
o('S13', EB, "  if (!r.ok) return { fel: 'defect', detaliu: `HTTP ${r.status}` };\n", '', 'biblioteca',
  'un catalog lipsă (404) nu se mai spune ca atare')

# Construcția (scripts/biblioteca.ts)
o('C01', CB, '    const h = sha(octeti);', '    const h = sha(new TextEncoder().encode(x.dosar));', 'biblioteca',
  'amprenta din catalog nu e a octeților publicați')
o('C02', CB, 'octeti: octeti.length, sha256: h,', 'octeti: octeti.length + 1, sha256: h,', 'biblioteca',
  'mărimea din catalog nu e a pachetului')
o('C03', CB, "  if (inreg.versiune === calc.versiune) return inreg.continut === calc.continut ? 'la-zi' : 'continut-fara-versiune';",
  "  if (inreg.versiune === calc.versiune) return 'la-zi';", 'biblioteca',
  'un conținut nou cu versiunea veche trece de gardă')
o('C04', CB, '  return sha(JSON.stringify(manifest));', '  return sha(JSON.stringify({ ...manifest, fisiere: {} }));', 'biblioteca',
  'amprenta conținutului nu mai vede fișierele')

# Precache-ul și anteturile
o('P01', 'shared/precache.ts', "  if (cale === FISIER_CATALOG_BIBLIOTECA) return 'biblioteca';", "  if (cale === FISIER_CATALOG_BIBLIOTECA) return 'precache';", 'precache',
  'catalogul bibliotecii intră în precache')
o('P02', SB, 'const RE_PACHET = /^[a-z0-9-]{1,40}-\\d{1,6}(?:\\.\\d{1,6}){0,3}-[0-9a-f]{8}\\.zip$/;', 'const RE_PACHET = /^.*\\.zip$/;', 'precache',
  'orice .zip din extensii/ e luat drept pachet al bibliotecii, fără decizie')
o('H01', 'scripts/firebase-json.ts', "{ source: '/extensii/catalog.json', headers: [antet('Cache-Control', 'no-cache')] },",
  "{ source: '/extensii/catalog.json', headers: [antet('Cache-Control', 'max-age=3600')] },", 'anteturi',
  'catalogul ținut o oră în cache-ul browserului')

# Interfața (e2e)
o('E01', EX, '            if (s.permisiuniNoi.length > 0) alege(', '            if (true) alege(', 'e2e',
  'actualizarea fără nimic nou trece totuși prin fereastră')
o('E02', EX, '            if (s.permisiuniNoi.length > 0) alege(', '            if (false) alege(', 'e2e',
  'o versiune care cere ceva nou se instalează dintr-un clic, fără fereastră')
o('E03', EX, "          onClick={() => { alege(() => { setCerere({ fel: 'biblioteca', id: r.id, rand: r, dinLink: false }); }); }}>\n          {t('extensii.biblioteca.instaleaza')}",
  "          onClick={() => { void actualizeazaDinMeniu(r); }}>\n          {t('extensii.biblioteca.instaleaza')}", 'e2e',
  '„Instalează” din meniu descarcă și instalează fără fereastră')
o('E04', EX, '    setMeniu(r ? { top: Math.round(r.bottom + 4), left: Math.max(4, Math.round(r.left)) } : { top: 48, left: 8 });\n    incarcaBiblioteca();',
  '    setMeniu(r ? { top: Math.round(r.bottom + 4), left: Math.max(4, Math.round(r.left)) } : { top: 48, left: 8 });', 'e2e',
  'catalogul nu se mai cere la deschiderea meniului')
o('E05', EX, "        history.replaceState(history.state, '', `${location.pathname}${location.search}`);\n        if (/^[a-z0-9-]{1,40}$/.test(id))",
  '        if (/^[a-z0-9-]{1,40}$/.test(id))', 'e2e',
  'linkul bibliotecii rămâne în adresă')
o('E06', EX, "{r && s?.fel === 'actualizeaza' && <small", '{false && <small', 'e2e',
  'extensia instalată nu mai spune că are o actualizare')
o('E07', IN, '      <p className="avertisment" data-testid="extensii-din-afara">{t(\'extensii.instalare.din-afara\')}</p>\n', '', 'e2e',
  'un pachet din fișier nu mai spune că vine din afara bibliotecii')
o('E08', IN, "onClick={() => { onGata(e.id, e); }}>{t('extensii.instalare.deschide')}", "onClick={() => { onGata(e.id); }}>{t('extensii.instalare.deschide')}", 'e2e',
  '„Deschide” doar închide fereastra')
o('E09', EX, "    setProgres((p) => ({ ...p, [rand.id]: { fel: 'gata', versiune: rand.versiune } }));\n    reincarca();",
  "    setProgres((p) => ({ ...p, [rand.id]: { fel: 'gata', versiune: rand.versiune } }));", 'e2e',
  'după actualizarea din meniu, lista arată versiunea veche')
o('E10', IN, "<small>{x.sursa.fel === 'biblioteca'", "<small>{x.sursa.fel === 'fisier'", 'e2e',
  'gestionarea nu mai spune „din biblioteca cvs2”')
o('E11', IN, '      if (r.defect) onDefect(new Error(', '      if (false) onDefect(new Error(', 'e2e',
  'amprenta greșită nu ajunge în jurnal')
o('E12', EX, "data-extensii=\"biblioteca-reincearca\" onClick={() => { incarcaBiblioteca(); }}>", "data-extensii=\"biblioteca-reincearca\" onClick={() => { }}>", 'e2e',
  '„Reîncearcă” nu mai cere catalogul')

SETURI = {
    'biblioteca': ['test/unit/extensii.biblioteca.test.ts', 'test/unit/biblioteca.constructie.test.ts'],
    'precache': ['test/unit/precache.test.ts', 'test/unit/biblioteca.constructie.test.ts'],
    'anteturi': ['test/unit/firebase-json.test.ts'],
}
E2E = ['test/e2e/biblioteca.spec.ts']
