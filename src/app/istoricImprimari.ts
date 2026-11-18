/**
 * Istoricul imprimărilor (felia 3.6t, ADR 0194 §B), fără rețea și fără depozit: istoricul cvs2 (fiecare imprimare văzută de
 * fereastră, cu ce știe doar cvs2: numele pieselor, estimarea feliatorului, materialul, procentul la oprire) unit cu istoricul
 * imprimantei (toate imprimările ei, și cele pornite de pe ecran sau din Creality Print); gramele, costul, totalurile lunii,
 * CSV-ul și estimarea care învață. Nimic ghicit: fără prețul materialului, costul e „—”; fără material, doar metrii.
 */
import { ARIE_FILAMENT, MATERIALE, type Material } from '../cam/feliere/profil.ts';
import { numeDin } from '../machine/imprimanta/creality.ts';
import type { FisierImprimanta, ImprimareIstoric, RezultatImprimare } from '../machine/imprimanta/driver.ts';
import { evenimente, LUCREAZA, lucrareNoua, type Clipa } from '../machine/imprimanta/evenimente.ts';

/** O imprimare din istoricul cvs2, ținută în browser (baza `cvs2-imprimanta`, magazia `imprimari`; întrebarea 2: ultimele 500). */
export type ImprimareCvs2 = {
  readonly v: 1;
  /** Cheia, de la prima scriere: începutul și fișierul. */
  readonly id: string;
  readonly fisier: string;
  /** Imprimanta, cu numele spus de ea („K1C-8578”); null: nespus. */
  readonly imprimanta: string | null;
  /** Începutul (ms, ceasul calculatorului): clipa în care fereastra a văzut lucrarea, minus timpul trecut spus de imprimantă. */
  readonly inceput: number;
  /** Finalul (ms) și rezultatul; null: nevăzute (fereastra închisă sau legătura pierdută la final). */
  readonly sfarsit: number | null;
  readonly rezultat: RezultatImprimare | null;
  /** Durata (s) și filamentul (mm) spuse de imprimantă, cele mai mari văzute (la final, ea le poate pune pe 0). */
  readonly durata: number | null;
  readonly filament: number | null;
  /** Ultimul procent văzut cât lucra („oprită la 38 %”). */
  readonly progres: number | null;
  /** Din „Din desen…”: estimarea feliatorului (s), materialul (numele din listă) și numele pieselor din cvs2. */
  readonly estimare: number | null;
  readonly material: string | null;
  readonly piese: readonly string[] | null;
};

const nr = (v: unknown): boolean => typeof v === 'number' && Number.isFinite(v);
const nrNul = (v: unknown): boolean => v === null || nr(v);
const textNul = (v: unknown): boolean => v === null || typeof v === 'string';

/** O înregistrare citită din depozit, dacă are forma bună; una stricată (sau a altei versiuni) se sare. */
export function imprimareCvs2(x: unknown): ImprimareCvs2 | null {
  if (typeof x !== 'object' || x === null) return null;
  const r = x as Record<string, unknown>;
  const p = r['piese'];
  const rez = r['rezultat'];
  const buna = r['v'] === 1 && typeof r['id'] === 'string' && typeof r['fisier'] === 'string' && nr(r['inceput']) && textNul(r['imprimanta'])
    && nrNul(r['sfarsit']) && (rez === null || rez === 'gata' || rez === 'oprita' || rez === 'eroare') && nrNul(r['durata'])
    && nrNul(r['filament']) && nrNul(r['progres']) && nrNul(r['estimare']) && textNul(r['material'])
    && (p === null || (Array.isArray(p) && p.every((s) => typeof s === 'string')));
  return buna ? (x as ImprimareCvs2) : null;
}

/** Cât pot diferi începuturile aceleiași imprimări: ceasul imprimantei, o legare din nou la mijloc, pregătirea. */
export const TOLERANTA_MS = 10 * 60_000;
export const MAX_IMPRIMARI = 500;

const maxim = (a: number | null, b: number | null): number | null => (a === null ? b : b === null ? a : Math.max(a, b));

/**
 * Lista după scrierea unei imprimări (pur), cele mai noi întâi, cel mult `MAX_IMPRIMARI`, și imprimarea așa cum se scrie: aceeași
 * cheie se înlocuiește; altfel, una neîncheiată a aceluiași fișier, pe aceeași imprimantă, cu începutul apropiat (aceeași
 * lucrare, văzută din nou după o legare din nou sau o pagină redeschisă) se contopește cu ea: cheia și începutul rămân cele
 * vechi, cifrele cele mai mari.
 */
