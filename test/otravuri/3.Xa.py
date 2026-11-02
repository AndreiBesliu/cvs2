# Sabotajele feliei 3.Xa, gazda extensiilor (ADR 0127), 02.11.2026: fiecare apărare a pachetului (forma manifestului,
# căile, intrarea, permisiunile, fișierele în ambele sensuri, amprentele), a cititorului `.zip` (CRC, criptarea, metodele,
# ZIP64, limitele, dosarele), a CSP-ului și a cadrului (sandbox-ul, serviciile refuzate) și a legării în aplicație (acțiunile
# documentului oprite, fereastra inertă, pânza ascunsă, linkul, tema trimisă cadrului) stricată o dată; proba care o apără
# trebuie să pice. Alese de autorul feliei: plasa autorului, nu runda independentă. Rulate din worktree (în afara
# Drive-ului), cu `.tmp/otravuri-local.py` pentru setul e2e (npm lipsește).
#
# Lăsate afară, echivalente: bomba de deflate fără oprire (scrierea peste mărimea declarată aruncă RangeError, prinsă tot
# ca „stricat”); `credentials: 'omit'` (cererea e cross-site, fără cookie-uri de trimis, iar Playwright ocolește CORS-ul).
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


PAC = 'src/extensii/pachet.ts'
ZIP = 'src/extensii/zip.ts'
CSP = 'shared/csp.ts'
CAD = 'shared/cadruExtensie.ts'
GAZ = 'src/extensii/cadru.ts'
EXT = 'src/extensii/Extensii.tsx'
APP = 'src/app/App.tsx'

E2E = ['test/e2e/extensii.spec.ts']

SETURI = {
    'pachet': ['test/unit/extensii.pachet.test.ts', 'test/unit/extensii.zip.test.ts'],
    'csp': ['test/unit/csp.extensii.test.ts', 'test/unit/firebase-json.test.ts'],
}

# ---- pachetul (unitar) ----
o('P01', PAC, 'if (m.api !== API) return', 'if (m.api === undefined) return', 'pachet', 'altă versiune a lui HostApi trece')
o('P02', PAC, '/^[a-z0-9-]{1,40}$/', '/^[a-zA-Z0-9-]{1,40}$/', 'pachet', 'id-ul cu majuscule trece')
o('P03', PAC, " && s !== '..'", '', 'pachet', 'calea cu „..” trece')
o('P04', PAC, r" || c.includes('\\')", '', 'pachet', 'calea cu „\\” trece')
o('P05', PAC, "!intrare.endsWith('.js') || ", '', 'pachet', 'intrarea care nu e .js trece')
o('P06', PAC, 'if (!CATALOG_PERMISIUNI.includes(p)) return', 'if (false) return', 'pachet', 'permisiunea necunoscută trece')
o('P07', PAC, "if (!b) return { ok: false, motiv: 'lipsa', detaliu: cale };", 'if (!b) continue;', 'pachet', 'fișierul lipsă trece')
o('P08', PAC, "  for (const nume of intrari.keys()) if (nume !== MANIFEST && !fisiere.has(nume)) return { ok: false, motiv: 'in-plus', detaliu: nume };\n", '', 'pachet', 'fișierul în plus trece')
o('P09', PAC, "if (hex(await crypto.subtle.digest('SHA-256', new Uint8Array(b))) !== h) return", 'if (false) return', 'pachet', 'amprenta nu se mai verifică')
o('P10', PAC, "    if (intrari.has(i.nume)) return { ok: false, motiv: 'in-plus', detaliu: i.nume };\n", '', 'pachet', 'intrarea dublată trece')
o('P11', PAC, ' || c === MANIFEST)', ')', 'pachet', 'manifestul ca fișier al pachetului trece')
o('P12', PAC, "!s.endsWith('.css') || ", '', 'pachet', 'stilul care nu e .css trece')

