# ADR 0116: Conturile clienților și raportările lor (proba închisă)

**Starea:** propus pe 01.11.2026, din sugestia owner-ului acceptată pe 31.10 („Ne trebuie sistem de feedback sau raportare
erori de catre userii clienti. Si trebuie sa facem si partea de accounts.”) și din alegerea „Conturi” din 01.11. Alegerile
marcate **(owner)** au implicitul recomandat și așteaptă răspunsul lui. Restul vine din `PLAN.md` (§5.4, etapele 14–15;
§8.2, deciziile 7, 12, 13, 15 și 22), din `BRIEF.md` (§4, §7, §16.1) și din raportul de admin al Fazei 2
(`docs/faza2/admin/RAPORT.md`, tranșele P2 și P2+). **Completează:** ADR 0040 și 0049 (conturile personalului), ADR 0043
(raportorul de erori), ADR 0107 și 0111 (sugestiile personalului).

**Problema.** Azi, doar personalul are cont (în `/admin`), iar editorul merge fără cont. Proba închisă din `BRIEF.md` §4
(1–2 ateliere prietene, doar 2D, conturi invitate, fără plată) cere conturi de client. Adminul „ca și acum” (`BRIEF.md` §16.1)
are fila Utilizatori și fila Tichete. Owner-ul vrea și un canal prin care clienții raportează probleme și idei. Pe live,
conturile de Auth ale ediției întâi rămân în proiect (`BRIEF.md` §7), deci un client vechi are deja cont acolo.

## Decizia (propusă)

### A. Contul

1. **Un cont de client** = contul Firebase Auth (același proiect ca personalul) plus documentul `conturi/{uid}`, scris doar
   de server: e-mailul (din Auth), numele afișat, data creării și a ultimei logări, planul și dreptul de acces (§B), starea
   (activ sau dezactivat). Colecția `users` a ediției întâi rămâne închisă și neatinsă (§8.2, decizia 22).
2. **(owner) Până la lansare, cont primește doar cine e invitat.** Invitația pleacă pe e-mail din `/admin` (fila Utilizatori)
   și se acceptă doar pe adresa verificată, ca la personal (ADR 0049). Înregistrarea liberă, cu proba de 14 zile, vine la
   lansare (`BRIEF.md` §4).
3. **Logarea:** Google și e-mail cu parolă, un singur cont pe adresă (ADR 0049). În aplicație: butonul „Cont” din bară
   (logarea, numele, ieșirea) și fila Cont (planul, numele, exportul datelor, ștergerea contului).
4. **(owner) Conturile ediției întâi nu devin singure conturi noi.** Un client vechi intră prin invitație (în proba închisă)
   sau prin înregistrare (la lansare); datele lui vechi rămân neatinse.
5. **Personalul are și el cont de client**, pe același uid; permisiunile lui rămân în `staff/{uid}` (ADR 0049).

### B. Dreptul de acces

6. **Se calculează doar pe server** (`BRIEF.md` §4): planul dă capabilitățile, dintr-un singur catalog în cod (ca
   permisiunile personalului, în `shared/`). Serverul le scrie în `conturi/{uid}`, iar aplicația le citește. Fără „custom
   claims”, care se schimbă abia la următoarea logare.
7. **Planurile de acum:**
   - `proba-inchisa`, pentru invitați: tot 2D-ul, fără termen, fără plată;
   - `gratuit`, dat de owner;
   - `dezactivat`.

   Proba de 14 zile, cu registrul ediției întâi (HMAC pe e-mail, `BRIEF.md` §4), vine cu înregistrarea liberă. Nivelurile
   plătite vin cu facturarea (etapa 27; §8.2, decizia 23).
8. **Offline (PWA):** aplicația ține ultimul drept citit, cu data lui. **(owner) Fără reconfirmare, merge 14 zile.** Exportul
   și senderul se blochează prin convenție în client, ceea ce se poate ocoli și e acceptat (`BRIEF.md` §4); cloud-ul și
   AI-ul se blochează pe server, când vin.
9. **Poarta pe live**, după comutarea din 3.9: publicul vede „în curând” (§8.2, decizia 7), iar personalul și invitații intră
   cu contul. Pe test, aplicația rămâne deschisă fără cont (pentru testele owner-ului), iar contul se poate încerca acolo.

### C. Raportările (tichetele)

