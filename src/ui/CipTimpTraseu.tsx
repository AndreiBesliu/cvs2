import { useState } from 'react';
import '../i18n/traseu.ts';
import { t } from '../i18n/t.ts';
import type { RezumatJob } from './actiuniExportTipuri.ts';
import { durata } from './durata.ts';
import { PanouAnimatie } from './PanouAnimatie.tsx';
import { useLimba } from './useLimba.ts';
import { mesajeGata } from '../i18n/laCerere.ts';

/** Mesajele modulului, ca date (ADR 0086): cine îl încarcă le așteaptă (`cuMesaje`); un refuz îl vede tot el. */
export const mesaje = mesajeGata();
mesaje.catch(() => undefined);

/**
 * Timpul jobului lângă traseu (ADR 0046 §8): estimarea programului traseului, sau motivul pentru care lipsește (un `$$`
 * greșit, un program refuzat). Vine la cerere, după calculul traseului (care aduce dicționarul traseului, cu `durata.*`):
 * pornirea are plafonul ei (ADR 0042). Lângă timp, „Animează” deschide animația traseului (ADR 0099), cu panoul ei deasupra.
 */
export function CipTimpTraseu({ r }: { readonly r: RezumatJob }) {
  const limba = useLimba();
  const [animatie, setAnimatie] = useState(false);
  if (r.ok) {
    const sursa = r.masina.sursa;
    return (
      <span className="cip-timp-traseu">
        <span data-testid="traseu-timp" data-sursa={sursa} className="cip" role="status"
          title={t(sursa === 'setari' ? 'traseu.timp.setari' : 'traseu.timp.implicit', { nume: r.masina.nume })}>
          {t('traseu.timp', { timp: durata(r.total.secunde, limba) })}
        </span>
        {r.traseu
          ? (
            <button type="button" className="cip-buton" data-testid="animatie-porneste" aria-expanded={animatie}
              title={t('animatie.porneste.sfat')} onClick={() => { setAnimatie((v) => !v); }}>
              {t('animatie.porneste')}
            </button>
          )
          : null}
        {animatie && r.traseu ? <PanouAnimatie traseu={r.traseu} onInchide={() => { setAnimatie(false); }} /> : null}
      </span>
    );
  }
  const cheie = r.sursa === 'program' ? 'traseu.timp.fara' : r.linie > 0 ? 'traseu.timp.fara-setari' : 'traseu.timp.fara-setari-tot';
  return <span data-testid="traseu-timp" className="cip cip-atentie" role="status">{t(cheie, { linie: r.linie, motiv: r.motiv })}</span>;
}
