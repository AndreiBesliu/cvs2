# Lista de otrăvuri a feliei 3.Cg (verificarea din vederea „Modelul” a atelierului Easy 3Draw: prinsă, plutește, intră în
# alta; ADR 0284, partea D), 26.11.2026, alese de autor: motorul (prinderile făcute în lume, ciocnirea judecată pe plase,
# verificarea modelului, cu ținerea de minte a ciocnirilor) și atelierul (semnele din listă, rândurile piesei alese,
# rezumatul, vălul și conturul din vederea 3D, „deasupra” care nu mai intră în piesa aleasă).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


LG = 'extensii/trenulet/sursa/lego/lego.ts'
AT = 'extensii/trenulet/sursa/planificator/atelier.ts'
EN = 'extensii/trenulet/sursa/planificator/texte.en.json'

# --- motorul: prinderile făcute în lume
PC = 'const PRINS_MM = 0.05, PRINS_COS = Math.cos(Math.PI / 180), PRINS_SIN = Math.sin(Math.PI / 180), PRINS_TIJA = 2;'
o('M01', LG, PC, PC.replace('PRINS_MM = 0.05', 'PRINS_MM = 0.5'), 'verificare', 'două prinderi la 0,2 mm una de alta trec drept făcute')
o('M02', LG, PC, PC.replace('PRINS_TIJA = 2', 'PRINS_TIJA = 0.5'), 'verificare', 'o tijă ține și cu 1 mm în gaură')
o('M03', LG, PC, PC.replace('PRINS_TIJA = 2', 'PRINS_TIJA = 4'), 'verificare', 'o tijă cu 3 mm în gaură nu mai ține')
o('M04', LG, PC, PC.replace('PRINS_COS = Math.cos(Math.PI / 180)', 'PRINS_COS = Math.cos(Math.PI / 30)'), 'verificare', 'o piesă înclinată cu 3° trece drept față în față')
DI = 'if (!sePrind(a.c.fel, b.c.fel) || scalar(a.d, b.d) > -PRINS_COS) return;'
o('M05', LG, DI, 'if (!sePrind(a.c.fel, b.c.fel)) return;', 'verificare', 'direcțiile prinderilor nu mai sunt cerute opuse')
o('M06', LG, DI, 'if (scalar(a.d, b.d) > -PRINS_COS) return;', 'verificare', 'felurile prinderilor nu mai sunt întrebate (știft cu știft)')
LA = '      if (Math.hypot(dp[0] - g * a.d[0], dp[1] - g * a.d[1], dp[2] - g * a.d[2]) > PRINS_MM) return;\n'
o('M07', LG, LA, '', 'verificare', 'prinderile nu mai trebuie să fie pe aceeași axă')
GL = 'if (Math.min(tata.lung, g + mama.lung) - Math.max(0, g) < Math.min(PRINS_TIJA, tata.lung, mama.lung) - 1e-9) return;'
o('M08', LG, GL, GL.replace('Math.min(tata.lung, g + mama.lung)', 'tata.lung'), 'verificare', 'tija trecută cu totul prin gaură mai e socotită în ea')
o('M09', LG, GL, GL.replace('- Math.max(0, g)', '- g'), 'verificare', 'partea de dinaintea rădăcinii tijei e socotită în gaură')
o('M10', LG, GL, GL.replace('Math.min(PRINS_TIJA, tata.lung, mama.lung)', 'PRINS_TIJA'), 'verificare', 'o gaură mai scurtă de 2 mm nu mai ține nimic')
TM = 'const [tata, mama] = TATA.has(a.c.fel) ? [a.c, b.c] : [b.c, a.c];'
o('M11', LG, TM, 'const [tata, mama] = TATA.has(a.c.fel) ? [b.c, a.c] : [a.c, b.c];', 'verificare', 'tija și gaura, schimbate între ele')
CR = 'if (a.r && b.r) { const co = Math.abs(scalar(a.r, b.r)); if (co < PRINS_COS && co > PRINS_SIN) return; }'
o('M12', LG, '        ' + CR + '\n', '', 'verificare', 'crucea axului ține oricum ar fi întoarsă')
o('M13', LG, CR, CR.replace('co < PRINS_COS && co > PRINS_SIN', 'co < PRINS_COS'), 'verificare', 'crucea ține doar braț pe același braț, nu și întoarsă cu un sfert de tură')
SE = '} else if (Math.abs(g - scalar(aplicaTransf(montaj(a.c, b.c), b.c.p), a.c.d) + scalar(a.c.p, a.c.d)) > PRINS_MM) return;'
o('M14', LG, SE, '}', 'verificare', 'știftul ține la orice adâncime în locaș')
o('M15', LG, SE, '} else if (Math.abs(g) > PRINS_MM) return;', 'verificare', 'știftul mai înalt decât locașul nu mai e prins unde îl lasă montajul')
o('M16', LG, '    if (!transfBuna(Ta) || !transfBuna(Tb)) return out;\n', '', 'verificare', 'o așezare stricată nu mai e ocolită la prinderi')

