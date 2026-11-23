# Lista de otrăvuri a feliei 3.Xh-1 (biblioteca extensiilor, refăcută: datele și semnul; ADR 0231 §B.1–§B.2), 23.11.2026,
# alese de autor: datele de prezentare din catalog, citite cu îngăduință (semnul și capturile legate de extensia lor, plafoanele,
# rândul care rămâne bun, numele celor sărite), numele fișierelor bibliotecii; semnul din pachet (un SVG mic din lista
# fișierelor); construcția (starea lui „ce e nou”, ordinea versiunilor, capturile, mărimea din antetul WebP, cele cinci
# rânduri din catalog); precache-ul și anteturile; semnul pe ecran (de unde vine, piesa de puzzle, fila, rândul din stânga).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


SB = 'shared/biblioteca.ts'
PA = 'src/extensii/pachet.ts'
CB = 'scripts/biblioteca.ts'
SE = 'src/extensii/semn.ts'
ST = 'src/extensii/Semn.tsx'
EX = 'src/extensii/Extensii.tsx'
CS = 'src/extensii/extensii.css'
FJ = 'scripts/firebase-json.ts'
PR = 'shared/precache.ts'

# Datele de prezentare din catalog (shared/biblioteca.ts)
o('P01', SB, '`^${id}-pictograma-', '`^[a-z0-9-]+-pictograma-', 'biblioteca',
  'semnul altei extensii trece drept al rândului')
o('P02', SB, 'intreg(o.octeti, MAX_OCTETI_PICTOGRAMA)', 'intreg(o.octeti, MAX_OCTETI_PACHET)', 'biblioteca',
  'un semn peste 8 kB intră în catalog')
o('P03', SB, '    if (!Array.isArray(x) || x.length > MAX_CAPTURI) return null;', '    if (!Array.isArray(x) || x.length > MAX_CAPTURI + 1) return null;', 'biblioteca',
  'cinci capturi pe limbă trec')
o('P04', SB, " || !reCaptura.test(o.fisier) || !intreg(o.octeti, MAX_OCTETI_CAPTURA)", " || !intreg(o.octeti, MAX_OCTETI_CAPTURA)", 'biblioteca',
  'o captură cu orice nume (alt fel de fișier, altă extensie) trece')
o('P05', SB, ' || !intreg(o.inalt, MAX_LATURA_CAPTURA)', '', 'biblioteca',
  'o captură cu înălțimea neîntreagă trece')
o('P06', SB, ' || !text(o.alt, MAX_ALT)) return null;', ') return null;', 'biblioteca',
  'o captură fără text alternativ trece')
o('P07', SB, '    return ro && en ? { ro, en } : null;', '    return ro ? { ro, en: en ?? [] } : null;', 'biblioteca',
  'capturile fără engleză trec')
o('P08', SB, "camp('despre', (x) => citesteDescriere(x, MAX_DESPRE))", "camp('despre', (x) => citesteDescriere(x, MAX_DESPRE * 2))", 'biblioteca',
  'o descriere lungă peste 600 de caractere trece')
o('P09', SB, '    if (!Array.isArray(x) || x.length > MAX_NOUTATI) return null;', '    if (!Array.isArray(x) || x.length > MAX_NOUTATI + 1) return null;', 'biblioteca',
  'șase rânduri de „ce e nou” trec')
o('P10', SB, " || !RE_VERSIUNE_BIBLIOTECA.test(o.versiune) || !text(o.ro, MAX_NOUTATE)", " || !text(o.ro, MAX_NOUTATE)", 'biblioteca',
  'un rând de „ce e nou” cu o versiune care nu e din numere trece')
o('P11', SB, "camp('autor', (x) => (text(x, MAX_AUTOR) ? x : null))", "camp('autor', (x) => (typeof x === 'string' ? x : null))", 'biblioteca',
  'un autor gol sau prea lung trece')
o('P12', SB, "    if (v === null) sarite.push(`${id}: ${nume}`);\n", '', 'biblioteca',
  'o dată sărită nu mai e numită: poarta build-ului nu mai vede nimic')
o('P13', SB, "  const { prezentare, sarite } = citestePrezentare(id, r);\n",
  "  const { prezentare, sarite } = citestePrezentare(id, r);\n  if (sarite.length > 0) return nu('prezentare');\n", 'biblioteca',
  'o dată de prezentare greșită strică tot catalogul (o filă veche n-ar mai avea bibliotecă)')
