# ADR 0168: Înălțimile pieselor LEGO, la zecimi, în profilul imprimantei

**Starea:** propus pe 08.11.2026, la cererea owner-ului: „plugin-ul 3d care face piesele de lego are o problema, stifturile
pe care le face si gaurile de sub piesa sunt prea mici, raza este ok, dar inaltimea este putin prea mica. pare ca are nevoie
de o zecime de milimetru pentru stifturi”, apoi „vreau sa pot edita eu inaltimile la zecimi de milimetri sa pot salva ca
profil pentru tot plugin-ul”. **Completează:** ADR 0129 (Planificatorul ca extensie), ADR 0164 (pluginul ca parte din cvs2).

**Ce e azi.** Motorul atelierului (`extensii/trenulet/sursa/lego/lego.ts`) are știftul de Ø 4,8 mm și **1,8 mm înălțime**
(`stift_h`, fix); locașul rotund de sub o piesă plină e adânc de **știftul + 0,2 = 2,0 mm** (scris `P.stift_h + 0.2` în șapte
locuri), iar golul de sub o piesă cu tuburi merge până la capac (2,2 mm la o placă). Calibrarea are cinci variante pentru
diametre și jocuri (știftul, locașul, găurile, axul, bara, cupa), fiecare un număr întreg, ținute în **profilul imprimantei**
(`CHEI_IMPRIMANTA` din `planificator/atelier.ts`): patul, marginile, variantele, cuplajele pieselor de cale. Înălțimile nu se
pot schimba, iar citirea unui profil rotunjește orice valoare care nu e variantă la milimetri întregi.

## Propunerea

1. **Două înălțimi noi în fiecare profil de imprimantă**, în mm, la zecimi (câmpul cu − / +, pasul 0,1), lângă variantele
   de la calibrare (în Setări și în fila Calibrare):
   - **Înălțimea știftului**, implicit 1,8 (lângă ea, de referință: știftul LEGO are 1,7);
   - **Adâncimea locașului**, implicit 2,0, cu bifa **„Urmează știftul (+ 0,2)”**, pornită: locașul crește odată cu
     știftul; oprită, adâncimea se scrie singură. Amândouă felurile stau în aplicație, alese din bifă.
2. **Profilul e al întregului plugin:** ce scrii acolo se aplică tuturor pieselor (cărămizi, plăci, pante, Technic, cleme,
   piesele din cvs2), cu imprimanta aleasă, ca variantele de azi; fiecare imprimantă își ține înălțimile ei, iar pagina se
   deschide cu cea implicită (★). Profilul se salvează unde se salvează azi (datele pluginului din cvs2 și din claude.ai).
3. **Motorul:** `stift_h` și un `locas_h` nou vin din profil; cele șapte locuri cu `stift_h + 0.2` folosesc `locas_h`.
   Marginile: știftul 1,0–3,0 mm, locașul 1,0–4,0 mm (și, ca azi, nu mai adânc decât piesa: înălțimea ei − 0,8). Citirea
   profilului rotunjește înălțimile la 0,1 mm, nu la milimetri întregi.
4. **Setul de calibrare** primește o placă nouă: cinci știfturi de 1,6 / 1,7 / 1,8 / 1,9 / 2,0 mm, numerotate ca variantele,
   cu locașurile pe măsura lor dedesubt. Printezi placa, vezi care știft se prinde bine în piesele LEGO adevărate și scrii
   valoarea în profil.
5. **Versiunea pluginului** urcă (18.8.0); biblioteca o servește, iar în cvs2 apare „Actualizează la 18.8.0” în meniul
   Extensii. Profilurile vechi, fără înălțimi, se deschid cu implicitele.

## Schița (fila Calibrare și Setări → Imprimanta)

```
Imprimanta  [ K1C ★ ▾ ]  [Nouă]  [Redenumește]  [Șterge]
Variantele de la calibrare
  Știftul [3]  Locașul [3]  Gaura [3]  Axul [3]  Clema / bara [3]  Cupa [3]
Înălțimile (mm, la zecimi)                                   ← nou
  Înălțimea știftului   [ 1,9 ]  [−] [+]    știftul LEGO: 1,7
  Adâncimea locașului   [ 2,1 ]  [−] [+]    ☑ Urmează știftul (+ 0,2)
                                            [Înapoi la implicite]
```

## Întrebarea (ce se exclude)

1. **Implicitele:** a) rămân 1,8 / 2,0 (măsurile de azi; tu scrii 1,9 / 2,1 în profilul imprimantei tale, sau valoarea găsită
   pe placa de calibrare) — recomandarea; b) devin 1,9 / 2,1 pentru orice profil nou (piesele de azi ies cu 0,1 mm mai înalte
   oriunde, iar referințele motorului se refac).

## Probele

Referințele motorului (`referinte.js --compara`) rămân aceleași cu implicitele (a); un test pe hârtie pentru fiecare formă de
fund (știftul la `stift_h`, locașul la `locas_h`, marginea „înălțimea piesei − 0,8”), citirea profilului (zecimile, marginile,
profilul vechi fără înălțimi), proba e2e a câmpurilor și a bifei, placa de calibrare nouă (cinci înălțimi), versiunea în
bibliotecă, otrăvurile pe calea înălțimilor.
