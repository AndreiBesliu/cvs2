# Lista de otrăvuri a feliei 3.Cl-3 (ornamentul cu nume din atelierul Easy 3Draw; ADR 0285), 25.11.2026, alese de autor:
# motorul (fontul dintr-o singură linie și punțile lui, numele scris, linia și golul dintre semne, potrivirea în formă,
# îngroșarea trăsăturilor, formele, scrisul în relief, adâncit și decupat, marginile câmpurilor) și atelierul (piesa din
# filă, numele, câmpul numelui, scrisul, mărimile pe forme, ce se arată, ce intră în piesă).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


LG = 'extensii/trenulet/sursa/lego/lego.ts'
AT = 'extensii/trenulet/sursa/planificator/atelier.ts'
EN = 'extensii/trenulet/sursa/planificator/texte.en.json'

# --- motorul: fontul și punțile
o('F01', LG, '    A: [4, S_A],', '    A: [4.5, S_A],', 'orn', 'A e mai lat decât pe hârtie')
o('F02', LG, '    I: [0, [[[0, 0], [0, 6]]]],', '    I: [0, [[[0, 0], [0, 5.5]]]],', 'orn', 'I e mai scund decât majuscula')
o('F03', LG, 'S_O = [[0, 2], [0, 4, -1], [4, 4], [4, 2, -1], [0, 2]]', 'S_O = [[0, 2], [0, 4, -0.9], [4, 4], [4, 2, -1], [0, 2]]', 'orn', 'O nu mai e din semicercuri')
o('F04', LG, '    K: [3.75, [[[0, 0], [0, 6]], [[3.75, 6], [0, 2.25]], [[1.25, 3.5], [3.75, 0]]]],', '    K: [3.75, [[[0, 0], [0, 6]], [[3.75, 6], [0, 2.25]], [[1.25, 3.5], [3.75, 0.5]]]],', 'orn', 'piciorul lui K nu ajunge la linia de bază (desenul fontului s-a schimbat)')
o('F05', LG, '    "Ă": [4, [...S_A, [[1.1, 7.9, 0.6], [2.9, 7.9]]]],', '    "Ă": [4, [...S_A, [[1.1, 7.9, -0.6], [2.9, 7.9]]]],', 'orn', 'căciula lui Ă, întoarsă')
o('F06', LG, '0: [1.75, -1, 7], 4: [1.7, -1, 3],', '0: [1.75, -1, 7], 4: [1.7, -1, 1.5],', 'orn', 'puntea lui 4 nu ajunge la bara lui: ochiul cade')
o('F07', LG, '6: [1.75, -1, 1.75],', '6: [1.75, 0.5, 1.75],', 'orn', 'puntea lui 6 nu trece prin peretele de jos: ochiul cade')
o('F08', LG, ' Q: [2, 3, 7],', '', 'orn', 'Q nu mai are punte')
o('F09', LG, 'P: [2, 4.5, 7],', 'P: [2, 4.5, 5],', 'orn', 'puntea lui P se oprește în ochi: nu-l leagă de nimic')
o('F10', LG, 'punti: b ? [dreptForma(x + b[0] * u - CRACIUN.nervura / 2,', 'punti: b ? [dreptForma(x + b[0] * u - 0.2,', 'orn', 'puntea e mai îngustă într-o parte')

# --- motorul: numele scris
o('N01', LG, ': "").toUpperCase().replace(', ': "").replace(', 'orn', 'numele nu mai e trecut în majuscule')
o('N02', LG, '.replace(/\\u015e/g, String.fromCharCode(0x218))', '', 'orn', 'S cu sedilă nu mai devine Ș')
o('N03', LG, '.replace(/\\u0162/g, String.fromCharCode(0x21a))', '.replace(/\\u0162/g, String.fromCharCode(0x218))', 'orn', 'T cu sedilă devine Ș')
o('N04', LG, '.replace(/\\s+/g, " ").trim();\n    let text = "", sarite = "";', '.trim();\n    let text = "", sarite = "";', 'orn', 'un tab din nume e un semn necunoscut')
o('N05', LG, 'else if (!sarite.includes(c)) sarite += c; }', 'else sarite += c; }', 'orn', 'un semn sărit de două ori e spus de două ori')
o('N06', LG, 'literaDecupata: 8, semne: 16,', 'literaDecupata: 8, semne: 17,', 'orn', 'un nume are 17 semne')
o('N07', LG, 'const lung = [...text].length > ORNAMENT.semne;', 'const lung = [...text].length >= ORNAMENT.semne;', 'orn', 'un nume de exact 16 semne e spus prea lung')
o('N08', LG, 'avert.push([...nume.sarite].length > 1 ? tr`Nu am semnele', 'avert.push([...nume.sarite].length > 2 ? tr`Nu am semnele', 'orn', 'două semne sărite, spuse la singular')
o('N09', LG, '    text = text.replace(/ +/g, " ").trim();\n', '', 'orn', 'spațiile rămase în jurul unui semn sărit nu se strâng')

