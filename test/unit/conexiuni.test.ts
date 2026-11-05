/**
 * Conectarea prin WiFi, partea pură (ADR 0136, felia 3.6f), pe hârtie: conexiunile ținute (citirea tolerantă, alegerile din
 * 3.6d aduse, ordinea, plafonul), comenzile podului ESP3D 3.0.2 (escape-urile lui și refuzurile), cititorii răspunsurilor
 * (cu liniile GRBL ajunse între bucăți), gazdele căutate și planificarea căutării (câte deodată, prima găsită oprește restul).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHEIE_CONEXIUNI, INCERCARE_81, INCERCARE_POD, MAX_CONEXIUNI, NICIUNA, areRaportGrbl, citesteConexiuni, comandaEsp, comenziPod, cuEscape, cuFormular,
  gazdeCautare, gazdeRetea, idConexiune, infoPod, motivParola, motivRetea, numeLocal, obiectEsp, primulGasit, raspunsEsp,
  reteleDeCautat, reteleEsp410, scrieConexiuni, tineConexiune, uitaConexiune, verdictPod, type ConexiuneTinuta, type ConexiuniTinute,
} from '../../src/machine/conexiuni.ts';

const atelier = { profil: 'esp3d', adresa: 'esp3d.local', port: 8282, drum: 'atelier', retea: 'Atelier-COSTEL', ultimIp: '192.168.1.47' } as const;

test('cheia rămâne cea din 3.6d; alegerile vechi (v: 1) devin formularul și prima conexiune (adresa scrisă de mână)', () => {
  assert.equal(CHEIE_CONEXIUNI, 'cncvs2.masina.retea');
  const s = citesteConexiuni(JSON.stringify({ v: 1, profil: 'esp3d', adresa: ' 192.168.1.47 ', port: 8282 }));
  assert.deepEqual(s.formular, { profil: 'esp3d', adresa: ' 192.168.1.47 ', port: 8282 });
  assert.deepEqual(s.conexiuni, [{
    id: 'esp3d|192.168.1.47|8282', profil: 'esp3d', adresa: '192.168.1.47', port: 8282, drum: 'adresa', retea: null, ultimIp: null, folosita: 0,
  }]);
  // Fără adresă, doar formularul; v1 cu un profil necunoscut sau un port greșit: nimic.
  assert.deepEqual(citesteConexiuni(JSON.stringify({ v: 1, profil: 'fluidnc', adresa: '', port: 81 })), { conexiuni: [], formular: { profil: 'fluidnc', adresa: '', port: 81 } });
  assert.deepEqual(citesteConexiuni(JSON.stringify({ v: 1, profil: 'marlin', adresa: 'x.local', port: 81 })), NICIUNA);
  assert.deepEqual(citesteConexiuni(JSON.stringify({ v: 1, profil: 'esp3d', adresa: 'x.local', port: '8282' })), NICIUNA);
});

test('citirea e tolerantă: textul lipsă, stricat sau de altă versiune dă lista goală; intrările greșite se lasă deoparte', () => {
  for (const t of [null, '', '{', 'null', '42', '[]', JSON.stringify({ v: 3, conexiuni: [atelier] })]) assert.deepEqual(citesteConexiuni(t), NICIUNA, String(t));
  const bune = { ...atelier, folosita: 5 };
  const s = citesteConexiuni(JSON.stringify({
    v: 2,
    conexiuni: [bune, { ...atelier, port: 0 }, { ...atelier, profil: 'marlin' }, { ...atelier, adresa: '  ' }, { ...atelier, drum: 'cablu' }, 'x', null],
    formular: { profil: 'esp3d', adresa: 7, port: 8282 },
  }));
  assert.deepEqual(s, { conexiuni: [{ ...bune, id: 'esp3d|esp3d.local|8282' }], formular: null });
  // Același id de două ori (o stocare scrisă de mână): rămâne cea folosită mai recent.
  const dubla = citesteConexiuni(JSON.stringify({ v: 2, conexiuni: [{ ...atelier, retea: 'veche', folosita: 1 }, { ...atelier, adresa: 'ESP3D.local', folosita: 9 }] }));
  assert.deepEqual(dubla.conexiuni.map((c) => [c.adresa, c.folosita]), [['ESP3D.local', 9]]);
});

test('scrierea și citirea dau aceleași conexiuni (fără id-uri în text); formularul rămâne', () => {
  let s: ConexiuniTinute = tineConexiune(NICIUNA, atelier, 1000);
  s = tineConexiune(s, { profil: 'esp3d', adresa: '192.168.0.1', port: 8282, drum: 'proprie', retea: 'ESP3D' }, 2000);
  s = cuFormular(s, { profil: 'fluidnc', adresa: '10.0.0.7', port: 81 });
  const text = scrieConexiuni(s);
  assert.doesNotMatch(text, /"id"/);
  assert.deepEqual(JSON.parse(text).v, 2);
  assert.deepEqual(citesteConexiuni(text), s);
});

test('tineConexiune: cea nouă prima; una știută se actualizează (rețeaua și ultimul IP rămân dacă nu se spun); adresa scrisă nu schimbă drumul', () => {
  let s = tineConexiune(NICIUNA, atelier, 1000);
  s = tineConexiune(s, { profil: 'fluidnc', adresa: 'fluidnc.local', port: 81, drum: 'atelier' }, 1000);
  assert.deepEqual(s.conexiuni.map((c) => [c.adresa, c.folosita]), [['fluidnc.local', 1001], ['esp3d.local', 1000]], 'aceeași oră: tot cea nouă prima');
  // Aceeași conexiune, scrisă de mână (alt fel de litere): drumul, rețeaua și IP-ul rămân, iar ea urcă prima.
  s = tineConexiune(s, { profil: 'esp3d', adresa: 'ESP3D.local', port: 8282, drum: 'adresa' }, 5000);
  assert.equal(s.conexiuni.length, 2);
  assert.deepEqual(s.conexiuni[0], { ...atelier, adresa: 'ESP3D.local', id: idConexiune('esp3d', 'esp3d.local', 8282), folosita: 5000 });
  // Un IP nou se ține; alt port e altă conexiune.
  s = tineConexiune(s, { ...atelier, ultimIp: '192.168.1.60' }, 6000);
  assert.equal(s.conexiuni[0]?.ultimIp, '192.168.1.60');
  s = tineConexiune(s, { ...atelier, port: 8283 }, 7000);
  assert.equal(s.conexiuni.length, 3);
  assert.deepEqual(uitaConexiune(s, idConexiune('esp3d', 'esp3d.local', 8283)).conexiuni.map((c) => c.port), [8282, 81]);
});

test('plafonul: cel mult 8 conexiuni, cea folosită mai demult cade prima', () => {
  let s = NICIUNA;
  for (let k = 1; k <= MAX_CONEXIUNI + 2; k++) s = tineConexiune(s, { profil: 'fluidnc', adresa: `192.168.1.${k}`, port: 81, drum: 'adresa' }, k);
  assert.equal(s.conexiuni.length, MAX_CONEXIUNI);
  assert.deepEqual(s.conexiuni.map((c) => c.adresa).slice(-1), ['192.168.1.3']);
  assert.equal(s.conexiuni[0]?.adresa, '192.168.1.10');
});

test('escape-urile podului: \\ în fața spațiului și a lui \\; comanda cere răspunsul în JSON și se termină cu capăt de linie', () => {
  assert.equal(cuEscape('Atelier Costel'), 'Atelier\\ Costel');
  assert.equal(cuEscape('a\\b c'), 'a\\\\b\\ c');
  assert.equal(cuEscape(' x '), '\\ x\\ ');
  assert.equal(cuEscape('fara'), 'fara');
  assert.equal(comandaEsp(800), '[ESP800] json\n');
  assert.equal(comandaEsp(100, 'Atelier\\ Costel'), '[ESP100]Atelier\\ Costel json\n');
});

test('rețeaua și parolele: lungimile podului, doar ASCII tipăribil, fără ce ar scoate podul din parametri', () => {
  assert.equal(motivRetea(''), 'goala');
  assert.equal(motivRetea('x'), null);
  assert.equal(motivRetea('a'.repeat(32)), null);
  assert.equal(motivRetea('a'.repeat(33)), 'lunga');
  assert.equal(motivRetea('Atelier Ștefan'), 'caractere');
  assert.equal(motivRetea('tab\there'), 'caractere');
  for (const r of ['json', 'json=1', 'pwd=abc']) assert.equal(motivRetea(r), 'rezervata', r);
  for (const r of ['JSON', 'my json', 'a pwd=b', 'Atelier "COSTEL"', 'a\\b']) assert.equal(motivRetea(r), null, r);
  assert.equal(motivParola(''), 'goala');
  assert.equal(motivParola('1234567'), 'scurta');
  assert.equal(motivParola('12345678'), null);
  assert.equal(motivParola('p'.repeat(64)), null);
  assert.equal(motivParola('p'.repeat(65)), 'lunga');
  assert.equal(motivParola('parolă-lungă'), 'caractere');
  for (const p of ['NOPASSWORD', 'json=12345678', 'pwd=12345678']) assert.equal(motivParola(p), 'rezervata', p);
});

test('comenzile podului: parola rețelei proprii, rețeaua, parola ei (NOPASSWORD la o rețea liberă), cu escape-uri; refuzul spune câmpul', () => {
  const r = comenziPod({ retea: 'Atelier Costel', parola: 'parola mea\\1', parolaPod: 'pod-nou-123' });
  assert.ok(r.ok);
  assert.deepEqual(r.ok ? r.comenzi : [], [
    { nr: 106, text: '[ESP106]pod-nou-123 json\n' },
    { nr: 100, text: '[ESP100]Atelier\\ Costel json\n' },
    { nr: 101, text: '[ESP101]parola\\ mea\\\\1 json\n' },
  ]);
  const libera = comenziPod({ retea: 'Musafiri', parola: null, parolaPod: '12345678' });
  assert.deepEqual(libera.ok ? libera.comenzi[2] : null, { nr: 101, text: '[ESP101]NOPASSWORD json\n' });
  assert.deepEqual(comenziPod({ retea: '', parola: null, parolaPod: '12345678' }), { ok: false, camp: 'retea', motiv: 'goala' });
  assert.deepEqual(comenziPod({ retea: 'A', parola: 'scurt', parolaPod: '12345678' }), { ok: false, camp: 'parola', motiv: 'scurta' });
  assert.deepEqual(comenziPod({ retea: 'A', parola: '12345678', parolaPod: '' }), { ok: false, camp: 'parola-pod', motiv: 'goala' });
});

test('răspunsul scurt al podului: linia comenzii cerute, printre liniile GRBL; ghilimelele din date rămân ca atare', () => {
  const text = 'ok\r\n<Idle|MPos:0.000,0.000,0.000|FS:0,0>\r\n{"cmd":"105","status":"ok","data":"ESP3D"}\n{"cmd":"100","status":"error","data":"Invalid parameter"}\n';
  assert.deepEqual(raspunsEsp(text, 105), { ok: true, date: 'ESP3D' });
  assert.deepEqual(raspunsEsp(text, 100), { ok: false, date: 'Invalid parameter' });
  assert.equal(raspunsEsp(text, 101), null);
  assert.deepEqual(raspunsEsp('{"cmd":"105","status":"ok","data":"Atelier "X""}\r\n', 105), { ok: true, date: 'Atelier "X"' });
  // Neîntreagă încă: nimic; o comandă care începe la fel (1050) nu e 105.
  assert.equal(raspunsEsp('{"cmd":"105","status":"ok","data":"ES', 105), null);
  assert.equal(raspunsEsp('{"cmd":"1050","status":"ok","data":"x"}\n', 105), null);
});

/** Răspunsul la `[ESP800]json` al podului 3.0.2, în bucățile lui (capul, perechile, coada), fără capăt de linie. */
const BUCATI_800 = [
  '{"cmd":"800","status":"ok","data":{',
  '"FWVersion":"3.0.2"', ',"FWTarget":"grbl"', ',"FWTargetID":"10"', ',"Setup":"Enabled"', ',"WebSocketIP":"192.168.1.47"',
  ',"WebSocketPort":"81"', ',"Hostname":"esp3d"', ',"WiFiMode":"STA"', ',"Time":"none"',
  '}}',
];

