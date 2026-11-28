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
 *
 * Din 16.A↑h-1 (ADR 0302 §3), fereastra pornește ca listă: freza aleasă își arată în dreapta fișa, doar de citit (felul,
 * silueta, geometria, valorile de lucru, nota), cu „Editează”, „Duplică”, „Șterge”; editorul („configuratorul”) se deschide la
 * „Editează” și la „Freză nouă”, iar „Salvează” și „Renunță” întorc la fișă. Comutatorul „Listă / Configurator” (ținut în
 * browser, `cncvs2.freze.vedere`) ține editorul mereu deschis, ca înainte de listă.
 */
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import '../i18n/freze.ts';
import { mesajeGata } from '../i18n/laCerere.ts';
import { t } from '../i18n/t.ts';
import { citesteFisierFreze, textFisierFreze, type MotivFisierFreze } from '../io/frezeFisier.ts';
import {
  areCam, arePuncte, areRaza, areTreapta, areUnghi, areVarf, cheieNume, FELURI_FREZA, FREZE_PORNIRE, grupurileListei, inaltimeCon, MARGINI_FREZA, numeLiber, problemeFreza, type CampFreza, type FelFreza,
  problemaMateriale, problemaPuncte, puncteDesenate, type Freza, type FrezaFaraNume, type FrezaSalvata, type MotivFreza, type PoliticaImport, type ProblemeFreza,
} from '../model/freza.ts';
import { CATALOG_FREZE, GRUPURI_CATALOG, tolFreza, type FrezaCatalog } from '../model/catalogFreze.ts';
import { aceeasiGeometrie } from '../model/dinCatalog.ts';
import { FELURI_PROFIL, profilFreza } from '../model/profilFreza.ts';
import { PLAFON, UNGHI_V_IMPLICIT } from '../model/document.ts';
import { cuFrezeleBrowserului, deAdusDinBrowser, type Alegere } from '../model/frezeSincron.ts';
import { citesteNumar, textNumar } from '../ui/numar.ts';
import { useLimba } from '../ui/useLimba.ts';
import type { Config } from './config.ts';
import { useContTinut } from './dreptCont.ts';
import { CHEIE_LOCALA, cheieCont, frezeMele, useFrezeMele, type ProblemeLista } from './frezeMele.ts';
import { useSincronizare } from './frezeSincronizare.ts';
import { cuFrezeleStandard, frezeleStandard, numePropus } from './frezeStandard.ts';
import { EditorPuncte, PuncteFisa, type PunctText, type SursaSilueta } from './SiluetaDesenata.tsx';
import { EditorMateriale, etichetaSet, MaterialeFisa, seturiNumere, seturiText, type SetText } from './MaterialeFreza.tsx';
import './freze.css';

/** Mesajele modulului, ca date (ADR 0086): cine îl încarcă le așteaptă (`cuMesaje`). */
export const mesaje = mesajeGata();
mesaje.catch(() => undefined);

/** Câmpurile editorului, ca text scris de om (felul și punctele siluetei desenate, separat). */
type Ciorna = { readonly fel: FelFreza; readonly puncte: readonly PunctText[]; readonly materiale: readonly SetText[] }
  & { readonly [K in Exclude<CampFreza, 'puncte' | 'materiale'>]: string };
type CampText = 'nume' | 'nota' | 'grup';
const CAMPURI_NUMERE: readonly Exclude<CampFreza, CampText | 'puncte' | 'materiale'>[] = [
  'diametru', 'unghi', 'varf', 'raza', 'treapta', 'tais', 'taisuri', 'numar', 'turatie', 'avans', 'plonjare', 'pas', 'pasLateral',
];
const OPTIONALE: ReadonlySet<CampFreza> = new Set(['tais', 'taisuri', 'raza', 'treapta']);
/** Cel mai mare număr al fiecărui câmp, pentru mesajul marginilor. */
const MAXIM: Readonly<Partial<Record<CampFreza, number>>> = {
  diametru: MARGINI_FREZA.diametru, tais: MARGINI_FREZA.tais, taisuri: MARGINI_FREZA.taisuri, numar: MARGINI_FREZA.numar,
  turatie: MARGINI_FREZA.turatie, avans: MARGINI_FREZA.avans, plonjare: MARGINI_FREZA.plonjare, pas: MARGINI_FREZA.pas,
  pasLateral: MARGINI_FREZA.pasLateral,
};

const fara = (x: number | undefined, ro: boolean): string => (x === undefined || !Number.isFinite(x) ? '' : textNumar(x, ro));

/** O freză a catalogului, cu numele propus în limba de acum și nota țolilor. */
type CatalogCuNume = { readonly c: FrezaCatalog; readonly nume: string; readonly tol: string | undefined };

/** Selectorul lui „✎” de pe titlul grupului dat (după redenumire sau renunțare, focusul revine acolo). */
const focusRedenumire = (grup: string): string => `[data-freze-grup="${CSS.escape(grup)}"] [data-freze="grup-redenumeste"]`;

/** Valoarea opțiunii „Grup nou…” din lista „Grupul” a fișei (un grup nu poate avea caractere de control, deci nu se ciocnește). */
const NOU = '\u0000nou';

/** Vederea ferestrei (ADR 0302 §3): lista cu fișa doar de citit, sau editorul mereu deschis. */
type Vedere = 'lista' | 'configurator';
const CHEIE_VEDERE = 'cncvs2.freze.vedere';
function vedereTinuta(): Vedere {
  try {
    return localStorage.getItem(CHEIE_VEDERE) === 'configurator' ? 'configurator' : 'lista';
  } catch {
    return 'lista';
  }
}
function tineVedere(v: Vedere): void {
  try {
    localStorage.setItem(CHEIE_VEDERE, v);
  } catch {
    // Fără stocare (fereastră privată, date blocate): vederea ține doar cât e deschisă pagina.
  }
}


/** Cel mai mic T pe care nicio freză a bibliotecii nu-l are (o freză nouă îl primește). */
function tLiber(lista: readonly FrezaSalvata[]): number {
  const luate = new Set(lista.map((f) => f.numar));
  for (let k = 1; k < MARGINI_FREZA.numar; k++) if (!luate.has(k)) return k;
  return MARGINI_FREZA.numar;
}

function ciornaDin(f: Freza, ro: boolean, numeGol = false): Ciorna {
  return {
    fel: f.fel, nume: numeGol ? '' : f.nume, nota: f.nota ?? '', grup: f.grup ?? '',
    diametru: fara(f.diametru, ro), unghi: fara(f.unghi ?? UNGHI_V_IMPLICIT, ro), varf: fara(f.varf, ro), raza: fara(f.raza, ro),
    treapta: fara(f.treapta, ro), tais: fara(f.tais, ro),
    taisuri: fara(f.taisuri, ro), numar: fara(f.numar, ro), turatie: fara(f.turatie, ro), avans: fara(f.avans, ro),
    plonjare: fara(f.plonjare, ro), pas: fara(f.pas, ro), pasLateral: fara(f.pasLateral, ro),
    puncte: (f.puncte ?? []).map(([r, h]): PunctText => [fara(r, ro), fara(h, ro)]),
    materiale: seturiText(f.materiale, ro),
  };
}

