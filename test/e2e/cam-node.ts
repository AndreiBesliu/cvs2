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
import { CORPUS_CAM, documentGreu, documentMare } from '../unit/ajutor-corpus-cam.ts';

const b64 = (v: ArrayBufferView): string => Buffer.from(v.buffer, v.byteOffset, v.byteLength).toString('base64');

const mare = process.argv.indexOf('--mare');
// Cu `--greu N`: documentul greu pentru CAM și ușor pentru interfață (o piesă cu n × n/2 rame și buzunare), ca text salvat.
const greu = process.argv.indexOf('--greu');
// Cu `--document ID`: documentul unui caz din corpus, ca text salvat de aplicație (revizia 1 000 000).
const unul = process.argv.indexOf('--document');
// Fiecare ramură scrie pe stdout și lasă procesul să se termine singur, fără `process.exit`: pe Linux, scrierea într-un pipe
// e asincronă, iar ieșirea imediată taie textul la ce a apucat să intre în pipe (pe CI, 31.10: documentul greu ajungea la
// 146 176 de caractere din 449 000, iar aplicația îl refuza ca JSON stricat; în WSL, 65 536 din 449 000). Pe Windows,
// scrierea în pipe e sincronă.
if (mare >= 0) {
  const n = Number(process.argv[mare + 1] ?? 48);
  process.stdout.write(jsonCanonic({ ...documentMare(n), rev: 1_000_000 }));
} else if (greu >= 0) {
  process.stdout.write(jsonCanonic({ ...documentGreu(Number(process.argv[greu + 1] ?? 56)), rev: 1_000_000 }));
} else if (unul >= 0) {
  const c = CORPUS_CAM.find((x) => x.id === process.argv[unul + 1]);
  if (!c) throw new Error(`corpusul n-are cazul ${String(process.argv[unul + 1])}`);
  process.stdout.write(jsonCanonic({ ...c.doc, rev: 1_000_000 }));
} else {
  process.stdout.write(JSON.stringify(await corpus()));
}

type Caz = { readonly id: string; readonly cerere: CerereCam; readonly asteptat: unknown };

/** Corpusul calculat direct: cererile de trimis workerului și, pentru fiecare, ce trebuie să întoarcă. */
async function corpus(): Promise<Caz[]> {
  const cazuri: Caz[] = [];
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
  return cazuri;
}
