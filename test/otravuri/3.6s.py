# Lista de otrăvuri a feliei 3.6s (notificările și semnul din bară, ADR 0194 §A), 13.11.2026, alese de autor: driverul K1
# (finalul cu `state` 2, `materialStatus`), evenimentele (prima stare, legătura pierdută doar cât lucrează, starea veche cât
# lipsește legătura, același fișier, cifrele de dinaintea finalului, lipsa filamentului venită în pauză, pauza din fișier,
# primul strat, eroarea cu altă cheie, cheile, lucrarea nouă), setările (versiunea, valorile stricate, implicitul primului
# strat), semnul, metrii, titlul filei și fereastra (prin e2e: bifele evenimentelor, notificarea doar cât cvs2 e ascuns,
# clicul pe notificare, banda închisă la Reia, ✓ până se vede, titlul, locul semnului, legarea la deschidere, permisiunea).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


NL = chr(10)
CR = 'src/machine/imprimanta/creality.ts'
EV = 'src/machine/imprimanta/evenimente.ts'
NO = 'src/app/notificariImprimanta.ts'
TF = 'src/app/titluFila.ts'
VE = 'src/app/VestiriImprimanta.tsx'
AP = 'src/app/App.tsx'
PI = 'src/app/PanouImprimanta.tsx'

# Driverul K1.
o('D01', CR, "    if (i.cod === 2) return 'gata';" + NL, '', 'notif', '`state` 2 la 99 % nu mai e „gata”')
o('D02', CR, 'stare.faraFilament = material === 1;', 'stare.faraFilament = material === 0;', 'notif', 'senzorul citit pe dos')
o('D03', CR, '  if (material !== null) stare.faraFilament = material === 1;' + NL, '', 'notif', '`materialStatus` necitit')
# Evenimentele.
o('E01', EV, "if (a === null || a.lucrare === 'necunoscuta' || b.lucrare === 'necunoscuta') return [];", 'if (a === null) return [];', 'notif',
  'prima stare după legare (din necunoscut) anunță o eroare veche')
o('E02', EV, " && b.legatura === 'pierduta' && LUCREAZA.has(a.lucrare)) r.push", " && b.legatura === 'pierduta') r.push", 'notif',
  'legătura pierdută anunțată și fără lucrare')
o('E03', EV, "  if (b.legatura !== 'vie') return r;" + NL, '', 'notif', 'starea veche, ținută cât lipsește legătura, anunță')
o('E04', EV, 'if (a.fisier !== null && a.fisier === b.fisier && LUCREAZA.has(a.lucrare))', 'if (LUCREAZA.has(a.lucrare))', 'notif',
  'alt fișier luat drept finalul celui dinainte')
o('E05', EV, '{ durata: maxim(a.trecut, b.trecut), filament: maxim(a.filament, b.filament) }', '{ durata: b.trecut, filament: b.filament }', 'notif',
  'durata și filamentul de după final (0)')
o('E06', EV, "if (b.faraFilament === true && (a.lucrare !== 'pauza' || a.faraFilament !== true))", "if (b.faraFilament === true && a.lucrare !== 'pauza')",
  'notif', 'lipsa filamentului venită în pauză nu se anunță')
o('E07', EV, "r.push(b.pauzaFisier === null ? ev('pauza') : ev('pauzaFisier',", "r.push(true ? ev('pauza') : ev('pauzaFisier',", 'notif',
  'pauza din fișier anunțată ca oricare')
