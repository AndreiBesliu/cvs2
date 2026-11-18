import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BARA, cauta, ceaMaiRecenta, cheieIntamplare, fileBarei, filaAratata, filaTintei, grupuriBarei, insigna, intamplareDin, joburiDin,
  numarBara, partiAzi, problemeDiagnoza, punctDiagnoza, rezolvareDin, simplu, type FelGasit, type Gasibil, type ParteAzi,
} from '../../src/admin/carcasa/date.ts';
import { citesteAdresa, FILE } from '../../src/admin/adresa.ts';
import { fileVizibile } from '../../src/admin/personal/date.ts';
import type { Verificare } from '../../src/admin/diagnoza/verificari.ts';
import { PERMISIUNI, type Permisiune } from '../../shared/personal.ts';

/**
 * Carcasa paginii `/admin` (ADR 0260 §1, felia A.1), partea pură: bara laterală grupată, filele ei, părțile filei Azi pe
 * care le vede un rol, insigna instanței, punctul Diagnozei, întâmplările din audit, căutarea în ce s-a citit.
 */

const p = (...x: Permisiune[]): ReadonlySet<Permisiune> => new Set(x);
const ts = (iso: string) => ({ toDate: () => new Date(iso) });

/** Toate submulțimile catalogului (2^11), fiecare cu și fără owner. */
function* toateRolurile(): Generator<{ owner: boolean; perm: ReadonlySet<Permisiune> }> {
  for (let m = 0; m < 1 << PERMISIUNI.length; m++) {
    const perm = new Set(PERMISIUNI.filter((_, i) => (m >> i) & 1));
    yield { owner: false, perm };
    if (m === 0) yield { owner: true, perm };
  }
}

test('bara laterală: Azi sus, Probleme, Produs, Clienți, Echipa, Contul meu la capăt; aceleași zece file, plus Azi', () => {
  assert.deepEqual(BARA.map((g) => [g.grup, [...g.file]]), [
    [null, ['azi']],
    ['probleme', ['erori', 'tichete', 'diagnoza']],
    ['produs', ['sugestii', 'roadmap', 'documentatie']],
    ['clienti', ['utilizatori']],
    ['echipa', ['personal', 'setari']],
    [null, ['cont']],
  ]);
  // Fiecare filă a paginii stă o singură dată în bară.
  assert.deepEqual(BARA.flatMap((g) => g.file).toSorted(), [...FILE].toSorted());
});

test('grupurile barei: doar filele vizibile, iar un grup fără nicio filă vizibilă dispare', () => {
  assert.deepEqual(grupuriBarei(fileBarei(true, p())).map((g) => g.grup), [null, 'probleme', 'produs', 'clienti', 'echipa', null]);
  const partial = grupuriBarei(fileBarei(false, p('erori.citeste', 'documentatie.citeste')));
  assert.deepEqual(partial.map((g) => [g.grup, g.file]), [
    [null, ['azi']], ['probleme', ['erori']], ['produs', ['roadmap', 'documentatie']], [null, ['cont']],
  ]);
  assert.deepEqual(grupuriBarei(fileBarei(false, p())).map((g) => [g.grup, g.file]), [[null, ['cont']]]);
});

test('filele vizibile rămân cele date de rol: bara are exact fileVizibile, plus Azi doar când rolul are ce urmări', () => {
  for (const { owner, perm } of toateRolurile()) {
    const bara = fileBarei(owner, perm);
    const faraAzi = bara.filter((f) => f !== 'azi');
    assert.deepEqual(faraAzi, fileVizibile(owner, perm));
    assert.equal(bara.includes('azi'), partiAzi(owner, perm).size > 0);
    if (bara.includes('azi')) assert.equal(bara[0], 'azi', 'Azi e prima');
  }
  // fileVizibile nu știe de Azi (ADR 0260: „Filele vizibile rămân cele date de rol”).
  assert.ok(!fileVizibile(true, p()).includes('azi'));
});

