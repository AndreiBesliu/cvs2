# Lista de otrăvuri a feliei 3.Cl-1 (decorațiunile de Crăciun din atelierul Easy 3Draw: fulgul, steaua și brăduțul; ADR 0285),
# 25.11.2026, alese de autor: motorul (unirea formelor cu golurile lor, agățătoarea, marginile câmpurilor, fulgul, steaua,
# bradul de agățat și cel în picioare) și atelierul (fila, cei gata făcuți, „Alt fulg”, numele, câmpurile, ce se arată).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


LG = 'extensii/trenulet/sursa/lego/lego.ts'
AT = 'extensii/trenulet/sursa/planificator/atelier.ts'
EN = 'extensii/trenulet/sursa/planificator/texte.en.json'

# --- motorul: măsurile comune
C = 'const CRACIUN = { nervura: 1.2, inelGol: 1.5, inelAfara: 3.1, inelSus: 1.9, tija: 2.4, gaura: 1.25, gauraPerete: 1.6, intrePlaci: 3 };'
o('M01', LG, C, C.replace('nervura: 1.2', 'nervura: 1'), 'craciun', 'nervura cea mai subțire, de 1 mm')
o('M02', LG, C, C.replace('inelGol: 1.5', 'inelGol: 1.3'), 'craciun', 'golul inelului, de 2,6 mm')
o('M03', LG, C, C.replace('inelAfara: 3.1', 'inelAfara: 2.9'), 'craciun', 'peretele inelului, de 1,4 mm')
o('M04', LG, C, C.replace('inelSus: 1.9', 'inelSus: 2.3'), 'craciun', 'inelul stă mai sus: gâtul dintre el și fulg se subțiază')
o('M05', LG, C, C.replace('tija: 2.4', 'tija: 2'), 'craciun', 'tija inelului, de 2 mm')
o('M06', LG, C, C.replace('gaura: 1.25', 'gaura: 1'), 'craciun', 'gaura de agățat, de 2 mm')
o('M07', LG, C, C.replace('gauraPerete: 1.6', 'gauraPerete: 1.2'), 'craciun', 'gaura de agățat urcă mai sus decât îi lasă peretele')
o('M08', LG, C, C.replace('intrePlaci: 3', 'intrePlaci: 2'), 'craciun', 'plăcile bradului în picioare, la 2 mm una de alta')

# --- motorul: unirea formelor
SS = '? v.slice().reverse().map((q, k: number, a): Vf => [q[0]!, q[1]!, -(a[(k + 1) % a.length]![2]!)]) : v.map((q): Vf => [q[0]!, q[1]!, q[2]!]));'
o('M09', LG, SS, SS.replace('-(a[(k + 1) % a.length]![2]!)', 'a[(k + 1) % a.length]![2]!'), 'craciun', 'conturul întors își ține arcele pe dos')
o('M10', LG, 'const spreStanga = (v: readonly (readonly number[])[]): Vf[] => (glob.Cavalier.plineClosed(v).area() < 0', 'const spreStanga = (v: readonly (readonly number[])[]): Vf[] => (glob.Cavalier.plineClosed(v).area() > 0', 'craciun', 'contururile ies în sens orar')
BB = 'l.filter(x => Math.abs(x.pline.area()) > 1e-4).map(x => spreStanga(dinPl(x.pline)));'
o('M11', LG, BB, BB.replace('Math.abs(x.pline.area()) > 1e-4', 'x.pline.area() > 1e-4'), 'craciun', 'bucățile date în sens orar (golurile) se pierd')
SF = 'return r.resultInfo === "disjoint" ? [spreStanga(v)] : bucatiBune(r.posPlines); };'
o('M12', LG, SF, SF.replace('[spreStanga(v)]', '[]'), 'craciun', 'un gol neatins de forma nouă se pierde')
o('M13', LG, 'if (goluri.some(g => pl(g).boolean(pl(f), "not").resultInfo === "pline2InsidePline1")) { insule.push(f); continue; }', 'if (goluri.some(g => pl(g).boolean(pl(f), "not").resultInfo === "pline1InsidePline2")) { insule.push(f); continue; }', 'craciun', 'insula dintr-un gol e înghițită de bucata din jur')
o('M14', LG, 'noi = [...noi.flatMap(g => scadeForma(g, b)), ...bucatiBune(r.negPlines)];', 'noi = [...noi, ...bucatiBune(r.negPlines)];', 'craciun', 'golul nou nu pierde ce acoperă bucata unită după')
o('M15', LG, 'goluri = goluri.flatMap(g => scadeForma(g, f));', 'goluri = goluri.slice();', 'craciun', 'golurile vechi nu pierd ce acoperă forma nouă')
o('M16', LG, 'bucati = [...rest, cur]; goluri = [...goluri, ...noi];', 'bucati = [...rest, cur]; goluri = [...goluri];', 'craciun', 'golurile nou închise se pierd')
o('M17', LG, 'return { ext, gauri: goluri.filter(g => inPoli(e, [g[0]![0], g[0]![1]])) }; })', 'return { ext, gauri: goluri.filter(g => !!e) }; })', 'craciun', 'fiecare bucată primește toate golurile')
TR = 'return [[A[0] - nx, A[1] - ny, 0], [bx - nx, by - ny, 1], [bx + nx, by + ny, 0], [A[0] + nx, A[1] + ny, 0]];'
o('M18', LG, TR, TR.replace('[bx - nx, by - ny, 1]', '[bx - nx, by - ny, 0]'), 'craciun', 'capătul tijei, drept în loc de rotund')
o('M19', LG, 'nx = -dy * w / 2, ny = dx * w / 2, bx = A[0] + dx * (L - w / 2), by = A[1] + dy * (L - w / 2);', 'nx = -dy * w / 2, ny = dx * w / 2, bx = A[0] + dx * (L - w), by = A[1] + dy * (L - w);', 'craciun', 'tija, mai scurtă cu jumătate de linie')

