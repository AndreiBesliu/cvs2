import { useEffect, useState, type ReactElement } from 'react';
import { t } from '../i18n/t.ts';
import type { ImagineFoaie } from '../model/document.ts';
import type { RezultatActiune } from '../ui/actiuni.ts';
import { CampNumeric } from '../ui/CampNumeric.tsx';

/** Miniatura unei imagini, din octeții ei; fără ei (lipsă, ori încă se citesc), un pătrat gol. */
function Miniatura({ octeti }: { readonly octeti: Blob | null | undefined }): ReactElement {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!octeti) {
      setUrl(null);
      return undefined;
    }
    const u = URL.createObjectURL(octeti);
    setUrl(u);
    return () => { URL.revokeObjectURL(u); };
  }, [octeti]);
  return url ? <img className="prop-imagine-mini" src={url} alt="" /> : <span className="prop-imagine-mini" aria-hidden="true" />;
}

/**
 * Imaginile foii active (ADR 0272 §5), în panoul foii, sub câmpurile ei: fiecare cu miniatura, numele, ochiul (vizibilă),
 * lacătul (fixată; desfăcută, se mută, se scalează și se rotește cu mânerele ei), opacitatea și ștergerea. Fiecare schimbare
 * e un pas de anulare (`foaie.imagini`), cu motivul unui refuz sub rândul ei. O imagine ai cărei octeți lipsesc din browser
 * (un proiect adus din altul, ori una ștearsă) o spune; locul ei rămâne pe foaie, punctat. Pe telefon (sub 40 rem), lista
 * nu se arată (ADR 0272 §9: imaginile se văd, dar nu se schimbă).
 */
export function ImaginiFoii({ imagini, octeti, doarCitire, oprit, onImagini }: {
  readonly imagini: readonly ImagineFoaie[];
  readonly octeti: ReadonlyMap<string, Blob | null>;
  readonly doarCitire: boolean;
  /** Motivul câmpurilor oprite (fila doar citește), ca sfat. */
  readonly oprit?: string | undefined;
  readonly onImagini: (lista: readonly ImagineFoaie[]) => RezultatActiune;
}): ReactElement {
  const [motiv, setMotiv] = useState<{ readonly id: string; readonly text: string } | null>(null);
  /** Lista cu imaginea `id` schimbată (null: scoasă), prin acțiune; refuzul rămâne sub rândul ei. */
  const schimba = (id: string, f: (im: ImagineFoaie) => ImagineFoaie | null): RezultatActiune => {
    const lista = imagini.flatMap((im) => {
      if (im.id !== id) return [im];
      const n = f(im);
      return n ? [n] : [];
    });
    const r = onImagini(lista);
    setMotiv(r.ok ? null : { id, text: t(r.motiv) });
    return r;
  };
  return (
    <section data-testid="prop-imagini" data-imagine-foaie="">
      <h3>{t('prop.imagini')}</h3>
      <ul className="prop-imagini">
        {imagini.map((im) => {
          const nume = im.nume ?? im.id;
          const o = octeti.get(im.sursa);
          return (
            <li key={im.id} data-imagine={im.id}>
              <Miniatura octeti={o} />
              <span className="prop-imagine-nume" title={nume}>{nume}</span>
              <span className="prop-imagine-butoane">
                <button type="button" data-icona="imagine.vizibila" data-buton="imagine-vizibila" aria-pressed={im.vizibila} disabled={doarCitire}
                  title={oprit ?? t(im.vizibila ? 'prop.imagine.ascunde' : 'prop.imagine.arata')}
                  onClick={() => { schimba(im.id, (x) => ({ ...x, vizibila: !x.vizibila })); }}>
                  <span className="eticheta">{t('prop.imagine.vizibila')}</span>
                </button>
                <button type="button" data-icona="imagine.fixata" data-buton="imagine-fixata" aria-pressed={im.fixata} disabled={doarCitire}
                  title={oprit ?? t(im.fixata ? 'prop.imagine.desface' : 'prop.imagine.fixeaza')}
                  onClick={() => { schimba(im.id, (x) => ({ ...x, fixata: !x.fixata })); }}>
                  <span className="eticheta">{t('prop.imagine.fixata')}</span>
                </button>
                <button type="button" data-icona="document.sterge-selectia" data-buton="imagine-sterge" disabled={doarCitire}
                  title={oprit ?? t('prop.imagine.sterge')} onClick={() => { schimba(im.id, () => null); }}>
                  <span className="eticheta">{t('prop.imagine.sterge')}</span>
                </button>
              </span>
              <dl className="prop-imagine-campuri">
                <div className="prop-rand">
                  <dt>{t('prop.imagine.opacitatea')}</dt>
                  <dd>
                    <CampNumeric key={`${im.id}/opacitate`} eticheta={`${nume}, ${t('prop.imagine.opacitatea')}`} camp="imagine-opacitate"
                      valoare={Math.round(im.opacitate * 100)} unitate="%" dezactivat={doarCitire} {...(oprit ? { titlu: oprit } : {})}
                      onAplica={(x) => (x >= 1 && x <= 100 ? schimba(im.id, (i) => ({ ...i, opacitate: x / 100 })) : { ok: false, motiv: 'motiv.valoare-invalida' })} />
                  </dd>
                </div>
              </dl>
              {o === null && <p className="prop-nota" data-motiv="imagine-lipsa">{t('prop.imagine.lipsa')}</p>}
              {motiv?.id === im.id && <p className="camp-motiv" role="alert" data-motiv="imagine">{motiv.text}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
