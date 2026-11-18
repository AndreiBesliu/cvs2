import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { CUTIE_GOALA, uneste, type Cutie } from '../geom/cutie.ts';
import { t, type CheieSimpla } from '../i18n/t.ts';
import { distantaMinima } from '../model/asezare.ts';
import type { Document } from '../model/document.ts';
import { cutieElement } from '../model/forme.ts';
import { grilaPanouri, type GrilaPanouri } from '../model/grilaPanouri.ts';
import { elementeFoaie } from '../model/lume.ts';
import type { CererePanouri } from '../model/panouri.ts';
import { celMaiMarePanou, incapePeFoaie, iesirePesteLinie, locPeFoaie, marimeImplicita } from '../model/panouriPeFoaie.ts';
import type { RezultatActiune } from '../ui/actiuni.ts';
import type { TaiereCalculata } from '../ui/actiuniDocument.ts';
import { citesteNumar, textNumar } from '../ui/numar.ts';
import { useLimba } from '../ui/useLimba.ts';
import { optiuniTinute } from './asezareTinuta.ts';
import { imbinareDin, intreDin, useOptiuniTaiere } from './optiuniTaiere.ts';

/** Grila de arătat pe pânză (ADR 0181 §7): liniile ei, în cutia formelor. */
export type GrilaTaiere = { readonly axa: 'grila'; readonly cutie: Cutie; readonly xs: readonly number[]; readonly ys: readonly number[] };
type Stare = { readonly fel: 'calcul' } | { readonly fel: 'gata'; readonly text: string; readonly rau: boolean };
/** Un număr rotunjit la 0,001 mm, cu virgulă în română. */
const mm = (x: number, virgula: boolean): string => textNumar(Math.round(x * 1000) / 1000, virgula);

/**
 * Blocul „Taie în panouri” al panoului Taie (ADR 0181 §7, feliile 10.3↑k și 10.3↑l): mărimea panoului cu panourile egale sau
 * din colț, ori numărul lor pe lățime și pe înălțime; formele alese, sau, fără alegere, toate ale foii; închiderea, spațiul și
 * îmbinarea sunt opțiunile tăierii de deasupra. Cât lucrezi în bloc, pânza arată grila (`onActiv`, apoi `onGrila`), iar sub
 * câmpuri, câte panouri ies. Calculul e al workerului CAM, pe documentul din clipa clicului; tăierea și gruparea panourilor se
 * aplică prin acțiunea `document.taie`, într-un pas de anulare.
 *
 * **Pe foi (10.3↑l):** mărimea implicită e cât încape un panou pe foaie la „Așază pe foi” (foaia fără marginile ținute ale
 * așezării, fiecare cel puțin raza frezei exterioare, și fără dinții, spațiul sau suprapunerea de pe ambele laturi;
 * `panouriPeFoaie.ts`) și urmează opțiunile până scrii o mărime; butonul „Cât încape” o pune la loc. Un panou al grilei care
 * n-ar încăpea (cu dinții; cum e sau, cu rotirea ținută a așezării, culcat) e spus înaintea tăierii. „Așază pe foi…” deschide
 * dialogul pentru alegerea de acum: după tăiere, panourile.
 */
