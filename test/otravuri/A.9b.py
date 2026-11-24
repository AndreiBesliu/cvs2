# Lista de otrăvuri a feliei A.9b (fila Utilizare din /admin; ADR 0262 §6), 24.11.2026, alese de autor: sumele perioadei
# (zilele fără formă, segmentele, unirea oamenilor, adunarea numerelor), cifrele, cele mai folosite (ordinea, partea din taste
# și paletă), ce nu se folosește (ordinea, uneltele), frecările (refuzurile, dialogurile părăsite), duratele (cuantila, câte),
# perioada după calendar; catalogul generat la build (ordinea, uneltele, numele scurte); legăturile filei (bara, permisiunea,
# bucata doar online); pagina pe emulatoare (ziua de azi, perioada, cine, numele, motivele, treptele, catalogul, mesajul gol).
# Unitarele se rulează cu `scripts/otravuri.py`; setul „e2e”, cu `scripts/otravuri-emulatoare.py`, în `firebase emulators:exec`.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


D = 'src/admin/utilizare/date.ts'
C = 'scripts/catalogActiuni.ts'
F = 'src/admin/utilizare/FilaUtilizare.tsx'

# Partea pură (unitare).
o('D01', D, "typeof d['zi'] !== 'string' || !RE_ZI.test(d['zi']) || !obiect(d['segmente'])", "typeof d['zi'] !== 'string' || !obiect(d['segmente'])",
  'perioada', 'o zi cu numele stricat se numără')
o('D02', D, "alegere === 'toti' ? ['clienti', 'personal'] : [alegere]", '[alegere]', 'perioada', '„Toți” nu arată nimic')
o('D03', D, '      r.oameni = unesteIn(r.oameni, s[\'oameni\'], P_OAMENI);', '      r.oameni = schitaDin(s[\'oameni\'], P_OAMENI) ?? r.oameni;',
  'perioada', 'oamenii perioadei sunt doar ai ultimei zile citite')
o('D04', D, "          x.n += numar(a['n']);", "          x.n = numar(a['n']);", 'perioada', 'de câte ori, doar din ultima zi')
o('D05', D, '  for (const [k, v] of Object.entries(x)) tinta[k] = (tinta[k] ?? 0) + numar(v);', '  for (const [k, v] of Object.entries(x)) tinta[k] = numar(v);',
  'perioada', 'sursele și motivele nu se adună peste zile')
o('D06', D, "exporturi: p.calcule.get('export')?.ok ?? 0", "exporturi: p.actiuni.get('export.gcode')?.ok ?? 0", 'perioada',
  'programele exportate se numără din clicuri, nu din calculele reușite')
o('D07', D, 'DIN_TASTE.reduce((s, d) => s + (a.de[d] ?? 0), 0)', "(a.de['tasta'] ?? 0)", 'perioada', 'paleta nu intră în partea din taste')
o('D08', D, '.sort((a, b) => b.n - a.n || (a.id < b.id ? -1 : 1)).slice(0, k);', '.sort((a, b) => a.n - b.n || (a.id < b.id ? -1 : 1)).slice(0, k);',
  'perioada', 'cele mai folosite sunt de fapt cele mai puțin folosite')
o('D09', D, '      const x = p.unelte.get(u.id);', '      const x = p.actiuni.get(u.id);', 'perioada', 'uneltele folosite apar nefolosite')
o('D10', D, 'randuri.sort((a, b) => a.oameni - b.oameni ||', 'randuri.sort((a, b) => b.oameni - a.oameni ||', 'perioada',
  'ce nu se folosește arată întâi ce se folosește')
