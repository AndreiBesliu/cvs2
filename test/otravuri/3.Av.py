# Otrăvurile feliei 3.Av (numele elementelor, cu numerele în formatul limbii; constatarea 14 a auditului exportului;
# 26.11.2026), alese de autor: virgula pierdută, limba întoarsă, un număr scăpat de conversie (X-ul dreptunghiului,
# locul căii, celula reliefului). Se rulează cu `scripts/otravuri.py`, dintr-o clonă, după commit.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


DES = 'src/app/descriereElement.ts'

o('V01', DES, "const inLimba = (s: string): string => (limba() === 'ro' ? s.replace('.', ',') : s);",
  'const inLimba = (s: string): string => s;', 'u', 'numerele rămân cu punct și în română')
o('V02', DES, "(limba() === 'ro' ? s.replace('.', ',') : s)", "(limba() === 'en' ? s.replace('.', ',') : s)", 'u',
  'limba întoarsă: virgula în engleză, punctul în română')
o('V03', DES, "inaltime: nr(e.forma.inaltime), x: nr(x), y: nr(y) });", "inaltime: nr(e.forma.inaltime), x: doua(x), y: nr(y) });", 'u',
  'X-ul dreptunghiului scapă de conversie')
o('V04', DES, "celula: inLimba((f.celula * s).toFixed(3))", 'celula: (f.celula * s).toFixed(3)', 'u',
  'celula reliefului scapă de conversie')
o('V05', DES, 'n, x: nr(c.minX), y: nr(c.minY) });', 'n, x: doua(c.minX), y: nr(c.minY) });', 'u',
  'locul căii scapă de conversie')
o('V06', DES, 'const nr = (x: number): string => inLimba(doua(x));', 'const nr = (x: number): string => doua(x);', 'u',
  'conversia nu se mai aplică deloc')

SETURI = {'u': ['test/unit/descriereElement.test.ts']}
