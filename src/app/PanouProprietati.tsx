import { lazy, Suspense, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
// Calculul acțiunilor pe care le dă fereastra asta (`actiuniDocument.ts`, `laCerere`) vine cu ea, nu în pachetul de pornire.
import '../ui/actiuniDocumentCalcul.ts';
import '../i18n/carcasa.ts';
import '../i18n/export.ts';
import { t } from '../i18n/t.ts';
import { inaltimeConV, PLAFON, type Document, type FormaDoc, type Incrustatie, type Operatie, type Piesa } from '../model/document.ts';
import { susLaMicron, valoriBanda, valoriIncrustatie, valoriIncrustatieDreapta } from '../model/incrustatie.ts';
import { jsonCanonic } from '../model/jsonCanonic.ts';
import { materialFoaie, numeFoaie } from '../model/foi.ts';
import { folosiri, INCA_MAXIM, planCopii } from '../model/pieseLegate.ts';
import { blocuriPiesei, campuriPiesei } from '../model/placute.ts';
import type { RezultatPlacuta } from '../text/placute.ts';
import type { CerereText } from '../ui/actiuniDocument.ts';
import type { CampEticheta } from '../model/jurnal.ts';
import { dinParametri, LATURI_MAX, LATURI_MIN, parametri, type Parametri } from '../model/formeParametrice.ts';
import { ROLURI, roluriOferite, rolPiesei, type Rol } from '../model/rol.ts';
import { rolPersonalPiesei, type RolPersonal } from '../model/rolPersonal.ts';
import type { RezultatActiune } from '../ui/actiuni.ts';
import { PanouRoluri } from './PanouRoluri.tsx';
import { useRoluriMele } from './roluriMele.ts';
import { CampNumeric } from '../ui/CampNumeric.tsx';
import { CampText } from '../ui/CampText.tsx';
import { valoareDerivata } from '../ui/numar.ts';
import { useLimba } from '../ui/useLimba.ts';
import { mesajeGata } from '../i18n/laCerere.ts';

/** «Din CSV…» (ADR 0210 §4), adusă la primul clic: fereastra și cititorul tabelului nu stau în panou. */
const DialogCsv = lazy(() => import('./DialogCsv.tsx').then((m) => ({ default: m.DialogCsv })));

/** Mesajele modulului, ca date (ADR 0086): cine îl încarcă le așteaptă (`cuMesaje`); un refuz îl vede tot el. */
export const mesaje = mesajeGata();
mesaje.catch(() => undefined);

type Props = {
  readonly doc: Document;
  /** Foaia activă (ADR 0210 §1): a ei sunt selecția și câmpurile foii; piesele puse și pe alte foi se numără pe toate. */
  readonly indexFoaie?: number;
  /** Instanțele selectate care există pe foaie. */
  readonly alese: readonly string[];
  /** Elementele lor în lume, câte sunt, și cutia lor comună, în mm (le calculează deja aplicația, pentru pânză). */
  readonly elemente: number;
  readonly cutie: { readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number } | null;
  /** Fila doar citește (alta scrie proiectul): câmpurile sunt oprite, cu motivul. */
  readonly doarCitire: boolean;
  /** Acțiunile panoului (ADR 0038 §4), prin registru: rezultatul lor, cu motivul unui refuz. */
  readonly onPozitie: (p: { readonly x?: number; readonly y?: number }) => RezultatActiune;
  readonly onRotire: (r: number) => RezultatActiune;
  /** Forma nouă a singurei instanțe alese (ADR 0053): dreptunghiul, cercul, poligonul regulat, elipsa, editate după plasare. */
  readonly onForma: (f: FormaDoc) => RezultatActiune;
  readonly onStoc: (s: { readonly latime?: number; readonly inaltime?: number; readonly grosime?: number }) => RezultatActiune;
  /** Piesele puse de mai multe ori (ADR 0210 §2): «+1», «Încă…» (câte să fie în total) și «Desprinde», prin registru. */
  readonly onPlusUnu: () => RezultatActiune;
  readonly onInca: (total: number) => RezultatActiune;
  readonly onDesprinde: () => RezultatActiune;
  /**
   * Plăcuțele (ADR 0210 §4), prin acțiunea textului: valorile singurei plăcuțe alese, iar din «Din CSV…» textul șablonului și
   * plăcuțele unui tabel.
   */
  readonly onPlacuta?: (c: CerereText) => RezultatActiune;
  /** Numele sau materialul foii active (ADR 0210 §1); gol: fără. */
  readonly onEticheta: (camp: CampEticheta, valoare: string) => RezultatActiune;
  /** Rolul de tăiere al pieselor alese (ADR 0112), de bază sau personalizat (ADR 0114): le înlocuiește operațiile cu ale rolului. */
  readonly onRol: (r: Rol | RolPersonal) => RezultatActiune;
  /** Operațiile noi ale pieselor (după id-ul piesei): adâncimea sau pasul, scrise pe toate operațiile lor (ADR 0112 §6). */
  readonly onOperatii: (noi: ReadonlyMap<string, readonly Operatie[]>) => RezultatActiune;
  /** Deschide dialogul exportului, unde se schimbă restul valorilor operațiilor. */
  readonly onEditeazaOperatii: () => void;
};

/** Piesele instanțelor alese de pe foaie, fiecare o dată, în ordinea foii. */
function pieseAlese(doc: Document, alese: readonly string[], indexFoaie: number): Piesa[] {
  const ale = new Set(alese);
  const piese = new Map(doc.piese.map((p) => [p.id, p]));
  const rez = new Map<string, Piesa>();
  for (const i of doc.foi[indexFoaie]?.instante ?? []) {
    const p = ale.has(i.id) ? piese.get(i.piesa) : undefined;
    if (p) rez.set(p.id, p);
  }
  return [...rez.values()];
}

const mm = (x: number): string => x.toFixed(2);
/** Diametrul unei freze: cu a treia zecimală când o are (Ø3,175, 1/8″), altfel ca restul (Ø6.00). */
const mmFreza = (x: number): string => (x.toFixed(3).endsWith('0') ? x.toFixed(2) : x.toFixed(3));

/** De ce literele plăcuței nu s-au putut face, în cuvinte (fontul, cu numele lui). */
function motivPlacuta(r: Extract<RezultatPlacuta, { readonly ok: false }>): string {
  return r.motiv === 'font' ? t('prop.placuta.motiv.font', { font: r.font ?? '' }) : t(`prop.placuta.motiv.${r.motiv}`);
}

/** Un rând „etichetă: valoare”, doar de citit. */
const rand = (eticheta: string, valoare: ReactNode): ReactNode => (
  <div className="prop-rand" key={eticheta}><dt>{eticheta}</dt><dd>{valoare}</dd></div>
);

/** Coborârea unui buzunar, pe scurt (ADR 0076): felul și valorile lui. */
function coborare(c: Operatie['coborare']): string {
  if (!c || c.fel === 'plonjare') return t('export.coborare.plonjare');
  const nume = t(`export.coborare.${c.fel}`);
  if (c.fel === 'zigzag') return t('prop.coborare.zigzag', { nume, unghi: c.unghi, mm: mm(c.lungime) });
  if (c.fel === 'elice') return t('prop.coborare.elice', { nume, unghi: c.unghi, mm: mm(c.raza) });
  return t('prop.coborare.rampa', { nume, unghi: c.unghi });
}

function operatie(o: Operatie, n: number): ReactNode {
  return (
    <section key={o.id} className="prop-operatie">
      <h3>{t('prop.operatia', { n })}</h3>
      <dl>
        {rand(t('export.latura'), o.tip === 'buzunar' ? t(o.incrustatie?.fel === 'drept' ? 'export.latura.incrustatie-drept' : 'export.latura.buzunar')
          : o.tip === 'gaurire' ? t('export.latura.gaurire')
            : o.tip === 'vcarve' ? t(o.incrustatie?.fel === 'v' ? 'export.latura.incrustatie' : 'export.latura.vcarve') : t(`export.latura.${o.latura}`))}
        {o.tip === 'buzunar' && o.pasLateral !== undefined && rand(t('export.pas-lateral'), mm(o.pasLateral))}
        {o.tip === 'buzunar' && rand(t('export.paralel'), o.strategie ? t('prop.strategie.paralel', { unghi: o.strategie.unghi }) : t('export.paralel.inele'))}
        {o.tip === 'buzunar' && !o.strategie && rand(t('export.coborare'), coborare(o.coborare))}
        {o.tip === 'gaurire' && rand(t('export.gaurire.retragere'), String(o.retragereCompleta ?? 1))}
        {rand(t('export.sens'), t(`export.sens.${o.sens}`))}
        {rand(t('export.adancime'), mm(o.adancime))}
        {rand(t('export.pas'), mm(o.pas))}
        {rand(t('prop.freza'), o.scula.forma
          ? o.scula.forma.varf
            ? t('prop.freza.valoare-v-varf', { numar: o.scula.numar, unghi: o.scula.forma.unghi, diametru: mmFreza(o.scula.diametru), varf: mmFreza(o.scula.forma.varf) })
            : t('prop.freza.valoare-v', { numar: o.scula.numar, unghi: o.scula.forma.unghi, diametru: mmFreza(o.scula.diametru) })
          : t('prop.freza.valoare', { numar: o.scula.numar, diametru: mmFreza(o.scula.diametru) }))}
        {o.tip === 'profil' && o.latura === 'pe-linie' && rand(t('export.directie'), t(o.directie === 'invers' ? 'export.directie.invers' : o.directie === 'scurt' ? 'export.directie.scurt' : 'export.directie.desen'))}
        {o.tip === 'vcarve' && rand(t('prop.fund'), o.fundPlat
          ? t('prop.fund.valoare', { numar: o.fundPlat.scula.numar, diametru: mmFreza(o.fundPlat.scula.diametru), pas: mm(o.fundPlat.pasLateral) }) : t('prop.fara'))}
        {o.tip === 'vcarve' && o.incrustatie?.fel === 'v' && rand(t('prop.inc'), t('prop.inc.valoare', {
          joc: mm(o.incrustatie.joc), fierastrau: mm(o.incrustatie.fierastrau), margine: mm(o.incrustatie.margine),
        }))}
        {/* Lemnul din jurul dopului în V (ADR 0172): fața coborâtă sau banda îngustă. */}
        {o.tip === 'vcarve' && o.incrustatie?.fel === 'v' && rand(t('prop.inc.jur'), t(o.incrustatie.jurDop === 'banda' ? 'prop.inc.jur.banda' : 'prop.inc.jur.fata'))}
        {/* Incrustația cu pereți drepți (ADR 0171): jocul lateral, felul dopului și sprijinul lui, marginea; frezele dopului, dacă are. */}
        {o.tip === 'buzunar' && o.incrustatie?.fel === 'drept' && rand(t('prop.inc'), t('prop.inc.valoare-drept', {
          lateral: mm(o.incrustatie.jocLateral), margine: mm(o.incrustatie.margine),
          dop: t(o.incrustatie.dop === 'decupat' ? 'prop.inc.dop.decupat' : o.incrustatie.sprijin === 'fata' ? 'prop.inc.dop.ridicat-fata' : 'prop.inc.dop.ridicat-fund'),
        }))}
        {o.tip === 'buzunar' && o.incrustatie?.fel === 'drept' && (o.incrustatie.frezeDop ?? []).length > 0 && rand(t('prop.inc.freze-dop'),
          (o.incrustatie.frezeDop ?? []).map((r) => t('prop.rest.valoare', { numar: r.scula.numar, diametru: mmFreza(r.scula.diametru), pas: mm(r.pasLateral) })).join('; '))}
        {/* Frezele de rest (ADR 0093): ale buzunarului sau ale fundului plat. */}
        {((o.tip === 'buzunar' ? o.rest : o.tip === 'vcarve' ? o.fundPlat?.rest : undefined) ?? []).length > 0 && rand(t('prop.rest'),
          ((o.tip === 'buzunar' ? o.rest : o.fundPlat?.rest) ?? []).map((r) => t('prop.rest.valoare', { numar: r.scula.numar, diametru: mmFreza(r.scula.diametru), pas: mm(r.pasLateral) })).join('; '))}
        {rand(t('export.urechi'), o.urechi
          ? t('prop.urechi.valoare', { numar: o.urechi.numar, latime: mm(o.urechi.latime), grosime: mm(o.urechi.grosime) }) : t('prop.fara'))}
        {rand(t('export.rampa'), o.rampa ? t('prop.rampa.valoare', { mm: mm(o.rampa.lungime) }) : t('prop.fara'))}
        {rand(t('export.intrari'), o.intrari ? t('prop.intrari.valoare', { mm: mm(o.intrari.raza) }) : t('prop.fara'))}
        {rand(t('export.colturi'), o.colturi ? t(`export.colturi.${o.colturi.tip}`) : t('prop.fara'))}
      </dl>
    </section>
  );
}

/**
 * Panoul de proprietăți (prototipul B; editabil din felia 2.8c, ADR 0038 §4): fără selecție, foaia (lățimea, înălțimea,
 * grosimea); cu selecție, colțul stânga-jos al cutiei ei și, la o singură formă, rotirea și forma (ADR 0053: laturile, raza,
 * razele, laturile poligonului; o formă recunoscută din geometrie, fără câmp nou în document). Fiecare câmp aplică o acțiune a
 * registrului (un pas de anulare). Tăierea (ADR 0112): rolul pieselor alese, adâncimea și pasul tuturor operațiilor lor; restul
 * valorilor operațiilor se arată aici și se schimbă din dialogul exportului. Se încarcă la cerere.
 */
export function PanouProprietati({
  doc, indexFoaie = 0, alese, elemente, cutie, doarCitire, onPozitie, onRotire, onForma, onStoc, onEticheta, onRol, onOperatii, onEditeazaOperatii,
  onPlusUnu, onInca, onDesprinde, onPlacuta,
}: Props): ReactNode {
  useLimba();
  const roluriMele = useRoluriMele().roluri;
  // «Încă…» deschis: totul scris (text, ca omul să poată scrie liber), pentru instanța de atunci; și refuzul ultimului buton.
  const [inca, setInca] = useState<{ readonly cheie: string; readonly text: string } | null>(null);
  const [refuzPiesa, setRefuzPiesa] = useState<{ readonly cheie: string; readonly motiv: string } | null>(null);
  // Refuzul ultimului rol ales, pentru selecția de atunci; la fel, al lemnului din jurul dopului ales.
  const [refuzRol, setRefuzRol] = useState<{ readonly cheie: string; readonly motiv: string } | null>(null);
  const [refuzJur, setRefuzJur] = useState<{ readonly cheie: string; readonly motiv: string } | null>(null);
  // Literele plăcuței în lucru (fontul se aduce) sau refuzul lor, pentru selecția de atunci (ADR 0210 §4); «Din CSV…»
  // deschisă (pentru selecția de atunci) și ce a făcut ultima ei rulare.
  const [placuta, setPlacuta] = useState<{ readonly cheie: string; readonly motiv: string | null } | null>(null);
  const [csv, setCsv] = useState<string | null>(null);
  const [rezultatCsv, setRezultatCsv] = useState<{ readonly cheie: string; readonly mesaj: string } | null>(null);
  const foaie = doc.foi[indexFoaie];
  const instanta = alese.length === 1 ? foaie?.instante.find((i) => i.id === alese[0]) : undefined;
  const piesa = instanta ? doc.piese.find((p) => p.id === instanta.piesa) : undefined;
  // Câmpurile țin minte textul scris; la altă selecție pornesc de la zero.
  const cheie = alese.join(',');
  const oprit = doarCitire ? t('motiv.doar-citire') : undefined;
  const camp = (eticheta: string, numeCamp: string, valoare: number | null, unitate: string, semn: boolean, onAplica: (x: number) => RezultatActiune): ReactNode => (
    <CampNumeric key={`${cheie}/${numeCamp}`} eticheta={eticheta} camp={numeCamp} valoare={valoare} unitate={unitate} semn={semn}
      dezactivat={doarCitire} {...(oprit ? { titlu: oprit } : {})} onAplica={onAplica} />
  );

  // Forma singurei instanțe alese, dacă piesa ei e un singur element cu parametri (ADR 0053).
  const forma = instanta && piesa?.radacina.tip === 'element' ? piesa.radacina.forma : null;
  const par = forma ? parametri(forma) : null;
  const schimba = (p: Parametri): RezultatActiune => onForma(dinParametri(p));
  const campForma = (eticheta: string, numeCamp: string, valoare: number, unitate: string, onAplica: (x: number) => RezultatActiune): ReactNode =>
    rand(eticheta, camp(eticheta, numeCamp, valoareDerivata(valoare), unitate, false, onAplica));
  const campuriForma = (p: Parametri): ReactNode => {
    switch (p.tip) {
      case 'dreptunghi':
        return [
          campForma(t('prop.forma.latime'), 'forma-latime', p.latime, 'mm', (x) => schimba({ ...p, latime: x })),
          campForma(t('prop.forma.inaltime'), 'forma-inaltime', p.inaltime, 'mm', (x) => schimba({ ...p, inaltime: x })),
          campForma(t('prop.forma.raza-colt'), 'forma-raza-colt', p.razaColt, 'mm', (x) => schimba({ ...p, razaColt: x })),
        ];
      case 'cerc':
        return campForma(t('prop.forma.raza'), 'forma-raza', p.raza, 'mm', (x) => schimba({ ...p, raza: x }));
      case 'poligon':
        return [
          campForma(t('prop.forma.laturi'), 'forma-laturi', p.laturi, '', (n) => (Number.isInteger(n) && n >= LATURI_MIN && n <= LATURI_MAX
            ? schimba({ ...p, laturi: n }) : { ok: false, motiv: 'prop.forma.refuzata' })),
          campForma(t('prop.forma.raza'), 'forma-raza', p.raza, 'mm', (x) => schimba({ ...p, raza: x })),
        ];
      case 'elipsa':
        return [
          campForma(t('prop.forma.rx'), 'forma-rx', p.rx, 'mm', (x) => schimba({ ...p, rx: x })),
          campForma(t('prop.forma.ry'), 'forma-ry', p.ry, 'mm', (y) => schimba({ ...p, ry: y })),
        ];
    }
  };

  // Tăierea (ADR 0112): rolul pieselor alese (doar rolurile care se potrivesc tuturor), adâncimea și pasul tuturor operațiilor
  // lor; cu valori diferite, câmpul e gol, iar lista arată „—”. Sub rolurile de bază, rolurile omului (ADR 0114 §4) al căror
  // rol de bază se potrivește; arătat e rolul personalizat al tuturor pieselor, dacă au unul (§6), altfel cel de bază.
  const piese = pieseAlese(doc, alese, indexFoaie);
  const oferite = ROLURI.filter((r) => piese.length > 0 && piese.every((p) => roluriOferite(p).includes(r)));
  const roluri = piese.map(rolPiesei);
  const rolComun = roluri.length > 0 && roluri.every((r) => r !== null && r === roluri[0]) ? roluri[0] ?? null : null;
  const oferitePersonale = roluriMele.filter((r) => oferite.includes(r.baza));
  const personale = rolComun === null ? [] : piese.map((p) => rolPersonalPiesei(p, oferitePersonale));
  const personalComun = personale.length > 0 && personale.every((r) => r !== null && r.id === personale[0]?.id) ? personale[0] ?? null : null;
  const valoareRol = personalComun ? `p:${personalComun.id}` : rolComun ?? '';
  const operatiiAlese = piese.flatMap((p) => p.operatii);
  const comun = (f: (o: Operatie) => number): number | null => {
    const prima = operatiiAlese[0];
    return prima && operatiiAlese.every((o) => f(o) === f(prima)) ? f(prima) : null;
  };
  // O piesă cu mai multe copii își schimbă rolul pentru toate (operațiile sunt ale piesei).
  const copii = piese.reduce((n, p) => n + doc.foi.reduce((m, f) => m + f.instante.filter((i) => i.piesa === p.id).length, 0), 0) > alese.length;
  const scrieValori = (v: { readonly adancime?: number; readonly pas?: number }): RezultatActiune =>
    onOperatii(new Map(piese.map((p) => [p.id, p.operatii.map((o) => ({ ...o, ...v }))])));
  // Incrustația (ADR 0170 §5): când toate operațiile alese sunt incrustații, jocurile și marginea lor se scriu de aici, pe toate
  // (îmbinate: un câmp necunoscut rămâne); secțiunea pe hârtie apare când valorile lor sunt aceleași.
  const incrustatii = operatiiAlese.length > 0 && operatiiAlese.every((o) => o.tip === 'vcarve' && o.incrustatie?.fel === 'v');
  const comunInc = (f: (i: Incrustatie) => number): number | null => comun((o) => (o.incrustatie ? f(o.incrustatie) : Number.NaN));
  const scrieIncrustatie = (v: { readonly joc?: number; readonly fierastrau?: number; readonly margine?: number; readonly jocLateral?: number }): RezultatActiune =>
    onOperatii(new Map(piese.map((p) => [p.id, p.operatii.map((o) => (o.incrustatie ? { ...o, incrustatie: { ...o.incrustatie, ...v } } : o))])));
  // Lemnul din jurul dopului în V (ADR 0172), ales și de aici (punctul 3 de după unirea lui 12.1↑c): fața coborâtă sau banda,
  // pe toate incrustațiile în V alese. Banda scrisă rămâne în document (o întoarcere o găsește, iar Exportă o scoate pe fața
  // coborâtă); fără ea, banda implicită. Cu valori diferite, lista arată „—”.
  const jururi = operatiiAlese.map((o) => (o.incrustatie?.fel === 'v' ? o.incrustatie.jurDop : null));
  const jurComun = incrustatii && jururi.every((j) => j === jururi[0]) ? jururi[0] ?? null : null;
  const alegeJur = (jur: 'fata' | 'banda'): void => {
    const rez = onOperatii(new Map(piese.map((p) => [p.id, p.operatii.map((o) => (o.incrustatie?.fel === 'v' ? { ...o, incrustatie: { ...o.incrustatie, jurDop: jur } } : o))])));
    setRefuzJur(rez.ok ? null : { cheie, motiv: t(rez.motiv) });
  };
  // Incrustația cu pereți drepți (ADR 0171 §5): la fel, jocul lateral, spațiul folosit (H pe fund și la decupat, g pe față) și
  // marginea; dopul, sprijinul și frezele lui se aleg în fereastra exportului (răspunsurile 1, 2 și 4).
  const dreptOp = (o: Operatie) => (o.tip === 'buzunar' && o.incrustatie?.fel === 'drept' ? o.incrustatie : null);
  const drepte = operatiiAlese.length > 0 && operatiiAlese.every((o) => dreptOp(o) !== null);
  const folosesteH = (o: Operatie): boolean => ((i) => i !== null && (i.dop === 'decupat' || i.sprijin === 'fund'))(dreptOp(o));
  const toateH = drepte && operatiiAlese.every(folosesteH), toateG = drepte && !operatiiAlese.some(folosesteH);
  const toateDecupate = drepte && operatiiAlese.every((o) => dreptOp(o)?.dop === 'decupat');
  const primaDreapta = drepte ? operatiiAlese[0] : undefined;
  const cheieHartie = (o: Operatie): string => jsonCanonic({
    adancime: o.adancime, diametru: o.scula.diametru, rest: (o.rest ?? []).map((r) => r.scula.diametru), incrustatie: o.incrustatie ?? null,
  });
  const hartieDreapta = primaDreapta && operatiiAlese.every((o) => cheieHartie(o) === cheieHartie(primaDreapta)) ? valoriIncrustatieDreapta(primaDreapta) : null;
  const incDreapta = primaDreapta ? dreptOp(primaDreapta) : null;
  const primaInc = incrustatii ? operatiiAlese[0] : undefined;
  const hartie = primaInc && operatiiAlese.every((o) => o.adancime === primaInc.adancime && o.scula.diametru === primaInc.scula.diametru
    && o.scula.forma?.unghi === primaInc.scula.forma?.unghi && o.incrustatie?.joc === primaInc.incrustatie?.joc
    && o.incrustatie?.fierastrau === primaInc.incrustatie?.fierastrau) ? valoriIncrustatie(primaInc) : null;
  const con = primaInc?.scula.forma?.tip === 'v' ? inaltimeConV(primaInc.scula.diametru, primaInc.scula.forma.unghi) : null;
  // Banda (ADR 0172), pe hârtie: doar cu aceeași incrustație și același fund plat pe toate operațiile alese.
  const hartieBanda = hartie && primaInc && operatiiAlese.every((o) => jsonCanonic(o.incrustatie ?? null) === jsonCanonic(primaInc.incrustatie ?? null)
    && o.fundPlat?.scula.diametru === primaInc.fundPlat?.scula.diametru) ? valoriBanda(primaInc) : null;
  // Piesa singurei instanțe alese (ADR 0210 §2): de câte ori e pusă, pe ce foi, și unde ar ajunge copiile lui «Încă…».
  const sablonFoaie = (n: number): string => t('foaia.n', { n: String(n) });
  const pusa = piesa ? folosiri(doc).get(piesa.id) ?? 0 : 0;
  const peFoi = piesa && pusa > 1 ? doc.foi.flatMap((f, k) => {
    const c = f.instante.filter((i) => i.piesa === piesa.id).length;
    return c > 0 ? [`${numeFoaie(f, k, sablonFoaie)}: ${c}`] : [];
  }).join(' · ') : '';
  const totalInca = inca?.cheie === cheie && /^\d{1,4}$/.test(inca.text.trim()) ? Number(inca.text.trim()) : null;
  const planInca = instanta && totalInca !== null && totalInca > pusa && totalInca <= INCA_MAXIM ? planCopii(doc, instanta.id, totalInca - pusa) : null;
  const undeInca = planInca?.ok ? [
    ...doc.foi.flatMap((f, k) => {
      const c = planInca.locuri.filter((l) => l.foaie === f.id).length;
      return c > 0 ? [t('prop.piesa.inca.pe', { k: String(c), foaie: numeFoaie(f, k, sablonFoaie) })] : [];
    }),
    ...(planInca.foiNoi > 0 ? [t('prop.piesa.inca.noi', { n: planInca.foiNoi, k: String(planInca.locuri.filter((l) => typeof l.foaie === 'number').length) })] : []),
  ].join(', ') : '';
  const butonPiesa = (r: RezultatActiune): void => { setRefuzPiesa(r.ok ? null : { cheie, motiv: t(r.motiv) }); };
  const adaugaInca = (): void => {
    if (totalInca === null) return;
    const r = onInca(totalInca);
    butonPiesa(r);
    if (r.ok) setInca(null);
  };
  // Plăcuța (ADR 0210 §4): câmpurile din textul piesei, cu valorile instanței alese. O valoare nouă cere literele ei, din
  // fontul fiecărui text (adus la cerere, cu modulul textului), apoi acțiunea textului le scrie într-un pas.
  const campuriSablon = instanta && piesa ? campuriPiesei(piesa) : [];
  const scrieValoare = (nume: string, text: string): RezultatActiune => {
    if (!instanta || !piesa || !onPlacuta) return { ok: false, motiv: 'motiv.nimic-ales' };
    const valori = { ...(instanta.campuri ?? {}), [nume]: text.trim() };
    const [k, inst, p] = [cheie, instanta, piesa];
    setPlacuta({ cheie: k, motiv: null });
    import('../text/calcul.ts').then((m) => m.textePlacuteiCuFonturi(p, valori)).then((r) => {
      if (!r.ok) {
        setPlacuta({ cheie: k, motiv: motivPlacuta(r) });
        return;
      }
      const rez = onPlacuta({ fel: 'placuta', instanta: inst.id, piesa: p, campuri: r.campuri, texte: r.texte });
      setPlacuta(rez.ok ? null : { cheie: k, motiv: t(rez.motiv) });
    }, () => { setPlacuta({ cheie: k, motiv: t('prop.placuta.motiv.modul') }); });
    return { ok: true };
  };
  const alegeRol = (r: Rol | RolPersonal): void => {
    const rez = onRol(r);
    setRefuzRol(rez.ok ? null : { cheie, motiv: t(rez.motiv) });
  };

  return (
    <div className="proprietati">
      <h2>{t('prop.titlu')}</h2>
      <p className="prop-nota">{t('prop.nota')}</p>
      {alese.length === 0 && foaie && (
        <section>
          <h3>{t('prop.foaia')}</h3>
          <dl>
            {/* Numele și materialul (ADR 0210 §1): fără nume, foaia se cheamă după locul ei („Foaia 2”), arătat ca exemplu. */}
            {rand(t('prop.foaia.nume'), <CampText key={`${foaie.id}/nume`} eticheta={t('prop.foaia.nume')} camp="foaie-nume" valoare={foaie.nume ?? ''}
              exemplu={numeFoaie({ id: foaie.id }, indexFoaie, (n) => t('foaia.n', { n: String(n) }))} lungime={PLAFON.numeLungime}
              dezactivat={doarCitire} {...(oprit ? { titlu: oprit } : {})} onAplica={(x) => onEticheta('nume', x)} />)}
            {rand(t('prop.foaia.material'), <CampText key={`${foaie.id}/material`} eticheta={t('prop.foaia.material')} camp="foaie-material"
              valoare={materialFoaie(foaie) ?? ''} exemplu={t('prop.foaia.material.exemplu')} lungime={PLAFON.numeLungime}
              dezactivat={doarCitire} {...(oprit ? { titlu: oprit } : {})} onAplica={(x) => onEticheta('material', x)} />)}
            {rand(t('prop.latimea'), camp(t('prop.latimea'), 'foaie-latime', foaie.stoc.latime, 'mm', false, (x) => onStoc({ latime: x })))}
            {rand(t('prop.inaltimea'), camp(t('prop.inaltimea'), 'foaie-inaltime', foaie.stoc.inaltime, 'mm', false, (x) => onStoc({ inaltime: x })))}
            {rand(t('prop.grosimea'), camp(t('prop.grosimea'), 'foaie-grosime', foaie.stoc.grosime, 'mm', false, (x) => onStoc({ grosime: x })))}
            {rand(t('prop.forme'), foaie.instante.length)}
          </dl>
        </section>
      )}
      {alese.length > 1 && <p className="prop-multi">{t('prop.selectate', { n: alese.length })}</p>}
      {alese.length > 0 && (
        <section>
          {instanta && <h3>{piesa?.nume ?? piesa?.id ?? instanta.id}</h3>}
          {cutie && <p className="prop-grup">{t('prop.colt')}</p>}
          <dl>
            {cutie && rand('X', camp(`${t('prop.colt')}, X`, 'pozitie-x', valoareDerivata(cutie.minX), 'mm', true, (x) => onPozitie({ x })))}
            {cutie && rand('Y', camp(`${t('prop.colt')}, Y`, 'pozitie-y', valoareDerivata(cutie.minY), 'mm', true, (y) => onPozitie({ y })))}
            {instanta && rand(t('prop.rotirea'), camp(t('prop.rotirea'), 'rotire', instanta.rotire, '°', true, onRotire))}
            {cutie && rand(t('prop.cutia'), t('prop.mm2', { latime: mm(cutie.maxX - cutie.minX), inaltime: mm(cutie.maxY - cutie.minY) }))}
            {rand(t('prop.elemente'), elemente)}
          </dl>
        </section>
      )}
      {instanta && piesa && (
        <section data-testid="prop-piesa" className={pusa > 1 ? 'prop-piesa legata' : 'prop-piesa'}>
          <h3>{t('prop.piesa')}</h3>
          <p className="prop-nota-piesa" data-pusa={pusa}>{t('prop.piesa.pusa', { n: pusa })}{peFoi ? ` (${peFoi})` : ''}</p>
          <div className="prop-butoane">
            <button type="button" data-buton="plus-unu" disabled={doarCitire} {...(oprit ? { title: oprit } : {})} onClick={() => { butonPiesa(onPlusUnu()); }}>
              {t('actiune.plus-unu')}
            </button>
            <button type="button" data-buton="inca" aria-expanded={inca?.cheie === cheie} disabled={doarCitire} {...(oprit ? { title: oprit } : {})}
              onClick={() => { setInca(inca?.cheie === cheie ? null : { cheie, text: String(Math.min(INCA_MAXIM, Math.max(2, pusa + 1))) }); }}>
              {t('actiune.inca')}
            </button>
            {/* O plăcuță (ADR 0210 §4) se desprinde și singură: piesa ei primește literele ei, cu textul ei obișnuit. */}
            {(pusa > 1 || !!instanta.texte) && (
              <button type="button" className="violet" data-buton="desprinde" disabled={doarCitire} {...(oprit ? { title: oprit } : {})}
                onClick={() => { butonPiesa(onDesprinde()); }}>
                {t('actiune.desprinde')}
              </button>
            )}
          </div>
          {inca?.cheie === cheie && (
            <div className="prop-inca" data-testid="prop-inca">
              <label>
                {t('prop.piesa.inca')}
                <input type="text" inputMode="numeric" autoComplete="off" data-camp="inca-total" value={inca.text}
                  onChange={(e) => { setInca({ cheie, text: e.target.value }); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adaugaInca(); } else if (e.key === 'Escape') { e.preventDefault(); setInca(null); } }} />
              </label>
              <p className="prop-nota-piesa">{totalInca !== null && totalInca > pusa
                ? t('prop.piesa.inca.acum', { n: String(pusa), m: String(totalInca - pusa) }) : t('motiv.inca-total')}</p>
              {undeInca && <p className="prop-nota-piesa" data-testid="inca-unde">{undeInca}</p>}
              <div className="prop-butoane">
                <button type="button" data-buton="inca-adauga" disabled={totalInca === null || totalInca <= pusa || !planInca?.ok} onClick={adaugaInca}>
                  {t('prop.piesa.inca.adauga', { n: totalInca !== null && totalInca > pusa ? totalInca - pusa : 0 })}
                </button>
                <button type="button" data-buton="inca-renunta" onClick={() => { setInca(null); }}>{t('lista.renunta')}</button>
              </div>
            </div>
          )}
          {refuzPiesa?.cheie === cheie && <p className="camp-motiv" role="alert" data-motiv="piesa">{refuzPiesa.motiv}</p>}
          {/* «Din CSV…» (ADR 0210 §4): pe o piesă cu un text, câte o plăcuță pe rândul unui tabel. */}
          {blocuriPiesei(piesa).length > 0 && onPlacuta && (
            <div className="prop-butoane">
              <button type="button" data-buton="din-csv" disabled={doarCitire} {...(oprit ? { title: oprit } : { title: t('prop.placuta.csv.nota') })}
                onClick={() => { setRezultatCsv(null); setCsv(cheie); }}>
                {t('prop.placuta.csv')}
              </button>
            </div>
          )}
          {csv === cheie && onPlacuta && createPortal(
            <Suspense fallback={null}>
              <DialogCsv doc={doc} indexFoaie={indexFoaie} instanta={instanta} piesa={piesa} doarCitire={doarCitire} onCerere={onPlacuta}
                onGata={(mesaj) => { setCsv(null); setRezultatCsv({ cheie, mesaj }); }} onInchide={() => { setCsv(null); }} />
            </Suspense>,
            document.body,
          )}
        </section>
      )}
      {instanta && campuriSablon.length > 0 && (
        <section data-testid="prop-placuta" className="prop-placuta">
          <h3>{t('prop.placuta')}</h3>
          <p className="prop-nota-piesa">{t('prop.placuta.nota', { camp: campuriSablon.map((c) => `{${c}}`).join(', ') })}</p>
          <dl>
            {campuriSablon.map((c) => rand(c, (
              <CampText key={`${cheie}/placuta/${c}`} eticheta={c} camp={`placuta-${c}`} valoare={instanta.campuri && Object.hasOwn(instanta.campuri, c) ? instanta.campuri[c] ?? '' : ''} exemplu={`{${c}}`}
                lungime={PLAFON.campLungime} dezactivat={doarCitire || !onPlacuta} {...(oprit ? { titlu: oprit } : {})} onAplica={(x) => scrieValoare(c, x)} />
            )))}
          </dl>
          {placuta?.cheie === cheie && placuta.motiv === null && <p className="prop-nota-piesa" data-testid="placuta-face">{t('prop.placuta.face')}</p>}
          {placuta?.cheie === cheie && placuta.motiv !== null && <p className="camp-motiv" role="alert" data-motiv="placuta">{placuta.motiv}</p>}
          {rezultatCsv?.cheie === cheie && <p className="prop-nota-piesa" role="status" data-testid="placuta-csv">{rezultatCsv.mesaj}</p>}
        </section>
      )}
      {par && (
        <section data-testid="prop-forma" data-forma={par.tip}>
          <h3>{t(`prop.forma.${par.tip}`)}</h3>
          <dl>{campuriForma(par)}</dl>
        </section>
      )}
      {oferite.length > 0 && (
        <section data-testid="prop-taierea">
          <h3>{t('prop.taierea')}</h3>
          <dl>
            {rand(t('prop.rol'), (
              <select value={valoareRol} data-camp="rol" aria-label={t('prop.rol')} disabled={doarCitire} {...(oprit ? { title: oprit } : {})}
                onChange={(ev) => {
                  const v = ev.target.value;
                  const r = oferite.find((x) => x === v) ?? oferitePersonale.find((x) => `p:${x.id}` === v);
                  if (r) alegeRol(r);
                }}>
                {rolComun === null && <option value="" disabled>{t('prop.rol.diferite')}</option>}
                {oferite.map((r) => <option key={r} value={r}>{t(`export.latura.${r}`)}</option>)}
                {oferitePersonale.length > 0 && (
                  <optgroup label={t('prop.rol.mele')}>
                    {oferitePersonale.map((r) => <option key={r.id} value={`p:${r.id}`}>{r.nume}</option>)}
                  </optgroup>
                )}
              </select>
            ))}
            {operatiiAlese.length > 0 && rand(t('prop.adancime'), camp(t('prop.adancime'), 'adancime', comun((o) => o.adancime), 'mm', false, (x) => scrieValori({ adancime: x })))}
            {operatiiAlese.length > 0 && rand(t('prop.pas'), camp(t('prop.pas'), 'pas', comun((o) => o.pas), 'mm', false, (x) => scrieValori({ pas: x })))}
            {incrustatii && rand(t('prop.inc.joc'), camp(t('prop.inc.joc'), 'inc-joc', comunInc((i) => i.joc), 'mm', false, (x) => scrieIncrustatie({ joc: x })))}
            {incrustatii && rand(t('prop.inc.fierastrau'), camp(t('prop.inc.fierastrau'), 'inc-fierastrau', comunInc((i) => i.fierastrau), 'mm', false,
              (x) => scrieIncrustatie({ fierastrau: x })))}
            {incrustatii && rand(t('prop.inc.margine'), camp(t('prop.inc.margine'), 'inc-margine', comunInc((i) => i.margine), 'mm', false,
              (x) => scrieIncrustatie({ margine: x })))}
            {incrustatii && rand(t('prop.inc.jur'), (
              <select key={`${cheie}/inc-jur`} value={jurComun ?? ''} data-camp="inc-jur" aria-label={t('prop.inc.jur')} disabled={doarCitire}
                {...(oprit ? { title: oprit } : {})}
                onChange={(ev) => { if (ev.target.value === 'fata' || ev.target.value === 'banda') alegeJur(ev.target.value); }}>
                {jurComun === null && <option value="" disabled>{t('prop.rol.diferite')}</option>}
                <option value="fata">{t('prop.inc.jur.fata')}</option>
                <option value="banda">{t('prop.inc.jur.banda')}</option>
              </select>
            ))}
            {drepte && rand(t('prop.inc.lateral'), camp(t('prop.inc.lateral'), 'inc-lateral', comunInc((i) => (i.fel === 'drept' ? i.jocLateral : Number.NaN)), 'mm', false,
              (x) => scrieIncrustatie({ jocLateral: x })))}
            {toateH && rand(t(toateDecupate ? 'prop.inc.peste' : 'prop.inc.fierastrau'), camp(t(toateDecupate ? 'prop.inc.peste' : 'prop.inc.fierastrau'), 'inc-fierastrau',
              comunInc((i) => i.fierastrau), 'mm', false, (x) => scrieIncrustatie({ fierastrau: x })))}
            {toateG && rand(t('prop.inc.joc'), camp(t('prop.inc.joc'), 'inc-joc', comunInc((i) => i.joc), 'mm', false, (x) => scrieIncrustatie({ joc: x })))}
            {drepte && rand(t('prop.inc.margine'), camp(t('prop.inc.margine'), 'inc-margine', comunInc((i) => i.margine), 'mm', false,
              (x) => scrieIncrustatie({ margine: x })))}
          </dl>
          {hartie && primaInc?.incrustatie && (
            <div className="prop-hartie" data-testid="prop-incrustatie-hartie">
              <p className="prop-grup">{t('prop.inc.hartie')}</p>
              <dl>
                {rand(t('prop.inc.intra'), t('prop.inc.intra.valoare', { mm: mm(hartie.S) }))}
                {rand(t('prop.inc.contact'), t('prop.inc.contact.valoare', { mm: mm(hartie.contact) }))}
                {rand(t('prop.inc.clei'), t('prop.inc.mm', { mm: mm(primaInc.incrustatie.joc) }))}
                {rand(t('prop.inc.placi'), t('prop.inc.mm', { mm: mm(hartie.H) }))}
                {con !== null && rand(t('prop.inc.con'), t('prop.inc.con.valoare', { folosit: mm(Math.max(primaInc.adancime, hartie.fata)), con: mm(con) }))}
                {/* Banda (ADR 0172): lățimea și cea mai mică, semifabricatul în plan, decuparea (placa exactă, punțile) sau tăietura de mână. */}
                {hartieBanda && rand(t('prop.inc.banda'), t('prop.inc.banda.valoare', { latime: mm(hartieBanda.latime), minima: mm(susLaMicron(hartieBanda.minima)) }))}
                {hartieBanda && rand(t('prop.inc.banda.semifabricat'), t('prop.inc.banda.semifabricat.valoare', { mm: mm(hartieBanda.margine) }))}
                {hartieBanda && rand(t('prop.inc.decupare'), hartieBanda.decupare
                  ? t('prop.inc.decupare.valoare', { placa: mm(hartieBanda.placa), punti: hartieBanda.punti.numar, latime: mm(hartieBanda.punti.latime), grosime: mm(hartieBanda.punti.grosime) })
                  : t('prop.inc.decupare.fara', { e: mm(hartieBanda.e) }))}
                {rand(t('prop.inc.semifabricat'), hartieBanda?.decupare
                  ? t('prop.inc.semifabricat.exact', { mm: mm(hartieBanda.placa) }) : t('prop.inc.semifabricat.valoare', { mm: mm(hartie.grosimeMinima) }))}
              </dl>
            </div>
          )}
          {/* Pe hârtie, pereții drepți (ADR 0171 §5): razele colțurilor, jocul, înălțimea dopului, spațiul folosit, semifabricatul. */}
          {hartieDreapta && incDreapta && (
            <div className="prop-hartie" data-testid="prop-incrustatie-hartie" data-fel="drept">
              <p className="prop-grup">{t('prop.inc.hartie')}</p>
              <dl>
                {rand(t('prop.inc.colturi-locas'), t('prop.inc.colturi.valoare', { varf: mm(hartieDreapta.rLocas), unghi: mm(hartieDreapta.rho) }))}
                {rand(t('prop.inc.colturi-dop'), t('prop.inc.colturi.valoare', { varf: mm(hartieDreapta.varfDop), unghi: mm(hartieDreapta.unghiDop) }))}
                {rand(t('prop.inc.joc-contur'), t('prop.inc.mm', { mm: mm(hartieDreapta.c) }))}
                {rand(t('prop.inc.inaltime'), t('prop.inc.mm', { mm: mm(hartieDreapta.inaltime) }))}
                {incDreapta.dop === 'ridicat' && incDreapta.sprijin === 'fata'
                  ? rand(t('prop.inc.clei'), t('prop.inc.mm', { mm: mm(incDreapta.joc) }))
                  : rand(t(incDreapta.dop === 'decupat' ? 'prop.inc.peste' : 'prop.inc.placi'), t('prop.inc.mm', { mm: mm(incDreapta.fierastrau) }))}
                {rand(t('prop.inc.semifabricat'), t(incDreapta.dop === 'decupat' ? 'prop.inc.semifabricat.exact' : 'prop.inc.semifabricat.valoare', { mm: mm(hartieDreapta.grosime) }))}
              </dl>
            </div>
          )}
          {copii && <p className="prop-nota">{t('prop.rol.copii')}</p>}
          {refuzRol?.cheie === cheie && <p className="camp-motiv" role="alert" data-motiv="rol">{refuzRol.motiv}</p>}
          {refuzJur?.cheie === cheie && <p className="camp-motiv" role="alert" data-motiv="inc-jur">{refuzJur.motiv}</p>}
          <PanouRoluri piese={piese} cheie={cheie} />
        </section>
      )}
      {piesa?.operatii.map((o, i) => operatie(o, i + 1))}
      {piesa && piesa.operatii.length > 0 && (
        <button type="button" className="prop-export" data-buton="editeaza-export" onClick={onEditeazaOperatii}>{t('prop.editeaza-export')}</button>
      )}
    </div>
  );
}
