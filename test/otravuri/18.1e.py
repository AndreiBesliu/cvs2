# Lista de otrăvuri a feliei 18.1↑e (finisarea reliefului cu freza toroidală; ADR 0319), 27.11.2026, alese de autor: silueta
# toroidalei în câmpul conservativ (`urcare`), freza dată lucrării (`programRelief`), regula formei (`motivFormaPeOperatie`),
# freza scrisă de panou (`frezaFinisare`, `frezaPentruRol`), rândul ferestrei exportului (`exportRelief.ts`), ce scrie Exportă
# (`operatieReliefDinDialog`), fișa (`FisaFinisare.tsx`), citirea documentului în fereastră (`ExportConectat.tsx`), greșeala
# razei (`DialogExport.tsx`) și panoul (`CampuriFinisare.tsx`). Cele ale CAM-ului, prinse de oracolul 3D (`reliefFinisare.*`,
# `finisare.program`); cele pure, de probele unitare; cele ale interfeței, de e2e (`relief.toroidala.spec.ts`). Plus un martor.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


RF = 'src/cam/reliefFinisare.ts'
JB = 'src/cam/job.ts'
FZ = 'src/model/formaFrezei.ts'
RL = 'src/model/rol.ts'
ER = 'src/ui/exportRelief.ts'
VO = 'src/app/valoriOperatii.ts'
FF = 'src/ui/FisaFinisare.tsx'
EC = 'src/app/ExportConectat.tsx'
DE = 'src/ui/DialogExport.tsx'
CF = 'src/app/CampuriFinisare.tsx'

o('E00', RF, "  // Toroidala (ADR 0303 §2): zero pe discul plat de rază a = R − ρ, apoi sfertul de cerc de rază ρ.",
  "  // Toroidala (ADR 0303 §2): zero pe discul plat de rază a = R − ρ, apoi sfertul de cerc de rază ρ. ", 'cam',
  'martorul: un spațiu într-un comentariu (trebuie să scape)')
# CAM-ul: silueta toroidalei în câmpul conservativ.
o('E01', RF, "    const a = f.raza - f.colt, w = r - a;", "    const a = f.raza, w = r - a;", 'cam',
  'toroidala socotită plată (discul plat cât toată freza): lasă lemn pe pante')
o('E02', RF, "    return w <= 0 ? 0 : f.colt - Math.sqrt(Math.max(0, f.colt * f.colt - w * w));",
  "    return w <= 0 ? 0 : (f.colt - Math.sqrt(Math.max(0, f.colt * f.colt - w * w))) / 2;", 'cam',
  'colțul urcă pe jumătate: lasă lemn pe pante (vârful peste CL-ul de pe hârtie)')
o('E03', RF, "    const a = f.raza - f.colt, w = r - a;", "    const a = f.raza - 2 * f.colt, w = r - a;", 'cam',
  'discul plat socotit mai mic (colțul începe prea devreme): sapă lângă disc')
# Lucrarea: freza dată CAM-ului și regula formei.
o('E04', JB, "      : fs?.tip === 'toroidala' ? { fel: 'toroidala', raza: D / 2, colt: fs.raza } : { fel: 'plata', raza: D / 2 };",
  "      : { fel: 'plata', raza: D / 2 };", 'program', 'lucrarea taie toroidala ca pe o plată: lasă lemn pe pante (suprafața, nu scobitura)')
o('E05', JB, "      : fs?.tip === 'toroidala' ? { fel: 'toroidala', raza: D / 2, colt: fs.raza } : { fel: 'plata', raza: D / 2 };",
  "      : fs?.tip === 'toroidala' ? { fel: 'toroidala', raza: D / 2, colt: fs.raza * 1.5 } : { fel: 'plata', raza: D / 2 };", 'program',
  'raza colțului dată CAM-ului mai mare decât a frezei: sapă')
o('E06', FZ, "  if (tip === 'finisare') return null;\n  if (forma?.tip === 'toroidala') return 'toroidala';\n",
  "  if (forma?.tip === 'toroidala') return 'toroidala';\n  if (tip === 'finisare') return null;\n", 'regula',
  'toroidala refuzată pe finisare, ca înainte')
