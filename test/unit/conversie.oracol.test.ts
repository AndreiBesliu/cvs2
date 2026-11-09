/**
 * Conversia vectorilor (ADR 0180 §8, §10, §11; felia 10.3↑d), judecată de oracolul independent (`test/oracles/taiere.ts`,
 * `judecaConversia`) pe corpusuri din sămânță, cu documentul de după trecut prin ușă:
 * - **Arce:** cubice închise și deschise, poligoane regulate, arce de linii, amestecuri cu colțuri, sub matrici de element
 *   oarecare (rotite, scalate uniform, oglindite) și instanțe rotite: formele schimbate n-au cubice și stau la cel mult
 *   toleranța de cele vechi (Hausdorff măsurat din nou); un poligon regulat devine arce exact când săgeata lui încape în
 *   toleranță; un element întins neuniform se sare.
 * - **Doar dacă e:** poligoane regulate (cerc exact când săgeata încape: raza, cea a cercului prin noduri), cercuri din arce și
 *   din cubice, pătrate, dreptunghiuri rotite, cu și fără colțuri rotunjite, trapeze: cercul și dreptunghiul la cel mult
 *   toleranța; pătratele nu devin cercuri, trapezele nu devin dreptunghiuri, la nicio toleranță.
 * - **Cu mărimea dată:** formele corpusurilor tăierii (cu inelele lor): fiecare contur închis devine cercul / dreptunghiul cerut,
 *   cu centrul în centrul cutiei lui (la ±0,001), căile deschise rămân.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { is } from 'valibot';
import { converteste, type CerereConversie } from '../../src/model/conversie.ts';
import type { Document, FormaDoc, Instanta, Piesa, VarfDoc } from '../../src/model/document.ts';
import { executa, istoricNou, type Comanda } from '../../src/model/jurnal.ts';
import { SchemaDocument } from '../../src/model/schemaDocument.ts';
import { cerculFormei, formeInstanta, hausdorff, judecaConversia, type FormaOracol } from '../oracles/taiere.ts';
import { docDin } from './ajutor-document.ts';
import { aleator, document, formaCorpus, GENERATORI, intre, stoc } from './ajutor-taiere.ts';

type P = { readonly x: number; readonly y: number };
type Mat = { readonly a: number; readonly b: number; readonly c: number; readonly d: number; readonly e: number; readonly f: number };
const L = { tip: 'L' } as const;

/** O formă ca piesă cu instanța ei: matricea elementului dată, instanța la (x, y), rotită. */
function piesa(id: string, forma: FormaDoc, m: Mat, x: number, y: number, rotire: number): { readonly piesa: Piesa; readonly instanta: Instanta } {
  const d = docDin(stoc, { id, forma, matrice: { ...m, e: x, f: y } });
  return { piesa: d.piese[0] as Piesa, instanta: { ...(d.foi[0]?.instante[0] as Instanta), rotire } };
}

/** O matrice de element: rotire, scară uniformă, uneori oglindită; cu `neuniform`, întinsă mai mult pe o axă. */
function matrice(r: () => number, neuniform = false): Mat {
  const u = intre(r, 0, 2 * Math.PI), s = intre(r, 0.5, 2.5), o = r() < 0.25 ? -1 : 1;
  const sy = neuniform ? s * intre(r, 1.3, 2) : s;
  return { a: s * Math.cos(u), b: s * Math.sin(u), c: -sy * o * Math.sin(u), d: sy * o * Math.cos(u), e: 0, f: 0 };
}

const scaraDe = (m: Mat): number => Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
const rotiri = [0, 90, 180, 270] as const;

/** Poligonul regulat cu n laturi, înscris în cercul de rază R, ca o cale (închisă sau un arc de `baleiaj` radiani, deschis). */
function regulat(n: number, R: number, u0: number, baleiaj = 2 * Math.PI): FormaDoc {
  const inchis = baleiaj >= 2 * Math.PI;
  const k = inchis ? n : n + 1;
  return { tip: 'cale', inchis, varfuri: Array.from({ length: k }, (_, i): VarfDoc => ({ p: { x: R * Math.cos(u0 + (baleiaj * i) / n), y: R * Math.sin(u0 + (baleiaj * i) / n) }, s: L })) };
}

