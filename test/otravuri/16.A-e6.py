# Lista de otrăvuri a feliei 16.A↑e-6 (profilul pe o parte cu bila și cu toroidala; ADR 0303 §4, întrebarea 2a), 27.11.2026,
# aleasă de autor: regula formei pe o parte (adâncimea cel puțin raza colțului), raza colțului, peretele pe hârtie (verticalul,
# marginea de jos), refuzul lucrării, lista din Tăierea, regula rândului din fereastră și raza lui, rândul „pe hârtie” și, în
# fereastră, lista formei, nota peretelui și greșeala cu raza. Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o
# clonă, după commit (setul `e2e` cere `.tmp/pw.config.ts` în clonă).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


FF = 'src/model/formaFrezei.ts'
CR = 'src/model/creasta.ts'
JB = 'src/cam/job.ts'
AF = 'src/model/alegereFreza.ts'
ER = 'src/ui/exportRand.ts'
HE = 'src/app/hartieExport.ts'
FO = 'src/ui/FisaOperatie.tsx'
DE = 'src/ui/DialogExport.tsx'

# ── Regula și lucrarea ───────────────────────────────────────────────────────────────────────────────────────────────
o('E01', FF, "  if (rotunda && tip === 'profil') {", "  if (false) {", 'm', 'pe o parte, bila și toroidala refuzate iar, oricât de adânc')
o('E02', FF, "    return rho !== null && o?.adancime !== undefined && o.adancime >= rho ? null : 'rotunda-adancime';",
  "    return rho !== null && o?.adancime !== undefined && o.adancime > 0 ? null : 'rotunda-adancime';", 'm',
  'adâncimea nu mai e judecată (peretele n-ar ajunge la desen sub ρ)')
o('E03', FF, "    return rho !== null && o?.adancime !== undefined && o.adancime >= rho ? null : 'rotunda-adancime';",
  "    return o?.adancime !== undefined && (rho === null || o.adancime >= rho) ? null : 'rotunda-adancime';", 'm',
  'bila fără diametru știut, primită pe o parte (nejudecată)')
o('E04', CR, "  if (forma?.tip === 'bila') return diametru === undefined ? null : diametru / 2;",
  "  if (forma?.tip === 'bila') return diametru === undefined ? null : diametru;", 'm', 'raza colțului bilei cât diametrul')
o('E05', CR, "  const vertical = adancime - rho;", "  const vertical = adancime;", 'm', 'peretele spus vertical până la fund (racordarea uitată)')
o('E06', CR, "adancime >= grosime && vertical < grosime ? grosime - vertical : 0;", "adancime >= grosime && vertical < grosime ? 0 : 0;", 'm',
  'marginea de jos a piesei, prin foaie, nespusă')
o('E07', JB, "      if (rotunda(o.scula) && motivRotunda === 'rotunda-adancime') {", "      if (false) {", 'm',
  'refuzul sub ρ fără raza colțului și adâncimea (motivul de „nu se taie aici”)')
o('E08', JB, "      const motivRotunda = motivFormaPeOperatie(o.tip, o.latura, o.scula.forma, o, o.scula.diametru);",
  "      const motivRotunda = motivFormaPeOperatie(o.tip, o.latura, o.scula.forma, o);", 'm',
  'lucrarea nu dă diametrul: bila refuzată pe o parte oricât de adânc')
# ── Listele și fereastra ─────────────────────────────────────────────────────────────────────────────────────────────
o('E09', AF, "    return operatii.every((o) => motivFormaPeOperatie(o.tip, o.latura, forma, o, diametru) === null && (!cuRand(o) || formaPeRand(forma)));",
  "    return operatii.every((o) => motivFormaPeOperatie(o.tip, o.latura, forma, o) === null && (!cuRand(o) || formaPeRand(forma)));", 'm',
  'Tăierea nu oferă bila pe o parte (diametrul frezei din bibliotecă uitat)')
o('E10', ER, "    return d === null || rho === null || d >= rho;", "    return true;", 'm', 'fereastra lasă bila pe o parte sub ρ')
o('E11', ER, "  return p.formaScula === 'bila' ? n / 2 : n;", "  return n;", 'm', 'raza colțului bilei pe rând cât diametrul')
o('E12', HE, "    const perete = rotunda && i.peOParte === true && D !== null && adancime !== null",
  "    const perete = rotunda && D !== null && adancime !== null", 'm', 'peretele spus și pe linie (canelura)')
# ── Fereastra (e2e) ──────────────────────────────────────────────────────────────────────────────────────────────────
o('E13', FO, "  const rotundaAici = p.tip === 'profil' || p.tip === 'buzunar';",
  "  const rotundaAici = (p.tip === 'profil' && p.latura === 'pe-linie') || p.tip === 'buzunar';", 'e2e',
  'bila și toroidala lipsesc din lista formei pe o parte')
o('E14', FO, "        {h.perete && (", "        {false && h.perete && (", 'e2e', 'nota peretelui nu se arată')
o('E15', DE, "    ...(p.tip === 'profil' ? { forma: formaDinRand(p), peOParte: p.latura !== 'pe-linie' } : {}),\n", '', 'e2e',
  'fereastra nu trimite forma profilului spre rândul „pe hârtie”')
o('E16', DE, "        return rho !== null ? t('motiv.rotunda-adancime', { raza: fmtFreza.format(rho) }) : t('motiv.rotunda');",
  "        return rho !== null && rho < 0 ? t('motiv.rotunda-adancime', { raza: fmtFreza.format(rho) }) : t('motiv.rotunda');", 'e2e',
  'greșeala din grupul Freza nu mai spune raza colțului')

SETURI = {
    'm': ['test/unit/profil.rotunda.test.ts', 'test/unit/alegereFreza.test.ts', 'test/unit/canelura.rotunda.test.ts',
          'test/unit/toroidala.lucrare.test.ts', 'test/unit/finisare.bila.test.ts', 'test/unit/buzunar.rotunda.test.ts'],
}

E2E = ['test/e2e/export.rotunda.spec.ts']
