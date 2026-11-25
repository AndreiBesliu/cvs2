# Lista de otrăvuri a feliei 3.Ce (punctele de prindere și „Se prinde cu”, în atelierul Easy 3Draw; ADR 0284), 25.11.2026,
# alese de autor: motorul (ajutoarele prinderilor, montajul, rezumatul și potrivirile, prinderile fiecărei familii de piese)
# și atelierul (panoul: când apare, ce numără, ce piese propune, lungimea axului și a știftului, grinda perechii, traducerile).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


LG = 'extensii/trenulet/sursa/lego/lego.ts'
AT = 'extensii/trenulet/sursa/planificator/atelier.ts'
EN = 'extensii/trenulet/sursa/planificator/texte.en.json'

# --- motorul: ce se prinde cu ce, ajutoarele
o('P01', LG, '["capatAx", "gauraAx"], ["capatAx", "gauraStift"],', '["capatAx", "gauraAx"],', 'prinderi', 'axul nu se mai prinde în gaura de știft')
o('P02', LG, '["bara", "clema"], ["bara", "gauraBara"], ["bila", "cupa"]];', '["bara", "clema"], ["bara", "gauraBara"], ["bila", "locas"]];', 'prinderi', 'bila se prinde în locaș, nu în cupă')
o('P03', LG, 'new Set(["stift", "stiftTechnic", "capatAx", "bara", "bila"]);', 'new Set(["stift", "stiftTechnic", "capatAx", "bila"]);', 'prinderi', 'bara nu mai e tată: la montaj, clema e luată drept tată')
UNA = 'return [una(a, d), una(b, [-d[0] || 0, -d[1] || 0, -d[2] || 0])];'
o('P04', LG, UNA, 'return [una(a, d), una(b, d)];', 'prinderi', 'a doua gură a unei găuri privește în aceeași parte ca prima')
o('P05', LG, 'const lung = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]), d: P3 = [(a[0] - b[0]) / lung,', 'const lung = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) / 2, d: P3 = [(a[0] - b[0]) / (2 * lung),',
  'prinderi', 'gaura care trece are jumătate din lungime')
o('P06', LG, 'fel === "gauraStift" && lamaj > 0 ? { fel, p, d: dir, lung, lamaj }', 'fel === "gauraStift" && lamaj > 99 ? { fel, p, d: dir, lung, lamaj }', 'prinderi', 'nicio gaură nu-și mai spune lamajul')
o('P07', LG, '(fel === "gauraAx" && r ? { fel, p, d: dir, lung, r } :', '(fel === "gauraAx" && r ? { fel, p, d: dir, lung } :', 'prinderi', 'gaura de ax nu-și spune brațul')
o('P08', LG, 'return l.map(c => ({ ...c, p: f(c.p), d: dir(c.p, c.d), ...(c.r ? { r: dir(c.p, c.r) } : {}) }));', 'return l.map(c => ({ ...c, p: f(c.p), d: c.d, ...(c.r ? { r: dir(c.p, c.r) } : {}) }));',
  'prinderi', 'direcțiile nu se mută cu piesa întoarsă (cărămida cu găuri laterale, pe y)')
o('P09', LG, 'l.map(c => ({ ...c, p: [c.p[0] + dx, c.p[1] + dy, c.p[2] + dz] }));', 'l.map(c => ({ ...c, p: [c.p[0] + dx, c.p[1] + dy, c.p[2]] }));', 'prinderi', 'mutarea prinderilor uită înălțimea')
o('P10', LG, 'const x = (g[1]![0] + g[2]![0]) / 2 - c[0], y = (g[1]![1] + g[2]![1]) / 2 - c[1], l = Math.hypot(x, y);', 'const x = (g[0]![0] + g[1]![0]) / 2 - c[0], y = (g[0]![1] + g[1]![1]) / 2 - c[1], l = Math.hypot(x, y);',
  'prinderi', 'brațul crucii e luat pe colț, nu pe vârful brațului')
o('P11', LG, 'return inchisaSus ? [{ ...l[1]!, orb: true }] : l;', 'return l;', 'prinderi', 'gaura de sub con sau capac e dată ca una care trece')
o('P12', LG, 'const l = prinGaura(gaura === "r" ? "gauraStift" : gaura === "b" ? "gauraBara" : "gauraAx", [0, 0, h], [0, 0, 0], brat);',
  'const l = prinGaura(gaura === "r" ? "gauraAx" : gaura === "b" ? "gauraBara" : "gauraAx", [0, 0, h], [0, 0, 0], brat);', 'prinderi', 'gaura rotundă a unei roți e dată drept gaură de ax')
o('P13', LG, 'const a = (2 * j + 1) * Math.PI / (6 * k), x = P.pas * k * Math.cos(a), y = P.pas * k * Math.sin(a);\n      out.push(...prinGaura("gauraStift", [x, y, tp], [x, y, 0]));',
  'const a = (2 * j) * Math.PI / (6 * k), x = P.pas * k * Math.cos(a), y = P.pas * k * Math.sin(a);\n      out.push(...prinGaura("gauraStift", [x, y, tp], [x, y, 0]));', 'prinderi', 'găurile feței sunt rotite cu 30°')
o('P14', LG, 'if (fata === "stift") for (const k of cercuriStift(rh, rb)) for (let j = 0; j < 6 * k; j++) {\n      const a = (2 * j + 1)',
  'if (fata === "stift") for (const k of cercuriStift(rh, rb)) for (let j = 0; j < 4 * k; j++) {\n      const a = (2 * j + 1)', 'prinderi', 'fața are patru găuri pe cerc, nu șase')
