# Lista de otrăvuri a feliei 11.3↑ („Așază pe foi”, ADR 0210 §3), 08.11.2026, alese de autor: implicitele, colțurile (X și
# Y), piesele rămase (freza lor, saltul), rândurile, foaia următoare goală, piesele prea mari, rotirea (comparația, culcarea),
# ordinea, distanța sub freză, valorile, marginile fără loc, comenzile (foaia nouă ca ținta, capătul listei, înlocuirile
# doar când se schimbă ceva), registrul (selecția de după, distanța urcată la freză, aceeași foaie, toate prea mari, selecția
# golită), alegerile ținute, și legăturile din interfață (distanța de pornire, rezultatul, ținerea, meniul foii, meniul de
# clic dreapta, scrierea pe lângă garda dialogului).
# Fără otrăvuri care fac bucle fără capăt (11.2: L05 și L08 au ieșit prin termen, după 300 s).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit; e2e-ul, cu
# `CNCVS2_E2E_RETEA=127.0.5` și configul local (`.tmp/pw.config.ts`, portul worktree-ului).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


AS = 'src/model/asezare.ts'
AC = 'src/ui/actiuniDocumentCalcul.ts'
AT = 'src/app/asezareTinuta.ts'
DA = 'src/app/DialogAsezare.tsx'
AP = 'src/app/App.tsx'
ED = 'src/app/Editare.tsx'
MF = 'src/ui/MeniuFoaie.tsx'

# Modelul (unitare, pe hârtie).
o('A01', AS, "  colt: 'stanga-sus', margineX: 10, margineY: 10,", "  colt: 'stanga-sus', margineX: 5, margineY: 10,", 'asezare', 'marginea implicită pe X e 5')
o('A02', AS, '        const X = stanga ? u : f.W - u - b.w,', '        const X = stanga ? u : f.W - u,', 'asezare', 'din dreapta, piesa iese peste marginea foii')
o('A03', AS, ' Y = sus ? f.H - v - b.h : v;', ' Y = sus ? f.H - v : v;', 'asezare', 'de sus, piesa iese peste marginea foii')
o('A04', AS, 'gx: Math.max(dx, d), gy: Math.max(dy, d),', 'gx: dx, gy: dy,', 'asezare', 'freza piesei rămase nu mărește distanța de ea')
o('A05', AS, '          u = o.u1 + o.gx;', '          u = o.u1;', 'asezare', 'după piesa rămasă, fără distanță')
o('A06', AS, '          if (rand > 0) v += rand + dy;', '          if (rand > 0) v += rand;', 'asezare', 'rândurile se lipesc unul de altul')
o('A07', AS, '      if (!f || f.instante.length > 0) break;', '      if (!f) break;', 'asezare', 'și o foaie următoare cu piese primește')
o('A08', AS, '      else preaMari.push(i.id);\n', '      else void 0;\n', 'asezare', 'piesele prea mari nu se spun')
o('A09', AS, '  return k >= 0 && (a[k] ?? 0) < (b[k] ?? 0) ? cu : fara;', '  return cu;', 'asezare',
  'cu rotirea „90”, varianta rotită se ia mereu, chiar când încap mai puține')
o('A10', AS, '(b0.h > b0.w + EPS ? b90 : b0)', '(b0)', 'asezare', 'cu rotirea „90”, piesele în picioare nu se culcă')
o('A11', AS, "    if (opt.ordinea === 'mari') coada.sort(", '    if (false) coada.sort(', 'asezare', '„cele mari întâi” lasă ordinea listei')
o('A12', AS, "  if (Math.min(dx, dy) < distantaMinima(doc, ids, din) - EPS) return { ok: false, motiv: 'distanta' };\n", '', 'asezare',
  'distanța sub freză trece')
o('A13', AS, ' && x >= 0 && x <= ASEZARE_MAXIM;', ' && x >= 0;', 'asezare', 'peste 1 000 mm trece')
o('A14', AS, "  if (2 * mx >= tinta.stoc.latime || 2 * my >= tinta.stoc.inaltime) return { ok: false, motiv: 'valori' };\n", '', 'asezare',
  'marginile care nu lasă loc nu sunt refuzate (toate piesele ies „prea mari”)')
o('A15', AS, '    const foaie: Foaie = { id: idF, stoc: { ...tinta.stoc }, instante: [],',
  '    const foaie: Foaie = { id: idF, stoc: { ...tinta.stoc, latime: tinta.stoc.latime + 1 }, instante: [],', 'asezare', 'foaia nouă nu e ca ținta')
o('A16', AS, '    const pozitie = f.instante.length + (pePas.get(idF) ?? 0);\n    pePas.set(idF, (pePas.get(idF) ?? 0) + 1);\n    comenzi.push({ tip: \'adauga\', foaie: idF, instanta: { ...i, x: l.x, y: l.y, rotire: l.rotire }, pozitie });',
  '    const pozitie = 0;\n    pePas.set(idF, (pePas.get(idF) ?? 0) + 1);\n    comenzi.push({ tip: \'adauga\', foaie: idF, instanta: { ...i, x: l.x, y: l.y, rotire: l.rotire }, pozitie });',
  'asezare', 'cele mutate intră la începutul listei, nu la capăt')
