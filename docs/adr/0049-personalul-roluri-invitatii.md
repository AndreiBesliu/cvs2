# ADR 0049: Personalul: rolurile din catalogul de permisiuni, invitațiile pe e-mail, conturile create de owner, un singur cont pe e-mail

**Starea:** acceptat pe 20.10.2026, odată cu felia 14.A↑. Cererea owner-ului: „vreau sa pot crea conturi, sau ca userii sa poata crea conturi, si sa
pot atribui roluri. Sau, sa creez roluri custom si sa le atribui”; deciziile lui, din întrebările de pe 20.10: personalul din
`/admin` (nu încă utilizatorii aplicației), intrarea prin **invitație pe e-mail** și prin **cont cu parolă creat de owner**,
rolurile ca **bife dintr-un catalog**, **acum, fără agenți**; plus „cand un user creeaza cont cu google, sa poata adauga si
parola la cont. ca metoda de evitat dublarea contului”. **Intră în:** etapa 14 (fila „Admini”, `PLAN.md` §5.6), adusă în
etapa 3, fără mașină (14.A↑). **Continuă:** ADR 0040 (`staff/{uid}`, auditul în tranzacție).

**Problema.** Rolul de personal se scrie de mână în consola Firestore și are trei trepte fixe (`support` < `admin` <
`owner`). Owner-ul vrea să adauge oameni din `/admin`, să le dea roluri făcute de el și să nu ajungă cu două conturi pentru
același om (unul cu Google, altul cu parolă).

## Decizia

**1. Catalogul de permisiuni stă în cod** (`shared/personal.ts`, `PERMISIUNI`): regulile și serverul le verifică, deci o
permisiune nouă e o schimbare de cod, cu proba ei. Un rol = un nume dat de owner + o submulțime din catalog. Catalogul de
acum: `erori.citeste` (fila Erori), `erori.rezolva` („Rezolvat” / „Redeschide”), `diagnoza.citeste` (Diagnoza: marcajele,
amprenta publicării), `audit.citeste` (auditul), `documentatie.citeste` (filele Roadmap și Documentație; fișierele sunt
publice, permisiunea ascunde doar filele).
- **`owner` e un rol fix**, în afara catalogului: are tot și e singurul care administrează personalul (oamenii, rolurile,
  invitațiile, conturile). Personalul nu rămâne niciodată fără owner: ultimul owner nu poate fi scos sau retrogradat.
- Treptele `support` / `admin` din ADR 0040 dispar: un document cu ele nu mai dă nimic (pe test e doar owner-ul).

**2. Datele**, scrise doar de server (callable-uri, Admin SDK), cu auditul în aceeași tranzacție (`audit/{id}`: cine,
rolul, acțiunea, ținta, înainte, după):
- `roluri/{id}`: `nume`, `permisiuni` (din catalog, sortate, fără dubluri), cine și când; id-ul îl dă serverul;
- `staff/{uid}`: `rol` (`owner` sau id-ul unui rol), `email`, `sursa` (`consola` / `invitatie` / `cont-creat`), cine și
  când l-a adăugat;
- `invitatiiPersonal/{sha256(e-mail)}`: `email` (litere mici), `rol`, cine, când, `expiraLa` (7 zile). O singură invitație
  pe e-mail: a doua o înlocuiește.

**3. Regulile citesc rolul la fiecare cerere, din două documente** (`staff/{uid}`, apoi `roluri/{rol}`): o permisiune
scoasă dintr-un rol nu mai deschide nimic de la cererea următoare, fără nicio copie de ținut la zi. Fiecare își citește
documentul lui de personal și rolul lui (pagina arată filele după ele); owner-ul citește tot personalul, rolurile și
invitațiile; restul e refuzat. Id-ul rolului din `staff` trebuie să aibă forma id-urilor date de server.

**4. Invitația.** Owner-ul scrie e-mailul și rolul. Omul intră cu Google pe acel e-mail, iar pagina cheamă
`acceptaInvitatia`: serverul cere `email_verified` din token (un cont cu parolă pe un e-mail străin se poate face de
oricine, dar nu se poate verifica), invitația neexpirată, apoi creează `staff/{uid}` și șterge invitația, în tranzacție, cu
auditul. Cine e deja în personal nu-și schimbă rolul printr-o invitație.

