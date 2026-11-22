import { useEffect, useId, useState, type FormEvent, type ReactElement } from 'react';
import { Bytes, doc, getDoc } from 'firebase/firestore/lite';
import { COLECTIE_POZE, ID_POZA } from '../../../shared/poza.ts';
import {
  COLECTIE_SUGESTII, DESCRIERE_MAX, esteTip, esteZona, TIPURI_SUGESTIE, TITLU_MAX, ZONE_SUGESTIE, type ContinutSugestie,
  type TipSugestie, type ZonaSugestie,
} from '../../../shared/sugestii.ts';
import type { PozaInAsteptare } from '../../app/pozaSugestiei.ts';
import type { Conexiune } from '../../cloud/conexiune.ts';
import { t } from '../../i18n/t.ts';
import { useLimba } from '../../ui/useLimba.ts';
import { dataScurta, motivDin, type Masura } from '../erori/date.ts';
import type { Sugestie } from './date.ts';

/**
 * Scrierea unei sugestii noi sau editarea uneia fără decizie; versiunea e cea de la deschidere. Formularul nou arată poza
 * planșei adusă din editor (ADR 0111), care pleacă odată cu sugestia, dacă omul n-o scoate.
 */
export function Formular({ initial, ocupat, faraAppCheck, eroare, trimite, renunta, poza, scoatePoza }: {
  readonly initial: Sugestie | null; readonly ocupat: boolean; readonly faraAppCheck: boolean; readonly eroare: string | null;
  readonly trimite: (c: ContinutSugestie, versiune: number | null) => void; readonly renunta?: () => void;
  readonly poza?: PozaInAsteptare | null; readonly scoatePoza?: () => void;
}): ReactElement {
  const ajutor = useId();
  const [versiune] = useState(initial?.versiune ?? null);
  const [titlu, setTitlu] = useState(initial?.titlu ?? '');
  const [descriere, setDescriere] = useState(initial?.descriere ?? '');
  // Fără tip ales dinainte: tipul îl ajută pe owner să le despartă, deci îl alege omul.
  const [tip, setTip] = useState<TipSugestie | ''>(initial?.tip ?? '');
  const [zona, setZona] = useState<ZonaSugestie | ''>(initial?.zona ?? '');
  const trimiteFormular = (e: FormEvent): void => {
    e.preventDefault();
    if (tip !== '') trimite({ titlu, descriere, tip, zona: zona === '' ? null : zona }, versiune);
  };
  return (
    <form className="pers-formular sug-formular" onSubmit={trimiteFormular} data-sug={initial ? 'formular-editare' : 'formular'}>
      <label>
        <span>{t('admin.sug.titlu')}</span>
        <input type="text" required maxLength={TITLU_MAX} value={titlu} data-sug="titlu" onChange={(e) => { setTitlu(e.target.value); }} />
      </label>
      <label>
        <span>{t('admin.sug.descriere')}</span>
        <textarea rows={5} maxLength={DESCRIERE_MAX} value={descriere} aria-describedby={ajutor} data-sug="descriere" onChange={(e) => { setDescriere(e.target.value); }} />
      </label>
      <p className="admin-slab sug-ajutor" id={ajutor}>{t('admin.sug.descriere-ajutor')}</p>
      <div className="sug-alegeri">
        <label>
          <span>{t('admin.sug.tip')}</span>
          <select required value={tip} data-sug="tip" onChange={(e) => { const v = e.target.value; setTip(esteTip(v) ? v : ''); }}>
            <option value="" disabled>{t('admin.sug.alege-tip')}</option>
            {TIPURI_SUGESTIE.map((x) => <option key={x} value={x}>{t(`admin.sug.tip.${x}`)}</option>)}
          </select>
        </label>
        <label>
          <span>{t('admin.sug.zona')}</span>
          <select value={zona} data-sug="zona" onChange={(e) => { const v = e.target.value; setZona(esteZona(v) ? v : ''); }}>
            <option value="">{t('admin.sug.zona.nespecificata')}</option>
            {ZONE_SUGESTIE.map((x) => <option key={x} value={x}>{t(`admin.sug.zona.${x}`)}</option>)}
          </select>
        </label>
      </div>
      {poza && scoatePoza ? <PozaAtasata poza={poza} scoate={scoatePoza} ocupat={ocupat} /> : null}
      <div className="admin-randuri">
        <button type="submit" className="principal" disabled={ocupat || faraAppCheck || titlu.trim() === '' || tip === ''} data-sug="trimite">
          {t(initial ? 'admin.sug.salveaza' : 'admin.sug.trimite')}
        </button>
        {renunta ? <button type="button" onClick={renunta}>{t('admin.pers.renunta')}</button> : null}
        {faraAppCheck ? <span className="admin-slab" data-sug="fara-appcheck">{t('admin.erori.fara-appcheck')}</span> : null}
      </div>
      {eroare ? <p className="admin-eroare" role="alert" data-sug="eroare">{t('admin.sug.esec', { motiv: eroare })}</p> : null}
    </form>
  );
}

