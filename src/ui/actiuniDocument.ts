import { distantaLaContur, inRegiune } from '../geom/distanta.ts';
import {
  noduriPiesa, numara, operatieImplicita, operatieInMargini, plafonDepasit, PLAFON, type Document, type FormaDoc, type Instanta,
  type Numaratoare, type Operatie, type Piesa,
} from '../model/document.ts';
import { conturElement } from '../model/forme.ts';
import { jsonCanonic } from '../model/incarcare.ts';
import { anuleaza, executa, reface, type Comanda, type Istoric } from '../model/jurnal.ts';
import { elementeFoaie } from '../model/lume.ts';
import type { Actiune } from './actiuni.ts';

/**
 * Acțiunile documentului, pe documentul v3 (ADR 0024, ADR 0025). Ce stă pe foaie sunt instanțe; cât timp nivelul doi e
 * ascuns, fiecare are piesa ei, iar selecția ține id-uri de instanțe. O formă nouă vine cu operația ei implicită.
 * Contextul e starea curentă și felul în care se scrie înapoi; acțiunile sunt pure față de restul interfeței.
 */
export type ContextDocument = {
  readonly istoric: () => Istoric;
  readonly scrie: (h: Istoric) => void;
  readonly selectie: () => readonly string[];
  readonly selecteaza: (ids: readonly string[]) => void;
  /** Fila asta doar citește (alta scrie proiectul): nicio acțiune nu schimbă documentul. */
  readonly doarCitire?: () => boolean;
  /** Deplasarea cerută pentru „mută”, în mm (gestul o pune aici înainte de rulare). */
  readonly deplasare?: () => { readonly dx: number; readonly dy: number };
  /** Punctul clicului, în mm, cu toleranța lui (câțiva pixeli, în mm la zoomul curent). */
  readonly punct?: () => { readonly x: number; readonly y: number; readonly toleranta: number };
  /** Instanțele alese din lista de vectori. */
  readonly alese?: () => readonly string[];
  /** Operațiile noi ale pieselor, după id-ul piesei, din dialogul de export (se scriu toate într-un singur pas). */
  readonly operatiiNoi?: () => ReadonlyMap<string, readonly Operatie[]>;
};

/** Foaia pe care se lucrează; Multi-Plate (mai multe foi pe ecran) vine în etapa 11. */
const FOAIA = 0;

/** Copia făcută cu Ctrl+D stă la 20 mm la dreapta și 20 mm mai jos (ADR 0024, ca în prototip). */
export const DECALAJ_COPIE = { dx: 20, dy: -20 } as const;

/**
 * Instanța de sub un punct al documentului: cea al cărei element, cel mai de sus, are conturul la cel mult `toleranta` mm
 * sau punctul înăuntru (regula evenodd). Sau null.
 */
export function instantaLa(doc: Document, x: number, y: number, toleranta: number): string | null {
  const lume = elementeFoaie(doc, FOAIA);
  for (let i = lume.length - 1; i >= 0; i--) {
    const e = lume[i];
    if (!e) continue;
    const c = conturElement(e);
    if (distantaLaContur({ x, y }, c) <= toleranta || inRegiune({ x, y }, [c])) return e.instanta;
  }
  return null;
}

/** Primul id liber de forma `e<n>`, liber și ca piesă, și ca instanță: o formă nouă are piesa și instanța cu același id. */
export function idNou(doc: Document, ocupate: ReadonlySet<string> = new Set()): string {
  const folosite = new Set<string>(ocupate);
  for (const p of doc.piese) folosite.add(p.id);
  for (const f of doc.foi) for (const i of f.instante) folosite.add(i.id);
  let n = doc.piese.length + 1;
  while (folosite.has(`e${n}`)) n++;
  return `e${n}`;
}

function foaieCurenta(doc: Document) {
  const f = doc.foi[FOAIA];
  if (!f) throw new Error('documentul n-are foaie');
  return f;
}

/** Un singur pas de anulare, oricâte lucruri atinge acțiunea. */
function pas(comenzi: readonly Comanda[]): Comanda | null {
  if (comenzi.length === 0) return null;
  return comenzi.length === 1 && comenzi[0] ? comenzi[0] : { tip: 'lot', comenzi };
}

/**
 * Freza operațiilor de pe foaie, dacă e una singură, altfel nimic. „Aceeași” înseamnă ce compară și exportul: numărul și
 * diametrul (numele nu schimbă ce face mașina). O formă nouă o primește: un program are o singură sculă, iar o formă
 * adăugată după ce omul a ales Ø3,175 n-are de ce să vină cu Ø6.
 */
