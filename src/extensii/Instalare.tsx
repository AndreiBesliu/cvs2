/**
 * Ferestrele extensiilor (ADR 0127 §B), aduse la cerere: pachetul dintr-un fișier sau de la o adresă HTTPS (fără
 * credențiale, cel mult 16 MB), judecat de `pachet.ts` și arătat omului, care îl instalează sau nu; un pachet greșit se
 * refuză cu motivul lui, fără nicio scriere. Gestionarea arată extensiile instalate și le scoate.
 */
import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react';
import '../i18n/carcasa.ts';
import { mesajeGata } from '../i18n/laCerere.ts';
import { t, type CheieSimpla } from '../i18n/t.ts';
import type { Limba } from '../i18n/tipuri.ts';
import { useLimba } from '../ui/useLimba.ts';
import { scoateExtensia, scrieExtensia, type ExtensieInstalata, type SursaExtensie } from './depozit.ts';
import type { CerereInstalare } from './tipuri.ts';
import { citestePachet, LIMITE_PACHET, type MotivPachet, type Pachet } from './pachet.ts';

/** Mesajele modulului, ca date (ADR 0086): cine îl încarcă le așteaptă (`cuMesaje`). */
export const mesaje = mesajeGata();
mesaje.catch(() => undefined);

type Pas =
  | { readonly fel: 'adresa' }
  | { readonly fel: 'descarc' }
  | { readonly fel: 'verific' }
  | { readonly fel: 'gata'; readonly pachet: Pachet; readonly sursa: SursaExtensie }
  | { readonly fel: 'refuz'; readonly motiv: MotivPachet; readonly detaliu?: string };

const kb = (n: number, limba: Limba): string =>
  new Intl.NumberFormat(limba === 'ro' ? 'ro-RO' : 'en-GB', { maximumFractionDigits: 1 }).format(n / 1024);
const textSursa = (s: SursaExtensie): string => (s.fel === 'fisier' ? s.nume : s.adresa);
const motivText = (m: MotivPachet, detaliu?: string): string =>
  `${t(`extensii.motiv.${m}` as CheieSimpla)}${detaliu ? ` (${detaliu})` : ''}`;

/** Octeții de la o adresă, opriți peste plafonul pachetului; altfel motivul (pentru om). */
async function descarca(adresa: string): Promise<{ readonly ok: true; readonly octeti: Uint8Array } | { readonly ok: false; readonly motiv: string }> {
  let r: Response;
  try {
    r = await fetch(adresa, { credentials: 'omit', cache: 'no-store' });
  } catch (e) {
    return { ok: false, motiv: e instanceof Error ? e.message : String(e) };
  }
  if (!r.ok || !r.body) return { ok: false, motiv: `HTTP ${r.status}` };
  const cititor = r.body.getReader();
  const bucati: Uint8Array[] = [];
  let n = 0;
  for (;;) {
    const { done, value } = await cititor.read();
    if (done) break;
    n += value.length;
    if (n > LIMITE_PACHET.octetiTotal) {
      await cititor.cancel();
      return { ok: false, motiv: 'prea-mare' };
    }
    bucati.push(value);
  }
  const out = new Uint8Array(n);
  let p = 0;
  for (const b of bucati) { out.set(b, p); p += b.length; }
  return { ok: true, octeti: out };
}

function Fereastra({ titlu, test, onEscape, children }: {
  readonly titlu: string; readonly test: string; readonly onEscape: () => void; readonly children: ReactNode;
}): ReactNode {
  const tasta = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    onEscape();
  };
  return (
    <div className="dialog" role="dialog" aria-modal="true" aria-labelledby={`${test}-titlu`} data-testid={test} onKeyDown={tasta}>
      <div className="dialog-cutie">
        <h2 id={`${test}-titlu`}>{titlu}</h2>
        {children}
      </div>
    </div>
  );
}

