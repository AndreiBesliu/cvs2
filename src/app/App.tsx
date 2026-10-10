import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Panza } from '../canvas/Panza.tsx';
import { t } from '../i18n/t.ts';
import { LIMBI, type Limba } from '../i18n/tipuri.ts';
import { avertismente } from '../model/avertismente.ts';
import { documentNou, type Document, type Operatie } from '../model/document.ts';
import { istoricNou, type Istoric } from '../model/jurnal.ts';
import { elementeFoaie, type ElementLume } from '../model/lume.ts';
import { creeazaRegistru, ruleaza, stare } from '../ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, type ContextDocument } from '../ui/actiuniDocument.ts';
import { ACTIUNI_EXPORT, type ContextExport, type ParametriExport, type RezultatExport } from '../ui/actiuniExport.ts';
import { DialogExport, type CerereExport, type OperatieExport, type StareExport } from '../ui/DialogExport.tsx';
import { ListaVectori, type RandLista } from '../ui/ListaVectori.tsx';
import { useLimba } from '../ui/useLimba.ts';
import type { RezultatConfig } from './config.ts';
import { listaDesen } from './desen.ts';
import type { Jurnal } from './jurnalErori.ts';
import { operatieDinDialog } from './valoriOperatii.ts';
import { ConflictDeScriere, type DepozitProiect, type ProiectDeschis } from './proiectLocal.ts';

type Props = {
  readonly config: RezultatConfig;
  readonly jurnal: Jurnal;
  readonly diagnostic: string | null;
  readonly alegeLimba: (l: Limba) => void;
  /** Proiectul din browser, deschis înainte de prima randare (`proiectLocal.ts`). */
  readonly proiect: ProiectDeschis;
};

/** Diagnosticul `?diagnostic=eroare-de-randare` aruncă la randare, ca ErrorBoundary-ul să se poată proba pe build. */
function EroareProvocata(): never {
  throw new Error('Eroare de randare provocată (diagnostic)');
}

/** Descarcă octeții exacți ai programului: același fișier, același hash. */
function descarca(octeti: Uint8Array<ArrayBuffer>, nume: string): void {
  const url = URL.createObjectURL(new Blob([octeti], { type: 'text/plain' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nume;
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); }, 10_000);
}

/** Foaia documentului nou: bucata minimă a plăcii 1. */
const FOAIA_IMPLICITA = { latime: 300, inaltime: 200, grosime: 18 };

/** Acțiunile din bară, în ordine; toate trec prin registru. */
const BARA = [
  'document.adauga-dreptunghi', 'document.adauga-cerc', 'document.duplica-selectia', 'document.sterge-selectia',
  'istoric.anuleaza', 'istoric.reface',
] as const;

const doua = (x: number): string => x.toFixed(2);

/** Un element în lume, în cuvinte: forma și unde stă pe foaie. */
function descriere(e: Pick<ElementLume, 'forma' | 'matrice'>): string {
  const { e: x, f: y } = e.matrice;
  return e.forma.tip === 'dreptunghi'
    ? t('forma.dreptunghi', { latime: doua(e.forma.latime), inaltime: doua(e.forma.inaltime), x: doua(x), y: doua(y) })
    : t('forma.cerc', { raza: doua(e.forma.raza), x: doua(x), y: doua(y) });
}

/** O instanță, în cuvinte: numele piesei, sau primul ei element (și câte mai are). */
function descriereInstanta(elemente: readonly ElementLume[], nume: string | undefined): string {
  const [primul] = elemente;
  if (nume) return nume;
  if (!primul) return '—';
  return elemente.length === 1 ? descriere(primul) : `${descriere(primul)} (+${elemente.length - 1})`;
}

/**
 * Cum lucrează fila cu proiectul salvat. Se poate schimba: o filă care citea devine scriitor când cealaltă se închide, iar
 * una care scria trece în `conflict` dacă altă filă a salvat între timp.
 */
type ModFila = ProiectDeschis['mod'] | 'conflict' | 'necitita';

