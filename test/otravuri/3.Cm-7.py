# Lista de otrăvuri a feliei 3.Cm-7 (duza Kort; ADR 0340; auditul elicelor, constatarea 8, răspunsul 4a), 27.11.2026, alese de
# autor: motorul (`duzaCote`: jocul, lungimea și cât cuprinde elicea, gura, gulerul, urechile pe grilă, mesajele; `duzaKort`:
# profilul, orientarea fețelor, urechile și găurile lor, prinderile; legătura cu elicea de barcă) și atelierul (piesa în
# editor, câmpurile și urechile ei, definiția duzei și a elicei, numele, textul, „Fă elicea cu duza”).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


LG = 'extensii/trenulet/sursa/lego/lego.ts'
AT = 'extensii/trenulet/sursa/planificator/atelier.ts'

# --- motorul: cotele
o('K01', LG, '    const bucsa = P.pas / 2 - 0.2, Ri = e.R + joc, sus = bucsa + e.Hh;', '    const bucsa = P.pas / 2 - 0.2, Ri = e.R, sus = bucsa + e.Hh;', 'duza', 'interiorul fără joc (paletele ating duza)')
o('K02', LG, '    const bucsa = P.pas / 2 - 0.2, Ri = e.R + joc, sus = bucsa + e.Hh;', '    const bucsa = P.pas / 2 - 0.2, Ri = e.R + joc, sus = e.Hh;', 'duza', 'elicea socotită fără bucșă (iese din duză)')
o('K03', LG, '    const L = Math.ceil(Math.max(lung * e.D, sus + KORT.peste) * 10 - 1e-9) / 10,', '    const L = Math.ceil(lung * e.D * 10 - 1e-9) / 10,', 'duza', 'lungimea nu crește ca să cuprindă elicea')
o('K04', LG, 'zi = KORT.gura * L, f = KORT.evazare * zi;', 'zi = KORT.gura * L, f = 0.6 * zi;', 'duza', 'gura prea evazată (peste 45°: cere suport)')
o('K05', LG, '    const tb = Math.min(KORT.tbMax, Math.max(KORT.tbMin, KORT.tbRap * e.D)), Rout0 = Ri + f + tb;', '    const tb = Math.max(KORT.tbMin, KORT.tbRap * e.D), Rout0 = Ri + f + tb;', 'duza', 'gulerul fără plafon (Ø120: 9,6)')
o('K06', LG, '    const k = Math.ceil((Rout0 + ef().lamajD / 2 + 0.4) / P.pas - 1e-9);', '    const k = Math.ceil((Rout0 + ef().gauraD / 2) / P.pas - 1e-9);', 'duza', 'urechile prea aproape: lamajul taie gulerul')
o('K07', LG, '    const joc = campElice(avert, d.joc, 0.3, 2, KORT.joc,', '    const joc = campElice([], d.joc, 0.3, 2, KORT.joc,', 'duza', 'jocul, strâns în tăcere')
o('K08', LG, '    const lung = campElice(avert, d.lungime, 0.3, 0.8, KORT.lungime,', '    const lung = campElice(avert, d.lungime, 0.3, 1, KORT.lungime,', 'duza', 'lungimea până la 1 × diametrul')
o('K09', LG, ' && urechi !== +(d.urechi as number)) avert.push(tr("O duză Kort are 2 sau 4 urechi: am făcut-o cu 2."));', ') avert.push(tr("O duză Kort are 2 sau 4 urechi: am făcut-o cu 2."));', 'duza', 'urechile spuse și la 2 sau 4')
o('K10', LG, '    const e = eliceBarcaCote(d), avert = [...e.avert];', '    const e = eliceBarcaCote(d), avert: string[] = [];', 'duza', 'duza nu spune ce e al elicei')
# --- motorul: plasa
o('M01', LG, '    const rin = (z: number) => (z < q.zi ? q.Ri + q.f * (1 - z / q.zi) ** 2 : q.Ri);', '    const rin = (z: number) => (z < q.zi ? q.Ri + q.f * (1 - z / q.zi) : q.Ri);', 'duza', 'gura dreaptă, nu rotunjită (racordul cu interiorul e o muchie)')
o('M02', LG, '    const rin = (z: number) => (z < q.zi ? q.Ri + q.f * (1 - z / q.zi) ** 2 : q.Ri);', '    const rin = (z: number) => (z < q.zi ? q.Ri + q.f * (z / q.zi) ** 2 : q.Ri);', 'duza', 'gura întoarsă (largă sus, nu pe masă)')
o('M03', LG, '    const rout = (z: number) => (z <= g ? q.Rout0 : q.Rout0 - (q.Rout0 - (q.Ri + KORT.tSus)) * (z - g) / (q.L - g));', '    const rout = (z: number) => q.Rout0;', 'duza', 'peretele nesubțiat (exteriorul drept)')
o('M04', LG, '        tri.push([pt(o0, i, z0), pt(o0, i + 1, z0), pt(o1, i + 1, z1)], [pt(o0, i, z0), pt(o1, i + 1, z1), pt(o1, i, z1)]);', '        tri.push([pt(o0, i, z0), pt(o1, i + 1, z1), pt(o0, i + 1, z0)], [pt(o0, i, z0), pt(o1, i, z1), pt(o1, i + 1, z1)]);', 'duza', 'exteriorul cu fețele întoarse')
o('M05', LG, '    const xh = P.pas * q.k, rs = q.Ri + q.f + 0.6, prinderi: Prindere[] = [];', '    const xh = P.pas * q.k + 0.5, rs = q.Ri + q.f + 0.6, prinderi: Prindere[] = [];', 'duza', 'urechile în afara grilei')
o('M06', LG, '      prinderi.push(...prinGaura("gauraStift", [cx, cy, g], [cx, cy, 0], undefined, P.lamaj_h));', '', 'duza', 'urechile fără prinderi')
o('M07', LG, '    if (d.piesa === "duza") return duzaKort(d);\n', '', 'duza', 'piesa duza face elicea')
o('M08', LG, '      const fi = 2 * Math.PI * j / q.urechi, rot', '      const fi = Math.PI * j / q.urechi, rot', 'duza', 'urechile adunate pe o parte')
# --- atelierul
o('A01', AT, '      if (p.piesa === "duza") { delete p.sens; delete p.gaura; delete p.capac; } else { delete p.piesa; delete p.joc; delete p.lungime; delete p.urechi; }', '      if (p.piesa === "duza") { delete p.sens; delete p.gaura; delete p.capac; } else { delete p.piesa; delete p.joc; delete p.lungime; }', 'e2e', 'elicea cu urechile duzei în definiție (altă linie în listă)')
o('A02', AT, '      if (p.piesa === "duza") { delete p.sens; delete p.gaura; delete p.capac; } else', '      if (p.piesa === "duza") { delete p.sens; delete p.gaura; } else', 'e2e', 'duza cu capacul elicei în definiție')
o('A03', AT, '    if (d.tip === "eliceBarca" && d.piesa === "duza") {', '    if (d.tip === "eliceBarca" && d.piesa === "duzaKort") {', 'e2e', 'duza cu numele elicei')
o('A04', AT, '      return tr`Duză Kort Ø${fmt(2 * q.Ri, 1)} × ${fmt(q.L, 1)}, cu ${q.urechi} urechi`;', '      return tr`Duză Kort Ø${fmt(2 * q.R, 1)} × ${fmt(q.L, 1)}, cu ${q.urechi} urechi`;', 'e2e', 'numele cu diametrul elicei, nu al interiorului')
o('A05', AT, '    const lunga = q.L > Math.ceil(q.lung * q.D * 10 - 1e-9) / 10 + 1e-9 ? " " + tr`Mai lungă', '    const lunga = q.L > Math.ceil(q.lung * q.D * 10 - 1e-9) / 10 + 1e-9 && false ? " " + tr`Mai lungă', 'e2e', 'nu spune că duza a crescut')
o('A06', AT, 'Urechile, la ${8 * q.k} mm de ax (${stf}).`', 'Urechile, la ${8 * q.k} mm de ax.`', 'e2e', 'textul fără știfturi')
o('A07', AT, '      alege("#at-eb-urechi", v => { p.urechi = +v; });\n', '', 'e2e', 'urechile nu se schimbă')
o('A08', AT, '        campElice("#at-eb-joc", p, "joc", 1, 0.3, 2, cote);', '        campElice("#at-eb-joc", p, "joc", 0, 0.3, 2, cote);', 'e2e', 'jocul la întreg (1,5 → 2)')
o('A09', AT, '        campElice("#at-eb-lung", p, "lungime", 2, 0.3, 0.8, cote);', '        campElice("#at-eb-lung", p, "lungime", 2, 0.3, 1, cote);', 'e2e', 'lungimea până la 1 în editor (0,9 intră fără mesaj)')
o('A10', AT, '      const cote = (d: Record<string, unknown>) => (duza ? Lego.duzaCote(d) : Lego.eliceBarcaCote(d));', '      const cote = (d: Record<string, unknown>) => Lego.eliceBarcaCote(d);', 'e2e', 'mesajul jocului lipsește (cotele elicei n-au joc)')
o('A11', AT, '    pune(defCurenta("eliceBarca", { ...stare.eliceBarca, piesa: "elice" }), n);\n', '', 'e2e', '„Fă elicea cu duza” pune doar duza')

SETURI = {
    'duza': ['test/unit/trenulet.duza.test.ts'],
}
# și proba listelor vechi ale elicei de barcă (aceleași chei ale elicei, 3.Tt)
E2E = ['test/e2e/trenulet.duza.spec.ts', 'test/e2e/trenulet.pupa.spec.ts']
# pagina se face din surse în spec: build-ul aplicației nu o schimbă (docs/otravuri.md)
E2E_BUILD = False
for x in O:
    assert x['vechi'] != x['nou'], x['id']
