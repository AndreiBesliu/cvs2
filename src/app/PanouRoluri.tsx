import { useState, type ReactNode } from 'react';
import { t } from '../i18n/t.ts';
import type { Piesa } from '../model/document.ts';
import { PLAFON_ROLURI, sablonDinPiese, type MotivRol } from '../model/rolPersonal.ts';
import { roluriMele, useRoluriMele, type RezultatRol } from './roluriMele.ts';

/** Formularul deschis: rolul nou, redenumirea sau întrebarea ștergerii unui rol, pentru selecția `cheie` de atunci. */
type Deschis =
  | { readonly fel: 'nou'; readonly cheie: string }
  | { readonly fel: 'redenumeste' | 'sterge'; readonly id: string; readonly cheie: string };

/** O valoare în numele propus: fără zerourile de la coadă (Ø6, 6.5 mm). */
const scurt = (x: number): string => String(Number(x.toFixed(3)));

/** Textul unui refuz (ADR 0114 §2), cu plafonul lui sau cu numele rolului care are deja aceleași valori. */
function motiv(r: { readonly motiv: MotivRol; readonly nume?: string }): string {
  return t(`prop.rol.refuz.${r.motiv}`, { nume: r.nume ?? '', n: r.motiv === 'plafon' ? PLAFON_ROLURI.roluri : PLAFON_ROLURI.nume });
}

type Props = {
  /** Piesele alese, din care se salvează rolul (ADR 0114 §2). */
  readonly piese: readonly Piesa[];
  /** Selecția de acum: un formular sau un refuz al altei selecții nu se mai arată. */
  readonly cheie: string;
};

/**
 * Rolurile personalizate, în secțiunea Tăierea (ADR 0114 §2, §7): „Salvează ca rol…”, cu numele scris (propus din rol, freză
 * și adâncime), și lista „Rolurile mele”, cu redenumirea și ștergerea (cu întrebare). Nu scriu proiectul, deci merg și în
 * fila care doar citește (§8). Alegerea unui rol e în lista Rolului, din panou.
 */
export function PanouRoluri({ piese, cheie }: Props): ReactNode {
  const stare = useRoluriMele();
  const [deschis, setDeschis] = useState<Deschis | null>(null);
  const [text, setText] = useState('');
  const [refuz, setRefuz] = useState<{ readonly cheie: string; readonly text: string } | null>(null);
  const acum = deschis?.cheie === cheie ? deschis : null;
  const inchide = (): void => {
    setDeschis(null);
    setRefuz(null);
  };
  const rezultat = (r: RezultatRol): void => {
    if (r.ok) inchide();
    else setRefuz({ cheie, text: motiv(r) });
  };
  const deschide = (d: Deschis, nume: string): void => {
    setText(nume);
    setRefuz(null);
    setDeschis(d);
  };
  const deschideNou = (): void => {
    const s = sablonDinPiese(piese);
    if (!s.ok) {
      setDeschis(null);
      setRefuz({ cheie, text: motiv(s) });
      return;
    }
    const o = s.sablon.operatie;
    deschide({ fel: 'nou', cheie }, t('prop.rol.nume.propus', { rol: t(`export.latura.${s.sablon.baza}`), diametru: scurt(o.scula.diametru), adancime: scurt(o.adancime) }));
  };
  const salveaza = (): void => {
    if (acum?.fel === 'nou') {
      const s = sablonDinPiese(piese);
      rezultat(s.ok ? roluriMele().adauga(text, s.sablon) : s);
    } else if (acum?.fel === 'redenumeste') {
      rezultat(roluriMele().redenumeste(acum.id, text));
    }
  };
  const alerta = refuz?.cheie === cheie ? <p className="camp-motiv" role="alert" data-motiv="rol-personal">{refuz.text}</p> : null;
  const campNume = (): ReactNode => (
    <form className="prop-rol-formular" data-formular="rol" onSubmit={(e) => { e.preventDefault(); salveaza(); }}>
      <input type="text" data-camp="nume-rol" aria-label={t('prop.rol.nume')} value={text} maxLength={PLAFON_ROLURI.nume} autoFocus
        onFocus={(e) => e.currentTarget.select()} onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Escape') return;
          e.stopPropagation();
          inchide();
        }} />
      <button type="submit" data-buton="confirma-rol">{t('prop.rol.salveaza.ok')}</button>
      <button type="button" data-buton="renunta-rol" onClick={inchide}>{t('prop.rol.renunta')}</button>
    </form>
  );

  return (
    <div className="prop-roluri">
      {acum?.fel === 'nou' ? campNume() : (
        <button type="button" className="prop-rol-salveaza" data-buton="salveaza-rol" onClick={deschideNou}>{t('prop.rol.salveaza')}</button>
      )}
      {acum?.fel !== 'redenumeste' && alerta}
      {!stare.pastrate && <p className="prop-nota" data-nota="roluri-memorie">{t('prop.rol.memorie')}</p>}
      {!stare.scriere && <p className="prop-nota" data-nota="roluri-versiune">{t('prop.rol.versiune')}</p>}
      {stare.roluri.length > 0 && (
        <details className="prop-roluri-mele" data-testid="roluri-mele">
          <summary>{t('prop.rol.mele.lista', { n: stare.roluri.length })}</summary>
          <ul>
            {stare.roluri.map((r) => (
              <li key={r.id} data-rol-personal={r.id}>
                {acum?.fel === 'redenumeste' && acum.id === r.id ? <>{campNume()}{alerta}</> : (
                  <>
                    <span className="prop-rol-nume">{r.nume}</span>
                    <span className="prop-rol-baza">{t(`export.latura.${r.baza}`)}</span>
                    {acum?.fel === 'sterge' && acum.id === r.id ? (
                      <span className="prop-rol-intrebare">
                        <span>{t('prop.rol.sterge.intrebare', { nume: r.nume })}</span>
                        <button type="button" data-buton="confirma-sterge-rol" onClick={() => rezultat(roluriMele().sterge(r.id))}>{t('prop.rol.sterge')}</button>
                        <button type="button" data-buton="renunta-rol" onClick={inchide}>{t('prop.rol.renunta')}</button>
                      </span>
                    ) : (
                      <span className="prop-rol-butoane">
                        <button type="button" data-buton="redenumeste-rol" onClick={() => deschide({ fel: 'redenumeste', id: r.id, cheie }, r.nume)}>{t('prop.rol.redenumeste')}</button>
                        <button type="button" data-buton="sterge-rol" onClick={() => deschide({ fel: 'sterge', id: r.id, cheie }, '')}>{t('prop.rol.sterge')}</button>
                      </span>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
