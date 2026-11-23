# Notele liniilor

Fiecare linie a proiectului își ține aici nota: ce face, starea feliei, deciziile owner-ului, capcanele găsite, ce
rămâne. Notele au fost aduse pe 23.11.2026 din memoria sesiunii principale locale, la mutarea lucrului în cloud
([docs/lucru-in-cloud.md](../lucru-in-cloud.md)), ca orice sesiune cloud să le găsească.

- **Cine le ține la zi:** linia, pe ramura ei, odată cu feliile (nota intră în `main` la unire, cu felia). Sesiunea
  principală ține [principala.md](principala.md), indexul de mai jos și rândurile de stare din `CLAUDE.md`.
- **Ce intră:** doar ce e al proiectului. Repo-ul e public: niciun secret, nimic despre găurile aplicației vechi încă live,
  nimic despre alte proiecte ale owner-ului.
- **Căile `C:\Users\besli\cncvs2-lucru\…`** din note sunt ale worktree-urilor locale de dinainte de cloud: istorie.
- **Lecțiile comune** (probe, porți, mutații, Firestore, capcanele uneltelor): [lectii.md](lectii.md).

## Liniile

| Linia | Nota | Ramura | Starea pe 23.11 |
|---|---|---|---|
| Sesiunea principală | [principala.md](principala.md) | `unire-<data>` | în cloud din 23.11; unește și publică (prima unire din cloud: 3.Tq, `0ae9c6c1`) |
| Elicele (Easy 3Draw, 3.Tq–3.Ts, ADR 0282) | [elice.md](elice.md) | `wip/3.Tq-elice` | 3.Tq unită în `main` (`0ae9c6c1`, 18.19.0); 3.Tr, 3.Ts la cuvântul owner-ului |
| Adminul (ADR 0260) | [admin.md](admin.md) | `wip/A.1-admin` | A.4 (Sugestii ca tablă) în lucru, în sesiunea cloud a liniei |
| Incrustațiile (12.1↑) | [incrustatii.md](incrustatii.md) | `wip/12.1-incrustatii` | 12.1↑e-3 (pereții drepți) în lucru, în sesiunea cloud a liniei |
| Planșele (etapa 11) | [plansele.md](plansele.md) | `wip/11.1-plansele` | 11.3↑e în lucru, în sesiunea cloud a liniei |
| Trasarea din imagine (25.x↑, ADR 0272) | [trasare.md](trasare.md) | `wip/25.1-trasare` | 25.8↑a în lucru, în sesiunea cloud a liniei |
| Biblioteca extensiilor, interfața nouă (3.Xh, ADR 0231–0239) | [biblioteca.md](biblioteca.md) | `wip/3.Xh-biblioteca-ui` | pornită pe 23.11, la cuvântul owner-ului; întâi ADR 0231 propus și schița; brief-ul, lipit de owner într-o sesiune cloud nouă |
| Tăierea și conversia (10.3↑, ADR 0182) | [taiere.md](taiere.md) | `wip/10.3o-legare` | 10.3↑o unită; urmează 10.3↑p–r |
| Imprimanta 3D (K1C, 3.6x, ADR 0195) | [imprimanta.md](imprimanta.md) | `wip/3.6g-imprimanta` | 3.6v unită; 3.6w (camera) la cuvântul owner-ului; proba pe aparat, la owner |
| Aranjamentele (ADR 0250, 0251) | [aranjamente.md](aranjamente.md) | `wip/28.1-aranjamente` | 28.1↑a–d unite; următoarea, la cuvântul owner-ului |

## Pluginul Easy 3Draw (Trenuleț)

| Nota | Ce ține |
|---|---|
| [trenulet.md](trenulet.md) | pluginul ca extensie, id-ul `trenulet`, înălțimile LEGO |
| [rotite.md](rotite.md) | rotițele dințate (3.Th, ADR 0169) |
| [roti-senile.md](roti-senile.md) | roțile, fuliile, conicele, șenila (3.Tj–3.To), galeria pe file (3.Tp, ADR 0281) |
| [biblioteca.md](biblioteca.md) | biblioteca extensiilor (3.Xg): versiunea și amprenta la fiecare schimbare |
| [elice.md](elice.md) | elicele (3.Tq–3.Ts, ADR 0282) |

## Încheiate și de referință

| Nota | Ce ține |
|---|---|
| [ancore.md](ancore.md) | ancora și tastele (6.V↑), încheiată |
| [raportari.md](raportari.md) | raportările (15.B↑b), încheiată |
| [tutorial.md](tutorial.md) | tutorialul userilor, snapshot-ul, tastele, roadmap-ul (codul probei din aplicație NU se șterge) |
| [test-owner-dupa-desen.md](test-owner-dupa-desen.md) | testul owner-ului după desen |
| [module-conectare.md](module-conectare.md) | conectarea ca module (după propunerile de acum: multe mașini, pluginuri per client) |
| [unelte-worktree.md](unelte-worktree.md) | uneltele worktree-urilor locale, de dinainte de cloud: porturi, joncțiuni, emulatoare |
