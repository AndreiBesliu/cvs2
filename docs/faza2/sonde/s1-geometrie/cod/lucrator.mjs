// Ruleaza o biblioteca intr-un worker, ca un apel blocat (bucla infinita) sa poata fi oprit dupa un termen.
// Firul principal asteapta SINCRON (Atomics.wait) si citeste raspunsul cu receiveMessageOnPort.
import { Worker, MessageChannel, receiveMessageOnPort, isMainThread, parentPort, workerData } from 'node:worker_threads';

if (!isMainThread && workerData && workerData.rolLucrator) {
  const { libsRobust } = await import('./robustete.mjs');
  const AD = await import('./adaptoare.mjs');
  const L = libsRobust()[workerData.idx];
  const flag = new Int32Array(workerData.sab);
  const port = workerData.port;
  port.on('message', (m) => {
    let res;
    const t0 = performance.now();
    try {
      const out = m.kind === 'bool' ? L.bool(m.A, m.B, m.op, m.opt) : L.offset(m.A, m.d, m.opt);
      res = { status: 'ok', out, ms: performance.now() - t0 };
    } catch (e) {
      res = e instanceof AD.Nesuportat ? { status: 'nesuportat', ms: performance.now() - t0 } : { status: 'exceptie', msg: String(e && e.message || e).slice(0, 120), ms: performance.now() - t0 };
    }
    port.postMessage(res);
    Atomics.store(flag, 0, 1); Atomics.notify(flag, 0);
  });
  parentPort.postMessage('gata');
}

export class LibInWorker {
  constructor(idx, nume, timeoutMs = 20000) { this.idx = idx; this.nume = nume; this.timeoutMs = timeoutMs; this.spawn(); }
  spawn() {
    this.sab = new SharedArrayBuffer(4); this.flag = new Int32Array(this.sab);
    const { port1, port2 } = new MessageChannel(); this.port = port1;
    this.w = new Worker(new URL(import.meta.url), { workerData: { rolLucrator: true, idx: this.idx, sab: this.sab, port: port2 }, transferList: [port2] });
    this.w.unref();
    this.ready = false;
  }
  call(msg) {
    Atomics.store(this.flag, 0, 0);
    this.port.postMessage(msg);
    // primul apel asteapta si incarcarea modulelor in worker
    const r = Atomics.wait(this.flag, 0, 0, this.ready ? this.timeoutMs : this.timeoutMs + 30000);
    this.ready = true;
    if (r === 'timed-out') { this.w.terminate(); this.spawn(); return { status: 'blocaj', ms: this.timeoutMs, msg: `peste ${this.timeoutMs / 1000} s` }; }
    const m = receiveMessageOnPort(this.port);
    return m ? m.message : { status: 'exceptie', msg: 'fara raspuns' };
  }
  close() { this.w.terminate(); }
}
