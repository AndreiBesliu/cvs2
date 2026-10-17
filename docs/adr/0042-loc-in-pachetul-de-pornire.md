# ADR 0042: Loc în pachetul de pornire: codul ferestrelor vine cu ele

**Starea:** acceptat pe 17.10.2026, odată cu felia „loc în pachetul de pornire” (pornită la „atunci tu continua”, după
2.8e), cu remedierile recenziei (secțiunea „Recenzia”). **Intră în:** etapa 3, felie fără mașină (`PLAN.md` §4.6, punctul 7). Nu schimbă nicio
decizie de până acum: plafonul de 100 kB (`PLAN.md` §4.4), React, valibot (ADR 0016) și ușa documentului rămân.

**Problema.** Pornirea ajunsese la 99,1 / 100 kB: orice funcție nouă de interfață s-ar fi lovit de plafon. Ținta: loc
sub plafon, fără schimbare de comportament pentru om.

## Decizia

**1. Pornirea e o singură bucată.** `vite.config.ts`: `codeSplitting.groups = [{ name: 'pornire', tags: ['$initial'] }]`
(tot ce importă static intrarea) și `modulePreload: { polyfill: false }` (browserele țintă îl au nativ). Fără grup, un
modul împărțit de pornire și de o bucată la cerere ieșea într-o bucată comună, preîncărcată: o mutare la cerere adăuga o
cerere la pornire, în loc să scoată octeți.

**2. Ferestrele își aduc codul.** Dialogul exportului vine legat de document (`ExportConectat.tsx`: rândurile operațiilor,
harta operațiilor noi de la Exportă), iar al importului legat de coadă (`ImportConectat.tsx`: citirea, recitirea
Illustrator la 72 px, contorul cererilor, locul fiecărei piese). Aplicația ține doar coada (`{ fisiere, punct }`), garda
„doar citire” și inerția.

**3. Calculul acțiunilor ferestrelor vine cu ele** (`src/ui/actiuniDocumentCalcul.ts`): importul, operațiile din dialogul
de export, poziția, rotirea și foaia din panou. Registrul (`ACTIUNI_DOCUMENT`) păstrează id-ul, eticheta, capabilitatea și
gărzile ieftine, în aceeași ordine; bara, paleta și scurtăturile văd aceleași motive fără calcul (paritatea e probată pe
o matrice de contexte). **Starea globală:** modulul calculului se înregistrează în registru la evaluare
(`inregistreazaCalcul`), cum intră mesajele unui modul la cerere în dicționare (`adaugaMesaje`). Îl importă static
`ExportConectat`, `ImportConectat` și `PanouProprietati`. Cu garda trecută (datele ferestrei date) și fără calcul,
acțiunea **aruncă**: e o greșeală de cod, nu „nimic ales”.

**4. Schemele documentului stau în modulul lor** (`src/model/schemaDocument.ts`, mutate neschimbate din `document.ts`):
le folosesc doar ușa (`incarcare.ts`) și calculul de la punctul 3. `document.ts` păstrează tipurile, plafoanele și
numărătoarea, fără valibot. Valibot rămâne în pornire cât îl folosește `config.ts`.

**5. Dicționarul limbii active vine la cerere, înaintea primei randări** (`t.ts`: `incarcaLimba`, o dată pe limbă; un
eșec se poate cere din nou). `main.tsx` pornește cererea la nivelul modulului, fără `await` sus, și o așteaptă în
`porneste`, cu `config.json`. Limba aleasă pleacă prima și **nu se abandonează**: dacă întârzie peste 4 s sau cade (cu
intrarea `promisiune` în jurnal), pleacă și cealaltă, iar aplicația pornește cu prima venită; dacă cea aleasă sosește
după ea, interfața trece singură pe ea (cât omul n-a ales între timp o limbă). Eșec doar când cad amândouă sau trec 30 s
fără niciun dicționar: atunci o pagină statică în ambele limbi, fiecare jumătate cu `lang`-ul ei, cu focusul pe
Reîncarcă (nu o pagină albă). `schimbaLimba` refuză o limbă fără dicționar; `alegeLimba` schimbă limba abia după ce a
venit dicționarul și **doar pentru ultimul clic** (un dicționar sosit târziu nu acoperă un clic dat după el). Aplicația
aduce ambele dicționare în fundal, la 1 s.

**6. Alegerea cu clicul vine la cerere** (`src/ui/actiuniAlegere.ts`: `instantaLa`, cu distanța la contur), cerută la
montarea aplicației. Un clic dat înainte de sosire golește selecția pe loc și se aplică la sosire, doar ultimul, doar pe
același document și aceeași selecție, și tot prin ușa aplicației (`dinNou`: garda „dialog deschis”). O tragere începută
între timp mută forma din clipa în care apare selecția, cu deplasarea măsurată de la apăsare. **Limite acceptate**
(recenzia, gravitate scăzută; fereastra măsurată după apariția interfeței: ~1 s pe Fast 3G, ~4 s pe Slow 3G): o tragere
**terminată** înainte de sosire nu mută nimic (forma iese doar aleasă), iar o tastă dată imediat după clic (Delete) nu
găsește selecția, golită pe loc. Golirea e alegerea sigură: păstrată, selecția veche ar lua tasta în locul formei
clicate.

