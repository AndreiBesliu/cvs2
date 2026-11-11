# Lista de otrăvuri a feliei 3.6r (anularea unei piese, ADR 0193 §C), 09.11.2026, alese de autor: driverul (numele sigur, comanda
# K1 octet cu octet, doar cât imprimă sau stă în pauză, ce piesă se poate anula), sesiunea (refuzurile, cererea dublă, piesa de
# acum, confirmarea din cadrul imprimantei, retrimiterea, termenele de 6 s și 2 minute, nota, jurnalul, Renunță, o lucrare
# încheiată, Deconectează), clicul pe placă (punctul în contur) și fereastra (prin e2e: piesa de sub clic, butonul ultimei piese,
# Renunță, textul așteptării, nota din confirmare, comanda din confirmare, placa fără clicuri la final).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


DR = 'src/machine/imprimanta/driver.ts'
CR = 'src/machine/imprimanta/creality.ts'
SE = 'src/machine/imprimanta/sesiune.ts'
PC = 'src/app/placaCalcul.ts'
PI = 'src/app/PanouImprimanta.tsx'
PL = 'src/app/PlacaImprimanta.tsx'

# Driverul: numele sigur și ce piesă se poate anula.
o('D01', DR, 'RE_NUME_PIESA = /^[A-Za-z0-9_.-]{1,100}$/;', 'RE_NUME_PIESA = /^[A-Za-z0-9_.-]{1,100}/;', 'driver',
  'un nume urmat de alt G-code („A;M104 S300”) trece')
o('D02', DR, 'RE_NUME_PIESA = /^[A-Za-z0-9_.-]{1,100}$/;', 'RE_NUME_PIESA = /^[A-Za-z0-9_. -]{1,100}$/;', 'driver', 'un nume cu spațiu trece')
o('D03', DR, " || c.fel === 'anuleazaPiesa') return sePoateRegla(s);", ') return sePoateRegla(s);', 'driver',
  'anularea și cu imprimanta liberă')
o('D04', DR, "  if (anulate.has(sus)) return 'anulata';", '', 'driver', 'o piesă deja anulată se cere din nou')
o('D05', DR, ".length <= 1) return 'ultima';", ".length < 1) return 'ultima';", 'driver', 'ultima piesă rămasă se poate anula')
o('D06', DR, '  const sus = nume.toUpperCase();', '  const sus = nume;', 'driver', 'numele căutat fără majuscule (Klipper le spune cu)')
o('D07', CR, "case 'anuleazaPiesa': return RE_NUME_PIESA.test(c.nume) ? set(", "case 'anuleazaPiesa': return true ? set(", 'driver',
  'driverul K1 scrie orice nume în `gcodeCmd`')
o('D08', CR, '`EXCLUDE_OBJECT NAME=${c.nume}`', '`EXCLUDE_OBJECT_START NAME=${c.nume}`', 'driver', 'altă comandă decât anularea')
# Sesiunea: cererea, retrimiterea, confirmarea, termenele.
o('S01', SE, ' || piesaAnulabila(i, nume) !== null) return false;', ') return false;', 'sesiune',
  'pleacă și pentru o piesă anulată, necunoscută sau ultima')
o('S02', SE, " || !comandaPermisa(c, this.s.driver.lucrare(i)) || piesaAnulabila", ' || piesaAnulabila', 'sesiune',
  'pleacă și fără o lucrare în curs')
o('S03', SE, '    if (this.s.anulari.some((a) => a.esuataLa === null && a.nume.toUpperCase() === sus)) return false;' + chr(10), '', 'sesiune',
  'o cerere încă în curs se dublează')
o('S04', SE, 'const acum = i.piesaAcum !== null && i.piesaAcum.toUpperCase() === sus;', 'const acum = false;', 'sesiune',
  'piesa de acum nu primește termenul lung de la început')
o('S05', SE, '      if (anulate.has(sus) || !lucreaza) continue;', '      if (!lucreaza) continue;', 'sesiune',
  'piesa trecută de imprimantă printre anulate nu se confirmă')
o('S06', SE, '      if (anulate.has(sus) || !lucreaza) continue;', '      if (anulate.has(sus)) continue;', 'sesiune',
  'o lucrare încheiată păstrează cererile')
o('S07', SE, 'const x = a.acum || deAcum === sus ? (a.acum ? a : { ...a, acum: true }) : a;', 'const x = a;', 'sesiune',
  'piesa văzută mai târziu ca cea de acum rămâne pe termenul scurt')
