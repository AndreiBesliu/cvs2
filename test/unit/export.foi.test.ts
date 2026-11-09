/**
 * „Toate foile” la export (ADR 0210 §5, felia 11.5↑): arhiva `.zip` stocată (pe hârtie: o intrare „a.txt” cu „hi” are 110
 * octeți), citită înapoi de cititorul extensiilor (altă implementare, cu CRC-ul verificat), cu aceiași octeți la fiecare
 * scriere; numele fișierelor unei foi în arhivă; foile identice; și calculul întreg: fiecare program din arhivă e, octet cu
 * octet, cel exportat doar din foaia lui, foile identice ies o dată, cu „-x2”, iar o foaie goală nu intră.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './limbi.ts';
import { citesteZip } from '../../src/extensii/zip.ts';
import { crc32 } from '../../src/io/crc32.ts';
import { scrieZip } from '../../src/io/scrieZip.ts';
import { documentNou, type Document } from '../../src/model/document.ts';
import { doarFoaia } from '../../src/model/foi.ts';
import { faraComentarii, foiIdentice, numeInArhiva } from '../../src/post/foi.ts';
import { calculeazaExport } from '../../src/ui/actiuniExportCalcul.ts';
import { docDin, ID } from './ajutor-document.ts';

const b = (s: string): Uint8Array => new TextEncoder().encode(s);
const LIMITE = { fisiere: 1000, octetiFisier: 50_000_000, octetiTotal: 200_000_000 };

test('CRC-32: valoarea de control a lui „123456789” e 0xCBF43926', () => {
  assert.equal(crc32(b('123456789')), 0xcbf43926);
});

test('arhiva cu „a.txt” = „hi”: 30 + 5 + 2 (antetul local) + 46 + 5 (directorul) + 22 (capătul) = 110 octeți; stocată, din 1980', async () => {
  const z = scrieZip([{ nume: 'a.txt', octeti: b('hi') }]);
  assert.ok(z.ok);
  assert.equal(z.octeti.length, 110);
  const v = new DataView(z.octeti.buffer);
  assert.equal(v.getUint32(0, true), 0x04034b50, 'antetul local');
  assert.equal(v.getUint16(8, true), 0, 'stocat (metoda 0)');
  assert.equal(v.getUint16(10, true), 0, 'ora 00:00');
  assert.equal(v.getUint16(12, true), (1 << 5) | 1, '01.01.1980');
  assert.equal(v.getUint32(14, true), crc32(b('hi')));
  assert.equal(v.getUint32(18, true), 2, 'mărimea arhivată');
  assert.equal(v.getUint32(22, true), 2, 'mărimea întreagă');
  assert.equal(v.getUint32(37, true), 0x02014b50, 'directorul, după 30 + 5 + 2 octeți');
  assert.equal(v.getUint32(88, true), 0x06054b50, 'capătul, după încă 46 + 5');
  assert.equal(v.getUint16(98, true), 1, 'o intrare');
  assert.equal(v.getUint32(100, true), 51, 'directorul are 51 de octeți');
  assert.equal(v.getUint32(104, true), 37, 'și începe la 37');
  const r = await citesteZip(z.octeti, LIMITE);
  assert.ok(r.ok);
  assert.deepEqual(r.intrari.map((x) => [x.nume, new TextDecoder().decode(x.octeti)]), [['a.txt', 'hi']]);
});

test('arhiva cu mai multe intrări (și un dosar în nume) se citește înapoi în ordine, cu aceiași octeți la a doua scriere; goală, doar capătul', async () => {
  const intrari = [
    { nume: 'F1/CNCVS2.NC', octeti: b('G21\nG90\n') },
    { nume: 'F2X3/CV1T2.NC', octeti: b('M3 S18000\n') },
    { nume: 'cncvs2-stanga-jos-foaia-4.nc', octeti: new Uint8Array(70_000).fill(0x47) },
  ];
  const a = scrieZip(intrari), c = scrieZip(intrari);
  assert.ok(a.ok && c.ok);
  assert.ok(Buffer.from(a.octeti).equals(Buffer.from(c.octeti)), 'aceiași octeți');
  const r = await citesteZip(a.octeti, LIMITE);
  assert.ok(r.ok);
  assert.deepEqual(r.intrari.map((x) => x.nume), intrari.map((x) => x.nume));
  r.intrari.forEach((x, k) => { assert.ok(Buffer.from(x.octeti).equals(Buffer.from(intrari[k]!.octeti)), x.nume); });
  const gol = scrieZip([]);
  assert.ok(gol.ok);
  assert.equal(gol.octeti.length, 22);
});

test('arhiva fără ZIP64: 65 536 de intrări sau peste 4 GB, refuz (fără să scrie ceva)', () => {
  const multe = Array.from({ length: 0x10000 }, (_, k) => ({ nume: `f${k}`, octeti: new Uint8Array(0) }));
  assert.deepEqual(scrieZip(multe), { ok: false, motiv: 'arhiva ar avea peste 65 535 de fișiere' });
  assert.ok(scrieZip(multe.slice(1)).ok, '65 535 trec');
  // Mărimea se judecă înaintea alocării: un fișier care s-ar întinde dincolo de 4 GB, fără octeți adevărați.
  const urias = { nume: 'u.nc', octeti: { length: 0xffffffff } as unknown as Uint8Array };
  assert.deepEqual(scrieZip([urias]), { ok: false, motiv: 'arhiva ar trece de 4 GB' });
});

test('numele în arhivă: foaia după baza `cncvs2-<origine>`, cu -x<N> pentru foile identice; dosarul foii pe nume scurte', () => {
  assert.equal(numeInArhiva('cncvs2-stanga-jos.nc', 2, 1, 'stanga-jos', false), 'cncvs2-stanga-jos-foaia-2.nc');
  assert.equal(numeInArhiva('cncvs2-stanga-jos-1-T2.nc', 2, 3, 'stanga-jos', false), 'cncvs2-stanga-jos-foaia-2-x3-1-T2.nc');
  assert.equal(numeInArhiva('cncvs2-centru-sus-dop-1.nc', 1, 1, 'centru-sus', false), 'cncvs2-centru-sus-foaia-1-dop-1.nc');
  assert.equal(numeInArhiva('CV1T2.NC', 2, 3, 'stanga-jos', true), 'F2X3/CV1T2.NC');
  assert.equal(numeInArhiva('CNCVS2.NC', 1, 1, 'stanga-jos', true), 'F1/CNCVS2.NC');
  assert.equal(numeInArhiva('altceva.nc', 4, 1, 'stanga-jos', false), 'foaia-4-altceva.nc');
});

test('programul fără comentarii: parantezele și `;` până la capătul rândului pleacă, mișcările rămân', () => {
  assert.equal(faraComentarii('G21 (mm)' + String.fromCharCode(10) + '(r/r: dreptunghi)' + String.fromCharCode(10) + 'G1 X10 ; tăierea'),
    'G21 ' + String.fromCharCode(10) + String.fromCharCode(10) + 'G1 X10 ');
});

test('foile identice: grupurile în ordinea primei foi; o foaie fără semnătură nu intră', () => {
  assert.deepEqual(foiIdentice(['a', 'b', 'a', null, 'b', 'c']), [[0, 2], [1, 4], [5]]);
  assert.deepEqual(foiIdentice([null, null]), []);
});

/** Trei foi: 1 și 3 identice (aceeași piesă, în același loc), 2 cu un cerc, 4 goală; foaia activă e a doua. */
function patruFoi(): Document {
  const d = docDin({ latime: 300, inaltime: 200, grosime: 18 },
    { id: 'r', forma: { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 }, matrice: { ...ID, e: 20, f: 20 } },
    { id: 'c', forma: { tip: 'cerc', raza: 20 }, matrice: { ...ID, e: 150, f: 100 } });
  const [r, c] = d.foi[0]!.instante;
  const stoc = d.foi[0]!.stoc;
  const nou = documentNou(stoc).foi[0]!;
  return {
    ...d,
    foi: [
      { ...nou, id: 'f1', instante: [r!] },
      { ...nou, id: 'f2', instante: [c!] },
      { ...nou, id: 'f3', instante: [{ ...r!, id: 'r2' }] },
      { ...nou, id: 'f4', instante: [] },
    ],
  };
}

