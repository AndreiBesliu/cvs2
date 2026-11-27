# Lista de otrăvuri a feliei 3.Cm-2 (tipărirea elicelor spusă cinstit; ADR 0340; auditul elicelor, constatarea 1),
# 27.11.2026, alese de autor: motorul (`TIPAR`, pragurile; `treaptaPalete`: secțiunile din afara butucului, straturile tăiate
# la mijloc, marginile, treapta pe ambele margini; `ariaFeliei`: felia la 0,1, orientarea segmentelor, normala;
# `tiparPalete`: regula verdictului, partea din disc, marginea; ce dau cele trei constructoare) și atelierul (paragraful
# tipăririi: subiectul fiecărei piese, cele patru feluri, cifrele, marginea; ascunderea la carcasă; descrierile).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


LG = 'extensii/trenulet/sursa/lego/lego.ts'
AT = 'extensii/trenulet/sursa/planificator/atelier.ts'

# --- motorul: pragurile
TP = 'const TIPAR = { strat: 0.2, bine: 0.5, aspru: 1, brim: 0.1 };'
o('T01', LG, TP, TP.replace('strat: 0.2', 'strat: 0.25'), 'tipar', 'straturile de 0,25')
o('T02', LG, TP, TP.replace('bine: 0.5', 'bine: 0.6'), 'tipar', 'pragul „fără suport” la 0,6')
o('T03', LG, TP, TP.replace('aspru: 1,', 'aspru: 1.2,'), 'tipar', 'pragul suportului la 1,2')
o('T04', LG, TP, TP.replace('brim: 0.1', 'brim: 0.05'), 'tipar', 'marginea sub 5 % din disc')
# --- treapta, pe secțiuni
o('S01', LG, '      if (st.r <= rh) continue;\n      const sec = st.sec, n = sec.length', '      if (st.r < 0) continue;\n      const sec = st.sec, n = sec.length', 'tipar', 'și secțiunile din butuc')
o('S02', LG, '        const h = TIPAR.strat / 2 + TIPAR.strat * k, xs: number[] = [];', '        const h = TIPAR.strat * (k + 1), xs: number[] = [];', 'tipar', 'straturile tăiate la margine, nu la mijloc')
o('S03', LG, '          if ((a[1] - h) * (b[1] - h) < 0) xs.push(a[0] + (h - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));\n        }\n        if (xs.length < 2) { inainte = null; continue; }',
  '          if ((a[1] - h) * (b[1] - h) < 0) xs.push(a[0]);\n        }\n        if (xs.length < 2) { inainte = null; continue; }', 'tipar', 'marginea, vârful muchiei tăiate, nu locul tăieturii')
