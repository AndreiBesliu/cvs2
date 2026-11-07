# Lista de otrăvuri a feliei 7.9↑b (spațierea literelor alese, ADR 0138 §5), 07.11.2026, alese de autor: așezarea (semnul
# golului, vecinătatea, începutul rândurilor pe puncte de cod, caracterul sărit, coloanele textului vertical, golul pus după
# litera următoare), blocul (scalarea uniformă și neuniformă, ușa: de două ori, după ultimul caracter, peste 1 000 mm),
# ajutoarele panoului (golurile de lângă un capăt de rând, valoarea comună, zeroul, rotunjirea, editarea, poziția din câmp) și
# legăturile din panou (editarea, textul ales, blocul, Alt + săgeți, −, câmpul pe toate golurile, alegerea pe puncte de cod,
# rândul oprit, „Fără spațieri”).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


AS = 'src/text/asezare.ts'
BT = 'src/model/blocText.ts'
SP = 'src/text/spatieri.ts'
PT = 'src/app/PanouText.tsx'

# Așezarea.
o('S01', AS, '          if (extra !== 0) x += extra;', '          if (extra !== 0) x -= extra;', 'asezare', 'golul ales strânge în loc să lărgească')
o('S02', AS, '(b === a + 1 ? spatiu.get(a) ?? 0 : 0);', '(spatiu.get(a) ?? 0);', 'asezare',
  'golul se pune și peste un caracter lipsă sau sărit')
o('S03', AS, 'return i + Array.from(rand).length + 1; }, 0);', 'return i + rand.length + 1; }, 0);', 'asezare',
  'începuturile rândurilor pe unități UTF-16 (după un 😀, golurile rândului următor alunecă)')
o('S04', AS, '        poz++;\n        const glifa = glifaDe(caracter);\n        if (glifa === null) continue;\n        // Crenarea',
  '        const glifa = glifaDe(caracter);\n        if (glifa === null) continue;\n        poz++;\n        // Crenarea', 'asezare',
  'un caracter lipsă din font nu se numără (indicii de după el alunecă)')
o('S05', AS, '        const extra = ant ? intre(ant.poz, c.poz) : 0;', '        const extra = ant ? intre(c.poz, ant.poz) : 0;', 'asezare',
  'textul vertical nu primește golurile')
o('S06', AS, ' - gol - sus - extra : -sus);', ' - gol - sus + extra : -sus);', 'asezare', 'pe verticală, golul ales urcă litera')
o('S07', AS, '  const spatiu = new Map((p.spatieri ?? []).map((s) => [s.dupa, s.mm]));',
  '  const spatiu = new Map((p.spatieri ?? []).map((s) => [s.dupa + 1, s.mm]));', 'asezare', 'golul se pune după litera următoare')
# Blocul și mânerele.
o('B01', BT, '  const spatieri = b.spatieri?.map((x) => ({ dupa: x.dupa, mm: x.mm * s }));',
  '  const spatieri = b.spatieri?.map((x) => ({ dupa: x.dupa, mm: x.mm }));', 'bloc', 'mânerele: spațierile nu cresc cu textul')
o('B02', BT, 'mm: x.mm * (b.vertical ? ly : lx) }))', 'mm: x.mm * lx }))', 'bloc', 'mânerele: golurile textului vertical cresc cu lățimea')
o('B03', BT, '(k === 0 || t[k - 1]!.dupa < s.dupa)', '(k === 0 || t[k - 1]!.dupa <= s.dupa)', 'bloc', 'ușa primește un gol de două ori')
o('B04', BT, '    && s.dupa + 1 < Array.from(b.continut', '    && s.dupa < Array.from(b.continut', 'bloc', 'ușa primește un gol după ultimul caracter')
o('B05', BT, '  if (spatieri?.some((x) => Math.abs(x.mm) > LIMITE_TEXT.spatiere)) return fara;', '', 'bloc',
  'mânerele: un gol peste 1 000 mm rămâne în bloc (blocul nu mai trece de ușă)')
