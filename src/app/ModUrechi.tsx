/**
 * Modul urechilor alese (ADR 0211, 3a; felia 11.3↑d): pânza arată conturul operației în fiecare copie a piesei de pe foaie, cu
 * urechile alese ca semne mici; un clic pe contur pune o ureche (pe cel mai apropiat punct al lui), un clic pe o ureche o
 * scoate, trasă se mută pe contur. Două urechi nu se apropie sub W / 0,9 între centre (6a). „Gata” (sau Enter) dă locurile
 * aplicației, care le scrie într-un singur pas; „Renunță” (sau Escape) le lasă cum erau. Vine la cerere, cu fereastra
 * exportului; partea pură e în `urechiAleseCalcul.ts`.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactElement, type RefObject } from 'react';
import { aplica } from '../geom/matrice.ts';
import type { Document } from '../model/document.ts';
import '../i18n/export.ts';
import { mesajeGata } from '../i18n/laCerere.ts';
import { t } from '../i18n/t.ts';
import { textNumar } from '../ui/numar.ts';
import { useLimba } from '../ui/useLimba.ts';
import { drumSvg } from './noduriCalcul.ts';
import {
  conturLovit, contururiUrechi, distantaMinima, listaLocuri, locuriOperatiei, mutaUreche, numarLocuri, puneUreche, scoateUreche,
  urecheLovita, type ConturUrechi, type Locuri, type MotivUreche, type UrecheLovita,
} from './urechiAleseCalcul.ts';
import type { Vedere } from '../canvas/protocol.ts';
import { PLAFON } from '../model/document.ts';

/** Mesajele modulului (ale exportului), ca date (ADR 0086): cine îl încarcă le așteaptă (`cuMesaje`). */
export const mesaje = mesajeGata();
mesaje.catch(() => undefined);

/** Cât de departe de contur (pe ecran) prinde un clic. */
const PRINDERE_PX = 8;
/** Raza semnului unei urechi pe ecran, și a locului în care un clic o prinde. */
const SEMN_PX = 5;
const PRINDERE_SEMN_PX = 9;
/** O mișcare mai scurtă de atât (pe ecran) e un clic, nu o tragere. */
const TRAGERE_PX = 3;

type Props = {
  readonly doc: Document;
  readonly indexFoaie: number;
  readonly piesa: string;
  readonly operatie: string;
  /** Lungimea palierului (W, mm), din rândul ferestrei: distanța cea mai mică dintre urechi e W / 0,9. */
  readonly latime: number;
  /** Operația, în cuvinte (ca în rândul ferestrei). */
  readonly nume: string;
  readonly vedere: Vedere;
  readonly marime: { readonly latime: number; readonly inaltime: number };
  /** Zona liberă a pânzei (fără meniu, bare și panouri): banda stă sus, pe mijlocul ei. */
  readonly zona: RefObject<HTMLElement | null>;
  readonly onGata: (locuri: Locuri) => void;
  readonly onRenunta: () => void;
};

/** Semnele urechilor alese, pe toate copiile (și cu „Arată traseul”, ADR 0211, 4a). */
export function SemneUrechi({ contururi, locuri, vedere, tras }: {
  readonly contururi: readonly ConturUrechi[]; readonly locuri: Locuri; readonly vedere: Vedere; readonly tras?: UrecheLovita | null;
}): ReactElement {
  return (
    <>
      {contururi.flatMap((k) => listaLocuri(locuri, k.nod).map((q, j) => {
        const w = aplica(k.matrice, { x: q.x, y: q.y });
        const activa = tras?.k.nod === k.nod && tras.index === j;
        return (
          <circle key={`${k.instanta}/${k.nod}/${j}`} className={activa ? 'ureche-aleasa trasa' : 'ureche-aleasa'} cx={vedere.tx + w.x * vedere.scara}
            cy={vedere.ty - w.y * vedere.scara} r={SEMN_PX} data-ureche={`${k.instanta}/${k.nod}/${j}`} />
        );
      }))}
    </>
  );
}

/**
 * Semnele urechilor alese ale tuturor operațiilor de pe foaie, cu „Arată traseul” (ADR 0211, 4a): doar desenate, fără nimic de
 * apăsat. `lemn`: centrele urechilor „unde ține” (ADR 0211, b), pe drumul frezei, cum le-a pus lucrarea traseului.
 */
