// (e) continuare: remediul R3 aplicat DUPA FIECARE operatie (arhitectura propusa): PathKit da topologia,
// geometria se re-ancoreaza pe primitivele exacte (double) ale intrarilor. Masuram abaterea finala si cate segmente
// raman nepotrivite / ambigue pe parcursul celor 100 de operatii.
import fs from 'node:fs';
const src0 = fs.readFileSync(new URL('./t-e-deriva.mjs', import.meta.url), 'utf8');
const cut = src0.indexOf('// ---------- rulare ----------');
fs.writeFileSync(new URL('./_e-func.mjs', import.meta.url), src0.slice(0, cut) + '\nexport { makeChain, srcContour, toPK, fromPK, Pk, sdf, primitivesOf, intersectPrims, PK, measure, maxGapK };\n');
const M = await import('./_e-func.mjs');
const { reanchorR3 } = await import('./remediu-r3.mjs');
const out = [];
for (const [nume, X0, Y0, W, H] of [['placa 2440 (0..2440)', 0, 0, 2440, 1220], ['detaliu 100 mm', 0, 0, 100, 50]]) {
  const src = M.makeChain(777, X0, Y0, W, H, 100);
  let region = [M.srcContour(src[0])]; let nep = 0, amb = 0, fara = 0; const t0 = performance.now();
  for (let i = 1; i <= 100; i++) {
    const a = M.toPK(region), b = M.toPK([M.srcContour(src[i])]);
    const r = M.PK.MakeFromOp(a, b, i % 2 ? M.PK.PathOp.UNION : M.PK.PathOp.DIFFERENCE);
    const f = M.fromPK(r); a.delete(); b.delete(); r.delete();
    const R = reanchorR3(f.region, M.primitivesOf(src, i), 1e-3, M.Pk, M.intersectPrims);
    nep += R.st.nepotrivite; amb += R.st.ambigue; fara += R.st.varfuriFaraIntersectie; region = R.region;
  }
  const ms = performance.now() - t0;
  const m = M.measure(src, 100, region, Math.max(W, H));
  const rec = { scenariu: nume, ms, nepotriviteCumulat: nep, ambigueCumulat: amb, varfuriFaraIntersectieCumulat: fara, golMax: M.maxGapK(region), ...m };
  out.push(rec);
  console.log(`${nume}: R3 dupa fiecare operatie, ${ms.toFixed(0)} ms | abatere frontiera ${m.abatereFrontiera.toExponential(2)} | adevar->iesire ${m.adevarIesire.toExponential(2)} | gol ${rec.golMax.toExponential(2)} | nepotrivite ${nep}, ambigue ${amb}, varfuri fara intersectie ${fara} (cumulat pe 100 op.) | ${m.arce} arce, ${m.linii} linii, ${m.conice} conice`);
}
fs.writeFileSync(new URL('./rez-e2-reancorare-continua.json', import.meta.url), JSON.stringify(out, null, 1));
fs.unlinkSync(new URL('./_e-func.mjs', import.meta.url));
