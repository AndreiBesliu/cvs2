/**
 * Măsurătoarea reliefului mare (ADR 0323, felia 18.1↑h): un relief sintetic de N × N celule de 0,1 mm (sinusuri, 0,5 … 5,5 mm),
 * cu timpul și memoria fiecărei piese grele, într-un singur proces Node, pe drumul aplicației: stratul din grilă (dalele, harta),
 * dalele citite înapoi, compusul, desenul (redus, umbrit), PNG-ul pe 16 biți, degroșarea (plată Ø6, pasul lateral 2,5) și
 * finisarea (bilă Ø3). Condiția din ADR 0310 („Se redeschide dacă”) e finisarea unui relief de 4000², cu bila Ø3 și pasul de
 * 0,3 mm, peste 10 s **pe calculatorul owner-ului**: de aceea sonda stă în repo, ca s-o poată rula acolo.
 *
 * Rulare: `node --expose-gc scripts/masura-relief.ts [N] [pasulLateral] [pasulPeTrecere]` (implicit 4000, 0,3 și 3; cu pasul 6,
 * finisarea are o singură trecere, deci la 4000² și 0,3 încape în plafonul punctelor). Memoria e RSS-ul procesului
 * după fiecare pas (se adună), plus vârful procesului (`maxRSS`, cu memoria trecătoare din mijlocul pașilor). Un singur fir: în aplicație, workerul CAM face tot acest calcul într-un worker.
 */
import { performance } from 'node:perf_hooks';
import { finisareRelief, degrosareRelief } from '../src/cam/reliefFinisare.ts';
import { raspundeRelief } from '../src/jobs/calculRelief.ts';
import { compune } from '../src/relief/compunere.ts';
import { grilaDinDale, stratDinGrila } from '../src/relief/strat.ts';
import { factorReducere, reduce, umbreste } from '../src/relief/umbrire.ts';

const N = Number(process.argv[2] ?? 4000), S = Number(process.argv[3] ?? 0.3), PAS = Number(process.argv[4] ?? 3), C = 0.1;
const mb = (): number => Math.round(process.memoryUsage().rss / 1048576);
/** Vârful memoriei procesului de la pornire (și memoria trecătoare din mijlocul unui pas), în MB. */
const varfProces = (): number => Math.round(process.resourceUsage().maxRSS / 1024);
let varf = 0;
async function pas<T>(nume: string, f: () => T | Promise<T>): Promise<T> {
  (globalThis as { gc?: () => void }).gc?.();
  const t0 = performance.now(), r = await f(), t = performance.now() - t0, m = mb();
  varf = Math.max(varf, m);
  console.log(`${nume.padEnd(38)} ${(t / 1000).toFixed(2).padStart(8)} s   RSS ${String(m).padStart(6)} MB   vârful ${String(varfProces()).padStart(6)} MB`);
  return r;
}

console.log(`Relieful: ${N} × ${N} celule de ${C} mm (${N * C} mm pe latură); finisarea cu pasul lateral ${S} mm, pasul pe trecere ${PAS} mm.`);
const valori = await pas(`grila ${N}²`, () => {
  const v = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = i / N, y = j / N;
    v[j * N + i] = 3 + 2 * Math.sin(12 * x) * Math.cos(9 * y) + 0.5 * Math.sin(80 * x * y);
  }
  return v;
});
const st = await pas('stratul din grilă (dalele, harta)', () => stratDinGrila(valori, N, N));
const citit = await pas('dalele citite înapoi', () => grilaDinDale(N, N, st.dale));
const compus = await pas('compusul (un strat)', () => compune(N * N, [{ mod: 'aduna', vizibil: true, valori: citit }]));
await pas('desenul (redus, umbrit)', () => { const k = factorReducere(N, N), r = reduce(compus, N, N, k); return umbreste(r.valori, r.nx, r.ny, C * k); });
await pas('PNG-ul pe 16 biți', () => raspundeRelief({ tip: 'spre-png', nx: N, ny: N, celula: C, straturi: [{ mod: 'aduna', vizibil: true, harta: st.text, octeti: Object.fromEntries(st.octeti) }] }));
const z = Float64Array.from(compus, (v) => v - 5.6);
const comune = {
  reliefuri: [{ nx: N, ny: N, celula: C, z, m: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } }],
  unghi: 0, margine: 'perete' as const, pas: PAS, adancime: 6, zSigur: 5, avans: 1000, avansPlonjare: 300,
};
const d = await pas('degroșarea (plată Ø6, pasul lateral 2,5)', () => degrosareRelief({ ...comune, pasLateral: 2.5, raza: 3, adaos: 0.5 }));
console.log(`  ${d.ok ? `${d.miscari.length} mișcări, ${d.linii} linii, ${d.treceri} treceri` : d.motiv}`);
const f = await pas(`finisarea (bilă Ø3, pasul lateral ${S})`, () => finisareRelief({ ...comune, pasLateral: S, freza: { fel: 'bila', raza: 1.5 }, nealiniat: false }));
console.log(`  ${f.ok ? `${f.miscari.length} mișcări, ${f.linii} linii, ${f.treceri} treceri` : f.motiv}`);
console.log(`Memoria cea mai mare (RSS după un pas): ${varf} MB; vârful procesului: ${varfProces()} MB.`);
