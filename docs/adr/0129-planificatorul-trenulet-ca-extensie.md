# ADR 0129: Planificatorul Trenuleț ca extensie: sursele în repo, construcția, adaptoarele cadrului și descărcările

**Starea:** acceptat pe 03.11.2026 pentru felia 3.Ta, prima a pasului E2 din linia Trenuleț (worktree-ul `wip/trenulet`).
Continuă ADR 0127 (extensiile) și ADR 0128 (stocarea). Owner-ul:
- pe 02.11, „nu vreau sa fie prezent in softul vanilla, vreau sa fie instalat din link. sau dintr-un zip”: planificatorul e
  o extensie, nu o parte a aplicației. Restul liniei, „cum recomanzi tu”: sursele stau în repo (`extensii/trenulet/`) și se
  construiesc separat, iar pagina de pe claude.ai rămâne, construită din repo;
- pe 03.11, „Da, pornește E2”.

## Contextul

Planificatorul (v18) e o pagină. Scripturile lui sunt clasice, cu globalele `TrenCNC`, `TrenGCode`, `Lego`, `Profiluri` și
`Atelier3D`, iar `build.py` le pune într-un singur HTML: pe claude.ai, ca artefact; pe PC, `preview.html`. Pe claude.ai,
pagina folosește `window.claude.use('db')` (circuitele, setările) și `use('downloads')` (fișierele). Fără ele, folosește
`localStorage` și descărcarea obișnuită. Are 16 atribute `style`, în marcaj și în șabloanele scripturilor, și aduce three.js
de pe cdnjs pentru previzualizarea 3D.

Cadrul izolat al unei extensii (ADR 0127 §D) nu-i dă nimic din toate astea:
- n-are origine, deci nici `localStorage`;
- n-are rețea;
- CSP-ul moștenit (`style-src 'self'`) refuză atributele `style`;
- sandbox-ul n-are `allow-downloads`, deci nici descărcări.

## Decizia

### A. Sursele, în repo, neschimbate

`extensii/trenulet/sursa/` e copia lui `Apps/Trenulet/sursa` (v18), octet cu octet:
- planificatorul, `lego/` și `vendor/` (cavalier, earcut, cu licențele);
- testele de referință (`teste/`, CommonJS, cu un `package.json` propriu: `"type": "commonjs"`);
- `build.py` și `CITESTE_SURSA.md`.

În felia asta rămân surse JavaScript. Conversia în TypeScript vine după, cu `referinte.js --compara` la 0 diferențe.
`Apps/Trenulet/` rămâne referința; de acum, schimbările se fac în repo.

### B. Construcția fără Python

`scripts/construieste-trenulet.ts` face ce face `build.py`:
- **Pagina de sine stătătoare:** `planificator.html` (conținutul de pe claude.ai) și `preview.html` (documentul întreg),
  octet cu octet ca v18. Catalogul intră în `app.js` serializat ca de Python (`json.dumps`, compact, fără ASCII forțat).
  Numerele își păstrează felul (`40.0` rămâne `40.0`), cu `repr` din Python.
- **Pachetul extensiei** (`.tmp/extensii/trenulet-<versiune>.zip`):
  - manifestul, din `extensii/trenulet/extensie.json` (id-ul, numele, versiunea, permisiunile);
  - intrarea, `index.js`, din `intrare.ts` fără tipuri;
  - stilurile din `head.html` (`trenulet.css`) și marcajul (`body.html`);
  - cele 8 scripturi ale paginii, în ordinea ei, ca fișiere separate (`js/*.js`).

Pachetul nu intră în aplicație: se instalează, din fișier sau de la o adresă.

### C. Adaptoarele cadrului (`extensii/trenulet/intrare.ts`)

Patru adaptoare lasă pagina să ruleze neschimbată:
- **`window.claude`**, ca pe claude.ai:
  - `use('db')` dă documentele peste `host.stocare`, cu cheile `db:<colecție>/<id>`: `doc(cale).set / get / delete`,
    `collection(c).doc().id` și `collection(c).orderBy(câmp, dir).onSnapshot`. O scriere în colecție o reanunță, iar la
    pagină ajunge doar cea mai nouă citire. `stocare:plin` ajunge cu codul `quota_exceeded`, pe care pagina îl știe;
  - `use('downloads')` dă `save({ filename, data })`, peste serviciul `descarcari.salveaza` (§D).
- **`localStorage`**, peste `host.stocare`, cu cheile `ls:<cheie>`. Se citește întreg la pornire și se scrie pe loc, în
  fundal.
- **Atributele `style`:** un `MutationObserver` le pune prin CSSOM (`style.cssText`), pe care CSP-ul nu-l oprește. În
  consolă rămân refuzurile atributelor.
- **Scripturile:** după marcaj, în ordinea paginii, ca scripturi clasice din adrese `blob:`. Semantica globală e cea din
  pagină.

### D. Descărcările (`descarcari.salveaza`, permisiunea `descarcari`)