# --- motorul: linia, golul dintre semne, cutia numelui
LS = 'const liniaScris = (h: number): number => Math.max(1.2, Math.min(2.6, 0.16 * h));'
o('R01', LG, LS, LS.replace('0.16 * h', '0.18 * h'), 'orn', 'linia e 18 % din majusculă')
o('R02', LG, LS, LS.replace('Math.max(1.2,', 'Math.max(1,'), 'orn', 'linia coboară sub 1,2 mm')
o('R03', LG, LS, LS.replace('Math.min(2.6,', 'Math.min(3,'), 'orn', 'linia trece de 2,6 mm')
IS = 'w + (scris === "decupat" ? Math.max(CRACIUN.nervura, 0.8 * w) : 0.8 * w);'
o('R04', LG, IS, IS.replace(': 0.8 * w);', ': 0.6 * w);'), 'orn', 'semnele scrisului în relief, mai apropiate')
o('R05', LG, IS, IS.replace('Math.max(CRACIUN.nervura, 0.8 * w)', '0.8 * w'), 'orn', 'peretele dintre semnele decupate coboară sub 1,2 mm')
o('R06', LG, '(semne.length - 1) * G + w, Y: (sus - jos) * u + w, jos, sus, w, G };', '(semne.length - 1) * G, Y: (sus - jos) * u + w, jos, sus, w, G };', 'orn', 'lățimea cutiei uită linia')
o('R07', LG, '(semne.length - 1) * G + w, Y: (sus - jos) * u + w, jos, sus, w, G };', '(semne.length - 1) * G + w, Y: 6 * u + w, jos, sus, w, G };', 'orn', 'înălțimea cutiei uită virgula și căciula')

# --- motorul: potrivirea
o('P01', LG, 'const ORNAMENT = { margine: 2,', 'const ORNAMENT = { margine: 1,', 'orn', 'marginea din jurul numelui e de 1 mm')
o('P02', LG, 'literaMare: 40,', 'literaMare: 30,', 'orn', 'majuscula se oprește la 30 mm')
o('P03', LG, 'literaMica: 4.8,', 'literaMica: 4,', 'orn', 'numele se scrie și cu litere de 4 mm')
o('P04', LG, 'literaDecupata: 8, semne: 16,', 'literaDecupata: 6, semne: 16,', 'orn', 'scrisul decupat coboară la 6 mm')
o('P05', LG, 'if (pp === 0) { if (qq < 0) return false; continue; }', 'if (pp === 0) { if (qq > 0) return false; continue; }', 'orn', 'o latură paralelă cu dreptunghiul e judecată pe dos')
o('P06', LG, 'if (pp < 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t);', 'if (pp > 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t);', 'orn', 'tăierea laturii cu dreptunghiul, pe dos')
o('P07', LG, 'loc = [(ORNAMENT.gauraLa + ORNAMENT.gaura) / 2, 0]; }', 'loc = [0, 0]; }', 'orn', 'numele etichetei stă la mijlocul ei, peste gaură')
o('P08', LG, '      loc = [0, -0.2 * r];', '      loc = [0, -0.1 * r];', 'orn', 'numele inimii, mai sus')
o('P09', LG, '      loc = [0, 0.08 * R];', '      loc = [0, 0];', 'orn', 'numele stelei, în centrul ei')
o('P10', LG, 'else if (litera < 6) avert.push(', 'else if (litera < 5) avert.push(', 'orn', 'literele de 5,7 mm nu se mai spun mici')
o('P11', LG, 'yb = q.loc[1] - (jos + sus) / 2 * u, out:', 'yb = q.loc[1] - 3 * u, out:', 'orn', 'numele e așezat după majusculă, nu după cerneală')
o('P12', LG, '    let x = q.loc[0] - X / 2 + w / 2;', '    let x = q.loc[0] - X / 2;', 'orn', 'numele pornește cu jumătate de linie mai la stânga')
o('P13', LG, '      x += lat * u + G;', '      x += lat * u + G / 2;', 'orn', 'semnele, mai înghesuite decât spune cutia')
o('P14', LG, 'x0 = loc[0] - c.X / 2 - m, x1 = loc[0] + c.X / 2 + m, y0 = loc[1] - c.Y / 2 - m, y1 = loc[1] + c.Y / 2 + m;', 'x0 = loc[0] - c.X / 2 - m, x1 = loc[0] + c.X / 2 + m, y0 = loc[1] - c.Y / 2, y1 = loc[1] + c.Y / 2;', 'orn', 'marginea nu se ține și pe înălțime')

