/**
 * Roata cu palete din atelierul Easy 3Draw (ADR 0284, felia 3.Cj), pe plasele reale ale motorului:
 * - butucul roților (cu gaura din calibrare), paletele pornite din el, egal depărtate, până la diametrul cerut, și, la
 *   alegere, un disc pe fața de jos, care le ține;
 * - paletele sunt drepte (pe rază) sau curbate (arce de cerc, toate în aceeași parte, cu săgeata de o cincime din lungime);
 * - **paletele se numără pe plasă**: pe un cerc dintre butuc și vârf, la mijlocul lățimii, lemnul și golul alternează de
 *   atâtea ori câte palete sunt, iar fiecare paletă are grosimea de pe hârtie;
 * - se tipărește culcată, fără suport: de jos în sus, nimic nu stă în aer (paletele sunt pereți drepți).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { L, plasa, plin, cote, amprentaPlasei, muchiiFaraPereche, dinMotor, type P3, type Piesa } from './ajutor-plasa-lego.ts';

type Cote = { diam: number; palete: number; lat: number; forma: string; disc: string; gaura: string; butuc: number; grosime: number; lungime: number; sageata: number; discGros: number; incap: number };
const Lr = L as typeof L & { roataPaleteCote(d: Record<string, unknown>): Cote; prinderi(d: Record<string, unknown>): { fel: string; p: number[]; d: number[]; lung: number }[] };
const roata = (d: Record<string, unknown> = {}) => L.construieste({ tip: 'roataPalete', ...d });
const E = L.efective();
const r3 = (x: number) => Math.round(x * 1000) / 1000;
const inchisa = (p: Piesa, ce: string) => {
  const m = plasa(p.tri);
  assert.equal(m.deschise, 0, `${ce}: muchii deschise`); assert.equal(m.negative, 0, `${ce}: volume negative`);
  assert.equal(muchiiFaraPereche(p), 0, `${ce}: muchii fără pereche în STL`);
};
/** Lemn sau gol, la raza r și unghiul u (în jurul axului), la înălțimea z. */
const la = (p: Piesa, r: number, u: number, z: number) => plin(p, dinMotor(p, [r * Math.cos(u), r * Math.sin(u), z] as P3));
/** Bucățile de lemn de pe cercul de rază r, la înălțimea z: câte sunt și cât ține cea mai lată (mm, pe arc). */
function peCerc(p: Piesa, r: number, z: number): { bucati: number; lata: number } {
  const n = 7200, s = Array.from({ length: n }, (_, k) => la(p, r, 2 * Math.PI * (k + 0.5) / n, z));
  let bucati = 0, lata = 0, acum = 0;
  for (let k = 0; k < 2 * n; k++) {
    const a = s[k % n]!, inainte = s[(k + n - 1) % n]!;
    if (a && !inainte && k < n) bucati++;
    acum = a ? acum + 1 : 0;
    lata = Math.max(lata, Math.min(acum, n));
  }
  return { bucati, lata: lata * 2 * Math.PI * r / n };
}

test('motorul știe piesa, iar cea implicită are Ø64, 8 palete drepte, late de 15,8, cu un disc dedesubt și gaură de ax', () => {
  assert.ok(L.tipuri.includes('roataPalete'));
  const p = roata(), q = Lr.roataPaleteCote({});
  assert.deepEqual([q.diam, q.palete, q.lat, q.forma, q.disc, q.gaura], [64, 8, 15.8, 'drepte', 'unul', 'x']);
  assert.deepEqual([q.butuc, q.grosime, q.discGros, r3(q.lungime)], [4.8, 1.6, 1.2, 27.2]);
  assert.deepEqual(cote(p), [64, 64, 15.8]);
  assert.deepEqual(Array.from(p.baza, r3), [-32, -32, 0]);
  assert.equal(p.avert.length, 0);
  inchisa(p, 'implicită');
  assert.equal(amprentaPlasei(roata({ diam: 64, palete: 8, lat: 15.8, forma: 'drepte', disc: 'unul', gaura: 'x' })), amprentaPlasei(p));
});

