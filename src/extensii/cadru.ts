/**
 * Cadrul izolat al unei extensii (ADR 0127 §D), partea lui cvs2: iframe-ul cu sandbox (`allow-scripts`, fără origine, nimic
 * delegat), pagina lui din `shared/cadruExtensie.ts` și portul prin care trec toate mesajele. La încărcarea cadrului, cvs2
 * îi trimite o singură dată fișierele pachetului, contextul (limba, tema) și portul; apoi doar prin port. În v1, orice
 * serviciu cerut cu `host.cere` se refuză (3.Xb aduce senderul și stocarea).
 */
import type { ContextHost } from '../../extensii/api.ts';
import { paginaCadru } from '../../shared/cadruExtensie.ts';
import type { ExtensieInstalata } from './depozit.ts';

export type EvenimentCadru =
  | { readonly tip: 'pornit' }
  | { readonly tip: 'inchide' }
  | { readonly tip: 'esuat'; readonly mesaj: string }
  | { readonly tip: 'eroare'; readonly mesaj: string; readonly stiva: string };

/**
 * Variabilele temei lui cvs2 pe care le primește o extensie (`src/app/stil.css`, rădăcina): suprafețele (`--s-panou` e
 * fundalul unui panou; `--fond` e voalul translucid de sub ferestre, nu un fundal), textul, accentul, marginile.
 */
export const JETOANE_TEMA = [
  '--s-panou', '--s-peste', '--s-ales', '--t', '--t-slab', '--a', '--a-plin', '--t-pe-a', '--rosu', '--l-margine', '--l-focus',
  '--l-camp', '--fond',
] as const;

/** Tema de acum, cum o vede cadrul: valorile calculate ale variabilelor de pe rădăcină. */
export function temaDeAcum(): Record<string, string> {
  const s = getComputedStyle(document.documentElement);
  return Object.fromEntries(JETOANE_TEMA.map((k) => [k, s.getPropertyValue(k).trim()]));
}

const text = (x: unknown, max: number): string => String(x).slice(0, max);

/** Pornește extensia în `container`; întoarce schimbarea contextului și oprirea (cadrul scos, portul închis). */
export function pornesteCadru(container: HTMLElement, ext: ExtensieInstalata, context: ContextHost, laEveniment: (e: EvenimentCadru) => void): {
  readonly context: (c: ContextHost) => void;
  readonly opreste: () => void;
} {
  const f = document.createElement('iframe');
  f.setAttribute('sandbox', 'allow-scripts');
  f.className = 'cadru-extensie';
  f.title = ext.manifest.nume;
  f.dataset['extensie'] = ext.id;
  f.srcdoc = paginaCadru();
  const canal = new MessageChannel();
  const port = canal.port1;
  port.onmessage = (e: MessageEvent) => {
    const m = e.data as Record<string, unknown> | null;
    if (!m || typeof m !== 'object') return;
    switch (m.tip) {
      case 'cerere':
        port.postMessage({ tip: 'raspuns', id: m.id, ok: false, eroare: `serviciu-necunoscut:${text(m.serviciu, 40)}` });
        return;
      case 'pornit':
      case 'inchide':
        laEveniment({ tip: m.tip });
        return;
      case 'esuat':
        laEveniment({ tip: 'esuat', mesaj: text(m.mesaj, 500) });
        return;
      case 'eroare':
        laEveniment({ tip: 'eroare', mesaj: text(m.mesaj, 500), stiva: text(m.stiva, 4000) });
        return;
    }
  };
  f.addEventListener('load', () => {
    const fisiere: Record<string, ArrayBuffer> = {};
    for (const [c, b] of Object.entries(ext.fisiere)) fisiere[c] = b.slice().buffer;
    // Originea cadrului e opacă: doar „*” ajunge. Mesajul pleacă spre fereastra cadrului, încărcată chiar acum din `srcdoc`.
    f.contentWindow?.postMessage(
      { tip: 'cvs2-extensie-porneste', intrare: ext.manifest.intrare, stiluri: ext.manifest.stiluri, fisiere, context }, '*', [canal.port2],
    );
  }, { once: true });
  container.append(f);
  return {
    context: (c) => { port.postMessage({ tip: 'context', context: c }); },
    opreste: () => { port.close(); f.remove(); },
  };
}
