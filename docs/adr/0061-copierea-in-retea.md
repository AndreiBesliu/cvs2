# ADR 0061: Copierea în rețea și pe cerc

**Starea:** acceptat pe 24.10.2026. Felia aleasă de asistent la „continua”: următorul pas al rândului „Transformare și
copiere” din acoperire (mutarea, scalarea, rotirea și oglindirea erau gata). **Intră în:** etapa 6 („Editorul de vectori”;
proba etapei cere și „rețele”), adusă în etapa 3, fără mașină. **Continuă:** ADR 0052 (transformările), ADR 0054 (oglindirea),
ADR 0059 (selecția multiplă).

**Problema.** Ca să pui pe foaie mai multe bucăți la fel (o placă de piese, găurile de pe un cerc), singura cale era Duplică,
de mai multe ori, cu mutări de mână: lent, imprecis, câte un pas de anulare pe copie.

## Decizia

**1. O acțiune, un pas.** `document.copiaza-in-retea` (în registru, cu calculul la cerere) face toate copiile selecției într-un
singur pas de anulare. Fiecare copie are piesa ei (ca la Duplică), deci se poate schimba sau transforma separat. După copiere
sunt alese originalele și copiile (rețeaua se mută apoi întreagă).

**2. Două feluri** (`src/model/retea.ts`, pur): o copie e o mișcare rigidă (rotirea în jurul unui centru, apoi translația).
- **Rânduri și coloane**: originalul în colțul stânga-jos, copiile spre dreapta și în sus, la pasul cutiei selecției plus
  spațiul dintre copii (mm, între cutii, nenegativ). Între 2 și 1000 de forme, cu originalul; câte cel mult 100 pe direcție.
- **Pe cerc**: 2–360 de forme, cu originalul, în jurul unui centru (gol în panou: centrul foii); pe 360° la pas egal, pe mai
  puțin cu capetele incluse; cu „Rotește copiile”, fiecare copie se rotește odată cu poziția (rotirea instanței crește cu
  unghiul, exact la multiplii de 90°); fără, doar se mută, cu centrul cutiei pe cerc.

**3. Panoul** din extensia barei (secțiunea Copiere, butonul cu patru pătrate): felul, câmpurile (cu punct sau virgulă),
motivul pentru care nu se poate (valorile, apoi verdictul acțiunii: nicio selecție, doar citire, plafonul documentului, copii
prea departe; același calcul ca acțiunea, `motivCopiereRetea`), Copiază și Închide. Formularul se ține în browser. Cât panoul
e deschis, cutiile copiilor se văd pe pânză, punctat. Esc îl închide.

**4. Pornirea** primește doar intrarea acțiunii în registru și eticheta ei (zeci de octeți; pornirea cu ușa rămâne 99,8 / 100);
panoul, previzualizarea și calculul stau în modulul editării și în calculul acțiunilor, la cerere. Manualul (capitolul
transformărilor) o descrie; poarta lui o cere.

## Respinse

- **Copiile ca instanțe ale aceleiași piese** (copii legate): transformările și oglindirea refuză o piesă împărțită, deci
  copiile n-ar mai putea fi lucrate separat.
- **Pasul în loc de spațiu**: pentru o placă de piese contează golul dintre ele (cel puțin freza), nu distanța dintre colțuri.
- **Previzualizarea cu contururile reale**: la 1000 de copii, prea grea pentru fiecare tastă; cutiile arată locul și rotirea.

## Se redeschide dacă

- se cere copierea de-a lungul unei curbe sau înclinarea (rândul din acoperire le are);
- o rețea trebuie să rămână legată (o schimbare pe original să ajungă la toate copiile).