# --- motorul: ciocnirea pe plase
o('C01', LG, 'const CIOCNIRE = 0.25;', 'const CIOCNIRE = 0.05;', 'verificare', 'un lemn comun de 0,2 mm e ciocnire')
o('C02', LG, 'const CIOCNIRE = 0.25;', 'const CIOCNIRE = 1;', 'verificare', 'un lemn comun de 0,6 mm nu mai e ciocnire')
o('C03', LG, '    if (lat.some(x => x < s)) return false;\n', '', 'verificare', 'cutiile care nu se ating nu mai opresc socoteala')
WN = '''      if (j >= ies.length || (i < intr.length && intr[i]! <= ies[j]!)) { if (n++ === 0) out.push(intr[i]!); i++; }
      else { if (n === 0) return []; if (--n === 0) out.push(ies[j]!); j++; }'''
o('C04', LG, WN, WN.replace('if (n++ === 0) out.push(intr[i]!)', 'if (n++ % 2 === 0) out.push(intr[i]!)').replace('if (--n === 0) out.push(ies[j]!)', 'if (--n % 2 === 0) out.push(ies[j]!)'),
  'verificare', 'lemnul, numărat par-impar: zona suprapusă a două corpuri ale piesei iese gol')
o('C05', LG, 'l = nw > 0 ? ies : intr;', 'l = nw > 0 ? intr : ies;', 'verificare', 'intrările și ieșirile razelor, schimbate între ele')
UV = 'const u0 = r0[u]! + 0.6372 * s, v0 = r0[v]! + 0.6372 * s, M = new Float64Array(15);'
o('C06', LG, UV, UV.replace('u0 = r0[u]! + 0.6372 * s', 'u0 = r0[u]! + 1.6372 * s'), 'verificare', 'primul rând de raze cade în afara părții comune')
o('C07', LG, UV, UV.replace('v0 = r0[v]! + 0.6372 * s', 'v0 = r0[v]! + 1.6372 * s'), 'verificare', 'prima coloană de raze cade în afara părții comune')
PV = '''      if (!comun[c] || !comun[c + 1] || !comun[c + nv] || !comun[c + nv + 1]) continue;
      if (bucatiComune(bucatiComune(comun[c]!, comun[c + 1]!, s), bucatiComune(comun[c + nv]!, comun[c + nv + 1]!, s), s).length) return true;'''
o('C08', LG, PV, '      if (comun[c]) return true;', 'verificare', 'o singură rază cu lemn comun e ciocnire (o felie subțire de-a latul razelor)')
o('C09', LG, PV, PV.replace('|| !comun[c + nv] || !comun[c + nv + 1]) continue;', ') continue;').replace('bucatiComune(bucatiComune(comun[c]!, comun[c + 1]!, s), bucatiComune(comun[c + nv]!, comun[c + nv + 1]!, s), s)', 'bucatiComune(comun[c]!, comun[c + 1]!, s)'),
  'verificare', 'două raze vecine pe o singură axă ajung (o felie subțire pe cealaltă)')