function sculaFoii(doc: Document): Operatie['scula'] | undefined {
  const piese = new Map(doc.piese.map((p) => [p.id, p]));
  let scula: Operatie['scula'] | undefined;
  for (const i of foaieCurenta(doc).instante) {
    for (const o of piese.get(i.piesa)?.operatii ?? []) {
      if (!scula) scula = o.scula;
      else if (o.scula.numar !== scula.numar || o.scula.diametru !== scula.diametru) return undefined;
    }
  }
  return scula ? { numar: scula.numar, nume: scula.nume, diametru: scula.diametru } : undefined;
}

function adauga(ctx: ContextDocument, forma: FormaDoc, x: number, y: number): void {
  const h = ctx.istoric();
  const id = idNou(h.doc);
  const scula = sculaFoii(h.doc);
  const piesa: Piesa = {
    id, radacina: { tip: 'element', id, forma, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } },
    operatii: [scula ? operatieImplicita(id, forma, scula) : operatieImplicita(id, forma)],
  };
  const instanta: Instanta = { id, piesa: id, x, y, rotire: 0 };
  const foaie = foaieCurenta(h.doc);
  ctx.scrie(executa(h, {
    tip: 'adauga', foaie: foaie.id, instanta, pozitie: foaie.instante.length, piesa: { piesa, pozitie: h.doc.piese.length },
  }));
  ctx.selecteaza([id]);
}

/** Acțiunile care schimbă documentul sunt oprite într-o filă care doar citește. */
const scrie = (ctx: ContextDocument): true | 'motiv.doar-citire' => (ctx.doarCitire?.() ? 'motiv.doar-citire' : true);

/**
 * Dialogul schimbă doar valorile operațiilor existente: aceleași operații, în aceeași ordine, pe aceleași noduri. Așa
 * referințele, unicitatea și plafoanele rămân cum le-a lăsat ușa; valorile noi trebuie doar să fie în marginile schemei.
 */
function operatiiAcceptate(doc: Document, noi: ReadonlyMap<string, readonly Operatie[]>): boolean {
  const piese = new Map(doc.piese.map((p) => [p.id, p]));
  for (const [id, operatii] of noi) {
    const vechi = piese.get(id)?.operatii;
    if (!vechi || vechi.length !== operatii.length) return false;
    for (const [k, o] of operatii.entries()) {
      const v = vechi[k];
      if (!v || o.id !== v.id || o.tip !== v.tip || o.noduri.length !== v.noduri.length || o.noduri.some((n, j) => n !== v.noduri[j])) return false;
      if (!operatieInMargini(o)) return false;
    }
  }
  return true;
}

/**
 * Un document nou trebuie să treacă și el de ușă (ADR 0024, precizarea 5): o acțiune care ar trece de plafoane e inactivă,
 * altfel aplicația ar salva un proiect pe care, la redeschidere, nu l-ar mai putea încărca.
 */
function incape(doc: Document, plus: Numaratoare): boolean {
  const n = numara(doc);
  return plafonDepasit({
    noduri: n.noduri + plus.noduri, instante: n.instante + plus.instante, elementeLume: n.elementeLume + plus.elementeLume,
    operatii: n.operatii + plus.operatii, taieturi: n.taieturi + plus.taieturi,
  }) === null;
}

/** Cât adaugă o copie separată a fiecărei instanțe alese: piesa ei întreagă, cu operațiile ei, și o instanță. */
function cresteCopia(ctx: ContextDocument): Numaratoare {
  const doc = ctx.istoric().doc;
  const alese = new Set(ctx.selectie());
  const piese = new Map(doc.piese.map((p) => [p.id, p]));
  const plus = { noduri: 0, instante: 0, elementeLume: 0, operatii: 0, taieturi: 0 };
  for (const i of foaieCurenta(doc).instante) {
    const p = alese.has(i.id) ? piese.get(i.piesa) : undefined;
    if (!p) continue;
    const noduri = noduriPiesa(p.radacina);
    plus.noduri += noduri.length;
    plus.instante += 1;
    plus.elementeLume += noduri.filter((x) => x.nod.tip === 'element').length;
    plus.operatii += p.operatii.length;
    plus.taieturi += p.operatii.reduce((s, o) => s + o.noduri.length, 0);
  }
  return plus;
}

const poateAdauga = (ctx: ContextDocument): true | 'motiv.doar-citire' | 'motiv.plafon' => {
  const s = scrie(ctx);
  if (s !== true) return s;
  return incape(ctx.istoric().doc, { noduri: 1, instante: 1, elementeLume: 1, operatii: 1, taieturi: 1 }) ? true : 'motiv.plafon';
};

