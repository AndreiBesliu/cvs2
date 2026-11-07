import { useEffect, useRef, useState, type ReactElement } from 'react';
import '../i18n/editare.ts';
import { mesajeGata } from '../i18n/laCerere.ts';
import { t } from '../i18n/t.ts';
import type { CerereConversie, RezultatConversie } from '../model/conversie.ts';
import type { Document } from '../model/document.ts';
import { TOLERANTA_MAXIMA, TOLERANTA_MINIMA } from '../model/verificareLimite.ts';
import type { RezultatActiune } from '../ui/actiuni.ts';
import type { ConversieCalculata } from '../ui/actiuniDocument.ts';
import { citesteNumar, textNumar } from '../ui/numar.ts';
import { useLimba } from '../ui/useLimba.ts';
import './taiere.css';

/** Mesajele modulului, ca date (ADR 0086): cine îl încarcă le așteaptă (`cuMesaje`); un refuz îl vede tot el. */
export const mesaje = mesajeGata();
mesaje.catch(() => undefined);

/**
 * Panoul Convertește (ADR 0180 §8, §9, §10, §11; feliile 10.3↑d și 10.3↑e), adus la cerere din extensia barei: **Arce în locul
 * curbelor** (cu „și liniile scurte care stau pe un cerc”), **Netezește** (cu „Păstrează liniile mai lungi de”), **În cerc** și
 * **În dreptunghi** („doar dacă e”, la toleranța rândului, sau cu mărimea dată), fiecare cu butonul lui. Calculul e al workerului CAM, pe documentul din clipa clicului; conversia se aplică
 * prin acțiunea `document.converteste`, într-un pas de anulare, doar dacă desenul nu s-a schimbat între timp. Panoul spune ce
 * s-a făcut (formele, curbele, arcele, abaterea cea mai mare) și de ce au rămas celelalte.
 */

type Stare = { readonly fel: 'calcul' } | { readonly fel: 'gata'; readonly text: string; readonly rau: boolean };

/** O toleranță scrisă de om, în 0,001 … 1 mm, sau null. */
function toleranta(s: string): number | null {
  const x = citesteNumar(s);
  return x !== null && x >= TOLERANTA_MINIMA && x <= TOLERANTA_MAXIMA ? x : null;
}
/** O mărime scrisă de om, pozitivă, sau null. */
function marime(s: string): number | null {
  const x = citesteNumar(s);
  return x !== null && x > 0 ? x : null;
}
/** Un număr rotunjit la 0,001 mm, cu virgulă în română. */
const numar = (x: number, virgula: boolean): string => textNumar(Math.round(x * 1000) / 1000, virgula);

/** Ce s-a întâmplat, în propoziții: întâi ce s-a făcut (sau „nimic”), apoi de ce au rămas celelalte. */
function textRezultat(c: CerereConversie, r: Extract<RezultatConversie, { ok: true }>, virgula: boolean): string {
  const n = String(r.convertite), a = numar(r.abatere, virgula);
  const dat = (c.fel === 'cerc' && c.diametru !== null) || (c.fel === 'dreptunghi' && c.marime !== null);
  const parti = [r.convertite === 0
    ? t(c.fel === 'arce' ? (c.linii ? 'editare.conversie.nimic.arce-linii' : 'editare.conversie.nimic.arce') : c.fel === 'netezire' ? 'editare.conversie.nimic.netezire' : 'editare.conversie.nimic')
    : c.fel === 'arce'
      ? t('editare.conversie.gata.arce', { n, curbe: String(r.curbe), arce: String(r.arce), linii: String(r.linii), a })
      : c.fel === 'netezire'
        ? t('editare.conversie.gata.netezire', { n, linii: String(r.linii), curbe: String(r.curbe), a })
        : t(dat ? 'editare.conversie.gata.marime' : 'editare.conversie.gata', { n, a })];
  if (r.nepotrivite > 0 && (c.fel === 'cerc' || c.fel === 'dreptunghi')) {
    parti.push(t(c.fel === 'cerc' ? 'editare.conversie.nepotrivite.cerc' : 'editare.conversie.nepotrivite.dreptunghi', { n: String(r.nepotrivite) }));
    if (r.abatereMinima !== null) parti.push(t('editare.conversie.abatere-minima', { a: numar(r.abatereMinima, virgula) }));
  }
  if (r.operatie > 0) parti.push(t('editare.conversie.operatie', { n: String(r.operatie) }));
  const sarite = c.fel === 'arce' ? 'editare.conversie.sarite.arce' : c.fel === 'netezire' ? 'editare.conversie.sarite.netezire' : 'editare.conversie.sarite';
  if (r.sarite > 0) parti.push(t(sarite, { n: String(r.sarite) }));
  return parti.join(' ');
}

