import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TASTE_UNELTE, UNELTE } from '../../src/app/desenCalcul.ts';
import { FELURI_ALINIERE } from '../../src/geom/aliniere.ts';
import { enEditare } from '../../src/i18n/editare.en.ts';
import { roEditare } from '../../src/i18n/editare.ro.ts';
import { en } from '../../src/i18n/mesaje.en.ts';
import { ro } from '../../src/i18n/mesaje.ro.ts';
import { ACTIUNI_DOCUMENT } from '../../src/ui/actiuniDocument.ts';
import { ACTIUNI_EXPORT } from '../../src/ui/actiuniExport.ts';
import { ACTIUNI_IMPORT } from '../../src/ui/actiuniImport.ts';
import { ACTIUNI_VEDERE } from '../../src/ui/actiuniVedere.ts';
import { TASTE } from '../../src/ui/scurtaturi.ts';
import { normalizeazaCautare } from '../../src/docs/cautare.ts';
import { citesteManual, EroareManual, genereazaManualul, sursaManual, verificaLegaturi, verificaLimbile } from '../../scripts/manual.ts';
import { capitolPentru, esteManual, LIMBI_MANUAL, type LimbaManual, type Manual } from '../../shared/manual.ts';

/**
 * Poarta de acoperire a manualului (documentația live, ADR 0058): fiecare ușă a interfeței (acțiunile registrului,
 * uneltele și controalele editării) e acoperită de un capitol, în ambele limbi, iar capitolul o numește cu eticheta ei din
 * interfață (partea dinaintea parantezei sau a celor două puncte). O etichetă schimbată, o acțiune nouă sau un control nou
 * în bara editării fără capitol fac proba să cadă: manualul nu rămâne în urma interfeței. Plus: scurtăturile din
 * `src/ui/scurtaturi.ts` și tastele uneltelor stau în capitolul „scurtaturi”; generatorul refuză sursele greșite.
 */

type Usa = { readonly id: string; readonly eticheta: Readonly<Record<LimbaManual, string>> };

const dictionar = { ro: { ...ro, ...roEditare } as Record<string, unknown>, en: { ...en, ...enEditare } as Record<string, unknown> };
const eticheta = (cheie: string): Record<LimbaManual, string> => {
  const r = dictionar.ro[cheie], e = dictionar.en[cheie];
  if (typeof r !== 'string' || typeof e !== 'string') throw new Error(`cheia „${cheie}” nu e un text simplu în ambele dicționare`);
  return { ro: r, en: e };
};

/** Ușile interfeței: registrul de acțiuni, apoi bara și extensia editării (ce nu trece prin registru). */
const USI: readonly Usa[] = [
  ...[...ACTIUNI_DOCUMENT, ...ACTIUNI_VEDERE, ...ACTIUNI_IMPORT, ...ACTIUNI_EXPORT].map((a) => ({ id: a.id, eticheta: eticheta(a.eticheta) })),
  ...UNELTE.map((u) => ({ id: `unealta.${u}`, eticheta: eticheta(`editare.unealta.${u}`) })),
  { id: 'editare.lipire', eticheta: eticheta('editare.lipire') },
  { id: 'editare.grila', eticheta: eticheta('editare.grila') },
  { id: 'editare.aliniere', eticheta: eticheta('editare.aliniere') },
  ...FELURI_ALINIERE.map((f) => ({ id: `aliniaza.${f}`, eticheta: eticheta(`editare.aliniaza.${f}`) })),
  ...(['orizontal', 'vertical'] as const).map((d) => ({ id: `oglindeste.${d}`, eticheta: eticheta(`editare.oglindeste.${d}`) })),
  { id: 'editare.3d', eticheta: eticheta('editare.3d.arata') },
  { id: 'editare.manual', eticheta: eticheta('editare.manual') },
];

/**
 * Controalele cu `data-editare` din `src/app/Editare.tsx` și ușa care le acoperă (câmpurile stau cu unealta sau cu butonul
 * lor). Unul nou, lipsă de aici, face proba să cadă.
 */
const CONTROALE_EDITARE: Readonly<Record<string, string>> = {
  lipire: 'editare.lipire', grila: 'editare.grila', 'pas-grila': 'editare.grila', laturi: 'unealta.poligon', raza: 'unealta.cerc',
  aliniere: 'editare.aliniere', 'vedere-3d': 'editare.3d', manual: 'editare.manual', retea: 'document.copiaza-in-retea',
  'nod-colt': 'unealta.noduri', 'nod-ambele': 'unealta.noduri', 'nod-o-parte': 'unealta.noduri',
};

