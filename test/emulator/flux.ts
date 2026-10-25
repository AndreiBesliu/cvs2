/**
 * Fluxul de probă (ADR 0079): numărarea caracterelor, cât să conducă emulatorul în probe (o linie costă octeții ei + 1, iar
 * neconfirmați stau cel mult cât bufferul). **Nu e senderul** (felia 3.6, `src/machine`): n-are bariera, citirile, hold-ul sau
 * reluarea; martorii negativi îi schimbă doar numărarea.
 */
import type { EmulatorGrbl } from './grbl.ts';

/** Cât costă o linie în buffer. */
export type Numarare = (linie: string) => number;
export const OCTETI_PLUS_UNU: Numarare = (l) => new TextEncoder().encode(l).length + 1;

export type RezultatFlux = {
  readonly ok: number;
  readonly erori: readonly { readonly linie: number; readonly cod: string }[];
  /** Ce n-a fost `ok` sau `error:N` (mesajele, rapoartele), plus răspunsurile fără linie. */
  readonly mesaje: readonly string[];
  /** Milisecundele emulatorului până la ultimul răspuns și apoi până la Idle. */
  readonly timp: number;
  /** Fluxul n-a mai putut trimite nimic și nu mai aștepta nimic (o linie mai lungă decât bufferul), sau a trecut `timpMaxim`. */
  readonly blocat: boolean;
};

export function ruleazaFlux(
  linii: readonly string[], e: EmulatorGrbl,
  opt: { readonly numara?: Numarare; readonly pasMs?: number; readonly timpMaxim?: number } = {},
): RezultatFlux {
  const numara = opt.numara ?? OCTETI_PLUS_UNU, pas = opt.pasMs ?? 1, timpMaxim = opt.timpMaxim ?? 1e9;
  const cap = e.contract.rx, cod = new TextEncoder();
  const inZbor: { readonly cost: number; readonly linie: number }[] = [];
  const erori: { linie: number; cod: string }[] = [];
  const mesaje: string[] = [];
  let urm = 0, suma = 0, ok = 0, timp = 0, blocat = false;
  for (;;) {
    while (urm < linii.length) {
      const l = linii[urm] ?? '';
      const c = numara(l);
      if (suma + c > cap) break;
      e.scrie(cod.encode(`${l}\n`));
      inZbor.push({ cost: c, linie: urm });
      suma += c;
      urm++;
    }
    for (const r of e.citeste()) {
      if (r !== 'ok' && !r.startsWith('error:')) { mesaje.push(r); continue; }
      const x = inZbor.shift();
      if (!x) { mesaje.push(`răspuns fără linie: ${r}`); continue; }
      suma -= x.cost;
      if (r === 'ok') ok++;
      else erori.push({ linie: x.linie, cod: r });
    }
    if (urm >= linii.length && inZbor.length === 0) break;
    if (inZbor.length === 0 && urm < linii.length && numara(linii[urm] ?? '') > cap) { blocat = true; break; }
    if (timp >= timpMaxim) { blocat = true; break; }
    e.timp(pas);
    timp += pas;
  }
  while (!blocat && e.stare === 'Run' && timp < timpMaxim) { e.timp(10 * pas); timp += 10 * pas; }
  mesaje.push(...e.citeste().filter((r) => r !== 'ok'));
  return { ok, erori, mesaje, timp, blocat };
}
