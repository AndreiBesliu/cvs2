# Lista de otrăvuri a feliei 3.6p (pauza la un strat, ADR 0193 §A), 09.11.2026, alese de autor: stratul fiecărei pauze
# (înălțimea ținută, toleranța, primul strat), locul pauzei în fișier (după schimbarea stratului, Z-ul și temperaturile celui
# de-al doilea), notele (ASCII, fără rânduri noi, alăturate pe același strat), comanda din profilul K1C, pauzele găsite de
# verificarea fișierului (comenzile, straturile cvs2 și Cura, înălțimea, nota, plafonul), pauzele ținute în browser (cheia,
# ordinea, cele mai vechi ies, valorile stricate), plus dialogul și trimiterea (prin e2e: butonul, semnele, lista, rezumatul,
# fișierul, păstrarea, pauzele la trimitere și la pornire).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


# Bara inversă, fără să apară scrisă ca atare (regex-urile cu escape-uri unicode din sursă).
B = chr(92)

GC = 'src/cam/feliere/gcode.ts'
PR = 'src/cam/feliere/profil.ts'
GA = 'src/machine/imprimanta/gcode3d.ts'
PD = 'src/app/pauzeDesen.ts'
DD = 'src/app/DialogDinDesen.tsx'
UI = 'src/app/PanouImprimanta.tsx'

# Stratul fiecărei pauze.
o('P01', GC, '    for (let k = 2; k <= plan.length; k++) {', '    for (let k = 3; k <= plan.length; k++) {', 'pauza',
  'nicio pauză înaintea stratului 2')
o('P02', GC, '      if (z >= p.h - EPS_PAUZA) return { ...p, k, z };', '      if (z > p.h + EPS_PAUZA) return { ...p, k, z };', 'pauza',
  'pauza cade cu un strat mai sus (strict peste înălțime)')
o('P03', GC, 'const EPS_PAUZA = 1e-6;', 'const EPS_PAUZA = 0;', 'pauza', 'o eroare de rotunjire mută pauza pe stratul următor')
# Locul pauzei în fișier.
o('F01', GC, "    if (linii[i] !== ';AFTER_LAYER_CHANGE') continue;", "    if (linii[i] !== ';LAYER_CHANGE') continue;", 'pauza',
  'pauza înaintea mutării pe Z a stratului (după ;LAYER_CHANGE)')
o('F02', GC, '    if (i + 1 < linii.length) rez.push(linii[++i]!);', '', 'pauza', 'pauza înaintea comentariului cu Z-ul stratului')
o('F03', GC, '    while (i + 1 < linii.length && /^M1(?:04|40) S' + B + 'd+$/.test(linii[i + 1]!)) rez.push(linii[++i]!);', '', 'pauza',
  'pauza înaintea temperaturilor celui de-al doilea strat')
o('F04', GC, "    rez.push(';PAUSE_PRINT');", '', 'pauza', 'fără semnul OrcaSlicer al pauzei')
o('F05', GC, "    if (n !== '' && !x.includes(n)) x.push(n);", "    if (n !== '') x.push(n);", 'pauza', 'aceeași notă de două ori pe un strat')
o('F06', GC, "`; pause note: ${note.join(' / ')}`", '`; pause note: ${note[0]}`', 'pauza', 'doar prima notă a unui strat cu două pauze')
o('F07', PR, "  pauza: 'PAUSE',", "  pauza: 'M600',", 'pauza', 'comanda de pauză a K1C schimbată')
# Nota.
o('N01', GC, ".normalize('NFD').replace(/[" + B + 'u0300-' + B + "u036f]/g, '')", ".normalize('NFC')", 'pauza',
  'diacriticele nu se mai scot (litera se pierde)')
o('N02', GC, ".replace(/[^" + B + 'x20-' + B + "x7e]/g, '')", '', 'pauza', 'un caracter în afara ASCII ajunge în fișier')
o('N03', GC, "  return t.replace(/[" + B + 'u0000-' + B + 'u001f' + B + 'u007f-' + B + "u009f]/g, ' ').trim()", '  return t.trim()', 'pauza',
  'un rând nou rămâne în notă')
o('N04', GC, '.trim().slice(0, NOTA_PAUZA_MAX).trim();', '.trim();', 'pauza', 'nota fără plafon')
# Pauzele găsite de verificarea fișierului.
o('A01', GA, '(PAUSE|M0|M1|M25|M226|M600|M601)(?=' + B + 's|$)/;', '(PAUSE|M0|M1|M25|M226|M600|M601)/;', 'pauza', 'M104 luat drept M1')
o('A02', GA, '(PAUSE|M0|M1|M25|M226|M600|M601)', '(PAUSE|M0|M1|M25|M226|M601)', 'pauza', 'schimbarea filamentului (M600) nu mai e pauză')
o('A03', GA, "felStrat = 'schimbare'; strat++;", "felStrat = 'schimbare'; strat += 2;", 'pauza', 'straturile numărate greșit')
o('A04', GA, '        zAnterior = zAcum; zAcum = Number(m[1]);', '        zAcum = Number(m[1]); zAnterior = zAcum;', 'pauza',
  'înălțimea pauzei: a stratului de acum, nu a celui de dedesubt')
