import type { Document, ElementDoc, FormaDoc } from '../model/document.ts';
import { anuleaza, executa, reface, type Istoric } from '../model/jurnal.ts';
import type { Actiune } from './actiuni.ts';

/**
 * Acțiunile documentului din etapa 1: adaugă dreptunghiul și cercul, mută și șterge selecția, anulează și reface.
 * Contextul e starea curentă și felul în care se scrie înapoi; acțiunile sunt pure față de restul interfeței.
 */
export type ContextDocument = {
  readonly istoric: () => Istoric;
  readonly scrie: (h: Istoric) => void;
  readonly selectie: () => readonly string[];
  readonly selecteaza: (ids: readonly string[]) => void;
  /** Deplasarea cerută pentru „mută”, în mm (gestul o pune aici înainte de rulare). */
  readonly deplasare?: () => { readonly dx: number; readonly dy: number };
};

const IDENTITATE = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

/** Primul id liber de forma `e<n>`. */
export function idNou(doc: Document): string {
  const folosite = new Set(doc.elemente.map((e) => e.id));
  let n = doc.elemente.length + 1;
  while (folosite.has(`e${n}`)) n++;
  return `e${n}`;
}

function adauga(ctx: ContextDocument, forma: FormaDoc, e: number, f: number): void {
  const h = ctx.istoric();
  const nou: ElementDoc = { id: idNou(h.doc), forma, matrice: { ...IDENTITATE, e, f } };
  ctx.scrie(executa(h, { tip: 'adauga', element: nou, pozitie: h.doc.elemente.length }));
  ctx.selecteaza([nou.id]);
}

export const ACTIUNI_DOCUMENT: readonly Actiune<ContextDocument>[] = [
  {
    id: 'document.adauga-dreptunghi',
    eticheta: 'actiune.adauga-dreptunghi',
    capabilitate: 'desen',
    activa: () => true,
    ruleaza: (ctx) => {
      adauga(ctx, { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 }, 20, 20);
    },
  },
  {
    id: 'document.adauga-cerc',
    eticheta: 'actiune.adauga-cerc',
    capabilitate: 'desen',
    activa: () => true,
    ruleaza: (ctx) => {
      adauga(ctx, { tip: 'cerc', raza: 15 }, 70, 50);
    },
  },
  {
    id: 'document.muta-selectia',
    eticheta: 'actiune.muta-selectia',
    capabilitate: 'desen',
    activa: (ctx) => (ctx.selectie().length === 0 ? 'motiv.nicio-selectie' : ctx.deplasare ? true : 'motiv.nicio-deplasare'),
    ruleaza: (ctx) => {
      const d = ctx.deplasare?.() ?? { dx: 0, dy: 0 };
      if (!Number.isFinite(d.dx) || !Number.isFinite(d.dy) || (d.dx === 0 && d.dy === 0)) return;
      let h = ctx.istoric();
      for (const id of ctx.selectie()) {
        const vechi = h.doc.elemente.find((e) => e.id === id);
        if (!vechi) continue;
        const nou: ElementDoc = { ...vechi, matrice: { ...vechi.matrice, e: vechi.matrice.e + d.dx, f: vechi.matrice.f + d.dy } };
        h = executa(h, { tip: 'inlocuieste', vechi, nou });
      }
      ctx.scrie(h);
    },
  },
  {
    id: 'document.sterge-selectia',
    eticheta: 'actiune.sterge-selectia',
    capabilitate: 'desen',
    activa: (ctx) => (ctx.selectie().length === 0 ? 'motiv.nicio-selectie' : true),
    ruleaza: (ctx) => {
      let h = ctx.istoric();
      for (const id of ctx.selectie()) {
        const pozitie = h.doc.elemente.findIndex((e) => e.id === id);
        const element = h.doc.elemente[pozitie];
        if (element) h = executa(h, { tip: 'sterge', element, pozitie });
      }
      ctx.scrie(h);
      ctx.selecteaza([]);
    },
  },
  {
    id: 'istoric.anuleaza',
    eticheta: 'actiune.anuleaza',
    capabilitate: 'desen',
    activa: (ctx) => (ctx.istoric().trecut.length === 0 ? 'motiv.nimic-de-anulat' : true),
    ruleaza: (ctx) => { ctx.scrie(anuleaza(ctx.istoric())); },
  },
  {
    id: 'istoric.reface',
    eticheta: 'actiune.reface',
    capabilitate: 'desen',
    activa: (ctx) => (ctx.istoric().viitor.length === 0 ? 'motiv.nimic-de-refacut' : true),
    ruleaza: (ctx) => { ctx.scrie(reface(ctx.istoric())); },
  },
];
