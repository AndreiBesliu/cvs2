import { useEffect, useId, useRef, useState, type DragEvent, type KeyboardEvent, type ReactElement } from 'react';
import type { StareSugestie } from '../../../shared/sugestii.ts';
import { t } from '../../i18n/t.ts';
import { COLOANE, notaCeruta, tintePentru, type Sugestie, type Tabla } from './date.ts';

/**
 * Tabla Sugestiilor (ADR 0260 §4, schița `Admin-Sugestii`): o coloană pe decizie, Respinsele strânse dedesubt (arătate la
 * cerere), iar cele cu o stare necunoscută separat. Owner-ul trage un card în altă coloană sau alege „Mută în…” din meniul
 * cardului (calea din tastatură); cererea o face fila. Un clic pe titlu deschide detaliul.
 */

export type Muta = (s: Sugestie, spre: StareSugestie, dinMeniu: boolean) => void;

export function TablaSugestii({ tabla, eu, owner, blocat, inDrum, eroareLa, focus, focusGata, deschide, muta }: {
  readonly tabla: Tabla; readonly eu: string; readonly owner: boolean;
  /** O cerere în lucru sau fără App Check: nimic nu se mută. */
  readonly blocat: boolean;
  /** Cardul plecat spre server (stă deja în coloana nouă). */
  readonly inDrum: string | null;
  readonly eroareLa: (id: string) => string | null;
  /** Cardul care primește focusul (după o mutare din tastatură, după detaliu); `focusGata` îl consumă. */
  readonly focus: string | null; readonly focusGata: () => void;
  readonly deschide: (id: string) => void; readonly muta: Muta;
}): ReactElement {
  const [trasa, setTrasa] = useState<Sugestie | null>(null);
  const [peste, setPeste] = useState<StareSugestie | null>(null);
  const [respinse, setRespinse] = useState(false);
  // Un card trimis în Respinse le arată: altfel ar dispărea sub un buton strâns.
  const mutaAici: Muta = (s, spre, dinMeniu) => {
    if (spre === 'respinsa') setRespinse(true);
    muta(s, spre, dinMeniu);
  };
  /** O coloană (sau banda Respinselor) primește un card tras din altă stare. */
  const tinta = (stare: StareSugestie) => ({
    'data-coloana': stare,
    'data-peste': peste === stare ? 'da' : undefined,
    onDragOver: (e: DragEvent) => {
      if (!trasa || trasa.stare === stare) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (peste !== stare) setPeste(stare);
    },
    onDragLeave: (e: DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPeste((x) => (x === stare ? null : x));
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      const s = trasa;
      setTrasa(null);
      setPeste(null);
      if (s && s.stare !== stare) mutaAici(s, stare, false);
    },
  });
  const card = (s: Sugestie): ReactElement => (
    <Card key={s.id} s={s} eu={eu} owner={owner} blocat={blocat} inDrum={inDrum === s.id} trasa={trasa?.id === s.id}
      eroare={eroareLa(s.id)} focus={focus === s.id} focusGata={focusGata} deschide={deschide} muta={mutaAici} trage={setTrasa} />
  );
  const { coloane, necunoscute } = tabla;
  const nRespinse = coloane.respinsa.length;
  return (
    <>
      <div className="sug-tabla" data-sug="tabla">
        {COLOANE.map((st) => (
          <section key={st} className="sug-coloana" aria-labelledby={`sug-col-${st}`} {...tinta(st)}>
            <h3 id={`sug-col-${st}`}>
              <span className="sug-cap" data-stare={st}>{t(`admin.sug.stare.${st}`)}</span>
              <span className="admin-slab" data-sug="numar">{coloane[st].length}</span>
            </h3>
            <ul className="sug-carduri">{coloane[st].map(card)}</ul>
          </section>
        ))}
      </div>
      <section className="sug-banda" aria-labelledby="sug-col-respinsa" {...tinta('respinsa')}>
        <h3 id="sug-col-respinsa">
          <button type="button" aria-expanded={respinse && nRespinse > 0} disabled={nRespinse === 0} data-sug="respinse" onClick={() => { setRespinse((x) => !x); }}>
            {t('admin.sug.respinse', { n: nRespinse })}
          </button>
        </h3>
        {respinse && nRespinse > 0 ? <ul className="sug-carduri sug-carduri-rand">{coloane.respinsa.map(card)}</ul> : null}
      </section>
      {necunoscute.length > 0 ? (
        <section className="sug-banda" aria-labelledby="sug-col-necunoscuta" data-sug="necunoscute">
          <h3 id="sug-col-necunoscuta">{t('admin.sug.filtru', { nume: t('admin.sug.stare.necunoscuta'), n: necunoscute.length })}</h3>
          <ul className="sug-carduri sug-carduri-rand">{necunoscute.map(card)}</ul>
        </section>
      ) : null}
    </>
  );
}

