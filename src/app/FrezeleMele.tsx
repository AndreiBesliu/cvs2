/**
 * Fereastra „Frezele mele” (ADR 0300 §3, felia 16.A↑a): biblioteca de freze din browser. Lista în stânga (căutarea, felul,
 * grupele, silueta mică, T-ul și valorile), editorul frezei alese în dreapta (felul, geometria cu silueta la scară, valorile
 * de lucru, nota); pe telefon (sub 48 rem), lista, apoi editorul pe tot ecranul. Goală, oferă frezele de pornire și importul.
 *
 * Editorul ține textele scrise (cu virgula sau punctul zecimal); „Salvează” le judecă (`problemeFreza`) și le scrie în
 * bibliotecă. O schimbare nesalvată nu se pierde: plecarea (altă freză, una nouă, închiderea) o salvează dacă e bună, altfel
 * rămâne pe loc și arată câmpurile de reparat. Vine la cerere, cu mesajele ei (`freze`); merge și fără cont, și offline.
 *
 * Cu un cont deschis (felia 16.A↑c), fereastra lucrează pe biblioteca contului din browser și o sincronizează cu contul
 * (`frezeSincronizare.ts`): la deschidere, după fiecare schimbare și la revenirea rețelei. Bara de jos spune unde stă
 * biblioteca; un conflict (aceeași freză schimbată pe două calculatoare) cere alegerea omului, iar la prima deschidere cu
 * contul, frezele din acest browser se pot aduce în cont.
 */
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from 'react';
import '../i18n/freze.ts';
import { mesajeGata } from '../i18n/laCerere.ts';
import { t } from '../i18n/t.ts';
import { citesteFisierFreze, textFisierFreze, type MotivFisierFreze } from '../io/frezeFisier.ts';
import {
  FELURI_FREZA, FREZE_PORNIRE, inaltimeCon, MARGINI_FREZA, numeLiber, problemeFreza, type CampFreza, type FelFreza, type Freza,
  type FrezaFaraNume, type FrezaSalvata, type MotivFreza, type PoliticaImport, type ProblemeFreza,
} from '../model/freza.ts';
import { UNGHI_V_IMPLICIT } from '../model/document.ts';
import { cuFrezeleBrowserului, deAdusDinBrowser, type Alegere } from '../model/frezeSincron.ts';
import { citesteNumar, textNumar } from '../ui/numar.ts';
import { useLimba } from '../ui/useLimba.ts';
import type { Config } from './config.ts';
import { useContTinut } from './dreptCont.ts';
import { CHEIE_LOCALA, cheieCont, frezeMele, useFrezeMele, type ProblemeLista } from './frezeMele.ts';
import { useSincronizare } from './frezeSincronizare.ts';
import './freze.css';

/** Mesajele modulului, ca date (ADR 0086): cine îl încarcă le așteaptă (`cuMesaje`). */
export const mesaje = mesajeGata();
mesaje.catch(() => undefined);

/** Câmpurile editorului, ca text scris de om (felul, separat). */
type Ciorna = { readonly fel: FelFreza } & { readonly [K in Exclude<CampFreza, never>]: string };
const CAMPURI_NUMERE: readonly Exclude<CampFreza, 'nume' | 'nota'>[] = [
  'diametru', 'unghi', 'varf', 'tais', 'taisuri', 'numar', 'turatie', 'avans', 'plonjare', 'pas', 'pasLateral',
];
const OPTIONALE: ReadonlySet<CampFreza> = new Set(['tais', 'taisuri']);
/** Cel mai mare număr al fiecărui câmp, pentru mesajul marginilor. */
const MAXIM: Readonly<Partial<Record<CampFreza, number>>> = {
  diametru: MARGINI_FREZA.diametru, tais: MARGINI_FREZA.tais, taisuri: MARGINI_FREZA.taisuri, numar: MARGINI_FREZA.numar,
  turatie: MARGINI_FREZA.turatie, avans: MARGINI_FREZA.avans, plonjare: MARGINI_FREZA.plonjare, pas: MARGINI_FREZA.pas,
  pasLateral: MARGINI_FREZA.pasLateral,
};

const fara = (x: number | undefined, ro: boolean): string => (x === undefined || !Number.isFinite(x) ? '' : textNumar(x, ro));

/** Numele propus din fel și diametru (ADR 0300 §2), în limba de acum; „?” unde valoarea încă nu e un număr. */
export function numePropus(f: Pick<Freza, 'fel' | 'diametru' | 'unghi' | 'varf'>, ro: boolean): string {
  const n = (x: number | undefined): string => (x !== undefined && Number.isFinite(x) ? textNumar(x, ro) : '?');
  if (f.fel === 'plata') return t('freze.propus.plata', { d: n(f.diametru) });
  if (f.fel === 'v') return t('freze.propus.v', { u: n(f.unghi), d: n(f.diametru) });
  return t('freze.propus.gravare', { u: n(f.unghi), varf: n(f.varf), d: n(f.diametru) });
}

