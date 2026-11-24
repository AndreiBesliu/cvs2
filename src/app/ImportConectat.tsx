import { useEffect, useMemo, useRef, useState } from 'react';
// Calculul acțiunilor pe care le dă fereastra asta (`actiuniDocument.ts`, `laCerere`) vine cu ea, nu în pachetul de pornire.
import '../ui/actiuniDocumentCalcul.ts';
import { ruleaza, type Registru, type RezultatActiune } from '../ui/actiuni.ts';
import { formatImport } from '../io/formatImport.ts';
import { TRASARE_IMPLICITA } from '../io/imagine.ts';
import {
  PLAFON_IMPORT, pregatesteImagineaFoii, type AlegeriImport, type ContextImport, type FisierImport, type ImportPregatit,
  type PrevizualizareImport,
} from '../ui/actiuniImport.ts';
import { DialogImport } from '../ui/DialogImport.tsx';
import { mesajeGata } from '../i18n/laCerere.ts';
import type { CheieSimpla } from '../i18n/t.ts';
import type { ImagineFoaie } from '../model/document.ts';
import { citeste as citesteImaginea, OPACITATE_IMAGINE, pastreaza } from './imaginiFoaie.ts';
import { asezarePeImagine, numeFisierImagine, zonaInPixeli, type ZonaRelativa } from './modImagineCalcul.ts';
import { utilizarea } from './utilizare.ts';
import type { RezultatImagine } from '../ui/AlegereRezultat.tsx';
import { FereastraRelief } from './FereastraRelief.tsx';

/** Mesajele modulului, ca date (ADR 0086): cine îl încarcă le așteaptă (`cuMesaje`); un refuz îl vede tot el. */
export const mesaje = mesajeGata();
mesaje.catch(() => undefined);

/** Locul lăsării pe planșă (mm ai foii), sau null (butonul, ori lăsate în afara pânzei). */
type Loc = { readonly x: number; readonly y: number } | null;

/**
 * Importul SVG (ADR 0035 §9), DXF (ADR 0101 §8), PDF / AI (ADR 0104 §7), EPS (ADR 0115 §7) și WMF (ADR 0117 §9): fișierul
 * ales, alegerile (px-ul unui SVG, unitatea unui DXF care nu și-o declară sau a unui WMF fără antet, pagina unui PDF) și
 * previzualizarea. Cât e deschis, documentul nu se schimbă pe altă cale (aplicația e inertă sub dialog): „Importă” adaugă
 * exact ce arată dialogul.
 */
type StareDialog = AlegeriImport & {
  readonly fisier: FisierImport | null; readonly nume: string;
  /** `pxPeTol` = 72 a fost ales după comentariul Illustrator din fișier. */
  readonly pxAutomat: boolean;
  readonly stare: PrevizualizareImport | 'citire';
  /**
   * Se recitește cu altă alegere: previzualizarea (sau refuzul) de dinainte rămâne pe ecran, și focusul pe alegere, dar
   * „Importă” e oprit.
   */
  readonly seRecitesc?: boolean;
};

/** Alegerile cu care se citește întâi orice fișier: 1/96 țol, mm (DXF), 1/96 țol (WMF), prima pagină, trasarea implicită. */
const ALEGERI: AlegeriImport = { pxPeTol: 96, unitate: 'mm', unitateWmf: 'px', pagina: 1, trasare: TRASARE_IMPLICITA };

/**
 * Bifa „Păstrează imaginea pe foaie” (ADR 0272, răspunsul 1a): oprită implicit, ca până acum; ținută minte cât lucrezi (cât
 * stă modulul încărcat, adică până la reîncărcarea paginii).
 */
let pastreazaImaginea = false;

/**
 * Ce se face dintr-o imagine (ADR 0310 §7): vectori (trasarea, implicit, ca până acum) sau relief; ținut minte cât lucrezi,
 * ca bifa de mai sus.
 */
let rezultatTinut: RezultatImagine = 'vectori';
const esteImagine = (nume: string): boolean => formatImport(nume, '') === 'imagine';

