# Sabotajele feliei 3.Ta, Planificatorul Trenuleț ca extensie (ADR 0129), 03.11.2026: fiecare apărare a serviciului
# `descarcari.salveaza` (permisiunea, metoda, numele curățat, lista albă, datele, plafonul, răspunsul), a catalogului, a
# construcției fără Python (`repr`, JSON-ul ca `json.dumps`, catalogul, licențele, pachetul) și a adaptoarelor din cadru
# (`window.claude` cu `db` și `downloads`, `localStorage`, atributele `style`, ordinea scripturilor), stricată o dată;
# proba care o apără trebuie să pice. Alese de autorul feliei: plasa autorului, nu runda independentă.
#
# Lăsate afară, echivalente: `revokeObjectURL` după încărcarea unui script (doar memorie) și cel de după descărcare (tot
# memorie; descărcarea a pornit deja); `?? ''` după `pop()` (`split` dă mereu cel puțin un element).
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


DES = 'src/extensii/descarcari.ts'
PAC = 'src/extensii/pachet.ts'
GAZ = 'src/extensii/cadru.ts'
CON = 'scripts/construieste-trenulet.ts'
INT = 'extensii/trenulet/intrare.ts'

E2E = ['test/e2e/trenulet.spec.ts']

SETURI = {
    'descarcari': ['test/unit/extensii.descarcari.test.ts'],
    'trenulet': ['test/unit/trenulet.test.ts'],
    'adaptoare': ['test/unit/trenulet.adaptoare.test.ts'],
}

# ---- serviciul descărcărilor (unitar) ----
o('D01', DES, "  if (!permisiuni.includes('descarcari')) return refuz('permisiune');\n", '', 'descarcari', 'descărcarea fără permisiune')
o('D02', DES, "  if (metoda !== 'salveaza') return refuz('necunoscut');\n", '', 'descarcari', 'o metodă necunoscută salvează')
o('D03', DES, r"(x.split(/[\\/]/).pop() ?? '')", '(x)', 'descarcari', 'calea rămâne în nume')
o('D04', DES, r"x.split(/[\\/]/)", r"x.split(/[/]/)", 'descarcari', 'calea cu \\ rămâne în nume')
o('D05', DES, "    .replace(/[\\u200e\\u200f\\u202a-\\u202e\\u2066-\\u2069]/g, '')\n", '', 'descarcari', 'caracterele de direcție rămân')
o('D06', DES, r'[\u0000-\u001f\u007f<>:"|?*]', r'[\u0000-\u001f\u007f]', 'descarcari', 'caracterele oprite de sistemele de fișiere rămân')
o('D07', DES, r'[\u0000-\u001f\u007f<>:"|?*]', r'[<>:"|?*]', 'descarcari', 'caracterele de control rămân')
o('D08', DES, r"/^[\s.]+|[\s.]+$/g", r"/^$/g", 'descarcari', 'punctele și spațiile de la capete rămân')
o('D09', DES, 'n.length > LIMITE_DESCARCARE.nume', 'n.length > LIMITE_DESCARCARE.nume + 1', 'descarcari', 'numele cu un caracter peste plafon trece')
o('D10', DES, 'tip !== undefined && TIPURI_DESCARCARE.includes(tip) ? n : null', 'n', 'descarcari', 'orice tip trece (și fără tip)')
o('D11', DES, '?.[1]?.toLowerCase();', '?.[1];', 'descarcari', 'tipul scris cu majuscule, refuzat')
o('D12', DES, 'return new Blob([new Uint8Array(x)]);', 'return new Blob([x.buffer]);', 'descarcari', 'din octeți se ia tot tamponul, nu doar vederea')
o('D13', DES, "  if (date.size > LIMITE_DESCARCARE.octeti) return refuz('prea-mare');\n", '', 'descarcari', 'peste 64 MB trece')
o('D14', DES, 'date.size > LIMITE_DESCARCARE.octeti', 'date.size >= LIMITE_DESCARCARE.octeti', 'descarcari', 'exact 64 MB, refuzat')
o('D15', DES, 'if (x instanceof Uint8Array)', 'if (ArrayBuffer.isView(x))', 'descarcari', 'alte tablouri (Uint16Array) trec')
o('D16', DES, "typeof x === 'string' || ", '', 'descarcari', 'textul refuzat')
o('D17', DES, '  salveaza(nume, date);\n', '', 'descarcari', 'răspunsul bun fără salvare')
o('D18', DES, 'return { ok: true, rezultat: nume };', 'return { ok: true, rezultat: argumente[0] };', 'descarcari', 'răspunsul dă numele necurățat')

# ---- catalogul (unitar) ----
o('K01', PAC, "export const CATALOG_PERMISIUNI: readonly string[] = ['stocare', 'descarcari'];", "export const CATALOG_PERMISIUNI: readonly string[] = ['stocare'];", 'trenulet', 'descărcările scoase din catalog')

