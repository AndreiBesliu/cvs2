import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  adaugaInSchita, adaugaZile, estimeaza, hash32, inceputulZilei, P_ACTIUNE, P_OAMENI, schitaDin, schitaNoua, SumatorZi, textSchita,
  treaptaSesiune, uneste, ziuaLocala, type LotZi,
} from '../../shared/utilizareZi.ts';

/**
 * Sumele zilei ale utilizării (ADR 0262 §5, felia A.9a), pe hârtie: schița oamenilor (aproape exactă pe numerele mici, unirea
 * fără dubluri, textul ei), zilele în fusul României (miezul nopții, schimbarea orei), sumatorul pe loturi scrise de mână.
 */

const uiduri = (n: number, prefix = 'u'): string[] => Array.from({ length: n }, (_, i) => `${prefix}${i}-${(i * 7919) % 104_729}`);
const schitaCu = (p: number, lista: readonly string[]) => {
  const s = schitaNoua(p);
  for (const u of lista) adaugaInSchita(s, p, hash32(u));
  return s;
};

test('schița oamenilor: pe numerele mici, aproape exactă; unirea nu numără de două ori; textul se citește înapoi', () => {
  assert.equal(hash32('abc'), hash32('abc'));
  assert.notEqual(hash32('abc'), hash32('abd'));
  assert.equal(estimeaza(schitaNoua(P_OAMENI)), 0);
  for (const n of [1, 5, 50, 200]) {
    const e = estimeaza(schitaCu(P_OAMENI, uiduri(n)));
    assert.ok(Math.abs(e - n) <= Math.max(1, n * 0.03), `${n} oameni: ${e}`);
  }
  // Aceiași oameni de mai multe ori: tot atâția.
  assert.ok(Math.abs(estimeaza(schitaCu(P_OAMENI, [...uiduri(30), ...uiduri(30), ...uiduri(30)])) - 30) <= 1);
  // Ieri 40 de oameni, azi 40, dintre care 20 aceiași: în perioadă, 60.
  const ieri = schitaCu(P_OAMENI, uiduri(40));
  const azi = schitaCu(P_OAMENI, [...uiduri(20), ...uiduri(20, 'v')]);
  assert.ok(Math.abs(estimeaza(uneste(ieri, azi)) - 60) <= 2);
  // Schița mică a unei acțiuni: tot aproape exactă pe câțiva oameni.
  assert.ok(Math.abs(estimeaza(schitaCu(P_ACTIUNE, uiduri(8))) - 8) <= 1);
  const t = textSchita(azi);
  assert.equal(t.length, 1 << P_OAMENI);
  assert.deepEqual(schitaDin(t, P_OAMENI), azi);
  assert.equal(schitaDin(t, P_ACTIUNE), null, 'altă mărime');
  assert.equal(schitaDin(`${t.slice(0, -1)}#`, P_OAMENI), null, 'o cifră străină');
  assert.equal(schitaDin(`${t.slice(0, -1)}z`, P_OAMENI), null, 'un rang peste cel posibil');
  assert.equal(schitaDin(42, P_OAMENI), null);
});

test('zilele, în fusul României: miezul nopții iarna și vara; zilele cu schimbarea orei au 23 și 25 de ore', () => {
  assert.equal(ziuaLocala(Date.parse('2026-11-23T21:59:59Z')), '2026-11-23');
  assert.equal(ziuaLocala(Date.parse('2026-11-23T22:00:00Z')), '2026-11-24');
  assert.equal(ziuaLocala(Date.parse('2026-07-01T20:59:59Z')), '2026-07-01');
  assert.equal(ziuaLocala(Date.parse('2026-07-01T21:00:00Z')), '2026-07-02');
  assert.equal(inceputulZilei('2026-11-24'), Date.parse('2026-11-23T22:00:00Z'));
  assert.equal(inceputulZilei('2026-07-02'), Date.parse('2026-07-01T21:00:00Z'));
  const ore = (zi: string): number => (inceputulZilei(adaugaZile(zi, 1)) - inceputulZilei(zi)) / 3_600_000;
  assert.equal(ore('2026-03-29'), 23);
  assert.equal(ore('2026-10-25'), 25);
  assert.equal(ore('2026-11-23'), 24);
  assert.equal(adaugaZile('2026-12-31', 1), '2027-01-01');
  assert.equal(adaugaZile('2026-03-01', -1), '2026-02-28');
  assert.equal(adaugaZile('2028-03-01', -1), '2028-02-29');
});

test('durata unei sesiuni, în trepte de minute; peste 8 ore, ultima', () => {
  assert.deepEqual([0, 59_999, 60_000, 299_999, 3_600_000, 9 * 3_600_000, 30 * 3_600_000].map(treaptaSesiune), [1, 1, 5, 5, 120, 1_440, 1_440]);
});

const ev = (x: Record<string, unknown>) => x;

