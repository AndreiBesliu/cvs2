# Lista de otrăvuri a feliei 3.Cj-1 (cama din atelierul Easy 3Draw; ADR 0284), 25.11.2026, alese de autor: motorul (marginile
# și implicitele, cele trei contururi, gaura, grosimea, prinderile, cotele date atelierului) și atelierul (familia și desenul,
# numele, câmpurile și marginile lor, forma și gaura alese, razele scrise).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


LG = 'extensii/trenulet/sursa/lego/lego.ts'
AT = 'extensii/trenulet/sursa/planificator/atelier.ts'
EN = 'extensii/trenulet/sursa/planificator/texte.en.json'

# --- motorul: marginile și implicitele
DI = 'const D = camp(d.diam, 10, 64, 16, x =>'
o('A01', LG, DI, 'const D = camp(d.diam, 10, 64, 20, x =>', 'cama', 'cama implicită are diametrul de bază 20')
o('A02', LG, DI, 'const D = camp(d.diam, 8, 64, 16, x =>', 'cama', 'diametrul de bază poate fi 8 (peretele găurii iese sub 1,6 mm)')
o('A03', LG, DI, 'const D = camp(d.diam, 10, 80, 16, x =>', 'cama', 'diametrul de bază poate fi 80')
CU = 'const c = camp(d.cursa, 1, 24, 8, x =>'
o('A04', LG, CU, 'const c = camp(d.cursa, 1, 24, 6, x =>', 'cama', 'cursa implicită e 6')
o('A05', LG, CU, 'const c = camp(d.cursa, 1, 30, 8, x =>', 'cama', 'cursa poate fi 30')
o('A06', LG, CU, 'const c = camp(d.cursa, 0.5, 24, 8, x =>', 'cama', 'cursa poate fi 0,5')
GR = 'const h = camp(d.grosime, 1, 20, 7.8, x =>'
o('A07', LG, GR, 'const h = camp(d.grosime, 1, 20, 3.8, x =>', 'cama', 'cama implicită e subțire')
o('A08', LG, GR, 'const h = camp(d.grosime, 1, 30, 7.8, x =>', 'cama', 'grosimea poate fi 30')
o('A09', LG, 'if (Number.isFinite(n) && (n < a - 1e-9 || n > b + 1e-9)) avert.push(ce(', 'if (Number.isFinite(n) && n > 1e9) avert.push(ce(', 'cama', 'o valoare adusă înapoi în margini nu mai e spusă')
o('A10', LG, 'const n = numarCerut(v), x = zecime(Math.min(b, Math.max(a, Number.isFinite(n) ? n : implicit)));', 'const n = numarCerut(v), x = Math.min(b, Math.max(a, Number.isFinite(n) ? n : implicit));', 'cama',
  'valorile nu se mai rotunjesc la zecimi')