test('[ESP800]json: obiectul întreg, cu o linie GRBL ajunsă după cap, între perechi și înaintea cozii', () => {
  const asteptat = {
    cmd: '800', status: 'ok',
    data: { FWVersion: '3.0.2', FWTarget: 'grbl', FWTargetID: '10', Setup: 'Enabled', WebSocketIP: '192.168.1.47', WebSocketPort: '81', Hostname: 'esp3d', WiFiMode: 'STA', Time: 'none' },
  };
  assert.deepEqual(obiectEsp(BUCATI_800.join(''), 800), asteptat);
  const linii = ['<Idle|MPos:0.000,0.000,0.000|FS:0,0>\r\n', 'ok\r\n', '[MSG:Caution: Unlocked]\r\n', "Grbl 1.1h ['$' for help]\r\n", '\r\n', 'error:9\n'];
  for (let k = 1; k < BUCATI_800.length; k++) {
    for (const l of linii) {
      const text = [...BUCATI_800.slice(0, k), l, ...BUCATI_800.slice(k)].join('');
      assert.deepEqual(obiectEsp(text, 800), asteptat, `linia ${JSON.stringify(l)} după bucata ${k}`);
    }
  }
  // Text înainte (alt răspuns, ieșirea GRBL), neîntreg, altă comandă, ghilimele nescrise cu \\: null unde nu se poate citi.
  assert.deepEqual(obiectEsp(`ok\r\n{"cmd":"105","status":"ok","data":"x"}\n${BUCATI_800.join('')}`, 800), asteptat);
  assert.equal(obiectEsp(BUCATI_800.slice(0, -1).join(''), 800), null);
  assert.equal(obiectEsp(BUCATI_800.join(''), 420), null);
  assert.equal(obiectEsp('{"cmd":"800","status":"ok","data":{"Hostname":"a"b"}}', 800), null);
});

