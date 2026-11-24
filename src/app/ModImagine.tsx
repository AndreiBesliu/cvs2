/**
 * „Calibrează” și „Trasează…” din imaginea de pe foaie (ADR 0272 §6, §7; felia 25.8↑b), pe pânză: un mod, pornit din rândul
 * imaginii din panoul foii, cu banda lui sus, pe mijlocul zonei libere (ca modul urechilor). Clicul stâng e al modului (nu
 * alege și nu mută forme); spațiul și rotița rămân ale pânzei.
 *
 * - **Calibrează:** două clicuri pe imagine (Shift: al doilea pe axa ei), capetele se trag apoi unde trebuie; distanța
 *   adevărată se scrie în bandă, iar „Aplică” (ori Enter) scalează imaginea uniform, în jurul primului punct, într-un pas de
 *   anulare. Distanța de acum stă lângă linie și în bandă.
 * - **Trasează:** o zonă trasă peste imagine (dreptunghiul din cadrul ei, și pe una rotită) deschide fereastra trasării doar
 *   pe partea aceea; „Toată imaginea” (ori Enter), pe toată.
 *
 * Escape și „Renunță” ies fără nimic schimbat; la fel modul se închide singur dacă imaginea nu mai e pe foaia activă ori se
 * ascunde. Vine la cerere, la prima folosire; partea pură e în `modImagineCalcul.ts`.
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactElement, type RefObject } from 'react';
import type { Vedere } from '../canvas/protocol.ts';
import '../i18n/editare.ts';
import { mesajeGata } from '../i18n/laCerere.ts';
import { t, type CheieSimpla } from '../i18n/t.ts';
import type { ImagineFoaie } from '../model/document.ts';
import type { RezultatActiune } from '../ui/actiuni.ts';
import { citesteNumar, textNumar } from '../ui/numar.ts';
import { useLimba } from '../ui/useLimba.ts';
import { coltImagine, COLTURI_IMAGINE, type Asezare, type Punct } from './manereImagine.ts';
import { calibrata, colturiZonei, distanta, peAxa, peImagine, zonaDinTragere, type ZonaRelativa } from './modImagineCalcul.ts';

/** Mesajele modulului (ale editării), ca date (ADR 0086): cine îl încarcă le așteaptă (`cuMesaje`). */
export const mesaje = mesajeGata();
mesaje.catch(() => undefined);

/** Cât de departe de un capăt (pe ecran) îl prinde apăsarea, ca să fie tras. */
const PRINDE_PX = 9;
/** O tragere mai scurtă de atât (pe ecran) e un clic, nu o zonă. */
const TRAGERE_PX = 3;

export type FelModImagine = 'calibrare' | 'zona';

type Props = {
  readonly fel: FelModImagine;
  /** Imaginea modului, de pe foaia activă; lipsă (ștearsă, altă foaie): modul se închide. */
  readonly imagine: ImagineFoaie | undefined;
  readonly vedere: Vedere;
  readonly marime: { readonly latime: number; readonly inaltime: number };
  /** Zona liberă a pânzei (fără meniu, bare și panouri): banda stă sus, pe mijlocul ei. */
  readonly zona: RefObject<HTMLElement | null>;
  /** Așezarea calibrată, într-un pas de anulare (`foaie.imagini`). */
  readonly onCalibreaza: (a: Asezare) => RezultatActiune;
  /** Fereastra trasării, cu zona trasă (null: toată imaginea). */
  readonly onTraseaza: (z: ZonaRelativa | null) => void;
  readonly onIesi: () => void;
};

type Motiv = 'afara' | 'puncte' | 'distanta' | 'mica' | 'trage' | 'zona-afara';

