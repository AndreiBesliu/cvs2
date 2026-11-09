# Lista de otrăvuri a feliei 25.3↑ (linia mediană, ADR 0222), 08.11.2026, alese de autor: subțierea (Lü și Wang, cozile,
# marginea de pornire), coturile treptelor și ciotul de un pixel, cioturile, punțile dintre joncțiuni, curățarea brațelor,
# locul joncțiunii (cele mai mici pătrate), centrul și grosimea de-a curmezișul, capetele (centrul capătului rotund, din
# centrul dreptei), legarea brațelor și drumul căilor (deschise, prin perechi, buclele), punctele, plafonul, ieșirea
# (`deschisa`, ultimul vârf), calculul, ușa (căile pe linie, buclele în operația căilor deschise) și fereastra prin e2e.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), din worktree-ul feliei (în afara Drive-ului), după commit, cu
# CNCVS2_E2E_RETEA=127.0.6 și configul local pe portul 4179 (`.tmp/pw.config.ts`).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


ME = 'src/trasare/mediana.ts'
CT = 'src/jobs/calculTrasare.ts'
CA = 'src/ui/actiuniImportCalcul.ts'
PI = 'src/io/piesa.ts'
FE = 'src/ui/FereastraTrasare.tsx'
DI = 'src/ui/DialogImport.tsx'
AP = 'src/app/App.tsx'

# ---- Subțierea ----
o('S01', ME, '        if (B < 3 || B > 6) continue;', '        if (B < 2 || B > 6) continue;', 'nuc', 'Zhang–Suen fără Lü și Wang: trăsătura la 45° dispare')
o('S02', ME, '        if (sub === 0 ? p2 * p4 * p6 || p4 * p6 * p8 : p2 * p4 * p8 || p2 * p6 * p8) continue;', '        if (false) continue;', 'nuc',
  'fără condițiile direcționale: subțierea roade prea mult')
o('S03', ME, '          if (!(f & 2)) coada[1].push(q);', '', 'nuc', 'vecinii pixelului scos nu se mai încearcă la a doua sub-trecere')
o('S04', ME, '      if (plini >= 3 && plini <= 6) { coada[0].push(p); coada[1].push(p); sucio[p] = 3; }',
  '      if (plini >= 3 && plini <= 5) { coada[0].push(p); coada[1].push(p); sucio[p] = 3; }', 'nuc',
  'la pornire, fără pixelii cu șase vecini (care pot ieși chiar atunci)')
# S05 (pixelul încercat pierde și semnul celeilalte sub-treceri): doar eficiența; pixelul rămâne în coada celeilalte
# sub-treceri și se poate încerca de două ori, cu aceeași decizie (la fel pe 400 de configurații întâmplătoare). Scoasă.

# ---- Coturile treptelor, ciotul de un pixel ----
o('C01', ME, '      if (x8[k] && x8[(k + 2) % 8] && !x8[(k + 4) % 8] && !x8[(k + 5) % 8] && !x8[(k + 6) % 8]) { s[p] = 0; break; }',
  '      if (x8[k] && x8[(k + 2) % 8] && !x8[(k + 4) % 8] && !x8[(k + 5) % 8] && !x8[(k + 6) % 8]) { break; }', 'nuc', 'coturile treptelor rămân')
o('C02', ME, '      if (x8[k] && x8[(k + 2) % 8] && !x8[(k + 4) % 8] && !x8[(k + 5) % 8] && !x8[(k + 6) % 8]) { s[p] = 0; break; }',
  '      if (x8[k] && x8[(k + 2) % 8] && !x8[(k + 4) % 8] && !x8[(k + 6) % 8]) { s[p] = 0; break; }', 'nuc',
  'un cot scos și când are vecin pe diagonala opusă')
o('C03', ME, '        if (simplu(s, W, H, jonct)) s[jonct] = 0;', '', 'nuc', 'ciotul de un pixel rămas sub linie: o joncțiune falsă')
# C04 (numărul de conexiune 0 luat drept simplu): în `simplu`, doar pe pixelul unei joncțiuni după tăierea unui ciot, care
# nu are patru vecini ortogonali (scheletul e subțire): la fel pe 400 de configurații. Scoasă.

