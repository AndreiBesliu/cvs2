/**
 * ORACOLUL ușii SVG (felia 2.7c, ADR 0035), cu ZERO importuri din `src/`. Cititorul e scris aici din nou, din textul
 * ADR-ului (și din SVG 1.1 / SVG 2, unde ADR-ul le citează), nu din codul aplicației: unitățile, pagina, `viewBox` cu
 * `preserveAspectRatio`, gramatica transformărilor, gramatica datelor căii (BNF SVG 1.1, erorile după SVG 2), formele SVG 2,
 * F.6.5 / F.6.6, ascunderea, `switch`, spațiile de nume, entitățile, raportul (§10) și imbricarea (§8). Parserul XML e
 * `@xmldom/xmldom`; aplicația primește ACELAȘI parser (`parserTest`), ca mediul să fie același, nu codul.
 *
 * Geometria exactă (în mm, Y în sus): liniile și cubicele trec prin M; arcele (din `A`, colțurile lui `rect`, `circle`,
 * `ellipse`) sunt păstrate ca arce parametrice exacte E(θ) = c + u·cos θ + v·sin θ (imaginea afină a cercului unitate),
 * fie că aplicația le scrie ca arce (cerc sub similitudine), fie ca cubice (eliptice sau plate). Pe lângă geometria exactă,
 * oracolul construiește și ce cere ADR-ul să iasă (vârfurile: arcul cu `bulge`, împărțit peste 180°, cubicele standard ale
 * arcelor eliptice cu n = ⌈|Δθ| / φ⌉), ca să judece structura: ordinea, startul, tipurile, numărul de cubice.
 *
 * Ce judecă (`judecaRezultat`):
 * - refuzul (codul) sau, pe `ok`: pagina, `px`, `illustrator`, cele 20 de numere ale raportului în afară de cele nonzero
 *   (exact), numărul
 *   căilor și, pe fiecare cale: `forma`, `nume`, tipurile segmentelor în ordine (deci startul și sensul), fiecare vârf la
 *   toleranța lui, semnul și valoarea `bulge`, punctele de control ale cubicelor din fișier, nicio linie nulă, nicio cubică
 *   cu cele patru puncte egale, nicio rază de arc peste 10 000 mm; apoi distanța în AMBELE sensuri dintre fiecare segment
 *   exact și bucățile aplicației care îl scriu, eșantionată și rafinată local (secțiunea de aur în jurul fiecărui maxim
 *   local), la toleranța ADR-ului: 1e-9 × mărimea desenului (linii, cubice), 1e-7 × raza (arce de cerc), `TOLERANTA_IMPORT`
 *   (arce eliptice și plate), plus golul închiderii (≤ `TOLERANTA_IMPORT`) pe ultimul segment al unei subcăi închise prin
 *   apropiere;
 * - latura (§8): adâncimea pe geometria exactă, cu includerea `evenodd` proprie (raza spre +x; linia semideschisă, cubica
 *   tăiată în bucăți monotone pe y la rădăcinile lui B′y, arcul tăiat la extremele lui y; traversarea prin bisecție);
 * - piesa (§8): grupul `g`, elementele c1…cN, coordonatele minus colțul cutiei exacte, instanța, operațiile;
 * - felia 2.7d (ADR 0036, ADR 0035 §4, §8, §10): fiecare formă UMPLUTĂ cu regula efectivă nonzero se normalizează.
 *   Oracolul nu refface aranjamentul: pe citirea 2.7c a formei decide (`analizaNonzero`) dacă trebuie schimbată (regiunea
 *   nonzero ≠ evenodd mai departe de τ, sau muchii coincidente); o formă schimbată de aplicație o judecă oracolul
 *   normalizării (`./nonzero.ts`: regiunea, geometria din bucățile citirii, la toleranța citirii, topologia, umplerea în
 *   stânga), iar `nonzero-normalizate` = formele schimbate, `nonzero-refuzate` între cele de schimbat rămase ca în 2.7c și
 *   toate cele rămase. Stilurile (`./svg.stil.ts`): atribut < reguli simple din `<style>` < `style`, cu `fill`, bugetul
 *   potrivirilor (`plafon` / `css`) și `stil` doar pe o regulă necitită. Plafonul vârfurilor se judecă întâi pe intrare.
 *   Amendamentul §6 (K7): o formă deja evenodd se schimbă doar cu un martor la τ (`martorTau`); una cu martor și fără nicio
 *   sondă umplută dincolo de τ (mai subțire decât τ peste tot) e prezisă goală, numărată `nonzero-normalizate` (ca forma cu
 *   regiunea vidă), dar poate și să rămână: refuzul `gol` al oracolului poartă atunci `alternativ`, rezultatul în care rămâne.
 * - sub-felia 2.3c-1 (ADR 0037 §11, prima parte; amendează ADR 0035 §7, §10), pe fiecare subcale a unui `path`, `polyline`
 *   sau `polygon`, în ordinea: plafonul căii (la citire) → închiderea (cu `Z`, sau golul ≤ `TOLERANTA_IMPORT`: ca în 2.7c,
 *   fără număr nou; fără `Z`, cu golul peste `TOLERANTA_IMPORT`: o formă UMPLUTĂ (`fill` efectiv ≠ `none`, moștenit) se
 *   închide cu o linie; una cu `fill: none` și golul ≤ `REZOLUTIE` = 0,01 mm se închide cu o linie; altfel rămâne
 *   deschisă, `deschise`) → degenerata (o subcale închisă de ușă care iese degenerată rămâne deschisă, `deschise`; una
 *   închisă cu `Z` sau prin apropiere, `degenerate`, ca în 2.7c) → PRAFUL (diagonala cutiei exacte a subcăii, în mm, sub
 *   0,01 mm: sărită, `sub-rezolutie`, oricum s-ar fi închis) → numărul închiderii (`inchise-de-umplere`,
 *   `inchise-la-usa`). Căile închise de ușă intră în normalizarea nonzero și în imbricare ca orice cale închisă. Căile
 *   deschise rămâneau sărite (le importă 2.3c-3, mai jos). Jurnalul subcăilor (`subcai`: soarta, golul, diagonala) servește testelor pe
 *   fișiere reale.
 *
 * Alegerile mele unde ADR-ul tace (le spun și în raport; corpusul le ocolește unde se poate):
 * - lungimea CSS: spațiile XML de la capete se taie; numărul ca în §5 (fără „1.”); unitatea fără deosebire de majuscule;
 * - pagina (revizia 12.10): cu `viewBox` și o singură lungime, cealaltă din raport; `px` = fără `viewBox`, nicio latură dată,
 *   sau o latură dată în px / fără unitate;
 * - `illustrator` (revizia 12.10): un comentariu din primii 16 KiB conține „Adobe Illustrator” (ALEGERE: 16 Ki caractere ale
 *   textului decodat, nu octeți);
 * - elementele `style` se citesc oriunde în document (și în `defs`: acolo stă la Illustrator), în ordinea documentului;
 * - `fill-rule`, `fill` și `visibility` se moștenesc (proprietăți CSS moștenite, ca în SVG); din `style` câștigă ultima
 *   declarație;
 * - transformările: separatorul dintre ele e opțional (revizia 12.10); argumentele separate de comma-wsp;
 * - cercul și elipsa: două arce de 180° (ADR 0034: „cercul devine o cale din două arce”); pentru elipse (și cercul sub o
 *   matrice care nu e similitudine) comparația acceptă și varianta SVG 2 cu patru sferturi (`varianta`), și spune care;
 * - n = ⌈|Δθ| / φ⌉ (cel mai mic n cu bucăți de cel mult φ); arcele scrise ca cubice se numără la conversie (și cele ale
 *   unei subcăi care apoi se sare: corpusul nu are așa ceva);
 * - o subcale doar cu `M` (fără segmente, fără `Z`) se sare fără număr; una cu `Z` sau cu segmente, rămasă sub 2 vârfuri,
 *   e `degenerate`;
 * - matricea singulară: |det| / max(|col1|, |col2|)² ≤ 1e-12; similitudinea: 1e-12 × max(|col1|, |col2|) (revizia 12.10);
 * - entitățile (revizia 12.10): codul primei probleme, în ordinea număr → formă (în ordinea declarațiilor) → ATTLIST →
 *   expansiune; „neterminată” = ghilimeaua nu se închide sau după valoare nu urmează `>`;
 * - bugetul includerilor: candidatul vizitat 1, includerea măsurată (punctul în cutia lui) câte vârfuri are; corpusul stă
 *   departe de margine (4 000 de săgeți: ~4·10⁷; 1 000: ~2,5·10⁶);
 * - atributele opționale ale formelor (x, y, cx, cy, x1…) care nu se pot citi sar forma (`atribut-invalid`);
 * - ordinea verificărilor pe o formă: ascunsă → transformare → atribute → singulară;
 * - „segmentul nul exact” (§7) se judecă în coordonatele formei (două puncte diferite pot ajunge în același double după M:
 *   linia rămâne, ca la aplicație);
 * - `prea-mari` / plafonul de lucru (precizarea 12.10): vârfurile citite ale unei subcăi = bucățile ei (una pe linie /
 *   cubică / arc, două pe arcul împărțit, n pe arcul scris ca cubice), numărate înainte de închidere; corpusul stă departe
 *   de margine;
 * - refuzul `plafon` nu-și judecă raportul (numerele de la oprire țin de ordinea citirii).
 * Alegerile sub-feliei 2.3c-1 (ADR 0037 §11; le spun și în raport):
 * - ordinea noilor coduri: lista din „Raportul” (`inchise-de-umplere`, `inchise-la-usa`, `sub-rezolutie`); locul lor în
 *   listă nu e scris, deci (regula coordonatorului) stau la coada listei, după `stil`;
 * - praful se judecă DUPĂ degenerată: o subcale care e și degenerată și praf (`M … Z` fără segmente, un `polygon` dintr-un
 *   punct, o linie nulă închisă; logoul AS Roma are una) rămâne `degenerate`, ca în 2.7c (ADR 0035 §7 o numește așa, iar
 *   ADR 0037 nu o mută); altfel regula „mai puțin de 2 vârfuri” n-ar mai fi atinsă niciodată (orice subcale închisă cu un
 *   vârf are cutia nulă). Praful prinde subcăile adevărate, dar mai mici decât rezoluția (un triunghi de 1e-4 mm), închise
 *   cu `Z` sau de ușă; una deschisă și degenerată după închidere (o linie de 1e-4 mm umplută) rămâne `deschise`;
 * - cutia prafului e cutia EXACTĂ a subcăii (cu extremele curbelor), în mm, cu punctul de start; corpusul nu are curbe
 *   lângă prag (vârfurile, punctele de control sau curba exactă dau aceeași decizie);
 * - `line` NU trece prin regula prafului: e „mereu deschisă, oricât de scurtă” (ADR 0035 §4) și, în 2.3c-3, „orice line”
 *   devine cale deschisă, cu regula ei de degenerare (lungimea sub 0,01 mm), care altfel n-ar mai fi atinsă niciodată;
 *   în 2.3c-1 o `line` rămâne `deschise`, oricât de scurtă;
 * - „subcalea fără Z” a regulilor noi e cea cu golul peste `TOLERANTA_IMPORT`: sub el, subcalea e deja închisă (ADR 0035
 *   §7), fără linie adăugată, deci fără număr;
 * - o subcale cu `fill: none` și golul ≤ 0,01 mm care iese degenerată după închidere rămâne deschisă, ca la umplere
 *   (ADR-ul o scrie doar la umplere; corpusul o ocolește);
 * - plafonul căii (ADR 0035 §7) se judecă și pe linia de închidere adăugată de ușă: o subcale fără loc pentru ea e
 *   `prea-mari`, ca la `Z` (nu `deschise`);
 * - `inchise-la-usa` vine „cu golul cel mai mare”: oracolul îl dă în `golLaUsa` (mm), dar nu-l judecă la aplicație
 *   (contractul nu-i numește câmpul; precizarea 13.10 l-a scos: textul raportului spune pragul).
 * Precizarea 13.10 (ADR 0037 §11, „Praful”): ordinea de mai sus e adoptată (cutia exactă a subcăii închise; `M…Z` rămâne
 * degenerată; `line` nu e niciodată praf), iar praful se judecă și pe contururile IEȘITE din normalizarea nonzero: un
 * contur al ieșirii cu diagonala cutiei exacte sub 0,01 mm se sare, numărat la `sub-rezolutie`. Oracolul nu reface
 * normalizarea, deci: `avertismente['sub-rezolutie']` prezice doar subcăile-praf; la fiecare formă normalizată, oracolul
 * normalizării (opțiunea `praf`) iartă exact contururile de praf ale regiunii adevărate (găsite cu aranjamentul local),
 * cere ca niciun contur sub rezoluție să nu rămână și le numără; `judecaRezultat` cere `sub-rezolutie` = subcăile-praf +
 * contururile găsite (iar când aplicația numără altfel, le caută pe toate, în fiecare încrucișare: `prafAdevarat`).
 * - sub-felia 2.3c-3 (ADR 0037 §11, partea a doua; amendează ADR 0035 §7, §8, §10): căile deschise se importă. Devin căi
 *   deschise (`inchis: false`): subcăile fără `Z` cu `fill: none` și golul peste 0,01 mm, orice `line`, `polyline`-urile cu
 *   `fill: none` care nu se închid, și subcăile pe care închiderea ușii (umplerea, golul sub rezoluție) le-ar face
 *   degenerate („rămâne deschisă”). Calea are vârfurile subcăii plus vârful final (capătul ultimului segment), cu segmentul
 *   `L`; plafonul căii (50 000) se judecă cu vârful final inclus. E degenerată (sărită, `degenerate`) cu mai puțin de 2
 *   vârfuri distincte sau cu lungimea sub REZOLUTIE. Căile deschise nu intră în imbricare (nu conțin nimic, latura lor e
 *   `pe-linie`) și nici în normalizarea nonzero; nu sunt niciodată praf. `deschise` numără căile deschise IMPORTATE.
 *   Refuzul `gol` = nicio cale (un fișier doar din linii se importă). Piesa primește a treia operație, `deschise` (apoi
 *   `deschise-2` … peste `noduriOperatie`): pe linie, adâncimea min(1 mm, grosimea foii / 2) într-o trecere, urcare, freza
 *   foii, fără urechi, rampă, intrări și colțuri; elementul păstrează `inchis: false`.
 * Alegerile sub-feliei 2.3c-3 (ADR 0037 §11; le spun și în raport):
 * - în rezultatul ușii, o cale e deschisă dacă are `inchis: false`; lipsa câmpului sau `true` = închisă (câmpul formei din
 *   documentul v10, ADR 0037 §2). Orice altă valoare e o greșeală;
 * - vârful final se judecă separat: segmentul lui trebuie să fie `L` (ADR 0037 §2), poziția la toleranța ultimului segment;
 * - lungimea căii deschise e a geometriei EXACTE (curbele integrate numeric); vârfurile distincte = puncte egale exact, în
 *   mm; corpusul stă departe de prag cu curbele (pragul se probează pe linii);
 * - ordinea pe o cale deschisă: plafonul (cu vârful final), apoi degenerarea; vârful final nu se numără în plafonul de lucru
 *   (ca linia de închidere), iar arcul păstrează locul lui (ca pe al liniei de închidere);
 * - segmentele nule exact se scot și pe căile deschise (ADR 0035 §7 e scris pe subcăi); o `line` nulă e degenerată;
 * - o subcale închisă prin apropiere (golul ≤ TOLERANTA_IMPORT, fără linie adăugată) și degenerată rămâne `degenerate`, ca
 *   în 2.7c: doar închiderea ADĂUGATĂ de ușă „lasă subcalea deschisă”;
 * - căile deschise nu sunt candidați în bugetul includerilor (nu costă nimic);
 * - într-o formă, căile deschise se judecă în ordinea lor, separat de cele închise; amestecul lor (ordinea subcăilor) se
 *   judecă doar pe formele nenormalizate (ieșirea normalizării n-are o ordine scrisă);
 * - piesa: ordinea operațiilor nu se judecă (nu e scrisă); `despartire` lipsă sau `false` (ADR 0037 §2: lipsa = false);
 *   grosimea foii vine în argumentul piesei (`grosime`, ALEGERE de interfață: ADR-ul nu spune pe unde).
 * - precizarea 2.3c-6 (ADR 0037 §11, „Închiderea fără arie lasă o linie”, textul corectat de coordonator), pe fiecare
 *   subcale închisă (de autor: cu `Z` sau cu golul ≤ TOLERANTA_IMPORT; de umplere; de ușă, golul ≤ 0,01 mm), după
 *   închidere și după împărțirea buclei dintr-o cubică, în ordinea: (1) sub 2 vârfuri: degenerată, ca în 2.7c; (2) numai
 *   linii pe o dreaptă la 1e-12 din mărime: o LINIE; (3) praful, ca în 2.3c-1; (4) fără arce, toate punctele cu mânerele
 *   cubicelor la cel mult REZOLUTIE / 2 = 0,005 mm de dreapta prin cele mai depărtate două puncte: o LINIE. Linia e o cale
 *   deschisă (`deschise`, sau `degenerate` sub 0,01 mm, ca orice cale deschisă): închisă de ușă / umplere, fără linia de
 *   închidere (vârful final = capătul subcăii); închisă de autor, cu drumul înapoi (linia de închidere adăugată rămâne,
 *   vârful final = startul). Nu se numără la `inchise-de-umplere` / `inchise-la-usa` și nu intră în normalizare. O formă
 *   nonzero golită de tot de normalizare se numără și la `degenerate` (pe lângă `nonzero-normalizate`).
 * Alegerile precizării 2.3c-6 (le spun și în raport):
 * - „arce” = segmentele `A` ale ieșirii (arcele de cerc păstrate); arcele eliptice și cele plate (R > 9 990 mm) sunt
 *   scrise ca cubice și se judecă pe mânerele cubicelor lor; un `A` cu raza 0 e o linie; corpusul nu stă pe diferență;
 * - „cele mai depărtate două puncte” se caută printre aceleași puncte (vârfurile, capetele și mânerele); la egalitate,
 *   prima pereche; corpusul stă departe de prag (0,0045 / 0,0055 mm, mânerele la 0,001 / 0,008 mm);
 * - vârful final al liniei închise de autor prin apropiere (fără linia de închidere) e startul; diferența față de capăt
 *   e golul (≤ 1e-6 mm), în toleranța ultimului segment; bucla dintr-o cubică închisă de autor se împarte întâi (2.7c),
 *   deci o asemenea linie are două cubice (corpusul n-o are);
 * - plafonul căii pe linia închisă de autor: vârfurile citite + linia de închidere adăugată + vârful final;
 * - forma golită se numără o dată (nu pe subcăi); una care păstrează căi deschise în aceeași formă (L9: regiunea ei e
 *   vidă, linia rămâne) e ambiguă: predicția o numără, `judecaRezultat` primește 0 sau 1.
 */
import { DOMParser } from '@xmldom/xmldom';
import { distantaLaCubica, type CubicaO } from './biarce.ts';
import { conturSimpluDinLinii, grupuri, judecaNormalizarea, martorTau, muchiiCoincidente, prafAdevarat, regiuneaDifera, sondeUmplute, toatePrimitivele, type CaleN } from './nonzero.ts';
import { CONST_STIL, foaieDin, STIL_RADACINA_PARINTE, stilCalculat, type StilCalculat } from './svg.stil.ts';

// ---------------------------------------------------------------------------------------------------------------------
// Constantele contractului (copiate din text, nu din aplicație).

export const SVG_NS_O = 'http://www.w3.org/2000/svg';

