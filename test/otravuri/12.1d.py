# Lista de otrăvuri a feliei 12.1↑d (fundul doar cu freza V, ADR 0173, din ADR 0170 §4), 13.11.2026, alese de autor: inelele
# V-carve-ului (distanța, primul inel, câte, ramura, plafonul, creasta), lucrarea (locașul), dopul (fața coborâtă, lărgirea,
# avertismentul), valorile pe hârtie (crestele, banda fără freza fundului), refuzurile (decuparea fără freza ei), fereastra
# (banda fără freză dreaptă, nota) și panoul.
# Țintele din ADR 0173: inelele mai rare (creasta peste g/2), fundul nescos, creasta din H în locaș, decuparea fără freză.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), din worktree-ul feliei (în afara Drive-ului), după commit, cu
# CNCVS2_E2E_RETEA=127.0.1 și configul local pe portul 4174 (`.tmp/pw.config.ts`).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


VCA = 'src/cam/vcarve.ts'
JOB = 'src/cam/job.ts'
MOD = 'src/model/incrustatie.ts'
DOP = 'src/cam/dopV.ts'
INC = 'src/cam/incrustatie.ts'
DLG = 'src/ui/DialogExport.tsx'
PAN = 'src/app/PanouProprietati.tsx'

# ---- Inelele V-carve-ului (`fundV`) ----
o('F01', VCA, '      const sv = varf + 2 * c * tan;', '      const sv = varf + 4 * c * tan;', 'fundv', 'inelele de două ori mai rare (creasta 2c)')
o('F02', VCA, '          for (const r of o.regiuni) { gol = false; inele.push(r.exterior, ...r.gauri); n += 1 + r.gauri.length; }',
  '          for (const r of o.regiuni) { gol = false; n += 1 + r.gauri.length; }', 'fundv', 'inelele socotite, dar netăiate')
o('F03', VCA, '    if (!p.fundPlat && p.fundV) {', '    if (false) {', 'fundv', 'fundul doar cu V oprit (fundul rămâne)')
o('F04', VCA, '      for (let j = 1; j <= nevoie + 1; j++) {', '      for (let j = 2; j <= nevoie + 1; j++) {', 'fundv',
  'fără primul inel (creasta 2c lângă perete)')
o('F05', VCA, '      for (let j = 1; j <= nevoie + 1; j++) {', '      for (let j = 1; j <= nevoie / 2; j++) {', 'fundv',
  'doar jumătatea dinspre pereți a inelelor')
o('F06', VCA, '      if (nevoie > INELE_FUND_V_MAXIME) {', '      if (false) {', 'fundv', 'fără plafonul inelelor')
o('F07', VCA, 'export const INELE_FUND_V_MAXIME = 400;', 'export const INELE_FUND_V_MAXIME = 500;', 'fundv', 'plafonul inelelor mai mare')
o('F08', VCA, '      if (!(c > 0 && Number.isFinite(c))) return', '      if (false) return', 'fundv', 'creasta nulă primită')
o('F09', VCA, "      avertismente.push(`${cine} (creasta cel mult ${fix3(c)} mm): mai lent decât cu o freză dreaptă`);", '', 'fundv',
  'fără avertismentul inelelor')

# ---- Lucrarea: locașul ----
o('F10', JOB, '        } : inc ? { fundV: { creasta: inc.creastaLocas } } : {}),', '        } : {}),', 'fundv', 'locașul fără inelele fundului')
o('F11', JOB, '{ fundV: { creasta: inc.creastaLocas } }', '{ fundV: { creasta: inc.creastaDop } }', 'fundv', 'creasta locașului din H, nu din g')

# ---- Valorile pe hârtie ----
o('F12', MOD, 'creastaLocas: i.joc / 2,', 'creastaLocas: i.joc,', 'fundv', 'creasta locașului cât tot jocul')
o('F13', MOD, 'creastaDop: H / 2 }', 'creastaDop: H }', 'fundv', 'creasta dopului cât tot spațiul dintre plăci')
o('F14', MOD, "  if (!v || i?.fel !== 'v' || i.jurDop !== 'banda') return null;", "  if (!v || i?.fel !== 'v' || i.jurDop !== 'banda' || !fp) return null;",
  'refuz', 'banda fără freza fundului: fără valori (dopul pe fața coborâtă)')
