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

/** Panourile carcasei. */
export const PANOURI = ['lista', 'proprietati', 'masina'] as const;
export type IdPanou = (typeof PANOURI)[number];

/** Cipurile de stare: ce știe carcasa să arate ca stare (de obicei jos). */
export const CIPURI = ['selectie', 'avertisment', 'proiect', 'config', 'actualizare', 'cursor', 'zoom', 'jurnal', 'traseu'] as const;
export type IdCip = (typeof CIPURI)[number];

/** Controalele care nu sunt acțiuni ale registrului: limba (butoanele RO / EN, apăsat = limba de acum). */
/** `unelte`: locul uneltelor de desen, al lipirii și al alinierii (ADR 0052), umplut de modulul editării, la cerere. */
export const CONTROALE = ['limba', 'unelte'] as const;
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
 * Zonele cu bare: sus (bara de acțiuni), unelte (sus în dreapta), selecția (lângă selecție, pe pânză), jos (starea).
 * Bara selecției își poartă uneltele cu `data-context`, celelalte cu `data-actiune`.
 */
export const ZONE = ['sus', 'unelte', 'selectie', 'jos'] as const;
export type IdZona = (typeof ZONE)[number];

/** Docurile panourilor: stânga și dreapta pânzei, de sus în jos. */
export const DOCURI = ['stanga', 'dreapta'] as const;
export type IdDoc = (typeof DOCURI)[number];

export type Aranjament = {
  readonly id: string;
  readonly zone: { readonly [Z in IdZona]: readonly Grup[] };
  readonly docuri: { readonly [D in IdDoc]: readonly IdPanou[] };
};

/** Acțiunea vederii care strânge și deschide fiecare panou (butonul din colțul lui). */
export const COMUTA_PANOU: { readonly [P in IdPanou]: string } = {
  lista: 'vedere.lista',
  proprietati: 'vedere.proprietati',
  masina: 'vedere.masina',
};

/** Zonele care își poartă uneltele cu `data-actiune` (localizatorii e2e le cer unice pe pagină). */
export const ZONE_CU_DATA_ACTIUNE: readonly IdZona[] = ['sus', 'unelte', 'jos'];

/**
 * Șablonul modern (prototipul B, „pânza întâi”, ales de owner pe 13.10): pânza ține tot ecranul, iar zonele plutesc
 * deasupra ei. Sus: formele, selecția, istoricul, fișierele; în dreapta, căutarea comenzilor, limba și tema. Stânga:
 * arborele proiectului; dreapta: proprietățile. Jos: starea, cursorul, zoomul, jurnalul și „arată toată foaia”.
 */
export const ARANJAMENT_MODERN: Aranjament = {
  id: 'modern',
  zone: {
    sus: [
      // Uneltele de desen, Lipire, Grilă și Aliniere (ADR 0052); „Adaugă dreptunghi / cerc” rămân în paleta de comenzi.
      { id: 'forme', intrari: [{ control: 'unelte' }] },
      // Duplică și Șterge stau în bara selecției, lângă ea (și Ctrl+D, Delete, paleta): în bara de sus erau a doua oară.
      { id: 'istoric', intrari: [{ actiune: 'istoric.anuleaza' }, { actiune: 'istoric.reface' }] },
      // „Importă SVG” doar cu pictograma (eticheta în sfat): uneltele de desen au intrat în bară (ADR 0052) și altfel
      // „Exportă G-code” ieșea din ecran la 1280 px.
      { id: 'fisier', intrari: [{ actiune: 'import.svg' }, { actiune: 'export.gcode', aspect: 'principal' }] },
    ],
    unelte: [
      { id: 'vedere', intrari: [{ actiune: 'vedere.paleta', aspect: 'cauta' }, { control: 'limba' }, { actiune: 'vedere.tema' }] },
    ],
    selectie: [
      {
        id: 'selectie',
        intrari: [{ actiune: 'document.duplica-selectia' }, { actiune: 'document.sterge-selectia' }, { actiune: 'vedere.proprietati' }],
      },
    ],
    jos: [
      // „Versiune nouă gata” + „Reîncarcă” (ADR 0045 §5): doar cât un worker nou așteaptă clicul.
      { id: 'stare', intrari: [{ cip: 'selectie' }, { cip: 'avertisment' }, { cip: 'proiect' }, { cip: 'config' }, { cip: 'actualizare' }] },
      // „Arată traseul” (ADR 0038 §2) stă cu vederea, lângă „Arată toată foaia”: în bara de sus ar lăți insula uneltelor
      // peste bara principală pe ecranele de laptop.
      { id: 'vedere', intrari: [{ cip: 'traseu' }, { cip: 'cursor' }, { cip: 'zoom' }, { cip: 'jurnal' }, { actiune: 'vedere.traseu' }, { actiune: 'vedere.potriveste' }] },
    ],
  },
  docuri: { stanga: ['lista'], dreapta: ['proprietati', 'masina'] },
};

/** Cheia unei intrări într-o zonă: o acțiune, un control sau un cip apar cel mult o dată pe zonă (și ca cheie React). */
export function cheieIntrare(x: Intrare): string {
  return 'actiune' in x ? `actiune:${x.actiune}` : 'control' in x ? `control:${x.control}` : `cip:${x.cip}`;
}

/**
 * Problemele unui aranjament, în cuvinte (lista goală = bun): o acțiune care nu e în registru, un control, un cip, un
 * aspect sau un panou necunoscut, o intrare de două ori în aceeași zonă, un grup cu id dublat, un panou pus de două ori.
 * Aceeași acțiune poate sta în zone diferite (un om poate vrea Anulează și sus, și jos).
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
  return probleme;
}