# --- motorul: montajul
o('M01', LG, 'const tinta: P3 = [-a.d[0], -a.d[1], -a.d[2]], k = vectorial(b.d, tinta)', 'const tinta: P3 = [a.d[0], a.d[1], a.d[2]], k = vectorial(b.d, tinta)', 'prinderi', 'montajul pune direcțiile la fel, nu opuse')
o('M02', LG, 'R = rotatie([p[0] / l, p[1] / l, p[2] / l], -1, 0);', 'R = rotatie([p[0] / l, p[1] / l, p[2] / l], 1, 0);', 'prinderi', 'două direcții deja egale nu se mai întorc (nicio jumătate de tură)')
o('M03', LG, 'if (a.r && b.r) {\n      // brațul lui b', 'if (a.r && b.r && a.lung < 0) {\n      // brațul lui b', 'prinderi', 'crucile nu se mai potrivesc singure')
o('M04', LG, 'if (unghi) { const u = unghi * Math.PI / 180;', 'if (unghi) { const u = unghi;', 'prinderi', 'unghiul montajului e luat în radiani')
o('M05', LG, 'const afara = tata.fel === "bila" ? 0 : tata.lung - (mama.orb ? Math.min(tata.lung, mama.lung) : tata.lung);', 'const afara = 0;', 'prinderi', 'un ax lung intră cu totul într-o gaură oarbă')
o('M06', LG, 'const rest = afara - Math.min(tata.guler ?? 0, mama.lamaj ?? 0), q = roteste(R, b.p);', 'const rest = afara - (tata.guler ?? 0), q = roteste(R, b.p);', 'prinderi', 'gulerul intră și unde nu e lamaj')
o('M07', LG, 'const rest = afara - Math.min(tata.guler ?? 0, mama.lamaj ?? 0), q = roteste(R, b.p);', 'const rest = afara, q = roteste(R, b.p);', 'prinderi', 'gulerul nu intră în lamaj')
o('M08', LG, 'return { m: R, t: [a.p[0] + a.d[0] * rest - q[0], a.p[1] + a.d[1] * rest - q[1], a.p[2] + a.d[2] * rest - q[2]] };',
  'return { m: R, t: [a.p[0] - a.d[0] * rest - q[0], a.p[1] - a.d[1] * rest - q[1], a.p[2] - a.d[2] * rest - q[2]] };', 'prinderi', 'ce rămâne afară e pus înăuntru (semnul întors)')
o('M09', LG, 'if (!sePrind(a.fel, b.fel)) throw new Error(tr("Prinderile astea nu se prind una cu alta."));', '', 'prinderi', 'montajul primește și două prinderi care nu se prind')
o('M10', LG, 'const tata = TATA.has(a.fel) ? a : b, mama = tata === a ? b : a;', 'const tata = a, mama = b;', 'prinderi', 'montajul crede că prima prindere e mereu tatăl')
o('M11', LG, 'R = inmulteste(rotatie(tinta, co, si), R);', 'R = inmulteste(rotatie(tinta, co, -si), R);', 'prinderi', 'crucile se rotesc în sensul greșit')
# --- motorul: rezumatul, potrivirile, lungimile
o('R01', LG, '{ luate.add(i); luate.add(j); cate--; }', '{ luate.add(i); luate.add(j); }', 'prinderi', 'cele două guri ale unei găuri se numără de două ori')
# (R02 de la prima rulare scotea verificarea „oarbă” din pereche: echivalentă, fiindcă două găuri oarbe nu ajung una la gura
# celeilalte; verificarea a ieșit din cod, iar otrava e acum alta)
o('R02', LG, '- b.p[2]) < 0.01) { luate.add(i); luate.add(j); cate--; }', '- b.p[2]) < 100) { luate.add(i); luate.add(j); cate--; }', 'prinderi',
  'două găuri oarbe de pe aceeași dreaptă sunt luate drept o gaură care trece')
o('R03', LG, 'if (PE_O_TIJA.has(fel)) cate = new Set(c.map(cheieDreapta)).size;', 'if (PE_O_TIJA.has(fel)) cate = c.length;', 'prinderi', 'axul se numără de două ori (câte un capăt)')
o('R04', LG, 'const s = (c.d.find(x => Math.abs(x) > 1e-6) ?? 1) < 0 ? -1 : 1, d: P3', 'const s = 1, d: P3', 'prinderi', 'cele două capete ale unui ax nu mai sunt pe aceeași dreaptă')
o('R05', LG, 'for (const x of are(a)) for (const y of are(b)) if (sePrind(x, y)) out.push([x, y]);', 'for (const x of are(a)) for (const y of are(b)) if (sePrind(x, y)) out.push([y, x]);', 'prinderi',
  'potrivirile sunt date pe dos (felul celeilalte piese întâi)')
AXP = 'Math.ceil((Math.max(...g.map(c => c.lung)) + P.pas + 0.2) / P.pas - 1e-9)'
o('R06', LG, AXP, 'Math.ceil((Math.max(...g.map(c => c.lung)) + 0.2) / P.pas - 1e-9)', 'prinderi', 'axul potrivit nu mai iese din piesă')
o('R07', LG, AXP, 'Math.ceil((Math.min(...g.map(c => c.lung)) + P.pas + 0.2) / P.pas - 1e-9)', 'prinderi', 'axul potrivit e după gaura cea mai scurtă')
o('R08', LG, 'const g = l.filter(c => c.fel === "gauraAx" || c.fel === "gauraStift");\n    return g.length ? Math.min(12,', 'const g = l.filter(c => c.fel === "gauraAx");\n    return g.length ? Math.min(12,', 'prinderi',
  'axul nu se mai potrivește unei găuri de știft')
o('R09', LG, 'return g.length ? (g.some(c => c.lung > P.pas + 0.5) ? 3 : 2) : null;', 'return g.length ? (g.some(c => c.lung > P.pas - 0.5) ? 3 : 2) : null;', 'prinderi', 'știftul de 3 și prin grinda de 7,8')
o('R10', LG, 'const g = l.filter(c => c.fel === "gauraStift");\n    return g.length ? (g.some(', 'const g = l.filter(c => c.fel === "gauraStift" || c.fel === "gauraAx");\n    return g.length ? (g.some(', 'prinderi',
  'știftul se potrivește și unei găuri de ax')
