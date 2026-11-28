# Lista de otrăvuri a feliei 18.1↑f (litofania; ADR 0321), 28.11.2026, alese de autor: harta grosimilor (`litofanie.ts`), cererea
# workerului (`calculRelief.ts`), fereastra (`FereastraRelief.tsx`), alegerea din capul ferestrei (`AlegereRezultat.tsx`) și
# legătura din dialog (`ImportConectat.tsx`). Cele pure, prinse de probele pe hârtie (`relief.litofanie`, `litofanie.program`,
# `relief.calcul`); ale interfeței, de e2e (`relief.litofanie.spec.ts`). Plus un martor.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


LT = 'src/relief/litofanie.ts'
CR = 'src/jobs/calculRelief.ts'
FR = 'src/app/FereastraRelief.tsx'
AR = 'src/ui/AlegereRezultat.tsx'
IC = 'src/app/ImportConectat.tsx'

o('F00', LT, "/** Grila oglindită pe X (fiecare rând de la capăt). */", "/** Grila oglindită pe X (fiecare rând de la capăt).  */", 'lit',
  'martorul: un spațiu într-un comentariu (trebuie să scape)')
# Harta grosimilor.
o('F01', LT, "    out[k] = v !== v ? tmax : tmax - v * (tmax - tmin);", "    out[k] = v !== v ? tmax : tmin + v * (tmax - tmin);", 'lit',
  'grosimile pe dos: albul gros, negrul subțire (imaginea în negativ)')
o('F02', LT, "    out[k] = v !== v ? tmax : tmax - v * (tmax - tmin);", "    out[k] = v !== v ? tmin : tmax - v * (tmax - tmin);", 'lit',
  'pixelii transparenți la grosimea minimă (găuri aproape prin placă)')
o('F03', LT, "  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) out[j * nx + i] = v[j * nx + nx - 1 - i] ?? NaN;",
  "  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) out[j * nx + i] = v[j * nx + i] ?? NaN;", 'lit',
  'din spate fără oglindă: imaginea se citește în oglindă')
o('F04', LT, "  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) out[(j + k) * NX + i + k] = v[j * nx + i] ?? NaN;",
  "  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) out[j * NX + i] = v[j * nx + i] ?? NaN;", 'lit',
  'imaginea în colțul ramei, nu în mijlocul ei')
o('F05', LT, "  const NX = nx + 2 * k, NY = ny + 2 * k, out = new Float32Array(NX * NY).fill(t);",
  "  const NX = nx + 2 * k, NY = ny + 2 * k, out = new Float32Array(NX * NY).fill(0);", 'lit', 'rama la grosimea 0 (tăiată prin placă)')
o('F06', LT, "  return cuRama(o.spate ? oglindesteX(t, nx, ny) : t, nx, ny, Math.max(0, Math.round(o.rama)), o.tmax);",
  "  return cuRama(o.spate ? oglindesteX(t, nx, ny) : t, nx, ny, Math.max(0, Math.round(o.rama)), o.tmin);", 'lit',
  'rama la grosimea minimă')
o('F07', LT, "    out[k] = v !== v || !(d > 0) ? 0 : Math.min(1, Math.max(0, (tmax - v) / d));",
  "    out[k] = v !== v || !(d > 0) ? 0 : Math.min(1, Math.max(0, (v - tmin) / d));", 'lit',
  'lumina din spate pe dos: previzualizarea arată negativul')
o('F08', LT, "    out[k] = v !== v || !(d > 0) ? 0 : Math.min(1, Math.max(0, (tmax - v) / d));",
  "    out[k] = v !== v || !(d > 0) ? 0 : (tmax - v) / d;", 'lit', 'lumina fără margini: o grosime peste maxim dă o lumină negativă')
o('F09', LT, "    const rand = ny - 1 - j;\n    for (let i = 0; i < nx; i++) {\n      const g = Math.round(255 * (l[j * nx + i] ?? 0)), p = 4 * (rand * nx + i);",
  "    const rand = j;\n    for (let i = 0; i < nx; i++) {\n      const g = Math.round(255 * (l[j * nx + i] ?? 0)), p = 4 * (rand * nx + i);", 'lit',
  'previzualizarea cu susul în jos')
# Workerul.
o('F10', CR, "      { tmin: L.tmin, tmax: L.tmax, rama: L.ramaMm / pixel, spate: L.spate });",
  "      { tmin: L.tmin, tmax: L.tmax, rama: L.ramaMm, spate: L.spate });", 'calcul', 'rama în mm luată drept celule (la alt pixel decât 1 mm)')
o('F11', CR, "    if (!(L.tmin >= 0 && L.tmax > L.tmin && Number.isFinite(L.tmax) && L.ramaMm >= 0)) return { ok: false, cod: 'grosimi' };",
  "    if (!(L.tmax > L.tmin && Number.isFinite(L.tmax) && L.ramaMm >= 0)) return { ok: false, cod: 'grosimi' };", 'calcul',
  'o grosime minimă negativă trece')
o('F12', CR, "  const umbrit = lumina ? imagineLumina(luminaDinGrosimi(r.valori, lumina.tmin, lumina.tmax), r.nx, r.ny) : umbreste(r.valori, r.nx, r.ny, celula * k);",
  "  const umbrit = umbreste(r.valori, r.nx, r.ny, celula * k);", 'calcul', 'litofania arătată umbrită, nu cu lumina din spate')
o('F13', CR, "  if (c.litofanie) {", "  if (c.litofanie && c.pe) {", 'calcul', 'cererea litofaniei face un relief obișnuit (înălțimile, nu grosimile)')
# Fereastra, alegerea și dialogul.
o('F14', FR, "      const felul = litofanie ? { litofanie: lit } : {};", "      const felul = {};", 'e2e',
  'fereastra nu trimite litofania: un relief obișnuit, cu numele „Litofanie”')
o('F15', FR, "let tinuteLit: Litofanie = { tmin: 0.8, tmax: 3, ramaMm: 0, spate: false };",
  "let tinuteLit: Litofanie = { tmin: 0.8, tmax: 3, ramaMm: 0, spate: true };", 'e2e', 'implicit din spate (oglindită)')
o('F16', FR, "                          onChange={() => { schimbaLit({ spate }); }} />",
  "                          onChange={() => { schimbaLit({ spate: !spate }); }} />", 'e2e', 'fața și spatele întoarse')
o('F17', FR, "  const latimeImagine = ok && latimeMm !== null && litofanie ? (ok.nx - 2 * Math.max(0, Math.round(lit.ramaMm / ok.celula))) * ok.celula : latimeMm;",
  "  const latimeImagine = latimeMm;", 'e2e', 'lățimea arătată cu rama: la o nouă aplicare, imaginea crește cu rama')
o('F18', AR, "      {(['vectori', 'relief', 'litofanie'] as const).map((r) => (", "      {(['vectori', 'relief'] as const).map((r) => (", 'e2e',
  'fără alegerea „Litofanie”')
o('F19', IC, "        litofanie={rezultat === 'litofanie'}", "        litofanie={false}", 'e2e', 'dialogul nu-i spune ferestrei că e o litofanie')


# ---- Seturile ----
SETURI = {
    'lit': ['test/unit/relief.litofanie.test.ts', 'test/unit/litofanie.program.test.ts'],
    'calcul': ['test/unit/relief.calcul.test.ts'],
    'e2e': [],
}
E2E = ['test/e2e/relief.litofanie.spec.ts']
