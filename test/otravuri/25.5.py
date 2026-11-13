# Lista de otrăvuri a feliei 25.5↑ (foaia pozată oblic, ADR 0225), 13.11.2026, alese de autor: geometria colțurilor
# (omografia, colțurile bune și implicite), găsirea foii (transparența, pragurile: aria, marginea, plinătatea; Visvalingam,
# ordinea, colțul ieșit din cadru, rafinarea: trecerea, normalele tăiate de cadru, a doua potrivire, plasa), proporțiile
# (focala, centrul optic, intervalul, nesiguranța, potrivirea cu formatul, orientarea), oblicitatea, îndreptarea (mărimea,
# jumătatea de pixel, plafonul, alfa), calculul (colțurile date, formatul orientat, scara, foaia folosită, sugestia,
# potrivirea, reducerea previzualizării), ușa (formatele, cererea, raportul) și fereastra prin e2e (grupul, bifa, formatul,
# butoanele, mânerele, ciorna convexă, sugestia și avertismentele, „Alt format”, foaia sub vectori, desenul colțurilor).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), din worktree-ul feliei (în afara Drive-ului), după commit, cu
# CNCVS2_E2E_RETEA=127.0.6 și configul local pe portul 4179.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


CO = 'src/trasare/colturi.ts'
FO = 'src/trasare/foaia.ts'
CT = 'src/jobs/calculTrasare.ts'
IM = 'src/io/imagine.ts'
CA = 'src/ui/actiuniImportCalcul.ts'
FE = 'src/ui/FereastraTrasare.tsx'

# ---- Geometria colțurilor ----
o('K01', CO, '    if (Math.abs(pivot) < 1e-12 * mare * mare) return null;\n', '', 'nuc', 'fără pivotul minim: trei puncte coliniare dau o omografie')
o('K02', CO, '  const w = (H[6] ?? 0) * x + (H[7] ?? 0) * y + (H[8] ?? 1);', '  const w = (H[6] ?? 0) * x + (H[6] ?? 0) * y + (H[8] ?? 1);', 'nuc',
  'numitorul omografiei greșit')
o('K03', CO, '  return aria(c) >= 1;', '  return true;', 'nuc', 'colțuri minuscule (sub 1 px²) primite')
o('K04', CO, '    if (!a || !b || !e || ![...a, ...b].every(Number.isFinite) || cr(a, b, e) <= 0) return false;',
  '    if (!a || !b || !e || ![...a, ...b].every(Number.isFinite)) return false;', 'nuc', 'colțuri încrucișate sau în sens invers primite')
o('K05', CO, 'const INAUNTRU = 0.04;', 'const INAUNTRU = 0;', 'nuc', 'colțurile implicite chiar pe colțurile pozei')

# ---- Găsirea foii ----
o('G01', FO, '  if (transparenti >= 0.01 * w * h * s * s) return null;\n', '', 'nuc', 'se caută și pe transparență')
o('G02', FO, 'const ARIE_MINIMA = 0.05;', 'const ARIE_MINIMA = 0.001;', 'nuc', 'o pată mică e o foaie')
o('G03', FO, 'const PE_MARGINE = 0.1;', 'const PE_MARGINE = 0.5;', 'nuc', 'o foaie tăiată mult de cadru e găsită')
o('G04', FO, 'const PLINATATE = 0.95;', 'const PLINATATE = 0.5;', 'nuc', 'un logo rotund e o foaie')
o('G05', FO, '  while (inv.length > 40) {', '  while (inv.length > 4) {', 'nuc', 'Visvalingam până la patru vârfuri: colțul rotunjit se pierde')
o('G06', FO, '(s[i]?.[0] ?? 0) + (s[i]?.[1] ?? 0) < (s[i0]?.[0] ?? 0) + (s[i0]?.[1] ?? 0)) i0 = i;',
  '(s[i]?.[0] ?? 0) + (s[i]?.[1] ?? 0) > (s[i0]?.[0] ?? 0) + (s[i0]?.[1] ?? 0)) i0 = i;', 'nuc', 'ordinea colțurilor pornește din dreapta-jos')
