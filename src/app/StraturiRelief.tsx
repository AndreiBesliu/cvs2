/**
 * Straturile unui relief în panoul Proprietăți (ADR 0310 §7; ADR 0320, felia 18.1↑j): de sus în jos, ca în compus, fiecare
 * cu ochiul, numele, modul, mutarea în sus și în jos și ștergerea (nu și a ultimului). Fiecare schimbare e forma nouă a
 * elementului, trimisă prin registru (`document.forma`, un pas de anulare): un strat ascuns nu intră în compus, deci nici în ce
 * se taie (ADR 0310 §1).
 */
import { useState, type ReactNode } from 'react';
import { t } from '../i18n/t.ts';
import { MODURI_RELIEF, PLAFON, type FormaRelief, type ModRelief } from '../model/document.ts';
import { cuStrat, mutaStrat, stergeStrat } from '../model/straturiRelief.ts';
import type { RezultatActiune } from '../ui/actiuni.ts';
import { CampText } from '../ui/CampText.tsx';

type Props = {
  /** Cheia elementului (instanța și nodul), ca stările să nu treacă de la un relief la altul. */
  readonly cheie: string;
  readonly forma: FormaRelief;
  readonly dezactivat: boolean;
  /** Motivul pentru care câmpurile sunt oprite (fila doar citește), arătat ca sfat. */
  readonly titlu?: string;
  /** Forma nouă a reliefului, prin registru; lipsă = doar de citit. */
  readonly onSchimba?: ((f: FormaRelief) => RezultatActiune) | undefined;
};

export function StraturiRelief({ cheie, forma: f, dezactivat, titlu, onSchimba }: Props): ReactNode {
  const [motiv, setMotiv] = useState<{ readonly cheie: string; readonly text: string } | null>(null);
  const oprit = dezactivat || !onSchimba;
  const aplica = (nou: FormaRelief | null): RezultatActiune => {
    if (!nou || !onSchimba) return { ok: true };
    const r = onSchimba(nou);
    setMotiv(r.ok ? null : { cheie, text: t(r.motiv) });
    return r;
  };
  const sus = [...f.straturi].reverse();
  return (
    <>
      <ul className="prop-straturi" data-testid="prop-relief-straturi">
        {sus.map((st, k) => {
          const nume = st.nume ?? st.id;
          return (
            <li key={st.id} data-strat={st.id} data-vizibil={st.vizibil} className="prop-strat">
              <button type="button" data-buton="strat-ochi" aria-pressed={st.vizibil} disabled={oprit} {...(titlu ? { title: titlu } : {})}
                aria-label={t(st.vizibil ? 'prop.relief.strat.ascunde' : 'prop.relief.strat.arata', { nume })}
                onClick={() => { aplica(cuStrat(f, st.id, { vizibil: !st.vizibil })); }}>
                {st.vizibil ? '👁' : '◌'}
              </button>
              <CampText key={`${cheie}/${st.id}/nume`} eticheta={t('prop.relief.strat.nume')} camp={`strat-nume-${st.id}`}
                valoare={st.nume ?? ''} exemplu={st.id} lungime={PLAFON.numeLungime} dezactivat={oprit} {...(titlu ? { titlu } : {})}
                onAplica={(x) => aplica(cuStrat(f, st.id, { nume: x }))} />
              <select data-camp="strat-mod" className="prop-strat-mod" value={st.mod} disabled={oprit} aria-label={t('prop.relief.strat.mod', { nume })}
                onChange={(ev) => { const v = ev.target.value; if ((MODURI_RELIEF as readonly string[]).includes(v)) aplica(cuStrat(f, st.id, { mod: v as ModRelief })); }}>
                {MODURI_RELIEF.map((m) => <option key={m} value={m}>{t(`prop.relief.mod.${m}`)}</option>)}
              </select>
              {/* Lista e de sus în jos: „în sus” e spre capătul straturilor din document (deasupra în compus). */}
              <button type="button" data-buton="strat-sus" disabled={oprit || k === 0} aria-label={t('prop.relief.strat.sus', { nume })}
                onClick={() => { aplica(mutaStrat(f, st.id, 'sus')); }}>↑</button>
              <button type="button" data-buton="strat-jos" disabled={oprit || k === sus.length - 1} aria-label={t('prop.relief.strat.jos', { nume })}
                onClick={() => { aplica(mutaStrat(f, st.id, 'jos')); }}>↓</button>
              <button type="button" data-buton="strat-sterge" disabled={oprit || f.straturi.length <= 1} aria-label={t('prop.relief.strat.sterge', { nume })}
                onClick={() => { aplica(stergeStrat(f, st.id)); }}>×</button>
              {!st.vizibil && <span className="prop-strat-ascuns">{t('prop.relief.ascuns')}</span>}
            </li>
          );
        })}
      </ul>
      {motiv?.cheie === cheie && <p className="camp-motiv" role="alert" data-motiv="strat">{motiv.text}</p>}
    </>
  );
}