o('C10', LG, PV, PV.replace('|| !comun[c + 1] ', '').replace('bucatiComune(bucatiComune(comun[c]!, comun[c + 1]!, s), bucatiComune(comun[c + nv]!, comun[c + nv + 1]!, s), s)', 'bucatiComune(comun[c]!, comun[c + nv]!, s)').replace(' || !comun[c + nv + 1]', ''),
  'verificare', 'două raze vecine pe cealaltă axă ajung')
BC = 'if (b - a >= gros) out.push(a, b);'
o('C11', LG, BC, 'if (b > a) out.push(a, b);', 'verificare', 'lemnul comun oricât de scurt de pe o rază e ținut (o felie subțire pe raze)')
RZ = 'const [ia, ea] = raze(a, { m: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [0, 0, 0] }), [ib, eb] = raze(b, T);'
o('C12', LG, RZ, RZ.replace('raze(b, T)', 'raze(b, { m: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [0, 0, 0] })'), 'verificare', 'a doua plasă nu e dusă cu transformarea ei')
CB = 'const ca = cutiePlasa(a), cb = cutieDusa(T, cutiePlasa(b)), s = CIOCNIRE;'
o('C13', LG, CB, CB.replace('cb = cutieDusa(T, cutiePlasa(b))', 'cb = cutiePlasa(b)'), 'verificare', 'partea comună a cutiilor, socotită cu a doua piesă nemutată')
AX = 'const w = lat.indexOf(Math.max(...lat)), u = (w + 1) % 3, v = (w + 2) % 3, nu = Math.ceil(lat[u]! / s), nv = Math.ceil(lat[v]! / s);'
o('C14', LG, AX, AX.replace('u = (w + 1) % 3, v = (w + 2) % 3', 'u = (w + 2) % 3, v = (w + 1) % 3'), 'verificare', 'axele razelor, în ordine neciclică (intrările devin ieșiri)')
o('C15', LG, 'if (nw === 0 || !muchie(0, au, av, bu, bv, cu, cv) || !muchie(5, bu, bv, cu, cv, au, av) || !muchie(10, cu, cv, au, av, bu, bv)) continue;',
  'if (nw === 0 || !muchie(0, au, av, bu, bv, cu, cv) || !muchie(5, bu, bv, cu, cv, au, av)) continue;', 'verificare', 'triunghiul, judecat doar pe două muchii (se întinde peste a treia)')
AD = 'if (!afara) (l[i * nv + j] ??= []).push(aw - pu * (U - au) - pv * (V - av));'
o('C16', LG, AD, AD.replace('aw - pu * (U - au) - pv * (V - av)', 'aw'), 'verificare', 'adâncimea pe rază, luată la colțul triunghiului, nu în punctul razei')
PA = 'const pu = ((bv - av) * (cw - aw) - (bw - aw) * (cv - av)) / nw, pv = ((bw - aw) * (cu - au) - (bu - au) * (cw - aw)) / nw, l = nw > 0 ? ies : intr;'
o('C17', LG, PA, PA.replace('pv = ((bw - aw) * (cu - au) - (bu - au) * (cw - aw)) / nw', 'pv = ((bu - au) * (cw - aw) - (bw - aw) * (cu - au)) / nw'), 'verificare', 'panta triunghiului pe v, cu semnul întors')
TB = 'if (!a.length || !b.length || !transfBuna(T)) return false;'
o('C18', LG, TB, 'if (!a.length || !b.length) return false;', 'verificare', 'o așezare stricată nu mai e ocolită la ciocnire')