test('paletele, numărate pe plasă: câte s-au cerut, egal depărtate, groase cât pe hârtie, de la butuc până la vârf', () => {
  for (const [diam, palete, lat] of [[64, 8, 15.8], [24, 4, 7.8], [40, 5, 10], [96, 12, 23.8], [160, 24, 40], [48, 7, 15.8]] as const) for (const forma of ['drepte', 'curbate']) {
    const p = roata({ diam, palete, lat, forma }), q = Lr.roataPaleteCote({ diam, palete, lat, forma }), ce = `Ø${diam}, ${palete} ${forma}, lată ${lat}`, R = diam / 2;
    inchisa(p, ce);
    assert.deepEqual([r3(p.dim[2]!), q.palete], [lat, palete], ce);
    // la mijlocul lățimii (peste disc), pe trei cercuri dintre butuc și vârf: atâtea bucăți de lemn câte palete
    for (const f of [0.25, 0.5, 0.9]) {
      const r = q.butuc + f * (R - q.butuc), c = peCerc(p, r, lat / 2);
      assert.equal(c.bucati, palete, `${ce}: la raza ${r.toFixed(1)}, ${c.bucati} palete`);
      // paleta dreaptă taie cercul pe grosimea ei; cea curbată, pieziș, cu ceva mai mult
      assert.ok(c.lata >= q.grosime - 0.05 && c.lata <= q.grosime * (forma === 'drepte' ? 1 : 1.5) + 0.05, `${ce}: la raza ${r.toFixed(1)}, paleta are ${c.lata.toFixed(2)} mm pe cerc`);
    }
    // dincolo de vârf nu mai e nimic; lângă butuc, paletele pornesc din el (nu rămâne gol între ele și butuc)
    assert.equal(peCerc(p, R + 0.3, lat / 2).bucati, 0, `${ce}: dincolo de vârf`);
    assert.equal(peCerc(p, q.butuc + 0.05, lat / 2).bucati, palete, `${ce}: paletele pornesc din butuc`);
    // egal depărtate: paleta k e la k · 360° / n de prima (pe cercul de la jumătate, unde paleta dreaptă e pe rază)
    if (forma === 'drepte') for (let k = 0; k < palete; k++) assert.equal(la(p, (q.butuc + R) / 2, 2 * Math.PI * k / palete, lat / 2), true, `${ce}: paleta ${k}`);
  }
});

test('paleta dreaptă stă pe rază, până la vârf; cea curbată trece prin punctul de pe hârtie, cu săgeata de o cincime din lungime', () => {
  const d = roata(), c = roata({ forma: 'curbate' }), q = Lr.roataPaleteCote({ forma: 'curbate' }), z = 8;
  // dreaptă: pe raza de la 0°, lemn de la butuc la vârf, pe ±0,8 mm; la 1 mm de rază, gol
  for (const r of [5, 12, 20, 28, 31.9]) {
    assert.equal(la(d, r, 0, z), true, `dreaptă: la raza ${r}`);
    assert.equal(plin(d, dinMotor(d, [r, 0.7, z] as P3)), true, `dreaptă: la 0,7 mm de rază, la ${r}`);
    assert.equal(plin(d, dinMotor(d, [r, 1.0, z] as P3)), false, `dreaptă: la 1 mm de rază, la ${r}`);
  }
  assert.equal(la(d, 32.3, 0, z), false);
  // curbată: capetele sunt aceleași (la butuc și la vârf, pe rază), mijlocul e împins într-o parte cu săgeata
  assert.equal(r3(q.sageata), r3(q.lungime / 5));
  const mij = (4.8 + 32) / 2;
  assert.equal(plin(c, dinMotor(c, [mij, q.sageata, z] as P3)), true, 'curbată: mijlocul arcului e la o săgeată de rază');
  assert.equal(plin(c, dinMotor(c, [mij, 0, z] as P3)), false, 'curbată: pe rază, la mijloc, e gol');
  assert.equal(plin(c, dinMotor(c, [mij, -q.sageata, z] as P3)), false, 'curbată: toate se curbează în aceeași parte');
  assert.equal(la(c, 31.5, 0, z), true, 'curbată: vârful e pe rază');
  assert.equal(la(c, 5.2, 0, z), true, 'curbată: pornește din butuc, pe rază');
  // și paleta a treia (la 90°) se curbează în aceeași parte, rotită cu ea
  assert.equal(plin(c, dinMotor(c, [-q.sageata, mij, z] as P3)), true, 'curbată: paleta de la 90°');
  // arcul, pe hârtie: prin (4,8; 0), (18,4; săgeata) și (32; 0), deci cu raza ρ = (c² / 4 + s²) / (2 · s) și centrul sub
  // coardă; la sferturile lui, lemn pe arc și gol la 1,1 mm de el, de amândouă părțile (paleta are 0,8 de fiecare parte)
  const cc = q.lungime, rho = (cc * cc / 4 + q.sageata ** 2) / (2 * q.sageata), th = Math.asin(cc / 2 / rho), uA = Math.PI / 2 + th, cy = q.sageata - rho;
  assert.equal(r3(rho), 19.72);
  for (const f of [0.25, 0.5, 0.75]) for (const [dr, lemn] of [[0, true], [0.6, true], [-0.6, true], [1.1, false], [-1.1, false]] as const) {
    const u = uA - 2 * th * f;
    assert.equal(plin(c, dinMotor(c, [mij + (rho + dr) * Math.cos(u), cy + (rho + dr) * Math.sin(u), z] as P3)), lemn, `curbată: la ${f} din arc, la ${dr} mm de el`);
  }
  // marginea de jos a paletei curbate pleacă din afara butucului; capătul paletei coboară de la ea pe rază, până în butuc:
  // lângă butuc, sub ea, e lemn (nu rămâne o crăpătură), iar dincolo de capăt e gol
  const jx = mij + (rho - 0.8) * Math.cos(uA), jy = cy + (rho - 0.8) * Math.sin(uA), uj = Math.atan2(jy, jx);
  assert.ok(Math.hypot(jx, jy) > 4.8 + 0.3, 'colțul de jos al paletei e în afara butucului');
  assert.equal(la(c, 4.9, uj + 0.02, z), true, 'curbată: sub marginea de jos, lângă butuc, e lemn');
  assert.equal(la(c, 4.9, uj - 0.03, z), false, 'curbată: dincolo de capătul paletei, lângă butuc, e gol');
  // fără disc, cutia e dată de vârfuri: la 8 palete cad pe axe, deci chiar diametrul (mijlocul vârfului e pe cercul roții)
  for (const forma of ['drepte', 'curbate']) assert.deepEqual(cote(roata({ forma, disc: 'fara' })).map(r3), [64, 64, 15.8], `fără disc, ${forma}`);
});