export function cuImprimare(toate: readonly ImprimareCvs2[], r: ImprimareCvs2): { readonly lista: ImprimareCvs2[]; readonly nou: ImprimareCvs2 } {
  const k = toate.findIndex((x) => x.id === r.id);
  const j = k >= 0 ? k
    : toate.findIndex((x) => x.sfarsit === null && x.fisier === r.fisier && x.imprimanta === r.imprimanta && Math.abs(x.inceput - r.inceput) <= TOLERANTA_MS);
  const v = toate[j];
  const nou: ImprimareCvs2 = v === undefined ? r : {
    ...r, id: v.id, inceput: v.inceput, sfarsit: r.sfarsit ?? v.sfarsit, rezultat: r.rezultat ?? v.rezultat, durata: maxim(v.durata, r.durata),
    filament: maxim(v.filament, r.filament), progres: r.progres ?? v.progres, estimare: r.estimare ?? v.estimare, material: r.material ?? v.material,
    piese: r.piese ?? v.piese,
  };
  return { lista: [...toate.filter((_, i) => i !== j), nou].sort((a, b) => b.inceput - a.inceput).slice(0, MAX_IMPRIMARI), nou };
}

/** Un rând al cardului Istoricul: o imprimare, din una sau din ambele surse. */
export type RandIstoric = {
  readonly inceput: number;
  readonly fisier: string;
  readonly imprimanta: string | null;
  readonly piese: readonly string[] | null;
  readonly rezultat: RezultatImprimare | null;
  readonly durata: number | null;
  readonly progres: number | null;
  /** Estimarea: a feliatorului cvs2, altfel cea din lista imprimantei. */
  readonly estimare: number | null;
  readonly filament: number | null;
  /** Materialul: din cvs2, din lista imprimantei sau din numele fișierului; null: necunoscut. */
  readonly material: string | null;
  /** Fișierul a fost feliat în cvs2 („Din desen…”): doar el învață estimarea. */
  readonly dinCvs2: boolean;
};

/** Un material din lista felierului, după nume sau fel, fără majuscule („PLA High Speed”, „petg”); null: necunoscut. */
export function materialDupa(text: string | null): Material | null {
  if (text === null) return null;
  const x = text.trim().toLowerCase();
  return MATERIALE.find((m) => m.nume.toLowerCase() === x) ?? MATERIALE.find((m) => m.tip.toLowerCase() === x) ?? null;
}

/**
 * Materialul din numele fișierului, cum îl scriu Creality Print și cvs2: `<nume>_<material>_<timp>.gcode` („3DBenchy_PLA_19m.gcode”,
 * „…_Hyper PLA_49m.gcode”), căutat de la timp spre început; null: niciunul știut.
 */
export function materialDinNume(fisier: string): Material | null {
  for (const p of fisier.replace(/\.gcode$/i, '').split('_').slice(1, -1).reverse()) {
    const m = materialDupa(p) ?? materialDupa(p.split(' ').pop() ?? null);
    if (m !== null) return m;
  }
  return null;
}

/**
 * Cele două istorice unite (pur), cele mai noi întâi: o imprimare a imprimantei și una a cvs2 sunt aceeași dacă au același
 * fișier, începuturi la cel mult `TOLERANTA_MS` și aceeași imprimantă (când amândouă o spun); perechile cele mai apropiate se
 * leagă întâi, câte una. Ce spune imprimanta (rezultatul, durata, filamentul) trece înaintea celor văzute de fereastră; ce
 * știe doar cvs2 (piesele, estimarea, materialul) vine din cvs2; altfel, estimarea și materialul din lista imprimantei.
 */
