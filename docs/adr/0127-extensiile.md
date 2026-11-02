# ADR 0127: Extensiile: pachetul, instalarea, cadrul izolat și `HostApi` v1

**Starea:** acceptat pe 02.11.2026 pentru felia 3.Xa, a doua a liniei Trenuleț (worktree-ul `wip/trenulet`). Deciziile
owner-ului, din aceeași zi (în `CLAUDE.md`, „Decizii luate”):
- „nu vreau sa fie prezent in softul vanilla, vreau sa fie instalat din link. sau dintr-un zip. pentru asta avem nevoie de
  un sistem de plugin-uri. interfata lui cvs2 va ramane tot timpul cea vanilla si pentru utilizarea plugin-ului, trebuie
  accesat plugin-ul printr-un buton discret sau dintr-un meniu de plugin-uri pus aici” (lângă marcă); la schița meniului,
  „la fel”;
- instalarea de la o adresă, cum am recomandat: orice adresă HTTPS a unui `.zip`, plus linkul de instalare („cum recomanzi
  tu”);
- „eu vreau ca softul plug-inului sa poata folosi senderul din cvs2”, apoi „Da, ca recomandat”: cadrul izolat, cu CSP-ul
  care îl face posibil, și senderul doar prin `HostApi` (felia 3.Xb);
- „Da”, la „Pornesc felia 3.Xa, gazda extensiilor?”.

## Contextul

Planificatorul Trenuleț (circuite de cale ferată din lemn, piese printate) devine o extensie a lui cvs2, nu o parte a lui.
Sursele lui vor sta în repo (`extensii/trenulet/`, felia E2), construite separat. Prima extensie, aici, e una de probă
(`extensii/salut/`): arată ce primește de la cvs2 și nimic altceva.

## Decizia

### A. Pachetul

Un `.zip` cu `extensie.json` la rădăcină și fișierele extensiei. Manifestul (`src/extensii/pachet.ts`):

| Câmp | Ce e |
|---|---|
| `format` | `"cvs2-extensie"` |
| `api` | `1`: versiunea lui `HostApi`; alta se refuză, cu motiv |
| `id` | `[a-z0-9-]`, 1–40 de caractere: cheia instalării (aceeași = o versiune nouă a aceleiași extensii) |
| `nume`, `versiune` | pentru om: cel mult 60, respectiv 20 de caractere |
| `intrare` | modulul ES care exportă `activeaza(host)`; un singur fișier, fără importuri relative (pachetul îl construiește bundlerul) |
| `stiluri` | (opțional) fișiere CSS, puse în cadru ca foi construite |
| `permisiuni` | serviciile cerute, din catalogul lui cvs2; în v1 catalogul e gol (senderul intră în 3.Xb), deci o permisiune necunoscută se refuză |
| `fisiere` | fiecare fișier al pachetului, cu SHA-256-ul lui (hex mic) |

Reguli:
- căile sunt relative, ASCII vizibil, fără `\`, `..`, `.` sau `/` la început;
- fiecare fișier din `.zip` (afară de manifest) e în `fisiere`, și invers; amprentele se potrivesc;
- cel mult 256 de fișiere, 8 MB unul și 16 MB toate, despachetate;
- `.zip`-ul are doar metodele 0 (stocat) și 8 (deflate), fără criptare și fără ZIP64. Mărimile declarate se judecă înainte
  de dezarhivare, iar CRC-32 după ea.

Amprentele dovedesc întregimea pachetului, nu autorul lui. Încrederea e a omului care alege fișierul sau adresa, iar cadrul
izolat (D) mărginește ce poate face o extensie.

### B. Instalarea

- **Din fișier:** „Instalează din fișier (.zip)…”.
- **De la o adresă:** „Instalează din adresă…” descarcă un `.zip` de la o adresă HTTPS, fără credențiale, cel mult 16 MB.
  Gazda trebuie să permită CORS; altfel, omul primește motivul și descarcă fișierul el însuși.
- **Linkul de instalare:** `<adresa cvs2>#instaleaza=<adresa pachetului, codată>` deschide aplicația cu adresa completată
  în fereastra „Instalează din adresă”. Nimic nu se descarcă fără clicul omului, iar ancora se șterge din adresă.