test('sumatorul: pe loturi scrise de mână, segmentele, acțiunile cu repetările, sursele și motivele, restul felurilor, sesiunile', () => {
  const s = new SumatorZi('2026-11-23');
  const loturi: LotZi[] = [
    {
      uid: 'ana', sesiune: 'aaaaaaaaaaaaaaaa', personal: false, aruncate: 1, evenimente: [
        ev({ fel: 'actiune', t: 1_000, id: 'document.roteste', de: 'bara', rez: 'ok', n: 3 }),
        ev({ fel: 'actiune', t: 2_000, id: 'document.roteste', de: 'tasta', rez: 'motiv.nimic-ales' }),
        ev({ fel: 'unealta', t: 3_000, id: 'dreptunghi', de: 'tasta' }),
        ev({ fel: 'fereastra', t: 4_000, id: 'masina' }),
        ev({ fel: 'dialog', t: 5_000, id: 'eticheta.export-titlu', rez: 'deschis' }),
        ev({ fel: 'dialog', t: 6_000, id: 'eticheta.export-titlu', rez: 'renuntat' }),
        ev({ fel: 'clic', t: 7_000, id: 'buton.exporta', de: 'panou', n: 2 }),
        ev({ fel: 'zoom', t: 8_000, de: 'panza', n: 4 }),
        ev({ fel: 'calcul', t: 9_000, id: 'export', ms: 3_000, rez: 'ok', forme: 100 }),
        ev({ fel: 'masina', t: 10_000, id: 'alarma', cod: 9 }),
        ev({ fel: 'imprimanta', t: 11_000, id: 'eroare', cod: 2_029 }),
        ev({ fel: 'actiune', t: 12_000, id: 'document.roteste', de: 'bara', rez: 'ok', text: 'un câmp străin' }),
      ],
    },
    {
      uid: 'ana', sesiune: 'aaaaaaaaaaaaaaaa', personal: false, aruncate: 0, evenimente: [
        ev({ fel: 'actiune', t: 600_000, id: 'document.roteste', de: 'bara', rez: 'ok' }),
        ev({ fel: 'calcul', t: 601_000, id: 'export', ms: 300, rez: 'anulat', forme: 100 }),
      ],
    },
    {
      uid: 'ion', sesiune: 'bbbbbbbbbbbbbbbb', personal: false, aruncate: 0, evenimente: [
        ev({ fel: 'actiune', t: 50, id: 'document.roteste', de: 'paleta', rez: 'ok' }),
        ev({ fel: 'derulare', t: 60, de: 'panou', n: 1 }),
      ],
    },
    { uid: 'owner', sesiune: 'cccccccccccccccc', personal: true, aruncate: 0, evenimente: [ev({ fel: 'fereastra', t: 1, id: 'imprimanta' })] },
  ];
  for (const l of loturi) s.adauga(l);
  const r = s.rezultat();
  assert.equal(r.zi, '2026-11-23');
  assert.equal(r.schema, 1);
  const c = r.segmente.clienti;
  assert.deepEqual([c.loturi, c.evenimente, c.aruncate, c.sesiuni], [3, 15, 2, 2]);
  // Ana: de la 1 s la 601 s (10 minute: treapta de 15); Ion: sub un minut.
  assert.deepEqual(c.durataSesiune, { 15: 1, 1: 1 });
  const { oameni: oameniRoteste, ...roteste } = c.actiuni['document.roteste'] ?? { oameni: '' };
  assert.deepEqual(roteste, { n: 6, ok: 5, de: { bara: 4, tasta: 1, paleta: 1 }, motive: { 'motiv.nimic-ales': 1 } });
  assert.equal(Math.round(estimeaza(schitaDin(oameniRoteste, P_ACTIUNE) ?? schitaNoua(P_ACTIUNE))), 2);
  assert.equal(Math.round(estimeaza(schitaDin(c.oameni, P_OAMENI) ?? schitaNoua(P_OAMENI))), 2);
  assert.deepEqual({ ...c.unelte['dreptunghi'], oameni: undefined }, { n: 1, de: { tasta: 1 }, oameni: undefined });
  assert.deepEqual(c.ferestre, { masina: 1 });
  assert.deepEqual(c.dialoguri, { 'eticheta.export-titlu': { deschis: 1, gata: 0, renuntat: 1 } });
  assert.deepEqual([c.clicuri, c.zoom, c.derulare], [{ 'buton.exporta': 2 }, { panza: 4 }, { panou: 1 }]);
  assert.deepEqual(c.calcule, { export: { ok: 1, eroare: 0, anulat: 1, ms: { 3000: 1, 300: 1 } } });
  assert.deepEqual([c.masina, c.coduriMasina, c.imprimanta, c.coduriImprimanta], [{ alarma: 1 }, { 'alarma:9': 1 }, { eroare: 1 }, { 'eroare:2029': 1 }]);
  const p = r.segmente.personal;
  assert.deepEqual([p.loturi, p.evenimente, p.sesiuni, p.ferestre, p.actiuni], [1, 1, 1, { imprimanta: 1 }, {}]);
  // Nimic din conturi: niciun uid în sume.
  const text = JSON.stringify(r);
  for (const u of ['ana', 'ion', 'owner']) assert.ok(!text.includes(`"${u}"`), u);
});
