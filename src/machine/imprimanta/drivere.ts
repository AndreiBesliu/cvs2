/**
 * Lista driverelor de imprimantă (ADR 0192 §A.5): azi unul, `creality-k1`. O imprimantă ținută își poartă driverul (id-ul);
 * fereastra de conectare arată alegerea tipului odată cu al doilea driver. Celelalte, fiecare cu felia lui (ADR 0192 §E):
 * Moonraker, Marlin pe USB, OctoPrint, Elegoo SDCP, PrusaLink; Bambu Lab doar cu un pod local.
 */
import { CREALITY_K1 } from './creality.ts';
import type { DriverText } from './driver.ts';

export const DRIVERE = { 'creality-k1': CREALITY_K1 } as const satisfies Readonly<Record<string, DriverText>>;
export type IdDriver = keyof typeof DRIVERE;

/** Driverul unei imprimante ținute fără câmpul `driver` (lista de dinainte de 3.6o) și al unei adrese scrise de mână. */
export const DRIVER_IMPLICIT: IdDriver = 'creality-k1';

export const esteIdDriver = (x: unknown): x is IdDriver => typeof x === 'string' && Object.hasOwn(DRIVERE, x);

/** Driverul cu id-ul dat; null pentru unul necunoscut (o listă scrisă de o versiune mai nouă a aplicației). */
export const driverDupaId = (id: string): DriverText | null => (esteIdDriver(id) ? DRIVERE[id] : null);