# --- motorul: verificarea modelului
o('V01', LG, 'const PE_MASA = 0.05;', 'const PE_MASA = 5;', 'verificare', 'o piesă la 1,6 mm deasupra mesei trece drept așezată pe ea')
MS = 'const masa = Math.max(0, Math.min(...jos.values()));'
o('V02', LG, MS, 'const masa = 0;', 'verificare', 'fără nimic pe masă, tot modelul plutește')
o('V03', LG, MS, 'const masa = Math.min(...jos.values());', 'verificare', 'cu o piesă sub masă, tot ce stă pe masă plutește')
PR = 'if (prinseInLume(A.prinderi, A.T, B.prinderi, B.T).length) { out[i]!.prinsa.push(j); out[j]!.prinsa.push(i); grup[radacina(i)] = radacina(j); }'
o('V04', LG, PR, PR.replace(' grup[radacina(i)] = radacina(j);', ''), 'verificare', 'piesele prinse nu mai fac un grup: cea de sus plutește')
o('V05', LG, PR, PR.replace(' out[j]!.prinsa.push(i);', ''), 'verificare', 'prinderea e spusă doar pentru prima piesă a perechii')
o('V06', LG, PR, PR.replace('grup[radacina(i)] = radacina(j);', 'grup[i] = j;'), 'verificare', 'grupurile, legate fără rădăcini: un lanț de trei se rupe')
CT = "if (!ci || !cj || [0, 1, 2].some(k => ci[0][k]! > cj[1][k]! + PRINS_MM || cj[0][k]! > ci[1][k]! + PRINS_MM)) continue;"
o('V07', LG, CT, 'if (!ci || !cj) continue;', 'verificare', 'perechile cu cutiile departate sunt și ele judecate (și ținute minte)')
o('V08', LG, CT, CT.replace('[0, 1, 2].some', '[0, 1].some'), 'verificare', 'cutiile, comparate doar pe x și y (o piesă de dedesubt e judecată)')
CH = '''`${A.cheie}|${B.cheie}|${[...rel.m, ...rel.t].map(x => Math.round(x * 1e5) / 1e5 + 0).join(",")}`'''
o('V09', LG, CH, '`${A.cheie}|${B.cheie}`', 'verificare', 'ciocnirea ținută minte fără așezarea pieselor: mutată, perechea spune tot ce spunea')
o('V10', LG, CH, CH.replace('${A.cheie}|${B.cheie}|', '${A.cheie}|'), 'verificare', 'ciocnirea ținută minte fără a doua piesă')
LV = 'if (lovit) { out[i]!.intra.push(j); out[j]!.intra.push(i); }'
o('V11', LG, LV, 'if (lovit) { out[i]!.intra.push(j); }', 'verificare', 'ciocnirea e spusă doar pentru prima piesă a perechii')
o('V12', LG, LV, 'if (!lovit) { out[i]!.intra.push(j); out[j]!.intra.push(i); }', 'verificare', 'ciocnirea, spusă pe dos')
RL = 'const rel = compuneTransf(inversTransf(A.T), B.T);'
o('V13', LG, RL, 'const rel = B.T;', 'verificare', 'ciocnirea, socotită fără așezarea primei piese')
o('V14', LG, RL, 'const rel = compuneTransf(B.T, inversTransf(A.T));', 'verificare', 'așezarea uneia față de cealaltă, compusă invers')
IV = 'return { m, t: [-q[0], -q[1], -q[2]] }; };'
o('V15', LG, IV, 'return { m, t: [q[0], q[1], q[2]] }; };', 'verificare', 'inversa unei mutări, cu mutarea neîntoarsă')
CU = 'const cutii = piese.map(p => (p.tri.length && transfBuna(p.T) ? cutieDusa(p.T, cutiePlasa(p.tri)) : null));'
o('V16', LG, CU, CU.replace('p.tri.length && transfBuna(p.T)', 'p.tri.length'), 'verificare', 'o piesă cu așezarea stricată e judecată (și numărată ca bucată)')
o('V17', LG, CU, CU.replace('p.tri.length && transfBuna(p.T)', 'transfBuna(p.T)'), 'verificare', 'o piesă fără plasă e numărată ca bucată')
ME = 'if (lovit === undefined) { lovit = seCiocnesc(A.tri, B.tri, rel); if (cheie) memo!.set(cheie, lovit); }'
o('V18', LG, ME, 'if (lovit === undefined) { lovit = seCiocnesc(A.tri, B.tri, rel); }', 'verificare', 'ciocnirile nu mai sunt ținute minte')
o('V19', LG, 'let lovit = cheie ? memo!.get(cheie) : undefined;', 'let lovit: boolean | undefined = undefined;', 'verificare', 'ciocnirile ținute minte nu mai sunt citite')
PL = 'out[i]!.pluteste = jos.get(radacina(i))! > masa + PE_MASA;'
o('V20', LG, PL, 'out[i]!.pluteste = c[0][2] > masa + PE_MASA;', 'verificare', 'plutirea, judecată pe piesă, nu pe grupul ei')