function Card({ s, eu, owner, blocat, inDrum, trasa, eroare, focus, focusGata, deschide, muta, trage }: {
  readonly s: Sugestie; readonly eu: string; readonly owner: boolean; readonly blocat: boolean; readonly inDrum: boolean;
  readonly trasa: boolean; readonly eroare: string | null; readonly focus: boolean; readonly focusGata: () => void;
  readonly deschide: (id: string) => void; readonly muta: Muta; readonly trage: (s: Sugestie | null) => void;
}): ReactElement {
  const titlu = useId();
  const buton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!focus) return;
    buton.current?.focus();
    focusGata();
  }, [focus, focusGata]);
  const mutabil = owner && s.versiune !== null;
  const tras = mutabil && !blocat;
  const cine = s.autor === eu ? t('admin.pers.tu') : s.autorEmail ?? s.autor ?? '—';
  return (
    <li className="sug-card" data-sugestie={s.titlu} data-stare={s.stare ?? 'necunoscuta'} draggable={tras ? true : undefined}
      data-trasa={trasa ? 'da' : undefined} aria-busy={inDrum ? true : undefined}
      onDragStart={tras ? (e) => { e.dataTransfer.setData('text/plain', s.id); e.dataTransfer.effectAllowed = 'move'; trage(s); } : undefined}
      onDragEnd={tras ? () => { trage(null); } : undefined}>
      <div className="sug-card-sus">
        <button ref={buton} id={titlu} type="button" className="sug-card-titlu" data-sug="deschide" onClick={() => { deschide(s.id); }}>{s.titlu}</button>
        {mutabil ? <MeniuMuta s={s} blocat={blocat} descris={titlu} muta={muta} /> : null}
      </div>
      <div className="sug-card-jos">
        <span className="admin-cip">{s.tip ? t(`admin.sug.tip.${s.tip}`) : '?'}</span>
        <span className="sug-card-cine">{cine}</span>
      </div>
      {eroare ? <p className="admin-eroare" role="alert" data-sug="eroare">{t('admin.sug.esec', { motiv: eroare })}</p> : null}
    </li>
  );
}

/**
 * „Mută în…”: calea din tastatură a tragerii (ADR 0260 §4), un buton „⋯” discret în colțul cardului (cu numele „Mută în…”);
 * săgețile, Home și End umblă prin rânduri, Esc închide.
 */
function MeniuMuta({ s, blocat, descris, muta }: {
  readonly s: Sugestie; readonly blocat: boolean; readonly descris: string; readonly muta: Muta;
}): ReactElement {
  const [deschis, setDeschis] = useState(false);
  const loc = useRef<HTMLDivElement>(null);
  const buton = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!deschis) return undefined;
    loc.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    const afara = (e: PointerEvent): void => { if (!loc.current?.contains(e.target as Node)) setDeschis(false); };
    document.addEventListener('pointerdown', afara);
    return () => { document.removeEventListener('pointerdown', afara); };
  }, [deschis]);
  const tasta = (e: KeyboardEvent<HTMLDivElement>): void => {
    const r = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')];
    const n = r.length;
    const i = r.indexOf(document.activeElement as HTMLButtonElement);
    const la = e.key === 'ArrowDown' ? (i + 1) % n : e.key === 'ArrowUp' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
    if (la >= 0) {
      e.preventDefault();
      r[la]?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setDeschis(false);
      buton.current?.focus();
    } else if (e.key === 'Tab') {
      setDeschis(false);
    }
  };
  return (
    <div className="sug-muta" ref={loc}>
      <button ref={buton} id={id} type="button" disabled={blocat} aria-haspopup="menu" aria-expanded={deschis} aria-label={t('admin.sug.muta')}
        aria-describedby={descris} title={t('admin.sug.muta')} data-sug="muta" onClick={() => { setDeschis((x) => !x); }}>
        <span aria-hidden="true">⋯</span>
      </button>
      {deschis ? (
        <div role="menu" className="admin-meniu" aria-labelledby={id} onKeyDown={tasta}>
          {tintePentru(s).map((x) => (
            <button key={x} type="button" role="menuitem" data-muta-in={x} onClick={() => { setDeschis(false); muta(s, x, true); }}>
              {t(`admin.sug.stare.${x}`)}{notaCeruta(x) ? '…' : ''}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
