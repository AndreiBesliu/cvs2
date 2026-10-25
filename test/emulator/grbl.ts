/**
 * Emulatorul GRBL 1.1h (ADR 0079), fixtura senderului (T20, ADR 0020). Numără ce **primește** pe fir, nu ce crede senderul că
 * a trimis (`docs/PORTARE.md` §3.4, regula 10). Cifrele și regulile vin din sursele GRBL 1.1 (citite pentru comportament, nu
 * copiate: GPL-3.0):
 * - bufferul serial ține 128 de octeți; un octet care nu mai încape se pierde, tăcut (inelul are 129 de locuri);
 * - octeții de timp real (`?`, `!`, `~`, Ctrl-X, override-urile 0x90–0x9D, 0x84, 0x85, 0x9E, 0xA0, 0xA1) se iau la sosire și nu
 *   intră în buffer; orice alt octet peste 0x7F se aruncă;
 * - o linie păstrează cel mult 79 de caractere (spațiile, caracterele de control și comentariile nu se păstrează, literele mici
 *   urcă în mari); peste, `error:11`; `\n` și `\r` închid fiecare o linie, iar linia goală dă `ok`;
 * - planificatorul are 15 blocuri; `ok`-ul unei mișcări vine când intră în el; o linie care nu are loc stă în buffer; `G4`, `M3`
 *   / `M5`, `M8` / `M9`, `M0`, `M2` / `M30` și `G10` așteaptă golirea lui;
 * - `$#`, `$$`, `$I`, `$H` și setările cer starea Idle sau Alarm (altfel `error:8`); `$G` merge oricând;
 * - avansul și rapidele sunt plafonate de viteza maximă a axelor ($110–$112); override-urile scalează avansul și rapidele.
 * Modelul nostru, de verificat pe transcrierile reale (felia 3.5b; unde diferă, mașina are dreptate): frânarea (`franare` ms, cu
 * poziția oprită pe loc), starea Idle în timpul unei pauze `G4`, poziția din mijlocul unui bloc (pe segment sau pe arc), lipsa
 * accelerației din timpul blocurilor, rapoartele fără `Ov:` și `WCO:`. Ce nu modelează aruncă `Nemodelat`: un test nu trece
 * niciodată pe un răspuns inventat.
 */

export type ContractEmulator = {
  readonly nume: string;
  /** Octeții bufferului serial (RX_BUFFER_SIZE). */
  readonly rx: number;
  /** LINE_BUFFER_SIZE: o linie păstrează cel mult `linie − 1` caractere. */
  readonly linie: number;
  /** Blocurile planificatorului care se pot folosi (BLOCK_BUFFER_SIZE − 1). */
  readonly planificator: number;
  readonly banner: string;
  readonly versiune: string;
  /** Milisecunde de la `!` până la `Hold:0` (modelul frânării). */
  readonly franare: number;
};

export const GRBL_11H: ContractEmulator = {
  nume: 'GRBL 1.1h', rx: 128, linie: 80, planificator: 15, banner: "Grbl 1.1h ['$' for help]", versiune: '1.1h.20190825', franare: 50,
};

/** Ce emulatorul nu modelează (o comandă, un caz): testul cade, nu primește un răspuns inventat. */
export class Nemodelat extends Error {}

export type Stare = 'Idle' | 'Run' | 'Hold:0' | 'Hold:1' | 'Alarm';
export type Eveniment = { readonly t: number; readonly dir: 'in' | 'out'; readonly text: string };
type Vec = { x: number; y: number; z: number };
type Axa = 'x' | 'y' | 'z';
const AXE: readonly Axa[] = ['x', 'y', 'z'];

type Bloc = {
  readonly start: Vec;
  readonly tinta: Vec;
  readonly lungime: number;
  /** Viteza programată (mm/min) și plafonul axelor pe direcția blocului (mm/min). */
  readonly avans: number;
  readonly plafon: number;
  readonly rapid: boolean;
  /** Arcul: centrul, unghiul de pornire, baleiajul (rad, cu semn). */
  readonly arc: { readonly cx: number; readonly cy: number; readonly r: number; readonly u0: number; readonly baleiaj: number } | null;
  parcurs: number;
};

