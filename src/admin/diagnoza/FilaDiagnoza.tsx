import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { collection, getCountFromServer, getDocs, query, where } from 'firebase/firestore';
import type { Conexiune } from '../../cloud/conexiune.ts';
import { t, traduce } from '../../i18n/t.ts';
import { useLimba } from '../../ui/useLimba.ts';
import { motivDin, type Masura } from '../erori/date.ts';
import { verificari, type Verificare } from './verificari.ts';

/** Fila Diagnoză (ADR 0040 §5): măsoară (cifra erorilor nerezolvate, apelul fără App Check), apoi judecă. */
export function FilaDiagnoza({ con, instanta, build, rol }: {
  readonly con: Conexiune; readonly instanta: string; readonly build: string; readonly rol: string;
}): ReactElement {
  const l = useLimba();
  const [rezultat, setRezultat] = useState<readonly Verificare[] | null>(null);

  const ruleaza = useCallback(async (): Promise<readonly Verificare[]> => {
    const nerezolvate: Masura<number> = await getCountFromServer(query(collection(con.db, 'errorLogs'), where('rezolvat', '==', false))).then(
      (s) => ({ ok: true as const, valoare: s.data().count }),
      (e: unknown) => ({ ok: false as const, motiv: motivDin(e) }),
    );
    // Fără App Check, la fel ca un străin: trebuie să dea 401. Un 403 de la frontul Google vine fără CORS, deci aici
    // apare ca eroare de rețea (indiciul o spune).
    const functii: Masura<number> = await fetch(con.adresaFunctiei('logClientError'), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"data":{}}',
    }).then((r) => ({ ok: true as const, valoare: r.status }), (e: unknown) => ({ ok: false as const, motiv: motivDin(e) }));
    const marcaje = await getDocs(collection(con.db, 'marcaje')).then(
      (s) => ({ ok: true as const, valoare: Object.fromEntries(s.docs.map((x) => [x.id, x.data()])) }),
      (e: unknown) => ({ ok: false as const, motiv: motivDin(e) }),
    );
    return verificari({ instanta, proiect: con.projectId, build, appCheck: con.appCheck, rol, nerezolvate, functii, marcaje, acum: Date.now() });
  }, [con, instanta, build, rol]);

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
      {rezultat === null ? <p className="admin-mesaj" aria-busy="true">{t('admin.diag.se-ruleaza')}</p> : (
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