export function uneste(imp: readonly ImprimareIstoric[] | null, cvs2: readonly ImprimareCvs2[], imprimanta: string | null, fisiere: readonly FisierImprimanta[] | null): RandIstoric[] {
  const din = imp ?? [];
  const perechi: { readonly a: number; readonly b: number; readonly d: number }[] = [];
  din.forEach((x, a) => {
    cvs2.forEach((y, b) => {
      const d = Math.abs(x.inceput - y.inceput);
      if (x.fisier === y.fisier && d <= TOLERANTA_MS && (y.imprimanta === null || imprimanta === null || y.imprimanta === imprimanta)) perechi.push({ a, b, d });
    });
  });
  perechi.sort((p, q) => p.d - q.d);
  const pereche = new Map<number, ImprimareCvs2>();
  const luate = new Set<number>();
  for (const p of perechi) {
    const y = cvs2[p.b];
    if (y === undefined || pereche.has(p.a) || luate.has(p.b)) continue;
    pereche.set(p.a, y);
    luate.add(p.b);
  }
  const lista = new Map((fisiere ?? []).map((f) => [f.nume, f]));
  const rand = (x: ImprimareIstoric | null, y: ImprimareCvs2 | null): RandIstoric => {
    const fisier = y?.fisier ?? x?.fisier ?? '';
    const f = lista.get(fisier);
    return {
      inceput: y?.inceput ?? x?.inceput ?? 0, fisier, imprimanta: y?.imprimanta ?? (x === null ? null : imprimanta), piese: y?.piese ?? null,
      rezultat: x?.rezultat ?? y?.rezultat ?? null, durata: x?.durata ?? y?.durata ?? null, progres: y?.progres ?? null,
      estimare: y?.estimare ?? f?.timp ?? null, filament: x?.filament ?? y?.filament ?? null,
      material: y?.material ?? f?.material ?? materialDinNume(fisier)?.nume ?? null, dinCvs2: (y?.estimare ?? null) !== null,
    };
  };
  return [...din.map((x, a) => rand(x, pereche.get(a) ?? null)), ...cvs2.filter((_, b) => !luate.has(b)).map((y) => rand(null, y))]
    .sort((p, q) => q.inceput - p.inceput);
}

/**
 * Ce primesc cardul Istoricul și „Din desen…” (estimarea care învață, costul): rândurile unite, câte imprimări are istoricul
 * cvs2, setările și imprimanta (cea legată, altfel ultima ținută).
 */
export type Istoric = {
  readonly randuri: readonly RandIstoric[];
  readonly nCvs2: number;
  readonly setari: SetariIstoric;
  readonly schimba: (s: SetariIstoric) => void;
  readonly imprimanta: string | null;
};

/** Gramele din filament (mm, Ø 1,75), cu densitatea materialului; null fără material știut. */
export function grame(mm: number | null, material: string | null): number | null {
  const m = materialDupa(material);
  return mm === null || m === null ? null : ((mm * ARIE_FILAMENT) / 1000) * m.densitate;
}

/** Setările istoricului (`cvs2.imprimanta.istoric`, `v: 1`), fără valori ghicite (ADR 0194 §B.10). */
export type SetariIstoric = {
  /** Prețul pe kg (lei) al fiecărui fel de material din lista felierului (PLA, PETG…); lipsă: costul e „—”. */
  readonly preturi: Readonly<Record<string, number>>;
  /** Puterea medie a imprimantei (W) și prețul kWh (lei): curentul intră în cost doar cu amândouă. */
  readonly putere: number | null;
  readonly kwh: number | null;
  /** Corectează estimarea din „Din desen…” după istoric. */
  readonly corecteaza: boolean;
};

export const SETARI_ISTORIC: SetariIstoric = { preturi: {}, putere: null, kwh: null, corecteaza: true };
export const CHEIE_ISTORIC = 'cvs2.imprimanta.istoric';
/** Felurile de material cu preț: cele din lista felierului (PLA, PLA-CF, PETG, ABS, ASA, PC, PA-CF, TPU). */
export const FELURI_MATERIAL: readonly string[] = [...new Set(MATERIALE.map((m) => m.tip))];

const inInterval = (v: unknown, max: number): number | null => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max ? v : null);
export const MAX_PRET = 100_000;
export const MAX_PUTERE = 10_000;
export const MAX_KWH = 100;

type Depozit = Pick<Storage, 'getItem' | 'setItem'>;
const depozit = (): Depozit | null => {
  try { return globalThis.localStorage ?? null; } catch { return null; }
};

/** Setările ținute; o valoare lipsă sau stricată ia implicitul ei, iar un preț doar pentru un fel de material știut. */
export function citesteSetariIstoric(d: Depozit | null = depozit()): SetariIstoric {
  try {
    const x = JSON.parse(d?.getItem(CHEIE_ISTORIC) ?? 'null') as Record<string, unknown> | null;
    if (typeof x !== 'object' || x === null || x['v'] !== 1) return SETARI_ISTORIC;
    const p = typeof x['preturi'] === 'object' && x['preturi'] !== null ? x['preturi'] as Record<string, unknown> : {};
    const preturi: Record<string, number> = {};
    for (const f of FELURI_MATERIAL) {
      const v = Object.hasOwn(p, f) ? inInterval(p[f], MAX_PRET) : null;
      if (v !== null) preturi[f] = v;
    }
    return {
      preturi, putere: inInterval(x['putere'], MAX_PUTERE), kwh: inInterval(x['kwh'], MAX_KWH),
      corecteaza: typeof x['corecteaza'] === 'boolean' ? x['corecteaza'] : SETARI_ISTORIC.corecteaza,
    };
  } catch {
    return SETARI_ISTORIC;
  }
}

