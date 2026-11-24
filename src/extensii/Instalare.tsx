/**
 * Ferestrele extensiilor (ADR 0127 §B), aduse la cerere: pachetul dintr-un fișier sau de la o adresă HTTPS (fără
 * credențiale, cel mult 16 MB), judecat de `pachet.ts` și arătat omului, care îl instalează sau nu; un pachet greșit se
 * refuză cu motivul lui, fără nicio scriere.
 *
 * O singură fereastră de confirmare (ADR 0231 §B.3), pentru un pachet din fișier, de la o adresă și pentru o versiune din
 * bibliotecă care cere ceva în plus: semnul și numele extensiei în capul ei, de unde vine, „Ce poate face” ca listă (la o
 * actualizare, ce cere în plus stă primul, evidențiat), izolarea, apoi butoanele. Pachetul din bibliotecă se descarcă abia
 * după clic și se verifică întâi după amprenta din catalog (`biblioteca.ts`); un defect al publicării ajunge și în jurnal
 * (`onDefect`). Un pachet din fișier sau de la o adresă vine „din afara bibliotecii”.
 *
 * Tot de aici vine fereastra „Biblioteca extensiilor” (`Biblioteca.tsx`): aceeași bucată la cerere.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import '../i18n/carcasa.ts';
import { mesajeGata } from '../i18n/laCerere.ts';
import { t } from '../i18n/t.ts';
import type { Limba } from '../i18n/tipuri.ts';
import { useLimba } from '../ui/useLimba.ts';
import type { RandBiblioteca } from '../../shared/biblioteca.ts';
import { FereastraBiblioteca, type CatalogVazut } from './Biblioteca.tsx';
import { instaleazaDinBiblioteca, stareRand, type RefuzBiblioteca } from './biblioteca.ts';
import { FaraStocare, scrieExtensia, type ExtensieInstalata, type SursaExtensie } from './depozit.ts';
import type { CerereInstalare } from './tipuri.ts';
import { textMarime } from './marimeText.ts';
import { citestePachet, LIMITE_PACHET, type MotivPachet, type Pachet } from './pachet.ts';
import { adresaCatalog, Fereastra, motivText, Poate, textSursa } from './parti.tsx';
import { useSemnInstalat, useSemnOcteti } from './Semn.tsx';
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

/** Pașii confirmării unui rând din bibliotecă: rândul, lucrul, capătul, refuzul. */
type PasBiblioteca =
  | { readonly fel: 'rand'; readonly rand: RandBiblioteca }
  | { readonly fel: 'lucreaza'; readonly rand: RandBiblioteca }
  | { readonly fel: 'gata'; readonly extensie: ExtensieInstalata }
  | { readonly fel: 'refuz'; readonly motiv: RefuzBiblioteca['motiv']; readonly detaliu?: string }
  | { readonly fel: 'eroare'; readonly mesaj: string };


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

export function Instalare({ cerere, instalate, onGata, onDefect, biblioteca, inainte, onAltFisier }: {
  readonly cerere: CerereInstalare;
  readonly instalate: readonly ExtensieInstalata[];
  /** Fereastra s-a închis; id-ul extensiei instalate acum (sau null) și, după „Deschide”, extensia de deschis. */
  readonly onGata: (id: string | null, deschide?: ExtensieInstalata) => void;
  /** Un defect al publicării bibliotecii (amprenta, potrivirea): de pus în jurnal. */
  readonly onDefect: (e: Error) => void;
  /**
   * Înaintea scrierii unei extensii (ADR 0232 §A.2): dacă e chiar cea deschisă, gazda îi cere întâi salvările și, la nevoie,
   * întreabă omul. `false`: omul rămâne în extensie și nu se instalează nimic.
   */
  readonly inainte?: (id: string) => Promise<boolean>;
  /** „Alege alt fișier…”, din fereastra refuzului: gazda deschide alegerea fișierului. */
  readonly onAltFisier?: () => void;
  /** Ce îi trebuie ferestrei „Biblioteca extensiilor” de la gazdă (doar pentru cererea `fereastra`). */
  readonly biblioteca?: {
    readonly catalog: CatalogVazut;
    readonly acoperita: boolean;
    readonly onReincearca: () => void;
    readonly onSchimbata: (id: string) => void;
    readonly onScoasa: (id: string) => void;
    readonly onCere: (c: CerereInstalare | 'fisier') => void;
  };
}): ReactNode {
  const limba = useLimba();
  if (cerere.fel === 'fereastra') {
    if (!biblioteca) return null;
    return (
      <FereastraBiblioteca cerere={cerere} catalog={biblioteca.catalog} instalate={instalate} limba={limba} acoperita={biblioteca.acoperita}
        onReincearca={biblioteca.onReincearca} onInchide={() => { onGata(null); }} onDeschide={(e) => { onGata(e.id, e); }}
        onSchimbata={biblioteca.onSchimbata} onScoasa={biblioteca.onScoasa} onCere={biblioteca.onCere} onDefect={onDefect} inainte={inainte} />
    );
  }
  if (cerere.fel === 'biblioteca') {
    return <InstalareBiblioteca cerere={cerere} instalate={instalate} limba={limba} onGata={onGata} onDefect={onDefect} inainte={inainte} />;
  }
  return <InstalarePachet cerere={cerere} instalate={instalate} limba={limba} onGata={onGata} inainte={inainte} onAltFisier={onAltFisier} />;
}

