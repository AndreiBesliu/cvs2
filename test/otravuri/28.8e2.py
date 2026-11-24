# Lista de otrăvuri a feliei 28.8↑e-2 (desenele incrustației cu pereți drepți: locașul, treapta, dopul așezat; ADR 0290),
# 24.11.2026, alese de autor: formula dopului desenat (tija și flanșa după sprijin, dopul pe față, semifabricatul, umărul
# bun) față de valoriIncrustatieDreapta, apoi desenele din fereastră: locașul ales, jocul lateral, treapta aleasă și nivelul
# desenului, sprijinul, semifabricatul, jocul, înălțimile scrise.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă a ramurii, după commit; cele „e2e” cer build-ul.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


CAL = 'src/ui/exportDeseneCalcul.ts'
DES = 'src/ui/exportDesene.tsx'
DLG = 'src/ui/DialogExport.tsx'

# Formula dopului, față de valorile pe hârtie (proba unitară).
o('F01', CAL, ": [D - d - g, d + H];", ": [D - d, d + H];", 'desene', 'pe umăr, tija fără jocul de sub ea')
o('F02', CAL, "i.sprijin === 'fund' ? [D - d + g, d - g + H]", "i.sprijin === 'fund' ? [D - d - g, d + H]", 'desene',
  'pe fund, tija și flanșa socotite ca pe umăr')
o('F03', CAL, "i.gaura ? [D - d, d + H]", "i.gaura ? [D - d - g, d + H]", 'desene', 'la gaură, tija scurtată cu jocul')
o('F04', CAL, "D - (i.gaura ? 0 : g) : D + H;", "D - g : D + H;", 'desene', 'pe față, la gaură, dopul scurtat cu jocul')
o('F05', CAL, "inaltime = i.dop === 'ridicat' && i.sprijin === 'fata' ?", "inaltime = i.sprijin === 'fata' ?", 'desene',
  'dopul decupat, pe față, ca cel ridicat')
o('F06', CAL, "grosime: i.dop === 'decupat' ? inaltime : inaltime + SUB_FATA_DOPULUI", "grosime: inaltime + SUB_FATA_DOPULUI", 'desene',
  'placa dopului decupat cu un milimetru în plus')
o('F07', CAL, "if (!pozitiv(d) || d >= D || !pozitiv(i.treapta.s)) return null;", "if (!pozitiv(d) || d > D || !pozitiv(i.treapta.s)) return null;",
  'desene', 'umărul cât adâncimea, desenat')

# Desenele din fereastră (e2e).
o('E01', DLG, "                  case 'locas': return (c) => <DesenLocasDrept", "                  case 'locas-x': return (c) => <DesenLocasDrept",
  'e2e', 'grupul locașului fără desen')
o('E02', DLG, "gaura={p.locasInc === 'gaura'} lateral=", "gaura={false} lateral=", 'e2e', 'locașul prin foaie desenat cu fund')
o('E03', DLG, "treapta={p.treaptaInc}\n                    d={citesteNumar(p.adancimeTreapta)} s={citesteNumar(p.latimeTreapta)} />;",
  "treapta=\"interior\"\n                    d={citesteNumar(p.adancimeTreapta)} s={citesteNumar(p.latimeTreapta)} />;", 'e2e',
  'treapta desenată mereu spre interior')
o('E04', DLG, "dop={p.dopInc} sprijin={p.sprijinInc}", "dop={p.dopInc} sprijin=\"umar\"", 'e2e', 'dopul desenat mereu pe umăr')
o('E05', DES, "const desenY = tr === 'exterior' ? L.yd : ys,", "const desenY = ys,", 'e2e', 'la exterior, desenul tras pe față, nu pe umăr')
o('E06', DES, '<path className="ua" data-sprijin={sprijin} d={contact} />', '<path className="ua" data-sprijin="fund" d={contact} />', 'e2e',
  'sprijinul marcat mereu pe fund')
o('E07', DES, "{dop === 'ridicat' && <rect className=\"l2\" data-semifabricat", "{dop !== 'nimic' && <rect className=\"l2\" data-semifabricat",
  'e2e', 'semifabricatul desenat și deasupra dopului decupat')
o('E08', DES, "{gol && gol[1] - gol[0] > 0.5 && <Cota pentru=\"inc-joc\"", "{gol && false && <Cota pentru=\"inc-joc\"", 'e2e',
  'jocul de sub dop nescris')
o('E09', DES, "t: c.f(v.treapta.tija), f: c.f(v.treapta.flansa)", "t: c.f(v.treapta.flansa), f: c.f(v.treapta.tija)", 'e2e',
  'tija și flanșa schimbate între ele')
o('E10', DES, "'export.desen.dop.placa', { g: c.f(v.grosime) })", "'export.desen.dop.placa', { g: c.f(v.inaltime) })", 'e2e',
  'semifabricatul scris cât dopul')
o('E11', DES, "{cp > 0 && <Cota pentru=\"inc-lateral\"", "{cp < 0 && <Cota pentru=\"inc-lateral\"", 'e2e', 'jocul lateral nescris')
o('E12', DES, "(d !== null && d > 0 && d < D && lat !== null && lat > 0)", "(d !== null && d > 0 && d <= D && lat !== null && lat > 0)",
  'e2e', 'treapta cât adâncimea, desenată')

SETURI = {
    'desene': ['test/unit/export.desene.test.ts'],
}
E2E = ['test/e2e/export.desene.spec.ts']