# E07, rescrisă înaintea rulării finale: forma pe degroșare se oprește la `toroidala` înaintea rândului degroșării (prima variantă
# nu se putea atinge); aici, lucrarea o primește pe degroșare.
o('E07', JB, "        if (scula.forma?.tip === 'toroidala' && !(cale === 'scula' && motivRotunda === null)) {",
  "        if (scula.forma?.tip === 'toroidala' && !(cale === 'scula' && (motivRotunda === null || o.tip === 'degrosare'))) {", 'regula',
  'lucrarea primește toroidala pe degroșare')
# Modelul: freza scrisă de panou și rolul.
o('E08', RL, "  const raza = razaColt ?? (razaVeche !== undefined && razaVeche < diametru / 2 ? razaVeche : Math.min(1, diametru / 4));",
  "  const raza = razaColt ?? razaVeche ?? Math.min(1, diametru / 4);", 'model',
  'raza veche păstrată și când nu mai încape sub Ø / 2')
o('E09', RL, "  const raza = razaColt ?? (razaVeche !== undefined && razaVeche < diametru / 2 ? razaVeche : Math.min(1, diametru / 4));",
  "  const raza = razaColt ?? (razaVeche !== undefined && razaVeche < diametru / 2 ? razaVeche : diametru / 4);", 'model',
  'raza implicită fără plafonul de 1 mm')
o('E10', RL, "    if (s.forma?.tip === 'bila' || s.forma?.tip === 'toroidala') return s;",
  "    if (s.forma?.tip === 'bila') return s;", 'model', 'rolul de finisare înlocuiește toroidala cu o bilă')
o('E11', RL, "  if (acum === forma && s.diametru === diametru && (forma !== 'toroidala' || razaColt === undefined || razaColt === razaVeche)) return s;",
  "  if (acum === forma && s.diametru === diametru) return s;", 'model', 'raza colțului scrisă în panou nu ajunge pe freză')
# Rândul ferestrei exportului.
o('E12', ER, "    if (rc === null || !Number.isFinite(rc) || !(rc > 0) || (dBun && d !== null && !(rc < d / 2))) rez.push('raza-colt');",
  "    if (rc === null || !Number.isFinite(rc) || !(rc > 0) || (dBun && d !== null && !(rc <= d / 2))) rez.push('raza-colt');", 'unit',
  'raza cât jumătatea diametrului (o bilă) trece')
o('E13', ER, "    forma = { tip: 'toroidala', raza: rc };", "    forma = { tip: 'bila' };", 'unit', 'rândul citește toroidala ca bilă')
o('E14', ER, "  if (f.tip === 'toroidala') return { formaScula: 'toroidala', razaColt: text(f.raza) };\n",
  "  if (f.tip === 'toroidala') return { formaScula: 'toroidala' };\n", 'unit', 'freza aleasă din bibliotecă nu-și aduce raza colțului')
o('E15', ER, "    return rc !== null && rc > 0 ? { tip: 'toroidala', raza: rc } : undefined;",
  "    return undefined;", 'unit', 'identitatea frezei pierde toroidala (aceeași cu o plată de același Ø)')
o('E16', ER, "    razaColt: text(s.forma === 'toroidala' ? s.razaColt ?? RAZA_COLT_IMPLICITA : RAZA_COLT_IMPLICITA),",
  "    razaColt: text(RAZA_COLT_IMPLICITA),", 'unit', 'fereastra nu citește raza colțului din document')
# Ce scrie Exportă.
o('E17', VO, "    : formaNoua.tip === 'toroidala' ? s.forma?.tip === 'toroidala' && s.forma.raza === formaNoua.raza",
  "    : formaNoua.tip === 'toroidala' ? s.forma?.tip === 'toroidala'", 'unit', 'altă rază a colțului nu se scrie')
o('E18', VO, "        forma: { ...vechi, tip: 'toroidala', raza: formaNoua.raza },", "        forma: { tip: 'toroidala', raza: formaNoua.raza },", 'unit',
  'un câmp necunoscut al toroidalei se pierde')