const EPS = 1e-9;
/** Setările implicite (cele din `defaults.h` generic), cu valorile cum le tipărește `$$`. */
const SETARI: ReadonlyArray<readonly [number, number]> = [
  [0, 10], [1, 25], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [10, 1], [11, 0.01], [12, 0.002], [13, 0], [20, 0], [21, 0], [22, 0],
  [23, 0], [24, 25], [25, 500], [26, 250], [27, 1], [30, 1000], [31, 0], [32, 0], [100, 250], [101, 250], [102, 250], [110, 500],
  [111, 500], [112, 500], [120, 10], [121, 10], [122, 10], [130, 200], [131, 200], [132, 200],
];
const INTREGI = new Set([0, 1, 2, 3, 4, 5, 6, 10, 13, 20, 21, 22, 23, 26, 32]);
const TURATII = new Set([30, 31]);
const textSetare = (n: number, v: number): string => (INTREGI.has(n) ? String(Math.trunc(v)) : TURATII.has(n) ? v.toFixed(0) : v.toFixed(3));
const f3 = (v: number): string => (Math.abs(v) < 0.0005 ? 0 : v).toFixed(3);

/** Codurile G acceptate, cu grupa modală (aceeași grupă de două ori pe o linie: nemodelat). */
const GRUPE_G: ReadonlyMap<number, string> = new Map([
  [0, 'miscare'], [1, 'miscare'], [2, 'miscare'], [3, 'miscare'], [80, 'miscare'], [17, 'plan'], [18, 'plan'], [19, 'plan'],
  [90, 'distanta'], [91, 'distanta'], [91.1, 'arc'], [93, 'avans'], [94, 'avans'], [20, 'unitati'], [21, 'unitati'], [40, 'compensare'],
  [43.1, 'lungime'], [49, 'lungime'], [54, 'wcs'], [55, 'wcs'], [56, 'wcs'], [57, 'wcs'], [58, 'wcs'], [59, 'wcs'], [61, 'control'],
  [4, 'nemodal'], [10, 'nemodal'], [28, 'nemodal'], [28.1, 'nemodal'], [30, 'nemodal'], [30.1, 'nemodal'], [53, 'nemodal'],
  [92, 'nemodal'], [92.1, 'nemodal'], [38.2, 'miscare'], [38.3, 'miscare'], [38.4, 'miscare'], [38.5, 'miscare'],
]);
const GRUPE_M: ReadonlyMap<number, string> = new Map([[0, 'program'], [1, 'program'], [2, 'program'], [30, 'program'], [3, 'ax'], [4, 'ax'], [5, 'ax'], [8, 'racire'], [9, 'racire']]);
const LITERE = new Set('FGIJKLMNPRSTXYZ');

type Cuvant = { readonly l: string; readonly v: number };

/** Linia cum o păstrează GRBL: fără spații, caractere de control și comentarii, cu literele urcate; `depasire` peste limită. */
function curata(octeti: readonly number[], limita: number): { readonly text: string; readonly depasire: boolean } {
  let text = '', paranteza = false, punctVirgula = false, depasire = false;
  for (const c of octeti) {
    if (paranteza) { if (c === 0x29) paranteza = false; continue; }
    if (punctVirgula || c <= 0x20) continue;
    if (c === 0x28) { paranteza = true; continue; }
    if (c === 0x3b) { punctVirgula = true; continue; }
    if (text.length >= limita - 1) { depasire = true; continue; }
    text += String.fromCharCode(c >= 0x61 && c <= 0x7a ? c - 32 : c);
  }
  return { text, depasire };
}

