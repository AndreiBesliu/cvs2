/**
 * Scriitorul PDF al exportului 2D (ADR 0089): PDF 1.5, o pagină cât cutia foii (foaia, lărgită doar cât iese o formă), cu
 * originea foii în originea paginii. Conținutul e în mm: matricea `cm` scalează cu 72 / 25,4 (toate cifrele), deci
 * coordonatele scrise sunt cele ale foii. Fiecare strat e un strat PDF (OCG, „Optional Content Group”), vizibil, cu numele
 * lui, iar căile lui stau între `/OC /OCn BDC` și `EMC`. Stratul cotelor (ADR 0330 §7) are numele, culoarea și grosimea din
 * setări; capetele pline se umplu (`f`), iar punctele sunt discuri (calea trasă cu lățimea lor). Fișierul e numai ASCII, necomprimat: offseturile din tabela xref
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
    const cote = s === 'COTE' ? v.stratCote : undefined;
    const culoare = rgb(cote?.culoare ?? CULORI_SVG[s]);
    continut.push(`/OC /OC${i} BDC`, `${culoare} RG`);
    if (cote) continut.push('q', `${culoare} rg`, `${nr(cote.grosime)} w`);
    for (const e of v.entitati) {
      if (e.strat !== s) continue;
      if (e.fel === 'plin') continut.push(cale(drumEntitate(e)), 'f');
      else if (e.fel === 'polilinie' && e.latime) continut.push('q', `${nr(e.latime)} w`, cale(drumEntitate(e)), 'S', 'Q');
      else continut.push(cale(drumEntitate(e)), 'S');
    }
    if (cote) continut.push('Q');
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
    ...folosite.map((s) => `<< /Type /OCG /Name (${s === 'COTE' ? v.stratCote?.nume ?? s : s}) >>`),
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