# --- atelierul: verificarea, semnele, rândurile piesei alese, rezumatul
SM = 'const semnM = (st: StareM | undefined) => (!st ? "" : st.intra.length ? "intra" : st.pluteste ? "pluteste" : "");'
o('A01', AT, SM, 'const semnM = (st: StareM | undefined) => (!st ? "" : st.pluteste ? "pluteste" : st.intra.length ? "intra" : "");', 'e2e', 'plutirea trece înaintea ciocnirii')
o('A02', AT, '    const cheie = JSON.stringify([model, paramMotor()]);\n    if (verificat && verificat.cheie === cheie) return verificat;', '    const cheie = "x";\n    if (verificat && verificat.cheie === cheie) return verificat;', 'e2e', 'verificarea nu se mai reface când modelul se schimbă')
VM = 'verificat = { cheie, piese: new Map(piese.map((x, i) => [x.id, { prinsa: v.piese[i]!.prinsa.map(id), intra: v.piese[i]!.intra.map(id), pluteste: v.piese[i]!.pluteste }])), bucati: v.bucati };'
o('A03', AT, VM, VM.replace('intra: v.piese[i]!.intra.map(id)', 'intra: v.piese[i]!.prinsa.map(id)'), 'e2e', 'piesele de care e prinsă sunt spuse drept cele în care intră')
o('A04', AT, VM, VM.replace('pluteste: v.piese[i]!.pluteste', 'pluteste: false'), 'e2e', 'nicio piesă nu mai plutește')
o('A05', AT, '<li data-avert="${semnM(V.piese.get(x.id))}">', '<li data-avert="">', 'e2e', 'rândurile listei nu-și mai spun semnul')
SL = 'return f === "intra" ? ` <span class="semn rau">intră în alta</span>` : f === "pluteste" ? ` <span class="semn">plutește</span>` : "";'
o('A06', AT, SL, SL.replace('<span class="semn rau">intră în alta</span>', '<span class="semn">intră în alta</span>'), 'e2e', 'semnul „intră în alta” are culoarea lui „plutește”')
o('A07', AT, SL, SL.replace('f === "pluteste" ? ` <span class="semn">plutește</span>` : ""', '""'), 'e2e', 'piesa care plutește nu are semn pe rând')
o('A08', AT, SL, SL.replace('f === "intra" ? ` <span class="semn rau">intră în alta</span>` : ', ''), 'e2e', 'piesa care intră în alta nu are semn pe rând')
DF = 'if (baza && !st.prinsa.includes(baza.id)) stari +='
o('A09', AT, DF, 'if (baza) stari +=', 'e2e', '„Legată de…, dar nu mai ține” apare la orice piesă alipită')
o('A10', AT, DF, 'if (baza && st.prinsa.includes(baza.id)) stari +=', 'e2e', '„nu mai ține” apare când prinderea ține')
IT = 'if (st.intra.length) stari += `<p class="avert rau" data-stare="intra">${tr`Intră în ${numeM(st.intra)}.`}</p>`;'
o('A11', AT, '      ' + IT + '\n', '', 'e2e', 'piesa aleasă nu mai spune în cine intră')
o('A12', AT, IT, IT.replace('numeM(st.intra)', 'numeM(st.prinsa)'), 'e2e', '„Intră în” numește piesele de care e prinsă')
o('A13', AT, IT, IT.replace('class="avert rau"', 'class="avert"'), 'e2e', 'rândul ciocnirii are culoarea atenției, nu a pericolului')
PT = 'st.prinsa.length ? tr("Plutește, cu piesele de care e prinsă: niciuna nu ajunge la masă.") : tr("Plutește: nu stă pe masă și nu e prinsă de nimic.")'
o('A14', AT, PT, PT.replace('st.prinsa.length ?', '!st.prinsa.length ?'), 'e2e', 'cele două feluri de plutire, schimbate între ele')
o('A15', AT, 'if (st.pluteste) stari += `<p class="avert" data-stare="pluteste">', 'if (st.pluteste) stari += `<p class="mic" data-stare="pluteste">', 'e2e', 'rândul plutirii nu mai are culoarea atenției')
NP = 'else if (!st.intra.length && !st.pluteste) stari +='
o('A16', AT, NP, 'else stari +=', 'e2e', '„Nu e prinsă de alte piese” apare și lângă un avertisment')
o('A17', AT, 'if (st.prinsa.length) stari += `<p class="mic" data-stare="prinsa">${tr`Prinsă de ${numeM(st.prinsa)}.`}</p>`;', 'if (st.prinsa.length) stari += `<p class="mic" data-stare="prinsa">${tr`Prinsă de ${numeM(st.prinsa.slice(0, 1))}.`}</p>`;', 'e2e', '„Prinsă de” numește doar prima piesă')
o('A18', AT, 'if (m && st && model.length > 1) {', 'if (m && st) {', 'e2e', 'și singura piesă a modelului primește un rând de verificare')
RE = 'const rezumat = model.length < 2 ? "" :'
o('A19', AT, RE, 'const rezumat = model.length < 1 ? "" :', 'e2e', 'rezumatul apare și la o singură piesă')
LO = 'const lovite = model.filter(x => V.piese.get(x.id)?.intra.length).length, inAer = model.filter(x => V.piese.get(x.id)?.pluteste).length;'
o('A20', AT, LO, LO.replace('inAer = model.filter(x => V.piese.get(x.id)?.pluteste).length', 'inAer = model.filter(x => semnM(V.piese.get(x.id)) === "pluteste").length'), 'e2e', 'o piesă care și intră în alta, și plutește nu mai e numărată la plutire')
RL2 = 'const rele = [lovite ? tr`${cuDe(lovite)} piese intră una în alta` : "", inAer === 1 ? tr("o piesă plutește") : inAer ? tr`${cuDe(inAer)} piese plutesc` : ""].filter(Boolean);'
o('A21', AT, RL2, RL2.replace('inAer === 1 ? tr("o piesă plutește") : inAer ?', 'inAer ?'), 'e2e', '„1 piese plutesc”')
o('A22', AT, RL2, RL2.replace('lovite ? tr`${cuDe(lovite)} piese intră una în alta` : "", ', ''), 'e2e', 'rezumatul nu mai spune de ciocniri')
o('A23', AT, 'tr`Verificare: ${rele.join(" · ")}.`', 'tr`Verificare: ${rele.join(", ")}.`', 'e2e', 'părțile rezumatului, despărțite prin virgulă')
o('A24', AT, 'V.bucati > 1 ? tr`Modelul e din ${cuDe(V.bucati)} bucăți care nu se țin între ele.` : tr("Toate piesele se țin între ele.")', 'V.bucati > 2 ? tr`Modelul e din ${cuDe(V.bucati)} bucăți care nu se țin între ele.` : tr("Toate piesele se țin între ele.")', 'e2e', 'două bucăți neprinse trec drept „toate se țin”')
o('A25', AT, '`<p class="${rele.length ? "at-avert" : "mic"}" id="at-m-verificare">', '`<p class="${rele.length ? "mic" : "at-avert"}" id="at-m-verificare">', 'e2e', 'rezumatul are culoarea atenției când totul e bine')
o('A26', AT, '        ${stari ? `<div class="model-stare" id="at-m-stare">${stari}</div>` : ""}\n', '', 'e2e', 'piesa aleasă nu-și mai arată rândurile verificării')
o('A27', AT, '      ${rezumat}\n', '', 'e2e', 'rezumatul nu mai e pus în pagină')

