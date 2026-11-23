/**
 * Ferestrele extensiilor (ADR 0127 §B), aduse la cerere: pachetul dintr-un fișier sau de la o adresă HTTPS (fără
 * credențiale, cel mult 16 MB), judecat de `pachet.ts` și arătat omului, care îl instalează sau nu; un pachet greșit se
 * refuză cu motivul lui, fără nicio scriere. Gestionarea arată extensiile instalate și le scoate, după o întrebare care spune
 * ce se pierde.
 *
 * O singură fereastră de confirmare (ADR 0231 §B.3), pentru un pachet din fișier, de la o adresă, din bibliotecă și pentru o
 * versiune nouă: semnul și numele extensiei în capul ei, de unde vine, „Ce poate face” ca listă (la o actualizare, ce cere
 * în plus stă primul, evidențiat), izolarea, apoi butoanele.
 *
 * Biblioteca (ADR 0230): fereastra unui rând al bibliotecii (ales din meniu sau numit de linkul `#biblioteca=<id>`, când
 * catalogul se cere aici): „Instalează” cu ce cere extensia, pe larg; „Actualizează”, cu ce cere în plus întâi; la capăt,
 * „Deschide”. Pachetul se descarcă abia după clic și se verifică întâi după amprenta din catalog (`biblioteca.ts`); un defect
 * al publicării ajunge și în jurnal (`onDefect`). Un pachet din fișier sau de la o adresă vine „din afara bibliotecii”.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import '../i18n/carcasa.ts';
import { mesajeGata } from '../i18n/laCerere.ts';
import { t, type CheieSimpla } from '../i18n/t.ts';
import type { Limba } from '../i18n/tipuri.ts';
import { useLimba } from '../ui/useLimba.ts';
import { ADRESA_CATALOG, type RandBiblioteca } from '../../shared/biblioteca.ts';
import { cereCatalogul, instaleazaDinBiblioteca, stareRand, type RefuzBiblioteca } from './biblioteca.ts';
import { FaraStocare, octetiDate, scoateExtensia, scrieExtensia, type ExtensieInstalata, type SursaExtensie } from './depozit.ts';
import type { CerereInstalare } from './tipuri.ts';
import { textMarime } from './marimeText.ts';
import { citestePachet, LIMITE_PACHET, type MotivPachet, type Pachet } from './pachet.ts';
import { Semn, SemnInstalat, useSemnInstalat, useSemnOcteti } from './Semn.tsx';
import { adresaSemnCatalog, octetiSemnPachet } from './semn.ts';

/** Mesajele modulului, ca date (ADR 0086): cine îl încarcă le așteaptă (`cuMesaje`). */
export const mesaje = mesajeGata();
mesaje.catch(() => undefined);

type Pas =
  | { readonly fel: 'adresa' }
  | { readonly fel: 'descarc' }
  | { readonly fel: 'verific' }
  | { readonly fel: 'gata'; readonly pachet: Pachet; readonly sursa: SursaExtensie }
  | { readonly fel: 'refuz'; readonly motiv: MotivPachet; readonly detaliu?: string }
  | { readonly fel: 'eroare'; readonly mesaj: string };

/** Pașii ferestrei bibliotecii: catalogul (doar din link), rândul, lucrul, capătul, refuzul. */
type PasBiblioteca =
  | { readonly fel: 'catalog' }
  | { readonly fel: 'fara-catalog'; readonly retea: boolean; readonly detaliu?: string }
  | { readonly fel: 'lipsa' }
  | { readonly fel: 'rand'; readonly rand: RandBiblioteca }
  | { readonly fel: 'lucreaza'; readonly rand: RandBiblioteca }
  | { readonly fel: 'gata'; readonly extensie: ExtensieInstalata }
  | { readonly fel: 'refuz'; readonly motiv: RefuzBiblioteca['motiv']; readonly detaliu?: string }
  | { readonly fel: 'eroare'; readonly mesaj: string };

