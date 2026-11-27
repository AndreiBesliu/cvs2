/**
 * Rândul unei operații în lista ferestrei exportului (constatarea 14 a auditului, partea listei; felia 28.8↑s): pe primul rând,
 * numele piesei când omul i-a dat unul (un import își ia numele din fișier, „logo-80mm”), altfel forma și mărimea primului
 * element, fără loc; pe al doilea, mai mic, locul lui pe foaie. Numele întreg (`descriere`, cu locul) rămâne al titlului fișei,
 * al barei de jos și al refuzurilor. Numerele, ca acolo (`numarDescriere`). Textele sunt ale modulului exportului: modulul îl
 * aduce doar fereastra exportului, după mesajele ei.
 */
import { t } from '../i18n/t.ts';
import { cutieElement } from '../model/forme.ts';
import type { ElementLume } from '../model/lume.ts';
import { numarDescriere as nr } from './descriereElement.ts';

/** Ce arată rândul: `nume` pe primul rând, `unde` (locul pe foaie; gol fără element) pe al doilea. */
export type RandLista = { readonly nume: string; readonly unde: string };

/** Forma și mărimea elementului, fără loc. */
function forma(e: Pick<ElementLume, 'forma' | 'matrice'>): string {
  if (e.forma.tip === 'dreptunghi') return t('export.lista.forma.dreptunghi', { latime: nr(e.forma.latime), inaltime: nr(e.forma.inaltime) });
  if (e.forma.tip === 'cerc') return t('export.lista.forma.cerc', { raza: nr(e.forma.raza) });
  if (e.forma.tip === 'relief') {
    const s = Math.hypot(e.matrice.a, e.matrice.b), f = e.forma;
    return t('export.lista.forma.relief', { latime: nr(f.nx * f.celula * s), inaltime: nr(f.ny * f.celula * s) });
  }
  const c = cutieElement(e);
  // O cale deschisă are n − 1 segmente (ADR 0037 §2, §12), ca în numele întreg.
  const n = e.forma.varfuri.length - (e.forma.inchis ? 0 : 1);
  return t(e.forma.inchis ? 'export.lista.forma.cale' : 'export.lista.forma.cale-deschisa', { latime: nr(c.maxX - c.minX), inaltime: nr(c.maxY - c.minY), n });
}

/** Locul elementului pe foaie: colțul dreptunghiului, centrul cercului, colțul cutiei căii sau al reliefului. */
function unde(e: Pick<ElementLume, 'forma' | 'matrice'>): string {
  const { e: x, f: y } = e.matrice;
  if (e.forma.tip === 'dreptunghi') return t('export.lista.unde', { x: nr(x), y: nr(y) });
  if (e.forma.tip === 'cerc') return t('export.lista.unde.centru', { x: nr(x), y: nr(y) });
  const c = cutieElement(e);
  return t('export.lista.unde', { x: nr(c.minX), y: nr(c.minY) });
}

/**
 * Rândul operației care taie `noduri` elemente, primul fiind `e` (lipsă: piesa nu mai are nodul în lume), al piesei `piesa`.
 * Un nume gol sau doar din spații nu e al omului; peste un element, rândul spune câte mai are („(+2)”).
 */
export function randLista(e: Pick<ElementLume, 'forma' | 'matrice'> | undefined, piesa: { readonly id: string; readonly nume?: string }, noduri: number): RandLista {
  const dat = piesa.nume !== undefined && piesa.nume.trim() !== '' ? piesa.nume : undefined;
  const baza = dat ?? (e ? forma(e) : piesa.id);
  return { nume: noduri > 1 ? `${baza} (+${noduri - 1})` : baza, unde: e ? unde(e) : '' };
}
