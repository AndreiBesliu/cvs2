import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { t } from '../i18n/t.ts';
import { citesteCsv, CODARI, decodeazaCsv, PLAFON_CSV, SEPARATOARE, separatorGasit, type Codare, type Separator } from '../io/csv.ts';
import { ASEZARE_MAXIM, distantaMinima, peFoi, planAsezare, type OptiuniAsezare } from '../model/asezare.ts';
import type { Document, Instanta, Piesa, TextePlacuta } from '../model/document.ts';
import { blocuriPiesei, campuriPiesei } from '../model/placute.ts';
import { CIFRE_MAXIM, cuCamp, surseImplicite, valoriRand, type SursaCamp } from '../model/valoriCsv.ts';
import type { RezultatPlacuta } from '../text/placute.ts';
import type { RezultatActiune } from '../ui/actiuni.ts';
import type { CerereText } from '../ui/actiuniDocument.ts';
import { citesteNumar, textNumar } from '../ui/numar.ts';
import { optiuniTinute, tineOptiunile } from './asezareTinuta.ts';

/** Câte rânduri ale tabelului arată previzualizarea. */
const PREVIZUALIZARE = 4;
/** La câte plăcuțe făcute se lasă browserul să respire (și se arată cât s-a făcut). */
const PAS_LUCRU = 20;

/** De ce literele unei plăcuțe nu s-au putut face, în cuvinte (fontul, cu numele lui). */
function motivPlacuta(r: Extract<RezultatPlacuta, { readonly ok: false }>): string {
  return r.motiv === 'font' ? t('prop.placuta.motiv.font', { font: r.font ?? '' }) : t(`prop.placuta.motiv.${r.motiv}`);
}

type Sursa = { readonly nume: string | null; readonly octeti: Uint8Array | null; readonly text: string };
type Stare = { readonly fel: 'lucru'; readonly k: number; readonly n: number } | { readonly fel: 'motiv'; readonly text: string } | null;

/**
 * «Din CSV…» (ADR 0210 §4, felia 11.4↑b; planșa 4 a schiței): fișierul (`.csv`, `.txt`) sau celulele lipite din Excel, cu
 * separatorul și codarea găsite singure (alegerea la vedere), antetul, previzualizarea; fiecare câmp al șablonului ia o
 * coloană (potrivită după nume), o valoare sau numerotarea; rândurile de la… la…; așezarea pe foi cu alegerile ținute ale lui
 * „Așază pe foi”. „Fă plăcuțele” face literele fiecărei plăcuțe (fonturile aduse o dată) și le scrie într-un pas, prin
 * acțiunea textului. „Fă din textul ales câmpul” (răspunsul 4b) scrie acoladele în textul piesei pentru om.
 */