/** Adresa locală a unei imagini din browser, cât trăiește componenta (eliberată la schimbare și la ieșire). */
export function useAdresaImaginii(imagine: Blob | null): string | null {
  const [adresa, setAdresa] = useState<string | null>(null);
  useEffect(() => {
    if (!imagine) {
      setAdresa(null);
      return undefined;
    }
    const a = URL.createObjectURL(imagine);
    setAdresa(a);
    return () => { URL.revokeObjectURL(a); };
  }, [imagine]);
  return adresa;
}

/** Poza planșei adusă din editor, în formularul nou: ora ei și „Scoate poza”. */
function PozaAtasata({ poza, scoate, ocupat }: { readonly poza: PozaInAsteptare; readonly scoate: () => void; readonly ocupat: boolean }): ReactElement {
  const limba = useLimba();
  const adresa = useAdresaImaginii(poza.imagine);
  return (
    <figure className="sug-poza" data-sug="poza-atasata">
      {adresa ? <img src={adresa} alt={t('admin.sug.poza-alt-noua')} /> : null}
      <figcaption>
        <span className="admin-slab">{t('admin.sug.poza-din-editor', { ora: dataScurta(new Date(poza.la), limba) })}</span>
        <button type="button" disabled={ocupat} data-sug="scoate-poza" onClick={scoate}>{t('admin.sug.poza-scoate')}</button>
      </figcaption>
    </figure>
  );
}

/** Poza unei sugestii trimise, citită la cerere din documentul ei (o listă de sugestii nu aduce octeții). */
export function PozaSugestiei({ con, s }: { readonly con: Conexiune; readonly s: Sugestie }): ReactElement {
  const [deschisa, setDeschisa] = useState(false);
  const [imagine, setImagine] = useState<Masura<Blob> | null>(null);
  useEffect(() => {
    if (!deschisa || imagine !== null) return undefined;
    let viu = true;
    getDoc(doc(con.db, COLECTIE_SUGESTII, s.id, COLECTIE_POZE, ID_POZA)).then((d) => {
      if (!viu) return;
      const o: unknown = d.get('octeti');
      setImagine(o instanceof Bytes
        ? { ok: true, valoare: new Blob([new Uint8Array(o.toUint8Array())], { type: s.poza?.tip ?? 'image/jpeg' }) }
        : { ok: false, motiv: t('admin.sug.poza-lipsa') });
    }, (e: unknown) => { if (viu) setImagine({ ok: false, motiv: motivDin(e) }); });
    return () => { viu = false; };
  }, [deschisa, imagine, con, s.id, s.poza]);
  const adresa = useAdresaImaginii(imagine?.ok ? imagine.valoare : null);
  return (
    <div className="sug-poza-rand">
      <button type="button" aria-expanded={deschisa} data-sug="arata-poza" onClick={() => { setDeschisa((x) => !x); }}>
        {t(deschisa ? 'admin.sug.poza-ascunde' : 'admin.sug.poza-arata')}
      </button>
      {!deschisa ? null
        : imagine === null ? <p className="admin-mesaj" aria-busy="true">{t('admin.sug.poza-se-incarca')}</p>
          : !imagine.ok ? <p className="admin-eroare" role="alert" data-sug="poza-eroare">{t('admin.sug.poza-citire', { motiv: imagine.motiv })}</p>
            : adresa ? (
              <a href={adresa} target="_blank" rel="noopener">
                <img className="sug-poza-img" src={adresa} alt={t('admin.sug.poza-alt', { titlu: s.titlu })} data-sug="poza" />
              </a>
            ) : null}
    </div>
  );
}
