# Sabotajele feliei 3.Xb, stocarea extensiilor și permisiunile (ADR 0128), 03.11.2026: fiecare apărare a serviciului
# `stocare.*` (permisiunea, cheile, valorile JSON și octeții, plafoanele, valoarea înlocuită, cheile citite) și a legării
# (catalogul, cadrul care trimite cererea, ștergerea datelor la scoatere, fereastra instalării, gestionarea) stricată o
# dată; proba care o apără trebuie să pice. Alese de autorul feliei: plasa autorului, nu runda independentă.
#
# Lăsate afară, echivalente: găurile unei liste (`!(i in v)`: un element lipsă e `undefined`, refuzat oricum); valoarea
# lipsă (`argumente.length < 2`: `undefined` e refuzat oricum); marginea cheilor `[id, …]` (orice prag după șirurile folosite
# dă aceleași rânduri). Nerulată: `stocare:indisponibila` din cadru (IndexedDB căzut după instalare, fără probă în browser).
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


STO = 'src/extensii/stocare.ts'
PAC = 'src/extensii/pachet.ts'
CAD = 'shared/cadruExtensie.ts'
GAZ = 'src/extensii/cadru.ts'
DEP = 'src/extensii/depozit.ts'
INS = 'src/extensii/Instalare.tsx'

E2E = ['test/e2e/extensii.spec.ts']

SETURI = {
    'stocare': ['test/unit/extensii.stocare.test.ts'],
    'pachet': ['test/unit/extensii.pachet.test.ts', 'test/unit/extensii.zip.test.ts'],
    'csp': ['test/unit/csp.extensii.test.ts', 'test/unit/firebase-json.test.ts'],
}

# ---- serviciul stocării (unitar) ----
o('S01', STO, "  if (!permisiuni.includes('stocare')) return refuz('permisiune');\n", '', 'stocare', 'stocarea fără permisiune')
o('S02', STO, 'c.length <= LIMITE_STOCARE.cheie', 'c.length <= LIMITE_STOCARE.cheie + 1', 'stocare', 'cheia prea lungă trece')
o('S03', STO, 'c.length > 0 && ', '', 'stocare', 'cheia goală trece')
o('S04', STO, 'return Number.isFinite(v);', 'return true;', 'stocare', 'NaN și Infinity trec')
o('S05', STO, 'nivel >= LIMITE_STOCARE.adancime', 'nivel > LIMITE_STOCARE.adancime', 'stocare', 'un nivel în plus trece')
o('S06', STO, '  if (p !== Object.prototype && p !== null) return false;\n', '', 'stocare', 'obiectele cu prototip (Date, Map) trec')
o('S07', STO, "      if (octeti > LIMITE_STOCARE.valoare) return refuz('plin');\n", '', 'stocare', 'valoarea peste 4 MB trece')
o('S08', STO, 'let total = octeti - (veche ?? 0);', 'let total = octeti;', 'stocare', 'valoarea înlocuită se numără de două ori')
o('S09', STO, '(veche === undefined && marimi.size >= LIMITE_STOCARE.chei)', '(marimi.size >= LIMITE_STOCARE.chei)', 'stocare', 'o cheie înlocuită la plafonul cheilor, refuzată')
o('S10', STO, 'rezultat: v === undefined ? null : v', 'rezultat: v', 'stocare', 'cheia lipsă nu se citește null')
o('S11', STO, "return { ok: true, rezultat: [...(await d.marimi(id)).keys()].sort() };", "return { ok: true, rezultat: [...(await d.marimi(id)).keys()] };", 'stocare', 'cheile nesortate')
o('S12', STO, '  if (v instanceof Uint8Array) return v.byteLength;\n', '', 'stocare', 'octeții Uint8Array refuzați')

# ---- catalogul și încărcătorul (unitar) ----
o('K01', PAC, "export const CATALOG_PERMISIUNI: readonly string[] = ['stocare'];", 'export const CATALOG_PERMISIUNI: readonly string[] = [];', 'pachet', 'stocarea scoasă din catalog')
o('L01', CAD, "scrie: (cheie, valoare) => cere('stocare.scrie', cheie, valoare),", "scrie: (cheie, valoare) => cere('stocare.scrie', cheie),", 'csp', 'încărcătorul schimbat fără amprenta nouă')

# ---- legarea (e2e) ----
o('E01', GAZ, "serviciu === 'stocare'", "serviciu === 'stocarea'", 'e2e', 'cererea stocării nu ajunge la serviciu')
o('E02', DEP, '  t.objectStore(DATE).delete(aleExtensiei(id));\n', '', 'e2e', 'scoaterea lasă datele')
o('E03', INS, 'p.manifest.permisiuni.length === 0 ?', 'true ?', 'e2e', 'fereastra instalării nu spune ce cere extensia')
o('E04', INS, 'date[x.id] !== undefined && ', 'false && ', 'e2e', 'gestionarea nu arată datele')
