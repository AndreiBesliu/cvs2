# ADR 0064: Offsetul formelor în desen

**Starea:** acceptat pe 25.10.2026. Felia aleasă de asistent la „neata, continua”: din rândul „Vectori, noduri, boolean,
offset, aliniere” al acoperirii lipseau booleanul (unirea, amânată de owner pe 20.10) și offsetul. **Intră în:** etapa 6
(„Editorul de vectori”), adusă în etapa 3, fără mașină. **Aplică:** decizia 16 din `PLAN.md` §8.1 („Offsetul unei forme cu
curbe, în desen: din arce, același motor ca CAM-ul”). **Continuă:** ADR 0033 (biarcele), ADR 0051 (uneltele de desen), ADR 0061
(panoul rețelei, ca tipar).

**Problema.** Un contur paralel (o ramă în jurul unei piese, un chenar, o adâncitură cu margine) se putea face doar cu mâna:
copiat, scalat aproximativ, cu colțurile greșite. Motorul de offset exista deja, dar doar în traseul frezei.

## Decizia

**1. Motorul CAM, nu altul** (`src/app/offsetCalcul.ts`, pur). Fiecare contur închis al selecției, luat în lume (cu matricea
lui), trece prin `offsetInchis`: aceleași gărzi, aceeași verificare a ieșirii și aceeași a doua încercare ca la traseu. Ieșirea e
exactă, din linii și arce; colțurile ocolite se rotunjesc cu raza egală cu distanța (spre exterior, cele ieșite; spre interior,
cele intrânde), celelalte rămân ascuțite. Cercul rămâne cerc (BRIEF §16).

**2. Fiecare contur după interiorul lui.** Ca la „offset vectori” din pragul de referință, fiecare contur se decalează separat
(o piesă importată cu mai multe contururi, fiecare pe al lui); contururile rezultate nu se unesc între ele (asta e booleanul).
Un contur care se rupe în bucăți (un gât strâmt spre interior) dă mai multe forme. Formele deschise se sar, numărate în panou;
doar deschise = refuz cu motiv. Un contur refuzat de motor oprește tot (nimic pe jumătate): interiorul care dispare e „prea
mică pentru distanța cerută”, restul „n-a reușit”.

**3. Forme noi, independente.** Fiecare contur iese ca o cale nouă (o piesă cu un element, originea în primul vârf), cu operația
implicită a unei forme închise; originalele rămân. Toate intră printr-un singur pas de anulare și sunt alese după Aplică.

**4. Nicio acțiune nouă.** `document.deseneaza` primește, pe lângă o formă, o listă (`formaNoua` → `FormaNoua | FormaNoua[]`):
comenzile `adauga` intră într-un `lot`, plafoanele se judecă pe totul, iar documentul de după trece de schemă. Verdictul ei
(`motivDesen`: doar citire, plafonul, schema) e și cel al panoului, înainte de Aplică. Intrarea din registru e neschimbată, deci
pornirea nu primește nimic.

**5. Panoul** stă în extensia barei, lângă Copiere (butonul cu un pătrat într-un contur punctat): sensul (spre exterior / spre
interior), distanța (0,01–1000 mm; rezoluția modelului e 0,01), motivul, câte forme deschise se sar, Aplică și Închide.
Formularul se ține în browser. Cât panoul e deschis, contururile noi se văd pe pânză, punctat. Esc îl închide. Panoul (ca și
cel al rețelei) rămâne în fereastră: dacă iese pe dreapta (o fereastră îngustă), se mută spre stânga cât iese. Calculul (și
motorul, ~85 kB) se aduce abia la prima deschidere a panoului; dacă nu vine, panoul spune.

## Respinse

- **Colțurile ascuțite sau teșite la exterior** (prelungirea laturilor): motorul face doar arce, ca freza; un colț ascuțit
  ar cere altă construcție și altă verificare. Se poate adăuga ca opțiune, cu proba ei.
- **Offsetul căilor deschise** (un contur închis în jurul liniei sau o paralelă pe o parte): motorul deschis există (ADR 0037
  §5), dar întrebarea „ce parte, ce capete” cere o decizie a owner-ului.
- **Unirea contururilor rezultate care se suprapun**: e booleanul, amânat de owner.
- **O acțiune nouă `document.offset`** în registru: pornirea cu ușa e la 99,9 / 100 kB, iar `document.deseneaza` face deja asta.

## Se redeschide dacă

- se cer colțurile ascuțite / teșite sau offsetul căilor deschise;
- se cere offsetul unei regiuni întregi (conturul exterior în afară, găurile înăuntru), după boolean;
- motorul trebuie mutat într-un worker (selecții foarte mari care țin firul principal).
