/**
 * Dialogul „Din desen…” al ferestrei Imprimanta (ADR 0191, felia 3.6j): piesele plate ale foii (toate, cele selectate sau
 * una singură), ridicate la o înălțime și feliate în cvs2 pentru K1C, cu setările „Simplu” (materialul, calitatea,
 * temperaturile, pereții, umplerea, brim-ul) și „Avansat” (toate celelalte, din `campuri.ts`); straturile văzute de sus, cu
 * un glisor; avertismentele (căile deschise, piesele fără forme închise, ce nu încape, ce e prea subțire); salvarea fișierului
 * și trimiterea lui prin dialogul de la 3.6h (aceeași verificare, aceeași bifă „Patul e gol” la pornire).
 *
 * Felierea rulează pe firul principal, după o pauză scurtă de la ultima schimbare: o piesă plată se calculează pe feluri de
 * strat, nu strat cu strat (ADR 0191). Setările alese se țin în browser (o comoditate a fiecăruia, nu a proiectului).
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { limba, t } from '../i18n/t.ts';
import type { Document } from '../model/document.ts';
import { patPentru } from '../machine/imprimanta/gcode3d.ts';
import { CAMPURI_AVANSATE, DIN_CALITATE, DIN_MATERIAL, type CampAvansat } from '../cam/feliere/campuri.ts';
import {
  CALITATI, feliaza, LIMITE, material, MATERIALE, pieseDinDocument, puncte, setariImplicite, setariValide, timpText,
  type Brim, type Miniatura, type PiesaPlata, type RezultatFeliere, type SetariFeliere, type SursaFeliere,
} from '../cam/feliere/index.ts';

/** Desenul văzut la deschiderea dialogului: documentul și instanțele selectate. */
export type DesenImprimanta = { readonly doc: Document; readonly selectie: readonly string[] };

const CHEIE = 'cvs2.imprimanta.feliere';

function citesteSetari(): SetariFeliere {
  try {
    const x = localStorage.getItem(CHEIE);
    if (x) return setariValide(JSON.parse(x) as Record<string, unknown>);
  } catch {
    // Fără stocare sau o valoare stricată: setările profilului.
  }
  return setariImplicite();
}

function scrieSetari(s: SetariFeliere): void {
  try { localStorage.setItem(CHEIE, JSON.stringify(s)); } catch { /* fără stocare: rămân doar în dialog */ }
}

const loc = (): string => (limba() === 'ro' ? 'ro-RO' : 'en-GB');
const numar = (v: number, z = 2): string => v.toLocaleString(loc(), { maximumFractionDigits: z });
const preia = (d: SetariFeliere, k: readonly (keyof SetariFeliere)[]): Partial<SetariFeliere> => Object.fromEntries(k.map((x) => [x, d[x]]));

/** Numele fișierului, ca `filename_format` din OrcaSlicer: `<nume>_<material>_<timp>.gcode`, fără spații și diacritice. */
export function numeFisier(nume: string, tip: string, timp: number): string {
  const curat = (x: string): string => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9.-]+/g, '_').replace(/^_+|_+$/g, '');
  return `${curat(nume) || 'cvs2'}_${curat(tip)}_${timpText(timp).replace(/\s+/g, '')}.gcode`;
}