/** Un cerc de rază R din k arce (capetele oarecare pe cerc). */
function cercDinArce(r: () => number, k: number, R: number): FormaDoc {
  const u = Array.from({ length: k }, (_, i) => (2 * Math.PI * (i + intre(r, 0.1, 0.9))) / k);
  return {
    tip: 'cale', inchis: true,
    varfuri: u.map((x, i): VarfDoc => {
      const urm = i === k - 1 ? (u[0] as number) + 2 * Math.PI : (u[i + 1] as number);
      return { p: { x: R * Math.cos(x), y: R * Math.sin(x) }, s: { tip: 'A', bulge: Math.tan((urm - x) / 4) } };
    }),
  };
}

/** Un cerc de rază R din patru cubice (mânerele la 0,5523·R): se abate de cerc cu ~2,7e-4·R. */
function cercDinCubice(R: number): FormaDoc {
  const k = 0.5522847498 * R;
  const p = [{ x: R, y: 0 }, { x: 0, y: R }, { x: -R, y: 0 }, { x: 0, y: -R }];
  const t = [{ x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }, { x: 1, y: 0 }];
  return {
    tip: 'cale', inchis: true,
    varfuri: p.map((q, i): VarfDoc => {
      const b = p[(i + 1) % 4] as P, tq = t[i] as P, tb = t[(i + 1) % 4] as P;
      return { p: q, s: { tip: 'C', c1: { x: q.x + k * tq.x, y: q.y + k * tq.y }, c2: { x: b.x - k * tb.x, y: b.y - k * tb.y } } };
    }),
  };
}

/** Un dreptunghi w × h ca o cale (colțurile rotunjite cu raza rc, prin arce de 90°), cu primul vârf oarecare pe drum. */
function dreptunghiCale(w: number, h: number, rc: number, start: number): FormaDoc {
  const q = Math.tan(Math.PI / 8);
  const v: VarfDoc[] = rc === 0
    ? [[0, 0], [w, 0], [w, h], [0, h]].map(([x, y]): VarfDoc => ({ p: { x: x as number, y: y as number }, s: L }))
    : ([[rc, 0, false], [w - rc, 0, true], [w, rc, false], [w, h - rc, true], [w - rc, h, false], [rc, h, true], [0, h - rc, false], [0, rc, true]] as const)
      .map(([x, y, a]): VarfDoc => ({ p: { x, y }, s: a ? { tip: 'A', bulge: q } : L }));
  const s = start % v.length;
  return { tip: 'cale', inchis: true, varfuri: [...v.slice(s), ...v.slice(0, s)] };
}

/** Un trapez: baza w, vârful w − 2·d, înălțimea h. */
function trapez(w: number, h: number, d: number): FormaDoc {
  return { tip: 'cale', inchis: true, varfuri: [[0, 0], [w, 0], [w - d, h], [d, h]].map(([x, y]): VarfDoc => ({ p: { x: x as number, y: y as number }, s: L })) };
}

/** Conversia aplicată ca de acțiune (un lot de `inlocuieste-piesa`), cu documentul de după trecut prin ușă. */
function aplica(d: Document, piese: readonly Piesa[], mesaj: string): Document {
  const vechi = new Map(d.piese.map((p) => [p.id, p]));
  const comenzi: Comanda[] = piese.map((p) => ({ tip: 'inlocuieste-piesa', vechi: vechi.get(p.id) as Piesa, nou: p }));
  const dupa = executa(istoricNou(d), { tip: 'lot', comenzi }).doc;
  assert.ok(is(SchemaDocument, JSON.parse(JSON.stringify(dupa))), `${mesaj}: documentul de după trece de ușă`);
  return dupa;
}

