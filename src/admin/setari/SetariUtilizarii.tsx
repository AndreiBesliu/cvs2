import { useEffect, useState, type FormEvent, type ReactElement } from 'react';
import { doc, getDoc } from 'firebase/firestore/lite';
import {
  CALE_SETARI_UTILIZARE, MARGINI_UTILIZARE, SETARI_UTILIZARE_IMPLICITE, setariUtilizareCerute, setariUtilizareDin, type SetariUtilizare,
} from '../../../shared/utilizare.ts';
import { salveazaSetarileUtilizarii, type Conexiune } from '../../cloud/conexiune.ts';
import { t } from '../../i18n/t.ts';
import { useLimba } from '../../ui/useLimba.ts';
import { EroareCitire, SeIncarca } from '../carcasa/stari.tsx';
import { dataDin, dataScurta, motivDin, type Masura } from '../erori/date.ts';
import { useMesajDupaCitire } from './dupaCitire.ts';
import { IstoricSetari } from './IstoricSetari.tsx';
import './setari.css';

/**
 * Setările utilizării aplicației, în fila Setări (ADR 0262 §8, felia A.8a), doar ale owner-ului: colectarea și clicurile fine
 * (pornite / oprite), minutele lotului, cele două păstrări, pașii dinaintea unei erori. Se citesc din `setari/utilizare`
 * (regula o dă doar owner-ului; fără document, implicitele) și se schimbă prin callable-ul `utilizare`, pe versiunea văzută,
 * cu auditul pe server; dedesubt, istoricul lor.
 */

type Citite = { readonly setari: SetariUtilizare; readonly versiune: number; readonly modificatLa: Date | null };
type Lucru = { readonly faza: 'liber' | 'lucreaza' } | { readonly faza: 'gata'; readonly mesaj: string } | { readonly faza: 'eroare'; readonly motiv: string };
type CampNumeric = keyof typeof MARGINI_UTILIZARE;

/** Câmpurile numerice, în ordinea formularului: numele lor în `data-set-util` și cheia textelor. */
const NUMERE: readonly { readonly k: CampNumeric; readonly nume: 'lot' | 'evenimente' | 'sume' | 'pasi' }[] = [
  { k: 'lotMinute', nume: 'lot' }, { k: 'zileEvenimente', nume: 'evenimente' }, { k: 'zileSume', nume: 'sume' }, { k: 'pasiEroare', nume: 'pasi' },
];

export function SetariUtilizarii({ con, eu }: { readonly con: Conexiune; readonly eu: string }): ReactElement {
  const limba = useLimba();
  const [citite, setCitite] = useState<Masura<Citite> | null>(null);
  const [rev, setRev] = useState(0);
  // Formularul pornește din nou la fiecare citire sosită (după „Salvează”, din valorile salvate), ca al conturilor.
  const [citiri, setCitiri] = useState(0);
  const [lucru, setLucru] = useState<Lucru>({ faza: 'liber' });
  // Mesajul salvării apare abia cu citirea de după, când formularul e deja cel umplut din nou din ea.
  const dupa = useMesajDupaCitire((mesaj) => { setLucru({ faza: 'gata', mesaj }); });
  useEffect(() => {
    let viu = true;
    getDoc(doc(con.db, CALE_SETARI_UTILIZARE.colectie, CALE_SETARI_UTILIZARE.id)).then(
      (s) => {
        if (!viu) return;
        setCitite({ ok: true, valoare: { ...setariUtilizareDin(s.data()), modificatLa: dataDin(s.get('modificatLa')) } });
        setCitiri((n) => n + 1);
        dupa.citit();
      },
      (e: unknown) => {
        if (!viu) return;
        setCitite({ ok: false, motiv: motivDin(e) });
        dupa.citit();
      },
    );
    return () => { viu = false; };
  }, [con, rev]);

  const salveaza = (setari: SetariUtilizare, versiune: number): void => {
    setLucru({ faza: 'lucreaza' });
    salveazaSetarileUtilizarii(con, setari, versiune).then((r) => {
      dupa.tine(t(r.schimbat ? 'admin.set.util.salvate' : 'admin.set.neschimbate'));
      setRev((n) => n + 1);
    }, (e: unknown) => { setLucru({ faza: 'eroare', motiv: motivDin(e) }); });
  };

  return (
    <section className="pers-sectiune set-util" aria-labelledby="set-util" data-set="utilizare">
      <h2 id="set-util">{t('admin.set.util.titlu')}</h2>
      <p className="admin-slab">{t('admin.set.util.text')}</p>
      <p className="admin-slab" data-set="util-acum">{t('admin.set.util.acum')}</p>
      {lucru.faza === 'gata' ? <p className="admin-mesaj" role="status" data-set="util-gata">{lucru.mesaj}</p> : null}
      {citite === null ? <SeIncarca text={t('admin.set.util.se-incarca')} />
        : !citite.ok ? (
          <EroareCitire text={t('admin.set.util.citire', { motiv: citite.motiv })} motiv={citite.motiv} reincarca={() => { setRev((n) => n + 1); }}
            atribute={{ 'data-set': 'util-eroare-citire' }} />
        )
          : (
            <>
              <p className="admin-slab" data-set="util-sursa">
                {citite.valoare.versiune > 0 ? t('admin.set.modificate', { data: dataScurta(citite.valoare.modificatLa, limba) }) : t('admin.set.implicite')}
              </p>
              <Formular key={citiri} initiale={citite.valoare.setari} ocupat={lucru.faza === 'lucreaza'} faraAppCheck={con.appCheck === 'oprit'}
                eroare={lucru.faza === 'eroare' ? lucru.motiv : null} salveaza={(s) => { salveaza(s, citite.valoare.versiune); }} />
            </>
          )}
      <IstoricSetari con={con} eu={eu} tinta={`${CALE_SETARI_UTILIZARE.colectie}/${CALE_SETARI_UTILIZARE.id}`} rev={rev} limba={limba} nume="utilizare" />
    </section>
  );
}

