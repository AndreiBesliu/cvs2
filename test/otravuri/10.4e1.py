# Lista de otrăvuri a feliei 10.4↑e-1 (toleranțele cotelor; ADR 0330), 26.11.2026, alese de autor: scrierea toleranței
# (simetrică, abaterile, semnul lui zero, pasul, unitatea la capăt, unghiul), citirea și punerea ei, judecata ușii și cifra din
# export, prinse de unitare, apoi panoul și acțiunea (prinse de e2e).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


D = 'src/model/desenCota.ts'
C = 'src/model/cote.ts'
J = 'src/model/judecataCote.ts'
X = 'src/io/coteExport.ts'
U = 'src/app/Cote.tsx'
P = 'src/app/PanouCota.tsx'

# Scrierea, pură.
o('T01', D, "  if (t.sus === -t.jos) return ` ±${abs(t.sus)}`;", "  if (t.sus === t.jos) return ` ±${abs(t.sus)}`;", 'toleranta',
  'simetrică nerecunoscută')
o('T02', D, "    return /[1-9]/.test(s) ? `${x < 0 ? '-' : '+'}${s}` : s;", "    return `${x < 0 ? '-' : '+'}${s}`;", 'toleranta',
  'zero cu semn')
o('T03', D, "    return /[1-9]/.test(s) ? `${x < 0 ? '-' : '+'}${s}` : s;", "    return /[1-9]/.test(s) ? `${x <= 0 ? '+' : '-'}${s}` : s;",
  'toleranta', 'semnele pe dos')
o('T04', D, "  const g: FormatCifre = { ...f, pas: null, cuUnitate: false };", "  const g: FormatCifre = { ...f, cuUnitate: false };",
  'toleranta', 'toleranța rotunjită cu pasul cifrei')
o('T05', D, "  return cifraCota(c.fel, valoare, { ...f, cuUnitate: false }) + scrieToleranta(c.fel, t, f) + unitate;",
  "  return cifraCota(c.fel, valoare, f) + scrieToleranta(c.fel, t, f);", 'toleranta', 'unitatea înaintea toleranței')
o('T06', D, "  const abs = (x: number): string => (fel === 'unghi' ? scrieUnghi(Math.abs(x), g) : scrieCifra(Math.abs(x), g));",
  "  const abs = (x: number): string => scrieCifra(Math.abs(x), g);", 'toleranta', 'la unghi, toleranța în mm')
o('T07', D, "  if (!abatereBuna(sus) || !abatereBuna(jos) || sus < jos || (sus === 0 && jos === 0)) return null;",
  "  if (!abatereBuna(sus) || !abatereBuna(jos) || (sus === 0 && jos === 0)) return null;", 'toleranta',
  'o toleranță cu abaterea de sus sub cea de jos desenată')
o('T08', D, "  if (!abatereBuna(sus) || !abatereBuna(jos) || sus < jos || (sus === 0 && jos === 0)) return null;",
  "  if (!abatereBuna(sus) || !abatereBuna(jos) || sus < jos) return null;", 'toleranta', 'zero și zero, desenat')
o('T09', D, "const abatereBuna = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) <= TOLERANTA_MAXIMA;",
  "const abatereBuna = (x: unknown): x is number => typeof x === 'number' && !Number.isNaN(x);", 'toleranta',
  'abaterile fără margini')
o('T10', C, "  return t === null || (t.sus === 0 && t.jos === 0) ? fara : { ...fara, toleranta: { sus: t.sus, jos: t.jos } };",
  "  return t === null ? fara : { ...fara, toleranta: { sus: t.sus, jos: t.jos } };", 'toleranta', 'zero și zero ținut în cotă')
o('T11', C, "  const { toleranta: _, ...fara } = structuredClone(c);", "  const fara = c;", 'toleranta', 'cota dată schimbată')
# Ușa.
o('J01', J, "    if ((t['sus'] as number) < (t['jos'] as number)) return 'toleranta.sus e sub toleranta.jos';\n", "", 'toleranta',
  'ușa lasă abaterea de sus sub cea de jos')
o('J02', J, "    if (!obiect(t) || !abatere(t['sus']) || !abatere(t['jos'])) return", "    if (!obiect(t)) return", 'toleranta',
  'ușa nu judecă abaterile')
# Exportul.
o('X01', X, "  const text = valoare === null ? '' : textCota(c, cifraCuToleranta(c, valoare, o.format));\n  const dc",
  "  const text = valoare === null ? '' : textCota(c, cifraCuToleranta(c, valoare, o.format).split(' ')[0] ?? '');\n  const dc",
  'toleranta', 'desenul cotei fără toleranță')
o('X02', X, "    const text = valoare === null ? '' : textCota(c, cifraCuToleranta(c, valoare, o.format));",
  "    const text = valoare === null ? '' : textCota(c, String(valoare));", 'toleranta', 'exportul fără toleranță')
# Panoul (e2e).
o('E01', U, "  const text = valoare === null ? '' : textCota(c, cifraCuToleranta(c, valoare, format));",
  "  const text = valoare === null ? '' : textCota(c, cifraCuToleranta({ ...c, toleranta: null }, valoare, format));", 'e2e',
  'pânza fără toleranță')
o('E02', U, "          if (t && t.sus < t.jos) return { ok: false, motiv: 'prop.cota.toleranta.ordine' };\n", "", 'e2e',
  'abaterea de sus sub cea de jos, primită')
o('E03', P, "          onAplica={(x) => spune(cota.actiuni.toleranta({ sus: Math.abs(x), jos: -Math.abs(x) }))} />) : null}",
  "          onAplica={(x) => spune(cota.actiuni.toleranta({ sus: Math.abs(x), jos: 0 }))} />) : null}", 'e2e',
  'simetrică devine doar de sus')
o('E04', P, "    if (r.ok) setFelAles({ id: cota.id, fel });", "", 'e2e', '„Cu abateri” nu rămâne ales cât abaterile sunt egale')
o('E05', P, "felDin === 'simetrica' && felAles?.id === cota.id && felAles.fel === 'abateri' ? 'abateri' : felDin;",
  "felAles?.id === cota.id && (felAles.fel === 'fara') === (tol === null) ? felAles.fel : felDin;", 'e2e',
  'după o anulare, felul rămâne alegerea de dinainte (simetrică peste abateri)')
o('E06', P, "              onAplica={(x) => spune(cota.actiuni.toleranta({ sus: x, jos: tol.jos }))} />)}",
  "              onAplica={(x) => spune(cota.actiuni.toleranta({ sus: x, jos: -x }))} />)}", 'e2e', 'abaterea de sus o schimbă și pe cea de jos')

SETURI = {
    'toleranta': ['test/unit/cote.toleranta.test.ts'],
}
E2E = ['test/e2e/cote.toleranta.spec.ts']