o('D11', D, 'return r.sort((a, b) => b.n - a.n', 'return r.sort((a, b) => a.n - b.n', 'perioada', 'refuzurile rare întâi')
o('D12', D, '.filter(([, d]) => d.renuntat > 0)', '.filter(([, d]) => d.deschis > 0)', 'perioada', 'un dialog dus până la capăt e socotit părăsit')
o('D13', D, '    if (cum >= q * total) return k;', '    if (cum > q * total) return k;', 'perioada', 'mediana cade o treaptă mai sus când e exact la jumătate')
o('D14', D, 'id, n: c.ok + c.eroare + c.anulat,', 'id, n: c.ok,', 'perioada', 'calculele căzute nu se numără')
o('D15', D, '(z ?? 1) - n)', '(z ?? 1) - n + 1)', 'perioada', 'perioada are o zi mai puțin')

# Catalogul generat la build (unitare).
o('C01', C, 'return { id, ro: numeScurt(r), en: numeScurt(e) };', 'return { id, ro: r, en: e };', 'perioada',
  'numele lungi, cu tasta și explicația, ajung în filă')
o('C02', C, '    actiuni: [...actiuni].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),', '    actiuni: [...actiuni],', 'perioada',
  'catalogul nu mai e în ordinea id-urilor (ieșirea build-ului depinde de ordinea registrelor)')
o('C03', C, "    unelte: UNELTE.map((u) => intrare(u, `editare.unealta.${u}`)),", '    unelte: [],', 'perioada', 'uneltele lipsesc din catalog')

# Legăturile filei (unitare).
o('W01', 'src/admin/personal/date.ts', "  utilizare: ['utilizare.citeste'],\n", '', 'personal',
  'fila nu cere nicio permisiune: o vede oricine din personal')
o('W02', 'shared/precache.ts', ", 'FilaUtilizare'", '', 'precache', 'bucata filei intră în precache, la fiecare client')
o('W03', 'src/admin/carcasa/date.ts', "'sugestii', 'utilizare', 'roadmap'", "'sugestii', 'roadmap'", 'carcasa', 'fila lipsește din bară')

# Pagina, pe emulatoare.
o('E01', F, "where('zi', '<', azi)", "where('zi', '<=', azi)", 'e2e', 'ziua de azi, neîncheiată, intră în perioadă')
o('E02', F, 'sumePerioada(zile.valoare, segment)', "sumePerioada(zile.valoare, 'clienti')", 'e2e', '„Cine” nu schimbă nimic')
o('E03', F, "where('zi', '>=', primaZi(azi, perioada))", "where('zi', '>=', primaZi(azi, 30))", 'e2e', 'perioada aleasă nu schimbă citirea')
o('E04', F, "m.set(a.id, l === 'en' ? a.en : a.ro)", 'm.set(a.id, a.en)', 'e2e', 'numele acțiunilor rămân în engleză')
o('E05', F, "  if (!motiv.startsWith('motiv.')) return null;", '  return null;', 'e2e', 'motivele rămân chei, deși au text')
o('E06', F, '`${nr.format(x / 1000)} s`', '`${nr.format(x)} s`', 'e2e', 'treptele duratelor se scriu în milisecunde, cu „s”')
o('E07', 'src/admin/documentatie/aducere.ts', 'o(FISIER_ACTIUNI, json(esteCatalogActiuni))', "o('documentatie/lipsa.json', json(esteCatalogActiuni))",
  'e2e', 'catalogul nu se găsește: ce nu se folosește lipsește')
o('E08', F, '  if (sume.zile === 0) return', '  if (sume.zile < 0) return', 'e2e', 'fără zile, cifre goale în loc de mesajul care spune de ce')

SETURI = {
    'perioada': ['test/unit/admin.utilizare.test.ts'],
    'personal': ['test/unit/admin.personal.test.ts'],
    'precache': ['test/unit/precache.test.ts'],
    'carcasa': ['test/unit/admin.carcasa.test.ts'],
}
E2E = ['test/e2e-emulator/fila-utilizare.emulator.spec.ts']
OWNER = 'owner-ul: perioada fără ziua de azi'
GREP = {k: OWNER for k in ['E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'E07']}
GREP['E08'] = 'un rol doar cu'
