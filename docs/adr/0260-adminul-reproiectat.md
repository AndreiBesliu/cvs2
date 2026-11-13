# ADR 0260 — Pagina `/admin` reproiectată: bara laterală, fila Azi și filele după schițe

**Starea:** acceptat pe 13.11.2026, cu toate cele 12 idei din schițe („Da la toate”, la „Accepți recomandările la ideile
adminului 51–62?”). Cererea owner-ului, exactă: „vreau sa faci design si pentru admin”, după schițele aranjamentelor.
Schițele stau pe canvas, rândul G (<https://claude.ai/artifact/VuzcaEYQsLoTvRBxpnSak2>), iar ideile, pe tabla „Harta
schițelor”, la 51–62. **Intră în:** o linie a ei, nu în feliile aranjamentelor (ADR 0250); pornește la cuvântul owner-ului,
cu feliile A.1–A.7 de mai jos. **Continuă:** ADR 0040 (pagina și fila Erori), 0048 (Roadmap și Documentație), 0049
(personalul și rolurile), 0107 (sugestiile), 0116 (conturile, tichetele, setările). **Schimbă:** doar așezarea paginii și
fila de pornire; nimic din reguli, permisiuni sau date. **Documentul:** neschimbat.

## Problema

Pagina `/admin` a crescut filă cu filă: Erori, Diagnoză, Roadmap, Documentație, Sugestii, Tichete, Utilizatori, Personal,
Setări, Cont. Azi sunt zece file pe un singur rând, iar pagina se deschide pe Erori. Ca să afle ce cere atenție, omul trebuie
să intre în fiecare filă. Fiecare filă își deschide detaliile pe loc, în listă. Pe telefon, pagina are o singură regulă,
sub 640 px.

## Decizia

1. **Carcasa** (ideile 51–53):
   - **Bara laterală grupată,** cu aceleași file, în grupuri: Probleme (Erori, Tichete, Diagnoză), Produs (Sugestii,
     Roadmap, Documentație), Clienți (Utilizatori), Echipa (Personal, Setări), iar Contul meu la capăt.
   - Lângă filă stă un număr: erorile nerezolvate, tichetele noi, sugestiile fără decizie. Lângă Diagnoză stă un punct:
     galben la o Atenție, roșu la un Eșec.
   - Filele vizibile rămân cele date de rol (`fileVizibile`).
   - **Insigna instanței** în antet: TEST albastru, LIVE roșu, mereu la vedere.
   - **Căutarea din antet** găsește o eroare, un cont sau un tichet, în ce s-a citit deja. Căutarea pe server rămâne mai
     târziu (ADR 0116).
   - **Fila Azi,** prima după intrare, are patru părți:
     - cifrele care cer o mână;
     - joburile de noapte (marcajele de rulare, ADR 0041);
     - „Ce așteaptă de la tine” (din roadmap, doar pentru owner);
     - ultimele întâmplări (din auditul existent, doar cu „Audit: citește”).

     Fiecare rând duce în fila lui. Cifrele vin din aceleași citiri ca filele și doar din ce poate vedea rolul.
2. **Erori** (54): lista la stânga, eroarea aleasă la dreapta, fără să împingă lista. În plus, filtrul pe sursă (browser /
   server) și graficul aparițiilor pe 14 zile, din aparițiile deja citite.
3. **Tichete** (55): lista la stânga, raportarea ca o conversație la dreapta.
   - Amprentele erorilor din sesiune duc în fila Erori.
   - **Răspunsurile rapide** sunt texte scrise de owner, puse în câmp la un clic. Se țin într-o setare nouă, doar a
     owner-ului, cu regula ei și cu auditul ei (felia A.3).
4. **Sugestii** (56): o coloană pe decizie (Fără decizie, Acceptată, În lucru, Amânată, Făcută; Respinsele strânse sub
   ele).
   - Owner-ul trage un card dintr-o coloană în alta, prin callable-ul `sugestii` de azi, pe versiunea văzută.
   - Nota se cere la Respinsă și la Amânată.
5. **Utilizatori** (57): filtrele pe plan, cu numărul fiecăruia, și căutarea în conturile încărcate. Istoricul planului
   vine din rândurile de audit ale contului, doar cu „Audit: citește”.
6. **Personal** (58): matricea rol × permisiune, toate rolurile alături. Sub nume stă metoda de intrare: Google, parolă sau
   invitație în așteptare.
7. **Diagnoză** (59): sumarul (câte Bine, Atenție, Eșec) deasupra listei, apoi problemele întâi.
8. **Roadmap și Documentație** (60): „Ce așteaptă de la tine” mereu la vedere; în Documentație, cuprinsul paginii alături
   și starea ADR-ului (acceptat / propus) sub titlu.
9. **Setări** (61): istoricul schimbărilor sub buton, din audit.
10. **Telefonul** (62): sub 640 px, o bară jos cu Azi, Erori, Tichete și Mai mult, iar antetul are meniul ☰ și insigna.
    Pe telefon, un tichet se citește și primește răspuns; proiectul atașat se descarcă doar pe calculator.

## Feliile

| # | Felia |
| --- | --- |
| A.1 | Carcasa: bara laterală grupată cu numerele și punctul Diagnozei, insigna instanței, căutarea din antet, fila Azi (cu joburile, „Ce așteaptă de la tine”, ultimele întâmplări), Contul meu la capăt. |
| A.2 | Erori (detaliul alături, filtrul pe sursă, graficul pe 14 zile) și Diagnoză (sumarul, problemele întâi). |
| A.3 | Tichete: lista și conversația, legătura cu erorile din sesiune, răspunsurile rapide (setarea nouă, regula și auditul ei). |
| A.4 | Sugestii: tabla deciziilor, cu tragerea cardurilor și nota cerută. |
| A.5 | Utilizatori (filtrele, căutarea, istoricul planului) și Personal (matricea, metoda de intrare). |
| A.6 | Roadmap, Documentație (cuprinsul, starea ADR-ului) și Setări (istoricul). |
| A.7 | Telefonul: bara de jos, meniul ☰, tichetul cu răspunsul. |

## Probele

- **Permisiunile nu se schimbă:**
  - filele vizibile rămân date de `fileVizibile`;
  - o probă cere ca fila Azi să nu arate cifre din file pe care rolul nu le vede;
  - istoricul (planului, setărilor) și ultimele întâmplări cer „Audit: citește”.
- **Firestore Lite rămâne:** adminul citește o dată, fără ascultători (CLAUDE.md, 14.C↑b). Numerele din bara laterală se
  citesc la intrare și la „Reîncarcă”, nu în timp real.
- **Fiecare felie are proba ei e2e pe emulatoare** (`npm run test:emulator`), cu owner-ul și cu un rol custom cu permisiuni parțiale.
- **Tragerea în Sugestii are și cale din tastatură:** un meniu „Mută în…” pe card.

## Mărimea

- `/admin` e azi 106,5 / 200 kB. Ținta liniei: cel mult +25 kB pe toată linia.
- Graficul aparițiilor se desenează în SVG, fără bibliotecă.
- Totalul aplicației și pornirea nu se schimbă: adminul are pachetul lui.