export function Instalare({ cerere, instalate, onGata, onScoasa }: {
  readonly cerere: CerereInstalare;
  readonly instalate: readonly ExtensieInstalata[];
  /** Fereastra s-a închis; id-ul extensiei instalate acum, sau null. */
  readonly onGata: (id: string | null) => void;
  /** O extensie scoasă din gestionare (fereastra rămâne deschisă). */
  readonly onScoasa: (id: string) => void;
}): ReactNode {
  const limba = useLimba();
  return cerere.fel === 'gestioneaza'
    ? <Gestionare instalate={instalate} limba={limba} onGata={onGata} onScoasa={onScoasa} />
    : <InstalarePachet cerere={cerere} instalate={instalate} limba={limba} onGata={onGata} />;
}

function InstalarePachet({ cerere, instalate, limba, onGata }: {
  readonly cerere: Exclude<CerereInstalare, { readonly fel: 'gestioneaza' }>;
  readonly instalate: readonly ExtensieInstalata[];
  readonly limba: Limba;
  readonly onGata: (id: string | null) => void;
}): ReactNode {
  const [pas, setPas] = useState<Pas>(cerere.fel === 'adresa' ? { fel: 'adresa' } : { fel: 'verific' });
  const [adresa, setAdresa] = useState(cerere.fel === 'adresa' ? cerere.adresa : '');
  const [eroare, setEroare] = useState<string | null>(null);
  const [scriu, setScriu] = useState(false);
  const judeca = async (octeti: Uint8Array, sursa: SursaExtensie): Promise<Pas> => {
    const r = await citestePachet(octeti);
    return r.ok ? { fel: 'gata', pachet: r.pachet, sursa } : { fel: 'refuz', motiv: r.motiv, ...(r.detaliu !== undefined ? { detaliu: r.detaliu } : {}) };
  };
  useEffect(() => {
    if (cerere.fel !== 'fisier') return;
    let viu = true;
    void cerere.fisier.arrayBuffer().then((b) => judeca(new Uint8Array(b), { fel: 'fisier', nume: cerere.fisier.name })).then((p) => { if (viu) setPas(p); });
    return () => { viu = false; };
  }, [cerere]);

  const renunta = (): void => { onGata(null); };
  const descarcaAdresa = async (): Promise<void> => {
    let u: URL;
    try {
      u = new URL(adresa.trim());
    } catch {
      setEroare(t('extensii.adresa.rea'));
      return;
    }
    if (u.protocol !== 'https:') { setEroare(t('extensii.adresa.rea')); return; }
    setEroare(null);
    setPas({ fel: 'descarc' });
    const d = await descarca(u.href);
    if (!d.ok) {
      if (d.motiv === 'prea-mare') { setPas({ fel: 'refuz', motiv: 'prea-mare' }); return; }
      setPas({ fel: 'adresa' });
      setEroare(t('extensii.adresa.esec', { motiv: d.motiv }));
      return;
    }
    setPas(await judeca(d.octeti, { fel: 'adresa', adresa: u.href }));
  };
  const instaleaza = async (p: Pachet, sursa: SursaExtensie): Promise<void> => {
    setScriu(true);
    await scrieExtensia({
      id: p.manifest.id, manifest: p.manifest, fisiere: Object.fromEntries(p.fisiere), octeti: p.octeti, sursa, instalat: new Date().toISOString(),
    });
    onGata(p.manifest.id);
  };

  if (pas.fel === 'adresa' || pas.fel === 'descarc') {
    return (
      <Fereastra titlu={t('extensii.adresa.titlu')} test="extensii-adresa" onEscape={renunta}>
        {cerere.fel === 'adresa' && cerere.dinLink && <p>{t('extensii.adresa.link')}</p>}
        <label className="extensii-camp">
          <span>{t('extensii.adresa.camp')}</span>
          <input type="url" value={adresa} data-extensii="adresa" autoFocus spellCheck={false} disabled={pas.fel === 'descarc'}
            onChange={(e) => { setAdresa(e.target.value); setEroare(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void descarcaAdresa(); } }} />
        </label>
        {eroare && <p className="avertisment" role="alert" data-testid="extensii-adresa-eroare">{eroare}</p>}
        {pas.fel === 'descarc' && <p>{t('extensii.adresa.descarc')}</p>}
        <div className="butoane">
          <button type="button" data-extensii="descarca" disabled={pas.fel === 'descarc'} onClick={() => { void descarcaAdresa(); }}>{t('extensii.adresa.descarca')}</button>
          <button type="button" data-extensii="renunta" onClick={renunta}>{t('extensii.instalare.renunta')}</button>
        </div>
      </Fereastra>
    );
  }
  if (pas.fel === 'verific') {
    return (
      <Fereastra titlu={t('extensii.instalare.titlu')} test="extensii-instalare" onEscape={renunta}>
        <p>{t('extensii.instalare.verific')}</p>
      </Fereastra>
    );
  }
  if (pas.fel === 'refuz') {
    return (
      <Fereastra titlu={t('extensii.instalare.titlu')} test="extensii-instalare" onEscape={renunta}>
        <p className="avertisment" role="alert" data-testid="extensii-refuz" data-motiv={pas.motiv}>
          {t('extensii.instalare.refuz', { motiv: motivText(pas.motiv, pas.detaliu) })}
        </p>
        <div className="butoane">
          <button type="button" data-extensii="renunta" autoFocus onClick={renunta}>{t('extensii.instalare.renunta')}</button>
        </div>
      </Fereastra>
    );
  }
  const { pachet: p, sursa } = pas;
  const veche = instalate.find((x) => x.id === p.manifest.id);
  return (
    <Fereastra titlu={t('extensii.instalare.titlu')} test="extensii-instalare" onEscape={renunta}>
      <p data-testid="extensii-despre">{t('extensii.instalare.despre', { nume: p.manifest.nume, versiune: p.manifest.versiune, sursa: textSursa(sursa) })}</p>
      <p>{t('extensii.instalare.fisiere', { n: p.fisiere.size, kb: kb(p.octeti, limba) })}</p>
      {veche && <p data-testid="extensii-inlocuieste">{t('extensii.instalare.inlocuieste', { versiune: veche.manifest.versiune })}</p>}
      <p>{t('extensii.instalare.izolare')}</p>
      <div className="butoane">
        <button type="button" data-extensii="instaleaza" autoFocus disabled={scriu} onClick={() => { void instaleaza(p, sursa); }}>
          {t('extensii.instalare.instaleaza')}
        </button>
        <button type="button" data-extensii="renunta" disabled={scriu} onClick={renunta}>{t('extensii.instalare.renunta')}</button>
      </div>
    </Fereastra>
  );
}

