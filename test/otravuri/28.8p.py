# Lista de otrăvuri a feliei 28.8↑p (ADR 0291 §3, 3a: Z-ul sigur și parcarea în „Mașina și fișierul”; turația, avansul și
# plonjarea pe o freză „scrisă de mână”), 26.11.2026, alese de autor: postul (parcarea după M5, în coordonatele programului),
# calculul exportului (Z-ul sigur în regimul foii și al dopurilor, parcarea în fiecare fișier, marginile), valorile scrise de
# mână (câmpurile, scrierea în `scula.regim`, citirea din document, T-ul), fereastra (trimiterea, oprirea, câmpurile).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă a ramurii, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


PO = 'src/post/post.ts'
CC = 'src/jobs/calculCam.ts'
RE = 'src/cam/regimExport.ts'
VO = 'src/app/valoriOperatii.ts'
EC = 'src/app/ExportConectat.tsx'
ER = 'src/ui/exportRand.ts'
DE = 'src/ui/DialogExport.tsx'
FO = 'src/ui/FisaOperatie.tsx'

# Postul: parcarea.
o('P01', PO, '  if (optiuni.parcare) adauga(', '  if (false) adauga(', 'aer', 'parcarea nu se scrie')
o('P02', PO, "  adauga('M5');\n  // Parcarea", "  // Parcarea", 'aer', 'fără M5 la final: freza pleacă la parcare cu axul pornit')
o('P03', PO, 'adauga(`G0 X${n(u(optiuni.parcare.x))} Y${n(u(optiuni.parcare.y))}`)',
  'adauga(`G0 X${n(u(optiuni.parcare.x + t.e))} Y${n(u(optiuni.parcare.y + t.f))}`)', 'aer', 'parcarea mutată încă o dată de montaj')
o('P04', PO, 'adauga(`G0 X${n(u(optiuni.parcare.x))} Y${n(u(optiuni.parcare.y))}`)',
  'adauga(`G0 X${n(optiuni.parcare.x)} Y${n(optiuni.parcare.y)}`)', 'aer', 'parcarea în mm într-un program în inch')
# Calculul exportului.
o('P05', CC, '  const regim: Regim = p.zSigur === undefined ? REGIM_IMPLICIT : { ...REGIM_IMPLICIT, zSigur: p.zSigur };',
  '  const regim: Regim = REGIM_IMPLICIT;', 'aer', 'Z-ul sigur cerut nu ajunge în lucrare')
o('P06', CC, '  const calculate = dopurileFoii(doc, p.supracursa ?? 0, regim);', '  const calculate = dopurileFoii(doc, p.supracursa ?? 0);', 'aer',
  'dopurile cu Z-ul sigur implicit')
o('P07', CC, '      ...(iesireDop ? { iesireConfirmata: iesireDop.depasire } : {}), ...parcare,',
  '      ...(iesireDop ? { iesireConfirmata: iesireDop.depasire } : {}),', 'aer', 'dopurile fără parcare')
o('P08', CC, '  if (aer) return { ok: false, motiv: aer };', '', 'aer', 'marginile nu se judecă')
o('P09', RE, 'export const Z_SIGUR_MINIM = 1;', 'export const Z_SIGUR_MINIM = 0.5;', 'aer', 'Z sigur sub ridicarea ciocănirii')
o('P10', RE, ' && z >= Z_SIGUR_MINIM && z <= Z_SIGUR_MAXIM;', ' && z >= Z_SIGUR_MINIM;', 'aer', 'Z sigur fără plafon')
o('P11', RE, ' && Math.abs(p.y) <= PARCARE_MAXIMA;', ';', 'aer', 'Y-ul parcării fără margine')
# Valorile frezei scrise de mână.
o('P12', VO, '    if (!vechi?.biblioteca) return cuRegimMana(x, regimMana);', '    if (!vechi?.biblioteca) return x;', 'mana',
  'valorile scrise nu ajung în proiect')
