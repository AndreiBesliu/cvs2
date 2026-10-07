import { baleiajArc, type Miscare, type Pozitie, type Program } from '../ir/ir.ts';
import { aplicaMontaj, oglindeste, transformareMontaj, type Montaj } from '../ir/montaj.ts';
import type { Contract } from './contract.ts';
import { numar, rotunjit, textAscii } from './numere.ts';

/**
 * Postul unic (T9, ADR 0009): IR-ul în coordonatele documentului + montajul + contractul → textul programului.
 * Singurul loc din aplicație care scrie G-code. Nu știe de document și nu face geometrie (`PLAN.md` §3.3).
 */
export type RezultatPost =
  /** `aproximari`: câte arce au ieșit segmente G1 (raza peste gardă), declarate, cu abaterea ≤ TOLERANTA_APROXIMARE. */
  | { readonly ok: true; readonly text: string; readonly linii: number; readonly aproximari: number }
  | { readonly ok: false; readonly motiv: string };

export type OptiuniPost = {
  /** Cât așteaptă axul după pornire până la turație, în secunde: un parametru al mașinii (s8 §5.5). */
  readonly asteptareAx: number;
  /**
   * Ieșirea din foaie, confirmată de om (decizia owner-ului din 07.10.2026). Se scrie în antet, ca s-o vadă și cel de la
   * mașină. Contractul cu oracolul (`test/oracles/poarta.ts`, invarianta 5) e exact:
   * - `(CONFIRMAT: freza iese din foaie)`;
   * - `(iesire mm: st 5.000 dr 0.000 jos 0.000 sus 0.000)`: cât trece discul frezei de fiecare latură a foii, cât taie, în
   *   coordonatele documentului, cu 3 zecimale.
   * Postul doar scrie: măsurătoarea și confirmarea sunt ale exportului.
   */
  readonly iesireConfirmata?: { readonly stanga: number; readonly dreapta: number; readonly jos: number; readonly sus: number };
};

/** Plafonul programului pe artefact (T23). Se reglează cu capacitatea senderului, în etapa 3. */
export const PLAFON_LINII = 2_000_000;

/** Abaterea maximă a segmentelor care înlocuiesc un arc cu raza peste gardă: toleranța proiectului (T2). */
export const TOLERANTA_APROXIMARE = 0.001;

class EroarePost extends Error {}

const CODOR = new TextEncoder();

type Pos = { x: number | undefined; y: number | undefined; z: number | undefined };

export function posteaza(program: Program, montaj: Montaj, contract: Contract, optiuni: OptiuniPost): RezultatPost {
  try {
    return { ok: true, ...scrie(program, montaj, contract, optiuni) };
  } catch (e) {
    // Datele care nu se pot scrie (un număr nefinit, o cotă absurdă) devin motiv, nu excepție.
    if (e instanceof EroarePost || e instanceof RangeError) return { ok: false, motiv: e.message };
    throw e;
  }
}

