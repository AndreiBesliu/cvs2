# Lista de otrăvuri a feliei 6.T↑ (gruparea, ADR 0130), 02.11.2026, alese de autor: modelul (V-carve-urile, locul comun,
# originea, id-urile redenumite, operațiile pe nodurile lor, amprenta textului, ordinea, numele), comanda din jurnal (locurile
# la degrupare, partea la locul ei, locurile repetate sau în afara listei, amestecul), calculul acțiunii (ordinea foii, piesa
# împărțită, numărul, schema), garda din registru și cheia V-carve-ului; plus cinci de interfață, prin e2e (rândul din meniu și
# ordinea lui, butonul, Ctrl+G, selecția de după).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), din worktree-ul feliei (în afara Drive-ului), după commit; cele
# „e2e” cer build-ul, deci, cu npm stricat pe mașină, trec prin bucla din raportul feliei (vite și Playwright prin `node`).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


GR = 'src/model/grupare.ts'
JU = 'src/model/jurnal.ts'
CA = 'src/ui/actiuniDocumentCalcul.ts'
AD = 'src/ui/actiuniDocument.ts'
LU = 'src/model/lume.ts'
ED = 'src/app/Editare.tsx'
SC = 'src/ui/scurtaturi.ts'

# ---- Modelul ----
o('G01', GR, "      if (alta !== undefined && alta !== k) return 'vcarve';", "      if (alta !== undefined && alta === k) return 'vcarve';", 'grupare',
  'V-carve-urile cu aceleași valori din părți diferite nu mai sunt refuzate')
o('G02', GR, 'i.x === p0.x && i.y === p0.y && i.rotire === p0.rotire);', 'i.x === p0.x && i.y === p0.y);', 'grupare',
  'locul comun ignoră rotirea')
o('G03', GR, '  const acelasiLoc = parti.every(', '  const acelasiLoc = false && parti.every(', 'grupare',
  'grupul stă mereu în origine (degrupare → grupare nu mai dă piesa de dinainte)')
o('G04', GR, '  for (let n = 2; folosite.has(nou); n++) {', '  for (let n = 2; false; n++) {', 'grupare', 'id-urile care s-ar repeta nu se mai schimbă')
o('G05', GR, 'noduri: o.noduri.map((n) => redenumite.get(n) ?? n) });', 'noduri: o.noduri });', 'grupare',
  'operațiile nu-și urmează nodurile redenumite')
o('G06', GR, "  return blocText(n) ? { ...nou, text: { ...(n['text'] as Record<string, unknown>), amprenta: amprentaContururi(copii) } } : nou;",
  '  return nou;', 'grupare', 'blocul textului păstrează amprenta veche')
o('G07', GR, 'operatii.push({ ...o, id: idLiber(o.id, idOperatii),', 'operatii.push({ ...o, id: o.id,', 'grupare',
  'id-urile operațiilor nu se mai schimbă')
o('G08', GR, '    copii.push(cuIdLiber(radacina, noduri, redenumite));', '    copii.unshift(cuIdLiber(radacina, noduri, redenumite));', 'grupare',
  'copiii în ordinea inversă a foii')
o('G09', GR, '  const comun = parti.every((x) => x.piesa.nume === nume) ? nume : undefined;', '  const comun = nume;', 'grupare',
  'grupul ia numele primei piese, și când diferă')
o('G10', GR, "radacina: { tip: 'grup', id: idLiber('g', noduri),", "radacina: { tip: 'grup', id: 'g',", 'grupare',
  'rădăcina ia `g` și când e al unui copil')
o('G11', GR, ': { ...r, matrice: compune(matriceInstanta(instanta), r.matrice) };', ': { ...r, matrice: compune(r.matrice, matriceInstanta(instanta)) };',
  'grupare', 'locul instanței compus în ordinea greșită')

# ---- Jurnalul ----
o('J01', JU, "  if (cuLocuri > 0 && c.tip === 'degrupeaza') {", "  if (cuLocuri < 0 && c.tip === 'degrupeaza') {", 'grupare',
  'degruparea cu locuri pune părțile una după alta (anularea pierde ordinea)')
o('J02', JU, '    for (const [k, x] of locInstante) if (foaie.instante[k]?.id !== x.id)', '    for (const [k, x] of locInstante) if (false)', 'grupare',
  'regruparea nu mai cere partea la locul scris')
o('J03', JU, '        if (locInstante.has(li)) throw', '        if (false) throw', 'grupare', 'un loc repetat trece')
o('J04', JU, '  if (cuLocuri > 0 && cuLocuri < c.degrupate.length) throw', '  if (false) throw', 'grupare', 'locurile doar la unele instanțe trec')
o('J05', JU, '!(Number.isInteger(k) && k >= 0 && k < n)', '!(Number.isInteger(k) && k >= 0 && k <= n)', 'grupare', 'un loc chiar după capătul listei trece')

