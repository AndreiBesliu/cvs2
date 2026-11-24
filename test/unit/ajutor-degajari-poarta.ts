/**
 * Oracolul degajărilor (ADR 0032), echivalența porții: pe programele scrise de mână ale oracolelor de dinainte (urechi,
 * rampă, intrări, intrări cu rampă, sens; corecte și martorii lor negativi) și pe placa 1, poarta de acum și cea de
 * dinainte de ADR 0032 (`inainteDe0032`) dau EXACT aceleași încălcări.
 *
 * Până pe 24.11.2026 era un singur test în `degajari.octeti.oracol.test.ts`, de 2–3 minute. Programele și judecata sunt
 * aceleași, mutate neschimbate; doar se împart pe părți (`ajutor-parti.ts`), câte un fișier pe parte
 * (`degajari.poarta.<n>.oracol.test.ts`). Pragurile probei întregi (câte programe, câte cu încălcări) se cer pe părți, cu
 * minimele din `MINIME_POARTA`, a căror sumă nu coboară sub ele; partea 1 păzește împărțirea.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { poarta, type ContextPoarta } from '../oracles/poarta.ts';
import { regiuneDinDocument } from '../oracles/regiune.ts';
import { CAZURI_URECHI, programCaz, type Martor } from '../oracles/urechi.cazuri.ts';
import { CAZURI_RAMPA, programCazRampa, type MartorRampa } from '../oracles/rampa.cazuri.ts';
import { CAZURI_INTRARI, programIntrari, type MartorIntrari } from '../oracles/intrari.cazuri.ts';
import { CAZURI_IR, martorIR, programIR, type MartorIR } from '../oracles/intrari-rampa.cazuri.ts';
import { docPlaca1, PLACA_1_INTOARSA, PLACA_1_NOUA, PLACA_1_VECHE, STOC_PLACA } from '../oracles/sens.cazuri.ts';
import type { Montaj, Stoc } from '../oracles/regiune.cazuri.ts';
import { mesaje } from './ajutor-degajari.ts';
import { cazurilePartii, cereImpartirea, cereMinimele } from './ajutor-parti.ts';

export type Program = { readonly nume: string; readonly text: string; readonly ctx: ContextPoarta };

export const ctxDin = (c: { readonly stoc: Stoc; readonly diametru: number; readonly pas: number; readonly doc: Parameters<typeof regiuneDinDocument>[0] }, m: Montaj): ContextPoarta => ({
  foaie: c.stoc, origine: m.origine, z0: m.z0, diametruScula: c.diametru, pas: c.pas, supracursa: 0, asteptareAx: 3, regiune: regiuneDinDocument(c.doc), avansPlonjare: 300,
});

/** Programele: fiecare caz pe hârtie, pe 2 montaje, fără martor și cu fiecare martor (cele care nu se aplică se sar). */
export function programele(): Program[] {
  const rez: Program[] = [];
  const incearca = (nume: string, f: () => string, ctx: ContextPoarta): void => {
    try { rez.push({ nume, text: f(), ctx }); } catch { /* martorul nu se aplică pe acest caz */ }
  };
  const mont = (stoc: Stoc): Montaj[] => [{ foaie: stoc, origine: 'stanga-jos', z0: 'sus' }, { foaie: stoc, origine: 'dreapta-sus', z0: 'jos' }];
  const MU: readonly (Martor | undefined)[] = [undefined, 'binar', 'varf-din-adancime', 'centre-k-s', 'strangere', 'coarda'];
  for (const c of CAZURI_URECHI) for (const m of mont(c.stoc)) for (const x of MU) incearca(`urechi ${c.nume} ${x ?? ''}`, () => programCaz(c, m, x ? { martor: x } : {}), ctxDin(c, m));
  const MR: readonly (MartorRampa | undefined)[] = [undefined, 'plonjare', 'nerotite', 'pana', 'fara-urechi', 'flanc'];
  for (const c of CAZURI_RAMPA) for (const m of mont(c.stoc)) for (const x of MR) incearca(`rampa ${c.nume} ${x ?? ''}`, () => programCazRampa(c, m, x ? { martor: x } : {}), ctxDin(c, m));
  const MI: readonly (MartorIntrari | undefined)[] = [
    undefined, 'parte-pastrata', 'varf0', 'omisa', 'iesire-opusa', 'pe-bucla', 'raza-gresita', 'necandidat', 'sfert-scurt', 'treceri-diferite', 'intrare-dreapta', 'fara-iesire', 'centru-opus',
  ];
  for (const c of CAZURI_INTRARI) for (const m of mont(c.stoc).slice(0, 1)) for (const x of MI) incearca(`intrări ${c.nume} ${x ?? ''}`, () => programIntrari(c, m, x ? { martor: x } : {}), ctxDin(c, m));
  const MIR: readonly MartorIR[] = ['plata', 'de-la-dk-1', 'treapta', 'iesire-urca', 'iesire-la-suprafata', 'aer-g0', 'elice-dreapta', 'elice-franta', 'avans-taiere', 'fara-urechi', 'fara-ultima-trecere'];
  for (const c of CAZURI_IR.filter((q) => !q.refuz)) {
    for (const m of mont(c.stoc).slice(0, 1)) {
      incearca(`intrări cu rampă ${c.nume}`, () => programIR(c, m), ctxDin(c, m));
      for (const x of MIR) incearca(`intrări cu rampă ${c.nume} ${x}`, () => martorIR(programIR(c, m), m, x), ctxDin(c, m));
    }
  }
  const placa = { stoc: STOC_PLACA, diametru: 6, pas: 4, doc: docPlaca1() };
  for (const [nume, p] of [['veche', PLACA_1_VECHE], ['întoarsă', PLACA_1_INTOARSA], ['nouă', PLACA_1_NOUA]] as const) {
    rez.push({ nume: `placa 1 ${nume} A`, text: p.A, ctx: ctxDin(placa, { foaie: STOC_PLACA, origine: 'stanga-jos', z0: 'sus' }) });
    rez.push({ nume: `placa 1 ${nume} B`, text: p.B, ctx: ctxDin(placa, { foaie: STOC_PLACA, origine: 'dreapta-sus', z0: 'sus' }) });
  }
  return rez;
}