test('discul: pe fața de jos, de la butuc la vârf, gros de 1,2 mm; fără el, paletele țin doar de butuc', () => {
  const cu = roata(), fara = roata({ disc: 'fara' }), R = 32;
  inchisa(fara, 'fără disc');
  for (const r of [6, 15, 25, 31.5]) for (let g = 0; g < 360; g += 22.5) {
    const u = (g + 11) * Math.PI / 180;
    assert.equal(la(cu, r, u, 0.6), true, `cu disc: lemn între palete, la raza ${r}, ${g}°`);
    assert.equal(la(cu, r, u, 1.5), false, `cu disc: peste disc, între palete, gol (raza ${r}, ${g}°)`);
    assert.equal(la(fara, r, u, 0.6), false, `fără disc: gol între palete (raza ${r}, ${g}°)`);
  }
  assert.equal(la(cu, R + 0.3, 0.3, 0.6), false, 'discul nu trece de vârful paletelor');
  // discul pornește din butuc: nu rămâne un gol între ele
  for (let g = 0; g < 360; g += 45) assert.equal(la(cu, 4.95, (g + 20) * Math.PI / 180, 0.6), true, `discul lângă butuc, la ${g}°`);
  // amândouă au aceeași cutie (paletele ajung la vârf oricum) la un număr de palete care cade pe axe
  assert.deepEqual(cote(fara).map((x) => Math.round(x * 10) / 10), [64, 64, 15.8]);
  // fără suport: orice punct de lemn are lemn sub el până la masă (pe o coloană de sub fiecare paletă și sub butuc)
  for (const p of [cu, fara]) for (const r of [3.5, 10, 20, 30]) for (const z of [15, 10, 5, 2, 0.4]) assert.equal(la(p, r, 0, z), true, `coloana de la raza ${r}, z ${z}`);
});

test('butucul și gaura: de ax (crucea) sau rotundă, prin toată lățimea; prinderile ei', () => {
  for (const [gaura, fel] of [['x', 'gauraAx'], ['r', 'gauraStift']] as const) for (const lat of [7.8, 15.8]) {
    const p = roata({ gaura, lat }), ce = `${gaura} ${lat}`, ax = (x: number, y: number, z: number) => dinMotor(p, [x, y, z] as P3);
    inchisa(p, ce);
    for (const z of [0.3, lat / 2, lat - 0.3]) {
      assert.equal(plin(p, ax(0, 0, z)), false, `${ce}: axa e goală la z ${z}`);
      assert.equal(plin(p, ax(E.axGauraD! / 2 - 0.1, 0, z)), false, `${ce}: brațul / raza găurii`);
      assert.equal(plin(p, ax(1.6, 1.6, z)), gaura === 'x', `${ce}: diagonala`);
      // butucul: lemn până la 4,8 mm de ax, între palete (la 22,5° de prima)
      assert.equal(la(p, 4.5, Math.PI / 8, z), true, `${ce}: butucul, la z ${z}`);
    }
    assert.equal(la(p, 5.2, Math.PI / 8, lat / 2), false, `${ce}: dincolo de butuc, între palete`);
    const pr = Array.from(Lr.prinderi({ tip: 'roataPalete', gaura, lat }), (c) => [c.fel, Array.from(c.p, r3), Array.from(c.d), r3(c.lung)]);
    assert.deepEqual(pr, [[fel, [32, 32, lat], [0, 0, 1], lat], [fel, [32, 32, 0], [0, 0, -1], lat]], ce);
  }
});