o('E19', VO, "        numar: v.scula.numar, nume: numeDupaForma({ tip: 'toroidala', raza: formaNoua.raza }), diametru: v.scula.diametru,",
  "        numar: v.scula.numar, nume: 'freza bila', diametru: v.scula.diametru,", 'unit', 'numele frezei scrise de mână nu urmează forma')
# Fișa, citirea documentului, greșeala și panoul.
o('E20', FF, "            <option value=\"toroidala\">{t('export.freza.toroidala')}</option>\n", "", 'e2e',
  'fișa nu oferă toroidala')
o('E21', FF, "        {!deg && r.formaScula === 'toroidala' && <Intrare data-camp=\"relief-raza-colt\"",
  "        {false && <Intrare data-camp=\"relief-raza-colt\"", 'e2e', 'fișa nu arată raza colțului')
o('E22', FF, "    return rc === null ? null : { numar: n, diametru: d, forma: 'toroidala', razaColt: rc };",
  "    return { numar: n, diametru: d, forma: 'plata' };", 'e2e', 'creasta toroidalei socotită ca a unei plate')
o('E23', FF, "          {...(!deg && r.formaScula === 'toroidala' ? { rotunda: 'toroidala' as const, razaColt: nr(r.razaColt, 'raza-colt') } : {})} />",
  "          />", 'e2e', 'desenul frezei nu arată toroidala (fără cota razei)')
o('E24', EC, "        forma: s.forma?.tip === 'bila' ? 'bila' : s.forma?.tip === 'v' ? 'v' : s.forma?.tip === 'toroidala' ? 'toroidala' : 'plata',",
  "        forma: s.forma?.tip === 'bila' ? 'bila' : s.forma?.tip === 'v' ? 'v' : 'plata',", 'e2e',
  'fereastra citește toroidala din document ca plată')
o('E25', EC, "          : sc.forma === 'toroidala' ? { forma: { tip: 'toroidala' as const, raza: sc.razaColt ?? 0 } } : {}),",
  "          : {}),", 'e2e', 'creasta din aplicație socotește toroidala ca plată')
o('E26', DE, "        case 'raza-colt': return [t('motiv.camp.raza-colt', { max: d !== null ? fmtMargine.format(d / 2) : '–' }), 'freza-relief'];",
  "        case 'raza-colt': return [t('motiv.varf-invalid'), 'freza-relief'];", 'e2e', 'greșeala razei spune altceva')
o('E27', CF, "          <option value=\"toroidala\">{t('prop.fin.forma.toroidala')}</option>\n", "", 'e2e',
  'Tăierea nu oferă toroidala')
o('E28', CF, "      {forma === 'toroidala' && rand(t('prop.fin.raza-colt')", "      {false && rand(t('prop.fin.raza-colt')", 'e2e',
  'Tăierea nu arată raza colțului')

# După unirea frezelor (documentul v32, profilul desenat; 27.11): profilul n-are rândul reliefului.
o('E29', FZ, "  return (o.tip === 'finisare' || o.tip === 'degrosare') && formaPeRand(o.scula.forma);",
  "  return o.tip === 'finisare' || o.tip === 'degrosare';", 'unit', 'un profil desenat primește rândul reliefului (citit ca plată)')
o('E30', VO, "  if ((o.tip !== 'finisare' && o.tip !== 'degrosare') || !formaPeRand(s.forma)) return o;",
  "  if (o.tip !== 'finisare' && o.tip !== 'degrosare') return o;", 'unit', 'Exportă scrie un profil desenat ca plată')


# ---- Seturile ----
SETURI = {
    'cam': ['test/unit/reliefFinisare.toroidala.test.ts', 'test/unit/reliefFinisare.toroidala.forme.test.ts'],
    'program': ['test/unit/finisare.program.test.ts'],
    'regula': ['test/unit/toroidala.lucrare.test.ts', 'test/unit/canelura.rotunda.test.ts', 'test/unit/alegereFreza.test.ts'],
    'model': ['test/unit/finisare.toroidala.model.test.ts'],
    'unit': ['test/unit/export.relief.test.ts', 'test/unit/export.relief.biblioteca.test.ts'],
    'e2e': [],
}
E2E = ['test/e2e/relief.toroidala.spec.ts']