/** În câte părți se împarte proba: tot atâtea fișiere. */
export const PARTI_POARTA = 4;

/** Pragurile probei întregi, de dinaintea împărțirii. */
export const PRAGURI_POARTA = { programe: 300, cuIncalcari: 100 } as const;

/**
 * Minimele fiecărei părți: partea ei din pragul întreg, pe măsura a ce a numărat pe 24.11.2026 (rotunjită în sus). Pe toate
 * programele, atunci: 461 programe, din care 303 cu încălcări (martorii).
 */
export const MINIME_POARTA: readonly Readonly<Record<keyof typeof PRAGURI_POARTA, number>>[] = [
  { programe: 76, cuIncalcari: 24 },
  { programe: 75, cuIncalcari: 29 },
  { programe: 75, cuIncalcari: 21 },
  { programe: 75, cuIncalcari: 28 },
];

/** Echivalența pe o parte a programelor: judecata probei întregi, neschimbată. */
export function echivalentaPartii(parte: number): { readonly rele: string[]; readonly programe: number; readonly cuIncalcari: number } {
  const rele: string[] = [];
  let programe = 0, cuIncalcari = 0;
  for (const p of cazurilePartii(programele(), parte, PARTI_POARTA)) {
    programe++;
    const nou = poarta(p.text, p.ctx), vechi = poarta(p.text, p.ctx, { inainteDe0032: true });
    if (vechi.length) cuIncalcari++;
    if (JSON.stringify(nou) !== JSON.stringify(vechi)) rele.push(`${p.nume}: ${mesaje(nou.slice(0, 2))} / dinainte: ${mesaje(vechi.slice(0, 2))}`);
  }
  return { rele, programe, cuIncalcari };
}

/** Înregistrează proba unei părți (apelată din fișierul ei). */
export function probaPortii(parte: number): void {
  if (parte === 1) {
    test('(o) echivalența porții, împărțirea: exact câte un fișier pe parte, programele acoperite toate, fiecare o dată, iar minimele pe părți nu coboară sub pragurile probei întregi', () => {
      cereImpartirea(import.meta.dirname, /^degajari\.poarta\..*\.test\.ts$/, (n) => `degajari.poarta.${n}.oracol.test.ts`, PARTI_POARTA,
        programele().map((p, k) => `${k}: ${p.nume}`));
      cereMinimele(PRAGURI_POARTA, MINIME_POARTA, PARTI_POARTA);
    });
  }
  test(`(o) poarta de acum și cea de dinainte de ADR 0032 dau EXACT aceleași încălcări pe programele scrise de mână ale oracolelor 2.4–2.5c (corecte și martorii lor negativi) și pe placa 1 (veche, întoarsă, nouă): pe programe fără degajări, nimic nu se schimbă, partea ${parte} din ${PARTI_POARTA}`, () => {
    const s = echivalentaPartii(parte);
    console.log(`echivalența fără colturi, partea ${parte} din ${PARTI_POARTA}: ${s.programe} programe scrise de mână, ${s.cuIncalcari} cu încălcări (martorii), verdicte identice`);
    assert.deepEqual(s.rele, []);
    const minime = MINIME_POARTA[parte - 1]!;
    assert.ok(s.programe >= minime.programe && s.cuIncalcari >= minime.cuIncalcari, `${s.programe} programe, ${s.cuIncalcari} cu încălcări; minimele părții: ${minime.programe}, ${minime.cuIncalcari}`);
  });
}
