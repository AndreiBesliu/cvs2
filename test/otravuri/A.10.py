# Lista de otrăvuri a feliei A.10 (fluxurile în fila Utilizare; ADR 0262 §6), 24.11.2026, alese de autor: secvențele din
# sumele zilei (ordinea după timp peste loturi, repetările lipite, doar acțiunile reușite, selecția și navigarea deoparte,
# sesiunile numărate o dată, cele mai dese păstrate, lungimile), pâlnia (pasul cel mai departe, exportul căzut, acțiunea
# refuzată, lucrarea pornită, oamenii pe pas), adunarea pe perioadă (sesiunile secvențelor, oamenii pâlniei, cei care se
# opresc, lungimea cerută) și pagina pe emulatoare (durata sesiunii, „se opresc aici” doar unde e cazul, numele acțiunilor
# în secvențe, lista fiecărei lungimi).
# Unitarele se rulează cu `scripts/otravuri.py`; setul „e2e”, cu `scripts/otravuri-emulatoare.py`, în `firebase emulators:exec`.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


Z = 'shared/utilizareZi.ts'
D = 'src/admin/utilizare/date.ts'
F = 'src/admin/utilizare/FilaUtilizare.tsx'

# Sumele zilei (unitare).
o('F01', Z, '    const ordonati = [...ses.pasi].sort((a, b) => a[0] - b[0] || a[1] - b[1]);', '    const ordonati = [...ses.pasi];', 'fluxuri',
  'pașii se iau în ordinea sosirii loturilor, nu a timpului')
o('F02', Z, '.map((p) => p[2]).filter((id, i, a) => i === 0 || id !== a[i - 1]);', '.map((p) => p[2]);', 'fluxuri',
  'repetările la rând nu se lipesc: „Rotește → Rotește → Rotește” e o secvență')
o('F03', Z, "if (e.fel === 'actiune' && e.rez === 'ok' && intraInSecventa(e.id))", "if (e.fel === 'actiune' && intraInSecventa(e.id))", 'fluxuri',
  'acțiunile refuzate intră în secvențe')
o('F04', Z, "e.rez === 'ok' && intraInSecventa(e.id)) ses.pasi", "e.rez === 'ok') ses.pasi", 'fluxuri', 'selecția și navigarea intră în secvențe')
o('F05', Z, r'vedere\.(?!traseu$|masina$|imprimanta$|freze$)', r'vedere\.', 'fluxuri', 'traseul și mașina sunt socotite navigare')
o('F06', Z, """        if (!vazute.has(k)) {
          vazute.add(k);
          v.s++;
        }""", '        v.s++;', 'fluxuri', 'o buclă numără aceeași sesiune de mai multe ori')
o('F07', Z, '.slice(0, SECVENTE_PE_LUNGIME);', ';', 'fluxuri', 'toate secvențele zilei se scriu: documentul crește fără margine')
o('F08', Z, 'export const LUNGIMI_SECVENTA = [3, 4] as const;', 'export const LUNGIMI_SECVENTA = [3] as const;', 'fluxuri', 'secvențele de 4 lipsesc')
o('F09', Z, '    for (let k = 0; k <= ses.pas; k++) {', '    for (let k = ses.pas; k <= ses.pas; k++) {', 'fluxuri',
  'o sesiune se numără doar la pasul ei cel mai departe, nu și la cei dinainte')
o('F10', Z, "e.id === 'export' && e.rez === 'ok' ? 3 : 0", "e.id === 'export' ? 3 : 0", 'fluxuri', 'un export căzut trece drept export')
o('F11', Z, "return e.rez !== 'ok' ? 0 : CONTINUT.has(e.id)", 'return CONTINUT.has(e.id)', 'fluxuri', 'un rol refuzat trece drept rol')
o('F12', Z, "e.id === 'pornita' ? 4 : 0", '4', 'fluxuri', 'orice eveniment al mașinii (și legarea) trece drept lucrare pornită')
o('F13', Z, '      ses.pas = Math.max(ses.pas, pasPalnie(e));\n', '', 'fluxuri', 'pâlnia nu vede niciun pas')
o('F14', Z, '      adaugaInSchita(p.oameni, P_OAMENI, ses.h);\n', '', 'fluxuri', 'oamenii pâlniei nu se numără')
o('F15', Z, '{ min: Infinity, max: -Infinity, h, pasi: [], pas: 0 }', '{ min: Infinity, max: -Infinity, h: 0, pasi: [], pas: 0 }', 'fluxuri',
  'toate sesiunile sunt ale aceluiași om')

# Perioada (unitare).
o('P01', D, "          y.s += numar(x['s']);", "          y.s = numar(x['s']);", 'perioada', 'sesiunile unei secvențe, doar din ultima zi')
o('P02', D, "          y.oameni = unesteIn(y.oameni, x['oameni'], P_OAMENI);", "          y.oameni = schitaDin(x['oameni'], P_OAMENI) ?? y.oameni;",
  'perioada', 'oamenii pâlniei, doar ai ultimei zile')
o('P03', D, 'seOpresc: urm ? Math.max(0, sesiuni - urm.sesiuni) : null', 'seOpresc: urm ? sesiuni : null', 'perioada',
  '„se opresc aici” numără toți cei ajunși la pas')
o('P04', D, '.filter((r) => r.pasi.length === lungime)', '', 'perioada', 'lista celor de 3 are și secvențele de 4')

# Pagina, pe emulatoare.
o('E01', F, '`${nr.format(x)} min`', '`${nr.format(x * 60)} min`', 'e2e', 'durata sesiunii se scrie în secunde, cu „min”')
o('E02', F, '{r.seOpresc ? <span', '{r.seOpresc !== null ? <span', 'e2e', '„se opresc aici: 0” pe pașii unde nu se oprește nimeni')
o('E03', F, "{r.pasi.map((id, i) => <span key={i}>{i > 0 ? ' → ' : ''}{numeActiune(id)}</span>)}", "{r.pasi.join(' → ')}", 'e2e',
  'secvențele arată id-urile, nu numele acțiunilor')
o('E04', F, 'const randuri = secventeleDese(sume, L);', 'const randuri = secventeleDese(sume, 3);', 'e2e', 'lista celor de 4 arată tot secvențele de 3')

SETURI = {
    'fluxuri': ['test/unit/utilizare.fluxuri.test.ts'],
    'perioada': ['test/unit/admin.utilizare.test.ts'],
}
E2E = ['test/e2e-emulator/fila-utilizare.emulator.spec.ts']
GREP = {k: 'owner-ul: perioada fără ziua de azi' for k in ['E01', 'E02', 'E03', 'E04']}
