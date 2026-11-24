/**
 * Descoperirea extensiilor (ADR 0232 §C, felia 3.Xi-3), părțile pure:
 * - data unui rând de „ce e nou” (la alegere), în catalog, și rândurile dintre versiunea omului și cea nouă;
 * - vestea despre o versiune nouă, ținută în browser din ce s-a aflat la ultima deschidere a meniului (fără nicio cerere);
 * - numele dintr-un `.zip`, citite doar din directorul lui (după ele se recunoaște o extensie lăsată pe planșă).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { citesteCatalog, esteData, FORMAT_CATALOG, numePachet, SCHEMA_CATALOG } from '../../shared/biblioteca.ts';
import { noutatiDupa } from '../../src/extensii/biblioteca.ts';
import { CHEIE_EXTENSII_NOI, cateNoi, citesteNoi, noiDupaCatalog, pastreazaNoi, scrieNoi } from '../../src/extensii/noi.ts';
import { numeZip } from '../../src/extensii/zip.ts';
import { impacheteaza, scrieZip } from '../../scripts/impacheteaza-extensie.ts';

const SHA = 'a'.repeat(64);
const rand = (extra: Record<string, unknown> = {}): Record<string, unknown> => {
  const r = { id: 'salut', nume: 'Salut', versiune: '1.2.0', api: 1, permisiuni: ['stocare'], descriere: { ro: 'Proba.', en: 'The test.' }, octeti: 4000, sha256: SHA, ...extra };
  return { ...r, pachet: numePachet(r.id, r.versiune, SHA) };
};
const catalog = (extensii: unknown[]): unknown => ({ format: FORMAT_CATALOG, schema: SCHEMA_CATALOG, extensii });

test('o dată e an-lună-zi, o zi care există', () => {
  for (const buna of ['2026-11-23', '2024-02-29', '2000-01-01']) assert.equal(esteData(buna), true, buna);
  for (const rea of ['23.11.2026', '2026-13-01', '2026-02-30', '2025-02-29', '2026-1-5', '2026-11-23T10:00:00Z', '', ' 2026-11-23', 20261123, null, undefined]) {
    assert.equal(esteData(rea), false, String(rea));
  }
});

test('catalogul: data unui rând de „ce e nou” se păstrează; una greșită cade, cu numele ei, iar rândul rămâne', () => {
  const noutati = [
    { versiune: '1.2.0', ro: 'A doua.', en: 'The second.', data: '2026-11-23' },
    { versiune: '1.1.0', ro: 'Prima.', en: 'The first.' },
  ];
  const c = citesteCatalog(catalog([rand({ noutati })]));
  assert.ok(c.ok, c.ok ? '' : c.detaliu);
  assert.deepEqual(c.catalog.extensii[0]?.noutati, noutati);
  assert.deepEqual(c.sarite, []);

  const g = citesteCatalog(catalog([rand({ noutati: [{ ...noutati[0], data: '23.11.2026' }, noutati[1]] })]));
  assert.ok(g.ok);
  assert.deepEqual(g.catalog.extensii[0]?.noutati, [{ versiune: '1.2.0', ro: 'A doua.', en: 'The second.' }, noutati[1]]);
  assert.deepEqual(g.sarite, ['salut: noutati.data']);
});

test('„ce e nou” la o actualizare: doar rândurile de după versiunea omului; fără versiune, toate', () => {
  const n = [
    { versiune: '1.2.0', ro: 'c', en: 'c' }, { versiune: '1.1.0', ro: 'b', en: 'b' }, { versiune: '1.0.0', ro: 'a', en: 'a' },
  ];
  assert.deepEqual(noutatiDupa(n, '1.0.0').map((x) => x.versiune), ['1.2.0', '1.1.0']);
  assert.deepEqual(noutatiDupa(n, '1.1.0').map((x) => x.versiune), ['1.2.0']);
  assert.deepEqual(noutatiDupa(n, '1.2.0'), []);
  assert.deepEqual(noutatiDupa(n, '0.9'), n);
  assert.deepEqual(noutatiDupa(n, null), n);
  assert.deepEqual(noutatiDupa(undefined, '1.0.0'), []);
  // O versiune instalată care nu se poate compara nu arată nimic drept „nou față de ea”.
  assert.deepEqual(noutatiDupa(n, 'ieri'), []);
});

function stocare(): { date: Map<string, string>; getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void } {
  const date = new Map<string, string>();
  return { date, getItem: (k) => date.get(k) ?? null, setItem: (k, v) => { date.set(k, v); }, removeItem: (k) => { date.delete(k); } };
}
const ARUNCA = {
  getItem(): string | null { throw new Error('stocarea e blocată'); },
  setItem(): void { throw new Error('stocarea e blocată'); },
  removeItem(): void { throw new Error('stocarea e blocată'); },
};
const manifest = (id: string, versiune: string, permisiuni: string[] = ['stocare']) => ({ id, manifest: { id, nume: id, versiune, api: 1, permisiuni } });
const R = (id: string, versiune: string, extra: Record<string, unknown> = {}) => ({ ...rand({ id, versiune, ...extra }) }) as never;

test('vestea: din catalog, doar extensiile instalate care au o versiune mai nouă în bibliotecă', () => {
  const instalate = [manifest('salut', '1.0.0'), manifest('trenulet', '18.21.0'), manifest('proba', '2.0.0')];
  const randuri = [R('salut', '1.2.0'), R('trenulet', '18.21.0'), R('proba', '1.9.0'), R('alta', '3.0.0')];
  assert.deepEqual(noiDupaCatalog(randuri, instalate as never), { salut: '1.2.0' });
  assert.deepEqual(noiDupaCatalog([], instalate as never), {});
  // Un rând pe care fila de acum nu-l poate instala (o permisiune necunoscută) nu e o veste.
  assert.deepEqual(noiDupaCatalog([R('salut', '1.2.0', { permisiuni: ['stocare', 'viitoare'] })], instalate as never), {});
});

test('vestea se ține sub cheia ei, se citește cu îngăduință și se șterge când nu mai e nimic de spus', () => {
  const s = stocare();
  assert.equal(CHEIE_EXTENSII_NOI, 'cncvs2.extensii-noi');
  assert.deepEqual(citesteNoi(s), {});
  scrieNoi({ salut: '1.2.0' }, s);
  assert.deepEqual(JSON.parse(s.date.get('cncvs2.extensii-noi') ?? ''), { v: 1, noi: { salut: '1.2.0' } });
  assert.deepEqual(citesteNoi(s), { salut: '1.2.0' });
  scrieNoi({}, s);
  assert.equal(s.date.has('cncvs2.extensii-noi'), false);

  for (const ciudat of ['', 'nu e json', '[]', '{"v":2,"noi":{"salut":"1.2.0"}}', '{"v":1}', '{"v":1,"noi":[]}', 'null']) {
    s.date.set('cncvs2.extensii-noi', ciudat);
    assert.deepEqual(citesteNoi(s), {}, ciudat);
  }
  s.date.set('cncvs2.extensii-noi', JSON.stringify({ v: 1, noi: { salut: '1.2.0', 'Un Id Rău': '1.0.0', proba: 'ieri', alta: 7, '__proto__': '1.0.0' } }));
  assert.deepEqual(citesteNoi(s), { salut: '1.2.0' });
  // O stocare care aruncă: nicio veste, nicio eroare.
  assert.deepEqual(citesteNoi(ARUNCA), {});
  assert.doesNotThrow(() => { scrieNoi({ salut: '1.2.0' }, ARUNCA); });
});

test('vestea ține până la actualizare sau la scoatere: se numără doar ce e încă mai nou decât ce e instalat', () => {
  const noi = { salut: '1.2.0', trenulet: '18.22.0' };
  const tot = [manifest('salut', '1.0.0'), manifest('trenulet', '18.21.0')];
  assert.equal(cateNoi(noi, tot as never), 2);
  assert.deepEqual(pastreazaNoi(noi, tot as never), noi);
  // Salut actualizată, Easy 3Draw scoasă.
  const dupa = [manifest('salut', '1.2.0')];
  assert.equal(cateNoi(noi, dupa as never), 0);
  assert.deepEqual(pastreazaNoi(noi, dupa as never), {});
  // O versiune instalată din fișier, mai nouă decât vestea: nu mai e o veste.
  assert.equal(cateNoi({ salut: '1.2.0' }, [manifest('salut', '1.3.0')] as never), 0);
  assert.equal(cateNoi({}, tot as never), 0);
});

test('numele dintr-un .zip, din directorul lui, fără dezarhivare; ce nu e arhivă dă null', () => {
  const pachet = impacheteaza('extensii/salut').octeti;
  const nume = numeZip(pachet);
  assert.ok(nume);
  assert.ok(nume.includes('extensie.json'), nume.join(', '));
  const altul = scrieZip([{ nume: 'desene/a.svg', octeti: new TextEncoder().encode('<svg/>') }, { nume: 'citeste.txt', octeti: new Uint8Array(3) }]);
  assert.deepEqual(numeZip(altul), ['desene/a.svg', 'citeste.txt']);
  // Manifestul într-un dosar nu e în rădăcină: apelantul compară numele întreg.
  const inDosar = scrieZip([{ nume: 'salut/extensie.json', octeti: new Uint8Array(2) }]);
  assert.deepEqual(numeZip(inDosar), ['salut/extensie.json']);
  assert.equal(numeZip(new TextEncoder().encode('nu e o arhivă')), null);
  assert.equal(numeZip(new Uint8Array(0)), null);
  // Un director tăiat (arhiva ruptă la mijloc) nu aruncă.
  assert.doesNotThrow(() => numeZip(pachet.subarray(0, pachet.length - 30)));
  assert.doesNotThrow(() => numeZip(pachet.subarray(pachet.length - 40)));
});

test('paleta și gazda extensiilor vorbesc prin același eveniment (numele stă în amândouă, ca bucățile lor să nu se lege)', async () => {
  const { readFileSync } = await import('node:fs');
  const paleta = readFileSync(new URL('../../src/ui/Paleta.tsx', import.meta.url), 'utf8');
  const gazda = readFileSync(new URL('../../src/extensii/descoperire.ts', import.meta.url), 'utf8');
  const dinPaleta = /const EVENIMENT_EXTENSII = '([^']+)';/.exec(paleta)?.[1];
  const dinGazda = /export const EVENIMENT_PALETA = '([^']+)';/.exec(gazda)?.[1];
  assert.equal(dinPaleta, 'cncvs2-extensii');
  assert.equal(dinGazda, dinPaleta);
  // Gazda ia din paletă doar tipul cererii: un import adevărat ar lega bucata gazdei de a paletei.
  assert.match(gazda, /import type \{ CerereExtensiiPaleta \} from '\.\.\/ui\/Paleta\.tsx';/);
  assert.doesNotMatch(paleta, /from '\.\.\/extensii\//);
});
