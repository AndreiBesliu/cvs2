# Lista de otrăvuri a feliei 25.6↑ (imaginile TIFF, ADR 0229), 17.11.2026, alese de autor: decodorul CCITT (completările,
# cele extinse, modurile 2D, căutarea lui b1, trecerea, bitul 2D al lui T.4, alinierea rândurilor MH, EOL-ul, santinelele),
# cititorul TIFF (LZW cu schimbarea timpurie și KwKwK, PackBits, predictorul, ordinea octeților pe 16 biți, interpretările,
# paleta, alfa asociat, CMYK, FillOrder, ordinea planară, plăcile, reducerea, orientarea, paginile și miniaturile, DPI-ul,
# refuzul JPEG, biții sub 8), calculul și ușa (DPI-ul paginii, pagina aleasă, refuzurile, raportul), fereastra (paginile,
# textul refuzului, pagina transmisă). Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


CC = 'src/trasare/ccitt.ts'
TI = 'src/trasare/tiff.ts'
CT = 'src/jobs/calculTrasare.ts'
CA = 'src/ui/actiuniImportCalcul.ts'
IM = 'src/io/imagine.ts'
DI = 'src/ui/DialogImport.tsx'

o('C01', CC, '    if (n < 64) return total;', '    return total;', 'nuc', 'codurile de completare citite ca terminale')
o('C02', CC, "  EXTINSE.split(' ').forEach((c, k) => { pune(c, 1792 + 64 * k); });",
  "  EXTINSE.split(' ').forEach((c, k) => { pune(c, 1728 + 64 * k); });", 'nuc', 'completările extinse, cu 64 mai scurte')
o('C03', CC, '          const a1 = b1 + mod;', '          const a1 = b1 - mod;', 'nuc', 'verticalele, în sens opus')
o('C04', CC, "        while ((ref[i] ?? W) <= a0 || (i & 1) !== c) i++;", "        while ((ref[i] ?? W) <= a0 || (i & 1) === c) i++;", 'nuc',
  'b1 cu culoarea greșită')
o('C05', CC, '          a0 = b2;', '          a0 = b1;', 'nuc', 'trecerea (P) se oprește la b1')
o('C06', CC, '      if (o.doiD === true) { doiD = b.vezi(1) === 0; b.sari(1); }', '      if (o.doiD === true) { b.sari(1); }', 'nuc',
  'T.4 2D: bitul de după EOL sărit, rândurile 2D citite ca 1D')
o('C07', CC, "    if (o.fel === 'mh') b.aliniaza();\n", '', 'nuc', 'MH: rândurile nealiniate pe octeți')
o('C08', CC, '      b.eol();\n', '', 'nuc', 'T.4: EOL-ul citit ca un cod')
o('C09', CC, '          const a1 = Math.min(W, s + trecere(b, c ? neg : alb)), a2 = Math.min(W, a1 + trecere(b, c ? alb : neg));',
  '          const a1 = Math.min(W, s + trecere(b, c ? neg : alb)), a2 = Math.min(W, a1 + trecere(b, c ? neg : alb));', 'nuc',
  'H: a doua trecere cu tabela aceleiași culori')
o('C10', CC, '    ref[n] = W; ref[n + 1] = W; ref[n + 2] = W;', '    ref[n] = W; ref[n + 1] = W;', 'nuc',
  'fără a treia santinelă: b2 vechi, de pe un rând mai lung')
o('T01', TI, '    if (urm >= (1 << latime) - 1 && latime < 12) latime++;', '    if (urm >= 1 << latime && latime < 12) latime++;', 'nuc',
  'LZW fără schimbarea timpurie a lățimii')
o('T02', TI, '        sufix[urm] = cod < urm ? prim[cod] ?? 0 : prim[prec] ?? 0;', '        sufix[urm] = prim[cod] ?? 0;', 'nuc',
  'LZW: cazul KwKwK (codul abia adăugat)')
o('T03', TI, '    else if (c !== -128) { const b = d[i++] ?? 0; for (let j = 0; j < 1 - c; j++) { if (k < n) o[k] = b; k++; } }',
  '    else if (c !== -128) { const b = d[i++] ?? 0; for (let j = 0; j < -c; j++) { if (k < n) o[k] = b; k++; } }', 'nuc',
  'PackBits: o repetare mai scurtă')