test('fila Azi nu arată cifre din file pe care rolul nu le vede (toate rolurile posibile)', () => {
  const cere: Readonly<Record<ParteAzi, (owner: boolean, perm: ReadonlySet<Permisiune>, file: readonly string[]) => boolean>> = {
    erori: (_o, _p, f) => f.includes('erori'),
    tichete: (_o, _p, f) => f.includes('tichete'),
    // „Fără decizie” numără toate sugestiile: doar cine le poate citi pe toate (scrierea dă doar sugestiile proprii).
    sugestii: (o, x, f) => f.includes('sugestii') && (o || x.has('sugestii.citeste')),
    conturi: (_o, _p, f) => f.includes('utilizatori'),
    joburi: (_o, _p, f) => f.includes('diagnoza'),
    asteapta: (o) => o,
    intamplari: (o, x) => o || x.has('audit.citeste'),
  };
  for (const { owner, perm } of toateRolurile()) {
    const file = fileVizibile(owner, perm);
    for (const parte of partiAzi(owner, perm)) assert.ok(cere[parte](owner, perm, file), `${parte} cu ${[...perm].join(',')}`);
  }
  assert.deepEqual([...partiAzi(true, p())].toSorted(), ['asteapta', 'conturi', 'erori', 'intamplari', 'joburi', 'sugestii', 'tichete']);
  assert.deepEqual([...partiAzi(false, p('tichete.citeste'))], ['tichete']);
  assert.deepEqual([...partiAzi(false, p('sugestii.scrie'))], [], 'scrierea singură nu dă cifra sugestiilor');
  assert.deepEqual([...partiAzi(false, p('audit.citeste'))], ['intamplari']);
  assert.deepEqual([...partiAzi(false, p('documentatie.citeste', 'erori.rezolva'))], []);
  // Tot catalogul fără owner: fără „Ce așteaptă de la tine” (e al owner-ului).
  assert.ok(!partiAzi(false, new Set(PERMISIUNI)).has('asteapta'));
});

test('fila deschisă: fără `#`, Azi (când rolul o are); o filă pe care rolul n-o vede dă prima filă a barei', () => {
  assert.equal(citesteAdresa('#azi')?.fila, 'azi');
  assert.equal(filaAratata('azi', fileBarei(true, p())), 'azi');
  assert.equal(filaAratata('azi', fileBarei(false, p('documentatie.citeste'))), 'roadmap');
  assert.equal(filaAratata('personal', fileBarei(false, p('erori.citeste'))), 'azi');
  assert.equal(filaAratata('erori', fileBarei(false, p('erori.citeste'))), 'erori');
  assert.equal(filaAratata('erori', fileBarei(false, p())), 'cont');
});

test('insigna instanței: TEST și LIVE au felul lor, orice altceva (local) e neutru', () => {
  assert.equal(insigna('test'), 'test');
  assert.equal(insigna('live'), 'live');
  assert.equal(insigna('local'), 'alta');
  assert.equal(insigna(''), 'alta');
});

const v = (id: Verificare['id'], stare: Verificare['stare']): Verificare => ({ id, stare, titlu: 'admin.diag.rol', masura: { cheie: 'admin.diag.rol' } });

test('punctul Diagnozei: roșu la un Eșec, galben la o Atenție, nimic altfel (informațiile nu contează)', () => {
  assert.equal(punctDiagnoza(null), null);
  assert.equal(punctDiagnoza([v('instanta', 'bine'), v('build', 'info')]), null);
  assert.equal(punctDiagnoza([v('instanta', 'bine'), v('appcheck', 'atentie')]), 'atentie');
  assert.equal(punctDiagnoza([v('appcheck', 'atentie'), v('functii', 'esec'), v('rol', 'info')]), 'esec');
});

test('joburile de noapte și restul problemelor Diagnozei, din aceleași verificări', () => {
  const lista = [v('instanta', 'bine'), v('job:backupZilnic', 'bine'), v('appcheck', 'atentie'), v('job:verificaBackup', 'esec'), v('build', 'info'), v('functii', 'esec')];
  assert.deepEqual(joburiDin(lista).map((x) => x.id), ['job:backupZilnic', 'job:verificaBackup']);
  assert.deepEqual(problemeDiagnoza(lista).map((x) => x.id), ['appcheck', 'functii']);
});

