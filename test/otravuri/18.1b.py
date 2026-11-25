# Lista de otrăvuri a feliei 18.1↑b (modelul reliefului în vederea 3D, „Modelul / Tăiat”; ADR 0310 §4, §7), 25.11.2026, alese
# de autor: nucleul modelului (media pe blocuri, Z-ul dalei pe celulele ei, marginea dalei, modul și tampoanele straturilor),
# cererea `model` a workerului (dala goală a unui strat, stratul ascuns, octeții lipsă, factorul, latura dalei), cheile și
# încărcarea (dala goală în cheie, diferența, alt factor, plafonul pixelilor, baza citită doar pentru dalele schimbate),
# vederea 3D (pornirea pe model, golul din placă, vârful la față, urcarea dalelor, lipsa straturilor, „Tăiat”) și lipirea
# cotelor pe chenarul reliefului. Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


MO = 'src/relief/model.ts'
CR = 'src/jobs/calculRelief.ts'
MR = 'src/app/modelRelief.ts'
V3 = 'src/app/Vedere3D.tsx'
FO = 'src/model/forme.ts'

# ── Nucleul modelului ───────────────────────────────────────────────────────────────────────────────────────────────
o('M01', MO, '      z[bj * w + bi] = s / n;', '      z[bj * w + bi] = s / (k * k);', 'model', 'media pe blocuri împărțită la k², și pe blocurile de margine')
o('M02', MO, 'for (let a = b * LATURA_DALA, sf = a + la; a < sf; a++)', 'for (let a = b * LATURA_DALA, sf = a + LATURA_DALA; a < sf; a++)', 'model',
  'Z-ul dalei din afara grilei (celulele planului zero)')
o('M03', MO, '      for (let j = bj * k; j < Math.min(lb, bj * k + k); j++) {', '      for (let j = bj * k; j < bj * k + k; j++) {', 'model',
  'blocul de pe marginea de sus citește rânduri din afara grilei')
o('M04', MO, '    return { mod: s.mod, vizibil: true, valori: citeste(s.dala, t.straturi[n]) };',
  "    return { mod: 'aduna' as Mod, vizibil: true, valori: citeste(s.dala, t.straturi[n]) };", 'model', 'modul straturilor uitat (toate adună)')
o('M05', MO, '    return { mod: s.mod, vizibil: true, valori: citeste(s.dala, t.straturi[n]) };',
  '    return { mod: s.mod, vizibil: true, valori: citeste(s.dala, t.straturi[0]!) };', 'model', 'un singur tampon pentru toate straturile')

# ── Cererea `model` a workerului ────────────────────────────────────────────────────────────────────────────────────
o('W01', CR, '      if (e === null) continue;', "      if (e === null) { straturi.push({ mod: s.mod, dala: { fel: 'constanta', m: 0 } }); continue; }", 'model',
  'dala goală a unui strat luată drept 0 (atinge compusul)')
o('W03', CR, '      else lipsa.add(e);', '      else continue;', 'model', 'octeții lipsă săriți: dala inventată fără stratul ei')
o('W04', CR, "  if (!FACTORI_MODEL.includes(c.k)) throw new Error(`factorul modelului ${c.k} nu e o putere a lui 2 până la 256`);\n", '', 'model',
  'factorul nejudecat (un k care nu împarte dala)')
o('W05', CR, 'Math.min(LATURA_DALA, c.nx - ti * LATURA_DALA)', 'Math.min(LATURA_DALA, c.ny - ti * LATURA_DALA)', 'model', 'lățimea dalei de margine din ny')
o('W06', CR, "  for (const s of c.straturi) {\n    if (!s.vizibil) continue;\n    const h = hartaDinText(s.harta);\n    if (!h || h.nx !== c.nx || h.ny !== c.ny) return { ok: false, cod: 'harta' };\n    harti.push(",
  "  for (const s of c.straturi) {\n    const h = hartaDinText(s.harta);\n    if (!h || h.nx !== c.nx || h.ny !== c.ny) return { ok: false, cod: 'harta' };\n    harti.push(",
  'model', 'stratul ascuns intră în model')

# ── Cheile și încărcarea ────────────────────────────────────────────────────────────────────────────────────────────
o('L01', MR, '      if (e !== null) parti.push([s.mod, e]);', "      parti.push([s.mod, e ?? 'gol']);", 'model',
  'dala goală a unui strat intră în cheie (ascunderea lui urcă toate dalele)')
o('L02', MR, 'if (!vechi || vechi.length !== noi.length || vechi[t] !== noi[t]) r.push(t);', 'if (!vechi || vechi[t] !== noi[t]) r.push(t);', 'model',
  'alt număr de dale nu reface tot')
o('L03', MR, '  const tot = !vechi || vechi.k !== k || vechi.chei.length !== chei.length;', '  const tot = !vechi || vechi.chei.length !== chei.length;',
  'model', 'alt factor nu reface textura')
o('L04', MR, '    if (w <= lim && h <= lim && w * h <= PIXELI_MODEL) break;', '    if (w <= lim && h <= lim) break;', 'model', 'plafonul pixelilor uitat')
o('L05', MR, '  for (const s of straturi) for (const t of dale) { const e = s.harta.dale[t]; if (typeof e === \'string\') amprente.add(e); }',
  '  for (const s of straturi) for (const e of s.harta.dale) { if (typeof e === \'string\') amprente.add(e); }', 'model',
  'baza citită pentru toate dalele, nu doar pentru cele schimbate')

# ── Vederea 3D ──────────────────────────────────────────────────────────────────────────────────────────────────────
o('V01', V3, '      gl.stencilFunc(gl.EQUAL, 0, 0xff);', '      gl.stencilFunc(gl.ALWAYS, 0, 0xff);', 'e2e', 'fața plăcii acoperă golul reliefului')
o('V02', V3, 'dz: sus - sm.varf, baza: sus', 'dz: 0, baza: sus', 'e2e', 'planul zero la față (vârful iese deasupra plăcii)')
o('V03', V3, '  g.gl.texSubImage2D(g.gl.TEXTURE_2D, 0, x, y, d.latime, d.inaltime, g.gl.RED, g.gl.FLOAT, d.z);\n', '', 'e2e',
  'dalele nu urcă pe placa video (textura rămâne zero)')
o('V04', V3, "useState<'model' | 'taiat'>(() => (reliefuri.length > 0 ? 'model' : 'taiat'))", "useState<'model' | 'taiat'>(() => 'taiat')", 'e2e',
  'vederea pornește pe „Tăiat” și pe o foaie cu relief')
o('V05', V3, "    const stareDin = (): StareModel => ({ fel: [...ms.values()].some((m) => m.lipsa) ? 'lipsa' : 'gata' });",
  "    const stareDin = (): StareModel => ({ fel: 'gata' });", 'e2e', 'straturile lipsă nu se spun')
o('V06', V3, "    if (v === 'taiat' && sim.current.doc === null) simuleaza();\n", '', 'e2e', '„Tăiat” nu simulează placa')

# ── Cotele pe relief ────────────────────────────────────────────────────────────────────────────────────────────────
o('K01', FO, 'conturDreptunghi(0, 0, f.nx * f.celula, f.ny * f.celula, 0)', 'conturDreptunghi(0, 0, f.nx, f.ny, 0)', 'cote',
  'chenarul reliefului în celule, nu în mm')

SETURI = {
    'model': ['test/unit/relief.model.test.ts'],
    'cote': ['test/unit/cote.lipire.test.ts'],
}
E2E = ['test/e2e/relief3d.spec.ts']
