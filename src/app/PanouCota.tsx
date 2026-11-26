/**
 * Panoul de proprietăți cu o cotă aleasă (ADR 0330 §5, felia 10.4↑a-4): doar ce e al ei. Felul; valoarea exactă, cu toate
 * cifrele, și „Copiază”; legătura (legată, liberă sau dezlegată, cu motivul) și „Dezleagă”; textul, cu `<>` pentru valoare;
 * distanța liniei de cotă (la rază și diametru, locul cifrei; la unghi, raza arcului); toleranța (felia 10.4↑e-1: fără,
 * simetrică, cu abaterea ei, sau cu abaterea de sus și cea de jos); „Șterge”. Stilul stă în Setări (§6). Datele și
 * schimbările vin de la unealta Cote, prin depozitul cotelor (`coteVedere.ts`): panoul nu citește modelul cotelor.
 */
import { useState, type ReactNode } from 'react';
import { t, type CheieSimpla } from '../i18n/t.ts';
import { PLAFON } from '../model/document.ts';
import type { RezultatActiune } from '../ui/actiuni.ts';
import { CampNumeric } from '../ui/CampNumeric.tsx';
import { CampText } from '../ui/CampText.tsx';
import type { CotaPanou } from '../ui/coteVedere.ts';
import { textNumar } from '../ui/numar.ts';

const FELURI = new Set(['orizontala', 'verticala', 'aliniata', 'raza', 'diametru', 'unghi', 'lungime']);
type FelTol = 'fara' | 'simetrica' | 'abateri';
/** Toleranța pusă la alegerea felului, pe o cotă fără ea: ±0,1 (mm sau grade). */
const TOLERANTA_IMPLICITA = 0.1;

export function PanouCota({ cota, doarCitire, virgula }: { readonly cota: CotaPanou; readonly doarCitire: boolean; readonly virgula: boolean }): ReactNode {
  // Ce s-a întâmplat la ultimul buton (copierea, un refuz), pentru cota de atunci.
  const [stare, setStare] = useState<{ readonly id: string; readonly text: string; readonly rosu: boolean } | null>(null);
  // „Fă desen din cotă” (felia 10.4↑d-2): bifa „Șterge cota” și, cât vine fontul cifrelor, butonul ocupat.
  const [stergeCota, setStergeCota] = useState(false);
  const [lucreaza, setLucreaza] = useState(false);
  const [felAles, setFelAles] = useState<{ readonly id: string; readonly fel: FelTol } | null>(null);
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
  // Toleranța (felia 10.4↑e-1): felul vine din toleranța cotei; doar o toleranță cu abateri egale rămâne „cu abateri”, dacă așa
  // a fost aleasă în panou, pentru cota de atunci (după o anulare, felul urmează iar toleranța).
  const tol = cota.toleranta;
  const felDin: FelTol = tol === null ? 'fara' : tol.sus === -tol.jos ? 'simetrica' : 'abateri';
  const felTol: FelTol = felDin === 'simetrica' && felAles?.id === cota.id && felAles.fel === 'abateri' ? 'abateri' : felDin;
  const unitTol = cota.fel === 'unghi' ? '°' : 'mm';
  const alegeFelTol = (v: string): void => {
    const fel: FelTol = v === 'simetrica' || v === 'abateri' ? v : 'fara';
    // Spre simetrică sau spre abateri, din fără sau din simetrică: ± cea mai mare abatere (0,1 dacă nu e niciuna); abaterile
    // egale le scrie omul apoi, una câte una.
    const m = tol ? Math.max(Math.abs(tol.sus), Math.abs(tol.jos)) : TOLERANTA_IMPLICITA;
    const r = cota.actiuni.toleranta(fel === 'fara' ? null : { sus: m, jos: -m });
    spune(r);
    if (r.ok) setFelAles({ id: cota.id, fel });
  };
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
        {rand(t('prop.cota.toleranta'), (
          <select data-camp="cota-toleranta-fel" aria-label={t('prop.cota.toleranta')} value={felTol} disabled={doarCitire} {...(oprit ? { title: oprit } : {})}
            onChange={(e) => { alegeFelTol(e.currentTarget.value); }}>
            {(['fara', 'simetrica', 'abateri'] as const).map((f) => <option key={f} value={f}>{t(`prop.cota.toleranta.${f}`)}</option>)}
          </select>
        ))}
        {felTol === 'simetrica' && tol ? rand(t('prop.cota.toleranta.plusminus'), <CampNumeric key={`${cota.id}/tol`} eticheta={t('prop.cota.toleranta.plusminus')}
          camp="cota-toleranta" valoare={tol.sus} unitate={unitTol} dezactivat={doarCitire} {...(oprit ? { titlu: oprit } : {})}
          onAplica={(x) => spune(cota.actiuni.toleranta({ sus: Math.abs(x), jos: -Math.abs(x) }))} />) : null}
        {felTol === 'abateri' && tol ? (
          <>
            {rand(t('prop.cota.toleranta.sus'), <CampNumeric key={`${cota.id}/tol-sus`} eticheta={t('prop.cota.toleranta.sus')} camp="cota-toleranta-sus"
              valoare={tol.sus} unitate={unitTol} semn dezactivat={doarCitire} {...(oprit ? { titlu: oprit } : {})}
              onAplica={(x) => spune(cota.actiuni.toleranta({ sus: x, jos: tol.jos }))} />)}
            {rand(t('prop.cota.toleranta.jos'), <CampNumeric key={`${cota.id}/tol-jos`} eticheta={t('prop.cota.toleranta.jos')} camp="cota-toleranta-jos"
              valoare={tol.jos} unitate={unitTol} semn dezactivat={doarCitire} {...(oprit ? { titlu: oprit } : {})}
              onAplica={(x) => spune(cota.actiuni.toleranta({ sus: tol.sus, jos: x }))} />)}
          </>
        ) : null}
      </dl>
      <p className="prop-nota">{t('prop.cota.textul.nota')}</p>
      <div className="prop-cota-desen">
        <button type="button" data-buton="cota-desen" disabled={doarCitire || lucreaza} aria-busy={lucreaza || undefined} {...(oprit ? { title: oprit } : {})}
          onClick={() => {
            setLucreaza(true);
            void cota.actiuni.desen(stergeCota).then((r) => { spune(r); }, () => { setStare({ id: cota.id, text: t('editare.cote.motiv.font'), rosu: true }); })
              .finally(() => { setLucreaza(false); });
          }}>{t('prop.cota.desen')}</button>
        <label>
          <input type="checkbox" data-camp="cota-desen-sterge" checked={stergeCota} disabled={doarCitire} onChange={(e) => { setStergeCota(e.currentTarget.checked); }} />
          {t('prop.cota.desen.sterge')}
        </label>
      </div>
      <p className="prop-nota">{t('prop.cota.desen.nota')}</p>
      <div className="prop-cota-butoane">
        <button type="button" data-buton="cota-sterge" disabled={doarCitire} {...(oprit ? { title: oprit } : {})}
          onClick={() => { spune(cota.actiuni.sterge()); }}>{t('prop.cota.sterge')}</button>
      </div>
      {mesaj ? <p className={mesaj.rosu ? 'camp-motiv' : 'prop-nota'} role={mesaj.rosu ? 'alert' : 'status'} data-testid="cota-mesaj">{mesaj.text}</p> : null}
    </section>
  );
}