/** Cel mai mic T pe care nicio freză a bibliotecii nu-l are (o freză nouă îl primește). */
function tLiber(lista: readonly FrezaSalvata[]): number {
  const luate = new Set(lista.map((f) => f.numar));
  for (let k = 1; k < MARGINI_FREZA.numar; k++) if (!luate.has(k)) return k;
  return MARGINI_FREZA.numar;
}

function ciornaDin(f: Freza, ro: boolean, numeGol = false): Ciorna {
  return {
    fel: f.fel, nume: numeGol ? '' : f.nume, nota: f.nota ?? '',
    diametru: fara(f.diametru, ro), unghi: fara(f.unghi ?? UNGHI_V_IMPLICIT, ro), varf: fara(f.varf, ro), tais: fara(f.tais, ro),
    taisuri: fara(f.taisuri, ro), numar: fara(f.numar, ro), turatie: fara(f.turatie, ro), avans: fara(f.avans, ro),
    plonjare: fara(f.plonjare, ro), pas: fara(f.pas, ro), pasLateral: fara(f.pasLateral, ro),
  };
}

/** Freza din textele editorului: un câmp opțional gol pleacă, un număr greșit e NaN (îl spune judecata). */
function frezaDin(c: Ciorna, ro: boolean): Freza {
  const v: Record<string, unknown> = { fel: c.fel, nota: c.nota.trim() === '' ? undefined : c.nota.trim() };
  for (const k of CAMPURI_NUMERE) {
    const s = c[k].trim();
    v[k] = s === '' ? (OPTIONALE.has(k) ? undefined : Number.NaN) : (citesteNumar(s) ?? Number.NaN);
  }
  if (c.fel === 'plata') { v['unghi'] = undefined; v['varf'] = undefined; }
  if (c.fel === 'v') v['varf'] = undefined;
  const f = v as FrezaFaraNume;
  return { ...f, nume: c.nume.trim() === '' ? numePropus(f, ro) : c.nume };
}

function ciornaNoua(lista: readonly FrezaSalvata[], ro: boolean): Ciorna {
  return ciornaDin({ ...FREZE_PORNIRE[1]!, numar: tLiber(lista), nume: '' }, ro, true);
}

/** Silueta frezei la scară (profilul h(r) oglindit, cu coada deasupra), sau nimic dacă valorile nu sunt încă bune. */
function Silueta({ f, mare }: { readonly f: Freza; readonly mare: boolean }): ReactNode {
  const R = f.diametru / 2;
  const a = f.fel === 'gravare' && f.varf !== undefined ? Math.min(f.varf / 2, R) : 0;
  const con = inaltimeCon(f);
  const L = Math.max(f.tais ?? 0, con, f.fel === 'plata' ? f.diametru * 2 : 0);
  if (!(R > 0) || !Number.isFinite(L) || !(L > 0)) return <svg className="freza-silueta" viewBox="0 0 40 40" aria-hidden="true" />;
  const W = mare ? 200 : 40, H = mare ? 220 : 40, m = mare ? 30 : 3;
  const sus = L * 1.35;
  const k = Math.min((W - 2 * m) / (2 * R), (H - 2 * m) / sus);
  const X = (r: number): number => W / 2 + r * k, Y = (h: number): number => H - m - h * k;
  const puncte: readonly (readonly [number, number])[] = f.fel === 'plata'
    ? [[-R, 0], [R, 0], [R, L], [-R, L]] : [[-a, 0], [a, 0], [R, con], [R, L], [-R, L], [-R, con]];
  const coada = R * 0.82;
  return (
    <svg className="freza-silueta" viewBox={`0 0 ${W} ${H}`} role={mare ? 'img' : undefined} aria-label={mare ? t('freze.silueta') : undefined}
      aria-hidden={mare ? undefined : true}>
      <rect className="coada" x={X(-coada)} y={Y(sus)} width={2 * coada * k} height={(sus - L) * k} />
      <polygon className="tais" points={puncte.map(([x, y]) => `${X(x).toFixed(2)},${Y(y).toFixed(2)}`).join(' ')} />
      {mare ? (
        <>
          <line className="cota" x1={X(-R)} y1={Y(sus) - 10} x2={X(R)} y2={Y(sus) - 10} />
          <text className="cota-text" x={W / 2} y={Y(sus) - 14} textAnchor="middle">Ø{textNumar(f.diametru)}</text>
          {f.fel !== 'plata' && f.unghi !== undefined ? (
            <text className="cota-text" x={W / 2} y={Y(0) + 16} textAnchor="middle">{`${textNumar(f.unghi)}°`}</text>
          ) : null}
        </>
      ) : null}
    </svg>
  );
}

