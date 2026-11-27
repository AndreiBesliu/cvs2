# Lista de otrăvuri a feliei 16.A↑e-4 (bila și toroidala în proiect: copia rândului ferestrei exportului, Exportă, Tăierea,
# biblioteca; ADR 0303), 27.11.2026, aleasă de autor: forma pe rând (citirea, scrierea, egalitatea), identitatea frezei pentru T,
# nota și recunoașterea, marginile razei colțului, ce scrie Exportă (numele, câmpurile necunoscute ale formei), copia de readus,
# felurile cu CAM, rândul operației (frezele în plus) și, în fereastră, citirea din document, scrierea, lista formelor și
# judecata „doar pe linie”. Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit (setul `e2e` cere
# `.tmp/pw.config.ts` în clonă). o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


FF = 'src/model/formaFrezei.ts'
ER = 'src/ui/exportRand.ts'
VO = 'src/app/valoriOperatii.ts'
FZ = 'src/model/freza.ts'
EC = 'src/app/ExportConectat.tsx'
DE = 'src/ui/DialogExport.tsx'
FO = 'src/ui/FisaOperatie.tsx'

# ── Modelul ──────────────────────────────────────────────────────────────────────────────────────────────────────────
o('F01', FF, "  return forma === undefined || forma.tip === 'v' || forma.tip === 'bila' || forma.tip === 'toroidala';",
  "  return forma === undefined || forma.tip === 'v';", 'm', 'rândul nu mai poartă formele rotunde: canelura cu bilă rămâne fără rând')
o('F02', FF, " && (f.cale === 'scula' || (f.scula.forma?.tip !== 'bila' && f.scula.forma?.tip !== 'toroidala'))", '', 'm',
  'o bilă de rest are rând: Exportă ar face din ea o plată')
o('F03', ER, "  if (a.tip === 'toroidala') return b.tip === 'toroidala' && egal(a.raza, b.raza);",
  "  if (a.tip === 'toroidala') return b.tip === 'toroidala';", 'm', 'toroidale cu raze diferite: aceeași freză sub același T')
o('F04', ER, "  return b.tip === 'bila';\n}", "  return true;\n}", 'm', 'bila egală cu orice formă: aceeași freză ca o toroidală')
o('F05', ER, "    return r !== null && r > 0 ? { tip: 'toroidala', raza: r } : undefined;",
  "    return r !== null ? { tip: 'toroidala', raza: r } : undefined;", 'm', 'raza 0 citită ca formă')
o('F06', ER, "  if (f.tip === 'toroidala') return { formaScula: 'toroidala', razaColt: text(f.raza) };",
  "  if (f.tip === 'toroidala') return { formaScula: 'toroidala' };", 'm', 'freza aleasă din bibliotecă pierde raza colțului pe rând')
o('F07', ER, "  pune('forma', fel(loc.forma), fel(s.forma));\n", '', 'm', 'nota nu vede felul schimbat (bilă în loc de toroidală)')
o('F08', ER, "    pune('raza', razaColt(loc.forma), razaColt(s.forma));", "    pune('raza', razaColt(loc.forma), razaColt(loc.forma));", 'm',
  'nota nu vede raza schimbată în bibliotecă')
o('F09', ER, "    if (r === null || !(r > 0) || (d !== null && !(r < d / 2))) rez.push('raza');",
  "    if (r === null || !(r > 0)) rez.push('raza');", 'm', 'raza cât jumătatea diametrului trece (o bilă scrisă ca toroidală)')
o('F10', ER, "  if (razaColt !== null) return `${String(d)} r${String(razaColt)}`;\n", '', 'm',
  'conflictul de T nu vede toroidala (aceeași cheie ca plata)')
o('F11', VO, "nume: aceeasi ? o.nume : numeMana, forma }", "nume: o.nume, forma }", 'm', 'numele frezei nu urmează forma rotundă schimbată')
o('F12', VO, "    const forma = f.tip === 'bila' ? { ...(acelasiFel ?? {}), tip: 'bila' as const } : { ...(acelasiFel ?? {}), tip: 'toroidala' as const, raza: f.raza };",
  "    const forma = f.tip === 'bila' ? { tip: 'bila' as const } : { tip: 'toroidala' as const, raza: f.raza };", 'm',
  'Exportă pierde câmpurile necunoscute ale formei rotunde (o comandă la fiecare Exportă)')
o('F13', FZ, "  const fel: FelFreza = rotunda ?? (", "  const fel: FelFreza = (", 'm', 'o bilă readusă în bibliotecă devine plată')
o('F14', FZ, "export const FELURI_CU_CAM = ['plata', 'v', 'gravare', 'bila', 'toroidala'] as const;",
  "export const FELURI_CU_CAM = ['plata', 'v', 'gravare', 'bila'] as const;", 'm', 'toroidala rămâne „în curând” în bibliotecă')
o('F15', FZ, "  if (f.fel === 'toroidala') return { ...baza, forma: { tip: 'toroidala', raza: f.raza ?? 0 } };",
  "  if (f.fel === 'toroidala') return { ...baza, forma: { tip: 'toroidala', raza: 1 } };", 'm', 'copia toroidalei din bibliotecă cu altă rază')
# ── Fereastra (e2e) ──────────────────────────────────────────────────────────────────────────────────────────────────
o('F16', EC, "  if (f?.tip === 'toroidala') return { forma: { tip: 'toroidala', raza: f.raza } };\n", '', 'e2e',
  'fereastra citește toroidala din document ca plată: Exportă ar scrie o plată')
o('F17', DE, "      numar: numarScula, diametru: diametruScula, ...(forma ? { forma } : {}),",
  "      numar: numarScula, diametru: diametruScula, ...(forma?.tip === 'v' ? { forma } : {}),", 'e2e',
  'Exportă scrie doar V-ul: bila și toroidala aleasă pe rând devin plate')
o('F18', FO, "  const peLinieRotunda = p.tip === 'profil' && p.latura === 'pe-linie';", "  const peLinieRotunda = true;", 'e2e',
  'bila și toroidala oferite și pe exterior')
o('F19', DE, "    rotunda: p !== undefined && ((p.formaScula !== 'bila' && p.formaScula !== 'toroidala') || (p.tip === 'profil' && p.latura === 'pe-linie')),",
  "    rotunda: p !== undefined,", 'e2e', 'bila pe exterior nu oprește exportul (lucrarea ar refuza abia la calcul)')

SETURI = {
    'm': ['test/unit/export.rotunda.test.ts', 'test/unit/toroidala.lucrare.test.ts', 'test/unit/exportFreze.bila.test.ts', 'test/unit/freza.test.ts'],
}

E2E = ['test/e2e/export.rotunda.spec.ts']
