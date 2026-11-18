import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { collection, doc, getCount, getDoc, getDocs, query, where } from 'firebase/firestore/lite';
import type { Conexiune } from '../../cloud/conexiune.ts';
import { t, traduce } from '../../i18n/t.ts';
import { useLimba } from '../../ui/useLimba.ts';
import { SeIncarca } from '../carcasa/stari.tsx';
import { motivDin, type Masura } from '../erori/date.ts';
import { verificari, type Verificare } from './verificari.ts';

/**
 * Măsurătorile Diagnozei (cifra erorilor nerezolvate, apelul fără App Check, marcajele joburilor, amprenta publicării),
 * judecate de `verificari`. Aceleași pentru filă și pentru punctul din bara laterală (ADR 0260 §1), cu o excepție: sonda
 * funcțiilor (`sondaFunctii`) e o cerere activă spre server, refuzată cu 401 (pe care browserul îl scrie în consolă), deci
 * se face doar în filă, nu la fiecare intrare.
 */
export async function masoaraDiagnoza(con: Conexiune, instanta: string, build: string, rol: string, sondaFunctii = true): Promise<readonly Verificare[]> {
  const nerezolvate: Masura<number> = await getCount(query(collection(con.db, 'errorLogs'), where('rezolvat', '==', false))).then(
    (s) => ({ ok: true as const, valoare: s.data().count }),
    (e: unknown) => ({ ok: false as const, motiv: motivDin(e) }),
  );
  // Fără App Check, la fel ca un străin: trebuie să dea 401. Un 403 de la frontul Google vine fără CORS, deci aici
  // apare ca eroare de rețea (indiciul o spune).
  const functii: Masura<number> | null = !sondaFunctii ? null : await fetch(con.adresaFunctiei('logClientError'), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"data":{}}',
  }).then((r) => ({ ok: true as const, valoare: r.status }), (e: unknown) => ({ ok: false as const, motiv: motivDin(e) }));
  const marcaje = await getDocs(collection(con.db, 'marcaje')).then(
    (s) => ({ ok: true as const, valoare: Object.fromEntries(s.docs.map((x) => [x.id, x.data()])) }),
    (e: unknown) => ({ ok: false as const, motiv: motivDin(e) }),
  );
  // Amprenta publicării (ADR 0044): scrisă de scriptul de publicare; lipsa ei e o stare, nu o eroare.
  const amprenta = await getDoc(doc(con.db, 'meta/deployment')).then(
    (s) => ({ ok: true as const, valoare: s.exists() ? s.data() : null }),
    (e: unknown) => ({ ok: false as const, motiv: motivDin(e) }),
  );
  return verificari({
    instanta, proiect: con.projectId, build, appCheck: con.appCheck, rol, nerezolvate, ...(functii ? { functii } : {}), marcaje, amprenta, acum: Date.now(),
  });
}

/** Fila Diagnoză (ADR 0040 §5): măsoară (cifra erorilor nerezolvate, apelul fără App Check), apoi judecă. */
export function FilaDiagnoza({ con, instanta, build, rol }: {
  readonly con: Conexiune; readonly instanta: string; readonly build: string; readonly rol: string;
}): ReactElement {
  const l = useLimba();
  const [rezultat, setRezultat] = useState<readonly Verificare[] | null>(null);

  const ruleaza = useCallback((): Promise<readonly Verificare[]> => masoaraDiagnoza(con, instanta, build, rol), [con, instanta, build, rol]);

  useEffect(() => {
    let viu = true;
    void ruleaza().then((v) => { if (viu) setRezultat(v); });
    return () => { viu = false; };
  }, [ruleaza]);

  const stare: Record<Verificare['stare'], string> = {
    bine: t('admin.diag.bine'), atentie: t('admin.diag.atentie'), esec: t('admin.diag.esec'), info: t('admin.diag.info'),
  };
  return (
    <div className="admin-diagnoza">
      <div className="admin-randuri">
        <button type="button" disabled={rezultat === null} onClick={() => { setRezultat(null); void ruleaza().then(setRezultat); }}>
          {rezultat === null ? t('admin.diag.se-ruleaza') : t('admin.diag.ruleaza')}
        </button>
      </div>
      {rezultat === null ? <SeIncarca text={t('admin.diag.se-ruleaza')} /> : (
        <ul className="admin-verificari">
          {rezultat.map((v) => (
            <li key={v.id} data-verificare={v.id} data-stare={v.stare}>
              <span className="admin-stare">{stare[v.stare]}</span>
              <strong>{t(v.titlu)}</strong>
              <span>{traduce(l, v.masura.cheie, v.masura.param)}</span>
              {v.indiciu ? <span className="admin-slab">{t(v.indiciu)}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
