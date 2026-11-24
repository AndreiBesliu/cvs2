/**
 * Alegerile ferestrei exportului ca cartonașe (ADR 0290, felia 28.8↑b-2): un grup de butoane radio cu `data-camp` pe grup.
 * `alege` bifează varianta, `aleasa` e varianta bifată (de citit cu `toHaveValue`).
 */
import type { Locator } from '@playwright/test';

export const alege = (loc: Locator, camp: string, v: string): Promise<void> => loc.locator(`[data-camp="${camp}"] input[value="${v}"]`).check();
export const aleasa = (loc: Locator, camp: string): Locator => loc.locator(`[data-camp="${camp}"] input:checked`);