# --- motorul: agățătoarea și câmpurile
DM = 't = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / (dx * dx + dy * dy)));\n    return Math.hypot(q[0] - a[0] - t * dx, q[1] - a[1] - t * dy);\n  }));\n  /** Inelul de agățat'
o('M20', LG, DM, DM.replace('t = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / (dx * dx + dy * dy)));', 't = ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / (dx * dx + dy * dy);'), 'craciun', 'depărtarea de margine se ia până la dreapta laturii, nu până la latură')
o('M21', LG, 'return dreptForma(-t, varf - k / 10, t, varf + 0.2);', 'return dreptForma(-t, varf - 1, t, varf + 0.2);', 'craciun', 'tija inelului se oprește la 1 mm sub vârf')
o('M22', LG, 'while (!inPoli(poli, [t + 0.2, varf - k / 10]) && k < 2000) k++;', 'while (!inPoli(poli, [t - 0.6, varf - k / 10]) && k < 2000) k++;', 'craciun', 'tija inelului se oprește unde forma e încă mai îngustă decât ea')
o('M23', LG, 'if (inPoli(poli, c) && distMargine(poli, c) >= CRACIUN.gaura + CRACIUN.gauraPerete) return cerc(0, c[1], CRACIUN.gaura);', 'if (inPoli(poli, c) && distMargine(poli, c) >= CRACIUN.gaura) return cerc(0, c[1], CRACIUN.gaura);', 'craciun', 'gaura de agățat, fără perete')
CM = 'const n = numarCerut(v), x = Math.min(b, Math.max(a, Number.isFinite(n) ? (intreg ? Math.round(n) : zecime(n)) : implicit));'
o('M24', LG, CM, CM.replace('intreg ? Math.round(n)', 'intreg ? Math.floor(n)'), 'craciun', 'întregii se taie, nu se rotunjesc')
CW = 'if (Number.isFinite(n) && (n < a - 1e-9 || n > b + 1e-9)) avert.push(ce(String(x).replace(".", Limba.zecimal)));\n    return x;\n  }\n\n  // Fulgul'
o('M25', LG, CW, CW.replace('(n < a - 1e-9 || n > b + 1e-9)', '(n < a - 1e-9)'), 'craciun', 'un număr peste margine nu mai aduce mesaj')
o('M26', LG, CW, CW.replace('ce(String(x).replace(".", Limba.zecimal))', 'ce(String(x))'), 'craciun', 'mesajul marginii, cu punct zecimal')