# ---- construcția (unitar) ----
o('B01', CON, 'if (exp < -4 || exp >= 16) {', 'if (exp < -5 || exp >= 16) {', 'trenulet', '1e-05 scris lung')
o('B02', CON, 'if (exp < -4 || exp >= 16) {', 'if (exp < -4 || exp > 16) {', 'trenulet', '1e+16 scris lung')
o('B03', CON, "return `${semn}${cifre}${'0'.repeat(exp - cifre.length + 1)}.0`;", "return `${semn}${cifre}${'0'.repeat(exp - cifre.length + 1)}`;", 'trenulet', 'întregii float fără .0')
o('B04', CON, 'out += /[.eE]/.test(m[0]) ? reprPython(Number(m[0])) : BigInt(m[0]).toString();', 'out += reprPython(Number(m[0]));', 'trenulet', 'întregii JSON scriși ca float')
o('B05', CON, "jsonCaPython(citeste('planificator', 'catalog.json'))", "JSON.stringify(JSON.parse(citeste('planificator', 'catalog.json')))", 'trenulet', 'catalogul serializat ca de JavaScript (40 în loc de 40.0)')
o('B06', CON, ";window.Cavalier=Cavalier;`", '`', 'trenulet', 'cavalier fără globala lui')
o('B07', CON, "    ['body.html', octeti(citeste('planificator', 'body.html'))],\n", '', 'trenulet', 'marcajul lipsește din pachet')
o('B08', CON, "stiluri: ['trenulet.css']", 'stiluri: []', 'trenulet', 'stilurile pachetului nedeclarate')
o('B09', INT, "'lego.js', 'profiluri.js'", "'profiluri.js', 'lego.js'", 'trenulet', 'scripturile în altă ordine decât pagina')

# ---- adaptoarele (unitar) ----
o('A01', INT, 'return { id, exists: v !== null, data: () => v };', 'return { id, exists: true, data: () => v };', 'adaptoare', 'documentul lipsă „există”')
o('A02', INT, "code: x.message === 'stocare:plin' ? 'quota_exceeded' : x.message", 'code: x.message', 'adaptoare', 'stocarea plină fără codul paginii')
o('A03', INT, 'if (activ && nr === ultima) cb(', 'if (activ) cb(', 'adaptoare', 'o citire veche ajunge după una nouă')
o('A04', INT, "docs.sort((a, b) => (val(a) === val(b) ? 0 : (val(a) < val(b) ? -1 : 1) * (dir === 'desc' ? -1 : 1)));", "docs.sort((a, b) => (val(a) === val(b) ? 0 : (val(a) < val(b) ? -1 : 1)));", 'adaptoare', 'ordinea descrescătoare ignorată')
o('A05', INT, 'return () => { activ = false; set.delete(f); };', 'return () => { set.delete(f); };', 'adaptoare', 'o citire pornită înainte de dezabonare ajunge după ea')
o('A06', INT, "removeItem: (k: string): void => { m.delete(String(k)); scrie(host.stocare.sterge(LS + String(k))); },", "removeItem: (k: string): void => { m.delete(String(k)); },", 'adaptoare', 'ștergerea din localStorage nu ajunge în stocare')
o('A07', INT, '.filter((x) => x.startsWith(LS))', '', 'adaptoare', 'localStorage citește și cheile documentelor')
o('A08', INT, "await host.cere('descarcari.salveaza', filename, data)", "await host.cere('descarcari.salveaza', filename, String(data))", 'adaptoare', 'datele descărcării ajung ca text')
o('A09', INT, "const prefix = `${DB}${col}/`;", "const prefix = DB;", 'adaptoare', 'lista amestecă colecțiile')

# ---- legarea (e2e) ----
o('E01', INT, '  stiluriDinAtribute();\n', '', 'e2e', 'atributele style nu se aplică')
o('E02', INT, '  claudePeste(host);\n', '', 'e2e', 'pagina fără window.claude: circuitele doar „pe acest dispozitiv”')
o('E03', INT, '  await localStoragePeste(host);\n', '', 'e2e', 'fără localStorage: modul 3D uitat')
o('E04', INT, '          f();\n', '', 'e2e', 'abonarea nu dă lista de la început')
o('E05', INT, "throw cuCod(e); });\n        anunta(col);\n      },\n      async get()", "throw cuCod(e); });\n      },\n      async get()", 'e2e', 'o scriere nu reanunță lista')
o('E06', INT, "await host.stocare.sterge(DB + cale).catch((e: unknown) => { throw cuCod(e); });\n        anunta(col);\n", "await host.stocare.sterge(DB + cale).catch((e: unknown) => { throw cuCod(e); });\n", 'e2e', 'o ștergere nu reanunță lista')
o('E07', INT, 'if (a !== null && s && s.cssText !== a) s.cssText = a;', 'if (a !== null && s) s.cssText = a;', 'e2e', 'bucla stilurilor: cssText pus din nou la fiecare mutație')
o('E08', INT, '      else for (const n of x.addedNodes) toate(n);\n', '', 'e2e', 'atributele din marcajul adăugat de scripturi nu se aplică')
o('E09', GAZ, "serviciu === 'descarcari'", "serviciu === 'descarcare'", 'e2e', 'cererea descărcării nu ajunge la serviciu')
o('E10', GAZ, '  a.download = nume;\n', '', 'e2e', 'descărcarea fără numele dat')
