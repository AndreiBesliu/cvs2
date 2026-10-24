/**
 * Alegerea cu clicul (acțiunea `selectie.la-punct`, `actiuniDocument.ts`): distanța la contur și regula de umplere vin la
 * cerere, cu modulul ăsta, cerut de aplicație la montare (loc în pachetul de pornire, 17.10). Un clic dat înainte de
 * sosirea lui golește selecția pe loc și se aplică la sosire (doar ultimul clic în așteptare). Calculul e în
 * `src/model/alegere.ts`, comun cu dreptunghiul de selecție din modulul editării (ADR 0059).
 */
export { instantaLa } from '../model/alegere.ts';
