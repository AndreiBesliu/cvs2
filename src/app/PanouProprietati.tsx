import type { ReactNode } from 'react';
import '../i18n/carcasa.ts';
import '../i18n/export.ts';
import { t } from '../i18n/t.ts';
import type { Document, Operatie } from '../model/document.ts';
import { useLimba } from '../ui/useLimba.ts';

type Props = {
  readonly doc: Document;
  /** Instanțele selectate care există pe foaie. */
  readonly alese: readonly string[];
  /** Elementele lor în lume, câte sunt, și cutia lor comună, în mm (le calculează deja aplicația, pentru pânză). */
  readonly elemente: number;
  readonly cutie: { readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number } | null;
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
 * Panoul de proprietăți, DOAR DE CITIT (prototipul B): ce știe documentul despre selecție, sau despre foaie dacă nu e nimic
 * selectat. Editarea (câmpul numeric unic, comenzile) vine în felia 2.8; panoul nu are niciun control care să nu facă
 * nimic. Se încarcă la cerere, ca dialogurile.
 */
export function PanouProprietati({ doc, alese, elemente, cutie }: Props): ReactNode {
  useLimba();
  const foaie = doc.foi[0];
  const instanta = alese.length === 1 ? foaie?.instante.find((i) => i.id === alese[0]) : undefined;
  const piesa = instanta ? doc.piese.find((p) => p.id === instanta.piesa) : undefined;

  return (
    <div className="proprietati">
      <h2>{t('prop.titlu')}</h2>
      <p className="prop-nota">{t('prop.nota')}</p>
      {alese.length === 0 && foaie && (
        <section>
          <h3>{t('prop.foaia')}</h3>
          <dl>
            {rand(t('prop.marime'), t('prop.mm3', { latime: mm(foaie.stoc.latime), inaltime: mm(foaie.stoc.inaltime), grosime: mm(foaie.stoc.grosime) }))}
            {rand(t('prop.forme'), foaie.instante.length)}
          </dl>
        </section>
      )}
      {alese.length > 1 && <p className="prop-multi">{t('prop.selectate', { n: alese.length })}</p>}
      {alese.length > 0 && (
        <section>
          {instanta && <h3>{piesa?.nume ?? piesa?.id ?? instanta.id}</h3>}
          <dl>
            {instanta && rand(t('prop.pozitia'), t('prop.xy', { x: mm(instanta.x), y: mm(instanta.y) }))}
            {instanta && rand(t('prop.rotirea'), `${instanta.rotire}°`)}
            {cutie && rand(t('prop.cutia'), t('prop.mm2', { latime: mm(cutie.maxX - cutie.minX), inaltime: mm(cutie.maxY - cutie.minY) }))}
            {rand(t('prop.elemente'), elemente)}
          </dl>
        </section>
      )}
      {piesa?.operatii.map((o, i) => operatie(o, i + 1))}
    </div>
  );
}