/** Numele scurt al unei etichete: înaintea parantezei sau a celor două puncte, fără „…”. */
export function numeScurt(e: string): string {
  return (e.split(/ \(|:/)[0] ?? e).replace(/…$/, '').trim();
}

const citeste = (cale: string): string => readFileSync(new URL(`../../${cale}`, import.meta.url), 'utf8');
const manuale = (): Manual[] => LIMBI_MANUAL.map((l) => citesteManual(citeste(sursaManual(l)), l, sursaManual(l)));

/** Problemele de acoperire ale unui manual, față de uși (lista goală: totul acoperit). */
function lipsuri(m: Manual, usi: readonly Usa[]): string[] {
  const out: string[] = [];
  const cunoscute = new Map(usi.map((u) => [u.id, u]));
  for (const u of usi) if (!m.capitole.some((c) => c.acopera.includes(u.id))) out.push(`${m.limba}: „${u.id}” nu e acoperită de niciun capitol`);
  for (const c of m.capitole) {
    const text = `${c.titlu}\n${c.text}`.toLocaleLowerCase(m.limba);
    for (const id of c.acopera) {
      const u = cunoscute.get(id);
      if (!u) {
        out.push(`${m.limba}: capitolul „${c.id}” acoperă „${id}”, care nu e o ușă a interfeței`);
        continue;
      }
      const nume = numeScurt(u.eticheta[m.limba]);
      if (!text.includes(nume.toLocaleLowerCase(m.limba))) out.push(`${m.limba}: capitolul „${c.id}” acoperă „${id}” fără s-o numească („${nume}”)`);
    }
  }
  return out;
}

test('ușile: fiecare are o etichetă cu nume scurt, fără id-uri repetate (sunt 52)', () => {
  assert.equal(new Set(USI.map((u) => u.id)).size, USI.length);
  for (const u of USI) for (const l of LIMBI_MANUAL) assert.ok(numeScurt(u.eticheta[l]).length >= 2, `${u.id} (${l})`);
  assert.equal(numeScurt('Transformare (S): mânerele'), 'Transformare');
  assert.equal(numeScurt('Importă SVG…'), 'Importă SVG');
  assert.equal(numeScurt('Oglindește orizontal: stânga ↔ dreapta (Shift+H)'), 'Oglindește orizontal');
  assert.equal(USI.length, 52);
});

test('fiecare ușă e acoperită, în ambele limbi, de un capitol care o numește cu eticheta din interfață', () => {
  for (const m of manuale()) assert.deepEqual(lipsuri(m, USI), [], m.limba);
});

test('poarta are dinți: o ușă scoasă din capitol, o etichetă schimbată, o ușă necunoscută sunt prinse', () => {
  const [m] = manuale();
  assert.ok(m);
  const fara = { ...m, capitole: m.capitole.map((c) => ({ ...c, acopera: c.acopera.filter((u) => u !== 'export.gcode') })) };
  assert.ok(lipsuri(fara, USI).some((x) => x.includes('„export.gcode” nu e acoperită')));
  const alta = USI.map((u) => (u.id === 'document.duplica-selectia' ? { ...u, eticheta: { ro: 'Clonează', en: 'Clone' } } : u));
  assert.ok(lipsuri(m, alta).some((x) => x.includes('„document.duplica-selectia” fără s-o numească („Clonează”)')));
  const straina = { ...m, capitole: m.capitole.map((c, k) => (k === 0 ? { ...c, acopera: [...c.acopera, 'document.inexistent'] } : c)) };
  assert.ok(lipsuri(straina, USI).some((x) => x.includes('„document.inexistent”, care nu e o ușă')));
});

test('fiecare control cu data-editare din bara editării are ușa lui (un control nou cere capitolul lui)', () => {
  const sursa = readFileSync(new URL('../../src/app/Editare.tsx', import.meta.url), 'utf8');
  const controale = [...new Set([...sursa.matchAll(/data-editare="([a-z0-9-]+)"/g)].map((x) => x[1]!))].sort();
  assert.ok(controale.length >= 8, controale.join(', '));
  for (const c of controale) {
    const usa = CONTROALE_EDITARE[c];
    assert.ok(usa, `controlul data-editare="${c}" n-are ușă în manual (CONTROALE_EDITARE)`);
    assert.ok(USI.some((u) => u.id === usa), `${c} → ${usa}`);
  }
  // Și ușile ajutorului după context (F1, `usaDeAcum` din Editare) sunt acoperite.
  for (const id of ['export.gcode', 'import.svg', 'vedere.paleta', 'editare.3d', ...UNELTE.map((u) => `unealta.${u}`)]) {
    assert.match(sursa, id.startsWith('unealta.') ? /`unealta\.\$\{unealta\}`/ : new RegExp(`'${id.replace('.', '\\.')}'`));
    for (const m of manuale()) assert.ok(capitolPentru(m, id), `${m.limba}: F1 pe „${id}” n-are capitol`);
  }
});

test('capitolul scurtăturilor are fiecare tastă a aplicației și a uneltelor, cu numele acțiunii ei', () => {
  for (const m of manuale()) {
    const c = m.capitole.find((x) => x.id === 'scurtaturi');
    assert.ok(c, m.limba);
    const text = c.text.toLocaleLowerCase(m.limba);
    for (const [tasta, actiune] of TASTE) {
      assert.ok(c.text.includes(`\`${tasta}\``), `${m.limba}: tasta ${tasta}`);
      const u = USI.find((x) => x.id === actiune);
      assert.ok(u && text.includes(numeScurt(u.eticheta[m.limba]).toLocaleLowerCase(m.limba)), `${m.limba}: ${tasta} → ${actiune}`);
    }
    for (const [tasta, unealta] of Object.entries(TASTE_UNELTE)) {
      assert.ok(c.text.includes(`\`${tasta.toUpperCase()}\``), `${m.limba}: tasta uneltei ${tasta}`);
      const u = USI.find((x) => x.id === `unealta.${unealta}`)!;
      assert.ok(text.includes(numeScurt(u.eticheta[m.limba]).toLocaleLowerCase(m.limba)), `${m.limba}: ${tasta} → ${unealta}`);
    }
    for (const t of ['Shift+H', 'Shift+V', 'F1', 'Esc']) assert.ok(c.text.includes(`\`${t}\``), `${m.limba}: ${t}`);
  }
});

test('generatorul: ambele limbi cu aceleași capitole, fișiere valide pentru aplicație, metadatele scoase din text', () => {
  const fisiere = genereazaManualul(citeste);
  assert.deepEqual([...fisiere.keys()], ['manual/ro.json', 'manual/en.json']);
  const [ro2, en2] = [...fisiere.values()].map((s) => JSON.parse(s) as unknown);
  assert.ok(esteManual(ro2) && esteManual(en2));
  assert.deepEqual(ro2.capitole.map((c) => c.id), en2.capitole.map((c) => c.id));
  assert.ok(ro2.capitole.length >= 12);
  for (const c of [...ro2.capitole, ...en2.capitole]) assert.ok(!c.text.includes('%%') && c.text.length > 200, c.id);
  assert.equal(ro2.titlu, 'Manualul CNC Vector Studio');
});

test('generatorul refuză: fără titlu, capitol fără id, id repetat sau greșit, metadate în alt loc, cheie necunoscută', () => {
  const ok = '# M\n\n## A\n%% capitol: a\n%% acopera: export.gcode\n\nText.\n\n## B\n%% capitol: b\n\nAlt text.\n';
  const m = citesteManual(ok, 'ro', 'x.md');
  assert.deepEqual(m.capitole.map((c) => [c.id, c.titlu, c.text, c.acopera]), [['a', 'A', 'Text.', ['export.gcode']], ['b', 'B', 'Alt text.', []]]);
  const cade = (text: string, motiv: RegExp): void => { assert.throws(() => citesteManual(text, 'ro', 'x.md'), (e: unknown) => e instanceof EroareManual && motiv.test(e.message)); };
  cade('## A\n%% capitol: a\n', /începe cu „# Titlu”/);
  cade('# M\n## A\nText.\n', /n-are „%% capitol: id”/);
  cade('# M\n## A\n\n%% capitol: a\n', /doar imediat sub titlul/);
  cade('# M\n## A\n%% capitol: a\n## B\n%% capitol: a\n', /deja al altui capitol/);
  cade('# M\n## A\n%% capitol: A_1\n', /litere mici/);
  cade('# M\n## A\n%% capitol: a\n%% culoare: rosu\n', /cheie necunoscută/);
  cade('# M\n## A\n%% capitol: a\n%% acopera: exportgcode\n', /grup\.nume/);
  cade('# M\nText liber.\n## A\n%% capitol: a\n', /nu stă text/);
  cade('# M\n## A\n%% capitol: a\n# Alt titlu\n', /un singur „# ”/);
  // Într-un bloc de cod, `%%` și `##` sunt text.
  const cod = citesteManual('# M\n## A\n%% capitol: a\n\n```\n%% nu e metadată\n## nici titlu\n```\n', 'ro', 'x.md');
  assert.equal(cod.capitole.length, 1);
  assert.match(cod.capitole[0]!.text, /%% nu e metadată\n## nici titlu/);
});

test('generatorul refuză limbile cu alte capitole și linkurile spre capitole care nu există', () => {
  const a = citesteManual('# M\n## A\n%% capitol: a\n\nVezi [B](#b).\n## B\n%% capitol: b\n\nT.\n', 'ro', 'ro.md');
  const b = citesteManual('# M\n## B\n%% capitol: b\n\nT.\n## A\n%% capitol: a\n\nT.\n', 'en', 'en.md');
  assert.throws(() => { verificaLimbile([a, b]); }, /nu sunt cele din/);
  verificaLegaturi(a);
  const rupt = citesteManual('# M\n## A\n%% capitol: a\n\nVezi [X](#x), nu `[Y](#y)`.\n', 'ro', 'ro.md');
  assert.throws(() => { verificaLegaturi(rupt); }, /link spre „#x”/);
});

test('căutarea din manual ignoră diacriticele și literele mari', () => {
  assert.equal(normalizeazaCautare('Rotește ȘI Ăsta'), 'roteste si asta');
});
