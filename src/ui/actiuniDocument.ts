import type { CheieSimpla } from '../i18n/t.ts';
import {
  instantaPreaDeparte, noduriPiesa, numara, operatieImplicita, plafonDepasit, type Document, type FormaDoc,
  type Ghidaj, type Instanta, type Nod, type Numaratoare, type Operatie, type Piesa,
} from '../model/document.ts';
// Doar tipul: piesa importului o face modulul previzualizării, adus la cerere (`ImportPregatit.piesa`, felia 2.3c-3).
import type { ImportPregatit } from '../io/piesa.ts';
import type { Retea } from '../model/retea.ts';
import type { Transformare } from '../model/transformare.ts';
import { anuleaza, executa, reface, type Comanda, type Istoric } from '../model/jurnal.ts';
import type { Actiune } from './actiuni.ts';

/**
 * Acțiunile documentului, pe documentul v3 (ADR 0024, ADR 0025). Ce stă pe foaie sunt instanțe; cât timp nivelul doi e
 * ascuns, fiecare are piesa ei, iar selecția ține id-uri de instanțe. O formă nouă vine cu operația ei implicită.
 * Contextul e starea curentă și felul în care se scrie înapoi; acțiunile sunt pure față de restul interfeței.
 */
/**
 * O formă nouă (ADR 0051): forma exactă și locul instanței ei, în mm ai foii; cu `gauri` (booleanul, ADR 0067), o piesă cu
 * conturul și găurile lui (un grup, ca la import), în aceleași coordonate.
 */
export type FormaNoua = { readonly forma: FormaDoc; readonly x: number; readonly y: number; readonly gauri?: readonly FormaDoc[] };

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
  /**
   * Aceeași acțiune, rulată din nou prin ușa aplicației (garda „dialog deschis”): clicul dat înaintea modulului alegerii
   * se aplică pe aici la sosirea lui (`alegereLaCerere`). Fără ea, se aplică direct.
   */
  readonly dinNou?: () => void;
  /** Jurnalul de erori al aplicației: modulul alegerii care nu vine. */
  readonly jurnal?: (e: unknown) => void;
  /** Instanțele alese din lista de vectori. */
  readonly alese?: () => readonly string[];
  /** Operațiile noi ale pieselor, după id-ul piesei, din dialogul de export (se scriu toate într-un singur pas). */
  readonly operatiiNoi?: () => ReadonlyMap<string, readonly Operatie[]>;
  /** Importul pregătit de previzualizare (ADR 0035), de adăugat ca o piesă nouă. */
  readonly importNou?: () => ImportPregatit;
  /** Punctul în care s-a lăsat fișierul pe planșă (mm ai foii), sau null: centrul desenului cade acolo (felia 2.8b). */
  readonly locImport?: () => { readonly x: number; readonly y: number } | null;
  /** Panoul (ADR 0038 §4): colțul stânga-jos nou al cutiei selecției, în mm ai foii; doar axele scrise. */
  readonly pozitieNoua?: () => { readonly x?: number; readonly y?: number };
  /** Panoul: rotirea nouă a singurei instanțe selectate, în grade (se normalizează în [0, 360)). */
  readonly rotireNoua?: () => number;
  /** Rotirea sau scalarea selecției, din mânerele ei (ADR 0052). */
  readonly transformare?: () => Transformare;
  /** Panoul (ADR 0053): forma nouă a singurei instanțe alese, editată după plasare (laturile, raza, razele, laturile poligonului). */
  readonly formaEditata?: () => FormaDoc;
  /** Unealta Noduri (ADR 0068): elementul piesei (id-ul nodului) căruia i se înlocuiește forma; lipsă = rădăcina-element. */
  readonly nodEditat?: () => string;
  /**
   * Forma desenată cu o unealtă (ADR 0051): forma exactă și locul instanței ei, în mm ai foii; sau mai multe deodată (offsetul,
   * ADR 0064), adăugate într-un singur pas de anulare.
   */
  readonly formaNoua?: () => FormaNoua | readonly FormaNoua[];
  /** Ghidajele noi ale foii (ADR 0050): lista întreagă, după un ghidaj adăugat, mutat sau șters. */
  readonly ghidajeNoi?: () => readonly Ghidaj[];
  /** Deplasările instanțelor, fiecare cu a ei, în mm (alinierea, distribuirea, săgețile; ADR 0050). */
  readonly deplasari?: () => readonly { readonly id: string; readonly dx: number; readonly dy: number }[];
  /** Panoul, fără selecție: materialul nou al foii, în mm; doar mărimile scrise. */
  readonly stocNou?: () => { readonly latime?: number; readonly inaltime?: number; readonly grosime?: number };
  /** Copierea în rețea a selecției (ADR 0061): rânduri × coloane sau pe cerc, din extensia barei. */
  readonly retea?: () => Retea;
  /** Instanțele șterse în același pas cu formele noi din `formaNoua` (booleanul le înlocuiește, ADR 0067). */
  readonly sterge?: () => readonly string[];
};

