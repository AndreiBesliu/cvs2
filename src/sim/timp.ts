import type { AxaMasina, ProfilMasina } from '../ir/masina.ts';

/**
 * Estimarea timpului unui program (ADR 0046): modelul planificatorului GRBL 1.1h, rulat pe TEXTUL G-code exportat, adică
 * pe ce primește controlerul (coordonatele rotunjite, arcele împărțite de post, pauza după M3, retragerea de la final).
 * Sursa e codul firmware-ului (gnea/grbl v1.1h.20190825): `planner.c` (pașii, versorii, limitele pe axe, joncțiunile,
 * vitezele nominale), `motion_control.c` (`mc_arc`), `stepper.c` (profilul trapez / triunghi), `nuts_bolts.c`
 * (`delay_sec`), `gcode.c` (ce golește bufferul). Ipotezele (ADR 0046 §3): senderul ține bufferul serial plin, deci
 * planificatorul are mereu fereastra plină; override-urile la 100 %; scula pornește din zeroul programului; dublă
 * precizie, nu float pe 32 de biți.
 */
export type Portiune = {
  /** Timpul, în secunde: mișcarea plus pauzele. */
  readonly secunde: number;
  /** Pauzele G4, în secunde. */
  readonly pauze: number;
  /** Lungimea blocurilor de tăiere (G1, G2, G3), în mm. */
  readonly taiere: number;
  /** Lungimea deplasărilor rapide (G0), în mm. */
  readonly rapide: number;
};

export type EstimareTimp =
  | {
    readonly ok: true;
    readonly total: Portiune;
    /** O porțiune pe interval de linii: înaintea primei limite, apoi de la fiecare limită până la următoarea. */
    readonly portiuni: readonly Portiune[];
    /** Câte blocuri au intrat în planificator (cu segmentele arcelor; blocurile fără niciun pas, nu). */
    readonly blocuri: number;
    /** Câte linii ale programului cer un avans peste viteza maximă a mașinii pe direcția lor (tăiat de controler). */
    readonly liniiLimitate: number;
  }
  /** `linie`: linia programului (de la 1), sau 0 când e vina profilului. */
  | { readonly ok: false; readonly motiv: string; readonly linie: number };

/** `ARC_ANGULAR_TRAVEL_EPSILON` din config.h: sub el, un arc cu startul în capăt e un cerc întreg. */
const EPS_ARC = 5e-7;
/** `N_ARC_CORRECTION` din config.h: la al câtelea segment `mc_arc` refăcea rotația cu sin / cos exacte. */
const CORECTIE_ARC = 12;
const MM_PE_INCH = 25.4;
/**
 * Plafonul blocurilor planificatorului (T23): ~0,3 µs pe bloc măsurat (recenzia din 18.10), deci ~3 s în cel mai rău caz,
 * pe firul principal, până la bazinul de workere. Postul scrie cel mult 2 000 000 de linii; arcele le înmulțesc.
 */
const PLAFON_BLOCURI = 10_000_000;
const AXE = ['X', 'Y', 'Z'] as const;

class EroareEstimare extends Error {
  readonly linie: number;
  constructor(linie: number, motiv: string) {
    super(motiv);
    this.linie = linie;
  }
}

type Bloc = {
  readonly mm: number;
  /** Accelerația blocului, mm/s², limitată pe axe. */
  readonly acc: number;
  /** Viteza nominală, mm/s. */
  readonly nominala: number;
  /** Pătratul vitezei maxime la intrare, (mm/s)². */
  readonly intrareMaxima2: number;
  readonly portiune: number;
};

/** Modul de mișcare (grupul 1 din gcode.c): G0–G3, sau G80 (nicio mișcare). */
type Miscare = 0 | 1 | 2 | 3 | 80;

type Acumulator = { secunde: number; pauze: number; taiere: number; rapide: number };

const gol = (): Acumulator => ({ secunde: 0, pauze: 0, taiere: 0, rapide: 0 });