/** Data antetului, ca în OrcaSlicer: „2026-11-07 at 19:41:00”. */
const dataAntet = (d: Date): string => {
  const z = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())} at ${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}`;
};

/** Poligoanele aplatizate ale pieselor și cutia lor. */
function contur(piese: readonly PiesaPlata[]): { pol: number[][]; x0: number; y0: number; x1: number; y1: number } {
  const pol = piese.flatMap((p) => p.contururi.map((c) => puncte(c)));
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pol) for (let i = 0; i < p.length; i += 2) { x0 = Math.min(x0, p[i]!); x1 = Math.max(x1, p[i]!); y0 = Math.min(y0, p[i + 1]!); y1 = Math.max(y1, p[i + 1]!); }
  return { pol, x0, y0, x1, y1 };
}

/** Miniaturile PNG pentru ecranul imprimantei (96 și 300, ca profilul K1C): piesele de sus, pline. */
function miniaturi(piese: readonly PiesaPlata[]): Miniatura[] {
  const { pol, x0, y0, x1, y1 } = contur(piese);
  const rez: Miniatura[] = [];
  for (const m of [96, 300]) {
    const cv = document.createElement('canvas');
    cv.width = m; cv.height = m;
    const c = cv.getContext('2d');
    if (!c || pol.length === 0) continue;
    const k = (m * 0.86) / Math.max(x1 - x0, y1 - y0, 1e-6);
    const ox = (m - (x1 - x0) * k) / 2, oy = (m - (y1 - y0) * k) / 2;
    c.beginPath();
    for (const p of pol) {
      for (let i = 0; i < p.length; i += 2) {
        const X = ox + (p[i]! - x0) * k, Y = m - (oy + (p[i + 1]! - y0) * k);
        if (i === 0) c.moveTo(X, Y); else c.lineTo(X, Y);
      }
      c.closePath();
    }
    c.fillStyle = '#ff8a1f';
    c.fill('evenodd');
    c.lineWidth = Math.max(1, m / 96);
    c.strokeStyle = '#a64d00';
    c.stroke();
    const png = cv.toDataURL('image/png').split(',')[1];
    if (png) rez.push({ latime: m, inaltime: m, png });
  }
  return rez;
}

const CULORI: Readonly<Record<string, string>> = {
  exterior: '--imp-rol-exterior', interior: '--imp-rol-interior', plin: '--imp-rol-plin', sus: '--imp-rol-sus', rar: '--imp-rol-rar', brim: '--imp-rol-brim',
};

/** Previzualizarea unui strat: patul de sus, conturul pieselor (subțire, roșu: unde nu iese nimic, se vede) și căile. */
function Previzualizare({ rez, strat }: { readonly rez: RezultatFeliere; readonly strat: number }): ReactNode {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const forma = useMemo(() => contur(rez.piese), [rez]);
  useEffect(() => {
    const cv = ref.current;
    const c = cv?.getContext('2d');
    if (!cv || !c) return;
    const css = getComputedStyle(cv);
    const culoare = (v: string): string => css.getPropertyValue(v).trim() || '#888';
    // Cutia: piesele, cu brim-ul (din primul strat) și o margine.
    let { x0, y0, x1, y1 } = forma;
    for (const p of rez.cai(1)) for (let i = 0; i < p.p.length; i += 2) { x0 = Math.min(x0, p.p[i]!); x1 = Math.max(x1, p.p[i]!); y0 = Math.min(y0, p.p[i + 1]!); y1 = Math.max(y1, p.p[i + 1]!); }
    const m = Math.max(2, 0.06 * Math.max(x1 - x0, y1 - y0));
    x0 -= m; y0 -= m; x1 += m; y1 += m;
    const W = cv.clientWidth || 480, H = Math.min(420, Math.max(160, (W * (y1 - y0)) / (x1 - x0)));
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.height = `${H}px`;
    const k = Math.min(W / (x1 - x0), H / (y1 - y0)) * dpr;
    const ox = (cv.width - (x1 - x0) * k) / 2, oy = (cv.height - (y1 - y0) * k) / 2;
    const X = (x: number): number => ox + (x - x0) * k, Y = (y: number): number => cv.height - (oy + (y - y0) * k);
    c.fillStyle = culoare('--imp-pat');
    c.fillRect(0, 0, cv.width, cv.height);
    // Grila patului, la 10 mm.
    c.strokeStyle = culoare('--imp-pat-grila'); c.lineWidth = 1;
    c.beginPath();
    for (let g = Math.ceil(x0 / 10) * 10; g <= x1; g += 10) { c.moveTo(X(g), 0); c.lineTo(X(g), cv.height); }
    for (let g = Math.ceil(y0 / 10) * 10; g <= y1; g += 10) { c.moveTo(0, Y(g)); c.lineTo(cv.width, Y(g)); }
    c.stroke();
    c.strokeStyle = culoare('--imp-rol-subtire'); c.lineWidth = Math.max(1, 0.12 * k);
    c.beginPath();
    for (const p of forma.pol) { for (let i = 0; i < p.length; i += 2) { if (i === 0) c.moveTo(X(p[i]!), Y(p[i + 1]!)); else c.lineTo(X(p[i]!), Y(p[i + 1]!)); } c.closePath(); }
    c.stroke();
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (const p of rez.cai(strat)) {
      c.strokeStyle = culoare(CULORI[p.rol] ?? '--imp-rol-plin');
      c.lineWidth = Math.max(1, p.w * k * 0.9);
      c.beginPath();
      for (let i = 0; i < p.p.length; i += 2) { if (i === 0) c.moveTo(X(p.p[i]!), Y(p.p[i + 1]!)); else c.lineTo(X(p.p[i]!), Y(p.p[i + 1]!)); }
      if (p.inchisa) c.closePath();
      c.stroke();
    }
  }, [rez, strat, forma]);
  return <canvas ref={ref} className="imprimanta-felie-pat" data-testid="imprimanta-felie-pat" role="img" aria-label={t('imprimanta.felie.pat')} />;
}

/** Un câmp numeric: textul se scrie liber, iar valoarea (adusă în limite) se ia la ieșirea din câmp sau la Enter. */
function CampNumar({ valoare, procent, pas, la, id, eticheta, unitate, data }: {
  readonly valoare: number; readonly procent?: boolean; readonly pas: number; readonly la: (v: number) => void; readonly id: string;
  readonly eticheta: string; readonly unitate: string; readonly data?: string;
}): ReactNode {
  const arata = (v: number): string => String(Number((procent ? v * 100 : v).toFixed(4)));
  const [text, setText] = useState(arata(valoare));
  useEffect(() => { setText(arata(valoare)); }, [valoare]);
  const ia = (): void => {
    const v = Number(text.replace(',', '.'));
    if (Number.isFinite(v) && text.trim() !== '') la(procent ? v / 100 : v);
    else setText(arata(valoare));
  };
  return (
    <label className="imprimanta-camp imprimanta-felie-camp" htmlFor={id}>
      <span>{eticheta}{unitate ? ` (${unitate})` : ''}</span>
      <input id={id} type="text" inputMode="decimal" value={text} step={pas} autoComplete="off" spellCheck={false}
        {...(data ? { 'data-imprimanta': data } : { 'data-felie': id.replace(/^felie-/, '') })}
        onChange={(e) => { setText(e.target.value); }} onBlur={ia}
        onKeyDown={(e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); ia(); } }} />
    </label>
  );
}

export function DialogDinDesen({ desen, model, trimite, inchide }: {
  readonly desen: DesenImprimanta; readonly model: string | null; readonly trimite: ((f: File) => void) | null; readonly inchide: () => void;
}): ReactNode {
  const foaie = desen.doc.foi[0];
  const instante = foaie?.instante ?? [];
  const numePiesa = useMemo(() => new Map(desen.doc.piese.map((p) => [p.id, p.nume])), [desen]);
  const numeInstanta = (id: string, k: number): string => numePiesa.get(instante.find((i) => i.id === id)?.piesa ?? '') ?? `#${k + 1}`;
  const selectate = desen.selectie.filter((id) => instante.some((i) => i.id === id));
  const [ce, setCe] = useState<SursaFeliere['fel']>(selectate.length > 0 ? 'selectie' : 'foaie');
  const [piesa, setPiesa] = useState(selectate[0] ?? instante[0]?.id ?? '');
  const grosime = foaie?.stoc.grosime ?? 3;
  const [inaltime, setInaltime] = useState(() => Math.min(250, Math.max(0.2, grosime)));
  const [s, setS] = useState<SetariFeliere>(citesteSetari);
  useEffect(() => { scrieSetari(s); }, [s]);
  const [avansat, setAvansat] = useState(false);
  const pat = patPentru(model);
  const sursa: SursaFeliere = ce === 'foaie' ? { fel: 'foaie' } : ce === 'selectie' ? { fel: 'selectie', ids: selectate } : { fel: 'piesa', id: piesa };
  const cheieSursa = ce === 'piesa' ? `piesa:${piesa}` : ce;
  const alese = useMemo(() => pieseDinDocument(desen.doc, sursa, inaltime, [pat[0], pat[1]]), [desen, cheieSursa, inaltime, pat[0], pat[1]]);
  const [rez, setRez] = useState<RezultatFeliere | null>(null);
  const [lucreaza, setLucreaza] = useState(true);
  // Stratul arătat: 0 = încă neales de om (atunci cel din mijloc), altfel cel ales, cel mult ultimul.
  const [alesStrat, setStrat] = useState(0);
  useEffect(() => {
    setLucreaza(true);
    const id = setTimeout(() => {
      const r = alese.incape && alese.piese.length > 0 && inaltime <= pat[2]
        ? feliaza(alese.piese, s, { data: dataAntet(new Date()), miniaturi: miniaturi(alese.piese) })
        : null;
      setRez(r);
      setLucreaza(false);
    }, 150);
    return () => { clearTimeout(id); };
  }, [alese, s, inaltime, pat[2]]);
  const cutie = useRef<HTMLDivElement | null>(null);
  useEffect(() => { cutie.current?.querySelector<HTMLElement>('[data-imprimanta="felie-renunta"]')?.focus(); }, []);

  const g = rez?.gcode ?? null;
  const mt = material(s.material);
  const avert: string[] = [];
  if (instante.length === 0) avert.push(t('imprimanta.felie.foaie-goala'));
  if (alese.deschise > 0) avert.push(t('imprimanta.felie.deschise', { n: alese.deschise }));
  for (const r of alese.refuzate) avert.push(t(`imprimanta.felie.refuz.${r.motiv}`, { piesa: r.eticheta, motiv: r.detaliu ?? '' }));
  if (!alese.incape) avert.push(t('imprimanta.felie.nu-incape', { l: numar(alese.latime, 1), a: numar(alese.adancime, 1), x: pat[0] - 10, y: pat[1] - 10 }));
  if (inaltime > pat[2]) avert.push(t('imprimanta.felie.prea-inalta', { z: pat[2] }));
  for (const a of rez?.avertismente ?? []) {
    avert.push(a.fel === 'subtire' ? t('imprimanta.felie.subtire', { piesa: a.piesa, arie: numar(a.arie, 1) })
      : a.fel === 'nimic' ? t('imprimanta.felie.nimic', { piesa: a.piesa })
        : t('imprimanta.felie.eroare', { piesa: a.piesa, motiv: a.motiv }));
  }
  const n = g?.straturi ?? 0;
  const strat = n === 0 ? 1 : alesStrat === 0 ? Math.ceil(n / 2) : Math.min(alesStrat, n);
  const hReal = n === 0 ? 0 : s.strat1 + (n - 1) * s.strat;
  const fel = g?.plan[strat - 1]?.piese[0]?.fel;
  const unghi = fel?.endsWith('135') ? '135' : '45';
  const textFel = fel === undefined ? ''
    : fel === 'prim' ? t('imprimanta.felie.fel.prim')
      : fel === 'rar' ? t('imprimanta.felie.fel.rar')
        : t(fel.startsWith('sus') ? 'imprimanta.felie.fel.sus' : 'imprimanta.felie.fel.plin', { unghi });
  const numeBaza = alese.piese.length === 1 ? alese.piese[0]!.eticheta : (foaie?.nume ?? 'cvs2');
  const fisier = (): File | null => (g === null ? null : new File([g.text], numeFisier(numeBaza, mt.tip, g.timp), { type: 'text/plain' }));
  const salveaza = (): void => {
    const f = fisier();
    if (!f) return;
    const url = URL.createObjectURL(f);
    const a = document.createElement('a');
    a.href = url; a.download = f.name; a.click();
    setTimeout(() => { URL.revokeObjectURL(url); }, 10_000);
  };
  const seteaza = (k: keyof SetariFeliere, v: unknown): void => { setS((x) => setariValide({ ...x, [k]: v })); };
  const lim = (k: keyof SetariFeliere): readonly [number, number] | undefined => LIMITE[k];

  return (
    <div className="imprimanta-dialog imprimanta-felie" role="dialog" aria-labelledby="imprimanta-felie-titlu" data-testid="imprimanta-felie"
      data-stare={lucreaza ? 'lucreaza' : g === null ? 'gol' : 'gata'} ref={cutie}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); inchide(); } }}>
      <h3 id="imprimanta-felie-titlu">{t('imprimanta.felie.titlu')}</h3>
      <div className="imprimanta-felie-corp">
        <div className="imprimanta-felie-setari">
          <fieldset className="imprimanta-felie-ce">
            <legend>{t('imprimanta.felie.ce')}</legend>
            <label><input type="radio" name="felie-ce" data-imprimanta="felie-ce-foaie" checked={ce === 'foaie'} onChange={() => { setCe('foaie'); }} />
              {t('imprimanta.felie.ce.foaie', { n: instante.length })}</label>
            <label><input type="radio" name="felie-ce" data-imprimanta="felie-ce-selectie" checked={ce === 'selectie'} disabled={selectate.length === 0}
              onChange={() => { setCe('selectie'); }} />{t('imprimanta.felie.ce.selectie', { n: selectate.length })}</label>
            <label><input type="radio" name="felie-ce" data-imprimanta="felie-ce-piesa" checked={ce === 'piesa'} disabled={instante.length === 0}
              onChange={() => { setCe('piesa'); }} />{t('imprimanta.felie.ce.piesa')}</label>
            <select data-imprimanta="felie-piesa" aria-label={t('imprimanta.felie.ce.piesa')} value={piesa} disabled={ce !== 'piesa'}
              onChange={(e) => { setPiesa(e.target.value); }}>
              {instante.map((i, k) => <option key={i.id} value={i.id}>{numeInstanta(i.id, k)}</option>)}
            </select>
          </fieldset>
          <CampNumar id="felie-inaltime" data="felie-inaltime" eticheta={t('imprimanta.felie.inaltime')} unitate="mm" pas={0.2} valoare={inaltime}
            la={(v) => { setInaltime(Math.min(250, Math.max(0.2, v))); }} />
          <p className="imprimanta-ajutor">{t('imprimanta.felie.inaltime.ajutor', { g: numar(grosime) })}</p>
          <div className="imprimanta-felie-doua">
            <label className="imprimanta-camp"><span>{t('imprimanta.felie.material')}</span>
              <select data-imprimanta="felie-material" value={s.material}
                onChange={(e) => { const id = e.target.value; setS((x) => setariValide({ ...x, ...preia(setariImplicite(id, x.calitate), DIN_MATERIAL), material: id })); }}>
                {MATERIALE.map((m) => <option key={m.id} value={m.id}>{m.nume}</option>)}
              </select></label>
            <label className="imprimanta-camp"><span>{t('imprimanta.felie.calitate')}</span>
              <select data-imprimanta="felie-calitate" value={s.calitate}
                onChange={(e) => { const id = e.target.value; setS((x) => setariValide({ ...x, ...preia(setariImplicite(x.material, id), DIN_CALITATE), calitate: id })); }}>
                {CALITATI.map((c) => <option key={c.id} value={c.id}>{t('imprimanta.felie.calitate.strat', { h: numar(c.strat) })}</option>)}
              </select></label>
          </div>
          <div className="imprimanta-felie-doua">
            <CampNumar id="felie-duza" data="felie-duza" eticheta={t('imprimanta.felie.duza')} unitate="°C" pas={1} valoare={s.duza} la={(v) => { seteaza('duza', v); }} />
            <CampNumar id="felie-pat-temp" data="felie-pat" eticheta={t('imprimanta.felie.pat-temp')} unitate="°C" pas={1} valoare={s.pat} la={(v) => { seteaza('pat', v); }} />
          </div>
          <div className="imprimanta-felie-doua">
            <CampNumar id="felie-pereti" data="felie-pereti" eticheta={t('imprimanta.felie.pereti')} unitate="" pas={1} valoare={s.pereti} la={(v) => { seteaza('pereti', v); }} />
            <CampNumar id="felie-umplere" data="felie-umplere" eticheta={t('imprimanta.felie.umplere')} unitate="%" pas={1} procent valoare={s.umplere} la={(v) => { seteaza('umplere', v); }} />
          </div>
          <label className="imprimanta-camp"><span>{t('imprimanta.felie.brim')}</span>
            <select data-imprimanta="felie-brim" value={s.brim} onChange={(e) => { seteaza('brim', e.target.value as Brim); }}>
              <option value="automat">{t('imprimanta.felie.brim.automat')}</option>
              <option value="da">{t('imprimanta.felie.brim.da')}</option>
              <option value="nu">{t('imprimanta.felie.brim.nu')}</option>
            </select></label>
          <div className="imprimanta-butoane">
            <button type="button" data-imprimanta="felie-avansat" aria-expanded={avansat} onClick={() => { setAvansat((x) => !x); }}>{t('imprimanta.felie.avansat')}</button>
            <button type="button" data-imprimanta="felie-implicite" onClick={() => { setS(setariImplicite(s.material, s.calitate)); }}>{t('imprimanta.felie.implicite')}</button>
          </div>
          {avansat && (
            <div className="imprimanta-felie-avansat" data-testid="imprimanta-felie-avansat">
              {CAMPURI_AVANSATE.map((gr) => (
                <fieldset key={gr.grup}>
                  <legend>{t(`imprimanta.felie.g.${gr.grup}`)}</legend>
                  {gr.campuri.map((c: CampAvansat) => {
                    const l = lim(c.k);
                    return (
                      <CampNumar key={c.k} id={`felie-${c.k}`} eticheta={t(`imprimanta.felie.c.${c.k}`)} unitate={c.unitate} pas={c.pas}
                        {...(c.procent ? { procent: true } : {})} valoare={s[c.k] as number}
                        la={(v) => { seteaza(c.k, l ? Math.min(l[1], Math.max(l[0], v)) : v); }} />
                    );
                  })}
                </fieldset>
              ))}
            </div>
          )}
        </div>
        <div className="imprimanta-felie-vedere">
          {lucreaza && <p role="status" data-testid="imprimanta-felie-lucreaza">{t('imprimanta.felie.lucreaza')}</p>}
          {rez !== null && g !== null && (
            <>
              <Previzualizare rez={rez} strat={strat} />
              <label className="imprimanta-felie-glisor">
                <span>{t('imprimanta.felie.strat')}</span>
                <input type="range" min={1} max={n} value={strat} data-imprimanta="felie-strat" onChange={(e) => { setStrat(Number(e.target.value)); }} />
                <output data-testid="imprimanta-felie-strat">{t('imprimanta.felie.strat.din', { k: strat, n })}</output>
              </label>
              <p className="imprimanta-slab" data-testid="imprimanta-felie-fel">
                {t('imprimanta.felie.z', { z: numar(s.strat1 + (strat - 1) * s.strat) })} · {textFel}
              </p>
              <ul className="imprimanta-felie-legenda" aria-label={t('imprimanta.felie.legenda')}>
                {(['exterior', 'interior', 'plin', 'sus', 'rar', 'brim'] as const).map((r) => (
                  <li key={r}><i style={{ background: `var(${CULORI[r]})` }} />{t(`imprimanta.felie.rol.${r}`)}</li>
                ))}
              </ul>
              <p className="imprimanta-felie-rezumat" data-testid="imprimanta-felie-rezumat">
                {t('imprimanta.felie.rezumat', { n, timp: timpText(g.timp), m: numar(g.filamentMm / 1000), g: numar(g.filamentG, 1), material: mt.nume })}
              </p>
              {Math.abs(hReal - inaltime) > 1e-3 && (
                <p className="imprimanta-ajutor" data-testid="imprimanta-felie-inaltime-reala">
                  {t('imprimanta.felie.inaltime-reala', { h: numar(hReal), n, s: numar(s.strat) })}</p>
              )}
            </>
          )}
          {!lucreaza && g === null && avert.length === 0 && <p className="imprimanta-slab">{t('imprimanta.felie.gol')}</p>}
          {avert.length > 0 && <ul className="imprimanta-avert" data-testid="imprimanta-felie-avert">{avert.map((x) => <li key={x}>{x}</li>)}</ul>}
        </div>
      </div>
      <div className="imprimanta-butoane">
        {trimite !== null && (
          <button type="button" className="principal" data-imprimanta="felie-trimite" disabled={lucreaza || g === null}
            onClick={() => { const f = fisier(); if (f) trimite(f); }}>{t('imprimanta.felie.trimite')}</button>
        )}
        <button type="button" className={trimite === null ? 'principal' : ''} data-imprimanta="felie-salveaza" disabled={lucreaza || g === null}
          onClick={salveaza}>{t('imprimanta.felie.salveaza')}</button>
        <button type="button" data-imprimanta="felie-renunta" onClick={inchide}>{t('imprimanta.felie.renunta')}</button>
      </div>
    </div>
  );
}