# ---- Cioturile, punțile ----
o('P01', ME, '      if (lungime(l.pix, W) < MEDIANA.ciot * R(jonct) + 1) {', '      if (lungime(l.pix, W) < R(jonct) + 1) {', 'nuc',
  'cioturile până la o rază: furca unui capăt drept rămâne')
o('P02', ME, '      if (lungime(l.pix, W) < MEDIANA.ciot * R(jonct) + 1) {', '      if (false) {', 'nuc', 'niciun ciot tăiat')
o('P03', ME, "    if ((grad[l.a] ?? 0) >= 3 && (grad[l.b] ?? 0) >= 3 && lungime(l.pix, W) < R(l.a) + R(l.b)) {",
  "    if ((grad[l.a] ?? 0) >= 3 && (grad[l.b] ?? 0) >= 3 && lungime(l.pix, W) < 1.5) {", 'nuc',
  'doar pixelii-joncțiune vecini se unesc: un X la 60° rămâne două Y')
# P04 (raza grupului din primul pixel, nu cea mai mare): după corectura colțurilor și a joncțiunilor, pe configurațiile
# întâmplătoare care o despart, linia diferă în a doua zecimală a mediei (0,084 față de 0,061 px), cu același maxim. Scoasă.

# ---- Brațele, locul joncțiunii ----
o('B01', ME, '      if (v) curataBrat(P, L, v.x, v.y, v.r, unghiuri?.get(cap.g) ?? null);', '', 'nuc', 'brațele necurățate lângă joncțiune (X la 60°: 2,6 px)')
o('B02', ME, "  const bun = (k: number): boolean => k >= n || ((L[k] ?? 0) > 0 && Math.abs((L[k] ?? 0) - wa) <= Math.max(0.75, 0.2 * wa));",
  "  const bun = (k: number): boolean => k >= n || ((L[k] ?? 0) > 0 && Math.abs((L[k] ?? 0) - wa) <= Math.max(3, 0.6 * wa));", 'nuc',
  'brațul curățat cu o toleranță largă: punctele strâmbe rămân')
o('B03', ME, '      return !v || Math.hypot((q % W) + 0.5 - v.x, Math.floor(q / W) + 0.5 - v.y) >= v.r;', '      return true;', 'nuc',
  'pixelii din cercul joncțiunii rămân în brațe')
o('B04', ME, '    if (det > 0.05) {', '    if (false) {', 'nuc', 'joncțiunea în media pixelilor, nu în încrucișarea brațelor')
o('B08', ME, '    if (det > 0.05) {', '    if (det > 0.6) {', 'nuc',
  'încrucișarea cerută doar la brațe foarte diferite: furcile sub ~50° rămân în media pixelilor')
# B09 (încrucișarea primită și când dreptele nu se întâlnesc): regula abaterii dreptelor a fost scoasă din cod (fără efect
# pe 800 de configurații și pe logo, după ce dreptele strâmbe ale brațelor ies prin direcția lor brută).
o('B10', ME, '      if (camp(f, W, H, lx, ly) >= T) { x = lx; y = ly; }', '      { x = lx; y = ly; }', 'nuc',
  'încrucișarea primită și în afara cernelii („Ve”: la 15 px, între litere)')
# B05 (punctul celor mai mici pătrate primit oricât de departe) a scăpat, iar pe furci era mai bun decât garda: într-o furcă
# îngustă, încrucișarea stă departe de pixelii joncțiunii. Garda a fost scoasă din cod (furcile au acum proba lor), deci și
# otrava.
o('B06', ME, '        if ((cx - v.x) * dx + (cy - v.y) * dy < 0) { dx = -dx; dy = -dy; }', '', 'nuc',
  'direcția brațului fără sens: perechile se aleg la întâmplare')
