/**
 * Pagina cadrului unei extensii (ADR 0127 §D): `srcdoc`-ul iframe-ului cu sandbox, cu un CSP propriu (mai strict decât al
 * aplicației, pe care îl și moștenește) și un singur script scris în ea, încărcătorul. Încărcătorul primește de la cvs2, o
 * singură dată, fișierele pachetului, contextul (limba, tema) și un `MessagePort`; pune tema pe rădăcină și stilurile ca foi
 * construite, face o adresă `blob:` din modulul de intrare, îl importă, cheamă `activeaza(host)` și `deschide(document.body)`.
 * Tot ce urmează trece prin port: cererile lui `host.cere` (și ale lui `host.stocare`, ADR 0128, învelișuri peste ea),
 * erorile, „inchide”; de la cvs2, contextul nou și răspunsurile.
 *
 * Textul încărcătorului e fix: amprenta lui SHA-256 stă în CSP-ul aplicației (`shared/csp.ts`), iar proba
 * `test/unit/csp.extensii.test.ts` o recalculează. O schimbare a textului cere amprenta nouă.
 */
export const INCARCATOR = `(() => {
  'use strict';
  let pornit = false;
  addEventListener('message', (ev) => {
    const d = ev.data;
    if (pornit || ev.source !== parent || !d || d.tip !== 'cvs2-extensie-porneste' || !ev.ports[0]) return;
    pornit = true;
    void porneste(d, ev.ports[0]);
  });
  async function porneste(d, port) {
    const cereri = new Map(), ascultatori = new Set();
    let nr = 0, context = d.context;
    const trimite = (m) => { port.postMessage(m); };
    const raporteaza = (x) => { trimite({ tip: 'eroare', mesaj: String((x && x.message) || x), stiva: String((x && x.stack) || '') }); };
    const aplicaTema = () => {
      const r = document.documentElement;
      for (const [k, v] of Object.entries(context.tema)) r.style.setProperty(k, v);
      r.lang = context.limba;
    };
    port.onmessage = (e) => {
      const m = e.data;
      if (m && m.tip === 'raspuns') {
        const c = cereri.get(m.id);
        if (!c) return;
        cereri.delete(m.id);
        if (m.ok) c[0](m.rezultat); else c[1](new Error(String(m.eroare)));
      } else if (m && m.tip === 'context') {
        context = m.context;
        aplicaTema();
        for (const f of [...ascultatori]) { try { f(context); } catch (x) { raporteaza(x); } }
      }
    };
    addEventListener('error', (e) => { raporteaza(e.error || e.message); });
    addEventListener('unhandledrejection', (e) => { raporteaza(e.reason); });
    try {
      const fisiere = d.fisiere;
      aplicaTema();
      for (const cale of d.stiluri) {
        const s = new CSSStyleSheet();
        s.replaceSync(new TextDecoder().decode(fisiere[cale]));
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, s];
      }
      const cere = (serviciu, ...argumente) =>
        new Promise((rez, resp) => { const id = ++nr; cereri.set(id, [rez, resp]); trimite({ tip: 'cerere', id, serviciu, argumente }); });
      const host = Object.freeze({
        api: 1,
        get limba() { return context.limba; },
        get tema() { return context.tema; },
        laSchimbare(f) { ascultatori.add(f); return () => { ascultatori.delete(f); }; },
        fisier(cale) { return Object.prototype.hasOwnProperty.call(fisiere, cale) ? new Blob([fisiere[cale]]) : null; },
        raporteaza,
        inchide() { trimite({ tip: 'inchide' }); },
        cere,
        stocare: Object.freeze({
          citeste: (cheie) => cere('stocare.citeste', cheie),
          scrie: (cheie, valoare) => cere('stocare.scrie', cheie, valoare),
          sterge: (cheie) => cere('stocare.sterge', cheie),
          chei: () => cere('stocare.chei'),
        }),
      });
      const url = URL.createObjectURL(new Blob([fisiere[d.intrare]], { type: 'text/javascript' }));
      const modul = await import(url);
      const spatiu = await modul.activeaza(host);
      spatiu.deschide(document.body);
      trimite({ tip: 'pornit' });
    } catch (x) {
      raporteaza(x);
      trimite({ tip: 'esuat', mesaj: String((x && x.message) || x) });
    }
  }
})();`;

/** Amprenta încărcătorului, în forma din CSP: base64(sha256(INCARCATOR)), verificată de `test/unit/csp.extensii.test.ts`. */
export const AMPRENTA_INCARCATOR = "'sha256-4UMxYm1EsuRFXqd3FzD9Gb4F1HM/CBg6d14Y0YzfYDg='";

/**
 * CSP-ul propriu al cadrului, peste cel moștenit de la aplicație: fără rețea (nici `fetch`, nici `ws:` spre mașină), scripturi
 * doar `blob:` (modulul extensiei) și încărcătorul, nimic de la alte site-uri. Stilurile vin ca foi construite sau prin CSSOM.
 */
export const CSP_CADRU = [
  "default-src 'none'",
  `script-src blob: ${AMPRENTA_INCARCATOR}`,
  "style-src 'self'",
  'img-src blob: data:',
  'font-src blob: data:',
  "connect-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

/** Pagina cadrului: meta-ul CSP înaintea încărcătorului, care rulează doar prin amprenta lui. */
export const paginaCadru = (): string =>
  `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${CSP_CADRU}"><script>${INCARCATOR}</script></head><body></body></html>`;