export function DialogCsv({ doc, indexFoaie, instanta, piesa, doarCitire, onCerere, onGata, onInchide }: {
  readonly doc: Document;
  readonly indexFoaie: number;
  /** Plăcuța aleasă (o instanță a șablonului): ea ia primul rând. */
  readonly instanta: Instanta;
  /** Piesa ei, cea din documentul de acum: o cerere făcută pe alta e refuzată. */
  readonly piesa: Piesa;
  readonly doarCitire: boolean;
  readonly onCerere: (c: CerereText) => RezultatActiune;
  /** Plăcuțele sunt făcute: rezultatul, de arătat în panou. */
  readonly onGata: (mesaj: string) => void;
  readonly onInchide: () => void;
}): ReactNode {
  const [sursa, setSursa] = useState<Sursa | null>(null);
  const [codare, setCodare] = useState<Codare | null>(null);
  const [separator, setSeparator] = useState<Separator | null>(null);
  const [antet, setAntet] = useState(true);
  const [surse, setSurse] = useState<Readonly<Record<string, SursaCamp>>>({});
  const [interval, setInterval_] = useState<{ readonly de: string; readonly pana: string } | null>(null);
  // Alegerile ținute ale lui „Așază pe foi”; unde omul n-a scris nimic aici, distanța urcă singură până la freza profilului
  // exterior al plăcuței (ca la „Mută și așază”, ADR 0210 §3): altfel planul ar fi refuzat fără ca omul să fi ales ceva.
  const [asezare, setAsezare] = useState<OptiuniAsezare>(() => {
    const o = optiuniTinute();
    const d = distantaMinima(doc, [instanta.id], doc.foi[indexFoaie]?.id ?? '');
    return { ...o, distantaX: Math.max(o.distantaX, d), distantaY: Math.max(o.distantaY, d) };
  });
  const [schimba, setSchimba] = useState(false);
  const [stare, setStare] = useState<Stare>(null);
  const [alegere, setAlegere] = useState<{ readonly a: number; readonly b: number } | null>(null);
  const [numeCamp, setNumeCamp] = useState('');
  const [indexText, setIndexText] = useState(0);
  const cutie = useRef<HTMLDivElement>(null);
  const fisier = useRef<HTMLInputElement>(null);
  useEffect(() => { cutie.current?.focus(); }, []);
  // Escape închide fereastra oriunde ar fi focusul (nu și panoul de sub ea), cât nu se lucrează.
  const inchide = useRef(onInchide);
  inchide.current = stare?.fel === 'lucru' ? () => undefined : onInchide;
  useEffect(() => {
    const tasta = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      inchide.current();
    };
    document.addEventListener('keydown', tasta, true);
    return () => { document.removeEventListener('keydown', tasta, true); };
  }, []);

  // Tabelul: codarea (a fișierului), separatorul, rândurile; antetul, datele, câte coloane.
  const decodat = useMemo(() => (sursa?.octeti ? decodeazaCsv(sursa.octeti, codare ?? undefined) : null), [sursa, codare]);
  const text = decodat?.text ?? sursa?.text ?? '';
  const sep = separator ?? (text ? separatorGasit(text) : ';');
  const tabel = useMemo(() => (text ? citesteCsv(text, sep) : null), [text, sep]);
  const capul = antet && tabel ? tabel.randuri[0] ?? null : null;
  const date = useMemo(() => (tabel ? (antet ? tabel.randuri.slice(1) : tabel.randuri) : []), [tabel, antet]);
  const coloane = Math.max(capul?.length ?? 0, ...date.map((r) => r.length), 0);
  const numeColoana = (k: number): string => (capul?.[k]?.trim() ? capul[k]!.trim() : t('csv.coloana-n', { n: k + 1 }));

  // Câmpurile șablonului și sursele lor: cele alese de om, peste cele implicite (după nume).
  const campuri = campuriPiesei(piesa);
  const implicite = useMemo(() => surseImplicite(campuri, capul, coloane), [campuri.join('\u0000'), capul, coloane]);
  const sursaCamp = (c: string): SursaCamp => (Object.hasOwn(surse, c) ? surse[c]! : implicite[c] ?? { fel: 'valoare', text: '' });
  const alegeSursa = (c: string, s: SursaCamp): void => {
    setStare(null);
    setSurse((x) => { const y = { ...x }; Object.defineProperty(y, c, { value: s, enumerable: true, writable: true, configurable: true }); return y; });
  };

  // Rândurile de la… la… (de la 1); implicit toate.
  const de = interval ? citesteNumar(interval.de) : 1, pana = interval ? citesteNumar(interval.pana) : date.length;
  const intervalBun = de !== null && pana !== null && Number.isInteger(de) && Number.isInteger(pana) && de >= 1 && pana >= de && pana <= date.length;
  const n = intervalBun ? pana - de + 1 : 0;

  // Unde ajung (planul „Așază pe foi” pe plăcuțe de mărimea celei alese): câte pe câte foi, cu marginea și distanța.
  const plan = useMemo(() => {
    const foaie = doc.foi[indexFoaie];
    if (!foaie || n === 0) return null;
    const copii = Array.from({ length: n - 1 }, (_, k) => ({ ...instanta, id: `__csv${k}` }));
    const d: Document = { ...doc, foi: doc.foi.map((f, k) => (k === indexFoaie ? { ...f, instante: [...f.instante, ...copii] } : f)) };
    return planAsezare(d, [instanta.id, ...copii.map((c) => c.id)], foaie.id, asezare);
  }, [doc, indexFoaie, instanta, n, JSON.stringify(asezare)]);
  const unde = ((): string | null => {
    if (!plan) return null;
    if (!plan.ok) return t(plan.motiv === 'distanta' ? 'motiv.aseaza-distanta' : 'motiv.aseaza-valori');
    const pe = peFoi(plan);
    const placute = t('csv.placute', { n: plan.locuri.length }), foi = t('aseaza.foi', { n: pe.length });
    return pe.length > 1 ? t('aseaza.rezultat.detaliat', { piese: placute, foi, detaliu: pe.map(([, k]) => k).join(' + ') }) : t('aseaza.rezultat', { piese: placute, foi });
  })();

  const citesteFisier = (f: File | undefined): void => {
    if (!f) return;
    setStare(null);
    if (f.size > PLAFON_CSV.octeti) { setStare({ fel: 'motiv', text: t('csv.prea-mare') }); return; }
    void f.arrayBuffer().then((b) => {
      setSursa({ nume: f.name, octeti: new Uint8Array(b), text: '' });
      setCodare(null); setSeparator(null); setSurse({}); setInterval_(null);
    }, () => { setStare({ fel: 'motiv', text: t('csv.necitit') }); });
  };
  const lipeste = (s: string): void => {
    setStare(null);
    setSursa(s.trim() === '' ? null : { nume: null, octeti: null, text: s });
    setCodare(null); setSeparator(null); setSurse({}); setInterval_(null);
  };

  // „Fă din textul ales câmpul” (răspunsul 4b): bucata aleasă din textul piesei devine `{Coloana}`; textul piesei se reface
  // (fontul adus), iar plăcuțele ei odată cu el, într-un pas.
  const blocuri = blocuriPiesei(piesa);
  const bloc = blocuri[Math.min(indexText, blocuri.length - 1)];
  const nume = numeCamp.trim() || (coloane > 0 ? numeColoana(0) : '');
  const faCamp = async (): Promise<void> => {
    if (!bloc || !alegere) return;
    const continut = cuCamp(bloc.bloc.continut, alegere.a, alegere.b, nume);
    if (continut === null) return;
    setStare({ fel: 'lucru', k: 0, n: 0 });
    try {
      const m = await import('../text/calcul.ts');
      const f = await m.fonturiPiesei(piesa);
      const font = f.ok ? f.font(bloc.bloc.font) : null;
      if (!f.ok || !font) { setStare({ fel: 'motiv', text: t('prop.placuta.motiv.font', { font: f.ok ? bloc.bloc.font : f.font }) }); return; }
      const r = m.sablonCuContinut(piesa, bloc.grup.id, continut, font, doc.foi[indexFoaie]?.stoc.grosime);
      if (!r.ok) { setStare({ fel: 'motiv', text: r.motiv === 'gol' || r.motiv === 'plafon' ? t(`csv.motiv.${r.motiv}`) : t(`prop.placuta.motiv.${r.motiv}`) }); return; }
      const rez = onCerere({ fel: 'sablon', instanta: instanta.id, piesa, nou: r.piesa, texte: (nou, valori) => m.textePlacutei(nou, valori, f.font) });
      setStare(rez.ok ? null : { fel: 'motiv', text: t(rez.motiv) });
      if (rez.ok) setAlegere(null);
    } catch {
      setStare({ fel: 'motiv', text: t('prop.placuta.motiv.modul') });
    }
  };

  // „Fă plăcuțele”: valorile fiecărui rând, literele (fonturile aduse o dată), apoi un singur pas: primul rând pe plăcuța
  // aleasă, restul plăcuțe noi, toate așezate pe foi. La capăt, câte s-au micșorat în casetă și cât.
  const fa = async (): Promise<void> => {
    if (!intervalBun || n === 0 || campuri.length === 0 || de === null) return;
    setStare({ fel: 'lucru', k: 0, n });
    try {
      const m = await import('../text/calcul.ts');
      const f = await m.fonturiPiesei(piesa);
      if (!f.ok) { setStare({ fel: 'motiv', text: t('prop.placuta.motiv.font', { font: f.font }) }); return; }
      const randuri: Array<{ campuri: Record<string, string>; texte: Record<string, TextePlacuta> | undefined }> = [];
      let micsorate = 0, minim = 1;
      for (let k = 0; k < n; k++) {
        const r = m.textePlacutei(piesa, valoriRand(campuri, Object.fromEntries(campuri.map((c) => [c, sursaCamp(c)])), date[de - 1 + k] ?? [], k), f.font);
        if (!r.ok) { setStare({ fel: 'motiv', text: t('csv.motiv.rand', { k: de + k, motiv: motivPlacuta(r) }) }); return; }
        randuri.push({ campuri: r.campuri, texte: r.texte });
        if (r.micsorat !== undefined) { micsorate++; minim = Math.min(minim, r.micsorat); }
        if (k % PAS_LUCRU === PAS_LUCRU - 1) {
          setStare({ fel: 'lucru', k: k + 1, n });
          await new Promise((gata) => { setTimeout(gata, 0); });
        }
      }
      const rez = onCerere({ fel: 'placute', instanta: instanta.id, piesa, randuri, asezare });
      if (!rez.ok) { setStare({ fel: 'motiv', text: t(rez.motiv) }); return; }
      tineOptiunile(asezare);
      onGata([unde, micsorate > 0 ? t('csv.micsorate', { n: micsorate, p: textNumar(Math.floor(minim * 100), true) }) : null].filter(Boolean).join(' '));
    } catch {
      setStare({ fel: 'motiv', text: t('prop.placuta.motiv.modul') });
    }
  };

  const lucreaza = stare?.fel === 'lucru';
  const valoareSursa = (s: SursaCamp): string => (s.fel === 'coloana' ? `c:${s.coloana}` : s.fel);
  const numar = (s: string, implicit: number): number => { const x = citesteNumar(s, true); return x !== null && Number.isInteger(x) ? x : implicit; };
  const camp = (eticheta: string, cheie: string, valoare: string, onSchimba: (s: string) => void): ReactNode => (
    <label>
      {eticheta}
      <input type="text" inputMode="decimal" autoComplete="off" data-camp={`csv-${cheie}`} value={valoare} disabled={lucreaza} onChange={(e) => { onSchimba(e.target.value); }} />
    </label>
  );

  return (
    <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="csv-titlu" data-testid="dialog-csv">
      <div className="dialog-cutie dialog-csv" ref={cutie} tabIndex={-1}>
        <h2 id="csv-titlu">{t('csv.titlu', { piesa: piesa.nume ?? piesa.id })}</h2>
        <div className="csv-sursa">
          {/* Butonul aplicației, nu câmpul browserului (care scrie în limba browserului, „Choose File”). */}
          <div className="csv-fisier">
            <button type="button" data-buton="csv-alege" disabled={lucreaza} onClick={() => { fisier.current?.click(); }}>{t('csv.fisier')}</button>
            <input ref={fisier} type="file" hidden accept=".csv,.txt,text/csv,text/plain" data-camp="csv-fisier"
              onChange={(e) => { citesteFisier(e.target.files?.[0]); e.target.value = ''; }} />
          </div>
          <label className="csv-lipire">
            {t('csv.lipeste')}
            <textarea data-camp="csv-lipire" rows={2} disabled={lucreaza} value={sursa && !sursa.octeti ? sursa.text : ''} onChange={(e) => { lipeste(e.target.value); }} />
          </label>
        </div>
        {tabel && (
          <>
            <p className="csv-nota" data-testid="csv-sursa">
              {sursa?.nume ? t('csv.sursa.fisier', { nume: sursa.nume }) : t('csv.sursa.lipite')} · {t('csv.randuri', { n: date.length })}
            </p>
            <div className="campuri">
              <label>
                {t('csv.separator')}
                <select data-camp="csv-separator" value={sep} disabled={lucreaza} onChange={(e) => { setSeparator(SEPARATOARE.find((s) => s === e.target.value) ?? null); setSurse({}); setInterval_(null); }}>
                  {SEPARATOARE.map((s) => <option key={s} value={s}>{t(`csv.separator.${s === ';' ? 'punct-virgula' : s === ',' ? 'virgula' : 'tab'}`)}</option>)}
                </select>
              </label>
              {sursa?.octeti && decodat && (
                <label>
                  {t('csv.codare')}
                  <select data-camp="csv-codare" value={decodat.codare} disabled={lucreaza} onChange={(e) => { setCodare(CODARI.find((c) => c === e.target.value) ?? null); }}>
                    {CODARI.map((c) => <option key={c} value={c}>{t(`csv.codare.${c}`)}</option>)}
                  </select>
                </label>
              )}
              <label className="csv-bifa">
                <input type="checkbox" data-camp="csv-antet" checked={antet} disabled={lucreaza} onChange={(e) => { setAntet(e.target.checked); setSurse({}); setInterval_(null); }} />
                {t('csv.antet')}
              </label>
            </div>
            {tabel.taiat && <p className="csv-nota" role="status">{t('csv.taiat')}</p>}
            <table className="csv-tabel" data-testid="csv-tabel">
              {capul && <thead><tr><th>#</th>{capul.map((c, k) => <th key={k}>{c}</th>)}</tr></thead>}
              <tbody>
                {date.slice(0, PREVIZUALIZARE).map((r, k) => <tr key={k}><td>{k + 1}</td>{Array.from({ length: coloane }, (_, j) => <td key={j}>{r[j] ?? ''}</td>)}</tr>)}
              </tbody>
            </table>
            {date.length > PREVIZUALIZARE && <p className="csv-nota">{t('csv.inca', { n: date.length - PREVIZUALIZARE })}</p>}
          </>
        )}
        {/* Textul piesei: bucata aleasă devine câmpul unei coloane (răspunsul 4b). */}
        {bloc && (
          <div className="csv-text">
            {blocuri.length > 1 && (
              <label>
                {t('csv.text.care')}
                <select data-camp="csv-text-ales" value={Math.min(indexText, blocuri.length - 1)} onChange={(e) => { setIndexText(Number(e.target.value)); setAlegere(null); }}>
                  {blocuri.map((b, k) => <option key={b.grup.id} value={k}>{b.bloc.continut.split('\n')[0]}</option>)}
                </select>
              </label>
            )}
            <label>
              {campuri.length === 0 ? t('csv.fara-campuri') : t('csv.text')}
              <textarea readOnly data-camp="csv-text" rows={2} value={bloc.bloc.continut}
                onSelect={(e) => { const el = e.currentTarget; setAlegere({ a: el.selectionStart, b: el.selectionEnd }); }} />
            </label>
            <div className="csv-rand">
              <label>
                {t('csv.camp.nume')}
                <input type="text" list="csv-coloane" autoComplete="off" data-camp="csv-camp-nume" value={nume} disabled={lucreaza || doarCitire} onChange={(e) => { setNumeCamp(e.target.value); }} />
                <datalist id="csv-coloane">{Array.from({ length: coloane }, (_, k) => <option key={k} value={numeColoana(k)} />)}</datalist>
              </label>
              <button type="button" data-buton="csv-fa-camp" disabled={lucreaza || doarCitire || !alegere || alegere.a === alegere.b || nume.replace(/[{}]/g, '').trim() === ''}
                onClick={() => { void faCamp(); }}>
                {t('csv.fa-camp', { camp: `{${nume.replace(/[{}]/g, '').trim()}}` })}
              </button>
            </div>
          </div>
        )}
        {/* Câmpurile: fiecare cu sursa ei (coloana potrivită singură, alta, o valoare, numerotarea). */}
        {tabel && campuri.length > 0 && (
          <div className="csv-campuri" data-testid="csv-campuri">
            {campuri.map((c) => {
              const s = sursaCamp(c);
              const potrivit = !Object.hasOwn(surse, c) && s.fel === 'coloana' && capul !== null && implicite[c]?.fel === 'coloana';
              return (
                <div className="csv-rand" key={c} data-camp-csv={c}>
                  <span className="csv-camp">{`{${c}}`} ←</span>
                  <select aria-label={`{${c}}`} data-camp={`csv-sursa-${c}`} value={valoareSursa(s)} disabled={lucreaza}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v.startsWith('c:')) alegeSursa(c, { fel: 'coloana', coloana: Number(v.slice(2)) });
                      else if (v === 'numar') alegeSursa(c, { fel: 'numar', start: 1, pas: 1, cifre: 1 });
                      else alegeSursa(c, { fel: 'valoare', text: '' });
                    }}>
                    {Array.from({ length: coloane }, (_, k) => <option key={k} value={`c:${k}`}>{t('csv.camp.coloana', { nume: numeColoana(k) })}</option>)}
                    <option value="valoare">{t('csv.camp.valoare')}</option>
                    <option value="numar">{t('csv.camp.numar')}</option>
                  </select>
                  {potrivit && <span className="csv-nota">{t('csv.camp.potrivit')}</span>}
                  {s.fel === 'valoare' && (
                    <input type="text" autoComplete="off" aria-label={t('csv.camp.valoare')} data-camp={`csv-valoare-${c}`} value={s.text} disabled={lucreaza}
                      onChange={(e) => { alegeSursa(c, { fel: 'valoare', text: e.target.value }); }} />
                  )}
                  {s.fel === 'numar' && (
                    <>
                      {camp(t('csv.numar.start'), `start-${c}`, String(s.start), (x) => { alegeSursa(c, { ...s, start: numar(x, s.start) }); })}
                      {camp(t('csv.numar.pas'), `pas-${c}`, String(s.pas), (x) => { alegeSursa(c, { ...s, pas: numar(x, s.pas) }); })}
                      {camp(t('csv.numar.cifre'), `cifre-${c}`, String(s.cifre), (x) => { alegeSursa(c, { ...s, cifre: Math.max(1, Math.min(CIFRE_MAXIM, numar(x, s.cifre))) }); })}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {tabel && (
          <div className="campuri">
            {camp(t('csv.de'), 'de', interval?.de ?? '1', (x) => { setInterval_({ de: x, pana: interval?.pana ?? String(date.length) }); setStare(null); })}
            {camp(t('csv.pana'), 'pana', interval?.pana ?? String(date.length), (x) => { setInterval_({ de: interval?.de ?? '1', pana: x }); setStare(null); })}
          </div>
        )}
        {tabel && !intervalBun && <p className="camp-motiv" role="alert">{t('csv.interval-gresit', { n: date.length })}</p>}
        {/* Unde ajung: câte plăcuțe pe câte foi, cu marginea și distanța ținute ale lui „Așază pe foi”; „Schimbă…” le arată. */}
        {unde && (
          <p className="csv-nota" data-testid="csv-unde">
            {unde} {t('csv.asezare', { m: textNumar(asezare.margineX, true), d: textNumar(asezare.distantaX, true) })}{' '}
            <button type="button" className="legatura" data-buton="csv-schimba" aria-expanded={schimba} onClick={() => { setSchimba(!schimba); }}>{t('csv.schimba')}</button>
          </p>
        )}
        {schimba && (
          <div className="campuri">
            {camp(t('csv.margine'), 'margine', textNumar(asezare.margineX, true), (x) => {
              const v = citesteNumar(x);
              if (v !== null && v >= 0 && v <= ASEZARE_MAXIM) setAsezare({ ...asezare, margineX: v, margineY: v });
            })}
            {camp(t('csv.distanta'), 'distanta', textNumar(asezare.distantaX, true), (x) => {
              const v = citesteNumar(x);
              if (v !== null && v >= 0 && v <= ASEZARE_MAXIM) setAsezare({ ...asezare, distantaX: v, distantaY: v });
            })}
          </div>
        )}
        {stare?.fel === 'lucru' && <p className="csv-nota" role="status" data-testid="csv-lucru">{stare.n > 0 ? t('csv.lucru', { k: stare.k, n: stare.n }) : t('prop.placuta.face')}</p>}
        {stare?.fel === 'motiv' && <p className="camp-motiv" role="alert" data-motiv="csv">{stare.text}</p>}
        <div className="butoane">
          <button type="button" className="principal" data-buton="csv-fa" disabled={lucreaza || doarCitire || !intervalBun || n === 0 || campuri.length === 0 || !plan?.ok}
            onClick={() => { void fa(); }}>
            {t('csv.fa', { n })}
          </button>
          <button type="button" data-buton="csv-renunta" disabled={lucreaza} onClick={onInchide}>{t('lista.renunta')}</button>
        </div>
      </div>
    </div>
  );
}
