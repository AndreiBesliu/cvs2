# Lista de otrăvuri a feliei 10.4↑d-2 („Fă desen din cotă”; ADR 0330 §8), 26.11.2026, alese de autor: desenul cotei ca forme
# (extensiile, capetele, cifrele, punctul, bara), comanda (piesa fără operații, locul ei, cota scoasă, grupul, refuzul) și
# programul, prinse de unitare, apoi panoul, unealta și editorul (prinse de e2e).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


X = 'src/io/coteExport.ts'
A = 'src/ui/actiuniDocumentCalcul.ts'
U = 'src/app/Cote.tsx'
P = 'src/app/PanouCota.tsx'
E = 'src/app/Editare.tsx'

# Desenul cotei, pur.
o('G01', X, "  const contururi: Contur[] = [...dc.extensii.map(([a, b]) => linie(a, b)), ...dc.bucati.map(([a, b]) => linie(a, b)), ...dc.arce.map(arcContur)];",
  "  const contururi: Contur[] = [...dc.bucati.map(([a, b]) => linie(a, b)), ...dc.arce.map(arcContur)];", 'fadesen', 'fără liniile de extensie')
o('G02', X, "    else if (k.fel === 'punct') contururi.push(cercContur(k.centru, k.raza));",
  "    else if (k.fel === 'punct') contururi.push(cercContur(k.centru, k.raza / 2));", 'fadesen', 'punctul cât jumătate')
o('G03', X, "    else contururi.push({ inchis: true, varfuri: k.puncte.map((q) => ({ p: q, s: LINIE })) });",
  "    else contururi.push({ inchis: false, varfuri: k.puncte.map((q) => ({ p: q, s: LINIE })) });", 'fadesen', 'săgeata deschisă la capăt')
o('G04', X, "      for (const k of t.contururi) contururi.push(mutaContur(k, f));", "      for (const k of t.contururi) contururi.push(k);", 'fadesen',
  'cifrele în originea foii, nu pe linie')
o('G05', X, "      for (const x of text) if (x.trim() && !lipsa.includes(x)) lipsa.push(x);", "      for (const x of text) if (x.trim()) lipsa.push(x);",
  'fadesen', 'semnele lipsă repetate')
o('G06', X, "    if (k.fel === 'bara') contururi.push(linie(k.bucata[0], k.bucata[1]));",
  "    if (k.fel === 'bara') contururi.push({ ...linie(k.bucata[0], k.bucata[1]), inchis: true });", 'fadesen', 'bara oblică închisă')
# Comanda și programul.
o('K01', A, "    piesa: { piesa: { id, radacina, operatii: [] }, pozitie: doc.piese.length },",
  "    piesa: { piesa: { id, radacina, operatii: [{ id: 'o', tip: 'profil', noduri: [], latura: 'pe-linie' } as never] }, pozitie: doc.piese.length },",
  'fadesen', 'desenul vine cu o tăiere')
o('K02', A, "    tip: 'adauga', foaie: foaie.id, instanta: { id, piesa: id, x: 0, y: 0, rotire: 0 }, pozitie: foaie.instante.length,\n    piesa: { piesa: { id, radacina, operatii: [] }",
  "    tip: 'adauga', foaie: foaie.id, instanta: { id, piesa: id, x: 10, y: 0, rotire: 0 }, pozitie: foaie.instante.length,\n    piesa: { piesa: { id, radacina, operatii: [] }",
  'fadesen', 'desenul mutat lângă cotă')
o('K03', A, "  if (cote) comenzi.push({ tip: 'inlocuieste-cote'", "  if (false && cote) comenzi.push({ tip: 'inlocuieste-cote'", 'fadesen',
  '„Șterge cota” ignorată')
o('K04', A, "copii: forme.map((forma, j) => ({ tip: 'element' as const, id: `e${j + 1}`",
  "copii: forme.slice(1).map((forma, j) => ({ tip: 'element' as const, id: `e${j + 1}`", 'fadesen', 'prima formă pierdută')
o('K05', A, "  if (forme.length === 0) return { ok: false, motiv: 'motiv.nimic-ales' };\n  const varfuri = forme.reduce(", "  const varfuri = forme.reduce(",
  'fadesen', 'nicio formă primită ca desen')
# Panoul, unealta, editorul (e2e).
o('E01', P, "void cota.actiuni.desen(stergeCota)", "void cota.actiuni.desen(!stergeCota)", 'e2e', 'bifa „Șterge cota” pe dos')
o('E02', U, "          const r = s.onDesen(forme, sterge ? s.cote.filter((c) => c.id !== id) : null);", "          const r = s.onDesen(forme, null);", 'e2e',
  'cota rămâne cu bifa pusă')
o('E03', U, "          if (r.ok) s.onUnealta('selectie');\n", "", 'e2e', 'unealta rămâne Cote, fără panoul piesei')
o('E04', A, "      ctx.scrie(executa(h, r.comanda));\n      ctx.selecteaza([r.id]);\n    },\n  },\n  // Imaginile foii",
  "      ctx.scrie(executa(h, r.comanda));\n    },\n  },\n  // Imaginile foii", 'e2e', 'desenul nu e ales')
o('E05', E, "onDesen={(forme, cote) => ruleaza('foaie.desen-din-cota', { desenCota: () => ({ forme, cote }) })}",
  "onDesen={(forme, cote) => ruleaza('foaie.desen-din-cota', { desenCota: () => ({ forme: forme.slice(0, 0), cote }) })}", 'e2e',
  'editorul trimite un desen gol')

SETURI = {
    'fadesen': ['test/unit/cote.fadesen.test.ts'],
}
E2E = ['test/e2e/cote.fadesen.spec.ts']
