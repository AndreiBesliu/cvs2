/**
 * Podul ESP3D (ADR 0119): scriptul workflow-ului `pod-esp3d`, pe hârtie. Configurarea, pe o sursă de probă: faptele de
 * care depinde profilul aplicației, schimbările din `configuration.h` (fiecare exact o dată, altfel nimic scris) și
 * unitatea de probă; o sursă 3.1 (alt subprotocol, binarul ca transfer de fișiere) e refuzată. Imaginile ESP: suma de
 * control și amprenta. Imaginea unică: fiecare bucată la adresa ei, bootloader-ul cu antetul rescris de `merge_bin`,
 * partițiile.
 *
 * Ancora pe sursa și pe imaginile reale e rularea workflow-ului: faptele se caută în ESP3D 3.0.2, iar esptool validează
 * singur aceleași imagini pe care le validează `citesteImagineEsp`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  bucatileImaginii, CALE_PROBA, citesteImagineEsp, citestePartitiile, configureaza, EroarePod, FAPTE, PROBA, SCHIMBARI,
  verificaImaginea, type Bucata, type Partitie,
} from '../../scripts/pod-esp3d.ts';

const CONFIG = 'esp3d/configuration.h';

/** O sursă ESP3D de probă, într-un dosar temporar: fiecare fișier cu faptele și textele lui de schimbat, între rânduri. */
function cuSursa(fn: (dosar: string) => void, schimba: (fisier: string, text: string) => string = (_f, t) => t): void {
  const dosar = mkdtempSync(join(tmpdir(), 'cncvs2-pod-'));
  try {
    const randuri = new Map<string, string[]>();
    const texte = [...FAPTE.map((f) => [f.fisier, f.text] as const), ...SCHIMBARI.map((s) => [s.fisier, s.vechi] as const)];
    for (const [fisier, text] of texte) randuri.set(fisier, [...(randuri.get(fisier) ?? ['// început']), text, '// altceva']);
    for (const [fisier, r] of randuri) {
      mkdirSync(dirname(join(dosar, fisier)), { recursive: true });
      writeFileSync(join(dosar, fisier), schimba(fisier, `${r.join('\n')}\n`));
    }
    fn(dosar);
  } finally {
    rmSync(dosar, { recursive: true, force: true });
  }
}

const eroare = (re: RegExp) => (e: unknown): boolean => e instanceof EroarePod && re.test(e.message);