**5. Contul creat de owner.** Owner-ul scrie e-mailul și rolul; serverul creează contul în Auth fără parolă și
`staff/{uid}`, apoi întoarce un **link de setare a parolei** (linkul Firebase de resetare, valabil o oră), pe care owner-ul
i-l trimite omului. Parola n-o știe nimeni în afară de om. „Link nou” face altul (doar pentru conturile create așa);
„Am uitat parola” din pagina de intrare trimite e-mailul Firebase. Dacă există deja un cont cu acel e-mail, crearea e
refuzată, cu trimitere la invitație: contul existent poate fi unul neverificat, făcut de altcineva.

**6. Un singur cont pe e-mail** (regula owner-ului, valabilă și pentru conturile utilizatorilor din etapa 14). Setarea
Firebase „un cont pe adresă de e-mail” rămâne pornită (citită pe 20.10: pornită pe test și pe live, la fel furnizorul
e-mail / parolă). Fila **Cont** (pentru oricine e logat) arată metodele contului și le leagă de același cont: „Adaugă o
parolă” (cine a intrat cu Google), „Leagă Google” (cine are parolă), „Schimbă parola”. Parola se leagă cu `linkWithCredential`;
dacă backend-ul răspunde „adresă folosită” (emulatorul de Auth o face pe propria adresă a contului, măsurat pe 20.10), parola
se pune direct pe contul deschis (`updatePassword`), tot fără al doilea cont, iar la final contul trebuie să aibă metoda
parolei, altfel e o eroare. Probat pe test pe 20.10, cu contul Google al owner-ului: un singur cont, cu ambele metode;
contul se citește apoi cu adresa „neverificată” (de ținut minte pentru etapa 14, dacă ceva va cere adresa verificată după
ce omul și-a pus parola). Un Google deja folosit de alt cont
e refuzat cu motivul; o operație care cere o intrare recentă cere întâi reintrarea. La intrare, un e-mail care are deja alt
fel de cont primește mesajul „intră cu metoda pe care o ai, apoi leagă-o pe cealaltă din fila Cont”.

**7. Fila Personal** (doar owner-ul): oamenii (e-mailul, rolul, de unde, de când; schimbă rolul, scoate), rolurile (numele
și bifele; un rol folosit de cineva sau de o invitație nu se șterge), invitațiile (adaugă, anulează, expirarea), contul
nou (cu linkul de parolă, arătat o dată, de copiat). Celelalte file se arată după permisiuni; fără nicio permisiune, pagina
spune asta.

## Ce am respins

- **Rolurile în custom claims** (`PLAN.md` §5.6: „rolurile nu mai stau în claim-uri”): ajung abia la reîmprospătarea
  tokenului și sunt a doua sursă.
- **Permisiunile copiate în `staff/{uid}`** (o singură citire în reguli): o schimbare de rol ar trebui scrisă la toți
  oamenii cu el, iar o copie uitată ar ține drepturi vechi.
- **Parola scrisă de owner** pentru omul nou: ar trece prin chat și prin mâna altcuiva.
- **Invitația acceptată pe un e-mail neverificat:** oricine poate crea un cont cu parolă pe orice adresă.
- **O permisiune „administrează personalul” pentru alții** decât owner-ul: cere reguli contra auto-promovării (nu dai ce
  n-ai, nu-ți schimbi singur rolul). Se poate adăuga mai târziu, cu probele ei.

## Probele

`functions/test/reguli.emulator.test.ts` (cine citește ce, pe roluri custom; nimeni nu scrie din client),
`functions/test/personal.emulator.test.ts` (fiecare acțiune pe emulatoarele Firestore și Auth: auditul, refuzurile,
ultimul owner, invitația pe e-mail neverificat sau expirată, contul existent), `test/unit/personal.test.ts` (catalogul,
validările), `test/e2e-emulator/personal.emulator.spec.ts` (owner-ul face un rol, invită, creează un cont; omul își pune
parola și vede doar filele rolului; owner-ul își adaugă o parolă la contul Google).

## Se redeschide dacă

- personalul trece de câteva zeci de oameni (atunci: căutarea pe server, paginarea);
- owner-ul vrea un administrator al personalului care nu e owner;
- conturile utilizatorilor (etapa 14) cer altă formă pentru invitați.