o('T04', TI, '    if (predictor === 2) for (let i = spc; i < n; i++) tr[i] = ((tr[i] ?? 0) + (tr[i - spc] ?? 0)) & max;',
  '    if (predictor === 2) for (let i = 1; i < n; i++) tr[i] = ((tr[i] ?? 0) + (tr[i - 1] ?? 0)) & max;', 'nuc',
  'predictorul pe eșantionul vecin, nu pe același eșantion al pixelului din stânga')
o('T05', TI, '    else if (biti === 16) for (let i = 0; i < n; i++) { const a = b[o + 2 * i] ?? 0, z = b[o + 2 * i + 1] ?? 0; tr[i] = le ? a | (z << 8) : (a << 8) | z; }',
  '    else if (biti === 16) for (let i = 0; i < n; i++) { const a = b[o + 2 * i] ?? 0, z = b[o + 2 * i + 1] ?? 0; tr[i] = a | (z << 8); }', 'nuc',
  '16 biți MM citiți ca II')
o('T06', TI, '      } else { const v = opt(es[s] ?? 0); r = gg = b = foto === 0 ? 255 - v : v; }', '      } else { const v = opt(es[s] ?? 0); r = gg = b = v; }',
  'nuc', 'alb-e-zero necitit (imaginea inversată)')
o('T07', TI, '      else if (foto === 3 && harta) { const i = es[s] ?? 0, n = max + 1; r = harta[i] ?? 0; gg = harta[n + i] ?? 0; b = harta[2 * n + i] ?? 0; }',
  '      else if (foto === 3 && harta) { const i = es[s] ?? 0, n = max + 1; r = harta[i] ?? 0; gg = harta[i] ?? 0; b = harta[2 * n + i] ?? 0; }',
  'nuc', 'paleta: verdele din roșii')
o('T08', TI, '        if (extra === 1) {', '        if (extra === 2) {', 'nuc', 'alfa neasociat împărțit, cel asociat nu')
o('T09', TI, "        const c = opt(es[s] ?? 0), m = opt(es[s + 1] ?? 0), yy = opt(es[s + 2] ?? 0), kk = 255 - opt(es[s + 3] ?? 0);",
  "        const c = opt(es[s] ?? 0), m = opt(es[s + 1] ?? 0), yy = opt(es[s + 2] ?? 0), kk = 255;", 'nuc', 'CMYK fără negru (K)')
o('T10', TI, '    if (fill === 2) d = d.map((b) => INVERS[b] ?? 0);\n', '', 'nuc', 'FillOrder 2 ignorat')
o('T11', TI, '          else for (let x = 0; x < n; x++) es[(x0 + x) * spp + p] = t[x] ?? 0;',
  '          else for (let x = 0; x < n; x++) es[(x0 + x) * spp] = t[x] ?? 0;', 'nuc', 'ordinea planară 2: toate planurile în primul eșantion')
o('T12', TI, '      for (let tx = 0; tx < peRand; tx++) linie.push(await desface(p * peImagine + ty * peRand + tx, placi ? th : randuri));',
  '      for (let tx = 0; tx < peRand; tx++) linie.push(await desface(p * peImagine + tx * peRand + ty, placi ? th : randuri));', 'nuc',
  'plăcile luate pe coloane')
o('T13', TI, '    for (let j = 0; j < 4 * w; j++) { this.date[o + j] = Math.round((s[j] ?? 0) / kk); s[j] = 0; }',
  '    for (let j = 0; j < 4 * w; j++) { this.date[o + j] = Math.round((s[j] ?? 0) / k); s[j] = 0; }', 'nuc', 'reducerea: suma împărțită la k, nu la k²')
