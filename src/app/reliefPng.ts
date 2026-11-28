/**
 * Relieful ca imagine pe 16 biți (ADR 0322, felia 18.1↑g), adus la primul clic: straturile vizibile citite din baza
 * reliefurilor, compuse și scrise ca PNG în workerul reliefului (`spre-png`), apoi descărcate. Lipsa unui strat din browser
 * se spune, nu se exportă un relief fără el.
 */
import type { FormaRelief } from '../model/document.ts';
import { reliefInBazin } from '../jobs/bazinRelief.ts';
import { citesteStrat } from './reliefStocare.ts';

/** Numele fișierului: numele reliefului, fără caracterele oprite de sistemele de fișiere, cu `.png`. */
export function numePng(nume: string): string {
  // Un relief adus dintr-un astfel de fișier își ține numele: sufixul nu se dublează.
  const baza = nume.replace(/\.[a-z0-9]{2,4}$/i, '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-').trim().replace(/-16bit$/, '').slice(0, 120);
  return `${baza === '' ? 'relief' : baza}-16bit.png`;
}

/** Exportă compusul ca PNG pe 16 biți și îl descarcă: `ok`, `lipsa` (un strat vizibil nu e în browser) sau `eroare`. */
export async function exportaReliefPng(f: FormaRelief, nume: string): Promise<'ok' | 'lipsa' | 'eroare'> {
  const straturi = [];
  for (const s of f.straturi) {
    if (!s.vizibil) continue;
    const st = await citesteStrat(s.dale);
    if (!st) return 'lipsa';
    straturi.push({ mod: s.mod, vizibil: true, harta: st.text, octeti: st.octeti });
  }
  const r = await reliefInBazin({ tip: 'spre-png', nx: f.nx, ny: f.ny, celula: f.celula, straturi }, { transfera: true });
  if (!r.ok || r.tip !== 'png') return r.ok ? 'eroare' : r.cod === 'dale-lipsa' ? 'lipsa' : 'eroare';
  const url = URL.createObjectURL(new Blob([r.octeti], { type: 'image/png' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = numePng(nume);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); }, 10_000);
  return 'ok';
}
