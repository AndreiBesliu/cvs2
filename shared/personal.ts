/**
 * Rolurile personalului (ADR 0040 §3), comune clientului și serverului. Sursa rolului e una singură: `staff/{uid}.rol`.
 * Regulile Firestore au aceeași scară, scrisă în limbajul lor (`firestore.rules`, `nivelRol`); testele pe emulator le
 * leagă. Un rol necunoscut nu dă nimic.
 */
export const ROLURI = ['support', 'admin', 'owner'] as const;
export type Rol = (typeof ROLURI)[number];

/** 0 = nimic; 1 = support; 2 = admin; 3 = owner. */
export function nivelRol(rol: unknown): 0 | 1 | 2 | 3 {
  return rol === 'owner' ? 3 : rol === 'admin' ? 2 : rol === 'support' ? 1 : 0;
}

export function esteRol(x: unknown): x is Rol {
  return typeof x === 'string' && (ROLURI as readonly string[]).includes(x);
}
