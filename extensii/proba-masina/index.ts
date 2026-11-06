/**
 * Extensia de probă a senderului (ADR 0160): cere prin `host.masina` tot ce poate cere o extensie (starea, încărcarea,
 * pornirea și reluarea, cu confirmarea omului, pauza, oprirea, o lucrare trimisă spre „Lucrarea primită”) și arată pe pagină
 * starea primită la fiecare schimbare și fiecare răspuns, pentru probele e2e. Scrisă fără framework, ca „Salut”.
 */
import type { HostApi, Spatiu, StareMasina } from '../api.ts';

/** Un program bun pentru „Fișier…” (ASCII, LF, G54 înaintea primei mișcări), destul de lung cât să se poată pune pe pauză. */
const PROGRAM = ['G21', 'G90', 'G54', 'G0 Z5', 'G0 X0 Y0', 'G1 Z-1 F300',
  ...Array.from({ length: 40 }, (_, k) => `G1 X${(k % 2) * 40} Y${k * 2} F300`), 'G0 Z5', 'M2', ''].join('\n');
/** Fără sistem de coordonate înaintea primei mișcări: „Fișier…” îl refuză, la linia 1. */
const FARA_WCS = 'G0 X1\n';

async function sha256(text: string): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function activeaza(host: HostApi): Spatiu {
  return {
    deschide(container: HTMLElement): void {
      const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '', attr: Record<string, string> = {}): HTMLElementTagNameMap[K] => {
        const e = document.createElement(tag);
        e.textContent = text;
        for (const [k, v] of Object.entries(attr)) e.setAttribute(k, v);
        return e;
      };
      const stare = el('p', '—', { 'data-proba': 'stare' });
      const rezultate = el('ol', '', { 'data-proba': 'rezultate' });
      const butoane = el('div');
      const arata = (s: StareMasina): void => {
        stare.textContent = `${s.conectata ? 'conectată' : 'neconectată'} · ${s.faza} · ${s.indicator?.fel ?? '—'} · ${s.program?.nume ?? '—'}`;
        stare.dataset.faza = s.faza;
        stare.dataset.fel = s.indicator?.fel ?? '';
      };
      host.masina.laStare(arata);
      const b = (id: string, f: () => Promise<unknown>): void => {
        const x = el('button', id, { type: 'button', 'data-proba-masina': id });
        x.addEventListener('click', () => {
          void f().then(
            (r) => { rezultate.append(el('li', `${id}: ${JSON.stringify(r)}`, { 'data-rezultat': id })); },
            (e: unknown) => { rezultate.append(el('li', `${id}: ${e instanceof Error ? e.message : String(e)}`, { 'data-rezultat': id })); },
          );
        });
        butoane.append(x);
      };
      b('stare', async () => { const s = await host.masina.stare(); arata(s); return s.faza; });
      b('incarca', async () => { const r = await host.masina.incarca('proba.nc', PROGRAM); return [r.nume, r.linii]; });
      b('incarca-rau', () => host.masina.incarca('rau.nc', FARA_WCS));
      b('incarca-nume', () => host.masina.incarca('proba.exe', PROGRAM));
      b('porneste', () => host.masina.porneste());
      b('reia', () => host.masina.reia());
      b('pauza', () => host.masina.pauza());
      b('opreste', () => host.masina.opreste());
      b('trimite', async () => {
        const text = PROGRAM;
        const r = await host.masina.trimite({
          protocol: 'cvs2-lucrare', versiune: 1, tip: 'lucrare', id: `p${Date.now().toString(36)}`, titlu: 'Placa de probă',
          de_la: { aplicatie: 'Proba senderului' }, fisiere: [{ nume: 'proba_T1.nc', text, sha256: await sha256(text) }],
        }) as { readonly acceptate?: readonly string[]; readonly renuntat?: boolean };
        return r.renuntat ? 'renuntat' : r.acceptate;
      });
      b('trimite-rau', () => host.masina.trimite({ protocol: 'cvs2-lucrare', tip: 'altceva' }));
      b('porneste-si-inchide', async () => {
        setTimeout(() => { host.inchide(); }, 300);
        return host.masina.porneste();
      });
      container.append(el('h1', 'Proba senderului'), stare, butoane, rezultate);
    },
  };
}
