# ADR 0096: Plafonul total al aplicației, 330 → 400 kB

**Starea:** acceptat pe 28.10.2026, de owner („sunt ok cu marirea plafonului”, apoi „Și progresul” la propunerea „Ridic
plafonul total la 400 kB, cu ADR?”), la felia 3.M. **Schimbă:** plafonul total din `scripts/build-determinist.ts` (ADR 0075).
Pornirea (100 kB), `/admin` (200 kB), ușa (8 kB), testul pas cu pas (12 kB) și mașina simulată (8 kB) rămân.

**Problema.** După ADR 0095, totalul era 325,0 / 330 kB. Cu codul nou, totalul crește cu ~3 kB pe felie: 304,3 kB după 3.K
(26.10), 329,2 kB după 5.6↑ (27.10), cu opt felii între ele (ADR 0087–0094). Plafonul strâmt începuse să coste calitate:
ADR 0094 a lăsat deoparte intersecțiile exacte cu arcele marginii, ca să încapă. Întrebarea owner-ului a fost dacă un total
mai mare face aplicația mai lentă sau mai slabă. Răspunsul, verificat în cod (`src/sw.ts`, `src/pwa/`):

- **precache-ul se descarcă în fundal.** Workerul pornește la 2 s după prima randare (`PAUZA_PWA_MS`), iar Workbox aduce
  fișierele unul câte unul. La o actualizare, fila rămâne pe versiunea ei, întreagă, până la clic;
- **o actualizare aduce doar ce s-a schimbat.** Workbox păstrează intrările cu aceeași cheie (adresa cu amprenta, sau revizia).
  Probat în e2e: o publicare care redenumește o bucată aduce doar bucata și ce o pomenește;
- **codul descărcat nu rulează până nu e folosit.** Stă în Cache Storage, pe disc, nu în memorie. Un modul se compilează la
  prima deschidere, de pe disc;
- **viteza în lucru nu ține de mărimea pachetului.** Desenul, calculul CAM și simularea rulează pe algoritmi și workere;
- **ce se simte e pornirea**, cu plafonul ei (100 kB), pe care decizia de aici nu-l atinge.

## Decizia

Plafonul total devine **400 kB**. La ritmul măsurat, asta lasă loc pentru ~25 de felii. Costul e la prima instalare: cel mult
~70 kB în plus, adică ~0,75 s pe o rețea de 750 kbit/s, o singură dată. La o actualizare, doar ce s-a schimbat. Descărcarea are
acum progresul ei în bara de jos (ADR 0097), deci o instalare lungă se vede.

Plafonul numără doar JavaScript-ul (ADR 0086). Ce se descarcă de fapt la prima vizită e tot precache-ul, cu datele (mesajele,
manualul, dicționarul codurilor): 416,6 kB gzip la felia asta, de citit în linia „Workerul PWA” a build-ului.

## Cifrele (măsurate, gzip 9)

| | Înainte (ADR 0095) | După (3.M) |
|---|---|---|
| Totalul JavaScript | 325,0 / 330 kB | **326,1 / 400 kB** |
| Pornirea (cu ușa) | 96,2 (99,7) / 100 | 96,3 (99,8) / 100 |

Cei +1,1 kB sunt progresul (ADR 0097): pluginul din worker, răspunsul lui la cerere și mărimile din manifest (`sw.js` 7,2 →
7,9 kB), plus ascultarea din bucata înregistrării.

## Ce am respins

- **Bucățile rare la cerere, în afara precache-ului:** de ce, la ADR 0075. Nimic nu s-a schimbat de atunci: un atelier lucrează
  des fără internet.
- **Plafonul scos de tot:** poarta ține pachetul la vedere, iar o creștere mare cere din nou o decizie scrisă.
- **Workerul fără Workbox (~4 kB) sau Preact în locul lui React (~55 kB):** ar face loc, dar cu riscul lor (ADR 0095). Owner-ul
  a ales plafonul.

## Se redeschide dacă

- totalul trece de 400 kB (întâi ce se poate scoate fără să piardă offline-ul, apoi decizia owner-ului);
- instalarea se simte pe o rețea lentă (progresul din bara de jos o arată);
- pornirea ajunge la plafonul ei. Asta e altă decizie: plafonul de aici nu ajută pornirea.
