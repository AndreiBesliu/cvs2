/**
 * Panoul de proprietăți cu o cotă aleasă (ADR 0330 §5, felia 10.4↑a-4): doar ce e al ei. Felul; valoarea exactă, cu toate
 * cifrele, și „Copiază”; legătura (legată, liberă sau dezlegată, cu motivul) și „Dezleagă”; textul, cu `<>` pentru valoare;
 * distanța liniei de cotă (la rază și diametru, locul cifrei; la unghi, raza arcului); „Șterge”. Stilul stă în Setări (§6). Datele și schimbările vin de la unealta Cote, prin depozitul
 * cotelor (`coteVedere.ts`): panoul nu citește modelul cotelor.
 */
import { useState, type ReactNode } from 'react';
import { t, type CheieSimpla } from '../i18n/t.ts';
import { PLAFON } from '../model/document.ts';
import type { RezultatActiune } from '../ui/actiuni.ts';
import { CampNumeric } from '../ui/CampNumeric.tsx';
import { CampText } from '../ui/CampText.tsx';
import type { CotaPanou } from '../ui/coteVedere.ts';
import { textNumar } from '../ui/numar.ts';

const FELURI = new Set(['orizontala', 'verticala', 'aliniata', 'raza', 'diametru', 'unghi']);

export function PanouCota({ cota, doarCitire, virgula }: { readonly cota: CotaPanou; readonly doarCitire: boolean; readonly virgula: boolean }): ReactNode {
  // Ce s-a întâmplat la ultimul buton (copierea, un refuz), pentru cota de atunci.
  const [stare, setStare] = useState<{ readonly id: string; readonly text: string; readonly rosu: boolean } | null>(null);
  const oprit = doarCitire ? t('motiv.doar-citire') : undefined;
  const spune = (r: RezultatActiune): RezultatActiune => {
    setStare(r.ok ? null : { id: cota.id, text: t(r.motiv), rosu: true });
    return r;
  };
  const unitate = cota.fel === 'unghi' ? '°' : ' mm';
  const exacta = cota.valoare === null ? '—' : `${textNumar(cota.valoare, virgula)}${unitate}`;
  const copiaza = (): void => {
    if (cota.valoare === null) return;
    const text = textNumar(cota.valoare, virgula);
    void navigator.clipboard.writeText(text).then(
      () => { setStare({ id: cota.id, text: t('prop.cota.copiata'), rosu: false }); },
      () => { setStare({ id: cota.id, text: t('prop.cota.necopiata'), rosu: true }); },
    );
  };
  const legatura = cota.stare === 'dezlegata'
    ? t(cota.motiv === 'noduri' ? 'prop.cota.dezlegata.noduri' : 'prop.cota.dezlegata.forma')
    : t(`prop.cota.${cota.stare}`);
  const rand = (eticheta: string, valoare: ReactNode): ReactNode => (
    <div className="prop-rand" key={eticheta}><dt>{eticheta}</dt><dd>{valoare}</dd></div>
  );
  const mesaj = stare?.id === cota.id ? stare : null;
  // Distanța liniei: la rază și diametru, locul cifrei față de cerc (afară pozitiv); la unghi, raza arcului (pozitivă).
  const eDistanta = t(cota.fel === 'unghi' ? 'prop.cota.distanta.unghi' : cota.fel === 'raza' || cota.fel === 'diametru' ? 'prop.cota.distanta.raza' : 'prop.cota.distanta');
  return (
    <section className="prop-cota" data-testid="panou-cota" data-cota={cota.id}>
      <h3>{t('prop.cota')}</h3>
      <dl>
        {rand(t('prop.cota.felul'), FELURI.has(cota.fel) ? t(`editare.cote.felul.${cota.fel}` as CheieSimpla) : cota.fel)}
        {rand(t('prop.cota.valoarea'), (
          <span className="prop-cota-valoare">
            <output data-testid="cota-valoare">{exacta}</output>
            <button type="button" data-buton="cota-copiaza" disabled={cota.valoare === null} onClick={copiaza}>{t('prop.cota.copiaza')}</button>
          </span>
        ))}
        {rand(t('prop.cota.cifra'), <output data-testid="cota-cifra">{cota.cifra}</output>)}
        {rand(t('prop.cota.legatura'), (
          <span className="prop-cota-legatura">
            <span data-testid="cota-legatura" data-stare={cota.stare}>{legatura}</span>
            <button type="button" data-buton="cota-dezleaga" disabled={doarCitire || cota.stare === 'libera'} {...(oprit ? { title: oprit } : {})}
              onClick={() => { spune(cota.actiuni.dezleaga()); }}>{t('prop.cota.dezleaga')}</button>
          </span>
        ))}
        {rand(t('prop.cota.textul'), <CampText key={`${cota.id}/text`} eticheta={t('prop.cota.textul')} camp="cota-text" valoare={cota.text}
          exemplu={t('prop.cota.textul.exemplu')} lungime={PLAFON.numeLungime} dezactivat={doarCitire} {...(oprit ? { titlu: oprit } : {})}
          onAplica={(x) => spune(cota.actiuni.text(x))} />)}
        {rand(eDistanta, <CampNumeric key={`${cota.id}/d`} eticheta={eDistanta} camp="cota-distanta" valoare={cota.d}
          unitate="mm" semn={cota.fel !== 'unghi'} dezactivat={doarCitire} {...(oprit ? { titlu: oprit } : {})} onAplica={(x) => spune(cota.actiuni.distanta(x))} />)}
      </dl>
      <p className="prop-nota">{t('prop.cota.textul.nota')}</p>
      <div className="prop-cota-butoane">
        <button type="button" data-buton="cota-sterge" disabled={doarCitire} {...(oprit ? { title: oprit } : {})}
          onClick={() => { spune(cota.actiuni.sterge()); }}>{t('prop.cota.sterge')}</button>
      </div>
      {mesaj ? <p className={mesaj.rosu ? 'camp-motiv' : 'prop-nota'} role={mesaj.rosu ? 'alert' : 'status'} data-testid="cota-mesaj">{mesaj.text}</p> : null}
    </section>
  );
}