test('ce spune podul: versiunea, ținta, numele, IP-ul și modul; verdictul (3.0 cu ținta GRBL); numele din rețea', () => {
  const o = obiectEsp(BUCATI_800.join(''), 800);
  assert.ok(o);
  const i = o ? infoPod(o) : null;
  assert.deepEqual(i, { versiune: '3.0.2', tinta: 'grbl', nume: 'esp3d', ip: '192.168.1.47', mod: 'STA' });
  assert.equal(infoPod({ cmd: '800', status: 'error', data: {} }), null);
  assert.equal(infoPod({ cmd: '800', status: 'ok', data: { FWTarget: 'grbl' } }), null, 'fără versiune nu e un pod');
  assert.deepEqual(infoPod({ status: 'ok', data: { FWVersion: '3.0.2', FWTarget: 'GRBL', WebSocketIP: '0.0.0.0.0', WiFiMode: 'AP+STA', Hostname: 'Costel' } }),
    { versiune: '3.0.2', tinta: 'grbl', nume: 'costel', ip: null, mod: null });
  const v = (versiune: string, tinta = 'grbl'): string => verdictPod({ versiune, tinta, nume: null, ip: null, mod: null });
  assert.deepEqual([v('3.0.2'), v('3.0'), v('3.0.0.a225'), v('3.1.0'), v('3.10'), v('2.1.2'), v('30.0')], ['ok', 'ok', 'ok', 'versiune', 'versiune', 'versiune', 'versiune']);
  assert.deepEqual([v('3.0.2', 'grblhal'), v('3.0.2', 'marlin'), v('3.0.2', '')], ['ok', 'tinta', 'tinta']);
  assert.equal(numeLocal(i), 'esp3d.local');
  assert.equal(numeLocal({ versiune: '3.0.2', tinta: 'grbl', nume: 'costel', ip: null, mod: null }), 'costel.local');
  assert.equal(numeLocal({ versiune: '3.0.2', tinta: 'grbl', nume: 'nu bun!', ip: null, mod: null }), 'esp3d.local');
  assert.equal(numeLocal(null), 'esp3d.local');
});

