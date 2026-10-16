import type { ReactNode } from 'react';
import '../i18n/carcasa.ts';
import '../i18n/export.ts';
import { t } from '../i18n/t.ts';
import type { Document, Operatie } from '../model/document.ts';
import type { RezultatActiune } from '../ui/actiuni.ts';
import { CampNumeric } from '../ui/CampNumeric.tsx';
import { useLimba } from '../ui/useLimba.ts';

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
  readonly onStoc: (s: { readonly latime?: number; readonly inaltime?: number; readonly grosime?: number }) => RezultatActiune;
  /** Deschide dialogul exportului, unde se schimbă operațiile. */
  readonly onEditeazaOperatii: () => void;
};

const mm = (x: number): string => x.toFixed(2);

/** Un rând „etichetă: valoare”, doar de citit. */
const rand = (eticheta: string, valoare: ReactNode): ReactNode => (
  <div className="prop-rand" key={eticheta}><dt>{eticheta}</dt><dd>{valoare}</dd></div>
);

function operatie(o: Operatie, n: number): ReactNode {
  return (
    <section key={o.id} className="prop-operatie">
      <h3>{t('prop.operatia', { n })}</h3>
      <dl>
        {rand(t('export.latura'), t(`export.latura.${o.latura}`))}
        {rand(t('export.sens'), t(`export.sens.${o.sens}`))}
        {rand(t('export.adancime'), mm(o.adancime))}
        {rand(t('export.pas'), mm(o.pas))}
        {rand(t('prop.freza'), t('prop.freza.valoare', { numar: o.scula.numar, diametru: mm(o.scula.diametru) }))}
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
 * grosimea); cu selecție, colțul stânga-jos al cutiei ei și, la o singură formă, rotirea. Fiecare câmp aplică o acțiune a
 * registrului (un pas de anulare). Operațiile se arată și se schimbă din dialogul exportului. Se încarcă la cerere.
 */
export function PanouProprietati({ doc, alese, elemente, cutie, doarCitire, onPozitie, onRotire, onStoc, onEditeazaOperatii }: Props): ReactNode {
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
            {cutie && rand('X', camp(`${t('prop.colt')}, X`, 'pozitie-x', cutie.minX, 'mm', true, (x) => onPozitie({ x })))}
            {cutie && rand('Y', camp(`${t('prop.colt')}, Y`, 'pozitie-y', cutie.minY, 'mm', true, (y) => onPozitie({ y })))}
            {instanta && rand(t('prop.rotirea'), camp(t('prop.rotirea'), 'rotire', instanta.rotire, '°', true, onRotire))}
            {cutie && rand(t('prop.cutia'), t('prop.mm2', { latime: mm(cutie.maxX - cutie.minX), inaltime: mm(cutie.maxY - cutie.minY) }))}
            {rand(t('prop.elemente'), elemente)}
          </dl>
        </section>
      )}
      {piesa?.operatii.map((o, i) => operatie(o, i + 1))}
      {piesa && piesa.operatii.length > 0 && (
        <button type="button" className="prop-export" data-buton="editeaza-export" onClick={onEditeazaOperatii}>{t('prop.editeaza-export')}</button>
      )}
    </div>
  );
}