o('T14', TI, '        case 6: X = H - 1 - y; Y = x; break;', '        case 6: X = y; Y = W - 1 - x; break;', 'nuc', 'orientarea 6 întoarsă ca 8')
o('T15', TI, '    const p = Math.min(pagini, Math.max(1, Math.round(o.pagina ?? 1)));', '    const p = 1;', 'nuc', 'mereu prima pagină')
o('T16', TI, '    if ((nst & 1) === 0 && st !== 2) p.push(o);', '    p.push(o);', 'nuc', 'miniaturile numărate ca pagini')
o('T17', TI, '  const dpi = unitate === 1 || !(rez > 0) ? null : unitate === 3 ? rez * 2.54 : rez;',
  '  const dpi = unitate === 1 || !(rez > 0) ? null : rez;', 'nuc', 'rezoluția în cm luată ca în țol')
o('T18', TI, 'const CITITE = new Set([1, 2, 3, 4, 5, 8, 32946, 32773]);', 'const CITITE = new Set([1, 2, 3, 4, 5, 7, 8, 32946, 32773]);', 'nuc',
  'JPEG în TIFF încercat (citit ca G4), nu refuzat cu numele')
o('T19', TI, '    else for (let i = 0; i < n; i++) { const q = i * biti; tr[i] = ((b[o + (q >> 3)] ?? 0) >> (8 - biti - (q & 7))) & max; }',
  '    else for (let i = 0; i < n; i++) { const q = i * biti; tr[i] = ((b[o + (q >> 3)] ?? 0) >> (q & 7)) & max; }', 'nuc',
  'biții sub 8 luați de la cel mai puțin semnificativ')
o('U01', CT, '      dpiFisier = t.dpi ?? c.dpi;', '      dpiFisier = c.dpi;', 'usa', 'DPI-ul paginii TIFF ignorat')
o('U02', CT, '      const t = await decodeazaTiff(new Uint8Array(await c.imagine.arrayBuffer()), { pagina: c.pagina ?? 1, maxPixeli: c.maxPixeli ?? PIXELI_MAXIM });',
  '      const t = await decodeazaTiff(new Uint8Array(await c.imagine.arrayBuffer()), { pagina: 1, maxPixeli: c.maxPixeli ?? PIXELI_MAXIM });', 'usa',
  'pagina aleasă ignorată în calcul')
o('U03', CA, "    return { ok: false, cod: r.motiv === 'stricat' ? 'tiff-stricat' : 'tiff', format: 'imagine', detaliu: r.detaliu, ...(r.pagini ? { pagini: r.pagini } : {}) };",
  "    return { ok: false, cod: 'tiff', format: 'imagine', detaliu: r.detaliu, ...(r.pagini ? { pagini: r.pagini } : {}) };", 'usa',
  'un TIFF stricat spus ca nesprijinit')
o('U04', CA, '    ...(pagina !== undefined && pagina > 1 ? { pagina } : {}),\n', '', 'usa', 'cererea fără pagina aleasă')
o('U05', IM, "    if (fel === 'tiff') return dpiExif(v, 0);\n", '', 'usa', 'ușa fără DPI-ul TIFF-ului')
o('U06', CA, '    lumina: r.raport.lumina, inegala: r.raport.inegala, ...(r.pagini !== undefined ? { pagini: r.pagini } : {}),',
  '    lumina: r.raport.lumina, inegala: r.raport.inegala,', 'usa', 'raportul fără numărul paginilor')
o('W01', DI, "    ? (stare.format === 'pdf' ? stare.pagini : stare.format === 'imagine' ? stare.trasare.pagini ?? 0 : 0)",
  "    ? (stare.format === 'pdf' ? stare.pagini : 0)", 'e2e', 'fără alegerea paginii la TIFF')
o('W02', DI, "  if (cod === 'tiff' || cod === 'tiff-stricat') return t(REFUZ[cod], { ce: detaliu ?? '?' });\n", '', 'e2e',
  'refuzul TIFF fără numele a ce nu citește')
o('W03', CA, "  if (format === 'imagine') return previzualizareImagine(f, o.trasare, o.semnal, o.pagina);",
  "  if (format === 'imagine') return previzualizareImagine(f, o.trasare, o.semnal);", 'e2e', 'pagina aleasă nu ajunge la calcul')

SETURI = {
    'nuc': ['test/unit/trasare.tiff.test.ts'],
    'usa': ['test/unit/import.imagine.test.ts'],
}
E2E = ['test/e2e/trasare.spec.ts']