# --- motorul: fulgul
o('M27', LG, 'const linieMax = Math.min(5, Math.max(CRACIUN.nervura, zecime(R / 6)));', 'const linieMax = Math.min(5, Math.max(CRACIUN.nervura, zecime(R / 5)));', 'craciun', 'linia, până la o cincime din rază')
MZ = 'const m = miez === "hexagon" ? Math.max(0.18 * R, 2 * w) : miez === "stea" ? Math.max(0.26 * R, 2.8 * w) : Math.max(0.24 * R, 3.2 * w);'
o('M28', LG, MZ, MZ.replace('0.18 * R', '0.2 * R'), 'craciun', 'miezul hexagon, mai mare')
o('M29', LG, MZ, MZ.replace('0.26 * R', '0.3 * R'), 'craciun', 'miezul stea, mai mare')
o('M30', LG, MZ, MZ.replace('3.2 * w', '4 * w'), 'craciun', 'miezul gol al unui fulg cu linia groasă, mai mare')
PF = 'const f = ramuri === 1 ? inceput / 100 : inceput / 100 + (0.86 - inceput / 100) * j / (ramuri - 1), p = m + (R - m) * f;'
o('M31', LG, PF, PF.replace('0.86 - inceput / 100', '0.9 - inceput / 100'), 'craciun', 'ultima pereche de ramuri, la 90 % din braț')
o('M32', LG, PF, PF.replace('p = m + (R - m) * f', 'p = R * f'), 'craciun', 'perechile, măsurate de la mijloc, nu de la miez')
LR = 'const L = Math.min(lungime / 100 * R * (ramuri === 1 ? 1 : 1 - 0.45 * j / (ramuri - 1)), w / 2 - p * Math.cos(a) + Math.sqrt(p * p * Math.cos(a) ** 2 + (R - w / 2) ** 2 - p * p));'
o('M33', LG, LR, LR.replace('1 - 0.45 * j', '1 - 0.3 * j'), 'craciun', 'ramurile dinspre vârf, mai lungi')
o('M34', LG, LR, LR.replace('(R - w / 2) ** 2 - p * p', 'R ** 2 - p * p'), 'craciun', 'ramurile lungi trec de cercul fulgului cu jumătate de linie')
o('M35', LG, 'if (L >= 1.5 * w) perechi.push({ p, L });', 'if (L >= 0.5 * w) perechi.push({ p, L });', 'craciun', 'se fac și ramurile prea scurte')
HX = '[r * Math.cos(Math.PI / 6 + k * Math.PI / 3), r * Math.sin(Math.PI / 6 + k * Math.PI / 3), 0]'
o('M36', LG, HX, '[r * Math.cos(k * Math.PI / 3), r * Math.sin(k * Math.PI / 3), 0]', 'craciun', 'hexagonul miezului, cu colțurile între brațe')
o('M37', LG, 'const r = k % 2 ? 0.55 * m : m, u = k * Math.PI / 6;', 'const r = k % 2 ? 0.7 * m : m, u = k * Math.PI / 6;', 'craciun', 'steaua miezului, mai plină')
o('M38', LG, 'gauri.push(hex(m - w / Math.cos(Math.PI / 6)).map(([x, y]): P2 => [x, y]));', 'gauri.push(hex(m - w).map(([x, y]): P2 => [x, y]));', 'craciun', 'peretele miezului gol, mai subțire decât linia')
o('M39', LG, 'const u = Math.PI / 2 + k * Math.PI / 3, dx = Math.cos(u), dy = Math.sin(u);\n      forme.push(tijaRotunda([r0 * dx, r0 * dy], u, R - r0, w));', 'const u = Math.PI / 3 + k * Math.PI / 3, dx = Math.cos(u), dy = Math.sin(u);\n      forme.push(tijaRotunda([r0 * dx, r0 * dy], u, R - r0, w));', 'craciun', 'brațele, rotite cu 30°: niciunul în sus')
o('M40', LG, 'forme.push(tijaRotunda([r0 * dx, r0 * dy], u, R - r0, w));', 'forme.push(tijaRotunda([r0 * dx, r0 * dy], u, R - r0 - 1, w));', 'craciun', 'brațele, mai scurte cu 1 mm')
o('M41', LG, 'ramuri.push(tijaRotunda([p * dx, p * dy], u + s * q.a, L, w));', 'ramuri.push(tijaRotunda([p * dx, p * dy], u + s * q.a / 2, L, w));', 'craciun', 'ramurile, la jumătate din unghi')
o('M42', LG, 'if (q.agatatoare === "inel") { const c = inelAgatat(R); forme.push(c.disc); gauri.push(c.gol); }\n    return { tri: prismaUnite(unesteForme(forme), gauri, 0, q.grosime), avert: q.avert, prinderi: [] };', 'if (q.agatatoare === "inel") { const c = inelAgatat(R); forme.push(c.disc); }\n    return { tri: prismaUnite(unesteForme(forme), gauri, 0, q.grosime), avert: q.avert, prinderi: [] };', 'craciun', 'inelul fulgului, fără gol')
o('M43', LG, 'return { tri: prismaUnite(unesteForme(forme), gauri, 0, q.grosime), avert: q.avert, prinderi: [] };', 'return { tri: prismaUnite(unesteForme(forme), gauri, 0, q.grosime + 0.2), avert: q.avert, prinderi: [] };', 'craciun', 'fulgul, mai gros cu 0,2')

