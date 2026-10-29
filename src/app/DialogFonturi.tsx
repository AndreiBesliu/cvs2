import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { CATEGORII_GOOGLE, type CatalogGoogle, type CategorieGoogle } from '../../shared/fonturiGoogle.ts';
import { mesajeGata } from '../i18n/laCerere.ts';
import { t, type CheieSimpla } from '../i18n/t.ts';
import { catalogGoogle, descarcaInBiblioteca } from './fonturiGoogleClient.ts';
import { textRefuzFont } from './texteFont.ts';

/** Mesajele modulului, ca date (ADR 0086): cine îl încarcă le așteaptă (`cuMesaje`); un refuz îl vede tot el. */
export const mesaje = mesajeGata();

type ModulText = typeof import('../text/calcul.ts');
type FontSalvat = import('../text/biblioteca.ts').FontSalvat;
type RezultatAdaugare = import('../text/biblioteca.ts').RezultatAdaugare;
type StareSistem = import('../text/sistem.ts').StareSistem;

type Fila = 'mele' | 'google' | 'sistem';
const FILE: readonly Fila[] = ['mele', 'google', 'sistem'];
/** Câte familii Google se arată odată (catalogul are ~2 000): restul, după o căutare mai precisă. */
const ARATATE = 60;
const CATEGORIE: Record<CategorieGoogle, CheieSimpla> = {
  'Sans Serif': 'editare.fonturi.categorie.sans', Serif: 'editare.fonturi.categorie.serif', Display: 'editare.fonturi.categorie.display',
  Handwriting: 'editare.fonturi.categorie.mana', Monospace: 'editare.fonturi.categorie.mono',
};

const mb = (octeti: number): string => (octeti / (1024 * 1024)).toFixed(octeti < 1024 * 1024 ? 2 : 1);

/** Ce a ieșit dintr-o încărcare sau o descărcare: fonturile adăugate, cele care erau deja, cele refuzate (cu motivul). */
function Rezultat({ r }: { readonly r: RezultatAdaugare }): ReactElement {
  return (
    <div data-testid="fonturi-rezultat">
      {r.adaugate.length > 0 ? <p role="status">{t('editare.fonturi.adaugate', { n: r.adaugate.length, nume: r.adaugate.map((f) => f.nume.complet).join(', ') })}</p> : null}
      {r.existente.length > 0 ? <p role="status">{t('editare.fonturi.existente', { nume: r.existente.map((f) => f.nume.complet).join(', ') })}</p> : null}
      {r.refuzate.map((x, k) => <p key={k} role="alert" className="avertisment">{t('editare.fonturi.refuzat', { nume: x.nume, motiv: textRefuzFont(x.cod) })}</p>)}
    </div>
  );
}

/**
 * Fereastra fonturilor (ADR 0106 §5): „Fonturile mele” (încărcarea fișierelor, lista, ștergerea), Google Fonts (căutarea în
 * catalog, stilul, descărcarea) și fonturile sistemului (permisiunea, cerută la clic). Un font adăugat se alege în panou.
 */
