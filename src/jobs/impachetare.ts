/**
 * Programul IR (ADR 0008) împachetat pentru drumul dintre workerul CAM și firul principal (ADR 0109 §3): mișcările devin
 * trei tablouri (felul, o mască, numerele în `Float64Array`), transferate, nu copiate (ADR 0014); doar textele etichetelor
 * și sculele schimbărilor rămân obiecte, puține. Despachetarea dă exact programul de la intrare: aceleași numere, bit cu
 * bit (și −0), aceleași câmpuri, în aceeași ordine; o axă care lipsea din țintă lipsește și după.
 */
import type { Axa, Miscare, Pozitie, Program, Scula } from '../ir/ir.ts';

export type ProgramImpachetat = {
  readonly axe: readonly Axa[];
  readonly scula: Scula;
  readonly turatie: number;
  readonly zSigur: number;
  /** Felul fiecărei mișcări (`FELURI`). */
  readonly feluri: Uint8Array<ArrayBuffer>;
  /** Pe mișcare: axele țintei (biții 0–3: X, Y, Z, A), sensul orar al arcului (4), elementul (5) și operația (6) etichetei. */
  readonly masti: Uint8Array<ArrayBuffer>;
  /** Numerele mișcărilor, la rând: axele prezente, apoi centrul și avansul, turația, secundele. */
  readonly numere: Float64Array<ArrayBuffer>;
  /** Textele etichetelor, la rând: textul, apoi elementul și operația, dacă sunt. */
  readonly texte: readonly string[];
  /** Sculele schimbărilor, la rând. */
  readonly scule: readonly Scula[];
};

const FELURI = ['rapida', 'taiere', 'arc', 'ax-pornit', 'ax-oprit', 'pauza', 'eticheta', 'schimba-scula'] as const satisfies readonly Miscare['tip'][];
const AXE: readonly Axa[] = ['X', 'Y', 'Z', 'A'];
const ORAR = 1 << 4, ELEMENT = 1 << 5, OPERATIE = 1 << 6;

/** Câte numere ține o mișcare în tablou (ca să-l alocăm o singură dată). */
function numereMiscare(m: Miscare): number {
  const axe = 'la' in m ? AXE.reduce((n, a) => n + (m.la[a] === undefined ? 0 : 1), 0) : 0;
  switch (m.tip) {
    case 'rapida': return axe;
    case 'taiere': return axe + 1;
    case 'arc': return axe + 3;
    case 'ax-pornit': case 'pauza': case 'schimba-scula': return 1;
    case 'ax-oprit': case 'eticheta': return 0;
  }
}

export function impacheteaza(p: Program): ProgramImpachetat {
  const n = p.miscari.length;
  const feluri = new Uint8Array(n), masti = new Uint8Array(n);
  const numere = new Float64Array(p.miscari.reduce((s, m) => s + numereMiscare(m), 0));
  const texte: string[] = [], scule: Scula[] = [];
  let k = 0;
  const pune = (x: number): void => { numere[k++] = x; };
  const tinta = (la: Pozitie): number => {
    let masca = 0;
    for (const [b, a] of AXE.entries()) {
      const v = la[a];
      if (v === undefined) continue;
      masca |= 1 << b;
      pune(v);
    }
    return masca;
  };
  for (const [i, m] of p.miscari.entries()) {
    feluri[i] = FELURI.indexOf(m.tip);
    switch (m.tip) {
      case 'rapida': masti[i] = tinta(m.la); break;
      case 'taiere': masti[i] = tinta(m.la); pune(m.avans); break;
      case 'arc':
        masti[i] = tinta(m.la) | (m.sens === 'orar' ? ORAR : 0);
        pune(m.centru.x);
        pune(m.centru.y);
        pune(m.avans);
        break;
      case 'ax-pornit': pune(m.turatie); break;
      case 'ax-oprit': break;
      case 'pauza': pune(m.secunde); break;
      case 'eticheta':
        texte.push(m.text);
        if (m.element !== undefined) texte.push(m.element);
        if (m.operatie !== undefined) texte.push(m.operatie);
        masti[i] = (m.element !== undefined ? ELEMENT : 0) | (m.operatie !== undefined ? OPERATIE : 0);
        break;
      case 'schimba-scula': scule.push(m.scula); pune(m.turatie); break;
    }
  }
  return { axe: p.axe, scula: p.scula, turatie: p.turatie, zSigur: p.zSigur, feluri, masti, numere, texte, scule };
}

export function despacheteaza(p: ProgramImpachetat): Program {
  const { feluri, masti, numere, texte, scule } = p;
  let k = 0, t = 0, s = 0;
  const ia = (): number => numere[k++] as number;
  const text = (): string => texte[t++] as string;
  const tinta = (masca: number): Pozitie => {
    const la: { [K in Axa]?: number } = {};
    for (const [b, a] of AXE.entries()) if (masca & (1 << b)) la[a] = ia();
    return la;
  };
  const miscari: Miscare[] = [];
  for (let i = 0; i < feluri.length; i++) {
    const masca = masti[i] as number;
    const fel = FELURI[feluri[i] as number];
    switch (fel) {
      case 'rapida': miscari.push({ tip: 'rapida', la: tinta(masca) }); break;
      case 'taiere': {
        const la = tinta(masca);
        miscari.push({ tip: 'taiere', la, avans: ia() });
        break;
      }
      case 'arc': {
        const la = tinta(masca), x = ia(), y = ia();
        miscari.push({ tip: 'arc', la, centru: { x, y }, sens: masca & ORAR ? 'orar' : 'trigonometric', avans: ia() });
        break;
      }
      case 'ax-pornit': miscari.push({ tip: 'ax-pornit', turatie: ia() }); break;
      case 'ax-oprit': miscari.push({ tip: 'ax-oprit' }); break;
      case 'pauza': miscari.push({ tip: 'pauza', secunde: ia() }); break;
      case 'eticheta': {
        const x = text();
        const element = masca & ELEMENT ? text() : undefined, operatie = masca & OPERATIE ? text() : undefined;
        miscari.push({ tip: 'eticheta', text: x, ...(element !== undefined ? { element } : {}), ...(operatie !== undefined ? { operatie } : {}) });
        break;
      }
      case 'schimba-scula': miscari.push({ tip: 'schimba-scula', scula: scule[s++] as Scula, turatie: ia() }); break;
      default: throw new Error(`programul împachetat are o mișcare de fel necunoscut (${String(feluri[i])}) la ${i}`);
    }
  }
  if (k !== numere.length || t !== texte.length || s !== scule.length) throw new Error('programul împachetat are date în plus');
  return { axe: p.axe, scula: p.scula, turatie: p.turatie, zSigur: p.zSigur, miscari };
}

/** Tablourile de transferat ale unui program împachetat. */
export function transferabileProgram(p: ProgramImpachetat): ArrayBuffer[] {
  return [p.feluri.buffer, p.masti.buffer, p.numere.buffer];
}