/** Cuvintele unei linii G-code, sau codul de eroare: fără literă → 1, numărul greșit → 2, litera necunoscută → 20, repetată → 25. */
function cuvinte(text: string): Cuvant[] | number {
  const out: Cuvant[] = [];
  let i = 0;
  while (i < text.length) {
    const l = text[i] ?? '';
    if (l < 'A' || l > 'Z') return 1;
    const m = /^[-+]?(\d+\.?\d*|\.\d+)/.exec(text.slice(i + 1));
    if (!m) return 2;
    if (!LITERE.has(l)) return 20;
    const v = Number(m[0]);
    if (l !== 'G' && l !== 'M' && out.some((w) => w.l === l)) return 25;
    out.push({ l, v });
    i += 1 + m[0].length;
  }
  return out;
}

export class EmulatorGrbl {
  readonly contract: ContractEmulator;
  readonly contoare = { primiti: 0, pastrati: 0, pierduti: 0, aruncati: 0, timpReal: 0, varfRx: 0, varfPlanificator: 0, linii: 0 };
  readonly override = { avans: 100, rapid: 100, ax: 100 };
  private rx: number[] = [];
  private plan: Bloc[] = [];
  private iesire: string[] = [];
  private jurnal: Eveniment[] = [];
  private ceas = 0;
  private pozMasina: Vec = { x: 0, y: 0, z: 0 };
  /** Poziția parserului (ținta ultimei linii planificate), în coordonatele mașinii. */
  private pozParser: Vec = { x: 0, y: 0, z: 0 };
  private hold: 'Hold:0' | 'Hold:1' | null = null;
  private franareRamasa = 0;
  private alarmat = false;
  private critica = false;
  /** Pauza `G4` în curs (ms rămase); protocolul nu citește bufferul cât ține. */
  private pauza: number | null = null;
  private setari = new Map<number, number>(SETARI.map(([n, v]) => [n, v]));
  private wcs: Vec[] = Array.from({ length: 6 }, () => ({ x: 0, y: 0, z: 0 }));
  private g92: Vec = { x: 0, y: 0, z: 0 };
  private tlo = 0;
  private modal = { miscare: 0, wcs: 0, plan: 17, unitati: 21, distanta: 90, avansMod: 94, ax: 5, racire: 9 };
  private avans = 0;
  private turatie = 0;
  private scula = 0;

  constructor(contract: ContractEmulator = GRBL_11H) {
    this.contract = contract;
  }

  get rxOcupat(): number { return this.rx.length; }
  get planificatorOcupat(): number { return this.plan.length; }
  /** Turația axului, dacă e pornit. */
  get ax(): number { return this.modal.ax === 5 ? 0 : this.turatie; }
  get stare(): Stare {
    if (this.alarmat) return 'Alarm';
    if (this.hold) return this.hold;
    return this.plan.length > 0 ? 'Run' : 'Idle';
  }
  /** Poziția mașinii acum (în mijlocul unui bloc: pe segment sau pe arc). */
  get pozitie(): Vec {
    const b = this.plan[0];
    if (!b || b.parcurs <= 0) return { ...this.pozMasina };
    const k = b.parcurs / b.lungime;
    const z = b.start.z + (b.tinta.z - b.start.z) * k;
    if (!b.arc) return { x: b.start.x + (b.tinta.x - b.start.x) * k, y: b.start.y + (b.tinta.y - b.start.y) * k, z };
    const u = b.arc.u0 + b.arc.baleiaj * k;
    return { x: b.arc.cx + b.arc.r * Math.cos(u), y: b.arc.cy + b.arc.r * Math.sin(u), z };
  }

  /** Octeții primiți pe fir, în ordine: cei de timp real se iau pe loc, restul intră în buffer (cât încape). */
  scrie(date: Uint8Array | string): void {
    const octeti = typeof date === 'string' ? Uint8Array.from(date, (c) => c.charCodeAt(0) & 0xff) : date;
    if (typeof date === 'string' && [...date].some((c) => c.charCodeAt(0) > 0x7f)) throw new Nemodelat('textul cu caractere peste 0x7F se trimite ca octeți (UTF-8)');
    this.jurnal.push({ t: this.ceas, dir: 'in', text: String.fromCharCode(...octeti) });
    for (const b of octeti) {
      this.contoare.primiti++;
      if (this.timpReal(b)) { this.contoare.timpReal++; continue; }
      if (b > 0x7f) { this.contoare.aruncati++; continue; }
      if (this.rx.length >= this.contract.rx) { this.contoare.pierduti++; continue; }
      this.rx.push(b);
      this.contoare.pastrati++;
      this.contoare.varfRx = Math.max(this.contoare.varfRx, this.rx.length);
      if (b === 0x0a || b === 0x0d) this.proceseaza();
    }
  }