export function scrieSetariIstoric(s: SetariIstoric, d: Depozit | null = depozit()): void {
  try {
    d?.setItem(CHEIE_ISTORIC, JSON.stringify({ v: 1, ...s }));
  } catch {
    // Fără stocare: setările țin doar cât pagina.
  }
}

/** Prețul pe kg al materialului (după felul lui); null: nepus sau material necunoscut. */
export function pretKg(s: SetariIstoric, material: string | null): number | null {
  const m = materialDupa(material);
  return m !== null && Object.hasOwn(s.preturi, m.tip) ? (s.preturi[m.tip] ?? null) : null;
}

/**
 * Costul unei imprimări (lei): filamentul, cu prețul pe kg al materialului, plus curentul (puterea medie × durata × prețul kWh),
 * dacă le-ai pus pe amândouă; null fără prețul materialului (nimic ghicit).
 */
export function cost(r: Pick<RandIstoric, 'durata' | 'filament' | 'material'>, s: SetariIstoric): number | null {
  const g = grame(r.filament, r.material);
  const p = pretKg(s, r.material);
  if (g === null || p === null) return null;
  const curent = s.putere !== null && s.kwh !== null && r.durata !== null ? (s.putere / 1000) * (r.durata / 3600) * s.kwh : 0;
  return (g / 1000) * p + curent;
}

export type Totaluri = { readonly n: number; readonly secunde: number; readonly grame: number; readonly cost: number | null };

/** Totalurile lunii lui `acum` (ceasul local): imprimările, timpul, gramele știute și costul știut (null: niciunul). */
export function totaluriLuna(randuri: readonly RandIstoric[], s: SetariIstoric, acum: Date): Totaluri {
  let n = 0;
  let secunde = 0;
  let g = 0;
  let c: number | null = null;
  for (const r of randuri) {
    const d = new Date(r.inceput);
    if (d.getFullYear() !== acum.getFullYear() || d.getMonth() !== acum.getMonth()) continue;
    n++;
    secunde += r.durata ?? 0;
    g += grame(r.filament, r.material) ?? 0;
    const x = cost(r, s);
    if (x !== null) c = (c ?? 0) + x;
  }
  return { n, secunde, grame: g, cost: c };
}

const doi = (x: number): string => String(x).padStart(2, '0');