o('G07', FO, '  const toata = colturiIesite(redus([...inv]), w, h);', '  const toata = redus([...inv]);', 'nuc',
  'colțul ieșit din cadru nu se extrapolează')
o('G08', FO, '      for (let j = 1; j < k && drept; j++) drept = Math.abs(cr(a, c, v(i + j * pas))) / L <= 1.5;',
  '      for (let j = 1; j < k && drept; j++) drept = false;', 'nuc', 'reperul laturii vecine e vârful de alături: direcția e zgomot')
o('G09', FO, '    if (!(t > 1 && u < 0) || (x[0] >= 0 && x[1] >= 0 && x[0] <= w && x[1] <= h)) continue;',
  '    if (!(t > 1 && u < 0)) continue;', 'nuc', 'și o intersecție din imagine înlocuiește latura de pe margine')
o('G10', FO, '      return t > 0.15 && t < 0.85 && dn < 3 && p[0] > 1 && p[1] > 1 && p[0] < w - 1 && p[1] < h - 1;',
  '      return t > 0.15 && t < 0.85 && dn < 3;', 'nuc', 'pixelii de pe marginea pozei intră în dreapta laturii')
o('G11', FO, '  return rafineaza(img, mare, s);', '  return mare;', 'nuc', 'fără rafinare: colțurile grosiere')
o('G12', FO, '          const q = (j + (u === 0 ? 0 : u / (u - v))) * pas - R;', '          const q = (j + (u === 0 ? 0 : u / (u - v))) * pas - R + 0.5;', 'nuc',
  'trecerea de 50 % mutată cu o jumătate de pixel spre masă')
o('G13', FO, '      if (!inImagine(px - nx * R, py - ny * R) || !inImagine(px + nx * R, py + ny * R)) continue;\n', '', 'nuc',
  'normalele tăiate de cadru se iau')
o('G14', FO, '      if (Math.abs(inauntru - afara) < 0.1) continue;', '      if (Math.abs(inauntru - afara) < 0.9) continue;', 'nuc',
  'nicio normală destul de contrastată: rămâne dreapta grosieră')
o('G15', FO, '      if (aproape.length >= 8) dr = dreaptaPrin(aproape);', '      void aproape;', 'nuc', 'fără a doua potrivire: agrafa strică latura')
o('G16', FO, '> 3 * s + 2 + 0.05 * iese(c[i] ?? p))) return c;', '> 0)) return c;', 'nuc', 'plasa întoarce mereu colțurile grosiere')

# ---- Proporțiile, oblicitatea ----
o('P01', FO, '    focala: f >= 0.3 * D && f <= 3 * D ? f : null,', '    focala: null,', 'nuc', 'focala niciodată găsită')
o('P02', FO, '  const n2z = n2[2] ?? 0, n3z = n3[2] ?? 0, u0 = W / 2, v0 = H / 2;', '  const n2z = n2[2] ?? 0, n3z = n3[2] ?? 0, u0 = 0, v0 = 0;', 'nuc',
  'centrul optic în colțul pozei')
o('P03', FO, '  const d = Math.max(1, D / 2000);', '  const d = 0;', 'nuc', 'intervalul fără colțurile mișcate')
o('P04', FO, 'nesigure: max / min - 1 > PROPORTII_NESIGURE };', 'nesigure: false };', 'nuc', 'proporțiile niciodată nesigure')
o('P05', FO, '[0.5 * D, 0.85 * D, 1.5 * D];', '[0.85 * D];', 'nuc', 'cu focala nedeterminată, intervalul nu cuprinde focalele de telefon')
o('P06', FO, '  return r >= p.min / 1.03 && r <= p.max * 1.03;', '  return r >= p.min / 1.2 && r <= p.max * 1.2;', 'nuc', 'potrivirea cu formatul prea largă')
o('P07', FO, '  return (raportPoza > 1) === (f.w > f.h) || f.w === f.h ?', '  return (raportPoza > 1) !== (f.w > f.h) || f.w === f.h ?', 'nuc',
  'orientarea formatului întoarsă')