o('P14', SB, "-[0-9a-f]{8}\\.(?:svg|webp)$/;", "-[0-9a-f]{8}\\.(?:svg|webp|png)$/;", 'biblioteca',
  'un PNG trece drept fișier al bibliotecii')
o('P15', SB, "  return `${id}-${nume}-${sha256.slice(0, 8)}.${fel}`;", "  return `${id}-${nume}-${sha256.slice(0, 6)}.${fel}`;", 'biblioteca',
  'numele unei imagini poartă o amprentă scurtată')

# Semnul din pachet (src/extensii/pachet.ts)
o('M01', PA, "!p.endsWith('.svg') || ", '', 'pachet',
  'orice fișier al pachetului poate fi numit semn')
o('M02', PA, " || !Object.hasOwn(fisiere, p)) return { ok: false, motiv: 'pictograma'", ") return { ok: false, motiv: 'pictograma'", 'pachet',
  'un semn din afara listei fișierelor trece de manifest')
o('M03', PA, '    if (semn.length > limite.octetiPictograma) return', '    if (false) return', 'pachet',
  'un semn peste 8 kB se instalează')
o('M04', PA, '    if (!esteSvg(semn)) return', '    if (false) return', 'pachet',
  'un semn care nu e SVG se instalează')
o('M05', PA, "  return /^\\uFEFF?\\s*(?:<\\?xml[^>]*\\?>\\s*)?(?:<!--[\\s\\S]*?-->\\s*)*<svg[\\s>]/.test(t);", "  return t.includes('<svg');", 'pachet',
  'o pagină HTML cu un <svg> în ea trece drept SVG')
o('M06', PA, ", ...(pictograma !== undefined ? { pictograma } : {}) },", " },", 'pachet',
  'manifestul citit își pierde semnul')

# Construcția (scripts/biblioteca.ts)
o('C01', CB, "  return noutati?.[0]?.versiune === versiune ? 'la-zi' : 'lipsesc';", "  return noutati?.some((n) => n.versiune === versiune) ? 'la-zi' : 'lipsesc';", 'constructie',
  '„ce e nou” trece și când rândul versiunii nu e primul')
o('C02', CB, "]!.versiune) !== 1) gresit('noutati',", "]!.versiune) === -1) gresit('noutati',", 'constructie',
  'aceeași versiune de două ori în „ce e nou” trece')
o('C03', CB, "      if (!Array.isArray(r.capturi) || r.capturi.length > MAX_CAPTURI) gresit(", "      if (!Array.isArray(r.capturi) || r.capturi.length > MAX_CAPTURI + 1) gresit(", 'constructie',
  'cinci capturi în listă trec')
o('C04', CB, "      if (new Set(capturi.map((c) => c.nume)).size !== capturi.length) gresit('capturi', 'un nume de două ori');\n", '', 'constructie',
  'aceeași captură de două ori în listă')
o('C05', CB, "{ lat: le(d + 6, 2) & 0x3fff, inalt: le(d + 8, 2) & 0x3fff }", "{ lat: le(d + 6, 2), inalt: le(d + 8, 2) }", 'constructie',
  'biții de scară ai unui WebP cu pierderi intră în mărime')
o('C06', CB, "      return { lat: (b & 0x3fff) + 1, inalt:", "      return { lat: (b & 0x3fff), inalt:", 'constructie',
  'lățimea unui WebP fără pierderi iese cu un pixel mai mică')
o('C07', CB, "{ lat: le(d + 4, 3) + 1, inalt: le(d + 7, 3) + 1 }", "{ lat: le(d + 4, 2) + 1, inalt: le(d + 7, 2) + 1 }", 'constructie',
  'mărimea unui WebP extins se citește pe doi octeți')
o('C08', CB, "{ noutati: x.noutati.slice(0, MAX_NOUTATI) }", "{ noutati: x.noutati }", 'constructie',
  'catalogul primește toată istoria lui „ce e nou” (iar aplicația o sare)')
o('C09', CB, "    if (stareNoutati(x.noutati, versiune) !== 'la-zi') faraNoutati.push(x.dosar);\n", '', 'constructie',
  'construcția nu mai spune ce extensie n-are „ce e nou”')