export function DialogFonturi({ modul, ales, onSchimbat, onFoloseste, onInchide }: {
  readonly modul: ModulText;
  /** Fontul ales acum în panou. */
  readonly ales: string;
  /** Biblioteca sau permisiunea s-au schimbat (`id`: fontul atins): panoul își recitește listele. */
  readonly onSchimbat: (id?: string) => void;
  readonly onFoloseste: (id: string) => void;
  readonly onInchide: () => void;
}): ReactElement {
  const [fila, setFila] = useState<Fila>('mele');
  const cutie = useRef<HTMLDivElement>(null);
  useEffect(() => { cutie.current?.focus(); }, []);
  // Escape închide fereastra oriunde ar fi focusul, nu și panoul de sub ea.
  const inchide = useRef(onInchide);
  inchide.current = onInchide;
  useEffect(() => {
    const tasta = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      inchide.current();
    };
    document.addEventListener('keydown', tasta, true);
    return () => { document.removeEventListener('keydown', tasta, true); };
  }, []);

  return (
    <div className="dialog dialog-fonturi" role="dialog" aria-modal="true" aria-labelledby="fonturi-titlu" data-testid="dialog-fonturi">
      <div className="dialog-cutie" ref={cutie} tabIndex={-1}>
        <h2 id="fonturi-titlu">{t('editare.fonturi.titlu')}</h2>
        <div className="file-fonturi" role="tablist" aria-label={t('editare.fonturi.titlu')}>
          {FILE.map((f) => (
            <button key={f} type="button" role="tab" aria-selected={fila === f} data-fila-fonturi={f} onClick={() => { setFila(f); }}>
              {t(`editare.fonturi.${f}`)}
            </button>
          ))}
        </div>
        <div role="tabpanel">
          {fila === 'mele' ? <FilaMele modul={modul} ales={ales} onSchimbat={onSchimbat} onFoloseste={onFoloseste} /> : null}
          {fila === 'google' ? <FilaGoogle modul={modul} onSchimbat={onSchimbat} onFoloseste={onFoloseste} /> : null}
          {fila === 'sistem' ? <FilaSistem modul={modul} onSchimbat={onSchimbat} /> : null}
        </div>
        <div className="butoane">
          <button type="button" data-buton="inchide-fonturi" onClick={onInchide}>{t('editare.retea.inchide')}</button>
        </div>
      </div>
    </div>
  );
}