o('R11', LG, AXP, 'Math.ceil((Math.max(...g.map(c => c.lung)) + P.pas + 0.2) / P.pas)', 'prinderi', 'axul prin grinda de 7,8 iese de 3 (rotunjirea)')
o('R12', LG, 'mutaPrinderi(r.prinderi, -a[0], -a[1], -a[2]) };', 'r.prinderi };', 'prinderi', 'prinderile rămân în coordonatele dinaintea mutării în origine')
# --- motorul: cărămizile
o('C01', LG, 'const adanc = fund === "tuburi" ? H - P.sus : Math.min(P.locas_h, H - 0.8);', 'const adanc = fund === "tuburi" ? H : Math.min(P.locas_h, H - 0.8);', 'prinderi', 'locașul cărămizii goale ține cât toată înălțimea')
o('C02', LG, 'for (const [x, y] of sus) prinderi.push({ fel: "stift", p: [x, y, H], d: SUS, lung: P.stift_h });\n    if (goi)', 'for (const [x, y] of sus) prinderi.push({ fel: "stift", p: [x, y, H + P.stift_h], d: SUS, lung: P.stift_h });\n    if (goi)',
  'prinderi', 'rădăcina știftului e la vârful lui')
o('C03', LG, 'const sus: P2[] = cuStifturi === "mijloc" ? [[centre.reduce((t, c) => t + c[0], 0) / n, centre.reduce((t, c) => t + c[1], 0) / n]] : cuStifturi ? centre : [];',
  'const sus: P2[] = cuStifturi === "mijloc" ? [centre[0]!] : cuStifturi ? centre : [];', 'prinderi', 'știftul din mijloc e dat pe prima celulă')
o('C04', LG, 'prinderi.push({ fel: "gauraBara", p: [x, y, H + P.stift_h], d: SUS, lung: H + P.stift_h });\n    return { tri, avert, prinderi };', 'prinderi.push({ fel: "gauraBara", p: [x, y, H], d: SUS, lung: H });\n    return { tri, avert, prinderi };',
  'prinderi', 'gaura de bară începe sub știft')
o('C05', LG, 'const felGaura = (t: string): "gauraAx" | "gauraStift" => (t === "x" ? "gauraAx" : "gauraStift");', 'const felGaura = (t: string): "gauraAx" | "gauraStift" => (t !== "x" ? "gauraAx" : "gauraStift");', 'prinderi',
  'găurile de ax și de știft sunt încurcate')
o('C06', LG, 'const pr = drept ? r.prinderi : axePrinderi(r.prinderi, ([x, y, z]) => [y, x, z]);', 'const pr = r.prinderi;', 'prinderi', 'cărămida cu găuri laterale pe y își ține prinderile pe x')
o('C07', LG, 'prinderi: mutaPrinderi(pr, s * Math.min(...xs), s * Math.min(...ys), 0) };', 'prinderi: pr };', 'prinderi', 'cărămida cu găuri laterale mutată pe grilă își lasă prinderile în colț')
o('C08', LG, 'for (let k = 0; k < q.n; k++) prinderi.push({ fel: "stift", p: [s * k + s / 2, s / 2, q.H], d: SUS, lung: P.stift_h });', 'for (let k = 1; k < q.n - 1; k++) prinderi.push({ fel: "stift", p: [s * k + s / 2, s / 2, q.H], d: SUS, lung: P.stift_h });',
  'prinderi', 'arcul uită știfturile picioarelor')
o('C09', LG, 'const prinderi: Prindere[] = picioare.prinderi.filter(c => c.fel === "locas");', 'const prinderi: Prindere[] = [];', 'prinderi', 'arcul n-are locașuri')
o('C10', LG, 'prinderi.push({ fel: "stift", p: [s * i + s / 2, j0, zc], d: [0, -1, 0], lung: P.stift_h });', 'prinderi.push({ fel: "stift", p: [s * i + s / 2, j0, zc + 1], d: [0, -1, 0], lung: P.stift_h });', 'prinderi',
  'știftul lateral e dat cu 1 mm mai sus')
o('C11', LG, 'prinderi.push({ fel: "stift", p: [s * i + s / 2, j0, zc], d: [0, -1, 0], lung: P.stift_h });', 'prinderi.push({ fel: "stift", p: [s * i + s / 2, j0, zc], d: PE_Y, lung: P.stift_h });', 'prinderi',
  'știftul lateral privește înăuntrul cărămizii')
o('C12', LG, 'prinderi.push({ fel: "stift", p: [s * i + s / 2, s - j0, zc], d: PE_Y, lung: P.stift_h });', '', 'prinderi', 'știfturile de pe fața a doua lipsesc')
o('C13', LG, 'prinderi.push({ fel: "locas", p: [c[0], c[1], 0], d: JOS, lung: ad, orb: true });\n      if (yc > ya)', 'prinderi.push({ fel: "locas", p: [c[0], c[1], 0], d: JOS, lung: P.locas_h + 2, orb: true });\n      if (yc > ya)',
  'prinderi', 'locașul pantei e dat mai adânc decât e')
o('C14', LG, 'for (const [x, y] of st) prinderi.push({ fel: "stift", p: [x, y, H], d: SUS, lung: P.stift_h });\n    const unghi = Math.atan2(H - buza, ys - yf) * 180 / Math.PI;\n    return { tri, avert: [...new Set(avert)], unghi, prinderi };',
  'const unghi = Math.atan2(H - buza, ys - yf) * 180 / Math.PI;\n    return { tri, avert: [...new Set(avert)], unghi, prinderi };', 'prinderi', 'panta n-are știfturi')