o('P13', VO, '    return cuRegimMana({ ...fara, nume: numeMana }, regimMana);', '    return { ...fara, nume: numeMana };', 'mana',
  'o freză din bibliotecă trecută pe mână își pierde valorile scrise')
o('P14', VO, '    const { regim: _r, ...fara } = x;\n    void _r;\n    return fara;', '    return x;', 'mana', 'golite, valorile rămân în proiect')
o('P15', VO, '  return { ...x, regim: { turatie: regim.turatie, avans: regim.avans, plonjare: regim.plonjare } };',
  '  return { regim: { turatie: regim.turatie, avans: regim.avans, plonjare: regim.plonjare }, ...x };', 'mana',
  'valorile vechi din document câștigă peste cele scrise')
o('P16', ER, '  if (!gol(r.turatie) && !intregInMargini(r.turatie, max)) rez.push(\'turatie\');',
  '  if (!gol(r.turatie) && !inMargini(r.turatie, max)) rez.push(\'turatie\');', 'mana', 'o turație cu zecimale trece')
o('P17', ER, 'return { turatie: x(r.turatie, TURATIE_IMPLICITA), avans: x(r.avans, AVANS_IMPLICIT), plonjare: x(r.plonjare, PLONJARE_IMPLICITA) };',
  'return { turatie: x(r.turatie, TURATIE_IMPLICITA), avans: x(r.avans, PLONJARE_IMPLICITA), plonjare: x(r.plonjare, PLONJARE_IMPLICITA) };', 'mana',
  'avansul gol ia plonjarea')
o('P18', ER, '      regimDinRand(p.regimMana)?.turatie);', '      undefined);', 'mana', 'T-ul nu știe turația scrisă de mână')
o('P19', ER, "  if (a.parcare === 'punct') {", "  if (a.parcare === 'nimic') {", 'mana', 'X și Y ale parcării nu se judecă')
o('P20', ER, "  const parcare = a.parcare === 'origine' ? { x: 0, y: 0 }", "  const parcare = a.parcare === 'nimic' ? { x: 0, y: 0 }", 'mana',
  'la XY0 nu pleacă nicio parcare')
# Fereastra.
o('P21', EC, '          ...(!o.scula.biblioteca && o.scula.regim\n', '          ...(false && o.scula.regim\n', 'e2e',
  'valorile scrise nu se mai arată la redeschidere')
o('P22', DE, '      ...(p.origineScula === null ? { regim: regimDinRand(p.regimMana) ?? null } : {}),', '', 'e2e', 'Exportă nu scrie valorile de mână')
o('P23', DE, '                ...(parametriAer(aer) ?? {}),\n', '', 'e2e', 'Exportă nu trimite Z-ul sigur și parcarea')
o('P24', DE, '    && supracursaBuna && numeBun && aerBun && gauriBune;', '    && supracursaBuna && numeBun && gauriBune;', 'e2e',
  'un Z sigur greșit nu oprește Exportă')
o('P25', FO, '        {p.origineScula === null && (\n        <details className="dx-regim" data-regim>',
  '        {(\n        <details className="dx-regim" data-regim>', 'e2e', 'câmpurile apar și pe o freză din bibliotecă')
o('P27', DE, '    if (strans && !strans.open) strans.open = true;', '', 'e2e', '„Du-mă la …” nu desface rândul strâns al câmpului greșit')
o('P28', FO, "    : t(regimFolosit === null ? 'export.regim.rezumat.implicit' : 'export.regim.rezumat', {",
  "    : t('export.regim.rezumat.implicit', {", 'e2e', 'rezumatul spune „ale lucrării” și cu valorile scrise')
o('P26', DE, "      && (p.origineScula !== null || campuriRegimGresite(p.regimMana).length === 0),", '      ,', 'e2e',
  'o turație greșită nu oprește Exportă')

SETURI = {
    'aer': ['test/unit/export.zSigur.oracol.test.ts'],
    'mana': ['test/unit/export.regimMana.test.ts'],
}
E2E = ['test/e2e/export.regimZ.spec.ts']