export function SemneUrechiFoaie({ doc, indexFoaie, vedere, marime, lemn }: {
  readonly doc: Document; readonly indexFoaie: number; readonly vedere: Vedere; readonly marime: { readonly latime: number; readonly inaltime: number };
  readonly lemn?: readonly { readonly x: number; readonly y: number }[] | undefined;
}): ReactElement {
  const semne = useMemo(() => doc.piese.flatMap((p) => p.operatii.filter((o) => o.urechi?.mod === 'alese').map((o) => ({
    cheie: `${p.id}/${o.id}`, contururi: contururiUrechi(doc, indexFoaie, p.id, o.id), locuri: locuriOperatiei(doc, p.id, o.id),
  }))), [doc, indexFoaie]);
  return (
    <svg className="rigle-desen urechi-desen" width={marime.latime} height={marime.inaltime} aria-hidden="true" data-testid="semne-urechi">
      {semne.map((s) => <SemneUrechi key={s.cheie} contururi={s.contururi} locuri={s.locuri} vedere={vedere} />)}
      {(lemn ?? []).map((q, j) => (
        <circle key={`lemn/${j}`} className="ureche-lemn" cx={vedere.tx + q.x * vedere.scara} cy={vedere.ty - q.y * vedere.scara} r={SEMN_PX}
          data-ureche-lemn={j} />
      ))}
    </svg>
  );
}