test('[ESP410]: rețelele dintre Start Scan și End Scan, fiecare o dată (semnalul cel mai bun), cele puternice întâi; liniile străine se sar', () => {
  const text = ['ok', 'Start Scan', 'Vecin-5G\t40%\tSecure', '<Idle|MPos:0.000,0.000,0.000|FS:0,0>', 'Atelier COSTEL\t87%\tSecure',
    '\t70%\tSecure', 'Musafiri\t12%\tOpen', 'Vecin-5G\t55%\tSecure', 'Atelier "B"\t55%\tOpen', 'End Scan', 'Dupa\t99%\tOpen', ''].join('\r\n');
  assert.deepEqual(reteleEsp410(text), [
    { ssid: 'Atelier COSTEL', semnal: 87, protejata: true },
    { ssid: 'Atelier "B"', semnal: 55, protejata: false },
    { ssid: 'Vecin-5G', semnal: 55, protejata: true },
    { ssid: 'Musafiri', semnal: 12, protejata: false },
  ]);
  assert.equal(reteleEsp410('Start Scan\nA\t40%\tSecure\n'), null, 'fără End Scan: neîntreagă');
  assert.equal(reteleEsp410('A\t40%\tSecure\nEnd Scan\n'), null);
  assert.deepEqual(reteleEsp410('Start Scan\nEnd Scan\n'), []);
});

