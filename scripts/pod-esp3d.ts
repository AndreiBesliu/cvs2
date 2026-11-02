/**
 * Podul ESP3D (ADR 0119, „Podul ESP3D”; ghidul e `docs/masina/pod-esp3d.md`): configurarea sursei ESP3D și proba
 * imaginii, pentru workflow-ul `pod-esp3d`.
 *
 *   node scripts/pod-esp3d.ts configureaza <sursa>              # faptele, schimbările, unitatea de probă
 *   node scripts/pod-esp3d.ts harta <metadate.json>             # adresele imaginilor, pentru `esptool merge_bin`
 *   node scripts/pod-esp3d.ts verifica <metadate.json> <imagine> # fiecare bucată la adresa ei, validă
 *
 * Sursa e ESP3D 3.0.2. În 3.1, socket-ul de date are alt subprotocol („esp3d-v1”) și cadrele binare sunt transfer de
 * fișiere, deci profilul `esp3d` al aplicației nu mai merge. De aceea faptele de care depinde profilul se verifică
 * întâi. Fiecare fapt și fiecare text de schimbat apare exact o dată, altfel scriptul aruncă: o sursă schimbată nu
 * trece tăcut. Unitatea de probă verifică la compilare configurarea efectivă, după toate includerile.
 *
 * Rețeaua atelierului nu intră în imagine (repo-ul și artefactele lui sunt publice): se pune la prima pornire, din
 * pagina podului.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

export class EroarePod extends Error {}

/** Un text din sursa ESP3D pe care se sprijină profilul aplicației: se verifică, nu se schimbă. */
interface Fapt {
  readonly fisier: string;
  readonly text: string;
  readonly motiv: string;
}

/** O schimbare în sursa ESP3D: `vechi` apare exact o dată și devine `nou`. */
interface Schimbare {
  readonly fisier: string;
  readonly vechi: string;
  readonly nou: string;
  readonly motiv: string;
}

const WS = 'esp3d/src/modules/websocket/websocket_server.cpp';
const SETARI = 'esp3d/src/core/esp3d_settings.cpp';
const CONFIGURARE = 'esp3d/configuration.h';

export const FAPTE: readonly Fapt[] = [
  { fisier: 'esp3d/src/include/esp3d_version.h', text: '#define FW_VERSION "3.0.2"', motiv: 'sursa e ESP3D 3.0.2' },
  {
    fisier: WS,
    text: 'WebSocket_Server websocket_data_server("arduino", ESP3DClientType::websocket);',
    motiv: 'subprotocolul socket-ului de date e „arduino” (în 3.1 e „esp3d-v1”)',
  },
  {
    fisier: WS,
    text: [
      '    case WStype_BIN:',
      '      esp3d_log("[%u] get binary length: %u port %d", num, length,',
      '                websocket_data_server.port());',
      '      websocket_data_server.push2RXbuffer(payload, length);',
    ].join('\n'),
    motiv: 'cadrele binare pleacă la GRBL (în 3.1 sunt transfer de fișiere)',
  },
  { fisier: SETARI, text: '#define DEFAULT_WEBSOCKET_ON "1"', motiv: 'socket-ul de date e pornit implicit' },
  { fisier: SETARI, text: '#define DEFAULT_WEBSOCKET_PORT "8282"', motiv: 'portul socket-ului de date e 8282, ca în profilul aplicației' },
  { fisier: SETARI, text: '#define DEFAULT_BAUD_RATE "115200"', motiv: 'serialul e la 115 200 baud, ca GRBL 1.1h' },
  {
    fisier: 'esp3d/src/core/esp3d_string.cpp',
    text: [
      'bool esp3d_string::isRealTimeCommand(char c) {',
      '  if (ESP3DSettings::GetFirmwareTarget() == GRBL ||',
      '      ESP3DSettings::GetFirmwareTarget() == GRBLHAL) {',
    ].join('\n'),
    motiv: 'comenzile de timp real (?, !, ~, Ctrl-X) pleacă imediat doar cu ținta GRBL',
  },
];

