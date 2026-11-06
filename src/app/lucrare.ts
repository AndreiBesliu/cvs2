import type { StareMasina } from '../../extensii/api.ts';
import { semnal } from '../ui/CipuriVedere.tsx';

/**
 * O lucrare pornită și neterminată pe mașină (ADR 0132 §6): o scrie fereastra Mașina, din sesiune, iar carcasa o citește, ca
 * „Reîncarcă” (versiunea nouă) să aștepte sfârșitul lucrării. În pornire stă doar semnalul, nu senderul; până la prima
 * deschidere a Mașinii nu există sesiune, deci nici lucrare.
 */
export const lucrarePornita = semnal(false);

/** Starea mașinii, cum o vede o extensie (ADR 0160 §B): forma din `HostApi`, fără poziție, jurnal sau setări. */
export type StareMasinaExtensie = StareMasina;
/** Răspunsul ferestrei Mașina; un refuz e codul lui (`neconectat`, `renuntat`…), fără prefixul serviciului. */
export type RezultatMasina = { readonly ok: true; readonly rezultat: unknown } | { readonly ok: false; readonly cod: string };
/**
 * Ce dă fereastra Mașina gazdei extensiilor (ADR 0160 §B, §E): senderul paginii, cu regulile lui. `extensie` e numele care
 * apare omului (în confirmare, lângă program). Pornirea și reluarea întreabă omul; `anuleaza` închide, ca „Nu”, întrebarea
 * unei extensii oprite (fără nume: pe oricare, cât fereastra Mașina se demontează).
 */
export interface MasinaPentruExtensii {
  stare(): StareMasinaExtensie;
  aboneaza(f: () => void): () => void;
  incarca(nume: string, octeti: Uint8Array, extensie: string): Promise<RezultatMasina>;
  porneste(extensie: string): Promise<RezultatMasina>;
  reia(extensie: string): Promise<RezultatMasina>;
  pauza(): RezultatMasina;
  opreste(): RezultatMasina;
  anuleaza(extensie?: string): void;
}
/** Învelișul ferestrei Mașina, pus cât e montată; până la prima ei deschidere, null. */
export const masinaPentruExtensii = semnal<MasinaPentruExtensii | null>(null);