  /** Ce a răspuns emulatorul de la ultima citire, linie cu linie. */
  citeste(): string[] {
    const r = this.iesire;
    this.iesire = [];
    return r;
  }

  transcriere(): readonly Eveniment[] { return this.jurnal; }

  /** Ușa testului: o alarmă. Limitele (1, 2) sunt critice: nimic nu se mai procesează până la Ctrl-X. */
  alarma(cod: number): void {
    this.opresteMiscarea();
    this.alarmat = true;
    this.trimite(`ALARM:${cod}`);
    if (cod === 1 || cod === 2) {
      this.critica = true;
      this.trimite('[MSG:Reset to continue]');
    } else {
      this.rx = [];
    }
  }

  /** Timpul trece: blocurile se execută, liniile intră când au loc, pauzele și frânarea se consumă. */
  timp(ms: number): void {
    let rest = ms;
    for (let g = 0; rest > EPS; g++) {
      if (g > 10_000_000) throw new Error('emulatorul nu înaintează');
      this.proceseaza();
      if (this.hold === 'Hold:1') {
        const d = Math.min(rest, this.franareRamasa);
        this.franareRamasa -= d; this.ceas += d; rest -= d;
        if (this.franareRamasa <= EPS) this.hold = 'Hold:0';
        continue;
      }
      if (this.alarmat || this.hold) { this.ceas += rest; break; }
      if (this.pauza !== null) {
        const d = Math.min(rest, this.pauza);
        this.pauza -= d; this.ceas += d; rest -= d;
        if (this.pauza <= EPS) { this.pauza = null; this.trimite('ok'); }
        continue;
      }
      const b = this.plan[0];
      if (!b) { this.ceas += rest; break; }
      const v = this.viteza(b) / 60000;
      const ramas = (b.lungime - b.parcurs) / v;
      if (ramas <= rest + EPS) {
        this.ceas += ramas; rest -= ramas;
        this.pozMasina = { ...b.tinta };
        this.plan.shift();
      } else {
        b.parcurs += v * rest; this.ceas += rest; rest = 0;
      }
    }
    this.proceseaza();
  }

  // ——— interne ———

  private trimite(linie: string): void {
    this.iesire.push(linie);
    this.jurnal.push({ t: this.ceas, dir: 'out', text: linie });
  }

  /** Viteza blocului (mm/min): avansul sau rapidul, cu override-ul, plafonate de axe. */
  private viteza(b: Bloc): number {
    const v = b.rapid ? b.plafon * (this.override.rapid / 100) : b.avans * (this.override.avans / 100);
    return Math.min(v, b.plafon);
  }

  /** Octeții de timp real; true dacă octetul a fost unul. */
  private timpReal(b: number): boolean {
    const limit = (v: number): number => Math.min(200, Math.max(10, v));
    switch (b) {
      case 0x18: this.reseteaza(); return true;
      case 0x3f: this.trimite(this.raport()); return true;
      case 0x21:
        if (!this.alarmat && !this.hold) { this.hold = this.plan.length > 0 ? 'Hold:1' : 'Hold:0'; this.franareRamasa = this.contract.franare; }
        return true;
      case 0x7e:
        if (this.hold) { this.hold = null; this.proceseaza(); }
        return true;
      case 0x90: this.override.avans = 100; return true;
      case 0x91: this.override.avans = limit(this.override.avans + 10); return true;
      case 0x92: this.override.avans = limit(this.override.avans - 10); return true;
      case 0x93: this.override.avans = limit(this.override.avans + 1); return true;
      case 0x94: this.override.avans = limit(this.override.avans - 1); return true;
      case 0x95: this.override.rapid = 100; return true;
      case 0x96: this.override.rapid = 50; return true;
      case 0x97: this.override.rapid = 25; return true;
      case 0x99: this.override.ax = 100; return true;
      case 0x9a: this.override.ax = limit(this.override.ax + 10); return true;
      case 0x9b: this.override.ax = limit(this.override.ax - 10); return true;
      case 0x9c: this.override.ax = limit(this.override.ax + 1); return true;
      case 0x9d: this.override.ax = limit(this.override.ax - 1); return true;
      // Ușa, anularea jog-ului, oprirea axului în hold, răcirea: luate (nu ocupă bufferul), fără efect modelat aici.
      case 0x84: case 0x85: case 0x9e: case 0xa0: case 0xa1: return true;
      default: return false;
    }
  }