# --- motorul: steaua
VA = 'varf = Math.round(2 * Math.atan(ri * Math.sin(Math.PI / colturi) / (R - ri * Math.cos(Math.PI / colturi))) * 180 / Math.PI);'
o('M44', LG, VA, VA.replace('Math.round(2 * Math.atan(', 'Math.round(Math.atan('), 'craciun', 'unghiul colțului, pe jumătate')
o('M45', LG, 'if (varf < 25) avert.push(', 'if (varf < 15) avert.push(', 'craciun', 'colțurile de 18° nu mai sunt spuse')
o('M46', LG, 'd.agatatoare === "gaura" && fel === "plina" ? "gaura" : "inel";', 'd.agatatoare === "gaura" ? "gaura" : "inel";', 'craciun', 'gaura rămâne și la contur și la relief')
o('M47', LG, 'campMarginit(fel === "contur" ? avert : mute, d.linie,', 'campMarginit(avert, d.linie,', 'craciun', 'linia din afara marginilor se spune și la steaua plină')
o('M48', LG, 'const r = k % 2 ? ri : R, u = Math.PI / 2 + Math.PI * k / n; return [r * Math.cos(u), r * Math.sin(u)]; });', 'const r = k % 2 ? ri : R, u = Math.PI * k / n; return [r * Math.cos(u), r * Math.sin(u)]; });', 'craciun', 'steaua, cu un colț spre dreapta, nu în sus')
o('M49', LG, 'const H = q.grosime, prag = Math.min(CRACIUN.nervura, H / 2), tri: Tri[] = [];', 'const H = q.grosime, prag = Math.min(CRACIUN.nervura, H / 4), tri: Tri[] = [];', 'craciun', 'marginea stelei joase în relief, la un sfert din înălțime')
o('M50', LG, '[[0, 0, H], [a[0], a[1], prag], [b[0], b[1], prag]]);', '[[0, 0, H / 2], [a[0], a[1], prag], [b[0], b[1], prag]]);', 'craciun', 'mijlocul stelei în relief, la jumătate din înălțime')
o('M51', LG, '[c.gol], 0, Math.min(H, CRACIUN.tija)));', '[c.gol], 0, H));', 'craciun', 'inelul stelei în relief, înalt cât mijlocul ei')
o('M52', LG, 'parallelOffset(q.linie).filter(p => p.area() > 3);', 'parallelOffset(q.linie).filter(p => p.area() > 0.5);', 'craciun', 'conturul lasă și un gol sub 1 mm²')
o('M53', LG, 'glob.Cavalier.plineClosed(contur).parallelOffset(q.linie)', 'glob.Cavalier.plineClosed(contur).parallelOffset(q.linie / 2)', 'craciun', 'conturul, gros de jumătate din linie')
o('M54', LG, 'const g = gauraAgatat(poli, R, R / 3);', 'const g = gauraAgatat(poli, R, 0);', 'craciun', 'gaura stelei poate coborî până la mijloc')
o('M55', LG, 'else { ag = "inel"; avert.push(tr("Steaua e prea îngustă pentru gaura de agățat: i-am pus un inel.")); } }', 'else { avert.push(tr("Steaua e prea îngustă pentru gaura de agățat: i-am pus un inel.")); } }', 'craciun', 'steaua prea îngustă pentru gaură rămâne și fără inel')

