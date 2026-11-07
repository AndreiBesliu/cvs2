/**
 * Aranjamentul carcasei (felia 2.8a): ce stă în fiecare zonă a ecranului, scris ca DATE, nu ca JSX. Carcasa (`App.tsx`)
 * randează după el bara de sus, uneltele, panourile din stânga și din dreapta, cipurile de stare și bara selecției.
 *
 * De ce date: owner-ul a cerut pe 13.10, pentru mai târziu, un al doilea șablon (clasic: organizat ca ArtCAM sau ca
 * ediția întâi, fără nimic copiat) și interfața personalizabilă (omul își așază uneltele și salvează aranjamentul).
 * Amândouă devin atunci un alt obiect `Aranjament`, nu altă carcasă:
 * - un șablon nou e încă o constantă ca `ARANJAMENT_MODERN`, dată aplicației (`App`, proprietatea `aranjament`); o zonă
 *   pe care modernul n-o are (de exemplu o bară verticală de desen) se adaugă în `ZONE` și în randarea carcasei;
 * - un aranjament salvat de om e JSON-ul aceluiași tip: la citire trece întâi printr-o schemă (forma, ca la document),
 *   apoi prin `verificaAranjament` (id-urile, dublurile); cu orice problemă, aplicația pornește cu cel implicit.
 *
 * O unealtă e doar id-ul unei acțiuni din registru (`actiuni.ts`): eticheta, starea, motivul și scurtătura vin tot de
 * acolo, deci niciun aranjament nu ocolește ușa unică a acțiunilor. Panourile, cipurile și controalele se numesc după
 * id-ul lor, din listele de mai jos (singurele pe care carcasa știe să le randeze).
 */

/** Panourile carcasei. Mașina nu mai e unul (ADR 0132): e o fereastră. */
export const PANOURI = ['lista', 'proprietati'] as const;
export type IdPanou = (typeof PANOURI)[number];

/** Cipurile de stare: ce știe carcasa să arate ca stare (de obicei jos). */
export const CIPURI = ['selectie', 'avertisment', 'proiect', 'config', 'actualizare', 'cursor', 'zoom', 'jurnal', 'traseu', 'foaia'] as const;
export type IdCip = (typeof CIPURI)[number];

/**
 * Cipurile aplicației întregi, nu ale desenului (ADR 0132 §3): ele rămân în bara de jos și în fereastra Mașina. Selecția,
 * ieșirea din foaie, traseul, cursorul și zoomul vorbesc despre pânză, deci se văd doar în Proiectare.
 */
export const CIPURI_GLOBALE: ReadonlySet<IdCip> = new Set<IdCip>(['proiect', 'config', 'actualizare', 'jurnal']);

/**
 * Ferestrele aplicației (ADR 0132): filele meniului global, sub care stă câte o fereastră pe tot ecranul. Proiectarea ține
 * desenul (bara de desen, pânza, docurile); Mașina ține senderul. O extensie (gazda din Trenuleț) se adaugă aici.
 */
export const FERESTRE = ['proiectare', 'masina'] as const;
export type IdFereastra = (typeof FERESTRE)[number];

/** Acțiunea vederii care deschide fiecare fereastră (fila ei din meniu, paleta). Mașina păstrează id-ul panoului de dinainte. */
export const DESCHIDE_FEREASTRA: { readonly [F in IdFereastra]: string } = {
  proiectare: 'vedere.proiectare',
  masina: 'vedere.masina',
};

/** Controalele care nu sunt acțiuni ale registrului: limba (butoanele RO / EN, apăsat = limba de acum). */
/** `unelte`: locul uneltelor de desen, al lipirii și al alinierii (ADR 0052), umplut de modulul editării, la cerere. */
/** `vectori`: locul exportului vectorilor (ADR 0088), lângă import și G-code (ADR 0104 §8), umplut tot de modulul editării. */
/** `cont`: locul butonului Cont (ADR 0116), lângă temă (cererea owner-ului din 01.11), umplut tot de modulul editării. */
/** `ferestre`: filele ferestrelor aranjamentului (ADR 0132), în ordinea lor; fila ferestrei de acum e apăsată. */
/** `lucrare`: locul indicatorului lucrării (ADR 0132 §5), umplut de fereastra Mașina, după prima ei deschidere. */
export const CONTROALE = ['limba', 'unelte', 'vectori', 'cont', 'ferestre', 'lucrare'] as const;
export type IdControl = (typeof CONTROALE)[number];

/**
 * Cum arată o unealtă: doar iconița (numele în sfat, implicit), iconița cu numele la vedere, butonul principal (plin,
 * cu numele) sau câmpul de căutare (numele la vedere și scurtătura).
 */
export const ASPECTE = ['iconita', 'eticheta', 'principal', 'cauta'] as const;
export type Aspect = (typeof ASPECTE)[number];