  private raport(): string {
    const masca = this.setari.get(10) ?? 1;
    const p = this.pozitie;
    const wco = this.wco();
    const poz = (masca & 1) ? `MPos:${f3(p.x)},${f3(p.y)},${f3(p.z)}` : `WPos:${f3(p.x - wco.x)},${f3(p.y - wco.y)},${f3(p.z - wco.z)}`;
    const bf = (masca & 2) ? `|Bf:${this.contract.planificator - this.plan.length},${this.contract.rx - this.rx.length}` : '';
    const b = this.plan[0];
    const avans = this.stare === 'Run' && b ? Math.round(this.viteza(b)) : 0;
    return `<${this.stare}|${poz}${bf}|FS:${avans},${Math.round(this.ax)}>`;
  }

  private wco(): Vec {
    const w = this.wcs[this.modal.wcs] ?? { x: 0, y: 0, z: 0 };
    return { x: w.x + this.g92.x, y: w.y + this.g92.y, z: w.z + this.g92.z + this.tlo };
  }

  private opresteMiscarea(): void {
    this.pozMasina = this.pozitie;
    this.pozParser = { ...this.pozMasina };
    this.plan = [];
    this.pauza = null;
    this.hold = null;
  }

  private reseteaza(): void {
    const inMiscare = !this.alarmat && ((this.plan.length > 0 && this.hold !== 'Hold:0') || this.hold === 'Hold:1');
    this.opresteMiscarea();
    this.rx = [];
    this.critica = false;
    if (inMiscare) { this.alarmat = true; this.trimite('ALARM:3'); }
    this.trimite(this.contract.banner);
    if (this.alarmat) this.trimite("[MSG:'$H'|'$X' to unlock]");
    this.modal = { miscare: 0, wcs: 0, plan: 17, unitati: 21, distanta: 90, avansMod: 94, ax: 5, racire: 9 };
    this.g92 = { x: 0, y: 0, z: 0 };
    this.avans = 0; this.turatie = 0; this.scula = 0;
    this.override.avans = 100; this.override.rapid = 100; this.override.ax = 100;
  }

  /** Bucla protocolului: liniile complete din buffer, cât au loc (planificatorul, golirea cerută). */
  private proceseaza(): void {
    for (;;) {
      if (this.critica || this.pauza !== null) return;
      const capat = this.rx.findIndex((c) => c === 0x0a || c === 0x0d);
      if (capat < 0) return;
      const { text, depasire } = curata(this.rx.slice(0, capat), this.contract.linie);
      const consuma = (): void => { this.rx.splice(0, capat + 1); this.contoare.linii++; };
      if (depasire) { consuma(); this.trimite('error:11'); continue; }
      if (text === '') { consuma(); this.trimite('ok'); continue; }
      if (text.startsWith('$')) { consuma(); this.sistem(text); continue; }
      if (this.alarmat) { consuma(); this.trimite('error:9'); continue; }
      const r = this.gcode(text);
      if (r === 'asteapta') return;
      consuma();
      if (typeof r === 'number') this.trimite(`error:${r}`);
      else if (r === 'ok') this.trimite('ok');
    }
  }

