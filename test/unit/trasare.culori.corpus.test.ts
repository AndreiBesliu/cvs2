import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { traseazaCulori, type OptiuniCulori, type PiesaCuloare } from '../../src/trasare/culori.ts';
import { traseaza } from '../../src/trasare/trasare.ts';
import { citestePng } from './ajutor-png.ts';
import { esantioane } from './ajutor-trasare.ts';

/**
 * Corpusul trasării pe culori (ADR 0221 §9): imaginile scrise de `test/oracles-py/trasare_corpus.py`, cu regiunile care
 * pavează imaginea (acoperirea exactă a fiecăreia, amestecată în sRGB) și formele lor pe hârtie. Aici, nucleul le trasează:
 * - fiecare culoare stă lângă regiunile ei de pe hârtie, în ambele sensuri (lângă o joncțiune sau un colț, cu 0,4 px în plus);
 * - exterioarele și golurile fiecărei culori, ca pe hârtie (afară de tabla de șah: acolo, pe hârtie, două blocuri se ating
 *   într-un punct, deci orice legătură e corectă);
 * - fiecare joncțiune de pe hârtie are un vârf la cel mult 0,5 px;
 * - granițele comune: lungimea bucăților care apar exact întoarse în altă culoare e cât granițele dintre culori de pe hârtie
 *   (fără ele, două culori vecine ar avea fiecare linia ei, cu o fâșie între ele);
 * - pe logoul owner-ului (fără hârtie): reuniunea culorilor are aria trasării alb-negru a aceleiași imagini (o fâșie între
 *   două culori, sau o aură pierdută, ar scădea-o), iar paleta automată are câte o culoare lângă mediana fiecărei familii
 *   (griul, albastrul, portocaliul liniilor punctate), măsurată de oracol pe pixelii plini.
 */

type Regiune = { readonly culoare: string; readonly inele: ReadonlyArray<ReadonlyArray<readonly [number, number]>>; readonly aria: number };
type Caz = {
  readonly nume: string; readonly fisier: string; readonly latime: number; readonly inaltime: number;
  readonly asteptat: {
    readonly culori: number; readonly fundal?: string; readonly toleranta: number; readonly sa?: boolean;
    readonly paleta?: Readonly<Record<string, string>>;
  };
  readonly regiuni: readonly Regiune[] | null; readonly jonctiuni: ReadonlyArray<readonly [number, number]>;
};

const DIR = new URL('../fixtures/trasare/', import.meta.url);
const CORPUS = JSON.parse(readFileSync(new URL('culori.json', DIR), 'utf8')) as { readonly cazuri: readonly Caz[] };
const IMPLICITE: OptiuniCulori = { numar: null, legaturi: [], bifate: null, netezime: 'echilibrat', petePx: 0, gauriPx: 0 };

const rgb = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const dif = (a: string, b: string): number => { const x = rgb(a), y = rgb(b); return Math.max(Math.abs(x[0] - y[0]), Math.abs(x[1] - y[1]), Math.abs(x[2] - y[2])); };

/** Distanța de la un punct la inelele date (laturile lor). */
function laInele(px: number, py: number, inele: ReadonlyArray<ReadonlyArray<readonly [number, number]>>): number {
  let d = Infinity;
  for (const p of inele) {
    const n = p.length;
    for (let k = 0; k < n; k++) {
      const [ax, ay] = p[k] ?? [0, 0], [bx, by] = p[(k + 1) % n] ?? [0, 0];
      const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
      const u = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
      d = Math.min(d, Math.hypot(ax + u * dx - px, ay + u * dy - py));
    }
  }
  return d;
}

/** O grilă de 2 px peste eșantioane: distanța de la un punct la cel mai apropiat. */
function grila(puncte: readonly number[]): (x: number, y: number) => number {
  const g = new Map<string, number[]>();
  for (let i = 0; i < puncte.length; i += 2) {
    const k = `${Math.floor((puncte[i] ?? 0) / 2)},${Math.floor((puncte[i + 1] ?? 0) / 2)}`;
    (g.get(k) ?? g.set(k, []).get(k))?.push(puncte[i] ?? 0, puncte[i + 1] ?? 0);
  }
  return (x, y) => {
    let d = Infinity;
    const gx = Math.floor(x / 2), gy = Math.floor(y / 2);
    for (let r = 0; r <= 8 && d > (r - 1) * 2; r++) {
      for (let i = gx - r; i <= gx + r; i++) for (let j = gy - r; j <= gy + r; j++) {
        if (Math.max(Math.abs(i - gx), Math.abs(j - gy)) !== r) continue;
        for (const [q, l] of [[0, g.get(`${i},${j}`) ?? []] as const]) for (let k = q; k < l.length; k += 2) d = Math.min(d, Math.hypot((l[k] ?? 0) - x, (l[k + 1] ?? 0) - y));
      }
    }
    return d;
  };
}

