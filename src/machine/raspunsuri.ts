/**
 * Ce trimite controlerul, linie cu linie (ADR 0080, `docs/PORTARE.md` §3.5): `ok`, `error:N`, `ALARM:N`, rapoartele `<…>`,
 * bannerul de pornire, mesajele `[MSG:…]` și datele (`[GC:…]`, `[G54:…]`, `$N=…`). Rapoartele se citesc pe N axe (T22, ADR
 * 0022): `MPos`, `WPos` și `WCO` cu oricâte valori; o poziție necunoscută e `null`, nu un număr.
 */

export type StareMasina = 'Idle' | 'Run' | 'Hold' | 'Jog' | 'Alarm' | 'Door' | 'Check' | 'Home' | 'Sleep';
const STARI: ReadonlySet<string> = new Set(['Idle', 'Run', 'Hold', 'Jog', 'Alarm', 'Door', 'Check', 'Home', 'Sleep']);

/** O poziție, cu cadrul ei: a mașinii (`MPos`) sau de lucru (`WPos`, în WCS-ul activ). */
export type Pozitie = { readonly cadru: 'masina' | 'lucru'; readonly valori: readonly number[] };

export type Raport = {
  readonly stare: StareMasina;
  /** Sub-starea: `Hold:0` (oprit de tot) diferă de `Hold:1` (încă frânează); `Door:0`–`3`. */
  readonly sub: number | null;
  readonly pozitie: Pozitie | null;
  /** Decalajul de lucru (`WCO`), când raportul îl poartă (GRBL îl trimite din când în când). */
  readonly wco: readonly number[] | null;
  /** `Bf`: blocurile libere ale planificatorului și octeții liberi ai bufferului. */
  readonly buffer: { readonly planificator: number; readonly rx: number } | null;
  /** `FS` (sau `F`): avansul și turația de acum. */
  readonly avans: number | null;
  readonly turatie: number | null;
  readonly override: { readonly avans: number; readonly rapid: number; readonly ax: number } | null;
};

export type Raspuns =
  | { readonly tip: 'ok' }
  | { readonly tip: 'eroare'; readonly cod: number }
  | { readonly tip: 'alarma'; readonly cod: number }
  | { readonly tip: 'raport'; readonly raport: Raport }
  | { readonly tip: 'banner'; readonly text: string }
  | { readonly tip: 'mesaj'; readonly text: string }
  | { readonly tip: 'date'; readonly text: string }
  | { readonly tip: 'necunoscut'; readonly text: string };

/** Numerele unui câmp (`1.000,-2.500,0`), sau null dacă unul nu e număr. */
function numere(text: string): number[] | null {
  const v = text.split(',').map((x) => (/^[-+]?(\d+\.?\d*|\.\d+)$/.test(x) ? Number(x) : Number.NaN));
  return v.length > 0 && v.every(Number.isFinite) ? v : null;
}

function raport(interior: string): Raport | null {
  const [cap = '', ...campuri] = interior.split('|');
  const [nume = '', subText] = cap.split(':');
  if (!STARI.has(nume)) return null;
  const sub = subText === undefined ? null : /^\d+$/.test(subText) ? Number(subText) : Number.NaN;
  if (Number.isNaN(sub)) return null;
  let pozitie: Pozitie | null = null, wco: number[] | null = null, buffer: Raport['buffer'] = null;
  let avans: number | null = null, turatie: number | null = null, override: Raport['override'] = null;
  for (const c of campuri) {
    const i = c.indexOf(':');
    if (i < 0) return null;
    const cheie = c.slice(0, i), valoare = c.slice(i + 1);
    const n = numere(valoare);
    switch (cheie) {
      case 'MPos': case 'WPos':
        if (!n) return null;
        pozitie = { cadru: cheie === 'MPos' ? 'masina' : 'lucru', valori: n };
        break;
      case 'WCO':
        if (!n) return null;
        wco = n;
        break;
      case 'Bf':
        if (!n || n.length !== 2) return null;
        buffer = { planificator: n[0] ?? 0, rx: n[1] ?? 0 };
        break;
      case 'FS':
        if (!n || n.length !== 2) return null;
        avans = n[0] ?? null; turatie = n[1] ?? null;
        break;
      case 'F':
        if (!n || n.length !== 1) return null;
        avans = n[0] ?? null;
        break;
      case 'Ov':
        if (!n || n.length !== 3) return null;
        override = { avans: n[0] ?? 100, rapid: n[1] ?? 100, ax: n[2] ?? 100 };
        break;
      // Pinii (`Pn`), linia (`Ln`), accesoriile (`A`) și câmpurile altor controlere: citite, nefolosite încă.
      default: break;
    }
  }
  return { stare: nume as StareMasina, sub, pozitie, wco, buffer, avans, turatie, override };
}

/** O linie de la controler (fără `\r\n`), clasificată. */
export function citesteRaspuns(linie: string): Raspuns {
  const t = linie.trim();
  if (t === 'ok') return { tip: 'ok' };
  let m = /^error:(\d+)$/.exec(t);
  if (m) return { tip: 'eroare', cod: Number(m[1]) };
  m = /^ALARM:(\d+)$/.exec(t);
  if (m) return { tip: 'alarma', cod: Number(m[1]) };
  if (t.startsWith('<') && t.endsWith('>')) {
    const r = raport(t.slice(1, -1));
    return r ? { tip: 'raport', raport: r } : { tip: 'necunoscut', text: t };
  }
  if (/^Grbl \S+/.test(t)) return { tip: 'banner', text: t };
  m = /^\[MSG:(.*)\]$/.exec(t);
  if (m) return { tip: 'mesaj', text: m[1] ?? '' };
  if (/^\[[A-Z0-9.]+:.*\]$/.test(t) || /^\$\d+=/.test(t)) return { tip: 'date', text: t };
  return { tip: 'necunoscut', text: t };
}

/**
 * Poziția de lucru: din `WPos`, sau din `MPos` minus ultimul `WCO` cunoscut; null când nu se știe (nicio poziție, sau `MPos`
 * fără `WCO`, sau un număr diferit de axe).
 */
export function pozitieDeLucru(r: Raport, wco: readonly number[] | null): Pozitie | null {
  if (!r.pozitie) return null;
  if (r.pozitie.cadru === 'lucru') return r.pozitie;
  const w = r.wco ?? wco;
  if (!w || w.length !== r.pozitie.valori.length) return null;
  return { cadru: 'lucru', valori: r.pozitie.valori.map((v, k) => v - (w[k] ?? 0)) };
}