  private sistem(text: string): void {
    const ocupat = this.stare === 'Run' || this.stare === 'Hold:0' || this.stare === 'Hold:1';
    if (text === '$') { this.trimite('[HLP:$$ $# $G $I $N $x=val $Nx=line $J=line $SLP $C $X $H ~ ! ? ctrl-x]'); this.trimite('ok'); return; }
    if (text === '$G') {
      const m = this.modal;
      this.trimite(`[GC:G${m.miscare} G${54 + m.wcs} G${m.plan} G${m.unitati} G${m.distanta} G${m.avansMod} M${m.ax} M${m.racire} T${this.scula} F${Math.round(this.avans)} S${Math.round(this.turatie)}]`);
      this.trimite('ok');
      return;
    }
    if (text === '$X') {
      if (this.alarmat) { this.alarmat = false; this.trimite('[MSG:Caution: Unlocked]'); }
      this.trimite('ok');
      return;
    }
    if (text === '$$') {
      if (ocupat) { this.trimite('error:8'); return; }
      for (const [n, v] of this.setari) this.trimite(`$${n}=${textSetare(n, v)}`);
      this.trimite('ok');
      return;
    }
    if (/^\$(C|J=|N|SLP|RST=)/.test(text)) throw new Nemodelat(`comanda ${text}`);
    if (ocupat) { this.trimite('error:8'); return; }
    if (text === '$#') {
      for (const [k, w] of this.wcs.entries()) this.trimite(`[G${54 + k}:${f3(w.x)},${f3(w.y)},${f3(w.z)}]`);
      this.trimite('[G28:0.000,0.000,0.000]');
      this.trimite('[G30:0.000,0.000,0.000]');
      this.trimite(`[G92:${f3(this.g92.x)},${f3(this.g92.y)},${f3(this.g92.z)}]`);
      this.trimite(`[TLO:${f3(this.tlo)}]`);
      this.trimite('[PRB:0.000,0.000,0.000:0]');
      this.trimite('ok');
      return;
    }
    if (text === '$H') {
      if (this.setari.get(22)) throw new Nemodelat('căutarea originii');
      this.trimite('error:5');
      return;
    }
    if (text === '$I') { this.trimite(`[VER:${this.contract.versiune}:]`); this.trimite(`[OPT:V,${this.contract.planificator},${this.contract.rx}]`); this.trimite('ok'); return; }
    const m = /^\$(\d+(?:\.\d*)?)(=)?(.*)$/.exec(text);
    if (!m) { this.trimite('error:3'); return; }
    if (!m[2]) { this.trimite('error:3'); return; }
    const v = /^[-+]?(\d+\.?\d*|\.\d+)$/.test(m[3] ?? '') ? Number(m[3]) : null;
    if (v === null) { this.trimite('error:2'); return; }
    const n = Number(m[1]);
    if (!this.setari.has(n)) { this.trimite('error:3'); return; }
    if (v < 0) { this.trimite('error:4'); return; }
    this.setari.set(n, v);
    this.trimite('ok');
  }

