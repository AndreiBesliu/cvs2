# Lista de otrăvuri a feliei 28.8↑d-1 (desenele fundului plat și ale incrustației în V, lemnul din jurul dopului pe cartonașe,
# ADR 0290), 24.11.2026, alese de autor: formulele (peretele la D·tan(θ/2), unghiul pe jumătate, pragul fundului plat, S, contactul,
# placa, jocul cât adâncimea) față de lucrare și de valorile pe hârtie, apoi fereastra (desenul fundului, felul fundului, jocul ca
# spațiu, lemnul din jurul dopului, freza la miime, contactul).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă a ramurii, după commit; cele „e2e” cer build-ul.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


CAL = 'src/ui/exportDeseneCalcul.ts'
DES = 'src/ui/exportDesene.tsx'
DLG = 'src/ui/DialogExport.tsx'

o('V01', CAL, 'return { t, perete: adancime * t, prag: 2 * adancime * t };', 'return { t, perete: adancime / t, prag: 2 * adancime * t };', 'desene',
  'peretele împărțit la tangentă, nu înmulțit')
o('V02', CAL, '  const t = Math.tan((unghi * Math.PI) / 360);\n  return { t, perete',
  '  const t = Math.tan((unghi * Math.PI) / 180);\n  return { t, perete', 'desene', 'unghiul întreg al frezei, nu jumătatea lui')
o('V03', CAL, 'prag: 2 * adancime * t };', 'prag: adancime * t };', 'desene', 'pragul fundului plat pe o singură parte')
o('V04', CAL, 'const S = adancime - joc, H = fierastrau;', 'const S = adancime, H = fierastrau;', 'desene', 'dopul intră toată adâncimea (fără joc)')
o('V05', CAL, 'contact: S * v.t,', 'contact: adancime * v.t,', 'desene', 'contactul pe toată adâncimea')
o('V06', CAL, 'grosimeMinima: S + H + SUB_FATA_DOPULUI,', 'grosimeMinima: S + H,', 'desene', 'placa fără lemnul de sub fața dopului')
o('V07', CAL, '|| joc >= adancime ||', '|| joc > adancime ||', 'desene', 'jocul cât adâncimea, desenat')

o('W01', DLG, "                  case 'fund': return (c) => <DesenFund", "                  case 'fund-x': return (c) => <DesenFund", 'e2e',
  'grupul fundului fără desen')
o('W02', DES, "  const fel = fundPlat ? 'plat' : incrustatie ? 'v' : 'lemn';", "  const fel = fundPlat ? 'plat' : 'lemn';", 'e2e',
  'incrustația fără freză dreaptă desenată cu lemn între pereți')
o('W03', DLG, 'unghi={citesteNumar(p.unghiV)} fundPlat={p.fundPlat}', 'unghi={citesteNumar(p.unghiV)} fundPlat={false}', 'e2e',
  'bifa fundului plat ignorată de desen')
o('W04', DES, "t('export.desen.incrustatie.intra', { s: c.f(v.S), c: c.f(v.contact) })", "t('export.desen.incrustatie.intra', { s: c.f(v.fata), c: c.f(v.contact) })",
  'e2e', 'cât intră dopul scris cu fața coborâtă')
o('W05', DLG, 'fierastrau={citesteNumar(p.acelasiSpatiu ? p.jocInc : p.fierastrauInc)}', 'fierastrau={citesteNumar(p.fierastrauInc)}', 'e2e',
  '„Același spațiu” ignorat de desen')
o('W06', DLG, "oprit={doarCitire} titlu={t('export.banda.jur.titlu')} onAlege={(v) => { schimba(o.cheie, { jurDop: v }); }}",
  "oprit={doarCitire} titlu={t('export.banda.jur.titlu')} onAlege={() => { schimba(o.cheie, { jurDop: 'fata' }); }}", 'e2e',
  'cartonașul benzii nu alege nimic')
o('W07', DLG, 'fz: (x) => fmtFreza.format(x),', 'fz: (x) => fmtTrecere.format(x),', 'e2e', 'freza la sutime în desene (3,18)')
o('W08', DES, '<path className="ua" data-contact d=', '<path className="ua" d=', 'e2e', 'contactul pereților nemarcat')

SETURI = {
    'desene': ['test/unit/export.desene.test.ts'],
}
E2E = ['test/e2e/export.desene.spec.ts', 'test/e2e/incrustatie.spec.ts', 'test/e2e/incrustatieBanda.spec.ts']