o('E08', EV, 'a.strat === 1 && b.strat !== null && b.strat >= 2', 'b.strat !== null && b.strat >= 2', 'notif', 'primul strat anunțat la fiecare strat')
o('E09', EV, '(b.eroare !== a.eroare || b.cheieEroare !== a.cheieEroare)', '(b.eroare !== a.eroare)', 'notif', 'altă cheie a aceluiași cod, neanunțată')
o('E10', EV, ": (e.strat ?? '')}`;", ": ''}`;", 'notif', 'două pauze ale aceleiași lucrări, o singură cheie')
o('E11', EV, ' || a.fisier !== b.fisier;', ';', 'notif', 'alt fișier nu e o lucrare nouă')
# Setările, semnul, textele.
o('N01', NO, " || x['v'] !== 1) return SETARI_IMPLICITE;", ') return SETARI_IMPLICITE;', 'notif', 'altă versiune a setărilor, citită')
o('N02', NO, "(typeof v === 'boolean' ? v : implicit)", "(v === undefined ? implicit : Boolean(v))", 'notif', 'o valoare stricată („da”) luată drept bifă')
o('N03', NO, '  if (lucreaza && x.eroare !== null) return', '  if (x.eroare !== null) return', 'notif', 'semnul roșu și fără lucrare (un cod rămas)')
o('N04', NO, "if (x.lucrare === 'gata' && x.gataNevazut)", "if (x.lucrare === 'gata')", 'notif', '✓ și după ce s-a văzut')
o('N05', NO, 'pierduta: true, primulStrat: false },', 'pierduta: true, primulStrat: true },', 'notif', 'primul strat pornit implicit')
o('N06', NO, '{ maximumFractionDigits: mm < 1000 ? 2 : 1 }', '{ maximumFractionDigits: 1 }', 'notif', '„0 m de filament” pe o lucrare scurtă')
# Titlul filei.
o('T01', TF, "const ORDINE = ['masina', 'imprimanta'] as const;", "const ORDINE = ['imprimanta', 'masina'] as const;", 'notif',
  'imprimanta înaintea mașinii în titlu')
o('T02', TF, "  if (text === null || text === '') delete parti[sursa];", '  if (text === null) delete parti[sursa];', 'notif',
  'o parte goală rămâne în titlu')
# Fereastra și carcasa (prin e2e).
o('U01', VE, '      if (!setari.evenimente[e.fel]) continue;' + NL, '', 'e2e', 'evenimentele oprite (primul strat) se anunță tot')
o('U02', VE, 'const sistem = (ascuns || setari.sistemInFata) && notificaSistemul(', 'const sistem = notificaSistemul(', 'e2e',
  'notificarea sistemului și cu cvs2 în față')
o('U03', VE, "&& clipa.lucrare === 'imprima') return null;", '&& false) return null;', 'e2e', 'banda pauzei rămâne după Reia')
o('U04', VE, '  useEffect(() => { if (vizibila) setGataNevazut(false); }, [vizibila]);' + NL, '', 'e2e', '✓ rămâne după ce deschizi fereastra')
o('U05', VE, "const parte = !setari.titlu || legatura !== 'vie' ? null", 'const parte = true ? null', 'e2e', 'procentul nu ajunge în titlu')
o('U06', VE, 'void cerePermisiunea().then(setPerm);', 'void cerePermisiunea();', 'e2e', 'cardul nu află că permisiunea s-a dat')
o('U07', NO, 'n.onclick = () => { window.focus(); laClic(); n.close(); };', 'n.onclick = () => { window.focus(); n.close(); };', 'e2e',
  'clicul pe notificare nu aduce fereastra Imprimanta')
o('U08', AP, "f === 'imprimanta' ? <span id=\"loc-semn-imprimanta\" className=\"loc-semn-imprimanta\" /> : null", 'null', 'e2e',
  'fila Imprimanta fără locul semnului')
o('U09', AP, '    if (!legareLaPornire()) return;' + NL, '    return;' + NL, 'e2e', 'bifa „leagă la deschidere” nu montează fereastra')
o('U10', PI, 'if (!setari.legare || x === undefined || ', 'if (true || x === undefined || ', 'e2e', 'fereastra montată nu se leagă singură')

SETURI = {
    'notif': ['test/unit/imprimanta.notificari.test.ts'],
    'notif2': ['test/unit/imprimanta.notificari.test.ts', 'test/unit/imprimanta.creality.test.ts', 'test/unit/imprimanta.sesiune.test.ts'],
}
E2E = ['test/e2e/imprimanta.spec.ts']