export const SCHIMBARI: readonly Schimbare[] = [
  {
    fisier: CONFIGURARE,
    vechi: '#define ESP_SERIAL_OUTPUT USE_SERIAL_0',
    nou: [
      '#define ESP_SERIAL_OUTPUT USE_SERIAL_2',
      '// Podul cncvs2 (ADR 0119): GRBL pe Serial2, la pinii RX2 / TX2 ai plăcilor ESP32 DevKit.',
      '#define ESP_RX_PIN 16',
      '#define ESP_TX_PIN 17',
    ].join('\n'),
    motiv: 'GRBL e pe Serial2 (RX pe GPIO16, TX pe GPIO17): Serial0 e al USB-ului și al mesajelor de pornire',
  },
  {
    fisier: CONFIGURARE,
    vechi: '#define DEFAULT_FW UNKNOWN_FW',
    nou: '#define DEFAULT_FW GRBL',
    motiv: 'ținta implicită e GRBL: cu alta, comenzile de timp real așteaptă capătul liniei',
  },
  {
    fisier: CONFIGURARE,
    vechi: '// #define WS_DATA_FEATURE',
    nou: '#define WS_DATA_FEATURE',
    motiv: 'socket-ul de date (portul 8282) e compilat',
  },
];

/** Unitatea de probă, compilată cu sursa (PlatformIO compilează tot dosarul `esp3d/`). */
export const CALE_PROBA = 'esp3d/pod_verificare.cpp';

export const PROBA = `// Podul ESP3D al cncvs2 (ADR 0119), scris de scripts/pod-esp3d.ts: configurarea efectivă, după toate includerile,
// verificată la compilare. Dacă ceva nu e cum cere podul, compilarea pică aici, cu motivul.
#include "src/include/esp3d_config.h"

#if ESP_SERIAL_OUTPUT != USE_SERIAL_2 || ESP_RX_PIN != 16 || ESP_TX_PIN != 17
#error "podul: GRBL e pe Serial2, cu RX pe GPIO16 și TX pe GPIO17"
#endif
#if COMMUNICATION_PROTOCOL != RAW_SERIAL
#error "podul: protocolul serial e RAW_SERIAL (octeții trec neschimbați)"
#endif
#if DEFAULT_FW != GRBL
#error "podul: ținta implicită e GRBL (doar așa pleacă imediat comenzile de timp real)"
#endif
#if !defined(WIFI_FEATURE) || !defined(WS_DATA_FEATURE)
#error "podul: WiFi-ul și socket-ul de date (WS_DATA_FEATURE) sunt compilate"
#endif
#if defined(STATION_WIFI_SSID) || defined(STATION_WIFI_PASSWORD)
#error "podul: rețeaua atelierului nu intră în imagine (se pune la prima pornire)"
#endif

namespace {
constexpr bool egale(const char *a, const char *b) { return *a == *b && (*a == '\\0' || egale(a + 1, b + 1)); }
}  // namespace
#define POD_SIR_(x) #x
#define POD_SIR(x) POD_SIR_(x)
// Setarea țintei își ia valoarea implicită din STRING(DEFAULT_FW) (esp3d_settings.cpp): trebuie să iasă cea a lui GRBL.
static_assert(egale(POD_SIR(DEFAULT_FW), POD_SIR(GRBL)), "podul: valoarea implicită a țintei e GRBL");
static_assert(egale(FW_VERSION, "3.0.2"), "podul: sursa e ESP3D 3.0.2");
`;

const aparitii = (text: string, cautat: string): number => text.split(cautat).length - 1;

/** Verifică faptele, aplică schimbările și scrie unitatea de probă în sursa ESP3D din `dosar`; întoarce raportul. */
export function configureaza(dosar: string): string[] {
  const citeste = (fisier: string): string => {
    const cale = join(dosar, fisier);
    if (!existsSync(cale)) throw new EroarePod(`${fisier} lipsește din sursă`);
    return readFileSync(cale, 'utf8');
  };
  const raport: string[] = [];
  for (const f of FAPTE) {
    const n = aparitii(citeste(f.fisier), f.text);
    if (n !== 1) throw new EroarePod(`${f.fisier}: textul pentru „${f.motiv}” apare de ${n} ori, nu o dată`);
    raport.push(`fapt: ${f.motiv}`);
  }
  if (existsSync(join(dosar, CALE_PROBA))) throw new EroarePod(`${CALE_PROBA} există deja: sursa e deja configurată`);
  const texte = new Map<string, string>();
  for (const s of SCHIMBARI) {
    const text = texte.get(s.fisier) ?? citeste(s.fisier);
    const n = aparitii(text, s.vechi);
    if (n !== 1) throw new EroarePod(`${s.fisier}: „${s.vechi}” apare de ${n} ori, nu o dată (${s.motiv})`);
    texte.set(s.fisier, text.replace(s.vechi, () => s.nou));
    raport.push(`schimbat: ${s.motiv}`);
  }
  for (const [fisier, text] of texte) writeFileSync(join(dosar, fisier), text);
  writeFileSync(join(dosar, CALE_PROBA), PROBA);
  raport.push(`scris: ${CALE_PROBA} (configurarea efectivă, verificată la compilare)`);
  return raport;
}