o('A17', AS, '    if (i && (i.x !== l.x || i.y !== l.y || i.rotire !== l.rotire)) comenzi.push(', '    if (i) comenzi.push(', 'asezare',
  'o așezare fără nicio schimbare dă tot o comandă (nu „nimic de mutat”)')
# Registrul (unitare).
o('C01', AC, '      ctx.selecteaza(ctx.selectie().filter((id) => ramase.has(id)));\n', '', 'asezare',
  'cele plecate pe o foaie nouă rămân în selecție')
o('C02', AC, '{ ...o, distantaX: Math.max(o.distantaX, d), distantaY: Math.max(o.distantaY, d) }, tinta);',
  '{ ...o, distantaX: o.distantaX, distantaY: o.distantaY }, tinta);', 'asezare', 'meniul nu urcă distanța ținută la freză (refuz)')
o('C03', AC, '  if (tinta !== null && (tinta === din || !doc.foi.some((f) => f.id === tinta)))',
  '  if (tinta !== null && (!doc.foi.some((f) => f.id === tinta)))', 'asezare', '„Mută și așază” pe aceeași foaie trece')
o('C04', AC, "    if (p.locuri.length === 0) return { ok: false, motiv: 'motiv.aseaza-prea-mari' };\n", '', 'asezare',
  'toate prea mari: motivul greșit („nimic de mutat”)')
o('C05', AC, '      ctx.scrie(executa(ctx.istoric(), r.comanda));\n      ctx.selecteaza([]);\n    },\n  },\n  // „Duplică foaia cu aceleași piese”',
  '      ctx.scrie(executa(ctx.istoric(), r.comanda));\n    },\n  },\n  // „Duplică foaia cu aceleași piese”', 'asezare',
  'după „Mută și așază”, selecția rămâne (ale altei foi)')
# Alegerile ținute (unitare).
o('T01', AT, '    return COLTURI_ASEZARE.includes(curat.colt) && optiuniValide(curat) ? curat : ASEZARE_IMPLICITA;', '    return curat;', 'asezare',
  'alegerile ținute nevalide trec')
o('T02', AT, '    const curat: OptiuniAsezare = {\n      colt: o.colt, margineX: o.margineX, margineY: o.margineY, distantaX: o.distantaX, distantaY: o.distantaY,\n      ordinea: o.ordinea, rotirea: o.rotirea,\n    };',
  '    const curat = o as OptiuniAsezare;', 'asezare', 'un câmp străin ținut ajunge în alegeri')
# Interfața (e2e).
o('E01', DA, '    return { ...o, distantaX: Math.max(o.distantaX, d), distantaY: Math.max(o.distantaY, d) };', '    return o;', 'e2e',
  'dialogul pornește cu distanța sub freză (5)')
o('E02', DA, "pe.length > 1 ? t('aseaza.rezultat.detaliat'", "false ? t('aseaza.rezultat.detaliat'", 'e2e', 'rezultatul nu spune câte pe fiecare foaie')
o('E03', DA, '    tineOptiunile(optiuni);\n', '', 'e2e', 'alegerile nu se țin minte')
o('E04', AP, '      setDialogAsezare(true);\n    },\n    // Un rând tras pe altă foaie', '    },\n    // Un rând tras pe altă foaie', 'e2e',
  '„Așază pe foi…” din meniul foii nu deschide nimic')
o('E05', ED, "      ...(p.onAseaza ? [{ id: 'aseaza'", "      ...(false ? [{ id: 'aseaza'", 'e2e', 'meniul de clic dreapta n-are „Așază pe foi…”')
o('E06', ED, '        activ: selectie.length > 0 && poate, ruleaza: () => { mutaSiAseaza(f.id); },',
  '        activ: selectie.length > 0 && poate, ruleaza: () => { mutaPe(f.id); },', 'e2e', '„Mută și așază la capăt” doar mută, fără așezare')
o('E07', AP, "          aseaza={(c) => ruleaza(registru, 'foaie.aseaza', context({ asezare: () => c }))}",
  "          aseaza={(c) => ruleazaDocument('foaie.aseaza', context({ asezare: () => c }))}", 'e2e',
  'Așază trece prin garda „dialog deschis”: refuzat de propriul dialog')
o('E08', MF, '          <button type="button" role="menuitem" data-meniu-foaie-articol="aseaza"', '          <button type="button" role="menuitem" data-meniu-foaie-articol="aseaza-nu"', 'e2e',
  'meniul foii n-are „Așază pe foi…”')

SETURI = {
    'asezare': ['test/unit/asezare.test.ts', 'test/unit/asezare.actiuni.test.ts'],
}
E2E = ['test/e2e/asezare.spec.ts']
