/**
 * Partea de Node a probei „workerul CAM construit = calculul direct” (`cam-bazin.spec.ts`, ADR 0109): corpusul
 * (`test/unit/ajutor-corpus-cam.ts`), calculat direct, iese pe stdout ca JSON: cererile de trimis workerului și, pentru
 * fiecare, ce trebuie să întoarcă (octeții fiecărui fișier, rezumatul, programul traseului împachetat, mutările simulării;
 * tablourile în base64).
 * Rulează cu Node-ul obișnuit, nu în procesul Playwright: transpilerul lui schimbă câmpurile claselor din cavalier.
 * Cu `--mare N`, scrie doar documentul mare al măsurătorii (N × N / 2 rame cu buzunar), ca text salvat de aplicație.
 */
import { programDinDocument, REGIM_IMPLICIT } from '../../src/cam/job.ts';
import { calculeazaExportul } from '../../src/jobs/calculCam.ts';
import { impacheteaza } from '../../src/jobs/impachetare.ts';
import type { CerereCam } from '../../src/jobs/protocolCam.ts';
import { jsonCanonic } from '../../src/model/incarcare.ts';
import { pregatesteProgram } from '../../src/sim/program.ts';
import { CORPUS_CAM, documentMare } from '../unit/ajutor-corpus-cam.ts';

const b64 = (v: ArrayBufferView): string => Buffer.from(v.buffer, v.byteOffset, v.byteLength).toString('base64');

const mare = process.argv.indexOf('--mare');
if (mare >= 0) {
  const n = Number(process.argv[mare + 1] ?? 48);
  process.stdout.write(jsonCanonic({ ...documentMare(n), rev: 1_000_000 }));
  process.exit(0);
}
// Cu `--document ID`: documentul unui caz din corpus, ca text salvat de aplicație (revizia 1 000 000).
const unul = process.argv.indexOf('--document');
if (unul >= 0) {
  const c = CORPUS_CAM.find((x) => x.id === process.argv[unul + 1]);
  if (!c) throw new Error(`corpusul n-are cazul ${String(process.argv[unul + 1])}`);
  process.stdout.write(jsonCanonic({ ...c.doc, rev: 1_000_000 }));
  process.exit(0);
}

const cazuri: Array<{ readonly id: string; readonly cerere: CerereCam; readonly asteptat: unknown }> = [];
for (const c of CORPUS_CAM) {
  for (const [k, p0] of c.parametri.entries()) {
    let p = p0;
    let r = await calculeazaExportul(c.doc, p);
    if (!r.ok && 'cereConfirmare' in r) {
      cazuri.push({ id: `${c.id} export ${k} (cererea de confirmare)`, cerere: { fel: 'export', document: c.doc, parametri: p }, asteptat: r });
      p = { ...p, confirmareIesire: r.cereConfirmare };
      r = await calculeazaExportul(c.doc, p);
    }
    cazuri.push({
      id: `${c.id} export ${k}`, cerere: { fel: 'export', document: c.doc, parametri: p },
      asteptat: !r.ok ? r : {
        ok: true, fisiere: r.fisiere.map((f) => ({ b64: b64(f.octeti), sha256: f.sha256, linii: f.linii, sectiuni: f.sectiuni, scula: f.scula })),
        rezumat: r.rezumat, avertismente: r.avertismente, foaie: r.foaie,
        simulare: r.simulare.ok ? { scula: r.simulare.scula, mutari: [r.simulare.mutari, ...(r.simulare.apoi ?? []).map((g) => g.mutari)].map(b64) } : r.simulare,
      },
    });
  }
  const t = programDinDocument(c.doc);
  const pk = t.ok ? impacheteaza(t.program) : null;
  cazuri.push({
    id: `${c.id} traseu`, cerere: { fel: 'traseu', document: c.doc },
    asteptat: !t.ok || !pk ? { ok: false, motiv: t.ok ? '' : t.motiv } : {
      ok: true, axe: pk.axe, scula: pk.scula, turatie: pk.turatie, zSigur: pk.zSigur, texte: pk.texte, scule: pk.scule,
      feluri: b64(pk.feluri), masti: b64(pk.masti), numere: b64(pk.numere),
    },
  });
  const j = programDinDocument(c.doc, REGIM_IMPLICIT, 0);
  const s = j.ok ? pregatesteProgram(j.program, 0) : null;
  cazuri.push({
    id: `${c.id} simulare`, cerere: { fel: 'simulare', document: c.doc },
    asteptat: !j.ok ? { ok: false, motiv: j.motiv } : s && !s.ok ? { ok: false, motiv: s.motiv }
      : s ? { ok: true, scula: s.scula, mutari: [s.mutari, ...(s.apoi ?? []).map((g) => g.mutari)].map(b64) } : null,
  });
}
process.stdout.write(JSON.stringify(cazuri));
