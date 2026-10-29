/**
 * Amprenta unui șir: două variante FNV-1a pe 32 de biți, alăturate (16 cifre hexazecimale). O amprentă de egalitate, nu de
 * securitate: ieșirea unui program din foaie (`cam/iesire.ts`) și contururile unui bloc de text (`blocText.ts`).
 */
export function amprentaSir(text: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x5bd1e995) >>> 0;
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}