# --- motorul: îngroșarea trăsăturilor
o('T01', LG, 'w / 2 - 0.002 * k));', 'w / 2 - 0.2 * k));', 'orn', 'a doua trăsătură a unui semn, mult mai subțire')
o('T02', LG, 'n = Math.ceil(Math.abs(tot) / (Math.PI / 2) - 1e-9), dx = b[0] - a[0]', 'n = Math.ceil(Math.abs(tot) / (Math.PI * 2) - 1e-9), dx = b[0] - a[0]', 'orn', 'arcele mari nu se mai împart în sferturi')
o('T03', LG, 'return Math.abs(a.area()) > Math.abs(b.area()) ? { ext: spreStanga(dinPl(a))', 'return Math.abs(a.area()) < Math.abs(b.area()) ? { ext: spreStanga(dinPl(a))', 'orn', 'la o trăsătură închisă, marginea și golul, schimbate între ele')
o('T04', LG, '    ext[ext.length - 1]![2] = 1;\n', '    ext[ext.length - 1]![2] = 0;\n', 'orn', 'capătul trăsăturii e drept, nu rotund')
o('T05', LG, 'ext.push([st[k]![0], st[k]![1], k > 0 ? -st[k - 1]![2] : 1]);', 'ext.push([st[k]![0], st[k]![1], k > 0 ? -st[k - 1]![2] : 0]);', 'orn', 'începutul trăsăturii e drept, nu rotund')
o('T06', LG, '(j === i ? l : l.flatMap(o => scadeForma(o, y.ext)))', 'l', 'orn', 'ochiul unei trăsături închise taie trăsăturile care trec prin el')
o('T07', LG, 'if (t.length === 1) return { ext: [[t[0]![0] + d, t[0]![1], 1], [t[0]![0] - d, t[0]![1], 1]], gauri: [] };', 'if (t.length === 1) return { ext: [[t[0]![0] + d / 2, t[0]![1], 1], [t[0]![0] - d / 2, t[0]![1], 1]], gauri: [] };', 'orn', 'punctul e de două ori mai mic decât linia')
o('T08', LG, 'glob.Cavalier.plineOpen(sferturi(t.map((q): Vf => [q[0]!, q[1]!, q[2] ?? 0]))).extents()', 'glob.Cavalier.plineOpen(t.map((q): Vf => [q[0]!, q[1]!, q[2] ?? 0])).extents()', 'orn', 'întinderea unui semn, socotită pe arcele întregi (S și 3 ies din cutie)')

