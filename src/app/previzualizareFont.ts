import { adresaCss, feteDeAfisare } from '../../shared/fonturiGoogle.ts';

/**
 * Previzualizarea unei variante Google Fonts înainte de descărcare (ADR 0108 §5): CSS API v2 cerut de browser (WOFF2 tăiat
 * pe alfabete, fără textul omului în adresă), fețele adăugate la document sub un nume al lor; browserul aduce doar
 * alfabetele textului afișat. Litera se vede cum o desenează browserul; ce se taie vine din fișierul TTF, după descărcare.
 */
const familii = new Map<string, Promise<string | null>>();
let contor = 0;

export function familieGoogle(familie: string, varianta: string, text: string): Promise<string | null> {
  const cheie = `${familie}:${varianta}`;
  let p = familii.get(cheie);
  if (!p) {
    p = (async (): Promise<string | null> => {
      const r = await fetch(adresaCss(familie, varianta), { credentials: 'omit' });
      if (!r.ok) return null;
      const fete = feteDeAfisare(await r.text());
      if (fete.length === 0) return null;
      const alias = `cncvs2-proba-${++contor}`;
      for (const f of fete) document.fonts.add(new FontFace(alias, `url(${f.url}) format('woff2')`, { unicodeRange: f.interval }));
      return alias;
    })().catch(() => null);
    familii.set(cheie, p);
    // O cerere căzută (fără rețea) se încearcă din nou la afișarea următoare.
    void p.then((a) => { if (!a) familii.delete(cheie); });
  }
  return p.then(async (alias) => {
    if (alias) await document.fonts.load(`16px "${alias}"`, text).catch(() => undefined);
    return alias;
  });
}
