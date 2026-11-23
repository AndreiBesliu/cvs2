import { test } from 'node:test';
import assert from 'node:assert/strict';
import { codAuth } from '../../src/admin/cont/motive.ts';
import { enAdmin } from '../../src/i18n/admin.en.ts';
import { roAdmin } from '../../src/i18n/admin.ro.ts';
import { etichetaPermisiune, fileVizibile, grupePermisiuni, invitatieDin, numeRol, omDin, rolDin } from '../../src/admin/personal/date.ts';
import { PERMISIUNI, type Permisiune } from '../../shared/personal.ts';

/** Filele Personal și Cont (ADR 0049), partea pură: filele pe permisiuni, documentele citite ca rânduri. */

const ts = (iso: string) => ({ toDate: () => new Date(iso) });
const ID = 'AbCdEfGhIjKlMnOpQrSt';
const p = (...x: Permisiune[]): ReadonlySet<Permisiune> => new Set(x);

test('filele: owner-ul le vede pe toate; un rol, doar pe ale permisiunilor lui; Cont mereu; Personal și Setări doar owner-ul', () => {
  assert.deepEqual(fileVizibile(true, p()), ['erori', 'diagnoza', 'roadmap', 'documentatie', 'sugestii', 'tichete', 'utilizatori', 'personal', 'setari', 'cont']);
  assert.deepEqual(fileVizibile(false, new Set(PERMISIUNI)), ['erori', 'diagnoza', 'roadmap', 'documentatie', 'sugestii', 'tichete', 'utilizatori', 'cont'], 'tot catalogul tot nu dă Personal și Setări');
  assert.deepEqual(fileVizibile(false, p('erori.citeste')), ['erori', 'cont']);
  assert.deepEqual(fileVizibile(false, p('erori.rezolva')), ['cont'], 'a rezolva fără a citi nu deschide fila');
  assert.deepEqual(fileVizibile(false, p('documentatie.citeste', 'diagnoza.citeste')), ['diagnoza', 'roadmap', 'documentatie', 'cont']);
  assert.deepEqual(fileVizibile(false, p('audit.citeste')), ['cont']);
  assert.deepEqual(fileVizibile(false, p()), ['cont']);
  // Sugestiile (ADR 0107): scrierea sau citirea tuturor deschide fila, fiecare singură.
  assert.deepEqual(fileVizibile(false, p('sugestii.scrie')), ['sugestii', 'cont']);
  assert.deepEqual(fileVizibile(false, p('sugestii.citeste')), ['sugestii', 'cont']);
  // Conturile clienților (ADR 0116 §19): citirea sau administrarea deschide fila Utilizatori; Setările rămân ale owner-ului.
  assert.deepEqual(fileVizibile(false, p('conturi.citeste')), ['utilizatori', 'cont']);
  assert.deepEqual(fileVizibile(false, p('conturi.administreaza')), ['utilizatori', 'cont']);
  // Raportările clienților (ADR 0116 §13): citirea sau răspunsul deschide fila Tichete, fiecare singură.
  assert.deepEqual(fileVizibile(false, p('tichete.citeste')), ['tichete', 'cont']);
  assert.deepEqual(fileVizibile(false, p('tichete.raspunde')), ['tichete', 'cont']);
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

/* ── Matricea rol × permisiune (ADR 0260 §6, felia A.5) ──────────────────────────────────────────────────────────── */

test('grupele matricei: catalogul, pe zone (ce stă înaintea punctului), în ordinea lui; fiecare permisiune o singură dată', () => {
  assert.deepEqual(grupePermisiuni(), [
    { zona: 'erori', permisiuni: ['erori.citeste', 'erori.rezolva'] },
    { zona: 'diagnoza', permisiuni: ['diagnoza.citeste'] },
    { zona: 'audit', permisiuni: ['audit.citeste'] },
    { zona: 'documentatie', permisiuni: ['documentatie.citeste'] },
    { zona: 'sugestii', permisiuni: ['sugestii.scrie', 'sugestii.citeste'] },
    { zona: 'conturi', permisiuni: ['conturi.citeste', 'conturi.administreaza'] },
    { zona: 'tichete', permisiuni: ['tichete.citeste', 'tichete.raspunde'] },
  ]);
  assert.deepEqual(grupePermisiuni().flatMap((g) => g.permisiuni), [...PERMISIUNI], 'ordinea catalogului, nimic pierdut');
  // O zonă care revine mai târziu în catalog intră în grupa ei, la locul primei apariții.
  assert.deepEqual(grupePermisiuni(['erori.citeste', 'audit.citeste', 'erori.rezolva']), [
    { zona: 'erori', permisiuni: ['erori.citeste', 'erori.rezolva'] }, { zona: 'audit', permisiuni: ['audit.citeste'] },
  ]);
});

test('eticheta unei permisiuni, despărțită pentru matrice: zona și fapta; fără „:”, doar zona', () => {
  assert.deepEqual(etichetaPermisiune('Erori: citește'), { zona: 'Erori', fapta: 'citește' });
  assert.deepEqual(etichetaPermisiune('Sugestii: citește toate'), { zona: 'Sugestii', fapta: 'citește toate' });
  assert.deepEqual(etichetaPermisiune('Diagnoză'), { zona: 'Diagnoză', fapta: '' });
  assert.deepEqual(etichetaPermisiune('A: b: c'), { zona: 'A', fapta: 'b: c' });
});

test('etichetele reale, în ambele limbi: permisiunile unei grupe au aceeași zonă, iar grupele de mai multe au fapte diferite', () => {
  for (const [limba, dict] of [['ro', roAdmin], ['en', enAdmin]] as const) {
    for (const g of grupePermisiuni()) {
      const e = g.permisiuni.map((p) => etichetaPermisiune(dict[`admin.perm.${p}`]));
      assert.equal(new Set(e.map((x) => x.zona)).size, 1, `${limba}, ${g.zona}: o singură zonă`);
      if (g.permisiuni.length > 1) {
        assert.equal(new Set(e.map((x) => x.fapta)).size, g.permisiuni.length, `${limba}, ${g.zona}: fapte diferite`);
        assert.ok(e.every((x) => x.fapta !== ''), `${limba}, ${g.zona}: fiecare cu fapta ei`);
      }
    }
  }
});