# --- motorul: formele
o('S01', LG, 'const W = lungime, Ht = inaltime, c = Math.min(Ht / 3, 8);', 'const W = lungime, Ht = inaltime, c = Ht / 3;', 'orn', 'teșitura etichetei nu se oprește la 8 mm')
o('S02', LG, 'gaura: 2, gauraLa: 5 };', 'gaura: 2, gauraLa: 6 };', 'orn', 'gaura etichetei, la 6 mm de capăt')
o('S03', LG, 'gaura: 2, gauraLa: 5 };', 'gaura: 2.5, gauraLa: 5 };', 'orn', 'gaura etichetei, de 5 mm')
GL = '      // discul, cu căpăcelul și inelul globului\n      const R = diam / 2, capL = Math.max(8, 0.26 * diam), capH = Math.max(4, 0.09 * diam);'
o('S04', LG, GL, GL.replace('0.09 * diam', '0.12 * diam'), 'orn', 'căpăcelul globului cu nume, mai înalt')
o('S05', LG, 'const r = diam / 3.6, a = 0.8 * r, lg = Math.hypot(a, 2.2 * r)', 'const r = diam / 3.6, a = 0.7 * r, lg = Math.hypot(a, 2.2 * r)', 'orn', 'lobii inimii, mai apropiați')
o('S06', LG, 'forme.push(dreptForma(-CRACIUN.tija / 2, 0.6 * r - 1, CRACIUN.tija / 2, r + 0.2), i.disc);', 'forme.push(dreptForma(-CRACIUN.tija, 0.6 * r - 1, CRACIUN.tija, r + 0.2), i.disc);', 'orn', 'tija inelului inimii, de două ori mai lată')
o('S07', LG, 'const rr = k % 2 ? 0.55 * R : R, uu = Math.PI / 2 + Math.PI * k / 5;', 'const rr = k % 2 ? 0.5 * R : R, uu = Math.PI / 2 + Math.PI * k / 5;', 'orn', 'steaua cu nume, mai subțire')
o('S08', LG, 'agatatoare = d.agatatoare === "fara" ? "fara" : et ? "gaura" : "inel";', 'agatatoare = d.agatatoare === "fara" ? "fara" : et ? "inel" : "gaura";', 'orn', 'eticheta cu inel, celelalte cu gaură')
o('S09', LG, 'if (agatatoare === "inel") { const i = inelAgatat(R + capH); forme.push(i.disc); gauri.push(i.gol); }\n    } else if (forma === "inima") {', '{ const i = inelAgatat(R + capH); forme.push(i.disc); gauri.push(i.gol); }\n    } else if (forma === "inima") {', 'orn', 'globul „fără” are tot inel')
o('S10', LG, 'forme.push(tijaInel(poli, R), i.disc); gauri.push(i.gol); }\n      loc = [0, 0.08 * R];', 'forme.push(tijaInel(poli, R), i.disc); }\n      loc = [0, 0.08 * R];', 'orn', 'inelul stelei cu nume n-are gol')
o('S11', LG, 'const forma = d.forma === "glob" || d.forma === "inima" || d.forma === "stea" ? d.forma : "eticheta", et = forma === "eticheta";', 'const forma = d.forma === "glob" || d.forma === "inima" ? d.forma : "eticheta", et = forma === "eticheta";', 'orn', 'steaua nu mai e o formă a ornamentului')
o('S12', LG, '[a + r, 0, SQ], [a, r, sus], [0, 0.6 * r, sus], [-a, r, SQ],', '[a + r, 0, SQ], [a, r, sus], [0, 0.4 * r, sus], [-a, r, SQ],', 'orn', 'crestătura inimii, mai adâncă decât pe hârtie')

# --- motorul: scrisul
o('W01', LG, '...prismaUnite(bucati, [], h - 0.01, h + q.relief)]);', '...prismaUnite(bucati, [], h + 0.01, h + q.relief)]);', 'orn', 'literele în relief plutesc deasupra plăcii')
o('W02', LG, '...prismaUnite(bucati, [], h - 0.01, h + q.relief)]);', '...prismaUnite(bucati, [], h - 0.01, h + q.relief / 2)]);', 'orn', 'relieful e pe jumătate')
o('W03', LG, 'return corp([...prismaUnite(q.baza, q.gauri, 0, h - q.relief), ', 'return corp([...prismaUnite(q.baza, q.gauri, 0, h), ', 'orn', 'scrisul adâncit nu mai e adâncit')
o('W04', LG, '...bucati.flatMap(b => b.gauri.flatMap(g => prismaGauri(poli(g), [], h - q.relief - 0.01, h)))]);', '...[] as Tri[]]);', 'orn', 'ochiurile literelor adâncite lipsesc')
o('W05', LG, 's.punti.reduce((l: Vf[][], pt) => l.flatMap(o => scadeForma(o, pt)), [b.ext])', '[b.ext]', 'orn', 'scrisul decupat n-are punți')
o('W06', LG, 'b.gauri.reduce((l: Vf[][], g) => l.flatMap(o => scadeForma(o, g)), s.punti.reduce((l: Vf[][], pt) => l.flatMap(o => scadeForma(o, pt)), [b.ext]))', 's.punti.reduce((l: Vf[][], pt) => l.flatMap(o => scadeForma(o, pt)), [b.ext])', 'orn', 'la scrisul decupat, ochiurile literelor sunt tăiate cu totul')
o('W07', LG, 'if (scris === "adancit" && relief > grosime - 0.6 + 1e-9) { relief = zecime(grosime - 0.6);', 'if (scris === "adancit" && relief > grosime - 0.2 + 1e-9) { relief = zecime(grosime - 0.2);', 'orn', 'scrisul adâncit lasă doar 0,2 mm dedesubt')
o('W08', LG, 'cuScris = nume.text !== "" && scris !== "decupat";', 'cuScris = nume.text !== "";', 'orn', 'relieful din afara marginilor se spune și la scrisul decupat')
o('W09', LG, 'schimb: q.scris === "relief" && q.litera ? q.grosime : 0 }; },', 'schimb: q.scris === "relief" ? q.grosime : 0 }; },', 'orn', 'schimbul de filament, spus și fără nume scris')
o('W10', LG, 'if (cuScris) avert.push(tr`Scrisul adâncit lasă cel puțin 0,6 mm dedesubt', 'if (!cuScris) avert.push(tr`Scrisul adâncit lasă cel puțin 0,6 mm dedesubt', 'orn', 'adâncimea adusă înapoi nu se mai spune')