**7. Orientarea conturului e separată de nucleu.** `src/geom/conturBaza.ts` ține tipurile, primitivele, segmentele, cercul
arcului, dreptunghiul și cercul (le importă pornirea); `contur.ts` reexportă nucleul și adaugă aria cu semn, inversarea și
sensul trigonometric (CAM-ul, offsetul, nonzero, la cerere). Importurile CAM-ului și ale testelor nu se schimbă.

**8. Poarta numără cinstit** (`scripts/build-determinist.ts`): `index.html` cere exact un script; dicționarul limbii
active (cel mai mare) se adună la pornire, iar build-ul are exact două bucăți de limbă; schemele și orientarea nu sunt în
bucata de pornire (marcaje de text care trebuie să existe în altă bucată); alegerea cu clicul aduce cel mult 3 kB în
afara pornirii; ușa unui proiect salvat are plafonul ei, **8 kB**, iar pornirea cu ușa cel mult **100 kB** (ușa e cerută
la fiecare pornire, `proiectLocal.ts`, deci omul cu proiect salvat o așteaptă înaintea primei randări). Fiecare plasă e
probată cu o sabotare (ușa: un import static al offsetului în `incarcare.ts` o duce la 30,2 kB, pornirea cu ușa la
122,5 kB, iar poarta iese cu 1).

## Cifrele (măsurate, gzip 9)

- Pornirea, cu dicționarul: 99,1 → **92,3 kB** (bucata de pornire 90,2 + dicționarul 2,1), după remedierile recenziei.
- Cu un proiect salvat, înaintea primei randări: 99,1 + ușa 2,4 = 101,5 → 92,3 + ușa 4,6 (`incarcare` + `schemaDocument`)
  = **96,9 kB**. Ușa a crescut cu schemele: pentru omul care revine, câștigul e mai mic decât la prima vizită.
- Totalul fără `/admin`: 189,2 → 192,6 kB (plafon 300).

## Ce impune

- O fereastră care dă datele uneia dintre cele cinci acțiuni își importă calculul (`import '../ui/actiuniDocumentCalcul.ts'`);
  testele unitare ale acțiunilor la fel; testele care cer texte importă `test/unit/limbi.ts`.
- La orice redenumire a unei bucăți: `grep "route(" test/e2e` (o rută veche nu mai oprește nimic).
- Edge ține eșecul unui `import()` în harta modulelor până la reîncărcare: codul cere din nou (limba, alegerea), dar
  browserul răspunde cu același eșec. O bucată care nu vine se repară doar prin reîncărcare (ca dialogurile, „Fereastra
  nu s-a putut încărca”).
- **Workerul PWA (ADR 0017)**, când vine, ține în cache ambele dicționare și toate bucățile la cerere: offline, limba
  cealaltă, ferestrele și alegerea cu clicul altfel nu vin.
- `actiuniExportCalcul-*.js` își schimbă amprenta la orice schimbare a pornirii (se descarcă din nou după publicare).

## Recenzia (17.10, în același workflow)

Patru verificatori independenți, pe arborele feliei, cu probe în Edge pe o copie a `dist/`. Remediate, fiecare cu proba
lui, care pică pe sabotajul remedierii (`test/e2e/la-cerere.spec.ts`):
- **medie:** limba aleasă era abandonată după 4 s, iar a doua pornea abia atunci, cu încă 4 s: pe o rețea cu cereri de
  4,5 s apărea pagina „fără texte” deși dicționarul venise. Acum §5 (limba nu se abandonează; termenul total 30 s).
- **scăzută:** aceeași cauză: dicționarul ales, sosit puțin după termen, era ignorat toată sesiunea. Acum interfața trece
  pe limba aleasă când sosește.
- **scăzută:** clic EN (dicționarul pe drum), apoi RO: EN sosea și acoperea alegerea, salvată și pentru sesiunile
  următoare. Acum câștigă ultimul clic.
- **scăzută:** pagina „fără texte”: titlul și butonul bilingve fără `lang`, focusul pe BODY. Acum fiecare jumătate are
  `lang`-ul ei, focusul e pe Reîncarcă.
- **medie:** otrava C01 (`2.3c-a.py`) devenise VOID (textul ei s-a mutat în `conturBaza.ts`); repusă pe fișierul nou.
- **scăzută:** ușa unui proiect salvat se afișa fără plafon. Acum §8 (8 kB; pornirea cu ușa ≤ 100 kB).

Rămân, scrise la §6: tragerea terminată și tasta dată înaintea sosirii alegerii.

## Respinse (pe scurt)

- `config.json` validat fără valibot (−2,3 kB): contrazice ADR 0016 și mută valibot în ușă (pentru proiectul salvat,
  câștig zero); rămâne decizia owner-ului.
- Validarea configurației, proiectul local și pânza la cerere, așteptate înaintea randării: mută cifra plafonului, nu
  octeții dinaintea primei randări, și adaugă importuri fără termen.
- React → Preact: o decizie de ADR, nu o mutare mică.

## Se redeschide dacă

- pornirea trece din nou de ~95 kB (atunci: `config.json` fără valibot, la decizia owner-ului, sau React → Preact);
- un clic dat în primele clipe se simte (măsurat pe o rețea strangulată): atunci alegerea revine în pornire.
