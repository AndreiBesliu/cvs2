import { baleiajArc, type Miscare, type Pozitie, type Program, type Scula } from '../ir/ir.ts';
import { aplicaMontaj, oglindeste, transformareMontaj, type Montaj } from '../ir/montaj.ts';
import type { Contract, StrategieScula, Unitati } from './contract.ts';
import { numar, rotunjit, textAscii } from './numere.ts';

/**
 * Postul unic (T9, ADR 0009): IR-ul în coordonatele documentului + montajul + contractul → textul programului.
 * Singurul loc din aplicație care scrie G-code. Nu știe de document și nu face geometrie (`PLAN.md` §3.3).
 */
/**
 * O secțiune a programului (ADR 0046): de la linia `linie` (numărată de la 0) începe lucrarea unei etichete din IR cu
 * element sau operație, până la secțiunea următoare. Ultima, fără element, e finalul (retragerea, M5). Postul doar trece
 * mai departe ce scrie în etichetă; rezumatul jobului le citește.
 */
export type Sectiune = { readonly linie: number; readonly element?: string; readonly operatie?: string };

export type RezultatPost =
  /** `aproximari`: câte arce au ieșit segmente G1 (raza peste gardă, elicea nedeclarată), cu abaterea ≤ TOLERANTA_APROXIMARE. */
  | {
    readonly ok: true; readonly text: string; readonly linii: number; readonly aproximari: number;
    readonly sectiuni: readonly Sectiune[];
  }
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
  /** Unitățile programului (ADR 0083): mm (implicit, 3 zecimale) sau inch (G20, 5 zecimale; avansul în inch/min). */
  readonly unitati?: Unitati;
  /** Cum se schimbă scula; implicit, cea a contractului. `fisiere-separate` se scrie cu `posteazaPeScule`. */
  readonly strategieScula?: StrategieScula;
};

/** Plafonul programului pe artefact (T23). Se reglează cu capacitatea senderului, în etapa 3. */
export const PLAFON_LINII = 2_000_000;

/** Abaterea maximă a segmentelor care înlocuiesc un arc (raza peste gardă, elicea nedeclarată): toleranța proiectului (T2). */
export const TOLERANTA_APROXIMARE = 0.001;

/** Numărul sculei, cum îl acceptă familia GRBL (s8 A.1: T până la 255, peste dă error:38). */
export const SCULA_MAXIMA = 255;

const MM_PE_INCH = 25.4;

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

/** Un fișier al strategiei „fișiere separate”: scula lui și programul ei. */
export type FisierScula = {
  readonly scula: Scula; readonly text: string; readonly linii: number; readonly aproximari: number; readonly sectiuni: readonly Sectiune[];
};

/**
 * Strategia `fisiere-separate` (s8 §5.4): câte un program întreg pe sculă (antet, WCS, axul cu turația ei, final), în
 * ordinea programului. O parte fără tăieri (de exemplu, o schimbare chiar la început) nu devine fișier.
 */
export function posteazaPeScule(
  program: Program, montaj: Montaj, contract: Contract, optiuni: OptiuniPost,
): { readonly ok: true; readonly fisiere: readonly FisierScula[] } | { readonly ok: false; readonly motiv: string } {
  if (!contract.scula.acceptate.includes('fisiere-separate')) return { ok: false, motiv: `${contract.nume} nu acceptă fișiere separate pe sculă` };
  const parti: { scula: Scula; turatie: number; miscari: Miscare[] }[] = [{ scula: program.scula, turatie: program.turatie, miscari: [] }];
  for (const m of program.miscari) {
    if (m.tip === 'schimba-scula') parti.push({ scula: m.scula, turatie: m.turatie, miscari: [] });
    else parti.at(-1)?.miscari.push(m);
  }
  const fisiere: FisierScula[] = [];
  for (const p of parti) {
    if (!p.miscari.some((m) => m.tip === 'taiere' || m.tip === 'arc')) continue;
    const r = posteaza({ ...program, scula: p.scula, turatie: p.turatie, miscari: p.miscari }, montaj, contract, { ...optiuni, strategieScula: 'fisiere-separate' });
    if (!r.ok) return { ok: false, motiv: `T${p.scula.numar}: ${r.motiv}` };
    fisiere.push({ scula: p.scula, text: r.text, linii: r.linii, aproximari: r.aproximari, sectiuni: r.sectiuni });
  }
  if (fisiere.length === 0) return { ok: false, motiv: 'programul n-are nicio tăiere' };
  return { ok: true, fisiere };
}

