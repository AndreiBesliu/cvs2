# Lista de otrăvuri a feliei 10.3↑e (Netezește; ADR 0180 §9, §11), 07.11.2026, alese de autor: colțurile (pragul, scara,
# capetele șirului), șirul drept, legăturile netede cu ce rămâne (început, capăt), vârful 0 al căii închise, mânerele duse
# înapoi în element, lungimile în lume, tangenta comună la despărțiri, toleranța laturii singure, numerele, refuzul și felul
# formei, matricea neuniformă, și trei legături din panou (e2e).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


T = 'src/model/netezire.ts'
C = 'src/model/conversie.ts'
P = 'src/app/PanouConversie.tsx'

# Colțurile.
o('N01', T, 'export const COLT_NETEZIRE = Math.PI / 3;', 'export const COLT_NETEZIRE = Math.PI / 2;', 'netezire',
  'colțurile doar peste 90° (pătratul se rotunjește)')
o('N02', T, 'export const SCARA_NETEZIRE = 4;', 'export const SCARA_NETEZIRE = 1;', 'netezire',
  'scara colțurilor = toleranța (treptele rămân colțuri)')
o('N03', T, '      const margine = !lant.ciclic && (sj < D || drum.lungime - sj < D);', '      const margine = false;', 'netezire',
  'întoarcerea se judecă și cu coarda trunchiată, la capătul șirului')
# Șirul drept.
o('N04', T, '      if (lc > 1e-12 && R.every((x) => Math.abs((x.x - a.x) * c.y - (x.y - a.y) * c.x) <= 1e-9 * Math.max(1, lc) * Math.max(1, lc))) continue;\n',
  '', 'netezire', 'un șir drept devine o cubică dreaptă')
# Legăturile netede cu ce rămâne.
o('N05', T, '      if (inainte && d0 && unghi(inainte, d0) <= COLT_NETEZIRE) t0 = inainte;\n', '', 'netezire',
  'legătura cu segmentul păstrat de dinainte nu mai e netedă')
o('N06', T, '      if (dupa && dq && unghi(dupa, dq) <= COLT_NETEZIRE) tq = dupa;\n', '', 'netezire',
  'legătura cu segmentul păstrat de după nu mai e netedă')
# Vârful 0.
o('N07', T, '      if (colt || (f.inchis && lant.idx[j] === 0)) rupturi.push({ j, colt });',
  '      if (colt) rupturi.push({ j, colt });', 'netezire', 'vârful 0 al căii închise se poate pierde în mijlocul unui șir')
# În element și în lume.
o('N08', T, "    rez.push(p.bez ? { ...x, s: { tip: 'C', c1: aplica(inv, p.bez[1]), c2: aplica(inv, p.bez[2]) } } : { ...x, s: { tip: 'L' } });",
  "    rez.push(p.bez ? { ...x, s: { tip: 'C', c1: p.bez[1], c2: p.bez[2] } } : { ...x, s: { tip: 'L' } });", 'netezire',
  'mânerele rămân în coordonatele foii')
o('N09', T, '    return linie && dist(W[k] as P, W[urm(k)] as P) <= pastreaza;',
  '    return linie && dist((v[k] as VarfDoc).p, (v[urm(k)] as VarfDoc).p) <= pastreaza;', 'netezire',
  'lungimea liniilor, în coordonatele elementului')
# Despărțirile și latura singură.
o('N10', T, '  potriveste(R, s, i1, tc, t2, tol, tan, out);', '  potriveste(R, s, i1, norm(sub(R[s + 1] as P, R[s] as P)) ?? tc, t2, tol, tan, out);',
  'netezire', 'tangenta la o despărțire nu mai e comună (frântură)')
o('N11', T, '    if (dev <= tol) return { de: i0, la: i0 + 1, bez, dev };', '    return { de: i0, la: i0 + 1, bez, dev };', 'netezire',
  'latura singură devine cubică și peste toleranță')
# Numerele.
o('N12', T, '          st.linii += p.la - p.de;', '          st.linii += 1;', 'netezire', 'liniile înlocuite, numărate pe curbe')
# Conversia.
o('N13', C, "  if (c.fel === 'netezire' && !pozitiv(c.pastreaza)) return { ok: false, motiv: 'valoare' };\n", '', 'netezire',
  '„Păstrează” 0 sau NaN nu se refuză')
o('N14', C, "  if (c.fel === 'netezire') {\n    if (nod.forma.tip !== 'cale') return null;\n", "  if (c.fel === 'netezire') {\n", 'netezire',
  'cercurile și dreptunghiurile (formele lor) ajung la netezire')
o('N15', C, "  if (c.fel === 'netezire') {\n    if (nod.forma.tip !== 'cale') return null;\n",
  "  if (c.fel === 'netezire') {\n    if (nod.forma.tip !== 'cale') return null;\n    if (!esteSimilitudine(e.matrice)) { st.sarite++; return null; }\n",
  'netezire', 'un element întins neuniform se sare')
# Panoul (e2e).
o('U01', P, "onClick={() => { ruleaza(cerereNetezire); }}", "onClick={() => { ruleaza(cerereArce); }}", 'e2e',
  'butonul Netezește trimite cererea Arce')
o('U02', P, "t('editare.conversie.gata.netezire', { n, linii: String(r.linii), curbe: String(r.curbe), a })",
  "t('editare.conversie.gata.netezire', { n, linii: String(r.curbe), curbe: String(r.linii), a })", 'e2e', 'numerele netezirii, inversate')
o('U03', P, "  const motivNetezire = tn === null ? t('editare.conversie.motiv.toleranta') : lp === null ? t('editare.conversie.motiv.valoare') : null;",
  "  const motivNetezire = tn === null ? t('editare.conversie.motiv.toleranta') : null;", 'e2e', '„Păstrează” greșit nu se spune')

SETURI = {
    'netezire': ['test/unit/conversie.netezire.test.ts', 'test/unit/conversie.netezire.oracol.test.ts'],
    'netezire2': ['test/unit/conversie.netezire.test.ts', 'test/unit/conversie.netezire.oracol.test.ts', 'test/unit/conversie.test.ts',
                  'test/unit/conversie.oracol.test.ts', 'test/unit/actiuni.calcul.test.ts'],
}
E2E = ['test/e2e/conversie.spec.ts']