o('C15', LG, 'for (const [i, j] of celule) prinderi.push({ fel: "stift", p: [s * i + s / 2, s * j + s / 2, H], d: SUS, lung: P.stift_h });', 'for (const [i, j] of celule.slice(1)) prinderi.push({ fel: "stift", p: [s * i + s / 2, s * j + s / 2, H], d: SUS, lung: P.stift_h });',
  'prinderi', 'panta inversă uită un știft')
o('C16', LG, 'if (jos && jos.gaura) prinderi.push({ fel: "locas", p: [c[0], c[1], 0], d: JOS, lung: ad, orb: true });', 'if (jos) prinderi.push({ fel: "locas", p: [c[0], c[1], 0], d: JOS, lung: ad, orb: true });', 'prinderi',
  'locașul deschis spre marginea oblică e dat ca prindere')
o('C17', LG, 'for (const g of gv) prinderi.push(...prinGaura(felGaura(g.t), [g.c[0], g.c[1], H], [g.c[0], g.c[1], 0], PE_X));\n    if (!locasuri)', 'if (!locasuri)', 'prinderi', 'pana își uită găurile')
o('C18', LG, 'const s = P.pas, c: P2[] = diam === 1 ? [[cx, cy]] : [[s / 2, s / 2], [3 * s / 2, s / 2], [s / 2, 3 * s / 2], [3 * s / 2, 3 * s / 2]];', 'const c: P2[] = [[cx, cy]];', 'prinderi',
  'rotundul 2 × 2 are un singur locaș, în mijloc (acolo e tubul)')
o('C19', LG, 'else prinderi.push({ ...prinGaura(felGaura(g === "ax" ? "x" : "r"), [cx, cy, zOprita], [cx, cy, 0], PE_X)[1]!, orb: true });', 'else prinderi.push(...prinGaura(felGaura(g === "ax" ? "x" : "r"), [cx, cy, H], [cx, cy, 0], PE_X));',
  'rotund', 'sub un con prea îngust, gaura e dată ca una care trece')
o('C20', LG, 'prinderi.push({ fel: "stift", p: [cx, cy, H], d: SUS, lung: P.stift_h }); golSus = true; }', 'golSus = true; }', 'prinderi', 'știftul gol al rotundului nu e dat ca știft')
# --- motorul: grinzile și cărămida Technic
o('G01', LG, 'prinGaura(felGaura(t), [x, y, gros], [x, y, 0], PE_X, groasa ? P.lamaj_h : 0)); };', 'prinGaura(felGaura(t), [x, y, gros], [x, y, 0], PE_X, P.lamaj_h)); };', 'prinderi', 'grinda subțire își spune un lamaj pe care nu-l are')
o('G02', LG, 'gaura(P.grinda_lat / 2 + P.pas * k, P.grinda_lat / 2, t === "x" || t === "p" ? t : "r"); });', 'gaura(P.pas * k, P.grinda_lat / 2, t === "x" || t === "p" ? t : "r"); });', 'prinderi', 'găurile grinzii sunt date cu 3,6 mm mai la stânga')
o('G03', LG, 'const gaura = (x: number, y: number, t: string) => { if (t !== "p") prinderi.push(', 'const gaura = (x: number, y: number, t: string) => { if (t !== "q") prinderi.push(', 'prinderi', 'pasul plin al grinzii e dat ca gaură')
o('G04', LG, '[x, y, g], [x, y, 0], [Math.cos(u), Math.sin(u), 0], groasa ? h : 0)));', '[x, y, g], [x, y, 0], PE_X, groasa ? h : 0)));', 'prinderi', 'crucea de la cotul grinzii îndoite e dată dreaptă')
o('G05', LG, '[x, j0, P.technic_h], [x, s - j0, P.technic_h], PE_X, h));', '[x, j0, H / 2], [x, s - j0, H / 2], PE_X, h));', 'prinderi', 'găurile cărămizii Technic sunt date la mijlocul înălțimii')
o('G06', LG, '[x, j0, P.technic_h], [x, s - j0, P.technic_h], PE_X, h));', '[x, j0, P.technic_h], [x, s - j0, P.technic_h], PE_X, 0));', 'prinderi', 'cărămida Technic nu-și spune lamajul')
o('G07', LG, 'prinderi.push({ fel: "gauraBara", p: [x, y, H + P.stift_h], d: SUS, lung: P.stift_h, orb: true });', 'prinderi.push({ fel: "gauraBara", p: [x, y, H + P.stift_h], d: SUS, lung: P.stift_h });', 'prinderi',
  'gaura știftului gol al cărămizii Technic e dată ca una care trece')
o('G08', LG, 'prinderi.push({ fel: "locas", p: [c[0], c[1], 0], d: JOS, lung: Math.min(P.locas_h, zj - 0.4), orb: true });', 'prinderi.push({ fel: "locas", p: [c[0], c[1], 0], d: JOS, lung: zj + 0.5, orb: true });', 'prinderi',
  'locașul cărămizii Technic e dat mai adânc decât e')
# --- motorul: legăturile
CAP = 'const capat = (x0: number, x1: number): Prindere => ({ fel: "capatAx", p: [x0, d / 2, d / 2], d: [Math.sign(x1 - x0), 0, 0], lung: Math.abs(x1 - x0), r: PE_Y });'
o('L01', LG, CAP, CAP.replace('lung: Math.abs(x1 - x0)', 'lung: Math.abs(x1 - x0) / 2'), 'prinderi', 'axul e dat de jumătate din lungime')
o('L02', LG, 'prinderi: [capat(L - lo, 0)] };', 'prinderi: [capat(L, 0)] };', 'prinderi', 'axul cu opritor își dă rădăcina la capăt, nu pe fața opritorului')
o('L03', LG, 'prinderi: [capat(0, L), capat(L, 0)] };', 'prinderi: [capat(0, L)] };', 'prinderi', 'axul intră cu un singur capăt')
o('L04', LG, CAP, CAP.replace('r: PE_Y', 'r: [0, Math.SQRT1_2, Math.SQRT1_2]'), 'prinderi', 'brațul axului e dat pe diagonală')
ST1 = '{ fel: "stiftTechnic", p: [xa, 0, ax0], d: [-1, 0, 0], lung: xa, guler: gl / 2 };'
o('L05', LG, ST1, '{ fel: "stiftTechnic", p: [xg, 0, ax0], d: [-1, 0, 0], lung: xg, guler: gl / 2 };', 'prinderi', 'rădăcina știftului e la mijlocul gulerului, nu pe fața lui')
o('L06', LG, ST1, '{ fel: "stiftTechnic", p: [xa, 0, ax0], d: [-1, 0, 0], lung: xa, guler: gl };', 'prinderi', 'gulerul ar intra cu totul în lamaj')
o('L07', LG, 'cuBucsa ? { fel: "stiftTechnic", p: [xg, 0, ax0], d: [-1, 0, 0], lung: xg } :', 'cuBucsa ? { fel: "stiftTechnic", p: [xg, 0, ax0], d: [-1, 0, 0], lung: xg, guler: gl / 2 } :', 'prinderi',
  'știftul cu bucșă își spune un guler pe care nu-l are')
