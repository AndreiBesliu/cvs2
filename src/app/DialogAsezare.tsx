/**
 * Dialogul „Așază pe foi” (ADR 0210 §3, felia 11.3↑; planșa 3 a schiței): ce se așază (piesele alese sau toate de pe foaia
 * activă), colțul de pornire, marginea foii și distanța dintre piese pe X și pe Y (legate implicit; cel puțin freza
 * profilului exterior), ordinea și rotirea (răspunsul 3: ambele moduri, implicit ordinea listei, fără rotire), foile noi și,
 * înainte de „Așază”, rezultatul („25 de piese pe 2 foi: 15 + 10”). Alegerile se țin în browser; „Mută și așază la capăt”
 * le folosește. Vine la cerere, cu mesajele panoului (`carcasa`) și cu calculul acțiunilor.
 */
import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import '../i18n/carcasa.ts';
import { mesajeGata } from '../i18n/laCerere.ts';
import { t } from '../i18n/t.ts';
import { COLTURI_ASEZARE, distantaMinima, peFoi, planAsezare, type OptiuniAsezare } from '../model/asezare.ts';
import type { Document } from '../model/document.ts';
import { materialFoaie } from '../model/foi.ts';
import type { RezultatActiune } from '../ui/actiuni.ts';
import '../ui/actiuniDocumentCalcul.ts';
import { optiuniTinute, tineOptiunile } from './asezareTinuta.ts';
import { useLimba } from '../ui/useLimba.ts';

/** Mesajele modulului, ca date (ADR 0086): cine îl încarcă le așteaptă (`cuMesaje`). */
export const mesaje = mesajeGata();
mesaje.catch(() => undefined);

/** Cererea dialogului: instanțele foii active de așezat și alegerile. */
export type CerereAsezare = { readonly ids: readonly string[]; readonly optiuni: OptiuniAsezare };

type Campuri = { readonly margineX: string; readonly margineY: string; readonly distantaX: string; readonly distantaY: string };

/** Un număr scris de om: cu punct sau cu virgulă; altfel NaN (planul îl refuză, cu motivul valorilor). */
const numar = (s: string): number => (/^\s*\d+(?:[.,]\d+)?\s*$/.test(s) ? Number(s.trim().replace(',', '.')) : Number.NaN);

