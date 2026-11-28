# Otrăvurile feliei 3.Ay (Escape oriunde ar fi focusul, în dialogurile rămase; 27.11.2026), alese de autor: ascultătorul
# comun fără cutie (un dialog al ferestrei ascunse ia Escape-ul altei ferestre) și fără stivă (o ia fereastra de dedesubt),
# apoi câte un dialog întors la ascultarea doar pe el (ascultătorul comun oprit). Se rulează cu
# `scripts/otravuri.py LISTA e2e ID…`, dintr-o clonă, după commit (build înaintea fiecărei otrăvi). Spec-urile imprimantei și
# ale senderului, doar probele atinse (pe linie), ca rularea să rămână scurtă.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


ESC = 'src/ui/escapeFereastra.ts'
PI = 'src/app/PanouImprimanta.tsx'

o('Y01', ESC, " || e.isComposing || !seVede(eu)) return;", " || e.isComposing) return;", 'e2e',
  'fără cutie: „Din desen…”, în fereastra Imprimanta ascunsă, ia Escape-ul din Proiectare')
o('Y02', ESC, "      if (deschise.slice(deschise.indexOf(eu) + 1).some(seVede)) return;\n", '', 'e2e',
  'fără stivă: biblioteca (deschisă înainte) ia Escape-ul capturii mărite și se închide cu ea')
o('Y03', 'src/app/DialogDinDesen.tsx', '  useEscapeFereastra(inchide, true, cutie);', '  useEscapeFereastra(inchide, false, cutie);', 'e2e',
  '„Din desen…” nu mai ascultă Escape pe pagină')
o('Y04', PI, '  useEscapeFereastra(renunta, true, cutie);\n  const a = pas.fel', '  useEscapeFereastra(renunta, false, cutie);\n  const a = pas.fel', 'e2e',
  '„Trimite un fișier…” nu mai ascultă Escape pe pagină')
o('Y05', PI, "  const cutie = useRef<HTMLDivElement | null>(null);\n  useEscapeFereastra(renunta, true, cutie);\n  if (c.fel",
  "  const cutie = useRef<HTMLDivElement | null>(null);\n  useEscapeFereastra(renunta, false, cutie);\n  if (c.fel", 'e2e',
  'confirmările imprimantei (Oprește) nu mai ascultă Escape pe pagină')
o('Y06', 'src/app/IstoricImprimanta.tsx', '  useEscapeFereastra(() => { setGoleste(false); }, goleste, cutieGoleste);',
  '  useEscapeFereastra(() => { setGoleste(false); }, false, cutieGoleste);', 'e2e', '„Golește istoricul” nu mai ascultă Escape pe pagină')
o('Y07', 'src/app/ConfirmareMasina.tsx', '  useEscapeFereastra(() => { c.raspunde(false); });', '  useEscapeFereastra(() => { c.raspunde(false); }, false);', 'e2e',
  'confirmarea senderului pentru extensii nu mai ascultă Escape pe pagină')
o('Y08', 'src/extensii/CapturaMarita.tsx', '  useEscapeFereastra(onInchide);', '  useEscapeFereastra(onInchide, false);', 'e2e',
  'captura mărită nu mai ascultă Escape pe pagină (biblioteca de dedesubt îl ia)')
o('Y09', 'src/app/App.tsx', '  useEscapeFereastra(onInchide);\n  return (', '  useEscapeFereastra(onInchide, false);\n  return (', 'e2e',
  'dialogul care nu s-a putut încărca n-are Escape')
o('Y10', 'src/app/PanouText.tsx', '  useEscapeFereastra(onInchide);', '  useEscapeFereastra(onInchide, false);', 'e2e',
  'fereastra fonturilor fără modul n-are Escape (Escape-ul trece la unealta Text și o închide)')
o('Y11', 'src/extensii/Biblioteca.tsx', '  useEscapeFereastra(onInchide, !acoperita && !deScos);', '  useEscapeFereastra(onInchide, false);', 'e2e',
  'biblioteca nu mai ascultă Escape pe pagină')

E2E = ['test/e2e/escape.spec.ts', 'test/e2e/imprimanta.spec.ts:117', 'test/e2e/imprimanta.spec.ts:261', 'test/e2e/imprimanta.spec.ts:1247',
       'test/e2e/extensii.masina.spec.ts:84', 'test/e2e/extensii.claritate.spec.ts:155']