const textSursa = (s: SursaExtensie): string => (s.fel === 'fisier' ? s.nume : s.fel === 'adresa' ? s.adresa : t('extensii.biblioteca'));
const motivText = (m: RefuzBiblioteca['motiv'], detaliu?: string): string =>
  `${t(`extensii.motiv.${m}` as CheieSimpla)}${detaliu ? ` (${detaliu})` : ''}`;
/** Numele unei permisiuni, cu literă mare (capul unui rând din „Ce poate face”). */
const numePermisiune = (p: string, limba: Limba): string => {
  const s = t(`extensii.permisiune-scurt.${p}` as CheieSimpla);
  return s.charAt(0).toLocaleUpperCase(limba) + s.slice(1);
};
/** Adresa absolută a catalogului: pachetele bibliotecii stau lângă el. */
const adresaCatalog = (): string => new URL(ADRESA_CATALOG, location.href).href;

type Descarcare =
  | { readonly ok: true; readonly octeti: Uint8Array }
  | { readonly ok: false; readonly motiv: 'retea' | 'prea-mare' }
  | { readonly ok: false; readonly motiv: 'http'; readonly status: number };

/**
 * Octeții de la o adresă, opriți peste plafonul pachetului; altfel felul căderii: rețeaua (și o gazdă care nu lasă alte pagini
 * să descarce de la ea: browserul nu le deosebește), răspunsul serverului, mărimea. Textul browserului nu ajunge la om.
 */
async function descarca(adresa: string): Promise<Descarcare> {
  let r: Response;
  try {
    r = await fetch(adresa, { credentials: 'omit', cache: 'no-store' });
  } catch {
    return { ok: false, motiv: 'retea' };
  }
  if (!r.ok || !r.body) return { ok: false, motiv: 'http', status: r.status };
  const cititor = r.body.getReader();
  const bucati: Uint8Array[] = [];
  let n = 0;
  for (;;) {
    let pas: ReadableStreamReadResult<Uint8Array>;
    try {
      pas = await cititor.read();
    } catch {
      return { ok: false, motiv: 'retea' };
    }
    const { done, value } = pas;
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

/**
 * O fereastră a extensiilor. Cu `cap`, e o fereastră despre o extensie anume: semnul ei (sau piesa de puzzle) lângă titlu și,
 * dedesubt, de unde vine.
 */
function Fereastra({ titlu, test, onEscape, cap, children }: {
  readonly titlu: string; readonly test: string; readonly onEscape: () => void;
  readonly cap?: { readonly semn: string | null; readonly sub?: string };
  readonly children: ReactNode;
}): ReactNode {
  const tasta = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    onEscape();
  };
  // O fereastră mai înaltă decât ecranul pornește de sus: focusul pus pe butonul ei (jos) ar derula-o la capăt și ar ascunde
  // despre ce extensie e vorba. Butoanele rămân la vedere, lipite jos (`extensii.css`).
  const cutie = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    if (cutie.current) cutie.current.scrollTop = 0;
  }, [test, titlu]);
  return (
    <div className="dialog dialog-extensii" role="dialog" aria-modal="true" aria-labelledby={`${test}-titlu`} data-testid={test} onKeyDown={tasta}>
      <div className="dialog-cutie" ref={cutie}>
        {cap ? (
          <div className="confirmare-cap">
            <Semn adresa={cap.semn} marime={48} />
            <div>
              <h2 id={`${test}-titlu`}>{titlu}</h2>
              {cap.sub !== undefined && <p className="confirmare-sursa" data-testid="extensii-despre">{cap.sub}</p>}
            </div>
          </div>
        ) : <h2 id={`${test}-titlu`}>{titlu}</h2>}
        {children}
      </div>
    </div>
  );
}

/**
 * „Ce poate face” (ADR 0231 §B.3): câte un rând pe permisiune, cu numele ei și ce face extensia cu ea; fără permisiuni, o
 * propoziție. `nou`: ce cere în plus o versiune nouă, evidențiat.
 */
