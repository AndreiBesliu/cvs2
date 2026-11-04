# ADR 0163: three.js în pachetul extensiei, previzualizarea 3D în cvs2

**Starea:** acceptat pe 04.11.2026 pentru felia 3.Td, a liniei Trenuleț (worktree-ul `wip/trenulet`). Owner-ul: „Da,
descarcă” (la „Descarc three.js (three.min.js r128, MIT, de pe cdnjs, ~603 kB) ca 3D-ul să meargă și în cvs2?”). Închide
limita din ADR 0161: în cvs2, vederea 3D a atelierului lipsea.

## Contextul

Atelierul desenează piesele cu three.js r128. Pagina de sine stătătoare (claude.ai, copia de pe calculator) îl cere de pe
cdnjs la prima intrare în 3D. Cadrul extensiei n-are rețea: CSP-ul moștenit de la cvs2 ar refuza cdnjs, deci de la 3.Tb
atelierul nici nu-l mai cerea, iar vederea spunea de ce lipsește.

## Decizia

### A. Biblioteca, în surse și în pachet

`extensii/trenulet/sursa/vendor/three.min.js`: r128 de pe cdnjs, octet cu octet (603 445 de octeți; SHA-512 egal cu
amprenta SRI publicată de cdnjs, verificată la descărcare și fixată într-o probă), cu `three.LICENSE` (MIT) alături.
Construcția o pune în pachet ca `js/three.js`, neschimbată, și textul licenței ca `licente/three.txt`. Nu e un script al
paginii: pagina de sine stătătoare n-o include (pe claude.ai, artefactul rămâne cât era) și o cere în continuare de pe cdnjs.

### B. Adusă la cerere, de intrare

`window.cvs2.three()` (pusă de intrare, ADR 0161 §A) aduce `js/three.js` din pachet ca script clasic dintr-o adresă `blob:`,
la fel ca scripturile paginii, o singură dată, și dă `window.THREE`; fără fișier sau dacă nu se încarcă, null, cu eroarea
raportată. Atelierul o cheamă în cvs2 în locul lui cdnjs, la prima intrare în 3D: planul 2D nu plătește cei 600 kB.

### C. CSP-ul nu se schimbă

Scripturile din adrese `blob:` erau deja permise cadrului; three.js nu folosește `eval`, `new Function` sau workeri (verificat
în fișier). Probele ascultă refuzurile CSP chiar în cadru: niciunul.

## Ce am respins

- **three.js încărcat cu pagina:** 600 kB parcurși la fiecare deschidere, și pentru cine nu intră în 3D.
- **three.js în pagina de sine stătătoare:** artefactul de pe claude.ai ar fi crescut cu 600 kB; acolo cdnjs merge.
- **Un pachet npm (`three`) adus prin `npm install`:** altă versiune decât r128, pentru care e scris atelierul, și o dependență
  a aplicației pentru ceva ce stă doar în pachetul extensiei.

## Limite

- Pachetul crește la ~370 kB (+151 kB, three.js comprimat).
- Probele arată că vederea are pânza WebGL și că biblioteca vine doar la cerere; desenul însuși îl arată captura din raport
  (pixelii unei pânze WebGL nu se pot citi după afișare fără `preserveDrawingBuffer`).
- Versiunea r128 rămâne fixă: o versiune nouă cere descărcarea ei, cu acordul owner-ului, și o amprentă nouă în probă.