/**
 * Timpul unui bloc cu intrarea v0, ieșirea v1 și viteza nominală v (mm/s), accelerația a, lungimea L: trapez dacă
 * accelerarea și decelerarea încap, altfel triunghi cu vârful v_p² = (2aL + v0² + v1²) / 2 (`stepper.c`, `st_prep_buffer`).
 */
export function timpBloc(v0: number, v1: number, v: number, a: number, L: number): number {
  const vi = Math.min(v0, v);
  const ve = Math.min(v1, v);
  const dAcc = (v * v - vi * vi) / (2 * a);
  const dDec = (v * v - ve * ve) / (2 * a);
  if (dAcc + dDec <= L) return (v - vi) / a + (v - ve) / a + (L - dAcc - dDec) / v;
  const vp = Math.min(v, Math.sqrt(Math.max(vi * vi, ve * ve, (2 * a * L + vi * vi + ve * ve) / 2)));
  return (vp - vi) / a + (vp - ve) / a;
}

/** `lround` din C: jumătatea se rotunjește departe de zero (`Math.round` o duce spre +∞). */
const lround = (x: number): number => (x < 0 ? -Math.round(-x) : Math.round(x));

/**
 * Planificatorul cu fereastra lui (ADR 0046 §3): blocul care se execută își află viteza de ieșire când planificatorul
 * ține blocurile i … i + B − 1 (B = `blocuriPlanificator`), cu ultimul oprit; intrarea lui e ieșirea celui dinainte.
 * Ține în memorie doar fereastra: un program de milioane de segmente nu cere milioane de blocuri.
 */
class Planificator {
  private readonly coada: Bloc[] = [];
  private intrare2 = 0;
  private readonly B: number;
  private readonly portiuni: Acumulator[];
  constructor(B: number, portiuni: Acumulator[]) {
    this.B = B;
    this.portiuni = portiuni;
  }

  /** Bufferul e gol: următorul bloc pornește din repaus (`block_buffer_head == block_buffer_tail`). */
  get gol(): boolean {
    return this.coada.length === 0;
  }

  adauga(b: Bloc): void {
    this.coada.push(b);
    if (this.coada.length >= this.B) this.executaPrimul();
  }

  /** Sincronizarea (`protocol_buffer_synchronize`): tot ce e în buffer se execută până la oprire. */
  goleste(): void {
    while (this.coada.length > 0) this.executaPrimul();
    this.intrare2 = 0;
  }

  private executaPrimul(): void {
    const q = this.coada;
    const b = q[0];
    if (!b) return;
    // Pasul înapoi al lui `planner_recalculate`, din ultimul bloc cunoscut (oprit la capăt) până la al doilea.
    let e2 = 0;
    for (let k = q.length - 1; k >= 1; k--) {
      const c = q[k] as Bloc;
      e2 = Math.min(c.intrareMaxima2, e2 + 2 * c.acc * c.mm);
    }
    const iesire2 = q.length === 1 ? 0 : Math.min(e2, this.intrare2 + 2 * b.acc * b.mm);
    const t = timpBloc(Math.sqrt(this.intrare2), Math.sqrt(iesire2), b.nominala, b.acc, b.mm);
    const p = this.portiuni[b.portiune] as Acumulator;
    p.secunde += t;
    this.intrare2 = iesire2;
    q.shift();
  }
}

/** Valoarea unui cuvânt: semnul, cifrele, cel mult un punct (ca `read_float`). */
const NUMAR = /^[+-]?(\d+\.?\d*|\.\d+)$/;

/**
 * Estimarea programului `text` pe mașina `profil`. `limite`: liniile (numărate de la 0, crescător) unde începe câte o
 * porțiune, de exemplu secțiunile postului; porțiunea 0 e tot ce vine înaintea primei limite.
 */