function Poate({ titlu, permisiuni, limba, test = 'extensii-permisiuni', nou = false }: {
  readonly titlu: string; readonly permisiuni: readonly string[]; readonly limba: Limba; readonly test?: string; readonly nou?: boolean;
}): ReactNode {
  return (
    <section className={nou ? 'poate nou' : 'poate'}>
      <h3>{titlu}</h3>
      {permisiuni.length === 0 ? <p data-testid={test}>{t('extensii.instalare.fara-permisiuni')}</p> : (
        <ul data-testid={test}>
          {permisiuni.map((p) => (
            <li key={p} data-permisiune={p}><strong>{numePermisiune(p, limba)}</strong> <span>{t(`extensii.poate.${p}` as CheieSimpla)}</span></li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function Instalare({ cerere, instalate, onGata, onScoasa, onDefect }: {
  readonly cerere: CerereInstalare;
  readonly instalate: readonly ExtensieInstalata[];
  /** Fereastra s-a închis; id-ul extensiei instalate acum (sau null) și, după „Deschide”, extensia de deschis. */
  readonly onGata: (id: string | null, deschide?: ExtensieInstalata) => void;
  /** O extensie scoasă din gestionare (fereastra rămâne deschisă). */
  readonly onScoasa: (id: string) => void;
  /** Un defect al publicării bibliotecii (catalogul, amprenta, potrivirea): de pus în jurnal. */
  readonly onDefect: (e: Error) => void;
}): ReactNode {
  const limba = useLimba();
  if (cerere.fel === 'gestioneaza') return <Gestionare instalate={instalate} limba={limba} onGata={onGata} onScoasa={onScoasa} />;
  if (cerere.fel === 'biblioteca') return <InstalareBiblioteca cerere={cerere} instalate={instalate} limba={limba} onGata={onGata} onDefect={onDefect} />;
  return <InstalarePachet cerere={cerere} instalate={instalate} limba={limba} onGata={onGata} />;
}

function InstalarePachet({ cerere, instalate, limba, onGata }: {
  readonly cerere: Extract<CerereInstalare, { readonly fel: 'fisier' | 'adresa' }>;
  readonly instalate: readonly ExtensieInstalata[];
  readonly limba: Limba;
  readonly onGata: (id: string | null) => void;
}): ReactNode {
  const [pas, setPas] = useState<Pas>(cerere.fel === 'adresa' ? { fel: 'adresa' } : { fel: 'verific' });
  const [adresa, setAdresa] = useState(cerere.fel === 'adresa' ? cerere.adresa : '');
  const [eroare, setEroare] = useState<string | null>(null);
  const [scriu, setScriu] = useState(false);
  // Semnul pachetului citit, din pachet (înainte de instalare).
  const citit = pas.fel === 'gata' ? pas.pachet : null;
  const semn = useSemnOcteti(useMemo(() => (citit ? octetiSemnPachet(citit) : null), [citit]));
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
      setEroare(d.motiv === 'http' ? t('extensii.adresa.esec-http', { status: d.status }) : t('extensii.adresa.esec-retea'));
      return;
    }
    setPas(await judeca(d.octeti, { fel: 'adresa', adresa: u.href }));
  };
  const instaleaza = async (p: Pachet, sursa: SursaExtensie): Promise<void> => {
    setScriu(true);
    try {
      await scrieExtensia({
        id: p.manifest.id, manifest: p.manifest, fisiere: Object.fromEntries(p.fisiere), octeti: p.octeti, sursa, instalat: new Date().toISOString(),
      });
    } catch (e) {
      setScriu(false);
      setPas({ fel: 'eroare', mesaj: e instanceof FaraStocare ? t('extensii.instalare.fara-stocare') : String(e) });
      return;
    }
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
  if (pas.fel === 'eroare') {
    return (
      <Fereastra titlu={t('extensii.instalare.titlu')} test="extensii-instalare" onEscape={renunta}>
        <p className="avertisment" role="alert" data-testid="extensii-eroare">{pas.mesaj}</p>
        <div className="butoane">
          <button type="button" data-extensii="renunta" autoFocus onClick={renunta}>{t('extensii.instalare.renunta')}</button>
        </div>
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
  const deUnde = {
    versiune: p.manifest.versiune, sursa: textSursa(sursa), fisiere: t('extensii.instalare.fisiere', { n: p.fisiere.size, marime: textMarime(p.octeti, limba) }),
  };
  return (
    <Fereastra titlu={t('extensii.instalare.titlu-nume', { nume: p.manifest.nume })} test="extensii-instalare" onEscape={renunta}
      cap={{ semn, sub: sursa.fel === 'fisier' ? t('extensii.instalare.din-fisier', deUnde) : t('extensii.instalare.de-la-adresa', deUnde) }}>
      <p className="avertisment" data-testid="extensii-din-afara">{t('extensii.instalare.din-afara')}</p>
      {veche && <p data-testid="extensii-inlocuieste">{t('extensii.instalare.inlocuieste', { versiune: veche.manifest.versiune })}</p>}
      <Poate titlu={t('extensii.poate.titlu')} permisiuni={p.manifest.permisiuni} limba={limba} />
      <p className="confirmare-nota" data-testid="extensii-izolare">{t('extensii.instalare.izolare')}</p>
      <div className="butoane">
        <button type="button" data-extensii="instaleaza" autoFocus disabled={scriu} onClick={() => { void instaleaza(p, sursa); }}>
          {t('extensii.instalare.instaleaza')}
        </button>
        <button type="button" data-extensii="renunta" disabled={scriu} onClick={renunta}>{t('extensii.instalare.renunta')}</button>
      </div>
    </Fereastra>
  );
}

/**
 * Fereastra unui rând al bibliotecii (ADR 0230 §D): „Instalează” (ce cere extensia, pe larg) sau „Actualizează” (ce cere în
 * plus, întâi; ce păstrează; datele rămân), apoi descărcarea verificată și capătul, cu „Deschide”. Din link, catalogul se cere
 * aici; o extensie deja instalată se poate doar deschide.
 */
function InstalareBiblioteca({ cerere, instalate, limba, onGata, onDefect }: {
  readonly cerere: Extract<CerereInstalare, { readonly fel: 'biblioteca' }>;
  readonly instalate: readonly ExtensieInstalata[];
  readonly limba: Limba;
  readonly onGata: (id: string | null, deschide?: ExtensieInstalata) => void;
  readonly onDefect: (e: Error) => void;
}): ReactNode {
  const [pas, setPas] = useState<PasBiblioteca>(cerere.rand ? { fel: 'rand', rand: cerere.rand } : { fel: 'catalog' });
  // Semnul extensiei abia instalate, din pachetul ei (capătul ferestrei).
  const semnInstalata = useSemnInstalat(pas.fel === 'gata' ? pas.extensie : null);
  useEffect(() => {
    if (pas.fel !== 'catalog') return;
    let viu = true;
    void cereCatalogul(adresaCatalog()).then((c) => {
      if (!viu) return;
      if (c.fel === 'retea') { setPas({ fel: 'fara-catalog', retea: true }); return; }
      if (c.fel === 'defect') {
        onDefect(new Error(`biblioteca: catalogul (${c.detaliu})`));
        setPas({ fel: 'fara-catalog', retea: false, detaliu: c.detaliu });
        return;
      }
      const r = c.catalog.extensii.find((x) => x.id === cerere.id);
      setPas(r ? { fel: 'rand', rand: r } : { fel: 'lipsa' });
    });
    return () => { viu = false; };
  }, [pas.fel, cerere.id, onDefect]);

  const renunta = (): void => { if (pas.fel !== 'lucreaza') onGata(null); };
  const instaleaza = async (rand: RandBiblioteca): Promise<void> => {
    setPas({ fel: 'lucreaza', rand });
    let r: Awaited<ReturnType<typeof instaleazaDinBiblioteca>>;
    try {
      r = await instaleazaDinBiblioteca(rand, { adresaCatalog: adresaCatalog(), scrie: scrieExtensia });
    } catch (e) {
      setPas({ fel: 'eroare', mesaj: e instanceof FaraStocare ? t('extensii.instalare.fara-stocare') : String(e) });
      return;
    }
    if (!r.ok) {
      if (r.defect) onDefect(new Error(`biblioteca: ${rand.id} ${rand.versiune}: ${r.motiv}${r.detaliu ? ` (${r.detaliu})` : ''}`));
      setPas({ fel: 'refuz', motiv: r.motiv, ...(r.detaliu !== undefined ? { detaliu: r.detaliu } : {}) });
      return;
    }
    setPas({ fel: 'gata', extensie: r.extensie });
  };
  const titluInstalare = t('extensii.instalare.titlu');
  const link = cerere.dinLink && <p data-testid="extensii-link">{t('extensii.biblioteca.link')}</p>;
  const inchide = (focus = false): ReactNode => (
    <button type="button" data-extensii="inchide-instalata" autoFocus={focus} onClick={() => { onGata(null); }}>{t('extensii.instalare.inchide')}</button>
  );

  if (pas.fel === 'catalog' || pas.fel === 'lucreaza') {
    return (
      <Fereastra titlu={titluInstalare} test="extensii-instalare" onEscape={renunta}>
        <p role="status">{pas.fel === 'catalog' ? t('extensii.biblioteca.incarca') : t('extensii.instalare.descarc-verific')}</p>
      </Fereastra>
    );
  }
  if (pas.fel === 'fara-catalog') {
    return (
      <Fereastra titlu={titluInstalare} test="extensii-instalare" onEscape={renunta}>
        {link}
        <p className="avertisment" role="alert">
          {pas.retea ? t('extensii.biblioteca.fara-retea') : t('extensii.biblioteca.eroare')}
        </p>
        <div className="butoane">
          <button type="button" data-extensii="biblioteca-reincearca" autoFocus onClick={() => { setPas({ fel: 'catalog' }); }}>{t('extensii.biblioteca.reincearca')}</button>
          <button type="button" data-extensii="renunta" onClick={renunta}>{t('extensii.instalare.renunta')}</button>
        </div>
      </Fereastra>
    );
  }
  if (pas.fel === 'lipsa') {
    return (
      <Fereastra titlu={titluInstalare} test="extensii-instalare" onEscape={renunta}>
        {link}
        <p>{t('extensii.biblioteca.lipsa', { id: cerere.id })}</p>
        <div className="butoane">{inchide(true)}</div>
      </Fereastra>
    );
  }
  if (pas.fel === 'eroare') {
    return (
      <Fereastra titlu={titluInstalare} test="extensii-instalare" onEscape={renunta}>
        <p className="avertisment" role="alert" data-testid="extensii-eroare">{pas.mesaj}</p>
        <div className="butoane">
          <button type="button" data-extensii="renunta" autoFocus onClick={renunta}>{t('extensii.instalare.renunta')}</button>
        </div>
      </Fereastra>
    );
  }
  if (pas.fel === 'refuz') {
    return (
      <Fereastra titlu={titluInstalare} test="extensii-instalare" onEscape={renunta}>
        <p className="avertisment" role="alert" data-testid="extensii-refuz" data-motiv={pas.motiv}>
          {t('extensii.instalare.refuz', { motiv: motivText(pas.motiv, pas.detaliu) })}
        </p>
        <div className="butoane">
          <button type="button" data-extensii="renunta" autoFocus onClick={renunta}>{t('extensii.instalare.renunta')}</button>
        </div>
      </Fereastra>
    );
  }
  if (pas.fel === 'gata') {
    const e = pas.extensie;
    return (
      <Fereastra titlu={t('extensii.instalare.gata-titlu', { nume: e.manifest.nume })} test="extensii-instalare" onEscape={() => { onGata(e.id); }}
        cap={{ semn: semnInstalata }}>
        <p data-testid="extensii-gata">{t('extensii.instalare.gata', { nume: e.manifest.nume, versiune: e.manifest.versiune })}</p>
        <div className="butoane">
          <button type="button" data-extensii="deschide-instalata" autoFocus onClick={() => { onGata(e.id, e); }}>{t('extensii.instalare.deschide')}</button>
          <button type="button" data-extensii="inchide-instalata" onClick={() => { onGata(e.id); }}>{t('extensii.instalare.inchide')}</button>
        </div>
      </Fereastra>
    );
  }

  const rand = pas.rand;
  const veche = instalate.find((x) => x.id === rand.id);
  const s = stareRand(rand, veche?.manifest);
  const semnRand = adresaSemnCatalog(rand, adresaCatalog());
  if (s.fel === 'instalata' || s.fel === 'alta' || s.fel === 'reincarca') {
    return (
      <Fereastra titlu={rand.nume} test="extensii-instalare" onEscape={renunta} cap={{ semn: semnRand }}>
        {link}
        <p>{s.fel === 'reincarca' ? t('extensii.biblioteca.reincarca') : t('extensii.biblioteca.deja', { nume: rand.nume, versiune: veche?.manifest.versiune ?? '' })}</p>
        <div className="butoane">
          {veche && s.fel !== 'reincarca' && (
            <button type="button" data-extensii="deschide-instalata" autoFocus onClick={() => { onGata(veche.id, veche); }}>{t('extensii.instalare.deschide')}</button>
          )}
          {inchide(!veche || s.fel === 'reincarca')}
        </div>
      </Fereastra>
    );
  }
  const actualizare = s.fel === 'actualizeaza';
  // La o actualizare, ce cere în plus stă primul, evidențiat; apoi ce putea și până acum.
  const noi = actualizare ? s.permisiuniNoi : [];
  const pastrate = rand.permisiuni.filter((p) => !noi.includes(p));
  return (
    <Fereastra titlu={actualizare ? t('extensii.actualizare.titlu', { nume: rand.nume }) : t('extensii.instalare.titlu-nume', { nume: rand.nume })}
      test="extensii-instalare" onEscape={renunta}
      cap={{
        semn: semnRand,
        sub: actualizare ? t('extensii.actualizare.despre', { veche: s.de, noua: rand.versiune }) : t('extensii.instalare.din-biblioteca', { versiune: rand.versiune }),
      }}>
      {link}
      {!actualizare && <p>{rand.descriere[limba]}</p>}
      {noi.length > 0 && <Poate titlu={t('extensii.poate.nou')} permisiuni={noi} limba={limba} test="extensii-permisiuni-noi" nou />}
      {(noi.length === 0 || pastrate.length > 0) && (
        <Poate titlu={noi.length > 0 ? t('extensii.poate.pana-acum') : t('extensii.poate.titlu')} permisiuni={pastrate} limba={limba} />
      )}
      {actualizare && <p>{t('extensii.actualizare.date')}</p>}
      {!actualizare && <p className="confirmare-nota">{t('extensii.instalare.marime-biblioteca', { marime: textMarime(rand.octeti, limba) })}</p>}
      <p className="confirmare-nota" data-testid="extensii-izolare">{t('extensii.instalare.izolare')}</p>
      <div className="butoane">
        {actualizare
          ? <button type="button" data-extensii="actualizeaza" autoFocus onClick={() => { void instaleaza(rand); }}>{t('extensii.actualizare.actualizeaza')}</button>
          : <button type="button" data-extensii="instaleaza" autoFocus onClick={() => { void instaleaza(rand); }}>{t('extensii.instalare.instaleaza')}</button>}
        <button type="button" data-extensii="renunta" onClick={renunta}>{t('extensii.instalare.renunta')}</button>
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
  // Cât ocupă datele fiecărei extensii (ADR 0128 §B); scoaterea le șterge odată cu extensia. null: nu s-au putut număra.
  const [date, setDate] = useState<Readonly<Record<string, number | null>>>({});
  useEffect(() => {
    let viu = true;
    void Promise.all(instalate.map(async (x) => [x.id, await octetiDate(x.id).catch(() => null)] as const))
      .then((r) => { if (viu) setDate(Object.fromEntries(r)); });
    return () => { viu = false; };
  }, [instalate]);
  // „Scoate” întreabă întâi (ADR 0231 §B.4): extensia de scos, cât stă întrebarea; apoi focusul se întoarce pe rândul ei.
  const [deScos, setDeScos] = useState<ExtensieInstalata | null>(null);
  const [scot, setScot] = useState(false);
  const intors = useRef<string | null>(null);
  const cutie = useRef<HTMLUListElement | null>(null);
  useEffect(() => {
    if (deScos) { intors.current = deScos.id; return; }
    const id = intors.current;
    intors.current = null;
    if (id) cutie.current?.querySelector<HTMLButtonElement>(`li[data-id="${CSS.escape(id)}"] [data-extensii="scoate"]`)?.focus();
  }, [deScos]);
  const scoate = async (id: string): Promise<void> => {
    setScot(true);
    try {
      await scoateExtensia(id);
    } finally {
      setScot(false);
    }
    setLista((l) => l.filter((x) => x.id !== id));
    setDeScos(null);
    onScoasa(id);
  };
  const data = (iso: string): string => new Date(iso).toLocaleDateString(limba === 'ro' ? 'ro-RO' : 'en-GB');
  if (deScos) {
    const o = date[deScos.id];
    const ceDate = o === undefined || o === null ? t('extensii.scoatere.date-oricare')
      : o === 0 ? t('extensii.scoatere.fara-date')
        : t('extensii.scoatere.date', { marime: textMarime(o, limba) });
    return (
      <Fereastra titlu={t('extensii.scoatere.titlu', { nume: deScos.manifest.nume })} test="extensii-scoatere" onEscape={() => { if (!scot) setDeScos(null); }}>
        <p data-testid="extensii-scoatere-text">{t('extensii.scoatere.text', { nume: deScos.manifest.nume })} {ceDate}</p>
        <div className="butoane">
          <button type="button" className="pericol" data-extensii="scoate-confirma" disabled={scot} onClick={() => { void scoate(deScos.id); }}>
            {t('extensii.gestionare.scoate')}
          </button>
          <button type="button" data-extensii="scoate-pastreaza" autoFocus disabled={scot} onClick={() => { setDeScos(null); }}>{t('extensii.scoatere.pastreaza')}</button>
        </div>
      </Fereastra>
    );
  }
  return (
    <Fereastra titlu={t('extensii.gestionare.titlu')} test="extensii-gestionare" onEscape={() => { onGata(null); }}>
      {lista.length === 0 ? <p>{t('extensii.niciuna')}</p> : (
        <ul className="extensii-lista" ref={cutie}>
          {lista.map((x) => {
            const o = date[x.id];
            return (
              <li key={x.id} data-id={x.id}>
                <SemnInstalat extensie={x} marime={28} />
                <span className="extensii-rand"><strong>{x.manifest.nume}</strong> {x.manifest.versiune}
                  <small>{x.sursa.fel === 'biblioteca'
                    ? t('extensii.gestionare.din-biblioteca', { data: data(x.instalat) })
                    : t('extensii.gestionare.sursa', { sursa: textSursa(x.sursa), data: data(x.instalat) })}</small>
                  {typeof o === 'number' && <small data-testid="extensii-date">{t('extensii.gestionare.date', { marime: textMarime(o, limba) })}</small>}
                </span>
                <button type="button" data-extensii="scoate" onClick={() => { setDeScos(x); }}>{t('extensii.gestionare.scoate')}</button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="butoane">
        <button type="button" data-extensii="inchide" autoFocus onClick={() => { onGata(null); }}>{t('extensii.gestionare.inchide')}</button>
      </div>
    </Fereastra>
  );
}
