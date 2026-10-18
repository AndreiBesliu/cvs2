import type { ProfilMasina } from '../masina.ts';

const SURSA = 'gnea/grbl v1.1h.20190825';
const CITIT = '18.10.2026';

/**
 * GRBL 1.1h cu setările din fabrică (ADR 0046): ce estimează aplicația până când mașina își spune setările (`$$`, lipite
 * în dialogul exportului; din etapa 3, citite de sender). Fiecare câmp are sursa lui în codul firmware-ului.
 */
export const PROFIL_GRBL_11H: ProfilMasina = {
  nume: 'GRBL 1.1h',
  sursa: 'implicit',
  axe: {
    X: { pasiPeMm: 250, vitezaMaxima: 500, acceleratie: 10 },
    Y: { pasiPeMm: 250, vitezaMaxima: 500, acceleratie: 10 },
    Z: { pasiPeMm: 250, vitezaMaxima: 500, acceleratie: 10 },
  },
  deviatieJonctiune: 0.01,
  toleranteArc: 0.002,
  firmware: { blocuriPlanificator: 15, pasPauza: 0.05, vitezaMinimaJonctiune: 0, avansMinim: 1 },
};

/** De unde vine fiecare câmp, citit pe {@link CITIT}. */
export const SURSE_GRBL_11H: Readonly<Record<string, string>> = {
  axe: `${SURSA} grbl/defaults.h, DEFAULTS_GENERIC: STEPS_PER_MM 250.0, MAX_RATE 500.0 mm/min, ACCELERATION 10*60*60 mm/min² (10 mm/s²)`,
  deviatieJonctiune: `${SURSA} grbl/defaults.h: DEFAULT_JUNCTION_DEVIATION 0.01`,
  toleranteArc: `${SURSA} grbl/defaults.h: DEFAULT_ARC_TOLERANCE 0.002`,
  blocuriPlanificator: `${SURSA} grbl/planner.h: BLOCK_BUFFER_SIZE 16 (fără USE_LINE_NUMBERS); plan_check_full_buffer: inelul e plin cu 15`,
  pasPauza: `${SURSA} grbl/config.h: DWELL_TIME_STEP 50 ms; nuts_bolts.c delay_sec: ceil(1000/DWELL_TIME_STEP*seconds) pași`,
  vitezaMinimaJonctiune: `${SURSA} grbl/config.h: MINIMUM_JUNCTION_SPEED 0.0`,
  avansMinim: `${SURSA} grbl/config.h: MINIMUM_FEED_RATE 1.0`,
  citit: CITIT,
};
