/**
 * Imprimantele ținute în browser și căutarea lor în rețea (ADR 0190 §B.5), ca la mașini (ADR 0136), într-o listă a lor
 * (`cncvs2.imprimanta.retea`, `v: 1`, cel mult 8, cea folosită ultima prima): adresa, portul, modelul și numele spuse de
 * imprimantă. Omul alege din listă; nimic nu se leagă singur. Parolele n-au loc aici (9999 n-are parolă).
 *
 * Căutarea, doar la clic: portul 9999 pe fiecare gazdă a rețelelor /24 știute (ale imprimantelor ținute), altfel
 * 192.168.0.x și 192.168.1.x, cu aceleași plafoane ca a mașinilor (32 deodată, 9 s pe deschidere: Chrome întârzie fiecare
 * WebSocket nou după multe încercări fără răspuns). O gazdă e imprimanta dacă răspunde ca ea (bătaia inimii sau starea) la
 * citirea stării; i se trimite doar citirea și `ok`.
 */
import { adresaRetea, CONCURENTA_RETEA, esteIpv4, permisiuneRetea, primulGasit, TIMP_DESCHIDERE_RETEA_MS, type AdresaRetea } from '../reteaLocala.ts';
import { CERERE_STARE, citesteCadru, esteCreality, PORT_CREALITY, RASPUNS_INIMA } from './creality.ts';
import type { FabricaWsText, MotivImprimanta } from './sesiune.ts';

export const CHEIE_IMPRIMANTE = 'cncvs2.imprimanta.retea';
export const MAX_IMPRIMANTE = 8;

export type ImprimantaTinuta = {
  /** `adresa|port`, cu adresa mică. */
  readonly id: string;
  readonly adresa: string;
  readonly port: number;
  readonly model: string | null;
  readonly nume: string | null;
  /** Ordinea: cea folosită ultima, prima (ms). */
  readonly folosita: number;
};

export const idImprimanta = (adresa: string, port: number): string => `${adresa.trim().toLowerCase()}|${port}`;

const portBun = (p: unknown): p is number => typeof p === 'number' && Number.isInteger(p) && p >= 1 && p <= 65535;
const textSau = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v.slice(0, 120) : null);

/** Citirea tolerantă: o listă stricată sau altă versiune înseamnă nicio imprimantă ținută; un rând stricat se sare. */
export function citesteImprimante(text: string | null): readonly ImprimantaTinuta[] {
  if (text === null) return [];
  let o: unknown;
  try {
    o = JSON.parse(text);
  } catch {
    return [];
  }
  if (typeof o !== 'object' || o === null || (o as { v?: unknown }).v !== 1) return [];
  const lista = (o as { imprimante?: unknown }).imprimante;
  if (!Array.isArray(lista)) return [];
  const out: ImprimantaTinuta[] = [];
  for (const x of lista) {
    if (typeof x !== 'object' || x === null) continue;
    const r = x as Record<string, unknown>;
    const adresa = r['adresa'];
    const port = r['port'];
    if (typeof adresa !== 'string' || !portBun(port)) continue;
    // Doar adrese pe care browserul le-ar lăsa (un IP local sau un nume `.local`).
    if (!adresaRetea(adresa, port).ok) continue;
    const id = idImprimanta(adresa, port);
    if (out.some((y) => y.id === id)) continue;
    out.push({ id, adresa, port, model: textSau(r['model']), nume: textSau(r['nume']), folosita: typeof r['folosita'] === 'number' ? r['folosita'] : 0 });
  }
  return out.sort((a, b) => b.folosita - a.folosita).slice(0, MAX_IMPRIMANTE);
}

export const scrieImprimante = (l: readonly ImprimantaTinuta[]): string => JSON.stringify({
  v: 1,
  imprimante: l.map(({ adresa, port, model, nume, folosita }) => ({ adresa, port, model, nume, folosita })),
});

