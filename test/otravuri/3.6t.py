# Lista de otrăvuri a feliei 3.6t (istoricul imprimărilor, costul și estimarea care învață, ADR 0194 §B), 13.11.2026, alese
# de autor: driverul K1 (`historyList`: începutul în secunde, durata, rezultatul, valorile stricate, textul JSON în JSON,
# plafonul, numele nesigure, cererea printre citiri), sesiunea (istoricul ținut, cadrul doar cu istoric, cererea rară, cea de la
# deschidere), unirea celor două istorice (toleranța, imprimanta, perechea cea mai apropiată, câte una, imprimanta înaintea
# ferestrei, estimarea din listă, materialul din nume, „din cvs2”), gramele, costul, totalurile, CSV-ul, estimarea care învață,
# înregistrarea, istoricul cvs2 ținut (contopirea, plafonul, forma) și setările; fereastra, prin e2e (înregistrarea, rândurile,
# prețul, CSV-ul, golirea, „Din desen…” cu estimarea învățată și costul).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


NL = chr(10)
CR = 'src/machine/imprimanta/creality.ts'
SE = 'src/machine/imprimanta/sesiune.ts'
IS = 'src/app/istoricImprimari.ts'
II = 'src/app/IstoricImprimanta.tsx'
PI = 'src/app/PanouImprimanta.tsx'
DD = 'src/app/DialogDinDesen.tsx'

# Driverul K1.
o('D01', CR, 'inceput <= 0 || inceput >= 1e10) return null;', 'inceput <= 0) return null;', 'ist', 'un început absurd (după anul 2286) primit')
o('D02', CR, '{ fisier, inceput: inceput * 1000, durata:', '{ fisier, inceput, durata:', 'ist', 'începutul rămâne în secunde')
o('D03', CR, "durata: pozitiv(r['usagetime'])", "durata: pozitiv(r['totaltime'])", 'ist', 'durata din `totaltime` (cu ~40 s în plus)')
o('D04', CR, "[0, 'oprita']", "[0, 'gata']", 'ist', 'o imprimare oprită luată drept dusă la capăt')
o('D05', CR, '  return x !== null && x >= 0 ? x : null;' + NL, '  return x;' + NL, 'ist', 'o durată negativă primită')
o('D06', CR, "const ist = listaJson(r['historyList']);", "const ist = Array.isArray(r['historyList']) ? r['historyList'] as unknown[] : null;", 'ist',
  'istoricul ca text JSON în JSON pierdut')
o('D07', CR, 'ist.slice(0, MAX_ISTORIC).map(imprimareDin)', 'ist.map(imprimareDin)', 'ist', 'un istoric uriaș fără plafon')
o('D08', CR, 'const fisier = cale === null ? null : numeSigur(numeDin(cale));', 'const fisier = cale === null ? null : numeDin(cale);', 'ist',
  'un nume nesigur (`..`, caractere de control) primit')
o('D09', CR, 'new Set([CERERE_STARE, CERERE_FISIERE, CERERE_ISTORIC])', 'new Set([CERERE_STARE, CERERE_FISIERE])', 'ist',
  'istoricul necerut la legare')
# Sesiunea.
o('S01', SE, 'istoric: c.istoric ?? this.s.istoric,', 'istoric: c.istoric,', 'ist', 'un cadru fără istoric îl uită')
o('S02', SE, 'if (schimbari || c.fisiere !== null || c.istoric !== null) {', 'if (schimbari || c.fisiere !== null) {', 'ist',
  'cadrul doar cu istoric (K1C 2025) aruncat')
o('S03', SE, '(la !== null && this.ceas.acum() - la < PAUZA_ISTORIC_MS)', 'false', 'ist', 'istoricul cerut oricât de des')
o('S04', SE, '    if (t === this.s.driver.cerereIstoric) this.istoricCerutLa = this.ceas.acum();' + NL, '', 'ist',
  'cererea de la deschidere nu ține loc deschiderii cardului')
# Unirea celor două istorice.
o('I01', IS, 'd <= TOLERANTA_MS && (y.imprimanta', 'd <= 100 * TOLERANTA_MS && (y.imprimanta', 'ist', 'imprimări departe una de alta, unite')
o('I02', IS, '(y.imprimanta === null || imprimanta === null || y.imprimanta === imprimanta)) perechi.push', 'true) perechi.push', 'ist',
  'o imprimare a altei imprimante, unită')
