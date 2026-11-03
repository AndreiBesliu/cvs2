// Motorul CNC al planificatorului: geometria exacta a pieselor, asezarea pe placi si fisierele DXF.
//
// - Geometria e portul din trenulet_generator.py (aceleasi masuri si aceleasi reguli), dar cu arce adevarate:
//   operatiile booleene si offseturile le face cavalier_contours, portul TypeScript adus in cvs2
//   (src/geom/cavalier, = cavalier-contours-js 0.1.1; MIT OR Apache-2.0, (c) autorii cavalier_contours).
// - Scriitorul DXF e cel din cvs2 (src/io/dxfExport.ts, ADR 0088: R2007, LWPOLYLINE cu bulge), cu straturile de aici.
// - Asezarea pe placi e cea din generator: fibra pe lungimea placii (rotiri de 0 / 180 de grade), cel mai de jos-stanga
//   loc liber pe o grila de 2 mm, cu spatiul dintre piese pastrat.
(function (glob) {
  "use strict";
  const CV = glob.Cavalier;
  const rad = d => d * Math.PI / 180;

  const IMPLICIT = {
    grosime: 12, freza: 6, freza_rezerva: 0.1,
    latime: 40, sant_latime: 6, sant_adancime: 3, sant_axa: 13,
    tata_cap_d: 11.6, tata_gat: 6, tata_centru: 11.5,
    mama_gaura_d: 13, mama_gura: 7.4, mama_centru: 12,
    varianta_tata: 3, varianta_mama: 3, pas_calibrare: 0.1,
    evazare: 0.8, evazare_lungime: 8,
    raza_curba_mare: 202, raza_curba_mica: 110, unghi_curba: 45,
    opritor_lungime: 72, opritor_sant_oprit: 18, opritor_bloc: [40, 18],
    distanta_cale_dubla: 46, macaz_curb_dreapta: 108, sosea_latime: 70, sosea_lungime: 160,
    stalp_latura: 64, rampa_lungime: 216, rampa_straturi: 5, rampa_plat: 24,
    placa: [1000, 600], placa_margine: 15, distanta_piese: 14, pas_asezare: 2,
    doua_fete: false, stift_d: 6, stift_margine: 7.5,
    // tesirea muchiilor de sus: null, { tip: "v", unghi, latime } sau { tip: "rotunjire", raza, varf }; santuri: si marginile santurilor
    tesire: null,
    // limba mobila a macazurilor: jocul fata de pereti, raza butucului din jurul pivotului, grosimea varfului, gaura
    // pivotului (sub fundul santului) si jocul stiftului printat in ea
    limbi: false, limba_joc: 0.2, limba_raza: 4.5, limba_varf: 1, pivot_adancime: 2.5, pivot_joc: 0.2,
    // piese printate 3D: stalpii (in loc de straturi de placa), blocul opritorului cu tampoane, tuneluri, peroane
    stalpi_printati: false, opritor_printat: false, tunel: 0, peron: 0, inaltime_tren: null,
    // piese de cale care se printeaza in loc sa se taie (numele lor din catalog sau de la comanda)
    cale_printata: [], print_tata: 3, print_mama: 3, proba_cuplaje: false,
  };
  let P = { ...IMPLICIT };
  const rFreza = () => P.freza / 2 + P.freza_rezerva;
  const ajTata = () => (P.varianta_tata - 3) * P.pas_calibrare;
  const ajMama = () => (P.varianta_mama - 3) * P.pas_calibrare;

  // ---------------------------------------------------------------------------------------------- polilinii
  // O polilinie e o lista de varfuri [x, y, bulge]; bulge-ul e al segmentului care pleaca din varf (tan(unghi / 4)).
  const muta = (v, dx, dy) => v.map(([x, y, b]) => [x + dx, y + dy, b]);
  function roteste(v, u, ox = 0, oy = 0) {
    const c = Math.cos(u), s = Math.sin(u);
    return v.map(([x, y, b]) => [ox + (x - ox) * c - (y - oy) * s, oy + (x - ox) * s + (y - oy) * c, b]);
  }
  function invers(v, inchis) {
    const n = v.length, out = [];
    for (let i = n - 1; i >= 0; i--) {
      const prev = i > 0 ? v[i - 1] : (inchis ? v[n - 1] : null);
      out.push([v[i][0], v[i][1], prev ? -prev[2] : 0]);
    }
    return out;
  }
  const pune = (lista, x, y, u) => lista.map(v => muta(roteste(v, u), x, y));
  const cerc = (cx, cy, r) => [[cx - r, cy, 1], [cx + r, cy, 1]];
  const drept = (x0, y0, x1, y1) => [[x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0]];
  function dreptRotunjit(x0, y0, x1, y1, r) {
    const t = Math.tan(Math.PI / 8);
    return [[x0 + r, y0, 0], [x1 - r, y0, t], [x1, y0 + r, 0], [x1, y1 - r, t], [x1 - r, y1, 0], [x0 + r, y1, t], [x0, y1 - r, 0], [x0, y0 + r, t]];
  }
  function arcInfo(p0, p1, b) {
    const th = 4 * Math.atan(b), dx = p1[0] - p0[0], dy = p1[1] - p0[1], c = Math.hypot(dx, dy);
    if (Math.abs(b) < 1e-12 || c < 1e-12) return null;
    const r = c / (2 * Math.abs(Math.sin(th / 2)));
    const h = (c / 2) / Math.tan(th / 2);
    const cx = (p0[0] + p1[0]) / 2 - h * dy / c, cy = (p0[1] + p1[1]) / 2 + h * dx / c;
    return { th, r, cx, cy, a0: Math.atan2(p0[1] - cy, p0[0] - cx), L: r * Math.abs(th) };
  }
  function segmente(v, inchis) {
    const n = v.length, out = [];
    for (let i = 0; i < (inchis ? n : n - 1); i++) out.push([v[i], v[(i + 1) % n], v[i][2]]);
    return out;
  }
  const lungSeg = (a, b, bulge) => { const A = arcInfo(a, b, bulge); return A ? A.L : Math.hypot(b[0] - a[0], b[1] - a[1]); };
  const lungime = v => segmente(v, false).reduce((t, [a, b, g]) => t + lungSeg(a, b, g), 0);
  function punctPeSeg(a, b, g, f) {
    const A = arcInfo(a, b, g);
    if (!A) return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    const u = A.a0 + A.th * f;
    return [A.cx + A.r * Math.cos(u), A.cy + A.r * Math.sin(u)];
  }
  function punctLa(v, s) {
    let acum = 0;
    for (const [a, b, g] of segmente(v, false)) {
      const L = lungSeg(a, b, g);
      if (acum + L >= s - 1e-12) return punctPeSeg(a, b, g, L > 0 ? (s - acum) / L : 0);
      acum += L;
    }
    return v[v.length - 1].slice(0, 2);
  }
  function taieCapat(v, cat) {
    // scoate `cat` mm de la capatul unei polilinii deschise (opritorul)
    const tinta = lungime(v) - cat, out = [];
    let acum = 0;
    for (const [a, b, g] of segmente(v, false)) {
      const L = lungSeg(a, b, g);
      if (acum + L < tinta - 1e-9) { out.push(a.slice()); acum += L; continue; }
      const f = (tinta - acum) / L, A = arcInfo(a, b, g);
      out.push([a[0], a[1], A ? Math.tan(A.th * f / 4) : 0]);
      const p = punctPeSeg(a, b, g, f);
      out.push([p[0], p[1], 0]);
      return out;
    }
    return v;
  }
  function cutie(v, inchis = true) {
    const e = (inchis ? CV.plineClosed(v) : CV.plineOpen(v)).extents();
    return e ? [e.minX, e.minY, e.maxX, e.maxY] : [0, 0, 0, 0];
  }
  const laPl = (v, inchis = true) => (inchis ? CV.plineClosed(v) : CV.plineOpen(v));
  function dinPl(p) { const o = []; for (let i = 0; i < p.vertexCount; i++) { const q = p.at(i); o.push([q.x, q.y, q.bulge]); } return o; }
  const aria = v => laPl(v).area();
  const ccw = v => (aria(v) < 0 ? invers(v, true) : v);

  // ---------------------------------------------------------------------------------------------- regiuni
  // O regiune = lista de contururi exterioare (sens trigonometric); piesele de aici nu au gauri.
  function reuneste(lista) {
    const acc = [];
    for (let v of lista) {
      v = ccw(v);
      for (let i = 0; i < acc.length;) {
        const r = laPl(acc[i]).boolean(laPl(v), "or");
        if (r.resultInfo === "disjoint" || r.resultInfo === "invalidInput" || !r.posPlines.length) { i++; continue; }
        v = ccw(r.posPlines.map(x => dinPl(x.pline)).reduce((a, b) => (Math.abs(aria(b)) > Math.abs(aria(a)) ? b : a)));
        acc.splice(i, 1); i = 0;
      }
      acc.push(v);
    }
    return acc;
  }
  function scade(regiune, taieturi) {
    let acc = regiune.slice();
    for (let t of taieturi) {
      t = ccw(t);
      const nou = [];
      for (const v of acc) {
        const r = laPl(v).boolean(laPl(t), "not");
        if (r.resultInfo === "disjoint" || r.resultInfo === "invalidInput") { nou.push(v); continue; }
        for (const x of r.posPlines) nou.push(ccw(dinPl(x.pline)));
      }
      acc = nou;
    }
    return acc;
  }
  function intersecteaza(a, b) {
    const r = laPl(ccw(a)).boolean(laPl(ccw(b)), "and");
    return r.posPlines.map(x => ccw(dinPl(x.pline)));
  }
  const celMaiMare = lista => lista.reduce((a, b) => (Math.abs(aria(b)) > Math.abs(aria(a)) ? b : a));
  function decaleaza(v, d) {
    // d > 0: spre exterior (conturul e in sens trigonometric)
    const r = laPl(ccw(v)).parallelOffset(-d);
    return r.length ? ccw(celMaiMare(r.map(dinPl))) : null;
  }
  // umple colturile interioare in care freza (raza r) nu poate intra
  const inchidere = (v, r) => decaleaza(decaleaza(v, r), -r);

  // ---------------------------------------------------------------------------------------------- cuplaje
  function formaTata(a = ajTata()) {
    const w = P.tata_gat / 2 + a;
    return [drept(-1, -w, P.tata_centru, w), cerc(P.tata_centru, 0, P.tata_cap_d / 2 + a)];
  }
  function degajariTata(a = ajTata()) {
    const r = rFreza(), w = P.tata_gat / 2 + a, eps = 0.05;
    const gura = P.mama_gura + 2 * Math.min(0, ajMama());
    const delta = Math.max(0, (gura - 2 * w) / 2 - 0.3);
    const xc = Math.sqrt(Math.max(0, r * r - (r + eps - delta) ** 2));
    const jos = drept(-r - 2, -50, 0.5, 50);
    return [1, -1].flatMap(s => intersecteaza(cerc(xc, s * (w + r + eps), r + 0.1), jos));
  }
  function formaMama(a = ajMama()) {
    const g = P.mama_gura / 2 + a;
    return [drept(-P.mama_centru, -g, 1, g), cerc(-P.mama_centru, 0, P.mama_gaura_d / 2 + a)];
  }

  // ---------------------------------------------------------------------------------------------- caile
  // O cale: start (x, y, directia in grade), segmente {t: "L", l} / {t: "A", r, a (grade), s (+1 stanga, -1 dreapta)},
  // cuplaje la capete ("T" / "M" / null), santOprit (mm), santuri (false = doar corp), latime.
  const cale = (x, y, h, seg, capStart, capFinal, extra = {}) => ({ x, y, h, seg, capStart, capFinal, santOprit: 0, santuri: true, latime: null, ...extra });
  const Ls = l => ({ t: "L", l });
  const As = (r, a, s = 1) => ({ t: "A", r, a, s });
  function noduri(c) {
    let x = c.x, y = c.y, h = rad(c.h);
    const out = [{ x, y, h }];
    for (const s of c.seg) {
      if (s.t === "L") { x += s.l * Math.cos(h); y += s.l * Math.sin(h); }
      else {
        const cx = x - s.s * s.r * Math.sin(h), cy = y + s.s * s.r * Math.cos(h);
        h += s.s * rad(s.a);
        x = cx + s.s * s.r * Math.sin(h); y = cy - s.s * s.r * Math.cos(h);
      }
      out.push({ x, y, h });
    }
    return out;
  }
  function paralela(c, d) {
    // calea paralela cu axa, la distanta d (pozitiv = la stanga), ca polilinie deschisa
    const n = noduri(c), v = c.seg.map((s, i) => [n[i].x - d * Math.sin(n[i].h), n[i].y + d * Math.cos(n[i].h), s.t === "L" ? 0 : s.s * Math.tan(rad(s.a) / 4)]);
    const e = n[n.length - 1];
    v.push([e.x - d * Math.sin(e.h), e.y + d * Math.cos(e.h), 0]);
    return v;
  }
  const banda = (c, w) => [...paralela(c, -w), ...invers(paralela(c, w), false)];
  function liniiSant(c, d) {
    const dif = Math.max(0, P.sant_latime / 2 - P.freza / 2);
    const treceri = dif < 0.01 ? [d] : [d - dif, d + dif];
    const linieLa = t => (c.santOprit > 0 ? taieCapat(paralela(c, t), c.santOprit) : paralela(c, t));
    const linii = treceri.map(linieLa);
    if (P.evazare > 0) {
      const exterior = d > 0 ? 1 : -1, n = noduri(c);
      for (const [cap, ultim] of [[c.capStart, false], [c.capFinal, true]]) {
        if (!cap || (ultim && c.santOprit > 0)) continue;
        const h = (ultim ? n[n.length - 1] : n[0]).h, nx = -Math.sin(h), ny = Math.cos(h);
        for (const s of (cap === "T" ? [exterior] : [1, -1])) {
          const linie = linieLa(d + s * dif), L = lungime(linie), lf = Math.min(P.evazare_lungime, L / 3);
          const pInt = punctLa(linie, ultim ? L - lf : lf), pCap = ultim ? linie[linie.length - 1] : linie[0];
          linii.push([[pInt[0], pInt[1], 0], [pCap[0] + s * P.evazare * nx, pCap[1] + s * P.evazare * ny, 0]]);
        }
      }
    }
    return linii;
  }
  const marcaj = (x, y) => [[x - 0.25, y, 0], [x + 0.25, y, 0]];

  // ---------------------------------------------------------------------------------------------- limba macazului
  // Ca la Brio: in santul din partea in care santurile celor doua cai se despart repede, o lama printata 3D se roteste
  // pe un stift (tot printat, intr-o gaura din fundul santului). Intr-o pozitie isi lipeste varful de peretele exterior
  // al unui sant si duce flansa rotii in celalalt; in cealalta pozitie, invers. Un tren care vine din ramura inchisa o
  // impinge singur in partea cealalta (lama e o pana lunga, cu unghi mic). Nasul de lemn dintre santuri se scoate pana
  // la pivot: locasul in care se misca butucul lamei.
  function proiectie(v, pt) {
    // cel mai apropiat punct al poliliniei deschise v: { s (de-a lungul ei), dist, d (cu semn: + in stanga mersului), p, t }
    let best = null, acum = 0;
    for (const [a, b, g] of segmente(v, false)) {
      const A = arcInfo(a, b, g);
      let f, q, t, L;
      if (!A) {
        const dx = b[0] - a[0], dy = b[1] - a[1];
        L = Math.hypot(dx, dy);
        if (L < 1e-12) continue;
        f = Math.max(0, Math.min(1, ((pt[0] - a[0]) * dx + (pt[1] - a[1]) * dy) / (L * L)));
        q = [a[0] + dx * f, a[1] + dy * f]; t = [dx / L, dy / L];
      } else {
        L = A.L;
        const sg = Math.sign(A.th), T = Math.abs(A.th);
        let u = sg * (Math.atan2(pt[1] - A.cy, pt[0] - A.cx) - A.a0);
        u = ((u % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        if (u > T) u = u - T < 2 * Math.PI - u ? T : 0;
        f = u / T;
        q = punctPeSeg(a, b, g, f);
        const ung = A.a0 + A.th * f;
        t = [-Math.sin(ung) * sg, Math.cos(ung) * sg];
      }
      const dx = pt[0] - q[0], dy = pt[1] - q[1], dist = Math.hypot(dx, dy);
      if (!best || dist < best.dist) best = { s: acum + f * L, dist, d: (t[0] * dy - t[1] * dx >= 0 ? 1 : -1) * dist, p: q, t };
      acum += L;
    }
    return best;
  }
  // regiunea dintre doua paralele la cale (d0 < d1) si calea prelungita inapoi cu e mm (capetele benzilor sa nu cada unul peste altul)
  const fasie = (c, d0, d1) => ccw([...paralela(c, d0), ...invers(paralela(c, d1), false)]);
  const prelungita = (c, e) => ({ ...c, x: c.x - e * Math.cos(rad(c.h)), y: c.y - e * Math.sin(rad(c.h)), seg: [Ls(e), ...c.seg] });
  const rotPunct = (q, u, o) => roteste([[q[0], q[1], 0]], u, o[0], o[1])[0];
  function inter1(a, b) { const r = intersecteaza(a, b); return r.length ? celMaiMare(r) : null; }
  function limbaMacaz(p) {
    // -> { contur (pozitia 0: spre calea b), poz1, pivot, unghi, treceri (traseul frezei prin locas), gaura } sau null
    if (p.oglinda) {
      // varianta "dreapta": limba celei "stanga", oglindita (sa iasa exact simetrice)
      const m = c => ({ ...c, y: -c.y, h: -c.h, seg: c.seg.map(x => (x.t === "A" ? { ...x, s: -x.s } : x)) });
      const r = limbaMacaz({ ...p, oglinda: false, cai: p.cai.map(m) });
      if (!r) return null;
      const og = v => v.map(([x, y, b]) => [x, -y, -b]);
      return { ...r, contur: ccw(og(r.contur)), poz1: ccw(og(r.poz1)), pivot: [r.pivot[0], -r.pivot[1]], unghi: -r.unghi,
               treceri: r.treceri.map(og), gaura: ccw(og(r.gaura)), latura: -r.latura };
    }
    const W = Math.max(P.sant_latime, P.freza), D = P.freza, rh = P.limba_raza, joc = P.limba_joc;
    const [c1, c2] = p.cai;
    let ales = null;
    for (const d of [P.sant_axa, -P.sant_axa]) {
      for (const [ca, cb] of [[c1, c2], [c2, c1]]) {
        const A = paralela(ca, d), B = paralela(cb, d), L = Math.min(lungime(A), lungime(B));
        const sep = s => proiectie(B, punctLa(A, s)).dist;
        const unde = val => {
          for (let s = 1; s <= L; s += 1) {
            if (sep(s) < val) continue;
            let a = s - 1, b = s;
            for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (sep(m) >= val) b = m; else a = m; }
            return (a + b) / 2;
          }
          return null;
        };
        const sQ = unde(W + 2 * rh);
        if (sQ === null) continue;
        // calea b trebuie sa fie in stanga lui a
        if (proiectie(A, proiectie(B, punctLa(A, sQ)).p).d <= 0) continue;
        if (!ales || sQ < ales.sQ - 1e-6) ales = { d, ca, cb, A, B, sQ, unde };
      }
    }
    if (!ales) return null;
    const { d, ca, cb, A, B, sQ, unde } = ales;
    const sN = unde(W), sT = unde(P.limba_varf);
    if (sN === null || sT === null) return null;
    // pivotul: la mijlocul nasului, unde nasul e lat cat butucul
    const qa = punctLa(A, sQ), qb = proiectie(B, qa).p;
    const Q = [(qa[0] + qb[0]) / 2, (qa[1] + qb[1]) / 2];
    const tq = proiectie(A, Q).t, nq = [-tq[1], tq[0]];
    // unghiul: coltul de jos al varfului (pe peretele exterior al santului a) ajunge pe peretele lui interior
    const at = punctLa(A, sT), ta = proiectie(A, at).t;
    const X0 = [at[0] + ta[1] * W / 2, at[1] - ta[0] * W / 2];
    const f = u => proiectie(A, rotPunct(X0, -u, Q)).d - W / 2;
    let lo = 0, hi = 0.8;
    if (f(hi) < 0) return null;
    for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (f(m) < 0) lo = m; else hi = m; }
    const phi = (lo + hi) / 2;
    // locasul: treceri intre santuri (la 1/n, 2/n... din drum), de la nas pana aproape de pivot, si un cerc in jurul
    // pivotului; trecerile au varfuri la 2 mm, pe curbele dintre axele santurilor
    const n = Math.max(2, Math.ceil((W + 2 * rh) / (D - 0.6))), treceri = [], benzi = [];
    const sFinal = sQ - 1.5, r = D / 2;
    for (let k = 1; k < n; k++) {
      const lam = k / n, v = [];
      const pune1 = s => { const a = punctLa(A, s), b = proiectie(B, a).p; v.push([a[0] + lam * (b[0] - a[0]), a[1] + lam * (b[1] - a[1]), 0]); };
      for (let s = sN - 1; s < sFinal - 1; s += 2) pune1(s);
      pune1(sFinal);
      treceri.push(v);
      // ce scoate freza pe trecerea asta: fasia de latimea ei, cu capete rotunde (normalele mediate in varfuri)
      const nor = v.map((q, i) => {
        const a = v[Math.max(0, i - 1)], b = v[Math.min(v.length - 1, i + 1)], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        return [-(b[1] - a[1]) / L, (b[0] - a[0]) / L];
      });
      const dr = v.map((q, i) => [q[0] - r * nor[i][0], q[1] - r * nor[i][1], 0]), st = v.map((q, i) => [q[0] + r * nor[i][0], q[1] + r * nor[i][1], 0]);
      dr[dr.length - 1][2] = 1; st[0][2] = 1;
      benzi.push([...dr, ...st.reverse()]);
    }
    const rho = rh + joc - r;
    if (rho > 0.05) treceri.push([[Q[0] + rho, Q[1], 1], [Q[0] - rho, Q[1], 1], [Q[0] + rho, Q[1], 0]]);
    // ce scoate freza in jurul lamei: canalul dintre peretii exteriori fara nasul de lemn, plus locasul; lama sta la
    // `joc` de toti peretii. Totul doar pana putin dupa pivot (mai departe, benzile de 40 mm nu mai acopera nasul).
    const caE = prelungita(ca, 12), cbE = prelungita(cb, 7);
    const dreptunghi = inainte => {
      const s0 = [Q[0] - 60 * nq[0] + inainte * tq[0], Q[1] - 60 * nq[1] + inainte * tq[1]], s1 = [s0[0] + 120 * nq[0], s0[1] + 120 * nq[1]];
      return ccw([[s0[0], s0[1], 0], [s1[0], s1[1], 0], [s1[0] - 280 * tq[0], s1[1] - 280 * tq[1], 0], [s0[0] - 280 * tq[0], s0[1] - 280 * tq[1], 0]]);
    };
    const taiere = dreptunghi(0), fereastra = dreptunghi(12);
    const canal = inter1(fasie(cbE, d + W / 2 - 40, d + W / 2), fasie(caE, d - W / 2, d - W / 2 + 40));
    const canalF = canal && inter1(canal, fereastra);
    const nas = inter1(fasie(caE, d + W / 2, d + W / 2 + 40), fasie(cbE, d - W / 2 - 40, d - W / 2));
    const nasF = nas && inter1(nas, fereastra);
    if (!canalF) return null;
    const santuriY = nasF ? celMaiMare(scade([canalF], [nasF])) : canalF;
    // (cercul locasului e cu cate 0,01 mm mai mic la fiecare pozitie verificata: arcele concentrice egale strica operatiile
    // booleene; butucul lamei e cu 0,095 mm sub cel mai mic dintre ele)
    const rLocas = rho > 0.05 ? rh + joc : r;
    const permis = k => decaleaza(celMaiMare(reuneste([santuriY, ...benzi, cerc(Q[0], Q[1], rLocas - 0.01 * k)])), -joc);
    // lama in pozitia 0: deasupra ei, peretele interior al santului b; dedesubt, peretele interior al lui a, rotit cu
    // unghiul; butucul cu 0,05 mm mai mic decat locul lui (cercuri concentrice egale strica operatiile booleene)
    const intre = inter1(fasie(cbE, d - W / 2 - 40, d - W / 2), roteste(fasie(caE, d + W / 2, d + W / 2 + 40), phi, Q[0], Q[1]));
    const corp = intre && inter1(intre, taiere);
    if (!corp) return null;
    let T = celMaiMare(reuneste([corp, cerc(Q[0], Q[1], rLocas - joc - 0.095)]));
    // incape in ambele pozitii si in toate cele dintre ele
    for (const [k, l] of [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1].entries()) {
      const pk = permis(k);
      T = pk && inter1(T, roteste(pk, phi * l, Q[0], Q[1]));
      if (!T) return null;
    }
    // fara fasii mai subtiri de 0,6 mm (nu se pot printa)
    T = decaleaza(T, -0.3); T = T && decaleaza(T, 0.3);
    if (!T) return null;
    return { contur: T, poz1: roteste(T, -phi, Q[0], Q[1]), pivot: Q, unghi: phi, treceri, gaura: cerc(Q[0], Q[1], D / 2),
             sT, sN, sQ, latura: d, lungime: lungime(A) };
  }

  // ---------------------------------------------------------------------------------------------- piesele
  // Piesa = { nume, titlu, cai, rot (grade, ca fibra sa fie pe lungime), forma (regiune gata), formeExtra, santuriExtra,
  // marcaje }. geometrie() o aduce la (0, 0): { contur: [[x, y, b]...], santuri: [...], marcaje: [...], aria }.
  function geometrie(p) {
    if (p._geo) return p._geo;
    const benzi = [], tate = [], scoase = [];
    const santuri = (p.santuriExtra || []).slice();
    for (const c of p.cai || []) {
      const n = noduri(c), s0 = n[0], s1 = n[n.length - 1];
      benzi.push(banda(c, (c.latime || P.latime) / 2));
      if (c.santuri) for (const d of [P.sant_axa, -P.sant_axa]) santuri.push(...liniiSant(c, d));
      for (const [cap, x, y, u] of [[c.capStart, s0.x, s0.y, s0.h + Math.PI], [c.capFinal, s1.x, s1.y, s1.h]]) {
        if (cap === "T") { tate.push(...pune(formaTata(), x, y, u)); scoase.push(...pune(degajariTata(), x, y, u)); }
        else if (cap === "M") scoase.push(...pune(formaMama(), x, y, u));
      }
    }
    let reg = p.forma ? p.forma : reuneste([...benzi, ...tate, ...(p.formeExtra || [])]);
    if (!p.forma && scoase.length) reg = scade(reg, scoase);
    let contur = inchidere(celMaiMare(reg), rFreza());
    let linii = santuri, marc = (p.marcaje || []).slice();
    // tesirea: traseul centrului frezei de tesit (cu V-ul, varful pe muchie; cu freza de rotunjit, la raza varfului in afara)
    const T = P.tesire;
    let tes = [], margini = [];
    if (T && T.tip === "v") tes = [contur];
    else if (T && T.tip === "rotunjire") { const o = decaleaza(contur, T.varf / 2); if (o) tes = [o]; }
    if (T && T.tip === "v" && T.santuri) {
      const w = Math.max(P.sant_latime, P.freza) / 2;
      for (const c of p.cai || []) {
        if (!c.santuri) continue;
        for (const d of [P.sant_axa, -P.sant_axa]) for (const e of [w, -w]) margini.push(c.santOprit > 0 ? taieCapat(paralela(c, d + e), c.santOprit) : paralela(c, d + e));
      }
    }
    // limba macazului: traseul frezei prin locas si gaura pivotului (cercul ei); lama, pentru STL
    let treceri = [], pivoti = [], limba = null;
    if (P.limbi && p.limba) {
      limba = limbaMacaz(p);
      if (limba) { treceri = limba.treceri; pivoti = [limba.gaura]; limba = { contur: limba.contur, poz1: limba.poz1, pivot: [[...limba.pivot, 0]], unghi: limba.unghi }; }
    }
    if (p.rot) {
      const u = rad(p.rot), r = l => roteste(l, u);
      contur = r(contur); linii = linii.map(r); marc = marc.map(r); tes = tes.map(r); margini = margini.map(r);
      treceri = treceri.map(r); pivoti = pivoti.map(r);
      if (limba) limba = { ...limba, contur: r(limba.contur), poz1: r(limba.poz1), pivot: r(limba.pivot) };
    }
    const [x0, y0, x1, y1] = cutie(contur);
    const t = l => muta(l, -x0, -y0);
    if (limba) limba = { ...limba, contur: t(limba.contur), poz1: t(limba.poz1), pivot: t(limba.pivot)[0].slice(0, 2) };
    p._geo = { contur: t(contur), santuri: linii.map(t), marcaje: marc.map(t), tesire: tes.map(t), margini: margini.map(t),
               treceriLocas: treceri.map(t), pivoti: pivoti.map(t), limba,
               aria: Math.abs(aria(contur)), w: x1 - x0, h: y1 - y0, ox: x0, oy: y0 };
    return p._geo;
  }

  function piesa(nume, cai, extra = {}) { return { nume, titlu: extra.titlu || nume, cai, rot: 0, ...extra }; }

  function netezire(t) { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); }
  function xRampa(s) {
    let a = 0, b = 1;
    for (let i = 0; i < 60; i++) { const m = (a + b) / 2; if (netezire(m) > s) b = m; else a = m; }
    return P.rampa_plat + b * (P.rampa_lungime - 2 * P.rampa_plat);
  }

  function catalog(laComanda) {
    // toate piesele care se taie, dupa nume; kiturile (stalpi, rampe) sunt liste de componente
    const Rm = P.raza_curba_mare, Rs = P.raza_curba_mica, u = P.unghi_curba, o = {}, kit = {};
    const adauga = p => { o[p.nume] = p; };
    for (const l of [216, 144, 108, 54]) adauga(piesa("dreapta_" + l, [cale(0, 0, 0, [Ls(l)], "M", "T")]));
    for (const [nm, R] of [["curba_mare", Rm], ["curba_mica", Rs]]) {
      for (const [s, parte] of [[1, "stanga"], [-1, "dreapta"]]) adauga(piesa(nm + "_" + parte, [cale(0, 0, 0, [As(R, u, s)], "M", "T")], { rot: -s * u / 2 }));
    }
    for (const [s, parte] of [[1, "stanga"], [-1, "dreapta"]]) {
      adauga(piesa("macaz_" + parte, [cale(0, 0, 0, [Ls(144)], "T", "M"), cale(0, 0, 0, [As(Rm, u, s)], null, "M")], { limba: true, oglinda: s < 0 }));
    }
    adauga(piesa("ramificatie_y", [cale(0, 0, 0, [As(Rs, u, 1)], "T", "M"), cale(0, 0, 0, [As(Rs, u, -1)], null, "M")], { limba: true }));
    adauga(piesa("incrucisare_90", [cale(-54, 0, 0, [Ls(108)], "M", "T"), cale(0, -54, 90, [Ls(108)], "M", "T")]));
    const d45 = 72 * Math.cos(rad(45));
    adauga(piesa("incrucisare_45", [cale(-72, 0, 0, [Ls(144)], "M", "T"), cale(-d45, -d45, 45, [Ls(144)], "M", "T")]));
    adauga(piesa("adaptor_tata_tata", [cale(0, 0, 0, [Ls(54)], "T", "T")]));
    adauga(piesa("adaptor_mama_mama", [cale(0, 0, 0, [Ls(54)], "M", "M")]));
    adauga(piesa("opritor", [cale(0, 0, 0, [Ls(P.opritor_lungime)], "M", null, { santOprit: P.opritor_sant_oprit })]));
    const [bw, bd] = P.opritor_bloc;
    adauga(piesa("opritor_bloc", [], { forma: [dreptRotunjit(0, 0, bd, bw, 3)] }));
    const dd = P.distanta_cale_dubla;
    adauga(piesa("dreapta_dubla_216", [cale(0, 0, 0, [Ls(216)], "M", "T"), cale(0, dd, 0, [Ls(216)], "M", "T"),
      cale(0, dd / 2, 0, [Ls(216)], null, null, { santuri: false, latime: P.latime + dd })]));
    for (const [s, parte] of [[1, "stanga"], [-1, "dreapta"]]) {
      adauga(piesa("curba_dubla_" + parte, [cale(0, 0, 0, [As(Rm, u, s)], "M", "T"), cale(0, -s * dd, 0, [As(Rm + dd, u, s)], "M", "T"),
        cale(0, -s * dd / 2, 0, [As(Rm + dd / 2, u, s)], null, null, { santuri: false, latime: P.latime + dd })], { rot: -s * u / 2 }));
      adauga(piesa("macaz_curb_" + parte, [cale(0, 0, 0, [As(Rm, u, s)], "T", "M"), cale(0, 0, 0, [Ls(P.macaz_curb_dreapta), As(Rm, u, s)], null, "M")], { limba: true, oglinda: s < 0 }));
    }
    const sl = P.sosea_lungime, sw = P.sosea_latime;
    adauga(piesa("trecere_nivel", [cale(0, 0, 0, [Ls(108)], "M", "T")], { formeExtra: [dreptRotunjit(54 - sw / 2, -sl / 2, 54 + sw / 2, sl / 2, 4)] }));
    // stalpii: straturi patrate + doi obraji deasupra, intre care sta calea
    const lat = P.stalp_latura, lob = (lat - P.latime - 1) / 2;
    adauga(piesa("stalp_strat", [], { forma: [dreptRotunjit(0, 0, lat, lat, 3)] }));
    adauga(piesa("stalp_obraz", [], { forma: [dreptRotunjit(0, 0, lat, lob, 2)] }));
    for (let n = 1; n <= P.rampa_straturi; n++) kit["stalp_" + n] = [["stalp_strat", n], ["stalp_obraz", 2]];
    // rampele: straturi de placa lipite, fiecare incepe unde rampa ii trece de nivel
    const T = P.rampa_straturi, L_ = P.rampa_lungime;
    for (const [nume, jos, sus] of [["rampa_urcare", "M", "T"], ["rampa_coborare", "T", "M"]]) {
      kit[nume] = [];
      for (let j = 0; j <= T; j++) {
        const x0 = j === 0 ? 0 : Math.max(0, xRampa((j - 1) / T) - 1);
        const cj = j === 0 ? jos : null, cs = j === T ? sus : null;
        const ns = (cj || cs) ? nume + "_strat_" + (j + 1) : "rampa_strat_" + (j + 1);
        if (!o[ns]) {
          const marc = [];
          if (j < T) for (let k = 0; k <= j; k++) marc.push(marcaj(L_ - 40, (k - j / 2) * 7));
          adauga(piesa(ns, [cale(x0, 0, 0, [Ls(L_ - x0)], cj, cs, { santuri: false })], { marcaje: marc, titlu: "Rampa strat " + (j + 1) }));
        }
        kit[nume].push([ns, 1]);
      }
    }
    // piesele la comanda din planificator
    for (const it of laComanda || []) {
      const c = cale(0, 0, 0, it.segmente.map(s => (s.t === "L" ? Ls(s.l) : As(s.r, s.a, s.s))), it.capete[0], it.capete[1]);
      const n = noduri(c), e = n[n.length - 1];
      adauga(piesa(it.id, [c], { titlu: it.titlu, rot: Math.hypot(e.x, e.y) > 1e-6 ? -Math.atan2(e.y, e.x) * 180 / Math.PI : 0 }));
    }
    return { piese: o, kituri: kit };
  }

  function placaCalibrare() {
    const n = 5, pasX = 44, H = 70, lung = n * pasX + 10;
    const adaug = [drept(0, 0, lung, H)], scot = [], marc = [];
    for (let i = 0; i < n; i++) {
      const a = (i - 2) * P.pas_calibrare, x = 5 + pasX * (i + 0.5);
      scot.push(...pune(formaMama(a), x, 0, -Math.PI / 2));
      adaug.push(...pune(formaTata(a), x, H, Math.PI / 2));
      scot.push(...pune(degajariTata(a), x, H, Math.PI / 2));
      for (let k = 0; k <= i; k++) { const dx = (k - i / 2) * 8; for (const yy of [27, H - 27]) marc.push(marcaj(x + dx, yy)); }
    }
    const forma = scade(reuneste(adaug), scot);
    const c = cale(0, H / 2, 0, [Ls(lung)], "M", "M");
    return piesa("placa_calibrare", [], { forma, santuriExtra: liniiSant(c, 0), marcaje: marc, titlu: "Placa de calibrare" });
  }

  // ---------------------------------------------------------------------------------------------- rampa: relief 3D
  // Ca in generator: straturile lipite se finiseaza in ArtCAM dupa suprafata in S. Relieful = fiecare strat, ca
  // prisma, taiat de suprafata z_rampa(x) + 0,01 (palierele sa nu fie coplanare). Coltul planului ajunge in (0, 0),
  // ca STL-ul si DXF-ul cu santurile sa se suprapuna.
  function zRampa(x) {
    const T = P.grosime, n = P.rampa_straturi, L_ = P.rampa_lungime, f = P.rampa_plat;
    return T + n * T * netezire((Math.min(Math.max(x, 0), L_) - f) / (L_ - 2 * f));
  }
  function radacina(f, a, b) {
    // x din [a, b] unde f trece prin 0 (f crescatoare); null daca nu trece
    if (f(a) >= 0 || f(b) <= 0) return null;
    for (let i = 0; i < 80; i++) { const m = (a + b) / 2; if (f(m) > 0) b = m; else a = m; }
    return (a + b) / 2;
  }
  function prismaSubSuprafata(poli, z0, sus, taieturi, xStart) {
    // Prisma inchisa peste poligonul simplu `poli` (sens trigonometric), de la z0 pana la sus(x), impartita in
    // trapeze verticale: la fiecare varf si la fiecare taietura. Doar partea cu x >= xStart. -> lista de triunghiuri.
    // x-urile foarte apropiate (sub 1e-7 mm) devin unul singur, altfel ies fasii de grosime zero
    const toate = [...poli.map(p => p[0]), ...taieturi].filter(Number.isFinite).sort((a, b) => a - b), rep = new Map();
    for (let i = 0, r = null; i < toate.length; i++) { if (r === null || toate[i] - r > 1e-7) r = toate[i]; rep.set(toate[i], r); }
    const snap = x => (rep.has(x) ? rep.get(x) : x);
    poli = poli.map(([x, y]) => [snap(x), y]).filter((p, i, a) => { const q = a[(i + 1) % a.length]; return p[0] !== q[0] || p[1] !== q[1]; });
    taieturi = taieturi.map(snap);
    if (Number.isFinite(xStart)) xStart = snap(xStart);
    const n = poli.length, tri = [];
    const evenim = new Set(poli.map(p => p[0]));
    for (const x of taieturi) evenim.add(x);
    const xs = [...evenim].filter(x => x >= xStart).sort((a, b) => a - b);
    const laX = new Map();
    for (const [x, y] of poli) { if (!laX.has(x)) laX.set(x, []); laX.get(x).push(y); }
    const muchii = [];
    for (let i = 0; i < n; i++) { const p = poli[i], q = poli[(i + 1) % n]; muchii.push({ p, q, x0: Math.min(p[0], q[0]), x1: Math.max(p[0], q[0]) }); }
    const yLa = (m, x) => (x === m.p[0] ? m.p[1] : x === m.q[0] ? m.q[1] : m.p[1] + (m.q[1] - m.p[1]) * (x - m.p[0]) / (m.q[0] - m.p[0]));
    const z = x => (x <= xStart ? z0 : sus(x));
    const fata = (a, b, c, jos) => (jos ? tri.push([[a[0], a[1], z0], [c[0], c[1], z0], [b[0], b[1], z0]]) : tri.push([[a[0], a[1], z(a[0])], [b[0], b[1], z(b[0])], [c[0], c[1], z(c[0])]]));
    // fetele de sus si de jos: trapeze, cu varfurile de pe laturile verticale incluse (fara jonctiuni in T)
    for (let k = 0; k + 1 < xs.length; k++) {
      const xa = xs[k], xb = xs[k + 1], xm = (xa + xb) / 2;
      const tai = muchii.filter(m => m.x0 !== m.x1 && m.x0 <= xa && m.x1 >= xb).sort((m1, m2) => yLa(m1, xm) - yLa(m2, xm));
      for (let t = 0; t + 1 < tai.length; t += 2) {
        const lo = tai[t], hi = tai[t + 1];
        const A = [xa, yLa(lo, xa)], B = [xb, yLa(lo, xb)], C = [xb, yLa(hi, xb)], D = [xa, yLa(hi, xa)];
        // latura stanga si cea dreapta, de jos in sus (cu varfurile de pe ele); triunghiuri numai intre ele
        const st = [A, ...(laX.get(xa) || []).filter(y => y > A[1] && y < D[1]).sort((a, b) => a - b).map(y => [xa, y]), D].filter((p, i, a) => i === 0 || p[1] !== a[i - 1][1]);
        const dr = [B, ...(laX.get(xb) || []).filter(y => y > B[1] && y < C[1]).sort((a, b) => a - b).map(y => [xb, y]), C].filter((p, i, a) => i === 0 || p[1] !== a[i - 1][1]);
        let i = 0, j = 0;
        while (i < st.length - 1 || j < dr.length - 1) {
          if (j === dr.length - 1 || (i < st.length - 1 && st[i + 1][1] <= dr[j + 1][1])) { fata(st[i], dr[j], st[i + 1], false); fata(st[i], dr[j], st[i + 1], true); i++; }
          else { fata(st[i], dr[j], dr[j + 1], false); fata(st[i], dr[j], dr[j + 1], true); j++; }
        }
      }
    }
    // peretii: fiecare muchie, impartita la aceleasi x
    for (const m of muchii) {
      let pct;
      if (m.p[0] === m.q[0]) { if (m.p[0] < xStart) continue; pct = [m.p, m.q]; }
      else {
        const inter = xs.filter(x => x > m.x0 && x < m.x1);
        if (m.p[0] > m.q[0]) inter.reverse();
        if (m.x1 <= xStart) continue;
        // capetele de dinainte de xStart se muta pe xStart
        pct = [m.p, ...inter.map(x => [x, yLa(m, x)]), m.q].map(p => (p[0] < xStart ? [xStart, yLa(m, xStart)] : p))
          .filter((p, i, arr) => i === 0 || p[0] !== arr[i - 1][0] || p[1] !== arr[i - 1][1]);
      }
      for (let i = 0; i + 1 < pct.length; i++) {
        const u = pct[i], v = pct[i + 1], zu = z(u[0]), zv = z(v[0]);
        const u0 = [u[0], u[1], z0], v0 = [v[0], v[1], z0], u1 = [u[0], u[1], zu], v1 = [v[0], v[1], zv];
        if (zv - z0 > 1e-9) tri.push([u0, v0, v1]);
        if (zu - z0 > 1e-9) tri.push([u0, v1, u1]);
      }
    }
    return tri;
  }
  function rampaPlan(kit, cat) {
    // straturile in coordonatele rampei, conturul din plan si santurile; totul mutat cu coltul in (0, 0)
    const T = P.grosime, L_ = P.rampa_lungime;
    const comp = cat.kituri[kit];
    const straturi = comp.map(([nume], j) => { const g = geometrie(cat.piese[nume]); return { c: muta(g.contur, g.ox, g.oy), z0: j * T, z1: (j + 1) * T }; });
    const jos = kit === "rampa_urcare" ? "M" : "T", sus = kit === "rampa_urcare" ? "T" : "M";
    const c = cale(0, 0, 0, [Ls(L_)], jos, sus);
    const santuri = [P.sant_axa, -P.sant_axa].flatMap(d => liniiSant(c, d));
    const plan = celMaiMare(reuneste(straturi.map(s => s.c)));
    const [x0, y0, x1, y1] = cutie(plan);
    // zona frezata de santuri: banda de latimea santului (sau a frezei, daca e mai lata), plus intrarile evazate
    const r = Math.max(P.sant_latime, P.freza) / 2, lung = cale(-5, 0, 0, [Ls(L_ + 10)], null, null);
    const zone = [P.sant_axa, -P.sant_axa].map(d => [...paralela(lung, d - r), ...invers(paralela(lung, d + r), false)]);
    for (const l of santuri) if (l.length === 2) zone.push(traseu(l[0], l[1], P.freza / 2));
    const zona = reuneste(zone);
    return { straturi: straturi.map(s => ({ ...s, c: muta(s.c, -x0, -y0) })), plan: muta(plan, -x0, -y0), santuri: santuri.map(l => muta(l, -x0, -y0)),
             zona: zona.map(v => muta(v, -x0, -y0)), dx: -x0, w: x1 - x0, h: y1 - y0 };
  }
  function traseu(a, b, r) {
    // ce scoate freza (raza r) mergand in linie dreapta de la a la b: dreptunghi cu capete rotunde
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / L * r, ny = (b[0] - a[0]) / L * r;
    return [[a[0] - nx, a[1] - ny, 0], [b[0] - nx, b[1] - ny, 1], [b[0] + nx, b[1] + ny, 0], [a[0] + nx, a[1] + ny, 1]];
  }
  function stlRampa(rp, finisata = false) {
    // relieful (straturile taiate de suprafata) sau, cu `finisata`, rampa gata: si cu santurile de 3 mm in suprafata
    const L_ = P.rampa_lungime, tri = [];
    const prisma = (c, s, zr) => {
      const poli = aplatizeaza(c, 0.5).filter((p, i, a) => { const q = a[(i + 1) % a.length]; return Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-7; });
      if (poli.length < 3) return;
      const [ax0, , ax1] = cutie(c);
      const xStart = zr(ax1) <= s.z0 ? null : (zr(ax0) > s.z0 ? -Infinity : (radacina(x => zr(x) - s.z0, ax0, ax1) ?? -Infinity));
      if (xStart === null) return;          // toata bucata e deasupra suprafetei: nu ramane nimic
      const xVarf = radacina(x => zr(x) - s.z1, ax0, ax1) ?? (zr(ax0) >= s.z1 ? -Infinity : Infinity);
      const sus = x => Math.max(s.z0, Math.min(s.z1, zr(x)));
      const taieturi = [];
      for (let k = 0; k <= 240; k++) { const x = rp.dx + k * L_ / 240 + 0.0137; if (x > Math.max(xStart, ax0) && x < Math.min(xVarf, ax1)) taieturi.push(x); }
      if (Number.isFinite(xStart)) taieturi.push(xStart);
      if (Number.isFinite(xVarf) && xVarf > ax0 && xVarf < ax1) taieturi.push(xVarf);
      tri.push(...prismaSubSuprafata(poli, s.z0, sus, taieturi, xStart));
    };
    const zrSus = x => zRampa(x - rp.dx) + 0.01, zrSant = x => zRampa(x - rp.dx) - P.sant_adancime;
    for (const s of rp.straturi) {
      if (!finisata) { prisma(s.c, s, zrSus); continue; }
      for (const c of scade([s.c], rp.zona)) prisma(c, s, zrSus);
      for (const z of rp.zona) for (const c of intersecteaza(s.c, z)) prisma(c, s, zrSant);
    }
    return stlBinar(tri, finisata ? "trenulet: rampa finisata (mm)" : "trenulet: relief rampa (mm)");
  }
  function stlBinar(tri, antet) {
    // + volumul (mm3) si aria (mm2), pentru cat filament ia
    let volum = 0, arie = 0;
    for (const [a, b, c] of tri) {
      volum += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      arie += Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
    }
    const buf = new ArrayBuffer(84 + 50 * tri.length), dv = new DataView(buf);
    for (let i = 0; i < antet.length; i++) dv.setUint8(i, antet.charCodeAt(i));
    dv.setUint32(80, tri.length, true);
    let o = 84;
    for (const [a, b, c] of tri) {
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1;
      for (const v of [nx / l, ny / l, nz / l, ...a, ...b, ...c]) { dv.setFloat32(o, v, true); o += 4; }
      dv.setUint16(o, 0, true); o += 2;
    }
    return { date: new Uint8Array(buf), triunghiuri: tri.length, volum, arie, tri };
  }
  // ---------------------------------------------------------------------------------------------- piese printate 3D
  // Corpuri inchise din sectiuni (aceeasi numar de varfuri, sens trigonometric) puse una peste alta; capetele se
  // triunghiuleaza prin taierea urechilor. Fiecare piesa vine gata asezata pentru printare (fara suporturi).
  function triunghiuriPoligon(P) {
    const idx = P.map((_, i) => i), out = [];
    const a2 = (a, b, c) => (P[b][0] - P[a][0]) * (P[c][1] - P[a][1]) - (P[b][1] - P[a][1]) * (P[c][0] - P[a][0]);
    const inauntru = (q, a, b, c) => a2(a, b, q) > 1e-9 && a2(b, c, q) > 1e-9 && a2(c, a, q) > 1e-9;
    for (let paza = 0; idx.length > 3 && paza < 20000; paza++) {
      let taiat = false;
      for (let i = 0; i < idx.length; i++) {
        const a = idx[(i + idx.length - 1) % idx.length], b = idx[i], c = idx[(i + 1) % idx.length];
        if (a2(a, b, c) <= 1e-9) continue;
        if (idx.some(q => q !== a && q !== b && q !== c && inauntru(q, a, b, c))) continue;
        out.push([a, b, c]); idx.splice(i, 1); taiat = true; break;
      }
      if (!taiat) {
        // ce a ramas e doar varfuri coliniare: le scot
        const i = idx.findIndex((b, k) => Math.abs(a2(idx[(k + idx.length - 1) % idx.length], b, idx[(k + 1) % idx.length])) <= 1e-9);
        if (i < 0) break;
        idx.splice(i, 1);
      }
    }
    if (idx.length === 3 && a2(idx[0], idx[1], idx[2]) > 1e-9) out.push(idx.slice());
    return out;
  }
  function corpDinSectiuni(sec) {
    // sec: [{ z, poli: [[x, y]...] }] cu z crescator
    const tri = [], N = sec[0].poli.length, p3 = (s, i) => [s.poli[i][0], s.poli[i][1], s.z];
    const cap = triunghiuriPoligon(sec[0].poli), A = sec[0], B = sec[sec.length - 1];
    for (const [a, b, c] of cap) { tri.push([p3(A, a), p3(A, c), p3(A, b)]); tri.push([p3(B, a), p3(B, b), p3(B, c)]); }
    for (let k = 0; k + 1 < sec.length; k++) {
      const S = sec[k], T = sec[k + 1];
      for (let i = 0; i < N; i++) {
        const j = (i + 1) % N;
        tri.push([p3(S, i), p3(S, j), p3(T, j)]); tri.push([p3(S, i), p3(T, j), p3(T, i)]);
      }
    }
    return tri;
  }
  function dreptunghiR(x0, y0, x1, y1, r, n = 6) {
    // dreptunghi cu colturi rotunde, cu acelasi numar de varfuri oricare ar fi raza (pentru sectiuni care se leaga)
    const out = [], c = [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]];
    for (const [cx, cy, u0] of c) for (let k = 0; k <= n; k++) { const u = (u0 + 90 * k / n) * Math.PI / 180; out.push([cx + r * Math.cos(u), cy + r * Math.sin(u)]); }
    return out;
  }
  const cercPoli = (cx, cy, r, n = 40) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos(2 * Math.PI * i / n), cy + r * Math.sin(2 * Math.PI * i / n)]);
  const prismaR = (x0, y0, x1, y1, r, z0, z1, tes = 0) => corpDinSectiuni(tes > 0
    ? [{ z: z0, poli: dreptunghiR(x0, y0, x1, y1, r) }, { z: z1 - tes, poli: dreptunghiR(x0, y0, x1, y1, r) }, { z: z1, poli: dreptunghiR(x0 + tes, y0 + tes, x1 - tes, y1 - tes, Math.max(0.3, r - tes)) }]
    : [{ z: z0, poli: dreptunghiR(x0, y0, x1, y1, r) }, { z: z1, poli: dreptunghiR(x0, y0, x1, y1, r) }]);
  function stlTunel() {
    // tunelul, in picioare pe portal (lungimea tunelului e inaltimea la printare): fara nicio surplomba
    const tren = P.inaltime_tren || 70, wi = 66, t = 5, rama = 3, L = 150;
    const hi = Math.min(165, P.grosime + tren + 10), ri = wi / 2, hs = hi - ri, na = 32;
    const sectiune = off => {
      const ro = ri + t + off, poli = [[-ro, 0], [-ri, 0]];
      for (let k = 0; k <= na; k++) { const u = Math.PI * (1 - k / na); poli.push([ri * Math.cos(u), hs + ri * Math.sin(u)]); }
      poli.push([ri, 0], [ro, 0]);
      for (let k = 0; k <= na; k++) { const u = Math.PI * k / na; poli.push([ro * Math.cos(u), hs + ro * Math.sin(u)]); }
      return poli.map(([x, y]) => [x + ri + t + rama, y]);
    };
    const tri = corpDinSectiuni([[0, rama], [6, rama], [6 + rama, 0], [L - 6 - rama, 0], [L - 6, rama], [L, rama]].map(([z, o]) => ({ z, poli: sectiune(o) })));
    return { ...stlBinar(tri, "trenulet: tunel (mm)"), dim: [wi + 2 * (t + rama), hi + t + rama, L], interior: [wi, hi] };
  }
  function stlPeron() {
    // peronul, culcat: 144 x 36, inalt de 20 mm, cu muchiile de sus tesite
    const tri = prismaR(0, 0, 144, 36, 3, 0, 20, 1.5);
    return { ...stlBinar(tri, "trenulet: peron (mm)"), dim: [144, 36, 20] };
  }
  function stlOpritor() {
    // blocul opritorului (40 x 18, inalt de 26 mm) cu doua tampoane in dreptul santurilor; printat culcat pe spate,
    // cu tampoanele in sus. Se lipeste pe capatul opritorului, in locul blocului de lemn.
    const [bw, bd] = P.opritor_bloc, h = 26, zc = 14;
    const tri = prismaR(0, 0, bw, h, 2, 0, bd, 1);
    for (const x of [bw / 2 - P.sant_axa, bw / 2 + P.sant_axa]) {
      tri.push(...corpDinSectiuni([{ z: bd - 1, poli: cercPoli(x, zc, 4.5) }, { z: bd + 6, poli: cercPoli(x, zc, 4.5) }]));
      tri.push(...corpDinSectiuni([{ z: bd + 5.5, poli: cercPoli(x, zc, 5.5) }, { z: bd + 8, poli: cercPoli(x, zc, 5.5) }]));
    }
    return { ...stlBinar(tri, "trenulet: opritor cu tampoane (mm)"), dim: [bw, h, bd + 8] };
  }
  function stlStalp(n) {
    // stalpul dintr-o bucata: patratul de 64 mm, inalt cat n straturi, cu cei doi obraji intre care sta calea
    const lat = P.stalp_latura, lob = (lat - P.latime - 1) / 2, H = n * P.grosime;
    const tri = prismaR(0, 0, lat, lat, 3, 0, H, 0);
    for (const y0 of [0, lat - lob]) tri.push(...prismaR(0, y0, lat, y0 + lob, 1.5, H - 1, H + P.grosime, 1));
    return { ...stlBinar(tri, `trenulet: stalp ${H} mm (mm)`), dim: [lat, lat, H + P.grosime] };
  }
  function santuriRegiuni(p) {
    // santurile piesei ca regiuni inchise (latimea frezei, prelungite putin peste capete), in coordonatele cailor
    const W = Math.max(P.sant_latime, P.freza), out = [];
    for (const c0 of p.cai || []) {
      if (!c0.santuri) continue;
      const e = prelungita(c0, 1.5), c = c0.santOprit > 0 ? e : { ...e, seg: [...e.seg, Ls(1.5)] };
      for (const d of [P.sant_axa, -P.sant_axa]) {
        let a = paralela(c, d - W / 2), b = paralela(c, d + W / 2);
        if (c0.santOprit > 0) { a = taieCapat(a, c0.santOprit); b = taieCapat(b, c0.santOprit); }
        out.push(ccw([...a, ...invers(b, false)]));
        // evazarea de la capete (ca la frezare): liniile in plus din liniiSant, maturate de freza
        const nPrinc = Math.max(0, P.sant_latime / 2 - P.freza / 2) < 0.01 ? 1 : 2;
        for (const l of liniiSant(c0, d).slice(nPrinc)) {
          const A = l[0], B = l[l.length - 1], L = Math.hypot(B[0] - A[0], B[1] - A[1]);
          if (L < 1e-6) continue;
          // putin sub raza frezei: altfel capatul rotund atinge tangent marginea santului si booleanul lasa fasii de grosime zero
          const r = P.freza / 2 - 0.03, nx = -(B[1] - A[1]) / L * r, ny = (B[0] - A[0]) / L * r;
          out.push([[A[0] - nx, A[1] - ny, 0], [B[0] - nx, B[1] - ny, 1], [B[0] + nx, B[1] + ny, 0], [A[0] + nx, A[1] + ny, 1]]);
        }
      }
    }
    return out;
  }
  function cuVarianteDePrintare(f) {
    // cuplajele pieselor printate au variantele lor (plasticul nu iese ca lemnul frezat)
    const vt = P.varianta_tata, vm = P.varianta_mama;
    P.varianta_tata = P.print_tata || 3; P.varianta_mama = P.print_mama || 3;
    try { return f(); } finally { P.varianta_tata = vt; P.varianta_mama = vm; }
  }
  function stlCale(p0, semne = 0) {
    // piesa de cale printata (in loc de frezata): corpul pana la fundul santurilor, apoi ce ramane din contur in afara
    // lor, pana sus. Culcata, cu santurile in sus; cuplajele cu variantele de printare. `semne`: cuburi mici pe mijloc
    // (proba cuplajelor: numarul variantei).
    return cuVarianteDePrintare(() => corpCale({ ...p0, _geo: undefined }, semne));
  }
  function corpCale(p, semne) {
    const g = geometrie(p), H = P.grosime, h0 = H - P.sant_adancime;
    let sant = santuriRegiuni(p);
    if (p.rot) sant = sant.map(l => roteste(l, rad(p.rot)));
    sant = sant.map(l => muta(l, -g.ox, -g.oy));
    const plat = v => {
      // fara varfuri dublate si fara varfuri coliniare (taierea urechilor le-ar sari, iar peretii le-ar folosi)
      let q = aplatizeaza(v, 1.0).filter((a, i, t) => { const b = t[(i + 1) % t.length]; return Math.hypot(a[0] - b[0], a[1] - b[1]) > 1e-6; });
      for (let schimbat = true; schimbat && q.length > 3;) {
        schimbat = false;
        for (let i = 0; i < q.length && q.length > 3; i++) {
          const a = q[(i + q.length - 1) % q.length], b = q[i], c = q[(i + 1) % q.length];
          if (Math.abs((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])) < 1e-7 * (1 + Math.hypot(c[0] - a[0], c[1] - a[1]))) { q.splice(i, 1); i--; schimbat = true; }
        }
      }
      const ar = q.reduce((t, a, i) => { const b = q[(i + 1) % q.length]; return t + a[0] * b[1] - a[1] * b[0]; }, 0);
      return ar < 0 ? q.reverse() : q;
    };
    const baza = plat(g.contur), tri = corpDinSectiuni([{ z: 0, poli: baza }, { z: h0, poli: baza }]);
    for (const v of scade([g.contur], sant)) {
      const q = plat(v);
      if (q.length >= 3) tri.push(...corpDinSectiuni([{ z: h0 - 0.01, poli: q }, { z: H, poli: q }]));
    }
    // semnele: intre locasul mamei (pana la 18,5 mm de capat) si capatul cu tata, pe fasia din mijloc
    for (let k = 0; k < semne; k++) tri.push(...prismaR(19.5 + k * 2, g.h / 2 - 0.7, 20.9 + k * 2, g.h / 2 + 0.7, 0.2, H - 0.01, H + 1));
    return { ...stlBinar(tri, `trenulet: ${p.nume} printata (mm)`), dim: [g.w, g.h, H + (semne ? 1 : 0)] };
  }
  function probaCuplaje() {
    // cinci bucati scurte (mama la un capat, tata la celalalt), variantele 1..5 ale cuplajelor printate, cu semnele lor
    const out = [], vt = P.print_tata, vm = P.print_mama;
    for (let k = 1; k <= 5; k++) {
      P.print_tata = k; P.print_mama = k;
      try { out.push({ k, ...stlCale(piesa("proba_cuplaj_" + k, [cale(0, 0, 0, [Ls(30)], "M", "T")]), k) }); }
      finally { P.print_tata = vt; P.print_mama = vm; }
    }
    return out;
  }
  function grameFilament(stl, umplere) {
    // pereti si fete pline (cam 1,2 mm), restul cu umplerea data; PLA, 1,24 g/cm3
    const coaja = Math.min(stl.volum, stl.arie * 1.2);
    return 1.24e-3 * (coaja + umplere * Math.max(0, stl.volum - coaja));
  }
  function stlLimba(lb, spate = false) {
    // lama gata de printat: fata pe care merg rotile pe masa imprimantei, stiftul in sus. Cea de pe fata piesei se vede
    // oglindit asa (e intoarsa); cea de pe spate (la doua fete) iese exact cum e desenata.
    const h = P.sant_adancime - 0.2, ls = Math.max(0.5, P.pivot_adancime - 0.3), rs = P.freza / 2 - P.pivot_joc;
    let poli = aplatizeaza(lb.contur, 0.25).filter((p, i, a) => { const q = a[(i + 1) % a.length]; return Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-7; });
    let q = lb.pivot;
    if (!spate) { poli = poli.map(([x, y]) => [x, -y]).reverse(); q = [q[0], -q[1]]; }
    const x0 = Math.min(...poli.map(p => p[0])), y0 = Math.min(...poli.map(p => p[1]));
    poli = poli.map(([x, y]) => [x - x0, y - y0]); q = [q[0] - x0, q[1] - y0];
    const tri = prismaSubSuprafata(poli, 0, () => h, [], -Infinity);
    // stiftul: alt corp inchis, care intra 1 mm in lama (feliatorul le uneste)
    const cer = [];
    for (let i = 0; i < 48; i++) { const u = 2 * Math.PI * i / 48; cer.push([q[0] + rs * Math.cos(u), q[1] + rs * Math.sin(u)]); }
    tri.push(...prismaSubSuprafata(cer, h - 1, () => h + ls, [], -Infinity));
    return stlBinar(tri, "trenulet: limba de macaz (mm)");
  }
  function dxfLimba(lb) {
    // conturul lamei (vazuta de deasupra, asezata) si stiftul, cu coltul in (0, 0)
    const [x0, y0, x1, y1] = cutie(lb.contur), t = v => muta(v, -x0, -y0);
    const rs = P.freza / 2 - P.pivot_joc;
    return scrieDxf(x1 - x0, y1 - y0, [{ strat: "LIMBA", inchis: true, varfuri: t(lb.contur) }, { strat: "PIVOT", inchis: true, varfuri: t(cerc(lb.pivot[0], lb.pivot[1], rs)) }]);
  }

  // ---------------------------------------------------------------------------------------------- asezarea pe placi
  function aplatizeaza(v, pas = 0.4) {
    // conturul inchis ca poligon (pentru rasterizare)
    const out = [];
    for (const [a, b, g] of segmente(v, true)) {
      const A = arcInfo(a, b, g);
      const k = A ? Math.max(2, Math.ceil(A.L / pas)) : 1;
      for (let i = 0; i < k; i++) out.push(punctPeSeg(a, b, g, i / k));
    }
    return out;
  }
  function rasterizeaza(v, x0, y0, nx, ny, res) {
    // celulele al caror centru e in contur, rand cu rand (regula par-impar)
    const poli = aplatizeaza(v), rows = [];
    for (let j = 0; j < ny; j++) {
      const y = y0 + (j + 0.5) * res, xs = [];
      for (let i = 0, k = poli.length - 1; i < poli.length; k = i++) {
        const [xa, ya] = poli[i], [xb, yb] = poli[k];
        if ((ya > y) !== (yb > y)) xs.push(xa + (y - ya) * (xb - xa) / (yb - ya));
      }
      xs.sort((a, b) => a - b);
      const rand = new Uint8Array(nx);
      for (let t = 0; t + 1 < xs.length; t += 2) {
        const i0 = Math.max(0, Math.ceil((xs[t] - x0) / res - 0.5)), i1 = Math.min(nx - 1, Math.floor((xs[t + 1] - x0) / res - 0.5));
        for (let i = i0; i <= i1; i++) rand[i] = 1;
      }
      rows.push(rand);
    }
    return rows;
  }
  function biti(rows, nx) {
    const W = Math.ceil(nx / 32) + 1;
    return rows.map(r => { const w = new Uint32Array(W); r.forEach((x, i) => { if (x) w[i >> 5] |= (1 << (i & 31)) >>> 0; }); return w; });
  }
  function aseaza(lista, umplere = [], ordini = ["arie", "inaltime"]) {
    // lista: piesele de taiat; umplere: piesele cu care se umple locul ramas (pe rand, cat incap);
    // ordini: in ce ordini se incearca asezarea (se pastreaza cea cu mai putine placi, apoi cea mai stransa)
    const [W, H] = P.placa, m = P.placa_margine, gap = P.distanta_piese, res = P.pas_asezare;
    const nx = Math.floor(W / res), ny = Math.floor(H / res), cuvinte = Math.ceil(nx / 32) + 1;
    const extra = gap / 2 + 0.75 * res;
    const variante = {};
    function variantePiesa(p) {
      if (variante[p.nume]) return variante[p.nume];
      const g = geometrie(p), out = [];
      for (const rot of [0, 180]) {
        let c = g.contur, lin = g.santuri, mar = g.marcaje, tes = g.tesire, mrg = g.margini, trl = g.treceriLocas, piv = g.pivoti;
        if (rot) {
          const cx = g.w / 2, cy = g.h / 2, r = l => roteste(l, Math.PI, cx, cy);
          c = r(c); lin = lin.map(r); mar = mar.map(r); tes = tes.map(r); mrg = mrg.map(r); trl = trl.map(r); piv = piv.map(r);
        }
        const [a0, b0] = cutie(c);
        const t = l => muta(l, -a0, -b0);
        c = t(c); lin = lin.map(t); mar = mar.map(t); tes = tes.map(t); mrg = mrg.map(t); trl = trl.map(t); piv = piv.map(t);
        const cb = decaleaza(c, extra), [bx0, by0, bx1, by1] = cutie(cb);
        const mx = Math.ceil((bx1 - bx0) / res), my = Math.ceil((by1 - by0) / res);
        const masca = rasterizeaza(cb, bx0, by0, mx, my, res);
        // masca deplasata cu 0..31 biti, ca sa se poata compara cu placa direct, pe cuvinte
        const deplasari = [];
        for (let s = 0; s < 32; s++) deplasari.push(biti(masca.map(r => { const t = new Uint8Array(mx + s); t.set(r, s); return t; }), mx + 32));
        // primul rand nevid al mastii: proba rapida inainte de toata masca
        const r0 = masca.findIndex(r => r.some(Boolean));
        out.push({ rot, c, lin, mar, tes, mrg, trl, piv, bx0, by0, mx, my, deplasari, r0: Math.max(0, r0) });
      }
      return (variante[p.nume] = out);
    }
    function placaNoua() {
      const occ = [];
      const b = Math.ceil(Math.max(0, m - gap / 2) / res);
      for (let j = 0; j < ny; j++) {
        const w = new Uint32Array(cuvinte);
        for (let i = 0; i < nx; i++) if (j < b || j >= ny - b || i < b || i >= nx - b) w[i >> 5] |= (1 << (i & 31)) >>> 0;
        for (let i = nx; i < cuvinte * 32; i++) w[i >> 5] |= (1 << (i & 31)) >>> 0;
        occ.push(w);
      }
      return { occ, locuri: [] };
    }
    function incape(occ, v, i, j) {
      const d = v.deplasari[i & 31], k0 = i >> 5;
      // intai randul de proba (cel mai des ocupat), apoi restul
      for (const r of [v.r0]) { const o = occ[j + r], mr = d[r]; for (let k = 0; k < mr.length && k0 + k < o.length; k++) if (o[k0 + k] & mr[k]) return false; }
      for (let r = 0; r < v.my; r++) {
        if (r === v.r0) continue;
        const o = occ[j + r], mr = d[r];
        for (let k = 0; k < mr.length && k0 + k < o.length; k++) if (o[k0 + k] & mr[k]) return false;
      }
      return true;
    }
    function incearca(placa, p) {
      let best = null;
      for (const v of variantePiesa(p)) {
        if (v.my > ny || v.mx > nx) continue;
        let gasit = null;
        for (let j = 0; j <= ny - v.my && !gasit; j++) {
          if (best && j * res - v.by0 > best.y) break;
          for (let i = 0; i <= nx - v.mx; i++) {
            if (!incape(placa.occ, v, i, j)) continue;
            const x = i * res - v.bx0, y = j * res - v.by0;
            const [a0, b0, a1, b1] = cutie(muta(v.c, x, y));
            if (a0 < m - 0.5 || b0 < m - 0.5 || a1 > W - m + 0.5 || b1 > H - m + 0.5) continue;
            gasit = { v, i, j, x, y };
            break;
          }
        }
        if (gasit && (!best || gasit.y < best.y || (gasit.y === best.y && gasit.x < best.x))) best = gasit;
      }
      return best;
    }
    function puneAici(placa, p, loc, inPlus = false) {
      const { v, i, j } = loc, d = v.deplasari[i & 31], k0 = i >> 5;
      for (let r = 0; r < v.my; r++) for (let k = 0; k < d[r].length && k0 + k < cuvinte; k++) placa.occ[j + r][k0 + k] |= d[r][k];
      const t = l => muta(l, loc.x, loc.y);
      placa.locuri.push({ piesa: p, rot: v.rot, contur: t(v.c), santuri: v.lin.map(t), marcaje: v.mar.map(t), tesire: v.tes.map(t), margini: v.mrg.map(t),
                          treceriLocas: v.trl.map(t), pivoti: v.piv.map(t), inPlus });
    }
    const cheie = {
      arie: p => -geometrie(p).aria,
      inaltime: p => -Math.min(geometrie(p).w, geometrie(p).h),
      latime: p => -Math.max(geometrie(p).w, geometrie(p).h),
    };
    function cuOrdinea(ordine) {
      const ordonate = lista.slice().sort((a, b) => cheie[ordine](a) - cheie[ordine](b) || cheie.arie(a) - cheie.arie(b));
      const placi = [];
      for (const p of ordonate) {
        let loc = null, placa = null;
        for (const pl of placi) { loc = incearca(pl, p); if (loc) { placa = pl; break; } }
        if (!loc) {
          placa = placaNoua();
          loc = incearca(placa, p);
          if (!loc) throw new Error("Piesa " + (p.titlu || p.nume) + " nu încape pe placă");
          placi.push(placa);
        }
        puneAici(placa, p, loc);
      }
      // cat de stransa e ultima placa: cat urca piesele pe ea (mai jos = mai mult loc liber, intr-o bucata)
      const ultima = placi[placi.length - 1];
      const sus = ultima ? Math.max(...ultima.locuri.map(l => cutie(l.contur)[3])) : 0;
      return { placi, scor: placi.length * 1e6 + sus };
    }
    let ales = null;
    for (const o of lista.length ? ordini : ["arie"]) { const r = cuOrdinea(o); if (!ales || r.scor < ales.scor) ales = r; }
    const placi = ales.placi;
    // umplerea: pe fiecare placa, piesele permise pe rand (ca sa iasa un amestec), pana nu mai incape niciuna
    if (umplere.length) {
      for (const placa of placi) {
        const active = umplere.slice();
        while (active.length) {
          for (let k = 0; k < active.length;) {
            const loc = incearca(placa, active[k]);
            if (loc) { puneAici(placa, active[k], loc, true); k++; }
            else active.splice(k, 1);
          }
        }
      }
    }
    return placi.map(pl => ({ locuri: pl.locuri, folosit: pl.locuri.reduce((t, l) => t + geometrie(l.piesa).aria, 0) / (W * H) }));
  }

  // ---------------------------------------------------------------------------------------------- DXF (din cvs2)
  const STRATURI = ["CONTUR", "SANTURI", "MARCAJE", "LOCAS", "PIVOT", "TESIRE", "GAURI", "LIMBA", "PLACA"];
  const CULORI = { CONTUR: 1, SANTURI: 5, MARCAJE: 3, LOCAS: 2, PIVOT: 30, TESIRE: 4, GAURI: 6, LIMBA: 7, PLACA: 8 };
  function nrDxf(x) {
    if (!Number.isFinite(x)) throw new Error("număr nefinit în DXF: " + x);
    if (x === 0) return "0";
    const s = String(x);
    return /e/i.test(s) ? x.toFixed(20).replace(/\.?0+$/, "") : s;
  }
  function scrieDxf(latime, inaltime, entitati) {
    // entitati: [{ strat, inchis, varfuri: [[x, y, bulge]...] }]
    const out = [];
    const g = (cod, val) => { out.push(String(cod), typeof val === "number" ? nrDxf(val) : val); };
    let urmator = 1;
    const handle = () => (urmator++).toString(16).toUpperCase();
    const H = {};
    for (const k of ["vport", "vportActiv", "ltype", "byBlock", "byLayer", "continuous", "layer", "style", "standard", "view", "ucs", "appid", "acad",
      "dimstyle", "dimStandard", "blockRecord", "brModel", "brPaper", "blocModel", "sfarsitModel", "blocPaper", "sfarsitPaper",
      "radacina", "grupuri", "layouturi", "layoutModel", "layoutPaper"]) H[k] = handle();
    const folosite = STRATURI.filter(s => entitati.some(e => e.strat === s));
    const straturi = new Map([["0", handle()], ...folosite.map(s => [s, handle()])]);
    const ent = entitati.map(e => ({ e, h: handle() }));
    let minX = 0, minY = 0, maxX = latime, maxY = inaltime;
    for (const { e } of ent) for (const [x, y] of e.varfuri) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
    const sectiune = (nume, corp) => { g(0, "SECTION"); g(2, nume); corp(); g(0, "ENDSEC"); };
    const tabel = (nume, h, n, corp, extra) => { g(0, "TABLE"); g(2, nume); g(5, h); g(330, "0"); g(100, "AcDbSymbolTable"); g(70, String(n)); if (extra) extra(); corp(); g(0, "ENDTAB"); };
    const inreg = (tip, h, tabelH, subclasa, codHandle = 5) => { g(0, tip); g(codHandle, h); g(330, tabelH); g(100, "AcDbSymbolTableRecord"); g(100, subclasa); };
    sectiune("HEADER", () => {
      g(9, "$ACADVER"); g(1, "AC1021");
      g(9, "$DWGCODEPAGE"); g(3, "ANSI_1252");
      g(9, "$INSBASE"); g(10, 0); g(20, 0); g(30, 0);
      g(9, "$EXTMIN"); g(10, minX); g(20, minY); g(30, 0);
      g(9, "$EXTMAX"); g(10, maxX); g(20, maxY); g(30, 0);
      g(9, "$LIMMIN"); g(10, 0); g(20, 0);
      g(9, "$LIMMAX"); g(10, latime); g(20, inaltime);
      g(9, "$INSUNITS"); g(70, "4");
      g(9, "$MEASUREMENT"); g(70, "1");
      g(9, "$LUNITS"); g(70, "2");
      g(9, "$HANDSEED"); g(5, urmator.toString(16).toUpperCase());
    });
    sectiune("CLASSES", () => undefined);
    sectiune("TABLES", () => {
      tabel("VPORT", H.vport, 1, () => {
        inreg("VPORT", H.vportActiv, H.vport, "AcDbViewportTableRecord");
        g(2, "*Active"); g(70, "0");
        g(10, 0); g(20, 0); g(11, 1); g(21, 1);
        g(12, (minX + maxX) / 2); g(22, (minY + maxY) / 2);
        g(13, 0); g(23, 0); g(14, 10); g(24, 10); g(15, 10); g(25, 10);
        g(16, 0); g(26, 0); g(36, 1); g(17, 0); g(27, 0); g(37, 0);
        g(40, Math.max(maxY - minY, 1) * 1.1); g(41, Math.max(maxX - minX, 1) / Math.max(maxY - minY, 1));
        g(42, 50); g(43, 0); g(44, 0); g(50, 0); g(51, 0);
        g(71, "0"); g(72, "100"); g(73, "1"); g(74, "3"); g(75, "0"); g(76, "0"); g(77, "0"); g(78, "0");
      });
      tabel("LTYPE", H.ltype, 3, () => {
        for (const [h, nume, text] of [[H.byBlock, "ByBlock", ""], [H.byLayer, "ByLayer", ""], [H.continuous, "Continuous", "Solid line"]]) {
          inreg("LTYPE", h, H.ltype, "AcDbLinetypeTableRecord");
          g(2, nume); g(70, "0"); g(3, text); g(72, "65"); g(73, "0"); g(40, 0);
        }
      });
      tabel("LAYER", H.layer, straturi.size, () => {
        for (const [nume, h] of straturi) {
          inreg("LAYER", h, H.layer, "AcDbLayerTableRecord");
          g(2, nume); g(70, "0"); g(62, String(nume === "0" ? 7 : CULORI[nume])); g(6, "Continuous"); g(370, "-3");
        }
      });
      tabel("STYLE", H.style, 1, () => {
        inreg("STYLE", H.standard, H.style, "AcDbTextStyleTableRecord");
        g(2, "Standard"); g(70, "0"); g(40, 0); g(41, 1); g(50, 0); g(71, "0"); g(42, 2.5); g(3, "txt"); g(4, "");
      });
      tabel("VIEW", H.view, 0, () => undefined);
      tabel("UCS", H.ucs, 0, () => undefined);
      tabel("APPID", H.appid, 1, () => { inreg("APPID", H.acad, H.appid, "AcDbRegAppTableRecord"); g(2, "ACAD"); g(70, "0"); });
      tabel("DIMSTYLE", H.dimstyle, 1, () => {
        inreg("DIMSTYLE", H.dimStandard, H.dimstyle, "AcDbDimStyleTableRecord", 105);
        g(2, "Standard"); g(70, "0");
      }, () => { g(100, "AcDbDimStyleTable"); g(71, "0"); });
      tabel("BLOCK_RECORD", H.blockRecord, 2, () => {
        for (const [h, nume, layout] of [[H.brModel, "*Model_Space", H.layoutModel], [H.brPaper, "*Paper_Space", H.layoutPaper]]) {
          inreg("BLOCK_RECORD", h, H.blockRecord, "AcDbBlockTableRecord");
          g(2, nume); g(340, layout);
        }
      });
    });
    sectiune("BLOCKS", () => {
      for (const [bloc, sfarsit, br, nume, paper] of [[H.blocModel, H.sfarsitModel, H.brModel, "*Model_Space", false], [H.blocPaper, H.sfarsitPaper, H.brPaper, "*Paper_Space", true]]) {
        g(0, "BLOCK"); g(5, bloc); g(330, br); g(100, "AcDbEntity");
        if (paper) g(67, "1");
        g(8, "0"); g(100, "AcDbBlockBegin"); g(2, nume); g(70, "0"); g(10, 0); g(20, 0); g(30, 0); g(3, nume); g(1, "");
        g(0, "ENDBLK"); g(5, sfarsit); g(330, br); g(100, "AcDbEntity");
        if (paper) g(67, "1");
        g(8, "0"); g(100, "AcDbBlockEnd");
      }
    });
    sectiune("ENTITIES", () => {
      for (const { e, h } of ent) {
        g(0, "LWPOLYLINE"); g(5, h); g(330, H.brModel); g(100, "AcDbEntity"); g(8, e.strat); g(100, "AcDbPolyline");
        g(90, String(e.varfuri.length)); g(70, e.inchis ? "1" : "0"); g(43, 0);
        e.varfuri.forEach(([x, y, b], i) => {
          g(10, x); g(20, y);
          if (b !== 0 && (e.inchis || i < e.varfuri.length - 1)) g(42, b);
        });
      }
    });
    sectiune("OBJECTS", () => {
      g(0, "DICTIONARY"); g(5, H.radacina); g(330, "0"); g(100, "AcDbDictionary"); g(281, "1");
      g(3, "ACAD_GROUP"); g(350, H.grupuri); g(3, "ACAD_LAYOUT"); g(350, H.layouturi);
      g(0, "DICTIONARY"); g(5, H.grupuri); g(330, H.radacina); g(100, "AcDbDictionary"); g(281, "1");
      g(0, "DICTIONARY"); g(5, H.layouturi); g(330, H.radacina); g(100, "AcDbDictionary"); g(281, "1");
      g(3, "Layout1"); g(350, H.layoutPaper); g(3, "Model"); g(350, H.layoutModel);
      for (const [h, nume, br, ordine] of [[H.layoutModel, "Model", H.brModel, 0], [H.layoutPaper, "Layout1", H.brPaper, 1]]) {
        g(0, "LAYOUT"); g(5, h); g(330, H.layouturi);
        g(100, "AcDbPlotSettings"); g(1, ""); g(4, ""); g(6, "");
        g(40, 0); g(41, 0); g(42, 0); g(43, 0); g(44, 0); g(45, 0); g(46, 0); g(47, 0); g(48, 0); g(49, 0);
        g(140, 0); g(141, 0); g(142, 1); g(143, 1); g(70, "688"); g(72, "1"); g(73, "0"); g(74, "5"); g(7, ""); g(75, "16");
        g(76, "0"); g(77, "2"); g(78, "300"); g(147, 1); g(148, 0); g(149, 0);
        g(100, "AcDbLayout"); g(1, nume); g(70, "1"); g(71, String(ordine));
        g(10, 0); g(20, 0); g(11, latime); g(21, inaltime); g(12, 0); g(22, 0); g(32, 0);
        g(14, minX); g(24, minY); g(34, 0); g(15, maxX); g(25, maxY); g(35, 0);
        g(146, 0); g(13, 0); g(23, 0); g(33, 0); g(16, 1); g(26, 0); g(36, 0); g(17, 0); g(27, 1); g(37, 0);
        g(76, "0"); g(330, br);
      }
    });
    g(0, "EOF");
    return out.join("\r\n") + "\r\n";
  }

  // ---------------------------------------------------------------------------------------------- SVG (previzualizare)
  function caleSvg(v, inchis) {
    let d = "M" + v[0][0].toFixed(3) + " " + v[0][1].toFixed(3);
    for (const [a, b, g] of segmente(v, inchis)) {
      const A = arcInfo(a, b, g);
      d += A ? ` A${A.r.toFixed(3)} ${A.r.toFixed(3)} 0 ${Math.abs(A.th) > Math.PI ? 1 : 0} ${A.th > 0 ? 1 : 0} ${b[0].toFixed(3)} ${b[1].toFixed(3)}`
             : ` L${b[0].toFixed(3)} ${b[1].toFixed(3)}`;
    }
    return d + (inchis ? " Z" : "");
  }
  function svgPlaca(placa, cuDimensiuni = true) {
    const [W, H] = P.placa;
    const c = placa.locuri.map(l => caleSvg(l.contur, true)).join(" ");
    const s = placa.locuri.flatMap(l => [...l.santuri, ...(l.treceriLocas || [])]).map(l => caleSvg(l, false)).join(" ");
    const dim = cuDimensiuni ? ` width="${W}mm" height="${H}mm"` : "";
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"${dim}><g transform="translate(0 ${H}) scale(1 -1)">` +
      `<rect x="0" y="0" width="${W}" height="${H}" fill="#f6efe4" stroke="#999" stroke-width="1"/>` +
      `<path d="${c}" fill="#dcb57f" stroke="#8f6236" stroke-width="0.8"/><path d="${s}" fill="none" stroke="#a87545" stroke-width="6" stroke-linecap="round" opacity=".75"/></g></svg>`;
  }

  // ---------------------------------------------------------------------------------------------- ZIP (fara compresie)
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
  function zip(fisiere) {
    // fisiere: [{ nume, text }] -> Uint8Array
    const enc = new TextEncoder(), parti = [], central = [];
    let pozitie = 0;
    const u16 = n => [n & 0xff, (n >>> 8) & 0xff], u32 = n => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];
    const acum = new Date(), ora = (acum.getHours() << 11) | (acum.getMinutes() << 5) | (acum.getSeconds() >> 1);
    const zi = ((acum.getFullYear() - 1980) << 9) | ((acum.getMonth() + 1) << 5) | acum.getDate();
    for (const f of fisiere) {
      const nume = enc.encode(f.nume), date = typeof f.text === "string" ? enc.encode(f.text) : f.text, c = crc32(date);
      const antet = new Uint8Array([...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(ora), ...u16(zi), ...u32(c), ...u32(date.length), ...u32(date.length), ...u16(nume.length), ...u16(0)]);
      parti.push(antet, nume, date);
      central.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(ora), ...u16(zi), ...u32(c), ...u32(date.length), ...u32(date.length), ...u16(nume.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(pozitie)]), nume);
      pozitie += antet.length + nume.length + date.length;
    }
    const lungCentral = central.reduce((t, x) => t + x.length, 0);
    const sfarsit = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(fisiere.length), ...u16(fisiere.length), ...u32(lungCentral), ...u32(pozitie), ...u16(0)]);
    const tot = new Uint8Array(pozitie + lungCentral + sfarsit.length);
    let o = 0;
    for (const x of [...parti, ...central, sfarsit]) { tot.set(x, o); o += x.length; }
    return tot;
  }

  // ---------------------------------------------------------------------------------------------- exportul
  function entitatiPiesa(contur, santuri, marcaje, tesire = [], margini = [], locas = [], pivoti = []) {
    return [...(contur ? [{ strat: "CONTUR", inchis: true, varfuri: contur }] : []), ...santuri.map(v => ({ strat: "SANTURI", inchis: false, varfuri: v })),
            ...marcaje.map(v => ({ strat: "MARCAJE", inchis: false, varfuri: v })),
            ...locas.map(v => ({ strat: "LOCAS", inchis: false, varfuri: v })), ...pivoti.map(v => ({ strat: "PIVOT", inchis: true, varfuri: v })),
            ...tesire.map(v => ({ strat: "TESIRE", inchis: true, varfuri: v })), ...margini.map(v => ({ strat: "TESIRE", inchis: false, varfuri: v }))];
  }
  function deTaiat(numarare, laComanda) {
    // din lista planificatorului (nume -> bucati), piesele care se taie efectiv: kiturile se desfac in componente
    const cat = catalog(laComanda), bucati = {}, necunoscute = [], printate = {};
    for (const [nume, n] of Object.entries(numarare)) {
      if (!n) continue;
      if (P.stalpi_printati && /^stalp_\d+$/.test(nume)) printate[nume] = (printate[nume] || 0) + n;
      else if (P.opritor_printat && nume === "opritor_bloc") printate[nume] = (printate[nume] || 0) + n;
      else if ((P.cale_printata || []).includes(nume) && cat.piese[nume] && !cat.kituri[nume]) printate["cale:" + nume] = (printate["cale:" + nume] || 0) + n;
      else if (cat.kituri[nume]) { for (const [comp, k] of cat.kituri[nume]) bucati[comp] = (bucati[comp] || 0) + k * n; }
      else if (cat.piese[nume]) bucati[nume] = (bucati[nume] || 0) + n;
      else necunoscute.push(nume);
    }
    if (P.doua_fete) {
      // o curba / un macaz intors pe partea cealalta e varianta oglindita: le taiem pe toate "stanga"
      for (const nume of Object.keys(bucati)) {
        const pereche = nume.endsWith("_dreapta") ? nume.slice(0, -"_dreapta".length) + "_stanga" : null;
        if (pereche && cat.piese[pereche]) { bucati[pereche] = (bucati[pereche] || 0) + bucati[nume]; delete bucati[nume]; }
      }
    }
    return { cat, bucati, necunoscute, printate };
  }
  function pregatesteP(setari) {
    P = { ...IMPLICIT, ...(setari || {}) };
    // la doua fete, gaurile pentru stifturi stau in margine: trebuie sa ramana lemn intre ele si piese
    if (P.doua_fete) P.placa_margine = Math.max(P.placa_margine, P.stift_margine + P.stift_d / 2 + 3);
    // gaurile pivotilor, din ambele fete, in acelasi loc: sa ramana cel putin 1 mm de lemn intre ele
    if (P.doua_fete) P.pivot_adancime = Math.max(0.8, Math.min(P.pivot_adancime, (P.grosime - 1) / 2 - P.sant_adancime));
    else P.pivot_adancime = Math.max(0.8, Math.min(P.pivot_adancime, P.grosime - P.sant_adancime - 2));
  }
  function piesePrintate(numarare, laComanda, setari) {
    // doar ce se printeaza din circuit (fara placi si fara G-code), pentru lista de printat din 3D:
    // [{ nume, fel, piesa?, n?, bucati, umplere, tri }], fiecare corp cu coltul in (0, 0, 0), gata intors pentru printare
    pregatesteP(setari);
    const { cat, bucati, printate } = deTaiat(numarare, laComanda), out = [];
    const pune = (o, stl) => { if (o.bucati > 0) out.push({ ...o, tri: stl.tri }); };
    if (P.limbi) {
      for (const nume of Object.keys(bucati).sort()) {
        const p = cat.piese[nume];
        if (!p || !p.limba) continue;
        const g = geometrie(p);
        if (!g.limba) continue;
        pune({ nume: `limba_${nume}`, fel: "limba", piesa: nume, bucati: bucati[nume], umplere: 1 }, stlLimba(g.limba, false));
        if (P.doua_fete) pune({ nume: `limba_${nume}_spate`, fel: "limba_spate", piesa: nume, bucati: bucati[nume], umplere: 1 }, stlLimba(g.limba, true));
      }
    }
    for (const [nume, n] of Object.entries(printate).sort()) {
      const k = /^stalp_(\d+)$/.exec(nume);
      if (k) pune({ nume: `stalp_${+k[1] * P.grosime}mm`, fel: "stalp", n: +k[1] * P.grosime, bucati: n, umplere: 0.15 }, stlStalp(+k[1]));
      else if (nume === "opritor_bloc") pune({ nume: "opritor_tampoane", fel: "opritor", bucati: n, umplere: 0.25 }, stlOpritor());
      else if (nume.startsWith("cale:")) pune({ nume: `cale_${nume.slice(5)}`, fel: "cale", piesa: nume.slice(5), bucati: n, umplere: 0.15 }, stlCale(cat.piese[nume.slice(5)]));
    }
    if (P.proba_cuplaje) for (const x of probaCuplaje()) pune({ nume: `proba_cuplaj_${x.k}`, fel: "proba", n: x.k, bucati: 1, umplere: 0.2 }, x);
    pune({ nume: "tunel", fel: "tunel", bucati: Math.max(0, Math.round(P.tunel || 0)), umplere: 0.15 }, stlTunel());
    pune({ nume: "peron", fel: "peron", bucati: Math.max(0, Math.round(P.peron || 0)), umplere: 0.15 }, stlPeron());
    return out;
  }
  // ce intra in arhiva (implicit, tot); gcode: setarile pentru TrenGCode (gcode.js), daca e incarcat
  const CONTINUT = { dxfPlaci: true, svg: true, dxfPiese: true, rampa: true, calibrare: true, gcode: false, limbi: true, printate: true };
  function genereaza(numarare, laComanda, setari, optiuni = {}) {
    if (typeof optiuni === "boolean") optiuni = { continut: { calibrare: optiuni } };
    const ce = { ...CONTINUT, ...(optiuni.continut || {}) };
    pregatesteP(setari);
    const t0 = Date.now();
    const { cat, bucati, necunoscute, printate: deLaCircuit } = deTaiat(numarare, laComanda);
    const lista = [];
    for (const [nume, n] of Object.entries(bucati)) for (let i = 0; i < n; i++) lista.push(cat.piese[nume]);
    // piesele de umplutura: doar piese simple din catalog; la doua fete, "dreapta" se taie ca "stanga"
    const umplere = [];
    for (let id of optiuni.umplere || []) {
      if (P.doua_fete && id.endsWith("_dreapta") && cat.piese[id.slice(0, -8) + "_stanga"]) id = id.slice(0, -8) + "_stanga";
      if (cat.piese[id] && !umplere.includes(cat.piese[id])) umplere.push(cat.piese[id]);
    }
    const placi = aseaza(lista, umplere);
    const inPlus = {};
    for (const pl of placi) for (const l of pl.locuri) if (l.inPlus) inPlus[l.piesa.nume] = (inPlus[l.piesa.nume] || 0) + 1;
    const [W, H] = P.placa, fisiere = [];
    const placaEnt = { strat: "PLACA", inchis: true, varfuri: drept(0, 0, W, H) };
    const gauri = [P.stift_margine, W - P.stift_margine].map(x => ({ strat: "GAURI", inchis: true, varfuri: cerc(x, H / 2, P.stift_d / 2) }));
    // fata 2 se vede dupa ce placa se intoarce pe latura lunga: totul oglindit fata de mijlocul placii
    const oglinda = v => v.map(([x, y, b]) => [x, H - y, -b]);
    placi.forEach((pl, i) => {
      if (ce.dxfPlaci) {
        if (P.doua_fete) {
          // fata 1: gaurile pentru stifturi, marcajele, santurile (si tesirea de pe fata); fata 2: santurile de pe spate, tesirea si decuparea
          const f1 = [...pl.locuri.flatMap(l => entitatiPiesa(null, l.santuri, l.marcaje, l.tesire, l.margini, l.treceriLocas, l.pivoti)), ...gauri, placaEnt];
          const f2 = [...pl.locuri.flatMap(l => entitatiPiesa(oglinda(l.contur), l.santuri.map(oglinda), [], l.tesire.map(oglinda), l.margini.map(oglinda),
                                                               l.treceriLocas.map(oglinda), l.pivoti.map(oglinda))), ...gauri, placaEnt];
          fisiere.push({ nume: `placi/placa_${i + 1}_fata1.dxf`, text: scrieDxf(W, H, f1) });
          fisiere.push({ nume: `placi/placa_${i + 1}_fata2.dxf`, text: scrieDxf(W, H, f2) });
        } else {
          fisiere.push({ nume: `placi/placa_${i + 1}.dxf`, text: scrieDxf(W, H, [...pl.locuri.flatMap(l => entitatiPiesa(l.contur, l.santuri, l.marcaje, l.tesire, l.margini, l.treceriLocas, l.pivoti)), placaEnt]) });
        }
      }
      if (ce.svg) fisiere.push({ nume: `placi/placa_${i + 1}.svg`, text: svgPlaca(pl) });
    });
    if (ce.dxfPiese) {
      for (const nume of new Set([...Object.keys(bucati), ...Object.keys(inPlus)])) {
        const g = geometrie(cat.piese[nume]);
        fisiere.push({ nume: `piese/${nume}.dxf`, text: scrieDxf(g.w, g.h, entitatiPiesa(g.contur, g.santuri, g.marcaje, g.tesire, g.margini, g.treceriLocas, g.pivoti)) });
      }
    }
    // limbile macazurilor: cate una pe fata (la doua fete, si una oglindita pentru spate)
    const limbi = [], faraLimba = [];
    if (P.limbi) {
      for (const nume of new Set([...Object.keys(bucati), ...Object.keys(inPlus)])) {
        const p = cat.piese[nume];
        if (!p.limba) continue;
        const g = geometrie(p);
        if (!g.limba) { faraLimba.push(nume); continue; }
        const st = stlLimba(g.limba, false);
        limbi.push({ nume, bucati: (bucati[nume] || 0) + (inPlus[nume] || 0), unghi: Math.abs(g.limba.unghi) * 180 / Math.PI, grame: grameFilament(st, 1) });
        if (!ce.limbi) continue;
        fisiere.push({ nume: `limbi/limba_${nume}.stl`, text: st.date });
        if (P.doua_fete) fisiere.push({ nume: `limbi/limba_${nume}_spate.stl`, text: stlLimba(g.limba, true).date });
        fisiere.push({ nume: `limbi/limba_${nume}.dxf`, text: dxfLimba(g.limba) });
      }
    }
    // piesele printate: stalpii si blocul opritorului (din circuit), tunelurile si peroanele (cate ai cerut)
    const printate = [];
    const printata = (nume, titlu, n, stl, umplere = 0.15) => {
      if (!n) return;
      printate.push({ nume, titlu, bucati: n, dim: stl.dim, grame: grameFilament(stl, umplere) });
      if (ce.printate) fisiere.push({ nume: `printate/${nume}.stl`, text: stl.date });
    };
    for (const [nume, n] of Object.entries(deLaCircuit).sort()) {
      const k = /^stalp_(\d+)$/.exec(nume);
      if (k) printata(`stalp_${+k[1] * P.grosime}mm`, `Stâlp ${+k[1] * P.grosime} mm`, n, stlStalp(+k[1]));
      else if (nume === "opritor_bloc") printata("opritor_tampoane", "Opritor cu tampoane", n, stlOpritor(), 0.25);
      else if (nume.startsWith("cale:")) { const pc = cat.piese[nume.slice(5)]; printata(`cale_${pc.nume}`, `${pc.titlu || pc.nume} (printată)`, n, stlCale(pc)); }
    }
    if (P.proba_cuplaje) for (const x of probaCuplaje()) printata(`proba_cuplaj_${x.k}`, `Proba cuplajelor, varianta ${x.k}`, 1, x, 0.2);
    printata("tunel", "Tunel", Math.max(0, Math.round(P.tunel || 0)), stlTunel());
    printata("peron", "Peron", Math.max(0, Math.round(P.peron || 0)), stlPeron());
    if (ce.rampa) {
      for (const kit of ["rampa_urcare", "rampa_coborare"]) {
        if (!numarare[kit]) continue;
        const rp = rampaPlan(kit, cat);
        fisiere.push({ nume: `piese/${kit}_santuri.dxf`, text: scrieDxf(rp.w, rp.h, entitatiPiesa(rp.plan, rp.santuri, [])) });
        fisiere.push({ nume: `piese/${kit}_relief.stl`, text: stlRampa(rp).date });
        fisiere.push({ nume: `piese/${kit}_finisata.stl`, text: stlRampa(rp, true).date });
      }
    }
    let calibrare = null;
    if (ce.calibrare) {
      const g = geometrie(placaCalibrare());
      calibrare = g;
      if (ce.dxfPlaci || ce.dxfPiese) fisiere.push({ nume: "calibrare/placa_calibrare.dxf", text: scrieDxf(g.w, g.h, entitatiPiesa(g.contur, g.santuri, g.marcaje, g.tesire, g.margini)) });
    }
    let gcode = null;
    if (ce.gcode && glob.TrenGCode) {
      // rampele lipite: suprafata si de unde incepe fiecare strat, in coordonatele rampei (x de la capatul de jos)
      const rampe = [];
      if (ce.rampa) {
        for (const kit of ["rampa_urcare", "rampa_coborare"]) {
          if (!numarare[kit]) continue;
          const rp = rampaPlan(kit, cat);
          const straturi = rp.straturi.map(s => ({ x0: cutie(s.c)[0] - rp.dx, z1: s.z1 }));
          rampe.push({
            nume: kit, L: P.rampa_lungime, latime: P.latime, H: (P.rampa_straturi + 1) * P.grosime, plat: P.rampa_plat,
            zSus: x => zRampa(x),
            inceputLa: z => { const x = straturi.filter(s => s.z1 > z + 1e-9).map(s => Math.max(0, s.x0)); return x.length ? Math.min(...x) : null; },
            santuri: rp.santuri.map(v => v.map(([x, y]) => [x - rp.dx, y])),
          });
        }
      }
      gcode = glob.TrenGCode.genereaza({ placi, calibrare, rampe, P, W, H, setari: optiuni.gcode || {} });
      fisiere.push(...gcode.fisiere);
    }
    return { placi, bucati, inPlus, necunoscute, fisiere, cat, gcode, limbi, faraLimba, printate, timp: Date.now() - t0, setari: P };
  }

  glob.TrenCNC = { IMPLICIT, genereaza, piesePrintate, stlCale, probaCuplaje, geometrie, catalog, limbaMacaz, proiectie, stlLimba, dxfLimba, stlTunel, stlPeron, stlOpritor, stlStalp, grameFilament, placaCalibrare, aseaza, scrieDxf, svgPlaca, zip, crc32, caleSvg, arcInfo, rampaPlan, stlRampa, zRampa, decaleaza,
    seteaza: s => { P = { ...IMPLICIT, ...(s || {}) }; }, parametri: () => P };
})(typeof globalThis !== "undefined" ? globalThis : window);
