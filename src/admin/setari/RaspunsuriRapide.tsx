import { useEffect, useRef, useState, type ReactElement } from 'react';
import { doc, getDoc } from 'firebase/firestore/lite';
import {
  aceleasiRapide, CALE_RASPUNSURI_RAPIDE, ETICHETA_RAPID_MAX, listaRapideCeruta, problemeRapide, RAPIDE_MAX, rapideDin, TEXT_RAPID_MAX,
  type ProblemaRapid, type RaspunsRapid,
} from '../../../shared/raspunsuriRapide.ts';
import { salveazaRaspunsurileRapide, type Conexiune } from '../../cloud/conexiune.ts';
import { t } from '../../i18n/t.ts';
import { useLimba } from '../../ui/useLimba.ts';
import { EroareCitire, SeIncarca } from '../carcasa/stari.tsx';
import { dataDin, dataScurta, motivDin, type Masura } from '../erori/date.ts';
import { EXEMPLE_RAPIDE } from './exemple.ts';
import './setari.css';

/**
 * Răspunsurile rapide ale tichetelor, în fila Setări (ADR 0261 §3, §7), doar ale owner-ului: lista întreagă (eticheta, textul
 * în română și, dacă vrea, în engleză), cu adăugarea, mutarea și ștergerea, apoi „Salvează” prin callable-ul `tichete`, pe
 * versiunea văzută, cu auditul pe server. Fără nimic salvat, „Pornește de la exemplele din schiță” pune în câmpuri cele trei
 * texte ale schiței; nimic nu pleacă fără „Salvează”.
 */

type Citite = { readonly lista: readonly RaspunsRapid[]; readonly versiune: number; readonly modificatLa: Date | null };
type Lucru = { readonly faza: 'liber' | 'lucreaza' } | { readonly faza: 'gata'; readonly mesaj: string } | { readonly faza: 'eroare'; readonly motiv: string };
/** Un rând cât se scrie (necurățat): eticheta, textele. */
type Rand = { eticheta: string; ro: string; en: string };

export function RaspunsuriRapide({ con }: { readonly con: Conexiune }): ReactElement {
  const limba = useLimba();
  const [citite, setCitite] = useState<Masura<Citite> | null>(null);
  const [rev, setRev] = useState(0);
  // Editorul pornește din nou la fiecare citire sosită (nu la cererea ei): după „Salvează”, din lista salvată.
  const [citiri, setCitiri] = useState(0);
  const [lucru, setLucru] = useState<Lucru>({ faza: 'liber' });
  useEffect(() => {
    let viu = true;
    getDoc(doc(con.db, CALE_RASPUNSURI_RAPIDE.colectie, CALE_RASPUNSURI_RAPIDE.id)).then(
      (s) => {
        if (!viu) return;
        setCitite({ ok: true, valoare: { ...rapideDin(s.data()), modificatLa: dataDin(s.get('modificatLa')) } });
        setCitiri((n) => n + 1);
      },
      (e: unknown) => { if (viu) setCitite({ ok: false, motiv: motivDin(e) }); },
    );
    return () => { viu = false; };
  }, [con, rev]);

  const salveaza = (lista: readonly Rand[], versiune: number): void => {
    setLucru({ faza: 'lucreaza' });
    salveazaRaspunsurileRapide(con, lista, versiune).then((r) => {
      setLucru({ faza: 'gata', mesaj: t(r.schimbat ? 'admin.set.rapide.salvate' : 'admin.set.neschimbate') });
      setRev((n) => n + 1);
    }, (e: unknown) => { setLucru({ faza: 'eroare', motiv: motivDin(e) }); });
  };

  return (
    <section className="pers-sectiune set-rapide" aria-labelledby="set-rapide" data-set="rapide">
      <h2 id="set-rapide">{t('admin.set.rapide.titlu')}</h2>
      <p className="admin-slab">{t('admin.set.rapide.text', { max: RAPIDE_MAX, eticheta: ETICHETA_RAPID_MAX, text: TEXT_RAPID_MAX })}</p>
      {lucru.faza === 'gata' ? <p className="admin-mesaj" role="status" data-set="rapide-gata">{lucru.mesaj}</p> : null}
      {citite === null ? <SeIncarca text={t('admin.set.rapide.se-incarca')} />
        : !citite.ok ? (
          <EroareCitire text={t('admin.set.rapide.citire', { motiv: citite.motiv })} motiv={citite.motiv} reincarca={() => { setRev((n) => n + 1); }}
            atribute={{ 'data-set': 'rapide-eroare-citire' }} />
        )
          : (
            <>
              {citite.valoare.modificatLa ? (
                <p className="admin-slab" data-set="rapide-modificate">{t('admin.set.rapide.modificate', { data: dataScurta(citite.valoare.modificatLa, limba) })}</p>
              ) : null}
              <EditorRapide key={citiri} initiale={citite.valoare.lista} versiune={citite.valoare.versiune} ocupat={lucru.faza === 'lucreaza'}
                faraAppCheck={con.appCheck === 'oprit'} eroare={lucru.faza === 'eroare' ? lucru.motiv : null} salveaza={salveaza} />
            </>
          )}
    </section>
  );
}