/**
 * Comenzile care șterg instanțele `ids` ale foii curente, fiecare calculată pe documentul de după cele dinainte (pozițiile și
 * „ultima instanță” a piesei sunt cele reale; o piesă folosită și de alte instanțe rămâne); anularea lotului le pune la loc
 * în ordine inversă.
 */
export function comenziStergere(start: Document, ids: ReadonlySet<string>): { readonly comenzi: Comanda[]; readonly doc: Document } {
  const comenzi: Comanda[] = [];
  let doc = start;
  for (const instanta of foaieCurenta(start).instante.filter((i) => ids.has(i.id))) {
    const foaie = foaieCurenta(doc);
    const pozitie = foaie.instante.findIndex((i) => i.id === instanta.id);
    const altele = doc.foi.some((f) => f.instante.some((i) => i.piesa === instanta.piesa && i.id !== instanta.id));
    const pozPiesa = doc.piese.findIndex((p) => p.id === instanta.piesa);
    const piesa = doc.piese[pozPiesa];
    const c: Comanda = { tip: 'sterge', foaie: foaie.id, instanta, pozitie, ...(altele || !piesa ? {} : { piesa: { piesa, pozitie: pozPiesa } }) };
    doc = executa(istoricDin(doc), c).doc;
    comenzi.push(c);
  }
  return { comenzi, doc };
}

/** Foaia pe care se lucrează; Multi-Plate (mai multe foi pe ecran) vine în etapa 11. */
export const FOAIA = 0;

/** Copia făcută cu Ctrl+D stă la 20 mm la dreapta și 20 mm mai jos (ADR 0024, ca în prototip). */
export const DECALAJ_COPIE = { dx: 20, dy: -20 } as const;

/** Modulul alegerii cu clicul (`actiuniAlegere.ts`): distanța la contur și regula de umplere, aduse la cerere. */
export type Alegere = typeof import('./actiuniAlegere.ts');

/**
 * Clicul pe pânză, cu modulul alegerii adus la cerere (`aduce`). Cu modulul sosit, alege pe loc. Înainte de el, golește
 * selecția pe loc și se aplică la sosire, doar dacă între timp n-a venit alt clic (se aplică doar ultimul), documentul și
 * selecția sunt aceleași, iar ușa aplicației lasă (`dinNou`: garda „dialog deschis”). O tragere începută între timp mută
 * forma din clipa în care apare selecția, cu deplasarea măsurată de la apăsare (pânza reverifică selecția la fiecare
 * mișcare). Un modul care nu vine: clicul nu alege, intrarea în jurnal, iar clicul următor îl cere din nou (Edge ține
 * eșecul unui `import()` până la reîncărcare, deci acolo clicul spune din nou că n-a putut; e2e `la-cerere.spec.ts`).
 */
export function alegereLaCerere(aduce: () => Promise<Alegere>): { readonly incarca: () => Promise<Alegere>; readonly ruleaza: (ctx: ContextDocument) => void } {
  let modul: Alegere | null = null;
  let cerere: Promise<Alegere> | null = null;
  let clicuri = 0;
  const incarca = (): Promise<Alegere> => {
    cerere ??= aduce().then((m) => {
      modul = m;
      return m;
    }, (e: unknown) => {
      cerere = null;
      throw e;
    });
    return cerere;
  };
  const ruleaza = (ctx: ContextDocument): void => {
    const p = ctx.punct?.();
    if (!p) return;
    const nr = ++clicuri;
    const doc = ctx.istoric().doc;
    // Un clic pe o formă dintr-o selecție multiplă (ADR 0059) o păstrează: tragerea care urmează le mută pe toate.
    const alege = (id: string | null): void => {
      const s = ctx.selectie();
      ctx.selecteaza(id ? (s.length > 1 && s.includes(id) ? s : [id]) : []);
    };
    if (modul) {
      alege(modul.instantaLa(doc, p.x, p.y, p.toleranta));
      return;
    }
    ctx.selecteaza([]);
    const goala = ctx.selectie();
    incarca().then((m) => {
      if (nr !== clicuri || ctx.istoric().doc !== doc || ctx.selectie() !== goala) return;
      if (ctx.dinNou) {
        ctx.dinNou();
        return;
      }
      alege(m.instantaLa(doc, p.x, p.y, p.toleranta));
    }, (e: unknown) => { ctx.jurnal?.(e); });
  };
  return { incarca, ruleaza };
}