test('raportul de stare GRBL se recunoaște; restul nu', () => {
  for (const r of ['<Idle|MPos:0.000,0.000,0.000|FS:0,0>', 'x<Run|WPos:1,2,3>', '<Hold:0|MPos:0,0,0>', '<Alarm>']) assert.equal(areRaportGrbl(r), true, r);
  for (const r of ['ok', '<html>', '<IDLE|x>', '{"cmd":"800"}', '']) assert.equal(areRaportGrbl(r), false, r);
});

const c = (adresa: string, profil: ConexiuneTinuta['profil'], port: number, ultimIp: string | null = null, folosita = 1): ConexiuneTinuta =>
  ({ id: idConexiune(profil, adresa, port), profil, adresa, port, drum: 'atelier', retea: null, ultimIp, folosita });

test('gazdele căutate: ale conexiunilor ținute, apoi ultimele IP-uri, numele obișnuite și rețeaua proprie a podului; pe o gazdă, podul întâi', () => {
  const g = gazdeCautare([c('costel.local', 'esp3d', 8282, '192.168.1.47'), c('banc.local', 'fluidnc', 81), c('ESP3D.local', 'esp3d', 8282)]);
  assert.deepEqual(g.map((x) => [x.adresa, x.incercari.map((i) => `${i.fel}:${i.port}:${i.profil}`)]), [
    ['costel.local', ['esp3d:8282:esp3d']],
    ['banc.local', ['grbl:81:fluidnc']],
    ['esp3d.local', ['esp3d:8282:esp3d']],
    ['192.168.1.47', ['esp3d:8282:esp3d']],
    ['fluidnc.local', ['grbl:81:fluidnc']],
    ['grblhal.local', ['grbl:81:grblhal']],
    ['192.168.0.1', ['esp3d:8282:esp3d', 'grbl:81:fluidnc']],
  ]);
  // Fără conexiuni: doar cele obișnuite; o conexiune la 192.168.0.1 pe 81 nu dublează încercarea.
  assert.deepEqual(gazdeCautare([c('192.168.0.1', 'grblhal', 81)]).map((x) => [x.adresa, x.incercari.length]), [
    ['192.168.0.1', 2], ['esp3d.local', 1], ['fluidnc.local', 1], ['grblhal.local', 1],
  ]);
  assert.deepEqual(gazdeCautare([c('192.168.0.1', 'grblhal', 81)])[0]?.incercari.map((i) => i.fel), ['esp3d', 'grbl']);
});

test('rețelele căutate în întregime: ale IP-urilor știute (nu rețeaua proprie a podului), altfel 192.168.0.x și 192.168.1.x; gazdele, cu o încercare pe trecere', () => {
  assert.deepEqual(reteleDeCautat([]), ['192.168.0', '192.168.1']);
  assert.deepEqual(reteleDeCautat([c('esp3d.local', 'esp3d', 8282, '10.0.4.20'), c('10.0.4.9', 'fluidnc', 81), c('192.168.0.1', 'esp3d', 8282), c('x.local', 'esp3d', 8282, '172.16.3.3')]),
    ['10.0.4', '172.16.3']);
  assert.deepEqual(reteleDeCautat([c('192.168.0.1', 'esp3d', 8282), c('fluidnc.local', 'fluidnc', 81)]), ['192.168.0', '192.168.1']);
  const g = gazdeRetea('192.168.1', INCERCARE_POD);
  assert.equal(g.length, 254);
  assert.deepEqual([g[0]?.adresa, g[253]?.adresa], ['192.168.1.1', '192.168.1.254']);
  assert.deepEqual(g.map((x) => x.incercari), Array.from({ length: 254 }, () => [INCERCARE_POD]));
  assert.deepEqual([INCERCARE_POD, INCERCARE_81].map((i) => `${i.fel}:${i.port}:${i.profil}`), ['esp3d:8282:esp3d', 'grbl:81:fluidnc']);
  assert.deepEqual(gazdeRetea('10.0.4', INCERCARE_81)[7], { adresa: '10.0.4.8', incercari: [INCERCARE_81] });
});