# Ajutoarele panoului.
o('H01', SP, "c[i] !== '\\n' && c[i + 1] !== '\\n'", "c[i] !== '\\n'", 'ajutor', 'golul dintre o literă și capătul rândului se atinge')
o('H02', SP, '  return valori.size === 1 ? [...valori][0]! : null;', '  return [...valori][0] ?? null;', 'ajutor',
  'goluri diferite arată valoarea primului')
o('H03', SP, '    if (v === 0) m.delete(g);\n    else m.set(g, v);', '    m.set(g, v);', 'ajutor', 'un gol adus la 0 rămâne în listă')
o('H04', SP, 'Math.round(f(m.get(g) ?? 0) * 1000) / 1000', 'f(m.get(g) ?? 0)', 'ajutor', 'fără rotunjire: pașii de 0,1 adună erori')
o('H05', SP, '    if (x.dupa + 1 < p) rez.push(x);', '    if (x.dupa < p) rez.push(x);', 'ajutor',
  'golul unei perechi despărțite de o literă nouă rămâne')
o('H06', SP, '    else if (x.dupa >= a.length - s) rez.push({ dupa: x.dupa + d, mm: x.mm });',
  '    else if (x.dupa >= a.length - s) rez.push({ dupa: x.dupa, mm: x.mm });', 'ajutor', 'după o editare, spațierile de după ea nu se mută')
o('H07', SP, '  return Array.from(text.slice(0, pozitie)).length;', '  return pozitie;', 'ajutor', 'poziția din câmp rămâne pe unități UTF-16')
# Panoul (e2e).
o('U01', PT, 'spatieri: dupaEditare(form.continut, nou, form.spatieri) });', 'spatieri: form.spatieri });', 'e2e',
  'o editare a textului lasă spațierile pe loc: trec pe alte litere')
o('U02', PT, '      spatieri: b.spatieri ?? [],', '      spatieri: [],', 'e2e', 'textul ales nu-și aduce spațierile')
o('U03', PT, '    ...(f.spatieri.length > 0 ? { spatieri: f.spatieri } : {}),', '', 'e2e', 'spațierile nu intră în bloc')
o('U04', PT, '            e.preventDefault();\n            e.stopPropagation();\n            const el = e.currentTarget;',
  '            e.stopPropagation();\n            const el = e.currentTarget;', 'e2e', 'Alt + săgeată ajunge și la browser (pagina înapoi)')
o('U05', PT, "const pas = e.key === 'ArrowRight' ? PAS_SPATIU : -PAS_SPATIU;", 'const pas = PAS_SPATIU;', 'e2e', 'Alt + ← lărgește și el')
o('U06', PT, '(x) => x - PAS_SPATIU); }}>−</button>', '(x) => x + PAS_SPATIU); }}>−</button>', 'e2e', 'butonul − lărgește')
o('U07', PT, 'cuGoluri(form.spatieri, goluri, () => v) });', 'cuGoluri(form.spatieri, goluri.slice(0, 1), () => v) });', 'e2e',
  'câmpul schimbă doar primul gol ales')
o('U08', PT, '    setAlegere({ inceput: pePuncte(el.value, a), sfarsit: pePuncte(el.value, b) });', '    setAlegere({ inceput: a, sfarsit: b });',
  'e2e', 'alegerea din câmp pe unități UTF-16 (după un 😀, altă pereche)')
o('U09', PT, '              disabled={goluri.length === 0} placeholder=', '              disabled={false} placeholder=', 'e2e',
  'câmpul rămâne deschis fără nicio pereche aleasă')
o('U10', PT, "onClick={() => { scrie({ ...form, spatieri: [] }); setCampSpatiu(null); }}>", 'onClick={() => { setCampSpatiu(null); }}>', 'e2e',
  '„Fără spațieri” nu scoate nimic')

SETURI = {
    'asezare': ['test/unit/text.proportii.test.ts', 'test/unit/text.corpus.test.ts', 'test/unit/text.spatieri.test.ts', 'test/unit/text.caseta.test.ts',
                'test/unit/text.aldin.test.ts'],
    'bloc': ['test/unit/text.spatieri.test.ts', 'test/unit/text.proportii.test.ts', 'test/unit/text.piesa.test.ts'],
    'ajutor': ['test/unit/text.spatieri.test.ts'],
}
E2E = ['test/e2e/text.spec.ts']