o('B07', ME, '        if (k >= 3 && Math.hypot(x - (sel[0] ?? 0), y - (sel[1] ?? 0)) > Math.max(2, 1.5 * wa)) break;',
  '        if (k >= 3 && Math.hypot(x - (sel[0] ?? 0), y - (sel[1] ?? 0)) > Math.max(2, 8 * wa)) break;', 'nuc',
  'dreapta brațului din tot brațul (un arc dă o direcție greșită lângă joncțiune)')

# ---- Centrul, grosimea ----
o('M01', ME, '      D[i] = (a - b) / 2;', '      D[i] = (b - a) / 2;', 'nuc', 'centrul mutat în sens invers')
o('M02', ME, '      if (Math.abs(d) > Math.max(1, wl / 3) || Math.abs(w - wl) > Math.max(1, 0.15 * wl)) continue;', '', 'nuc',
  'orice mutare primită (normala intrată în alt braț, colțurile drepte)')
o('M07', ME, '      if (Math.abs(d) > Math.max(1, wl / 3) || Math.abs(w - wl) > Math.max(1, 0.15 * wl)) continue;',
  '      if (Math.abs(d) > Math.max(1, wl / 3) || Math.abs(w - wl) > Math.max(1, 0.4 * wl)) continue;', 'nuc',
  'lățimea locală cu toleranță largă: colțurile drepte se mută strâmb')
o('M08', ME, '    const K = Math.max(MEDIANA.vecinatate, Math.round(2 * mediana(fer)));', '    const K = MEDIANA.vecinatate;', 'nuc',
  'fereastra lățimii locale fixă: pe o trăsătură groasă, colțul o trage după el')
o('M03', ME, '  for (let trecut = 0; trecut < 2; trecut++) {', '  for (let trecut = 0; trecut < 1; trecut++) {', 'nuc',
  'o singură trecere: tangenta din pixeli, nu din centre')
o('M04', ME, 'export const MEDIANA = { pas: 0.25, ciot: 1.5, cotitura: 30, capat: 0.9, vecini: 2, vecinatate: 10, drept: 0.5, prelungire: 5 } as const;',
  'export const MEDIANA = { pas: 0.25, ciot: 1.5, cotitura: 30, capat: 0.9, vecini: 0, vecinatate: 10, drept: 0.5, prelungire: 5 } as const;', 'nuc', 'tangenta dintr-un singur punct (nicio direcție)')
o('M05', ME, '    if (c < T) return u - MEDIANA.pas + (MEDIANA.pas * (prev - T)) / Math.max(1e-12, prev - c);', '    if (c < T) return u;', 'nuc',
  'trecerea fără interpolare: grosimea crește cu un pas')
o('M06', ME, '): number {\n  const fx = x - 0.5, fy = y - 0.5, x0 = Math.floor(fx), y0 = Math.floor(fy), u = fx - x0, v = fy - y0;',
  '): number {\n  const fx = x, fy = y, x0 = Math.floor(fx), y0 = Math.floor(fy), u = fx - x0, v = fy - y0;', 'nuc', 'câmpul biliniar decalat cu o jumătate de pixel')

# ---- Capetele ----
o('E01', ME, '      if (!cap) { retrage(P, L, f, W, H, T, varf); return; }', '      if (!cap) return;', 'nuc', 'capetele rămân unde se oprește scheletul')
o('E02', ME, '  const avans = trecere(f, W, H, T, d.cx, d.cy, dx, dy) - wl / 2;', '  const avans = trecere(f, W, H, T, d.cx, d.cy, dx, dy);', 'nuc',
  'linia se termină în vârful trăsăturii (3b), nu în centrul capătului')
