# Lista de otrăvuri a feliei 3.6q (placa și stratul viu, ADR 0193 §B), 09.11.2026, alese de autor: driverul K1 (piesele ca text
# JSON în JSON, plafoanele, numele și punctele stricate, piesa de acum, poziția negativă, filamentul), sesiunea (valorile recente
# ale stratului: fereastra, plafonul, alt fișier), harta (filamentul de la începutul stratului, E absolut și relativ, G92, căile
# după o deplasare, pragul punctelor, plafonul, pauza, numele cu majuscule, Cura), stratul viu (fereastra de un strat, straturile
# din afara fișierului, progresul, pauza, căutarea pe filament), etichetele, fișierele ținute și fereastra (prin e2e: placa în
# pauză, fișierul ținut, numele din cvs2, duza, stratul în pauză, nota pauzei, rândul „Stratul”, căile, piesa de acum).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


# Bara inversă, fără să apară scrisă ca atare (regex-urile din sursă).
B = chr(92)

CR = 'src/machine/imprimanta/creality.ts'
SE = 'src/machine/imprimanta/sesiune.ts'
HA = 'src/machine/imprimanta/harta.ts'
SV = 'src/machine/imprimanta/stratViu.ts'
PC = 'src/app/placaCalcul.ts'
FI = 'src/app/fisiereImprimanta.ts'
PI = 'src/app/PanouImprimanta.tsx'
PL = 'src/app/PlacaImprimanta.tsx'
DD = 'src/app/DialogDinDesen.tsx'

# Driverul K1.
o('K01', CR, '    return Array.isArray(x) ? x : null;', '    return null;', 'driver', 'listele ca text JSON nu se mai citesc (cadrul K1C)')
o('K02', CR, ' || /[' + B + 'x00-' + B + 'x1f' + B + 'x7f]/.test(nume)', '', 'driver', 'un nume cu un rând nou trece')
o('K03', CR, ' && Math.abs(x) < 1e5 && Math.abs(y) < 1e5', '', 'driver', 'un punct uriaș trece')
o('K04', CR, 'stare.piese = piese.slice(0, MAX_PIESE).map(piesaDin)', 'stare.piese = piese.map(piesaDin)', 'driver', 'piesele fără plafon')
o('K05', CR, 'poligon.slice(0, MAX_PUNCTE_CONTUR).map(punctDin)', 'poligon.map(punctDin)', 'driver', 'conturul fără plafon')
o('K06', CR, "stare.piesaAcum = acum.trim() === '' ? null : acum;", 'stare.piesaAcum = acum;', 'driver', '„” rămâne o piesă de acum')
o('K07', CR, 'X:(-?' + B + 'd+', 'X:(' + B + 'd+', 'driver', 'poziția negativă (cât se pregătește) nu se citește')
o('K08', CR, '  if (filament !== null) stare.filament = filament;', '', 'driver', 'filamentul folosit nu se citește')
o('K09', CR, "typeof x === 'string' && x.trim() !== ''", "typeof x === 'string'", 'driver', 'un nume gol printre cele anulate')
# Sesiunea: valorile recente ale stratului.
o('S01', SE, 'this.s.straturiRecente.filter((x) => acum - x.la <= TIMP_STRATURI_MS)', 'this.s.straturiRecente', 'sesiune',
  'valorile vechi nu se uită')
o('S02', SE, '[...straturi, { v: strat, la: acum }].slice(-MAX_STRATURI_RECENTE)', '[...straturi, { v: strat, la: acum }]', 'sesiune',
  'valorile fără plafon')
o('S03', SE, 'const straturi = altFisier ? [] : ', 'const straturi = ', 'sesiune', 'alt fișier păstrează valorile celui vechi')
# Harta fișierului.
o('H01', HA, '    acum = { z: null, e: cumulat, p: [], o: [] };', '    acum = { z: null, e: 0, p: [], o: [] };', 'placa',
  'filamentul de la începutul fiecărui strat, 0')
o('H02', HA, "      de = absE ? par['E'] - eUltim : par['E'];", "      de = par['E'];", 'placa', 'E absolut citit ca relativ')
o('H03', HA, "      if (par['E'] !== undefined) eUltim = par['E'];", '', 'placa', 'G92 E0 nu pune E la loc')
o('H04', HA, '      else if (nr === 83) absE = false;', '', 'placa', 'M83 nu trece E pe relativ')
o('H05', HA, '    } else if (misca) {' + chr(10) + '      deschisa = false;' + chr(10) + '    }', '    }', 'placa',
  'o cale continuă după o deplasare')
o('H06', HA, '      if (Math.hypot(nx - px, ny - py) >= PRAG_PUNCT) tine(nx, ny);', '      tine(nx, ny);', 'placa', 'punctele prea apropiate se țin')
o('H07', HA, '      if (total >= maxPuncte) taiata = true;', '', 'placa', 'căile fără plafon')
o('H08', HA, 'pauze.push({ strat: n, z: n >= 2 ? (straturi[n - 2]?.z ?? null) : null, nota });',
  'pauze.push({ strat: n, z: acum === null ? null : acum.z, nota });', 'placa', 'înălțimea pauzei: a stratului de acum')
