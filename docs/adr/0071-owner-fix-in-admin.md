# ADR 0071: Owner-ul e fix în /admin

**Starea:** acceptat pe 25.10.2026, la cererea owner-ului, cu captura filei Personal: „in admin, contul meu nu ar trebui sa
poata fi removed. nu din admin. si nici rolul nu ar trebui sa poata fi schimbat”. **Schimbă:** ADR 0049 (§1: „ultimul owner
nu poate fi scos sau retrogradat”; cu doi owneri, unul putea pleca, iar rolul `owner` se dădea din `/admin`).

**Problema.** Pagina arăta, pe rândul owner-ului, alegerea rolului și „Scoate”. Serverul refuza doar ultimul owner: cu un al
doilea owner (dat din `/admin`), oricare dintre ei îl putea scoate sau retrograda pe celălalt, inclusiv pe owner-ul
proiectului.

## Decizia

**1. Un owner nu se scoate și nu-și schimbă rolul din `/admin`**, oricine ar cere-o (și el însuși, și alt owner): callable-ul
`administreazaPersonalul` refuză `scoate` și `schimba-rolul` pe un `staff/{uid}` cu `rol: 'owner'` (`failed-precondition`,
cu motivul), înaintea oricărei scrieri. Personalul nu rămâne niciodată fără owner, fără nicio numărătoare.

**2. `owner` se dă doar din consolă** (cum a fost pus primul owner): `invita`, `creeaza-cont`, `schimba-rolul` și
`acceptaInvitatia` refuză rolul `owner`. Altfel, un owner dat din `/admin` n-ar mai putea fi luat înapoi de aici (§1).
ALEGERE a asistentului, din §1 (cererea vorbea doar de scoatere și de rol): se redeschide la cuvântul owner-ului.

**3. Pagina** arată rândul unui owner doar de citit: „owner (tot, inclusiv personalul) · fix: nu se scoate și nu-și schimbă
rolul de aici, doar din consolă”, fără alegerea rolului și fără „Scoate”; `owner` nu mai e printre rolurile de ales. Rândul
propriu arată adresa contului logat când documentul n-are e-mail (primul owner, pus din consolă, se vedea ca uid).

**4. Regulile Firestore** nu se schimbă: clientul nu scrie niciodată `staff` (doar callable-ul).

## Probele

Pe emulatoare: owner-ul nu se scoate și nu-și schimbă rolul (nici „același rol”); un al doilea owner, pus din consolă, nu-l
poate scoate sau retrograda pe primul, nici primul pe el; `owner` refuzat la invitație, la contul creat și la schimbarea
rolului, fără nicio scriere (nici în Auth); restul personalului se scoate, cu auditul. E2e pe build-ul real: rândul owner-ului
fără alegere și fără Scoate, `owner` lipsă din rolurile de dat; doi owneri ficși și un om cu Scoate.

## Se redeschide dacă

- owner-ul vrea să poată numi alt owner din `/admin` (atunci, cu o confirmare și cu retragerea doar din consolă).