o('L08', LG, 'cuAx ? { fel: "capatAx", p: [xb, 0, ax0], d: PE_X, lung: L - xb, r: PE_Y, guler: gl / 2 } :', 'cuAx ? { fel: "stiftTechnic", p: [xb, 0, ax0], d: PE_X, lung: L - xb, guler: gl / 2 } :', 'prinderi',
  'capătul de ax al știftului e dat drept știft')
o('L09', LG, '{ fel: "gauraStift", p: [R, R, h], d: SUS, lung: h / 2, orb: true }];', '{ fel: "gauraStift", p: [R, R, h], d: SUS, lung: h / 2 }];', 'prinderi', 'jumătatea rotundă a conectorului e dată ca gaură care trece')
o('L10', LG, 'prinderi = [{ fel: "gauraAx", p: [R, R, 0], d: JOS, lung: h / 2, r: PE_X },', 'prinderi = [{ fel: "gauraAx", p: [R, R, 0], d: JOS, lung: h, r: PE_X },', 'prinderi', 'crucea conectorului e dată pe toată înălțimea')
o('L11', LG, 'else prinderi.push({ ...guri[capat0 ? 0 : 1]!, orb: true });', 'else prinderi.push(guri[capat0 ? 0 : 1]!);', 'prinderi', 'gaura în lung a conectorului e dată ca una care trece')
o('L12', LG, 'else prinderi.push({ ...guri[capat0 ? 0 : 1]!, orb: true });', 'else prinderi.push({ ...guri[capat0 ? 1 : 0]!, orb: true });', 'prinderi', 'gaura în lung își are gura în mijlocul blocului')
o('L13', LG, 'else if (axa === "o") prinderi.push(...prinGaura(fel, [cx, 0, m], [cx, g, m], PE_X, h));', 'else if (axa === "o") prinderi.push(...prinGaura(fel, [cx, m, g], [cx, m, 0], PE_X, h));', 'prinderi',
  'gaura de-a latul a conectorului e dată în sus')
o('L14', LG, 'const prinderi = invers ? mutaPrinderi(placa.prinderi, 0, 0, Hv - P.placa) : placa.prinderi;', 'const prinderi = placa.prinderi;', 'prinderi', 'suportul întors își lasă prinderile plăcii jos')
o('L15', LG, 'for (const x of xs) for (const z of zs) prinderi.push({ fel: "stift", p: [x, j0 - t, z], d: [0, -1, 0], lung: P.stift_h });', 'for (const x of xs) for (const z of zs) prinderi.push({ fel: "stift", p: [x, j0, z], d: [0, -1, 0], lung: P.stift_h });',
  'prinderi', 'știfturile suportului sunt date pe fața greșită a plăcii din față')
GURA = 'const gura: Prindere = { fel: felGaura(fel), p: [a2 * co, a2 * si, m], d: [co, si, 0], lung: a2 - a1, orb: true };'
o('L16', LG, GURA, GURA.replace('p: [a2 * co, a2 * si, m]', 'p: [a1 * co, a1 * si, m]'), 'prinderi', 'gura manșonului e dată la fundul lui')
o('L17', LG, GURA, GURA.replace('lung: a2 - a1, orb: true', 'lung: a2 - a1'), 'prinderi', 'manșonul e dat ca gaură care trece')
o('L18', LG, 'prinderi.push(fel === "x" ? { ...gura, r: SUS } : { ...gura, lamaj: h });', 'prinderi.push(fel === "x" ? { ...gura, r: [co, si, 0] } : { ...gura, lamaj: h });', 'prinderi', 'brațul crucii manșonului e dat de-a lungul lui')
o('L19', LG, 'prinderi.push(fel === "x" ? { ...gura, r: SUS } : { ...gura, lamaj: h });', 'prinderi.push(fel === "x" ? { ...gura, r: SUS } : gura);', 'prinderi', 'manșonul de știft nu-și spune lamajul')
o('L20', LG, 'const prinderi: Prindere[] = butuc === "p" ? [] : prinGaura(', 'const prinderi: Prindere[] = butuc === "q" ? [] : prinGaura(', 'prinderi', 'butucul plin e dat cu gaură')
o('L21', LG, 'prinderi.push(...prinGaura("clema", [xc - Lc / 2, j0 + qc, ro], [xc + Lc / 2, j0 + qc, ro]));', 'prinderi.push(...prinGaura("clema", [xc - Lc / 2, j0 + qc, 0], [xc + Lc / 2, j0 + qc, 0]));', 'prinderi',
  'clema culcată e dată pe masă, nu la înălțimea ei')