/** Conversia unei singure forme, judecată: rezultatul aplicației, formele înainte și după și judecata oracolului. */
function judeca(f: { readonly piesa: Piesa; readonly instanta: Instanta }, c: CerereConversie, mesaj: string) {
  const d = document([f]);
  const r = converteste(d, c);
  assert.ok(r.ok, `${mesaj}: refuzat`);
  const inainte = formeInstanta(d, f.instanta.id);
  const dupa = r.piese.length > 0 ? formeInstanta(aplica(d, r.piese, mesaj), f.instanta.id) : inainte;
  const j = judecaConversia({
    inainte, dupa, fel: c.fel, toleranta: c.toleranta,
    diametru: c.fel === 'cerc' ? c.diametru : null, marime: c.fel === 'dreptunghi' ? c.marime : null,
  });
  assert.deepEqual(j.rau, [], mesaj);
  assert.equal(j.schimbate, r.convertite, `${mesaj}: formele schimbate, numărate`);
  // Aplicația nu spune o abatere mai mică decât cea măsurată de oracol (și nici una peste toleranță).
  assert.ok(j.abatere <= r.abatere + 1e-6, `${mesaj}: abaterea măsurată ${j.abatere}, spusă ${r.abatere}`);
  assert.ok(r.abatere <= c.toleranta + 1e-9 || j.schimbate === 0 || (c.fel === 'cerc' && c.diametru !== null) || (c.fel === 'dreptunghi' && c.marime !== null), `${mesaj}: abaterea spusă ${r.abatere}`);
  return { r, inainte, dupa, j };
}

test('arce, pe corpusul din sămânță: fără cubice, la cel mult toleranța (Hausdorff din nou); poligonul regulat după săgeata lui; întinsul neuniform, sărit', () => {
  const r = aleator(0x10_3d_a1);
  const n = { cubice: 0, regulate: 0, regulateArce: 0, neuniform: 0, cuLinii: 0, amestec: 0 };
  for (let caz = 0; caz < 70; caz++) {
    const id = `a${caz}`;
    const fel = ['cubice', 'curba', 'regulat', 'arc-linii', 'amestec', 'neuniform'][Math.floor(r() * 6)] as string;
    const tol = Math.exp(intre(r, Math.log(0.003), Math.log(0.3)));
    const linii = fel === 'regulat' || fel === 'arc-linii' ? r() < 0.8 : r() < 0.6;
    const m = matrice(r, fel === 'neuniform');
    const s = scaraDe(m);
    let forma: FormaDoc;
    let sageata: number | null = null;
    if (fel === 'cubice' || fel === 'neuniform') forma = (GENERATORI.cubice as (r: () => number) => FormaDoc)(r);
    else if (fel === 'curba') forma = (GENERATORI.curba as (r: () => number) => FormaDoc)(r);
    else if (fel === 'regulat' || fel === 'arc-linii') {
      // k laturi pe cercul R (tot cercul, sau un arc deschis de cel mult 166°): fiecare latură vede unghiul β / k din centru,
      // iar săgeata ei, în lume, e s·R·(1 − cos(β / 2k)); o întoarcere de β / k ≤ 360° / 13 nu e un colț.
      const k = 13 + Math.floor(r() * 84), R = intre(r, 5, 60), beta = fel === 'regulat' ? 2 * Math.PI : intre(r, 0.5, 2.9);
      forma = regulat(k, R, intre(r, 0, 2 * Math.PI), beta);
      sageata = s * R * (1 - Math.cos(beta / (2 * k)));
    } else {
      // Un amestec: o cubică, un șir de linii pe un cerc, un colț, o linie lungă.
      const R = intre(r, 20, 40);
      const arc = Array.from({ length: 9 }, (_, i): VarfDoc => ({ p: { x: 60 + R * Math.cos(Math.PI / 2 - (i * Math.PI) / 16), y: R * Math.sin(Math.PI / 2 - (i * Math.PI) / 16) }, s: L }));
      forma = {
        tip: 'cale', inchis: r() < 0.5,
        varfuri: [
          { p: { x: 0, y: 0 }, s: { tip: 'C', c1: { x: 15, y: intre(r, 10, 40) }, c2: { x: 45, y: intre(r, 10, 40) } } },
          { p: { x: 60, y: R }, s: L },
          ...arc.slice(1),
          { p: { x: 60, y: -40 }, s: L },
          { p: { x: -10, y: -40 }, s: L },
        ],
      };
    }
    const f = piesa(id, forma, m, intre(r, 300, 700), intre(r, 300, 700), rotiri[Math.floor(r() * 4)] as number);
    const mesaj = `cazul ${caz} (${fel}, toleranța ${tol.toFixed(4)}, ${linii ? 'cu' : 'fără'} linii, scara ${s.toFixed(3)})`;
    const { r: rez, j } = judeca(f, { fel: 'arce', alese: [id], toleranta: tol, linii }, mesaj);
    if (fel === 'neuniform') {
      assert.equal(rez.piese.length, 0, `${mesaj}: întins neuniform, neschimbat`);
      assert.equal(rez.sarite, 1, `${mesaj}: sărit`);
      n.neuniform++;
      continue;
    }
    if (fel === 'cubice' || fel === 'curba') { assert.equal(j.schimbate, 1, `${mesaj}: cubicele se schimbă`); n.cubice++; }
    if (fel === 'amestec') { assert.equal(j.schimbate, 1, `${mesaj}: amestecul se schimbă`); n.amestec++; }
    if (sageata !== null) {
      n.regulate++;
      // Săgeata laturii față de cercul prin vârfuri: arcele, exact când încape în toleranță.
      if (!linii) assert.equal(j.schimbate, 0, `${mesaj}: fără „și liniile”, poligonul rămâne`);
      else if (sageata <= tol * (1 - 1e-6)) { assert.equal(j.schimbate, 1, `${mesaj}: săgeata ${sageata} încape`); n.regulateArce++; }
      else if (sageata >= tol * (1 + 1e-6)) assert.equal(j.schimbate, 0, `${mesaj}: săgeata ${sageata} nu încape`);
      if (linii) n.cuLinii++;
    }
  }
  assert.ok(n.cubice >= 15 && n.regulate >= 15 && n.regulateArce >= 5 && n.neuniform >= 5 && n.amestec >= 5 && n.cuLinii >= 10, JSON.stringify(n));
});

