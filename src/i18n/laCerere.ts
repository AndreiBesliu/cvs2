import { esteFisierMesaje, fisierMesaje, type FisierMesaje, type ModulMesaje } from '../../shared/mesaje.ts';
import { adaugaMesaje } from './t.ts';

/**
 * Mesajele modulelor încărcate la cerere (ADR 0086), aduse ca date (`mesaje/<modul>.json`, în precache), nu ca
 * JavaScript: un modul își cere mesajele când se evaluează (`<modul>.ts` cheamă `cereMesaje`), exportă `mesaje = mesajeGata()`,
 * iar cine îl încarcă o așteaptă înainte să-l randeze (`cuMesaje`, în `t.ts`). Vin ambele limbi deodată, ca înainte (limba se schimbă fără să mai aștepte
 * nimic). O cerere căzută (fără rețea, înainte de precache) rămâne ținută minte ca eșec, până o așteaptă cineva: atunci se
 * cere din nou, iar dacă iar cade, așteptarea e respinsă (modulul nu se arată fără textele lui).
 */
type Cerere = { readonly p: Promise<void>; stare: 'asteapta' | 'ok' | 'esuat' };
const cereri = new Map<ModulMesaje, Cerere>();

async function adu(m: ModulMesaje): Promise<FisierMesaje> {
  const r = await fetch(`/${fisierMesaje(m)}`);
  if (!r.ok) throw new Error(`mesajele ${m}: HTTP ${r.status}`);
  const x: unknown = await r.json();
  if (!esteFisierMesaje(x)) throw new Error(`mesajele ${m}: fișierul nu are forma așteptată`);
  return x;
}

/** Mesajele modulului `m`, în ambele limbi (un fișier), aduse o singură dată (aceeași promisiune), sau din nou după un eșec. */
export function cereMesaje(m: ModulMesaje): Promise<void> {
  const veche = cereri.get(m);
  if (veche && veche.stare !== 'esuat') return veche.p;
  const c: Cerere = {
    p: adu(m).then((f) => { adaugaMesaje(f); }),
    stare: 'asteapta',
  };
  c.p.then(() => { c.stare = 'ok'; }, () => { c.stare = 'esuat'; });
  cereri.set(m, c);
  return c.p;
}

/** Toate mesajele cerute până acum au venit; una căzută se cere din nou, iar dacă iar cade, promisiunea e respinsă. */
export function mesajeGata(): Promise<void> {
  return Promise.all([...cereri.keys()].map((m) => cereMesaje(m))).then(() => undefined);
}