/** Freza din textele editorului: un câmp opțional gol pleacă, un număr greșit e NaN (îl spune judecata). */
function frezaDin(c: Ciorna, ro: boolean): Freza {
  const v: Record<string, unknown> = {
    fel: c.fel, nota: c.nota.trim() === '' ? undefined : c.nota.trim(), grup: c.grup.trim() === '' ? undefined : c.grup.trim(),
  };
  for (const k of CAMPURI_NUMERE) {
    const s = c[k].trim();
    v[k] = s === '' ? (OPTIONALE.has(k) ? undefined : Number.NaN) : (citesteNumar(s) ?? Number.NaN);
  }
  if (!areUnghi(c.fel)) v['unghi'] = undefined;
  if (!areVarf(c.fel)) v['varf'] = undefined;
  if (!areRaza(c.fel)) v['raza'] = undefined;
  if (!areTreapta(c.fel)) v['treapta'] = undefined;
  if (arePuncte(c.fel)) {
    // Silueta desenată: punctele scrise (un număr greșit e NaN), iar diametrul e de două ori raza ultimului punct.
    const P = c.puncte.map(([r, h]): [number, number] => [citesteNumar(r.trim()) ?? Number.NaN, citesteNumar(h.trim()) ?? Number.NaN]);
    v['puncte'] = P;
    v['diametru'] = P.length > 0 ? 2 * P[P.length - 1]![0] : Number.NaN;
  }
  // Seturile pe material (ADR 0305 §1): fără niciunul, câmpul pleacă (și de pe freza salvată, la care se pune peste).
  v['materiale'] = c.materiale.length > 0 ? seturiNumere(c.materiale) : undefined;
  const f = v as FrezaFaraNume;
  return { ...f, nume: c.nume.trim() === '' ? numePropus(f, ro) : c.nume };
}

function ciornaNoua(lista: readonly FrezaSalvata[], ro: boolean): Ciorna {
  return ciornaDin({ ...FREZE_PORNIRE[1]!, numar: tLiber(lista), nume: '' }, ro, true);
}

/** Eticheta unghiului: al vârfului la burghiu, al teșiturii la panou, inclus la celelalte. */
const textUnghi = (fel: FelFreza): string => t(fel === 'burghiu' ? 'freze.unghi.burghiu' : fel === 'panou' ? 'freze.unghi.panou' : 'freze.unghi');
/** Eticheta vârfului: fundul plat la panou. */
const textVarf = (fel: FelFreza): string => t(fel === 'panou' ? 'freze.varf.panou' : 'freze.varf');
/** Eticheta razei: a colțului la toroidală, a vârfului la conică, a rotunjirii, a arcelor ogee-ului, a scobiturii panoului. */
function textRaza(fel: FelFreza): string {
  switch (fel) {
    case 'toroidala': return t('freze.raza.toroidala');
    case 'rotunjire': return t('freze.raza.rotunjire');
    case 'ogee': case 'ogee-roman': return t('freze.raza.ogee');
    case 'panou': return t('freze.raza.panou');
    default: return t('freze.raza.conica');
  }
}

/** Valorile obișnuite ale profilurilor (16.A↑h-5): raza, treapta, unghiul, fundul plat și diametrul care le cuprinde. */
const PROFIL_IMPLICIT: Readonly<Partial<Record<FelFreza, { readonly d: number; readonly raza?: number; readonly treapta?: number }>>> = {
  rotunjire: { d: 12, raza: 3 }, ogee: { d: 18, raza: 3 }, 'ogee-roman': { d: 21, raza: 3, treapta: 1.5 }, panou: { d: 50.8 },
};

/** Punctele siluetei desenate, ca text, din silueta altei freze („Pornește de la…”); una greșită dă (0, 0), (3, 0), (6, 3). */
function punctePornire(f: Freza, ro: boolean): readonly PunctText[] {
  const p = puncteDesenate(f) ?? [[0, 0], [3, 0], [6, 3]];
  return p.map(([r, h]): PunctText => [textNumar(r, ro), textNumar(h, ro)]);
}

/**
 * Ciorna cu alt fel: unghiul, vârful, raza și treapta primesc valorile obișnuite ale felului, unde lipsesc sau erau ale altui
 * fel; la un profil, diametrul se schimbă doar dacă cel scris nu-l cuprinde (pe Ø6, o rotunjire R3 n-ar avea vârf).
 */
function cuFel(c: Ciorna, x: FelFreza, ro: boolean): Ciorna {
  const gol = (v: string): boolean => v.trim() === '';
  const unghiFel = (f: FelFreza): number => (f === 'burghiu' ? 118 : f === 'conica' ? 15 : f === 'panou' ? 12 : UNGHI_V_IMPLICIT);
  const varfFel = (f: FelFreza): number => (f === 'panou' ? 6.35 : 0.2);
  const unghi = areUnghi(x) && (gol(c.unghi) || unghiFel(x) !== unghiFel(c.fel)) ? textNumar(unghiFel(x), ro) : c.unghi;
  const varf = areVarf(x) && (gol(c.varf) || x !== c.fel) ? textNumar(varfFel(x), ro) : c.varf;
  const p = PROFIL_IMPLICIT[x];
  const razaFel = p ? p.raza : x === 'toroidala' ? 1 : 0.5;
  const raza = areRaza(x) && (gol(c.raza) || x !== c.fel) ? (razaFel === undefined ? '' : textNumar(razaFel, ro)) : c.raza;
  const treapta = areTreapta(x) && (gol(c.treapta) || x !== c.fel) ? textNumar(p?.treapta ?? 1.5, ro) : c.treapta;
  // Silueta desenată pornește de la silueta frezei din editor (o plată Ø6 dă (0, 0), (3, 0)); o freză încă greșită, de la una
  // obișnuită. Înapoi pe alt fel, punctele rămân în ciornă (se întorc dacă omul revine), dar nu intră în freză.
  const puncte = x === 'desenata' && c.puncte.length < 2 ? punctePornire(frezaDin(c, ro), ro) : c.puncte;
  // De pe „Desenată” pe alt fel, diametrul e cel dat de ultimul punct (câmpul lui nu se vedea), nu cel scris înainte.
  const dDesenat = c.fel === 'desenata' && x !== 'desenata' ? frezaDin(c, ro).diametru : Number.NaN;
  const diametru = Number.isFinite(dDesenat) ? textNumar(dDesenat, ro) : c.diametru;
  const n = { ...c, fel: x, unghi, varf, raza, treapta, puncte, diametru };
  if (!p) return n;
  // Diametrul: cel scris, dacă profilul încape în el; altfel, cel obișnuit al profilului.
  const incape = (d: string): boolean => {
    const f = frezaDin({ ...n, diametru: d }, ro);
    const pr = problemeFreza({ ...f, tais: undefined });
    return !pr.diametru && !pr.raza && !pr.treapta && !pr.varf;
  };
  return incape(c.diametru) ? n : { ...n, diametru: textNumar(p.d, ro) };
}