/** Selecția păstrează doar instanțele care există încă (după o anulare, o refacere sau o ștergere). */
function curataSelectia(ctx: ContextDocument): void {
  const existente = new Set(foaieCurenta(ctx.istoric().doc).instante.map((i) => i.id));
  const sel = ctx.selectie();
  if (sel.some((id) => !existente.has(id))) ctx.selecteaza(sel.filter((id) => existente.has(id)));
}

export const ACTIUNI_DOCUMENT: readonly Actiune<ContextDocument>[] = [
  {
    id: 'selectie.la-punct',
    eticheta: 'actiune.selecteaza',
    capabilitate: 'desen',
    activa: (ctx) => (ctx.punct ? true : 'motiv.niciun-punct'),
    ruleaza: (ctx) => {
      const p = ctx.punct?.();
      if (!p) return;
      const id = instantaLa(ctx.istoric().doc, p.x, p.y, p.toleranta);
      ctx.selecteaza(id ? [id] : []);
    },
  },
  {
    id: 'selectie.din-lista',
    eticheta: 'actiune.selecteaza',
    capabilitate: 'desen',
    activa: (ctx) => (ctx.alese ? true : 'motiv.nimic-ales'),
    ruleaza: (ctx) => {
      const existente = new Set(foaieCurenta(ctx.istoric().doc).instante.map((i) => i.id));
      ctx.selecteaza((ctx.alese?.() ?? []).filter((id) => existente.has(id)));
    },
  },
  {
    id: 'document.adauga-dreptunghi',
    eticheta: 'actiune.adauga-dreptunghi',
    capabilitate: 'desen',
    activa: poateAdauga,
    ruleaza: (ctx) => {
      adauga(ctx, { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 }, 20, 20);
    },
  },
  {
    id: 'document.adauga-cerc',
    eticheta: 'actiune.adauga-cerc',
    capabilitate: 'desen',
    activa: poateAdauga,
    ruleaza: (ctx) => {
      adauga(ctx, { tip: 'cerc', raza: 15 }, 70, 50);
    },
  },
  {
    id: 'document.muta-selectia',
    eticheta: 'actiune.muta-selectia',
    capabilitate: 'desen',
    activa: (ctx) => (ctx.selectie().length === 0 ? 'motiv.nicio-selectie' : !ctx.deplasare ? 'motiv.nicio-deplasare' : scrie(ctx)),
    ruleaza: (ctx) => {
      const d = ctx.deplasare?.() ?? { dx: 0, dy: 0 };
      if (!Number.isFinite(d.dx) || !Number.isFinite(d.dy) || (d.dx === 0 && d.dy === 0)) return;
      const h = ctx.istoric();
      const foaie = foaieCurenta(h.doc);
      const alese = new Set(ctx.selectie());
      const comenzi: Comanda[] = foaie.instante
        .filter((i) => alese.has(i.id))
        .map((vechi) => ({ tip: 'inlocuieste-instanta', foaie: foaie.id, vechi, nou: { ...vechi, x: vechi.x + d.dx, y: vechi.y + d.dy } }));
      const c = pas(comenzi);
      if (c) ctx.scrie(executa(h, c));
    },
  },
  {
    // Ctrl+D (ADR 0024, alegerea 2): o copie SEPARATĂ, adică o piesă nouă cu același arbore, plus instanța ei, imediat
    // după original și decalată. Copiile legate le face doar «Încă…» (etapa 11).
    id: 'document.duplica-selectia',
    eticheta: 'actiune.duplica-selectia',
    capabilitate: 'desen',
    activa: (ctx) => {
      if (ctx.selectie().length === 0) return 'motiv.nicio-selectie';
      const s = scrie(ctx);
      if (s !== true) return s;
      return incape(ctx.istoric().doc, cresteCopia(ctx)) ? true : 'motiv.plafon';
    },
    ruleaza: (ctx) => {
      let h = ctx.istoric();
      const alese = new Set(ctx.selectie());
      const noi: string[] = [];
      const comenzi: Comanda[] = [];
      // Fiecare copie se aplică pe loc (într-un singur lot): pozițiile următoarelor țin cont de ea.
      let doc = h.doc;
      for (const original of foaieCurenta(h.doc).instante.filter((i) => alese.has(i.id))) {
        const piesaVeche = doc.piese.find((p) => p.id === original.piesa);
        if (!piesaVeche) continue;
        const id = idNou(doc);
        const piesa: Piesa = { ...structuredClone(piesaVeche), id };
        const foaie = foaieCurenta(doc);
        const c: Comanda = {
          tip: 'adauga',
          foaie: foaie.id,
          instanta: { ...structuredClone(original), id, piesa: id, x: original.x + DECALAJ_COPIE.dx, y: original.y + DECALAJ_COPIE.dy },
          pozitie: foaie.instante.findIndex((i) => i.id === original.id) + 1,
          piesa: { piesa, pozitie: doc.piese.findIndex((p) => p.id === piesaVeche.id) + 1 },
        };
        doc = executa(istoricDin(doc), c).doc;
        comenzi.push(c);
        noi.push(id);
      }
      const c = pas(comenzi);
      if (!c) return;
      h = executa(h, c);
      ctx.scrie(h);
      ctx.selecteaza(noi);
    },
  },
  {
    id: 'document.sterge-selectia',
    eticheta: 'actiune.sterge-selectia',
    capabilitate: 'desen',
    activa: (ctx) => (ctx.selectie().length === 0 ? 'motiv.nicio-selectie' : scrie(ctx)),
    ruleaza: (ctx) => {
      const h = ctx.istoric();
      const alese = new Set(ctx.selectie());
      const comenzi: Comanda[] = [];
      // Fiecare ștergere se calculează pe documentul de după cele dinainte, ca pozițiile și „ultima instanță” să fie
      // cele reale; anularea lotului le pune la loc în ordine inversă.
      let doc = h.doc;
      for (const instanta of foaieCurenta(h.doc).instante.filter((i) => alese.has(i.id))) {
        const foaie = foaieCurenta(doc);
        const pozitie = foaie.instante.findIndex((i) => i.id === instanta.id);
        const altele = doc.foi.some((f) => f.instante.some((i) => i.piesa === instanta.piesa && i.id !== instanta.id));
        const pozPiesa = doc.piese.findIndex((p) => p.id === instanta.piesa);
        const piesa = doc.piese[pozPiesa];
        const c: Comanda = {
          tip: 'sterge',
          foaie: foaie.id,
          instanta,
          pozitie,
          ...(altele || !piesa ? {} : { piesa: { piesa, pozitie: pozPiesa } }),
        };
        doc = executa(istoricDin(doc), c).doc;
        comenzi.push(c);
      }
      const c = pas(comenzi);
      if (c) ctx.scrie(executa(h, c));
      ctx.selecteaza([]);
    },
  },
  {
    // Dialogul de export scrie operațiile pieselor (ADR 0025) la Exportă: o singură comandă, deci un singur Ctrl+Z.
    // Doar piesele ale căror operații s-au schimbat; numărul operațiilor nu se schimbă, deci plafoanele rămân.
    id: 'document.aplica-operatii',
    eticheta: 'actiune.aplica-operatii',
    capabilitate: 'desen',
    activa: (ctx) => {
      if (!ctx.operatiiNoi) return 'motiv.nimic-ales';
      const s = scrie(ctx);
      if (s !== true) return s;
      return operatiiAcceptate(ctx.istoric().doc, ctx.operatiiNoi()) ? true : 'motiv.operatie-invalida';
    },
    ruleaza: (ctx) => {
      const noi = ctx.operatiiNoi?.();
      if (!noi || !operatiiAcceptate(ctx.istoric().doc, noi)) return;
      const h = ctx.istoric();
      const comenzi: Comanda[] = [];
      for (const vechi of h.doc.piese) {
        const operatii = noi.get(vechi.id);
        // Canonic, nu după ordinea cheilor: un document redeschis are cheile sortate (`jsonCanonic` la salvare).
        if (!operatii || jsonCanonic(operatii) === jsonCanonic(vechi.operatii)) continue;
        comenzi.push({ tip: 'inlocuieste-piesa', vechi, nou: { ...vechi, operatii: operatii.map((o) => structuredClone(o)) } });
      }
      const c = pas(comenzi);
      if (c) ctx.scrie(executa(h, c));
    },
  },
  {
    id: 'istoric.anuleaza',
    eticheta: 'actiune.anuleaza',
    capabilitate: 'desen',
    activa: (ctx) => (ctx.istoric().trecut.length === 0 ? 'motiv.nimic-de-anulat' : scrie(ctx)),
    ruleaza: (ctx) => { ctx.scrie(anuleaza(ctx.istoric())); curataSelectia(ctx); },
  },
  {
    id: 'istoric.reface',
    eticheta: 'actiune.reface',
    capabilitate: 'desen',
    activa: (ctx) => (ctx.istoric().viitor.length === 0 ? 'motiv.nimic-de-refacut' : scrie(ctx)),
    ruleaza: (ctx) => { ctx.scrie(reface(ctx.istoric())); curataSelectia(ctx); },
  },
];

function istoricDin(doc: Document): Istoric {
  return { doc, trecut: [], viitor: [] };
}
