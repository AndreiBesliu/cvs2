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
| Sesiunea principală | [principala.md](principala.md) | `unire-<data>` | în cloud din 23.11; unește și publică (pe 23.11, șase loturi: `0ae9c6c1`, `ddaa7ead`, `1b46c955`, `4497d639`, `03460cab`, `4fe2d2ad`; pe 24.11: `813fa675`, `80d3eb70`, `95dddbe0`, `7f6f4069`, `f7f4510f`, `32b33a42`, `458befb9`) |
| Elicele (Easy 3Draw, 3.Tq–3.Ts, ADR 0282) | [elice.md](elice.md) | `wip/3.Tq-elice` | 3.Tq unită în `main` (`0ae9c6c1`, 18.19.0); reparația probelor atelierului și 3.Tr (elicea de barcă, 18.20.0), unite în `main` (`d262e57a`); 3.Ts (ventilatorul cu carcasă, 18.22.0), pornită de owner pe 24.11, unită în `main` (`e14e553a`); 3.Tt (înclinarea spre pupa a elicei de barcă, la alegere, 18.23.0), unită în `main` (`d57ca962`, `AndreiBesliu/cvs2#19`); următoarea, la cuvântul owner-ului |
| Adminul (ADR 0260) | [admin.md](admin.md) | `wip/A.1-admin` | A.4, A.5 și A.6 unite în `main`; A.8a și A.8b (utilizarea aplicației, ADR 0262; cu serverul) unite în `main` (`5325b8fe`) și publicate pe test; A.8c și A.8d (clicurile fine, dialogurile, calculele, mașina, imprimanta) unite în `main` (`80d3eb70`); A.9a și A.9b (sumele zilei, jobul de noapte, fila Utilizare; cu serverul) unite în `main` (`95dddbe0`); A.10 și A.11a (fluxurile; pașii dinaintea unei erori; cu serverul) unite în `main` (`7f6f4069`); A.11b–A.11e (pașii la raportare, cronologia unui om, sesiunea raportării, disocierea; cu serverul) unite în `main` (`8ccb66e8`): A.11 încheiată; A.7 (adminul pe telefon) unită în `main` (`458befb9`): linia e încheiată (A.1–A.11), o felie nouă pornește la cuvântul owner-ului; verificarea juridică (GDPR) înaintea live-ului, la owner |
| Incrustațiile (12.1↑) | [incrustatii.md](incrustatii.md) | `wip/12.1-incrustatii` | 12.1↑e-3 și 12.1↑e-4 („Împreună (secțiunea)” pe pereții drepți și pe trepte) unite în `main` (`03460cab`); următoarea, la cuvântul owner-ului |
| Planșele (etapa 11) | [plansele.md](plansele.md) | `wip/11.1-plansele` | 11.3↑f (urechile după reguli) unită în `main` (`f4601938`): ADR 0211 are toate cele trei variante; nicio felie în lucru; tăierea plăcii 11, la owner; 11.5↑b după etapa 13 |
| Trasarea din imagine (25.x↑, ADR 0272) | [trasare.md](trasare.md) | `wip/25.1-trasare` | 25.8↑a unită în `main` (`473f2e20`); 25.9↑ (fereastra trasării, refăcută, ADR 0273) unită în `main` (`4fe2d2ad`); 25.8↑b („Calibrează” și „Trasează…” din imaginea de pe foaie), pornită de owner pe 24.11, unită în `main` (`f7f4510f`) și publicată pe test; sesiunea liniei, arhivată de owner pe 24.11 („ok, unim cu main si arhivam acest chat”); o felie nouă pornește într-o sesiune nouă, cu un brief (următorul ADR al liniei: 0274) |
| Biblioteca extensiilor, interfața nouă (3.Xh, ADR 0231–0239) | [biblioteca.md](biblioteca.md) | `wip/3.Xh-biblioteca-ui` | 3.Xh (ADR 0231) unită în `main` (`2d1e482c`, Easy 3Draw 18.21.0); rămase, la cuvântul owner-ului: căutarea și categoriile, captura mărită, „ce e nou” la actualizare; **3.Xi (ADR 0232, acceptat cu 1a–5a) unită în `main` pe 24.11** (`f12308de`, `AndreiBesliu/cvs2#17`): stările rupte, claritatea, descoperirea; pachetele nu s-au schimbat (Easy 3Draw e 18.22.0, din 3.Ts; rândurile lui de „ce e nou” au primit `data`); **3.Xj (căutarea și categoriile în fereastra bibliotecii, ADR 0233; la „ok, porneste cautarea si categoriile”, cu alegerile recomandate și cinci întrebări la owner) unită în `main` pe 24.11** (`049c5dda`, `AndreiBesliu/cvs2#24`): pachetele neschimbate, pornirea +0; ADR 0233, acceptat de owner (1a–5a); **3.Xk (doar probe: repornirea cerută de extensie, cu ceasul paginii ținut de probă; la „ok, cand e verde fa unirea”) unită în `main`** (`@@XK@@`); fără felie în lucru |
| Biblioteca de freze (16.A↑, ADR 0300–0309) | [freze.md](freze.md) | `wip/16.A-freze` | 16.A↑a (biblioteca în browser, „Frezele mele”, ADR 0300) unită în `main` (`02a5864a`); ADR 0301 (plafonul total 900 kB, decizia owner-ului), scris de linie; 16.A↑b s-a împărțit în trei: b-1 (documentul v27 și valorile frezei în program, fără interfață), unită în `main` (`32b33a42`; un câmp nou al documentului ia v28), **16.A↑c (biblioteca de freze în cont: callable-ul `freze`, capabilitatea `cloud`, îmbinarea pe câmpuri) unită în `main` (`6b74074d`, `AndreiBesliu/cvs2#20`)**; **b-2 (freza din bibliotecă în secțiunea Tăierea) și a-2 (frezele standard, puse singure) unite în `main` (`33fadb06`, `AndreiBesliu/cvs2#22`)**; ADR 0302 acceptat de owner (1a–5a: catalogul de freze al nostru, biblioteca arătată ca listă); **h-1 (fereastra ca listă) și h-2 (grupurile omului) unite în `main` (`db43ed08`)**; **h-3 (catalogul de freze) și h-4 (bila, toroidala, conica cu vârf rotund, burghiul) unite în `main` (`9fd71053`)**; în lucru: h-5 (profilurile parametrice); după `#11`: b-3 (rândurile exportului), b-4 (nota schimbării din bibliotecă) |
| Relieful (18.1↑, ADR 0310–0329) | [relief.md](relief.md) | `wip/18.1-relief` | pornită pe 24.11, la cuvântul owner-ului: etapa 18 (nucleul reliefului, relieful din imagine, prelucrarea 3D din relief); ADR 0310 acceptat de owner (1a–6a); documentul v28 e al ei (forma `relief`, felia 18.1↑a); canalul `relief` |
| Cotele (10.4↑, ADR 0330–0339) | [cote.md](cote.md) | `wip/10.4-cote` | pornită pe 24.11, la cuvântul owner-ului: cotele pe desen (rândul din prag, etapa 10); ADR 0330 acceptat de owner (1a–6a): cotele stau pe foaie (`foaie.cote`), fără schemă nouă; setările, într-o fereastră „Setări” (nota owner-ului); 10.4↑a-1 (modelul, ușa documentului, proba G-code-ului neatins) unită în `main` (`f25249cf`, `AndreiBesliu/cvs2#21`); **10.4↑a-2 (unealta Cote pe pânză) unită în `main` (`f3283b33`)**; **10.4↑a-3 (fereastra Setări, cu secțiunea Cotele) unită în `main` (`08e2e50d`)**; urmează a-4 (panoul cotei, lista, „Arată cotele”), la cuvântul owner-ului; canalul `cote` |
| Fereastra exportului (28.8↑, ADR 0290–0299) | export.md (pe ramura liniei) | `wip/28.8-export` | pornită de owner pe 23.11; ADR 0290 acceptat (1a–4a); 28.8↑a–b-3 (lista și fișele, desenele întrebărilor, cartonașele) pe ramură (`AndreiBesliu/cvs2#11`): unirea, la cuvântul owner-ului, după ce o încearcă pe canalul `export`; la unirea ei, catalogul controalelor se scrie din nou |
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
