# ADR 0176 — Supracursa în fereastra exportului

**Starea:** acceptat pe 18.11.2026, la răspunsul owner-ului „Da, pune-o” (întrebarea din 17.11: „Pun supracursa în fereastra
exportului, ca felie mică pe linie?”). Felia 12.1↑f-3, în linia incrustațiilor (worktree-ul `incrustatii`, ramura
`wip/12.1-incrustatii`), fără mașină. **Documentul:** neschimbat (v25). Supracursa ține de mașină și de placa ei de sacrificiu,
nu de proiect.

## Problema

ADR 0028 §2 a făcut supracursa un parametru al exportului: 0–2 mm, implicit 0. Adâncimea unei operații poate trece de
grosimea foii cu cel mult atât, iar puntea unei urechi se măsoară de la fața de jos a foii, deci rămâne la grosimea cerută
și cu supracursă. Fereastra n-o arăta („vine cu profilul mașinii”), deci din interfață era mereu 0.

Gaura incrustației (ADR 0175) trece prin foaie cu grosimea ei plus supracursa, deci din fereastră se oprea exact la grosimea
scrisă. Dacă placa reală e mai groasă decât cea scrisă, sau masa de sacrificiu nu e plană, pe fund rămâne o piele. La fel se
întâmplă la decupările dopurilor (ADR 0171, 0172, 0174, 0175), care trec exact prin placa lor.

## Decizia

1. **Câmpul:** „Supracursa (mm)”, în fereastra exportului, lângă Z0.
   - Ia valori între 0 și 2 mm (`SUPRACURSA_MAXIMA`), implicit 0. Cu 0, programele sunt aceleași ca azi, octet cu octet.
   - Un text care nu e un număr între 0 și 2 e marcat, iar Exportă e oprit, cu motivul.
   - Valoarea rămâne de la o fereastră la alta cât e deschisă aplicația, ca setările mașinii (`$$`). Nu intră în document și
     nici în stocarea browserului.
2. **Pe foaie** (ADR 0028 §2 și ADR 0175, neschimbate):
   - O adâncime scrisă poate trece de grosimea foii cu cel mult supracursa; altfel exportul o refuză, cu motivul.
   - Gaura incrustației merge până la grosimea foii plus supracursa.
   - O tăietură scrisă cât grosimea rămâne cât e scrisă: supracursa dă voie să tai mai adânc, nu se adaugă singură (vezi
     „Ce am respins”).
3. **Pe dopuri** (nou): tăieturile prin placa dopului, calculate de program, trec și ele sub placă cu supracursa, ca gaura.
   - Se aplică la decuparea dopului drept, simplu și în trepte (ADR 0171, 0174, 0175), și la decuparea dopului în V cu banda
     (ADR 0172).
   - Punțile se măsoară de la fața de jos a plăcii, ca urechile (ADR 0028 §2), deci își păstrează grosimea aleasă.
   - Placa dopului (semifabricatul) rămâne exact cât era.
   - Dopul ridicat n-are tăietură prin placă, deci nu se schimbă deloc.
   - În G-code, eticheta operației decupării arată adâncimea cu tot cu supracursa (de exemplu 6,5 mm la placa de 6).
4. **Fără supracursă rămân** traseul de pe foaie, vederea 3D și timpul de lângă traseu (ADR 0038, ADR 0057). Rezumatul și
   simularea din fereastra exportului sunt ale programului exportat, deci o includ.

## Dovada

- [citit] ADR 0028 §2 și proba lui: cu supracursa 0,3, adâncimea 18,3 pe foaia de 18 trece, cu puntea tot de 2,0. Fără
  supracursă, aceeași adâncime e refuzată.
- [măsurat] Probele feliei, rulate întâi pe codul de dinainte, au picat toate patru pe dopuri. Fundul decupării era la placa
  dopului (−5 în loc de −5,5; −12 în loc de −12,3; −9,5 în loc de −10; T în loc de T + 0,5). Controlul, dopul ridicat, a trecut.
- [dedus] Vârful punții e la grosimea plăcii minus grosimea punții, măsurat de la față. Cu supracursa, trecerile coboară mai
  jos, dar vârful rămâne pe loc, deci puntea are aceeași grosime.

## Ce am respins

- **Supracursa adăugată singură la tăieturile scrise cât grosimea foii.**
  - Ar schimba sensul adâncimii scrise: 18,3 pe foaia de 18 ar rămâne 18,3, dar 18 ar deveni 18,5.
  - Ar atinge și incrustațiile cu adâncimea cât foaia.
  - ADR 0028 §2 a ales voia, nu adaosul.
  - O adâncime „prin foaie”, ținută la zi cu foaia ca gaura, ar cere un câmp nou în document (v26): altă felie, la cuvântul
    owner-ului.
- **Valoarea în document:** ține de mașină și de masa ei, nu de proiect, iar același proiect se poate tăia pe altă mașină.
- **Valoarea în stocarea browserului:** se va păstra odată cu profilul mașinii, împreună cu `$$`, nu câmp cu câmp.
- **Implicitul 0,3, ca în ediția întâi:** ar schimba toate programele de azi, deci implicitul rămâne 0.

## Ce impune

- `programeDopuriDrepte` și `programeDopuri` primesc supracursa (implicit 0), iar calculul exportului le-o dă.
- Probele pe programele exportate, cu valorile pe hârtie:
  - dopul decupat simplu: placa de 5, cu punți de 1,5;
  - dopul gaurii: 12 + 0,3;
  - dopul decupat în trepte: 9,5 + 0,5, cu potrivirea pe oracol;
  - decuparea benzii în V: T + 0,5;
  - controalele: dopul ridicat și locașurile care nu trec prin foaie au aceleași programe.
- Fereastra, în e2e: câmpul, valorile greșite, exportul real cu gaura și valoarea păstrată la redeschidere.
- Otrăvurile, în `test/otravuri/12.1f-3.py`.
- Fișa etapei 3 (rândul 12.1↑f-3), manualul (ro, en), DEVLOG-ul. CLAUDE.md rămâne al sesiunii principale.

**Se redeschide dacă:** vine profilul mașinii (atunci valoarea se păstrează cu el), sau owner-ul vrea tăieturile „prin foaie”
ținute la zi cu foaia (câmpul din document).