o('H09', HA, "?.[1]?.toUpperCase() ?? null;", '?.[1] ?? null;', 'placa', 'numele pieselor fără majuscule (Klipper le spune cu)')
o('H10', HA, "felStrat = 'cura'; stratNou();", "felStrat = 'cura';", 'placa', 'straturile Cura nu se deschid')
# Stratul viu.
o('V01', SV, 'if (Math.abs(bune[i]! - kF) <= 1) return', 'if (Math.abs(bune[i]! - kF) <= 5) return', 'placa',
  'numărătoarea cu 5 în plus luată drept stratul')
o('V02', SV, 'v >= 1 && (total === null || v <= total)', 'v >= 1', 'placa', 'un strat peste cele ale fișierului trece')
o('V03', SV, '    if (Math.abs(doua[0]! - tinta) < Math.abs(ales - tinta)) ales = doua[0]!;', '', 'placa',
  'pe alt fișier, cea mai nouă valoare, nu cea apropiată de progres')
o('V04', SV, '  if (d.inPauza !== true || d.harta === null || r.strat === null) return r;', '  return r;', 'placa',
  'în pauza fișierului, stratul de dinainte')
o('V05', SV, 'if (h.straturi[m]!.e <= filament)', 'if (h.straturi[m]!.e < filament)', 'placa', 'la începutul exact al unui strat, cel de dinainte')
o('V06', SV, "    return { strat: kF, sursa: 'filament' };", "    return { strat: bune.at(-1) ?? kF, sursa: 'filament' };", 'placa',
  'departe de filament, tot numărul imprimantei')
# Etichetele și pauza de acum.
o('C01', PC, ".replace(/_ID_" + B + "d+_COPY_" + B + "d+$/i, '')", '', 'placa', 'sufixul OrcaSlicer rămâne în nume')
o('C02', PC, 'baza.filter((x) => x === b).length > 1 ?', 'false ?', 'placa', 'piesele cu același nume, nenumerotate')
o('C03', PC, 'if (Math.abs(p.strat - strat) <= 1 && (rez', 'if (Math.abs(p.strat - strat) <= 3 && (rez', 'placa', 'o pauză departe de strat')
o('C04', PC, 'etichete?.[n.toUpperCase()]', 'etichete?.[n]', 'placa', 'numele din cvs2 căutat fără majuscule')
# Fișierele ținute.
o('F01', FI, '    if (rez.length >= MAX_FISIERE) break;', '', 'placa', 'fișierele fără plafon de număr')
o('F02', FI, '    if (rez.length > 0 && octeti + x.marime > MAX_OCTETI) break;', '', 'placa', 'fișierele fără plafon de mărime')
o('F03', FI, 'for (const x of [...intrari].sort((a, b) => b.la - a.la)) {', 'for (const x of [...intrari]) {', 'placa', 'rămân cele vechi')
# Fereastra (prin e2e).
o('U01', PI, "const cuPlaca = (stare === 'imprima' || stare === 'pauza') && ", "const cuPlaca = stare === 'imprima' && ", 'e2e',
  'placa dispare în pauză')
o('U02', PI, '        if (r.ok) void tineFisier(', '        if (false) void tineFisier(', 'e2e', 'fișierul trimis nu se ține (fără căi)')
o('U03', DD, '[p.nume.toUpperCase(), p.eticheta]', '[p.nume, p.eticheta]', 'e2e', 'numele din cvs2 nu se găsesc după numele imprimantei')
o('U04', PL, "const duza = stare === 'imprima' && poz !== null && ", 'const duza = poz !== null && ', 'e2e', 'duza și în pauză')
o('U05', PI, "inPauza: stare === 'pauza',", 'inPauza: false,', 'e2e', 'în pauza fișierului, stratul de dinainte')
o('U06', PL, "const pauza = stare === 'pauza' && harta !== null ? ", 'const pauza = harta !== null ? ', 'e2e', 'nota pauzei și cât imprimă')
o('U07', PI, "t('imprimanta.strat.din', { strat: viu.strat, straturi: totalStraturi })",
  "t('imprimanta.strat.din', { strat: i.strat ?? 0, straturi: totalStraturi })", 'e2e', 'rândul „Stratul” cu numărul imprimantei')
o('U08', PL, "if (sus) { c.strokeStyle = culoare('--plc-cale', '#ff8a1f');", "if (sus) { c.strokeStyle = culoare('--plc-jos', '#3b4149');",
  'e2e', 'stratul de acum, în culoarea celui de dedesubt')
o('U09', PL, "data-strat={k ?? ''}", "data-strat={i.strat ?? ''}", 'e2e', 'placa cu numărul imprimantei')
o('U10', PL, "data-acum={eAcum ? 'da' : undefined}", 'data-acum={undefined}', 'e2e', 'piesa de acum nu se vede')

SETURI = {
    'driver': ['test/unit/imprimanta.creality.test.ts'],
    'driver2': ['test/unit/imprimanta.creality.test.ts', 'test/unit/imprimanta.driver.test.ts', 'test/unit/imprimanta.sesiune.test.ts'],
    'sesiune': ['test/unit/imprimanta.sesiune.test.ts'],
    'sesiune2': ['test/unit/imprimanta.sesiune.test.ts', 'test/unit/imprimanta.creality.test.ts'],
    'placa': ['test/unit/imprimanta.placa.test.ts'],
    'placa2': ['test/unit/imprimanta.placa.test.ts', 'test/unit/imprimanta.pauza.test.ts', 'test/unit/imprimanta.gcode3d.test.ts'],
}
E2E = ['test/e2e/imprimanta.spec.ts']
