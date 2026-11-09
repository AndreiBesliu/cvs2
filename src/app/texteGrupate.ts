/**
 * Textele grupate ale unei instanțe (ADR 0210 §4, felia 11.4↑c): într-un șablon cu ramă, unealta Text alege textul pe ale cărui
 * litere cade clicul (cutia lor în lume; ale plăcuței, dacă instanța e una). O piesă care e chiar un text (blocul pe rădăcină)
 * nu are texte grupate: ea se alege întreagă, ca până acum.
 */
import { cutieContur, CUTIE_GOALA, uneste, type Cutie } from '../geom/cutie.ts';
import { compune } from '../geom/matrice.ts';
import { blocText } from '../model/blocText.ts';
import type { Instanta, Matrice, Nod, Piesa } from '../model/document.ts';
import { conturElement } from '../model/forme.ts';
import { cuLitere, matriceInstanta } from '../model/lume.ts';

/** Un text grupat: grupul lui și cutia literelor lui în lume. */
export type TextGrupat = { readonly grup: string; readonly cutie: Cutie };

export function texteGrupate(
  p: Piesa, i: Pick<Instanta, 'x' | 'y' | 'rotire' | 'texte'>,
): readonly TextGrupat[] {
  const texte: Array<{ grup: string; cutie: Cutie }> = [];
  if (blocText(p.radacina)) return texte;
  // Grupurile textelor, din șablon: pe o plăcuță, literele ei nu mai au amprenta blocului, deci blocul nu se mai judecă acolo.
  const grupuri = new Set<string>();
  const cauta = (n: Nod): void => {
    if (n.tip !== 'grup') return;
    if (blocText(n)) grupuri.add(n.id);
    else for (const c of n.copii) cauta(c);
  };
  cauta(p.radacina);
  const viziteaza = (n: Nod, sus: Matrice, text: { grup: string; cutie: Cutie } | null): void => {
    const m = compune(sus, n.matrice);
    if (n.tip === 'element') {
      if (!text) return;
      text.cutie = uneste(text.cutie, cutieContur(conturElement({ forma: n.forma, matrice: m })));
      return;
    }
    let al = text;
    if (!al && grupuri.has(n.id)) {
      al = { grup: n.id, cutie: CUTIE_GOALA };
      texte.push(al);
    }
    for (const c of n.copii) viziteaza(c, m, al);
  };
  viziteaza(cuLitere(p.radacina, i.texte), matriceInstanta(i), null);
  return texte;
}

/** Textul grupat pe ale cărui litere cade punctul (cu toleranța clicului), sau null. */
export function textLovit(texte: readonly TextGrupat[], x: number, y: number, tol: number): TextGrupat | null {
  return texte.find((q) => x >= q.cutie.minX - tol && x <= q.cutie.maxX + tol && y >= q.cutie.minY - tol && y <= q.cutie.maxY + tol) ?? null;
}