export type Unealta = { readonly actiune: string; readonly aspect?: Aspect };
export type Intrare = Unealta | { readonly control: IdControl } | { readonly cip: IdCip };
/** Un grup de intrări. În bara de sus, grupurile sunt despărțite de o linie subțire. */
export type Grup = { readonly id: string; readonly intrari: readonly Intrare[] };

/**
 * Zonele cu bare: meniul global (sus de tot, în toate ferestrele, ADR 0132), sus (bara de acțiuni a Proiectării), unelte (sus
 * în dreapta), selecția (lângă selecție, pe pânză), jos (starea). Bara selecției își poartă uneltele cu `data-context`,
 * celelalte cu `data-actiune`.
 */
export const ZONE = ['meniu', 'sus', 'unelte', 'selectie', 'jos'] as const;
export type IdZona = (typeof ZONE)[number];

/** Docurile panourilor: stânga și dreapta pânzei, de sus în jos. */
export const DOCURI = ['stanga', 'dreapta'] as const;
export type IdDoc = (typeof DOCURI)[number];

export type Aranjament = {
  readonly id: string;
  readonly zone: { readonly [Z in IdZona]: readonly Grup[] };
  readonly docuri: { readonly [D in IdDoc]: readonly IdPanou[] };
  /** Ferestrele, în ordinea filelor lor; prima se deschide când browserul nu ține alta (ADR 0132 §2). */
  readonly ferestre: readonly IdFereastra[];
};

/** Acțiunea vederii care strânge și deschide fiecare panou (butonul din colțul lui). */
export const COMUTA_PANOU: { readonly [P in IdPanou]: string } = {
  lista: 'vedere.lista',
  proprietati: 'vedere.proprietati',
};

/** Zonele care își poartă uneltele cu `data-actiune` (localizatorii e2e le cer unice pe pagină). */
export const ZONE_CU_DATA_ACTIUNE: readonly IdZona[] = ['meniu', 'sus', 'unelte', 'jos'];

/**
 * Șablonul modern (prototipul B, „pânza întâi”, ales de owner pe 13.10): pânza ține tot ecranul, iar zonele plutesc
 * deasupra ei. Deasupra tuturor, meniul global (ADR 0132): filele ferestrelor, indicatorul lucrării, căutarea comenzilor,
 * limba, tema și contul. Sus: formele, selecția, istoricul, fișierele. Stânga: arborele proiectului; dreapta: proprietățile.
 * Jos: starea, cursorul, zoomul, jurnalul și „arată toată foaia”.
 */
export const ARANJAMENT_MODERN: Aranjament = {
  id: 'modern',
  zone: {
    meniu: [
      { id: 'ferestre', intrari: [{ control: 'ferestre' }] },
      { id: 'lucrare', intrari: [{ control: 'lucrare' }] },
      // Căutarea, limba, tema și contul sunt ale aplicației întregi, deci în meniu, nu în colțul barei de desen (ADR 0132).
      // Contul stă lângă temă (cererea owner-ului din 01.11: „account ar trebui sa sta in alta parte, langa theme button”).
      { id: 'vedere', intrari: [{ actiune: 'vedere.paleta', aspect: 'cauta' }, { control: 'limba' }, { actiune: 'vedere.tema' }, { control: 'cont' }] },
    ],
    sus: [
      // Uneltele de desen, Lipire, Grilă și Aliniere (ADR 0052); „Adaugă dreptunghi / cerc” rămân în paleta de comenzi.
      { id: 'forme', intrari: [{ control: 'unelte' }] },
      // Duplică și Șterge stau în bara selecției, lângă ea (și Ctrl+D, Delete, paleta): în bara de sus erau a doua oară.
      { id: 'istoric', intrari: [{ actiune: 'istoric.anuleaza' }, { actiune: 'istoric.reface' }] },
      // Fișierele, împreună și departe de uneltele de desen (cererea owner-ului din 28.10, ADR 0104 §8): importul (SVG, DXF,
      // PDF, AI), exportul vectorilor și G-code-ul. Primele două doar cu pictograma (eticheta în sfat): uneltele de desen au
      // intrat în bară (ADR 0052) și altfel „Exportă G-code” ieșea din ecran la 1280 px.
      { id: 'fisier', intrari: [{ actiune: 'import.svg' }, { control: 'vectori' }, { actiune: 'export.gcode', aspect: 'principal' }] },
    ],
    unelte: [],
    selectie: [
      {
        id: 'selectie',
        // „Trimite la <extensie>” (ADR 0166 §B) se arată doar cât e deschisă o extensie care primește forme.
        intrari: [
          { actiune: 'document.duplica-selectia' }, { actiune: 'document.sterge-selectia' }, { actiune: 'vedere.proprietati' },
          { actiune: 'extensii.trimite-selectia', aspect: 'eticheta' },
        ],
      },
    ],
    jos: [
      // „Versiune nouă gata” + „Reîncarcă” (ADR 0045 §5): doar cât un worker nou așteaptă clicul.
      // Foaia activă (ADR 0210 §1), doar când proiectul are mai multe foi.
      { id: 'stare', intrari: [{ cip: 'foaia' }, { cip: 'selectie' }, { cip: 'avertisment' }, { cip: 'proiect' }, { cip: 'config' }, { cip: 'actualizare' }] },
      // „Arată traseul” (ADR 0038 §2) stă cu vederea, lângă „Arată toată foaia”: în bara de sus ar lăți insula uneltelor
      // peste bara principală pe ecranele de laptop.
      { id: 'vedere', intrari: [{ cip: 'traseu' }, { cip: 'cursor' }, { cip: 'zoom' }, { cip: 'jurnal' }, { actiune: 'vedere.traseu' }, { actiune: 'vedere.potriveste' }] },
    ],
  },
  docuri: { stanga: ['lista'], dreapta: ['proprietati'] },
  ferestre: ['proiectare', 'masina'],
};