function scrie(program: Program, montaj: Montaj, k: Contract, optiuni: OptiuniPost): { text: string; linii: number; aproximari: number } {
  for (const axa of program.axe) {
    if (!k.axe.includes(axa)) throw new EroarePost(`axa ${axa} nu e în contractul ${k.nume}`);
  }
  const zec = k.zecimaleMm;
  const rezolutie = 10 ** -zec;
  const t = transformareMontaj(montaj);
  const oglindit = oglindeste(t);
  const n = (v: number): string => numar(v, zec);
  const linii: string[] = [];

  const adauga = (linie: string): void => {
    if (CODOR.encode(linie).length > k.liniaMaxima) {
      throw new EroarePost(`linia ${linii.length + 1} are peste ${k.liniaMaxima} de octeți: ${linie.slice(0, 40)}…`);
    }
    if (linii.length >= PLAFON_LINII) throw new EroarePost(`programul trece de ${PLAFON_LINII} de linii`);
    linii.push(linie);
  };
  const comentariu = (text: string): void => {
    const { deschidere, inchidere } = k.comentariu;
    const loc = k.liniaMaxima - deschidere.length - inchidere.length;
    adauga(`${deschidere}${textAscii(text, deschidere + inchidere).slice(0, loc)}${inchidere}`);
  };

  // Poziția în coordonatele DOCUMENTULUI (exactă) și cea scrisă la mașină (rotunjită), axă cu axă.
  const doc: Pos = { x: undefined, y: undefined, z: undefined };
  const scris: Pos = { x: undefined, y: undefined, z: undefined };
  let avansCurent: number | undefined;
  let aproximari = 0;

  const masina = (x: number, y: number): { x: number; y: number } => aplicaMontaj(t, x, y);
  const avans = (f: number): string => {
    if (!(f > 0) || !Number.isFinite(f)) throw new EroarePost(`avans nevalid: ${f}`);
    if (avansCurent === f) return '';
    avansCurent = f;
    return ` F${numar(f, 1)}`;
  };

  /** Cuvintele de axă ale unei ținte, transformate de montaj, și noua poziție. */
  const cuvinte = (la: Pozitie): string => {
    if (la.A !== undefined) throw new EroarePost('axa A nu se taie în v1');
    const x = la.X ?? doc.x;
    const y = la.Y ?? doc.y;
    let text = '';
    if (la.X !== undefined || la.Y !== undefined) {
      if (x === undefined || y === undefined) {
        // Montajele din v1 sunt translații: o axă fără cealaltă e bine definită.
        if (t.b !== 0 || t.c !== 0) throw new EroarePost('o mișcare pe o singură axă XY cere poziția celeilalte');
      }
      const m = masina(x ?? 0, y ?? 0);
      if (la.X !== undefined) { text += ` X${n(m.x)}`; scris.x = rotunjit(m.x, zec); }
      if (la.Y !== undefined) { text += ` Y${n(m.y)}`; scris.y = rotunjit(m.y, zec); }
      doc.x = x;
      doc.y = y;
    }
    if (la.Z !== undefined) {
      const z = la.Z + t.dz;
      text += ` Z${n(z)}`;
      scris.z = rotunjit(z, zec);
      doc.z = la.Z;
    }
    return text;
  };

  /** Ținta e chiar poziția scrisă deja, pe toate axele ei: o deplasare rapidă acolo nu face nimic. */
  const pePozitie = (la: Pozitie): boolean => {
    if (la.Z !== undefined && (scris.z === undefined || rotunjit(la.Z + t.dz, zec) !== scris.z)) return false;
    if (la.X !== undefined || la.Y !== undefined) {
      const x = la.X ?? doc.x;
      const y = la.Y ?? doc.y;
      if (x === undefined || y === undefined) return false;
      const m = masina(x, y);
      if (la.X !== undefined && (scris.x === undefined || rotunjit(m.x, zec) !== scris.x)) return false;
      if (la.Y !== undefined && (scris.y === undefined || rotunjit(m.y, zec) !== scris.y)) return false;
    }
    return true;
  };

  const arc = (mv: Extract<Miscare, { tip: 'arc' }>): void => {
    if (doc.x === undefined || doc.y === undefined || scris.x === undefined || scris.y === undefined) {
      throw new EroarePost('un arc cere poziția XY de start');
    }
    const startDoc = { x: doc.x, y: doc.y };
    const capatDoc = { x: mv.la.X ?? doc.x, y: mv.la.Y ?? doc.y };
    const c = masina(mv.centru.x, mv.centru.y);
    const s = masina(startDoc.x, startDoc.y);
    const e = masina(capatDoc.x, capatDoc.y);
    const trig = (mv.sens === 'trigonometric') !== oglindit;
    const raza = Math.hypot(s.x - c.x, s.y - c.y);
    const u0 = Math.atan2(s.y - c.y, s.x - c.x);
    // Baleiajul se calculează o dată, pe coordonatele DOCUMENTULUI, ca la CAM (`src/cam/iesire.ts`): pe coordonatele
    // mașinii, alte numere ar putea trece pragul cercului întreg altfel. Oglindirea îi schimbă doar semnul.
    const baleiajDoc = baleiajArc(startDoc, capatDoc, mv.centru, mv.sens === 'trigonometric');
    const baleiaj = oglindit ? -baleiajDoc : baleiajDoc;
    const bucati = Math.max(1, Math.ceil(Math.abs(baleiaj) / k.arc.baleiajMaxim - 1e-9));
    const zStart = doc.z;
    for (let i = 1; i <= bucati; i++) {
      const ultima = i === bucati;
      const u = u0 + (baleiaj * i) / bucati;
      // Capătul fiecărei bucăți, în coordonatele documentului: exact pe cerc, ultimul exact capătul cerut.
      const capatMasina = ultima ? e : { x: c.x + raza * Math.cos(u), y: c.y + raza * Math.sin(u) };
      const zBucata = mv.la.Z === undefined || zStart === undefined ? undefined : zStart + ((mv.la.Z - zStart) * i) / bucati;
      const sx = scris.x ?? 0;
      const sy = scris.y ?? 0;
      const ex = rotunjit(capatMasina.x, zec);
      const ey = rotunjit(capatMasina.y, zec);
      const coarda = Math.hypot(ex - sx, ey - sy);
      const dreapta = coarda < k.arc.coardaMinimaRezolutii * rezolutie || Math.abs(baleiaj / bucati) < k.arc.unghiMinim;
      const z = zBucata === undefined ? '' : ` Z${n(zBucata + t.dz)}`;
      if (raza > k.arc.razaMaxima) {
        // Raza peste gardă: segmente G1 pe cercul exact, cu săgeata ≤ toleranța. O singură coardă ar abate cu milimetri:
        // 8 mm pe un arc de 1 m cu raza de 15 m.
        const pasMaxim = 2 * Math.acos(1 - TOLERANTA_APROXIMARE / raza);
        const segmente = Math.max(1, Math.ceil(Math.abs(baleiaj / bucati) / pasMaxim));
        const uStart = u0 + (baleiaj * (i - 1)) / bucati;
        for (let q = 1; q <= segmente; q++) {
          const uq = uStart + (baleiaj / bucati) * (q / segmente);
          const pq = q === segmente ? capatMasina : { x: c.x + raza * Math.cos(uq), y: c.y + raza * Math.sin(uq) };
          const zq = zStart === undefined || mv.la.Z === undefined
            ? '' : ` Z${n(zStart + (mv.la.Z - zStart) * ((i - 1 + q / segmente) / bucati) + t.dz)}`;
          adauga(`G1 X${n(pq.x)} Y${n(pq.y)}${zq}${avans(mv.avans)}`);
        }
        aproximari++;
      } else if (dreapta) {
        adauga(`G1 X${n(capatMasina.x)} Y${n(capatMasina.y)}${z}${avans(mv.avans)}`);
      } else {
        // I / J din startul deja rotunjit (strategia B din s8 §4.2): controlerul vede exact centrul ăsta.
        const i0 = c.x - sx;
        const j0 = c.y - sy;
        adauga(`${trig ? 'G3' : 'G2'} X${n(capatMasina.x)} Y${n(capatMasina.y)}${z} I${n(i0)} J${n(j0)}${avans(mv.avans)}`);
      }
      scris.x = ex;
      scris.y = ey;
      if (zBucata !== undefined) { scris.z = rotunjit(zBucata + t.dz, zec); doc.z = zBucata; }
    }
    doc.x = capatDoc.x;
    doc.y = capatDoc.y;
  };

  // ── Antetul: cine a scris programul, pentru ce montaj și cu ce sculă; apoi tot ce e modal, explicit. ──
  const { foaie } = montaj;
  comentariu('CNC Vector Studio');
  comentariu(`post ${k.nume}`);
  comentariu(`origine ${montaj.origine}, Z0 ${montaj.z0}, foaia ${n(foaie.latime)} x ${n(foaie.inaltime)} x ${n(foaie.grosime)} mm`);
  comentariu(`scula T${program.scula.numar} ${program.scula.nume} D${n(program.scula.diametru)}`);
  if (optiuni.iesireConfirmata) {
    const { stanga, dreapta, jos, sus } = optiuni.iesireConfirmata;
    for (const v of [stanga, dreapta, jos, sus]) {
      if (!(v >= 0)) throw new EroarePost(`ieșirea din foaie nu poate fi ${v} mm`);
    }
    const { deschidere, inchidere } = k.comentariu;
    // Prin `adauga`, nu prin `comentariu`: linia contractului nu se taie niciodată în tăcere; prea lungă, exportul cade.
    adauga(`${deschidere}CONFIRMAT: freza iese din foaie${inchidere}`);
    adauga(`${deschidere}iesire mm: st ${numar(stanga, 3)} dr ${numar(dreapta, 3)} jos ${numar(jos, 3)} sus ${numar(sus, 3)}${inchidere}`);
  }
  for (const l of k.antet) adauga(l);
  adauga(k.wcs);

  const zSigur = program.zSigur;
  adauga(`G0${cuvinte({ Z: zSigur })}`);
  if (!(program.turatie > 0) || !Number.isInteger(program.turatie)) throw new EroarePost(`turație nevalidă: ${program.turatie}`);
  adauga(`M3 S${program.turatie}`);
  const pauza = k.pauza.unitate === 's' ? numar(optiuni.asteptareAx, 3) : String(Math.round(optiuni.asteptareAx * 1000));
  adauga(`${k.pauza.cuvant}${pauza}`);

  for (const mv of program.miscari) {
    switch (mv.tip) {
      case 'rapida': {
        if (pePozitie(mv.la)) break;
        const w = cuvinte(mv.la);
        if (w) adauga(`G0${w}`);
        break;
      }
      case 'taiere': {
        const w = cuvinte(mv.la);
        if (w) adauga(`G1${w}${avans(mv.avans)}`);
        break;
      }
      case 'arc':
        arc(mv);
        break;
      case 'ax-pornit':
        adauga(`M3 S${Math.round(mv.turatie)}`);
        break;
      case 'ax-oprit':
        adauga('M5');
        break;
      case 'pauza':
        adauga(`${k.pauza.cuvant}${k.pauza.unitate === 's' ? numar(mv.secunde, 3) : String(Math.round(mv.secunde * 1000))}`);
        break;
      case 'eticheta':
        comentariu(mv.text);
        break;
      default: {
        const _exhaustiv: never = mv;
        throw new EroarePost(`mișcare necunoscută: ${JSON.stringify(_exhaustiv)}`);
      }
    }
  }

  if (!pePozitie({ Z: zSigur })) adauga(`G0${cuvinte({ Z: zSigur })}`);
  adauga('M5');
  for (const l of k.final) adauga(l);
  return { text: `${linii.join('\n')}\n`, linii: linii.length, aproximari };
}
