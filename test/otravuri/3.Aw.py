# Otrăvurile feliei 3.Aw (Escape închide fereastra oriunde ar fi focusul, în cele șase ferestre; 26.11.2026), alese de
# autor: ascultătorul care nu mai vede tasta de pe `body`, câte o fereastră întoarsă la ascultarea doar pe ea (cu
# ascultătorul oprit), tasta deja oprită de altcineva. Se rulează cu `scripts/otravuri.py LISTA e2e ID…`, dintr-o clonă,
# după commit (build înaintea fiecărei otrăvi).
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


ESC = 'src/ui/escapeFereastra.ts'
DACA = "      if (e.key !== 'Escape' || e.defaultPrevented || e.isComposing) return;"

o('W01', ESC, DACA, "      if (e.key !== 'Escape' || e.defaultPrevented || e.isComposing || e.target === document.body) return;", 'e2e',
  'tasta de pe `body` nu mai închide nimic (ascultarea doar pe fereastră)')
o('W02', 'src/app/DialogAsezare.tsx', '  useEscapeFereastra(onInchide);', '  useEscapeFereastra(onInchide, false);', 'e2e',
  '„Așază pe foi” nu mai ascultă Escape pe pagină')
o('W03', 'src/app/Setari.tsx', '  useEscapeFereastra(onInchide);', '  useEscapeFereastra(onInchide, false);', 'e2e',
  'Setările nu mai ascultă Escape pe pagină')
o('W04', 'src/app/DialogRaportFoi.tsx', '  useEscapeFereastra(onInchide);', '  useEscapeFereastra(onInchide, false);', 'e2e',
  'raportul foilor nu mai ascultă Escape pe pagină')
o('W05', 'src/app/Aspectul.tsx', '  useEscapeFereastra(renunta);', '  useEscapeFereastra(renunta, false);', 'e2e',
  'Aspectul nu mai ascultă Escape pe pagină')
o('W06', 'src/extensii/parti.tsx', '  useEscapeFereastra(onEscape);', '  useEscapeFereastra(onEscape, false);', 'e2e',
  'ferestrele extensiilor nu mai ascultă Escape pe pagină')
o('W07', 'src/app/DialogLucrare.tsx', '  useEscapeFereastra(nu, !verific);', '  useEscapeFereastra(nu, false);', 'e2e',
  'lucrarea primită nu mai ascultă Escape pe pagină')
o('W08', 'src/extensii/Extensii.tsx', '  useEscapeFereastra(ramai, intrebare && deschisa !== null);', '  useEscapeFereastra(ramai, false);', 'e2e',
  'întrebarea de la închiderea extensiei nu mai ascultă Escape pe pagină')

E2E = ['test/e2e/escape.spec.ts', 'test/e2e/primire.spec.ts', 'test/e2e/extensii.lucru.spec.ts']