test('doar dacă e: cerc și dreptunghi la cel mult toleranța; poligonul regulat după săgeată, prin noduri; pătratul și trapezul refuzate', () => {
  const r = aleator(0x10_3d_c2);
  const n = { regulat: 0, regulatCerc: 0, arce: 0, cubice: 0, patrat: 0, dreptunghi: 0, rotunjit: 0, trapez: 0 };
  for (let caz = 0; caz < 90; caz++) {
    const id = `c${caz}`;
    const fel = ['regulat', 'arce', 'cubice', 'patrat', 'dreptunghi', 'rotunjit', 'trapez'][Math.floor(r() * 7)] as string;
    const tol = Math.exp(intre(r, Math.log(0.002), Math.log(1)));
    const m = matrice(r);
    const s = scaraDe(m);
    let forma: FormaDoc;
    let R = 0, k = 0;
    if (fel === 'regulat') { k = 8 + Math.floor(r() * 120); R = intre(r, 3, 40); forma = regulat(k, R, intre(r, 0, 2 * Math.PI)); }
    else if (fel === 'arce') { R = intre(r, 2, 40); forma = cercDinArce(r, 2 + Math.floor(r() * 5), R); }
    else if (fel === 'cubice') { R = intre(r, 2, 40); forma = cercDinCubice(R); }
    else if (fel === 'patrat') { const l = intre(r, 10, 60); forma = dreptunghiCale(l, l, 0, Math.floor(r() * 4)); }
    else if (fel === 'dreptunghi') forma = dreptunghiCale(intre(r, 5, 80), intre(r, 5, 80), 0, Math.floor(r() * 4));
    else if (fel === 'rotunjit') { const w = intre(r, 10, 80), h = intre(r, 10, 80); forma = dreptunghiCale(w, h, intre(r, 0.5, 0.45 * Math.min(w, h)), Math.floor(r() * 8)); }
    // Laturile oblice ale trapezului se apropie cu 2·d pe înălțime: orice dreptunghi se abate de el cu cel puțin d·s / 2 ≥ 1,5 mm.
    else forma = trapez(intre(r, 30, 80), intre(r, 20, 60), intre(r, 6, 14));
    const latura = fel === 'patrat' && forma.tip === 'cale' ? Math.hypot((forma.varfuri[1]?.p.x ?? 0) - (forma.varfuri[0]?.p.x ?? 0), (forma.varfuri[1]?.p.y ?? 0) - (forma.varfuri[0]?.p.y ?? 0)) : 0;
    const f = piesa(id, forma, m, intre(r, 300, 700), intre(r, 300, 700), rotiri[Math.floor(r() * 4)] as number);
    for (const ce of ['cerc', 'dreptunghi'] as const) {
      const mesaj = `cazul ${caz} (${fel}, ${ce}, toleranța ${tol.toFixed(4)}, scara ${s.toFixed(3)})`;
      const c: CerereConversie = ce === 'cerc' ? { fel: 'cerc', alese: [id], toleranta: tol, diametru: null } : { fel: 'dreptunghi', alese: [id], toleranta: tol, marime: null };
      const { r: rez, dupa, j } = judeca(f, c, mesaj);
      if (ce === 'cerc') {
        if (fel === 'regulat') {
          const sageata = s * R * (1 - Math.cos(Math.PI / k));
          if (sageata <= tol * (1 - 1e-6)) {
            assert.equal(j.schimbate, 1, `${mesaj}: săgeata ${sageata} încape`);
            // Cercul trece prin noduri (răspunsul 5a): raza lui e raza poligonului.
            const cerc = cerculFormei(dupa[0] as FormaOracol);
            assert.ok(cerc && Math.abs(cerc.r - s * R) <= 1e-6 * s * R, `${mesaj}: raza ${cerc?.r}, nu ${s * R}`);
            assert.ok(Math.abs(j.abatere - sageata) <= 1e-6 * Math.max(1, s * R), `${mesaj}: abaterea ${j.abatere}, săgeata ${sageata}`);
            n.regulatCerc++;
          } else if (sageata >= tol * (1 + 1e-6)) {
            assert.equal(j.schimbate, 0, `${mesaj}: săgeata ${sageata} nu încape`);
            assert.ok(rez.abatereMinima !== null && Math.abs(rez.abatereMinima - sageata) <= 1e-6 * Math.max(1, s * R), `${mesaj}: abaterea spusă ${rez.abatereMinima}, săgeata ${sageata}`);
          }
          n.regulat++;
        }
        if (fel === 'arce') { assert.equal(j.schimbate, 1, `${mesaj}: cercul din arce`); n.arce++; }
        if (fel === 'cubice' && 2.8e-4 * s * R <= tol) { assert.equal(j.schimbate, 1, `${mesaj}: cercul din cubice`); n.cubice++; }
        // Un pătrat de latură l (în lume) se abate de orice cerc cu cel puțin (l/√2 − l/2) / 2 ≈ 0,1036·l.
        if (fel === 'patrat' && 0.1 * s * latura > tol) assert.equal(j.schimbate, 0, `${mesaj}: un pătrat de ${s * latura} nu e cerc`);
      } else {
        if (fel === 'patrat' || fel === 'dreptunghi' || fel === 'rotunjit') {
          assert.equal(j.schimbate, 1, `${mesaj}: e dreptunghi`);
          assert.ok(j.abatere <= 1e-6, `${mesaj}: abaterea ${j.abatere}`);
          if (fel === 'patrat') n.patrat++; else if (fel === 'dreptunghi') n.dreptunghi++; else n.rotunjit++;
        }
        if (fel === 'trapez') { assert.equal(j.schimbate, 0, `${mesaj}: un trapez nu e dreptunghi`); n.trapez++; }
      }
    }
  }
  assert.ok(n.regulat >= 8 && n.regulatCerc >= 3 && n.arce >= 8 && n.cubice >= 3 && n.patrat >= 8 && n.dreptunghi >= 8 && n.rotunjit >= 8 && n.trapez >= 8, JSON.stringify(n));
});