# ---- cititorul .zip (unitar) ----
o('Z01', ZIP, 'if (crc32(continut) !== crc) return', 'if (false) return', 'pachet', 'CRC-ul nu se mai verifică')
o('Z02', ZIP, 'if (steaguri & 1) return', 'if (steaguri & 2) return', 'pachet', 'criptarea trece')
o('Z03', ZIP, 'if (metoda !== 0 && metoda !== 8) return', 'if (metoda > 12) return', 'pachet', 'metoda necunoscută trece')
o('Z04', ZIP, 'if (marime > limite.octetiFisier || suma > limite.octetiTotal)', 'if (suma > limite.octetiTotal)', 'pachet', 'fișierul peste limită trece')
o('Z05', ZIP, 'if (marime > limite.octetiFisier || suma > limite.octetiTotal)', 'if (marime > limite.octetiFisier)', 'pachet', 'totalul peste limită trece')
o('Z06', ZIP, 'if (total > limite.fisiere) return', 'if (total > limite.fisiere + 1) return', 'pachet', 'prea multe fișiere trec')
o('Z07', ZIP, 'if (comprimat === 0xffffffff || marime === 0xffffffff || local === 0xffffffff)', 'if (comprimat === 0xffffffff || local === 0xffffffff)', 'pachet', 'ZIP64 pe mărime nespus')
o('Z08', ZIP, "    if (nume.endsWith('/')) continue;\n", '', 'pachet', 'dosarele devin fișiere')

# ---- CSP-ul și încărcătorul (unitar) ----
o('C01', CSP, '`script-src \'self\' blob: ${AMPRENTA_INCARCATOR} ', '`script-src \'self\' ${AMPRENTA_INCARCATOR} ', 'csp', 'fără blob: în script-src')
o('C02', CAD, '"connect-src \'none\'",', '"connect-src \'self\'",', 'csp', 'cadrul cu rețea')
o('C03', CAD, "d.tip !== 'cvs2-extensie-porneste'", "d.tip !== 'cvs2-extensie-pornire'", 'csp', 'încărcătorul schimbat fără amprenta nouă')

# ---- cadrul și legarea în aplicație (e2e) ----
o('E01', GAZ, "f.setAttribute('sandbox', 'allow-scripts');", "f.setAttribute('sandbox', 'allow-scripts allow-same-origin');", 'e2e', 'cadrul cu originea aplicației')
o('E02', GAZ, "port.postMessage({ tip: 'raspuns', id: m.id, ok: false, eroare: `serviciu-necunoscut:${text(m.serviciu, 40)}` });", "port.postMessage({ tip: 'raspuns', id: m.id, ok: true, rezultat: null });", 'e2e', 'serviciul cerut acceptat')
o('E03', APP, '    if (dialogDeschis.current || spatiuDeschis.current) return { ok: false, motiv: \'motiv.nimic-ales\' };\n    return ruleaza(registru, id, ctx);', '    if (dialogDeschis.current) return { ok: false, motiv: \'motiv.nimic-ales\' };\n    return ruleaza(registru, id, ctx);', 'e2e', 'acțiunile documentului rulează sub spațiu')
o('E04', APP, '    if (spatiuDeschis.current && !registruVedere.actiuni.has(id)) return;\n', '', 'e2e', 'exportul se deschide sub spațiu')
o('E05', EXT, 'useEffect(() => { onModal(cerere !== null); }, [cerere, onModal]);', 'useEffect(() => { onModal(false); }, [cerere, onModal]);', 'e2e', 'aplicația nu e inertă sub fereastra instalării')
o('E06', APP, '\n        data-extensie={spatiuExtensie ?? undefined}>', '>', 'e2e', 'pânza rămâne sub spațiu')
o('E07', EXT, '      history.replaceState(history.state, \'\', `${location.pathname}${location.search}`);\n', '', 'e2e', 'ancora linkului rămâne în adresă')
o('E08', EXT, "    window.addEventListener('hashchange', dinAncora);\n", '', 'e2e', 'linkul lipit în fila deschisă e ignorat')
o('E09', EXT, "attributeFilter: ['data-tema']", "attributeFilter: ['data-tema-alta']", 'e2e', 'tema nouă nu ajunge în cadru')
