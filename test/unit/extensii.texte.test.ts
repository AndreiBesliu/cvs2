/**
 * Textele permisiunilor extensiilor (ADR 0128 §A, ADR 0231 §B.3): fiecare permisiune din catalog are numele ei scurt și ce
 * poate face extensia cu ea, în ambele limbi; fereastra de confirmare le pune într-o listă. O permisiune nouă fără text ar
 * arăta omului cheia.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enCarcasa } from '../../src/i18n/carcasa.en.ts';
import { roCarcasa } from '../../src/i18n/carcasa.ro.ts';
import { CATALOG_PERMISIUNI } from '../../src/extensii/pachet.ts';

const DICTIONARE = { ro: roCarcasa as Record<string, unknown>, en: enCarcasa as Record<string, unknown> };

test('fiecare permisiune din catalog are numele scurt și „ce poate face”, în ambele limbi', () => {
  for (const [limba, d] of Object.entries(DICTIONARE)) {
    for (const p of CATALOG_PERMISIUNI) {
      for (const cheie of [`extensii.permisiune-scurt.${p}`, `extensii.poate.${p}`]) {
        const text = d[cheie];
        assert.equal(typeof text, 'string', `${limba}: lipsește „${cheie}”`);
        assert.ok((text as string).length > 0, `${limba}: „${cheie}” e gol`);
      }
      // Un rând al listei „Ce poate face”: fără punct la capăt și fără „să …” (fraza veche, „Cere: să …”).
      const poate = d[`extensii.poate.${p}`] as string;
      assert.doesNotMatch(poate, /[.;]$/, `${limba}: „extensii.poate.${p}” se termină cu punct`);
      // (`\b` nu vede marginea de după „ă”: de aceea spațiul.)
      assert.doesNotMatch(poate, /^(să|to)\s/i, `${limba}: „extensii.poate.${p}” e încă o cerere („să …”)`);
    }
  }
});

test('textele vechi, fraza „Cere: …” și detaliul tehnic din mesaje, au plecat', () => {
  for (const [limba, d] of Object.entries(DICTIONARE)) {
    for (const cheie of ['extensii.instalare.permisiuni', 'extensii.actualizare.cere-si', 'extensii.actualizare.pastreaza', 'extensii.adresa.esec', 'extensii.instalare.despre']) {
      assert.equal(d[cheie], undefined, `${limba}: „${cheie}” nu mai e folosită`);
    }
    for (const p of CATALOG_PERMISIUNI) assert.equal(d[`extensii.permisiune.${p}`], undefined, `${limba}: „extensii.permisiune.${p}”`);
    // Mărimile se scriu pe înțeles (`marime.ts`): niciun text nu mai are „{kb} kB”.
    for (const [cheie, text] of Object.entries(d)) {
      if (cheie.startsWith('extensii.')) assert.doesNotMatch(JSON.stringify(text), /\{kb\}/, `${limba}: „${cheie}” scrie încă mărimea în kB`);
    }
    for (const fel of ['zero', 'sub-kb', 'kb', 'mb']) assert.equal(typeof d[`extensii.marime.${fel}`], 'string', `${limba}: „extensii.marime.${fel}”`);
    // Mesajul unui catalog care nu se poate citi nu poartă detaliul tehnic („format”, „HTTP 500”): acela ajunge în jurnal.
    assert.doesNotMatch(String(d['extensii.biblioteca.eroare']), /\{/, `${limba}: mesajul bibliotecii are încă un parametru`);
    assert.doesNotMatch(`${String(d['extensii.adresa.esec-retea'])} ${String(d['extensii.adresa.esec-http'])}`, /CORS|undefined/, `${limba}: mesajul descărcării`);
  }
});
