# Lista de otrăvuri a feliei 28.8↑b-3 (tăietura ca cartonașe cu poze, ADR 0290), 24.11.2026, alese de autor: găurirea oprită cu
# motivul ei, inputul oprit ascuns, alegerea incrustației cu pereți drepți, valoarea incrustației în V, tăieturile contururilor
# închise pe o cale deschisă, poza tăieturii în listă și locul ei lângă text.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă a ramurii, după commit; cele „e2e” cer build-ul.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


DLG = 'src/ui/DialogExport.tsx'
CSS = 'src/app/stil.css'

o('T01', DLG, "motiv: o.cercuri === true ? undefined : t('export.card.latura.cercuri') },", 'motiv: undefined },', 'e2e',
  'găurirea de ales și pe un rând fără cercuri')
o('T02', CSS, '.dialog .dx-card > input,\n.dialog .dx-card > input:disabled {', '.dx-card > input {', 'e2e',
  'inputul unui cartonaș oprit, un cerc la vedere peste el')
o('T03', DLG, ": v === 'incrustatie-drept' ? { ...fara, tip: 'buzunar', incrustatieDreapta: true }", ": v === 'incrustatie-drept' ? { ...fara, tip: 'buzunar' }",
  'e2e', 'cartonașul incrustației cu pereți drepți alege un buzunar simplu')
o('T04', DLG, "p.tip === 'vcarve' ? (p.incrustatie ? 'incrustatie' : 'vcarve')", "p.tip === 'vcarve' ? 'vcarve'", 'e2e',
  'incrustația în V arătată ca V-carve')
o('T05', DLG, '                        ...(deschis ? [] : [', '                        ...(false ? [] : [', 'e2e',
  'buzunarul, V-carve-ul și incrustațiile oferite pe o cale deschisă')
o('T06', DLG, '<Poza k={`latura.${taieturaRand(p)}`} />', '<Poza k="latura.exterior" />', 'e2e', 'poza din listă nu urmează tăietura')
o('T07', CSS, '.dx-meta > .dx-poza {\n  display: inline-block;\n', '.dx-meta > .dx-poza {\n', 'e2e', 'poza din listă pe un rând al ei, peste text')

SETURI = {}
E2E = ['test/e2e/export.cartonase.spec.ts', 'test/e2e/incrustatie.spec.ts', 'test/e2e/incrustatieDreapta.spec.ts', 'test/e2e/import.spec.ts']