10. **„Raportează” în editor**, lângă „?”, pentru oricine e logat (client sau personal). Raportarea are:
    - felul: problemă, idee sau întrebare;
    - textul;
    - poza planșei, la cerere (ca la sugestia din editor, ADR 0111);
    - datele aplicației: versiunea, limba, browserul, planul;
    - amprentele erorilor din sesiune, din jurnalul local, fără conținutul lor.
11. **(owner) Proiectul se atașează doar cu bifa „Atașează proiectul”.** Fișierul stă în Storage (cel mult 10 MB) și îl
    citesc doar autorul și personalul cu permisiunea.
12. **Fila Tichete din `/admin`:**
    - stările nou, deschis și rezolvat;
    - vârsta tichetului, roșie după 48 h fără răspuns;
    - răspunsul personalului;
    - două permisiuni noi în catalog, `tichete.citeste` și `tichete.raspunde`;
    - scrierile prin callable, cu audit, cel mult 10 raportări pe cont pe zi.
13. **(owner) Răspunsul ajunge în aplicație**, în „Raportările mele”, cu un semn la un răspuns nou. Pe e-mail vine doar ca
    anunț, după ce domeniul are MX, SPF și DKIM (pasul owner-ului din `BRIEF.md` §7).
14. **Sugestiile personalului rămân cum sunt** (ADR 0107): ele sunt pentru planul owner-ului, tichetele sunt pentru sprijin.

### D. Datele personale

15. **Ce ținem:**
    - e-mailul, numele, metoda de logare, datele contului și planul;
    - tichetele, cu poza și proiectul atașat;
    - erorile, 90 de zile (§8.2, decizia 13).

    **(owner) Tichetele rezolvate se șterg după un an.**
16. **Exportul și ștergerea datelor** le face omul, din fila Cont, iar owner-ul, din fila Utilizatori. Amândouă pornesc de la
    aceeași listă de colecții pe cont, iar o probă compară lista cu ce se scrie (raportul de admin, fila Utilizatori).
17. **(owner) Nota de confidențialitate a probei închise** e o pagină scurtă, în română și engleză, arătată la acceptarea
    invitației: ce ținem, de ce, cât timp, cum se șterge și cine răspunde de date. **Operatorul datelor și adresa de contact
    le dă owner-ul**, pentru că entitatea juridică nu există încă (`BRIEF.md` §7). Fără ele, proba închisă nu pornește.
    Nota se verifică juridic înainte de lansare.

### E. Adminul (tranșa P2)

18. **Fila Utilizatori:**
    - lista, cu căutarea pe server după e-mail;
    - invitația;
    - dosarul fiecărui cont: planul, ultima logare, tichetele, erorile;
    - dezactivarea și reactivarea, planul gratuit, exportul și ștergerea datelor;
    - două permisiuni noi, `conturi.citeste` și `conturi.administreaza`;
    - fiecare acțiune, cu audit.

### F. Ordinea feliilor

- **14.C↑:** conturile clienților (§A, §B), invitația și o filă Utilizatori minimă (lista, invitația, dezactivarea); nota de
  confidențialitate, cu locurile goale până la datele owner-ului.
- **15.B↑:** raportările (§C).
- **14.D↑:** fila Utilizatori completă (căutarea, dosarul, planul gratuit, exportul și ștergerea, cu proba lor).
- **Mai târziu:**
  - înregistrarea liberă cu proba de 14 zile, la lansare;
  - anunțul pe e-mail, după DNS;
  - plăcile de conturi din Puls;
  - facturarea, în etapa 27.

## Ce am respins

- **Înregistrarea liberă acum:** proba închisă e cu invitați (`BRIEF.md` §4).
- **Dreptul de acces în „custom claims”:** s-ar schimba abia la următoarea logare, pe când documentul se vede imediat.
- **Tichetele în colecția sugestiilor:** au alt public (clienții, nu personalul) și altă viață (sprijin, nu planul).
- **Atașamentele în documentul tichetului:** în ediția întâi stăteau sub limita de 1 MiB a documentului.
- **Răspunsul doar pe e-mail:** domeniul n-are încă MX, SPF și DKIM, iar în ediția întâi un declanșator de e-mail a tăcut
  două zile fără ca cineva să afle.

## Limite

- Exportul blocat prin convenție se poate ocoli din client (`BRIEF.md` §4), cu bună știință.
- Pe live, Auth e comun cu ediția întâi: un client vechi se poate loga, dar fără invitație nu primește nimic.

## Se redeschide dacă

- owner-ul vrea înregistrare liberă înainte de lansare, sau conturile ediției întâi aduse în cea nouă;
- owner-ul vrea răspunsul pe e-mail înaintea celui din aplicație.