# E03 (mersul spre vârf din primul punct bun): după recentrarea capătului și îndreptarea lui, diferă în a treia zecimală
# (capetele 0,11 față de 0,10 px). Echivalentă; scoasă.
# E04 (punctele prea late luate drept bune la capăt): după recentrarea capătului de-a curmezișul, limita de sus nu mai
# schimba nimic (0 diferențe pe 61 de capete drepte, înainte cel mult 0,04 px în ambele sensuri). Scoasă din cod și din listă.
# E05 (punctele rotunjimii capătului luate drept bune): diferă în a treia zecimală (capetele 0,09 față de 0,08 px). Scoasă.
o('E06', ME, '  if (dx * (x0 - (P[2 * i1] ?? 0)) + dy * (y0 - (P[2 * i1 + 1] ?? 0)) < 0) { dx = -dx; dy = -dy; }', '', 'nuc',
  'direcția capătului fără sens: mersul spre vârf poate porni înapoi')
o('E07', ME, '  if (sus > 0 && jos > 0 && Math.abs(sus - jos) / 2 <= Math.max(1, wl / 3)) { cx += (-dy * (sus - jos)) / 2; cy += (dx * (sus - jos)) / 2; }', '', 'nuc',
  'capătul nerecentrat de-a curmezișul (0,71 px la un capăt drept oblic)')
o('E08', ME, ' || Math.hypot((P[2 * k] ?? 0) - cx, (P[2 * k + 1] ?? 0) - cy) < wl / 2)) k++;', ')) k++;', 'nuc',
  'punctele de lângă centrul capătului rămân: linia se cârligă la capătul unui bloc gros')
o('K01', ME, '    colturi(P, L, false, f, W, H, T);\n', '', 'nuc', 'colțurile drepte ale lanțurilor nerefăcute (zigzaguri de 1,7 px)')
o('K02', ME, '{ Q.push(x, y); M.push(Number.NaN); }', '{}', 'nuc', 'colțul tăiat de o coardă, nu refăcut în încrucișare')
o('K03', ME, '      colturi(P, L, true, f, W, H, T);\n', '', 'nuc', 'colțurile drepte ale buclelor nerefăcute')
o('K04', ME, '      if (Math.abs(sin) >= Math.sin((20 * Math.PI) / 180)) {', '      if (Math.abs(sin) >= Math.sin((80 * Math.PI) / 180)) {', 'nuc',
  'colțurile sub 80° nerefăcute')
o('K05', ME, '    if (e - i <= 2 && stanga && dreapta_) for (let q = i; q < e; q++) rau[inchis ? q % n : q] = 1;', '', 'nuc',
  'insulele scurte de puncte bune despart colțul în două șiruri: colțul pătratului nerefăcut')
o('A01', ME, '        if (semn * (d.dx * bruta[0] + d.dy * bruta[1]) < Math.SQRT1_2) linie = false;', '', 'nuc',
  'dreapta brațului primită și când cotește (urechea logoului: trăsătura de sus legată de inel)')
o('A02', ME, '          if (sel.length >= 8 && abatereDreptei(sel) > MEDIANA.drept) { sel.length -= 2; break; }', '', 'nuc',
  'dreapta brațului trasă și peste colț sau curbă (latura lui „e”: 22°)')
o('A03', ME, '        if (d > v.r + Math.max(3, 1.5 * (wa || 2 * v.r))) break;', '        if (d > 2 * v.r + 1) break;', 'nuc',
  'direcția brută din fereastra razei joncțiunii (o furcă cu joncțiunea lângă margine: 1,4 px)')
o('A04', ME, 'export const MEDIANA = { pas: 0.25, ciot: 1.5, cotitura: 30, capat: 0.9, vecini: 2, vecinatate: 10, drept: 0.5, prelungire: 5 } as const;',
  'export const MEDIANA = { pas: 0.25, ciot: 1.5, cotitura: 30, capat: 0.9, vecini: 2, vecinatate: 10, drept: 1.3, prelungire: 5 } as const;', 'nuc',
  'dreptele trase cu abaterea de 0,1 grosimi: brațele lui „e” înclinate, nelegate')
o('A05', ME, '          if (k > 0 && !((mu.L[q] ?? 0) > 0)) break;', '', 'nuc', 'dreapta brațului trasă și prin colțul nemăsurat (urechea din dreapta: 37°)')
o('A06', ME, '        } else if (coarda >= 0.75 && bruta &&', '        } else if (false && coarda >= 0.75 && bruta &&', 'nuc',
  'latura de două puncte dintre joncțiune și colț ia direcția brută: brațele inelului nelegate')