o('S04', LG, '        if (inainte) max = Math.max(max, hi - inainte.hi, inainte.lo - lo);', '        if (inainte) max = Math.max(max, hi - inainte.hi);', 'tipar', 'treapta doar pe o margine (sensul „stânga” iese pe cealaltă)')
o('S05', LG, '        if (inainte) max = Math.max(max, hi - inainte.hi, inainte.lo - lo);', '        if (inainte) max = Math.max(max, hi - inainte.hi, lo - inainte.lo);', 'tipar', 'pe marginea de jos, treapta în sensul greșit')
o('S06', LG, '        inainte = { lo, hi };\n      }\n    }\n    return max;', '        inainte = inainte ?? { lo, hi };\n      }\n    }\n    return max;', 'tipar', 'fiecare strat, față de primul, nu de cel de dedesubt')
o('S07', LG, '      for (let k = 0; TIPAR.strat / 2 + TIPAR.strat * k < hmax; k++) {', '      for (let k = 0; TIPAR.strat / 2 + TIPAR.strat * k < hmax / 2; k++) {', 'tipar', 'doar jumătatea de jos a secțiunii')
# --- primul strat, din plasă
o('F01', LG, '      if ((q[0] - p[0]) * -ny + (q[1] - p[1]) * nx < 0) [p, q] = [q, p];', '      if ((q[0] - p[0]) * -ny + (q[1] - p[1]) * nx > 0) [p, q] = [q, p];', 'tipar', 'segmentele orientate pe dos (aria cu minus)')
o('F02', LG, '      if ((q[0] - p[0]) * -ny + (q[1] - p[1]) * nx < 0) [p, q] = [q, p];', '', 'tipar', 'segmentele neorientate')
o('F03', LG, '      a += 0.5 * (p[0] * q[1] - p[1] * q[0]);\n    }\n    return a;', '      a += p[0] * q[1] - p[1] * q[0];\n    }\n    return a;', 'tipar', 'aria dublă')
o('F04', LG, '    const aria = ariaFeliei(tri, TIPAR.strat / 2), parte', '    const aria = ariaFeliei(tri, TIPAR.strat), parte', 'tipar', 'felia la 0,2, nu la 0,1')
o('F05', LG, 'parte = aria / (Math.PI * R * R), treapta', 'parte = aria / (Math.PI * 4 * R * R), treapta', 'tipar', 'discul cu diametrul în loc de rază')
# --- verdictul
FL = '    const fel = ridicata || (consola > TIPAR.aspru && treapta > TIPAR.aspru) ? "suport" : treapta > TIPAR.bine ? "aspru" : "bine";'
o('V01', LG, FL, FL.replace('(consola > TIPAR.aspru && treapta > TIPAR.aspru)', '(consola > TIPAR.aspru || treapta > TIPAR.aspru)'), 'tipar', 'suport când doar una trece de 1 mm (elicea implicită)')
o('V02', LG, FL, FL.replace('(consola > TIPAR.aspru && treapta > TIPAR.aspru)', 'consola > TIPAR.aspru'), 'tipar', 'suport doar după consola de la vârf (vârful jos, de un strat)')
o('V03', LG, FL, FL.replace('treapta > TIPAR.bine ?', 'consola > TIPAR.bine ?'), 'tipar', '„aspru” după consola de la vârf, nu după treaptă')
o('V04', LG, FL, FL.replace('ridicata || (', '('), 'tipar', 'înclinată spre pupa, fără suport')
o('V05', LG, FL, FL.replace('"aspru" : "bine"', '"bine" : "aspru"'), 'tipar', '„aspru” și „fără suport”, pe dos')
o('V06', LG, '    return { consola, treapta, fel, ridicata, aria, parte, brim: parte < TIPAR.brim };', '    return { consola, treapta, fel, ridicata, aria, parte, brim: parte > TIPAR.brim };', 'tipar', 'marginea, pe dos')
# --- ce dau constructoarele
o('C01', LG, 'prinderi: butuc.prinderi, tipar: tiparPalete(statii, rh, tri, q.consola, R) };', 'prinderi: butuc.prinderi, tipar: tiparPalete(statii, rh, tri, q.consola, q.D) };', 'tipar', 'elicea: discul cu diametrul ca rază')
o('C02', LG, 'prinderi: butuc.prinderi, tipar: tiparPalete(statii, rh, tri, q.consola, R) };', 'prinderi: butuc.prinderi, tipar: tiparPalete(statii, 0, tri, q.consola, R) };', 'tipar', 'elicea: și secțiunea din butuc')
o('C03', LG, 'tipar: tiparPalete(q.statii, rh, tri, q.consola, q.R, q.pupa > 0) };', 'tipar: tiparPalete(q.statii, rh, tri, q.consola, q.R, false) };', 'tipar', 'elicea de barcă înclinată spre pupa, fără suport')
o('C04', LG, 'tipar: tiparPalete(q.statii, rh, tri, q.consola, q.R, q.pupa > 0) };', 'tipar: tiparPalete(q.statii, rh, tri, q.bVarf, q.R, q.pupa > 0) };', 'tipar', 'elicea de barcă: unghiul în locul consolei')
o('C05', LG, 'tipar: tiparPalete(q.statii, q.rh, tri, q.consola, q.Rt) };', 'tipar: tiparPalete(q.statii, q.rh, tri, q.consola, q.Ri) };', 'tipar', 'rotorul: discul carcasei, nu al paletelor')
o('C06', LG, 'tipar: tiparPalete(q.statii, q.rh, tri, q.consola, q.Rt) };', 'tipar: tiparPalete(q.statii, q.rh, tri.slice(0, 100), q.consola, q.Rt) };', 'tipar', 'rotorul: primul strat, dintr-o bucată a plasei')
# --- atelierul: paragraful tipăririi
CI = 'const cine = def.tip === "eliceBarca" ? tr("Se tipărește cu partea dinspre barcă pe masă,") : def.tip === "ventilator" ? tr("Rotorul se tipărește") : tr("Se tipărește");'
o('A01', AT, CI, CI.replace('def.tip === "eliceBarca" ?', 'def.tip === "barca" ?'), 'e2e', 'elicea de barcă, fără „cu partea dinspre barcă pe masă”')
o('A02', AT, CI, CI.replace('def.tip === "ventilator" ?', 'def.tip === "rotor" ?'), 'e2e', 'rotorul, fără subiect')
o('A03', AT, '    const tr2 = fmt(t.treapta, 2);', '    const tr2 = fmt(t.treapta, 1);', 'e2e', 'treapta la zecime')
o('A04', AT, '    const tr2 = fmt(t.treapta, 2);', '    const tr2 = fmt(t.consola, 2);', 'e2e', 'textul spune consola de la vârf, nu treapta')
o('A05', AT, '    const s = t.ridicata ? tr`${cine} cu suport sub palete', '    const s = false ? tr`${cine} cu suport sub palete', 'e2e', 'înclinată spre pupa: textul suportului sub vârfuri')
o('A06', AT, '      : t.fel === "suport" ? tr`${cine} cu suport sub vârfurile paletelor', '      : t.fel === "nimic" ? tr`${cine} cu suport sub vârfurile paletelor', 'e2e', '„cere suport” nu se spune')
o('A07', AT, '      : t.fel === "aspru" ? tr`${cine} fără suport, dar dedesubtul paletelor iese aspru', '      : t.fel !== "aspru" ? tr`${cine} fără suport, dar dedesubtul paletelor iese aspru', 'e2e', '„aspru” și „fără suport”, pe dos')
o('A08', AT, '    return t.brim ? s + " " + tr`Primul strat atinge masa doar pe ${fmt(100 * t.parte, 1)} %', '    return true ? s + " " + tr`Primul strat atinge masa doar pe ${fmt(100 * t.parte, 1)} %', 'e2e', 'marginea, cerută mereu')
o('A09', AT, '    return t.brim ? s + " " + tr`Primul strat atinge masa doar pe ${fmt(100 * t.parte, 1)} %', '    return t.brim ? s + " " + tr`Primul strat atinge masa doar pe ${fmt(t.parte, 1)} %', 'e2e', 'partea din disc, nu în procente')
o('A10', AT, '      if ($("#at-tipar")) { $("#at-tipar").hidden = !tp;', '      if ($("#at-tipar")) { $("#at-tipar").hidden = false;', 'e2e', 'paragraful, la vedere și la carcasă (gol)')
o('A11', AT, '$("#at-tipar").textContent = tp ? textTipar(def, tp) : ""; }', '$("#at-tipar").textContent = ""; }', 'e2e', 'paragraful rămâne gol')
o('A12', AT, 'deschise: r.deschise, prinderi: r.prinderi, tipar: r.tipar }];', 'deschise: r.deschise, prinderi: r.prinderi }];', 'e2e', 'piesa din editor fără verdict')
# descrierile
o('D01', AT, 'Se tipărește cu partea dinspre barcă pe masă; axul intră de jos,', 'Se tipărește cu partea dinspre barcă pe masă, fără suport (cu paletele înclinate spre pupa, cu suport sub ele); axul intră de jos,', 'e2e', 'descrierea bărcii, din nou cu fraza care se contrazice')
o('D02', AT, 'cu gaura din calibrare. Se tipărește cu butucul și muchia de jos a fiecărei palete pe masă.</p>', 'cu gaura din calibrare. Se tipărește fără suport: butucul și muchia de jos a fiecărei palete stau pe masă.</p>', 'e2e', 'descrierea elicei, din nou „fără suport” oricum')
o('D03', AT, 'Rotorul se tipărește cu muchia de jos a paletelor pe masă, carcasa în picioare, fără suport.</p>', 'Amândouă se tipăresc fără suport: rotorul cu muchia de jos a paletelor pe masă, carcasa în picioare.</p>', 'e2e', 'descrierea ventilatorului, din nou „amândouă fără suport”')

SETURI = {
    'tipar': ['test/unit/trenulet.tipar.test.ts'],
    'tipar2': ['test/unit/trenulet.tipar.test.ts', 'test/unit/trenulet.elice.test.ts', 'test/unit/trenulet.barca.test.ts', 'test/unit/trenulet.ventilator.test.ts', 'test/unit/trenulet.pupa.test.ts'],
}
E2E = ['test/e2e/trenulet.elice.spec.ts', 'test/e2e/trenulet.barca.spec.ts', 'test/e2e/trenulet.ventilator.spec.ts', 'test/e2e/trenulet.pupa.spec.ts']
# pagina se face din surse în spec: build-ul aplicației nu o schimbă (docs/otravuri.md)
E2E_BUILD = False
for x in O:
    assert x['vechi'] != x['nou'], x['id']
