/**
 * Partea de Node a porții „amprenta Node = browser” pe calea omului (`simulare.spec.ts`): documentul salvat de aplicație
 * vine pe stdin, iese simularea exportului, ca JSON, pe stdout. Rulează cu Node-ul obișnuit (tipurile scoase de Node),
 * nu în procesul Playwright: transpilerul lui schimbă câmpurile claselor din cavalier (offsetul), iar CAM-ul ar cădea.
 */
import { readFileSync } from 'node:fs';
import { calculeazaExport } from '../../src/ui/actiuniExportCalcul.ts';
import type { Document } from '../../src/model/document.ts';

const doc = JSON.parse(readFileSync(0, 'utf8')) as Document;
const r = await calculeazaExport(doc, { origine: 'stanga-jos', z0: 'sus' });
const s = r.ok ? r.simulare : { ok: false as const, motiv: r.motiv };
process.stdout.write(JSON.stringify(s.ok ? { ok: true, amprenta: s.amprenta, volum: s.volum, adancimeMax: s.adancimeMax, fire: s.fire } : s));
