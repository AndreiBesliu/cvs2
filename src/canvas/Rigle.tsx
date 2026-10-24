import { useEffect, useRef, useState, type PointerEvent as EvPointer, type ReactElement } from 'react';
import { cotePeste, pasRigla, pozitiaRiglelor } from './gradatii.ts';
import type { LinieGhid, Vedere } from './protocol.ts';
import './rigle.css';

/**
 * Riglele, ghidajele, grila și liniile de aliniere (ADR 0050 §4), deasupra pânzei. Doar desenul și gesturile: datele
 * (ghidajele foii, lipirea poziției) le dă modulul editării, iar ce se schimbă pleacă prin el, ca acțiuni. Coordonatele
 * sunt ale foii (mm, originea în colțul stânga-jos, Y în sus); pânza le arată cu `vedere`.
 *
 * Riglele stau pe marginea foii (ADR 0060): cea de sus deasupra ei, cea din stânga la stânga ei, lungi cât foaia, mutate
 * odată cu ea, și pe sub bare și panouri. Formele care ies din foaie au o linie de cotă care continuă rigla, cu cât ies.
 */

export const GROSIME_RIGLA = 20;

export type GhidajDesen = { readonly id: string; readonly axa: 'x' | 'y'; readonly poz: number };
export type Zona = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

type Props = {
  readonly vedere: Vedere;
  readonly latime: number;
  readonly inaltime: number;
  /** Zona liberă a pânzei, în pixeli din colțul ei (ghidajele și liniile de aliniere stau în ea; riglele urmează foaia). */
  readonly zona: Zona;
  readonly foaie: { readonly latime: number; readonly inaltime: number };
  /** Cutia tuturor formelor foii (mm), pentru liniile de cotă ale celor care ies din foaie; `null`: nicio formă. */
  readonly forme: { readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number } | null;
  readonly ghidaje: readonly GhidajDesen[];
  readonly linii: readonly LinieGhid[];
  /** Pasul grilei arătate, în mm, sau null. */
  readonly grila: number | null;
  /** Lipirea poziției unui ghidaj tras; `alt` (ținut) inversează lipirea. */
  readonly lipestePoz: (axa: 'x' | 'y', poz: number, scara: number, alt: boolean) => number;
  readonly onNou: (axa: 'x' | 'y', poz: number) => void;
  readonly onMuta: (id: string, poz: number) => void;
  readonly onSterge: (id: string) => void;
  readonly doarCitire: boolean;
  readonly eticheta: (cheie: 'sus' | 'stanga' | 'poz' | LaturaCota, poz?: string) => string;
  readonly textPoz: (poz: number) => string;
  readonly citestePoz: (s: string) => number | null;
};

export type LaturaCota = 'cota-stanga' | 'cota-dreapta' | 'cota-jos' | 'cota-sus';

const zecimale = (pas: number): number => Math.max(0, -Math.floor(Math.log10(pas) + 1e-9));

type Tragere = { readonly id: string | null; readonly axa: 'x' | 'y'; readonly poz: number; readonly peRigla: boolean };

