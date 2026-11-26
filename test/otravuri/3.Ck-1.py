# Lista de otrăvuri a feliei 3.Ck-1 (placa turnantă a atelierului Easy 3Draw; ADR 0284, partea B), 26.11.2026, alese de
# autor: motorul (`turnantaCote`: mărimea, piesa, jocul și mesajele lor; `turnanta`: baza plină cu fața netedă, pivotul cu
# fanta, partea de sus ca placa cu gaură, prinderile) și atelierul (galeria, numele, editorul, piesa din editor, „Fă placa
# turnantă”, textul pivotului).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


LG = 'extensii/trenulet/sursa/lego/lego.ts'
AT = 'extensii/trenulet/sursa/planificator/atelier.ts'

# --- motorul: marginile și mesajele
o('M01', LG, 'marime = Number.isFinite(m) && m >= 3 ? 4 : 2', 'marime = Number.isFinite(m) && m > 3 ? 4 : 2', 'turnanta', 'mărimea 3 iese de 2 × 2')
o('M02', LG, 'if (Number.isFinite(m) && m !== 2 && m !== 4) avert.push', 'if (Number.isFinite(m) && m !== 2) avert.push', 'turnanta', 'mărimea 4 primește mesaj')
o('M03', LG, 'piesa = d.piesa === "sus" ? "sus" : "baza";', 'piesa = d.piesa ? "sus" : "baza";', 'turnanta', 'orice piesă cerută e partea de sus')
o('M04', LG, 'const j = zecimalCerut(d.joc), joc = Number.isFinite(j) ? Math.min(0.2, Math.max(-0.1, Math.round(j * 20) / 20)) || 0 : 0;\n    if (piesa === "baza"', 'const j = zecimalCerut(d.joc), joc = Number.isFinite(j) ? Math.min(0.2, Math.max(-0.1, Math.round(j * 10) / 10)) || 0 : 0;\n    if (piesa === "baza"', 'turnanta', 'jocul, din zecime în zecime')
o('M05', LG, 'const j = zecimalCerut(d.joc), joc = Number.isFinite(j) ? Math.min(0.2, Math.max(-0.1, Math.round(j * 20) / 20)) || 0 : 0;\n    if (piesa === "baza"', 'const j = zecimalCerut(d.joc), joc = Number.isFinite(j) ? Math.min(0.3, Math.max(-0.1, Math.round(j * 20) / 20)) || 0 : 0;\n    if (piesa === "baza"', 'turnanta', 'jocul urcă până la 0,3')
o('M06', LG, 'const j = zecimalCerut(d.joc), joc = Number.isFinite(j) ? Math.min(0.2, Math.max(-0.1, Math.round(j * 20) / 20)) || 0 : 0;\n    if (piesa === "baza"', 'const j = zecimalCerut(d.joc), joc = Number.isFinite(j) ? Math.min(0.2, Math.max(-0.2, Math.round(j * 20) / 20)) || 0 : 0;\n    if (piesa === "baza"', 'turnanta', 'jocul coboară până la −0,2')
o('M07', LG, 'if (piesa === "baza" && Number.isFinite(j) && (j < -0.1 - 1e-9', 'if (Number.isFinite(j) && (j < -0.1 - 1e-9', 'turnanta', 'partea de sus primește mesajul jocului')
o('M08', LG, '|| j > 0.2 + 1e-9)) avert.push(tr`Jocul pivotului', '|| j > 0.1)) avert.push(tr`Jocul pivotului', 'turnanta', 'un joc bun (0,15) primește mesaj')
o('M09', LG, 'return { ...sus, avert: [...sus.avert, ...q.avert] };', 'return sus;', 'turnanta', 'partea de sus pierde mesajul mărimii')
# --- motorul: pivotul, baza, partea de sus
o('M10', LG, 'r: P.stift_technic_d / 2 - joc,', 'r: P.stift_technic_d / 2 + joc,', 'turnanta', 'jocul îngroașă pivotul')
o('M11', LG, 'hp: P.placa - 0.1,', 'hp: P.placa,', 'turnanta', 'pivotul ajunge la fața părții de sus')
o('M12', LG, 'gauraD: ef().gauraD, avert };', 'gauraD: P.gaura_d, avert };', 'turnanta', 'gaura scrisă nu urmează calibrarea')
o('M13', LG, 'c = P.pas * n / 2, H = P.placa, celule = randCelule(n, n);', 'c = P.pas * n / 2 + 0.5, H = P.placa, celule = randCelule(n, n);', 'turnanta', 'pivotul mutat din mijloc')
o('M14', LG, 'const sus = caramida({ celule, placi: 1, gauri: [[n / 2, n / 2, "r"]] });', 'const sus = caramida({ celule, placi: 1, gauri: [[n / 2, n / 2, "x"]] });', 'turnanta', 'partea de sus cu gaură de ax')
o('M15', LG, 'const baza = caramida({ celule, placi: 1, stifturi: false, fund: "locasuri" })', 'const baza = caramida({ celule, placi: 1, stifturi: true, fund: "locasuri" })', 'turnanta', 'baza cu știfturi pe fața de sus')
o('M16', LG, 'const baza = caramida({ celule, placi: 1, stifturi: false, fund: "locasuri" })', 'const baza = caramida({ celule, placi: 1, stifturi: false })', 'turnanta', 'baza goală dedesubt (pivotul pe un tub gol)')
o('M17', LG, ' tri = [...baza.tri], f2 = 0.4, N = 64,', ' tri = [...baza.tri], f2 = 0.2, N = 64,', 'turnanta', 'fanta de 0,4 mm')
o('M18', LG, ' tri = [...baza.tri], f2 = 0.4, N = 64,', ' tri = [...baza.tri], f2 = 0.4, N = 8,', 'turnanta', 'pivotul colțuros')
o('M19', LG, 'a0 = Math.acos(f2 / q.r);', 'a0 = Math.acos(f2 / q.r) - 0.2;', 'turnanta', 'brațele mai înguste (fanta lărgită spre margini)')
o('M20', LG, 'tri.push(...prisma(brat.map(([x, y]): P2 => [c + x, c + y]), H - 0.01, H + q.hp), ', 'tri.push(...prisma(brat.map(([x, y]): P2 => [c + x, c + y]), H + 0.01, H + q.hp), ', 'turnanta', 'un braț nu mai e lipit de placă')
o('M21', LG, ', ...prisma(brat.map(([x, y]): P2 => [c - x, c - y]), H - 0.01, H + q.hp));', ');', 'turnanta', 'un singur braț')
o('M22', LG, '{ fel: "stiftTechnic", p: [c, c, H], d: SUS, lung: q.hp }', '{ fel: "stiftTechnic", p: [c, c, H], d: JOS, lung: q.hp }', 'turnanta', 'pivotul declarat în jos')
o('M23', LG, '{ fel: "stiftTechnic", p: [c, c, H], d: SUS, lung: q.hp }', '{ fel: "stiftTechnic", p: [c, c, H], d: SUS, lung: H }', 'turnanta', 'pivotul declarat cât o placă')
o('M24', LG, '{ fel: "stiftTechnic", p: [c, c, H], d: SUS, lung: q.hp }', '{ fel: "stiftTechnic", p: [c, c, 0], d: SUS, lung: q.hp }', 'turnanta', 'rădăcina pivotului sub placă')
o('M25', LG, 'prinderi: [...baza.prinderi, { fel: "stiftTechnic"', 'prinderi: [{ fel: "stiftTechnic"', 'turnanta', 'baza fără locașuri')
o('M26', LG, 'arc, cadru, turnanta, balama,', 'arc, cadru, balama,', 'turnanta', 'motorul nu știe piesa')
o('M27', LG, 'jocRadial: (q.gauraD - 2 * q.r) / 2,', 'jocRadial: (q.gauraD - 2 * q.r),', 'turnanta', 'jocul de jur împrejur, pe diametru')