test('configurarea: faptele trec; configuration.h primește Serial2 pe 16 / 17, ținta GRBL, socket-ul de date; proba e scrisă', () => {
  cuSursa((dosar) => {
    const raport = configureaza(dosar);
    assert.equal(raport.filter((l) => l.startsWith('fapt: ')).length, FAPTE.length);
    assert.equal(raport.filter((l) => l.startsWith('schimbat: ')).length, SCHIMBARI.length);
    const config = readFileSync(join(dosar, CONFIG), 'utf8');
    for (const r of ['#define ESP_SERIAL_OUTPUT USE_SERIAL_2', '#define ESP_RX_PIN 16', '#define ESP_TX_PIN 17', '#define DEFAULT_FW GRBL', '#define WS_DATA_FEATURE']) {
      assert.ok(config.split('\n').includes(r), r);
    }
    assert.doesNotMatch(config, /USE_SERIAL_0|UNKNOWN_FW|\/\/ #define WS_DATA_FEATURE/);
    assert.equal(readFileSync(join(dosar, CALE_PROBA), 'utf8'), PROBA);
  });
});

test('unitatea de probă cere, la compilare, configurarea podului și ESP3D 3.0.2, fără rețeaua atelierului în imagine', () => {
  for (const conditie of [
    '#if ESP_SERIAL_OUTPUT != USE_SERIAL_2 || ESP_RX_PIN != 16 || ESP_TX_PIN != 17',
    '#if COMMUNICATION_PROTOCOL != RAW_SERIAL',
    '#if DEFAULT_FW != GRBL',
    '#if !defined(WIFI_FEATURE) || !defined(WS_DATA_FEATURE)',
    '#if defined(STATION_WIFI_SSID) || defined(STATION_WIFI_PASSWORD)',
    'static_assert(egale(POD_SIR(DEFAULT_FW), POD_SIR(GRBL)),',
    'static_assert(egale(FW_VERSION, "3.0.2"),',
  ]) {
    assert.ok(PROBA.includes(conditie), conditie);
  }
  // Fiecare condiție de preprocesor are #error-ul ei.
  assert.equal(PROBA.split('\n#if ').length - 1, PROBA.split('\n#error "podul: ').length - 1);
});

test('o sursă ESP3D 3.1 e refuzată: alt subprotocol, binarul ca transfer de fișiere; nimic scris', () => {
  const ws = (inlocuire: readonly [string, string]) => (fisier: string, text: string): string =>
    fisier.endsWith('websocket_server.cpp') ? text.replace(inlocuire[0], inlocuire[1]) : text;
  for (const [inlocuire, motiv] of [
    [['"arduino"', '"esp3d-v1"'], /esp3d-v1/],
    [['websocket_data_server.push2RXbuffer(payload, length);', 'websocket_data_server.handleV1Binary(num, payload, length);'], /transfer de fișiere/],
  ] as const) {
    cuSursa((dosar) => {
      const inainte = readFileSync(join(dosar, CONFIG), 'utf8');
      assert.throws(() => configureaza(dosar), eroare(motiv));
      assert.equal(readFileSync(join(dosar, CONFIG), 'utf8'), inainte);
      assert.ok(!existsSync(join(dosar, CALE_PROBA)));
    }, ws(inlocuire));
  }
});

test('o schimbare care nu apare exact o dată oprește tot, înainte de orice scriere', () => {
  for (const [schimba, motiv] of [
    [(t: string) => t.replace('#define DEFAULT_FW UNKNOWN_FW', '#define DEFAULT_FW UNKNOWN_FW\n#define DEFAULT_FW UNKNOWN_FW'), /apare de 2 ori/],
    [(t: string) => t.replace('// #define WS_DATA_FEATURE', '#define WS_DATA_FEATURE'), /apare de 0 ori/],
  ] as const) {
    cuSursa((dosar) => {
      const inainte = readFileSync(join(dosar, CONFIG), 'utf8');
      assert.throws(() => configureaza(dosar), eroare(motiv));
      assert.equal(readFileSync(join(dosar, CONFIG), 'utf8'), inainte);
      assert.ok(!existsSync(join(dosar, CALE_PROBA)));
    }, (fisier, text) => (fisier === CONFIG ? schimba(text) : text));
  }
});

test('configurarea nu se aplică de două ori pe aceeași sursă', () => {
  cuSursa((dosar) => {
    configureaza(dosar);
    assert.throws(() => configureaza(dosar), eroare(/există deja/));
  });
});

/** O imagine ESP32 ca în esptool: antetul de 24 de octeți, segmentele, suma de control la capăt de bloc de 16, amprenta. */
function imagineEsp(segmente: readonly Buffer[], flash: readonly [number, number] = [2, 0x20], amprenta = true): Buffer {
  const antet = Buffer.alloc(24);
  antet[0] = 0xe9;
  antet[1] = segmente.length;
  antet[2] = flash[0];
  antet[3] = flash[1];
  antet.writeUInt32LE(0x400805e4, 4);
  antet[23] = amprenta ? 1 : 0;
  const parti: Buffer[] = [antet];
  let suma = 0xef;
  for (const s of segmente) {
    const cap = Buffer.alloc(8);
    cap.writeUInt32LE(0x3ffb0000, 0);
    cap.writeUInt32LE(s.length, 4);
    parti.push(cap, s);
    for (const x of s) suma ^= x;
  }
  const lungime = parti.reduce((n, p) => n + p.length, 0);
  parti.push(Buffer.alloc(15 - (lungime % 16)), Buffer.from([suma]));
  const b = Buffer.concat(parti);
  return amprenta ? Buffer.concat([b, createHash('sha256').update(b).digest()]) : b;
}

/** Ce face `merge_bin` bootloader-ului: scrie parametrii flash-ului în antet și reface amprenta de la capăt. */
function cuAntetul(img: Buffer, mod: number, marimeFrecventa: number, octet?: readonly [number, number]): Buffer {
  const b = Buffer.from(img);
  b[2] = mod;
  b[3] = marimeFrecventa;
  if (octet) b[octet[0]] = octet[1];
  createHash('sha256').update(b.subarray(0, b.length - 32)).digest().copy(b, b.length - 32);
  return b;
}

/** O copie cu un bit schimbat în octetul `i`. */
function cuBitSchimbat(b: Buffer, i: number): Buffer {
  const c = Buffer.from(b);
  c.writeUInt8(c.readUInt8(i) ^ 1, i);
  return c;
}

test('imaginea ESP: antetul, segmentele, suma de control și amprenta; orice octet schimbat e prins', () => {
  const img = imagineEsp([Buffer.from('cod'), Buffer.from('date')]);
  assert.deepEqual(citesteImagineEsp(img, 'proba'), { segmente: 2, mod: 2, marime: 2, frecventa: 0, cuAmprenta: true, lungime: img.length });
  // Primul octet al primului segment; apoi punctul de intrare, în afara sumei de control, dar sub amprentă.
  assert.throws(() => citesteImagineEsp(cuBitSchimbat(img, 24 + 8), 'proba'), eroare(/suma de control/));
  assert.throws(() => citesteImagineEsp(cuBitSchimbat(img, 4), 'proba'), eroare(/SHA-256/));
  const faraAmprenta = imagineEsp([Buffer.from('cod')], [2, 0x20], false);
  assert.equal(citesteImagineEsp(faraAmprenta, 'proba').lungime % 16, 0);
  assert.throws(() => citesteImagineEsp(Buffer.alloc(64), 'proba'), eroare(/0xE9/));
  assert.throws(() => citesteImagineEsp(img.subarray(0, img.length - 1), 'proba'), eroare(/amprenta/));
});

/** O tabelă de partiții ESP-IDF: intrările, apoi intrarea MD5 (0xEB 0xEB), restul 0xFF. */
function tabela(intrari: readonly Partitie[]): Buffer {
  const b = Buffer.alloc(0xc00, 0xff);
  intrari.forEach((x, i) => {
    const p = i * 32;
    b.fill(0, p, p + 32);
    b[p] = 0xaa;
    b[p + 1] = 0x50;
    b[p + 2] = x.tip;
    b[p + 3] = x.subtip;
    b.writeUInt32LE(x.adresa, p + 4);
    b.writeUInt32LE(x.marime, p + 8);
    b.write(x.eticheta, p + 12, 'latin1');
  });
  b[intrari.length * 32] = 0xeb;
  b[intrari.length * 32 + 1] = 0xeb;
  return b;
}

const PARTITII: readonly Partitie[] = [
  { eticheta: 'nvs', tip: 1, subtip: 2, adresa: 0x9000, marime: 0x5000 },
  { eticheta: 'otadata', tip: 1, subtip: 0, adresa: 0xe000, marime: 0x2000 },
  { eticheta: 'app0', tip: 0, subtip: 0x10, adresa: 0x10000, marime: 0x1e0000 },
];

test('tabela de partiții: intrările până la cea MD5', () => {
  assert.deepEqual(citestePartitiile(tabela(PARTITII)), PARTITII);
  assert.throws(() => citestePartitiile(Buffer.alloc(64, 0xff)), eroare(/nicio intrare/));
});

/** Metadatele PlatformIO ale mediului `esp32dev`, cu ce contează aici; ca în rularea reală, fără adresa aplicației. */
function meta(
  imagini: readonly (readonly [string, string])[] = [['0x1000', '/b/bootloader.bin'], ['0x8000', '/b/partitions.bin'], ['0xe000', '/f/boot_app0.bin']],
  prog = '/b/firmware.elf',
  aplicatie?: string,
): unknown {
  const flash_images = imagini.map(([offset, path]) => ({ offset, path }));
  return { esp32dev: { prog_path: prog, extra: aplicatie === undefined ? { flash_images } : { flash_images, application_offset: aplicatie } } };
}

/** Cititorul pentru `bucatileImaginii`: doar tabela de partiții contează pentru adresa aplicației. */
const cuTabela = (partitii: readonly Partitie[] = PARTITII) => (cale: string): Buffer => {
  if (cale !== '/b/partitions.bin') throw new Error(`citit pe nedrept: ${cale}`);
  return tabela(partitii);
};
const BUCATI: readonly Bucata[] = [
  { adresa: 0x1000, cale: '/b/bootloader.bin' },
  { adresa: 0x8000, cale: '/b/partitions.bin' },
  { adresa: 0xe000, cale: '/f/boot_app0.bin' },
  { adresa: 0x10000, cale: '/b/firmware.bin' },
];

test('bucățile imaginii, din metadatele PlatformIO: imaginile suplimentare și aplicația la ota_0, în ordinea adreselor', () => {
  assert.deepEqual(bucatileImaginii(meta(), cuTabela()), BUCATI);
  // Dacă metadatele au totuși adresa aplicației, ea e cea a partiției ota_0.
  assert.deepEqual(bucatileImaginii(meta(undefined, undefined, '0x10000'), cuTabela()), BUCATI);
  assert.throws(() => bucatileImaginii(meta(undefined, undefined, '0x20000'), cuTabela()), eroare(/nu e adresa partiției ota_0 \(0x10000\)/));
  assert.throws(() => bucatileImaginii({ altul: {} }, cuTabela()), eroare(/n-au mediul esp32dev/));
  assert.throws(() => bucatileImaginii(meta([['0x1000', '/b/bootloader.bin'], ['0x8001', '/b/partitions.bin']]), cuTabela()), eroare(/începutul unui sector/));
  assert.throws(() => bucatileImaginii(meta([['8000', '/b/partitions.bin']]), cuTabela()), eroare(/nu e hex/));
  assert.throws(() => bucatileImaginii(meta([['0x8000', '/b/partitions.bin'], ['0x8000', '/f/boot_app0.bin']]), cuTabela()), eroare(/două bucăți la 0x8000/));
  assert.throws(() => bucatileImaginii(meta(undefined, '/b/firmware.bin'), cuTabela()), eroare(/nu e un \.elf/));
  assert.throws(() => bucatileImaginii(meta([['0x1000', '/b/bootloader.bin']]), cuTabela()), eroare(/0 tabele de partiții/));
  assert.throws(() => bucatileImaginii(meta(), cuTabela(PARTITII.filter((p) => p.tip !== 0))), eroare(/n-are partiția ota_0/));
  const nealiniata = PARTITII.map((p) => (p.tip === 0 ? { ...p, adresa: 0x18000 } : p));
  assert.throws(() => bucatileImaginii(meta(), cuTabela(nealiniata)), eroare(/multiplu de 0x10000/));
});

/** Fișierele bucăților: bootloader-ul cu antetul lui de la compilare, tabela, `boot_app0`, aplicația. */
function fisiere(partitii: readonly Partitie[] = PARTITII): Map<string, Buffer> {
  return new Map([
    ['/b/bootloader.bin', imagineEsp([Buffer.from('bootloader-ul de probă')], [2, 0x10])],
    ['/b/partitions.bin', tabela(partitii)],
    ['/f/boot_app0.bin', Buffer.alloc(0x2000, 0xff)],
    ['/b/firmware.bin', imagineEsp([Buffer.from('aplicația'), Buffer.from('datele ei')])],
  ]);
}

/** Imaginea unică, ca `merge_bin`: 0xFF peste tot, fiecare bucată la adresa ei, bootloader-ul cu antetul rescris. */
function unica(f: ReadonlyMap<string, Buffer>, bucati: readonly Bucata[] = BUCATI, bootloader?: Buffer): Buffer {
  const piese = bucati.map((b) => [b.adresa, b.cale === '/b/bootloader.bin' ? bootloader ?? cuAntetul(f.get(b.cale) as Buffer, 2, 0x20) : (f.get(b.cale) as Buffer)] as const);
  const u = Buffer.alloc(Math.max(...piese.map(([a, p]) => a + p.length)), 0xff);
  for (const [a, p] of piese) p.copy(u, a);
  return u;
}

test('imaginea unică: fiecare bucată la adresa ei, bootloader-ul DIO / 40 MHz / 4 MB, aplicația în partiția ei', () => {
  const f = fisiere();
  const raport = verificaImaginea(BUCATI, (c) => f.get(c) as Buffer, unica(f));
  assert.deepEqual(raport.slice(0, 4).map((l) => l.split(',')[0]), ['0x1000 bootloader.bin', '0x8000 partitions.bin', '0xe000 boot_app0.bin', '0x10000 firmware.bin']);
  assert.match(raport[4] ?? '', /^aplicația: 2 segmente, validă, în app0 \(0x10000/);
});

test('imaginea unică greșită e refuzată, cu motivul', () => {
  const f = fisiere();
  const citeste = (c: string): Buffer => f.get(c) as Buffer;
  const boot = f.get('/b/bootloader.bin') as Buffer;
  // Bootloader-ul cu antetul de la compilare (2 MB): placa are 4 MB.
  assert.throws(() => verificaImaginea(BUCATI, citeste, unica(f, BUCATI, boot)), eroare(/trebuie DIO, 4 MB, 40 MHz/));
  // Un octet schimbat în afara antetului flash-ului, cu amprenta refăcută: tot e prins.
  assert.throws(() => verificaImaginea(BUCATI, citeste, unica(f, BUCATI, cuAntetul(boot, 2, 0x20, [8, 0x07]))), eroare(/la octetul 8/));
  // Aplicația pusă cu un sector mai încolo decât spun metadatele.
  const mutata = BUCATI.map((b) => (b.cale === '/b/firmware.bin' ? { ...b, adresa: 0x11000 } : b));
  assert.throws(() => verificaImaginea(BUCATI, citeste, unica(f, mutata)), eroare(/firmware\.bin: octeții de la 0x10000/));
  // Tabela de partiții fără o aplicație la adresa aplicației, sau cu o partiție prea mică pentru ea.
  for (const [partitii, motiv] of [
    [PARTITII.map((p) => (p.tip === 0 ? { ...p, adresa: 0x20000 } : p)), /nicio partiție de aplicație nu începe la 0x10000/],
    [PARTITII.map((p) => (p.tip === 0 ? { ...p, marime: 0x10 } : p)), /nu încape în app0/],
    [PARTITII.map((p) => (p.eticheta === 'otadata' ? { ...p, adresa: 0xd000 } : p)), /boot_app0 nu e pe partiția otadata/],
  ] as const) {
    const g = fisiere(partitii);
    assert.throws(() => verificaImaginea(BUCATI, (c) => g.get(c) as Buffer, unica(g)), eroare(motiv));
  }
  // Bucăți suprapuse, bootloader-ul în altă parte, imaginea peste 4 MB.
  const suprapuse = BUCATI.map((b) => (b.cale === '/f/boot_app0.bin' ? { ...b, adresa: 0xf000 } : b));
  assert.throws(() => verificaImaginea(suprapuse, citeste, unica(f, suprapuse)), eroare(/se suprapune/));
  const altundeva = BUCATI.map((b) => (b.cale === '/b/bootloader.bin' ? { ...b, adresa: 0x2000 } : b));
  assert.throws(() => verificaImaginea(altundeva, citeste, unica(f, altundeva)), eroare(/nu la 0x1000/));
  const mare = Buffer.concat([unica(f), Buffer.alloc(4 * 1024 * 1024, 0xff)]);
  assert.throws(() => verificaImaginea(BUCATI, citeste, mare), eroare(/peste cei 4 MB/));
});
