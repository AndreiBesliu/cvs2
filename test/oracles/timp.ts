/**
 * ORACOLUL TIMPULUI pe GRBL 1.1h: cât durează un program G-code pe controler, cu ZERO importuri din `src/`. E scris
 * din codul sursă GRBL 1.1h (gnea/grbl, eticheta `v1.1h.20190825`), nu din memorie și nu din modelul aplicației:
 * fiecare regulă de mai jos poartă fișierul și linia de unde e luată. Aplicația își scrie modelul separat; oracolul
 * îl judecă pe un corpus, deci nu trebuie să-i vadă codul (nici invers).
 *
 * Ce modelează, în ordinea în care trece un program prin controler:
 * 1. `protocol.c:119-150`: curățarea liniei (spațiile și caracterele de control aruncate, `/` ignorat, comentariile
 *    `( … )` și `;` aruncate, literele mici ridicate, cel mult 79 de caractere utile).
 * 2. `gcode.c:66-1133` (`gc_execute_line`): cuvintele, grupurile modale, verificările de eroare care ar refuza linia,
 *    apoi ordinea de execuție (avansul, turația, axul, răcirea, pauza, modurile, mișcarea, sfârșitul programului).
 * 3. `motion_control.c:87-191` (`mc_arc`): arcul tăiat în segmente exact ca pe controler.
 * 4. `planner.c:315-472` (`plan_buffer_line`) și `planner.c:126-196` (`planner_recalculate`): planificatorul, cu
 *    inelul lui de blocuri și pointerul „planificat”, transcris literal.
 * 5. `stepper.c:759-842` (`st_prep_buffer`): profilul fiecărui bloc (accelerare, croazieră, frânare), în aproximarea
 *    continuă: fără segmentele de 10 ms, fără temporizarea pașilor (vezi „Ce NU modelează”).
 *
 * Ipoteza de flux: senderul ține plin bufferul serial al GRBL, deci linia următoare e mereu citită și un bloc nou
 * intră în planificator imediat ce se eliberează un loc (derivarea ferestrei e la `blocuriPlanificator`).
 *
 * Aritmetica: dublă precizie. Pe AVR, GRBL lucrează în float pe 32 de biți (și `double` e tot float pe avr-gcc), deci
 * acolo unde un rezultat e un prag (`lround` pe pași, `ceil` pe pauză, `floor` pe numărul de segmente, pragurile
 * 0.999999 ale joncțiunii), controlerul poate cădea de cealaltă parte a pragului pe valori aflate fix pe el. Nu
 * emulăm float32; cazurile de hârtie sunt alese departe de praguri.
 *
 * Ce NU modelează: bufferul de segmente (`DT_SEGMENT` = 10 ms, `stepper.c:26`) și efectele lui (vezi derivarea
 * ferestrei), rotunjirea perioadei pasului la ciclul de ceas, AMASS și plafonul `0xffff` la viteze foarte mici
 * (`stepper.c:1013-1047`), regula „cel puțin un pas pe segment” (`stepper.c:942-946`), timpul de parsare și debitul
 * portului serial, override-urile diferite de 100 %, modul laser (`$32=1`), limitele soft, modul de verificare `$C`.
 */

// ---------------------------------------------------------------------------------------------------------------
// Constantele din sursă (toate citite, nu presupuse).

/** `planner.h:27-33`: 16 sloturi (15 doar cu `USE_LINE_NUMBERS`, care e comentat în `config.h:159`). */
const BLOCK_BUFFER_SIZE_11H = 16;
/** `config.h:385` (mm/min). */
const MINIMUM_JUNCTION_SPEED = 0.0;
/** `config.h:391` (mm/min). */
const MINIMUM_FEED_RATE = 1.0;
/** `config.h:397`. */
const N_ARC_CORRECTION = 12;
/** `config.h:407` (rad). */
const ARC_ANGULAR_TRAVEL_EPSILON = 5e-7;
/** `config.h:414` (ms). */
const DWELL_TIME_STEP = 50;
/** `nuts_bolts.h:28`. */
const SOME_LARGE_VALUE = 1.0e38;
/** `nuts_bolts.h`: `MM_PER_INCH (25.40)`. */
const MM_PER_INCH = 25.4;
/** `config.h:241` și `config.h:247`: override-urile de avans și de rapide pornesc la 100 % și nu le schimbă nimeni. */
const SUPRASCRIERE_AVANS = 100;
const SUPRASCRIERE_RAPIDE = 100;
/** `protocol.h:31-32` (`LINE_BUFFER_SIZE` 80) și `protocol.c:141`: al 80-lea caracter util dă depășire. */
const CARACTERE_PE_LINIE = 80 - 1;
/** `gcode.c:27-28`. */
const MAX_LINE_NUMBER = 10000000;
const MAX_TOOL_NUMBER = 255;
/** `nuts_bolts.c:25`: cifrele de după a opta se pierd. */
const MAX_INT_DIGITS = 8;
/** `motion_control.c:109`: numărul de segmente e un `uint16_t`; `nuts_bolts.c:114`: contorul pauzei, la fel. */
const UINT16_MAX = 65535;

// ---------------------------------------------------------------------------------------------------------------
// Interfața.