FO = 'return { forma: d.forma === "para" || d.forma === "melc" ? d.forma : "excentric", D, R0: D / 2, c, h, gaura: d.gaura === "r" ? "r" : "x", avert };'
o('A11', LG, FO, FO.replace('d.forma === "para" || d.forma === "melc" ? d.forma', 'd.forma === "para" ? d.forma'), 'cama', 'melcul e făcut ca excentric')
o('A12', LG, FO, FO.replace('R0: D / 2', 'R0: D'), 'cama', 'raza de bază e cât diametrul')
o('A13', LG, FO, FO.replace('gaura: d.gaura === "r" ? "r" : "x"', 'gaura: "x"'), 'cama', 'gaura rotundă nu se mai poate cere')
o('A14', LG, FO, FO.replace(': "excentric", D,', ': "para", D,'), 'cama', 'forma necunoscută e para')
# --- motorul: contururile
EX = 'if (forma === "excentric") return cerc(c / 2, 0, R0 + c / 2, laturi(R0 + c / 2));'
o('A15', LG, EX, EX.replace('cerc(c / 2, 0,', 'cerc(c, 0,'), 'cama', 'excentricul are axul mutat cu toată cursa')
o('A16', LG, EX, EX.replace('cerc(c / 2, 0, R0 + c / 2,', 'cerc(c / 2, 0, R0 + c,'), 'cama', 'excentricul e mai mare cu jumătate de cursă')
o('A17', LG, EX, EX.replace('cerc(c / 2, 0,', 'cerc(-c / 2, 0,'), 'cama', 'excentricul are brațul lung pe partea cealaltă')
ME = 'for (let i = 0; i <= n; i++) { const u = 2 * Math.PI * i / n, r = R0 + c * i / n; p.push('
o('A18', LG, ME, ME.replace('r = R0 + c * i / n', 'r = R0 + c * (n - i) / n'), 'cama', 'melcul coboară în loc să urce')
o('A19', LG, ME, ME.replace('r = R0 + c * i / n', 'r = R0 + c * Math.sqrt(i / n)'), 'cama', 'melcul nu urcă liniar')
o('A20', LG, ME, ME.replace('r = R0 + c * i / n', 'r = R0 + c / 2 + c / 2 * i / n'), 'cama', 'melcul pornește de la jumătatea cursei')
PA = 'const rn = Math.max(2, R0 / 2), dn = R0 + c - rn, a = Math.acos((R0 - rn) / dn), p: Poli = [];'
o('A21', LG, PA, PA.replace('rn = Math.max(2, R0 / 2)', 'rn = Math.max(2, R0 / 4)'), 'cama', 'nasul perei e mai ascuțit')
o('A22', LG, PA, PA.replace('dn = R0 + c - rn', 'dn = R0 + c'), 'cama', 'vârful nasului trece de cursă cu raza lui')
o('A23', LG, PA, PA.replace('Math.acos((R0 - rn) / dn)', 'Math.acos((R0 + rn) / dn)'), 'cama', 'tangentele perei sunt cele încrucișate')
o('A24', LG, 'for (let k = 0; k <= M; k++) { const u = a + (2 * Math.PI - 2 * a) * k / M; p.push([R0 * Math.cos(u), R0 * Math.sin(u)]); }',
  'for (let k = 0; k <= M; k++) { const u = a + (2 * Math.PI - 2 * a) * k / M; p.push([(R0 - 0.3) * Math.cos(u), (R0 - 0.3) * Math.sin(u)]); }', 'cama', 'cercul de bază al perei e mai mic cu 0,3 mm')
EV = 'const m = 2 * Math.max(4, Math.ceil(laturi(rn) * a / Math.PI / 2)), M = 2 * Math.ceil(laturi(R0) * (Math.PI - a) / Math.PI / 2);'
o('A25', LG, EV, EV.replace('M = 2 * Math.ceil(laturi(R0) * (Math.PI - a) / Math.PI / 2);', 'M = 2 * Math.ceil(laturi(R0) * (Math.PI - a) / Math.PI / 2) + 1;'), 'cama', 'spatele perei nu mai e un vârf (piesa iese mai scurtă)')
o('A26', LG, EV, EV.replace('const m = 2 * Math.max(4, Math.ceil(laturi(rn) * a / Math.PI / 2)),', 'const m = 3,'), 'cama', 'nasul perei e din trei laturi')
o('A27', LG, 'const laturi = (R: number) => Math.max(N_CERC, 8 * Math.ceil(Math.PI / Math.acos(1 - 0.02 / R) / 8));\n    if (forma === "excentric")',
  'const laturi = (R: number) => N_CERC;\n    if (forma === "excentric")', 'cama', 'camele mari sunt din 48 de laturi (săgeata trece de 0,06 mm)')