# --- motorul: marginile câmpurilor
o('C01', LG, 'd.lungime, 40, 160, 70,', 'd.lungime, 40, 200, 70,', 'orn', 'eticheta primește și 200 mm')
o('C02', LG, 'd.inaltime, 16, 60, 26,', 'd.inaltime, 10, 60, 26,', 'orn', 'eticheta primește și 10 mm înălțime')
o('C03', LG, 'campMarginit(et ? mute : avert, d.diam, 30, 120, 60,', 'campMarginit(et ? mute : avert, d.diam, 30, 150, 60,', 'orn', 'ornamentul primește și 150 mm')
o('C04', LG, 'campMarginit(et ? mute : avert, d.diam, 30, 120, 60,', 'campMarginit(avert, d.diam, 30, 120, 60,', 'orn', 'eticheta spune ceva despre o mărime care nu e a ei')
o('C05', LG, 'd.grosime, 1.2, 6, 3, x => tr`Grosimea unui ornament', 'd.grosime, 1.2, 8, 3, x => tr`Grosimea unui ornament', 'orn', 'ornamentul primește și 8 mm grosime')
o('C06', LG, 'd.relief, 0.4, 3, 0.8, x => tr`Scrisul are', 'd.relief, 0.4, 3, 1, x => tr`Scrisul are', 'orn', 'relieful obișnuit e de 1 mm')
o('C07', LG, 'campMarginit(et ? avert : mute, d.lungime,', 'campMarginit(avert, d.lungime,', 'orn', 'globul spune ceva despre lungimea etichetei')