export type SetariGrbl = {
  /** `$100`–`$102`, pași/mm, X Y Z. */
  readonly pasiPeMm: readonly [number, number, number];
  /** `$110`–`$112`, mm/min. */
  readonly vitezaMaxima: readonly [number, number, number];
  /** `$120`–`$122`, mm/s², cum le arată `$$` (GRBL le ține intern în mm/min²: `settings.c:216`, ×60×60). */
  readonly acceleratie: readonly [number, number, number];
  /** `$11`, mm. */
  readonly deviatieJonctiune: number;
  /** `$12`, mm. */
  readonly toleranteArc: number;
  /**
   * Câte blocuri de mișcare ține planificatorul cel mult, cel care se execută inclus. Pe GRBL 1.1h: 15. Derivarea, din
   * sursă (și, cu ea, câte blocuri cunoaște planificatorul când se fixează ieșirea blocului care se execută):
   * 1. Inelul are `BLOCK_BUFFER_SIZE` = 16 sloturi (`planner.h:27-33`), dar `block_buffer_head` arată mereu un slot gol
   *    (`planner.c:103-104`), iar `plan_check_full_buffer` zice „plin” când `tail == next_buffer_head`
   *    (`planner.c:250-254`), adică la 16 − 1 = 15 blocuri.
   * 2. `mc_line` stă în bucla `motion_control.c:60-65` cât timp bufferul e plin; acolo cheamă
   *    `protocol_execute_realtime`, care umple bufferul de segmente (`st_prep_buffer`, `protocol.c:496-499`).
   * 3. Blocul k−1 iese din planificator când i s-a PREGĂTIT ultimul segment (`plan_discard_current_block`,
   *    `stepper.c:1076-1077`; `planner.c:215-223`), nu când s-a executat. Rămân k..k+13; dacă bufferul de segmente are
   *    loc, `st_prep_buffer` încarcă blocul k cu ieșirea `plan_get_exec_block_exit_speed_sqr` (`stepper.c:784`,
   *    `planner.c:241-246`) = intrarea lui k+1, planificată cu 14 blocuri.
   * 4. La ieșirea din `st_prep_buffer`, `mc_line` găsește loc și adaugă k+14 (linia e deja citită: ipoteza de flux).
   *    `planner_recalculate` re-planifică înapoi de la k+14, care se termină în repaus (`planner.c:141-142`); când
   *    trecerea înapoi ajunge la coadă (`planner.c:147` și `155`), cheamă `st_update_plan_block_parameters`
   *    (`stepper.c:598-605`), care reface profilul blocului k din viteza lui curentă. În aproximarea continuă, k n-a
   *    parcurs încă nimic, deci profilul lui k se fixează cu k..k+14 cunoscute: 15 blocuri (14 după el).
   * 5. Cât timp k se execută, bufferul e plin (k..k+14): nu intră nimic până la aruncarea lui k, deci ieșirea lui k nu
   *    se mai schimbă. Dacă pointerul „planificat” e după coadă, ieșirea lui k e oricum fixă (`planner.c:144-167`
   *    nu atinge blocul `block_buffer_planned`).
   * 6. La pornire, ciclul începe când bufferul e plin (`protocol_auto_cycle_start`, `motion_control.c:63`), deci
   *    primul bloc pornește tot cu 15 cunoscute. La o sincronizare sau la capătul programului nu mai intră nimic:
   *    blocurile rămase se execută cu ce e în buffer, ultimul în repaus.
   * Abateri reale de la 15 (nemodelate): blocuri mai scurte decât un segment de 10 ms, când ISR-ul golește mai multe
   * segmente între două treceri ale buclei principale (atunci `st_prep_buffer` aruncă mai multe blocuri până intră
   * unul nou, fereastra scade); pornirea ciclului, când se pregătesc până la 5 segmente (`stepper.h:25-26`) înainte
   * de primul bloc nou; un port serial mai lent decât execuția.
   */
  readonly blocuriPlanificator: number;
};

/**
 * Implicitele GRBL 1.1h: `config.h:37` alege `DEFAULTS_GENERIC`, iar `defaults.h:30-52` dă 250 pași/mm, 500 mm/min,
 * 10·60·60 mm/min² (= 10 mm/s²), `$11` 0,01 mm și `$12` 0,002 mm pe toate axele; fereastra: 16 − 1 = 15 (mai sus).
 */
export const IMPLICITE_GRBL_11H: SetariGrbl = {
  pasiPeMm: [250, 250, 250],
  vitezaMaxima: [500, 500, 500],
  acceleratie: [10, 10, 10],
  deviatieJonctiune: 0.01,
  toleranteArc: 0.002,
  blocuriPlanificator: BLOCK_BUFFER_SIZE_11H - 1,
};

export type TimpGrbl = {
  /** Totalul: mișcarea + pauzele (G4). */
  readonly secunde: number;
  /** Doar G4. */
  readonly secundePauze: number;
  /** mm parcurși de blocurile G1/G2/G3 (lungimea blocurilor planificatorului, din pașii cuantizați). */
  readonly taiere: number;
  /** mm parcurși de blocurile G0. */
  readonly rapide: number;
  /** Câte blocuri au intrat în planificator (segmentele arcelor incluse; blocurile goale, nu). */
  readonly blocuri: number;
};

/**
 * Mutațiile mecanismelor, DOAR pentru controalele negative ale testelor: fiecare strică un mecanism care nu e o
 * setare, ca să se vadă că valoarea pe hârtie depinde de el. Fără ele, oracolul e GRBL 1.1h întocmai.
 */
export type MutatiiGrbl = {
  /** G4 ține exact P, fără `ceil` pe pasul de 50 ms din `delay_sec`. */
  readonly pauzaFaraRotunjire?: boolean;
  /** Schimbarea axului (M3/M4/M5), a turației cu axul pornit și a răcirii (M8/M9) NU mai golește bufferul. */
  readonly faraSincronizare?: boolean;
  /** Orice cuvânt S sau M3/M4/M5/M8/M9 golește bufferul, chiar dacă starea nu se schimbă. */
  readonly sincronizareMereu?: boolean;
};

