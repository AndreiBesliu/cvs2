import { test } from 'node:test';
import assert from 'node:assert/strict';
import { codAuth } from '../../src/admin/cont/motive.ts';
import { fileVizibile, invitatieDin, numeRol, omDin, rolDin } from '../../src/admin/personal/date.ts';
import { PERMISIUNI, type Permisiune } from '../../shared/personal.ts';

/** Filele Personal și Cont (ADR 0049), partea pură: filele pe permisiuni, documentele citite ca rânduri. */

const ts = (iso: string) => ({ toDate: () => new Date(iso) });
const ID = 'AbCdEfGhIjKlMnOpQrSt';
const p = (...x: Permisiune[]): ReadonlySet<Permisiune> => new Set(x);

test('filele: owner-ul le vede pe toate; un rol, doar pe ale permisiunilor lui; Cont mereu; Personal doar owner-ul', () => {
  assert.deepEqual(fileVizibile(true, p()), ['erori', 'diagnoza', 'roadmap', 'documentatie', 'sugestii', 'personal', 'cont']);
  assert.deepEqual(fileVizibile(false, new Set(PERMISIUNI)), ['erori', 'diagnoza', 'roadmap', 'documentatie', 'sugestii', 'cont'], 'tot catalogul tot nu dă Personal');
  assert.deepEqual(fileVizibile(false, p('erori.citeste')), ['erori', 'cont']);
  assert.deepEqual(fileVizibile(false, p('erori.rezolva')), ['cont'], 'a rezolva fără a citi nu deschide fila');
  assert.deepEqual(fileVizibile(false, p('documentatie.citeste', 'diagnoza.citeste')), ['diagnoza', 'roadmap', 'documentatie', 'cont']);
  assert.deepEqual(fileVizibile(false, p('audit.citeste')), ['cont']);
  assert.deepEqual(fileVizibile(false, p()), ['cont']);
  // Sugestiile (ADR 0107): scrierea sau citirea tuturor deschide fila, fiecare singură.
  assert.deepEqual(fileVizibile(false, p('sugestii.scrie')), ['sugestii', 'cont']);
  assert.deepEqual(fileVizibile(false, p('sugestii.citeste')), ['sugestii', 'cont']);
});

test('omul: sursa lipsă = pus în consolă; ce lipsește e necunoscut (null), nu inventat', () => {
  assert.deepEqual(omDin('u1', { rol: 'owner' }), { uid: 'u1', email: null, rol: 'owner', sursa: 'consola', adaugatLa: null });
  const o = omDin('u2', { rol: ID, email: 'a@b.ro', sursa: 'cont-creat', adaugatLa: ts('2026-10-20T10:00:00Z') });
  assert.deepEqual([o.email, o.rol, o.sursa, o.adaugatLa?.toISOString()], ['a@b.ro', ID, 'cont-creat', '2026-10-20T10:00:00.000Z']);
  assert.equal(omDin('u3', { sursa: 'altundeva', rol: 7, adaugatLa: 'ieri' }).sursa, 'consola');
  assert.equal(omDin('u3', { rol: 7 }).rol, null);
  assert.equal(omDin('u3', { adaugatLa: 'ieri' }).adaugatLa, null);
});

test('rolul: permisiunile în ordinea catalogului, doar cele din catalog; fără nume, id-ul', () => {
  assert.deepEqual(rolDin(ID, { nume: 'Suport', permisiuni: ['documentatie.citeste', 'x', 3, 'erori.citeste'] }), {
    id: ID, nume: 'Suport', permisiuni: ['erori.citeste', 'documentatie.citeste'],
  });
  assert.deepEqual(rolDin(ID, { permisiuni: 'erori.citeste' }), { id: ID, nume: ID, permisiuni: [] });
});

test('invitația și numele rolului: owner, un rol cunoscut, sau null pentru unul necunoscut (șters, treaptă veche)', () => {
  const i = invitatieDin('h', { email: 'a@b.ro', rol: ID, expiraLa: ts('2026-10-27T10:00:00Z') });
  assert.deepEqual([i.email, i.rol, i.expiraLa?.toISOString()], ['a@b.ro', ID, '2026-10-27T10:00:00.000Z']);
  const roluri = [rolDin(ID, { nume: 'Suport', permisiuni: [] })];
  assert.equal(numeRol('owner', roluri), 'owner');
  assert.equal(numeRol(ID, roluri), 'Suport');
  assert.equal(numeRol('RAltul00000000000000', roluri), null);
  assert.equal(numeRol('admin', roluri), null);
  assert.equal(numeRol(null, roluri), null);
});

test('codul unui refuz Firebase: din `code`, altfel gol', () => {
  assert.equal(codAuth({ code: 'auth/credential-already-in-use' }), 'auth/credential-already-in-use');
  assert.equal(codAuth(new Error('x')), '');
  assert.equal(codAuth(null), '');
});
