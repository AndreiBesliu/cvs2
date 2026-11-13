# Lista de otrăvuri a feliei 11.5↑ („Toate foile” la export, ADR 0210 §5), 13.11.2026, alese de autor: CRC-ul comun,
# scrierea arhivei (antetele, mărimile, locurile, capătul, plafoanele), numele în arhivă (foaia, ×N, numele scurte),
# programul fără comentarii și foile identice, calculul (foile goale, refuzurile, foaia activă, semnătura, rândurile,
# timpii, arhiva pe nume scurte, foaia fiecărui program, ramura „Toate foile”, Mașina) și interfața (alegerea din fereastră,
# cererea, lista foilor, titlul, plăcuțele tuturor foilor, legăturile din App).
# Fără otrăvuri care fac bucle fără capăt.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit; e2e-ul, cu
# `CNCVS2_E2E_RETEA=127.0.5` și configul local (`.tmp/pw.config.ts`, portul worktree-ului).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


CR = 'src/io/crc32.ts'
ZP = 'src/io/scrieZip.ts'
PF = 'src/post/foi.ts'
EC = 'src/ui/actiuniExportCalcul.ts'
DE = 'src/ui/DialogExport.tsx'
CO = 'src/app/ExportConectat.tsx'
AP = 'src/app/App.tsx'

# CRC-32 (unitare: valoarea de control, arhiva pe hârtie, cititorul extensiilor).
o('C01', CR, 'c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;', 'c = c & 1 ? 0xedb88321 ^ (c >>> 1) : c >>> 1;', 'foi',
  'alt polinom (scris și citit la fel, deci doar valoarea de control îl prinde)')
o('C02', CR, 'return (c ^ 0xffffffff) >>> 0;', 'return c >>> 0;', 'foi', 'fără inversarea de la capăt')
o('C03', CR, '  let c = 0xffffffff;', '  let c = 0;', 'foi', 'pornit de la 0, nu de la 0xFFFFFFFF')
o('C04', CR, '(TABEL[(c ^ x) & 0xff] ?? 0) ^ (c >>> 8)', '(TABEL[(c ^ x) & 0xff] ?? 0) ^ (c >>> 7)', 'foi', 'deplasarea greșită')
# Scrierea arhivei (unitare).
o('Z01', ZP, 'if (intrari.length > 0xffff) return', 'if (intrari.length > 0x10000) return', 'foi', '65 536 de intrări trec (fără ZIP64)')
o('Z02', ZP, 'if (locale + director + 22 > LIMITA) return', 'if (false) return', 'foi', 'peste 4 GB, fără refuz')
o('Z03', ZP, 'v.setUint16(la, 20, true); // versiunea care o citește (2.0)', 'v.setUint16(la, 10, true); // versiunea care o citește (2.0)',
  'foi', 'versiunea care o citește: 1.0')
o('Z04', ZP, 'v.setUint16(la + 4, 0, true); // stocat', 'v.setUint16(la + 4, 8, true); // stocat', 'foi', 'metoda: deflate, deși e stocată')
o('Z05', ZP, 'const DATA_DOS = (0 << 9) | (1 << 5) | 1;', 'const DATA_DOS = (1 << 9) | (1 << 5) | 1;', 'foi', 'data: 1981')
o('Z06', ZP, 'v.setUint32(la + 10, crc[k] ?? 0, true);', 'v.setUint32(la + 10, 0, true);', 'foi', 'fără CRC')
o('Z07', ZP, 'v.setUint32(la + 14, x.octeti.length, true);', 'v.setUint32(la + 14, 0, true);', 'foi', 'mărimea arhivată: 0')
o('Z08', ZP, 'v.setUint32(la + 18, x.octeti.length, true);', 'v.setUint32(la + 18, 0, true);', 'foi', 'mărimea întreagă: 0')
o('Z09', ZP, 'v.setUint16(la + 22, n.length, true);', 'v.setUint16(la + 22, n.length + 1, true);', 'foi', 'lungimea numelui, cu unu în plus')
o('Z10', ZP, 'v.setUint16(la + 24, 0, true); // fără câmpuri în plus', 'v.setUint16(la + 24, 1, true); // fără câmpuri în plus', 'foi',
  'un câmp în plus anunțat, nescris')