/** Numele unui câmp al frezei, pentru conflict (un câmp necunoscut, al unei versiuni mai noi, cu numele lui din date). */
function numeCamp(k: string): string {
  switch (k) {
    case 'nume': return t('freze.nume');
    case 'fel': return t('freze.felul');
    case 'diametru': return t('freze.diametru');
    case 'unghi': return t('freze.unghi');
    case 'varf': return t('freze.varf');
    case 'tais': return t('freze.tais');
    case 'taisuri': return t('freze.taisuri');
    case 'numar': return t('freze.numar');
    case 'turatie': return t('freze.turatie');
    case 'avans': return t('freze.avans');
    case 'plonjare': return t('freze.plonjare');
    case 'pas': return t('freze.pas');
    case 'pasLateral': return t('freze.pas-lateral');
    case 'nota': return t('freze.nota');
    default: return k;
  }
}

/** Conturile care au spus „Nu acum” la frezele din browser, în fila asta (întrebarea revine la reîncărcare). */
const amanate = new Set<string>();

const MOTIV_IMPORT: Readonly<Record<MotivFisierFreze, () => string>> = {
  gol: () => t('freze.import.motiv.gol'),
  json: () => t('freze.import.motiv.json'),
  format: () => t('freze.import.motiv.format'),
  versiune: () => t('freze.import.motiv.versiune'),
  coloane: () => t('freze.import.motiv.coloane'),
  'prea-mare': () => t('freze.import.motiv.prea-mare'),
  'prea-multe': () => t('freze.import.motiv.prea-multe', { max: MARGINI_FREZA.freze }),
};

