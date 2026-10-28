# ADR 0097: Progresul instalării în bara de jos

**Starea:** acceptat pe 28.10.2026, la cererea owner-ului („eventual sa avem si o zona sau un popup care arata progresul
actualizarii in curs”, apoi „Și progresul”), la felia 3.M, odată cu plafonul de 400 kB (ADR 0096). **Completează:** ADR 0045 §5
(actualizarea oferită), fără s-o schimbe. Oferta „Versiune nouă gata” + „Reîncarcă” rămâne singurul drum spre versiunea nouă.

**Problema.** Cât workerul nou își descarcă precache-ul, aplicația nu spune nimic. Oferta apare abia la sfârșit. La prima
vizită, nimic nu spune când aplicația poate lucra fără rețea. Cu un pachet mai mare (ADR 0096), o instalare pe o rețea lentă ar
trece neobservată.

## Decizia

1. **Mărimile în manifest.** `vite.config.ts` scrie în fiecare intrare a manifestului mărimea fișierului (`marime`, în octeți
   necomprimați), din `size`, pe care workbox-build îl scoate după transformări. Poarta build-ului cere ca fiecare intrare să
   aibă mărimea fișierului ei din build.
2. **Workerul numără.** La instalare, Workbox aduce precache-ul câte un fișier, în ordinea manifestului
   (`PrecacheController.install`, workbox-precaching 7.4.1). Pluginul din `src/pwa/progres.ts`, pe strategia precache-ului
   (`addPlugins`), adună mărimea fiecărui fișier terminat (`handlerDidComplete`), fie adus din rețea, fie găsit deja în cache.
   Mesajul `{ type: 'PROGRES_INSTALARE', gata, total }` pleacă la toate filele, și la cele pe care workerul nu le controlează
   încă (`includeUncontrolled`: prima vizită, versiunea veche), doar când procentul întreg se schimbă. Doar instalarea se
   numără, nu și cererile paginii, iar fiecare fișier o singură dată. O trimitere căzută nu respinge, fiindcă o respingere din
   plugin ar face instalarea să cadă.
3. **Fila ascultă înaintea lui `register()`.** Navigarea însăși caută `/sw.js`. Când găsește o versiune nouă, `register()`
   așteaptă în coada de joburi a workerului până la sfârșitul instalării ei. Văzut în e2e: fila afla de progres abia când nu mai
   era nimic de arătat. De aceea ascultarea pleacă înainte. Înregistrarea existentă vine din `getRegistration()`, care nu stă
   la coadă, iar workerul ei care se instalează deja e întrebat de progresul de până acum (`CERE_PROGRES`, răspuns din
   `stare()`). Procentul vine doar de la un worker încă în `installing`, ca un mesaj întârziat să nu rămână pe ecran. Se
   golește o singură dată, când acel worker iese din instalare, gata sau căzută (`redundant`).
4. **Bara de jos.** Progresul stă în locul cipului actualizării, iar oferta are întâietate. Textul e „Se descarcă versiunea
   nouă: N %” la o actualizare, sau „Pregătesc lucrul offline: N %” la prima instalare (niciun worker activ), cu o bară
   `<progress>`. Cipul n-are `role="status"`, ca un cititor de ecran să nu citească fiecare procent.
5. **Procentul** = octeții gata din total, rotunjit în jos: 100 doar când e gata tot. La o actualizare, fișierele neschimbate
   trec repede (sunt deja în cache), deci bara sare peste ele și stă pe cele noi.

## Cifrele (măsurate, gzip 9)

| | Înainte | După |
|---|---|---|
| Pornirea (cu ușa) | 96,2 (99,7) / 100 kB | 96,3 (99,8) / 100 kB |
| `sw.js` | 7,2 kB | 7,9 kB |
| Totalul JavaScript | 325,0 kB | 326,1 / 400 kB |

În pornire stau doar cipul și cele două texte. Ascultarea, cererea și golirea stau în bucata înregistrării, adusă la cerere.

## Probele

- `test/unit/pwa.progres.test.ts` (pluginul și mesajele):
  - octeții după fiecare fișier, până la 100;
  - adresele față de worker;
  - fișierele de două ori, cele necunoscute și cererile `fetch` nu se numără;
  - același procent nu se trimite din nou;
  - fără mărimi, nimic;
  - o trimitere căzută nu respinge;
  - rotunjirea;
  - forma mesajului;
  - starea de până acum, pentru o filă care întreabă.
- `test/unit/pwa.actualizare.test.ts` (pagina, pe containerul fals):
  - procentul și „prima”;
  - golirea o singură dată;
  - instalarea căzută;
  - mesajul întârziat ignorat;
  - cererea la o instalare deja în curs;
  - `register()` ținut de coadă până la sfârșitul instalării, cu progresul văzut cât ține;
  - workerul vechi, activat de altă filă, nu golește progresul celui nou.
- `test/e2e/pwa.spec.ts`, pe build-ul real, în Edge, cu bucata workerului simulării servită lent:
  - prima vizită („Pregătesc lucrul offline”, apoi nimic);
  - o actualizare: progresul sub 100, fără ofertă, apoi oferta. Din `/assets/` se cer doar bucățile redenumite;
  - o actualizare care cade: o bucată lipsă dă 404, progresul dispare, fără ofertă.
- Poarta build-ului: mărimea din manifest = fișierul din build, pe fiecare intrare.

## Ce am respins

- **Progresul pe număr de fișiere:** bucata pornirii are ~305 kB necomprimați, un fișier de mesaje 6–29 kB. Procentul ar
  minți.
- **Totalul din `Content-Length`:** nu se știe dinainte, iar răspunsul e comprimat.
- **Un popup sau un dialog:** întrerupe lucrul. Bara de jos e deja locul ofertei.
- **Un prag (progresul arătat doar după 1 s):** owner-ul vrea să-l vadă. O actualizare rapidă trece direct în „Versiune nouă
  gata”, în același loc.
- **O ordine aleasă a precache-ului** (întâi ce se folosește des, ideea owner-ului): Workbox aduce în ordinea manifestului, iar
  ordinea se poate alege din `manifestTransforms`. La ~1,3 MB necomprimați, câștigul e de secunde, iar până la sfârșitul
  instalării aplicația merge oricum din rețea. Se reia când pachetul crește destul ca ordinea să conteze.
- **`BroadcastChannel`:** ar merge, dar Clients API e calea workerului, iar filele necontrolate vin prin `includeUncontrolled`.

## Neprobat

- Firefox și Safari: e2e-ul rulează doar în Edge (ca toată suita PWA, ADR 0045).
- Mesajele dinaintea ascultării se pierd. Cererea acoperă golul, dar procentul apare abia la răspuns sau la fișierul următor.

## Se redeschide dacă

- pachetul crește destul ca ordinea descărcării să conteze;
- Workbox schimbă instalarea (de exemplu în paralel). Pluginul nu cere o ordine, doar „după fiecare fișier”, dar proba e2e se
  bazează pe faptul că o bucată lentă ține instalarea.
