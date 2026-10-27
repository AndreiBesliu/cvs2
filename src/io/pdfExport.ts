/**
 * Scriitorul PDF al exportului 2D (ADR 0089): PDF 1.5, o pagină cât cutia foii (foaia, lărgită doar cât iese o formă), cu
 * originea foii în originea paginii. Conținutul e în mm: matricea `cm` scalează cu 72 / 25,4 (toate cifrele), deci
 * coordonatele scrise sunt cele ale foii. Fiecare strat e un strat PDF (OCG, „Optional Content Group”), vizibil, cu numele
 * lui, iar căile lui stau între `/OC /OCn BDC` și `EMC`. Fișierul e numai ASCII, necomprimat: offseturile din tabela xref
 * sunt lungimile textului.
 */
import { CULORI_SVG, nr } from './svgExport.ts';
import { drumEntitate, rgb, type Comanda } from './drumuri.ts';
import { STRATURI, type VectoriFoaie } from './vectori.ts';

/** Punctele tipografice într-un mm. */
export const PT_PE_MM = 72 / 25.4;

function cale(d: readonly Comanda[]): string {
  return d.map((c) => (c.op === 'h' ? 'h'
    : c.op === 'c' ? `${nr(c.x1)} ${nr(c.y1)} ${nr(c.x2)} ${nr(c.y2)} ${nr(c.x)} ${nr(c.y)} c`
      : `${nr(c.x)} ${nr(c.y)} ${c.op}`)).join('\n');
}

export function scriePdf(v: VectoriFoaie): string {
  const folosite = STRATURI.filter((s) => v.entitati.some((e) => e.strat === s));
  const continut: string[] = [`${PT_PE_MM} 0 0 ${PT_PE_MM} 0 0 cm`, '0.1 w 1 J 1 j'];
  folosite.forEach((s, i) => {
    continut.push(`/OC /OC${i} BDC`, `${rgb(CULORI_SVG[s])} RG`);
    for (const e of v.entitati) if (e.strat === s) continut.push(cale(drumEntitate(e)), 'S');
    continut.push('EMC');
  });
  const flux = `${continut.join('\n')}\n`;
  const ocg = folosite.map((_, i) => `${5 + i} 0 R`).join(' ');
  const c = v.cutie, box = [c.minX, c.minY, c.maxX, c.maxY].map((x) => nr(x * PT_PE_MM)).join(' ');
  const obiecte = [
    `<< /Type /Catalog /Pages 2 0 R /OCProperties << /OCGs [${ocg}] /D << /Order [${ocg}] /ON [${ocg}] /OFF [] >> >> >>`,
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [${box}] /Resources << /Properties << ${folosite.map((_, i) => `/OC${i} ${5 + i} 0 R`).join(' ')} >> >> /Contents 4 0 R >>`,
    `<< /Length ${flux.length} >>\nstream\n${flux}endstream`,
    ...folosite.map((s) => `<< /Type /OCG /Name (${s}) >>`),
  ];
  let text = '%PDF-1.5\n';
  const offseturi: number[] = [];
  obiecte.forEach((o, i) => {
    offseturi.push(text.length);
    text += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = text.length;
  text += `xref\n0 ${obiecte.length + 1}\n0000000000 65535 f \n`;
  for (const o of offseturi) text += `${String(o).padStart(10, '0')} 00000 n \n`;
  text += `trailer\n<< /Size ${obiecte.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return text;
}