export function FrezeleMele({ onInchide, focusInapoi, config }: {
  readonly onInchide: () => void;
  /** Unde era focusul înainte: acolo se întoarce la închidere. */
  readonly focusInapoi: Element | null;
  /** Configurația aplicației (legătura cu contul); fără ea, biblioteca rămâne doar în browser. */
  readonly config: Config | null;
}): ReactNode {
  const limba = useLimba();
  const ro = limba === 'ro';
  const cont = useContTinut();
  // Biblioteca contului doar cu contul deschis pe server (adresa confirmată); altfel, cea fără cont.
  const uid = cont?.drept ? cont.uid : null;
  const cheie = uid ? cheieCont(uid) : CHEIE_LOCALA;
  const biblioteca = frezeMele(cheie);
  const stare = useFrezeMele(cheie);
  const locala = useFrezeMele(CHEIE_LOCALA);
  const sincronizare = useSincronizare(cheie, uid, config);
  const [amanat, setAmanat] = useState(() => uid !== null && amanate.has(uid));
  const [cauta, setCauta] = useState('');
  const [filtru, setFiltru] = useState<FelFreza | 'toate'>('toate');
  /** Freza din editor: id-ul ei, `nou` pentru una nouă, sau nimic. */
  const [aleasa, setAleasa] = useState<string | null>(null);
  const [ciorna, setCiorna] = useState<Ciorna | null>(null);
  const [initiala, setInitiala] = useState<Ciorna | null>(null);
  const [toateProblemele, setToateProblemele] = useState(false);
  const [pas, setPas] = useState<'lista' | 'editor'>('lista');
  const [mesaj, setMesaj] = useState('');
  const [stergere, setStergere] = useState(false);
  const [importat, setImportat] = useState<{ readonly freze: readonly Freza[]; readonly sarite: number; readonly politica: PoliticaImport } | null>(null);
  const refCauta = useRef<HTMLInputElement>(null);
  const refFisier = useRef<HTMLInputElement>(null);
  const refEditor = useRef<HTMLFormElement>(null);

  useEffect(() => {
    refCauta.current?.focus();
    return () => { if (focusInapoi instanceof HTMLElement) focusInapoi.focus(); };
  }, [focusInapoi]);
  // Altă bibliotecă (intrarea în cont sau ieșirea, cât fereastra e deschisă): editorul se închide.
  useEffect(() => {
    void frezeMele(cheie).incarca();
    if (cheie !== CHEIE_LOCALA) void frezeMele(CHEIE_LOCALA).incarca();
    setAleasa(null);
    setCiorna(null);
    setInitiala(null);
    setPas('lista');
    setAmanat(uid !== null && amanate.has(uid));
  }, [cheie, uid]);

  const doarCitire = !stare.scriere;
  const freza = useMemo(() => (ciorna ? frezaDin(ciorna, ro) : null), [ciorna, ro]);
  const idEditor = aleasa === 'nou' ? null : aleasa;
  const probleme: ProblemeFreza = freza ? problemeFreza(freza, stare.freze, idEditor) : {};
  const schimbata = ciorna !== null && initiala !== null && JSON.stringify(ciorna) !== JSON.stringify(initiala);

  // O schimbare venită din cont (sau din altă filă) pe freza din editor, nesalvată aici: editorul o arată; ștearsă, se închide.
  useEffect(() => {
    if (aleasa === null || aleasa === 'nou' || schimbata) return;
    const f = stare.freze.find((x) => x.id === aleasa);
    if (!f) { setAleasa(null); setCiorna(null); setInitiala(null); setPas('lista'); return; }
    const c = ciornaDin(f, ro);
    if (JSON.stringify(c) !== JSON.stringify(initiala)) { setCiorna(c); setInitiala(c); }
  }, [stare.freze, aleasa, schimbata, initiala, ro]);

  const deschide = (id: string | 'nou' | null, c: Ciorna | null): void => {
    setAleasa(id);
    setCiorna(c);
    setInitiala(c);
    setToateProblemele(false);
    setStergere(false);
    setPas(id === null ? 'lista' : 'editor');
  };
  const motivLista = (p: ProblemeLista): string => {
    if ('lista' in p) return p.lista === 'plina' ? t('freze.motiv.plina', { max: MARGINI_FREZA.freze }) : t('freze.motiv.versiune');
    if ('id' in p) return t('freze.motiv.lipsa-freza');
    return t('freze.motiv.campuri');
  };

  /** Salvează editorul; întoarce id-ul frezei salvate, sau null (atunci câmpurile de reparat sunt la vedere). */
  const salveaza = async (): Promise<string | null> => {
    if (!freza || doarCitire) return null;
    if (Object.keys(probleme).length > 0) {
      setToateProblemele(true);
      setMesaj(t('freze.motiv.campuri'));
      refEditor.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return null;
    }
    const r = await biblioteca.salveaza(idEditor, freza);
    if (!r.ok) {
      setToateProblemele(true);
      setMesaj(motivLista(r.probleme));
      return null;
    }
    const salvata = biblioteca.stare().freze.find((f) => f.id === r.id);
    if (salvata) {
      const c = ciornaDin(salvata, ro);
      setAleasa(r.id);
      setCiorna(c);
      setInitiala(c);
      setToateProblemele(false);
    }
    setMesaj(t('freze.stare.salvat'));
    sincronizare.programeaza();
    return r.id;
  };
  /** Plecarea din editor: fără schimbări, direct; cu schimbări bune, după salvare; cu schimbări greșite, deloc. */
  const pleaca = (apoi: () => void): void => {
    if (!schimbata || doarCitire) { apoi(); return; }
    void salveaza().then((id) => { if (id !== null) apoi(); });
  };

  const alege = (f: FrezaSalvata): void => {
    if (f.id === aleasa) { setPas('editor'); return; }
    pleaca(() => { deschide(f.id, ciornaDin(f, ro)); setMesaj(''); });
  };
  const noua = (): void => {
    pleaca(() => { deschide('nou', ciornaNoua(biblioteca.stare().freze, ro)); setMesaj(''); });
  };
  const inchide = (): void => { pleaca(onInchide); };
  const renunta = (): void => {
    if (aleasa === 'nou') deschide(null, null);
    else { setCiorna(initiala); setToateProblemele(false); }
    setMesaj('');
  };
  const duplica = (): void => {
    const f = stare.freze.find((x) => x.id === aleasa);
    if (!f) return;
    void biblioteca.salveaza(null, { ...f, nume: numeLiber(t('freze.copie', { nume: f.nume }), stare.freze) }).then((r) => {
      if (!r.ok) { setMesaj(motivLista(r.probleme)); return; }
      const s = biblioteca.stare().freze.find((x) => x.id === r.id);
      if (s) deschide(s.id, ciornaDin(s, ro));
      setMesaj(t('freze.stare.salvat'));
      sincronizare.programeaza();
    });
  };
  const sterge = (): void => {
    if (!aleasa || aleasa === 'nou') return;
    void biblioteca.sterge(aleasa).then((r) => {
      if (!r.ok) { setMesaj(motivLista(r.probleme)); return; }
      deschide(null, null);
      setMesaj(t('freze.stare.sters'));
      sincronizare.programeaza();
      refCauta.current?.focus();
    });
  };
  const pornire = (): void => {
    const freze = FREZE_PORNIRE.map((f) => ({ ...f, nume: numePropus(f, ro) }));
    void biblioteca.adaugaToate(freze).then((r) => {
      setMesaj(r.ok ? t('freze.import.rezultat', { adaugate: r.adaugate, inlocuite: r.inlocuite, sarite: r.sarite }) : motivLista(r.probleme));
      if (r.ok) sincronizare.programeaza();
    });
  };
  const exporta = (): void => {
    const url = URL.createObjectURL(new Blob([textFisierFreze(stare.freze)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'frezele-mele.cvs2freze.json';
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); }, 10_000);
  };
  const fisierAles = (e: ChangeEvent<HTMLInputElement>): void => {
    const fisier = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (!fisier) return;
    void fisier.arrayBuffer().then((b) => {
      const r = citesteFisierFreze(new Uint8Array(b));
      if (!r.ok) { setImportat(null); setMesaj(MOTIV_IMPORT[r.motiv]()); return; }
      setImportat({ freze: r.freze, sarite: r.sarite, politica: 'amandoua' });
      setMesaj('');
    }, () => { setMesaj(t('freze.import.motiv.citire')); });
  };
  const importa = (): void => {
    if (!importat) return;
    void biblioteca.importa(importat.freze, importat.politica).then((r) => {
      setImportat(null);
      setMesaj(r.ok ? t('freze.import.rezultat', { adaugate: r.adaugate, inlocuite: r.inlocuite, sarite: r.sarite + importat.sarite }) : motivLista(r.probleme));
      if (r.ok) sincronizare.programeaza();
    });
  };
  /** Conflictul unei freze, la alegerea omului; editorul ei se închide (arată apoi ce a rămas). */
  const rezolva = (id: string, alegere: Alegere): void => {
    if (aleasa === id) deschide(null, null);
    void sincronizare.rezolva(id, alegere);
  };
  /** Frezele din acest browser, aduse în cont (prima deschidere cu contul). */
  const aduDinBrowser = (): void => {
    const locale = locala.freze;
    let adaugate = 0;
    void biblioteca.schimbaCont((c) => {
      const r = cuFrezeleBrowserului(c, locale, MARGINI_FREZA.freze);
      adaugate = r.adaugate;
      return r.adaugate > 0 ? r.b : null;
    }).then(() => {
      setMesaj(t('freze.aduse.rezultat', { n: adaugate }));
      sincronizare.programeaza();
    });
  };
  const amana = (): void => {
    if (uid !== null) amanate.add(uid);
    setAmanat(true);
  };
  const tasta = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    if (stergere) setStergere(false);
    else if (importat) setImportat(null);
    else inchide();
  };

  const scrie = (k: Exclude<CampFreza, never>) => (e: ChangeEvent<HTMLInputElement>): void => {
    const v = e.currentTarget.value;
    setCiorna((c) => (c ? { ...c, [k]: v } : c));
    setMesaj('');
  };
  const vizibila = (k: CampFreza): boolean => !!probleme[k] && (toateProblemele || (ciorna !== null && initiala !== null && ciorna[k] !== initiala[k]));
  const textMotiv = (k: CampFreza, m: MotivFreza): string => {
    switch (m) {
      case 'lipsa': return t('freze.motiv.lipsa');
      case 'intreg': return t('freze.motiv.intreg');
      case 'varf': return t('freze.motiv.varf');
      case 'con': return t('freze.motiv.con', { con: textNumar(Math.ceil(inaltimeCon(freza!) * 1000) / 1000, ro) });
      case 'nume-gol': return t('freze.motiv.lipsa');
      case 'nume-lung': return t('freze.motiv.nume-lung', { max: MARGINI_FREZA.nume });
      case 'nume-caractere': return t('freze.motiv.nume-caractere');
      case 'nume-folosit': return t('freze.motiv.nume-folosit');
      case 'nota-lunga': return t('freze.motiv.nota-lunga', { max: MARGINI_FREZA.nota });
      case 'margini':
        if (k === 'unghi') return t('freze.motiv.unghi', { min: MARGINI_FREZA.unghiMinim, max: MARGINI_FREZA.unghiMaxim });
        if (k === 'varf') return t('freze.motiv.pozitiv');
        return t('freze.motiv.margini', { max: textNumar(MAXIM[k] ?? 0, ro) });
    }
  };
  const camp = (k: Exclude<CampFreza, 'nume' | 'nota'>, eticheta: string, unitate: string | null): ReactNode => {
    const p = vizibila(k) ? probleme[k] : undefined;
    return (
      <label className="freze-camp" key={k}>
        <span>{eticheta}</span>
        <span className="freze-unitate">
          <input type="text" inputMode="decimal" data-freze-camp={k} value={ciorna?.[k] ?? ''} disabled={doarCitire}
            aria-invalid={p ? true : undefined} aria-describedby={p ? `freze-eroare-${k}` : undefined} onChange={scrie(k)} />
          {unitate ? <span>{unitate}</span> : null}
        </span>
        {p ? <small className="freze-eroare" id={`freze-eroare-${k}`}>{textMotiv(k, p)}</small> : null}
      </label>
    );
  };

  const q = cauta.trim().toLocaleLowerCase(limba);
  const vazute = stare.freze.filter((f) => (filtru === 'toate' || f.fel === filtru) && (q === '' || f.nume.toLocaleLowerCase(limba).includes(q)));
  const fel = ciorna?.fel ?? 'plata';
  const pNume = vizibila('nume') ? probleme.nume : undefined;
  const pNota = vizibila('nota') ? probleme.nota : undefined;
  const nr = (x: number): string => textNumar(x, ro);
  const conflicte = [...stare.sincron.conflicte];
  const legatura = sincronizare.stare;
  /** Unde stă biblioteca și ce face legătura cu contul (felul pastilei: obișnuit sau „atenție”). */
  const [stareText, stareFel] = ((): [string, 'incarca' | 'atentie' | 'browser'] => {
    if (!stare.incarcata) return [t('freze.incarca'), 'incarca'];
    if (doarCitire) return [t('freze.stare.versiune'), 'atentie'];
    if (!stare.pastrate) return [t('freze.stare.memorie'), 'atentie'];
    if (uid === null) return [t('freze.stare.browser'), 'browser'];
    if (conflicte.length > 0) return [t('freze.loc.conflict', { n: conflicte.length }), 'atentie'];
    if (legatura.ruleaza || legatura.ultima === null) return [t('freze.loc.sincronizeaza'), 'browser'];
    if (legatura.ultima !== 'la-zi') return [t(`freze.loc.${legatura.ultima}`), 'atentie'];
    if (stare.sincron.plina.length > 0) return [t('freze.loc.plina', { n: stare.sincron.plina.length, max: MARGINI_FREZA.freze }), 'atentie'];
    return [t('freze.loc.la-zi'), 'browser'];
  })();
  const deAdus = uid !== null && locala.incarcata && stare.incarcata && !amanat
    ? deAdusDinBrowser({ freze: stare.freze, brute: [], sincron: stare.sincron }, locala.freze).length : 0;
  const conflict = conflicte[0];
  const numeConflict = ((): string => {
    if (!conflict) return '';
    const aici = stare.freze.find((f) => f.id === conflict[0]);
    if (aici) return aici.nume;
    try {
      const x: unknown = JSON.parse(conflict[1].json ?? 'null');
      return typeof x === 'object' && x !== null && typeof (x as { nume?: unknown }).nume === 'string' ? (x as { nume: string }).nume : '';
    } catch {
      return '';
    }
  })();

  return (
    <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="freze-titlu" data-testid="dialog-freze" onKeyDown={tasta}>
      <div className="dialog-cutie dialog-freze">
        <div className="freze-cap">
          <h2 id="freze-titlu">{t('vedere.freze')}</h2>
          <button type="button" className="freze-inchide" data-freze="inchide" aria-label={t('freze.inchide')} onClick={inchide}>✕</button>
        </div>
        <p className="freze-intro">{uid === null ? t('freze.intro') : t('freze.intro.cont')}</p>
        {conflict ? (
          <div className="freze-banda" role="group" aria-labelledby="freze-conflict-text" data-freze="conflict" data-freza={conflict[0]}>
            <p id="freze-conflict-text">
              {conflict[1].campuri.includes('*')
                ? t('freze.conflict.sters', { nume: numeConflict })
                : t('freze.conflict.campuri', { nume: numeConflict, campuri: conflict[1].campuri.map(numeCamp).join(', ') })}
            </p>
            <div className="butoane">
              <button type="button" data-freze="conflict-mea" onClick={() => { rezolva(conflict[0], 'mea'); }}>{t('freze.conflict.mea')}</button>
              <button type="button" data-freze="conflict-cont" onClick={() => { rezolva(conflict[0], 'cont'); }}>{t('freze.conflict.cont')}</button>
              <button type="button" data-freze="conflict-amandoua" onClick={() => { rezolva(conflict[0], 'amandoua'); }}>{t('freze.conflict.amandoua')}</button>
            </div>
          </div>
        ) : null}
        {deAdus > 0 && !doarCitire ? (
          <div className="freze-banda" role="group" aria-labelledby="freze-aduse-text" data-freze="aduse">
            <p id="freze-aduse-text">{t('freze.aduse.intrebare', { n: deAdus })}</p>
            <div className="butoane">
              <button type="button" className="principal" data-freze="aduse-da" onClick={aduDinBrowser}>{t('freze.aduse.da')}</button>
              <button type="button" data-freze="aduse-nu" onClick={amana}>{t('freze.aduse.nu')}</button>
            </div>
          </div>
        ) : null}
        <div className="freze-unelte" data-pas={pas}>
          <input ref={refCauta} type="search" className="freze-cauta" data-freze="cauta" placeholder={t('freze.cauta')} aria-label={t('freze.cauta')}
            value={cauta} onChange={(e) => { setCauta(e.currentTarget.value); }} />
          <div className="freze-filtre" role="group" aria-label={t('freze.filtre')}>
            {(['toate', ...FELURI_FREZA] as const).map((x) => (
              <button key={x} type="button" data-freze-filtru={x} aria-pressed={filtru === x} onClick={() => { setFiltru(x); }}>
                {x === 'toate' ? t('freze.filtru.toate') : t(`freze.grupa.${x}`)}
              </button>
            ))}
          </div>
          <span className="freze-actiuni">
            <button type="button" className="principal" data-freze="noua" disabled={doarCitire} onClick={noua}>{t('freze.noua')}</button>
            <button type="button" data-freze="importa" disabled={doarCitire} onClick={() => { refFisier.current?.click(); }}>{t('freze.importa')}</button>
            <button type="button" data-freze="exporta" disabled={stare.freze.length === 0} onClick={exporta}>{t('freze.exporta')}</button>
          </span>
          <input ref={refFisier} type="file" hidden accept=".json,.csv,.txt,application/json,text/csv" data-freze="fisier" onChange={fisierAles} />
        </div>
        {importat ? (
          <div className="freze-import" role="group" aria-labelledby="freze-import-titlu" data-freze="import">
            <h3 id="freze-import-titlu">{t('freze.import.titlu')}</h3>
            <p>{t('freze.import.cate', { n: importat.freze.length })}{importat.sarite > 0 ? ` ${t('freze.import.sarite', { n: importat.sarite })}` : ''}</p>
            <fieldset>
              <legend>{t('freze.import.politica')}</legend>
              {(['amandoua', 'inlocuieste', 'sari'] as const).map((x) => (
                <label key={x}>
                  <input type="radio" name="freze-politica" value={x} checked={importat.politica === x}
                    onChange={() => { setImportat({ ...importat, politica: x }); }} />
                  <span>{t(`freze.import.${x}`)}</span>
                </label>
              ))}
            </fieldset>
            <div className="butoane">
              <button type="button" data-freze="import-confirma" disabled={importat.freze.length === 0} onClick={importa}>{t('freze.import.confirma')}</button>
              <button type="button" data-buton="renunta" onClick={() => { setImportat(null); }}>{t('freze.import.renunta')}</button>
            </div>
          </div>
        ) : null}
        <div className="freze-corp" data-pas={pas}>
          <div className="freze-lista" role="region" aria-label={t('freze.lista')}>
            {!stare.incarcata ? <p className="freze-gol">{t('freze.incarca')}</p> : null}
            {stare.incarcata && stare.freze.length === 0 ? (
              <div className="freze-gol">
                <p><strong>{t('freze.goala')}</strong></p>
                <p>{t('freze.goala.nota')}</p>
                <button type="button" className="principal" data-freze="pornire" disabled={doarCitire} onClick={pornire}>{t('freze.pornire')}</button>
              </div>
            ) : null}
            {stare.freze.length > 0 && vazute.length === 0 ? <p className="freze-gol">{t('freze.niciuna-gasita')}</p> : null}
            {FELURI_FREZA.map((g) => {
              const din = vazute.filter((f) => f.fel === g);
              if (din.length === 0) return null;
              return (
                <section key={g} className="freze-grupa" aria-labelledby={`freze-grupa-${g}`}>
                  <h3 id={`freze-grupa-${g}`}>{t('freze.grupa', { fel: t(`freze.grupa.${g}`), n: din.length })}</h3>
                  <ul>
                    {din.map((f) => (
                      <li key={f.id}>
                        <button type="button" className="freze-rand" data-freza={f.id} aria-current={f.id === aleasa ? 'true' : undefined}
                          onClick={() => { alege(f); }}>
                          <Silueta f={f} mare={false} />
                          <span className="freze-rand-text">
                            <span className="freze-rand-nume">{f.nume}</span>
                            <span className="freze-rand-detalii">{t('freze.rand', { t: f.numar, turatie: nr(f.turatie), avans: nr(f.avans) })}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
          {ciorna && freza ? (
            <form ref={refEditor} className="freze-editor" aria-labelledby="freze-editor-titlu" noValidate
              onSubmit={(e) => { e.preventDefault(); void salveaza(); }}>
              <button type="button" className="freze-inapoi" data-freze="inapoi" onClick={() => { pleaca(() => { setPas('lista'); }); }}>← {t('freze.inapoi')}</button>
              <h3 id="freze-editor-titlu">{aleasa === 'nou' ? t('freze.noua.titlu') : freza.nume}</h3>
              <div className="freze-editor-sus">
                <div className="freze-editor-campuri">
                  <label className="freze-camp freze-camp-lat">
                    <span>{t('freze.nume')}</span>
                    <input type="text" data-freze-camp="nume" value={ciorna.nume} placeholder={numePropus(freza, ro)} disabled={doarCitire}
                      aria-invalid={pNume ? true : undefined} aria-describedby={pNume ? 'freze-eroare-nume' : 'freze-nume-ajutor'}
                      onChange={scrie('nume')} />
                    {pNume ? <small className="freze-eroare" id="freze-eroare-nume">{textMotiv('nume', pNume)}</small>
                      : <small className="freze-ajutor" id="freze-nume-ajutor">{t('freze.nume.ajutor', { nume: numePropus(freza, ro) })}</small>}
                  </label>
                  <div className="freze-camp freze-camp-lat" role="radiogroup" aria-labelledby="freze-felul">
                    <span id="freze-felul">{t('freze.felul')}</span>
                    <span className="freze-feluri">
                      {FELURI_FREZA.map((x) => (
                        <button key={x} type="button" role="radio" aria-checked={fel === x} data-freze-fel={x} disabled={doarCitire}
                          onClick={() => {
                            setCiorna((c) => (c ? { ...c, fel: x, varf: x === 'gravare' && c.varf.trim() === '' ? textNumar(0.2, ro) : c.varf } : c));
                          }}>
                          {t(`freze.fel.${x}`)}
                        </button>
                      ))}
                    </span>
                  </div>
                </div>
                <figure className="freze-silueta-mare">
                  <Silueta f={freza} mare />
                </figure>
              </div>
              <fieldset>
                <legend>{t('freze.geometria')}</legend>
                <div className="freze-grila">
                  {camp('diametru', t('freze.diametru'), t('freze.unitate.mm'))}
                  {fel !== 'plata' ? camp('unghi', t('freze.unghi'), t('freze.unitate.grade')) : null}
                  {fel === 'gravare' ? camp('varf', t('freze.varf'), t('freze.unitate.mm')) : null}
                  {camp('tais', t('freze.tais'), t('freze.unitate.mm'))}
                  {camp('taisuri', t('freze.taisuri'), null)}
                  {camp('numar', t('freze.numar'), null)}
                </div>
              </fieldset>
              <fieldset>
                <legend>{t('freze.lucru')}</legend>
                <div className="freze-grila">
                  {camp('turatie', t('freze.turatie'), t('freze.unitate.rpm'))}
                  {camp('avans', t('freze.avans'), t('freze.unitate.mm-min'))}
                  {camp('plonjare', t('freze.plonjare'), t('freze.unitate.mm-min'))}
                  {camp('pas', t('freze.pas'), t('freze.unitate.mm'))}
                  {camp('pasLateral', t('freze.pas-lateral'), t('freze.unitate.procent'))}
                </div>
                <p className="freze-ajutor">{t('freze.lucru.nota')}</p>
              </fieldset>
              <label className="freze-camp freze-camp-lat">
                <span>{t('freze.nota')}</span>
                <input type="text" data-freze-camp="nota" value={ciorna.nota} placeholder={t('freze.nota.ajutor')} disabled={doarCitire}
                  aria-invalid={pNota ? true : undefined} aria-describedby={pNota ? 'freze-eroare-nota' : undefined} onChange={scrie('nota')} />
                {pNota ? <small className="freze-eroare" id="freze-eroare-nota">{textMotiv('nota', pNota)}</small> : null}
              </label>
              {stergere ? (
                <div className="freze-stergere" role="group" aria-label={t('freze.sterge.intrebare', { nume: freza.nume })}>
                  <p>{t('freze.sterge.intrebare', { nume: freza.nume })}</p>
                  <div className="butoane">
                    <button type="button" data-freze="sterge-da" className="pericol" onClick={sterge}>{t('freze.sterge.da')}</button>
                    <button type="button" data-buton="renunta" onClick={() => { setStergere(false); }}>{t('freze.sterge.nu')}</button>
                  </div>
                </div>
              ) : null}
              <div className="butoane freze-butoane">
                <button type="submit" data-freze="salveaza" disabled={doarCitire || (!schimbata && aleasa !== 'nou')}>{t('freze.salveaza')}</button>
                <button type="button" data-buton="renunta" data-freze="renunta" disabled={!schimbata && aleasa !== 'nou'} onClick={renunta}>{t('freze.renunta')}</button>
                {aleasa !== 'nou' ? (
                  <>
                    <button type="button" data-freze="duplica" disabled={doarCitire} onClick={duplica}>{t('freze.duplica')}</button>
                    <button type="button" data-freze="sterge" disabled={doarCitire} onClick={() => { setStergere(true); }}>{t('freze.sterge')}</button>
                  </>
                ) : null}
              </div>
            </form>
          ) : (
            <p className="freze-editor freze-gol">{t('freze.alege')}</p>
          )}
        </div>
        <div className="freze-jos">
          <span className="freze-stare" data-freze="stare">
            <span className="freze-pastila" data-stare={stareFel}>{stareText}</span>
            {stare.incarcata ? <span>{t('freze.stare.cate', { n: stare.freze.length })}</span> : null}
            {stare.necitite > 0 ? <span>{t('freze.stare.necitite', { n: stare.necitite })}</span> : null}
            {uid !== null && stare.incarcata && !legatura.ruleaza ? (
              <button type="button" className="freze-sincronizeaza" data-freze="sincronizeaza" onClick={sincronizare.acum}>{t('freze.sincronizeaza')}</button>
            ) : null}
          </span>
          <span className="freze-mesaj" role="status" data-freze="mesaj">{mesaj}</span>
        </div>
      </div>
    </div>
  );
}
