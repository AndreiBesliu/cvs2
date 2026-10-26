import type { Program, Scula } from '../ir/ir.ts';
import type { Montaj } from '../ir/montaj.ts';
import type { Contract } from './contract.ts';
import { posteaza, posteazaPeScule, type OptiuniPost, type Sectiune } from './post.ts';

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
  /** Unde începe în program lucrarea fiecărei operații, apoi finalul (ADR 0046): pentru rezumatul jobului. */
  readonly sectiuni: readonly Sectiune[];
};

/** Un fișier al exportului: cu strategia „fișiere separate” (ADR 0084), scula lui; altfel null (programul întreg). */
export type FisierExportat = ProgramExportat & { readonly scula: Scula | null };

export async function sha256Hex(octeti: Uint8Array<ArrayBuffer>): Promise<string> {
  const rezumat = await crypto.subtle.digest('SHA-256', octeti);
  return [...new Uint8Array(rezumat)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Octeții și amprenta unui text de program (ASCII strict). */
async function codifica(
  r: { readonly text: string; readonly linii: number; readonly aproximari: number; readonly sectiuni: readonly Sectiune[] }, extensie: string,
): Promise<ProgramExportat | null> {
  const octeti = new TextEncoder().encode(r.text);
  if (octeti.length !== r.text.length) return null;
  return { text: r.text, octeti, sha256: await sha256Hex(octeti), linii: r.linii, extensie, aproximari: r.aproximari, sectiuni: r.sectiuni };
}

/**
 * Exportul: `fisiere` sunt fișierele de descărcat (unul, sau câte unul pe sculă cu strategia `fisiere-separate`), iar
 * `exportat` e primul dintre ele (singurul, în afara fișierelor separate).
 */
export async function exporta(
  program: Program, montaj: Montaj, contract: Contract, optiuni: OptiuniPost,
): Promise<
  | { readonly ok: true; readonly exportat: ProgramExportat; readonly fisiere: readonly FisierExportat[] }
  | { readonly ok: false; readonly motiv: string }
> {
  const ascii = { ok: false, motiv: 'programul conține caractere în afara ASCII' } as const;
  if (optiuni.strategieScula === 'fisiere-separate') {
    const r = posteazaPeScule(program, montaj, contract, optiuni);
    if (!r.ok) return r;
    const fisiere: FisierExportat[] = [];
    for (const f of r.fisiere) {
      const c = await codifica(f, contract.extensie);
      if (!c) return ascii;
      fisiere.push({ ...c, scula: f.scula });
    }
    const prim = fisiere[0];
    if (!prim) return { ok: false, motiv: 'programul n-are nicio tăiere' };
    return { ok: true, exportat: prim, fisiere };
  }
  const r = posteaza(program, montaj, contract, optiuni);
  if (!r.ok) return r;
  const c = await codifica(r, contract.extensie);
  if (!c) return ascii;
  return { ok: true, exportat: c, fisiere: [{ ...c, scula: null }] };
}
