# Lista de otrăvuri a feliei 3.6o (driverele imprimantelor și comenzile din timpul imprimării, ADR 0192), 09.11.2026, alese de
# autor: contractul comun (ventilatoarele pe bucăți, ce comenzi au rost, întregii din interval, ținta unui încălzitor), driverul K1
# (câmpurile noi ale stării, axele, capabilitățile, fiecare comandă cu intervalul ei, homing-ul în pași, `ok`-ul), lista driverelor,
# sesiunea (pașii comenzilor, una în pași odată, răcirea singură: armarea, termenul, ce o oprește, legarea din nou), imprimantele
# ținute cu driverul lor și proba peste driver, plus fereastra (prin e2e: banda încălzirii, Răcește, Preîncălzește cu primul strat,
# cererile neconfirmate, viteza doar cât imprimă, homing-ul, câmpurile, lumina).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


DR = 'src/machine/imprimanta/driver.ts'
CR = 'src/machine/imprimanta/creality.ts'
DS = 'src/machine/imprimanta/drivere.ts'
SE = 'src/machine/imprimanta/sesiune.ts'
TI = 'src/machine/imprimanta/tinute.ts'
UI = 'src/app/PanouImprimanta.tsx'

# Contractul comun.
o('D01', DR, '  : { ...i, ...s, ventilatoare: { ...i.ventilatoare, ...s.ventilatoare } });', '  : { ...i, ...s });', 'driver',
  'o bucată cu un singur ventilator le șterge pe celelalte')
o('D02', DR, "export const sePoateRegla = (s: StareLucrare): boolean => s === 'imprima' || s === 'pauza';",
  "export const sePoateRegla = (s: StareLucrare): boolean => s === 'imprima';", 'driver', 'viteza și debitul refuzate în pauză')
o('D03', DR, "  if (c.fel === 'homing') return esteLibera(s);", "  if (c.fel === 'homing') return true;", 'driver', 'homing-ul și cât imprimă')
o('D04', DR, "  if (c.fel === 'viteza' || c.fel === 'debit') return sePoateRegla(s);", "  if (c.fel === 'viteza') return sePoateRegla(s);", 'driver',
  'debitul și fără lucrare')
o('D05', DR, 'Number.isInteger(v) && v >= iv.min && v <= iv.max', 'v >= iv.min && v <= iv.max', 'driver', 'un număr cu zecimale trece drept întreg')
o('D06', DR, "(inc === 'duza' ? i.duzaTinta : i.patTinta)", 'i.duzaTinta', 'sesiune', 'ținta patului citită din a duzei (răcirea singură)')
# Driverul K1: starea.
o('K01', CR, "['maxNozzleTemp', 'duzaMax'], ", '', 'driver', 'maximul duzei nu se citește')
o('K02', CR, "['curFeedratePct', 'viteza'],", '', 'driver', 'viteza nu se citește')
o('K03', CR, "carcasa: { camp: 'caseFanPct', canal: 1 }, lateral: { camp: 'auxiliaryFanPct', canal: 2 }",
  "carcasa: { camp: 'caseFanPct', canal: 2 }, lateral: { camp: 'auxiliaryFanPct', canal: 1 }", 'driver', 'canalele M106 ale carcasei și lateral, schimbate')
o('K04', CR, "filter((_, k) => m[k + 1] === '1')", "filter((_, k) => m[k] === '1')", 'driver', 'axele citite cu un loc mai la stânga')
o('K05', CR, '  if (lumina !== null) stare.lumina = lumina > 0;', '  if (lumina !== null) stare.lumina = true;', 'driver', 'lumina stinsă citită aprinsă')
o('K06', CR, '  if (ocupata !== null) stare.ocupata = ocupata === 7;', '  if (ocupata !== null) stare.ocupata = ocupata !== 0;', 'driver',
  'imprimanta care imprimă (1) trece drept ocupată cu homing-ul')
o('K07', CR, '  if (Object.keys(vent).length > 0) stare.ventilatoare = vent;', '  stare.ventilatoare = vent;', 'driver',
  'fiecare bucată aduce ventilatoarele (goale)')
# Driverul K1: capabilitățile și comenzile.
o('K08', CR, '    lumina: i.lumina !== null,', '    lumina: true,', 'driver', 'lumina arătată și la o imprimantă care n-a spus-o')
o('K09', CR, '    ventilatoare: VENTILATOARE.filter((id) => i.ventilatoare[id] !== undefined),', '    ventilatoare: [...VENTILATOARE],', 'driver',
  'ventilatorul lateral și la o K1 SE')
o('K10', CR, '(v !== null && v > 0 ? v : implicit)', '(v ?? implicit)', 'driver', 'un maxim de 0 ia locul celui implicit')
o('K11', CR, 'S${Math.round((255 * p) / 100)}', 'S${Math.floor((255 * p) / 100)}', 'driver', 'procentul ventilatorului tăiat, nu rotunjit')
o('K12', CR, '      const g = t === undefined ? null : intregIn(c.grade, { min: 0, max: t.max });',
  '      const g = t === undefined ? null : intregIn(c.grade, { min: 0, max: 400 });', 'driver', 'ținta peste maximul imprimantei')
