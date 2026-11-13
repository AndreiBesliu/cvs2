# Lista de otrăvuri a feliei 11.1↑b (toate foile pe pânză, ADR 0210 §1), 07.11.2026, alese de autor: rândul foilor (distanța,
# ordinea), încadrarea unei cutii (colțul pe X și pe Y), comutatorul ținut în browser, workerul pânzei (estomparea, foile din
# afara pânzei, locul vecinei, numele), dublu-clicul (vederea mutată odată cu foaia, lovitura, cursorul), trimiterea foilor
# către worker și legăturile din aplicație (locul față de foaia activă, ținerea comutatorului, încadrarea tuturor, butonul cu
# o singură foaie, comutatorul oprit).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit; e2e-ul, cu
# `CNCVS2_E2E_RETEA=127.0.5` și configul local (`.tmp/pw.config.ts`, portul worktree-ului).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


FO = 'src/model/foi.ts'
PO = 'src/canvas/potrivire.ts'
FA = 'src/app/foaiaActiva.ts'
LU = 'src/canvas/lucrator.ts'
PA = 'src/canvas/Panza.tsx'
AP = 'src/app/App.tsx'

# Rândul, încadrarea, comutatorul ținut (unitare).
o('R01', FO, '    x += f.stoc.latime + SPATIU_FOI;', '    x += f.stoc.latime;', 'panza', 'foile se lipesc una de alta')
o('R02', FO, 'export const SPATIU_FOI = 100;', 'export const SPATIU_FOI = 50;', 'panza', 'distanța dintre foi e 50 mm')
o('P01', PO, '/ 2 - x * scara, ty:', '/ 2 + x * scara, ty:', 'panza', 'colțul cutiei pe X se încadrează pe dos')
o('P02', PO, '/ 2 + y * scara };', '/ 2 - y * scara };', 'panza', 'colțul cutiei pe Y se încadrează pe dos')
o('T01', FA, "    return stocare?.getItem(CHEIE_TOATE_FOILE) !== '0';", "    return stocare?.getItem(CHEIE_TOATE_FOILE) === '1';", 'panza',
  'implicit, doar foaia activă')
o('T02', FA, "    stocare?.setItem(CHEIE_TOATE_FOILE, da ? '1' : '0');", "    stocare?.setItem(CHEIE_TOATE_FOILE, '1');", 'panza',
  'oprirea nu se ține minte')
# Workerul pânzei (e2e).
o('W01', LU, '    g.globalAlpha = 0.5;', '    g.globalAlpha = 1;', 'e2e', 'foile vecine nu sunt estompate')
o('W02', LU, '    if (!peEcran(v)) continue;', '    if (peEcran(v)) continue;', 'e2e', 'se sar tocmai foile de pe pânză')
o('W03', LU, '    g.translate(v.x, v.y);\n', '', 'e2e', 'vecina se desenează peste foaia activă, nu la locul ei')
o('W04', LU, '    for (const v of vecine) if (peEcran(v)) g.fillText(v.nume,', '    for (const v of []) if (peEcran(v)) g.fillText(v.nume,', 'e2e',
  'foile vecine n-au numele deasupra')
# Pânza (e2e).
o('D01', PA, '        setVedere({ ...vedere, tx: vedere.tx + f.x * vedere.scara, ty: vedere.ty - f.y * vedere.scara });\n', '', 'e2e',
  'la dublu-clic, pânza sare (vederea nu se mută cu foaia)')
o('D02', PA, 'p.x <= v.x + v.latime', 'p.x <= v.x', 'e2e', 'dublu-clicul nu nimerește nicio foaie')
o('D03', PA, '        onCursor?.({ x: p.x - f.x, y: p.y - f.y });\n', '', 'e2e', 'cursorul rămâne față de foaia de dinainte')
o('D04', PA, '    if (foiTrimise.current !== vecine) {', '    if (false) {', 'e2e', 'foile vecine nu ajung la worker')
# Aplicația (e2e).
o('A01', AP, 'x: (locuri[k] ?? 0) - x0, y: 0,', 'x: locuri[k] ?? 0, y: 0,', 'e2e', 'vecinele stau față de prima foaie, nu de cea activă')
o('A02', AP, '      tineToateFoile(da);\n', '', 'e2e', 'comutatorul nu se ține după reîncărcare')
o('A03', AP, '      setCadruPotrivire(da ? {', '      setCadruPotrivire(false ? {', 'e2e', 'pornit, comutatorul încadrează doar foaia activă')
o('A04', AP, "    if (id === 'vedere.toate-foile') return doc.foi.length < 2 ? null : buton(", "    if (id === 'vedere.toate-foile') return buton(", 'e2e',
  'comutatorul apare și cu o singură foaie')
o('A05', AP, '    if (!toateFoile || doc.foi.length < 2) return [];', '    if (doc.foi.length < 2) return [];', 'e2e',
  'oprit, comutatorul nu ascunde nimic')

SETURI = {
    'panza': ['test/unit/foi.panza.test.ts'],
}
E2E = ['test/e2e/foi.spec.ts']