o('I03', IS, '  perechi.sort((p, q) => p.d - q.d);' + NL, '', 'ist', 'perechea nu e cea mai apropiată')
o('I04', IS, 'if (y === undefined || pereche.has(p.a) || luate.has(p.b)) continue;', 'if (y === undefined) continue;', 'ist',
  'o imprimare unită de două ori')
o('I05', IS, 'durata: x?.durata ?? y?.durata ?? null', 'durata: y?.durata ?? x?.durata ?? null', 'ist', 'durata ferestrei înaintea imprimantei')
o('I06', IS, 'inceput: y?.inceput ?? x?.inceput ?? 0', 'inceput: x?.inceput ?? y?.inceput ?? 0', 'ist', 'începutul după ceasul imprimantei')
o('I07', IS, 'estimare: y?.estimare ?? f?.timp ?? null', 'estimare: y?.estimare ?? null', 'ist', 'estimarea din lista imprimantei pierdută')
o('I08', IS, '?? materialDinNume(fisier)?.nume ?? null', '?? null', 'ist', 'materialul din numele fișierului pierdut')
o('I09', IS, 'dinCvs2: (y?.estimare ?? null) !== null', 'dinCvs2: y !== null', 'ist', 'o imprimare doar văzută luată drept feliată în cvs2')
# Gramele, materialul, costul, totalurile.
o('I10', IS, '((mm * ARIE_FILAMENT) / 1000) * m.densitate', '((mm * ARIE_FILAMENT) / 1000) * 1.24', 'ist', 'densitatea PLA pentru orice material')
o('I11', IS, 'return MATERIALE.find((m) => m.nume.toLowerCase() === x) ?? MATERIALE.find', 'return MATERIALE.find', 'ist',
  'materialul doar după fel („PLA High Speed” necunoscut)')
o('I12', IS, ".split('_').slice(1, -1).reverse()", ".split('_').slice(1, -1)", 'ist', 'materialul căutat de la început (nu de lângă timp)')
o('I13', IS, " ?? materialDupa(p.split(' ').pop() ?? null)", '', 'ist', '„Hyper PLA” necunoscut')
o('I14', IS, '(s.putere / 1000) * (r.durata / 3600) * s.kwh', '(s.putere / 1000) * r.durata * s.kwh', 'ist', 'curentul pe secunde, nu pe ore')
o('I15', IS, '  if (g === null || p === null) return null;' + NL, '  if (g === null) return null;' + NL, 'ist', 'un cost ghicit fără preț')
o('I16', IS, 'Object.hasOwn(s.preturi, m.tip) ? (s.preturi[m.tip] ?? null) : null', "(s.preturi[material ?? ''] ?? null)", 'ist',
  'prețul după numele întreg, nu după fel')
o('I17', IS, ' || d.getMonth() !== acum.getMonth()) continue;', ') continue;', 'ist', 'totalurile pe tot anul')
# CSV-ul.
o('I18', IS, "const t = /^[=+\\-@\\t\\r]/.test(v) ? `'${v}` : v;", 'const t = v;', 'ist', 'o formulă din numele fișierului ajunge în Excel')
o('I19', IS, 'return t.includes(sep) || /["\\r\\n]/.test(t)', 'return /["\\r\\n]/.test(t)', 'ist', 'o celulă cu separatorul, fără ghilimele')
o('I20', IS, "v.toFixed(cifre).replace('.', zecimala)", 'v.toFixed(cifre)', 'ist', 'punct zecimal în CSV-ul românesc')
# Estimarea care învață.
o('I21', IS, '  if (rap.length < MIN_IMPRIMARI) return null;' + NL, '  if (rap.length < 1) return null;' + NL, 'ist', 'învață dintr-o singură imprimare')
o('I22', IS, "r.dinCvs2 && r.rezultat === 'gata' && r.imprimanta", 'r.dinCvs2 && r.imprimanta', 'ist', 'învață și din cele oprite')
o('I23', IS, '.filter((q) => Number.isFinite(q) && q >= 0.2 && q <= 5)', '.filter((q) => Number.isFinite(q))', 'ist', 'rapoartele absurde intră')
o('I24', IS, '    .slice(0, ULTIMELE_IMPRIMARI);' + NL, '    ;' + NL, 'ist', 'învață din tot istoricul, nu din ultimele 10')
o('I25', IS, '((s[m - 1] ?? 1) + (s[m] ?? 1)) / 2', '(s[m] ?? 1)', 'ist', 'mediana unui număr par, greșită')
# Înregistrarea.
o('I26', IS, '    const inceput = acum - (b.trecut ?? 0) * 1000;' + NL, '    const inceput = acum;' + NL, 'ist', 'începutul fără timpul trecut')
o('I27', IS, 'durata: maxim(cur.durata, fin.durata), filament: maxim(cur.filament, fin.filament),', 'durata: cur.durata, filament: cur.filament,',
  'ist', 'cifrele finalului pierdute')