export function DialogAsezare({ doc, idFoaie, selectie, stare, aseaza, onInchide }: {
  readonly doc: Document;
  readonly idFoaie: string;
  readonly selectie: readonly string[];
  /** Starea acțiunii `foaie.aseaza` pentru o cerere, fără s-o ruleze: motivul unui refuz. */
  readonly stare: (c: CerereAsezare) => RezultatActiune;
  readonly aseaza: (c: CerereAsezare) => RezultatActiune;
  readonly onInchide: () => void;
}): ReactNode {
  useLimba();
  const foaie = doc.foi.find((f) => f.id === idFoaie);
  const toate = useMemo(() => foaie?.instante.map((i) => i.id) ?? [], [foaie]);
  const alese = useMemo(() => toate.filter((id) => selectie.includes(id)), [toate, selectie]);
  const [ce, setCe] = useState<'alese' | 'toate'>(alese.length > 0 ? 'alese' : 'toate');
  // Alegerile ținute; distanța pornește cel puțin de la freza profilului exterior al pieselor de așezat (scrisă mai jos de om, refuzată).
  const [tinute] = useState(() => {
    const o = optiuniTinute();
    const d = distantaMinima(doc, alese.length > 0 ? alese : toate, idFoaie);
    return { ...o, distantaX: Math.max(o.distantaX, d), distantaY: Math.max(o.distantaY, d) };
  });
  const [alegeri, setAlegeri] = useState<Pick<OptiuniAsezare, 'colt' | 'ordinea' | 'rotirea'>>(tinute);
  const [campuri, setCampuri] = useState<Campuri>({
    margineX: String(tinute.margineX), margineY: String(tinute.margineY), distantaX: String(tinute.distantaX), distantaY: String(tinute.distantaY),
  });
  const [legate, setLegate] = useState(tinute.distantaX === tinute.distantaY);
  const [motiv, setMotiv] = useState<string | null>(null);

  const ids = ce === 'alese' && alese.length > 0 ? alese : toate;
  const optiuni: OptiuniAsezare = {
    ...alegeri, margineX: numar(campuri.margineX), margineY: numar(campuri.margineY),
    distantaX: numar(campuri.distantaX), distantaY: numar(legate ? campuri.distantaX : campuri.distantaY),
  };
  const cerere: CerereAsezare = { ids, optiuni };
  const plan = useMemo(() => planAsezare(doc, ids, idFoaie, optiuni), [doc, ids, idFoaie, JSON.stringify(optiuni)]);
  const dmin = useMemo(() => distantaMinima(doc, ids, idFoaie), [doc, ids, idFoaie]);
  const s = stare(cerere);

  const scrieCamp = (camp: keyof Campuri, valoare: string): void => {
    setMotiv(null);
    setCampuri((c) => ({ ...c, [camp]: valoare, ...(legate && camp === 'distantaX' ? { distantaY: valoare } : {}) }));
  };
  const alege = (a: Partial<typeof alegeri>): void => {
    setMotiv(null);
    setAlegeri((x) => ({ ...x, ...a }));
  };
  const fa = (): void => {
    const r = aseaza(cerere);
    if (!r.ok) {
      setMotiv(t(r.motiv));
      return;
    }
    tineOptiunile(optiuni);
    onInchide();
  };
  const tasta = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    onInchide();
  };

  // Rezultatul: câte piese pe câte foi („15 + 10”), cele rămase pe loc, cele rotite; sau motivul refuzului.
  const rezultat: string[] = [];
  if (plan.ok) {
    const pe = peFoi(plan);
    const piese = t('aseaza.piese', { n: plan.locuri.length }), foi = t('aseaza.foi', { n: pe.length });
    if (plan.locuri.length > 0) rezultat.push(pe.length > 1 ? t('aseaza.rezultat.detaliat', { piese, foi, detaliu: pe.map(([, n]) => n).join(' + ') }) : t('aseaza.rezultat', { piese, foi }));
    if (plan.foiNoi > 0) rezultat.push(t('aseaza.rezultat.noi', { n: plan.foiNoi }));
    if (plan.preaMari.length > 0) rezultat.push(t('aseaza.raman', { n: plan.preaMari.length }));
    if (plan.rotite > 0) rezultat.push(t('aseaza.rotite', { n: plan.rotite }));
  }
  const stoc = foaie ? t('arbore.foaia', { latime: foaie.stoc.latime, inaltime: foaie.stoc.inaltime, grosime: foaie.stoc.grosime }) : '';
  const material = foaie ? materialFoaie(foaie) : null;
  const camp = (c: keyof Campuri, eticheta: string, dezactivat = false): ReactNode => (
    <label>
      {eticheta}
      <input type="text" inputMode="decimal" autoComplete="off" data-camp={`aseaza-${c}`} value={dezactivat ? campuri.distantaX : campuri[c]}
        disabled={dezactivat} onChange={(e) => { scrieCamp(c, e.target.value); }} />
    </label>
  );

  return (
    <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="aseaza-titlu" data-testid="dialog-asezare" onKeyDown={tasta}>
      <div className="dialog-cutie dialog-asezare">
        <h2 id="aseaza-titlu">{t('aseaza.titlu')}</h2>
        <fieldset className="alegeri">
          <legend>{t('aseaza.ce')}</legend>
          <label className="alegere">
            <input type="radio" name="aseaza-ce" data-aseaza="alese" checked={ce === 'alese' && alese.length > 0} disabled={alese.length === 0}
              onChange={() => { setCe('alese'); setMotiv(null); }} autoFocus={alese.length > 0} />
            {t('aseaza.ce.alese', { n: alese.length })}
          </label>
          <label className="alegere">
            <input type="radio" name="aseaza-ce" data-aseaza="toate" checked={ce === 'toate' || alese.length === 0}
              onChange={() => { setCe('toate'); setMotiv(null); }} autoFocus={alese.length === 0} />
            {t('aseaza.ce.toate', { n: toate.length })}
          </label>
        </fieldset>
        <div className="campuri">
          <label>
            {t('aseaza.colt')}
            <select data-camp="aseaza-colt" value={alegeri.colt} onChange={(e) => { alege({ colt: e.target.value as OptiuniAsezare['colt'] }); }}>
              {COLTURI_ASEZARE.map((c) => <option key={c} value={c}>{t(`aseaza.colt.${c}`)}</option>)}
            </select>
          </label>
        </div>
        <fieldset className="alegeri">
          <legend>{t('aseaza.margine')}</legend>
          {camp('margineX', 'X (mm)')}
          {camp('margineY', 'Y (mm)')}
        </fieldset>
        <fieldset className="alegeri">
          <legend>{t('aseaza.distanta')}</legend>
          {camp('distantaX', 'X (mm)')}
          {camp('distantaY', 'Y (mm)', legate)}
          <label className="alegere">
            <input type="checkbox" data-aseaza="legate" checked={legate} onChange={(e) => { setLegate(e.target.checked); setMotiv(null); }} />
            {t('aseaza.legate')}
          </label>
          {dmin > 0 ? <p className="aseaza-minim" data-testid="aseaza-minim">{t('aseaza.minim', { d: String(dmin) })}</p> : null}
        </fieldset>
        <fieldset className="alegeri">
          <legend>{t('aseaza.ordinea')}</legend>
          {(['lista', 'mari'] as const).map((o) => (
            <label key={o} className="alegere">
              <input type="radio" name="aseaza-ordinea" data-aseaza={`ordinea-${o}`} checked={alegeri.ordinea === o} onChange={() => { alege({ ordinea: o }); }} />
              {t(`aseaza.ordinea.${o}`)}
            </label>
          ))}
        </fieldset>
        <fieldset className="alegeri">
          <legend>{t('aseaza.rotirea')}</legend>
          {(['fara', '90'] as const).map((o) => (
            <label key={o} className="alegere">
              <input type="radio" name="aseaza-rotirea" data-aseaza={`rotirea-${o}`} checked={alegeri.rotirea === o} onChange={() => { alege({ rotirea: o }); }} />
              {t(`aseaza.rotirea.${o}`)}
            </label>
          ))}
        </fieldset>
        <p className="aseaza-noi">{t('aseaza.foi-noi', { stoc: material === null ? stoc : `${stoc} · ${material}` })}</p>
        <p className="aseaza-rezultat" role="status" data-testid="aseaza-rezultat">{s.ok ? rezultat.join(' ') : t(s.motiv)}</p>
        {motiv ? <p className="camp-motiv" role="alert" data-testid="aseaza-motiv">{motiv}</p> : null}
        <div className="butoane">
          <button type="button" data-buton="aseaza" disabled={!s.ok} onClick={fa}>{t('aseaza.buton')}</button>
          <button type="button" data-buton="renunta" onClick={onInchide}>{t('lista.renunta')}</button>
        </div>
      </div>
    </div>
  );
}