/** Colțurile hârtiei: vârfurile inelelor unde latura se rotește cu cel puțin 30°. */
function colturi(inele: ReadonlyArray<ReadonlyArray<readonly [number, number]>>): Array<[number, number]> {
  const r: Array<[number, number]> = [];
  for (const p of inele) {
    const n = p.length;
    for (let k = 0; k < n; k++) {
      const [ax, ay] = p[(k + n - 1) % n] ?? [0, 0], [bx, by] = p[k] ?? [0, 0], [cx, cy] = p[(k + 1) % n] ?? [0, 0];
      let u = Math.abs(Math.atan2(cy - by, cx - bx) - Math.atan2(by - ay, bx - ax));
      if (u > Math.PI) u = 2 * Math.PI - u;
      if (u >= Math.PI / 6) r.push([bx, by]);
    }
  }
  return r;
}

/** Bucățile unei piese, ca segmente (început, mânere, capăt), cu cheia lor exactă. */
function segmente(pc: PiesaCuloare): Array<{ cheie: string; invers: string; lung: number }> {
  const c = pc.cai, r: Array<{ cheie: string; invers: string; lung: number }> = [];
  for (let k = 0; k + 1 < c.inceput.length; k++) {
    const a = c.inceput[k] ?? 0, b = c.inceput[k + 1] ?? 0;
    for (let v = a; v < b; v++) {
      const w = v + 1 < b ? v + 1 : a;
      const P = [c.xy[6 * v] ?? 0, c.xy[6 * v + 1] ?? 0], Q = [c.xy[6 * w] ?? 0, c.xy[6 * w + 1] ?? 0];
      const c1 = c.tip[v] === 1 ? [c.xy[6 * v + 2] ?? 0, c.xy[6 * v + 3] ?? 0] : [], c2 = c.tip[v] === 1 ? [c.xy[6 * v + 4] ?? 0, c.xy[6 * v + 5] ?? 0] : [];
      // Lungimea pe curbă (o cubică, pe 64 de eșantioane), nu coarda.
      let lung = 0;
      if (c.tip[v] === 1) {
        let px = P[0] ?? 0, py = P[1] ?? 0;
        for (let i = 1; i <= 64; i++) {
          const u = i / 64, w2 = 1 - u;
          const x = w2 * w2 * w2 * (P[0] ?? 0) + 3 * w2 * w2 * u * (c1[0] ?? 0) + 3 * w2 * u * u * (c2[0] ?? 0) + u * u * u * (Q[0] ?? 0);
          const y = w2 * w2 * w2 * (P[1] ?? 0) + 3 * w2 * w2 * u * (c1[1] ?? 0) + 3 * w2 * u * u * (c2[1] ?? 0) + u * u * u * (Q[1] ?? 0);
          lung += Math.hypot(x - px, y - py); px = x; py = y;
        }
      } else lung = Math.hypot((Q[0] ?? 0) - (P[0] ?? 0), (Q[1] ?? 0) - (P[1] ?? 0));
      r.push({ cheie: [...P, ...c1, ...c2, ...Q].join(','), invers: [...Q, ...c2, ...c1, ...P].join(','), lung });
    }
  }
  return r;
}

/** Aria cu semn a unei piese (exterioarele pozitive), pe eșantioanele curbelor fiecărei bucle. */
function aria(pc: PiesaCuloare): number {
  let s = 0;
  const c = pc.cai;
  for (let k = 0; k + 1 < c.inceput.length; k++) {
    const sub = { inceput: Uint32Array.from([0, (c.inceput[k + 1] ?? 0) - (c.inceput[k] ?? 0)]), tip: c.tip.subarray(c.inceput[k], c.inceput[k + 1]), xy: c.xy.subarray(6 * (c.inceput[k] ?? 0), 6 * (c.inceput[k + 1] ?? 0)), exterior: c.exterior.subarray(k, k + 1) };
    const { puncte: p } = esantioane(sub);
    const n = p.length / 2;
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; s += (p[2 * i] ?? 0) * (p[2 * j + 1] ?? 0) - (p[2 * j] ?? 0) * (p[2 * i + 1] ?? 0); }
  }
  return s / 2;
}

