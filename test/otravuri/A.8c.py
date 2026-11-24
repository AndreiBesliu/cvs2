# Lista de otrăvuri a feliei A.8c (dialogurile, clicurile fine, derularea și zoom-ul în utilizarea aplicației; ADR 0262 §1, §8),
# 23.11.2026, alese de autor: contractul felurilor noi (lista albă și pe server), înregistratorul (comutatorul clicurilor fine,
# cheile și pauzele numărării, pasul unui gest, plafonul repetărilor, acțiunile reușite), sursa gestului pe straturile pânzei,
# numele controalelor și catalogul scos din sursă (doar controalele și ferestrele, fără admin și fără ce pune codul) și
# cap-coadă, pe emulatoare (clicurile, zoom-ul, dialogurile deschise și închise, gata sau renunțat).
# Unitarele se rulează cu `scripts/otravuri.py`; cele de pe emulatoare cu `scripts/otravuri-emulatoare.py` (docs/otravuri.md),
# dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


S = 'shared/utilizare.ts'
L = 'src/app/utilizareLot.ts'
P = 'src/app/utilizare.ts'
N = 'src/app/numeControl.ts'
K = 'scripts/catalog-controale.ts'
D = 'src/app/utilizareDom.ts'

# Contractul (unitare; serverul folosește aceeași funcție).
o('C01', S, '      if (!id(i) || !din(SURSE, de)) return null;', '      if (!din(SURSE, de)) return null;', 'contract',
  'un clic cu textul butonului în loc de nume trece')
o('C02', S, "      return intreg(n, 1, REPETARI_MAX) ? { fel: 'clic', t, id: i, de, n } : null;",
  "      return intreg(n, 0, REPETARI_MAX) ? { fel: 'clic', t, id: i, de, n } : null;", 'contract', 'un clic de 0 ori trece')
o('C03', S, "      return cheiExact(o, ['fel', 't', 'de', 'n']) && din(SURSE, de) && intreg(n, 1, REPETARI_MAX) ? { fel, t, de, n } : null;",
  "      return cheiExact(o, ['fel', 't', 'de'], ['n', 'id']) && din(SURSE, de) ? { fel, t, de, n } : null;", 'contract',
  'derularea fără trepte sau cu un nume (al listei derulate) trece')
o('C04', S, "      if (!cheiExact(o, ['fel', 't', 'id', 'de'], ['n'])) return null;",
  "      if (!cheiExact(o, ['fel', 't', 'id', 'de'], ['n', 'text'])) return null;", 'contract', 'un clic cu textul butonului alături trece')

# Înregistratorul și sursa gestului (unitare).
o('I01', L, "    if ((ev.fel === 'clic' || ev.fel === 'derulare' || ev.fel === 'zoom') && !setari.clicuri) return;\n", '', 'inreg',
  'clicurile fine oprite din Setări intră oricum')
o('I02', L, "    if ((ev.fel === 'clic' || ev.fel === 'derulare' || ev.fel === 'zoom') && !setari.clicuri) return;",
  "    if (ev.fel === 'clic' && !setari.clicuri) return;", 'inreg', 'cu clicurile fine oprite, derularea și zoom-ul intră')
o('I03', L, "    case 'clic': return { cheie: `c ${ev.id} ${ev.de}`,", "    case 'clic': return { cheie: `c ${ev.id}`,", 'inreg',
  'același control din altă zonă se numără în clicul de dinainte')
o('I04', L, "    case 'zoom': return { cheie: `${ev.fel} ${ev.de}`,", "    case 'zoom': return { cheie: `${ev.fel}`,", 'inreg',
  'derularea din bară se numără în cea din panou')
o('I05', L, 'pauza: PAUZA_GEST_MS, pas: ev.n };', 'pauza: PAUZA_REPETARE_MS, pas: ev.n };', 'inreg',
  'două gesturi de zoom despărțite de o pauză sunt unul singur')
o('I06', L, 'pauza: PAUZA_GEST_MS, pas: ev.n };', 'pauza: PAUZA_GEST_MS, pas: 1 };', 'inreg', 'treptele unui gest se numără câte una')
o('I07', L, '(u.ev.n ?? 1) + r.pas <= REPETARI_MAX', '(u.ev.n ?? 1) < REPETARI_MAX', 'inreg',
  'un gest numărat trece de plafonul repetărilor: serverul îl aruncă')
o('I08', L, "    if (ev.fel === 'actiune' && ev.rez === 'ok') reusite++;", "    if (ev.fel === 'actiune') reusite++;", 'inreg',
  'un refuz se numără ca reușită: un dialog închis după el e „gata”')
o('I09', L, "    if (ev.fel === 'actiune' && ev.rez === 'ok') reusite++;\n", '', 'inreg', 'reușitele nu se numără deloc')
o('I10', P, "  if (e.closest('canvas, .panza-cutie')) return 'panza';", "  if (e.closest('canvas')) return 'panza';", 'inreg',
  'rotița pe mânere sau pe traseu e derulare, nu zoom pe pânză')