# --- atelierul: vălul și conturul din vederea 3D
MA = 'const k = (contur ? "!!" : "!") + semn, color = semn === "intra" ? 0xe5484d : 0xf5a524;'
o('A30', AT, MA, MA.replace('semn === "intra" ? 0xe5484d : 0xf5a524', 'semn === "intra" ? 0xf5a524 : 0xe5484d'), 'e2e', 'culorile avertismentelor din vedere, schimbate între ele')
o('A31', AT, MA, MA.replace('(contur ? "!!" : "!") + semn', '(contur ? "!!" : "!")'), 'e2e', 'materialul avertismentului, ținut fără felul lui: al doilea fel ia culoarea primului')
o('A32', AT, '        v3.avert.add(val);\n', '', 'e2e', 'vălul de peste piesă nu mai e pus în vedere')
o('A33', AT, '        v3.avert.add(contur);\n', '', 'e2e', 'conturul din jurul piesei nu mai e pus în vedere')
o('A34', AT, '        v3.avert.add(contur);', '        v3.grup.add(contur);', 'e2e', 'conturul intră în grupul pieselor: mărimea modelului crește cu el')
o('A35', AT, '  const CONTUR = 0.7;', '  const CONTUR = 0;', 'e2e', 'conturul, cât piesa: nu se mai vede')
o('A36', AT, '    while (v3.avert.children.length) v3.avert.remove(v3.avert.children[0]!);\n', '', 'e2e', 'avertismentele vechi rămân în vedere după ce piesa e la loc')
o('A37', AT, '    if (v3.avert) v3.avert.visible = false;\n', '', 'e2e', 'avertismentele modelului rămân la vedere în vederea „Piesa”')
SV = '      const semn = semnM(V.piese.get(m.id));\n      if (semn) {'
o('A38', AT, SV, '      const semn = semnM(V.piese.get(m.id));\n      if (semn === "intra") {', 'e2e', 'în vedere, doar ciocnirile au avertisment')
o('A39', AT, 'new v3.T.MeshBasicMaterial({ color, side: v3.T.BackSide })', 'new v3.T.MeshBasicMaterial({ color })', 'e2e', 'coaja conturului, văzută din afară: acoperă toată piesa cu culoarea plină')

