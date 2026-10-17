// Sabotajele pe oracolul stratului de traseu: fiecare schimbă O linie din `test/oracles/strat-traseu.ts` (VOID dacă textul
// vechi nu apare exact o dată), rulează tot `test/e2e/traseu.oracol.spec.ts` (hârtia + legătura în Edge) și cere cel
// puțin un test picat. Baza (fără sabotaj) trebuie să treacă întreagă; la final, fișierul e verificat octet cu octet.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const REPO = 'C:/Users/besli/Desktop/MyWork/Apps/cncvs2';
const ORACOL = `${REPO}/test/oracles/strat-traseu.ts`;
const SPEC = 'test/e2e/traseu.oracol.spec.ts';

type Sabotaj = { id: string; motiv: string; vechi: string; nou: string };
const S: Sabotaj[] = [
  { id: 'S01', motiv: 'inPixeli fără întoarcerea axei Y', vechi: '(v.ty - p[1] * v.scara) * v.dpr]', nou: '(v.ty + p[1] * v.scara) * v.dpr]' },
  { id: 'S02', motiv: 'inDocument fără întoarcerea axei Y', vechi: '(v.ty - q[1] / v.dpr) / v.scara]', nou: '(q[1] / v.dpr - v.ty) / v.scara]' },
  { id: 'S03', motiv: 'inPixeli: translația neînmulțită cu dpr', vechi: '[(p[0] * v.scara + v.tx) * v.dpr,', nou: '[p[0] * v.scara * v.dpr + v.tx,' },
  { id: 'S04', motiv: 'pxPeMm fără dpr', vechi: 'return v.scara * v.dpr;', nou: 'return v.scara;' },
  { id: 'S05', motiv: 'I citit ca centru absolut', vechi: 'const cx = start[0] + (val[\'I\'] ?? 0);', nou: 'const cx = (val[\'I\'] ?? 0);' },
  { id: 'S06', motiv: 'G2 / G3 inversate', vechi: 'if (mod === 2) { if (u >= -EPS_ARC) u -= DOI_PI; } else if (u <= EPS_ARC) u += DOI_PI;', nou: 'if (mod === 3) { if (u >= -EPS_ARC) u -= DOI_PI; } else if (u <= EPS_ARC) u += DOI_PI;' },
  { id: 'S07', motiv: 'cercul întreg G2 citit ca arc nul', vechi: 'if (mod === 2) { if (u >= -EPS_ARC) u -= DOI_PI; }', nou: 'if (mod === 2) { if (u > EPS_ARC) u -= DOI_PI; }' },
  { id: 'S08', motiv: 'modul de mișcare nu e modal', vechi: 'if (miscare !== null) mod = miscare;', nou: 'mod = miscare;' },
  { id: 'S09', motiv: 'G0 citit ca tăiere', vechi: "tip: mod === 0 ? 'rapid' : 'taiere'", nou: "tip: 'taiere'" },
  { id: 'S10', motiv: 'comentariile nu se scot', vechi: ".replace(/\\([^)]*\\)/g, '')", nou: ".replace(/\\(\\)/g, '')" },
  { id: 'S11', motiv: 'startul necunoscut luat drept (0, 0)', vechi: 'x !== null && y !== null ? [x, y] : null;', nou: 'x !== null && y !== null ? [x, y] : [0, 0];' },
  { id: 'S12', motiv: 'originea dreapta-sus cu semnul greșit', vechi: "case 'dreapta-sus': return [w, h];", nou: "case 'dreapta-sus': return [-w, -h];" },
  { id: 'S13', motiv: 'distanța la arc ignoră întinderea lui (cerc întreg)', vechi: 'if (parcurs <= Math.abs(pr.baleiaj) + 1e-12) {', nou: 'if (parcurs <= Math.abs(pr.baleiaj) + 1e-12 || pr.r > 0) {' },
  { id: 'S14', motiv: 'golurile nu se numără', vechi: 'if (!acoperit(X, Y)) {', nou: 'if (false && !acoperit(X, Y)) {' },
  { id: 'S15', motiv: 'pixelii în plus nu se numără', vechi: 'if (dMin > toleranta) { inPlus++; continue; }', nou: 'if (dMin > toleranta + 1000) { inPlus++; continue; }' },
  { id: 'S16', motiv: 'abaterea medie judecată doar pe o parte', vechi: 'if (Math.abs(m.medie) > abatereMedie)', nou: 'if (m.medie > abatereMedie)' },
  { id: 'S17', motiv: 'abaterea medie permisă 1,5 px', vechi: 'const abatereMedie = opt.abatereMedie ?? 0.5;', nou: 'const abatereMedie = opt.abatereMedie ?? 1.5;' },
  { id: 'S18', motiv: 'uniformitatea culorii nu se cere', vechi: 'c.abateri > 0.01 * c.n', nou: 'c.abateri > 1.01 * c.n' },
  { id: 'S19', motiv: 'rapidele pot avea culoarea tăierilor', vechi: 'diferenta(taiere.culoare, rapid.culoare) < 32', nou: 'diferenta(taiere.culoare, rapid.culoare) < 0' },
  { id: 'S20', motiv: 'săgeata de 2 px în loc de ½', vechi: '2 * Math.acos(1 - sageata / rPx)', nou: '2 * Math.acos(1 - 4 * sageata / rPx)' },
  { id: 'S21', motiv: 'coarde de două ori mai multe decât trebuie', vechi: 'Math.ceil(Math.abs(arc.baleiaj) / unghiMaxim - 1e-12)', nou: 'Math.ceil((2 * Math.abs(arc.baleiaj)) / unghiMaxim - 1e-12)' },
  { id: 'S22', motiv: 'error:33 (razele capetelor) nu se mai verifică', vechi: 'if (dr > 0.005 && dr > 0.001 * rs)', nou: 'if (dr > 5 && dr > 0.001 * rs)' },
  { id: 'S23', motiv: 'G91 acceptat tăcut', vechi: "else if (c === 91) refuz(nr, 'G91 (incremental): oracolul citește doar G90');", nou: 'else if (c === 91) g90 = true;' },
  { id: 'S24', motiv: 'centrul pixelului în colțul lui', vechi: 'inDocument([px.x + 0.5, px.y + 0.5], v)', nou: 'inDocument([px.x, px.y], v)' },
  { id: 'S25', motiv: 'acoperirea la 3 px în loc de 1,5', vechi: 'const acoperire = opt.acoperire ?? 1.5;', nou: 'const acoperire = opt.acoperire ?? 3;' },
  { id: 'S26', motiv: 'unghiul startului cu argumentele inversate', vechi: 'u0: Math.atan2(ry, rx)', nou: 'u0: Math.atan2(rx, ry)' },
  { id: 'S27', motiv: 'inDocument fără dpr', vechi: '(q[0] / v.dpr - v.tx) / v.scara', nou: '(q[0] - v.tx) / v.scara' },
  { id: 'S28', motiv: 'semnul distanței la segment întors', vechi: 'const semn = (dx * (p[1] - pr.a[1]) - dy * (p[0] - pr.a[0])) / Math.sqrt(l2);', nou: 'const semn = (dy * (p[0] - pr.a[0]) - dx * (p[1] - pr.a[1])) / Math.sqrt(l2);' },
  { id: 'S29', motiv: 'întinderea arcului măsurată în sensul greșit', vechi: 'pr.baleiaj > 0 ? modPozitiv(t - pr.u0, DOI_PI) : modPozitiv(pr.u0 - t, DOI_PI)', nou: 'pr.baleiaj > 0 ? modPozitiv(pr.u0 - t, DOI_PI) : modPozitiv(t - pr.u0, DOI_PI)' },
  { id: 'S30', motiv: 'clasele de culoare inversate', vechi: "if (pr.tip === 'taiere') dTaiere = Math.min(dTaiere, d); else dRapid = Math.min(dRapid, d);", nou: "if (pr.tip !== 'taiere') dTaiere = Math.min(dTaiere, d); else dRapid = Math.min(dRapid, d);" },
  { id: 'S31', motiv: 'media nu se mai judecă (prag de pixeli uriaș)', vechi: '.filter((m) => m.n >= minim);', nou: '.filter((m) => m.n >= 1e9);' },
  { id: 'S32', motiv: 'inPixeli: translația cu semnul greșit pe X', vechi: '[(p[0] * v.scara + v.tx) * v.dpr,', nou: '[(p[0] * v.scara - v.tx) * v.dpr,' },
];

