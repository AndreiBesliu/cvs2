# Lista de otrăvuri a feliei 3.6j (piesele plate feliate în cvs2, ADR 0191), 07.11.2026, alese de autor: debitul și pasul
# liniilor (modelul OrcaSlicer), straturile și rolurile lor, pereții (pozițiile, primul strat, cusătura), umplerea (suprapunerea,
# grila), deplasările, ventilatoarele, temperaturile, plafonul de debit, încetinirea pentru răcire, timpul, antetul, brim-ul,
# unirea formelor, piesele din document; plus legăturile dialogului „Din desen…” (prin e2e, cu imprimanta falsă).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


PR = 'src/cam/feliere/profil.ts'
GC = 'src/cam/feliere/gcode.ts'
ST = 'src/cam/feliere/straturi.ts'
PI = 'src/cam/feliere/piese.ts'
IX = 'src/cam/feliere/index.ts'
DD = 'src/app/DialogDinDesen.tsx'
PA = 'src/app/PanouImprimanta.tsx'

o('F01', PR, 'h * (w - h * (1 - Math.PI / 4))', 'h * w', 'feliere', 'secțiunea liniei ca dreptunghi: prea mult filament')
o('F02', PR, 'export const pas = (w: number, h: number): number => w - h * (1 - Math.PI / 4);',
  'export const pas = (w: number, h: number): number => w;', 'feliere', 'liniile alăturate la lățimea lor, nu la pas: goluri')
o('F03', GC, 'Math.round((H - s.strat1) / s.strat + 1e-9) + 1', 'Math.round((H - s.strat1) / s.strat + 1e-9)', 'feliere',
  'un strat lipsă: piesa iese mai joasă')
o('F04', GC, 'const sus = Math.max(s.sus, Math.ceil(s.susMinim / s.strat - 1e-9));', 'const sus = s.sus;', 'feliere',
  'grosimea minimă de sus uitată (la straturi subțiri, fața de sus nu se închide)')
o('F05', GC, 'if (k <= s.jos || k > n - sus', 'if (k < s.jos || k > n - sus', 'feliere', 'un strat plin de jos lipsă')
o('F06', ST, 'if (k === 1) d += (pas(wE, h) + pas(wI, h)) / 2;', 'if (k === 1) d += wI;', 'feliere',
  'al doilea perete prea departe: gol între pereți')
o('F07', ST, 'e = prim ? s.piciorElefant : 0;', 'e = 0;', 'feliere', 'fără compensarea piciorului de elefant')
o('F08', ST, 'regiuniLa(pr.dInterior - suprapunere * w)', 'regiuniLa(pr.dInterior)', 'feliere',
  'umplerea nu se suprapune peste pereți: nu se leagă de ei')
o('F09', ST, 'if (p[i + 1]! > p[k + 1]! + 1e-9 ||', 'if (false ||', 'feliere', 'cusătura nealiniată (bucla începe oriunde)')
o('F10', ST, 'if (Math.abs(start - capat) > legaturaMax) {', 'if (false) {', 'feliere',
  'grila rară își leagă liniile cu bucăți lungi, extrudate peste piesă')
o('F11', GC, 'if (t > 1e-9 && t < 1 - 1e-9 && u >= 0 && u <= 1) return true;', '', 'feliere',
  'o deplasare care iese din piesă nu se mai vede: fără retragere, fire')
o('F12', GC, '  if (k <= s.ventOprit) return 0;\n', '', 'feliere', 'ventilatorul pornit din primul strat (lipirea de pat)')
o('F13', GC, 'const vAux = k <= s.ventOprit ? 0 : s.ventAux;', 'const vAux = s.ventAux;', 'feliere',
  'ventilatorul auxiliar pornit din primul strat')
o('F14', GC, 'Math.min(rol(c.rol, prim, s).v, s.volumMax / sectiune(c.w, h))', 'rol(c.rol, prim, s).v', 'feliere',
  'fără plafonul de debit: duza nu ține pasul, sub-extrudare')