type Props = {
  /** Coada fișierelor alese sau lăsate pe planșă (felia 2.8b), cel puțin unul: dialogul le trece pe rând. */
  readonly fisiere: readonly File[];
  readonly punct: Loc;
  readonly registruImport: Registru<ContextImport>;
  /** Contextul ușilor pentru un fișier și alegerile lui (limba, fila care doar citește, jurnalul: ale aplicației). */
  readonly contextImport: (f: FisierImport | null, a: AlegeriImport, rezultat: (r: PrevizualizareImport) => void, semnal?: AbortSignal) => ContextImport;
  /** Starea și rularea lui `document.importa`, prin registrul și contextul aplicației (cu imaginea păstrată pe foaie, ADR 0272). */
  readonly stareImporta: (p: ImportPregatit, loc: Loc) => RezultatActiune;
  readonly importa: (p: ImportPregatit, loc: Loc, imagine?: ImagineFoaie) => RezultatActiune;
  /** „Doar imaginea” (ADR 0272): imaginea pe foaia activă, fără vectori (`foaie.imagini`). */
  readonly puneImaginea: (imagine: ImagineFoaie) => RezultatActiune;
  readonly onInchide: () => void;
  /** Extensia care a propus fișierul (ADR 0166 §C), spusă în fereastră. */
  readonly de?: string;
  /** Diametrul frezei foii, dacă are una singură (liniile mediane îl compară cu trăsătura, ADR 0222 §5). */
  readonly freza?: number;
  /**
   * Trasarea din imaginea de pe foaie (ADR 0272 §7; felia 25.8↑b), în locul fișierelor: octeții ei din baza imaginilor, cu
   * scara ei și zona trasă pe ea; „Importă” pune vectorii exact peste ea.
   */
  readonly dinFoaie?: { readonly imagine: ImagineFoaie; readonly zona: ZonaRelativa | null };
};

/**
 * Starea de la care pornește dialogul pentru un fișier al cozii: SVG, DXF, PDF / AI, EPS sau WMF (după nume sau tip);
 * celelalte formate vin mai târziu. Peste plafon, fișierul nu se citește deloc (ADR 0035 §1).
 */
function stareInitiala(f: File): StareDialog {
  const baza = { fisier: null, nume: f.name, ...ALEGERI, pxAutomat: false } as const;
  if (formatImport(f.name, f.type) === null) return { ...baza, stare: { ok: false, cod: 'tip' } };
  if (f.size > PLAFON_IMPORT.octeti) return { ...baza, stare: { ok: false, cod: 'octeti', detaliu: String(f.size) } };
  return { ...baza, stare: 'citire' };
}

/**
 * Dialogul importului legat de coadă: citirea fișierelor, recitirea Illustrator la 72 px și locul fiecărei piese. Vine la
 * cerere, cu dialogul (`App.tsx`); aplicația ține doar coada (fișierele și punctul), garda „doar citire” și inerția.
 */