o('P08', FO, 'const OBLIC = 2;', 'const OBLIC = 0.5;', 'nuc', 'un dreptunghi rotit cu 1° pare oblic')
o('P09', FO, '    if (Math.abs(unghi - 90) > OBLIC || Math.min(axa, 90 - axa) > OBLIC) return true;',
  '    if (Math.abs(unghi - 90) > OBLIC) return true;', 'nuc', 'o foaie dreaptă rotită nu pare oblică')

# ---- Îndreptarea ----
o('I01', FO, '  if (w / h > raport) h = w / raport; else w = h * raport;', '  if (w / h > raport) w = h * raport; else h = w / raport;', 'nuc',
  'ieșirea micșorată până la raport, nu crescută')
o('I02', FO, '      let u = (m0 * xx + bx) * iw - 0.5, v = (m3 * xx + by) * iw - 0.5;', '      let u = (m0 * xx + bx) * iw, v = (m3 * xx + by) * iw;', 'nuc',
  'jumătatea de pixel uitată')
o('I03', FO, '  if (Wo * Ho > maxPixeli) {', '  if (false) {', 'nuc', 'fără plafonul de pixeli')
o('I04', FO, '      o[q + 3] = a * (d[i + 3] ?? 0) + b * (d[i + 7] ?? 0) + e * (d[j + 3] ?? 0) + f * (d[j + 7] ?? 0);', '      o[q + 3] = 255;', 'nuc',
  'alfa nu se îndreaptă')

# ---- Calculul ----
o('J01', CT, '  const date = cerere.colturi && colturiBune(cerere.colturi) ? cerere.colturi : null;', '  const date = cerere.colturi;', 'usa',
  'colțurile date încrucișate se folosesc')
o('J02', CT, '  const format = cerere.format ? formatOrientat(cerere.format, proportii.raport) : null;', '  const format = cerere.format;', 'usa',
  'formatul nu se întoarce după poză')
o('J03', CT, 'foaie.format.w / img.latime : null;', 'foaie.format.h / img.latime : null;', 'usa', 'scara din înălțimea formatului')
o('J04', CT, "mmFoaie !== null ? 'foaie' :", "mmFoaie !== null ? 'fisier' :", 'usa', 'scara foii raportată din fișier')
o('J05', CT, '  img = f.img;\n', '', 'usa', 'foaia îndreptată nu se trasează')
o('J06', CT, 'sugestie: pareOblica(c), previzualizare: null,', 'sugestie: false, previzualizare: null,', 'usa', 'sugestia nu apare')
o('J07', CT, 'potrivit: format ? potrivesteFormatul(proportii, format) : null,', 'potrivit: format ? true : null,', 'usa',
  'formatul se potrivește mereu')
o('J08', CT, '  const k = Math.ceil(Math.sqrt((W * H) / max)),', '  const k = Math.floor(Math.sqrt((W * H) / max)),', 'usa',
  'previzualizarea rămâne peste plafon')

# ---- Ușa ----
o('U01', IM, '  if (a.format === \'alt\') return a.alt.w > 0 && a.alt.h > 0 && Number.isFinite(a.alt.w + a.alt.h) ?',
  '  if (a.format === \'alt\') return true ?', 'usa', '„Alt format” fără mărime trimis')
o('U02', IM, 'letter: { w: 215.9, h: 279.4 },', 'letter: { w: 216, h: 279 },', 'usa', 'Letter rotunjit')
o('U03', IM, '(v.w === f.w && v.h === f.h) || (v.w === f.h && v.h === f.w)', 'v.w === f.w && v.h === f.h', 'usa', 'numele formatului doar în picioare')
o('U04', CA, '    ...(a.foaie.indreapta ? { foaie: { colturi: a.foaie.colturi, format: formatFoaie(a.foaie) } } : {}),',
  '    foaie: { colturi: a.foaie.colturi, format: formatFoaie(a.foaie) },', 'usa', 'foaia trimisă și cu îndreptarea oprită')