o('G01', ME, '  const pana = unghi === null ? r + 3 * wa : Math.min(r + 3 * wa, Math.max(r, wa / 2 / Math.tan(unghi / 2)) + Math.max(1, 0.25 * wa));',
  '  const pana = r + 3 * wa;', 'nuc', 'curățarea până la trei grosimi oricum: colțul urechii tăiat de o coardă')
o('G02', ME, '  const bunAici = (k: number): boolean => !inZona(k) || bun(k);', '  const bunAici = bun;', 'nuc',
  'punctele rele de dincolo de zonă țin curățarea: latura scurtă a urechii scoasă, brațul pornit din colț')
o('G03', ME, '    unghiuri.set(g, m);', '    unghiuri.set(g, Math.PI / 2);', 'nuc', 'unghiul joncțiunii ignorat (90°): furca îngustă curățată prea puțin')
o('P05', ME, '      adauga((b.px + o.px) / 2, (b.py + o.py) / 2, dx, dy, 2);', '      adauga(b.cx, b.cy, b.dx, b.dy, 1); adauga(o.cx, o.cy, o.dx, o.dy, 1);', 'nuc',
  'perechea curbă tot cu dreptele separate: joncțiunea lui „e” în afara mijlocului')
o('P06', ME, 'drept: 0.5, prelungire: 5 } as const;', 'drept: 0.5, prelungire: 0 } as const;', 'nuc',
  'dreapta comună și pentru perechile drepte: furca de 20° la 0,32 px')
o('P07', ME, '      if (!departe || -(b.dx * o.dx + b.dy * o.dy)', '      if (-(b.dx * o.dx + b.dy * o.dy)', 'nuc',
  'dreapta comună și lângă un braț apropiat: X-ul îngust la 1,3 px')
o('P08', ME, '      let dx = o.px - b.px, dy = o.py - b.py;\n      const l = Math.hypot(dx, dy);\n      if (l >= 2) { dx /= l; dy /= l; } else { dx = b.dx - o.dx; dy = b.dy - o.dy; const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m; }\n      adauga((b.px + o.px) / 2, (b.py + o.py) / 2, dx, dy, 2);',
  '      let dx = o.cx - b.cx, dy = o.cy - b.cy;\n      const l = Math.hypot(dx, dy);\n      if (l >= 2) { dx /= l; dy /= l; } else { dx = b.dx - o.dx; dy = b.dy - o.dy; const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m; }\n      adauga((b.cx + o.cx) / 2, (b.cy + o.cy) / 2, dx, dy, 2);', 'nuc',
  'coarda perechii prin centrele dreptelor: săgeata arcului (semnătura, 0,7 px)')
o('K06', ME, '      if (sel.length >= 8 && abatereDreptei(sel) > MEDIANA.drept) { sel.length -= 2; break; }\n    }\n    return sel.length >= 6', '    }\n    return sel.length >= 6', 'nuc',
  'dreptele colțurilor trase și pe curbă: colțul buclei lui „e” teșit')

# ---- Legarea brațelor, căile ----
o('L01', ME, 'export const MEDIANA = { pas: 0.25, ciot: 1.5, cotitura: 30, capat: 0.9, vecini: 2, vecinatate: 10, drept: 0.5, prelungire: 5 } as const;',
  'export const MEDIANA = { pas: 0.25, ciot: 1.5, cotitura: 0, capat: 0.9, vecini: 2, vecinatate: 10, drept: 0.5, prelungire: 5 } as const;', 'nuc', 'niciun braț legat: bara T-ului în două')
