import type { Actiune } from './actiuni.ts';
import type { ContextImport, FisierImport, PrevizualizareImport } from './actiuniImportTipuri.ts';
import type { OptiuniPrevizualizare } from './actiuniImportCalcul.ts';

export * from './actiuniImportTipuri.ts';

const calcul = () => import('./actiuniImportCalcul.ts');

/**
 * Ușile (SVG: parserul, geometria; DXF și PDF: cititoarele; imbricarea cu indexul) se încarcă la primul import: nu intră
 * în pachetul de pornire. Dacă nu se pot aduce (o publicare nouă a schimbat fișierele, rețeaua), refuzul spune asta, nu
 * „fișierul nu e un SVG” (recenzia 2.7c).
 */
async function previzualizeaza(f: FisierImport, o: OptiuniPrevizualizare): Promise<PrevizualizareImport> {
  let modul: Awaited<ReturnType<typeof calcul>>;
  try {
    modul = await calcul();
  } catch {
    return { ok: false, cod: 'neincarcat' };
  }
  return modul.previzualizare(f, o);
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
      const unitate = ctx.unitate?.();
      const pagina = ctx.pagina?.();
      const o = { pxPeTol: ctx.pxPeTol(), limba: ctx.limba(), ...(unitate ? { unitate } : {}), ...(pagina ? { pagina } : {}) };
      void previzualizeaza(f, o).then(ctx.rezultat, (e: unknown) => {
        ctx.jurnal?.(e);
        ctx.rezultat({ ok: false, cod: 'parsare', detaliu: e instanceof Error ? e.message : String(e) });
      });
    },
  },
];