function InstalarePachet({ cerere, instalate, limba, onGata, inainte, onAltFisier }: {
  readonly cerere: Extract<CerereInstalare, { readonly fel: 'fisier' | 'adresa' }>;
  readonly instalate: readonly ExtensieInstalata[];
  readonly limba: Limba;
  readonly onGata: (id: string | null) => void;
  readonly inainte: ((id: string) => Promise<boolean>) | undefined;
  readonly onAltFisier: (() => void) | undefined;
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
    // Un alt fișier, ales din fereastra refuzului: judecata pornește de la capăt.
    setPas({ fel: 'verific' });
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
    // Peste extensia deschisă: întâi salvările ei; „Rămân” închide confirmarea, fără nicio scriere.
    if (inainte && !await inainte(p.manifest.id)) { onGata(null); return; }
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
    // Refuzul are fereastra lui (ADR 0232 §A.4): ce s-a întâmplat, cu ce fișier, de ce, și drumul înapoi.
    const deLaAdresa = cerere.fel === 'adresa';
    return (
      <Fereastra titlu={t('extensii.refuz.titlu')} test="extensii-instalare" onEscape={renunta}>
        <p className="confirmare-sursa" data-testid="extensii-refuz-sursa">{deLaAdresa ? adresa : cerere.fisier.name}</p>
        <p className="avertisment" role="alert" data-testid="extensii-refuz" data-motiv={pas.motiv}>{motivText(pas.motiv, pas.detaliu)}</p>
        <div className="butoane">
          {deLaAdresa
            ? <button type="button" data-extensii="alta-adresa" autoFocus onClick={() => { setPas({ fel: 'adresa' }); }}>{t('extensii.refuz.alta-adresa')}</button>
            : <button type="button" data-extensii="alt-fisier" autoFocus onClick={onAltFisier}>{t('extensii.refuz.alt-fisier')}</button>}
          <button type="button" data-extensii="inchide-refuz" onClick={renunta}>{t('extensii.refuz.inchide')}</button>
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
 * Confirmarea unui rând al bibliotecii (ADR 0230 §D): o versiune nouă care cere ceva în plus, cu ce cere întâi, ce putea și
 * până acum și datele care rămân; apoi descărcarea verificată și capătul, cu „Deschide”. (Instalarea și actualizarea care nu
 * cere nimic în plus se fac în pagina extensiei, în fereastra bibliotecii, ori în meniu.)
 */
function InstalareBiblioteca({ cerere, instalate, limba, onGata, onDefect, inainte }: {
  readonly cerere: Extract<CerereInstalare, { readonly fel: 'biblioteca' }>;
  readonly instalate: readonly ExtensieInstalata[];
  readonly limba: Limba;
  readonly onGata: (id: string | null, deschide?: ExtensieInstalata) => void;
  readonly onDefect: (e: Error) => void;
  readonly inainte: ((id: string) => Promise<boolean>) | undefined;
}): ReactNode {
  const [pas, setPas] = useState<PasBiblioteca>({ fel: 'rand', rand: cerere.rand });
  // Semnul extensiei abia instalate, din pachetul ei (capătul ferestrei).
  const semnInstalata = useSemnInstalat(pas.fel === 'gata' ? pas.extensie : null);

  const renunta = (): void => { if (pas.fel !== 'lucreaza') onGata(null); };
  const instaleaza = async (rand: RandBiblioteca): Promise<void> => {
    setPas({ fel: 'lucreaza', rand });
    if (inainte && !await inainte(rand.id)) { onGata(null); return; }
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
  const inchide = (focus = false): ReactNode => (
    <button type="button" data-extensii="inchide-instalata" autoFocus={focus} onClick={() => { onGata(null); }}>{t('extensii.instalare.inchide')}</button>
  );

  if (pas.fel === 'lucreaza') {
    return (
      <Fereastra titlu={titluInstalare} test="extensii-instalare" onEscape={renunta}>
        <p role="status">{t('extensii.instalare.descarc-verific')}</p>
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
    // Refuzul unui pachet din bibliotecă (ADR 0232 §A.4): o descărcare căzută se poate încerca din nou, aici.
    const descarcare = pas.motiv === 'retea' || pas.motiv === 'http';
    return (
      <Fereastra titlu={t('extensii.refuz.titlu')} test="extensii-instalare" onEscape={renunta}>
        <p className="confirmare-sursa" data-testid="extensii-refuz-sursa">{`${cerere.rand.nume} ${cerere.rand.versiune}`}</p>
        <p className="avertisment" role="alert" data-testid="extensii-refuz" data-motiv={pas.motiv}>{motivText(pas.motiv, pas.detaliu)}</p>
        <div className="butoane">
          {descarcare && (
            <button type="button" data-extensii="instaleaza-din-nou" autoFocus onClick={() => { void instaleaza(cerere.rand); }}>{t('extensii.refuz.din-nou')}</button>
          )}
          <button type="button" data-extensii="inchide-refuz" autoFocus={!descarcare} onClick={renunta}>{t('extensii.refuz.inchide')}</button>
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
