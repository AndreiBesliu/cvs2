# Lista de otrăvuri a feliei 7.7↑ (textul vertical, ADR 0141), 03.11.2026: coloanele (axa, de la stânga la dreapta), golul
# dintre litere (em-ul, majuscula, spațierea, pragul de 0), cutia literei (aldinul, spațiul), liniile de bază, alinierea,
# centrarea pe axă, mutarea (cu punctele de control), desenul literei comun cu rândurile, blocul (doar `true`, nu pe curbă)
# și panoul (bifa, curba lăsată deoparte, alinierea și eticheta coloanelor, textul ales). Alese de autor.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), din worktree-ul feliei (în afara Drive-ului), după commit; setul
# „e2e”, cu harnașul local pe portul worktree-ului (4174).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


ASE = 'src/text/asezare.ts'
BLO = 'src/model/blocText.ts'
PAN = 'src/app/PanouText.tsx'

# ---- Așezarea coloanelor ----
o('V01', ASE, 'const em = (font.unitsPerEm * p.inaltime) / font.majuscula;', 'const em = (font.unitsPerEm * miez) / font.majuscula;', 'vert',
  'em-ul la înălțimea miezului (cu aldin, golul se strânge)')
o('V02', ASE, 'const gol = Math.max(0, em - p.inaltime) + p.spatiere;', 'const gol = em - p.inaltime + p.spatiere;', 'vert',
  'golul negativ la un font cu em-ul sub majusculă')
o('V03', ASE, 'const gol = Math.max(0, em - p.inaltime) + p.spatiere;', 'const gol = Math.max(0, em - p.inaltime);', 'vert',
  'spațierea ignorată pe verticală')
o('V04', ASE, 'const axa = r * inaltimeRand;', 'const axa = -r * inaltimeRand;', 'vert', 'coloanele de la dreapta la stânga')
o('V05', ASE, 'maxX: c.maxX + 2 * d, maxY: c.maxY + 2 * d }', 'maxX: c.maxX, maxY: c.maxY }', 'vert', 'cutia literei îngroșate, a miezului')
o('V06', ASE, 'const sus = c.cutie ? c.cutie.maxY : p.inaltime;', 'const sus = c.cutie ? c.cutie.maxY : 0;', 'vert', 'spațiul nu ține loc')
o('V07', ASE, 'baze.push(ant ? baze[k - 1]! + (ant.cutie ? ant.cutie.minY : 0) - gol - sus : -sus);',
  'baze.push(ant ? baze[k - 1]! + 0 - gol - sus : -sus);', 'vert', 'coborârea literei de deasupra ignorată (virgula lui Ț)')
o('V08', ASE, 'baze.push(ant ? baze[k - 1]! + (ant.cutie ? ant.cutie.minY : 0) - gol - sus : -sus);',
  'baze.push(ant ? baze[k - 1]! + (ant.cutie ? ant.cutie.minY : 0) - gol - sus : 0);', 'vert', 'prima linie de bază în ancoră (litera iese deasupra)')
o('V09', ASE, "const dy = p.aliniere === 'stanga' ? 0 : p.aliniere === 'centru' ? -jos / 2 : -jos;",
  "const dy = p.aliniere === 'stanga' ? 0 : p.aliniere === 'centru' ? -jos : -jos / 2;", 'vert', 'mijloc și jos inversate')
o('V10', ASE, 'const tx = axa - (c.cutie.minX + c.cutie.maxX) / 2,', 'const tx = axa - c.cutie.minX,', 'vert', 'literele lipite de axă cu marginea stângă')
o('V11', ASE, "s: v.s.tip === 'C' ? { tip: 'C', c1: { x: v.s.c1.x + tx, y: v.s.c1.y + ty }, c2: { x: v.s.c2.x + tx, y: v.s.c2.y + ty } } : v.s,",
  's: v.s,', 'vert', 'punctele de control ale cubicelor nemutate')
o('V12', ASE, 'const cai = contururiLitera(font, l.glifa, d > 0 ? harta(0, 0) : harta(x0, baza), raport, buget);',
  'const cai = contururiLitera(font, l.glifa, harta(x0, baza), raport, buget);', 'vert', 'pe rând, litera aldină desenată la loc și mutată încă o dată')

# ---- Blocul ----
o('B01', BLO, "v.check((b) => !(b.vertical && b.curba), 'textul vertical nu stă pe o curbă'),", "v.check(() => true, 'textul vertical nu stă pe o curbă'),",
  'vert', 'blocul vertical primit pe o curbă')
o('B02', BLO, 'vertical: v.optional(v.literal(true)),', 'vertical: v.optional(v.boolean()),', 'vert', 'blocul primește și `vertical: false`')

# ---- Panoul (e2e) ----
o('P01', PAN, 'const curbaActiva = drept || form.textVertical ? null : curbaPosibila;', 'const curbaActiva = drept ? null : curbaPosibila;', 'e2e',
  'textul vertical pus pe curbă')
o('P02', PAN, '...(f.textVertical ? { vertical: true as const } : {}),', '...({}),', 'e2e', 'blocul nu primește direcția')
o('P03', PAN, 'textVertical: b.vertical === true,', 'textVertical: f.textVertical,', 'e2e', 'textul ales nu-și aduce direcția în panou')
o('P04', PAN, 't(form.textVertical ? `editare.text.aliniere.${ALINIERI_VERTICALE[a]}` : `editare.text.aliniere.${a}`)', 't(`editare.text.aliniere.${a}`)',
  'e2e', 'alinierea rămâne stânga / centru / dreapta pe verticală')
o('P05', PAN, "{curbaPosibila && form.textVertical ? <p className=\"nota-retea\" data-testid=\"text-vertical-curba\">{t('editare.text.vertical.curba')}</p> : null}",
  '{null}', 'e2e', 'panoul nu spune că textul vertical stă drept')

SETURI = {
    'vert': ['test/unit/text.vertical.test.ts', 'test/unit/text.aldin.test.ts'],
    'vert2': ['test/unit/text.vertical.test.ts', 'test/unit/text.aldin.test.ts', 'test/unit/text.corpus.test.ts', 'test/unit/text.linie.test.ts',
              'test/unit/text.svg.test.ts', 'test/unit/text.piesa.test.ts', 'test/unit/text.actiune.test.ts', 'test/unit/text.curba.test.ts'],
}
E2E = ['test/e2e/text.spec.ts']
