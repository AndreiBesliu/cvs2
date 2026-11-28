# Lista de otrăvuri a feliei 18.1↑j (straturile reliefului, editabile, și imaginea ca strat nou; ADR 0320), 28.11.2026, alese
# de autor: editarea pură (`straturiRelief.ts`), așezarea imaginii pe grilă (`asezare.ts`), cererea workerului cu grila țintă
# (`calculRelief.ts`), panoul (`StraturiRelief.tsx`), fereastra (`FereastraRelief.tsx`), legătura cu registrul (`App.tsx`) și
# nota exportului (`ExportConectat.tsx`, `FisaFinisare.tsx`). Cele pure, prinse de probele unitare; ale interfeței, de e2e
# (`relief.straturi.spec.ts`). Plus un martor.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


SR = 'src/model/straturiRelief.ts'
AS = 'src/relief/asezare.ts'
CR = 'src/jobs/calculRelief.ts'
UI = 'src/app/StraturiRelief.tsx'
FR = 'src/app/FereastraRelief.tsx'
AP = 'src/app/App.tsx'
EC = 'src/app/ExportConectat.tsx'
FF = 'src/ui/FisaFinisare.tsx'

o('J00', SR, "/** Cel mai mic id liber de forma `sN` (N de la 1). */", "/** Cel mai mic id liber de forma `sN` (N de la 1).  */", 'model',
  'martorul: un spațiu într-un comentariu (trebuie să scape)')
# Editarea pură.
o('J01', SR, "  if (sch.vizibil !== undefined && sch.vizibil !== s.vizibil) nou = { ...nou, vizibil: sch.vizibil };", "", 'model',
  'ochiul nu schimbă nimic: un strat ascuns din panou rămâne în compus (și se taie)')
o('J02', SR, "  const n = nume.trim().slice(0, PLAFON.numeLungime);", "  const n = nume.slice(0, PLAFON.numeLungime);", 'model',
  'numele fără curățare: un nume din spații rămâne un șir gol, nu „fără nume”')
o('J03', SR, "  const j = directie === 'sus' ? k + 1 : k - 1;", "  const j = directie === 'sus' ? k - 1 : k + 1;", 'model',
  'sus și jos întoarse: ↑ coboară stratul în compus')
o('J04', SR, "  if (f.straturi.length <= 1 || !f.straturi.some((s) => s.id === id)) return null;",
  "  if (!f.straturi.some((s) => s.id === id)) return null;", 'model', 'ultimul strat se poate șterge: un relief fără straturi (ușa îl refuză)')
o('J05', SR, "  return { ...f, straturi: [...f.straturi, s] };", "  return { ...f, straturi: [s, ...f.straturi] };", 'model',
  'stratul nou dedesubt, nu deasupra: „înlocuiește” sau „păstrează înalt” combină invers')
o('J06', SR, "mod: nou.mod ?? 'aduna', vizibil: true, dale: nou.dale };", "mod: nou.mod ?? 'aduna', vizibil: false, dale: nou.dale };", 'model',
  'stratul nou vine ascuns: imaginea pusă nu se vede și nu se taie')
o('J07', SR, "  if (f.straturi.length >= STRATURI_RELIEF_MAXIM) return null;", "  if (f.straturi.length > STRATURI_RELIEF_MAXIM) return null;", 'model',
  'al 33-lea strat trece de editare (ușa refuză apoi documentul)')
o('J08', SR, "  let n = 1;\n  while (folosite.has(`s${n}`)) n++;", "  let n = 1;\n  while (folosite.has(`s${n}`)) n += 2;", 'model',
  'id-ul nou sare peste cele libere (s3 cu s1, s2 luate: s1 + 2 = s3, dar cu s1, s3 luate: s5)')
o('J09', SR, "  return f.straturi.reduce((n, s) => n + (s.vizibil ? 0 : 1), 0);", "  return f.straturi.reduce((n, s) => n + (s.vizibil ? 1 : 0), 0);", 'model',
  'numără straturile vizibile ca ascunse: exportul spune nota pe dos')
o('J10', SR, "  const g = gasite.length === 1 ? gasite[0] : undefined;", "  const g = gasite[0];", 'model',
  'relieful ales: din două reliefuri, primul (stratul ar merge pe un relief ghicit)')