# --- motorul: bradul
BG = 'const W = latime / 100 * H, ht = Math.max(0.12 * H, 4), e = (H - ht) / n, tw = fel === "picioare" ? 0.3 * W : Math.max(0.06 * W, 2);'
o('M56', LG, BG, BG.replace('0.12 * H', '0.15 * H'), 'craciun', 'trunchiul, mai înalt')
o('M57', LG, BG, BG.replace('0.3 * W', '0.25 * W'), 'craciun', 'talpa bradului în picioare, mai îngustă')
o('M58', LG, BG, BG.replace('0.06 * W', '0.08 * W'), 'craciun', 'trunchiul bradului de agățat, mai lat')
BE = 'const b = Array.from({ length: n }, (_, i) => W / 2 * (n - 0.75 * i) / n), a = b.map((_, i) => (i < n - 1 ? 0.45 * b[i + 1]! : 0));'
o('M59', LG, BE, BE.replace('n - 0.75 * i', 'n - 0.6 * i'), 'craciun', 'etajele de sus, mai late')
o('M60', LG, BE, BE.replace('0.45 * b[i + 1]!', '0.5 * b[i + 1]!'), 'craciun', 'gâturile dintre etaje, mai late')
BF = 'const fanta = grosime + 2 * (ef().joc + 0.1), mij = H / 2, langa = fanta / 2 + CRACIUN.nervura;'
o('M61', LG, BF, BF.replace('ef().joc + 0.1', 'ef().joc + 0.2'), 'craciun', 'fanta, mai largă cu 0,2')
o('M62', LG, BF, BF.replace('langa = fanta / 2 + CRACIUN.nervura', 'langa = fanta / 2'), 'craciun', 'a doua placă se taie abia unde lângă fantă nu mai rămâne nimic')
o('M63', LG, BF, BF.replace('mij = H / 2', 'mij = H / 2 + 2'), 'craciun', 'fantele se întâlnesc la 2 mm peste mijloc')
o('M64', LG, 'if (y + e > mij && a[i]! < langa) {', 'if (a[i]! < langa) {', 'craciun', 'a doua placă se taie la primul gât subțire, și sub mijloc')
o('M65', LG, 'if (i < n - 1) avert.push(tr("La mărimea asta, a doua placă a bradului nu ajunge până în vârf', 'if (i < n) avert.push(tr("La mărimea asta, a doua placă a bradului nu ajunge până în vârf', 'craciun', 'mesajul plăcii scurte, la orice brad în picioare')
o('M66', LG, 'const ingust = Math.min(tw, ...a.filter((_, i) => ht + (i + 1) * e < mij + 0.2));', 'const ingust = Math.min(tw);', 'craciun', 'gâtul subțire din dreptul fantei de jos nu mai e spus')
o('M67', LG, 'const s = q.fanta / 2, A = scadeForma(contur, dreptForma(-s, -1, s, q.mij + 0.2));', 'const s = q.fanta / 2, A = scadeForma(contur, dreptForma(-s, -1, s, q.mij));', 'craciun', 'fanta de jos se oprește chiar la mijloc')
o('M68', LG, 'B = B.flatMap(v => scadeForma(v, dreptForma(-s, q.mij - 0.2, s, H + 1)));', 'B = B.flatMap(v => scadeForma(v, dreptForma(-s, q.mij, s, H + 1)));', 'craciun', 'fanta de sus se oprește chiar la mijloc')
o('M69', LG, 'return { tri: [...placa(A, 0), ...placa(B, W + CRACIUN.intrePlaci)], avert, prinderi: [] };', 'return { tri: [...placa(A, 0), ...placa(B, W + CRACIUN.intrePlaci)], avert: [], prinderi: [] };', 'craciun', 'bradul în picioare își pierde mesajele')
o('M70', LG, 'const g = gauraAgatat(poli, H, ht + (n - 1) * e);', 'const g = gauraAgatat(poli, H, ht);', 'craciun', 'gaura bradului poate coborî până deasupra trunchiului')
o('M71', LG, 'else { ag = "inel"; avert.push(tr("Vârful bradului e prea îngust pentru gaura de agățat: i-am pus un inel.")); } }', 'else { avert.push(tr("Vârful bradului e prea îngust pentru gaura de agățat: i-am pus un inel.")); } }', 'craciun', 'bradul prea îngust pentru gaură rămâne și fără inel')
o('M72', LG, 'agatatoare = fel === "picioare" || d.agatatoare === "fara" ? "fara" : d.agatatoare === "gaura" ? "gaura" : "inel";', 'agatatoare = d.agatatoare === "fara" ? "fara" : d.agatatoare === "gaura" ? "gaura" : "inel";', 'craciun', 'bradul în picioare își ține agățătoarea în cote')