function FilaMele({ modul, ales, onSchimbat, onFoloseste }: {
  readonly modul: ModulText; readonly ales: string; readonly onSchimbat: (id?: string) => void; readonly onFoloseste: (id: string) => void;
}): ReactElement {
  const [lista, setLista] = useState<readonly FontSalvat[] | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);
  const [lucru, setLucru] = useState(false);
  const [rezultat, setRezultat] = useState<RezultatAdaugare | null>(null);
  const fisier = useRef<HTMLInputElement>(null);
  const citeste = (): void => {
    void modul.listaBiblioteca().then((l) => { setLista(l); setEroare(null); }, () => { setLista([]); setEroare(t('editare.text.font.fara-stocare')); });
  };
  useEffect(citeste, [modul]);

  const incarca = async (fisiere: FileList | null): Promise<void> => {
    if (!fisiere || fisiere.length === 0) return;
    setLucru(true);
    const tot: { adaugate: FontSalvat[]; existente: FontSalvat[]; refuzate: { nume: string; cod: string }[] } = { adaugate: [], existente: [], refuzate: [] };
    for (const f of [...fisiere]) {
      try {
        const r = f.size > modul.PLAFON_FONTURI.octetiFisier
          ? { adaugate: [], existente: [], refuzate: [{ nume: f.name, cod: 'prea-mare' }] }
          : await modul.adaugaFisier(f.name, new Uint8Array(await f.arrayBuffer()));
        tot.adaugate.push(...r.adaugate);
        tot.existente.push(...r.existente);
        tot.refuzate.push(...r.refuzate);
      } catch {
        tot.refuzate.push({ nume: f.name, cod: 'fara-stocare' });
      }
    }
    setLucru(false);
    setRezultat(tot as RezultatAdaugare);
    if (fisier.current) fisier.current.value = '';
    citeste();
    onSchimbat();
    const primul = tot.adaugate[0] ?? tot.existente[0];
    if (primul) onFoloseste(primul.id);
  };

  return (
    <section data-testid="fonturi-mele">
      <p>{t('editare.fonturi.incarca-nota')}</p>
      <div className="campuri">
        <button type="button" data-buton="incarca-fonturi" disabled={lucru} onClick={() => { fisier.current?.click(); }}>{t('editare.fonturi.incarca')}</button>
        <input ref={fisier} type="file" multiple hidden accept=".ttf,.otf,.ttc,.otc,.woff,.woff2,font/ttf,font/otf,font/collection,font/woff,font/woff2"
          data-camp="fisiere-fonturi" onChange={(e) => { void incarca(e.target.files); }} />
      </div>
      {lucru ? <p role="status">{t('editare.fonturi.citeste')}</p> : null}
      {rezultat ? <Rezultat r={rezultat} /> : null}
      {eroare ? <p role="alert" className="avertisment">{eroare}</p> : null}
      {lista && lista.length === 0 && !eroare ? <p>{t('editare.fonturi.gol')}</p> : null}
      {lista && lista.length > 0 ? (
        <ul className="lista-fonturi">
          {lista.map((f) => (
            <li key={f.id} data-font={f.id} aria-current={f.id === ales ? 'true' : undefined}>
              <span className="nume-font">{f.nume.complet}</span>
              <span className="detalii-font">{t(`editare.fonturi.sursa.${f.sursa}`)} · {t('editare.fonturi.marime', { mb: mb(f.marime) })}</span>
              <button type="button" data-buton="foloseste-font" onClick={() => { onFoloseste(f.id); }}>{t('editare.fonturi.foloseste')}</button>
              <button type="button" data-buton="sterge-font" onClick={() => {
                void modul.stergeFont(f.id).then(() => { citeste(); onSchimbat(f.id); }, () => { setEroare(t('editare.text.font.fara-stocare')); });
              }}>{t('editare.fonturi.sterge')}</button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function FilaGoogle({ modul, onSchimbat, onFoloseste }: {
  readonly modul: ModulText; readonly onSchimbat: (id?: string) => void; readonly onFoloseste: (id: string) => void;
}): ReactElement {
  const [catalog, setCatalog] = useState<CatalogGoogle | string | null>(null);
  const [cauta, setCauta] = useState('');
  const [categorie, setCategorie] = useState<CategorieGoogle | ''>('');
  const [romana, setRomana] = useState(true);
  const [variante, setVariante] = useState<Readonly<Record<string, string>>>({});
  const [lucru, setLucru] = useState<string | null>(null);
  const [rezultat, setRezultat] = useState<{ readonly r: RezultatAdaugare } | string | null>(null);
  useEffect(() => {
    let viu = true;
    void catalogGoogle().then((r) => { if (viu) setCatalog(r.ok ? r.catalog : t(`editare.fonturi.google.${r.motiv}`)); });
    return () => { viu = false; };
  }, []);
  const gasite = useMemo(() => {
    if (!catalog || typeof catalog === 'string') return [];
    const c = cauta.trim().toLocaleLowerCase();
    return catalog.familii.filter((f) => (!c || f.familie.toLocaleLowerCase().includes(c)) && (!categorie || f.categorie === categorie) && (!romana || f.romana));
  }, [catalog, cauta, categorie, romana]);

  const descarca = (familie: string, varianta: string): void => {
    setLucru(familie);
    setRezultat(null);
    void descarcaInBiblioteca(modul, familie, varianta).then((r) => {
      setLucru(null);
      if (!r.ok) {
        setRezultat(t(`editare.fonturi.google.${r.motiv}`));
        return;
      }
      setRezultat({ r: r.rezultat });
      onSchimbat(r.id);
      if (r.rezultat.adaugate.length > 0 || r.rezultat.existente.length > 0) onFoloseste(r.id);
    }, () => { setLucru(null); setRezultat(t('editare.fonturi.google.retea')); });
  };

  return (
    <section data-testid="fonturi-google">
      <p>{t('editare.fonturi.google.nota')}</p>
      {catalog === null ? <p role="status">{t('editare.fonturi.catalog')}</p> : null}
      {typeof catalog === 'string' ? <p role="alert" className="avertisment" data-testid="google-motiv">{catalog}</p> : null}
      {catalog && typeof catalog !== 'string' ? (
        <>
          <div className="campuri">
            <label>
              {t('editare.fonturi.cauta')}
              <input type="text" value={cauta} data-camp="cauta-google" onChange={(e) => { setCauta(e.target.value); }} />
            </label>
            <label>
              {t('editare.fonturi.categorie')}
              <select value={categorie} data-camp="categorie-google" onChange={(e) => { setCategorie(CATEGORII_GOOGLE.find((c) => c === e.target.value) ?? ''); }}>
                <option value="">{t('editare.fonturi.categorie.toate')}</option>
                {CATEGORII_GOOGLE.map((c) => <option key={c} value={c}>{t(CATEGORIE[c])}</option>)}
              </select>
            </label>
            <label>
              <input type="checkbox" checked={romana} data-camp="romana-google" onChange={(e) => { setRomana(e.target.checked); }} />
              {t('editare.fonturi.romana')}
            </label>
          </div>
          <p role="status">{t('editare.fonturi.gasite', { n: gasite.length })}{gasite.length > ARATATE ? ` ${t('editare.fonturi.primele', { n: ARATATE })}` : ''}</p>
          {lucru ? <p role="status">{t('editare.fonturi.descarcare', { nume: lucru })}</p> : null}
          {typeof rezultat === 'string' ? <p role="alert" className="avertisment">{rezultat}</p> : rezultat ? <Rezultat r={rezultat.r} /> : null}
          <ul className="lista-fonturi">
            {gasite.slice(0, ARATATE).map((f) => {
              const v = variante[f.familie] ?? (f.variante.includes('400') ? '400' : f.variante[0]!);
              return (
                <li key={f.familie} data-familie={f.familie}>
                  <span className="nume-font">{f.familie}</span>
                  <span className="detalii-font">{t(CATEGORIE[f.categorie])}</span>
                  <select value={v} aria-label={t('editare.fonturi.varianta')} data-camp="varianta-google"
                    onChange={(e) => { setVariante({ ...variante, [f.familie]: e.target.value }); }}>
                    {f.variante.map((x) => <option key={x} value={x}>{modul.numeVarianta(x)}</option>)}
                  </select>
                  <button type="button" data-buton="descarca-google" disabled={lucru !== null} onClick={() => { descarca(f.familie, v); }}>
                    {t('editare.fonturi.descarca')}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </section>
  );
}

function FilaSistem({ modul, onSchimbat }: { readonly modul: ModulText; readonly onSchimbat: (id?: string) => void }): ReactElement {
  const [stare, setStare] = useState<StareSistem | null>(null);
  const [numar, setNumar] = useState<number | null>(null);
  const citeste = (): void => {
    void modul.stareSistem().then((s) => {
      setStare(s);
      if (s === 'permis') void modul.listaSistem().then((l) => { setNumar(l.length); }, () => { setNumar(0); });
    });
  };
  useEffect(citeste, [modul]);
  const permite = (): void => {
    // Cererea pornește din clic: browserul întreabă omul (permisiunea „local-fonts”).
    void modul.listaSistem().then((l) => { setStare('permis'); setNumar(l.length); onSchimbat(); }, () => { citeste(); });
  };
  return (
    <section data-testid="fonturi-sistem">
      <p>{t('editare.fonturi.sistem.nota')}</p>
      {stare === 'indisponibil' ? <p role="status" data-testid="sistem-stare">{t('editare.fonturi.sistem.indisponibil')}</p> : null}
      {stare === 'refuzat' ? <p role="status" data-testid="sistem-stare">{t('editare.fonturi.sistem.refuzat')}</p> : null}
      {stare === 'de-cerut' ? (
        <div className="campuri">
          <button type="button" data-buton="permite-sistem" onClick={permite}>{t('editare.fonturi.sistem.permite')}</button>
        </div>
      ) : null}
      {stare === 'permis' && numar !== null ? <p role="status" data-testid="sistem-stare">{t('editare.fonturi.sistem.permis', { n: numar })}</p> : null}
    </section>
  );
}