/** O bucată a imaginii unice: adresa ei în flash și fișierul ei. */
export interface Bucata {
  readonly adresa: number;
  readonly cale: string;
}

const esteObiect = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const hex = (n: number): string => `0x${n.toString(16)}`;

function adresa(v: unknown, unde: string): number {
  if (typeof v !== 'string' || !/^0x[0-9a-f]+$/i.test(v)) throw new EroarePod(`${unde}: adresa ${String(v)} nu e hex`);
  const n = Number.parseInt(v, 16);
  if (n % 0x1000 !== 0) throw new EroarePod(`${unde}: adresa ${v} nu e la începutul unui sector (0x1000)`);
  return n;
}

/**
 * Bucățile imaginii, din metadatele PlatformIO (`pio project metadata --json-output`): imaginile din
 * `extra.flash_images` (bootloader-ul, tabela de partiții, `boot_app0`) și aplicația, la `extra.application_offset`,
 * lângă `prog_path`. În ordinea adreselor.
 */
export function bucatileImaginii(metadate: unknown, mediu = 'esp32dev'): Bucata[] {
  const m = esteObiect(metadate) ? metadate[mediu] : undefined;
  if (!esteObiect(m) || !esteObiect(m.extra) || !Array.isArray(m.extra.flash_images) || typeof m.prog_path !== 'string') {
    throw new EroarePod(`metadatele n-au mediul ${mediu}, cu extra.flash_images și prog_path`);
  }
  const bucati: Bucata[] = m.extra.flash_images.map((x: unknown, i: number) => {
    if (!esteObiect(x) || typeof x.path !== 'string') throw new EroarePod(`flash_images[${i}] n-are path`);
    return { adresa: adresa(x.offset, `flash_images[${i}]`), cale: x.path };
  });
  if (!m.prog_path.endsWith('.elf')) throw new EroarePod(`prog_path (${m.prog_path}) nu e un .elf`);
  bucati.push({ adresa: adresa(m.extra.application_offset, 'application_offset'), cale: m.prog_path.replace(/\.elf$/, '.bin') });
  bucati.sort((a, b) => a.adresa - b.adresa);
  bucati.forEach((b, i) => {
    if (i > 0 && b.adresa === bucati[i - 1]?.adresa) throw new EroarePod(`două bucăți la ${hex(b.adresa)}`);
  });
  return bucati;
}

/** Ce spune antetul unei imagini ESP32 și câți octeți are ea. */
export interface ImagineEsp {
  readonly segmente: number;
  /** Modul flash-ului: 0 QIO, 1 QOUT, 2 DIO, 3 DOUT. */
  readonly mod: number;
  /** Mărimea flash-ului: 0 1 MB, 1 2 MB, 2 4 MB, 3 8 MB, 4 16 MB. */
  readonly marime: number;
  /** Frecvența flash-ului: 0 40 MHz, 1 26 MHz, 2 20 MHz, 0xF 80 MHz. */
  readonly frecventa: number;
  readonly cuAmprenta: boolean;
  readonly lungime: number;
}

/**
 * Citește și validează o imagine ESP32 (formatul din esptool): 0xE9, antetul de 24 de octeți, segmentele, suma de
 * control (XOR-ul datelor segmentelor, pornit de la 0xEF, în ultimul octet al unui bloc de 16) și, când octetul 23 e 1,
 * amprenta SHA-256 a tuturor octeților dinainte. Aruncă la orice nepotrivire.
 */