# --- motorul: piesa
GA = 'const g = q.gaura === "r" ? cerc(0, 0, e.gauraD / 2) : cruce(0, 0, e.axGauraD, e.axGauraLat);\n    // prinderile: gaura de pe ax'
o('A28', LG, GA, GA.replace('q.gaura === "r" ?', 'q.gaura !== "r" ?'), 'cama', 'gaura de ax și cea rotundă sunt încurcate')
o('A29', LG, GA, GA.replace('cruce(0, 0, e.axGauraD, e.axGauraLat)', 'cruce(1, 0, e.axGauraD, e.axGauraLat)'), 'cama', 'crucea e mutată cu 1 mm de pe ax')
CO = 'return { tri: prismaGauri(conturCama(q.forma, q.R0, q.c), [g], 0, q.h), avert: q.avert, prinderi: prinderiButuc(q.gaura, q.h) };'
o('A30', LG, CO, CO.replace('[g], 0, q.h)', '[], 0, q.h)'), 'cama', 'cama n-are gaură')
o('A31', LG, CO, CO.replace('[g], 0, q.h)', '[g], 0, q.h + 1)'), 'cama', 'cama e mai groasă cu 1 mm')
o('A32', LG, CO, CO.replace('prinderiButuc(q.gaura, q.h)', 'prinderiButuc(q.gaura, q.h / 2)'), 'cama', 'prinderea e dată pe jumătate din grosime')
o('A33', LG, CO, CO.replace('prinderiButuc(q.gaura, q.h)', 'prinderiButuc("x", q.h)'), 'cama', 'gaura rotundă e dată drept gaură de ax')
o('A34', LG, CO, CO.replace('avert: q.avert', 'avert: []'), 'cama', 'avertismentele nu ajung la om')
CE = 'gaura: q.gaura, razaMica: q.R0, razaMare: q.R0 + q.c }; },'
o('A35', LG, CE, CE.replace('razaMare: q.R0 + q.c', 'razaMare: q.R0 + q.c / 2'), 'cama', 'raza mare dată atelierului e cu jumătate de cursă mai mică')
o('A36', LG, CE, CE.replace('razaMica: q.R0', 'razaMica: q.D'), 'cama', 'raza mică dată atelierului e diametrul')
o('A37', LG, 'clema, maner, bara, bila, cupa, rotita, cremaliera, cama, roata,', 'clema, maner, bara, bila, cupa, rotita, cremaliera, roata,', 'cama', 'motorul nu știe piesa')

# --- atelierul: tabelele
o('T01', AT, '["cremaliera", "Cremalieră"], ["cama", "Camă"], ', '["cremaliera", "Cremalieră"], ', 'tabele', 'cama nu e în nicio familie')
o('T02', AT, '    cama: `<path d="M8 4.2a7.9 7.9 0 0 0 0 15.6l9.6-3.3a4.8 4.8 0 0 0 0-9z"/><path d="M8 10v4M6 12h4"/>`,\n', '', 'tabele', 'cama n-are desen')
o('T03', EN, ' "Camă pară": "Pear cam",\n', '', 'tabele', 'un nume al camei lipsește din dicționar')
# --- atelierul: prin browser
o('E01', AT, 'cama: { forma: "excentric", diam: 16, cursa: 8, grosime: 7.8, gaura: "x" },', 'cama: { forma: "excentric", diam: 16, cursa: 6, grosime: 7.8, gaura: "x" },', 'e2e', 'cama se deschide cu cursa 6')
NU = 'return tr`${f} Ø${fmt(q.diam)}, cursa ${fmt(q.cursa)}` + (q.grosime === 7.8 ? "" : tr`, ${fmt(q.grosime)} mm`) + (q.gaura === "r" ? tr(", gaură rotundă") : "");'
o('E02', AT, NU, NU.replace('q.grosime === 7.8 ? ""', 'q.grosime === 3.8 ? ""'), 'e2e', 'numele spune grosimea obișnuită și o tace pe cea subțire')
o('E03', AT, NU, NU.replace(' + (q.gaura === "r" ? tr(", gaură rotundă") : "")', ''), 'e2e', 'numele nu spune gaura rotundă')
o('E04', AT, NU, NU.replace('cursa ${fmt(q.cursa)}', 'cursa ${fmt(q.diam)}'), 'e2e', 'numele scrie diametrul în locul cursei')
o('E05', AT, 'f = q.forma === "para" ? tr("Camă pară") : q.forma === "melc" ? tr("Camă melc") : tr("Camă excentrică");', 'f = q.forma === "melc" ? tr("Camă melc") : tr("Camă excentrică");', 'e2e', 'para e numită excentrică')
o('E06', AT, 'camp("#at-cam-diam", 10, 64, v => { p.diam = v; });', 'camp("#at-cam-diam", 5, 64, v => { p.diam = v; });', 'e2e', 'câmpul primește diametrul 9')
o('E07', AT, 'camp("#at-cam-diam", 10, 64, v => { p.diam = v; });', 'camp("#at-cam-diam", 10, 70, v => { p.diam = v; });', 'e2e', 'câmpul primește diametrul 65')
o('E08', AT, 'camp("#at-cam-cursa", 1, 24, v => { p.cursa = v; });', 'camp("#at-cam-cursa", 0.1, 24, v => { p.cursa = v; });', 'e2e', 'câmpul primește cursa 0,5')
o('E09', AT, 'camp("#at-cam-cursa", 1, 24, v => { p.cursa = v; });', 'camp("#at-cam-cursa", 1, 30, v => { p.cursa = v; });', 'e2e', 'câmpul primește cursa 25')
o('E10', AT, 'camp("#at-cam-grosime", 1, 20, v => { p.grosime = v; });', 'camp("#at-cam-grosime", 0.1, 30, v => { p.grosime = v; });', 'e2e', 'câmpul primește orice grosime')
o('E11', AT, 'camp("#at-cam-grosime", 1, 20, v => { p.grosime = v; });', 'camp("#at-cam-grosime", 1, 20, v => { p.diam = v; });', 'e2e', 'grosimea scrisă schimbă diametrul')
o('E12', AT, 'if (v >= a && v <= b) { f(Math.round(v * 10) / 10); schimbat(); } editor(); }; };\n      const alege = (id: string, f: (v: string) => void) => { $(id).onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; f(b.dataset.v!); editor(); schimbat(); }; };\n      camp("#at-cam-diam"',
  'if (v >= a && v <= b) { f(v); schimbat(); } editor(); }; };\n      const alege = (id: string, f: (v: string) => void) => { $(id).onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; f(b.dataset.v!); editor(); schimbat(); }; };\n      camp("#at-cam-diam"',
  'e2e', 'câmpul ține sutimile scrise')
