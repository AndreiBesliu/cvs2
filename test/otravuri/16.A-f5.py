# Lista de otrăvuri a feliei 16.A↑f-5 (silueta desenată în „Frezele mele”; ADR 0304 §5, 5a), 28.11.2026, aleasă de autor:
# judecata punctelor (câte, numerele, începutul, ordinea pe r și pe h, capătul, rotunjirea înaintea judecății), ținerea lor
# (rotunjite, doar pe felul desenat), copia în proiect (capătul exact, copia listei), capătul și silueta frezei desenate,
# felul cu CAM, forma câmpului la citire, „Pornește de la…” (rotunjirea, punctele contopite), CSV-ul (felul, punctele cu
# virgula, diametrul din ultimul punct, doar pe felul desenat) și, în fereastră, editorul (lipirea, vecinii, Shift, „+”,
# „✕”, greșeala pe rând, „Pornește de la…”, pornirea de la silueta frezei, diametrul din ultimul punct și marginea lui, fișa).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit (setul `e2e` cere `.tmp/pw.config.ts`).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


FZ = 'src/model/freza.ts'
PF = 'src/model/profilFreza.ts'
FF = 'src/io/frezeFisier.ts'
SD = 'src/app/SiluetaDesenata.tsx'
FM = 'src/app/FrezeleMele.tsx'

# ── Judecata punctelor ───────────────────────────────────────────────────────────────────────────────────────────────
o('D01', FZ, "  if (puncte.length < 2) return { motiv: 'puncte-putine', punct: null };", "  if (puncte.length < 1) return { motiv: 'puncte-putine', punct: null };", 'm',
  'un singur punct primit')
o('D02', FZ, "  if (puncte.length > PLAFON.puncteProfil) return { motiv: 'puncte-multe', punct: null };",
  "  if (puncte.length > PLAFON.puncteProfil + 1) return { motiv: 'puncte-multe', punct: null };", 'm', '201 de puncte primite (ușa le refuză)')
o('D03', FZ, "!finit(p[1]) || p[0] < 0 || p[1] < 0", "!finit(p[1]) || p[0] < 0", 'm', 'un h negativ primit')
o('D04', FZ, "  if (P[0]![0] !== 0 || P[0]![1] !== 0) return { motiv: 'puncte-inceput', punct: 0 };", "", 'm', 'primul punct oriunde')
o('D05', FZ, "    if (!(P[i]![0] > P[i - 1]![0])) return { motiv: 'puncte-r', punct: i };", "    if (!(P[i]![0] >= P[i - 1]![0])) return { motiv: 'puncte-r', punct: i };", 'm',
  'r egal primit (o treaptă verticală, pe care ușa n-o primește)')
o('D06', FZ, "    if (P[i]![1] < P[i - 1]![1]) return { motiv: 'puncte-h', punct: i };", "", 'm', 'h care scade primit (o subtăiere)')
o('D07', FZ, "  if (diametru !== null && Math.abs(P[k]![0] - diametru / 2) > 1e-9) return { motiv: 'puncte-capat', punct: k };", "", 'm',
  'capătul oriunde față de diametru')
o('D08', FZ, "  const P = puncteRotunjite(puncte as ReadonlyArray<readonly [number, number]>);", "  const P = puncte as ReadonlyArray<readonly [number, number]>;", 'm',
  'judecata pe punctele nerotunjite: se ține altceva decât s-a judecat')
# ── Ținerea și copia ─────────────────────────────────────────────────────────────────────────────────────────────────
o('D09', FZ, "{ puncte: puncteRotunjite(f.puncte) }", "{ puncte: f.puncte }", 'm', 'punctele ținute nerotunjite (o freză mare nu mai încape în cont)')
o('D10', FZ, "    ...(arePuncte(f.fel) && Array.isArray(f.puncte) ?", "    ...(Array.isArray(f.puncte) ?", 'm', 'punctele rămase pe o freză trecută pe alt fel')
o('D11', FZ, "    if (P.length > 0) P[P.length - 1]![0] = f.diametru / 2;\n", "", 'm', 'capătul copiei lăsat la 1e-9 de rază')
o('D12', FZ, "    const P = (f.puncte ?? []).map(([r, h]): [number, number] => [r, h]);", "    const P = (f.puncte ?? []) as Array<[number, number]>;", 'm',
  'copia ține lista bibliotecii (o schimbare a ei ar atinge freza)')
o('D13', FZ, "'ogee-roman', 'panou', 'desenata'] as const;\nexport const areCam", "'ogee-roman', 'panou'] as const;\nexport const areCam", 'm',
  'felul desenat fără CAM: nu se alege în proiect')
o('D14', FZ, "      && x['puncte'].every((p: unknown) => Array.isArray(p) && p.length === 2 && finit(p[0]) && finit(p[1]))));",
  "      && true));", 'm', 'câmpul `puncte` cu altă formă primit pe alt fel')