export function estimeazaTimp(
  text: string, profil: ProfilMasina, limite: readonly number[] = [], plafonBlocuri = PLAFON_BLOCURI,
): EstimareTimp {
  try {
    return estimeaza(text, profil, limite, plafonBlocuri);
  } catch (e) {
    if (e instanceof EroareEstimare) return { ok: false, motiv: e.message, linie: e.linie };
    throw e;
  }
}

function estimeaza(text: string, profil: ProfilMasina, limite: readonly number[], plafonBlocuri: number): EstimareTimp {
  const axe: AxaMasina[] = AXE.map((a) => {
    const x = profil.axe[a];
    if (!x) throw new EroareEstimare(0, `profilul ${profil.nume} n-are axa ${a}`);
    return x;
  });
  const fw = profil.firmware;
  const vmax = axe.map((a) => a.vitezaMaxima / 60);
  const amax = axe.map((a) => a.acceleratie);
  const pasi = axe.map((a) => a.pasiPeMm);
  const dj = profil.deviatieJonctiune;
  const tol = profil.toleranteArc;
  const valide = [...vmax, ...amax, ...pasi, fw.blocuriPlanificator, fw.pasPauza, fw.avansMinim, tol].every((v) => Number.isFinite(v) && v > 0)
    && Number.isFinite(dj) && dj >= 0 && Number.isInteger(fw.blocuriPlanificator) && fw.vitezaMinimaJonctiune >= 0;
  if (!valide) throw new EroareEstimare(0, `profilul ${profil.nume} are o valoare care nu e un număr pozitiv`);
  const vMinJ2 = (fw.vitezaMinimaJonctiune / 60) ** 2;
  const avansMinim = fw.avansMinim / 60;

  const acum: Acumulator[] = Array.from({ length: limite.length + 1 }, gol);
  const plan = new Planificator(fw.blocuriPlanificator, acum);
  let blocuri = 0;
  const limitate = new Set<number>();
  let linieCurenta = 0;

  // Starea G-code (`gc_state`): poziția în mm, ca numere reale; cea a planificatorului (`pl.position`), în pași.
  const poz = [0, 0, 0];
  const pozPasi = [0, 0, 0];
  let versorAnterior = [0, 0, 0];
  let nominalaAnterioara = 0;
  let miscare: Miscare = 0;
  let avans = 0;
  let inch = false;
  let incremental = false;
  let ax: 'oprit' | 'cw' | 'ccw' = 'oprit';
  let turatie = 0;
  let racire = false;
  let portiune = 0;

  /** `plan_buffer_line`: un bloc liniar spre țintă (mm), rapid sau cu avansul curent. */
  const linie = (tinta: readonly number[], rapid: boolean): void => {
    const delta = [0, 0, 0];
    let pasiMax = 0;
    for (let k = 0; k < 3; k++) {
      const tp = lround((tinta[k] as number) * (pasi[k] as number));
      pasiMax = Math.max(pasiMax, Math.abs(tp - (pozPasi[k] as number)));
      delta[k] = (tp - (pozPasi[k] as number)) / (pasi[k] as number);
      pozPasi[k] = tp;
    }
    if (pasiMax === 0) return; // PLAN_EMPTY_BLOCK
    const mm = Math.hypot(delta[0] as number, delta[1] as number, delta[2] as number);
    const u = delta.map((d) => d / mm);
    const limita = (max: readonly number[], v: readonly number[]): number => {
      let l = Infinity;
      for (let k = 0; k < 3; k++) if ((v[k] as number) !== 0) l = Math.min(l, (max[k] as number) / Math.abs(v[k] as number));
      return l;
    };
    const acc = limita(amax, u);
    const vitezaRapida = limita(vmax, u);
    let nominala = rapid ? vitezaRapida : avans;
    if (!rapid && nominala > vitezaRapida) {
      nominala = vitezaRapida;
      limitate.add(linieCurenta);
    }
    if (!(nominala > avansMinim)) nominala = avansMinim;
    let jonctiune2: number;
    if (plan.gol) {
      jonctiune2 = 0;
    } else {
      let cos = 0;
      const ju = [0, 0, 0];
      for (let k = 0; k < 3; k++) {
        cos -= (versorAnterior[k] as number) * (u[k] as number);
        ju[k] = (u[k] as number) - (versorAnterior[k] as number);
      }
      if (cos > 0.999999) {
        jonctiune2 = vMinJ2;
      } else if (cos < -0.999999) {
        jonctiune2 = Infinity;
      } else {
        const n = Math.hypot(ju[0] as number, ju[1] as number, ju[2] as number);
        const aj = limita(amax, ju.map((x) => x / n));
        const s = Math.sqrt(0.5 * (1 - cos));
        jonctiune2 = Math.max(vMinJ2, (aj * dj * s) / (1 - s));
      }
    }
    const intrareMaxima2 = Math.min(nominala > nominalaAnterioara ? nominalaAnterioara ** 2 : nominala ** 2, jonctiune2);
    nominalaAnterioara = nominala;
    versorAnterior = u;
    blocuri++;
    if (blocuri > plafonBlocuri) {
      throw new EroareEstimare(linieCurenta, `programul trece de ${plafonBlocuri} de blocuri ale planificatorului (cu segmentele arcelor): estimarea ar bloca dialogul`);
    }
    const p = acum[portiune] as Acumulator;
    if (rapid) p.rapide += mm;
    else p.taiere += mm;
    plan.adauga({ mm, acc, nominala, intrareMaxima2, portiune });
  };

  /** `mc_arc`, cu rotația aproximată și corecția la fiecare al 12-lea segment, ca în firmware. */
  const arc = (tinta: readonly number[], i: number, j: number, orar: boolean, nr: number): void => {
    const [px, py, pz] = poz as [number, number, number];
    const cx = px + i;
    const cy = py + j;
    const raza = Math.hypot(i, j);
    // Verificarea din gcode.c (error:33): capătul trebuie să stea pe același cerc, în 0,005 mm sau în 0,1 % din rază.
    const razaCapat = Math.hypot((tinta[0] as number) - cx, (tinta[1] as number) - cy);
    const dr = Math.abs(razaCapat - raza);
    if (dr > 0.005 && (dr > 0.5 || dr > 0.001 * raza)) {
      throw new EroareEstimare(nr, `arcul are capătul la ${razaCapat.toFixed(4)} mm de centru și startul la ${raza.toFixed(4)} mm (GRBL: error:33)`);
    }
    if (!(2 * raza > tol)) throw new EroareEstimare(nr, `arcul cu raza ${raza} mm e sub jumătate din toleranța arcului ($12 = ${tol})`);
    let r0 = -i;
    let r1 = -j;
    const rt0 = (tinta[0] as number) - cx;
    const rt1 = (tinta[1] as number) - cy;
    let unghi = Math.atan2(r0 * rt1 - r1 * rt0, r0 * rt0 + r1 * rt1);
    if (orar) {
      if (unghi >= -EPS_ARC) unghi -= 2 * Math.PI;
    } else if (unghi <= EPS_ARC) {
      unghi += 2 * Math.PI;
    }
    const segmente = Math.floor(Math.abs(0.5 * unghi * raza) / Math.sqrt(tol * (2 * raza - tol)));
    // `segments` e uint16_t în mc_arc: peste 65 535, conversia din float e nedefinită în C. Refuzat, nu ghicit.
    if (!(segmente <= 65535)) throw new EroareEstimare(nr, `arcul ar avea ${segmente} de segmente, peste 65 535 (contorul din mc_arc)`);
    if (segmente > 0) {
      const theta = unghi / segmente;
      const liniar = ((tinta[2] as number) - pz) / segmente;
      let cosT = 2 - theta * theta;
      const sinT = theta * 0.16666667 * (cosT + 4);
      cosT *= 0.5;
      let numar = 0;
      const p = [px, py, pz];
      for (let s = 1; s < segmente; s++) {
        if (numar < CORECTIE_ARC) {
          const ri = r0 * sinT + r1 * cosT;
          r0 = r0 * cosT - r1 * sinT;
          r1 = ri;
          numar++;
        } else {
          const c = Math.cos(s * theta);
          const sn = Math.sin(s * theta);
          r0 = -i * c + j * sn;
          r1 = -i * sn - j * c;
          numar = 0;
        }
        p[0] = cx + r0;
        p[1] = cy + r1;
        p[2] = (p[2] as number) + liniar;
        linie(p, false);
      }
    }
    linie(tinta, false);
  };

  const sincronizeaza = (): void => {
    plan.goleste();
  };

  const linii = text.split('\n');
  let urmatoareaLimita = 0;
  for (let n = 0; n < linii.length; n++) {
    while (urmatoareaLimita < limite.length && (limite[urmatoareaLimita] as number) <= n) {
      urmatoareaLimita++;
      portiune = urmatoareaLimita;
    }
    const nr = n + 1;
    linieCurenta = nr;
    const cuvinte = cuvinteLinie(linii[n] as string, nr);
    if (cuvinte.length === 0) continue;

    let g4 = false;
    let g49 = false;
    let gMiscare: Miscare | undefined;
    let gInch: boolean | undefined;
    let gIncremental: boolean | undefined;
    let mAx: 'oprit' | 'cw' | 'ccw' | undefined;
    let mRacire: boolean | undefined;
    let sfarsit = false;
    // Grupurile modale din gcode.c: două coduri din același grup pe o linie sunt error:21.
    const grupuri = new Set<string>();
    const grup = (nume: string, cod: string): void => {
      if (grupuri.has(nume)) throw new EroareEstimare(nr, `${cod}: două coduri din același grup modal pe o linie (GRBL: error:21)`);
      grupuri.add(nume);
    };
    const v: Partial<Record<string, number>> = {};
    for (const [litera, valoare] of cuvinte) {
      if (litera === 'G') {
        const cod = `G${valoare}`;
        switch (valoare) {
          case 0: case 1: case 2: case 3: case 80: grup('miscare', cod); gMiscare = valoare; break;
          case 4: grup('nemodal', cod); g4 = true; break;
          case 17: grup('plan', cod); break;
          case 40: grup('compensare', cod); break;
          case 49: grup('lungime', cod); g49 = true; break;
          case 61: grup('cale', cod); break;
          case 91.1: grup('arc', cod); break;
          case 94: grup('avans', cod); break;
          case 54: case 55: case 56: case 57: case 58: case 59: grup('wcs', cod); break;
          case 18: case 19: throw new EroareEstimare(nr, `G${valoare}: estimarea știe doar planul XY (G17)`);
          case 20: grup('unitati', cod); gInch = true; break;
          case 21: grup('unitati', cod); gInch = false; break;
          case 90: grup('distanta', cod); gIncremental = false; break;
          case 91: grup('distanta', cod); gIncremental = true; break;
          case 93: throw new EroareEstimare(nr, 'G93 (avansul în timp invers) nu se estimează');
          default: throw new EroareEstimare(nr, `G${valoare} nu se estimează`);
        }
      } else if (litera === 'M') {
        const cod = `M${valoare}`;
        switch (valoare) {
          // M3 și M4 sunt stări diferite (SPINDLE_ENABLE_CW / CCW): trecerea de la una la alta golește bufferul.
          case 3: grup('ax', cod); mAx = 'cw'; break;
          case 4: grup('ax', cod); mAx = 'ccw'; break;
          case 5: grup('ax', cod); mAx = 'oprit'; break;
          case 8: grup('racire', cod); mRacire = true; break;
          case 9: grup('racire', cod); mRacire = false; break;
          case 2: case 30: grup('sfarsit', cod); sfarsit = true; break;
          case 0: case 1: throw new EroareEstimare(nr, `M${valoare} oprește programul până la omul de la mașină: timpul lui nu se poate estima`);
          case 6: throw new EroareEstimare(nr, 'M6 (schimbarea sculei) nu e acceptat de GRBL 1.1 (error:20)');
          case 7: throw new EroareEstimare(nr, 'M7 e oprit în GRBL 1.1h din fabrică (ENABLE_M7; error:20)');
          default: throw new EroareEstimare(nr, `M${valoare} nu se estimează`);
        }
      } else if ('XYZIJFSPTN'.includes(litera)) {
        if (litera in v) throw new EroareEstimare(nr, `cuvântul ${litera} apare de două ori`);
        v[litera] = valoare;
      } else if (litera === 'R') {
        throw new EroareEstimare(nr, 'arcul cu R nu se estimează (postul scrie I / J)');
      } else if (litera === 'A' || litera === 'B' || litera === 'C') {
        throw new EroareEstimare(nr, `axa ${litera} nu se estimează în v1`);
      } else {
        throw new EroareEstimare(nr, `cuvântul ${litera} nu se estimează`);
      }
    }

    // Plafoanele valorilor din gcode.c: T ≤ 255 (error:38), N ≤ 10 000 000; pauza încape în contorul uint16 al lui delay_sec.
    if (v.T !== undefined && v.T > 255) throw new EroareEstimare(nr, `T${v.T}: peste 255 (GRBL: error:38)`);
    if (v.N !== undefined && v.N > 10_000_000) throw new EroareEstimare(nr, `N${v.N}: peste 10 000 000 (GRBL: error:23)`);
    if (v.P !== undefined && Math.ceil(v.P / fw.pasPauza - 1e-9) > 65535) {
      throw new EroareEstimare(nr, `G4 P${v.P}: peste ${65535 * fw.pasPauza} s (contorul pauzei are 16 biți)`);
    }

    // Ordinea execuției din gcode.c: avansul, turația, axul, răcirea, pauza, unitățile și modul, mișcarea, sfârșitul.
    if (gInch !== undefined) inch = gInch;
    if (gIncremental !== undefined) incremental = gIncremental;
    const unitate = inch ? MM_PE_INCH : 1;
    if (v.F !== undefined) avans = (v.F * unitate) / 60;
    if (v.S !== undefined) {
      if (v.S !== turatie && ax !== 'oprit') sincronizeaza();
      turatie = v.S;
    }
    if (mAx !== undefined && mAx !== ax) {
      sincronizeaza();
      ax = mAx;
    }
    if (mRacire !== undefined && mRacire !== racire) {
      sincronizeaza();
      racire = mRacire;
    }
    if (g4) {
      if (v.P === undefined || v.P < 0) throw new EroareEstimare(nr, 'G4 cere P, în secunde');
      sincronizeaza();
      const pauza = Math.ceil(v.P / fw.pasPauza - 1e-9) * fw.pasPauza;
      const p = acum[portiune] as Acumulator;
      p.pauze += pauza;
      p.secunde += pauza;
    } else if (v.P !== undefined) {
      throw new EroareEstimare(nr, 'P fără G4');
    }
    if (gMiscare !== undefined) miscare = gMiscare;
    const areAxe = v.X !== undefined || v.Y !== undefined || v.Z !== undefined;
    if (g4 && areAxe) throw new EroareEstimare(nr, 'G4 cu cuvinte de axă');
    if (g49 && areAxe) throw new EroareEstimare(nr, 'G49 cu cuvinte de axă');
    if (miscare === 80 && areAxe) throw new EroareEstimare(nr, 'cuvinte de axă cu G80 activ (GRBL: error:31)');
    // Mișcarea cerută: modul scris pe linie, sau cel modal cu cuvinte de axă (`AXIS_COMMAND_MOTION_MODE`).
    const ceruta = !g4 && !g49 && miscare !== 80 && (gMiscare !== undefined || areAxe);
    if ((v.I !== undefined || v.J !== undefined) && !(ceruta && (miscare === 2 || miscare === 3))) {
      throw new EroareEstimare(nr, 'I / J fără un arc');
    }
    if (ceruta && miscare !== 0 && miscare !== 80) {
      if (!(avans > 0)) throw new EroareEstimare(nr, 'avansul nu e dat (F), sau e 0 (GRBL: error:22)');
      if (miscare !== 1 && v.X === undefined && v.Y === undefined) {
        throw new EroareEstimare(nr, 'arcul n-are X sau Y în planul XY (GRBL: error:26)');
      }
    }
    if (ceruta && areAxe) {
      const tinta = AXE.map((a, k) => {
        const w = v[a];
        if (w === undefined) return poz[k] as number;
        return incremental ? (poz[k] as number) + w * unitate : w * unitate;
      });
      if (miscare === 0 || miscare === 1) {
        linie(tinta, miscare === 0);
      } else if (miscare === 2 || miscare === 3) {
        if (v.I === undefined && v.J === undefined) throw new EroareEstimare(nr, 'arcul n-are I / J (GRBL: error:26)');
        arc(tinta, (v.I ?? 0) * unitate, (v.J ?? 0) * unitate, miscare === 2, nr);
      }
      for (let k = 0; k < 3; k++) poz[k] = tinta[k] as number;
    }
    if (sfarsit) {
      // M2 / M30 (gcode.c, PROGRAM_FLOW_COMPLETED): după golire, G1, G17, G90, G94, G54, M5, M9; unitățile, F și S rămân.
      sincronizeaza();
      miscare = 1;
      incremental = false;
      ax = 'oprit';
      racire = false;
    }
  }
  sincronizeaza();

  const total = acum.reduce<Acumulator>((s, p) => ({
    secunde: s.secunde + p.secunde, pauze: s.pauze + p.pauze, taiere: s.taiere + p.taiere, rapide: s.rapide + p.rapide,
  }), gol());
  return { ok: true, total, portiuni: acum, blocuri, liniiLimitate: limitate.size };
}