o('U05', CA, 'dpi: r.dpi, foaie: r.foaie,', 'dpi: r.dpi, foaie: null,', 'usa', 'raportul imaginii fără foaie')

# ---- Fereastra (e2e) ----
o('E01', FE, '        {raport && !raport.transparenta && (', '        {raport && (', 'e2e', 'grupul Foaia și pe transparență')
o('E02', FE, '                onSchimba({ foaie: { ...alegeri.foaie, indreapta: e.target.checked }, zona: null });',
  '                onSchimba({ zona: null });', 'e2e', 'bifa „Îndreaptă foaia” nu se trimite')
o('E03', FE, '                  onSchimba({ foaie: { ...alegeri.foaie, format }, zona: null });', '                  onSchimba({ zona: null });', 'e2e',
  'formatul ales nu se trimite')
o('E04', FE, '          {indreptata && (\n            <span className="trasare-zoom">', '          {false && (\n            <span className="trasare-zoom">', 'e2e',
  'butoanele Colțurile și „Găsește singur” lipsesc')
o('E05', FE, '              let i = -1, d = 12 / s;', '              let i = -1, d = 0;', 'e2e', 'mânerele nu se apucă')
o('E06', FE, '              if (c) onSchimba({ foaie: { ...alegeri.foaie, colturi: c }, zona: null });', '              if (c) setColturiCiorna(null);', 'e2e',
  'colțurile trase nu se trimit')
o('E07', FE, '              if (colturiBune(n)) { ciornaColturi.current = n; setColturiCiorna(n); }',
  '              { ciornaColturi.current = n; setColturiCiorna(n); }', 'e2e', 'ciorna colțurilor poate fi încrucișată')
o('E08', FE, '                onClick={() => { onSchimba({ foaie: { ...alegeri.foaie, colturi: null }, zona: null }); }}>',
  '                onClick={() => undefined}>', 'e2e', '„Găsește singur” nu face nimic')
o('E09', FE, '                if (modColturi) { setModColturi(false); setVizor({ k: 1, cx: null, cy: null }); }\n', '', 'e2e',
  'Zona nu scoate Colțurile')
o('E10', FE, '              {foaie && !foaie.indreptata && foaie.sugestie && <p', '              {foaie && !foaie.indreptata && false && <p', 'e2e',
  'sugestia foii nu apare')
o('E11', FE, "              {foaie?.indreptata && foaie.sursa === 'implicite' && <p", '              {false && <p', 'e2e', 'foaia negăsită nu se spune')
o('E12', FE, '              {foaie?.indreptata && foaie.sursa !== \'implicite\' && foaie.potrivit === false && foaie.format && (',
  '              {false && foaie?.format && (', 'e2e', 'proporțiile nepotrivite nu se spun')
o('E13', FE, '              {foaie?.indreptata && !foaie.format && foaie.proportii.nesigure && (', '              {false && foaie && (', 'e2e',
  'proporțiile nesigure nu se spun')
o('E14', FE, '        s.foaie = { ...a.foaie, alt: { w: altL, h: altI } };\n', '', 'e2e', 'lățimea și înălțimea „Altui format” nu se trimit')
o('E15', FE, '  const baza = indreptata && !peColturi ? foaieImg : bmp;', '  const baza = bmp;', 'e2e', 'sub vectori, poza în locul foii îndreptate')
o('E16', FE, '    if (peColturi) {\n      // Colțurile (ADR 0225): poza', '    if (false) {\n      // Colțurile (ADR 0225): poza', 'e2e',
  'cu Colțurile, mânerele nu se desenează')
o('E17', FE, '    const k = Math.max(peColturi ? 0.5 : 1, Math.min(64, vizor.k * f)), ns = incadrare * k;',
  '    const k = Math.max(1, Math.min(64, vizor.k * f)), ns = incadrare * k;', 'e2e', 'cu Colțurile, vederea nu se micșorează sub încadrare')

SETURI = {
    'nuc': ['test/unit/trasare.foaia.test.ts'],
    'usa': ['test/unit/import.imagine.test.ts'],
}
E2E = ['test/e2e/trasare-foaie.spec.ts']