export const CONST_O = {
  /** §1: plafonul octeților (16 MiB) și al expansiunii entităților. */
  octeti: 16 * 1024 * 1024,
  entitati: 16 * 1024 * 1024,
  /** §6: TOLERANTA_IMPORT = TOLERANTA_PROIECT / 1 000. */
  tolImport: 1e-6,
  tolProiect: 1e-3,
  /** §6: abaterea radială a cubicei standard, × φ⁶. */
  bazaAbatere: 1.82e-5,
  /** §6: PLAFON.latura, raza maximă a unui arc de cerc. */
  razaArc: 10_000,
  /** §6 (revizia 12.10): peste 0,999 × PLAFON.latura, arcul de cerc devine cubice. */
  razaArcImport: 9_990,
  /** §7 / ADR 0034 §2. */
  varfuriCale: 50_000,
  translatie: 1e7,
  /** §8 / ADR 0024. */
  numeLungime: 200,
  noduriOperatie: 10_000,
  /** §8 (revizia 12.10): bugetul includerilor, `PLAFON_IMPORT.includeri`. */
  includeri: 2e7,
  /** §1: cel mult 100 de declarații de entități (`PLAFON_IMPORT.entitati`). */
  declaratii: 100,
  /** §7: plafonul de lucru (vârfurile produse, și ale căilor sărite) și vârfurile căilor primite (`PLAFON.varfuri`). */
  varfuriLucru: 1_000_000,
  varfuriPrimite: 200_000,
  /** §3: determinantul normat, §6: similitudinea. */
  singular: 1e-12,
  similitudine: 1e-12,
  /** Toleranțele comparației (secțiunea „Ce verifică oracolul”). */
  relLinii: 1e-9,
  relArc: 1e-7,
  /** ADR 0037 §4, §11 (sub-felia 2.3c-1): REZOLUTIE, pragul prafului și al golului închis la ușă. */
  rezolutie: 0.01,
  /** ADR 0037 §11 (sub-felia 2.3c-3): adâncimea operației `deschise` e min(1 mm, grosimea foii / 2). */
  adancimeDeschise: 1,
} as const;

/** ADR 0037 §11: adâncimea operației `deschise` pe o foaie de grosimea dată (mm), într-o trecere. */
export const adancimeDeschiseO = (grosime: number): number => Math.min(CONST_O.adancimeDeschise, grosime / 2);

/** ADR 0035 §10, apoi codurile ADR 0037 §11 („Raportul”, în ordinea scrisă acolo), la coadă (ALEGERE: locul nu e scris). */
export const CODURI_O = [
  'deschise', 'degenerate', 'prea-mari', 'sarit-text', 'sarit-use', 'sarit-image', 'sarit-foreignObject', 'sarit-svg',
  'ascunse', 'eroare-date', 'atribut-invalid', 'transformare-invalida', 'singulara', 'arce-eliptice', 'arce-plate',
  'cubice-din-arce', 'nonzero-normalizate', 'nonzero-refuzate', 'pagina-fara-marime', 'viewbox-invalid', 'transformare-radacina', 'stil',
  'inchise-de-umplere', 'inchise-la-usa', 'sub-rezolutie',
] as const;
/** Codurile noi ale sub-feliei 2.3c-1 (ADR 0037 §11). */
export const CODURI_2_3C1_O = ['inchise-de-umplere', 'inchise-la-usa', 'sub-rezolutie'] as const;
export type CodO = (typeof CODURI_O)[number];
export type RaportO = Record<CodO, number>;
export const CODURI_REFUZ_O = ['octeti', 'svgz', 'entitati', 'parsare', 'radacina', 'gol', 'departe', 'plafon'] as const;
export type CodRefuzO = (typeof CODURI_REFUZ_O)[number];

export function raportGol(): RaportO {
  const r = {} as RaportO;
  for (const c of CODURI_O) r[c] = 0;
  return r;
}

export type P = { readonly x: number; readonly y: number };
export type SegO = { readonly tip: 'L' } | { readonly tip: 'A'; readonly bulge: number } | { readonly tip: 'C'; readonly c1: P; readonly c2: P };
export type VarfO = { readonly p: P; readonly s: SegO };

// ---------------------------------------------------------------------------------------------------------------------
// Matricile: x′ = a·x + c·y + e, y′ = b·x + d·y + f; `mul(m2, m1)` aplică întâi m1.

export type Mat = { readonly a: number; readonly b: number; readonly c: number; readonly d: number; readonly e: number; readonly f: number };
export const ID_O: Mat = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

export function mul(m2: Mat, m1: Mat): Mat {
  return {
    a: m2.a * m1.a + m2.c * m1.b,
    b: m2.b * m1.a + m2.d * m1.b,
    c: m2.a * m1.c + m2.c * m1.d,
    d: m2.b * m1.c + m2.d * m1.d,
    e: m2.a * m1.e + m2.c * m1.f + m2.e,
    f: m2.b * m1.e + m2.d * m1.f + m2.f,
  };
}
export const aplica = (m: Mat, p: P): P => ({ x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f });
const liniar = (m: Mat, x: number, y: number): P => ({ x: m.a * x + m.c * y, y: m.b * x + m.d * y });
export const det = (m: Mat): number => m.a * m.d - m.b * m.c;

export function esteSimilitudineO(m: Mat): boolean {
  // Revizia 12.10: relativ la scara matricei (norma celei mai mari coloane), fără podeaua 1.
  const scara = Math.max(Math.hypot(m.a, m.b), Math.hypot(m.c, m.d));
  const t = CONST_O.similitudine * scara;
  const directa = Math.abs(m.a - m.d) <= t && Math.abs(m.b + m.c) <= t;
  const oglindita = Math.abs(m.a + m.d) <= t && Math.abs(m.b - m.c) <= t;
  return (directa || oglindita) && det(m) !== 0;
}

export function esteSingularaO(m: Mat): boolean {
  const s = Math.max(Math.hypot(m.a, m.b), Math.hypot(m.c, m.d));
  if (!(s > 0) || !Number.isFinite(s)) return true;
  return Math.abs(det(m)) / (s * s) <= CONST_O.singular;
}

/** Cea mai mare valoare singulară a matricei 2×2 cu coloanele u, v. */
export function sigmaMax(u: P, v: P): number {
  const t = u.x * u.x + u.y * u.y + v.x * v.x + v.y * v.y;
  const d = u.x * v.y - u.y * v.x;
  return Math.sqrt((t + Math.sqrt(Math.max(0, t * t - 4 * d * d))) / 2);
}

const cosG = (g: number): number => {
  const r = ((g % 360) + 360) % 360;
  return r === 0 ? 1 : r === 90 ? 0 : r === 180 ? -1 : r === 270 ? 0 : Math.cos((g * Math.PI) / 180);
};
const sinG = (g: number): number => {
  const r = ((g % 360) + 360) % 360;
  return r === 0 ? 0 : r === 90 ? 1 : r === 180 ? 0 : r === 270 ? -1 : Math.sin((g * Math.PI) / 180);
};

// ---------------------------------------------------------------------------------------------------------------------
// Scanerele: spațiile, numerele (§5), lungimile (§2), transformările (§3), viewBox și preserveAspectRatio.

const WSP = new Set([' ', '\t', '\n', '\r']);
const sariWsp = (s: string, i: number): number => {
  while (i < s.length && WSP.has(s[i] as string)) i++;
  return i;
};
/** comma-wsp opțional: wsp* ,? wsp*. */
const sariSep = (s: string, i: number): number => {
  i = sariWsp(s, i);
  if (s[i] === ',') i = sariWsp(s, i + 1);
  return i;
};

const RE_NUMAR = /[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?/y;
export function numarLa(s: string, i: number): { v: number; j: number } | null {
  RE_NUMAR.lastIndex = i;
  const m = RE_NUMAR.exec(s);
  if (m === null) return null;
  return { v: Number(m[0]), j: i + m[0].length };
}

const taie = (s: string): string => s.replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, '');
const RE_LUNGIME = /^([+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?)([A-Za-z%]*)$/;
/** mm pe unitate (px și fără unitate: separat, depind de px pe țol). */
const UNITATI_MM: Record<string, number> = { mm: 1, cm: 10, q: 0.25, in: 25.4, pt: 25.4 / 72, pc: 25.4 / 6 };

export type Lungime = { ok: true; v: number; unitate: string } | { ok: false; motiv: 'lipsa' | 'procent' | 'unitate' | 'eroare' };

export function citesteLungime(text: string | null): Lungime {
  if (text === null) return { ok: false, motiv: 'lipsa' };
  const m = RE_LUNGIME.exec(taie(text));
  if (m === null) return { ok: false, motiv: 'eroare' };
  const v = Number(m[1]);
  const u = (m[2] as string).toLowerCase();
  if (u === '%') return { ok: false, motiv: 'procent' };
  if (u !== '' && u !== 'px' && !(u in UNITATI_MM)) return { ok: false, motiv: 'unitate' };
  if (!Number.isFinite(v)) return { ok: false, motiv: 'eroare' };
  return { ok: true, v, unitate: u };
}
/** O lungime a rădăcinii, în mm (px și fără unitate = 25,4 / pxPeTol). */
export const inMm = (l: { v: number; unitate: string }, px: number): number =>
  l.unitate === '' || l.unitate === 'px' ? (l.v * 25.4) / px : l.v * (UNITATI_MM[l.unitate] as number);
/** O lungime a unei forme, în unități utilizator: CSS, 96 px pe țol, oricare ar fi pxPeTol (§2). */
export const inUtilizator = (l: { v: number; unitate: string }): number =>
  l.unitate === '' || l.unitate === 'px' ? l.v : (l.v * (UNITATI_MM[l.unitate] as number) * 96) / 25.4;

/** Transformarea unei singure funcții, sau null (număr greșit de argumente, nume necunoscut). */
function functieTransform(nume: string, a: number[]): Mat | null {
  const n = a.length;
  const g = (k: number): number => a[k] as number;
  switch (nume) {
    case 'matrix': return n === 6 ? { a: g(0), b: g(1), c: g(2), d: g(3), e: g(4), f: g(5) } : null;
    case 'translate': return n === 1 || n === 2 ? { a: 1, b: 0, c: 0, d: 1, e: g(0), f: n === 2 ? g(1) : 0 } : null;
    case 'scale': return n === 1 || n === 2 ? { a: g(0), b: 0, c: 0, d: n === 2 ? g(1) : g(0), e: 0, f: 0 } : null;
    case 'rotate': {
      if (n !== 1 && n !== 3) return null;
      const c = cosG(g(0)), s = sinG(g(0));
      const r: Mat = { a: c, b: s, c: -s, d: c, e: 0, f: 0 };
      if (n === 1) return r;
      const t1: Mat = { a: 1, b: 0, c: 0, d: 1, e: g(1), f: g(2) };
      const t2: Mat = { a: 1, b: 0, c: 0, d: 1, e: -g(1), f: -g(2) };
      return mul(t1, mul(r, t2));
    }
    case 'skewX': return n === 1 ? { a: 1, b: 0, c: Math.tan((g(0) * Math.PI) / 180), d: 1, e: 0, f: 0 } : null;
    case 'skewY': return n === 1 ? { a: 1, b: Math.tan((g(0) * Math.PI) / 180), c: 0, d: 1, e: 0, f: 0 } : null;
    default: return null;
  }
}

/** Lista de transformări (SVG 1.1), compusă de la stânga la dreapta; null la o eroare de gramatică. */
export function citesteTransform(s: string): Mat | null {
  let m = ID_O;
  let i = sariWsp(s, 0);
  if (i === s.length) return m;
  const reNume = /[A-Za-z]+/y;
  for (;;) {
    reNume.lastIndex = i;
    const nm = reNume.exec(s);
    if (nm === null) return null;
    i = sariWsp(s, i + nm[0].length);
    if (s[i] !== '(') return null;
    i = sariWsp(s, i + 1);
    const args: number[] = [];
    if (s[i] !== ')') {
      for (;;) {
        const n = numarLa(s, i);
        if (n === null) return null;
        args.push(n.v);
        i = n.j;
        const k = sariWsp(s, i);
        if (s[k] === ')') { i = k; break; }
        const j = sariSep(s, i);
        if (j === i) return null;
        i = j;
      }
    }
    i++;
    const t = functieTransform(nm[0], args);
    if (t === null) return null;
    m = mul(m, t);
    const k = sariWsp(s, i);
    if (k === s.length) return m;
    // Revizia 12.10: separatorul dintre transformări e opțional (ca în browsere).
    let j = i;
    for (;;) {
      const j2 = sariSep(s, j);
      if (j2 === j) break;
      j = j2;
    }
    if (j === s.length) return m;
    i = j;
  }
}

/** viewBox: patru numere, lățimea și înălțimea pozitive; altfel null. */
export function citesteViewBox(s: string): { x: number; y: number; w: number; h: number } | null {
  const v: number[] = [];
  let i = sariWsp(s, 0);
  while (i < s.length) {
    const n = numarLa(s, i);
    if (n === null) return null;
    v.push(n.v);
    i = n.j;
    const k = sariWsp(s, i);
    if (k === s.length) break;
    const j = sariSep(s, i);
    if (j === i) return null;
    i = j;
  }
  if (v.length !== 4) return null;
  const [x, y, w, h] = v as [number, number, number, number];
  return w > 0 && h > 0 && Number.isFinite(x) && Number.isFinite(y) ? { x, y, w, h } : null;
}

export type Aliniere = { none: boolean; x: 0 | 0.5 | 1; y: 0 | 0.5 | 1; slice: boolean };
export function citestePar(s: string | null): Aliniere {
  const implicit: Aliniere = { none: false, x: 0.5, y: 0.5, slice: false };
  if (s === null) return implicit;
  const t = taie(s).split(/[ \t\r\n]+/);
  if (t[0] === 'defer') t.shift();
  const al = t[0];
  let r: Aliniere;
  if (al === 'none') r = { none: true, x: 0, y: 0, slice: false };
  else {
    const m = /^x(Min|Mid|Max)Y(Min|Mid|Max)$/.exec(al ?? '');
    if (m === null) return implicit;
    const f = (w: string): 0 | 0.5 | 1 => (w === 'Min' ? 0 : w === 'Mid' ? 0.5 : 1);
    r = { none: false, x: f(m[1] as string), y: f(m[2] as string), slice: false };
  }
  if (t.length === 2) {
    if (t[1] === 'slice') r.slice = true;
    else if (t[1] !== 'meet') return implicit;
  } else if (t.length > 2) return implicit;
  return r;
}

// ---------------------------------------------------------------------------------------------------------------------
// Datele căii (§5): BNF SVG 1.1, cu tratarea erorilor din SVG 2 (se păstrează segmentele complete dinaintea erorii).

export type SegU =
  | { readonly k: 'L'; readonly a: P; readonly b: P }
  | { readonly k: 'C'; readonly a: P; readonly c1: P; readonly c2: P; readonly b: P }
  | { readonly k: 'A'; readonly a: P; readonly b: P; readonly rx: number; readonly ry: number; readonly fi: number; readonly mare: boolean; readonly sens: boolean };
export type SubcaleU = { start: P; segs: SegU[]; z: boolean };

const COMENZI = 'MmZzLlHhVvCcSsQqTtAa';
const ARGUMENTE: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };

export function citesteCale(d: string): { subcai: SubcaleU[]; eroare: boolean } {
  const subcai: SubcaleU[] = [];
  let sub: SubcaleU | null = null;
  let cur: P = { x: 0, y: 0 };
  let start: P = { x: 0, y: 0 };
  let ultima = '';
  let ctrlC: P | null = null;
  let ctrlQ: P | null = null;
  let deschideLaNevoie = false;
  let i = sariWsp(d, 0);
  if (i === d.length) return { subcai, eroare: false };
  if (d[i] !== 'M' && d[i] !== 'm') return { subcai, eroare: true };
  let cmd = '';
  const segment = (s: SegU): void => {
    if (deschideLaNevoie || sub === null) {
      sub = { start: cur, segs: [], z: false };
      subcai.push(sub);
      start = cur;
      deschideLaNevoie = false;
    }
    sub.segs.push(s);
  };
  for (;;) {
    i = sariWsp(d, i);
    if (i >= d.length) break;
    const ch = d[i] as string;
    if (COMENZI.includes(ch)) {
      cmd = ch;
      i = sariWsp(d, i + 1);
    } else if (cmd !== '' && cmd !== 'Z' && cmd !== 'z' && /[0-9+\-.]/.test(ch)) {
      if (cmd === 'M') cmd = 'L';
      else if (cmd === 'm') cmd = 'l';
    } else return { subcai, eroare: true };
    const C = cmd.toUpperCase();
    const rel = cmd !== C;
    if (C === 'Z') {
      if (sub !== null && !deschideLaNevoie) {
        sub.z = true;
        cur = start;
        deschideLaNevoie = true;
      } else if (sub !== null && deschideLaNevoie) {
        // `Z` imediat după alt `Z`: o subcale nouă, goală, închisă, în același start.
        sub = { start: cur, segs: [], z: true };
        subcai.push(sub);
      }
      ultima = 'Z';
      continue;
    }
    // Argumentele: numere, cu separatoare opționale; la arc, steagurile sunt câte un caracter.
    const n = ARGUMENTE[C] as number;
    const v: number[] = [];
    let j = i;
    for (let k = 0; k < n; k++) {
      if (k > 0) j = sariSep(d, j);
      if (C === 'A' && (k === 3 || k === 4)) {
        const f = d[j];
        if (f !== '0' && f !== '1') return { subcai, eroare: true };
        v.push(f === '1' ? 1 : 0);
        j++;
        continue;
      }
      const nr = numarLa(d, j);
      if (nr === null) return { subcai, eroare: true };
      v.push(nr.v);
      j = nr.j;
    }
    i = sariSep(d, j);
    const ox = rel ? cur.x : 0, oy = rel ? cur.y : 0;
    const g = (k: number): number => v[k] as number;
    switch (C) {
      case 'M': {
        const p = { x: ox + g(0), y: oy + g(1) };
        sub = { start: p, segs: [], z: false };
        subcai.push(sub);
        cur = p;
        start = p;
        deschideLaNevoie = false;
        break;
      }
      case 'L': case 'H': case 'V': {
        const p = C === 'L' ? { x: ox + g(0), y: oy + g(1) } : C === 'H' ? { x: ox + g(0), y: cur.y } : { x: cur.x, y: oy + g(0) };
        segment({ k: 'L', a: cur, b: p });
        cur = p;
        break;
      }
      case 'C': case 'S': {
        let c1: P, c2: P, p: P;
        if (C === 'C') {
          c1 = { x: ox + g(0), y: oy + g(1) };
          c2 = { x: ox + g(2), y: oy + g(3) };
          p = { x: ox + g(4), y: oy + g(5) };
        } else {
          c1 = (ultima === 'C' || ultima === 'S') && ctrlC !== null ? { x: 2 * cur.x - ctrlC.x, y: 2 * cur.y - ctrlC.y } : cur;
          c2 = { x: ox + g(0), y: oy + g(1) };
          p = { x: ox + g(2), y: oy + g(3) };
        }
        segment({ k: 'C', a: cur, c1, c2, b: p });
        ctrlC = c2;
        cur = p;
        break;
      }
      case 'Q': case 'T': {
        let q: P, p: P;
        if (C === 'Q') {
          q = { x: ox + g(0), y: oy + g(1) };
          p = { x: ox + g(2), y: oy + g(3) };
        } else {
          q = (ultima === 'Q' || ultima === 'T') && ctrlQ !== null ? { x: 2 * cur.x - ctrlQ.x, y: 2 * cur.y - ctrlQ.y } : cur;
          p = { x: ox + g(0), y: oy + g(1) };
        }
        // T1: ridicarea exactă la cubică.
        const c1 = { x: cur.x + (2 / 3) * (q.x - cur.x), y: cur.y + (2 / 3) * (q.y - cur.y) };
        const c2 = { x: p.x + (2 / 3) * (q.x - p.x), y: p.y + (2 / 3) * (q.y - p.y) };
        segment({ k: 'C', a: cur, c1, c2, b: p });
        ctrlQ = q;
        cur = p;
        break;
      }
      case 'A': {
        const p = { x: ox + g(5), y: oy + g(6) };
        segment({ k: 'A', a: cur, b: p, rx: g(0), ry: g(1), fi: g(2), mare: g(3) === 1, sens: g(4) === 1 });
        cur = p;
        break;
      }
    }
    ultima = C;
  }
  return { subcai, eroare: false };
}