/** Aruncă `Error` cu numărul liniei pe ce nu suportă (și pe ce GRBL ar refuza cu `error:N`). */
export function timpGrbl(gcode: string, s: SetariGrbl): TimpGrbl {
  return timpGrblMutat(gcode, s, {});
}

// ---------------------------------------------------------------------------------------------------------------
// Planificatorul (`planner.c`), transcris pe un inel de `blocuriPlanificator + 1` sloturi, ca pe controler.

type Vec3 = [number, number, number];

type Bloc = {
  /** `block->millimeters`: lungimea din pașii cuantizați. */
  readonly mm: number;
  /** `block->acceleration`, mm/min², limitată pe axe. */
  readonly acceleratie: number;
  /** `block->rapid_rate`, mm/min, limitată pe axe. */
  readonly vitezaRapida: number;
  /** `block->programmed_rate`, mm/min. */
  readonly vitezaProgramata: number;
  readonly rapid: boolean;
  /** `entry_speed_sqr`, (mm/min)². */
  intrare2: number;
  /** `max_entry_speed_sqr`. */
  intrareMax2: number;
  /** `max_junction_speed_sqr`. */
  readonly jonctiuneMax2: number;
};

type Planificator = {
  readonly pasiPeMm: readonly [number, number, number];
  /** mm/min²: `settings.c:216` ține accelerația ×60×60. */
  readonly acceleratie: readonly [number, number, number];
  readonly vitezaMaxima: readonly [number, number, number];
  readonly deviatie: number;
  readonly inel: Array<Bloc | undefined>;
  readonly marime: number;
  /** `block_buffer_tail`, `block_buffer_head`, `next_buffer_head`, `block_buffer_planned`. */
  coada: number;
  cap: number;
  capUrmator: number;
  planificat: number;
  /** `pl.position`, în pași. */
  pozitie: Vec3;
  /** `pl.previous_unit_vec`. */
  versor: Vec3;
  /** `pl.previous_nominal_speed`. */
  nominalaAnterioara: number;
};

/** `planner.c:44-49`. */
function urmator(p: Planificator, i: number): number {
  const j = i + 1;
  return j === p.marime ? 0 : j;
}
/** `planner.c:53-58`. */
function anterior(p: Planificator, i: number): number {
  return (i === 0 ? p.marime : i) - 1;
}
function bloc(p: Planificator, i: number): Bloc {
  const b = p.inel[i];
  if (!b) throw new Error(`intern: slotul ${i} al planificatorului e gol`);
  return b;
}

/** `lround` din C: jumătatea se rotunjește departe de zero (`Math.round` o duce spre +∞). */
function lround(x: number): number {
  return x < 0 ? -Math.round(-x) : Math.round(x);
}

/** `nuts_bolts.c:164-177`: normalizează pe loc și întoarce modulul; componentele nule nu intră în sumă. */
function laVersor(v: Vec3): number {
  let modul = 0;
  for (const c of v) if (c !== 0) modul += c * c;
  modul = Math.sqrt(modul);
  const inv = 1 / modul;
  for (let i = 0; i < 3; i++) v[i] = (v[i] ?? 0) * inv;
  return modul;
}

/** `nuts_bolts.c:180-190`: cea mai mică valoare care nu depășește maximul vreunei axe pe direcția dată. */
function limitaPeAxe(maxim: readonly [number, number, number], versor: Vec3): number {
  let limita = SOME_LARGE_VALUE;
  for (let i = 0; i < 3; i++) {
    const u = versor[i] ?? 0;
    if (u !== 0) limita = Math.min(limita, Math.abs((maxim[i] ?? 0) / u));
  }
  return limita;
}

/** `planner.c:259-269` (`plan_compute_profile_nominal_speed`), cu override-urile la 100 %. */
function vitezaNominala(b: Bloc): number {
  let v = b.vitezaProgramata;
  if (b.rapid) v *= 0.01 * SUPRASCRIERE_RAPIDE;
  else {
    v *= 0.01 * SUPRASCRIERE_AVANS;
    if (v > b.vitezaRapida) v = b.vitezaRapida;
  }
  return v > MINIMUM_FEED_RATE ? v : MINIMUM_FEED_RATE;
}

/** `planner.c:126-196` (`planner_recalculate`), literal. `st_update_plan_block_parameters` e fără efect aici (mai jos). */
function recalculeaza(p: Planificator): void {
  let i = anterior(p, p.cap);
  if (i === p.planificat) return; // un singur bloc planificabil
  let curent = bloc(p, i);
  // Ultimul bloc se termină mereu în repaus (planner.c:141-142).
  curent.intrare2 = Math.min(curent.intrareMax2, 2 * curent.acceleratie * curent.mm);
  i = anterior(p, i);
  if (i !== p.planificat) {
    // Trecerea înapoi (planner.c:149-166). Când `i` ajunge la coadă, GRBL cheamă `st_update_plan_block_parameters`:
    // reface profilul blocului care se execută din viteza lui de acum. În modelul acesta coada n-a pornit încă
    // (blocul nou intră înainte ca ea să parcurgă ceva: vezi `blocuriPlanificator`, pasul 4), deci nu schimbă nimic.
    while (i !== p.planificat) {
      const urm = curent;
      curent = bloc(p, i);
      i = anterior(p, i);
      if (curent.intrare2 !== curent.intrareMax2) {
        const v2 = urm.intrare2 + 2 * curent.acceleratie * curent.mm;
        curent.intrare2 = v2 < curent.intrareMax2 ? v2 : curent.intrareMax2;
      }
    }
  }
  // Trecerea înainte (planner.c:171-195), care mută și pointerul „planificat”.
  let urm = bloc(p, p.planificat);
  i = urmator(p, p.planificat);
  while (i !== p.cap) {
    curent = urm;
    urm = bloc(p, i);
    if (curent.intrare2 < urm.intrare2) {
      const v2 = curent.intrare2 + 2 * curent.acceleratie * curent.mm;
      if (v2 < urm.intrare2) {
        urm.intrare2 = v2;
        p.planificat = i;
      }
    }
    if (urm.intrare2 === urm.intrareMax2) p.planificat = i;
    i = urmator(p, i);
  }
}