# --- atelierul: fila, cei gata făcuți, „Alt fulg”
# (din 3.Cl-2, rândul familiei are și globul: ancora ține doar începutul lui)
o('A01', AT, '["craciun", "Crăciun", [["fulg", "Fulg de zăpadă"], ["stea", "Stea"],', '["craciun", "Crăciun", [["stea", "Stea"], ["fulg", "Fulg de zăpadă"],', 'e2e', 'steaua, înaintea fulgului în galerie')
o('A02', AT, '["Steluță", { ramuri: 1, unghi: 45,', '["Steluță", { ramuri: 1, unghi: 50,', 'e2e', '„Steluță”, cu ramurile la 50°')
o('A03', AT, 'lungime: 40, miez: "gol", linie: 1.6 }],', 'lungime: 40, miez: "gol", linie: 1.8 }],', 'e2e', '„Dantelă”, cu linia de 1,8')
o('A04', AT, '["Simplu", { ramuri: 0,', '["Simplu", { ramuri: 1,', 'e2e', '„Simplu”, cu o pereche de ramuri')
AF = 'return { ramuri: intre(1, 4), unghi: intre(35, 70, 5), inceput: intre(25, 60, 5), lungime: intre(18, 42, 2), miez: ["hexagon", "stea", "gol"][intre(0, 2)]! };'
o('A05', AT, AF, AF.replace('ramuri: intre(1, 4)', 'ramuri: intre(0, 4)'), 'e2e', '„Alt fulg” poate ieși fără ramuri')
o('A06', AT, AF, AF.replace('unghi: intre(35, 70, 5)', 'unghi: intre(35, 75, 5)'), 'e2e', '„Alt fulg”, cu ramurile până la 75°')
o('A07', AT, AF, AF.replace('inceput: intre(25, 60, 5)', 'inceput: intre(20, 60, 5)'), 'e2e', '„Alt fulg”, cu prima pereche de la 20 %')
o('A08', AT, AF, AF.replace('["hexagon", "stea", "gol"][intre(0, 2)]!', '["gol", "stea", "hexagon"][intre(0, 2)]!'), 'e2e', '„Alt fulg”, cu miezurile în ordinea cealaltă')
o('A09', AT, 'const intre = (a: number, b: number, pas = 1) => a + pas * Math.floor(Math.random() * ((b - a) / pas + 1));', 'const intre = (a: number, b: number, pas = 1) => a + pas * Math.floor(Math.random() * ((b - a) / pas));', 'e2e', 'zarul nu ajunge niciodată la capătul de sus')
o('A10', AT, '$("#at-fg-alt").onclick = () => { Object.assign(p, fulgIntamplator()); tine(); editor(); schimbat(); };', '$("#at-fg-alt").onclick = () => { Object.assign(p, fulgIntamplator()); tine(); editor(); };', 'e2e', '„Alt fulg” schimbă câmpurile, dar nu și piesa')

# --- atelierul: starea, numele, piesa
o('A11', AT, 'fulg: { diam: 70, grosime: 2.4, linie: 2, ramuri: 2, unghi: 60,', 'fulg: { diam: 70, grosime: 2.4, linie: 2, ramuri: 3, unghi: 60,', 'e2e', 'fulgul implicit, cu trei perechi de ramuri')
o('A12', AT, 'stea: { varfuri: 5, diam: 70, interior: 40, grosime: 3, fel: "plina", linie: 2.4, agatatoare: "inel" },\n    brad:', 'stea: { varfuri: 6, diam: 70, interior: 40, grosime: 3, fel: "plina", linie: 2.4, agatatoare: "inel" },\n    brad:', 'e2e', 'steaua implicită, cu șase colțuri')
o('A13', AT, 'brad: { inaltime: 80, etaje: 3, latime: 65, grosime: 3, fel: "agatat", agatatoare: "inel" },', 'brad: { inaltime: 80, etaje: 4, latime: 65, grosime: 3, fel: "agatat", agatatoare: "inel" },', 'e2e', 'bradul implicit, cu patru etaje')
o('A14', AT, '+ (q.ramuri && (q.inceput !== 40 || q.lungime !== 28) ?', '+ (q.ramuri && (q.inceput !== 40) ?', 'e2e', 'numele fulgului nu spune lungimea neobișnuită a ramurilor')
o('A15', AT, '+ (q.linie === 2 ? "" : tr`, linia ${fmt(q.linie)}`)', '+ (q.linie === 2.4 ? "" : tr`, linia ${fmt(q.linie)}`)', 'e2e', 'numele fulgului tace la linia de 2,4, nu la cea de 2')
o('A16', AT, '+ (q.grosime === 2.4 ? "" : tr`, ${fmt(q.grosime)} mm`) + (q.agatatoare === "fara" ? tr(", fără inel") : "");', '+ (q.grosime === 2.4 ? "" : tr`, ${fmt(q.grosime)} mm`) + (q.agatatoare === "inel" ? tr(", fără inel") : "");', 'e2e', 'numele fulgului spune „fără inel” pe dos')
o('A17', AT, 'if (!q.ramuri) { delete p.unghi; delete p.inceput; delete p.lungime; } }', 'if (!q.ramuri) { delete p.inceput; delete p.lungime; } }', 'e2e', 'doi fulgi fără ramuri, cu unghiuri diferite, sunt piese diferite')
o('A18', AT, 'return tr`Stea cu ${q.varfuri} colțuri Ø${fmt(q.diam)}` + (q.interior === 40 ? "" :', 'return tr`Stea cu ${q.varfuri} colțuri Ø${fmt(q.diam)}` + (q.interior === 45 ? "" :', 'e2e', 'numele stelei tace la interiorul de 45 %')
o('A19', AT, 'q.fel === "relief" ? tr(", în relief") : ""', 'q.fel === "relief" ? "" : ""', 'e2e', 'numele stelei nu spune că e în relief')
o('A20', AT, '(q.latime === 65 ? "" : tr`, lat de ${q.latime} %`)', '(q.latime === 60 ? "" : tr`, lat de ${q.latime} %`)', 'e2e', 'numele bradului spune și lățimea obișnuită')
o('A21', AT, '+ (q.fel === "picioare" ? tr(", în picioare") : q.agatatoare === "gaura" ? tr(", cu gaură")', '+ (q.fel === "picioare" ? "" : q.agatatoare === "gaura" ? tr(", cu gaură")', 'e2e', 'numele bradului nu spune că e în picioare')