/** Silueta frezei la scară (profilul h(r) oglindit, cu coada deasupra), sau nimic dacă valorile nu sunt încă bune. */
function Silueta({ f, mare }: { readonly f: Freza; readonly mare: boolean }): ReactNode {
  const ro = useLimba() === 'ro';
  const R = f.diametru / 2;
  const con = inaltimeCon(f);
  // Lungimea desenată: tăișul, dacă e știut, cel puțin capătul; plata și felurile fără con, și ceva cilindru deasupra.
  const lung = f.fel === 'plata' ? f.diametru * 2 : f.fel === 'v' || f.fel === 'gravare' || f.fel === 'conica' ? 0
    : PROFIL_IMPLICIT[f.fel] ? Math.max(con * 2, f.diametru * 0.5) : f.diametru * 1.5;
  const L = Math.max(f.tais ?? 0, con, lung);
  if (!(R > 0) || !Number.isFinite(L) || !(L > 0)) return <svg className="freza-silueta" viewBox="0 0 40 40" aria-hidden="true" />;
  const W = mare ? 200 : 40, H = mare ? 220 : 40, m = mare ? 30 : 3;
  const sus = L * 1.35;
  const k = Math.min((W - 2 * m) / (2 * R), (H - 2 * m) / sus);
  const X = (r: number): number => W / 2 + r * k, Y = (h: number): number => H - m - h * k;
  // Profilul (de la vârf la diametru), apoi drept până sus, și oglinda lui în stânga.
  const profil = profilFreza(f);
  // O siluetă desenată încă greșită (un număr nescris) nu se desenează.
  if (!profil.every(([r, h]) => Number.isFinite(r) && Number.isFinite(h))) return <svg className="freza-silueta" viewBox="0 0 40 40" aria-hidden="true" />;
  const puncte: readonly (readonly [number, number])[] = [
    ...profil, [R, L], [-R, L], ...[...profil].reverse().map(([r, h]) => [-r, h] as const),
  ];
  const coada = R * 0.82;
  return (
    <svg className="freza-silueta" viewBox={`0 0 ${W} ${H}`} role={mare ? 'img' : undefined} aria-label={mare ? t('freze.silueta') : undefined}
      aria-hidden={mare ? undefined : true}>
      <rect className="coada" x={X(-coada)} y={Y(sus)} width={2 * coada * k} height={(sus - L) * k} />
      <polygon className="tais" points={puncte.map(([x, y]) => `${X(x).toFixed(2)},${Y(y).toFixed(2)}`).join(' ')} />
      {mare ? (
        <>
          <line className="cota" x1={X(-R)} y1={Y(sus) - 10} x2={X(R)} y2={Y(sus) - 10} />
          <text className="cota-text" x={W / 2} y={Y(sus) - 14} textAnchor="middle">Ø{textNumar(f.diametru, ro)}</text>
          {areUnghi(f.fel) && f.unghi !== undefined ? (
            <text className="cota-text" x={W / 2} y={Y(0) + 16} textAnchor="middle">{`${textNumar(f.unghi, ro)}°`}</text>
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
    case 'raza': return t('freze.raza');
    case 'treapta': return t('freze.treapta');
    case 'grup': return t('freze.grup');
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
  // Un cont fără freze primește frezele standard la prima sincronizare (ADR 0300 §3, precizarea din 24.11).
  const sincronizare = useSincronizare(cheie, uid, config, () => frezeleStandard(ro));
  const [amanat, setAmanat] = useState(() => uid !== null && amanate.has(uid));
  const [cauta, setCauta] = useState('');
  const [filtru, setFiltru] = useState<FelFreza | 'toate'>('toate');
  /** Freza din editor: id-ul ei, `nou` pentru una nouă, sau nimic. */
  const [aleasa, setAleasa] = useState<string | null>(null);
  const [ciorna, setCiorna] = useState<Ciorna | null>(null);
  const [initiala, setInitiala] = useState<Ciorna | null>(null);
  const [toateProblemele, setToateProblemele] = useState(false);
  const [pas, setPas] = useState<'lista' | 'editor'>('lista');
  const [vedere, setVedere] = useState<Vedere>(vedereTinuta);
  /** În vederea „Listă”: editorul frezei alese e deschis (altfel, fișa ei). */
  const [editeaza, setEditeaza] = useState(false);
  /** Grupul redenumit din titlul lui (numele de acum) și textul scris. */
  const [redenumit, setRedenumit] = useState<{ readonly grup: string; readonly nou: string } | null>(null);
  /** „Grupul” → „Grup nou…”: numele scris pentru grupul nou al frezei din fișă. */
  const [grupNou, setGrupNou] = useState<string | null>(null);
  /** Catalogul (ADR 0302 §1): deschis sub bibliotecă, și freza lui aleasă (fișa ei, doar de citit). */
  const [catalogDeschis, setCatalogDeschis] = useState(false);
  const [aleasaCatalog, setAleasaCatalog] = useState<string | null>(null);
  const [mesaj, setMesaj] = useState('');
  const [stergere, setStergere] = useState(false);
  const [importat, setImportat] = useState<{ readonly freze: readonly Freza[]; readonly sarite: number; readonly politica: PoliticaImport } | null>(null);
  const refCauta = useRef<HTMLInputElement>(null);
  const refFisier = useRef<HTMLInputElement>(null);
  const refEditor = useRef<HTMLFormElement>(null);
  const refCorp = useRef<HTMLDivElement>(null);
  /** Catalogul cu numele propuse și nota țolilor, în limba de acum. */
  const catalog = useMemo((): readonly CatalogCuNume[] => CATALOG_FREZE.map((c) => ({ c, nume: numePropus(c, ro), tol: tolFreza(c.diametru) })), [ro]);
  /** Unde merge focusul după randarea următoare (fișa și editorul își iau locul unul altuia, deci butonul apăsat dispare). */
  const deFocus = useRef<string | null>(null);
  useEffect(() => {
    const s = deFocus.current;
    if (s === null) return;
    deFocus.current = null;
    refCorp.current?.querySelector<HTMLElement>(s)?.focus();
  });

  useEffect(() => {
    refCauta.current?.focus();
    return () => { if (focusInapoi instanceof HTMLElement) focusInapoi.focus(); };
  }, [focusInapoi]);
  // Altă bibliotecă (intrarea în cont sau ieșirea, cât fereastra e deschisă): editorul se închide.
  useEffect(() => {
    void frezeMele(cheie).incarca();
    // Biblioteca fără cont primește frezele standard o dată (și când fereastra lucrează pe a contului: o ai după ieșire).
    void cuFrezeleStandard();
    setAleasa(null);
    setCiorna(null);
    setInitiala(null);
    setPas('lista');
    setEditeaza(false);
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

  /** Deschide freza (fișa ei, sau editorul cu `editor`; în vederea „Configurator”, mereu editorul). */
  const deschide = (id: string | 'nou' | null, c: Ciorna | null, editor = false): void => {
    setAleasa(id);
    setCiorna(c);
    setInitiala(c);
    setToateProblemele(false);
    setStergere(false);
    setEditeaza(editor);
    setGrupNou(null);
    setAleasaCatalog(null);
    setPas(id === null ? 'lista' : 'editor');
  };
  /** Din editor, înapoi la fișa frezei (vederea „Listă”), cu focusul pe „Editează”. */
  const laFisa = (): void => {
    setEditeaza(false);
    setStergere(false);
    setGrupNou(null);
    deFocus.current = '[data-freze="editeaza"]';
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
    // În vederea „Listă”, freza salvată își arată fișa.
    if (vedere === 'lista') laFisa();
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
    pleaca(() => {
      deschide('nou', ciornaNoua(biblioteca.stare().freze, ro), true);
      setMesaj('');
      deFocus.current = '[data-freze-camp="nume"]';
    });
  };
  /** „Editează”, din fișă: editorul frezei alese, cu focusul pe nume. */
  const editeazaFisa = (): void => {
    setEditeaza(true);
    setStergere(false);
    setPas('editor');
    setMesaj('');
    deFocus.current = '[data-freze-camp="nume"]';
  };
  /** Comutatorul „Listă / Configurator”; spre listă, editorul pleacă întâi (o schimbare bună se salvează). */
  const comuta = (v: Vedere): void => {
    if (v === vedere) return;
    const aplica = (): void => {
      setVedere(v);
      tineVedere(v);
      setEditeaza(false);
      setStergere(false);
    };
    if (v === 'lista' && aleasa !== 'nou') pleaca(aplica);
    else aplica();
  };
  /** „Grupul”, din fișă: freza intră în grupul ales (gol: înapoi pe felul ei). */
  const mutaIn = (f: FrezaSalvata, grup: string): void => {
    void biblioteca.salveaza(f.id, { ...f, grup: grup.trim() === '' ? undefined : grup }).then((r) => {
      if (!r.ok) {
        const p = r.probleme;
        setMesaj('grup' in p && p.grup ? textMotiv('grup', p.grup) : motivLista(p));
        return;
      }
      setGrupNou(null);
      setMesaj(t('freze.stare.salvat'));
      sincronizare.programeaza();
      deFocus.current = '[data-freze="muta"]';
    });
  };
  /** Redenumirea din titlul grupului (ADR 0302 §4): toate frezele lui; gol, înapoi pe felurile lor. */
  const redenumeste = (): void => {
    if (!redenumit) return;
    void biblioteca.redenumesteGrup(redenumit.grup, redenumit.nou).then((r) => {
      if (!r.ok) {
        const p = r.probleme;
        setMesaj('grup' in p && p.grup ? textMotiv('grup', p.grup) : motivLista(p));
        return;
      }
      setRedenumit(null);
      setMesaj(t('freze.stare.salvat'));
      sincronizare.programeaza();
      // Focusul, pe „✎” al grupului cu numele nou; desfăcut (numele gol), pe căutare.
      const k = cheieNume(redenumit.nou);
      const g = redenumit.nou.trim() === '' ? undefined
        : grupurileListei(biblioteca.stare().freze).find((x) => x.grup !== null && cheieNume(x.grup) === k)?.grup;
      if (g === undefined || g === null) refCauta.current?.focus();
      else deFocus.current = focusRedenumire(g);
    });
  };
  /** O freză a catalogului, aleasă: fișa ei, doar de citit (editorul de dinainte pleacă întâi). */
  const alegeCatalog = (id: string): void => {
    pleaca(() => { deschide(null, null); setAleasaCatalog(id); setPas('editor'); setMesaj(''); });
  };
  /** „Pune în frezele mele”: frezele date ale catalogului, cu numele propus și nota țolilor, cele care nu sunt deja. */
  const puneDinCatalog = (alese: readonly CatalogCuNume[]): void => {
    void biblioteca.puneDinCatalog(alese.map((x) => ({ ...x.c, nume: x.nume, ...(x.tol !== undefined ? { nota: x.tol } : {}) }))).then((r) => {
      if (!r.ok) { setMesaj(motivLista(r.probleme)); return; }
      const plina = r.plina ? ` ${t('freze.catalog.plina', { max: MARGINI_FREZA.freze })}` : '';
      setMesaj(t('freze.catalog.rezultat', { adaugate: r.adaugate, existente: r.existente }) + plina);
      if (r.adaugate > 0) sincronizare.programeaza();
    });
  };
  /** Renunțarea la redenumire (butonul sau Escape): câmpul se închide, iar focusul revine pe „✎” al grupului. */
  const renuntaRedenumire = (): void => {
    if (redenumit) deFocus.current = focusRedenumire(redenumit.grup);
    setRedenumit(null);
  };
  const inchide = (): void => { pleaca(onInchide); };
  const renunta = (): void => {
    if (aleasa === 'nou') deschide(null, null);
    else {
      setCiorna(initiala);
      setToateProblemele(false);
      if (vedere === 'lista') laFisa();
    }
    setMesaj('');
  };
  /** „←” din editor: în vederea „Listă”, înapoi la fișă; altfel (și la o freză nouă), la listă. */
  const inapoi = (): void => {
    if (vedere === 'lista' && aleasa !== 'nou') pleaca(laFisa);
    else pleaca(() => { setPas('lista'); });
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
    void biblioteca.puneStandard(frezeleStandard(ro), false).then((r) => {
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
    if (e.key !== 'Escape' || e.defaultPrevented || e.isComposing) return;
    e.preventDefault();
    e.stopPropagation();
    // Escape închide stratul de sus care se vede (16.A↑b-7). O stare rămasă în urmă nu-l oprește: întrebarea unei freze șterse
    // (fișa pleacă la vestea bibliotecii, `stergere` abia la capătul ștergerii) sau redenumirea unui grup deja redenumit.
    const vede = (s: string): boolean => refCorp.current?.querySelector(s) != null;
    if (redenumit && vede('[data-freze="grup-nume-nou"]')) renuntaRedenumire();
    else if (grupNou !== null && vede('[data-freze="grup-nou"]')) setGrupNou(null);
    else if (stergere && vede('[data-freze="sterge-da"]')) setStergere(false);
    else if (importat) setImportat(null);
    else inchide();
  };
  // Escape se ascultă pe pagină cât fereastra e deschisă, oriunde ar fi focusul (16.A↑b-7): butonul apăsat pleacă („Da,
  // șterge”, „Salvează” în „Listă”) sau se oprește sub focus („Salvează” în „Configurator”), iar un clic pe un text al ferestrei
  // lasă focusul pe pagină; ascultată doar pe fereastră, tasta se pierdea acolo. Pe urcare și cu `defaultPrevented`, ca la
  // fereastra exportului: manualul deschis peste ea (F1) își oprește singur tastele și se închide primul.
  const refTasta = useRef(tasta);
  refTasta.current = tasta;
  useEffect(() => {
    const asculta = (e: KeyboardEvent): void => { refTasta.current(e); };
    document.addEventListener('keydown', asculta);
    return () => { document.removeEventListener('keydown', asculta); };
  }, []);

  const scrie = (k: Exclude<CampFreza, 'puncte' | 'materiale'>) => (e: ChangeEvent<HTMLInputElement>): void => {
    const v = e.currentTarget.value;
    setCiorna((c) => (c ? { ...c, [k]: v } : c));
    setMesaj('');
  };
  const vizibila = (k: CampFreza): boolean => !!probleme[k] && (toateProblemele
    || (ciorna !== null && initiala !== null && JSON.stringify(ciorna[k]) !== JSON.stringify(initiala[k])));
  const textMotiv = (k: CampFreza, m: MotivFreza): string => {
    switch (m) {
      case 'lipsa': return k === 'puncte' ? t('freze.motiv.puncte.lipsa') : t('freze.motiv.lipsa');
      case 'intreg': return t('freze.motiv.intreg');
      case 'varf': return t('freze.motiv.varf');
      case 'con': return t(freza!.fel === 'v' || freza!.fel === 'gravare' ? 'freze.motiv.con' : 'freze.motiv.capat', { con: textNumar(Math.ceil(inaltimeCon(freza!) * 1000) / 1000, ro) });
      case 'nume-gol': return t('freze.motiv.lipsa');
      case 'nume-lung': return t('freze.motiv.nume-lung', { max: MARGINI_FREZA.nume });
      case 'nume-caractere': return t('freze.motiv.nume-caractere');
      case 'nume-folosit': return t('freze.motiv.nume-folosit');
      case 'nota-lunga': return t('freze.motiv.nota-lunga', { max: MARGINI_FREZA.nota });
      case 'grup-lung': return t('freze.motiv.nume-lung', { max: MARGINI_FREZA.grup });
      case 'grup-caractere': return t('freze.motiv.nume-caractere');
      case 'materiale-multe': return t('freze.motiv.materiale-multe', { max: MARGINI_FREZA.materiale });
      case 'material-gol': return t('freze.motiv.material-gol');
      case 'material-lung': return t('freze.motiv.nume-lung', { max: MARGINI_FREZA.material });
      case 'material-caractere': return t('freze.motiv.nume-caractere');
      case 'material-folosit': return t('freze.motiv.material-folosit');
      case 'puncte-putine': return t('freze.motiv.puncte.lipsa');
      case 'puncte-multe': return t('freze.motiv.puncte.multe', { max: PLAFON.puncteProfil });
      case 'puncte-inceput': return t('freze.motiv.puncte.inceput');
      case 'puncte-capat': return t('freze.motiv.puncte.capat');
      case 'puncte-numar': case 'puncte-r': case 'puncte-h': {
        // Numărul punctului, ca în tabel (de la 1).
        const n = (problemaPuncte(freza!.puncte, null)?.punct ?? 0) + 1;
        if (m === 'puncte-numar') return t('freze.motiv.puncte.numar', { n, rmax: textNumar(PLAFON.diametruScula, ro), hmax: textNumar(PLAFON.adancimeOperatie, ro) });
        return t(m === 'puncte-r' ? 'freze.motiv.puncte.r' : 'freze.motiv.puncte.h', { n });
      }
      case 'margini':
        if (k === 'unghi') {
          return t('freze.motiv.unghi', { min: MARGINI_FREZA.unghiMinim, max: freza!.fel === 'panou' ? MARGINI_FREZA.unghiPanou : MARGINI_FREZA.unghiMaxim });
        }
        if (k === 'varf') return t('freze.motiv.pozitiv');
        if (k === 'raza') {
          const fel = freza!.fel;
          return t(fel === 'ogee' || fel === 'ogee-roman' ? 'freze.motiv.raza.ogee' : fel === 'panou' ? 'freze.motiv.raza.panou' : 'freze.motiv.raza');
        }
        if (k === 'treapta') return t('freze.motiv.treapta');
        return t('freze.motiv.margini', { max: textNumar(MAXIM[k] ?? 0, ro) });
    }
  };
  const camp = (k: Exclude<CampFreza, CampText | 'puncte' | 'materiale'>, eticheta: string, unitate: string | null): ReactNode => {
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
  const catalogVazut = catalog.filter((x) => (filtru === 'toate' || x.c.fel === filtru) && (q === '' || x.nume.toLocaleLowerCase(limba).includes(q)));
  const dinCatalog = aleasaCatalog !== null ? catalog.find((x) => x.c.id === aleasaCatalog) ?? null : null;
  const vazute = stare.freze.filter((f) => (filtru === 'toate' || f.fel === filtru) && (q === '' || f.nume.toLocaleLowerCase(limba).includes(q)));
  const fel = ciorna?.fel ?? 'plata';
  const pNume = vizibila('nume') ? probleme.nume : undefined;
  const pNota = vizibila('nota') ? probleme.nota : undefined;
  const pGrup = vizibila('grup') ? probleme.grup : undefined;
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
  // Întrebarea vine după prima trecere a sincronizării (sau după eșecul ei): un cont fără freze primește întâi frezele
  // standard, cu aceleași id-uri ca ale browserului, deci ele nu se mai numără.
  const deAdus = uid !== null && locala.incarcata && stare.incarcata && !amanat && sincronizare.stare.ultima !== null
    ? deAdusDinBrowser({ freze: stare.freze, brute: [], sincron: stare.sincron }, locala.freze).length : 0;
  const conflict = conflicte[0];
  /** Editorul se vede la o freză nouă, în vederea „Configurator” și după „Editează”; altfel, fișa frezei alese. */
  const cuEditor = aleasa === 'nou' || vedere === 'configurator' || editeaza;
  const deFisa = !cuEditor && aleasa !== null ? stare.freze.find((x) => x.id === aleasa) ?? null : null;
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

  /** Grupurile omului din toată biblioteca (pentru „Grupul” din fișă și din editor). */
  const grupuri = grupurileListei(stare.freze).flatMap((g) => (g.grup !== null ? [g.grup] : []));
  /** De unde poate porni o siluetă desenată (ADR 0304 §5): frezele bibliotecii și profilurile catalogului. */
  const surseSilueta = useMemo(() => ({
    biblioteca: stare.freze.map((f): SursaSilueta => ({ id: `b:${f.id}`, nume: f.nume, f })),
    catalog: catalog.filter((x) => (FELURI_PROFIL as readonly string[]).includes(x.c.fel))
      .map((x): SursaSilueta => ({ id: `c:${x.c.id}`, nume: x.nume, f: { ...x.c, nume: x.nume } })),
  }), [stare.freze, catalog]);
  /**
   * Greșeala siluetei desenate, sub tabelul punctelor: a punctelor, altfel a diametrului dat de ultimul punct (câmpul lui nu se
   * arată), după aceeași regulă a ferestrei: după o schimbare a punctelor sau la „Salvează”.
   */
  const textPuncte = ((): string | null => {
    if (!freza || !arePuncte(freza.fel)) return null;
    if (vizibila('puncte') && probleme.puncte) return textMotiv('puncte', probleme.puncte);
    const vazute = toateProblemele || (ciorna !== null && initiala !== null && JSON.stringify(ciorna.puncte) !== JSON.stringify(initiala.puncte));
    return vazute && probleme.diametru
      ? t('freze.motiv.puncte.diametru', { r: textNumar(MARGINI_FREZA.diametru / 2, ro), max: textNumar(MARGINI_FREZA.diametru, ro) }) : null;
  })();

  /**
   * Greșeala seturilor pe material, sub ele (ADR 0305 §1): „Setul N, câmpul: motivul”, după aceeași regulă a ferestrei (după o
   * schimbare a seturilor sau la „Salvează”); cu setul și câmpul ei, pentru câmpul de marcat.
   */
  const problemaSet = freza && vizibila('materiale') ? problemaMateriale(freza.materiale) : null;
  const textMateriale = ((): string | null => {
    if (problemaSet === null) return null;
    const mic = (x: string): string => x.charAt(0).toLocaleLowerCase(limba) + x.slice(1);
    const { motiv, set, camp: c } = problemaSet;
    if (set === null) return textMotiv('materiale', motiv);
    let text: string;
    if (c === null || c === 'material') text = textMotiv('materiale', motiv);
    else if (motiv === 'margini') text = t('freze.motiv.margini', { max: textNumar(MARGINI_FREZA[c], ro) });
    else text = textMotiv(c, motiv);
    return c === null || c === 'material' ? t('freze.motiv.set', { n: set + 1, text: mic(text) })
      : t('freze.motiv.set.camp', { n: set + 1, camp: mic(etichetaSet(c)), text: mic(text) });
  })();
  /** Materialele scrise pe frezele bibliotecii, o dată fiecare (sugestiile câmpului „Materialul”). */
  const sugestiiMaterial = useMemo(() => {
    const vazute = new Map<string, string>();
    for (const x of stare.freze) for (const s of x.materiale ?? []) {
      const k = s.material.toLocaleLowerCase(limba);
      if (!vazute.has(k)) vazute.set(k, s.material);
    }
    return [...vazute.values()].sort((a, b) => a.localeCompare(b, limba));
  }, [stare.freze, limba]);

  /** Fișa frezei alese, doar de citit (vederea „Listă”, ADR 0302 §3): felul, silueta, geometria, valorile de lucru, nota. */
  const fisa = (f: Freza, catalogDeja?: boolean): ReactNode => {
    /** Fișa unei freze din catalog (`catalogDeja` dat): fără T, fără grup, cu „Pune în frezele mele”. */
    const dinCat = catalogDeja !== undefined;
    const mm = t('freze.unitate.mm');
    const geometria: (readonly [string, string, string])[] = [
      ['fel', t('freze.felul'), t(`freze.fel.${f.fel}`)],
      ['diametru', t('freze.diametru'), `${nr(f.diametru)} ${mm}`],
    ];
    if (areUnghi(f.fel) && f.unghi !== undefined) geometria.push(['unghi', textUnghi(f.fel), `${nr(f.unghi)}${t('freze.unitate.grade')}`]);
    if (areVarf(f.fel) && f.varf !== undefined) geometria.push(['varf', textVarf(f.fel), `${nr(f.varf)} ${mm}`]);
    if (areRaza(f.fel) && f.raza !== undefined) geometria.push(['raza', textRaza(f.fel), `${nr(f.raza)} ${mm}`]);
    if (areTreapta(f.fel) && f.treapta !== undefined) geometria.push(['treapta', t('freze.treapta'), `${nr(f.treapta)} ${mm}`]);
    if (arePuncte(f.fel)) geometria.push(['inaltime', t('freze.inaltime'), `${nr(inaltimeCon(f))} ${mm}`]);
    if (f.tais !== undefined) geometria.push(['tais', t('freze.tais'), `${nr(f.tais)} ${mm}`]);
    if (f.taisuri !== undefined) geometria.push(['taisuri', t('freze.taisuri'), nr(f.taisuri)]);
    if (!dinCat) geometria.push(['numar', t('freze.numar'), `T${f.numar}`]);
    const lucru: readonly (readonly [string, string, string])[] = [
      ['turatie', t('freze.turatie'), `${nr(f.turatie)} ${t('freze.unitate.rpm')}`],
      ['avans', t('freze.avans'), `${nr(f.avans)} ${t('freze.unitate.mm-min')}`],
      ['plonjare', t('freze.plonjare'), `${nr(f.plonjare)} ${t('freze.unitate.mm-min')}`],
      ['pas', t('freze.pas'), `${nr(f.pas)} ${mm}`],
      ['pasLateral', t('freze.pas-lateral'), `${nr(f.pasLateral)} ${t('freze.unitate.procent')}`],
    ];
    const valori = (r: readonly (readonly [string, string, string])[]): ReactNode => (
      <dl className="freze-valori">
        {r.map(([k, e, v]) => (
          <div key={k}>
            <dt>{e}</dt>
            <dd data-freze-valoare={k}>{v}</dd>
          </div>
        ))}
      </dl>
    );
    return (
      <section className="freze-editor freze-fisa" data-freze="fisa" aria-labelledby="freze-fisa-titlu">
        <button type="button" className="freze-inapoi" data-freze="inapoi" onClick={() => { setPas('lista'); setStergere(false); }}>← {t('freze.inapoi')}</button>
        <h3 id="freze-fisa-titlu">{f.nume}</h3>
        {!dinCat ? (
          <div className="freze-fisa-grup">
          {grupNou === null ? (
            <label className="freze-muta">
              <span>{t('freze.grup')}</span>
              <select data-freze="muta" value={f.grup ?? ''} disabled={doarCitire}
                onChange={(e) => {
                  const v = e.currentTarget.value;
                  if (v === NOU) { setGrupNou(''); setMesaj(''); deFocus.current = '[data-freze="grup-nou"]'; } else mutaIn(f as FrezaSalvata, v);
                }}>
                <option value="">{t('freze.grup.fara')}</option>
                {grupuri.map((g) => <option key={g} value={g}>{g}</option>)}
                <option value={NOU}>{t('freze.grup.nou')}</option>
              </select>
            </label>
          ) : (
            <form className="freze-muta" onSubmit={(e) => { e.preventDefault(); if (grupNou.trim() !== '') mutaIn(f as FrezaSalvata, grupNou); }}>
              <span>{t('freze.grup')}</span>
              <input type="text" data-freze="grup-nou" aria-label={t('freze.grup.nume')} value={grupNou}
                onChange={(e) => { setGrupNou(e.currentTarget.value); setMesaj(''); }} />
              <button type="submit" data-freze="grup-nou-da" disabled={grupNou.trim() === ''}>{t('freze.grup.nou.da')}</button>
              <button type="button" data-buton="renunta" onClick={() => { setGrupNou(null); }}>{t('freze.import.renunta')}</button>
            </form>
          )}
          </div>
        ) : null}
        <div className="freze-editor-sus">
          <section className="freze-fisa-parte" aria-labelledby="freze-fisa-geometria">
            <h4 id="freze-fisa-geometria">{t('freze.geometria')}</h4>
            {valori(geometria)}
          </section>
          <figure className="freze-silueta-mare">
            <Silueta f={f} mare />
          </figure>
        </div>
        {arePuncte(f.fel) && f.puncte ? <PuncteFisa puncte={f.puncte} ro={ro} /> : null}
        <section className="freze-fisa-parte" aria-labelledby="freze-fisa-lucru">
          <h4 id="freze-fisa-lucru">{t('freze.lucru')}</h4>
          {valori(lucru)}
        </section>
        {f.materiale && f.materiale.length > 0 ? <MaterialeFisa seturi={f.materiale} ro={ro} /> : null}
        {f.nota !== undefined && f.nota !== '' ? (
          <p className="freze-fisa-nota"><span>{t('freze.nota')}</span> <span data-freze-valoare="nota">{f.nota}</span></p>
        ) : null}
        {dinCat ? <p className="freze-ajutor">{t('freze.catalog.pornire')}</p> : null}
        {!areCam(f.fel) ? <p className="freze-ajutor freze-curand-nota" data-freze="curand">{t('freze.curand.nota')}</p> : null}
        {stergere && !dinCat ? (
          <div className="freze-stergere" role="group" aria-label={t('freze.sterge.intrebare', { nume: f.nume })}>
            <p>{t('freze.sterge.intrebare', { nume: f.nume })}</p>
            <div className="butoane">
              <button type="button" data-freze="sterge-da" className="pericol" onClick={sterge}>{t('freze.sterge.da')}</button>
              <button type="button" data-buton="renunta" onClick={() => { setStergere(false); }}>{t('freze.sterge.nu')}</button>
            </div>
          </div>
        ) : null}
        {dinCat ? (
          <div className="butoane freze-butoane">
            <button type="button" className="principal" data-freze="catalog-pune" disabled={doarCitire || catalogDeja}
              onClick={() => { if (dinCatalog) puneDinCatalog([dinCatalog]); }}>{t('freze.catalog.pune')}</button>
            {catalogDeja ? <span className="freze-ajutor" data-freze="catalog-deja">{t('freze.catalog.deja')}</span> : null}
          </div>
        ) : (
          <div className="butoane freze-butoane">
            <button type="button" className="principal" data-freze="editeaza" disabled={doarCitire} onClick={editeazaFisa}>{t('freze.editeaza')}</button>
            <button type="button" data-freze="duplica" disabled={doarCitire} onClick={duplica}>{t('freze.duplica')}</button>
            <button type="button" data-freze="sterge" disabled={doarCitire} onClick={() => { setStergere(true); }}>{t('freze.sterge')}</button>
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="freze-titlu" data-testid="dialog-freze">
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
          <div className="freze-vedere" role="group" aria-label={t('freze.vedere')}>
            {(['lista', 'configurator'] as const).map((v) => (
              <button key={v} type="button" data-freze-vedere={v} aria-pressed={vedere === v} onClick={() => { comuta(v); }}>
                {t(`freze.vedere.${v}`)}
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
        <div ref={refCorp} className="freze-corp" data-pas={pas}>
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
            {grupurileListei(vazute).map((g, i) => {
              const id = g.fel !== null ? `freze-grupa-${g.fel}` : `freze-grupa-g${i}`;
              const titlu = g.grup ?? t(`freze.grupa.${g.fel!}`);
              const scrie = redenumit !== null && g.grup !== null && redenumit.grup === g.grup;
              return (
                <section key={g.grup !== null ? `g:${g.grup}` : `f:${g.fel!}`} className="freze-grupa" aria-labelledby={id}
                  data-freze-grup={g.grup ?? undefined}>
                  <div className="freze-grupa-cap">
                    <h3 id={id}>{t('freze.grupa', { fel: titlu, n: g.freze.length })}</h3>
                    {g.grup !== null && !scrie ? (
                      <button type="button" className="freze-grupa-redenumeste" data-freze="grup-redenumeste" disabled={doarCitire}
                        aria-label={t('freze.grup.redenumeste', { grup: g.grup })} title={t('freze.grup.redenumeste', { grup: g.grup })}
                        onClick={() => { setRedenumit({ grup: g.grup!, nou: g.grup! }); setMesaj(''); deFocus.current = '[data-freze="grup-nume-nou"]'; }}>
                        ✎
                      </button>
                    ) : null}
                  </div>
                  {scrie ? (
                    <form className="freze-grupa-nume" onSubmit={(e) => { e.preventDefault(); redenumeste(); }}>
                      <input type="text" data-freze="grup-nume-nou" aria-label={t('freze.grup.nume')} value={redenumit.nou}
                        placeholder={t('freze.grup.fara')} onChange={(e) => { const v = e.currentTarget.value; setRedenumit((r) => (r ? { ...r, nou: v } : r)); setMesaj(''); }} />
                      <button type="submit" data-freze="grup-redenumeste-da">{t('freze.grup.redenumeste.da')}</button>
                      <button type="button" data-buton="renunta" onClick={renuntaRedenumire}>{t('freze.import.renunta')}</button>
                    </form>
                  ) : null}
                  <ul>
                    {g.freze.map((f) => (
                      <li key={f.id}>
                        <button type="button" className="freze-rand" data-freza={f.id} aria-current={f.id === aleasa ? 'true' : undefined}
                          onClick={() => { alege(f); }}>
                          <Silueta f={f} mare={false} />
                          <span className="freze-rand-text">
                            <span className="freze-rand-nume">{f.nume}</span>
                            <span className="freze-rand-detalii">
                              {t('freze.rand', { t: f.numar, turatie: nr(f.turatie), avans: nr(f.avans) })}
                              {areCam(f.fel) ? null : <span className="freze-curand"> · {t('freze.curand')}</span>}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
            <section className="freze-catalog" data-freze="catalog" aria-labelledby="freze-catalog-titlu">
              <div className="freze-grupa-cap freze-catalog-cap">
                <button type="button" id="freze-catalog-titlu" className="freze-catalog-arata" data-freze="catalog-arata" aria-expanded={catalogDeschis}
                  onClick={() => { setCatalogDeschis((x) => !x); }}>
                  {t('freze.catalog.titlu', { n: CATALOG_FREZE.length })}
                </button>
                {catalogDeschis && catalogVazut.length > 0 ? (
                  <button type="button" data-freze="catalog-pune-tot" disabled={doarCitire} onClick={() => { puneDinCatalog(catalogVazut); }}>
                    {t('freze.catalog.pune-tot')}
                  </button>
                ) : null}
              </div>
              {catalogDeschis ? <p className="freze-ajutor freze-catalog-nota">{t('freze.catalog.nota')}</p> : null}
              {catalogDeschis ? GRUPURI_CATALOG.map((g) => {
                const din = catalogVazut.filter((x) => x.c.grupCatalog === g);
                if (din.length === 0) return null;
                const titlu = t(`freze.grupa.${g}`);
                return (
                  <section key={g} className="freze-grupa" data-catalog-grup={g} aria-labelledby={`freze-catalog-${g}`}>
                    <div className="freze-grupa-cap">
                      <h3 id={`freze-catalog-${g}`}>{t('freze.grupa', { fel: titlu, n: din.length })}</h3>
                      {areCam(din[0]!.c.fel) ? null : <span className="freze-curand">{t('freze.curand')}</span>}
                      <button type="button" className="freze-catalog-grup" data-freze="catalog-pune-grup" disabled={doarCitire}
                        aria-label={t('freze.catalog.pune-grup', { grup: titlu })} onClick={() => { puneDinCatalog(din); }}>
                        {t('freze.catalog.pune-toate')}
                      </button>
                    </div>
                    <ul>
                      {din.map((x) => (
                        <li key={x.c.id}>
                          <button type="button" className="freze-rand" data-catalog={x.c.id} aria-current={x.c.id === aleasaCatalog ? 'true' : undefined}
                            onClick={() => { alegeCatalog(x.c.id); }}>
                            <Silueta f={{ ...x.c, nume: x.nume }} mare={false} />
                            <span className="freze-rand-text">
                              <span className="freze-rand-nume">{x.nume}</span>
                              <span className="freze-rand-detalii">
                                {(x.tol !== undefined ? `${x.tol} · ` : '') + t('freze.catalog.rand', { turatie: nr(x.c.turatie), avans: nr(x.c.avans) })}
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              }) : null}
            </section>
          </div>
          {dinCatalog ? fisa({ ...dinCatalog.c, nume: dinCatalog.nume, ...(dinCatalog.tol !== undefined ? { nota: dinCatalog.tol } : {}) },
            stare.freze.some((x) => aceeasiGeometrie(x, dinCatalog.c)))
            : deFisa ? fisa(deFisa) : ciorna && freza && cuEditor ? (
            <form ref={refEditor} className="freze-editor" aria-labelledby="freze-editor-titlu" noValidate
              onSubmit={(e) => { e.preventDefault(); void salveaza(); }}>
              <button type="button" className="freze-inapoi" data-freze="inapoi" onClick={inapoi}>
                ← {vedere === 'lista' && aleasa !== 'nou' ? t('freze.inapoi.fisa') : t('freze.inapoi')}
              </button>
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
                            setCiorna((c) => (c ? cuFel(c, x, ro) : c));
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
              {arePuncte(fel) ? (
                <EditorPuncte puncte={ciorna.puncte} dezactivat={doarCitire} ro={ro} surse={surseSilueta}
                  problema={vizibila('puncte') ? problemaPuncte(freza.puncte, null) : null} textProblema={textPuncte}
                  onPuncte={(p) => { setCiorna((c) => (c ? { ...c, puncte: p } : c)); setMesaj(''); }}
                  onPornit={(n, k) => { setMesaj(t('freze.puncte.pornit', { nume: n, n: k })); }} />
              ) : null}
              <fieldset>
                <legend>{t('freze.geometria')}</legend>
                <div className="freze-grila">
                  {arePuncte(fel) ? null : camp('diametru', t('freze.diametru'), t('freze.unitate.mm'))}
                  {areUnghi(fel) ? camp('unghi', textUnghi(fel), t('freze.unitate.grade')) : null}
                  {areVarf(fel) ? camp('varf', textVarf(fel), t('freze.unitate.mm')) : null}
                  {areRaza(fel) ? camp('raza', textRaza(fel), t('freze.unitate.mm')) : null}
                  {areTreapta(fel) ? camp('treapta', t('freze.treapta'), t('freze.unitate.mm')) : null}
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
              <EditorMateriale seturi={ciorna.materiale} dezactivat={doarCitire} sugestii={sugestiiMaterial}
                implicit={{ turatie: ciorna.turatie, avans: ciorna.avans, plonjare: ciorna.plonjare, pas: ciorna.pas, pasLateral: ciorna.pasLateral }}
                problema={problemaSet} textProblema={textMateriale}
                onSeturi={(m) => { setCiorna((c) => (c ? { ...c, materiale: m } : c)); setMesaj(''); }} />
              <label className="freze-camp freze-camp-lat">
                <span>{t('freze.nota')}</span>
                <input type="text" data-freze-camp="nota" value={ciorna.nota} placeholder={t('freze.nota.ajutor')} disabled={doarCitire}
                  aria-invalid={pNota ? true : undefined} aria-describedby={pNota ? 'freze-eroare-nota' : undefined} onChange={scrie('nota')} />
                {pNota ? <small className="freze-eroare" id="freze-eroare-nota">{textMotiv('nota', pNota)}</small> : null}
              </label>
              <label className="freze-camp freze-camp-lat">
                <span>{t('freze.grup')}</span>
                <input type="text" data-freze-camp="grup" list="freze-grupuri" value={ciorna.grup} placeholder={t('freze.grup.fara')} disabled={doarCitire}
                  aria-invalid={pGrup ? true : undefined} aria-describedby={pGrup ? 'freze-eroare-grup' : undefined} onChange={scrie('grup')} />
                <datalist id="freze-grupuri">{grupuri.map((g) => <option key={g} value={g} />)}</datalist>
                {pGrup ? <small className="freze-eroare" id="freze-eroare-grup">{textMotiv('grup', pGrup)}</small> : null}
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
                <button type="button" data-buton="renunta" data-freze="renunta"
                  disabled={vedere === 'configurator' && !schimbata && aleasa !== 'nou'} onClick={renunta}>{t('freze.renunta')}</button>
                {aleasa !== 'nou' && vedere === 'configurator' ? (
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