o('C10', CB, "    return { ...pune(`captura-${c.nume}-${limba}`, o, 'webp'), ...m, alt: c.alt[limba] };", "    return { ...pune(`captura-${c.nume}-${limba}`, o, 'webp'), ...m, alt: c.alt.ro };", 'constructie',
  'capturile în engleză au textul alternativ în română')

# Precache-ul și anteturile
o('R01', PR, 'esteNumeFisierBiblioteca(cale.slice(DIR_BIBLIOTECA.length + 1))', "cale.endsWith('.zip')", 'precache',
  'semnele și capturile nu mai sunt ale bibliotecii (iar orice .zip e)')
o('H01', FJ, "        { source: '/extensii/*.webp', headers: [antet('Cache-Control', 'public, max-age=31536000, immutable')] },\n", '', 'anteturi',
  'capturile nu mai au antetul lor de cache')
o('H02', FJ, "        { source: '/extensii/*.svg', headers: [antet('Cache-Control', 'public, max-age=31536000, immutable')] },",
  "        { source: '/extensii/*.svg', headers: [antet('Cache-Control', 'no-cache')] },", 'anteturi',
  'semnul se cere din nou la fiecare deschidere')

# De unde ia gazda semnul (src/extensii/semn.ts)
o('N01', SE, '  return o && esteSvg(o) ? o : null;', '  return o ?? null;', 'semn',
  'un fișier care nu e SVG ajunge imagine')
o('N02', SE, '  return rand.pictograma ? new URL(rand.pictograma.fisier, adresaCatalog).href : null;', '  return rand.pictograma ? rand.pictograma.fisier : null;', 'semn',
  'semnul din bibliotecă nu mai e cerut de lângă catalog')
o('N03', SE, "  if (cale === undefined || !Object.hasOwn(e.fisiere, cale)) return null;", "  if (!Object.hasOwn(e.fisiere, String(cale))) return null;", 'semn',
  'fără câmp în manifest, un fișier numit „undefined” ar fi semnul')

# Semnul pe ecran (e2e)
o('U01', ST, '  if (adresa === null || adresa === stricata) {', '  if (false) {', 'e2e',
  'o extensie fără semn nu mai are piesa de puzzle')
o('U02', EX, "{...(cuSemn ? { 'data-cu-semn': '' } : {})}", '', 'e2e',
  'pe filă, semnul stă lângă piesa de puzzle, nu în locul ei')
o('U03', CS, '  justify-content: flex-start;\n', '', 'e2e',
  'rândul unei extensii instalate stă la mijlocul meniului')
o('U04', CS, '  min-width: 0;\n  color: var(--t);\n', '  min-width: 0;\n', 'e2e',
  'numele din rândul bibliotecii e gri, ca versiunea')
o('U05', EX, '<Semn adresa={adresaSemnCatalog(r, adresaCatalog())} marime={28} />', '<Semn adresa={null} marime={28} />', 'e2e',
  'rândul din bibliotecă nu-și mai arată semnul')
o('U06', EX, '              <SemnInstalat extensie={x} marime={28} />\n', '', 'e2e',
  'rândul unei extensii instalate n-are semn')
o('U07', ST, "{ type: 'image/svg+xml' }", "{ type: 'text/plain' }", 'e2e',
  'semnul din pachet nu se poate arăta ca imagine')
o('U08', ST, 'src={adresa} alt=""', 'src={adresa} alt="semn"', 'e2e',
  'semnul primește un text alternativ: numele se citește de două ori')
o('U09', EX, 'src={semnFila} alt=""', 'src={semnFila} alt="semn"', 'e2e',
  'numele filei începe cu „semn”')
o('U10', EX, '  const cuSemn = semnFila !== null && semnFila !== semnFilaStricat;', '  const cuSemn = false;', 'e2e',
  'fila unei extensii cu semn rămâne cu piesa de puzzle')

SETURI = {
    'biblioteca': ['test/unit/extensii.biblioteca.test.ts', 'test/unit/biblioteca.constructie.test.ts'],
    'pachet': ['test/unit/extensii.pachet.test.ts'],
    'constructie': ['test/unit/biblioteca.constructie.test.ts'],
    'precache': ['test/unit/precache.test.ts', 'test/unit/biblioteca.constructie.test.ts'],
    'anteturi': ['test/unit/firebase-json.test.ts'],
    'semn': ['test/unit/extensii.semn.test.ts'],
}
E2E = ['test/e2e/biblioteca.spec.ts']