o('F15', MOD, '  const fund = fp?.scula.diametru ?? 0;', '  const fund = fp?.scula.diametru ?? 3;', 'refuz', 'banda fără freza fundului socotită cu Ø3')

# ---- Dopul ----
o('F16', DOP, '      } : { fundV: { creasta: val.creastaDop } }),', '      } : {}),', 'fundv', 'fața coborâtă fără inele')
o('F17', DOP, 'fp ? fp.scula.diametru + 2 * w - m + TRECERE_FUND : 0', 'fp ? fp.scula.diametru + 2 * w - m + TRECERE_FUND : 6 + 2 * w - m + TRECERE_FUND',
  'fundv', 'lărgirea feței ca pentru o freză dreaptă Ø6')
# F18 retrasă (prima rulare, `5192da6`: scăpată): dopul trimite deja toate avertismentele V-carve-ului (`DopCalculat`), deci
# rândul care trimitea avertismentul inelelor îl dădea de două ori; rândul e scos, iar avertismentul îl judecă proba „pe hârtie”.

# ---- Refuzurile ----
o('F19', INC, '    if (!d) {', '    if (false) {', 'refuz', 'decuparea fără freza ei, fără refuz')
o('F20', INC, '    for (const s of op.fundPlat ? [op.fundPlat.scula, ...(op.fundPlat.rest ?? []).map((r) => r.scula)] : []) {',
  '    for (const s of [op.fundPlat!.scula, ...(op.fundPlat!.rest ?? []).map((r) => r.scula)]) {', 'refuz',
  'ciocnirea T-urilor judecată și fără fund plat')

# ---- Fereastra și panoul ----
o('F21', DLG, '    && inMargini(p.diametruSculaBanda, MARGINI_OPERATIE.diametru) : p.fundPlat);', '    && inMargini(p.diametruSculaBanda, MARGINI_OPERATIE.diametru) : true);',
  'e2e', 'banda fără freză dreaptă, decuparea fără freza ei primită în fereastră')
o('F22', DLG, "(p.fundPlat ? 'export.incrustatie.nota' : 'export.incrustatie.nota-v')", "'export.incrustatie.nota'", 'e2e',
  'nota fără fundul doar cu V')
o('F23', DLG, '  const fund = p.fundPlat ? citesteNumar(p.diametruSculaFund) : 0;', '  const fund = p.fundPlat ? citesteNumar(p.diametruSculaFund) : null;', 'e2e',
  'banda fără freza fundului: fără lățimea cea mai mică')
o('F24', PAN, '  const fundV = hartie && operatiiAlese.every((o) => !o.fundPlat);', '  const fundV = false;', 'e2e', 'panoul fără fundul doar cu V')
o('F25', PAN, 'locas: mm(2 * hartie.creastaLocas * hartie.t)', 'locas: mm(hartie.creastaLocas * hartie.t)', 'e2e', 'inelele locașului arătate la jumătate')

SETURI = {
    'fundv': ['test/unit/incrustatie.fundV.test.ts'],
    'fundv2': ['test/unit/incrustatie.fundV.test.ts', 'test/unit/incrustatie.potrivire.test.ts', 'test/unit/incrustatie.banda.test.ts',
               'test/unit/vcarve.test.ts', 'test/unit/vcarve.fund.test.ts'],
    'refuz': ['test/unit/incrustatie.refuzuri.test.ts', 'test/unit/incrustatie.fundV.test.ts'],
    'refuz2': ['test/unit/incrustatie.refuzuri.test.ts', 'test/unit/incrustatie.fundV.test.ts', 'test/unit/incrustatie.banda.test.ts',
               'test/unit/incrustatie.banda.scriere.test.ts'],
}
E2E = ['test/e2e/incrustatie.spec.ts']