test('marginile: diametrul 24–160, paletele 4–24, lățimea 4–40; ce iese din ele e adus înapoi și spus', () => {
  const q = (d: Record<string, unknown>) => { const c = Lr.roataPaleteCote(d); return [c.diam, c.palete, c.lat, c.forma, c.disc, c.gaura]; };
  assert.deepEqual(q({ diam: 10, palete: 2, lat: 1 }), [24, 4, 4, 'drepte', 'unul', 'x']);
  assert.deepEqual(q({ diam: 500, palete: 99, lat: 80 }), [160, 24, 40, 'drepte', 'unul', 'x']);
  assert.deepEqual(q({ diam: 50.26, palete: 6.4, lat: '12', forma: 'altceva', disc: 'altceva', gaura: 'altceva' }), [50.3, 6, 12, 'drepte', 'unul', 'x']);
  assert.deepEqual(q({ diam: null, palete: '', lat: true, forma: 'curbate', disc: 'fara', gaura: 'r' }), [64, 8, 15.8, 'curbate', 'fara', 'r']);
  assert.equal(roata({ diam: 24, palete: 4, lat: 4 }).avert.length, 0);
  assert.equal(roata({ diam: 160, palete: 24, lat: 40 }).avert.length, 0);
  assert.equal(roata({ diam: 10 }).avert.length, 1);
  assert.equal(roata({ diam: 500, palete: 99, lat: 80 }).avert.length, 3);
  assert.match(roata({ palete: 2 }).avert[0]!, /4/);
  assert.equal(amprentaPlasei(roata({ diam: 10 })), amprentaPlasei(roata({ diam: 24 })));
  // paletele mai groase la roțile mari: 2 % din diametru, cel puțin 1,6
  assert.deepEqual([24, 64, 80, 100, 160].map((diam) => Lr.roataPaleteCote({ diam }).grosime), [1.6, 1.6, 1.6, 2, 3.2]);
});

test('butucul crește cu paletele, cât să rămână 0,8 mm între ele lângă el; pe o roată mică încap mai puține, și motorul o spune', () => {
  const q = (d: Record<string, unknown>) => { const c = Lr.roataPaleteCote(d); return [c.palete, c.butuc, r3(c.lungime)]; };
  // pe hârtie: paleta dreaptă ține grosimea ei pe cercul butucului, cea curbată grosimea / cos θ, cu sin θ = 0,2 / 0,29
  const piezis = 1 / Math.sqrt(1 - (0.2 / 0.29) ** 2), sus = (x: number) => Math.ceil(x * 10 - 1e-9) / 10;
  assert.equal(r3(piezis), 1.381);
  assert.deepEqual(q({}), [8, 4.8, 27.2]);                                             // 8 · 2,4 / 2π = 3,06: butucul roților
  assert.deepEqual(q({ diam: 160, palete: 24 }), [24, sus(24 * (3.2 + 0.8) / (2 * Math.PI)), 64.7]);
  assert.equal(q({ diam: 160, palete: 24 })[1], 15.3);
  assert.equal(q({ diam: 160, palete: 24, forma: 'curbate' })[1], 20);                 // 24 · (3,2 · 1,381 + 0,8) / 2π = 19,94
  assert.equal(q({ diam: 160, palete: 4 })[1], 8);                                     // 2,5 grosimi
  assert.equal(q({ diam: 100, palete: 4 })[1], 5);
  assert.equal(q({ diam: 64, palete: 24 })[1], 9.2);                                   // 24 · 2,4 / 2π = 9,17
  // butucul nu trece de jumătatea razei: la Ø24 încap π · 12 / 2,4 = 15 palete drepte și π · 12 / 3,01 = 12 curbate
  assert.deepEqual(q({ diam: 24, palete: 24 }), [15, 5.8, 6.2]);
  assert.deepEqual(q({ diam: 24, palete: 24, forma: 'curbate' }), [12, 5.8, 6.2]);
  assert.deepEqual(q({ diam: 36, palete: 24 }), [23, 8.8, 9.2]);
  assert.deepEqual(q({ diam: 38, palete: 24 }), [24, 9.2, 9.8]);
  assert.deepEqual([{}, { diam: 24 }, { diam: 24, forma: 'curbate' }, { diam: 32, forma: 'curbate' }, { diam: 36 }, { diam: 38 }].map((d) => Lr.roataPaleteCote(d).incap), [24, 15, 12, 16, 23, 24]);
  // un număr cu zecimale e rotunjit, fără mesaj (e în margini)
  assert.equal(roata({ palete: 6.4 }).avert.length, 0);
  assert.equal(Lr.roataPaleteCote({ palete: 6.4 }).palete, 6);
  const a = roata({ diam: 24, palete: 24 }).avert;
  assert.equal(a.length, 1);
  assert.match(a[0]!, /încap cel mult 15 palete/);
  assert.equal(roata({ diam: 24, palete: 15 }).avert.length, 0);
  assert.equal(roata({ diam: 24, palete: 16 }).avert.length, 1);
  // cerute prea multe și peste margine: un singur mesaj, cel care spune de ce (diametrul)
  assert.match(roata({ diam: 24, palete: 99 }).avert[0]!, /încap cel mult 15/);
  assert.equal(roata({ diam: 24, palete: 99 }).avert.length, 1);
  assert.match(roata({ diam: 64, palete: 99 }).avert[0]!, /între 4 și 24/);
});