# Numele controalelor și catalogul (unitare).
o('K01', N, '    if (n !== null && (DIN_COD.has(p) || catalog.has(n))) return n;', '    if (n !== null) return n;', 'catalog',
  'un atribut făcut din textul omului (un nume de foaie) numește controlul și pleacă')
o('K02', N, "  ['data-actiune', 'actiune'], ['data-context', 'actiune'], ['data-unealta', 'unealta'], ['data-testid', 'testid'],",
  "  ['data-testid', 'testid'], ['data-actiune', 'actiune'], ['data-context', 'actiune'], ['data-unealta', 'unealta'],", 'catalog',
  'un buton al registrului ia numele probei, nu al acțiunii')
o('K03', N, '  const n = `${prefix}.${valoare.toLowerCase().replace(', '  const n = `${prefix}.${valoare.replace(', 'catalog',
  'numele cu majuscule nu e un id bun: controlul nu se mai numește')
o('K04', N, '  return idBun(n) ? n : null;', '  return n;', 'catalog', 'un nume prea lung sau cu prea multe părți trece')
o('K05', K, "=== 'src/admin' ? [] :", "=== 'src/nimic' ? [] :", 'catalog', 'controalele adminului intră în catalog')
o('K06', K, '  if (/^[A-Z]/.test(eticheta) || ETICHETE_CONTROL.has(eticheta)) return true;\n  return RE_ROL.test(',
  '  return true;\n  return RE_ROL.test(', 'catalog', 'orice element cu un atribut de nume intră, nu doar controalele')
o('K07', K, 'NUMIRE.filter(([, p]) => !DIN_COD.has(p))', 'NUMIRE.filter(() => true)', 'catalog',
  'ce pune codul (registrul, uneltele) intră și în catalog')
o('K08', K, '|switch|slider|dialog)"/', '|switch|slider)"/', 'catalog', 'ferestrele nu intră: dialogurile nu se numesc')

# Cap-coadă, pe emulatoare.
o('E01', L, '  urmaresteControalele({ doc: document, win: window, ceas: () => Math.round(performance.now()), primeste: ins.primeste, reusite: ins.reusite });\n',
  '', 'e2e', 'nimic din pagină (clicuri, rotița, dialogurile) nu se prinde')
o('E02', D, "fel: de === 'panza' ? 'zoom' : 'derulare'", "fel: 'derulare'", 'e2e', 'zoom-ul pe pânză e numărat ca derulare')
o('E03', D, "rez: x.principal || d.reusite() > x.reusite ? 'gata' : 'renuntat'", "rez: 'gata'", 'e2e',
  'orice dialog închis e „gata”, și cel părăsit')
o('E04', D, "rez: x.principal || d.reusite() > x.reusite ? 'gata' : 'renuntat'", "rez: d.reusite() > x.reusite ? 'gata' : 'renuntat'", 'e2e',
  'butonul principal al dialogului nu contează (fereastra contului, după intrare, pare părăsită)')
o('E05', D, "rez: x.principal || d.reusite() > x.reusite ? 'gata' : 'renuntat'", "rez: x.principal ? 'gata' : 'renuntat'", 'e2e',
  'o acțiune reușită în dialog nu contează (exportul făcut pare părăsit)')
o('E06', D, "    if (id && !DIN_COD.has(id.slice(0, id.indexOf('.')))) d.primeste(", '    if (id) d.primeste(', 'e2e',
  'un clic pe un buton al registrului sau pe o unealtă se înregistrează de două ori')
o('E07', D, '        for (const x of n.querySelectorAll(ROL_DIALOG)) deschide(x);\n', '', 'e2e',
  'un dialog pus în pagină într-un înveliș nu se vede')
o('E08', D, '        if (n.matches(ROL_DIALOG)) deschide(n);\n', '', 'e2e', 'un dialog pus în pagină direct nu se vede')
o('E09', D, '      if (dialog.isConnected) continue;', '      if (dialog.isConnected || dialog) continue;', 'e2e',
  'un dialog închis nu se mai spune')
o('E10', D, '    if (el.matches(PRINCIPAL)) {', "    if (el.matches('.principal')) {", 'e2e',
  'butonul de trimitere al unui formular (intrarea în cont) nu e principal')
o('E11', D, '  }, { capture: true, passive: true });', '  }, { capture: false, passive: true });', 'e2e',
  'rotița se prinde după ascultătorii pânzei (care o pot opri)')

SETURI = {
    'contract': ['test/unit/utilizare.contract.test.ts'],
    'inreg': ['test/unit/utilizare.inregistrator.test.ts'],
    'catalog': ['test/unit/utilizare.catalog.test.ts'],
}
E2E = ['test/e2e-emulator/utilizare.emulator.spec.ts']
U1 = (E2E[0], 'lotul unui client')
GREP = {k: U1 for k in ['E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'E07', 'E08', 'E09', 'E10', 'E11']}