/** Cheia unei intrări într-o zonă: o acțiune, un control sau un cip apar cel mult o dată pe zonă (și ca cheie React). */
export function cheieIntrare(x: Intrare): string {
  return 'actiune' in x ? `actiune:${x.actiune}` : 'control' in x ? `control:${x.control}` : `cip:${x.cip}`;
}

/**
 * Problemele unui aranjament, în cuvinte (lista goală = bun): o acțiune care nu e în registru, un control, un cip, un
 * aspect sau un panou necunoscut, o intrare de două ori în aceeași zonă, un grup cu id dublat, un panou pus de două ori;
 * la ferestre (ADR 0132): una necunoscută sau pusă de două ori, lipsa Proiectării (acolo e desenul), mai multe ferestre fără
 * filele lor în vreo zonă, o filă fără acțiunea ei în registru. Aceeași acțiune poate sta în zone diferite (un om poate vrea
 * Anulează și sus, și jos).
 */
export function verificaAranjament(a: Aranjament, actiuni: ReadonlySet<string>): readonly string[] {
  const probleme: string[] = [];
  const cunoscut = (lista: readonly string[], x: string): boolean => lista.includes(x);
  for (const z of ZONE) {
    const vazute = new Set<string>();
    const grupuri = new Set<string>();
    for (const g of a.zone[z]) {
      if (grupuri.has(g.id)) probleme.push(`zona ${z}: grupul „${g.id}” apare de două ori`);
      grupuri.add(g.id);
      for (const x of g.intrari) {
        const k = cheieIntrare(x);
        if (vazute.has(k)) probleme.push(`zona ${z}: ${k} apare de două ori`);
        vazute.add(k);
        if ('actiune' in x) {
          if (!actiuni.has(x.actiune)) probleme.push(`zona ${z}: acțiunea „${x.actiune}” nu e în registru`);
          if (x.aspect !== undefined && !cunoscut(ASPECTE, x.aspect)) probleme.push(`zona ${z}: aspectul „${x.aspect}” nu există`);
        } else if ('control' in x) {
          if (!cunoscut(CONTROALE, x.control)) probleme.push(`zona ${z}: controlul „${x.control}” nu există`);
        } else if (!cunoscut(CIPURI, x.cip)) {
          probleme.push(`zona ${z}: cipul „${x.cip}” nu există`);
        }
      }
    }
  }
  const puse = new Set<string>();
  for (const d of DOCURI) {
    for (const p of a.docuri[d]) {
      if (!cunoscut(PANOURI, p)) {
        probleme.push(`docul ${d}: panoul „${p}” nu există`);
        continue;
      }
      if (puse.has(p)) probleme.push(`panoul „${p}” e pus de două ori`);
      puse.add(p);
      if (!actiuni.has(COMUTA_PANOU[p])) probleme.push(`panoul „${p}”: acțiunea „${COMUTA_PANOU[p]}” nu e în registru`);
    }
  }
  const ferestre = new Set<string>();
  for (const f of a.ferestre) {
    if (!cunoscut(FERESTRE, f)) {
      probleme.push(`fereastra „${f}” nu există`);
      continue;
    }
    if (ferestre.has(f)) probleme.push(`fereastra „${f}” e pusă de două ori`);
    ferestre.add(f);
    if (!actiuni.has(DESCHIDE_FEREASTRA[f])) probleme.push(`fereastra „${f}”: acțiunea „${DESCHIDE_FEREASTRA[f]}” nu e în registru`);
  }
  if (!ferestre.has('proiectare')) probleme.push('fără fereastra „proiectare”: desenul n-ar avea unde sta');
  const cuFile = ZONE.some((z) => a.zone[z].some((g) => g.intrari.some((x) => 'control' in x && x.control === 'ferestre')));
  if (ferestre.size > 1 && !cuFile) probleme.push('ferestrele n-au file: controlul „ferestre” nu e în nicio zonă');
  return probleme;
}