function Gestionare({ instalate, limba, onGata, onScoasa }: {
  readonly instalate: readonly ExtensieInstalata[];
  readonly limba: Limba;
  readonly onGata: (id: string | null) => void;
  readonly onScoasa: (id: string) => void;
}): ReactNode {
  const [lista, setLista] = useState(instalate);
  const scoate = async (id: string): Promise<void> => {
    await scoateExtensia(id);
    setLista((l) => l.filter((x) => x.id !== id));
    onScoasa(id);
  };
  const data = (iso: string): string => new Date(iso).toLocaleDateString(limba === 'ro' ? 'ro-RO' : 'en-GB');
  return (
    <Fereastra titlu={t('extensii.gestionare.titlu')} test="extensii-gestionare" onEscape={() => { onGata(null); }}>
      {lista.length === 0 ? <p>{t('extensii.niciuna')}</p> : (
        <ul className="extensii-lista">
          {lista.map((x) => (
            <li key={x.id} data-id={x.id}>
              <span><strong>{x.manifest.nume}</strong> {x.manifest.versiune}<br />
                <small>{t('extensii.gestionare.sursa', { sursa: textSursa(x.sursa), data: data(x.instalat) })}</small></span>
              <button type="button" data-extensii="scoate" onClick={() => { void scoate(x.id); }}>{t('extensii.gestionare.scoate')}</button>
            </li>
          ))}
        </ul>
      )}
      <div className="butoane">
        <button type="button" data-extensii="inchide" autoFocus onClick={() => { onGata(null); }}>{t('extensii.gestionare.inchide')}</button>
      </div>
    </Fereastra>
  );
}
