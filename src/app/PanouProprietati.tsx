import type { ReactNode } from 'react';
// Calculul acțiunilor pe care le dă fereastra asta (`actiuniDocument.ts`, `laCerere`) vine cu ea, nu în pachetul de pornire.
import '../ui/actiuniDocumentCalcul.ts';
import '../i18n/carcasa.ts';
import '../i18n/export.ts';
import { t } from '../i18n/t.ts';
import type { Document, FormaDoc, Operatie } from '../model/document.ts';
import { dinParametri, LATURI_MAX, LATURI_MIN, parametri, type Parametri } from '../model/formeParametrice.ts';
import type { RezultatActiune } from '../ui/actiuni.ts';
import { CampNumeric } from '../ui/CampNumeric.tsx';
import { valoareDerivata } from '../ui/numar.ts';
import { useLimba } from '../ui/useLimba.ts';
import { mesajeGata } from '../i18n/laCerere.ts';

/** Mesajele modulului, ca date (ADR 0086): cine îl încarcă le așteaptă (`cuMesaje`); un refuz îl vede tot el. */
export const mesaje = mesajeGata();
mesaje.catch(() => undefined);

type Props = {
  readonly doc: Document;
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
  /** Deschide dialogul exportului, unde se schimbă operațiile. */
  readonly onEditeazaOperatii: () => void;
};

const mm = (x: number): string => x.toFixed(2);

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
        {rand(t('export.latura'), o.tip === 'buzunar' ? t('export.latura.buzunar') : o.tip === 'gaurire' ? t('export.latura.gaurire') : o.tip === 'vcarve' ? t('export.latura.vcarve') : t(`export.latura.${o.latura}`))}
        {o.tip === 'buzunar' && o.pasLateral !== undefined && rand(t('export.pas-lateral'), mm(o.pasLateral))}
        {o.tip === 'buzunar' && rand(t('export.coborare'), coborare(o.coborare))}
        {o.tip === 'gaurire' && rand(t('export.gaurire.retragere'), String(o.retragereCompleta ?? 1))}
        {rand(t('export.sens'), t(`export.sens.${o.sens}`))}
        {rand(t('export.adancime'), mm(o.adancime))}
        {rand(t('export.pas'), mm(o.pas))}
        {rand(t('prop.freza'), o.scula.forma ? t('prop.freza.valoare-v', { numar: o.scula.numar, unghi: o.scula.forma.unghi, diametru: mm(o.scula.diametru) })
          : t('prop.freza.valoare', { numar: o.scula.numar, diametru: mm(o.scula.diametru) }))}
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
 * registrului (un pas de anulare). Operațiile se arată și se schimbă din dialogul exportului. Se încarcă la cerere.
 */
export function PanouProprietati({ doc, alese, elemente, cutie, doarCitire, onPozitie, onRotire, onForma, onStoc, onEditeazaOperatii }: Props): ReactNode {
  useLimba();
  const foaie = doc.foi[0];
  const instanta = alese.length === 1 ? foaie?.instante.find((i) => i.id === alese[0]) : undefined;
  const piesa = instanta ? doc.piese.find((p) => p.id === instanta.piesa) : undefined;
  // Câmpurile țin minte textul scris; la altă selecție pornesc de la zero.
  const cheie = alese.join(',');
  const oprit = doarCitire ? t('motiv.doar-citire') : undefined;
  const camp = (eticheta: string, numeCamp: string, valoare: number, unitate: string, semn: boolean, onAplica: (x: number) => RezultatActiune): ReactNode => (
    <CampNumeric key={`${cheie}/${numeCamp}`} eticheta={eticheta} camp={numeCamp} valoare={valoare} unitate={unitate} semn={semn}
      dezactivat={doarCitire} {...(oprit ? { titlu: oprit } : {})} onAplica={onAplica} />
  );

  // Forma singurei instanțe alese, dacă piesa ei e un singur element cu parametri (ADR 0053).
  const forma = instanta && piesa?.radacina.tip === 'element' ? piesa.radacina.forma : null;
  const par = forma ? parametri(forma) : null;
  const impartita = piesa ? doc.foi.reduce((n, f) => n + f.instante.filter((i) => i.piesa === piesa.id).length, 0) > 1 : false;
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

  return (
    <div className="proprietati">
      <h2>{t('prop.titlu')}</h2>
      <p className="prop-nota">{t('prop.nota')}</p>
      {alese.length === 0 && foaie && (
        <section>
          <h3>{t('prop.foaia')}</h3>
          <dl>
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
      {par && (
        <section data-testid="prop-forma" data-forma={par.tip}>
          <h3>{t(`prop.forma.${par.tip}`)}</h3>
          {impartita ? <p className="prop-nota">{t('prop.forma.impartita')}</p> : <dl>{campuriForma(par)}</dl>}
        </section>
      )}
      {piesa?.operatii.map((o, i) => operatie(o, i + 1))}
      {piesa && piesa.operatii.length > 0 && (
        <button type="button" className="prop-export" data-buton="editeaza-export" onClick={onEditeazaOperatii}>{t('prop.editeaza-export')}</button>
      )}
    </div>
  );
}
