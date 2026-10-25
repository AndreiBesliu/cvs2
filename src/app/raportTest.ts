import type { Tutorial } from '../../shared/tutorial.ts';
import type { StarePas, StareTest } from './stocareTest.ts';

/**
 * Raportul testului pas cu pas (ADR 0072): un singur fișier HTML, citit de om în browser și de asistent ca date. Are
 * rezultatele (starea, nota, ora), pozele planșei încorporate (`data:` URL, fără server) și, la final, aceleași date în
 * `<script type="application/json" id="date-raport">`. Pur: pozele vin deja ca `data:` URL.
 */
export type DateRaport = {
  readonly tutorial: Tutorial;
  readonly stare: StareTest;
  /** În ordinea în care au fost făcute. */
  readonly poze: ReadonlyArray<{ readonly pas: string; readonly la: number; readonly src: string }>;
  readonly versiune: string;
  readonly instanta: string;
  readonly browser: string;
  readonly generatLa: number;
};

const ESC: Readonly<Record<string, string>> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ESC[c] ?? c);
const STARI: Readonly<Record<StarePas, string>> = { bine: 'Bine', nu: 'Nu', sarit: 'Sărit' };
const doi = (n: number): string => String(n).padStart(2, '0');
/** Data și ora locale, scrise la fel pe orice browser: 2026-10-25 15:42. */
const ora = (la: number): string => {
  const d = new Date(la);
  return `${d.getFullYear()}-${doi(d.getMonth() + 1)}-${doi(d.getDate())} ${doi(d.getHours())}:${doi(d.getMinutes())}`;
};

/** Numele fișierului: `raport-test-unelte-desen-2026-10-25-1542.html`. */
export function numeRaport(test: string, la: number): string {
  return `raport-test-${test}-${ora(la).replace(' ', '-').replace(':', '')}.html`;
}

/** Câte bine / nu / sărite / rămase (fără stare). */
export function numaratoare(t: Tutorial, s: StareTest): Readonly<Record<StarePas | 'ramas', number>> {
  const n = { bine: 0, nu: 0, sarit: 0, ramas: 0 };
  for (const sec of t.sectiuni) for (const p of sec.pasi) n[s.rezultate[p.id]?.stare ?? 'ramas']++;
  return n;
}

export function raportHtml(d: DateRaport): string {
  const n = numaratoare(d.tutorial, d.stare);
  let k = 0;
  const pasi: unknown[] = [];
  const sectiuni = d.tutorial.sectiuni.map((sec) => `<section><h2>${esc(sec.titlu)}</h2>${sec.pasi.map((p) => {
    k++;
    const r = d.stare.rezultate[p.id];
    const poze = d.poze.filter((x) => x.pas === p.id);
    pasi.push({ nr: k, id: p.id, sectiune: sec.titlu, titlu: p.titlu, stare: r?.stare ?? null, nota: r?.nota ?? '', la: r?.la ?? null, poze: poze.length });
    return `<article id="${esc(p.id)}" class="${r?.stare ?? 'ramas'}"><h3>${k}. ${esc(p.titlu)} · <span>${r?.stare ? STARI[r.stare] : '—'}</span></h3>`
      + `<p><b>Ce faci:</b> ${esc(p.faci)}</p><p><b>Ce trebuie să vezi:</b> ${esc(p.vezi)}</p>`
      + (r?.nota ? `<p class="nota"><b>Nota:</b> ${esc(r.nota)}</p>` : '')
      + poze.map((x, i) => `<figure><img data-pas="${esc(p.id)}" src="${esc(x.src)}" alt="Poza ${i + 1}, pasul ${k}"><figcaption>Poza ${i + 1} · ${ora(x.la)}</figcaption></figure>`).join('')
      + '</article>';
  }).join('')}</section>`).join('');
  const date = {
    schema: 1, test: d.tutorial.id, versiune: d.versiune, instanta: d.instanta, browser: d.browser, generatLa: d.generatLa, ...n, pasi,
  };
  return '<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + `<title>Raportul testului: ${esc(d.tutorial.titlu)}</title><style>`
    + 'body{font:15px/1.5 system-ui,sans-serif;max-width:920px;margin:24px auto;padding:0 16px;color:#1d232b;background:#fbfaf7}'
    + 'article{border-left:4px solid #868b93;padding:4px 12px;margin:12px 0;background:#fff}.bine{border-color:#0a7d53}.nu{border-color:#b3261e}'
    + '.nu h3 span{color:#b3261e}.bine h3 span{color:#0a7d53}h3{margin:4px 0}.nota{background:#fff6e5;padding:4px 8px}'
    + 'img{max-width:100%;border:1px solid #ccc}figure{margin:8px 0}figcaption{font-size:13px;color:#555}</style></head><body>'
    + `<h1>${esc(d.tutorial.titlu)}</h1><p>Versiunea ${esc(d.versiune)} · instanța ${esc(d.instanta)} · ${ora(d.generatLa)}<br>${esc(d.browser)}</p>`
    + `<p><b>${n.bine} bine · ${n.nu} nu · ${n.sarit} sărite · ${n.ramas} rămase</b> · ${d.poze.length} poze</p>${sectiuni}`
    + `<script type="application/json" id="date-raport">${JSON.stringify(date).replace(/</g, '\\u003c')}</script></body></html>`;
}