function textProblema(p: ProblemaRapid): string {
  switch (p) {
    case 'eticheta-invalida': return t('admin.set.rapide.p.eticheta-invalida', { max: ETICHETA_RAPID_MAX });
    case 'ro-invalid': return t('admin.set.rapide.p.ro-invalid', { max: TEXT_RAPID_MAX });
    case 'en-invalid': return t('admin.set.rapide.p.en-invalid', { max: TEXT_RAPID_MAX });
    default: return t(`admin.set.rapide.p.${p}`);
  }
}

function EditorRapide({ initiale, versiune, ocupat, faraAppCheck, eroare, salveaza }: {
  readonly initiale: readonly RaspunsRapid[]; readonly versiune: number; readonly ocupat: boolean; readonly faraAppCheck: boolean;
  readonly eroare: string | null; readonly salveaza: (lista: readonly Rand[], versiune: number) => void;
}): ReactElement {
  const [lista, setLista] = useState<readonly Rand[]>(() => initiale.map((r) => ({ ...r })));
  const [exemplePuse, setExemplePuse] = useState(false);
  // După o mutare, o ștergere sau o adăugare, focusul trece pe controlul cu id-ul ăsta (rândurile se desenează din nou).
  const deFocus = useRef<string | null>(null);
  useEffect(() => {
    const id = deFocus.current;
    if (id === null) return;
    deFocus.current = null;
    const el = document.getElementById(id);
    if (el instanceof HTMLButtonElement && el.disabled) document.getElementById('set-rapid-adauga')?.focus();
    else el?.focus();
  });
  const probleme = problemeRapide(lista);
  const buna = listaRapideCeruta(lista) !== null;
  const schimbata = !aceleasiRapide(lista, initiale);
  const schimba = (k: number, camp: keyof Rand, v: string): void => {
    setLista((l) => l.map((r, i) => (i === k ? { ...r, [camp]: v } : r)));
  };
  const muta = (k: number, d: -1 | 1): void => {
    setLista((l) => {
      const n = [...l];
      const a = n[k];
      const b = n[k + d];
      if (a === undefined || b === undefined) return l;
      n[k] = b;
      n[k + d] = a;
      return n;
    });
    // Focusul rămâne pe același fel de buton, la noul loc; la un capăt, unde acela se oprește, pe celălalt.
    const nou = k + d;
    const capat = d < 0 ? nou === 0 : nou === lista.length - 1;
    deFocus.current = `set-rapid-${nou}-${(d < 0) !== capat ? 'sus' : 'jos'}`;
  };
  const sterge = (k: number): void => {
    setLista((l) => l.filter((_, i) => i !== k));
    deFocus.current = lista.length > 1 ? `set-rapid-${Math.min(k, lista.length - 2)}-eticheta` : 'set-rapid-exemple';
  };
  const adauga = (): void => {
    if (lista.length >= RAPIDE_MAX) return;
    setLista((l) => [...l, { eticheta: '', ro: '', en: '' }]);
    deFocus.current = `set-rapid-${lista.length}-eticheta`;
  };
  const exemple = (): void => {
    setLista(EXEMPLE_RAPIDE.map((r) => ({ ...r })));
    setExemplePuse(true);
    deFocus.current = 'set-rapid-0-eticheta';
  };

  return (
    <div className="set-rapide-editor" data-set="rapide-editor">
      {lista.length === 0 ? (
        <div className="set-rapide-gol" data-set="rapide-gol">
          <p className="admin-slab">{t('admin.set.rapide.niciuna')}</p>
          <button type="button" id="set-rapid-exemple" data-set="rapide-exemple" onClick={exemple}>{t('admin.set.rapide.exemple')}</button>
        </div>
      ) : (
        <ol className="set-rapide-lista">
          {lista.map((r, k) => (
            <li key={k} className="set-rapid" data-rapid-rand={k}>
              <div className="set-rapid-sus">
                <span className="set-rapid-nr" aria-hidden="true">{k + 1}</span>
                <label htmlFor={`set-rapid-${k}-eticheta`}>
                  <span>{t('admin.set.rapide.eticheta')}</span>
                  <input type="text" id={`set-rapid-${k}-eticheta`} maxLength={ETICHETA_RAPID_MAX} value={r.eticheta} data-set="rapid-eticheta"
                    onChange={(e) => { schimba(k, 'eticheta', e.target.value); }} />
                </label>
                <div className="set-rapid-mut">
                  <button type="button" id={`set-rapid-${k}-sus`} aria-label={t('admin.set.rapide.sus', { n: k + 1 })} disabled={k === 0}
                    data-set="rapid-sus" onClick={() => { muta(k, -1); }}>↑</button>
                  <button type="button" id={`set-rapid-${k}-jos`} aria-label={t('admin.set.rapide.jos', { n: k + 1 })} disabled={k === lista.length - 1}
                    data-set="rapid-jos" onClick={() => { muta(k, 1); }}>↓</button>
                  <button type="button" aria-label={t('admin.set.rapide.sterge-eticheta', { n: k + 1 })} data-set="rapid-sterge"
                    onClick={() => { sterge(k); }}>{t('admin.set.rapide.sterge')}</button>
                </div>
              </div>
              <label htmlFor={`set-rapid-${k}-ro`}>
                <span>{t('admin.set.rapide.ro')}</span>
                <textarea id={`set-rapid-${k}-ro`} rows={3} maxLength={TEXT_RAPID_MAX} value={r.ro} data-set="rapid-ro"
                  onChange={(e) => { schimba(k, 'ro', e.target.value); }} />
              </label>
              <label htmlFor={`set-rapid-${k}-en`}>
                <span>{t('admin.set.rapide.en')}</span>
                <textarea id={`set-rapid-${k}-en`} rows={2} maxLength={TEXT_RAPID_MAX} value={r.en} data-set="rapid-en"
                  onChange={(e) => { schimba(k, 'en', e.target.value); }} />
              </label>
              {(probleme[k] ?? []).length > 0 ? (
                <p className="admin-slab set-rapid-probleme" data-set="rapid-probleme">{(probleme[k] ?? []).map(textProblema).join(' ')}</p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
      {exemplePuse ? <p className="admin-slab" role="status" data-set="rapide-exemple-puse">{t('admin.set.rapide.exemple-puse')}</p> : null}
      <div className="admin-randuri set-rapide-jos">
        <button type="button" id="set-rapid-adauga" data-set="rapide-adauga" disabled={lista.length >= RAPIDE_MAX} onClick={adauga}>
          {t('admin.set.rapide.adauga')}
        </button>
        <span className="admin-slab set-rapide-numar" data-set="rapide-numar">{t('admin.set.rapide.numar', { n: lista.length, max: RAPIDE_MAX })}</span>
        <button type="button" className="principal" data-set="rapide-salveaza" disabled={ocupat || faraAppCheck || !buna || !schimbata}
          onClick={() => { salveaza(lista, versiune); }}>
          {t('admin.set.rapide.salveaza')}
        </button>
      </div>
      {schimbata ? <p className="admin-slab" data-set="rapide-nesalvate">{t('admin.set.rapide.nesalvate')}</p> : null}
      {faraAppCheck ? <p className="admin-slab" data-set="rapide-fara-appcheck">{t('admin.erori.fara-appcheck')}</p> : null}
      {eroare ? <p className="admin-eroare" role="alert" data-set="rapide-eroare">{t('admin.set.rapide.esec', { motiv: eroare })}</p> : null}
    </div>
  );
}