/**
 * O imprimantă legată: intră prima în listă (sau își ia locul acolo, cu ce a spus acum), iar lista rămâne de cel mult 8. Una cu
 * același nume la altă adresă e aceeași imprimantă, cu IP-ul schimbat (numele K1 poartă sfârșitul MAC-ului, „K1C-8578”): intrarea
 * veche iese.
 */
export function tineImprimanta(
  l: readonly ImprimantaTinuta[],
  c: { readonly adresa: string; readonly port: number; readonly model: string | null; readonly nume: string | null },
  acum: number,
): readonly ImprimantaTinuta[] {
  const id = idImprimanta(c.adresa, c.port);
  const veche = l.find((x) => x.id === id);
  const nume = c.nume ?? veche?.nume ?? null;
  const noua: ImprimantaTinuta = {
    id, adresa: c.adresa.trim(), port: c.port, model: c.model ?? veche?.model ?? null, nume,
    folosita: Math.max(acum, ...l.map((x) => x.folosita + 1)),
  };
  return [noua, ...l.filter((x) => x.id !== id && (nume === null || x.nume !== nume))].slice(0, MAX_IMPRIMANTE);
}

export const uitaImprimanta = (l: readonly ImprimantaTinuta[], id: string): readonly ImprimantaTinuta[] => l.filter((x) => x.id !== id);

/** Rețelele /24 de căutat: ale IP-urilor știute, altfel 192.168.0 și 192.168.1 (ca la mașini, ADR 0136 §2). */
export function reteleDeCautat(ipuri: readonly string[]): readonly string[] {
  const retele: string[] = [];
  for (const ip of ipuri) {
    if (!esteIpv4(ip)) continue;
    const r = ip.split('.').slice(0, 3).join('.');
    if (!retele.includes(r)) retele.push(r);
  }
  return retele.length > 0 ? retele : ['192.168.0', '192.168.1'];
}

export type Gasita = { readonly adresa: AdresaRetea; readonly model: string | null; readonly nume: string | null };
export type RezultatSondaImprimanta = { readonly ok: true; readonly gasita: Gasita } | { readonly ok: false; readonly motiv: MotivImprimanta | 'oprit' };

export type OptiuniSondaImprimanta = {
  readonly fabrica?: FabricaWsText;
  readonly timpDeschidereMs?: number;
  readonly timpRaspunsMs?: number;
  readonly semnal?: AbortSignal;
  readonly permisiune?: () => Promise<string | null>;
};

const fabricaBrowser: FabricaWsText = (url) => new WebSocket(url) as unknown as ReturnType<FabricaWsText>;

/**
 * O încercare pe o adresă: deschiderea, citirea stării și primul răspuns al imprimantei (modelul și numele, dacă le spune).
 * Trimite doar citirea și `ok` la o bătaie a inimii; închide legătura la final.
 */