# --- atelierul
o('A01', AT, '["glob", "Glob"], ["ornament", "Ornament cu nume"]]]', '["ornament", "Ornament cu nume"], ["glob", "Glob"]]]', 'e2e', 'ornamentul, înaintea globului în galerie')
o('A02', AT, 'ornament: { forma: "eticheta", text: "ANA", scris: "relief", lungime: 70,', 'ornament: { forma: "eticheta", text: "ION", scris: "relief", lungime: 70,', 'e2e', 'numele de la început e altul')
o('A03', AT, 'q.scris === "decupat" ? tr(", decupat") : q.scris === "adancit" ?', 'q.scris === "decupat" ? "" : q.scris === "adancit" ?', 'e2e', 'numele piesei nu spune că e decupată')
o('A04', AT, '(q.relief === 0.8 ? tr(", adâncit") : tr`, adâncit ${fmt(q.relief)} mm`)', '(q.relief === 1 ? tr(", adâncit") : tr`, adâncit ${fmt(q.relief)} mm`)', 'e2e', 'adâncimea obișnuită se scrie în nume')
o('A05', AT, ': q.relief === 0.8 ? "" : tr`, în relief de ${fmt(q.relief)}`;\n      return cap +', ': "";\n      return cap +', 'e2e', 'numele piesei nu spune relieful neobișnuit')
o('A06', AT, 'return cap + (et ? tr`, ${fmt(q.lungime)} × ${fmt(q.inaltime)} mm` : tr`, de ${fmt(q.diam)} mm`)', 'return cap + (!et ? tr`, ${fmt(q.lungime)} × ${fmt(q.inaltime)} mm` : tr`, de ${fmt(q.diam)} mm`)', 'e2e', 'mărimile din nume, ale altei forme')
o('A07', AT, ': et ? tr(", fără gaură") : tr(", fără inel"));\n    }\n    if (d.tip === "rotita") {', ': et ? tr(", fără inel") : tr(", fără gaură"));\n    }\n    if (d.tip === "rotita") {', 'e2e', 'eticheta „fără inel”, inima „fără gaură”')
o('A08', AT, 'q.forma === "inima" ? (cu ? tr`Inimă „${q.text}”` : tr("Inimă fără nume"))', 'q.forma === "inima" ? (cu ? tr`Stea „${q.text}”` : tr("Inimă fără nume"))', 'e2e', 'inima se numește stea')
o('A09', AT, 'for (const k of ["forma", "text", "grosime", "agatatoare"] as const) p[k] = q[k];', 'for (const k of ["forma", "grosime", "agatatoare"] as const) p[k] = q[k];', 'e2e', 'același nume scris altfel e altă piesă')
o('A10', AT, 'if (q.forma === "eticheta") { p.lungime = q.lungime; p.inaltime = q.inaltime; delete p.diam; }', 'if (q.forma === "eticheta") { p.lungime = q.lungime; p.inaltime = q.inaltime; }', 'e2e', 'mărimea altei forme intră în etichetă')
o('A11', AT, 'if (q.text) p.scris = q.scris; else delete p.scris;', 'p.scris = q.scris;', 'e2e', 'scrisul ținut minte intră și în forma fără nume')
o('A12', AT, 'if (q.text && q.scris !== "decupat") p.relief = q.relief; else delete p.relief;', 'if (q.text) p.relief = q.relief; else delete p.relief;', 'e2e', 'relieful ținut minte intră și în piesa decupată')
o('A13', AT, 'if (q.text && q.scris !== "decupat") p.relief = q.relief; else delete p.relief;', 'if (q.scris !== "decupat") p.relief = q.relief; else delete p.relief;', 'e2e', 'relieful ținut minte intră și în forma fără nume')
o('A14', AT, 'type="text" maxlength="16" autocomplete="off"', 'type="text" maxlength="20" autocomplete="off"', 'e2e', 'câmpul numelui primește 20 de semne')
o('A15', AT, 'spellcheck="false" value="${q.text}"></label></div>', 'spellcheck="false" value="${p.text}"></label></div>', 'e2e', 'câmpul arată numele cum a fost scris, nu cum se scrie pe piesă')
o('A16', AT, 'onchange = ev => { p.text = (ev.target as HTMLInputElement).value; editor(); schimbat(); };', 'onchange = ev => { p.text = (ev.target as HTMLInputElement).value; schimbat(); };', 'e2e', 'după un nume nou, editorul nu se reface')
o('A17', AT, ': q.scris === "relief" ? litere + " " + tr`Pentru două culori', ': q.scris === "adancit" ? litere + " " + tr`Pentru două culori', 'e2e', 'schimbul de filament, spus la scrisul adâncit')
o('A18', AT, '(după stratul ${Math.round(q.schimb / 0.2)}, la straturi de 0,2 mm): de acolo în sus se tipărește doar numele.`', '(după stratul ${Math.round(q.schimb / 0.1)}, la straturi de 0,2 mm): de acolo în sus se tipărește doar numele.`', 'e2e', 'stratul schimbului, socotit la 0,1 mm')
o('A19', AT, 'tr`Literele au ${fmt(q.litera)} mm, cu linia de ${fmt(q.linie, 2)} mm.`', 'tr`Literele au ${fmt(q.litera)} mm, cu linia de ${fmt(q.linie)} mm.`', 'e2e', 'linia, rotunjită la zecime')
o('A20', AT, '${q.scris === "adancit" ? tr("Adâncimea (mm)") : tr("Relieful (mm)")}', '${q.scris !== "adancit" ? tr("Adâncimea (mm)") : tr("Relieful (mm)")}', 'e2e', 'câmpul reliefului se numește „Adâncimea”')
o('A21', AT, '${q.text && q.scris !== "decupat" ? `<label for="at-on-relief">', '${q.text ? `<label for="at-on-relief">', 'e2e', 'relieful se arată și la scrisul decupat')
o('A22', AT, '${q.text && q.scris !== "decupat" ? `<label for="at-on-relief">', '${q.scris !== "decupat" ? `<label for="at-on-relief">', 'e2e', 'relieful se arată și fără nume')
o('A23', AT, '${et ? `<label for="at-on-lungime">', '${!et ? `<label for="at-on-lungime">', 'e2e', 'lungimea și înălțimea, arătate la celelalte forme')
o('A24', AT, 'et ? [["gaura", "Gaură"], ["fara", "Fără"]] : [["inel", "Inel"], ["fara", "Fără"]], q.agatatoare)', '!et ? [["gaura", "Gaură"], ["fara", "Fără"]] : [["inel", "Inel"], ["fara", "Fără"]], q.agatatoare)', 'e2e', 'eticheta își arată inelul, celelalte gaura')
o('A25', AT, 'camp("#at-on-lungime", 40, 160,', 'camp("#at-on-lungime", 20, 160,', 'e2e', 'lungimea primește și 20')
o('A26', AT, 'camp("#at-on-inaltime", 16, 60,', 'camp("#at-on-inaltime", 16, 90,', 'e2e', 'înălțimea primește și 90')
o('A27', AT, 'camp("#at-on-diam", 30, 120,', 'camp("#at-on-diam", 30, 200,', 'e2e', 'mărimea primește și 200')
o('A28', AT, 'camp("#at-on-relief", 0.4, 3,', 'camp("#at-on-relief", 0, 3,', 'e2e', 'relieful primește și 0,1')
o('A29', AT, 'camp("#at-on-grosime", 1.2, 6,', 'camp("#at-on-grosime", 1.2, 9,', 'e2e', 'grosimea primește și 9')
o('A30', AT, 'alege("#at-on-ag", v => { p.agatatoare = v; });', 'alege("#at-on-ag", v => { p.scris = v; });', 'e2e', 'agățătoarea ornamentului nu se schimbă')
o('A31', AT, 'const sarite = !q.sarite ? "" :', 'const sarite = q.sarite ? "" :', 'e2e', 'semnele sărite nu se mai spun')
o('A32', AT, '([...q.sarite].length > 1 ? tr`Nu am semnele', '([...q.sarite].length > 2 ? tr`Nu am semnele', 'e2e', 'două semne sărite, spuse la singular')
o('A33', AT, 'et = q.forma === "eticheta", cuNume = q.litera > 0;', 'et = q.forma === "eticheta", cuNume = q.litera >= 0;', 'e2e', 'numele care nu încape e arătat ca scris')
o('A34', AT, ': litere + " " + tr("Semnele cu ochi (ca A, B, O, 8) au câte o punte, ca mijlocul lor să nu cadă.");', ': litere;', 'e2e', 'rândul scrisului decupat nu spune de punți')
o('A35', AT, 'alege("#at-on-scris", v => { p.scris = v; });', 'alege("#at-on-scris", v => { p.forma = v; });', 'e2e', 'scrisul nu se schimbă')

