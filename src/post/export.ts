import type { Program } from '../ir/ir.ts';
import type { Montaj } from '../ir/montaj.ts';
import type { Contract } from './contract.ts';
import { posteaza, type OptiuniPost } from './post.ts';

/**
 * Exportul: octeții exacți ai programului și amprenta lor SHA-256. Senderul trimite exact octeții ăștia și arată același
 * hash (T20), iar placa de probă îi leagă de cotele măsurate.
 */
export type ProgramExportat = {
  readonly text: string;
  readonly octeti: Uint8Array<ArrayBuffer>;
  readonly sha256: string;
  readonly linii: number;
  readonly extensie: string;
  /** Arcele scrise ca segmente G1 (raza peste garda contractului), cu abaterea ≤ `TOLERANTA_APROXIMARE` (T2). */
  readonly aproximari: number;
};

export async function sha256Hex(octeti: Uint8Array<ArrayBuffer>): Promise<string> {
  const rezumat = await crypto.subtle.digest('SHA-256', octeti);
  return [...new Uint8Array(rezumat)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function exporta(
  program: Program, montaj: Montaj, contract: Contract, optiuni: OptiuniPost,
): Promise<{ readonly ok: true; readonly exportat: ProgramExportat } | { readonly ok: false; readonly motiv: string }> {
  const r = posteaza(program, montaj, contract, optiuni);
  if (!r.ok) return r;
  const octeti = new TextEncoder().encode(r.text);
  if (octeti.length !== r.text.length) return { ok: false, motiv: 'programul conține caractere în afara ASCII' };
  return {
    ok: true,
    exportat: { text: r.text, octeti, sha256: await sha256Hex(octeti), linii: r.linii, extensie: contract.extensie, aproximari: r.aproximari },
  };
}