const original = readFileSync(ORACOL);
const hash = (b: Buffer): string => createHash('sha256').update(b).digest('hex');
const h0 = hash(original);

type Rulare = { trecute: number; picate: string[]; eroare?: string; ms: number };
function ruleaza(): Rulare {
  const t0 = Date.now();
  const r = spawnSync('npx', ['playwright', 'test', SPEC, '--reporter=json'], { cwd: REPO, shell: true, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, timeout: 300_000 });
  const ms = Date.now() - t0;
  const out = r.stdout ?? '';
  const i = out.indexOf('{');
  if (i < 0) return { trecute: 0, picate: [], eroare: `fără JSON: ${(r.stderr ?? '').slice(0, 500)}`, ms };
  const j = JSON.parse(out.slice(i)) as { suites?: unknown[]; errors?: Array<{ message?: string }> };
  let trecute = 0;
  const picate: string[] = [];
  const umbla = (s: { suites?: unknown[]; specs?: Array<{ title: string; tests: Array<{ results: Array<{ status: string }> }> }> }): void => {
    for (const x of s.suites ?? []) umbla(x as typeof s);
    for (const sp of s.specs ?? []) for (const t of sp.tests) for (const res of t.results) { if (res.status === 'passed') trecute++; else picate.push(sp.title.slice(0, 70)); }
  };
  umbla(j as Parameters<typeof umbla>[0]);
  const eroare = (j.errors ?? []).map((e) => (e.message ?? '').split('\n')[0]).join(' | ') || undefined;
  return eroare === undefined ? { trecute, picate, ms } : { trecute, picate, eroare, ms };
}