# Așezarea imaginii pe grilă.
o('J11', AS, "  const x0 = (g.nx * g.celula - w * pixel) / 2, y0 = (g.ny * g.celula - h * pixel) / 2;",
  "  const x0 = 0, y0 = 0;", 'asezare', 'imaginea în colț, nu centrată')
o('J12', AS, "      const u = Math.floor(((i + 0.5) * g.celula - x0) / pixel);", "      const u = Math.round(((i + 0.5) * g.celula - x0) / pixel);", 'asezare',
  'pixelul rotunjit, nu cel în care cade centrul: stratul se mută cu o jumătate de pixel')
o('J13', AS, "      if (u < 0 || u >= w) continue;", "      if (u < 0 || u > w) continue;", 'asezare',
  'marginea din dreapta: o celulă în afara imaginii ia pixelul rândului următor')
o('J14', AS, "      out[j * g.nx + i] = src[v * w + u] ?? NaN;", "      out[j * g.nx + i] = src[(h - 1 - v) * w + u] ?? NaN;", 'asezare',
  'rândurile întoarse: imaginea pusă cu susul în jos')
o('J15', CR, "  return dinValori(c.pe ? asezaPeGrila(valori, nx, ny, pixel, g) : valori, g);", "  return dinValori(valori, g);", 'asezare',
  'cu grila țintă, valorile imaginii fără așezare: stratul nu e imaginea centrată (sau cade din grilă)')
# Panoul.
o('J16', UI, "                onClick={() => { aplica(mutaStrat(f, st.id, 'sus')); }}>↑</button>", "                onClick={() => { aplica(mutaStrat(f, st.id, 'jos')); }}>↑</button>", 'e2e',
  'butonul ↑ mută stratul în jos')
o('J17', UI, "              <button type=\"button\" data-buton=\"strat-sterge\" disabled={oprit || f.straturi.length <= 1}",
  "              <button type=\"button\" data-buton=\"strat-sterge\" disabled={oprit}", 'e2e', 'ultimul strat are × pornit (refuzat apoi, în tăcere)')
o('J18', UI, "                onClick={() => { aplica(cuStrat(f, st.id, { vizibil: !st.vizibil })); }}>", "                onClick={() => { aplica(cuStrat(f, st.id, { vizibil: st.vizibil })); }}>", 'e2e',
  'ochiul nu face nimic')
o('J19', AP, "              onStraturi={(f, nod) => aplicaDinPanou('document.forma', { formaEditata: () => f, nodEditat: () => nod })}",
  "              onStraturi={(f) => aplicaDinPanou('document.forma', { formaEditata: () => f })}", 'e2e',
  'fără nodEditat: rădăcina reliefului e un grup, deci panoul nu schimbă nimic (refuzat)')
# Fereastra.
o('J20', FR, "      const scara = latime !== null ? { latimeMm: latime } : pe ? { latimeMm: pe.nx * pe.celula } : { dpi };",
  "      const scara = latime !== null ? { latimeMm: latime } : { dpi };", 'e2e', 'pe un strat, lățimea implicită din DPI, nu cât relieful')
o('J21', FR, "  const formaNoua = useMemo(() => (peGrila && pe ? cuStratNou(pe, { dale: ok.amprenta, nume }) : null), [peGrila, pe, ok, nume]);",
  "  const formaNoua = useMemo(() => (peGrila && pe ? cuStratNou(pe, { dale: ok.amprenta, nume: '' }) : null), [peGrila, pe, ok, nume]);", 'e2e',
  'stratul nou fără numele fișierului')
# Exportul.
o('J22', EC, "      ...(ascunse > 0 ? { ascunse } : {}),", "", 'e2e', 'fereastra exportului nu află straturile ascunse: nota lipsește')
o('J23', FF, "      {fin.ascunse !== undefined && fin.ascunse > 0 && (", "      {fin.ascunse !== undefined && fin.ascunse > 1 && (", 'e2e',
  'nota doar de la două straturi ascunse')


# ---- Seturile ----
SETURI = {
    'model': ['test/unit/relief.straturi.test.ts', 'test/unit/relief.straturi.actiune.test.ts', 'test/unit/relief.straturi.program.test.ts'],
    'asezare': ['test/unit/relief.asezare.test.ts', 'test/unit/relief.calcul.test.ts'],
    'e2e': [],
}
E2E = ['test/e2e/relief.straturi.spec.ts']