o('I28', IS, 'progres: gata ? 100 : cur.progres,', 'progres: gata ? 100 : null,', 'ist', 'procentul oprit pierdut')
o('I29', IS, '  return { cur: r, scrie: cuFisier ? r : null };', '  return { cur: r, scrie: r };', 'ist', 'scris la fiecare cadru')
# Istoricul cvs2 ținut.
o('I30', IS, ': toate.findIndex((x) => x.sfarsit === null && x.fisier', ': toate.findIndex((x) => x.fisier', 'ist',
  'o imprimare nouă contopită cu una încheiată')
o('I31', IS, '.sort((a, b) => b.inceput - a.inceput).slice(0, MAX_IMPRIMARI), nou };', '.sort((a, b) => b.inceput - a.inceput), nou };', 'ist',
  'istoricul cvs2 fără plafon')
o('I32', IS, '    ...r, id: v.id, inceput: v.inceput, sfarsit:', '    ...r, sfarsit:', 'ist', 'cheia veche pierdută la contopire (dublură)')
o('I33', IS, "const buna = r['v'] === 1 && typeof r['id']", "const buna = typeof r['id']", 'ist', 'o înregistrare a altei versiuni citită')
o('I34', IS, "const v = Object.hasOwn(p, f) ? inInterval(p[f], MAX_PRET) : null;", 'const v = Object.hasOwn(p, f) ? inInterval(p[f], 1e12) : null;', 'ist',
  'un preț absurd primit')
# Fereastra (e2e).
o('U01', II, '    void tineImprimare(r.scrie).then(pune);', '    void tineImprimare(r.scrie);', 'e2e', 'cardul nu vede imprimarea abia scrisă')
o('U02', PI, "  useInregistrare(st, stare, din, () => { sesiune.cereIstoric(); });" + NL, '', 'e2e', 'nimic înregistrat în istoricul cvs2')
o('U03', PI, 'estimare: d?.estimare ?? null, material: d?.material ?? null };', 'estimare: null, material: d?.material ?? null };', 'e2e',
  'fișierul trimis fără estimarea feliatorului')
o('U04', PI, ': { estimare: f.estimare ?? null, material: f.material ?? null, piese: f.etichete === null ? null : Object.values(f.etichete) };',
  ': { estimare: f.estimare ?? null, material: f.material ?? null, piese: null };', 'e2e', 'numele pieselor din cvs2 pierdute')
o('U05', PI, 'uneste(st.istoric, cvs2, numeIstoric, st.fisiere)', 'uneste(null, cvs2, numeIstoric, st.fisiere)', 'e2e', 'istoricul imprimantei neunit')
o('U06', II, 'schimba({ ...setari, preturi: x === null ? preturi : { ...preturi, [f]: x } });', 'schimba({ ...setari, preturi });', 'e2e',
  'prețul scris nu se ține')
o('U07', II, "sep: ro ? ';' : ','", "sep: ','", 'e2e', 'CSV-ul românesc cu virgulă')
o('U08', II, 'onClick={() => { setGoleste(false); void golesteImprimari().then(pune); }}', 'onClick={() => { setGoleste(false); }}', 'e2e',
  'Golește nu golește')
o('U09', DD, 'istoric !== null && istoric.setari.corecteaza ? invatat(', 'istoric !== null ? invatat(', 'e2e', 'bifa „Corectează” ignorată')
o('U10', DD, 'const pret = istoric === null || g === null ? null : cost(', 'const pret = null && cost(', 'e2e', 'costul lipsă din rezumat')

SETURI = {
    'ist': ['test/unit/imprimanta.istoric.test.ts', 'test/unit/imprimanta.sesiune.test.ts'],
    'ist2': ['test/unit/imprimanta.istoric.test.ts', 'test/unit/imprimanta.sesiune.test.ts', 'test/unit/imprimanta.creality.test.ts',
             'test/unit/imprimanta.driver.test.ts', 'test/unit/imprimanta.notificari.test.ts'],
}
E2E = ['test/e2e/imprimanta.spec.ts']