/** Modurile în care fila nu scrie documentul: altă filă scrie, a scris între timp, sau a scris ce fila asta nu citește. */
const doarCiteste = (mod: ModFila): boolean => mod === 'doar-citire' || mod === 'conflict' || mod === 'necitita';

/** Ce spune bara de jos despre salvare. */
function mesajProiect(mod: ModFila, p: ProiectDeschis, motivNecitit: string): string | null {
  if (mod === 'necitita') return t('depozit.necitita', { motiv: motivNecitit });
  if (mod === 'doar-citire') return t('depozit.doar-citire');
  if (mod === 'conflict') return t('depozit.conflict');
  if (mod === 'fara-memorie') return t('depozit.fara-memorie');
  if (mod === 'nu-se-deschide' && p.mod === 'nu-se-deschide') return t('depozit.nu-se-deschide', { motiv: p.motiv });
  return null;
}

export function App({ config, jurnal, diagnostic, alegeLimba, proiect }: Props) {
  const limbaActiva = useLimba();
  const intrari = useSyncExternalStore(jurnal.asculta, () => jurnal.citeste().length);
  const docPornire = useMemo(
    () => ((proiect.mod === 'scriitor' || proiect.mod === 'doar-citire') && proiect.doc ? proiect.doc : documentNou(FOAIA_IMPLICITA)),
    [proiect],
  );
  const [istoric, setIstoric] = useState<Istoric>(() => istoricNou(docPornire));
  const [selectie, setSelectie] = useState<readonly string[]>([]);
  const [eroareSalvare, setEroareSalvare] = useState<string | null>(null);
  const [mod, setMod] = useState<ModFila>(proiect.mod);
  const [motivNecitit, setMotivNecitit] = useState('');
  const depozit = useRef<DepozitProiect | null>(proiect.mod === 'scriitor' ? proiect.depozit : null);
  /** Ultimul document venit din bază (la deschidere sau de la fila care scrie): nu se salvează înapoi. */
  const dinBaza = useRef<Document>(docPornire);
  // Acțiunile citesc și scriu starea sincron: referința ține mereu ultima valoare, starea React redesenează.
  const curenta = useRef({ istoric, selectie });
  curenta.current = { istoric, selectie };

  const [dialogExport, setDialogExport] = useState(false);
  const [stareExport, setStareExport] = useState<StareExport | null>(null);
  /**
   * Numărul ultimei cereri de export. Un rezultat întârziat (calculul se încarcă la cerere) e al altor parametri dacă între
   * timp s-a pornit alt export, s-a schimbat un parametru sau s-a închis dialogul: nu se afișează și nu se descarcă.
   */
  const cerereExport = useRef(0);
  /** Un export pornit, al cărui rezultat n-a venit încă (calculul se încarcă la cerere). */
  const exportInCurs = useRef(false);
  /**
   * Câte documente au venit din bază de la pornire. Dialogul de export ia de aici valorile operațiilor din nou: o versiune
   * nouă (de la fila care scrie, sau la preluarea scrierii) le înlocuiește pe cele vechi. Propria scriere a dialogului nu
   * trece pe aici.
   */
  const [bazaNoua, setBazaNoua] = useState(0);

  /**
   * Un document venit din bază înlocuiește istoricul; selecția păstrează doar instanțele care există în el. Un export în
   * curs era al documentului vechi: se aruncă, și se spune, ca omul să nu aștepte un fișier care nu mai vine.
   */
  const dinBazaNou = (d: Document): void => {
    dinBaza.current = d;
    cerereExport.current++;
    setStareExport(exportInCurs.current ? { ok: false, motiv: t('export.proiect-schimbat') } : null);
    exportInCurs.current = false;
    setBazaNoua((n) => n + 1);
    const h = istoricNou(d);
    const existente = new Set(d.foi[0]?.instante.map((i) => i.id) ?? []);
    const sel = curenta.current.selectie.filter((id) => existente.has(id));
    curenta.current = { istoric: h, selectie: sel };
    setIstoric(h);
    setSelectie(sel);
  };

  // Fila care citește: primește fiecare versiune salvată de scriitor și devine ea scriitorul când acela se închide.
  useEffect(() => {
    if (proiect.mod !== 'doar-citire') return undefined;
    return proiect.urmareste({
      laVersiune: (d) => { dinBazaNou(d); },
      laScriitor: (dep, d) => {
        depozit.current = dep;
        if (d) dinBazaNou(d);
        else dinBaza.current = curenta.current.istoric.doc;
        setMod('scriitor');
      },
      laNecitita: (motiv) => {
        setMotivNecitit(motiv);
        setMod('necitita');
      },
    });
    // `dinBazaNou` lucrează doar cu referințe și setteri, deci prima lui versiune e și ultima.
  }, [proiect]);
  const registru = useMemo(() => creeazaRegistru(ACTIUNI_DOCUMENT, () => true), []);
  const registruExport = useMemo(() => creeazaRegistru(ACTIUNI_EXPORT, () => true), []);
  const contextExport = (p?: ParametriExport, cerere = cerereExport.current): ContextExport => ({
    document: () => curenta.current.istoric.doc,
    parametri: () => p ?? { origine: 'stanga-jos', z0: 'sus' },
    rezultat: (r: RezultatExport) => {
      if (cerere !== cerereExport.current) return;
      exportInCurs.current = false;
      if (r.ok) {
        descarca(r.program.octeti, `cncvs2-${p?.origine ?? 'stanga-jos'}.${r.program.extensie}`);
        setStareExport({ ok: true, linii: r.program.linii, sha256: r.program.sha256, avertismente: r.avertismente });
      } else {
        setStareExport('cereConfirmare' in r ? { ok: false, motiv: r.motiv, cereConfirmare: r.cereConfirmare } : { ok: false, motiv: r.motiv });
      }
    },
  });
  const doc = istoric.doc;
  const foaie = doc.foi[0] ?? documentNou(FOAIA_IMPLICITA).foi[0];
  // Lista de desen și elementele în lume se refac doar când se schimbă documentul.
  const lume = useMemo(() => elementeFoaie(doc, 0), [doc]);
  const forme = useMemo(() => listaDesen(doc), [doc]);
  // Avertismentele: tot după fiecare schimbare a documentului; în bara de jos și în listă, niciodată pe pânză.
  const avert = useMemo(() => avertismente(doc, 0), [doc]);
  // Hărțile listei, o dată pe document: un rând costă cât elementele lui, nu cât toată foaia.
  const harti = useMemo(() => {
    const peInstanta = new Map<string, ElementLume[]>();
    for (const e of lume) {
      const l = peInstanta.get(e.instanta);
      if (l) l.push(e);
      else peInstanta.set(e.instanta, [e]);
    }
    const piese = new Map(doc.piese.map((p) => [p.id, p]));
    const nume = new Map((doc.foi[0]?.instante ?? []).map((i) => [i.id, piese.get(i.piesa)?.nume]));
    return { peInstanta, nume, dupaIdLume: new Map(lume.map((e) => [e.idLume, e])) };
  }, [lume, doc]);
  // Selecția ține instanțe; doar cele care există încă se arată (o anulare le poate scoate de pe foaie).
  const selectieValida = useMemo(() => selectie.filter((id) => harti.nume.has(id)), [selectie, harti]);
  // Pânza primește elementele în lume ale instanțelor alese.
  const selectieDesen = useMemo(
    () => selectieValida.flatMap((id) => (harti.peInstanta.get(id) ?? []).map((e) => e.idLume)),
    [selectieValida, harti],
  );

  // Salvarea: fiecare document nou (după o comandă, o anulare sau o refacere) pleacă în IndexedDB, doar din fila care scrie.
  useEffect(() => {
    const dep = depozit.current;
    if (mod !== 'scriitor' || !dep || doc === dinBaza.current) return;
    dep.scrie(doc).then(
      () => { setEroareSalvare(null); },
      (e: unknown) => {
        jurnal.adauga('salvare', e);
        // Altă filă a salvat între timp: fila asta nu mai scrie, ca să nu acopere versiunea aceea.
        if (e instanceof ConflictDeScriere) setMod('conflict');
        else setEroareSalvare(e instanceof Error ? e.message : String(e));
      },
    );
  }, [doc, mod, jurnal]);

  const context = (extra: Partial<Pick<ContextDocument, 'deplasare' | 'punct' | 'alese' | 'operatiiNoi'>> = {}): ContextDocument => ({
    istoric: () => curenta.current.istoric,
    scrie: (h) => { curenta.current = { ...curenta.current, istoric: h }; setIstoric(h); },
    selectie: () => curenta.current.selectie,
    selecteaza: (ids) => { curenta.current = { ...curenta.current, selectie: ids }; setSelectie(ids); },
    doarCitire: () => doarCiteste(mod),
    ...extra,
  });

  useEffect(() => {
    document.documentElement.lang = limbaActiva;
  }, [limbaActiva]);

  /**
   * Ușa unică a acțiunilor de document. Cât e deschis dialogul de export, nicio acțiune nu rulează, oricare ar fi calea:
   * o scurtătură, un buton atins cu Tab sau o tragere pornită înainte de dialog. Confirmarea unei ieșiri din foaie rămâne
   * a desenului pe care omul îl vede.
   */
  const dialogDeschis = useRef(false);
  dialogDeschis.current = dialogExport;
  const ruleazaDocument = (id: string, ctx: ContextDocument): void => {
    if (dialogDeschis.current) return;
    ruleaza(registru, id, ctx);
  };

  useEffect(() => {
    const tasta = (e: KeyboardEvent): void => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const ctrl = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      const id = e.key === 'Delete' ? 'document.sterge-selectia'
        : ctrl && k === 'z' && !e.shiftKey ? 'istoric.anuleaza'
          : ctrl && (k === 'y' || (k === 'z' && e.shiftKey)) ? 'istoric.reface'
            : ctrl && k === 'd' && !e.shiftKey ? 'document.duplica-selectia'
              : null;
      if (!id) return;
      // Ctrl+D ar pune altfel pagina la favorite.
      e.preventDefault();
      ruleazaDocument(id, context());
    };
    window.addEventListener('keydown', tasta);
    return () => { window.removeEventListener('keydown', tasta); };
  });

  // Pe live, diagnosticul nu există.
  if (diagnostic === 'eroare-de-randare' && config.ok && config.config.instanta !== 'live') return <EroareProvocata />;

  const instanta = config.ok ? config.config.instanta : t('app.instanta.necunoscuta');
  const elementeInstanta = (id: string): readonly ElementLume[] => harti.peInstanta.get(id) ?? [];
  const numePiesa = (id: string): string | undefined => harti.nume.get(id);
  const selectata = selectieValida.length === 1 && selectieValida[0] !== undefined ? selectieValida[0] : null;
  const descriereLume = (idLume: string): string => {
    const e = harti.dupaIdLume.get(idLume);
    return e ? descriere(e) : idLume;
  };
  const avertInstanta = new Map<string, string[]>();
  for (const a of avert) {
    const text = t('avertisment.iese-din-foaie', { descriere: descriereLume(a.id) });
    const l = avertInstanta.get(a.instanta);
    if (l) l.push(text);
    else avertInstanta.set(a.instanta, [text]);
  }
  const alese = new Set(selectieValida);
  const randuri: RandLista[] = (foaie?.instante ?? []).map((i) => ({
    id: i.id,
    descriere: descriereInstanta(elementeInstanta(i.id), numePiesa(i.id)),
    avertisment: avertInstanta.get(i.id)?.join('\n') ?? null,
    selectat: alese.has(i.id),
  }));
  const mesaj = mesajProiect(mod, proiect, motivNecitit);

  /**
   * Dialogul de export arată operațiile pieselor de pe foaie (ADR 0025): câte un rând pe operație, cu descrierea primului
   * ei element în prima instanță a piesei. Freza e comună tuturor, până la schimbarea sculei. Se calculează doar cu
   * dialogul deschis, liniar (o hartă a pieselor, o mulțime a celor văzute), o dată pe document și pe limbă.
   */
  const exportFoaie = useMemo(() => {
    if (!dialogExport) return null;
    const piese = new Map(doc.piese.map((p) => [p.id, p]));
    const vazute = new Set<string>();
    const lista: Array<{ readonly piesa: Document['piese'][number]; readonly instanta: string }> = [];
    for (const i of doc.foi[0]?.instante ?? []) {
      const p = vazute.has(i.piesa) ? undefined : piese.get(i.piesa);
      if (!p) continue;
      vazute.add(p.id);
      lista.push({ piesa: p, instanta: i.id });
    }
    const randuriOp: OperatieExport[] = lista.flatMap(({ piesa, instanta: inst }) => piesa.operatii.map((o) => {
      const e = harti.dupaIdLume.get(`${inst}/${o.noduri[0] ?? ''}`);
      const baza = e ? descriere(e) : (piesa.nume ?? piesa.id);
      return {
        cheie: `${piesa.id}/${o.id}`,
        descriere: o.noduri.length > 1 ? `${baza} (+${o.noduri.length - 1})` : baza,
        valori: {
          latura: o.latura, sens: o.sens, adancime: o.adancime, pas: o.pas,
          urechi: o.urechi ? { numar: o.urechi.numar, latime: o.urechi.latime, grosime: o.urechi.grosime } : null,
          rampa: o.rampa ? { lungime: o.rampa.lungime } : null,
          intrari: o.intrari ? { raza: o.intrari.raza } : null,
        },
      };
    }));
    const operatii = lista.flatMap(({ piesa }) => piesa.operatii);
    return {
      piese: lista,
      randuri: randuriOp,
      diametru: operatii[0]?.scula.diametru ?? 6,
      // Freza la care Exportă aduce toate operațiile: numărul primei, cu diametrul din dialog.
      numar: operatii[0]?.scula.numar ?? 1,
      freze: [...new Map(operatii.map((o) => [`${o.scula.numar}/${o.scula.diametru}`, { numar: o.scula.numar, diametru: o.scula.diametru }])).values()],
      descrieri: new Map(lume.map((e) => [e.idLume, descriere(e)])),
    };
  }, [dialogExport, doc, harti, lume, limbaActiva]);

  /**
   * Exportă: întâi valorile din dialog intră în document, ca o singură comandă (se salvează, Ctrl+Z le scoate), apoi
   * exportul citește documentul. Scrierea trece pe lângă ușa oprită sub dialog: e chiar gestul dialogului. Într-o filă
   * care doar citește, acțiunea e inactivă, iar dialogul n-a lăsat nimic de schimbat.
   */
  const exporta = (c: CerereExport): void => {
    // Fila care n-a putut citi ultima versiune ar exporta una veche: refuză, cu motivul din bara de jos, în dialog.
    if (mod === 'necitita') {
      setStareExport({ ok: false, motiv: t('depozit.necitita', { motiv: motivNecitit }) });
      return;
    }
    const noi = new Map<string, Operatie[]>();
    const numar = exportFoaie?.numar ?? 1;
    for (const { piesa } of exportFoaie?.piese ?? []) {
      noi.set(piesa.id, piesa.operatii.map((o) => operatieDinDialog(o, c.valori.get(`${piesa.id}/${o.id}`), { numar, diametru: c.diametru })));
    }
    const scris = ruleaza(registru, 'document.aplica-operatii', context({ operatiiNoi: () => noi }));
    // Doar citirea nu oprește exportul (operațiile din document rămân cele de exportat); orice alt refuz, da.
    if (!scris.ok && scris.motiv !== 'motiv.doar-citire') {
      setStareExport({ ok: false, motiv: t(scris.motiv) });
      return;
    }
    const { origine, z0 } = c;
    exportInCurs.current = true;
    const r = ruleaza(registruExport, 'export.gcode', contextExport({
      origine, z0, ...(c.confirmareIesire ? { confirmareIesire: c.confirmareIesire } : {}),
    }, ++cerereExport.current));
    // Un export refuzat înainte de calcul (nimic de exportat, nicio operație) spune de ce, nu lasă rezultatul vechi.
    if (!r.ok) {
      exportInCurs.current = false;
      setStareExport({ ok: false, motiv: t(r.motiv) });
    }
  };

  return (
    <>
      {/* Sub dialog, aplicația e inertă: nici Tab, nici clicul nu mai ajung la bară sau la pânză. */}
      <div className="aplicatie" inert={dialogExport}>
        <header>
          <h1>{t('app.titlu')}</h1>
          <span data-testid="instanta" className="instanta">{t('app.instanta', { nume: instanta })}</span>
          <nav aria-label={t('app.limba')}>
            {LIMBI.map((l) => (
              <button key={l} type="button" aria-pressed={l === limbaActiva} onClick={() => { alegeLimba(l); }}>
                {l.toUpperCase()}
              </button>
            ))}
          </nav>
        </header>
        <div className="bara" role="toolbar" aria-label={t('bara.actiuni')}>
          {BARA.map((id) => {
            const s = stare(registru, id, context());
            const a = registru.actiuni.get(id);
            if (!a) return null;
            return (
              <button key={id} type="button" disabled={!s.ok} title={s.ok ? undefined : t(s.motiv)} data-actiune={id}
                onClick={() => { ruleazaDocument(id, context()); }}>
                {t(a.eticheta)}
              </button>
            );
          })}
          {(() => {
            const s = stare(registruExport, 'export.gcode', contextExport());
            return (
              <button type="button" disabled={!s.ok} title={s.ok ? undefined : t(s.motiv)} data-actiune="export.gcode"
                onClick={() => { setStareExport(null); setDialogExport(true); }}>
                {t('actiune.exporta-gcode')}
              </button>
            );
          })()}
        </div>
        {!config.ok && <p role="status" className="avertisment">{t('eroare.config', { motiv: config.motiv })}</p>}
        <div className="lucru">
          <Panza
            forme={forme}
            foaie={foaie?.stoc ?? FOAIA_IMPLICITA}
            selectie={selectieDesen}
            onClic={(x, y, toleranta) => { ruleazaDocument('selectie.la-punct', context({ punct: () => ({ x, y, toleranta }) })); }}
            onMutare={(dx, dy) => { ruleazaDocument('document.muta-selectia', context({ deplasare: () => ({ dx, dy }) })); }}
          />
          <ListaVectori
            randuri={randuri}
            onAlege={(id) => { ruleazaDocument('selectie.din-lista', context({ alese: () => [id] })); }}
          />
        </div>
        <footer>
          <span data-testid="selectie">
            {selectata ? t('stare.selectie', { descriere: descriereInstanta(elementeInstanta(selectata), numePiesa(selectata)) }) : t('stare.nimic-selectat')}
          </span>
          {avert.length > 0 && (() => {
            // Un singur rând, oricâte avertismente: bara nu crește peste pânză. Lista întreagă stă în titlu și, cu roșu, în
            // lista de vectori.
            const toate = avert.map((a) => t('avertisment.iese-din-foaie', { descriere: descriereLume(a.id) }));
            return (
              <span className="avertisment-bara" data-testid="avertisment" title={toate.join('\n')}>
                {toate.length === 1 ? toate[0] : t('avertisment.forme-ies-din-foaie', { n: toate.length })}
              </span>
            );
          })()}
          {(mesaj ?? eroareSalvare) !== null && (
            <span className="avertisment-bara" data-testid="proiect" role="status">
              {mesaj ?? t('depozit.eroare', { motiv: eroareSalvare ?? '' })}
            </span>
          )}
          <span data-testid="jurnal">{t('jurnal.intrari', { n: intrari })}</span>
        </footer>
      </div>
      {dialogExport && exportFoaie && (
        <DialogExport
          baza={bazaNoua}
          operatii={exportFoaie.randuri}
          diametru={exportFoaie.diametru}
          freze={exportFoaie.freze}
          descrieri={exportFoaie.descrieri}
          doarCitire={doarCiteste(mod)}
          stare={stareExport}
          onExporta={(c) => { exporta(c); }}
          onInchide={() => { cerereExport.current++; exportInCurs.current = false; setDialogExport(false); }}
          onReseteaza={() => { cerereExport.current++; exportInCurs.current = false; setStareExport(null); }}
        />
      )}
    </>
  );
}