/** `points` (polyline / polygon): perechile dinaintea primei erori; o coordonată fără pereche e o eroare. */
export function citestePuncte(s: string): { puncte: P[]; eroare: boolean } {
  const v: number[] = [];
  let eroare = false;
  let i = sariWsp(s, 0);
  while (i < s.length) {
    const n = numarLa(s, i);
    if (n === null) { eroare = true; break; }
    v.push(n.v);
    i = sariSep(s, n.j);
  }
  if (v.length % 2 === 1) { eroare = true; v.pop(); }
  const puncte: P[] = [];
  for (let k = 0; k + 1 < v.length; k += 2) puncte.push({ x: v[k] as number, y: v[k + 1] as number });
  return { puncte, eroare };
}

// ---------------------------------------------------------------------------------------------------------------------
// Entitățile (§1) și parserul de test.

export type CodEntitatiO = 'parametru' | 'fara-nume' | 'externa' | 'neterminata' | 'valoare' | 'numar' | 'expansiune' | 'attlist';

/** Declarațiile de entități, în ordine (cu duplicatele), sau codul primei probleme de formă. */
function declaratiiEntitati(text: string): { decl: Array<{ nume: string; valoare: string }>; total: number } | CodEntitatiO {
  const decl: Array<{ nume: string; valoare: string }> = [];
  let total = 0;
  for (let i = text.indexOf('<!ENTITY'); i >= 0; i = text.indexOf('<!ENTITY', i + 8)) {
    total++;
    let j = sariWsp(text, i + 8);
    if (text[j] === '%') return 'parametru';
    const m = /[^ \t\r\n"'>%]+/y;
    m.lastIndex = j;
    const nm = m.exec(text);
    if (nm === null) return 'fara-nume';
    j = sariWsp(text, j + nm[0].length);
    if (text.startsWith('SYSTEM', j) || text.startsWith('PUBLIC', j)) return 'externa';
    const q = text[j];
    if (q !== '"' && q !== "'") return 'neterminata';
    const k = text.indexOf(q, j + 1);
    if (k < 0) return 'neterminata';
    if (text[sariWsp(text, k + 1)] !== '>') return 'neterminata';
    const valoare = text.slice(j + 1, k);
    if (valoare.includes('&') || valoare.includes('<')) return 'valoare';
    decl.push({ nume: nm[0], valoare });
  }
  return { decl, total };
}

/**
 * Codul refuzului entităților (§1), sau null. ALEGERE (ordinea, când sunt mai multe): numărul declarațiilor, apoi forma
 * fiecărei declarații în ordine, apoi `<!ATTLIST` cu o valoare literală (orice ghilimea în declarație), apoi expansiunea
 * (prima declarație a unui nume câștigă, XML 1.0 §4.2).
 */
export function problemaEntitatiO(text: string): CodEntitatiO | null {
  if (text.split('<!ENTITY').length - 1 > CONST_O.declaratii) return 'numar';
  const d = declaratiiEntitati(text);
  if (typeof d === 'string') return d;
  for (let i = text.indexOf('<!ATTLIST'); i >= 0; i = text.indexOf('<!ATTLIST', i + 9)) {
    const k = text.indexOf('>', i);
    const decl = text.slice(i, k < 0 ? text.length : k);
    if (decl.includes('"') || decl.includes("'")) return 'attlist';
  }
  const prima = new Map<string, string>();
  for (const x of d.decl) if (!prima.has(x.nume)) prima.set(x.nume, x.valoare);
  let total = 0;
  for (const [nume, valoare] of prima) {
    const ref = `&${nume};`;
    let aparitii = 0;
    for (let k = text.indexOf(ref); k >= 0; k = text.indexOf(ref, k + ref.length)) aparitii++;
    total += aparitii * valoare.length;
    if (total > CONST_O.entitati) return 'expansiune';
  }
  return null;
}

export type ParserSvg = { parseFromString(text: string, tip: 'image/svg+xml'): Document };

/**
 * Parserul mediului de test: `DOMParser` din xmldom, cu orice eroare aruncată (aplicația o face „parsare”). xmldom NU
 * expandează entitățile interne (un browser da), deci, ca să citim un fișier Illustrator ca browserul, entitățile simple
 * (cele care trec de regula §1) se înlocuiesc în text înainte de parser. Aceeași funcție servește aplicației și oracolului.
 */
export function parserTest(): ParserSvg {
  const p = new DOMParser({
    onError: (nivel: string, mesaj: string) => {
      if (nivel !== 'warning') throw new Error(mesaj);
    },
  });
  return {
    parseFromString(text: string, tip: 'image/svg+xml'): Document {
      let t = text;
      const sf = t.indexOf(']>');
      if (t.includes('<!ENTITY') && sf > 0) {
        const re = /<!ENTITY[ \t\r\n]+([^ \t\r\n%"'>]+)[ \t\r\n]+("[^"]*"|'[^']*')[ \t\r\n]*>/g;
        const ent = new Map<string, string>();
        for (let m = re.exec(t); m !== null; m = re.exec(t)) if (!ent.has(m[1] as string)) ent.set(m[1] as string, (m[2] as string).slice(1, -1));
        let rest = t.slice(sf + 2);
        for (const [n, v] of ent) rest = rest.split(`&${n};`).join(v);
        t = t.slice(0, sf + 2) + rest;
      }
      return p.parseFromString(t, tip) as unknown as Document;
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Geometria exactă, în mm.

/** Arcul exact: E(θ) = c + u·cos θ + v·sin θ, θ ∈ [t0, t0 + dt] (dt cu semn). `cerc`: |u| = |v|, u ⊥ v. */
export type ArcE = { readonly c: P; readonly u: P; readonly v: P; readonly t0: number; readonly dt: number; readonly cerc: boolean };
export type SegExact =
  | { readonly fel: 'L'; readonly a: P; readonly b: P }
  | { readonly fel: 'C'; readonly a: P; readonly c1: P; readonly c2: P; readonly b: P }
  | ({ readonly fel: 'E'; readonly a: P; readonly b: P } & ArcE);

export type ClasaRun = 'L' | 'C' | 'arc' | 'eliptic' | 'plat';
/** Un segment exact și vârfurile pe care ADR-ul le cere pentru el (`piese`: fiecare poartă segmentul care pleacă din el). */
export type RunO = { ex: SegExact; piese: VarfO[]; clasa: ClasaRun; raza: number; gol: number; tol: number; nul?: boolean; lambda?: boolean; zg?: number };

export const punctE = (e: ArcE, t: number): P => ({
  x: e.c.x + e.u.x * Math.cos(t) + e.v.x * Math.sin(t),
  y: e.c.y + e.u.y * Math.cos(t) + e.v.y * Math.sin(t),
});
const derivE = (e: ArcE, t: number): P => ({
  x: -e.u.x * Math.sin(t) + e.v.x * Math.cos(t),
  y: -e.u.y * Math.sin(t) + e.v.y * Math.cos(t),
});

export function punctCub(a: P, c1: P, c2: P, b: P, t: number): P {
  const s = 1 - t;
  const k0 = s * s * s, k1 = 3 * s * s * t, k2 = 3 * s * t * t, k3 = t * t * t;
  return { x: k0 * a.x + k1 * c1.x + k2 * c2.x + k3 * b.x, y: k0 * a.y + k1 * c1.y + k2 * c2.y + k3 * b.y };
}
function derivCub(a: P, c1: P, c2: P, b: P, t: number): P {
  const s = 1 - t;
  return {
    x: 3 * s * s * (c1.x - a.x) + 6 * s * t * (c2.x - c1.x) + 3 * t * t * (b.x - c2.x),
    y: 3 * s * s * (c1.y - a.y) + 6 * s * t * (c2.y - c1.y) + 3 * t * t * (b.y - c2.y),
  };
}

/** F.6.5: centrul și unghiurile unui arc SVG, după corecțiile F.6.6 (raze în valoare absolută, √Λ). */
export function arcCentru(s: Extract<SegU, { k: 'A' }>): { c: P; rx: number; ry: number; fi: number; t1: number; dt: number; lambda: boolean } {
  let rx = Math.abs(s.rx), ry = Math.abs(s.ry);
  const fi = ((s.fi % 360) + 360) % 360;
  const cf = cosG(fi), sf = sinG(fi);
  const dx2 = (s.a.x - s.b.x) / 2, dy2 = (s.a.y - s.b.y) / 2;
  const x1 = cf * dx2 + sf * dy2;
  const y1 = -sf * dx2 + cf * dy2;
  const lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  let coef = 0;
  if (lambda > 1) {
    const r = Math.sqrt(lambda);
    rx *= r;
    ry *= r;
  } else {
    const num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
    const den = rx * rx * y1 * y1 + ry * ry * x1 * x1;
    coef = Math.sqrt(Math.max(0, num / den)) * (s.mare === s.sens ? -1 : 1);
  }
  const cx1 = (coef * rx * y1) / ry;
  const cy1 = (-coef * ry * x1) / rx;
  const c = { x: cf * cx1 - sf * cy1 + (s.a.x + s.b.x) / 2, y: sf * cx1 + cf * cy1 + (s.a.y + s.b.y) / 2 };
  const ux = (x1 - cx1) / rx, uy = (y1 - cy1) / ry;
  const vx = (-x1 - cx1) / rx, vy = (-y1 - cy1) / ry;
  const t1 = Math.atan2(uy, ux);
  let dt = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  if (!s.sens && dt > 0) dt -= 2 * Math.PI;
  else if (s.sens && dt < 0) dt += 2 * Math.PI;
  return { c, rx, ry, fi, t1, dt, lambda: lambda > 1 };
}

/**
 * Un arc din spațiul formei (centrul cu, razele rx, ry, rotirea fi în grade, unghiurile t1, dt), dus în mm prin M:
 * arc (cerc sub similitudine, raza ≤ 10 000 mm; peste 180°, două jumătăți) sau cubice (n = ⌈|dt| / φ⌉).
 */
/** Arcul omis (capetele contopite în mm). */
export const OMIS: RunO = { ex: { fel: 'L', a: { x: 0, y: 0 }, b: { x: 0, y: 0 } }, piese: [], clasa: 'L', raza: 0, gol: 0, tol: 0 };

export function arcInMm(a: P, b: P, cu: P, rx: number, ry: number, fi: number, t1: number, dt: number, m: Mat, nr: RaportO, loc = Infinity): RunO | null {
  const cf = cosG(fi), sf = sinG(fi);
  const u = liniar(m, rx * cf, rx * sf);
  const v = liniar(m, -ry * sf, ry * cf);
  const c = aplica(m, cu);
  const cerc = rx === ry && esteSimilitudineO(m);
  const arc: ArcE = { c, u, v, t0: t1, dt, cerc };
  const ex: SegExact = { fel: 'E', a, b, ...arc };
  if (cerc) {
    const raza = rx * Math.sqrt(Math.abs(det(m)));
    if (raza <= CONST_O.razaArcImport) {
      const bulge = Math.tan(dt / 4) * Math.sign(det(m));
      if (Math.abs(dt) <= Math.PI) {
        // Un arc de cel mult o jumătate cu capetele contopite în mm se omite (revizia 12.10).
        if (a.x === b.x && a.y === b.y) return OMIS;
        return loc < 1 ? null : { ex, piese: [{ p: a, s: { tip: 'A', bulge } }], clasa: 'arc', raza, gol: 0, tol: 0 };
      }
      if (loc < 2) return null;
      // Peste 180° (revizia 12.10): mijlocul din centrul F.6.5, la unghiul t1 + Δθ/2, trecut prin M; bulge = tan(Δθ/8)·semn.
      const mij = punctE(arc, t1 + dt / 2);
      const jum = Math.tan(dt / 8) * Math.sign(det(m));
      return { ex, piese: [{ p: a, s: { tip: 'A', bulge: jum } }, { p: mij, s: { tip: 'A', bulge: jum } }], clasa: 'arc', raza, gol: 0, tol: 0 };
    }
    return cubiceArc(ex, arc, raza, 'plat', nr, loc);
  }
  return cubiceArc(ex, arc, sigmaMax(u, v), 'eliptic', nr, loc);
}

/** Câte cubice cere un arc (§6): n = ⌈|Δθ| / φ⌉, φ = min(π/2, (TOLERANTA_IMPORT / (1,82e-5 · σ))^(1/6)). */
export function cateCubice(dt: number, sigma: number): number {
  const fiMax = Math.min(Math.PI / 2, Math.pow(CONST_O.tolImport / (CONST_O.bazaAbatere * sigma), 1 / 6));
  return Math.max(1, Math.ceil(Math.abs(dt) / fiMax));
}

/**
 * Zgomotul (în mm) al unei formule F.6.5 care nu pune radicandul la 0 când Λ ≥ 1 (modul tolerant, constatarea 1): capetele
 * rotunjite la ulp(|c| + r) dau Λ = 1 ± ulp / r_min, radicandul ~ √ that, iar centrul se mută cu atât × r_max; × 8 margine.
 */
function zgomotF65(c: P, rx: number, ry: number, scara: number): number {
  const s = Math.abs(c.x) + Math.abs(c.y) + rx + ry;
  return 8 * Math.sqrt((2.3e-16 * s) / Math.min(rx, ry)) * Math.max(rx, ry) * scara;
}

/** Cubicele standard ale arcului; null (nenumărat) dacă nu încap în locul rămas al subcăii (§7). */
function cubiceArc(ex: SegExact & { fel: 'E' }, arc: ArcE, sigma: number, clasa: 'eliptic' | 'plat', nr: RaportO, loc: number): RunO | null {
  const n = cateCubice(arc.dt, sigma);
  // Revizia 12.10: cu un loc păstrat pentru linia de închidere.
  if (n > loc - 1) return null;
  const delta = arc.dt / n;
  const k = (4 / 3) * Math.tan(delta / 4);
  const piese: VarfO[] = [];
  for (let j = 0; j < n; j++) {
    const al = arc.t0 + j * delta;
    const p0 = j === 0 ? ex.a : punctE(arc, al);
    const q0 = punctE(arc, al), q3 = punctE(arc, al + delta);
    const d0 = derivE(arc, al), d3 = derivE(arc, al + delta);
    piese.push({ p: p0, s: { tip: 'C', c1: { x: q0.x + k * d0.x, y: q0.y + k * d0.y }, c2: { x: q3.x - k * d3.x, y: q3.y - k * d3.y } } });
  }
  if (clasa === 'eliptic') nr['arce-eliptice']++;
  else nr['arce-plate']++;
  nr['cubice-din-arce'] += n;
  return { ex, piese, clasa, raza: sigma, gol: 0, tol: 0 };
}

// ---------------------------------------------------------------------------------------------------------------------
// Cititorul.

export type CaleO = {
  varfuri: VarfO[];
  forma: number;
  nume?: string;
  runs: RunO[];
  /** Toleranța vârfului i (după clasa segmentelor vecine). */
  tolVarf: number[];
  /** Forma se normalizează (felia 2.7d): regula efectivă nonzero și umplută (`fill` efectiv altul decât `none`). */
  nonzero: boolean;
  /**
   * Sub-felia 2.3c-3 (ADR 0037 §11): `false` pe o cale deschisă. Atunci `runs` sunt segmentele ei (fără închidere), iar
   * `varfuri` au în plus vârful final (capătul ultimului segment, cu segmentul `L`).
   */
  inchis: boolean;
};
/**
 * Jurnalul unei subcăi a unui `path` / `polyline` / `polygon` / `line` (sub-felia 2.3c-1; `line` din 2.3c-3), după plafonul
 * căii: soarta ei (codul la care s-a numărat, `cale` pentru o cale închisă, `deschisa` pentru o cale deschisă importată),
 * `z`, golul capăt–start și diagonala cutiei exacte (în mm), `umplut`, iar la `cale` / `deschisa`, indexul căii în `cai`
 * și, la `cale`, dacă ușa a adăugat linia de închidere (`inchisaDeUsa`: umplerea sau golul sub rezoluție).
 */
export type SoartaSubcaleO = 'cale' | 'deschisa' | 'sub-rezolutie' | 'degenerate' | 'prea-mari';
export type SubcaleJurnalO = { forma: number; soarta: SoartaSubcaleO; z: boolean; gol: number; diagonala: number; umplut: boolean; inchisaDeUsa: 'umplere' | 'usa' | null; cale?: number };

export type RezultatO =
  | { ok: true; cai: CaleO[]; pagina: { latime: number; inaltime: number } | null; px: boolean; illustrator: boolean; avertismente: RaportO; marime: number; tolLC: number; formeNonzero: FormaNonzeroO[]; subcai: SubcaleJurnalO[]; golLaUsa: number }
  | { ok: false; cod: CodRefuzO; avertismente?: RaportO; detaliu?: string; alternativ?: RezultatO; subcai?: SubcaleJurnalO[] };

export type OptiuniO = { pxPeTol?: 96 | 72; varianta?: 2 | 4; parser?: ParserSvg; limba?: string; buget?: number; densitateNonzero?: number };

/**
 * Analiza unei forme `nonzero` (ADR 0036): `deSchimbat` = regiunea nonzero a citirii ≠ evenodd (o sondă mai departe de τ)
 * sau muchii coincidente; `martor` = martorul de proximitate la τ (§6, amendamentul K7: o formă deja evenodd se poate
 * schimba doar cu el); `subtire` = deja evenodd, cu martor, și nicio sondă umplută dincolo de τ (o formă simplă mai subțire
 * decât τ: poate ieși și goală); `gol` = predicția că dispare (regiunea vidă, sau subțire); `sigur` = analiza s-a făcut.
 */
export type FormaNonzeroO = { forma: number; deSchimbat: boolean; gol: boolean; sigur: boolean; dezacorduri: number; coincidente: number; martor: string | null; subtire: boolean };

const FORME = new Set(['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon']);
const SARITE: Record<string, CodO> = {
  text: 'sarit-text', use: 'sarit-use', image: 'sarit-image', foreignObject: 'sarit-foreignObject', svg: 'sarit-svg',
};

const copiiElement = (el: Element): Element[] => {
  const r: Element[] = [];
  for (let n = el.firstChild; n !== null; n = n.nextSibling) if (n.nodeType === 1) r.push(n as Element);
  return r;
};

/**
 * Copilul ales de un `switch` (precizarea din 12.10): primul copil-element din spațiul de nume al rădăcinii, fără
 * `requiredExtensions`; copiii din alte spații de nume nu sunt candidați; `systemLanguage` / `requiredFeatures` nu se judecă.
 */
const alesSwitch = (el: Element, ns: string | null, limba: string): Element | undefined =>
  copiiElement(el).find((c) => c.namespaceURI === ns && !c.hasAttribute('requiredExtensions') && limbaPotrivita(c.getAttribute('systemLanguage'), limba));
/** systemLanguage (revizia 12.10): lipsă, sau o listă cu virgule în care o intrare e limba ori începe cu ea și „-”. */
const limbaPotrivita = (s: string | null, limba: string): boolean =>
  s === null || s.split(',').map(taie).some((x) => x === limba || x.startsWith(`${limba}-`));

/** Formele din contextul de desen ale unui subarbore ascuns (`display: none`), numărate o dată, în ordinea documentului. */
function formeAscunse(el: Element, ns: string | null, limba: string): number {
  let n = 0;
  const stiva: Element[] = [el];
  while (stiva.length > 0) {
    const e = stiva.pop() as Element;
    if (e.namespaceURI !== ns) continue;
    const ln = e.localName;
    if (FORME.has(ln)) n++;
    else if (ln === 'g' || ln === 'a') stiva.push(...copiiElement(e).reverse());
    else if (ln === 'switch') {
      const c = alesSwitch(e, ns, limba);
      if (c !== undefined) stiva.push(c);
    }
  }
  return n;
}

type Cadru = { el: Element; m: Mat; stil: StilCalculat };

export function citesteSvgO(octeti: Uint8Array, opt: OptiuniO = {}): RezultatO {
  const pxTol = opt.pxPeTol ?? 96;
  const varianta = opt.varianta ?? 2;
  const limba = opt.limba ?? 'en';
  if (octeti.length > CONST_O.octeti) return { ok: false, cod: 'octeti' };
  if (octeti.length >= 2 && octeti[0] === 0x1f && octeti[1] === 0x8b) return { ok: false, cod: 'svgz' };
  const text = new TextDecoder('utf-8').decode(octeti);
  const ent = problemaEntitatiO(text);
  if (ent !== null) return { ok: false, cod: 'entitati', detaliu: ent };
  let doc: Document;
  try {
    doc = (opt.parser ?? parserTest()).parseFromString(text, 'image/svg+xml');
  } catch {
    return { ok: false, cod: 'parsare' };
  }
  const rad = doc.documentElement;
  if (rad === null || rad === undefined) return { ok: false, cod: 'parsare' };
  if (rad.localName === 'parsererror') return { ok: false, cod: 'parsare' };
  const ns = rad.namespaceURI;
  if (rad.localName !== 'svg' || (ns !== SVG_NS_O && ns !== null)) return { ok: false, cod: 'radacina' };

  const nr = raportGol();
  // Comentariile (Illustrator) și elementele `style`, oriunde.
  // Steagul Illustrator: un comentariu din primii 16 KiB conține „Adobe Illustrator” (ALEGERE: caracterele textului).
  const illustrator = [...text.slice(0, 16 * 1024).matchAll(/<!--([\s\S]*?)-->/g)].some((m) => (m[1] as string).includes('Adobe Illustrator'));
  // Felia 2.7d (§4 „Stilurile”): regulile simple din toate elementele `style` (în ordinea documentului) se aplică; `stil`
  // numără doar o regulă cu una din cele patru proprietăți care nu se citește (sau `!important`, sau peste 10 000 de reguli).
  let foaie: ReturnType<typeof foaieDin> | null = null;
  {
    const texte: string[] = [];
    const stiva: Node[] = [doc as unknown as Node];
    while (stiva.length > 0) {
      const n = stiva.pop() as Node;
      if (n.nodeType === 1 && (n as Element).localName === 'style' && (n as Element).namespaceURI === ns) texte.push((n as Element).textContent ?? '');
      const copii: Node[] = [];
      for (let c = n.firstChild; c !== null; c = c.nextSibling) copii.push(c);
      stiva.push(...copii.reverse());
    }
    if (texte.length > 0) {
      foaie = foaieDin(texte);
      if (foaie.stil) nr.stil = 1;
    }
  }
  const costCss = { n: 0 };

  // Pagina (§2).
  const k = 25.4 / pxTol;
  const lw = citesteLungime(rad.getAttribute('width'));
  const lh = citesteLungime(rad.getAttribute('height'));
  // Fiecare latură judecată separat (precizarea din 12.10): o lungime pozitivă, altfel latura viewBox-ului, în px.
  const okW = lw.ok && lw.v > 0, okH = lh.ok && lh.v > 0;
  let vb: ReturnType<typeof citesteViewBox> = null;
  const vbText = rad.getAttribute('viewBox');
  if (vbText !== null) {
    vb = citesteViewBox(vbText);
    if (vb === null) nr['viewbox-invalid'] = 1;
  }
  let pagina: { latime: number; inaltime: number } | null = null;
  let mPagina: Mat;
  if ((okW && okH) || vb !== null) {
    // Cu viewBox și o singură lungime, cealaltă din raportul viewBox-ului (dimensionarea intrinsecă, revizia 12.10).
    const wMm = okW && lw.ok ? inMm(lw, pxTol) : null, hMm = okH && lh.ok ? inMm(lh, pxTol) : null;
    const v = vb as { w: number; h: number };
    const W = wMm ?? (hMm !== null ? (hMm * v.w) / v.h : v.w * k);
    const H = hMm ?? (wMm !== null ? (wMm * v.h) / v.w : v.h * k);
    pagina = { latime: W, inaltime: H };
    let sx = k, sy = k, tx = 0, ty = 0;
    if (vb !== null) {
      const al = citestePar(rad.getAttribute('preserveAspectRatio'));
      sx = W / vb.w;
      sy = H / vb.h;
      if (!al.none) {
        const s = al.slice ? Math.max(sx, sy) : Math.min(sx, sy);
        sx = s;
        sy = s;
      }
      tx = -vb.x * sx + al.x * (W - vb.w * sx);
      ty = -vb.y * sy + al.y * (H - vb.h * sy);
    }
    mPagina = { a: sx, b: 0, c: 0, d: -sy, e: tx, f: H - ty };
  } else {
    nr['pagina-fara-marime'] = 1;
    mPagina = { a: k, b: 0, c: 0, d: -k, e: 0, f: 0 };
  }
  // px: nicio latură absolută, o latură dată în px (sau fără unitate), sau fără viewBox.
  const inPx = (l: Lungime): boolean => l.ok && (l.unitate === '' || l.unitate === 'px');
  const px = vb === null || (!okW && !okH) || (okW && inPx(lw)) || (okH && inPx(lh));
  if (rad.hasAttribute('transform')) nr['transformare-radacina'] = 1;

  const cai: CaleO[] = [];
  let forma = 0;
  // Rădăcina: display nu se judecă (ca în 2.7c); restul se moștenește.
  const stRad = { ...stilCalculat(rad, STIL_RADACINA_PARINTE, foaie, costCss), ascuns: false };
  const stiva: Cadru[] = copiiElement(rad).reverse().map((el) => ({ el, m: mPagina, stil: stRad }));
  const lucru: Lucru = { produse: 0 };
  const jurnal: SubcaleJurnalO[] = [];
  try {
  while (stiva.length > 0) {
    const { el, m, stil: stParinte } = stiva.pop() as Cadru;
    if (el.namespaceURI !== ns) continue;
    const ln = el.localName;
    const stil = stilCalculat(el, stParinte, foaie, costCss);
    if (stil.ascuns) {
      if (FORME.has(ln) || ln === 'g' || ln === 'a' || ln === 'switch') {
        const n = formeAscunse(el, ns, limba);
        nr.ascunse += n;
        forma += n;
      }
      continue;
    }
    const vizibil = stil.visibility === 'visible';
    let m2 = m;
    const tr = el.getAttribute('transform');
    if (tr !== null) {
      const t = citesteTransform(tr);
      if (t === null) {
        nr['transformare-invalida']++;
        continue;
      }
      m2 = mul(m, t);
    }
    if (ln === 'g' || ln === 'a') {
      for (const c of copiiElement(el).reverse()) stiva.push({ el: c, m: m2, stil });
    } else if (ln === 'switch') {
      const c = alesSwitch(el, ns, limba);
      if (c !== undefined) stiva.push({ el: c, m: m2, stil });
    } else if (FORME.has(ln)) {
      const idx = forma++;
      if (!vizibil) nr.ascunse++;
      // ADR 0036 §9: doar o formă umplută cu regula nonzero se normalizează; `fill: none` se citește ca atare.
      // ADR 0037 §11 (2.3c-1): umplerea efectivă hotărăște și închiderea subcăilor fără `Z`.
      else proceseazaForma(el, ln, m2, stil.regula === 'nonzero' && stil.umplut, stil.umplut, idx, varianta, nr, cai, lucru, jurnal);
    } else if (ln in SARITE) {
      // Revizia 12.10: visibility nu le scoate din raport (un tspan vizibil reapare); doar display:none (mai sus).
      nr[SARITE[ln] as CodO]++;
    }
  }
  } catch (e) {
    if (e === PLAFON_LUCRU) return { ok: false, cod: 'plafon', avertismente: nr };
    throw e;
  }

  // Bugetul potrivirilor CSS (§4, felia 2.7d): peste 2·10⁷ pe fișier, refuz (nu se citește pe jumătate stilat).
  if (costCss.n > CONST_STIL.potriviri) return { ok: false, cod: 'plafon', detaliu: 'css', avertismente: nr };
  // Ordinea refuzurilor (revizia 12.10): plafon (vârfurile, apoi includerile), departe, gol. Plafonul vârfurilor se judecă
  // întâi pe intrare, înaintea normalizării (felia 2.7d, ADR 0036 §9): atunci numerele nonzero rămân 0.
  // ADR 0037 §11 (2.3c-3): `gol` = nicio cale, deschisă sau închisă (un fișier doar din linii se importă).
  if (cai.length === 0) return { ok: false, cod: 'gol', avertismente: nr, subcai: jurnal };
  if (cai.reduce((t, c) => t + c.varfuri.length, 0) > CONST_O.varfuriPrimite) return { ok: false, cod: 'plafon', avertismente: nr };
  for (const c of cai) {
    for (const v of c.varfuri) {
      const pts = v.s.tip === 'C' ? [v.p, v.s.c1, v.s.c2] : [v.p];
      if (pts.some((q) => Math.abs(q.x) > CONST_O.translatie || Math.abs(q.y) > CONST_O.translatie)) return { ok: false, cod: 'departe', avertismente: nr };
    }
  }

  // Mărimea desenului și toleranțele.
  const cut = cutieExacta(cai.flatMap((c) => c.runs));
  const marime = Math.max(cut.maxX - cut.minX, cut.maxY - cut.minY);
  const maxCoord = Math.max(Math.abs(cut.minX), Math.abs(cut.maxX), Math.abs(cut.minY), Math.abs(cut.maxY));
  const tolLC = CONST_O.relLinii * marime + 1e-15 * maxCoord;
  for (const c of cai) {
    for (const r of c.runs) {
      const baza = r.clasa === 'arc' ? CONST_O.relArc * r.raza + tolLC : r.clasa === 'eliptic' || r.clasa === 'plat' ? CONST_O.tolImport : tolLC;
      r.tol = baza + r.gol;
    }
    c.tolVarf = [];
    const n = c.runs.length;
    c.runs.forEach((r, i) => {
      // Pe o cale deschisă, primul vârf n-are vecin înainte (nicio închidere peste capăt).
      const prec = (c.inchis ? c.runs[(i - 1 + n) % n] : c.runs[Math.max(0, i - 1)]) as RunO;
      r.piese.forEach((_, j) => c.tolVarf.push(j === 0 ? Math.max(r.tol, prec.tol) : r.tol));
    });
    // ADR 0037 §11: vârful final al căii deschise e capătul ultimului segment.
    if (!c.inchis) c.tolVarf.push((c.runs[n - 1] as RunO).tol);
  }
  // Regula `nonzero` (§8, §10; ADR 0036, felia 2.7d): fiecare formă cu regula efectivă nonzero trece, cu toate subcăile
  // ei, prin normalizare. Oracolul nu refface aranjamentul: el decide, pe citirea de mai sus, care forme TREBUIE schimbate
  // (regiunea nonzero ≠ evenodd mai departe de τ, sau muchii coincidente) și care trebuie lăsate exact ca în 2.7c; ieșirea
  // schimbată o judecă `judecaRezultat` cu oracolul normalizării. Numerele raportului de aici sunt predicția fără refuzuri.
  const formeNonzero: FormaNonzeroO[] = [];
  {
    const peForma = new Map<number, CaleO[]>();
    for (const c of cai) {
      if (!c.nonzero) continue;
      const l = peForma.get(c.forma) ?? [];
      l.push(c);
      peForma.set(c.forma, l);
    }
    for (const [forma, l] of peForma) formeNonzero.push(analizaNonzero(forma, l, opt.densitateNonzero ?? 1));
  }
  // ADR 0036 §6: forma goală (regiunea vidă, sau o formă simplă mai subțire decât τ) se numără tot nonzero-normalizate;
  // dacă nu rămâne nimic, fișierul e „gol”. Forma subțire POATE și să rămână: alternativa e rezultatul în care rămâne.
  nr['nonzero-normalizate'] = formeNonzero.filter((f) => f.deSchimbat || f.gol).length;
  // Precizarea 2.3c-6 (ADR 0037 §11): o formă nonzero golită de tot de normalizare (regiunea vidă) se numără și la
  // `degenerate`, o dată pe formă (ALEGERE: „o formă … se numără”). Predicția numără orice formă prezisă goală; una care
  // păstrează căi deschise (L9) e ambiguă, iar `judecaRezultat` primește acolo și 0 (ALEGERE, în raport).
  nr.degenerate += formeNonzero.filter((f) => f.gol).length;
  // ADR 0037 §11: `inchise-la-usa` vine cu golul cel mai mare (nejudecat la aplicație: câmpul nu e numit).
  const golLaUsa = jurnal.reduce((m, j) => (j.inchisaDeUsa === 'usa' && j.soarta === 'cale' ? Math.max(m, j.gol) : m), 0);
  const ok: RezultatO = { ok: true, cai, pagina, px, illustrator, avertismente: nr, marime, tolLC, formeNonzero, subcai: jurnal, golLaUsa };
  const goale = new Set(formeNonzero.filter((f) => f.gol).map((f) => f.forma));
  // ADR 0037 §11 (2.3c-3): căile deschise nu intră în normalizare, deci rămân și într-o formă care dispare: fișierul e gol
  // doar dacă nu rămâne nicio cale, nici deschisă.
  if (goale.size > 0 && cai.every((c) => c.inchis && goale.has(c.forma))) {
    const subtiri = formeNonzero.filter((f) => f.gol && f.subtire);
    if (subtiri.length === 0) return { ok: false, cod: 'gol', avertismente: nr };
    // Forma subțire care rămâne nu e nici normalizată, nici golită (2.3c-6: nici `degenerate`).
    const nr2 = { ...nr, 'nonzero-normalizate': nr['nonzero-normalizate'] - subtiri.length, degenerate: nr.degenerate - subtiri.length };
    const alt: RezultatO = { ...ok, avertismente: nr2, formeNonzero: formeNonzero.map((f) => (f.subtire ? { ...f, gol: false } : f)) };
    return { ok: false, cod: 'gol', avertismente: nr, alternativ: alt };
  }
  return ok;
}

/** Subcăile unei forme, în unitățile formei (segmente + arcele formelor, cu centrul lor). */
type ArcForma = { k: 'AF'; a: P; b: P; c: P; rx: number; ry: number; t1: number; dt: number };
type SegF = SegU | ArcForma;
type SubcaleF = { start: P; segs: SegF[]; z: boolean; linie?: boolean };

/** Semnalul plafonului de lucru (§7): citirea se oprește. */
const PLAFON_LUCRU = Symbol('plafon');
type Lucru = { produse: number };

function proceseazaForma(el: Element, ln: string, m: Mat, normalizabila: boolean, umplut: boolean, idx: number, varianta: 2 | 4, nr: RaportO, cai: CaleO[], lucru: Lucru, jurnal: SubcaleJurnalO[]): void {
  const sub = subcaiForma(el, ln, varianta, nr);
  if (sub === null) return;
  if (esteSingularaO(m)) {
    nr.singulara++;
    return;
  }
  const idA = el.getAttribute('id');
  for (const s of sub) {
    // ADR 0037 §11 (2.3c-3): orice `line` e o cale deschisă (nicio închidere, niciodată praf), cu regula ei de degenerare.
    const linieSvg = s.linie === true;
    if (s.segs.length === 0 && !s.z) continue;
    const runs: RunO[] = [];
    const p0 = aplica(m, s.start);
    let cur = p0;
    // Vârfurile citite ale subcăii (§7): peste PLAFON.varfuriCale, subcalea se sare (prea-mari), închisă sau nu.
    let citite = 0;
    let preaMare = false;
    const adauga = (r: RunO | null): boolean => {
      if (r === null || citite + r.piese.length > CONST_O.varfuriCale) {
        preaMare = true;
        return false;
      }
      runs.push(r);
      citite += r.piese.length;
      lucru.produse += r.piese.length;
      if (lucru.produse > CONST_O.varfuriLucru) throw PLAFON_LUCRU;
      return true;
    };
    const linie = (a: P, b: P): RunO => ({ ex: { fel: 'L', a, b }, piese: [{ p: a, s: { tip: 'L' } }], clasa: 'L', raza: 0, gol: 0, tol: 0 });
    for (const g of s.segs) {
      const loc = CONST_O.varfuriCale - citite;
      let r: RunO | null;
      let b: P;
      if (g.k === 'L') {
        b = aplica(m, g.b);
        r = linie(cur, b);
        // ALEGERE: „nul exact” se judecă în coordonatele formei (cum citește și aplicația; după M, două puncte diferite pot
        // ajunge în același double).
        r.nul = g.a.x === g.b.x && g.a.y === g.b.y;
      } else if (g.k === 'C') {
        const c1 = aplica(m, g.c1), c2 = aplica(m, g.c2);
        b = aplica(m, g.b);
        r = { ex: { fel: 'C', a: cur, c1, c2, b }, piese: [{ p: cur, s: { tip: 'C', c1, c2 } }], clasa: 'C', raza: 0, gol: 0, tol: 0 };
        r.nul = [g.c1, g.c2, g.b].every((q) => q.x === g.a.x && q.y === g.a.y);
      } else if (g.k === 'A') {
        if (g.a.x === g.b.x && g.a.y === g.b.y) continue;
        b = aplica(m, g.b);
        if (g.rx === 0 || g.ry === 0) r = linie(cur, b);
        else {
          const a6 = arcCentru(g);
          r = arcInMm(cur, b, a6.c, a6.rx, a6.ry, a6.fi, a6.t1, a6.dt, m, nr, loc);
          if (r !== null && a6.lambda) {
            r.lambda = true;
            r.zg = zgomotF65(a6.c, a6.rx, a6.ry, r.raza / Math.max(a6.rx, a6.ry));
          }
        }
      } else {
        b = aplica(m, g.b);
        r = arcInMm(cur, b, g.c, g.rx, g.ry, 0, g.t1, g.dt, m, nr, loc);
        // Semitura cercului / elipsei: capete diametral opuse, deci Λ = 1 exact (doar pentru modul tolerant).
        if (r !== null && Math.abs(g.dt) === Math.PI) {
          r.lambda = true;
          r.zg = zgomotF65(g.c, g.rx, g.ry, r.raza / Math.max(g.rx, g.ry));
        }
      }
      if (r === OMIS) continue;
      if (!adauga(r)) break;
      cur = b;
    }
    if (preaMare) {
      nr['prea-mari']++;
      continue;
    }
    // Segmentele nule exact (§7): linia cu capetele egale, cubica cu cele patru puncte egale.
    const vii = runs.filter((r) => r.nul !== true);
    const pk = vii.length > 0 ? (vii[vii.length - 1] as RunO).ex.b : p0;
    const gol = Math.hypot(pk.x - p0.x, pk.y - p0.y);
    // Diagonala cutiei exacte a subcăii (cu startul și cu segmentele nule), în mm: praful de mai jos (ADR 0037 §11).
    const cut = cutieExacta(runs);
    const x0 = Math.min(cut.minX, p0.x), x1 = Math.max(cut.maxX, p0.x), y0 = Math.min(cut.minY, p0.y), y1 = Math.max(cut.maxY, p0.y);
    const diagonala = Math.hypot(x1 - x0, y1 - y0);
    const noteaza = (soarta: SoartaSubcaleO, inchisaDeUsa: 'umplere' | 'usa' | null, cale?: number): void => {
      jurnal.push({ forma: idx, soarta, z: s.z, gol, diagonala, umplut, inchisaDeUsa, ...(cale !== undefined ? { cale } : {}) });
    };
    /**
     * ADR 0037 §11 (2.3c-3): calea deschisă = vârfurile segmentelor vii plus vârful final (capătul ultimului segment, cu
     * segmentul `L`). Plafonul căii, cu vârful final inclus (ALEGERE: înaintea degenerării, ca la linia de închidere);
     * degenerată cu mai puțin de 2 vârfuri distincte sau cu lungimea (exactă) sub REZOLUTIE; nu intră în normalizarea nonzero.
     * Precizarea 2.3c-6: o subcale închisă de autor care e o linie păstrează drumul înapoi (linia de închidere, dacă s-a
     * adăugat, numărată în plafon ca `inchidere`), iar vârful ei final e startul (`fin`).
     */
    const deschisa = (fin: P = pk, inchidere = 0): void => {
      if (citite + inchidere + 1 > CONST_O.varfuriCale) {
        nr['prea-mari']++;
        noteaza('prea-mari', null);
        return;
      }
      const varfuri: VarfO[] = [...vii.flatMap((r) => r.piese), { p: fin, s: { tip: 'L' } }];
      if (varfuriDistincte(varfuri) < 2 || lungimeRuns(vii) < CONST_O.rezolutie) {
        nr.degenerate++;
        noteaza('degenerate', null);
        return;
      }
      nr.deschise++;
      noteaza('deschisa', null, cai.length);
      const cale: CaleO = { varfuri, forma: idx, runs: vii, tolVarf: [], nonzero: false, inchis: false };
      if (idA !== null) cale.nume = idA.slice(0, CONST_O.numeLungime);
      cai.push(cale);
    };
    if (linieSvg) {
      deschisa();
      continue;
    }
    // Închiderea: cu `Z`, sau prin apropiere (≤ TOLERANTA_IMPORT), ca în 2.7c; fără `Z`, peste ea (2.3c-1): umplerea
    // (`fill` efectiv ≠ `none`) închide cu o linie; `fill: none` închide doar golul de cel mult REZOLUTIE; altfel deschisă
    // (2.3c-3: o cale deschisă).
    let inchisaDeUsa: 'umplere' | 'usa' | null = null;
    // Precizarea 2.3c-6: linia de închidere adăugată (cu Z și golul peste TOLERANTA_IMPORT, sau de ușă).
    let cuInchidere = false;
    if (gol <= CONST_O.tolImport) {
      if (vii.length > 0) (vii[vii.length - 1] as RunO).gol = gol;
    } else if (s.z || umplut || gol <= CONST_O.rezolutie) {
      if (citite + 1 > CONST_O.varfuriCale) {
        nr['prea-mari']++;
        noteaza('prea-mari', null);
        continue;
      }
      vii.push(linie(pk, p0));
      cuInchidere = true;
      if (!s.z) inchisaDeUsa = umplut ? 'umplere' : 'usa';
    } else {
      deschisa();
      continue;
    }
    // O buclă dintr-o singură cubică (închisă, fără linia de închidere): împărțită la t = 1/2 (de Casteljau), două vârfuri.
    if (vii.length === 1 && (vii[0] as RunO).clasa === 'C') {
      const e = (vii[0] as RunO).ex as Extract<SegExact, { fel: 'C' }>;
      const mid = (p: P, q: P): P => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
      const ab = mid(e.a, e.c1), bc = mid(e.c1, e.c2), cd = mid(e.c2, e.b), abc = mid(ab, bc), bcd = mid(bc, cd), m0 = mid(abc, bcd);
      const gol = (vii[0] as RunO).gol;
      vii.splice(0, 1,
        { ex: { fel: 'C', a: e.a, c1: ab, c2: abc, b: m0 }, piese: [{ p: e.a, s: { tip: 'C', c1: ab, c2: abc } }], clasa: 'C', raza: 0, gol: 0, tol: 0 },
        { ex: { fel: 'C', a: m0, c1: bcd, c2: cd, b: e.b }, piese: [{ p: m0, s: { tip: 'C', c1: bcd, c2: cd } }], clasa: 'C', raza: 0, gol, tol: 0 });
    }
    const varfuri = vii.flatMap((r) => r.piese);
    /**
     * Precizarea 2.3c-6 (ADR 0037 §11): o subcale închisă fără arie e o linie, deci o cale deschisă. Închisă de ușă sau de
     * umplere: fără linia de închidere (n-a fost desenată; e ultimul segment). Închisă de autor (cu `Z`, sau prin apropiere):
     * cu drumul înapoi până în start, cum e desenat (linia de închidere, dacă s-a adăugat, rămâne), cu vârful final în start.
     * Se numără `deschise` (sau `degenerate`, sub 0,01 mm), nu la `inchise-de-umplere` / `inchise-la-usa`.
     */
    const caLinie = (): void => {
      if (inchisaDeUsa !== null) {
        vii.pop();
        deschisa();
      } else deschisa(p0, cuInchidere ? 1 : 0);
    };
    // (1) Mai puțin de 2 vârfuri: degenerată, ca în 2.7c. (O închidere a ușii adaugă o linie la un segment viu, deci are
    // mereu cel puțin 2 vârfuri; ramura ei rămâne cum era în 2.3c-3.)
    if (varfuri.length < 2) {
      if (inchisaDeUsa !== null) {
        vii.pop();
        deschisa();
      } else {
        nr.degenerate++;
        noteaza('degenerate', null);
      }
      continue;
    }
    // (2) Numai linii pe o dreaptă la 1e-12 din mărime (degenerarea exactă din 2.7c): o linie, cu regula de la (4). Înaintea
    // prafului: o linie exactă sub rezoluție e judecată ca linie (degenerată sub 0,01 mm).
    if (vii.every((r) => r.clasa === 'L') && coliniare(varfuri.map((v) => v.p))) {
      caLinie();
      continue;
    }
    // (3) ADR 0037 §11, praful (2.3c-1): o subcale, închisă (cu `Z`, prin apropiere) sau deschisă (închisă de ușă), cu
    // diagonala cutiei sub REZOLUTIE se sare, numărată `sub-rezolutie`, fără numărul închiderii. După degenerată (ALEGERE).
    if (diagonala < CONST_O.rezolutie) {
      nr['sub-rezolutie']++;
      noteaza('sub-rezolutie', inchisaDeUsa);
      continue;
    }
    // (4) DUPĂ praf: fără arce, toate punctele (cu mânerele cubicelor) la cel mult REZOLUTIE / 2 de dreapta prin cele mai
    // depărtate două puncte: o linie, cu aceeași regulă.
    if (linieFaraArie(vii)) {
      caLinie();
      continue;
    }
    if (inchisaDeUsa === 'umplere') nr['inchise-de-umplere']++;
    else if (inchisaDeUsa === 'usa') nr['inchise-la-usa']++;
    noteaza('cale', inchisaDeUsa, cai.length);
    const cale: CaleO = { varfuri, forma: idx, runs: vii, tolVarf: [], nonzero: normalizabila, inchis: true };
    if (idA !== null) cale.nume = idA.slice(0, CONST_O.numeLungime);
    cai.push(cale);
  }
}

/**
 * Toate punctele pe o dreaptă (§7, revizia 12.10): distanța fiecăruia la dreapta prin primul punct și punctul cel mai
 * depărtat de el ≤ 1e-12 × acea distanță.
 */
export function coliniare(pts: readonly P[]): boolean {
  const p0 = pts[0] as P;
  let D = 0, f = p0;
  for (const q of pts) {
    const d = Math.hypot(q.x - p0.x, q.y - p0.y);
    if (d > D) { D = d; f = q; }
  }
  if (D === 0) return true;
  const ux = (f.x - p0.x) / D, uy = (f.y - p0.y) / D;
  return pts.every((q) => Math.abs((q.x - p0.x) * uy - (q.y - p0.y) * ux) <= 1e-12 * D);
}

/**
 * Precizarea 2.3c-6 (ADR 0037 §11): punctele unei subcăi pentru regula liniei, în mm: vârfurile, capetele segmentelor și
 * mânerele cubicelor (și ale celor scrise din arce eliptice / plate: cubicele lor sunt cele cerute de ADR 0035 §6).
 */
export function puncteLinieO(runs: readonly RunO[]): P[] {
  const pts: P[] = [];
  for (const r of runs) {
    for (const v of r.piese) {
      pts.push(v.p);
      if (v.s.tip === 'C') pts.push(v.s.c1, v.s.c2);
    }
    pts.push(r.ex.b);
  }
  return pts;
}

/**
 * Perechea cea mai depărtată a unei mulțimi SUBȚIRI de puncte (toate la cel mult `h` de dreapta prin `a` și `u`, unitar):
 * capetele ei au proiecțiile pe `u` lângă extreme (cu marja (M − m) − √((M − m)² − (2h)²)), deci se caută doar printre
 * punctele de la cele două capete. Exactă, fără ipoteze despre ordine; la egalitate, prima pereche găsită.
 */
function perecheaDepartata(pts: readonly P[], a: P, u: P, h: number): [P, P] {
  const pr = pts.map((q) => (q.x - a.x) * u.x + (q.y - a.y) * u.y);
  let m = Infinity, M = -Infinity;
  for (const x of pr) { m = Math.min(m, x); M = Math.max(M, x); }
  const L = M - m;
  const marja = (L * L <= 4 * h * h ? L : L - Math.sqrt(L * L - 4 * h * h)) + 1e-9 * Math.max(1, Math.abs(m), Math.abs(M));
  const jos: P[] = [], sus: P[] = [];
  pts.forEach((q, i) => {
    if ((pr[i] as number) <= m + marja) jos.push(q);
    if ((pr[i] as number) >= M - marja) sus.push(q);
  });
  let best = -1;
  let rez: [P, P] = [a, a];
  for (const p of jos) {
    for (const q of sus) {
      const d = (q.x - p.x) * (q.x - p.x) + (q.y - p.y) * (q.y - p.y);
      if (d > best) { best = d; rez = [p, q]; }
    }
  }
  return rez;
}

/**
 * Precizarea 2.3c-6 (ADR 0037 §11), punctul 4: subcalea n-are arce (segmente `A` în ieșire; ALEGERE: arcele eliptice și
 * plate sunt scrise ca cubice, judecate pe mânerele lor) și toate punctele ei, cu mânerele cubicelor, stau la cel mult
 * REZOLUTIE / 2 de dreapta prin cele mai depărtate două puncte ale ei (ALEGERE: perechea se caută printre aceleași puncte,
 * cu mânere). Filtrul rapid: dacă toate stau la h de dreapta perechii, atunci stau la 6h de dreapta prin primul punct și
 * cel mai depărtat de el (sin θ ≤ 2h / D₀, iar orice punct e la cel mult 2·D₀ de primul); peste 8h, nu e linie.
 */
export function linieFaraArie(runs: readonly RunO[]): boolean {
  if (runs.length === 0 || runs.some((r) => r.clasa === 'arc')) return false;
  const h = CONST_O.rezolutie / 2;
  const pts = puncteLinieO(runs);
  const a = pts[0] as P;
  let D0 = 0, b = a;
  for (const q of pts) {
    const d = Math.hypot(q.x - a.x, q.y - a.y);
    if (d > D0) { D0 = d; b = q; }
  }
  if (D0 === 0) return false;
  const u = { x: (b.x - a.x) / D0, y: (b.y - a.y) / D0 };
  for (const q of pts) if (Math.abs((q.x - a.x) * u.y - (q.y - a.y) * u.x) > 8 * h) return false;
  const [p, q] = perecheaDepartata(pts, a, u, 8 * h);
  const L = Math.hypot(q.x - p.x, q.y - p.y);
  if (L === 0) return false;
  const v = { x: (q.x - p.x) / L, y: (q.y - p.y) / L };
  return pts.every((w) => Math.abs((w.x - p.x) * v.y - (w.y - p.y) * v.x) <= h);
}

/** ADR 0037 §11 (2.3c-3): câte vârfuri distincte (egale exact, în mm) are o cale. */
export function varfuriDistincte(v: readonly VarfO[]): number {
  return new Set(v.map((x) => `${x.p.x}|${x.p.y}`)).size;
}

/** Nodurile și ponderile Gauss–Legendre cu 5 puncte, pe [−1, 1]. */
const GL5 = [
  [0, 0.5688888888888889], [-0.5384693101056831, 0.4786286704993665], [0.5384693101056831, 0.4786286704993665],
  [-0.906179845938664, 0.2369268850561891], [0.906179845938664, 0.2369268850561891],
] as const;

/**
 * Lungimea unui segment exact: linia închis, arcul de cerc R·|Δθ|, cubica și arcul eliptic prin Gauss–Legendre cu 5 puncte
 * pe 32 de bucăți egale ale parametrului (eroarea, pe curbele netede ale corpusului, e mult sub 1e-9 mm).
 */
export function lungimeExacta(s: SegExact): number {
  if (s.fel === 'L') return Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y);
  if (s.fel === 'E' && s.cerc) return Math.hypot(s.u.x, s.u.y) * Math.abs(s.dt);
  const viteza = (f: number): number => {
    if (s.fel === 'C') {
      const d = derivCub(s.a, s.c1, s.c2, s.b, f);
      return Math.hypot(d.x, d.y);
    }
    const d = derivE(s, s.t0 + f * s.dt);
    return Math.hypot(d.x, d.y) * Math.abs(s.dt);
  };
  const B = 32;
  let L = 0;
  for (let k = 0; k < B; k++) {
    for (const [x, w] of GL5) L += (w / 2 / B) * viteza((k + (x + 1) / 2) / B);
  }
  return L;
}
export const lungimeRuns = (runs: readonly RunO[]): number => runs.reduce((t, r) => t + lungimeExacta(r.ex), 0);

/** Geometria SVG 2 a fiecărei forme, sau null când forma se sare (cu numărul ei, dacă e cazul). */
function subcaiForma(el: Element, ln: string, varianta: 2 | 4, nr: RaportO): SubcaleF[] | null {
  const invalid = (): null => {
    nr['atribut-invalid']++;
    return null;
  };
  /** Un atribut opțional: lipsa → implicit; altfel o lungime citită, sau `invalid`. */
  const optional = (nume: string, implicit: number): number | null => {
    const l = citesteLungime(el.getAttribute(nume));
    if (!l.ok) return l.motiv === 'lipsa' ? implicit : null;
    return inUtilizator(l);
  };
  /**
   * rx / ry ca în Edge (revizia 12.10): lipsă → null; necitibil (și „auto”, o unitate nesuportată) → 0; negativ → lipsă
   * (null). ALEGERE: procentul rămâne `atribut-invalid` (§2: procentele din atributele formelor sar forma).
   */
  const razaEdge = (nume: string): number | null | 'invalid' => {
    const l = citesteLungime(el.getAttribute(nume));
    if (!l.ok) return l.motiv === 'lipsa' ? null : l.motiv === 'procent' ? 'invalid' : 0;
    return l.v < 0 ? null : inUtilizator(l);
  };
  if (ln === 'path') {
    const d = el.getAttribute('d');
    if (d === null) return null;
    const r = citesteCale(d);
    if (r.eroare) nr['eroare-date']++;
    return r.subcai;
  }
  if (ln === 'polyline' || ln === 'polygon') {
    const t = el.getAttribute('points');
    if (t === null) return null;
    const r = citestePuncte(t);
    if (r.eroare) nr['eroare-date']++;
    if (r.puncte.length === 0) return [];
    const segs: SegF[] = [];
    for (let i = 1; i < r.puncte.length; i++) segs.push({ k: 'L', a: r.puncte[i - 1] as P, b: r.puncte[i] as P });
    return [{ start: r.puncte[0] as P, segs, z: ln === 'polygon' }];
  }
  if (ln === 'line') {
    const x1 = optional('x1', 0), y1 = optional('y1', 0), x2 = optional('x2', 0), y2 = optional('y2', 0);
    if (x1 === null || y1 === null || x2 === null || y2 === null) return invalid();
    return [{ start: { x: x1, y: y1 }, segs: [{ k: 'L', a: { x: x1, y: y1 }, b: { x: x2, y: y2 } }], z: false, linie: true }];
  }
  if (ln === 'rect') {
    const lw = citesteLungime(el.getAttribute('width')), lh = citesteLungime(el.getAttribute('height'));
    if ((!lw.ok && lw.motiv !== 'lipsa') || (!lh.ok && lh.motiv !== 'lipsa')) return invalid();
    if ((lw.ok && lw.v < 0) || (lh.ok && lh.v < 0)) return invalid();
    const x = optional('x', 0), y = optional('y', 0);
    if (x === null || y === null) return invalid();
    const rxe = razaEdge('rx'), rye = razaEdge('ry');
    if (rxe === 'invalid' || rye === 'invalid') return invalid();
    if (!lw.ok || !lh.ok || lw.v === 0 || lh.v === 0) return null;
    const w = inUtilizator(lw), h = inUtilizator(lh);
    let rx = rxe ?? rye ?? 0;
    let ry = rye ?? rxe ?? 0;
    rx = Math.min(rx, w / 2);
    ry = Math.min(ry, h / 2);
    if (rx === 0 || ry === 0) {
      const a = { x, y }, b = { x: x + w, y }, c = { x: x + w, y: y + h }, d = { x, y: y + h };
      return [{ start: a, segs: [{ k: 'L', a, b }, { k: 'L', a: b, b: c }, { k: 'L', a: c, b: d }, { k: 'L', a: d, b: a }], z: true }];
    }
    const p = [
      { x: x + rx, y }, { x: x + w - rx, y }, { x: x + w, y: y + ry }, { x: x + w, y: y + h - ry },
      { x: x + w - rx, y: y + h }, { x: x + rx, y: y + h }, { x, y: y + h - ry }, { x, y: y + ry },
    ] as [P, P, P, P, P, P, P, P];
    const centre = [{ x: x + w - rx, y: y + ry }, { x: x + w - rx, y: y + h - ry }, { x: x + rx, y: y + h - ry }, { x: x + rx, y: y + ry }];
    const segs: SegF[] = [];
    for (let q = 0; q < 4; q++) {
      segs.push({ k: 'L', a: p[2 * q] as P, b: p[2 * q + 1] as P });
      segs.push({ k: 'AF', a: p[2 * q + 1] as P, b: p[(2 * q + 2) % 8] as P, c: centre[q] as P, rx, ry, t1: -Math.PI / 2 + (q * Math.PI) / 2, dt: Math.PI / 2 });
    }
    return [{ start: p[0], segs, z: true }];
  }
  if (ln === 'circle' || ln === 'ellipse') {
    const cx = optional('cx', 0), cy = optional('cy', 0);
    let rx: number, ry: number;
    if (ln === 'circle') {
      const lr = citesteLungime(el.getAttribute('r'));
      if (!lr.ok && lr.motiv !== 'lipsa') return invalid();
      if (lr.ok && lr.v < 0) return invalid();
      if (cx === null || cy === null) return invalid();
      if (!lr.ok || lr.v === 0) return null;
      rx = ry = inUtilizator(lr);
    } else {
      const rxe = razaEdge('rx'), rye = razaEdge('ry');
      if (rxe === 'invalid' || rye === 'invalid') return invalid();
      if (cx === null || cy === null) return invalid();
      if (rxe === null && rye === null) return null;
      rx = rxe ?? (rye as number);
      ry = rye ?? rx;
      if (rx === 0 || ry === 0) return null;
    }
    const c = { x: cx, y: cy };
    const pe = (t: number): P => ({ x: cx + rx * cosG((t * 180) / Math.PI), y: cy + ry * sinG((t * 180) / Math.PI) });
    const pasi = varianta;
    const segs: SegF[] = [];
    for (let q = 0; q < pasi; q++) {
      const t1 = (q * 2 * Math.PI) / pasi, t2 = ((q + 1) * 2 * Math.PI) / pasi;
      segs.push({ k: 'AF', a: pe(t1), b: q + 1 === pasi ? pe(0) : pe(t2), c, rx, ry, t1, dt: (2 * Math.PI) / pasi });
    }
    return [{ start: pe(0), segs, z: true }];
  }
  return null;
}

// ---------------------------------------------------------------------------------------------------------------------
// Măsurile pe geometria exactă și pe căile aplicației.

export function distantaSegment(p: P, a: P, b: P): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  let t = l2 > 0 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(a.x + t * dx - p.x, a.y + t * dy - p.y);
}

/** Distanța la un arc exact; la cerc, închisă; la elipsă, eșantionare + secțiunea de aur + Newton pe fiecare minim local. */
export function distantaArc(p: P, e: ArcE): number {
  const pa = punctE(e, e.t0), pb = punctE(e, e.t0 + e.dt);
  const capete = Math.min(Math.hypot(p.x - pa.x, p.y - pa.y), Math.hypot(p.x - pb.x, p.y - pb.y));
  if (e.cerc) {
    const R = Math.hypot(e.u.x, e.u.y);
    const dx = p.x - e.c.x, dy = p.y - e.c.y;
    const cosT = (dx * e.u.x + dy * e.u.y) / (R * R), sinT = (dx * e.v.x + dy * e.v.y) / (R * R);
    let rel = Math.atan2(sinT, cosT) - e.t0;
    if (e.dt >= 0) rel = ((rel % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    else rel = -(((-rel % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI));
    if (Math.abs(rel) <= Math.abs(e.dt)) return Math.min(Math.abs(Math.hypot(dx, dy) - R), capete);
    return capete;
  }
  const N = 64;
  const f = (t: number): number => {
    const q = punctE(e, t);
    return Math.hypot(q.x - p.x, q.y - p.y);
  };
  const vals: number[] = [];
  for (let i = 0; i <= N; i++) vals.push(f(e.t0 + (e.dt * i) / N));
  let best = Math.min(...vals);
  for (let i = 0; i <= N; i++) {
    const v = vals[i] as number;
    if ((i > 0 && v > (vals[i - 1] as number)) || (i < N && v > (vals[i + 1] as number))) continue;
    let lo = e.t0 + (e.dt * Math.max(0, i - 1)) / N, hi = e.t0 + (e.dt * Math.min(N, i + 1)) / N;
    if (lo > hi) [lo, hi] = [hi, lo];
    const g = (Math.sqrt(5) - 1) / 2;
    let x1 = hi - g * (hi - lo), x2 = lo + g * (hi - lo), f1 = f(x1), f2 = f(x2);
    for (let it = 0; it < 60 && hi - lo > 1e-15; it++) {
      if (f1 < f2) { hi = x2; x2 = x1; f2 = f1; x1 = hi - g * (hi - lo); f1 = f(x1); }
      else { lo = x1; x1 = x2; f1 = f2; x2 = lo + g * (hi - lo); f2 = f(x2); }
    }
    let t = (lo + hi) / 2;
    // Newton pe (E − p)·E′ = 0, prins în [lo − pas, hi + pas].
    for (let it = 0; it < 4; it++) {
      const q = punctE(e, t), d1 = derivE(e, t);
      const d2 = { x: -(q.x - e.c.x), y: -(q.y - e.c.y) };
      const g1 = (q.x - p.x) * d1.x + (q.y - p.y) * d1.y;
      const g2 = d1.x * d1.x + d1.y * d1.y + (q.x - p.x) * d2.x + (q.y - p.y) * d2.y;
      if (!(g2 > 0)) break;
      const tn = t - g1 / g2;
      if (Math.abs(tn - t) > Math.abs(e.dt) / N) break;
      t = tn;
    }
    const tMin = Math.min(e.t0, e.t0 + e.dt), tMax = Math.max(e.t0, e.t0 + e.dt);
    t = Math.max(tMin, Math.min(tMax, t));
    best = Math.min(best, f(t), f((lo + hi) / 2));
  }
  return Math.min(best, capete);
}

export function distantaExact(p: P, s: SegExact): number {
  if (s.fel === 'L') return distantaSegment(p, s.a, s.b);
  if (s.fel === 'C') return distantaLaCubica({ a: s.a, c1: s.c1, c2: s.c2, b: s.b } as CubicaO, p.x, p.y).d;
  return distantaArc(p, s);
}
export function punctExact(s: SegExact, f: number): P {
  if (s.fel === 'L') return { x: s.a.x + f * (s.b.x - s.a.x), y: s.a.y + f * (s.b.y - s.a.y) };
  if (s.fel === 'C') return punctCub(s.a, s.c1, s.c2, s.b, f);
  return punctE(s, s.t0 + f * s.dt);
}

/** Un segment al aplicației (de la a la b, cu `s`). */
export type SegApp = { readonly a: P; readonly b: P; readonly s: SegO };

/** Arcul aplicației ca arc exact: centrul din coardă și bulge (bulge > 0: trigonometric). */
export function arcApp(a: P, b: P, bulge: number): ArcE {
  const dx = b.x - a.x, dy = b.y - a.y;
  const c = Math.hypot(dx, dy);
  const nx = dy / c, ny = -dx / c;
  const k = (c / 2) * ((1 - bulge * bulge) / (2 * bulge));
  const cen = { x: (a.x + b.x) / 2 - nx * k, y: (a.y + b.y) / 2 - ny * k };
  const R = (c * (1 + bulge * bulge)) / (4 * Math.abs(bulge));
  const t0 = Math.atan2(a.y - cen.y, a.x - cen.x);
  return { c: cen, u: { x: R, y: 0 }, v: { x: 0, y: R }, t0, dt: 4 * Math.atan(bulge), cerc: true };
}
export function distantaApp(p: P, g: SegApp): number {
  if (g.s.tip === 'L') return distantaSegment(p, g.a, g.b);
  if (g.s.tip === 'C') return distantaLaCubica({ a: g.a, c1: g.s.c1, c2: g.s.c2, b: g.b } as CubicaO, p.x, p.y).d;
  return distantaArc(p, arcApp(g.a, g.b, g.s.bulge));
}
export function punctApp(g: SegApp, f: number): P {
  if (g.s.tip === 'L') return { x: g.a.x + f * (g.b.x - g.a.x), y: g.a.y + f * (g.b.y - g.a.y) };
  if (g.s.tip === 'C') return punctCub(g.a, g.s.c1, g.s.c2, g.b, f);
  return punctE(arcApp(g.a, g.b, g.s.bulge), arcApp(g.a, g.b, g.s.bulge).t0 + f * 4 * Math.atan(g.s.bulge));
}

/** Maximul lui h pe [0, 1]: eșantioane, apoi fiecare maxim local (≥ 0,3 × maximul) rafinat prin secțiunea de aur. */
export function maximRafinat(h: (f: number) => number, N: number): { max: number; unde: number } {
  const v: number[] = [];
  for (let i = 0; i <= N; i++) v.push(h(i / N));
  let max = -Infinity, unde = 0;
  v.forEach((x, i) => { if (x > max) { max = x; unde = i / N; } });
  const prag = 0.3 * max;
  for (let i = 0; i <= N; i++) {
    const x = v[i] as number;
    if (x < prag || (i > 0 && x < (v[i - 1] as number)) || (i < N && x < (v[i + 1] as number))) continue;
    let lo = Math.max(0, (i - 1) / N), hi = Math.min(1, (i + 1) / N);
    const g = (Math.sqrt(5) - 1) / 2;
    let x1 = hi - g * (hi - lo), x2 = lo + g * (hi - lo), f1 = h(x1), f2 = h(x2);
    for (let it = 0; it < 40; it++) {
      if (f1 > f2) { hi = x2; x2 = x1; f2 = f1; x1 = hi - g * (hi - lo); f1 = h(x1); }
      else { lo = x1; x1 = x2; f1 = f2; x2 = lo + g * (hi - lo); f2 = h(x2); }
    }
    const fm = Math.max(f1, f2);
    if (fm > max) { max = fm; unde = f1 > f2 ? x1 : x2; }
  }
  return { max, unde };
}

// ---------------------------------------------------------------------------------------------------------------------
// Includerea (`evenodd`), aria cu semn și cutia, pe geometria exactă.

/** Traversările razei spre +x din (px, py) pe o bucată monotonă pe y, dată de funcția ei și de capete. */
function traversareMonotona(f: (t: number) => P, t0: number, t1: number, y0: number, y1: number, px: number, py: number): number {
  if ((y0 > py) === (y1 > py)) return 0;
  let lo = t0, hi = t1;
  const crescator = y1 > y0;
  for (let it = 0; it < 200; it++) {
    const mid = (lo + hi) / 2;
    if (mid === lo || mid === hi) break;
    const y = f(mid).y;
    if ((y > py) === crescator) hi = mid;
    else lo = mid;
  }
  return f((lo + hi) / 2).x > px ? 1 : 0;
}

function radaciniPatratice(A: number, B: number, C: number): number[] {
  const r: number[] = [];
  const s = Math.max(Math.abs(A), Math.abs(B), Math.abs(C));
  if (s === 0) return r;
  if (Math.abs(A) <= 1e-14 * s) {
    if (Math.abs(B) > 1e-14 * s) r.push(-C / B);
    return r;
  }
  const D = B * B - 4 * A * C;
  if (D < 0) return r;
  const q = -0.5 * (B + Math.sign(B || 1) * Math.sqrt(D));
  r.push(q / A);
  if (q !== 0) r.push(C / q);
  return r;
}

/** Tăieturile unei cubice pe o axă (rădăcinile lui B′ pe acea axă, în (0, 1)). */
function extremeCubica(a: number, c1: number, c2: number, b: number): number[] {
  const A = 3 * (-a + 3 * c1 - 3 * c2 + b), B = 6 * (a - 2 * c1 + c2), C = 3 * (c1 - a);
  return radaciniPatratice(A, B, C).filter((t) => t > 0 && t < 1).sort((x, y) => x - y);
}
/** Unghiurile (în intervalul arcului) unde o coordonată a lui E atinge extremul: −u·sin θ + v·cos θ = 0. */
function extremeArc(e: ArcE, axa: 'x' | 'y'): number[] {
  const u = e.u[axa], v = e.v[axa];
  if (u === 0 && v === 0) return [];
  const baza = Math.atan2(v, u);
  const lo = Math.min(e.t0, e.t0 + e.dt), hi = Math.max(e.t0, e.t0 + e.dt);
  const r: number[] = [];
  for (let k = Math.ceil((lo - baza) / Math.PI) - 1; baza + k * Math.PI < hi + 1; k++) {
    const t = baza + k * Math.PI;
    if (t > lo && t < hi) r.push(t);
  }
  return e.dt >= 0 ? r.sort((x, y) => x - y) : r.sort((x, y) => y - x);
}

export function traversari(s: SegExact, px: number, py: number): number {
  if (s.fel === 'L') {
    if ((s.a.y > py) === (s.b.y > py)) return 0;
    const x = s.a.x + ((py - s.a.y) * (s.b.x - s.a.x)) / (s.b.y - s.a.y);
    return x > px ? 1 : 0;
  }
  if (s.fel === 'C') {
    const f = (t: number): P => punctCub(s.a, s.c1, s.c2, s.b, t);
    const t = [0, ...extremeCubica(s.a.y, s.c1.y, s.c2.y, s.b.y), 1];
    let n = 0;
    for (let i = 0; i + 1 < t.length; i++) {
      const ya = i === 0 ? s.a.y : f(t[i] as number).y, yb = i + 2 === t.length ? s.b.y : f(t[i + 1] as number).y;
      n += traversareMonotona(f, t[i] as number, t[i + 1] as number, ya, yb, px, py);
    }
    return n;
  }
  const f = (t: number): P => punctE(s, t);
  const t = [s.t0, ...extremeArc(s, 'y'), s.t0 + s.dt];
  let n = 0;
  for (let i = 0; i + 1 < t.length; i++) {
    const ya = i === 0 ? s.a.y : f(t[i] as number).y, yb = i + 2 === t.length ? s.b.y : f(t[i + 1] as number).y;
    n += traversareMonotona(f, t[i] as number, t[i + 1] as number, ya, yb, px, py);
  }
  return n;
}

/** Punctul e în regiunea conturului închis (evenodd)? Ultimul segment se închide în primul punct (golul ≤ 1e-6). */
export function inRegiune(runs: readonly RunO[], px: number, py: number): boolean {
  let n = 0;
  runs.forEach((r, i) => {
    let s = r.ex;
    if (i === runs.length - 1 && s.fel === 'L') s = { fel: 'L', a: s.a, b: (runs[0] as RunO).ex.a };
    n += traversari(s, px, py);
  });
  // Golul închiderii (≤ 1e-6 mm) — un segment care închide exact.
  const ultim = (runs[runs.length - 1] as RunO).ex.b, prim = (runs[0] as RunO).ex.a;
  if (ultim.x !== prim.x || ultim.y !== prim.y) {
    const ex = runs[runs.length - 1] as RunO;
    if (ex.ex.fel !== 'L') n += traversari({ fel: 'L', a: ultim, b: prim }, px, py);
  }
  return n % 2 === 1;
}

/** Aria cu semn (Green): linii exacte, cubice prin Gauss–Legendre cu 4 puncte (integrandul are gradul 5), arce închis. */
export function arieRuns(runs: readonly RunO[]): number {
  let s = 0;
  const gl = [[-0.8611363115940526, 0.3478548451374538], [-0.3399810435848563, 0.6521451548625461], [0.3399810435848563, 0.6521451548625461], [0.8611363115940526, 0.3478548451374538]] as const;
  for (const r of runs) {
    const e = r.ex;
    if (e.fel === 'L') s += (e.a.x * e.b.y - e.b.x * e.a.y) / 2;
    else if (e.fel === 'C') {
      for (const [x, w] of gl) {
        const t = (x + 1) / 2;
        const q = punctCub(e.a, e.c1, e.c2, e.b, t), d = derivCub(e.a, e.c1, e.c2, e.b, t);
        s += (w / 2) * ((q.x * d.y - q.y * d.x) / 2);
      }
    } else {
      const t1 = e.t0, t2 = e.t0 + e.dt;
      const cu = e.c.x * e.u.y - e.c.y * e.u.x, cv = e.c.x * e.v.y - e.c.y * e.v.x, uv = e.u.x * e.v.y - e.u.y * e.v.x;
      s += (cu * (Math.cos(t2) - Math.cos(t1)) + cv * (Math.sin(t2) - Math.sin(t1)) + uv * e.dt) / 2;
    }
  }
  const prim = (runs[0] as RunO).ex.a, ultim = (runs[runs.length - 1] as RunO).ex.b;
  s += (ultim.x * prim.y - prim.x * ultim.y) / 2;
  return s;
}

export type Cutie = { minX: number; minY: number; maxX: number; maxY: number };
export function cutieExacta(runs: readonly RunO[]): Cutie {
  const c: Cutie = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  const ad = (p: P): void => {
    c.minX = Math.min(c.minX, p.x); c.maxX = Math.max(c.maxX, p.x);
    c.minY = Math.min(c.minY, p.y); c.maxY = Math.max(c.maxY, p.y);
  };
  for (const r of runs) {
    const e = r.ex;
    ad(e.a);
    ad(e.b);
    if (e.fel === 'C') {
      for (const t of [...extremeCubica(e.a.x, e.c1.x, e.c2.x, e.b.x), ...extremeCubica(e.a.y, e.c1.y, e.c2.y, e.b.y)]) ad(punctCub(e.a, e.c1, e.c2, e.b, t));
    } else if (e.fel === 'E') {
      for (const t of [...extremeArc(e, 'x'), ...extremeArc(e, 'y')]) ad(punctE(e, t));
    }
  }
  return c;
}

/** Cutia exactă a unei căi a aplicației (cu extremele arcelor și ale cubicelor; deschisă: fără segmentul de după final). */
export function cutieVarfuri(varfuri: readonly VarfO[], inchis = true): Cutie {
  const runs: RunO[] = segmenteApp(varfuri, inchis).map((g) => {
    const ex: SegExact = g.s.tip === 'L' ? { fel: 'L', a: g.a, b: g.b } : g.s.tip === 'C' ? { fel: 'C', a: g.a, c1: g.s.c1, c2: g.s.c2, b: g.b } : { fel: 'E', a: g.a, b: g.b, ...arcApp(g.a, g.b, g.s.bulge) };
    return { ex, piese: [], clasa: 'L', raza: 0, gol: 0, tol: 0 };
  });
  return cutieExacta(runs);
}

/**
 * Segmentele unei căi a aplicației: închisă, n (ultimul ajunge în primul vârf); deschisă (ADR 0037 §2), n − 1 (segmentul
 * vârfului final nu se ia în seamă).
 */
export const segmenteApp = (v: readonly VarfO[], inchis = true): SegApp[] =>
  inchis
    ? v.map((x, i) => ({ a: x.p, b: (v[(i + 1) % v.length] as VarfO).p, s: x.s }))
    : v.slice(0, -1).map((x, i) => ({ a: x.p, b: (v[i + 1] as VarfO).p, s: x.s }));

// ---------------------------------------------------------------------------------------------------------------------
// Latura (§8).

/**
 * O includere cu bugetul §8: candidatul vizitat costă 1, includerea măsurată (punctul în cutia candidatului) costă câte
 * vârfuri are calea candidat. ALEGERE: modelul de cost (aplicația îl poate număra altfel; testele stau departe de margine).
 */
export function includereCuBuget(b: CaleO, cutie: Cutie, p: P, buget: { rest: number }): boolean {
  buget.rest -= 1;
  if (p.x < cutie.minX || p.x > cutie.maxX || p.y < cutie.minY || p.y > cutie.maxY) return false;
  buget.rest -= b.varfuri.length;
  return inRegiune(b.runs, p.x, p.y);
}

/** Latura unei căi după imbricare: exterior / interior; o cale deschisă (2.3c-3) nu primește latură: `pe-linie`. */
export type LaturaO = 'exterior' | 'interior' | 'pe-linie';

/**
 * Laturile cu buget (§8): null când bugetul se termină. ADR 0037 §11 (2.3c-3): căile deschise nu intră în imbricare: nu
 * sunt candidați (ALEGERE: nu costă nimic) și primesc `pe-linie`.
 */
export function laturiBugetO(cai: readonly CaleO[], rest: number): LaturaO[] | null {
  const cutii = cai.map((c) => cutieExacta(c.runs));
  const buget = { rest };
  const r: LaturaO[] = [];
  for (const [i, a] of cai.entries()) {
    if (!a.inchis) { r.push('pe-linie'); continue; }
    const p = (a.varfuri[0] as VarfO).p;
    let n = 0;
    for (const [j, b] of cai.entries()) {
      if (j !== i && b.inchis && includereCuBuget(b, cutii[j] as Cutie, p, buget)) n++;
      if (buget.rest < 0) return null;
    }
    r.push(n % 2 === 0 ? 'exterior' : 'interior');
  }
  return r;
}

/**
 * Adâncimea fiecărei căi închise = câte alte căi ÎNCHISE conțin primul ei vârf; pară → exterior, impară → interior. O cale
 * deschisă (ADR 0037 §11) nu conține nimic și nu primește latură: `pe-linie`.
 */
export function laturiO(cai: readonly CaleO[]): LaturaO[] {
  const cutii = cai.map((c) => cutieExacta(c.runs));
  return cai.map((a, i) => {
    if (!a.inchis) return 'pe-linie';
    const p = (a.varfuri[0] as VarfO).p;
    let n = 0;
    cai.forEach((b, j) => {
      const k = cutii[j] as Cutie;
      if (j !== i && b.inchis && p.x >= k.minX && p.x <= k.maxX && p.y >= k.minY && p.y <= k.maxY && inRegiune(b.runs, p.x, p.y)) n++;
    });
    return n % 2 === 0 ? 'exterior' : 'interior';
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// Judecata.

const finit = (p: unknown): p is P => typeof p === 'object' && p !== null && Number.isFinite((p as P).x) && Number.isFinite((p as P).y);

/** Forma unui vârf al aplicației; textul problemei, sau null. */
function formaVarf(v: unknown): string | null {
  if (typeof v !== 'object' || v === null) return 'vârful nu e obiect';
  const x = v as { p?: unknown; s?: { tip?: unknown; bulge?: unknown; c1?: unknown; c2?: unknown } };
  if (!finit(x.p)) return 'p nefinit';
  const s = x.s;
  if (typeof s !== 'object' || s === null) return 's lipsă';
  if (s.tip === 'L') return null;
  if (s.tip === 'A') return typeof s.bulge === 'number' && Number.isFinite(s.bulge) && s.bulge !== 0 ? null : 'bulge invalid';
  if (s.tip === 'C') return finit(s.c1) && finit(s.c2) ? null : 'c1/c2 nefinite';
  return `tip necunoscut ${String(s.tip)}`;
}

export const tipuri = (v: readonly VarfO[]): string => v.map((x) => x.s.tip).join('');

/**
 * Opțiunile comparației. `lambdaTolerant` (doar pentru căutarea aleatoare, NU pentru corpus): pe un arc cu razele mărite
 * (Λ > 1), unde ADR-ul cere centrul exact în mijlocul coardei, se acceptă zgomotul de √ε al unei formule F.6.5 calculate
 * fără să pună radicandul la 0 (constatarea 1 a oracolului): semicercul împărțit în două jumătăți, toleranța crește cu
 * zgomotul `zgomotF65`, iar vârfurile dintre cubice se judecă pe curbă, nu față de vârfurile oracolului.
 */
export type OptiuniJudecata = { N?: number; lambdaTolerant?: boolean; densitateNonzero?: number };

/** O cale a aplicației față de calea oracolului: structura, vârfurile, apoi distanța în ambele sensuri, pe segmente. */
export function judecaCale(app: unknown, o: CaleO, eticheta: string, opt: OptiuniJudecata = {}): string[] {
  const N = opt.N ?? 24;
  const tolerant = opt.lambdaTolerant === true;
  const pr: string[] = [];
  if (!Array.isArray(app)) return [`${eticheta}: varfuri nu e listă`];
  for (const [i, v] of app.entries()) {
    const f = formaVarf(v);
    if (f !== null) return [`${eticheta}: vârful ${i}: ${f}`];
  }
  const toate = app as VarfO[];
  if (toate.length < 2) return [`${eticheta}: ${toate.length} vârfuri (< 2)`];
  // ADR 0037 §2, §11 (2.3c-3): calea deschisă are, după vârfurile segmentelor, vârful final (capătul ultimului segment), cu
  // segmentul `L`, neluat în seamă. Se judecă separat; segmentele sunt n − 1, fără nimic peste capăt.
  const deschisa = !o.inchis;
  const av = deschisa ? toate.slice(0, -1) : toate;
  if (deschisa) {
    const fa = toate[toate.length - 1] as VarfO, fo = o.varfuri[o.varfuri.length - 1] as VarfO;
    const tolF = o.tolVarf[o.tolVarf.length - 1] ?? 0;
    if (fa.s.tip !== 'L') pr.push(`${eticheta}: vârful final are segmentul ${fa.s.tip}, nu L (ADR 0037 §2)`);
    const d = Math.hypot(fa.p.x - fo.p.x, fa.p.y - fo.p.y);
    if (!(d <= tolF)) pr.push(`${eticheta}: vârful final (${fa.p.x}, ${fa.p.y}) ≠ (${fo.p.x}, ${fo.p.y}) cu ${d.toExponential(3)}`);
  }
  const sa = segmenteApp(toate, !deschisa);
  // Alinierea: fiecare segment exact își ia bucățile lui (în ordine, din primul vârf: deci startul și sensul).
  const tipApp = tipuri(av);
  type Felie = { r: RunO; k: number; n: number; libera: boolean; tol: number };
  // Potrivirea, în ordine. Doar modul tolerant are de ales (semicercul Λ ≥ 1 scris ca un arc sau ca două jumătăți), iar
  // alegerea e unică după |bulge| (> 0,7: un semicerc; ambele < 0,7: două jumătăți), deci fără întoarcere.
  const potriveste = (): Felie[] | null => {
    const l: Felie[] = [];
    let k = 0;
    for (const r of o.runs) {
      const t = tipuri(r.piese);
      const zgomot = tolerant && r.lambda === true ? (r.zg ?? 0) : 0;
      const b = (j: number): number => Math.abs(((av[j] as VarfO | undefined)?.s as { bulge?: number } | undefined)?.bulge ?? 0);
      const semitura = tolerant && r.lambda === true && r.clasa === 'arc' && t === 'A';
      if (tipApp.startsWith(t, k) && (!semitura || b(k) > 0.7)) l.push({ r, k, n: t.length, libera: zgomot > 0, tol: r.tol + zgomot });
      else if (semitura && tipApp.startsWith('AA', k) && b(k) < 0.7 && b(k + 1) < 0.7) l.push({ r, k, n: 2, libera: true, tol: r.tol + zgomot });
      else return null;
      k += (l[l.length - 1] as Felie).n;
    }
    return k === av.length ? l : null;
  };
  const felii = potriveste();
  if (felii === null) return [...pr, `${eticheta}: structura ${tipuri(toate)} ≠ ${tipuri(o.varfuri)} (oracol${deschisa ? ', cale deschisă' : ''})`];
  // Vârfurile: primul al fiecărui segment exact, la toleranța vecinilor; cele dinăuntru, față de ale oracolului (sau pe curbă).
  felii.forEach((fe, fi) => {
    // Pe o cale deschisă, primul segment n-are vecin înainte.
    const prec = (deschisa && fi === 0 ? fe : felii[(fi - 1 + felii.length) % felii.length]) as { tol: number };
    for (let j = 0; j < fe.n; j++) {
      const v = av[fe.k + j] as VarfO;
      const tolV = j === 0 ? Math.max(fe.tol, prec.tol) : fe.tol;
      if (j > 0 && fe.libera) {
        const d = distantaExact(v.p, fe.r.ex);
        if (!(d <= tolV)) pr.push(`${eticheta}: vârful ${fe.k + j} la ${d.toExponential(3)} de curbă`);
        continue;
      }
      const w = fe.r.piese[j] as VarfO;
      const d = Math.hypot(v.p.x - w.p.x, v.p.y - w.p.y);
      if (!(d <= tolV)) pr.push(`${eticheta}: vârful ${fe.k + j} (${v.p.x}, ${v.p.y}) ≠ (${w.p.x}, ${w.p.y}) cu ${d.toExponential(3)}`);
    }
  });
  // Segmentele nule: o linie sau o cubică nulă în coordonatele formei lipsește din oracol, deci o prinde structura de mai
  // sus; una nulă doar în mm (două puncte diferite care după M ajung în același double) rămâne, ca la oracol (ALEGERE).
  // Arcele (raza, sensul, bulge), cubicele din fișier (punctele de control trec exact prin M).
  sa.forEach((g, i) => {
    if (g.s.tip === 'A') {
      const c = Math.hypot(g.b.x - g.a.x, g.b.y - g.a.y);
      const b = Math.abs(g.s.bulge);
      const raza = (c / 4) * (b + 1 / b);
      if (!(raza <= CONST_O.razaArc)) pr.push(`${eticheta}: arcul ${i} are raza ${raza} > 10 000 mm`);
      if (c === 0) pr.push(`${eticheta}: arcul ${i} are capetele egale`);
    }
  });
  for (const fe of felii) {
    for (let j = 0; j < fe.n; j++) {
      const g = sa[fe.k + j] as SegApp;
      if (g.s.tip === 'A') {
        const w = (fe.libera ? fe.r.piese[0] : fe.r.piese[j]) as VarfO;
        const wb = (w.s as { bulge: number }).bulge;
        if (Math.sign(g.s.bulge) !== Math.sign(wb)) pr.push(`${eticheta}: arcul ${fe.k + j} are sensul întors (bulge ${g.s.bulge}, oracol ${wb})`);
        else if (!fe.libera && !(Math.abs(g.s.bulge - wb) <= (tolerant && fe.r.lambda === true ? 1e-4 : 1e-6) * Math.max(1, Math.abs(wb)))) pr.push(`${eticheta}: arcul ${fe.k + j}: bulge ${g.s.bulge} ≠ ${wb}`);
      }
      if (fe.r.clasa === 'C' && g.s.tip === 'C') {
        const w = fe.r.piese[0] as VarfO;
        if (w.s.tip === 'C') {
          const d = Math.max(Math.hypot(g.s.c1.x - w.s.c1.x, g.s.c1.y - w.s.c1.y), Math.hypot(g.s.c2.x - w.s.c2.x, g.s.c2.y - w.s.c2.y));
          if (!(d <= fe.tol)) pr.push(`${eticheta}: cubica ${fe.k}: punctele de control la ${d.toExponential(3)} de M(c1), M(c2)`);
        }
      }
    }
  }
  if (pr.length > 0) return pr;
  // Distanța în ambele sensuri, pe fiecare segment exact și bucățile aplicației care îl scriu, rafinată local.
  felii.forEach((fe, ri) => {
    const r = fe.r;
    const bucati = sa.slice(fe.k, fe.k + fe.n);
    const nb = bucati.length;
    const h1 = (f: number): number => {
      const q = punctExact(r.ex, f);
      const j = Math.min(nb - 1, Math.floor(f * nb));
      let d = Infinity;
      for (let t = Math.max(0, j - 1); t <= Math.min(nb - 1, j + 1); t++) d = Math.min(d, distantaApp(q, bucati[t] as SegApp));
      return d / fe.tol;
    };
    const m1 = maximRafinat(h1, Math.max(N, 4 * nb));
    if (!(m1.max <= 1)) pr.push(`${eticheta}: segmentul ${ri} (${r.clasa}): curba din fișier la ${(m1.max * fe.tol).toExponential(3)} mm de cale (tol ${fe.tol.toExponential(3)}), la f = ${m1.unde.toFixed(4)}`);
    bucati.forEach((g, bi) => {
      const h2 = (f: number): number => distantaExact(punctApp(g, f), r.ex) / fe.tol;
      const m2 = maximRafinat(h2, nb > 1 ? 12 : N);
      if (!(m2.max <= 1)) pr.push(`${eticheta}: segmentul ${ri} (${r.clasa}), bucata ${bi}: calea la ${(m2.max * fe.tol).toExponential(3)} mm de curba din fișier (tol ${fe.tol.toExponential(3)})`);
    });
  });
  return pr;
}

/** Codurile raportului pe care le judecă analiza formelor nonzero (nu comparația directă). */
export const CODURI_NONZERO_O = ['nonzero-normalizate', 'nonzero-refuzate'] as const;

type CaleApp = { varfuri?: unknown; forma?: unknown; nume?: unknown; inchis?: unknown };
/** ADR 0037 §11 (2.3c-3), ALEGERE de interfață: o cale a ușii e deschisă dacă are `inchis: false`. */
const deschisaApp = (c: CaleApp): boolean => c.inchis === false;

/**
 * Rezultatul aplicației față de al oracolului. Formele `evenodd` (și cele nonzero lăsate neschimbate) se judecă cale cu
 * cale, ca în 2.7c. O formă nonzero a cărei ieșire diferă de citirea 2.7c e o formă NORMALIZATĂ: se judecă cu oracolul
 * normalizării (ADR 0036: regiunea ei evenodd = regiunea nonzero a citirii, mai departe de τ; geometria din bucățile
 * citirii, la toleranța citirii; topologia), iar numele căilor ei e `id`-ul formei. Numerele `nonzero-*`: normalizate =
 * formele schimbate; refuzate între formele care trebuiau schimbate și au rămas ca în 2.7c și toate formele nonzero
 * rămase ca în 2.7c (un refuz pe o formă deja evenodd e posibil, dar nu obligatoriu).
 */
export function judecaRezultat(app: unknown, o: RezultatO, opt: OptiuniJudecata = {}): string[] {
  if (typeof app !== 'object' || app === null) return ['rezultatul nu e obiect'];
  const a = app as { ok?: unknown; cod?: unknown; cai?: unknown; pagina?: unknown; px?: unknown; illustrator?: unknown; avertismente?: unknown };
  if (!o.ok) {
    // O formă subțire (§6, K7) poate și să rămână: atunci se judecă alternativa.
    if (a.ok === true && o.alternativ !== undefined) return judecaRezultat(app, o.alternativ, opt);
    if (a.ok !== false) return [`trebuia refuzat (${o.cod}), dar ok = ${String(a.ok)}`];
    if (a.cod !== o.cod) return [`codul ${String(a.cod)} ≠ ${o.cod}`];
    const d = (app as { detaliu?: unknown }).detaliu;
    if (o.detaliu !== undefined && d !== o.detaliu) return [`detaliul ${String(d)} ≠ ${o.detaliu}`];
    if (o.cod === 'gol') return judecaRaport(a.avertismente, o.avertismente as RaportO);
    return [];
  }
  if (a.ok !== true) return [`trebuia acceptat, dar ok = ${String(a.ok)}, cod ${String(a.cod)}`];
  const pr: string[] = [];
  const pg = a.pagina as { latime: number; inaltime: number } | null;
  if (o.pagina === null) { if (pg !== null) pr.push(`pagina ${JSON.stringify(pg)} ≠ null`); }
  else if (pg === null || typeof pg !== 'object' || !(Math.abs(pg.latime - o.pagina.latime) <= 1e-12 * o.pagina.latime) || !(Math.abs(pg.inaltime - o.pagina.inaltime) <= 1e-12 * o.pagina.inaltime)) pr.push(`pagina ${JSON.stringify(pg)} ≠ ${JSON.stringify(o.pagina)}`);
  if (a.px !== o.px) pr.push(`px ${String(a.px)} ≠ ${String(o.px)}`);
  if (a.illustrator !== o.illustrator) pr.push(`illustrator ${String(a.illustrator)} ≠ ${String(o.illustrator)}`);
  // `sub-rezolutie` se judecă separat (mai jos): subcăile-praf prezise plus contururile de praf scoase din normalizare.
  // `degenerate` la fel (precizarea 2.3c-6): degeneratele citirii plus formele nonzero golite de tot de normalizare.
  pr.push(...judecaRaport(a.avertismente, o.avertismente, [...CODURI_NONZERO_O, 'sub-rezolutie', 'degenerate']));
  if (!Array.isArray(a.cai)) return [...pr, 'cai nu e listă'];
  // Căile aplicației, pe forme (în ordinea documentului).
  const appPeForma = new Map<number, CaleApp[]>();
  let ultima = -Infinity;
  for (const [i, c] of (a.cai as CaleApp[]).entries()) {
    const f = c?.forma;
    if (c?.inchis !== undefined && typeof c.inchis !== 'boolean') pr.push(`calea ${i}: inchis ${String(c.inchis)} nu e boolean`);
    if (typeof f !== 'number' || !Number.isInteger(f) || f < ultima) { pr.push(`calea ${i}: forma ${String(f)} în afara ordinii documentului`); continue; }
    ultima = f;
    const l = appPeForma.get(f) ?? [];
    l.push(c);
    appPeForma.set(f, l);
  }
  const oPeForma = new Map<number, CaleO[]>();
  for (const c of o.cai) { const l = oPeForma.get(c.forma) ?? []; l.push(c); oPeForma.set(c.forma, l); }
  const analize = new Map(o.formeNonzero.map((f) => [f.forma, f]));
  const forme = [...new Set([...appPeForma.keys(), ...oPeForma.keys()])].sort((x, y) => x - y);
  let schimbate = 0, ramaseDeSchimbat = 0, ramaseNonzero = 0;
  // ADR 0037 §11: contururile de praf scoase din ieșirea normalizării (găsite de oracolul normalizării) și formele
  // normalizate (intrarea lor, pentru căutarea întreagă când numărul aplicației nu se potrivește).
  let prafGasit = 0;
  // Precizarea 2.3c-6: formele normalizate fără nicio cale închisă în ieșire (golite de tot); dintre ele, cele care au
  // căi deschise în aceeași formă (ambigue: forma nu dispare, doar regiunea ei).
  let golite = 0, goliteCuDeschise = 0;
  const normalizate: Array<{ forma: number; intrare: CaleN[]; tol: number[][] }> = [];
  for (const f of forme) {
    const Atoate = appPeForma.get(f) ?? [], Otoate = oPeForma.get(f) ?? [];
    if (Otoate.length === 0) { pr.push(`forma ${f}: ${Atoate.length} căi pe care oracolul nu le are`); continue; }
    // ADR 0037 §11 (2.3c-3): căile deschise nu intră în normalizare; se judecă separat, în ordinea lor, ca în 2.7c.
    const Ad = Atoate.filter(deschisaApp), Od = Otoate.filter((c) => !c.inchis);
    if (Ad.length !== Od.length) pr.push(`forma ${f}: ${Ad.length} căi deschise ≠ ${Od.length} (oracol)`);
    else {
      Ad.forEach((c, k) => {
        const w = Od[k] as CaleO;
        if (c.nume !== w.nume) pr.push(`forma ${f}, calea deschisă ${k}: nume ${String(c.nume)} ≠ ${String(w.nume)}`);
        pr.push(...judecaCale(c.varfuri, w, `forma ${f}, calea deschisă ${k}`, opt));
      });
    }
    const A = Atoate.filter((c) => !deschisaApp(c)), O = Otoate.filter((c) => c.inchis);
    if (O.length === 0) {
      if (A.length > 0) pr.push(`forma ${f}: ${A.length} căi închise pe care oracolul nu le are`);
      continue;
    }
    // Ordinea subcăilor, deschise și închise amestecate, într-o formă rămasă ca în citire (normalizarea n-are o ordine).
    const sir = (l: boolean[]): string => l.map((d) => (d ? 'd' : 'i')).join('');
    const ordine = sir(Atoate.map(deschisaApp)) === sir(Otoate.map((c) => !c.inchis)) ? [] : [`forma ${f}: ordinea căilor deschise (d) și închise (i) ${sir(Atoate.map(deschisaApp))} ≠ ${sir(Otoate.map((c) => !c.inchis))} (oracol)`];
    const nonzero = (O[0] as CaleO).nonzero;
    const identic = A.length === O.length
      ? A.flatMap((c, k) => {
        const w = O[k] as CaleO;
        return [...(c.nume !== w.nume ? [`forma ${f}, calea ${k}: nume ${String(c.nume)} ≠ ${String(w.nume)}`] : []), ...judecaCale(c.varfuri, w, `forma ${f}, calea ${k}`, opt)];
      })
      : [`forma ${f}: ${A.length} căi ≠ ${O.length} (oracol)`];
    if (!nonzero) { pr.push(...identic, ...(identic.length === 0 ? ordine : [])); continue; }
    const an = analize.get(f);
    if (identic.length === 0) {
      ramaseNonzero++;
      if (an?.deSchimbat === true) ramaseDeSchimbat++;
      pr.push(...ordine);
      continue;
    }
    // Forma a fost normalizată.
    schimbate++;
    if (A.length === 0) {
      golite++;
      if (Od.length > 0) goliteCuDeschise++;
    }
    if (an !== undefined && an.deSchimbat === false && an.sigur && an.martor === null) pr.push(`forma ${f}: normalizată, dar regiunea ei nonzero e deja cea evenodd, fără muchii coincidente și fără martor la τ (§6: trebuia lăsată ca în 2.7c); ${identic[0]}`);
    const nume = (O[0] as CaleO).nume;
    A.forEach((c, k) => { if (c.nume !== nume) pr.push(`forma ${f} (normalizată), calea ${k}: nume ${String(c.nume)} ≠ ${String(nume)}`); });
    const tol = O.map((c) => c.tolVarf);
    const j = judecaNormalizarea(O.map((c) => c.varfuri as CaleN), 'nonzero', { ok: true, cai: A.map((c) => c.varfuri), info: {} }, {
      info: false, biti: false, asteptat: 'schimbat', densitate: opt.densitateNonzero ?? 1,
      tolSursa: (ci, vi) => (tol[ci]?.[vi] ?? 0),
      ...(an !== undefined ? { martor: an.martor } : {}),
      // ADR 0037 §11: contururile ieșirii sub rezoluție lipsesc (sărite de ușă, numărate `sub-rezolutie`).
      praf: CONST_O.rezolutie,
    });
    pr.push(...j.probleme.map((p) => `forma ${f} (normalizată): ${p}`));
    prafGasit += j.masuri.praf ?? 0;
    normalizate.push({ forma: f, intrare: O.map((c) => c.varfuri as CaleN), tol });
  }
  const av = (a.avertismente ?? {}) as Record<string, unknown>;
  if (av['nonzero-normalizate'] !== schimbate) pr.push(`raportul: nonzero-normalizate = ${String(av['nonzero-normalizate'])} ≠ ${schimbate} (formele nonzero schimbate)`);
  // `sub-rezolutie` = subcăile-praf (prezise exact) + contururile de praf ale formelor normalizate. Cele găsite lângă
  // dezacorduri sunt o margine de jos; dacă aplicația numără altfel, se caută toate (ferestrele în fiecare încrucișare).
  const subPrezis = o.avertismente['sub-rezolutie'];
  const subApp = av['sub-rezolutie'];
  if (subApp !== subPrezis + prafGasit) {
    let toate = 0;
    if (typeof subApp === 'number' && subApp > subPrezis + prafGasit) {
      for (const n of normalizate) toate += prafAdevarat(n.intrare, 'nonzero', CONST_O.rezolutie, { tolSursa: (ci, vi) => (n.tol[ci]?.[vi] ?? 0) }).length;
      toate = Math.max(toate, prafGasit);
    } else toate = prafGasit;
    if (subApp !== subPrezis + toate) pr.push(`raportul: sub-rezolutie = ${String(subApp)} ≠ ${subPrezis} (subcăile-praf) + ${toate} (contururile de praf ale normalizării, ADR 0037 §11)`);
  }
  // Precizarea 2.3c-6: `degenerate` = degeneratele citirii (predicția fără formele golite) + formele golite de aplicație
  // (judecate mai sus de oracolul normalizării: regiunea lor e vidă). O formă golită care păstrează căi deschise poate să nu
  // se numere (ambiguitatea din antet).
  const degCitire = o.avertismente.degenerate - o.formeNonzero.filter((f) => f.gol).length;
  const deg = av['degenerate'];
  if (typeof deg !== 'number' || !(deg >= degCitire + golite - goliteCuDeschise && deg <= degCitire + golite)) {
    const asteptat = goliteCuDeschise > 0 ? `∈ [${degCitire + golite - goliteCuDeschise}, ${degCitire + golite}]` : `≠ ${degCitire + golite}`;
    pr.push(`raportul: degenerate = ${String(deg)} ${asteptat} (${degCitire} ale citirii + ${golite} forme nonzero golite de normalizare, precizarea 2.3c-6)`);
  }
  const rf = av['nonzero-refuzate'];
  if (typeof rf !== 'number' || !(rf >= ramaseDeSchimbat && rf <= ramaseNonzero)) pr.push(`raportul: nonzero-refuzate = ${String(rf)} ∉ [${ramaseDeSchimbat}, ${ramaseNonzero}] (formele care trebuiau schimbate și au rămas ca în 2.7c; toate cele rămase)`);
  return pr;
}

export function judecaRaport(app: unknown, o: RaportO, exceptii: readonly string[] = []): string[] {
  if (typeof app !== 'object' || app === null) return ['raportul lipsește'];
  const r = app as Record<string, unknown>;
  const pr: string[] = [];
  const chei = Object.keys(r).sort().join(',');
  if (chei !== [...CODURI_O].sort().join(',')) pr.push(`cheile raportului: ${chei}`);
  for (const c of CODURI_O) if (!exceptii.includes(c) && r[c] !== o[c]) pr.push(`raportul: ${c} = ${String(r[c])} ≠ ${o[c]} (oracol)`);
  return pr;
}

/**
 * Căile finale: ale oracolului pentru formele rămase ca în 2.7c, ale aplicației (judecate) pentru cele normalizate, ca
 * `CaleO` cu geometria exactă a vârfurilor aplicației. Pentru laturi (§8) și colțul piesei, după `judecaRezultat` curat.
 */
export function caiFinaleO(app: unknown, o: RezultatO): CaleO[] {
  if (!o.ok) return [];
  type C = { varfuri: VarfO[]; forma: number; nume?: string; inchis?: boolean };
  const a = app as { cai: C[] };
  const oPeForma = new Map<number, CaleO[]>();
  for (const c of o.cai) { const l = oPeForma.get(c.forma) ?? []; l.push(c); oPeForma.set(c.forma, l); }
  const appPeForma = new Map<number, C[]>();
  for (const c of a.cai) { const l = appPeForma.get(c.forma) ?? []; l.push(c); appPeForma.set(c.forma, l); }
  const out: CaleO[] = [];
  for (const f of [...new Set([...oPeForma.keys(), ...appPeForma.keys()])].sort((x, y) => x - y)) {
    const O = oPeForma.get(f) ?? [], A = appPeForma.get(f) ?? [];
    const identic = A.length === O.length && A.every((c, k) => (c.inchis !== false) === (O[k] as CaleO).inchis && judecaCale(c.varfuri, O[k] as CaleO, 'x').length === 0);
    if (identic) { out.push(...O); continue; }
    for (const c of A) {
      // 2.3c-3: o cale deschisă a aplicației (judecată la `judecaRezultat`) rămâne deschisă, fără segmentul de după final.
      const inchis = c.inchis !== false;
      const runs: RunO[] = segmenteApp(c.varfuri, inchis).map((g) => {
        const ex: SegExact = g.s.tip === 'L' ? { fel: 'L', a: g.a, b: g.b } : g.s.tip === 'C' ? { fel: 'C', a: g.a, c1: g.s.c1, c2: g.s.c2, b: g.b } : { fel: 'E', a: g.a, b: g.b, ...arcApp(g.a, g.b, g.s.bulge) };
        return { ex, piese: [{ p: g.a, s: g.s }], clasa: 'L', raza: 0, gol: 0, tol: 0 };
      });
      const cale: CaleO = { varfuri: c.varfuri, forma: f, runs, tolVarf: c.varfuri.map(() => 0), nonzero: inchis, inchis };
      if (c.nume !== undefined) cale.nume = c.nume;
      out.push(cale);
    }
  }
  return out;
}

/**
 * ADR 0037 §11: câte contururi de praf are regiunea nonzero adevărată a formelor de schimbat (cele pe care ușa le sare din
 * ieșirea normalizării și le numără la `sub-rezolutie`, dacă normalizarea nu e refuzată). Căutarea întreagă (ferestrele în
 * fiecare încrucișare), pentru hârtie.
 */
export function prafNormalizareO(o: RezultatO): number {
  if (!o.ok) return 0;
  let n = 0;
  for (const f of o.formeNonzero) {
    if (!f.deSchimbat) continue;
    // Doar căile închise ale formei intră în normalizare (2.3c-3: cele deschise rămân afară).
    const cai = o.cai.filter((c) => c.forma === f.forma && c.inchis);
    n += prafAdevarat(cai.map((c) => c.varfuri as CaleN), 'nonzero', CONST_O.rezolutie, { tolSursa: (ci, vi) => (cai[ci]?.tolVarf[vi] ?? 0) }).length;
  }
  return n;
}

/** Analiza unei forme nonzero (citirea 2.7c a ei): trebuie schimbată? Regiunea ei e vidă? */
export function analizaNonzero(forma: number, cai: readonly CaleO[], densitate: number): FormaNonzeroO {
  const cn = cai.map((c) => c.varfuri as CaleN);
  const tol = cai.map((c) => c.tolVarf);
  const o = { densitate: Math.max(densitate, 0.01), tolSursa: (ci: number, vi: number): number => tol[ci]?.[vi] ?? 0 };
  /** Deja evenodd: cu martor la τ, poate ieși schimbată; fără nicio sondă umplută dincolo de τ, chiar goală. */
  const dejaEvenodd = (sigur: boolean): FormaNonzeroO => {
    const martor = martorTau(cn);
    const subtire = martor !== null && sondeUmplute(cn, 'nonzero', o) === 0;
    return { forma, deSchimbat: false, gol: subtire, sigur, dezacorduri: 0, coincidente: 0, martor, subtire };
  };
  // Un singur contur simplu din linii: deja evenodd, fără sonde de regiune.
  if (cn.length === 1 && conturSimpluDinLinii(cn[0] as CaleN) === true) return dejaEvenodd(true);
  if (densitate <= 0) return { forma, deSchimbat: false, gol: false, sigur: false, dezacorduri: 0, coincidente: 0, martor: null, subtire: false };
  const dezacorduri = regiuneaDifera(cn, 'nonzero', o).dezacorduri;
  // Coincidențele contează doar când regiunile nu diferă deja (perechile pot fi pătratice pe forme dense).
  let coincidente = 0;
  if (dezacorduri === 0) {
    const gr = grupuri(cn);
    const epsMax = gr.reduce((m, g) => Math.max(m, g.eps), 0);
    const segs = toatePrimitivele(cn);
    for (const s of segs) s.tol = tol[s.ci]?.[s.vi] ?? 0;
    coincidente = muchiiCoincidente(segs, (s) => epsMax + s.tol).length;
  }
  if (dezacorduri === 0 && coincidente === 0) return dejaEvenodd(true);
  const gol = sondeUmplute(cn, 'nonzero', o) === 0;
  return { forma, deSchimbat: true, gol, sigur: true, dezacorduri, coincidente, martor: null, subtire: false };
}

// ---------------------------------------------------------------------------------------------------------------------
// Piesa (§8).

/**
 * Argumentul piesei: căile ușii (cu `inchis: false` pe cele deschise, 2.3c-3), laturile lor, pagina și (ALEGERE de
 * interfață, sub-felia 2.3c-3) grosimea foii în mm, din care vine adâncimea operației `deschise` (ADR 0037 §11).
 */
export type PiesaArg = { nume: string; cai: Array<{ varfuri: VarfO[]; nume?: string; inchis?: boolean }>; laturi: ReadonlyArray<string>; pagina: { latime: number; inaltime: number } | null; grosime: number };
export const SCULA_IMPLICITA_SVG_O = { numar: 1, nume: 'freza plata', diametru: 6 } as const;

/**
 * Piesa construită de aplicație din căile ei: grupul `g` cu identitatea, c1…cN în ordine, coordonatele = ale căilor minus
 * colțul (același vector pentru toate), colțul = colțul cutiei exacte (oracolul), instanța în colț (sau în 0 fără pagină),
 * operațiile pe laturi, cu implicitele dreptunghiului, felii de cel mult 10 000 de noduri. Sub-felia 2.3c-3 (ADR 0037 §11):
 * elementul unei căi deschise are forma `cale` cu `inchis: false`, iar căile deschise primesc a treia operație, `deschise`
 * (`deschise-2` …): pe linie, min(1 mm, grosimea / 2) într-o trecere, urcare, freza foii, fără urechi, rampă, intrări și
 * colțuri. Căile deschise nu intră în exterior / interior, oricare le-ar fi latura din listă.
 */
export function judecaPiesa(rez: unknown, arg: PiesaArg, id: string, coltExact: P, tolColt: number, scula?: { numar: number; nume: string; diametru: number }): string[] {
  const pr: string[] = [];
  const r = rez as { piesa?: Record<string, unknown>; x?: unknown; y?: unknown };
  const piesa = r?.piesa;
  if (typeof piesa !== 'object' || piesa === null) return ['piesa lipsește'];
  if (piesa['id'] !== id) pr.push(`id ${String(piesa['id'])} ≠ ${id}`);
  if (piesa['nume'] !== arg.nume) pr.push(`nume ${String(piesa['nume'])} ≠ ${arg.nume}`);
  const rad = piesa['radacina'] as { tip?: unknown; id?: unknown; matrice?: unknown; copii?: unknown } | undefined;
  const idm = (m: unknown): boolean => JSON.stringify(m) === JSON.stringify(ID_O);
  if (rad?.tip !== 'grup' || rad.id !== 'g' || !idm(rad.matrice) || !Array.isArray(rad.copii)) return [...pr, `rădăcina: ${JSON.stringify(rad)?.slice(0, 200)}`];
  const copii = rad.copii as Array<{ tip?: unknown; id?: unknown; nume?: unknown; matrice?: unknown; forma?: { tip?: unknown; inchis?: unknown; varfuri?: VarfO[] } }>;
  if (copii.length !== arg.cai.length) return [...pr, `${copii.length} elemente ≠ ${arg.cai.length} căi`];
  const v0 = (arg.cai[0] as { varfuri: VarfO[] }).varfuri[0] as VarfO;
  const e0 = (copii[0]?.forma?.varfuri?.[0] as VarfO | undefined)?.p;
  if (e0 === undefined) return [...pr, 'primul element n-are vârfuri'];
  const colt = { x: v0.p.x - e0.x, y: v0.p.y - e0.y };
  if (!(Math.hypot(colt.x - coltExact.x, colt.y - coltExact.y) <= tolColt)) pr.push(`colțul (${colt.x}, ${colt.y}) ≠ cutia exactă (${coltExact.x}, ${coltExact.y})`);
  let maxC = 1;
  for (const c of arg.cai) for (const v of c.varfuri) maxC = Math.max(maxC, Math.abs(v.p.x), Math.abs(v.p.y));
  const eps = 1e-14 * maxC * 4;
  copii.forEach((e, i) => {
    const c = arg.cai[i] as { varfuri: VarfO[]; nume?: string; inchis?: boolean };
    if (e.tip !== 'element' || e.id !== `c${i + 1}` || !idm(e.matrice)) pr.push(`elementul ${i}: ${String(e.tip)} ${String(e.id)} ${JSON.stringify(e.matrice)}`);
    if (e.nume !== c.nume) pr.push(`elementul ${i}: nume ${String(e.nume)} ≠ ${String(c.nume)}`);
    const f = e.forma;
    // ADR 0037 §2, §11: `inchis` real (o cale deschisă citită închisă ar primi coarda de închidere, tăiată prin material).
    const inchis = c.inchis !== false;
    if (f?.tip !== 'cale' || f.inchis !== inchis || !Array.isArray(f.varfuri) || f.varfuri.length !== c.varfuri.length) { pr.push(`elementul ${i}: forma ${JSON.stringify(f)?.slice(0, 120)} (inchis așteptat ${String(inchis)})`); return; }
    const muta = (q: P, w: P): boolean => Math.abs(q.x + colt.x - w.x) <= eps && Math.abs(q.y + colt.y - w.y) <= eps;
    f.varfuri.forEach((v, j) => {
      const w = c.varfuri[j] as VarfO;
      let ok = muta(v.p, w.p) && v.s.tip === w.s.tip;
      if (ok && v.s.tip === 'A' && w.s.tip === 'A') ok = v.s.bulge === w.s.bulge;
      if (ok && v.s.tip === 'C' && w.s.tip === 'C') ok = muta(v.s.c1, w.s.c1) && muta(v.s.c2, w.s.c2);
      if (!ok) pr.push(`elementul ${i}, vârful ${j}: ${JSON.stringify(v)} nu e ${JSON.stringify(w)} minus colțul`);
    });
  });
  const ix = arg.pagina === null ? 0 : colt.x, iy = arg.pagina === null ? 0 : colt.y;
  if (!(Math.abs((r.x as number) - ix) <= eps && Math.abs((r.y as number) - iy) <= eps)) pr.push(`instanța (${String(r.x)}, ${String(r.y)}) ≠ (${ix}, ${iy})`);
  // Operațiile.
  const ops = piesa['operatii'] as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(ops)) return [...pr, 'operatii lipsă'];
  const asteptate: Array<{ id: string; latura: string; noduri: string[]; adancime: number }> = [];
  const felii = (baza: string, latura: string, ids: string[], adancime: number): void => {
    for (let k = 0; k * CONST_O.noduriOperatie < ids.length; k++) asteptate.push({ id: k === 0 ? baza : `${baza}-${k + 1}`, latura, noduri: ids.slice(k * CONST_O.noduriOperatie, (k + 1) * CONST_O.noduriOperatie), adancime });
  };
  const inchisa = (i: number): boolean => (arg.cai[i] as { inchis?: boolean }).inchis !== false;
  for (const lat of ['exterior', 'interior'] as const) felii(lat, lat, arg.laturi.flatMap((l, i) => (l === lat && inchisa(i) ? [`c${i + 1}`] : [])), 3);
  // ADR 0037 §11 (2.3c-3): a treia operație, pe căile deschise (o linie uitată în fișier lasă doar o urmă).
  felii('deschise', 'pe-linie', arg.cai.flatMap((_, i) => (inchisa(i) ? [] : [`c${i + 1}`])), adancimeDeschiseO(arg.grosime));
  const sc = scula ?? SCULA_IMPLICITA_SVG_O;
  if (ops.length !== asteptate.length) pr.push(`${ops.length} operații ≠ ${asteptate.length}: ${ops.map((o) => String(o['id'])).join(', ')}`);
  for (const w of asteptate) {
    const o = ops.find((x) => x['id'] === w.id);
    if (o === undefined) { pr.push(`operația ${w.id} lipsește`); continue; }
    // Într-o trecere: pasul = adâncimea. `despartire` (ADR 0037 §2) lipsă = false; importul nu marchează nimic.
    const asteptat = { id: w.id, tip: 'profil', noduri: w.noduri, scula: { numar: sc.numar, nume: sc.nume, diametru: sc.diametru }, latura: w.latura, adancime: w.adancime, pas: w.adancime, sens: 'urcare', urechi: null, rampa: null, intrari: null, colturi: null };
    const fara = (x: Record<string, unknown>): Record<string, unknown> => {
      if (x['despartire'] !== false) return x;
      const { despartire: _, ...rest } = x;
      return rest;
    };
    const pe = (x: Record<string, unknown>): string => JSON.stringify(Object.keys(x).sort().map((k) => [k, x[k]]));
    if (pe(fara(o)) !== pe(asteptat)) pr.push(`operația ${w.id}: ${JSON.stringify(o).slice(0, 300)} ≠ ${JSON.stringify(asteptat).slice(0, 300)}`);
  }
  return pr;
}

/** Colțul stânga-jos al cutiei exacte a desenului (oracolul). */
export function coltExact(cai: readonly CaleO[]): P {
  const c = cutieExacta(cai.flatMap((x) => x.runs));
  return { x: c.minX, y: c.minY };
}

/** Numele piesei din numele fișierului (§8): fără extensie, tăiat la 200. */
export function numeDinFisierO(f: string): string {
  const k = f.lastIndexOf('.');
  return (k > 0 ? f.slice(0, k) : f).slice(0, CONST_O.numeLungime);
}

export const octetiDin = (s: string): Uint8Array => new TextEncoder().encode(s);

/**
 * Laturile pe care §8 le hotărăște: primul vârf al căii nu stă (la `tol`) pe conturul altei căi. Felia 2.7d: contururile
 * normalizate se pot atinge într-un vârf (ADR 0036 §7), deci primul vârf al unuia poate sta pe altul, unde includerea e
 * nedefinită (ADR 0035 §8, ultimul paragraf).
 */
export function laturiHotarate(cai: readonly CaleO[], tol: number): boolean[] {
  return cai.map((a, i) => {
    // ADR 0037 §11 (2.3c-3): o cale deschisă e mereu `pe-linie`; una deschisă nu conține, deci nu contează ca vecină.
    if (!a.inchis) return true;
    const p = (a.varfuri[0] as VarfO).p;
    return cai.every((b, j) => j === i || !b.inchis || b.runs.every((r) => distantaExact(p, r.ex) > tol));
  });
}
