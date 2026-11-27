# Lista de otrăvuri a feliei 16.A↑f-2 (canelura cu profilul desenat; ADR 0304 §3), 27.11.2026, aleasă de autor: regula formei
# (doar pe linie), refuzul lucrării pe frezele în plus, scula din IR (silueta și ordinea punctelor), identitatea frezei pe T
# (siluetele diferite, inclusiv doar în h; numele în motiv) și raportul foilor. Se rulează cu `scripts/otravuri.py`
# (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


FF = 'src/model/formaFrezei.ts'
JB = 'src/cam/job.ts'
RF = 'src/model/raportFoi.ts'

# G01 și G02, mutate în 16.A↑f-4 (regula profilului are acum ramura „pe o parte”): G02 era profilul primit pe o parte; din
# f-4 e primit, cu fund plat și până la înălțimea lui, deci otrava devine primirea fără judecata lor.
o('G01', FF, "    if (tip !== 'profil') return 'profil';", "    if (tip !== 'profil') return null;", 'm',
  'profilul primit pe orice operație (buzunar, V-carve, relief)')
o('G02', FF, "    if (latura === 'pe-linie') return null;", "    return null;", 'm',
  'profilul primit pe o parte fără judecata fundului plat și a înălțimii')
o('G03', JB, "        if (scula.forma?.tip === 'profil' && !(cale === 'scula' && motivRotunda === null)) {",
  "        if (scula.forma?.tip === 'profil' && !(motivRotunda === null)) {", 'm', 'profilul primit ca freză de rest')
o('G04', JB, "  ...(s.forma?.tip === 'profil' ? { forma: { tip: 'profil' as const, puncte: s.forma.puncte.map(([r, h]) => [r, h] as const) } } : {}),\n",
  '', 'm', 'scula din IR fără siluetă: simularea taie o plată')
o('G05', JB, "puncte: s.forma.puncte.map(([r, h]) => [r, h] as const)", "puncte: s.forma.puncte.map(([r, h]) => [r, h * 0.5] as const)", 'm',
  'silueta din IR turtită (h pe jumătate)')
o('G06', JB, "  const cheieForma = (s: Taietura['scula']): string => (s.forma?.tip === 'profil'\n    ? `profil ${s.forma.puncte.map(([r, h]) => `${r} ${h}`).join(';')}` : forma(s));",
  "  const cheieForma = (s: Taietura['scula']): string => forma(s);", 'm', 'același T cu două siluete, primit (două freze sub un număr)')
o('G07', JB, "? `profil ${s.forma.puncte.map(([r, h]) => `${r} ${h}`).join(';')}` : forma(s));",
  "? `profil ${s.forma.puncte.map(([r]) => `${r}`).join(';')}` : forma(s));", 'm', 'siluetele care diferă doar în h, luate drept aceeași freză')
o('G08', JB, "        const fu = forma(u) === forma(s) ? `${forma(u)} cu altă siluetă` : forma(u);",
  "        const fu = forma(u);", 'm', 'motivul nu spune că siluetele diferă („profilată și profilată”)')
o('G09', RF, "      ...(o.scula.forma?.tip === 'profil' ? { profilata: true as const } : {}),\n", '', 'm',
  'raportul foilor arată freza profilată ca pe o plată')

SETURI = {
    'm': ['test/unit/canelura.profil.test.ts', 'test/unit/profil.lucrare.test.ts'],
}
