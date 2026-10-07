// T8: viteza relativa pe un document de 1 000 de forme (mediana din N repetari, in acelasi proces).
import { circle, rrect } from './geom.mjs';
import { areaRegion } from './oracol.mjs';
import * as AD from './adaptoare.mjs';

export function doc1000() {
  const rows = [];
  for (let r = 0; r < 25; r++) {
    const row = [];
    for (let c = 0; c < 40; c++) {
      const x = c * 22, y = r * 40;
      row.push(c % 2 === 0 ? [rrect(x, y, 30, 20, 4, 0.2 * ((r + c) % 3))] : [circle(x, y, 10)]);
    }
    rows.push(row);
  }
  return rows;
}

function median(a) { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; }

export function runSpeed({ reps = 5, libs } = {}) {
  libs = libs || [AD.cavalier, AD.flatten, AD.makerjs, AD.paperjs, { ...AD.skia, offset: (r, d) => AD.skia.offset(r, d, { precision: 100 }) }, AD.makeClipper(0.001, 0), AD.makeClipper(0.01, 0)];
  const rows = doc1000();
  const out = [];
  for (const L of libs) {
    const tOff = [], tUni = [];
    let errOff = 0, errUni = 0, entOff = 0, areaUni = 0;
    for (let k = 0; k < reps; k++) {
      // 1 000 de offseturi de +3 mm
      let t0 = performance.now(); entOff = 0; errOff = 0;
      for (const row of rows) for (const sh of row) { try { const o = L.offset(sh, 3); for (const c of o) entOff += c.segs.length; } catch { errOff++; } }
      tOff.push(performance.now() - t0);
      // 975 de reuniuni: pe fiecare rand, pliere secventiala (fiecare forma o atinge pe urmatoarea)
      t0 = performance.now(); errUni = 0; areaUni = 0;
      for (const row of rows) {
        let acc = row[0];
        for (let i = 1; i < row.length; i++) { try { acc = L.bool(acc, row[i], 'union'); } catch { errUni++; } }
        areaUni += acc.reduce((s, c) => s + Math.abs(areaRegion([c])), 0);
      }
      tUni.push(performance.now() - t0);
      if (performance.now() - t0 > 20000) break; // biblioteca prea lenta: o singura repetare
    }
    out.push({ lib: L.nume, offset1000_ms: median(tOff), unire975_ms: median(tUni), repetari: tOff.length, entitatiOffset: entOff, erori: errOff + errUni, ariaReuniunilor: areaUni });
  }
  return out;
}
