# ADR 0251 — Linia de comandă a Clasicului

**Starea:** acceptat pe 10.11.2026, cu recomandările owner-ului la cele trei alegeri: „Da, 1a–3a”. Codul vine cu felia
28.3↑, după 28.2↑ (ADR 0250, ordinea 5a). Schițele: canvas-ul <https://claude.ai/artifact/VuzcaEYQsLoTvRBxpnSak2>, ecranele
„B · Linia de comandă” (merge în Play) și „B · Linia de comandă: stările și comenzile”. **Intră în:** etapa 28, adusă în
etapa 3, fără mașină. **Continuă:** ADR 0250 §2 (zona `comanda` a Clasicului). **Schimbă:** nimic acceptat.
**Documentul:** neschimbat.

## Problema

ADR 0250 a pus în Clasic o linie de comandă: „o acțiune a registrului după nume, cu argumentele ei simple („offset 3”);
Enter aplică, Escape renunță, istoricul pe săgeți”. N-a spus cum se scriu numele, cum ajunge cursorul în linie și ce face
Enter pe linia goală. Literele simple sunt deja ale uneltelor (V, R, O…), iar aplicația e în română și în engleză.

## Decizia

1. **Comanda e o acțiune a registrului**, cu aceleași verificări și aceleași motive de refuz ca butonul ei. Linia nu are
   reguli proprii: un refuz spune textul acțiunii (de exemplu „Distanța: un număr între 0,01 și 1000 mm.”). Comanda
   lucrează pe selecția de acum.
2. **Forma:** numele, apoi argumentele, despărțite de spații.
   - Numele și cuvintele argumentelor se scriu fără diacritice (diacriticele se acceptă și ele).
   - Un cuvânt început e destul cât e unic („int” pentru „interior”).
   - Numerele merg cu virgulă sau cu punct (`2,5`, `2.5`).
   - Un argument lipsă ia valoarea de acum a panoului acțiunii.
   - O comandă fără niciun argument, care are panou, îl deschide.
3. **Numele în ambele limbi (1a).** Fiecare comandă are un nume românesc și unul englezesc: `muta` / `move`, `roteste` /
   `rotate`, `scaleaza` / `scale`, `oglindeste` / `mirror`, `aliniaza` / `align`, `duplica` / `duplicate`, `sterge` /
   `delete`, `grupeaza` / `group`, `degrupeaza` / `ungroup`, `dreptunghi` / `rectangle`, `cerc` / `circle`, `foaie` /
   `sheet`, `rol` / `role`, `traseu` / `toolpath`, `anuleaza` / `undo`, `reface` / `redo`; `offset` și `gcode` sunt la
   fel în ambele.
   - Merg amândouă oricare ar fi limba aplicației. Completarea arată numele în limba aplicației.
   - Cuvintele argumentelor merg și ele în ambele limbi (`stanga` / `left`, `exterior` / `outside`).
   - O comandă nouă a registrului își primește ambele nume în același loc cu textele ei, iar proba cere ca niciun nume să
     nu fie al două comenzi.
4. **Tasta „/” aduce cursorul în linie (2a)**, din pânză, cât e deschis Clasicul. Azi e liberă; Ctrl+L ar fi bara de adrese a
   browserului, iar literele sunt ale uneltelor. Cât cursorul e în linie, tastele uneltelor scriu în ea. Esc golește linia,
   iar al doilea Esc o părăsește. Clicul o aduce și el.
5. **Enter pe linia goală aduce ultima comandă (3a)**, fără s-o aplice. Al doilea Enter o aplică. E mai sigur decât
   repetarea directă din programele CAD clasice, fiindcă ultima comandă poate fi „sterge”.
6. **Tastele liniei:**
   - Tab completează prima comandă potrivită; fără potriviri, mută focusul, ca de obicei;
   - ↑ și ↓ trec prin ultimele 20 de comenzi, ținute în browser;
   - jurnalul de deasupra arată ultimele patru comenzi aplicate, cu rezultatul lor.
7. **Previzualizarea:** cât argumentele sunt bune, comanda cu efect pe geometrie (offset, mută, rotește, scalează) se
   desenează punctat pe pânză, din același calcul ca aplicarea. Linia nu desenează nimic propriu.

## Probele

- Fiecare comandă: parsarea pe hârtie (numele în ambele limbi, prescurtările, virgula, argumentele lipsă) și același
  rezultat ca butonul ei, pe același document.
- Niciun nume, în nicio limbă, nu e al două comenzi; niciun prefix unic nu se schimbă tăcut când apare o comandă nouă (proba
  listează prefixele care devin ambigue).
- „/” aduce cursorul doar în Clasic și nu scrie „/” în linie. În linie, V și celelalte litere nu schimbă unealta.
- Enter pe linia goală nu aplică nimic.
- Manualul are capitolul liniei de comandă în ambele limbi, cu lista comenzilor.

## Mărimea

Parsarea și lista comenzilor stau în bucata Clasicului, la cerere (~3 kB). Numele vin cu textele aplicației.