/**
 * `planner.c:315-472` (`plan_buffer_line`), fără mișcările de sistem și fără CoreXY. Întoarce blocul intrat sau `null`
 * pentru blocul gol (`planner.c:381`), care nu schimbă nimic în planificator.
 */
function planificaLinia(p: Planificator, tinta: Vec3, avans: number, rapid: boolean): Bloc | null {
  const tintaPasi: Vec3 = [0, 0, 0];
  const versor: Vec3 = [0, 0, 0];
  let pasi = 0;
  for (let i = 0; i < 3; i++) {
    // planner.c:369-372: ținta în pași (cuantizarea), apoi distanța din pașii cuantizați.
    const spm = p.pasiPeMm[i] ?? 0;
    const t = lround((tinta[i] ?? 0) * spm);
    tintaPasi[i] = t;
    const d = t - (p.pozitie[i] ?? 0);
    pasi = Math.max(pasi, Math.abs(d));
    versor[i] = d / spm;
  }
  if (pasi === 0) return null;
  const mm = laVersor(versor);
  const acceleratie = limitaPeAxe(p.acceleratie, versor);
  const vitezaRapida = limitaPeAxe(p.vitezaMaxima, versor);
  const vitezaProgramata = rapid ? vitezaRapida : avans;

  let jonctiuneMax2: number;
  if (p.cap === p.coada) {
    // planner.c:399-404: bufferul e gol, blocul pornește din repaus.
    jonctiuneMax2 = 0;
  } else {
    // planner.c:429-451: viteza maximă la joncțiune, din deviația de joncțiune.
    let cos = 0;
    const jv: Vec3 = [0, 0, 0];
    for (let i = 0; i < 3; i++) {
      cos -= (p.versor[i] ?? 0) * (versor[i] ?? 0);
      jv[i] = (versor[i] ?? 0) - (p.versor[i] ?? 0);
    }
    if (cos > 0.999999) {
      // Întoarcerea pe loc (unghi de 0° între direcții): viteza minimă de joncțiune.
      jonctiuneMax2 = MINIMUM_JUNCTION_SPEED * MINIMUM_JUNCTION_SPEED;
    } else if (cos < -0.999999) {
      // Mers drept înainte: joncțiune nelimitată (comentariul din sursă zice „180 degrees”, dar e linia dreaptă).
      jonctiuneMax2 = SOME_LARGE_VALUE;
    } else {
      laVersor(jv);
      const aj = limitaPeAxe(p.acceleratie, jv);
      const sin = Math.sqrt(0.5 * (1.0 - cos));
      jonctiuneMax2 = Math.max(MINIMUM_JUNCTION_SPEED * MINIMUM_JUNCTION_SPEED, (aj * p.deviatie * sin) / (1.0 - sin));
    }
  }
  const b: Bloc = { mm, acceleratie, vitezaRapida, vitezaProgramata, rapid, intrare2: 0, intrareMax2: 0, jonctiuneMax2 };
  // planner.c:456-458 și 274-280: intrarea maximă = min(nominalele vecine, joncțiunea).
  const nominala = vitezaNominala(b);
  const prev = p.nominalaAnterioara;
  b.intrareMax2 = nominala > prev ? prev * prev : nominala * nominala;
  if (b.intrareMax2 > jonctiuneMax2) b.intrareMax2 = jonctiuneMax2;
  p.nominalaAnterioara = nominala;
  p.versor = versor;
  p.pozitie = tintaPasi;
  p.inel[p.cap] = b;
  p.cap = p.capUrmator;
  p.capUrmator = urmator(p, p.cap);
  recalculeaza(p);
  return b;
}

/**
 * Timpul unui bloc, în minute, din profilul lui `st_prep_buffer` (`stepper.c:774-841`, „Normal Operation”), în
 * aproximarea continuă: accelerare cu `a`, croazieră la nominală, frânare cu `a`. Viteze în mm/min, `a` în mm/min².
 */
function minuteBloc(mm: number, intrare2: number, iesire2: number, nominala: number, a: number): number {
  const inv2a = 0.5 / a;
  const nominala2 = nominala * nominala;
  // stepper.c:793: intrarea peste nominală apare doar când un override scade în mers; aici override-urile sunt 100 %.
  if (intrare2 > nominala2 * (1 + 1e-12)) throw new Error('intern: intrarea blocului e peste viteza nominală');
  const v0 = Math.sqrt(intrare2);
  const v1 = Math.sqrt(iesire2);
  const intersectie = 0.5 * (mm + inv2a * (intrare2 - iesire2));
  if (intersectie > 0) {
    if (intersectie < mm) {
      const franare = inv2a * (nominala2 - iesire2);
      if (franare < intersectie) {
        // Trapez (sau croazieră + frânare, când intrarea e chiar nominala): stepper.c:818-826.
        const accelerare = inv2a * (nominala2 - intrare2);
        return (nominala - v0) / a + (mm - accelerare - franare) / nominala + (nominala - v1) / a;
      }
      // Triunghi: stepper.c:827-831.
      const varf = Math.sqrt(2 * a * intersectie + iesire2);
      return (varf - v0) / a + (varf - v1) / a;
    }
    // Doar frânare (stepper.c:832-836): planificatorul garantează intrare² ≤ ieșire² + 2·a·L, deci frânarea e întreagă.
    return (2 * mm) / (v0 + v1);
  }
  // Doar accelerare (stepper.c:837-841): ieșire² ≤ intrare² + 2·a·L, din trecerea înainte.
  return (2 * mm) / (v0 + v1);
}