o('F15', GC, 'if (timpLa(mij) >= s.stratMinim) lo = mij; else hi = mij;', 'if (timpLa(mij) >= s.stratMinim) hi = mij; else lo = mij;',
  'feliere', 'încetinirea pentru răcire, întoarsă')
o('F16', GC, 'return (v - v0) / a + (v - v1) / a + (L - da - dd) / v;', 'return L / v;', 'feliere', 'timpul fără accelerații')
o('F17', GC, '`; total layer number: ${plan.length}`', '`; total layer number: ${plan.length - 1}`', 'feliere',
  'numărul straturilor greșit în antet (ecranul imprimantei)')
o('F18', GC, 'START_PRINT EXTRUDER_TEMP=${s.duza1} BED_TEMP=${s.pat1}', 'START_PRINT EXTRUDER_TEMP=${s.duza} BED_TEMP=${s.pat}',
  'feliere', 'temperatura primului strat ignorată la pornire (PC: 280 în loc de 270)')
o('F19', GC, '      if (s.duza !== s.duza1) w.scrie(`M104 S${s.duza}`);\n', '', 'feliere',
  'temperatura de după primul strat nu se mai pune')
o('F20', GC, 'const r = (ultima - GOL_CUSATURA) / ultima;', 'const r = 1;', 'feliere', 'fără golul cusăturii (bucla se închide peste ea)')
o('F21', ST, 'Math.round(s.latimeBrim / p)', 'Math.floor(s.latimeBrim / p)', 'feliere', 'brim-ul cu o buclă mai puțin')
o('F22', IX, 'return ingust < 10 || p.inaltime > 1.5 * ingust;', 'return p.inaltime > 1.5 * ingust;', 'feliere',
  'brim-ul automat uită piesele înguste')
o('F23', PI, "const r = booleanContururi(h, c, 'diferenta');", "const r = booleanContururi(h, c, 'reuniune');", 'feliere',
  'o formă care intră într-un gol îl mărește, în loc să-l micșoreze')
o('F24', PI, 'if (ating(ext, c)) {', 'if (false) {', 'feliere', 'formele suprapuse nu se mai unesc')
o('F25', PI, 'if (r.contur.inchis) inchise.push(r.contur); else deschise++;', 'if (r.contur.inchis) inchise.push(r.contur);',
  'feliere', 'căile deschise nu se mai numără')
o('F26', PI, 'const incape = latime <= pat[0] - 2 * MARGINE_PAT && adancime <= pat[1] - 2 * MARGINE_PAT;',
  'const incape = latime <= pat[0] && adancime <= pat[1];', 'feliere', 'fără marginea patului (linia de curățare)')
o('F27', PI, 'const dx = pat[0] / 2 - (cutie.minX + cutie.maxX) / 2', 'const dx = pat[0] / 2 - cutie.minX', 'feliere',
  'piesele nu se mai centrează pe pat')
o('F28', PI, "replace(/[\\u0300-\\u036f]/g, '')", "replace(/x/g, '')", 'feliere', 'numele obiectelor cu diacritice stricate')

o('W01', DD, 'useState(() => Math.min(250, Math.max(0.2, grosime)))', 'useState(() => 3)', 'e2e', 'înălțimea implicită nu e grosimea foii')
o('W02', DD, 'alesStrat === 0 ? Math.ceil(n / 2)', 'alesStrat === 0 ? 1', 'e2e', 'previzualizarea pornește pe primul strat, nu la mijloc')
o('W03', DD, '...preia(setariImplicite(id, x.calitate), DIN_MATERIAL), ', '', 'e2e',
  'schimbarea materialului nu-i aduce temperaturile (PETG la 220 °C)')
o('W04', PA, '        {desen !== undefined && (', '        {false && (', 'e2e', 'fără „Din desen…” când imprimanta nu e legată')
o('W05', PA, 'trimite={legata && st.fisiere !== null ? (f) =>', 'trimite={false ? (f) =>', 'e2e', 'fișierul feliat nu se mai poate trimite')

SETURI = {
    'feliere': ['test/unit/imprimanta.feliere.test.ts'],
}
E2E = ['test/e2e/imprimanta.spec.ts']