# ---- Calculul acțiunii și registrul ----
o('A01', CA, '  for (const [k, i] of foaie.instante.entries()) {\n    const x = alese.has(i.id) ? piese.get(i.piesa) : undefined;',
  '  for (const [k, i] of [...foaie.instante].reverse().entries()) {\n    const x = alese.has(i.id) ? piese.get(i.piesa) : undefined;', 'grupare',
  'părțile în ordinea inversă a foii')
o('A02', CA, '  if (parti.some((x) => (folosiri.get(x.piesa.id) ?? 0) > 1))', '  if (parti.some((x) => (folosiri.get(x.piesa.id) ?? 0) > 2))', 'grupare',
  'piesa folosită de două instanțe nu mai e refuzată')
o('A03', CA, "  if (parti.length < 2) return { ok: false, motiv: 'motiv.grupare-doua' };\n  const folosiri",
  '  const folosiri', 'grupare', 'o singură formă împărțită își spune întâi împărțirea')
o('A04', CA, "  const comanda: Comanda = { tip: 'regrupeaza', foaie: foaie.id, degrupate: [{ ...g, parti, locuri }] };\n  const dupa = executa(istoricDin(doc), comanda).doc;\n  return is(",
  "  const comanda: Comanda = { tip: 'regrupeaza', foaie: foaie.id, degrupate: [{ ...g, parti, locuri }] };\n  const dupa = executa(istoricDin(doc), comanda).doc;\n  return true || is(",
  'grupare', 'documentul de după nu mai trece prin schemă (nivelurile)')
o('R01', AD, "    : ctx.selectie().length < 2 ? 'motiv.grupare-doua' : calcul === null", "    : calcul === null", 'grupare',
  'garda din registru nu mai cere două forme')
o('L01', LU, '    scula: { numar: o.scula.numar, diametru: o.scula.diametru, forma: o.scula.forma ?? null }, adancime: o.adancime, pas: o.pas, sens: o.sens,',
  '    scula: { numar: o.scula.numar, diametru: o.scula.diametru, forma: o.scula.forma ?? null }, pas: o.pas, sens: o.sens,', 'grupare',
  'cheia V-carve-ului fără adâncime')

# ---- Interfața (e2e) ----
o('E01', ED, "activ: selectie.length >= 2 && poate, ruleaza: () => { facut(grupeaza()); } },", "activ: selectie.length >= 1 && poate, ruleaza: () => { facut(grupeaza()); } },",
  'e2e', 'rândul Grupează activ cu o singură formă')
o('E02', ED, 'disabled={selectie.length < 2 || p.doarCitire} title={t(\'editare.grupeaza\')}', 'disabled={selectie.length < 1 || p.doarCitire} title={t(\'editare.grupeaza\')}',
  'e2e', 'butonul Grupează activ cu o singură formă')
o('E03', SC, "  ['Ctrl+G', 'document.grupeaza'],", "  ['Ctrl+Alt+G', 'document.grupeaza'],", 'e2e', 'Ctrl+G nu mai grupează')
o('E04', ED, """      { id: 'grupeaza', eticheta: t('actiune.grupeaza'), tasta: tastaActiunii('document.grupeaza'), activ: selectie.length >= 2 && poate, ruleaza: () => { facut(grupeaza()); } },
      { id: 'degrupeaza', eticheta: t('actiune.degrupeaza'), tasta: tastaActiunii('document.degrupeaza'), activ: grupAles && poate, ruleaza: () => { facut(degrupeaza()); } },""",
  """      { id: 'degrupeaza', eticheta: t('actiune.degrupeaza'), tasta: tastaActiunii('document.degrupeaza'), activ: grupAles && poate, ruleaza: () => { facut(degrupeaza()); } },
      { id: 'grupeaza', eticheta: t('actiune.grupeaza'), tasta: tastaActiunii('document.grupeaza'), activ: selectie.length >= 2 && poate, ruleaza: () => { facut(grupeaza()); } },""",
  'e2e', 'Grupează după Degrupează în meniu')
o('E05', CA, '      const r = comandaGrupare(h.doc, ctx.selectie());\n      if (!r.ok) return;\n      ctx.scrie(executa(h, r.comanda));\n      ctx.selecteaza([r.id]);',
  '      const r = comandaGrupare(h.doc, ctx.selectie());\n      if (!r.ok) return;\n      ctx.scrie(executa(h, r.comanda));\n      ctx.selecteaza([]);', 'e2e',
  'după grupare, nimic ales')


# ---- Seturile ----
def u(*nume):
    return ['test/unit/%s.test.ts' % n for n in nume]


SETURI = {
    'grupare': u('grupare', 'degrupare', 'actiuni.calcul'),
    'grupare2': u('grupare', 'degrupare', 'actiuni.calcul', 'actiuni.calcul.paritate', 'text.piesa', 'manual', 'documente.aur'),
}
E2E = ['test/e2e/import.spec.ts']
