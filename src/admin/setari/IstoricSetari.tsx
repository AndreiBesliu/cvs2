import { useEffect, useState, type ReactElement } from 'react';
import { collection, getDocs, limit, query, where } from 'firebase/firestore/lite';
import type { Conexiune } from '../../cloud/conexiune.ts';
import { t } from '../../i18n/t.ts';
import { motivDin, ziScurta, type Masura } from '../erori/date.ts';
import { istoricSetari, type PasSetari, type Schimbare } from './istoric.ts';

/** Câte rânduri de audit se citesc pentru o setare (ordinea se face aici: egalitatea pe `tinta` merge pe indexul simplu). */
const PLAFON_ISTORIC = 100;

function textSchimbare(s: Schimbare): string {
  switch (s.fel) {
    case 'offline':
    case 'tichete': return t(`admin.set.ist.${s.fel}`, { inainte: s.inainte, dupa: s.dupa });
    case 'adaugat':
    case 'scos':
    case 'schimbat': return t(`admin.set.ist.${s.fel}`, { eticheta: s.eticheta });
    default: return t(`admin.set.ist.${s.fel}`);
  }
}

/**
 * Istoricul unei setări (ADR 0260 §9, felia A.6), sub butonul ei: rândurile de audit cu `tinta` egală cu documentul setării,
 * cea mai nouă întâi, cu ziua, cine și ce s-a schimbat. Se citește din nou odată cu setarea (`rev`, după o salvare). Cere
 * „Audit: citește”: fila Setări e doar a owner-ului, care o are.
 */
export function IstoricSetari({ con, eu, tinta, rev, limba, nume }: {
  readonly con: Conexiune; readonly eu: string; readonly tinta: string; readonly rev: number; readonly limba: string; readonly nume: string;
}): ReactElement {
  const [pasi, setPasi] = useState<Masura<readonly PasSetari[]> | null>(null);
  useEffect(() => {
    let viu = true;
    getDocs(query(collection(con.db, 'audit'), where('tinta', '==', tinta), limit(PLAFON_ISTORIC))).then(
      (s) => { if (viu) setPasi({ ok: true, valoare: istoricSetari(s.docs.map((d) => ({ id: d.id, d: d.data() })), eu) }); },
      (e: unknown) => { if (viu) setPasi({ ok: false, motiv: motivDin(e) }); },
    );
    return () => { viu = false; };
  }, [con, eu, tinta, rev]);
  return (
    <div className="set-istoric" data-set-istoric={nume}>
      <h3 id={`set-ist-${nume}`}>{t('admin.set.ist')}</h3>
      {pasi === null ? <p className="admin-slab" aria-busy="true">…</p>
        : !pasi.ok ? <p className="admin-eroare" role="alert" data-ist="eroare">{t('admin.set.ist.citire', { motiv: pasi.motiv })}</p>
          : pasi.valoare.length === 0 ? <p className="admin-slab" data-ist="gol">{t('admin.set.ist.gol')}</p>
            : (
              // Lista are derulare proprie (cel mult 14rem), deci primește focusul, ca s-o derulezi din tastatură.
              <ol className="util-istoric" data-ist="lista" tabIndex={0} aria-labelledby={`set-ist-${nume}`}>
                {pasi.valoare.map((p) => (
                  <li key={p.id} data-pas={p.id}>
                    <span className="admin-slab">{ziScurta(p.cand, limba)} · {t(`admin.azi.cine.${p.cine}`)}</span>
                    {' · '}{p.schimbari.map(textSchimbare).join('; ')}
                  </li>
                ))}
              </ol>
            )}
    </div>
  );
}