o('E13', AT, 'alege("#at-cam-forma", v => { p.forma = v; });', 'alege("#at-cam-forma", v => { p.forma = v === "melc" ? "para" : v; });', 'e2e', 'melcul ales face o pară')
o('E14', AT, 'alege("#at-cam-gaura", v => { p.gaura = v; });', 'alege("#at-cam-gaura", () => { p.gaura = "x"; });', 'e2e', 'gaura rotundă nu se poate alege')
IN = 'tr`Marginea stă între ${fmt(q.razaMica)} și ${fmt(q.razaMare)} mm de ax: un tachet sprijinit pe ea urcă și coboară ${fmt(q.cursa)} mm la fiecare tură.`'
o('E15', AT, IN, IN.replace('${fmt(q.razaMare)} mm de ax', '${fmt(q.razaMica)} mm de ax'), 'e2e', 'textul scrie raza mică de două ori')
o('E16', AT, IN, IN.replace('coboară ${fmt(q.cursa)} mm', 'coboară ${fmt(q.razaMare)} mm'), 'e2e', 'textul scrie raza mare în locul cursei')
o('E17', AT, 'const cum = q.forma === "para" ? tr("Stă pe cercul de bază', 'const cum = q.forma === "melc" ? tr("Stă pe cercul de bază', 'e2e', 'textul perei e pus la melc')
o('E18', AT, '<label for="at-cam-cursa">Cursa (mm)<input id="at-cam-cursa" type="number" min="1" max="24" step="0.1" value="${q.cursa}"></label>',
  '<label for="at-cam-cursa">Cursa (mm)<input id="at-cam-cursa" type="number" min="1" max="24" step="0.1" value="${q.diam}"></label>', 'e2e', 'câmpul cursei arată diametrul')
o('E19', AT, 'seg("at-cam-gaura", [["x", "Pentru ax"], ["r", "Rotundă"]], q.gaura)', 'seg("at-cam-gaura", [["x", "Pentru ax"], ["r", "Rotundă"]], "x")', 'e2e', 'gaura aleasă nu se vede apăsată')

SETURI = {
    'cama': ['test/unit/trenulet.cama.test.ts', 'test/unit/trenulet.prinderi.test.ts'],
    'tabele': ['test/unit/trenulet.familii.test.ts', 'test/unit/trenulet.pictograme.test.ts', 'test/unit/trenulet.engleza.test.ts', 'test/unit/trenulet.tipuri.test.ts'],
}
E2E = ['test/e2e/trenulet.cama.spec.ts']
