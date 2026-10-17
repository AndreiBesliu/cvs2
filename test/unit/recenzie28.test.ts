/**
 * Recenzia adversarială a feliilor 2.8c (panoul editabil) și 2.8d (traseul pe WebGL2), ADR 0038: constatările care se
 * arată fără browser. Fiecare test pică pe codul de azi și trece când defectul e reparat. Sesiune independentă (2.8e).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bucatiDinSiruri, siruriInBuget } from '../../src/app/traseuDesen.ts';
import { uneste, type Cutie } from '../../src/geom/cutie.ts';
import type { Miscare } from '../../src/ir/ir.ts';
import { documentNou } from '../../src/model/document.ts';
import { cutieElement } from '../../src/model/forme.ts';
import { istoricNou, type Istoric } from '../../src/model/jurnal.ts';
import { elementeFoaie } from '../../src/model/lume.ts';
import { creeazaRegistru, ruleaza } from '../../src/ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, type ContextDocument } from '../../src/ui/actiuniDocument.ts';
import { citesteNumar, textNumar, valoareDerivata } from '../../src/ui/numar.ts';

const R = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);

/** Foaia de 300 × 200 × 18 (cea a aplicației noi) cu dreptunghiul implicit (e1: 100 × 60 din (20, 20)), ales. */
function cuDreptunghi(rotire = 0) {
  let h: Istoric = istoricNou(documentNou({ latime: 300, inaltime: 200, grosime: 18 }));
  let sel: readonly string[] = [];
  const st = { pozitie: {} as { x?: number; y?: number }, rotire };
  const ctx: ContextDocument = {
    istoric: () => h, scrie: (n) => { h = n; }, selectie: () => sel, selecteaza: (i) => { sel = i; },
    pozitieNoua: () => st.pozitie, rotireNoua: () => st.rotire,
  };
  assert.equal(ruleaza(R, 'document.adauga-dreptunghi', ctx).ok, true);
  sel = ['e1'];
  if (rotire !== 0) assert.equal(ruleaza(R, 'document.roteste', ctx).ok, true);
  const coltX = (): number => {
    let k: Cutie | null = null;
    for (const e of elementeFoaie(h.doc, 0)) if (e.instanta === 'e1') k = k ? uneste(k, cutieElement(e)) : cutieElement(e);
    assert.ok(k);
    return k.minX;
  };
  /** Ce face câmpul la Enter (CampNumeric.aplica): citește textul și aplică doar dacă diferă de valoarea arătată. */
  const enter = (text: string): void => {
    const x = citesteNumar(text, true);
    assert.ok(x !== null, text);
    if (x === valoareDerivata(coltX())) return;
    st.pozitie = { x };
    assert.equal(ruleaza(R, 'document.pozitioneaza', ctx).ok, true);
  };
  return { coltX, enter, pasi: () => h.trecut.length };
}

test('R1 panoul (ADR 0038 §4–§5): după Enter, câmpul colțului arată ce a scris omul (mărime derivată, rotunjită la 1e-9 mm)', () => {
  const rele: string[] = [];
  for (const rotire of [0, 30]) {
    for (const text of ['21,669', '7,304', '10,801', '23,483', '3,577', '32,758', '58,753', '29,472']) {
      const d = cuDreptunghi(rotire);
      d.enter(text);
      // Câmpul arată colțul rotunjit la 1e-9 mm (o mărime derivată; ADR 0038 §5, precizarea din 2.8e).
      const arata = textNumar(valoareDerivata(d.coltX()), true);
      if (arata !== text) rele.push(`${rotire}°: scris „${text}”, câmpul arată „${arata}”`);
    }
  }
  assert.deepEqual(rele, []);
});

test('R1b panoul (ADR 0038 §5): același text confirmat a doua oară nu e o comandă (nu adaugă un pas de anulare)', () => {
  const d = cuDreptunghi();
  d.enter('3,577');
  const n = d.pasi();
  const inainte = d.coltX();
  // Omul vede „3,576999999999998”, scrie din nou ce voia („3,577”) și apasă Enter.
  d.enter('3,577');
  assert.equal(d.pasi(), n, `un pas de anulare în plus pentru o deplasare de ${Math.abs(d.coltX() - inainte)} mm`);
});

test('R2 traseul (ADR 0038 §1): bugetul se judecă pe vârfurile urcate în GPU, nu pe segmentele IR; peste el, cipul o spune', () => {
  // 1 000 de tăieri de-a latul foii de 2 440 mm: 1 000 de segmente IR, dar fiecare se taie în pași de 32 mm (bucățile).
  const m: Miscare[] = [{ tip: 'rapida', la: { X: 0, Y: 0 } }];
  for (let i = 0; i < 1000; i++) m.push({ tip: 'taiere', avans: 1000, la: { X: i % 2 ? 0 : 2440, Y: i * 1.2 } });
  const buget = 50_000; // BUGET_TRASEU_MINIM, după câteva cadre lente
  const r = siruriInBuget(m, 0.001, buget);
  const varfuri = bucatiDinSiruri(r.siruri).reduce((s, b) => s + b.varfuri.length / 2, 0);
  assert.ok(varfuri <= buget || r.pesteBuget || r.rarit, `${varfuri} de vârfuri urcate la un buget de ${buget}, fără cip (segmente IR: ${r.segmente})`);
});