test('pe toată plaja: plasa e închisă, gaura rămâne liberă, paletele sunt câte s-au cerut și țin de butuc', () => {
  let k = 0;
  for (const diam of [24, 27.5, 33, 37, 52, 88, 120, 160]) for (const palete of [4, 9, 15, 24]) for (const forma of ['drepte', 'curbate']) {
    const gaura = k++ % 2 ? 'r' : 'x', d = { diam, palete, forma, gaura, lat: 6, disc: k % 3 ? 'unul' : 'fara' };
    const p = roata(d), q = Lr.roataPaleteCote(d), ce = `Ø${diam}, ${palete} cerute, ${forma}, gaura ${gaura}`, R = diam / 2;
    inchisa(p, ce);
    // gaura: capetele brațelor crucii (sau marginea cercului), pe toată înălțimea, sunt goale
    const g = gaura === 'x' ? [E.axGauraD! / 2 - 0.1, E.axGauraLat! / 2 - 0.1] as const : [E.gauraD! / 2 * Math.SQRT1_2 - 0.1, E.gauraD! / 2 * Math.SQRT1_2 - 0.1] as const;
    for (const [x, y] of [[g[0], g[1]], [g[0], -g[1]], [-g[0], g[1]], [-g[0], -g[1]], [g[1], g[0]], [g[1], -g[0]], [-g[1], g[0]], [-g[1], -g[0]]] as const)
      for (const z of [0.3, 3, 5.7]) assert.equal(plin(p, dinMotor(p, [x, y, z] as P3)), false, `${ce}: gaura, la ${x.toFixed(2)}, ${y.toFixed(2)}, z ${z}`);
    // paletele, numărate la mijlocul lor și lângă butuc (peste disc); dincolo de vârf, nimic
    assert.equal(peCerc(p, (q.butuc + R) / 2, 3).bucati, q.palete, `${ce}: paletele, la mijloc`);
    assert.equal(peCerc(p, q.butuc + 0.05, 3).bucati, q.palete, `${ce}: paletele, lângă butuc`);
    assert.equal(peCerc(p, R + 0.05, 3).bucati, 0, `${ce}: dincolo de vârf`);
    assert.equal(peCerc(p, R - 0.05, 3).bucati, q.palete, `${ce}: vârfurile`);
    // butucul e întreg sub fața lui (paletele nu-l rup)
    assert.equal(peCerc(p, q.butuc - 0.1, 3).lata > 2 * Math.PI * (q.butuc - 0.1) - 0.01, true, `${ce}: butucul`);
    // cutia: cu disc, chiar diametrul; fără, vârfurile paletelor (cel mai departe de o axă, la jumătatea unghiului dintre două)
    const mic = d.disc === 'unul' ? diam - 1e-6 : R * (1 + Math.cos(Math.PI / q.palete)) - 1e-6;
    for (const x of [p.dim[0]!, p.dim[1]!]) assert.ok(x <= diam + 1e-6 && x >= mic, `${ce}: cutia ${p.dim}`);
  }
});
