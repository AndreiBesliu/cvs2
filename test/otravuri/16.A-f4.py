# Lista de otrăvuri a feliei 16.A↑f-4 (marginea profilată pe o parte; ADR 0304 §4), 27.11.2026, aleasă de autor: marginea pe
# hârtie (fundul plat, înălțimea, retragerea muchiei), regula formei pe o parte, raza drumului în lucrare (profilul și
# verificarea invariantei), refuzurile lucrării, regula ferestrei, rândul „pe hârtie” și, în fereastră, nota retragerii și
# motivul adâncimii. Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit (setul `e2e` cere
# `.tmp/pw.config.ts` în clonă).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


PM = 'src/model/profilMargine.ts'
FF = 'src/model/formaFrezei.ts'
JB = 'src/cam/job.ts'
ER = 'src/ui/exportRand.ts'
HE = 'src/app/hartieExport.ts'
DE = 'src/ui/DialogExport.tsx'
FO = 'src/ui/FisaOperatie.tsx'

# ── Marginea pe hârtie ───────────────────────────────────────────────────────────────────────────────────────────────
o('G01', PM, "  for (const [r, h] of p) {\n    if (h > 0) break;\n    r0 = r;", "  for (const [r, h] of p) {\n    if (h > 1e9) break;\n    r0 = r;", 'm',
  'fundul plat luat cât raza frezei: drumul ar fi al frezei întregi')
o('G02', PM, "  return p[p.length - 1]?.[1] ?? 0;", "  return p[0]?.[1] ?? 0;", 'm', 'înălțimea profilului 0: orice margine refuzată')
o('G03', PM, "    if (hb >= d) return (ha >= d ? ra : ra + ((rb - ra) * (d - ha)) / (hb - ha)) - r0;", "    if (hb >= d) return rb - r0;", 'm',
  'retragerea muchiei luată la capătul segmentului, fără interpolare')
# ── Regula formei ────────────────────────────────────────────────────────────────────────────────────────────────────
o('G04', FF, "    if (latura === 'pe-linie') return null;\n    if (!(fundProfil(forma.puncte) > 0)) return 'profil-fund';",
  "    if (latura === 'pe-linie') return null;", 'm', 'o siluetă fără fund plat lăsată pe o parte')
o('G05', FF, "o.adancime <= inaltimeProfil(forma.puncte) + 1e-9 ? null : 'profil-adancime';",
  "o.adancime <= 2 * inaltimeProfil(forma.puncte) ? null : 'profil-adancime';", 'm', 'adâncimea peste înălțimea profilului lăsată (treapta în piesă)')
o('G06', FF, "    if (tip !== 'profil') return 'profil';\n    if (latura === 'pe-linie') return null;",
  "    if (tip !== 'profil') return 'profil';\n    if (latura !== 'pe-linie') return 'profil';", 'm', 'marginea profilată refuzată, ca înainte de felie')
# ── Lucrarea ─────────────────────────────────────────────────────────────────────────────────────────────────────────
o('G07', JB, "t.latura !== 'pe-linie' ? fundProfil(t.scula.forma.puncte) : t.scula.diametru / 2);", "t.latura !== 'pe-linie' ? t.scula.diametru / 2 : t.scula.diametru / 2);", 'm',
  'drumul marginii cu raza frezei întregi (intră în piesă)')
o('G08', JB, "diametruScula: 2 * razaTraseu(u),", "diametruScula: u.scula.diametru,", 'm', 'profilul tăieturii cu diametrul frezei, nu cu fundul plat')
o('G09', JB, "pr.treceri[0]?.contururi ?? [], razaTraseu(t), pereti);", "pr.treceri[0]?.contururi ?? [], R * 0.1, pereti);", 'm',
  'invarianta judecată cu o rază mai mică decât a drumului: o margine care intră în piesă nu se mai vede')
o('G10', JB, "        if (o.urechi || o.colturi || o.intrari || o.despartire === true) {", "        if (o.urechi) {", 'm',
  'degajările, intrările și despărțirea lăsate pe marginea profilată (calculate cu raza frezei)')
o('G11', JB, "        if (motivRotunda === 'profil-adancime') {", "        if (motivRotunda === 'profil-adancime' && false) {", 'm',
  'refuzul adâncimii fără înălțimea profilului în motiv')
# ── Fereastra (partea pură) ──────────────────────────────────────────────────────────────────────────────────────────
o('G12', ER, "  if (d !== null && d > inaltimeProfilRand(puncte) + 1e-9) return 'adancime';", "  if (d !== null && d > 2 * inaltimeProfilRand(puncte)) return 'adancime';", 'm',
  'fereastra lasă marginea mai adâncă decât profilul')
o('G13', ER, "  if (!(fundProfilRand(puncte) > 0)) return 'fund';\n", '', 'm', 'fereastra lasă o siluetă fără fund plat pe o parte')
o('G14', ER, "  if (p.urechi || p.colturi !== '' || p.intrari || p.despartire) return 'optiuni';", "  if (p.urechi) return 'optiuni';", 'm',
  'fereastra lasă degajările, intrările și despărțirea pe marginea profilată')
o('G15', HE, "? { retragere: retragereMuchie(f.puncte, adancime) } : null;", "? { retragere: retragereMuchie(f.puncte, 0) } : null;", 'm',
  'rândul „pe hârtie” spune retragerea de la fața plăcii, nu de la adâncime')
o('G16', HE, "    const margine = f?.tip === 'profil' && i.peOParte === true && adancime !== null && adancime > 0",
  "    const margine = f?.tip === 'profil' && adancime !== null && adancime > 0", 'm', 'nota marginii și pe canelură')
# ── Fereastra (e2e) ──────────────────────────────────────────────────────────────────────────────────────────────────
o('G17', FO, "        {h.margine && (", "        {false && h.margine && (", 'e2e', 'fișa nu spune retragerea muchiei')
o('G18', DE, "    if (m === 'adancime') return t('motiv.profil-adancime', { inaltime: fmtFreza.format(inaltimeProfilRand(p.profil ?? [])) });\n", '', 'e2e',
  'refuzul adâncimii fără înălțimea profilului, în fereastră')

SETURI = {
    'm': ['test/unit/profil.margine.test.ts', 'test/unit/export.profil.test.ts', 'test/unit/canelura.profil.test.ts', 'test/unit/profil.lucrare.test.ts'],
    'e2e': ['test/e2e/export.profil.spec.ts'],
}