/** O încercare amânată, dusă la capăt de probă. */
type Amanata = { readonly i: number; readonly semnal: AbortSignal; readonly da: (r: string | null) => void; readonly cade: () => void };
function incercariAmanate(): { readonly lista: Amanata[]; readonly incearca: (i: number, s: AbortSignal) => Promise<string | null> } {
  const lista: Amanata[] = [];
  return {
    lista,
    incearca: (i, semnal) => new Promise<string | null>((da, cade) => { lista.push({ i, semnal, da, cade: () => { cade(new Error('x')); } }); }),
  };
}
const asteapta = (): Promise<void> => new Promise((r) => { setTimeout(r, 0); });

test('primulGasit: cel mult N deodată, în ordine; o încercare terminată o pornește pe următoarea; progresul numără', async () => {
  const a = incercariAmanate();
  const progres: number[] = [];
  const p = primulGasit(10, a.incearca, { concurenta: 3, laProgres: (n) => { progres.push(n); } });
  await asteapta();
  assert.deepEqual(a.lista.map((x) => x.i), [0, 1, 2]);
  a.lista[1]?.da(null);
  await asteapta();
  assert.deepEqual(a.lista.map((x) => x.i), [0, 1, 2, 3]);
  a.lista[0]?.cade();
  await asteapta();
  assert.deepEqual(a.lista.map((x) => x.i), [0, 1, 2, 3, 4], 'o încercare care aruncă e una fără rezultat');
  a.lista[3]?.da('găsit');
  assert.deepEqual(await p, { i: 3, rezultat: 'găsit' });
  assert.deepEqual(progres, [1, 2, 3]);
  // Celelalte primesc oprirea, iar ce se termină după nu mai schimbă nimic.
  assert.deepEqual(a.lista.map((x) => x.semnal.aborted), [true, true, true, true, true]);
  a.lista[2]?.da('prea târziu');
  await asteapta();
  assert.equal(a.lista.length, 5);
  assert.deepEqual(progres, [1, 2, 3]);
});

test('primulGasit: nimic găsit dă null după toate; oprirea din afară dă null pe loc; zero încercări, null', async () => {
  const a = incercariAmanate();
  const p = primulGasit(4, a.incearca, { concurenta: 8 });
  await asteapta();
  assert.equal(a.lista.length, 4);
  for (const x of a.lista) x.da(null);
  assert.equal(await p, null);

  const b = incercariAmanate();
  const oprire = new AbortController();
  const q = primulGasit(100, b.incearca, { concurenta: 2, semnal: oprire.signal });
  await asteapta();
  oprire.abort();
  assert.equal(await q, null);
  assert.deepEqual(b.lista.map((x) => x.semnal.aborted), [true, true]);
  b.lista[0]?.da('după oprire');
  await asteapta();
  assert.equal(b.lista.length, 2);

  assert.equal(await primulGasit(0, () => Promise.resolve('x'), { concurenta: 2 }), null);
  const deja = new AbortController();
  deja.abort();
  let pornite = 0;
  assert.equal(await primulGasit(3, () => { pornite++; return Promise.resolve('x'); }, { concurenta: 2, semnal: deja.signal }), null);
  assert.equal(pornite, 0);
  // O încercare care aruncă pe loc (nu o promisiune respinsă) nu oprește căutarea.
  assert.deepEqual(await primulGasit(2, (i) => { if (i === 0) throw new Error('pe loc'); return Promise.resolve('al doilea'); }, { concurenta: 1 }), { i: 1, rezultat: 'al doilea' });
});