# --- textele
o('X01', EN, ' "Etichetă „{0}”": "Tag “{0}”",', ' "Etichetă „{0}”": "Tag",', 'texte', 'traducerea numelui etichetei pierde numele')
o('X02', AT, 'tr`, adâncit ${fmt(q.relief)} mm`', 'tr`, adancit ${fmt(q.relief)} mm`', 'texte', 'adâncimea din nume, cu alt text decât cel tradus')
o('X03', LG, 'tr`Scrisul are între 0,4 și 3 mm: l-am făcut de ${x} mm.`', 'tr`Scrisul are intre 0,4 și 3 mm: l-am făcut de ${x} mm.`', 'texte', 'mesajul motorului, cu alt text decât cel tradus')
o('X04', EN, ' "Numele nu încape pe forma asta: fă forma mai mare sau numele mai scurt.": "The name does not fit on this shape: make the shape bigger or the name shorter.",\n', '', 'texte', 'un mesaj al motorului, fără traducere')

SETURI = {
    'orn': ['test/unit/trenulet.ornament.test.ts'],
    'texte': ['test/unit/trenulet.engleza.test.ts'],
}
E2E = ['test/e2e/trenulet.ornament.spec.ts']
# pagina și pachetul se fac din surse în spec: build-ul aplicației nu le schimbă (docs/otravuri.md)
E2E_BUILD = False
for x in O:
    assert x['vechi'] != x['nou'], x['id']