E un serviciu nou al lui `HostApi` (ADR 0127 §E). Permisiunea lui intră în catalog și se arată la instalare: „să salveze
fișiere ca descărcări (date și desene, nu programe)”.
- **Ce:** `host.cere('descarcari.salveaza', nume, date)`. Datele vin ca text (UTF-8), `ArrayBuffer`, `Uint8Array` sau
  `Blob`. Răspunsul e numele cu care s-a salvat.
- **Numele:** ultima parte a căii, cel mult 120 de caractere, cu un tip din lista albă: `zip`, `json`, `txt`, `csv`, `nc`,
  `gcode`, `ngc`, `tap`, `stl`, `3mf`, `obj`, `svg`, `dxf`, `pdf`, `png`, `jpg`. Din el se scot:
  - caracterele de control și cele de direcție (U+202E și celelalte);
  - `<>:"|?*`;
  - punctele și spațiile de la capete.
- **Mărimea:** cel mult 64 MB.
- **Unde:** cvs2 descarcă din pagina lui, printr-o legătură `blob:` cu `download`. Sandbox-ul cadrului nu dă
  `allow-downloads`, iar originea care descarcă rămâne a lui cvs2.
- **Refuzurile:** `descarcari:permisiune`, `:nume`, `:date`, `:prea-mare`, `:necunoscut`.

Încărcătorul nu se schimbă, deci nici amprenta lui și nici CSP-ul. Serviciul se cere prin `host.cere`. Un înveliș ca
`host.stocare` vine odată cu senderul (3.Xc), care schimbă oricum încărcătorul.

## Ce am respins

- **Pagina întreagă ca `srcdoc`, fără adaptoare:** scripturile inline cer `'unsafe-inline'` sau o amprentă pe fiecare
  script. CSP-ul aplicației s-ar schimba la fiecare versiune a planificatorului.
- **Schimbarea surselor în felia asta** (stilurile ca clase, textele): s-ar fi pierdut proba „octet cu octet v18” a
  construcției. Vin în felia următoare, probate cu `referinte.js --compara`.
- **`allow-downloads` în sandbox:** cadrul ar descărca orice: fără permisiune, fără listă albă, fără plafon.
- **three.js de pe cdnjs:** CSP-ul cadrului oprește rețeaua (ADR 0127 §D), iar previzualizarea 3D spune că lipsește.
  three.js poate intra în pachet, ca fișier al lui; descărcarea lui (~600 kB, MIT) cere acordul owner-ului.
- **Fără `localStorage`:** pagina știe să meargă și așa, dar ar porni de fiecare dată cu setările implicite, până răspunde
  `db`.

## Limite

- „Trimite la cvs2” nu merge din extensie: cadrul nu poate deschide o filă (`window.open` fără `allow-popups`). Planificatorul
  spune asta și oferă G-code-ul. Ieșirea CNC prin planșele lui cvs2 și senderul vin cu 3.Xc și feliile de după.
- Textul circuitelor spune că „le vezi pe telefon, tabletă sau calculator”, adevărat pe claude.ai. În cvs2, circuitele stau
  doar în browserul acesta. Felia următoare schimbă textul.
- Previzualizarea 3D lipsește până intră three.js în pachet; piesa și STL-ul merg.
- Fonturile paginii (Bricolage Grotesque, Atkinson Hyperlegible) nu vin, fiindcă cadrul n-are rețea. Rămân fonturile
  sistemului.
- Pagina e doar în română și are culorile ei, nu tema lui cvs2.
- Consola cadrului arată refuzurile atributelor `style`, câte două (CSP-ul aplicației și al cadrului), deși stilurile se
  aplică.
- Datele sunt ale browserului (ADR 0128): alt calculator nu le vede.
- O descărcare nu cere un clic proaspăt al omului: extensia e instalată de el, cu permisiunea arătată, doar tipurile din
  lista albă trec, iar Chrome cere oricum voie pentru mai multe descărcări automate.
- Testele de referință nu stau în nicio poartă. Cu sursele neschimbate, le ține proba amprentei; din felia care schimbă
  sursele, intră în poartă.

## Probele

- `test/unit/trenulet.test.ts`:
  - `repr` din Python și JSON-ul ca `json.dumps`;
  - pagina de sine stătătoare, cu amprenta lui `preview.html` din v18;
  - pachetul, citit de cvs2 ca la instalare: manifestul, permisiunile, intrarea fără importuri, marcajul, scripturile în
    ordinea paginii, cu catalogul pus.
- `test/unit/extensii.descarcari.test.ts`: numele (calea, caracterele, tipurile), datele, plafonul, permisiunea, metoda.
- `test/e2e/trenulet.spec.ts`, în Edge:
  - instalarea din fișier, cu permisiunile arătate;
  - pagina în cadru: scripturile rulate, `db` găsit, atributele `style` aplicate;
  - circuitul numit, salvat singur și redeschis după reîncărcare;
  - „Salvează fișierul .json”, ca descărcare a browserului, cu numele dat de planificator;
  - jurnalul local, fără erori.
- Testele de referință ale planificatorului (`node extensii/trenulet/sursa/teste/referinte.js --compara`): 622 comparate,
  0 diferite.
- Otrăvurile țintite (`test/otravuri/3.Ta.py`).