o('K13', CR, '{ bedTempControl: { num: 0, val: g } }', '{ bedTempControl: g }', 'driver', 'ținta patului fără `num`')
o('K14', CR, '      { gata: (x) => x.ocupata !== true, minMs: HOMING_MIN_MS, maxMs: HOMING_MAX_MS },',
  '      { gata: () => true, minMs: HOMING_MIN_MS, maxMs: HOMING_MAX_MS },', 'driver', 'Z pleacă și cât imprimanta e ocupată')
o('K15', CR, 'export const HOMING_MIN_MS = 1000;', 'export const HOMING_MIN_MS = 100;', 'driver', 'prea puțin de așteptat înaintea lui Z')
o('K16', CR, "c.fel === 'viteza' ? { setFeedratePct: p } : { setFlowratePct: p }", '{ setFeedratePct: p }', 'driver', 'debitul trimis ca viteză')
o('K17', CR, '    return { recunoscut: esteCreality(c), stare: c.stare, fisiere: c.fisiere, raspuns: c.inima ? RASPUNS_INIMA : null };',
  '    return { recunoscut: esteCreality(c), stare: c.stare, fisiere: c.fisiere, raspuns: null };', 'driver', 'driverul nu răspunde la bătaia inimii')
o('K18', CR, "{ incalzitor: 'pat', max: maxim(i.patMax, MAX_PAT_K1) }", "{ incalzitor: 'pat', max: maxim(i.duzaMax, MAX_PAT_K1) }", 'driver',
  'maximul patului luat de la duză')
o('K19', CR, '  lucrare: stareLucrare,', "  lucrare: () => 'libera',", 'sesiune', 'driverul spune mereu „liberă”')
# Lista driverelor.
o('R01', DS, "typeof x === 'string' && Object.hasOwn(DRIVERE, x)", "typeof x === 'string' && x in DRIVERE", 'driver',
  '„toString” trece drept driver')
# Sesiunea: pașii comenzilor.
o('S01', SE, '          if (this.ceas.acum() - t0 >= p.maxMs || p.gata(this.s.imprimanta)) { de(urm); return; }',
  '          if (p.gata(this.s.imprimanta)) { de(urm); return; }', 'sesiune', 'o imprimantă ocupată mereu nu primește niciodată Z')
o('S02', SE, '        this.ceasSecventa = this.ceas.setTimeout(verifica, p.minMs);', '        this.ceasSecventa = this.ceas.setTimeout(verifica, 0);',
  'sesiune', 'Z pleacă înaintea secundei întâi')
o('S03', SE, '(pasi.length > 1 && this.s.secventa !== null)', 'false', 'sesiune', 'două homing-uri deodată')
o('S04', SE, "    if (c.fel === 'porneste' && d.inchideDupaPornire) this.pornitLa = this.ceas.acum();", '', 'sesiune',
  'închiderea de după pornire trece drept legătură pierdută (pornirea, prin driver)')
# Sesiunea: răcirea singură.
o('S05', SE, "    if (c.fel === 'tinta' && c.grade > 0 && esteLibera(lucrare)) this.armeaza();",
  "    if (c.fel === 'tinta' && esteLibera(lucrare)) this.armeaza();", 'sesiune', 'ținta 0 armează răcirea')
o('S06', SE, "    if (c.fel === 'tinta' && c.grade > 0 && esteLibera(lucrare)) this.armeaza();",
  "    if (c.fel === 'tinta' && c.grade > 0) this.armeaza();", 'sesiune', 'o țintă schimbată cât imprimă armează răcirea')
o('S07', SE, "    if (lucrare !== 'necunoscuta' && !esteLibera(lucrare)) { this.dezarmeaza('print'); return; }\n", '', 'sesiune',
  'o imprimare pornită nu oprește răcirea')
o('S08', SE, '    else if (this.racireCalda && tinte.some((x) => x.v !== null)) {', '    else if (this.racireCalda) {', 'sesiune',
  'țintele încă nespuse (după o legare din nou) trec drept răcite')
o('S09', SE, '    if (this.ceas.acum() < this.racireDela + this.racireMinute * 60_000 ||',
  '    if (this.ceas.acum() < this.racireDela + this.racireMinute * 6_000 ||', 'sesiune', 'răcirea pleacă de zece ori mai devreme')
o('S10', SE, "    if (this.racireNume !== null && i.nume !== null && i.nume !== this.racireNume) { this.dezarmeaza('other printer'); return; }\n", '',
  'sesiune', 'răcirea pleacă și spre altă imprimantă')