o('L22', LG, 'prinderi.push(...prinGaura("clema", [xc, j0 + qc, H], [xc, j0 + qc, 0]));', 'prinderi.push(...prinGaura("clema", [xc, j0, H], [xc, j0, 0]));', 'prinderi', 'clema în picioare e dată pe marginea plăcii')
o('L23', LG, 'const xa = pe[k]![1], xb = pe[k + 1]![0];', 'const xa = pe[k]![0], xb = pe[k + 1]![1];', 'prinderi', 'bara mânerului e dată cu brațele cu tot')
o('L24', LG, 'prinderi.push({ fel: "bara", p: [xc, yb, zl], d: JOS, lung: zl });', 'prinderi.push({ fel: "bara", p: [xc, yb, hb], d: JOS, lung: hb });', 'prinderi', 'bara mânerului în picioare e dată cu brațul cu tot')
o('L25', LG, 'const L = Math.max(1, Math.min(16, Math.round(lung))) * P.pas - 0.2, zb = P.bara_d / 2 - 0.25;', 'const L = Math.max(1, Math.min(16, Math.round(lung))) * P.pas - 0.2, zb = 0;', 'prinderi', 'axa barei e dată pe masă')
o('L26', LG, 'return { ...placa, prinderi: placa.prinderi.filter(c => c.fel === "locas") };', 'return placa;', 'prinderi', 'știfturile de sub bilă și cupă sunt date ca prinderi')
o('L27', LG, 'prinderi.push({ fel: "bila", p: [c, c, zc], d: SUS, lung: P.bila_d });', 'prinderi.push({ fel: "bila", p: [c, c, zc - 1], d: SUS, lung: P.bila_d });', 'prinderi', 'centrul bilei e dat cu 1 mm mai jos')
o('L28', LG, 'p: [c, c, Math.max(zc, z1 + P.bila_d / 2)], d: SUS, lung: e.cupaD });', 'p: [c, c, zc], d: SUS, lung: e.cupaD });', 'prinderi', 'bila e pusă în centrul găurii cupei: intră în fundul ei plat')
o('L29', LG, 'p: [c, c, Math.max(zc, z1 + P.bila_d / 2)], d: SUS, lung: e.cupaD });', 'p: [c, c, Math.max(zc, z1 + P.bila_d / 2)], d: SUS, lung: P.bila_d });', 'prinderi', 'cupa își dă diametrul bilei')
# --- motorul: roțile, șenila, elicele
o('W01', LG, 'const prinderi = g.length ? prinderiButuc(gaura, h, bratCruce(g[0]!, [0, 0])) : [];', 'const prinderi = g.length ? prinderiButuc(gaura, h) : [];', 'prinderi', 'crucea rotită a roții de 8 e dată dreaptă')
o('W02', LG, 'const prinderi = g.length ? prinderiButuc(gaura, h, bratCruce(g[0]!, [0, 0])) : [];', 'const prinderi = prinderiButuc(gaura, h);', 'prinderi', 'roata în care gaura nu încape o dă totuși')
o('W03', LG, 'prinderi.push(...prinGaura("gauraStift", [c[0], y0, c[1]], [c[0], y1, c[1]], undefined, h));', 'prinderi.push(...prinGaura("gauraStift", [c[0], y0, c[1]], [c[0], y1, c[1]]));', 'prinderi', 'cremaliera cu găuri nu-și spune lamajul')
o('W04', LG, 'prinderi.push(...prinGaura("gauraStift", [c[0], y0, c[1]], [c[0], y1, c[1]], undefined, h));', 'prinderi.push(...prinGaura("gauraStift", [c[0], y0, g], [c[0], y1, g], undefined, h));', 'prinderi',
  'găurile cremalierei sunt date prea sus')
o('W05', LG, 'tri.push(...placa.tri); prinderi = placa.prinderi; jos = P.placa - 0.01; }', 'tri.push(...placa.tri); jos = P.placa - 0.01; }', 'prinderi', 'cremaliera pe știfturi n-are locașuri')
o('W06', LG, 'prinderi: [...prinderiButuc(gaura, W), ...prinderiFata(fata, rh, rb, tp)] };', 'prinderi: [...prinderiButuc(gaura, W / 2), ...prinderiFata(fata, rh, rb, tp)] };', 'prinderi', 'gaura roții e dată pe jumătate din lățime')
o('W07', LG, 'return { tri, avert, prinderi: [...prinderiButuc(gaura, hb), ...prinderiFata(fata, rh, rb, tp)] };', 'return { tri, avert, prinderi: prinderiButuc(gaura, hb) };', 'prinderi', 'fulia își uită găurile de știft de pe față')
o('W08', LG, 'return { tri, avert, prinderi: [...prinderiButuc(gaura, hb), ...prinderiFata(fata, rh, rb, tp)] };', 'return { tri, avert, prinderi: [...prinderiButuc(gaura, W), ...prinderiFata(fata, rh, rb, tp)] };', 'prinderi',
  'gaura fuliei e dată fără butucul care trece de obadă')
o('W09', LG, 'return { tri, avert, prinderi: prinderiButuc(g.length ? gaura : "nu", hb) };', 'return { tri, avert, prinderi: prinderiButuc(g.length ? gaura : "nu", hb / 2) };', 'prinderi', 'gaura roții conice e dată pe jumătate')
o('W10', LG, 'return { tri, avert, prinderi: prinderiButuc(gaura, butuc === "scurt" ? tT : 2 * zp) };', 'return { tri, avert, prinderi: prinderiButuc(gaura, butuc === "scurt" ? 2 * zp : tT) };', 'prinderi',
  'butucul lung și cel scurt al coroanei sunt încurcate')
o('W11', LG, 'prinderi: G.g.length ? prinderiButuc(gaura, w, bratCruce(G.g[0]!, [0, 0])) : [] };', 'prinderi: G.g.length ? prinderiButuc(gaura, w / 2, bratCruce(G.g[0]!, [0, 0])) : [] };', 'prinderi', 'gaura conicei duble e dată pe jumătate')
o('W12', LG, 'prinderi.push({ fel: "bara", p: [-xn, 0, S.zb], d: PE_X, lung: 2 * xn }, { fel: "bara", p: [xn, 0, S.zb], d: [-1, 0, 0], lung: 2 * xn });',
  'prinderi.push({ fel: "bara", p: [-xn, 0, S.zb], d: PE_X, lung: 2 * xn + 3 }, { fel: "bara", p: [xn, 0, S.zb], d: [-1, 0, 0], lung: 2 * xn + 3 });', 'prinderi', 'bolțul zalei e dat mai lung decât e liber')