# ── Capătul, silueta, „Pornește de la…” ──────────────────────────────────────────────────────────────────────────────
o('D15', PF, "      return finit(h) ? h : 0;", "      return 0;", 'm', 'capătul frezei desenate 0: tăișul n-ar mai avea margine')
o('D16', PF, "    case 'desenata': return Array.isArray(f.puncte) && f.puncte.length >= 2 ? f.puncte : [[0, 0], [R, 0]];",
  "    case 'desenata': return [[0, 0], [R, 0]];", 'm', 'silueta frezei desenate ca o plată')
o('D17', PF, "  const rot = puncteRotunjite(linii);", "  const rot = linii;", 'm', '„Pornește de la…” fără rotunjire')
o('D18', PF, "    if (!ultim && !(r > rl)) continue;", "", 'm', '„Pornește de la…” păstrează punctele contopite (r egal)')
# ── CSV-ul ───────────────────────────────────────────────────────────────────────────────────────────────────────────
o('D19', FF, "  desenata: 'desenata', 'desenată': 'desenata',", "  'desenată': 'desenata',", 'm', 'felul „desenata” necunoscut în CSV')
o('D20', FF, "[numar(n[0], virgula) ?? Number.NaN, numar(n[1], virgula) ?? Number.NaN]", "[numar(n[0], false) ?? Number.NaN, numar(n[1], false) ?? Number.NaN]", 'm',
  'punctele fără virgula zecimală')
o('D21', FF, "    const diametru = nr('diametru') ?? (pct ? 2 * pct[pct.length - 1]![0] : undefined);", "    const diametru = nr('diametru');", 'm',
  'diametrul nescris nu vine din ultimul punct')
o('D22', FF, "    const pct = fel === 'desenata' ? puncte(cel('puncte'), virgula) : undefined;", "    const pct = puncte(cel('puncte'), virgula);", 'm',
  'punctele puse pe orice fel')
# ── Editorul (e2e) ───────────────────────────────────────────────────────────────────────────────────────────────────
o('D23', SD, "const lipit = (x: number): number => Math.round(x / PAS_TRAS) / 10;", "const lipit = (x: number): number => x;", 'e2e', 'tragerea fără lipire la 0,1 mm')
o('D24', SD, "  const ra = a && finit(a[0]) ? a[0] + PAS_TRAS : 0;", "  const ra = 0;", 'e2e', 'tras, punctul trece de vecinul dinainte')
o('D25', SD, "  const hb = b && finit(b[1]) ? b[1] : PLAFON.adancimeOperatie;", "  const hb = PLAFON.adancimeOperatie;", 'e2e', 'tras, punctul urcă peste vecinul de după')
o('D26', SD, "    const pas = e.shiftKey ? 1 : PAS_TRAS;", "    const pas = PAS_TRAS;", 'e2e', 'Shift fără pasul de 1 mm')
o('D27', SD, "      ? [finit(r) ? r + 1 : 1, finit(h) ? h : 0]", "      ? [finit(r) ? r + 2 : 1, finit(h) ? h : 0]", 'e2e', '„+” după ultimul, cu 2 mm')
o('D28', SD, "[(r + b[0]) / 2, (h + b[1]) / 2]", "[r, h]", 'e2e', '„+” între două puncte dublează punctul')
o('D29', SD, "disabled={dezactivat || puncte.length <= 2}", "disabled={dezactivat}", 'e2e', '„✕” lăsat cu două puncte')
o('D30', SD, "    if (problema.motiv === 'puncte-numar') return true;\n    return", "    return undefined;\n    return", 'e2e', 'greșeala nemarcată pe rând')
o('D31', SD, '<select data-freze="porneste-de-la" value="" disabled', '<select data-freze="porneste-de-la" disabled', 'e2e',
  '„Pornește de la…” rămâne pe freza aleasă')
o('D32', FM, "? punctePornire(frezaDin(c, ro), ro) : c.puncte;", "? punctePornire({ ...frezaDin(c, ro), diametru: Number.NaN }, ro) : c.puncte;", 'e2e',
  'felul desenat nu pornește de la silueta frezei din editor')
o('D33', FM, "    v['diametru'] = P.length > 0 ? 2 * P[P.length - 1]![0] : Number.NaN;", "    v['diametru'] = 2 * P[0]![0];", 'e2e', 'diametrul nu vine din ultimul punct')
o('D34', FM, "    return vazute && probleme.diametru\n", "    return false && probleme.diametru\n", 'e2e', 'diametrul peste 100 mm nespus sub tabel')
o('D35', FM, "    if (arePuncte(f.fel)) geometria.push(['inaltime',", "    if (false) geometria.push(['inaltime',", 'e2e', 'fișa fără înălțimea siluetei')
o('D36', FM, "        {arePuncte(f.fel) && f.puncte ? <PuncteFisa", "        {false && f.puncte ? <PuncteFisa", 'e2e', 'fișa fără punctele siluetei')

SETURI = {
    'm': ['test/unit/freza.desenata.test.ts', 'test/unit/freza.test.ts', 'test/unit/frezeFisier.test.ts', 'test/unit/profil.document.test.ts'],
}
E2E = ['test/e2e/freze.desenata.spec.ts']
