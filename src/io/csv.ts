/**
 * Tabelul unui CSV pentru plăcuțe (ADR 0210 §4): fișierul (`.csv`, `.txt`) sau celulele lipite din Excel (vin cu tab).
 * Codarea: UTF-8 (cu sau fără BOM), altfel Windows-1250, cum salvează Excel în română un „CSV” simplu; alegerea rămâne la
 * vedere. Separatorul `;`, `,` sau tab, găsit singur: cel cu care cele mai multe rânduri au același număr de coloane (cel puțin
 * două). Ghilimelele, ca în RFC 4180: o celulă între ghilimele poate avea separatorul, rânduri noi și ghilimele dublate.
 * Rândurile goale se sar. Pur, fără document.
 */

export type Separator = ';' | ',' | '\t';
export type Codare = 'utf-8' | 'windows-1250';
export const SEPARATOARE: readonly Separator[] = [';', ',', '\t'];
export const CODARI: readonly Codare[] = ['utf-8', 'windows-1250'];

/** Marginile citirii: fișierul, rândurile (cu antetul) și coloanele unui rând; celula rămâne cât plafonul câmpului. */
export const PLAFON_CSV = { octeti: 5_000_000, randuri: 1_001, coloane: 100 } as const;

/** Textul octeților, cu codarea dată, sau găsită: BOM-ul UTF-8, apoi UTF-8 valid, altfel Windows-1250. */
export function decodeazaCsv(octeti: Uint8Array, codare?: Codare): { readonly text: string; readonly codare: Codare } {
  const bom = octeti[0] === 0xef && octeti[1] === 0xbb && octeti[2] === 0xbf;
  if (bom && codare !== 'windows-1250') return { text: new TextDecoder('utf-8').decode(octeti.subarray(3)), codare: 'utf-8' };
  if (codare) return { text: new TextDecoder(codare).decode(octeti), codare };
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(octeti), codare: 'utf-8' };
  } catch {
    return { text: new TextDecoder('windows-1250').decode(octeti), codare: 'windows-1250' };
  }
}

/**
 * Rândurile textului, celulă cu celulă, cu separatorul dat; cel mult `PLAFON_CSV.randuri` rânduri nevide și
 * `PLAFON_CSV.coloane` coloane (restul se taie: `taiat`). Un BOM rămas la început (o lipire) se scoate.
 */
export function citesteCsv(text: string, sep: Separator): { readonly randuri: string[][]; readonly taiat: boolean } {
  const randuri: string[][] = [];
  let taiat = false;
  let rand: string[] = [];
  let celula = '';
  let ghilimele = false;
  let inCeluleGhilimele = false;
  const t = text.startsWith('\uFEFF') ? text.slice(1) : text;
  const inchideRand = (): boolean => {
    rand.push(celula);
    celula = '';
    inCeluleGhilimele = false;
    if (rand.some((c) => c.trim() !== '')) {
      if (rand.length > PLAFON_CSV.coloane) { rand = rand.slice(0, PLAFON_CSV.coloane); taiat = true; }
      randuri.push(rand);
    }
    rand = [];
    if (randuri.length >= PLAFON_CSV.randuri) { taiat = true; return false; }
    return true;
  };
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (ghilimele) {
      if (c === '"') {
        if (t[i + 1] === '"') { celula += '"'; i++; } else ghilimele = false;
      } else celula += c;
      continue;
    }
    // Ghilimelele deschid o celulă doar la începutul ei; altundeva sunt un caracter ca oricare.
    if (c === '"' && celula === '' && !inCeluleGhilimele) { ghilimele = true; inCeluleGhilimele = true; continue; }
    if (c === sep) { rand.push(celula); celula = ''; inCeluleGhilimele = false; continue; }
    if (c === '\r' || c === '\n') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      if (!inchideRand()) return { randuri, taiat: true };
      continue;
    }
    celula += c;
  }
  if (celula !== '' || rand.length > 0) inchideRand();
  return { randuri, taiat };
}

/**
 * Separatorul găsit: pentru fiecare, primele cel mult 50 de rânduri; scorul e câte au numărul de coloane cel mai des întâlnit
 * (cel puțin două). La egalitate, tab dacă e pe primul rând (celulele lipite din Excel), apoi `;` (Excel în română), apoi `,`.
 */
export function separatorGasit(text: string): Separator {
  const proba = text.slice(0, 20_000);
  const primul = proba.split(/\r\n|\r|\n/, 1)[0] ?? '';
  const ordine: Separator[] = primul.includes('\t') ? ['\t', ';', ','] : [';', ',', '\t'];
  let cel: Separator = ordine[0]!;
  let scor = -1;
  for (const s of ordine) {
    const randuri = citesteCsv(proba, s).randuri.slice(0, 50);
    const numar = new Map<number, number>();
    for (const r of randuri) numar.set(r.length, (numar.get(r.length) ?? 0) + 1);
    let moda = 0, cate = 0;
    for (const [n, k] of numar) if (k > cate || (k === cate && n > moda)) { moda = n; cate = k; }
    const sc = moda >= 2 ? cate : 0;
    if (sc > scor) { scor = sc; cel = s; }
  }
  return cel;
}