// ---------------------------------------------------------------------------------------------------------------
// Parserul (`protocol.c` + `gcode.c`) și execuția.

const LITERE_VALORI: ReadonlySet<string> = new Set(['F', 'I', 'J', 'K', 'L', 'N', 'P', 'R', 'S', 'T', 'X', 'Y', 'Z']);
const POZITIVE: ReadonlySet<string> = new Set(['F', 'N', 'P', 'T', 'S']);

type Cuvant = { readonly litera: string; readonly valoare: number };

/** Validează setările: ce ar face ca formulele GRBL să împartă la zero sau să dea NaN. */
function verificaSetarile(s: SetariGrbl): void {
  const pozitive = (nume: string, v: readonly number[]): void => {
    if (v.length !== 3 || v.some((x) => !Number.isFinite(x) || x <= 0)) throw new Error(`setări GRBL nevalide: ${nume}`);
  };
  pozitive('pasiPeMm', s.pasiPeMm);
  pozitive('vitezaMaxima', s.vitezaMaxima);
  pozitive('acceleratie', s.acceleratie);
  if (!Number.isFinite(s.deviatieJonctiune) || s.deviatieJonctiune < 0) throw new Error('setări GRBL nevalide: deviatieJonctiune');
  if (!Number.isFinite(s.toleranteArc) || s.toleranteArc <= 0) throw new Error('setări GRBL nevalide: toleranteArc');
  if (!Number.isInteger(s.blocuriPlanificator) || s.blocuriPlanificator < 1) throw new Error('setări GRBL nevalide: blocuriPlanificator');
}

/** `nuts_bolts.c:35-108` (`read_float`): semn, cifre și cel mult un punct, fără exponent; doar primele 8 cifre contează. */
function citesteNumar(linie: string, start: number): { readonly valoare: number; readonly urmator: number } | null {
  let j = start;
  let negativ = false;
  if (linie[j] === '-') { negativ = true; j++; } else if (linie[j] === '+') j++;
  let intreg = 0;
  let exp = 0;
  let cifre = 0;
  let zecimal = false;
  for (;;) {
    const c = linie[j];
    if (c !== undefined && c >= '0' && c <= '9') {
      cifre++;
      if (cifre <= MAX_INT_DIGITS) {
        if (zecimal) exp--;
        intreg = intreg * 10 + (c.charCodeAt(0) - 48);
      } else if (!zecimal) exp++;
    } else if (c === '.' && !zecimal) zecimal = true;
    else break;
    j++;
  }
  if (cifre === 0) return null;
  // GRBL înmulțește în float cu 0.01 / 0.1 / 10; aici împărțirea la puterea lui 10 e rotunjită corect, în dublă.
  const v = intreg === 0 ? 0 : exp < 0 ? intreg / 10 ** -exp : intreg * 10 ** exp;
  return { valoare: negativ ? -v : v, urmator: j };
}

/**
 * Timpul, cu mecanismele stricate de `m` (doar pentru controalele negative). Cu `m = {}`, e `timpGrbl`.
 */