const ALEGERE = alegereLaCerere(() => import('./actiuniAlegere.ts'));

/** Modulul alegerii, cerut de aplicație la montare: primul clic nu așteaptă rețeaua (doar unul dat în primele clipe). */
export const incarcaAlegerea = ALEGERE.incarca;

/** Primul id liber de forma `e<n>`, liber și ca piesă, și ca instanță: o formă nouă are piesa și instanța cu același id. */
export function idNou(doc: Document, ocupate: ReadonlySet<string> = new Set()): string {
  const folosite = new Set<string>(ocupate);
  for (const p of doc.piese) folosite.add(p.id);
  for (const f of doc.foi) for (const i of f.instante) folosite.add(i.id);
  let n = doc.piese.length + 1;
  while (folosite.has(`e${n}`)) n++;
  return `e${n}`;
}

export function foaieCurenta(doc: Document) {
  const f = doc.foi[FOAIA];
  if (!f) throw new Error('documentul n-are foaie');
  return f;
}

/** Un singur pas de anulare, oricâte lucruri atinge acțiunea. */
export function pas(comenzi: readonly Comanda[]): Comanda | null {
  if (comenzi.length === 0) return null;
  return comenzi.length === 1 && comenzi[0] ? comenzi[0] : { tip: 'lot', comenzi };
}

/**
 * Freza operațiilor de pe foaie, dacă e una singură, altfel nimic. „Aceeași” înseamnă ce compară și exportul: numărul și
 * diametrul (numele nu schimbă ce face mașina). O formă nouă o primește: un program are o singură sculă, iar o formă
 * adăugată după ce omul a ales Ø3,175 n-are de ce să vină cu Ø6.
 */
