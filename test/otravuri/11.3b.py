# Lista de otrăvuri a feliei 11.3↑b (avertismentul urechilor la așezare, ADR 0210, varianta a), 17.11.2026, alese de autor:
# regula (lemnul de 3 mm, rotunjirea în sus, doar profilele exterioare cu urechi, freza cea mai mare), distanța propusă (oricare
# piesă aleasă, doar cele alese), pragul avertismentului (X sau Y, egalitatea, sub minim), copiile lui «Încă…» / «+1»,
# „Mută și așază la capăt”, și legăturile din interfață: «Așază pe foi» (distanța de pornire, nota, clasa și textul
# avertismentului, virgula zecimală a minimului) și «Din CSV…» (distanța urcată, avertismentul de la „Schimbă…”).
# Două gărzi au ieșit din cod la alegerea listei, fiindcă nicio otravă nu le putea prinde: −1e-9 la rotunjire (2 × freza + 3
# iese întreg doar pentru frezele multiplu de 0,5 mm, exacte în virgulă mobilă) și „propunerea peste minim” la avertisment
# (fără urechi, propunerea e chiar minimul, iar celelalte două condiții se exclud).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit; e2e-ul, cu
# `CNCVS2_E2E_RETEA=127.0.5` și configul local (`.tmp/pw.config.ts`, portul worktree-ului).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


DP = 'src/model/distantaPiese.ts'
AS = 'src/model/asezare.ts'
PL = 'src/model/pieseLegate.ts'
AC = 'src/ui/actiuniDocumentCalcul.ts'
DA = 'src/app/DialogAsezare.tsx'
DC = 'src/app/DialogCsv.tsx'

# Regula (unitare, pe hârtie).
o('U01', DP, 'export const LEMN_URECHI = 3;', 'export const LEMN_URECHI = 1;', 'urechi', 'lemnul dintre tăieturi e 1 mm (ADR-ul de la 11.7↑)')
o('U02', DP, '  return urechi ? Math.ceil(2 * freza + LEMN_URECHI) : freza;', '  return urechi ? 2 * freza + LEMN_URECHI : freza;', 'urechi',
  'distanța nu se rotunjește în sus (9,35 la Ø3,175)')
o('U03', DP, '  return urechi ? Math.ceil(2 * freza + LEMN_URECHI) : freza;', '  return urechi ? Math.ceil(freza + LEMN_URECHI) : freza;', 'urechi',
  'o singură freză, nu două (tăieturile vecine se unesc tot)')
o('U04', DP, "  return p.operatii.some((o) => o.tip === 'profil' && o.latura === 'exterior' && o.urechi !== null);",
  "  return p.operatii.some((o) => o.tip === 'profil' && o.urechi !== null);", 'urechi', 'și urechile unui profil interior cer distanța mare')
o('U05', DP, "  return p.operatii.some((o) => o.tip === 'profil' && o.latura === 'exterior' && o.urechi !== null);",
  "  return p.operatii.some((o) => o.tip === 'profil' && o.latura === 'exterior');", 'urechi', 'orice profil exterior, și fără urechi')
o('U06', DP, "if (o.tip === 'profil' && o.latura === 'exterior') d = Math.max(d, o.scula.diametru);",
  "if (o.tip === 'profil' && o.latura === 'exterior') d = o.scula.diametru;", 'urechi', 'freza ultimului profil exterior, nu cea mai mare')
# Distanța propusă și avertismentul (unitare).
o('A01', AS, '  return distantaCuUrechi(distantaMinima(doc, ids, idFoaie), pieseAlese(doc, ids, idFoaie).some(cuUrechi));',
  '  return distantaCuUrechi(distantaMinima(doc, ids, idFoaie), pieseAlese(doc, ids, idFoaie).every(cuUrechi));', 'urechi',
  'distanța mare doar când toate piesele alese au urechi')
o('A02', AS, '    const p = alese.has(i.id) ? piese.get(i.piesa) : undefined;', '    const p = piese.get(i.piesa);', 'urechi',
  'contează și piesele nealese de pe foaie')
o('A03', AS, '  const d = Math.min(opt.distantaX, opt.distantaY);', '  const d = opt.distantaX;', 'urechi', 'avertismentul privește doar X')
o('A04', AS, '  return d < p - EPS && d >= distantaMinima(doc, ids, idFoaie) - EPS ? p : null;', '  return d < p - EPS ? p : null;', 'urechi',
  'avertismentul și sub freză (unde planul refuză)')
o('A05', AS, '  return d < p - EPS && d >= distantaMinima(doc, ids, idFoaie) - EPS ? p : null;',
  '  return d <= p && d >= distantaMinima(doc, ids, idFoaie) - EPS ? p : null;', 'urechi', 'avertismentul și la distanța propusă')
# Copiile și „Mută și așază la capăt” (unitare).
o('L01', PL, '  return Math.max(DISTANTA_COPII, distantaCuUrechi(frezaExterioara(piesa), cuUrechi(piesa)));',
  '  return Math.max(DISTANTA_COPII, distantaCuUrechi(frezaExterioara(piesa), false));', 'urechi', 'copiile nu țin seama de urechi')
o('L02', PL, '  return Math.max(DISTANTA_COPII, distantaCuUrechi(frezaExterioara(piesa), cuUrechi(piesa)));',
  '  return distantaCuUrechi(frezaExterioara(piesa), cuUrechi(piesa));', 'urechi', 'copiile pierd distanța de 5 mm fără urechi')
o('C01', AC, '  const d = distantaPropusa(doc, ctx.selectie(), din);', '  const d = distantaPropusa(doc, [], din);', 'urechi',
  '„Mută și așază” nu urcă distanța ținută')
# Interfața (e2e).
o('E01', DA, '    const d = distantaPropusa(doc, alese.length > 0 ? alese : toate, idFoaie);',
  '    const d = distantaMinima(doc, alese.length > 0 ? alese : toate, idFoaie);', 'e2e', '«Așază pe foi» pornește de la freză, nu de la propunere')
o('E02', DA, '          {dprop > dmin ? (', '          {false ? (', 'e2e', 'nota urechilor lipsește')
o('E03', DA, "            <p className={sub ? 'aseaza-minim avertisment' : 'aseaza-minim'} role=\"status\" data-testid=\"aseaza-urechi\">",
  '            <p className="aseaza-minim" role="status" data-testid="aseaza-urechi">', 'e2e', 'avertismentul arată ca nota')
o('E04', DA, "              {t(sub ? 'aseaza.urechi.sub' : 'aseaza.urechi', { p: mm(dprop) })}", "              {t('aseaza.urechi', { p: mm(dprop) })}", 'e2e',
  'sub propunere, tot nota (fără avertisment)')
o('E05', DA, "{t('aseaza.minim', { d: mm(dmin) })}", "{t('aseaza.minim', { d: String(dmin) })}", 'e2e', 'minimul cu punct zecimal în română (3.175)')
o('E06', DC, "    const d = distantaPropusa(doc, [instanta.id], doc.foi[indexFoaie]?.id ?? '');", '    const d = 0;', 'e2e',
  '«Din CSV…» nu urcă distanța ținută')
o('E07', DC, '        {unde && prag !== null && <p', '        {false && <p', 'e2e', '«Din CSV…» fără avertisment sub propunere')

SETURI = {
    'urechi': ['test/unit/asezare.urechi.test.ts', 'test/unit/asezare.test.ts', 'test/unit/asezare.actiuni.test.ts', 'test/unit/pieseLegate.test.ts'],
}
E2E = ['test/e2e/asezare.spec.ts', 'test/e2e/placute-iesire.spec.ts']