o('L02', ME, 'export const MEDIANA = { pas: 0.25, ciot: 1.5, cotitura: 30, capat: 0.9, vecini: 2, vecinatate: 10, drept: 0.5, prelungire: 5 } as const;',
  'export const MEDIANA = { pas: 0.25, ciot: 1.5, cotitura: 70, capat: 0.9, vecini: 2, vecinatate: 10, drept: 0.5, prelungire: 5 } as const;', 'nuc', 'brațele Y-ului legate (cotitura de 60°)')
o('L03', ME, '        if (cot <= MEDIANA.cotitura || lista.length === 2) cand.push({ i, j, c: cot });', '        if (cot <= MEDIANA.cotitura) cand.push({ i, j, c: cot });', 'nuc',
  'o joncțiune cu două brațe care cotesc nu mai e o trecere')
o('L04', ME, '    cand.sort((p, q) => p.c - q.c || p.i - q.i || p.j - q.j);', '    cand.sort((p, q) => q.c - p.c || p.i - q.i || p.j - q.j);', 'nuc',
  'perechile cele mai strâmbe întâi')
o('L05', ME, "  for (const [e] of muchii.entries()) if (!folosita[e]) mergi(e, 'a', true);", "  for (const [e] of muchii.entries()) if (!folosita[e]) mergi(e, 'a', false);", 'nuc',
  'un 8 (bucla prin încrucișare) ies o cale deschisă')
o('L06', ME, '      if (start) P.push(start[0], start[1]);', '', 'nuc', 'calea nu pornește din joncțiune')
o('L07', ME, '      if (!inchisa) { const fin = loc(mu[alt]); if (fin) P.push(fin[0], fin[1]); }', '', 'nuc', 'calea nu ajunge în joncțiune')

# ---- Punctele, plafonul, ieșirea ----
o('X01', ME, '    if (!mu.a && !mu.b && lungimeXY(mu.P) < 0.5) { puncte++; continue; }', '    if (!mu.a && !mu.b && lungimeXY(mu.P) < 0) { puncte++; continue; }', 'nuc',
  'un disc retras la un punct dă o cale de lungime zero')
o('X02', ME, '  for (const p of schelet) if (grad[p] === 0) puncte++;', '', 'nuc', 'pixelul izolat nu se numără')
o('X03', ME, "  if (nCai > PLAFON_TRASARE.contururi) return { ok: false, cod: 'prea-multe', raport: raport(0, 0) };", '', 'nuc', 'fără plafon')
o('X04', ME, '      deschisa[k] = 1;', '', 'nuc', 'căile deschise ies închise')
o('X05', ME, '      bucati = [...r.bucati, { tip: 0, x: r.sfarsit[0], y: r.sfarsit[1], c1x: 0, c1y: 0, c2x: 0, c2y: 0, de: 0, la: 0 }];',
  '      bucati = r.bucati;', 'nuc', 'calea deschisă fără ultimul vârf (capătul pierdut)')

# ---- Calculul, ușa ----
o('U01', CT, "  if (c.rezultat === 'mediane') {", '  if (false) {', 'usa', 'cererea liniilor mediane dă contururi')
o('U02', CT, '      transfer: deTransferat([r.cai.inceput, r.cai.tip, r.cai.xy, r.cai.exterior, r.cai.deschisa, r.cai.peLinie, ...late]),',
  '      transfer: deTransferat([r.cai.inceput, r.cai.tip, r.cai.xy, r.cai.exterior, r.cai.peLinie, ...late]),', 'usa', '`deschisa` copiat, nu transferat')
o('U03', CA, "      cai.push({ varfuri, inchis: c.deschisa[k] !== 1 });", "      cai.push({ varfuri, inchis: true });", 'usa', 'liniile deschise ajung închise')
o('U04', CA, "      laturi.push(c.deschisa[k] === 1 || c.peLinie?.[k] !== 0 ? 'pe-linie' : c.exterior[k] === 1 ? 'exterior' : 'interior');\n      continue;",
  "      laturi.push('exterior');\n      continue;", 'usa', 'liniile mediane tăiate pe exterior')