/**
 * Cuvintele unei linii, cum le citește GRBL (`protocol.c`): comentariile `( … )` (și una neînchisă, până la capăt) și `;`
 * scoase, spațiile și `/` ignorate, literele mari; cel mult 79 de caractere rămase (`LINE_BUFFER_SIZE` 80; error:11);
 * fiecare literă cu numărul ei. O literă fără număr, un număr fără literă sau o valoare negativă la F, N, P, S, T (error:4)
 * refuză linia.
 */
function cuvinteLinie(linie: string, nr: number): Array<readonly [string, number]> {
  let curat = '';
  let inComentariu = false;
  for (const c of linie) {
    if (inComentariu) {
      if (c === ')') inComentariu = false;
      continue;
    }
    if (c === '(') { inComentariu = true; continue; }
    if (c === ';') break;
    if (c === ' ' || c === '\t' || c === '\r' || c === '/') continue;
    curat += c.toUpperCase();
  }
  if (curat === '') return [];
  if (curat.length > 79) throw new EroareEstimare(nr, `linia are ${curat.length} de caractere utile, peste 79 (GRBL: error:11)`);
  const rez: Array<readonly [string, number]> = [];
  let i = 0;
  while (i < curat.length) {
    const litera = curat[i] as string;
    if (litera < 'A' || litera > 'Z') throw new EroareEstimare(nr, `„${litera}” în loc de o literă`);
    let j = i + 1;
    while (j < curat.length && /[0-9.+-]/.test(curat[j] as string)) j++;
    const numar = curat.slice(i + 1, j);
    if (!NUMAR.test(numar)) throw new EroareEstimare(nr, `${litera} fără un număr valid („${numar}”)`);
    const valoare = Number(numar);
    if (valoare < 0 && 'FNPST'.includes(litera)) throw new EroareEstimare(nr, `${litera}${numar}: valoare negativă (GRBL: error:4)`);
    rez.push([litera, valoare]);
    i = j;
  }
  return rez;
}
