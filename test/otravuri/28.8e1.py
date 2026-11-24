# Lista de otrăvuri a feliei 28.8↑e-1 (incrustația cu pereți drepți: Locașul, Treapta și Dopul în grupurile lor, alegerile pe
# cartonașe, ADR 0290), 24.11.2026, alese de autor: sprijinul mutat la gaură și la treaptă, variantele sprijinului, sprijinul
# dopului decupat cu treaptă, grupul treptei, titlul rândului sprijinului.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă a ramurii, după commit; toate „e2e” (cer build-ul).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


DLG = 'src/ui/DialogExport.tsx'

o('P01', DLG, "schimba(o.cheie, { locasInc, ...(locasInc === 'gaura' && p.sprijinInc === 'fund'",
  "schimba(o.cheie, { locasInc, ...(false && p.sprijinInc === 'fund'", 'e2e', 'la gaură, sprijinul rămâne pe fund (care nu există)')
o('P02', DLG, ": (p.treaptaInc === 'fara' || p.sprijinInc === 'fata' ? 'umar' : p.sprijinInc);", ': p.sprijinInc;', 'e2e',
  'cu treaptă, sprijinul nu trece pe umăr')
o('P03', DLG, "...(p.treaptaInc !== 'fara' ? [{ v: 'umar' as const", "...(false ? [{ v: 'umar' as const", 'e2e',
  'sprijinul pe umăr lipsă din cartonașe')
o('P04', DLG, "{(p.dopInc === 'ridicat' || p.treaptaInc !== 'fara') && (<>", "{(p.dopInc === 'ridicat') && (<>", 'e2e',
  'dopul decupat cu treaptă, fără sprijin de ales')
o('P05', DLG, "if (g === 'treapta') return cutie(<>", "if (g === 'treapta-x') return cutie(<>", 'e2e', 'grupul Treapta arată câmpurile dopului')
o('P06', DLG, "<span className=\"dx-subtitlu\">{t('export.incrustatie-drept.sprijin')}</span>", '', 'e2e',
  'rândul sprijinului fără titlu')

SETURI = {}
E2E = ['test/e2e/export.cartonase.spec.ts', 'test/e2e/incrustatieDreapta.spec.ts']