o('Z11', ZP, 'v.setUint16(o + 4, 20, true); // scrisă de versiunea 2.0', 'v.setUint16(o + 4, 0, true); // scrisă de versiunea 2.0', 'foi',
  'directorul: scrisă de versiunea 0')
o('Z12', ZP, 'v.setUint32(o + 42, locuri[k] ?? 0, true);', 'v.setUint32(o + 42, 0, true);', 'foi', 'toate intrările arată spre primul antet')
o('Z13', ZP, 'v.setUint16(o + 8, intrari.length, true);', 'v.setUint16(o + 8, 0, true);', 'foi', 'capătul: nicio intrare pe disc')
o('Z14', ZP, 'v.setUint32(o + 12, o - inceput, true);', 'v.setUint32(o + 12, o - inceput + 1, true);', 'foi', 'mărimea directorului, cu unu în plus')
o('Z15', ZP, 'v.setUint32(o + 16, inceput, true);', 'v.setUint32(o + 16, 0, true);', 'foi', 'directorul anunțat la 0')
o('Z16', ZP, 'out.set(x.octeti, o + 30 + n.length);', 'out.set(x.octeti, o + 30);', 'foi', 'conținutul peste nume')
# Numele în arhivă, comentariile, foile identice (unitare).
o('N01', PF, '  if (scurt) return', '  if (false) return', 'foi', 'numele scurte ignorate')
o('N02', PF, "${n > 1 ? `X${n}` : ''}", "${''}", 'foi', 'numele scurte fără X<N>')
o('N03', PF, "${n > 1 ? `-x${n}` : ''}", '', 'foi', 'fără -x<N> pentru foile identice')
o('N04', PF, 'return nume.startsWith(baza) ?', 'return true ?', 'foi', 'un nume fără bază, tăiat ca unul cu bază')
o('N05', PF, "*/g, '');", "*/, '');", 'foi', 'doar primul comentariu pleacă')
o('N06', PF, '    if (s === null) return;', '    if (false) return;', 'foi', 'foile fără nimic de tăiat se grupează între ele')
o('N07', PF, '    if (g) g.push(k);', '    if (false) g.push(k);', 'foi', 'nicio foaie nu intră în grupul alteia')
# Calculul „Toate foile” (unitare).
o('K01', EC, '    if (taieturiFoaie(d, 0).length === 0) {', '    if (false) {', 'foi', 'foaia goală cerută workerului (refuz)')
o('K02', EC, 'goale.push(nume);', 'void goale;', 'foi', 'foile goale nu se spun')
o('K03', EC, "'cereConfirmare' in r ?", "'cereConfirmare' in {} ?", 'foi', 'refuzul ieșirii din foaie, fără sfatul exportului singur')
o('K04', EC, 'const activ = facute.find((x) => doc.foi[x.k]?.id === activa) ?? facute[0];', 'const activ = facute[0];', 'foi',
  'Mașina primește prima foaie, nu pe cea activă')
o('K05', EC, "  if (!activ) return { ok: false, motiv: 'nicio foaie n-are ce tăia' };", "  if (false) return { ok: false, motiv: 'nicio foaie n-are ce tăia' };",
  'foi', 'toate foile goale: aruncă în loc de refuz')
o('K06', EC, 'new TextEncoder().encode(faraComentarii(x.text))', 'new TextEncoder().encode(x.text)', 'foi',
  'semnătura cu comentarii: copia legată nu mai e identică')