test('numărul de lângă filă: doar o cifră citită și mai mare ca 0; una necitită nu se arată (niciodată ca 0)', () => {
  assert.equal(numarBara({ ok: true, valoare: 3 }), 3);
  assert.equal(numarBara({ ok: true, valoare: 0 }), null);
  assert.equal(numarBara({ ok: false, motiv: 'permission-denied' }), null);
  assert.equal(numarBara(undefined), null);
});

test('filele țintelor din audit: fiecare colecție scrisă de callable-uri duce la fila ei; altceva, nicăieri', () => {
  assert.equal(filaTintei(`errorLogs/${'1'.repeat(32)}`), 'erori');
  assert.equal(filaTintei('tichete/AbCdEfGhIjKlMnOpQrSt'), 'tichete');
  assert.equal(filaTintei('sugestii/AbCdEfGhIjKlMnOpQrSt'), 'sugestii');
  assert.equal(filaTintei('conturi/uid1'), 'utilizatori');
  assert.equal(filaTintei('staff/uid1'), 'personal');
  assert.equal(filaTintei('roluri/AbCdEfGhIjKlMnOpQrSt'), 'personal');
  assert.equal(filaTintei('invitatiiPersonal/AbCdEfGhIjKlMnOpQrSt'), 'personal');
  assert.equal(filaTintei('setari/conturi'), 'setari');
  assert.equal(filaTintei('meta/deployment'), null);
  assert.equal(filaTintei('constructor/x'), null, 'nu cheile obiectului');
  assert.equal(filaTintei('__proto__/x'), null);
  assert.equal(filaTintei(''), null);
});

test('o întâmplare din audit: când, ce, fila, cine (eu, un job, un client, personalul); ce lipsește e necunoscut', () => {
  const eu = 'uidEu';
  const a = intamplareDin('a1', { cand: ts('2026-11-17T08:47:00Z'), cine: 'uidAna', rol: null, actiune: 'tichete.raporteaza', tinta: 'tichete/AbCdEfGhIjKlMnOpQrSt', dupa: { fel: 'problema' } }, eu);
  assert.deepEqual({ ...a, cand: a.cand?.toISOString() }, { id: 'a1', cand: '2026-11-17T08:47:00.000Z', actiune: 'tichete.raporteaza', fila: 'tichete', cine: 'client', dupa: { fel: 'problema' } });
  assert.equal(intamplareDin('a2', { cine: eu, rol: 'owner', actiune: 'sugestii.decide', tinta: 'sugestii/x' }, eu).cine, 'eu');
  assert.equal(intamplareDin('a3', { cine: 'job:pastrareTichete', rol: null, actiune: 'tichete.sterge', tinta: 'tichete/x' }, eu).cine, 'job');
  assert.equal(intamplareDin('a4', { cine: 'altcineva', rol: 'RSuport0000000000000', actiune: 'erori.marcheaza', tinta: 'errorLogs/x' }, eu).cine, 'personal');
  const gol = intamplareDin('a5', {}, eu);
  assert.deepEqual({ ...gol }, { id: 'a5', cand: null, actiune: '', fila: null, cine: 'client', dupa: null });
});