o('S08', SE, '(x.acum ? TERMEN_ANULARE_ACUM_MS : TERMEN_ANULARE_MS)', '(TERMEN_ANULARE_MS)', 'sesiune',
  'piesa de acum expiră la 6 s, nu la 2 minute')
o('S09', SE, 'if (acum - x.la >= (', 'if (acum - x.la > (', 'sesiune', 'termenul cu un pas mai târziu (o retrimitere în plus)')
o('S10', SE, 'if (retrimite && this.s.legatura === ', 'if (false && this.s.legatura === ', 'sesiune', 'cererea nu se retrimite')
o('S11', SE, '{ if (acum - a.esuataLa < NOTA_ANULARE_MS && lucreaza) noi.push(a); continue; }', '{ noi.push(a); continue; }', 'sesiune',
  '„n-a confirmat” nu mai pleacă')
o('S12', SE, '      if (schimbari && this.s.anulari.length > 0) this.pasAnulari(false);' + chr(10), '', 'sesiune',
  'confirmarea abia la pasul următor, nu cu cadrul care o aduce')
o('S13', SE, "        this.adaugaJurnal('stare', `exclude ${x.nume} not confirmed`);" + chr(10), '', 'sesiune', 'expirarea nu intră în jurnal')
o('S14', SE, 'const raman = this.s.anulari.filter((a) => a.nume.toUpperCase() !== sus);', 'const raman = this.s.anulari;', 'sesiune',
  'Renunță nu scoate cererea')
o('S15', SE, "incercari: 0, pierdutaLa: null, anulari: [] });", "incercari: 0, pierdutaLa: null });", 'sesiune',
  'Deconectează păstrează cererile')
# Clicul pe placă.
o('C01', PC, 'for (let a = 0, b = c.length - 1; a < c.length; b = a++)', 'for (let a = 1, b = 0; a < c.length; b = a++)', 'placa',
  'conturul fără latura care îl închide')
o('C02', PC, '+ xa) e = !e;', '+ xa) e = true;', 'placa', 'orice trecere a razei înseamnă „înăuntru”')
# Fereastra (prin e2e).
o('U01', PL, 'const p = piese.find((q) => q.contur.length > 2 && inContur(q.contur, x, y));', 'const p = piese[0];', 'e2e',
  'clicul pe placă deschide prima piesă, nu pe cea de sub el')
o('U02', PL, "{anuleaza !== null && (motiv === null || motiv === 'nume') && !anulata", '{anuleaza !== null && !anulata', 'e2e',
  'ultima piesă rămasă are buton')
o('U03', PL, 'const motiv = anulata || asteapta || anuleaza === null ? null : piesaAnulabila(i, p.nume);', 'const motiv = null;', 'e2e',
  'motivul nu se mai citește: ultima piesă are buton')
o('U04', PL, '{c.acum && <button type="button" data-imprimanta="anulare-retrage"', '{false && <button type="button" data-imprimanta="anulare-retrage"', 'e2e',
  'piesa de acum așteaptă fără Renunță')
o('U05', PL, "t(c.acum ? 'imprimanta.anulare.cand-trece' : 'imprimanta.anulare.asteapta')", "t('imprimanta.anulare.asteapta')", 'e2e',
  'piesa de acum: „așteaptă imprimanta”, fără să spună că așteaptă altă piesă')
o('U06', PL, "data-anulare={piese.some(sePoate) ? 'da' : undefined}", "data-anulare={anuleaza !== null ? 'da' : undefined}", 'e2e',
  'placa ia clicuri și când nu mai e nimic de anulat')
o('U07', PI, "{piesaAcum?.toUpperCase() === c.nume.toUpperCase() && <p", '{false && <p', 'e2e', 'confirmarea nu spune că piesa e cea de acum')
o('U08', PI, "            else if (afisata.fel === 'anulare') sesiune.anuleazaPiesa(afisata.nume);" + chr(10), '', 'e2e',
  '„Anulează piesa” nu trimite nimic')

SETURI = {
    'driver': ['test/unit/imprimanta.driver.test.ts'],
    'driver2': ['test/unit/imprimanta.driver.test.ts', 'test/unit/imprimanta.creality.test.ts', 'test/unit/imprimanta.sesiune.test.ts'],
    'sesiune': ['test/unit/imprimanta.sesiune.test.ts'],
    'sesiune2': ['test/unit/imprimanta.sesiune.test.ts', 'test/unit/imprimanta.driver.test.ts'],
    'placa': ['test/unit/imprimanta.placa.test.ts'],
    'placa2': ['test/unit/imprimanta.placa.test.ts'],
}
E2E = ['test/e2e/imprimanta.spec.ts']