  /** O linie G-code: `ok`, codul de eroare, `asteapta` (nu are loc încă) sau `pauza` (ok-ul vine după G4). */
  private gcode(text: string): 'ok' | 'asteapta' | 'pauza' | number {
    const w = cuvinte(text);
    if (typeof w === 'number') return w;
    const gs: number[] = [], ms: number[] = [];
    const val = new Map<string, number>();
    for (const { l, v } of w) {
      if (l === 'G') gs.push(v);
      else if (l === 'M') ms.push(v);
      else val.set(l, v);
    }
    const grupe = new Set<string>();
    for (const g of gs) {
      const grupa = GRUPE_G.get(g);
      if (grupa === undefined) return Number.isInteger(g) ? 20 : (() => { throw new Nemodelat(`G${g}`); })();
      if (grupe.has(grupa)) throw new Nemodelat(`două coduri din grupa ${grupa} pe linia ${text}`);
      grupe.add(grupa);
    }
    for (const m of ms) {
      const grupa = GRUPE_M.get(m);
      if (grupa === undefined) return 20;
      if (grupe.has(grupa)) throw new Nemodelat(`două coduri din grupa ${grupa} pe linia ${text}`);
      grupe.add(grupa);
    }
    for (const g of gs) if ([28, 28.1, 30, 30.1, 38.2, 38.3, 38.4, 38.5, 93, 18, 19].includes(g)) throw new Nemodelat(`G${g}`);
    if (val.has('R')) throw new Nemodelat('arcul cu R');
    if (val.has('N')) throw new Nemodelat('numerele de linie');

    // Starea nouă, aplicată doar dacă linia trece (o eroare nu schimbă nimic).
    const modal = { ...this.modal };
    for (const g of gs) {
      if ([0, 1, 2, 3, 80].includes(g)) modal.miscare = g;
      else if (g >= 54 && g <= 59) modal.wcs = g - 54;
      else if (g === 17) modal.plan = g;
      else if (g === 20 || g === 21) modal.unitati = g;
      else if (g === 90 || g === 91) modal.distanta = g;
      else if (g === 94) modal.avansMod = g;
    }
    const k = modal.unitati === 20 ? 25.4 : 1;
    let avans = this.avans;
    if (val.has('F')) avans = (val.get('F') ?? 0) * k;
    const nemodal = gs.find((g) => [4, 10, 53, 92, 92.1].includes(g));
    const axe = AXE.filter((a) => val.has(a.toUpperCase()));
    const sincron = gs.includes(4) || gs.includes(10) || ms.some((m) => [0, 2, 30, 3, 4, 5, 8, 9].includes(m));

    // Ținta mișcării (coordonatele mașinii).
    let tinta: Vec | null = null;
    const miscare = nemodal === undefined || nemodal === 53 ? modal.miscare : null;
    if (axe.length > 0 && miscare !== null && miscare !== 80) {
      const wcoNou = (() => { const w2 = this.wcs[modal.wcs] ?? { x: 0, y: 0, z: 0 }; return { x: w2.x + this.g92.x, y: w2.y + this.g92.y, z: w2.z + this.g92.z + this.tlo }; })();
      tinta = { ...this.pozParser };
      for (const a of axe) {
        const v = (val.get(a.toUpperCase()) ?? 0) * k;
        tinta[a] = nemodal === 53 ? v : modal.distanta === 91 ? this.pozParser[a] + v : v + wcoNou[a];
      }
      if (miscare !== 0 && !(avans > 0)) return 22;
    } else if (axe.length > 0 && nemodal !== 10 && nemodal !== 92) {
      throw new Nemodelat(`cuvinte de axă fără mișcare: ${text}`);
    }
    let arc: Bloc['arc'] = null;
    if (tinta && (miscare === 2 || miscare === 3)) {
      const s = this.pozParser;
      const cx = s.x + (val.get('I') ?? 0) * k, cy = s.y + (val.get('J') ?? 0) * k;
      const r0 = Math.hypot(s.x - cx, s.y - cy), r1 = Math.hypot(tinta.x - cx, tinta.y - cy);
      const dr = Math.abs(r1 - r0);
      if (dr > 0.5 || (dr > 0.005 && dr > 0.001 * r0)) return 33;
      const u0 = Math.atan2(s.y - cy, s.x - cx), u1 = Math.atan2(tinta.y - cy, tinta.x - cx);
      let b = u1 - u0;
      if (miscare === 3) { while (b <= EPS) b += 2 * Math.PI; } else { while (b >= -EPS) b -= 2 * Math.PI; }
      arc = { cx, cy, r: r0, u0, baleiaj: b };
    }
    if (gs.includes(4) && !val.has('P')) throw new Nemodelat('G4 fără P');

    // Unde trebuie să aștepte: blocul nou cere loc în planificator; comenzile sincrone, planificatorul gol.
    const bloc = tinta ? this.bloc(this.pozParser, tinta, arc, miscare === 0, avans) : null;
    if (sincron && this.plan.length > 0) return 'asteapta';
    if (bloc && this.plan.length >= this.contract.planificator) return 'asteapta';

    // Se aplică.
    this.modal = modal;
    this.avans = avans;
    if (val.has('S')) this.turatie = val.get('S') ?? 0;
    if (val.has('T')) this.scula = val.get('T') ?? 0;
    for (const m of ms) {
      if (m === 3 || m === 4 || m === 5) this.modal.ax = m;
      if (m === 8 || m === 9) this.modal.racire = m;
    }
    if (nemodal === 10) {
      const p = val.get('P') ?? 0, l = val.get('L');
      if ((l !== 2 && l !== 20) || p < 0 || p > 6 || !Number.isInteger(p)) throw new Nemodelat(`G10 ${text}`);
      const idx = p === 0 ? this.modal.wcs : p - 1;
      const w = { ...(this.wcs[idx] ?? { x: 0, y: 0, z: 0 }) };
      for (const a of axe) {
        const v = (val.get(a.toUpperCase()) ?? 0) * k;
        w[a] = l === 2 ? v : this.pozParser[a] - this.g92[a] - (a === 'z' ? this.tlo : 0) - v;
      }
      this.wcs[idx] = w;
    }
    if (nemodal === 92) {
      for (const a of axe) {
        const w2 = this.wcs[this.modal.wcs] ?? { x: 0, y: 0, z: 0 };
        this.g92[a] = this.pozParser[a] - w2[a] - (a === 'z' ? this.tlo : 0) - (val.get(a.toUpperCase()) ?? 0) * k;
      }
    }
    if (nemodal === 92.1) this.g92 = { x: 0, y: 0, z: 0 };
    if (gs.includes(43.1)) this.tlo = (val.get('Z') ?? 0) * k;
    if (gs.includes(49)) this.tlo = 0;
    if (tinta) {
      this.pozParser = tinta;
      if (bloc) {
        this.plan.push(bloc);
        this.contoare.varfPlanificator = Math.max(this.contoare.varfPlanificator, this.plan.length);
      }
    }
    if (ms.includes(0)) this.hold = 'Hold:0';
    if (ms.includes(2) || ms.includes(30)) {
      this.modal = { ...this.modal, miscare: 1, wcs: 0, plan: 17, distanta: 90, avansMod: 94, ax: 5, racire: 9 };
      this.trimite('[MSG:Pgm End]');
    }
    if (gs.includes(4)) {
      this.pauza = (val.get('P') ?? 0) * 1000;
      if (this.pauza <= EPS) { this.pauza = null; return 'ok'; }
      return 'pauza';
    }
    return 'ok';
  }