- **Confirmarea:** fereastra instalării arată numele, versiunea, de unde vine pachetul, fișierele și mărimea lor, iar la
  aceeași extensie deja instalată și versiunea de acum. Pachetul greșit se refuză cu motivul lui, fără nicio scriere.
- **Locul:** IndexedDB `cncvs2-extensii`, în browserul omului: fișierele, manifestul, de unde au venit și când. Merge și
  offline. **Gestionează extensiile** le arată și le scoate.

### C. Meniul și spațiul de lucru

- **Butonul Extensii** stă mereu lângă marcă și numele instanței, discret (piesa de puzzle). Deschide un meniu sub el, ca
  meniul contului (ADR 0120):
  - extensiile instalate; clicul deschide spațiul extensiei;
  - **Instalează din fișier (.zip)…** și **Instalează din adresă…**;
  - **Gestionează extensiile…**.
- **Spațiul unei extensii ia locul pânzei**, în zona din mijloc. Barele și panourile lui cvs2 rămân, deci panoul mașinii
  poate sta lângă el. Pe rândul de deasupra spațiului stau numele extensiei și **Înapoi la planșă ×**, care o închide și
  aduce pânza înapoi. Închiderea oprește extensia: ce vrea să păstreze, păstrează prin `HostApi` (3.Xb).
  - Schița le punea lângă marcă. La 1280 px, coloana mărcii are 157 px, titlul aplicației e deja strâns la zero, iar
    cipul ar fi stat sub bara de unelte (măsurat în Edge): de aceea stau deasupra spațiului.
- **Cât e deschis spațiul, acțiunile documentului nu rulează** (cele din registrul documentului, importul, exportul,
  câmpurile panoului de proprietăți). Pânza e ascunsă, iar o tastă nu poate schimba un desen pe care omul nu-l vede.
  Vederea rămâne: panourile (mașina), tema, paleta.

### D. Cadrul izolat

- **Cadrul:** un iframe cu `sandbox="allow-scripts"` și `srcdoc`. Are o origine opacă, fără `allow-same-origin`, și nimic
  delegat prin `allow`. Deci extensia:
  - nu vede stocarea lui cvs2: proiectele, contul, setările;
  - nu vede pagina lui cvs2;
  - nu ajunge la portul serial sau la rețeaua locală;
  - nu deschide ferestre și nu navighează pagina.
- **Încărcătorul:** pagina cadrului are un singur script scris în ea, `shared/cadruExtensie.ts`. Primește de la cvs2, o
  singură dată, fișierele, contextul și un `MessagePort`. Face o adresă `blob:` din modulul de intrare, îl importă și
  cheamă `activeaza(host)`, apoi `deschide(document.body)`. Erorile lui și ale extensiei ajung în jurnalul local al lui
  cvs2, cu id-ul extensiei.
- **CSP-ul.** Cadrul moștenește CSP-ul aplicației și mai pune unul propriu, mai strict: fără rețea (`connect-src 'none'`),
  scripturi doar `blob:` și încărcătorul. CSP-ul aplicației primește:
  - `blob:` și amprenta încărcătorului în `script-src`: fără ele, extensia nu rulează;
  - `https:` în `connect-src`: descărcarea de la o adresă (B).

  Restul rămâne: fără `unsafe-inline`, fără `unsafe-eval` (ADR 0017), alte site-uri refuzate la scripturi. O adresă
  `blob:` o poate face doar cod care rulează deja în pagină.
- **Stilurile în cadru** vin ca foi construite (`adoptedStyleSheets`, din `stiluri`) sau prin CSSOM. `<style>` și atributele
  `style` scrise în HTML sunt refuzate de CSP-ul moștenit (`style-src 'self'`). Variabilele temei lui cvs2 se pun pe
  rădăcina cadrului, cu aceleași nume.

### E. `HostApi` v1 (tipurile: `extensii/api.ts`)