# --- atelierul
o('A01', AT, ' ["turnanta", "Placă turnantă"],', '', 'e2e', 'piesa lipsește din galerie')
o('A02', AT, '    turnanta: { piesa: "baza", marime: 2, joc: 0 },', '    turnanta: { piesa: "baza", marime: 2, joc: 0.05 },', 'e2e', 'jocul de pornire nu e 0')
o('A03', AT, '    turnanta: { piesa: "baza", marime: 2, joc: 0 },', '    turnanta: { piesa: "baza", marime: 4, joc: 0 },', 'e2e', 'mărimea de pornire, 4 × 4')
o('A04', AT, '(q.piesa === "sus" ? tr("partea de sus") : tr("baza"))', '(q.piesa === "sus" ? tr("baza") : tr("partea de sus"))', 'e2e', 'numele pieselor, întoarse')
o('A05', AT, '+ (q.piesa === "baza" && q.joc ? tr`, jocul ${fmt(q.joc, 2)}` : "");', '+ (q.joc ? tr`, jocul ${fmt(q.joc, 2)}` : "");', 'e2e', 'partea de sus își spune jocul')
o('A06', AT, 'if (q.piesa === "baza" && q.joc) p.joc = q.joc; else delete p.joc; }', 'if (q.joc) p.joc = q.joc; else delete p.joc; }', 'e2e', 'partea de sus își ține jocul (alt rând în listă)')
o('A07', AT, '    pune(defCurenta("turnanta", { ...stare.turnanta, piesa: "sus" }), n);\n', '', 'e2e', '„Fă placa turnantă” pune doar baza')
o('A08', AT, '    pune(defCurenta("turnanta", { ...stare.turnanta, piesa: "sus" }), n);', '    pune(defCurenta("turnanta", { ...stare.turnanta, piesa: "baza" }), n);', 'e2e', '„Fă placa turnantă” pune două baze')
o('A09', AT, '        ${baza ? `<div class="at-campuri"><label for="at-tu-joc">', '        ${true ? `<div class="at-campuri"><label for="at-tu-joc">', 'e2e', 'câmpul jocului și la partea de sus')
o('A10', AT, 'if (baza) $("#at-tu-joc").onchange = ev => { const v = Math.round(+(ev.target as HTMLInputElement).value * 20) / 20 || 0;', 'if (baza) $("#at-tu-joc").onchange = ev => { const v = Math.round(+(ev.target as HTMLInputElement).value * 10) / 10 || 0;', 'e2e', 'jocul din editor, din zecime în zecime')
o('A11', AT, 'if (v >= -0.1 && v <= 0.2) { p.joc = v; schimbat(); } editor(); };\n      $("#at-tu-fa")', 'if (v >= -0.2 && v <= 0.2) { p.joc = v; schimbat(); } editor(); };\n      $("#at-tu-fa")', 'e2e', 'un joc sub margine e primit')
o('A12', AT, 'if (v >= -0.1 && v <= 0.2) { p.joc = v; schimbat(); } editor(); };\n      $("#at-tu-fa")', 'if (v >= -0.1 && v <= 0.3) { p.joc = v; schimbat(); } editor(); };\n      $("#at-tu-fa")', 'e2e', 'un joc peste margine e primit')
o('A13', AT, 'iar gaura din calibrare, Ø${fmt(q.gauraD, 2)} mm: ${fmt(q.jocRadial, 3)} mm de jur împrejur.`', 'iar gaura din calibrare, Ø${fmt(q.gauraD, 2)} mm: ${fmt(q.jocRadial, 2)} mm de jur împrejur.`', 'e2e', 'jocul de jur împrejur, rotunjit la sutimi')
o('A14', AT, '      alege("#at-tu-marime", v => { p.marime = +v; });', '      alege("#at-tu-marime", v => { p.marime = 2; });', 'e2e', 'mărimea nu se schimbă')
o('A15', AT, '      alege("#at-tu-piesa", v => { p.piesa = v; });', '      alege("#at-tu-piesa", v => { p.piesa = "baza"; });', 'e2e', 'piesa nu se schimbă')
o('A16', AT, "    turnanta: `<path d=\"M3 21h18v-3.5h-18z\"/>", "    turnanta_: `<path d=\"M3 21h18v-3.5h-18z\"/>", 'pictograme', 'fără pictogramă')
o('A17', AT, 'toast(tr`${n} × placa turnantă (baza și partea de sus) în listă.`);', 'toast(tr`${n} × placa turnantă în listă.`);', 'e2e', 'mesajul nu spune piesele')
o('A18', AT, '      $("#at-tu-fa").onclick = adaugaTurnanta;', '', 'e2e', '„Fă placa turnantă” nu face nimic')

SETURI = {
    'turnanta': ['test/unit/trenulet.turnanta.test.ts', 'test/unit/trenulet.prinderi.test.ts'],
    # fiecare piesă din FAMILII are desenul ei: proba unitară a pictogramelor (galeria arată altfel desenul generic)
    'pictograme': ['test/unit/trenulet.pictograme.test.ts'],
}
E2E = ['test/e2e/trenulet.turnanta.spec.ts', 'test/e2e/trenulet.pictograme.spec.ts', 'test/e2e/trenulet.file.spec.ts']
# pagina și pachetul se fac din surse în spec: build-ul aplicației nu le schimbă (docs/otravuri.md)
E2E_BUILD = False
for x in O:
    assert x['vechi'] != x['nou'], x['id']