# --- atelierul: editorul fulgului
o('A22', AT, 'const tine = () => { p.linie = Lego.fulgCote(p).linie; };', 'const tine = () => { };', 'e2e', 'linia adusă în margine la un diametru mic se întoarce la cea veche')
o('A23', AT, 'FULGI.findIndex(([, f]) => Object.entries(f).every(([k, v]) => (q as Record<string, unknown>)[k] === v));', 'FULGI.findIndex(([, f]) => Object.entries(f).some(([k, v]) => (q as Record<string, unknown>)[k] === v));', 'e2e', '„Repede” rămâne apăsat și după un schimb de mână')
o('A24', AT, 'camp("#at-fg-diam", 30, 150, v => { p.diam = v; });', 'camp("#at-fg-diam", 30, 600, v => { p.diam = v; });', 'e2e', 'diametrul fulgului primește și 500')
o('A26', AT, 'camp("#at-fg-ramuri", 0, 4, v => { p.ramuri = Math.round(v); });', 'camp("#at-fg-ramuri", 0, 9, v => { p.ramuri = Math.round(v); });', 'e2e', 'perechile de ramuri primesc și 7')
o('A27', AT, 'pe fiecare braț sunt ${2 * q.facute} ramuri.`}', 'pe fiecare braț sunt ${2 * q.ramuri} ramuri.`}', 'e2e', 'rândul fulgului numără ramurile cerute, nu pe cele făcute')
o('A28', AT, '${q.facute < q.ramuri ? " " + tr`Încă ${2 * (q.ramuri - q.facute)} ar fi ieșit', '${q.facute > q.ramuri ? " " + tr`Încă ${2 * (q.ramuri - q.facute)} ar fi ieșit', 'e2e', 'ramurile prea scurte nu mai sunt spuse')
o('A29', AT, 'alege("#at-fg-ag", v => { p.agatatoare = v; });', 'alege("#at-fg-ag", v => { p.miez = v; });', 'e2e', 'agățătoarea fulgului nu se schimbă')

