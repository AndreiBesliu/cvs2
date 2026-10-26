/**
 * Senderul legat de emulator, pentru probe (ADR 0080): acțiunile `scrie` ajung la emulator, liniile lui se întorc ca evenimente
 * `primit`, ceasul cere rapoarte (`tic`), iar evenimentele programate (comenzile omului, întâmplările emulatorului) vin la timpul
 * lor. Ce scrie senderul și ce primește emulatorul se numără separat (regula 10).
 */
import { EmulatorGrbl } from '../../src/machine/emulator.ts';
import { pas, type Actiune, type Eveniment, type Faza, type StareFlux } from '../../src/machine/flux.ts';

export type Programat =
  | { readonly la: number; readonly e: Eveniment }
  | { readonly la: number; readonly emulator: (e: EmulatorGrbl) => void };

export type Rulare = {
  readonly stare: StareFlux;
  readonly actiuni: readonly Actiune[];
  readonly timp: number;
  /** Cea mai mare sumă ținută de sender. */
  readonly sumaMaxima: number;
  /** Fazele prin care a trecut, în ordine (fără repetări alăturate). */
  readonly faze: readonly Faza[];
};

export function ruleaza(emu: EmulatorGrbl, s0: StareFlux, opt: {
  readonly evenimente?: readonly Programat[];
  readonly tic?: number;
  readonly pasMs?: number;
  readonly pana?: (s: StareFlux) => boolean;
  readonly timpMaxim?: number;
} = {}): Rulare {
  const tic = opt.tic ?? 50, pasMs = opt.pasMs ?? 1, timpMaxim = opt.timpMaxim ?? 1e7;
  const pana = opt.pana ?? ((s: StareFlux) => s.faza === 'terminat' || s.faza === 'pierdut');
  const de = [...(opt.evenimente ?? [])].sort((a, b) => a.la - b.la);
  let s = s0, t = 0, sumaMaxima = 0;
  const actiuni: Actiune[] = [];
  const faze: Faza[] = [s.faza];
  const aplica = (r: { readonly stare: StareFlux; readonly actiuni: readonly Actiune[] }): void => {
    s = r.stare;
    sumaMaxima = Math.max(sumaMaxima, s.suma);
    if (faze.at(-1) !== s.faza) faze.push(s.faza);
    for (const a of r.actiuni) {
      if (a.tip === 'scrie') emu.scrie(a.octeti);
      else actiuni.push(a);
    }
  };
  const citeste = (): void => {
    for (let l = emu.citeste(); l.length > 0; l = emu.citeste()) for (const linie of l) aplica(pas(s, { tip: 'primit', linie }));
  };
  for (;;) {
    while (de.length > 0 && (de[0]?.la ?? Infinity) <= t) {
      const x = de.shift();
      if (!x) break;
      if ('e' in x) aplica(pas(s, x.e));
      else x.emulator(emu);
      citeste();
    }
    if (t % tic === 0) aplica(pas(s, { tip: 'tic' }));
    citeste();
    if (de.length === 0 && pana(s)) break;
    if (t >= timpMaxim) break;
    emu.timp(pasMs);
    t += pasMs;
    citeste();
  }
  return { stare: s, actiuni, timp: t, sumaMaxima, faze };
}

/** Octeții primiți de emulator, fără cei de timp real ai sesiunii (`?`, `!`, `~`, Ctrl-X). */
export function primitiFaraTimpReal(emu: EmulatorGrbl): string {
  return emu.transcriere().filter((x) => x.dir === 'in').map((x) => x.text).join('').replace(/[?!~\x18]/g, '');
}

export const octeti = (text: string): Uint8Array => Uint8Array.from(text, (c) => c.charCodeAt(0));