o('W13', LG, 'prinderi.push(...prinGaura("clema", [x0, yc, S.zb], [x1, yc, S.zb]));', 'prinderi.push(...prinGaura("clema", [x0, 0, S.zb], [x1, 0, S.zb]));', 'prinderi', 'fălcile zalei sunt date pe bolț')
o('W14', LG, 'const prinderi: Prindere[] = gauriStift === "nu" ? [] : [-S.gauraX, S.gauraX]', 'const prinderi: Prindere[] = gauriStift === "da" ? [] : [-S.gauraX, S.gauraX]', 'prinderi', 'zala cu găuri nu le dă, cea fără le dă')
o('W15', LG, 'prinderi: G.g.length ? prinderiButuc(gaura, SENILA.butucZ, bratCruce(G.g[0]!, [0, 0])) : [] };', 'prinderi: G.g.length ? prinderiButuc(gaura, SENILA.disc, bratCruce(G.g[0]!, [0, 0])) : [] };', 'prinderi',
  'gaura pinionului de șenilă e dată doar prin disc')
BUT = 'const prinderi = G.g.length ? prinderiButuc(fel, inchisSus ? Hh - 0.1 : Hh, bratCruce(G.g[0]!, [0, 0]), inchisSus) : [];'
o('W16', LG, BUT, BUT.replace(', inchisSus) : [];', ') : [];'), 'prinderi', 'sub con, gaura elicei e dată ca una care trece')
o('W17', LG, BUT, BUT.replace('inchisSus ? Hh - 0.1 : Hh', 'inchisSus ? Hh + 2 : Hh'), 'prinderi', 'sub con, gaura elicei e dată mai adâncă decât e')
o('W18', LG, 'const fel = gaura === "b" || gaura === "r" || gaura === "nu" ? gaura : "x";', 'const fel = gaura === "r" || gaura === "nu" ? gaura : "x";', 'elice', 'elicea pe bară e făcută cu gaură de ax')
o('W19', LG, 'const tri = paleteElice(statii, z, semn), butuc = butucElice(rh, Hh, d.gaura, d.con === "da");', 'const tri = paleteElice(statii, z, semn), butuc = butucElice(rh, Hh, d.gaura);', 'prinderi', 'conul nu închide gaura elicei')
o('W20', LG, 'butuc = butucElice(rh, Hh, d.gaura, d.capac === "da");', 'butuc = butucElice(rh, Hh, d.gaura);', 'prinderi', 'capacul nu închide gaura elicei de barcă')
URE = 'prinGaura("gauraStift", [xh * Math.cos(f), xh * Math.sin(f), P.grinda_groasa], [xh * Math.cos(f), xh * Math.sin(f), 0], undefined, P.lamaj_h))'
o('W21', LG, URE, URE.replace('undefined, P.lamaj_h', 'undefined, 0'), 'prinderi', 'urechile carcasei nu-și spun lamajul')
o('W22', LG, 'const xh = P.pas * q.k, urechi = Array.from({ length: q.urechi }, (_, j) => 2 * Math.PI * j / q.urechi);', 'const xh = P.pas * (q.k - 1), urechi = Array.from({ length: q.urechi }, (_, j) => 2 * Math.PI * j / q.urechi);',
  'prinderi', 'găurile urechilor sunt date cu un pas mai aproape de ax')
o('W23', LG, 'const xh = P.pas * q.k, urechi = Array.from({ length: q.urechi }, (_, j) => 2 * Math.PI * j / q.urechi);', 'const xh = P.pas * q.k, urechi = Array.from({ length: 2 }, (_, j) => 2 * Math.PI * j / q.urechi);',
  'prinderi', 'carcasa cu patru urechi dă doar două găuri')

# --- atelierul: panoul
o('E01', AT, 'pr = vedere === "piesa" && !privita ? prinderiCurente : [];', 'pr = !privita ? prinderiCurente : [];', 'e2e', 'panoul rămâne în vederea „Modelul”')
o('E02', AT, '`${cate} ${NUME_PRINDERI[fel]!()[cate === 1 ? 0 : 1]}`', '`${cate} ${NUME_PRINDERI[fel]!()[cate === 1 ? 1 : 0]}`', 'e2e', 'singularul și pluralul sunt încurcate')
o('E03', AT, '<span class="at-prinde-unde">${NUME_PRINDERI[fel]!()[cate === 1 ? 2 : 3]}</span>', '<span class="at-prinde-unde">${NUME_PRINDERI[fel]!()[3]}</span>', 'e2e', 'rândul unei singure prinderi e scris la plural')
o('E04', AT, 'if (!loc.open) { $("#at-prinde-lista").innerHTML = ""; return; }', '', 'e2e', 'închis, panoul socotește și pune piesele pe pagină')
o('E05', AT, 'if (k === tip || k === "placaTechnic") continue;', 'if (k === "placaTechnic") continue;', 'e2e', 'piesa de pe ecran se propune pe ea însăși')
o('E06', AT, 'if (!l.some(([x]) => x === k)) l.push([k, n]);', 'l.push([k, n]);', 'e2e', 'o piesă care se potrivește în două feluri apare de două ori pe rând')
o('E07', AT, 'if (ax) stare.ax.lung = ax;', '', 'e2e', 'axul se deschide cu lungimea de dinainte')
o('E08', AT, 'if (st) stare.stiftTechnic.lung = st;', '', 'e2e', 'știftul se deschide cu lungimea de dinainte')
o('E09', AT, 'if (ax) toast(tr`Ax de ${ax}: trece prin piesă și mai iese un pas.`);', '', 'e2e', 'axul nu spune de ce are lungimea asta')
o('E10', AT, 'const ax = k === "ax" ? Lego.axPentru(prinderiCurente) : null, st = k === "stiftTechnic" ? Lego.stiftPentru(prinderiCurente) : null;',
  'const ax = k === "ax" ? Lego.axPentru(prinderiCurente) : null, st = k === "stiftTechnic" ? 3 : null;', 'e2e', 'știftul se deschide mereu de 3')