o('S11', SE, "    this.dezarmeaza('disconnected');\n", '', 'sesiune', 'deconectarea nu oprește răcirea')
o('S12', SE, "    if (minute === null) this.dezarmeaza('off');", '    if (minute === null) return;', 'sesiune', 'oprirea setării nu oprește răcirea armată')
o('S13', SE, '      this.pune({ ...this.s, racitaLa: this.ceas.acum() });', '      this.pune({ ...this.s });', 'sesiune', 'fereastra nu află când s-a răcit')
o('S14', SE, ', racireLa: this.s.racireLa, racitaLa: this.s.racitaLa });', ' });', 'sesiune', 'o legare din nou uită termenul răcirii')
o('S15', SE, "    if (this.racireDela === null || this.racireMinute === null) { this.dezarmeaza(null); return; }",
  '    if (this.racireDela === null) { this.dezarmeaza(null); return; }', 'sesiune', 'răcirea armată și cu setarea oprită')
# Imprimantele ținute și proba.
o('T01', TI, "    const driver = r['driver'] === undefined ? DRIVER_IMPLICIT : r['driver'];", "    const driver = r['driver'];", 'tinute',
  'lista de dinainte (fără driver) se pierde')
o('T02', TI, '    if (!esteIdDriver(driver)) continue;\n', '', 'tinute', 'un driver necunoscut rămâne în listă')
o('T03', TI, '=> ({ adresa, port, driver, model, nume, folosita })', '=> ({ adresa, port, model, nume, folosita })', 'tinute',
  'driverul nu se scrie în listă')
o('T04', TI, '      const citire = driver.citiri[0];', '      const citire = driver.citiri[1];', 'tinute', 'proba cere lista, nu starea')
o('T05', TI, '(opt.driver ?? DRIVERE[DRIVER_IMPLICIT]).port', 'DRIVERE[DRIVER_IMPLICIT].port', 'tinute', 'căutarea pe portul K1 pentru orice driver')
# Fereastra (prin e2e).
o('E01', UI, '        {legata && esteLibera(stare) && calda && (', '        {legata && esteLibera(stare) && false && (', 'e2e',
  'încălzirea pornită nu se vede în bandă')
o('E02', UI, 'data-imprimanta="incalzeste-raceste" onClick={raceste}', 'data-imprimanta="incalzeste-raceste" onClick={() => undefined}', 'e2e',
  'Răcește din bandă nu face nimic')
o('E03', UI, "{ duza: Math.min(m.duza1, max('duza')), pat: Math.min(m.pat1, max('pat')) }",
  "{ duza: Math.min(m.duza, max('duza')), pat: Math.min(m.pat, max('pat')) }", 'e2e', 'Preîncălzește cu temperaturile de după primul strat')
o('E04', UI, '        if (!c.esuata && r[k] === c.v) { n ??= new Map(x); n.delete(k); }', '        if (false) { n ??= new Map(x); n.delete(k); }', 'e2e',
  'o valoare confirmată rămâne „în așteptare”')
o('E05', UI, 'const CONFIRMARE_MS = 6000;', 'const CONFIRMARE_MS = 60000;', 'e2e', '„n-a confirmat” abia după un minut')
o('E06', UI, '            {sePoateRegla(stare) && (cap.viteza !== null || cap.debit !== null) && (',
  '            {(cap.viteza !== null || cap.debit !== null) && (', 'e2e', 'viteza și debitul și fără lucrare')
o('E07', UI, 'disabled={!legata || !libera || st.secventa !== null || i.ocupata === true} onClick={homing}', 'disabled={!legata} onClick={homing}',
  'e2e', 'homing-ul și cât imprimă')
o('E08', UI, 'data-imprimanta="homing-confirma" disabled={!patGol}', 'data-imprimanta="homing-confirma" disabled={false}', 'e2e',
  'homing-ul fără bifa „Patul e gol”')
o('E09', UI, '    if (intregIn(x, o.iv) === null) { setRefuz(true); return; }', '    if (false) { setRefuz(true); return; }', 'e2e',
  'un procent greșit nu e spus')
o('E10', UI, '    if (intregIn(x, { min: 0, max }) === null) { setRefuz(true); return; }', '    if (intregIn(x, { min: 0, max: 400 }) === null) { setRefuz(true); return; }',
  'e2e', 'o țintă peste maximul imprimantei nu e spusă')
o('E11', UI, 'data-imprimanta="raceste" disabled={!legata || !calde}', 'data-imprimanta="raceste" disabled={!legata}', 'e2e',
  'Răcește aprins fără nicio țintă caldă')
o('E12', UI, '{st.racireLa !== null && <p className="imprimanta-ajutor" data-testid="imprimanta-racire-la">',
  '{false && <p className="imprimanta-ajutor" data-testid="imprimanta-racire-la">', 'e2e', 'ora răcirii singure nu se vede')
o('E13', UI, '              onClick={() => { const v = lumina === 1 ? 0 : 1;', '              onClick={() => { const v = 0;', 'e2e', 'lumina doar se stinge')

SETURI = {
    'driver': ['test/unit/imprimanta.driver.test.ts', 'test/unit/imprimanta.creality.test.ts'],
    'sesiune': ['test/unit/imprimanta.sesiune.test.ts'],
    'tinute': ['test/unit/imprimanta.tinute.test.ts'],
}
E2E = ['test/e2e/imprimanta.spec.ts']