test('„Toate foile”: fiecare program din arhivă e, octet cu octet, cel exportat doar din foaia lui; foile 1 și 3 o dată, cu -x2', async () => {
  const d = patruFoi();
  const p = { origine: 'stanga-jos', z0: 'sus' } as const;
  const r = await calculeazaExport(doarFoaia(d, 'f2'), { ...p, toateFoile: true }, undefined, d);
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  if (!r.ok) return;
  assert.equal(r.fisiere.length, 1);
  const zip = r.fisiere[0]!;
  assert.equal(zip.nume, 'cncvs2-stanga-jos-foile.zip');
  const citit = await citesteZip(zip.octeti, LIMITE);
  assert.ok(citit.ok);
  assert.deepEqual(citit.intrari.map((x) => x.nume), ['cncvs2-stanga-jos-foaia-1-x2.nc', 'cncvs2-stanga-jos-foaia-2.nc']);
  const singura = async (id: string): Promise<Uint8Array> => {
    const s = await calculeazaExport(doarFoaia(d, id), p);
    assert.ok(s.ok && s.fisiere.length === 1);
    return s.ok ? s.fisiere[0]!.octeti : new Uint8Array();
  };
  assert.ok(Buffer.from(citit.intrari[0]!.octeti).equals(Buffer.from(await singura('f1'))), 'foaia 1');
  // Foaia 3 (aceeași piesă, altă instanță) diferă doar în comentarii (`r2/r` în loc de `r/r`): taie la fel.
  const text = (x: Uint8Array): string => new TextDecoder().decode(x);
  assert.notEqual(text(await singura('f3')), text(citit.intrari[0]!.octeti));
  assert.equal(faraComentarii(text(await singura('f3'))), faraComentarii(text(citit.intrari[0]!.octeti)), 'foaia 3 taie la fel');
  assert.ok(Buffer.from(citit.intrari[1]!.octeti).equals(Buffer.from(await singura('f2'))), 'foaia 2');
  // Rezumatul: foile, cea identică, fișierele, foaia goală; timpul tuturor = 2 × foaia 1 + foaia 2.
  const foi = r.foi;
  assert.ok(foi);
  assert.deepEqual(foi.foi.map((f) => [f.nume, f.identice, f.fisiere]), [
    ['Foaia 1', ['Foaia 3'], ['cncvs2-stanga-jos-foaia-1-x2.nc']], ['Foaia 2', [], ['cncvs2-stanga-jos-foaia-2.nc']],
  ]);
  assert.deepEqual(foi.goale, ['Foaia 4']);
  const [s1, s2] = foi.foi.map((f) => f.secunde ?? Number.NaN);
  assert.ok(Math.abs((foi.secunde ?? 0) - (2 * s1! + s2!)) < 1e-9);
  // Panoul mașinii primește foaia activă (a doua), ca un export doar din ea; aceeași arhivă la al doilea export.
  assert.ok(r.masina && Buffer.from(r.masina[0]!.octeti).equals(Buffer.from(await singura('f2'))));
  const iar = await calculeazaExport(doarFoaia(d, 'f2'), { ...p, toateFoile: true }, undefined, d);
  assert.ok(iar.ok && Buffer.from(iar.fisiere[0]!.octeti).equals(Buffer.from(zip.octeti)), 'aceiași octeți');
});

test('„Toate foile” cu o foaie din care iese freza: refuz cu numele ei (se exportă singură, cu confirmarea ei)', async () => {
  const d = patruFoi();
  // Cercul foii 2 mutat la marginea foii: profilul exterior trece de latura stângă.
  const iese: Document = { ...d, foi: d.foi.map((f) => (f.id === 'f2' ? { ...f, instante: f.instante.map((i) => ({ ...i, x: 5 })) } : f)) };
  const r = await calculeazaExport(doarFoaia(iese, 'f1'), { origine: 'stanga-jos', z0: 'sus', toateFoile: true }, undefined, iese);
  assert.equal(r.ok, false);
  assert.equal(!r.ok && r.motiv, 'Foaia 2: freza iese din foaie; exportă foaia singură, cu confirmarea ei');
});