export function sondeazaImprimanta(adresa: AdresaRetea, opt: OptiuniSondaImprimanta = {}): Promise<RezultatSondaImprimanta> {
  const ws = (opt.fabrica ?? fabricaBrowser)(adresa.url);
  return new Promise((rezolva) => {
    let gata = false;
    let deschis = false;
    let model: string | null = null;
    let nume: string | null = null;
    const ceasuri: ReturnType<typeof setTimeout>[] = [];
    const incheie = (r: RezultatSondaImprimanta): void => {
      if (gata) return;
      gata = true;
      for (const c of ceasuri) clearTimeout(c);
      opt.semnal?.removeEventListener('abort', oprit);
      ws.onopen = null; ws.onmessage = null; ws.onclose = null; ws.onerror = null;
      ws.close(1000);
      rezolva(r);
    };
    const oprit = (): void => { incheie({ ok: false, motiv: 'oprit' }); };
    if (opt.semnal?.aborted) { incheie({ ok: false, motiv: 'oprit' }); return; }
    opt.semnal?.addEventListener('abort', oprit);
    const nedeschis = (): void => {
      (opt.permisiune ?? permisiuneRetea)().then(
        (p) => { incheie({ ok: false, motiv: p === 'denied' ? 'retea-permisiune' : 'retea-nedeschis' }); },
        () => { incheie({ ok: false, motiv: 'retea-nedeschis' }); },
      );
    };
    ceasuri.push(setTimeout(() => { if (!deschis) incheie({ ok: false, motiv: 'retea-timp' }); }, opt.timpDeschidereMs ?? TIMP_DESCHIDERE_RETEA_MS));
    ws.onerror = () => { if (!deschis && !gata) nedeschis(); };
    ws.onclose = () => { if (!gata) { if (deschis) incheie({ ok: false, motiv: 'tacut' }); else nedeschis(); } };
    ws.onopen = () => {
      deschis = true;
      ws.send(CERERE_STARE);
      ceasuri.push(setTimeout(() => { incheie({ ok: false, motiv: 'tacut' }); }, opt.timpRaspunsMs ?? 4000));
    };
    ws.onmessage = (e) => {
      if (typeof e.data !== 'string') return;
      const c = citesteCadru(e.data);
      if (c.inima) ws.send(RASPUNS_INIMA);
      if (!esteCreality(c)) return;
      model = c.stare.model ?? model;
      nume = c.stare.nume ?? nume;
      // Primul cadru ajunge; dacă e doar bătaia inimii, mai așteaptă puțin starea, cu modelul și numele.
      if (c.inima && model === null && nume === null) {
        ceasuri.push(setTimeout(() => { incheie({ ok: true, gasita: { adresa, model, nume } }); }, 1500));
        return;
      }
      incheie({ ok: true, gasita: { adresa, model, nume } });
    };
  });
}

/**
 * Căutarea în toată rețeaua (la clic): portul 9999 pe toate gazdele rețelelor date, `CONCURENTA_RETEA` deodată; prima
 * imprimantă găsită oprește restul. Cu permisiunea rețelei locale încă neîntrebată, prima gazdă merge singură, cât omul
 * răspunde la întrebarea browserului. `laProgres` primește câte gazde s-au terminat, din câte. Cu `nume`, doar imprimanta cu
 * numele acela (una legată, cu IP-ul schimbat: 3.6i, imprimanta owner-ului și-a schimbat adresa de două ori într-o zi).
 */
export async function cautaInRetea(retele: readonly string[], opt: OptiuniSondaImprimanta & {
  readonly laProgres?: (terminate: number, total: number) => void;
  readonly nume?: string;
} = {}): Promise<Gasita | null> {
  const gazde = retele.flatMap((r) => Array.from({ length: 254 }, (_, k) => `${r}.${k + 1}`));
  const total = gazde.length;
  const incearca = async (i: number, semnal: AbortSignal): Promise<Gasita | null> => {
    const a = adresaRetea(gazde[i] ?? '', PORT_CREALITY);
    if (!a.ok) return null;
    const r = await sondeazaImprimanta(a.adresa, { ...opt, semnal });
    return r.ok && (opt.nume === undefined || r.gasita.nume === opt.nume) ? r.gasita : null;
  };
  const p = await (opt.permisiune ?? permisiuneRetea)().catch(() => null);
  let inceput = 0;
  if (p === 'prompt' && total > 0) {
    const prima = await incearca(0, opt.semnal ?? new AbortController().signal);
    opt.laProgres?.(1, total);
    if (prima !== null) return prima;
    inceput = 1;
  }
  if (opt.semnal?.aborted) return null;
  const rest = await primulGasit(total - inceput, (i, semnal) => incearca(i + inceput, semnal), {
    concurenta: CONCURENTA_RETEA,
    ...(opt.semnal ? { semnal: opt.semnal } : {}),
    laProgres: (n) => { opt.laProgres?.(n + inceput, total); },
  });
  return rest?.rezultat ?? null;
}