function Formular({ initiale, ocupat, faraAppCheck, eroare, salveaza }: {
  readonly initiale: SetariUtilizare; readonly ocupat: boolean; readonly faraAppCheck: boolean; readonly eroare: string | null;
  readonly salveaza: (s: SetariUtilizare) => void;
}): ReactElement {
  const [colectare, setColectare] = useState(initiale.colectare);
  const [clicuri, setClicuri] = useState(initiale.clicuri);
  const [numere, setNumere] = useState<Readonly<Record<CampNumeric, string>>>({
    lotMinute: String(initiale.lotMinute), zileEvenimente: String(initiale.zileEvenimente), zileSume: String(initiale.zileSume),
    pasiEroare: String(initiale.pasiEroare),
  });
  // Un câmp gol nu e 0: `Number('')` ar trece de marginea de jos a pașilor.
  const numar = (s: string): number => (s.trim() === '' ? Number.NaN : Number(s));
  const cerute = setariUtilizareCerute({
    colectare, clicuri, lotMinute: numar(numere.lotMinute), zileEvenimente: numar(numere.zileEvenimente), zileSume: numar(numere.zileSume),
    pasiEroare: numar(numere.pasiEroare),
  });
  const trimite = (e: FormEvent): void => {
    e.preventDefault();
    if (cerute) salveaza(cerute);
  };
  return (
    <form className="util-setari" onSubmit={trimite} data-set="util-formular">
      <label className="set-comutator">
        <input type="checkbox" checked={colectare} data-set-util="colectare" onChange={(e) => { setColectare(e.target.checked); }} />
        <span>{t('admin.set.util.colectare')}</span>
        <span className="admin-slab">{t('admin.set.util.colectare-text')}</span>
      </label>
      <label className="set-comutator">
        <input type="checkbox" checked={clicuri} data-set-util="clicuri" onChange={(e) => { setClicuri(e.target.checked); }} />
        <span>{t('admin.set.util.clicuri')}</span>
        <span className="admin-slab">{t('admin.set.util.clicuri-text')}</span>
      </label>
      {NUMERE.map(({ k, nume }) => {
        const [min, max] = MARGINI_UTILIZARE[k];
        return (
          <label key={k}>
            <span>{t(`admin.set.util.${nume}`)}</span>
            <input type="number" required min={min} max={max} step={1} value={numere[k]} data-set-util={nume}
              onChange={(e) => { const v = e.target.value; setNumere((n) => ({ ...n, [k]: v })); }} />
            <span className="admin-slab">{t(`admin.set.util.${nume}-text`, { min, max, implicit: SETARI_UTILIZARE_IMPLICITE[k] })}</span>
          </label>
        );
      })}
      <div className="admin-randuri">
        <button type="submit" className="principal" disabled={ocupat || faraAppCheck || cerute === null} data-set="util-salveaza">{t('admin.set.util.salveaza')}</button>
        {faraAppCheck ? <span className="admin-slab" data-set="util-fara-appcheck">{t('admin.erori.fara-appcheck')}</span> : null}
      </div>
      {eroare ? <p className="admin-eroare" role="alert" data-set="util-eroare">{t('admin.set.esec', { motiv: eroare })}</p> : null}
    </form>
  );
}
