/**
 * Placa 2 (`PLAN.md` §5.4, `docs/etape/placa-02.md`): MDF 12, freza plată Ø6, foaia 300 × 200, zero XY în colțul
 * stânga-jos, Z0 pe fața de sus. Totul prin foaie (12 mm, trei treceri de 4), în urcare, cu intrările de R3 pe partea
 * deșeului (implicitul dialogului):
 * - **piesa** 120 × 80 cu colțurile R10, din (20, 20): exteriorul cu 4 urechi de 8 × 2 (implicitul plăcii 2); în mijlocul
 *   ei, **gaura** 40 × 30 (60…100 × 45…75 pe foaie), interior, cu dog-bone;
 * - **cepul** 40 × 30 din (170, 20): exterior, cu 2 urechi de 8 × 2 (intră în gaură fără forță);
 * - **logoul** SVG cu lățimea declarată 80 mm (`logo-80mm.svg`), prin ușa SVG a aplicației, din (170, 80): conturul
 *   exterior cu 2 urechi, găurile lui (cercul Ø16 și elipsa 28 × 14) interior.
 *
 * Documentul trece de ușa documentului (`incarca`), iar G-code-ul iese din exportul aplicației (`calculeazaExport`): același
 * document dă, în aplicație, același fișier. Rulat direct (`node test/placi/placa-02/genereaza.ts`), rescrie fișierul de
 * aur; `test/unit/placa02.test.ts` cere ca exportul de acum să fie identic, octet cu octet.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { laturiDinImbricare } from '../../../src/io/imbricare.ts';
import { piesaDinImport } from '../../../src/io/piesa.ts';
import { citesteSvg } from '../../../src/io/svg.ts';
import { PLAFON_IMPORT } from '../../../src/io/svgCoduri.ts';
import { documentNou, type Document, type Operatie, type Piesa } from '../../../src/model/document.ts';
import { incarca } from '../../../src/model/incarcare.ts';
import type { ProgramExportat } from '../../../src/post/export.ts';
import { calculeazaExport } from '../../../src/ui/actiuniExportCalcul.ts';
import { PARSER } from '../../unit/ajutor-svg.ts';

export const FOAIA = { latime: 300, inaltime: 200, grosime: 12 } as const;
export const SCULA = { numar: 1, nume: 'freza plata', diametru: 6 } as const;
export const PAS = 4;
const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } as const;
const INTRARI = { raza: 3 } as const;

function op(id: string, nod: string, latura: Operatie['latura'], extra: Partial<Operatie> = {}): Operatie {
  return {
    id, tip: 'profil', noduri: [nod], scula: { ...SCULA }, latura, sens: 'urcare', adancime: FOAIA.grosime, pas: PAS,
    urechi: null, rampa: null, intrari: { ...INTRARI }, colturi: null, ...extra,
  };
}

/** Logoul, prin ușa SVG și imbricarea aplicației (ca la „Importă SVG…”), cu operațiile plăcii 2. */
function logo(): { readonly piesa: Piesa; readonly x: number; readonly y: number } {
  const octeti = readFileSync(new URL('logo-80mm.svg', import.meta.url));
  const r = citesteSvg(new Uint8Array(octeti), { parser: PARSER });
  if (!r.ok) throw new Error(`logoul nu trece de ușa SVG: ${r.cod}`);
  const laturi = laturiDinImbricare(r.cai, PLAFON_IMPORT.includeri);
  if (!laturi) throw new Error('logoul trece de plafonul includerilor');
  const pus = piesaDinImport({ nume: 'logo-80mm', cai: r.cai, laturi, pagina: r.pagina }, 'logo', { ...SCULA }, FOAIA.grosime);
  const operatii = pus.piesa.operatii.map((o) => ({
    ...o, adancime: FOAIA.grosime, pas: PAS, intrari: { ...INTRARI },
    urechi: o.latura === 'exterior' ? { numar: 2, latime: 8, grosime: 2 } : null,
  }));
  return { piesa: { ...pus.piesa, operatii }, x: pus.x, y: pus.y };
}

export function documentPlaca02(): Document {
  const piesa: Piesa = {
    id: 'piesa', nume: 'piesa 120 x 80 R10',
    radacina: {
      tip: 'grup', id: 'g', matrice: { ...I }, copii: [
        { tip: 'element', id: 'contur', forma: { tip: 'dreptunghi', latime: 120, inaltime: 80, razaColt: 10 }, matrice: { ...I } },
        { tip: 'element', id: 'gaura', forma: { tip: 'dreptunghi', latime: 40, inaltime: 30, razaColt: 0 }, matrice: { ...I, e: 40, f: 25 } },
      ],
    },
    operatii: [
      op('gaura', 'gaura', 'interior', { colturi: { tip: 'dog-bone' } }),
      op('contur', 'contur', 'exterior', { urechi: { numar: 4, latime: 8, grosime: 2 } }),
    ],
  };
  const cep: Piesa = {
    id: 'cep', nume: 'cep 40 x 30',
    radacina: { tip: 'element', id: 'cep', forma: { tip: 'dreptunghi', latime: 40, inaltime: 30, razaColt: 0 }, matrice: { ...I } },
    operatii: [op('cep', 'cep', 'exterior', { urechi: { numar: 2, latime: 8, grosime: 2 } })],
  };
  const l = logo();
  const d0 = documentNou({ ...FOAIA });
  const foaie = d0.foi[0];
  if (!foaie) throw new Error('documentul nou n-are foaie');
  const doc: Document = {
    ...d0,
    piese: [piesa, cep, l.piesa],
    foi: [{
      ...foaie,
      instante: [
        { id: 'piesa', piesa: 'piesa', x: 20, y: 20, rotire: 0 },
        { id: 'cep', piesa: 'cep', x: 170, y: 20, rotire: 0 },
        { id: 'logo', piesa: 'logo', x: 170 + l.x, y: 80 + l.y, rotire: 0 },
      ],
    }],
  };
  const u = incarca(JSON.parse(JSON.stringify(doc)));
  if (!u.ok) throw new Error(`documentul plăcii 2 nu trece de ușă: ${u.motiv}`);
  return u.doc;
}

export async function programPlaca02(): Promise<ProgramExportat> {
  const r = await calculeazaExport(documentPlaca02(), { origine: 'stanga-jos', z0: 'sus' });
  if (!r.ok) throw new Error(`placa 2: ${r.motiv}`);
  return r.program;
}

if (import.meta.main) {
  const p = await programPlaca02();
  writeFileSync(new URL('placa-02.nc', import.meta.url), p.octeti);
  console.log(`placa-02.nc  ${p.linii} linii  sha256 ${p.sha256}`);
}