export function Rigle(p: Props): ReactElement {
  const { vedere: v, zona: z, latime, inaltime } = p;
  const sx = (x: number): number => v.tx + x * v.scara;
  const sy = (y: number): number => v.ty - y * v.scara;
  const radacina = useRef<HTMLDivElement | null>(null);
  const [tragere, setTragere] = useState<Tragere | null>(null);
  const [editat, setEditat] = useState<{ readonly id: string; readonly text: string } | null>(null);
  // Riglele urmează foaia și pe sub bare și panouri (ADR 0060 §2): limita lor e pânza întreagă, nu zona liberă.
  const pana = { x: 0, y: 0, w: latime, h: inaltime };
  const poz = pozitiaRiglelor(v, pana, p.foaie, GROSIME_RIGLA);
  const { sus: rs, stanga: rl } = poz;

  // Escape anulează un ghidaj tras.
  useEffect(() => {
    if (!tragere) return undefined;
    const esc = (e: KeyboardEvent): void => { if (e.key === 'Escape') setTragere(null); };
    window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('keydown', esc); };
  }, [tragere !== null]);

  /** Poziția pe foaie a indicatorului, pe axa ghidajului, și dacă stă pe rigla lui (acolo, ghidajul se șterge). */
  const unde = (e: EvPointer<HTMLElement>, axa: 'x' | 'y'): { poz: number; peRigla: boolean } => {
    const r = radacina.current?.getBoundingClientRect();
    const px = e.clientX - (r?.left ?? 0), py = e.clientY - (r?.top ?? 0);
    // „Pe riglă” (ghidajul lăsat acolo se șterge): în banda riglei lui, nu doar deasupra ei.
    if (axa === 'y') {
      const brut = (v.ty - py) / v.scara;
      return { poz: p.lipestePoz('y', brut, v.scara, e.altKey), peRigla: rs !== null && py >= rs.y && py <= rs.y + GROSIME_RIGLA && px >= rs.x0 && px <= rs.x1 };
    }
    const brut = (px - v.tx) / v.scara;
    return { poz: p.lipestePoz('x', brut, v.scara, e.altKey), peRigla: rl !== null && px >= rl.x && px <= rl.x + GROSIME_RIGLA && py >= rl.y0 && py <= rl.y1 };
  };

  const incepe = (e: EvPointer<HTMLElement>, id: string | null, axa: 'x' | 'y'): void => {
    if (p.doarCitire || e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setTragere({ id, axa, ...unde(e, axa) });
  };
  const misca = (e: EvPointer<HTMLElement>): void => {
    if (tragere) setTragere({ ...tragere, ...unde(e, tragere.axa) });
  };
  const termina = (e: EvPointer<HTMLElement>): void => {
    const t = tragere;
    setTragere(null);
    if (!t) return;
    const { poz, peRigla } = unde(e, t.axa);
    if (t.id === null) {
      if (!peRigla) p.onNou(t.axa, poz);
    } else if (peRigla) p.onSterge(t.id);
    else p.onMuta(t.id, poz);
  };
  const gest = { onPointerMove: misca, onPointerUp: termina, onPointerCancel: () => { setTragere(null); } };

  // Gradațiile riglelor, doar pe întinderea lor (foaia, tăiată la zona liberă).
  const { mare, mic } = pasRigla(v.scara);
  const gradatii = (de: number, la: number): Array<{ readonly mm: number; readonly mare: boolean }> => {
    const pas = mic * v.scara >= 4 ? mic : mare;
    const r: Array<{ mm: number; mare: boolean }> = [];
    for (let k = Math.ceil(de / pas); k * pas <= la && r.length < 2000; k++) {
      const mm = k * pas;
      r.push({ mm, mare: Math.abs(mm / mare - Math.round(mm / mare)) < 1e-6 });
    }
    return r;
  };
  const z0 = zecimale(mare);
  const text = (mm: number): string => (Math.abs(mm) < mare / 1e6 ? '0' : mm.toFixed(z0));

  // Grila, doar pe foaie, cu cel puțin 8 px între linii (altfel una din k).
  const liniiGrila = (): ReactElement[] => {
    if (!p.grila || p.grila <= 0) return [];
    const k = Math.max(1, Math.ceil(8 / (p.grila * v.scara)));
    const pas = p.grila * k;
    const r: ReactElement[] = [];
    for (let x = 0; x <= p.foaie.latime + 1e-9 && r.length < 4000; x += pas) {
      r.push(<line key={`gx${x}`} x1={sx(x)} x2={sx(x)} y1={sy(0)} y2={sy(p.foaie.inaltime)} />);
    }
    for (let y = 0; y <= p.foaie.inaltime + 1e-9 && r.length < 8000; y += pas) {
      r.push(<line key={`gy${y}`} x1={sx(0)} x2={sx(p.foaie.latime)} y1={sy(y)} y2={sy(y)} />);
    }
    return r;
  };

  /**
   * Liniile de cotă ale formelor care ies din foaie (ADR 0060): în banda riglei, în continuarea ei, de la marginea foii la
   * marginea formelor, cu cât ies (mm); tăiate doar la marginile pânzei.
   */
  const cote = (): ReactElement[] => {
    const c = cotePeste(p.forme, p.foaie), r: ReactElement[] = [];
    const W = p.foaie.latime, H = p.foaie.inaltime, G = GROSIME_RIGLA;
    const eticheta = (mm: number): string => `${p.textPoz(Math.round(mm * 100) / 100)} mm`;
    const pe = (latura: LaturaCota, mm: number, a: number, b: number, orizontala: boolean, banda: number): void => {
      const lo = Math.max(Math.min(a, b), 0), hi = Math.min(Math.max(a, b), orizontala ? latime : inaltime);
      if (hi - lo < 2) return;
      const L = hi - lo, t = eticheta(mm);
      // Eticheta stă la mijloc dacă încape (≈ 5,5 px pe caracter la 9 px monospațiat); altfel, după capătul dinspre forme.
      const incape = L >= t.length * 5.5 + 8;
      const departe = latura === 'cota-dreapta' || latura === 'cota-jos' ? L + 3 : -3;
      const ancora = incape ? 'middle' : latura === 'cota-dreapta' || latura === 'cota-sus' ? 'start' : 'end';
      r.push(
        <div key={latura} className={`rigla-cota rigla-cota-${orizontala ? 'x' : 'y'}`} data-testid={`rigla-${latura}`} data-mm={mm} title={p.eticheta(latura, p.textPoz(Math.round(mm * 100) / 100))}
          style={orizontala ? { left: lo, top: banda, width: L, height: G } : { left: banda, top: lo, width: G, height: L }}>
          <svg width={orizontala ? L : G} height={orizontala ? G : L} aria-hidden="true">
            {orizontala ? (
              <>
                <line x1={0} x2={L} y1={G / 2} y2={G / 2} />
                <line x1={0.5} x2={0.5} y1={4} y2={G - 4} />
                <line x1={L - 0.5} x2={L - 0.5} y1={4} y2={G - 4} />
                <text x={incape ? L / 2 : departe} y={G / 2 - 3} textAnchor={ancora}>{t}</text>
              </>
            ) : (
              <>
                <line y1={0} y2={L} x1={G / 2} x2={G / 2} />
                <line y1={0.5} y2={0.5} x1={4} x2={G - 4} />
                <line y1={L - 0.5} y2={L - 0.5} x1={4} x2={G - 4} />
                <text x={G / 2 - 3} y={incape ? L / 2 : departe} textAnchor={ancora} transform={`rotate(-90 ${G / 2 - 3} ${incape ? L / 2 : departe})`}>{t}</text>
              </>
            )}
          </svg>
        </div>,
      );
    };
    if (rs) {
      if (c.dreapta !== null) pe('cota-dreapta', c.dreapta, sx(W), sx(W + c.dreapta), true, rs.y);
      if (c.stanga !== null) pe('cota-stanga', c.stanga, sx(-c.stanga), sx(0), true, rs.y);
    }
    if (rl) {
      if (c.sus !== null) pe('cota-sus', c.sus, sy(H + c.sus), sy(H), false, rl.x);
      if (c.jos !== null) pe('cota-jos', c.jos, sy(0), sy(-c.jos), false, rl.x);
    }
    return r;
  };

  const linieGhidaj = (axa: 'x' | 'y', poz: number, cls: string, key: string): ReactElement => (axa === 'x'
    ? <line key={key} className={cls} x1={sx(poz)} x2={sx(poz)} y1={z.y} y2={z.y + z.h} />
    : <line key={key} className={cls} x1={z.x} x2={z.x + z.w} y1={sy(poz)} y2={sy(poz)} />);

  return (
    <div className="rigle" ref={radacina} data-testid="rigle" data-ghidaje={p.ghidaje.length}>
      <svg className="rigle-desen" width={latime} height={inaltime} aria-hidden="true">
        <g className="rigle-grila" data-testid="grila">{liniiGrila()}</g>
        {p.ghidaje.map((g) => (tragere?.id === g.id ? null : linieGhidaj(g.axa, g.poz, 'ghidaj', g.id)))}
        {tragere ? linieGhidaj(tragere.axa, tragere.poz, tragere.peRigla && tragere.id !== null ? 'ghidaj ghidaj-sters' : 'ghidaj ghidaj-tras', 'tras') : null}
        {p.linii.map((l, k) => (l.axa === 'x'
          ? <line key={`l${k}`} className="aliniere" data-fel={l.fel} x1={sx(l.poz)} x2={sx(l.poz)} y1={Math.max(z.y, Math.min(z.y + z.h, sy(l.la)))} y2={Math.max(z.y, Math.min(z.y + z.h, sy(l.de)))} />
          : <line key={`l${k}`} className="aliniere" data-fel={l.fel} y1={sy(l.poz)} y2={sy(l.poz)} x1={Math.max(z.x, Math.min(z.x + z.w, sx(l.de)))} x2={Math.max(z.x, Math.min(z.x + z.w, sx(l.la)))} />))}
      </svg>

      {/* Ghidajele, de apucat: o bandă de 9 px în jurul fiecărei linii. */}
      {p.ghidaje.map((g) => {
        const pozPx = g.axa === 'x' ? sx(g.poz) : sy(g.poz);
        const vizibil = g.axa === 'x' ? pozPx >= z.x && pozPx <= z.x + z.w : pozPx >= z.y && pozPx <= z.y + z.h;
        // Banda rămâne și cât e trasă: ea ține indicatorul (setPointerCapture); scoasă, gestul și dublul clic s-ar pierde.
        if (!vizibil) return null;
        const stil = g.axa === 'x' ? { left: pozPx - 4, top: z.y, height: z.h } : { top: pozPx - 4, left: z.x, width: z.w };
        return (
          <div key={g.id} className={`ghidaj-apuca ghidaj-apuca-${g.axa}`} style={stil} data-ghidaj={g.id} data-axa={g.axa} data-poz={g.poz}
            title={p.eticheta('poz', p.textPoz(g.poz))}
            onPointerDown={(e) => { incepe(e, g.id, g.axa); }} {...gest}
            onDoubleClick={() => { if (!p.doarCitire) setEditat({ id: g.id, text: p.textPoz(g.poz) }); }} />
        );
      })}

      {rs ? (
        <div className="rigla rigla-sus" style={{ left: rs.x0, top: rs.y, width: rs.x1 - rs.x0 }} data-testid="rigla-sus" title={p.eticheta('sus')}
          onPointerDown={(e) => { incepe(e, null, 'y'); }} {...gest}>
          <svg width={rs.x1 - rs.x0} height={GROSIME_RIGLA} aria-hidden="true">
            {gradatii((rs.x0 - v.tx) / v.scara, (rs.x1 - v.tx) / v.scara).map(({ mm, mare: m }) => {
              const x = sx(mm) - rs.x0;
              return (
                <g key={mm}>
                  <line x1={x} x2={x} y1={m ? 4 : 13} y2={GROSIME_RIGLA} />
                  {m ? <text x={x + 3} y={11}>{text(mm)}</text> : null}
                </g>
              );
            })}
          </svg>
        </div>
      ) : null}
      {rl ? (
        <div className="rigla rigla-stanga" style={{ left: rl.x, top: rl.y0, height: rl.y1 - rl.y0 }} data-testid="rigla-stanga" title={p.eticheta('stanga')}
          onPointerDown={(e) => { incepe(e, null, 'x'); }} {...gest}>
          <svg width={GROSIME_RIGLA} height={rl.y1 - rl.y0} aria-hidden="true">
            {gradatii((v.ty - rl.y1) / v.scara, (v.ty - rl.y0) / v.scara).map(({ mm, mare: m }) => {
              const y = sy(mm) - rl.y0;
              return (
                <g key={mm}>
                  <line y1={y} y2={y} x1={m ? 4 : 13} x2={GROSIME_RIGLA} />
                  {m ? <text x={11} y={y - 3} transform={`rotate(-90 11 ${y - 3})`}>{text(mm)}</text> : null}
                </g>
              );
            })}
          </svg>
        </div>
      ) : null}
      {rs && rl ? <div className="rigla-colt" style={{ left: rl.x, top: rs.y }} aria-hidden="true" /> : null}
      {cote()}

      {editat ? (() => {
        const g = p.ghidaje.find((x) => x.id === editat.id);
        if (!g) return null;
        const pozPx = g.axa === 'x' ? sx(g.poz) : sy(g.poz);
        const stil = g.axa === 'x' ? { left: pozPx + 6, top: (rs?.y ?? z.y) + GROSIME_RIGLA + 4 } : { top: pozPx + 6, left: (rl?.x ?? z.x) + GROSIME_RIGLA + 4 };
        const aplica = (): void => {
          const n = p.citestePoz(editat.text);
          setEditat(null);
          if (n !== null) p.onMuta(g.id, n);
        };
        return (
          <input className="ghidaj-camp" style={stil} autoFocus value={editat.text} aria-label={p.eticheta('poz', editat.text)} data-testid="ghidaj-camp"
            onChange={(e) => { setEditat({ ...editat, text: e.target.value }); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') aplica();
              else if (e.key === 'Escape') setEditat(null);
              e.stopPropagation();
            }}
            onBlur={() => { setEditat(null); }} />
        );
      })() : null}
    </div>
  );
}
