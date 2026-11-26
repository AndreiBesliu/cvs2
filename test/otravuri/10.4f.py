# Lista de otrăvuri a feliei 10.4↑f (Măsoară între foi; ADR 0330, întrebarea 13a), 26.11.2026, alese de autor: sursele foilor
# vecine (care foi, mutarea pe X, foaia purtată de punct, punctele foii, cutiile, conturul), prinse de unitare, apoi unealta
# (doar la Măsoară, doar cu „Toate foile pe pânză”, nota în locul lui „Păstrează”, Enter care nu păstrează), prinse de e2e.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


P = 'src/model/puncteCote.ts'
U = 'src/app/Cote.tsx'

# Sursele foilor vecine.
o('F01', P, "    if (k === indexFoaie) return [];\n    const dx", "    const dx", 'foi', 'foaia activă printre vecine')
o('F02', P, "    const dx = (locuri[k] ?? 0) - x0, m = translatie(dx, 0);", "    const dx = x0 - (locuri[k] ?? 0), m = translatie(dx, 0);", 'foi',
  'foaia vecină de partea cealaltă')
o('F03', P, "({ p: { x: t.p.x + dx, y: t.p.y }, fel: t.fel, date })", "({ p: { x: t.p.x, y: t.p.y }, fel: t.fel, date })", 'foi',
  'punctele nemutate')
o('F04', P, "({ p: { x: t.p.x + dx, y: t.p.y }, fel: t.fel, date })", "({ p: { x: t.p.x + dx, y: t.p.y }, fel: t.fel, date: null })", 'foi',
  'punctul nu-și poartă foaia')
o('F05', P, "    return [foaie, ...elemente];", "    return elemente;", 'foi', 'fără punctele foii vecine')
o('F06', P, "        cutie: { minX: b.minX + dx, minY: b.minY, maxX: b.maxX + dx, maxY: b.maxY },", "        cutie: b,", 'foi',
  'cutia elementului nemutată')
o('F07', P, "contur: () => (contur ??= transformaContur(cs(), m))", "contur: () => (contur ??= cs())", 'foi', 'conturul nemutat')
o('F08', P, "      cutie: { minX: dx, minY: 0, maxX: dx + f.stoc.latime, maxY: f.stoc.inaltime },",
  "      cutie: { minX: dx, minY: 0, maxX: dx + f.stoc.inaltime, maxY: f.stoc.inaltime },", 'foi', 'cutia foii prea îngustă')
o('F09', P, "      puncte: () => puncteFoaie(f.stoc.latime, f.stoc.inaltime).map(muta),", "      puncte: () => puncteFoaie(300, 200).map(muta),", 'foi',
  'punctele foii vecine cu mărimea foii implicite')
# Unealta (e2e).
o('E01', U, "lipestePunct(s.fel === 'masoara' ? s.surseMasura : s.surse, s.fixe, w, o)", "lipestePunct(s.surse, s.fixe, w, o)", 'e2e',
  'Măsoară fără foile vecine')
o('E02', U, "    const v = unealta && fel === 'masoara' && toateFoile ? surseFoiVecine(doc, indexFoaie) : [];",
  "    const v = unealta && fel === 'masoara' && false ? surseFoiVecine(doc, indexFoaie) : [];", 'e2e', 'foile vecine niciodată')
o('E03', U, "      if (d && !('instanta' in d)) return { c: { p: r.p, legatura: null, foaie: d.foaie }, t: r };",
  "      if (d && !('instanta' in d)) return { c: { p: r.p, legatura: null }, t: r };", 'e2e', 'capătul nu ține minte foaia')
o('E04', U, "        if (a.foaie !== undefined || b.foaie !== undefined) {\n          setMotiv(t('editare.cote.masura.alta-foaie'));",
  "        if (false) {\n          setMotiv(t('editare.cote.masura.alta-foaie'));", 'e2e', 'Enter păstrează măsura între foi')
o('E05', U, "          {masura?.b && (masura.a.foaie !== undefined || masura.b.foaie !== undefined) ? (",
  "          {masura?.b && false ? (", 'e2e', '„Păstrează” și între foi')
o('E06', U, "          {masura?.b && (masura.a.foaie !== undefined || masura.b.foaie !== undefined) ? (",
  "          {masura?.b && (masura.a.foaie !== undefined) ? (", 'e2e', 'doar primul capăt judecat')
o('E07', U, "        if (a.foaie !== undefined || b.foaie !== undefined) {\n          setMotiv(",
  "        if (a.foaie !== undefined) {\n          setMotiv(", 'e2e', 'Enter: doar primul capăt judecat')

SETURI = {
    'foi': ['test/unit/cote.foi.test.ts'],
}
E2E = ['test/e2e/cote.foi.spec.ts']
