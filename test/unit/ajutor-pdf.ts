/**
 * Ajutoarele probelor ușii PDF (ADR 0104): fișiere PDF scrise de mână, obiect cu obiect, cu tabelul xref clasic calculat
 * aici (pozițiile numărate pe octeți), fără niciun cod al aplicației.
 */

export const B = (s: string): Buffer => Buffer.from(s, 'latin1');

/** Un flux scris în fișier: dicționarul (fără /Length) și datele. */
export const flux = (dict: string, date: string | Uint8Array): Buffer => {
  const d = typeof date === 'string' ? B(date) : Buffer.from(date);
  return Buffer.concat([B(`<< ${dict} /Length ${d.length} >>\nstream\n`), d, B('\nendstream')]);
};

/** Un PDF cu tabel xref clasic, din corpurile obiectelor 1…n (fără „N 0 obj” / „endobj”); trailerul trimite la /Root 1 0 R. */
export function pdf(obiecte: ReadonlyArray<string | Buffer>): Buffer {
  const parti: Buffer[] = [B('%PDF-1.7\n')];
  let pos = parti[0]!.length;
  const off: number[] = [];
  obiecte.forEach((o, k) => {
    off.push(pos);
    const b = Buffer.concat([B(`${k + 1} 0 obj\n`), typeof o === 'string' ? B(o) : o, B('\nendobj\n')]);
    parti.push(b);
    pos += b.length;
  });
  const x = pos;
  parti.push(B(`xref\n0 ${obiecte.length + 1}\n0000000000 65535 f \n${off.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`));
  parti.push(B(`trailer\n<< /Size ${obiecte.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF\n`));
  return Buffer.concat(parti);
}

/** Pagina de 72 × 72 pt (25,4 mm) cu conținutul dat; obiectele 5… se adaugă după ea. */
export const pagina = (continut: string, extra = '', obiecte: ReadonlyArray<string | Buffer> = []): Buffer => pdf([
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 72 72] /Contents 4 0 R ${extra} >>`,
  flux('', continut),
  ...obiecte,
]);

/** Un PDF cu câte o pagină de 72 × 72 pt pe fiecare conținut dat, în ordine. */
export function pagini(continuturi: readonly string[]): Buffer {
  const n = continuturi.length;
  const kids = continuturi.map((_, k) => `${3 + 2 * k} 0 R`).join(' ');
  return pdf([
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${kids}] /Count ${n} >>`,
    ...continuturi.flatMap((c, k) => [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 72 72] /Contents ${4 + 2 * k} 0 R >>`, flux('', c)]),
  ]);
}