export function ModImagine({ fel, imagine, vedere: v, marime, zona, onCalibreaza, onTraseaza, onIesi }: Props): ReactElement | null {
  const limba = useLimba();
  const [p1, setP1] = useState<Punct | null>(null);
  const [p2, setP2] = useState<Punct | null>(null);
  /** Unde e mausul (fără al doilea punct): linia de la primul punct până la el. */
  const [cursor, setCursor] = useState<Punct | null>(null);
  const [tragere, setTragere] = useState<{ readonly a: Punct; readonly b: Punct } | null>(null);
  const [ciorna, setCiorna] = useState('');
  const [motiv, setMotiv] = useState<{ readonly cod: Motiv } | { readonly text: string } | null>(null);
  const radacina = useRef<HTMLDivElement>(null);
  const camp = useRef<HTMLInputElement>(null);
  const [loc, setLoc] = useState<{ readonly top: number; readonly left: number; readonly maxWidth: number } | null>(null);
  useLayoutEffect(() => {
    const masoara = (): void => {
      const z = zona.current?.getBoundingClientRect();
      const c = radacina.current?.parentElement?.getBoundingClientRect();
      const n = z && c && z.width > 100 && z.height > 100
        ? { top: Math.round(z.top - c.top) + 8, left: Math.round(z.left - c.left + z.width / 2), maxWidth: Math.round(z.width) - 16 } : null;
      setLoc((x) => (x && n && x.top === n.top && x.left === n.left && x.maxWidth === n.maxWidth ? x : n));
    };
    masoara();
    const ro = new ResizeObserver(masoara);
    if (zona.current) ro.observe(zona.current);
    return () => { ro.disconnect(); };
  }, [marime.latime, marime.inaltime, zona]);

  // Imaginea a plecat de pe foaia activă (ștearsă, Ctrl+Z, altă foaie) ori s-a ascuns: modul n-are pe ce lucra.
  const lipsa = !imagine || !imagine.vizibila;
  useEffect(() => { if (lipsa) onIesi(); }, [lipsa]);

  const mm = (x: number): string => textNumar(Math.round(x * 100) / 100, limba === 'ro');
  /** Al doilea capăt pus: distanța de acum intră în câmp, ales, gata de scris peste. */
  const pusAlDoilea = (q: Punct, p: Punct): void => {
    setP2(q);
    setCiorna(mm(distanta(p, q)));
    requestAnimationFrame(() => { camp.current?.focus(); camp.current?.select(); });
  };
  const aplica = (): void => {
    if (!imagine || !p1 || !p2) return;
    const d = citesteNumar(ciorna);
    const r = calibrata(imagine, p1, p2, d ?? Number.NaN);
    if (!r.ok) {
      setMotiv({ cod: r.motiv });
      return;
    }
    const x = onCalibreaza(r.a);
    if (x.ok) onIesi();
    else setMotiv({ text: t(x.motiv) });
  };
  const acum = useRef({ imagine, v, p1, p2, fel, pusAlDoilea, aplica, onTraseaza, onIesi });
  acum.current = { imagine, v, p1, p2, fel, pusAlDoilea, aplica, onTraseaza, onIesi };

  useEffect(() => {
    const el = radacina.current;
    const cutie = el?.closest('.panza-cutie');
    const panza = cutie?.querySelector<HTMLCanvasElement>('canvas.panza');
    if (!el || !cutie || !panza) return undefined;
    let spatiu = false;
    let g: { readonly id: number; readonly cine: 1 | 2 | 'zona'; readonly x: number; readonly y: number; readonly a: Punct } | null = null;
    const inLume = (e: { clientX: number; clientY: number }): Punct => {
      const r = el.getBoundingClientRect(), w = acum.current.v;
      return { x: (e.clientX - r.left - w.tx) / w.scara, y: (w.ty - (e.clientY - r.top)) / w.scara };
    };
    /** Al doilea capăt al liniei (`cel` trage), cu Shift pe axa imaginii prin celălalt. */
    const capat = (q: Punct, celalalt: Punct | null, shift: boolean): Punct => {
      const im = acum.current.imagine;
      return shift && celalalt && im ? peAxa(im, celalalt, q) : q;
    };
    const apasa = (e: PointerEvent): void => {
      if (e.target !== panza || e.button !== 0 || spatiu) return;
      const s = acum.current;
      if (!s.imagine) return;
      e.preventDefault();
      e.stopPropagation();
      const q = inLume(e), ecran = PRINDE_PX / s.v.scara;
      if (s.fel === 'zona') {
        panza.setPointerCapture(e.pointerId);
        g = { id: e.pointerId, cine: 'zona', x: e.clientX, y: e.clientY, a: q };
        setMotiv(null);
        return;
      }
      // Calibrarea: un capăt pus se trage; altfel, primul, al doilea, ori (cu amândouă) o măsurătoare nouă.
      const lovit = s.p1 && distanta(s.p1, q) <= ecran ? 1 : s.p2 && distanta(s.p2, q) <= ecran ? 2 : null;
      if (lovit) {
        panza.setPointerCapture(e.pointerId);
        g = { id: e.pointerId, cine: lovit, x: e.clientX, y: e.clientY, a: q };
        return;
      }
      const p = s.p1 && !s.p2 ? capat(q, s.p1, e.shiftKey) : q;
      if (!peImagine(s.imagine, p)) {
        setMotiv({ cod: 'afara' });
        return;
      }
      setMotiv(null);
      if (s.p1 && !s.p2) s.pusAlDoilea(p, s.p1);
      else {
        setP1(p);
        setP2(null);
        setCiorna('');
      }
    };
    const misca = (e: PointerEvent): void => {
      const s = acum.current;
      if (g && e.pointerId === g.id) {
        e.stopPropagation();
        const q = inLume(e);
        if (g.cine === 'zona') {
          setTragere({ a: g.a, b: q });
          return;
        }
        if (!s.imagine) return;
        const p = capat(q, g.cine === 1 ? s.p2 : s.p1, e.shiftKey);
        if (!peImagine(s.imagine, p)) return;
        if (g.cine === 1) setP1(p);
        else setP2(p);
        const alt = g.cine === 1 ? s.p2 : s.p1;
        if (alt) setCiorna(mm(distanta(p, alt)));
        return;
      }
      if (s.fel === 'calibrare' && s.p1 && !s.p2 && e.target === panza) setCursor(capat(inLume(e), s.p1, e.shiftKey));
    };
    const ridica = (e: PointerEvent): void => {
      if (!g || e.pointerId !== g.id) return;
      e.stopPropagation();
      const x = g;
      g = null;
      if (x.cine !== 'zona') return;
      setTragere(null);
      const s = acum.current;
      if (!s.imagine) return;
      if (Math.hypot(e.clientX - x.x, e.clientY - x.y) < TRAGERE_PX) {
        setMotiv({ cod: 'trage' });
        return;
      }
      const z = zonaDinTragere(s.imagine, x.a, inLume(e));
      if (z) s.onTraseaza(z);
      else setMotiv({ cod: 'zona-afara' });
    };
    const anuleaza = (e: PointerEvent): void => {
      if (!g || e.pointerId !== g.id) return;
      g = null;
      setTragere(null);
    };
    const tasta = (e: KeyboardEvent): void => {
      if (e.key === ' ') spatiu = e.type === 'keydown';
      if (e.type !== 'keydown') return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        acum.current.onIesi();
        return;
      }
      // Enter din câmpul distanței aplică (mai jos); de pe pânză: „Aplică” ori „Toată imaginea”.
      const tinta = e.target;
      if (e.key !== 'Enter' || tinta instanceof HTMLInputElement || tinta instanceof HTMLTextAreaElement || tinta instanceof HTMLSelectElement
        || tinta instanceof HTMLButtonElement) return;
      e.preventDefault();
      if (acum.current.fel === 'zona') acum.current.onTraseaza(null);
      else acum.current.aplica();
    };
    cutie.addEventListener('pointerdown', apasa as EventListener, true);
    cutie.addEventListener('pointermove', misca as EventListener, true);
    cutie.addEventListener('pointerup', ridica as EventListener, true);
    cutie.addEventListener('pointercancel', anuleaza as EventListener, true);
    window.addEventListener('keydown', tasta, true);
    window.addEventListener('keyup', tasta, true);
    return () => {
      cutie.removeEventListener('pointerdown', apasa as EventListener, true);
      cutie.removeEventListener('pointermove', misca as EventListener, true);
      cutie.removeEventListener('pointerup', ridica as EventListener, true);
      cutie.removeEventListener('pointercancel', anuleaza as EventListener, true);
      window.removeEventListener('keydown', tasta, true);
      window.removeEventListener('keyup', tasta, true);
    };
  }, []);

  if (!imagine) return null;
  const ex = (x: number): number => v.tx + x * v.scara;
  const ey = (y: number): number => v.ty - y * v.scara;
  const poligon = (q: readonly Punct[]): string => q.map((p) => `${ex(p.x)},${ey(p.y)}`).join(' ');
  const nume = imagine.nume ?? imagine.id;
  const capat2 = p2 ?? cursor;
  const lungime = p1 && capat2 ? distanta(p1, capat2) : null;
  const zonaTrasa = tragere ? zonaDinTragere(imagine, tragere.a, tragere.b) : null;
  const ajutor: CheieSimpla = fel === 'zona' ? 'editare.imagine.zona.ajutor'
    : !p1 ? 'editare.imagine.calibreaza.ajutor1' : !p2 ? 'editare.imagine.calibreaza.ajutor2' : 'editare.imagine.calibreaza.ajutor3';
  const textMotiv = motiv === null ? '' : 'text' in motiv ? motiv.text : t(`editare.imagine.motiv.${motiv.cod}`);
  return (
    <div ref={radacina} className="mod-urechi" data-testid="mod-imagine" data-fel={fel}>
      <svg className="rigle-desen urechi-desen" width={marime.latime} height={marime.inaltime} aria-hidden="true">
        <polygon className="imagine-contur" points={poligon(COLTURI_IMAGINE.map((k) => coltImagine(imagine, k)))} />
        {zonaTrasa && <polygon className="zona-imagine" data-testid="mod-imagine-zona" points={poligon(colturiZonei(imagine, zonaTrasa))} />}
        {p1 && capat2 && <line className="calibrare-linie" x1={ex(p1.x)} y1={ey(p1.y)} x2={ex(capat2.x)} y2={ey(capat2.y)} />}
        {[p1, p2].map((p, k) => (p ? <circle key={k} className="calibrare-capat" cx={ex(p.x)} cy={ey(p.y)} r={5} data-capat={k + 1} /> : null))}
        {p1 && capat2 && lungime !== null && (
          <text className="calibrare-text" x={(ex(p1.x) + ex(capat2.x)) / 2} y={(ey(p1.y) + ey(capat2.y)) / 2 - 10} textAnchor="middle">
            {`${mm(lungime)} mm`}
          </text>
        )}
      </svg>
      <div className="banda-urechi insula" role="toolbar" data-testid="banda-imagine" style={loc ?? undefined}
        aria-label={t(fel === 'zona' ? 'editare.imagine.zona.titlu' : 'editare.imagine.calibreaza.titlu', { nume })}>
        <strong>{t(fel === 'zona' ? 'editare.imagine.zona.titlu' : 'editare.imagine.calibreaza.titlu', { nume })}</strong>
        <span className="nota" data-testid="imagine-ajutor">{t(ajutor)}</span>
        {fel === 'calibrare' && p2 && lungime !== null && (
          <>
            <span data-testid="calibrare-acum">{t('editare.imagine.calibreaza.acum', { mm: mm(lungime) })}</span>
            <label>
              {t('editare.imagine.calibreaza.distanta')}
              {' '}
              <input ref={camp} type="text" inputMode="decimal" size={7} value={ciorna} data-camp="calibrare-distanta"
                onChange={(e) => { setCiorna(e.target.value); setMotiv(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); aplica(); } }} />
            </label>
          </>
        )}
        <span className="motiv-urechi" role="status" data-testid="imagine-motiv">{textMotiv}</span>
        <button type="button" data-buton="imagine-renunta" onClick={onIesi}>{t('editare.imagine.renunta')}</button>
        {fel === 'zona' ? (
          <button type="button" className="principal" data-buton="imagine-toata" onClick={() => { onTraseaza(null); }}>{t('editare.imagine.zona.toata')}</button>
        ) : (
          <button type="button" className="principal" data-buton="imagine-aplica" disabled={!p2} onClick={aplica}>{t('editare.imagine.calibreaza.aplica')}</button>
        )}
      </div>
    </div>
  );
}