export function sculaFoii(doc: Document): Operatie['scula'] | undefined {
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
export const scrie = (ctx: ContextDocument): true | 'motiv.doar-citire' => (ctx.doarCitire?.() ? 'motiv.doar-citire' : true);

/**
 * Un document nou trebuie să treacă și el de ușă (ADR 0024, precizarea 5): o acțiune care ar trece de plafoane e inactivă,
 * altfel aplicația ar salva un proiect pe care, la redeschidere, nu l-ar mai putea încărca.
 */
export function incape(doc: Document, plus: Numaratoare): boolean {
  const n = numara(doc);
  return plafonDepasit({
    noduri: n.noduri + plus.noduri, instante: n.instante + plus.instante, elementeLume: n.elementeLume + plus.elementeLume,
    operatii: n.operatii + plus.operatii, taieturi: n.taieturi + plus.taieturi,
    varfuri: n.varfuri + plus.varfuri, varfuriLume: n.varfuriLume + plus.varfuriLume,
  }) === null;
}

/** Cât adaugă o copie separată a fiecărei instanțe alese: piesa ei întreagă, cu operațiile ei, și o instanță. */
export function cresteCopia(doc: Document, selectie: readonly string[]): Numaratoare {
  const alese = new Set(selectie);
  const piese = new Map(doc.piese.map((p) => [p.id, p]));
  const plus = { noduri: 0, instante: 0, elementeLume: 0, operatii: 0, taieturi: 0, varfuri: 0, varfuriLume: 0 };
  for (const i of foaieCurenta(doc).instante) {
    const p = alese.has(i.id) ? piese.get(i.piesa) : undefined;
    if (!p) continue;
    const noduri = noduriPiesa(p.radacina);
    plus.noduri += noduri.length;
    plus.instante += 1;
    plus.elementeLume += noduri.filter((x) => x.nod.tip === 'element').length;
    plus.operatii += p.operatii.length;
    plus.taieturi += p.operatii.reduce((s, o) => s + o.noduri.length, 0);
    // Vârfurile căilor (ADR 0034): copia are piesa ei, deci le adaugă și în piese, și în lume.
    const varfuri = noduri.reduce((s, x) => s + (x.nod.tip === 'element' && x.nod.forma.tip === 'cale' ? x.nod.forma.varfuri.length : 0), 0);
    plus.varfuri += varfuri;
    plus.varfuriLume += varfuri;
  }
  return plus;
}

const poateAdauga = (ctx: ContextDocument): true | 'motiv.doar-citire' | 'motiv.plafon' => {
  const s = scrie(ctx);
  if (s !== true) return s;
  return incape(ctx.istoric().doc, { noduri: 1, instante: 1, elementeLume: 1, operatii: 1, taieturi: 1, varfuri: 0, varfuriLume: 0 }) ? true : 'motiv.plafon';
};

/** O instanță aleasă, decalată cu (dx, dy), ar sta prea departe de origine: ușa n-ar mai redeschide proiectul. */
export function alesePreaDeparte(ctx: ContextDocument, dx: number, dy: number): boolean {
  const alese = new Set(ctx.selectie());
  return foaieCurenta(ctx.istoric().doc).instante.some((i) => alese.has(i.id) && instantaPreaDeparte(i.x + dx, i.y + dy));
}

/**
 * Copia arborelui unei piese pentru Ctrl+D: noduri noi, dar formele împărțite. Documentul nu se schimbă pe loc, deci o
 * formă poate sta în două piese; o cale de 50 000 de vârfuri nu se mai copiază în istoric la fiecare Ctrl+D (recenzia 2.7b).
 */
export function copieArbore(n: Nod): Nod {
  if (n.tip === 'element') {
    const { forma, ...rest } = n;
    return { ...structuredClone(rest), forma } as Nod;
  }
  const { copii, ...rest } = n;
  return { ...structuredClone(rest), copii: copii.map(copieArbore) } as Nod;
}

/** Selecția păstrează doar instanțele care există încă (după o anulare, o refacere sau o ștergere). */
function curataSelectia(ctx: ContextDocument): void {
  const existente = new Set(foaieCurenta(ctx.istoric().doc).instante.map((i) => i.id));
  const sel = ctx.selectie();
  if (sel.some((id) => !existente.has(id))) ctx.selecteaza(sel.filter((id) => existente.has(id)));
}

/**
 * Calculul acțiunilor pornite doar de ferestre și de panou (importul, operațiile din dialogul de export, poziția, rotirea,
 * foaia): vine la cerere, cu modulul `actiuniDocumentCalcul.ts`, pe care îl importă ferestrele care dau aceste acțiuni
 * (`ExportConectat`, `ImportConectat`, `PanouProprietati`) și care se înregistrează aici la evaluare, ca mesajele unui
 * modul la cerere (`adaugaMesaje`). Registrul păstrează id-ul, eticheta și gărzile ieftine, deci bara, paleta și
 * scurtăturile văd aceleași motive fără calcul: fără datele ferestrei (`importNou`, `operatiiNoi`, `pozitieNoua`,
 * `rotireNoua`, `stocNou`), garda refuză înaintea calculului, exact cu motivul de până acum.
 */
export type CalculDocument = Readonly<Record<string, Pick<Actiune<ContextDocument>, 'activa' | 'ruleaza'>>>;
let calcul: CalculDocument | null = null;

/** Înregistrarea calculului (o dată, la evaluarea modulului lui). */
export function inregistreazaCalcul(c: CalculDocument): void {
  calcul = c;
}

/**
 * O acțiune cu calculul la cerere. Cu garda trecută, calculul TREBUIE să fie înregistrat: o fereastră care dă datele
 * acțiunii fără să-i importe calculul e o greșeală de cod, deci aruncă (un refuz tăcut ar fi trecut drept „nimic ales”).
 */
function laCerere(id: string, eticheta: CheieSimpla, garda: (ctx: ContextDocument) => true | CheieSimpla): Actiune<ContextDocument> {
  const calculul = (): Pick<Actiune<ContextDocument>, 'activa' | 'ruleaza'> => {
    const c = calcul?.[id];
    if (!c) throw new Error(`acțiunea ${id}: calculul ei nu e încărcat (vine cu fereastra care o folosește, actiuniDocumentCalcul.ts)`);
    return c;
  };
  return {
    id, eticheta, capabilitate: 'desen',
    activa: (ctx) => {
      const g = garda(ctx);
      return g === true ? calculul().activa(ctx) : g;
    },
    ruleaza: (ctx) => {
      if (garda(ctx) === true) calculul().ruleaza(ctx);
    },
  };
}

export const ACTIUNI_DOCUMENT: readonly Actiune<ContextDocument>[] = [
  {
    id: 'selectie.la-punct',
    eticheta: 'actiune.selecteaza',
    capabilitate: 'desen',
    activa: (ctx) => (ctx.punct ? true : 'motiv.niciun-punct'),
    ruleaza: ALEGERE.ruleaza,
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
  laCerere('document.importa', 'actiune.importa', (ctx) => (ctx.importNou ? true : 'motiv.nimic-ales')),
  {
    id: 'document.muta-selectia',
    eticheta: 'actiune.muta-selectia',
    capabilitate: 'desen',
    activa: (ctx) => {
      if (ctx.selectie().length === 0) return 'motiv.nicio-selectie';
      if (!ctx.deplasare) return 'motiv.nicio-deplasare';
      const s = scrie(ctx);
      if (s !== true) return s;
      const d = ctx.deplasare();
      return alesePreaDeparte(ctx, d.dx, d.dy) ? 'motiv.prea-departe' : true;
    },
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
      if (!incape(ctx.istoric().doc, cresteCopia(ctx.istoric().doc, ctx.selectie()))) return 'motiv.plafon';
      return alesePreaDeparte(ctx, DECALAJ_COPIE.dx, DECALAJ_COPIE.dy) ? 'motiv.prea-departe' : true;
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
        const { radacina, ...restPiesa } = piesaVeche;
        const piesa: Piesa = { ...structuredClone(restPiesa), radacina: copieArbore(radacina), id };
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
      const c = pas(comenziStergere(h.doc, new Set(ctx.selectie())).comenzi);
      if (c) ctx.scrie(executa(h, c));
      ctx.selecteaza([]);
    },
  },
  // Dialogul de export scrie operațiile pieselor (ADR 0025) la Exportă: o singură comandă, deci un singur Ctrl+Z.
  // Doar piesele ale căror operații s-au schimbat; numărul operațiilor nu se schimbă, deci plafoanele rămân.
  laCerere('document.aplica-operatii', 'actiune.aplica-operatii', (ctx) => (ctx.operatiiNoi ? true : 'motiv.nimic-ales')),
  // Panoul de proprietăți (ADR 0038 §4): colțul stânga-jos al cutiei selecției, la una sau la mai multe instanțe.
  laCerere('document.pozitioneaza', 'actiune.pozitioneaza', (ctx) => (ctx.selectie().length === 0 ? 'motiv.nicio-selectie'
    : ctx.pozitieNoua ? true : 'motiv.nicio-deplasare')),
  // Rotirea unei singure instanțe, în jurul centrului piesei ei (ADR 0038 §4).
  laCerere('document.roteste', 'actiune.roteste', (ctx) => (ctx.selectie().length === 0 ? 'motiv.nicio-selectie'
    : ctx.selectie().length > 1 ? 'motiv.o-singura-selectie' : ctx.rotireNoua ? true : 'motiv.nicio-deplasare')),
  // Materialul foii, din panou, fără selecție (ADR 0038 §4). Operațiile nu se ating: exportul le judecă din nou.
  laCerere('foaie.stoc', 'actiune.foaie-stoc', (ctx) => (ctx.stocNou ? true : 'motiv.nimic-ales')),
  // Riglele și lipirea (ADR 0050), din modulul editării, la cerere: ghidajele foii și mutarea instanțelor cu deplasări proprii.
  laCerere('foaie.ghidaje', 'actiune.ghidaje', (ctx) => (ctx.ghidajeNoi ? true : 'motiv.nimic-ales')),
  laCerere('document.muta-instantele', 'actiune.muta-instantele', (ctx) => (ctx.deplasari ? true : 'motiv.nimic-ales')),
  // Uneltele de desen (ADR 0051): forma trasă pe pânză, ca o piesă nouă cu instanța ei.
  laCerere('document.deseneaza', 'actiune.deseneaza', (ctx) => (ctx.formaNoua ? true : 'motiv.nimic-ales')),
  // Mânerele selecției (ADR 0052): rotirea și scalarea exactă a geometriei.
  laCerere('document.transforma', 'actiune.transforma', (ctx) => (ctx.transformare ? true : 'motiv.nimic-ales')),
  laCerere('document.copiaza-in-retea', 'actiune.copiaza-in-retea', (ctx) => (ctx.retea ? true : 'motiv.nimic-ales')),
  // Panoul (ADR 0053): forma singurei instanțe alese, editată după plasare.
  laCerere('document.forma', 'actiune.forma', (ctx) => (ctx.formaEditata ? true : 'motiv.nimic-ales')),
  // Degruparea (ADR 0103): din bara editării, din meniul de clic dreapta, din paletă și cu Ctrl+Shift+G. N-are date de
  // fereastră: calculul vine cu modulul editării, iar până atunci acțiunea spune că se încarcă (nu aruncă).
  laCerere('document.degrupeaza', 'actiune.degrupeaza', (ctx) => (ctx.selectie().length === 0 ? 'motiv.nicio-selectie'
    : calcul === null ? 'motiv.editare-se-incarca' : true)),
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

export function istoricDin(doc: Document): Istoric {
  return { doc, trecut: [], viitor: [] };
}