  /** Blocul de la `s` la `t` (null: lungime zero, GRBL nu-l pune în planificator), cu plafonul axelor pe direcția lui. */
  private bloc(s: Vec, t: Vec, arc: Bloc['arc'], rapid: boolean, avans: number): Bloc | null {
    const dz = t.z - s.z;
    const plan = arc ? Math.abs(arc.baleiaj) * arc.r : Math.hypot(t.x - s.x, t.y - s.y);
    const lungime = Math.hypot(plan, dz);
    if (lungime <= EPS) return null;
    const rata = { x: this.setari.get(110) ?? 500, y: this.setari.get(111) ?? 500, z: this.setari.get(112) ?? 500 };
    // Plafonul: cea mai mică rată / |componenta direcției|; pe arc, pe 64 de coarde (direcția se schimbă).
    let plafon = Infinity;
    const directii: Vec[] = [];
    if (arc) {
      for (let j = 0; j < 64; j++) {
        const u = arc.u0 + (arc.baleiaj * (j + 0.5)) / 64;
        const sgn = Math.sign(arc.baleiaj);
        directii.push({ x: -Math.sin(u) * sgn * plan / lungime, y: Math.cos(u) * sgn * plan / lungime, z: dz / lungime });
      }
    } else {
      directii.push({ x: (t.x - s.x) / lungime, y: (t.y - s.y) / lungime, z: dz / lungime });
    }
    for (const d of directii) for (const a of AXE) if (Math.abs(d[a]) > EPS) plafon = Math.min(plafon, rata[a] / Math.abs(d[a]));
    return { start: { ...s }, tinta: { ...t }, lungime, avans, plafon, rapid, arc, parcurs: 0 };
  }
}