const doar = process.argv.slice(2);
const linii: string[] = [];
const scrie = (s: string): void => { linii.push(s); console.log(s); };
try {
  const baza = ruleaza();
  scrie(`BAZA: ${baza.trecute} trecute, ${baza.picate.length} picate ${baza.picate.join('; ')} ${baza.eroare ?? ''} (${baza.ms} ms)`);
  if (baza.picate.length > 0 || baza.trecute < 12 || baza.eroare) throw new Error('baza nu e verde');
  for (const s of S) {
    if (doar.length > 0 && !doar.includes(s.id)) continue;
    const text = original.toString('utf8');
    const n = text.split(s.vechi).length - 1;
    if (n !== 1 || s.vechi === s.nou) { scrie(`${s.id} VOID (${n} apariții): ${s.motiv}`); continue; }
    const nou = Buffer.from(text.replace(s.vechi, s.nou), 'utf8');
    writeFileSync(ORACOL, nou);
    if (hash(readFileSync(ORACOL)) === h0) { scrie(`${s.id} VOID (fișierul nu s-a schimbat)`); continue; }
    let r: Rulare;
    try { r = ruleaza(); } finally { writeFileSync(ORACOL, original); }
    if (hash(readFileSync(ORACOL)) !== h0) throw new Error('restaurarea a eșuat');
    const prins = r.picate.length > 0 || r.eroare !== undefined;
    scrie(`${s.id} ${prins ? 'PRINS' : 'SCĂPAT'} (${r.picate.length} picate${r.eroare ? `, eroare: ${r.eroare.slice(0, 120)}` : ''}; ${r.ms} ms): ${s.motiv} — ${r.picate.join('; ').slice(0, 300)}`);
  }
} finally {
  writeFileSync(ORACOL, original);
  scrie(`FINAL: oracolul ${hash(readFileSync(ORACOL)) === h0 ? 'identic cu originalul' : 'DIFERIT!'} (${h0.slice(0, 12)})`);
  writeFileSync(new URL('./sabotaje.rezultat.txt', import.meta.url), linii.join('\n') + '\n');
}
