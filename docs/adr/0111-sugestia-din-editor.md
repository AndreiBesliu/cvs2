# ADR 0111: Sugestia din editor: butonul „Sugestie”, cu poza planșei atașată (felia 14.B↑b)

**Starea:** acceptat pe 30.10.2026, la felia 14.B↑b. Felia e pasul 2 din planul sugestiilor, dat în raportul feliei 6.R↑:
„butonul «Sugestie» direct în editor, cu contul de admin și, opțional, o poză a planșei”. A pornit la „Continua” al
owner-ului, după încheierea lui 14.B↑. **Continuă:** ADR 0107 (sugestiile personalului), ADR 0072 (poza planșei, testul pas
cu pas, doar online). **Schimbă:** ADR 0107 §2 (sugestia primește câmpul `poza`) și §3 (scrierea primește poza).

**Problema.** O sugestie despre desen se explică greu în cuvinte. Cine lucrează în editor vrea s-o scrie de acolo, cu ce vede
pe planșă.

## Decizia

1. **Butonul „Sugestie”** stă în extensia barei, lângă Test, cu aceeași condiție: doar în afara instanței live. Titlul lui e
   „Sugestie pentru owner, cu poza planșei”. Un clic:
   - deschide, chiar în clic, pagina `/admin#sugestii` într-o filă nouă;
   - face poza planșei, cu codul testului (`pozaPlansei`);
   - o micșorează ca JPEG sub 400 kB (cel mult 1600 px pe lățime, calitatea coborâtă pe trepte) și o lasă în browser.
2. **Poza trece prin browser, nu prin server.** Stă în baza IndexedDB `cncvs2-sugestii`, într-un singur loc: o poză nouă o
   înlocuiește pe cea veche, iar una neluată într-o zi nu se mai arată. Editorul o anunță pe canalul `cncvs2-sugestii`
   (BroadcastChannel), ca o filă `/admin` deja deschisă s-o ia; fila o recitește și când redevine vizibilă. Editorul nu încarcă
   Firebase: contul e cel din `/admin`, unde omul intră (dacă n-a intrat deja).
3. **Fila Sugestii** arată poza în formularul nou: miniatura, ora și „Scoate poza”. Trimisă, poza pleacă odată cu sugestia și se
   șterge din browser; scoasă, iese din formular abia după ce s-a șters, ca o reîncărcare imediată să n-o aducă înapoi. Pe
   rândul unei sugestii cu poză, „Poza planșei” o aduce la cerere.
4. **Serverul.** Scrierea primește, opțional, `poza`: base64 strict, cel mult 400 kB, cu tipul citit din semnătură (JPEG, PNG,
   WebP). Poza intră în `sugestii/{id}/poze/plansa` (octeții, tipul, mărimea), în aceeași tranzacție cu sugestia. Sugestia ține
   doar `poza: { tip, marime }`, ca o listă să nu aducă octeții; auditul ține tipul și mărimea. Editarea și decizia nu ating
   poza.
5. **Regulile.** Documentul pozei se citește câte unul (`get`, nu listă), de cine poate citi sugestia: cu `sugestii.citeste`,
   sau autorul ei, cu `sugestii.scrie` (citit printr-un `get` pe sugestie). Nimeni nu-l scrie din client.
6. **Bugetul.** Bucățile sugestiei din editor sunt doar online, cu plafonul lor (8 kB; 2,5 măsurat), în afara totalului:
   `SugestieDinEditor`, plus cele împărțite, `pozaPlansei` (cu testul) și `pozaSugestiei` (cu `/admin`). Totalul crește doar cu
   butonul: 374,4 → 374,8 / 400 kB. `/admin` crește la 195,9 / 200 kB.
7. **Măsurat în e2e, în Edge:** un mesaj BroadcastChannel trimis chiar înaintea unui `window.open`, în aceeași sarcină, nu
   ajungea la nicio altă filă; trimis din altă sarcină, da. De aceea fila se deschide întâi, iar poza și anunțul vin după. Tot
   așa, o filă blocată de browser se știe imediat.

## Ce am respins

- **Poza în Firebase Storage:** alte reguli și alt serviciu de ținut; o poză sub 400 kB încape într-un document.
- **Contul în editor (Firebase Auth în aplicație):** ar aduce Firebase în bucățile aplicației; fila `/admin` are deja contul.
- **Poza trimisă prin adresa filei** (în `#` sau în parametri): prea mare, și ar rămâne în istoric.
- **Poza nemicșorată (PNG):** o planșă de ecran trece ușor de 400 kB.

## Probele

- `functions/test/sugestii.emulator.test.ts`: poza la scriere (JPEG, PNG, WebP, una exact la plafon), editarea care n-o atinge,
  refuzurile fără nicio scriere (peste plafon, alt tip, base64 stricat, prefixul `data:`, alte valori).
- `functions/test/reguli.emulator.test.ts`: cine citește poza, câte una, nu ca listă; nimeni n-o scrie din client.
- `test/unit/sugestii.test.ts`: semnătura, base64 strict și plafonul lui, base64-ul paginii față de cel al lui Node, poza lăsată
  (de cel mult o zi, nu din viitor), rândul cu poză.
- `test/e2e-emulator/sugestii.emulator.spec.ts`: din editor, fila deschisă cu poza atașată, trimisă și văzută pe rând; o poză
  nouă ajunge în fila deja deschisă; scoasă, nu revine la reîncărcare.
- Manualul (capitolul testului) numește butonul, în ambele limbi (`test/unit/manual.test.ts`).

## Se redeschide dacă

- personalul vrea mai multe poze pe sugestie, poze adăugate după scriere sau adnotări pe poză;
- butonul intră pe live, pentru clienți, cu conturile lor (etapa 14).
