# ADR 0139: Extensia e „pornită” abia după ce pagina ei e gata (felia 3.Xf)

**Starea:** acceptat pe 06.11.2026, fără întrebări: o reparație, după ce CI-ul complet a căzut pe `main` (`43ae768`, rularea
`42235093565`) în `trenulet.spec.ts`. **Completează:** ADR 0127 (gazda extensiilor: încărcătorul cadrului, `HostApi` v1),
ADR 0129 (planificatorul ca extensie: intrarea, scripturile clasice). **Schimbă:** încărcătorul cadrului (`shared/cadruExtensie.ts`,
deci amprenta lui în CSP), tipul `Spatiu` din `extensii/api.ts`, starea ferestrei (`src/extensii/Extensii.tsx`), intrarea
planificatorului (pachetul 18.7.1).

**Problema.** Încărcătorul cadrului trimite „pornit” imediat ce `spatiu.deschide(document.body)` se întoarce, iar gazda scoate
atunci nota „se pornește”. Intrarea planificatorului își face pagina asincron: pune `body.html`, apoi își încarcă scripturile pe
rând, iar `deschide` se întoarce înaintea lor. Măsurat local, în clipa lui „pornit”, de cinci ori la rând: de patru ori
`body.html` nu era încă pus, o dată butonul „Circuite” exista, dar fără handler. Un clic în fereastra aceea se pierde: în CI-ul
complet (Linux, mai lent), proba a apăsat „Circuite” chiar după „pornit”, foaia nu s-a deschis, iar „Închide” a rămas nevăzut
30 s. Și omul vede nota dispărând înainte ca butoanele să meargă.

A doua cauză, găsită la reparare: starea ferestrei rămâne cea de dinainte la redeschidere (și la o repornire, ADR 0165).
Efectul care pornește cadrul o pune pe „se pornește” abia după prima randare, deci un cadru întreg, fereastra nouă arată
„pornit” al celei închise, fără notă: o probă care așteaptă „pornit” trece pe loc, înaintea cadrului nou.

## Decizia

1. **`deschide` poate întoarce o promisiune** (`Spatiu.deschide(container): void | Promise<void>`), iar încărcătorul o așteaptă
   înainte de „pornit”: „pornit” înseamnă că pagina extensiei e gata, nu doar că modulul ei a pornit. O extensie care întoarce
   `void` merge ca înainte (`await` pe `undefined`).
2. **Starea ferestrei e a ferestrei de acum:** o altă extensie, aceeași redeschisă sau o repornire pun „se pornește” chiar în
   randarea lor (starea care depinde de extensia deschisă și de numărul pornirii se reface în randare, ca în React: „storing
   information from previous renders”), nu după ea.
3. **Intrarea planificatorului întoarce promisiunea** paginii puse și a scripturilor încărcate; o eroare se raportează ca până
   acum (`host.raporteaza`), iar „pornit” pleacă oricum, ca înainte.
4. **Amprenta încărcătorului** se schimbă cu textul lui: constanta din `shared/cadruExtensie.ts` și antetul CSP din
   `firebase.json` (proba din `test/unit/csp.extensii.test.ts` le leagă de text). Politica CSP rămâne aceeași.
5. **Pachetul planificatorului** devine 18.7.1: intrarea lui s-a schimbat; un 18.7.0 instalat merge ca înainte până la
   reinstalare.

## Proba

- **E2e:** de trei ori la rând (închis și redeschis), în clipa lui „pornit”, butonul „Circuite” al planificatorului există și
  are handler; înainte, de cele mai multe ori nici pagina nu era pusă (cele două cauze, împreună). Proba căzută din CI
  (`trenulet.spec.ts`) trece așa fără nicio așteptare în plus.
- **Unitare:** amprenta din constantă și din `firebase.json` e a textului încărcătorului.

## Ce am respins

- **Doar proba, cu o așteptare în cadru:** CI-ul ar fi verde, dar omul ar vedea mai departe nota „se pornește” dispărând
  înaintea paginii, iar orice probă nouă ar avea aceeași capcană.
- **Un mesaj „gata” separat, trimis de extensie:** cere încă un pas fiecărei extensii; promisiunea lui `deschide` spune deja
  când e gata pagina.

## Se redeschide dacă

- o extensie are nevoie să fie „pornită” înaintea paginii (de exemplu, o pagină care se încarcă în bucăți, pe cerere).
