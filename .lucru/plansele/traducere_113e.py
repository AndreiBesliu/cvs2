# Traducerea rândului 11.3↑e (după `node scripts/traduceri.ts`, care pune intrările noi cu en: ""). Folosire:
# python -B -X utf8 traducere_113e.py "<otrăvurile, în engleză>"
import json, pathlib, sys
otr = sys.argv[1]
p = pathlib.Path(r'C:\Users\besli\cncvs2-lucru\plansele\docs\traduceri\roadmap.en.json')
d = json.loads(p.read_bytes().decode('utf-8'))
TITLU_RO = 'Urechile „unde ține”'
EN_TITLU = 'Tabs where they hold'
EN = ('**Tabs where they hold** (ADR 0211, option b; the document is still v26). In the export window, “Placement” also has '
      '“where it holds”: on every export, on every copy, the app first cuts the program with these operations without tabs, '
      'looks at the bottom of the sheet (the wood joined to the edge, like the 11.3↑c check) and puts the tabs where the flat '
      'part, carried a cutter’s width past the cut, lands on joined wood (inside, on the part): as many as the number asks, as '
      'far apart as possible; with wood all around, exactly the evenly spaced ones, byte for byte. Fewer: a warning. Next to the '
      'warning about loose parts, “Put the tabs where they hold” switches their rows; with “Show toolpath”, the placed tabs '
      'show on the path. On plate 11 at 5 mm only the plaques surrounded by neighbours come loose (3 + 1, instead of 9 + 4), and '
      'at 10 mm the plate’s programs stay the same. Poisons: ' + otr + '.')
goale = [(k, v) for k, v in d['texte'].items() if v.get('en') == '']
puse = 0
for k, v in goale:
    if v['ro'] == TITLU_RO:
        v['en'] = EN_TITLU; puse += 1
    elif v['ro'].startswith('**' + TITLU_RO + '**'):
        v['en'] = EN; puse += 1
assert puse == len(goale), [v['ro'][:80] for _, v in goale]
p.write_bytes((json.dumps(d, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
print('ok', puse)
