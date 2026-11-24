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

/** Motivele unui refuz (ADR 0232 §A.4): ale pachetului (`pachet.ts`, `zip.ts`) și ale bibliotecii (`biblioteca.ts`). */
const MOTIVE = [
  'nu-e-zip', 'zip64', 'criptat', 'metoda', 'prea-multe', 'prea-mare', 'crc', 'stricat', 'fara-manifest', 'manifest', 'api', 'id', 'cale',
  'intrare', 'stil', 'permisiune', 'pictograma', 'lipsa', 'in-plus', 'amprenta', 'amprenta-biblioteca', 'biblioteca-nepotrivita', 'retea', 'http',
];

test('fiecare motiv de refuz e o propoziție întreagă, pe înțeles, în ambele limbi', () => {
  for (const [limba, d] of Object.entries(DICTIONARE)) {
    const chei = Object.keys(d).filter((k) => k.startsWith('extensii.motiv.')).map((k) => k.slice('extensii.motiv.'.length)).sort();
    assert.deepEqual(chei, [...MOTIVE].sort(), `${limba}: lista motivelor`);
    for (const m of MOTIVE) {
      const text = d[`extensii.motiv.${m}`] as string;
      // Stă singură în fereastra refuzului și după „Actualizarea n-a mers.”: începe cu literă mare și se termină cu punct.
      assert.match(text, /^\p{Lu}/u, `${limba}: „${m}” nu începe cu literă mare: ${text}`);
      assert.match(text, /\.$/, `${limba}: „${m}” nu se termină cu punct: ${text}`);
    }
    // Termenul tehnic rămâne, mic, în paranteză (pentru autorul extensiei), nu ca subiect al propoziției.
    for (const [m, termen] of [['zip64', 'ZIP64'], ['crc', 'CRC'], ['api', 'HostApi'], ['amprenta', 'SHA-256']] as const) {
      assert.ok((d[`extensii.motiv.${m}`] as string).includes(`(${termen})`), `${limba}: „${m}” și-a pierdut termenul (${termen})`);
    }
    // Învelișurile nu mai lipesc motivul după două puncte.
    assert.equal(d['extensii.instalare.refuz'], undefined, `${limba}: „extensii.instalare.refuz” nu mai e folosită`);
    assert.doesNotMatch(d['extensii.biblioteca.esec'] as string, /: \{motiv\}/, `${limba}: „extensii.biblioteca.esec”`);
    assert.equal(d['extensii.spatiu.esuat'], undefined, `${limba}: „extensii.spatiu.esuat” (eroarea brută pe pagină) a plecat`);
  }
});

test('fraza izolării nu contrazice permisiunile de deasupra ei; termenii de programator au plecat (ADR 0232 §B)', () => {
  const ro = DICTIONARE.ro, en = DICTIONARE.en;
  // „nu vede … contul sau portul mașinii” stătea sub „Contul: vede dacă ești conectat” și „Mașina: încarcă programe”.
  assert.equal(ro['extensii.instalare.izolare'], 'Rulează izolată: poate doar ce scrie mai sus. Nu-ți vede desenul, proiectele, adresa sau parola și nu ajunge singură la mașină.');
  assert.doesNotMatch(ro['extensii.instalare.izolare'] as string, /contul|portul/);
  assert.match(en['extensii.instalare.izolare'] as string, /only what is listed above/);
  assert.doesNotMatch(en['extensii.instalare.izolare'] as string, /your account|port/);
  assert.equal(ro['extensii.biblioteca.verificat'], 'Verificată de cvs2 la instalare.');
  assert.doesNotMatch(en['extensii.biblioteca.verificat'] as string, /fingerprint/i);
  // Filele: „Toate” era doar catalogul, mai mic decât „Instalate” când sunt extensii din fișier.
  assert.equal(ro['extensii.biblioteca.fila-toate'], 'Din bibliotecă');
  assert.equal(en['extensii.biblioteca.fila-toate'], 'Library');
  // Lângă o listă goală, pagina nu mai spune „Alege o extensie din listă”.
  assert.equal(ro['extensii.biblioteca.alege'], undefined);
  assert.equal(en['extensii.biblioteca.alege'], undefined);
});