o('A05', GA, '      nota = null;\n      return;\n    }', '      return;\n    }', 'pauza', 'nota trece la pauza următoare')
o('A06', GA, "felStrat = 'cura'; strat = Number(m[1]) + 1;", "felStrat = 'cura'; strat = Number(m[1]);", 'pauza',
  'straturile Cura numărate de la 0')
o('A07', GA, '      if (pauze.length < MAX_PAUZE) {', '      if (true) {', 'pauza', 'pauzele fără plafon')
# Pauzele ținute în browser.
o('S01', PD, "[...ids].sort().join(',')", "[...ids].join(',')", 'pauza', 'cheia depinde de ordinea pieselor')
o('S02', PD, '  return [...(citesteTot(d).get(cheie)?.pauze ?? [])].sort((a, b) => a.h - b.h);',
  '  return [...(citesteTot(d).get(cheie)?.pauze ?? [])];', 'pauza', 'pauzele citite neordonate')
o('S03', PD, '.sort((a, b) => b[1].la - a[1].la).slice(0, MAX_DESENE)', '.slice(0, MAX_DESENE)', 'pauza', 'ies cele mai noi desene, nu cele vechi')
o('S04', PD, '  if (bune.length > 0) tot.set(cheie, { pauze: bune, la: acum });', '  tot.set(cheie, { pauze: bune, la: acum });', 'pauza',
  'o listă goală nu scoate desenul')
o('S05', PD, " h <= 0 ||", '', 'pauza', 'o înălțime negativă trece')
o('S06', PD, "(x as { v?: unknown }).v !== 1", 'false', 'pauza', 'o altă versiune a listei se citește')
# Dialogul și trimiterea (prin e2e).
o('U01', DD, "[...pauze, { h: aici, nota: '' }]", "[...pauze, { h: aici + 0.2, nota: '' }]", 'e2e', 'pauza pusă cu un strat mai sus')
o('U02', DD, 'aria-pressed={pauzaAici} disabled={aici === null}', 'aria-pressed={pauzaAici}', 'e2e', 'butonul pornit pe primul strat')
o('U03', DD, '    scriePauze(cheieP, ordonate);', '', 'e2e', 'pauzele nu se țin la redeschidere')
o('U04', DD, 'new File([cuPauze(g.text, pus, K1C.pauza)]', 'new File([g.text]', 'e2e', 'fișierul salvat fără pauze')
o('U05', DD, '{n > 1 && straturiPauze.length > 0 && (', '{n > 1 && straturiPauze.length > 1 && (', 'e2e', 'semnul unei singure pauze lipsește')
o('U06', DD, "straturiPauze.length === 1 ? 'imprimanta.felie.rezumat.pauza' : 'imprimanta.felie.rezumat.pauze'",
  "straturiPauze.length === 1 ? 'imprimanta.felie.rezumat.pauze' : 'imprimanta.felie.rezumat.pauza'", 'e2e', 'rezumatul la plural pentru o pauză')
o('U07', DD, 'onClick={() => { if (p.k !== null) setStrat(p.k); }}', 'onClick={() => undefined}', 'e2e', 'pauza din listă nu arată stratul ei')
o('T01', UI, '            {a.pauze.length > 0 && (', '            {a.pauze.length > 1 && (', 'e2e', 'trimiterea nu spune o singură pauză')
o('T02', UI, 'porneste(pas.f, pas.a.pauze)', 'porneste(pas.f, [])', 'e2e', 'pornirea nu spune pauzele fișierului trimis')
o('T03', UI, "x.z === null ? t('imprimanta.pauza.inainte', { k: x.strat }) : t('imprimanta.pauza.inainte-z', { k: x.strat, z: x.z.toLocaleString(loc()) })",
  "t('imprimanta.pauza.inainte', { k: x.strat })", 'e2e', 'pauza fără înălțimea ei')

SETURI = {
    'pauza': ['test/unit/imprimanta.pauza.test.ts'],
    'pauza2': ['test/unit/imprimanta.pauza.test.ts', 'test/unit/imprimanta.gcode3d.test.ts', 'test/unit/imprimanta.feliere.test.ts'],
}
E2E = ['test/e2e/imprimanta.spec.ts']
