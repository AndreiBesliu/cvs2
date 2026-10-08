import { t } from '../i18n/t.ts';

/**
 * Lista de vectori (owner-ul, la încercarea prototipului de planșe, `BRIEF.md` §16.3): ce stă pe foaie, în ordinea foii.
 * O formă cu avertisment apare cu roșu, iar avertismentul e în titlul ei; pe pânză nu apare niciodată. Cât timp nivelul doi
 * e ascuns (ADR 0024), un rând e o instanță, adică forma pusă pe foaie. Lista primește doar date gata scrise: alegerea
 * pleacă înapoi prin registrul de acțiuni.
 */
export type RandLista = {
  readonly id: string;
  readonly descriere: string;
  readonly avertisment: string | null;
  readonly selectat: boolean;
};

type Props = {
  readonly randuri: readonly RandLista[];
  readonly onAlege: (id: string) => void;
};

export function ListaVectori({ randuri, onAlege }: Props) {
  return (
    <aside className="lista-vectori" aria-label={t('lista.titlu')} data-testid="lista-vectori">
      <h2>{t('lista.titlu')}</h2>
      {randuri.length === 0 ? (
        <p className="lista-goala">{t('lista.goala')}</p>
      ) : (
        <ul>
          {randuri.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                data-instanta={r.id}
                aria-pressed={r.selectat}
                className={r.avertisment ? 'cu-avertisment' : undefined}
                title={r.avertisment ?? undefined}
                onClick={() => { onAlege(r.id); }}
              >
                {r.descriere}
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