o('U05', PI, "    { id: 'deschise', latura: 'pe-linie', ale: (k: number) => !caleInchisa(p.cai[k] ?? {}) || p.laturi[k] === 'pe-linie' },",
  "    { id: 'deschise', latura: 'pe-linie', ale: (k: number) => !caleInchisa(p.cai[k] ?? {}) },", 'usa', 'bucla pe linie rămâne fără operație')
o('U06', CA, "    deschise: cai.filter((c, k) => !caleInchisa(c) || laturi[k] === 'pe-linie').length,",
  "    deschise: cai.filter((c) => !caleInchisa(c)).length,", 'usa', 'buclele pe linie nu se numără')
o('U07', CA, '      mediane: { grosimePx: grosime, bucle, jonctiuni, puncte, ...(parti ? { parti } : {}) },\n', '', 'usa', 'raportul fără grosime și puncte')

# ---- Fereastra, dialogul (e2e) ----
o('F01', CA, "      ...(peCulori ? { culori: a.culori } : a.rezultat === 'mediane' ? { rezultat: 'mediane', mediane: a.mediane } : {}),",
  "      ...(peCulori ? { culori: a.culori } : {}),", 'e2e', '„Linii mediane” nu ajunge la worker')
o('F02', FE, "  const fel = freza === undefined ? null : Math.abs(freza - grosimeMm) <= Math.max(0.05, 0.1 * grosimeMm) ? 'potrivita' : freza > grosimeMm ? 'lata' : 'ingusta';",
  "  const fel = freza === undefined ? null : Math.abs(freza - grosimeMm) <= Math.max(0.05, 0.1 * grosimeMm) ? 'potrivita' : freza > grosimeMm ? 'ingusta' : 'lata';", 'e2e',
  'freza lată spusă îngustă')
o('F03', AP, '          {...(frezaImport === undefined ? {} : { freza: frezaImport })}\n', '', 'e2e', 'freza foii nu ajunge la fereastră')
o('F04', DI, "            {ok.deschise > 0 && (ok.format === 'imagine' && ok.trasare.mediane ? (", "            {ok.deschise > 0 && (false ? (", 'e2e',
  'dialogul spune „căi deschise” și nota grosimii liniei din fișier')
o('F05', FE, '      g.globalAlpha = 0.3;\n      g.lineWidth = mediane.grosimePx;', '      g.globalAlpha = 0;\n      g.lineWidth = mediane.grosimePx;', 'e2e',
  'banda grosimii nu se vede')
o('F06', DI, "  if (cod === 'gol' && format === 'imagine') return t(culori ? 'import.imagine.gol-culori' : puncte > 0 ? 'import.imagine.gol-mediane' : 'import.imagine.gol');",
  "  if (cod === 'gol' && format === 'imagine') return t(culori ? 'import.imagine.gol-culori' : 'import.imagine.gol');", 'e2e',
  'un disc plin, refuzat cu textul pragului')
o('F07', FE, "              {mediane && mediane.puncte > 0 && <p data-testid=\"trasare-puncte\">{t('import.trasare.puncte', { n: mediane.puncte })}</p>}", '', 'e2e',
  'punctele nu se spun')
o('F08', FE, "        {!peCulori && (\n          <label>\n            {t('import.trasare.rezultat')}", "        {false && (\n          <label>\n            {t('import.trasare.rezultat')}", 'e2e',
  '„Rezultatul” lipsește')

SETURI = {
    'nuc': ['test/unit/trasare.mediana.test.ts', 'test/unit/trasare.mediana.corpus.test.ts'],
    'nuc2': ['test/unit/trasare.mediana.test.ts', 'test/unit/trasare.mediana.corpus.test.ts', 'test/unit/import.imagine.test.ts', 'test/unit/trasare.test.ts'],
    'usa': ['test/unit/import.imagine.test.ts', 'test/unit/import.actiuni.test.ts'],
    'usa2': ['test/unit/import.imagine.test.ts', 'test/unit/import.actiuni.test.ts', 'test/unit/trasare.mediana.test.ts'],
}
E2E = ['test/e2e/trasare-mediana.spec.ts']