o('K07', EC, 'numeInArhiva(x.nume, prim.k + 1, g.length,', 'numeInArhiva(x.nume, prim.k, g.length,', 'foi', 'foile numerotate de la 0')
o('K08', EC, 'prim.k + 1, g.length, p.origine', 'prim.k + 1, 1, p.origine', 'foi', 'fără ×N în nume')
o('K09', EC, '      linii += x.linii;', '      linii += 0;', 'foi', 'rândurile arhivei: 0')
o('K10', EC, 'const identice = g.slice(1).flatMap', 'const identice = g.slice(0).flatMap', 'foi', 'foaia e identică cu ea însăși')
o('K11', EC, 'secunde: prim.r.rezumat.ok ? prim.r.rezumat.total.secunde : null }', 'secunde: null }', 'foi', 'fără timpul foii')
o('K12', EC, '(f.secunde ?? 0) * (1 + f.identice.length)', '(f.secunde ?? 0)', 'foi', 'timpul tuturor numără foile identice o dată')
o('K13', EC, "contract.numeScurt ? 'CNCVS2.ZIP' :", "false ? 'CNCVS2.ZIP' :", 'foi', 'arhiva cu nume lung pe un controler cu nume scurte')
o('K14', EC, 'const d = doarFoaia(doc, f.id), nume', 'const d = doc, nume', 'foi', 'fiecare foaie exportă documentul întreg (prima foaie)')
o('K15', EC, 'if (p.toateFoile && toate) return', 'if (toate) return', 'foi', 'documentul întreg dat = „Toate foile”, fără alegere')
o('K16', EC, "const contract = CONTRACTE[p.post ?? 'grbl-11'];", "const contract = CONTRACTE['grbl-11'];", 'foi', 'contractul postului ales ignorat')
o('K17', EC, '...(sender ? { masina: fisiere } : {})', '...({})', 'foi', 'Mașina nu primește programul foii active')
# Interfața (e2e).
o('E01', DE, '{(foi ?? 0) > 1 && (', '{(foi ?? 0) > 0 && (', 'e2e', 'alegerea și cu o singură foaie')
o('E02', DE, 'onClick={() => { setToate(true); }}', 'onClick={() => { setToate(false); }}', 'e2e', '„Toate foile” nu se poate alege')
o('E03', DE, '...(toate ? { toateFoile: true } : {})', '...({})', 'e2e', 'cererea nu spune „Toate foile”')
o('E04', DE, '{stare?.ok && stare.foi && <ListaFoi', '{false && <ListaFoi', 'e2e', 'fără lista foilor')
o('E05', DE, "{f.identice.length > 0 ? t('export.foi.identice'", "{false ? t('export.foi.identice'", 'e2e', 'lista nu spune foile identice')
o('E06', DE, 'const n = r.foi.reduce((s, f) => s + 1 + f.identice.length, 0);', 'const n = r.foi.length;', 'e2e',
  'arhiva numără foile identice o dată')
o('E07', DE, '{r.secunde !== null && <p data-foi="timp">', '{false && <p data-foi="timp">', 'e2e', 'fără timpul tuturor')
o('E08', DE, "foaie: toate ? t('export.foi.toate', { n: foi ?? 0 }) : foaie", 'foaie: foaie', 'e2e', 'titlul spune foaia activă')
o('E09', DE, '{toate && <span className="nota" data-testid="export-foi-nota">', '{false && <span className="nota" data-testid="export-foi-nota">',
  'e2e', 'fără nota „Câte un program pe foaie”')
o('E10', DE, 'const pl = toate ? placuteToate : placute;', 'const pl = placute;', 'e2e', '„Toate foile” nu cere bifa plăcuțelor altor foi')
o('E11', CO, 'foi={toate.foi.length}', 'foi={1}', 'e2e', 'fereastra nu știe câte foi are proiectul')
o('E12', CO, 'useMemo(() => placuteIesite(toate), [toate])', 'useMemo(() => placuteIesite(doc), [toate])', 'e2e',
  'plăcuțele tuturor foilor = ale foii active')
o('E13', AP, 'toate: () => curenta.current.istoric.doc,', 'toate: () => doarFoaia(curenta.current.istoric.doc, curenta.current.foaie),',
  'e2e', '„Toate foile” primește doar foaia activă')
o('E14', AP, '(r.masina ?? fisiere).map', 'fisiere.map', 'e2e', 'Mașina primește arhiva, nu programul foii active')
o('E15', AP, '...(r.foi ? { foi: r.foi } : {})', '...({})', 'e2e', 'starea exportului pierde foile')
o('E16', AP, '{...(doc.foi.length > 1 && foaie ? { foaie: numeFoaie(foaie, indexActiva, sablonFoaie) } : {})}', '{...({})}', 'e2e',
  'titlul fără foaie (nici „Toate foile”)')
o('E17', AP, 'const { valori: _valori, ordine: _ordine, ...parametri } = c;',
  'const { valori: _valori, ordine: _ordine, toateFoile: _toate, ...parametri } = c;', 'e2e', 'App pierde „Toate foile” din cerere')

SETURI = {
    'foi': ['test/unit/export.foi.test.ts', 'test/unit/extensii.zip.test.ts'],
}
E2E = ['test/e2e/export-foi.spec.ts', 'test/e2e/placute-iesire.spec.ts']
