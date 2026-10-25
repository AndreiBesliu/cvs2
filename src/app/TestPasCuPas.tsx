import { useEffect, useMemo, useRef, useState, type PointerEvent as PointerEventReact, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import '../i18n/tutorial.ts';
import './tutorial.css';
import { esteTutorial, fisierTutorial, TUTORIALE, type Tutorial } from '../../shared/tutorial.ts';
import { TextMd } from '../docs/Markdown.tsx';
import { t } from '../i18n/t.ts';
import { pozaPlansei } from './pozaPlansei.ts';
import { numaratoare, numeRaport, raportHtml } from './raportTest.ts';
import {
  adaugaPoza, citesteStarea, deschideStocarea, pozele, scrieStarea, stergeTestul, type StarePas, type StareTest,
} from './stocareTest.ts';

/**
 * Testul pas cu pas al owner-ului (ADR 0072), doar pe instanța de test: un panou plutitor (mutat din titlu, strâns la
 * nevoie) cu pasul de acum, Bine / Nu / Sărit, o notă, poza planșei și raportul. Rezultatele și pozele stau în browser
 * (`stocareTest.ts`); raportul e un fișier HTML descărcat. Clicurile pe butoane dau focusul înapoi paginii, ca tastele
 * uneltelor (R, O, N…) să meargă imediat.
 */
const TEST = TUTORIALE[0];
const LOC = 'cncvs2-test-loc';
const GOL: StareTest = { pas: 0, rezultate: {} };

const elibereazaFocusul = (): void => { (document.activeElement as HTMLElement | null)?.blur?.(); };
const citesteLoc = (): { x: number; y: number } | null => {
  try {
    const l = JSON.parse(localStorage.getItem(LOC) ?? 'null') as unknown;
    return l && typeof l === 'object' && typeof (l as { x?: unknown }).x === 'number' ? l as { x: number; y: number } : null;
  } catch {
    return null;
  }
};
const dataUrl = (b: Blob): Promise<string> => new Promise((ok, eroare) => {
  const f = new FileReader();
  f.onload = () => { ok(String(f.result)); };
  f.onerror = () => { eroare(f.error); };
  f.readAsDataURL(b);
});

export function TestPasCuPas({ versiune, instanta, onInchide }: {
  readonly versiune: string; readonly instanta: string; readonly onInchide: () => void;
}): ReactElement {
  const [tutorial, setTutorial] = useState<Tutorial | string | null>(null);
  const [db, setDb] = useState<IDBDatabase | null | 'fara'>(null);
  const [stare, setStare] = useState<StareTest>(GOL);
  const [poze, setPoze] = useState<Readonly<Record<string, number>>>({});
  const [mesaj, setMesaj] = useState('');
  const [strans, setStrans] = useState(false);
  const [sigur, setSigur] = useState(false);
  const [loc, setLoc] = useState(citesteLoc);
  const tras = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => {
    let viu = true;
    fetch(`/${fisierTutorial(TEST)}`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))).then(
      (j: unknown) => { if (viu) setTutorial(esteTutorial(j) ? j : 'forma fișierului'); },
      (e: unknown) => { if (viu) setTutorial(e instanceof Error ? e.message : String(e)); },
    );
    deschideStocarea().then(async (d) => {
      const [s, p] = await Promise.all([citesteStarea(d, TEST), pozele(d, TEST)]);
      if (!viu) return;
      setDb(d);
      if (s) setStare(s);
      const n: Record<string, number> = {};
      for (const x of p) n[x.pas] = (n[x.pas] ?? 0) + 1;
      setPoze(n);
    }).catch(() => { if (viu) setDb('fara'); });
    return () => { viu = false; };
  }, []);

  const pasi = useMemo(() => (typeof tutorial === 'object' && tutorial
    ? tutorial.sectiuni.flatMap((s) => s.pasi.map((p) => ({ ...p, sectiune: s.titlu }))) : []), [tutorial]);

  if (typeof tutorial !== 'object' || tutorial === null) {
    return createPortal(
      <aside className="test-pas" aria-label={t('tutorial.titlu')} data-test-pas="">
        <p role="status">{tutorial === null ? t('tutorial.incarca') : t('tutorial.eroare', { motiv: tutorial })}</p>
        <button type="button" onClick={onInchide}>{t('tutorial.inchide')}</button>
      </aside>,
      document.body,
    );
  }

  const i = Math.min(Math.max(stare.pas, 0), pasi.length - 1);
  const pas = pasi[i];
  const rezultat = pas ? stare.rezultate[pas.id] : undefined;
  const n = numaratoare(tutorial, stare);
  const salveaza = (s: StareTest): void => {
    setStare(s);
    if (db && db !== 'fara') scrieStarea(db, TEST, s).catch((e: unknown) => { setMesaj(String(e)); });
  };
  const scrie = (schimbare: { readonly stare?: StarePas | null; readonly nota?: string }): void => {
    if (!pas) return;
    const vechi = stare.rezultate[pas.id] ?? { stare: null, nota: '', la: 0 };
    salveaza({ ...stare, rezultate: { ...stare.rezultate, [pas.id]: { ...vechi, ...schimbare, la: Date.now() } } });
  };
  const mergi = (k: number): void => {
    salveaza({ ...stare, pas: Math.min(Math.max(k, 0), pasi.length - 1) });
    setMesaj('');
    setSigur(false);
  };
  const poza = (): void => {
    elibereazaFocusul();
    if (!pas) return;
    pozaPlansei().then(async (b) => {
      if (db && db !== 'fara') await adaugaPoza(db, TEST, pas.id, b, Date.now());
      const k = (poze[pas.id] ?? 0) + 1;
      setPoze({ ...poze, [pas.id]: k });
      setMesaj(t('tutorial.poza.gata', { n: k }));
    }).catch((e: unknown) => { setMesaj(t('tutorial.poza.esec', { motiv: e instanceof Error ? e.message : String(e) })); });
  };
  const raport = (): void => {
    elibereazaFocusul();
    (async () => {
      const toate = db && db !== 'fara' ? await pozele(db, TEST) : [];
      const la = Date.now();
      const html = raportHtml({
        tutorial, stare, versiune, instanta, browser: navigator.userAgent, generatLa: la,
        poze: await Promise.all(toate.map(async (p) => ({ pas: p.pas, la: p.la, src: await dataUrl(p.imagine) }))),
      });
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = numeRaport(TEST, la);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); }, 60_000);
      setMesaj(t('tutorial.raport.gata', { fisier: a.download }));
    })().catch((e: unknown) => { setMesaj(t('tutorial.raport.esec', { motiv: e instanceof Error ? e.message : String(e) })); });
  };
  const reia = (): void => {
    elibereazaFocusul();
    if (!sigur) { setSigur(true); return; }
    setSigur(false);
    setStare(GOL);
    setPoze({});
    setMesaj('');
    if (db && db !== 'fara') stergeTestul(db, TEST).catch((e: unknown) => { setMesaj(String(e)); });
  };
  const apasaTitlu = (e: PointerEventReact<HTMLElement>): void => {
    if ((e.target as Element).closest('button, select')) return;
    const r = e.currentTarget.parentElement?.getBoundingClientRect();
    if (!r) return;
    tras.current = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const mutaTitlu = (e: PointerEventReact<HTMLElement>): void => {
    if (!tras.current) return;
    setLoc({ x: Math.max(0, Math.min(innerWidth - 120, e.clientX - tras.current.dx)), y: Math.max(0, Math.min(innerHeight - 40, e.clientY - tras.current.dy)) });
  };
  const lasaTitlu = (): void => {
    tras.current = null;
    try { localStorage.setItem(LOC, JSON.stringify(loc)); } catch { /* fără memorie: locul ține cât fila */ }
  };
  const buton = (s: StarePas) => (
    <button type="button" className={`test-pas-stare test-pas-${s}`} aria-pressed={rezultat?.stare === s} data-test-stare={s}
      onClick={() => { elibereazaFocusul(); scrie({ stare: rezultat?.stare === s ? null : s }); }}>
      {t(`tutorial.${s}`)}
    </button>
  );

  return createPortal(
    <aside className="test-pas" aria-label={t('tutorial.titlu')} data-test-pas={pas?.id ?? ''} data-strans={strans ? '' : undefined}
      style={loc ? { left: loc.x, top: loc.y, bottom: 'auto' } : undefined}>
      <header className="test-pas-titlu" onPointerDown={apasaTitlu} onPointerMove={mutaTitlu} onPointerUp={lasaTitlu}>
        <strong>{t('tutorial.titlu')}</strong>
        <select value={i} aria-label={t('tutorial.pas', { n: i + 1, total: pasi.length })} data-test="pas"
          onChange={(e) => { mergi(Number(e.target.value)); elibereazaFocusul(); }}>
          {pasi.map((p, k) => {
            const s = stare.rezultate[p.id]?.stare;
            return <option key={p.id} value={k}>{`${k + 1}/${pasi.length} ${s === 'bine' ? '✓' : s === 'nu' ? '✗' : s === 'sarit' ? '–' : '·'} ${p.titlu}`}</option>;
          })}
        </select>
        <button type="button" onClick={() => { setStrans(!strans); elibereazaFocusul(); }} title={strans ? t('tutorial.deschide') : t('tutorial.strange')}
          aria-label={strans ? t('tutorial.deschide') : t('tutorial.strange')}>{strans ? '▴' : '▾'}</button>
        <button type="button" onClick={onInchide} title={t('tutorial.inchide')} aria-label={t('tutorial.inchide')}>×</button>
      </header>
      {strans || !pas ? null : (
        <>
          <p className="test-pas-sectiune">{pas.sectiune}</p>
          <h2>{pas.titlu}</h2>
          <p><b>{t('tutorial.faci')}:</b> <TextMd md={pas.faci} /></p>
          <p><b>{t('tutorial.vezi')}:</b> <TextMd md={pas.vezi} /></p>
          <div className="test-pas-rand">{buton('bine')}{buton('nu')}{buton('sarit')}</div>
          <textarea value={rezultat?.nota ?? ''} placeholder={t('tutorial.nota')} aria-label={t('tutorial.nota')} rows={2} data-test="nota"
            onChange={(e) => { scrie({ nota: e.target.value }); }} />
          <div className="test-pas-rand">
            <button type="button" onClick={poza} title={t('tutorial.poza.titlu')} data-test="poza">📷 {t('tutorial.poza')}</button>
            <span className="test-pas-slab">{t('tutorial.poze', { n: poze[pas.id] ?? 0 })}</span>
          </div>
          <div className="test-pas-rand">
            <button type="button" disabled={i === 0} onClick={() => { mergi(i - 1); elibereazaFocusul(); }}>‹ {t('tutorial.inapoi')}</button>
            <button type="button" className="test-pas-inainte" disabled={i === pasi.length - 1} data-test="inainte"
              onClick={() => { mergi(i + 1); elibereazaFocusul(); }}>{t('tutorial.inainte')} ›</button>
          </div>
        </>
      )}
      <p className="test-pas-slab" data-test="progres">{t('tutorial.progres', n)}</p>
      {strans ? null : (
        <div className="test-pas-rand">
          <button type="button" onClick={raport} data-test="raport">{t('tutorial.raport')}</button>
          <button type="button" className={sigur ? 'test-pas-pericol' : undefined} onClick={reia} data-test="reia">
            {sigur ? t('tutorial.reia.sigur') : t('tutorial.reia')}
          </button>
        </div>
      )}
      {mesaj ? <p role="status" className="test-pas-mesaj" data-test="mesaj">{mesaj}</p> : null}
      {db === 'fara' ? <p className="test-pas-slab">{t('tutorial.fara-memorie')}</p> : null}
    </aside>,
    document.body,
  );
}
