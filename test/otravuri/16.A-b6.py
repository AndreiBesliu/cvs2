# Lista de otrăvuri a feliei 16.A↑b-6 („Pune-o înapoi în bibliotecă” din fereastra exportului; ADR 0300 §5), aleasă de autor:
# freza din copie (felul, valorile de lucru, pasul, pasul lateral, tăișul), lista cu freza pusă înapoi (id-ul încă acolo, numele
# liber, versiunea), depozitul (id-ul ei de dinainte), copia de pe rând (pasul lateral, valorile de lucru), rândurile după (locul
# apăsat, aceeași copie) și fereastra (butonul, rândurile luate); trimiterea în cont, în `test/otravuri/16.A-b6-emu.py`.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit. o(id, fis, vechi, nou, set, ce): `vechi`
# apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


M = 'src/model/freza.ts'
D = 'src/app/frezeMele.ts'
R = 'src/ui/exportRand.ts'
X = 'src/ui/DialogExport.tsx'
F = 'src/ui/FisaOperatie.tsx'

# Freza din copie și lista cu ea.
o('P01', M, "  const fel: FelFreza = !forma ? 'plata' : forma.varf !== undefined && forma.varf > 0 ? 'gravare' : 'v';",
  "  const fel: FelFreza = !forma ? 'plata' : 'v';", 'model', 'freza de gravare pusă înapoi ca V')
o('P02', M, 'Math.round((c.pasLateral / c.diametru) * 1000) / 10', 'Math.round(c.pasLateral * 10) / 10', 'model',
  'pasul lateral rămâne în mm, nu în procente')
o('P03', M, '    ? Math.min(MARGINI_FREZA.pasLateral, Math.round(', '    ? (Math.round(', 'model', 'pasul lateral trece de 50 %')
o('P04', M, '  const regim = c.regim ?? { turatie: LUCRU.turatie, avans: LUCRU.avans, plonjare: LUCRU.plonjare };',
  '  const regim = { turatie: LUCRU.turatie, avans: LUCRU.avans, plonjare: LUCRU.plonjare };', 'model', 'valorile de lucru ale copiei se pierd')
o('P05', M, '  const pas = c.pas !== null && c.pas > 0 ? c.pas :', '  const pas = c.pas !== null ? c.pas :', 'model', 'un pas zero trece')
o('P06', M, '    ...(c.tais !== undefined ? { tais: c.tais } : {}),\n    numar: c.numar,', '    numar: c.numar,', 'model', 'tăișul se pierde')
o('P07', M, "  if (lista.some((x) => x.id === id)) return { ok: false, probleme: { id: 'exista' } };\n", '', 'model',
  'freza pusă înapoi între timp e suprascrisă sau dublată')
o('P08', M, '  const r = cuFreza(lista, null, { ...f, nume: numeLiber(f.nume, lista, rezervate) }, () => id, acum, rezervate);',
  '  const r = cuFreza(lista, null, f, () => id, acum, rezervate);', 'model', 'numele luat refuză în loc de „(2)”')
o('P09', M, '  const freza: FrezaSalvata = { ...r.lista[r.lista.length - 1]!, rev };', '  const freza: FrezaSalvata = r.lista[r.lista.length - 1]!;',
  'model', 'versiunea copiei se pierde')
o('D01', D, '      const r = cuFrezaReadusa(lista, id, rev, freza, acum(), rezervate);',
  '      const r = cuFrezaReadusa(lista, `${id}-2`, rev, freza, acum(), rezervate);', 'model', 'pusă înapoi cu alt id: nu reînvie în cont')

# Copia de pe rând și rândurile după.
o('U01', R, "  const pasLateralText = unde === 'scula' ? (p.tip === 'buzunar' ? p.pasLateral : null) : unde === 'fund' ? p.pasLateralFund",
  "  const pasLateralText = unde === 'scula' ? p.pasLateral : unde === 'fund' ? p.pasLateralFund", 'model',
  'pasul lateral al unui profil intră în copie')
o('U02', R, "  const pasLateralText = unde === 'scula' ? (p.tip === 'buzunar' ? p.pasLateral : null) : unde === 'fund' ? p.pasLateralFund",
  "  const pasLateralText = unde === 'scula' ? (p.tip === 'buzunar' ? p.pasLateral : null) : unde === 'fund' ? p.pasLateral", 'model',
  'fundul plat ia pasul lateral al operației')
o('U03', R, '    ...(o.regim ? { regim: o.regim } : {}), ...(o.tais !== undefined ? { tais: o.tais } : {}),',
  '    ...(o.tais !== undefined ? { tais: o.tais } : {}),', 'model', 'valorile de lucru nu intră în copie')
o('U04', R, '      if (aici || diferenteFreza(l, f).every((d) => d.camp === \'nume\')) r =',
  '      if (diferenteFreza(l, f).every((d) => d.camp === \'nume\')) r =', 'model', 'locul apăsat nu ia freza când diferă de ea')
o('U05', R, "diferenteFreza(l, f).every((d) => d.camp === 'nume')", 'diferenteFreza(l, f).length === 0', 'model',
  'rândurile cu aceeași copie nu iau numele liber')

# Fereastra.
o('W01', F, '        {inapoi && (\n', '        {false && (\n', 'e2e', 'butonul nu apare')
o('W02', X, '            setParam((v) => cuFrezaPusaInapoi(v, cheie, unde, r.freza, text));\n', '', 'e2e',
  'rândurile nu iau freza pusă înapoi (numele liber)')

SETURI = {'model': ['test/unit/exportFreze.inapoi.test.ts', 'test/unit/frezeSincronizare.test.ts']}
E2E = ['test/e2e/exportFrezeInapoi.spec.ts']