test('cu mărimea dată, pe corpusul tăierii: fiecare contur închis devine cercul / dreptunghiul cerut, cu centrul în centrul cutiei lui', () => {
  const r = aleator(0x10_3d_d3);
  let cercuri = 0, dreptunghiuri = 0, deschise = 0;
  for (let caz = 0; caz < 60; caz++) {
    const id = `m${caz}`;
    const f = formaCorpus(r, id, intre(r, 250, 750), intre(r, 250, 750));
    const ce = r() < 0.5 ? 'cerc' : 'dreptunghi';
    const c: CerereConversie = ce === 'cerc'
      ? { fel: 'cerc', alese: [id], toleranta: 0.1, diametru: intre(r, 1, 30) }
      : { fel: 'dreptunghi', alese: [id], toleranta: 0.1, marime: { latime: intre(r, 1, 60), inaltime: intre(r, 1, 60) } };
    // Fără găurire (care cere un cerc), ca dreptunghiul să se poată face.
    const { r: rez, inainte } = judeca(f, c, `cazul ${caz} (${ce})`);
    const inchise = inainte.filter((x) => x.inchis).length;
    assert.equal(rez.convertite, inchise, `cazul ${caz}: toate contururile închise`);
    assert.equal(rez.sarite, inainte.length - inchise, `cazul ${caz}: căile deschise, sărite`);
    if (inchise < inainte.length) deschise++;
    if (ce === 'cerc') cercuri += inchise; else dreptunghiuri += inchise;
  }
  assert.ok(cercuri >= 20 && dreptunghiuri >= 20 && deschise >= 5, `cercuri ${cercuri}, dreptunghiuri ${dreptunghiuri}, cu căi deschise ${deschise}`);
});