export function ImportConectat({ fisiere, punct, registruImport, contextImport, stareImporta, importa, puneImaginea, onInchide, de, freza, dinFoaie }: Props) {
  const [k, setK] = useState(0);
  const [dialog, setDialog] = useState<StareDialog>(() => stareInitiala(fisiere[0] ?? new File([], '')));
  const [pastreazaBifat, setPastreazaBifat] = useState(pastreazaImaginea);
  /** Vectori sau relief (ADR 0310 §7); ref-ul îl citesc și citirile pornite din efecte. */
  const [rezultat, setRezultat] = useState<RezultatImagine>(rezultatTinut);
  const rezultatAcum = useRef(rezultat);
  /** Imaginea pentru foaie (ADR 0272): în lucru, și motivul ultimului eșec (până la citirea următoare). */
  const [imagineInLucru, setImagineInLucru] = useState(false);
  const [motivImagine, setMotivImagine] = useState<CheieSimpla | null>(null);
  /** Numărul ultimei citiri: un rezultat întârziat al unei citiri vechi (alt fișier, alt px, dialog închis) se aruncă. */
  const cerere = useRef(0);
  /**
   * Oprirea citirii în curs (ADR 0220): o citire nouă, fișierul următor și demontarea o opresc; închiderea (Renunță,
   * Escape) demontează dialogul, deci o oprește tot de acolo. Trasarea unei imagini își oprește workerul; celelalte uși
   * citesc pe loc și doar își aruncă rezultatul.
   */
  const oprire = useRef<AbortController | null>(null);
  const opresteCitirea = (): void => {
    oprire.current?.abort();
    oprire.current = null;
  };

  const inchide = (): void => {
    cerere.current++;
    onInchide();
  };
  /**
   * Citește fișierul ales cu alegerile `a` (`vechi`: ce rămâne pe ecran cât se recitește). Un fișier pe care îl spune
   * Illustrator și a cărui mapare depinde de px se recitește o dată cu 72 (ADR 0035 §2), iar dialogul spune de ce.
   */
  const citeste = (f: FisierImport, a: AlegeriImport, automat: boolean, vechi?: PrevizualizareImport): void => {
    const c = ++cerere.current;
    opresteCitirea();
    const ac = new AbortController();
    oprire.current = ac;
    setImagineInLucru(false);
    setMotivImagine(null);
    setDialog({ fisier: f, nume: f.nume, ...a, pxAutomat: automat, ...(vechi ? { stare: vechi, seRecitesc: true } : { stare: 'citire' }) });
    // Utilizarea aplicației (ADR 0262, A.8d): durata citirii, octeții și formatul fișierului, fără numele lui.
    const pornitLa = performance.now();
    const format = formatImport(f.nume, '');
    const spune = (rez: 'ok' | 'eroare' | 'anulat'): void => {
      utilizarea.eveniment({
        fel: 'calcul', id: 'import', ms: performance.now() - pornitLa, rez, octeti: f.octeti.length, ...(format === null ? {} : { format }),
      });
    };
    const pornit = ruleaza(registruImport, 'import.svg', contextImport(f, a, (r) => {
      if (c !== cerere.current) {
        spune('anulat');
        return;
      }
      if (oprire.current === ac) oprire.current = null;
      if (!automat && a.pxPeTol === 96 && r.ok && r.format === 'svg' && r.px && r.illustrator) {
        // Recitit cu 72 px pe țol: se numără citirea de după.
        citeste(f, { ...a, pxPeTol: 72 }, true);
        return;
      }
      spune(r.ok ? 'ok' : 'eroare');
      setDialog({ fisier: f, nume: f.nume, ...a, pxAutomat: automat, stare: r });
    }, ac.signal));
    // Acțiunea oprită (fila a trecut între timp pe „doar citire”): dialogul nu așteaptă un rezultat care nu vine.
    if (!pornit.ok) inchide();
  };
  /** Un fișier al cozii: verificările sincrone, apoi octeții, apoi ușa. */
  const incepe = (f: File): void => {
    const initiala = stareInitiala(f);
    const c = ++cerere.current;
    opresteCitirea();
    setImagineInLucru(false);
    setMotivImagine(null);
    setDialog(initiala);
    if (initiala.stare !== 'citire') return;
    f.arrayBuffer().then((b) => {
      if (c !== cerere.current) return;
      const fisier = { nume: f.name, octeti: new Uint8Array(b) };
      // O imagine făcută relief (ADR 0310 §7): fără trasare; fereastra reliefului își face singură calculul.
      if (rezultatAcum.current === 'relief' && esteImagine(f.name)) setDialog({ fisier, nume: f.name, ...ALEGERI, pxAutomat: false, stare: 'citire' });
      else citeste(fisier, ALEGERI, false);
    }, (e: unknown) => {
      if (c === cerere.current) setDialog({ fisier: null, nume: f.name, ...ALEGERI, pxAutomat: false, stare: { ok: false, cod: 'parsare', detaliu: String(e) } });
    });
  };
  /**
   * Imaginea de pe foaie (ADR 0272 §7): octeții ei din baza imaginilor, cu numele tipului lor (ușa o citește drept imagine),
   * scara ei (lățimea întreagă pe foaie) și zona trasă, în pixelii ei. Lipsă din browser: refuzul citirii.
   */
  const incepeDinFoaie = (d: NonNullable<Props['dinFoaie']>): void => {
    const c = ++cerere.current;
    const nume = d.imagine.nume ?? d.imagine.id;
    const baza = { fisier: null, nume, ...ALEGERI, pxAutomat: false } as const;
    setDialog({ ...baza, stare: 'citire' });
    citesteImaginea(d.imagine.sursa).then(async (im) => {
      if (c !== cerere.current) return;
      if (!im) {
        setDialog({ ...baza, stare: { ok: false, cod: 'imagine-citire', format: 'imagine', detaliu: d.imagine.sursa.slice(0, 12) } });
        return;
      }
      const octeti = new Uint8Array(await im.octeti.arrayBuffer());
      if (c !== cerere.current) return;
      const zona = d.zona ? zonaInPixeli(d.zona, im.latimePx, im.inaltimePx) : null;
      citeste({ nume: numeFisierImagine(nume, im.tip), octeti }, { ...ALEGERI, trasare: { ...TRASARE_IMPLICITA, zona, latimeIntreaga: d.imagine.latime } }, false);
    }).catch((e: unknown) => {
      if (c === cerere.current) setDialog({ ...baza, stare: { ok: false, cod: 'imagine-citire', format: 'imagine', detaliu: String(e) } });
    });
  };
  // Primul fișier (ori imaginea de pe foaie), la montare (o coadă nouă e o montare nouă: aplicația scoate dialogul la
  // închidere). La demontare, un rezultat întârziat nu mai are unde ajunge.
  useEffect(() => {
    const f = fisiere[0];
    if (dinFoaie) incepeDinFoaie(dinFoaie);
    else if (f) incepe(f);
    return () => { cerere.current++; opresteCitirea(); };
  }, []);
  /** Fișierul următor din coadă (după „Importă” sau „Sari peste”), sau închiderea dialogului. */
  const urmatorul = (): void => {
    const urm = fisiere[k + 1];
    if (!urm) {
      inchide();
      return;
    }
    setK(k + 1);
    incepe(urm);
  };

  // Locul piesei din coadă: punctul lăsat, apoi fiecare fișier următor cu 10 mm la dreapta și în jos (nu cad unul peste altul).
  const loc: Loc = punct ? { x: punct.x + 10 * k, y: punct.y - 10 * k } : null;
  const ok = dialog.stare !== 'citire' && dialog.stare.ok ? dialog.stare : null;
  // Din imaginea de pe foaie (ADR 0272 §7): importul pregătit cu locul lui exact peste ea (centrul imaginii în pagină, rotit
  // cu ea), din raportul trasării: imaginea întreagă, scara și zona.
  const pregatit = useMemo(() => {
    if (!ok || !dinFoaie || ok.format !== 'imagine') return ok?.pregatit ?? null;
    const r = ok.trasare;
    return { ...ok.pregatit, peImagine: asezarePeImagine(dinFoaie.imagine, r.intreg.latimePx, r.intreg.inaltimePx, r.mmPePx, r.zona) };
  }, [ok, dinFoaie]);
  const stareOk = pregatit ? stareImporta(pregatit, loc) : null;
  /**
   * Imaginea pentru foaie (ADR 0272): pregătită în workerul trasării, cu alegerile de pe ecran, păstrată în baza imaginilor,
   * apoi pusă: cu desenul, într-un singur pas de anulare („Importă” cu bifa), ori singură („Doar imaginea”; lăsată pe planșă,
   * cu centrul în punctul lăsat). O citire nouă, fișierul următor sau închiderea o lasă fără efect.
   */
  const puneImagineaFoii = (cuDesen: boolean): void => {
    const f = dialog.fisier;
    if (!f || imagineInLucru || dialog.seRecitesc) return;
    const c = cerere.current;
    const pregatit = ok?.pregatit;
    setImagineInLucru(true);
    setMotivImagine(null);
    const pune = async (): Promise<CheieSimpla | null> => {
      const im = await pregatesteImagineaFoii(f, { trasare: dialog.trasare ?? TRASARE_IMPLICITA, pagina: dialog.pagina });
      if (c !== cerere.current) return null;
      if (!im) return 'import.imagine-foaie.nepusa';
      const sursa = await pastreaza(new Uint8Array(await im.octeti.arrayBuffer()), im.tip, im.latimePx, im.inaltimePx);
      if (c !== cerere.current) return null;
      const imagine: ImagineFoaie = {
        id: 'im1', sursa, nume: im.nume, x: im.x, y: im.y, latime: im.latime, inaltime: im.inaltime, rotire: 0, opacitate: OPACITATE_IMAGINE,
        vizibila: true, fixata: true,
      };
      const r = cuDesen && pregatit ? importa(pregatit, loc, imagine) : puneImaginea(loc ? { ...imagine, x: loc.x, y: loc.y } : imagine);
      if (!r.ok) return r.motiv;
      urmatorul();
      return null;
    };
    pune().catch((e: unknown) => {
      contextImport(f, ALEGERI, () => undefined).jurnal?.(e);
      return 'import.imagine-foaie.nepusa' as const;
    }).then((motiv) => {
      if (c !== cerere.current) return;
      setImagineInLucru(false);
      setMotivImagine(motiv);
    }, () => undefined);
  };
  /**
   * Vectori sau relief (ADR 0310 §7). Spre relief, trasarea în curs se oprește (fereastra reliefului are workerul ei); înapoi
   * la vectori, o trasare neterminată se reia cu alegerile de pe ecran.
   */
  const alegeRezultat = (r: RezultatImagine): void => {
    rezultatTinut = r;
    rezultatAcum.current = r;
    setRezultat(r);
    if (r === 'relief') {
      cerere.current++;
      opresteCitirea();
    } else if (dialog.fisier && dialog.stare === 'citire') {
      citeste(dialog.fisier, { pxPeTol: dialog.pxPeTol, unitate: dialog.unitate, unitateWmf: dialog.unitateWmf, pagina: dialog.pagina, trasare: dialog.trasare ?? TRASARE_IMPLICITA }, dialog.pxAutomat);
    }
  };
  /** Recitirea cu o alegere schimbată: ce e pe ecran (previzualizarea sau refuzul) rămâne acolo până sosește noul rezultat. */
  const recitesteCu = (schimbare: Partial<AlegeriImport>): void => {
    if (!dialog.fisier) return;
    const a = {
      pxPeTol: dialog.pxPeTol, unitate: dialog.unitate, unitateWmf: dialog.unitateWmf, pagina: dialog.pagina,
      trasare: dialog.trasare ?? TRASARE_IMPLICITA, ...(dialog.imaginePdf ? { imaginePdf: true } : {}), ...schimbare,
    };
    citeste(dialog.fisier, a, dialog.pxAutomat, dialog.stare === 'citire' ? undefined : dialog.stare);
  };
  // Relieful din imagine (ADR 0310 §7): fereastra lui, cu fișierul citit; nu din imaginea de pe foaie (ADR 0272 §7).
  if (rezultat === 'relief' && !dinFoaie && dialog.fisier && esteImagine(dialog.fisier.nume)) {
    const f = dialog.fisier;
    return (
      <FereastraRelief key={`${k}:${f.nume}`} nume={f.nume} octeti={f.octeti} onAlege={alegeRezultat}
        stareImporta={(p) => stareImporta(p, loc)} importa={(p) => importa(p, loc)} onImportat={urmatorul} onInchide={inchide}
        jurnal={(e) => { contextImport(f, ALEGERI, () => undefined).jurnal?.(e); }}
        {...(fisiere.length > 1 ? { coada: { k: k + 1, n: fisiere.length }, onSari: urmatorul } : {})}
        {...(de === undefined ? {} : { de })} />
    );
  }
  return (
    <DialogImport
      nume={dialog.nume}
      stare={dialog.stare}
      pxPeTol={dialog.pxPeTol}
      pxAutomat={dialog.pxAutomat}
      unitate={dialog.unitate}
      unitateWmf={dialog.unitateWmf}
      pagina={dialog.pagina}
      seRecitesc={dialog.seRecitesc === true}
      motiv={stareOk && !stareOk.ok ? stareOk.motiv : null}
      onPx={(px) => { recitesteCu({ pxPeTol: px }); }}
      onUnitate={(u) => { recitesteCu({ unitate: u }); }}
      onUnitateWmf={(u) => { recitesteCu({ unitateWmf: u }); }}
      onPagina={(pagina) => { recitesteCu({ pagina }); }}
      imaginePdf={dialog.imaginePdf === true}
      onImaginePdf={(imaginePdf) => { recitesteCu({ imaginePdf }); }}
      onImporta={() => {
        // Un dublu-clic nu importă de două ori: clicul e un eveniment discret, deci React închide dialogul înaintea
        // celui de-al doilea (otrava care scotea o gardă de aici a scăpat: garda era cod mort; e2e-ul o arată).
        if (!ok || !pregatit || dialog.seRecitesc || imagineInLucru) return;
        if (pastreazaBifat && ok.format === 'imagine' && !dinFoaie) {
          puneImagineaFoii(true);
          return;
        }
        if (importa(pregatit, loc).ok) urmatorul();
      }}
      {...(dinFoaie || !esteImagine(dialog.nume) ? {} : { rezultatImagine: { ales: rezultat, onAlege: alegeRezultat } })}
      {...(dinFoaie ? { dinFoaie: true } : {
        imagineFoaie: {
          pastreaza: pastreazaBifat,
          onPastreaza: (b: boolean) => { pastreazaImaginea = b; setPastreazaBifat(b); },
          onDoarImaginea: () => { puneImagineaFoii(false); },
          lucru: imagineInLucru,
          motiv: motivImagine,
        },
      })}
      onInchide={inchide}
      {...(fisiere.length > 1 ? { coada: { k: k + 1, n: fisiere.length }, onSari: urmatorul } : {})}
      {...(de === undefined ? {} : { de })}
      trasare={{
        alegeri: dialog.trasare ?? TRASARE_IMPLICITA,
        onSchimba: (s) => { recitesteCu({ trasare: { ...(dialog.trasare ?? TRASARE_IMPLICITA), ...s } }); },
        octeti: dialog.fisier?.octeti ?? null,
        ...(freza === undefined ? {} : { freza }),
      }}
    />
  );
}