export function timpGrblMutat(gcode: string, s: SetariGrbl, m: MutatiiGrbl): TimpGrbl {
  verificaSetarile(s);
  const marime = s.blocuriPlanificator + 1;
  const p: Planificator = {
    pasiPeMm: s.pasiPeMm,
    acceleratie: [s.acceleratie[0] * 60 * 60, s.acceleratie[1] * 60 * 60, s.acceleratie[2] * 60 * 60],
    vitezaMaxima: s.vitezaMaxima,
    deviatie: s.deviatieJonctiune,
    inel: new Array<Bloc | undefined>(marime).fill(undefined),
    marime,
    coada: 0,
    cap: 0,
    capUrmator: 1 % marime,
    planificat: 0,
    pozitie: [0, 0, 0],
    versor: [0, 0, 0],
    nominalaAnterioara: 0,
  };
  let minute = 0;
  let secundePauze = 0;
  let taiere = 0;
  let rapide = 0;
  let blocuri = 0;

  /** Execută blocul din coadă, cu ieșirea planificată acum, apoi îl aruncă (`planner.c:215-223`). */
  const executaCoada = (): void => {
    const b = bloc(p, p.coada);
    const urm = urmator(p, p.coada);
    // planner.c:241-246: ieșirea = intrarea blocului următor, sau 0 dacă e ultimul.
    const iesire2 = urm === p.cap ? 0 : bloc(p, urm).intrare2;
    minute += minuteBloc(b.mm, b.intrare2, iesire2, vitezaNominala(b), b.acceleratie);
    if (p.coada === p.planificat) p.planificat = urm;
    p.inel[p.coada] = undefined;
    p.coada = urm;
  };
  /** `protocol.c:169-178` (`protocol_buffer_synchronize`): mișcarea se termină, bufferul se golește. */
  const sincronizeaza = (): void => {
    while (p.coada !== p.cap) executaCoada();
  };
  /** `motion_control.c:32-77` (`mc_line`): așteaptă loc (bufferul plin = coada se execută), apoi planifică. */
  const linie = (tinta: Vec3, avans: number, rapid: boolean): void => {
    while (p.coada === p.capUrmator) executaCoada();
    const b = planificaLinia(p, tinta, avans, rapid);
    if (!b) return;
    blocuri++;
    if (rapid) rapide += b.mm;
    else taiere += b.mm;
  };
  /** `motion_control.c:87-191` (`mc_arc`), în planul XY (G17), cu raza din I/J. */
  const arc = (start: Vec3, tinta: Vec3, ij: readonly [number, number], raza: number, orar: boolean, avans: number, nr: number): void => {
    const pozitie: Vec3 = [start[0], start[1], start[2]];
    const c0 = pozitie[0] + ij[0];
    const c1 = pozitie[1] + ij[1];
    let r0 = -ij[0];
    let r1 = -ij[1];
    const rt0 = tinta[0] - c0;
    const rt1 = tinta[1] - c1;
    let unghi = Math.atan2(r0 * rt1 - r1 * rt0, r0 * rt0 + r1 * rt1);
    if (orar) { if (unghi >= -ARC_ANGULAR_TRAVEL_EPSILON) unghi -= 2 * Math.PI; }
    else if (unghi <= ARC_ANGULAR_TRAVEL_EPSILON) unghi += 2 * Math.PI;
    const tol = s.toleranteArc;
    if (!(2 * raza - tol > 0)) throw new Error(`linia ${nr}: arc cu raza ${raza} mm sub jumătate din $12 (GRBL ar împărți la NaN)`);
    const segmente = Math.floor(Math.abs(0.5 * unghi * raza) / Math.sqrt(tol * (2 * raza - tol)));
    if (segmente > UINT16_MAX) throw new Error(`linia ${nr}: arcul are ${segmente} segmente, peste uint16_t`);
    if (segmente) {
      const theta = unghi / segmente;
      const liniar = (tinta[2] - pozitie[2]) / segmente;
      // motion_control.c:150-152: rotația aproximată de ordinul 3, corectată exact la fiecare N_ARC_CORRECTION pași.
      let cosT = 2.0 - theta * theta;
      const sinT = theta * 0.16666667 * (cosT + 4.0);
      cosT *= 0.5;
      let numar = 0;
      for (let i = 1; i < segmente; i++) {
        if (numar < N_ARC_CORRECTION) {
          const ri = r0 * sinT + r1 * cosT;
          r0 = r0 * cosT - r1 * sinT;
          r1 = ri;
          numar++;
        } else {
          const cosTi = Math.cos(i * theta);
          const sinTi = Math.sin(i * theta);
          r0 = -ij[0] * cosTi + ij[1] * sinTi;
          r1 = -ij[0] * sinTi - ij[1] * cosTi;
          numar = 0;
        }
        pozitie[0] = c0 + r0;
        pozitie[1] = c1 + r1;
        pozitie[2] += liniar;
        linie([pozitie[0], pozitie[1], pozitie[2]], avans, false);
      }
    }
    linie([tinta[0], tinta[1], tinta[2]], avans, false);
  };

  // Starea parserului (`gc_state`), cu implicitele lui `gc_init` (`gcode.c:42-49`: totul zero = G0 G17 G21 G90 G94
  // G54 M5 M9, F = 0 nedefinit, S = 0). Poziția: 0,0,0 (mașina pornește din zeroul programului).
  const st = {
    miscare: 0 as 0 | 1 | 2 | 3 | 80,
    inch: false,
    incremental: false,
    ax: 0 as 0 | 3 | 4,
    racire: 0,
    avans: 0,
    turatie: 0,
    pozitie: [0, 0, 0] as Vec3,
  };

  const linii = gcode.split(/\r\n|\n|\r/);
  for (let idx = 0; idx < linii.length; idx++) {
    const nr = idx + 1;
    const eroare = (mesaj: string): Error => new Error(`linia ${nr}: ${mesaj}`);

    // protocol.c:119-150: curățarea liniei.
    let curata = '';
    let inParanteza = false;
    let inPunctVirgula = false;
    let depasire = false;
    for (const c of linii[idx] ?? '') {
      if (inParanteza || inPunctVirgula || depasire) {
        if (c === ')' && inParanteza) inParanteza = false;
        continue;
      }
      if (c.charCodeAt(0) <= 32) continue;
      if (c === '/') continue; // ștergerea de bloc nu e suportată: caracterul e doar ignorat (protocol.c:122-124)
      if (c === '(') { inParanteza = true; continue; }
      if (c === ';') { inPunctVirgula = true; continue; }
      if (curata.length >= CARACTERE_PE_LINIE) { depasire = true; continue; }
      curata += c >= 'a' && c <= 'z' ? c.toUpperCase() : c;
    }
    if (depasire) throw eroare(`peste ${CARACTERE_PE_LINIE} de caractere utile (error:11)`);
    if (curata === '') continue;
    if (curata[0] === '$') throw eroare('comenzile `$` (sistem, jog) nu au timp estimabil');

    // gcode.c:117-335 (STEP 2): cuvintele.
    const cuvinte: Cuvant[] = [];
    for (let i = 0; i < curata.length;) {
      const litera = curata[i] ?? '';
      if (litera < 'A' || litera > 'Z') throw eroare(`se aștepta o literă, nu „${litera}” (error:1)`);
      const n = citesteNumar(curata, i + 1);
      if (!n) throw eroare(`număr lipsă sau greșit după ${litera} (error:2)`);
      cuvinte.push({ litera, valoare: n.valoare });
      i = n.urmator;
    }

    type ComandaAxe = 'niciuna' | 'miscare' | 'lungime';
    let comandaAxe: ComandaAxe = 'niciuna';
    let pauza = false;
    const grupuri = new Set<string>();
    const blocModal = { miscare: st.miscare, inch: st.inch, incremental: st.incremental, ax: st.ax, racire: st.racire, final: 0 };
    const val = new Map<string, number>();
    let cuvantAxRacire = false;
    const grup = (g: string): void => {
      if (grupuri.has(g)) throw eroare(`două comenzi din grupul modal ${g} (error:21)`);
      grupuri.add(g);
    };
    for (const { litera, valoare } of cuvinte) {
      if (litera === 'G' || litera === 'M') {
        if (valoare < 0 || valoare >= 256) throw eroare(`${litera}${valoare} nu există în GRBL 1.1h (error:20)`);
        const intreg = Math.trunc(valoare);
        let mantisa = Math.round(100 * (valoare - intreg));
        const cod = `${litera}${valoare}`;
        if (litera === 'G') {
          switch (intreg) {
            case 4: grup('G0'); pauza = true; break;
            case 0: case 1: case 2: case 3:
              if (comandaAxe !== 'niciuna') throw eroare(`${cod}: conflict de comenzi cu axe (error:24)`);
              comandaAxe = 'miscare';
              grup('G1');
              blocModal.miscare = intreg;
              break;
            case 80: grup('G1'); blocModal.miscare = 80; break;
            case 17: grup('G2'); break;
            case 18: case 19: throw eroare(`${cod}: doar planul XY (G17) e suportat`);
            case 90: case 91:
              if (mantisa === 0) { grup('G3'); blocModal.incremental = intreg === 91; }
              else if (intreg === 91 && mantisa === 10) { grup('G4'); mantisa = 0; } // G91.1: I/J sunt oricum relative
              else throw eroare(`${cod} nu e suportat de GRBL (error:20)`);
              break;
            case 93: throw eroare('G93 (avansul în timp invers) nu e suportat');
            case 94: grup('G5'); break;
            case 20: case 21: grup('G6'); blocModal.inch = intreg === 20; break;
            case 40: grup('G7'); break;
            case 49:
              grup('G8');
              if (comandaAxe !== 'niciuna') throw eroare(`${cod}: conflict de comenzi cu axe (error:24)`);
              comandaAxe = 'lungime';
              break;
            case 54: case 55: case 56: case 57: case 58: case 59: grup('G12'); break;
            case 61:
              // G61 (calea exactă) e singurul mod al GRBL; G61.1 e refuzat chiar aici (gcode.c:228-232).
              grup('G13');
              if (mantisa !== 0) throw eroare(`${cod} nu e suportat de GRBL (error:20)`);
              break;
            case 10: case 28: case 30: case 38: case 43: case 53: case 92:
              throw eroare(`${cod} (coordonate, origini, palpare, compensare) nu e suportat de oracol`);
            default: throw eroare(`${cod} nu există în GRBL 1.1h (error:20)`);
          }
          if (mantisa > 0) throw eroare(`${cod}: cod G neîntreg (error:23)`);
        } else {
          if (mantisa > 0) throw eroare(`${cod}: cod M neîntreg (error:23)`);
          switch (intreg) {
            case 0: case 1:
              // M1 e de fapt ignorat de GRBL 1.1h (gcode.c:251); oracolul refuză amândouă: oprirea omului n-are timp.
              throw eroare(`${cod}: pauza programului depinde de om, timpul nu se poate estima`);
            case 2: case 30: grup('M4'); blocModal.final = intreg; break;
            case 3: case 4: case 5: grup('M7'); blocModal.ax = intreg === 5 ? 0 : intreg; cuvantAxRacire = true; break;
            case 8: grup('M8'); blocModal.racire |= 1; cuvantAxRacire = true; break;
            case 9: grup('M8'); blocModal.racire = 0; cuvantAxRacire = true; break;
            case 7: throw eroare('M7 e oprit în GRBL 1.1h implicit (ENABLE_M7, config.h:169) (error:20)');
            default: throw eroare(`${cod} nu există în GRBL 1.1h (error:20)`);
          }
        }
        continue;
      }
      if (!LITERE_VALORI.has(litera)) throw eroare(`litera ${litera} nu e suportată de GRBL (error:20)`);
      if (val.has(litera)) throw eroare(`${litera} apare de două ori (error:25)`);
      if (POZITIVE.has(litera) && valoare < 0) throw eroare(`${litera} negativ (error:4)`);
      if (litera === 'T' && valoare > MAX_TOOL_NUMBER) throw eroare(`T peste ${MAX_TOOL_NUMBER} (error:38)`);
      if (litera === 'S') cuvantAxRacire = true;
      val.set(litera, valoare);
    }

    // gcode.c:365-836 (STEP 3): verificările și conversiile.
    const areAxe = val.has('X') || val.has('Y') || val.has('Z');
    if (areAxe && comandaAxe === 'niciuna') comandaAxe = 'miscare';
    const n = val.get('N');
    if (n !== undefined && Math.trunc(n) > MAX_LINE_NUMBER) throw eroare(`N peste ${MAX_LINE_NUMBER} (error:27)`);
    const scara = blocModal.inch ? MM_PER_INCH : 1;
    const fCuvant = val.get('F');
    const avans = fCuvant !== undefined ? fCuvant * scara : st.avans; // gcode.c:417-422 (G94)
    const turatie = val.get('S') ?? st.turatie;
    const p4 = val.get('P');
    if (pauza && p4 === undefined) throw eroare('G4 fără P (error:28)');
    if (comandaAxe === 'lungime' && areAxe) throw eroare('G49 cu axe: GRBL consumă axele fără mișcare; nu e suportat');
    const tinta: Vec3 = [st.pozitie[0], st.pozitie[1], st.pozitie[2]];
    (['X', 'Y', 'Z'] as const).forEach((a, i) => {
      const v = val.get(a);
      if (v === undefined) return;
      tinta[i] = v * scara + (blocModal.incremental ? (st.pozitie[i] ?? 0) : 0);
    });
    let ij: readonly [number, number] = [0, 0];
    let raza = 0;
    let folosesteIJK = false;
    if (blocModal.miscare === 80) {
      if (areAxe) throw eroare('axe cu G80 activ (error:31)');
    } else if (comandaAxe === 'miscare') {
      if (blocModal.miscare === 0) {
        if (!areAxe) comandaAxe = 'niciuna';
      } else {
        if (avans === 0) throw eroare(`G${blocModal.miscare} fără avans F (error:22)`);
        if (blocModal.miscare === 1) {
          if (!areAxe) comandaAxe = 'niciuna';
        } else {
          if (!areAxe) throw eroare('arc fără axe (error:26)');
          if (!val.has('X') && !val.has('Y')) throw eroare('arc fără X sau Y în planul XY (error:32)');
          if (val.has('R')) throw eroare('arcul cu R nu e suportat (doar I/J)');
          if (!val.has('I') && !val.has('J')) throw eroare('arc fără I sau J (error:35)');
          folosesteIJK = true;
          ij = [(val.get('I') ?? 0) * scara, (val.get('J') ?? 0) * scara];
          // gcode.c:793-806: raza de la start la centru, și eroarea 33 dacă ținta nu e pe același cerc.
          const razaTinta = Math.hypot(tinta[0] - st.pozitie[0] - ij[0], tinta[1] - st.pozitie[1] - ij[1]);
          raza = Math.hypot(ij[0], ij[1]);
          const delta = Math.abs(razaTinta - raza);
          if (delta > 0.005 && (delta > 0.5 || delta > 0.001 * raza)) throw eroare(`ținta arcului nu e pe cerc: Δr = ${delta} mm (error:33)`);
        }
      }
    }
    // gcode.c:833-836: cuvintele nefolosite refuză linia.
    const folosite = new Set(['N', 'F', 'S', 'T']);
    if (comandaAxe !== 'niciuna') for (const a of ['X', 'Y', 'Z']) folosite.add(a);
    if (pauza) folosite.add('P');
    if (folosesteIJK) for (const a of ['I', 'J', 'K']) folosite.add(a);
    for (const litera of val.keys()) if (!folosite.has(litera)) throw eroare(`cuvântul ${litera} nu e folosit (error:36)`);

    // gcode.c:899-1128 (STEP 4): execuția, în ordinea controlerului.
    st.avans = avans;
    // gcode.c:917-930: turația schimbată cu axul pornit golește bufferul (fără modul laser).
    if (m.sincronizareMereu && cuvantAxRacire) sincronizeaza();
    if (st.turatie !== turatie) {
      if (st.ax !== 0 && !m.faraSincronizare) sincronizeaza();
      st.turatie = turatie;
    }
    // gcode.c:942-948 (`spindle_sync`, spindle_control.c:277-282) și 952-957 (`coolant_sync`, coolant_control.c:121-126).
    if (st.ax !== blocModal.ax) {
      if (!m.faraSincronizare) sincronizeaza();
      st.ax = blocModal.ax;
    }
    if (st.racire !== blocModal.racire) {
      if (!m.faraSincronizare) sincronizeaza();
      st.racire = blocModal.racire;
    }
    // gcode.c:969, motion_control.c:195-200 (`mc_dwell`) și nuts_bolts.c:112-126 (`delay_sec`): golește bufferul, apoi
    // ceil(1000/DWELL_TIME_STEP · P) pași de 50 ms; `1000/DWELL_TIME_STEP` e împărțire întreagă (= 20).
    if (pauza) {
      sincronizeaza();
      const P = p4 ?? 0;
      const pasi = Math.ceil(Math.trunc(1000 / DWELL_TIME_STEP) * P);
      if (pasi > UINT16_MAX) throw eroare(`G4 P${P}: peste ${UINT16_MAX} pași de ${DWELL_TIME_STEP} ms (uint16_t)`);
      secundePauze += m.pauzaFaraRotunjire ? P : (pasi * DWELL_TIME_STEP) / 1000;
    }
    st.inch = blocModal.inch;
    st.incremental = blocModal.incremental;
    // gcode.c:1048-1077: mișcarea.
    st.miscare = blocModal.miscare;
    if (st.miscare !== 80 && comandaAxe === 'miscare') {
      if (st.miscare === 0) linie(tinta, 0, true);
      else if (st.miscare === 1) linie(tinta, avans, false);
      else arc(st.pozitie, tinta, ij, raza, st.miscare === 2, avans, nr);
      st.pozitie = tinta;
    }
    // gcode.c:1083-1128: M2/M30 golesc bufferul și readuc G1, G90, G94, G54, M5, M9 (unitățile, F și S rămân).
    if (blocModal.final) {
      sincronizeaza();
      st.miscare = 1;
      st.incremental = false;
      st.ax = 0;
      st.racire = 0;
    }
  }
  sincronizeaza();
  return { secunde: minute * 60 + secundePauze, secundePauze, taiere, rapide, blocuri };
}
