# ADR 0252: Plafonul pornirii, 110 → 115 kB

**Starea:** acceptat pe 13.11.2026, de owner („Da, 115 ／ 800”, la „Ridic plafoanele la 115 kB pornirea și 800 kB
totalul?”), înaintea feliei 28.1↑, prima a aranjamentelor (ADR 0250). Scris în worktree-ul `aranjamente` (ramura
`wip/28.1-aranjamente`, din `main` `d62e6b8`). **Schimbă:** plafonul pornirii din `scripts/build-determinist.ts` (pornirea
cu ușa ≤ 110 kB, ADR 0100). Ușa (8 kB), `/admin` (200 kB), contul (32 kB) și cele doar online rămân. Totalul are decizia
lui, luată odată cu asta (ADR 0253).

## Problema

După unirea planșelor (`d62e6b8`), pornirea măsurată e 105,7 kB, iar cu ușa unui proiect salvat 109,7 / 110 kB: rămân 0,3
kB.

Felia 28.1↑ trebuie să știe aranjamentul ales și densitatea înaintea primei randări. Aranjamentul nu se schimbă pe ecran
după pornire (ADR 0250 §4). ADR 0250 („Mărimea”) a estimat asta la ~1–1,5 kB în pornire, pe baza de atunci (105,6 cu ușa).
Între timp, planșele au urcat baza cu ~4 kB, deci 28.1↑ ar duce pornirea cu ușa la ~111 kB.

Câteva idei acceptate pe 13.11 merg și ele în pornire, fiindcă țin de carcasă, nu de un aranjament anume:
- F6 prin zonele aranjamentului;
- zona „mesaj”, cu „Anulează” lângă mesaj;
- Shift + F10 pentru meniul de context.

## Decizia

Plafonul pornirii devine **115 kB** (pornirea cu ușa). Codul fiecărui aranjament, în afară de Insule, rămâne o bucată la
cerere (ADR 0250, „Mărimea”); în pornire intră doar ce trebuie înaintea primei randări. Pornirea cu ușa ajunge la ~111 kB
cu 28.1↑, iar ce rămâne până la 115 e pentru ideile de carcasă de mai sus și pentru numele bucăților noi din lista de
preîncărcare (~0,1 kB pe bucată, ADR 0100).

## Cifrele (măsurate, gzip 9, `node scripts/build-determinist.ts`)

| | La ADR 0100 (28.10) | La ADR 0144 (09.11) | Acum (`d62e6b8`, 13.11) |
|---|---|---|---|
| Pornirea (cu ușa) | 96,5 (100,0) / 110 | 101,9 (105,6) / 110 | **105,7 (109,7) / 115** |

## Ce am respins

- **Întâi o felie care face loc în pornire, cu plafonul de 110 păstrat** (varianta „Întâi fă loc”): nu se știe încă de
  unde ies ~1,5 kB fără o randare care așteaptă după rețea (ADR 0100). Linia ar fi stat pe loc până la ea.
- **Aranjamentul citit după prima randare:** omul ar vedea Insulele, apoi alt aranjament; ADR 0250 §4 o exclude.
- **Plafonul scos de tot:** poarta ține pornirea la vedere (ADR 0042).

## Se redeschide dacă

- pornirea cu ușa trece de 115 kB (întâi ce se poate muta la cerere fără o randare care așteaptă, apoi decizia owner-ului);
- prima randare măsurată (ADR 0100, „Ce costă pornirea”) crește vizibil pe un procesor lent.
