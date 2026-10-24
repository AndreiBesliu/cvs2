# ADR 0062: Editarea nodurilor

**Starea:** acceptat pe 24.10.2026. Felia aleasă de asistent la „ok, continua”: următorul pas al rândului „Vectori, noduri,
boolean, offset, aliniere” din acoperire (riglele, lipirea, alinierea, desenul și transformările erau gata). **Intră în:**
etapa 6 („Editorul de vectori”), adusă în etapa 3, fără mașină. **Continuă:** ADR 0034 (forma „cale”), ADR 0050 (lipirea),
ADR 0053 (editarea formelor după plasare).

**Problema.** O formă desenată sau importată se putea muta, scala, roti și oglindi întreagă, iar dreptunghiul, cercul,
poligonul și elipsa își schimbau câmpurile din panou. Un colț mutat, un vârf în plus pe o latură sau unul scos nu se puteau
face: forma trebuia redesenată.

## Decizia

**1. O unealtă, nicio acțiune nouă.** Unealta **Noduri** (`N`, în bara de sus, după Transformare) arată nodurile (vârfurile)
căii formei alese și conturul ei. Fiecare schimbare trece prin acțiunea existentă `document.forma` (ADR 0053), care înlocuiește
forma elementului: un pas de anulare pe schimbare, aceeași validare a schemei, nimic nou în registru sau în pornire.

**2. Ce se poate edita** (`formaNoduri`, `src/app/noduriCalcul.ts`): o singură formă aleasă, a cărei piesă are un singur element
(nu un grup) și nu e folosită de altă instanță. Altfel, sfatul din colțul de jos spune motivul (nimic ales, mai multe, piesă
compusă, piesă împărțită). Dreptunghiul și cercul devin, la prima schimbare, **căile exacte ale conturului lor**
(`caleDinForma`: colțurile rotunjite și cercul rămân arce, cu aceeași cutie); celelalte forme sunt deja căi.

**3. Cele trei gesturi** (`src/model/noduri.ts`, pur, în coordonatele piesei; gestul în lume, prin inversa matricei elementului):
- **tragerea unui nod** îl mută exact în punctul lăsat, cu lipirea comună (ghidaje, foaie, forme, grilă; Alt inversează); punctele
  de control ale cubicelor vecine se mută cu același vector, deci tangentele din nod rămân paralele; arcele își păstrează bulge-ul;
- **dublu clic pe o latură** (la cel mult 6 px) adaugă un nod acolo, fără să schimbe forma: linia se împarte la t, arcul în două
  arce ale aceluiași cerc (bulge-urile `tan(θt/4)` și `tan(θ(1−t)/4)`), cubica prin de Casteljau; nodul nou e ales;
- **Delete / Backspace** pe nodul ales îl scoate (capetele unei căi deschise mereu; altfel doar dintre două linii); o cale închisă
  păstrează cel puțin trei noduri, una deschisă două. Refuzul are motivul lui în sfat. Fără nod ales, Delete șterge selecția, ca
  înainte; Esc lasă nodul ales.

**4. Ordinea tastelor.** Ascultătorii unealtei sunt în captură pe fereastră: Delete pe un nod ales nu ajunge la scurtătura
„Șterge selecția”, iar un clic pe un nod nu pornește cadrul selecției sau mutarea formei.

**5. Pornirea** nu primește nimic: unealta, sfatul și calculul stau în modulul editării (la cerere). Manualul are capitolul
„Nodurile”, iar tasta N e în capitolul scurtăturilor; poarta lui le cere.

## Respinse

- **Scoaterea unui nod de lângă un arc sau o curbă** prin aproximarea celor două segmente cu unul: schimbă forma în tăcere;
  până la o potrivire cu toleranță spusă omului, refuzul cu motiv e mai cinstit.
- **Editarea unei piese împărțite** (mai multe instanțe): schimbarea ar ajunge, nevăzută, și la celelalte; Duplică o face
  independentă.
- **Mânerele tangentelor** (punctele de control ale cubicelor, trase separat) și conversia linie ↔ curbă în aceeași felie: cer
  propriile gesturi și probe; vin după, dacă se cer.
- **O acțiune nouă `document.noduri`** în registru: pornirea are ~0,1 kB liberi, iar `document.forma` face deja exact asta.

## Se redeschide dacă

- se cer mânerele tangentelor, nodurile netede / colțuroase sau conversia unei laturi în curbă;
- se cere editarea nodurilor pe piese cu mai multe contururi (importate) sau pe mai multe forme deodată;
- scoaterea de lângă arce trebuie să păstreze forma în toleranță (cu potrivirea unui arc sau a unei cubice).