export function citesteImagineEsp(b: Buffer, unde: string): ImagineEsp {
  if (b.length < 24 || b[0] !== 0xe9) throw new EroarePod(`${unde}: nu începe cu 0xE9 (nu e o imagine ESP)`);
  const segmente = b.readUInt8(1);
  let p = 24;
  let suma = 0xef;
  for (let i = 0; i < segmente; i++) {
    if (p + 8 > b.length) throw new EroarePod(`${unde}: segmentul ${i} trece de capăt`);
    const lungime = b.readUInt32LE(p + 4);
    p += 8;
    if (p + lungime > b.length) throw new EroarePod(`${unde}: segmentul ${i} trece de capăt`);
    for (let j = p; j < p + lungime; j++) suma ^= b.readUInt8(j);
    p += lungime;
  }
  p += 15 - (p % 16);
  if (p >= b.length) throw new EroarePod(`${unde}: lipsește suma de control`);
  const control = b.readUInt8(p);
  if (control !== suma) throw new EroarePod(`${unde}: suma de control e ${hex(control)}, calculată ${hex(suma)}`);
  p += 1;
  const cuAmprenta = b[23] === 1;
  if (cuAmprenta) {
    if (p + 32 > b.length) throw new EroarePod(`${unde}: lipsește amprenta SHA-256`);
    const calculata = createHash('sha256').update(b.subarray(0, p)).digest();
    if (!calculata.equals(b.subarray(p, p + 32))) throw new EroarePod(`${unde}: amprenta SHA-256 nu se potrivește`);
    p += 32;
  }
  const flash = b.readUInt8(3);
  return { segmente, mod: b.readUInt8(2), marime: flash >> 4, frecventa: flash & 0x0f, cuAmprenta, lungime: p };
}

/** O intrare din tabela de partiții ESP-IDF. */
export interface Partitie {
  readonly eticheta: string;
  readonly tip: number;
  readonly subtip: number;
  readonly adresa: number;
  readonly marime: number;
}

/** Tabela de partiții: intrări de 32 de octeți cu 0xAA 0x50 în față, până la intrarea MD5 (0xEB 0xEB) sau la 0xFF. */
export function citestePartitiile(b: Buffer): Partitie[] {
  const r: Partitie[] = [];
  for (let p = 0; p + 32 <= b.length && b[p] === 0xaa && b[p + 1] === 0x50; p += 32) {
    r.push({
      eticheta: b.subarray(p + 12, p + 28).toString('latin1').replace(/\0+$/, ''),
      tip: b.readUInt8(p + 2),
      subtip: b.readUInt8(p + 3),
      adresa: b.readUInt32LE(p + 4),
      marime: b.readUInt32LE(p + 8),
    });
  }
  if (r.length === 0) throw new EroarePod('tabela de partiții n-are nicio intrare (lipsește 0xAA 0x50)');
  return r;
}

/** Placa `esp32dev`: 4 MB de flash, DIO, 40 MHz; ROM-ul ESP32 citește bootloader-ul de la 0x1000. */
const MARIME_FLASH = 4 * 1024 * 1024;
const FLASH = { mod: 2, marime: 2, frecventa: 0 } as const;
const ADRESA_BOOTLOADER = 0x1000;

/**
 * Imaginea unică, scrisă de `esptool merge_bin`. Fiecare bucată stă la adresa ei, cu octeții fișierului ei. Excepția e
 * bootloader-ul: `merge_bin` îi scrie în antet parametrii flash-ului (octeții 2 și 3) și îi reface amprenta. Bootloader-ul
 * și aplicația sunt imagini valide; aplicația stă la începutul unei partiții de aplicație care o cuprinde; `boot_app0`
 * stă pe partiția `otadata`. Întoarce raportul.
 */
