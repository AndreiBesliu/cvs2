# Lista de otrăvuri a feliei 28.8↑i (viteza ferestrei exportului, ADR 0291 §1, constatarea 4 a auditului), 25.11.2026, alese
# de autor: pragul sub care toate fișele rămân randate, fișele din jurul panoului (marginea de o înălțime de panou), vecinele
# celei curente, fișa cu focusul și golirea ei când focusul pleacă din panou, randarea fișei la „Du-mă la …” înaintea derulării.
# Rândurile listei cu `memo` schimbă doar timpul, nu ce se vede: le judecă măsurătoarea, nu o otravă. `content-visibility` pe
# rânduri, încercat în felie, a fost scos după primul complet (un rând departe de vedere avea înălțimea 0): V10 îl pune la loc.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă a ramurii, după commit; toate cer build-ul („e2e”).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


DE = 'src/ui/DialogExport.tsx'
CSS = 'src/app/stil.css'

# Pragul și fereastra fișelor.
o('V01', DE, 'const PRAG_FISE = 12;', 'const PRAG_FISE = 1000;', 'e2e', 'toate fișele randate și pe 150 de operații, ca înainte')
o('V02', DE, 'const PRAG_FISE = 12;', 'const PRAG_FISE = 11;', 'e2e', 'la 12 operații, nu mai sunt toate randate')
o('V03', DE, ' || vazute.has(cheie) ||', ' ||', 'e2e', 'fișele din jurul panoului nu se randează (doar curenta și vecinele)')
o('V04', DE, '(locCurent >= 0 ? Math.abs(loc - locCurent) <= 1 :', '(locCurent >= 0 ? false :', 'e2e',
  'fișa curentă și vecinele ei nu se randează')
o('V05', DE, " || cheie === cuFocus\n", "\n", 'e2e', 'fișa cu focusul dispare când omul derulează departe')
o('V06', DE, '      if (b.bottom >= r.top - r.height && b.top <= r.bottom + r.height) aproape.add(cheie);',
  '      if (b.bottom >= r.top && b.top <= r.bottom) aproape.add(cheie);', 'e2e', 'fără marginea de o înălțime de panou')
o('V07', DE, '    if (!p || toateFisele) return;\n    const r = p.getBoundingClientRect();\n    const aproape',
  '    if (true) return;\n    const r = p.getBoundingClientRect();\n    const aproape', 'e2e', 'fereastra nu se mai socotește deloc')
o('V08', DE, "    if (p?.querySelector(`${sel}[data-gol]`)) flushSync(() => { setCurent(cheie); });\n", '', 'e2e',
  '„Du-mă la …” derulează la locul gol, fără fișa randată (nici greșeala, nici focusul)')
o('V09', DE, ' setCuFocus(null); }}\n', ' void 0; }}\n', 'e2e', 'fișa cu focusul rămâne randată și după ce focusul a plecat din panou')

# Rândurile listei.
o('V10', CSS, '  align-items: start;\n  gap: 2px;\n}\n\n.dx-nav-op.tras {',
  '  align-items: start;\n  gap: 2px;\n  content-visibility: auto;\n  contain-intrinsic-block-size: auto 3.5rem;\n}\n\n.dx-nav-op.tras {', 'e2e',
  'rândurile listei departe de vedere fără înălțimea lor: se mută sub clic când intră în vedere')

SETURI = {}
E2E = ['test/e2e/export.viteza.spec.ts', 'test/e2e/export.hartie.spec.ts']
