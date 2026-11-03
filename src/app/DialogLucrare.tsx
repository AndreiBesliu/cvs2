/**
 * Dialogul primirii unei lucrări (ADR 0126 §C). Se aduce la cerere, când fila a fost deschisă de o aplicație care trimite
 * (ancora `#primeste-lucrare` și `window.opener`) sau când o extensie trimite o lucrare (`masina.trimite`, ADR 0199 §B), cu
 * mesajele panoului mașinii (ADR 0086).
 *
 * Ascultarea ține cererea care așteaptă omul. O lucrare nouă o înlocuiește, iar celei vechi i se răspunde „renuntat”: omul
 * care apasă din nou „Trimite” vrea ultima variantă. Nimic nu pornește singur: după „Primește”, fișierele verificate stau
 * în panoul mașinii, iar încărcarea și pornirea rămân ale omului.
 */
import { useState, type KeyboardEvent, type ReactNode } from 'react';
import '../i18n/masina.ts';
import { mesajeGata } from '../i18n/laCerere.ts';
import { t } from '../i18n/t.ts';
import { useLimba } from '../ui/useLimba.ts';
import { ascultaLucrari, citesteLucrare, primit, verificaLucrare, type FisierLucrare, type Lucrare, type LucrarePrimita, type VerificareLucrare } from './primireLucrare.ts';

/** Mesajele modulului, ca date (ADR 0086): cine îl încarcă le așteaptă (`cuMesaje`). */
export const mesaje = mesajeGata();
mesaje.catch(() => undefined);

/**
 * O lucrare care așteaptă răspunsul omului. `origine`: adresa paginii care a trimis, „null” pentru o pagină deschisă din
 * fișier, sau `extensie:<numele ei>` pentru o extensie instalată.
 */
export type CerereLucrare = { readonly lucrare: Lucrare; readonly origine: string; readonly raspunde: (m: unknown) => void };

/** Originea unei lucrări trimise de o extensie, cu numele ei din manifest. */
export const ORIGINE_EXTENSIE = 'extensie:';

let curenta: CerereLucrare | null = null;

/** Cererea nouă o înlocuiește pe cea care așteaptă, iar celei vechi i se răspunde „renuntat”. */
function inlocuieste(c: CerereLucrare, laCerere: (c: CerereLucrare) => void): void {
  if (curenta) curenta.raspunde(primit(curenta.lucrare.id, null));
  curenta = c;
  laCerere(c);
}

/** Ascultarea lucrărilor, cu înlocuirea: `laCerere` primește fiecare lucrare nouă. Întoarce oprirea. */
export function ascultaPrimirea(w: Window, laCerere: (c: CerereLucrare) => void): () => void {
  return ascultaLucrari(w, (lucrare, origine, raspunde) => { inlocuieste({ lucrare, origine, raspunde }, laCerere); });
}

/**
 * O lucrare trimisă de extensia `nume` (ADR 0199 §B): aceeași formă și aceleași limite ca prin protocol, aceeași înlocuire.
 * Promisiunea dă mesajul `primit` (și „renuntat”); o lucrare fără forma protocolului dă null, fără dialog.
 */
export function cereDeLaExtensie(x: unknown, nume: string, laCerere: (c: CerereLucrare) => void): Promise<unknown> {
  const r = citesteLucrare(x);
  if (!r.ok) return Promise.resolve(null);
  return new Promise((raspunde) => { inlocuieste({ lucrare: r.lucrare, origine: ORIGINE_EXTENSIE + nume, raspunde }, laCerere); });
}

/** De unde vine lucrarea, în limba omului. */
function deUnde(origine: string): string {
  if (origine === 'null') return t('masina.lucrare.origine-fisier');
  if (origine.startsWith(ORIGINE_EXTENSIE)) return t('masina.lucrare.origine-extensie', { nume: origine.slice(ORIGINE_EXTENSIE.length) });
  return origine;
}

/** Răspunde cererii `c`, dacă e încă cea care așteaptă: una înlocuită și-a primit deja „renuntat”. */
function raspundeLa(c: CerereLucrare, r: VerificareLucrare | null): boolean {
  if (curenta !== c) return false;
  curenta = null;
  c.raspunde(primit(c.lucrare.id, r));
  return true;
}

/** Placa, fața, freza și timpul unui fișier, când lucrarea le are. */
function detalii(f: FisierLucrare): string {
  const d = [
    f.placa !== undefined ? t('masina.lucrare.placa', { placa: f.placa }) : null,
    f.fata !== undefined ? t('masina.lucrare.fata', { fata: f.fata }) : null,
    f.scula ?? null,
    f.timp_s !== undefined ? t('masina.lucrare.timp', { m: Math.max(1, Math.round(f.timp_s / 60)) }) : null,
  ].filter((x) => x !== null);
  return d.length > 0 ? ` · ${d.join(' · ')}` : '';
}

export function DialogLucrare({ cerere, onPrimita, onInchide }: {
  readonly cerere: CerereLucrare;
  /** Lucrarea verificată; cel care a trimis și-a primit deja răspunsul. */
  readonly onPrimita: (l: LucrarePrimita) => void;
  readonly onInchide: () => void;
}): ReactNode {
  useLimba();
  const [verific, setVerific] = useState(false);
  const { lucrare: l, origine } = cerere;
  const primeste = async (): Promise<void> => {
    setVerific(true);
    const r = await verificaLucrare(l);
    if (raspundeLa(cerere, r)) onPrimita({ id: l.id, titlu: l.titlu, de_la: l.de_la, origine, ...r });
  };
  const nu = (): void => { if (raspundeLa(cerere, null)) onInchide(); };
  const tasta = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape' || verific) return;
    e.preventDefault();
    nu();
  };
  const aplicatie = l.de_la.versiune ? `${l.de_la.aplicatie} ${l.de_la.versiune}` : l.de_la.aplicatie;
  return (
    <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="lucrare-titlu" data-testid="dialog-lucrare" onKeyDown={tasta}>
      <div className="dialog-cutie">
        <h2 id="lucrare-titlu">{t('masina.lucrare.titlu')}</h2>
        <p data-testid="lucrare-de-la">
          {t('masina.lucrare.de-la', { aplicatie, titlu: l.titlu || '—', origine: deUnde(origine) })}
        </p>
        <p>{t('masina.lucrare.fisiere', { n: l.fisiere.length })}</p>
        <ul className="masina-erori" data-testid="lucrare-fisiere">
          {l.fisiere.map((f) => <li key={f.nume}><strong>{f.nume}</strong>{detalii(f)}</li>)}
        </ul>
        <p>{verific ? t('masina.lucrare.verific') : t('masina.lucrare.intrebare')}</p>
        <div className="butoane">
          <button type="button" data-masina="lucrare-primeste" autoFocus disabled={verific} onClick={() => { void primeste(); }}>
            {t('masina.lucrare.primeste')}
          </button>
          <button type="button" data-masina="lucrare-renunta" disabled={verific} onClick={nu}>{t('masina.lucrare.renunta')}</button>
        </div>
      </div>
    </div>
  );
}