# --- atelierul: „deasupra” nu mai intră în piesa aleasă
IM = ': Math.max(1, Math.ceil(corpModel(m.def).dim[2]! / 3.2 - 1e-6)));'
o('A40', AT, IM, ': Math.max(1, Math.round(corpModel(m.def).dim[2]! / 3.2)));', 'e2e', '„deasupra”, rotunjit la cea mai apropiată placă: roata de 3,8 mm intră 0,6 mm în cea de sub ea')
o('A41', AT, IM, ': Math.max(1, Math.ceil(corpModel(m.def).dim[2]! / 3.2 + 1)));', 'e2e', '„deasupra”, cu o placă în plus')

# --- textele
o('T01', AT, 'tr("Nu e prinsă de alte piese.")', 'tr("Nu e prinsă de altă piesă.")', 'texte', 'rândul piesei neprinse, cu alt text decât cel tradus')
o('T02', EN, ' "Intră în {0}.": "Goes into {0}.",', ' "Intră în {0}.": "Goes into.",', 'texte', 'traducerea pierde numele pieselor')
o('T03', EN, ' "Verificare: {0}.": "Check: {0}.",', ' "Verificare: {0}.": "Check.",', 'texte', 'rezumatul în engleză își pierde conținutul')
o('T04', AT, 'E un avertisment: piesa rămâne unde ai pus-o.</p>', 'E doar un avertisment: piesa rămâne unde ai pus-o.</p>', 'texte', 'textul vederii, schimbat fără traducere')

SETURI = {
    'verificare': ['test/unit/trenulet.verificare.test.ts'],
    'texte': ['test/unit/trenulet.engleza.test.ts'],
}
E2E = ['test/e2e/trenulet.verificare.spec.ts']
# pagina și pachetul se fac din surse în spec: build-ul aplicației nu le schimbă (docs/otravuri.md)
E2E_BUILD = False
for x in O:
    assert x['vechi'] != x['nou'], x['id']
