# Lista de otrăvuri a feliei 28.8↑k (curățenia vizuală a ferestrei exportului, ADR 0291; constatările 8, 10, 11, 12, 16, 17 și 21
# ale auditului), 26.11.2026, alese de autor: capul listei care nu se strânge; bifele cu căsuța lângă etichetă și câmpurile fundului
# plat pe un rând; golurile desenului Z0 doar când sunt în proiect, cu cota supracursei lângă golul care se vede; diametrul frezei
# în V sub vârf; textele lungi prescurtate, cu „Mai mult” al grupului și al notelor.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă a ramurii, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


CSS = 'src/app/stil.css'
ER = 'src/ui/exportRand.ts'
DE = 'src/ui/DialogExport.tsx'
DS = 'src/ui/exportDesene.tsx'
TS = 'src/ui/TextScurt.tsx'

# Capul listei (constatarea 8).
o('K01', CSS, '.dx-lista > * {\n  flex-shrink: 0;\n}', '.dx-lista > * {\n  flex-shrink: 1;\n}', 'e2e',
  'rândurile listei se strâng iar (capul se suprapune cu „A mea”)')
# Bifele și fundul plat (constatarea 10).
o('K02', CSS, ".dialog-export label:where(:has(> input[type='checkbox'])) {\n  display: inline-flex;",
  ".dialog-export label:where(:has(> input[type='checkbox'])) {\n  display: grid;", 'e2e', 'bifele cu eticheta dedesubt, ca înainte')
o('K03', CSS, '.dialog .campuri-fund {\n  display: flex;', '.dialog .campuri-fund {\n  display: block;', 'e2e',
  'câmpurile fundului plat unul sub altul')
o('K04', CSS, '.dialog .campuri-fund > .freza-biblioteca {\n  flex-basis: 100%;', '.dialog .campuri-fund > .freza-biblioteca {\n  flex-basis: auto;',
  'e2e', 'lista „Din frezele mele” alături de număr: pasul fundului trece pe rândul următor')
# Bifa prin foaie și desenul Z0 (constatările 11, 12).
o('K05', DE, '          {cuSupracursa && (\n          <label className="alegere bifa-supracursa"',
  '          {supracursaBuna && (\n          <label className="alegere bifa-supracursa"', 'e2e', 'bifa arătată și la supracursa 0')
o('K06', DS, '      {gaura && <>\n', '      {true && <>\n', 'e2e', 'golul incrustației desenat și fără incrustație')
o('K07', DE, "p.incrustatieDreapta && p.locasInc === 'gaura');", 'p.incrustatieDreapta);', 'e2e',
  'golul incrustației desenat și la un locaș-buzunar')
o('K08', DS, '      {prinFoaie && sp > 0 && <>\n', '      {sp > 0 && <>\n', 'e2e', 'tăietura cât foaia desenată și fără bifă')
o('K09', DS, '  const xc = !gaura && prinFoaie && sp > 0 ? 186 : 140;', '  const xc = 140;', 'e2e',
  'cota supracursei rămâne lângă golul incrustației, chiar când acela nu se desenează')
# Freza în V (constatarea 17).
o('K10', DS, 'x1={96} y1={126} x2={164} y2={126} text={`Ø ${D} mm`} tx={130} ty={141} />', 'x1={96} y1={30} x2={164} y2={30} text={`Ø ${D} mm`} tx={130} ty={24} />',
  'e2e', 'diametrul frezei în V pe coadă, peste T')
# Textele lungi (constatarea 21).
o('K11', ER, '  if (text.length <= PRAG_TEXT_LUNG) return { prima: text, rest: \'\' };\n', '', 'scurt', 'și un text scurt se taie')
o('K12', ER, "  const m = /^(.+?\\.)\\s+(?=[\\p{Lu}(„\"“])/su.exec(text);", "  const m = /^(.+?\\.)\\s+/su.exec(text);", 'scurt',
  'orice punct urmat de spațiu încheie propoziția („etc. și”)')
o('K13', ER, '    for (const x of texte) { m.textContent = deschisa ? x : textStrans(x);', '    for (const x of texte) { m.textContent = x;', 'e2e',
  'caseta strânsă își ține înălțimea textului întreg (11 rânduri la treaptă)')
o('K14', ER, "    g.toggleAttribute('data-lung', texte.some((x) => scurtat(x).rest !== ''));", "    g.toggleAttribute('data-lung', true);", 'e2e',
  '„Mai mult” și în grupurile fără texte lungi')
o('K15', DE, '            {deschisa ? explicatie : textStrans(explicatie)}', '            {textStrans(explicatie)}', 'e2e',
  '„Mai mult” al grupului nu desface explicația')
o('K16', DE, '    setDeschise((d) => { const n = new Set(d); if (!n.delete(loc)) n.add(loc); return n; });',
  '    setDeschise((d) => { const n = new Set(d); n.add(loc); return n; });', 'e2e', '„Mai puțin” nu mai strânge grupul')
o('K17', TS, '  const deschis = deschisPentru === text;', '  const deschis = false;', 'e2e', '„Mai mult” al unei note nu o desface')

SETURI = {
    'scurt': ['test/unit/export.textScurt.test.ts'],
}
E2E = ['test/e2e/export.privire.spec.ts', 'test/e2e/export.desene.spec.ts', 'test/e2e/export.texte.spec.ts', 'test/e2e/supracursa.spec.ts']