export function PanouConversie({ doc, selectie, onConverteste, onInchide }: {
  readonly doc: Document;
  /** Selecția aplicației: id-urile instanțelor. */
  readonly selectie: readonly string[];
  /** Aplică o conversie calculată (acțiunea `document.converteste`), cu verdictul ei. */
  readonly onConverteste: (c: ConversieCalculata) => RezultatActiune;
  readonly onInchide: () => void;
}): ReactElement {
  const virgula = useLimba() === 'ro';
  const [tolArce, setTolArce] = useState(() => textNumar(0.01, virgula));
  const [linii, setLinii] = useState(true);
  const [tolNetezire, setTolNetezire] = useState(() => textNumar(0.01, virgula));
  const [pastreaza, setPastreaza] = useState(() => textNumar(5, virgula));
  const [modCerc, setModCerc] = useState<'daca' | 'diametru'>('daca');
  const [tolCerc, setTolCerc] = useState(() => textNumar(0.1, virgula));
  const [diametru, setDiametru] = useState(() => textNumar(8, virgula));
  const [modDreptunghi, setModDreptunghi] = useState<'daca' | 'marime'>('daca');
  const [tolDreptunghi, setTolDreptunghi] = useState(() => textNumar(0.1, virgula));
  const [latime, setLatime] = useState(() => textNumar(40, virgula));
  const [inaltime, setInaltime] = useState(() => textNumar(20, virgula));
  const [stare, setStare] = useState<Stare | null>(null);
  const semnal = useRef<AbortController | null>(null);
  useEffect(() => () => { semnal.current?.abort(); }, []);
  // Rezultatul stă sub blocuri, iar panoul (cel mult 70 % din fereastră) se derulează: adus în vedere la fiecare schimbare.
  const randStare = useRef<HTMLParagraphElement | null>(null);
  useEffect(() => { if (stare) randStare.current?.scrollIntoView({ block: 'nearest' }); }, [stare]);

  const alese = [...selectie];
  const ta = toleranta(tolArce), tc = toleranta(tolCerc), td = toleranta(tolDreptunghi);
  const d = marime(diametru), l = marime(latime), h = marime(inaltime);
  // Fiecare bloc își are cererea (sau motivul pentru care butonul lui stă oprit).
  const cerereArce: CerereConversie | null = ta === null ? null : { fel: 'arce', alese, toleranta: ta, linii };
  const tn = toleranta(tolNetezire), lp = marime(pastreaza);
  const cerereNetezire: CerereConversie | null = tn === null || lp === null ? null : { fel: 'netezire', alese, toleranta: tn, pastreaza: lp };
  const motivNetezire = tn === null ? t('editare.conversie.motiv.toleranta') : lp === null ? t('editare.conversie.motiv.valoare') : null;
  const cerereCerc: CerereConversie | null = modCerc === 'daca'
    ? (tc === null ? null : { fel: 'cerc', alese, toleranta: tc, diametru: null })
    : (d === null ? null : { fel: 'cerc', alese, toleranta: TOLERANTA_MAXIMA, diametru: d });
  const cerereDreptunghi: CerereConversie | null = modDreptunghi === 'daca'
    ? (td === null ? null : { fel: 'dreptunghi', alese, toleranta: td, marime: null })
    : (l === null || h === null ? null : { fel: 'dreptunghi', alese, toleranta: TOLERANTA_MAXIMA, marime: { latime: l, inaltime: h } });
  const motivCerc = cerereCerc ? null : t(modCerc === 'daca' ? 'editare.conversie.motiv.toleranta' : 'editare.conversie.motiv.valoare');
  const motivDreptunghi = cerereDreptunghi ? null : t(modDreptunghi === 'daca' ? 'editare.conversie.motiv.toleranta' : 'editare.conversie.motiv.valoare');
  const opreste = selectie.length === 0 || stare?.fel === 'calcul';

  /** Conversia, calculată de worker pe documentul de acum; aplicată prin acțiunea documentului. Un eșec (nu o anulare) merge în jurnal. */
  const ruleaza = (c: CerereConversie | null): void => {
    if (!c || opreste) return;
    const laCerere = doc;
    const s = new AbortController();
    semnal.current?.abort();
    semnal.current = s;
    setStare({ fel: 'calcul' });
    const cade = (e: unknown): void => {
      if (s.signal.aborted) return;
      reportError(new Error(`conversia vectorilor: ${e instanceof Error ? e.message : String(e)}`));
      setStare({ fel: 'gata', text: t('editare.conversie.eroare'), rau: true });
    };
    import('../ui/actiuniExportCalcul.ts').then((calc) => {
      if (s.signal.aborted) return;
      calc.convertesteVectorii(laCerere, c, s.signal).then((r) => {
        if (s.signal.aborted) return;
        if (!r.ok) {
          setStare({ fel: 'gata', text: t(`editare.conversie.motiv.${r.motiv}`), rau: true });
          return;
        }
        const text = textRezultat(c, r, virgula);
        if (r.piese.length === 0) {
          setStare({ fel: 'gata', text, rau: true });
          return;
        }
        const v = onConverteste({ doc: laCerere, piese: r.piese });
        setStare(v.ok ? { fel: 'gata', text, rau: false } : { fel: 'gata', text: t(v.motiv), rau: true });
      }, (e: unknown) => { if (!(e instanceof calc.CalculAnulat)) cade(e); });
    }, cade);
  };

  const camp = (valoare: string, set: (v: string) => void, cheie: string, eticheta: string, laFocus?: () => void): ReactElement => (
    <input className="camp-taiere" value={valoare} inputMode="decimal" data-conversie={cheie} aria-label={eticheta}
      onFocus={laFocus} onChange={(e) => { set(e.target.value); }} />
  );

  return (
    <>
      {selectie.length === 0
        ? <p className="motiv-retea" role="status" data-testid="conversie-motiv">{t('editare.conversie.motiv.nimic-ales')}</p>
        : <p className="stare-taiere">{t('editare.conversie.alese', { n: String(selectie.length) })}</p>}
      <fieldset className="campuri-taiere">
        <legend>{t('editare.conversie.arce')}</legend>
        <p className="stare-taiere">{t('editare.conversie.arce.text')}</p>
        <label className="rand-taiere" title={t('editare.conversie.toleranta.titlu')}>
          <span aria-hidden="true" />
          <span>{t('editare.conversie.toleranta')}</span>
          {camp(tolArce, setTolArce, 'toleranta-arce', t('editare.conversie.toleranta'))}
          <span>mm</span>
        </label>
        <label className="bifa-taiere" title={t('editare.conversie.arce.linii.titlu')}>
          <input type="checkbox" checked={linii} data-conversie="linii" onChange={(e) => { setLinii(e.target.checked); }} />
          <span>{t('editare.conversie.arce.linii')}</span>
        </label>
        {cerereArce ? null : <p className="motiv-retea">{t('editare.conversie.motiv.toleranta')}</p>}
        <div className="butoane-retea">
          <button type="button" data-conversie="arce" disabled={!cerereArce || opreste} onClick={() => { ruleaza(cerereArce); }}>{t('editare.conversie.arce.buton')}</button>
        </div>
      </fieldset>
      <fieldset className="campuri-taiere">
        <legend>{t('editare.conversie.netezire')}</legend>
        <p className="stare-taiere">{t('editare.conversie.netezire.text')}</p>
        <label className="rand-taiere" title={t('editare.conversie.toleranta.titlu')}>
          <span aria-hidden="true" />
          <span>{t('editare.conversie.toleranta')}</span>
          {camp(tolNetezire, setTolNetezire, 'toleranta-netezire', t('editare.conversie.toleranta'))}
          <span>mm</span>
        </label>
        <label className="rand-taiere" title={t('editare.conversie.netezire.pastreaza.titlu')}>
          <span aria-hidden="true" />
          <span>{t('editare.conversie.netezire.pastreaza')}</span>
          {camp(pastreaza, setPastreaza, 'pastreaza', t('editare.conversie.netezire.pastreaza'))}
          <span>mm</span>
        </label>
        {motivNetezire ? <p className="motiv-retea">{motivNetezire}</p> : null}
        <div className="butoane-retea">
          <button type="button" data-conversie="netezire" disabled={!cerereNetezire || opreste} onClick={() => { ruleaza(cerereNetezire); }}>{t('editare.conversie.netezire.buton')}</button>
        </div>
      </fieldset>
      <fieldset className="campuri-taiere">
        <legend>{t('editare.conversie.cerc')}</legend>
        <label className="rand-taiere" title={t('editare.conversie.cerc.daca.titlu')}>
          <input type="radio" name="conversie-cerc" checked={modCerc === 'daca'} data-conversie="cerc-daca" onChange={() => { setModCerc('daca'); }} />
          <span>{t('editare.conversie.cerc.daca')}</span>
          {camp(tolCerc, setTolCerc, 'toleranta-cerc', t('editare.conversie.toleranta'), () => { setModCerc('daca'); })}
          <span>mm</span>
        </label>
        <label className="rand-taiere" title={t('editare.conversie.cerc.diametru.titlu')}>
          <input type="radio" name="conversie-cerc" checked={modCerc === 'diametru'} data-conversie="cerc-diametru" onChange={() => { setModCerc('diametru'); }} />
          <span>{t('editare.conversie.cerc.diametru')}</span>
          {camp(diametru, setDiametru, 'diametru', t('editare.conversie.cerc.diametru'), () => { setModCerc('diametru'); })}
          <span>mm</span>
        </label>
        {motivCerc ? <p className="motiv-retea">{motivCerc}</p> : null}
        <div className="butoane-retea">
          <button type="button" data-conversie="cerc" disabled={!cerereCerc || opreste} onClick={() => { ruleaza(cerereCerc); }}>{t('editare.conversie.cerc.buton')}</button>
        </div>
      </fieldset>
      <fieldset className="campuri-taiere">
        <legend>{t('editare.conversie.dreptunghi')}</legend>
        <label className="rand-taiere" title={t('editare.conversie.dreptunghi.daca.titlu')}>
          <input type="radio" name="conversie-dreptunghi" checked={modDreptunghi === 'daca'} data-conversie="dreptunghi-daca" onChange={() => { setModDreptunghi('daca'); }} />
          <span>{t('editare.conversie.dreptunghi.daca')}</span>
          {camp(tolDreptunghi, setTolDreptunghi, 'toleranta-dreptunghi', t('editare.conversie.toleranta'), () => { setModDreptunghi('daca'); })}
          <span>mm</span>
        </label>
        <div className="rand-taiere rand-marime-conversie" title={t('editare.conversie.dreptunghi.marime.titlu')}>
          <label className="eticheta-marime-conversie">
            <input type="radio" name="conversie-dreptunghi" checked={modDreptunghi === 'marime'} data-conversie="dreptunghi-marime" onChange={() => { setModDreptunghi('marime'); }} />
            <span>{t('editare.conversie.dreptunghi.marime')}</span>
          </label>
          <span className="marime-conversie">
            {camp(latime, setLatime, 'latime', t('editare.conversie.latime'), () => { setModDreptunghi('marime'); })}
            <span aria-hidden="true">×</span>
            {camp(inaltime, setInaltime, 'inaltime', t('editare.conversie.inaltime'), () => { setModDreptunghi('marime'); })}
          </span>
          <span>mm</span>
        </div>
        {motivDreptunghi ? <p className="motiv-retea">{motivDreptunghi}</p> : null}
        <div className="butoane-retea">
          <button type="button" data-conversie="dreptunghi" disabled={!cerereDreptunghi || opreste} onClick={() => { ruleaza(cerereDreptunghi); }}>{t('editare.conversie.dreptunghi.buton')}</button>
        </div>
      </fieldset>
      {stare ? (
        <p ref={randStare} className={stare.fel === 'gata' && stare.rau ? 'motiv-retea' : 'stare-taiere'} role="status" data-testid="conversie-stare">
          {stare.fel === 'calcul' ? t('editare.conversie.calcul') : stare.text}
        </p>
      ) : null}
      <div className="butoane-retea">
        <button type="button" data-conversie="inchide-panoul" onClick={onInchide}>{t('editare.retea.inchide')}</button>
      </div>
    </>
  );
}