/** Lungimea granițelor dintre două culori de pe hârtie: laturile inelelor care stau pe inelul altei culori. */
function granitePeHartie(regiuni: readonly Regiune[]): number {
  let s = 0;
  regiuni.forEach((r, i) => {
    const altele = regiuni.filter((x, j) => j !== i && x.culoare !== r.culoare).flatMap((x) => x.inele);
    for (const p of r.inele) {
      const n = p.length;
      for (let k = 0; k < n; k++) {
        const [ax, ay] = p[k] ?? [0, 0], [bx, by] = p[(k + 1) % n] ?? [0, 0];
        if (laInele((ax + bx) / 2, (ay + by) / 2, altele) < 1e-3) s += Math.hypot(bx - ax, by - ay);
      }
    }
  });
  return s / 2;
}

for (const caz of CORPUS.cazuri) {
  test(`corpusul pe culori: ${caz.nume}`, () => {
    const img = citestePng(readFileSync(new URL(caz.fisier, DIR)));
    const r = traseazaCulori(img, IMPLICITE);
    assert.ok(r.ok, `${caz.nume}: ${r.ok ? '' : r.cod}`);
    const paleta = r.raport.paleta;
    assert.equal(paleta.length, caz.asteptat.culori, `culorile: ${paleta.map((c) => c.hex).join(', ')}`);
    if (caz.asteptat.fundal) {
      const f = paleta.find((c) => c.fundal);
      assert.ok(f && dif(f.hex, caz.asteptat.fundal) <= 3, `fundalul: ${f?.hex ?? 'niciunul'}`);
    }
    // Granițele comune: fiecare bucată a unei culori, căutată exact întoarsă în celelalte.
    const toate = new Map<string, number>();
    r.piese.forEach((pc, i) => { for (const s of segmente(pc)) toate.set(s.cheie, i); });
    let comune = 0;
    r.piese.forEach((pc, i) => { for (const s of segmente(pc)) { const j = toate.get(s.invers); if (j !== undefined && j !== i) comune += s.lung; } });
    comune /= 2;
    const raport: string[] = [];
    if (!caz.regiuni) {
      // Logoul: reuniunea culorilor (aria netă a tuturor pieselor) = aria trasării alb-negru, cu aceeași netezime.
      const an = traseaza(img, { sursa: 'auto', prag: null, inverseaza: false, netezime: 'echilibrat', petePx: 0, gauriPx: 0 });
      assert.ok(an.ok);
      const bn = aria({ culoare: 0, hex: '', cai: an.cai });
      const sum = r.piese.reduce((s, pc) => s + aria(pc), 0);
      console.log(`  ${caz.nume}: ${paleta.map((c) => c.hex).join(', ')}; aria culorilor ${sum.toFixed(1)} px², alb-negru ${bn.toFixed(1)}; granițe comune ${comune.toFixed(1)} px; abaterea ${r.raport.abatere.toFixed(3)} px`);
      assert.ok(Math.abs(sum - bn) / bn < 0.005, `aria: ${sum} față de ${bn}`);
      // Câte 16 niveluri pe canal: cât se depărtează media unei familii (centrul) de mediana ei (umbrirea griului, marginile
      // mai deschise ale liniilor portocalii).
      for (const [familie, h] of Object.entries(caz.asteptat.paleta ?? {})) {
        const cea = paleta.reduce((m, c) => Math.min(m, dif(c.hex, h)), Infinity);
        assert.ok(cea <= 16, `${familie} ${h}: cea mai apropiată culoare din paletă e la ${cea} niveluri`);
      }
      return;
    }
    const regiuni: readonly Regiune[] = caz.regiuni;
    const tol = caz.asteptat.toleranta;
    const lânga = [...caz.jonctiuni, ...colturi(caz.regiuni.flatMap((x) => x.inele))];
    const aproapeDeColt = (x: number, y: number): boolean => lânga.some(([a, b]) => Math.hypot(a - x, b - y) < 1.5);
    for (const culoare of [...new Set(caz.regiuni.map((x) => x.culoare))]) {
      const regs: Regiune[] = regiuni.filter((x) => x.culoare === culoare);
      const inele = regs.flatMap((x) => x.inele);
      const pc: PiesaCuloare | undefined = r.piese.find((x) => dif(x.hex, culoare) <= 6);
      assert.ok(pc, `${culoare}: nicio piesă (${r.piese.map((x) => x.hex).join(', ')})`);
      const { puncte, varfuri } = esantioane(pc.cai);
      // Curbe → hârtie.
      let dus = 0, dusColt = 0;
      for (let i = 0; i < puncte.length; i += 2) {
        const x = puncte[i] ?? 0, y = puncte[i + 1] ?? 0, dd = laInele(x, y, inele);
        if (aproapeDeColt(x, y)) dusColt = Math.max(dusColt, dd); else dus = Math.max(dus, dd);
      }
      // Hârtie → curbe (laturile hârtiei, la 0,25 px).
      const cel = grila(puncte);
      let intors = 0, intorsColt = 0;
      for (const p of inele) {
        for (let k = 0; k < p.length; k++) {
          const [ax, ay] = p[k] ?? [0, 0], [bx, by] = p[(k + 1) % p.length] ?? [0, 0];
          const m = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 0.25));
          for (let i = 0; i < m; i++) {
            const x = ax + ((bx - ax) * i) / m, y = ay + ((by - ay) * i) / m, dd = cel(x, y);
            if (aproapeDeColt(x, y)) intorsColt = Math.max(intorsColt, dd); else intors = Math.max(intors, dd);
          }
        }
      }
      const ext: number = Array.from(pc.cai.exterior).filter((e) => e === 1).length;
      const gol: number = pc.cai.exterior.length - ext;
      const extH: number = regs.length, golH: number = regs.reduce((s, x) => s + x.inele.length - 1, 0);
      const arieH = regs.reduce((s, x) => s + x.aria, 0), arieT = aria(pc);
      const mesaj = `${culoare}: ${ext} + ${gol} (hârtia ${extH} + ${golH}); curbe → hârtie ${dus.toFixed(3)} (lângă colțuri ${dusColt.toFixed(3)}), hârtie → curbe ${intors.toFixed(3)} (${intorsColt.toFixed(3)}); aria ${arieT.toFixed(1)} / ${arieH.toFixed(1)}`;
      raport.push(mesaj);
      assert.ok(dus <= tol && intors <= tol, mesaj);
      assert.ok(dusColt <= tol + 0.4 && intorsColt <= tol + 0.4, mesaj);
      if (!caz.asteptat.sa) assert.deepEqual([ext, gol], [extH, golH], mesaj);
      // Aria: cel mult 0,12 px pe lungimea marginilor de pe hârtie (o deplasare sub-pixel a graniței, nu un procent).
      let perimetru = 0;
      for (const p of inele) for (let k = 0; k < p.length; k++) perimetru += Math.hypot((p[(k + 1) % p.length]?.[0] ?? 0) - (p[k]?.[0] ?? 0), (p[(k + 1) % p.length]?.[1] ?? 0) - (p[k]?.[1] ?? 0));
      assert.ok(Math.abs(arieT - arieH) <= 0.12 * perimetru, mesaj + `; perimetrul ${perimetru.toFixed(1)} px`);
      // Joncțiunile: fiecare, lângă un vârf al culorii care o atinge.
      for (const [jx, jy] of caz.jonctiuni) {
        if (laInele(jx, jy, inele) > 1e-3) continue;
        let dv = Infinity;
        for (let i = 0; i < varfuri.length; i += 2) dv = Math.min(dv, Math.hypot((varfuri[i] ?? 0) - jx, (varfuri[i + 1] ?? 0) - jy));
        assert.ok(dv <= 0.5, `${culoare}: joncțiunea (${jx}, ${jy}) la ${dv.toFixed(3)} px de cel mai apropiat vârf`);
      }
    }
    const gH = granitePeHartie(caz.regiuni);
    console.log(`  ${caz.nume}: ${raport.join('; ')}; granițe comune ${comune.toFixed(1)} / ${gH.toFixed(1)} px; abaterea ${r.raport.abatere.toFixed(3)} px`);
    assert.ok(Math.abs(comune - gH) <= Math.max(1, 0.03 * gH), `granițele comune: ${comune.toFixed(2)} px, pe hârtie ${gH.toFixed(2)} px`);
  });
}