test('martorul oracolului conversiei: o abatere peste toleranță, o cubică rămasă, un centru mutat, un ne-dreptunghi sunt prinse', () => {
  const d = document([piesa('w', regulat(64, 50, 0), { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }, 500, 500, 0)]);
  const rez = converteste(d, { fel: 'cerc', alese: ['w'], toleranta: 0.1, diametru: null });
  assert.ok(rez.ok && rez.piese.length === 1);
  const inainte = formeInstanta(d, 'w'), dupa = formeInstanta(aplica(d, rez.piese, 'martor'), 'w');
  const j = (x: readonly FormaOracol[], fel: 'arce' | 'cerc' | 'dreptunghi', toleranta = 0.1, extra: object = {}): string[] =>
    judecaConversia({ inainte, dupa: x, fel, toleranta, ...extra }).rau;
  assert.deepEqual(j(dupa, 'cerc'), []);
  assert.notDeepEqual(j(dupa, 'cerc', 0.05), [], 'săgeata 0,0602 peste toleranța 0,05');
  const mare = formeInstanta(document([piesa('w', { tip: 'cerc', raza: 50.2 }, { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }, 500, 500, 0)]), 'w');
  assert.notDeepEqual(j(mare, 'cerc'), [], 'un cerc cu 0,2 mai mare');
  assert.notDeepEqual(j(inainte.map((x) => ({ ...x, seg: [...x.seg.slice(1), x.seg[0]] })) as FormaOracol[], 'cerc'), [], 'poligonul, nu un cerc');
  const cub = formeInstanta(document([piesa('w', cercDinCubice(50), { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }, 500, 500, 0)]), 'w');
  assert.notDeepEqual(judecaConversia({ inainte, dupa: cub, fel: 'arce', toleranta: 0.1 }).rau, [], 'o cubică rămasă');
  assert.deepEqual(j(dupa, 'cerc', 0.1, { diametru: 100 }), [], 'cu diametrul dat 100, cercul prin noduri e chiar cel cerut');
  assert.notDeepEqual(j(dupa, 'cerc', 0.1, { diametru: 99 }), [], 'diametrul 100, nu 99');
  const mutat = formeInstanta(document([piesa('w', { tip: 'cerc', raza: 4 }, { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }, 500.01, 500, 0)]), 'w');
  assert.notDeepEqual(j(mutat, 'cerc', 0.1, { diametru: 8 }), [], 'centrul mutat cu 0,01');
  assert.notDeepEqual(j(dupa, 'dreptunghi'), [], 'un cerc nu e dreptunghi');
  assert.ok(hausdorff(inainte[0] as FormaOracol, dupa[0] as FormaOracol) > 0.06 && hausdorff(inainte[0] as FormaOracol, dupa[0] as FormaOracol) < 0.0603);
});