# --- atelierul: editorul stelei și al bradului
o('A30', AT, '["De vârf", { varfuri: 5, interior: 45, fel: "relief", grosime: 8, linie: 2.4 }],', '["De vârf", { varfuri: 5, interior: 45, fel: "relief", grosime: 6, linie: 2.4 }],', 'e2e', '„De vârf”, înaltă de 6')
o('A31', AT, 'q.fel === "plina" ? [["inel", "Inel"], ["gaura", "Gaură"], ["fara", "Fără"]] : [["inel", "Inel"], ["fara", "Fără"]]', 'q.fel !== "relief" ? [["inel", "Inel"], ["gaura", "Gaură"], ["fara", "Fără"]] : [["inel", "Inel"], ["fara", "Fără"]]', 'e2e', 'gaura e oferită și la conturul stelei')
o('A32', AT, '${relief ? tr("Înălțimea (mm)") : tr("Grosimea (mm)")}', '${relief ? tr("Grosimea (mm)") : tr("Înălțimea (mm)")}', 'e2e', 'grosimea și înălțimea stelei, pe dos')
o('A33', AT, '${q.fel === "contur" ? `<label for="at-st-linie">', '${q.fel !== "plina" ? `<label for="at-st-linie">', 'e2e', 'linia conturului apare și la steaua în relief')
o('A34', AT, 'vârfurile dinăuntru stau la ${fmt(q.interior / 100 * q.diam / 2)} mm de mijloc.`}', 'vârfurile dinăuntru stau la ${fmt(q.interior / 100 * q.diam)} mm de mijloc.`}', 'e2e', 'vârfurile dinăuntru, socotite din diametru')
o('A35', AT, 'tr`Marginea are ${fmt(Math.min(1.2, q.grosime / 2))} mm, iar mijlocul, ${fmt(q.grosime)} mm.`', 'tr`Marginea are ${fmt(q.grosime / 2)} mm, iar mijlocul, ${fmt(q.grosime)} mm.`', 'e2e', 'marginea stelei în relief, scrisă cât jumătate din înălțime')
o('A36', AT, 'alege("#at-st-varfuri", v => { p.varfuri = +v; });', 'alege("#at-st-varfuri", v => { p.varfuri = +v + 1; });', 'e2e', 'colțurile stelei, cu unul în plus')
o('A37', AT, 'camp("#at-st-interior", 30, 75, v => { p.interior = Math.round(v); });', 'camp("#at-st-interior", 20, 85, v => { p.interior = Math.round(v); });', 'e2e', 'interiorul stelei primește și 20 și 80')
o('A38', AT, '[["50", "50 mm"], ["80", "80 mm"], ["120", "120 mm"]]', '[["50", "50 mm"], ["80", "80 mm"], ["100", "120 mm"]]', 'e2e', '„120 mm” face un brad de 100')
o('A39', AT, '${picioare ? "" : `<div class="at-rand"><span class="mic">Agățătoarea:</span>${seg("at-bd-ag"', '${false ? "" : `<div class="at-rand"><span class="mic">Agățătoarea:</span>${seg("at-bd-ag"', 'e2e', 'agățătoarea e oferită și bradului în picioare')
o('A40', AT, 'A doua placă se oprește la ${fmt(q.taiat)} mm,', 'A doua placă se oprește la ${fmt(q.inaltime)} mm,', 'e2e', 'rândul bradului scrie înălțimea întreagă pentru a doua placă')
# (din 3.Cl-2, globul din două discuri are un rând la fel: ancora ține și „grosimea plăcii”)
o('A41', AT, 'Fantele au ${fmt(q.fanta, 2)} mm: grosimea plăcii', 'Fantele au ${fmt(q.grosime, 2)} mm: grosimea plăcii', 'e2e', 'rândul bradului scrie grosimea în loc de fantă')
o('A42', AT, 'camp("#at-bd-etaje", 2, 6, v => { p.etaje = Math.round(v); });', 'camp("#at-bd-etaje", 1, 9, v => { p.etaje = Math.round(v); });', 'e2e', 'etajele primesc și 1 și 7')
o('A43', AT, 'alege("#at-bd-repede", v => { p.inaltime = +v; });', 'alege("#at-bd-repede", v => { p.inaltime = +v; p.fel = "agatat"; });', 'e2e', 'mărimea gata întoarce bradul la cel de agățat')
o('A44', AT, ': tr`Lat de ${fmt(q.lat)} mm la bază.`}', ': tr`Lat de ${fmt(q.latime)} mm la bază.`}', 'e2e', 'rândul bradului scrie procentul în loc de lățime')

# --- textele
o('T01', EN, ' "Fulg Ø{0}, ramuri {1} × {2}°": "Snowflake Ø{0}, branches {1} × {2}°",', ' "Fulg Ø{0}, ramuri {1} × {2}°": "Snowflake Ø{0}, branches {1}°",', 'texte', 'traducerea numelui fulgului pierde o valoare')
o('T02', AT, 'tr`Fulg Ø${fmt(q.diam)}, fără ramuri`', 'tr`Fulg Ø${fmt(q.diam)}, fara ramuri`', 'texte', 'numele fulgului fără ramuri, cu alt text decât cel tradus')
o('T03', LG, 'tr`Diametrul unei stele e între 30 și 150 mm: am făcut-o de ${x} mm.`', 'tr`Diametrul unei stele este între 30 și 150 mm: am făcut-o de ${x} mm.`', 'texte', 'mesajul motorului, cu alt text decât cel tradus')
o('T04', EN, ' "Brăduț de {0} mm, {1} etaje": "Christmas tree, {0} mm, {1} tiers",', ' "Brăduț de {0} mm, {1} etaje": "",', 'texte', 'numele bradului, fără traducere')

SETURI = {
    'craciun': ['test/unit/trenulet.craciun.test.ts'],
    'texte': ['test/unit/trenulet.engleza.test.ts'],
}
E2E = ['test/e2e/trenulet.craciun.spec.ts']
# pagina și pachetul se fac din surse în spec: build-ul aplicației nu le schimbă (docs/otravuri.md)
E2E_BUILD = False
for x in O:
    assert x['vechi'] != x['nou'], x['id']