GR = 'gauri: Math.abs(pasi - Math.round(pasi)) < 1e-6 && pasi >= 1 && pasi <= 14 ? Math.round(pasi) + 1 : 0 };'
o('E11', AT, GR, GR.replace('Math.round(pasi) + 1 : 0', 'Math.round(pasi) : 0'), 'e2e', 'grinda perechii are o gaură mai puțin')
o('E12', AT, GR, GR.replace('< 1e-6', '< 1'), 'e2e', 'și axele care nu cad pe grilă primesc o grindă')
o('E13', AT, 'celule: Array.from({ length: g.gauri }, (_, i): [number, number, string] => [i, 0, "r"]), groasa: true };', 'celule: Array.from({ length: g.gauri }, (_, i): [number, number, string] => [i, 0, "r"]), groasa: false };', 'e2e',
  'grinda perechii e subțire')
o('E14', AT, 'if (v >= 8 && v <= 80) { p.pereche = v; editor(); randeazaPrinde(); } };', 'if (v >= 8 && v <= 80) { p.pereche = v; editor(); } };', 'e2e', 'grinda perechii rămâne cea de dinainte când se schimbă perechea')
o('E15', AT, 'const def = defCurenta(tip), cheie = JSON.stringify([def, paramMotor()]), t = prinderiTinute.get(tip);', 'const def = defCurenta(tip), cheie = JSON.stringify(paramMotor()), t = prinderiTinute.get(tip);', 'e2e',
  'prinderile unei piese schimbate în editorul ei rămân cele ținute minte')
o('E16', AT, 'gauraStift: () => [tr("gaură de știft"), tr("găuri de știft"), tr("În gaura de știft"), tr("În găurile de știft")],\n    gauraAx: () => [tr("gaură de ax"), tr("găuri de ax"), tr("În gaura de ax"), tr("În găurile de ax")],',
  'gauraAx: () => [tr("gaură de știft"), tr("găuri de știft"), tr("În gaura de știft"), tr("În găurile de știft")],\n    gauraStift: () => [tr("gaură de ax"), tr("găuri de ax"), tr("În gaura de ax"), tr("În găurile de ax")],', 'e2e',
  'găurile de ax și de știft își schimbă numele între ele')
o('E17', AT, '<button type="button" data-prinde="${k}"><svg class="at-pict" viewBox="0 0 24 24" aria-hidden="true">${PICTOGRAME[k] ?? PICTOGRAMA_GENERICA}</svg>${n}</button>',
  '<button type="button" data-prinde="${k}">${n}</button>', 'e2e', 'butoanele panoului n-au pictogramă')
o('E18', AT, 'if (piese.length === 1) prinderiCurente = piese[0]!.prinderi ?? [];', 'if (piese.length === 1) prinderiCurente = [];', 'e2e', 'panoul nu mai apare la nicio piesă')
o('E19', AT, 'prinderiCurente = [];\n    if (vedere === "model") { randeazaPrinde(); return; }', 'if (vedere === "model") { randeazaPrinde(); return; }', 'e2e', 'o piesă fără prinderi ține panoul piesei de dinainte')
o('E20', AT, 'if (tip === "rotita") {\n      const g = grindaPereche();', 'if (tip === "rotita" || tip === "ax") {\n      const g = grindaPereche();', 'e2e', 'grinda perechii apare și la ax')
o('E21', AT, 'inlocuieste = null; golesteCautarea();\n    alegePiesa(k);', 'inlocuieste = null; golesteCautarea();', 'e2e', 'un clic pe o piesă din panou nu o deschide')
o('E22', AT, '$("#at-prinde").addEventListener("toggle", randeazaPrinde);', '', 'e2e', 'la deschidere, panoul rămâne gol')
o('E23', AT, 'else if (t.closest("[data-prinde-grinda]")) adaugaGrindaPereche();', '', 'e2e', '„Pune grinda în listă” nu face nimic')
o('E24', AT, 'pune(def, n);\n    salveaza(); randeazaLista();\n    toast(tr`${n} × ${numeDef(def)} în listă.`);\n  }\n  function arataPrivita()', 'salveaza(); randeazaLista();\n    toast(tr`${n} × ${numeDef(def)} în listă.`);\n  }\n  function arataPrivita()',
  'e2e', 'grinda perechii e anunțată, dar nu ajunge în listă')
# --- traducerile
o('T01', EN, ' "Se prinde cu": "Fits with",\n', ' "Se prinde cu": "",\n', 'tabele', 'titlul panoului n-are traducere')
o('T02', EN, ' "În găurile de ax": "In the axle holes",\n', '', 'tabele', 'un rând al panoului lipsește din dicționar')
o('T03', EN, ' "Ax de {0}: trece prin piesă și mai iese un pas.": "Axle of {0}: it passes through the piece and sticks out one more stud.",\n', '', 'tabele', 'mesajul axului lipsește din dicționar')

SETURI = {
    'prinderi': ['test/unit/trenulet.prinderi.test.ts'],
    'rotund': ['test/unit/trenulet.prinderi.test.ts'],
    'elice': ['test/unit/trenulet.prinderi.test.ts', 'test/unit/trenulet.elice.test.ts'],
    'tabele': ['test/unit/trenulet.engleza.test.ts'],
}
E2E = ['test/e2e/trenulet.prinderi.spec.ts']
