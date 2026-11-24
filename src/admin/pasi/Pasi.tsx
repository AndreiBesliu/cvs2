import { useEffect, useMemo, useState, type ReactElement } from 'react';
import type { CatalogActiuni } from '../../../shared/documentatie.ts';
import type { PasEroare } from '../../../shared/pasiEroare.ts';
import { t } from '../../i18n/t.ts';
import { useLimba } from '../../ui/useLimba.ts';
import type { AducatorDocumentatie } from '../documentatie/aducere.ts';
import { textInainte } from '../erori/date.ts';

/**
 * Numele acțiunilor și ale uneltelor, din catalogul generat la build (ca în fila Utilizare), pentru pașii dinaintea unei
 * erori; până vine (sau fără el), pașii arată id-ul.
 */
export function useNumeActiuni(aducator: AducatorDocumentatie | undefined, l: string): ReadonlyMap<string, string> {
  const [catalog, setCatalog] = useState<CatalogActiuni | null>(null);
  useEffect(() => {
    if (!aducator) return undefined;
    let viu = true;
    aducator.actiuni().then((c) => { if (viu) setCatalog(c); }, () => undefined);
    return () => { viu = false; };
  }, [aducator]);
  return useMemo(() => new Map((catalog ? [...catalog.actiuni, ...catalog.unelte] : []).map((a) => [a.id, l === 'en' ? a.en : a.ro])), [catalog, l]);
}

/** Ce e un pas: numele (din catalog, unde îl știm; altfel id-ul), felul și rezultatul, când nu e „ok”. */
export function DescrierePas({ p, nume }: { readonly p: PasEroare; readonly nume: ReadonlyMap<string, string> }): ReactElement {
  return (
    <>
      {(p.fel === 'actiune' || p.fel === 'unealta') && nume.has(p.id) ? <span title={p.id}>{nume.get(p.id)}</span> : <code>{p.id}</code>}
      <span className="admin-slab"> · {t(`admin.erori.pas.${p.fel}`)}</span>
      {p.rez !== undefined && p.rez !== 'ok' ? <> · <code>{p.rez}</code></> : null}
    </>
  );
}

/**
 * Pașii dinaintea unei erori sau a unei raportări (ADR 0262 §4, feliile A.11a–A.11b): cât înainte, ce (cu numele, unde îl
 * știm), felul, rezultatul altul decât „ok”; cel mai vechi primul.
 */
export function PasiDinainte({ pasi, nume, titlu, nota }: {
  readonly pasi: readonly PasEroare[]; readonly nume: ReadonlyMap<string, string>; readonly titlu: string; readonly nota: string;
}): ReactElement {
  const l = useLimba();
  return (
    <details open data-admin="pasi">
      <summary>{titlu} <span className="admin-slab">{nota}</span></summary>
      <ol className="admin-pasi">
        {pasi.map((p, i) => (
          <li key={i} data-pas={p.fel} data-pas-id={p.id}>
            <span className="admin-slab">{textInainte(p.ms, l)}</span>{' '}
            <DescrierePas p={p} nume={nume} />
          </li>
        ))}
      </ol>
    </details>
  );
}