```ts
activeaza(host: HostApi): Spatiu | Promise<Spatiu>   // Spatiu = { deschide(container: HTMLElement): void }
host.api                  // 1
host.limba, host.tema     // 'ro' | 'en'; variabilele temei (nume → valoare)
host.laSchimbare(f)       // limba sau tema s-au schimbat; întoarce dezabonarea
host.fisier(cale)         // un fișier al pachetului (Blob), sau null
host.raporteaza(eroare)   // în jurnalul local al lui cvs2, cu id-ul extensiei
host.inchide()            // cere închiderea spațiului
host.cere(serviciu, ...)  // serviciile cu permisiune (3.Xb: senderul, stocarea); în v1, fiecare cerere se refuză
```

Mesajele dintre cvs2 și cadru trec doar prin portul primit la pornire, ca `{ tip, id, … }`. Un serviciu nou intră ca
metodă a lui `cere`, cu permisiunea lui în catalog.

### F. Codul

- `src/extensii/`:
  - `zip.ts`, cititorul;
  - `pachet.ts`, manifestul și verificarea;
  - `depozit.ts`, IndexedDB;
  - `cadru.ts`, cadrul și mesajele;
  - `Extensii.tsx`, butonul, meniul și spațiul, adus după prima randare;
  - `Instalare.tsx`, ferestrele, aduse la cerere.
- `shared/cadruExtensie.ts`: încărcătorul și amprenta lui, verificată de o probă.
- `extensii/api.ts`: tipurile.
- `extensii/salut/`: extensia de probă.
- `scripts/impacheteaza-extensie.ts`: transpilează și împachetează o extensie (`.zip`).
- **Regulile de import:**
  - `src/` și `shared/` nu importă nimic din `extensii/`, afară de tipurile din `extensii/api.ts`;
  - o extensie importă din cvs2 doar `extensii/api.ts`.

## Ce am respins

- **Extensia inclusă în aplicație și doar pornită din listă:** owner-ul nu o vrea în aplicația de bază.
- **Încrederea deplină** (extensia ca modul al aplicației): o extensie de la orice adresă ar ajunge la proiecte, la cont și
  la portul mașinii.
- **Cadrul de pe o origine separată** (al doilea site Firebase, cu CSP-ul lui): `script-src` ar fi rămas neatins, dar
  costa un site de publicat și de ținut offline. Se poate redeschide.
- **Semnăturile pachetelor:** în v1, extensiile le instalează owner-ul.
- **Spațiul ținut în viață cât omul se întoarce la pânză:** în v1, × oprește extensia.

## Limite

- Modulul de intrare e unul singur: importurile relative dintre fișiere nu se rezolvă din `blob:`.
- La instalarea de la o adresă, gazda trebuie să permită CORS.
- Extensiile sunt ale browserului, nu ale contului.

## Se redeschide dacă

- vine o extensie de la altcineva decât owner-ul (semnăturile, catalogul permisiunilor arătat la instalare);
- o extensie are nevoie de stiluri scrise în HTML (atunci: cadrul pe o origine separată);
- vine `HostApi` v2.

## Probele

- `test/unit/extensii.zip.test.ts` (cititorul pe `.zip`-uri scrise de Node), `test/unit/extensii.pachet.test.ts`
  (manifestul, căile, amprentele, limitele), `test/unit/csp.extensii.test.ts` (amprenta încărcătorului, directivele noi).
- `test/e2e/extensii.spec.ts`, în Edge:
  - instalarea din fișier, de la adresă (o gazdă servită de Playwright; o descărcare căzută spusă omului) și prin link,
    la o încărcare nouă și în fila deschisă (`hashchange`);
  - meniul, spațiul și întoarcerea (din cvs2 și din extensie), păstrarea după reîncărcare;
  - izolarea, încercată din cadru: pagina lui cvs2, stocarea, rețeaua, portul;
  - acțiunile documentului oprite cât e deschis spațiul;
  - scoaterea; un pachet stricat refuzat cu motiv.
- Otrăvurile țintite (`test/otravuri/3.Xa.py`).
