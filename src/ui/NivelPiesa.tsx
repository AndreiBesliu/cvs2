import type { ReactElement } from 'react';
import '../i18n/carcasa.ts';
import '../i18n/export.ts';
import { t } from '../i18n/t.ts';
import { textNumar } from './numar.ts';
import { useLimba } from './useLimba.ts';
import { mesajeGata } from '../i18n/laCerere.ts';

/** Mesajele modulului, ca date (ADR 0086): cine îl încarcă le așteaptă (`cuMesaje`); un refuz îl vede tot el. */
export const mesaje = mesajeGata();
mesaje.catch(() => undefined);

/**
 * O operație, cum o arată arborele proiectului. Operația din document (ADR 0025) are aceeași formă, deci trece direct,
 * fără copie: interfața nu importă modelul (ajunge la domeniu doar prin registrul de acțiuni), primește date gata.
 */
export type OperatieArbore = {
  readonly id: string;
  /** Felul (ADR 0069, ADR 0087, ADR 0090): pe un buzunar, o găurire și un V-carve, rândul nu spune latura, ci felul. */
  readonly tip?: 'profil' | 'buzunar' | 'gaurire' | 'vcarve';
  readonly latura: 'exterior' | 'interior' | 'pe-linie' | 'stanga' | 'dreapta';
  readonly noduri: readonly string[];
  readonly adancime: number;
  readonly pas: number;
  readonly scula: { readonly numar: number; readonly diametru: number };
  /** Freza dreaptă a fundului plat al unui V-carve (ADR 0091). */
  readonly fundPlat?: { readonly scula: { readonly numar: number; readonly diametru: number } };
};

/**
 * Nivelul de sub o instanță în arborele proiectului (prototipul A, adus în carcasa B): piesa, cu câte forme are, și
 * operațiile ei, câte un rând. Vine la cerere, cu mesajele lui: nu intră în pachetul de pornire. Rândurile sunt din
 * `div`-uri, nu din `li`: un rând al listei rămâne o instanță.
 */
export function NivelPiesa({ elemente, operatii }: { readonly elemente: number; readonly operatii: readonly OperatieArbore[] }): ReactElement | null {
  useLimba();
  // Valorile exacte din document, cu punct, ca descrierile formelor din listă (fără exponent: `textNumar`).
  const n = (x: number): string => textNumar(x);
  return (
    <div className="copii">
      <div className="nod" data-nod="piesa" data-icona="arbore.piesa">{t('arbore.piesa', { n: elemente })}</div>
      <div className="copii copii-piesa">
        {operatii.length === 0
          ? <div className="nod" data-nod="fara-operatii">{t('arbore.fara-operatii')}</div>
          : operatii.map((o) => (
            <div key={o.id} className="nod" data-nod="operatie" data-icona="arbore.operatie">
              {t(o.tip === 'buzunar' ? 'arbore.buzunar' : o.tip === 'gaurire' ? 'arbore.gaurire' : o.tip === 'vcarve' ? 'arbore.vcarve' : 'arbore.operatie', {
                n: o.noduri.length, latura: t(`export.latura.${o.latura}`), adancime: n(o.adancime), pas: n(o.pas),
                t: o.scula.numar, d: n(o.scula.diametru),
              })}
              {o.tip === 'vcarve' && o.fundPlat && t('arbore.vcarve.fund', { t: o.fundPlat.scula.numar, d: n(o.fundPlat.scula.diametru) })}
            </div>
          ))}
      </div>
    </div>
  );
}