export function PanouriTaiere({ doc, indexFoaie = 0, selectie, activ, onActiv, onGrila, onTaie, onAseaza }: {
  readonly doc: Document;
  /** Foaia de lucru (planșele, etapa 11): formele, cutia și materialul ei. */
  readonly indexFoaie?: number;
  readonly selectie: readonly string[];
  /** Grila e cea arătată pe pânză (nu linia de deasupra). */
  readonly activ: boolean;
  readonly onActiv: () => void;
  readonly onGrila: (l: GrilaTaiere | null) => void;
  readonly onTaie: (t: TaiereCalculata) => RezultatActiune;
  /** Deschide „Așază pe foi” pe alegerea de acum (lipsă: fără buton). */
  readonly onAseaza?: () => void;
}): ReactElement {
  const virgula = useLimba() === 'ro';
  const foaie = doc.foi[indexFoaie];
  const stoc = foaie?.stoc;
  const [fel, setFel] = useState<'marime' | 'numar'>('marime');
  // Mărimea scrisă de om; null: cea implicită (cât încape pe foaie), care urmează opțiunile.
  const [textL, setTextL] = useState<string | null>(null);
  const [textI, setTextI] = useState<string | null>(null);
  const [textC, setTextC] = useState('2');
  const [textR, setTextR] = useState('1');
  const [colt, setColt] = useState(false);
  const [stare, setStare] = useState<Stare | null>(null);
  const semnal = useRef<AbortController | null>(null);
  useEffect(() => () => { semnal.current?.abort(); }, []);
  const optiuni = useOptiuniTaiere();

  // Formele de tăiat: cele alese (aplicația dă doar alegerea care mai e pe foaie, `selectieValida`); fără alegere, toate ale foii.
  // Cutia lor, exactă, e cea a grilei.
  const alese = useMemo(() => (selectie.length > 0 ? selectie : (doc.foi[indexFoaie]?.instante ?? []).map((i) => i.id)), [doc, selectie, indexFoaie]);
  const cutie = useMemo(() => {
    const ids = new Set(alese);
    let k = CUTIE_GOALA;
    for (const e of elementeFoaie(doc, indexFoaie)) {
      if (!ids.has(e.instanta)) continue;
      try {
        k = uneste(k, cutieElement(e));
      } catch {
        // O formă care nu se poate citi: tăierea o refuză, cu motivul ei.
      }
    }
    return k;
  }, [doc, alese, indexFoaie]);
  // Locul unui panou pe foaie, la „Așază pe foi” (marginile ținute, cel puțin raza frezei exterioare a formelor de tăiat), cât
  // iese o bucată peste linie (dinții, spațiul, suprapunerea) și mărimea implicită; fără loc, materialul foii.
  const tinute = optiuniTinute();
  const freza = useMemo(() => (foaie ? distantaMinima(doc, alese, foaie.id) : 0), [doc, alese, foaie]);
  const loc = stoc ? locPeFoaie(stoc, tinute, freza) : null;
  const iesire = iesirePesteLinie(imbinareDin(optiuni, true), intreDin(optiuni));
  const implicita = (loc ? marimeImplicita(loc, iesire) : null) ?? stoc ?? null;
  const valL = textL ?? (implicita ? mm(implicita.latime, virgula) : '');
  const valI = textI ?? (implicita ? mm(implicita.inaltime, virgula) : '');
  const L = citesteNumar(valL), I = citesteNumar(valI), C = citesteNumar(textC), R = citesteNumar(textR);
  const g: GrilaPanouri | null = fel === 'marime' ? (L === null || I === null ? null : { fel, latime: L, inaltime: I, colt })
    : C === null || R === null ? null : { fel, coloane: C, randuri: R };
  const goala = !(cutie.minX <= cutie.maxX);
  const grila = g && !goala ? grilaPanouri(cutie, g) : null;
  const xs = typeof grila === 'object' && grila ? grila.xs : null, ys = typeof grila === 'object' && grila ? grila.ys : [];
  const c = xs ? xs.length + 1 : 0, r = ys.length + 1;
  const motiv = goala ? t('editare.taiere.motiv.nimic-ales')
    : grila === 'panouri' ? t('editare.taiere.motiv.panouri')
      : !xs ? t('editare.taiere.panouri.valoare')
        : c * r === 1 ? t('editare.taiere.panouri.unul') : null;
  // Cel mai mare panou al grilei, cu ce iese peste linii: dacă n-ar încăpea pe foaie la „Așază pe foi”, blocul o spune.
  const mare = xs && loc ? celMaiMarePanou(cutie, xs, ys, iesire) : null;
  const iese = mare && loc && !incapePeFoaie(mare, loc, tinute.rotirea === '90') ? { mare, loc } : null;
  // Grila de pe pânză urmează liniile (cheia lor), cât blocul e cel activ.
  const cheie = xs ? `${cutie.minX},${cutie.minY},${cutie.maxX},${cutie.maxY}|${xs.join(',')}|${ys.join(',')}` : '';
  useEffect(() => { if (activ) onGrila(xs ? { axa: 'grila', cutie, xs, ys } : null); }, [activ, cheie]);

  const taie = (): void => {
    if (motiv !== null || !g || stare?.fel === 'calcul') return;
    const laCerere = doc;
    const s = new AbortController();
    semnal.current?.abort();
    semnal.current = s;
    setStare({ fel: 'calcul' });
    const intre = intreDin(optiuni), imbinare = imbinareDin(optiuni, true);
    const cerere: CererePanouri = {
      alese: [...alese], grila: g, inchide: optiuni.inchide, nume: t('editare.taiere.panouri.nume'), ...(intre ? { intre } : {}), ...(imbinare ? { imbinare } : {}),
    };
    const cade = (e: unknown): void => {
      if (s.signal.aborted) return;
      reportError(new Error(`tăierea în panouri: ${e instanceof Error ? e.message : String(e)}`));
      setStare({ fel: 'gata', text: t('editare.taiere.eroare'), rau: true });
    };
    import('../ui/actiuniExportCalcul.ts').then((calc) => {
      if (s.signal.aborted) return;
      calc.taiePanourile(laCerere, cerere, s.signal, indexFoaie, () => { if (!s.signal.aborted) setStare({ fel: 'gata', text: t('editare.surori.astept'), rau: false }); }).then((rez) => {
        if (s.signal.aborted) return;
        if (!rez.ok) {
          const m = rez.motiv === 'valoare' ? 'editare.taiere.panouri.valoare' : rez.motiv === 'nimic-taiat' ? 'editare.taiere.panouri.unul' : (`editare.taiere.motiv.${rez.motiv}` as const);
          setStare({ fel: 'gata', text: t(m), rau: true });
          return;
        }
        const v = onTaie({
          doc: laCerere, degrupate: rez.degrupate, ids: rez.ids, sterse: rez.sterse, ...(rez.grupuri ? { grupuri: rez.grupuri } : {}), ...(rez.surori ? { surori: rez.surori } : {}),
        });
        const text = t('editare.taiere.panouri.gata', { p: String(rez.panouri ?? rez.ids.length), nume: cerere.nume, n: String(rez.forme) })
          + (rez.scoase > 0 ? ` ${t('editare.taiere.panouri.scoase', { s: String(rez.scoase) })}` : '');
        setStare(v.ok ? { fel: 'gata', text, rau: false } : { fel: 'gata', text: t(v.motiv), rau: true });
      }, (e: unknown) => { if (!(e instanceof calc.CalculAnulat)) cade(e); });
    }, cade);
  };

  const camp = (valoare: string, cheie: string, eticheta: CheieSimpla, scrie: (v: string) => void, f: 'marime' | 'numar'): ReactElement => (
    <input className="camp-taiere" value={valoare} inputMode={f === 'marime' ? 'decimal' : 'numeric'} data-taiere={cheie} aria-label={t(eticheta)}
      onFocus={() => { setFel(f); }} onChange={(e) => { scrie(e.target.value); }} />
  );
  return (
    <fieldset className="campuri-taiere" data-taiere="panouri" onFocus={onActiv} onPointerDown={onActiv}>
      <legend>{t('editare.taiere.panouri')}</legend>
      <p className="stare-taiere">{t('editare.taiere.panouri.text')}</p>
      <label className="rand-taiere">
        <input type="radio" name="panouri-fel" checked={fel === 'marime'} data-taiere="panouri-marime" onChange={() => { setFel('marime'); }} />
        <span className="rand-taiere-lung">{t('editare.taiere.panouri.marime')}</span>
      </label>
      <div className="campuri-unghi">
        {camp(valL, 'panouri-latime', 'editare.taiere.panouri.latime', setTextL, 'marime')}
        <span>×</span>
        {camp(valI, 'panouri-inaltime', 'editare.taiere.panouri.inaltime', setTextI, 'marime')}
        <span>mm</span>
      </div>
      {textL === null && textI === null ? (
        <p className="stare-taiere" data-testid="panouri-implicit">{t('editare.taiere.panouri.implicit')}</p>
      ) : implicita ? (
        <div className="butoane-retea">
          <button type="button" data-taiere="panouri-implicit" title={t('editare.taiere.panouri.implicit')}
            onClick={() => { setTextL(null); setTextI(null); setFel('marime'); }}>
            {t('editare.taiere.panouri.implicit.pune', { l: mm(implicita.latime, virgula), i: mm(implicita.inaltime, virgula) })}
          </button>
        </div>
      ) : null}
      <div className="rand-optiuni-taiere panouri-colt" role="radiogroup" aria-label={t('editare.taiere.panouri.fel')}>
        <span>{t('editare.taiere.panouri.fel')}</span>
        {([false, true] as const).map((x) => (
          <label key={String(x)} title={t(x ? 'editare.taiere.panouri.colt.titlu' : 'editare.taiere.panouri.egale.titlu')}>
            <input type="radio" name="panouri-colt" checked={colt === x} disabled={fel !== 'marime'} data-taiere={x ? 'panouri-colt' : 'panouri-egale'}
              onChange={() => { setColt(x); }} />
            {t(x ? 'editare.taiere.panouri.colt' : 'editare.taiere.panouri.egale')}
          </label>
        ))}
      </div>
      <label className="rand-taiere">
        <input type="radio" name="panouri-fel" checked={fel === 'numar'} data-taiere="panouri-numar" onChange={() => { setFel('numar'); }} />
        <span className="rand-taiere-lung">{t('editare.taiere.panouri.numar')}</span>
      </label>
      <div className="campuri-unghi">
        {camp(textC, 'panouri-coloane', 'editare.taiere.panouri.coloane', setTextC, 'numar')}
        <span>×</span>
        {camp(textR, 'panouri-randuri', 'editare.taiere.panouri.randuri', setTextR, 'numar')}
      </div>
      {motiv ? <p className="motiv-retea" role="status" data-testid="panouri-motiv">{motiv}</p> : (
        <p className="stare-taiere" data-testid="panouri-grila">
          {t(selectie.length > 0 ? 'editare.taiere.panouri.alese' : 'editare.taiere.panouri.toate', {
            n: String(alese.length), c: String(c), r: String(r), l: mm(cutie.maxX - cutie.minX, virgula), i: mm(cutie.maxY - cutie.minY, virgula),
          })}
        </p>
      )}
      {!motiv && iese ? (
        <p className="motiv-retea" role="status" data-testid="panouri-iese">
          {t('editare.taiere.panouri.iese', {
            l: mm(iese.mare.latime, virgula), i: mm(iese.mare.inaltime, virgula), L: mm(iese.loc.latime, virgula), I: mm(iese.loc.inaltime, virgula),
          })}
        </p>
      ) : null}
      <div className="butoane-retea">
        <button type="button" data-taiere="panouri-taie" disabled={motiv !== null || stare?.fel === 'calcul'} onClick={taie}>{t('editare.taiere.panouri.taie')}</button>
        {onAseaza ? (
          <button type="button" data-taiere="panouri-aseaza" title={t('editare.taiere.panouri.aseaza.titlu')}
            disabled={(foaie?.instante.length ?? 0) === 0 || stare?.fel === 'calcul'} onClick={onAseaza}>
            {t('editare.taiere.panouri.aseaza')}
          </button>
        ) : null}
      </div>
      {stare ? (
        <p className={stare.fel === 'gata' && stare.rau ? 'motiv-retea' : 'stare-taiere'} role="status" data-testid="panouri-stare">
          {stare.fel === 'calcul' ? t('editare.taiere.calcul') : stare.text}
        </p>
      ) : null}
    </fieldset>
  );
}