/**
 * Comentariul din antet care spune cum se schimbă scula, când programul o schimbă (s8 §5.10: fișa de lucru). Fără paranteze
 * (ar închide comentariul) și sub plafonul liniei (`comentariu` taie).
 */
const DESCRIERE_STRATEGIE: Readonly<Record<Exclude<StrategieScula, 'fisiere-separate'>, string>> = {
  'bariera-sender': 'scula: oprire in senderul CNC Vector Studio, M6 nu pleaca',
  'm6-controler': 'scula: M6 la controler',
  'm0-comentariu': 'scula: M0, cu scula in comentariu',
};

function scrie(
  program: Program, montaj: Montaj, k: Contract, optiuni: OptiuniPost,
): { text: string; linii: number; aproximari: number; sectiuni: Sectiune[] } {
  for (const axa of program.axe) {
    if (!k.axe.includes(axa)) throw new EroarePost(`axa ${axa} nu e în contractul ${k.nume}`);
  }
  const strategie = optiuni.strategieScula ?? k.scula.implicita;
  if (!k.scula.acceptate.includes(strategie)) throw new EroarePost(`${k.nume} nu acceptă schimbarea sculei „${strategie}”`);
  const schimbari = program.miscari.some((m) => m.tip === 'schimba-scula');
  if (schimbari && strategie === 'fisiere-separate') throw new EroarePost('cu fișiere separate pe sculă, programul se scrie cu posteazaPeScule');
  const inch = optiuni.unitati === 'inch';
  /** Din mm în unitatea programului. */
  const u = (mm: number): number => (inch ? mm / MM_PE_INCH : mm);
  const zec = inch ? k.zecimaleInch : k.zecimaleMm;
  const rezolutie = 10 ** -zec;
  const t = transformareMontaj(montaj);
  const oglindit = oglindeste(t);
  const n = (v: number): string => numar(v, zec);
  const antet = k.antet.map((l) => l.replace('{unitati}', k.unitati[inch ? 'inch' : 'mm']));
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

  // Poziția în coordonatele DOCUMENTULUI (exactă) și cea scrisă la mașină (rotunjită, în unitatea programului), axă cu axă.
  const doc: Pos = { x: undefined, y: undefined, z: undefined };
  const scris: Pos = { x: undefined, y: undefined, z: undefined };
  let avansCurent: number | undefined;
  let aproximari = 0;
  const sectiuni: Sectiune[] = [];

  const masina = (x: number, y: number): { x: number; y: number } => aplicaMontaj(t, x, y);
  const avans = (f: number): string => {
    if (!(f > 0) || !Number.isFinite(f)) throw new EroarePost(`avans nevalid: ${f}`);
    if (avansCurent === f) return '';
    avansCurent = f;
    // În inch/min, cu 3 zecimale: o zecimală ar rotunji 1000 mm/min la 39,4 in/min (0,07 %).
    return ` F${numar(u(f), inch ? 3 : 1)}`;
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
      if (la.X !== undefined) { text += ` X${n(u(m.x))}`; scris.x = rotunjit(u(m.x), zec); }
      if (la.Y !== undefined) { text += ` Y${n(u(m.y))}`; scris.y = rotunjit(u(m.y), zec); }
      doc.x = x;
      doc.y = y;
    }
    if (la.Z !== undefined) {
      const z = u(la.Z + t.dz);
      text += ` Z${n(z)}`;
      scris.z = rotunjit(z, zec);
      doc.z = la.Z;
    }
    return text;
  };

  /** Ținta e chiar poziția scrisă deja, pe toate axele ei: o deplasare rapidă acolo nu face nimic. */
  const pePozitie = (la: Pozitie): boolean => {
    if (la.Z !== undefined && (scris.z === undefined || rotunjit(u(la.Z + t.dz), zec) !== scris.z)) return false;
    if (la.X !== undefined || la.Y !== undefined) {
      const x = la.X ?? doc.x;
      const y = la.Y ?? doc.y;
      if (x === undefined || y === undefined) return false;
      const m = masina(x, y);
      if (la.X !== undefined && (scris.x === undefined || rotunjit(u(m.x), zec) !== scris.x)) return false;
      if (la.Y !== undefined && (scris.y === undefined || rotunjit(u(m.y), zec) !== scris.y)) return false;
    }
    return true;
  };

  const arc = (mv: Extract<Miscare, { tip: 'arc' }>): void => {
    if (doc.x === undefined || doc.y === undefined || scris.x === undefined || scris.y === undefined) {
      throw new EroarePost('un arc cere poziția XY de start');
    }
    const startDoc = { x: doc.x, y: doc.y };
    const capatDoc = { x: mv.la.X ?? doc.x, y: mv.la.Y ?? doc.y };
    // Centrul, startul și capătul în coordonatele mașinii, în mm; în unitatea programului abia la scriere.
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
    // Elicea pe un controler care n-o declară (s8 §5.3): segmente G1, ca raza peste gardă.
    const segmentat = raza > k.arc.razaMaxima || (!k.elice && mv.la.Z !== undefined && zStart !== undefined && mv.la.Z !== zStart);
    for (let i = 1; i <= bucati; i++) {
      const ultima = i === bucati;
      const ui = u0 + (baleiaj * i) / bucati;
      // Capătul fiecărei bucăți, în coordonatele mașinii: exact pe cerc, ultimul exact capătul cerut.
      const capatMasina = ultima ? e : { x: c.x + raza * Math.cos(ui), y: c.y + raza * Math.sin(ui) };
      const zBucata = mv.la.Z === undefined || zStart === undefined ? undefined : zStart + ((mv.la.Z - zStart) * i) / bucati;
      const sx = scris.x ?? 0;
      const sy = scris.y ?? 0;
      const ex = rotunjit(u(capatMasina.x), zec);
      const ey = rotunjit(u(capatMasina.y), zec);
      const coarda = Math.hypot(ex - sx, ey - sy);
      const dreapta = coarda < k.arc.coardaMinimaRezolutii * rezolutie || Math.abs(baleiaj / bucati) < k.arc.unghiMinim;
      const z = zBucata === undefined ? '' : ` Z${n(u(zBucata + t.dz))}`;
      if (segmentat) {
        // Segmente G1 pe cercul exact, cu săgeata ≤ toleranța. O singură coardă ar abate cu milimetri: 8 mm pe un arc de
        // 1 m cu raza de 15 m.
        const pasMaxim = 2 * Math.acos(1 - TOLERANTA_APROXIMARE / raza);
        const segmente = Math.max(1, Math.ceil(Math.abs(baleiaj / bucati) / pasMaxim));
        const uStart = u0 + (baleiaj * (i - 1)) / bucati;
        for (let q = 1; q <= segmente; q++) {
          const uq = uStart + (baleiaj / bucati) * (q / segmente);
          const pq = q === segmente ? capatMasina : { x: c.x + raza * Math.cos(uq), y: c.y + raza * Math.sin(uq) };
          const zq = zStart === undefined || mv.la.Z === undefined
            ? '' : ` Z${n(u(zStart + (mv.la.Z - zStart) * ((i - 1 + q / segmente) / bucati) + t.dz))}`;
          adauga(`G1 X${n(u(pq.x))} Y${n(u(pq.y))}${zq}${avans(mv.avans)}`);
        }
        aproximari++;
      } else if (dreapta) {
        adauga(`G1 X${n(u(capatMasina.x))} Y${n(u(capatMasina.y))}${z}${avans(mv.avans)}`);
      } else {
        // I / J din startul deja rotunjit (strategia B din s8 §4.2): controlerul vede exact centrul ăsta.
        const i0 = u(c.x) - sx;
        const j0 = u(c.y) - sy;
        adauga(`${trig ? 'G3' : 'G2'} X${n(u(capatMasina.x))} Y${n(u(capatMasina.y))}${z} I${n(i0)} J${n(j0)}${avans(mv.avans)}`);
      }
      scris.x = ex;
      scris.y = ey;
      if (zBucata !== undefined) { scris.z = rotunjit(u(zBucata + t.dz), zec); doc.z = zBucata; }
    }
    doc.x = capatDoc.x;
    doc.y = capatDoc.y;
  };

  const zSigur = program.zSigur;
  const pauza = (secunde: number): string => `${k.pauza.cuvant}${k.pauza.unitate === 's' ? numar(secunde, 3) : String(Math.round(secunde * 1000))}`;
  const pornesteAx = (turatie: number): void => {
    if (!(turatie > 0) || !Number.isInteger(turatie)) throw new EroarePost(`turație nevalidă: ${turatie}`);
    adauga(`M3 S${turatie}`);
    adauga(pauza(optiuni.asteptareAx));
  };
  const descrieScula = (s: Scula): string => `scula T${s.numar} ${s.nume} D${numar(s.diametru, 3)}`;

  // ── Antetul: cine a scris programul, pentru ce montaj și cu ce sculă; apoi tot ce e modal, explicit. ──
  const { foaie } = montaj;
  comentariu('CNC Vector Studio');
  comentariu(`post ${k.nume}`);
  comentariu(`origine ${montaj.origine}, Z0 ${montaj.z0}, foaia ${numar(foaie.latime, 3)} x ${numar(foaie.inaltime, 3)} x ${numar(foaie.grosime, 3)} mm`);
  comentariu(descrieScula(program.scula));
  if (schimbari && strategie !== 'fisiere-separate') comentariu(DESCRIERE_STRATEGIE[strategie]);
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
  for (const l of antet) adauga(l);
  adauga(k.wcs);

  adauga(`G0${cuvinte({ Z: zSigur })}`);
  pornesteAx(program.turatie);

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
        adauga(pauza(mv.secunde));
        break;
      case 'eticheta':
        if (mv.element !== undefined || mv.operatie !== undefined) {
          sectiuni.push({
            linie: linii.length, ...(mv.element !== undefined ? { element: mv.element } : {}),
            ...(mv.operatie !== undefined ? { operatie: mv.operatie } : {}),
          });
        }
        comentariu(mv.text);
        break;
      case 'schimba-scula': {
        const s = mv.scula;
        if (!Number.isInteger(s.numar) || s.numar < 0 || s.numar > SCULA_MAXIMA) throw new EroarePost(`numărul sculei T${s.numar} nu e între 0 și ${SCULA_MAXIMA}`);
        // Înainte: sus, axul oprit; apoi oprirea, cu scula numită.
        if (!pePozitie({ Z: zSigur })) adauga(`G0${cuvinte({ Z: zSigur })}`);
        adauga('M5');
        if (strategie === 'm0-comentariu') {
          comentariu(`SCHIMBA SCULA: T${s.numar} ${s.nume} D${numar(s.diametru, 3)}, apoi zero Z`);
          adauga('M0');
        } else {
          comentariu(descrieScula(s));
          adauga(`T${s.numar} M6`);
        }
        // Blocul de după (PORTARE §3.4): starea modală întâi (palparea sau o comandă a omului pot lăsa G91 / G20), WCS-ul,
        // Z sigur, axul cu turația noii scule și pauza; F se scrie din nou la prima tăiere. XY nu se mai știe: următoarea
        // deplasare se scrie întreagă.
        for (const l of antet) adauga(l);
        adauga(k.wcs);
        scris.x = undefined; scris.y = undefined; scris.z = undefined;
        doc.x = undefined; doc.y = undefined;
        avansCurent = undefined;
        adauga(`G0${cuvinte({ Z: zSigur })}`);
        pornesteAx(mv.turatie);
        break;
      }
      default: {
        const _exhaustiv: never = mv;
        throw new EroarePost(`mișcare necunoscută: ${JSON.stringify(_exhaustiv)}`);
      }
    }
  }

  sectiuni.push({ linie: linii.length });
  if (!pePozitie({ Z: zSigur })) adauga(`G0${cuvinte({ Z: zSigur })}`);
  adauga('M5');
  for (const l of k.final) adauga(l);
  return { text: `${linii.join('\n')}\n`, linii: linii.length, aproximari, sectiuni };
}