export function verificaImaginea(bucati: readonly Bucata[], citeste: (cale: string) => Buffer, imagine: Buffer): string[] {
  if (imagine.length > MARIME_FLASH) throw new EroarePod(`imaginea are ${imagine.length} octeți, peste cei 4 MB ai plăcii`);
  const fisiere = new Map(bucati.map((b) => [b, citeste(b.cale)] as const));
  const dupaNume = (nume: string): Bucata => {
    const gasite = bucati.filter((b) => basename(b.cale) === nume);
    const [gasita] = gasite;
    if (gasite.length !== 1 || !gasita) throw new EroarePod(`${nume}: ${gasite.length} bucăți cu numele ăsta, nu una`);
    return gasita;
  };
  const bootloader = dupaNume('bootloader.bin');
  const partitii = dupaNume('partitions.bin');
  const aplicatie = dupaNume('firmware.bin');
  if (bootloader.adresa !== ADRESA_BOOTLOADER) throw new EroarePod(`bootloader-ul e la ${hex(bootloader.adresa)}, nu la 0x1000`);

  const ordonate = [...bucati].sort((x, y) => x.adresa - y.adresa);
  ordonate.forEach((b, i) => {
    const urmatoarea = ordonate[i + 1];
    if (urmatoarea && b.adresa + (fisiere.get(b) as Buffer).length > urmatoarea.adresa) {
      throw new EroarePod(`${basename(b.cale)} (${hex(b.adresa)}) se suprapune peste ${basename(urmatoarea.cale)}`);
    }
  });

  const raport: string[] = [];
  for (const b of ordonate) {
    const original = fisiere.get(b) as Buffer;
    const nume = basename(b.cale);
    const felie = imagine.subarray(b.adresa, b.adresa + original.length);
    if (felie.length !== original.length) throw new EroarePod(`${nume} nu încape în imagine la ${hex(b.adresa)}`);
    if (b === bootloader) {
      const img = citesteImagineEsp(felie, 'bootloader-ul din imagine');
      if (img.mod !== FLASH.mod || img.marime !== FLASH.marime || img.frecventa !== FLASH.frecventa) {
        throw new EroarePod(`bootloader-ul din imagine are flash-ul mod ${img.mod}, mărime ${img.marime}, frecvență ${img.frecventa}; trebuie DIO, 4 MB, 40 MHz`);
      }
      const amprenta = img.cuAmprenta ? img.lungime - 32 : img.lungime;
      for (let i = 0; i < original.length; i++) {
        if (i !== 2 && i !== 3 && (i < amprenta || i >= img.lungime) && felie[i] !== original[i]) {
          throw new EroarePod(`bootloader-ul din imagine diferă de fișier la octetul ${i}, în afara antetului flash-ului`);
        }
      }
    } else if (!felie.equals(original)) {
      throw new EroarePod(`${nume}: octeții de la ${hex(b.adresa)} nu sunt cei ai fișierului`);
    }
    raport.push(`${hex(b.adresa)} ${nume}, ${original.length} octeți`);
  }

  const app = citesteImagineEsp(fisiere.get(aplicatie) as Buffer, 'aplicația');
  const tabela = citestePartitiile(fisiere.get(partitii) as Buffer);
  const partitieApp = tabela.find((p) => p.tip === 0 && p.adresa === aplicatie.adresa);
  if (!partitieApp) throw new EroarePod(`nicio partiție de aplicație nu începe la ${hex(aplicatie.adresa)}`);
  if (app.lungime > partitieApp.marime) throw new EroarePod(`aplicația (${app.lungime} octeți) nu încape în ${partitieApp.eticheta}`);
  const otadata = tabela.find((p) => p.tip === 1 && p.subtip === 0);
  if (otadata && dupaNume('boot_app0.bin').adresa !== otadata.adresa) {
    throw new EroarePod(`boot_app0 nu e pe partiția ${otadata.eticheta} (${hex(otadata.adresa)})`);
  }
  raport.push(`aplicația: ${app.segmente} segmente, validă, în ${partitieApp.eticheta} (${hex(partitieApp.adresa)}, ${partitieApp.marime} octeți)`);
  raport.push(`imaginea unică: ${imagine.length} octeți, DIO, 40 MHz, 4 MB`);
  return raport;
}

if (import.meta.main) {
  const [comanda, a, b, ...rest] = process.argv.slice(2);
  const json = (cale: string): unknown => JSON.parse(readFileSync(cale, 'utf8'));
  try {
    if (comanda === 'configureaza' && a !== undefined && b === undefined) {
      for (const l of configureaza(a)) console.log(l);
    } else if (comanda === 'harta' && a !== undefined && b === undefined) {
      for (const x of bucatileImaginii(json(a))) console.log(`${hex(x.adresa)} ${x.cale}`);
    } else if (comanda === 'verifica' && a !== undefined && b !== undefined && rest.length === 0) {
      for (const l of verificaImaginea(bucatileImaginii(json(a)), (c) => readFileSync(c), readFileSync(b))) console.log(l);
    } else {
      console.error('folosire: configureaza <sursa> | harta <metadate.json> | verifica <metadate.json> <imagine>');
      process.exit(2);
    }
  } catch (e) {
    if (!(e instanceof EroarePod)) throw e;
    console.error(e.message);
    process.exit(1);
  }
}