test('textul întâmplării: acțiunile cunoscute au cheia lor, cu valoarea de după; una necunoscută se spune cu numele ei', () => {
  const i = (actiune: string, dupa: unknown) => intamplareDin('x', { actiune, dupa, tinta: '' }, 'eu');
  assert.deepEqual(cheieIntamplare(i('erori.marcheaza', { rezolvat: true })), { cheie: 'admin.azi.ev.eroare-rezolvata' });
  assert.deepEqual(cheieIntamplare(i('erori.marcheaza', { rezolvat: false })), { cheie: 'admin.azi.ev.eroare-redeschisa' });
  assert.deepEqual(cheieIntamplare(i('tichete.raporteaza', null)), { cheie: 'admin.azi.ev.tichet-nou' });
  assert.deepEqual(cheieIntamplare(i('tichete.stare', { stare: 'rezolvat' })), { cheie: 'admin.azi.ev.tichet-stare', stare: 'rezolvat' });
  assert.deepEqual(cheieIntamplare(i('tichete.stare', { stare: 'altceva' })), { cheie: 'admin.azi.ev.tichet-stare', stare: null });
  assert.deepEqual(cheieIntamplare(i('sugestii.scrie', { titlu: 'Ordinea foilor' })), { cheie: 'admin.azi.ev.sugestie-noua', titlu: 'Ordinea foilor' });
  assert.deepEqual(cheieIntamplare(i('sugestii.decide', { stare: 'acceptata' })), { cheie: 'admin.azi.ev.sugestie-decisa', stare: 'acceptata' });
  assert.deepEqual(cheieIntamplare(i('conturi.creeaza', { email: 'a@b.ro' })), { cheie: 'admin.azi.ev.cont-nou' });
  assert.deepEqual(cheieIntamplare(i('conturi.proba', {})), { cheie: 'admin.azi.ev.cont-plan' });
  assert.deepEqual(cheieIntamplare(i('personal.invita', {})), { cheie: 'admin.azi.ev.personal' });
  assert.deepEqual(cheieIntamplare(i('setari.conturi', {})), { cheie: 'admin.azi.ev.setari' });
  assert.deepEqual(cheieIntamplare(i('ceva.nou', {})), { cheie: 'admin.azi.ev.alta' });
});

test('căutarea: fără diacritice și majuscule, în textul, detaliul și id-ul a ce s-a citit; cel mult 5 pe fel; sub 2 litere, nimic', () => {
  assert.equal(simplu('Ștergerea ȚEAVĂ'), 'stergerea teava');
  const erori: Gasibil[] = [
    { id: 'a'.repeat(32), text: 'TypeError: c.puncte is undefined', detaliu: 'randare', rezolvat: false },
    { id: 'b'.repeat(32), text: 'piesa 12 lipsă', detaliu: 'randare', rezolvat: true },
  ];
  const tichete: Gasibil[] = Array.from({ length: 7 }, (_, k) => ({ id: `T${k}`.padEnd(20, 'x'), text: `Exportul se oprește la ${k}0 %`, detaliu: `ana${k}@exemplu.ro` }));
  const surse = new Map<FelGasit, readonly Gasibil[]>([['erori', erori], ['tichete', tichete]]);
  assert.deepEqual(cauta('p', surse), []);
  assert.deepEqual(cauta('  ', surse), []);
  assert.deepEqual(cauta('LIPSA', surse).map((g) => [g.fel, g.randuri.map((r) => r.id)]), [['erori', ['b'.repeat(32)]]]);
  assert.deepEqual(cauta('aaaaaa', surse).map((g) => g.randuri.length), [1], 'și după amprentă');
  const t = cauta('opreste', surse);
  assert.deepEqual(t.map((g) => [g.fel, g.randuri.length]), [['tichete', 5]]);
  assert.deepEqual(cauta('ana3@', surse).map((g) => g.randuri.map((r) => r.id)), [[`T3`.padEnd(20, 'x')]]);
  assert.deepEqual(cauta('randare', surse).map((g) => g.randuri.length), [2]);
  // Un fel necitit nu dă rânduri (nu e o listă goală citită).
  assert.deepEqual(cauta('ana', new Map()), []);
});

test('ultima rezolvare: cea mai recentă dată cunoscută; un grup de erori dă data marcării doar dacă e rezolvat', () => {
  assert.equal(ceaMaiRecenta([]), null);
  assert.equal(ceaMaiRecenta([null, null]), null);
  assert.equal(ceaMaiRecenta([new Date('2026-11-10'), null, new Date('2026-11-16'), new Date('2026-11-12')])?.toISOString(), '2026-11-16T00:00:00.000Z');
  assert.equal(rezolvareDin({ rezolvat: true, marcatLa: ts('2026-11-16T18:40:00Z') })?.toISOString(), '2026-11-16T18:40:00.000Z');
  assert.equal(rezolvareDin({ rezolvat: false, marcatLa: ts('2026-11-16T18:40:00Z') }), null, 'redeschis');
  assert.equal(rezolvareDin({ rezolvat: true }), null, 'fără dată, necunoscută');
  assert.equal(rezolvareDin({ rezolvat: true, marcatLa: '2026-11-16' }), null);
});
