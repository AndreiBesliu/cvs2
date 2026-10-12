import type { Actiune } from './actiuni.ts';
import type { ContextImport, FisierImport, PrevizualizareImport } from './actiuniImportTipuri.ts';

export * from './actiuniImportTipuri.ts';

const calcul = () => import('./actiuniImportCalcul.ts');

/**
 * Ușa SVG (parserul, geometria, imbricarea cu indexul) se încarcă la primul import: nu intră în pachetul de pornire. Dacă
 * nu se poate aduce (o publicare nouă a schimbat fișierele, rețeaua), refuzul spune asta, nu „fișierul nu e un SVG”
 * (recenzia 2.7c).
 */
async function previzualizeaza(f: FisierImport, pxPeTol: 96 | 72, limba: string): Promise<PrevizualizareImport> {
  let modul: Awaited<ReturnType<typeof calcul>>;
  try {
    modul = await calcul();
  } catch {
    return { ok: false, cod: 'neincarcat' };
  }
  return modul.previzualizareSvg(f, pxPeTol, limba);
}

/** Ușa, adusă în fundal după pornire (ca dialogurile): prima previzualizare nu așteaptă rețeaua. */
export function preincarcaImport(): void {
  void calcul().catch(() => undefined);
}

export const ACTIUNI_IMPORT: readonly Actiune<ContextImport>[] = [
  {
    id: 'import.svg',
    eticheta: 'actiune.importa-svg',
    capabilitate: 'desen',
    activa: (ctx) => (ctx.doarCitire() ? 'motiv.doar-citire' : true),
    ruleaza: (ctx) => {
      const f = ctx.fisier();
      if (!f) return;
      void previzualizeaza(f, ctx.pxPeTol(), ctx.limba()).then(ctx.rezultat, (e: unknown) => {
        ctx.jurnal?.(e);
        ctx.rezultat({ ok: false, cod: 'parsare', detaliu: e instanceof Error ? e.message : String(e) });
      });
    },
  },
];