export function ModUrechi({ doc, indexFoaie, piesa, operatie, latime, nume, vedere, marime, zona, onGata, onRenunta }: Props): ReactElement {
  const limba = useLimba();
  const contururi = useMemo(() => contururiUrechi(doc, indexFoaie, piesa, operatie), [doc, indexFoaie, piesa, operatie]);
  const [locuri, setLocuri] = useState<Locuri>(() => locuriOperatiei(doc, piesa, operatie));
  const [motiv, setMotiv] = useState<MotivUreche | null>(null);
  const [tras, setTras] = useState<UrecheLovita | null>(null);
  const radacina = useRef<HTMLDivElement>(null);
  // Locul benzii: sus, pe mijlocul zonei libere (pânza stă și sub meniu și sub bare), ca la editor.
  const [loc, setLoc] = useState<{ readonly top: number; readonly left: number; readonly maxWidth: number } | null>(null);
  useLayoutEffect(() => {
    const masoara = (): void => {
      const z = zona.current?.getBoundingClientRect();
      const c = radacina.current?.parentElement?.getBoundingClientRect();
      const n = z && c && z.width > 100 && z.height > 100
        ? { top: Math.round(z.top - c.top) + 8, left: Math.round(z.left - c.left + z.width / 2), maxWidth: Math.round(z.width) - 16 } : null;
      setLoc((v) => (v && n && v.top === n.top && v.left === n.left && v.maxWidth === n.maxWidth ? v : n));
    };
    masoara();
    const ro = new ResizeObserver(masoara);
    if (zona.current) ro.observe(zona.current);
    return () => { ro.disconnect(); };
  }, [marime.latime, marime.inaltime, zona]);
  const acum = useRef({ locuri, contururi, vedere, latime, onGata, onRenunta });
  acum.current = { locuri, contururi, vedere, latime, onGata, onRenunta };

  useEffect(() => {
    const el = radacina.current;
    const cutie = el?.closest('.panza-cutie');
    const panza = cutie?.querySelector<HTMLCanvasElement>('canvas.panza');
    if (!el || !cutie || !panza) return undefined;
    let spatiu = false;
    let g: { readonly id: number; readonly u: UrecheLovita; readonly x: number; readonly y: number; mutata: boolean } | null = null;
    /** Punctul lumii de sub maus. */
    const inLume = (e: PointerEvent): { readonly x: number; readonly y: number } => {
      const r = el.getBoundingClientRect(), v = acum.current.vedere;
      return { x: (e.clientX - r.left - v.tx) / v.scara, y: (v.ty - (e.clientY - r.top)) / v.scara };
    };
    const schimba = (r: ReturnType<typeof puneUreche>): void => {
      if (!r) return;
      if (r.ok) { acum.current.locuri = r.locuri; setLocuri(r.locuri); setMotiv(null); } else setMotiv(r.motiv);
    };
    // Pe faza de capturare, pe cutia pânzei: clicul stâng e al modului (nu alege și nu mută piese); spațiul și rotița rămân ale
    // pânzei (mutarea și apropierea vederii).
    const apasa = (e: PointerEvent): void => {
      if (e.target !== panza || e.button !== 0 || spatiu) return;
      e.preventDefault();
      e.stopPropagation();
      const s = acum.current, w = inLume(e), scara = s.vedere.scara;
      const u = urecheLovita(s.contururi, s.locuri, w, PRINDERE_SEMN_PX / scara);
      if (u) {
        panza.setPointerCapture(e.pointerId);
        g = { id: e.pointerId, u, x: e.clientX, y: e.clientY, mutata: false };
        setTras(u);
        return;
      }
      const k = conturLovit(s.contururi, w, PRINDERE_PX / scara);
      if (k) schimba(puneUreche(s.locuri, k, w, s.latime, PRINDERE_PX / scara));
    };
    const misca = (e: PointerEvent): void => {
      if (!g || e.pointerId !== g.id) return;
      e.stopPropagation();
      if (!g.mutata && Math.hypot(e.clientX - g.x, e.clientY - g.y) < TRAGERE_PX) return;
      g.mutata = true;
      const s = acum.current;
      schimba(mutaUreche(s.locuri, g.u.k, g.u.index, inLume(e), s.latime));
    };
    const ridica = (e: PointerEvent): void => {
      if (!g || e.pointerId !== g.id) return;
      e.stopPropagation();
      if (!g.mutata) {
        const l = scoateUreche(acum.current.locuri, g.u.k.nod, g.u.index);
        acum.current.locuri = l;
        setLocuri(l);
        setMotiv(null);
      }
      g = null;
      setTras(null);
    };
    // O tragere anulată (un gest al sistemului, de pildă pe ecranul tactil) nu e un clic: urechea rămâne unde era ajunsă.
    const anuleaza = (e: PointerEvent): void => {
      if (!g || e.pointerId !== g.id) return;
      g = null;
      setTras(null);
    };
    const tasta = (e: KeyboardEvent): void => {
      if (e.key === ' ') spatiu = e.type === 'keydown';
      if (e.type !== 'keydown') return;
      if (e.key === 'Escape') { e.preventDefault(); acum.current.onRenunta(); return; }
      // Enter e „Gata” doar de pe pânză (nu dintr-un câmp sau de pe un buton, care își au Enter-ul lor).
      const tinta = e.target;
      if (e.key !== 'Enter' || tinta instanceof HTMLInputElement || tinta instanceof HTMLTextAreaElement || tinta instanceof HTMLSelectElement
        || tinta instanceof HTMLButtonElement) return;
      e.preventDefault();
      acum.current.onGata(acum.current.locuri);
    };
    cutie.addEventListener('pointerdown', apasa as EventListener, true);
    cutie.addEventListener('pointermove', misca as EventListener, true);
    cutie.addEventListener('pointerup', ridica as EventListener, true);
    cutie.addEventListener('pointercancel', anuleaza as EventListener, true);
    window.addEventListener('keydown', tasta);
    window.addEventListener('keyup', tasta);
    return () => {
      cutie.removeEventListener('pointerdown', apasa as EventListener, true);
      cutie.removeEventListener('pointermove', misca as EventListener, true);
      cutie.removeEventListener('pointerup', ridica as EventListener, true);
      cutie.removeEventListener('pointercancel', anuleaza as EventListener, true);
      window.removeEventListener('keydown', tasta);
      window.removeEventListener('keyup', tasta);
    };
  }, []);

  const mm = (x: number): string => textNumar(Math.round(x * 100) / 100, limba === 'ro');
  const textMotiv = motiv === 'aproape' ? t('export.urechi.mod.aproape', { d: mm(distantaMinima(latime)) })
    : motiv === 'scurt' ? t('export.urechi.mod.scurt', { w: mm(latime), d: mm(distantaMinima(latime)) })
      : motiv === 'plafon' ? t('export.urechi.mod.plafon', { n: PLAFON.urechi })
        : contururi.length === 0 ? t('export.urechi.mod.fara') : '';
  return (
    <div ref={radacina} className="mod-urechi" data-testid="mod-urechi">
      <svg className="rigle-desen urechi-desen" width={marime.latime} height={marime.inaltime} aria-hidden="true">
        {contururi.map((k) => <path key={`${k.instanta}/${k.nod}`} className="urechi-contur" d={drumSvg(k.contur, vedere)} />)}
        <SemneUrechi contururi={contururi} locuri={locuri} vedere={vedere} tras={tras} />
      </svg>
      <div className="banda-urechi insula" role="toolbar" aria-label={t('export.urechi.mod.titlu', { nume })} style={loc ?? undefined}>
        <strong>{t('export.urechi.mod.titlu', { nume })}</strong>
        <span className="nota">{t('export.urechi.mod.ajutor')}</span>
        <span data-testid="urechi-numar">{t('export.urechi.mod.numar', { n: numarLocuri(locuri) })}</span>
        <span className="motiv-urechi" role="status" data-testid="urechi-motiv">{textMotiv}</span>
        <button type="button" data-buton="urechi-renunta" onClick={onRenunta}>{t('export.urechi.mod.renunta')}</button>
        <button type="button" className="principal" data-buton="urechi-gata" onClick={() => { onGata(locuri); }}>{t('export.urechi.mod.gata')}</button>
      </div>
    </div>
  );
}