/** Celula CSV (RFC 4180): între ghilimele când trebuie; un text care ar porni o formulă în Excel (=, +, -, @) primește un apostrof. */
function celula(v: string | number | null, sep: string, zecimala: string, cifre = 1): string {
  if (v === null) return '';
  if (typeof v === 'number') return v.toFixed(cifre).replace('.', zecimala);
  const t = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return t.includes(sep) || /["\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

/**
 * Istoricul ca CSV, cu antetul dat (în limba ferestrei): data (ceasul local), fișierul, piesele, imprimanta, rezultatul, durata și
 * estimarea (min), filamentul (m), gramele, materialul, costul (lei). Separatorul și virgula zecimală, ale limbii (ro: `;` și `,`).
 */
export function csvIstoric(randuri: readonly RandIstoric[], s: SetariIstoric, o: {
  readonly antet: readonly string[]; readonly sep: ';' | ','; readonly zecimala: ',' | '.'; readonly rezultat: (r: RezultatImprimare) => string;
}): string {
  const c = (v: string | number | null, cifre?: number): string => celula(v, o.sep, o.zecimala, cifre);
  const linii = randuri.map((r) => {
    const d = new Date(r.inceput);
    const data = `${d.getFullYear()}-${doi(d.getMonth() + 1)}-${doi(d.getDate())} ${doi(d.getHours())}:${doi(d.getMinutes())}`;
    const min = (x: number | null): number | null => (x === null ? null : x / 60);
    return [
      c(data), c(r.fisier), c(r.piese === null ? null : r.piese.join(', ')), c(r.imprimanta), c(r.rezultat === null ? null : o.rezultat(r.rezultat)),
      c(min(r.durata)), c(min(r.estimare)), c(r.filament === null ? null : r.filament / 1000, 2), c(grame(r.filament, r.material)), c(r.material),
      c(cost(r, s), 2),
    ].join(o.sep);
  });
  return [o.antet.map((x) => c(x)).join(o.sep), ...linii].join('\r\n') + '\r\n';
}

/** Cel puțin atâtea imprimări încheiate, din ultimele `ULTIMELE_IMPRIMARI`, ca estimarea să învețe (ADR 0194 §B.11). */
export const MIN_IMPRIMARI = 3;
export const ULTIMELE_IMPRIMARI = 10;

/**
 * Raportul învățat: mediana duratei reale față de estimarea feliatorului, din ultimele cel mult `ULTIMELE_IMPRIMARI` imprimări
 * duse la capăt ale fișierelor feliate în cvs2, pe imprimanta și materialul date; null sub `MIN_IMPRIMARI` sau fără imprimantă.
 * Un raport absurd (sub 0,2 sau peste 5: o durată stricată) nu intră.
 */
export function invatat(randuri: readonly RandIstoric[], imprimanta: string | null, material: string): { readonly raport: number; readonly n: number } | null {
  if (imprimanta === null) return null;
  const rap = [...randuri].sort((a, b) => b.inceput - a.inceput)
    .filter((r) => r.dinCvs2 && r.rezultat === 'gata' && r.imprimanta === imprimanta && r.material === material)
    .map((r) => (r.durata ?? 0) / (r.estimare ?? 0))
    .filter((q) => Number.isFinite(q) && q >= 0.2 && q <= 5)
    .slice(0, ULTIMELE_IMPRIMARI);
  if (rap.length < MIN_IMPRIMARI) return null;
  const s = [...rap].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  const raport = s.length % 2 === 1 ? (s[m] ?? 1) : ((s[m - 1] ?? 1) + (s[m] ?? 1)) / 2;
  return { raport, n: rap.length };
}

/** Ce știe cvs2 despre fișierul lucrării de acum, dacă l-a trimis el (fișierele ținute, 3.6q). */
export type DinFisier = { readonly estimare: number | null; readonly material: string | null; readonly piese: readonly string[] | null };

/** O clipă a ferestrei pentru înregistrare: cea a evenimentelor (3.6s) și procentul. */
export type ClipaIstoric = Clipa & { readonly progres: number | null };

/**
 * Un pas al înregistrării în istoricul cvs2 (pur): din clipa de dinainte și cea de acum, imprimarea urmărită și ce e de scris.
 * O lucrare nouă, văzută cu legătura vie, pornește o înregistrare (scrisă pe loc: o pagină închisă la mijloc n-o pierde); cât
 * lucrează, durata, filamentul și procentul cresc în ea, iar ce știe cvs2 despre fișier vine când e citit (scrisă din nou);
 * finalul și oprirea (evenimentele 3.6s, cu cifrele de dinaintea finalului) o încheie.
 */
export function inregistreaza(cur: ImprimareCvs2 | null, a: ClipaIstoric | null, b: ClipaIstoric, acum: number, imprimanta: string | null, f: DinFisier | null): {
  readonly cur: ImprimareCvs2 | null; readonly scrie: ImprimareCvs2 | null;
} {
  const fin = evenimente(a, b).find((e) => e.fel === 'gata' || e.fel === 'oprita');
  if (cur !== null && fin !== undefined && fin.fisier !== null && numeDin(fin.fisier) === cur.fisier) {
    const gata = fin.fel === 'gata';
    return {
      cur: null,
      scrie: {
        ...cur, sfarsit: acum, rezultat: gata ? 'gata' : 'oprita', durata: maxim(cur.durata, fin.durata), filament: maxim(cur.filament, fin.filament),
        progres: gata ? 100 : cur.progres,
      },
    };
  }
  if (b.legatura !== 'vie' || b.fisier === null) return { cur, scrie: null };
  const fisier = numeDin(b.fisier);
  if (lucrareNoua(a, b)) {
    const inceput = acum - (b.trecut ?? 0) * 1000;
    const r: ImprimareCvs2 = {
      v: 1, id: `${inceput}|${fisier}`, fisier, imprimanta, inceput, sfarsit: null, rezultat: null, durata: b.trecut, filament: b.filament,
      progres: b.progres, estimare: f?.estimare ?? null, material: f?.material ?? null, piese: f?.piese ?? null,
    };
    return { cur: r, scrie: r };
  }
  if (cur === null || cur.fisier !== fisier || !LUCREAZA.has(b.lucrare)) return { cur, scrie: null };
  const cuFisier = f !== null && cur.estimare === null && cur.piese === null && (f.estimare !== null || f.piese !== null);
  const r: ImprimareCvs2 = {
    ...cur, durata: maxim(cur.durata, b.trecut), filament: maxim(cur.filament, b.filament), progres: b.progres ?? cur.progres,
    ...(cuFisier ? { estimare: f.estimare, material: f.material, piese: f.piese } : {}),
  };
  return { cur: r, scrie: cuFisier ? r : null };
}
